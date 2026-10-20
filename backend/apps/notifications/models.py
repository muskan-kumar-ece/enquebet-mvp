"""
Notification System Models (10/10 Architecture)
Patterned after Instagram, LinkedIn, and Linear:
- Concurrency-safe deterministic grouping via unique_active_unread_group partial constraint
- Distinct human actor accounting via NotificationActor
- Normalized thread/target muting via NotificationMute
- Durable transactional outbox via NotificationOutbox
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Notification(models.Model):
    """All platform notifications with grouping, priority, and canonical navigation"""
    
    PRIORITY_CHOICES = [
        ('action', 'Action Required'),       # Distinct individual item with CTA (collab, review)
        ('personal', 'Personally Relevant'), # Direct interaction (follow, direct message, mention)
        ('social', 'Social Activity'),       # Grouped, batched (likes, comments)
    ]

    NOTIFICATION_TYPES = [
        ('like', 'Like'),
        ('comment', 'Comment'),
        ('follow', 'Follow'),
        ('collaboration_request', 'Collaboration Request'),
        ('collaboration_accepted', 'Collaboration Accepted'),
        ('collaboration_declined', 'Collaboration Declined'),
        ('team_invitation', 'Team Invitation'),
        ('team_removed', 'Team Member Removed'),
        ('task_assigned', 'Task Assigned'),
        ('deliverable_review', 'Deliverable Review'),
        ('deliverable_approved', 'Deliverable Approved'),
        ('deliverable_changes_requested', 'Changes Requested'),
        ('project_completed', 'Project Completed'),
        ('mention', 'Mention'),
        ('message', 'Message'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    reference_id = models.UUIDField(null=True, blank=True)  # Backward compatibility reference
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # --- 10/10 Hardened Notification Engine Fields ---
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='personal', db_index=True)
    group_key = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    actor_count = models.PositiveIntegerField(default=1)  # Strict distinct actor count
    event_count = models.PositiveIntegerField(default=1)  # Total event occurrences
    target_type = models.CharField(max_length=50, blank=True, default='')   # 'post', 'comment', 'workspace', 'task', 'user', 'conversation'
    target_id = models.CharField(max_length=255, blank=True, default='')     # UUID or ID of target object
    data = models.JSONField(default=dict, blank=True)                        # Contextual metadata (post snippet, role, pitch preview)
    seen_at = models.DateTimeField(null=True, blank=True, db_index=True)     # When rendered in client viewport
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)     # When explicitly clicked/acknowledged
    updated_at = models.DateTimeField(auto_now=True, db_index=True)          # Last activity timestamp (used for cursor pagination)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)  # Optional TTL for ephemeral events
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-updated_at', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-updated_at', 'id'], name='idx_notif_user_read_updated'),
            models.Index(fields=['user', 'priority', '-updated_at'], name='idx_notif_user_prio_updated'),
            models.Index(fields=['user', 'group_key'], name='idx_notif_user_group'),
            models.Index(fields=['user', '-created_at'], name='idx_notif_user_created'),
            models.Index(fields=['user', 'target_type', 'target_id'], name='idx_notif_user_target'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'group_key'],
                condition=models.Q(is_read=False, group_key__isnull=False),
                name='unique_active_unread_group',
            )
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.type} ({self.priority}) [actors={self.actor_count}]"

    def mark_read(self, commit=True):
        if not self.is_read:
            now = timezone.now()
            self.is_read = True
            self.read_at = now
            if not self.seen_at:
                self.seen_at = now
            if commit:
                self.save(update_fields=['is_read', 'read_at', 'seen_at', 'updated_at'])

    def mark_seen(self, commit=True):
        if not self.seen_at:
            self.seen_at = timezone.now()
            if commit:
                self.save(update_fields=['seen_at', 'updated_at'])


class NotificationActor(models.Model):
    """
    Distinct human actors in a grouped notification.
    Prevents actor count inflation from toggling like/unlike.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='actors')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='acted_notifications')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notification_actors'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['notification', '-created_at'], name='idx_notifact_notif_created'),
        ]
        constraints = [
            models.UniqueConstraint(fields=['notification', 'actor'], name='unique_notification_actor')
        ]

    def __str__(self):
        return f"Actor {self.actor.username} on Notification {self.notification_id}"


class NotificationMute(models.Model):
    """
    Normalized per-user thread and entity muting.
    Replaces unindexed JSON arrays.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_mutes')
    target_type = models.CharField(max_length=50)  # 'post', 'conversation', 'workspace'
    target_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notification_mutes'
        indexes = [
            models.Index(fields=['user', 'target_type', 'target_id'], name='idx_mute_user_target'),
        ]
        constraints = [
            models.UniqueConstraint(fields=['user', 'target_type', 'target_id'], name='unique_user_target_mute')
        ]

    def __str__(self):
        return f"{self.user.username} muted {self.target_type}:{self.target_id}"


class NotificationOutbox(models.Model):
    """
    Durable transactional outbox for reliable real-time and external notifications.
    Committed in the same database transaction as business operations.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='outbox_entries', null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='outbox_notifications')
    channel = models.CharField(max_length=30, default='websocket')  # 'websocket', 'push', 'email'
    event_type = models.CharField(max_length=50, default='notification')  # 'notification', 'notification_updated', 'unread_count_updated', 'all_read'
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True, default='')
    next_retry_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notification_outbox'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['status', 'next_retry_at'], name='idx_outbox_status_retry'),
            models.Index(fields=['user', 'status'], name='idx_outbox_user_status'),
        ]

    def __str__(self):
        return f"Outbox {self.id} ({self.channel}:{self.status}) for {self.user.username}"
