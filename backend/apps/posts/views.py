"""
Posts Views (Feed System with Location Filtering)
"""
import os
import uuid

import cloudinary.uploader
from django.db import transaction
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, SAFE_METHODS, BasePermission
from rest_framework.exceptions import ValidationError
from django.db.models import Count, Q, Case, When, Value, IntegerField, BooleanField, Exists, OuterRef, Subquery
from .models import Post, Like, Comment, SavedPost, PostCollaborator, PostReport, PostAttachment
from .serializers import PostSerializer, CreatePostSerializer, CommentSerializer


class IsPostOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and obj.user_id == request.user.id


def _annotate_user_interactions(queryset, user):
    """Annotate queryset with per-user interaction flags to avoid N+1 queries."""
    if user and user.is_authenticated:
        from apps.collaboration.models import CollaborationRequest
        queryset = queryset.annotate(
            _is_liked=Exists(Like.objects.filter(post=OuterRef('pk'), user=user)),
            _is_saved=Exists(SavedPost.objects.filter(post=OuterRef('pk'), user=user)),
            _has_requested_collaboration=Exists(
                CollaborationRequest.objects.filter(
                    post=OuterRef('pk'), sender=user
                ).exclude(status='declined')
            ),
        )
    else:
        queryset = queryset.annotate(
            _is_liked=Value(False, output_field=BooleanField()),
            _is_saved=Value(False, output_field=BooleanField()),
            _has_requested_collaboration=Value(False, output_field=BooleanField()),
        )
    return queryset


class UserPostsView(generics.ListAPIView):
    """Get all posts by a specific user UUID — used by /api/v1/users/:id/posts/"""
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        qs = Post.objects.filter(user_id=user_id).select_related('user').prefetch_related(
            'attachments', 'requirements', 'tags'
        ).annotate(
            _likes_count=Count('likes', distinct=True),
            _comments_count=Count('comments', distinct=True)
        ).order_by('-created_at')
        return _annotate_user_interactions(qs, self.request.user)


class PostSearchView(generics.ListAPIView):
    """Search posts by title, description, or tags"""
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()
        category = self.request.query_params.get('category')
        location = self.request.query_params.get('location')

        if not query:
            return Post.objects.none()

        queryset = Post.objects.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(tags__tag_name__icontains=query)
        ).distinct().select_related('user').prefetch_related(
            'attachments', 'requirements', 'tags', 'likes', 'comments'
        )

        if category:
            queryset = queryset.filter(category=category)
        if location:
            queryset = queryset.filter(location__icontains=location)

        qs = queryset.annotate(
            _likes_count=Count('likes', distinct=True),
            _comments_count=Count('comments', distinct=True)
        ).order_by('-created_at')
        return _annotate_user_interactions(qs, self.request.user)



class FeedView(generics.ListAPIView):
    """
    Get feed with filters: public, college, openidea
    Supports location-based filtering
    """
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        filter_type = self.request.query_params.get('filter', 'public')
        location = self.request.query_params.get('location')

        queryset = Post.objects.select_related('user').prefetch_related(
            'attachments', 'requirements', 'tags', 'likes', 'comments'
        )

        # Filter by view type
        if filter_type == 'public':
            queryset = queryset.filter(view_type='public')
        elif filter_type == 'college':
            if self.request.user.is_authenticated:
                queryset = queryset.filter(
                    view_type='college',
                    college=self.request.user.college
                )
            else:
                # Unauthenticated users cannot see college-only posts
                return Post.objects.none()
        elif filter_type == 'openidea':
            queryset = queryset.filter(view_type='openidea')

        # Only filter by location if explicitly requested
        if location:
            queryset = queryset.filter(location=location)

        # Location-based suggestions (ordering only): if user has a location,
        # prioritize posts from the same location first.
        user_location = ''
        if self.request.user.is_authenticated:
            user_location = (getattr(self.request.user, 'location', '') or '').strip()
        if user_location and not location:
            queryset = queryset.annotate(
                location_match=Case(
                    When(location__iexact=user_location, then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField(),
                )
            )

        # Annotate with counts for performance
        queryset = queryset.annotate(
            _likes_count=Count('likes', distinct=True),
            _comments_count=Count('comments', distinct=True)
        )
        queryset = _annotate_user_interactions(queryset, self.request.user)

        if user_location and not location:
            return queryset.order_by('-location_match', '-created_at')
        return queryset.order_by('-created_at')



class CreatePostView(generics.CreateAPIView):
    """Create new post"""
    serializer_class = CreatePostSerializer
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _guess_attachment_type(mime: str) -> str:
        mime = (mime or '').lower()
        if mime.startswith('image/'):
            return 'image'
        if mime.startswith('video/'):
            return 'video'
        if mime == 'application/pdf':
            return 'pdf'
        if mime in {
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }:
            return 'doc'
        return 'other'

    def _store_local(self, request, file_obj) -> str:
        storage = FileSystemStorage(location=str(settings.MEDIA_ROOT), base_url=settings.MEDIA_URL)
        ext = ''
        original_name = getattr(file_obj, 'name', '') or ''
        if '.' in original_name:
            ext = '.' + original_name.rsplit('.', 1)[-1]
        filename = f"posts/{uuid.uuid4().hex}{ext}"
        saved_name = storage.save(filename, file_obj)
        return request.build_absolute_uri(storage.url(saved_name))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Handle media upload atomically: if upload fails, rollback post creation.
        with transaction.atomic():
            post = serializer.save(user=request.user)

            media_files = request.FILES.getlist('media')
            for file_obj in media_files:
                # Prefer Cloudinary when configured, but fallback to local storage for dev/test reliability.
                secure_url = None
                _cld_available = False
                try:
                    import cloudinary as _cld
                    _cfg = _cld.config()
                    _cld_available = bool(_cfg.cloud_name and _cfg.api_key and _cfg.api_secret)
                except Exception:
                    pass

                if _cld_available:
                    try:
                        upload_result = cloudinary.uploader.upload(
                            file_obj,
                            resource_type='auto',
                            folder=os.getenv('CLOUDINARY_POSTS_FOLDER', 'enquebet/posts'),
                        )
                        secure_url = upload_result.get('secure_url')
                    except Exception:
                        secure_url = None

                if not secure_url:
                    try:
                        secure_url = self._store_local(request, file_obj)
                    except Exception as exc:
                        raise ValidationError({'media': f"Media upload failed: {exc}"})

                PostAttachment.objects.create(
                    post=post,
                    file_url=secure_url,
                    file_type=self._guess_attachment_type(getattr(file_obj, 'content_type', '') or ''),
                )

        data = PostSerializer(post, context={'request': request}).data
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete post"""
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsPostOwnerOrReadOnly]


class LikePostView(APIView):
    """Like or unlike a post"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
        
        like, created = Like.objects.get_or_create(post=post, user=request.user)
        
        if not created:
            # Unlike
            like.delete()
            return Response({'liked': False})
        
        # Create notification for post owner
        if post.user != request.user:
            from apps.notifications.models import Notification
            Notification.objects.create(
                user=post.user,
                sender=request.user,
                type='like',
                reference_id=post.id,
                message=f"{request.user.username} liked your post"
            )
        
        return Response({'liked': True})

    def delete(self, request, post_id):
        """Unlike a post (explicit DELETE, per spec)."""
        Like.objects.filter(post_id=post_id, user=request.user).delete()
        return Response({'liked': False})


class UnlikePostView(APIView):
    """Alias for unliking via POST /posts/{id}/unlike/."""
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        Like.objects.filter(post_id=post_id, user=request.user).delete()
        return Response({'liked': False})


class PostJoinView(APIView):
    """Alias endpoint for the Build With action.

    Spec-friendly routes handled by this view:
    - POST /api/v1/posts/{post_id}/join/
    - POST /api/v1/posts/{post_id}/collaborate/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        from apps.collaboration.models import CollaborationRequest
        from apps.notifications.models import Notification

        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

        if post.user == request.user:
            return Response({'error': 'You cannot join your own post'}, status=status.HTTP_400_BAD_REQUEST)

        if PostCollaborator.objects.filter(post=post, user=request.user).exists():
            return Response({'joined': True, 'requested': False})

        # Check if already requested (pending/accepted)
        if CollaborationRequest.objects.filter(post=post, sender=request.user).exclude(status='declined').exists():
            return Response({'error': 'Request already sent'}, status=status.HTTP_400_BAD_REQUEST)

        message = (request.data.get('message') or '').strip()
        collab_request = CollaborationRequest.objects.create(
            post=post,
            sender=request.user,
            receiver=post.user,
            message=message,
        )

        Notification.objects.create(
            user=post.user,
            sender=request.user,
            type='collaboration_request',
            reference_id=collab_request.id,
            message=f"{request.user.username} wants to collaborate on '{post.title}'",
        )

        return Response({'requested': True, 'request_id': str(collab_request.id)}, status=status.HTTP_201_CREATED)


class ReportPostView(APIView):
    """Report a post."""
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

        reason = (request.data.get('reason') or request.data.get('message') or '').strip()
        report, created = PostReport.objects.get_or_create(
            post=post,
            reporter=request.user,
            defaults={'reason': reason},
        )
        if not created and reason and report.reason != reason:
            report.reason = reason
            report.save(update_fields=['reason'])

        return Response({'reported': True, 'created': created})


class IsCommentOwnerOrReadOnly(BasePermission):
    """Only the comment author can modify/delete."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and obj.user_id == request.user.id


class CommentListCreateView(generics.ListCreateAPIView):
    """Get comments for a post or create new comment"""
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        post_id = self.kwargs['post_id']
        return Comment.objects.filter(post_id=post_id).select_related('user')
    
    def perform_create(self, serializer):
        post_id = self.kwargs['post_id']
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Post not found')
        serializer.save(user=self.request.user, post=post)
        
        # Create notification for post owner
        if post.user != self.request.user:
            from apps.notifications.models import Notification
            Notification.objects.create(
                user=post.user,
                sender=self.request.user,
                type='comment',
                reference_id=post.id,
                message=f"{self.request.user.username} commented on your post"
            )


class CommentDeleteView(generics.DestroyAPIView):
    """Delete a comment — only the comment owner may delete."""
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, IsCommentOwnerOrReadOnly]
    lookup_field = 'pk'
    lookup_url_kwarg = 'comment_id'

    def get_queryset(self):
        return Comment.objects.filter(post_id=self.kwargs['post_id']).select_related('user')


class SavedPostsListView(generics.ListAPIView):
    """Get all saved posts for the current user"""
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Post.objects.filter(
            saved_posts__user=self.request.user
        ).select_related('user').prefetch_related(
            'attachments', 'requirements', 'tags'
        ).annotate(
            _likes_count=Count('likes', distinct=True),
            _comments_count=Count('comments', distinct=True)
        ).order_by('-saved_posts__created_at')
        return _annotate_user_interactions(qs, self.request.user)


class SavePostView(APIView):
    """Save or unsave a post"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
        
        saved, created = SavedPost.objects.get_or_create(post=post, user=request.user)
        
        if not created:
            saved.delete()
            return Response({'saved': False})
        
        return Response({'saved': True})
