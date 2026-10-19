"""
Serializers for ENQUEbet Pulse — Platform Updates, Technical Intelligence & Preferences
"""
from rest_framework import serializers
from .models import (
    PlatformUpdate,
    UpdateCategory,
    UpdateType,
    EditorialStatus,
    ImportanceLevel,
    SavedUpdate,
    UserPulsePreference,
    UpdateRevision
)
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
    """
    Card-level serializer for Pulse timeline feeds, briefings, and radar widgets.
    """
    author = AuthorSnippetSerializer(read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    update_type_display = serializers.CharField(source='get_update_type_display', read_only=True)
    is_saved = serializers.SerializerMethodField()
    saves_count = serializers.SerializerMethodField()
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
            'update_type',
            'update_type_display',
            'editorial_status',
            'importance',
            'is_top_story',
            'summary',
            'why_it_matters',
            'who_should_care',
            'what_to_do_next',
            'tags',
            'reading_time_minutes',
            'primary_source_name',
            'primary_source_url',
            'event_date',
            'source_published_at',
            'published_at',
            'last_verified_at',
            'opportunity_meta',
            'lifecycle_meta',
            'learn_this_next',
            'build_this_idea',
            'cover_image',
            'is_pinned',
            'is_published',
            'created_at',
            'updated_at',
            'author',
            'is_saved',
            'saves_count',
            'documents_count',
            'links_count',
            'media_count',
        ]

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        # If pre-annotated or checked via set
        saved_ids = self.context.get('saved_update_ids')
        if saved_ids is not None:
            return str(obj.id) in saved_ids or obj.id in saved_ids
        return SavedUpdate.objects.filter(user=request.user, update=obj).exists()

    def get_saves_count(self, obj):
        return getattr(obj, 'saves_count_annotated', obj.saves.count())

    def get_documents_count(self, obj):
        return len(obj.documents) if isinstance(obj.documents, list) else 0

    def get_links_count(self, obj):
        return len(obj.external_links) if isinstance(obj.external_links, list) else 0

    def get_media_count(self, obj):
        return len(obj.media_urls) if isinstance(obj.media_urls, list) else 0


class PlatformUpdateDetailSerializer(serializers.ModelSerializer):
    """
    3-Level progressive disclosure detail serializer.
    Includes full markdown content, code attachments, verified sources, and learning/build hooks.
    """
    author = AuthorSnippetSerializer(read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    update_type_display = serializers.CharField(source='get_update_type_display', read_only=True)
    is_saved = serializers.SerializerMethodField()
    saves_count = serializers.SerializerMethodField()
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
            'update_type',
            'update_type_display',
            'editorial_status',
            'importance',
            'is_top_story',
            # Level 1: 30s Brief
            'summary',
            'why_it_matters',
            'who_should_care',
            # Level 2: Technical Deep Dive
            'content',
            # Level 3: Action & Learning Hooks
            'what_to_do_next',
            'learn_this_next',
            'build_this_idea',
            'opportunity_meta',
            'lifecycle_meta',
            # Sources & Verification
            'primary_source_name',
            'primary_source_url',
            'sources',
            # Presentation & Dates
            'reading_time_minutes',
            'tags',
            'cover_image',
            'media_urls',
            'documents',
            'external_links',
            'is_pinned',
            'is_published',
            'event_date',
            'source_published_at',
            'published_at',
            'last_verified_at',
            'created_at',
            'updated_at',
            'author',
            'is_saved',
            'saves_count',
            'documents_count',
            'links_count',
            'media_count',
        ]

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return SavedUpdate.objects.filter(user=request.user, update=obj).exists()

    def get_saves_count(self, obj):
        return getattr(obj, 'saves_count_annotated', obj.saves.count())

    def get_documents_count(self, obj):
        return len(obj.documents) if isinstance(obj.documents, list) else 0

    def get_links_count(self, obj):
        return len(obj.external_links) if isinstance(obj.external_links, list) else 0

    def get_media_count(self, obj):
        return len(obj.media_urls) if isinstance(obj.media_urls, list) else 0


class PlatformUpdateCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for admin content creation and updates in Admin Studio.
    """
    class Meta:
        model = PlatformUpdate
        fields = [
            'id',
            'title',
            'slug',
            'category',
            'update_type',
            'editorial_status',
            'importance',
            'is_top_story',
            'summary',
            'why_it_matters',
            'who_should_care',
            'content',
            'what_to_do_next',
            'learn_this_next',
            'build_this_idea',
            'opportunity_meta',
            'lifecycle_meta',
            'primary_source_name',
            'primary_source_url',
            'sources',
            'tags',
            'reading_time_minutes',
            'event_date',
            'source_published_at',
            'published_at',
            'last_verified_at',
            'scheduled_for',
            'cover_image',
            'media_urls',
            'documents',
            'external_links',
            'is_pinned',
            'is_published',
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


class SavedUpdateSerializer(serializers.ModelSerializer):
    update = PlatformUpdateListSerializer(read_only=True)

    class Meta:
        model = SavedUpdate
        fields = ['id', 'update', 'created_at']


class UserPulsePreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPulsePreference
        fields = [
            'followed_categories',
            'followed_technologies',
            'receive_weekly_briefing',
            'updated_at',
        ]


class UpdateRevisionSerializer(serializers.ModelSerializer):
    editor = AuthorSnippetSerializer(read_only=True)

    class Meta:
        model = UpdateRevision
        fields = ['id', 'editor', 'revision_summary', 'changes', 'created_at']
