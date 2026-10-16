"""
Workspace, Team Governance & Execution Permissions
"""
from django.db.models import Q
from rest_framework.permissions import BasePermission
from .models import Workspace, TeamMembership


def get_workspace_from_view(view, request):
    """Resolve workspace from URL kwarg workspace_id, pk, or post_id."""
    identifier = view.kwargs.get('workspace_id') or view.kwargs.get('pk') or view.kwargs.get('post_id')
    if not identifier:
        return None
    return Workspace.objects.filter(Q(id=identifier) | Q(post_id=identifier)).first()


class IsActiveWorkspaceMember(BasePermission):
    """Allows access only to active team members or the project owner."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        workspace = get_workspace_from_view(view, request)
        if not workspace:
            return True  # Let view handle 404
        if workspace.post.user == request.user:
            return True
        return TeamMembership.objects.filter(
            workspace=workspace,
            user=request.user,
            status='active'
        ).exists()


class IsWorkspaceLead(BasePermission):
    """Allows access only to workspace Owner or Team Leads."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        workspace = get_workspace_from_view(view, request)
        if not workspace:
            return True
        if workspace.post.user == request.user:
            return True
        return TeamMembership.objects.filter(
            workspace=workspace,
            user=request.user,
            status='active',
            role__in=['owner', 'lead']
        ).exists()


class IsWorkspaceOwner(BasePermission):
    """Allows access strictly to the primary workspace Owner."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        workspace = get_workspace_from_view(view, request)
        if not workspace:
            return True
        if workspace.post.user == request.user:
            return True
        return TeamMembership.objects.filter(
            workspace=workspace,
            user=request.user,
            status='active',
            role='owner'
        ).exists()
