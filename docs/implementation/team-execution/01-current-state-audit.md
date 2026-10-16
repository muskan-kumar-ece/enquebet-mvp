# Technical Audit: Collaboration, Teams, Messaging, Notifications & Project Execution

**Document ID:** `AUDIT-TEAM-EXEC-001`  
**Date:** October 15, 2026  
**Auditor:** Subagent A — Existing System Auditor  
**Scope:** Backend (`apps/collaboration`, `apps/posts`, `apps/chats`, `apps/notifications`), Frontend (`app/collaboration`, `app/posts`, `app/messages`, `components/feed`, `lib/api.ts`), Data Models, and Execution Lifecycle.

---

## Executive Summary

ENQUEbet's current platform implements the initial entry-point for team formation dubbed the **"Build With" engine**. At present, a user discovers a `Post` (which doubles as both a social feed post and a project opportunity), submits a `CollaborationRequest`, and when the post author accepts, the system inserts a record into `PostCollaborator` and automatically instantiates or appends to a group `Conversation` in `apps/chats/`.

While this provides a lightweight social connection mechanism, the system has **significant architectural, operational, and data-integrity gaps**:
1. **Chat as a Workspace Surrogate:** The platform currently treats group chat as the sole output of team formation. There are no workspace, milestone, task, file repository, or completion models.
2. **Untracked Roles & Permissions:** While `Post` allows specifying `PostRequirement` tags (e.g. "Backend Dev", "UI Designer"), collaboration requests and accepted `PostCollaborator` entries have zero binding to these requirements. All collaborators are undifferentiated without roles, permissions, or membership statuses.
3. **Data Integrity & Concurrency Vulnerabilities:** Unhandled database race conditions exist in request creation, acceptance, and group chat initialization due to missing database-level transactions, non-atomic multi-step operations, and lack of `select_for_update` locks.
4. **Endpoint Redundancy & Logic Drift:** `PostJoinView` in `apps/posts/` duplicates the collaboration request flow of `apps/collaboration/views.py` but omits the status reopening logic, causing unhandled 500 `IntegrityError` exceptions for previously declined users.
5. **Notification Over-flooding & Enum Desynchronization:** Every chat message in a group chat generates individual persistent database notifications for all members. Furthermore, notification types such as `collaboration_declined` are used in views but omitted from model choices.

---

## 1. Domain Model & Lifecycle Architecture

### 1.1 Current Architecture Diagram

```mermaid
flowchart TD
    subgraph "apps.posts"
        P[Post\n- id, title, description\n- user: Author/Owner]
        PR[PostRequirement\n- role_name] -->|FK| P
        PC[PostCollaborator\n- post, user\n- NO ROLE, NO STATUS] -->|FK| P
    end

    subgraph "apps.collaboration"
        CR[CollaborationRequest\n- post, sender, receiver\n- status: pending/accepted/declined/cancelled\n- unique_together: post, sender]
        CR -->|FK| P
    end

    subgraph "apps.chats"
        C[Conversation\n- is_group: true\n- project_id: UUID (unconstrained)\n- name: Title - Team]
        CM[ConversationMember\n- conversation, user\n- NO ROLE] -->|FK| C
        M[Message\n- conversation, sender, content] -->|FK| C
    end

    subgraph "apps.notifications"
        N[Notification\n- user, sender, type\n- reference_id: UUID]
    end

    CR -- "Accept" --> PC
    CR -- "Auto-Create / Add" --> CM
    CR -- "Emit" --> N
    M -- "Emit per-message" --> N
```

---

## 2. In-Depth Component Audits

### 2.1 Backend: Collaboration System (`backend/apps/collaboration/`)

#### Models (`models.py`)
- **`CollaborationRequest`**:
  - **Fields**:
    - `id`: `UUIDField(primary_key=True)`
    - `post`: `ForeignKey('posts.Post', on_delete=models.CASCADE)`
    - `sender`: `ForeignKey(User, related_name='sent_requests')`
    - `receiver`: `ForeignKey(User, related_name='received_requests')`
    - `status`: `CharField` choices: `pending`, `accepted`, `declined`, `cancelled` (default: `pending`)
    - `message`: `TextField(blank=True)`
    - `created_at`, `updated_at`: Timestamps
  - **Constraints**:
    - `unique_together = ['post', 'sender']`
    - `ordering = ['-created_at']`

#### Workflow & Views (`views.py`)
1. **Send Request (`SendCollaborationRequestView` - `POST /api/v1/collaboration/request/`)**:
   - Validates input with `CreateCollaborationRequestSerializer` (`post_id`, optional `message`).
   - Prevents requesting collaboration on own post (`post.user == request.user`).
   - Checks existing request:
     ```python
     existing_request = CollaborationRequest.objects.filter(post=post, sender=request.user).first()
     if existing_request and existing_request.status in ('pending', 'accepted'):
         return Response({'error': 'Request already sent'}, status=400)
     ```
   - Reopens declined/cancelled requests:
     ```python
     if existing_request and existing_request.status in ('declined', 'cancelled'):
         collab_request = existing_request
         collab_request.receiver = post.user
         collab_request.message = message
         collab_request.status = 'pending'
         collab_request.save(update_fields=['receiver', 'message', 'status', 'updated_at'])
     else:
         collab_request = CollaborationRequest.objects.create(...)
     ```
   - Emits notification to post owner (`type='collaboration_request'`).
   - **Vulnerabilities**:
     - Not wrapped in `@transaction.atomic`. Rapid concurrent clicks trigger database `IntegrityError` on `unique_together` constraint before the `filter(...).first()` check can intercept.
     - Does not record target role or requirement from `PostRequirement`.

2. **Accept Request (`AcceptCollaborationRequestView` - `POST /api/v1/collaboration/request/<id>/accept/`)**:
   - Queries pending request where `receiver == request.user`.
   - Transitions `collab_request.status = 'accepted'`.
   - Calls `PostCollaborator.objects.create(post=collab_request.post, user=collab_request.sender)`.
   - Invokes helper `create_or_get_group_chat(collab_request.post, collab_request.sender)`:
     - Searches `Conversation.objects.filter(project_id=post.id, is_group=True).first()`.
     - If exists: calls `ConversationMember.objects.get_or_create(...)` and creates welcome message: `"Welcome {username} to the team! 🎉"`.
     - If not: creates `Conversation(name=f"{post.title} - Team", is_group=True, project_id=post.id)`, adds post owner and new collaborator to `ConversationMember`, creates welcome message.
   - Creates notification (`type='collaboration_accepted'`).
   - Returns `{ 'message': 'Collaboration request accepted', 'group_chat_id': str(conversation.id) }`.
   - **Vulnerabilities**:
     - **Lack of Atomicity**: The entire multi-model write pipeline (`collab_request.save()`, `PostCollaborator.objects.create()`, `Conversation.objects.create()`, `ConversationMember.objects.create()`, `Message.objects.create()`, `Notification.objects.create()`) runs outside a database transaction. A failure in messaging or notification leaves an accepted collaborator with broken chat state.
     - **Duplicate Collaborator Crash**: If `PostCollaborator` already exists (e.g. created through an administrative action or previous interaction), `PostCollaborator.objects.create()` throws an unhandled `IntegrityError` (500).
     - **Concurrent Group Chat Forking**: If the owner accepts two requests simultaneously, both threads query `project_id=post.id, is_group=True`, find nothing, and execute `Conversation.objects.create()`, producing **duplicate divergent group chats** for a single post.

3. **Decline Request (`DeclineCollaborationRequestView` - `POST /api/v1/collaboration/request/<id>/decline/`)**:
   - Updates `status = 'declined'`.
   - Creates notification (`type='collaboration_declined'`).
   - **Flaw**: `collaboration_declined` is not in `Notification.NOTIFICATION_TYPES`.

4. **Cancel Request (`CancelCollaborationRequestView` - `POST /api/v1/collaboration/request/<id>/cancel/`)**:
   - Sender can cancel their own pending request (`status = 'cancelled'`).
   - **Flaw**: No notification is sent to the post owner that the request was withdrawn, leaving lingering obsolete notifications in the owner's inbox.

---

### 2.2 Backend: Posts System (`backend/apps/posts/`)

#### Models (`models.py`)
- **`Post`**: The central artifact in the feed.
  - Fields: `id`, `user` (Author), `title`, `description`, `category`, `view_type` (`public`, `college`, `openidea`), `location`, `college`, timestamps.
  - Acts as the ad-hoc project entity.
- **`PostRequirement`**:
  - `id`, `post` (FK), `role_name` (CharField).
  - Specifies desired roles for the project (e.g. "Full Stack Developer", "UI Designer").
  - **Disconnection**: There is no foreign key or link connecting `PostRequirement` to `CollaborationRequest` or `PostCollaborator`.
- **`PostCollaborator`**:
  - `id`, `post` (FK to `Post`, `related_name='collaborators'`), `user` (FK to `User`), `created_at`.
  - `unique_together = ['post', 'user']`.
  - **Gaps**:
    - No role identifier.
    - No status (e.g. `active`, `suspended`, `removed`, `completed`).
    - No joined timestamp tracking distinct from record creation.
    - No role-based access control.

#### Serializers & Views (`serializers.py`, `views.py`)
- **`PostSerializer`**:
  - Includes `attachments`, `requirements`, `tags`, counts, and interaction flags (`is_liked`, `is_saved`, `has_requested_collaboration`).
  - **Critical Omission**: Does NOT serialize `collaborators` or collaborator count. A frontend consumer viewing a post cannot determine who is on the team or how many spots remain.
- **`PostJoinView` (`POST /api/v1/posts/<post_id>/join/` and `POST /api/v1/posts/<post_id>/collaborate/`)**:
  - Duplicates collaboration request logic in `posts/views.py`:
    ```python
    if CollaborationRequest.objects.filter(post=post, sender=request.user).exclude(status='declined').exists():
        return Response({'error': 'Request already sent'}, status=400)
    collab_request = CollaborationRequest.objects.create(...)
    ```
  - **Severe Bug**: If a user was previously declined, `exclude(status='declined')` does not exclude them, so the code attempts `CollaborationRequest.objects.create(...)`. Because `unique_together = ['post', 'sender']` exists on the table, this raises an unhandled database `IntegrityError` (500) rather than reopening the existing record like `SendCollaborationRequestView` does.
- **Missing Endpoints**:
  - No `GET /api/v1/posts/<post_id>/collaborators/`
  - No `DELETE /api/v1/posts/<post_id>/collaborators/<user_id>/` (Kick/Remove member)
  - No `POST /api/v1/posts/<post_id>/leave/` (Collaborator voluntarily leave)

---

### 2.3 Backend: Chats & Messaging System (`backend/apps/chats/`)

#### Models (`models.py`)
- **`Conversation`**:
  - `id`, `name`, `is_group`, `project_id` (raw UUIDField, null=True, blank=True), timestamps.
  - **Flaw**: `project_id` is an unconstrained UUID without a foreign key to `Post` or `on_delete` cascade. Deleting a post creates orphaned conversations with dangling references.
- **`ConversationMember`**:
  - `id`, `conversation` (FK), `user` (FK), `joined_at`, `last_read_at`.
  - `unique_together = ['conversation', 'user']`.
  - **Flaw**: Lacks membership role (no owner, admin, or collaborator role distinction). Any member can trigger message sends; no administrative moderation is possible.
- **`Message`**:
  - `id`, `conversation` (FK), `sender` (FK), `content`, `attachment_url`, `created_at`.

#### Views & Consumers (`views.py`, `consumers.py`)
- **Access Control**:
  - `_get_conversation_for_user()` correctly verifies that `ConversationMember` exists for `request.user`.
  - WebSocket consumer `ChatConsumer` validates JWT in query params and verifies membership via `_is_conversation_member`.
- **Chat Creation**:
  - `ConversationListCreateView` and `StartDMView` use `select_for_update()` inside transactions for 1-on-1 DMs to prevent duplicate conversations.
  - **However**, group chat creation in `AcceptCollaborationRequestView` has **no transaction or locking**, exposing group chats to race-condition forks.
- **Notification Flooding in Chat**:
  - In `perform_create` and `_save_message`, every message loops over all other members:
    ```python
    for uid in other_user_ids:
        Notification.objects.create(
            user_id=uid,
            sender=self.request.user,
            type='message',
            reference_id=conversation.id,
            message=f'New message from {self.request.user.username}',
        )
    ```
  - For an active project chat with 6 members exchanging 50 messages during a work session, this writes `50 * 5 = 250` rows to `notifications` and pushes 250 WebSocket events, polluting the user's primary notification feed and degrading database throughput.

---

### 2.4 Backend: Notification System (`backend/apps/notifications/`)

#### Models & Delivery (`models.py`, `signals.py`, `consumers.py`)
- **`Notification`**:
  - Fields: `id`, `user`, `sender`, `type`, `reference_id`, `message`, `is_read`, `created_at`.
  - Defined types in model: `like`, `comment`, `follow`, `collaboration_request`, `collaboration_accepted`, `message`, `system`.
  - Missing types in model choices: `collaboration_declined`, `collaboration_cancelled`, `member_removed`, `workspace_*`, `task_*`.
- **Real-Time Delivery**:
  - Uses Django signal `post_save` on `Notification` to broadcast via Channels channel layer:
    `channel_layer.group_send(f'notifications_{user_id}', {'type': 'new_notification', 'notification': payload})`.
  - WebSocket consumer `NotificationConsumer` at `/ws/notifications/?token=<jwt>`.
  - Real-time notification pipeline is operational and functional.

---

### 2.5 Frontend Audit

#### 1. `frontend/app/collaboration/page.tsx`
- **Tabs**: `Received` and `Sent`.
- **Received tab**:
  - Displays requester avatar, username, post title, custom message, creation date, status badge.
  - If status is `pending`: renders "Accept & Chat" (calls `api.acceptCollaborationRequest`, routes to `/messages?convo=<id>`) and "Decline" (calls `api.declineCollaborationRequest`).
- **Sent tab**:
  - Displays outgoing requests with status.
  - **Gaps**:
    - Missing "Cancel Request" button even though backend provides `POST /collaboration/request/<id>/cancel/`.
    - No ability to edit request message.
    - No link to view project workspace.
- **Architectural Gap**:
  - Directory `frontend/components/collaboration/` **does not exist**. The entire UI is written in a single 222-line page component without modular separation of cards, modals, or state containers.

#### 2. `frontend/components/feed/PostCard.tsx`
- Contains a "Build With" button:
  ```typescript
  const handleBuildWith = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
          await api.sendCollaborationRequest(id, 'I would love to collaborate!');
          toast.success('Collaboration request sent!');
      } catch (err: any) {
          toast.error(err.message || 'Failed to send request');
      }
  };
  ```
- **Flaws**:
  - Sends a **hardcoded static string** (`'I would love to collaborate!'`) without opening a modal or allowing the user to describe their skills or select a role.
  - Does not reflect whether the request is already sent or pending on the card UI.
  - Does not check if the viewer is the post owner before clicking (owner receives an unhelpful error toast).

#### 3. `frontend/app/posts/[id]/page.tsx`
- Displays post requirements in a "Looking for:" card.
- Features a "Build With" button that disables if `post.has_requested_collaboration` is true.
- Still sends a hardcoded message string (`'I would love to collaborate on this project!'`).
- Does not allow selecting which requirement the user is applying for.
- Does not render a "Team Members" or "Collaborators" section.

#### 4. `frontend/lib/api.ts`
- Implements:
  - `sendCollaborationRequest(postId, message)`
  - `acceptCollaborationRequest(requestId)`
  - `declineCollaborationRequest(requestId)`
  - `getCollaborationRequests()`
- **Missing**:
  - `cancelCollaborationRequest(requestId)`
  - `getProjectCollaborators(postId)`
  - Any task or workspace endpoints.

---

## 3. Data Integrity & Concurrency Gap Matrix

| Vulnerability / Defect | Location | Mechanism | Impact | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **Non-atomic collaboration acceptance** | `AcceptCollaborationRequestView.post()` | Saves `CollaborationRequest`, creates `PostCollaborator`, creates `Conversation`, creates `ConversationMember`, creates `Message`, and creates `Notification` without `@transaction.atomic`. | Partial database state on any failure; request marked accepted without chat or collaborator. | **High** |
| **Group chat duplication race condition** | `create_or_get_group_chat()` | Queries `Conversation.objects.filter(project_id=post.id, is_group=True).first()` without lock. | Simultaneous acceptance creates two separate group chats for the same project. | **High** |
| **PostJoinView crash on re-request** | `apps/posts/views.py:575` | Excludes `status='declined'` from check, then executes `create()`, hitting `unique_together` constraint. | Unhandled 500 error for users who re-apply after being declined. | **Medium** |
| **Duplicate collaborator 500 crash** | `AcceptCollaborationRequestView.post()` | Uses `.create()` on `PostCollaborator` instead of `.get_or_create()`. | Unhandled 500 `IntegrityError` if user is already a collaborator. | **Medium** |
| **Notification model enum mismatch** | `DeclineCollaborationRequestView.post()` | Emits `Notification(type='collaboration_declined')` which is absent from `NOTIFICATION_TYPES`. | Data schema drift and validation failure if `full_clean()` is invoked. | **Low** |
| **Chat notification spam** | `apps/chats/views.py:180`, `consumers.py:133` | Creates a persistent `Notification` record for every single message sent in a group chat. | High DB write amplification; overwhelms recipient notification list. | **Medium** |
| **Missing cancellation UI/API hook** | `frontend/lib/api.ts`, `frontend/app/collaboration/page.tsx` | Backend supports request cancellation, frontend has neither API method nor button. | Users cannot withdraw sent collaboration requests. | **Medium** |

---

## 4. Architectural Comparison: Existing vs. Target Phase 3 System

| Feature Dimension | Current State (Audit Findings) | Target Phase 3 Architecture |
| :--- | :--- | :--- |
| **Core Entity** | `Post` (Publication/Idea) + `PostCollaborator` | `Post` as publication root linked to canonical `Workspace` / `Project` entity. |
| **Team Formation** | Direct accept -> immediate insertion into `PostCollaborator` + group chat. | Formal team roster with role assignments (`lead`, `contributor`, `reviewer`). |
| **Role Binding** | `PostRequirement` exists as display text only; zero association with collaborators. | Applicants apply to a specific `PostRequirement`; accepted members bind to role. |
| **Workspace Space** | Replaced entirely by a basic group chat (`apps/chats/`). | Dedicated `/workspace/:id` environment with tabs: Overview, Tasks, Files, Chat. |
| **Task Management** | **Non-existent.** No tasks, boards, assignments, or statuses. | Kanban/List Task model: `id`, `workspace`, `title`, `assignee`, `status` (`todo`, `in_progress`, `review`, `done`), `priority`, `due_date`. |
| **Project Milestones** | **Non-existent.** No milestones, deadlines, or progress tracking. | Workspace milestones with target deliverables and completion percentages. |
| **Deliverables & Files** | Static `attachment_url` in messages only. | Workspace file repository (`WorkspaceFile`) tracking project artifacts. |
| **Completion & Verification** | No completion workflow. Projects remain indefinite posts. | Completion request -> member peer review -> confirmation -> immutable `ProofOfWork`. |
| **Member Management** | Add-only. Cannot kick, leave, transfer ownership, or close recruitment. | Full membership lifecycle: Invite, Apply, Accept, Leave, Remove, Transfer Lead. |

---

## 5. Actionable Implementation Recommendations

### 5.1 Immediate Backend Integrity Fixes
1. **Wrap `AcceptCollaborationRequestView` in `transaction.atomic()`** with `select_for_update()` on the `CollaborationRequest` and a mutex/lock on `Conversation` creation to eliminate chat duplication and orphaned state.
2. **Harmonize `PostJoinView` with `SendCollaborationRequestView`** by deprecating `PostJoinView` or delegating its logic directly to `SendCollaborationRequestView` to prevent `IntegrityError` crashes.
3. **Replace `PostCollaborator.objects.create` with `get_or_create`**.
4. **Update `Notification.NOTIFICATION_TYPES`** to include `collaboration_declined`, `collaboration_cancelled`, and future workspace notification types.
5. **Throttled / Suppressed Chat Notifications**: Only notify users for group chat mentions (`@username`) or when unread messages exceed a threshold, rather than creating a persistent notification row for every single chat line.

### 5.2 Phase 3 Workspace & Task Execution Modeling
1. **Canonical Team & Workspace Models**:
   - Create `Workspace` linked 1-to-1 with `Post` (e.g. `post.workspace`).
   - Introduce `WorkspaceMember` with explicit roles: `LEAD`, `MEMBER`, `OBSERVER`.
   - Map existing `PostCollaborator` rows into `WorkspaceMember` via migration.
2. **Execution Primitives**:
   - Implement `Task` (`workspace`, `creator`, `assignee`, `title`, `description`, `status`, `priority`, `due_date`, `created_at`, `updated_at`).
   - Implement `TaskActivity` for audit logs of task movements.
3. **Frontend Restructuring**:
   - Create modular directory `frontend/components/collaboration/` containing `CollaborationModal.tsx`, `RequestCard.tsx`, and `RoleSelector.tsx`.
   - Implement `frontend/app/workspace/[id]/page.tsx` offering a unified workspace hub (Team Roster, Task Board, Files, Project Chat).
