"""
Proof of Work and Peer Review URL Configuration
"""
from django.urls import path
from . import workspace_views as views

urlpatterns = [
    path('<str:code>/', views.PublicProofDetailView.as_view(), name='public_proof_detail'),
    path('<str:code>/peer-review/', views.PeerReviewSubmitView.as_view(), name='peer_review_submit'),
]
