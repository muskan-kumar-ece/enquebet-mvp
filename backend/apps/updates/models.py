"""
Models for ENQUEbet Pulse — Technical Intelligence, Lifecycle & Opportunity Platform
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify


class UpdateCategory(models.TextChoices):
    # Core 9 Pulse Domains
    AI_ML = 'AI_ML', 'AI & Machine Learning'
    SOFTWARE = 'SOFTWARE', 'Software Development'
    ELECTRONICS = 'ELECTRONICS', 'Electronics & Hardware'
    CLOUD_DEVOPS = 'CLOUD_DEVOPS', 'Cloud & Infrastructure'
    CYBERSECURITY = 'CYBERSECURITY', 'Cybersecurity'
    RESEARCH_SCIENCE = 'RESEARCH_SCIENCE', 'Research & Science'
    STARTUPS = 'STARTUPS', 'Startups & Industry'
    CAREERS = 'CAREERS', 'Careers & Opportunities'
    LIFECYCLE = 'LIFECYCLE', 'Technology Lifecycle'

    # Preserved Legacy Choices (Backward Compatibility)
    PRODUCT_RELEASE = 'PRODUCT_RELEASE', 'Product Release'
    ENGINEERING_DISPATCH = 'ENGINEERING_DISPATCH', 'Engineering & Hardware'
    PROTOCOL_NETWORK = 'PROTOCOL_NETWORK', 'Protocol & Network'
    COMMUNITY_NEWS = 'COMMUNITY_NEWS', 'Community & Milestones'
    SECURITY_MAINTENANCE = 'SECURITY_MAINTENANCE', 'Security & Maintenance'
    GENERAL_ANNOUNCEMENT = 'GENERAL_ANNOUNCEMENT', 'Announcement'


class EditorialStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    IN_REVIEW = 'IN_REVIEW', 'In Review'
    APPROVED = 'APPROVED', 'Approved'
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    PUBLISHED = 'PUBLISHED', 'Published'
    ARCHIVED = 'ARCHIVED', 'Archived'
    RETRACTED = 'RETRACTED', 'Retracted'


class UpdateType(models.TextChoices):
    DAILY_BRIEF = 'DAILY_BRIEF', 'Daily Briefing'
    RELEASE = 'RELEASE', 'Software / Tool Release'
    DEPRECATION = 'DEPRECATION', 'Deprecation Notice'
    SECURITY_ADVISORY = 'SECURITY_ADVISORY', 'Security Advisory'
    RESEARCH_PAPER = 'RESEARCH_PAPER', 'Research Breakthrough'
    OPPORTUNITY = 'OPPORTUNITY', 'Career / Competition'
    HARDWARE_ANNOUNCEMENT = 'HARDWARE_ANNOUNCEMENT', 'Hardware & Semiconductor'
    GENERAL = 'GENERAL', 'General Intelligence'


class ImportanceLevel(models.TextChoices):
    CRITICAL = 'CRITICAL', 'Critical Impact'
    HIGH = 'HIGH', 'High'
    MEDIUM = 'MEDIUM', 'Medium'
    ROUTINE = 'ROUTINE', 'Routine'


class PlatformUpdate(models.Model):
    """
    Canonical unit of intelligence for ENQUEbet Pulse.
    Implements 3-level progressive disclosure (Brief, Technical Context, Primary Sources),
    action hooks ('Learn This Next', 'Build This Idea'), and distinct date tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    category = models.CharField(
        max_length=40,
        choices=UpdateCategory.choices,
        default=UpdateCategory.SOFTWARE,
        db_index=True
    )
    update_type = models.CharField(
        max_length=40,
        choices=UpdateType.choices,
        default=UpdateType.DAILY_BRIEF,
        db_index=True
    )
    editorial_status = models.CharField(
        max_length=20,
        choices=EditorialStatus.choices,
        default=EditorialStatus.PUBLISHED,
        db_index=True
    )
    importance = models.CharField(
        max_length=20,
        choices=ImportanceLevel.choices,
        default=ImportanceLevel.MEDIUM,
        db_index=True
    )

    # Level 1: 30-Second Quick Brief
    summary = models.TextField(
        help_text="Level 1: Short 1-3 sentence digest: What happened?"
    )
    why_it_matters = models.TextField(
        blank=True,
        default='',
        help_text="Level 1: Practical significance: Why should builders care?"
    )
    who_should_care = models.TextField(
        blank=True,
        default='',
        help_text="Level 1: Target developer and engineering profiles affected"
    )

    # Level 2: Technical Deep Dive
    content = models.TextField(
        help_text="Level 2: Detailed markdown formatted technical deep dive, code snippets, architecture"
    )

    # Level 3: Action & Learning Hooks (Connected to ENQUEbet Ecosystem)
    what_to_do_next = models.TextField(
        blank=True,
        default='',
        help_text="Actionable next step recommendation"
    )
    learn_this_next = models.JSONField(
        default=list,
        blank=True,
        help_text="[{ title, url, provider, level, enquebet_resource_id }]"
    )
    build_this_idea = models.JSONField(
        default=dict,
        blank=True,
        help_text="{ title, description, difficulty, estimated_hours, stack, project_starter_prompt }"
    )

    # Dedicated Sub-Track Metadata
    opportunity_meta = models.JSONField(
        default=dict,
        blank=True,
        help_text="{ deadline, eligibility, stipend, location_type, application_url, opportunity_type }"
    )
    lifecycle_meta = models.JSONField(
        default=dict,
        blank=True,
        help_text="{ status: supported|deprecated|end_of_life|migration_recommended, affected_version, recommended_version, migration_url }"
    )

    # Presentation & Discoverability
    is_top_story = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Featured as the primary Lead Story in Today's Briefing"
    )
    is_pinned = models.BooleanField(default=False, db_index=True)
    is_published = models.BooleanField(default=True, db_index=True)
    reading_time_minutes = models.PositiveSmallIntegerField(default=3)
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="List of string tags e.g. ['python', 'pytorch', 'risc-v']"
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

    # Sources & Verification (Level 3)
    primary_source_name = models.CharField(max_length=150, blank=True, default='')
    primary_source_url = models.URLField(max_length=1000, blank=True, default='')
    sources = models.JSONField(
        default=list,
        blank=True,
        help_text="[{ name, url, source_type, is_official }]"
    )

    # Distinct Dates (Distinguishing Event, Original Source, ENQUEbet Publish, and Verification)
    event_date = models.DateField(
        null=True,
        blank=True,
        help_text="When the development took place"
    )
    source_published_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the original source published it"
    )
    published_at = models.DateTimeField(default=timezone.now, db_index=True)
    last_verified_at = models.DateTimeField(default=timezone.now)
    scheduled_for = models.DateTimeField(null=True, blank=True, db_index=True)

    # Author & Governance
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='platform_updates'
    )
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

        # Keep is_published synced with editorial_status
        if self.editorial_status == EditorialStatus.PUBLISHED:
            self.is_published = True
        elif self.editorial_status in [EditorialStatus.DRAFT, EditorialStatus.IN_REVIEW, EditorialStatus.RETRACTED]:
            self.is_published = False

        super().save(*args, **kwargs)


class SavedUpdate(models.Model):
    """
    Builder bookmarks for ENQUEbet Pulse updates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_pulse_updates'
    )
    update = models.ForeignKey(
        PlatformUpdate,
        on_delete=models.CASCADE,
        related_name='saves'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'saved_pulse_updates'
        ordering = ['-created_at']
        unique_together = ['user', 'update']

    def __str__(self):
        return f"{self.user.username} saved {self.update.title}"


class UserPulsePreference(models.Model):
    """
    Personalized intelligence preferences: followed technologies, categories, and briefing options.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pulse_preferences'
    )
    followed_categories = models.JSONField(
        default=list,
        blank=True,
        help_text="List of category values e.g. ['AI_ML', 'ELECTRONICS']"
    )
    followed_technologies = models.JSONField(
        default=list,
        blank=True,
        help_text="List of technology tags e.g. ['Python', 'Rust', 'STM32', 'PyTorch']"
    )
    receive_weekly_briefing = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_pulse_preferences'

    def __str__(self):
        return f"Pulse Preferences for {self.user.username}"


class UpdateRevision(models.Model):
    """
    Audit log of editorial revisions and corrections.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    update = models.ForeignKey(
        PlatformUpdate,
        on_delete=models.CASCADE,
        related_name='revisions'
    )
    editor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pulse_revisions'
    )
    revision_summary = models.CharField(max_length=255)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pulse_update_revisions'
        ordering = ['-created_at']

    def __str__(self):
        return f"Revision by {self.editor} on {self.update.title} at {self.created_at}"
