"""
WebSocket consumer for real-time workspace collaboration.
Broadcasts task status movements, deliverable reviews, team updates, and project completion.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)


class WorkspaceConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for live workspace collaboration.
    Clients connect to /ws/workspace/<workspace_id>/?token=<jwt>
    Broadcasts state synchronization across group: workspace_<workspace_id>
    """

    async def connect(self):
        self.workspace_id = self.scope['url_route']['kwargs']['workspace_id']
        self.group_name = f'workspace_{self.workspace_id}'

        # Authenticate via JWT token in query string
        token = self._get_token_from_query()
        if not token:
            await self.close(code=4001)
            return

        user = await self._get_user_from_token(token)
        if not user:
            await self.close(code=4001)
            return

        # Authorization: verify user is an active member or workspace owner
        is_member = await self._is_workspace_member(user, self.workspace_id)
        if not is_member:
            await self.close(code=4003)
            return

        self.user = user

        # Join the workspace group
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
        """
        Handle incoming client ping or action.
        Most authoritative state mutations occur via HTTP REST APIs,
        which then broadcast out to this group.
        """
        try:
            data = json.loads(text_data)
            action = data.get('action')
            if action == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except (json.JSONDecodeError, AttributeError):
            pass

    async def workspace_event(self, event):
        """Send generic workspace event to the WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'workspace_event',
            'event_type': event.get('event_type'),
            'data': event.get('data'),
            'actor_id': event.get('actor_id'),
            'timestamp': event.get('timestamp'),
        }))

    # --- Database Helpers ---

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
    def _is_workspace_member(self, user, workspace_id):
        from .models import Workspace, TeamMembership
        try:
            workspace = Workspace.objects.select_related('post').get(id=workspace_id)
            if workspace.post.user_id == user.id:
                return True
            return TeamMembership.objects.filter(
                workspace_id=workspace_id,
                user=user,
                status='active'
            ).exists()
        except Exception:
            return False
