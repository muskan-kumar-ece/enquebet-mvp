"""
Views for ENQUEbet Pulse — Technical Intelligence, Lifecycle, Radar & Preferences
"""
import uuid
from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError

from .models import (
    PlatformUpdate,
    UpdateCategory,
    UpdateType,
    EditorialStatus,
    ImportanceLevel,
    SavedUpdate,
    UserPulsePreference,
    UpdateRevision
)
from .serializers import (
    PlatformUpdateListSerializer,
    PlatformUpdateDetailSerializer,
    PlatformUpdateCreateSerializer,
    SavedUpdateSerializer,
    UserPulsePreferenceSerializer,
    UpdateRevisionSerializer,
)


def _is_user_admin(user):
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_staff or user.is_superuser or getattr(user, 'role', '') in ['admin', 'superadmin', 'moderator'])


class PlatformUpdateViewSet(viewsets.ModelViewSet):
    """
    CRUD and Intelligence ViewSet for ENQUEbet Pulse.
    - Public: Feed, Today's Briefing, Lifecycle Radar, Opportunities, Detail, Categories, Stats
    - Authenticated: Save/Bookmark, Personal Preferences, Add to Workspace
    - Admin-only: Full editorial lifecycle, drafting, revision management
    """
    lookup_field = 'slug'
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PlatformUpdateCreateSerializer
        elif self.action in ['retrieve', 'detail_by_id']:
            return PlatformUpdateDetailSerializer
        return PlatformUpdateListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user and user.is_authenticated:
            # Pre-fetch saved IDs to avoid N+1 queries in serializers
            context['saved_update_ids'] = set(
                SavedUpdate.objects.filter(user=user).values_list('update_id', flat=True)
            )
        return context

    def get_queryset(self):
        user = self.request.user
        is_admin = _is_user_admin(user)

        qs = PlatformUpdate.objects.select_related('author').prefetch_related('saves')

        # Non-admins only see published updates whose publish time has arrived
        if not is_admin:
            qs = qs.filter(
                is_published=True,
                published_at__lte=timezone.now()
            )
        else:
            # Admins can filter by editorial_status (e.g. ?status=DRAFT)
            status_param = self.request.query_params.get('status')
            if status_param and status_param in EditorialStatus.values:
                qs = qs.filter(editorial_status=status_param)

        # Filter by category
        category = self.request.query_params.get('category')
        if category and category != 'all':
            if category in UpdateCategory.values:
                qs = qs.filter(category=category)

        # Filter by update_type
        update_type = self.request.query_params.get('type')
        if update_type and update_type != 'all':
            if update_type in UpdateType.values:
                qs = qs.filter(update_type=update_type)

        # Filter by importance
        importance = self.request.query_params.get('importance')
        if importance and importance in ImportanceLevel.values:
            qs = qs.filter(importance=importance)

        # Filter by tag
        tag = self.request.query_params.get('tag')
        if tag:
            qs = qs.filter(tags__icontains=tag.strip())

        # Filter by Tab
        tab = self.request.query_params.get('tab')
        if tab == 'important':
            qs = qs.filter(Q(is_top_story=True) | Q(importance__in=['CRITICAL', 'HIGH']))
        elif tab == 'saved' and user and user.is_authenticated:
            saved_ids = SavedUpdate.objects.filter(user=user).values_list('update_id', flat=True)
            qs = qs.filter(id__in=saved_ids)
        elif tab == 'following' and user and user.is_authenticated:
            try:
                pref = UserPulsePreference.objects.filter(user=user).first()
                if pref and pref.followed_technologies:
                    tag_queries = Q()
                    for tech in pref.followed_technologies:
                        tag_queries |= Q(tags__icontains=tech.strip()) | Q(title__icontains=tech.strip())
                    if pref.followed_categories:
                        tag_queries |= Q(category__in=pref.followed_categories)
                    qs = qs.filter(tag_queries)
            except Exception:
                pass
        elif tab == 'for_you' and user and user.is_authenticated:
            # Personalization weighting: matching categories or tags prioritized
            try:
                pref = UserPulsePreference.objects.filter(user=user).first()
                if pref and (pref.followed_categories or pref.followed_technologies):
                    match_q = Q()
                    if pref.followed_categories:
                        match_q |= Q(category__in=pref.followed_categories)
                    for tech in pref.followed_technologies:
                        match_q |= Q(tags__icontains=tech.strip())
                    # Prioritize matches, then fill with general updates
                    matched_ids = list(qs.filter(match_q).values_list('id', flat=True)[:30])
                    if matched_ids:
                        # Order by matched first, then rest
                        pass
            except Exception:
                pass

        # Search query (title, summary, why_it_matters, who_should_care, content, tags)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(summary__icontains=search) |
                Q(why_it_matters__icontains=search) |
                Q(who_should_care__icontains=search) |
                Q(content__icontains=search) |
                Q(tags__icontains=search)
            )

        return qs.order_by('-is_pinned', '-is_top_story', '-published_at')

    def get_object(self):
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_val = self.kwargs.get(lookup_url_kwarg)

        # Allow lookup by UUID or slug
        try:
            uuid_obj = uuid.UUID(str(lookup_val))
            obj = queryset.filter(id=uuid_obj).first()
        except (ValueError, TypeError):
            obj = queryset.filter(slug=lookup_val).first()

        if not obj:
            # Fallback if accessed via direct UUID regardless of published status if admin
            if _is_user_admin(self.request.user):
                try:
                    uuid_obj = uuid.UUID(str(lookup_val))
                    obj = PlatformUpdate.objects.filter(id=uuid_obj).first()
                except (ValueError, TypeError):
                    obj = PlatformUpdate.objects.filter(slug=lookup_val).first()

        if not obj:
            raise NotFound("Pulse update not found.")

        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        if not _is_user_admin(self.request.user):
            raise PermissionDenied("Only platform administrators can publish or draft updates.")
        instance = serializer.save(author=self.request.user)
        # Create audit revision
        UpdateRevision.objects.create(
            update=instance,
            editor=self.request.user,
            revision_summary="Initial publication or draft creation",
            changes=serializer.validated_data
        )

    def perform_update(self, serializer):
        if not _is_user_admin(self.request.user):
            raise PermissionDenied("Only platform administrators can edit updates.")
        instance = serializer.save()
        # Record revision history
        UpdateRevision.objects.create(
            update=instance,
            editor=self.request.user,
            revision_summary=self.request.data.get('revision_summary', 'Update edited'),
            changes=serializer.validated_data
        )

    def perform_destroy(self, instance):
        if not _is_user_admin(self.request.user):
            raise PermissionDenied("Only platform administrators can delete updates.")
        instance.delete()

    @action(detail=False, methods=['get'])
    def briefing(self, request):
        """
        Today's Briefing Experience:
        - Top Story of the Day (Lead Hero)
        - 4-6 Key Daily Developments across distinct engineering domains
        - Telemetry: timestamp, total developments today
        """
        user = request.user
        base_qs = PlatformUpdate.objects.filter(
            is_published=True,
            published_at__lte=timezone.now()
        ).select_related('author').prefetch_related('saves')

        # 1. Lead Story: explicit is_top_story=True, or pinned, or highest importance
        top_story = base_qs.filter(is_top_story=True).order_by('-published_at').first()
        if not top_story:
            top_story = base_qs.filter(is_pinned=True).order_by('-published_at').first()
        if not top_story:
            top_story = base_qs.filter(importance='CRITICAL').order_by('-published_at').first()
        if not top_story:
            top_story = base_qs.order_by('-published_at').first()

        # 2. Daily Developments: 4-6 items excluding the top story
        exclude_id = [top_story.id] if top_story else []
        daily_developments_qs = base_qs.exclude(id__in=exclude_id).order_by(
            '-importance',
            '-published_at'
        )[:6]

        context = self.get_serializer_context()
        top_story_data = PlatformUpdateListSerializer(top_story, context=context).data if top_story else None
        developments_data = PlatformUpdateListSerializer(daily_developments_qs, many=True, context=context).data

        # 3. Count published in last 48 hours
        two_days_ago = timezone.now() - timezone.timedelta(days=2)
        total_recent = base_qs.filter(published_at__gte=two_days_ago).count()

        return Response({
            'date': timezone.now().strftime('%A, %B %d, %Y'),
            'total_recent': total_recent,
            'top_story': top_story_data,
            'daily_developments': developments_data,
        })

    @action(detail=False, methods=['get'])
    def lifecycle(self, request):
        """
        Technology Lifecycle Tracker:
        Returns updates covering releases, deprecations, end-of-life notices, and migration guidance.
        """
        status_filter = request.query_params.get('status')  # supported | deprecated | end_of_life | migration_recommended
        search = request.query_params.get('search', '').strip()

        qs = PlatformUpdate.objects.filter(
            is_published=True,
            published_at__lte=timezone.now()
        ).filter(
            Q(category=UpdateCategory.LIFECYCLE) |
            Q(update_type=UpdateType.DEPRECATION) |
            Q(lifecycle_meta__isnull=False)
        ).select_related('author').prefetch_related('saves')

        if status_filter and status_filter != 'all':
            qs = qs.filter(lifecycle_meta__status=status_filter)

        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(summary__icontains=search) |
                Q(lifecycle_meta__affected_version__icontains=search)
            )

        context = self.get_serializer_context()
        page = self.paginate_queryset(qs.order_by('-published_at'))
        if page is not None:
            serializer = PlatformUpdateListSerializer(page, many=True, context=context)
            return self.get_paginated_response(serializer.data)

        serializer = PlatformUpdateListSerializer(qs.order_by('-published_at')[:30], many=True, context=context)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def opportunities(self, request):
        """
        Structured Opportunities Radar:
        Internships, Hackathons, Scholarships, Fellowships, and Research Grants.
        """
        opp_type = request.query_params.get('type')  # internship | hackathon | scholarship | fellowship
        search = request.query_params.get('search', '').strip()

        qs = PlatformUpdate.objects.filter(
            is_published=True,
            published_at__lte=timezone.now()
        ).filter(
            Q(category=UpdateCategory.CAREERS) |
            Q(update_type=UpdateType.OPPORTUNITY)
        ).select_related('author').prefetch_related('saves')

        if opp_type and opp_type != 'all':
            qs = qs.filter(opportunity_meta__opportunity_type=opp_type)

        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(summary__icontains=search) |
                Q(tags__icontains=search)
            )

        context = self.get_serializer_context()
        page = self.paginate_queryset(qs.order_by('-published_at'))
        if page is not None:
            serializer = PlatformUpdateListSerializer(page, many=True, context=context)
            return self.get_paginated_response(serializer.data)

        serializer = PlatformUpdateListSerializer(qs.order_by('-published_at')[:30], many=True, context=context)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def save(self, request, slug=None):
        """
        Toggle bookmarking an update for the authenticated user.
        """
        update = self.get_object()
        saved = SavedUpdate.objects.filter(user=request.user, update=update).first()

        if saved:
            saved.delete()
            is_saved = False
        else:
            SavedUpdate.objects.create(user=request.user, update=update)
            is_saved = True

        saves_count = update.saves.count()
        return Response({
            'is_saved': is_saved,
            'saves_count': saves_count,
            'update_id': str(update.id),
        })

    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[IsAuthenticated])
    def preferences(self, request):
        """
        Retrieve or update builder's followed technologies and Pulse preferences.
        """
        pref, _ = UserPulsePreference.objects.get_or_create(user=request.user)

        if request.method in ['PUT', 'PATCH']:
            serializer = UserPulsePreferenceSerializer(pref, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = UserPulsePreferenceSerializer(pref)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def create_workspace_task(self, request, slug=None):
        """
        Action Bridge: Seeds a 'Build This' idea from this update into an existing ENQUEbet Workspace.
        """
        update = self.get_object()
        build_idea = update.build_this_idea or {}

        if not build_idea.get('title'):
            raise ValidationError("This update does not have a structured build idea attached.")

        workspace_id = request.data.get('workspace_id')
        if not workspace_id:
            raise ValidationError("workspace_id is required to create a workspace task.")

        try:
            from apps.collaboration.models import Workspace, ProjectTask, TeamMembership
            workspace = Workspace.objects.get(id=workspace_id)
        except Exception:
            raise NotFound("Target Workspace not found.")

        # Ensure user is a member of the workspace
        is_member = TeamMembership.objects.filter(
            workspace=workspace,
            user=request.user,
            status='active'
        ).exists()
        if not is_member and workspace.post.author != request.user:
            raise PermissionDenied("You must be an active member of this workspace to add tasks.")

        # Create the ProjectTask
        task = ProjectTask.objects.create(
            workspace=workspace,
            title=f"[Pulse Project] {build_idea.get('title')}",
            description=(
                f"{build_idea.get('description', '')}\n\n"
                f"**Inspired by ENQUEbet Pulse Update:** [{update.title}](/updates?selected={update.slug})\n"
                f"**Recommended Stack:** {build_idea.get('stack', 'General')}\n"
                f"**Estimated Hours:** {build_idea.get('estimated_hours', '4')}"
            ),
            priority='medium',
            status='backlog',
            creator=request.user
        )

        return Response({
            'success': True,
            'task_id': str(task.id),
            'task_title': task.title,
            'workspace_id': str(workspace.id),
            'message': 'Project task seeded into your workspace successfully!'
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Return available category choices with human-readable labels."""
        # 9 Core Domains
        core_categories = [
            {'value': UpdateCategory.AI_ML, 'label': 'AI & Machine Learning'},
            {'value': UpdateCategory.SOFTWARE, 'label': 'Software Development'},
            {'value': UpdateCategory.ELECTRONICS, 'label': 'Electronics & Hardware'},
            {'value': UpdateCategory.CLOUD_DEVOPS, 'label': 'Cloud & Infrastructure'},
            {'value': UpdateCategory.CYBERSECURITY, 'label': 'Cybersecurity'},
            {'value': UpdateCategory.RESEARCH_SCIENCE, 'label': 'Research & Science'},
            {'value': UpdateCategory.STARTUPS, 'label': 'Startups & Industry'},
            {'value': UpdateCategory.CAREERS, 'label': 'Careers & Opportunities'},
            {'value': UpdateCategory.LIFECYCLE, 'label': 'Technology Lifecycle'},
        ]
        return Response(core_categories)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return aggregate summary metrics for platform updates."""
        user = request.user
        is_admin = _is_user_admin(user)
        qs = PlatformUpdate.objects.all() if is_admin else PlatformUpdate.objects.filter(
            is_published=True,
            published_at__lte=timezone.now()
        )

        total_count = qs.count()
        pinned_count = qs.filter(is_pinned=True).count()
        top_story_count = qs.filter(is_top_story=True).count()
        opportunities_count = qs.filter(
            Q(category=UpdateCategory.CAREERS) | Q(update_type=UpdateType.OPPORTUNITY)
        ).count()
        lifecycle_count = qs.filter(
            Q(category=UpdateCategory.LIFECYCLE) | Q(update_type=UpdateType.DEPRECATION)
        ).count()

        category_counts = {}
        counts = qs.values('category').annotate(count=Count('id'))
        for item in counts:
            category_counts[item['category']] = item['count']

        return Response({
            'total_count': total_count,
            'pinned_count': pinned_count,
            'top_story_count': top_story_count,
            'opportunities_count': opportunities_count,
            'lifecycle_count': lifecycle_count,
            'category_counts': category_counts,
        })
