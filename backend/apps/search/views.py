"""Search API.

This module exists because the project routes include /api/v1/search/.
The frontend currently uses /posts/search/ and /users/search/, but the spec
also describes a unified /search endpoint.
"""

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.posts.models import Post
from apps.posts.serializers import PostSerializer
from apps.users.serializers import UserSerializer

User = get_user_model()


class SearchView(APIView):
    """Unified search across users and posts.

    Query params:
      - q: search term
      - type: users|posts|all (default: all)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        search_type = (request.query_params.get("type") or "all").strip().lower()

        if not query:
            return Response({"users": [], "posts": []})

        users = []
        posts = []

        if search_type in {"all", "users"}:
            user_qs = (
                User.objects.filter(
                    Q(username__icontains=query)
                    | Q(full_name__icontains=query)
                    | Q(bio__icontains=query)
                )
                .distinct()
                .order_by("-created_at")
            )
            users = UserSerializer(user_qs[:20], many=True, context={"request": request}).data

        if search_type in {"all", "posts"}:
            post_qs = (
                Post.objects.filter(
                    Q(title__icontains=query)
                    | Q(description__icontains=query)
                    | Q(tags__tag_name__icontains=query)
                )
                .distinct()
                .select_related("user")
                .prefetch_related("attachments", "requirements", "tags", "likes", "comments")
                .order_by("-created_at")
            )
            posts = PostSerializer(post_qs[:20], many=True, context={"request": request}).data

        return Response({"users": users, "posts": posts})
