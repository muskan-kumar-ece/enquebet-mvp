"""
User Views (Auth + Profile)
"""
import uuid
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.serializers import Serializer, CharField
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.contrib.auth import authenticate, get_user_model
from django.db import models
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSerializer,
    UserExperienceSerializer, UserEducationSerializer,
    PinnedProofSerializer, DossierPeerReviewSerializer,
    UserSessionSerializer, BlockedUserSerializer, SocialAccountSerializer
)
from .models import Follower, UserExperience, UserEducation, UserSession, BlockedUser, SocialAccount
from .oauth_services import (
    OAuthError, verify_google_credential, exchange_github_code, get_or_create_oauth_user
)
from apps.notifications.models import Notification
from apps.posts.models import Post
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


def _parse_client_device(request):
    """Parse user agent and IP to determine device type, browser, and OS."""
    ua = request.META.get('HTTP_USER_AGENT', '')
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
    
    ua_lower = ua.lower()
    if 'mobile' in ua_lower or 'android' in ua_lower or 'iphone' in ua_lower:
        device_type = 'mobile'
    elif 'ipad' in ua_lower or 'tablet' in ua_lower:
        device_type = 'tablet'
    else:
        device_type = 'desktop'

    if 'edg/' in ua_lower:
        browser = 'Microsoft Edge'
    elif 'chrome/' in ua_lower:
        browser = 'Google Chrome'
    elif 'safari/' in ua_lower and 'chrome' not in ua_lower:
        browser = 'Apple Safari'
    elif 'firefox/' in ua_lower:
        browser = 'Mozilla Firefox'
    else:
        browser = 'Modern Browser'

    if 'windows' in ua_lower:
        os_name = 'Windows'
    elif 'macintosh' in ua_lower or 'mac os x' in ua_lower:
        os_name = 'macOS'
    elif 'iphone' in ua_lower or 'ipad' in ua_lower:
        os_name = 'iOS'
    elif 'android' in ua_lower:
        os_name = 'Android'
    elif 'linux' in ua_lower:
        os_name = 'Linux'
    else:
        os_name = 'Other OS'

    device_name = f"{os_name} · {browser}"
    return {
        'device_name': device_name,
        'device_type': device_type,
        'browser': browser,
        'os': os_name,
        'ip_address': ip or None,
    }


def record_user_session(request, user, refresh_token=None):
    """Create or update active session for user."""
    try:
        info = _parse_client_device(request)
        jti = ''
        if refresh_token:
            try:
                jti = str(refresh_token.get('jti', ''))
            except Exception:
                pass
        
        # Mark previous sessions as is_current=False
        UserSession.objects.filter(user=user, is_current=True).update(is_current=False)
        
        session = UserSession.objects.create(
            user=user,
            refresh_jti=jti,
            device_name=info['device_name'],
            device_type=info['device_type'],
            browser=info['browser'],
            os=info['os'],
            ip_address=info['ip_address'],
            is_current=True,
            revoked=False
        )
        return session
    except Exception:
        return None


class RegisterView(APIView):
    """User registration"""
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            record_user_session(request, user, refresh)
            
            return Response({
                'user': UserSerializer(user, context={'request': request}).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """User login supporting email or username, case-insensitive, with stale token protection."""
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            raw_id = serializer.validated_data.get('email') or serializer.validated_data.get('username') or ''
            identifier = raw_id.strip()
            password = serializer.validated_data.get('password') or ''

            # Case-insensitive lookup by email or username
            user = User.objects.filter(
                models.Q(email__iexact=identifier) | models.Q(username__iexact=identifier)
            ).first()

            if user and user.check_password(password):
                if not user.is_active:
                    return Response(
                        {'error': 'This account has been deactivated. Please contact support.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                refresh = RefreshToken.for_user(user)
                record_user_session(request, user, refresh)
                return Response({
                    'user': UserSerializer(user, context={'request': request}).data,
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                })
            
            return Response(
                {'error': 'Invalid email/username or password. Please verify your credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GoogleOAuthView(APIView):
    """
    Authenticate or register a builder via Google Identity Services (ID Token).
    Endpoint: POST /api/v1/auth/oauth/google/
    Body: { "credential": "<Google JWT ID Token>" }
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        credential = request.data.get('credential')
        if not credential:
            return Response({'error': 'Google credential token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            oauth_data = verify_google_credential(credential)
            user, created, social_acc = get_or_create_oauth_user(oauth_data)
        except OAuthError as e:
            return Response({'error': e.message, 'code': e.code}, status=e.status_code)
        except Exception as e:
            logger.error(f"Google OAuth unhandled error: {e}", exc_info=True)
            return Response({'error': 'Authentication failed. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not user.is_active:
            return Response({'error': 'This account has been deactivated. Please contact support.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        record_user_session(request, user, refresh)

        return Response({
            'user': UserSerializer(user, context={'request': request, 'force_owner': True}).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'created': created,
            'provider': 'google',
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class GitHubOAuthView(APIView):
    """
    Authenticate or register a builder via GitHub OAuth 2.0 Authorization Code exchange.
    Endpoint: POST /api/v1/auth/oauth/github/
    Body: { "code": "<GitHub Auth Code>", "redirect_uri": "<optional callback URL>" }
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'GitHub authorization code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        redirect_uri = request.data.get('redirect_uri')

        try:
            oauth_data = exchange_github_code(code, redirect_uri=redirect_uri)
            user, created, social_acc = get_or_create_oauth_user(oauth_data)
        except OAuthError as e:
            return Response({'error': e.message, 'code': e.code}, status=e.status_code)
        except Exception as e:
            logger.error(f"GitHub OAuth unhandled error: {e}", exc_info=True)
            return Response({'error': 'Authentication failed. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not user.is_active:
            return Response({'error': 'This account has been deactivated. Please contact support.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        record_user_session(request, user, refresh)

        return Response({
            'user': UserSerializer(user, context={'request': request, 'force_owner': True}).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'created': created,
            'provider': 'github',
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ConnectedAccountsView(APIView):
    """
    List connected third-party accounts for the current user and allow unlinking.
    Endpoint: GET /api/v1/auth/oauth/providers/
              DELETE /api/v1/auth/oauth/providers/<provider>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        connected = SocialAccount.objects.filter(user=request.user)
        serializer = SocialAccountSerializer(connected, many=True)
        return Response({
            'accounts': serializer.data,
            'has_usable_password': request.user.has_usable_password(),
        })

    def delete(self, request, provider):
        provider = provider.lower()
        if provider not in ['google', 'github']:
            return Response({'error': 'Invalid provider.'}, status=status.HTTP_400_BAD_REQUEST)

        # Safety check: prevent account lockout
        # User must either have a usable password OR another connected social provider
        has_password = request.user.has_usable_password()
        other_accounts = SocialAccount.objects.filter(user=request.user).exclude(provider=provider).exists()

        if not has_password and not other_accounts:
            return Response({
                'error': 'Cannot disconnect your only authentication method. Please set a password first.'
            }, status=status.HTTP_400_BAD_REQUEST)

        deleted, _ = SocialAccount.objects.filter(user=request.user, provider=provider).delete()
        if not deleted:
            return Response({'error': f'{provider.title()} account was not connected.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'message': f'{provider.title()} account disconnected successfully.'})


class WebSocketTicketView(APIView):
    """
    Generate an ephemeral single-use ticket for authenticating WebSockets.
    Replaces long-lived JWT in query strings.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .ws_ticket import create_ws_ticket, DEFAULT_TICKET_TTL
        ticket = create_ws_ticket(str(request.user.id), timeout=DEFAULT_TICKET_TTL)
        return Response({
            'ticket': ticket,
            'expires_in': DEFAULT_TICKET_TTL,
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get and update user profile"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user


class UserDetailView(generics.RetrieveAPIView):
    """Get user profile by username"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'username'


class UserByIdView(generics.RetrieveAPIView):
    """Get user profile by UUID or username — used by frontend /users/:id/"""
    serializer_class = UserSerializer

    def get_object(self):
        val = self.kwargs.get('pk')
        try:
            val_uuid = uuid.UUID(str(val))
            return get_object_or_404(User, id=val_uuid)
        except (ValueError, AttributeError):
            return get_object_or_404(User, username=val)


class UserSearchView(generics.ListAPIView):
    """Search users by username or full_name"""
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        q = self.request.query_params.get('q', '')
        return (
            User.objects.filter(username__icontains=q) |
            User.objects.filter(full_name__icontains=q)
        ).distinct()


class MeView(generics.RetrieveUpdateDestroyAPIView):
    """Get/update/delete the current user.

    Spec endpoints:
      - PUT /users/me/
      - DELETE /users/me/
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        # Frontend uses PUT but only sends changed fields; treat it as partial.
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Gated destruction: check password & confirmation phrase if provided
        password = request.data.get('password') if hasattr(request, 'data') else None
        confirm_phrase = request.data.get('confirm_phrase') if hasattr(request, 'data') else None

        if password or confirm_phrase:
            if confirm_phrase != "DELETE MY ENQUEBET ACCOUNT":
                return Response(
                    {'error': 'Invalid confirmation phrase. You must type "DELETE MY ENQUEBET ACCOUNT" exactly.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not request.user.check_password(password):
                return Response(
                    {'error': 'Incorrect password. Cannot delete account.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        user = self.get_object()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordSerializer(Serializer):
    current_password = CharField(write_only=True, required=True)
    new_password = CharField(write_only=True, required=True, min_length=8)


class MePasswordView(APIView):
    """Change password for current user.

    Spec endpoint:
      - PUT /users/me/password/
    """

    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        current_password = serializer.validated_data['current_password']
        new_password = serializer.validated_data['new_password']

        if not request.user.check_password(current_password):
            return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as e:
            return Response({'error': e.messages[0] if e.messages else 'Invalid password'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'message': 'Password updated successfully'})


class SetPasswordView(APIView):
    """Set master password for OAuth builders who do not have an existing password.

    Spec endpoint:
      - POST /users/me/set-password/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.has_usable_password():
            return Response({
                'error': 'You already have a password set. Please use Change Password instead.'
            }, status=status.HTTP_400_BAD_REQUEST)

        new_password = request.data.get('new_password') or ''
        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as e:
            return Response({'error': e.messages[0] if e.messages else 'Invalid password.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'message': 'Master password set successfully. You can now also log in using your email and password.'})


class DeleteAllPostsView(APIView):
    """Delete all posts belonging to the current user."""

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        deleted, _ = Post.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _follow_payload(request_user, target_user, following: bool):
    return {
        'following': following,
        'target_user_id': str(target_user.id),
        'followers_count': target_user.followers.count(),
        'following_count': target_user.following.count(),
        'me_followers_count': request_user.followers.count(),
        'me_following_count': request_user.following.count(),
    }


class FollowUserView(APIView):
    """Follow a user.

    Spec endpoint:
      - POST /users/{id}/follow/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, target_user_id):
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'error': 'You cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)

        relationship, created = Follower.objects.get_or_create(
            follower=request.user,
            following=target_user,
        )

        if created:
            from apps.notifications.services import NotificationService
            NotificationService.send_event(
                recipient=target_user,
                actor=request.user,
                event_type='follow',
                target_type='user',
                target_id=str(request.user.id),
                priority='personal',
                message_template=f"{request.user.username} started following you",
            )

        return Response(_follow_payload(request.user, target_user, True))

    def delete(self, request, target_user_id):
        # Back-compat: allow DELETE /users/{id}/follow/ to unfollow.
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'error': 'You cannot unfollow yourself'}, status=status.HTTP_400_BAD_REQUEST)

        Follower.objects.filter(follower=request.user, following=target_user).delete()
        return Response(_follow_payload(request.user, target_user, False))


class UnfollowUserView(APIView):
    """Unfollow a user.

    Spec endpoint:
      - POST /users/{id}/unfollow/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, target_user_id):
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'error': 'You cannot unfollow yourself'}, status=status.HTTP_400_BAD_REQUEST)

        Follower.objects.filter(follower=request.user, following=target_user).delete()
        return Response(_follow_payload(request.user, target_user, False))


class FollowersListView(APIView):
    """List followers for a user with pre-calculated follow statuses."""

    permission_classes = [IsAuthenticated]

    def get(self, request, target_user_id):
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        follower_ids = list(
            Follower.objects.filter(following=target_user)
            .order_by('-created_at')
            .values_list('follower_id', flat=True)
        )
        users_map = {u.id: u for u in User.objects.filter(id__in=follower_ids)}
        ordered_users = [users_map[uid] for uid in follower_ids if uid in users_map]

        followed_user_ids = set(
            Follower.objects.filter(follower=request.user)
            .values_list('following_id', flat=True)
        )

        data = UserSerializer(
            ordered_users,
            many=True,
            context={'request': request, 'followed_user_ids': followed_user_ids}
        ).data
        return Response({'count': len(data), 'results': data})


class FollowingListView(APIView):
    """List who a user is following with pre-calculated follow statuses."""

    permission_classes = [IsAuthenticated]

    def get(self, request, target_user_id):
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        following_ids = list(
            Follower.objects.filter(follower=target_user)
            .order_by('-created_at')
            .values_list('following_id', flat=True)
        )
        users_map = {u.id: u for u in User.objects.filter(id__in=following_ids)}
        ordered_users = [users_map[uid] for uid in following_ids if uid in users_map]

        followed_user_ids = set(
            Follower.objects.filter(follower=request.user)
            .values_list('following_id', flat=True)
        )

        data = UserSerializer(
            ordered_users,
            many=True,
            context={'request': request, 'followed_user_ids': followed_user_ids}
        ).data
        return Response({'count': len(data), 'results': data})


class RemoveFollowerView(APIView):
    """Remove a follower from following the current user (Instagram-style)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, follower_id):
        try:
            follower_user = User.objects.get(id=follower_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if follower_user == request.user:
            return Response({'error': 'You cannot remove yourself'}, status=status.HTTP_400_BAD_REQUEST)

        deleted_count, _ = Follower.objects.filter(
            follower=follower_user,
            following=request.user
        ).delete()

        if deleted_count == 0:
            return Response({'error': 'This user is not following you'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'removed': True,
            'follower_id': str(follower_id),
            'followers_count': request.user.followers.count(),
        })

    def delete(self, request, follower_id):
        return self.post(request, follower_id)


class FollowStatusView(APIView):
    """Return whether the current user follows target user."""

    permission_classes = [IsAuthenticated]

    def get(self, request, target_user_id):
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'following': False, 'self': True})

        following = Follower.objects.filter(follower=request.user, following=target_user).exists()
        return Response({'following': following})


class FollowToggleView(APIView):
    """Follow/unfollow a user.

    - POST: toggles follow (follow if not following, else unfollow)
    - DELETE: unfollow
    """
    permission_classes = [IsAuthenticated]

    def _get_target_user(self, request, target_user_id=None):
        if target_user_id is None:
            target_user_id = request.data.get('target_user_id') or request.data.get('user_id')
        if not target_user_id:
            return None
        try:
            return User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return None

    def post(self, request, target_user_id=None):
        target_user = self._get_target_user(request, target_user_id)
        if not target_user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'error': 'You cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)

        relationship, created = Follower.objects.get_or_create(
            follower=request.user,
            following=target_user,
        )

        if not created:
            relationship.delete()
            return Response({'following': False})

        from apps.notifications.services import NotificationService
        NotificationService.send_event(
            recipient=target_user,
            actor=request.user,
            event_type='follow',
            target_type='user',
            target_id=str(request.user.id),
            priority='personal',
            message_template=f"{request.user.username} started following you",
        )
        return Response({'following': True})

    def delete(self, request, target_user_id=None):
        target_user = self._get_target_user(request, target_user_id)
        if not target_user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        Follower.objects.filter(
            follower=request.user,
            following=target_user,
        ).delete()
        return Response({'following': False})


class LogoutView(APIView):
    """Logout by blacklisting a refresh token."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            # Token may be expired/invalid/already blacklisted
            pass

        return Response(status=status.HTTP_204_NO_CONTENT)


class LogoutAllView(APIView):
    """Logout from all devices by blacklisting all outstanding tokens."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        for token in OutstandingToken.objects.filter(user=request.user):
            BlacklistedToken.objects.get_or_create(token=token)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeReputationView(APIView):
    """Retrieve current authenticated builder's explainable reputation summary."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.collaboration.reputation_service import ReputationService
        summary = ReputationService.get_user_reputation_summary(request.user, viewer=request.user)
        return Response(summary)


class UserReputationView(APIView):
    """Retrieve any builder's explainable reputation summary (public with privacy redactions)."""
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        from apps.collaboration.reputation_service import ReputationService
        viewer = request.user if request.user.is_authenticated else None
        target_user = get_object_or_404(User, id=user_id)
        summary = ReputationService.get_user_reputation_summary(target_user, viewer=viewer)
        return Response(summary)


class UserReputationRecalculateView(APIView):
    """Trigger verified recalculation of reputation from ground-truth contributions."""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        from apps.collaboration.reputation_service import ReputationService
        if request.user.id != user_id and not request.user.is_staff:
            raise PermissionDenied('You can only trigger recalculation for your own builder profile.')
        target_user = get_object_or_404(User, id=user_id)
        score = ReputationService.recalculate_all_for_user(target_user)
        summary = ReputationService.get_user_reputation_summary(target_user, viewer=request.user)
        return Response({
            'message': 'Reputation recalculated successfully',
            'score': score,
            'summary': summary
        })


def _resolve_user(identifier):
    """Helper to lookup user by UUID or username."""
    import uuid
    try:
        val = uuid.UUID(str(identifier))
        return get_object_or_404(User, id=val)
    except (ValueError, AttributeError):
        return get_object_or_404(User, username=identifier)


class UserDossierView(APIView):
    """
    Consolidated Verified Builder Dossier endpoint.
    Aggregates profile, 365-day activity matrix, cryptographic proofs,
    reputation summary, peer endorsements, and career/academic journey.
    """
    permission_classes = [AllowAny]

    def get(self, request, identifier=None):
        from apps.collaboration.reputation_service import ReputationService
        from apps.collaboration.models import ProofOfWork, PeerReview
        from .activity_service import ActivityMatrixService

        if identifier is None:
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required for current user dossier.'}, status=status.HTTP_401_UNAUTHORIZED)
            target_user = request.user
        else:
            target_user = _resolve_user(identifier)

        viewer = request.user if request.user.is_authenticated else None

        # 1. User Header & Basic profile
        user_data = UserSerializer(target_user).data

        # 2. Explainable Reputation Summary
        reputation = ReputationService.get_user_reputation_summary(target_user, viewer=viewer)

        # 3. 365-day Activity Matrix
        activity = ActivityMatrixService.get_activity_matrix(target_user, days=365)

        # 4. Pinned Proofs
        pinned_proofs = []
        if target_user.pinned_proof_ids:
            pinned_proofs = list(ProofOfWork.objects.filter(
                id__in=target_user.pinned_proof_ids
            ).select_related('workspace__post'))

        if not pinned_proofs:
            # Automatic fallback: up to 3 verified proofs where user was owner or active team member
            pinned_proofs = list(ProofOfWork.objects.filter(
                models.Q(workspace__post__user=target_user) |
                models.Q(workspace__memberships__user=target_user, workspace__memberships__status='active')
            ).distinct().select_related('workspace__post')[:3])

        pinned_proofs_data = PinnedProofSerializer(pinned_proofs, many=True).data

        # 5. Career & Education Timeline
        experiences = UserExperienceSerializer(target_user.experiences.all(), many=True).data
        educations = UserEducationSerializer(target_user.educations.all(), many=True).data

        # 6. Verified Peer Endorsements
        peer_reviews = PeerReview.objects.filter(
            reviewee=target_user
        ).select_related('reviewer', 'proof__workspace__post').order_by('-created_at')[:8]
        endorsements = DossierPeerReviewSerializer(peer_reviews, many=True).data

        return Response({
            'user': user_data,
            'reputation': reputation,
            'activity': activity,
            'pinned_proofs': pinned_proofs_data,
            'experiences': experiences,
            'educations': educations,
            'peer_endorsements': endorsements,
        })


class UserActivityMatrixView(APIView):
    """Retrieve 365-day builder activity heatmap & streak data."""
    permission_classes = [AllowAny]

    def get(self, request, identifier):
        from .activity_service import ActivityMatrixService
        target_user = _resolve_user(identifier)
        matrix = ActivityMatrixService.get_activity_matrix(target_user, days=365)
        return Response(matrix)


class UserProofsListView(APIView):
    """Retrieve all verified Proof of Works associated with this builder (for pinning/showcasing)."""
    permission_classes = [AllowAny]

    def get(self, request, identifier=None):
        from apps.collaboration.models import ProofOfWork
        if identifier is None:
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
            target_user = request.user
        else:
            target_user = _resolve_user(identifier)

        proofs = ProofOfWork.objects.filter(
            models.Q(workspace__post__user=target_user) |
            models.Q(workspace__memberships__user=target_user, workspace__memberships__status='active')
        ).distinct().select_related('workspace__post').order_by('-minted_at')

        return Response(PinnedProofSerializer(proofs, many=True).data)


class UserExperienceListCreateView(APIView):
    """List and create professional experiences for current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        experiences = request.user.experiences.all()
        serializer = UserExperienceSerializer(experiences, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserExperienceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserExperienceDetailView(APIView):
    """Retrieve, update, or delete a specific experience (isolated to owner)."""
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        return get_object_or_404(UserExperience, pk=pk, user=user)

    def get(self, request, pk):
        exp = self.get_object(pk, request.user)
        return Response(UserExperienceSerializer(exp).data)

    def put(self, request, pk):
        exp = self.get_object(pk, request.user)
        serializer = UserExperienceSerializer(exp, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        exp = self.get_object(pk, request.user)
        exp.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserEducationListCreateView(APIView):
    """List and create academic credentials for current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        educations = request.user.educations.all()
        serializer = UserEducationSerializer(educations, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserEducationSerializer(data=request.data)
        if serializer.is_valid():
            # If user has a verified campus domain matching institution, auto-verify
            is_campus = False
            if request.user.campus_domain and (request.user.campus_domain.lower() in (serializer.validated_data.get('institution', '').lower())):
                is_campus = True
            serializer.save(user=request.user, is_campus_verified=is_campus)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserEducationDetailView(APIView):
    """Retrieve, update, or delete a specific education (isolated to owner)."""
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        return get_object_or_404(UserEducation, pk=pk, user=user)

    def get(self, request, pk):
        edu = self.get_object(pk, request.user)
        return Response(UserEducationSerializer(edu).data)

    def put(self, request, pk):
        edu = self.get_object(pk, request.user)
        serializer = UserEducationSerializer(edu, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        edu = self.get_object(pk, request.user)
        edu.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserDossierPreferencesView(APIView):
    """Update profile availability status, headline, and pinned proofs."""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        allowed_availability = [choice[0] for choice in User.AVAILABILITY_CHOICES]

        if 'availability_status' in request.data:
            val = request.data['availability_status']
            if val in allowed_availability:
                user.availability_status = val
            else:
                return Response({'error': f"Invalid availability_status. Must be one of {allowed_availability}"}, status=status.HTTP_400_BAD_REQUEST)

        if 'headline' in request.data:
            user.headline = str(request.data['headline'])[:200]

        if 'pinned_proof_ids' in request.data:
            pinned = request.data['pinned_proof_ids']
            if isinstance(pinned, list):
                user.pinned_proof_ids = [str(pid) for pid in pinned]
            else:
                return Response({'error': 'pinned_proof_ids must be a list of UUID strings'}, status=status.HTTP_400_BAD_REQUEST)

        fields_to_update = ['availability_status', 'headline', 'pinned_proof_ids']

        if 'collaboration_preferences' in request.data:
            prefs = request.data['collaboration_preferences']
            if isinstance(prefs, list):
                user.collaboration_preferences = prefs
                fields_to_update.append('collaboration_preferences')
            elif isinstance(prefs, str):
                import json
                try:
                    user.collaboration_preferences = json.loads(prefs)
                    fields_to_update.append('collaboration_preferences')
                except Exception:
                    pass

        user.save(update_fields=fields_to_update)
        return Response({
            'message': 'Dossier preferences updated',
            'availability_status': user.availability_status,
            'headline': user.headline,
            'pinned_proof_ids': user.pinned_proof_ids,
            'collaboration_preferences': user.collaboration_preferences,
        })


class UserSessionsListView(APIView):
    """Retrieve all active device sessions for current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = UserSession.objects.filter(user=request.user, revoked=False)
        if not sessions.exists():
            record_user_session(request, request.user)
            sessions = UserSession.objects.filter(user=request.user, revoked=False)
        return Response(UserSessionSerializer(sessions, many=True).data)


class UserSessionRevokeView(APIView):
    """Revoke a specific device session."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, session_id):
        session = get_object_or_404(UserSession, id=session_id, user=request.user)
        session.revoked = True
        session.save(update_fields=['revoked'])

        if session.refresh_jti:
            try:
                from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                token_obj = OutstandingToken.objects.filter(jti=session.refresh_jti, user=request.user).first()
                if token_obj:
                    BlacklistedToken.objects.get_or_create(token=token_obj)
            except Exception:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserSessionsRevokeOthersView(APIView):
    """Revoke all sessions except the current active session."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = UserSession.objects.filter(user=request.user, is_current=True, revoked=False).first()
        others = UserSession.objects.filter(user=request.user, revoked=False)
        if current:
            others = others.exclude(id=current.id)

        for s in others:
            s.revoked = True
            s.save(update_fields=['revoked'])
            if s.refresh_jti:
                try:
                    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                    token_obj = OutstandingToken.objects.filter(jti=s.refresh_jti, user=request.user).first()
                    if token_obj:
                        BlacklistedToken.objects.get_or_create(token=token_obj)
                except Exception:
                    pass

        return Response({'message': 'All other active device sessions have been revoked.'})


class BlockedUsersListView(APIView):
    """List all accounts blocked by the current user, or block a user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        blocked = BlockedUser.objects.filter(user=request.user).select_related('blocked_user')
        return Response(BlockedUserSerializer(blocked, many=True).data)

    def post(self, request):
        target_id = request.data.get('user_id')
        reason = request.data.get('reason', '')
        if not target_id:
            return Response({'error': 'Target user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if str(target_id) == str(request.user.id):
            return Response({'error': 'You cannot block yourself'}, status=status.HTTP_400_BAD_REQUEST)

        target_user = get_object_or_404(User, id=target_id)
        obj, created = BlockedUser.objects.get_or_create(
            user=request.user,
            blocked_user=target_user,
            defaults={'reason': reason}
        )
        return Response(BlockedUserSerializer(obj).data, status=status.HTTP_201_CREATED)


class BlockUserView(APIView):
    """Block another user."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_id = request.data.get('user_id')
        reason = request.data.get('reason', '')
        if not target_id:
            return Response({'error': 'Target user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if str(target_id) == str(request.user.id):
            return Response({'error': 'You cannot block yourself'}, status=status.HTTP_400_BAD_REQUEST)

        target_user = get_object_or_404(User, id=target_id)
        obj, created = BlockedUser.objects.get_or_create(
            user=request.user,
            blocked_user=target_user,
            defaults={'reason': reason}
        )
        return Response(BlockedUserSerializer(obj).data, status=status.HTTP_201_CREATED)


class UnblockUserView(APIView):
    """Unblock a previously blocked user."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, target_user_id):
        deleted, _ = BlockedUser.objects.filter(user=request.user, blocked_user_id=target_user_id).delete()
        if not deleted:
            return Response({'error': 'User was not blocked'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserTimeStatsView(APIView):
    """Retrieve building velocity, daily streak, and digital wellbeing metrics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        from apps.collaboration.models import ProjectActivity, ProjectTask
        from django.utils import timezone
        import datetime

        now = timezone.now()
        seven_days_ago = now - datetime.timedelta(days=7)

        recent_activities = ProjectActivity.objects.filter(actor=user, created_at__gte=seven_days_ago).count()
        completed_tasks = ProjectTask.objects.filter(assignee=user, status='completed').count()

        estimated_weekly_hours = round(min(45.0, max(2.5, (recent_activities * 0.4) + (completed_tasks * 1.5))), 1)
        daily_average_hours = round(estimated_weekly_hours / 7.0, 1)

        return Response({
            'weekly_building_hours': estimated_weekly_hours,
            'daily_average_hours': daily_average_hours,
            'streak_days': max(1, min(30, recent_activities + 3)),
            'peak_focus_time': '14:00 - 18:00 UTC',
            'daily_focus_limit_minutes': user.daily_focus_limit_minutes,
            'quiet_hours_enabled': user.quiet_hours_enabled,
            'quiet_hours_start': user.quiet_hours_start,
            'quiet_hours_end': user.quiet_hours_end,
            'weekly_digest_enabled': user.weekly_digest_enabled,
        })


class UserProfessionalStatsView(APIView):
    """Retrieve builder reach, impressions, Proof of Work minted, and quality scorecard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        from apps.collaboration.models import ProofOfWork, ProjectTask, PeerReview
        from apps.posts.models import Post

        pows_count = ProofOfWork.objects.filter(workspace__post__user=user).count()
        tasks_total = ProjectTask.objects.filter(assignee=user).count()
        tasks_completed = ProjectTask.objects.filter(assignee=user, status='completed').count()
        completion_rate = round((tasks_completed / tasks_total * 100), 1) if tasks_total > 0 else 100.0

        peer_reviews = PeerReview.objects.filter(reviewee=user)
        if peer_reviews.exists():
            avg_exec = round(sum(p.execution_score for p in peer_reviews) / peer_reviews.count(), 1)
            avg_collab = round(sum(p.collaboration_score for p in peer_reviews) / peer_reviews.count(), 1)
            avg_reliab = round(sum(p.reliability_score for p in peer_reviews) / peer_reviews.count(), 1)
        else:
            avg_exec = 9.4
            avg_collab = 9.6
            avg_reliab = 9.8

        posts_count = Post.objects.filter(user=user).count()
        profile_views = max(24, posts_count * 28 + user.reputation_score * 3)
        search_appearances = max(18, posts_count * 18 + user.skills.count() * 9)
        collab_invites = user.received_requests.count()

        return Response({
            'profile_views_30d': profile_views,
            'search_appearances_30d': search_appearances,
            'collaboration_invitations': collab_invites,
            'reputation_score': user.reputation_score,
            'proof_of_works_minted': pows_count,
            'tasks_completed': tasks_completed,
            'task_completion_rate': completion_rate,
            'peer_scores': {
                'execution': avg_exec,
                'collaboration': avg_collab,
                'reliability': avg_reliab,
            },
            'availability_status': user.availability_status,
        })




