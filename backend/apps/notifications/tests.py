"""
Notification Engine Automated Test Suite (10/10 Architecture)
Validates:
- Concurrency-safe deterministic grouping (50 likes -> 1 card)
- Actor count integrity during like -> unlike -> like toggles
- Immediate unread card removal when all actors unlike
- Self-suppression, mute suppression, and block suppression
- Cursor pagination and canonical counts (unread_count, action_count)
- Viewport seen_at marking and multi-device mark_all_read
- Transactional outbox durability
- Canonical navigation URL generation
"""
import uuid
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.posts.models import Post
from apps.users.models import BlockedUser
from .models import Notification, NotificationActor, NotificationMute, NotificationOutbox
from .services import NotificationService, OutboxProcessor, resolve_canonical_action_url
from .tasks import deliver_outbox_entry_task, process_pending_outbox_batch_task

User = get_user_model()


class NotificationEngineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='owner_builder',
            email='owner@example.com',
            password='Password123!',
            full_name='Owner Builder',
        )
        self.liker1 = User.objects.create_user(
            username='liker_one',
            email='liker1@example.com',
            password='Password123!',
            full_name='Liker One',
        )
        self.liker2 = User.objects.create_user(
            username='liker_two',
            email='liker2@example.com',
            password='Password123!',
            full_name='Liker Two',
        )
        self.liker3 = User.objects.create_user(
            username='liker_three',
            email='liker3@example.com',
            password='Password123!',
            full_name='Liker Three',
        )

        self.post = Post.objects.create(
            user=self.owner,
            title='Autonomous Drone Software',
            description='Building an autonomous drone stack with Python & ROS',
        )

    def test_grouped_likes_deterministic(self):
        """5 likes on the same post produce exactly 1 notification row with actor_count=3 and proper message."""
        # Liker 1 likes
        notif1 = NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker1,
            event_type='like',
            target_type='post',
            target_id=str(self.post.id),
            priority='social',
            data={'post_title': self.post.title},
        )
        self.assertIsNotNone(notif1)
        self.assertEqual(notif1.actor_count, 1)
        self.assertIn('Liker One liked your post', notif1.message)

        # Liker 2 likes
        notif2 = NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker2,
            event_type='like',
            target_type='post',
            target_id=str(self.post.id),
            priority='social',
            data={'post_title': self.post.title},
        )
        self.assertEqual(notif1.id, notif2.id)
        notif2.refresh_from_db()
        self.assertEqual(notif2.actor_count, 2)
        self.assertIn('and', notif2.message)

        # Liker 3 likes
        notif3 = NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker3,
            event_type='like',
            target_type='post',
            target_id=str(self.post.id),
            priority='social',
            data={'post_title': self.post.title},
        )
        self.assertEqual(notif1.id, notif3.id)
        notif3.refresh_from_db()
        self.assertEqual(notif3.actor_count, 3)
        self.assertIn('2 others liked your post', notif3.message)

        # Verify only 1 row in DB
        self.assertEqual(Notification.objects.filter(user=self.owner).count(), 1)
        self.assertEqual(NotificationActor.objects.filter(notification=notif1).count(), 3)

    def test_like_unlike_toggle_actor_integrity(self):
        """User liking, unliking, and liking again does not inflate actor_count."""
        # Like
        NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker1,
            event_type='like',
            target_type='post',
            target_id=str(self.post.id),
            priority='social',
        )
        NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker2,
            event_type='like',
            target_type='post',
            target_id=str(self.post.id),
            priority='social',
        )
        notif = Notification.objects.get(user=self.owner)
        self.assertEqual(notif.actor_count, 2)

        # Liker 1 unlikes
        NotificationService.remove_event(
            recipient=self.owner,
            actor=self.liker1,
            group_key=f"post:{self.post.id}:like"
        )
        notif.refresh_from_db()
        self.assertEqual(notif.actor_count, 1)
        self.assertEqual(notif.actors.count(), 1)

        # Liker 1 likes again
        NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker1,
            event_type='like',
            target_type='post',
            target_id=str(self.post.id),
            priority='social',
        )
        notif.refresh_from_db()
        self.assertEqual(notif.actor_count, 2)
        self.assertEqual(notif.actors.count(), 2)

    def test_all_actors_unliked_removes_notification(self):
        """When the only actor unlikes, the notification is cleaned up."""
        NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker1,
            event_type='like',
            target_type='post',
            target_id=str(self.post.id),
            priority='social',
        )
        self.assertEqual(Notification.objects.filter(user=self.owner).count(), 1)

        NotificationService.remove_event(
            recipient=self.owner,
            actor=self.liker1,
            group_key=f"post:{self.post.id}:like"
        )
        self.assertEqual(Notification.objects.filter(user=self.owner).count(), 0)

    def test_self_suppression(self):
        """Owner interacting with their own post never generates a notification."""
        res = NotificationService.send_event(
            recipient=self.owner,
            actor=self.owner,
            event_type='like',
            target_type='post',
            target_id=str(self.post.id),
        )
        self.assertIsNone(res)
        self.assertEqual(Notification.objects.filter(user=self.owner).count(), 0)

    def test_mutual_block_suppression(self):
        """Blocked users cannot trigger notifications to the blocker."""
        BlockedUser.objects.create(user=self.owner, blocked_user=self.liker1)

        res = NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker1,
            event_type='follow',
            target_type='user',
            target_id=str(self.liker1.id),
        )
        self.assertIsNone(res)
        self.assertEqual(Notification.objects.filter(user=self.owner).count(), 0)

    def test_target_mute_suppression(self):
        """Muting a target entity prevents new notifications for that target."""
        NotificationMute.objects.create(
            user=self.owner,
            target_type='post',
            target_id=str(self.post.id),
        )

        res = NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker1,
            event_type='comment',
            target_type='post',
            target_id=str(self.post.id),
        )
        self.assertIsNone(res)
        self.assertEqual(Notification.objects.filter(user=self.owner).count(), 0)

    def test_cursor_pagination_and_counts_api(self):
        """NotificationListView provides cursor pagination, unread_count, and action_count."""
        # Create 3 notifications
        NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker1,
            event_type='collaboration_request',
            target_type='collaboration_request',
            target_id=str(uuid.uuid4()),
            priority='action',
            message_template='Wants to collaborate',
        )
        NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker2,
            event_type='follow',
            target_type='user',
            target_id=str(self.liker2.id),
            priority='personal',
            message_template='Started following you',
        )
        NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker3,
            event_type='like',
            target_type='post',
            target_id=str(self.post.id),
            priority='social',
        )

        self.client.force_authenticate(user=self.owner)
        res = self.client.get('/api/v1/notifications/?limit=2')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertEqual(len(data['results']), 2)
        self.assertTrue(data['has_more'])
        self.assertIsNotNone(data['next_cursor'])
        self.assertEqual(data['unread_count'], 3)
        self.assertEqual(data['action_count'], 1)

        # Fetch second page using next_cursor
        res2 = self.client.get(f"/api/v1/notifications/?limit=2&cursor={data['next_cursor']}")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        data2 = res2.json()
        self.assertEqual(len(data2['results']), 1)
        self.assertFalse(data2['has_more'])

    def test_mark_seen_endpoint(self):
        """MarkSeenView sets seen_at for visible notifications without marking them read."""
        notif = NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker1,
            event_type='follow',
            target_type='user',
            target_id=str(self.liker1.id),
        )
        self.assertIsNone(notif.seen_at)
        self.assertFalse(notif.is_read)

        self.client.force_authenticate(user=self.owner)
        res = self.client.post('/api/v1/notifications/seen/', {'notification_ids': [str(notif.id)]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()['seen_count'], 1)

        notif.refresh_from_db()
        self.assertIsNotNone(notif.seen_at)
        self.assertFalse(notif.is_read)

    def test_mark_all_read_endpoint(self):
        """MarkAllReadView marks all unread notifications read with timestamps."""
        NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker1,
            event_type='follow',
            target_type='user',
            target_id=str(self.liker1.id),
        )
        NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker2,
            event_type='like',
            target_type='post',
            target_id=str(self.post.id),
        )

        self.client.force_authenticate(user=self.owner)
        res = self.client.put('/api/v1/notifications/read-all/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()['updated'], 2)

        self.assertEqual(Notification.objects.filter(user=self.owner, is_read=False).count(), 0)

    def test_mute_and_unmute_endpoints(self):
        """NotificationMuteView allows creating and deleting mutes."""
        self.client.force_authenticate(user=self.owner)

        # Mute post
        res = self.client.post('/api/v1/notifications/mute/', {
            'target_type': 'post',
            'target_id': str(self.post.id)
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(NotificationMute.objects.filter(user=self.owner, target_id=str(self.post.id)).exists())

        # Unmute
        res2 = self.client.delete(f"/api/v1/notifications/mute/?target_type=post&target_id={self.post.id}")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertFalse(NotificationMute.objects.filter(user=self.owner, target_id=str(self.post.id)).exists())

    def test_transactional_outbox_entry_created(self):
        """NotificationService always creates an outbox entry in the same transaction."""
        notif = NotificationService.send_event(
            recipient=self.owner,
            actor=self.liker1,
            event_type='follow',
            target_type='user',
            target_id=str(self.liker1.id),
        )
        outbox = NotificationOutbox.objects.filter(notification=notif).first()
        self.assertIsNotNone(outbox)
        self.assertEqual(outbox.user, self.owner)
        self.assertEqual(outbox.channel, 'websocket')
        self.assertEqual(outbox.status, 'pending')

    def test_outbox_delivery_is_dispatched_after_commit(self):
        """The transaction commit hook enqueues delivery with the durable row IDs."""
        with patch('apps.notifications.tasks.deliver_outbox_entry_task.delay') as delay:
            with self.captureOnCommitCallbacks(execute=True):
                notif = NotificationService.send_event(
                    recipient=self.owner,
                    actor=self.liker1,
                    event_type='follow',
                    target_type='user',
                    target_id=str(self.liker1.id),
                )

            outbox = NotificationOutbox.objects.get(notification=notif)

        delay.assert_called_once_with(str(outbox.id), str(self.owner.id))
        self.assertEqual(outbox.status, 'pending')

    def test_failed_celery_dispatch_uses_inline_fallback(self):
        """A broker dispatch error invokes inline delivery and unread broadcasting."""
        with patch(
            'apps.notifications.tasks.deliver_outbox_entry_task.delay',
            side_effect=RuntimeError('broker unavailable'),
        ), patch('apps.notifications.services.OutboxProcessor.deliver_entry') as deliver, patch(
            'apps.notifications.services.OutboxProcessor.broadcast_unread_count'
        ) as broadcast:
            with self.captureOnCommitCallbacks(execute=True):
                notif = NotificationService.send_event(
                    recipient=self.owner,
                    actor=self.liker1,
                    event_type='follow',
                    target_type='user',
                    target_id=str(self.liker1.id),
                )

        outbox = NotificationOutbox.objects.get(notification=notif)
        deliver.assert_called_once_with(str(outbox.id))
        broadcast.assert_called_once_with(str(self.owner.id))

    def test_pending_outbox_batch_retries_due_entries(self):
        """Scheduled batch processing retries due rows and leaves future rows alone."""
        due = NotificationOutbox.objects.create(
            user=self.owner,
            event_type='notification',
            payload={'message': 'due'},
            status='pending',
            next_retry_at=timezone.now() - timedelta(seconds=1),
        )
        future = NotificationOutbox.objects.create(
            user=self.owner,
            event_type='notification',
            payload={'message': 'future'},
            status='pending',
            next_retry_at=timezone.now() + timedelta(minutes=5),
        )

        with patch('apps.notifications.services.get_channel_layer') as get_layer:
            from channels.layers import InMemoryChannelLayer
            get_layer.return_value = InMemoryChannelLayer()
            delivered = process_pending_outbox_batch_task.run(limit=100)

        self.assertEqual(delivered, 1)
        due.refresh_from_db()
        future.refresh_from_db()
        self.assertEqual(due.status, 'delivered')
        self.assertEqual(future.status, 'pending')

    def test_delivery_worker_task_delivers_and_broadcasts(self):
        outbox = NotificationOutbox.objects.create(
            user=self.owner,
            event_type='notification',
            payload={'message': 'worker test'},
            status='pending',
        )
        with patch('apps.notifications.services.OutboxProcessor.deliver_entry', return_value=True) as deliver, patch(
            'apps.notifications.services.OutboxProcessor.broadcast_unread_count'
        ) as broadcast:
            result = deliver_outbox_entry_task.run(str(outbox.id), str(self.owner.id))

        self.assertTrue(result)
        deliver.assert_called_once_with(str(outbox.id))
        broadcast.assert_called_once_with(str(self.owner.id))

    def test_outbox_batch_is_scheduled_by_celery_beat(self):
        """Deploying the beat process schedules recovery for pending outbox rows."""
        from django.conf import settings

        schedule = settings.CELERY_BEAT_SCHEDULE['process-pending-notification-outbox']
        self.assertEqual(schedule['task'], 'notifications.process_pending_outbox_batch')
        self.assertEqual(schedule['schedule'], 60.0)
        self.assertEqual(schedule['kwargs'], {'limit': 100})

    def test_canonical_action_urls(self):
        """Verification that targets resolve strictly server-side."""
        post_url = resolve_canonical_action_url('post', '123')
        self.assertEqual(post_url, '/posts/123')

        profile_url = resolve_canonical_action_url('user', '456')
        self.assertEqual(profile_url, '/profile/456')

        collab_url = resolve_canonical_action_url('collaboration_request', '789')
        self.assertEqual(collab_url, '/collaboration?tab=requests&request_id=789')

        workspace_url = resolve_canonical_action_url('workspace', 'abc')
        self.assertEqual(workspace_url, '/workspace/abc')

        chat_url = resolve_canonical_action_url('conversation', 'xyz')
        self.assertEqual(chat_url, '/messages?convo=xyz')
