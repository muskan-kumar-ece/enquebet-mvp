# ENQUEbet — Complete Founder & System Architecture Specification

---

## 1. Core Vision

### Fundamental Definition

**ENQUEbet** is a **Builder Reputation Platform** where individuals post Collaboration Requests, form teams, execute projects inside structured workspaces, complete them, and earn verifiable **Proof of Work** that builds their **Builder Reputation**.

> ENQUEbet is **not** social media.
> It is a **Project Completion and Builder Reputation Infrastructure.**

---

## 2. Core Problem ENQUEbet Solves

Current platforms fail in builder collaboration lifecycle:

| Platform    | Limitation                                          |
|-------------|-----------------------------------------------------|
| LinkedIn    | Shows claims, not verified building proof           |
| GitHub      | Shows code, not collaboration intent or team formation |
| Discord     | Communication only, no structured proof             |
| WhatsApp    | No identity, no structured collaboration            |
| Hackathons  | Temporary, no persistent builder identity           |

There is no system that manages the full lifecycle:

```
Idea → Team → Execution → Completion → Proof → Reputation
```

**ENQUEbet solves this.**

---

## 3. Core System Philosophy

ENQUEbet is built around one primary lifecycle:

### Collaboration Request Lifecycle

Full lifecycle pipeline:

```
Creation → Discovery → Team Formation → Workspace Execution → Completion → Proof Generation → Reputation Update
```

> This lifecycle is **permanent and immutable.**

---

## 4. Core Entities (System Objects)

These are the fundamental database objects.

---

### 4.1 User (Builder Identity)

Represents a builder.

**Fields:**

| Field               | Notes                  |
|---------------------|------------------------|
| `id`                | UUID                   |
| `email`             |                        |
| `username`          |                        |
| `full_name`         |                        |
| `bio`               |                        |
| `profile_image`     |                        |
| `college`           |                        |
| `location`          |                        |
| `verification_level`| 0–4                    |
| `reputation_score`  |                        |
| `created_at`        |                        |

**Purpose:** Defines builder identity and reputation anchor.

---

### 4.2 Skill

Represents user capability.

**Fields:** `id`, `name`

**Purpose:** Enables matching and discovery.

---

### 4.3 UserSkill

Relationship between user and skill.

**Fields:** `user_id`, `skill_id`, `level`

---

### 4.4 CollaborationRequest *(Core Object)*

Primary system object. Represents intent to collaborate.

**Fields:**

| Field             | Notes                                   |
|-------------------|-----------------------------------------|
| `id`              |                                         |
| `owner_id`        |                                         |
| `title`           |                                         |
| `description`     |                                         |
| `required_roles`  |                                         |
| `required_skills` |                                         |
| `location`        |                                         |
| `college`         |                                         |
| `is_remote`       |                                         |
| `max_members`     |                                         |
| `project_type`    |                                         |
| `difficulty_level`|                                         |
| `deadline`        |                                         |
| `status`          | See Status Lifecycle below              |
| `created_at`      |                                         |

**Status Lifecycle:**

```
DRAFT → OPEN → IN_PROGRESS → COMPLETED
                    ↓
                CANCELLED
```

**Purpose:** Root object of collaboration lifecycle. Everything connects to this.

---

### 4.5 JoinRequest

Represents request to join collaboration.

**Fields:** `id`, `collaboration_id`, `user_id`, `message`, `status`

**Status:** `PENDING` / `ACCEPTED` / `REJECTED`

**Purpose:** Controls team formation.

---

### 4.6 TeamMember

Represents membership in collaboration.

**Fields:** `id`, `collaboration_id`, `user_id`, `role`, `state`

**State:** `ACTIVE` / `LEFT` / `REMOVED` / `COMPLETED`

> **Important system rule:** Members cannot be removed after `IN_PROGRESS`.

---

### 4.7 Workspace

Execution environment. Created automatically after team formation.

**Fields:** `id`, `collaboration_id`, `status`, `progress_percentage`

**Status:** `ACTIVE` / `COMPLETION_PENDING` / `COMPLETED`

**Purpose:** Execution engine.

---

### 4.8 Task

Represents work unit.

**Fields:** `id`, `workspace_id`, `title`, `description`, `assigned_to`, `status`, `deadline`

**Status:** `TODO` / `IN_PROGRESS` / `DONE`

**Purpose:** Tracks execution progress.

---

### 4.9 Message

Workspace communication.

**Fields:** `id`, `workspace_id`, `sender_id`, `content`, `created_at`

**Purpose:** Team coordination.

---

### 4.10 ProofOfWork

Represents verified project completion.

**Fields:**

| Field               | Notes                           |
|---------------------|---------------------------------|
| `id`                |                                 |
| `collaboration_id`  |                                 |
| `verification_code` | e.g. `ENQ-2026-000001`          |
| `proof_file_url`    |                                 |
| `verification_status` | `VERIFIED` / `UNVERIFIED`    |
| `created_at`        |                                 |

**Purpose:** Trust anchor of platform.

---

### 4.11 PeerRating

Represents reputation feedback.

**Fields:** `id`, `proof_id`, `rated_user_id`, `rated_by_user_id`, `rating`, `feedback`

**Purpose:** Reputation calculation.

---

## 5. Core System Pipelines

This defines exact system behavior.

---

### Pipeline 1: Collaboration Creation Pipeline

```
User opens Create Collaboration Page
        ↓
User fills:
  - Title
  - Description
  - Skills required
  - Roles required
  - Location
  - College
  - Project type
  - Deadline
        ↓
User clicks Publish
        ↓
System creates CollaborationRequest
        ↓
Status set to OPEN
        ↓
Request becomes visible in Feed
```

**Output:** New `CollaborationRequest` created.

---

### Pipeline 2: Discovery Pipeline

Feed generation algorithm prioritizes:

- Skills match
- Reputation score
- Location proximity
- College proximity
- Interest similarity

**Feed Query Logic:**

```sql
SELECT collaboration_requests
WHERE status = OPEN
ORDER BY relevance_score DESC
```

---

### Pipeline 3: Join Request Pipeline

```
User clicks Join
        ↓
System creates JoinRequest
        ↓
Owner receives JoinRequest
        ↓
Owner Accepts or Rejects
        ↓
If accepted:
  → TeamMember created

If first member accepted:
  → Workspace automatically created
```

---

### Pipeline 4: Team Formation Pipeline

```
JoinRequest accepted
        ↓
TeamMember created
        ↓
System updates team count
        ↓
If owner starts project:
  → Status changes to IN_PROGRESS
  → Team becomes locked
```

---

### Pipeline 5: Workspace Execution Pipeline

**Workspace contains:**
- Members
- Tasks
- Messages
- Files
- Progress

**Execution flow:**

```
Members create Tasks
        ↓
Members complete Tasks
        ↓
System updates progress percentage
```

**Progress formula:**

```
completed_tasks / total_tasks × 100
```

---

### Pipeline 6: Completion Pipeline

Owner initiates completion.

```
Owner clicks Mark Complete
        ↓
Owner uploads proof file
        ↓
Workspace status → COMPLETION_PENDING
        ↓
System sends confirmation to all ACTIVE members
        ↓
Members confirm completion
        ↓
If all confirm:
  → ProofOfWork created
  → Workspace status → COMPLETED
  → CollaborationRequest status → COMPLETED
```

---

### Pipeline 7: Proof Generation Pipeline

System generates:

- `verification_code` — example: `ENQ-2026-000001`

**Proof includes:**
- Project name
- Members list
- Completion date
- Verification code
- Proof file

> Stored permanently.

---

### Pipeline 8: Reputation Pipeline

```
After completion:
  → Peer ratings collected
        ↓
  → Reputation score updated
```

**Formula:**

```
Reputation =
  Completed Projects × Weight
  + Peer Rating Score
  + Verification Level Weight
```

---

### Pipeline 9: Profile Update Pipeline

User profile updated with:

- Completed projects
- Proof records
- Reputation score
- Collaboration history

---

## 6. Proof Classification System

**Proof types:**

| Type         | Description                                      |
|--------------|--------------------------------------------------|
| `VERIFIED`   | Created inside ENQUEbet lifecycle                |
| `UNVERIFIED` | Imported external projects                       |

> Verified proof has **higher reputation impact.**

---

## 7. Workspace State Machine

```
ACTIVE → COMPLETION_PENDING → COMPLETED
```

> State transitions controlled by system.

---

## 8. CollaborationRequest State Machine

```
DRAFT → OPEN → IN_PROGRESS → COMPLETED
                    ↓
                CANCELLED
```

> Transitions strictly enforced.

---

## 9. Reputation System

Reputation reflects builder credibility.

**Reputation increases from:**
- Project completion
- Peer ratings
- Verification level
- Followers

> Reputation **never decreases** from project completion.
> Only peer ratings can reduce trust impact.

---

## 10. System Architecture

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | Next.js, TypeScript, Tailwind           |
| Backend   | Django, Django REST Framework, Django Channels |
| Database  | PostgreSQL                              |
| Storage   | AWS S3 / Cloudflare R2                  |

---

## 11. Backend Architecture Structure

**Modules:**

- `users`
- `skills`
- `collaborations`
- `teams`
- `workspace`
- `tasks`
- `proof`
- `reputation`
- `notifications`

> Each module isolated and scalable.

---

## 12. Identity and Trust Model

**Verification levels:**

| Level | Description        |
|-------|--------------------|
| 0     | Unverified         |
| 1     | Email verified     |
| 2     | College verified   |
| 3     | Government verified|
| 4     | Trusted builder    |

> Higher levels increase reputation weight.

---

## 13. Core Platform Loop

This is ENQUEbet's core engine loop:

```
User joins platform
        ↓
User joins collaboration
        ↓
User builds project
        ↓
User completes project
        ↓
User earns proof
        ↓
User gains reputation
        ↓
User attracts more collaboration
        ↓
Loop continues
```

> This creates **Builder Reputation Graph.**

---

## 14. Long-Term Platform Moat

ENQUEbet's strongest advantage:

> **Verifiable Builder Reputation Graph**

Not posts. Not chat. Not profiles.

**Proof-backed builder credibility.**

> This becomes extremely difficult to replicate once network grows.

---

## 15. Launch Strategy

```
Telangana colleges
        ↓
Hyderabad city
        ↓
Telangana state
        ↓
India
        ↓
Global
```

> Network grows geographically.

---

## Final Core Statement

> **ENQUEbet** is a structured system that transforms collaboration into verifiable proof and proof into permanent builder reputation.

---

## Missing Systems — Identified Gaps

> is anything missed in idea if yes give below or just reply no

Yes — a few critical but non-obvious systems are still missing. The core idea is very strong, but these components are essential for a production-grade Builder Reputation Platform and long-term scalability.

---

### 1. Notification System *(CRITICAL)*

Right now, users won't know when actions happen.

You need event-driven notifications for:

- Join request received
- Join request accepted/rejected
- New workspace message
- Task assigned
- Completion confirmation request
- Peer rating request
- Proof generated
- Follow events

**Notification object:**

```
Notification
  id
  user_id
  type
  title
  message
  is_read
  created_at
```

> Without this, workflow breaks.

---

### 2. Completion Confirmation Tracking Table *(CRITICAL)*

You said members confirm completion, but system needs to track who confirmed.

**Add:**

```
CompletionConfirmation
  id
  proof_id
  user_id
  status (PENDING / CONFIRMED / REJECTED)
  confirmed_at
```

> Otherwise proof integrity is weak.

---

### 3. Workspace File Storage System *(IMPORTANT)*

You mentioned proof upload, but workspace also needs file sharing.

**Add:**

```
WorkspaceFile
  id
  workspace_id
  uploaded_by
  file_url
  file_type
  created_at
```

**Used for:**
- Project assets
- Documents
- Code files
- Diagrams

---

### 4. Collaboration Required Roles System *(IMPORTANT)*

You mentioned roles, but roles must be structured.

**Add:**

```
CollaborationRole
  id
  collaboration_id
  role_name
  required_count
```

**Example:**
- Frontend Developer × 2
- Backend Developer × 1
- Designer × 1

> This enables proper team matching.

---

### 5. Proof Certificate Generator System *(IMPORTANT)*

You mentioned proof file, but system must also generate official ENQUEbet certificate.

**Add:**

```
generated_certificate_url
```

> This becomes your brand trust anchor.

---

### 6. Follow System Table *(IMPORTANT)*

You decided users can follow each other, but structure missing.

**Add:**

```
Follow
  id
  follower_id
  following_id
  created_at
```

> This enables builder network graph.

---

### 7. External Proof Import Table *(IMPORTANT)*

You decided external proofs allowed (`UNVERIFIED`), but needs separate tracking.

**Add:**

```
ExternalProof
  id
  user_id
  title
  description
  proof_file_url
  verification_status
  created_at
```

---

### 8. Abuse / Report System *(VERY IMPORTANT for scaling)*

Eventually users will abuse platform.

**Add:**

```
Report
  id
  reported_by
  target_type (USER / COLLABORATION / PROOF)
  target_id
  reason
  status
  created_at
```

> This protects platform trust.

---

### 9. Activity Log System *(IMPORTANT for debugging and trust)*

Tracks all critical actions.

**Add:**

```
ActivityLog
  id
  user_id
  action_type
  target_type
  target_id
  created_at
```

**Helps with:**
- Debugging
- Dispute resolution
- Reputation audits

---

### 10. Search Index Structure *(IMPORTANT for discovery scaling)*

You need structured search fields:

- `title`
- `skills`
- `college`
- `location`
- `project_type`

> This enables fast discovery later.

---

## Summary: Missing Systems Checklist

**You already have:**

| System                | Status |
|-----------------------|--------|
| Identity system       | ✅     |
| Collaboration system  | ✅     |
| Workspace system      | ✅     |
| Task system           | ✅     |
| Completion system     | ✅     |
| Proof system          | ✅     |
| Reputation system     | ✅     |

**Missing but needed:**

| System                            | Priority |
|-----------------------------------|----------|
| Notification system               | ⚠️ CRITICAL |
| Completion confirmation tracking  | ⚠️ CRITICAL |
| Workspace file storage            | ⚠️ IMPORTANT |
| Collaboration roles structure     | ⚠️ IMPORTANT |
| Follow system table               | ⚠️ IMPORTANT |
| External proof table              | ⚠️ IMPORTANT |
| Report / abuse system             | ⚠️ IMPORTANT |
| Activity log                      | ⚠️ IMPORTANT |
| Search indexing structure         | ⚠️ IMPORTANT |