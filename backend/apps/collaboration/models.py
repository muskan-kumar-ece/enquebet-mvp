"""
Collaboration, Workspace, Team Governance, Task Execution & Proof of Work Models
"""
import uuid
from django.db import models
from django.conf import settings


class CollaborationRequest(models.Model):
    """Build With collaboration requests"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey('posts.Post', on_delete=models.CASCADE, related_name='collaboration_requests')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_requests')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    role = models.CharField(max_length=100, blank=True, default='')
    pitch = models.TextField(blank=True, default='')
    weekly_commitment = models.CharField(
        max_length=50,
        blank=True,
        default='',
        choices=[
            ('under_5_hours', '< 5 hours/week'),
            ('5_10_hours', '5-10 hours/week'),
            ('10_20_hours', '10-20 hours/week'),
            ('full_time', '20+ hours / Full-time'),
        ]
    )
    portfolio_url = models.URLField(max_length=500, blank=True, default='')
    client_request_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'collaboration_requests'
        unique_together = ['post', 'sender']
        indexes = [
            models.Index(fields=['post', 'sender']),
            models.Index(fields=['sender', 'client_request_id']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"


class Workspace(models.Model):
    """
    Project Workspace: Dedicated execution and collaboration space for an accepted project.
    Bound 1:1 to Post (the project publication unit).
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completion_pending', 'Completion Pending'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.OneToOneField('posts.Post', on_delete=models.CASCADE, related_name='workspace')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='active')
    progress_percentage = models.IntegerField(default=0)
    max_members = models.IntegerField(default=10)
    repo_url = models.URLField(max_length=500, blank=True, default='')
    demo_url = models.URLField(max_length=500, blank=True, default='')
    documentation_url = models.URLField(max_length=500, blank=True, default='')
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workspaces'
        ordering = ['-created_at']

    def __str__(self):
        return f"Workspace: {self.post.title} ({self.status})"

    def recalculate_progress(self):
        """Calculates completed / total active task ratio, clamping between 0 and 100."""
        active_tasks = self.tasks.exclude(status='cancelled')
        total = active_tasks.count()
        if total == 0:
            self.progress_percentage = 0
        else:
            completed = active_tasks.filter(status='completed').count()
            self.progress_percentage = max(0, min(100, int((completed / total) * 100)))
        self.save(update_fields=['progress_percentage', 'updated_at'])
        return self.progress_percentage


class TeamMembership(models.Model):
    """
    Team Membership with full governance, role tracking, and departure audit history.
    """
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('lead', 'Team Lead'),
        ('contributor', 'Contributor'),
        ('viewer', 'Viewer'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('left', 'Left Voluntarily'),
        ('removed', 'Removed'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='team_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='contributor')
    role_title = models.CharField(max_length=100, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    removal_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'team_memberships'
        constraints = [
            models.UniqueConstraint(fields=['workspace', 'user'], name='unique_workspace_user_membership'),
        ]
        indexes = [
            models.Index(fields=['workspace', 'status']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"{self.user.username} ({self.role}) in {self.workspace.post.title}"


class ProjectMilestone(models.Model):
    """Project roadmap milestones with deadline tracking."""
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='milestones')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    order = models.IntegerField(default=1)
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'project_milestones'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.title} ({self.workspace.post.title})"


class ProjectTask(models.Model):
    """
    Project Task unit with Kanban states, assignees, priorities, and reviewer tracking.
    """
    STATUS_CHOICES = [
        ('backlog', 'Backlog'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('in_review', 'In Review'),
        ('changes_requested', 'Changes Requested'),
        ('completed', 'Completed'),
        ('blocked', 'Blocked'),
        ('cancelled', 'Cancelled'),
    ]
    PRIORITY_CHOICES = [
        ('urgent', 'Urgent'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='tasks')
    milestone = models.ForeignKey(ProjectMilestone, null=True, blank=True, on_delete=models.SET_NULL, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_tasks')
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_tasks')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_tasks')
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='backlog')
    priority = models.CharField(max_length=15, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'project_tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['workspace', 'status']),
            models.Index(fields=['assignee', 'status']),
        ]

    def __str__(self):
        return f"{self.title} [{self.status}]"


class TaskDeliverable(models.Model):
    """Deliverable submissions (Pull Requests, designs, attachments) for task review."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(ProjectTask, on_delete=models.CASCADE, related_name='deliverables')
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submitted_deliverables')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    pr_url = models.URLField(max_length=500, blank=True, default='')
    file_url = models.URLField(max_length=500, blank=True, default='')
    file_type = models.CharField(max_length=50, blank=True, default='')
    version = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_deliverables'
        ordering = ['-version', '-created_at']

    def __str__(self):
        return f"Deliverable v{self.version} for {self.task.title}"


class TaskReview(models.Model):
    """Peer / Lead reviews on task deliverables."""
    VERDICT_CHOICES = [
        ('approved', 'Approved'),
        ('changes_requested', 'Changes Requested'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deliverable = models.ForeignKey(TaskDeliverable, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='task_reviews')
    verdict = models.CharField(max_length=25, choices=VERDICT_CHOICES)
    feedback = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_reviews'
        ordering = ['-created_at']

    def __str__(self):
        return f"Review ({self.verdict}) by {self.reviewer.username}"


class ProofOfWork(models.Model):
    """
    Immutable Proof of Work credential minted upon verified project completion.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.OneToOneField(Workspace, on_delete=models.PROTECT, related_name='proof_of_work')
    verification_code = models.CharField(max_length=50, unique=True)
    summary = models.TextField()
    metadata_snapshot = models.JSONField(default=dict, blank=True)
    content_hash = models.CharField(max_length=64)  # SHA-256
    is_verified = models.BooleanField(default=True)
    minted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'proof_of_works'
        ordering = ['-minted_at']

    def __str__(self):
        return f"ProofOfWork: {self.verification_code} ({self.workspace.post.title})"

    @property
    def is_tamper_free(self) -> bool:
        """Dynamically recompute canonical SHA-256 hash and verify snapshot integrity."""
        import hashlib
        import json
        computed = hashlib.sha256(
            json.dumps(self.metadata_snapshot, sort_keys=True, default=str).encode()
        ).hexdigest()
        return computed == self.content_hash



class PeerReview(models.Model):
    """Post-completion reciprocal peer evaluation for builder reputation."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proof = models.ForeignKey(ProofOfWork, on_delete=models.CASCADE, related_name='peer_reviews')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='given_peer_reviews')
    reviewee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_peer_reviews')
    execution_score = models.IntegerField(default=5)  # 1 to 5
    collaboration_score = models.IntegerField(default=5)  # 1 to 5
    reliability_score = models.IntegerField(default=5)  # 1 to 5
    feedback = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'peer_reviews'
        unique_together = ['proof', 'reviewer', 'reviewee']
        ordering = ['-created_at']

    def __str__(self):
        return f"PeerReview: {self.reviewer.username} -> {self.reviewee.username}"


class ProjectActivity(models.Model):
    """
    Append-only audit trail for all workspace, team, task, and completion events.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='activities')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='project_activities')
    event_type = models.CharField(max_length=50)
    description = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'project_activities'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.event_type}] {self.description}"

    @classmethod
    def log(cls, workspace, event_type, description, actor=None, metadata=None):
        """Helper to create an immutable activity event."""
        return cls.objects.create(
            workspace=workspace,
            event_type=event_type,
            description=description,
            actor=actor,
            metadata=metadata or {},
        )


class ReputationEvent(models.Model):
    """
    Immutable, explainable audit record for builder reputation changes.
    Generated strictly by verified server-side actions:
    - deliverable_approved
    - task_completed
    - project_completed
    - peer_review_received
    """
    EVENT_TYPE_CHOICES = [
        ('deliverable_approved', 'Deliverable Approved'),
        ('task_completed', 'Task Completed'),
        ('project_completed', 'Project Completed (Proof of Work)'),
        ('peer_review_received', 'Peer Review Received'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reputation_events'
    )
    event_type = models.CharField(max_length=40, choices=EVENT_TYPE_CHOICES)
    points = models.IntegerField()
    description = models.CharField(max_length=255)
    idempotency_key = models.CharField(max_length=120, unique=True)

    workspace = models.ForeignKey(
        Workspace,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reputation_events'
    )
    task = models.ForeignKey(
        ProjectTask,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reputation_events'
    )
    deliverable = models.ForeignKey(
        TaskDeliverable,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reputation_events'
    )
    proof = models.ForeignKey(
        ProofOfWork,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reputation_events'
    )
    peer_review = models.ForeignKey(
        PeerReview,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reputation_events'
    )

    metadata = models.JSONField(default=dict, blank=True)
    is_revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reputation_events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_revoked']),
            models.Index(fields=['event_type']),
            models.Index(fields=['idempotency_key']),
        ]

    def __str__(self):
        return f"{self.user.username} [{self.event_type}]: {self.points:+d} pts ({self.description})"

