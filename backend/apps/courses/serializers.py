"""
Serializers for ENQUEbet Academy Courses, Curriculum, Progress & Submissions
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    CourseCategory,
    Course,
    CourseModule,
    Lesson,
    Enrollment,
    LessonProgress,
    Assignment,
    AssignmentSubmission,
    CourseCompletion,
    CourseBookmark,
    CourseProjectBridge,
    CourseOrder,
    CourseEntitlement,
    AccessTier,
    OrderStatus,
)
from .permissions import is_academy_admin

User = get_user_model()


class CreatorProfileSerializer(serializers.ModelSerializer):
    """Minimal creator representation on course cards and details"""
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'profile_image',
            'headline',
            'reputation_score',
        ]


class CourseCategorySerializer(serializers.ModelSerializer):
    """Course taxonomy category"""
    courses_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = CourseCategory
        fields = [
            'id',
            'name',
            'slug',
            'icon',
            'description',
            'display_order',
            'courses_count',
        ]


class LessonSummarySerializer(serializers.ModelSerializer):
    """Lightweight lesson representation for curriculum tree in course details"""
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'title',
            'slug',
            'content_type',
            'duration_minutes',
            'is_preview',
            'order',
            'is_completed',
        ]

    def get_is_completed(self, obj) -> bool:
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return False
        completed_set = self.context.get('completed_lesson_ids')
        if completed_set is not None:
            return obj.id in completed_set
        return LessonProgress.objects.filter(
            enrollment__user=user,
            lesson=obj,
            is_completed=True
        ).exists()


class CourseModuleSerializer(serializers.ModelSerializer):
    """Course module containing its ordered lessons"""
    lessons = LessonSummarySerializer(many=True, read_only=True)

    class Meta:
        model = CourseModule
        fields = [
            'id',
            'title',
            'description',
            'order',
            'lessons',
        ]


class LessonDetailSerializer(serializers.ModelSerializer):
    """Full lesson content for the focused lesson player"""
    is_completed = serializers.SerializerMethodField()
    last_position_seconds = serializers.SerializerMethodField()
    next_lesson_id = serializers.SerializerMethodField()
    prev_lesson_id = serializers.SerializerMethodField()
    course_slug = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'title',
            'slug',
            'content_type',
            'video_url',
            'article_markdown',
            'duration_minutes',
            'is_preview',
            'order',
            'resources',
            'module_id',
            'course_slug',
            'course_title',
            'is_completed',
            'last_position_seconds',
            'next_lesson_id',
            'prev_lesson_id',
            'created_at',
            'updated_at',
        ]

    def get_course_slug(self, obj) -> str:
        return obj.module.course.slug

    def get_course_title(self, obj) -> str:
        return obj.module.course.title

    def get_is_completed(self, obj) -> bool:
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return False
        return LessonProgress.objects.filter(
            enrollment__user=user,
            lesson=obj,
            is_completed=True
        ).exists()

    def get_last_position_seconds(self, obj) -> int:
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return 0
        progress = LessonProgress.objects.filter(
            enrollment__user=user,
            lesson=obj
        ).first()
        return progress.last_position_seconds if progress else 0

    def get_next_lesson_id(self, obj):
        # Look in same module first
        next_in_mod = Lesson.objects.filter(
            module=obj.module,
            order__gt=obj.order
        ).order_by('order').first()
        if next_in_mod:
            return str(next_in_mod.id)
        # Look in next module
        next_mod = CourseModule.objects.filter(
            course=obj.module.course,
            order__gt=obj.module.order
        ).order_by('order').first()
        if next_mod:
            first_in_next = next_mod.lessons.order_by('order').first()
            if first_in_next:
                return str(first_in_next.id)
        return None

    def get_prev_lesson_id(self, obj):
        # Look in same module first
        prev_in_mod = Lesson.objects.filter(
            module=obj.module,
            order__lt=obj.order
        ).order_by('-order').first()
        if prev_in_mod:
            return str(prev_in_mod.id)
        # Look in prev module
        prev_mod = CourseModule.objects.filter(
            course=obj.module.course,
            order__lt=obj.module.order
        ).order_by('-order').first()
        if prev_mod:
            last_in_prev = prev_mod.lessons.order_by('-order').first()
            if last_in_prev:
                return str(last_in_prev.id)
        return None


class AssignmentSerializer(serializers.ModelSerializer):
    """Hands-on project assignment serializer"""
    user_submission = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id',
            'course_id',
            'lesson_id',
            'title',
            'instructions_markdown',
            'acceptance_criteria',
            'starter_repo_url',
            'required_deliverable_type',
            'user_submission',
            'created_at',
        ]

    def get_user_submission(self, obj):
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return None
        sub = obj.submissions.filter(learner=user).first()
        if not sub:
            return None
        return {
            'id': str(sub.id),
            'status': sub.status,
            'repository_url': sub.repository_url,
            'deliverable_url': sub.deliverable_url,
            'submission_text': sub.submission_text,
            'feedback': sub.feedback,
            'reviewed_at': sub.reviewed_at,
            'created_at': sub.created_at,
        }


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    """Student deliverable submission serializer"""
    learner = CreatorProfileSerializer(read_only=True)
    assignment_title = serializers.CharField(source='assignment.title', read_only=True)
    course_title = serializers.CharField(source='assignment.course.title', read_only=True)
    course_slug = serializers.CharField(source='assignment.course.slug', read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id',
            'assignment',
            'assignment_title',
            'course_title',
            'course_slug',
            'learner',
            'submission_text',
            'repository_url',
            'deliverable_url',
            'status',
            'feedback',
            'reviewer',
            'reviewed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['learner', 'status', 'feedback', 'reviewer', 'reviewed_at']


class CourseListSerializer(serializers.ModelSerializer):
    """High-density course card serializer for Academy catalog & filters"""
    creator = CreatorProfileSerializer(read_only=True)
    category = CourseCategorySerializer(read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True, default=0)
    modules_count = serializers.IntegerField(read_only=True, default=0)
    lessons_count = serializers.IntegerField(read_only=True, default=0)
    is_enrolled = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id',
            'slug',
            'title',
            'short_description',
            'category',
            'difficulty',
            'format',
            'estimated_hours',
            'thumbnail_url',
            'creator',
            'status',
            'access_tier',
            'price_inr',
            'project_outcome_title',
            'starter_repo_url',
            'skills_gained',
            'is_featured',
            'enrolled_count',
            'modules_count',
            'lessons_count',
            'is_enrolled',
            'progress_percent',
            'is_bookmarked',
            'created_at',
        ]

    def get_is_enrolled(self, obj) -> bool:
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return False
        enrolled_map = self.context.get('user_enrolled_map')
        if enrolled_map is not None:
            return obj.id in enrolled_map
        return obj.enrollments.filter(user=user, status__in=['active', 'completed']).exists()

    def get_progress_percent(self, obj) -> int:
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return 0
        enrolled_map = self.context.get('user_enrolled_map')
        if enrolled_map is not None:
            return enrolled_map.get(obj.id, 0)
        enrollment = obj.enrollments.filter(user=user).first()
        return enrollment.progress_percent if enrollment else 0

    def get_is_bookmarked(self, obj) -> bool:
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return False
        bookmarked_set = self.context.get('user_bookmarked_ids')
        if bookmarked_set is not None:
            return obj.id in bookmarked_set
        return obj.bookmarks.filter(user=user).exists()


class CourseDetailSerializer(serializers.ModelSerializer):
    """Full course details including syllabus, assignments, outcomes, and enrollment state"""
    creator = CreatorProfileSerializer(read_only=True)
    category = CourseCategorySerializer(read_only=True)
    modules = CourseModuleSerializer(many=True, read_only=True)
    assignments = AssignmentSerializer(many=True, read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True, default=0)
    is_enrolled = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()
    enrollment_id = serializers.SerializerMethodField()
    last_accessed_lesson_id = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    certificate_code = serializers.SerializerMethodField()
    is_entitled = serializers.SerializerMethodField()
    has_access = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id',
            'slug',
            'title',
            'short_description',
            'full_description',
            'category',
            'difficulty',
            'format',
            'estimated_hours',
            'thumbnail_url',
            'creator',
            'status',
            'access_tier',
            'price_inr',
            'prerequisites',
            'learning_outcomes',
            'project_outcome_title',
            'project_outcome_description',
            'starter_repo_url',
            'skills_gained',
            'is_featured',
            'modules',
            'assignments',
            'enrolled_count',
            'is_enrolled',
            'progress_percent',
            'enrollment_id',
            'last_accessed_lesson_id',
            'is_bookmarked',
            'certificate_code',
            'is_entitled',
            'has_access',
            'created_at',
            'updated_at',
        ]

    def _get_enrollment(self, obj):
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return None
        if not hasattr(self, '_cached_enrollment'):
            self._cached_enrollment = obj.enrollments.filter(user=user).select_related('last_accessed_lesson').first()
        return self._cached_enrollment

    def get_is_enrolled(self, obj) -> bool:
        e = self._get_enrollment(obj)
        return bool(e and e.status in ['active', 'completed'])

    def get_progress_percent(self, obj) -> int:
        e = self._get_enrollment(obj)
        return e.progress_percent if e else 0

    def get_enrollment_id(self, obj):
        e = self._get_enrollment(obj)
        return str(e.id) if e else None

    def get_last_accessed_lesson_id(self, obj):
        e = self._get_enrollment(obj)
        if e and e.last_accessed_lesson:
            return str(e.last_accessed_lesson.id)
        # Default to first lesson of first module if enrolled
        first_mod = obj.modules.first()
        if first_mod:
            first_les = first_mod.lessons.first()
            if first_les:
                return str(first_les.id)
        return None

    def get_is_bookmarked(self, obj) -> bool:
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return False
        return obj.bookmarks.filter(user=user).exists()

    def get_certificate_code(self, obj):
        e = self._get_enrollment(obj)
        if e and hasattr(e, 'completion'):
            return e.completion.certificate_code
        return None

    def get_is_entitled(self, obj) -> bool:
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return False
        if obj.access_tier == AccessTier.FREE and (not obj.price_inr or obj.price_inr == 0):
            return True
        return CourseEntitlement.objects.filter(user=user, course=obj, is_active=True).exists()

    def get_has_access(self, obj) -> bool:
        user = self.context.get('request_user')
        if not user or not user.is_authenticated:
            return False
        if is_academy_admin(user) or obj.creator == user:
            return True
        if obj.access_tier == AccessTier.FREE and (not obj.price_inr or obj.price_inr == 0):
            return self.get_is_enrolled(obj)
        return CourseEntitlement.objects.filter(user=user, course=obj, is_active=True).exists()


class EnrollmentSerializer(serializers.ModelSerializer):
    """Enrolled course list serializer for 'My Learning' tab"""
    course = CourseListSerializer(read_only=True)
    certificate_code = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            'id',
            'course',
            'status',
            'enrolled_at',
            'completed_at',
            'progress_percent',
            'last_accessed_lesson',
            'certificate_code',
        ]

    def get_certificate_code(self, obj):
        if hasattr(obj, 'completion'):
            return obj.completion.certificate_code
        return None


class CourseCompletionSerializer(serializers.ModelSerializer):
    """Educational certificate verification serializer"""
    course_title = serializers.CharField(source='enrollment.course.title', read_only=True)
    course_slug = serializers.CharField(source='enrollment.course.slug', read_only=True)
    learner_name = serializers.CharField(source='enrollment.user.full_name', read_only=True)
    learner_username = serializers.CharField(source='enrollment.user.username', read_only=True)
    learner_avatar = serializers.URLField(source='enrollment.user.profile_image', read_only=True)

    class Meta:
        model = CourseCompletion
        fields = [
            'id',
            'certificate_code',
            'completed_at',
            'grade_summary',
            'course_title',
            'course_slug',
            'learner_name',
            'learner_username',
            'learner_avatar',
        ]


class CourseOrderSerializer(serializers.ModelSerializer):
    """Purchase order representation for billing history & receipts"""
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_slug = serializers.CharField(source='course.slug', read_only=True)

    class Meta:
        model = CourseOrder
        fields = [
            'id',
            'order_number',
            'course_title',
            'course_slug',
            'amount_inr',
            'currency',
            'status',
            'payment_gateway',
            'gateway_order_id',
            'billing_name',
            'billing_email',
            'created_at',
        ]
        read_only_fields = fields


class CourseEntitlementSerializer(serializers.ModelSerializer):
    """Lifetime commercial course entitlement representation"""
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_slug = serializers.CharField(source='course.slug', read_only=True)

    class Meta:
        model = CourseEntitlement
        fields = [
            'id',
            'course_title',
            'course_slug',
            'is_active',
            'granted_at',
        ]
        read_only_fields = fields
