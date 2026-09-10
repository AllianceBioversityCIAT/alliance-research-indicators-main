# Tasks — PI Delegates (v2 · relational, backend-only)

- **Module:** my-pi-delegates (server only)
- **Spec id:** 2026-09-my-pi-delegates · **Status:** not-started
- **Supersedes:** v1 (role + frontend) — withdrawn
- **Linked:** ./requirements.md · ./design.md · ./proposal.md
- **Last updated:** 2026-09-09

> **Single PR** (~9 tasks, ~700 LOC). **No role, no frontend.** Correctness-critical: modifies the system-wide PI-determination path.

## 1. Dependency graph
```mermaid
graph TD
  T01[T-01 Migration: pi_delegates + unique-active] --> T02[T-02 Entity + module]
  T02 --> T03[T-03 DTOs]
  T02 --> T04[T-04 Repository: insert/soft-delete + find-or-create sec_user (tx)]
  T03 --> T05[T-05 Service: CRUD + project auth (PI/delegate/SYSTEM_ADMIN)]
  T04 --> T05
  T05 --> T06[T-06 Controller + Swagger + route reg]
  T02 --> T07[T-07 Extend isPi() delegate fallback]
  T02 --> T08[T-08 Extend queryPrincipalInvestigator() delegate fallback]
  T06 --> T09[T-09 Tests: unit + e2e + existing isPi green]
  T07 --> T09
  T08 --> T09
```

## 2. Requirement → task coverage
| Requirement / clause | Task(s) |
| --- | --- |
| R-PID-001 (table, no role) / R-PID-006 (unique active) | T-01, T-02 |
| R-PID-002 (`isPi` PI-or-delegate; PI unchanged; no cross-project) | T-07, T-09 |
| R-PID-003 (metadata flag; frontend-free) | T-08, T-09 |
| R-PID-004 (CRUD) | T-05, T-06 |
| R-PID-005 (find-or-create sec_user, transactional) | T-04, T-09 |
| R-PID-007 (auth: PI/delegate/SYSTEM_ADMIN) | T-05, T-09 |
| NFR-PID-001 (no role/frontend) | all + T-09 git-diff check |
| NFR-PID-002 (PI behavior-preserving) | T-07, T-08, T-09 |
| NFR-PID-003 (transactional) | T-04, T-09 |

## 3. Tasks

### T-01 — Migration: `pi_delegates` + unique-active  ✅ [x] PASS 2026-09-10 (DB-apply = human step)
- **Covers:** R-PID-001, R-PID-006
- **Files:** `db/migrations/<ts>-createPiDelegates.ts`
- **Desc:** Create `pi_delegates` (`project_id` FK agresso ON DELETE RESTRICT; `pi_user_id`, `delegate_user_id` FK `sec_users`; AuditableEntity; `active_delegate_key varchar(80)` STORED generated `IF(is_active=1, CONCAT(project_id,':',delegate_user_id), NULL)` + UNIQUE). **No role seed, no roles-table change.**
- **Done:** [ ] applies forward + reverts clean; [ ] two revoked rows for same (project,delegate) coexist, second active rejected; [ ] no `user_roles`/`SecRolesEnum` touched.
- **Effort:** M · **Skills:** nestjs-expert

### T-02 — Entity + module + route registration  ✅ [x] PASS 2026-09-10 (attempt 2)
- **Covers:** R-PID-001
- **Files:** `entities/pi-delegates/{entities/pi-delegate.entity.ts, pi-delegates.module.ts}`, `routes/main.routes.ts`
- **Done:** [ ] `PiDelegate extends AuditableEntity` with the 3 FKs; [ ] module registered at `pi-delegates`.
- **Dep:** T-01 · **Effort:** S · **Skills:** nestjs-expert

### T-03 — DTOs  ✅ [x] PASS 2026-09-10
- **Covers:** R-PID-004, R-PID-005
- **Files:** `entities/pi-delegates/dto/*`
- **Desc:** `CreatePiDelegateDto {project_id, delegate: (sec_user_id | {email, first_name, last_name})}`, revoke/verify DTOs; `class-validator` + `@ApiProperty`.
- **Done:** [ ] invalid/empty payloads → 400.
- **Dep:** T-02 · **Effort:** S · **Skills:** api-design-principles

### T-04 — Repository: insert/soft-delete + find-or-create sec_user (transactional)  ✅ [x] PASS 2026-09-10
- **Covers:** R-PID-005, NFR-PID-003
- **Files:** `entities/pi-delegates/repositories/pi-delegates.repository.ts`
- **Desc:** In one transaction: `findUserByEmailOrCarnet`; if absent `createUserInSecUsers` (reuse `result.repository.ts` mechanism); then insert `pi_delegates`. Soft-delete on revoke.
- **Disqualifies:** the rollback test must inject a failure **after** sec_user create and assert **both** are absent — a test that only checks the happy path can't prove atomicity.
- **Done:** [ ] existing delegate reused; [ ] absent delegate created then associated; [ ] injected failure → nothing committed.
- **Dep:** T-02 · **Effort:** M · **Skills:** nestjs-expert, error-handling-patterns

### T-05 — Service: CRUD + project authorization  ✅ [x] PASS 2026-09-10
- **Covers:** R-PID-004, R-PID-007
- **Files:** `entities/pi-delegates/pi-delegates.service.ts`
- **Desc:** `create/list/verify/update/revoke`. **Auth:** allow if `SYSTEM_ADMIN` (existing bypass) or caller is PI/active-delegate of `project_id` (reuse the PI join, project-scoped, unioned with `pi_delegates`). No new role/permission.
- **Named red input (K-012):** a caller who is neither PI, delegate, nor admin of the project → 403.
- **Done:** [ ] non-authorized caller → 403; [ ] SYSTEM_ADMIN allowed; [ ] PI/delegate of project allowed.
- **Dep:** T-03, T-04 · **Effort:** M · **Skills:** nestjs-expert

### T-06 — Controller + Swagger + route  ✅ [x] PASS 2026-09-10
- **Covers:** R-PID-004
- **Files:** `entities/pi-delegates/pi-delegates.controller.ts`
- **Desc:** `POST /pi-delegates`, `GET /pi-delegates?projectId`, `GET /pi-delegates/verify`, `PATCH`/`DELETE`; `@ApiTags`, `@ApiBearerAuth`, `ServerResponseDto`.
- **Done:** [ ] all endpoints in `/swagger`.
- **Dep:** T-05 · **Effort:** S · **Skills:** nestjs-expert, api-design-principles

### T-07 — Extend `isPi()` with a delegate fallback  ✅ [x] PASS 2026-09-10
- **Covers:** R-PID-002, NFR-PID-002
- **Files:** `result-status-workflow/repositories/result-status-workflow.repository.ts`
- **Desc:** Keep the existing PI query **byte-for-byte**. After it, only when it returns no rows, run the delegate query (result→primary project→`pi_delegates` by `delegate_user_id`). `return existingPiRows>0 || delegateRows>0`.
- **Named red input (K-012):** delegate of project A + a result whose primary project is B → must be false (no cross-project leak).
- **Done:** [ ] PI → true, `pi_delegates` NOT queried; [ ] delegate of the result's project → true; [ ] neither → false; [ ] delegate of another project → false; [ ] existing `isPi` tests unchanged & green.
- **Dep:** T-02 · **Effort:** M · **Skills:** nestjs-expert, systematic-debugging

### T-08 — Extend `queryPrincipalInvestigator()` with a delegate fallback  ✅ [x] PASS 2026-09-10
- **Covers:** R-PID-003, NFR-PID-002
- **Files:** `shared/const/gloabl-queries.const.ts`
- **Desc:** Add a `LEFT JOIN pi_delegates` (by project + `delegate_user_id` + active); `is_principal = (name-match matched) OR (delegate row present)`. Real-PI result unchanged.
- **Done:** [ ] metadata `is_principal_investigator` true for a delegate; [ ] true & unchanged for a real PI; [ ] false for neither; [ ] **`git diff --stat client/` empty** (no frontend change — NFR-PID-001).
- **Dep:** T-02 · **Effort:** M · **Skills:** nestjs-expert

### T-09 — Tests: unit + e2e + existing suite green  ✅ [x] PASS 2026-09-10 (+ surfaced/fixed P0 module-wiring bug)
- **Covers:** R-PID-002/003/005/006/007, NFR-PID-001/002/003
- **Files:** `pi-delegates.service.spec.ts`, `result-status-workflow.repository.spec.ts` (extend), `test/pi-delegates.e2e-spec.ts`
- **Desc (the 12 scenarios):** PI→true; delegate→true; neither→false; PI without delegates unchanged; delegate exists in sec_users; delegate absent → created first; association created; duplicate rejected; revoke → isPi false; delegate of other project → false; error during sec_user/association; **existing `isPi` tests still pass**. Plus metadata-flag PI/delegate/neither, and auth allowed/denied.
- **Disqualifies (KZ-004):** vary a discriminating field per delegate/project so per-project scoping is provable, not a batch-wide pass. Assert on persisted rows / query results, not mock call order (KZ-001).
- **Done:** [ ] `npm test -- --silent` green incl. the pre-existing `isPi` spec; [ ] `git diff --stat client/` empty.
- **Dep:** T-06, T-07, T-08 · **Effort:** M · **Skills:** nestjs-expert, tdd

## 4. Estimated LOC & PR strategy
~9 tasks · ~700 LOC · **1 PR** (the two query edits ship with the table + CRUD + tests as one cohesive backend change). First task: **T-01**.

## 5. Risks & blockers
| # | Risk | Mitigation | Status |
| --- | --- | --- | --- |
| RB-1 | Modifying `isPi`/metadata gates results across the system | Existing query untouched; fallback only when PI false; full test matrix + existing suite green | open |
| RB-2 | Migration must be **applied** to shared Dev DB (a merge does not) — K-015 | Human apply step in T-01 done-check | open |
| RB-3 | The two PI functions resolve PI differently (projectLeadId vs name-match) | Delegate lookup identical; each keeps its own result→project resolution | open |

## 6. Done definition
- [x] T-01…T-09 done (all 9 tasks Reviewer-PASS; code complete, committed).
- [x] PI / delegate / neither verified for **both** `isPi` and the metadata flag *at the unit/control-flow level*; existing `isPi` tests green (10/10) + full unit suite 2718/2718. **[~] the SQL-semantic behavioral proof (cross-project false, metadata delegate→true) is written as e2e but deferred to the DB migration-apply.**
- [x] Create provisions absent sec_user first, transactional (atomicity verified by review + unit control-flow); **[~] duplicate-rejected + rollback-no-orphan proven at the DB level are deferred to the e2e/migration-apply.**
- [x] **No role created, no roles-table change, `git diff --stat client/` empty.**
- [x] `/swagger` documents the CRUD (controller wired + route now reachable — P0 wiring bug fixed). **[~] migration applies+reverts and is applied to the target DB — HUMAN STEP (K-015), still pending.**
- [ ] OQ-B (project-keyed) and OQ-D (provisioning identity) confirmed with Product — **still open.**

**Post-implementation status:** all code merged on branch; unit-verified. Two gates remain, both human/infra: (1) apply the migration to the shared DB (K-015) — this also un-defers the e2e behavioral suite; (2) Product sign-off on OQ-B/OQ-D.
