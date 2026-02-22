"""
Research/Academic Papers Models
"""
from django.db import models
from django.conf import settings
import uuid


class Research(models.Model):
    """Research papers and academic content"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='research_papers')
    title = models.CharField(max_length=255)
    description = models.TextField()
    file_url = models.URLField(max_length=500)
    category = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'research'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
