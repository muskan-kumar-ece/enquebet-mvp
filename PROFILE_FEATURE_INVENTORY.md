# ENQUEbet Profile Feature Preservation Inventory

**Document Version:** 2.0.0  
**Status:** Baseline Established (Pre-Implementation Audit)  
**Governing Rule:** Every existing feature, action, tab, and workflow must be preserved with 100% backward compatibility. Zero destructive changes.

---

## 1. Inventory Matrix

| ID | Feature | File / Component Location | Data Source & Models | API Dependencies | Current Behavior | Required Enhancement | Regression Test |
|---|---|---|---|---|---|---|---|
| **F-01** | **Cover Image** | `frontend/components/profile/ProfileHero.tsx` | `user.cover_image` on `User` model | `GET /api/v1/users/me/dossier/`, `PATCH /api/v1/users/me/` | Displays top banner with fallback blueprint grid. | Keep layout, improve responsive height and aspect ratio; avoid horizontal cropping. | Verify uploaded cover banner displays; fallback renders when null. |
| **F-02** | **Profile Photo (Avatar)** | `ProfileHero.tsx`, `ImageUpload.tsx` | `user.profile_image` on `User` model | `POST /api/v1/uploads/image/`, `PATCH /api/v1/users/me/` | 144px rounded squircle with ring; initial letter fallback. | Preserve avatar positioning, ensure crisp alignment with new fluid header. | Test image upload via Cloudinary/local; test initial fallback for new users. |
| **F-03** | **Identity & Verification Badges** | `ProfileHero.tsx` | `full_name`, `username`, `verification_level` | `GET /api/v1/users/me/dossier/` | Renders full name, `@username`, and amber ShieldCheck badge if `verification_level > 0`. | Preserve exact verification shield; add support for verified role tags. | Verify level 0 hides badge; level 1+ renders shield with tooltip. |
| **F-04** | **Availability Status Beacon** | `ProfileHero.tsx`, `EditDossierModal.tsx` | `availability_status` on `User` model | `PATCH /api/v1/users/me/dossier-preferences/` | 5 statuses: `open_to_cofound`, `open_to_collaborate`, `hiring`, `open_to_work`, `focused` with animated pulse dot. | Preserve all 5 statuses and styling; surface in the new right contextual sidebar. | Test switching status in Edit Dossier modal; verify pill updates instantly. |
| **F-05** | **Edit Dossier Modal** | `frontend/components/profile/EditDossierModal.tsx` | `User`, `UserExperience`, `UserEducation`, `ProofOfWork` | `PATCH /api/v1/users/me/dossier-preferences/`, `POST /api/v1/users/me/experiences/`, `POST /api/v1/users/me/educations/` | Modal with 3 tabs: Dossier Preferences, Add Experience, Add Education; pin selector (up to 4 proofs). | Preserve all fields, tabs, and form logic; add optional certifications tab. | Open modal, edit headline, toggle pinned proof, save and verify persistence. |
| **F-06** | **Export PDF Dossier** | `ProfileHero.tsx`, `page.tsx` | Browser print / cryptographic dossier | `window.print()` / PDF export stylesheet | Opens browser print dialog formatted for cryptographic dossier export. | Ensure new layout includes clean `@media print` rules hiding sidebars and buttons. | Click Export PDF; verify print preview does not clip cards or display navigation. |
| **F-07** | **Share Dossier Permalink** | `ProfileHero.tsx` | `window.location.href` | Clipboard API (`navigator.clipboard`) | Copies URL to clipboard with checkmark state and green toast. | Preserve exact clipboard copy behavior; add native web share API where supported. | Click Share; verify toast appears and clipboard contains valid profile URL. |
| **F-08** | **Academic & Campus Credentials** | `ExperienceTimeline.tsx`, `EditDossierModal.tsx` | `UserEducation` model (`apps.users.models`) | `GET /api/v1/users/me/dossier/`, `POST /api/v1/users/me/educations/`, `DELETE /api/v1/users/educations/{id}/` | Lists institutions, degrees, fields of study, start/end years, and campus verified status with delete action. | Compact cards into sleek timeline; add optional degree honors/coursework. | Add education, verify in timeline; delete education and verify removal. |
| **F-09** | **Venture & Engineering Roles** | `ExperienceTimeline.tsx`, `EditDossierModal.tsx` | `UserExperience` model (`apps.users.models`) | `GET /api/v1/users/me/dossier/`, `POST /api/v1/users/me/experiences/`, `DELETE /api/v1/users/experiences/{id}/` | Lists company, role, location, remote tag, date range, description, skills used, and linked PoW. | Compact timeline layout; preserve linked PoW badges and delete actions. | Add experience with skills; verify tags render; delete role and verify persistence. |
| **F-10** | **Verified Builder Ledger** | `frontend/components/profile/BuilderHeatmap.tsx` | `ActivityMatrixService` (`apps.users.activity_service`) | `GET /api/v1/users/me/dossier/` -> `activity` | 52-week SVG grid (365 days) with 5 activity tiers, streak counters, and date hover tooltips. | Preserve calculation and tooltips; compact vertical padding so it breathes naturally. | Verify 365-day cells render; verify hover tooltip shows date and contribution type. |
| **F-11** | **Pinned Proofs of Work** | `frontend/components/profile/PinnedProofSection.tsx` | `ProofOfWork` model (`apps.collaboration.models`) | `GET /api/v1/users/me/dossier/` -> `pinned_proofs` | Bento cards showing `ENQ-2026-XXXX`, SHA-256 hash, workspace title, contributors, and date. | Replace oversized empty card with compact callout; keep bento grid for populated proofs. | Verify pinned proof card links to `/proof/[code]`; test empty state button. |
| **F-12** | **Verified Teammate Endorsements** | `frontend/components/profile/PeerEndorsementWall.tsx` | `PeerReview` model (`apps.collaboration.models`) | `GET /api/v1/users/me/dossier/` -> `peer_endorsements` | Displays verified reviews from teammates on completed projects with 3-category ratings. | Replace oversized empty card with compact explanation; preserve star ratings and reviewer tiers. | View endorsements; verify reviewer avatar, tier badge, and quote display cleanly. |
| **F-13** | **Explainable Reputation Radar** | `frontend/components/profile/ReputationRadar.tsx` | `ReputationService` (`apps.collaboration.reputation_service`) | `GET /api/v1/users/me/reputation/`, `POST /api/v1/users/{id}/recalculate-reputation/` | Shows total points, tier title, and 4 breakdown bars with live recalculate refresh button. | Preserve math, weights, and recalculate action; refine progress bar styling. | Click refresh button; verify loading spinner spins and score updates from server. |
| **F-14** | **Posts Tab** | `frontend/app/profile/page.tsx` | `Post` model (`apps.posts.models`) | `GET /api/v1/posts/user/{id}/` | Lists builder's created project posts with like, comment, and bookmark capabilities. | Preserve `PostCard` components, counts, and empty state; support responsive grid. | Switch to Posts tab; verify user posts load with like and comment counts. |
| **F-15** | **Living Research Tab** | `frontend/app/profile/page.tsx` | `ResearchPaper` model (`apps.research.models`) | `GET /api/v1/research/?user={id}` | Displays published research preprints, abstract, paper code, reproducibility score, and VenopAI BOM tag. | Preserve all preprint cards and `+ Publish Research Paper` button linking to `/research`. | Switch to Research tab; verify paper cards render with verification badges. |
| **F-16** | **Saved Content Tab** | `frontend/app/profile/page.tsx` | `SavedPost` model (`apps.posts.models`) | `GET /api/v1/posts/saved/` | Lists bookmarked posts with live unbookmark / save toggle. | Preserve saved post stream, loading skeleton, and empty state bookmark icon. | Switch to Saved tab; verify bookmarked posts load and unsave updates list. |
| **F-17** | **Profile Settings Tab** | `frontend/app/profile/page.tsx` | `User` model (`apps.users.models`) | `PATCH /api/v1/users/me/` | Form editing Full Name, Headline, Bio, Location, College, Campus Domain, GitHub, LinkedIn, Portfolio. | Move Profile Completeness into the right sidebar; keep settings form intact. | Edit bio and social URLs; click Save Changes; verify persistence in dossier. |
| **F-18** | **Profile Completeness Widget** | `frontend/components/ui/ProfileCompletenessCard.tsx` | Computed from 8 profile criteria on `User` | Internal calculation / `user.completeness_score` | Progress bar from 0% to 100% with list of missing items (headline, bio, avatar, skills, etc.). | Elevate to contextual right sidebar so it provides immediate guidance without navigating to Settings tab. | Test incomplete profile showing progress bar; test 100% All-Star state. |
| **F-19** | **Public User Profile View** | `frontend/app/profile/[id]/page.tsx` | Same backend dossier models | `GET /api/v1/users/{id}/dossier/`, `GET /api/v1/users/{id}/follow-status/` | Public view for other users with Follow/Unfollow toggle, Message button, and private profile redaction. | Inherit the new fluid 3-column layout while strictly respecting privacy and ownership permissions. | Open another user's profile; verify "Follow Builder" and "Message" buttons work; verify no edit buttons appear. |
| **F-20** | **Followers & Following Modal** | `frontend/components/ui/FollowersModal.tsx` | `Follower` model (`apps.users.models`) | `GET /api/v1/users/{id}/followers/`, `GET /api/v1/users/{id}/following/` | Modal listing followers/following with avatars, usernames, and follow back actions. | Preserve modal trigger and list display. | Click followers count; verify modal displays list with links to profiles. |

---

## 2. Structural & Layout Preservation Guarantees

1. **Left Navigation:** The existing `Sidebar` component in `frontend/components/layout/Sidebar.tsx` (`w-64`) remains completely untouched and active.
2. **Mobile Bottom Navigation:** `MobileBottomNav.tsx` remains completely untouched and active on mobile viewports.
3. **URL Routing & Deep Links:**
   - `/profile` (Current user authenticated profile)
   - `/profile/[id]` (Other builder public profile)
   - `/settings` (Dedicated settings route)
   - `/workspace/[id]` (Project workspaces linked from PoW cards)
   - `/proof/[code]` (Proof of Work verification certificates)
4. **Data Immutability:**
   - Immutable cryptographic Proof of Work records (`content_hash`, `verification_code`, `minted_at`) are strictly read-only.
   - Reputation weights and calculation algorithms are strictly preserved.

---

## 3. Pre-Flight Verification Sign-Off
- [x] All 20 features inspected in source code.
- [x] Component hierarchy mapped.
- [x] API endpoints and serializers verified.
- [x] No features marked for deletion.
