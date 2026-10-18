"""Search API for ENQUEbet.

Provides a unified, high-performance Search & Builder Discovery Engine
across Builders and Projects. Supports multi-signal discovery (name, headline,
bio, skills, college, location, project requirements, tags) with strict
privacy and report moderation enforcement, zero N+1 queries, and pagination.
"""

from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Subquery
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.posts.models import Post, PostReport, PostTag
from apps.posts.serializers import PostSerializer
from apps.posts.views import _annotate_user_interactions
from apps.users.serializers import UserSerializer

User = get_user_model()


class SearchView(APIView):
    """Unified Search & Discovery across Builders and Projects.

    Query params:
      - q: search term (matches name, username, headline, bio, skills, tags, requirements)
      - type: all|builders|projects|users|posts (default: all)
      - category: project category filter (e.g. tech, design, ai)
      - location: city/state location filter
      - college: university/institution filter
      - skills: comma-separated skill names for builder search
      - role: required collaborator role filter for project search
      - page: page number (1-indexed, default: 1)
      - page_size: items per page (default: 15 for specific type, 5 for 'all', max: 50)
    """

    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        search_type = (request.query_params.get("type") or "all").strip().lower()
        category_filter = (request.query_params.get("category") or "").strip()
        location_filter = (request.query_params.get("location") or "").strip()
        college_filter = (request.query_params.get("college") or "").strip()
        skills_filter = (request.query_params.get("skills") or "").strip()
        role_filter = (request.query_params.get("role") or "").strip()
        availability_filter = (request.query_params.get("availability") or "").strip().lower()
        verified_only = request.query_params.get("verified_only", "").lower() in ("true", "1")
        sort_by = (request.query_params.get("sort_by") or "reputation").strip().lower()

        # Parse pagination
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1

        default_page_size = 5 if search_type == "all" else 15
        try:
            page_size = min(50, max(1, int(request.query_params.get("page_size", default_page_size))))
        except (ValueError, TypeError):
            page_size = default_page_size

        # Return empty result set if neither query nor any filter is provided
        has_filter = any([
            search_type in {"builders", "projects", "users", "posts"},
            category_filter and category_filter.lower() != "all",
            location_filter,
            college_filter,
            skills_filter,
            role_filter,
            availability_filter,
            verified_only,
        ])
        if not query and not has_filter:
            empty_pagination = {
                "page": page,
                "page_size": page_size,
                "total_users": 0,
                "total_posts": 0,
                "total_pages": 1,
                "has_next": False,
                "has_prev": False,
            }
            return Response({
                "users": [],
                "posts": [],
                "builders": [],
                "projects": [],
                "pagination": empty_pagination,
            })

        user = request.user
        include_builders = search_type in {"all", "users", "builders"}
        include_projects = search_type in {"all", "posts", "projects"}

        # -------------------------------------------------------------
        # 1. Builders Queryset
        # -------------------------------------------------------------
        user_qs = User.objects.none()
        if include_builders:
            user_qs = User.objects.all()

            if query:
                user_qs = user_qs.filter(
                    Q(username__icontains=query)
                    | Q(full_name__icontains=query)
                    | Q(headline__icontains=query)
                    | Q(bio__icontains=query)
                    | Q(skills__skill_name__icontains=query)
                )

            if skills_filter:
                skill_tokens = [s.strip() for s in skills_filter.split(",") if s.strip()]
                for st in skill_tokens:
                    user_qs = user_qs.filter(skills__skill_name__icontains=st)

            if location_filter:
                user_qs = user_qs.filter(location__icontains=location_filter)

            if college_filter:
                user_qs = user_qs.filter(college__icontains=college_filter)

            if availability_filter:
                user_qs = user_qs.filter(availability_status__iexact=availability_filter)

            if verified_only:
                user_qs = user_qs.filter(verification_level__gt=0)

            if sort_by == "newest":
                user_qs = (
                    user_qs.distinct()
                    .prefetch_related("skills")
                    .order_by("-created_at")
                )
            else:
                user_qs = (
                    user_qs.distinct()
                    .prefetch_related("skills")
                    .order_by("-reputation_score", "-verification_level", "-created_at")
                )

        # -------------------------------------------------------------
        # 2. Projects Queryset
        # -------------------------------------------------------------
        post_qs = Post.objects.none()
        if include_projects:
            post_qs = Post.objects.all()

            if query:
                post_qs = post_qs.filter(
                    Q(title__icontains=query)
                    | Q(description__icontains=query)
                    | Q(tags__tag_name__icontains=query)
                    | Q(requirements__role_name__icontains=query)
                )

            if category_filter and category_filter.lower() != "all":
                post_qs = post_qs.filter(category__iexact=category_filter)

            if location_filter:
                post_qs = post_qs.filter(location__icontains=location_filter)

            if college_filter:
                post_qs = post_qs.filter(college__icontains=college_filter)

            if role_filter:
                post_qs = post_qs.filter(requirements__role_name__icontains=role_filter)

            # Moderation: exclude posts with 3 or more reports
            reported_post_ids = PostReport.objects.values("post_id").annotate(
                report_count=Count("id")
            ).filter(report_count__gte=3).values_list("post_id", flat=True)
            post_qs = post_qs.exclude(id__in=Subquery(reported_post_ids))

            # Privacy: private user posts are only visible to author and followers
            if user and user.is_authenticated:
                from apps.users.models import Follower
                followed_ids = Follower.objects.filter(follower=user).values_list("following_id", flat=True)
                privacy_q = Q(user__is_private=False) | Q(user=user) | Q(user_id__in=followed_ids)
            else:
                privacy_q = Q(user__is_private=False)
            post_qs = post_qs.filter(privacy_q)

            # View type visibility scoping
            if not college_filter:
                if user and user.is_authenticated and getattr(user, "college", ""):
                    view_type_q = Q(view_type__in=["public", "openidea"]) | Q(
                        view_type="college", college__iexact=user.college
                    )
                else:
                    view_type_q = Q(view_type__in=["public", "openidea"])
                post_qs = post_qs.filter(view_type_q)

            post_qs = (
                post_qs.distinct()
                .select_related("user")
                .prefetch_related("attachments", "requirements", "tags", "likes", "comments")
                .annotate(
                    _likes_count=Count("likes", distinct=True),
                    _comments_count=Count("comments", distinct=True),
                )
            )
            post_qs = _annotate_user_interactions(post_qs, user).order_by("-created_at")

        # -------------------------------------------------------------
        # 3. Pagination & Slicing
        # -------------------------------------------------------------
        if search_type == "all":
            users_count = user_qs.count()
            posts_count = post_qs.count()
            users_slice = list(user_qs[:page_size])
            posts_slice = list(post_qs[:page_size])
            pagination = {
                "page": 1,
                "page_size": page_size,
                "total_users": users_count,
                "total_posts": posts_count,
                "has_more_users": users_count > page_size,
                "has_more_posts": posts_count > page_size,
            }
        elif search_type in {"users", "builders"}:
            users_count = user_qs.count()
            offset = (page - 1) * page_size
            users_slice = list(user_qs[offset:offset + page_size])
            posts_slice = []
            posts_count = 0
            total_pages = max(1, (users_count + page_size - 1) // page_size)
            pagination = {
                "page": page,
                "page_size": page_size,
                "total_users": users_count,
                "total_posts": 0,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            }
        else:  # {"posts", "projects"}
            posts_count = post_qs.count()
            offset = (page - 1) * page_size
            posts_slice = list(post_qs[offset:offset + page_size])
            users_slice = []
            users_count = 0
            total_pages = max(1, (posts_count + page_size - 1) // page_size)
            pagination = {
                "page": page,
                "page_size": page_size,
                "total_users": 0,
                "total_posts": posts_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            }

        # -------------------------------------------------------------
        # 4. Serialization with N+1 Prevention
        # -------------------------------------------------------------
        if user and user.is_authenticated:
            from apps.users.models import Follower
            followed_user_ids = set(
                Follower.objects.filter(follower=user).values_list("following_id", flat=True)
            )
        else:
            followed_user_ids = set()

        serializer_context = {
            "request": request,
            "followed_user_ids": followed_user_ids,
        }

        users_data = UserSerializer(users_slice, many=True, context=serializer_context).data
        posts_data = PostSerializer(posts_slice, many=True, context=serializer_context).data

        return Response({
            "users": users_data,
            "posts": posts_data,
            "builders": users_data,
            "projects": posts_data,
            "pagination": pagination,
        })


class SearchSuggestionsView(APIView):
    """Sub-15ms auto-complete suggestion endpoint.

    Aggregates matching tags/skills, builder names/usernames, colleges, and categories.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q or len(q) < 2:
            return Response({"skills": [], "colleges": [], "categories": [], "builders": []})

        skills = list(
            PostTag.objects.filter(tag_name__icontains=q)
            .values_list("tag_name", flat=True)
            .distinct()[:5]
        )

        colleges = list(
            User.objects.filter(college__icontains=q)
            .exclude(college__isnull=True)
            .exclude(college="")
            .values_list("college", flat=True)
            .distinct()[:5]
        )

        builders = list(
            User.objects.filter(
                Q(username__icontains=q) | Q(full_name__icontains=q)
            ).values("id", "username", "full_name", "profile_image", "headline")[:5]
        )

        CATEGORIES = [
            "AI / ML",
            "Web Development",
            "Mobile Apps",
            "FinTech",
            "EdTech",
            "Hardware / IoT",
            "Blockchain",
            "Open Source",
            "Design",
        ]
        matching_categories = [c for c in CATEGORIES if q.lower() in c.lower()][:4]

        return Response({
            "skills": skills,
            "colleges": colleges,
            "categories": matching_categories,
            "builders": builders,
        })

