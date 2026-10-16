"""
Reputation Engine Service for ENQUEbet.
Handles verified contribution events, anti-abuse validation, idempotent scoring,
and score synchronization.
"""
from typing import Optional, Dict, Any
from django.db import transaction, models
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import (
    Workspace,
    ProjectTask,
    TaskDeliverable,
    TaskReview,
    ProofOfWork,
    PeerReview,
    ReputationEvent,
    TeamMembership,
)
from .reputation_config import (
    REPUTATION_WEIGHTS,
    calculate_peer_review_points,
    get_builder_level,
)

User = get_user_model()


class ReputationService:
    """Core domain service orchestrating builder reputation calculations and events."""

    @classmethod
    @transaction.atomic
    def award_deliverable_approved(cls, deliverable: TaskDeliverable, reviewer=None) -> Optional[ReputationEvent]:
        """
        Award reputation to the submitter of a formally approved deliverable.
        Idempotent: Each deliverable can earn DELIVERABLE_APPROVED points only once.
        """
        submitter = deliverable.submitted_by
        task = deliverable.task
        workspace = task.workspace
        idempotency_key = f"deliv_approved:{deliverable.id}"

        # Check existing event
        event = ReputationEvent.objects.filter(idempotency_key=idempotency_key).first()
        if event:
            if event.is_revoked:
                event.is_revoked = False
                event.save(update_fields=['is_revoked'])
                cls.sync_user_reputation(submitter)
            return event

        points = REPUTATION_WEIGHTS['DELIVERABLE_APPROVED']
        event = ReputationEvent.objects.create(
            user=submitter,
            event_type='deliverable_approved',
            points=points,
            description=f"Approved deliverable v{deliverable.version} for task '{task.title}'",
            idempotency_key=idempotency_key,
            workspace=workspace,
            task=task,
            deliverable=deliverable,
            metadata={
                'deliverable_id': str(deliverable.id),
                'deliverable_title': deliverable.title,
                'task_id': str(task.id),
                'task_title': task.title,
                'workspace_id': str(workspace.id),
                'reviewer_id': str(reviewer.id) if reviewer else None,
            }
        )

        cls.sync_user_reputation(submitter)
        return event

    @classmethod
    @transaction.atomic
    def award_task_completed(cls, task: ProjectTask, deliverable: Optional[TaskDeliverable] = None) -> Optional[ReputationEvent]:
        """
        Award reputation to the task assignee upon completion with an approved review.
        Unassigned tasks or tasks marked completed without approved review do not receive credit.
        """
        if not task.assignee:
            return None

        workspace = task.workspace
        idempotency_key = f"task_completed:{task.id}"

        event = ReputationEvent.objects.filter(idempotency_key=idempotency_key).first()
        if event:
            if event.is_revoked:
                event.is_revoked = False
                event.save(update_fields=['is_revoked'])
                cls.sync_user_reputation(task.assignee)
            return event

        points = REPUTATION_WEIGHTS['TASK_COMPLETED']
        event = ReputationEvent.objects.create(
            user=task.assignee,
            event_type='task_completed',
            points=points,
            description=f"Completed task '{task.title}' with approved deliverable",
            idempotency_key=idempotency_key,
            workspace=workspace,
            task=task,
            deliverable=deliverable,
            metadata={
                'task_id': str(task.id),
                'task_title': task.title,
                'workspace_id': str(workspace.id),
                'deliverable_id': str(deliverable.id) if deliverable else None,
            }
        )

        cls.sync_user_reputation(task.assignee)
        return event

    @classmethod
    @transaction.atomic
    def award_project_completed(cls, proof: ProofOfWork, workspace: Workspace, actor=None) -> list:
        """
        Award project completion reputation upon minting verified Proof of Work.
        - Project Owner/Lead earns PROJECT_COMPLETED_LEAD points (50).
        - Active contributors who made verified contributions earn PROJECT_COMPLETED_CONTRIBUTOR points (35).
        - Anti-Free-Rider: Members who contributed 0 approved work receive 0 points.
        """
        events = []
        owner = workspace.post.user

        # 1. Lead / Owner award
        owner_key = f"proj_completed_lead:{proof.id}:{owner.id}"
        owner_event, created = ReputationEvent.objects.get_or_create(
            idempotency_key=owner_key,
            defaults={
                'user': owner,
                'event_type': 'project_completed',
                'points': REPUTATION_WEIGHTS['PROJECT_COMPLETED_LEAD'],
                'description': f"Delivered project '{workspace.post.title}' (Lead)",
                'workspace': workspace,
                'proof': proof,
                'metadata': {
                    'proof_code': proof.verification_code,
                    'role': 'lead',
                    'workspace_id': str(workspace.id),
                }
            }
        )
        if not created and owner_event.is_revoked:
            owner_event.is_revoked = False
            owner_event.save(update_fields=['is_revoked'])
        cls.sync_user_reputation(owner)
        events.append(owner_event)

        # 2. Contributing Members
        memberships = workspace.memberships.filter(status='active').exclude(user=owner).select_related('user')
        for member in memberships:
            # Verify actual contributions in this workspace
            has_approved_deliverable = TaskDeliverable.objects.filter(
                task__workspace=workspace,
                submitted_by=member.user,
                reviews__verdict='approved'
            ).exists()

            has_completed_task = ProjectTask.objects.filter(
                workspace=workspace,
                assignee=member.user,
                status='completed'
            ).exists()

            if not (has_approved_deliverable or has_completed_task):
                # Anti-free-rider: no points for zero-contribution members
                continue

            contrib_key = f"proj_completed_contrib:{proof.id}:{member.user.id}"
            member_event, m_created = ReputationEvent.objects.get_or_create(
                idempotency_key=contrib_key,
                defaults={
                    'user': member.user,
                    'event_type': 'project_completed',
                    'points': REPUTATION_WEIGHTS['PROJECT_COMPLETED_CONTRIBUTOR'],
                    'description': f"Delivered project '{workspace.post.title}' (Contributor)",
                    'workspace': workspace,
                    'proof': proof,
                    'metadata': {
                        'proof_code': proof.verification_code,
                        'role': 'contributor',
                        'workspace_id': str(workspace.id),
                    }
                }
            )
            if not m_created and member_event.is_revoked:
                member_event.is_revoked = False
                member_event.save(update_fields=['is_revoked'])
            cls.sync_user_reputation(member.user)
            events.append(member_event)

        return events

    @classmethod
    @transaction.atomic
    def record_peer_review(cls, peer_review: PeerReview) -> ReputationEvent:
        """
        Record reputation points from a peer evaluation.
        - Calculates points from 1-5 average rating across 3 dimensions.
        - Anti-farming cap: Total peer review points for a user on one project cannot exceed PEER_REVIEW_MAX_PROJECT_POINTS (30).
        - Idempotent: Editing an existing peer review updates the event points instead of duplicating.
        """
        reviewee = peer_review.reviewee
        proof = peer_review.proof
        workspace = proof.workspace

        # Calculate average rating
        avg_rating = (
            peer_review.execution_score +
            peer_review.collaboration_score +
            peer_review.reliability_score
        ) / 3.0

        raw_points = calculate_peer_review_points(avg_rating)

        # Anti-farming cap calculation across this specific proof
        existing_points = ReputationEvent.objects.filter(
            user=reviewee,
            proof=proof,
            event_type='peer_review_received',
            is_revoked=False
        ).exclude(peer_review=peer_review).aggregate(total=models.Sum('points'))['total'] or 0

        max_allowed = REPUTATION_WEIGHTS['PEER_REVIEW_MAX_PROJECT_POINTS']
        if raw_points > 0 and (existing_points + raw_points) > max_allowed:
            points = max(0, max_allowed - existing_points)
        else:
            points = raw_points

        idempotency_key = f"peer_review:{peer_review.id}"

        event, created = ReputationEvent.objects.update_or_create(
            idempotency_key=idempotency_key,
            defaults={
                'user': reviewee,
                'event_type': 'peer_review_received',
                'points': points,
                'description': f"Peer review received on '{workspace.post.title}'",
                'workspace': workspace,
                'proof': proof,
                'peer_review': peer_review,
                'is_revoked': False,
                'metadata': {
                    'avg_rating': round(avg_rating, 2),
                    'execution': peer_review.execution_score,
                    'collaboration': peer_review.collaboration_score,
                    'reliability': peer_review.reliability_score,
                    'raw_points': raw_points,
                    'capped_points': points,
                }
            }
        )

        cls.sync_user_reputation(reviewee)
        return event

    @classmethod
    @transaction.atomic
    def revoke_peer_review(cls, peer_review: PeerReview):
        """Revoke reputation points if a peer review is deleted."""
        idempotency_key = f"peer_review:{peer_review.id}"
        event = ReputationEvent.objects.filter(idempotency_key=idempotency_key).first()
        if event and not event.is_revoked:
            event.is_revoked = True
            event.save(update_fields=['is_revoked'])
            cls.sync_user_reputation(event.user)

    @classmethod
    @transaction.atomic
    def revoke_project_completion(cls, workspace: Workspace):
        """Revoke completion points when a project is reopened."""
        events = ReputationEvent.objects.filter(
            workspace=workspace,
            event_type='project_completed',
            is_revoked=False
        ).select_related('user')

        affected_users = set()
        for event in events:
            event.is_revoked = True
            event.save(update_fields=['is_revoked'])
            affected_users.add(event.user)

        for user in affected_users:
            cls.sync_user_reputation(user)

    @classmethod
    @transaction.atomic
    def sync_user_reputation(cls, user_or_id) -> int:
        """
        Synchronize User.reputation_score with the sum of all active, unrevoked events.
        Floor is 0. Uses atomic select_for_update for concurrency safety.
        """
        user_id = user_or_id.id if hasattr(user_or_id, 'id') else user_or_id
        user = User.objects.select_for_update().filter(id=user_id).first()
        if not user:
            return 0

        total = ReputationEvent.objects.filter(
            user=user,
            is_revoked=False
        ).aggregate(total=models.Sum('points'))['total'] or 0

        score = max(0, total)
        if user.reputation_score != score:
            user.reputation_score = score
            user.save(update_fields=['reputation_score'])

        return score

    @classmethod
    def get_user_reputation_summary(cls, user_or_id, viewer=None) -> Dict[str, Any]:
        """
        Generate an explainable, privacy-preserving reputation summary for a user.
        Never reveals private project names or internal reviewer identities to unauthorized viewers.
        """
        user_id = user_or_id.id if hasattr(user_or_id, 'id') else user_or_id
        user = User.objects.filter(id=user_id).first()
        if not user:
            return {}

        score = user.reputation_score
        level = get_builder_level(score)

        # Verified counts
        approved_deliverables_count = TaskDeliverable.objects.filter(
            submitted_by=user,
            reviews__verdict='approved'
        ).values('task').distinct().count()

        completed_tasks_count = ProjectTask.objects.filter(
            assignee=user,
            status='completed',
            deliverables__reviews__verdict='approved'
        ).distinct().count()

        completed_projects_count = ReputationEvent.objects.filter(
            user=user,
            event_type='project_completed',
            is_revoked=False
        ).count()

        peer_reviews = PeerReview.objects.filter(reviewee=user)
        peer_reviews_count = peer_reviews.count()
        if peer_reviews_count > 0:
            avg_exec = peer_reviews.aggregate(m=models.Avg('execution_score'))['m'] or 5.0
            avg_collab = peer_reviews.aggregate(m=models.Avg('collaboration_score'))['m'] or 5.0
            avg_rel = peer_reviews.aggregate(m=models.Avg('reliability_score'))['m'] or 5.0
            avg_rating = round((avg_exec + avg_collab + avg_rel) / 3.0, 1)
        else:
            avg_rating = 0.0

        # Score breakdown
        events = ReputationEvent.objects.filter(user=user, is_revoked=False)
        deliverables_pts = events.filter(event_type='deliverable_approved').aggregate(s=models.Sum('points'))['s'] or 0
        tasks_pts = events.filter(event_type='task_completed').aggregate(s=models.Sum('points'))['s'] or 0
        projects_pts = events.filter(event_type='project_completed').aggregate(s=models.Sum('points'))['s'] or 0
        reviews_pts = events.filter(event_type='peer_review_received').aggregate(s=models.Sum('points'))['s'] or 0

        # Recent events with privacy sanitization
        recent_events_data = []
        for ev in events[:10]:
            desc = ev.description
            # Privacy guard: if workspace post is private and viewer is not authorized, sanitize
            if ev.workspace and ev.workspace.post.user != viewer:
                is_member = (
                    viewer and viewer.is_authenticated and
                    TeamMembership.objects.filter(workspace=ev.workspace, user=viewer, status='active').exists()
                )
                if not is_member and getattr(ev.workspace.post.user, 'is_private', False):
                    desc = f"Verified contribution to project"

            recent_events_data.append({
                'id': str(ev.id),
                'event_type': ev.event_type,
                'points': ev.points,
                'description': desc,
                'created_at': ev.created_at.isoformat(),
            })

        return {
            'score': score,
            'level': level['title'],
            'badge_color': level['badge_color'],
            'verified_stats': {
                'approved_deliverables_count': approved_deliverables_count,
                'completed_tasks_count': completed_tasks_count,
                'completed_projects_count': completed_projects_count,
                'peer_reviews_count': peer_reviews_count,
                'average_peer_rating': avg_rating,
            },
            'score_breakdown': {
                'deliverables_points': deliverables_pts,
                'tasks_points': tasks_pts,
                'projects_points': projects_pts,
                'peer_reviews_points': reviews_pts,
            },
            'recent_events': recent_events_data,
        }

    @classmethod
    @transaction.atomic
    def recalculate_all_for_user(cls, user_or_id) -> int:
        """
        Recompute all eligible reputation events from ground-truth database records.
        Useful for reconciliation and periodic integrity syncs.
        """
        user_id = user_or_id.id if hasattr(user_or_id, 'id') else user_or_id
        user = User.objects.filter(id=user_id).first()
        if not user:
            return 0

        # 1. Approved deliverables
        approved_deliverables = TaskDeliverable.objects.filter(
            submitted_by=user,
            reviews__verdict='approved'
        ).select_related('task', 'task__workspace').distinct()

        for deliv in approved_deliverables:
            cls.award_deliverable_approved(deliv)

        # 2. Completed tasks with approved deliverable
        completed_tasks = ProjectTask.objects.filter(
            assignee=user,
            status='completed',
            deliverables__reviews__verdict='approved'
        ).select_related('workspace').distinct()

        for t in completed_tasks:
            approved_deliv = t.deliverables.filter(reviews__verdict='approved').first()
            cls.award_task_completed(t, deliverable=approved_deliv)

        # 3. Minted Proof of Work completions
        completed_workspaces_as_owner = Workspace.objects.filter(
            post__user=user,
            status='completed',
            proof_of_work__isnull=False
        ).select_related('proof_of_work')

        for ws in completed_workspaces_as_owner:
            if hasattr(ws, 'proof_of_work'):
                cls.award_project_completed(ws.proof_of_work, ws)

        # 4. Peer reviews received
        received_reviews = PeerReview.objects.filter(
            reviewee=user
        ).select_related('proof', 'proof__workspace')

        for pr in received_reviews:
            cls.record_peer_review(pr)

        return cls.sync_user_reputation(user)
