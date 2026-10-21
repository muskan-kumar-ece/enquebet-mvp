"""
Messages Serializers
"""
from rest_framework import serializers
from .models import Conversation, ConversationMember, Message
from apps.users.serializers import UserSerializer


class ConversationMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ConversationMember
        fields = ['user', 'joined_at']


class ConversationSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    project_title = serializers.SerializerMethodField()
    workspace_id = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'name', 'is_group', 'project_id', 'project_title', 
            'workspace_id', 'members', 'member_count', 'unread_count', 
            'last_message', 'created_at', 'updated_at'
        ]

    def get_members(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'members' in obj._prefetched_objects_cache:
            member_objs = list(obj.members.all())[:10]
        else:
            member_objs = list(obj.members.select_related('user').all()[:10])
        return [{'id': str(m.user.id), 'username': m.user.username, 'full_name': m.user.full_name} for m in member_objs]

    def get_member_count(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'members' in obj._prefetched_objects_cache:
            return len(obj.members.all())
        return obj.members.count()

    def get_project_title(self, obj):
        if hasattr(obj, 'annotated_project_title') and obj.annotated_project_title is not None:
            return obj.annotated_project_title
        if not obj.project_id:
            return None
        from apps.posts.models import Post
        post = Post.objects.filter(id=obj.project_id).only('title').first()
        return post.title if post else None

    def get_workspace_id(self, obj):
        if hasattr(obj, 'annotated_workspace_id') and obj.annotated_workspace_id is not None:
            return str(obj.annotated_workspace_id)
        if not obj.project_id:
            return None
        from apps.collaboration.models import Workspace
        ws = Workspace.objects.filter(post_id=obj.project_id).only('id').first()
        return str(ws.id) if ws else None

    def get_last_message(self, obj):
        if hasattr(obj, 'last_message_content') and obj.last_message_content is not None:
            return {
                'content': obj.last_message_content,
                'sender': obj.last_message_sender_username or 'Unknown',
                'created_at': obj.last_message_created_at
            }
        # Use prefetched _last_message if available, otherwise query
        if hasattr(obj, '_last_message') and obj._last_message:
            msg = obj._last_message
            return {
                'content': msg.content,
                'sender': msg.sender.username if msg.sender else 'Unknown',
                'created_at': msg.created_at
            }
        last_msg = obj.messages.select_related('sender').order_by('-created_at').first()
        if last_msg:
            return {
                'content': last_msg.content,
                'sender': last_msg.sender.username,
                'created_at': last_msg.created_at
            }
        return None

    def get_unread_count(self, obj):
        if hasattr(obj, 'annotated_unread_count') and obj.annotated_unread_count is not None:
            return obj.annotated_unread_count

        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or request.user.is_anonymous:
            return 0

        # Try to find member from prefetched cache first
        member = None
        if hasattr(obj, '_prefetched_objects_cache') and 'members' in obj._prefetched_objects_cache:
            for m in obj.members.all():
                if m.user_id == request.user.id:
                    member = m
                    break
        if not member:
            member = ConversationMember.objects.filter(conversation=obj, user=request.user).only('last_read_at').first()
        if not member:
            return 0

        qs = obj.messages.exclude(sender=request.user)
        if member.last_read_at:
            qs = qs.filter(created_at__gt=member.last_read_at)
        return qs.count()



class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'attachment_url', 'client_msg_id', 'is_me', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None):
            return False
        return obj.sender_id == request.user.id
