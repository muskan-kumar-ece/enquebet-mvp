"""
Collaboration Views (Build With System, Atomic Acceptance, Team Provisioning & Group Creation)
"""
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import CollaborationRequest, Workspace, TeamMembership, ProjectActivity
from apps.posts.models import Post, PostCollaborator
from apps.chats.models import Conversation, ConversationMember, Message
from apps.notifications.models import Notification
from .serializers import CollaborationRequestSerializer, CreateCollaborationRequestSerializer


class SendCollaborationRequestView(APIView):
    """Send Build With collaboration request with capacity checking and atomic creation."""
    permission_classes = [IsAuthenticated]
    
    @transaction.atomic
    def post(self, request):
        serializer = CreateCollaborationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        post_id = serializer.validated_data['post_id']
        message = serializer.validated_data.get('message', '')
        
        try:
            post = Post.objects.select_for_update().get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

        if post.user == request.user:
            return Response({'error': 'You cannot request to collaborate on your own post'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check team capacity if workspace already exists
        workspace = getattr(post, 'workspace', None)
        if workspace:
            active_members_count = TeamMembership.objects.filter(workspace=workspace, status='active').count()
            if active_members_count >= workspace.max_members:
                return Response(
                    {'error': f'Team capacity reached (maximum {workspace.max_members} members).'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Check if user is already an active collaborator
        is_active = (
            PostCollaborator.objects.filter(post=post, user=request.user).exists() or
            (workspace and TeamMembership.objects.filter(workspace=workspace, user=request.user, status='active').exists())
        )
        if is_active:
            return Response({'error': 'You are already a member of this team'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if already requested (allow re-request if previously declined, cancelled, or if member previously left)
        existing_request = CollaborationRequest.objects.filter(post=post, sender=request.user).first()
        if existing_request and existing_request.status == 'pending':
            return Response({'error': 'Request already sent'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create (or reopen) request
        if existing_request:
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
    Accept collaboration request atomically:
    1. Locks post row to prevent concurrent race conditions
    2. Enforces team capacity
    3. Provisions/provisions Workspace and initializes owner TeamMembership
    4. Enrolls applicant as active Contributor
    5. Syncs legacy PostCollaborator
    6. Auto-provisions group chat with welcome message
    7. Emits ProjectActivity audit log and Notification
    """
    permission_classes = [IsAuthenticated]
    
    @transaction.atomic
    def post(self, request, request_id):
        try:
            collab_request = CollaborationRequest.objects.get(
                id=request_id,
                receiver=request.user
            )
        except CollaborationRequest.DoesNotExist:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

        if collab_request.status == 'accepted':
            workspace = Workspace.objects.filter(post=collab_request.post).first()
            return Response({
                'message': 'Collaboration request already accepted',
                'workspace_id': str(workspace.id) if workspace else None,
                'status': 'accepted'
            }, status=status.HTTP_200_OK)

        if collab_request.status != 'pending':
            return Response({'error': f'Cannot accept request with status: {collab_request.status}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Lock post to prevent concurrent accept race conditions
        post = Post.objects.select_for_update().get(id=collab_request.post_id)

        # 1. Ensure Workspace exists
        workspace, _ = Workspace.objects.get_or_create(post=post)

        # 2. Check team capacity
        active_count = TeamMembership.objects.filter(workspace=workspace, status='active').count()
        if active_count >= workspace.max_members:
            return Response(
                {'error': f'Team capacity reached (maximum {workspace.max_members} members).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Update request status
        collab_request.status = 'accepted'
        collab_request.save(update_fields=['status', 'updated_at'])
        
        # 4. Sync legacy PostCollaborator (idempotently)
        PostCollaborator.objects.get_or_create(
            post=post,
            user=collab_request.sender
        )

        # 5. Ensure post owner is active owner in TeamMembership
        TeamMembership.objects.get_or_create(
            workspace=workspace,
            user=post.user,
            defaults={'role': 'owner', 'status': 'active'}
        )

        # 6. Add or reactivate applicant in TeamMembership
        membership, created = TeamMembership.objects.get_or_create(
            workspace=workspace,
            user=collab_request.sender,
            defaults={'role': 'contributor', 'status': 'active'}
        )
        if not created and membership.status != 'active':
            membership.status = 'active'
            membership.left_at = None
            membership.removal_reason = ''
            membership.save(update_fields=['status', 'left_at', 'removal_reason', 'updated_at'])

        # 7. Audit log in ProjectActivity
        ProjectActivity.log(
            workspace=workspace,
            event_type='member_joined',
            description=f"{collab_request.sender.username} joined the team as Contributor",
            actor=request.user,
            metadata={'user_id': str(collab_request.sender.id), 'role': 'contributor'}
        )
        
        # 8. Auto-create or join group chat
        conversation = self.create_or_get_group_chat(post, collab_request.sender)
        
        # 9. Create notification for requester
        Notification.objects.create(
            user=collab_request.sender,
            sender=request.user,
            type='collaboration_accepted',
            reference_id=collab_request.id,
            message=f"{request.user.username} accepted your collaboration request on '{post.title}'!"
        )
        
        return Response({
            'message': 'Collaboration request accepted',
            'group_chat_id': str(conversation.id),
            'workspace_id': str(workspace.id)
        })
    
    def create_or_get_group_chat(self, post, new_member):
        """
        Auto-create group chat for post collaborators idempotently.
        """
        existing_conversation = Conversation.objects.select_for_update().filter(
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
        ConversationMember.objects.get_or_create(
            conversation=conversation,
            user=post.user,
            defaults={'last_read_at': timezone.now()}
        )
        
        # Add new collaborator
        ConversationMember.objects.get_or_create(
            conversation=conversation,
            user=new_member,
            defaults={'last_read_at': timezone.now()}
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
    """Spec-friendly accept endpoint using request body."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id') or request.data.get('id')
        if not request_id:
            return Response({'error': 'request_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        return AcceptCollaborationRequestView().dispatch(request, request_id=request_id)


class DeclineCollaborationRequestView(APIView):
    """Decline collaboration request"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, request_id=None):
        req_id = request_id or request.data.get('request_id') or request.data.get('id')
        if not req_id:
            return Response({'error': 'request_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            collab_request = CollaborationRequest.objects.get(
                id=req_id,
                receiver=request.user,
                status='pending'
            )
        except CollaborationRequest.DoesNotExist:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
        
        collab_request.status = 'declined'
        collab_request.save(update_fields=['status', 'updated_at'])

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
    """Spec-friendly decline endpoint using request body."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return DeclineCollaborationRequestView().dispatch(request, request_id=None)


class CancelCollaborationRequestView(APIView):
    """Allow the sender to cancel their pending collaboration request."""
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id=None):
        req_id = request_id or request.data.get('request_id') or request.data.get('id')
        post_id = request.data.get('post_id')

        if req_id:
            q = Q(id=req_id, sender=request.user, status='pending')
        elif post_id:
            q = Q(post_id=post_id, sender=request.user, status='pending')
        else:
            return Response({'error': 'request_id or post_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        collab_request = CollaborationRequest.objects.filter(q).first()
        if not collab_request:
            return Response({'error': 'Pending request not found'}, status=status.HTTP_404_NOT_FOUND)

        collab_request.status = 'cancelled'
        collab_request.save(update_fields=['status', 'updated_at'])
        return Response({'message': 'Request cancelled', 'cancelled': True})


class MyCollaborationRequestsView(generics.ListAPIView):
    """Get my collaboration requests (sent and received)"""
    serializer_class = CollaborationRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return CollaborationRequest.objects.filter(
            Q(sender=self.request.user) | Q(receiver=self.request.user)
        ).select_related(
            'sender', 'receiver', 'post', 'post__user'
        ).order_by('-created_at')
