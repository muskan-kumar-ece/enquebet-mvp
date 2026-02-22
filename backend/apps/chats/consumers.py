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

        # Authenticate via JWT token in query string
        token = self._get_token_from_query()
        if not token:
            await self.close(code=4001)
            return

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
        """Handle incoming message from client."""
        try:
            data = json.loads(text_data)
            content = data.get('content', '').strip()
            if not content:
                return

            # Save message to DB and broadcast to group
            message = await self._save_message(content)
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

    # --- Helpers ---

    def _get_token_from_query(self):
        query_string = self.scope.get('query_string', b'').decode()
        params = dict(p.split('=') for p in query_string.split('&') if '=' in p)
        return params.get('token')

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
    def _save_message(self, content):
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
                'content': message.content,
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
