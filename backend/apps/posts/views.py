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
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound, NotAuthenticated
from django.db.models import (
    Count, Q, Case, When, Value, IntegerField, BooleanField, Exists, OuterRef, Subquery, F, ExpressionWrapper
)
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
from .models import Post, Like, Comment, SavedPost, PostCollaborator, PostReport, PostAttachment, PostTag, PostRequirement
from .serializers import PostSerializer, CreatePostSerializer, CommentSerializer
from .services.geo_service import annotate_distance, build_ripple_score_expression


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
        from apps.users.models import User, Follower

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise NotFound('User not found')

        if target_user.is_private:
            request_user = self.request.user
            is_owner = bool(request_user and request_user.is_authenticated and request_user.id == target_user.id)
            is_follower = bool(
                request_user and request_user.is_authenticated and
                Follower.objects.filter(follower=request_user, following=target_user).exists()
            )
            if not (is_owner or is_follower):
                raise PermissionDenied('This account is private. Follow this user to see their posts.')

        qs = Post.objects.filter(user_id=user_id)
        # Exclude moderated reported posts (>= 3 reports) from public/non-owner view
        if not (self.request.user and self.request.user.is_authenticated and self.request.user.id == target_user.id):
            reported_post_ids = PostReport.objects.values('post_id').annotate(
                report_count=Count('id')
            ).filter(report_count__gte=3).values_list('post_id', flat=True)
            qs = qs.exclude(id__in=Subquery(reported_post_ids))

        qs = qs.select_related('user').prefetch_related(
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

        # Moderation: exclude posts with 3 or more reports
        reported_post_ids = PostReport.objects.values('post_id').annotate(
            report_count=Count('id')
        ).filter(report_count__gte=3).values_list('post_id', flat=True)
        queryset = queryset.exclude(id__in=Subquery(reported_post_ids))

        # Privacy: private user posts are only visible to owner and approved followers
        user = self.request.user
        if user and user.is_authenticated:
            from apps.users.models import Follower
            followed_ids = Follower.objects.filter(follower=user).values_list('following_id', flat=True)
            privacy_q = Q(user__is_private=False) | Q(user=user) | Q(user_id__in=followed_ids)
        else:
            privacy_q = Q(user__is_private=False)
        queryset = queryset.filter(privacy_q)

        qs = queryset.annotate(
            _likes_count=Count('likes', distinct=True),
            _comments_count=Count('comments', distinct=True)
        ).order_by('-created_at')
        return _annotate_user_interactions(qs, self.request.user)



class FeedView(generics.ListAPIView):
    """
    Feed View supporting:
      - for_you: Personalized builder discovery algorithm (skills, location, college, engagement, recency, author diversity)
      - following: Chronological posts from followed builders (excluding self)
      - public: Public posts
      - college: Same-college posts for authenticated college members
      - openidea: Open collaboration idea posts
    Enforces moderation (reports >= 3 excluded) and privacy (private account posts hidden from non-followers).
    """
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def _apply_moderation_and_privacy(self, queryset, user):
        """Apply strict moderation and private profile restrictions across all feed queries."""
        # Moderation: exclude posts with 3 or more reports
        reported_post_ids = PostReport.objects.values('post_id').annotate(
            report_count=Count('id')
        ).filter(report_count__gte=3).values_list('post_id', flat=True)
        queryset = queryset.exclude(id__in=Subquery(reported_post_ids))

        # Privacy: private user posts are only visible to owner and approved followers
        if user and user.is_authenticated:
            from apps.users.models import Follower
            followed_ids = Follower.objects.filter(follower=user).values_list('following_id', flat=True)
            privacy_q = Q(user__is_private=False) | Q(user=user) | Q(user_id__in=followed_ids)
        else:
            privacy_q = Q(user__is_private=False)

        return queryset.filter(privacy_q)

    def _build_following_queryset(self, queryset, user, category, location):
        """Following feed: newest posts from followed builders."""
        if not (user and user.is_authenticated):
            raise NotAuthenticated('Please log in to view posts from builders you follow.')

        from apps.users.models import Follower
        followed_ids = Follower.objects.filter(follower=user).values_list('following_id', flat=True)

        qs = queryset.filter(user_id__in=followed_ids).exclude(user=user)
        if category:
            qs = qs.filter(category__iexact=category)
        if location:
            qs = qs.filter(location__icontains=location)

        qs = qs.annotate(
            _likes_count=Count('likes', distinct=True),
            _comments_count=Count('comments', distinct=True)
        )
        qs = _annotate_user_interactions(qs, user)
        return qs.order_by('-created_at', '-id')

    def _resolve_coordinates(self):
        user = self.request.user
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        if lat is not None and lng is not None:
            try:
                lat_f = float(lat)
                lng_f = float(lng)
                if -90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0:
                    return lat_f, lng_f
            except (ValueError, TypeError):
                pass
        if user and user.is_authenticated:
            u_lat = getattr(user, 'latitude', None)
            u_lng = getattr(user, 'longitude', None)
            if u_lat is not None and u_lng is not None:
                try:
                    lat_f = float(u_lat)
                    lng_f = float(u_lng)
                    if -90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0:
                        return lat_f, lng_f
                except (ValueError, TypeError):
                    pass
        return None, None

    def _build_for_you_queryset(self, queryset, user, category, location, ref_lat=None, ref_lng=None):
        """Personalized Discovery Algorithm (For You feed) with Geo-Ripple Expansion."""
        from apps.users.models import UserSkill

        # For You includes public posts, open ideas, and college posts if user matches college
        view_type_q = Q(view_type='public') | Q(view_type='openidea')
        if user and user.is_authenticated and getattr(user, 'college', ''):
            view_type_q |= Q(view_type='college', college__iexact=user.college.strip())
        qs = queryset.filter(view_type_q)

        if category:
            qs = qs.filter(category__iexact=category)
        if location:
            qs = qs.filter(Q(location__icontains=location) | Q(city__icontains=location))

        # 1. Base counts & distance annotation
        qs = qs.annotate(
            _likes_count=Count('likes', distinct=True),
            _comments_count=Count('comments', distinct=True)
        )
        qs = annotate_distance(qs, ref_lat, ref_lng)

        # 2. Skill match with proficiency weighting (up to 40 pts)
        adv_skills = []
        int_skills = []
        beg_skills = []
        if user and user.is_authenticated:
            skills = UserSkill.objects.filter(user=user)
            for s in skills:
                name = s.skill_name.strip()
                if not name:
                    continue
                lvl = (s.level or 'intermediate').lower()
                if lvl == 'advanced':
                    adv_skills.append(name)
                elif lvl == 'beginner':
                    beg_skills.append(name)
                else:
                    int_skills.append(name)

        def _build_skill_q(skill_names):
            if not skill_names:
                return Q(pk__in=[])
            q_obj = Q()
            for n in skill_names:
                q_obj |= Q(category__iexact=n)
                q_obj |= Exists(PostTag.objects.filter(post=OuterRef('pk'), tag_name__iexact=n))
                q_obj |= Exists(PostRequirement.objects.filter(post=OuterRef('pk'), role_name__icontains=n))
            return q_obj

        adv_q = _build_skill_q(adv_skills)
        int_q = _build_skill_q(int_skills)
        beg_q = _build_skill_q(beg_skills)

        skill_score = Case(
            When(adv_q, then=Value(40)),
            When(int_q, then=Value(35)),
            When(beg_q, then=Value(25)),
            default=Value(0),
            output_field=IntegerField()
        )

        # 3. Location / Ripple proximity score (up to 40 pts)
        has_coords = bool(ref_lat is not None and ref_lng is not None)
        ripple_score = build_ripple_score_expression(has_coords=has_coords)

        # Text location fallback if GPS coordinates are not provided (up to 25 pts)
        if not has_coords and user and user.is_authenticated and getattr(user, 'location', ''):
            user_loc = user.location.strip()
            text_loc_score = Case(
                When(location__iexact=user_loc, then=Value(25)),
                When(city__iexact=user_loc, then=Value(25)),
                When(is_remote=True, then=Value(15)),
                default=Value(0),
                output_field=IntegerField()
            )
        else:
            text_loc_score = Value(0, output_field=IntegerField())

        # 4. College match boost (+20 pts)
        if user and user.is_authenticated and getattr(user, 'college', ''):
            user_col = user.college.strip()
            college_score = Case(
                When(college__iexact=user_col, then=Value(20)),
                default=Value(0),
                output_field=IntegerField()
            )
        else:
            college_score = Value(0, output_field=IntegerField())

        # 5. Engagement score (up to 15 pts, raw = likes * 1 + comments * 2)
        raw_eng = ExpressionWrapper(
            F('_likes_count') + F('_comments_count') * 2,
            output_field=IntegerField()
        )
        engagement_score = Case(
            When(_raw_engagement__gt=15, then=Value(15)),
            default=F('_raw_engagement'),
            output_field=IntegerField()
        )

        # 6. Recency decay (0 to -50 pts, ~2 pts/day)
        now = timezone.now()
        t1 = now - timedelta(days=1)
        t2 = now - timedelta(days=2)
        t3 = now - timedelta(days=3)
        t5 = now - timedelta(days=5)
        t7 = now - timedelta(days=7)
        t14 = now - timedelta(days=14)
        t30 = now - timedelta(days=30)

        recency_score = Case(
            When(created_at__gte=t1, then=Value(0)),
            When(created_at__gte=t2, then=Value(-2)),
            When(created_at__gte=t3, then=Value(-4)),
            When(created_at__gte=t5, then=Value(-8)),
            When(created_at__gte=t7, then=Value(-12)),
            When(created_at__gte=t14, then=Value(-20)),
            When(created_at__gte=t30, then=Value(-35)),
            default=Value(-50),
            output_field=IntegerField()
        )

        # 7. Author diversity penalty (-10 for 2nd post in 7 days, -20 for 3rd+)
        newer_author_posts_subquery = Coalesce(
            Subquery(
                Post.objects.filter(
                    user=OuterRef('user'),
                    created_at__gt=OuterRef('created_at'),
                    created_at__gte=t7
                ).values('user').annotate(cnt=Count('id')).values('cnt')[:1]
            ),
            Value(0),
            output_field=IntegerField()
        )

        author_penalty = Case(
            When(_newer_author_posts__gte=2, then=Value(20)),
            When(_newer_author_posts=1, then=Value(10)),
            default=Value(0),
            output_field=IntegerField()
        )

        qs = qs.annotate(
            _raw_engagement=raw_eng,
            _newer_author_posts=newer_author_posts_subquery
        ).annotate(
            _skill_score=skill_score,
            _ripple_score=ripple_score,
            _text_loc_score=text_loc_score,
            _college_score=college_score,
            _engagement_score=engagement_score,
            _recency_score=recency_score,
            _author_penalty=author_penalty
        ).annotate(
            _ranking_score=ExpressionWrapper(
                F('_skill_score') + F('_ripple_score') + F('_text_loc_score') + F('_college_score') +
                F('_engagement_score') + F('_recency_score') - F('_author_penalty'),
                output_field=IntegerField()
            )
        )

        qs = _annotate_user_interactions(qs, user)
        return qs.order_by('-_ranking_score', '-created_at', '-id')

    def get_queryset(self):
        user = self.request.user
        mode_param = (self.request.query_params.get('mode') or '').strip().lower()
        filter_param = (self.request.query_params.get('filter') or '').strip().lower()
        category = (self.request.query_params.get('category') or '').strip()
        location = (self.request.query_params.get('location') or '').strip()

        # Resolve coordinates from query params or user profile
        ref_lat, ref_lng = self._resolve_coordinates()

        # Resolve effective feed mode
        feed_mode = mode_param or filter_param or 'for_you'

        base_qs = Post.objects.select_related('user').prefetch_related(
            'attachments', 'requirements', 'tags', 'likes', 'comments'
        )
        base_qs = self._apply_moderation_and_privacy(base_qs, user)

        if feed_mode == 'following':
            qs = self._build_following_queryset(base_qs, user, category, location)
            return annotate_distance(qs, ref_lat, ref_lng)

        if feed_mode == 'college':
            if user and user.is_authenticated and getattr(user, 'college', ''):
                qs = base_qs.filter(view_type='college', college__iexact=user.college.strip())
            else:
                return Post.objects.none()
            if category:
                qs = qs.filter(category__iexact=category)
            if location:
                qs = qs.filter(Q(location__icontains=location) | Q(city__icontains=location))
            qs = qs.annotate(
                _likes_count=Count('likes', distinct=True),
                _comments_count=Count('comments', distinct=True)
            )
            qs = annotate_distance(qs, ref_lat, ref_lng)
            return _annotate_user_interactions(qs, user).order_by('-created_at', '-id')

        if feed_mode == 'openidea':
            qs = base_qs.filter(view_type='openidea')
            if category:
                qs = qs.filter(category__iexact=category)
            if location:
                qs = qs.filter(Q(location__icontains=location) | Q(city__icontains=location))
            qs = qs.annotate(
                _likes_count=Count('likes', distinct=True),
                _comments_count=Count('comments', distinct=True)
            )
            qs = annotate_distance(qs, ref_lat, ref_lng)
            return _annotate_user_interactions(qs, user).order_by('-created_at', '-id')

        if feed_mode == 'public':
            qs = base_qs.filter(view_type='public')
            if category:
                qs = qs.filter(category__iexact=category)
            if location:
                qs = qs.filter(Q(location__icontains=location) | Q(city__icontains=location))
            qs = qs.annotate(
                _likes_count=Count('likes', distinct=True),
                _comments_count=Count('comments', distinct=True)
            )
            qs = annotate_distance(qs, ref_lat, ref_lng)
            return _annotate_user_interactions(qs, user).order_by('-created_at', '-id')

        # Default: for_you
        return self._build_for_you_queryset(base_qs, user, category, location, ref_lat, ref_lng)




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
        # 1. Idempotency check: if client_post_id is provided, replay existing post
        client_post_id = (
            request.headers.get('Idempotency-Key') or
            request.data.get('client_post_id') or
            ''
        ).strip()

        if client_post_id:
            existing_post = Post.objects.filter(user=request.user, client_post_id=client_post_id).first()
            if existing_post:
                data = PostSerializer(existing_post, context={'request': request}).data
                return Response(data, status=status.HTTP_200_OK)

        # 2. Upload size & count validation
        media_files = request.FILES.getlist('media')
        if len(media_files) > 6:
            raise ValidationError({'media': 'Maximum 6 media files allowed per post.'})
        for file_obj in media_files:
            if getattr(file_obj, 'size', 0) > 10 * 1024 * 1024:
                raise ValidationError({'media': f"File '{getattr(file_obj, 'name', 'file')}' exceeds the 10MB size limit."})

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Handle media upload atomically: if upload fails, rollback post creation.
        with transaction.atomic():
            post = serializer.save(user=request.user, client_post_id=client_post_id or None)

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
    """Like or unlike a post, returning canonical likes_count and liked state."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, post_id):
        action = request.data.get('action', 'toggle') if isinstance(request.data, dict) else 'toggle'
        with transaction.atomic():
            try:
                post = Post.objects.select_for_update().get(id=post_id)
            except Post.DoesNotExist:
                return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
            
            existing_like = Like.objects.filter(post=post, user=request.user).first()
            
            if action == 'unlike':
                if existing_like:
                    existing_like.delete()
                liked = False
            elif action == 'like':
                if not existing_like:
                    Like.objects.create(post=post, user=request.user)
                    if post.user != request.user:
                        from apps.notifications.models import Notification
                        Notification.objects.create(
                            user=post.user,
                            sender=request.user,
                            type='like',
                            reference_id=post.id,
                            message=f"{request.user.username} liked your post"
                        )
                liked = True
            else:  # toggle
                if existing_like:
                    existing_like.delete()
                    liked = False
                else:
                    Like.objects.create(post=post, user=request.user)
                    if post.user != request.user:
                        from apps.notifications.models import Notification
                        Notification.objects.create(
                            user=post.user,
                            sender=request.user,
                            type='like',
                            reference_id=post.id,
                            message=f"{request.user.username} liked your post"
                        )
                    liked = True

            likes_count = post.likes.count()

        return Response({'liked': liked, 'likes_count': likes_count})

    def delete(self, request, post_id):
        """Unlike a post (explicit DELETE, per spec)."""
        with transaction.atomic():
            try:
                post = Post.objects.select_for_update().get(id=post_id)
            except Post.DoesNotExist:
                return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
            Like.objects.filter(post=post, user=request.user).delete()
            likes_count = post.likes.count()
        return Response({'liked': False, 'likes_count': likes_count})


class UnlikePostView(APIView):
    """Alias for unliking via POST /posts/{id}/unlike/."""
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        with transaction.atomic():
            try:
                post = Post.objects.select_for_update().get(id=post_id)
            except Post.DoesNotExist:
                return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
            Like.objects.filter(post=post, user=request.user).delete()
            likes_count = post.likes.count()
        return Response({'liked': False, 'likes_count': likes_count})


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

        # Check if already requested (allow re-request only if previously declined or cancelled)
        existing_request = CollaborationRequest.objects.filter(post=post, sender=request.user).first()
        if existing_request and existing_request.status in ('pending', 'accepted'):
            return Response({'error': 'Request already sent'}, status=status.HTTP_400_BAD_REQUEST)

        message = (request.data.get('message') or '').strip()
        if existing_request and existing_request.status in ('declined', 'cancelled'):
            collab_request = existing_request
            collab_request.receiver = post.user
            collab_request.message = message
            collab_request.status = 'pending'
            collab_request.save(update_fields=['receiver', 'message', 'status', 'updated_at'])
        else:
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
    """Get comments for a post or create new comment with idempotency and canonical counts."""
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        post_id = self.kwargs['post_id']
        return Comment.objects.filter(post_id=post_id).select_related('user')
    
    def create(self, request, *args, **kwargs):
        post_id = self.kwargs['post_id']
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

        client_comment_id = (
            request.headers.get('Idempotency-Key') or
            request.data.get('client_comment_id') or
            ''
        ).strip()

        if client_comment_id:
            existing = Comment.objects.filter(
                post=post, user=request.user, client_comment_id=client_comment_id
            ).select_related('user').first()
            if existing:
                data = self.get_serializer(existing).data
                data['post_comments_count'] = post.comments.count()
                return Response(data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            comment = serializer.save(
                user=request.user,
                post=post,
                client_comment_id=client_comment_id or None,
            )
            comments_count = post.comments.count()

        if post.user != request.user:
            from apps.notifications.models import Notification
            Notification.objects.create(
                user=post.user,
                sender=request.user,
                type='comment',
                reference_id=post.id,
                message=f"{request.user.username} commented on your post"
            )

        data = self.get_serializer(comment).data
        data['post_comments_count'] = comments_count
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)


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
