"""
Unit and Integration Test Suite for ENQUEbet Academy
"""
import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.courses.models import (
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
    DifficultyLevel,
    CourseFormat,
    CourseStatus,
    AccessTier,
    ContentType,
    EnrollmentStatus,
    SubmissionStatus,
)

User = get_user_model()


class AcademyBaseTestCase(TestCase):
    """Base setup with test users, taxonomy, course hierarchy, and API clients"""
    def setUp(self):
        self.client = APIClient()
        self.instructor = User.objects.create_user(
            username='instructor_alice',
            email='alice@example.com',
            password='Password123!',
            full_name='Alice Instructor',
            headline='Principal Systems Architect',
            reputation_score=100
        )
        self.learner = User.objects.create_user(
            username='learner_bob',
            email='bob@example.com',
            password='Password123!',
            full_name='Bob Learner',
            headline='Junior Software Engineer',
            reputation_score=10
        )
        self.category = CourseCategory.objects.create(
            name='Web Systems',
            slug='web-systems',
            icon='Code',
            description='Web systems engineering'
        )
        self.course = Course.objects.create(
            slug='fullstack-saas',
            title='Fullstack SaaS Architecture',
            short_description='Build production SaaS platforms',
            full_description='Complete end-to-end curriculum',
            category=self.category,
            difficulty=DifficultyLevel.INTERMEDIATE,
            format=CourseFormat.PROJECT_BASED,
            estimated_hours=15,
            creator=self.instructor,
            status=CourseStatus.PUBLISHED,
            access_tier=AccessTier.FREE,
            skills_gained=['Next.js', 'Django', 'PostgreSQL'],
            project_outcome_title='Real-time Workspace',
            starter_repo_url='https://github.com/enquebet/starter'
        )
        self.module = CourseModule.objects.create(
            course=self.course,
            title='Module 1: Foundations',
            order=1
        )
        self.lesson1 = Lesson.objects.create(
            module=self.module,
            title='Lesson 1: Introduction',
            slug='lesson-1-intro',
            content_type=ContentType.ARTICLE,
            duration_minutes=10,
            is_preview=True,
            order=1,
            article_markdown='# Lesson 1 Content'
        )
        self.lesson2 = Lesson.objects.create(
            module=self.module,
            title='Lesson 2: Advanced Topics',
            slug='lesson-2-advanced',
            content_type=ContentType.WALKTHROUGH,
            duration_minutes=20,
            is_preview=False,
            order=2,
            article_markdown='# Lesson 2 Content'
        )
        self.assignment = Assignment.objects.create(
            course=self.course,
            lesson=self.lesson2,
            title='Assignment 1: Build Workspace',
            instructions_markdown='Implement the workspace engine',
            acceptance_criteria=['Criteria 1', 'Criteria 2'],
            starter_repo_url='https://github.com/enquebet/starter'
        )


class CourseCatalogTests(AcademyBaseTestCase):
    """Catalog discovery, search, and category tests"""
    def test_list_published_courses(self):
        res = self.client.get('/api/v1/courses/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['slug'], 'fullstack-saas')
        self.assertEqual(results[0]['title'], 'Fullstack SaaS Architecture')

    def test_filter_by_category(self):
        res = self.client.get('/api/v1/courses/?category=web-systems')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)

        res_empty = self.client.get('/api/v1/courses/?category=non-existent')
        self.assertEqual(res_empty.status_code, status.HTTP_200_OK)
        empty_results = res_empty.data.get('results', res_empty.data)
        self.assertEqual(len(empty_results), 0)

    def test_course_detail_contains_modules_and_lessons(self):
        res = self.client.get('/api/v1/courses/fullstack-saas/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['slug'], 'fullstack-saas')
        self.assertEqual(len(res.data['modules']), 1)
        self.assertEqual(len(res.data['modules'][0]['lessons']), 2)


class EnrollmentAndProgressTests(AcademyBaseTestCase):
    """Enrollment, progress calculation, and completion certificate tests"""
    def test_enroll_in_course(self):
        self.client.force_authenticate(user=self.learner)
        res = self.client.post('/api/v1/courses/fullstack-saas/enroll/')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Enrollment.objects.filter(user=self.learner, course=self.course).exists())

        # Second enrollment attempt is idempotent
        res_idempotent = self.client.post('/api/v1/courses/fullstack-saas/enroll/')
        self.assertEqual(res_idempotent.status_code, status.HTTP_200_OK)

    def test_lesson_access_permissions(self):
        # Lesson 1 is preview: accessible anonymously
        res1 = self.client.get(f'/api/v1/courses/lessons/{self.lesson1.id}/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Lesson 2 is non-preview: forbidden for non-enrolled user
        self.client.force_authenticate(user=self.learner)
        res2_forbidden = self.client.get(f'/api/v1/courses/lessons/{self.lesson2.id}/')
        self.assertEqual(res2_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # Enroll learner
        Enrollment.objects.create(user=self.learner, course=self.course)

        # Lesson 2 is now accessible
        res2_allowed = self.client.get(f'/api/v1/courses/lessons/{self.lesson2.id}/')
        self.assertEqual(res2_allowed.status_code, status.HTTP_200_OK)

    def test_progress_completion_and_integrity_boundary(self):
        """
        Completing 100% of lessons generates a CourseCompletion educational certificate,
        but NEVER increments builder reputation or mints a ProofOfWork.
        """
        enrollment = Enrollment.objects.create(user=self.learner, course=self.course)
        self.client.force_authenticate(user=self.learner)

        initial_rep = self.learner.reputation_score

        # Complete lesson 1
        res1 = self.client.post(f'/api/v1/courses/lessons/{self.lesson1.id}/toggle_complete/', {'is_completed': True})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['progress_percent'], 50)

        # Complete lesson 2 (100% finished!)
        res2 = self.client.post(f'/api/v1/courses/lessons/{self.lesson2.id}/toggle_complete/', {'is_completed': True})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['progress_percent'], 100)
        self.assertEqual(res2.data['enrollment_status'], 'completed')
        self.assertIsNotNone(res2.data['certificate_code'])

        # Verify educational certificate exists
        completion = CourseCompletion.objects.filter(enrollment=enrollment).first()
        self.assertIsNotNone(completion)
        self.assertTrue(completion.certificate_code.startswith('ENQ-ACAD-'))

        # CRITICAL INTEGRITY CHECK: User reputation MUST NOT change!
        self.learner.refresh_from_db()
        self.assertEqual(self.learner.reputation_score, initial_rep)


class AssignmentWorkflowTests(AcademyBaseTestCase):
    """Assignment submission and instructor review tests"""
    def test_submit_and_review_assignment(self):
        Enrollment.objects.create(user=self.learner, course=self.course)
        self.client.force_authenticate(user=self.learner)

        # Submit deliverable
        sub_res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/submit/', {
            'repository_url': 'https://github.com/learner/workspace-engine',
            'submission_text': 'Implemented real-time kanban with Daphne and Redis.'
        })
        self.assertEqual(sub_res.status_code, status.HTTP_201_CREATED)
        submission_id = sub_res.data['submission']['id']

        # Review as instructor
        self.client.force_authenticate(user=self.instructor)
        review_res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/review/', {
            'submission_id': submission_id,
            'status': SubmissionStatus.APPROVED,
            'feedback': 'Excellent clean architecture.'
        })
        self.assertEqual(review_res.status_code, status.HTTP_200_OK)
        self.assertEqual(review_res.data['submission']['status'], 'approved')


class CourseBookmarkTests(AcademyBaseTestCase):
    """Course bookmark toggle tests"""
    def test_toggle_bookmark(self):
        self.client.force_authenticate(user=self.learner)
        res_add = self.client.post('/api/v1/courses/fullstack-saas/bookmark/')
        self.assertEqual(res_add.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res_add.data['bookmarked'])

        res_remove = self.client.post('/api/v1/courses/fullstack-saas/bookmark/')
        self.assertEqual(res_remove.status_code, status.HTTP_200_OK)
        self.assertFalse(res_remove.data['bookmarked'])
