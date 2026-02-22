from __future__ import annotations

from typing import Any, Type

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Notification
from .serializers import NotificationSerializer


@receiver(post_save, sender=Notification)
def broadcast_notification(
    sender: Type[Notification],
    instance: Notification,
    created: bool,
    **kwargs: Any,
) -> None:
    if not created:
        return

    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    user_id = getattr(instance, 'user_id', None) or getattr(instance.user, 'id', None)
    if not user_id:
        return

    payload = NotificationSerializer(instance).data
    async_to_sync(channel_layer.group_send)(
        f'notifications_{user_id}',
        {
            'type': 'new_notification',
            'notification': payload,
        },
    )
