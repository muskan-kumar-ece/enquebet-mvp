"""Compare legacy-style query loading with optimized API responses.

The legacy side uses the current serializers with the older, unannotated and
unprefetched query shapes. Payload equality is checked before timings are
reported. This script measures database-backed in-process API latency; use
http_benchmark.py for real HTTP timings. Message worker latency is deliberately
not inferred here; it is covered by notification dispatch tests/integration.

The fixture is created inside a transaction and rolled back. Remote databases
require the explicit --allow-remote-db flag because this script writes fixtures.
"""
import argparse
import json
import math
import os
import statistics
import sys
import time
import uuid
from pathlib import Path
from unittest.mock import patch

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework.response import Response

from apps.chats.models import Conversation, ConversationMember, Message
from apps.chats.serializers import ConversationSerializer
from apps.chats.views import ConversationListCreateView
from apps.posts.models import Post
from apps.collaboration.models import (
    Workspace, TeamMembership, ProjectMilestone, ProjectTask,
    TaskDeliverable, TaskReview,
)
from apps.collaboration.workspace_serializers import (
    WorkspaceDetailSerializer, ProjectTaskSerializer,
)
from apps.collaboration.workspace_views import ProjectTaskListCreateView, WorkspaceDetailView

if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

User = get_user_model()
LOCAL_DATABASE_HOSTS = {'', 'localhost', '127.0.0.1', '::1'}


def percentile(values, fraction):
    """Nearest-rank percentile; p95 of small samples is intentionally the max."""
    if not values:
        raise ValueError('At least one duration is required.')
    ordered = sorted(values)
    rank = max(1, math.ceil(fraction * len(ordered)))
    return ordered[rank - 1]


def summarize(values):
    return {
        'min': min(values),
        'p50': statistics.median(values),
        'p95': percentile(values, 0.95),
        'max': max(values),
    }


def canonical_payload(payload):
    return json.dumps(payload, sort_keys=True, default=str, separators=(',', ':'))


def assert_safe_database(allow_remote):
    host = (connection.settings_dict.get('HOST') or '').strip().lower()
    engine = connection.settings_dict.get('ENGINE', '')
    is_remote = host not in LOCAL_DATABASE_HOSTS
    if is_remote and not allow_remote:
        raise RuntimeError(
            'Refusing to write benchmark fixtures to a remote database. '
            'Use a disposable benchmark database or pass --allow-remote-db intentionally.'
        )
    print(f'Database engine: {engine}; database host: {"remote" if is_remote else "local"}')


def query_count(call):
    with CaptureQueriesContext(connection) as captured:
        payload = call()
    return len(captured.captured_queries), payload


def compare_paths(label, legacy_call, optimized_call, iterations, warmups=5):
    legacy_payload = legacy_call()
    optimized_payload = optimized_call()
    if canonical_payload(legacy_payload) != canonical_payload(optimized_payload):
        raise AssertionError(f'{label}: legacy and optimized response payloads differ')

    legacy_queries, _ = query_count(legacy_call)
    optimized_queries, _ = query_count(optimized_call)

    # Warm both paths before recording; query counts are measured separately so
    # CaptureQueriesContext instrumentation does not distort elapsed times.
    for _ in range(warmups):
        legacy_call()
        optimized_call()

    legacy_times = []
    optimized_times = []
    calls = (
        (legacy_call, legacy_times),
        (optimized_call, optimized_times),
    )
    for run in range(iterations):
        ordered_calls = calls if run % 2 == 0 else tuple(reversed(calls))
        for call, durations in ordered_calls:
            started = time.perf_counter()
            call()
            durations.append((time.perf_counter() - started) * 1000)

    return {
        'label': label,
        'legacy_queries': legacy_queries,
        'optimized_queries': optimized_queries,
        'legacy': summarize(legacy_times),
        'optimized': summarize(optimized_times),
        'payload_bytes': len(canonical_payload(optimized_payload).encode('utf-8')),
    }


def run_benchmark(iterations=100, allow_remote_db=False):
    if iterations < 20:
        raise ValueError('Use at least 20 samples per path; 100 or more is recommended.')
    assert_safe_database(allow_remote_db)

    client = APIClient()
    suffix = uuid.uuid4().hex[:12]
    results = []

    with transaction.atomic():
        user = User.objects.create_user(
            email=f'benchmark-{suffix}@example.test',
            username=f'benchmark-{suffix}',
            password=uuid.uuid4().hex,
            full_name='Benchmark User',
        )
        peers = [
            User.objects.create_user(
                email=f'benchmark-{suffix}-{index}@example.test',
                username=f'benchmark-{suffix}-{index}',
                password=uuid.uuid4().hex,
                full_name=f'Benchmark Peer {index}',
            )
            for index in range(5)
        ]
        post = Post.objects.create(
            user=user,
            title='Benchmark Workspace',
            description='Synthetic benchmark fixture.',
            category='ai',
            view_type='project',
            location='Benchmark',
            is_remote=True,
        )
        workspace = Workspace.objects.create(post=post, status='active', max_members=10)
        TeamMembership.objects.create(workspace=workspace, user=user, role='owner', status='active')
        for peer in peers:
            TeamMembership.objects.create(workspace=workspace, user=peer, role='contributor', status='active')

        milestone = ProjectMilestone.objects.create(workspace=workspace, title='Benchmark Milestone', order=1)
        for index in range(8):
            task = ProjectTask.objects.create(
                workspace=workspace,
                title=f'Benchmark Task {index}',
                creator=user,
                assignee=peers[index % len(peers)],
                milestone=milestone,
                status='cancelled' if index == 7 else ('in_progress' if index % 2 == 0 else 'review'),
                priority='high',
            )
            if index % 2 == 1:
                deliverable = TaskDeliverable.objects.create(
                    task=task,
                    submitted_by=peers[index % len(peers)],
                    title=f'Deliverable {index}',
                    description='Synthetic deliverable.',
                )
                TaskReview.objects.create(
                    deliverable=deliverable,
                    reviewer=user,
                    verdict='approved',
                    feedback='Benchmark review.',
                )

        conversations = []
        for index in range(10):
            conversation = Conversation.objects.create(
                name=f'Benchmark Conversation {index}',
                is_group=True,
                project_id=post.id if index == 0 else None,
            )
            ConversationMember.objects.create(conversation=conversation, user=user)
            peer = peers[index % len(peers)]
            ConversationMember.objects.create(conversation=conversation, user=peer)
            for message_index in range(5):
                Message.objects.create(
                    conversation=conversation,
                    sender=peer if message_index % 2 == 0 else user,
                    content=f'Benchmark message {message_index}',
                )
            conversations.append(conversation)

        client.force_authenticate(user=user)
        def legacy_chat_list():
            def legacy_get_queryset(view):
                return Conversation.objects.filter(
                    members__user=view.request.user
                ).distinct().order_by('-updated_at')

            def legacy_list(view, request, *args, **kwargs):
                queryset = view.filter_queryset(view.get_queryset())
                serializer = ConversationSerializer(
                    queryset, many=True, context={'request': request}
                )
                return Response(serializer.data)

            with patch.object(ConversationListCreateView, 'get_queryset', legacy_get_queryset), patch.object(
                ConversationListCreateView, 'list', legacy_list
            ):
                response = client.get('/api/v1/chats/conversations/')
            if response.status_code != 200:
                raise RuntimeError(f'Legacy chat list returned HTTP {response.status_code}')
            return response.data

        def optimized_chat_list():
            response = client.get('/api/v1/chats/conversations/')
            if response.status_code != 200:
                raise RuntimeError(f'Chat list returned HTTP {response.status_code}')
            return response.data

        results.append(compare_paths(
            'Chat list', legacy_chat_list, optimized_chat_list, iterations
        ))

        def legacy_tasks_list():
            def legacy_get(view, request, workspace_id):
                instance = view.get_workspace()
                serializer = ProjectTaskSerializer(
                    instance.tasks.all(), many=True, context={'request': request}
                )
                return Response(serializer.data)

            with patch.object(ProjectTaskListCreateView, 'get', legacy_get):
                response = client.get(f'/api/v1/workspaces/{workspace.id}/tasks/')
            if response.status_code != 200:
                raise RuntimeError(f'Legacy task list returned HTTP {response.status_code}')
            return response.data

        def optimized_tasks_list():
            response = client.get(f'/api/v1/workspaces/{workspace.id}/tasks/')
            if response.status_code != 200:
                raise RuntimeError(f'Task list returned HTTP {response.status_code}')
            return response.data

        results.append(compare_paths(
            'Workspace task list', legacy_tasks_list, optimized_tasks_list, iterations
        ))

        def legacy_workspace_detail():
            def legacy_get(view, request, workspace_id):
                instance = Workspace.objects.select_related('post', 'post__user').get(pk=workspace_id)
                serializer = WorkspaceDetailSerializer(instance, context={'request': request})
                return Response(serializer.data)

            with patch.object(WorkspaceDetailView, 'get', legacy_get):
                response = client.get(f'/api/v1/workspaces/{workspace.id}/')
            if response.status_code != 200:
                raise RuntimeError(f'Legacy workspace detail returned HTTP {response.status_code}')
            return response.data

        def optimized_workspace_detail():
            response = client.get(f'/api/v1/workspaces/{workspace.id}/')
            if response.status_code != 200:
                raise RuntimeError(f'Workspace detail returned HTTP {response.status_code}')
            return response.data

        results.append(compare_paths(
            'Workspace detail', legacy_workspace_detail,
            optimized_workspace_detail, iterations,
        ))

        # All fixture and API GET writes are rolled back after the measurements.
        transaction.set_rollback(True)

    print(f'\nDatabase-backed in-process benchmark: {iterations} samples per path; 5 warmups.')
    print('Payload equality: verified for every legacy/optimized pair.')
    print('Message delivery latency: not measured here; use the Celery integration tests.')
    print(f'{"Endpoint":<24} | {"Queries old/new":<16} | {"p50 old/new ms":<23} | {"p95 old/new ms":<23} | Payload')
    print('-' * 112)
    for result in results:
        old = result['legacy']
        new = result['optimized']
        print(
            f"{result['label']:<24} | "
            f"{result['legacy_queries']:>4}/{result['optimized_queries']:<11} | "
            f"{old['p50']:>8.2f}/{new['p50']:<13.2f} | "
            f"{old['p95']:>8.2f}/{new['p95']:<13.2f} | "
            f"{result['payload_bytes']} bytes"
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--iterations', type=int, default=100, help='Samples per path (minimum 20; recommended 100+)')
    parser.add_argument('--allow-remote-db', action='store_true', help='Allow benchmark fixture writes inside a remote DB transaction')
    args = parser.parse_args()
    run_benchmark(iterations=args.iterations, allow_remote_db=args.allow_remote_db)


if __name__ == '__main__':
    main()
