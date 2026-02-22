"""
Messages Views
"""
from django.utils import timezone
from django.db import transaction
from django.db.models import Prefetch
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
        qs = Conversation.objects.filter(
            members__user=self.request.user
        ).distinct().prefetch_related(
            Prefetch('members', queryset=ConversationMember.objects.select_related('user')),
        ).order_by('-updated_at')
        return qs

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
        return Message.objects.filter(
            conversation_id=conversation_id
        ).select_related('sender')

    def list(self, request, *args, **kwargs):
        conversation = self._get_conversation_for_user()
        response = super().list(request, *args, **kwargs)
        ConversationMember.objects.filter(
            conversation=conversation,
            user=request.user,
        ).update(last_read_at=timezone.now())
        return response

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
        for uid in other_user_ids:
            Notification.objects.create(
                user_id=uid,
                sender=self.request.user,
                type='message',
                reference_id=conversation.id,
                message=f'New message from {self.request.user.username}',
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
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
            attachment_url=attachment_url,
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
        for uid in other_user_ids:
            Notification.objects.create(
                user_id=uid,
                sender=request.user,
                type='message',
                reference_id=conversation.id,
                message=f'New message from {request.user.username}',
            )

        data = MessageSerializer(message, context={'request': request}).data
        _broadcast_chat_message(str(conversation.id), data)
        return Response(data, status=status.HTTP_201_CREATED)


class ConversationWithUserView(APIView):
    """Spec alias: GET /messages/conversation/{user_id} to get (or create) a DM."""

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
            return Response({'conversation_id': str(existing.id)}, status=status.HTTP_200_OK)

        conversation = Conversation.objects.create(name='', is_group=False)
        now = timezone.now()
        ConversationMember.objects.create(conversation=conversation, user=request.user, last_read_at=now)
        ConversationMember.objects.create(conversation=conversation, user=target_user, last_read_at=now)

        return Response({'conversation_id': str(conversation.id)}, status=status.HTTP_201_CREATED)
