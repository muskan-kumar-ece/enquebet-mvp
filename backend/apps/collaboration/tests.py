"""
Tests for Collaboration Request Lifecycle Hardening, Atomic Provisioning, and Capacity Enforcement.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.posts.models import Post, PostCollaborator
from apps.collaboration.models import (
    CollaborationRequest, Workspace, TeamMembership, ProjectMilestone,
    ProjectTask, TaskDeliverable, TaskReview, ProofOfWork, PeerReview, ProjectActivity,
    ReputationEvent
)
from apps.collaboration.reputation_service import ReputationService
from apps.collaboration.reputation_config import REPUTATION_WEIGHTS
from apps.chats.models import Conversation, ConversationMember
from apps.notifications.models import Notification

User = get_user_model()



class CollaborationLifecycleTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.owner = User.objects.create_user(
            email='founder@enquebet.com',
            username='project_owner',
            password='Password123!',
        )
        self.applicant = User.objects.create_user(
            email='applicant@enquebet.com',
            username='builder_applicant',
            password='Password123!',
        )
        self.stranger = User.objects.create_user(
            email='stranger@enquebet.com',
            username='stranger_user',
            password='Password123!',
        )

        # Post
        self.post = Post.objects.create(
            user=self.owner,
            title='Autonomous Agent Workspace',
            description='Building distributed builder infrastructure.',
            category='ai',
            view_type='public',
        )

    def test_self_collaboration_request_forbidden(self):
        """Owner cannot submit a collaboration request on their own post."""
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/v1/collaboration/request/', {
            'post_id': str(self.post.id),
            'message': 'Let me join my own project!'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot request to collaborate on your own post', str(resp.data))

    def test_send_collaboration_request_success(self):
        """Builder can submit a request and owner receives a notification."""
        self.client.force_authenticate(user=self.applicant)
        resp = self.client.post('/api/v1/collaboration/request/', {
            'post_id': str(self.post.id),
            'message': 'Experienced in Django and React.'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'pending')

        # Check request in DB
        req = CollaborationRequest.objects.get(post=self.post, sender=self.applicant)
        self.assertEqual(req.status, 'pending')

        # Check notification for owner
        notif = Notification.objects.filter(user=self.owner, type='collaboration_request').first()
        self.assertIsNotNone(notif)
        self.assertIn(self.applicant.username, notif.message)

    def test_duplicate_pending_request_rejected(self):
        """Submitting a second request while one is pending returns 400 Bad Request."""
        CollaborationRequest.objects.create(
            post=self.post,
            sender=self.applicant,
            receiver=self.owner,
            status='pending',
            message='First request'
        )
        self.client.force_authenticate(user=self.applicant)
        resp = self.client.post('/api/v1/collaboration/request/', {
            'post_id': str(self.post.id),
            'message': 'Duplicate request attempt'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['error'], 'Request already sent')

    def test_reopen_declined_request(self):
        """Declined request can be reopened by applicant with updated message."""
        declined_req = CollaborationRequest.objects.create(
            post=self.post,
            sender=self.applicant,
            receiver=self.owner,
            status='declined',
            message='Old pitch'
        )
        self.client.force_authenticate(user=self.applicant)
        resp = self.client.post('/api/v1/collaboration/request/', {
            'post_id': str(self.post.id),
            'message': 'New pitch with updated portfolio.'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        declined_req.refresh_from_db()
        self.assertEqual(declined_req.status, 'pending')
        self.assertEqual(declined_req.message, 'New pitch with updated portfolio.')

    def test_cancel_pending_request(self):
        """Sender can cancel their pending request."""
        req = CollaborationRequest.objects.create(
            post=self.post,
            sender=self.applicant,
            receiver=self.owner,
            status='pending'
        )
        self.client.force_authenticate(user=self.applicant)
        resp = self.client.post(f'/api/v1/collaboration/request/{req.id}/cancel/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.status, 'cancelled')

    def test_stranger_cannot_cancel_request(self):
        """Non-sender cannot cancel someone else's request."""
        req = CollaborationRequest.objects.create(
            post=self.post,
            sender=self.applicant,
            receiver=self.owner,
            status='pending'
        )
        self.client.force_authenticate(user=self.stranger)
        resp = self.client.post(f'/api/v1/collaboration/request/{req.id}/cancel/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        req.refresh_from_db()
        self.assertEqual(req.status, 'pending')

    def test_atomic_accept_request_provisions_team_and_chat(self):
        """Accepting a request provisions Workspace, TeamMembership, chat, and notifications."""
        req = CollaborationRequest.objects.create(
            post=self.post,
            sender=self.applicant,
            receiver=self.owner,
            status='pending'
        )
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/v1/collaboration/request/{req.id}/accept/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('workspace_id', resp.data)
        self.assertIn('group_chat_id', resp.data)

        # Verify request status
        req.refresh_from_db()
        self.assertEqual(req.status, 'accepted')

        # Verify Workspace exists
        workspace = Workspace.objects.get(post=self.post)
        self.assertEqual(workspace.status, 'active')

        # Verify TeamMembership created for owner and applicant
        owner_member = TeamMembership.objects.get(workspace=workspace, user=self.owner)
        self.assertEqual(owner_member.role, 'owner')
        self.assertEqual(owner_member.status, 'active')

        applicant_member = TeamMembership.objects.get(workspace=workspace, user=self.applicant)
        self.assertEqual(applicant_member.role, 'contributor')
        self.assertEqual(applicant_member.status, 'active')

        # Verify PostCollaborator legacy sync
        self.assertTrue(PostCollaborator.objects.filter(post=self.post, user=self.applicant).exists())

        # Verify Group Chat & members
        conv = Conversation.objects.get(project_id=self.post.id, is_group=True)
        self.assertTrue(ConversationMember.objects.filter(conversation=conv, user=self.owner).exists())
        self.assertTrue(ConversationMember.objects.filter(conversation=conv, user=self.applicant).exists())

        # Verify notification sent to applicant
        notif = Notification.objects.filter(user=self.applicant, type='collaboration_accepted').first()
        self.assertIsNotNone(notif)

    def test_non_owner_cannot_accept(self):
        """Unauthorized user cannot accept requests."""
        req = CollaborationRequest.objects.create(
            post=self.post,
            sender=self.applicant,
            receiver=self.owner,
            status='pending'
        )
        self.client.force_authenticate(user=self.stranger)
        resp = self.client.post(f'/api/v1/collaboration/request/{req.id}/accept/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        req.refresh_from_db()
        self.assertEqual(req.status, 'pending')

    def test_capacity_limit_enforced(self):
        """Accepting requests beyond max_members is rejected."""
        workspace = Workspace.objects.create(post=self.post, max_members=1)
        # Owner already counts as 1 member
        TeamMembership.objects.create(workspace=workspace, user=self.owner, role='owner', status='active')

        req = CollaborationRequest.objects.create(
            post=self.post,
            sender=self.applicant,
            receiver=self.owner,
            status='pending'
        )
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/v1/collaboration/request/{req.id}/accept/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('capacity reached', resp.data['error'])
        req.refresh_from_db()
        self.assertEqual(req.status, 'pending')


class TeamGovernanceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email='gov_owner@enquebet.com', username='gov_owner', password='Password123!')
        self.lead = User.objects.create_user(email='gov_lead@enquebet.com', username='gov_lead', password='Password123!')
        self.member = User.objects.create_user(email='gov_member@enquebet.com', username='gov_member', password='Password123!')
        self.outsider = User.objects.create_user(email='gov_outsider@enquebet.com', username='gov_outsider', password='Password123!')

        self.post = Post.objects.create(
            user=self.owner,
            title='Autonomous Agent System',
            description='Production AI agents project.',
            category='ai',
            view_type='public',
        )
        self.workspace = Workspace.objects.create(post=self.post, max_members=10)
        self.owner_membership = TeamMembership.objects.create(workspace=self.workspace, user=self.owner, role='owner', status='active')
        self.lead_membership = TeamMembership.objects.create(workspace=self.workspace, user=self.lead, role='lead', status='active')
        self.member_membership = TeamMembership.objects.create(workspace=self.workspace, user=self.member, role='contributor', status='active')

        # Chat
        self.conversation = Conversation.objects.create(project_id=self.post.id, is_group=True, name='Team Chat')
        ConversationMember.objects.create(conversation=self.conversation, user=self.owner)
        ConversationMember.objects.create(conversation=self.conversation, user=self.lead)
        ConversationMember.objects.create(conversation=self.conversation, user=self.member)

    def test_list_team_members(self):
        """Active members can fetch the team roster."""
        self.client.force_authenticate(user=self.member)
        resp = self.client.get(f'/api/v1/workspaces/{self.workspace.id}/members/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 3)

    def test_outsider_cannot_access_workspace(self):
        """Non-members are denied access to private workspace endpoints."""
        self.client.force_authenticate(user=self.outsider)
        resp = self.client.get(f'/api/v1/workspaces/{self.workspace.id}/members/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_role_update_by_owner(self):
        """Owner can update contributor roles and titles."""
        self.client.force_authenticate(user=self.owner)
        resp = self.client.patch(f'/api/v1/workspaces/{self.workspace.id}/members/{self.member_membership.id}/role/', {
            'role': 'lead',
            'role_title': 'Frontend Lead'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.member_membership.refresh_from_db()
        self.assertEqual(self.member_membership.role, 'lead')
        self.assertEqual(self.member_membership.role_title, 'Frontend Lead')

    def test_non_owner_cannot_change_roles(self):
        """Non-owners (leads, contributors) cannot modify roles (privilege escalation check)."""
        self.client.force_authenticate(user=self.lead)
        resp = self.client.patch(f'/api/v1/workspaces/{self.workspace.id}/members/{self.member_membership.id}/role/', {
            'role': 'contributor'
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_ownership_transfer(self):
        """Owner can transfer workspace ownership to a team member atomically."""
        self.client.force_authenticate(user=self.owner)
        resp = self.client.patch(f'/api/v1/workspaces/{self.workspace.id}/members/{self.lead_membership.id}/role/', {
            'role': 'owner'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.lead_membership.refresh_from_db()
        self.owner_membership.refresh_from_db()
        self.post.refresh_from_db()

        self.assertEqual(self.lead_membership.role, 'owner')
        self.assertEqual(self.owner_membership.role, 'lead')
        self.assertEqual(self.post.user, self.lead)

    def test_owner_cannot_voluntarily_leave(self):
        """Owner cannot leave workspace without transferring ownership first."""
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/members/leave/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('transfer ownership', resp.data['error'].lower())

    def test_member_voluntary_leave_reassigns_tasks(self):
        """Leaving member has active tasks unassigned and membership marked left."""
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.member,
            title='Implement Auth',
            status='in_progress'
        )
        self.client.force_authenticate(user=self.member)
        resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/members/leave/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.member_membership.refresh_from_db()
        self.assertEqual(self.member_membership.status, 'left')

        task.refresh_from_db()
        self.assertIsNone(task.assignee)
        self.assertEqual(task.status, 'backlog')

    def test_owner_removes_member_with_justification(self):
        """Owner can remove a member with a recorded reason, evicting them from chat."""
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/members/{self.member_membership.id}/remove/', {
            'reason': 'Unresponsive for two weeks'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.member_membership.refresh_from_db()
        self.assertEqual(self.member_membership.status, 'removed')
        self.assertEqual(self.member_membership.removal_reason, 'Unresponsive for two weeks')

        # Verify chat eviction
        self.assertFalse(ConversationMember.objects.filter(conversation=self.conversation, user=self.member).exists())


class TasksKanbanTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email='task_owner@enquebet.com', username='task_owner', password='Password123!')
        self.contributor = User.objects.create_user(email='task_contrib@enquebet.com', username='task_contrib', password='Password123!')
        self.outsider = User.objects.create_user(email='task_outsider@enquebet.com', username='task_outsider', password='Password123!')

        self.post = Post.objects.create(user=self.owner, title='Kanban Post', category='web', view_type='public')
        self.workspace = Workspace.objects.create(post=self.post)
        TeamMembership.objects.create(workspace=self.workspace, user=self.owner, role='owner', status='active')
        TeamMembership.objects.create(workspace=self.workspace, user=self.contributor, role='contributor', status='active')

    def test_create_task_by_contributor(self):
        """Active team member can create a task in the workspace."""
        self.client.force_authenticate(user=self.contributor)
        resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/tasks/', {
            'title': 'Design Landing Page Hero',
            'description': 'Create Figma wireframe and assets',
            'priority': 'high',
            'status': 'backlog'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['title'], 'Design Landing Page Hero')
        self.assertEqual(resp.data['priority'], 'high')

    def test_non_member_cannot_create_task(self):
        """Outsider cannot create tasks in a private workspace."""
        self.client.force_authenticate(user=self.outsider)
        resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/tasks/', {
            'title': 'Intruder task'
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_task_status_and_assignee(self):
        """Member can claim a task and change its status."""
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            title='Setup CI Pipeline',
            status='backlog'
        )
        self.client.force_authenticate(user=self.contributor)
        resp = self.client.patch(f'/api/v1/workspaces/{self.workspace.id}/tasks/{task.id}/', {
            'status': 'in_progress',
            'assignee_id': str(self.contributor.id)
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.status, 'in_progress')
        self.assertEqual(task.assignee, self.contributor)


class DeliverablesReviewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email='deliv_owner@enquebet.com', username='deliv_owner', password='Password123!')
        self.contributor = User.objects.create_user(email='deliv_contrib@enquebet.com', username='deliv_contrib', password='Password123!')

        self.post = Post.objects.create(user=self.owner, title='Deliverable Post', category='web', view_type='public')
        self.workspace = Workspace.objects.create(post=self.post)
        TeamMembership.objects.create(workspace=self.workspace, user=self.owner, role='owner', status='active')
        TeamMembership.objects.create(workspace=self.workspace, user=self.contributor, role='contributor', status='active')

        self.task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.contributor,
            title='Build Auth API',
            status='in_progress'
        )

    def test_submit_deliverable(self):
        """Assignee submits a deliverable, moving task to in_review."""
        self.client.force_authenticate(user=self.contributor)
        resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/tasks/{self.task.id}/deliverables/', {
            'pr_url': 'https://github.com/enquebet/enquebet-mvp/pull/42',
            'description': 'Completed JWT auth with tests.'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, 'in_review')
        self.assertEqual(self.task.deliverables.count(), 1)

    def test_anti_self_approval_guard(self):
        """Submitter cannot review or approve their own deliverable."""
        deliverable = TaskDeliverable.objects.create(
            task=self.task,
            submitted_by=self.contributor,
            pr_url='https://github.com/enquebet/enquebet-mvp/pull/42',
            title='Auth implementation'
        )
        self.task.status = 'in_review'
        self.task.save()

        # Contributor attempts to approve own deliverable
        self.client.force_authenticate(user=self.contributor)
        resp = self.client.post(
            f'/api/v1/workspaces/{self.workspace.id}/tasks/{self.task.id}/deliverables/{deliverable.id}/review/',
            {'verdict': 'approved', 'feedback': 'Looks good to me!'}
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Anti-Self-Approval', str(resp.data))

    def test_owner_approves_deliverable_marks_task_completed(self):
        """Owner approves deliverable, transitioning task to completed."""
        deliverable = TaskDeliverable.objects.create(
            task=self.task,
            submitted_by=self.contributor,
            pr_url='https://github.com/enquebet/enquebet-mvp/pull/42',
            title='Auth implementation'
        )
        self.task.status = 'in_review'
        self.task.save()

        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(
            f'/api/v1/workspaces/{self.workspace.id}/tasks/{self.task.id}/deliverables/{deliverable.id}/review/',
            {'verdict': 'approved', 'feedback': 'Great job, tests pass.'}
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, 'completed')
        self.assertIsNotNone(self.task.completed_at)


class ProjectCompletionAndProofTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email='comp_owner@enquebet.com', username='comp_owner', password='Password123!')
        self.contributor = User.objects.create_user(email='comp_contrib@enquebet.com', username='comp_contrib', password='Password123!')

        self.post = Post.objects.create(user=self.owner, title='Completion Post', category='web', view_type='public')
        self.workspace = Workspace.objects.create(post=self.post)
        TeamMembership.objects.create(workspace=self.workspace, user=self.owner, role='owner', status='active')
        TeamMembership.objects.create(workspace=self.workspace, user=self.contributor, role='contributor', status='active')

    def test_completion_blocked_by_incomplete_tasks(self):
        """Project completion is rejected if tasks remain incomplete."""
        ProjectTask.objects.create(workspace=self.workspace, creator=self.owner, title='Unfinished work', status='in_progress')
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/complete/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('blocked', resp.data['error'])

    def test_complete_project_mints_proof_of_work(self):
        """Completing project marks workspace completed and mints Proof of Work with SHA-256 hash."""
        ProjectTask.objects.create(workspace=self.workspace, creator=self.owner, title='Finished feature', status='completed')
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/complete/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('proof_of_work', resp.data)

        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.status, 'completed')

        proof = ProofOfWork.objects.get(workspace=self.workspace)
        self.assertTrue(proof.is_verified)
        self.assertTrue(proof.verification_code.startswith('ENQ-'))
        self.assertTrue(len(proof.content_hash) == 64)  # SHA-256

        # Public verification endpoint works without auth
        public_client = APIClient()
        pub_resp = public_client.get(f'/api/v1/proofs/{proof.verification_code}/')
        self.assertEqual(pub_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(pub_resp.data['verification_code'], proof.verification_code)

    def test_peer_review_anti_self_rating(self):
        """Team member cannot evaluate themselves in post-completion peer review."""
        ProjectTask.objects.create(workspace=self.workspace, creator=self.owner, title='Done', status='completed')
        proof = ProofOfWork.objects.create(
            workspace=self.workspace,
            verification_code='ENQ-2026-TEST01',
            summary='Test proof',
            content_hash='abcd1234efgh5678',
            is_verified=True
        )

        self.client.force_authenticate(user=self.contributor)
        resp = self.client.post(f'/api/v1/proofs/{proof.verification_code}/peer-review/', {
            'reviewee_id': str(self.contributor.id),
            'execution_score': 5
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot evaluate yourself', resp.data['error'])

    def test_peer_review_valid_submission(self):
        """Team member evaluates peer with scores between 1 and 5."""
        proof = ProofOfWork.objects.create(
            workspace=self.workspace,
            verification_code='ENQ-2026-TEST02',
            summary='Test proof',
            content_hash='abcd1234efgh5678',
            is_verified=True
        )

        self.client.force_authenticate(user=self.contributor)
        resp = self.client.post(f'/api/v1/proofs/{proof.verification_code}/peer-review/', {
            'reviewee_id': str(self.owner.id),
            'execution_score': 5,
            'collaboration_score': 5,
            'reliability_score': 4,
            'feedback': 'Exceptional architectural direction and swift code reviews.'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PeerReview.objects.filter(proof=proof, reviewer=self.contributor, reviewee=self.owner).count(), 1)


class RealisticScenariosAndSecurityTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email='scen_owner@enquebet.com', username='scen_owner', password='Password123!')
        self.builder = User.objects.create_user(email='scen_builder@enquebet.com', username='scen_builder', password='Password123!')
        self.reviewer = User.objects.create_user(email='scen_reviewer@enquebet.com', username='scen_reviewer', password='Password123!')
        self.outsider = User.objects.create_user(email='scen_outsider@enquebet.com', username='scen_outsider', password='Password123!')

        # Project 1
        self.post1 = Post.objects.create(user=self.owner, title='Project Alpha', category='ai', view_type='public')
        self.workspace1 = Workspace.objects.create(post=self.post1)
        self.owner_member1 = TeamMembership.objects.create(workspace=self.workspace1, user=self.owner, role='owner', status='active')
        self.conv1 = Conversation.objects.create(project_id=self.post1.id, is_group=True, name='Alpha Chat')
        ConversationMember.objects.create(conversation=self.conv1, user=self.owner)

        # Project 2 (For cross-project IDOR tests)
        self.post2 = Post.objects.create(user=self.outsider, title='Project Beta', category='web', view_type='public')
        self.workspace2 = Workspace.objects.create(post=self.post2)
        self.task_beta = ProjectTask.objects.create(workspace=self.workspace2, creator=self.outsider, title='Confidential Beta Task', status='in_progress')

    def test_scenario_a_request_accept_and_workspace_access(self):
        """Scenario A: Builder requests to join, owner accepts, membership created, and workspace access granted."""
        # 1. Builder requests
        self.client.force_authenticate(user=self.builder)
        req_resp = self.client.post('/api/v1/collaboration/request/', {
            'post_id': str(self.post1.id),
            'message': 'Experienced full-stack engineer.'
        })
        self.assertEqual(req_resp.status_code, status.HTTP_201_CREATED)
        req_id = req_resp.data['id']

        # 2. Owner accepts
        self.client.force_authenticate(user=self.owner)
        accept_resp = self.client.post(f'/api/v1/collaboration/request/{req_id}/accept/')
        self.assertEqual(accept_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(TeamMembership.objects.filter(workspace=self.workspace1, user=self.builder, status='active').exists())

        # 3. Builder has verified workspace access
        self.client.force_authenticate(user=self.builder)
        tasks_resp = self.client.get(f'/api/v1/workspaces/{self.workspace1.id}/tasks/')
        self.assertEqual(tasks_resp.status_code, status.HTTP_200_OK)

    def test_scenario_b_remove_builder_revokes_access_and_reassigns_tasks(self):
        """Scenario B: Owner removes builder. Workspace access is revoked, active tasks unassigned, history intact."""
        member = TeamMembership.objects.create(workspace=self.workspace1, user=self.builder, role='contributor', status='active')
        ConversationMember.objects.create(conversation=self.conv1, user=self.builder)
        task = ProjectTask.objects.create(workspace=self.workspace1, creator=self.owner, assignee=self.builder, title='Assigned work', status='in_progress')

        # Owner removes builder with justification
        self.client.force_authenticate(user=self.owner)
        rem_resp = self.client.post(f'/api/v1/workspaces/{self.workspace1.id}/members/{member.id}/remove/', {
            'reason': 'Project scope changed'
        })
        self.assertEqual(rem_resp.status_code, status.HTTP_200_OK)

        # Access revoked
        self.client.force_authenticate(user=self.builder)
        forbidden_resp = self.client.get(f'/api/v1/workspaces/{self.workspace1.id}/tasks/')
        self.assertEqual(forbidden_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Task unassigned and moved to backlog
        task.refresh_from_db()
        self.assertIsNone(task.assignee)
        self.assertEqual(task.status, 'backlog')

        # Evicted from team chat
        self.assertFalse(ConversationMember.objects.filter(conversation=self.conv1, user=self.builder).exists())

        # Historical membership preserved
        member.refresh_from_db()
        self.assertEqual(member.status, 'removed')
        self.assertEqual(member.removal_reason, 'Project scope changed')

    def test_scenario_c_changes_requested_resubmit_and_approve(self):
        """Scenario C: Builder submits task, reviewer requests changes, builder resubmits v2, reviewer approves."""
        TeamMembership.objects.create(workspace=self.workspace1, user=self.builder, role='contributor', status='active')
        TeamMembership.objects.create(workspace=self.workspace1, user=self.reviewer, role='lead', status='active')
        task = ProjectTask.objects.create(
            workspace=self.workspace1,
            creator=self.owner,
            assignee=self.builder,
            reviewer=self.reviewer,
            title='Implement Cache Layer',
            status='in_progress'
        )

        # 1. Builder submits deliverable v1
        self.client.force_authenticate(user=self.builder)
        deliv1_resp = self.client.post(f'/api/v1/workspaces/{self.workspace1.id}/tasks/{task.id}/deliverables/', {
            'pr_url': 'https://github.com/enquebet/enquebet-mvp/pull/101',
            'description': 'Initial cache layer'
        })
        self.assertEqual(deliv1_resp.status_code, status.HTTP_201_CREATED)
        deliv1_id = deliv1_resp.data['id']
        task.refresh_from_db()
        self.assertEqual(task.status, 'in_review')

        # 2. Reviewer requests changes
        self.client.force_authenticate(user=self.reviewer)
        rev1_resp = self.client.post(f'/api/v1/workspaces/{self.workspace1.id}/tasks/{task.id}/deliverables/{deliv1_id}/review/', {
            'verdict': 'changes_requested',
            'feedback': 'Please add Redis cache invalidation tests.'
        })
        self.assertEqual(rev1_resp.status_code, status.HTTP_201_CREATED)
        task.refresh_from_db()
        self.assertEqual(task.status, 'changes_requested')

        # 3. Builder resubmits deliverable v2
        self.client.force_authenticate(user=self.builder)
        deliv2_resp = self.client.post(f'/api/v1/workspaces/{self.workspace1.id}/tasks/{task.id}/deliverables/', {
            'pr_url': 'https://github.com/enquebet/enquebet-mvp/pull/101',
            'description': 'Added Redis test coverage'
        })
        self.assertEqual(deliv2_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(deliv2_resp.data['version'], 2)
        task.refresh_from_db()
        self.assertEqual(task.status, 'in_review')

        # 4. Reviewer approves v2
        deliv2_id = deliv2_resp.data['id']
        self.client.force_authenticate(user=self.reviewer)
        rev2_resp = self.client.post(f'/api/v1/workspaces/{self.workspace1.id}/tasks/{task.id}/deliverables/{deliv2_id}/review/', {
            'verdict': 'approved',
            'feedback': 'All test suites pass. Clean work!'
        })
        self.assertEqual(rev2_resp.status_code, status.HTTP_201_CREATED)
        task.refresh_from_db()
        self.assertEqual(task.status, 'completed')
        self.assertIsNotNone(task.completed_at)

    def test_scenario_d_completion_blocked_by_incomplete_tasks(self):
        """Scenario D: Project cannot be completed while incomplete tasks exist."""
        ProjectTask.objects.create(workspace=self.workspace1, creator=self.owner, title='Unfinished Task', status='in_progress')
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/v1/workspaces/{self.workspace1.id}/complete/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('blocked', resp.data['error'])

    def test_scenario_e_completion_generates_proof_with_credits(self):
        """Scenario E: Completed project generates Proof of Work with appropriate contributor credits."""
        TeamMembership.objects.create(workspace=self.workspace1, user=self.builder, role='contributor', role_title='Lead AI Engineer', status='active')
        ProjectTask.objects.create(workspace=self.workspace1, creator=self.owner, title='Task 1', status='completed')

        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/v1/workspaces/{self.workspace1.id}/complete/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        proof = ProofOfWork.objects.get(workspace=self.workspace1)
        self.assertTrue(proof.verification_code.startswith('ENQ-'))
        self.assertEqual(len(proof.content_hash), 64)

        team = proof.metadata_snapshot['team']
        builder_credit = next((m for m in team if m['user_id'] == str(self.builder.id)), None)
        self.assertIsNotNone(builder_credit)
        self.assertEqual(builder_credit['role'], 'contributor')
        self.assertEqual(builder_credit['role_title'], 'Lead AI Engineer')

    def test_scenario_f_leave_and_rejoin_preserves_history(self):
        """Scenario F: Member leaves and later rejoins without duplicate membership rows."""
        member = TeamMembership.objects.create(workspace=self.workspace1, user=self.builder, role='contributor', status='active')
        self.client.force_authenticate(user=self.builder)
        leave_resp = self.client.post(f'/api/v1/workspaces/{self.workspace1.id}/members/leave/')
        self.assertEqual(leave_resp.status_code, status.HTTP_200_OK)
        member.refresh_from_db()
        self.assertEqual(member.status, 'left')

        # Rejoin via collaboration request acceptance
        req = CollaborationRequest.objects.create(
            post=self.post1,
            sender=self.builder,
            receiver=self.owner,
            status='pending'
        )
        self.client.force_authenticate(user=self.owner)
        accept_resp = self.client.post(f'/api/v1/collaboration/request/{req.id}/accept/')
        self.assertEqual(accept_resp.status_code, status.HTTP_200_OK)

        # Single membership row preserved and reactivated
        self.assertEqual(TeamMembership.objects.filter(workspace=self.workspace1, user=self.builder).count(), 1)
        member.refresh_from_db()
        self.assertEqual(member.status, 'active')

    def test_scenario_g_concurrent_join_requests_atomic_integrity(self):
        """Scenario G: Two concurrent accept operations on the same request maintain database integrity."""
        req = CollaborationRequest.objects.create(
            post=self.post1,
            sender=self.builder,
            receiver=self.owner,
            status='pending'
        )
        self.client.force_authenticate(user=self.owner)

        # First accept
        resp1 = self.client.post(f'/api/v1/collaboration/request/{req.id}/accept/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Second concurrent/repeated accept
        resp2 = self.client.post(f'/api/v1/collaboration/request/{req.id}/accept/')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)

        # Exactly 1 active membership for builder
        self.assertEqual(TeamMembership.objects.filter(workspace=self.workspace1, user=self.builder, status='active').count(), 1)

    def test_security_cross_project_idor_task_leak(self):
        """Security: Cross-project access using another project's task ID returns 404."""
        TeamMembership.objects.create(workspace=self.workspace1, user=self.builder, role='contributor', status='active')
        self.client.force_authenticate(user=self.builder)

        # Attempt to access Workspace 2's task through Workspace 1 endpoint
        resp = self.client.get(f'/api/v1/workspaces/{self.workspace1.id}/tasks/{self.task_beta.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        # Attempt to patch Workspace 2's task through Workspace 1 endpoint
        patch_resp = self.client.patch(f'/api/v1/workspaces/{self.workspace1.id}/tasks/{self.task_beta.id}/', {
            'status': 'completed'
        })
        self.assertEqual(patch_resp.status_code, status.HTTP_404_NOT_FOUND)
        self.task_beta.refresh_from_db()
        self.assertEqual(self.task_beta.status, 'in_progress')

    def test_security_activity_log_tampering_prevented(self):
        """Security: Activity audit log cannot be modified or forged via public APIs."""
        TeamMembership.objects.create(workspace=self.workspace1, user=self.builder, role='contributor', status='active')
        self.client.force_authenticate(user=self.builder)

        # Attempting POST to activity log is rejected (Method Not Allowed)
        post_resp = self.client.post(f'/api/v1/workspaces/{self.workspace1.id}/activity/', {
            'event_type': 'forged_event',
            'description': 'Forged activity description'
        })
        self.assertEqual(post_resp.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Attempting DELETE to activity log is rejected
        del_resp = self.client.delete(f'/api/v1/workspaces/{self.workspace1.id}/activity/')
        self.assertEqual(del_resp.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_security_duplicate_peer_review_updates_instead_of_inflating(self):
        """Security: Submitting repeated peer reviews updates the record without inflating count."""
        TeamMembership.objects.create(workspace=self.workspace1, user=self.builder, role='contributor', status='active')
        proof = ProofOfWork.objects.create(
            workspace=self.workspace1,
            verification_code='ENQ-2026-IDEM01',
            summary='Idempotent proof test',
            content_hash='1234567890abcdef',
            is_verified=True
        )

        self.client.force_authenticate(user=self.builder)
        # First rating: 4 stars
        resp1 = self.client.post(f'/api/v1/proofs/{proof.verification_code}/peer-review/', {
            'reviewee_id': str(self.owner.id),
            'execution_score': 4,
            'feedback': 'First review'
        })
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        # Second rating: 5 stars (re-evaluation)
        resp2 = self.client.post(f'/api/v1/proofs/{proof.verification_code}/peer-review/', {
            'reviewee_id': str(self.owner.id),
            'execution_score': 5,
            'feedback': 'Updated review after post-launch'
        })
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

        # Exactly 1 review recorded; updated score is 5
        reviews = PeerReview.objects.filter(proof=proof, reviewer=self.builder, reviewee=self.owner)
        self.assertEqual(reviews.count(), 1)
        self.assertEqual(reviews.first().execution_score, 5)
        self.assertEqual(reviews.first().feedback, 'Updated review after post-launch')


class ReputationEngineTestCase(TestCase):
    """
    Exhaustive verification of the Builder Reputation Engine:
    - Contribution-based reputation awards
    - Anti-abuse, anti-inflation, anti-self-rating
    - Idempotent processing and concurrency safety
    - Score synchronization and public privacy protections
    """
    def setUp(self):
        self.client = APIClient()

        self.owner = User.objects.create_user(
            email='founder@enquebet.com',
            username='project_owner',
            password='Password123!',
        )
        self.builder = User.objects.create_user(
            email='contributor@enquebet.com',
            username='builder_alice',
            password='Password123!',
        )
        self.peer = User.objects.create_user(
            email='peer@enquebet.com',
            username='builder_bob',
            password='Password123!',
        )

        self.post = Post.objects.create(
            user=self.owner,
            title='Autonomous Agent Workspace',
            description='Reputation-backed builder project.',
            category='ai',
            view_type='public',
        )
        self.workspace = Workspace.objects.create(post=self.post)
        TeamMembership.objects.create(workspace=self.workspace, user=self.owner, role='owner', status='active')
        TeamMembership.objects.create(workspace=self.workspace, user=self.builder, role='contributor', status='active')
        TeamMembership.objects.create(workspace=self.workspace, user=self.peer, role='contributor', status='active')

    def test_approved_deliverable_and_task_affect_reputation_correctly(self):
        """Approved deliverables and completed tasks award verified builder reputation."""
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.builder,
            title='Build Auth Flow',
            status='in_progress',
        )
        deliverable = TaskDeliverable.objects.create(
            task=task,
            submitted_by=self.builder,
            title='Auth PR #1',
            pr_url='https://github.com/enquebet/auth/pull/1'
        )

        # Owner approves deliverable
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(
            f'/api/v1/workspaces/{self.workspace.id}/tasks/{task.id}/deliverables/{deliverable.id}/review/',
            {'verdict': 'approved', 'feedback': 'Great implementation!'}
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        # Check reputation score: 15 (deliverable) + 10 (completed task) = 25 pts
        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 25)

        # Check event records
        events = ReputationEvent.objects.filter(user=self.builder, is_revoked=False)
        self.assertEqual(events.count(), 2)
        event_types = set(events.values_list('event_type', flat=True))
        self.assertEqual(event_types, {'deliverable_approved', 'task_completed'})

    def test_unapproved_work_not_receiving_reputation_credit(self):
        """Changes requested or rejected deliverables do not award reputation points."""
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.builder,
            title='Design Database Schema',
            status='in_progress',
        )
        deliverable = TaskDeliverable.objects.create(
            task=task,
            submitted_by=self.builder,
            title='Schema Draft',
        )

        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(
            f'/api/v1/workspaces/{self.workspace.id}/tasks/{task.id}/deliverables/{deliverable.id}/review/',
            {'verdict': 'changes_requested', 'feedback': 'Add indexing to foreign keys'}
        )

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 0)
        self.assertEqual(ReputationEvent.objects.filter(user=self.builder).count(), 0)

    def test_marking_task_completed_directly_does_not_award_reputation(self):
        """Marking a task completed without an approved deliverable does NOT award reputation."""
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.builder,
            title='Quick Config Update',
            status='in_progress',
        )

        self.client.force_authenticate(user=self.builder)
        resp = self.client.patch(
            f'/api/v1/workspaces/{self.workspace.id}/tasks/{task.id}/',
            {'status': 'completed'}
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 0)
        self.assertEqual(ReputationEvent.objects.filter(user=self.builder).count(), 0)

    def test_duplicate_event_processing_idempotency(self):
        """Calling award service multiple times does not inflate reputation (idempotent)."""
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.builder,
            title='Idempotent Task',
            status='in_progress',
        )
        deliverable = TaskDeliverable.objects.create(
            task=task,
            submitted_by=self.builder,
            title='Idempotent Deliverable',
        )

        # Call award service 3 times
        ev1 = ReputationService.award_deliverable_approved(deliverable, reviewer=self.owner)
        ev2 = ReputationService.award_deliverable_approved(deliverable, reviewer=self.owner)
        ev3 = ReputationService.award_deliverable_approved(deliverable, reviewer=self.owner)

        self.assertEqual(ev1.id, ev2.id)
        self.assertEqual(ev2.id, ev3.id)

        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 15)
        self.assertEqual(ReputationEvent.objects.filter(user=self.builder).count(), 1)

    def test_unauthorized_client_reputation_modification_prohibited(self):
        """Clients cannot inject or modify their own reputation score via profile API."""
        self.client.force_authenticate(user=self.builder)
        resp = self.client.put('/api/v1/users/me/', {
            'reputation_score': 99999,
            'headline': 'Exploit Attempt'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 0)
        self.assertEqual(self.builder.headline, 'Exploit Attempt')

    def test_self_review_prevention(self):
        """Builders cannot evaluate themselves in peer review."""
        proof = ProofOfWork.objects.create(
            workspace=self.workspace,
            verification_code='ENQ-POW-SELF01',
            summary='Proof test',
            content_hash='aabbcc112233',
            is_verified=True
        )

        self.client.force_authenticate(user=self.builder)
        resp = self.client.post(f'/api/v1/proofs/{proof.verification_code}/peer-review/', {
            'reviewee_id': str(self.builder.id),
            'execution_score': 5,
            'feedback': 'I am the greatest'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot evaluate yourself', str(resp.data))

    def test_peer_review_editing_updates_points_without_duplicate_event(self):
        """Editing an existing peer review recalibrates reputation points without creating duplicate events."""
        proof = ProofOfWork.objects.create(
            workspace=self.workspace,
            verification_code='ENQ-POW-PEER01',
            summary='Peer review test',
            content_hash='feedbeef1234',
            is_verified=True
        )

        self.client.force_authenticate(user=self.peer)
        # Rating 3/3/3 = 3.0 avg -> 0 points (neutral)
        resp1 = self.client.post(f'/api/v1/proofs/{proof.verification_code}/peer-review/', {
            'reviewee_id': str(self.builder.id),
            'execution_score': 3,
            'collaboration_score': 3,
            'reliability_score': 3,
            'feedback': 'Met standard expectations.'
        })
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 0)
        self.assertEqual(ReputationEvent.objects.filter(user=self.builder).count(), 1)

        # Update to 5/5/5 = 5.0 avg -> +10 points
        resp2 = self.client.post(f'/api/v1/proofs/{proof.verification_code}/peer-review/', {
            'reviewee_id': str(self.builder.id),
            'execution_score': 5,
            'collaboration_score': 5,
            'reliability_score': 5,
            'feedback': 'Exceeded all expectations upon launch.'
        })
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 10)
        # Exactly 1 event exists
        self.assertEqual(ReputationEvent.objects.filter(user=self.builder).count(), 1)

    def test_former_members_retain_valid_historical_credit(self):
        """Leaving a workspace does not erase verified historical contribution points."""
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.builder,
            title='Core Engine',
            status='in_progress',
        )
        deliverable = TaskDeliverable.objects.create(
            task=task,
            submitted_by=self.builder,
            title='Engine v1'
        )

        self.client.force_authenticate(user=self.owner)
        self.client.post(
            f'/api/v1/workspaces/{self.workspace.id}/tasks/{task.id}/deliverables/{deliverable.id}/review/',
            {'verdict': 'approved', 'feedback': 'Approved!'}
        )

        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 25)

        # Builder leaves the workspace
        self.client.force_authenticate(user=self.builder)
        leave_resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/members/leave/')
        self.assertEqual(leave_resp.status_code, status.HTTP_200_OK)

        # Reputation score is permanently preserved
        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 25)

    def test_public_api_reputation_summary_and_privacy(self):
        """Reputation summary endpoint provides stats and breakdown without leaking private details."""
        # Award builder some verified work
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.builder,
            title='Frontend Design System',
            status='in_progress',
        )
        deliv = TaskDeliverable.objects.create(
            task=task,
            submitted_by=self.builder,
            title='UI Components'
        )
        TaskReview.objects.create(
            deliverable=deliv,
            reviewer=self.owner,
            verdict='approved',
            feedback='Clean component architecture'
        )
        ReputationService.award_deliverable_approved(deliv, reviewer=self.owner)

        # Call public reputation endpoint
        resp = self.client.get(f'/api/v1/users/{self.builder.id}/reputation/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data

        self.assertEqual(data['score'], 15)
        self.assertIn('level', data)
        self.assertIn('verified_stats', data)
        self.assertEqual(data['verified_stats']['approved_deliverables_count'], 1)
        self.assertIn('score_breakdown', data)
        self.assertEqual(data['score_breakdown']['deliverables_points'], 15)
        self.assertTrue(len(data['recent_events']) > 0)

    def test_project_completion_and_reopen_revocation(self):
        """Minting Proof of Work awards completion points; reopening workspace revokes them."""
        # Complete all workspace tasks
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.builder,
            title='Final Task',
            status='in_progress'
        )
        deliv = TaskDeliverable.objects.create(task=task, submitted_by=self.builder, title='Final PR')
        # Approve task deliverable
        self.client.force_authenticate(user=self.owner)
        self.client.post(
            f'/api/v1/workspaces/{self.workspace.id}/tasks/{task.id}/deliverables/{deliv.id}/review/',
            {'verdict': 'approved', 'feedback': 'Ready for release'}
        )

        # Mint completion
        comp_resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/complete/')

        self.assertEqual(comp_resp.status_code, status.HTTP_200_OK)

        self.owner.refresh_from_db()
        self.builder.refresh_from_db()
        # Owner got 50 points
        self.assertEqual(self.owner.reputation_score, 50)
        # Builder got 25 (deliv + task) + 35 (project contributor) = 60 points
        self.assertEqual(self.builder.reputation_score, 60)

        # Reopen workspace
        reopen_resp = self.client.post(f'/api/v1/workspaces/{self.workspace.id}/reopen/')
        self.assertEqual(reopen_resp.status_code, status.HTTP_200_OK)

        self.owner.refresh_from_db()
        self.builder.refresh_from_db()
        # Owner completion points revoked (back to 0)
        self.assertEqual(self.owner.reputation_score, 0)
        # Builder completion points revoked (back to 25 from deliv + task)
        self.assertEqual(self.builder.reputation_score, 25)

    def test_recalculate_all_for_user_integrity(self):
        """recalculate_all_for_user recalculates and synchronizes score accurately from database records."""
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.builder,
            title='Verified Work',
            status='completed',
        )
        deliv = TaskDeliverable.objects.create(
            task=task,
            submitted_by=self.builder,
            title='Verified PR'
        )
        TaskReview.objects.create(
            deliverable=deliv,
            reviewer=self.owner,
            verdict='approved',
            feedback='Approved'
        )

        # Reset builder score to 0 manually
        User.objects.filter(id=self.builder.id).update(reputation_score=0)
        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 0)

        # Recalculate
        recalc_score = ReputationService.recalculate_all_for_user(self.builder)
        self.assertEqual(recalc_score, 25)

        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 25)

    def test_unauthorized_user_cannot_trigger_recalculation_for_others(self):
        """Security: Non-staff users cannot trigger reputation recalculation for another builder."""
        self.client.force_authenticate(user=self.peer)
        resp = self.client.post(f'/api/v1/users/{self.builder.id}/reputation/recalculate/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('only trigger recalculation for your own', str(resp.data))

    def test_project_reopen_and_recomplete_lifecycle(self):
        """Project lifecycle: Reopening revokes points; re-completing restores points without inflation."""
        task = ProjectTask.objects.create(
            workspace=self.workspace,
            creator=self.owner,
            assignee=self.builder,
            title='Feature Release',
            status='in_progress',
        )
        deliv = TaskDeliverable.objects.create(task=task, submitted_by=self.builder, title='Feature PR')
        self.client.force_authenticate(user=self.owner)
        self.client.post(
            f'/api/v1/workspaces/{self.workspace.id}/tasks/{task.id}/deliverables/{deliv.id}/review/',
            {'verdict': 'approved', 'feedback': 'LGTM'}
        )

        # 1. Complete project
        self.client.post(f'/api/v1/workspaces/{self.workspace.id}/complete/')
        self.owner.refresh_from_db()
        self.builder.refresh_from_db()
        self.assertEqual(self.owner.reputation_score, 50)
        self.assertEqual(self.builder.reputation_score, 60)

        # 2. Reopen project
        self.client.post(f'/api/v1/workspaces/{self.workspace.id}/reopen/')
        self.owner.refresh_from_db()
        self.builder.refresh_from_db()
        self.assertEqual(self.owner.reputation_score, 0)
        self.assertEqual(self.builder.reputation_score, 25)

        # 3. Re-complete project
        self.client.post(f'/api/v1/workspaces/{self.workspace.id}/complete/')
        self.owner.refresh_from_db()
        self.builder.refresh_from_db()
        # Restored points without inflation or duplication
        self.assertEqual(self.owner.reputation_score, 50)
        self.assertEqual(self.builder.reputation_score, 60)


class CompleteBuilderJourneyIntegrationTestCase(TestCase):
    """
    End-to-end integration test validating the entire 14-step Builder Journey:
    1. Register builders.
    2. Create a project.
    3. Submit & approve collaboration request.
    4. Create and assign tasks.
    5. Submit a deliverable.
    6. Request changes and resubmit.
    7. Approve the deliverable.
    8. Verify reputation events and score changes.
    9. Complete all required tasks.
    10. Complete the project and generate Proof of Work.
    11. Verify contributor credits and reputation.
    12. Leave/remove member and verify access revocation.
    13. Rejoin where permitted and verify historical contributions.
    14. Confirm unauthorized users cannot access private workspace information.
    """
    def setUp(self):
        self.client = APIClient()

        # Step 1: Register two or more builders
        self.founder = User.objects.create_user(
            email='founder_dan@enquebet.com',
            username='founder_dan',
            password='Password123!',
            full_name='Dan Founder'
        )
        self.builder = User.objects.create_user(
            email='builder_alice@enquebet.com',
            username='builder_alice',
            password='Password123!',
            full_name='Alice Builder'
        )
        self.stranger = User.objects.create_user(
            email='stranger_eve@enquebet.com',
            username='stranger_eve',
            password='Password123!',
            full_name='Eve Stranger'
        )

    def test_complete_fourteen_step_builder_journey(self):
        # Step 2: Create a project
        self.client.force_authenticate(user=self.founder)
        create_post_resp = self.client.post('/api/v1/posts/create/', {
            'title': 'AI Coding Agent Framework',
            'description': 'A modular distributed agent architecture for software engineering.',
            'category': 'ai',
            'view_type': 'public'
        })
        self.assertEqual(create_post_resp.status_code, status.HTTP_201_CREATED)
        post_id = create_post_resp.data['id']
        post = Post.objects.get(id=post_id)

        # Step 3: Submit and approve a collaboration request
        self.client.force_authenticate(user=self.builder)
        req_resp = self.client.post('/api/v1/collaboration/request/', {
            'post_id': str(post.id),
            'message': 'I have extensive experience building AST parsers and task graphs.'
        })
        self.assertEqual(req_resp.status_code, status.HTTP_201_CREATED)
        request_id = req_resp.data['id']

        # Founder approves request
        self.client.force_authenticate(user=self.founder)
        accept_resp = self.client.post(f'/api/v1/collaboration/request/{request_id}/accept/')
        self.assertEqual(accept_resp.status_code, status.HTTP_200_OK)
        workspace = Workspace.objects.get(post=post)
        self.assertTrue(TeamMembership.objects.filter(workspace=workspace, user=self.builder, status='active').exists())
        self.assertTrue(ConversationMember.objects.filter(conversation__project_id=post.id, user=self.builder).exists())

        # Step 4: Create and assign tasks
        task_resp = self.client.post(f'/api/v1/workspaces/{workspace.id}/tasks/', {
            'title': 'Implement AST Parser',
            'description': 'Construct tree representation for agent code execution.',
            'assignee_id': str(self.builder.id),
            'priority': 'high'
        })
        self.assertEqual(task_resp.status_code, status.HTTP_201_CREATED)
        task_id = task_resp.data['id']
        task = ProjectTask.objects.get(id=task_id)
        self.assertEqual(task.status, 'assigned')
        self.assertEqual(task.assignee, self.builder)

        # Step 5: Submit a deliverable
        self.client.force_authenticate(user=self.builder)
        deliv1_resp = self.client.post(f'/api/v1/workspaces/{workspace.id}/tasks/{task.id}/deliverables/', {
            'title': 'Parser Implementation PR #1',
            'pr_url': 'https://github.com/enquebet/parser/pull/1',
            'description': 'Initial grammar implementation and test suite.'
        })
        self.assertEqual(deliv1_resp.status_code, status.HTTP_201_CREATED)
        deliv1_id = deliv1_resp.data['id']
        task.refresh_from_db()
        self.assertEqual(task.status, 'in_review')

        # Step 6: Request changes and resubmit
        self.client.force_authenticate(user=self.founder)
        review1_resp = self.client.post(
            f'/api/v1/workspaces/{workspace.id}/tasks/{task.id}/deliverables/{deliv1_id}/review/',
            {'verdict': 'changes_requested', 'feedback': 'Handle syntax errors gracefully instead of crashing.'}
        )
        self.assertEqual(review1_resp.status_code, status.HTTP_201_CREATED)
        task.refresh_from_db()
        self.assertEqual(task.status, 'changes_requested')

        # Builder resubmits v2 deliverable
        self.client.force_authenticate(user=self.builder)
        deliv2_resp = self.client.post(f'/api/v1/workspaces/{workspace.id}/tasks/{task.id}/deliverables/', {
            'title': 'Parser Implementation PR #2 (Fixed)',
            'pr_url': 'https://github.com/enquebet/parser/pull/2',
            'description': 'Added error recovery handler and unit tests for edge cases.'
        })
        self.assertEqual(deliv2_resp.status_code, status.HTTP_201_CREATED)
        deliv2_id = deliv2_resp.data['id']
        task.refresh_from_db()
        self.assertEqual(task.status, 'in_review')

        # Step 7: Approve the deliverable
        self.client.force_authenticate(user=self.founder)
        review2_resp = self.client.post(
            f'/api/v1/workspaces/{workspace.id}/tasks/{task.id}/deliverables/{deliv2_id}/review/',
            {'verdict': 'approved', 'feedback': 'Excellent error recovery! LGTM.'}
        )
        self.assertEqual(review2_resp.status_code, status.HTTP_201_CREATED)
        task.refresh_from_db()
        self.assertEqual(task.status, 'completed')
        self.assertIsNotNone(task.completed_at)

        # Step 8: Verify reputation events and score changes
        self.builder.refresh_from_db()
        # +15 for approved deliverable, +10 for task completed = 25 pts
        self.assertEqual(self.builder.reputation_score, 25)
        builder_events = ReputationEvent.objects.filter(user=self.builder, is_revoked=False)
        self.assertEqual(builder_events.count(), 2)

        # Step 9: Complete all required tasks
        active_tasks = workspace.tasks.exclude(status='cancelled')
        incomplete_tasks = active_tasks.exclude(status='completed')
        self.assertEqual(incomplete_tasks.count(), 0)

        # Step 10: Complete the project and generate Proof of Work
        comp_resp = self.client.post(f'/api/v1/workspaces/{workspace.id}/complete/')
        self.assertEqual(comp_resp.status_code, status.HTTP_200_OK)
        workspace.refresh_from_db()
        self.assertEqual(workspace.status, 'completed')
        proof = ProofOfWork.objects.get(workspace=workspace)
        self.assertTrue(proof.is_verified)
        self.assertTrue(proof.is_tamper_free)

        # Step 11: Verify contributor credits and reputation
        self.founder.refresh_from_db()
        self.builder.refresh_from_db()
        self.stranger.refresh_from_db()
        # Founder gets 50 lead points
        self.assertEqual(self.founder.reputation_score, 50)
        # Builder gets 25 (deliv + task) + 35 (project completed contributor) = 60 points
        self.assertEqual(self.builder.reputation_score, 60)
        # Stranger who didn't contribute has 0
        self.assertEqual(self.stranger.reputation_score, 0)

        # Step 12: Leave or remove a member and verify access revocation
        self.client.force_authenticate(user=self.builder)
        leave_resp = self.client.post(f'/api/v1/workspaces/{workspace.id}/members/leave/')
        self.assertEqual(leave_resp.status_code, status.HTTP_200_OK)
        membership = TeamMembership.objects.get(workspace=workspace, user=self.builder)
        self.assertEqual(membership.status, 'left')
        self.assertFalse(ConversationMember.objects.filter(conversation__project_id=post.id, user=self.builder).exists())

        # Access Revocation: Builder tries to create a task in workspace -> returns 403 Forbidden
        denied_task_resp = self.client.post(f'/api/v1/workspaces/{workspace.id}/tasks/', {
            'title': 'Intruder Task Attempt'
        })
        self.assertEqual(denied_task_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Reputation remains permanently preserved despite leaving
        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 60)

        # Step 13: Rejoin where permitted and verify historical contributions
        # Builder submits rejoin request
        rejoin_req = self.client.post('/api/v1/collaboration/request/', {
            'post_id': str(post.id),
            'message': 'I would like to rejoin the team for Phase 2.'
        })
        self.assertEqual(rejoin_req.status_code, status.HTTP_201_CREATED)
        rejoin_request_id = rejoin_req.data['id']

        # Founder approves rejoin request
        self.client.force_authenticate(user=self.founder)
        rejoin_accept = self.client.post(f'/api/v1/collaboration/request/{rejoin_request_id}/accept/')
        self.assertEqual(rejoin_accept.status_code, status.HTTP_200_OK)

        membership.refresh_from_db()
        self.assertEqual(membership.status, 'active')
        self.assertIsNone(membership.left_at)
        # Historical reputation and contributions remain verified
        self.builder.refresh_from_db()
        self.assertEqual(self.builder.reputation_score, 60)

        # Step 14: Confirm that unauthorized users cannot access private workspace information
        self.client.force_authenticate(user=self.stranger)
        # Stranger tries to fetch workspace tasks
        stranger_tasks_resp = self.client.get(f'/api/v1/workspaces/{workspace.id}/tasks/')
        self.assertEqual(stranger_tasks_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Stranger tries to fetch workspace activity log
        stranger_activity_resp = self.client.get(f'/api/v1/workspaces/{workspace.id}/activity/')
        self.assertEqual(stranger_activity_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Stranger checks builder's public reputation
        rep_resp = self.client.get(f'/api/v1/users/{self.builder.id}/reputation/')
        self.assertEqual(rep_resp.status_code, status.HTTP_200_OK)
        rep_data = rep_resp.data
        self.assertEqual(rep_data['score'], 60)
        self.assertEqual(rep_data['verified_stats']['approved_deliverables_count'], 1)
        self.assertEqual(rep_data['verified_stats']['completed_tasks_count'], 1)
        self.assertEqual(rep_data['verified_stats']['completed_projects_count'], 1)




