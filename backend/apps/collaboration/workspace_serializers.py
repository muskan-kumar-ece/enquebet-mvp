"""
Serializers for Workspace, Team Governance, Kanban Tasks, Deliverables, and Proof of Work.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Workspace, TeamMembership, ProjectMilestone, ProjectTask,
    TaskDeliverable, TaskReview, ProofOfWork, PeerReview, ProjectActivity
)
from apps.posts.models import Post

User = get_user_model()


class WorkspaceUserSummarySerializer(serializers.ModelSerializer):
    """Focused user summary for workspace execution and team lists."""
    avatar_url = serializers.URLField(source='profile_image', required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'profile_image', 'avatar_url',
            'headline', 'reputation_score'
        ]
        read_only_fields = ['id', 'username', 'full_name', 'profile_image', 'avatar_url', 'headline', 'reputation_score']



class WorkspacePostSerializer(serializers.ModelSerializer):
    """
    Project metadata serializer specifically for workspace execution.
    Excludes public social feed discovery metrics (likes, comments, saved status, distance)
    which belong strictly to public feed discovery (/posts/).
    """
    user = WorkspaceUserSummarySerializer(read_only=True)

    class Meta:
        model = Post
        fields = [
            'id', 'user', 'title', 'description', 'category', 'view_type',
            'location', 'college', 'city', 'latitude', 'longitude', 'is_remote',
            'created_at',
        ]
        read_only_fields = fields


class TeamMembershipSerializer(serializers.ModelSerializer):
    user = WorkspaceUserSummarySerializer(read_only=True)

    
    class Meta:
        model = TeamMembership
        fields = [
            'id', 'user', 'role', 'role_title', 'status',
            'joined_at', 'left_at', 'removal_reason'
        ]
        read_only_fields = ['id', 'joined_at', 'left_at', 'removal_reason']


class ProjectActivitySerializer(serializers.ModelSerializer):
    actor = WorkspaceUserSummarySerializer(read_only=True)

    class Meta:
        model = ProjectActivity
        fields = ['id', 'actor', 'event_type', 'description', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = [
            'id', 'workspace', 'title', 'description', 'order',
            'due_date', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskReviewSerializer(serializers.ModelSerializer):
    reviewer = WorkspaceUserSummarySerializer(read_only=True)

    class Meta:
        model = TaskReview
        fields = ['id', 'deliverable', 'reviewer', 'verdict', 'feedback', 'created_at']
        read_only_fields = ['id', 'created_at']


class TaskDeliverableSerializer(serializers.ModelSerializer):
    submitted_by = WorkspaceUserSummarySerializer(read_only=True)
    reviews = TaskReviewSerializer(many=True, read_only=True)

    class Meta:
        model = TaskDeliverable
        fields = [
            'id', 'task', 'submitted_by', 'title', 'description',
            'pr_url', 'file_url', 'file_type', 'version', 'reviews', 'created_at'
        ]
        read_only_fields = ['id', 'version', 'created_at']


class ProjectTaskSerializer(serializers.ModelSerializer):
    creator = WorkspaceUserSummarySerializer(read_only=True)
    assignee = WorkspaceUserSummarySerializer(read_only=True)
    reviewer = WorkspaceUserSummarySerializer(read_only=True)
    assignee_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    reviewer_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    milestone_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    deliverables = TaskDeliverableSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectTask
        fields = [
            'id', 'workspace', 'milestone', 'milestone_id', 'title', 'description',
            'creator', 'assignee', 'assignee_id', 'reviewer', 'reviewer_id',
            'status', 'priority', 'due_date', 'completed_at',
            'deliverables', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'workspace', 'creator', 'completed_at', 'created_at', 'updated_at']

    def validate(self, attrs):
        assignee_id = attrs.get('assignee_id')
        workspace = self.context.get('workspace')
        if assignee_id and workspace:
            if not TeamMembership.objects.filter(workspace=workspace, user_id=assignee_id, status='active').exists():
                raise serializers.ValidationError({'assignee_id': 'Assignee must be an active member of this workspace.'})
        return attrs


class WorkspaceDetailSerializer(serializers.ModelSerializer):
    post = WorkspacePostSerializer(read_only=True)
    active_members_count = serializers.SerializerMethodField()
    tasks_count = serializers.SerializerMethodField()
    completed_tasks_count = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'post', 'status', 'progress_percentage', 'max_members',
            'repo_url', 'demo_url', 'documentation_url',
            'active_members_count', 'tasks_count', 'completed_tasks_count',
            'current_user_role', 'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'post', 'progress_percentage', 'completed_at', 'created_at', 'updated_at']

    def get_active_members_count(self, obj):
        if hasattr(obj, 'annotated_active_members') and obj.annotated_active_members is not None:
            return obj.annotated_active_members
        if hasattr(obj, '_prefetched_objects_cache') and 'memberships' in obj._prefetched_objects_cache:
            return sum(1 for m in obj.memberships.all() if m.status == 'active')
        return obj.memberships.filter(status='active').count()

    def get_tasks_count(self, obj):
        if hasattr(obj, 'annotated_tasks_count') and obj.annotated_tasks_count is not None:
            return obj.annotated_tasks_count
        return obj.tasks.exclude(status='cancelled').count()

    def get_completed_tasks_count(self, obj):
        if hasattr(obj, 'annotated_completed_tasks') and obj.annotated_completed_tasks is not None:
            return obj.annotated_completed_tasks
        return obj.tasks.filter(status='completed').count()

    def get_current_user_role(self, obj):
        request = self.context.get('request')
        if not (request and request.user.is_authenticated):
            return None
        if obj.post.user_id == request.user.id:
            return 'owner'
        if hasattr(obj, '_prefetched_objects_cache') and 'memberships' in obj._prefetched_objects_cache:
            for m in obj.memberships.all():
                if m.user_id == request.user.id and m.status == 'active':
                    return m.role
            return None
        membership = obj.memberships.filter(user=request.user, status='active').first()
        return membership.role if membership else None


class PeerReviewSerializer(serializers.ModelSerializer):
    reviewer = WorkspaceUserSummarySerializer(read_only=True)
    reviewee = WorkspaceUserSummarySerializer(read_only=True)


    class Meta:
        model = PeerReview
        fields = [
            'id', 'proof', 'reviewer', 'reviewee',
            'execution_score', 'collaboration_score', 'reliability_score',
            'feedback', 'created_at'
        ]
        read_only_fields = ['id', 'proof', 'reviewer', 'created_at']

    def validate(self, attrs):
        for score_field in ['execution_score', 'collaboration_score', 'reliability_score']:
            val = attrs.get(score_field, 5)
            if not (1 <= val <= 5):
                raise serializers.ValidationError({score_field: 'Score must be between 1 and 5.'})
        return attrs


class ProofOfWorkSerializer(serializers.ModelSerializer):
    peer_reviews = PeerReviewSerializer(many=True, read_only=True)

    class Meta:
        model = ProofOfWork
        fields = [
            'id', 'workspace', 'verification_code', 'summary',
            'metadata_snapshot', 'content_hash', 'is_verified',
            'peer_reviews', 'minted_at'
        ]
        read_only_fields = ['id', 'verification_code', 'content_hash', 'minted_at']
