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

    class Meta:
        model = Conversation
        fields = ['id', 'name', 'is_group', 'members', 'member_count', 'unread_count', 'last_message', 'created_at', 'updated_at']

    def get_members(self, obj):
        member_objs = obj.members.select_related('user').all()[:10]
        return [{'id': str(m.user.id), 'username': m.user.username, 'full_name': m.user.full_name} for m in member_objs]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_last_message(self, obj):
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
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or request.user.is_anonymous:
            return 0

        member = ConversationMember.objects.filter(conversation=obj, user=request.user).only('last_read_at').first()
        if not member:
            return 0

        qs = obj.messages.exclude(sender=request.user)
        if member.last_read_at:
            qs = qs.filter(created_at__gt=member.last_read_at)
        return qs.count()


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'attachment_url', 'created_at']
        read_only_fields = ['id', 'created_at']
