"""
WebSocket consumer for real-time chat.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat.
    Clients connect to /ws/chat/<conversation_id>/?token=<jwt>
    Each conversation gets its own group: chat_<conversation_id>
    """

    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.group_name = f'chat_{self.conversation_id}'

        # Authenticate via Ephemeral Ticket (preferred) or JWT token in query string
        params = self._get_query_params()
        ticket = params.get('ticket')
        token = params.get('token')

        user = None
        if ticket:
            user = await self._get_user_from_ticket(ticket)
        elif token:
            user = await self._get_user_from_token(token)

        if not user:
            await self.close(code=4001)
            return

        # Verify user is a member of this conversation
        is_member = await self._is_conversation_member(user, self.conversation_id)
        if not is_member:
            await self.close(code=4003)
            return

        self.user = user

        # Join conversation group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle incoming message or typing/read events from client."""
        try:
            data = json.loads(text_data)
            event_type = data.get('type')

            # 1. Typing indicator event
            if event_type == 'typing':
                is_typing = bool(data.get('is_typing', True))
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'chat_typing',
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'is_typing': is_typing,
                    }
                )
                return

            # 2. Read receipt event
            if event_type == 'read':
                read_at = await self._mark_read()
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'chat_read',
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'read_at': read_at,
                    }
                )
                return

            # 3. Standard chat message event
            content = data.get('content', '').strip()
            attachment_url = (data.get('attachment_url') or '').strip()
            client_msg_id = (data.get('client_msg_id') or '').strip()
            if not content and not attachment_url:
                return

            # Save message to DB and broadcast to group
            message = await self._save_message(content, attachment_url, client_msg_id)
            if message:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'chat_message',
                        'message': message,
                    }
                )
        except json.JSONDecodeError:
            pass

    async def chat_message(self, event):
        """Send a chat message to the WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
        }))

    async def chat_typing(self, event):
        """Broadcast typing status to group."""
        await self.send(text_data=json.dumps({
            'type': 'chat_typing',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_typing': event['is_typing'],
        }))

    async def chat_read(self, event):
        """Broadcast read receipt to group."""
        await self.send(text_data=json.dumps({
            'type': 'chat_read',
            'user_id': event['user_id'],
            'username': event['username'],
            'read_at': event['read_at'],
        }))

    # --- Helpers ---

    def _get_query_params(self):
        query_string = self.scope.get('query_string', b'').decode()
        return dict(p.split('=', 1) for p in query_string.split('&') if '=' in p)

    def _get_token_from_query(self):
        return self._get_query_params().get('token')

    @database_sync_to_async
    def _get_user_from_ticket(self, ticket):
        try:
            from apps.users.ws_ticket import validate_and_consume_ws_ticket
            user_id = validate_and_consume_ws_ticket(ticket)
            if user_id:
                return User.objects.get(id=user_id)
        except Exception:
            return None
        return None

    @database_sync_to_async
    def _get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        except Exception:
            return None

    @database_sync_to_async
    def _is_conversation_member(self, user, conversation_id):
        try:
            from apps.chats.models import ConversationMember
            return ConversationMember.objects.filter(
                conversation_id=conversation_id,
                user=user
            ).exists()
        except Exception:
            return False

    @database_sync_to_async
    def _mark_read(self):
        try:
            from apps.chats.models import ConversationMember
            now = timezone.now()
            ConversationMember.objects.filter(
                conversation_id=self.conversation_id,
                user=self.user
            ).update(last_read_at=now)
            return now.isoformat()
        except Exception:
            return timezone.now().isoformat()

    @database_sync_to_async
    def _save_message(self, content, attachment_url='', client_msg_id=''):
        try:
            from apps.chats.models import Conversation, ConversationMember, Message
            from apps.notifications.models import Notification
            conversation = Conversation.objects.get(id=self.conversation_id)
            # Touch so it sorts to top in conversation list
            conversation.save(update_fields=['updated_at'])
            message = Message.objects.create(
                conversation=conversation,
                sender=self.user,
                content=content,
                attachment_url=attachment_url,
                client_msg_id=client_msg_id or '',
            )

            ConversationMember.objects.filter(
                conversation=conversation,
                user=self.user,
            ).update(last_read_at=timezone.now())

            other_user_ids = list(
                ConversationMember.objects.filter(conversation=conversation)
                .exclude(user=self.user)
                .values_list('user_id', flat=True)
            )
            for uid in other_user_ids:
                Notification.objects.create(
                    user_id=uid,
                    sender=self.user,
                    type='message',
                    reference_id=conversation.id,
                    message=f'New message from {self.user.username}',
                )

            return {
                'id': str(message.id),
                'client_msg_id': message.client_msg_id,
                'content': message.content,
                'attachment_url': message.attachment_url or '',
                'created_at': message.created_at.isoformat(),
                'sender': {
                    'id': str(self.user.id),
                    'username': self.user.username,
                    'full_name': self.user.full_name,
                },
                'is_me': False,  # client-side determines this from sender.id
            }
        except Exception:
            return None
