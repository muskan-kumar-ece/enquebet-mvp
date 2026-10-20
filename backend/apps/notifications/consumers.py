"""
WebSocket consumer for real-time notifications (10/10 Architecture).
Provides cross-device state synchronization:
- new_notification
- notification_updated (dynamic grouping updates)
- notification_removed (unlikes/deletions)
- unread_count_updated (canonical DB badge sync)
- all_read (instant cross-tab mark-all-read)
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    Clients connect to /ws/notifications/?token=<jwt> or ticket=<ticket>
    Each user gets their own group: notifications_<user_id>
    """

    async def connect(self):
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

        self.user = user
        self.group_name = f'notifications_{user.id}'

        # Join user's notification group
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
        """Handle client actions (e.g., mark_read, mark_all_read)."""
        try:
            data = json.loads(text_data)
            action_type = data.get('type')
            if action_type == 'mark_read':
                notification_id = data.get('notification_id')
                if notification_id:
                    await self._mark_notification_read(notification_id)
            elif action_type == 'mark_all_read':
                await self._mark_all_read()
        except json.JSONDecodeError:
            pass

    # --- Group message handlers ---

    async def new_notification(self, event):
        """Send a new notification to the WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification'],
        }))

    async def notification_updated(self, event):
        """Send grouped notification update to the WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'notification_updated',
            'notification': event['notification'],
        }))

    async def notification_removed(self, event):
        """Inform client that a notification was removed."""
        await self.send(text_data=json.dumps({
            'type': 'notification_removed',
            'notification_id': event['notification_id'],
        }))

    async def notification_read(self, event):
        """Inform client that a notification was marked as read."""
        await self.send(text_data=json.dumps({
            'type': 'notification_read',
            'notification_id': event['notification_id'],
        }))

    async def unread_count_updated(self, event):
        """Inform client of new canonical unread badge counts."""
        await self.send(text_data=json.dumps({
            'type': 'unread_count_updated',
            'unread_count': event['unread_count'],
            'action_count': event.get('action_count', 0),
        }))

    async def all_read(self, event):
        """Inform all client tabs that all notifications were marked read."""
        await self.send(text_data=json.dumps({
            'type': 'all_read',
        }))

    # --- Helpers ---

    def _get_query_params(self):
        query_string = self.scope.get('query_string', b'').decode()
        return dict(p.split('=', 1) for p in query_string.split('&') if '=' in p)

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
    def _mark_notification_read(self, notification_id):
        try:
            from apps.notifications.models import Notification
            from apps.notifications.services import OutboxProcessor
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            notif = Notification.objects.filter(id=notification_id, user=self.user).first()
            if notif:
                notif.mark_read(commit=True)
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f'notifications_{self.user.id}',
                        {
                            'type': 'notification_read',
                            'notification_id': str(notification_id),
                        }
                    )
                OutboxProcessor.broadcast_unread_count(self.user.id)
        except Exception:
            pass

    @database_sync_to_async
    def _mark_all_read(self):
        try:
            from apps.notifications.models import Notification
            from apps.notifications.services import OutboxProcessor
            from django.utils import timezone

            now = timezone.now()
            Notification.objects.filter(user=self.user, is_read=False).update(
                is_read=True,
                read_at=now,
                seen_at=now
            )
            OutboxProcessor.broadcast_all_read(self.user.id)
        except Exception:
            pass
