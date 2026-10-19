"""
Views for Platform Updates & Technical Dispatches
"""
import uuid
from django.db.models import Q, Count
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.exceptions import PermissionDenied, NotFound

from .models import PlatformUpdate, UpdateCategory
from .serializers import (
    PlatformUpdateListSerializer,
    PlatformUpdateDetailSerializer,
    PlatformUpdateCreateSerializer,
)


def _is_user_admin(user):
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_staff or user.is_superuser or getattr(user, 'role', '') in ['admin', 'superadmin', 'moderator'])


class PlatformUpdateViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for platform updates.
    - Public: list, retrieve
    - Admin-only: create, update, partial_update, destroy
    """
    lookup_field = 'slug'
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PlatformUpdateCreateSerializer
        elif self.action == 'retrieve':
            return PlatformUpdateDetailSerializer
        return PlatformUpdateListSerializer

    def get_queryset(self):
        user = self.request.user
        is_admin = _is_user_admin(user)

        qs = PlatformUpdate.objects.select_related('author')

        # Non-admins only see published updates
        if not is_admin:
            qs = qs.filter(is_published=True)

        # Filter by category
        category = self.request.query_params.get('category')
        if category and category in UpdateCategory.values:
            qs = qs.filter(category=category)

        # Search query (title, summary, or content)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(summary__icontains=search) |
                Q(content__icontains=search)
            )

        return qs.order_by('-is_pinned', '-published_at')

    def get_object(self):
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_val = self.kwargs.get(lookup_url_kwarg)

        # Allow retrieval by either slug or UUID
        try:
            uuid_obj = uuid.UUID(str(lookup_val))
            obj = queryset.filter(id=uuid_obj).first()
        except (ValueError, TypeError):
            obj = queryset.filter(slug=lookup_val).first()

        if not obj:
            raise NotFound("Update not found.")

        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        if not _is_user_admin(self.request.user):
            raise PermissionDenied("Only platform administrators can publish updates.")
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        if not _is_user_admin(self.request.user):
            raise PermissionDenied("Only platform administrators can edit updates.")
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_user_admin(self.request.user):
            raise PermissionDenied("Only platform administrators can delete updates.")
        instance.delete()

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Return available category choices."""
        choices = [
            {'value': choice[0], 'label': choice[1]}
            for choice in UpdateCategory.choices
        ]
        return Response(choices)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return aggregate summary metrics for platform updates."""
        user = request.user
        is_admin = _is_user_admin(user)
        qs = PlatformUpdate.objects.all() if is_admin else PlatformUpdate.objects.filter(is_published=True)

        total_count = qs.count()
        pinned_count = qs.filter(is_pinned=True).count()
        
        category_counts = {}
        counts = qs.values('category').annotate(count=Count('id'))
        for item in counts:
            category_counts[item['category']] = item['count']

        return Response({
            'total_count': total_count,
            'pinned_count': pinned_count,
            'category_counts': category_counts,
        })
