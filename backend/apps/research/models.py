"""
Living Research Models for ENQUEbet
Powering academic preprints, living methodology, VenopAI hardware BOM,
decentralized reproducibility audits, and collaborative lab workspaces.
"""
import uuid
import re
from django.db import models
from django.conf import settings
from django.utils.text import slugify


class ResearchField(models.TextChoices):
    AI_ML = 'AI_ML', 'Artificial Intelligence & Machine Learning'
    ROBOTICS_EMBEDDED = 'ROBOTICS_EMBEDDED', 'Robotics, Hardware & Embedded Systems'
    QUANTUM = 'QUANTUM', 'Quantum Computing & Information'
    BIOTECH = 'BIOTECH', 'Biotechnology & Health Sciences'
    CLEAN_ENERGY = 'CLEAN_ENERGY', 'Clean Energy & Climate Tech'
    CRYPTOGRAPHY = 'CRYPTOGRAPHY', 'Cryptography & Distributed Systems'
    AEROSPACE = 'AEROSPACE', 'Aerospace & Autonomous Vehicles'
    OTHER = 'OTHER', 'Interdisciplinary & Emerging Tech'


class ResearchStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Submitted for Screening'
    PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Admin Approval'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Community & Peer Review in Progress'
    REVISION_REQUIRED = 'REVISION_REQUIRED', 'Author Revisions Requested'
    ACCEPTED = 'ACCEPTED', 'Accepted for Publication'
    PREPRINT = 'PREPRINT', 'Open Preprint Published'
    PEER_REVIEWED = 'PEER_REVIEWED', 'Peer-Reviewed & Audited'
    REPRODUCED = 'REPRODUCED', 'Empirically Verified & Reproduced'
    REJECTED = 'REJECTED', 'Rejected'
    WITHDRAWN = 'WITHDRAWN', 'Withdrawn by Author'


class ResearchPaper(models.Model):
    """Living research papers and academic preprints"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    paper_code = models.CharField(max_length=64, unique=True, db_index=True)
    primary_author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='research_papers'
    )
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=320, unique=True, blank=True)
    abstract = models.TextField()
    methodology_summary = models.TextField(blank=True, default='')
    field = models.CharField(
        max_length=32,
        choices=ResearchField.choices,
        default=ResearchField.AI_ML,
        db_index=True
    )
    status = models.CharField(
        max_length=32,
        choices=ResearchStatus.choices,
        default=ResearchStatus.PENDING_APPROVAL,
        db_index=True
    )

    # Moderation & Review
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_research_papers'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')

    # Editorial & Reviewer Feedback
    internal_editorial_notes = models.TextField(blank=True, default='')
    author_feedback = models.TextField(blank=True, default='')
    screening_checklist = models.JSONField(default=dict, blank=True)

    # Artifact Links
    pdf_url = models.URLField(max_length=600, blank=True, null=True)
    code_repo_url = models.URLField(max_length=600, blank=True, null=True)
    dataset_url = models.URLField(max_length=600, blank=True, null=True)
    live_demo_url = models.URLField(max_length=600, blank=True, null=True)

    # VenopAI Hardware Integration (JSON list of required electronic components)
    # [{"name": "ESP32-S3-WROOM-1", "slug": "esp32-s3-wroom-1", "quantity": 2, "role": "Edge Inference Node"}]
    hardware_bom = models.JSONField(default=list, blank=True)

    # Workspace & Collaboration Bridge
    associated_workspace = models.ForeignKey(
        'posts.Post',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='research_papers'
    )
    open_collaborator_roles = models.JSONField(default=list, blank=True)

    # Academic & Reputation Metrics
    citations_count = models.PositiveIntegerField(default=0)
    reproducibility_score = models.FloatField(default=0.0)
    views_count = models.PositiveIntegerField(default=0)
    downloads_count = models.PositiveIntegerField(default=0)

    doi = models.CharField(max_length=128, blank=True, default='')
    keywords = models.JSONField(default=list, blank=True)
    published_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'research_papers'
        ordering = ['-published_at']

    def __str__(self):
        return f"[{self.paper_code}] {self.title}"

    def save(self, *args, **kwargs):
        if not self.paper_code:
            # Generate deterministic academic paper code: ENQ-RES-YYYY-XXXX
            from django.utils import timezone
            year = timezone.now().year
            rand_suffix = uuid.uuid4().hex[:6].upper()
            self.paper_code = f"ENQ-RES-{year}-{rand_suffix}"

        if not self.slug:
            base_slug = slugify(self.title)[:200]
            if not base_slug:
                base_slug = f"paper-{uuid.uuid4().hex[:8]}"
            unique_suffix = uuid.uuid4().hex[:6]
            self.slug = f"{base_slug}-{unique_suffix}"

        super().save(*args, **kwargs)

    def generate_bibtex(self) -> str:
        """Generate standardized BibTeX citation"""
        author_name = self.primary_author.get_full_name() or self.primary_author.username
        cite_key = f"{re.sub(r'[^a-zA-Z0-9]', '', author_name.split()[-1].lower())}{self.published_at.year}{self.slug[:8]}"
        return f"""@article{{{cite_key},
  author = {{{author_name}}},
  title = {{{self.title}}},
  journal = {{ENQUEbet Living Research Repository}},
  year = {{{self.published_at.year}}},
  eprint = {{{self.paper_code}}},
  doi = {{{self.doi or 'enquebet/' + self.paper_code}}},
  url = {{https://enquebet.com/research/{self.slug}}}
}}"""


# Backwards compatibility alias
Research = ResearchPaper


class ReproducibilityReview(models.Model):
    """Decentralized reproducibility audits and structured peer reviews"""
    class Verdict(models.TextChoices):
        VERIFIED_REPRODUCED = 'VERIFIED_REPRODUCED', 'Fully Reproduced'
        PARTIALLY_REPRODUCED = 'PARTIALLY_REPRODUCED', 'Partially Reproduced'
        FAILED_TO_REPRODUCE = 'FAILED_TO_REPRODUCE', 'Failed to Reproduce'
        METHODOLOGY_VALID = 'METHODOLOGY_VALID', 'Methodology Verified (Theoretical)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    paper = models.ForeignKey(
        ResearchPaper,
        on_delete=models.CASCADE,
        related_name='reproducibility_reviews'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conducted_research_reviews'
    )
    verdict = models.CharField(max_length=32, choices=Verdict.choices)
    rigor_score = models.PositiveSmallIntegerField(default=5)  # 1-5
    clarity_score = models.PositiveSmallIntegerField(default=5)  # 1-5
    reproducibility_score = models.PositiveSmallIntegerField(default=5)  # 1-5
    evaluation_notes = models.TextField()
    environment_details = models.TextField(blank=True, default='')  # OS, hardware, CUDA versions
    evidence_url = models.URLField(max_length=600, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'research_reproducibility_reviews'
        unique_together = ('paper', 'reviewer')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reviewer.username} on {self.paper.paper_code}: {self.verdict}"


class ResearchAuthor(models.Model):
    """Structured authors and institutional affiliations for IEEE indexing"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    paper = models.ForeignKey(
        ResearchPaper,
        on_delete=models.CASCADE,
        related_name='authors'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='authored_research'
    )
    full_name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    affiliation = models.CharField(max_length=300, blank=True, default='')
    orcid = models.CharField(max_length=32, blank=True, default='')
    order = models.PositiveSmallIntegerField(default=1)
    is_corresponding = models.BooleanField(default=False)
    contribution_statement = models.TextField(blank=True, default='')
    is_confirmed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'research_authors'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.full_name} ({self.affiliation or 'Independent'}) on {self.paper.paper_code}"


class ResearchVersion(models.Model):
    """Auditable version history and revision tracking for research papers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    paper = models.ForeignKey(
        ResearchPaper,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveSmallIntegerField(default=1)
    pdf_url = models.URLField(max_length=600)
    changelog = models.TextField(blank=True, default='')
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'research_versions'
        ordering = ['-version_number']
        unique_together = ('paper', 'version_number')

    def __str__(self):
        return f"{self.paper.paper_code} v{self.version_number}"

