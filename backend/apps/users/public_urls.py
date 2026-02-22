"""
Public user URLs — accessible at /api/v1/users/
"""
from django.urls import path
from . import views
from apps.posts.views import UserPostsView

urlpatterns = [
    path('search/', views.UserSearchView.as_view(), name='user_search'),
    path('me/', views.MeView.as_view(), name='me'),
    path('me/password/', views.MePasswordView.as_view(), name='me_password'),
    path('me/posts/', views.DeleteAllPostsView.as_view(), name='me_posts_delete_all'),

    # Back-compat toggle (POST toggles follow, DELETE unfollows)
    path('follow/', views.FollowToggleView.as_view(), name='follow_toggle_body'),

    # Spec follow endpoints
    path('<uuid:target_user_id>/follow-status/', views.FollowStatusView.as_view(), name='follow_status'),
    path('<uuid:target_user_id>/followers/', views.FollowersListView.as_view(), name='followers_list'),
    path('<uuid:target_user_id>/following/', views.FollowingListView.as_view(), name='following_list'),
    path('<uuid:target_user_id>/follow/', views.FollowUserView.as_view(), name='follow_user'),
    path('<uuid:target_user_id>/unfollow/', views.UnfollowUserView.as_view(), name='unfollow_user'),

    path('<uuid:pk>/', views.UserByIdView.as_view(), name='user_by_id'),
    path('<uuid:user_id>/posts/', UserPostsView.as_view(), name='user_posts'),
    # Keep this last to avoid conflicting with the more specific routes above
    path('<str:username>/', views.UserDetailView.as_view(), name='user_by_username'),
]
