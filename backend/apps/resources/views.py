"""
Views for Engineering Resources
"""
import uuid
from django.utils import timezone
from django.db.models import Q, F
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.exceptions import PermissionDenied, NotFound

from .models import Resource, ResourceCategory, ResourceFileType, ApprovalStatus
from .serializers import (
    ResourceListSerializer,
    ResourceDetailSerializer,
    ResourceCreateSerializer,
)
from apps.notifications.models import Notification


def _is_user_admin(user):
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_staff or user.is_superuser or getattr(user, 'role', '') in ['admin', 'superadmin', 'moderator'])


class ResourceViewSet(viewsets.ModelViewSet):
    lookup_field = 'slug'
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        is_admin = _is_user_admin(user)
        tab = self.request.query_params.get('tab', '')
        status_param = self.request.query_params.get('status', '')

        qs = Resource.objects.select_related('uploader', 'reviewed_by')

        # Filter by Tab / Moderation Scope
        if tab == 'my_submissions':
            if not user.is_authenticated:
                return qs.none()
            qs = qs.filter(uploader=user)
        elif tab == 'moderation' or status_param == ApprovalStatus.PENDING_APPROVAL:
            if not is_admin:
                raise PermissionDenied('Only platform administrators can access the resource moderation queue.')
            qs = qs.filter(status=ApprovalStatus.PENDING_APPROVAL)
        elif is_admin and status_param:
            if status_param in ApprovalStatus.values:
                qs = qs.filter(status=status_param)
        else:
            # Default public catalog: only approved resources
            qs = qs.filter(status=ApprovalStatus.APPROVED)

        # Category Filter
        category = self.request.query_params.get('category')
        if category and category in ResourceCategory.values:
            qs = qs.filter(category=category)

        # File Type Filter
        file_type = self.request.query_params.get('file_type')
        if file_type and file_type in ResourceFileType.values:
            qs = qs.filter(file_type=file_type)

        # Full Text Search
        search = self.request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(original_filename__icontains=search) |
                Q(uploader__username__icontains=search) |
                Q(uploader__full_name__icontains=search)
            )

        # Ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        allowed_orderings = [
            '-created_at', 'created_at',
            '-downloads_count', 'downloads_count',
            '-views_count', 'views_count',
            'title', '-title'
        ]
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('-created_at')

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ResourceListSerializer
        elif self.action == 'create':
            return ResourceCreateSerializer
        return ResourceDetailSerializer

    def get_object(self):
        slug_or_id = self.kwargs.get(self.lookup_field) or self.kwargs.get('pk')
        try:
            val_uuid = uuid.UUID(str(slug_or_id))
            resource = Resource.objects.filter(id=val_uuid).first()
        except (ValueError, AttributeError):
            resource = Resource.objects.filter(slug=slug_or_id).first()

        if not resource:
            raise NotFound(f"Resource '{slug_or_id}' not found.")

        # Permission gate for unapproved items
        if resource.status != ApprovalStatus.APPROVED:
            user = self.request.user
            if not user.is_authenticated or (resource.uploader != user and not _is_user_admin(user)):
                raise PermissionDenied('This resource is currently pending admin review.')

        self.check_object_permissions(self.request, resource)
        return resource

    def retrieve(self, request, *args, **kwargs):
        resource = self.get_object()
        # Increment views atomically
        Resource.objects.filter(pk=resource.pk).update(views_count=F('views_count') + 1)
        resource.refresh_from_db()
        serializer = self.get_serializer(resource)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resource = serializer.save()
        detail_serializer = ResourceDetailSerializer(resource, context={'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, slug=None):
        """Admin action: approve resource for public listing"""
        if not _is_user_admin(request.user):
            raise PermissionDenied('Only platform administrators can approve resources.')

        resource = self.get_object()
        resource.status = ApprovalStatus.APPROVED
        resource.reviewed_by = request.user
        resource.reviewed_at = timezone.now()
        resource.rejection_reason = ''
        resource.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason'])

        # Notify uploader
        try:
            Notification.objects.create(
                user=resource.uploader,
                sender=request.user,
                type='system',
                reference_id=resource.id,
                message=f"Your resource '{resource.title}' has been approved and is now live in the library!"
            )
        except Exception:
            pass

        return Response(ResourceDetailSerializer(resource, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, slug=None):
        """Admin action: reject resource with reason"""
        if not _is_user_admin(request.user):
            raise PermissionDenied('Only platform administrators can reject resources.')

        resource = self.get_object()
        reason = (request.data.get('reason') or request.data.get('rejection_reason') or '').strip()

        resource.status = ApprovalStatus.REJECTED
        resource.rejection_reason = reason or 'Submission did not meet technical quality guidelines.'
        resource.reviewed_by = request.user
        resource.reviewed_at = timezone.now()
        resource.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at'])

        # Notify uploader
        try:
            feedback_msg = f" Reason: {reason}" if reason else ""
            Notification.objects.create(
                user=resource.uploader,
                sender=request.user,
                type='system',
                reference_id=resource.id,
                message=f"Your resource submission '{resource.title}' was reviewed and not approved.{feedback_msg}"
            )
        except Exception:
            pass

        return Response(ResourceDetailSerializer(resource, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def download(self, request, slug=None):
        """Track download count and return download URL"""
        resource = self.get_object()
        Resource.objects.filter(pk=resource.pk).update(downloads_count=F('downloads_count') + 1)
        resource.refresh_from_db()

        target_url = resource.file_url or resource.external_link
        return Response({
            'download_url': target_url,
            'downloads_count': resource.downloads_count
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Aggregate resource telemetry"""
        is_admin = _is_user_admin(request.user)

        total_resources = Resource.objects.filter(status=ApprovalStatus.APPROVED).count()
        total_downloads = sum(Resource.objects.filter(status=ApprovalStatus.APPROVED).values_list('downloads_count', flat=True)) or 0
        pending_count = Resource.objects.filter(status=ApprovalStatus.PENDING_APPROVAL).count() if is_admin else 0
        my_submissions_count = Resource.objects.filter(uploader=request.user).count() if request.user.is_authenticated else 0

        return Response({
            'total_resources': total_resources,
            'total_downloads': total_downloads,
            'pending_count': pending_count,
            'my_submissions_count': my_submissions_count,
        })
