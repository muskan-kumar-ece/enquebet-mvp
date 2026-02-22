"""
Post Serializers
"""
import json
from rest_framework import serializers
from .models import Post, PostAttachment, PostRequirement, PostTag, Like, Comment
from apps.users.serializers import UserSerializer


class FlexibleStringListField(serializers.ListField):
    """Accepts either a real list (JSON requests) or a JSON-stringified list (multipart FormData)."""

    def to_internal_value(self, data):
        if isinstance(data, str):
            text = data.strip()
            if not text:
                return []
            try:
                decoded = json.loads(text)
                data = decoded
            except json.JSONDecodeError:
                # Fallback: treat as single item
                data = [text]
        return super().to_internal_value(data)


class PostAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostAttachment
        fields = ['id', 'file_url', 'file_type']


class PostRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostRequirement
        fields = ['id', 'role_name']


class PostTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostTag
        fields = ['id', 'tag_name']


class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    attachments = PostAttachmentSerializer(many=True, read_only=True)
    requirements = PostRequirementSerializer(many=True, read_only=True)
    tags = PostTagSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    has_requested_collaboration = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'user', 'title', 'description', 'category', 'view_type',
            'location', 'college', 'attachments', 'requirements', 'tags',
            'likes_count', 'comments_count', 'is_liked', 'is_saved', 'has_requested_collaboration', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_likes_count(self, obj):
        # Prefer annotated value to avoid N+1 queries
        if hasattr(obj, '_likes_count'):
            return obj._likes_count
        return obj.likes.count()
    
    def get_comments_count(self, obj):
        if hasattr(obj, '_comments_count'):
            return obj._comments_count
        return obj.comments.count()
    
    def get_is_liked(self, obj):
        # Prefer prefetched/annotated value
        if hasattr(obj, '_is_liked'):
            return obj._is_liked
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_is_saved(self, obj):
        if hasattr(obj, '_is_saved'):
            return obj._is_saved
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from .models import SavedPost
            return SavedPost.objects.filter(post=obj, user=request.user).exists()
        return False

    def get_has_requested_collaboration(self, obj):
        if hasattr(obj, '_has_requested_collaboration'):
            return obj._has_requested_collaboration
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from apps.collaboration.models import CollaborationRequest
            return CollaborationRequest.objects.filter(
                post=obj, 
                sender=request.user
            ).exclude(status='declined').exists()
        return False


class CreatePostSerializer(serializers.ModelSerializer):
    requirements = FlexibleStringListField(child=serializers.CharField(), write_only=True, required=False)
    tags = FlexibleStringListField(child=serializers.CharField(), write_only=True, required=False)
    attachment_url = serializers.URLField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Post
        fields = ['title', 'description', 'category', 'view_type', 'location', 'college', 'requirements', 'tags', 'attachment_url']

    def create(self, validated_data):
        requirements = validated_data.pop('requirements', [])
        tags = validated_data.pop('tags', [])
        attachment_url = validated_data.pop('attachment_url', '')

        post = Post.objects.create(**validated_data)

        # Create requirements
        for role in requirements:
            PostRequirement.objects.create(post=post, role_name=role)

        # Create tags
        for tag in tags:
            PostTag.objects.create(post=post, tag_name=tag)

        # Save attachment if provided
        if attachment_url:
            PostAttachment.objects.create(
                post=post,
                file_url=attachment_url,
                file_type='image'
            )

        return post


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'user', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']
