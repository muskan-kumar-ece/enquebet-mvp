"""
Serializers for Platform Updates
"""
from rest_framework import serializers
from .models import PlatformUpdate, UpdateCategory
from apps.users.models import User


class AuthorSnippetSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'profile_image',
            'headline',
            'is_staff',
        ]


class PlatformUpdateListSerializer(serializers.ModelSerializer):
    author = AuthorSnippetSerializer(read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    documents_count = serializers.SerializerMethodField()
    links_count = serializers.SerializerMethodField()
    media_count = serializers.SerializerMethodField()

    class Meta:
        model = PlatformUpdate
        fields = [
            'id',
            'title',
            'slug',
            'category',
            'category_display',
            'summary',
            'cover_image',
            'is_pinned',
            'is_published',
            'published_at',
            'created_at',
            'updated_at',
            'author',
            'documents_count',
            'links_count',
            'media_count',
        ]

    def get_documents_count(self, obj):
        return len(obj.documents) if isinstance(obj.documents, list) else 0

    def get_links_count(self, obj):
        return len(obj.external_links) if isinstance(obj.external_links, list) else 0

    def get_media_count(self, obj):
        return len(obj.media_urls) if isinstance(obj.media_urls, list) else 0


class PlatformUpdateDetailSerializer(serializers.ModelSerializer):
    author = AuthorSnippetSerializer(read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    documents_count = serializers.SerializerMethodField()
    links_count = serializers.SerializerMethodField()
    media_count = serializers.SerializerMethodField()

    class Meta:
        model = PlatformUpdate
        fields = [
            'id',
            'title',
            'slug',
            'category',
            'category_display',
            'summary',
            'content',
            'cover_image',
            'media_urls',
            'documents',
            'external_links',
            'is_pinned',
            'is_published',
            'published_at',
            'created_at',
            'updated_at',
            'author',
            'documents_count',
            'links_count',
            'media_count',
        ]

    def get_documents_count(self, obj):
        return len(obj.documents) if isinstance(obj.documents, list) else 0

    def get_links_count(self, obj):
        return len(obj.external_links) if isinstance(obj.external_links, list) else 0

    def get_media_count(self, obj):
        return len(obj.media_urls) if isinstance(obj.media_urls, list) else 0


class PlatformUpdateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformUpdate
        fields = [
            'id',
            'title',
            'slug',
            'category',
            'summary',
            'content',
            'cover_image',
            'media_urls',
            'documents',
            'external_links',
            'is_pinned',
            'is_published',
            'published_at',
        ]
        read_only_fields = ['id', 'slug']

    def validate_documents(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Documents must be a list of objects.")
        for item in value:
            if not isinstance(item, dict) or 'url' not in item:
                raise serializers.ValidationError("Each document attachment must include at least a 'url'.")
        return value

    def validate_external_links(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("External links must be a list of objects.")
        for item in value:
            if not isinstance(item, dict) or 'url' not in item:
                raise serializers.ValidationError("Each external link must include at least a 'url'.")
        return value
