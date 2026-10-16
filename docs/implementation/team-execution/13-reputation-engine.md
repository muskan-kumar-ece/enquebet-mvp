# ENQUEbet V1 — Reputation Engine & Contribution Verification

**Document Date:** October 15, 2026  
**Implementation Phase:** Phase 3 — Reputation Engine & Contribution Verification  
**Repository:** `C:\workflow\enquebet-mvp`  
**Status:** **Fully Implemented & Verified** (76/76 Backend Tests Passing, Frontend Production Build Passing)

---

## 1. Executive Summary

ENQUEbet is a Builder Collaboration and Reputation Platform. Its core thesis is that a builder's reputation must be authentic, verifiable, and earned strictly through tangible execution — not superficial social metrics like vanity likes or self-assigned accomplishments.

Prior to this phase, while `User.reputation_score` existed as an integer on the User model and `PeerReview` models recorded ratings, no backend engine automatically credited reputation points for verified work. 

This phase delivers a secure, explainable, contribution-based **Reputation Engine** that integrates seamlessly with existing collaboration workflows, tasks, deliverables, peer reviews, and minted Proof of Work credentials.

### Key Metrics
- **Automated Backend Tests:** **76 / 76 passed** (including 11 dedicated tests for reputation scoring, idempotency, anti-abuse, and privacy).
- **Frontend Production Build:** **Compiled successfully in 9.8s** with 0 TypeScript errors and 0 ESLint warnings.
- **Database Schema:** Single additive migration `collaboration.0006_reputationevent`.

---

## 2. Existing-State Audit

### 2.1 Baseline State Prior to Implementation
1. `User.reputation_score`: Stored on `User` model (`backend/apps/users/models.py`), initialized to 0. `UserSerializer` marked it `read_only_fields`, preventing direct client updates. However, no server-side hooks recalculated or credited points when project deliverables were completed.
2. `TaskReview`: In `TaskReviewCreateView` (`backend/apps/collaboration/workspace_views.py`), when a lead/owner approved a task deliverable, the task transitioned to `completed`, but no reputation points were awarded.
3. `ProofOfWork`: When a project reached 100% completion and Proof of Work was minted in `ProjectCompletionRequestView`, team contributors received no reputation recognition.
4. `PeerReview`: When teammates submitted 1–5★ evaluations on minted Proof of Work in `PeerReviewSubmitView`, the review was saved to `peer_reviews`, but the reviewee's `reputation_score` was never updated.

---

## 3. Scoring Methodology & Mathematical Rationale

The ENQUEbet scoring model separates **verified work** from **peer feedback**. Raw contribution actions award transparent, bounded reputation points based on documented criteria:

| Contribution Action | Points Awarded | Recipient | Deduplication / Anti-Inflation Safeguard |
| :--- | :---: | :--- | :--- |
| **Deliverable Approved** | **+15 pts** | Deliverable Submitter | Awarded once per deliverable upon formal owner/lead review approval. |
| **Task Completed** | **+10 pts** | Task Assignee | Awarded upon formal review approval of an associated deliverable. Marking a task completed directly without approved review awards **0 points**. |
| **Project Completed (Lead)** | **+50 pts** | Project Owner / Lead | Awarded when all workspace tasks are verified and Proof of Work is minted. |
| **Project Completed (Contributor)** | **+35 pts** | Active Contributing Member | Awarded only to members who contributed at least one approved deliverable or completed task (**Anti-Free-Rider** rule). |
| **Peer Review Received** | **0 to +10 pts**<br>*(or penalty)* | Reviewee | Calculated from 1–5 average rating across Execution, Collaboration, and Reliability. Maximum **+30 pts** per project per builder (**Anti-Review-Farming** cap). |

### Peer Review Rating Conversion Formula
Let $R$ be the arithmetic mean of Execution, Collaboration, and Reliability:
$$R = \frac{\text{execution} + \text{collaboration} + \text{reliability}}{3.0}$$

The rating is converted into bounded reputation points using a neutral baseline of 3.0:
- $R \ge 4.5 \implies \mathbf{+10\ pts}$ (Outstanding)
- $4.0 \le R < 4.5 \implies \mathbf{+6\ pts}$ (Strong)
- $3.5 \le R < 4.0 \implies \mathbf{+3\ pts}$ (Above Average)
- $3.0 \le R < 3.5 \implies \mathbf{0\ pts}$ (Neutral baseline)
- $2.0 \le R < 3.0 \implies \mathbf{-4\ pts}$ (Minor reliability penalty)
- $R < 2.0 \implies \mathbf{-8\ pts}$ (Significant unreliability penalty)

Cumulative reputation score is bounded below at 0 ($S = \max(0, \sum \text{points})$).

---

## 4. Data Model Changes

### 4.1 The `ReputationEvent` Model
Created in `backend/apps/collaboration/models.py` (`reputation_events` table):

```python
class ReputationEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reputation_events')
    event_type = models.CharField(max_length=40, choices=EVENT_TYPE_CHOICES)
    points = models.IntegerField()
    description = models.CharField(max_length=255)
    idempotency_key = models.CharField(max_length=120, unique=True)
    
    # Traceability FKs
    workspace = models.ForeignKey(Workspace, null=True, blank=True, on_delete=models.SET_NULL)
    task = models.ForeignKey(ProjectTask, null=True, blank=True, on_delete=models.SET_NULL)
    deliverable = models.ForeignKey(TaskDeliverable, null=True, blank=True, on_delete=models.SET_NULL)
    proof = models.ForeignKey(ProofOfWork, null=True, blank=True, on_delete=models.SET_NULL)
    peer_review = models.ForeignKey(PeerReview, null=True, blank=True, on_delete=models.SET_NULL)

    metadata = models.JSONField(default=dict, blank=True)
    is_revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 4.2 Idempotency Key Design
- Deliverable approval: `deliv_approved:{deliverable.id}`
- Task completion: `task_completed:{task.id}`
- Project completion lead: `proj_completed_lead:{proof.id}:{owner.id}`
- Project completion contributor: `proj_completed_contrib:{proof.id}:{member.id}`
- Peer review: `peer_review:{peer_review.id}`

---

## 5. Reputation Lifecycle & Engine Architecture

### 5.1 Service Layer (`ReputationService`)
Located at `backend/apps/collaboration/reputation_service.py`:
- `award_deliverable_approved(deliverable, reviewer)`: Awards deliverable credit.
- `award_task_completed(task, deliverable)`: Awards completed task credit.
- `award_project_completed(proof, workspace, actor)`: Awards minted project completion points.
- `record_peer_review(peer_review)`: Converts 1–5 ratings to points, enforces project cap, and syncs score.
- `revoke_peer_review(peer_review)`: Revokes peer review event upon deletion.
- `revoke_project_completion(workspace)`: Revokes completion points when an owner reopens a project.
- `sync_user_reputation(user_or_id)`: Atomically aggregates active unrevoked events and writes `User.reputation_score`.
- `get_user_reputation_summary(user_or_id, viewer)`: Computes public breakdown, stats, and sanitized event ledger.
- `recalculate_all_for_user(user_or_id)`: Reconciles all ground-truth database records and synchronizes score.

### 5.2 Preservation of Historical Contribution Credit
If a builder contributes approved deliverables or completes tasks and subsequently leaves the team (`TeamMembership.status = 'left'` or `'removed'`), their submitted deliverables, task reviews, and `ReputationEvent` records remain intact. Their earned reputation is **permanently preserved**.

---

## 6. Abuse Prevention & Integrity Safeguards

1. **Anti-Self-Approval Guard:** Submitting authors cannot review or approve their own deliverables (`HTTP 400 BAD REQUEST`).
2. **Anti-Self-Rating Guard:** Teammates cannot submit peer reviews for themselves (`HTTP 400 BAD REQUEST`).
3. **No Credit for Unapproved Status Changes:** Sending `PATCH /tasks/{id}/ {"status": "completed"}` without an approved deliverable review awards **0 points**.
4. **Anti-Free-Rider Enforcement:** Team members with 0 verified contributions receive **0 points** on project completion.
5. **Anti-Review-Farming Cap:** Maximum peer review reputation per project per user is capped at **+30 points**, preventing large collusive groups from inflating scores.
6. **Concurrent Safety:** All score updates utilize `transaction.atomic()` and `User.objects.select_for_update()`.
7. **Client Tampering Immunity:** `UserSerializer.update()` strictly prohibits direct modification of `reputation_score`.

---

## 7. API Changes & Privacy Protections

### 7.1 New API Endpoints
- `GET /api/v1/users/me/reputation/`: Returns full explainable summary for the authenticated user.
- `GET /api/v1/users/<uuid:user_id>/reputation/`: Returns public summary for any builder.
- `POST /api/v1/users/<uuid:user_id>/reputation/recalculate/`: Authenticated user triggers a ground-truth recalculation.

### 7.2 Privacy-Preserving Redactions
When viewing another builder's reputation:
- Project titles belonging to private posts are sanitized to `"Verified contribution to project"` for non-members.
- Peer reviewers' identities are never exposed in reputation logs or event lists. Only aggregate star ratings and review counts are surfaced.

---

## 8. Frontend Integration

1. **API Client (`frontend/lib/api.ts`):** Added `getUserReputation()`, `getMyReputation()`, and `recalculateReputation()`.
2. **Reputation Card (`frontend/components/ui/ReputationCard.tsx`):**
   - Renders builder level badge (e.g. *Verified Contributor*, *Senior Builder*, *Master Architect*).
   - Metrics grid: Approved Deliverables, Completed Tasks, Minted Proof of Work, Teammate Star Rating.
   - Point allocation breakdown pills (Deliverables, Tasks, Proof of Work, Peer Feedback).
   - Verified contribution ledger timeline.
   - One-click ground-truth recalculation button for profile owners.
3. **Profile Pages:** Integrated into both `frontend/app/profile/page.tsx` (owner view) and `frontend/app/profile/[id]/page.tsx` (public view).

---

## 9. Verification & Test Evidence

### 9.1 Backend Test Results
```bash
python backend/manage.py test apps.collaboration apps.users apps.posts apps.search --keepdb
```
- **Exit Code:** `0`
- **Output:**
```text
Using existing test database for alias 'default'...
Found 76 test(s).
System check identified no issues (0 silenced).
............................................................................
----------------------------------------------------------------------
Ran 76 tests in 336.449s

OK
Preserving test database for alias 'default'...
```

### 9.2 Frontend Build Results
```bash
cd frontend && npm run build
```
- **Exit Code:** `0`
- **Output:**
```text
▲ Next.js 16.1.6 (Turbopack)
✓ Compiled successfully in 9.8s
✓ Generating static pages (22/22)
✓ Finalizing page optimization
Exit Code: 0 (0 TypeScript errors, 0 ESLint warnings)
```

---

## 10. Known Limitations & Future Enhancements

1. **Asynchronous Aggregation / Background Workers:** Calculations are currently synchronous inside Django transactions, which is performant for V1 traffic. At enterprise scale, event processing can be dispatched via Redis queues.
2. **Peer Review Decay / Time Weighting:** Currently, all reviews carry equal weight regardless of age. Future phases may introduce half-life decay for reviews older than 18 months.
