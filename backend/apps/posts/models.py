"""
Post Models for ENQUEbet Feed System
"""
from django.db import models
from django.conf import settings
import uuid


class Post(models.Model):
    """Main post/idea model"""
    VIEW_TYPE_CHOICES = [
        ('public', 'Public'),
        ('college', 'College'),
        ('openidea', 'Open Idea'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=100)
    view_type = models.CharField(max_length=20, choices=VIEW_TYPE_CHOICES, default='public')
    location = models.CharField(max_length=255, blank=True)
    college = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'posts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['view_type', '-created_at']),
            models.Index(fields=['location', '-created_at']),
            models.Index(fields=['college', '-created_at']),
        ]
    
    def __str__(self):
        return self.title


class PostAttachment(models.Model):
    """Post attachments (images, files)"""
    ATTACHMENT_TYPES = [
        ('image', 'Image'),
        ('pdf', 'PDF'),
        ('doc', 'Document'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='attachments')
    file_url = models.URLField(max_length=500)
    file_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'post_attachments'


class PostRequirement(models.Model):
    """Required roles for collaboration"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='requirements')
    role_name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'post_requirements'


class PostTag(models.Model):
    """Post hashtags"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='tags')
    tag_name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'post_tags'


class PostCollaborator(models.Model):
    """Accepted team members"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='collaborators')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'post_collaborators'
        unique_together = ['post', 'user']


class Like(models.Model):
    """Post likes"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'likes'
        unique_together = ['post', 'user']
        indexes = [
            models.Index(fields=['post']),
        ]


class Comment(models.Model):
    """Post comments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'comments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['post']),
        ]


class SavedPost(models.Model):
    """Saved/bookmarked posts"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='saved_posts')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_posts')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'saved_posts'
        unique_together = ['post', 'user']


class PostReport(models.Model):
    """Reports submitted by users for posts."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reports')
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_reports')
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reports'
        unique_together = ['post', 'reporter']
        indexes = [
            models.Index(fields=['post']),
            models.Index(fields=['reporter']),
        ]
