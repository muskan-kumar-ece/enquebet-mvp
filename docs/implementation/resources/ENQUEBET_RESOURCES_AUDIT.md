# ENQUEbet Resources System — Complete Codebase Audit Report

**Date of Audit:** October 20, 2026  
**Auditor:** Senior Frontend & Systems Architect (Antigravity Global Toolkit)  
**System Under Review:** Engineering Resources & Knowledge Sharing Platform  
**Target URL Path:** `/resources`  
**API Namespace:** `/api/v1/resources/`, `/api/v1/uploads/document/`  
**Target Environment:** Django REST Framework + PostgreSQL + Next.js App Router + Cloudinary  

---

## 1. Executive Summary

This audit establishes the definitive baseline of the existing **ENQUEbet Resources** architecture across the frontend client, backend REST API, database models, file upload pipeline, authentication, and moderation gating.

### Key Audit Findings:
1. **Approval Gate is Fully Functional:** The backend `ResourceViewSet` and `Resource` model enforce an approval-first model. New submissions strictly default to `PENDING_APPROVAL` and are invisible in the public catalog (`/api/v1/resources/`) until an authorized administrator explicitly approves them.
2. **Access Control & Object Security:** Unauthorized users attempting to view or download pending submissions receive `403 Forbidden`. Only the original uploader or an administrator can access pending submissions.
3. **Telemetry & Atomic Counters:** Atomic view increments (`F('views_count') + 1`) and atomic download increments (`F('downloads_count') + 1`) are active on both the database and REST layer.
4. **Document Storage Pipeline:** A dedicated `DocumentUploadView` handles technical assets (PDF, DOCX, TXT, Markdown, EPUB, PPTX, ZIP) up to 50 MB, streaming to Cloudinary raw storage with a resilient local storage fallback.
5. **Automated Test Coverage:** The current backend test suite `apps.resources.tests` contains **11 comprehensive tests**, all executing and passing with a 100% success rate (`11/11 OK` in 55.955s).
6. **Frontend State & Components:** A Next.js App Router page (`frontend/app/resources/page.tsx`) provides 3 operational tabs (`catalog`, `my_submissions`, and `moderation`), search, multi-level category and file-format filters, modal upload, and slide-over resource drawer.

---

## 2. Backend Architectural Inventory

### 2.1 Database Models (`backend/apps/resources/models.py`)

The primary data entity is the `Resource` model in the PostgreSQL `resources` table.

```python
class ResourceCategory(models.TextChoices):
    BOOKS_TEXTBOOKS = 'BOOKS_TEXTBOOKS', 'Books & Textbooks'
    SYSTEM_DESIGN_SPECS = 'SYSTEM_DESIGN_SPECS', 'System Design & Architecture'
    WHITEPAPERS = 'WHITEPAPERS', 'Technical Reports & Whitepapers'
    SLIDES_LECTURES = 'SLIDES_LECTURES', 'Slides & Lecture Notes'
    STARTERS_CODE = 'STARTERS_CODE', 'Starter Kits & Templates'
    CHEATSHEETS = 'CHEATSHEETS', 'Cheat Sheets & Quick Guides'
    DATASETS = 'DATASETS', 'Datasets & Benchmarks'
    OTHER = 'OTHER', 'Other Engineering Assets'

class ResourceFileType(models.TextChoices):
    PDF = 'PDF', 'PDF Document'
    DOCX = 'DOCX', 'Word Document (.docx)'
    TXT = 'TXT', 'Plain Text'
    MARKDOWN = 'MARKDOWN', 'Markdown'
    EPUB = 'EPUB', 'EPUB E-Book'
    PPTX = 'PPTX', 'Presentation Slides (.pptx)'
    ZIP = 'ZIP', 'Code Archive (.zip)'
    LINK = 'LINK', 'External Link'

class ApprovalStatus(models.TextChoices):
    PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Admin Approval'
    APPROVED = 'APPROVED', 'Approved & Public'
    REJECTED = 'REJECTED', 'Rejected'
```

#### Field Specifications:
- `id`: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- `uploader`: `ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='uploaded_resources')`
- `title`: `CharField(max_length=255)`
- `slug`: `SlugField(max_length=300, unique=True, blank=True)` — automatically derived from title with an incremental suffix counter (`save()` method) to prevent slug collision crashes.
- `description`: `TextField()`
- `category`: `CharField(max_length=32, choices=ResourceCategory.choices, db_index=True)`
- `file_type`: `CharField(max_length=16, choices=ResourceFileType.choices, db_index=True)`
- `file_url`: `URLField(max_length=800, blank=True, default='')`
- `file_size_bytes`: `BigIntegerField(null=True, blank=True)`
- `original_filename`: `CharField(max_length=255, blank=True, default='')`
- `external_link`: `URLField(max_length=800, blank=True, default='')`
- `tags`: `JSONField(default=list, blank=True)`
- `downloads_count`: `PositiveIntegerField(default=0)`
- `views_count`: `PositiveIntegerField(default=0)`
- `status`: `CharField(max_length=24, choices=ApprovalStatus.choices, default=PENDING_APPROVAL, db_index=True)`
- `reviewed_by`: `ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_resources')`
- `reviewed_at`: `DateTimeField(null=True, blank=True)`
- `rejection_reason`: `TextField(blank=True, default='')`
- `created_at`: `DateTimeField(auto_now_add=True)`
- `updated_at`: `DateTimeField(auto_now=True)`

#### Database Indexes:
- `['status', '-created_at']`
- `['category', 'status']`
- `['uploader', '-created_at']`

---

### 2.2 REST API Endpoints (`backend/apps/resources/views.py`)

Router registered under `/api/v1/resources/`:

| Endpoint | Method | Permission | Purpose & Gating Behavior |
| :--- | :--- | :--- | :--- |
| `/api/v1/resources/` | `GET` | `AllowAny` / `IsAuthenticatedOrReadOnly` | Lists resources. Query param `tab=my_submissions` requires authentication and filters by uploader. Query param `tab=moderation` strictly requires admin/staff/moderator; non-admins receive `403 Forbidden`. Default public view returns only `status=APPROVED`. |
| `/api/v1/resources/` | `POST` | `IsAuthenticated` | Submits a new resource. Mandatory validator checks that either `file_url` or `external_link` is present. Sets `status=PENDING_APPROVAL`. Returns `201 Created`. |
| `/api/v1/resources/{slug}/` | `GET` | `AllowAny` / Object-Gated | Detail view. If resource is unapproved, non-admin non-uploader requests are blocked with `403 Forbidden`. When accessed, increments `views_count` atomically via `F('views_count') + 1`. |
| `/api/v1/resources/{slug}/approve/` | `POST` | `IsAuthenticated` (Admin Only) | Transitions status to `APPROVED`, sets `reviewed_by=request.user`, records `reviewed_at=timezone.now()`, clears `rejection_reason`, and creates an in-app `Notification` for the uploader. |
| `/api/v1/resources/{slug}/reject/` | `POST` | `IsAuthenticated` (Admin Only) | Accepts `reason` or `rejection_reason` in payload. Sets status to `REJECTED`, sets `reviewed_by`, records `reviewed_at`, and sends an in-app `Notification` to the uploader containing the feedback. |
| `/api/v1/resources/{slug}/download/` | `POST` | `AllowAny` | Atomically increments `downloads_count` via `F('downloads_count') + 1`, refreshes from DB, and returns `{ download_url, downloads_count }`. |
| `/api/v1/resources/stats/` | `GET` | `AllowAny` | Aggregates platform-wide approved resource count, total downloads count, admin pending count (0 for non-admins), and user submissions count. |

---

### 2.3 File Upload Architecture (`backend/apps/uploads/views.py`)

- **Class:** `DocumentUploadView(APIView)` at `/api/v1/uploads/document/`
- **File Constraints:**
  - `MAX_DOC_UPLOAD_BYTES = 50 * 1024 * 1024` (50 Megabytes).
  - `ALLOWED_DOC_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.md', '.pptx', '.ppt', '.zip', '.tar.gz', '.epub'}`.
- **Storage Target:**
  - Cloudinary `raw` resource type under folder `enquebet/resources`.
  - Fallback to Django `default_storage` under `media/resources/` if Cloudinary credentials are not present or encounter an exception.
- **Response Contract:**
  ```json
  {
    "url": "https://res.cloudinary.com/.../enquebet/resources/document.pdf",
    "original_filename": "system-architecture-spec.pdf",
    "file_size_bytes": 4823440,
    "file_type": "PDF"
  }
  ```

---

## 3. Frontend Architecture Inventory

### 3.1 Route and State (`frontend/app/resources/page.tsx`)

- **Page Route:** `http://localhost:3000/resources`
- **Authentication Integration:** `useAuth()` hook provides `user`, `isAdmin`, and `isStaff`.
- **Active State Controls:**
  - `activeTab`: `'catalog'` | `'my_submissions'` | `'moderation'`.
  - `activeCategory`: `'ALL'` or one of 7 category codes.
  - `activeFileType`: `'ALL'` or one of 8 format codes.
  - `activeOrdering`: `'-created_at'` | `'-downloads_count'` | `'-views_count'` | `'title'`.
  - `searchQuery`: Live text filter across title, description, tags, and uploader.
- **Resilient Seed Fallback:** If the database contains zero approved resources (fresh deploy), the catalog gracefully falls back to `CURATED_SEED_RESOURCES` (`frontend/lib/resourcesData.ts`) so visitors never see a broken blank screen.

### 3.2 Modular Component Breakdown (`frontend/components/resources/`)

| Component | File Path | Responsibilities & UI Features |
| :--- | :--- | :--- |
| **`ResourceHeader`** | `ResourceHeader.tsx` | Search bar, upload action button, telemetry KPI chips (Total Resources, Total Downloads, Pending Queue). |
| **`ResourceFilterTabs`** | `ResourceFilterTabs.tsx` | View tabs (`All Catalog`, `My Submissions`, `Moderation Queue [badge]`), category pill pills, format filter buttons, sort selector. |
| **`ResourceCard`** | `ResourceCard.tsx` | Card surface (`#0c0d15`), category badge, file format pill with color-coded styles (PDF=rose, DOCX=blue, PPTX=amber, ZIP=emerald, LINK=cyan), download action, detail drawer trigger, admin approve/reject buttons. |
| **`ResourceDetailDrawer`** | `ResourceDetailDrawer.tsx` | Slide-over drawer providing full abstract/description, file metadata, uploader profile link, direct download button, and moderation action panel. |
| **`UploadResourceModal`** | `UploadResourceModal.tsx` | Two-tab submission interface: **File Upload** (drag-and-drop, auto-file-type detection) vs **External Link**. Input validation, progress indicators, admin approval reminder. |
| **`AdminRejectModal`** | `AdminRejectModal.tsx` | Dialog prompting administrator for structured feedback before marking submission as rejected. |

---

## 4. Verification & Test Execution Status

Executing `python manage.py test apps.resources --keepdb` yields:

```
Found 11 test(s).
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
...........
----------------------------------------------------------------------
Ran 11 tests in 55.955s

OK
```

All 11 automated test cases pass:
1. `test_public_catalog_only_shows_approved_resources`: Verified public catalog filters out unapproved items.
2. `test_unapproved_resource_not_accessible_by_other_user`: Verified 403 Forbidden when unauthorized user requests unapproved item.
3. `test_uploader_can_view_own_pending_resource`: Verified uploader has access to their own pending submissions.
4. `test_uploader_can_view_my_submissions`: Verified `tab=my_submissions` scopes query correctly.
5. `test_non_admin_cannot_access_moderation_queue`: Verified 403 Forbidden for non-administrators.
6. `test_admin_can_access_moderation_queue`: Verified admin can retrieve pending submissions.
7. `test_admin_can_approve_resource`: Verified transition to `APPROVED`, notification dispatch, and public availability.
8. `test_admin_can_reject_resource_with_reason`: Verified transition to `REJECTED` and reason persistence.
9. `test_non_admin_cannot_approve_or_reject`: Verified 403 Forbidden when regular users attempt moderation actions.
10. `test_resource_upload_defaults_to_pending_approval`: Verified new submissions enter `PENDING_APPROVAL`.
11. `test_download_increments_counter`: Verified atomic increment of `downloads_count` on `/download/`.

---

## 5. Security & Architectural Strengths

- **Zero Immediate Publishing:** There is no path in the code for an unauthenticated or non-admin user to publish a resource immediately.
- **Strict Role-Based Scoping:** `_is_user_admin(user)` inspects `is_staff`, `is_superuser`, and `user.role in ['admin', 'superadmin', 'moderator']`.
- **Atomic Concurrency Protection:** Views and downloads use Django `F()` expressions, avoiding lost-update race conditions under concurrent downloads.
- **Slug Stability:** Slug derivation gracefully loops with collision avoidance instead of throwing `IntegrityError`.
- **Graceful Cloudinary Degradation:** If network or Cloudinary API limits are hit, uploads fall back to local media storage cleanly.
