"""Deprecated one-shot endpoint profiler.

This script measures only the current optimized paths once; it does not collect
a baseline or percentiles. Use rigorous_benchmark.py for equivalent
serializer-response comparisons and http_benchmark.py for real HTTP timings.
"""
import os
import sys
import time
from pathlib import Path

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')


from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.chats.models import Conversation, ConversationMember, Message
from apps.posts.models import Post
from apps.collaboration.models import (
    Workspace, TeamMembership, ProjectTask, TaskDeliverable, TaskReview, ProjectMilestone
)

User = get_user_model()


def run_benchmark():
    if (connection.settings_dict.get('HOST') or '').strip().lower() not in {'', 'localhost', '127.0.0.1', '::1'}:
        raise RuntimeError('This legacy script refuses remote database writes; use the guarded rigorous_benchmark.py instead.')

    print("=" * 70)
    print("ENQUEbet One-shot Optimized Endpoint Snapshot (not a baseline)")
    print("=" * 70)

    client = APIClient()

    # Use a rollback transaction so we leave the database clean
    with transaction.atomic():
        # 1. Create primary test user and secondary users
        test_suffix = str(int(time.time()))
        main_user = User.objects.create_user(
            email=f'perf_main_{test_suffix}@test.com',
            username=f'perf_main_{test_suffix}',
            password='password123',
            full_name='Performance Tester'
        )
        peer_users = [
            User.objects.create_user(
                email=f'perf_peer_{i}_{test_suffix}@test.com',
                username=f'perf_peer_{i}_{test_suffix}',
                password='password123',
                full_name=f'Peer Builder {i}'
            )
            for i in range(5)
        ]

        # 2. Create sample project post and workspace
        post = Post.objects.create(
            user=main_user,
            title='Autonomous Agent Workspace',
            description='A collaborative high-throughput platform for distributed teams.',
            category='ai',
            view_type='project',
            location='San Francisco, CA',
            is_remote=True
        )

        workspace = Workspace.objects.create(
            post=post,
            status='active',
            max_members=10,
            progress_percentage=45
        )

        # Add memberships
        for peer in peer_users:
            TeamMembership.objects.create(
                workspace=workspace,
                user=peer,
                role='contributor',
                status='active'
            )

        # Add milestones
        milestone = ProjectMilestone.objects.create(
            workspace=workspace,
            title='Core Engine V1',
            order=1,
            status='open'
        )

        # Add tasks with deliverables and reviews
        for t_idx in range(8):
            task = ProjectTask.objects.create(
                workspace=workspace,
                title=f'Performance Task {t_idx}',
                description=f'Deep optimization task number {t_idx}',
                creator=main_user,
                assignee=peer_users[t_idx % len(peer_users)],
                milestone=milestone,
                status='in_progress' if t_idx % 2 == 0 else 'review',
                priority='high'
            )
            if t_idx % 2 == 1:
                deliv = TaskDeliverable.objects.create(
                    task=task,
                    submitted_by=peer_users[t_idx % len(peer_users)],
                    title=f'Deliverable for task {t_idx}',
                    description='Implementation code and tests'
                )
                TaskReview.objects.create(
                    deliverable=deliv,
                    reviewer=main_user,
                    verdict='approved',
                    feedback='Solid implementation.'
                )

        # 3. Create 10 conversations for main_user
        conversations = []
        for c_idx in range(10):
            convo = Conversation.objects.create(
                name=f'Team Discussion {c_idx}' if c_idx % 2 == 0 else '',
                is_group=(c_idx % 2 == 0),
                project_id=post.id if c_idx == 0 else None
            )
            ConversationMember.objects.create(conversation=convo, user=main_user)
            partner = peer_users[c_idx % len(peer_users)]
            ConversationMember.objects.create(conversation=convo, user=partner)

            # Add messages
            for m_idx in range(5):
                Message.objects.create(
                    conversation=convo,
                    sender=partner if m_idx % 2 == 0 else main_user,
                    content=f'Message {m_idx} in convo {c_idx}'
                )
            conversations.append(convo)

        client.force_authenticate(user=main_user)

        # --- Benchmark 1: GET /api/v1/chats/conversations/ ---
        print("\n[1] Benchmarking GET /api/v1/chats/conversations/ ...")
        with CaptureQueriesContext(connection) as ctx:
            start_t = time.perf_counter()
            resp1 = client.get('/api/v1/chats/conversations/')
            dur1 = (time.perf_counter() - start_t) * 1000

        q_count1 = len(ctx.captured_queries)
        print(f"Status: {resp1.status_code} | Queries: {q_count1} | Duration: {dur1:.2f} ms | Items: {len(resp1.data if isinstance(resp1.data, list) else resp1.data.get('results', []))}")

        # --- Benchmark 2: GET /api/v1/workspaces/:id/ ---
        print(f"\n[2] Benchmarking GET /api/v1/workspaces/{workspace.id}/ ...")
        with CaptureQueriesContext(connection) as ctx:
            start_t = time.perf_counter()
            resp2 = client.get(f'/api/v1/workspaces/{workspace.id}/')
            dur2 = (time.perf_counter() - start_t) * 1000

        q_count2 = len(ctx.captured_queries)
        print(f"Status: {resp2.status_code} | Queries: {q_count2} | Duration: {dur2:.2f} ms")

        # --- Benchmark 3: GET /api/v1/workspaces/:id/tasks/ ---
        print(f"\n[3] Benchmarking GET /api/v1/workspaces/{workspace.id}/tasks/ ...")
        with CaptureQueriesContext(connection) as ctx:
            start_t = time.perf_counter()
            resp3 = client.get(f'/api/v1/workspaces/{workspace.id}/tasks/')
            dur3 = (time.perf_counter() - start_t) * 1000

        q_count3 = len(ctx.captured_queries)
        print(f"Status: {resp3.status_code} | Queries: {q_count3} | Duration: {dur3:.2f} ms | Tasks: {len(resp3.data if isinstance(resp3.data, list) else resp3.data.get('results', []))}")


        # --- Benchmark 4: POST /api/v1/chats/conversations/:id/messages/ ---
        test_convo = conversations[0]
        print(f"\n[4] Benchmarking POST /api/v1/chats/conversations/{test_convo.id}/messages/ ...")
        with CaptureQueriesContext(connection) as ctx:
            start_t = time.perf_counter()
            resp4 = client.post(
                f'/api/v1/chats/conversations/{test_convo.id}/messages/',
                {'content': 'Benchmark test message content'}
            )
            dur4 = (time.perf_counter() - start_t) * 1000

        q_count4 = len(ctx.captured_queries)
        print(f"Status: {resp4.status_code} | Queries: {q_count4} | Duration: {dur4:.2f} ms")

        print("\n" + "=" * 70)
        print("SUMMARY TABLE (SINGLE OPTIMIZED RUN; NOT A BASELINE):")
        print("=" * 70)
        print(f"| Endpoint                                          | SQL Queries | Latency (ms) |")
        print(f"|:--------------------------------------------------|:------------|:-------------|")
        print(f"| GET /api/v1/chats/conversations/ (10 convos)      | {q_count1:<11} | {dur1:>10.2f} ms |")
        print(f"| GET /api/v1/collaboration/workspaces/:id/         | {q_count2:<11} | {dur2:>10.2f} ms |")
        print(f"| GET /api/v1/collaboration/workspaces/:id/tasks/   | {q_count3:<11} | {dur3:>10.2f} ms |")
        print(f"| POST /api/v1/chats/conversations/:id/messages/   | {q_count4:<11} | {dur4:>10.2f} ms |")
        print("=" * 70)

        # Rollback all test data
        transaction.set_rollback(True)


if __name__ == '__main__':
    run_benchmark()
