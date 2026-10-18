"""
Comprehensive Test Suite for Messaging & Real-Time Chat System.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.chats.models import Conversation, ConversationMember, Message
from apps.posts.models import Post

User = get_user_model()


class ChatsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user1 = User.objects.create_user(
            email='alice@test.com',
            username='alice_dev',
            full_name='Alice Architect',
            password='testpassword123',
        )

        self.user2 = User.objects.create_user(
            email='bob@test.com',
            username='bob_builder',
            full_name='Bob Builder',
            password='testpassword123',
        )

        self.user3 = User.objects.create_user(
            email='charlie@test.com',
            username='charlie_hacker',
            full_name='Charlie Hacker',
            password='testpassword123',
        )

    def _get_results(self, resp):
        if isinstance(resp.data, dict) and 'results' in resp.data:
            return resp.data['results']
        return resp.data

    def test_list_conversations_empty(self):
        """Unconnected user gets empty list of conversations."""
        self.client.force_authenticate(user=self.user1)
        resp = self.client.get('/api/v1/chats/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._get_results(resp)), 0)

    def test_start_dm_success(self):
        """User starts DM with another user -> creates conversation."""
        self.client.force_authenticate(user=self.user1)
        resp = self.client.post('/api/v1/chats/dm/', {'user_id': str(self.user2.id)})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('conversation_id', resp.data)

        convo_id = resp.data['conversation_id']
        convo = Conversation.objects.get(id=convo_id)
        self.assertFalse(convo.is_group)
        self.assertEqual(convo.members.count(), 2)

    def test_start_dm_idempotent(self):
        """Calling DM start multiple times returns the same conversation without duplicate creation."""
        self.client.force_authenticate(user=self.user1)
        resp1 = self.client.post('/api/v1/chats/dm/', {'user_id': str(self.user2.id)})
        convo_id_1 = resp1.data['conversation_id']

        resp2 = self.client.post('/api/v1/chats/dm/', {'user_id': str(self.user2.id)})
        convo_id_2 = resp2.data['conversation_id']

        self.assertEqual(convo_id_1, convo_id_2)
        self.assertEqual(Conversation.objects.count(), 1)

    def test_cannot_message_self(self):
        """User cannot start a DM with themselves."""
        self.client.force_authenticate(user=self.user1)
        resp = self.client.post('/api/v1/chats/dm/', {'user_id': str(self.user1.id)})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_send_and_list_messages(self):
        """Sending and retrieving messages in conversation."""
        # Create DM
        self.client.force_authenticate(user=self.user1)
        dm_resp = self.client.post('/api/v1/chats/dm/', {'user_id': str(self.user2.id)})
        convo_id = dm_resp.data['conversation_id']

        # Send message
        send_resp = self.client.post(
            f'/api/v1/chats/{convo_id}/messages/',
            {'content': 'Hey Bob, welcome to the project!'}
        )
        self.assertEqual(send_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(send_resp.data['content'], 'Hey Bob, welcome to the project!')

        # List messages as Alice (is_me = True)
        list_resp_alice = self.client.get(f'/api/v1/chats/{convo_id}/messages/')
        self.assertEqual(list_resp_alice.status_code, status.HTTP_200_OK)
        alice_results = self._get_results(list_resp_alice)
        self.assertEqual(len(alice_results), 1)
        self.assertTrue(alice_results[0]['is_me'])

        # List messages as Bob (is_me = False)
        self.client.force_authenticate(user=self.user2)
        list_resp_bob = self.client.get(f'/api/v1/chats/{convo_id}/messages/')
        self.assertEqual(list_resp_bob.status_code, status.HTTP_200_OK)
        bob_results = self._get_results(list_resp_bob)
        self.assertEqual(len(bob_results), 1)
        self.assertFalse(bob_results[0]['is_me'])

    def test_message_keyword_search(self):
        """Searching messages within conversation by keyword."""
        self.client.force_authenticate(user=self.user1)
        dm_resp = self.client.post('/api/v1/chats/dm/', {'user_id': str(self.user2.id)})
        convo_id = dm_resp.data['conversation_id']

        self.client.post(f'/api/v1/chats/{convo_id}/messages/', {'content': 'The frontend uses Next.js 16'})
        self.client.post(f'/api/v1/chats/{convo_id}/messages/', {'content': 'The backend uses Django Channels'})

        search_resp = self.client.get(f'/api/v1/chats/{convo_id}/messages/?q=Channels')
        self.assertEqual(search_resp.status_code, status.HTTP_200_OK)
        search_results = self._get_results(search_resp)
        self.assertEqual(len(search_results), 1)
        self.assertIn('Django Channels', search_results[0]['content'])

    def test_conversation_type_filtering(self):
        """Filtering conversations by dms vs groups."""
        self.client.force_authenticate(user=self.user1)
        # DM with Bob
        self.client.post('/api/v1/chats/dm/', {'user_id': str(self.user2.id)})

        # Group conversation
        group = Conversation.objects.create(name='Sprint Team', is_group=True)
        ConversationMember.objects.create(conversation=group, user=self.user1)
        ConversationMember.objects.create(conversation=group, user=self.user2)

        # All
        all_resp = self.client.get('/api/v1/chats/')
        self.assertEqual(len(self._get_results(all_resp)), 2)

        # DMs only
        dms_resp = self.client.get('/api/v1/chats/?type=dms')
        dms_results = self._get_results(dms_resp)
        self.assertEqual(len(dms_results), 1)
        self.assertFalse(dms_results[0]['is_group'])

        # Groups only
        groups_resp = self.client.get('/api/v1/chats/?type=groups')
        groups_results = self._get_results(groups_resp)
        self.assertEqual(len(groups_results), 1)
        self.assertTrue(groups_results[0]['is_group'])

    def test_unauthorized_conversation_access(self):
        """User 3 (non-member) cannot access conversation or messages of User 1 and User 2."""
        self.client.force_authenticate(user=self.user1)
        dm_resp = self.client.post('/api/v1/chats/dm/', {'user_id': str(self.user2.id)})
        convo_id = dm_resp.data['conversation_id']

        # Charlie tries to read messages
        self.client.force_authenticate(user=self.user3)
        read_resp = self.client.get(f'/api/v1/chats/{convo_id}/messages/')
        self.assertEqual(read_resp.status_code, status.HTTP_404_NOT_FOUND)

        # Charlie tries to post message
        post_resp = self.client.post(f'/api/v1/chats/{convo_id}/messages/', {'content': 'Intruder'})
        self.assertEqual(post_resp.status_code, status.HTTP_404_NOT_FOUND)
