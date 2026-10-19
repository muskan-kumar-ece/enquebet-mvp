# ENQUEbet Resources System — Gaps & Compliance Matrix

**Date:** October 20, 2026  
**Document:** Vision vs. Codebase Gap Analysis & Compliance Assessment  
**Reference Vision:** 18-Section ENQUEbet Resource Hub Master Plan  
**Target Architecture:** Next.js App Router, Django REST Framework, PostgreSQL  

---

## 1. Compliance Classification System

- **🟢 IMPLEMENTED:** Feature exists in code, adheres to security standards, and has passing tests.
- **🟡 INCOMPLETE:** Feature partially exists or works in a minimal state, but lacks key production capabilities (e.g. metadata, bulk actions, or signals).
- **🔴 MISSING:** Feature proposed in the master plan does not exist in the codebase.
- **⚠️ DEFECTIVE / AT-RISK:** Feature exists but presents a security risk, race condition, or user friction point.

---

## 2. Comprehensive 18-Section Gap Matrix

| Section # & Master Plan Domain | Status | Current Codebase Implementation | Identified Gaps & Technical Remediation |
| :--- | :---: | :--- | :--- |
| **1. Vision & Knowledge Library Positioning** | 🟢 **IMPLEMENTED** | `frontend/app/resources/page.tsx`, `frontend/components/resources/ResourceHeader.tsx`. Clean, technical knowledge focus (System Design, Whitepapers, Code Starters). | Need curriculum tags and academic domain cross-linking (e.g., Computer Science, Electrical Engineering). |
| **2. Four Main Components** | 🟡 **INCOMPLETE** | Public Library, Contribution modal, and Moderation tab are functional. | **Missing Component #4:** Automated Trust & Anti-Spam Engine does not exist. All moderation is 100% manual. |
| **3. Public Resource Library UX** | 🟢 **IMPLEMENTED** | Search, category filtering, file-format filtering, sorting, card grid, slide-over detail drawer, download handler. | Missing inline preview for PDF documents and quick-copy citation/link button with clipboard feedback. |
| **4. Taxonomy & Supported Formats** | 🟢 **IMPLEMENTED** | `ResourceCategory` has 8 choices; `ResourceFileType` has 8 choices (`backend/apps/resources/models.py`). | Missing difficulty rating (Beginner / Intermediate / Advanced) and licensing badge (MIT, CC-BY-4.0, Public Domain). |
| **5. Resource Contribution System** | 🟡 **INCOMPLETE** | `UploadResourceModal.tsx` provides file upload and external link tabs. Basic title/description validation. | **No License/Copyright attestation checkbox**; no original author attribution field (distinguishing uploader from original author). |
| **6. Editorial & Approval Workflow** | 🟡 **INCOMPLETE** | Statuses: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`. Admin can approve or reject with reason. | **Missing States:** `CHANGES_REQUESTED` (allowing uploader to revise without re-uploading) and `QUARANTINED` / `FLAGGED` (community reporting). |
| **7. Admin Resource Studio** | 🟡 **INCOMPLETE** | Moderation tab shows pending cards with Approve/Reject buttons (`ResourceCard.tsx`). | **Missing Bulk Actions:** No batch approve/reject. No dedicated audit log table (`ResourceAuditLog`) recording who modified what status. |
| **8. Trust, Anti-Spam & Abuse Prevention** | 🔴 **MISSING** | None. No rate limits, no hash checks, no link validation. | **Critical Gaps:**<br>1. **No Rate Limiting:** An attacker can spam `POST /api/v1/resources/`. Need 5 submissions/day throttle.<br>2. **No Duplicate Hash Check:** Need SHA-256 content hashing to block duplicate files.<br>3. **No SSRF / URL Guard:** External links accept any `http` string without checking private IP/SSRF addresses.<br>4. **MIME Magic Byte Validation:** File upload relies on extension and client-sent MIME type without magic byte inspection.<br>5. **No Community Reporting:** No `POST /api/v1/resources/{slug}/report/` or auto-quarantine threshold. |
| **9. Reputation & Incentive Model** | 🔴 **MISSING** | No reputation integration with `apps.users`. | **Missing Points Trigger:** Submitting an approved resource should grant `+15` reputation points and contribute to profile badges ("Curator"). |
| **10. Saved Resources & Personal Library** | 🔴 **MISSING** | No bookmarking or personal library saving feature for resources. | **Missing Model:** `SavedResource` entity (`user`, `resource`, `created_at`).<br>Missing `POST /api/v1/resources/{slug}/save/` and `tab=saved` filter. |
| **11. Data Architecture & Models** | 🟡 **INCOMPLETE** | `Resource` model exists with UUID, slug, and indexes (`backend/apps/resources/models.py`). | **Missing Models:**<br>- `SavedResource`<br>- `ResourceReport`<br>- `ResourceAuditLog`<br>Add fields to `Resource`: `content_hash`, `license`, `author_name`. |
| **12. API Design & Security** | 🟡 **INCOMPLETE** | Standard CRUD + `/approve/`, `/reject/`, `/download/`, `/stats/`. | **Missing Endpoints:**<br>- `POST /api/v1/resources/{slug}/save/`<br>- `POST /api/v1/resources/{slug}/report/`<br>- `POST /api/v1/resources/{slug}/request-changes/`<br>- Scoped rate throttling on resource upload. |
| **13. Frontend UI/UX Architecture** | 🟢 **IMPLEMENTED** | Inter typography, `#07080c` blueprint theme, accessible modals, slide-over drawer, responsive grid. | Add "Save" bookmark button to card and drawer. Add "Report" flag trigger. Add verified badge for official docs. |
| **14. Storage & CDN Strategy** | 🟢 **IMPLEMENTED** | Cloudinary raw uploads with local storage fallback; 50 MB max document size (`apps/uploads/views.py`). | Upload endpoint should return file SHA-256 hash alongside URL and filename. |
| **15. Analytics & Quality Signals** | 🟡 **INCOMPLETE** | Atomic views (`F('views_count') + 1`) and atomic downloads (`F('downloads_count') + 1`). | Missing community helpfulness vote / rating ("Helpful" count). |
| **16. Edge Cases & Error Handling** | 🟢 **IMPLEMENTED** | Slug collisions handled via numeric suffix loop; unapproved items return 403; seed fallback on empty DB. | Add explicit user feedback when rate limit is exceeded (display retry countdown). |
| **17. Phased Implementation Roadmap** | 🟡 **INCOMPLETE** | Phase 0 audit is complete. Phases 1-5 remain to be executed. | Needs clear execution phases with zero breaking changes to existing data. |
| **18. Verification & Test Plan** | 🟢 **IMPLEMENTED** | 11 unit/integration tests passing (100% OK). | Must add test cases for Rate Limiting, SHA-256 duplicate detection, Reporting, and Bookmarking. |

---

## 3. High-Priority Architectural Vulnerabilities & Hardening Items

### 3.1 Vulnerability 1: Lack of Submission Rate Limiting
- **Current Behavior:** Authenticated users can issue unbounded `POST /api/v1/resources/` requests.
- **Risk:** Malicious script or spam bot could flood the pending queue with thousands of spam records, overwhelming admin review.
- **Remediation:** Introduce `ResourceSubmissionRateThrottle` (e.g. 10 submissions/hour per user, 25/day) via DRF's `throttle_classes`.

### 3.2 Vulnerability 2: Duplicate File Uploads (Storage & Noise Waste)
- **Current Behavior:** A user can upload the identical 45 MB PDF multiple times with different titles.
- **Risk:** Wasted cloud storage bandwidth and duplicate entries cluttering the catalog.
- **Remediation:** Compute SHA-256 hash (`content_hash`) in `DocumentUploadView` or upon saving `Resource`. Reject or alert if a resource with the identical hash already exists in `status=APPROVED` or `status=PENDING_APPROVAL`.

### 3.3 Vulnerability 3: External URL SSRF & Malicious Scheme Injection
- **Current Behavior:** External links accept any string starting with `http` without domain reputation checks or private IP filtering.
- **Risk:** Malicious users could point to internal network endpoints (`http://169.254.169.254`, `http://localhost:8000/admin`, or phishing domains).
- **Remediation:** Introduce a URL validator that parses the scheme (`http`, `https`), resolves the domain, rejects RFC1918 private IPv4/IPv6 ranges, and sanitizes against known redirect loops.

### 3.4 Vulnerability 4: Absence of Community Takedown & Reporting
- **Current Behavior:** Once an admin approves a resource, there is no in-platform mechanism for regular users to flag copyrighted material, broken links, malware, or out-of-date content.
- **Risk:** Copyright infringement liability (DMCA) and degraded library quality.
- **Remediation:** Implement `ResourceReport` model and `POST /api/v1/resources/{slug}/report/`. When a resource accumulates $\ge 3$ distinct user reports, automatically transition it to `status=QUARANTINED` and alert administrators.

---

## 4. Preservation Invariants (Non-Negotiable Rules)

1. **Existing Routes Must Not Break:** `/resources` on frontend and `/api/v1/resources/` on backend must preserve all existing query parameters (`tab`, `category`, `file_type`, `search`, `ordering`).
2. **Existing Models Must Be Backward Compatible:** Any new fields on `Resource` must have `default=...` or `null=True, blank=True` to prevent migration conflicts.
3. **Admin Moderation Hierarchy Must Be Preserved:** Non-admins must never be able to approve, reject, or inspect unapproved items belonging to other users.
4. **Pass All 11 Existing Tests:** Any enhancement must retain 100% pass rate on `apps.resources.tests`.
