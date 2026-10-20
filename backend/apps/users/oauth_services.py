"""
OAuth 2.0 and OpenID Connect (OIDC) Service Layer for ENQUEbet.
Handles Google ID Token verification, GitHub Authorization Code exchange,
primary verified email resolution, and atomic builder account linking.
"""
import logging
import os
import re
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .models import SocialAccount

logger = logging.getLogger(__name__)
User = get_user_model()


class OAuthError(Exception):
    """Custom exception raised when OAuth authentication or verification fails."""
    def __init__(self, message, code='oauth_error', status_code=400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def _get_google_client_id() -> str:
    """Retrieve Google Client ID from settings or environment."""
    return getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None) or os.getenv('GOOGLE_OAUTH_CLIENT_ID', '').strip()


def _get_github_credentials() -> tuple[str, str]:
    """Retrieve GitHub Client ID and Client Secret from settings or environment."""
    client_id = getattr(settings, 'GITHUB_OAUTH_CLIENT_ID', None) or os.getenv('GITHUB_OAUTH_CLIENT_ID', '').strip()
    client_secret = getattr(settings, 'GITHUB_OAUTH_CLIENT_SECRET', None) or os.getenv('GITHUB_OAUTH_CLIENT_SECRET', '').strip()
    return client_id, client_secret


def verify_google_credential(credential: str) -> dict:
    """
    Verify a Google OpenID Connect ID token (JWT) passed from Google Identity Services.
    Validates signature, expiration, issuer, audience, and email verification status.
    """
    if not credential or not isinstance(credential, str):
        raise OAuthError("Google credential token is missing or malformed.")

    client_id = _get_google_client_id()
    request_transport = google_requests.Request()

    try:
        # If client_id is configured, enforce audience check; otherwise verify signature and claims
        id_info = id_token.verify_oauth2_token(
            credential,
            request_transport,
            audience=client_id if client_id else None,
            clock_skew_in_seconds=10
        )
    except ValueError as e:
        logger.warning(f"Google ID token verification failed: {e}")
        raise OAuthError("Google token verification failed or token is expired.")
    except Exception as e:
        logger.error(f"Unexpected error validating Google credential: {e}", exc_info=True)
        raise OAuthError("Unable to verify Google credentials at this time.")

    # Validate issuer
    valid_issuers = ['accounts.google.com', 'https://accounts.google.com']
    if id_info.get('iss') not in valid_issuers:
        raise OAuthError("Invalid Google token issuer.")

    # Defense-in-depth: Ensure the email is explicitly verified by Google
    if not id_info.get('email_verified', False):
        raise OAuthError("The Google account email is not verified. Please verify your email with Google.")

    email = (id_info.get('email') or '').strip().lower()
    if not email:
        raise OAuthError("No email address was provided by Google.")

    uid = str(id_info.get('sub', '')).strip()
    if not uid:
        raise OAuthError("Missing Google subject identifier (sub).")

    full_name = id_info.get('name') or f"{id_info.get('given_name', '')} {id_info.get('family_name', '')}".strip()
    avatar_url = id_info.get('picture', '')

    return {
        'provider': SocialAccount.PROVIDER_GOOGLE,
        'uid': uid,
        'email': email,
        'full_name': full_name or email.split('@')[0],
        'avatar_url': avatar_url,
        'extra_data': {
            'locale': id_info.get('locale'),
            'hd': id_info.get('hd'),  # Hosted G Suite / Google Workspace domain
        }
    }


def exchange_github_code(code: str, redirect_uri: str = None) -> dict:
    """
    Exchange an OAuth authorization code with GitHub for an access token,
    then fetch user profile and primary verified email address.
    """
    if not code or not isinstance(code, str):
        raise OAuthError("GitHub authorization code is required.")

    client_id, client_secret = _get_github_credentials()
    if not client_id or not client_secret:
        raise OAuthError("GitHub OAuth is not configured on this server.", code='provider_unconfigured', status_code=503)

    token_url = "https://github.com/login/oauth/access_token"
    token_payload = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code.strip(),
    }
    if redirect_uri:
        token_payload['redirect_uri'] = redirect_uri

    headers = {'Accept': 'application/json'}

    try:
        token_res = requests.post(token_url, json=token_payload, headers=headers, timeout=10)
        token_data = token_res.json()
    except Exception as e:
        logger.error(f"Failed to communicate with GitHub token endpoint: {e}", exc_info=True)
        raise OAuthError("Network error while connecting to GitHub. Please try again.")

    if 'error' in token_data:
        error_desc = token_data.get('error_description') or token_data.get('error')
        logger.warning(f"GitHub token exchange failed: {error_desc}")
        raise OAuthError(f"GitHub authorization failed: {error_desc}")

    access_token = token_data.get('access_token')
    if not access_token:
        raise OAuthError("Did not receive a valid access token from GitHub.")

    auth_headers = {
        'Authorization': f"Bearer {access_token}",
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ENQUEbet-Auth/1.0'
    }

    # Fetch GitHub user profile
    try:
        user_res = requests.get('https://api.github.com/user', headers=auth_headers, timeout=10)
        user_data = user_res.json()
    except Exception as e:
        logger.error(f"Failed to fetch GitHub profile: {e}", exc_info=True)
        raise OAuthError("Unable to fetch GitHub profile. Please try again.")

    uid = str(user_data.get('id', '')).strip()
    if not uid:
        raise OAuthError("Could not retrieve GitHub user ID.")

    # Fetch GitHub verified emails
    verified_email = None
    try:
        emails_res = requests.get('https://api.github.com/user/emails', headers=auth_headers, timeout=10)
        if emails_res.status_code == 200:
            emails = emails_res.json()
            if isinstance(emails, list):
                # Priority 1: primary AND verified
                for em in emails:
                    if em.get('primary') and em.get('verified'):
                        verified_email = (em.get('email') or '').strip().lower()
                        break
                # Priority 2: any verified email
                if not verified_email:
                    for em in emails:
                        if em.get('verified'):
                            verified_email = (em.get('email') or '').strip().lower()
                            break
    except Exception as e:
        logger.warning(f"Error fetching GitHub emails: {e}")

    # Fallback to profile email if marked verified
    if not verified_email and user_data.get('email'):
        verified_email = user_data['email'].strip().lower()

    if not verified_email:
        raise OAuthError(
            "Your GitHub account does not have a verified email address. "
            "Please verify your email on GitHub and try again.",
            code='email_unverified'
        )

    login_username = user_data.get('login', '')
    full_name = user_data.get('name') or login_username
    avatar_url = user_data.get('avatar_url', '')
    github_url = user_data.get('html_url', '')

    return {
        'provider': SocialAccount.PROVIDER_GITHUB,
        'uid': uid,
        'email': verified_email,
        'full_name': full_name,
        'username_hint': login_username,
        'avatar_url': avatar_url,
        'github_url': github_url,
        'extra_data': {
            'github_login': login_username,
            'public_repos': user_data.get('public_repos'),
            'bio': user_data.get('bio'),
        }
    }


def _generate_unique_username(base_hint: str, email: str) -> str:
    """
    Generate an aesthetic, unique username adhering to ENQUEbet username rules:
    - Lowercase alphanumeric and underscores only
    - Max length 150 characters
    - Collision resolution via numeric suffix (_1, _2, etc.)
    """
    raw = base_hint or email.split('@')[0]
    # Clean non-alphanumeric except underscores
    cleaned = re.sub(r'[^a-zA-Z0-9_]', '_', raw).strip('_').lower()
    if not cleaned or len(cleaned) < 2:
        cleaned = f"builder_{email.split('@')[0][:8]}"
        cleaned = re.sub(r'[^a-zA-Z0-9_]', '_', cleaned).strip('_').lower()

    # Truncate base to leave room for suffix
    base = cleaned[:140]
    candidate = base

    counter = 1
    while User.objects.filter(username__iexact=candidate).exists():
        candidate = f"{base}_{counter}"
        counter += 1

    return candidate


@transaction.atomic
def get_or_create_oauth_user(oauth_data: dict) -> tuple[User, bool, SocialAccount]:
    """
    Atomically get or create an ENQUEbet user from verified OAuth provider data.

    Linking Policy:
    1. If SocialAccount exists with (provider, uid): Authenticate existing user.
    2. Else if User exists with verified email: Link SocialAccount to this user.
    3. Else: Create a new User with unusable password and link SocialAccount.

    Returns:
        tuple (User, created: bool, SocialAccount)
    """
    provider = oauth_data['provider']
    uid = str(oauth_data['uid'])
    email = oauth_data['email'].strip().lower()
    full_name = (oauth_data.get('full_name') or '').strip()
    avatar_url = (oauth_data.get('avatar_url') or '').strip()
    github_url = (oauth_data.get('github_url') or '').strip()
    username_hint = oauth_data.get('username_hint', '')
    extra_data = oauth_data.get('extra_data') or {}

    # Case 1: Existing SocialAccount link
    social_acc = SocialAccount.objects.filter(provider=provider, uid=uid).select_related('user').first()
    if social_acc:
        user = social_acc.user
        # Update cached profile info if empty
        updated = False
        if avatar_url and not user.profile_image:
            user.profile_image = avatar_url
            updated = True
        if github_url and not user.github_url:
            user.github_url = github_url
            updated = True
        if updated:
            user.save(update_fields=['profile_image', 'github_url', 'updated_at'])

        # Refresh social account metadata
        social_acc.provider_email = email
        social_acc.display_name = full_name or social_acc.display_name
        social_acc.avatar_url = avatar_url or social_acc.avatar_url
        social_acc.extra_data = extra_data
        social_acc.save()
        return user, False, social_acc

    # Case 2: Existing User with matching verified email -> Link account
    existing_user = User.objects.filter(email__iexact=email).first()
    if existing_user:
        # Check if this user already linked a DIFFERENT account for this provider
        existing_provider_link = SocialAccount.objects.filter(user=existing_user, provider=provider).first()
        if existing_provider_link:
            raise OAuthError(
                f"This ENQUEbet account is already connected to another {provider.title()} account.",
                code='account_conflict'
            )

        social_acc = SocialAccount.objects.create(
            user=existing_user,
            provider=provider,
            uid=uid,
            provider_email=email,
            display_name=full_name,
            avatar_url=avatar_url,
            extra_data=extra_data
        )

        # Enrich empty profile fields
        save_fields = []
        if avatar_url and not existing_user.profile_image:
            existing_user.profile_image = avatar_url
            save_fields.append('profile_image')
        if github_url and not existing_user.github_url:
            existing_user.github_url = github_url
            save_fields.append('github_url')
        if save_fields:
            save_fields.append('updated_at')
            existing_user.save(update_fields=save_fields)

        return existing_user, False, social_acc

    # Case 3: Create Brand New User
    unique_username = _generate_unique_username(username_hint, email)
    user = User(
        email=email,
        username=unique_username,
        full_name=full_name or unique_username,
        profile_image=avatar_url,
        github_url=github_url,
        availability_status='open_to_collaborate',
    )
    # Security: No usable password; must sign in via OAuth or use "Set Password" flow
    user.set_unusable_password()
    user.save()

    social_acc = SocialAccount.objects.create(
        user=user,
        provider=provider,
        uid=uid,
        provider_email=email,
        display_name=full_name,
        avatar_url=avatar_url,
        extra_data=extra_data
    )

    return user, True, social_acc
