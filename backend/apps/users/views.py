"""
User Views (Auth + Profile)
"""
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.serializers import Serializer, CharField
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.contrib.auth import authenticate, get_user_model
from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserSerializer
from .models import Follower
from apps.notifications.models import Notification
from apps.posts.models import Post

User = get_user_model()


class RegisterView(APIView):
    """User registration"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """User login"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(
                email=serializer.validated_data['email'],
                password=serializer.validated_data['password']
            )
            
            if user:
                refresh = RefreshToken.for_user(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                })
            
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
    """Get user profile by UUID — used by frontend /users/:id/"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'pk'


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
            Notification.objects.create(
                user=target_user,
                sender=request.user,
                type='follow',
                reference_id=request.user.id,
                message=f"{request.user.username} started following you",
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
    """List followers for a user."""

    permission_classes = [IsAuthenticated]

    def get(self, request, target_user_id):
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        follower_ids = (
            Follower.objects.filter(following=target_user)
            .select_related('follower')
            .order_by('-created_at')
            .values_list('follower_id', flat=True)
        )
        qs = User.objects.filter(id__in=list(follower_ids))
        data = UserSerializer(qs, many=True, context={'request': request}).data
        return Response({'count': len(data), 'results': data})


class FollowingListView(APIView):
    """List who a user is following."""

    permission_classes = [IsAuthenticated]

    def get(self, request, target_user_id):
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        following_ids = (
            Follower.objects.filter(follower=target_user)
            .select_related('following')
            .order_by('-created_at')
            .values_list('following_id', flat=True)
        )
        qs = User.objects.filter(id__in=list(following_ids))
        data = UserSerializer(qs, many=True, context={'request': request}).data
        return Response({'count': len(data), 'results': data})


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

        Notification.objects.create(
            user=target_user,
            sender=request.user,
            type='follow',
            reference_id=request.user.id,
            message=f"{request.user.username} started following you"
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

