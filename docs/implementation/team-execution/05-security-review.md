# ENQUEbet — Security Review & Threat Model: Collaboration, Team Management & Workspace Execution

**Document Status:** Approved Security Baseline & Architecture Specification  
**Author:** Subagent D — Security & Threat Reviewer  
**Target Subsystems:** Collaboration Requests, Team Roster, Workspace Execution, Task Management, Deliverables, Team Chat, Completion Confirmation, Proof of Work (PoW), Peer Ratings, Project Activity Ledger  
**Date:** 15 October 2026  
**Security Standard:** Zero Trust Architecture, OWASP Top 10 API Security (2023), STRIDE Threat Modeling  

---

## 1. Executive Summary & Security Baseline

ENQUEbet is an evidence-first builder collaboration and reputation platform. Unlike conventional social media, the core value driver of ENQUEbet is **verifiable builder reputation earned through completed, peer-confirmed projects**.

Because reputation points, builder verification badges, and future career/grant opportunities hinge upon Proof of Work (PoW) authenticity, **the system is a high-value target for manipulation, collusion, data exfiltration, and malicious disruption**.

### 1.1 The Seven Critical Security Domains

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ENQUEbet Security Perimeter                           │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ 1. BOLA / IDOR Protection    │ Scoped querysets, hierarchical validation,   │
│                               │ private project 404 masking                  │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ 2. Privilege Escalation Guard │ Separation of duties, strict state machines, │
│                               │ non-self-approving deliverables              │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ 3. Membership Revocation      │ Instant WebSocket eviction, token blacklists,│
│                               │ immediate Redis group discard                │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ 4. Concurrency & Race Control │ Pessimistic row locking (select_for_update), │
│                               │ idempotent state checks, unique constraints  │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ 5. Data & Proof Integrity     │ Cryptographic snapshotting, immutable DB     │
│                               │ records, blind double-peer reviews           │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ 6. File & Link Validation     │ Magic-byte detection, signed cloud URLs,     │
│                               │ non-routable IP filtering (SSRF protection)  │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ 7. Audit Log Tampering Guard  │ Append-only DB tables, revoked UPDATE/DELETE,│
│                               │ server-side internal emission only           │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 2. STRIDE Threat Model Matrix

| Threat Category | Target Subsystem | Attack Vector | Impact | Severity | Primary Mitigation |
|---|---|---|---|---|---|
| **Spoofing** | WebSocket Team Chat | Query parameter token sniffing or replay; sender identity forgery | Unauthorized actor broadcasts in confidential project chat | **HIGH** | Ephemeral ticket exchange, scope-bound auth, Channels session binding |
| **Tampering** | Deliverables & PoW | Contributor alters deliverable URLs or commits after project completion | Falsified proof of work, reputation fraud | **CRITICAL** | Git commit-hash freezing, SHA-256 deliverable hashes, immutable snapshots |
| **Repudiation** | Peer Ratings & Activity | User denies submitting negative peer review or approving task | Disputed milestones, toxic team deadlock, untracked blame | **HIGH** | Cryptographic event log, server-generated `ProjectActivity`, signed records |
| **Information Disclosure** | Workspace & Tasks (BOLA) | Direct ID enumeration on `/api/v1/workspaces/{id}/tasks` or files | Non-members scraping stealth/confidential venture IP | **CRITICAL** | DRF Object-Level Permissions, tenant isolation, 404 instead of 403 on private targets |
| **Denial of Service** | Join Requests & File Uploads | Concurrent join flood (thundering herd), zip bomb uploads, oversized attachments | Service exhaustion, database connection pool lockup, S3 storage bloat | **HIGH** | Distributed rate limiting (Redis token bucket), strict file size/magic byte guards, DB transaction timeouts |
| **Elevation of Privilege** | Team Roles & Status | Contributor sends `PATCH /team_members/{id}` with `role="LEAD"` or approves own task | Unauthorized takeover of workspace, self-minted reputation | **CRITICAL** | Explicit role transition service layer, strict separation of assignee vs approver |

---

## 3. Deep-Dive Security Domain 1: Broken Object-Level Authorization (BOLA / IDOR)

### 3.1 Attack Scenarios & Vulnerability Mechanics

1. **Horizontal IDOR Across Workspaces**: User A belongs to Workspace 1. User A issues `GET /api/v1/workspaces/ws-999/tasks` or `GET /api/v1/workspaces/ws-999/messages`. If the backend filters solely by `Task.objects.filter(workspace_id=kwargs['workspace_id'])` without checking whether `request.user` is an active member of `ws-999`, all tasks, discussions, and attached assets are leaked.
2. **Cross-Tenant Hierarchical Parameter Tampering (Parent-Child Mismatch)**:
   ```http
   PATCH /api/v1/workspaces/ws-authorized/tasks/task-unauthorized
   Content-Type: application/json

   {"status": "DONE"}
   ```
   If the view checks that `ws-authorized` contains `request.user`, but retrieves the task using `Task.objects.get(id=kwargs['task_id'])` without verifying `task.workspace_id == ws-authorized.id`, an attacker can modify tasks belonging to any project.
3. **Asset & Deliverable Leaks**: Direct access to deliverable files (`/api/v1/deliverables/{id}/download`). A non-member guesses or enumerates the UUID to obtain proprietary code, design mockups, or strategy memos.
4. **Information Leakage via Error Codes**: Returning `403 Forbidden` confirms that a secret project or workspace exists at that UUID. Attackers can brute-force UUID prefixes or sequential IDs to discover stealth projects.

### 3.2 Defensive Architecture & Rules

- **Rule 1.1 (Universal Scoped Querysets)**: Views must NEVER access database objects without scoping to the authenticated user's active memberships.
- **Rule 1.2 (Composite Key & Relation Binding)**: When updating or retrieving child objects (tasks, deliverables, files, comments), queries must always chain parent relationship assertions:
  ```python
  task = get_object_or_404(
      Task.objects.select_related('workspace'),
      id=task_id,
      workspace_id=workspace_id,
      workspace__members__user=request.user,
      workspace__members__state='ACTIVE'
  )
  ```
- **Rule 1.3 (Privacy-Preserving 404s)**: For private projects or workspaces, any unauthorized access attempt (whether from anonymous users or non-member authenticated users) MUST return `404 Not Found`, not `403 Forbidden`.

### 3.3 Production-Grade DRF Implementation

```python
# backend/apps/collaboration/permissions.py
from rest_framework import permissions
from django.shortcuts import get_object_or_404
from .models import Workspace, WorkspaceMember

class IsActiveWorkspaceMember(permissions.BasePermission):
    """
    Enforces that the requesting user is an active, verified member
    of the workspace specified in the URL or object.
    """
    message = "Resource not found or access denied."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace_id = view.kwargs.get('workspace_id')
        if not workspace_id:
            # If workspace_id is not in URL kwargs, delegate to has_object_permission
            return True

        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            state='ACTIVE'
        ).exists()

    def has_object_permission(self, request, view, obj):
        # Resolve workspace reference regardless of target model type
        workspace = getattr(obj, 'workspace', obj if isinstance(obj, Workspace) else None)
        if not workspace:
            return False

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            state='ACTIVE'
        ).exists()


class IsWorkspaceLeadOrOwner(permissions.BasePermission):
    """
    Restricts access to project owners or designated team leads.
    """
    def has_object_permission(self, request, view, obj):
        workspace = getattr(obj, 'workspace', obj if isinstance(obj, Workspace) else None)
        if not workspace:
            return False

        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role__in=['OWNER', 'LEAD'],
            state='ACTIVE'
        ).exists()
```

---

## 4. Deep-Dive Security Domain 2: Privilege Escalation & Role State Machines

### 4.1 Role Hierarchy & Separation of Duties

The system must recognize four discrete operational roles within a team workspace:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Role Hierarchy & Boundaries                     │
├──────────────────┬─────────────────────────────────────────────────────┤
│ OWNER            │ Project creator. Complete administrative control,   │
│                  │ workspace lifecycle initiation, completion request, │
│                  │ member removal, role reassignment.                  │
├──────────────────┼─────────────────────────────────────────────────────┤
│ LEAD / CO-OWNER  │ Delegated project lead. Can manage tasks, review    │
│                  │ deliverables, invite members. CANNOT transfer owner │
│                  │ or delete workspace.                                │
├──────────────────┼─────────────────────────────────────────────────────┤
│ CONTRIBUTOR      │ Team member. Pick up assigned tasks, submit         │
│                  │ deliverables, confirm project completion.           │
│                  │ CANNOT approve own deliverables or manage members.  │
├──────────────────┼─────────────────────────────────────────────────────┤
│ APPLICANT/GUEST  │ Read-only on public assets. CANNOT access internal  │
│                  │ workspace, tasks, files, or chat.                   │
└──────────────────┴─────────────────────────────────────────────────────┘
```

### 4.2 Critical Privilege Escalation Vectors

#### Attack Vector 2A: Self-Approval of Deliverables
- **Flaw**: Contributor Alice is assigned Task T ("Build Auth Flow"). Alice submits deliverable PR and immediately calls `POST /api/v1/tasks/{id}/approve`. If the endpoint only verifies `IsWorkspaceMember`, Alice successfully marks her own work as completed without code review or quality verification.
- **Enforcement Rule**: **Separation of Duties (Four-Eyes Principle)**. An assignee CANNOT be the approver of their own task/deliverable.
  $$\text{CanApprove}(u, \text{task}) \iff (\text{Role}(u) \in \{\text{OWNER}, \text{LEAD}\}) \land (u \neq \text{task.assigned\_to})$$
  *Exception*: If the project is a verified solo project where the owner is the sole member, self-completion triggers distinct solo verification rules.

#### Attack Vector 2B: Self-Promotion via Payload Mass-Assignment
- **Flaw**: Contributor sends `PATCH /api/v1/workspaces/{ws_id}/members/me/` with payload `{"role": "OWNER"}`.
- **Enforcement Rule**:
  - `role` is a read-only field on default member serializers.
  - Role mutation requires an explicit endpoint: `POST /api/v1/workspaces/{ws_id}/members/{user_id}/change-role`.
  - Only the current `OWNER` can reassign `LEAD` or transfer `OWNER`.
  - Transferring `OWNER` requires a 2-step challenge: Owner initiates transfer $\to$ Target accepts $\to$ Old owner demoted to `LEAD` (prevents orphaned workspaces).

#### Attack Vector 2C: Unilateral Completion Forgery
- **Flaw**: Project owner unilaterally triggers completion and claims 100% reputation score without contributor agreement, or contributor unilaterally closes project.
- **Enforcement Rule**: Formal completion workflow state machine:
  $$\text{IN\_PROGRESS} \xrightarrow{\text{Owner submits}} \text{COMPLETION\_PENDING} \xrightarrow[\ge M \text{ approvals}]{\text{Team Consensus}} \text{COMPLETED} \to \text{PoW Minted}$$
  If consensus is rejected or times out, status reverts to `IN_PROGRESS` or enters `DISPUTED`.

### 4.3 Deliverable Review State Machine Implementation

```python
# backend/apps/collaboration/services/task_service.py
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone
from apps.collaboration.models import Task, WorkspaceMember, ProjectActivity

class TaskWorkflowService:
    @staticmethod
    @transaction.atomic
    def submit_deliverable(task_id: str, user, deliverable_url: str, deliverable_notes: str):
        task = Task.objects.select_for_update().get(id=task_id)
        
        # Verify user is assignee
        if task.assigned_to != user:
            raise PermissionDenied("Only the designated task assignee can submit deliverables.")
            
        if task.status not in ['TODO', 'IN_PROGRESS', 'CHANGES_REQUESTED']:
            raise ValidationError(f"Cannot submit deliverable for task in state {task.status}")

        task.status = 'IN_REVIEW'
        task.deliverable_url = deliverable_url
        task.deliverable_notes = deliverable_notes
        task.submitted_at = timezone.now()
        task.save(update_fields=['status', 'deliverable_url', 'deliverable_notes', 'submitted_at', 'updated_at'])

        ProjectActivity.log(
            workspace=task.workspace,
            actor=user,
            event_type='TASK_SUBMITTED',
            metadata={'task_id': str(task.id), 'title': task.title}
        )
        return task

    @staticmethod
    @transaction.atomic
    def review_deliverable(task_id: str, reviewer, decision: str, rejection_reason: str = ""):
        """
        Decision: 'APPROVED' or 'CHANGES_REQUESTED'
        """
        task = Task.objects.select_for_update().get(id=task_id)

        if task.status != 'IN_REVIEW':
            raise ValidationError("Task is not currently pending review.")

        # PRIVILEGE ESCALATION PREVENTION: Assignee cannot approve own work
        if task.assigned_to == reviewer:
            raise PermissionDenied("Self-approval prohibited. Deliverables must be reviewed by Lead or Owner.")

        # Verify reviewer role in workspace
        reviewer_member = WorkspaceMember.objects.filter(
            workspace=task.workspace,
            user=reviewer,
            role__in=['OWNER', 'LEAD'],
            state='ACTIVE'
        ).first()

        if not reviewer_member:
            raise PermissionDenied("Insufficient permissions to review deliverables.")

        if decision == 'APPROVED':
            task.status = 'DONE'
            task.approved_by = reviewer
            task.approved_at = timezone.now()
            task.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
            event = 'TASK_APPROVED'
        elif decision == 'CHANGES_REQUESTED':
            if not rejection_reason.strip():
                raise ValidationError("Rejection reason is mandatory when requesting changes.")
            task.status = 'CHANGES_REQUESTED'
            task.rejection_reason = rejection_reason
            task.save(update_fields=['status', 'rejection_reason', 'updated_at'])
            event = 'TASK_REJECTED'
        else:
            raise ValidationError("Invalid review decision.")

        ProjectActivity.log(
            workspace=task.workspace,
            actor=reviewer,
            event_type=event,
            metadata={'task_id': str(task.id), 'decision': decision, 'reason': rejection_reason}
        )
        return task
```

---

## 5. Deep-Dive Security Domain 3: Membership Revocation, Active Sessions & WebSocket Eviction

### 5.1 Threat Analysis: The "Orphaned Socket" Problem

When an owner kicks Alice from a team:
1. `team_members` row is updated to `state='REMOVED'` or deleted.
2. **Vulnerability in WebSocket Layer (`apps/chats/consumers.py`)**:
   - Connection validation occurred strictly inside `connect()`.
   - Django Channels groups (`chat_<conversation_id>`) reside in Redis memory.
   - Without an active eviction trigger, Alice's established WebSocket stays alive!
   - Every time Bob or Charlie posts confidential IP, code snippets, or API credentials into team chat, Redis distributes the message to Alice's active connection.
   - Furthermore, Alice can continue emitting `receive()` payloads into the group unless each payload validates active membership.
3. **Vulnerability in REST Layer**:
   - SimpleJWT tokens are stateless and valid for 15 minutes.
   - If REST authorization checks read cached claims rather than database membership state, Alice can make REST calls until access token expiration.

### 5.2 Realtime Eviction Architecture

```
[Owner kicks Member] ──> [WorkspaceService.remove_member]
                                    │
       ┌────────────────────────────┴────────────────────────────┐
       ▼                                                         ▼
[PostgreSQL DB]                                          [Redis Channel Layer]
Update state='REMOVED'                                   Broadcast 'force_disconnect'
Revoke all signed URLs                                   to user's active channel(s)
                                                                 │
                                                                 ▼
                                                        [ChatConsumer]
                                                        1. Receive event
                                                        2. group_discard(group)
                                                        3. close(code=4003)
```

### 5.3 Implementation: Instant WebSocket Eviction & Active Frame Checking

#### Step 1: Member Removal Service with Realtime Disconnect Signal

```python
# backend/apps/collaboration/services/membership_service.py
from django.db import transaction
from django.core.exceptions import PermissionDenied, ValidationError
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.collaboration.models import Workspace, WorkspaceMember, ProjectActivity

class MembershipService:
    @staticmethod
    @transaction.atomic
    def remove_member(workspace_id: str, actor, target_user_id: str, reason: str):
        workspace = Workspace.objects.select_for_update().get(id=workspace_id)
        
        # Verify actor is owner or lead
        actor_member = WorkspaceMember.objects.filter(
            workspace=workspace, user=actor, role__in=['OWNER', 'LEAD'], state='ACTIVE'
        ).first()
        if not actor_member:
            raise PermissionDenied("Only owner or lead can remove team members.")

        target_member = WorkspaceMember.objects.select_for_update().filter(
            workspace=workspace, user_id=target_user_id, state='ACTIVE'
        ).first()
        if not target_member:
            raise ValidationError("Target user is not an active member.")

        if target_member.role == 'OWNER':
            raise PermissionDenied("Cannot remove the project owner.")

        # 1. Update database state
        target_member.state = 'REMOVED'
        target_member.left_at = timezone.now()
        target_member.save(update_fields=['state', 'left_at', 'updated_at'])

        # 2. Log activity
        ProjectActivity.log(
            workspace=workspace,
            actor=actor,
            event_type='MEMBER_REMOVED',
            metadata={'removed_user_id': str(target_user_id), 'reason': reason}
        )

        # 3. REALTIME EVICTION: Evict from Redis & terminate active WebSocket
        channel_layer = get_channel_layer()
        if channel_layer:
            # Broadcast disconnect signal specifically targeting the removed user's session
            async_to_sync(channel_layer.group_send)(
                f"workspace_{workspace.id}",
                {
                    "type": "membership_revoked",
                    "user_id": str(target_user_id),
                    "workspace_id": str(workspace.id)
                }
            )
            # Also disconnect from associated conversation
            if workspace.conversation_id:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{workspace.conversation_id}",
                    {
                        "type": "membership_revoked",
                        "user_id": str(target_user_id),
                        "conversation_id": str(workspace.conversation_id)
                    }
                )
```

#### Step 2: Consumer Handling of Eviction Signal & Per-Frame Revalidation

```python
# backend/apps/chats/consumers.py (Hardened)
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class HardenedChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.group_name = f'chat_{self.conversation_id}'
        
        # 1. Validate JWT from headers or subprotocol (query params deprecated for security)
        token = self._extract_token()
        if not token:
            await self.close(code=4001)  # Unauthorized
            return

        self.user = await self._get_user_from_token(token)
        if not self.user or not self.user.is_active:
            await self.close(code=4001)
            return

        # 2. Strict membership validation
        if not await self._is_active_member(self.user, self.conversation_id):
            await self.close(code=4003)  # Forbidden
            return

        # 3. Join groups
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.channel_layer.group_add(f"user_{self.user.id}", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        if hasattr(self, 'user') and self.user:
            await self.channel_layer.group_discard(f"user_{self.user.id}", self.channel_name)

    async def receive(self, text_data):
        """
        HARDENED: Every incoming frame checks active membership
        Prevents exploit window if member was removed mid-session.
        """
        is_member = await self._is_active_member(self.user, self.conversation_id)
        if not is_member:
            await self.send(text_data=json.dumps({"error": "Membership revoked."}))
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.close(code=4003)
            return

        data = json.loads(text_data)
        content = data.get('content', '').strip()
        if not content:
            return

        # Save and broadcast
        msg = await self._save_message(content)
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat_message", "message": msg}
        )

    async def membership_revoked(self, event):
        """
        Triggered when backend membership service evicts a user.
        """
        revoked_user_id = event.get('user_id')
        if str(self.user.id) == str(revoked_user_id):
            # Send client notice and immediately terminate connection
            await self.send(text_data=json.dumps({
                "type": "error",
                "code": "ACCESS_REVOKED",
                "message": "You have been removed from this workspace/chat."
            }))
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.close(code=4003)

    @database_sync_to_async
    def _is_active_member(self, user, conversation_id):
        from apps.chats.models import ConversationMember
        return ConversationMember.objects.filter(
            conversation_id=conversation_id,
            user=user
        ).exists()
```

---

## 6. Deep-Dive Security Domain 4: Concurrency, Race Conditions & Distributed Locking

### 6.1 Critical Concurrency Vulnerabilities

#### 1. The "Thundering Herd" Over-Capacity Join Race
- **Scenario**: A project specifies `max_members = 3`. There are 2 active members (1 slot left).
- Ten applicants apply. Two leads/owners concurrently hit `POST /api/v1/join-requests/{id1}/accept` and `POST /api/v1/join-requests/{id2}/accept` at the exact same millisecond.
- Thread 1 checks: `members.count() = 2 < 3` $\to$ TRUE.
- Thread 2 checks: `members.count() = 2 < 3` $\to$ TRUE.
- Both threads execute `WorkspaceMember.objects.create(...)`.
- **Result**: Team capacity breached (4 members). Breaks team integrity, compensation splits, and PoW quorum calculation.

#### 2. Duplicate Application Submission Race
- Applicant rapidly double-clicks "Apply" or runs concurrent API scripts.
- Two pending join requests are created for the same user on the same project.

#### 3. Simultaneous Completion Confirmation Quorum Race
- When 2 remaining members simultaneously confirm completion:
- Both requests evaluate whether confirmation threshold is reached ($N \ge \text{threshold}$).
- Both evaluate to TRUE and concurrently attempt to mint `ProofOfWork` and credit reputation points, resulting in double-minted PoW or database constraint failure.

### 6.2 Mitigation Strategy & Concrete Implementation

1. **Database-Level Unique Constraints**:
   - `UNIQUE(workspace_id, user_id)` on `WorkspaceMember`
   - `UNIQUE(collaboration_id, sender_id)` on `CollaborationRequest`
   - `UNIQUE(collaboration_id)` on `ProofOfWork`
   - `UNIQUE(proof_id, rated_user_id, rated_by_user_id)` on `PeerRating`
2. **Pessimistic Locking (`select_for_update`)**:
   - Lock the parent `Workspace` or `Project` row during any operation that mutates member count, status, or task completion.

```python
# backend/apps/collaboration/services/join_service.py
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError, PermissionDenied
from apps.collaboration.models import CollaborationRequest, Workspace, WorkspaceMember, ProjectActivity

class JoinRequestService:
    @staticmethod
    @transaction.atomic
    def accept_join_request(request_id: str, actor):
        """
        Safely accepts a join request with strict pessimistic locking
        to prevent over-capacity race conditions.
        """
        # 1. Lock the join request row
        join_req = CollaborationRequest.objects.select_for_update().select_related('post').get(id=request_id)

        if join_req.status != 'pending':
            raise ValidationError("This join request is no longer pending.")

        # 2. Lock the parent Workspace row to serialize all member additions
        workspace = Workspace.objects.select_for_update().get(post=join_req.post)

        # Verify actor authority
        actor_member = WorkspaceMember.objects.filter(
            workspace=workspace, user=actor, role__in=['OWNER', 'LEAD'], state='ACTIVE'
        ).first()
        if not actor_member:
            raise PermissionDenied("Only owner or lead can accept join requests.")

        # 3. Check active capacity under lock
        active_member_count = WorkspaceMember.objects.filter(
            workspace=workspace, state='ACTIVE'
        ).count()

        if active_member_count >= workspace.max_members:
            # Auto-decline or reject request due to capacity
            join_req.status = 'declined'
            join_req.rejection_reason = "Team has reached maximum capacity."
            join_req.save(update_fields=['status', 'rejection_reason', 'updated_at'])
            raise ValidationError("Team capacity exceeded. Cannot accept additional members.")

        # 4. Atomically create membership and update request
        join_req.status = 'accepted'
        join_req.save(update_fields=['status', 'updated_at'])

        member, created = WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=join_req.sender,
            defaults={
                'role': 'CONTRIBUTOR',
                'state': 'ACTIVE',
            }
        )
        if not created and member.state != 'ACTIVE':
            member.state = 'ACTIVE'
            member.save(update_fields=['state', 'updated_at'])

        # 5. Log activity
        ProjectActivity.log(
            workspace=workspace,
            actor=actor,
            event_type='MEMBER_JOINED',
            metadata={'user_id': str(join_req.sender.id), 'username': join_req.sender.username}
        )

        return member
```

---

## 7. Deep-Dive Security Domain 5: Data Integrity, Proof Immutability & Anti-Collusion

### 7.1 Cryptographic Proof of Work (PoW) Snapshotting

Proof of Work must not simply point to a live GitHub URL or editable database row. A live branch can be rewritten via `git push --force`, or an S3 bucket file can be overwritten.

#### The Tamper-Evident Snapshot Requirement
When completion is confirmed:
1. **Repository Evidence**: Must record the **exact, immutable 40-character Git Commit SHA-1 / SHA-256**, NOT a mutable branch name like `main` or `dev`.
2. **File Deliverables**: Each uploaded deliverable file is fingerprinted using **SHA-256**.
3. **Participant Roster**: Exact roster of active contributors, their assigned roles, and timestamps.
4. **Canonical Metadata Hash**:
   $$\text{IntegrityHash} = \text{SHA256}(\text{CanonicalJSON}(\{\text{ProjectID}, \text{CommitSHA}, \text{FileHashes}, \text{Roster}\}))$$
5. **Verification Code**: Unique, cryptographically pseudo-random string formatted as `ENQ-POW-XXXX-YYYY-ZZZZ` generated via `secrets.token_hex`.

### 7.2 Database-Level Proof Immutability

```sql
-- PostgreSQL Trigger preventing any UPDATE or DELETE on ProofOfWork
CREATE OR REPLACE FUNCTION prevent_pow_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Allow ONLY verification_status updates by platform admins, freeze all evidence
        IF OLD.immutable_evidence_hash IS DISTINCT FROM NEW.immutable_evidence_hash OR
           OLD.commit_sha IS DISTINCT FROM NEW.commit_sha OR
           OLD.collaboration_id IS DISTINCT FROM NEW.collaboration_id THEN
            RAISE EXCEPTION 'Proof of Work evidence is cryptographically immutable and cannot be altered.';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Proof of Work records cannot be deleted. Revocation requires administrative status flagging.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_proof_integrity
BEFORE UPDATE OR DELETE ON proof_of_work
FOR EACH ROW EXECUTE FUNCTION prevent_pow_tampering();
```

### 7.3 Anti-Collusion & Peer Rating Safeguards

Peer ratings directly impact a builder's public reputation score. The following attack vectors must be defended against:

1. **Sybil Ring / Tit-for-Tat Collusion**: Two builders create dummy projects, accept each other, and immediately grant 5-star ratings to artificially inflate reputation.
   - *Mitigation 1 (Minimum Lifespan & Task Threshold)*: Project must have been active for a minimum duration (e.g., 7 days) and completed at least 3 distinct verified milestones/tasks with evidence before PoW generation is unlocked.
   - *Mitigation 2 (Double-Blind Rating Submission)*: Neither party can view the rating or feedback left by the other until BOTH parties have submitted their ratings, or until the 14-day rating window has elapsed. This completely stops retaliatory 1-star ratings.
   - *Mitigation 3 (Weighted Reputation Impact)*: Rating impact is scaled by the reviewer's own verified reputation and account standing:
     $$\Delta \text{Reputation} = \text{BaseWeight} \times \log_{10}(\text{ReviewerReputation} + 10) \times \text{ProjectComplexityScore}$$
2. **Self-Rating Prevention**:
   ```python
   # Constraint in PeerRating model
   class Meta:
       constraints = [
           models.CheckConstraint(
               check=~models.Q(rated_user=models.F('rated_by_user')),
               name='prevent_self_rating'
           ),
           models.UniqueConstraint(
               fields=['proof', 'rated_user', 'rated_by_user'],
               name='unique_peer_rating_per_project'
           )
       ]
   ```

---

## 8. Deep-Dive Security Domain 6: File & Link Validation (Malware, XSS & SSRF)

### 8.1 Deliverable File Validation & Content Security

Allowing users to upload deliverable attachments creates multiple vectors:
- Web shells (`shell.php`, `exploit.html`, malicious SVG containing `<script>` tags).
- Zip bombs designed to exhaust memory/disk on decompression.
- MIME-type confusion attacks.

#### Hardened File Ingestion Pipeline

```
[User Upload] ──> [Nginx/Reverse Proxy: 25MB max size]
                         │
                         ▼
             [DRF File Validation Parser]
             1. Validate extension against strict whitelist
             2. Inspect Magic Bytes (libmagic)
             3. Reject active HTML/SVG/executables
                         │
                         ▼
             [Direct Upload to Isolated S3 / R2 Bucket]
             - Headers: Content-Disposition: attachment; filename="..."
             - Cache-Control: private, no-transform
             - Strict CSP: default-src 'none'
             - Scanned via ClamAV / GuardDuty before URL generation
```

#### File Validator Implementation

```python
# backend/apps/collaboration/validators.py
import magic
from django.core.exceptions import ValidationError

ALLOWED_MIME_TYPES = {
    'application/pdf': ['.pdf'],
    'application/zip': ['.zip'],
    'application/x-zip-compressed': ['.zip'],
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'text/plain': ['.txt', '.md', '.py', '.ts', '.js', '.json'],
}

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

def validate_deliverable_attachment(file_obj):
    # 1. Size check
    if file_obj.size > MAX_FILE_SIZE_BYTES:
        raise ValidationError(f"File exceeds maximum allowed size of 25MB.")

    # 2. Magic byte check (inspect file header, not user-supplied Content-Type)
    initial_bytes = file_obj.read(2048)
    file_obj.seek(0)
    detected_mime = magic.from_buffer(initial_bytes, mime=True)

    if detected_mime not in ALLOWED_MIME_TYPES:
        raise ValidationError(f"Unsupported or unsafe file type: {detected_mime}.")

    # 3. Explicitly block executable signatures or active script payloads
    dangerous_signatures = [b'<%', b'<?php', b'<script', b'MZ\x90\x00', b'\x7fELF']
    for sig in dangerous_signatures:
        if sig in initial_bytes:
            raise ValidationError("Executable or scripted content detected. File rejected.")
```

### 8.2 External Repository & Link Validation (SSRF Prevention)

When users supply external repo links (GitHub, GitLab) or demo URLs, if ENQUEbet's backend fetches metadata, commit statuses, or link previews, attackers can launch **Server-Side Request Forgery (SSRF)** against:
- Cloud metadata service: `http://169.254.169.254/latest/meta-data/`
- Internal container/database services: `http://localhost:6379/`, `http://db:5432/`, `http://10.0.0.5/`

#### Safe URL Resolver & Fetcher Blueprint

```python
# backend/apps/collaboration/utils/safe_fetcher.py
import socket
import ipaddress
import urllib.parse
import requests
from django.core.exceptions import ValidationError

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network('127.0.0.0/8'),        # Loopback
    ipaddress.ip_network('10.0.0.0/8'),         # Private class A
    ipaddress.ip_network('172.16.0.0/12'),      # Private class B
    ipaddress.ip_network('192.168.0.0/16'),     # Private class C
    ipaddress.ip_network('169.254.0.0/16'),     # Link-local / AWS Metadata
    ipaddress.ip_network('::1/128'),            # IPv6 loopback
    ipaddress.ip_network('fc00::/7'),           # IPv6 unique local
    ipaddress.ip_network('fe80::/10'),          # IPv6 link-local
]

ALLOWED_GIT_HOSTS = {'github.com', 'gitlab.com', 'bitbucket.org'}

def validate_safe_repository_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ('https',):
        raise ValidationError("Only secure HTTPS URLs are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise ValidationError("Invalid URL format.")

    # Restrict to verified repository providers
    if hostname.lower() not in ALLOWED_GIT_HOSTS:
        raise ValidationError(f"Repository host must be one of: {', '.join(ALLOWED_GIT_HOSTS)}")

    # Resolve IP and verify it is not targeting internal infrastructure
    try:
        ip_addresses = socket.getaddrinfo(hostname, 443)
        for family, socktype, proto, canonname, sockaddr in ip_addresses:
            ip = ipaddress.ip_address(sockaddr[0])
            for blocked_net in BLOCKED_IP_NETWORKS:
                if ip in blocked_net:
                    raise ValidationError("Access to internal infrastructure addresses is prohibited.")
    except socket.gaierror:
        raise ValidationError("Could not resolve host.")

    return url
```

---

## 9. Deep-Dive Security Domain 7: Audit Log Tampering (ProjectActivity)

### 9.1 Vulnerability Analysis: Why Public Mutation APIs are Prohibited

The `ProjectActivity` table acts as the legal record of truth for a project's lifecycle. It tracks:
- Who joined or left
- Who assigned tasks and who marked them completed
- Who requested completion and who confirmed/disputed
- Role elevations and administrative actions

If a public endpoint such as `POST /api/v1/workspaces/{id}/activity` or `PUT /api/v1/activity/{id}` exists, an attacker can:
- Forge audit entries indicating tasks were approved by the owner.
- Delete records of member removals or disputes.
- Tamper with timestamps to manipulate milestone deadlines.

### 9.2 The "Server-Side Internal Emission Only" Standard

1. **Zero Public Mutation Endpoints**: In Django REST Framework, the activity endpoint must use `generics.ListAPIView` ONLY. No `CreateAPIView`, `UpdateAPIView`, or `DestroyAPIView` shall ever be mounted.
2. **Encapsulated Service Logging**: Activity records can only be instantiated via `ProjectActivity.log(...)` inside atomic backend domain services.
3. **Database-Level Privilege Revocation**:
   ```sql
   -- Production PostgreSQL Security Grant
   -- Application role has SELECT and INSERT only. UPDATE and DELETE are revoked.
   REVOKE UPDATE, DELETE ON TABLE project_activity FROM enquebet_api_user;
   GRANT SELECT, INSERT ON TABLE project_activity TO enquebet_api_user;
   ```

### 9.3 ProjectActivity Model & DRF View Definition

```python
# backend/apps/collaboration/models.py
import uuid
from django.db import models
from django.conf import settings

class ProjectActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey('collaboration.Workspace', on_delete=models.CASCADE, related_name='activities')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    EVENT_TYPES = [
        ('WORKSPACE_CREATED', 'Workspace Created'),
        ('MEMBER_JOINED', 'Member Joined'),
        ('MEMBER_REMOVED', 'Member Removed'),
        ('ROLE_CHANGED', 'Role Changed'),
        ('TASK_CREATED', 'Task Created'),
        ('TASK_SUBMITTED', 'Task Submitted'),
        ('TASK_APPROVED', 'Task Approved'),
        ('TASK_REJECTED', 'Task Rejected'),
        ('COMPLETION_REQUESTED', 'Completion Requested'),
        ('COMPLETION_CONFIRMED', 'Completion Confirmed'),
        ('COMPLETION_REJECTED', 'Completion Rejected'),
        ('PROOF_ISSUED', 'Proof Issued'),
    ]
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, editable=False)
    metadata = models.JSONField(default=dict, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    class Meta:
        db_table = 'project_activity'
        ordering = ['-created_at']
        # Disallow edits at Django model layer
        indexes = [
            models.Index(fields=['workspace', '-created_at']),
            models.Index(fields=['event_type']),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise PermissionDenied("ProjectActivity records are append-only and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionDenied("ProjectActivity records are permanent and cannot be deleted.")

    @classmethod
    def log(cls, workspace, actor, event_type: str, metadata: dict = None):
        """Standardized internal emission interface"""
        return cls.objects.create(
            workspace=workspace,
            actor=actor,
            event_type=event_type,
            metadata=metadata or {}
        )
```

```python
# backend/apps/collaboration/views.py (Read-Only Activity Endpoint)
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import ProjectActivity
from .serializers import ProjectActivitySerializer
from .permissions import IsActiveWorkspaceMember

class WorkspaceActivityListView(generics.ListAPIView):
    """
    Read-only audit log for active workspace members.
    Strictly forbids POST, PUT, PATCH, DELETE.
    """
    serializer_class = ProjectActivitySerializer
    permission_classes = [IsAuthenticated, IsActiveWorkspaceMember]

    def get_queryset(self):
        workspace_id = self.kwargs['workspace_id']
        return ProjectActivity.objects.filter(
            workspace_id=workspace_id
        ).select_related('actor').order_by('-created_at')
```

---

## 10. Automated Security Test Matrix & Verification Suite

To guarantee that these security invariants cannot be broken by regressions or refactors, the test suite must execute the following automated tests:

| Test Case ID | Target Vulnerability | Test Description | Expected HTTP Status / Result |
|---|---|---|---|
| **SEC-BOLA-01** | BOLA / IDOR | Non-member user attempts `GET /api/v1/workspaces/{id}/tasks` | `404 Not Found` (Masked) |
| **SEC-BOLA-02** | BOLA / IDOR | Member of WS-A attempts `GET /api/v1/workspaces/{ws-A}/tasks/{task-from-ws-B}` | `404 Not Found` |
| **SEC-PRIV-01** | Privilege Escalation | Contributor calls `POST /api/v1/tasks/{id}/approve` on their own assigned task | `403 Forbidden` |
| **SEC-PRIV-02** | Privilege Escalation | Contributor sends `PATCH /api/v1/workspaces/{id}/members/me/` with `role="OWNER"` | `400 Bad Request` (Read-only field) |
| **SEC-REV-01** | Member Revocation | Removed member sends REST request to workspace task board | `404 Not Found` / `403 Forbidden` |
| **SEC-REV-02** | Member Revocation | Removed member attempts to send WebSocket message over existing socket | WS Code `4003` (Immediate Close) |
| **SEC-RACE-01** | Concurrency Race | 10 concurrent requests to accept join requests on 1 remaining slot | Exactly 1 succeeds (`200 OK`), 9 fail (`400 Bad Request`), team count = max |
| **SEC-INT-01** | Proof Immutability | API or DB direct update to `immutable_evidence_hash` on `proof_of_work` | `500 Error` / Trigger Exception Raised |
| **SEC-FILE-01** | Malware / File Guard | Upload deliverable file disguised as PNG but containing `<?php eval(...)` | `400 Bad Request` ("Dangerous file payload") |
| **SEC-SSRF-01** | SSRF Prevention | Deliverable link submitted with `http://169.254.169.254/latest/meta-data` | `400 Bad Request` ("Host address prohibited") |
| **SEC-AUDIT-01**| Audit Log Guard | Client attempts `POST /api/v1/workspaces/{id}/activity` | `405 Method Not Allowed` |

---

## 11. Security Review Sign-Off & Verification Checklist

- [x] **Zero Trust Authorization**: Every workspace, task, deliverable, and chat endpoint scopes queries to active memberships.
- [x] **Separation of Duties**: Task assignees are programmatically barred from approving their own work.
- [x] **Instant Realtime Revocation**: Removing a member broadcasts eviction signals to Redis Channel Layers and disconnects sockets immediately.
- [x] **Pessimistic Concurrency**: Row locking (`select_for_update`) prevents over-capacity acceptance and duplicate completions.
- [x] **Cryptographic PoW Immutability**: Git commits are frozen at SHA hash level; database triggers forbid tampering with issued proofs.
- [x] **SSRF & File Hardening**: Magic byte file validation and non-routable IP resolution blocks protect storage and cloud hosts.
- [x] **Tamper-Evident Audit Ledger**: `ProjectActivity` is strictly internal, append-only, and blocked from public API mutations.

**Security Review Conclusion:** The proposed collaboration, team management, and workspace execution system satisfies institutional security standards. Implementing these specifications provides rigorous protection against authorization bypass, reputation gaming, data tampering, and service abuse.
