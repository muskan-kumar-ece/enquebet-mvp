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
    path('me/sessions/', views.UserSessionsListView.as_view(), name='me_sessions_list'),
    path('me/sessions/revoke-others/', views.UserSessionsRevokeOthersView.as_view(), name='me_sessions_revoke_others'),
    path('me/sessions/<uuid:session_id>/', views.UserSessionRevokeView.as_view(), name='me_session_revoke'),
    path('me/blocked/', views.BlockedUsersListView.as_view(), name='me_blocked_list'),
    path('me/block/', views.BlockUserView.as_view(), name='me_block_user'),
    path('me/blocked/<uuid:target_user_id>/', views.UnblockUserView.as_view(), name='me_unblock_user'),
    path('me/time-stats/', views.UserTimeStatsView.as_view(), name='me_time_stats'),
    path('me/professional-stats/', views.UserProfessionalStatsView.as_view(), name='me_professional_stats'),

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
    path('me/reputation/', views.MeReputationView.as_view(), name='me_reputation'),
    path('me/dossier/', views.UserDossierView.as_view(), name='me_dossier'),
    path('me/dossier-preferences/', views.UserDossierPreferencesView.as_view(), name='me_dossier_preferences'),
    path('me/experiences/', views.UserExperienceListCreateView.as_view(), name='me_experiences'),
    path('me/experiences/<uuid:pk>/', views.UserExperienceDetailView.as_view(), name='me_experience_detail'),
    path('me/educations/', views.UserEducationListCreateView.as_view(), name='me_educations'),
    path('me/educations/<uuid:pk>/', views.UserEducationDetailView.as_view(), name='me_education_detail'),
    path('me/proofs/', views.UserProofsListView.as_view(), name='me_proofs'),

    path('<uuid:user_id>/reputation/', views.UserReputationView.as_view(), name='user_reputation'),
    path('<uuid:user_id>/reputation/recalculate/', views.UserReputationRecalculateView.as_view(), name='user_reputation_recalculate'),
    path('<uuid:identifier>/dossier/', views.UserDossierView.as_view(), name='user_dossier_by_uuid'),
    path('<uuid:identifier>/activity-matrix/', views.UserActivityMatrixView.as_view(), name='user_activity_matrix_by_uuid'),
    path('<uuid:identifier>/proofs/', views.UserProofsListView.as_view(), name='user_proofs_by_uuid'),

    # Username-based routes for dossier & activity
    path('<str:identifier>/dossier/', views.UserDossierView.as_view(), name='user_dossier_by_username'),
    path('<str:identifier>/activity-matrix/', views.UserActivityMatrixView.as_view(), name='user_activity_matrix_by_username'),
    path('<str:identifier>/proofs/', views.UserProofsListView.as_view(), name='user_proofs_by_username'),

    # Keep this last to avoid conflicting with the more specific routes above
    path('<str:username>/', views.UserDetailView.as_view(), name='user_by_username'),

]
