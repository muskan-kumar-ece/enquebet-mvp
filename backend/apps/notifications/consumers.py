"""
WebSocket consumer for real-time notifications.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    Clients connect to /ws/notifications/?token=<jwt>
    Each user gets their own group: notifications_<user_id>
    """

    async def connect(self):
        # Authenticate via JWT token in query string
        token = self._get_token_from_query()
        if not token:
            await self.close(code=4001)
            return

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
        """Handle messages from client (e.g., mark-as-read)."""
        try:
            data = json.loads(text_data)
            if data.get('type') == 'mark_read':
                notification_id = data.get('notification_id')
                if notification_id:
                    await self._mark_notification_read(notification_id)
        except json.JSONDecodeError:
            pass

    # --- Group message handlers ---

    async def new_notification(self, event):
        """Send a new notification to the WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification'],
        }))

    async def notification_read(self, event):
        """Inform client that a notification was marked as read."""
        await self.send(text_data=json.dumps({
            'type': 'notification_read',
            'notification_id': event['notification_id'],
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
    def _mark_notification_read(self, notification_id):
        try:
            from apps.notifications.models import Notification
            Notification.objects.filter(
                id=notification_id,
                user=self.user
            ).update(is_read=True)

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{self.user.id}',
                    {
                        'type': 'notification_read',
                        'notification_id': str(notification_id),
                    }
                )
        except Exception:
            pass
