Below is the **complete Product Requirements Document (PRD)** for ENQUEbet. This is written in professional startup format and includes **all systems, workflows, edge cases, architecture decisions, and phased rollout**, without missing any point.

---

# ENQUEbet — Product Requirements Document (PRD)

| Field            | Value                              |
|------------------|------------------------------------|
| **Version**      | 1.0                                |
| **Author**       | Founder (Muskan Kumar)             |
| **Product Type** | Builder Reputation Platform        |
| **Platform**     | Web (Next.js + Django + PostgreSQL)|

---

# 1. Product Overview

## 1.1 Product Name

**ENQUEbet**

## 1.2 Product Category

Builder Collaboration and Reputation Platform

## 1.3 Product Vision

ENQUEbet enables builders to form teams, execute projects, and earn verifiable Proof of Work that builds permanent, trusted builder reputation.

> ENQUEbet transforms collaboration into verifiable reputation.

---

## 1.4 Core Problem Statement

Builders face these issues:

- Cannot find reliable collaborators
- No trusted proof of real collaboration
- LinkedIn shows claims, not verified building
- GitHub shows code, not full collaboration lifecycle
- Hackathons are temporary and disconnected from builder identity
- No persistent builder reputation graph

ENQUEbet solves this by managing the complete lifecycle:

```
Collaboration Request → Team Formation → Workspace Execution → Completion → Proof Generation → Reputation Update
```

---

# 2. Goals and Objectives

## 2.1 Primary Goal

Enable builders to complete projects and earn verifiable Proof of Work.

## 2.2 Secondary Goals

- Enable team formation
- Enable structured collaboration
- Create persistent builder reputation
- Enable skill-based discovery
- Enable college and location-based collaboration

---

## 2.3 Success Metrics (KPIs)

**Primary KPI:**

| Metric                        |
|-------------------------------|
| Number of completed projects  |

**Secondary KPIs:**

| Metric                                    |
|-------------------------------------------|
| Number of collaboration requests created  |
| Number of join requests sent              |
| Number of workspaces created              |
| Number of proofs generated                |
| Average projects completed per user       |

**Trust KPIs:**

| Metric               |
|----------------------|
| Verified proof ratio |
| Completion rate      |

---

# 3. User Personas

## 3.1 Student Builder

| Attribute         | Detail                                      |
|-------------------|---------------------------------------------|
| **Characteristics** | College student, wants to build projects, needs team members |
| **Goals**         | Find collaborators, complete projects, build reputation |

---

## 3.2 Independent Builder / Indie Hacker

| Attribute           | Detail                        |
|---------------------|-------------------------------|
| **Characteristics** | Works on startup ideas        |
| **Goals**           | Find technical collaborators, build startup MVPs |

---

## 3.3 Research Builder

| Attribute           | Detail                   |
|---------------------|--------------------------|
| **Characteristics** | Builds academic projects |
| **Goals**           | Find research collaborators |

---

# 4. Core Product Principles

## 4.1 Completion-First Design

> **Primary platform objective: Complete projects.**

Feed and posting are secondary.

## 4.2 Proof-Based Trust Model

> Reputation must be based on verified proof, not claims.

## 4.3 Structured Collaboration Lifecycle

> Every collaboration must follow lifecycle states.

---

# 5. Core System Entities

---

## 5.1 User

**Purpose:** Represents builder identity.

**Fields:**

| Field               |
|---------------------|
| `id`                |
| `email`             |
| `username`          |
| `full_name`         |
| `bio`               |
| `profile_image`     |
| `college`           |
| `location`          |
| `verification_level`|
| `reputation_score`  |
| `created_at`        |

---

## 5.2 Skill

**Purpose:** Represents skill type.

**Fields:** `id`, `name`

---

## 5.3 UserSkill

**Purpose:** Maps user to skills.

**Fields:** `user_id`, `skill_id`, `level`

---

## 5.4 CollaborationRequest

> Primary system object.

**Purpose:** Represents collaboration intent.

**Fields:**

| Field             |
|-------------------|
| `id`              |
| `owner_id`        |
| `title`           |
| `description`     |
| `required_skills` |
| `required_roles`  |
| `location`        |
| `college`         |
| `is_remote`       |
| `max_members`     |
| `project_type`    |
| `difficulty_level`|
| `deadline`        |
| `status`          |
| `created_at`      |

**Status values:**

```
DRAFT → OPEN → IN_PROGRESS → COMPLETED
                    ↓
                CANCELLED
```

---

## 5.5 JoinRequest

**Purpose:** Request to join collaboration.

**Fields:** `id`, `collaboration_id`, `user_id`, `message`, `status`

**Status:** `PENDING` / `ACCEPTED` / `REJECTED`

---

## 5.6 TeamMember

**Purpose:** Defines team membership.

**Fields:** `id`, `collaboration_id`, `user_id`, `role`, `state`, `joined_at`

**States:** `ACTIVE` / `LEFT` / `REMOVED` / `COMPLETED`

> **Constraint:** Members cannot be removed after `IN_PROGRESS`.

---

## 5.7 Workspace

**Purpose:** Execution environment.

**Fields:** `id`, `collaboration_id`, `status`, `progress_percentage`, `created_at`

**States:** `ACTIVE` / `COMPLETION_PENDING` / `COMPLETED`

---

## 5.8 Task

**Purpose:** Work unit.

**Fields:** `id`, `workspace_id`, `title`, `description`, `assigned_to`, `status`, `deadline`

**Status:** `TODO` / `IN_PROGRESS` / `DONE`

---

## 5.9 Message

**Purpose:** Workspace communication.

**Fields:** `id`, `workspace_id`, `sender_id`, `content`, `created_at`

---

## 5.10 WorkspaceFile

**Purpose:** File sharing inside workspace.

**Fields:** `id`, `workspace_id`, `uploaded_by`, `file_url`

---

## 5.11 ProofOfWork

**Purpose:** Represents verified completion.

**Fields:** `id`, `collaboration_id`, `verification_code`, `proof_file_url`, `verification_status`, `created_at`

**Verification types:** `VERIFIED` / `UNVERIFIED`

---

## 5.12 PeerRating

**Purpose:** Reputation feedback.

**Fields:** `id`, `proof_id`, `rated_user_id`, `rated_by_user_id`, `rating`, `feedback`

---

## 5.13 Follow

**Purpose:** Builder network.

**Fields:** `follower_id`, `following_id`

---

## 5.14 Notification

**Purpose:** User event notifications.

**Fields:** `id`, `user_id`, `type`, `title`, `message`, `is_read`

---

# 6. Core User Workflows

---

## Workflow 1: User Registration

**Steps:**

```
User registers
      ↓
User creates profile
      ↓
User adds skills
```

**Output:** User identity created.

---

## Workflow 2: Create Collaboration Request

**Steps:**

```
User creates collaboration request
      ↓
System sets status to OPEN
      ↓
Request visible in feed
```

---

## Workflow 3: Join Collaboration

**Steps:**

```
User clicks Join
      ↓
JoinRequest created
      ↓
Owner accepts
      ↓
TeamMember created
      ↓
Workspace created
```

---

## Workflow 4: Workspace Execution

**Steps:**

```
Team creates tasks
      ↓
Team completes tasks
      ↓
System tracks progress
```

---

## Workflow 5: Project Completion

**Steps:**

```
Owner marks complete
      ↓
Upload proof file
      ↓
Members confirm completion
      ↓
System generates ProofOfWork
```

---

## Workflow 6: Proof Generation

System generates:

- Verification code
- Proof record
- Profile update

---

## Workflow 7: Reputation Update

System updates reputation based on:

- Completion
- Peer ratings
- Verification level

---

## Workflow 8: External Proof Upload

User uploads proof manually.

System marks: **`UNVERIFIED`**

> Lower reputation impact.

---

# 7. Feed System

Feed prioritizes:

| Priority | Signal         |
|----------|----------------|
| 1        | Skills match   |
| 2        | Reputation     |
| 3        | Location       |
| 4        | College        |
| 5        | Interests      |

---

# 8. Reputation System

Reputation increases based on:

- Completed verified projects
- Peer ratings
- Verification level
- Followers

---

# 9. Proof Verification System

Each proof includes verification code.

**Example:**

```
ENQ-2026-000001
```

> Proof permanent and immutable.

---

# 10. Platform Rules and Constraints

| Rule                                              |
|---------------------------------------------------|
| Members cannot be removed after `IN_PROGRESS`     |
| Completion requires team confirmation             |
| Minimum one task required                         |
| Proof immutable once generated                    |
| Verified proof carries higher reputation weight   |

---

# 11. Non-Functional Requirements

## Performance

| Metric        | Target   |
|---------------|----------|
| Feed load     | < 500ms  |
| API response  | < 300ms  |

## Security

- JWT authentication
- Permission validation

## Scalability

- PostgreSQL database
- Horizontal backend scaling

---

# 12. Technology Stack

| Layer    | Technologies                                        |
|----------|-----------------------------------------------------|
| Frontend | Next.js, TypeScript, Tailwind                       |
| Backend  | Django, Django REST Framework, Django Channels      |
| Database | PostgreSQL                                          |
| Storage  | AWS S3 / Cloudflare R2                              |

---

# 13. MVP Scope

**Included:**

| System               |
|----------------------|
| User system          |
| Collaboration system |
| Workspace system     |
| Task system          |
| Completion system    |
| Proof system         |

**Excluded initially:**

- Advanced recommendations
- Advanced analytics

---

# 14. Launch Strategy

| Phase   | Target                          |
|---------|---------------------------------|
| Phase 1 | Selected colleges in Telangana  |
| Phase 2 | Hyderabad city                  |
| Phase 3 | Telangana state                 |
| Phase 4 | India                           |

---

# 15. Long-Term Vision

ENQUEbet becomes global builder reputation infrastructure.

> Trusted proof layer for builders worldwide.

---

If you want, I can also convert this into:

- Investor pitch deck version
- System Design Diagram version
- Developer implementation checklist version
