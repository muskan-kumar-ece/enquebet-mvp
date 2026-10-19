"""
Test suite for Engineering Resources and Admin Moderation Workflow
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Resource, ResourceCategory, ResourceFileType, ApprovalStatus

User = get_user_model()


class ResourceModerationTests(APITestCase):
    def setUp(self):
        # Create normal user
        self.user = User.objects.create_user(
            username='builder_alice',
            email='alice@example.com',
            password='Password123!',
            full_name='Alice Builder'
        )

        # Create second normal user
        self.bob = User.objects.create_user(
            username='builder_bob',
            email='bob@example.com',
            password='Password123!',
            full_name='Bob Engineer'
        )

        # Create admin user
        self.admin = User.objects.create_user(
            username='staff_kumar',
            email='kumar@example.com',
            password='Password123!',
            full_name='Kumar Admin',
            is_staff=True
        )

        # Create a pending resource uploaded by Alice
        self.pending_resource = Resource.objects.create(
            uploader=self.user,
            title='Distributed Consensus Protocols Manual',
            description='Deep dive into Raft and Paxos implementations in Rust.',
            category=ResourceCategory.SYSTEM_DESIGN_SPECS,
            file_type=ResourceFileType.PDF,
            file_url='https://example.com/consensus.pdf',
            status=ApprovalStatus.PENDING_APPROVAL
        )

        # Create an approved resource
        self.approved_resource = Resource.objects.create(
            uploader=self.bob,
            title='Linux Kernel Subsystem Architecture',
            description='Comprehensive breakdown of memory management and VFS.',
            category=ResourceCategory.BOOKS_TEXTBOOKS,
            file_type=ResourceFileType.PDF,
            file_url='https://example.com/linux.pdf',
            status=ApprovalStatus.APPROVED
        )

    def test_public_catalog_only_shows_approved_resources(self):
        """Anonymous or regular users should only see approved resources in public catalog."""
        response = self.client.get('/api/v1/resources/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], str(self.approved_resource.id))

    def test_unapproved_resource_not_accessible_by_other_user(self):
        """Bob cannot view Alice's pending resource detail."""
        self.client.force_authenticate(user=self.bob)
        response = self.client.get(f'/api/v1/resources/{self.pending_resource.slug}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_uploader_can_view_own_pending_resource(self):
        """Alice can view her own pending resource detail."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/resources/{self.pending_resource.slug}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ApprovalStatus.PENDING_APPROVAL)

    def test_uploader_can_view_my_submissions(self):
        """Alice can view her submissions tab."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/resources/?tab=my_submissions')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], str(self.pending_resource.id))

    def test_non_admin_cannot_access_moderation_queue(self):
        """Non-admin requesting moderation queue receives 403 Forbidden."""
        self.client.force_authenticate(user=self.bob)
        response = self.client.get('/api/v1/resources/?tab=moderation')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_moderation_queue(self):
        """Admin can list pending items in moderation queue."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/resources/?tab=moderation')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], str(self.pending_resource.id))

    def test_admin_can_approve_resource(self):
        """Admin can approve a pending resource and it becomes visible in public catalog."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/resources/{self.pending_resource.slug}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ApprovalStatus.APPROVED)

        self.pending_resource.refresh_from_db()
        self.assertEqual(self.pending_resource.status, ApprovalStatus.APPROVED)
        self.assertEqual(self.pending_resource.reviewed_by, self.admin)
        self.assertIsNotNone(self.pending_resource.reviewed_at)

        # Public catalog now shows both
        self.client.logout()
        pub_response = self.client.get('/api/v1/resources/')
        results = pub_response.data.get('results', pub_response.data)
        self.assertEqual(len(results), 2)

    def test_admin_can_reject_resource_with_reason(self):
        """Admin can reject a pending resource with reason."""
        self.client.force_authenticate(user=self.admin)
        reason_text = 'Document is missing citations and table of contents.'
        response = self.client.post(
            f'/api/v1/resources/{self.pending_resource.slug}/reject/',
            {'reason': reason_text}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ApprovalStatus.REJECTED)
        self.assertEqual(response.data['rejection_reason'], reason_text)

        self.pending_resource.refresh_from_db()
        self.assertEqual(self.pending_resource.status, ApprovalStatus.REJECTED)
        self.assertEqual(self.pending_resource.rejection_reason, reason_text)

    def test_non_admin_cannot_approve_or_reject(self):
        """Regular user receives 403 when trying to approve or reject."""
        self.client.force_authenticate(user=self.bob)
        app_res = self.client.post(f'/api/v1/resources/{self.pending_resource.slug}/approve/')
        self.assertEqual(app_res.status_code, status.HTTP_403_FORBIDDEN)

        rej_res = self.client.post(f'/api/v1/resources/{self.pending_resource.slug}/reject/', {'reason': 'test'})
        self.assertEqual(rej_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_resource_upload_defaults_to_pending_approval(self):
        """New uploads must default to PENDING_APPROVAL and never be immediately public."""
        self.client.force_authenticate(user=self.bob)
        payload = {
            'title': 'High Performance Go Concurrency Patterns',
            'description': 'Production patterns for channels, worker pools, and sync.Cond in high-throughput engines.',
            'category': ResourceCategory.STARTERS_CODE,
            'file_type': ResourceFileType.PDF,
            'file_url': 'https://example.com/go-patterns.pdf',
            'tags': ['go', 'concurrency', 'systems']
        }
        response = self.client.post('/api/v1/resources/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], ApprovalStatus.PENDING_APPROVAL)

        # Verify not in public catalog
        self.client.logout()
        pub_response = self.client.get('/api/v1/resources/')
        results = pub_response.data.get('results', pub_response.data)
        ids = [item['id'] for item in results]
        self.assertNotIn(response.data['id'], ids)

    def test_download_increments_counter(self):
        """Downloading resource increments download count and returns target URL."""
        self.assertEqual(self.approved_resource.downloads_count, 0)
        response = self.client.post(f'/api/v1/resources/{self.approved_resource.slug}/download/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['download_url'], 'https://example.com/linux.pdf')
        self.assertEqual(response.data['downloads_count'], 1)

        self.approved_resource.refresh_from_db()
        self.assertEqual(self.approved_resource.downloads_count, 1)
