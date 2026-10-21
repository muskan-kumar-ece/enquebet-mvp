"""Response-contract regression tests for the optimized read endpoints."""
import json
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.chats.models import Conversation, ConversationMember, Message
from apps.chats.serializers import ConversationSerializer
from apps.collaboration.models import (
    Workspace, TeamMembership, ProjectTask, TaskDeliverable, TaskReview,
)
from apps.collaboration.workspace_serializers import (
    WorkspaceDetailSerializer, ProjectTaskSerializer,
)
from apps.posts.models import Post

User = get_user_model()


def normalized(data):
    return json.dumps(data, sort_keys=True, default=str, separators=(',', ':'))


class OptimizedReadResponseContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='response_owner', email='response-owner@example.test', password='test-password'
        )
        self.peer = User.objects.create_user(
            username='response_peer', email='response-peer@example.test', password='test-password'
        )
        self.post = Post.objects.create(
            user=self.owner, title='Response Contract Project', category='web', view_type='project'
        )
        self.workspace = Workspace.objects.create(post=self.post, status='active')
        TeamMembership.objects.create(
            workspace=self.workspace, user=self.owner, role='owner', status='active'
        )
        TeamMembership.objects.create(
            workspace=self.workspace, user=self.peer, role='contributor', status='active'
        )
        self.active_task = ProjectTask.objects.create(
            workspace=self.workspace, creator=self.owner, assignee=self.peer,
            title='Active task', status='backlog',
        )
        self.cancelled_task = ProjectTask.objects.create(
            workspace=self.workspace, creator=self.owner,
            title='Cancelled task', status='cancelled',
        )
        deliverable = TaskDeliverable.objects.create(
            task=self.active_task, submitted_by=self.peer, title='Patch', description='Reviewable change'
        )
        TaskReview.objects.create(
            deliverable=deliverable, reviewer=self.owner, verdict='approved', feedback='Looks good'
        )

        self.conversation = Conversation.objects.create(name='Response test', is_group=True)
        ConversationMember.objects.create(conversation=self.conversation, user=self.owner)
        ConversationMember.objects.create(conversation=self.conversation, user=self.peer)
        Message.objects.create(conversation=self.conversation, sender=self.peer, content='Newest inbound')
        Message.objects.create(conversation=self.conversation, sender=self.owner, content='My reply')
        self.client.force_authenticate(user=self.owner)
        self.serializer_request = SimpleNamespace(user=self.owner)

    def test_chat_list_matches_unannotated_serializer_response(self):
        legacy_queryset = Conversation.objects.filter(
            members__user=self.owner
        ).distinct().order_by('-updated_at')
        legacy_payload = ConversationSerializer(
            legacy_queryset, many=True, context={'request': self.serializer_request}
        ).data

        response = self.client.get('/api/v1/chats/conversations/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(normalized(response.data), normalized(legacy_payload))

    def test_task_list_matches_unprefetched_serializer_response(self):
        legacy_payload = ProjectTaskSerializer(
            self.workspace.tasks.all(), many=True, context={'request': self.serializer_request}
        ).data

        response = self.client.get(f'/api/v1/workspaces/{self.workspace.id}/tasks/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(normalized(response.data), normalized(legacy_payload))

    def test_workspace_detail_matches_unannotated_serializer_response(self):
        legacy_workspace = Workspace.objects.get(pk=self.workspace.pk)
        legacy_payload = WorkspaceDetailSerializer(
            legacy_workspace, context={'request': self.serializer_request}
        ).data

        response = self.client.get(f'/api/v1/workspaces/{self.workspace.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(normalized(response.data), normalized(legacy_payload))
        self.assertEqual(response.data['tasks_count'], 1)

    def test_message_api_dispatches_outbox_after_commit(self):
        with patch('apps.notifications.tasks.deliver_outbox_entry_task.delay') as delay:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    f'/api/v1/chats/conversations/{self.conversation.id}/messages/',
                    {'content': 'Committed message'},
                    format='json',
                )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(delay.call_count, 1)
        args = delay.call_args.args
        self.assertTrue(args[0])
        self.assertEqual(args[1], str(self.peer.id))
