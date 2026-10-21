# ENQUEbet Academy — Production Readiness Audit Report
## Agent C, E & F: Frontend, UX, Deep-Link Integration & Build Auditor

**Date:** October 21, 2026  
**Auditor:** Subagent 3 (Agent C, E & F — Frontend, UX, Golden Bridge & Production Build Auditor)  
**Target:** ENQUEbet Academy Production Readiness  
**Target Codebase:** `frontend/app/courses/`, `frontend/components/academy/`, `frontend/lib/api.ts`, `frontend/app/collaboration/`, `frontend/app/create/`

---

## Executive Summary

An exhaustive technical audit of the ENQUEbet Academy frontend implementation was conducted across all 5 core routes, 7 domain components, API client integrations, bridge destination routes, and the Next.js TypeScript build environment.

The frontend architecture demonstrates strong craftsmanship: it features a high-density, anti-slop visual language inspired by Linear and Vercel, deterministic hydration via `CANONICAL_ACADEMY_COURSES`, and strict separation between academic credentials and cryptographic Proof of Work.

However, the audit identified **two Critical blocking defects** that compromise production readiness:
1. **BUILD-01 (Critical TypeScript Compilation Failure):** `components/academy/CourseCard.tsx:44` contains an illegal type comparison (`course.status === 'completed'`), which halts `npx tsc --noEmit` and `next build` with exit code 1.
2. **BRIDGE-01 (Critical Golden Bridge Failure):** The "Launch Build Project in Workspaces" button navigates to an inbox route (`/collaboration`) that has zero support for search query parameters. Neither `/collaboration` nor the actual project launchpad (`/create`) parses query parameters, rendering the Golden Bridge between educational capstones and collaborative workspaces a dead end.
3. **FRONT-01 (Critical Return Path Amnesia):** Unauthenticated users attempting to enroll or access lessons are routed through an alias redirect that drops the `?next=` parameter, while `/auth/login` hardcodes a redirect to `/`, abandoning the learner's journey.

A total of **12 findings** were documented across 5 audit domains:
- **Critical:** 3
- **High:** 4
- **Medium:** 4
- **Low:** 1

---

## Summary of Audit Findings

| Finding ID | Severity | Category | Target File(s) | Description |
|:---|:---|:---|:---|:---|
| **BUILD-01** | **Critical** | Build Health | `components/academy/CourseCard.tsx:44` | TypeScript compilation error `TS2367` breaks production builds. |
| **BRIDGE-01** | **Critical** | Deep-Link Integration | `AssignmentWorkbench.tsx:117`, `collaboration/page.tsx`, `create/page.tsx` | "Launch Build Project" links to inbox instead of project launchpad; search params ignored. |
| **FRONT-01** | **Critical** | Auth & Routing | `courses/[slug]/page.tsx:58`, `login/page.tsx`, `auth/login/page.tsx:39` | Authentication return path amnesia redirects learners to `/` home feed. |
| **FRONT-02** | **High** | Network Resilience | `courses/page.tsx`, `courses/[slug]/page.tsx`, `certificates/[code]/page.tsx` | Missing explicit error states and retry buttons on network/server failures. |
| **FRONT-03** | **High** | State Sync | `LessonPlayer.tsx:52-72`, `courses/[slug]/lessons/[lessonId]/page.tsx` | Lesson completion toggle lacks optimistic updates and desynchronizes drawer checkmarks. |
| **UX-01** | **High** | UX & Touch Targets | `LessonPlayer.tsx`, `CourseCard.tsx`, `AcademyFilterTabs.tsx` | Multiple touch targets are 16px–32px, violating WCAG 44x44px minimums. |
| **FRONT-04** | **Medium** | Mobile UX | `LessonPlayer.tsx`, `LayoutShell.tsx` | Lesson player fails to activate `hideMobileNav`, causing bottom bar collision on mobile. |
| **FRONT-05** | **Medium** | Concurrency & Race | `AssignmentWorkbench.tsx:83-108` | Form submission lacks duplicate submission guard against rapid Enter keypresses. |
| **FRONT-06** | **Medium** | Auth & Resilience | `courses/[slug]/lessons/[lessonId]/page.tsx:121-135` | Unauthenticated direct enrollment from locked lessons fires raw 401 toast. |
| **UX-02** | **Medium** | Mobile Responsiveness | `MarkdownRenderer.tsx:125`, `LessonPlayer.tsx:142` | Missing `break-words` on markdown paragraphs risks horizontal overflow on 375px screens. |
| **A11Y-01** | **Medium** | Accessibility | `AssignmentWorkbench.tsx`, `SyllabusAccordion.tsx`, `LessonPlayer.tsx` | Missing ARIA attributes (`role="checkbox"`, `aria-expanded`, `aria-modal`). |
| **BUILD-02** | **Low** | Telemetry | `LessonPlayer.tsx:131`, `frontend/lib/api.ts:1467` | Video playback timestamp persistence hook (`updateLessonPosition`) is never called. |

---

## Detailed Audit Investigations

### 1. API Integration & Network Resilience

#### FRONT-01: Broken Authentication Flow & Return Path Amnesia
- **Finding ID:** FRONT-01
- **Severity:** Critical
- **Location:**
  - `frontend/app/courses/[slug]/page.tsx:58`
  - `frontend/app/login/page.tsx:3-5`
  - `frontend/app/auth/login/page.tsx:38-40`
- **Reproduction Steps:**
  1. Open an incognito browser window.
  2. Navigate to `/courses/fullstack-saas-nextjs-django`.
  3. Click "Enroll in Masterclass (Free)".
  4. The router navigates to `/login?next=/courses/fullstack-saas-nextjs-django`.
  5. The server alias page `/login/page.tsx` runs `redirect('/auth/login')`, completely dropping the query string.
  6. The user enters credentials on `/auth/login` and submits.
  7. Lines 38–40 of `LoginPage` execute:
     ```ts
     setTimeout(() => {
         router.push('/');
     }, 600);
     ```
  8. The user lands on the feed root `/` rather than their course.
- **User Impact:** Severe UX friction. Learners lose the context of what they were attempting to enroll in or study, resulting in abandonment.
- **Recommended Remediation:**
  1. In `frontend/app/courses/[slug]/page.tsx`:
     Change route navigation from `/login?next=...` to `/auth/login?next=/courses/${slug}`.
  2. In `frontend/app/login/page.tsx`:
     Preserve query string during redirect:
     ```ts
     export default async function LoginAliasPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
         const sp = await searchParams;
         const qs = new URLSearchParams(sp).toString();
         redirect(`/auth/login${qs ? `?${qs}` : ''}`);
     }
     ```
  3. In `frontend/app/auth/login/page.tsx`:
     Read `const next = searchParams.get('next') || '/'` and route to `next`:
     ```ts
     const searchParams = useSearchParams();
     const nextUrl = searchParams.get('next') || '/';
     ...
     setTimeout(() => {
         router.push(nextUrl);
     }, 600);
     ```

---

#### FRONT-02: Missing Network Error States & Retry Actions on Academy Routes
- **Finding ID:** FRONT-02
- **Severity:** High
- **Location:**
  - `frontend/app/courses/page.tsx:55-115`
  - `frontend/app/courses/[slug]/page.tsx:39-52`
  - `frontend/app/courses/certificates/[code]/page.tsx:22-47`
- **Reproduction Steps:**
  1. Simulate backend unavailability (500 Internal Server Error or offline network).
  2. In `courses/page.tsx`, navigate to the "My Learning" tab.
  3. `Promise.allSettled` catches the network error. Because `activeTab === 'my_learning'`, `courses` is set to `[]`.
  4. The page renders the empty state: `"No Enrolled Courses Yet: Explore our catalog..."`.
  5. In `courses/certificates/[code]/page.tsx`, an API 500 error on a valid certificate code causes the page to render `"Invalid Certificate Code"` with a red alert badge.
- **User Impact:** Network failures are falsely presented as user-state facts: enrolled learners believe their progress was wiped, and users verifying valid certificates conclude the credential was rejected as fraudulent.
- **Recommended Remediation:**
  - Introduce an explicit `networkError: string | null` state across all Academy routes.
  - When API promises reject with non-404 status codes, render a resilient error banner with a `Retry Network Request` button:
    ```tsx
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white mb-1">Failed to Connect to Academy Systems</h3>
        <p className="text-xs text-zinc-400 mb-4">{networkError}</p>
        <button onClick={fetchCourses} className="btn-brand text-xs px-4 py-2 inline-flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
        </button>
    </div>
    ```

---

#### FRONT-06: Unauthenticated Direct Lesson Action Triggers Raw 401 Toast
- **Finding ID:** FRONT-06
- **Severity:** Medium
- **Location:** `frontend/app/courses/[slug]/lessons/[lessonId]/page.tsx:121-135`
- **Reproduction Steps:**
  1. Open an incognito browser window.
  2. Navigate directly to a non-preview lesson URL: `/courses/fullstack-saas-nextjs-django/lessons/lesson-2-1`.
  3. The page displays the "Enrollment Required" view.
  4. Click the "Enroll for Free" button.
  5. The handler calls `api.enrollCourse(slug)` without checking authentication.
  6. The API responds with HTTP 401 Unauthorized (`Authentication credentials were not provided`).
  7. Toast displays raw error: `"Authentication credentials were not provided"`. No redirect occurs.
- **User Impact:** Confusing dead-end for learners arriving via shared links.
- **Recommended Remediation:**
  Check authentication before dispatching `enrollCourse`:
  ```ts
  if (!user) {
      toast.error('Please sign in to enroll and access this lesson.');
      router.push(`/auth/login?next=/courses/${slug}/lessons/${lessonId}`);
      return;
  }
  ```

---

### 2. State Synchronization & Optimistic Updates

#### FRONT-03: Lesson Completion Lacks Optimistic Feedback & Desynchronizes Curriculum Drawer
- **Finding ID:** FRONT-03
- **Severity:** High
- **Location:**
  - `frontend/components/academy/LessonPlayer.tsx:52-72`
  - `frontend/app/courses/[slug]/lessons/[lessonId]/page.tsx:160-163`
- **Reproduction Steps:**
  1. Navigate to `/courses/fullstack-saas-nextjs-django/lessons/lesson-1-1`.
  2. Click "Mark Complete".
  3. On slow or throttled networks, the button remains unchanged until the backend roundtrip resolves.
  4. After completion resolves, open the Curriculum Drawer by clicking the menu button.
  5. Module 1, Lesson 1.1 does NOT show a checkmark (`les.is_completed` is false).
- **Root Cause:**
  `LessonPlayer` receives `modules` as a prop from the page. Although `onProgressUpdated` updates `lesson.is_completed`, the `modules` array passed down is never mutated or re-cloned. The slide-out drawer reads `les.is_completed` directly from `mod.lessons`, which remains static.
- **Recommended Remediation:**
  1. Implement optimistic UI update with rollback in `handleToggleComplete`:
     ```ts
     const previousState = isCompleted;
     const newState = !isCompleted;
     setIsCompleted(newState); // Optimistic immediate update
     setLocalModules(prev => updateModuleLessonStatus(prev, lesson.id, newState));
     try {
         const res = await api.toggleLessonComplete(lesson.id, newState);
         setIsCompleted(res.is_completed);
     } catch (err: any) {
         setIsCompleted(previousState); // Revert on failure
         setLocalModules(prev => updateModuleLessonStatus(prev, lesson.id, previousState));
         toast.error(err.message || 'Failed to update progress');
     }
     ```
  2. Manage `localModules` within `LessonPlayer` initialized from `props.modules`.

---

#### FRONT-05: Double-Submission Vulnerability on Assignment Submission
- **Finding ID:** FRONT-05
- **Severity:** Medium
- **Location:** `frontend/components/academy/AssignmentWorkbench.tsx:83-108`
- **Reproduction Steps:**
  1. Enter repository URL in Assignment Workbench.
  2. Press `Enter` key twice in rapid succession while focused in the text input.
  3. React batches the state change `setSubmitting(true)` asynchronously.
  4. Both keyboard event invocations pass into `handleSubmit` concurrently before `submitting` flips to `true` in component state.
  5. Two duplicate API POST requests are dispatched to `/courses/assignments/{id}/submit/`.
- **Recommended Remediation:**
  Add a synchronous execution lock or ref guard at the top of `handleSubmit`:
  ```ts
  const isSubmittingRef = useRef(false);
  ...
  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmittingRef.current || submitting) return;
      isSubmittingRef.current = true;
      setSubmitting(true);
      try {
          ...
      } finally {
          isSubmittingRef.current = false;
          setSubmitting(false);
      }
  };
  ```

---

#### BUILD-02: Video Playback Position Resume Hookup Inactive
- **Finding ID:** BUILD-02
- **Severity:** Low
- **Location:**
  - `frontend/lib/api.ts:1467-1472`
  - `frontend/components/academy/LessonPlayer.tsx:131`
- **Root Cause:**
  `api.updateLessonPosition(lessonId, positionSeconds)` exists in the client library, but `LessonPlayer.tsx` embeds videos through an unmonitored `<iframe>`. No playback timestamp is ever emitted back to the backend.
- **Recommended Remediation:**
  For embedded video or HTML5 video, implement a debounced interval (every 15s) calling `api.updateLessonPosition(lesson.id, Math.floor(currentTime))` and store `last_position_seconds` to allow resuming video playback seamlessly.

---

### 3. The Golden Bridge Deep-Link Verification

#### BRIDGE-01: Dead-End Deep-Link & Missing Search Param Parsing in Destination Routes
- **Finding ID:** BRIDGE-01
- **Severity:** Critical
- **Location:**
  - `frontend/components/academy/AssignmentWorkbench.tsx:111-117, 313-320`
  - `frontend/app/collaboration/page.tsx:1-267`
  - `frontend/app/create/page.tsx:1-421`
- **Audit Findings:**
  1. In `AssignmentWorkbench.tsx`:
     ```ts
     const bridgeParams = new URLSearchParams({
         title: assignment.title,
         tags: skillsGained.join(','),
         starter_repo: assignment.starter_repo_url || '',
         ref: 'academy_assignment',
     });
     const bridgeHref = `/collaboration?${bridgeParams.toString()}`;
     ```
     The CTA button renders:
     `<Link href={bridgeHref}>Launch Build Project in Workspaces</Link>`
  2. Inspection of destination route `/collaboration/page.tsx`:
     `/collaboration` is strictly a user's personal inbox for `CollaborationRequest` objects ("Build With" invitations sent and received).
     It contains **zero** imports of `useSearchParams`. It completely discards `title`, `tags`, `starter_repo`, and `ref`.
  3. Inspection of `/create/page.tsx`:
     This is the actual page where builders create projects, solicit teammates, and initialize workspaces.
     However, `/create/page.tsx` **also contains zero imports of `useSearchParams`**.
- **User Impact:**
  The core architectural premise of ENQUEbet Academy—funneling learners who finish capstones directly into collaborative squads and workspaces—is broken. Learners who click "Launch Build Project in Workspaces" are transported to a private message request inbox showing "No collaboration requests yet".
- **Recommended Remediation:**
  1. **Update Destination in `AssignmentWorkbench.tsx`:**
     Direct the learner to `/create` with informative prefill parameters:
     ```ts
     const bridgeParams = new URLSearchParams({
         title: `Squad: ${assignment.title}`,
         tags: skillsGained.join(','),
         starter_repo: assignment.starter_repo_url || '',
         description: `Collaborative build squad for the ENQUEbet Academy Capstone: "${assignment.title}".\n\nStarter Repository: ${assignment.starter_repo_url || 'N/A'}\n\nLooking for builders to collaborate, verify acceptance criteria, and mint Proof of Work in an active Workspace.`,
         ref: 'academy_assignment',
     });
     const bridgeHref = `/create?${bridgeParams.toString()}`;
     ```
  2. **Update `/create/page.tsx` to Ingest Search Params:**
     Wrap in `Suspense` and consume `useSearchParams`:
     ```ts
     const searchParams = useSearchParams();
     useEffect(() => {
         const title = searchParams.get('title');
         const tags = searchParams.get('tags');
         const desc = searchParams.get('description');
         if (title || tags || desc) {
             setFormData(prev => ({
                 ...prev,
                 title: title || prev.title,
                 description: desc || prev.description,
                 tags: tags ? tags.split(',').filter(Boolean) : prev.tags,
             }));
         }
     }, [searchParams]);
     ```
  3. Render a visual badge at the top of `/create`:
     ```tsx
     {searchParams.get('ref') === 'academy_assignment' && (
         <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-3">
             <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
             <div className="text-xs text-purple-200">
                 <strong className="text-white">Academy Capstone Squad:</strong> Pre-filled with capstone criteria and starter repository. Post to form your builder squad!
             </div>
         </div>
     )}
     ```

---

### 4. UX, Accessibility & Mobile Responsiveness

#### UX-01: Mobile Touch Targets Below WCAG 44x44px Standard
- **Finding ID:** UX-01
- **Severity:** High
- **Location:**
  - `frontend/components/academy/LessonPlayer.tsx:114-120, 210-215`
  - `frontend/components/academy/CourseCard.tsx:80-91`
  - `frontend/components/academy/AcademyFilterTabs.tsx:58-65`
  - `frontend/components/academy/CertificateCard.tsx:78-93`
- **Details:**
  - Curriculum Drawer Toggle: `p-2` with 16px icon = 32x32px.
  - Drawer Close Button: `p-1` with 16px icon = 24x24px.
  - Search Clear Button: `w-4 h-4` with 0px padding = 16x16px.
  - Course Card Bookmark Button: `p-2` with 14px icon = 30x30px.
- **Recommended Remediation:**
  Enforce touch targets with `min-h-[44px] min-w-[44px]` or use Tailwind `relative after:absolute after:-inset-2` to expand the hit target to >= 44x44px without altering visual layout.

---

#### FRONT-04: Mobile Bottom Nav Collides with Lesson Navigation Dock
- **Finding ID:** FRONT-04
- **Severity:** Medium
- **Location:**
  - `frontend/components/academy/LessonPlayer.tsx`
  - `frontend/components/layout/LayoutShell.tsx:30, 42`
  - `frontend/lib/contexts/NavigationContext.tsx`
- **Details:**
  `LayoutShell.tsx` contains `{!hideMobileNav && <MobileBottomNav />}`.
  While messages routes suppress the nav (`mobileView === 'chat'`), `LessonPlayer` does not consume `useNavigationUI()`.
  On mobile devices (<= 768px), the 56px fixed `MobileBottomNav` sits directly on top of the lesson dock ("Next Lesson" / "Finish Course"), requiring learners to scroll past screen boundaries to tap the buttons.
- **Recommended Remediation:**
  In `LessonPlayer.tsx`:
  ```ts
  import { useNavigationUI } from '@/lib/contexts/NavigationContext';
  ...
  const { setHideMobileNav } = useNavigationUI();
  useEffect(() => {
      setHideMobileNav(true);
      return () => { setHideMobileNav(false); };
  }, [setHideMobileNav]);
  ```

---

#### UX-02: Missing Word Breaking on Technical Markdown Paragraphs
- **Finding ID:** UX-02
- **Severity:** Medium
- **Location:** `frontend/components/ui/MarkdownRenderer.tsx:125`
- **Details:**
  `<p className="text-xs sm:text-sm text-zinc-300 leading-relaxed my-1.5">` lacks `break-words`.
  Long technical strings (e.g. `POST /api/v1/courses/fullstack-saas-nextjs-django/lessons/...`, Git commit SHAs, or Docker run parameters) cause horizontal overflow on 375px viewports.
- **Recommended Remediation:**
  Add `break-words [overflow-wrap:anywhere]` to the paragraph element and ensure the parent container includes `max-w-full overflow-hidden`.

---

#### A11Y-01: Missing ARIA Attributes, Roles and Focus Trap on Interactive Elements
- **Finding ID:** A11Y-01
- **Severity:** Medium
- **Location:**
  - `frontend/components/academy/AssignmentWorkbench.tsx:189-211`
  - `frontend/components/academy/LessonPlayer.tsx:205`
  - `frontend/components/academy/SyllabusAccordion.tsx:62-92`
  - `frontend/components/academy/AcademyFilterTabs.tsx:51, 60`
- **Details:**
  1. Acceptance criteria checklist items are buttons styled as checkboxes but lack `role="checkbox"` and `aria-checked={isChecked}`.
  2. Curriculum drawer `<aside>` lacks `role="dialog"`, `aria-modal="true"`, and `aria-label="Course curriculum"`. There is no backdrop overlay to click-dismiss, and pressing `Escape` does not close the drawer.
  3. Accordion trigger buttons lack `aria-expanded={isOpen}` and `aria-controls`.
  4. Search input lacks `aria-label="Search masterclasses"`, and clear button lacks `aria-label="Clear search query"`.
- **Recommended Remediation:**
  Add explicit WAI-ARIA roles, state attributes, and keyboard listeners across these 4 components.

---

### 5. TypeScript & Production Build Health

#### BUILD-01: TypeScript Compilation Failure in CourseCard.tsx
- **Finding ID:** BUILD-01
- **Severity:** Critical
- **Location:** `frontend/components/academy/CourseCard.tsx:44`
- **Reproduction:**
  Run `npx tsc --noEmit` in directory `frontend/`.
- **Output:**
  ```text
  components/academy/CourseCard.tsx(44,44): error TS2367: This comparison appears to be unintentional because the types 'CourseStatus' and '"completed"' have no overlap.
  ```
- **Root Cause Analysis:**
  In `types/academy.ts`:
  ```ts
  export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'archived';
  export type EnrollmentStatus = 'active' | 'completed' | 'dropped';
  ```
  In `CourseCard.tsx` line 44:
  ```ts
  const isCompleted = progress >= 100 || course.status === 'completed';
  ```
  `course.status` represents publishing state, NOT learner completion state. Comparing `course.status` to `'completed'` is a type mismatch.
- **Impact:** Next.js build (`next build`) exits with error code 1, completely breaking deployments.
- **Recommended Remediation:**
  Update line 44 in `frontend/components/academy/CourseCard.tsx`:
  ```ts
  const isCompleted = progress >= 100;
  ```
  Or if using enrollment metadata:
  ```ts
  const isCompleted = progress >= 100 || (course.is_enrolled && progress >= 100);
  ```

---

## Action Plan & Remediation Matrix

To achieve complete production readiness for ENQUEbet Academy, execute the following remediation roadmap in priority sequence:

### Phase 1: Build & Deploy Blocker (Immediate)
1. **Fix BUILD-01 in `CourseCard.tsx`:**
   Change line 44 to `const isCompleted = progress >= 100;` to immediately unblock `npx tsc --noEmit` and Next.js builds.

### Phase 2: Flow Continuity & Deep-Link Unification (Immediate)
2. **Wire The Golden Bridge (BRIDGE-01):**
   - Point `AssignmentWorkbench.tsx` button to `/create` with prefilled `title`, `tags`, `starter_repo`, and `description`.
   - Update `frontend/app/create/page.tsx` to consume `useSearchParams` and populate the creation form.
3. **Fix Return Path Amnesia (FRONT-01):**
   - In `courses/[slug]/page.tsx`, navigate to `/auth/login?next=...`.
   - In `frontend/app/login/page.tsx`, forward search query parameters.
   - In `frontend/app/auth/login/page.tsx`, redirect to `searchParams.get('next') || '/'`.

### Phase 3: State & Network Resilience
4. **Implement Optimistic Drawer State (FRONT-03):**
   Ensure `LessonPlayer.tsx` immediately updates completion state and updates local `modules` state so drawer checkmarks update without a page reload.
5. **Add Retryable Error Boundaries (FRONT-02):**
   Implement explicit network error banners with "Retry Connection" buttons on catalog, course detail, and certificate verification pages.
6. **Prevent Form Double-Submission (FRONT-05):**
   Add ref lock `if (isSubmittingRef.current) return;` in `AssignmentWorkbench.tsx`.
7. **Fix Locked Lesson Enrollment for Guests (FRONT-06):**
   Redirect to `/auth/login?next=...` instead of invoking `api.enrollCourse` when unauthenticated.

### Phase 4: UX & Accessibility Polish
8. **Hide Mobile Bottom Nav in Player (FRONT-04):**
   Call `setHideMobileNav(true)` in `LessonPlayer.tsx` to prevent collision with lesson navigation buttons.
9. **WCAG Touch Target Compliance (UX-01):**
   Ensure all buttons and chips meet the 44x44px touch target guideline.
10. **ARIA Attributes & Focus Traps (A11Y-01):**
    Add `role="checkbox"`, `aria-checked`, `aria-expanded`, and backdrop dismiss handlers.
11. **Responsive Text Wrapping (UX-02):**
    Add `break-words` to paragraph tags in `MarkdownRenderer.tsx`.
12. **Video Timestamp Telemetry (BUILD-02):**
    Implement periodic timestamp reporting via `api.updateLessonPosition`.

---

**Report Authored By:** Subagent 3 (Agent C, E & F — Frontend, UX, Golden Bridge & Production Build Auditor)  
**File Location:** `docs/academy/audit-agent-c-frontend-ux.md`
