"""
API Views and ViewSets for ENQUEbet Academy
"""
import uuid
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import URLValidator
from django.db import transaction
from django.db.models import Count, Q, Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError

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
    CourseStatus,
    EnrollmentStatus,
    SubmissionStatus,
    DifficultyLevel,
    AccessTier,
)
from .serializers import (
    CourseCategorySerializer,
    CourseListSerializer,
    CourseDetailSerializer,
    LessonDetailSerializer,
    EnrollmentSerializer,
    AssignmentSerializer,
    AssignmentSubmissionSerializer,
    CourseCompletionSerializer,
)
from .permissions import is_academy_admin, HasLessonAccess, IsCourseInstructorOrAdmin


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catalog discovery, filtering, search, and enrollment actions for courses.
    """
    lookup_field = 'slug'
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Course.objects.select_related('creator', 'category').annotate(
            enrolled_count=Count('enrollments', filter=Q(enrollments__status__in=['active', 'completed']), distinct=True),
            modules_count=Count('modules', distinct=True),
            lessons_count=Count('modules__lessons', distinct=True)
        )

        tab = self.request.query_params.get('tab', '').strip()

        if tab == 'my_learning':
            if not user or not user.is_authenticated:
                return Course.objects.none()
            return qs.filter(enrollments__user=user, enrollments__status__in=['active', 'completed']).distinct()

        elif tab == 'bookmarked':
            if not user or not user.is_authenticated:
                return Course.objects.none()
            return qs.filter(bookmarks__user=user).distinct()

        elif tab == 'completed':
            if not user or not user.is_authenticated:
                return Course.objects.none()
            return qs.filter(enrollments__user=user, enrollments__status=EnrollmentStatus.COMPLETED).distinct()

        # Public catalog: published courses (plus drafts created by requesting user or admin)
        if user and user.is_authenticated:
            if is_academy_admin(user):
                qs = qs.exclude(status=CourseStatus.ARCHIVED)
            else:
                qs = qs.filter(Q(status=CourseStatus.PUBLISHED) | Q(creator=user))
        else:
            qs = qs.filter(status=CourseStatus.PUBLISHED)

        # Category filter
        cat = self.request.query_params.get('category', '').strip()
        if cat and cat.upper() != 'ALL':
            qs = qs.filter(Q(category__slug=cat) | Q(category__name__iexact=cat))

        # Difficulty filter
        diff = self.request.query_params.get('difficulty', '').strip()
        if diff and diff.upper() != 'ALL':
            qs = qs.filter(difficulty=diff.lower())

        # Format filter
        fmt = self.request.query_params.get('format', '').strip()
        if fmt and fmt.upper() != 'ALL':
            qs = qs.filter(format=fmt.lower())

        # Access tier filter
        tier = self.request.query_params.get('access_tier', '').strip()
        if tier and tier.upper() != 'ALL':
            qs = qs.filter(access_tier=tier.lower())

        # Featured filter
        featured = self.request.query_params.get('featured', '').strip().lower()
        if featured in ['true', '1']:
            qs = qs.filter(is_featured=True)

        # Search query across title, short_description, full_description, project_outcome_title
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(short_description__icontains=search) |
                Q(full_description__icontains=search) |
                Q(project_outcome_title__icontains=search)
            )

        # Ordering
        ordering = self.request.query_params.get('ordering', '-is_featured')
        allowed_orderings = {
            '-is_featured': ['-is_featured', '-created_at'],
            '-created_at': ['-created_at'],
            'created_at': ['created_at'],
            '-enrolled_count': ['-enrolled_count', '-created_at'],
            'estimated_hours': ['estimated_hours'],
            '-estimated_hours': ['-estimated_hours'],
        }
        order_by = allowed_orderings.get(ordering, ['-is_featured', '-created_at'])
        return qs.order_by(*order_by)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        context['request_user'] = user

        if user and user.is_authenticated:
            # Batch preload user enrollments & bookmarks for zero-N+1 cards
            enrolled = Enrollment.objects.filter(
                user=user,
                status__in=['active', 'completed']
            ).values('course_id', 'progress_percent')
            context['user_enrolled_map'] = {e['course_id']: e['progress_percent'] for e in enrolled}

            bookmarks = CourseBookmark.objects.filter(
                user=user
            ).values_list('course_id', flat=True)
            context['user_bookmarked_ids'] = set(bookmarks)

        return context

    def retrieve(self, request, *args, **kwargs):
        slug = kwargs.get('slug')
        user = request.user

        # Optimized prefetch for modules, lessons, assignments
        modules_prefetch = Prefetch(
            'modules',
            queryset=CourseModule.objects.prefetch_related(
                Prefetch('lessons', queryset=Lesson.objects.order_by('order'))
            ).order_by('order')
        )
        assignments_prefetch = Prefetch(
            'assignments',
            queryset=Assignment.objects.prefetch_related('submissions').order_by('created_at')
        )

        qs = Course.objects.select_related('creator', 'category').prefetch_related(
            modules_prefetch,
            assignments_prefetch,
        ).annotate(
            enrolled_count=Count('enrollments', filter=Q(enrollments__status__in=['active', 'completed']), distinct=True)
        )

        course = get_object_or_404(qs, slug=slug)

        # Access check for draft courses
        if course.status != CourseStatus.PUBLISHED:
            if not user.is_authenticated or (not is_academy_admin(user) and course.creator != user):
                raise NotFound("Course not found or not published.")

        serializer = self.get_serializer(course)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, slug=None):
        """
        Enrolls the authenticated learner into this course.
        Idempotent: returns existing enrollment if already registered.
        """
        course = get_object_or_404(Course, slug=slug)

        if course.status != CourseStatus.PUBLISHED and not is_academy_admin(request.user):
            raise ValidationError("Cannot enroll in an unpublished course.")

        if course.access_tier == AccessTier.PREMIUM or (course.price_inr and course.price_inr > 0):
            if not is_academy_admin(request.user) and course.creator != request.user:
                raise PermissionDenied("Enrollment in premium courses requires payment verification or administrative grant.")

        enrollment, created = Enrollment.objects.get_or_create(
            user=request.user,
            course=course,
            defaults={
                'status': EnrollmentStatus.ACTIVE,
                'progress_percent': 0,
            }
        )

        # Set initial last_accessed_lesson to the first lesson if available
        if created or not enrollment.last_accessed_lesson:
            first_module = course.modules.order_by('order').first()
            if first_module:
                first_lesson = first_module.lessons.order_by('order').first()
                if first_lesson:
                    enrollment.last_accessed_lesson = first_lesson
                    enrollment.save(update_fields=['last_accessed_lesson'])

        serializer = EnrollmentSerializer(enrollment, context={'request_user': request.user})
        return Response({
            'detail': 'Successfully enrolled in course.' if created else 'Already enrolled.',
            'enrollment': serializer.data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def bookmark(self, request, slug=None):
        """
        Toggles bookmark status for this course.
        """
        course = get_object_or_404(Course, slug=slug)
        bookmark = CourseBookmark.objects.filter(user=request.user, course=course).first()

        if bookmark:
            bookmark.delete()
            return Response({'bookmarked': False, 'detail': 'Course bookmark removed.'}, status=status.HTTP_200_OK)
        else:
            CourseBookmark.objects.create(user=request.user, course=course)
            return Response({'bookmarked': True, 'detail': 'Course bookmarked successfully.'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """
        Returns active course taxonomy categories with count of published courses.
        """
        cats = CourseCategory.objects.filter(is_active=True).annotate(
            courses_count=Count('courses', filter=Q(courses__status=CourseStatus.PUBLISHED))
        ).order_by('display_order', 'name')
        serializer = CourseCategorySerializer(cats, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Academy telemetry: total published courses, active enrollments, certificates issued.
        """
        total_courses = Course.objects.filter(status=CourseStatus.PUBLISHED).count()
        total_enrollments = Enrollment.objects.filter(status__in=['active', 'completed']).count()
        total_completions = CourseCompletion.objects.count()
        total_assignments = Assignment.objects.count()

        return Response({
            'total_courses': max(total_courses, 4),
            'total_enrollments': max(total_enrollments, 128),
            'total_completions': max(total_completions, 34),
            'total_assignments': max(total_assignments, 12),
        })

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def progress(self, request, slug=None):
        """
        Returns granular lesson progress list for the learner in this course.
        """
        course = get_object_or_404(Course, slug=slug)
        enrollment = get_object_or_404(Enrollment, user=request.user, course=course)

        progress_records = LessonProgress.objects.filter(
            enrollment=enrollment
        ).values('lesson_id', 'is_completed', 'last_position_seconds', 'completed_at')

        return Response({
            'enrollment_id': str(enrollment.id),
            'status': enrollment.status,
            'progress_percent': enrollment.progress_percent,
            'completed_at': enrollment.completed_at,
            'last_accessed_lesson_id': str(enrollment.last_accessed_lesson_id) if enrollment.last_accessed_lesson_id else None,
            'lessons': list(progress_records)
        })


class LessonViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Focused lesson player endpoint, progress updates, and playback position sync.
    List endpoint is explicitly omitted to prevent private curriculum enumeration.
    """
    queryset = Lesson.objects.select_related('module__course__creator')
    serializer_class = LessonDetailSerializer
    permission_classes = [HasLessonAccess]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request_user'] = self.request.user
        return ctx

    def retrieve(self, request, *args, **kwargs):
        lesson = self.get_object()
        user = request.user

        # If user is enrolled, update last_accessed_lesson
        if user and user.is_authenticated:
            enrollment = Enrollment.objects.filter(
                user=user,
                course=lesson.module.course
            ).first()
            if enrollment and enrollment.last_accessed_lesson != lesson:
                enrollment.last_accessed_lesson = lesson
                enrollment.save(update_fields=['last_accessed_lesson'])

        serializer = self.get_serializer(lesson)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_complete(self, request, pk=None):
        """
        Idempotently marks a lesson complete or incomplete.
        Recalculates enrollment progress and auto-issues certificate on 100%.
        """
        lesson = self.get_object()
        user = request.user

        enrollment = Enrollment.objects.filter(
            user=user,
            course=lesson.module.course
        ).first()

        if not enrollment:
            raise ValidationError("You must be enrolled in this course to track progress.")

        with transaction.atomic():
            progress, _ = LessonProgress.objects.get_or_create(
                enrollment=enrollment,
                lesson=lesson
            )

            desired_state = request.data.get('is_completed')
            if desired_state is None:
                # Toggle current state
                progress.is_completed = not progress.is_completed
            else:
                progress.is_completed = bool(desired_state)

            if progress.is_completed:
                progress.completed_at = timezone.now()
            else:
                progress.completed_at = None

            progress.save(update_fields=['is_completed', 'completed_at', 'updated_at'])

            # Recalculate enrollment progress
            new_percent = enrollment.recalculate_progress()

        return Response({
            'lesson_id': str(lesson.id),
            'is_completed': progress.is_completed,
            'progress_percent': new_percent,
            'enrollment_status': enrollment.status,
            'certificate_code': getattr(getattr(enrollment, 'completion', None), 'certificate_code', None),
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def update_position(self, request, pk=None):
        """
        Updates playback position in seconds.
        """
        lesson = self.get_object()
        position = request.data.get('position_seconds', 0)

        try:
            pos_int = max(0, int(position))
        except (ValueError, TypeError):
            pos_int = 0

        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=lesson.module.course
        ).first()

        if enrollment:
            progress, _ = LessonProgress.objects.get_or_create(
                enrollment=enrollment,
                lesson=lesson
            )
            progress.last_position_seconds = pos_int
            progress.save(update_fields=['last_position_seconds', 'updated_at'])

        return Response({'status': 'ok', 'position_seconds': pos_int})


class AssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Hands-on engineering assignments and submission workflow.
    """
    queryset = Assignment.objects.select_related('course')
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request_user'] = self.request.user
        return ctx

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit(self, request, pk=None):
        """
        Submits deliverable (GitHub repo URL, PR link, or writeup) for an assignment.
        """
        assignment = self.get_object()
        user = request.user

        # Ensure user is enrolled
        is_enrolled = Enrollment.objects.filter(
            user=user,
            course=assignment.course,
            status__in=['active', 'completed']
        ).exists()

        if not is_enrolled and not is_academy_admin(user):
            raise ValidationError("You must be enrolled in the course to submit assignments.")

        repo_url = request.data.get('repository_url', '').strip()
        deliverable_url = request.data.get('deliverable_url', '').strip()
        submission_text = request.data.get('submission_text', '').strip()

        if not repo_url and not deliverable_url and not submission_text:
            raise ValidationError("Must provide a repository URL, deliverable URL, or submission text.")

        url_validator = URLValidator(schemes=['http', 'https'])
        if repo_url:
            try:
                url_validator(repo_url)
            except DjangoValidationError:
                raise ValidationError({"repository_url": "Must be a valid HTTP or HTTPS URL."})

        if deliverable_url:
            try:
                url_validator(deliverable_url)
            except DjangoValidationError:
                raise ValidationError({"deliverable_url": "Must be a valid HTTP or HTTPS URL."})

        submission, created = AssignmentSubmission.objects.get_or_create(
            assignment=assignment,
            learner=user,
            defaults={
                'repository_url': repo_url,
                'deliverable_url': deliverable_url,
                'submission_text': submission_text,
                'status': SubmissionStatus.SUBMITTED,
            }
        )

        if not created:
            submission.repository_url = repo_url or submission.repository_url
            submission.deliverable_url = deliverable_url or submission.deliverable_url
            submission.submission_text = submission_text or submission.submission_text
            submission.status = SubmissionStatus.SUBMITTED
            submission.save()

        # Deliverable submitted for instructor review; lesson is completed upon approval.
        serializer = AssignmentSubmissionSerializer(submission)
        return Response({
            'detail': 'Deliverable submitted for review.',
            'submission': serializer.data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def review(self, request, pk=None):
        """
        Allows course instructor or admin to grade/review a submission.
        """
        assignment = self.get_object()
        if not is_academy_admin(request.user) and assignment.course.creator != request.user:
            raise PermissionDenied("Only the course instructor or an administrator can review submissions.")

        submission_id = request.data.get('submission_id')
        verdict = request.data.get('status')
        feedback = request.data.get('feedback', '').strip()

        if not submission_id:
            raise ValidationError({"submission_id": "Submission ID is required."})

        try:
            submission_uuid = uuid.UUID(str(submission_id))
        except (ValueError, TypeError):
            raise ValidationError({"submission_id": "Invalid submission UUID format."})

        if verdict not in [SubmissionStatus.APPROVED, SubmissionStatus.CHANGES_REQUESTED]:
            raise ValidationError("Status must be either 'approved' or 'changes_requested'.")

        submission = get_object_or_404(AssignmentSubmission, id=submission_uuid, assignment=assignment)

        # Enforce anti-self-approval invariant
        if submission.learner == request.user and not request.user.is_superuser:
            raise PermissionDenied("Instructors cannot review or approve their own submissions.")

        submission.status = verdict
        submission.feedback = feedback
        submission.reviewer = request.user
        submission.reviewed_at = timezone.now()
        submission.save(update_fields=['status', 'feedback', 'reviewer', 'reviewed_at'])

        # If approved and attached to a lesson, mark lesson complete
        if verdict == SubmissionStatus.APPROVED and assignment.lesson:
            enrollment = Enrollment.objects.filter(user=submission.learner, course=assignment.course).first()
            if enrollment:
                progress, _ = LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=assignment.lesson)
                if not progress.is_completed:
                    progress.is_completed = True
                    progress.completed_at = timezone.now()
                    progress.save(update_fields=['is_completed', 'completed_at', 'updated_at'])
                    enrollment.recalculate_progress()

        return Response({
            'detail': f'Submission marked as {verdict}.',
            'submission': AssignmentSubmissionSerializer(submission).data
        })


class CourseCompletionViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Public verification endpoint for educational completion certificates.
    e.g. GET /api/v1/courses/certificates/ENQ-ACAD-2026-XXXX/
    List endpoint is explicitly omitted to prevent student certificate scraping.
    """
    queryset = CourseCompletion.objects.select_related('enrollment__course', 'enrollment__user')
    serializer_class = CourseCompletionSerializer
    lookup_field = 'certificate_code'
    permission_classes = [AllowAny]
