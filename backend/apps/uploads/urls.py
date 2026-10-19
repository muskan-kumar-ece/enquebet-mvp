"""Uploads URLs"""
from django.urls import path
from .views import ImageUploadView, DocumentUploadView

urlpatterns = [
    path('image/', ImageUploadView.as_view(), name='image-upload'),
    path('document/', DocumentUploadView.as_view(), name='document-upload'),
]

