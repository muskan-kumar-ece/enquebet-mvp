"""
Notifications Serializers
"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'type', 'reference_id', 'message', 'is_read', 'created_at', 'sender']
        read_only_fields = ['id', 'created_at']

    def get_sender(self, obj):
        if not obj.sender:
            return None
        return {
            'id': str(obj.sender.id),
            'username': obj.sender.username,
            'full_name': obj.sender.full_name,
            'avatar_url': getattr(obj.sender, 'profile_image', '') or '',
        }
