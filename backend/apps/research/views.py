import uuid
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db.models import Q, Avg
from django.shortcuts import get_object_or_404

from .models import ResearchPaper, ReproducibilityReview, ResearchField, ResearchStatus
from .serializers import (
    ResearchPaperListSerializer,
    ResearchPaperDetailSerializer,
    ResearchPaperCreateSerializer,
    ReproducibilityReviewSerializer,
    ReproducibilityReviewCreateSerializer,
)


def _is_user_admin(user):
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_staff or user.is_superuser or getattr(user, 'role', '') in ['admin', 'superadmin', 'moderator'])


class ResearchPaperViewSet(viewsets.ModelViewSet):
    lookup_field = 'slug'
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        is_admin = _is_user_admin(user)
        tab = self.request.query_params.get('tab', '')
        status_filter = self.request.query_params.get('status', '')

        qs = ResearchPaper.objects.select_related('primary_author', 'associated_workspace', 'reviewed_by').prefetch_related(
            'reproducibility_reviews', 'reproducibility_reviews__reviewer', 'authors', 'versions'
        )

        # Scoping by Tab / Moderation Queue
        if tab == 'my_submissions':
            if not user.is_authenticated:
                return qs.none()
            qs = qs.filter(primary_author=user)
        elif tab == 'moderation' or status_filter == ResearchStatus.PENDING_APPROVAL:
            if not is_admin:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Only platform administrators can access the research moderation queue.')
            qs = qs.filter(status=ResearchStatus.PENDING_APPROVAL)
        elif is_admin and status_filter:
            if status_filter in ResearchStatus.values:
                qs = qs.filter(status=status_filter)
        elif is_admin:
            # Admin browsing: if status_filter is omitted, show approved or all depending on params
            if status_filter in ResearchStatus.values:
                qs = qs.filter(status=status_filter)
        else:
            # Public catalog for non-admin: approved papers OR the user's own submissions
            approved_statuses = [
                ResearchStatus.PREPRINT,
                ResearchStatus.UNDER_REVIEW,
                ResearchStatus.PEER_REVIEWED,
                ResearchStatus.REPRODUCED,
            ]
            if user.is_authenticated:
                qs = qs.filter(Q(status__in=approved_statuses) | Q(primary_author=user))
            else:
                qs = qs.filter(status__in=approved_statuses)

            if status_filter and status_filter in approved_statuses:
                qs = qs.filter(status=status_filter)

        # Filters
        field_filter = self.request.query_params.get('field')
        if field_filter and field_filter in ResearchField.values:
            qs = qs.filter(field=field_filter)

        # User filter (for Profile page Research tab)
        user_param = self.request.query_params.get('user') or self.request.query_params.get('author_id')
        if user_param:
            try:
                user_uuid = uuid.UUID(str(user_param))
                qs = qs.filter(primary_author_id=user_uuid)
            except (ValueError, AttributeError):
                # If not a valid UUID, allow filtering by username
                qs = qs.filter(primary_author__username=user_param)

        has_code = self.request.query_params.get('has_code')
        if has_code == 'true':
            qs = qs.exclude(code_repo_url__isnull=True).exclude(code_repo_url='')

        has_bom = self.request.query_params.get('has_bom')
        if has_bom == 'true':
            qs = qs.exclude(hardware_bom=[])

        has_workspace = self.request.query_params.get('has_workspace')
        if has_workspace == 'true':
            qs = qs.filter(associated_workspace__isnull=False)

        # Full text search
        search_query = self.request.query_params.get('search')
        if search_query:
            qs = qs.filter(
                Q(title__icontains=search_query) |
                Q(abstract__icontains=search_query) |
                Q(paper_code__icontains=search_query) |
                Q(doi__icontains=search_query) |
                Q(primary_author__username__icontains=search_query) |
                Q(primary_author__full_name__icontains=search_query)
            )

        # Ordering
        ordering = self.request.query_params.get('ordering', '-published_at')
        allowed_orderings = [
            '-published_at', 'published_at',
            '-citations_count', 'citations_count',
            '-reproducibility_score', 'reproducibility_score',
            '-views_count'
        ]
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('-published_at')

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ResearchPaperListSerializer
        elif self.action in ['retrieve', 'update', 'partial_update']:
            return ResearchPaperDetailSerializer
        elif self.action == 'create':
            return ResearchPaperCreateSerializer
        return ResearchPaperDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        # Look up by slug, paper_code, or UUID id
        slug_or_id = kwargs.get('slug')
        try:
            import uuid
            uuid_obj = uuid.UUID(str(slug_or_id))
            paper = get_object_or_404(ResearchPaper, id=uuid_obj)
        except (ValueError, AttributeError):
            paper = ResearchPaper.objects.filter(
                Q(slug=slug_or_id) | Q(paper_code__iexact=slug_or_id) | Q(slug__iexact=slug_or_id)
            ).first()
            if not paper:
                from rest_framework.exceptions import NotFound
                raise NotFound(f'No research paper found matching "{slug_or_id}".')

        # Increment views atomically
        ResearchPaper.objects.filter(id=paper.id).update(views_count=paper.views_count + 1)
        paper.refresh_from_db()

        serializer = ResearchPaperDetailSerializer(paper, context={'request': request})
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = ResearchPaperCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        paper = serializer.save()

        # Trigger builder activity / reputation if available
        try:
            from apps.users.activity_service import log_builder_activity
            log_builder_activity(
                user=request.user,
                action_type='RESEARCH_PUBLISHED',
                metadata={'paper_code': paper.paper_code, 'title': paper.title}
            )
        except Exception:
            pass

        detail_serializer = ResearchPaperDetailSerializer(paper, context={'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def review(self, request, slug=None):
        """Submit a structured reproducibility audit / peer review"""
        paper = self.get_object()

        if paper.primary_author == request.user:
            return Response(
                {'error': 'Authors cannot submit peer reviews or reproducibility audits on their own paper.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if ReproducibilityReview.objects.filter(paper=paper, reviewer=request.user).exists():
            return Response(
                {'error': 'You have already submitted an audit for this research paper.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReproducibilityReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review = ReproducibilityReview.objects.create(
            paper=paper,
            reviewer=request.user,
            **serializer.validated_data
        )

        # Recalculate paper reproducibility score
        avg_score = paper.reproducibility_reviews.aggregate(
            avg_repro=Avg('reproducibility_score')
        )['avg_repro'] or 0.0

        paper.reproducibility_score = round(avg_score, 1)

        # Auto-promote status if successfully reproduced
        if review.verdict == ReproducibilityReview.Verdict.VERIFIED_REPRODUCED:
            paper.status = ResearchStatus.REPRODUCED
        elif paper.status == ResearchStatus.PREPRINT:
            paper.status = ResearchStatus.PEER_REVIEWED

        paper.save(update_fields=['reproducibility_score', 'status'])

        return Response(
            ReproducibilityReviewSerializer(review).data,
            status=status.HTTP_201_CREATED
        )

    def get_object(self):
        slug_val = self.kwargs.get(self.lookup_field) or self.kwargs.get('pk') or self.kwargs.get('slug')
        import uuid
        paper = None
        try:
            uuid_val = uuid.UUID(str(slug_val))
            paper = ResearchPaper.objects.filter(id=uuid_val).first()
        except (ValueError, AttributeError):
            pass

        if not paper:
            paper = ResearchPaper.objects.filter(slug=slug_val).first()
        if not paper:
            paper = ResearchPaper.objects.filter(paper_code=slug_val).first()

        if not paper:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"Research paper '{slug_val}' not found.")

        # Permission gate for unapproved items
        if paper.status in [ResearchStatus.PENDING_APPROVAL, ResearchStatus.REJECTED]:
            user = self.request.user
            if not user.is_authenticated or (paper.primary_author != user and not _is_user_admin(user)):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('This research paper is currently pending admin review.')

        self.check_object_permissions(self.request, paper)
        return paper

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, slug=None):
        """Admin action: approve research paper for open publication"""
        if not _is_user_admin(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only platform administrators can approve research papers.')

        from django.utils import timezone
        paper = self.get_object()
        paper.status = ResearchStatus.PREPRINT
        paper.reviewed_by = request.user
        paper.reviewed_at = timezone.now()
        paper.rejection_reason = ''
        paper.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason'])

        # Notify primary author
        try:
            from apps.notifications.models import Notification
            Notification.objects.create(
                user=paper.primary_author,
                sender=request.user,
                type='system',
                reference_id=paper.id,
                message=f"Your research paper '{paper.title}' [{paper.paper_code}] has been approved and is now live in the Living Research Hub!"
            )
        except Exception:
            pass

        return Response(ResearchPaperDetailSerializer(paper, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, slug=None):
        """Admin action: reject research paper with constructive feedback"""
        if not _is_user_admin(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only platform administrators can reject research papers.')

        from django.utils import timezone
        paper = self.get_object()
        reason = (request.data.get('reason') or request.data.get('rejection_reason') or '').strip()

        paper.status = ResearchStatus.REJECTED
        paper.rejection_reason = reason or 'Submission did not meet academic rigor or formatting guidelines.'
        paper.reviewed_by = request.user
        paper.reviewed_at = timezone.now()
        paper.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at'])

        # Notify primary author
        try:
            from apps.notifications.models import Notification
            feedback = f" Reason: {reason}" if reason else ""
            Notification.objects.create(
                user=paper.primary_author,
                sender=request.user,
                type='system',
                reference_id=paper.id,
                message=f"Your research paper submission '{paper.title}' was reviewed and not approved.{feedback}"
            )
        except Exception:
            pass

        return Response(ResearchPaperDetailSerializer(paper, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def request_revisions(self, request, slug=None):
        """Admin action: request author revisions with constructive feedback"""
        if not _is_user_admin(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only platform administrators can request research revisions.')

        from django.utils import timezone
        paper = self.get_object()
        feedback = (request.data.get('feedback') or request.data.get('author_feedback') or '').strip()
        editorial_notes = (request.data.get('editorial_notes') or request.data.get('internal_editorial_notes') or '').strip()
        checklist = request.data.get('checklist') or request.data.get('screening_checklist')

        if not feedback:
            return Response({'error': 'Constructive author feedback is required when requesting revisions.'}, status=status.HTTP_400_BAD_REQUEST)

        paper.status = ResearchStatus.REVISION_REQUIRED
        paper.author_feedback = feedback
        if editorial_notes:
            paper.internal_editorial_notes = editorial_notes
        if checklist and isinstance(checklist, dict):
            paper.screening_checklist = checklist
        paper.reviewed_by = request.user
        paper.reviewed_at = timezone.now()
        paper.save(update_fields=['status', 'author_feedback', 'internal_editorial_notes', 'screening_checklist', 'reviewed_by', 'reviewed_at'])

        try:
            from apps.notifications.models import Notification
            Notification.objects.create(
                user=paper.primary_author,
                sender=request.user,
                type='system',
                reference_id=paper.id,
                message=f"Revisions requested on research paper '{paper.title}' [{paper.paper_code}]. Review feedback: {feedback[:140]}"
            )
        except Exception:
            pass

        return Response(ResearchPaperDetailSerializer(paper, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit_revision(self, request, slug=None):
        """Author action: submit a revised manuscript version with changelog"""
        paper = self.get_object()
        if paper.primary_author != request.user and not _is_user_admin(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only the primary author can submit revisions to this research paper.')

        pdf_url = (request.data.get('pdf_url') or '').strip()
        changelog = (request.data.get('changelog') or '').strip()

        if not pdf_url:
            return Response({'error': 'Revised PDF URL is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Version increment
        from .models import ResearchVersion
        latest_ver = paper.versions.order_by('-version_number').first()
        next_ver = (latest_ver.version_number + 1) if latest_ver else 2

        ResearchVersion.objects.create(
            paper=paper,
            version_number=next_ver,
            pdf_url=pdf_url,
            changelog=changelog or f'Revision {next_ver} submitted.'
        )

        paper.pdf_url = pdf_url
        if request.data.get('abstract'):
            paper.abstract = request.data.get('abstract').strip()
        if request.data.get('methodology_summary'):
            paper.methodology_summary = request.data.get('methodology_summary').strip()
        paper.status = ResearchStatus.SUBMITTED
        paper.save(update_fields=['pdf_url', 'abstract', 'methodology_summary', 'status'])

        return Response(ResearchPaperDetailSerializer(paper, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def publish(self, request, slug=None):
        """Admin action: formally transition paper to PREPRINT or PEER_REVIEWED"""
        if not _is_user_admin(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only platform administrators can publish research papers.')

        from django.utils import timezone
        paper = self.get_object()
        target_status = request.data.get('status') or ResearchStatus.PREPRINT
        if target_status not in [ResearchStatus.PREPRINT, ResearchStatus.PEER_REVIEWED]:
            target_status = ResearchStatus.PREPRINT

        paper.status = target_status
        paper.reviewed_by = request.user
        paper.reviewed_at = timezone.now()
        paper.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        try:
            from apps.notifications.models import Notification
            Notification.objects.create(
                user=paper.primary_author,
                sender=request.user,
                type='system',
                reference_id=paper.id,
                message=f"Congratulations! Your research paper '{paper.title}' has been officially published as an {paper.get_status_display()}."
            )
        except Exception:
            pass

        return Response(ResearchPaperDetailSerializer(paper, context={'request': request}).data)

    @action(detail=True, methods=['get'], url_path='citation')
    def citation(self, request, slug=None):
        """1-click citation export in multiple academic formats"""
        paper = self.get_object()
        fmt = (
            request.query_params.get('style') or
            request.query_params.get('cite_format') or
            request.query_params.get('format') or
            'bibtex'
        ).lower()

        author_name = paper.primary_author.get_full_name() or paper.primary_author.username
        year = paper.published_at.year

        if fmt == 'apa':
            citation = f"{author_name}. ({year}). {paper.title}. ENQUEbet Living Research Repository, {paper.paper_code}."
        elif fmt == 'ieee':
            citation = f"{author_name}, \"{paper.title},\" ENQUEbet Living Research Repository, paper {paper.paper_code}, {year}."
        elif fmt == 'mla':
            citation = f"{author_name}. \"{paper.title}.\" ENQUEbet Living Research Repository, {year}, {paper.paper_code}."
        else:
            citation = paper.generate_bibtex()

        return Response({
            'format': fmt,
            'citation': citation,
            'paper_code': paper.paper_code
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Ecosystem-wide research telemetry"""
        is_admin = _is_user_admin(request.user)
        total_papers = ResearchPaper.objects.exclude(status=ResearchStatus.PENDING_APPROVAL).count()
        total_preprints = ResearchPaper.objects.filter(status=ResearchStatus.PREPRINT).count()
        total_reproduced = ResearchPaper.objects.filter(status=ResearchStatus.REPRODUCED).count()
        total_audits = ReproducibilityReview.objects.count()
        hardware_bom_papers = ResearchPaper.objects.exclude(hardware_bom=[]).count()
        pending_count = ResearchPaper.objects.filter(status=ResearchStatus.PENDING_APPROVAL).count() if is_admin else 0
        my_submissions_count = ResearchPaper.objects.filter(primary_author=request.user).count() if request.user.is_authenticated else 0

        return Response({
            'total_papers': total_papers,
            'total_preprints': total_preprints,
            'total_reproduced': total_reproduced,
            'total_audits': total_audits,
            'hardware_bom_papers': hardware_bom_papers,
            'pending_count': pending_count,
            'my_submissions_count': my_submissions_count,
        })
