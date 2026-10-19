"""
URLs for Platform Updates
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlatformUpdateViewSet

router = DefaultRouter()
router.register(r'', PlatformUpdateViewSet, basename='platform-update')

urlpatterns = [
    path('', include(router.urls)),
]
