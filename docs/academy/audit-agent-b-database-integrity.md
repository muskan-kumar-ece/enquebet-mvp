# ENQUEbet Academy — Database, Schema & Data Integrity Audit Report
**Document ID:** `ENQ-AUDIT-ACAD-DATA-001`  
**Auditor:** Subagent 2 (Agent D: Database & Data Integrity Auditor)  
**Target Applications:** `backend/apps/courses`, `backend/apps/collaboration`, `backend/apps/users`  
**Target Database Environments:** PostgreSQL 16 (Neon / Render Production) & SQLite 3 (Local / CI)  
**Status:** Audit Complete — Action Required  

---

## 1. Executive Summary

An exhaustive audit of the database schema, migration pipelines, data integrity constraints, foreign key deletion cascades, and seed repeatability was conducted across the ENQUEbet Academy backend.

The database implementation exhibits strong engineering foundations in several key areas:
- **Consistent UUID Primary Keys:** All tables utilize `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`, avoiding distributed ID collisions and preserving compatibility across PostgreSQL and SQLite.
- **Strict Boundary Enforcement:** `CourseCompletion` is strictly an academic credential. It never mints a `ProofOfWork` and never increments `User.reputation_score`, cleanly protecting the boundary between learning and verified workspace execution.
- **Reversible Migrations:** Migration `0001_initial.py` unapplies and reapplies cleanly (`migrate courses zero` -> `migrate courses`) with zero schema discrepancies detected (`makemigrations --dry-run` reports "No changes detected").
- **Clean JSONField Callables:** All `JSONField` defaults utilize proper callable functions (`default=list`, `default=dict`) preventing shared mutable object reference corruption in Python runtimes.

However, the audit identified **12 critical, high, medium, and low vulnerabilities** that threaten production data integrity, cause cascade data loss upon user/course management actions, introduce race conditions in progress tracking and certificate issuance, and expose operational discrepancies in deployment seeding.

### Severity Breakdown
| Severity | Count | Summary of Risks |
|---|:---:|---|
| **Critical** | 1 | Course cascade deletion if instructor user account is removed (`DATA-01`). |
| **High** | 3 | Student submission cascade destruction (`DATA-02`), concurrency crash in submission creation (`DATA-03`), unbounded progress percentage allowing overflow (`DATA-04`). |
| **Medium** | 5 | Integer price representation unable to handle fractional currency (`DATA-05`), race condition in certificate issuance (`DATA-06`), missing composite index for catalog query performance (`DATA-07`), seed command naming mismatch breaking CI/CD (`DATA-08`), seed dict mutation & missing bridge records (`DATA-09`). |
| **Low** | 3 | Missing scoped DB uniqueness on lesson slugs (`DATA-10`), deprecated `unique_together` usage (`DATA-11`), redundant index definitions (`DATA-12`). |

---

## 2. Exhaustive Audit Findings Matrix

| Finding ID | Severity | File & Lines | Area | Description Summary |
|---|:---:|---|---|---|
| **DATA-01** | **Critical** | `backend/apps/courses/models.py:129-133` | Foreign Key Cascades | `Course.creator` uses `CASCADE`; deleting an author account wipes out entire courses, modules, lessons, enrollments, and submissions. |
| **DATA-02** | **High** | `backend/apps/courses/models.py:408-415` | Data Retention | `AssignmentSubmission` cascades on assignment deletion, destroying student work, PR links, and code review history. |
| **DATA-03** | **High** | `backend/apps/courses/models.py:438-444`<br>`backend/apps/courses/views.py:435-444` | Integrity & Concurrency | `views.py` calls `get_or_create` on `(assignment, learner)` but no unique constraint exists on `AssignmentSubmission`, causing `MultipleObjectsReturned` 500 errors on concurrent submissions. |
| **DATA-04** | **High** | `backend/apps/courses/models.py:276`<br>`0001_initial.py:106` | Field Validation | `Enrollment.progress_percent` lacks `MinValueValidator(0)`, `MaxValueValidator(100)` and DB `CHECK` constraint; allows integers > 100. |
| **DATA-05** | **Medium** | `backend/apps/courses/models.py:146`<br>`0001_initial.py:51` | Field Types | `price_inr` is defined as `PositiveIntegerField` instead of specified `DecimalField(max_digits=10, decimal_places=2)`, preventing fractional paise or tax handling. |
| **DATA-06** | **Medium** | `backend/apps/courses/models.py:297-330` | Concurrency & Transactions | `Enrollment.recalculate_progress` creates `CourseCompletion` without `select_for_update` or `@transaction.atomic`, causing `IntegrityError` duplicate key crashes during concurrent lesson completions. |
| **DATA-07** | **Medium** | `backend/apps/courses/models.py:157-166`<br>`0001_initial.py:227-242` | Query Indexing | Catalog sorts by `['-is_featured', '-created_at']` while filtering `status='published'`, but no composite index covers `(status, -is_featured, -created_at)`. |
| **DATA-08** | **Medium** | `backend/apps/courses/management/commands/` | DevOps & Automation | Management command file is named `seed_academy.py` while documentation and specs mandate `seed_academy_courses.py`. Running `manage.py seed_academy_courses` fails. |
| **DATA-09** | **Medium** | `backend/apps/courses/management/commands/seed_academy.py:517-554` | Seed Idempotency & Realism | In-place dict `.pop()` mutates static seed data; 3 of 4 courses lack capstone assignment lessons; `CourseProjectBridge` is never seeded. |
| **DATA-10** | **Low** | `backend/apps/courses/models.py:218, 246` | Constraints | `Lesson.slug` uniqueness is only checked in Python `save()`; lacks database-level `UniqueConstraint(fields=['module', 'slug'])`. |
| **DATA-11** | **Low** | `backend/apps/courses/models.py:201, 236, 287, 355, 496` | Django Conventions | Five models rely on deprecated `unique_together` rather than modern `models.UniqueConstraint` with explicit constraint names. |
| **DATA-12** | **Low** | `backend/apps/courses/models.py:465` | Database Indexing | `certificate_code` declares redundant `db_index=True` alongside `unique=True`. |

---

## 3. Deep-Dive Audit Findings & Remediation

### DATA-01: Catastrophic Cascade Deletion on Course Creator Removal
- **File:** `backend/apps/courses/models.py#L129-L133`
- **Severity:** Critical
- **Root Cause:**
  ```python
  creator = models.ForeignKey(
      settings.AUTH_USER_MODEL,
      on_delete=models.CASCADE,
      related_name='created_courses'
  )
  ```
- **Risk Analysis:**
  If an instructor, staff architect, or administrator account is deleted (e.g. employee departure, account deactivation, or GDPR deletion request), Django’s cascade deletion collector will recursively delete all `Course` entities created by that user.
  This triggers a catastrophic cascade:
  `Course` -> `CourseModule` (CASCADE) -> `Lesson` (CASCADE) -> `LessonProgress` (CASCADE) -> `Assignment` (CASCADE) -> `AssignmentSubmission` (CASCADE).
  If any student has completed the course, the deletion will fail with an unhandled `django.db.models.deletion.ProtectedError` because `CourseCompletion.enrollment` is `PROTECT`. This blocks user account deletion.
  If the course has active students but no completions yet, **all course content, curricula, student enrollments, and student code submissions are permanently erased from the database**.
- **Recommended Remediation:**
  Set `on_delete=models.PROTECT` or `on_delete=models.SET_NULL` (with `null=True, blank=True`). Courses must belong to the institution and must never be deleted as a side-effect of user removal:
  ```python
  creator = models.ForeignKey(
      settings.AUTH_USER_MODEL,
      on_delete=models.PROTECT,
      related_name='created_courses',
      help_text="Course author. Protected from deletion if courses exist."
  )
  ```

---

### DATA-02: Permanent Loss of Student Deliverables on Assignment Deletion
- **File:** `backend/apps/courses/models.py#L406-L415`
- **Severity:** High
- **Root Cause:**
  ```python
  class AssignmentSubmission(models.Model):
      assignment = models.ForeignKey(
          Assignment,
          on_delete=models.CASCADE,
          related_name='submissions'
      )
      learner = models.ForeignKey(
          settings.AUTH_USER_MODEL,
          on_delete=models.CASCADE,
          related_name='academy_submissions'
      )
  ```
- **Risk Analysis:**
  If an assignment is modified or deleted by staff, all associated student submissions, GitHub PR URLs, live deployment links, submission timestamps, and instructor review feedback records are immediately destroyed by `CASCADE`.
  In an accredited engineering academy, student submissions represent proof of work and learning milestones. They must be immutable and shielded from accidental deletion.
- **Recommended Remediation:**
  Change `assignment` foreign key to `on_delete=models.PROTECT`. If an assignment contains student submissions, it cannot be deleted; the course or assignment must be archived (`status='archived'`) instead:
  ```python
  assignment = models.ForeignKey(
      Assignment,
      on_delete=models.PROTECT,
      related_name='submissions'
  )
  ```

---

### DATA-03: `AssignmentSubmission` Missing Unique Constraint Causing `get_or_create` Concurrency Crash
- **File:** `backend/apps/courses/models.py#L438-L444` and `backend/apps/courses/views.py#L435-L444`
- **Severity:** High
- **Root Cause:**
  In `views.py` line 435:
  ```python
  submission, created = AssignmentSubmission.objects.get_or_create(
      assignment=assignment,
      learner=user,
      defaults={...}
  )
  ```
  However, in `models.py`, `AssignmentSubmission` has **no unique constraint** on `(assignment, learner)`:
  ```python
  class Meta:
      db_table = 'course_assignment_submissions'
      ordering = ['-created_at']
      indexes = [
          models.Index(fields=['assignment', 'status']),
          models.Index(fields=['learner', '-created_at']),
      ]
  ```
- **Risk Analysis:**
  Because there is no database-level unique constraint on `(assignment, learner)`, if a student submits a deliverable and double-clicks the "Submit" button, or if network retries send simultaneous POST requests, two identical `AssignmentSubmission` records will be inserted.
  On the next submission or view attempt, `get_or_create` executes `self.get(assignment=assignment, learner=user)`. Django will raise:
  `MultipleObjectsReturned: get() returned more than one AssignmentSubmission -- it returned 2!`
  This crashes the assignment submission endpoint with an unhandled 500 server error, permanently locking that student out of updating their submission.
- **Recommended Remediation:**
  Add a unique constraint to `AssignmentSubmission.Meta`:
  ```python
  class Meta:
      db_table = 'course_assignment_submissions'
      ordering = ['-created_at']
      constraints = [
          models.UniqueConstraint(
              fields=['assignment', 'learner'],
              name='unique_assignment_learner_submission'
          )
      ]
  ```

---

### DATA-04: Unbounded Progress Percentage Lacks Range Constraints
- **File:** `backend/apps/courses/models.py#L276` and `backend/apps/courses/migrations/0001_initial.py#L106`
- **Severity:** High
- **Root Cause:**
  In `models.py`:
  ```python
  progress_percent = models.PositiveIntegerField(default=0)
  ```
  In architectural specification `02-backend-and-database-specification.md` line 321:
  ```python
  progress_percent = models.PositiveIntegerField(
      default=0,
      validators=[MinValueValidator(0), MaxValueValidator(100)]
  )
  ```
- **Risk Analysis:**
  The model implementation omitted both the Django model validators (`MinValueValidator(0)`, `MaxValueValidator(100)`) and any database-level `CHECK` constraint.
  In SQLite and PostgreSQL, `PositiveIntegerField` allows any integer up to 2,147,483,647. If an arithmetic division bug occurs, or if an admin or API serializer performs an unchecked update, `progress_percent` can be stored as `150` or `1000`. This breaks frontend progress rings, corrupts completion percentage aggregates, and causes erratic certificate issuing logic.
- **Recommended Remediation:**
  Add field validators and an explicit `CheckConstraint`:
  ```python
  from django.core.validators import MinValueValidator, MaxValueValidator

  progress_percent = models.PositiveIntegerField(
      default=0,
      validators=[MinValueValidator(0), MaxValueValidator(100)]
  )
  # In Meta.constraints:
  models.CheckConstraint(
      check=models.Q(progress_percent__gte=0) & models.Q(progress_percent__lte=100),
      name='check_enrollment_progress_percent_range'
  )
  ```

---

### DATA-05: Currency Representation Uses Integer Rather Than Fixed-Point Decimal
- **File:** `backend/apps/courses/models.py#L146` and `backend/apps/courses/migrations/0001_initial.py#L51`
- **Severity:** Medium
- **Root Cause:**
  ```python
  price_inr = models.PositiveIntegerField(default=0)
  ```
- **Risk Analysis:**
  The specification `02-backend-and-database-specification.md` line 171 explicitly specified:
  ```python
  price_inr = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
  ```
  Financial engineering standards require fixed-point `DecimalField` for currency amounts to handle fractional values, percentage discounts, promotional pricing, and statutory taxes (e.g. 18% GST).
  Storing rupee values as an integer cannot represent paise amounts (e.g. ₹499.50), causing rounding inaccuracies during billing and reconciliation with payment gateways (Razorpay / Stripe).
- **Recommended Remediation:**
  Migrate `price_inr` to `DecimalField`:
  ```python
  from decimal import Decimal
  price_inr = models.DecimalField(
      max_digits=10,
      decimal_places=2,
      default=Decimal('0.00'),
      validators=[MinValueValidator(Decimal('0.00'))]
  )
  ```

---

### DATA-06: Concurrency Race Condition in `recalculate_progress` & Certificate Issuance
- **File:** `backend/apps/courses/models.py#L297-L330`
- **Severity:** Medium
- **Root Cause:**
  ```python
  def recalculate_progress(self):
      ...
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
- **Risk Analysis:**
  `recalculate_progress` does not execute inside an atomic transaction block and does not obtain a database row lock.
  If a student marks multiple final lessons complete in rapid succession (e.g. two browser tabs open, or automated mobile client sync), both requests execute concurrently:
  1. Thread A evaluates `not hasattr(self, 'completion')` -> True.
  2. Thread B evaluates `not hasattr(self, 'completion')` -> True.
  3. Thread A executes `CourseCompletion.objects.create(...)` -> succeeds.
  4. Thread B executes `CourseCompletion.objects.create(...)` -> crashes with `django.db.utils.IntegrityError: duplicate key value violates unique constraint "course_completions_enrollment_id_key"`.
  This results in an unhandled 500 error returned to the student's browser on the final lesson completion.
- **Recommended Remediation:**
  Wrap certificate creation in `transaction.atomic()` with `get_or_create` or `select_for_update`:
  ```python
  from django.db import transaction

  @transaction.atomic
  def recalculate_progress(self):
      enrollment = Enrollment.objects.select_for_update().get(pk=self.pk)
      ...
      if percent >= 100 and enrollment.status != EnrollmentStatus.COMPLETED:
          enrollment.status = EnrollmentStatus.COMPLETED
          enrollment.completed_at = timezone.now()
          enrollment.save(update_fields=['progress_percent', 'status', 'completed_at'])

          year = timezone.now().year
          short_hash = uuid.uuid4().hex[:8].upper()
          cert_code = f"ENQ-ACAD-{year}-{short_hash}"
          CourseCompletion.objects.get_or_create(
              enrollment=enrollment,
              defaults={
                  'certificate_code': cert_code,
                  'grade_summary': {'completed_lessons': completed_count, 'total_lessons': total_lessons}
              }
          )
  ```

---

### DATA-07: Missing Composite Index for Default Course Catalog Ordering
- **File:** `backend/apps/courses/models.py#L157-L166` and `backend/apps/courses/migrations/0001_initial.py#L227-L242`
- **Severity:** Medium
- **Root Cause:**
  Default model ordering is:
  `ordering = ['-is_featured', '-created_at']`
  The catalog list endpoint queries:
  `Course.objects.filter(status=CourseStatus.PUBLISHED).order_by('-is_featured', '-created_at')`
  However, existing indexes on `Course` are:
  - `Index(fields=['status', '-created_at'])`
  - `Index(fields=['category', 'status'])`
  - `Index(fields=['access_tier', 'status'])`
  - `Index(fields=['difficulty', 'status'])`
- **Risk Analysis:**
  There is no composite index covering `(status, -is_featured, -created_at)`.
  In PostgreSQL, as the course catalog grows, queries against the catalog will be unable to satisfy both the filter (`status = 'published'`) and the multi-column sort (`is_featured DESC, created_at DESC`) using an index scan. The query planner will be forced to perform a `Bitmap Heap Scan` followed by an in-memory `Sort` node, increasing CPU utilization and query latency.
- **Recommended Remediation:**
  Add a dedicated composite index matching the catalog query pattern:
  ```python
  models.Index(fields=['status', '-is_featured', '-created_at'], name='courses_pub_feat_created_idx')
  ```

---

### DATA-08: Management Command File Naming Discrepancy Breaking Deployment Pipelines
- **File:** `backend/apps/courses/management/commands/seed_academy.py`
- **Severity:** Medium
- **Root Cause:**
  The command implementation file is named `seed_academy.py`.
  However, the architectural specification (`docs/academy/02-backend-and-database-specification.md`), master execution plan, and audit prompt all instruct running:
  `python manage.py seed_academy_courses`
  Invoking `seed_academy_courses` outputs:
  `Unknown command: 'seed_academy_courses'. Did you mean seed_academy?`
- **Risk Analysis:**
  Any automated deployment scripts on Render/Docker or CI/CD test pipelines expecting `seed_academy_courses` will exit with code 1 and abort the release.
- **Recommended Remediation:**
  Create a wrapper command `backend/apps/courses/management/commands/seed_academy_courses.py` that delegates directly to `seed_academy.py`:
  ```python
  from apps.courses.management.commands.seed_academy import Command as SeedCommand

  class Command(SeedCommand):
      help = "Alias for seed_academy: seeds realistic engineering courses"
  ```

---

### DATA-09: In-Memory Dict Mutation & Incomplete Seed Curriculum
- **File:** `backend/apps/courses/management/commands/seed_academy.py#L517-L554`
- **Severity:** Medium
- **Root Cause:**
  1. `courses_data` is a static list. In the execution loop, keys are popped directly:
     `modules_data = cdata.pop('modules', [])`
     `assignment_data = cdata.pop('assignment', None)`
     `lessons_data = mdata.pop('lessons', [])`
     This mutates the dictionary in memory. If `handle()` is executed twice within the same process (e.g. in test suites), the second execution receives empty module and lesson lists.
  2. For Courses 2, 3, and 4 (`applied-ai-agents-vector-search`, `production-devops-docker-terraform`, `embedded-firmware-rust-freertos`), no lesson with `content_type=ContentType.ASSIGNMENT` is defined in the module. As a result, `first_lesson = Lesson.objects.filter(..., content_type=ContentType.ASSIGNMENT).first()` returns `None`, leaving `assignment.lesson = None`.
  3. Courses 2, 3, and 4 only define 1 or 2 lessons total (e.g. Course 4 has `estimated_hours=28` but only a single 25-minute lesson).
  4. The model `CourseProjectBridge` (designed to transition builders from learning to workspaces) is **never seeded** by the command.
- **Risk Analysis:**
  - Repeated in-process test runs fail or skip curriculum validation.
  - Three out of four courses fail the "Learn -> Practice -> Build -> Prove -> Grow" invariant by lacking practice modules, capstone lesson linkage, and project bridge definitions.
- **Recommended Remediation:**
  - Avoid mutating `cdata` by using `.get()` instead of `.pop()`.
  - Expand Courses 2, 3, and 4 to include complete 3-module curricula with capstone lessons.
  - Seed `CourseProjectBridge` records for all 4 courses.

---

### DATA-10: `Lesson.slug` Lacks Scoped Database Uniqueness Constraint
- **File:** `backend/apps/courses/models.py#L218, L246` and `backend/apps/courses/migrations/0001_initial.py#L134`
- **Severity:** Low
- **Root Cause:**
  `Lesson.slug = models.SlugField(max_length=255, blank=True)`
  In `Lesson.save()`, slug uniqueness is verified only in Python application code:
  `while Lesson.objects.filter(module=self.module, slug=slug).exclude(pk=self.pk).exists(): ...`
- **Risk Analysis:**
  There is no database constraint enforcing uniqueness on `(module, slug)`. Under high-concurrency curriculum authoring or bulk imports, two lessons in the same module can be assigned identical slugs.
- **Recommended Remediation:**
  Add a scoped constraint in `Lesson.Meta`:
  ```python
  constraints = [
      models.UniqueConstraint(fields=['module', 'slug'], name='unique_module_lesson_slug')
  ]
  ```

---

### DATA-11: Deprecated `unique_together` Syntax Across Core Models
- **File:** `backend/apps/courses/models.py#L201, L236, L287, L355, L496`
- **Severity:** Low
- **Root Cause:**
  Five models (`CourseModule`, `Lesson`, `Enrollment`, `LessonProgress`, `CourseBookmark`) declare constraints using the legacy syntax:
  `unique_together = [('user', 'course')]`
- **Risk Analysis:**
  Django documentation explicitly states that `unique_together` is legacy and may be deprecated in future Django releases. It generates auto-named indexes that cannot be named explicitly and does not support partial indexes or expressions.
- **Recommended Remediation:**
  Refactor all five models to `models.UniqueConstraint` in `Meta.constraints`:
  ```python
  constraints = [
      models.UniqueConstraint(fields=['course', 'order'], name='unique_course_module_order'),
  ]
  ```

---

### DATA-12: Redundant `db_index=True` on Unique Field
- **File:** `backend/apps/courses/models.py#L465`
- **Severity:** Low
- **Root Cause:**
  ```python
  certificate_code = models.CharField(max_length=64, unique=True, db_index=True)
  ```
- **Risk Analysis:**
  In relational databases (PostgreSQL and SQLite), specifying `unique=True` automatically creates a unique B-Tree index. Adding `db_index=True` is redundant. While harmless in standard Django, it adds redundant metadata and can trigger warnings in linters.
- **Recommended Remediation:**
  Remove `db_index=True` from `certificate_code`:
  ```python
  certificate_code = models.CharField(max_length=64, unique=True)
  ```

---

## 4. Verification & Testing Evidence

### 4.1 Migration Pipeline Verification
The initial migration was tested for reversibility and forward application:
```powershell
# 1. Verification of rollback
python backend/manage.py migrate courses zero
# Output:
#   Unapplying courses.0001_initial... OK

# 2. Verification of re-application
python backend/manage.py migrate courses
# Output:
#   Applying courses.0001_initial... OK

# 3. Model state parity check
python backend/manage.py makemigrations --dry-run
# Output:
#   No changes detected
```

### 4.2 Seed Script Idempotency Verification
The seed script was executed sequentially across multiple runs to verify idempotency:
```powershell
# Run 1:
python backend/manage.py seed_academy
# Output:
#   Created course: Full-Stack SaaS Engineering with Next.js 16 & Django Channels
#   Created course: Applied AI & LLM Systems: Autonomous Multi-Agent Architectures
#   Created course: Production Cloud Infrastructure & DevOps with Docker, Terraform & CI/CD
#   Created course: Embedded Systems & Firmware Engineering with Rust & FreeRTOS

# Run 2:
python backend/manage.py seed_academy
# Output:
#   Updated course: Full-Stack SaaS Engineering with Next.js 16 & Django Channels
#   Updated course: Applied AI & LLM Systems: Autonomous Multi-Agent Architectures
#   Updated course: Production Cloud Infrastructure & DevOps with Docker, Terraform & CI/CD
#   Updated course: Embedded Systems & Firmware Engineering with Rust & FreeRTOS
```

### 4.3 Unit Test Suite
Existing test suite executed with all 8 tests passing:
```
Ran 8 tests in 19.286s
OK
```

---

## 5. Architectural Invariant Compliance Check

| Platform Invariant | Specification | Actual Audit Finding | Compliance |
|---|---|---|:---:|
| **Reputation Isolation** | `CourseCompletion` MUST NOT mint `ProofOfWork` or mutate `user.reputation_score`. | Confirmed. `CourseCompletion` is strictly isolated. Verified via unit test `test_progress_completion_and_integrity_boundary`. | **PASS (100%)** |
| **UUID Keys** | All models must use `UUIDField` PKs. | Confirmed. All 8 models in `apps.courses` use UUID4 primary keys. | **PASS (100%)** |
| **JSONField Mutability** | No mutable literal defaults (`[]` or `{}`). | Confirmed. All models use callable defaults (`default=list`, `default=dict`). | **PASS (100%)** |
| **Pedagogical Invariant** | Courses must follow "Learn -> Practice -> Build -> Prove -> Grow". | Course 1 complies. Courses 2, 3, and 4 lack practice lessons and capstone lesson linkage (`DATA-09`). | **PARTIAL (25%)** |
| **Bridge to Workspaces** | Courses must link to `CourseProjectBridge` workspace templates. | Model exists in schema, but 0 bridge records are seeded in `seed_academy.py` (`DATA-09`). | **FAIL (0%)** |

---

## 6. Implementation Action Plan

To bring the database and data integrity layer to 100% production readiness:

1. **Phase 1: Remediation of Critical & High Deletion Risks (`0002_data_integrity_fixes.py`)**
   - Change `Course.creator` to `on_delete=models.PROTECT`.
   - Change `AssignmentSubmission.assignment` to `on_delete=models.PROTECT`.
   - Add `UniqueConstraint(fields=['assignment', 'learner'], name='unique_assignment_learner_submission')`.
   - Add `MinValueValidator(0)`, `MaxValueValidator(100)` and `CheckConstraint` on `progress_percent`.
   - Add composite index on `(status, -is_featured, -created_at)` for course catalog.

2. **Phase 2: Concurrency & Transaction Hardening**
   - Refactor `Enrollment.recalculate_progress` to execute inside `@transaction.atomic` with `select_for_update()`.
   - Use `get_or_create` for `CourseCompletion` to guarantee idempotent, race-condition-safe certificate generation.

3. **Phase 3: Seed Script Expansion & Aliasing**
   - Add alias command `seed_academy_courses.py`.
   - Refactor `seed_academy.py` to avoid destructive dict `.pop()`.
   - Populate complete 3-module curricula for Courses 2, 3, and 4.
   - Seed `CourseProjectBridge` records mapping each course to realistic workspace templates.
