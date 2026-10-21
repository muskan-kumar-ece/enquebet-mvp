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
    CourseOrder,
    CourseEntitlement,
    DifficultyLevel,
    CourseFormat,
    CourseStatus,
    AccessTier,
    ContentType,
    EnrollmentStatus,
    SubmissionStatus,
    OrderStatus,
    PaymentGateway,
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
        enrollment = Enrollment.objects.create(user=self.learner, course=self.course)
        self.client.force_authenticate(user=self.learner)

        # Attach assignment to lesson 2
        self.assignment.lesson = self.lesson2
        self.assignment.save(update_fields=['lesson'])

        # Submit deliverable
        sub_res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/submit/', {
            'repository_url': 'https://github.com/learner/workspace-engine',
            'submission_text': 'Implemented real-time kanban with Daphne and Redis.'
        })
        self.assertEqual(sub_res.status_code, status.HTTP_201_CREATED)
        submission_id = sub_res.data['submission']['id']

        # Ensure submitting alone does NOT mark lesson complete (SEC-04 fix verification)
        progress = LessonProgress.objects.filter(enrollment=enrollment, lesson=self.lesson2).first()
        self.assertTrue(progress is None or not progress.is_completed)

        # Review as instructor with approval
        self.client.force_authenticate(user=self.instructor)
        review_res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/review/', {
            'submission_id': submission_id,
            'status': SubmissionStatus.APPROVED,
            'feedback': 'Excellent clean architecture.'
        })
        self.assertEqual(review_res.status_code, status.HTTP_200_OK)
        self.assertEqual(review_res.data['submission']['status'], 'approved')

        # Now lesson 2 progress must be completed
        progress = LessonProgress.objects.filter(enrollment=enrollment, lesson=self.lesson2).first()
        self.assertIsNotNone(progress)
        self.assertTrue(progress.is_completed)

    def test_anti_self_approval(self):
        """Instructors cannot approve their own assignment submissions"""
        Enrollment.objects.create(user=self.instructor, course=self.course)
        self.client.force_authenticate(user=self.instructor)

        sub_res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/submit/', {
            'repository_url': 'https://github.com/instructor/solution',
            'submission_text': 'My own submission.'
        })
        self.assertEqual(sub_res.status_code, status.HTTP_201_CREATED)
        submission_id = sub_res.data['submission']['id']

        # Attempt to approve own submission
        review_res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/review/', {
            'submission_id': submission_id,
            'status': SubmissionStatus.APPROVED,
            'feedback': 'Self approval should fail.'
        })
        self.assertEqual(review_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_url_and_uuid_validation(self):
        """Ensures bad URLs and malformed UUIDs are rejected with 400 Bad Request"""
        Enrollment.objects.create(user=self.learner, course=self.course)
        self.client.force_authenticate(user=self.learner)

        # Disallowed URL scheme (e.g. javascript:)
        bad_url_res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/submit/', {
            'repository_url': 'javascript:alert("XSS")',
            'submission_text': 'Exploit attempt.'
        })
        self.assertEqual(bad_url_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Malformed submission UUID in review
        self.client.force_authenticate(user=self.instructor)
        bad_uuid_res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/review/', {
            'submission_id': 'not-a-valid-uuid',
            'status': SubmissionStatus.APPROVED,
        })
        self.assertEqual(bad_uuid_res.status_code, status.HTTP_400_BAD_REQUEST)


class SecurityAndAccessControlTests(AcademyBaseTestCase):
    """Verifies prevention of curriculum leak, certificate scraping, and premium bypass"""
    def test_lesson_list_endpoint_disabled(self):
        """Anonymous or authenticated users cannot dump all curriculum via GET /lessons/"""
        res = self.client.get('/api/v1/courses/lessons/')
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_405_METHOD_NOT_ALLOWED])

    def test_certificate_list_endpoint_disabled(self):
        """Public users cannot scrape or enumerate certificates via GET /certificates/"""
        res = self.client.get('/api/v1/courses/certificates/')
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_405_METHOD_NOT_ALLOWED])

    def test_premium_course_enrollment_protection(self):
        """Learners cannot self-enroll in premium courses without administrative authorization"""
        self.course.access_tier = AccessTier.PREMIUM
        self.course.price_inr = 4999
        self.course.save(update_fields=['access_tier', 'price_inr'])

        self.client.force_authenticate(user=self.learner)
        res = self.client.post(f'/api/v1/courses/{self.course.slug}/enroll/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


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


class PaidCoursesMonetizationTests(AcademyBaseTestCase):
    """
    Exhaustive test suite for Paid Courses, Orders, Razorpay verification,
    Entitlements, and Admin Scholarships.
    """
    def setUp(self):
        super().setUp()
        self.paid_course = Course.objects.create(
            slug='advanced-ai-agents',
            title='Autonomous AI Agent Architectures',
            short_description='Build multi-agent frameworks in production',
            full_description='Advanced deep dive into multi-agent swarms.',
            category=self.category,
            difficulty=DifficultyLevel.ADVANCED,
            format=CourseFormat.PROJECT_BASED,
            estimated_hours=25,
            creator=self.instructor,
            status=CourseStatus.PUBLISHED,
            access_tier=AccessTier.PREMIUM,
            price_inr=2499,
            skills_gained=['Python', 'LangGraph', 'Vector DBs'],
        )
        self.paid_mod = CourseModule.objects.create(
            course=self.paid_course,
            title='Module 1: Agent Systems',
            order=1
        )
        self.preview_lesson = Lesson.objects.create(
            module=self.paid_mod,
            title='Preview: Agent Concepts',
            slug='preview-agent-concepts',
            content_type=ContentType.ARTICLE,
            duration_minutes=15,
            is_preview=True,
            order=1,
            article_markdown='# Free Preview Content'
        )
        self.gated_lesson = Lesson.objects.create(
            module=self.paid_mod,
            title='Gated: Deep Reinforcement Agents',
            slug='gated-rl-agents',
            content_type=ContentType.WALKTHROUGH,
            duration_minutes=45,
            is_preview=False,
            order=2,
            article_markdown='# Gated Deep Dive Content'
        )
        self.admin_user = User.objects.create_superuser(
            username='platform_admin',
            email='admin@enquebet.com',
            password='AdminPassword123!',
            full_name='Platform Admin'
        )

    def test_preview_lesson_accessible_without_entitlement(self):
        """Free preview lesson in a paid course can be read by anyone anonymously"""
        res = self.client.get(f'/api/v1/courses/lessons/{self.preview_lesson.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('Free Preview Content', res.data['article_markdown'])

    def test_gated_lesson_blocked_without_entitlement(self):
        """Non-preview lesson in a paid course is blocked with 403 for non-purchased learners"""
        self.client.force_authenticate(user=self.learner)
        res = self.client.get(f'/api/v1/courses/lessons/{self.gated_lesson.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_order_generates_pending_order(self):
        """Calling create-order generates a CourseOrder with simulated/gateway order ID"""
        self.client.force_authenticate(user=self.learner)
        res = self.client.post(f'/api/v1/courses/{self.paid_course.slug}/create-order/', {
            'billing_name': 'Bob Learner',
            'billing_email': 'bob@example.com'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['amount_inr'], 2499)
        self.assertEqual(res.data['amount_paise'], 249900)
        self.assertTrue(res.data['order_number'].startswith('ENQ-ORD-'))
        self.assertTrue(res.data['gateway_order_id'])

        order = CourseOrder.objects.get(order_number=res.data['order_number'])
        self.assertEqual(order.status, OrderStatus.PENDING)
        self.assertEqual(order.user, self.learner)

    def test_verify_payment_settles_and_unlocks_curriculum(self):
        """Verifying payment marks order paid, creates entitlement, and allows lesson playback"""
        self.client.force_authenticate(user=self.learner)
        # 1. Create order
        create_res = self.client.post(f'/api/v1/courses/{self.paid_course.slug}/create-order/')
        order_num = create_res.data['order_number']

        # 2. Verify payment (in test/sandbox simulation mode)
        verify_res = self.client.post(f'/api/v1/courses/{self.paid_course.slug}/verify-payment/', {
            'order_number': order_num,
            'gateway_payment_id': 'pay_simulated_test_123',
            'gateway_signature': 'sig_simulated_test_123'
        })
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertEqual(verify_res.data['status'], OrderStatus.PAID)

        # 3. Verify Entitlement exists
        self.assertTrue(
            CourseEntitlement.objects.filter(user=self.learner, course=self.paid_course, is_active=True).exists()
        )

        # 4. Gated lesson is now unlocked and accessible!
        lesson_res = self.client.get(f'/api/v1/courses/lessons/{self.gated_lesson.id}/')
        self.assertEqual(lesson_res.status_code, status.HTTP_200_OK)
        self.assertIn('Gated Deep Dive Content', lesson_res.data['article_markdown'])

    def test_admin_scholarship_grant_unlocks_course(self):
        """Admin can grant zero-cost scholarship to a learner, unlocking access"""
        # Non-admin cannot grant
        self.client.force_authenticate(user=self.learner)
        fail_res = self.client.post(f'/api/v1/courses/{self.paid_course.slug}/grant-access/', {
            'username': self.learner.username,
            'reason': 'Merit'
        })
        self.assertEqual(fail_res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can grant
        self.client.force_authenticate(user=self.admin_user)
        success_res = self.client.post(f'/api/v1/courses/{self.paid_course.slug}/grant-access/', {
            'username': self.learner.username,
            'reason': 'Merit Scholarship'
        })
        self.assertEqual(success_res.status_code, status.HTTP_200_OK)
        self.assertTrue(success_res.data['is_active'])

        # Learner can now access gated lesson
        self.client.force_authenticate(user=self.learner)
        lesson_res = self.client.get(f'/api/v1/courses/lessons/{self.gated_lesson.id}/')
        self.assertEqual(lesson_res.status_code, status.HTTP_200_OK)

    def test_webhook_payment_fulfillment(self):
        """Simulated Razorpay server webhook settles order asynchronously"""
        self.client.force_authenticate(user=self.learner)
        create_res = self.client.post(f'/api/v1/courses/{self.paid_course.slug}/create-order/')
        gateway_ord_id = create_res.data['gateway_order_id']

        webhook_payload = {
            'event': 'order.paid',
            'payload': {
                'payment': {
                    'entity': {
                        'id': 'pay_webhook_live_456',
                        'order_id': gateway_ord_id
                    }
                }
            }
        }
        import json
        res = self.client.post(
            '/api/v1/courses/payments/webhook/',
            data=json.dumps(webhook_payload),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Entitlement verified
        self.assertTrue(
            CourseEntitlement.objects.filter(user=self.learner, course=self.paid_course, is_active=True).exists()
        )
