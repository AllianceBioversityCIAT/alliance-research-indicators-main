# Design — PI Delegates (v2 · relational, backend-only)

- **Module:** my-pi-delegates (server only)
- **Spec id:** 2026-09-my-pi-delegates · **Depth:** Standard (correctness-critical)
- **Status:** draft · **Supersedes:** v1 (role + frontend) — withdrawn
- **Requirements:** ./requirements.md · **Last updated:** 2026-09-09

## 1. Executive Summary

A new **`pi_delegates`** table is the sole source of truth for delegation. The **two existing** PI-determination functions gain an identical **delegate fallback**, so a delegate is treated as a PI everywhere — with **no role and no frontend change**. Delegate creation reuses the existing `createUserInSecUsers` mechanism inside a transaction. A real PI's path is untouched; `pi_delegates` is consulted only when the existing PI check is false.

## 2. Flow

```
isPi(resultId, userId)                         queryPrincipalInvestigator(user, result)  → is_principal_investigator (to client)
  existing PI query (UNCHANGED)                  existing PI name-match (UNCHANGED semantics)
        │                                                │
     rows>0 ? ── yes → return true                    OR active delegate of the result's project?
        │ no                                             │
     active delegate of result's primary project?     is_principal = PI OR delegate
        │ yes → true    │ no → false

pi_delegates:  (project_id ← agresso agreement) · pi_user_id · delegate_user_id ← sec_users
Create delegate:  find sec_user (email/carnet) → if missing createUserInSecUsers() → insert pi_delegates   [one transaction]
Manage auth:  caller is PI/delegate of project  OR  SYSTEM_ADMIN
```

## 3. Directory Structure (server)
```
entities/pi-delegates/
  ├─ pi-delegates.module.ts · pi-delegates.controller.ts · pi-delegates.service.ts
  ├─ repositories/pi-delegates.repository.ts
  ├─ dto/{create-pi-delegate.dto.ts, revoke-pi-delegate.dto.ts, verify-pi-delegate.dto.ts}
  ├─ entities/pi-delegate.entity.ts
  └─ pi-delegates.service.spec.ts
result-status-workflow/repositories/result-status-workflow.repository.ts   # + delegate fallback in isPi()  (existing query UNCHANGED)
shared/const/gloabl-queries.const.ts                                        # queryPrincipalInvestigator + delegate fallback
db/migrations/<ts>-createPiDelegates.ts
routes/main.routes.ts                                                       # register at 'pi-delegates'
```

## 4. Data Model — `pi_delegates`

| Column | Type | Notes |
| --- | --- | --- |
| `pi_delegate_id` | bigint PK | generated |
| `project_id` | varchar(36) | FK → `agresso_contracts.agreement_id`, ON DELETE RESTRICT |
| `pi_user_id` | bigint | FK → `sec_users.sec_user_id` — the delegating PI (provenance) |
| `delegate_user_id` | bigint | FK → `sec_users.sec_user_id` — the delegate |
| `active_delegate_key` | varchar(80) STORED GENERATED | `IF(is_active=1, CONCAT(project_id,':',delegate_user_id), NULL)` |
| *AuditableEntity* | — | `created_by/at`, `updated_by/at`, `is_active`, `deleted_at` |

- **UNIQUE** on `active_delegate_key` → at most one active delegation per `(project, delegate)`, revoke→re-grant safe (repo D-PI-9 pattern; MySQL has no filtered unique index). *(R-PID-001 AC.3 / R-PID-006)*
- Revoke = soft-delete. `pi_user_id` is provenance/authorization context; the delegate check needs only `(project_id, delegate_user_id)`.
- Migration append-only; **applied to shared DB as a separate human step** (K-015).

## 5. `isPi()` extension *(R-PID-002)* — keep existing query, add a conditional fallback

The existing PI query stays **byte-for-byte**. After it, only when it returns no rows, run a delegate query that reuses the same result→primary-project resolution:
```
select 1 from result_contracts rc
  inner join agresso_contracts ac on ac.agreement_id = rc.contract_id
  inner join pi_delegates pd on pd.project_id = ac.agreement_id
where rc.result_id = ? and rc.is_primary = true and rc.is_active = true
  and pd.delegate_user_id = ? and pd.is_active = true
limit 1;
```
`return existingPiRows>0 || delegateRows>0`. **DD-A (efficiency vs safety):** two sequential queries (existing untouched + fallback that runs *only* for non-PIs) is chosen over a single combined `OR` query, to keep the existing query and its tests exactly as-is (NFR-PID-002). The fallback adds one indexed lookup only for non-PI callers — no duplicated join on the PI path.

## 6. `queryPrincipalInvestigator()` extension *(R-PID-003)* — single query, add a LEFT JOIN

This is already one query returning `is_principal`. Extend it so `is_principal` is true when the existing name-match matches **or** an active `pi_delegates` row exists for the result's primary project and `user`:
```
... existing PI name-match LEFT JOIN (unchanged) ...
left join pi_delegates pd on pd.project_id = ac.agreement_id and pd.delegate_user_id = ${user} and pd.is_active = true
select ... if(su.sec_user_id is not null OR pd.pi_delegate_id is not null, true, false) as is_principal
```
So the client `is_principal_investigator` flag reflects delegates with **no frontend change** (R-PID-003 AC.2). Real-PI result unchanged (AC.3).

## 7. Backend Module — `pi-delegates`
- **Repository:** insert/soft-delete `pi_delegates`; **find-or-create sec_user** reusing `findUserByEmailOrCarnet` + `createUserInSecUsers` (`result.repository.ts`); all create work in **one transaction** (R-PID-005).
- **Service:** `create(dto)`, `list(projectId)`, `verify(projectId, delegateId)`, `revoke(...)`, `update(...)`. **Authorization (R-PID-007):** allow if caller is `SYSTEM_ADMIN` (existing bypass) **or** is PI/active-delegate of `project_id` — checked via a **project-scoped reuse of the existing PI join** (`agresso_contracts.projectLeadId → aus.carnet → su.email`) unioned with `pi_delegates`. No new role/permission (DD-B).
- **Controller:** `@ApiTags('PI Delegates')`, `@ApiBearerAuth`, `@UseGuards(RolesGuard)`, full Swagger, `ServerResponseDto`.
- **DTO:** `class-validator` — create needs `project_id`, delegate identity (email + names for provisioning; or existing `sec_user_id`).
- **Errors:** via `GlobalExceptions`; 403 when caller not PI/delegate/admin of the project; 409/idempotent on duplicate.

## 8. Design Decisions
| DD | Decision | Rationale | Rejected |
| --- | --- | --- | --- |
| **DD-A** | `isPi`: keep existing query, add conditional fallback (2 queries) | Existing query + tests untouched (NFR-PID-002); fallback runs only for non-PIs | Single combined `OR` query (risks changing existing behavior) |
| **DD-B** | CRUD auth = SYSTEM_ADMIN bypass **or** PI/delegate of project (reuse PI join, project-scoped) | No new role/permission (R-PID-007) | A new guard/role |
| **DD-C** | Delegate keyed by **project** (`agreement_id`), covers all its results | Mirrors how a PI applies to a whole project | Per-result rows (explosive, wrong granularity) |
| **DD-D** | Provision absent delegate via existing `createUserInSecUsers`, transactional, then associate | Reuse; never orphan (R-PID-005) | New user-creation logic |
| **DD-E** | Extend **both** `isPi` and `queryPrincipalInvestigator` | Client flag comes from the metadata query, not `isPi` — both needed for zero frontend change (OQ-A) | Only `isPi` (frontend wouldn't reflect delegate) |
| **DD-F** | Partial-unique via STORED generated column | MySQL has no filtered unique index (repo D-PI-9) | `UNIQUE … WHERE is_active` (invalid) |

**No frontend, no role** — both are explicit non-goals; `git diff` must touch neither.

## 9. Budget (tripwire)
| Metric | Estimate |
| --- | --- |
| Tasks | ~9 |
| LOC | ~700 (migration + entity + DTO + repo + service + controller + 2 query edits + tests) |
| Review rounds | ~2 |
| PRs | **1** (cohesive backend change; the two query edits ship with the table + CRUD + tests) |

---

## 10. Amendment v3 — bulk (many×many) design (2026-09-10)

> Implements R-PID-008/009/010. Reuses the v2 entity/repo/auth unchanged; changes the DTOs, service, and controller from single-item to bulk. The `pi_delegates` table is unchanged (sync = insert new rows + soft-delete removed rows; the unique-active generated key already makes re-grant safe).

### 10.1 DTOs (`dto/`)
- `BulkAssignPiDelegatesDto` — `{ project_ids: string[] (@ArrayNotEmpty, @IsString each), delegates: DelegateInputDto[] (@ArrayNotEmpty, @ValidateNested) }`. `DelegateInputDto` reuses the v2 union (`delegate_user_id?` **or** nested `{email, first_name, last_name}`) with the same reciprocal `@ValidateIf`.
- `BulkRevokePiDelegatesDto` — union of two shapes, validated so **exactly one** is provided: `{ pi_delegate_ids?: number[] }` **or** `{ project_ids?: string[], delegate_user_ids?: number[] }`. Cross-field `@ValidateIf` + a guard that at least one shape is complete.
- `DelegateInputDto` may carry an optional `carnet?` (resolved via `alliance_user_staff`, per OQ-D).

### 10.2 Repository (`pi-delegates.repository.ts`) — new methods
- `isPiOfProject(projectId, userId): Promise<boolean>` — **PI-only** check (the `agresso_contracts.projectLeadId → aus.carnet → su.email` half of `isPiOrActiveDelegateOfProject`, without the delegate branch). Used for R-PID-008.
- `listActiveDelegateUserIds(projectId, manager?): Promise<number[]>` — current active `delegate_user_id`s for a project (for the sync diff). Accepts an optional tx `manager`.
- `bulkCreate(pairs, manager)` / `bulkSoftDelete(pairs | ids, manager, userId)` — set-based insert/soft-delete through the tx manager (reuse `createDelegate`'s sec_user provisioning for new users).
- All bulk mutation runs inside **one** `dataSource.transaction` owned by the service.

### 10.3 Service (`pi-delegates.service.ts`)
- **`assign(dto)` (R-PID-009, sync):** in one `dataSource.transaction`:
  1. **Auth per project** (existing `assertCanManageProject`) for every `project_id` — fail-fast 403.
  2. Resolve/provision each delegate → `delegate_user_id` (provision new once, reuse across projects).
  3. **PI-exclusion (R-PID-008):** for every (project, delegate) pair, `isPiOfProject` must be false — else `BadRequestException` naming the pair, whole request aborted.
  4. For each project: `desired = resolved delegate ids`; `current = listActiveDelegateUserIds`; **create** `desired\current`, **revoke** `current\desired`, keep intersection.
  5. Commit; return per-project `{created, revoked, kept}`.
- **`bulkRevoke(dto)` (R-PID-010):** resolve target rows (by `pi_delegate_ids` or by `project_ids × delegate_user_ids`); auth on each row's `project_id`; soft-delete in one transaction. No sync.
- The v2 single `create`/`revoke` are **replaced** by these (list/verify unchanged).

### 10.4 Controller (`pi-delegates.controller.ts`)
- `POST /` → `@Body() BulkAssignPiDelegatesDto` → `service.assign` → `ResponseUtils.format` (200/207-style summary). Keep the `@UsePipes(ValidationPipe{whitelist,transform,forbidNonWhitelisted})`, no `@Roles`.
- `DELETE /` → `@Body() BulkRevokePiDelegatesDto` → `service.bulkRevoke`. (Drop the `:pi_delegate_id` path-param variant; ids now come in the body.)
- `GET /` list + `GET /verify` — unchanged.
- Full Swagger with the new payload examples.

### 10.5 Design decisions (v3)
| DD | Decision | Rationale |
| --- | --- | --- |
| **DD-G** | `POST` = per-project SYNC (declarative, revokes missing) | Product Model B; frontend sends the desired set |
| **DD-H** | `DELETE` = independent targeted bulk revoke (no sync) | Product needs a standalone delete for other flows |
| **DD-I** | Whole bulk op in ONE transaction, fail-fast on auth/PI-exclusion | Atomicity — no partial sync (NFR-PID-003 extended) |
| **DD-J** | PI-exclusion via `isPiOfProject` (PI-only half of the auth join) | R-PID-008; reuse the vetted PI chain |
| **DD-K** | Same `delegates` set applies to every `project_id` (cartesian) | Product-confirmed; per-project sets = future `assignments[]` shape |

### 10.6 Budget (v3 delta)
~5 tasks (bulk DTOs, repo methods, service sync+revoke, controller, tests) · ~450 LOC · ~2 review rounds. Correctness-critical (destructive sync + PI-auth path).
