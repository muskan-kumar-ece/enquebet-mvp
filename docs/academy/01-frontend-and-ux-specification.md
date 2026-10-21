# ENQUEbet Academy — Frontend & UX Architecture Specification
**Document ID:** `ENQ-SPEC-ACAD-01`  
**Version:** 1.0.0 (Production Release Candidate)  
**Author:** Subagent 1 (Staff Frontend Engineer, UI/UX Architect, Senior Product Designer)  
**Status:** Approved for Implementation  
**Audience:** Core Engineering Team, Subagent 2 (Backend), Subagent 3 (QA & Security)

---

## 1. Executive Summary & Design Read

> **Design Read:** "High-density, project-first developer academy for elite software engineers, autonomous systems builders, and deeptech researchers. Minimalist, tactile Linear/Vercel/Stripe aesthetic (#090a0f canvas, cobalt #1864ff brand accent, emerald #10b981 completion accents). High information density, zero template slop, tactile physics, mobile-first responsive ergonomics."

### 1.1 The Core Mission
ENQUEbet Academy is **not a passive video-watching platform**. Existing developer courses (Coursera, Udemy, generic LMS platforms) suffer from high drop-off and zero real-world verification because they isolate learning from building. 

ENQUEbet Academy implements the closed-loop **Builder Learning Cycle**:
```
┌────────────────────────────────────────────────────────────────────────┐
│                        BUILDER LEARNING CYCLE                          │
│                                                                        │
│   [1. LEARN] ─────────> [2. PRACTICE] ────────> [3. BUILD]             │
│   Curated Lessons       Code Walkthroughs       Practical Assignments │
│   Video & Markdown      Interactive Diffs       Starter Repositories   │
│                                                        │               │
│   [5. GROW]  <───────── [4. PROVE]  <──────────────────┘               │
│   Reputation (Earned)   Workspace Squad Review                         │
│   Dossier Showcase      Verified ProofOfWork                           │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Non-Negotiable Architectural Invariants
1. **Separation of Educational Credential vs. Cryptographic Proof of Work:**
   - **`CourseCompletion`** certifies completion of an educational curriculum (`ENQ-ACAD-YYYY-XXXX`). It represents academic achievement and knowledge acquisition.
   - **`ProofOfWork`** (`apps.collaboration.ProofOfWork`) is **never auto-minted by course completion**. It can **only** be minted when real deliverables are peer-reviewed and verified inside an ENQUEbet `Workspace`.
   - **Reputation (`apps.collaboration.ReputationEvent`)** is **never inflated** by merely watching videos or passing tests. Reputation must be earned through verified project execution.
2. **Deterministic Offline & Cold-Start Resiliency:**
   - The frontend implements a canonical, high-value seed dataset (`lib/academyData.ts`) typed identically to the backend Django API. If the API is cold-starting or offline, the interface degrades gracefully with zero layout shift and zero broken images.
3. **Tactile Distraction-Free Player:**
   - The lesson player layout leverages the existing `NavigationContext` (`hideMobileNav`) and responsive drawer mechanics to maximize code/video focus without breaking navigation continuity.

---

## 2. Information Architecture & Route Sitemap

```
frontend/app/
└── courses/
    ├── page.tsx                               # 1. Academy Catalog & Learner Dashboard
    │                                          #    Tabs: [Browse Catalog] | [My Learning]
    │                                          #    Search, Filters, Pathways, Stats Bar
    │
    ├── [slug]/
    │   ├── page.tsx                           # 2. Course Overview & Curriculum Blueprint
    │   │                                      #    Two-Column: Hero, Outcomes, Modules,
    │   │                                      #    Sticky Enrollment Rail, Creator Card
    │   │
    │   ├── lessons/
    │   │   └── [lessonId]/
    │   │       └── page.tsx                   # 3. Distraction-Free Lesson Player
    │   │                                      #    Video/Markdown/Code walkthrough,
    │   │                                      #    Curriculum Drawer, Optimistic Progress
    │   │
    │   └── assignments/
    │       └── [assignmentId]/
    │           └── page.tsx                   # 4. Practical Assignment Workbench
    │                                          #    Criteria checklist, Repo/PR submission,
    │                                          #    "Launch Build Project" bridge to Workspaces
```

### 2.1 Route Parameters & URL State Schema

| Route | URL Parameters | State / Purpose |
|---|---|---|
| `/courses` | `?tab=catalog\|my_learning` | Active top-level mode (Browse vs Enrolled/Bookmarked) |
| `/courses` | `?category=AI\|SYSTEMS\|SECURITY` | Taxonomy filter |
| `/courses` | `?difficulty=BEGINNER\|INTERMEDIATE\|ADVANCED\|MASTERCLASS` | Skill tier filter |
| `/courses` | `?format=ALL\|VIDEO\|INTERACTIVE\|PROJECT_BASED` | Content delivery filter |
| `/courses` | `?tier=ALL\|FREE\|PREMIUM` | Access filter |
| `/courses` | `?q=<search_query>` | Debounced search string (300ms) |
| `/courses` | `?sort=-created_at\|-enrolled_count\|-rating` | Sorting order |
| `/courses/[slug]` | `slug` (string) | Canonical course identifier (e.g., `distributed-systems-raft`) |
| `/courses/[slug]/lessons/[lessonId]` | `lessonId` (UUID) | Active lesson playback context |
| `/courses/[slug]/assignments/[assignmentId]` | `assignmentId` (UUID) | Project workbench context |

---

## 3. Visual Design System & Design Tokens

The Academy design conforms strictly to ENQUEbet’s architectural design palette defined in `frontend/app/globals.css`.

### 3.1 Color Tokens & Material Hierarchy

```css
/* Core Canvas & Surfaces */
--color-bg-primary:       #090a0f;  /* Global app background */
--color-bg-card:          #0f111a;  /* Primary card backdrop */
--color-bg-card-elevated: #151824;  /* Modals, drawers, sticky rails */
--color-bg-hover:         #181b28;  /* Subtle interactive hover */
--color-bg-hover-light:   #222638;  /* Pressed active button state */

/* Borders & Structural Hairlines */
--color-border-default:   #1b1e2c;  /* 1px default containment borders */
--color-border-light:     #262a3e;  /* Elevated card borders / active inputs */
--color-brand-hairline:   rgba(24, 100, 255, 0.35); /* Subtle glowing accents */

/* Typography & Contrast */
--color-text-primary:     #f8fafc;  /* Headings & prominent text */
--color-text-secondary:   #94a3b8;  /* Body text, descriptions */
--color-text-muted:       #64748b;  /* Metadata, timestamps, labels */

/* Semantic Accents */
--color-brand-primary:    #1864ff;  /* Architect Cobalt primary CTA */
--color-brand-light:      #528bff;  /* Hover state cobalt */
--color-emerald-terminal: #10b981;  /* Passed criteria, completed lesson, certificate */
--color-amber-alert:      #f59e0b;  /* Pending review, in-progress, attention */
--color-crimson-destruct: #ef4444;  /* Rejection, required fix, error */
```

### 3.2 Typography Rules
- **Display Headings:** Inter/System Sans, Bold 700 / ExtraBold 800, tight tracking (`tracking-tight` / `-0.02em`).
- **Code & Telemetry Badges:** Monospace font (`font-mono`), `text-[11px]`, uppercase tracking (`tracking-wider`), paired with border hairlines (`border border-white/[0.06] bg-white/[0.04]`).
- **Body & Explanatory Prose:** Inter Sans, Regular 400 / Medium 500, `text-sm` (14px) or `text-base` (16px), line-height 1.6 (`leading-relaxed`).

### 3.3 Micro-Tactile Press Physics
All interactive elements (buttons, cards, syllabus accordions, checkboxes) must use ENQUEbet’s signature tactile baseline:
- **Hover:** Subtle 0.5px translate-up (`transform: translateY(-0.5px)`), border highlight.
- **Active / Press:** Immediate micro-scale down (`transform: scale(0.97)` / `active:scale-97`), duration 80ms, no lag.
- **Focus:** Visible accessible 2px ring in `--color-brand-primary` with 2px offset.

---

## 4. Screen-by-Screen UX & Component Blueprints

### 4.1 Screen 1: Academy Discovery & Catalog (`/courses`)

#### 4.1.1 Wireframe Layout & Visual Flow
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BANNER / TELEMETRY HERO                                                            │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [BUILDER ACADEMY · CODE TO PROOF]                                                   │ │
│ │ High-Rigor Engineering Masterclasses & Project Sprints                             │ │
│ │ Master distributed systems, hardware firmware, and AI architectures through         │ │
│ │ real codebases, peer review, and workspace deliverables.                            │ │
│ │                                                                                    │ │
│ │ [ 24 Courses ]   [ 1,420 Enrolled Builders ]   [ 380 Projects Built ]   [ 100% PoW ]│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ TABS: [ 📚 Explore Catalog (24) ]    [ 🎯 My Learning (3) ]                            │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                        │
│ SEARCH & MULTI-AXIS CONTROLS:                                                          │
│ [ 🔍 Search by skill, framework, or architectural pattern...       ] [ Sort: Popular ▾ ]│
│                                                                                        │
│ TAXONOMY CHIPS:                                                                        │
│ [ All Disciplines ] [ Systems & Cloud ] [ AI & LLM Eng ] [ Hardware ] [ Cryptography ] │
│                                                                                        │
│ SECONDARY FILTERS:                                                                     │
│ Difficulty: [All] [Beginner] [Intermediate] [Advanced] [Masterclass]                   │
│ Format:     [All] [Interactive Walkthrough] [Video Masterclass] [Project Sprint]       │
│ Tier:       [All] [Free] [Cohort / Premium]                                            │
│                                                                                        │
│ ── CURATED PATHWAYS (Horizontal Scroll / Compact Carousel) ─────────────────────────── │
│ ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐          │
│ │ Full-Stack AI Engine  │ │ High-Throughput Dist. │ │ Autonomous Embedded   │  →       │
│ │ 3 Courses · 42 hrs    │ │ 4 Courses · 68 hrs    │ │ 3 Courses · 50 hrs    │          │
│ └───────────────────────┘ └───────────────────────┘ └───────────────────────┘          │
│                                                                                        │
│ ── COURSE GRID (Responsive: 1 col mobile, 2 col tablet, 3 col desktop) ─────────────── │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐                │
│ │ [ADVANCED] [DISTRIBUTED SYSTEMS]│ │ [MASTERCLASS] [AI ARCHITECTURE] │                │
│ │ Building Raft Consensus in Go   │ │ Production LLM Eval & Serving   │                │
│ │ Implement log replication, RPC  │ │ Build high-throughput inference  │                │
│ │ protocol, and leader election.  │ │ gateway with vLLM and TensorRT. │                │
│ │                                 │ │                                 │                │
│ │ 📦 Project: Distributed KV DB   │ │ 📦 Project: Multi-Tenant Gateway│                │
│ │ ⏱ 18 hrs · 6 Modules · 24 Tasks │ │ ⏱ 24 hrs · 8 Modules · 32 Tasks │                │
│ │ 👤 Staff Eng @ CloudCorp        │ │ 👤 AI Lead @ TensorHQ           │                │
│ │ ─────────────────────────────── │ │ ─────────────────────────────── │                │
│ │ Free · Open Source              │ │ [Enrolled: 45% Complete]        │                │
│ │ [ View Syllabus & Specs → ]     │ │ [ Resume Lesson 4 → ]           │                │
│ └─────────────────────────────────┘ └─────────────────────────────────┘                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.2 Key UX Behaviors
- **Zero-Latency Instant Feedback:** URL query parameters update on filter clicks (`replaceState`) so links are shareable.
- **Debounced Search:** Query input debounces at 300ms before triggering API/canonical search.
- **My Learning Tab:** When active, instantly displays learner's active enrollments with progress meters (`45% complete`), currently active lesson quick-links, and earned completion credentials without page reloads.
- **Empty States:** When no courses match filter criteria, renders `DeveloperEmptyState` with a "Clear all filters" CTA.

---

### 4.2 Screen 2: Course Overview & Syllabus Detail (`/courses/[slug]`)

#### 4.2.1 Wireframe Layout & Visual Flow
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BREADCRUMB: Courses / Systems & Cloud / Building Raft Consensus in Go                  │
│                                                                                        │
│ ┌──────────────────────────────────────────────────┐ ┌───────────────────────────────┐ │
│ │ LEFT MAIN COLUMN (70% Desktop)                   │ │ RIGHT STICKY RAIL (30%)       │ │
│ │                                                  │ │                               │ │
│ │ [DISTRIBUTED SYSTEMS] [ADVANCED] [PROJECT-FIRST] │ │ ┌───────────────────────────┐ │ │
│ │ # Building Raft Consensus in Go                  │ │ │ [Video Preview / Poster]  │ │ │
│ │ A hands-on, production-grade masterclass in      │ │ │                           │ │ │
│ │ consensus algorithms and fault-tolerant storage. │ │ │ Free & Open Source        │ │ │
│ │                                                  │ │ │                           │ │ │
│ │ ── PRACTICAL DELIVERABLE SPOTLIGHT ───────────── │ │ │ [ ENROLL NOW / START ]    │ │ │
│ │ ┌──────────────────────────────────────────────┐ │ │ │ (or: [ RESUME LESSON 3 ])  │ │ │
│ │ │ 🛠 CAPSTONE PROJECT: Distributed KV Engine   │ │ │ │                           │ │ │
│ │ │ You will build a 3-node fault-tolerant       │ │ │ │ • 6 Modules (24 Lessons)  │ │ │
│ │ │ clustered key-value store with leader        │ │ │ │ • 18 Total Hours          │ │ │
│ │ │ election, persistent WAL, and heartbeat RPCs │ │ │ │ • 3 Practical Code Tasks  │ │ │
│ │ │ Starter Repo: github.com/enquebet/raft-go    │ │ │ │ • 1 Capstone Deliverable  │ │ │
│ │ │ Tech: Go 1.23, gRPC, Protobuf, LevelDB       │ │ │ │ • Educational Certificate │ │ │
│ │ └──────────────────────────────────────────────┘ │ │ │ • Team Project Bridge     │ │ │
│ │                                                  │ │ └───────────────────────────┘ │ │
│ │ ── CURRICULUM SYLLABUS ACCORDION ─────────────── │ │                               │ │
│ │ ▾ Module 1: Foundations of Distributed Consensus │ │ ── INSTRUCTOR DOSSIER ─────── │ │
│ │   ├─ ▶ 1.1 The Network Partition Problem (14m)   │ │ ┌───────────────────────────┐ │ │
│ │   ├─ 📄 1.2 Leader Election State Machine (22m)  │ │ │ [Avatar] Sarah Chen       │ │ │
│ │   └─ 💻 1.3 Practical: Simulating Split Brain   │ │ │ Principal Systems Eng     │ │ │
│ │                                                  │ │ │ 940 Rep · 12 Verified PoWs│ │ │
│ │ ▸ Module 2: RPC Transport & Heartbeat Protocol   │ │ │ [View Builder Profile →]  │ │ │
│ │ ▸ Module 3: Log Replication & Persistence        │ │ └───────────────────────────┘ │ │
│ │ ▸ Module 4: Dynamic Cluster Membership           │ │                               │ │
│ │ ▸ Module 5: Capstone Review & Workspace Launch   │ │ ── PREREQUISITES ──────────── │ │
│ │                                                  │ │ • Proficient in Go syntax     │ │
│ │ ── LEARNING OUTCOMES & PREREQUISITES ─────────── │ │ • Basic TCP socket knowledge  │ │
│ │ • Implement raft state transitions (Follower,    │ │ • Git workflow experience     │ │
│ │   Candidate, Leader) with strict timeout ticks.  │ │                               │ │
│ │ • Prevent split-brain split votes in network splits│                               │ │
│ └──────────────────────────────────────────────────┘ └───────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 Key UX Behaviors
- **Sticky Sidebar on Desktop:** The right rail remains fixed in viewport (`sticky top-20`) while the learner scrolls through long syllabi.
- **Mobile Responsive Dock:** On mobile screens (<1024px), the enrollment CTA docks to the bottom viewport (`fixed bottom-0 left-0 right-0 p-4 bg-bg-card/95 backdrop-blur-md safe-area-bottom z-30`) with a prominent "Enroll / Resume" button.
- **Interactive Syllabus Previews:** Prospective students can click previewable lessons (`is_previewable: true`) directly from the syllabus to sample content before enrolling.

---

### 4.3 Screen 3: Distraction-Free Lesson Player (`/courses/[slug]/lessons/[lessonId]`)

#### 4.3.1 Wireframe Layout & Visual Flow
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP PLAYER NAVIGATION BAR (Minimalist, Dark Chrome)                                    │
│ [← Exit to Course]  Building Raft Consensus / Mod 1 / Lesson 1.2: Leader Election      │
│ Progress: [████████░░░░░░░░░░░░░░] 33% (Lesson 4 of 12)    [ ☰ Syllabus ] [ ⚙ Settings]│
├────────────────────────────────────────────────────────────┬───────────────────────────┤
│ MAIN PLAYER WORKBENCH (Fluid 75% on Desktop)               │ CURRICULUM DRAWER (25%)   │
│                                                            │ (Collapsible via [☰])     │
│ ┌────────────────────────────────────────────────────────┐ │                           │
│ │ VIDEO / INTERACTIVE VIEWPORT                           │ │ ▾ Module 1: Foundations   │
│ │ ┌────────────────────────────────────────────────────┐ │ │   ✓ 1.1 Partition Problem │
│ │ │                                                    │ │ │   ▶ 1.2 Leader Election   │
│ │ │             [ HLS / MP4 Video Player ]             │ │ │         (Active · 18m)    │
│ │ │                                                    │ │ │   ○ 1.3 Task: Split Brain │
│ │ │  ▶ Play  04:12 / 18:30   1.25x   HD   [  ⛶  ]      │ │ │                           │
│ │ └────────────────────────────────────────────────────┘ │ │ ▸ Module 2: Log Replic.  │
│ │                                                        │ │ ▸ Module 3: Heartbeats    │
│ │ ── LESSON GUIDE & CODE WALKTHROUGH ─────────────────── │ │ ▸ Module 4: Capstone Proj │
│ │                                                        │ │                           │
│ │ ### The Leader Election State Machine                  │ │ ── LESSON RESOURCES ───── │
│ │ Under Raft, every server is in one of three states:    │ │ 🔗 Starter Code (GitHub)  │
│ │ `Follower`, `Candidate`, or `Leader`.                  │ │ 📄 Raft Paper (Preprint)  │
│ │                                                        │ │ 💬 Lesson Discussion (8)  │
│ │ ```go                                                  │ │                           │
│ │ type Role int                                          │ │                           │
│ │ const (                                                │ │                           │
│ │     Follower Role = iota                               │ │                           │
│ │     Candidate                                          │ │                           │
│ │     Leader                                             │ │                           │
│ │ )                                                      │ │                           │
│ │ ```                                                    │ │                           │
│ │                                                        │ │                           │
│ │ ── ACTIONABLE CHECKLIST ────────────────────────────── │ │                           │
│ │ [x] Review ElectionTimeout randomized ticker           │ │                           │
│ │ [ ] Handle RequestVoteArgs with stale Term             │ │                           │
│ └────────────────────────────────────────────────────────┘ │                           │
├────────────────────────────────────────────────────────────┴───────────────────────────┤
│ BOTTOM CONTROLS BAR (Sticky)                                                           │
│ [ ← Previous Lesson ]           [ ✓ Mark Complete & Continue Next → ]       [Next →]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 Key UX Behaviors
- **Distraction-Free Environment:**
  - Invokes `setHideMobileNav(true)` via `useNavigationUI` on mount to dismiss the global bottom bar.
  - Automatically collapses global sidebar to maximize code and video real estate.
- **Multi-Format Content Switching:**
  - Supports Markdown technical prose (via existing `MarkdownRenderer.tsx` with syntax highlighting and copy buttons).
  - Supports Video embeds with playback speed retention (0.75x, 1x, 1.25x, 1.5x, 2x).
  - Supports code walkthrough tabs with interactive file tree and step-by-step diff annotations.
- **Optimistic Progress Synchronization:**
  - Clicking "Mark Complete & Continue" updates local state immediately, fires `api.markLessonComplete(lessonId)` in background, and smoothly routes to the next sequential lesson.
  - Keyboard shortcuts enabled: `Space` (Play/Pause video), `N` (Next lesson), `P` (Previous lesson), `M` (Toggle syllabus drawer).

---

### 4.4 Screen 4: Practical Assignment Workbench & Project Launchpad (`/courses/[slug]/assignments/[assignmentId]`)

#### 4.4.1 Wireframe Layout & Visual Flow
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BREADCRUMB: Courses / Building Raft / Assignments / Capstone: Clustered KV Engine      │
│                                                                                        │
│ [PRACTICAL ASSIGNMENT] [PASSING GRADE: 80%] [DUE: SELF-PACED]                         │
│ # Capstone: Implement a 3-Node Clustered Key-Value Engine                              │
│                                                                                        │
│ ┌──────────────────────────────────────────────────┐ ┌───────────────────────────────┐ │
│ │ LEFT: INSTRUCTIONS & CRITERIA (55%)              │ │ RIGHT: SUBMISSION DOCK (45%)  │ │
│ │                                                  │ │                               │ │
│ │ ### Problem Statement                            │ │ ┌───────────────────────────┐ │ │
│ │ Construct a resilient Go service capable of with-│ │ │ SUBMISSION TERMINAL       │ │ │
│ │ standing network partitions while preserving     │ │ │ Status: [ NOT SUBMITTED ] │ │ │
│ │ linearizability for GET/SET operations.          │ │ │                           │ │ │
│ │                                                  │ │ │ GitHub Repository URL *   │ │ │
│ │ ── ACCEPTANCE CRITERIA ───────────────────────── │ │ │ [https://github.com/... ] │ │ │
│ │ ┌──────────────────────────────────────────────┐ │ │ │                           │ │ │
│ │ │ [ ] Criteria 1: Leader Election Pass (30 pts)│ │ │ │ Pull Request URL (Optional)│ │ │
│ │ │     System elects single leader within 300ms │ │ │ │ [https://github.com/... ] │ │ │
│ │ │                                              │ │ │ │                           │ │ │
│ │ │ [ ] Criteria 2: Log Consistency (40 pts)     │ │ │ │ Live Demo / Walkthrough   │ │ │
│ │ │     Entries committed on majority nodes only │ │ │ │ [https://loom.com/...   ] │ │ │
│ │ │                                              │ │ │ │                           │ │ │
│ │ │ [ ] Criteria 3: Partition Recovery (30 pts)  │ │ │ │ Architectural Write-up *  │ │ │
│ │ │     Reconnected node catches up without panic│ │ │ │ [Markdown supported...  ] │ │ │
│ │ └──────────────────────────────────────────────┘ │ │ │                           │ │ │
│ │                                                  │ │ │ [ Submit for Review → ]   │ │ │
│ │ 📦 Starter Template:                             │ │ └───────────────────────────┘ │ │
│ │ github.com/enquebet-academy/raft-consensus-starter │                               │ │
│ │                                                  │ │ ── THE PROJECT BRIDGE ─────── │ │
│ │ 💡 Squad Pro-Tip:                                │ │ ┌───────────────────────────┐ │ │
│ │ Want to build this with peer teammates instead of│ │ │ 🚀 TAKE THIS TO PRODUCTION│ │ │
│ │ solo? Launch an ENQUEbet Workspace squad!        │ │ │ Turn this assignment into │ │ │
│ │                                                  │ │ │ a real ENQUEbet Workspace │ │ │
│ │                                                  │ │ │ and earn verified PoW!    │ │ │
│ │                                                  │ │ │                           │ │ │
│ │                                                  │ │ │ [ Launch Build Squad → ]  │ │ │
│ │                                                  │ │ └───────────────────────────┘ │ │
│ └──────────────────────────────────────────────────┘ └───────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.4.2 Key UX Behaviors
- **Submission State Machine:**
  - `NOT_SUBMITTED`: Clean input fields with URL validation and markdown preview.
  - `PENDING_REVIEW`: Input locked, status badge pulses with amber indicator (`Pending Instructor / Peer Review`), displays submission timestamp.
  - `APPROVED`: Displays green terminal badge (`Passed · 95/100`), instructor feedback card, and unlocks Course Completion certificate.
  - `REVISION_REQUESTED`: Highlights failing criteria with actionable reviewer comments, allows one-click resubmission.
- **The "Launch Build Squad" Golden Bridge:**
  - Clicking `[ Launch Build Squad → ]` navigates to `/collaboration?action=create_squad` or `/workspaces` with query parameters pre-filling:
    - Project Title: `Building Clustered KV Store (Raft)`
    - Skill Tags: `["go", "distributed-systems", "raft", "grpc"]`
    - Repository Template: `https://github.com/enquebet/raft-go`
    - Deliverable Goal: `Production-ready 3-node cluster with verified benchmarks`
  - This bridges educational theory directly into ENQUEbet's core collaboration engine.

---

### 4.5 Screen 5: Learner Dashboard & Verifiable Educational Certificate (`/courses?tab=my_learning`)

#### 4.5.1 Wireframe Layout & Visual Flow
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MY LEARNING DASHBOARD                                                                  │
│                                                                                        │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │
│ │ Enrolled Courses │ │ Hours In Code    │ │ Tasks Passed     │ │ Certificates     │     │
│ │        3         │ │      34.5        │ │       18         │ │        1         │     │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘     │
│                                                                                        │
│ FILTER: [ All (3) ]  [ In Progress (2) ]  [ Completed (1) ]  [ Bookmarked (4) ]        │
│                                                                                        │
│ ── ACTIVE ENROLLMENTS ──────────────────────────────────────────────────────────────── │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Building Raft Consensus in Go                                 [ In Progress ]      │ │
│ │ Next: Lesson 1.3: Simulating Split Brain (Task) · Module 1                         │ │
│ │ Progress: [██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░] 45% (9 of 20 Lessons)       │ │
│ │ [ Continue Learning → ]                                          [ View Syllabus ] │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ── COMPLETED & CERTIFIED ───────────────────────────────────────────────────────────── │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Production LLM Eval & Serving Architecture                   [ Completed ✓ ]       │ │
│ │ Certified on Oct 14, 2026 · Credential ID: ENQ-ACAD-2026-8812                      │ │
│ │ ┌────────────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 🎓 EDUCATIONAL CREDENTIAL NOTICE:                                              │ │ │
│ │ │ This record verifies curriculum completion. To earn verified Proof of Work     │ │ │
│ │ │ and reputation points, deploy this architecture in an active Workspace.        │ │ │
│ │ └────────────────────────────────────────────────────────────────────────────────┘ │ │
│ │ [ View Verifiable Certificate 📜 ]                 [ Launch Related Workspace 🚀 ] │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.5.2 Verifiable Certificate Modal Blueprint
When a learner clicks `[ View Verifiable Certificate 📜 ]`:
- Opens high-rigor modal with millimeter blueprint grid background (`bg-blueprint-grid`).
- Renders official credential badge:
  - Header: `ENQUEbet Architectural Academy · Certificate of Completion`
  - Learner: `Full Name (@username)`
  - Course: `Course Title`
  - Unique ID: `ENQ-ACAD-2026-XXXX`
  - Cryptographic Verification URL: `https://enquebet.com/verify/cert/ENQ-ACAD-2026-XXXX`
  - Action buttons: `[ Download SVG / PNG ]`, `[ Copy Verification Link ]`, `[ Share to ENQUEbet Feed ]`.

---

## 5. Component Hierarchy & File Structure

```
frontend/
├── app/
│   └── courses/
│       ├── page.tsx                               # Discovery Catalog & My Learning View
│       ├── [slug]/
│       │   ├── page.tsx                           # Course Detail & Syllabus Overview
│       │   ├── lessons/
│       │   │   └── [lessonId]/
│       │   │       └── page.tsx                   # Distraction-Free Lesson Player
│       │   └── assignments/
│       │       └── [assignmentId]/
│       │           └── page.tsx                   # Practical Assignment Workbench
│       └── layout.tsx                             # Academy Layout Wrapper
│
├── components/
│   └── academy/
│       ├── AcademyHeader.tsx                      # Hero banner with telemetry metrics
│       ├── AcademyFilterTabs.tsx                  # Catalog vs My Learning, Category chips
│       ├── CourseCard.tsx                         # High-density course discovery card
│       ├── PathwayCard.tsx                        # Learning pathway grouping card
│       ├── CourseSyllabusAccordion.tsx            # Expandable module/lesson syllabus tree
│       ├── CourseOutcomeCard.tsx                  # Capstone project deliverable highlight
│       ├── CourseEnrollmentCard.tsx               # Sticky enrollment & pricing widget
│       ├── LessonPlayerHeader.tsx                 # Distraction-free top bar with progress
│       ├── LessonPlayerDrawer.tsx                 # Collapsible syllabus navigation drawer
│       ├── LessonVideoRenderer.tsx                # Responsive video player with speed dials
│       ├── LessonCodeWalkthrough.tsx              # Interactive code diff & file viewer
│       ├── LessonTaskChecklist.tsx                # Interactive completion checklist
│       ├── AssignmentSubmissionForm.tsx           # GitHub repo, PR, demo & markdown inputs
│       ├── AssignmentCriteriaList.tsx             # Interactive acceptance criteria list
│       ├── ProjectLaunchpadModal.tsx              # "Launch Build Squad" bridge dialog
│       └── CertificateModal.tsx                   # Verifiable educational certificate modal
│
├── lib/
│   ├── academyData.ts                             # Canonical seed courses & fallback data
│   └── api.ts                                     # Extended with Academy client methods
│
└── types/
    └── academy.ts                                 # Strict TypeScript domain interfaces
```

---

## 6. TypeScript Data Contracts & Interfaces (`types/academy.ts`)

```typescript
// types/academy.ts
// Domain Types for ENQUEbet Academy

export type CourseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'MASTERCLASS';
export type CourseFormat = 'INTERACTIVE' | 'VIDEO' | 'PROJECT_BASED' | 'HYBRID';
export type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type LessonContentType = 'VIDEO' | 'MARKDOWN' | 'CODE_WALKTHROUGH' | 'QUIZ';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED';
export type AssignmentStatus = 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REVISIONS_REQUESTED';

export interface CourseCategory {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon_name?: string;
    course_count: number;
}

export interface CourseAuthor {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    headline: string;
    reputation_score: number;
    verified_pow_count: number;
    bio?: string;
}

export interface Lesson {
    id: string;
    module_id: string;
    order: number;
    slug: string;
    title: string;
    description?: string;
    content_type: LessonContentType;
    duration_minutes: number;
    is_previewable: boolean;
    video_url?: string;
    markdown_content?: string;
    code_starter_snippet?: string;
    code_solution_snippet?: string;
    checklist_tasks?: string[];
    assignment_id?: string;
    is_completed?: boolean;
}

export interface CourseModule {
    id: string;
    course_id: string;
    order: number;
    title: string;
    description?: string;
    lessons: Lesson[];
    duration_minutes: number;
}

export interface AssignmentCriteria {
    id: string;
    description: string;
    points: number;
    is_mandatory: boolean;
}

export interface Assignment {
    id: string;
    course_id: string;
    slug: string;
    title: string;
    overview: string;
    instructions_markdown: string;
    passing_grade_percent: number;
    starter_repo_url?: string;
    criteria: AssignmentCriteria[];
    deliverable_type: 'REPOSITORY' | 'PULL_REQUEST' | 'DEPLOYED_URL' | 'SYSTEM_DEMO';
    submission?: AssignmentSubmission;
}

export interface AssignmentSubmission {
    id: string;
    assignment_id: string;
    user_id: string;
    repo_url: string;
    pr_url?: string;
    demo_url?: string;
    notes_markdown?: string;
    status: AssignmentStatus;
    score_percent?: number;
    reviewer_feedback?: string;
    submitted_at: string;
    reviewed_at?: string;
}

export interface ProjectOutcome {
    title: string;
    description: string;
    starter_repo_url?: string;
    tech_stack: string[];
    diagram_url?: string;
    deliverables: string[];
}

export interface Course {
    id: string;
    slug: string;
    title: string;
    tagline: string;
    description: string;
    category: CourseCategory;
    author: CourseAuthor;
    difficulty: CourseDifficulty;
    format: CourseFormat;
    status: CourseStatus;
    estimated_hours: number;
    is_free: boolean;
    price_paise?: number;
    thumbnail_url?: string;
    preview_video_url?: string;
    prerequisites: string[];
    learning_outcomes: string[];
    project_outcome: ProjectOutcome;
    modules: CourseModule[];
    enrolled_count: number;
    rating: number;
    rating_count: number;
    is_bookmarked?: boolean;
    enrollment?: Enrollment;
    created_at: string;
    updated_at: string;
}

export interface Enrollment {
    id: string;
    course_id: string;
    user_id: string;
    status: EnrollmentStatus;
    progress_percent: number;
    completed_lessons_count: number;
    total_lessons_count: number;
    current_lesson_id?: string;
    enrolled_at: string;
    last_accessed_at: string;
    completed_at?: string;
    completion_certificate?: CourseCompletion;
}

export interface CourseCompletion {
    id: string;
    certificate_code: string; // e.g. "ENQ-ACAD-2026-4819"
    course_id: string;
    course_title: string;
    user_id: string;
    user_name: string;
    issued_at: string;
    verification_url: string;
}

export interface AcademyStats {
    total_courses: number;
    active_learners: number;
    projects_built: number;
    total_learning_hours: number;
}
```

---

## 7. Curated Canonical Seed Courses (`lib/academyData.ts`)

To ensure **zero-slop, instant local rendering**, the academy includes 3 canonical, high-value engineering courses out of the box:

1. **Course 1: "Building Raft Consensus & Clustered Storage from Scratch in Go"**
   - **Category:** Distributed Systems & Cloud
   - **Difficulty:** Advanced | **Duration:** 18 Hours
   - **Capstone Deliverable:** 3-Node fault-tolerant clustered key-value store with leader election, persistent WAL, and heartbeat RPCs.
   - **Starter Repo:** `https://github.com/enquebet-academy/raft-consensus-go`
2. **Course 2: "Production LLM Serving, vLLM & Speculative Decoding Architecture"**
   - **Category:** AI & Machine Learning Engineering
   - **Difficulty:** Masterclass | **Duration:** 24 Hours
   - **Capstone Deliverable:** High-throughput streaming inference gateway with continuous batching, PagedAttention, and automated benchmark harness.
   - **Starter Repo:** `https://github.com/enquebet-academy/vllm-inference-gateway`
3. **Course 3: "Bare-Metal Embedded Rust & Real-Time Firmware on ARM Cortex-M"**
   - **Category:** Embedded Systems & Robotics
   - **Difficulty:** Intermediate | **Duration:** 16 Hours
   - **Capstone Deliverable:** DMA-driven sensor telemetry pipeline with zero-allocation ring buffers and hardware fault handlers.
   - **Starter Repo:** `https://github.com/enquebet-academy/cortex-m-telemetry-rust`

---

## 8. Interaction States, UX Edge Cases, & Accessibility Matrix

### 8.1 Zero-Layout-Shift Loading States
- **Course Catalog:** Renders 6 skeleton cards (`CourseCardSkeleton`) matching exact card dimensions (`min-h-[380px]`).
- **Lesson Player:** Renders 16:9 video aspect ratio placeholder (`bg-[#0c0d15] animate-pulse`) with code column skeleton.
- **Syllabus Accordions:** Smooth CSS max-height transitions (`transition-all duration-200 ease-out`), preventing jumpy scrolling.

### 8.2 Error & Offline Resilience
- **API Disconnection:** If the backend Django API fails or returns 500, the frontend automatically catches the error, toasts a discreet warning (`"Loaded curated offline catalog"`), and populates from `CANONICAL_ACADEMY_COURSES`.
- **Idempotent Progress Sync:** Lesson completion saves to browser `localStorage` first (optimistic completion checkmark), then sends `POST /api/v1/courses/lessons/{id}/progress/`. If offline, the queue retries when connection resumes.

### 8.3 WCAG AA Accessibility Standards
- **Color Contrast:** All body text meets minimum 4.5:1 ratio (`#f8fafc` on `#090a0f` exceeds 16:1; `#94a3b8` on `#0f111a` exceeds 6.2:1).
- **Keyboard Navigation:** Full keyboard operability:
  - `Tab` / `Shift+Tab`: Logical sequential focus traversal through modules and lessons.
  - `Space` / `K`: Video play/pause.
  - `Esc`: Close modal, drawer, or full-screen view.
  - `Enter`: Toggle accordion modules.
- **Screen Reader Announcements:** Dynamic progress changes use `aria-live="polite"` to announce `"Lesson marked complete. Progress updated to 45 percent."`
- **Minimum Touch Targets:** All mobile buttons, icons, and syllabus rows have minimum 44×44px hit areas.

---

## 9. Backend API Requirements Checklist (Contract for Subagent 2)

The frontend architecture expects the following RESTful endpoints in `backend/apps/courses/`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/courses/` | List published courses with filters (`category`, `difficulty`, `format`, `search`, `ordering`) |
| `GET` | `/api/v1/courses/stats/` | Platform telemetry (`total_courses`, `active_learners`, `projects_built`, etc.) |
| `GET` | `/api/v1/courses/categories/` | List active categories with course counts |
| `GET` | `/api/v1/courses/{slug}/` | Full course detail including modules, lessons, and project specs |
| `POST` | `/api/v1/courses/{slug}/enroll/` | Enroll authenticated user in course |
| `POST` | `/api/v1/courses/{slug}/bookmark/` | Toggle course bookmark |
| `POST` | `/api/v1/courses/lessons/{id}/progress/` | Idempotently record lesson completion and calculate overall course % |
| `GET` | `/api/v1/courses/my-learning/` | Retrieve user's enrolled, in-progress, completed, and bookmarked courses |
| `GET` | `/api/v1/courses/assignments/{id}/` | Retrieve assignment specs, criteria, and learner's current submission |
| `POST` | `/api/v1/courses/assignments/{id}/submit/` | Submit assignment repository URL, PR link, and writeup |
| `GET` | `/api/v1/courses/certificates/{code}/` | Public verification endpoint for educational completion certificate |

---

## 10. Summary & Handoff Recommendation

This specification provides the comprehensive, production-grade frontend and UX blueprint for ENQUEbet Academy. It eliminates generic LMS slop, anchors education around real engineering deliverables, strictly separates course certificates from cryptographic `ProofOfWork`, and directly funnels builders into ENQUEbet `Workspaces` and team collaboration.

**Ready to proceed with implementation upon coordination with Subagent 2 (Backend) and Subagent 3 (QA).**
