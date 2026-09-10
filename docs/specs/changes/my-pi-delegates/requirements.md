# Requirements — PI Delegates (v2 · relational, backend-only)

- **Module:** my-pi-delegates (server only)
- **Spec id:** 2026-09-my-pi-delegates
- **Depth:** Standard (small surface, but correctness-critical — modifies the system-wide PI-determination path)
- **Status:** draft
- **Owner:** STAR squad
- **Supersedes:** v1 of this spec (role-based + full STAR frontend) — withdrawn
- **Linked proposal:** ./proposal.md · **Linked tickets:** AC-1733
- **Last updated:** 2026-09-09

## 1. Context

Give a project's work PI-level review by a **PI Delegate**, modeled **only** as a row in a new **`pi_delegates`** table — **no role, no RBAC, no frontend change**. A delegate gains PI capabilities because the **existing** PI-determination logic is extended to answer "yes" for them. See `proposal.md`; do not restate.

**Two backend functions determine PI-ness and both must be extended** (the client flag comes from #2, not #1):
1. `isPi(resultId, userId)` — authorization (`function-handler.service.ts` → `isPiValidation`).
2. `queryPrincipalInvestigator(user, result)` → `is_principal_investigator` metadata **sent to the client** (`results.service.ts:830`).

**Not changing:** how a *real* PI is identified; roles/RBAC; the frontend; any consumer contract (both functions keep their signature and boolean meaning "has PI capabilities here").

## 2. Requirement numbering
`R-PID-NNN` (functional), `NFR-PID-NNN`.

## 3. Functional requirements

### R-PID-001 — `pi_delegates` is the relational source of truth (no role)
- **As a** platform, **I want** delegations stored as `(project, PI, delegate)` rows, **so that** delegation needs no role.
- **AC.1** — A `pi_delegates` row associates `project_id` (agresso agreement), `pi_user_id`, `delegate_user_id` (both `sec_users.sec_user_id`).
- **AC.2** — No new role is created and the roles table is not modified — **BUT it must NOT** reference `SecRolesEnum`/`user_roles` for delegation.
- **AC.3** — At most **one active** delegation per `(project_id, delegate_user_id)` — **AND IT MUST** be enforced at the DB (unique on an active-only key), not only in code.

### R-PID-002 — `isPi()` returns true for a real PI **or** an active delegate
- **AC.1** — GIVEN a real PI, WHEN `isPi(resultId, userId)`, THEN true — **AND IT MUST NOT** consult `pi_delegates` (the existing query decides first; delegate is only the fallback when it is false).
- **AC.2** — GIVEN a user who is an active delegate of the result's primary project (and not the PI), THEN `isPi` returns true.
- **AC.3** — GIVEN a user who is neither, THEN false.
- **AC.4** — GIVEN a delegate of a **different** project, THEN false for a result not under that project — **BUT it must NOT** leak across projects.
- **AC.5** — The existing PI query is unchanged (byte-for-byte); existing `isPi` tests stay green.

### R-PID-003 — PI metadata flag reflects delegates (so the frontend needs no change)
- **AC.1** — `queryPrincipalInvestigator`/`is_principal_investigator` is true for a real PI **or** an active delegate of the result's project.
- **AC.2** — The client receives the same `is_principal_investigator: true` for a delegate as for a PI — **AND IT MUST** require **no** frontend change to work.
- **AC.3** — For a real PI the value is unchanged.

### R-PID-004 — CRUD for delegations
- **AC.1** — Endpoints to **create**, **list**, **verify** (exists?), **update** (if applicable), and **revoke** a delegation, following existing controller/service/DTO conventions + Swagger.
- **AC.2** — Revoke sets the delegation inactive; a revoked delegate's `isPi()`/metadata return to false (R-PID-002/003).

### R-PID-005 — Create flow provisions the delegate in `sec_users` first (transactional)
- **AC.1** — On create, the delegate is looked up in `sec_users` (by email/carnet); if present, reuse it.
- **AC.2** — If absent, the delegate is created via the **existing** `createUserInSecUsers` mechanism **before** the `pi_delegates` row.
- **AC.3** — The whole create is a **single transaction** — **BUT it must NOT** leave a `pi_delegates` row pointing at a non-existent `sec_user`, and on any error nothing is committed.

### R-PID-006 — No duplicate active delegation
- **AC.1** — Re-creating an existing active `(project, delegate)` delegation is rejected/idempotent, enforced by the DB constraint (R-PID-001 AC.3).

### R-PID-007 — CRUD authorization (no new role/permission)
- **AC.1** — Only a caller who is the **PI or an active delegate** of the target project, **or a `SYSTEM_ADMIN`**, may manage that project's delegations.
- **AC.2** — Reuses the existing PI/`isPi` relationship (project-scoped) + the existing `SYSTEM_ADMIN` bypass — **BUT it must NOT** introduce a new role, permission, or RBAC rule.

## 4. Non-functional requirements

### NFR-PID-001 — No role / RBAC / frontend change
- **Category:** scope integrity. **Target:** zero changes to the roles table, `SecRolesEnum`, RBAC, and the `client/` package. **Verified:** `git diff` touches no `client/` file and no roles migration/enum; grep confirms no new role seed.

### NFR-PID-002 — PI path behavior-preserving (correctness-critical)
- **Category:** reliability/security. **Target:** for a real PI, both functions return exactly as today. **Verified:** existing `isPi` tests green + an old-vs-new comparison over the existing inputs (K-019); the delegate fallback fires only when the PI check is false.

### NFR-PID-003 — Transactional consistency
- **Category:** reliability. **Target:** create is atomic (sec_user + delegation) — no orphan, no partial commit. **Verified:** a test injecting a failure after sec_user create asserts rollback of both.

## Defect classes → gate
| Defect class | Gate |
| --- | --- |
| Delegate leaks across projects | Unit: delegate of project A → `isPi` false for a result of project B (R-PID-002 AC.4) |
| Real-PI behavior changed | Existing `isPi` tests green + old-vs-new over existing inputs (NFR-PID-002) |
| Frontend silently required | `git diff --stat client/` is empty (NFR-PID-001) |
| Orphan delegation / partial commit | Rollback test (NFR-PID-003) |
| Duplicate active delegation | DB unique-active constraint + repeat-create test (R-PID-006) |
| Two PI functions diverge | Both `isPi` and `queryPrincipalInvestigator` tested for PI/delegate/neither (R-PID-002/003) |
| Migration not applied to shared DB | Human apply step named (K-015) |

## 5. Data requirements
- New `pi_delegates`: `pi_delegate_id` PK; `project_id` varchar(36) FK `agresso_contracts.agreement_id`; `pi_user_id` bigint FK `sec_users`; `delegate_user_id` bigint FK `sec_users`; `AuditableEntity`; generated `active_delegate_key` + unique. Migration append-only; applied separately (K-015).

## 6. API surface delta (finalized in design)
- `POST /pi-delegates` (create, provisions sec_user), `GET /pi-delegates?projectId` (list), `GET /pi-delegates/verify` (exists?), `PATCH`/`DELETE` (update/revoke). Authorization per R-PID-007. Swagger required. `ServerResponseDto` envelope.
- **Modified (not new endpoints):** `isPi()` + `queryPrincipalInvestigator()` gain a delegate fallback.

## 7. Cross-system impact
- **AGRESSO:** read-only (project + lead), unchanged. **sec_users:** insert via existing mechanism. **Frontend:** none. **Roles:** none.

## 8. Assumptions, risks
- **R1 (critical):** `isPi`/metadata gate results actions system-wide — fallback only fires when the PI check is false; existing query untouched; full test matrix.
- **R2:** the two PI functions identify the PI differently (projectLeadId vs name-match); the **delegate** lookup added to each is identical, but each resolves result→project its own existing way.

## 9. Open questions
| # | Question | Status |
| --- | --- | --- |
| ~~OQ-A~~ | Extend **both** `isPi` + `queryPrincipalInvestigator` — **RESOLVED: both** (2026-09-09). | Closed |
| ~~OQ-C~~ | CRUD auth — **RESOLVED: PI/delegate of project + SYSTEM_ADMIN** (2026-09-09). | Closed |
| ~~OQ-B~~ | **RESOLVED (Product, 2026-09-10): by PROJECT** (`agreement_id`) — a delegate is assigned per project, mirroring how a project has one PI. The delegate is keyed to the project, not to individual results. | Closed |
| ~~OQ-D~~ | **RESOLVED (Product, 2026-09-10): email + first_name + last_name**; the **carnet** is resolved server-side via `alliance_user_staff` (the same chain `isPi` uses: `projectLeadId → aus.carnet → su.email`). Existing users are reused by email/carnet; absent ones are provisioned. | Closed |

## 10. Sign-off
- [ ] Engineering lead — <name>
- [ ] Security review (PI-auth path touched) — <name>
- [ ] DevOps (migration on shared DB) — <name>

---

## 11. Amendment v3 — bulk operations + PI-exclusion (2026-09-10, Product-confirmed)

> Product confirmed after v2 shipped (T-01…T-09 done) that the CRUD must be **bulk (many×many)**, not one-to-one, and added a PI-exclusion rule. This amends R-PID-004/007 and adds R-PID-008/009/010. The data model (`pi_delegates`), `isPi`/metadata fallbacks, and auth join from v2 are unchanged and reused.

### R-PID-008 — A PI cannot be a delegate of their own project
- **AC.1** — On assign, if a candidate `delegate_user_id` is the **PI of that `project_id`** (resolved via the existing `agresso_contracts.projectLeadId → alliance_user_staff.carnet → sec_users.email` chain), the pair is **rejected**.
- **AC.2** — The same user MAY be a delegate of a **different** project where they are not the PI (PI of A ⇒ not a delegate of A, but may be a delegate of B).
- **AC.3** — Rejection is **fail-fast and atomic**: if any (project, delegate) pair in a bulk request violates this, the **whole request is rejected** (nothing applied) with an error naming the offending pair.

### R-PID-009 — Bulk assign with per-project synchronization (`POST /pi-delegates`)
- **As a** PI/delegate/admin, **I want** to assign many delegates to many projects in one call, **so that** delegation is managed in bulk.
- **AC.1** — Payload: `{ project_ids: string[], delegates: (existing sec_user_id | {email, first_name, last_name})[] }`. The `delegates` list applies to **each** project in `project_ids` (same set per project — cartesian).
- **AC.2 — SYNC (Model B):** for each `project_id`, the active delegate set becomes **exactly** `delegates`: pairs in the list but not active → **created**; active pairs **not** in the list → **revoked** (soft-delete); pairs already active and in the list → **kept**. This is declarative/destructive by design.
- **AC.3** — Authorization (R-PID-007) is enforced **per project**; the caller must be PI/active-delegate/SYSTEM_ADMIN of **every** `project_id` in the request, else 403 (fail-fast, nothing applied).
- **AC.4** — R-PID-008 (PI-exclusion) is enforced per pair, fail-fast.
- **AC.5** — Absent delegates are provisioned once (R-PID-005) and reused across all projects in the request. Duplicate-active is impossible by construction (sync).
- **AC.6** — The whole operation is a **single transaction** (all projects reconciled atomically; any error → nothing committed).
- **AC.7** — Response: per-project summary `{ project_id, created: [...], revoked: [...], kept: [...] }`.

### R-PID-010 — Bulk targeted revoke (`DELETE /pi-delegates`) — independent of sync
- **As a** PI/delegate/admin, **I want** a standalone bulk-revoke endpoint (used by other flows, e.g. a per-row delete action).
- **AC.1** — Two accepted shapes: `{ pi_delegate_ids: number[] }` (revoke by PK) **or** `{ project_ids: string[], delegate_user_ids: number[] }` (revoke each project×delegate active pair).
- **AC.2** — Soft-delete only the specified active delegations; it does **NOT** synchronize (does not touch anything not named).
- **AC.3** — Authorization per project (R-PID-007); revoke resolves each row's `project_id` and authorizes on it (no revoke on an unmanaged project). Transactional.

### Amended surface (supersedes R-PID-004 AC.1 single-item POST/DELETE)
- `POST /pi-delegates` — **bulk sync** (R-PID-009). Supersedes the single-create.
- `DELETE /pi-delegates` — **bulk revoke** (R-PID-010). Supersedes the single-by-id revoke.
- `GET /pi-delegates?projectId` (list) and `GET /pi-delegates/verify` — **unchanged** from v2.
- `isPi` + `queryPrincipalInvestigator` delegate fallbacks — **unchanged** (v2, done).
