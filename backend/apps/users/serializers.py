"""
User Serializers for Authentication and Profiles
"""
import json
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserSkill, Follower

User = get_user_model()


class UserSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSkill
        fields = ['id', 'skill_name']


class SkillsField(serializers.Field):
    """Read/write user skills as a list of strings.
    Accepts a real list (JSON body) or a JSON-stringified list (FormData)."""

    def to_representation(self, value):
        # value is typically a RelatedManager for UserSkill
        if hasattr(value, 'all'):
            value = value.all()
        return [getattr(skill, 'skill_name', str(skill)) for skill in value]

    def to_internal_value(self, data):
        if data is None:
            return []
        # FormData sends arrays as JSON-encoded strings — parse them
        if isinstance(data, str):
            text = data.strip()
            if not text:
                return []
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                # Single skill as plain text
                return [text] if text else []
        if not isinstance(data, list):
            raise serializers.ValidationError('Expected a list of strings')

        cleaned = []
        for item in data:
            if not isinstance(item, str):
                raise serializers.ValidationError('Each skill must be a string')
            name = item.strip()
            if name:
                cleaned.append(name)
        return cleaned


class UserSerializer(serializers.ModelSerializer):
    skills = SkillsField(required=False)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    # Frontend uses avatar_url — map it to profile_image for read/write.
    avatar_url = serializers.URLField(source='profile_image', required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name', 'bio',
            'profile_image', 'avatar_url', 'cover_image', 'location', 'college',
            'is_private',
            'skills', 'followers_count', 'following_count',
            'education', 'projects', 'experience',
            'resume_file', 'linkedin_url', 'github_url', 'portfolio_url',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Only expose email to the user themselves
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            if request.user.id != instance.id:
                data.pop('email', None)
        else:
            data.pop('email', None)
        return data
    
    def get_followers_count(self, obj):
        return obj.followers.count()
    
    def get_following_count(self, obj):
        return obj.following.count()

    def update(self, instance, validated_data):
        skills = validated_data.pop('skills', None)
        instance = super().update(instance, validated_data)

        if skills is not None:
            # Keep only the provided set, and add missing ones.
            UserSkill.objects.filter(user=instance).exclude(skill_name__in=skills).delete()
            existing = set(
                UserSkill.objects.filter(user=instance, skill_name__in=skills)
                .values_list('skill_name', flat=True)
            )
            for name in skills:
                if name not in existing:
                    UserSkill.objects.create(user=instance, skill_name=name)

        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'full_name', 'password', 'password_confirm']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            full_name=validated_data['full_name'],
            password=validated_data['password']
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
