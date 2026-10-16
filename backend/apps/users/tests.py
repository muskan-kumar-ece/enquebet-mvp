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
