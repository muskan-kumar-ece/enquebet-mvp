"""
Workspace, Team Governance, Kanban Tasks, Deliverables, Peer Review & Proof of Work Views.
"""
import hashlib
import json
import uuid
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound

from .models import (
    Workspace, TeamMembership, ProjectMilestone, ProjectTask,
    TaskDeliverable, TaskReview, ProofOfWork, PeerReview, ProjectActivity
)
from apps.posts.models import Post, PostCollaborator
from apps.chats.models import Conversation, ConversationMember
from apps.notifications.models import Notification
from .permissions import IsActiveWorkspaceMember, IsWorkspaceLead, IsWorkspaceOwner
from .workspace_serializers import (
    WorkspaceDetailSerializer, TeamMembershipSerializer, ProjectActivitySerializer,
    ProjectMilestoneSerializer, ProjectTaskSerializer, TaskDeliverableSerializer,
    TaskReviewSerializer, ProofOfWorkSerializer, PeerReviewSerializer
)
from .reputation_service import ReputationService



class WorkspaceLookupMixin:
    """Helper to fetch and validate workspace access."""
    def get_workspace(self):
        identifier = self.kwargs.get('workspace_id') or self.kwargs.get('pk') or self.kwargs.get('post_id')
        try:
            return Workspace.objects.select_related('post', 'post__user').get(
                Q(id=identifier) | Q(post_id=identifier)
            )
        except (Workspace.DoesNotExist, ValueError):
            post = Post.objects.filter(id=identifier).first()
            if post:
                workspace, _ = Workspace.objects.get_or_create(post=post)
                TeamMembership.objects.get_or_create(
                    workspace=workspace,
                    user=post.user,
                    defaults={'role': 'owner', 'status': 'active'}
                )
                return workspace
            raise NotFound('Workspace not found')


class MyWorkspacesListView(APIView):
    """List all workspaces where current user is active member or project owner."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        active_ids = TeamMembership.objects.filter(
            user=request.user,
            status='active'
        ).values_list('workspace_id', flat=True)

        workspaces = Workspace.objects.filter(
            Q(post__user=request.user) | Q(id__in=active_ids)
        ).distinct().select_related('post', 'post__user').order_by('-updated_at')

        serializer = WorkspaceDetailSerializer(workspaces, many=True, context={'request': request})
        return Response(serializer.data)


class WorkspaceByPostView(WorkspaceLookupMixin, APIView):
    """Retrieve workspace by Post ID."""
    permission_classes = [IsActiveWorkspaceMember]

    def get(self, request, post_id):
        workspace = self.get_workspace()
        serializer = WorkspaceDetailSerializer(workspace, context={'request': request})
        return Response(serializer.data)


class WorkspaceDetailView(WorkspaceLookupMixin, APIView):
    """Retrieve or update project workspace details."""
    permission_classes = [IsActiveWorkspaceMember]

    def get(self, request, workspace_id):
        workspace = self.get_workspace()
        serializer = WorkspaceDetailSerializer(workspace, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, workspace_id):
        workspace = self.get_workspace()
        # Only owner or leads can update workspace links and settings
        is_lead = (
            workspace.post.user == request.user or
            TeamMembership.objects.filter(workspace=workspace, user=request.user, status='active', role__in=['owner', 'lead']).exists()
        )
        if not is_lead:
            raise PermissionDenied('Only workspace owner or team leads can update workspace settings.')

        allowed_fields = ['repo_url', 'demo_url', 'documentation_url', 'max_members']
        for field in allowed_fields:
            if field in request.data:
                setattr(workspace, field, request.data[field])

        workspace.save(update_fields=[f for f in allowed_fields if f in request.data] + ['updated_at'])
        ProjectActivity.log(
            workspace=workspace,
            event_type='workspace_updated',
            description=f"{request.user.username} updated workspace links/settings",
            actor=request.user,
        )
        serializer = WorkspaceDetailSerializer(workspace, context={'request': request})
        return Response(serializer.data)


class TeamMembershipListView(WorkspaceLookupMixin, APIView):
    """List team members for the workspace."""
    permission_classes = [IsActiveWorkspaceMember]

    def get(self, request, workspace_id):
        workspace = self.get_workspace()
        include_former = request.query_params.get('include_former', '').lower() in ('1', 'true', 'yes')
        qs = TeamMembership.objects.filter(workspace=workspace)
        if not include_former:
            qs = qs.filter(status='active')
        qs = qs.select_related('user').order_by('role', 'joined_at')
        serializer = TeamMembershipSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


class TeamMemberRoleUpdateView(WorkspaceLookupMixin, APIView):
    """Update a team member's role (Owner only). Supports atomic ownership transfer."""
    permission_classes = [IsWorkspaceOwner]

    @transaction.atomic
    def patch(self, request, workspace_id, member_id):
        workspace = self.get_workspace()
        try:
            membership = TeamMembership.objects.select_for_update().get(id=member_id, workspace=workspace)
        except TeamMembership.DoesNotExist:
            return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)

        new_role = request.data.get('role')
        new_title = request.data.get('role_title', membership.role_title)

        valid_roles = dict(TeamMembership.ROLE_CHOICES).keys()
        if new_role not in valid_roles:
            return Response({'error': f'Invalid role. Choose from: {", ".join(valid_roles)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Atomic Ownership Transfer
        if new_role == 'owner' and membership.user != workspace.post.user:
            # 1. Demote old owner to 'lead'
            old_owner_membership = TeamMembership.objects.filter(
                workspace=workspace, user=workspace.post.user, status='active'
            ).first()
            if old_owner_membership:
                old_owner_membership.role = 'lead'
                old_owner_membership.save(update_fields=['role', 'updated_at'])

            # 2. Promote target to 'owner'
            membership.role = 'owner'
            membership.role_title = new_title or 'Project Owner'
            membership.save(update_fields=['role', 'role_title', 'updated_at'])

            # 3. Update post author
            post = workspace.post
            post.user = membership.user
            post.save(update_fields=['user', 'updated_at'])

            ProjectActivity.log(
                workspace=workspace,
                event_type='ownership_transferred',
                description=f"Project ownership transferred to {membership.user.username}",
                actor=request.user,
                metadata={'previous_owner_id': str(request.user.id), 'new_owner_id': str(membership.user.id)}
            )
            return Response({'message': 'Ownership successfully transferred', 'role': 'owner'})

        membership.role = new_role
        membership.role_title = new_title
        membership.save(update_fields=['role', 'role_title', 'updated_at'])

        ProjectActivity.log(
            workspace=workspace,
            event_type='role_changed',
            description=f"{membership.user.username}'s role changed to {new_role.capitalize()}",
            actor=request.user,
            metadata={'user_id': str(membership.user.id), 'role': new_role}
        )

        return Response(TeamMembershipSerializer(membership, context={'request': request}).data)


class TeamMemberLeaveView(WorkspaceLookupMixin, APIView):
    """Voluntary team departure with automated task reassignment hooks."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, workspace_id):
        workspace = self.get_workspace()
        membership = TeamMembership.objects.select_for_update().filter(
            workspace=workspace, user=request.user, status='active'
        ).first()

        if not membership:
            return Response({'error': 'You are not an active member of this workspace'}, status=status.HTTP_400_BAD_REQUEST)

        # Owner cannot leave without transferring ownership first
        if membership.role == 'owner' or workspace.post.user == request.user:
            return Response(
                {'error': 'Project owner cannot leave. Transfer ownership to another team member first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Update membership status
        membership.status = 'left'
        membership.left_at = timezone.now()
        membership.save(update_fields=['status', 'left_at', 'updated_at'])

        # 2. Sync legacy PostCollaborator
        PostCollaborator.objects.filter(post=workspace.post, user=request.user).delete()

        # 3. Remove from chat group
        ConversationMember.objects.filter(
            conversation__project_id=workspace.post.id,
            user=request.user
        ).delete()

        # 4. Reassignment Hook: Revert open assigned tasks to backlog
        orphaned_tasks = ProjectTask.objects.filter(
            workspace=workspace,
            assignee=request.user,
            status__in=['assigned', 'in_progress', 'blocked']
        )
        reassigned_count = orphaned_tasks.count()
        orphaned_tasks.update(status='backlog', assignee=None, updated_at=timezone.now())

        # 5. Log audit event
        ProjectActivity.log(
            workspace=workspace,
            event_type='member_left',
            description=f"{request.user.username} left the team voluntarily ({reassigned_count} tasks unassigned)",
            actor=request.user,
            metadata={'user_id': str(request.user.id), 'tasks_unassigned': reassigned_count}
        )

        workspace.recalculate_progress()
        return Response({'message': 'You have left the workspace', 'tasks_unassigned': reassigned_count})


class TeamMemberRemoveView(WorkspaceLookupMixin, APIView):
    """Owner/Lead-driven removal with mandatory justification and task reassignment."""
    permission_classes = [IsWorkspaceLead]

    @transaction.atomic
    def post(self, request, workspace_id, member_id):
        workspace = self.get_workspace()
        try:
            target_membership = TeamMembership.objects.select_for_update().get(id=member_id, workspace=workspace)
        except TeamMembership.DoesNotExist:
            return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_membership.role == 'owner' or workspace.post.user == target_membership.user:
            return Response({'error': 'Cannot remove project owner'}, status=status.HTTP_400_BAD_REQUEST)

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'error': 'A structured removal reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Mark as removed
        target_membership.status = 'removed'
        target_membership.left_at = timezone.now()
        target_membership.removal_reason = reason
        target_membership.save(update_fields=['status', 'left_at', 'removal_reason', 'updated_at'])

        # 2. Sync legacy PostCollaborator
        PostCollaborator.objects.filter(post=workspace.post, user=target_membership.user).delete()

        # 3. Evict from chat group
        ConversationMember.objects.filter(
            conversation__project_id=workspace.post.id,
            user=target_membership.user
        ).delete()

        # 4. Reassignment hook
        orphaned_tasks = ProjectTask.objects.filter(
            workspace=workspace,
            assignee=target_membership.user,
            status__in=['assigned', 'in_progress', 'blocked']
        )
        reassigned_count = orphaned_tasks.count()
        orphaned_tasks.update(status='backlog', assignee=None, updated_at=timezone.now())

        # 5. Notify removed user
        Notification.objects.create(
            user=target_membership.user,
            sender=request.user,
            type='team_removed',
            reference_id=workspace.id,
            message=f"You were removed from '{workspace.post.title}' by {request.user.username}. Reason: {reason}"
        )

        # 6. Audit log
        ProjectActivity.log(
            workspace=workspace,
            event_type='member_removed',
            description=f"{target_membership.user.username} was removed by {request.user.username}. Reason: {reason}",
            actor=request.user,
            metadata={
                'removed_user_id': str(target_membership.user.id),
                'reason': reason,
                'tasks_unassigned': reassigned_count
            }
        )

        workspace.recalculate_progress()
        return Response({'message': 'Member removed successfully', 'tasks_unassigned': reassigned_count})


class ProjectActivityListView(WorkspaceLookupMixin, APIView):
    """Retrieve workspace audit activity timeline."""
    permission_classes = [IsActiveWorkspaceMember]

    def get(self, request, workspace_id):
        workspace = self.get_workspace()
        activities = workspace.activities.select_related('actor').order_by('-created_at')[:50]
        serializer = ProjectActivitySerializer(activities, many=True, context={'request': request})
        return Response(serializer.data)


class ProjectMilestoneListCreateView(WorkspaceLookupMixin, APIView):
    """List or create roadmap milestones."""
    permission_classes = [IsActiveWorkspaceMember]

    def get(self, request, workspace_id):
        workspace = self.get_workspace()
        milestones = workspace.milestones.all().order_by('order', 'due_date')
        serializer = ProjectMilestoneSerializer(milestones, many=True)
        return Response(serializer.data)

    def post(self, request, workspace_id):
        workspace = self.get_workspace()
        # Only owner or leads can create milestones
        if not (workspace.post.user == request.user or TeamMembership.objects.filter(workspace=workspace, user=request.user, status='active', role__in=['owner', 'lead']).exists()):
            raise PermissionDenied('Only owner or team leads can create milestones.')

        data = request.data.copy()
        data['workspace'] = workspace.id
        serializer = ProjectMilestoneSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        milestone = serializer.save(workspace=workspace)

        ProjectActivity.log(
            workspace=workspace,
            event_type='milestone_created',
            description=f"Milestone '{milestone.title}' created by {request.user.username}",
            actor=request.user
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProjectTaskListCreateView(WorkspaceLookupMixin, APIView):
    """List tasks with Kanban filters or create a new task."""
    permission_classes = [IsActiveWorkspaceMember]

    def get(self, request, workspace_id):
        workspace = self.get_workspace()
        qs = workspace.tasks.select_related('creator', 'assignee', 'reviewer', 'milestone').prefetch_related('deliverables', 'deliverables__reviews')
        
        # Filters
        task_status = request.query_params.get('status')
        assignee_id = request.query_params.get('assignee_id')
        milestone_id = request.query_params.get('milestone_id')

        if task_status:
            qs = qs.filter(status=task_status)
        if assignee_id:
            qs = qs.filter(assignee_id=assignee_id)
        if milestone_id:
            qs = qs.filter(milestone_id=milestone_id)

        serializer = ProjectTaskSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, workspace_id):
        workspace = self.get_workspace()
        serializer = ProjectTaskSerializer(data=request.data, context={'workspace': workspace, 'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        assignee_id = serializer.validated_data.pop('assignee_id', None)
        reviewer_id = serializer.validated_data.pop('reviewer_id', None)
        milestone_id = serializer.validated_data.pop('milestone_id', None)

        task = serializer.save(
            workspace=workspace,
            creator=request.user,
            assignee_id=assignee_id,
            reviewer_id=reviewer_id,
            milestone_id=milestone_id,
            status='assigned' if assignee_id else 'backlog'
        )

        ProjectActivity.log(
            workspace=workspace,
            event_type='task_created',
            description=f"Task '{task.title}' created by {request.user.username}",
            actor=request.user,
            metadata={'task_id': str(task.id)}
        )

        if assignee_id and assignee_id != request.user.id:
            Notification.objects.create(
                user_id=assignee_id,
                sender=request.user,
                type='task_assigned',
                reference_id=task.id,
                message=f"You were assigned to task '{task.title}' in {workspace.post.title}"
            )

        workspace.recalculate_progress()
        return Response(ProjectTaskSerializer(task, context={'request': request}).data, status=status.HTTP_201_CREATED)


class ProjectTaskDetailView(WorkspaceLookupMixin, APIView):
    """Retrieve, update, or transition a specific task."""
    permission_classes = [IsActiveWorkspaceMember]

    def get(self, request, workspace_id, task_id):
        workspace = self.get_workspace()
        task = workspace.tasks.select_related('creator', 'assignee', 'reviewer', 'milestone').prefetch_related('deliverables', 'deliverables__reviews').filter(id=task_id).first()
        if not task:
            raise NotFound('Task not found')
        return Response(ProjectTaskSerializer(task, context={'request': request}).data)

    @transaction.atomic
    def patch(self, request, workspace_id, task_id):
        workspace = self.get_workspace()
        task = workspace.tasks.select_for_update().filter(id=task_id).first()
        if not task:
            raise NotFound('Task not found')

        new_status = request.data.get('status')
        new_assignee_id = request.data.get('assignee_id')

        # Status transition validation
        if new_status and new_status != task.status:
            valid_statuses = dict(ProjectTask.STATUS_CHOICES).keys()
            if new_status not in valid_statuses:
                return Response({'error': f'Invalid status. Choose from: {", ".join(valid_statuses)}'}, status=status.HTTP_400_BAD_REQUEST)
            task.status = new_status
            if new_status == 'completed':
                task.completed_at = timezone.now()
            elif task.status == 'completed' and new_status != 'completed':
                task.completed_at = None

            ProjectActivity.log(
                workspace=workspace,
                event_type='task_status_changed',
                description=f"Task '{task.title}' moved to {new_status.replace('_', ' ').capitalize()}",
                actor=request.user,
                metadata={'task_id': str(task.id), 'status': new_status}
            )

        # Assignment validation
        if 'assignee_id' in request.data:
            if new_assignee_id:
                if not TeamMembership.objects.filter(workspace=workspace, user_id=new_assignee_id, status='active').exists():
                    return Response({'error': 'Assignee must be an active workspace member.'}, status=status.HTTP_400_BAD_REQUEST)
                task.assignee_id = new_assignee_id
                if task.status == 'backlog':
                    task.status = 'assigned'
            else:
                task.assignee = None
                if task.status == 'assigned':
                    task.status = 'backlog'

        # Other fields
        for field in ['title', 'description', 'priority', 'due_date']:
            if field in request.data:
                setattr(task, field, request.data[field])

        task.save()
        workspace.recalculate_progress()
        return Response(ProjectTaskSerializer(task, context={'request': request}).data)


class TaskDeliverableSubmitView(WorkspaceLookupMixin, APIView):
    """Submit a deliverable for review (moves task to in_review)."""
    permission_classes = [IsActiveWorkspaceMember]

    @transaction.atomic
    def post(self, request, workspace_id, task_id):
        workspace = self.get_workspace()
        task = workspace.tasks.select_for_update().filter(id=task_id).first()
        if not task:
            raise NotFound('Task not found')

        pr_url = (request.data.get('pr_url') or '').strip()
        file_url = (request.data.get('file_url') or '').strip()
        title = (request.data.get('title') or f"Deliverable for {task.title}").strip()
        description = (request.data.get('description') or '').strip()

        if not pr_url and not file_url:
            return Response({'error': 'Either a Pull Request / repository URL or file attachment is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Increment version number
        latest_version = task.deliverables.count() + 1
        deliverable = TaskDeliverable.objects.create(
            task=task,
            submitted_by=request.user,
            title=title,
            description=description,
            pr_url=pr_url,
            file_url=file_url,
            file_type=request.data.get('file_type', ''),
            version=latest_version
        )

        task.status = 'in_review'
        task.save(update_fields=['status', 'updated_at'])

        ProjectActivity.log(
            workspace=workspace,
            event_type='deliverable_submitted',
            description=f"{request.user.username} submitted deliverable v{latest_version} for '{task.title}'",
            actor=request.user,
            metadata={'task_id': str(task.id), 'deliverable_id': str(deliverable.id)}
        )

        # Notify reviewer or owner/lead
        target_reviewer = task.reviewer or (workspace.post.user if workspace.post.user != request.user else None)
        if target_reviewer:
            Notification.objects.create(
                user=target_reviewer,
                sender=request.user,
                type='deliverable_review',
                reference_id=task.id,
                message=f"Review requested for '{task.title}' by {request.user.username}"
            )

        workspace.recalculate_progress()
        return Response(TaskDeliverableSerializer(deliverable).data, status=status.HTTP_201_CREATED)


class TaskDeliverableReviewView(WorkspaceLookupMixin, APIView):
    """Review deliverable with Anti-Self-Review enforcement."""
    permission_classes = [IsActiveWorkspaceMember]

    @transaction.atomic
    def post(self, request, workspace_id, task_id, deliverable_id):
        workspace = self.get_workspace()
        task = workspace.tasks.select_for_update().filter(id=task_id).first()
        if not task:
            raise NotFound('Task not found')

        deliverable = task.deliverables.filter(id=deliverable_id).first()
        if not deliverable:
            raise NotFound('Deliverable not found')

        # Anti-Self-Approval Guard: Submitters cannot approve their own work!
        if deliverable.submitted_by == request.user:
            return Response(
                {'error': 'Anti-Self-Approval: You cannot review or approve your own deliverable.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reviewer must be owner, lead, or assigned reviewer
        is_authorized = (
            workspace.post.user == request.user or
            task.reviewer == request.user or
            TeamMembership.objects.filter(workspace=workspace, user=request.user, status='active', role__in=['owner', 'lead']).exists()
        )
        if not is_authorized:
            raise PermissionDenied('Only project owner, leads, or assigned reviewers can review deliverables.')

        verdict = request.data.get('verdict')
        feedback = (request.data.get('feedback') or '').strip()

        if verdict not in ['approved', 'changes_requested', 'rejected']:
            return Response({'error': 'Verdict must be approved, changes_requested, or rejected.'}, status=status.HTTP_400_BAD_REQUEST)

        review = TaskReview.objects.create(
            deliverable=deliverable,
            reviewer=request.user,
            verdict=verdict,
            feedback=feedback
        )

        # State transitions
        if verdict == 'approved':
            task.status = 'completed'
            task.completed_at = timezone.now()
            # Verified builder reputation awards
            ReputationService.award_deliverable_approved(deliverable, reviewer=request.user)
            ReputationService.award_task_completed(task, deliverable=deliverable)
        elif verdict == 'changes_requested':
            task.status = 'changes_requested'
        else:
            task.status = 'in_progress'

        task.save(update_fields=['status', 'completed_at', 'updated_at'])


        ProjectActivity.log(
            workspace=workspace,
            event_type='deliverable_reviewed',
            description=f"{request.user.username} {verdict.replace('_', ' ')} deliverable for '{task.title}'",
            actor=request.user,
            metadata={'task_id': str(task.id), 'verdict': verdict}
        )

        Notification.objects.create(
            user=deliverable.submitted_by,
            sender=request.user,
            type='deliverable_review',
            reference_id=task.id,
            message=f"Your deliverable for '{task.title}' was {verdict.replace('_', ' ')} by {request.user.username}"
        )

        workspace.recalculate_progress()
        return Response(TaskReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class ProjectCompletionRequestView(WorkspaceLookupMixin, APIView):
    """
    Project Completion Engine:
    Verifies that all active tasks are completed and mints verifiable Proof of Work.
    """
    permission_classes = [IsActiveWorkspaceMember]

    def get(self, request, workspace_id):
        workspace = self.get_workspace()
        proof = ProofOfWork.objects.filter(workspace=workspace).first()
        if not proof:
            return Response({'error': 'No Proof of Work minted yet for this workspace'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProofOfWorkSerializer(proof).data)

    @transaction.atomic
    def post(self, request, workspace_id):
        workspace = self.get_workspace()
        if workspace.post.user != request.user:
            raise PermissionDenied('Only project owner can initiate project completion.')

        # Check outstanding tasks
        active_tasks = workspace.tasks.exclude(status='cancelled')
        incomplete_tasks = active_tasks.exclude(status='completed')
        incomplete_count = incomplete_tasks.count()

        if incomplete_count > 0:
            return Response({
                'error': f'Project completion blocked: {incomplete_count} task(s) are not completed.',
                'incomplete_tasks_count': incomplete_count
            }, status=status.HTTP_400_BAD_REQUEST)

        if active_tasks.count() == 0:
            return Response({'error': 'Cannot complete project without any delivered tasks.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Update workspace status
        workspace.status = 'completed'
        workspace.completed_at = timezone.now()
        workspace.progress_percentage = 100
        workspace.save(update_fields=['status', 'completed_at', 'progress_percentage', 'updated_at'])

        # 2. Mint Proof of Work (or fetch existing)
        code = f"ENQ-{timezone.now().year}-{uuid.uuid4().hex[:6].upper()}"
        active_members = [
            {
                'user_id': str(m['user_id']),
                'role': m['role'],
                'role_title': m['role_title'] or ''
            }
            for m in workspace.memberships.filter(status='active').values('user_id', 'role', 'role_title')
        ]
        metadata_snapshot = {
            'post_title': workspace.post.title,
            'completed_tasks_count': active_tasks.count(),
            'team': active_members,
            'completed_at': workspace.completed_at.isoformat()
        }
        content_hash = hashlib.sha256(json.dumps(metadata_snapshot, sort_keys=True, default=str).encode()).hexdigest()

        proof, created = ProofOfWork.objects.get_or_create(
            workspace=workspace,
            defaults={
                'verification_code': code,
                'summary': f"Delivered {workspace.post.title} with {len(active_members)} builders.",
                'metadata_snapshot': metadata_snapshot,
                'content_hash': content_hash,
                'is_verified': True
            }
        )

        ProjectActivity.log(
            workspace=workspace,
            event_type='project_completed',
            description=f"Project marked completed and Proof of Work minted ({proof.verification_code})",
            actor=request.user,
            metadata={'proof_id': str(proof.id), 'verification_code': proof.verification_code}
        )

        # Notify team
        for member in workspace.memberships.filter(status='active').select_related('user'):
            if member.user != request.user:
                Notification.objects.create(
                    user=member.user,
                    sender=request.user,
                    type='project_completed',
                    reference_id=workspace.id,
                    message=f"Project '{workspace.post.title}' has been successfully completed! Proof of Work minted: {proof.verification_code}"
                )

        # Award verified project completion reputation to lead and contributing builders
        ReputationService.award_project_completed(proof, workspace, actor=request.user)

        return Response({
            'message': 'Project completed successfully',
            'proof_of_work': ProofOfWorkSerializer(proof).data
        })


class ProjectReopenView(WorkspaceLookupMixin, APIView):
    """Reopen a completed project for further iteration (Owner only)."""
    permission_classes = [IsWorkspaceOwner]

    @transaction.atomic
    def post(self, request, workspace_id):
        workspace = self.get_workspace()
        if workspace.status != 'completed':
            return Response({'error': 'Only completed projects can be reopened.'}, status=status.HTTP_400_BAD_REQUEST)

        workspace.status = 'active'
        workspace.save(update_fields=['status', 'updated_at'])

        # Revoke project completion reputation points while reopened
        ReputationService.revoke_project_completion(workspace)

        ProjectActivity.log(
            workspace=workspace,
            event_type='project_reopened',
            description=f"Workspace reopened by {request.user.username}",
            actor=request.user
        )

        return Response({'message': 'Workspace reopened successfully', 'status': 'active'})



class PublicProofDetailView(APIView):
    """Public verification endpoint for minted Proof of Work credentials."""
    permission_classes = [AllowAny]

    def get(self, request, code):
        try:
            proof = ProofOfWork.objects.select_related('workspace', 'workspace__post').get(verification_code=code)
        except ProofOfWork.DoesNotExist:
            return Response({'error': 'Proof of Work credential not found'}, status=status.HTTP_404_NOT_FOUND)

        # Cryptographic integrity check: Recompute SHA-256 digest from canonical metadata snapshot
        computed_hash = hashlib.sha256(
            json.dumps(proof.metadata_snapshot, sort_keys=True, default=str).encode()
        ).hexdigest()
        is_tamper_free = (computed_hash == proof.content_hash)

        data = ProofOfWorkSerializer(proof).data
        data['is_tamper_free'] = is_tamper_free
        data['computed_hash'] = computed_hash
        return Response(data)


class PeerReviewSubmitView(APIView):
    """Submit post-completion reciprocal peer evaluation for builder reputation."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, code):
        try:
            proof = ProofOfWork.objects.select_related('workspace').get(verification_code=code)
        except ProofOfWork.DoesNotExist:
            return Response({'error': 'Proof of Work credential not found'}, status=status.HTTP_404_NOT_FOUND)

        # Must be active team member
        if not TeamMembership.objects.filter(workspace=proof.workspace, user=request.user, status='active').exists():
            raise PermissionDenied('Only team members who contributed to this project can submit peer reviews.')

        reviewee_id = request.data.get('reviewee_id')
        if not reviewee_id:
            return Response({'error': 'reviewee_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Anti-Self-Rating Guard
        if str(request.user.id) == str(reviewee_id):
            return Response({'error': 'You cannot evaluate yourself in peer review.'}, status=status.HTTP_400_BAD_REQUEST)

        if not TeamMembership.objects.filter(workspace=proof.workspace, user_id=reviewee_id, status='active').exists():
            return Response({'error': 'Reviewee must be a contributing member of this project.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PeerReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        peer_review, created = PeerReview.objects.update_or_create(
            proof=proof,
            reviewer=request.user,
            reviewee_id=reviewee_id,
            defaults={
                'execution_score': serializer.validated_data.get('execution_score', 5),
                'collaboration_score': serializer.validated_data.get('collaboration_score', 5),
                'reliability_score': serializer.validated_data.get('reliability_score', 5),
                'feedback': serializer.validated_data.get('feedback', '')
            }
        )

        # Synchronize builder reputation points from peer review
        ReputationService.record_peer_review(peer_review)

        return Response(PeerReviewSerializer(peer_review).data, status=status.HTTP_201_CREATED)

