# ENQUEbet Frontend Architecture & UX Plan: Project Workspace, Team Management, Task Board & Review System

**Document ID:** `docs/implementation/team-execution/07-frontend-plan.md`  
**Author:** Subagent F — Frontend UX Architect  
**Design Paradigm:** World-Class SaaS (Linear, Vercel, Stripe design aesthetics)  
**Target Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, React Hot Toast  
**Status:** Approved Architecture Blueprint  

---

## 1. Executive Summary & Design Vision

The core mission of ENQUEbet is transforming builder identity and collaboration intent into **executed projects, verified Proof of Work, and durable builder reputation**. 

While social features (feeds, follows, profiles) spark discovery, the **Project Workspace (`/workspace/[id]`)** is the operational engine where real building happens. The frontend architecture outlined in this document creates a fast, tactile, focused execution environment that feels like the best developer tools in the industry:
- **Linear-like Speed & Focus:** High information density, keyboard-accessible navigation, clear visual hierarchy, zero visual fluff, instant optimistic state transitions.
- **Vercel-grade Polish:** Sleek dark-mode surfaces, subtle border gradients (`--color-border-default: #1e1e30`), micro-interactions, contextual status badges, and refined typography.
- **Stripe-level Reliability:** Rock-solid confirmation modals, auditable state changes, unambiguous error states, and clear Proof of Work verification badges.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ENQUEbet Lifecycle Engine                              │
│                                                                                        │
│  Builder Discovery  ──►  Build With Request  ──►  Team Formation  ──►  WORKSPACE HUB   │
│                                                                             │          │
│  Reputation Engine  ◄──  Proof of Work Badge  ◄──  Completion Sign-off  ◄───┘          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Design System Tokens & Foundations

The workspace interface inherits and deepens ENQUEbet's existing dark theme specified in `frontend/app/globals.css`.

### 2.1 Color Tokens & Semantic Mappings

| Token Name | Hex / Value | Semantic Role in Workspace |
|---|---|---|
| `--color-bg-primary` | `#0b0b10` | Page canvas, sticky headers, modal backdrops |
| `--color-bg-card` | `#14141f` | Kanban column backgrounds, drawer surfaces, tab navigation |
| `--color-bg-card-elevated` | `#1a1a2a` | Draggable task cards, modal bodies, popover menus |
| `--color-bg-hover` | `#1f1f2e` | Interactive hover states, secondary button hover |
| `--color-border-default` | `#1e1e30` | Structural borders, column dividers, card edges |
| `--color-border-light` | `#2a2a3f` | Highlighted borders, focused inputs, active cards |
| `--color-purple` | `#8b5cf6` | Primary brand accent, milestone progress, active tabs |
| `--color-purple-dark` | `#7c3aed` | Gradient end, primary CTA buttons |
| `--color-primary` | `#38b6ff` | Information accents, code tags, collaborator highlights |
| `--color-accent-glow` | `rgba(139, 92, 246, 0.12)` | Active tab pills, subtle hover backdrops |

### 2.2 Workflow & Kanban Status Colors

```
Backlog      ──►  bg-slate-500/10    text-slate-400    border-slate-500/30
Assigned     ──►  bg-sky-500/10      text-sky-400      border-sky-500/30
In Progress  ──►  bg-amber-500/10    text-amber-400    border-amber-500/30
In Review    ──►  bg-purple-500/10   text-purple-400   border-purple-500/30
Completed    ──►  bg-emerald-500/10  text-emerald-400  border-emerald-500/30
Blocked      ──►  bg-rose-500/10     text-rose-400     border-rose-500/30
```

### 2.3 Priority Level Badges

- **Urgent (`P0`):** `bg-rose-500/20 text-rose-300 border-rose-500/40` + Flame/AlertTriangle icon
- **High (`P1`):** `bg-amber-500/20 text-amber-300 border-amber-500/40` + ArrowUp icon
- **Medium (`P2`):** `bg-sky-500/20 text-sky-300 border-sky-500/40` + Minus icon
- **Low (`P3`):** `bg-slate-500/20 text-slate-300 border-slate-500/40` + ArrowDown icon

---

## 3. URL Route Structure & Information Architecture

### 3.1 Primary Routes & State Management

| Route | Purpose | Key Query Parameters |
|---|---|---|
| `/workspace/[id]` | Main Workspace Dashboard | `?tab=overview` (default), `board`, `team`, `milestones`, `deliverables`, `activity` |
| `/workspace/[id]?tab=board&task=[taskId]` | Deep-linked Task Detail Drawer | Opens task drawer directly on top of board |
| `/workspace/[id]?tab=team&drawer=applicants` | Pending Applicants Drawer | Opens join request management sheet |
| `/workspace/[id]?tab=deliverables&submit=true` | Submit Deliverable Modal | Opens deliverable attachment flow |
| `/proof/[verificationCode]` | Public Verifiable Proof of Work | Public showcase with tamper-evident certificate |

### 3.2 Layout Shell Integration

The Workspace operates inside `frontend/components/layout/LayoutShell.tsx`.
- On desktop screens (`>= 1024px`), the main workspace container is wide and immersive:
  `className="flex-1 min-h-screen px-4 py-6 md:px-8 max-w-7xl mx-auto"`
- On widescreen monitors (`>= 1280px`), the board can toggle full-width canvas mode by minimizing the standard right sidebar.
- On mobile devices (`< 768px`), the layout collapses to a compact top bar with title, status pill, and horizontal swipe tabs with sticky column headers.

---

## 4. UI Specification: The Project Workspace Hub

### 4.1 Workspace Header Component (`WorkspaceHeader.tsx`)

The header establishes project identity, current lifecycle phase, team ownership, and macro progress.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [← Back to Project]    PROJECT: Autonomous Drone Navigation MVP        [ ACTIVE • 68% COMPLETE ]       │
│ Tag: Robotics & AI • Created by @alex_chen • Started Oct 12, 2026                                    │
│                                                                                                       │
│ Team: [AC] [SM] [JL] [RK] (+2)     [ 3 Pending Requests (Badge) ]    [ + Create Task ]  [ Options ▾ ] │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ Overview ]     [ Task Board (14) ]     [ Team (6) ]     [ Milestones (3) ]     [ Deliverables (5) ]│
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Key Capabilities:
1. **Lifecycle Status Badge:**
   - `ACTIVE`: Vibrant cyan/purple glowing dot (`bg-primary/20 text-primary border-primary/30`).
   - `COMPLETION_PENDING`: Animated pulsing amber badge with tooltip: *"Team sign-off in progress"*.
   - `COMPLETED`: Metallic emerald badge with checkmark and direct link to immutable Proof of Work.
2. **Team Avatar Stack:** Interactive stacked avatars. Clicking opens the Team Management tab.
3. **Primary Action Cluster:**
   - `+ New Task`: Primary gradient button with keyboard shortcut (`C` or `N`).
   - `Options (⋯)`: Workspace settings, Leave Workspace (for members), Archive Workspace (owner only).
4. **Sub-Navigation Tabs:**
   - Crisp border-bottom indicator (`border-b-2 border-purple`).
   - Counter badges on tabs (`Task Board (14)`, `Team (6)`, `Deliverables (5)`).

---

### 4.2 Workspace Overview Tab (`WorkspaceOverviewTab.tsx`)

A single-pane executive summary of project health, upcoming deadlines, blockers, and team velocity.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                │
│ │   Tasks Status   │  │  Next Milestone  │  │ Active Blockers  │  │ Proof Readiness  │                │
│ │  8 Done / 14 Tot │  │  Hardware v1.0   │  │   1 Blocker ⚠️   │  │  3 of 4 Criteria │                │
│ │   57% Throughput │  │  Due in 3 Days   │  │  Motor Driver IC │  │  Ready for review│                │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘                │
│                                                                                                       │
│ 🚨 URGENT BLOCKERS (1)                                                                                │
│ ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Motor driver board PWM timing issue halts field testing • Assigned to @sam_m • Reported 4h ago  │ │
│ │ [View Task #104]  [Offer Help]                                                                    │ │
│ └───────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                       │
│ 🚀 ACTIVE MILESTONE PROGRESS                                                                          │
│ ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Milestone 2: Autonomous Flight Path & Obstacle Avoidance (Due Oct 24)                             │ │
│ │ [████████████████████████████░░░░░░░░░░░░░░░░░░░░░░] 60% Complete                                  │ │
│ │ 4 Completed • 2 In Progress • 1 In Review • 1 Blocked                                             │ │
│ └───────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                       │
│ 👥 TEAM ROSTER QUICK VIEW                    🕒 RECENT WORKSPACE ACTIVITY                             │
│ ┌──────────────────────────────────────────┐ ┌──────────────────────────────────────────────────────┐ │
│ │ • Alex Chen (Lead / Firmware)            │ │ • @alex_chen moved "ROS Node Bridge" to In Review    │ │
│ │ • Sameer M. (Hardware / Circuit)         │ │ • @julia_k uploaded deliverable "Schematic_v2.pdf"   │ │
│ │ • Julia K. (Computer Vision)             │ │ • @sam_m reported a blocker on Task #104            │ │
│ │ [+ Invite / Manage Team]                 │ │ [View Full Activity Timeline →]                      │ │
│ └──────────────────────────────────────────┘ └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. UI Specification: Team Management System

### 5.1 Team Roster UI (`TeamRosterTab.tsx`)

The team view allows managing project roles, seeing online presence, and controlling access with strict confirmation guards.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TEAM MEMBERS (6)                                                       [ + Invite Builder ]           │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ BUILDER               PROJECT ROLE        TASKS ASSIGNED    JOINED DATE       ACTIONS                 │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Avatar] Alex Chen    [ Lead / Owner ▾ ]  4 tasks (2 done)  Oct 09, 2026      [ Message ] [ ⋯ ]       │
│ @alex_chen • IIT Bombay • Level 3 Verified                                                            │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Avatar] Sameer M.    [ Maintainer ▾ ]    3 tasks (1 done)  Oct 11, 2026      [ Message ] [ ⋯ ]       │
│ @sam_m • Hardware Lead • Level 2 Verified                                                             │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Avatar] Julia K.     [ Contributor ▾ ]   2 tasks (1 done)  Oct 13, 2026      [ Message ] [ ⋯ ]       │
│ @julia_k • AI Engineer • Level 1 Verified                                                             │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Roles & Permissions Matrix:
- **Lead / Owner:** Full project permissions (edit workspace, change roles, accept/reject join requests, initiate completion sign-off, archive). Non-removable unless ownership transferred.
- **Maintainer:** Can create/assign tasks, review and approve deliverables, manage join requests.
- **Contributor:** Can claim tasks, update task status, submit deliverables, leave comments.
- **Viewer / Mentor:** Read-only access to board and deliverables; can leave review feedback.

### 5.2 Pending Join Requests Drawer (`PendingRequestsDrawer.tsx`)

A slide-over drawer triggered by the header badge or team tab:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Pending Collaboration Requests (2)                                 [✕] │
├────────────────────────────────────────────────────────────────────────┤
│ [Avatar] Rahul Sharma (@rahul_s)                                       │
│ College: DTU Delhi • Level 2 Verified                                  │
│ Skills: [ROS 2 Advanced] [C++ Intermediate] [SLAM Beginner]            │
│ Pitch:                                                                 │
│ "Hey Alex! I saw the drone obstacle avoidance task. I've built SLAM    │
│ algorithms on TurtleBot and would love to contribute to the ROS bridge"│
│ Requested Role: Robotics Software Contributor                          │
│                                                                        │
│ [ Accept as Contributor ▾ ]                  [ Decline with Note ]     │
├────────────────────────────────────────────────────────────────────────┤
│ [Avatar] Priya Nair (@priya_n)                                         │
│ College: BITS Pilani • Level 1 Verified                                │
│ Skills: [React Intermediate] [Tailwind CSS Advanced]                   │
│ Pitch: "Can help build the telemetry dashboard for the drone."         │
│                                                                        │
│ [ Accept as Contributor ▾ ]                  [ Decline with Note ]     │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Role Changer & Member Removal Modals

1. **Role Changer Modal (`RoleChangerModal.tsx`):**
   - Displays builder avatar and current role.
   - Radio options with clear descriptions of permissions.
   - If transferring ownership (`Lead`), displays red warning: *"You will yield project leadership to this user. This action cannot be undone unilaterally."*
2. **Remove Member Modal (`RemoveMemberModal.tsx`):**
   - Destructive dialog requiring explicit confirmation.
   - Shows active tasks assigned to the member with option:
     - `Reassign tasks to Project Backlog` (default)
     - `Assign tasks to another member [Select ▾]`
   - Reason input field (optional) logged to the audit activity timeline.
3. **Leave Project Modal:**
   - Prevents project abandonment if unassigned critical tasks exist.
   - Leads cannot leave without transferring ownership.

---

## 6. UI Specification: The Kanban Task Board

### 6.1 Kanban Architecture & Column Layout (`TaskBoard.tsx`)

A responsive 6-column board designed with smooth horizontal pan, search filtering, priority filtering, and quick task insertion.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Filters: [🔍 Search tasks...] [Priority: All ▾] [Assignee: All ▾] [Milestone: All ▾]   [+ Add Task]   │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬────────────────────────────┤
│ BACKLOG (3)  │ ASSIGNED (2) │IN PROGRESS(4)│IN REVIEW (2) │COMPLETED (8) │ BLOCKED (1)                │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼────────────────────────────┤
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌────────────────────────┐ │
│ │ P2 • M3  │ │ │ P1 • M2  │ │ │ P0 • M2  │ │ │ P1 • M1  │ │ │ P2 • M1  │ │ │ P0 • URGENT          │ │
│ │ Telemetry│ │ │ LiDAR 3D │ │ │ ROS Node │ │ │ Motor PCB│ │ │ Auth API │ │ │ PWM Timing Failure   │ │
│ │ UI graph │ │ │ PointClod│ │ │ Bridge   │ │ │ Deliverab│ │ │ Setup    │ │ │ 📎 1 file • 💬 6      │ │
│ │ 💬 2     │ │ │ 📎 1     │ │ │ 💬 4     │ │ │ 📎 2 files│ │ │ 📎 3 files│ │ │ @sam_m                │ │
│ │ Unassigned │ @julia_k   │ │ @alex_chen │ │ @sam_m     │ │ @rahul_s   │ │ ⚠️ Needs Oscilloscope   │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └────────────────────────┘ │
│              │              │              │              │              │                            │
│ [+ Add Task] │              │ [+ Add Task] │              │              │                            │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴────────────────────────────┘
```

### 6.2 Kanban Card Anatomical Design (`TaskCard.tsx`)

Each card maximizes scannability without visual clutter:
1. **Top Row:** Priority pill (`P0 Urgent`, `P1 High`, etc.) + Milestone chip (`M2 Hardware`).
2. **Card Title:** Font-medium, 2-line clamp with high legibility.
3. **Metadata Row:**
   - Deliverable icon with attachment counter (`📎 2`).
   - Discussion counter (`💬 4`).
   - Due date indicator with semantic warning:
     - Normal: `text-text-muted` (e.g. "Oct 24")
     - Nearing (< 48 hrs): `text-amber-400 bg-amber-500/10 rounded px-1.5`
     - Overdue: `text-rose-400 bg-rose-500/10 rounded px-1.5 font-semibold`
4. **Bottom Row:**
   - Assignee Avatar with tooltip (or dashed circle `+ Claim` button if unassigned).
   - Quick-action status transition trigger (for fast touch/keyboard workflows).

### 6.3 Task Detail Drawer (`TaskDetailDrawer.tsx`)

Clicking any card opens a 640px slide-over drawer (or full-screen on mobile) that houses the task lifecycle, deliverable submissions, and peer reviews.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [← Back / Close]  TASK #108: ROS 2 Node Bridge for Telemetry       [ Delete ] [ Share ]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ STATUS:       [ In Review ▾ ]          PRIORITY:    [ P1 - High ▾ ]                    │
│ ASSIGNED TO:  [ [Avatar] Alex Chen ▾ ] MILESTONE:   [ M2: Flight Path ▾ ]              │
│ DUE DATE:     [ Oct 22, 2026 (In 2 days) ]                                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ DESCRIPTION                                                                            │
│ Create a micro-ROS bridge between the STM32 flight controller and the Raspberry Pi 5   │
│ companion computer over UART at 921600 baud. Must support IMU at 100Hz and GPS at 10Hz.│
│                                                                                        │
│ SUBTASKS / CHECKLIST (3/4 Complete)                                                    │
│ [x] Setup UART DMA circular buffers                                                    │
│ [x] Encode custom MAVLink / ROS 2 message definitions                                  │
│ [x] Bench test packet loss under simulated 100% CPU load                               │
│ [ ] In-flight bench logging test                                                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 📎 DELIVERABLES & PROOF OF WORK ATTACHMENTS (2)                    [ + Upload New File ]│
│                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 📁 ros2_bridge_firmware.zip (14.2 MB) • Uploaded by @alex_chen • Oct 18           │ │
│ │ GitHub PR: github.com/enquebet-mvp/drone-core/pull/14                              │ │
│ │ [Download / View Code]   [Verify Checksum]                                         │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 🎥 bench_test_100hz_telemetry.mp4 (45.1 MB) • Uploaded by @alex_chen • Oct 18     │ │
│ │ [Play Video Preview]                                                               │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 PEER REVIEW & APPROVALS (For 'In Review' Tasks)                                     │
│                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Review Decision for this Deliverable:                                              │ │
│ │ Maintainers & Leads can approve or request revisions.                              │ │
│ │                                                                                    │ │
│ │ [ ✓ Approve Deliverable ]           [ ↺ Request Changes with Feedback ]            │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 💬 DISCUSSION & ACTIVITY                                                               │
│                                                                                        │
│ [Avatar] Julia K. (2 hours ago):                                                       │
│ "Reviewed the DMA buffer configuration. Looks clean, packet drop is under 0.01%."      │
│                                                                                        │
│ [Write a comment or mention @teammate...]                                              │
│ [ Send Comment ]                                                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. UI Specification: Milestone Progress & Deliverables

### 7.1 Milestone Timeline & Progress Bar (`MilestonesTab.tsx`)

Milestones represent formal gates in project execution.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PROJECT MILESTONES (3)                                                  [ + New Milestone ]           │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MILESTONE 1: Hardware Specs & Component Architecture (Completed Oct 14)       [ 100% COMPLETE ✓ ]     │
│ 4 Tasks Completed • Deliverable: CAD Schematics & BOM Verified                                        │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MILESTONE 2: Autonomous Flight Path & Obstacle Avoidance (Due Oct 24)         [ 60% IN PROGRESS ]     │
│ Target: Achieve bench-tested obstacle avoidance at 2m/s indoors                                       │
│                                                                                                       │
│ Segmented Progress:                                                                                   │
│ [████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 60%                                    │
│ ■ 4 Done (Green)  ■ 1 In Review (Purple)  ■ 2 In Progress (Amber)  ■ 1 Blocked (Red)                  │
│                                                                                                       │
│ ▾ Associated Tasks (8):                                                                               │
│   • [Done ✓] Motor Driver Board Schematic (Sam M.)                                                    │
│   • [Done ✓] Camera Mounting Bracket 3D Print (Julia K.)                                              │
│   • [In Review] ROS 2 Node Bridge (Alex Chen)                                                         │
│   • [Blocked ⚠️] Motor driver PWM timing issue (Sam M.)                                                │
│   [+ Add Task to this Milestone]                                                                      │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MILESTONE 3: Field Testing, Telemetry UI & Demo Video (Due Nov 04)             [ 0% UPCOMING ]        │
│ Target: Outdoor field flight test with full video proof and open-source documentation                 │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. UI Specification: Project Completion, Proof of Work & Verification

The project completion sequence is ENQUEbet’s signature UX moment. It transitions the private workspace into an immutable, public, verifiable Proof of Work.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   COMPLETION WORKFLOW STATE MACHINE                                   │
│                                                                                                       │
│  All Tasks Done  ──►  Completion Banner  ──►  Owner Initiates  ──►  Team Sign-off Vote                │
│                                                                             │                         │
│  Reputation Minted  ◄──  Proof Badge Issued  ◄──  Consensus Reached (≥75%) ◄┘                         │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.1 Pre-Completion Trigger Banner (`CompletionBanner.tsx`)

When all tasks are moved to `COMPLETED` and required deliverables are uploaded, the workspace activates the Linear/Vercel-style glowing banner:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🚀 ALL MILESTONES COMPLETED • READY FOR FORMAL VERIFICATION                                           │
│ All 14 tasks are verified and 5 deliverables are uploaded. Initiate team completion review to mint    │
│ verified Proof of Work and distribute builder reputation points.                                       │
│                                                                                                       │
│ [ Initiate Completion Review ] (Owner Only)               [ View Deliverables Checklist ]             │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Team Multi-Sign Confirmation Modal (`CompletionVoteModal.tsx`)

To prevent fraud or credit stealing, project completion requires team sign-off:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Project Completion Confirmation & Proof Sign-Off                                  [✕] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Project: Autonomous Drone Navigation MVP                                               │
│ Total Tasks: 14 Completed • Milestone Deliverables: 5 Verified                         │
│ Final Repository: github.com/enquebet-mvp/drone-core (Commit: 8e4b2d)                  │
│ Live Demo / Video: loom.com/share/9284920492                                           │
│                                                                                        │
│ 🛡️ CONSENSUS STATUS: 3 of 4 Core Members Confirmed (Threshold: 75%)                   │
│ [████████████████████████████████████████████░░░░░░░░░░] 75% Signed                     │
│                                                                                        │
│ Contributor Sign-Offs:                                                                 │
│ • [✓ Confirmed] Alex Chen (Lead / Firmware) — Signed Oct 18, 14:22                    │
│ • [✓ Confirmed] Julia K. (Computer Vision) — Signed Oct 18, 15:10                     │
│ • [✓ Confirmed] Rahul S. (Robotics) — Signed Oct 18, 16:05                            │
│ • [⏳ Pending]  Sameer M. (Hardware Lead) — Awaiting sign-off                          │
│                                                                                        │
│ Your Action as Sameer M.:                                                              │
│ [ ✓ Confirm & Sign Project Completion ]     [ ⚠️ Dispute / Request Revision ]          │
│                                                                                        │
│ Note: Confirming certifies that all deliverables are genuine and work was distributed  │
│ fairly among team members. This action mints permanent on-chain/cryptographic proof.  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Completed Project Banner & Proof of Work Showcase

Once consensus is achieved, the workspace transitions into a read-only certified state:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏆 PROJECT OFFICIALLY COMPLETED & VERIFIED                                                            │
│ Proof of Work Certificate ID: ENQ-2026-9B4F1A • Verified on Oct 18, 2026 • Rating Round Open          │
│                                                                                                       │
│ [ 🛡️ View Proof Certificate ]   [ 📋 Copy Verification Link ]   [ Rate Teammates (Peer Review) ]     │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ TEAM CONTRIBUTOR CREDITS:                                                                             │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ ┌────────────────────────┐ │
│ │ [Avatar] Alex Chen   │ │ [Avatar] Sameer M.   │ │ [Avatar] Julia K.    │ │ [Avatar] Rahul S.      │ │
│ │ Lead Architect       │ │ Hardware Engineer    │ │ CV & Perception      │ │ Robotics Software      │ │
│ │ 6 Tasks • 2 Proofs   │ │ 3 Tasks • 1 Proof    │ │ 3 Tasks • 1 Proof    │ │ 2 Tasks • 1 Proof      │ │
│ │ +45 Reputation Pts   │ │ +35 Reputation Pts   │ │ +35 Reputation Pts   │ │ +25 Reputation Pts     │ │
│ │ [Rate Contribution]  │ │ [Rate Contribution]  │ │ [Rate Contribution]  │ │ [Rate Contribution]    │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Comprehensive Component Hierarchy & Directory Architecture

To guarantee modularity, maintainability, and code reusability, components are grouped logically under `frontend/components/workspace/`:

```
frontend/
├── app/
│   └── workspace/
│       ├── page.tsx                           # Redirects or shows user's active workspaces list
│       └── [id]/
│           └── page.tsx                       # Core dynamic workspace page hub
│
└── components/
    └── workspace/
        ├── WorkspaceHeader.tsx                # Title, lifecycle status, member avatars, actions
        ├── WorkspaceNavTabs.tsx               # Overview, Board, Team, Milestones, Deliverables
        │
        ├── overview/
        │   ├── WorkspaceOverviewTab.tsx       # KPI cards, blocker alerts, milestone snapshot
        │   ├── HealthMetricsGrid.tsx          # Throughput, upcoming due date, proof readiness
        │   └── BlockersAlertBanner.tsx        # High-visibility banner for blocked tasks
        │
        ├── board/
        │   ├── TaskBoard.tsx                  # Kanban board wrapper, drag/drop, filters, search
        │   ├── KanbanColumn.tsx               # Individual column with WIP count & quick add
        │   ├── TaskCard.tsx                   # Individual task card with priority, tags, avatars
        │   ├── TaskDetailDrawer.tsx           # Full slide-over drawer for task lifecycle & comments
        │   └── CreateTaskModal.tsx            # Modal for adding tasks with milestone & assignee
        │
        ├── team/
        │   ├── TeamRosterTab.tsx              # Full roster table, role badges, action buttons
        │   ├── MemberCard.tsx                 # Individual member row/card with stats
        │   ├── PendingRequestsDrawer.tsx      # Slide-over for managing applicant join requests
        │   ├── RoleChangerModal.tsx           # Modal for updating RBAC permissions
        │   └── RemoveMemberModal.tsx          # Confirmation modal with task reassignment flow
        │
        ├── milestones/
        │   ├── MilestonesTab.tsx              # Milestone timeline list & progress tracker
        │   ├── MilestoneCard.tsx              # Segmented progress bar, task list accordion
        │   └── CreateMilestoneModal.tsx       # Modal for creating milestone dates and goals
        │
        ├── deliverables/
        │   ├── DeliverablesTab.tsx            # Repository, demo links, file proof directory
        │   ├── DeliverableCard.tsx            # File preview, checksum, uploader attribution
        │   └── DeliverableUploadModal.tsx     # Drag-and-drop file uploader with type picker
        │
        ├── completion/
        │   ├── CompletionBanner.tsx           # Glowing pre-completion & post-completion banner
        │   ├── CompletionVoteModal.tsx        # Multi-sign consensus sign-off flow
        │   ├── ProofOfWorkBadge.tsx           # Verifiable credential badge with copyable code
        │   └── ContributorCreditsGrid.tsx     # Teammate cards with reciprocal peer review CTA
        │
        ├── activity/
        │   └── ActivityTimelineTab.tsx        # Chronological audit log of all project actions
        │
        └── skeletons/
            └── WorkspaceSkeletons.tsx         # Tailored pulse skeletons for board, team & header
```

---

## 10. TypeScript Type Definitions & API Client Architecture

### 10.1 TypeScript Domain Models (`frontend/lib/types/workspace.ts`)

```typescript
export type WorkspaceStatus = 'ACTIVE' | 'COMPLETION_PENDING' | 'COMPLETED' | 'CANCELLED';

export type TaskStatus = 'BACKLOG' | 'ASSIGNED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'BLOCKED';

export type TaskPriority = 'P0_URGENT' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';

export type MemberRole = 'LEAD' | 'MAINTAINER' | 'CONTRIBUTOR' | 'VIEWER';

export interface WorkspaceUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  college?: string;
  verification_level: number;
}

export interface WorkspaceMember {
  id: string;
  user: WorkspaceUser;
  role: MemberRole;
  joined_at: string;
  tasks_assigned_count: number;
  tasks_completed_count: number;
}

export interface WorkspaceAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_by: WorkspaceUser;
  created_at: string;
}

export interface TaskComment {
  id: string;
  user: WorkspaceUser;
  content: string;
  created_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  milestone_id?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: WorkspaceUser;
  created_by: WorkspaceUser;
  due_date?: string;
  checklist: { id: string; title: string; completed: boolean }[];
  attachments: WorkspaceAttachment[];
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  due_date: string;
  is_completed: boolean;
  tasks_count: number;
  tasks_completed_count: number;
  created_at: string;
}

export interface CompletionVote {
  id: string;
  user: WorkspaceUser;
  decision: 'CONFIRMED' | 'DISPUTED';
  feedback?: string;
  timestamp: string;
}

export interface ProofOfWork {
  id: string;
  workspace_id: string;
  verification_code: string;
  certificate_url?: string;
  repository_url?: string;
  live_demo_url?: string;
  verified_at: string;
  contributors: {
    user: WorkspaceUser;
    role: MemberRole;
    reputation_awarded: number;
  }[];
}

export interface WorkspaceDetail {
  id: string;
  post_id: string;
  title: string;
  description: string;
  category: string;
  status: WorkspaceStatus;
  progress_percentage: number;
  owner: WorkspaceUser;
  members: WorkspaceMember[];
  pending_requests_count: number;
  active_blockers_count: number;
  proof?: ProofOfWork;
  created_at: string;
  updated_at: string;
}
```

### 10.2 Extended API Client Methods (`frontend/lib/api.ts`)

```typescript
// Workspace Client Extensions
export const workspaceApi = {
  // Workspace Core
  getWorkspace: (workspaceId: string): Promise<WorkspaceDetail> =>
    api.request(`/workspace/${workspaceId}/`),

  updateWorkspace: (workspaceId: string, payload: Partial<WorkspaceDetail>): Promise<WorkspaceDetail> =>
    api.request(`/workspace/${workspaceId}/`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Tasks & Board
  getTasks: (workspaceId: string, params?: Record<string, string>): Promise<Task[]> =>
    api.request(`/workspace/${workspaceId}/tasks/?${new URLSearchParams(params)}`),

  createTask: (workspaceId: string, payload: Partial<Task>): Promise<Task> =>
    api.request(`/workspace/${workspaceId}/tasks/`, { method: 'POST', body: JSON.stringify(payload) }),

  updateTaskStatus: (taskId: string, status: TaskStatus): Promise<Task> =>
    api.request(`/tasks/${taskId}/status/`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  updateTask: (taskId: string, payload: Partial<Task>): Promise<Task> =>
    api.request(`/tasks/${taskId}/`, { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteTask: (taskId: string): Promise<void> =>
    api.request(`/tasks/${taskId}/`, { method: 'DELETE' }),

  addTaskComment: (taskId: string, content: string): Promise<TaskComment> =>
    api.request(`/tasks/${taskId}/comments/`, { method: 'POST', body: JSON.stringify({ content }) }),

  // Team & Join Requests
  getWorkspaceMembers: (workspaceId: string): Promise<WorkspaceMember[]> =>
    api.request(`/workspace/${workspaceId}/members/`),

  updateMemberRole: (workspaceId: string, userId: string, role: MemberRole): Promise<WorkspaceMember> =>
    api.request(`/workspace/${workspaceId}/members/${userId}/`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  removeMember: (workspaceId: string, userId: string, reassignTo?: string): Promise<void> =>
    api.request(`/workspace/${workspaceId}/members/${userId}/`, {
      method: 'DELETE',
      body: JSON.stringify({ reassign_tasks_to: reassignTo }),
    }),

  getPendingJoinRequests: (workspaceId: string): Promise<any[]> =>
    api.request(`/workspace/${workspaceId}/join-requests/`),

  respondJoinRequest: (requestId: string, action: 'accept' | 'reject', role?: MemberRole): Promise<void> =>
    api.request(`/join-requests/${requestId}/respond/`, {
      method: 'POST',
      body: JSON.stringify({ action, role }),
    }),

  // Milestones & Deliverables
  getMilestones: (workspaceId: string): Promise<Milestone[]> =>
    api.request(`/workspace/${workspaceId}/milestones/`),

  createMilestone: (workspaceId: string, payload: Partial<Milestone>): Promise<Milestone> =>
    api.request(`/workspace/${workspaceId}/milestones/`, { method: 'POST', body: JSON.stringify(payload) }),

  uploadDeliverable: (workspaceId: string, formData: FormData): Promise<WorkspaceAttachment> =>
    api.request(`/workspace/${workspaceId}/deliverables/`, { method: 'POST', body: formData }),

  // Completion & Proof
  initiateCompletionReview: (workspaceId: string, payload: { repo_url: string; demo_url: string }): Promise<void> =>
    api.request(`/workspace/${workspaceId}/complete/initiate/`, { method: 'POST', body: JSON.stringify(payload) }),

  submitCompletionVote: (workspaceId: string, decision: 'CONFIRMED' | 'DISPUTED', feedback?: string): Promise<void> =>
    api.request(`/workspace/${workspaceId}/complete/vote/`, {
      method: 'POST',
      body: JSON.stringify({ decision, feedback }),
    }),

  getProofOfWork: (verificationCode: string): Promise<ProofOfWork> =>
    api.request(`/proof/${verificationCode}/`),
};
```

---

## 11. Edge Cases, Loading Skeletons, Mobile Adaptation & Accessibility

### 11.1 Delightful Empty States

Never present a dead end. Every empty state provides context and a 1-click on-ramp:

1. **Empty Task Board:**
   - Visual: Subtle wireframe board icon with soft purple ambient glow.
   - Headline: *"No tasks created yet"*
   - Description: *"Break down your project goals into bite-sized tasks and assign them to builders."*
   - CTA: `[ + Create First Task ]` or `[ Generate Starter Milestones ]`
2. **No Deliverables Uploaded:**
   - Visual: Open document box icon.
   - Headline: *"No project deliverables submitted"*
   - Description: *"Attach CAD files, GitHub pull requests, Loom demo videos, or design prototypes to prepare for Proof of Work verification."*
   - CTA: `[ + Attach Deliverable ]`
3. **No Pending Applicants:**
   - Visual: Friendly builder network badge.
   - Headline: *"No pending join requests"*
   - Description: *"Your team currently has no unreviewed applications. Share your project to discover collaborators."*
   - CTA: `[ Copy Project Share Link ]`

### 11.2 Precision Skeleton Screens (`WorkspaceSkeletons.tsx`)

To avoid layout shift and jarring loading flashes:
- **Header Skeleton:** Ghost breadcrumb, 40% width title bar, 4 circular avatar placeholders, 2 button shapes.
- **Board Skeleton:** 6 columns with subtle border containers, each containing 2-3 ghost cards with pulsing priority pill and avatar circles.
- **Team Skeleton:** Table rows with circular avatar, 20% width name bar, and rectangular role pill placeholder.

```tsx
export function KanbanBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
      {[...Array(6)].map((_, colIndex) => (
        <div key={colIndex} className="bg-bg-card border border-border-default rounded-xl p-3 h-[700px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="h-4 bg-border-light rounded w-20" />
            <div className="h-4 bg-border-light rounded-full w-6" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, cardIndex) => (
              <div key={cardIndex} className="bg-bg-card-elevated border border-border-default/60 rounded-lg p-3 space-y-2">
                <div className="h-3 bg-border-light rounded w-12" />
                <div className="h-4 bg-border-light rounded w-full" />
                <div className="h-4 bg-border-light rounded w-3/4" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 w-6 bg-border-light rounded-full" />
                  <div className="h-3 bg-border-light rounded w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 11.3 Mobile-First Experience (`< 768px`)

Desktop users enjoy full multi-column horizontal flow; mobile builders need a focused, thumb-friendly UI:
1. **Swipeable Column Pills:** Rather than forcing horizontal scroll across 6 tiny columns, mobile displays a horizontal sticky tab selector:
   `[ Backlog (3) ]  [ Assigned (2) ]  [ In Progress (4) ]  [ In Review (2) ]  [ Done (8) ]`
   Selecting a pill switches the active column full-width with large cards and smooth touch targets.
2. **Bottom Sheet Drawers:** All modals (`TaskDetail`, `CreateTask`, `PendingRequests`) slide up from the bottom with pull-handles, rounded top borders, and auto-dismiss on pull-down.
3. **Safe-Area Insets:** Main views incorporate `.safe-area-bottom` to ensure action bars remain unobstructed by iOS home indicators and mobile bottom navigation.

### 11.4 Accessibility & Keyboard Ergonomics

1. **Keyboard Shortcuts:**
   - `C` or `N`: Open Create Task modal.
   - `Esc`: Close open drawers and modals.
   - `Tab` / `Shift+Tab`: Logical focus trap inside modal dialogs.
   - `1` through `5`: Quick switch between workspace tabs (Overview, Board, Team, Milestones, Deliverables).
2. **Accessible Semantics:**
   - Every column uses `role="region"` with descriptive `aria-label` (e.g. `aria-label="In Progress tasks, 4 items"`).
   - Drag-and-drop elements provide alternative keyboard actions (accessible dropdown `Move to...`).
   - High-contrast text labels ensuring WCAG AAA compliance against `--color-bg-card`.

---

## 12. Implementation Roadmap & Engineering Phases

| Step | Milestone Task | Components & Deliverables | Verification Criterion |
|---|---|---|---|
| **Phase 1** | Route Shell & Workspace Header | `app/workspace/[id]/page.tsx`, `WorkspaceHeader.tsx`, `WorkspaceNavTabs.tsx` | URL routing, tab switching, responsive header |
| **Phase 2** | Kanban Board & Task Cards | `TaskBoard.tsx`, `KanbanColumn.tsx`, `TaskCard.tsx` | 6 columns render, filter/search work, responsive tabs on mobile |
| **Phase 3** | Task Detail Drawer & Deliverables | `TaskDetailDrawer.tsx`, `DeliverableUploadModal.tsx`, task comments | Deliverable upload, checklist progress, comment submission |
| **Phase 4** | Team Management & Requests | `TeamRosterTab.tsx`, `PendingRequestsDrawer.tsx`, `RoleChangerModal.tsx` | Accept/decline requests, role changes, remove confirmation |
| **Phase 5** | Milestones & Overview | `MilestonesTab.tsx`, `WorkspaceOverviewTab.tsx`, `BlockersAlertBanner.tsx` | Segmented progress bar, blocker highlights, health metrics |
| **Phase 6** | Completion Engine & Proof Badge | `CompletionBanner.tsx`, `CompletionVoteModal.tsx`, `ProofOfWorkBadge.tsx` | Consensus multi-sign, Proof of Work badge copy, completion lock |
| **Phase 7** | Skeletons, Polish & E2E Tests | `WorkspaceSkeletons.tsx`, Playwright smoke tests, accessibility review | No layout shifts, passes WCAG checks, mobile verified |

---

## 13. Summary

This frontend plan establishes an uncompromising, world-class execution workspace for ENQUEbet. By marrying Linear's density and focus, Vercel's visual precision, and Stripe's verifiable rigor, ENQUEbet provides builders with the ultimate collaborative environment to form teams, track progress, review work, and mint permanent, proof-backed reputation.
