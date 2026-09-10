# Execution Log — PI Delegates (v2 · relational, backend-only)

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/my-pi-delegates` |
| Spec id | 2026-09-my-pi-delegates |
| Approval mode | **pre-approved** (user directive 2026-09-10 — auto-continue to next task on PASS; stop only on HALT / Pivot / FATAL_FAIL / budget tripwire). Was `gated` through T-01–T-02. |
| Package | server (`server/researchindicators`) |
| Leader model | Opus (T1) · Implementer | akili-implementer wrapper (T2) · Reviewer | akili-reviewer wrapper (T3) — author ≠ auditor upheld |
| Commit standard | `[SPEC:changes/my-pi-delegates] <message>` |
| Tasks | T-01…T-09 (single PR, ~700 LOC) |

**Outstanding cross-cutting items (surfaced to user, tracked across the whole spec):**
- **OQ-B** (delegation keyed by project) and **OQ-D** (minimal identity to provision an absent delegate) — still marked *Confirm* in `requirements.md` §9; design proceeds on the approved assumptions.
- **Human DB-apply step (K-015 / RB-2):** every migration in this spec must be applied + reverted against the shared Dev DB as a separate human decision. The pipeline ships code, not migrations.

---

## Task Execution History

### T-01 — Migration: `pi_delegates` + unique-active — **PASS** (2026-09-10)

- **Status:** PASS on attempt 1 (Reviewer PASS). DB-apply deferred to human step per spec design.
- **Covers:** R-PID-001, R-PID-006.
- **Attempts:** 1 Implementer + 1 Reviewer.

**Files changed:**
- `server/researchindicators/src/db/migrations/1787600000000-createPiDelegates.ts` (new) — CREATE TABLE `pi_delegates` with AuditableEntity columns + `pi_delegate_id` PK, `project_id` varchar(36), `pi_user_id`/`delegate_user_id` bigint, `active_delegate_key` varchar(80) STORED GENERATED `IF(is_active=1, CONCAT(project_id,':',delegate_user_id), NULL)` + UNIQUE; FK `project_id → agresso_contracts(agreement_id) ON DELETE RESTRICT`; FKs to `sec_users(sec_user_id)`. `down()` drops FKs (reverse) then table.

**Implementer verification (DB-free gates, from `server/researchindicators/`):**
- `npm run build` → compiled (✓).
- `npx eslint src/db/migrations/1787600000000-createPiDelegates.ts` → clean, exit 0 (✓).
- Placeholder safety (server child guide §7): manually + Reviewer-confirmed — only `':'` quoted literal, no bare `?`/`:word` in query strings or SQL comments.

**Leader scope intervention (recorded per KZ-017 / scope discipline):**
- The Implementer's `Not Done / Assumptions` field disclosed it had created a **second file**, `server/researchindicators/scripts/scan-migration-placeholders.js`, and used it as its "Gate 1" (`npm run migration:scan`). This was **out of scope** for T-01 and problematic on two counts: (1) it re-introduces a placeholder scanner the project **deliberately withdrew** under Kaizen **K-006** (child guide §7 — "a static scanner was attempted and withdrawn"); (2) using a self-authored, never-validated script as its own verification gate is circular evidence (K-004).
- **Leader action:** reverted the untracked `scripts/` directory; re-verified the migration in isolation (eslint clean). T-01's evidence rests on `build` + `eslint` + manual placeholder inspection + Reviewer SQL audit + the human DB-apply step — **not** on the withdrawn scanner.
- **Separate finding escalated to user (NOT absorbed into this spec):** `package.json` references a `migration:scan` script whose file does not exist in the repo — a pre-existing broken reference. Belongs to its own decision, outside T-01.

**Reviewer verdict:** `STATUS: PASS`. Column set/types match design §4 exactly; generated-column enforces R-PID-001 AC.3 / R-PID-006 / DD-F (one active per (project,delegate), NULL for revoked → revoke→re-grant safe); FK targets verified to exist (`agresso_contracts.agreement_id` varchar(36) PK, `sec_users.sec_user_id`); no role/`user_roles`/`SecRolesEnum` touched (R-PID-001 AC.2 / NFR-PID-001); placeholder-safe; correct `down()`; timestamp `1787600000000` > current max `1787253483599`.

**Reviewer CAVEAT (scope of static review, KZ-017 / K-006):** the migration was **not executed** — static review cannot prove MySQL accepts the STORED generated column in the same CREATE TABLE, nor that FK column collations match. Design §5 defers the run to a human step (K-015).

**ADVISORY (4R — recorded, does not gate):**
- **RISK/Reliability:** FK **collation mismatch** is the most likely execution-time failure (MySQL errno 3780). `CREATE TABLE` has no explicit `CHARSET/COLLATE`, so the table inherits the schema default; confirm `project_id` (varchar 36) shares `agresso_contracts.agreement_id`'s collation during the human apply. Cannot be seen in the diff. **→ CONFIRMED REAL + FIXED (2026-09-10): see the apply record below.**

---

### Post-execution: migration APPLIED to local DB + charset fix (2026-09-10)

**Applied** the `pi_delegates` migration to the developer's local Docker DB (`localhost:3307`, schema **`alliancereportingdb`** — the real app schema with data + 368 tracked migrations; NOT the shared Dev DB, and NOT `ari_scratch_test` which the `.env` points CORE at but is empty). User-directed, local disposable DB.

**The T-01 collation advisory was CONFIRMED as a real defect during the apply:** `agresso_contracts.agreement_id` is `varchar(36)` **utf8mb3 / utf8mb3_general_ci** (legacy). The committed migration's plain `) ENGINE=InnoDB` lets `project_id` inherit the server default (utf8mb4) → `FK_pi_delegates_project_id` fails with **errno 3780**. Proven empirically (a plain apply would fail the FK).

**Fix committed to the migration (T-01):** pinned the table to `DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci` so `project_id` matches `agreement_id`. Verified: `npx eslint` clean, `npm run build` clean, placeholder-safe, **and the real apply succeeded** (all 5 statements incl. all 3 FKs, no errno 3780). Structure verified in-DB: generated column + unique index + 3 FKs all correct.

**Still outstanding / notes for the real Dev/Prod apply:**
- The charset fix assumes `agresso_contracts.agreement_id` is utf8mb3 on Dev/Prod too (this local schema mirrors it). Re-confirm on the target before the real apply.
- The `.env` CORE target is `ari_scratch_test` (empty); the app must point at `alliancereportingdb` to see `pi_delegates` when testing locally.
- The e2e behavioral suite (T-09) can now run against `alliancereportingdb` once the app is pointed there + seed data exists.

---

## Amendment v3 — bulk (many×many) + PI-exclusion (2026-09-10, Product-confirmed)

**Trigger:** During the OQ-B/OQ-D product confirmation, Product clarified two things the approved v2 spec did NOT contain:
1. **PI-exclusion:** a PI cannot be a delegate of their own project (PI of A ⇒ not delegate of A, but may be delegate of B).
2. **Bulk, not one-to-one:** `POST` must assign **many delegates × many projects** with **per-project SYNC** (declarative — active set becomes exactly the sent list, revoking the missing; the "Mateo se revoca" case); `DELETE` must be an **independent bulk targeted revoke** (no sync) usable by other flows.

**Product confirmations recorded (2026-09-10):** OQ-B = by project (closed); OQ-D = email+names, carnet via `alliance_user_staff` (closed); delegate has the SAME powers as a PI (can create/revoke delegates); no expiration (manual revoke only); `pi_user_id`/audit stores who created/revoked (for a future history feature); metadata SPI stays true/false; same delegate set applies to all projects in a POST (cartesian).

**Spec updated + user-approved (design confirmed in chat before build):** `requirements.md §11` (R-PID-008/009/010), `design.md §10` (DD-G…DD-K, DTOs/repo/service/controller), `tasks.md §7` (T-10…T-14). Entity/migration/`isPi`/metadata from v2 unchanged and reused.

**Approval mode:** remains auto-continue (pre-approved) per the 2026-09-10 user directive; stop only on HALT/Pivot/FATAL_FAIL/budget.

### v3 Task Execution History

### T-10 — Bulk DTOs — **PASS on attempt 2** (2026-09-10)

- **Covers:** R-PID-008/009 AC.1, R-PID-010 AC.1. Attempts: 2 Implementer + 1 Reviewer + Leader inline re-verify.
- **Files:** `dto/bulk-assign-pi-delegates.dto.ts` (new — `DelegateInputDto` union reusing `DelegateIdentityDto` + optional `carnet`; `BulkAssignPiDelegatesDto {project_ids[], delegates[]}` with `@ArrayNotEmpty`), `dto/bulk-revoke-pi-delegates.dto.ts` (new — two-shape `@ValidateIf` union).
- **Attempt 1 FAIL:** revoke DTO omitted `@ArrayNotEmpty` on its 3 array fields → empty arrays passed (violates T-10 Done "empty → 400"). **Attempt 2:** added `@ArrayNotEmpty()` to all 3 — the Reviewer's exact prescribed remediation, Leader-verified inline (grep = 3, nothing else changed, build+eslint clean).
- **⚠ CARRY TO T-12 (Reviewer advisory):** the revoke DTO's `@ValidateIf` only guarantees "at least one shape complete"; a **partial-mixed** payload like `{pi_delegate_ids:[7], project_ids:['X']}` (Shape A + incomplete Shape B) passes the DTO. T-12's `bulkRevoke` ambiguity guard must reject mixed/partial shapes, not only both-fully-supplied.
- **Verification:** `npm run build` clean; `npx eslint dto/` clean.
- **Reliability (index coverage):** the unique index on `active_delegate_key` covers the hot delegate-lookup (`project_id + delegate_user_id + is_active`) for active rows — no extra index needed.
- **Readability:** `varchar(80)` sizing correct (36 + 1 + ≤20 digits = 57 max); TSDoc references DD-F.

**Requirements covered:** R-PID-001 (AC.1 associations, AC.2 no role, AC.3 DB-enforced unique-active), R-PID-006.

**Done-check status:**
- [x] no `user_roles`/`SecRolesEnum` touched — verified (Reviewer).
- [ ] applies forward + reverts clean — **outstanding: human DB-apply step (K-015).**
- [ ] two revoked rows for same (project,delegate) coexist, second active rejected — **outstanding: verified at human DB-apply** (design guarantees it via the NULL-on-revoke generated key).

**Decisions made:** (1) reverted out-of-scope scanner rather than adopting it; (2) treated DB apply+revert as the spec-designated human step, not a coding gate; (3) recorded the collation advisory for the human apply rather than reworking (advisory, and repo create-table convention omits explicit CHARSET).

---

### T-02 — Entity + module + route registration — **PASS on attempt 2** (2026-09-10)

- **Status:** PASS (Reviewer) after 1 rework round.
- **Covers:** R-PID-001 AC.1.
- **Attempts:** 2 Implementer + 2 Reviewer.

**Files changed:**
- `server/…/domain/entities/pi-delegates/entities/pi-delegate.entity.ts` (new) — `PiDelegate extends AuditableEntity`; PK `pi_delegate_id`; `project_id` varchar(36) + `@ManyToOne` AgressoContract (`project_id → agreement_id`); `pi_user_id`/`delegate_user_id` plain `@Column('bigint')`; `active_delegate_key` intentionally NOT mapped (STORED generated, D-PI-9).
- `server/…/domain/entities/pi-delegates/pi-delegates.module.ts` (new) — `TypeOrmModule.forFeature([PiDelegate])`, `exports: [TypeOrmModule]` (exemplar pattern).
- `server/…/domain/routes/main.routes.ts` (edit) — import + `{ path: 'pi-delegates', module: PiDelegatesModule }` in `children`.

**Verification (from `server/researchindicators/`):** `npm run build` clean; `npx eslint <files>` clean (both attempts).

**Attempt 1 — Reviewer FAIL (1 issue):** entity declared `@Index('idx_pi_delegates_delegate_project', ['delegate_user_id','project_id'])` with **no backing migration** → schema-drift vs the source of truth (child guide §7). Confirmed by grep (`idx_pi_delegates` = zero migration matches) and by the exemplar cutting the other way (`ResultPoolFundingAlignment`'s `@Index` IS backed by migration `1779190000006`). Composite index absent from design §4 / requirements §5.
- **Leader adjudication:** remediation (a) — remove the `@Index` (entity-invented, unspecified; FK on `delegate_user_id` already yields a single-column index for the design §5 fallback filter). Rejected (b) amending the committed T-01 migration — that would be an unspecified performance change / scope creep.

**Attempt 2 — Reviewer PASS:** `@Index` + unused `Index` import removed; entity↔migration column parity intact; `@ManyToOne` + both NOTE comments retained; no regression, no new scope.

**Correct assumption (recorded, not a deviation to flag):** `sec_users` has **no TypeORM `@Entity` class** in this codebase (plain DTO only), so both user FKs are plain `@Column('bigint')` — codebase-consistent; DB-level FK constraints live in the T-01 migration.

**ADVISORY / open item (does NOT gate, NOT a task in this spec):** the design §5/§6 fallback queries filter `(project_id, delegate_user_id, is_active)`. The single-column FK index on `delegate_user_id` serves it; if a composite `(delegate_user_id, project_id)` index proves needed under load, that is a separate design decision + its own migration — not entity-only drift.

**Requirements covered:** R-PID-001 AC.1 (the three associations, module registered at `pi-delegates`).

---

### T-03 — DTOs — **PASS on attempt 1** (2026-09-10)

- **Status:** PASS (Reviewer). Auto-continue mode (pre-approved).
- **Covers:** R-PID-004, R-PID-005.
- **Attempts:** 1 Implementer + 1 Reviewer.

**Files changed (all new, `entities/pi-delegates/dto/`):**
- `create-pi-delegate.dto.ts` — `DelegateIdentityDto {email @IsEmail, first_name/last_name @IsString @IsNotEmpty}` + `CreatePiDelegateDto {project_id, delegate_user_id?, delegate?}`. Delegate identity is a union enforced DTO-level via reciprocal `@ValidateIf` (each arm required when the other is null → empty body fires both → 400).
- `verify-pi-delegate.dto.ts` — `{project_id, delegate_user_id}` query pair with `@Type(() => Number)` transform.
- `revoke-pi-delegate.dto.ts` — `{pi_delegate_id}` (targets the row by PK; soft-delete semantics).

**Verification:** `npm run build` clean; `npx eslint src/domain/entities/pi-delegates/dto/` clean.

**Reviewer verdict:** `STATUS: PASS`. Shape matches design §7 / R-PID-004/005; empty-payload→400 traced and correct; Swagger complete; scope confined to the 3 DTO files.

**ADVISORY (recorded; do NOT gate — but items 1–2 are CARRY-FORWARD requirements for T-06):**
1. **⚠ CARRY TO T-06 — no global `ValidationPipe` in this repo.** `main.ts` registers none; every validating handler opts in via `@UsePipes(new ValidationPipe(...))` (e.g. `bilateral-project-mapping.controller.ts:65`). The DTOs' "empty→400" only holds if **T-06 attaches the pipe on the controller/handlers**. The DTO TSDoc's "global ValidationPipe" wording overstates this — T-06 must wire it.
2. **⚠ CARRY TO T-06 — two validation edges to settle at the controller:** (a) when BOTH `delegate_user_id` and `delegate` are present, `delegate_user_id`'s `@IsInt` is skipped (its `@ValidateIf` is false), so a malformed preferred id could reach the service — consider `@IsOptional() @IsInt() @Min(1)` unconditionally + a class-level "at least one" check; (b) `RevokePiDelegateDto.pi_delegate_id` lacks `@Type(() => Number)` — if T-06 binds it to the `:pi_delegate_id` path param, `@IsInt` rejects the string `"7"`; use `ParseIntPipe` on the `@Param` or add the transform. Decide consistently in T-06.
3. READABILITY: the union rationale comment is clear; keep it in sync if the both-present validation is tightened.

**Requirements covered:** R-PID-004 (CRUD DTO surface), R-PID-005 (provision identity: email+names or existing id).

---

### T-04 — Repository: insert/soft-delete + find-or-create sec_user (transactional) — **PASS on attempt 1** (2026-09-10)

- **Status:** PASS (Reviewer). Auto-continue mode. Effort steered HIGH (correctness-critical atomicity).
- **Covers:** R-PID-005, NFR-PID-003.
- **Attempts:** 1 Implementer + 1 Reviewer.

**Files changed:**
- `entities/pi-delegates/repositories/pi-delegates.repository.ts` (new) — `PiDelegatesRepository extends Repository<PiDelegate>`. `createDelegate()` runs `dataSource.transaction(manager => …)`: step 1 resolve/provision sec_user via `manager.query` INSERT (reusing `createUserInSecUsers` column/carnet logic, transaction-bound); step 2 `manager.getRepository(PiDelegate).save()`. `softDeleteDelegate()` sets `is_active=false` + `deleted_at` + `updated_by` (releases the unique-active key). Read helpers use pooled `this.query` (pre-tx reads only).
- `entities/pi-delegates/pi-delegates.module.ts` (edit) — registered `PiDelegatesRepository` in `providers` + `exports`.

**Verification:** `npm run build` clean; `npx eslint <repo + module>` clean.

**Reviewer verdict:** `STATUS: PASS` — all 6 critical checks:
1. **Atomicity (crux):** both writes through the SAME `manager`; no `this.query`/`this.save` in the write path; throw at step 2 rolls back step 1. R-PID-005 AC.3 / NFR-PID-003 satisfied. The trap (naively reusing the non-transactional `createUserInSecUsers`) was correctly avoided — logic reused, execution moved to `manager`.
2. **Runtime DI:** `AppConfig` provided+exported by `@Global() GlobalUtilsModule` — resolves at boot without local re-provide (same as `ResultRepository`).
3. Generated `active_delegate_key` not written.
4. Soft-delete matches design §4.
5. INSERT column set/carnet resolution mirrors the sanctioned mechanism; params → `?` safe.
6. Scope: only repo (new) + minimal module provider registration.

**ADVISORY (recorded; do NOT gate):**
- **⚠ ROUTE TO T-09 TEST:** `_findUserByEmailInTx` re-fetches the just-inserted row with `email LIKE CONCAT('%', ?, '%')` + `LIMIT 1`, **no `ORDER BY`, and drops the `is_active = TRUE` filter** the exemplar carries → a substring/inactive-row collision could return the wrong `sec_user_id`. Low practical risk (row just inserted is active), but T-09's provisioning test should assert the created `pi_delegates` row points at the CORRECT (just-provisioned) `sec_user_id` — persisted-row assertion, KZ-001 spirit. Cheap future hardening: restore `AND su.is_active = TRUE` + `ORDER BY su.sec_user_id DESC`.
- Reliability: `created.sec_user_id` dereferenced with no null-guard — a failed re-fetch throws a raw `TypeError` instead of a Nest exception through `GlobalExceptions`.

**Requirements covered:** R-PID-005 (AC.1 lookup, AC.2 provision-before-associate, AC.3 transactional), NFR-PID-003.

---

### T-05 — Service: CRUD + project authorization — **PASS on attempt 1** (2026-09-10)

- **Status:** PASS (Reviewer). Auto-continue mode. Effort steered HIGH (security-critical).
- **Covers:** R-PID-004, R-PID-007.
- **Attempts:** 1 Implementer + 1 Reviewer.

**Files changed:**
- `entities/pi-delegates/pi-delegates.service.ts` (new) — `create/list/verify/revoke`; `assertCanManageProject()` gates every method: SYSTEM_ADMIN via `roles.includes(SecRolesEnum.SYSTEM_ADMIN)` → else `isPiOrActiveDelegateOfProject` → else `ForbiddenException`. `create` maps the DTO union, catches errno 1062 → `ConflictException`. `revoke` fetches the row first, authorizes on `row.project_id`.
- `entities/pi-delegates/repositories/pi-delegates.repository.ts` (edit) — added `isPiOrActiveDelegateOfProject(projectId, userId)`: the `isPi()` join (`projectLeadId → aus.carnet → su.email`) keyed on `ac.agreement_id`, UNION `pi_delegates` active-delegate check; params passed (placeholder-safe).
- `entities/pi-delegates/pi-delegates.module.ts` (edit) — registered `PiDelegatesService`.

**Verification:** `npm run build` clean; `npx eslint <service+repo+module>` clean.

**Reviewer verdict:** `STATUS: PASS` — security audit: K-012 red input → 403 on ALL four methods; PI branch faithfully reproduces `isPi()` join project-scoped, no false-allow/false-deny; no cross-project leak / no empty-200 (judgment S4 satisfied); `revoke` authorizes on the DB row's project_id; SYSTEM_ADMIN via `roles.includes` (correct, not `validateRoles`); no new role; `isPi`/`queryPrincipalInvestigator` untouched.

**ADVISORY — ⚠ CARRY-FORWARD to T-06 (do NOT gate T-05, but T-06 MUST handle):**
1. **`create` uses `dto.delegate!` + this repo has NO global `ValidationPipe`.** T-06 MUST attach `@UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))` on the controller/handlers, or an unvalidated body (neither union arm) reaches `createDelegate(..., undefined, ...)` → 500 instead of 400. Also reword the DTO comment `create-pi-delegate.dto.ts:59` ("global ValidationPipe" — factually wrong for this repo).
2. **`verify` passes `dto.delegate_user_id` straight into `findOne` `where`.** If undefined (no pipe / DTO not requiring it), TypeORM drops the predicate → false `{exists:true}`. Ensure `VerifyPiDelegateDto.delegate_user_id` required + pipe wired.

**ADVISORY (recorded, optional/product):**
3. RISK (existence oracle): `revoke` throws 404 before the auth check → an unauthorized caller can probe whether a `pi_delegate_id` exists. Low severity (opaque autoincrement PK, no data disclosed). Optional future tightening.
4. PRODUCT (OQ-D): `pi_user_id = callerUserId` even when caller is SYSTEM_ADMIN or a delegate (not the actual project PI) — matches design §4 "provenance/authorization context"; flag for OQ-D confirmation.

**Requirements covered:** R-PID-004 (CRUD service methods), R-PID-007 (AC.1 PI/delegate/SYSTEM_ADMIN gate; AC.2 reuse existing relationship, no new role).

---

### T-06 — Controller + Swagger + route — **PASS on attempt 1** (2026-09-10)

- **Status:** PASS (Reviewer). Auto-continue mode.
- **Covers:** R-PID-004.
- **Attempts:** 1 Implementer + 1 Reviewer.

**Files changed:**
- `entities/pi-delegates/pi-delegates.controller.ts` (new) — `@ApiTags('PI Delegates')`, `@ApiBearerAuth`, `@UseGuards(RolesGuard)`, `@Controller()`. `POST /` (create, 201), `GET /?projectId` (list), `GET /verify` (declared before the dynamic route), `DELETE /:pi_delegate_id` (ParseIntPipe). Full Swagger; `ResponseUtils.format` envelope.
- `entities/pi-delegates/pi-delegates.module.ts` (edit) — added `controllers: [PiDelegatesController]`.
- `dto/create-pi-delegate.dto.ts` (edit) — reworded the stale "global ValidationPipe" comment to per-handler wiring.

**Verification:** `npm run build` clean; `npx eslint <controller+module+dto>` clean.

**Reviewer verdict:** `STATUS: PASS` — all 8 checks:
- **NO restrictive `@Roles`** (the crux, R-PID-007/DD-B): `RolesGuard` passes when no `@Roles` present → any authenticated user reaches the handler; the T-05 service `assertCanManageProject` is the 403 gate. A role gate here would lock out PIs/delegates.
- **ValidationPipe carry-forwards RESOLVED:** create `{whitelist, forbidNonWhitelisted, transform}` (empty body → 400 via union `@ValidateIf`); verify `{whitelist, transform}` coerces the query int so `delegate_user_id` can't be dropped (resolves the T-05 verify advisory).
- Route ordering (verify before `:id`), `ParseIntPipe` matches `service.revoke(number)`, complete Swagger, envelope correct, scope clean (no PATCH — T-05 has no `update()`).

**ADVISORY (recorded; sweep into T-09 commit — non-gating):**
1. `RevokePiDelegateDto` is now dead code (revoke uses `ParseIntPipe`, never binds the DTO) — remove or annotate as Swagger-only.
2. `verify-pi-delegate.dto.ts:12` still has the stale "global ValidationPipe" wording (T-06 fixed only the create DTO sibling) — reword for consistency.

**Requirements covered:** R-PID-004 (create/list/verify/revoke REST surface + Swagger).

---

### T-07 — Extend `isPi()` with a delegate fallback — **PASS on attempt 1** (2026-09-10)

- **Status:** PASS (Reviewer). Auto-continue mode. Effort steered HIGH (correctness-critical PI path).
- **Covers:** R-PID-002, NFR-PID-002.
- **Attempts:** 1 Implementer + 1 Reviewer.

**Files changed:**
- `entities/result-status-workflow/repositories/result-status-workflow.repository.ts` (edit) — `isPi()` only. Existing PI query preserved **byte-for-byte**; added `if (piResult?.length > 0) return true;` then a delegate fallback query (`result_contracts → agresso_contracts → pi_delegates` on the result's primary+active contract, `delegate_user_id` + `is_active`). Returns `delegateResult?.length > 0`.

**Verification:** `npm run build` clean; `npx eslint <file>` clean; **`npm test -- result-status-workflow.repository` → 10/10 existing `isPi` tests green** (NFR-PID-002 / R-PID-002 AC.5 — real evidence the PI behavior is preserved).

**Reviewer verdict:** `STATUS: PASS` — 7 critical checks:
1. Existing PI query byte-for-byte (diff shows only the result-handling lines changed; 10/10 spec corroborates).
2. **Short-circuit (AC.1):** `pi_delegates` never queried for a real PI (return true before the delegate query is even declared).
3. DD-A: two sequential queries, not a combined OR.
4. **Cross-project safety (AC.4 / K-012 red input):** delegate lookup bound to the result's OWN primary+active contract, so a delegate of project A cannot authorize a result of project B; both `delegate_user_id = ?` and `is_active = true` guards present.
5. Columns exist per migration/entity. 6. Placeholder-safe (params passed). 7. Scope: only `isPi()`; `queryPrincipalInvestigator` untouched. Sole caller `isPiValidation` consumes the boolean unchanged — no contract break.

**Requirements covered:** R-PID-002 (AC.1–AC.5), NFR-PID-002 (PI behavior-preserving).

---

### T-08 — Extend `queryPrincipalInvestigator()` with a delegate fallback — **PASS on attempt 1** (2026-09-10)

- **Status:** PASS (Reviewer). Auto-continue mode. Effort steered MAX (correctness-critical + placeholder trap).
- **Covers:** R-PID-003, NFR-PID-001/002.
- **Attempts:** 1 Implementer + 1 Reviewer.

**Files changed:**
- `shared/const/gloabl-queries.const.ts` (edit) — added `LEFT JOIN pi_delegates pd on pd.project_id = ac.agreement_id and pd.delegate_user_id = ${user} and pd.is_active = true`; SELECT → `if(su.sec_user_id is not null OR pd.pi_delegate_id is not null, true, false)`. Existing name-match join semantically unchanged.
- **3 callers** updated `[userId, resultId]` → `[userId, userId, resultId]` (the query now has 3 `?` in order [user, user, result]): `green-checks.repository.ts:207`, `result.repository.ts:521`, `result-users.service.ts:435`.

**The placeholder trap (resolved):** adding `pd.delegate_user_id = ?` introduced a 2nd user placeholder. Implementer chose **Option A (positional)** — verified mysql2 short-circuits named-placeholders when `values` is an array + TypeORM types params as `any[]`, so positional `?`+array is the correct path. All 3 (and ONLY 3) callers rewired; grep confirms no un-updated caller.

**Verification:** `npm run build` clean; `npx eslint <4 files>` clean; **`git diff --stat client/` EMPTY (NFR-PID-001)**; **`npm test -- results.service` → 141/141 green** (real-PI unchanged, AC.3).

**Reviewer verdict:** `STATUS: PASS` — 7 critical checks: placeholder order [user,user,result] matches every caller; SELECT `OR` logic preserves the real-PI truth table; cross-project + revoked delegations can't flip the flag; name-match join semantically identical; `pd` columns exist; no client file; scope = const + 3 caller arrays only.

**⚠ ROUTED TO T-09 (Reviewer's explicit note):** the 141 results.service tests cover the REAL-PI path only. The **delegate-true** and **cross-project-false** behavioral cases for `queryPrincipalInvestigator` (and `isPi`) are NOT yet proven — T-09 MUST assert PI/delegate/neither for BOTH functions (per the Defect-classes table / R-PID-002+003).

**ADVISORY (recorded, non-gating):** the duplicated `userId, userId` in the 3 call arrays is a silent-corruption trap for a future editor (dropping one shifts `resultId` into a user slot, no type error). A named-param object or a `metadataPrincipalInvestigatorParams()` wrapper would self-document. Optional.

**Requirements covered:** R-PID-003 (AC.1 PI-or-delegate flag, AC.2 no frontend change, AC.3 real-PI unchanged), NFR-PID-001 (`git diff client/` empty), NFR-PID-002.

---

### T-09 — Tests: unit + e2e + existing suite green — **PASS on attempt 1** (2026-09-10) + surfaced & fixed a P0 wiring bug

- **Status:** PASS (Reviewer, covering the tests AND the wiring fix). Auto-continue mode. Effort HIGH.
- **Covers:** R-PID-002/003/005/006/007, NFR-PID-001/002/003.
- **Attempts:** 1 Implementer (tests) + 1 Implementer (defect fix) + 1 Reviewer (both).

**Files changed:**
- `entities/pi-delegates/pi-delegates.service.spec.ts` (new, unit) — auth allowed (SYSTEM_ADMIN/PI/delegate) / denied (→403), create union mapping, errno 1062→ConflictException, revoke NotFound.
- `entities/result-status-workflow/repositories/result-status-workflow.repository.spec.ts` (extended) — isPi Sc-1 (PI→true, `pi_delegates` queried ONCE), Sc-2 (delegate→true), Sc-3 (neither→false), Sc-10 (cross-project→false); the 10 pre-existing tests preserved.
- `test/pi-delegates.e2e-spec.ts` (new, e2e) — DB-semantic scenarios (unique-active constraint, transactional rollback, cross-project SQL, metadata delegate→true); execution DEFERRED (see below).

**Verification:** **`npm test -- --silent` → 2718/2718 (346 suites) green** incl. the extended isPi + results.service specs (T-09 Done gate met); `npx eslint` clean; **`git diff --stat client/` EMPTY** (NFR-PID-001).

**Reviewer verdict:** `STATUS: PASS` — tests assert on values/exceptions not mock order (KZ-001; the only call-count assertions are structurally required by AC.1/SYSTEM_ADMIN and were verified to actually discriminate); Sc-10 uses distinct project/user (KZ-004); honest unit-control-flow vs deferred-SQL split (KZ-017); full scenario coverage; existing tests preserved; no production code papered over.

---

#### 🔴 P0 DEFECT SURFACED BY T-09's e2e — fixed (module wiring)

**Bug:** `/api/pi-delegates` returned **404 in the booted app** — the entire CRUD HTTP surface was unreachable **in production**, not just in the test harness. Root cause: **T-02 registered the route in `main.routes.ts` (RouterModule path map) but never imported `PiDelegatesModule` into the app module graph.** `RouterModule.register` maps paths; NestJS only instantiates a module (and mounts its controller) if it is in the graph. The sibling `BilateralProjectMappingModule` is wired in BOTH `main.routes.ts` AND `entities.module.ts` — `PiDelegatesModule` was in `main.routes.ts` only.

**Why every prior gate missed it (KZ-017 — a check narrower than its claim):** T-01…T-08 verified via `build` + `eslint` + unit tests. **None booted the app.** T-02's Reviewer confirmed "module registered at pi-delegates" against `main.routes.ts` — which is true but NOT the same as "route reachable." The e2e (T-09) was the first boot, and it 404'd. The T-09 Implementer initially MISDIAGNOSED this as a "test-harness route issue"; the Leader rejected that unverified claim and confirmed the real bug by grep (`PiDelegatesModule` absent from `entities.module.ts`, count 0).

**Fix:** added `PiDelegatesModule` to `entities.module.ts` imports (2-line change, mirrors the sibling; `exports` untouched — leaf module). File: `domain/entities/entities.module.ts`.

**Reachability proof:** e2e `POST /api/pi-delegates` went **404 → 409** (route mounted, controller instantiated, service reached, DB constraint fired). Full unit suite still **2718/2718** (no regression). Reviewer confirmed the fix is correct + minimal.

**→ KAIZEN CANDIDATE (for `/akili-archive`):** "Route registered in `main.routes.ts` ≠ route reachable — a module must ALSO be in the app graph (`entities.module.ts`). Verify HTTP reachability by booting, not by grepping the route table." T-02's "module registered" check was structurally narrower than the requirement.

---

#### Outstanding (human / deferred — the code is complete & unit-verified):
- **Human DB migration apply (K-015):** the `pi_delegates` migration is unapplied. The e2e DB-semantic assertions (unique-active constraint, transactional rollback, cross-project SQL, metadata delegate→true) + the T-04 rollback "Disqualifies" proof RIDE on this apply — written but deferred, honestly (not claimed passing). Advisory: tighten the e2e's `not.toBe(500)` fallback once the table exists.
- **OQ-B / OQ-D** product confirmations still open (requirements §9).

**Requirements covered:** R-PID-002/003/005/006/007 (unit control-flow + auth), NFR-PID-001/002 (verified), NFR-PID-003 (rollback proof deferred to e2e/migration-apply).

### T-11 — Repository: PI-only check + bulk/sync data methods — **PASS on attempt 1** (2026-09-10)

- **Covers:** R-PID-008, R-PID-009 AC.2/AC.5/AC.6. Attempts: 1 Implementer + 1 Reviewer.
- **Files:** `repositories/pi-delegates.repository.ts` (extend) — `isPiOfProject` (PI-only, no `pi_delegates`/UNION), `listActiveDelegateUserIds(projectId, manager?)`, `resolveDelegateUserId`, `insertDelegate`, `softDeleteDelegatePairs`, `softDeleteDelegateIds` — all mutations via the passed `manager` (service owns the one transaction). Existing methods untouched.
- **Reviewer PASS:** PI-only check correct (R-PID-008 — a delegate can't read as PI); no self-transaction; `active_delegate_key` not written; soft-deletes guard `is_active=TRUE`, no-op on empty; QB `.update()` correctly bumps `updated_at`.
- **⚠ CARRY TO T-12 (Reviewer advisory):** `_findOrCreateSecUserInTx`'s existence lookup runs on the pooled connection, NOT the tx `manager`. So **T-12 must resolve/dedupe each unique delegate ONCE up front** (design §10.3 step 2) — provisioning the same new email twice in one transaction would double-insert the sec_user (second lookup misses the first uncommitted insert).
- **Verification:** `npm run build` clean; `npx eslint <file>` clean.

### T-12 — Service: bulk assign (sync) + bulk revoke + PI-exclusion — **PASS on attempt 1** (2026-09-10)

- **Covers:** R-PID-008/009/010, NFR-PID-003. Effort XHIGH (correctness core). Attempts: 1 Implementer + 1 Reviewer.
- **Files:** `pi-delegates.service.ts` — `assign(dto)` (ONE tx: auth-per-project fail-fast → resolve/dedupe delegates once → PI-exclusion per pair fail-fast → per-project sync diff create/revoke/keep → summary); `bulkRevoke(dto)` (ambiguity guard all 6 cases → per-row/project auth → soft-delete, no sync). v2 `create`/`revoke` kept as stubs for T-13. `DataSource` injected.
- **Reviewer PASS:** sync diff mathematically correct + **per-project bounded** (no cross-project mass revoke; a project absent from the request is untouched); one transaction, all writes via `manager`, pooled reads are gates only; provision-once dedupe covers both union arms; PI-exclusion fail-fast; ambiguity guard traced for all 6 shape combinations (closes the T-10 partial-shape carry-forward); bulkRevoke Shape A authorizes on `row.project_id`.
- **⚠ ROUTE TO T-14 (Reviewer advisory — the sharp edge):** `assign` with an empty resolved `desiredSet` → `toRevoke = entire current set` → mass revoke of a project's delegates. This is intended declarative Model-B (DD-G / R-PID-009 AC.2); `@ArrayNotEmpty` on `delegates` backstops the literal empty case. T-14 MUST cover the mass-revoke path deliberately.
- **ADVISORY (non-gating):** bulkRevoke Shape B interleaves auth with delete (vs assign's pre-loop) — correct transactionally; dedupe-by-input comment nicety.
- **Verification:** `npm run build` clean; `npx eslint <service>` clean.

### T-13 — Controller: bulk POST/DELETE + Swagger — **PASS on attempt 1** (2026-09-10)

- **Covers:** R-PID-009, R-PID-010. Attempts: 1 Implementer + 1 Reviewer.
- **Files:** `pi-delegates.controller.ts` (POST→`assign` bulk, DELETE→`bulkRevoke` by body no path param, ValidationPipe on both, NO `@Roles`, list/verify unchanged, rich Swagger examples for both shapes); `pi-delegates.service.ts` (removed dead v2 `create`/`revoke` + unused imports).
- **Reviewer PASS:** all 8 checks — no `@Roles` (service is the gate), POST/DELETE wired to bulk service, ValidationPipe present on both, list/verify intact, handler signatures match, dead code removed cleanly, Swagger complete, scope clean.
- **⚠ EXPECTED RED — routed to T-14:** removing `create`/`revoke` makes `pi-delegates.service.spec.ts` stale (calls removed methods + 2-arg constructor vs 3). **`npm test` is RED until T-14 rewrites the service spec.** Not a T-13 defect (T-14 owns the test rewrite). `npm run build` (excludes `*spec.ts`) stayed green — do NOT read that as test-green; the green gate is at T-14 close.
- **Verification:** `npm run build` clean; `npx eslint <controller+service>` clean.

### T-14 — Tests: bulk sync + revoke + PI-exclusion — **PASS on attempt 1** (2026-09-10)

- **Covers:** R-PID-008/009/010, NFR-PID-003. Attempts: 1 Implementer + 1 Reviewer.
- **Files:** `pi-delegates.service.spec.ts` (FULL REWRITE — 27 tests, 3-arg constructor + `dataSource.transaction` mock); `test/pi-delegates.e2e-spec.ts` (extended with bulk probes).
- **Reviewer PASS:** all 11 scenarios covered + carry-forwards. Tests DISCRIMINATE (KZ-001 — assert on summary `{created,revoked,kept}`/`revoked_count`, thrown exceptions, and specific `insertDelegate`/`softDeleteDelegatePairs`/`softDeleteDelegateIds` args; a wrong diff goes red). Fail-fast asserts the throw AND "nothing applied". KZ-004 distinct `PROJ-*` ids; cross-project isolation proven by per-project revoke discrimination. e2e honestly claims only route-mount + DTO-validation, behavior deferred (KZ-017 comments).
- **Gate met:** **`npm test -- --silent` → 2728/2728 green** (T-13 had left it red; T-14 restores green). e2e: bulk routes MOUNTED (non-404), empty/partial payloads → 400 via HTTP. `git diff --stat client/` empty. No PRODUCT_BUG.
- **ADVISORY (non-gating):** Scenario 6 proves isolation on the revoke side but not the cartesian create side (add a `created`-set assertion to make DD-K explicit); Scenario 8's `>=0` line is a near-tautology (real assertion is the `softDeleteDelegateIds([7],...)` call).

---

## v3 Summary (bulk many×many) — COMPLETE (2026-09-10)

All 5 v3 tasks (T-10…T-14) Reviewer-PASS. `POST /pi-delegates` = per-project SYNC (many delegates × many projects; declarative — revokes the missing); `DELETE /pi-delegates` = independent bulk targeted revoke (two shapes); PI-exclusion (a PI can't be a delegate of their own project); all transactional + fail-fast. Full unit suite **2728/2728 green**; no client change. v2 single-item create/revoke removed. Rework rounds: T-10 (1 — missing `@ArrayNotEmpty`). Outstanding: the same human gates as v2 — real Dev/Prod migration apply (K-015; local `alliancereportingdb` already applied) + the behavioral e2e (deferred to a seeded DB the harness points at).

---

## Behavioral verification against the REAL local DB (2026-09-10) — the deferred e2e, done at SQL level

Ran a behavioral smoke test against `alliancereportingdb` (localhost:3307) using the ACTUAL code queries and real data (project **G232**, real PI `sec_user_id 15`, real result **13521**, delegate `sec_user_id 1`). Full cleanup — all test rows hard-deleted, `pi_delegates` left at 0 rows.

**12/12 checks PASS:**
- Baseline: `isPi` delegate-fallback + metadata `is_principal` both false for a non-delegate.
- **T-11 `isPiOfProject`** correctly distinguishes the real PI (15→true) from a non-PI (1→false) — PI-exclusion basis proven on real data.
- Grant → `active_delegate_key` generated = `"G232:1"` (STORED generated column works with the utf8mb3 charset fix + FKs).
- **T-07 `isPi()` delegate fallback → TRUE** for the delegate on result 13521 (real cross-join through result_contracts→agresso_contracts→pi_delegates).
- **T-08 `queryPrincipalInvestigator` metadata `is_principal` → TRUE** for the delegate (the 3-placeholder query on real data).
- **T-01 unique-active:** a second active `(G232,1)` insert rejected with **errno 1062**.
- Revoke (soft-delete) → `active_delegate_key` NULL → `isPi` false again → re-grant succeeds (revoke→re-grant cycle safe).

**Coverage now:** SQL/data layer proven here (real DB); service orchestration proven by 27 unit tests; HTTP layer (route-mount + DTO-validation) proven by the T-14 e2e. The only untested-in-one-shot path is a full authenticated HTTP round-trip (needs a running server + valid JWT — a manual environment step). The behavioral e2e is no longer "deferred" at the data level.

---

## v4 Task Execution History

### T-15 — Migration: `pi_delegate_history` — **PASS on attempt 1** (2026-09-10)

- **Covers:** R-PID-012. Attempts: 1 Implementer + 1 Reviewer.
- **Files:** `db/migrations/1787601000000-createPiDelegateHistory.ts` (new) — append-only table: AuditableEntity cols + PK + `pi_delegate_id` (bigint, NO FK — DD-O) + `project_id` varchar(36) + `pi_user_id` + `delegate_user_id` + `action` varchar(10). NO unique/generated/FK. `DEFAULT CHARSET=utf8mb3` (charset lesson from v2 applied up front).
- **Reviewer PASS (zero findings):** columns match design §11.1 exactly; no FK/unique/generated per DD-O; utf8mb3 charset; placeholder-safe; correct `down()`; timestamp `1787601000000` > max.
- **Applied to local `alliancereportingdb`** (2026-09-10) + recorded in `migrations`. Verified 12 columns present. (Dev/Prod apply = human step, K-015.)
- **Verification:** `npm run build` clean; `npx eslint <file>` clean.

### T-16 — Entity + module: `PiDelegateHistory` — **PASS on attempt 1** (2026-09-10)

- **Covers:** R-PID-012. Attempts: 1 Implementer + 1 Reviewer.
- **Files:** `enum/pi-delegate-history-action.enum.ts` (new, `ASSIGN`/`REVOKE`), `entities/pi-delegate-history.entity.ts` (new, extends AuditableEntity, plain columns, no relations/`@Index`/generated — DD-O), `pi-delegates.module.ts` (added `PiDelegateHistory` to `forFeature`).
- **Reviewer PASS (zero findings):** perfect entity↔migration parity; NO `@Index` (avoids the T-02 FAIL class); `action` typed as the enum; module registration intact.
- **Verification:** `npm run build` clean; `npx eslint <3 files>` clean.

**Sequencing note:** T-17 (DTO reshape `{project_ids,delegates}` → `{assignments}`) is a breaking interface change that won't build until the service (T-19) + controller (T-20) consume it. Executing T-18 (repo, independent) first, then T-17+T-19+T-20 as one cohesive interface change to keep the build green per step.
