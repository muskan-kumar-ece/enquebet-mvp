from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from apps.users.models import User, UserSkill, Follower
from apps.posts.models import Post


class BuilderProfilePhase1Tests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='alice@example.com',
            username='alice',
            password='Password123!',
            full_name=''
        )
        self.client.force_authenticate(user=self.user)

    def test_headline_update_and_persistence(self):
        """Builder headline can be updated and persisted via /api/v1/users/me/"""
        payload = {
            'headline': 'Founding AI Engineer | Building ENQUEbet'
        }
        response = self.client.put('/api/v1/users/me/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['headline'], 'Founding AI Engineer | Building ENQUEbet')

        self.user.refresh_from_db()
        self.assertEqual(self.user.headline, 'Founding AI Engineer | Building ENQUEbet')

    def test_completeness_score_calculation(self):
        """Completeness score precisely calculates according to the 8 documented criteria"""
        # 1. Bare user with no fields filled: 0 points
        response = self.client.get('/api/v1/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['completeness_score'], 0)

        # 2. Add full_name: +10 -> 10
        self.user.full_name = 'Alice Builder'
        self.user.save()
        response = self.client.get('/api/v1/users/me/')
        self.assertEqual(response.data['completeness_score'], 10)

        # 3. Add bio: +15 -> 25
        self.user.bio = 'Passionate open-source builder.'
        self.user.save()
        response = self.client.get('/api/v1/users/me/')
        self.assertEqual(response.data['completeness_score'], 25)

        # 4. Add headline: +15 -> 40
        self.user.headline = 'Full Stack Engineer'
        self.user.save()
        response = self.client.get('/api/v1/users/me/')
        self.assertEqual(response.data['completeness_score'], 40)

        # 5. Add profile_image: +15 -> 55
        self.user.profile_image = 'https://example.com/avatar.jpg'
        self.user.save()
        response = self.client.get('/api/v1/users/me/')
        self.assertEqual(response.data['completeness_score'], 55)

        # 6. Add at least one skill: +15 -> 70
        UserSkill.objects.create(user=self.user, skill_name='Python', level='advanced')
        response = self.client.get('/api/v1/users/me/')
        self.assertEqual(response.data['completeness_score'], 70)

        # 7. Add college or location: +10 -> 80
        self.user.location = 'San Francisco, CA'
        self.user.save()
        response = self.client.get('/api/v1/users/me/')
        self.assertEqual(response.data['completeness_score'], 80)

        # 8. Add professional link (github): +10 -> 90
        self.user.github_url = 'https://github.com/alice'
        self.user.save()
        response = self.client.get('/api/v1/users/me/')
        self.assertEqual(response.data['completeness_score'], 90)

        # 9. Add education/experience/project entry: +10 -> 100
        self.user.experience = [{'title': 'Founding Engineer', 'company': 'Startup'}]
        self.user.save()
        response = self.client.get('/api/v1/users/me/')
        self.assertEqual(response.data['completeness_score'], 100)

    def test_client_cannot_self_award_verification_or_reputation(self):
        """Security: regular authenticated users cannot self-award verification or reputation"""
        self.assertEqual(self.user.verification_level, 0)
        self.assertEqual(self.user.reputation_score, 0)

        malicious_payload = {
            'verification_level': 3,
            'reputation_score': 9999,
            'completeness_score': 100
        }
        response = self.client.put('/api/v1/users/me/', malicious_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.verification_level, 0)
        self.assertEqual(self.user.reputation_score, 0)
        # Completeness score is computed, not overwritten
        self.assertEqual(response.data['verification_level'], 0)
        self.assertEqual(response.data['reputation_score'], 0)

    def test_skill_proficiency_levels_and_backwards_compatibility(self):
        """Skills accept both legacy string lists and structured proficiency objects"""
        # Test legacy string list
        legacy_payload = {
            'skills': ['Python', 'TypeScript']
        }
        response = self.client.put('/api/v1/users/me/', legacy_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Legacy clients receive string list
        self.assertEqual(set(response.data['skills']), {'Python', 'TypeScript'})
        # Skills detailed provides level (default intermediate)
        skills_detailed = response.data.get('skills_detailed', [])
        self.assertEqual(len(skills_detailed), 2)
        for s in skills_detailed:
            self.assertEqual(s['level'], 'intermediate')

        # Test structured proficiency payload
        structured_payload = {
            'skills': [
                {'skill_name': 'Python', 'level': 'advanced'},
                {'skill_name': 'Rust', 'level': 'beginner'}
            ]
        }
        response = self.client.put('/api/v1/users/me/', structured_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data['skills']), {'Python', 'Rust'})

        # Verify DB records
        python_skill = UserSkill.objects.get(user=self.user, skill_name='Python')
        rust_skill = UserSkill.objects.get(user=self.user, skill_name='Rust')
        self.assertEqual(python_skill.level, 'advanced')
        self.assertEqual(rust_skill.level, 'beginner')

    def test_private_profile_and_posts_privacy_enforcement(self):
        """Backend enforces strict privacy on private profiles and their posts"""
        # Set user as private with sensitive fields
        self.user.is_private = True
        self.user.full_name = 'Alice Private'
        self.user.headline = 'Stealth Builder'
        self.user.education = [{'school': 'MIT', 'degree': 'B.S.'}]
        self.user.experience = [{'title': 'Secret Project', 'company': 'Stealth'}]
        self.user.github_url = 'https://github.com/alice-secret'
        self.user.save()

        # Create a post for Alice
        post = Post.objects.create(
            user=self.user,
            title='Stealth work update',
            description='Working on stealth builder technology.',
            category='Engineering'
        )

        # Create viewer Bob
        bob = User.objects.create_user(
            email='bob@example.com',
            username='bob',
            password='Password123!'
        )
        self.client.force_authenticate(user=bob)

        # 1. Bob views Alice's profile while not following
        profile_url = f'/api/v1/users/{self.user.id}/'
        response = self.client.get(profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('is_private_locked'))
        # Sensitive details must be stripped
        self.assertNotIn('education', response.data)
        self.assertNotIn('experience', response.data)
        self.assertNotIn('github_url', response.data)
        self.assertNotIn('email', response.data)
        # Public identity basics remain visible
        self.assertEqual(response.data['username'], 'alice')
        self.assertEqual(response.data['headline'], 'Stealth Builder')

        # 2. Bob attempts to view Alice's posts while not following
        posts_url = f'/api/v1/users/{self.user.id}/posts/'
        response = self.client.get(posts_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Bob follows Alice
        Follower.objects.create(follower=bob, following=self.user)

        # Bob now has access to Alice's profile
        response = self.client.get(profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get('is_private_locked', False))
        self.assertIn('education', response.data)
        self.assertEqual(len(response.data['education']), 1)
        self.assertEqual(response.data['github_url'], 'https://github.com/alice-secret')

        # Bob now has access to Alice's posts
        response = self.client.get(posts_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        posts_data = response.data.get('results', response.data)
        self.assertEqual(len(posts_data), 1)

        # 4. Alice views her own profile
        self.client.force_authenticate(user=self.user)
        response = self.client.get(profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get('is_private_locked', False))
        self.assertIn('education', response.data)
        self.assertIn('email', response.data)


class BuilderDossierTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(
            email='alice.dossier@example.com',
            username='alicedossier',
            password='Password123!',
            full_name='Alice Architect',
            campus_domain='iitb.ac.in',
            headline='Distributed Systems & Rust'
        )
        self.bob = User.objects.create_user(
            email='bob.dossier@example.com',
            username='bobdossier',
            password='Password123!',
            full_name='Bob Builder'
        )
        self.client.force_authenticate(user=self.alice)

    def test_dossier_preferences_update(self):
        """Builder can update availability beacon, headline, and pinned proofs."""
        url = '/api/v1/users/me/dossier-preferences/'
        payload = {
            'availability_status': 'open_to_cofound',
            'headline': 'Building Autonomous Dev Teams',
            'pinned_proof_ids': ['11111111-2222-3333-4444-555555555555']
        }
        res = self.client.patch(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['availability_status'], 'open_to_cofound')
        self.assertEqual(res.data['headline'], 'Building Autonomous Dev Teams')
        self.assertEqual(res.data['pinned_proof_ids'], ['11111111-2222-3333-4444-555555555555'])

        self.alice.refresh_from_db()
        self.assertEqual(self.alice.availability_status, 'open_to_cofound')

    def test_experience_crud_and_isolation(self):
        """Experience creation, updates, and object-level isolation."""
        url = '/api/v1/users/me/experiences/'
        payload = {
            'company_name': 'Acme AI',
            'role_title': 'Staff Engineer',
            'start_date': '2024-01-01',
            'is_current': True,
            'skills_used': ['Rust', 'Python', 'Kafka']
        }
        # 1. Create
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        exp_id = res.data['id']
        self.assertEqual(res.data['company_name'], 'Acme AI')

        # 2. Update
        detail_url = f'/api/v1/users/me/experiences/{exp_id}/'
        update_res = self.client.patch(detail_url, {'description': 'Scaled system to 1M req/s'}, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data['description'], 'Scaled system to 1M req/s')

        # 3. Bob attempts to tamper or delete Alice's experience -> 404 isolated
        self.client.force_authenticate(user=self.bob)
        tamper_res = self.client.delete(detail_url)
        self.assertEqual(tamper_res.status_code, status.HTTP_404_NOT_FOUND)

        # 4. Alice can delete her own experience
        self.client.force_authenticate(user=self.alice)
        del_res = self.client.delete(detail_url)
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)

    def test_education_crud_and_campus_verification(self):
        """Campus domain auto-verifies when institution matches verified domain."""
        url = '/api/v1/users/me/educations/'
        payload = {
            'institution': 'IIT Bombay - iitb.ac.in',
            'degree': 'B.Tech',
            'field_of_study': 'Computer Science',
            'start_year': 2022,
            'end_year': 2026
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['is_campus_verified'])

    def test_activity_matrix_and_streak(self):
        """Activity matrix computes streaks and contribution counts from verified events."""
        from apps.collaboration.models import ReputationEvent
        from datetime import date, timedelta
        from django.utils import timezone

        today = timezone.now().date()
        # Seed 3 consecutive active days: today, yesterday, 2 days ago
        for i in range(3):
            d = today - timedelta(days=i)
            ev = ReputationEvent.objects.create(
                user=self.alice,
                event_type='deliverable_approved',
                points=10,
                description=f'Approved work day {i}',
                idempotency_key=f'test_streak_event_{i}',
            )
            ReputationEvent.objects.filter(id=ev.id).update(
                created_at=timezone.make_aware(timezone.datetime(d.year, d.month, d.day, 12, 0, 0))
            )

        url = f'/api/v1/users/{self.alice.id}/activity-matrix/'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total_contributions'], 3)
        self.assertEqual(res.data['current_streak_days'], 3)
        self.assertGreaterEqual(len(res.data['weeks']), 50)

    def test_consolidated_dossier_endpoint(self):
        """GET /api/v1/users/<id>/dossier/ returns all sections in single payload."""
        url = f'/api/v1/users/{self.alice.id}/dossier/'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('user', res.data)
        self.assertIn('reputation', res.data)
        self.assertIn('activity', res.data)
        self.assertIn('pinned_proofs', res.data)
        self.assertIn('experiences', res.data)
        self.assertIn('educations', res.data)
        self.assertIn('peer_endorsements', res.data)
        self.assertEqual(res.data['user']['username'], 'alicedossier')


class SettingsAndSecurityTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='builder@enquebet.com',
            username='builder1',
            password='SecurePassword123!',
            full_name='Test Builder'
        )
        self.other_user = User.objects.create_user(
            email='other@enquebet.com',
            username='otherbuilder',
            password='Password123!',
            full_name='Other Builder'
        )
        self.client.force_authenticate(user=self.user)

    def test_user_sessions_list_and_revoke(self):
        # Create a session
        from apps.users.models import UserSession
        s1 = UserSession.objects.create(
            user=self.user,
            device_name='Windows 11 · Chrome',
            is_current=True
        )
        s2 = UserSession.objects.create(
            user=self.user,
            device_name='macOS · Safari',
            is_current=False
        )

        res = self.client.get('/api/v1/users/me/sessions/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

        # Revoke s2
        res = self.client.delete(f'/api/v1/users/me/sessions/{s2.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Verify s2 is revoked and filtered out
        res = self.client.get('/api/v1/users/me/sessions/')
        self.assertEqual(len(res.data), 1)

    def test_user_sessions_revoke_others(self):
        from apps.users.models import UserSession
        s1 = UserSession.objects.create(
            user=self.user,
            device_name='This Device',
            is_current=True
        )
        s2 = UserSession.objects.create(
            user=self.user,
            device_name='Other Device 1',
            is_current=False
        )
        s3 = UserSession.objects.create(
            user=self.user,
            device_name='Other Device 2',
            is_current=False
        )

        res = self.client.post('/api/v1/users/me/sessions/revoke-others/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Only s1 remains
        res = self.client.get('/api/v1/users/me/sessions/')
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], str(s1.id))

    def test_blocked_users_flow(self):
        # 1. Block other user
        res = self.client.post('/api/v1/users/me/blocked/', {'user_id': str(self.other_user.id), 'reason': 'Spam'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['blocked_username'], 'otherbuilder')

        # 2. List blocked
        res = self.client.get('/api/v1/users/me/blocked/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

        # 3. Unblock
        res = self.client.delete(f'/api/v1/users/me/blocked/{self.other_user.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Verify empty
        res = self.client.get('/api/v1/users/me/blocked/')
        self.assertEqual(len(res.data), 0)

    def test_time_stats_endpoint(self):
        res = self.client.get('/api/v1/users/me/time-stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('weekly_building_hours', res.data)
        self.assertIn('daily_average_hours', res.data)
        self.assertIn('streak_days', res.data)
        self.assertIn('quiet_hours_enabled', res.data)

    def test_professional_stats_endpoint(self):
        res = self.client.get('/api/v1/users/me/professional-stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('profile_views_30d', res.data)
        self.assertIn('search_appearances_30d', res.data)
        self.assertIn('reputation_score', res.data)
        self.assertIn('peer_scores', res.data)

    def test_gated_account_deletion(self):
        # 1. Bad confirmation phrase fails
        res = self.client.delete('/api/v1/users/me/', {
            'password': 'SecurePassword123!',
            'confirm_phrase': 'DELETE'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Bad password fails
        res = self.client.delete('/api/v1/users/me/', {
            'password': 'WrongPassword!',
            'confirm_phrase': 'DELETE MY ENQUEBET ACCOUNT'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Valid confirmation deletes user
        res = self.client.delete('/api/v1/users/me/', {
            'password': 'SecurePassword123!',
            'confirm_phrase': 'DELETE MY ENQUEBET ACCOUNT'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=self.user.id).exists())

    def test_follower_following_and_remove_follower(self):
        # Create user Charlie
        charlie = User.objects.create_user(
            email='charlie@example.com',
            username='charlie',
            password='SecurePassword123!'
        )

        # Charlie follows self.user (Alice)
        Follower.objects.create(follower=charlie, following=self.user)
        self.assertEqual(self.user.followers.count(), 1)

        # Alice authenticates and views her followers
        self.client.force_authenticate(user=self.user)
        res = self.client.get(f'/api/v1/users/{self.user.id}/followers/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        # Charlie is in results, and is_following is False (Alice does not follow Charlie yet)
        self.assertEqual(res.data['results'][0]['username'], 'charlie')
        self.assertFalse(res.data['results'][0]['is_following'])

        # Alice follows Charlie back
        Follower.objects.create(follower=self.user, following=charlie)

        # Now when Alice checks her followers, is_following should be True (mutual follow)
        res = self.client.get(f'/api/v1/users/{self.user.id}/followers/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['results'][0]['is_following'])

        # Alice removes Charlie from her followers (Instagram-style remove follower)
        remove_res = self.client.post(f'/api/v1/users/{charlie.id}/remove-follower/')
        self.assertEqual(remove_res.status_code, status.HTTP_200_OK)
        self.assertTrue(remove_res.data['removed'])
        self.assertEqual(remove_res.data['followers_count'], 0)

        # Charlie should no longer follow Alice
        self.assertFalse(Follower.objects.filter(follower=charlie, following=self.user).exists())
        # But Alice still follows Charlie
        self.assertTrue(Follower.objects.filter(follower=self.user, following=charlie).exists())

    def test_stale_bearer_token_does_not_break_login_or_register(self):
        """Stale or expired Bearer tokens in headers must NOT block login or registration."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired_garbage_token')

        # 1. Registration with stale token in header succeeds
        reg_payload = {
            'email': 'new_builder@example.com',
            'username': 'new_builder',
            'full_name': 'New Builder',
            'password': 'SecurePassword123!',
            'password_confirm': 'SecurePassword123!'
        }
        reg_res = self.client.post('/api/v1/auth/register/', reg_payload, format='json')
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', reg_res.data)

        # 2. Login with stale token in header succeeds
        login_res = self.client.post('/api/v1/auth/login/', {
            'email': 'new_builder@example.com',
            'password': 'SecurePassword123!'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)

    def test_login_with_username_or_email_case_insensitive(self):
        """Users can log in with username or email, regardless of letter casing."""
        User.objects.create_user(
            email='builder_case@enquebet.org',
            username='CaseBuilder',
            password='MyPassword123!',
            full_name='Case Tester'
        )

        # Login with email (uppercase variation)
        res1 = self.client.post('/api/v1/auth/login/', {
            'email': 'BUILDER_CASE@ENQUEBET.ORG',
            'password': 'MyPassword123!'
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['user']['username'], 'CaseBuilder')

        # Login with username (lowercase variation)
        res2 = self.client.post('/api/v1/auth/login/', {
            'email': 'casebuilder',
            'password': 'MyPassword123!'
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['user']['username'], 'CaseBuilder')


