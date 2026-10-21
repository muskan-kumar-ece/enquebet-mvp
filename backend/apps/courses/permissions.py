"""
Permission classes for ENQUEbet Academy
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


def is_academy_admin(user):
    """Check if user has admin/staff privileges across the platform"""
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_staff or user.is_superuser)


class IsCourseInstructorOrAdmin(BasePermission):
    """
    Grants access if the user is the course creator or a platform admin.
    """
    def has_object_permission(self, request, view, obj):
        if is_academy_admin(request.user):
            return True
        course = getattr(obj, 'course', obj)
        return course.creator == request.user


class HasLessonAccess(BasePermission):
    """
    Grants read access to a lesson:
    - If lesson.is_preview is True, public read is granted.
    - If lesson.is_preview is False, user must be authenticated and enrolled in the course, or creator/admin.
    """
    def has_object_permission(self, request, view, obj):
        # Preview lessons are readable by anyone
        if request.method in SAFE_METHODS and getattr(obj, 'is_preview', False):
            return True

        user = request.user
        if not user or not user.is_authenticated:
            return False

        if is_academy_admin(user):
            return True

        course = obj.module.course
        if course.creator == user:
            return True

        # For premium courses, verify active commercial entitlement
        if course.access_tier == 'premium' or (course.price_inr and course.price_inr > 0):
            from .models import CourseEntitlement
            has_entitlement = CourseEntitlement.objects.filter(
                user=user,
                course=course,
                is_active=True
            ).exists()
            if not has_entitlement:
                return False

        # Check active enrollment
        return course.enrollments.filter(user=user, status__in=['active', 'completed']).exists()
