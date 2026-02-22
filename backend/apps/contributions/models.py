"""
User Contributions/Portfolio Models
"""
from django.db import models
from django.conf import settings
import uuid


class Contribution(models.Model):
    """User portfolio items"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contributions')
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=100)
    file_url = models.URLField(max_length=500, blank=True)
    thumbnail_url = models.URLField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'contributions'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
