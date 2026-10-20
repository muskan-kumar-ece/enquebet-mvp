"""
Tests for Google & GitHub OAuth 2.0 Integration and Account Linking in ENQUEbet.
"""
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import SocialAccount, UserSession
from apps.users.oauth_services import (
    OAuthError,
    verify_google_credential,
    exchange_github_code,
    get_or_create_oauth_user,
    _generate_unique_username,
)

User = get_user_model()


class OAuthServicesTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='existing_builder@enquebet.com',
            username='existing_builder',
            full_name='Existing Builder',
            password='TestPassword123!'
        )

    def test_social_account_unique_constraints(self):
        """Verify (provider, uid) and (user, provider) uniqueness."""
        SocialAccount.objects.create(
            user=self.user,
            provider=SocialAccount.PROVIDER_GOOGLE,
            uid='google-sub-1001',
            provider_email='existing_builder@enquebet.com'
        )

        # Same provider + same uid with another user must fail
        other_user = User.objects.create_user(
            email='other@enquebet.com',
            username='other_builder',
            full_name='Other Builder',
            password='TestPassword123!'
        )
        from django.db import transaction
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                SocialAccount.objects.create(
                    user=other_user,
                    provider=SocialAccount.PROVIDER_GOOGLE,
                    uid='google-sub-1001'
                )

        # Same user linking same provider twice must fail
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                SocialAccount.objects.create(
                    user=self.user,
                    provider=SocialAccount.PROVIDER_GOOGLE,
                    uid='google-sub-9999'
                )

    def test_generate_unique_username(self):
        """Test username slugification and collision resolution."""
        # Non-colliding username
        uname1 = _generate_unique_username("alice_builder", "alice@example.com")
        self.assertEqual(uname1, "alice_builder")

        # Colliding with existing username
        uname2 = _generate_unique_username("existing_builder", "new@example.com")
        self.assertEqual(uname2, "existing_builder_1")

        # Special characters sanitized
        uname3 = _generate_unique_username("Dr. John Doe! #1", "john@example.com")
        self.assertTrue(uname3.startswith("dr__john_doe___1"))

    def test_create_new_oauth_user(self):
        """Test brand new user signup via OAuth."""
        oauth_data = {
            'provider': SocialAccount.PROVIDER_GOOGLE,
            'uid': 'google-uid-new-123',
            'email': 'new_builder@domain.com',
            'full_name': 'New Builder',
            'avatar_url': 'https://example.com/avatar.png',
            'github_url': '',
            'username_hint': 'new_builder',
            'extra_data': {'hd': 'domain.com'}
        }
        user, created, social_acc = get_or_create_oauth_user(oauth_data)
        self.assertTrue(created)
        self.assertEqual(user.email, 'new_builder@domain.com')
        self.assertEqual(user.username, 'new_builder')
        self.assertEqual(user.full_name, 'New Builder')
        self.assertEqual(user.profile_image, 'https://example.com/avatar.png')
        self.assertFalse(user.has_usable_password())
        self.assertEqual(social_acc.provider, 'google')
        self.assertEqual(social_acc.uid, 'google-uid-new-123')

    def test_link_existing_user_by_verified_email(self):
        """Test that an existing user with matching verified email is automatically linked."""
        oauth_data = {
            'provider': SocialAccount.PROVIDER_GITHUB,
            'uid': 'github-uid-456',
            'email': 'existing_builder@enquebet.com',
            'full_name': 'GitHub Name',
            'avatar_url': 'https://avatars.githubusercontent.com/u/456',
            'github_url': 'https://github.com/existing_builder',
            'username_hint': 'existing_builder',
            'extra_data': {'github_login': 'existing_builder'}
        }
        user, created, social_acc = get_or_create_oauth_user(oauth_data)
        self.assertFalse(created)
        self.assertEqual(user.id, self.user.id)
        self.assertEqual(user.github_url, 'https://github.com/existing_builder')
        self.assertTrue(user.has_usable_password())  # Preserves existing password
        self.assertEqual(social_acc.user, self.user)

    def test_authenticate_existing_social_account(self):
        """Subsequent logins with the same provider and uid return the existing user."""
        SocialAccount.objects.create(
            user=self.user,
            provider=SocialAccount.PROVIDER_GOOGLE,
            uid='google-sub-2002',
            provider_email=self.user.email
        )
        oauth_data = {
            'provider': SocialAccount.PROVIDER_GOOGLE,
            'uid': 'google-sub-2002',
            'email': self.user.email,
            'full_name': 'Existing Builder',
        }
        user, created, social_acc = get_or_create_oauth_user(oauth_data)
        self.assertFalse(created)
        self.assertEqual(user.id, self.user.id)


class OAuthEndpointsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch('apps.users.views.verify_google_credential')
    def test_google_oauth_success(self, mock_verify):
        mock_verify.return_value = {
            'provider': SocialAccount.PROVIDER_GOOGLE,
            'uid': 'google-test-sub-1',
            'email': 'google_dev@enquebet.com',
            'full_name': 'Google Developer',
            'avatar_url': 'https://lh3.googleusercontent.com/test.jpg',
            'extra_data': {}
        }
        res = self.client.post('/api/v1/auth/oauth/google/', {'credential': 'valid-fake-google-jwt'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertEqual(res.data['user']['email'], 'google_dev@enquebet.com')
        self.assertTrue(res.data['created'])

        # Check session recorded
        user = User.objects.get(email='google_dev@enquebet.com')
        self.assertTrue(UserSession.objects.filter(user=user, is_current=True).exists())

    def test_google_oauth_missing_credential(self):
        res = self.client.post('/api/v1/auth/oauth/google/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', res.data)

    @patch('apps.users.views.exchange_github_code')
    def test_github_oauth_success(self, mock_exchange):
        mock_exchange.return_value = {
            'provider': SocialAccount.PROVIDER_GITHUB,
            'uid': 'github-test-id-1',
            'email': 'github_dev@enquebet.com',
            'full_name': 'GitHub Developer',
            'username_hint': 'gh_dev',
            'avatar_url': 'https://avatars.githubusercontent.com/u/1',
            'github_url': 'https://github.com/gh_dev',
            'extra_data': {}
        }
        res = self.client.post('/api/v1/auth/oauth/github/', {'code': 'valid-github-code'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertEqual(res.data['user']['email'], 'github_dev@enquebet.com')

    @patch('apps.users.views.exchange_github_code')
    def test_github_oauth_unverified_email_rejected(self, mock_exchange):
        mock_exchange.side_effect = OAuthError("Your GitHub account does not have a verified email address.", code='email_unverified')
        res = self.client.post('/api/v1/auth/oauth/github/', {'code': 'code-no-verified-email'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data.get('code'), 'email_unverified')


class PasswordAndConnectedAccountsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        # OAuth user without usable password
        self.oauth_user = User.objects.create(
            email='oauth_only@enquebet.com',
            username='oauth_only',
            full_name='OAuth Only',
        )
        self.oauth_user.set_unusable_password()
        self.oauth_user.save()

        # Connect Google account
        self.social_acc = SocialAccount.objects.create(
            user=self.oauth_user,
            provider=SocialAccount.PROVIDER_GOOGLE,
            uid='google-sub-oauth-only',
            provider_email=self.oauth_user.email
        )

        # Standard email/password user
        self.password_user = User.objects.create_user(
            email='password_user@enquebet.com',
            username='password_user',
            full_name='Password User',
            password='InitialPassword123!'
        )

    def test_set_password_for_oauth_user(self):
        """OAuth user without a password can set their first password."""
        self.client.force_authenticate(user=self.oauth_user)
        res = self.client.post('/api/v1/users/me/set-password/', {'new_password': 'BrandNewMasterPassword123!'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.oauth_user.refresh_from_db()
        self.assertTrue(self.oauth_user.has_usable_password())
        self.assertTrue(self.oauth_user.check_password('BrandNewMasterPassword123!'))

    def test_set_password_rejected_if_already_has_password(self):
        """User who already has a password must be rejected by set-password."""
        self.client.force_authenticate(user=self.password_user)
        res = self.client.post('/api/v1/users/me/set-password/', {'new_password': 'AnotherPassword123!'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already have a password', res.data['error'])

    def test_connected_accounts_list(self):
        """User can retrieve their connected social providers."""
        self.client.force_authenticate(user=self.oauth_user)
        res = self.client.get('/api/v1/auth/oauth/providers/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['accounts']), 1)
        self.assertEqual(res.data['accounts'][0]['provider'], 'google')
        self.assertFalse(res.data['has_usable_password'])

    def test_prevent_disconnecting_only_auth_method(self):
        """Cannot disconnect social provider if user has no password and no other provider."""
        self.client.force_authenticate(user=self.oauth_user)
        res = self.client.delete('/api/v1/auth/oauth/providers/google/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot disconnect your only authentication method', res.data['error'])

    def test_allow_disconnecting_when_password_exists(self):
        """Can disconnect social provider once master password is set."""
        self.oauth_user.set_password('ValidPassword123!')
        self.oauth_user.save()

        self.client.force_authenticate(user=self.oauth_user)
        res = self.client.delete('/api/v1/auth/oauth/providers/google/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(SocialAccount.objects.filter(user=self.oauth_user).count(), 0)
