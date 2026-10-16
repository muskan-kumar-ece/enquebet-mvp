Below is the **complete Security Architecture for ENQUEbet**, written at a level expected for a **fundable startup**. This includes auth flow diagram, JWT token system, role-based permissions, rate limiting, and encryption strategy.

---

# ENQUEbet — Security Architecture Document

**Security goals:**

- Protect user identity
- Protect ProofOfWork integrity
- Prevent abuse and spam
- Ensure secure communication
- Ensure scalable authentication and authorization

> **Security model follows: Zero Trust Principle**
> Every request must be authenticated and authorized.

---

# 1. Authentication Flow Diagram

**Full authentication lifecycle:**

```
┌─────────────┐
│   Client    │
│ (Frontend)  │
└──────┬──────┘
       │ Register/Login
       ▼
┌─────────────┐
│ Auth API    │
│ (Django)    │
└──────┬──────┘
       │ Validate credentials
       ▼
┌─────────────┐
│ PostgreSQL  │
│ User Table  │
└──────┬──────┘
       │ Generate JWT
       ▼
┌─────────────┐
│ JWT Issued  │
│ Access Token│
│ Refresh Token│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Client stores│
│ Access token │
└──────┬──────┘
       │
       ▼
Subsequent Requests
       │
Authorization: Bearer <JWT>
       ▼
┌─────────────┐
│ Backend     │
│ Validates JWT│
└──────┬──────┘
       │
       ▼
Access Granted / Denied
```

---

# 2. JWT Token System Architecture

ENQUEbet uses: **Access Token + Refresh Token Architecture**

---

## 2.1 Access Token

**Purpose:** Authenticate API requests.

**Contains payload:**

```json
{
  "user_id": "uuid",
  "email": "user@email.com",
  "role": "USER",
  "exp": 1712345678
}
```

**Properties:**

| Property      | Value                  |
|---------------|------------------------|
| Lifetime      | 15 minutes (short)     |
| Type          | Stateless              |
| Signing       | Signed with server secret |

---

## 2.2 Refresh Token

**Purpose:** Generate new access tokens.

**Properties:**

| Property  | Value        |
|-----------|--------------|
| Lifetime  | 7–30 days    |
| Storage   | Stored securely |
| Revocable | Yes          |

**Flow:**

```
Access token expires
      ↓
Client sends refresh token
      ↓
Backend verifies refresh token
      ↓
New access token issued
```

---

## 2.3 Token Storage Strategy

| Token          | Storage Location         |
|----------------|--------------------------|
| Access Token   | Memory *(preferred)*     |
| Refresh Token  | HTTP-only cookie         |

> Never store JWT in `localStorage` for production.
> Prevents **XSS attacks.**

---

# 3. Token Validation Flow

**Each request:**

```
Client → API Request
Authorization: Bearer TOKEN
      ↓
Backend middleware extracts token
      ↓
Backend verifies signature
      ↓
Backend checks expiration
      ↓
Backend extracts user_id
      ↓
Request processed
```

> If invalid: **`401 Unauthorized`** returned.

---

# 4. Role-Based Access Control (RBAC)

**Roles defined:** `USER` · `TEAM_MEMBER` · `OWNER` · `ADMIN`

---

## 4.1 USER Permissions

| Allowed                   | Restricted                    |
|---------------------------|-------------------------------|
| Create collaboration      | Cannot accept join requests   |
| Join collaboration        | Cannot complete project       |
| View collaborations       |                               |
| Send messages             |                               |
| Create tasks              |                               |
| Follow users              |                               |

---

## 4.2 OWNER Permissions

**Allowed:**

- Accept join requests
- Start project
- Submit completion
- Manage workspace

---

## 4.3 TEAM_MEMBER Permissions

| Allowed              | Restricted                    |
|----------------------|-------------------------------|
| Access workspace     | Cannot remove members         |
| Send messages        | Cannot accept join requests   |
| Complete tasks       |                               |
| Confirm completion   |                               |

---

## 4.4 ADMIN Permissions

**Allowed:**

- Full system access
- User moderation
- Proof verification override
- Delete abusive content

---

# 5. Authorization Middleware Architecture

Each protected endpoint uses:

```
Authentication check
+
Permission check
```

**Example:**

```
POST /collaboration/{id}/complete

Check:
  Is authenticated?
  Is owner?
  Is project IN_PROGRESS?

If YES → allow
If NO  → deny
```

---

# 6. Rate Limiting Strategy

**Prevents:** spam · brute force attacks · abuse

---

## 6.1 Rate Limits Per Endpoint Type

| Endpoint Type  | Limit                          |
|----------------|-------------------------------|
| Login          | 5 requests / minute / IP      |
| Register       | 3 requests / minute / IP      |
| General API    | 100 requests / minute / user  |
| Messages       | 30 messages / minute / user   |

---

## 6.2 Implementation

Using:

- Redis-based rate limiter
- or Django REST Framework throttling

**Example:**

```
User sends too many requests
      ↓
429 Too Many Requests returned
```

---

# 7. Password Security Architecture

> Passwords **NEVER** stored in plaintext.

**Stored using:** `bcrypt` hashing

**Flow:**

```
User enters password
      ↓
Backend hashes password with salt
      ↓
Stored in database
```

**Example stored value:**

```
$2b$12$QWERTYUIOP123456...
```

> Cannot be reversed.

---

# 8. Data Encryption Plan

---

## 8.1 Encryption In Transit

**All communication uses:** `HTTPS (TLS 1.2+)`

**Encrypts:**

- Passwords
- Tokens
- Messages
- Proof files

---

## 8.2 Encryption At Rest

**Sensitive data encrypted:**

| Layer    | Provider                        |
|----------|---------------------------------|
| Database | Supabase / AWS encryption       |
| Storage  | S3 / R2 encryption              |

---

# 9. Proof Integrity Protection

**ProofOfWork protected by:**

- Verification code
- Database constraints
- Owner permission validation
- Completion confirmation requirement

> Proof **cannot be modified** after creation.

---

# 10. API Security Measures

**Protection includes:**

| Measure              |
|----------------------|
| JWT authentication   |
| Permission validation|
| Input validation     |
| Rate limiting        |

---

# 11. Input Validation Layer

**All inputs validated for:**

| Threat                      |
|-----------------------------|
| SQL injection prevention    |
| XSS prevention              |
| Malformed data prevention   |

**Example:**

```
Invalid email rejected
Invalid UUID rejected
```

---

# 12. Session Security

| Token         | Policy                  |
|---------------|-------------------------|
| Access Token  | Short-lived             |
| Refresh Token | Revocable               |

**User logout:**

```
Refresh token invalidated
```

---

# 13. Storage Security

**Files stored in:** Cloudflare R2 / AWS S3

**Access via:** Signed URLs

> Prevents unauthorized file access.

---

# 14. Logging and Audit System

**All critical actions logged:**

| Action                    |
|---------------------------|
| Login                     |
| Proof generation          |
| Completion submission     |
| Join request acceptance   |

> Helps detect abuse.

---

# 15. Attack Protection Coverage

**Protected against:**

| Attack                  |
|-------------------------|
| SQL Injection           |
| XSS                     |
| CSRF                    |
| Token replay attacks    |
| Brute force attacks     |
| Unauthorized access     |

---

# 16. OAuth Integration *(Future Ready)*

**Future integration possible with:** Google Login · GitHub Login

**OAuth flow:**

```
User → Google → Backend → JWT issued
```

---

# 17. Security Architecture Summary Diagram

```
Client
 │
 HTTPS
 │
 ▼
Frontend (Next.js)
 │
 Authorization: Bearer JWT
 │
 ▼
Backend (Django)
 │
 JWT Validation
 Permission Check
 Rate Limiting
 │
 ▼
Database (PostgreSQL)
```

---

# Final Security Architecture Summary

**ENQUEbet security includes:**

| Layer                        |
|------------------------------|
| JWT Authentication           |
| Role-based access control    |
| Rate limiting                |
| Encrypted communication      |
| Password hashing             |
| Permission validation        |
| Proof integrity protection   |
| Secure storage access        |

**This meets standards required for:**

| Standard                            |
|-------------------------------------|
| Startup funding readiness           |
| Production deployment               |
| Enterprise-grade security baseline  |

---

If you want, I can also generate a **DevOps Architecture (CI/CD, deployment pipeline, scaling infrastructure)** next.
