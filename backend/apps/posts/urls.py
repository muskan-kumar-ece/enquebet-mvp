"""
Posts URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('feed/', views.FeedView.as_view(), name='feed'),
    path('saved/', views.SavedPostsListView.as_view(), name='saved_posts'),
    path('search/', views.PostSearchView.as_view(), name='post_search'),
    path('create/', views.CreatePostView.as_view(), name='create_post'),
    path('<uuid:pk>/', views.PostDetailView.as_view(), name='post_detail'),
    path('<uuid:post_id>/join/', views.PostJoinView.as_view(), name='post_join'),
    path('<uuid:post_id>/collaborate/', views.PostJoinView.as_view(), name='post_collaborate'),
    path('<uuid:post_id>/like/', views.LikePostView.as_view(), name='like_post'),
    path('<uuid:post_id>/unlike/', views.UnlikePostView.as_view(), name='unlike_post'),
    path('<uuid:post_id>/comments/', views.CommentListCreateView.as_view(), name='post_comments'),
    path('<uuid:post_id>/comments/<uuid:comment_id>/', views.CommentDeleteView.as_view(), name='comment_delete'),
    path('<uuid:post_id>/comment/', views.CommentListCreateView.as_view(), name='post_comment_alias'),
    path('<uuid:post_id>/save/', views.SavePostView.as_view(), name='save_post'),
    path('<uuid:post_id>/report/', views.ReportPostView.as_view(), name='report_post'),
]
