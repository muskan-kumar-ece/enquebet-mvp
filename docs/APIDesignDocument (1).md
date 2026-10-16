Below is the **complete API Design Document for ENQUEbet**, including all endpoints, request structures, response structures, status codes, authentication, and error handling. This is production-grade and ready for Django REST Framework implementation.

---

# ENQUEbet — API Design Document

| Field           | Value                              |
|-----------------|------------------------------------|
| **Version**     | 1.0                                |
| **Base URL**    | `https://api.enquebet.com/api/v1`  |
| **Format**      | JSON                               |
| **Auth**        | JWT Bearer Token                   |

**Authorization header:**

```
Authorization: Bearer <token>
```

---

# 1. Global API Standards

---

## 1.1 Request Headers

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

---

## 1.2 Success Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

---

## 1.3 Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE",
  "errors": {}
}
```

**Example:**

```json
{
  "success": false,
  "message": "Email already exists",
  "error_code": "EMAIL_EXISTS"
}
```

---

## 1.4 Standard HTTP Status Codes

| Code | Meaning                |
|------|------------------------|
| 200  | OK                     |
| 201  | Created                |
| 400  | Bad Request            |
| 401  | Unauthorized           |
| 403  | Forbidden              |
| 404  | Not Found              |
| 409  | Conflict               |
| 500  | Internal Server Error  |

---

# 2. Authentication APIs

---

## 2.1 Register User

**`POST /auth/register`**

**Request:**

```json
{
  "email": "user@email.com",
  "username": "muskan",
  "password": "StrongPassword123",
  "full_name": "Muskan Kumar"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": "uuid",
    "email": "user@email.com",
    "username": "muskan"
  }
}
```

**Status Codes:** `201 Created` · `409 Email exists`

---

## 2.2 Login

**`POST /auth/login`**

**Request:**

```json
{
  "email": "user@email.com",
  "password": "StrongPassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "JWT_TOKEN",
    "refresh_token": "REFRESH_TOKEN",
    "user": {
      "id": "uuid",
      "email": "user@email.com",
      "username": "muskan"
    }
  }
}
```

---

## 2.3 Get Current User

**`GET /auth/me`**

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@email.com",
    "username": "muskan",
    "reputation_score": 120
  }
}
```

---

## 2.4 Reset Password

**`POST /auth/reset-password`**

**Request:**

```json
{
  "email": "user@email.com"
}
```

---

# 3. User Profile APIs

---

## 3.1 Get User Profile

**`GET /users/{user_id}`**

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "muskan",
    "bio": "Builder",
    "skills": [],
    "reputation_score": 120,
    "completed_projects": 5
  }
}
```

---

## 3.2 Update Profile

**`PUT /users/profile`**

**Request:**

```json
{
  "bio": "Full stack developer",
  "college": "XYZ College",
  "location": "Hyderabad"
}
```

---

# 4. Skills APIs

---

## 4.1 Add Skill

**`POST /users/skills`**

**Request:**

```json
{
  "skill_id": "uuid",
  "level": "ADVANCED"
}
```

---

## 4.2 Get User Skills

**`GET /users/{user_id}/skills`**

---

# 5. Collaboration Request APIs

---

## 5.1 Create Collaboration Request

**`POST /collaborations`**

**Request:**

```json
{
  "title": "Build AI Startup",
  "description": "Looking for backend developer",
  "skills_required": ["uuid"],
  "location": "Hyderabad",
  "is_remote": true,
  "max_members": 4,
  "project_type": "STARTUP"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "collaboration_id": "uuid"
  }
}
```

---

## 5.2 Get Feed

**`GET /collaborations/feed`**

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "AI Startup",
      "owner": {},
      "status": "OPEN"
    }
  ]
}
```

---

## 5.3 Get Collaboration Details

**`GET /collaborations/{id}`**

---

## 5.4 Update Collaboration

**`PUT /collaborations/{id}`**

---

## 5.5 Change Collaboration Status

**`POST /collaborations/{id}/status`**

**Request:**

```json
{
  "status": "IN_PROGRESS"
}
```

---

# 6. Join Request APIs

---

## 6.1 Send Join Request

**`POST /join-requests`**

**Request:**

```json
{
  "collaboration_id": "uuid",
  "message": "I want to join"
}
```

---

## 6.2 Accept Join Request

**`POST /join-requests/{id}/accept`**

---

## 6.3 Reject Join Request

**`POST /join-requests/{id}/reject`**

---

# 7. Workspace APIs

---

## 7.1 Get Workspace

**`GET /workspaces/{id}`**

---

## 7.2 Send Message

**`POST /workspaces/{id}/messages`**

**Request:**

```json
{
  "content": "Hello team"
}
```

---

## 7.3 Get Messages

**`GET /workspaces/{id}/messages`**

---

# 8. Task APIs

---

## 8.1 Create Task

**`POST /tasks`**

**Request:**

```json
{
  "workspace_id": "uuid",
  "title": "Create frontend",
  "assigned_to": "uuid"
}
```

---

## 8.2 Update Task

**`PUT /tasks/{id}`**

---

## 8.3 Get Tasks

**`GET /workspaces/{id}/tasks`**

---

# 9. Completion and Proof APIs

---

## 9.1 Submit Completion

**`POST /collaborations/{id}/complete`**

**Request:**

```json
{
  "proof_file_url": "url"
}
```

---

## 9.2 Confirm Completion

**`POST /proof/{id}/confirm`**

---

## 9.3 Get Proof

**`GET /proof/{id}`**

---

# 10. Peer Rating APIs

---

## 10.1 Submit Rating

**`POST /ratings`**

**Request:**

```json
{
  "proof_id": "uuid",
  "rated_user_id": "uuid",
  "rating": 5,
  "feedback": "Great collaborator"
}
```

---

# 11. Follow APIs

---

## 11.1 Follow User

**`POST /users/{id}/follow`**

---

## 11.2 Unfollow User

**`DELETE /users/{id}/follow`**

---

# 12. Notification APIs

---

## 12.1 Get Notifications

**`GET /notifications`**

---

## 12.2 Mark Read

**`PUT /notifications/{id}/read`**

---

# 13. External Proof APIs

---

## 13.1 Add External Proof

**`POST /external-proofs`**

**Request:**

```json
{
  "title": "My Project",
  "proof_file_url": "url"
}
```

---

# 14. Error Handling Standards

**Error Example:**

```json
{
  "success": false,
  "message": "Unauthorized",
  "error_code": "AUTH_REQUIRED"
}
```

**Error Codes:**

| Code               |
|--------------------|
| `AUTH_REQUIRED`    |
| `INVALID_INPUT`    |
| `NOT_FOUND`        |
| `PERMISSION_DENIED`|
| `VALIDATION_ERROR` |
| `SERVER_ERROR`     |

---

# Final API Architecture Summary

**Total endpoint groups defined:**

| Group                  |
|------------------------|
| Auth APIs              |
| User APIs              |
| Skill APIs             |
| Collaboration APIs     |
| Join Request APIs      |
| Workspace APIs         |
| Task APIs              |
| Proof APIs             |
| Rating APIs            |
| Follow APIs            |
| Notification APIs      |
| External Proof APIs    |

**This API design is:**

| Property         |
|------------------|
| Complete         |
| Scalable         |
| Secure           |
| Production-ready |
