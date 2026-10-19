"""
User Serializers for Authentication and Profiles
"""
import json
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserSkill, Follower, UserExperience, UserEducation, UserSession, BlockedUser

User = get_user_model()


class UserSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSkill
        fields = ['id', 'skill_name', 'level']


class SkillsField(serializers.Field):
    """Read/write user skills.
    Accepts:
      - List of strings: ["Python", "React"]
      - List of objects: [{"skill_name": "Python", "level": "advanced"}]
      - JSON string of either (for multipart FormData compatibility)
    Returns:
      - List of strings for 100% backward compatibility with existing clients.
    """

    def to_representation(self, value):
        if hasattr(value, 'all'):
            value = value.all()
        return [getattr(skill, 'skill_name', str(skill)) for skill in value]

    def to_internal_value(self, data):
        if data is None:
            return []
        if isinstance(data, str):
            text = data.strip()
            if not text:
                return []
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                return [{'skill_name': text, 'level': 'intermediate'}]

        if not isinstance(data, list):
            raise serializers.ValidationError('Expected a list of strings or skill objects')

        cleaned = []
        valid_levels = {'beginner', 'intermediate', 'advanced'}
        for item in data:
            if isinstance(item, str):
                name = item.strip()
                if name:
                    cleaned.append({'skill_name': name, 'level': 'intermediate'})
            elif isinstance(item, dict):
                name = (item.get('skill_name') or item.get('name') or '').strip()
                level = (item.get('level') or 'intermediate').strip().lower()
                if level not in valid_levels:
                    level = 'intermediate'
                if name:
                    cleaned.append({'skill_name': name, 'level': level})
            else:
                raise serializers.ValidationError('Each skill must be a string or object with skill_name and level')

        return cleaned


class UserSerializer(serializers.ModelSerializer):
    skills = SkillsField(required=False)
    skills_detailed = UserSkillSerializer(source='skills', many=True, read_only=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    completeness_score = serializers.SerializerMethodField()
    is_private_locked = serializers.SerializerMethodField()
    reputation_tier = serializers.SerializerMethodField()
    avatar_url = serializers.URLField(source='profile_image', required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name', 'headline', 'bio',
            'profile_image', 'avatar_url', 'cover_image', 'location', 'college',
            'city', 'latitude', 'longitude', 'campus_domain',
            'is_private', 'is_private_locked',
            'verification_level', 'reputation_score', 'reputation_tier', 'completeness_score',
            'availability_status', 'pinned_proof_ids',
            'daily_focus_limit_minutes', 'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end', 'weekly_digest_enabled',
            'skills', 'skills_detailed', 'followers_count', 'following_count', 'is_following',
            'education', 'projects', 'experience', 'certifications', 'collaboration_preferences',
            'resume_file', 'linkedin_url', 'github_url', 'portfolio_url',
            'is_staff', 'is_superuser',
            'created_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'verification_level', 'reputation_score',
            'reputation_tier', 'completeness_score', 'is_private_locked',
            'is_following', 'is_staff', 'is_superuser'
        ]


    def to_internal_value(self, data):
        import json
        if hasattr(data, 'copy'):
            data = data.copy()
        for field in ['education', 'experience', 'projects', 'certifications', 'collaboration_preferences']:
            val = data.get(field)
            if isinstance(val, str):
                try:
                    data[field] = json.loads(val)
                except (ValueError, TypeError):
                    pass
        return super().to_internal_value(data)

    def get_is_private_locked(self, instance):
        request = self.context.get('request')
        request_user = getattr(request, 'user', None) if request else None
        if not instance.is_private:
            return False
        if request_user and request_user.is_authenticated and request_user.id == instance.id:
            return False
        if request_user and request_user.is_authenticated:
            followed_ids = self.context.get('followed_user_ids')
            if followed_ids is not None:
                return instance.id not in followed_ids
            return not Follower.objects.filter(follower=request_user, following=instance).exists()
        return True

    def get_reputation_tier(self, obj):
        from apps.collaboration.reputation_config import get_builder_level
        return get_builder_level(getattr(obj, 'reputation_score', 0))['title']

    def get_completeness_score(self, obj):

        score = 0
        # Full name: 10 points
        if obj.full_name and obj.full_name.strip():
            score += 10
        # Bio: 15 points
        if obj.bio and obj.bio.strip():
            score += 15
        # Headline: 15 points
        if getattr(obj, 'headline', '') and obj.headline.strip():
            score += 15
        # Profile image: 15 points
        if obj.profile_image and obj.profile_image.strip():
            score += 15
        # At least one skill: 15 points
        if obj.skills.exists():
            score += 15
        # College or location: 10 points
        if (obj.college and obj.college.strip()) or (obj.location and obj.location.strip()):
            score += 10
        # At least one professional link: 10 points
        if (
            (obj.linkedin_url and obj.linkedin_url.strip())
            or (obj.github_url and obj.github_url.strip())
            or (obj.portfolio_url and obj.portfolio_url.strip())
        ):
            score += 10
        # At least one education, experience, or project entry: 10 points
        has_edu = bool(obj.education and len(obj.education) > 0)
        has_exp = bool(obj.experience and len(obj.experience) > 0)
        has_proj = bool(obj.projects and len(obj.projects) > 0)
        if has_edu or has_exp or has_proj:
            score += 10
        return max(0, min(100, score))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        request_user = getattr(request, 'user', None) if request else None

        is_owner = bool(request_user and request_user.is_authenticated and request_user.id == instance.id)
        
        # Only expose email to the user themselves
        if not is_owner:
            data.pop('email', None)

        # Check private profile restrictions
        if instance.is_private and not is_owner:
            is_follower = False
            if request_user and request_user.is_authenticated:
                followed_ids = self.context.get('followed_user_ids')
                if followed_ids is not None:
                    is_follower = instance.id in followed_ids
                else:
                    is_follower = Follower.objects.filter(follower=request_user, following=instance).exists()

            if not is_follower:
                # Private account locked: strip private details
                data['is_private_locked'] = True
                data.pop('education', None)
                data.pop('experience', None)
                data.pop('projects', None)
                data.pop('certifications', None)
                data.pop('collaboration_preferences', None)
                data.pop('resume_file', None)
                data.pop('linkedin_url', None)
                data.pop('github_url', None)
                data.pop('portfolio_url', None)

        return data
    
    def get_followers_count(self, obj):
        return obj.followers.count()
    
    def get_following_count(self, obj):
        return obj.following.count()

    def get_is_following(self, instance):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return False
        if request.user.id == instance.id:
            return False
        followed_ids = self.context.get('followed_user_ids')
        if followed_ids is not None:
            return instance.id in followed_ids
        return Follower.objects.filter(follower=request.user, following=instance).exists()

    def update(self, instance, validated_data):
        # Prevent non-admin users from self-awarding verification or reputation
        request = self.context.get('request')
        is_staff = bool(request and hasattr(request, 'user') and request.user.is_staff)
        if not is_staff:
            validated_data.pop('verification_level', None)
            validated_data.pop('reputation_score', None)

        skills = validated_data.pop('skills', None)
        instance = super().update(instance, validated_data)

        if skills is not None:
            # skills is a list of dicts: [{'skill_name': name, 'level': lvl}, ...]
            requested_names = [s['skill_name'] for s in skills]
            UserSkill.objects.filter(user=instance).exclude(skill_name__in=requested_names).delete()
            for item in skills:
                UserSkill.objects.update_or_create(
                    user=instance,
                    skill_name=item['skill_name'],
                    defaults={'level': item.get('level', 'intermediate')}
                )

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


class UserExperienceSerializer(serializers.ModelSerializer):
    """Serializer for builder work and venture experience."""
    verified_pow_code = serializers.SerializerMethodField()

    class Meta:
        model = UserExperience
        fields = [
            'id', 'company_name', 'role_title', 'location', 'is_remote',
            'start_date', 'end_date', 'is_current', 'description',
            'skills_used', 'verified_pow', 'verified_pow_code',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'verified_pow_code']

    def get_verified_pow_code(self, obj):
        if obj.verified_pow:
            return obj.verified_pow.verification_code
        return None


class UserEducationSerializer(serializers.ModelSerializer):
    """Serializer for academic credentials and campus verification."""
    class Meta:
        model = UserEducation
        fields = [
            'id', 'institution', 'degree', 'field_of_study',
            'start_year', 'end_year', 'is_campus_verified', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PinnedProofSerializer(serializers.Serializer):
    """Serializer for pinned Proof of Work cards on builder profiles."""
    id = serializers.UUIDField()
    verification_code = serializers.CharField()
    summary = serializers.CharField()
    content_hash = serializers.CharField()
    minted_at = serializers.DateTimeField()
    workspace_id = serializers.UUIDField(source='workspace.id')
    project_title = serializers.CharField(source='workspace.post.title')
    project_caption = serializers.CharField(source='workspace.post.caption', required=False, allow_blank=True)
    contributors = serializers.SerializerMethodField()
    deliverables_count = serializers.SerializerMethodField()
    tasks_count = serializers.SerializerMethodField()

    def get_contributors(self, obj):
        return obj.metadata_snapshot.get('contributors', [])

    def get_deliverables_count(self, obj):
        return obj.metadata_snapshot.get('deliverables_count', 0)

    def get_tasks_count(self, obj):
        return obj.metadata_snapshot.get('tasks_count', 0)


class DossierPeerReviewSerializer(serializers.Serializer):
    """Serializer for verified teammate testimonials on the builder dossier."""
    id = serializers.UUIDField()
    reviewer_id = serializers.UUIDField(source='reviewer.id')
    reviewer_name = serializers.CharField(source='reviewer.full_name')
    reviewer_username = serializers.CharField(source='reviewer.username')
    reviewer_avatar = serializers.URLField(source='reviewer.profile_image', allow_blank=True, required=False)
    reviewer_tier = serializers.SerializerMethodField()
    project_title = serializers.CharField(source='proof.workspace.post.title')
    proof_code = serializers.CharField(source='proof.verification_code')
    execution_score = serializers.IntegerField()
    collaboration_score = serializers.IntegerField()
    reliability_score = serializers.IntegerField()
    average_score = serializers.SerializerMethodField()
    feedback = serializers.CharField()
    created_at = serializers.DateTimeField()

    def get_reviewer_tier(self, obj):
        from apps.collaboration.reputation_service import get_builder_level
        return get_builder_level(obj.reviewer.reputation_score)['title']

    def get_average_score(self, obj):
        return round((obj.execution_score + obj.collaboration_score + obj.reliability_score) / 3.0, 1)


class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = [
            'id', 'device_name', 'device_type', 'browser', 'os',
            'ip_address', 'location_city', 'last_active', 'created_at',
            'is_current', 'revoked'
        ]
        read_only_fields = fields


class BlockedUserSerializer(serializers.ModelSerializer):
    blocked_user_id = serializers.UUIDField(source='blocked_user.id', read_only=True)
    blocked_username = serializers.CharField(source='blocked_user.username', read_only=True)
    blocked_full_name = serializers.CharField(source='blocked_user.full_name', read_only=True)
    blocked_avatar = serializers.URLField(source='blocked_user.profile_image', read_only=True)

    class Meta:
        model = BlockedUser
        fields = [
            'id', 'blocked_user_id', 'blocked_username', 'blocked_full_name',
            'blocked_avatar', 'reason', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

