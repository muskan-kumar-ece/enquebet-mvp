"""
ENQUEbet Academy — Course, Curriculum, Enrollment & Learning Models
"""
import uuid
from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify


class CourseCategory(models.Model):
    """
    Taxonomic classification for engineering courses.
    Examples: Fullstack Web, AI & Machine Learning, Systems & Embedded, DevOps & Cloud.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    icon = models.CharField(max_length=50, default='BookOpen', help_text="Lucide icon identifier")
    description = models.TextField(blank=True, default='')
    display_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_categories'
        ordering = ['display_order', 'name']
        verbose_name_plural = 'Course Categories'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or f"category-{uuid.uuid4().hex[:6]}"
            slug = base_slug
            counter = 1
            while CourseCategory.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class DifficultyLevel(models.TextChoices):
    BEGINNER = 'beginner', 'Beginner'
    INTERMEDIATE = 'intermediate', 'Intermediate'
    ADVANCED = 'advanced', 'Advanced'
    EXPERT = 'expert', 'Expert / Masterclass'


class CourseFormat(models.TextChoices):
    PROJECT_BASED = 'project_based', 'Project-Based Build'
    SELF_PACED = 'self_paced', 'Self-Paced'
    COHORT = 'cohort', 'Cohort-Based'


class CourseStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PENDING_REVIEW = 'pending_review', 'Pending Review'
    PUBLISHED = 'published', 'Published'
    ARCHIVED = 'archived', 'Archived'


class AccessTier(models.TextChoices):
    FREE = 'free', 'Free Foundation'
    PREMIUM = 'premium', 'Premium Access'
    CAMPUS_ONLY = 'campus_only', 'Campus Verified Only'


class ContentType(models.TextChoices):
    VIDEO = 'video', 'Video'
    ARTICLE = 'article', 'Technical Guide / Article'
    WALKTHROUGH = 'walkthrough', 'Code Walkthrough'
    ASSIGNMENT = 'assignment', 'Practical Assignment'


class EnrollmentStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    COMPLETED = 'completed', 'Completed'
    DROPPED = 'dropped', 'Dropped'


class DeliverableType(models.TextChoices):
    GITHUB_PR = 'github_pr', 'GitHub Pull Request'
    REPO_LINK = 'repo_link', 'Git Repository URL'
    FILE_UPLOAD = 'file_upload', 'Architecture Spec / Zip Deliverable'
    DEPLOYED_URL = 'deployed_url', 'Live Deployed URL'


class SubmissionStatus(models.TextChoices):
    SUBMITTED = 'submitted', 'Submitted'
    REVIEWING = 'reviewing', 'In Review'
    APPROVED = 'approved', 'Approved'
    CHANGES_REQUESTED = 'changes_requested', 'Changes Requested'


class Course(models.Model):
    """
    Core course entity in ENQUEbet Academy.
    Project-first curriculum designed to transition builders from learning to building.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    title = models.CharField(max_length=255)
    short_description = models.CharField(max_length=300)
    full_description = models.TextField()
    category = models.ForeignKey(
        CourseCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='courses'
    )
    difficulty = models.CharField(
        max_length=20,
        choices=DifficultyLevel.choices,
        default=DifficultyLevel.BEGINNER,
        db_index=True
    )
    format = models.CharField(
        max_length=20,
        choices=CourseFormat.choices,
        default=CourseFormat.PROJECT_BASED
    )
    estimated_hours = models.PositiveIntegerField(default=10)
    thumbnail_url = models.URLField(max_length=500, blank=True, default='')
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_courses'
    )
    status = models.CharField(
        max_length=20,
        choices=CourseStatus.choices,
        default=CourseStatus.PUBLISHED,
        db_index=True
    )
    access_tier = models.CharField(
        max_length=20,
        choices=AccessTier.choices,
        default=AccessTier.FREE,
        db_index=True
    )
    price_inr = models.PositiveIntegerField(default=0)
    prerequisites = models.JSONField(default=list, blank=True)
    learning_outcomes = models.JSONField(default=list, blank=True)
    project_outcome_title = models.CharField(max_length=255, blank=True, default='')
    project_outcome_description = models.TextField(blank=True, default='')
    starter_repo_url = models.URLField(max_length=500, blank=True, default='')
    skills_gained = models.JSONField(default=list, blank=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'courses'
        ordering = ['-is_featured', '-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['access_tier', 'status']),
            models.Index(fields=['difficulty', 'status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_difficulty_display()})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:200] or f"course-{uuid.uuid4().hex[:8]}"
            slug = base_slug
            counter = 1
            while Course.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class CourseModule(models.Model):
    """
    Curriculum chapter / module within a course.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='modules'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_modules'
        ordering = ['order', 'created_at']
        unique_together = [('course', 'order')]

    def __str__(self):
        return f"{self.course.title} - Module {self.order}: {self.title}"


class Lesson(models.Model):
    """
    Individual instructional unit (video, guide, code walkthrough, or assignment).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(
        CourseModule,
        on_delete=models.CASCADE,
        related_name='lessons'
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)
    content_type = models.CharField(
        max_length=20,
        choices=ContentType.choices,
        default=ContentType.ARTICLE
    )
    video_url = models.URLField(max_length=500, blank=True, default='')
    article_markdown = models.TextField(blank=True, default='')
    duration_minutes = models.PositiveIntegerField(default=10)
    is_preview = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=1)
    resources = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_lessons'
        ordering = ['order', 'created_at']
        unique_together = [('module', 'order')]

    def __str__(self):
        return f"{self.module.title} - Lesson {self.order}: {self.title}"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:200] or f"lesson-{uuid.uuid4().hex[:8]}"
            slug = base_slug
            counter = 1
            while Lesson.objects.filter(module=self.module, slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Enrollment(models.Model):
    """
    Authoritative student enrollment record in a course.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_enrollments'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    status = models.CharField(
        max_length=20,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.ACTIVE,
        db_index=True
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    progress_percent = models.PositiveIntegerField(default=0)
    last_accessed_lesson = models.ForeignKey(
        Lesson,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )

    class Meta:
        db_table = 'course_enrollments'
        unique_together = [('user', 'course')]
        ordering = ['-enrolled_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['course', 'status']),
        ]

    def __str__(self):
        return f"{self.user.username} enrolled in {self.course.title} ({self.progress_percent}%)"

    def recalculate_progress(self):
        """
        Recalculates completed lesson percentage and triggers completion when 100% is reached.
        """
        total_lessons = Lesson.objects.filter(module__course=self.course).count()
        if total_lessons == 0:
            self.progress_percent = 0
            self.save(update_fields=['progress_percent'])
            return 0

        completed_count = self.lesson_progress.filter(is_completed=True).count()
        percent = int(min(100, round((completed_count / total_lessons) * 100)))
        self.progress_percent = percent

        if percent >= 100 and self.status != EnrollmentStatus.COMPLETED:
            self.status = EnrollmentStatus.COMPLETED
            self.completed_at = timezone.now()
            self.save(update_fields=['progress_percent', 'status', 'completed_at'])

            # Issue educational certificate if not already issued (thread-safe)
            with transaction.atomic():
                year = timezone.now().year
                short_hash = uuid.uuid4().hex[:8].upper()
                cert_code = f"ENQ-ACAD-{year}-{short_hash}"
                CourseCompletion.objects.get_or_create(
                    enrollment=self,
                    defaults={
                        'certificate_code': cert_code,
                        'grade_summary': {'completed_lessons': completed_count, 'total_lessons': total_lessons}
                    }
                )
        else:
            self.save(update_fields=['progress_percent'])

        return percent


class LessonProgress(models.Model):
    """
    Progress record per student per lesson.
    Idempotent mark-as-completed and video duration tracker.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='lesson_progress'
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='progress_records'
    )
    is_completed = models.BooleanField(default=False, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_position_seconds = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_lesson_progress'
        unique_together = [('enrollment', 'lesson')]
        ordering = ['-completed_at']

    def __str__(self):
        status_str = "Done" if self.is_completed else "In Progress"
        return f"{self.enrollment.user.username} - {self.lesson.title}: {status_str}"


class Assignment(models.Model):
    """
    Hands-on engineering assignment tied to a course and optionally a lesson.
    Requires verifiable deliverables (PR, Git repo, or deployed live project).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    lesson = models.ForeignKey(
        Lesson,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assignments'
    )
    title = models.CharField(max_length=255)
    instructions_markdown = models.TextField()
    acceptance_criteria = models.JSONField(default=list, blank=True)
    starter_repo_url = models.URLField(max_length=500, blank=True, default='')
    required_deliverable_type = models.CharField(
        max_length=30,
        choices=DeliverableType.choices,
        default=DeliverableType.REPO_LINK
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_assignments'
        ordering = ['course', 'created_at']

    def __str__(self):
        return f"{self.title} ({self.course.title})"


class AssignmentSubmission(models.Model):
    """
    Student deliverable submission for an assignment with instructor review cycle.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.PROTECT,
        related_name='submissions'
    )
    learner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='academy_submissions'
    )
    submission_text = models.TextField(blank=True, default='')
    repository_url = models.URLField(max_length=500, blank=True, default='')
    deliverable_url = models.URLField(max_length=500, blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=SubmissionStatus.choices,
        default=SubmissionStatus.SUBMITTED,
        db_index=True
    )
    feedback = models.TextField(blank=True, default='')
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_academy_submissions'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_assignment_submissions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['assignment', 'status']),
            models.Index(fields=['learner', '-created_at']),
        ]

    def __str__(self):
        return f"Submission by {self.learner.username} for {self.assignment.title} [{self.status}]"


class CourseCompletion(models.Model):
    """
    Cryptographically verifiable educational milestone certificate (e.g. ENQ-ACAD-YYYY-XXXXXXXX).

    ARCHITECTURAL INVARIANT:
    CourseCompletion is STRICTLY an academic credential.
    It DOES NOT mint a ProofOfWork or increment user.reputation_score.
    Reputation and Proof of Work remain strictly governed by verified project
    deliverables in apps.collaboration workspaces.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.OneToOneField(
        Enrollment,
        on_delete=models.PROTECT,
        related_name='completion'
    )
    certificate_code = models.CharField(max_length=64, unique=True, db_index=True)
    completed_at = models.DateTimeField(auto_now_add=True)
    grade_summary = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'course_completions'
        ordering = ['-completed_at']

    def __str__(self):
        return f"Certificate {self.certificate_code} for {self.enrollment.user.username}"


class CourseBookmark(models.Model):
    """
    User bookmark / saved course for quick access.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_bookmarks'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='bookmarks'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'course_bookmarks'
        unique_together = [('user', 'course')]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} bookmarked {self.course.title}"


class CourseProjectBridge(models.Model):
    """
    Bridges course learning to ENQUEbet Workspace project creation.
    Provides starter specs and tags for pre-filling /collaboration or /create.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='project_bridges'
    )
    recommended_skills = models.JSONField(default=list, blank=True)
    starter_brief = models.TextField(blank=True, default='')
    workspace_template_tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'course_project_bridges'

    def __str__(self):
        return f"Project Bridge for {self.course.title}"


class PaymentGateway(models.TextChoices):
    RAZORPAY = 'razorpay', 'Razorpay (UPI, Cards, Netbanking)'
    STRIPE = 'stripe', 'Stripe (International)'
    SCHOLARSHIP = 'scholarship', 'Admin Scholarship / Grant'
    SIMULATION = 'simulation', 'Test / Sandbox Simulation'


class OrderStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Payment'
    PAID = 'paid', 'Payment Successful'
    FAILED = 'failed', 'Payment Failed'
    REFUNDED = 'refunded', 'Refunded'


class CourseOrder(models.Model):
    """
    Tracks commercial purchase intent and payment gateway settlement for paid courses.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='course_orders'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name='orders'
    )
    amount_inr = models.PositiveIntegerField(help_text="Amount in INR (e.g. 1999)")
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        db_index=True
    )
    payment_gateway = models.CharField(
        max_length=20,
        choices=PaymentGateway.choices,
        default=PaymentGateway.RAZORPAY
    )
    gateway_order_id = models.CharField(max_length=128, blank=True, default='', db_index=True)
    gateway_payment_id = models.CharField(max_length=128, blank=True, default='', db_index=True)
    gateway_signature = models.CharField(max_length=256, blank=True, default='')
    billing_email = models.EmailField(blank=True, default='')
    billing_name = models.CharField(max_length=255, blank=True, default='')
    error_message = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['course', 'status']),
            models.Index(fields=['status', '-created_at']),
        ]

    def __str__(self):
        return f"Order {self.order_number} - {self.course.title} ({self.get_status_display()})"


class CourseEntitlement(models.Model):
    """
    Cryptographically immutable authorization proving a learner's commercial entitlement
    to access a paid course's gated lessons and assignments.

    Separates commercial entitlement from runtime enrollment progress.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='course_entitlements'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name='entitlements'
    )
    order = models.OneToOneField(
        CourseOrder,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='entitlement'
    )
    is_active = models.BooleanField(default=True, db_index=True)
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='granted_scholarships',
        help_text="Populated when access is granted by an administrator (scholarship / manual grant)"
    )
    revocation_reason = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        db_table = 'course_entitlements'
        unique_together = [('user', 'course')]
        ordering = ['-granted_at']
        indexes = [
            models.Index(fields=['user', 'course', 'is_active']),
        ]

    def __str__(self):
        status_label = 'Active' if self.is_active else 'Revoked'
        return f"Entitlement: {self.user.username} -> {self.course.title} ({status_label})"
