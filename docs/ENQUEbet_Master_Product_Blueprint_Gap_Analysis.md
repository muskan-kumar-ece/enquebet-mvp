# ENQUEbet Master Product Blueprint & Gap Analysis

**Document status:** Planning baseline — review required before the next implementation phase  
**Prepared:** 15 October 2026  
**Product:** ENQUEbet — Builder Collaboration & Reputation Platform  
**Scope:** Reconcile the supplied product/technical documents, the V1 codebase audit, and the reported Phase 1 and Phase 2 implementation results.  
**Important:** This is a planning and reconciliation document. It is not proof that current repository code or production behavior has been independently verified.

---

## 1. Executive Summary

ENQUEbet's core product is not simply a social network. It is a platform for turning builder identity and collaboration intent into executed projects, credible Proof of Work, and durable builder reputation.

The intended lifecycle is:

**Builder identity → Discovery → Collaboration request → Team formation → Workspace execution → Completion confirmation → Proof of Work → Reputation**

Social features such as feeds, follows, likes, comments, and messaging support this lifecycle. They are not the primary outcome by themselves.

The supplied V1 audit describes an existing social-collaboration application with authentication, builder profiles, posts/media, likes, comments, saves, reports, follow relationships, collaboration requests, team chat, notifications, and basic search. It identifies the largest product gaps as a structured workspace/task execution lifecycle, completion confirmation, Proof of Work, and a real reputation engine.

Since that audit, the coding agent has **reported** implementing:
- **Phase 1:** profile enhancements, skill proficiency levels, profile completeness, reputation/verification fields, cover-image UI, and private-profile handling.
- **Phase 2:** For You ranking, Following feed, privacy/moderation filtering, and feed UI updates.

The reports state that tests and builds passed, but those results have not been independently rerun as part of this blueprint. Accordingly, these items are classified as **implemented — reported, awaiting manual/repository verification**, not independently verified.

### Main recommendation

**Do not start Phase 3 coding immediately.** First approve this product blueprint, perform a focused reconciliation audit against the current working tree, and resolve the explicit product/security decisions listed below. Then implement Search & Discovery as a fully specified phase, followed by the collaboration-to-proof lifecycle.

---

## 2. Source Documents and Evidence Rules

This blueprint is based on the following supplied documents:

1. `coreidea.md` — founder vision, lifecycle, state machines, trust model, and identified missing systems.
2. `prd.md` — personas, goals, KPIs, product principles, entities, workflows, feed, reputation, proof, MVP scope.
3. `trd.md` — frontend/backend architecture, schema, APIs, completion engine, proof, realtime, authorization, reputation, feed, deployment.
4. `sad.md` — system architecture and data flows.
5. `DatabaseArchitecture.md` — proposed entities, relationships, constraints, indexes, RBAC, and database considerations.
6. `APIDesignDocument.md` — API contracts and expected workflows.
7. `DataStrategyDocument.md` — identity, skills, execution, completion/proof, reputation, recommendation, and privacy strategy.
8. `SecurityArchitecture.md` — authentication, tokens, RBAC, proof integrity, API security, validation, logging, and storage.
9. `DevOps&DeploymentPlan.md` — environments, hosting, CI/CD, backups, monitoring, secrets, scaling, rollback.
10. `Pasted markdown.md` — V1 Product Intelligence, Architecture Audit & Upgrade Planning Report.
11. Phase 1 and Phase 2 completion summaries pasted in the conversation — agent-reported implementation and verification results.

### Evidence labels used in this document

- **Audit-observed:** stated in the V1 audit report, which inspected a particular working tree at that time.
- **Agent-reported:** stated in a Phase 1/2 completion report; not independently checked here.
- **Documented target:** appears in the architecture/product documents but was reported as absent or incomplete in V1.
- **Needs verification:** must be confirmed against the current working tree, database, or running application.
- **Product decision:** cannot safely be decided from code or documents alone; owner approval is needed.

The audit predates the reported Phase 1 and Phase 2 work. Any older statement that a field or feature is missing must be checked against the newer code before being treated as current.

---

## 3. Product Definition and Principles

### 3.1 Product definition

ENQUEbet helps students, independent builders, and research builders find collaborators, form teams, execute projects, and build credibility through evidence of completed work.

### 3.2 Primary product outcome

The primary outcome is **completed projects with credible evidence**, not time spent scrolling.

### 3.3 Product principles

1. **Completion-first:** the feed and social layer support building; they are not the ultimate goal.
2. **Proof-based trust:** reputation must be grounded in evidence and fair process, not self-claims or likes alone.
3. **Structured lifecycle:** collaboration and completion use explicit states and authorized transitions.
4. **Additive evolution:** improve V1 without a wholesale rewrite or unnecessary infrastructure.
5. **Security by default:** every private resource must be protected by backend authorization.
6. **Explainability:** matching and reputation should have understandable reasons and auditable inputs.
7. **Backward compatibility:** preserve existing accounts, posts, conversations, and workflows during migrations.
8. **Small, reviewable phases:** plan, approve, implement, test, verify, and only then approve the next phase.

### 3.4 Primary personas

- **Student Builder:** wants teammates, project experience, and credible evidence for future opportunities.
- **Independent Builder / Indie Hacker:** wants collaborators with complementary skills to build a product.
- **Research Builder:** wants collaborators for research and academic projects.
- **Project Creator / Owner:** publishes an opportunity, selects collaborators, coordinates execution, and confirms completion.
- **Platform Administrator / Moderator:** handles reports, abuse, account safety, disputes, and platform health.

---

## 4. Current-State Reconciliation

### 4.1 Technology stack reported by the V1 audit

| Layer | Audit-observed implementation | Planning implication |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 | Extend existing App Router and component system; avoid a frontend rewrite. |
| Backend | Django 5, Django REST Framework, Django Channels | Add features in the existing modular Django application. |
| Database | PostgreSQL configuration with local SQLite fallback | Confirm the active database for every migration/test; do not assume local tests represent production PostgreSQL behavior. |
| Authentication | SimpleJWT, token rotation/blacklisting reported | Review token storage and refresh behavior in a dedicated security pass. |
| Realtime | Django Channels and Redis integration | Reuse the current chat/notification infrastructure where appropriate. |
| Media | Cloudinary with local file fallback | Validate upload authorization, content, size, and storage behavior. |
| Tests | Playwright E2E suite reported by audit | Add and maintain backend unit/API tests as well as frontend tests. |

### 4.2 Existing V1 capabilities reported by the audit

| Capability | Audit status before Phase 1/2 | Current planning classification |
|---|---|---|
| Registration, login, JWT flow | Implemented | Existing foundation; re-verify smoke path |
| Builder profiles and profile editing | Implemented, but missing some professional fields/UI | Phase 1 agent-reported additions; verify manually |
| Skills | Flat skill strings on user skills | Skill proficiency level agent-reported; verify API compatibility |
| Posts/ideas with media, tags, requirements | Implemented | Preserve as the current publication model unless audit proves a separate project model exists |
| Likes, comments, saves, reports | Implemented | Preserve; validate moderation and visibility edge cases |
| Follow/unfollow | Implemented | Used by Following feed and future discovery |
| Build With collaboration requests | Implemented | Must be the starting point for the future lifecycle, not duplicated |
| Group and direct messaging | Implemented; group chat created after accepted collaboration | Reuse or integrate with workspace; do not confuse a chat with a workspace |
| Notifications | Persistent/realtime notifications reported | Map every future lifecycle event to notifications |
| Basic search | Partially implemented | Phase 3 candidate |
| Personalized For You / Following feeds | Phase 2 agent-reported | Verify live ranking, filters, and pagination |
| Workspace/task execution | Audit reported absent | Major product gap |
| Completion confirmation | Audit reported absent | Required before proof is trusted |
| Proof of Work | Audit reported absent | Major product gap |
| Peer ratings/reputation engine | Audit reported absent; score fields later agent-reported | Stored fields are not a working reputation engine |
| Admin/moderation operations | Some reporting exists; full operational capability needs audit | Define admin scope and permissions before launch |

### 4.3 Existing data entities reported by the audit

The audit describes these V1 entities or tables:
- User
- UserSkill
- Follower
- Post
- PostAttachment
- PostRequirement
- PostTag
- PostCollaborator
- Like
- Comment
- SavedPost
- PostReport
- CollaborationRequest
- Conversation
- ConversationMember
- Message
- Notification
- Contribution (legacy portfolio/contribution feature)
- Research (reported placeholder/limited feature)

The audit reported missing target entities including Workspace, Task, WorkspaceFile, ProofOfWork, CompletionConfirmation, and PeerRating. Re-check the current repository and migrations before creating any of them.

### 4.4 Important model distinction

The audit states that **Post is currently the publication/idea object**, while `CollaborationRequest` is a request to join a post and acceptance adds a collaborator and team chat. This differs from some target documents where `CollaborationRequest` is itself the core project object with status, deadline, member limits, and lifecycle.

**Decision required before workspace implementation:** retain Post as the project/opportunity root and link a Workspace to it, or migrate toward a dedicated Collaboration/Project entity. Do not create parallel project models until the owner approves the canonical domain model and a migration path is documented.

---

## 5. Phase 1 and Phase 2 Reported Changes

### 5.1 Phase 1 — Complete Builder Profiles

The agent reported:
- `User.headline`, `verification_level`, and `reputation_score`.
- `UserSkill.level` with beginner/intermediate/advanced choices.
- Server-side profile completeness score.
- Protection against users assigning their own verification/reputation values.
- Private-profile response handling and private-post restrictions.
- Cover upload UI, BuilderBadge, ProfileCompletenessCard, skill proficiency display, structured education/experience/projects, and private-profile locked state.
- Five `apps.users` tests passed; TypeScript check and production build passed.

**Classification:** implemented — agent-reported; current repository diff and manual behavior still need verification.

### 5.2 Phase 2 — Personalized Feed & Discovery Algorithm

The agent reported:
- For You ranking based on skill, location, college, engagement, and recency.
- Following feed based on followed builders, excluding the viewer's own posts.
- Deterministic tie-breaking and an author-diversity penalty.
- Filtering of posts with at least three reports and privacy filtering for private accounts.
- Feed tabs, pagination reset, duplicate prevention, and empty states.
- Twelve post tests and seventeen combined users/posts tests passed; TypeScript and production build passed.

**Classification:** implemented — agent-reported; current repository diff and manual behavior still need verification.

### 5.3 Verification gate for Phases 1 and 2

Before building more, run a short manual verification checklist:
- Edit and save profile fields, refresh, and confirm persistence.
- Upload avatar and cover images; verify storage URLs and failure behavior.
- Check skill levels for old skills and newly added skills.
- Check profile completeness with missing and completed fields.
- View private profiles as owner, authenticated non-follower, follower, and logged-out visitor.
- Confirm unauthorized private posts are not returned by direct API calls.
- Compare For You and Following results using test accounts with known skills/follows.
- Confirm all existing legacy feed tabs still work.
- Check report-threshold behavior, page boundaries, no duplicate posts, and switching tabs.
- Run migrations/tests against the intended database configuration and inspect the actual command exit codes.

No feature should be called production-verified until these checks are complete.

---

## 6. Master Feature Inventory

Status is provisional until current-code verification.

| ID | System | Current state | Main gap / next action | Dependencies |
|---|---|---|---|---|
| F01 | Authentication and sessions | Existing; audit-observed | Re-verify end-to-end and token storage/security | User model, API |
| F02 | Builder profile | Phase 1 agent-reported | Manually verify; fix only demonstrated gaps | Auth, User, UserSkill |
| F03 | Follow graph | Existing; audit-observed | Verify constraints, private-account follow behavior, blocking needs | User |
| F04 | Posts and media | Existing; audit-observed | Clarify whether a post is an idea, project opportunity, or both; define lifecycle metadata | User, uploads |
| F05 | Social interactions | Existing; audit-observed | Validate permissions, spam controls, and notification behavior | Posts, users |
| F06 | Personalized feed | Phase 2 agent-reported | Verify ranking quality, query cost, privacy, and pagination | Posts, skills, follows |
| F07 | Search and discovery | Partial; audit-observed | Design unified, server-side search for builders and opportunities | Users, skills, posts |
| F08 | Collaboration requests | Existing; audit-observed | Verify duplicate prevention, state transitions, race conditions, and role-specific requests | Posts, users, notifications |
| F09 | Team membership | Partially represented by PostCollaborator and chat membership | Define canonical membership source and authorization | Collaboration |
| F10 | Messaging | Existing; audit-observed | Preserve; define relationship with workspace discussions and file sharing | Conversation, membership |
| F11 | Notifications | Existing; audit-observed | Audit event coverage, read state, delivery failure, and deep links | All lifecycle systems |
| F12 | Workspace | Documented target; audit reported absent | Add only after domain model and membership rules are approved | Collaboration, team membership |
| F13 | Tasks and milestones | Documented target; audit reported absent | Define assignments, statuses, due dates, ordering, and activity history | Workspace |
| F14 | Workspace files | Documented target; audit reported absent | Define storage, access checks, limits, retention, and ownership | Workspace, uploads |
| F15 | Completion workflow | Documented target; audit reported absent | Define completion request, confirmations, rejection/dispute, timeout/reopen rules | Workspace, tasks |
| F16 | Proof of Work | Documented target; audit reported absent | Define immutable evidence, status, verification code, certificate, public/private views | Completion |
| F17 | Peer ratings | Documented target; audit reported absent | Define eligibility, one rating per eligible participant, anti-retaliation/abuse controls | Verified completion |
| F18 | Reputation engine | Score fields agent-reported; engine absent in audit | Define versioned formula and event ledger before updating scores | Proof, ratings, verification |
| F19 | Verification | Levels/field agent-reported; verification workflow unresolved | Define evidence, review, expiry, revocation, and admin audit | Identity, moderation |
| F20 | Reports and moderation | Post reports existing; broader moderation incomplete/unknown | Define targets, statuses, queues, actions, appeal and audit history | Users, posts, proof |
| F21 | Admin operations | Needs current-code audit | Specify roles, moderation UI, audit logs, safe operational controls | RBAC, moderation |
| F22 | Analytics and product KPIs | Not sufficiently established in supplied audit | Instrument lifecycle metrics with privacy-aware event definitions | All systems |
| F23 | Search indexing/performance | Basic search; optimization absent/unknown | Benchmark first; add indexes only for measured query patterns | Search |
| F24 | Deployment/observability | Docs describe target; actual setup needs audit | Verify envs, CI, backups, logs, monitoring, migrations, rollback | Platform-wide |
| F25 | Accessibility and responsive UX | Some responsive UI exists; completeness unknown | Test mobile layouts, keyboard, focus, labels, contrast, reduced motion | Frontend-wide |

---

## 7. Target User Journeys

### 7.1 Builder journey

1. Register and sign in.
2. Create a clear builder profile and declare skills.
3. Discover people, project ideas, and opportunities.
4. Follow builders or submit a collaboration request.
5. Join a team after acceptance.
6. Access the authorized project workspace.
7. Work on assigned tasks and share evidence.
8. Submit project completion for confirmation.
9. Receive Proof of Work after the defined confirmation/verification rules are met.
10. Build reputation from credible contributions and eligible feedback.
11. Use proof-backed profile information to discover future opportunities.

### 7.2 Project creator journey

1. Create a project/opportunity post with clear scope and roles.
2. Review incoming collaboration requests.
3. Accept or decline applicants with appropriate notifications.
4. Form a team under membership and capacity rules.
5. Start/activate the workspace.
6. Define milestones and tasks.
7. Track work and address blockers.
8. Request completion.
9. Review team confirmations and resolve disagreement.
10. Publish verified proof and allow eligible peer ratings.
11. See the project's final status and evidence.

### 7.3 Administrator/moderator journey

1. Review reports and flagged activity.
2. Inspect the target and its context without bypassing access controls unnecessarily.
3. Apply documented actions (dismiss, warn, restrict, remove, suspend) according to policy.
4. Record the decision and reason in an audit trail.
5. Handle appeals/disputes if included in launch scope.
6. Monitor abuse, completion, proof verification, and operational metrics.

---

## 8. Canonical Domain Model and State Decisions

The supplied documents are not fully aligned on whether Post or CollaborationRequest is the main project entity. Resolve this before designing workspace migrations.

### 8.1 Recommended decision process

Do not decide by adding tables immediately. First map the current models and flows:
- What does a `Post` represent in the UI?
- Can a post exist without inviting collaborators?
- Does `CollaborationRequest` represent an applicant's request or the project itself?
- Where are accepted members stored, and can they be removed?
- How is a project marked as in progress today?
- What does `Conversation.project_id` reference in practice?
- Can one project have multiple collaboration rounds or workspaces?

Then select one canonical root entity and write the migration/compatibility plan.

### 8.2 Proposed lifecycle (for product approval)

A proposed collaboration/project lifecycle consistent with the core idea is:

`DRAFT → OPEN → IN_PROGRESS → COMPLETION_PENDING → COMPLETED`

Possible terminal/exception states: `CANCELLED`, and possibly `DISPUTED` if a completion disagreement requires a persistent state.

A Workspace may have its own lifecycle, but it must not drift independently from the project lifecycle. Define the source of truth and transition rules before coding.

### 8.3 Proposed completion lifecycle (for product approval)

1. Eligible owner/member submits a completion request with required evidence.
2. System snapshots project metadata and eligible members at submission time.
3. Each eligible member can confirm or reject once, with timestamps and optional reasons.
4. The system checks required confirmations and any timeout/escalation policy.
5. If criteria are met, create a durable Proof of Work record.
6. If criteria fail or are disputed, keep the project from being silently marked complete and route it through a defined resolution process.
7. Record all state transitions and the actor who caused them.

**Product decision needed:** exact confirmation threshold, whether the owner counts as a confirmer, whether all members must confirm, timeout duration, and dispute/appeal process.

### 8.4 Proposed Proof of Work model principles

- Proof records must be tied to a specific project and contributor(s).
- Separate evidence submission from verification status.
- Keep an audit history for status changes.
- Give each proof a unique, non-guessable public verification identifier.
- Do not expose private files or private project data through public verification pages.
- Avoid claiming a certificate is “immutable” unless actual tamper-evidence and correction/revocation behavior are designed.
- Allow external portfolio evidence to be labeled as external/unverified until it passes a defined verification process.

### 8.5 Proposed reputation principles

- Never let clients directly set reputation or verification values.
- Store auditable reputation events or ledger entries, not only a mutable aggregate score.
- Calculate reputation from defined, eligible signals such as verified contribution, project completion, and eligible peer feedback.
- Prevent duplicate ratings, self-ratings, retaliatory loops, and obvious collusion where practical.
- Version the formula and preserve historical explainability.
- Define how reversals, fraud findings, deleted projects, and revoked proofs affect scores.
- Followers and likes should not be treated as equivalent to verified execution evidence.

The formula is deliberately **not finalized** here. It requires product design and anti-abuse review before implementation.

---

## 9. Security, Privacy, and Trust Gates

Security is cross-cutting and must be tested in every phase.

### 9.1 Required authorization matrix

Before each feature ships, define who can read and write each resource:
- Profile owner, follower, non-follower, and anonymous visitor.
- Post owner, collaborator, unrelated user, and moderator.
- Collaboration requester, project owner, accepted member, declined applicant.
- Workspace owner/member and non-member.
- Task assignee, workspace member, project owner.
- Proof contributor, project participant, public verifier, moderator.
- Rating author, rating subject, unrelated user, moderator.
- Admin/staff roles and ordinary users.

Backend checks must be authoritative. Frontend hiding is not authorization.

### 9.2 Security items requiring verification

The V1 audit flagged or discussed:
- Private-profile/post authorization on direct API endpoints.
- JWT storage in localStorage as an XSS exposure.
- Upload validation and size/type restrictions.
- Search query scalability.
- Need for auditability around proof and trust actions.

Phase 1/2 reports claim some privacy/moderation improvements. Re-test these with direct API requests and multiple test accounts. Do not assume the earlier findings are fixed merely because a build passes.

### 9.3 Cross-cutting controls

- Server-side authorization and input validation.
- Rate limiting on authentication, search, reports, uploads, and sensitive mutations.
- Safe file type/size validation and controlled storage permissions.
- Audit log for sensitive state changes and moderator actions.
- Explicit deletion/retention policy for account data, uploads, messages, proofs, and reports.
- No secret values in repository or logs.
- Database backups and tested restore procedure.
- Error monitoring and operational alerts.
- Regression tests for every privacy or permission bug found.

---

## 10. Proposed Roadmap and Dependencies

This roadmap is ordered by dependency, not by social-media feature parity. The scope and acceptance criteria of each phase must be approved before its coding prompt is issued.

### Phase 0 — Blueprint and current-state verification (**NOW**)
**Outcome:** one approved product plan and a reliable current-state inventory.

Tasks:
- Review this blueprint and resolve product decisions.
- Inspect the latest git status/diff and migrations.
- Confirm Phase 1 and 2 behavior manually.
- Run backend tests, frontend type check/build, and selected E2E tests from documented environments.
- Record real failures and fix only blockers/regressions in a separate stabilization scope.
- Decide canonical project entity and lifecycle ownership before workspace design.

**Exit gate:** owner approves the feature scope and domain decisions; no unknown critical privacy regression remains.

### Phase 1 — Builder Profiles (reported complete; verification gate)
**Outcome:** reliable, editable builder identity.
- Verify headline, skills/proficiency, cover/avatar, structured sections, completeness, and privacy.
- Confirm reputation/verification values cannot be self-awarded.
- Fix only proven defects.

**Exit gate:** profile persistence, upload, privacy, and backward compatibility verified.

### Phase 2 — Personalized Feed (reported complete; verification gate)
**Outcome:** stable, relevant For You and Following feeds.
- Verify ranking against controlled fixtures.
- Verify existing legacy tabs and post actions.
- Verify privacy/report filters, pagination, and query behavior.
- Review author diversity logic with real multi-author fixtures.

**Exit gate:** ranking and visibility tests pass, with no critical regression.

### Phase 3 — Search & Builder Discovery
**Outcome:** users can search builders and project/opportunity posts with useful filters.

Planned scope:
- Unified search modes: builders, projects/opportunities, and optionally all.
- Server-side query, filters, pagination, and stable ordering.
- Builder filters: skill, proficiency, college, location, and relevant profile visibility.
- Project filters: category, tags/skills/roles needed, location/remote, and status where such a status exists.
- Useful empty/loading/error states and responsive results.
- Query performance measurement before adding specialized indexes.
- Permission and private-profile filtering enforced server-side.

Dependencies: current User/UserSkill, Post/PostTag/PostRequirement, visibility rules, and verified API conventions.

**Not included by default:** AI search, Elasticsearch, messaging redesign, new project model, or unrelated profile/feed changes.

**Exit gate:** test matrix for filters, privacy, pagination, and relevance passes; benchmark results are recorded. Any latency target (for example, 150 ms) must be measured in a defined environment and treated as a target, not a universal guarantee.

### Phase 4 — Collaboration and team lifecycle hardening
**Outcome:** reliable request → acceptance → membership flow.

Planned scope:
- Document current states and valid transitions.
- Prevent duplicate/racing requests and over-capacity acceptance.
- Clarify owner/requester/member permissions.
- Canonical team membership source.
- Role-specific application only if approved and supported by the product design.
- Reliable notifications and chat membership synchronization.
- Idempotent accept/decline operations and tests.

Dependencies: Posts/opportunity entity decision, CollaborationRequest, PostCollaborator, notifications, conversations.

**Exit gate:** multi-user lifecycle tests pass, including concurrent/duplicate requests and unauthorized actions.

### Phase 5 — Workspace foundation
**Outcome:** each accepted project has one authorized workspace.

Planned scope:
- Approved relationship between project/opportunity, team membership, and workspace.
- Workspace creation/activation rules.
- Member access enforcement.
- Project overview and shared context.
- Workspace status and audit history.
- Reuse existing team chat or explicitly link it; avoid duplicate chat systems.

Dependencies: Phase 4 and canonical project entity.

**Exit gate:** only eligible members can access workspace resources; lifecycle state stays consistent.

### Phase 6 — Tasks, milestones, and workspace files
**Outcome:** teams can coordinate real execution.

Planned scope:
- Tasks with title, description, status, assignee, creator, due date, and timestamps as approved.
- Milestones/project progress if they have clear user value.
- Task activity history for important changes.
- File attachments with size/type limits and access checks.
- Notifications for assignments and important changes.
- Board/list UI with loading, empty, error, and mobile states.

Dependencies: Workspace and membership authorization.

**Exit gate:** task permission, assignment, file access, and state-transition tests pass.

### Phase 7 — Completion and confirmation
**Outcome:** a formal and auditable completion process.

Planned scope:
- Completion request and evidence.
- Eligible member snapshot.
- Per-member confirmation/rejection.
- Duplicate prevention and timestamps.
- Rules for all/required confirmations, deadlines, disagreement, cancellation, and reopening.
- Audit trail and notifications.

Dependencies: workspace/task execution and product-approved completion rules.

**Exit gate:** successful, rejected, incomplete, and disputed paths are tested.

### Phase 8 — Proof of Work
**Outcome:** credible proof records linked to completed projects and contributors.

Planned scope:
- Proof record and verification status.
- Unique verification code/identifier.
- Evidence links/files and privacy controls.
- Public verification page that leaks no private data.
- Certificate generation only after format, correction, revocation, and integrity behavior are approved.
- External proofs clearly distinguished from internally verified project proofs.

Dependencies: completion/confirmation engine and safe file storage.

**Exit gate:** proof issuance eligibility, access control, unique identifiers, and verification behavior pass.

### Phase 9 — Reputation and peer feedback
**Outcome:** an explainable builder credibility system.

Planned scope:
- Eligible participant ratings after qualifying completion.
- One rating per eligible reviewer/target/project, subject to final policy.
- Anti-abuse rules, moderation, and appeal path.
- Versioned reputation calculation and auditable events.
- Verification-level workflow, evidence requirements, review, revocation, and admin audit.
- Clear explanation of why a score/badge exists.

Dependencies: proof records and confirmed contributions.

**Exit gate:** score calculation is deterministic, auditable, permission-protected, and covered by abuse tests.

### Phase 10 — Notifications and communication completeness
**Outcome:** important lifecycle events reach the right people.

Planned scope:
- Audit existing notification system first.
- Cover join request, acceptance/decline, workspace membership, task assignment, completion, proof issuance, rating, and moderation outcomes.
- Read/unread state, deep links, duplicate delivery behavior, and failure handling.
- Email/push delivery only if explicitly included in scope.

Dependencies: event definitions from previous phases.

### Phase 11 — Moderation, administration, and analytics
**Outcome:** safe, observable operation.

Planned scope:
- Report queue and target types.
- Moderator actions and audit trail.
- Account restrictions and appeals if approved.
- Lifecycle KPIs: collaboration requests, acceptance rate, workspace activation, task completion, completed projects, proofs issued, verified proof ratio.
- Privacy-aware event tracking and access restrictions.

### Phase 12 — Performance, reliability, and launch readiness
**Outcome:** confidence that the product can be operated safely.

Planned scope:
- Query profiling and measured indexes.
- Load tests for feed, search, chat, uploads, and workspace APIs.
- CI checks, migration review, staging verification, backups/restore drills, error monitoring, secret management, rollback.
- Accessibility and responsive regression.
- End-to-end critical journey tests.
- Release checklist and known-limitations register.

---

## 11. Search & Discovery Phase 3 — Draft Specification Outline

This is a scope outline only, not authorization to code.

### User outcomes
- Search for builders by name/username and skills.
- Search project/opportunity posts by title, description, tags, and required roles.
- Filter results by college, location, category, remote status, and project status where available.
- Open a result and take a relevant next action (view profile, follow, or view/request collaboration according to permissions).

### Backend requirements
- Reuse existing search endpoints if they can be consolidated without breaking clients.
- Validate and normalize query parameters.
- Perform filtering and pagination server-side.
- Apply privacy and visibility constraints before returning results.
- Return a documented, consistent response structure.
- Avoid leaking private profile fields through search results.
- Avoid N+1 queries.
- Add database indexes only after verifying database engine and query plans.

### Frontend requirements
- Search input with debouncing and clear behavior.
- Distinct Builders / Projects result modes.
- Filter controls with applied-filter visibility and reset.
- Loading, no-results, and error states.
- Pagination or load-more behavior that cannot duplicate results.
- Mobile-friendly result cards.
- Preserve existing search routes/links unless a migration plan is approved.

### Tests
- Name, skill, tag, role, and category search.
- Filter combinations.
- Empty and malformed queries.
- Pagination and stable ordering.
- Private profile and private post exclusions.
- Unauthenticated behavior.
- Performance/query-count regression.
- Existing search endpoint compatibility.

### Acceptance criteria to finalize
- Exact supported filters and combinations.
- Exact API parameters and response contract.
- Search relevance order.
- Minimum/maximum query length and rate limits.
- Target performance and the test environment used.
- Whether a single unified endpoint or compatible specialized endpoints are preferred.

---

## 12. Decisions Needed Before Finalizing the Roadmap

These are the key product decisions. Do not invent answers in implementation code.

| ID | Decision | Why it matters | Suggested default for review |
|---|---|---|---|
| D1 | Is ENQUEbet primarily a project-completion platform with social features, or a broad social network? | Sets prioritization and prevents social feature creep | Project completion and proof remain primary; social supports that loop |
| D2 | What is the canonical project root: Post, CollaborationRequest, or a new Project/Collaboration entity? | Prevents duplicate models and difficult migrations | Reuse current Post as publication; only introduce a distinct project entity if lifecycle requirements cannot fit cleanly and migration is justified |
| D3 | What is a collaboration request in the product language: application to join, or a project itself? | Existing code and target docs appear to use the term differently | Use “join request/application” for a user's request; use a distinct, unambiguous name for the project/opportunity |
| D4 | Who may create a workspace, and when? | Controls authorization and duplicate workspaces | One workspace per accepted project/team, created idempotently on a clearly defined transition |
| D5 | What completion confirmation threshold is required? | Central to proof credibility | Require all eligible members or a clearly specified quorum; owner must approve exact rule |
| D6 | What happens when a member rejects completion or does not respond? | Prevents stuck or fraudulent proof issuance | No automatic verified proof; use a defined timeout/escalation or dispute flow |
| D7 | What is the first-launch proof type? | Affects schema, UX, verification, and certificate scope | Internal completion proof first; external links labeled unverified unless separately reviewed |
| D8 | How is reputation calculated? | Avoids arbitrary, gameable scores | Do not finalize score until proof/eligibility/abuse rules are approved; store auditable events |
| D9 | What does verification level 0–4 mean operationally? | Badges imply trust and must be backed by evidence | Define evidence and reviewer for each level; do not award unimplemented levels |
| D10 | Is private-profile following approval-based? Can users block others? | Affects profile, feed, search, and messaging access | Verify current behavior; specify private follow request and block/mute policy before launch |
| D11 | Which feed content belongs in Following? | The audit identified this as an open question | Default to posts from followed builders that the viewer is authorized to see; validate with product testing |
| D12 | Is college verification required for initial launch? | Adds identity-sensitive data and moderation burden | Defer until verification method and privacy policy are approved |
| D13 | Is certificate generation required for initial Proof of Work? | Adds template, storage, revocation, and trust obligations | Start with verifiable proof page; certificate PDF only if it adds clear value and can be audited |
| D14 | Which deployment environment is authoritative for verification? | Local SQLite and production PostgreSQL can behave differently | Explicitly name local, staging, and production; never run migrations or destructive tests against production by default |
| D15 | What is the launch-critical scope? | Prevents endless feature expansion | Search → collaboration reliability → workspace/tasks → completion/proof → reputation; defer nonessential social extras |

---

## 13. Risks and Mitigations

| Risk | Potential impact | Mitigation |
|---|---|---|
| Product docs differ from current models | Duplicate entities and migrations | Reconcile model/endpoint flows before workspace design |
| Phase 1/2 changes are accepted from summary alone | Regressions or security holes remain | Review diff, run tests, manually verify key flows |
| Reputation is implemented before proof | Popularity or manipulation becomes “trust” | Build proof/eligibility first; reputation follows |
| Workspace added without canonical membership | Unauthorized access and inconsistent teams | Define one membership source and test every role |
| Completion logic is underspecified | False or disputed proofs | Approve confirmation/quorum/dispute rules first |
| Privacy enforced only in frontend | Private data exposure | Test direct backend endpoints for every resource |
| SQLite tests hide PostgreSQL issues | Migration/query failures in production | Run staging tests on the actual database engine |
| Unmeasured search indexes | Migration cost without benefit | Benchmark query plans before adding indexes |
| Overbuilding Instagram-like mechanics | Product loses focus and delivery slows | Prioritize the builder lifecycle and success KPIs |
| Weak operational readiness | Data loss or prolonged outages | Backups, restore tests, monitoring, rollback, and staging gates |

---

## 14. Product Metrics and Definition of Success

Use metrics aligned with ENQUEbet's mission.

### Core metrics
- Number of collaboration opportunities created.
- Join-request-to-acceptance rate.
- Percentage of accepted collaborations that activate a workspace.
- Workspace activation-to-completion rate.
- Number of completed projects.
- Number and ratio of proofs issued/verified.
- Repeat collaboration rate.
- Average completed projects per active builder.

### Supporting metrics
- Profile completion rate.
- Search-to-profile/project click-through rate.
- Search-to-collaboration-request conversion.
- Feed engagement as a supporting metric, not the primary goal.
- Median time from opportunity creation to first qualified request.
- Median time from workspace activation to completion.

### Trust and safety metrics
- Reports per active user/project.
- Time to resolve reports.
- Completion disputes and outcomes.
- Proof revocation/correction rate.
- Suspicious rating patterns.
- Unauthorized-access test failures.

Define exact formulas, time windows, and eligible populations before implementing analytics. Avoid vanity metrics without a product decision attached.

---

## 15. Standard Phase Execution Contract

Every future phase must use the same operating process:

1. **Plan:** inspect existing code and write the phase specification.
2. **Review:** list affected models, endpoints, components, dependencies, risks, and out-of-scope work.
3. **Approve:** user approves the specification before implementation.
4. **Implement:** make small, additive changes and avoid unrelated refactors.
5. **Test:** run backend tests, frontend type checks/build, and relevant E2E tests.
6. **Verify:** manually test important user journeys and direct API authorization.
7. **Review diff:** inspect migrations, changed files, and accidental scope expansion.
8. **Report:** list what changed, actual command results, known limitations, and manual steps.
9. **Approve next phase:** never begin the next phase automatically.

Each coding prompt must explicitly say:
- Do not deploy or reset the database.
- Do not rewrite the app.
- Do not invent missing product rules.
- Stop and ask if a genuine product decision is required.
- Do not claim tests passed without actual output.
- Keep a record of migrations and rollback considerations.

---

## 16. Immediate Action Plan

### Step A — Freeze feature work briefly
Do not issue the Phase 3 implementation prompt yet.

### Step B — Verify Phases 1 and 2
Run the manual checklist in Section 5.3 and inspect the current git diff, migrations, and actual test outputs.

### Step C — Resolve critical decisions
At minimum, decide D2 (canonical project root), D5/D6 (completion confirmation and disagreement), D7 (first proof type), and D8/D9 (reputation and verification rules) before implementing workspace/proof/reputation. Search can be specified in parallel, but must respect the current entity model.

### Step D — Approve the Search & Discovery specification
Turn Section 11 into a detailed phase spec with exact API contracts, filters, result ordering, test matrix, and acceptance criteria.

### Step E — Implement only the approved Phase 3 scope
Keep the work limited to search/discovery. Run regression tests for profile, feed, collaboration requests, and private-resource access.

### Step F — Continue through the dependency roadmap
Collaboration hardening → workspace → tasks/files → completion → Proof of Work → reputation → operational launch readiness.

---

## 17. Final Recommendation

ENQUEbet should not be developed as a checklist of Instagram or LinkedIn features. It should be developed as a builder lifecycle platform with a useful social discovery layer.

**The correct next step is Phase 0: verify the current state, approve this blueprint, and settle the domain decisions that affect every later phase.** After that, Phase 3 Search & Discovery is the next feature implementation candidate, provided it is specified against the actual current models and APIs.

**No implementation phase is authorized by this document alone. Approval is required before the next coding prompt.**
