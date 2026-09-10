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
- **RISK/Reliability:** FK **collation mismatch** is the most likely execution-time failure (MySQL errno 3780). `CREATE TABLE` has no explicit `CHARSET/COLLATE`, so the table inherits the schema default; confirm `project_id` (varchar 36) shares `agresso_contracts.agreement_id`'s collation during the human apply. Cannot be seen in the diff.
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
