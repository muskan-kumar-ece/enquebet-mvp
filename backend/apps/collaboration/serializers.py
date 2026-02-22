"""
Collaboration Serializers
"""
from rest_framework import serializers
from .models import CollaborationRequest
from apps.users.serializers import UserSerializer
from apps.posts.serializers import PostSerializer


class CollaborationRequestSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    post = PostSerializer(read_only=True)
    
    class Meta:
        model = CollaborationRequest
        fields = ['id', 'post', 'sender', 'receiver', 'status', 'message', 'created_at']
        read_only_fields = ['id', 'created_at', 'status']


class CreateCollaborationRequestSerializer(serializers.Serializer):
    post_id = serializers.UUIDField()
    message = serializers.CharField(required=False, allow_blank=True)
