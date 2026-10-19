"""
Engineering Resources Models for ENQUEbet
Powering curated technical books, Word/PDF documents, cheat sheets,
system design specs, and community-submitted learning assets with Admin Approval.
"""
import uuid
import re
from django.db import models
from django.conf import settings
from django.utils.text import slugify


class ResourceCategory(models.TextChoices):
    BOOKS_TEXTBOOKS = 'BOOKS_TEXTBOOKS', 'Books & Textbooks'
    SYSTEM_DESIGN_SPECS = 'SYSTEM_DESIGN_SPECS', 'System Design & Architecture'
    WHITEPAPERS = 'WHITEPAPERS', 'Technical Reports & Whitepapers'
    SLIDES_LECTURES = 'SLIDES_LECTURES', 'Slides & Lecture Notes'
    STARTERS_CODE = 'STARTERS_CODE', 'Starter Kits & Templates'
    CHEATSHEETS = 'CHEATSHEETS', 'Cheat Sheets & Quick Guides'
    DATASETS = 'DATASETS', 'Datasets & Benchmarks'
    OTHER = 'OTHER', 'Other Engineering Assets'


class ResourceFileType(models.TextChoices):
    PDF = 'PDF', 'PDF Document'
    DOCX = 'DOCX', 'Word Document (.docx)'
    TXT = 'TXT', 'Plain Text'
    MARKDOWN = 'MARKDOWN', 'Markdown'
    EPUB = 'EPUB', 'EPUB E-Book'
    PPTX = 'PPTX', 'Presentation Slides (.pptx)'
    ZIP = 'ZIP', 'Code Archive (.zip)'
    LINK = 'LINK', 'External Link'


class ApprovalStatus(models.TextChoices):
    PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Admin Approval'
    APPROVED = 'APPROVED', 'Approved & Public'
    REJECTED = 'REJECTED', 'Rejected'


class Resource(models.Model):
    """Community-uploaded engineering assets with mandatory admin approval"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_resources'
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=300, unique=True, blank=True)
    description = models.TextField()
    category = models.CharField(
        max_length=32,
        choices=ResourceCategory.choices,
        default=ResourceCategory.SYSTEM_DESIGN_SPECS,
        db_index=True
    )
    file_type = models.CharField(
        max_length=16,
        choices=ResourceFileType.choices,
        default=ResourceFileType.PDF,
        db_index=True
    )

    # File or external link
    file_url = models.URLField(max_length=800, blank=True, default='')
    file_size_bytes = models.BigIntegerField(null=True, blank=True)
    original_filename = models.CharField(max_length=255, blank=True, default='')
    external_link = models.URLField(max_length=800, blank=True, default='')

    # Metadata & Tags
    tags = models.JSONField(default=list, blank=True)
    downloads_count = models.PositiveIntegerField(default=0)
    views_count = models.PositiveIntegerField(default=0)

    # Moderation & Approval State Machine
    status = models.CharField(
        max_length=24,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING_APPROVAL,
        db_index=True
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_resources'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'resources'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['uploader', '-created_at']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_file_type_display()}) - {self.status}"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:240]
            if not base_slug:
                base_slug = f"resource-{uuid.uuid4().hex[:8]}"
            slug = base_slug
            counter = 1
            while Resource.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
