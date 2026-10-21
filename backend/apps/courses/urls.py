"""
URL routes for ENQUEbet Academy
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet,
    LessonViewSet,
    AssignmentViewSet,
    CourseCompletionViewSet,
    CourseOrderViewSet,
    CoursePaymentWebhookView,
)

router = DefaultRouter()
router.register('orders', CourseOrderViewSet, basename='course-order')
router.register('lessons', LessonViewSet, basename='lesson')
router.register('assignments', AssignmentViewSet, basename='assignment')
router.register('certificates', CourseCompletionViewSet, basename='certificate')
router.register('', CourseViewSet, basename='course')

urlpatterns = [
    path('payments/webhook/', CoursePaymentWebhookView.as_view(), name='course-payment-webhook'),
    path('', include(router.urls)),
]
