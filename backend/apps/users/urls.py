"""
User URLs
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('logout-all/', views.LogoutAllView.as_view(), name='logout_all'),
    path('ws-ticket/', views.WebSocketTicketView.as_view(), name='ws_ticket'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('users/<str:username>/', views.UserDetailView.as_view(), name='user_detail'),

    # OAuth 2.0 endpoints
    path('oauth/google/', views.GoogleOAuthView.as_view(), name='oauth_google'),
    path('oauth/github/', views.GitHubOAuthView.as_view(), name='oauth_github'),
    path('oauth/providers/', views.ConnectedAccountsView.as_view(), name='oauth_providers'),
    path('oauth/providers/<str:provider>/', views.ConnectedAccountsView.as_view(), name='oauth_provider_detail'),
]
