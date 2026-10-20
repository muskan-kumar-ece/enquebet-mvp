from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from apps.users.models import User, UserSkill, Follower
from apps.posts.models import Post, PostTag, PostRequirement, Like, Comment, PostReport


class FeedPhase2Tests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='alice@example.com',
            username='alice',
            password='Password123!',
            full_name='Alice Builder'
        )
        self.client.force_authenticate(user=self.user)

    def test_following_feed_membership_and_ordering(self):
        """Following feed contains posts only from followed builders, ordered newest first, excluding viewer's own posts."""
        bob = User.objects.create_user(email='bob@example.com', username='bob', password='Pass123!')
        charlie = User.objects.create_user(email='charlie@example.com', username='charlie', password='Pass123!')
        dave = User.objects.create_user(email='dave@example.com', username='dave', password='Pass123!')

        # Alice follows Bob and Charlie, but not Dave
        Follower.objects.create(follower=self.user, following=bob)
        Follower.objects.create(follower=self.user, following=charlie)

        t0 = timezone.now() - timedelta(hours=3)
        t1 = timezone.now() - timedelta(hours=2)
        t2 = timezone.now() - timedelta(hours=1)
        t3 = timezone.now()

        p1 = Post.objects.create(user=bob, title='Bob Post 1', description='Desc', category='Tech', view_type='public')
        Post.objects.filter(id=p1.id).update(created_at=t0)

        p2 = Post.objects.create(user=charlie, title='Charlie Post 1', description='Desc', category='Tech', view_type='public')
        Post.objects.filter(id=p2.id).update(created_at=t1)

        p3 = Post.objects.create(user=dave, title='Dave Post 1 (Not Followed)', description='Desc', category='Tech', view_type='public')
        Post.objects.filter(id=p3.id).update(created_at=t2)

        p_self = Post.objects.create(user=self.user, title='Alice Own Post', description='Desc', category='Tech', view_type='public')
        Post.objects.filter(id=p_self.id).update(created_at=t3)

        response = self.client.get('/api/v1/posts/feed/?mode=following')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        result_titles = [p['title'] for p in results]

        # Only Charlie and Bob's posts, with Charlie's newer post first
        self.assertEqual(result_titles, ['Charlie Post 1', 'Bob Post 1'])
        self.assertNotIn('Dave Post 1 (Not Followed)', result_titles)
        self.assertNotIn('Alice Own Post', result_titles)

    def test_following_feed_empty_when_no_follows(self):
        """Following feed handles empty state cleanly when user follows nobody."""
        response = self.client.get('/api/v1/posts/feed/?mode=following')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(results, [])

    def test_following_feed_unauthenticated_request(self):
        """Unauthenticated request to following feed raises 401."""
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/v1/posts/feed/?mode=following')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_for_you_skill_match_ranking_and_proficiency(self):
        """For You feed weights skills by proficiency: Advanced (40) > Intermediate (35) > Beginner (25) > None (0)."""
        UserSkill.objects.create(user=self.user, skill_name='Python', level='advanced')
        UserSkill.objects.create(user=self.user, skill_name='React', level='intermediate')
        UserSkill.objects.create(user=self.user, skill_name='Docker', level='beginner')

        author = User.objects.create_user(email='author@example.com', username='author', password='Pass123!')
        now = timezone.now()

        # Create posts at identical timestamps
        p_adv = Post.objects.create(user=author, title='Advanced Skill Match', description='Desc', category='Python', view_type='public')
        p_int = Post.objects.create(user=author, title='Intermediate Skill Match', description='Desc', category='Other', view_type='public')
        PostTag.objects.create(post=p_int, tag_name='React')

        p_beg = Post.objects.create(user=author, title='Beginner Skill Match', description='Desc', category='Other', view_type='public')
        PostRequirement.objects.create(post=p_beg, role_name='Docker Specialist')

        p_none = Post.objects.create(user=author, title='No Match', description='Desc', category='Culinary', view_type='public')

        for p in [p_adv, p_int, p_beg, p_none]:
            Post.objects.filter(id=p.id).update(created_at=now)

        response = self.client.get('/api/v1/posts/feed/?mode=for_you')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        result_titles = [p['title'] for p in results]
        self.assertEqual(result_titles, [
            'Advanced Skill Match',
            'Intermediate Skill Match',
            'Beginner Skill Match',
            'No Match'
        ])

    def test_for_you_location_and_college_ranking(self):
        """Location match (+25) and College match (+20) are calculated accurately."""
        self.user.location = 'Seattle'
        self.user.college = 'UW'
        self.user.save()

        author = User.objects.create_user(email='author2@example.com', username='author2', password='Pass123!')
        now = timezone.now()

        p_both = Post.objects.create(user=author, title='Both Match', description='Desc', category='General', view_type='public', location='Seattle', college='UW')
        p_loc = Post.objects.create(user=author, title='Location Match Only', description='Desc', category='General', view_type='public', location='Seattle', college='MIT')
        p_col = Post.objects.create(user=author, title='College Match Only', description='Desc', category='General', view_type='public', location='Austin', college='UW')
        p_neither = Post.objects.create(user=author, title='Neither Match', description='Desc', category='General', view_type='public', location='London', college='Oxford')

        for p in [p_both, p_loc, p_col, p_neither]:
            Post.objects.filter(id=p.id).update(created_at=now)

        response = self.client.get('/api/v1/posts/feed/?mode=for_you')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        result_titles = [p['title'] for p in results]
        self.assertEqual(result_titles, [
            'Both Match',
            'Location Match Only',
            'College Match Only',
            'Neither Match'
        ])

    def test_engagement_score_and_cap(self):
        """Engagement score counts likes (+1) and comments (+2), properly capped at 15 points."""
        author = User.objects.create_user(email='author3@example.com', username='author3', password='Pass123!')
        viewer1 = User.objects.create_user(email='v1@example.com', username='v1', password='Pass123!')
        viewer2 = User.objects.create_user(email='v2@example.com', username='v2', password='Pass123!')
        now = timezone.now()

        p_mod = Post.objects.create(user=author, title='Moderate Engagement', description='Desc', category='General', view_type='public')
        Like.objects.create(post=p_mod, user=viewer1)
        Comment.objects.create(post=p_mod, user=viewer2, content='Nice idea')  # 1 + 2 = 3

        p_high = Post.objects.create(user=author, title='High Engagement (Capped at 15)', description='Desc', category='General', view_type='public')
        for i in range(10):
            u = User.objects.create_user(email=f'user{i}@example.com', username=f'user{i}', password='Pass123!')
            Like.objects.create(post=p_high, user=u)
            Comment.objects.create(post=p_high, user=u, content=f'Comment {i}')  # 10 + 20 = 30 -> capped at 15

        p_zero = Post.objects.create(user=author, title='Zero Engagement', description='Desc', category='General', view_type='public')

        for p in [p_high, p_mod, p_zero]:
            Post.objects.filter(id=p.id).update(created_at=now)

        response = self.client.get('/api/v1/posts/feed/?mode=for_you')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        result_titles = [p['title'] for p in results]
        self.assertEqual(result_titles, [
            'High Engagement (Capped at 15)',
            'Moderate Engagement',
            'Zero Engagement'
        ])

    def test_recency_penalty_decay(self):
        """Older posts decay over time so fresh posts outrank them."""
        author = User.objects.create_user(email='author4@example.com', username='author4', password='Pass123!')

        p_fresh = Post.objects.create(user=author, title='Fresh Post', description='Desc', category='General', view_type='public')
        Post.objects.filter(id=p_fresh.id).update(created_at=timezone.now() - timedelta(hours=2))

        p_old = Post.objects.create(user=author, title='Old Post (10 days)', description='Desc', category='General', view_type='public')
        Post.objects.filter(id=p_old.id).update(created_at=timezone.now() - timedelta(days=10))

        response = self.client.get('/api/v1/posts/feed/?mode=for_you')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        result_titles = [p['title'] for p in results]
        self.assertEqual(result_titles, ['Fresh Post', 'Old Post (10 days)'])

    def test_author_diversity_penalty(self):
        """Author diversity penalty applies to repeat posts from the same author to prevent domination."""
        author_prolific = User.objects.create_user(email='prolific@example.com', username='prolific', password='Pass123!')
        author_single = User.objects.create_user(email='single@example.com', username='single', password='Pass123!')

        now = timezone.now()
        # Prolific author posts 3 posts within 1 day
        p1 = Post.objects.create(user=author_prolific, title='Prolific Post 1 (Newest)', description='Desc', category='Tech', view_type='public')
        Post.objects.filter(id=p1.id).update(created_at=now - timedelta(hours=1))

        p_single = Post.objects.create(user=author_single, title='Single Author Post', description='Desc', category='Tech', view_type='public')
        Post.objects.filter(id=p_single.id).update(created_at=now - timedelta(hours=2))

        p2 = Post.objects.create(user=author_prolific, title='Prolific Post 2 (Middle)', description='Desc', category='Tech', view_type='public')
        Post.objects.filter(id=p2.id).update(created_at=now - timedelta(hours=3))

        response = self.client.get('/api/v1/posts/feed/?mode=for_you')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        result_titles = [p['title'] for p in results]

        # Single author post should rank above prolific author's 2nd post due to diversity penalty
        self.assertEqual(result_titles, [
            'Prolific Post 1 (Newest)',
            'Single Author Post',
            'Prolific Post 2 (Middle)'
        ])

    def test_pagination_stability_and_determinism(self):
        """Pagination returns 20 items on page 1 and the remainder on page 2 with no duplicates."""
        author = User.objects.create_user(email='author_p@example.com', username='author_p', password='Pass123!')
        now = timezone.now()

        for i in range(25):
            p = Post.objects.create(
                user=author,
                title=f'Post Item {i:02d}',
                description='Desc',
                category='Tech',
                view_type='public'
            )
            Post.objects.filter(id=p.id).update(created_at=now - timedelta(minutes=25 - i))

        # Page 1
        resp1 = self.client.get('/api/v1/posts/feed/?mode=for_you&page=1')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        results1 = resp1.data.get('results')
        self.assertEqual(len(results1), 20)
        self.assertIsNotNone(resp1.data.get('next'))

        # Page 2
        resp2 = self.client.get('/api/v1/posts/feed/?mode=for_you&page=2')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        results2 = resp2.data.get('results')
        self.assertEqual(len(results2), 5)
        self.assertIsNone(resp2.data.get('next'))

        # Check disjoint sets (no duplicate items across pages)
        ids1 = {p['id'] for p in results1}
        ids2 = {p['id'] for p in results2}
        self.assertTrue(ids1.isdisjoint(ids2))

    def test_unauthenticated_for_you_feed(self):
        """Unauthenticated requests to for_you feed succeed with public posts ordered by engagement and recency."""
        self.client.force_authenticate(user=None)
        author = User.objects.create_user(email='author_pub@example.com', username='author_pub', password='Pass123!')
        Post.objects.create(user=author, title='Public Idea', description='Desc', category='Tech', view_type='public')

        response = self.client.get('/api/v1/posts/feed/?mode=for_you')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Public Idea')

    def test_private_post_visibility_rules(self):
        """Posts from private accounts are hidden unless viewer is the author or an approved follower."""
        private_user = User.objects.create_user(email='private@example.com', username='private_u', password='Pass123!', is_private=True)
        public_user = User.objects.create_user(email='public@example.com', username='public_u', password='Pass123!')

        p_priv = Post.objects.create(user=private_user, title='Private Post', description='Desc', category='Tech', view_type='public')
        p_pub = Post.objects.create(user=public_user, title='Public Post', description='Desc', category='Tech', view_type='public')

        # 1. Alice is not following private_user
        resp = self.client.get('/api/v1/posts/feed/?mode=for_you')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        titles = [p['title'] for p in resp.data.get('results', resp.data)]
        self.assertIn('Public Post', titles)
        self.assertNotIn('Private Post', titles)

        # 2. Alice follows private_user
        Follower.objects.create(follower=self.user, following=private_user)
        resp = self.client.get('/api/v1/posts/feed/?mode=for_you')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        titles = [p['title'] for p in resp.data.get('results', resp.data)]
        self.assertIn('Private Post', titles)

    def test_moderation_reported_post_exclusion(self):
        """Posts with 3 or more reports are excluded from feeds according to moderation policy."""
        author = User.objects.create_user(email='author_m@example.com', username='author_m', password='Pass123!')
        p_bad = Post.objects.create(user=author, title='Abusive Post (Reported 3x)', description='Desc', category='Tech', view_type='public')
        p_good = Post.objects.create(user=author, title='Good Post (Reported 1x)', description='Desc', category='Tech', view_type='public')

        # 3 distinct reporters for p_bad
        for i in range(3):
            reporter = User.objects.create_user(email=f'rep{i}@example.com', username=f'rep{i}', password='Pass123!')
            PostReport.objects.create(post=p_bad, reporter=reporter, reason='Spam')

        # 1 reporter for p_good
        single_rep = User.objects.create_user(email='singlerep@example.com', username='singlerep', password='Pass123!')
        PostReport.objects.create(post=p_good, reporter=single_rep, reason='Typo')

        response = self.client.get('/api/v1/posts/feed/?mode=for_you')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        titles = [p['title'] for p in results]
        self.assertNotIn('Abusive Post (Reported 3x)', titles)
        self.assertIn('Good Post (Reported 1x)', titles)


class GeoRippleFeedTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='builder@example.com',
            username='builder_geo',
            password='Password123!',
            full_name='Geo Builder',
            college='IIT Bombay',
            city='Mumbai',
            latitude=19.0760,
            longitude=72.8777,
        )
        self.client.force_authenticate(user=self.user)

    def test_haversine_distance_calculation(self):
        """Python haversine_distance_km returns correct geodesic distance."""
        from apps.posts.services.geo_service import haversine_distance_km

        # Mumbai to Pune (~120 km)
        mumbai_lat, mumbai_lng = 19.0760, 72.8777
        pune_lat, pune_lng = 18.5204, 73.8567
        dist = haversine_distance_km(mumbai_lat, mumbai_lng, pune_lat, pune_lng)
        self.assertIsNotNone(dist)
        self.assertGreater(dist, 110)
        self.assertLess(dist, 135)

        # Same point should be ~0 km
        same_dist = haversine_distance_km(mumbai_lat, mumbai_lng, mumbai_lat, mumbai_lng)
        self.assertAlmostEqual(same_dist, 0.0, places=1)

        # Missing coords returns None
        self.assertIsNone(haversine_distance_km(None, 72.8, 19.0, 72.8))

    def test_post_creation_with_geo_and_remote_fields(self):
        """POST /api/v1/posts/create/ persists city, latitude, longitude, and is_remote."""
        payload = {
            'title': 'Local Robotics Project',
            'description': 'Building autonomous rover on campus.',
            'category': 'Robotics',
            'view_type': 'public',
            'city': 'Mumbai',
            'latitude': 19.0760,
            'longitude': 72.8777,
            'is_remote': False,
            'requirements': ['Hardware Engineer', 'ROS Developer'],
            'tags': ['Robotics', 'ROS'],
        }
        response = self.client.post('/api/v1/posts/create/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['city'], 'Mumbai')
        self.assertAlmostEqual(float(response.data['latitude']), 19.0760, places=4)
        self.assertAlmostEqual(float(response.data['longitude']), 72.8777, places=4)
        self.assertFalse(response.data['is_remote'])

        # Verify in database
        post_id = response.data['id']
        post = Post.objects.get(id=post_id)
        self.assertEqual(post.city, 'Mumbai')
        self.assertFalse(post.is_remote)

    def test_distance_km_in_feed_response(self):
        """Feed serializer computes distance_km relative to user coordinates or lat/lng query params."""
        other_user = User.objects.create_user(email='other@example.com', username='other_geo', password='Pass123!')
        
        # Post located ~15 km away from user (e.g. Bandra / suburban Mumbai)
        post = Post.objects.create(
            user=other_user,
            title='Nearby Web3 App',
            description='Web3 dev project',
            category='Tech',
            view_type='public',
            city='Mumbai',
            latitude=19.1200,
            longitude=72.8500,
            is_remote=False,
        )

        # Query feed passing user's lat and lng
        response = self.client.get(f'/api/v1/posts/feed/?mode=for_you&lat=19.0760&lng=72.8777')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 1)
        found = [p for p in results if p['id'] == str(post.id)][0]
        self.assertIn('distance_km', found)
        self.assertIsNotNone(found['distance_km'])
        self.assertGreater(found['distance_km'], 0)
        self.assertLess(found['distance_km'], 20)

    def test_wave1_hyperlocal_ranking_advantage(self):
        """New posts (<12h) within 5 km receive Wave 1 boost (+40) over distant posts."""
        other_user = User.objects.create_user(email='other2@example.com', username='other_geo2', password='Pass123!')

        # Post 1: Hyper-local (< 3 km from user)
        p_local = Post.objects.create(
            user=other_user,
            title='Hyper-Local Campus Hack',
            description='In our immediate campus radius',
            category='Hackathon',
            view_type='public',
            city='Mumbai',
            latitude=19.0780,  # very close to 19.0760
            longitude=72.8780,
            is_remote=False,
        )

        # Post 2: Far away in Delhi (~1150 km)
        p_far = Post.objects.create(
            user=other_user,
            title='Distant Delhi Hackathon',
            description='Far away project',
            category='Hackathon',
            view_type='public',
            city='Delhi',
            latitude=28.6139,
            longitude=77.2090,
            is_remote=False,
        )

        response = self.client.get('/api/v1/posts/feed/?mode=for_you&lat=19.0760&lng=72.8777')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        result_ids = [p['id'] for p in results]
        
        self.assertIn(str(p_local.id), result_ids)
        self.assertIn(str(p_far.id), result_ids)
        # p_local must rank before p_far
        self.assertLess(result_ids.index(str(p_local.id)), result_ids.index(str(p_far.id)))

    def test_college_gating_and_isolation(self):
        """College-mode posts are strictly isolated to users from the same college."""
        other_user = User.objects.create_user(
            email='iitb_friend@example.com',
            username='iitb_friend',
            password='Pass123!',
            college='IIT Bombay',
        )
        mit_user = User.objects.create_user(
            email='mit_student@example.com',
            username='mit_student',
            password='Pass123!',
            college='MIT Boston',
        )

        p_iitb = Post.objects.create(
            user=other_user,
            title='IIT Bombay Secret Project',
            description='Campus exclusive',
            category='Campus',
            view_type='college',
            college='IIT Bombay',
        )
        p_mit = Post.objects.create(
            user=mit_user,
            title='MIT Solar Car',
            description='MIT campus exclusive',
            category='Campus',
            view_type='college',
            college='MIT Boston',
        )

        # Alice (user.college='IIT Bombay') queries college feed
        response = self.client.get('/api/v1/posts/feed/?mode=college')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        titles = [p['title'] for p in results]

        self.assertIn('IIT Bombay Secret Project', titles)
        self.assertNotIn('MIT Solar Car', titles)

    def test_remote_projects_visible_globally(self):
        """Remote projects receive is_remote scoring and surface globally without distance penalty."""
        author = User.objects.create_user(email='remote_auth@example.com', username='remote_auth', password='Pass123!')
        p_remote = Post.objects.create(
            user=author,
            title='Open Source Remote Library',
            description='Anyone from anywhere can collaborate',
            category='Open Source',
            view_type='public',
            is_remote=True,
        )

        response = self.client.get('/api/v1/posts/feed/?mode=for_you&lat=19.0760&lng=72.8777')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        titles = [p['title'] for p in results]
        self.assertIn('Open Source Remote Library', titles)


class PostReliabilityAndIdempotencyTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='builder@example.com',
            username='builder',
            password='Password123!',
            full_name='Builder One'
        )
        self.client.force_authenticate(user=self.user)

    def test_post_creation_idempotency_returns_existing(self):
        """Retrying post creation with the same client_post_id returns existing post without duplicates."""
        payload = {
            'title': 'Autonomous Drone Project',
            'description': 'Hardware + AI drone navigation platform',
            'category': 'Robotics',
            'view_type': 'public',
            'client_post_id': 'drone-idemp-uuid-1',
        }

        # 1. First submission
        res1 = self.client.post('/api/v1/posts/create/', payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        post_id_1 = res1.data['id']

        # 2. Replay with identical client_post_id
        res2 = self.client.post('/api/v1/posts/create/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        post_id_2 = res2.data['id']

        self.assertEqual(post_id_1, post_id_2)
        # Database must only have exactly 1 post for this client_post_id
        self.assertEqual(Post.objects.filter(user=self.user, client_post_id='drone-idemp-uuid-1').count(), 1)

    def test_like_idempotency_and_canonical_counts(self):
        """Likes support explicit action ('like' | 'unlike' | 'toggle') and return canonical likes_count."""
        author = User.objects.create_user(email='other@example.com', username='other', password='Pass123!')
        post = Post.objects.create(user=author, title='Project X', description='Desc', category='Tech', view_type='public')

        # 1. Explicit 'like'
        res = self.client.post(f'/api/v1/posts/{post.id}/like/', {'action': 'like'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['liked'], True)
        self.assertEqual(res.data['likes_count'], 1)

        # 2. Repeat 'like' (should be idempotent, count remains 1, liked remains True)
        res_repeat = self.client.post(f'/api/v1/posts/{post.id}/like/', {'action': 'like'}, format='json')
        self.assertEqual(res_repeat.status_code, status.HTTP_200_OK)
        self.assertEqual(res_repeat.data['liked'], True)
        self.assertEqual(res_repeat.data['likes_count'], 1)

        # 3. Explicit 'unlike'
        res_unlike = self.client.post(f'/api/v1/posts/{post.id}/like/', {'action': 'unlike'}, format='json')
        self.assertEqual(res_unlike.status_code, status.HTTP_200_OK)
        self.assertEqual(res_unlike.data['liked'], False)
        self.assertEqual(res_unlike.data['likes_count'], 0)

        # 4. Repeat 'unlike' (should be idempotent, count stays clamped at 0)
        res_unlike_repeat = self.client.post(f'/api/v1/posts/{post.id}/like/', {'action': 'unlike'}, format='json')
        self.assertEqual(res_unlike_repeat.status_code, status.HTTP_200_OK)
        self.assertEqual(res_unlike_repeat.data['liked'], False)
        self.assertEqual(res_unlike_repeat.data['likes_count'], 0)

    def test_comment_idempotency_and_count(self):
        """Comments support client_comment_id idempotency and return post_comments_count."""
        author = User.objects.create_user(email='auth2@example.com', username='auth2', password='Pass123!')
        post = Post.objects.create(user=author, title='Project Y', description='Desc', category='Tech', view_type='public')

        payload = {
            'content': 'Excited to contribute to this!',
            'client_comment_id': 'comment-uuid-777',
        }

        # 1. First comment creation
        res1 = self.client.post(f'/api/v1/posts/{post.id}/comments/', payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data['post_comments_count'], 1)
        comment_id_1 = res1.data['id']

        # 2. Replay same client_comment_id
        res2 = self.client.post(f'/api/v1/posts/{post.id}/comments/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['post_comments_count'], 1)
        self.assertEqual(res2.data['id'], comment_id_1)

        # Comment count in database remains 1
        self.assertEqual(Comment.objects.filter(post=post).count(), 1)

    def test_media_upload_limits(self):
        """Posts reject more than 6 media attachments."""
        from django.core.files.uploadedfile import SimpleUploadedFile

        media_files = [
            SimpleUploadedFile(f"photo_{i}.png", b"fake-png-data", content_type="image/png")
            for i in range(7)
        ]

        payload = {
            'title': 'Too Many Media Files',
            'description': 'Attempting 7 files',
            'category': 'Tech',
            'view_type': 'public',
            'media': media_files,
        }

        res = self.client.post('/api/v1/posts/create/', payload, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('media', res.data)


