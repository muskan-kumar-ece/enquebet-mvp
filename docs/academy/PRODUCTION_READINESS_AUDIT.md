# ENQUEbet Academy — Master Production Readiness Audit

**Document ID:** `ENQ-AUDIT-ACAD-MASTER-001`  
**Date:** October 21, 2026  
**Auditor Lead:** Principal Engineer & Technical Lead (Antigravity Orchestrator)  
**Specialist Auditors:**
- **Agent A & B:** Backend, REST API & Security Auditor (`docs/academy/audit-agent-a-backend-security.md`)
- **Agent D:** Database, Schema & Data Integrity Auditor (`docs/academy/audit-agent-b-database-integrity.md`)
- **Agent C, E & F:** Frontend, UX, Deep-Link Bridge & Production Build Auditor (`docs/academy/audit-agent-c-frontend-ux.md`)
**Git Target Branch:** `audit/academy-readiness` (branched from commit `8df183cfa9db690076645757250148e97e3379ba`)  
**Verdict:** **NOT READY FOR PRODUCTION WITHOUT REMEDIATION (CONDITIONAL RELEASE CANDIDATE)**

---

## 1. Executive Summary

An exhaustive, evidence-based production readiness audit of ENQUEbet Academy was conducted across the backend Django API, PostgreSQL/SQLite schemas, Next.js frontend, authentication flows, the "Golden Bridge" to workspaces, and the Render deployment pipeline.

### Architectural Invariant Verification: PASSED
The strict product invariant:
$$\text{Learn} \longrightarrow \text{Practice} \longrightarrow \text{Build} \longrightarrow \text{Prove} \longrightarrow \text{Grow}$$
was audited with absolute rigor:
- `apps.courses` **never** imports `reputation_service` or `apps.collaboration.models.ReputationEvent`.
- `CourseCompletion` represents strictly an academic credential (`ENQ-ACAD-YYYY-XXXXXXXX`) and **never** auto-mints a cryptographic `ProofOfWork` or increments `User.reputation_score`.
- Real builder reputation and immutable Proof of Work remain strictly governed by verified deliverables inside active `Workspace` collaborations.

### Production Blockers Identified: ACTION REQUIRED
Despite strong domain architecture, the audit discovered **6 High/Critical defects** that must be remediated before production release:
1. **[CRITICAL] Broken Object-Level Authorization (`LessonViewSet.list`):** Unauthenticated visitors can call `GET /api/v1/courses/lessons/` and dump the complete curriculum markdown, private video URLs, and confidential assignment materials across all courses.
2. **[CRITICAL] TypeScript Production Build Failure (`CourseCard.tsx:44`):** Illegal comparison `course.status === 'completed'` breaks `npx tsc --noEmit` and fails CI/CD production build (`TS2367`).
3. **[CRITICAL] Broken "Golden Bridge" Deep-Link (`AssignmentWorkbench.tsx` & `/create`):** "Launch Build Project in Workspaces" navigates to an inbox route (`/collaboration`) that ignores parameters. Neither `/collaboration` nor `/create` consumes `useSearchParams()`, stranding learners with blank forms.
4. **[HIGH] Unrestricted Public Certificate Enumeration (`CourseCompletionViewSet.list`):** `GET /api/v1/courses/certificates/` is exposed to `AllowAny`, allowing scrapers to enumerate all student completions, names, and grades.
5. **[HIGH] Lack of Anti-Self-Approval on Reviews (`AssignmentViewSet.review`):** Instructors who submit assignments as learners in their own courses can approve their own deliverables.
6. **[HIGH] Premature Lesson Completion on Deliverable Submission (`AssignmentViewSet.submit`):** Submitting an assignment immediately marks the lesson as complete and issues a certificate *before* instructor review or approval.
7. **[HIGH] Missing URL Protocol Scheme Validation (`AssignmentViewSet.submit`):** Allows `javascript:` or dangerous schemes to be stored and executed when clicked by reviewers.

---

## 2. Master Findings Matrix

| Finding ID | Severity | Category | File Path & Lines | Vulnerability / Issue Description | Remediation Required |
|:---|:---|:---|:---|:---|:---|
| **SEC-01** | **CRITICAL** | Security (BOLA) | `backend/apps/courses/views.py#L291-L304` | `LessonViewSet` inherits `ReadOnlyModelViewSet` without disabling `list`. Unauthenticated users can query `GET /api/v1/courses/lessons/` and leak all lesson markdown and video URLs. | Subclass `mixins.RetrieveModelMixin, viewsets.GenericViewSet`. |
| **BUILD-01** | **CRITICAL** | Build / CI | `frontend/components/academy/CourseCard.tsx#L44` | Type mismatch `course.status === 'completed'` fails TypeScript compilation (`TS2367`), blocking production build. | Change condition to check `progress >= 100`. |
| **BRIDGE-01** | **CRITICAL** | Integration / UX | `frontend/components/academy/AssignmentWorkbench.tsx#L117`, `frontend/app/create/page.tsx` | "Launch Build Project" links to `/collaboration`, ignoring params. `/create` fails to parse `useSearchParams()` to prefill project title, tags, and starter repo. | Point bridge to `/create`, parse `useSearchParams()` in `CreatePostPage`, and render Capstone banner. |
| **SEC-02** | **HIGH** | Security (PII) | `backend/apps/courses/views.py#L498-L506` | `CourseCompletionViewSet` allows `list` for `AllowAny`, allowing scrapers to enumerate all student certificates and names. | Subclass `mixins.RetrieveModelMixin, viewsets.GenericViewSet`. |
| **SEC-03** | **HIGH** | Security (RBAC) | `backend/apps/courses/views.py#L469-L495` | `AssignmentViewSet.review` lacks anti-self-approval check (`submission.learner == request.user`). | Add check prohibiting self-review: `if submission.learner == request.user and not request.user.is_superuser: raise PermissionDenied(...)`. |
| **SEC-04** | **HIGH** | Data Integrity | `backend/apps/courses/views.py#L453-L462` | Merely submitting an assignment marks the lesson complete and auto-issues certificates before review. | Only mark lesson complete when status is `APPROVED` during `review()`. |
| **SEC-05** | **HIGH** | Security (XSS) | `backend/apps/courses/views.py#L428-L452` | Missing URL scheme validation in `AssignmentViewSet.submit`. Allows `javascript:` URIs. | Enforce `URLValidator(schemes=['http', 'https'])`. |
| **DATA-01** | **MEDIUM** | Concurrency | `backend/apps/courses/models.py#L297-L330` | Race condition in `recalculate_progress` creating `CourseCompletion`. Concurrent requests crash with 500 `IntegrityError`. | Wrap in `transaction.atomic()` with `select_for_update()` and `get_or_create()`. |
| **DATA-02** | **MEDIUM** | Schema Integrity | `backend/apps/courses/models.py#L401-L440` | `AssignmentSubmission` lacks unique constraint on `(assignment, learner)`. Concurrent submits cause `MultipleObjectsReturned`. | Add `UniqueConstraint(fields=['assignment', 'learner'])` or handle multiple submissions cleanly. |
| **DATA-03** | **MEDIUM** | DevOps / Build | `backend/requirements.txt` | File encoded in UTF-16LE with BOM `[255, 254]`. Fails standard Linux/Render build environments. | Re-encode to UTF-8 without BOM. |
| **SEC-06** | **MEDIUM** | Error Handling | `backend/apps/courses/views.py#L485` | Invalid UUID string passed to `submission_id` raises unhandled Django `ValidationError` (HTTP 500). | Catch `(ValueError, DjangoValidationError)` and return HTTP 400. |
| **FRONT-01** | **MEDIUM** | Auth Routing | `frontend/app/courses/[slug]/page.tsx#L58`, `frontend/app/auth/login/page.tsx#L39` | Unauthenticated enrollment redirects to `/login` which strips `?next=...`, and login redirects to `/`, abandoning learner. | Route to `/auth/login?next=...` and respect `next` on login success. |
| **FRONT-02** | **MEDIUM** | Mobile UX | `frontend/components/academy/LessonPlayer.tsx` | Lesson player does not activate `setHideMobileNav(true)`, causing fixed mobile bottom nav to collide with lesson navigation dock. | Toggle `setHideMobileNav(true)` on mount and `false` on unmount. |
| **UX-01** | **MEDIUM** | Accessibility | `frontend/components/academy/LessonPlayer.tsx`, `CourseCard.tsx` | Mobile touch targets are under 44x44px (WCAG 2.5.5). | Enforce minimum 44px hitboxes on drawer toggles and bookmark buttons. |

---

## 3. Step-by-Step Remediation Plan

### Step 1: Backend Security & Endpoint Hardening (`backend/apps/courses/`)
1. **Subclass GenericViewSet on `LessonViewSet` and `CourseCompletionViewSet`:**
   - In `backend/apps/courses/views.py`: Change `LessonViewSet` and `CourseCompletionViewSet` to inherit from `mixins.RetrieveModelMixin, viewsets.GenericViewSet`.
   - This physically eliminates the `list` action route from DRF routers, making `GET /api/v1/courses/lessons/` and `GET /api/v1/courses/certificates/` return 405 Method Not Allowed.
2. **Add URL Scheme Validation & Anti-Self-Approval in `AssignmentViewSet`:**
   - Add `URLValidator(schemes=['http', 'https'])` in `submit()`.
   - Add anti-self-approval check in `review()`: `if submission.learner == request.user and not request.user.is_superuser: raise PermissionDenied(...)`.
   - Validate UUID format of `submission_id` before querying.
3. **Decouple Assignment Submission from Premature Lesson Completion:**
   - In `AssignmentViewSet.submit`: Do NOT mark lesson complete or recalculate progress on submit.
   - In `AssignmentViewSet.review`: When status is `approved`, mark `assignment.lesson` complete and recalculate progress.
4. **Harden `recalculate_progress` with `transaction.atomic`:**
   - In `backend/apps/courses/models.py`: Wrap `CourseCompletion` creation in `transaction.atomic()` with `get_or_create(enrollment=self, ...)`.

### Step 2: Database & Build Environment Hardening
1. **Re-encode `backend/requirements.txt` to UTF-8 without BOM:**
   - Ensure clean `pip install -r requirements.txt` on Linux / Render.
2. **Seed Command Compatibility Wrapper:**
   - Ensure `seed_academy.py` can be invoked as both `seed_academy` and `seed_academy_courses`.

### Step 3: Frontend TypeScript & The Golden Bridge (`frontend/`)
1. **Fix `CourseCard.tsx` TypeScript Compilation:**
   - In `frontend/components/academy/CourseCard.tsx:44`: Change to `const isCompleted = progress >= 100;`.
2. **Wire The Golden Bridge in `AssignmentWorkbench.tsx` and `/create`:**
   - In `frontend/components/academy/AssignmentWorkbench.tsx`: Update `bridgeHref` to point to `/create?title=Squad:+...&tags=...&starter_repo=...&description=...&ref=academy_assignment`.
   - In `frontend/app/create/page.tsx`: Import `useSearchParams()` from `next/navigation`, read `title`, `tags`, `starter_repo`, `description`, `ref`, and initialize formData state + render Capstone badge.
3. **Fix Return Path in Authentication Flows:**
   - In `frontend/app/courses/[slug]/page.tsx`: Redirect unauthenticated enrollments directly to `/auth/login?next=/courses/${slug}`.
   - In `frontend/app/auth/login/page.tsx`: Read `searchParams.get('next') || '/'` and navigate there upon successful authentication.
4. **Distraction-Free Mobile Navigation in `LessonPlayer.tsx`:**
   - Call `setHideMobileNav(true)` on mount and `false` on unmount.
   - Increase touch targets to >= 44x44px.

---

## 4. Verification & Testing Protocol

Following implementation of the remediations:
1. **Execute Django Test Suite with SQLite:**
   `$env:USE_SQLITE="1"; python backend/manage.py test apps.courses`
   Assert all existing tests plus new security/regression test cases pass 100%.
2. **Execute Regression Test Suite:**
   `$env:USE_SQLITE="1"; python backend/manage.py test apps.collaboration.tests`
   Confirm zero regressions in workspaces, deliverables, and reputation boundary.
3. **Execute Frontend Type Check:**
   `Set-Location frontend; npx tsc --noEmit`
   Confirm 0 errors exit code 0.
4. **Execute Playwright E2E Suite:**
   `npx playwright test e2e/academy.spec.ts`
   Confirm all E2E test flows pass with browser screenshots.
5. **Generate Release Readiness Decision:**
   Produce `docs/academy/RELEASE_READINESS.md` certifying readiness status.
