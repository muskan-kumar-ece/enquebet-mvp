Below is the **complete Technical Requirements Document (TRD)** for ENQUEbet. This is written at **production-grade system architecture level**, covering backend, frontend, database, APIs, pipelines, scaling, security, and infrastructure. Nothing essential is omitted.

---

# ENQUEbet — Technical Requirements Document (TRD)

| Field                 | Value                                       |
|-----------------------|---------------------------------------------|
| **Version**           | 1.0                                         |
| **System Type**       | Builder Collaboration and Reputation Platform |
| **Architecture Style**| Modular Monolith → Microservices Ready      |
| **Database**          | Supabase PostgreSQL                         |
| **File Storage**      | Cloudinary                                  |

---

# 1. System Overview

## 1.1 Purpose

ENQUEbet is a full-stack web platform that enables:

- Collaboration request creation
- Team formation
- Workspace execution
- Task management
- Completion confirmation
- Proof generation
- Reputation tracking

**Core lifecycle:**

```
User → CollaborationRequest → Team → Workspace → Tasks → Completion → Proof → Reputation
```

---

# 2. High-Level Architecture

**Architecture type:**

```
Client-Server Architecture with Modular Backend
```

**Components:**

| Layer             | Technology                    |
|-------------------|-------------------------------|
| Frontend          | Next.js                       |
| Backend API       | Django + DRF                  |
| Database          | PostgreSQL                    |
| Realtime Server   | Django Channels               |
| File Storage      | Cloudinary                    |
| Cache             | Redis *(optional — Phase 2)*  |

---

# 3. Frontend Architecture

**Framework:**

| Technology   |
|--------------|
| Next.js 14+  |
| TypeScript   |
| Tailwind CSS |

**Frontend layers:**

| Layer                     |
|---------------------------|
| Pages Layer               |
| Components Layer          |
| Services Layer (API calls)|
| State Layer               |

---

## 3.1 Frontend Pages

**Required pages:**

| Group   | Pages                                                                 |
|---------|-----------------------------------------------------------------------|
| Auth    | Login, Register                                                       |
| Core    | Feed Page, Collaboration Detail Page, Workspace Page, Profile Page, Search Page |
| Support | Notifications Page, Settings Page, Proof Detail Page                 |

---

## 3.2 Core Components

| Component        |
|------------------|
| `CollaborationCard` |
| `JoinButton`     |
| `WorkspaceChat`  |
| `TaskBoard`      |
| `TaskItem`       |
| `MemberList`     |
| `ProofViewer`    |
| `ProfileCard`    |
| `NotificationItem` |

---

## 3.3 Frontend State Management

**Recommended:**

```
React Context + React Query
```

**Handles:**

- user state
- workspace state
- collaboration state

---

# 4. Backend Architecture

**Framework:**

| Technology               |
|--------------------------|
| Django                   |
| Django REST Framework    |
| Django Channels          |

**Architecture pattern:** `Modular Monolith`

**Backend structure:**

```
backend/
  apps/
    users/
    skills/
    collaborations/
    teams/
    workspace/
    tasks/
    proof/
    reputation/
    notifications/
```

> Each app handles its own domain.

---

# 5. Database Architecture

**Database:** `PostgreSQL`

**Reasons:**

- ACID compliance
- Relational integrity
- Scalability
- Transaction support

---

# 6. Database Schema (Full)

---

## 6.1 Users Table

| Field               | Constraint     |
|---------------------|----------------|
| `id`                | UUID, PK       |
| `email`             | UNIQUE         |
| `username`          | UNIQUE         |
| `password_hash`     |                |
| `full_name`         |                |
| `bio`               |                |
| `profile_image_url` |                |
| `college`           |                |
| `location`          |                |
| `verification_level`| INT            |
| `reputation_score`  | INT            |
| `created_at`        |                |
| `updated_at`        |                |

---

## 6.2 Skills Table

| Field  |
|--------|
| `id`   |
| `name` |

---

## 6.3 UserSkills Table

| Field      | Constraint |
|------------|------------|
| `id`       |            |
| `user_id`  | FK         |
| `skill_id` | FK         |
| `level`    |            |

---

## 6.4 CollaborationRequests Table

| Field             | Constraint |
|-------------------|------------|
| `id`              |            |
| `owner_id`        | FK         |
| `title`           |            |
| `description`     |            |
| `location`        |            |
| `college`         |            |
| `is_remote`       |            |
| `project_type`    |            |
| `difficulty_level`|            |
| `max_members`     |            |
| `deadline`        |            |
| `status`          | Enum       |
| `created_at`      |            |
| `updated_at`      |            |

**Status enum:**

```
DRAFT → OPEN → IN_PROGRESS → COMPLETED
                    ↓
                CANCELLED
```

---

## 6.5 JoinRequests Table

| Field              | Constraint |
|--------------------|------------|
| `id`               |            |
| `collaboration_id` | FK         |
| `user_id`          | FK         |
| `message`          |            |
| `status`           | Enum       |
| `created_at`       |            |

**Status:** `PENDING` / `ACCEPTED` / `REJECTED`

---

## 6.6 TeamMembers Table

| Field              | Constraint |
|--------------------|------------|
| `id`               |            |
| `collaboration_id` | FK         |
| `user_id`          | FK         |
| `role`             |            |
| `state`            | Enum       |
| `joined_at`        |            |

**State enum:** `ACTIVE` / `LEFT` / `REMOVED` / `COMPLETED`

---

## 6.7 Workspace Table

| Field                | Constraint |
|----------------------|------------|
| `id`                 |            |
| `collaboration_id`   | FK         |
| `status`             | Enum       |
| `progress_percentage`|            |
| `created_at`         |            |

**Status:** `ACTIVE` / `COMPLETION_PENDING` / `COMPLETED`

---

## 6.8 Messages Table

| Field          | Constraint |
|----------------|------------|
| `id`           |            |
| `workspace_id` | FK         |
| `sender_id`    | FK         |
| `content`      |            |
| `created_at`   |            |

---

## 6.9 Tasks Table

| Field          | Constraint |
|----------------|------------|
| `id`           |            |
| `workspace_id` | FK         |
| `title`        |            |
| `description`  |            |
| `assigned_to`  | FK         |
| `status`       | Enum       |
| `deadline`     |            |
| `created_at`   |            |

**Status:** `TODO` / `IN_PROGRESS` / `DONE`

---

## 6.10 WorkspaceFiles Table

| Field          | Constraint |
|----------------|------------|
| `id`           |            |
| `workspace_id` | FK         |
| `uploaded_by`  | FK         |
| `file_url`     |            |
| `file_type`    |            |
| `created_at`   |            |

---

## 6.11 ProofOfWork Table

| Field                | Constraint |
|----------------------|------------|
| `id`                 |            |
| `collaboration_id`   | FK         |
| `verification_code`  | UNIQUE     |
| `proof_file_url`     |            |
| `verification_status`| Enum       |
| `created_at`         |            |

**Verification status:** `VERIFIED` / `UNVERIFIED`

---

## 6.12 PeerRatings Table

| Field              | Constraint |
|--------------------|------------|
| `id`               |            |
| `proof_id`         | FK         |
| `rated_user_id`    | FK         |
| `rated_by_user_id` | FK         |
| `rating`           |            |
| `feedback`         |            |
| `created_at`       |            |

---

## 6.13 Follow Table

| Field          | Constraint |
|----------------|------------|
| `id`           |            |
| `follower_id`  | FK         |
| `following_id` | FK         |
| `created_at`   |            |

---

## 6.14 Notifications Table

| Field        | Constraint |
|--------------|------------|
| `id`         |            |
| `user_id`    | FK         |
| `type`       |            |
| `title`      |            |
| `message`    |            |
| `is_read`    |            |
| `created_at` |            |

---

# 7. Backend API Architecture

**API style:** REST API, JSON format

---

## 7.1 Auth APIs

| Method | Endpoint        |
|--------|-----------------|
| `POST` | `/auth/register`|
| `POST` | `/auth/login`   |
| `POST` | `/auth/logout`  |
| `GET`  | `/auth/me`      |

---

## 7.2 Collaboration APIs

| Method | Endpoint                         |
|--------|----------------------------------|
| `POST` | `/collaborations/create`         |
| `GET`  | `/collaborations/feed`           |
| `GET`  | `/collaborations/{id}`           |
| `PUT`  | `/collaborations/{id}`           |
| `POST` | `/collaborations/{id}/complete`  |

---

## 7.3 Join Request APIs

| Method | Endpoint                        |
|--------|---------------------------------|
| `POST` | `/join-requests/send`           |
| `POST` | `/join-requests/{id}/accept`    |
| `POST` | `/join-requests/{id}/reject`    |

---

## 7.4 Workspace APIs

| Method | Endpoint                      |
|--------|-------------------------------|
| `GET`  | `/workspace/{id}`             |
| `POST` | `/workspace/{id}/message`     |
| `GET`  | `/workspace/{id}/messages`    |

---

## 7.5 Task APIs

| Method | Endpoint                   |
|--------|----------------------------|
| `POST` | `/tasks/create`            |
| `PUT`  | `/tasks/{id}`              |
| `GET`  | `/workspace/{id}/tasks`    |

---

## 7.6 Proof APIs

| Method | Endpoint             |
|--------|----------------------|
| `GET`  | `/proof/{id}`        |
| `GET`  | `/user/{id}/proofs`  |

---

## 7.7 Profile APIs

| Method | Endpoint         |
|--------|------------------|
| `GET`  | `/user/{id}`     |
| `PUT`  | `/user/update`   |

---

# 8. Completion Engine Logic

**Completion pipeline:**

```
Owner submits completion
        ↓
System validates:
  - workspace exists
  - workspace status = ACTIVE
  - tasks ≥ 1
  - proof uploaded
        ↓
System sets workspace → COMPLETION_PENDING
        ↓
System sends confirmation to members
        ↓
Members confirm
        ↓
Proof generated
        ↓
Workspace → COMPLETED
        ↓
CollaborationRequest → COMPLETED
```

---

# 9. Proof Generation Logic

**Verification code generation:**

**Format:**

```
ENQ-{YEAR}-{SEQUENCE}
```

**Example:**

```
ENQ-2026-000012
```

> Proof record immutable.

---

# 10. Realtime System

**Technology:** Django Channels + WebSockets

**Used for:**

- Workspace chat
- Notifications

---

# 11. File Storage System

**Storage provider:** Cloudinary

**Stored files:**

| File Type       |
|-----------------|
| Proof files     |
| Workspace files |
| Profile images  |

---

# 12. Authentication System

**Authentication method:** JWT Authentication

**Flow:**

```
Login
  ↓
JWT issued
  ↓
JWT sent in Authorization header
  ↓
Backend validates JWT
```

---

# 13. Authorization Model

**Permission checks required:**

| Rule                                          |
|-----------------------------------------------|
| Only owner can accept join requests           |
| Only team members access workspace            |
| Only owner can submit completion              |
| Only team members confirm completion          |

---

# 14. Reputation Calculation Logic

**Formula:**

```
Reputation =
  verified_projects × weight
  + peer_rating × weight
  + verification_level × weight
```

---

# 15. Feed Algorithm Technical Logic

**Query:**

```sql
SELECT *
FROM collaboration_requests
WHERE status = 'OPEN'
ORDER BY skill_match_score DESC,
         reputation_score DESC,
         location_score DESC
LIMIT 20;
```

---

# 16. Deployment Architecture

**Initial deployment:**

| Layer    | Provider                        |
|----------|---------------------------------|
| Frontend | Vercel                          |
| Backend  | Railway / AWS EC2               |
| Database | Supabase PostgreSQL             |
| Storage  | Cloudinary                      |

---

# 17. Scaling Strategy

| Phase   | Strategy                  |
|---------|---------------------------|
| Phase 1 | Single backend instance   |
| Phase 2 | Load balanced backend     |
| Phase 3 | Microservices split       |

---

# 18. Security Requirements

**Mandatory:**

| Requirement             |
|-------------------------|
| JWT auth                |
| Password hashing (bcrypt)|
| Input validation        |
| Permission checks       |
| HTTPS only              |

---

# 19. Performance Requirements

| Metric            | Target   |
|-------------------|----------|
| API response      | < 300ms  |
| Feed load         | < 500ms  |
| Proof generation  | < 2s     |

---

# 20. Failure Handling

System must handle:

- Invalid join requests
- Duplicate proof generation prevention
- Permission violations

---

# Final Technical Summary

ENQUEbet is implemented as a full-stack distributed system using:

| Layer           | Technology            |
|-----------------|-----------------------|
| Frontend        | Next.js               |
| Backend         | Django                |
| Database        | Supabase PostgreSQL   |
| Storage         | Cloudinary            |
| Realtime Layer  | WebSocket             |

**Supporting:**

- Collaboration lifecycle
- Workspace execution
- Proof generation
- Reputation tracking

---

If you want, I can now give the **exact folder structure and step-by-step implementation plan to start coding immediately.**
