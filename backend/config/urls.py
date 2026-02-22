"""
URL Configuration for ENQUEbet API
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/users/', include('apps.users.public_urls')),
    path('api/v1/posts/', include('apps.posts.urls')),
    path('api/v1/collaboration/', include('apps.collaboration.urls')),
    path('api/v1/chats/', include('apps.chats.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/search/', include('apps.search.urls')),
    path('api/v1/uploads/', include('apps.uploads.urls')),
    path('api/v1/contributions/', include('apps.contributions.urls')),
    path('api/v1/research/', include('apps.research.urls')),

    # Spec-friendly aliases (information.md uses /api/...)
    path('api/auth/', include('apps.users.urls')),
    path('api/users/', include('apps.users.public_urls')),
    path('api/posts/', include('apps.posts.urls')),
    path('api/collaboration/', include('apps.collaboration.urls')),
    path('api/messages/', include('apps.chats.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/search/', include('apps.search.urls')),
    path('api/uploads/', include('apps.uploads.urls')),
    path('api/contributions/', include('apps.contributions.urls')),
    path('api/research/', include('apps.research.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

