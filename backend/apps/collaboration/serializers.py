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
        fields = [
            'id', 'post', 'sender', 'receiver', 'status',
            'role', 'pitch', 'weekly_commitment', 'portfolio_url',
            'client_request_id', 'message', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'status']


class CreateCollaborationRequestSerializer(serializers.Serializer):
    post_id = serializers.UUIDField()
    role = serializers.CharField(required=False, allow_blank=True, max_length=100)
    pitch = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    weekly_commitment = serializers.CharField(required=False, allow_blank=True, max_length=50)
    portfolio_url = serializers.URLField(required=False, allow_blank=True, max_length=500)
    client_request_id = serializers.CharField(required=False, allow_blank=True, max_length=128)
    message = serializers.CharField(required=False, allow_blank=True)
