# Execution Log — PI Delegates (v2 · relational, backend-only)

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/my-pi-delegates` |
| Spec id | 2026-09-my-pi-delegates |
| Approval mode | **gated** (Leader pauses for user go/no-go after each PASS) |
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
