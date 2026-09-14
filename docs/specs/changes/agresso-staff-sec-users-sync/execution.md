# Execution Log — Agresso Staff / Provision and restore platform accounts

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/agresso-staff-sec-users-sync` |
| Linked requirements | [`./requirements.md`](./requirements.md) |
| Linked design | [`./design.md`](./design.md) |
| Linked tasks | [`./tasks.md`](./tasks.md) |
| Judgment ledger | [`./judgment.md`](./judgment.md) — two lineages, five rounds, terminal APPROVED-with-caveat |
| Approval Mode | **gated** — the Leader pauses for the user after every task |
| Execution started | 2026-09-14 |
| Branch | `new-spec-auto-sync-sec-users` |
| Leader model | Opus 5 (T1) |
| Implementer model | `sonnet` (T2, via `.claude/agents/akili-implementer.md`) |
| Reviewer model | `opus` (T3, read-only, via `.claude/agents/akili-reviewer.md`) — `author != auditor` enforced by configuration |

### Budget tracking (`design.md` §14 — tripwire)

| Metric | Budgeted | Actual so far |
| --- | --- | --- |
| Tasks | 9 | 0 complete |
| LOC | ~1,580 | 0 |
| Review rounds | 5 (2 already spent in Judgment Day lineage 2) | 0 rework rounds spent |

### Standing environment facts for this run

| Fact | Consequence |
| --- | --- |
| **CodeGraph MCP server failed to start** (`ENOENT: codegraph not in PATH`) | No graph lookups available this run. Workers explore by file/grep. The root guide's CodeGraph line could not be exercised |
| `npm test` has `rootDir: src` | It **never** runs `test/fixtures/`. A green `npm test` is not evidence for any DB-level claim in this spec (KZ-017). T-09 owns the only tier that can evidence them |
| **OQ-8 pre-flight is still OWED** | `SELECT DISTINCT status FROM alliance_user_staff` was blocked on VPN 2026-09-14. This blocks *trusting a first Prod run*, not implementation |

---

## Task Execution History

<!-- Entries are appended below, newest last. Evidence is written BEFORE the task status is flipped. -->

### T-01 — `SecUserReconcilerRepository`: the read side

- **Date:** 2026-09-14
- **Requirements covered:** R-AGS-001, R-AGS-007, NFR-AGS-002
- **Status:** *in progress — see final verdict at the end of this entry*
- **Skills assigned:** `nestjs-expert`, `tdd` (attempt 1) → `nestjs-expert`, `systematic-debugging` (attempt 2)
  - *Deviation from the Skill Map, recorded:* `tdd` was added by the Leader for attempt 1 because the statement-count and parameterisation claims are precisely the class that passes green while being incapable of failing. For attempt 2 it was swapped for `systematic-debugging`: the finding is a type-vs-runtime mismatch that survived 3124 green tests, so the work is diagnosis, not test-first construction.
- **Effort:** attempt 1 `high` → attempt 2 `xhigh` (rework bump)

#### Attempt 1 — Reviewer verdict: **FAIL**

**Files changed:** `sec-user-reconciler.repository.ts` (new, 124 LOC), `sec-user-reconciler.repository.spec.ts` (new, 124 LOC), `agresso-staff-tools.module.ts` (modified, +3/-2 — provider/export wiring, authorized by the Leader since the class is otherwise not injectable).

**Implementer verification:** `npm test -- --silent` → 367 suites / 3124 tests passed. `npx eslint src/domain/tools/agresso/staff` → exit 0, no output.

**Implementer K-004 mutation log (all four judged sound by the Reviewer):**

| # | Mutation | Observed red |
| --- | --- | --- |
| 1 | Added `WHERE su.is_active = TRUE` to `findAllSecUsers` | `expect(sql).not.toMatch(/where/i)` failed |
| 2 | Replaced `this.chunk(uniqueIds, CHUNK)` with `[uniqueIds]` | `Expected: 2, Received: 1` (n=53); `Expected: 3, Received: 1` (n=127) |
| 3a | Removed the `assertNumericIds` call | 3 rejection tests failed — "Resolved to value: []" instead of rejecting |
| 3b | `idsChunk.map(() => '?')` → `idsChunk.map((id) => id)` | `placeholderCount` — `Expected: 3, Received: 0`. Note: `expect(params).toEqual(ids)` still passed, so only the placeholder assertion discriminates — the correct discrimination |

**Reviewer FAIL — Issue 1: the read shapes declare `is_active: boolean`, which this code path can never produce.**

- **Discovered Issue:** `sec_users.is_active` and `sec_user_roles.is_active` are `tinyint` (`src/db/baseline/baseline.sql:4472`, `:4447`). mysql2 parses `Types.TINY` via `parseLengthCodedIntNoBigCheck()` with no tinyint→boolean conversion (`node_modules/mysql2/lib/parsers/text_parser.js:25-30`); `orm.config.ts:58-61` sets no `typeCast`; and `Repository.query` → `manager.query` bypasses TypeORM's entity hydration (`Repository.js:295-297`). `findAllSecUsers` returns `this.query(...)` unmapped, so callers receive `0 | 1` behind a `boolean` type.
- **Violated Rule:** `design.md` §5.4 *Reactivate role* (the three disjoint branches — "(a) users already holding an **active** `role_id = 3` row → **no statement is issued**"), `design.md` §5.2 steps 4/7, `requirements.md` R-AGS-007 AC.3 and AC.7.
- **Why it matters beyond T-01:** T-02/T-04/T-06 would be type-blessed to write `row.is_active === true`, which is always false. Every user then falls into role branch **(c)** and receives an `INSERT` — the second active `role_id = 3` row that R-AGS-007 AC.3/AC.7 and NFR-AGS-001 exist to prevent. The only gate that would catch it is T-09, the last task.
- **Why no test caught it:** `mockResolvedValue([])` never returns a row, so the mapping is never exercised. The defect passed 3124 green tests — KZ-001 in its canonical form.
- **Reachability:** Reviewer verdict *"reachable, mechanism verified, not executed"* — it had no database.

**Leader adjudication:** accepted as a genuine spec-conformance failure, not an advisory. Remediation option 1 (normalize at the repository boundary) was made binding, because three downstream tasks branch on this field and the coercion belongs in the one place it can be written once. Attempt 2 was additionally instructed to verify the premise from source before fixing — a refuted premise is a correct outcome — and to sweep every other field in both read shapes for the same defect class.

#### Recorded gap — **carry to T-09, do not tick silently**

T-01's first done-check — *"A seeded inactive `sec_users` row is returned by the bulk read"* — is a **database** claim and is **NOT discharged by this diff**. The diff asserts the absence of a `WHERE` clause in the emitted SQL, which is the correct KZ-001 treatment of *that* property but only a proxy for this one. `design.md` §10 states plainly that DB behaviour is proven against a real database, never against emitted SQL, and that a green `npm test` is not evidence for any claim in §3 or §5. T-01's intended file list contains no fixture, so this check is satisfiable **only at T-09**.

Related KZ-017 note on the same test: `not.toMatch(/where/i)` cannot exclude a `JOIN`- or `LIMIT`-based restriction, only a `WHERE` predicate. Adequate against the mutation actually at risk; inadequate as proof of the requirement.

> **Forward pointer for the T-09 brief.** This gap must be copied into T-09's Implementer brief verbatim. A pointer filed here is not carried by having been filed.

#### ADVISORY (4R lenses, attempt 1) — recorded only; never gates, never becomes a task

- **RISK —** `extends Repository<SecUser>` with a target that is a DTO, not an `@Entity()`. No registered entity for `sec_users` exists anywhere (`user.entity.ts` carries only `@ApiProperty`; `orm.config.ts:19-24` entity globs do not cover `domain/complementary-entities/`). Every other `extends Repository<…>` in `src/domain/` passes a real entity. Verified safe for `.query()`, fatal for any of the ~40 inherited metadata-backed methods (`find`, `save`, `createQueryBuilder`), which throw `EntityMetadataNotFoundError` at runtime. T-03's writes land in this same class. Suggested (not mandated): a doc line on the class warning that metadata-backed methods are unavailable.
- **RELIABILITY —** `assertNumericIds` throws a raw `Error` where `server/.../src/CLAUDE.md` §6 asks for Nest exceptions. Not gated: this path is fire-and-forget (RSK-4) so nothing reaches a response. But the message interpolates rejected values verbatim (`got: DROP TABLE sec_user_roles`), echoing untrusted-shaped input into the log that `design.md` §9 designates the run's only feedback channel.
- **READABILITY —** `it('never issues one statement per member')` asserts `not.toHaveBeenCalledTimes(53)` immediately after a sibling asserts the count is exactly 2; it can only fail in a world the sibling already excludes. Separately, `expect((sql.match(/is_active/gi) ?? []).length).toBe(1)` couples the test to the exact SELECT list and will false-red the first time anyone aliases or re-orders a column — which T-03 touching this file makes likely.
- **READABILITY/KZ-017 —** the test titled *"lands every one of one user's role rows in a single chunk"* asserts only that 3 deduplicated ids produce 1 statement, where a single chunk is inevitable. It discriminates the **dedupe**, not chunk grouping. The property itself is structurally true (all chunk results concatenate into one flat array), so this is a title-vs-assertion mismatch, not a defect.

#### Attempt 2 — Reviewer verdict: **PASS**

**Files changed:** `sec-user-reconciler.repository.ts` (coercion in both read methods + JSDoc recording the mechanism), `sec-user-reconciler.repository.spec.ts` (+2 tests feeding rows *through* both methods). Nothing else touched.

**The fix:** `Boolean(row.is_active)` applied at the repository boundary in both `findAllSecUsers` and `findSecUserRolesByUserIds`, so the declared type is the returned value. Leader chose remediation option 1 (normalize here) over option 2 (re-declare as `0 | 1` and push coercion to consumers), because T-02, T-04 and T-06 all branch on this field and the coercion belongs in the one place it is written once.

**Premise verification — CONFIRMED, independently, twice.** The Implementer was instructed that a refuted premise would be a correct outcome. It confirmed instead, and the attempt-2 Reviewer then re-derived the whole chain from source rather than inheriting it:

| Link | Evidence |
| --- | --- |
| Column type | `baseline.sql:4442-4484` — both `is_active` columns are `` tinyint NOT NULL DEFAULT '1' `` |
| Driver parse | `mysql2/lib/parsers/text_parser.js`, `readCodeFor` — `case Types.TINY:` → `packet.parseLengthCodedIntNoBigCheck()`. No boolean conversion. The charset branch is unreachable for TINY (the type switch matches first), so a string `'0'` cannot be produced today |
| typeCast hook | Same file, `compile()` — honoured only under `typeof config.typeCast === 'function'` |
| Config | `orm.config.ts` — `bigNumberStrings: false`, `extra: { namedPlaceholders, charset }`, **no `typeCast`**. Grep of `typeorm/driver/mysql/` for `typeCast` returns nothing |
| Hydration bypass | `typeorm/repository/Repository.js:295-297` — `query()` delegates to `this.manager.query()` |

**No escape path:** both row-returning methods coerce; the inherited `Repository<SecUser>` surface (`find`, `findOne`) cannot leak a raw `0|1` because `SecUser` is an undecorated DTO, so `this.metadata` throws `EntityMetadataNotFoundError` rather than returning rows. Grep confirms the only references to the repository and its two methods are the class, its spec, and the module registration.

**Column-class sweep (mandated by the Leader, judged sound and complete by the Reviewer against `baseline.sql:4442-4484`):**

| Column group | DB type | Runtime value | Declared | Verdict |
| --- | --- | --- | --- | --- |
| `sec_user_id`, `status_id`, `created_by`, `updated_by`, `sec_user_role_id`, `user_id`, `role_id` | `bigint` | JS `number` (`supportBigNumbers` unset, `bigNumberStrings: false`) | `number` | Matches |
| `first_name`, `last_name`, `email`, `carnet` | `varchar` | `string` | `string` | Matches |
| `last_login_at`, `created_at`, `updated_at`, `deleted_at` | `timestamp` | `Date` / `null` (`dateStrings` unset) | `Date` | Matches |
| `is_active` (both tables) | `tinyint` | raw `0 \| 1` | `boolean` | **Mismatch — fixed** |

**The `null` vs `undefined` deferral was correct, for a stronger reason than the Implementer gave.** `server/researchindicators/tsconfig.json:15` sets `"strictNullChecks": false`, so `carnet?: string` makes no claim that the value cannot be `null` — the type system does not distinguish them, and there is no false declaration to correct. `is_active: boolean` carrying `0` is a lie under any strictness setting. Different defect class; leaving it alone was right.

**Regression check (the point of this round — three of Judgment Day round-1's fixes each introduced a new severe defect):** none found. The SQL of both statements is byte-identical to attempt 1, so R-AGS-001 AC.1 / J-4 and the column completeness are untouched. Re-assigning an existing key in a spread does not move it, so key order is preserved; all own enumerable keys survive; nothing becomes `undefined`-vs-absent. `is_active?: boolean` is declared on `AuditableEntity` (`domain/shared/global-dto/auditable.entity.ts:34-41`), which `SecUser` extends — so `Promise<SecUser[]>` is honest, not merely tolerated.

**Verification (final):**

| Command | Result |
| --- | --- |
| `npm test -- --silent` | `Test Suites: 367 passed, 367 total` / `Tests: 3126 passed, 3126 total` (3124 baseline + 2 new) |
| `npx eslint src/domain/tools/agresso/staff` | exit 0, no output (**bare** eslint — `npm run lint` carries `--fix` and cannot verify, K-001) |

**K-004 evidence for the new gate:** reverted both `.map(… Boolean(row.is_active))` calls to a bare pass-through. Verbatim red:

```
● SecUserReconcilerRepository › findAllSecUsers › coerces the raw tinyint is_active …
  expect(received).toBe(expected) // Object.is equality
  Expected: false
  Received: 0
● SecUserReconcilerRepository › findSecUserRolesByUserIds … › coerces the raw tinyint is_active … for sec_user_roles rows too
  Expected: false
  Received: 0
Test Suites: 1 failed, 1 total
Tests: 2 failed, 11 passed, 13 total
```

Reverted; 13/13 green. The Reviewer confirmed `mockResolvedValueOnce` correctly shadows the `beforeEach` `mockResolvedValue([])`, and that `toBe` rejects `0` where `toBeFalsy` would have passed — the defect wearing a green test.

#### ADVISORY (4R lenses, attempt 2) — recorded only; never gates, never becomes a task

- **RELIABILITY / KZ-017 —** the fix introduced a post-SQL transform, and only `is_active` is asserted over the *returned rows*; the column-completeness tests inspect the **SQL string**, not the result. Rewriting the map body as `(row) => ({ is_active: Boolean(row.is_active) })` would destroy every other column and **both new tests would still pass green**. One assertion closes it: `expect(result[0]).toEqual({ sec_user_id: 1, is_active: false })`. Reviewer could construct no runtime input that reaches it — a future-edit hazard, not a live defect.
- **RISK (dormant, unreachable today) —** `Boolean('0') === true`. If a `typeCast` or a string-returning driver option is ever added to `orm.config.ts`, the coercion inverts in the dangerous direction: an inactive role-3 row reads as active, branch (a) issues no statement, and a returning employee ends the run with **no role** (R-AGS-007 AC.3). `Number(row.is_active) === 1` would be immune. Unreachable without editing `orm.config.ts`, which today carries no `typeCast`; the JSDoc already records the dependency.
- **READABILITY —** the `sec_user_roles` coercion test sits inside `describe('findSecUserRolesByUserIds — statement count (NFR-AGS-002)')`, which it has nothing to do with. A future prune of that block takes the coercion guard with it.
- **READABILITY (citation precision) —** the interface JSDoc quotes `design.md §2.1/§3: "no new TypeORM entities"`, but that exact phrase is in `tasks.md` T-01, not `design.md`. The claim is true and those sections support it; only the quotation marks misattribute. Similarly, "the strict `=== true`/`=== false` branching in design.md §5.4" attributes a JS operator to a section that states branch *semantics*, not comparison form.

#### T-01 final verdict: **PASS** (2 Implementer attempts, 2 Reviewer rounds)

- **Requirements covered:** R-AGS-001 (partial — AC.1 proxied only, see gap), R-AGS-007 (read side that makes it reachable), NFR-AGS-002 (unit-tier statement count).
- **Decisions made:** no `ARI_MYSQL_NAME` schema prefix (majority convention: `app-secret.repository.ts` and 2 of 3 `sec_users` methods in `result.repository.ts` use bare names; only `createUserInSecUsers` prefixes — **flagged for T-03, which writes to the same tables and must match whatever is correct**); `CHUNK = 50`, exported, Implementer's choice within OQ-D4's "one module constant"; `extends Repository<SecUser>` with a DTO target, verified safe for `.query()` only.
- **Issues encountered:** one FAIL (tinyint→boolean), fixed in attempt 2.
- **Done-check status:** check 2 (exact statement count at n≥50 and n≥100) and check 3 (parameterised, numerically validated) are **discharged at the unit tier with observed reds**. Check 1 (a seeded inactive row is returned) is **NOT discharged** — it is a database claim, see the recorded gap above. It stays unticked and travels to T-09.
