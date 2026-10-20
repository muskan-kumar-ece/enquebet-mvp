"""
Notifications Serializers (10/10 Architecture)
"""
from rest_framework import serializers
from .models import Notification, NotificationMute
from .services import resolve_canonical_action_url


class NotificationSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    action_url = serializers.SerializerMethodField()
    recent_actors = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'type',
            'priority',
            'reference_id',
            'message',
            'is_read',
            'group_key',
            'actor_count',
            'event_count',
            'target_type',
            'target_id',
            'action_url',
            'recent_actors',
            'data',
            'seen_at',
            'read_at',
            'created_at',
            'updated_at',
            'sender',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'action_url', 'recent_actors']

    def get_sender(self, obj):
        if not obj.sender:
            return None
        return {
            'id': str(obj.sender.id),
            'username': obj.sender.username,
            'full_name': obj.sender.full_name or obj.sender.username,
            'avatar_url': getattr(obj.sender, 'profile_image', '') or '',
        }

    def get_action_url(self, obj):
        return resolve_canonical_action_url(obj.target_type, obj.target_id, obj.data)

    def get_recent_actors(self, obj):
        actors = getattr(obj, '_prefetched_actors', None)
        if actors is None:
            actors = list(obj.actors.select_related('actor')[:5])
        return [
            {
                'id': str(a.actor.id),
                'username': a.actor.username,
                'full_name': a.actor.full_name or a.actor.username,
                'avatar_url': getattr(a.actor, 'profile_image', '') or '',
            }
            for a in actors
        ]


class NotificationMuteSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationMute
        fields = ['id', 'target_type', 'target_id', 'created_at']
        read_only_fields = ['id', 'created_at']
