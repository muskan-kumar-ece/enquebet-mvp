"""
Tests for Platform Updates API
"""
import uuid
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.users.models import User
from apps.updates.models import PlatformUpdate, UpdateCategory


class PlatformUpdatesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Regular user
        self.regular_user = User.objects.create_user(
            username='contributor_bob',
            email='bob@example.com',
            password='password123',
            full_name='Bob Contributor',
            is_staff=False,
        )

        # Admin user
        self.admin_user = User.objects.create_user(
            username='admin_alice',
            email='alice@example.com',
            password='password123',
            full_name='Alice Admin',
            is_staff=True,
            is_superuser=True,
        )

        # Sample updates
        self.update_1 = PlatformUpdate.objects.create(
            title="VenopAI Protocol 2.0 Alpha",
            category=UpdateCategory.PRODUCT_RELEASE,
            summary="Next-gen neural routing protocol deployed to testnet.",
            content="## Full Specification\nWe are excited to launch VenopAI Protocol 2.0 with zero-latency edge compute.",
            is_pinned=False,
            is_published=True,
            author=self.admin_user,
            documents=[{
                "name": "VenopAI_Protocol_Whitepaper.pdf",
                "url": "https://storage.enquebet.io/docs/whitepaper.pdf",
                "file_format": "pdf",
                "file_size_bytes": 1048576
            }],
            external_links=[{
                "title": "GitHub Release Notes",
                "url": "https://github.com/enquebet/venopai/releases/tag/v2.0"
            }]
        )

        self.update_pinned = PlatformUpdate.objects.create(
            title="Emergency Security Patch 1.4.2",
            category=UpdateCategory.SECURITY_MAINTENANCE,
            summary="Hotfix for websocket reconnection backoff vulnerability.",
            content="Patch has been merged and deployed across all gateway clusters.",
            is_pinned=True,
            is_published=True,
            author=self.admin_user,
        )

    def test_public_user_can_list_updates(self):
        """Anonymous user can list updates; pinned update comes first."""
        response = self.client.get('/api/v1/updates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 2)
        # Pinned item must be first
        self.assertEqual(results[0]['id'], str(self.update_pinned.id))
        self.assertTrue(results[0]['is_pinned'])

    def test_admin_user_can_create_update(self):
        """Admin user can publish an update with docs, links, and cover image."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "title": "Autonomous Drone Fleet Telemetry SDK",
            "category": UpdateCategory.ENGINEERING_DISPATCH,
            "summary": "Full hardware telemetry integration available for robotics teams.",
            "content": "### Installation\nRun `pip install enquebet-drone-sdk` to stream live sensor readings.",
            "cover_image": "https://res.cloudinary.com/enquebet/image/upload/v1/cover.png",
            "documents": [
                {
                    "name": "Hardware_Pinout_Diagram.pdf",
                    "url": "https://storage.enquebet.io/docs/pinout.pdf",
                    "file_format": "pdf",
                    "file_size_bytes": 204800
                }
            ],
            "external_links": [
                {
                    "title": "Interactive Hardware Pinout Explorer",
                    "url": "https://hardware.enquebet.io/explorer"
                }
            ],
            "is_pinned": False,
            "is_published": True,
        }
        response = self.client.post('/api/v1/updates/', data=payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], payload['title'])
        self.assertTrue(response.data['slug'].startswith('autonomous-drone-fleet'))

        # Check DB persistence
        created = PlatformUpdate.objects.get(id=response.data['id'])
        self.assertEqual(created.author, self.admin_user)
        self.assertEqual(len(created.documents), 1)
        self.assertEqual(len(created.external_links), 1)

    def test_regular_user_cannot_create_update(self):
        """Non-admin user gets 403 Forbidden when creating updates."""
        self.client.force_authenticate(user=self.regular_user)
        payload = {
            "title": "Unauthorized User Post",
            "category": UpdateCategory.COMMUNITY_NEWS,
            "summary": "Should be rejected.",
            "content": "Should not be published.",
        }
        response = self.client.post('/api/v1/updates/', data=payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_create_update(self):
        """Anonymous user gets 401/403 when creating updates."""
        payload = {
            "title": "Anonymous Post",
            "summary": "Should fail",
            "content": "Fail",
        }
        response = self.client.post('/api/v1/updates/', data=payload, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_category_filtering(self):
        """Query parameter ?category= filters dispatches appropriately."""
        response = self.client.get(f'/api/v1/updates/?category={UpdateCategory.SECURITY_MAINTENANCE}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], str(self.update_pinned.id))

    def test_search_filtering(self):
        """Query parameter ?search= searches title, summary, or content."""
        response = self.client.get('/api/v1/updates/?search=neural')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], str(self.update_1.id))

    def test_retrieve_by_slug_and_uuid(self):
        """Can retrieve detailed update by both slug and uuid."""
        # By slug
        response = self.client.get(f'/api/v1/updates/{self.update_1.slug}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], self.update_1.title)
        self.assertIn('## Full Specification', response.data['content'])
        self.assertEqual(len(response.data['documents']), 1)
        self.assertEqual(len(response.data['external_links']), 1)

        # By UUID
        response_uuid = self.client.get(f'/api/v1/updates/{self.update_1.id}/')
        self.assertEqual(response_uuid.status_code, status.HTTP_200_OK)
        self.assertEqual(response_uuid.data['id'], str(self.update_1.id))

    def test_admin_can_update_and_delete(self):
        """Admin can edit and delete updates."""
        self.client.force_authenticate(user=self.admin_user)
        patch_res = self.client.patch(
            f'/api/v1/updates/{self.update_1.slug}/',
            data={'title': 'VenopAI Protocol 2.0 Beta Released'},
            format='json'
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.update_1.refresh_from_db()
        self.assertEqual(self.update_1.title, 'VenopAI Protocol 2.0 Beta Released')

        # Delete
        delete_res = self.client.delete(f'/api/v1/updates/{self.update_1.slug}/')
        self.assertEqual(delete_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PlatformUpdate.objects.filter(id=self.update_1.id).exists())

    def test_regular_user_cannot_delete(self):
        """Regular user cannot delete an update."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(f'/api/v1/updates/{self.update_1.slug}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(PlatformUpdate.objects.filter(id=self.update_1.id).exists())

    def test_stats_and_categories_endpoints(self):
        """Category and stats endpoints return valid JSON metrics."""
        res_cat = self.client.get('/api/v1/updates/categories/')
        self.assertEqual(res_cat.status_code, status.HTTP_200_OK)
        self.assertGreater(len(res_cat.data), 0)

        res_stats = self.client.get('/api/v1/updates/stats/')
        self.assertEqual(res_stats.status_code, status.HTTP_200_OK)
        self.assertEqual(res_stats.data['total_count'], 2)
        self.assertEqual(res_stats.data['pinned_count'], 1)
