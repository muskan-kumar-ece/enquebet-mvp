"""
Messages Views
"""
from django.utils import timezone
from django.db import transaction
from django.db.models import Prefetch, Q, OuterRef, Subquery, Count
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from django.contrib.auth import get_user_model
from .models import Conversation, ConversationMember, Message
from .serializers import ConversationSerializer, MessageSerializer
from apps.notifications.models import Notification
from apps.posts.models import Post
from apps.collaboration.models import Workspace

User = get_user_model()


def _broadcast_chat_message(conversation_id, message_payload):
    """Best-effort broadcast of a new chat message to the conversation WS group."""
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            f'chat_{conversation_id}',
            {
                'type': 'chat_message',
                'message': message_payload,
            },
        )
    except Exception:
        # Don't break REST API if WS broadcast fails
        return


class ConversationListCreateView(generics.ListCreateAPIView):
    """GET list conversations; POST create (or get) a DM conversation."""

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        latest_msg = Message.objects.filter(
            conversation=OuterRef('pk')
        ).order_by('-created_at')

        qs = Conversation.objects.filter(
            members__user=self.request.user
        ).distinct().annotate(
            last_message_content=Subquery(latest_msg.values('content')[:1]),
            last_message_created_at=Subquery(latest_msg.values('created_at')[:1]),
            last_message_sender_username=Subquery(latest_msg.values('sender__username')[:1]),
            annotated_project_title=Subquery(Post.objects.filter(id=OuterRef('project_id')).values('title')[:1]),
            annotated_workspace_id=Subquery(Workspace.objects.filter(post_id=OuterRef('project_id')).values('id')[:1]),
        ).prefetch_related(
            Prefetch('members', queryset=ConversationMember.objects.select_related('user')),
        ).order_by('-updated_at')

        # Filter by conversation type
        convo_type = (self.request.query_params.get('type') or '').lower()
        if convo_type == 'dms':
            qs = qs.filter(is_group=False)
        elif convo_type == 'groups':
            qs = qs.filter(is_group=True)

        # Filter by search term
        q = (self.request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(members__user__username__icontains=q) |
                Q(members__user__full_name__icontains=q)
            ).distinct()

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        conversations = list(queryset)

        if conversations and request.user.is_authenticated:
            # Batch calculate unread counts in exactly 1 query using prefetched members
            convo_read_map = {}
            for c in conversations:
                member = next((m for m in c.members.all() if m.user_id == request.user.id), None)
                convo_read_map[c.id] = member.last_read_at if member else None

            q_filter = Q()
            for cid, last_read in convo_read_map.items():
                if last_read:
                    q_filter |= Q(conversation_id=cid, created_at__gt=last_read)
                else:
                    q_filter |= Q(conversation_id=cid)

            unread_counts = {}
            if q_filter:
                counts_qs = (
                    Message.objects.filter(conversation_id__in=convo_read_map.keys())
                    .exclude(sender=request.user)
                    .filter(q_filter)
                    .values('conversation_id')
                    .annotate(total=Count('id'))
                )
                for item in counts_qs:
                    unread_counts[item['conversation_id']] = item['total']

            for c in conversations:
                c.annotated_unread_count = unread_counts.get(c.id, 0)

        serializer = self.get_serializer(conversations, many=True)
        return Response(serializer.data)


    def create(self, request, *args, **kwargs):
        participant_id = request.data.get('participant_id') or request.data.get('user_id')
        if not participant_id:
            return Response({'error': 'participant_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            participant = User.objects.get(id=participant_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if participant == request.user:
            return Response({'error': 'Cannot message yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Use transaction + select_for_update to prevent race condition on DM creation
        with transaction.atomic():
            existing = Conversation.objects.select_for_update().filter(
                is_group=False,
                members__user=request.user
            ).filter(
                members__user=participant
            ).first()

            if existing:
                data = ConversationSerializer(existing, context={'request': request}).data
                return Response(data, status=status.HTTP_200_OK)

            conversation = Conversation.objects.create(name='', is_group=False)
            now = timezone.now()
            ConversationMember.objects.create(conversation=conversation, user=request.user, last_read_at=now)
            ConversationMember.objects.create(conversation=conversation, user=participant, last_read_at=now)

        data = ConversationSerializer(conversation, context={'request': request}).data
        return Response(data, status=status.HTTP_201_CREATED)


class StartDMView(APIView):
    """Start or retrieve a direct message conversation with another user"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'error': 'Cannot message yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent race condition for DM creation
        with transaction.atomic():
            existing = Conversation.objects.select_for_update().filter(
                is_group=False,
                members__user=request.user
            ).filter(
                members__user=target_user
            ).first()

            if existing:
                return Response({'conversation_id': str(existing.id)}, status=status.HTTP_200_OK)

            conversation = Conversation.objects.create(
                name='',
                is_group=False
            )
            now = timezone.now()
            ConversationMember.objects.create(conversation=conversation, user=request.user, last_read_at=now)
            ConversationMember.objects.create(conversation=conversation, user=target_user, last_read_at=now)

        return Response({'conversation_id': str(conversation.id)}, status=status.HTTP_201_CREATED)


class ConversationMessagesView(generics.ListCreateAPIView):
    """Get messages or send message in a conversation"""
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def _get_conversation_for_user(self):
        conversation_id = self.kwargs['conversation_id']
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            raise NotFound('Conversation not found')

        is_member = ConversationMember.objects.filter(
            conversation=conversation,
            user=self.request.user
        ).exists()
        if not is_member:
            raise NotFound('Conversation not found')
        return conversation

    def get_queryset(self):
        conversation = self._get_conversation_for_user()
        conversation_id = conversation.id
        qs = Message.objects.filter(
            conversation_id=conversation_id
        ).select_related('sender')

        q = (self.request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(content__icontains=q)
        return qs

    def list(self, request, *args, **kwargs):
        conversation = self._get_conversation_for_user()
        qs = Message.objects.filter(conversation=conversation).select_related('sender')

        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(content__icontains=q)

        try:
            limit = int(request.query_params.get('limit', 50))
            limit = max(1, min(limit, 100))
        except (ValueError, TypeError):
            limit = 50

        before = (request.query_params.get('before') or '').strip()
        if before:
            # Handle '+' being unquoted as space in HTTP query strings
            if ' ' in before and '+' not in before:
                before = before.replace(' ', '+')
            try:
                from django.utils.dateparse import parse_datetime
                parsed_dt = parse_datetime(before)
                if parsed_dt:
                    qs = qs.filter(created_at__lt=parsed_dt)
                else:
                    qs = qs.filter(created_at__lt=before)
            except Exception:
                pass

        # Keyset pagination: seek limit + 1 items to detect if older messages exist
        messages_desc = list(qs.order_by('-created_at')[:limit + 1])
        has_more = len(messages_desc) > limit
        if has_more:
            messages_desc = messages_desc[:limit]

        # Chronological ascending order for chat rendering
        messages_asc = list(reversed(messages_desc))
        serializer = self.get_serializer(messages_asc, many=True)

        oldest_cursor = messages_asc[0].created_at.isoformat() if messages_asc else None
        newest_cursor = messages_asc[-1].created_at.isoformat() if messages_asc else None

        ConversationMember.objects.filter(
            conversation=conversation,
            user=request.user,
        ).update(last_read_at=timezone.now())

        return Response({
            'results': serializer.data,
            'has_more': has_more,
            'oldest_cursor': oldest_cursor,
            'newest_cursor': newest_cursor,
            'limit': limit,
        })

    def perform_create(self, serializer):
        conversation = self._get_conversation_for_user()
        conversation.save()  # touch updated_at so it sorts to top
        message = serializer.save(
            sender=self.request.user,
            conversation=conversation,
        )

        # Mark sender as read up to now
        ConversationMember.objects.filter(
            conversation=conversation,
            user=self.request.user,
        ).update(last_read_at=timezone.now())

        # Notify other members
        other_user_ids = list(
            ConversationMember.objects.filter(conversation=conversation)
            .exclude(user=self.request.user)
            .values_list('user_id', flat=True)
        )
        from apps.notifications.services import NotificationService
        from django.contrib.auth import get_user_model
        UserModel = get_user_model()
        snippet = (message.content or '')[:40]
        recipients = list(UserModel.objects.filter(id__in=other_user_ids))
        for recipient in recipients:
            NotificationService.send_event(
                recipient=recipient,
                actor=self.request.user,
                event_type='message',
                target_type='conversation',
                target_id=str(conversation.id),
                priority='personal',
                message_template=f'New message from {self.request.user.username}',
                data={'conversation_id': str(conversation.id), 'snippet': snippet},
                group_key=f"conversation:{conversation.id}:message",
            )

        payload = MessageSerializer(message, context={'request': self.request}).data
        _broadcast_chat_message(str(conversation.id), payload)


class ConversationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        is_member = ConversationMember.objects.filter(
            conversation_id=conversation_id,
            user=request.user,
        ).exists()
        if not is_member:
            return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

        ConversationMember.objects.filter(
            conversation_id=conversation_id,
            user=request.user,
        ).update(last_read_at=timezone.now())
        return Response({'message': 'Marked as read'})


class SendMessageAliasView(APIView):
    """Spec alias: POST /messages/send with {conversation_id, content, attachment_url}."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        conversation_id = request.data.get('conversation_id')
        content = (request.data.get('content') or '').strip()
        attachment_url = request.data.get('attachment_url') or ''

        if not conversation_id:
            return Response({'error': 'conversation_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not content and not attachment_url:
            return Response({'error': 'content is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

        is_member = ConversationMember.objects.filter(conversation=conversation, user=request.user).exists()
        if not is_member:
            return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

        conversation.save()  # touch updated_at
        client_msg_id = (request.data.get('client_msg_id') or '').strip()
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
            attachment_url=attachment_url,
            client_msg_id=client_msg_id,
        )

        ConversationMember.objects.filter(
            conversation=conversation,
            user=request.user,
        ).update(last_read_at=timezone.now())

        other_user_ids = list(
            ConversationMember.objects.filter(conversation=conversation)
            .exclude(user=request.user)
            .values_list('user_id', flat=True)
        )
        from apps.notifications.services import NotificationService
        from django.contrib.auth import get_user_model
        UserModel = get_user_model()
        snippet = (message.content or '')[:40]
        recipients = list(UserModel.objects.filter(id__in=other_user_ids))
        for recipient in recipients:
            NotificationService.send_event(
                recipient=recipient,
                actor=request.user,
                event_type='message',
                target_type='conversation',
                target_id=str(conversation.id),
                priority='personal',
                message_template=f'New message from {request.user.username}',
                data={'conversation_id': str(conversation.id), 'snippet': snippet},
                group_key=f"conversation:{conversation.id}:message",
            )


        data = MessageSerializer(message, context={'request': request}).data
        _broadcast_chat_message(str(conversation.id), data)
        return Response(data, status=status.HTTP_201_CREATED)


class ConversationWithUserView(APIView):
    """Spec alias: GET /messages/conversation/{user_id} to lookup an existing DM without side effects."""

    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'error': 'Cannot message yourself'}, status=status.HTTP_400_BAD_REQUEST)

        existing = Conversation.objects.filter(
            is_group=False,
            members__user=request.user
        ).filter(
            members__user=target_user
        ).first()

        if existing:
            return Response({
                'conversation_id': str(existing.id),
                'exists': True
            }, status=status.HTTP_200_OK)

        return Response({
            'exists': False,
            'message': 'No existing conversation with this user.'
        }, status=status.HTTP_404_NOT_FOUND)
