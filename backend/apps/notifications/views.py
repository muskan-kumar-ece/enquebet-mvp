"""
Notifications Views (10/10 Architecture)
Provides:
- Cursor-based paginated notification list with zero N+1 queries
- Real-time unread & action counts
- Multi-session mark-all-read with instant WebSocket broadcast
- Viewport seen-tracking (seen_at)
- Thread/Target muting (NotificationMute)
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
import base64
import uuid
from django.db import models
from django.utils.dateparse import parse_datetime
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification, NotificationMute
from .serializers import NotificationSerializer, NotificationMuteSerializer
from .services import OutboxProcessor


def _encode_cursor(dt, item_id):
    raw = f"{dt.isoformat()}|{item_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_cursor(cursor_str):
    try:
        raw = base64.urlsafe_b64decode(cursor_str.encode()).decode()
        if '|' in raw:
            parts = raw.split('|', 1)
            dt = parse_datetime(parts[0])
            try:
                item_id = uuid.UUID(parts[1])
            except Exception:
                item_id = None
            return dt, item_id
        return parse_datetime(raw), None
    except Exception:
        if ' ' in cursor_str:
            cursor_str = cursor_str.replace(' ', '+')
        return parse_datetime(cursor_str), None


class NotificationListView(APIView):
    """
    Get paginated notifications for current user with zero N+1 queries.
    Supports filtering by priority ('action', 'personal', 'social')
    and base64 URL-safe compound cursor pagination based on (updated_at, id).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Notification.objects.filter(user=request.user)

        priority = request.query_params.get('priority')
        if priority and priority in ('action', 'personal', 'social'):
            queryset = queryset.filter(priority=priority)

        cursor = request.query_params.get('cursor')
        if cursor:
            dt, item_id = _decode_cursor(cursor)
            if dt:
                if item_id:
                    queryset = queryset.filter(
                        models.Q(updated_at__lt=dt) |
                        models.Q(updated_at=dt, id__lt=item_id)
                    )
                else:
                    queryset = queryset.filter(updated_at__lt=dt)

        try:
            limit = min(50, max(1, int(request.query_params.get('limit', 20))))
        except ValueError:
            limit = 20

        items = list(
            queryset.select_related('sender')
            .prefetch_related('actors__actor')
            .order_by('-updated_at', '-id')[:limit + 1]
        )

        has_more = len(items) > limit
        if has_more:
            items = items[:limit]

        next_cursor = _encode_cursor(items[-1].updated_at, str(items[-1].id)) if (has_more and items) else None

        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        action_count = Notification.objects.filter(user=request.user, is_read=False, priority='action').count()

        serializer = NotificationSerializer(items, many=True)

        return Response({
            'results': serializer.data,
            'next_cursor': next_cursor,
            'has_more': has_more,
            'unread_count': unread_count,
            'action_count': action_count,
        })


class UnreadCountView(APIView):
    """Get canonical unread and action-required notification counts"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        unread_count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        action_count = Notification.objects.filter(
            user=request.user,
            is_read=False,
            priority='action'
        ).count()
        return Response({
            'unread_count': unread_count,
            'action_count': action_count,
        })


class MarkAllReadView(APIView):
    """Mark all notifications as read and broadcast across all user sessions"""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        now = timezone.now()
        updated = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=now, seen_at=now)

        OutboxProcessor.broadcast_all_read(request.user.id)

        return Response({
            'message': f'Marked {updated} notifications as read',
            'updated': updated,
        })


class MarkAsReadView(APIView):
    """Mark single notification as read and broadcast state"""
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        try:
            notification = Notification.objects.get(
                id=notification_id,
                user=request.user
            )
            notification.mark_read(commit=True)

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{request.user.id}',
                    {
                        'type': 'notification_read',
                        'notification_id': str(notification.id),
                    }
                )

            OutboxProcessor.broadcast_unread_count(request.user.id)

            return Response({'message': 'Marked as read'})
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class MarkSeenView(APIView):
    """Mark batch of notifications as seen when scrolled into viewport"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get('notification_ids', [])
        if isinstance(ids, str):
            ids = [ids]
        elif hasattr(request.data, 'getlist') and not ids:
            ids = request.data.getlist('notification_ids')

        if not ids or not isinstance(ids, (list, tuple)):
            return Response({'message': 'No IDs provided', 'seen_count': 0})

        clean_ids = []
        for i in ids:
            try:
                clean_ids.append(uuid.UUID(str(i).strip()))
            except (ValueError, TypeError, AttributeError):
                pass

        if not clean_ids:
            return Response({'message': 'No valid IDs provided', 'seen_count': 0})

        now = timezone.now()
        updated = Notification.objects.filter(
            id__in=clean_ids,
            user=request.user,
            seen_at__isnull=True
        ).update(seen_at=now)

        return Response({
            'message': f'Marked {updated} notifications as seen',
            'seen_count': updated,
        })


class NotificationMuteView(APIView):
    """Mute or unmute notifications for a specific thread, post, or target"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mutes = NotificationMute.objects.filter(user=request.user).order_by('-created_at')
        return Response(NotificationMuteSerializer(mutes, many=True).data)

    def post(self, request):
        target_type = request.data.get('target_type')
        target_id = request.data.get('target_id')

        if not target_type or not target_id:
            return Response(
                {'error': 'target_type and target_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        mute, created = NotificationMute.objects.get_or_create(
            user=request.user,
            target_type=str(target_type).lower(),
            target_id=str(target_id),
        )

        return Response(
            NotificationMuteSerializer(mute).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    def delete(self, request):
        target_type = request.data.get('target_type') or request.query_params.get('target_type')
        target_id = request.data.get('target_id') or request.query_params.get('target_id')

        if not target_type or not target_id:
            return Response(
                {'error': 'target_type and target_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        deleted, _ = NotificationMute.objects.filter(
            user=request.user,
            target_type=str(target_type).lower(),
            target_id=str(target_id),
        ).delete()

        if deleted:
            return Response({'message': f'Unmuted {target_type}:{target_id}'})
        return Response({'message': 'Mute record not found'}, status=status.HTTP_404_NOT_FOUND)
