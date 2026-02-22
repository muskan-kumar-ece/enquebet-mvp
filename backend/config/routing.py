"""
WebSocket URL routing for ENQUEbet.
"""

from django.urls import re_path
from apps.notifications import consumers as notification_consumers
from apps.chats import consumers as chat_consumers

websocket_urlpatterns = [
    re_path(r'ws/notifications/$', notification_consumers.NotificationConsumer.as_asgi()),
    re_path(r'ws/chat/(?P<conversation_id>[0-9a-fA-F-]+)/$', chat_consumers.ChatConsumer.as_asgi()),
]
