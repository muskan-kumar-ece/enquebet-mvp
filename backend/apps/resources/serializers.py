"""
Serializers for Engineering Resources
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Resource, ResourceCategory, ResourceFileType, ApprovalStatus

User = get_user_model()


class ResourceUploaderSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'profile_image', 'college', 'campus_domain']


class ResourceListSerializer(serializers.ModelSerializer):
    uploader = ResourceUploaderSerializer(read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Resource
        fields = [
            'id', 'slug', 'title', 'description', 'category', 'category_display',
            'file_type', 'file_type_display', 'file_url', 'file_size_bytes',
            'original_filename', 'external_link', 'tags', 'downloads_count',
            'views_count', 'status', 'status_display', 'uploader', 'created_at'
        ]


class ResourceDetailSerializer(serializers.ModelSerializer):
    uploader = ResourceUploaderSerializer(read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Resource
        fields = [
            'id', 'slug', 'title', 'description', 'category', 'category_display',
            'file_type', 'file_type_display', 'file_url', 'file_size_bytes',
            'original_filename', 'external_link', 'tags', 'downloads_count',
            'views_count', 'status', 'status_display', 'rejection_reason',
            'reviewed_by_name', 'reviewed_at', 'uploader', 'created_at', 'updated_at'
        ]


class ResourceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = [
            'title', 'description', 'category', 'file_type',
            'file_url', 'file_size_bytes', 'original_filename',
            'external_link', 'tags'
        ]

    def validate(self, attrs):
        file_url = attrs.get('file_url', '')
        external_link = attrs.get('external_link', '')
        if not file_url and not external_link:
            raise serializers.ValidationError('You must provide either an uploaded file or an external resource link.')
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['uploader'] = user
        validated_data['status'] = ApprovalStatus.PENDING_APPROVAL
        return super().create(validated_data)
