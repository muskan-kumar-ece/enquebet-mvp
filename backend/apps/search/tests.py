"""
Comprehensive test suite for ENQUEbet Search & Builder Discovery Engine.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.users.models import UserSkill, Follower
from apps.posts.models import Post, PostTag, PostRequirement, PostReport

User = get_user_model()


class SearchAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create active users
        self.user1 = User.objects.create_user(
            email='alice@stanford.edu',
            username='alice_dev',
            full_name='Alice Architect',
            headline='Distributed Systems & Rust Engineer',
            bio='Building high-throughput databases and open protocols.',
            location='San Francisco, CA',
            college='Stanford University',
            reputation_score=150,
            verification_level=2,
            password='testpassword123',
        )
        UserSkill.objects.create(user=self.user1, skill_name='Rust', level='advanced')
        UserSkill.objects.create(user=self.user1, skill_name='Distributed Systems', level='advanced')

        self.user2 = User.objects.create_user(
            email='bob@mit.edu',
            username='bob_designer',
            full_name='Bob Chen',
            headline='Product Designer & UI Architect',
            bio='Crafting intuitive builder collaboration tools.',
            location='New York, NY',
            college='MIT',
            reputation_score=90,
            verification_level=1,
            password='testpassword123',
        )
        UserSkill.objects.create(user=self.user2, skill_name='Figma', level='advanced')
        UserSkill.objects.create(user=self.user2, skill_name='React', level='intermediate')

        # Private user
        self.private_user = User.objects.create_user(
            email='carol@secret.org',
            username='carol_stealth',
            full_name='Carol Stealth',
            headline='Stealth Founder',
            bio='Working in stealth mode.',
            location='Austin, TX',
            is_private=True,
            password='testpassword123',
        )

        # Create Posts
        self.post1 = Post.objects.create(
            user=self.user1,
            title='Autonomous Agent Orchestrator',
            description='Building a multi-agent framework in Rust and Python.',
            category='ai',
            view_type='public',
            location='San Francisco, CA',
        )
        PostTag.objects.create(post=self.post1, tag_name='agents')
        PostRequirement.objects.create(post=self.post1, role_name='Systems Engineer')

        self.post2 = Post.objects.create(
            user=self.user2,
            title='Modern SaaS Design System',
            description='Accessible design system for builder applications.',
            category='design',
            view_type='public',
            location='New York, NY',
        )
        PostTag.objects.create(post=self.post2, tag_name='design')
        PostRequirement.objects.create(post=self.post2, role_name='Design Lead')

        # Private post by private user
        self.private_post = Post.objects.create(
            user=self.private_user,
            title='Stealth Project Alpha',
            description='Confidential builder platform.',
            category='tech',
            view_type='public',
        )

    def test_unauthenticated_search_allowed(self):
        """Unauthenticated visitors must be able to search public builders and projects."""
        response = self.client.get('/api/v1/search/?q=Alice')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('users', response.data)
        self.assertIn('posts', response.data)
        self.assertIn('builders', response.data)
        self.assertIn('projects', response.data)
        self.assertEqual(len(response.data['builders']), 1)
        self.assertEqual(response.data['builders'][0]['username'], 'alice_dev')

    def test_empty_query_and_no_filters_returns_empty(self):
        """Empty query without filters should return 200 with empty lists."""
        response = self.client.get('/api/v1/search/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['builders'], [])
        self.assertEqual(response.data['projects'], [])
        self.assertEqual(response.data['pagination']['total_users'], 0)
        self.assertEqual(response.data['pagination']['total_posts'], 0)

    def test_search_builders_by_name_and_username(self):
        """Searching by username or full name returns matching builder."""
        resp1 = self.client.get('/api/v1/search/?q=bob_designer')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp1.data['builders']), 1)
        self.assertEqual(resp1.data['builders'][0]['username'], 'bob_designer')

        # Search by full name
        resp2 = self.client.get('/api/v1/search/?q=Alice')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp2.data['builders']), 1)
        self.assertEqual(resp2.data['builders'][0]['username'], 'alice_dev')

        # Search by headline keyword matching multiple builders
        resp3 = self.client.get('/api/v1/search/?q=Architect')
        self.assertEqual(resp3.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp3.data['builders']), 2)
        builder_usernames = [u['username'] for u in resp3.data['builders']]
        self.assertIn('alice_dev', builder_usernames)
        self.assertIn('bob_designer', builder_usernames)

    def test_search_builders_by_skill(self):
        """Searching by skill name via text query or skills filter matches UserSkill."""
        # Query search matching skill
        resp1 = self.client.get('/api/v1/search/?q=Rust')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        builder_usernames = [u['username'] for u in resp1.data['builders']]
        self.assertIn('alice_dev', builder_usernames)

        # Explicit skills filter parameter
        resp2 = self.client.get('/api/v1/search/?skills=Figma')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp2.data['builders']), 1)
        self.assertEqual(resp2.data['builders'][0]['username'], 'bob_designer')

    def test_search_builders_by_location_and_college(self):
        """Filters by location and college properly scope builder results."""
        resp1 = self.client.get('/api/v1/search/?location=Francisco')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp1.data['builders']), 1)
        self.assertEqual(resp1.data['builders'][0]['username'], 'alice_dev')

        resp2 = self.client.get('/api/v1/search/?college=MIT')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp2.data['builders']), 1)
        self.assertEqual(resp2.data['builders'][0]['username'], 'bob_designer')

    def test_search_projects_by_title_and_description(self):
        """Project search matches keywords in title and description."""
        resp = self.client.get('/api/v1/search/?q=Orchestrator')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['projects']), 1)
        self.assertEqual(resp.data['projects'][0]['title'], 'Autonomous Agent Orchestrator')

    def test_search_projects_by_tag_and_role(self):
        """Project search matches keywords in tags or required roles."""
        # Match by tag 'agents'
        resp1 = self.client.get('/api/v1/search/?q=agents')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp1.data['projects']), 1)
        self.assertEqual(resp1.data['projects'][0]['id'], str(self.post1.id))

        # Match by required role 'Design Lead' via role filter
        resp2 = self.client.get('/api/v1/search/?role=Design')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp2.data['projects']), 1)
        self.assertEqual(resp2.data['projects'][0]['id'], str(self.post2.id))

    def test_search_projects_category_filter(self):
        """Filtering by category correctly restricts project results."""
        resp = self.client.get('/api/v1/search/?category=ai')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['projects']), 1)
        self.assertEqual(resp.data['projects'][0]['category'], 'ai')

    def test_search_moderation_excludes_reported_posts(self):
        """Posts with 3 or more reports must be excluded from search results."""
        reporter1 = User.objects.create_user(email='r1@test.com', username='r1')
        reporter2 = User.objects.create_user(email='r2@test.com', username='r2')
        reporter3 = User.objects.create_user(email='r3@test.com', username='r3')

        PostReport.objects.create(post=self.post2, reporter=reporter1, reason='Spam')
        PostReport.objects.create(post=self.post2, reporter=reporter2, reason='Abuse')
        PostReport.objects.create(post=self.post2, reporter=reporter3, reason='Misleading')

        resp = self.client.get('/api/v1/search/?q=Design')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # self.post2 should be excluded because it has 3 reports
        project_ids = [p['id'] for p in resp.data['projects']]
        self.assertNotIn(str(self.post2.id), project_ids)

    def test_search_privacy_excludes_private_posts_for_non_followers(self):
        """Posts authored by private users must not appear to unauthenticated or non-follower users."""
        # Anonymous search
        resp1 = self.client.get('/api/v1/search/?q=Stealth')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        project_ids1 = [p['id'] for p in resp1.data['projects']]
        self.assertNotIn(str(self.private_post.id), project_ids1)

        # Authenticated as non-follower (user1)
        self.client.force_authenticate(user=self.user1)
        resp2 = self.client.get('/api/v1/search/?q=Stealth')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        project_ids2 = [p['id'] for p in resp2.data['projects']]
        self.assertNotIn(str(self.private_post.id), project_ids2)

        # Authenticated as follower (user1 follows private_user)
        Follower.objects.create(follower=self.user1, following=self.private_user)
        resp3 = self.client.get('/api/v1/search/?q=Stealth')
        self.assertEqual(resp3.status_code, status.HTTP_200_OK)
        project_ids3 = [p['id'] for p in resp3.data['projects']]
        self.assertIn(str(self.private_post.id), project_ids3)

    def test_search_pagination_modes(self):
        """Dedicated builder/project search returns paginated slices and metadata."""
        # Type: builders
        resp_builders = self.client.get('/api/v1/search/?q=e&type=builders&page=1&page_size=1')
        self.assertEqual(resp_builders.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_builders.data['builders']), 1)
        self.assertEqual(len(resp_builders.data['projects']), 0)
        self.assertEqual(resp_builders.data['pagination']['page'], 1)
        self.assertEqual(resp_builders.data['pagination']['page_size'], 1)
        self.assertTrue(resp_builders.data['pagination']['total_users'] >= 2)
        self.assertTrue(resp_builders.data['pagination']['has_next'])

        # Type: projects
        resp_projects = self.client.get('/api/v1/search/?q=Framework&type=projects&page=1&page_size=10')
        self.assertEqual(resp_projects.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_projects.data['builders']), 0)
        self.assertEqual(len(resp_projects.data['projects']), 1)
        self.assertEqual(resp_projects.data['pagination']['total_posts'], 1)

    def test_search_suggestions(self):
        """Auto-complete endpoint returns structured suggestions."""
        # Short query returns empty
        resp_short = self.client.get('/api/v1/search/suggestions/?q=a')
        self.assertEqual(resp_short.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_short.data['builders'], [])

        # Meaningful query
        resp = self.client.get('/api/v1/search/suggestions/?q=al')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('skills', resp.data)
        self.assertIn('colleges', resp.data)
        self.assertIn('categories', resp.data)
        self.assertIn('builders', resp.data)
        builder_usernames = [b['username'] for b in resp.data['builders']]
        self.assertIn('alice_dev', builder_usernames)

    def test_search_builders_availability_and_verified(self):
        """Availability and verified_only filters work as expected."""
        self.user1.availability_status = 'open_to_cofound'
        self.user1.save()

        # Filter by availability
        resp = self.client.get('/api/v1/search/?type=builders&availability=open_to_cofound')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in resp.data['builders']]
        self.assertIn('alice_dev', usernames)
        self.assertNotIn('bob_designer', usernames)

        # Filter by verified_only
        resp_v = self.client.get('/api/v1/search/?type=builders&verified_only=true')
        self.assertEqual(resp_v.status_code, status.HTTP_200_OK)
        for u in resp_v.data['builders']:
            self.assertGreater(u.get('verification_level', 0), 0)

    def test_search_sort_by_reputation(self):
        """sort_by=reputation orders highest reputation first."""
        resp = self.client.get('/api/v1/search/?type=builders&sort_by=reputation')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        builders = resp.data['builders']
        self.assertGreaterEqual(len(builders), 2)
        # alice_dev reputation is 150, bob_designer is 90
        self.assertEqual(builders[0]['username'], 'alice_dev')
        self.assertEqual(builders[1]['username'], 'bob_designer')

