"""
Event broadcasting helper for real-time workspace collaboration.
"""
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

logger = logging.getLogger(__name__)


def broadcast_workspace_event(workspace_id, event_type: str, data: dict, actor=None):
    """
    Broadcast a real-time event to all active clients connected to workspace_<workspace_id>.
    Safely catches any channel layer errors so REST HTTP requests never fail because of WebSockets.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        group_name = f'workspace_{workspace_id}'
        payload = {
            'type': 'workspace_event',
            'event_type': event_type,
            'data': data,
            'actor_id': str(actor.id) if actor and hasattr(actor, 'id') else None,
            'timestamp': timezone.now().isoformat(),
        }

        async_to_sync(channel_layer.group_send)(group_name, payload)
    except Exception as e:
        logger.warning(f"Failed to broadcast workspace event {event_type} to {workspace_id}: {e}")
