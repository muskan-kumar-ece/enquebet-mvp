"""
Collaboration Views (Build With System + Auto Group Creation)
"""
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import CollaborationRequest
from apps.posts.models import Post, PostCollaborator
from apps.chats.models import Conversation, ConversationMember, Message
from apps.notifications.models import Notification
from .serializers import CollaborationRequestSerializer, CreateCollaborationRequestSerializer


class SendCollaborationRequestView(APIView):
    """Send Build With collaboration request"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = CreateCollaborationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        post_id = serializer.validated_data['post_id']
        message = serializer.validated_data.get('message', '')
        
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

        if post.user == request.user:
            return Response({'error': 'You cannot request to collaborate on your own post'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already requested (allow re-request only if previously declined)
        existing_request = CollaborationRequest.objects.filter(post=post, sender=request.user).first()
        if existing_request and existing_request.status in ('pending', 'accepted'):
            return Response({'error': 'Request already sent'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create (or reopen) request
        if existing_request and existing_request.status in ('declined', 'cancelled'):
            collab_request = existing_request
            collab_request.receiver = post.user
            collab_request.message = message
            collab_request.status = 'pending'
            collab_request.save(update_fields=['receiver', 'message', 'status', 'updated_at'])
        else:
            collab_request = CollaborationRequest.objects.create(
                post=post,
                sender=request.user,
                receiver=post.user,
                message=message
            )
        
        # Create notification for post owner
        Notification.objects.create(
            user=post.user,
            sender=request.user,
            type='collaboration_request',
            reference_id=collab_request.id,
            message=f"{request.user.username} wants to collaborate on '{post.title}'"
        )
        
        return Response(
            CollaborationRequestSerializer(collab_request).data,
            status=status.HTTP_201_CREATED
        )


class AcceptCollaborationRequestView(APIView):
    """
    Accept collaboration request
    CRITICAL: Auto-creates group chat with all collaborators
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, request_id):
        try:
            collab_request = CollaborationRequest.objects.get(
                id=request_id,
                receiver=request.user,
                status='pending'
            )
        except CollaborationRequest.DoesNotExist:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Update status
        collab_request.status = 'accepted'
        collab_request.save()
        
        # Add to post collaborators
        PostCollaborator.objects.create(
            post=collab_request.post,
            user=collab_request.sender
        )
        
        # AUTO-CREATE GROUP CHAT (CRITICAL FEATURE)
        conversation = self.create_or_get_group_chat(collab_request.post, collab_request.sender)
        
        # Create notification for requester
        Notification.objects.create(
            user=collab_request.sender,
            sender=request.user,
            type='collaboration_accepted',
            reference_id=collab_request.id,
            message=f"{request.user.username} accepted your collaboration request on '{collab_request.post.title}'!"
        )
        
        return Response({
            'message': 'Collaboration request accepted',
            'group_chat_id': str(conversation.id)
        })
    
    def create_or_get_group_chat(self, post, new_member):
        """
        Auto-create group chat for post collaborators
        If group already exists, add new member
        """
        # Check if group chat already exists for this post
        existing_conversation = Conversation.objects.filter(
            project_id=post.id,
            is_group=True
        ).first()
        
        if existing_conversation:
            # Add new member to existing group
            ConversationMember.objects.get_or_create(
                conversation=existing_conversation,
                user=new_member,
                defaults={'last_read_at': timezone.now()}
            )
            
            # Send welcome message
            Message.objects.create(
                conversation=existing_conversation,
                sender=post.user,
                content=f"Welcome {new_member.username} to the team! 🎉"
            )

            existing_conversation.save(update_fields=['updated_at'])
            
            return existing_conversation
        
        # Create NEW group chat
        conversation = Conversation.objects.create(
            name=f"{post.title} - Team",
            is_group=True,
            project_id=post.id
        )
        
        # Add post owner
        ConversationMember.objects.create(
            conversation=conversation,
            user=post.user,
            last_read_at=timezone.now(),
        )
        
        # Add new collaborator
        ConversationMember.objects.create(
            conversation=conversation,
            user=new_member,
            last_read_at=timezone.now(),
        )
        
        # Send welcome message
        Message.objects.create(
            conversation=conversation,
            sender=post.user,
            content=f"Welcome {new_member.username}! Let's build {post.title} together! 🚀"
        )

        conversation.save(update_fields=['updated_at'])
        
        return conversation


class AcceptCollaborationAliasView(APIView):
    """Spec-friendly accept endpoint.

    information.md examples use:
    - POST /api/collaboration/accept

    This alias expects a JSON body with:
    - request_id: UUID
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id') or request.data.get('id')
        if not request_id:
            return Response({'error': 'request_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        return AcceptCollaborationRequestView().dispatch(request, request_id=request_id)


class DeclineCollaborationRequestView(APIView):
    """Decline collaboration request"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, request_id):
        try:
            collab_request = CollaborationRequest.objects.get(
                id=request_id,
                receiver=request.user,
                status='pending'
            )
        except CollaborationRequest.DoesNotExist:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
        
        collab_request.status = 'declined'
        collab_request.save()

        # Notify the sender about the decline
        Notification.objects.create(
            user=collab_request.sender,
            sender=request.user,
            type='collaboration_declined',
            reference_id=collab_request.id,
            message=f"{request.user.username} declined your collaboration request"
        )
        
        return Response({'message': 'Request declined'})


class DeclineCollaborationAliasView(APIView):
    """Spec-friendly decline endpoint.

    information.md examples use:
    - POST /api/collaboration/decline

    This alias expects a JSON body with:
    - request_id: UUID
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id') or request.data.get('id')
        if not request_id:
            return Response({'error': 'request_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        return DeclineCollaborationRequestView().dispatch(request, request_id=request_id)


class CancelCollaborationRequestView(APIView):
    """Allow the sender to cancel their pending collaboration request."""

    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        try:
            collab_request = CollaborationRequest.objects.get(
                id=request_id,
                sender=request.user,
                status='pending'
            )
        except CollaborationRequest.DoesNotExist:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

        collab_request.status = 'cancelled'
        collab_request.save()
        return Response({'message': 'Request cancelled'})


class MyCollaborationRequestsView(generics.ListAPIView):
    """Get my collaboration requests (sent and received)"""
    serializer_class = CollaborationRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        from django.db.models import Q
        return CollaborationRequest.objects.filter(
            Q(sender=self.request.user) | Q(receiver=self.request.user)
        ).select_related(
            'sender', 'receiver', 'post', 'post__user'
        ).order_by('-created_at')
