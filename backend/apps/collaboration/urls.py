"""
Collaboration URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path('request/', views.SendCollaborationRequestView.as_view(), name='send_request'),
    path('request/<uuid:request_id>/accept/', views.AcceptCollaborationRequestView.as_view(), name='accept_request'),
    path('request/<uuid:request_id>/decline/', views.DeclineCollaborationRequestView.as_view(), name='decline_request'),
    path('request/<uuid:request_id>/cancel/', views.CancelCollaborationRequestView.as_view(), name='cancel_request'),

    # Spec-friendly aliases (information.md examples)
    path('accept/', views.AcceptCollaborationAliasView.as_view(), name='accept_request_alias'),
    path('decline/', views.DeclineCollaborationAliasView.as_view(), name='decline_request_alias'),
    path('my-requests/', views.MyCollaborationRequestsView.as_view(), name='my_requests'),
]
