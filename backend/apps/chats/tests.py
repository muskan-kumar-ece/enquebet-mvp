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

    def test_ws_ticket_generation_and_single_use_consumption(self):
        """Authenticated user can request an ephemeral single-use WS ticket."""
        self.client.force_authenticate(user=self.user1)
        resp = self.client.post('/api/v1/auth/ws-ticket/')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('ticket', resp.data)
        ticket = resp.data['ticket']

        # Consume ticket via validator
        from apps.users.ws_ticket import validate_and_consume_ws_ticket
        consumed_user_id = validate_and_consume_ws_ticket(ticket)
        self.assertEqual(consumed_user_id, str(self.user1.id))

        # Second attempt must return None (single-use burned)
        second_attempt = validate_and_consume_ws_ticket(ticket)
        self.assertIsNone(second_attempt)

    def test_cursor_pagination_and_client_msg_id(self):
        """Keyset cursor pagination limits message volume and tracks client_msg_id."""
        self.client.force_authenticate(user=self.user1)
        dm_resp = self.client.post('/api/v1/chats/dm/', {'user_id': str(self.user2.id)})
        convo_id = dm_resp.data['conversation_id']

        # Send 3 messages with client_msg_id
        for i in range(3):
            self.client.post(f'/api/v1/chats/{convo_id}/messages/', {
                'content': f'Message {i}',
                'client_msg_id': f'temp-uuid-{i}',
            })

        # Query first page with limit=2
        page1 = self.client.get(f'/api/v1/chats/{convo_id}/messages/?limit=2')
        self.assertEqual(page1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(page1.data['results']), 2)
        self.assertTrue(page1.data['has_more'])
        self.assertIsNotNone(page1.data['oldest_cursor'])

        # Verify client_msg_id is preserved
        self.assertTrue(any(m['client_msg_id'].startswith('temp-uuid-') for m in page1.data['results']))

        # Query second page using cursor
        cursor = page1.data['oldest_cursor']
        page2 = self.client.get(f'/api/v1/chats/{convo_id}/messages/?limit=2&before={cursor}')
        self.assertEqual(page2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(page2.data['results']), 1)
        self.assertFalse(page2.data['has_more'])

    def test_conversation_with_user_safe_get_does_not_create(self):
        """GET /messages/conversation/{user_id} does not create ghost conversations on 404."""
        self.client.force_authenticate(user=self.user1)
        # Check DM with user2 before creation
        get_resp = self.client.get(f'/api/v1/chats/conversation/{self.user2.id}/')
        self.assertEqual(get_resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Conversation.objects.count(), 0)

        # Create DM via POST
        self.client.post('/api/v1/chats/dm/', {'user_id': str(self.user2.id)})
        self.assertEqual(Conversation.objects.count(), 1)

        # Now GET returns 200 with conversation_id
        get_resp2 = self.client.get(f'/api/v1/chats/conversation/{self.user2.id}/')
        self.assertEqual(get_resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(get_resp2.data['exists'])

