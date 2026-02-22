"""
Notifications URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notifications'),
    path('unread-count/', views.UnreadCountView.as_view(), name='unread_count'),
    path('read-all/', views.MarkAllReadView.as_view(), name='mark_all_read'),
    path('<uuid:notification_id>/mark-read/', views.MarkAsReadView.as_view(), name='mark_read'),
]
