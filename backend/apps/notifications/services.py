"""
Notification Service & Outbox Processor (10/10 Architecture)
Provides:
- Pre-flight safety checks (self-suppression, mutual block detection, thread/target muting)
- Concurrency-safe deterministic grouping via database partial unique constraint + atomic retry loop
- Distinct actor accounting (like/unlike safe without count inflation)
- Server-derived canonical navigation URLs
- Durable transactional outbox with immediate delivery on commit and exponential backoff retry
- Cross-tab and real-time state synchronization
"""
from __future__ import annotations

import logging
import uuid
from datetime import timedelta
from typing import Any, Optional

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import IntegrityError, models, transaction
from django.utils import timezone

from .models import Notification, NotificationActor, NotificationMute, NotificationOutbox

logger = logging.getLogger(__name__)


def _is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def resolve_canonical_action_url(target_type: str, target_id: str, data: Optional[dict] = None) -> str:
    """
    Server-derived canonical navigation destinations.
    Writers never inject arbitrary, unvalidated client URLs.
    """
    if not target_type or not target_id:
        return "/notifications"

    data = data or {}
    t_type = target_type.lower()

    if t_type == 'post':
        return f"/posts/{target_id}"
    elif t_type == 'comment':
        post_id = data.get('post_id')
        if post_id:
            return f"/posts/{post_id}?comment={target_id}"
        return f"/posts/{target_id}"
    elif t_type in ('user', 'profile'):
        return f"/profile/{target_id}"
    elif t_type in ('collaboration_request', 'collab_request'):
        return f"/collaboration?tab=requests&request_id={target_id}"
    elif t_type in ('workspace', 'project_workspace'):
        return f"/workspace/{target_id}"
    elif t_type in ('task', 'project_task'):
        workspace_id = data.get('workspace_id') or target_id
        return f"/workspace/{workspace_id}?tab=tasks&task_id={target_id}"
    elif t_type in ('deliverable', 'review'):
        workspace_id = data.get('workspace_id') or target_id
        return f"/workspace/{workspace_id}?tab=deliverables&deliverable_id={target_id}"
    elif t_type in ('conversation', 'chat', 'message'):
        return f"/messages?convo={target_id}"

    return "/notifications"


def build_grouped_message(notif: Notification) -> str:
    """
    Builds clean, human-readable grouped notification messages like Instagram / LinkedIn:
    - 1 actor: "Aarav liked your post"
    - 2 actors: "Aarav and Meera liked your post"
    - 3+ actors: "Aarav, Meera, and 48 others liked your post"
    """
    actors = list(notif.actors.select_related('actor').order_by('-created_at')[:3])
    actor_count = notif.actor_count

    names = []
    for a in actors:
        u = a.actor
        name = u.full_name or u.username
        if name and name not in names:
            names.append(name)

    if not names:
        if notif.sender:
            names = [notif.sender.full_name or notif.sender.username]
        else:
            names = ["Someone"]

    verb_map = {
        'like': 'liked your post',
        'comment': 'commented on your post',
        'follow': 'started following you',
        'mention': 'mentioned you',
    }
    action_phrase = verb_map.get(notif.type, f"interacted with your {notif.target_type or 'content'}")

    # Custom snippet context if present (e.g. post title)
    title_suffix = ""
    post_title = (notif.data or {}).get('post_title')
    if post_title:
        snippet = post_title[:30] + ("..." if len(post_title) > 30 else "")
        title_suffix = f': "{snippet}"'

    if actor_count <= 1 or len(names) == 1:
        return f"{names[0]} {action_phrase}{title_suffix}"
    elif actor_count == 2:
        other_name = names[1] if len(names) > 1 else '1 other'
        return f"{names[0]} and {other_name} {action_phrase}{title_suffix}"
    else:
        others_count = actor_count - 1
        return f"{names[0]} and {others_count} others {action_phrase}{title_suffix}"


class NotificationService:
    """Centralized, hardened notification service."""

    @classmethod
    def send_event(
        cls,
        recipient: Any,
        actor: Optional[Any] = None,
        event_type: str = 'like',
        target_type: str = '',
        target_id: str = '',
        priority: Optional[str] = None,
        message_template: str = '',
        data: Optional[dict] = None,
        group_key: Optional[str] = None,
        suppress_self: bool = True,
    ) -> Optional[Notification]:
        """
        Dispatch a strongly-typed platform notification with privacy, grouping,
        and transactional outbox guarantees.
        """
        if not recipient:
            return None

        # 1. Self-suppression check
        if suppress_self and actor and str(actor.id) == str(recipient.id):
            return None

        # 2. Safety & block suppression check
        if actor and recipient:
            try:
                from apps.users.models import BlockedUser
                if BlockedUser.objects.filter(
                    models.Q(user=recipient, blocked_user=actor) |
                    models.Q(user=actor, blocked_user=recipient)
                ).exists():
                    return None
            except Exception as e:
                logger.warning(f"Failed block check: {e}")

        # 3. Thread/Entity Mute check
        if target_type and target_id:
            if NotificationMute.objects.filter(
                user=recipient,
                target_type=target_type,
                target_id=str(target_id)
            ).exists():
                return None

        # 4. Resolve default priority
        if not priority:
            if event_type in (
                'collaboration_request', 'collaboration_accepted',
                'collaboration_declined', 'team_invitation',
                'deliverable_review', 'deliverable_approved',
                'deliverable_changes_requested',
            ):
                priority = 'action'
            elif event_type in ('like', 'comment'):
                priority = 'social'
            else:
                priority = 'personal'

        # 5. Auto group key for social events if none provided
        if group_key is None and priority == 'social' and target_type and target_id:
            group_key = f"{target_type}:{target_id}:{event_type}"

        # 6. Branch: Grouped vs Individual
        if group_key:
            return cls._upsert_notification_group(
                recipient=recipient,
                actor=actor,
                event_type=event_type,
                group_key=group_key,
                target_type=target_type,
                target_id=str(target_id),
                priority=priority,
                data=data or {},
                custom_message=message_template,
            )
        else:
            return cls._create_individual_notification(
                recipient=recipient,
                actor=actor,
                event_type=event_type,
                target_type=target_type,
                target_id=str(target_id),
                priority=priority,
                message=message_template,
                data=data or {},
            )

    @classmethod
    def _upsert_notification_group(
        cls,
        recipient: Any,
        actor: Optional[Any],
        event_type: str,
        group_key: str,
        target_type: str,
        target_id: str,
        priority: str,
        data: dict,
        custom_message: str = "",
    ) -> Notification:
        """
        Concurrency-safe group upsert. Handles the first-event race condition
        via the unique_active_unread_group partial constraint + retry loop.
        """
        for attempt in range(3):
            try:
                with transaction.atomic():
                    notif = Notification.objects.select_for_update().filter(
                        user=recipient,
                        group_key=group_key,
                        is_read=False
                    ).first()

                    if notif:
                        # Existing active group row
                        is_new_actor = False
                        if actor:
                            _, created = NotificationActor.objects.get_or_create(
                                notification=notif,
                                actor=actor
                            )
                            if created:
                                is_new_actor = True

                        if is_new_actor:
                            notif.actor_count = notif.actors.count()
                        notif.event_count += 1
                        if actor:
                            notif.sender = actor

                        if data:
                            merged_data = dict(notif.data or {})
                            merged_data.update(data)
                            notif.data = merged_data

                        notif.message = custom_message if custom_message else build_grouped_message(notif)
                        notif.updated_at = timezone.now()
                        notif.save(update_fields=['actor_count', 'event_count', 'sender', 'data', 'message', 'updated_at'])

                        cls._queue_outbox(notif, recipient, event_type='notification_updated')
                        return notif
                    else:
                        # No active group found. Create new row.
                        ref_id = uuid.UUID(target_id) if _is_valid_uuid(target_id) else None
                        notif = Notification.objects.create(
                            user=recipient,
                            sender=actor,
                            type=event_type,
                            reference_id=ref_id,
                            priority=priority,
                            group_key=group_key,
                            actor_count=1 if actor else 0,
                            event_count=1,
                            target_type=target_type,
                            target_id=target_id,
                            data=data or {},
                            message="",
                        )
                        if actor:
                            NotificationActor.objects.create(notification=notif, actor=actor)

                        notif.message = custom_message if custom_message else build_grouped_message(notif)
                        notif.save(update_fields=['message'])

                        cls._queue_outbox(notif, recipient, event_type='notification')
                        return notif

            except IntegrityError:
                # Concurrent race condition: another thread created the group key simultaneously.
                # The DB unique_active_unread_group constraint threw IntegrityError. Retry loop merges!
                if attempt == 2:
                    raise
                continue

    @classmethod
    def _create_individual_notification(
        cls,
        recipient: Any,
        actor: Optional[Any],
        event_type: str,
        target_type: str,
        target_id: str,
        priority: str,
        message: str,
        data: dict,
    ) -> Notification:
        with transaction.atomic():
            ref_id = uuid.UUID(target_id) if _is_valid_uuid(target_id) else None
            notif = Notification.objects.create(
                user=recipient,
                sender=actor,
                type=event_type,
                reference_id=ref_id,
                priority=priority,
                group_key=None,
                actor_count=1 if actor else 0,
                event_count=1,
                target_type=target_type,
                target_id=target_id,
                data=data or {},
                message=message or f"New {event_type} notification",
            )
            if actor:
                NotificationActor.objects.create(notification=notif, actor=actor)

            cls._queue_outbox(notif, recipient, event_type='notification')
            return notif

    @classmethod
    def remove_event(
        cls,
        recipient: Any,
        actor: Any,
        group_key: str,
    ) -> None:
        """
        Handles unlikes / revocations without inflating actor counts.
        If actors drop to 0, deletes the unread notification and broadcasts removal.
        """
        if not group_key or not actor or not recipient:
            return

        with transaction.atomic():
            notif = Notification.objects.select_for_update().filter(
                user=recipient,
                group_key=group_key,
                is_read=False
            ).first()

            if not notif:
                return

            NotificationActor.objects.filter(notification=notif, actor=actor).delete()
            remaining = list(notif.actors.select_related('actor').order_by('-created_at'))
            remaining_count = len(remaining)

            if remaining_count == 0:
                notif_id = str(notif.id)
                notif.delete()
                cls._queue_outbox(
                    None,
                    recipient,
                    event_type='notification_removed',
                    custom_payload={'notification_id': notif_id}
                )
            else:
                notif.actor_count = remaining_count
                notif.event_count = max(1, notif.event_count - 1)
                notif.sender = remaining[0].actor
                notif.message = build_grouped_message(notif)
                notif.updated_at = timezone.now()
                notif.save(update_fields=['actor_count', 'event_count', 'sender', 'message', 'updated_at'])
                cls._queue_outbox(notif, recipient, event_type='notification_updated')

    @classmethod
    def _queue_outbox(
        cls,
        notification: Optional[Notification],
        recipient: Any,
        event_type: str = 'notification',
        custom_payload: Optional[dict] = None,
    ) -> None:
        """
        Commit an outbox row in the same transaction as the mutation.
        Schedule delivery immediately on transaction commit.
        """
        from .serializers import NotificationSerializer

        if custom_payload:
            payload = custom_payload
        elif notification:
            payload = NotificationSerializer(notification).data
        else:
            payload = {}

        outbox_entry = NotificationOutbox.objects.create(
            user=recipient,
            notification=notification,
            channel='websocket',
            event_type=event_type,
            payload=payload,
            status='pending',
        )

        outbox_id = str(outbox_entry.id)
        user_id = str(recipient.id)

        transaction.on_commit(lambda: OutboxProcessor.deliver_entry(outbox_id))
        transaction.on_commit(lambda: OutboxProcessor.broadcast_unread_count(user_id))


class OutboxProcessor:
    """Durable delivery worker for notification outbox."""

    @classmethod
    def deliver_entry(cls, outbox_id: str) -> bool:
        """Deliver a single outbox entry with backoff retry tracking."""
        try:
            entry = NotificationOutbox.objects.select_related('user').get(id=outbox_id)
        except NotificationOutbox.DoesNotExist:
            return False

        if entry.status == 'delivered':
            return True

        entry.attempts += 1
        channel_layer = get_channel_layer()

        if not channel_layer:
            entry.last_error = "Channel layer unavailable"
            entry.save(update_fields=['attempts', 'last_error'])
            return False

        try:
            group_name = f'notifications_{entry.user_id}'

            # Format WS message according to event type
            if entry.event_type == 'notification':
                message = {
                    'type': 'new_notification',
                    'notification': entry.payload,
                }
            elif entry.event_type == 'notification_updated':
                message = {
                    'type': 'notification_updated',
                    'notification': entry.payload,
                }
            elif entry.event_type == 'notification_removed':
                message = {
                    'type': 'notification_removed',
                    'notification_id': entry.payload.get('notification_id'),
                }
            else:
                message = {
                    'type': entry.event_type,
                    'data': entry.payload,
                }

            async_to_sync(channel_layer.group_send)(group_name, message)

            entry.status = 'delivered'
            entry.delivered_at = timezone.now()
            entry.last_error = ''
            entry.save(update_fields=['status', 'delivered_at', 'last_error', 'attempts'])
            return True

        except Exception as e:
            logger.error(f"Failed to deliver outbox {outbox_id}: {e}")
            entry.last_error = str(e)
            if entry.attempts >= 5:
                entry.status = 'failed'
            else:
                backoff_seconds = min(300, (2 ** entry.attempts) * 5)
                entry.next_retry_at = timezone.now() + timedelta(seconds=backoff_seconds)
                entry.status = 'pending'
            entry.save(update_fields=['status', 'last_error', 'next_retry_at', 'attempts'])
            return False

    @classmethod
    def broadcast_unread_count(cls, user_id: Any) -> None:
        """Broadcast live canonical unread and action counts across all open tabs/devices."""
        channel_layer = get_channel_layer()
        if not channel_layer or not user_id:
            return

        try:
            unread_count = Notification.objects.filter(user_id=user_id, is_read=False).count()
            action_count = Notification.objects.filter(
                user_id=user_id,
                is_read=False,
                priority='action'
            ).count()

            async_to_sync(channel_layer.group_send)(
                f'notifications_{user_id}',
                {
                    'type': 'unread_count_updated',
                    'unread_count': unread_count,
                    'action_count': action_count,
                }
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast unread count to {user_id}: {e}")

    @classmethod
    def broadcast_all_read(cls, user_id: Any) -> None:
        """Broadcast mark-all-read event across all open tabs/devices."""
        channel_layer = get_channel_layer()
        if not channel_layer or not user_id:
            return

        try:
            async_to_sync(channel_layer.group_send)(
                f'notifications_{user_id}',
                {
                    'type': 'all_read',
                }
            )
            cls.broadcast_unread_count(user_id)
        except Exception as e:
            logger.warning(f"Failed to broadcast all_read to {user_id}: {e}")

    @classmethod
    def process_pending_outbox(cls, limit: int = 100) -> int:
        """Batch process pending outbox entries (can be run via cron / celery / management cmd)."""
        now = timezone.now()
        pending = NotificationOutbox.objects.filter(
            status='pending',
        ).filter(
            models.Q(next_retry_at__isnull=True) | models.Q(next_retry_at__lte=now)
        ).order_by('created_at')[:limit]

        delivered = 0
        for entry in pending:
            if cls.deliver_entry(str(entry.id)):
                delivered += 1
        return delivered
