"""
Workspace and Team Execution URL Configuration
"""
from django.urls import path
from . import workspace_views as views

urlpatterns = [
    path('', views.MyWorkspacesListView.as_view(), name='my_workspaces'),
    path('by-post/<uuid:post_id>/', views.WorkspaceByPostView.as_view(), name='workspace_by_post'),
    path('<uuid:workspace_id>/', views.WorkspaceDetailView.as_view(), name='workspace_detail'),
    path('<uuid:workspace_id>/members/', views.TeamMembershipListView.as_view(), name='workspace_members'),
    path('<uuid:workspace_id>/members/<uuid:member_id>/role/', views.TeamMemberRoleUpdateView.as_view(), name='workspace_member_role'),
    path('<uuid:workspace_id>/members/leave/', views.TeamMemberLeaveView.as_view(), name='workspace_leave'),
    path('<uuid:workspace_id>/members/<uuid:member_id>/remove/', views.TeamMemberRemoveView.as_view(), name='workspace_member_remove'),
    path('<uuid:workspace_id>/activity/', views.ProjectActivityListView.as_view(), name='workspace_activity'),
    path('<uuid:workspace_id>/milestones/', views.ProjectMilestoneListCreateView.as_view(), name='workspace_milestones'),
    path('<uuid:workspace_id>/tasks/', views.ProjectTaskListCreateView.as_view(), name='workspace_tasks'),
    path('<uuid:workspace_id>/tasks/<uuid:task_id>/', views.ProjectTaskDetailView.as_view(), name='workspace_task_detail'),
    path('<uuid:workspace_id>/tasks/<uuid:task_id>/deliverables/', views.TaskDeliverableSubmitView.as_view(), name='workspace_deliverable_submit'),
    path('<uuid:workspace_id>/tasks/<uuid:task_id>/deliverables/<uuid:deliverable_id>/review/', views.TaskDeliverableReviewView.as_view(), name='workspace_deliverable_review'),
    path('<uuid:workspace_id>/complete/', views.ProjectCompletionRequestView.as_view(), name='workspace_complete'),
    path('<uuid:workspace_id>/reopen/', views.ProjectReopenView.as_view(), name='workspace_reopen'),
]
