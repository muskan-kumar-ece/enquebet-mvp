"""
Models for Platform Updates & Technical Dispatches
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify


class UpdateCategory(models.TextChoices):
    PRODUCT_RELEASE = 'PRODUCT_RELEASE', 'Product Release'
    ENGINEERING_DISPATCH = 'ENGINEERING_DISPATCH', 'Engineering & Hardware'
    PROTOCOL_NETWORK = 'PROTOCOL_NETWORK', 'Protocol & Network'
    COMMUNITY_NEWS = 'COMMUNITY_NEWS', 'Community & Milestones'
    SECURITY_MAINTENANCE = 'SECURITY_MAINTENANCE', 'Security & Maintenance'
    GENERAL_ANNOUNCEMENT = 'GENERAL_ANNOUNCEMENT', 'Announcement'


class PlatformUpdate(models.Model):
    """
    Official platform updates, changelog items, and technical announcements
    published by administrators.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    category = models.CharField(
        max_length=40,
        choices=UpdateCategory.choices,
        default=UpdateCategory.PRODUCT_RELEASE,
        db_index=True
    )
    summary = models.TextField(
        help_text="Short 1-3 sentence digest for scannable timeline feed"
    )
    content = models.TextField(
        help_text="Detailed markdown formatted content"
    )
    cover_image = models.URLField(max_length=1000, blank=True, default='')
    media_urls = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of supplementary image URLs"
    )
    documents = models.JSONField(
        default=list,
        blank=True,
        help_text="List of attached documents: [{ name, url, file_format, file_size_bytes }]"
    )
    external_links = models.JSONField(
        default=list,
        blank=True,
        help_text="List of external resources: [{ title, url }]"
    )
    is_pinned = models.BooleanField(default=False, db_index=True)
    is_published = models.BooleanField(default=True, db_index=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='platform_updates'
    )
    published_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_updates'
        ordering = ['-is_pinned', '-published_at']

    def __str__(self):
        return f"[{self.category}] {self.title}"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:240] or 'update'
            candidate_slug = base_slug
            counter = 1
            while PlatformUpdate.objects.filter(slug=candidate_slug).exclude(pk=self.pk).exists():
                candidate_slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = candidate_slug
        super().save(*args, **kwargs)
