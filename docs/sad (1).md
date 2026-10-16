Below is the **complete System Architecture Document (SAD)** for ENQUEbet. This includes high-level architecture, all layers, authentication, database (Supabase PostgreSQL option included), external services, deployment environments, and full system structure.

---

# ENQUEbet — System Architecture Document (SAD)

| Field                  | Value                                              |
|------------------------|----------------------------------------------------|
| **Version**            | 1.0                                                |
| **System Type**        | Distributed Web Application                        |
| **Architecture Pattern**| Layered Modular Monolith (Microservices-Ready)    |

---

# 1. System Overview

## 1.1 Purpose

ENQUEbet is a builder collaboration and reputation platform that manages the full lifecycle:

```
User → CollaborationRequest → Team → Workspace → Tasks → Completion → Proof → Reputation
```

The architecture must support:

- High consistency (proof and reputation)
- Realtime communication
- Secure identity
- Scalable growth

---

# 2. High-Level Architecture Diagram

**Logical architecture:**

```
                ┌──────────────────────┐
                │      Client Layer     │
                │  (Browser / Mobile)  │
                └──────────┬───────────┘
                           │ HTTPS
                           ▼
                ┌──────────────────────┐
                │   Frontend Layer     │
                │  Next.js Application │
                └──────────┬───────────┘
                           │ REST API / WebSocket
                           ▼
                ┌──────────────────────┐
                │    Backend Layer     │
                │  Django + DRF       │
                │  Django Channels    │
                └──────────┬───────────┘
                           │ SQL
                           ▼
                ┌──────────────────────┐
                │    Database Layer    │
                │ PostgreSQL (Supabase│
                │ or AWS RDS)         │
                └──────────┬───────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │ Auth Service │  │ File Storage │  │ Notification │
 │ JWT / Supabase│ │ Cloudflare R2│ │ Email / Push │
 └──────────────┘  └──────────────┘  └──────────────┘
```

---

# 3. Client Layer

## 3.1 Components

**Clients:**

| Type              |
|-------------------|
| Web Browser       |
| Mobile Browser    |
| Future: Mobile App|

**Responsibilities:**

| Responsibility        |
|-----------------------|
| UI rendering          |
| User input            |
| API requests          |
| WebSocket communication|
| Session storage       |

**Protocol:** `HTTPS` · `WebSocket Secure (WSS)`

---

# 4. Frontend Layer

**Technology:**

| Technology   |
|--------------|
| Next.js 14+  |
| TypeScript   |
| Tailwind CSS |

**Architecture pattern:** Component-based architecture

---

## 4.1 Frontend Structure

```
frontend/
│
├── app/
│   ├── auth/
│   ├── feed/
│   ├── workspace/
│   ├── profile/
│   ├── collaboration/
│
├── components/
│   ├── CollaborationCard
│   ├── WorkspaceChat
│   ├── TaskBoard
│   ├── ProfileCard
│
├── services/
│   ├── api.ts
│   ├── auth.ts
│
├── context/
│   ├── AuthContext
│   ├── WorkspaceContext
```

---

## 4.2 Frontend Responsibilities

**Handles:**

| Responsibility               |
|------------------------------|
| UI rendering                 |
| API communication            |
| Authentication token storage |
| State management             |
| WebSocket connections        |

**Does NOT handle:**

| Excluded Responsibility |
|-------------------------|
| Business logic          |
| Proof validation        |
| Reputation calculation  |

> These remain in backend.

---

# 5. Backend Layer

**Technology:**

| Technology               |
|--------------------------|
| Django                   |
| Django REST Framework    |
| Django Channels          |

**Architecture type:** `Modular Monolith`

---

## 5.1 Backend Modules

```
backend/
apps/
├── users/
├── skills/
├── collaborations/
├── teams/
├── workspace/
├── tasks/
├── proof/
├── reputation/
├── notifications/
```

**Each module contains:**

| File             |
|------------------|
| `models.py`      |
| `views.py`       |
| `serializers.py` |
| `urls.py`        |
| `services.py`    |

---

## 5.2 Backend Responsibilities

**Handles:**

| Responsibility          |
|-------------------------|
| Authentication validation|
| Authorization           |
| Business logic          |
| Proof generation        |
| Reputation calculation  |
| Database transactions   |
| Workspace lifecycle     |

---

# 6. Database Layer

**Database engine:** `PostgreSQL`

**Deployment options:**

| Option              | Provider              |
|---------------------|-----------------------|
| **A** *(recommended)* | Supabase PostgreSQL |
| **B**               | AWS RDS PostgreSQL    |

---

## 6.1 Database Architecture

**Relational model:**

```
User
│
├── CollaborationRequest
│    ├── JoinRequest
│    ├── TeamMember
│    ├── Workspace
│         ├── Task
│         ├── Message
│         ├── File
│
├── ProofOfWork
│    ├── PeerRating
│
├── Follow
├── Notification
```

---

## 6.2 Database Access Layer

**Backend uses:** `Django ORM`

**Supabase option — used only as:**

| Role                          |
|-------------------------------|
| Managed PostgreSQL provider   |
| Storage provider *(optional)* |

> **NOT** for business logic.

---

# 7. Authentication Layer

**Authentication type:** `JWT Authentication`

**Optional integration:** `Supabase Auth`

---

## 7.1 Auth Architecture

**Flow:**

```
User registers
      ↓
Password hashed using bcrypt
      ↓
Stored in database
      ↓
User logs in
      ↓
JWT issued
      ↓
JWT stored in frontend
      ↓
JWT sent in Authorization header
      ↓
Backend validates JWT
```

---

## 7.2 Auth Features

**Supports:**

| Feature          |
|------------------|
| Register         |
| Login            |
| Logout           |
| Reset password   |
| Change password  |
| Token refresh    |

---

## 7.3 Auth Components

**Backend:**

| Component                   |
|-----------------------------|
| Auth API                    |
| JWT generator               |
| Password hashing            |
| Token validation middleware |

**Frontend:**

| Component      |
|----------------|
| AuthContext    |
| Token storage  |
| Login UI       |
| Register UI    |

---

# 8. Realtime Layer

**Technology:** Django Channels + WebSocket

**Used for:**

| Use Case              |
|-----------------------|
| Workspace chat        |
| Realtime notifications|

**Connection:**

```
Client → WebSocket → Django Channels → Database
```

---

# 9. External Services Layer

---

## 9.1 File Storage

**Provider:**

| Option                          |
|---------------------------------|
| Cloudflare R2 *(recommended)*   |
| AWS S3                          |

**Used for:**

| File Type       |
|-----------------|
| Proof files     |
| Workspace files |
| Profile images  |

---

## 9.2 Email Service

**Provider options:**

| Provider  |
|-----------|
| Resend    |
| SendGrid  |
| AWS SES   |

**Used for:**

| Use Case                   |
|----------------------------|
| Registration confirmation  |
| Password reset             |
| Notifications              |

---

## 9.3 Supabase Services *(Optional Components)*

**Used for:**

| Role                          |
|-------------------------------|
| Managed PostgreSQL            |
| Object storage *(optional)*   |
| Auth *(optional)*             |

**NOT used for:**

| Excluded                |
|-------------------------|
| Core business logic     |
| Proof generation        |
| Reputation logic        |

> These remain in Django backend.

---

# 10. Deployment Architecture

---

## 10.1 Development Environment

| Layer    | Address               |
|----------|-----------------------|
| Frontend | `localhost:3000`      |
| Backend  | `localhost:8000`      |
| Database | Supabase cloud        |

---

## 10.2 Production Deployment Architecture

```
Client
│
▼
Cloudflare CDN
│
▼
Frontend (Vercel)
│
▼
Backend (Railway / AWS EC2)
│
▼
Database (Supabase PostgreSQL / AWS RDS)
│
▼
Storage (Cloudflare R2)
```

---

# 11. Environment Separation

**Three environments:**

| Environment  |
|--------------|
| Development  |
| Staging      |
| Production   |

**Each has:**

| Resource                  |
|---------------------------|
| Separate database         |
| Separate storage bucket   |
| Separate backend instance |

---

# 12. API Communication Architecture

**Protocol:** `HTTPS REST API` · `JSON format`

**Authentication header:**

```
Authorization: Bearer JWT_TOKEN
```

---

# 13. System Data Flow

**Example: Completion Flow**

```
User clicks Complete
      ↓
Frontend sends POST request
      ↓
Backend validates permissions
      ↓
Backend updates workspace state
      ↓
Backend creates ProofOfWork record
      ↓
Database stores proof
      ↓
Backend sends response
      ↓
Frontend updates UI
```

---

# 14. Security Architecture

**Security mechanisms:**

| Mechanism               |
|-------------------------|
| JWT authentication      |
| Password hashing (bcrypt)|
| HTTPS encryption        |
| Permission validation   |
| Database constraints    |

---

# 15. Scalability Architecture

| Phase   | Strategy               |
|---------|------------------------|
| Phase 1 | Single backend instance|
| Phase 2 | Load balanced backend  |
| Phase 3 | Microservices split    |

**Example microservices:**

| Service                |
|------------------------|
| Auth Service           |
| Collaboration Service  |
| Workspace Service      |
| Proof Service          |
| Reputation Service     |

---

# 16. Fault Tolerance

**System handles:**

| Failure Type          |
|-----------------------|
| API failures          |
| Database failures     |
| Network interruptions |

**Database ensures:** `ACID compliance`

---

# 17. Logging Architecture

**Backend logs:**

| Log Type               |
|------------------------|
| Auth events            |
| Proof generation events|
| Errors                 |

**Tools:**

| Tool                          |
|-------------------------------|
| Django logging                |
| Railway logs                  |
| AWS CloudWatch *(future)*     |

---

# 18. Monitoring Architecture

**Future integration:**

| Tool                          | Purpose         |
|-------------------------------|-----------------|
| Sentry                        | Error tracking  |
| Prometheus                    | Metrics         |
| Grafana                       | Visualization   |

---

# 19. Backup Architecture

**Database backups:**

| Option                     |
|----------------------------|
| Supabase automatic backups |
| AWS RDS backups            |

**Storage backups:** Cloudflare R2 redundancy

---

# 20. System Component Summary

| Layer              | Technology / Provider                              |
|--------------------|----------------------------------------------------|
| Client Layer       | Browser                                            |
| Frontend Layer     | Next.js                                            |
| Backend Layer      | Django, Django REST Framework, Django Channels     |
| Database Layer     | PostgreSQL (Supabase or AWS)                       |
| Auth Layer         | JWT Auth                                           |
| External Services  | Cloudflare R2, Email Service                       |
| Deployment         | Vercel, Railway / AWS, Supabase PostgreSQL         |

---

# Final Architecture Conclusion

**ENQUEbet architecture is:**

| Property              |
|-----------------------|
| Secure                |
| Scalable              |
| Modular               |
| Realtime capable      |
| Production ready      |
| Microservices-ready   |

**Supports:**

| Capability                  |
|-----------------------------|
| Full collaboration lifecycle|
| Proof generation            |
| Reputation system           |
| Realtime workspace          |

---

If you want, I can now generate a **visual architecture diagram image** for ENQUEbet.
