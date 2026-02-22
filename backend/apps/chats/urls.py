"""
Chats URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.ConversationListCreateView.as_view(), name='conversations'),
    path('start-dm/', views.StartDMView.as_view(), name='start_dm'),
    path('conversations/<uuid:conversation_id>/messages/', views.ConversationMessagesView.as_view(), name='messages'),
    # Spec alias: GET /messages/conversations/{id}
    path('conversations/<uuid:conversation_id>/', views.ConversationMessagesView.as_view(), name='messages_alias'),
    # Spec alias: POST /messages/send
    path('send/', views.SendMessageAliasView.as_view(), name='send_message'),
    # Spec alias: GET /messages/conversation/{user_id}
    path('conversation/<uuid:user_id>/', views.ConversationWithUserView.as_view(), name='conversation_with_user'),
    path('conversations/<uuid:conversation_id>/read/', views.ConversationMarkReadView.as_view(), name='conversation_mark_read'),
]
