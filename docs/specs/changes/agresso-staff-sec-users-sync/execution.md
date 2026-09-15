# Execution Log — Agresso Staff / Provision and restore platform accounts

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/agresso-staff-sec-users-sync` |
| Linked requirements | [`./requirements.md`](./requirements.md) |
| Linked design | [`./design.md`](./design.md) |
| Linked tasks | [`./tasks.md`](./tasks.md) |
| Judgment ledger | [`./judgment.md`](./judgment.md) — two lineages, five rounds, terminal APPROVED-with-caveat |
| Approval Mode | **gated** → **pre-approved from T-08 onward** (user ruling 2026-09-15: *"sigue solo para cuando se acaben los tokens o un fatal_fail"*). Routine task gates auto-pass; a **HALT**, a **Pivot**, a **budget tripwire** or a **`FATAL_FAIL`** still stops for the user — pre-approval covers routine progress, never the cases whose content nobody could know in advance |
| Execution started | 2026-09-14 |
| Branch | `new-spec-auto-sync-sec-users` |
| Leader model | Opus 5 (T1) |
| Implementer model | `sonnet` (T2, via `.claude/agents/akili-implementer.md`) |
| Reviewer model | `opus` (T3, read-only, via `.claude/agents/akili-reviewer.md`) — `author != auditor` enforced by configuration |

### Budget tracking (`design.md` §14 — tripwire)

| Metric | Budgeted | Actual so far |
| --- | --- | --- |
| Tasks | 9 | **3 complete** (T-01, T-02, T-03) |
| LOC | ~~~1,580~~ → **~3,000** (re-baselined 2026-09-15, user-approved at the T-03 gate) | **1,385** — impl 580, tests 805 |
| Review rounds | 5 (2 already spent in Judgment Day lineage 2) | 1 rework round spent (T-01 attempt 2) |

> **Budget tripwire fired at the T-03 gate and was escalated, not absorbed.** At 1,385 of ~1,580 LOC
> with 6 of 9 tasks open, T-04 would have crossed it. Execution stopped and put the delta to the user,
> per `/akili-execute` §2.4. **Ruling: the estimate was wrong, not the work** — implementation came in
> *under* estimate (580 vs ~740) and the entire overrun is test code (805 vs a ~320 line that assumed
> a conventional unit tier, against a spec carrying 30 mandated gates each of which must be observed
> failing). Re-baselined to ~3,000 LOC; tasks and review rounds unchanged. Recorded in `design.md` §14
> as baseline 4.

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

---

### T-02 — `SecUserReconcilerService`: validate → index → collapse → match → classify

- **Date:** 2026-09-15
- **Requirements covered:** R-AGS-001, R-AGS-003
- **Skills assigned:** `nestjs-expert`, `tdd` (no deviation from the Skill Map; `tdd` added by the Leader because this task is pure decision logic with the repository mocked — algorithm, ordering and classification, the shape red-green actually pays for)
- **Effort:** `xhigh` from the first attempt, not `medium`. Justification: `tasks.md` §0 precondition 3 states that **every severe finding across five review rounds lived in `design.md` §5.2 or §5.4**, and §5.2 is this task's entire specification.
- **Status:** *in progress*

#### Leader observation, recorded before dispatch — a cosmetic defect in `design.md` §5.2

The step table in §5.2 contains **literal duplicate rows**. It numbers `1, 2, 3, 4` and then restarts `3, 4, 5, 6, 7`:

| Printed # | Rule | Duplicate of |
| --- | --- | --- |
| 3 | Candidate set empty → **create** | — |
| 4 | Candidate set contains an **active** row → **refresh** | — |
| 5 | Candidate set empty → **create** | identical to row 3 |
| 6 | Candidate set contains an **active** row → **refresh** | identical to row 4 |
| 7 | Candidate set non-empty and **entirely inactive** → **reactivate exactly one** | — |

**This is a documentation artifact from the spec's split/merge history, not two different rules.** The effective logic after the lookup is unambiguously three outcomes: empty → create; any active → refresh; non-empty and all-inactive → reactivate.

**Not treated as a Pivot.** A pivot requires evidence that the spec is *wrong or unviable*; this is redundant presentation of a rule stated identically in both copies, and §5.3's classification table, R-AGS-001, R-AGS-003 AC.5 and R-AGS-007's Details all agree with that reading. No behaviour is ambiguous.

**Carried into the Implementer brief** with the three effective outcomes named explicitly, plus an instruction to **stop and report rather than guess** if it concludes the duplication hides a semantic difference the Leader missed — that determination is the Leader's, not the worker's.

**Recommended for `/akili-archive`:** fold the duplicate rows out of §5.2 when this spec is archived. It costs nothing now and misleads the next reader. Filed here rather than edited in place, because editing an approved spec mid-execution outside the Pivot Protocol is exactly the drift the protocol exists to prevent. Note also that §5.2's prose says *"Step 4 dominates step 5"* while the same rule is described in `tasks.md` T-06 as *"Step 4 dominates step 7"* — the renumbering is a consequence of the same duplication, and both phrasings point at the identical rule (an active match wins over an inactive one).

#### Attempt 1 — Reviewer verdict: **PASS**

**Files changed:** `sec-user-reconciler.service.ts` (new, 242 LOC), `sec-user-reconciler.service.spec.ts` (new, 459 LOC, 19 tests). Nothing else.

**Verification (Implementer, then re-measured by the Leader with no worker active):**

| Command | Result |
| --- | --- |
| `npm test -- --silent` | `Test Suites: 368 passed` / `Tests: 3145 passed` — exactly +1 suite and +19 tests over T-01's 367/3126 |
| `npx eslint src/domain/tools/agresso/staff` | exit 0 (bare — K-001) |

*(The Implementer's first eslint pass surfaced 34 `prettier/prettier` formatting errors and nothing else; it fixed them with `npx prettier --write` and re-verified with bare eslint. Per the root guide, a formatter produces a file and measures nothing, so it cannot contaminate the evidence — worker may fix, Leader verifies, no single command does both.)*

**Classification shape produced** — `reconcile(staffMembers): Promise<ReconciliationResult>` with five sets: `skipped` (`{staffMember, reason: 'UNUSABLE_EMAIL' | 'CARNET_TOO_LONG'}`), `collapsed` (`{emailKey, winnerCarnet, loserCarnet}`), `create`, `refresh`, `reactivate`. `refresh`/`reactivate` share the `MatchedTarget` shape (`{staffMember, secUser, ambiguousCandidateIds}`) — **the write tasks tell them apart by which array an item came from, never by re-inspecting `secUser.is_active`.** `ambiguousCandidateIds` carries every candidate id including the winner, and only when the set had more than one row.

**K-004 mutation log — 7 gates, each broken, observed red, reverted:**

| # | Gate | Mutation | Observed red |
| --- | --- | --- | --- |
| 1 | DD-6 exact match | `index.get(key)` → substring scan emulating `LIKE '%…%'` | `Expected length: 0 / Received length: 1` — `susana@` resolved against `ana@`'s account |
| 2 | N-3 validate-before-collapse | collapse over raw `staffMembers` first, validate second | `Expected length: 2 / Received length: 1` — a null-email member vanished into a collapse instead of `skipped` |
| 3a | N-2 first-arrival (lexicographic) | winner by string `<` on `resourceId` | carnets `'90'`/`'10'` chosen so lexicographic- and numeric-lowest **both** disagree with first-arrival → `create` returned `'10'` |
| 3b | N-2 first-arrival (numeric) | winner by `Number(...) <` | same test, same red |
| 4 | Tie-break rule 3 (lowest id) | rule 3 → `return 0` | `Expected: 15 / Received: 30` |
| 5 | Tie-break rule 2 (`last_login_at`) | rule 2 deleted | chose id 10 (null login, lower id) over id 20 (recent login) |
| 6 | Tie-break rule 1 (active first) | rule 1 deleted | `refresh` empty on a case where rules 2 **and** 3 both point at the inactive row |
| 7 | All-inactive → reactivate | candidate set filtered to `is_active` before the emptiness check — the literal J-4 defect | `reactivate` empty; the member fell into `create` |

**The Implementer self-detected two of its own gates as non-discriminating and replaced them** — the behaviour KZ-014 exists to produce, reported rather than hidden:

- **Gate 6:** the first "step 4 dominates" fixture passed *even with rule 1 deleted*, because the active row incidentally held the lower `sec_user_id` and rule 3 rescued the answer by coincidence. Replaced with an adversarial fixture (active `id 50`/null-login vs inactive `id 10`/recent-login) where rule 1 is the **only** rule that can produce the right answer.
- **Gate 3:** the first N-2 fixture (`'10'` vs `'9'`) discriminated only the numeric mutation, since `'10' < '9'` is coincidentally true lexicographically too. Replaced with `'90'`/`'10'`, which defeats both orderings at once.

**Reviewer's independent proofs (not taken on trust):**

- **`chosen.is_active` is a sound proxy for "the candidate set contains an active row"**, proven by induction on `chooseCandidate`'s seedless `reduce`: rule 1 dominates, so the first active candidate always becomes `best` and `best` never regresses to inactive. Therefore mixed → refresh (inactive sibling untouched, R-AGS-001's shared-email scenario), all-inactive → reactivate exactly one (R-AGS-007 AC.1/AC.2, M-3).
- **The tie-break is a genuine total order** on every value T-01 can produce: reflexive; the comparison is on `getTime()` **numbers**, not `Date` objects, so two distinct `Date` instances at the same instant correctly fall through to rule 3 — had the guard been written `a.last_login_at !== b.last_login_at`, the "lowest `sec_user_id`" test would red. Null is a correct total extension (sorts last), and rule 3 on a primary key makes `compare` return `0` only for the same row.

#### Leader adjudication — the `design.md` collapse-rule contradiction is RESOLVED as stale text

I put a suspected contradiction to the Reviewer rather than deciding it alone. Three sites in `design.md` describe the collapse winner **two incompatible ways**:

| Site | Text | Verdict |
| --- | --- | --- |
| §2.1 flow diagram | `winner chosen AGAINST the index, not blind (DD-14, M-4)` | **STALE** |
| §5.2 paragraph | *"the collapse must see the index, because the stored `carnet` of the matched row is the only signal that says which payload member is the right one (N-2)"* | **STALE** |
| §12 **DD-14** | *"Lowest `carnet` wins"* | **STALE** — the pre-ruling formulation verbatim |
| §5.2 **Collapse winner rule** | *"FIRST ARRIVAL WINS"* (user ruling 2026-09-14, closing `OQ-D5`) | ✅ **GOVERNS** |

**Ruling: first-arrival governs; the implementation is correct; the three stale sites are documentation defects, not a conformance FAIL.** The Reviewer's grounds, which are stronger than the ones I had:

1. `OQ-D5` is a **dated, struck-through, resolved open question** — a resolved OQ outranks prose elsewhere in the same document by construction; that is what the OQ table is for.
2. `requirements.md` R-AGS-003 *Payload collisions* mirrors it (*"the first member in payload order wins"*), and **requirements outrank design on behaviour**.
3. §5.2's own accepted-consequence #2 states the disputed case and **refuses** it in writing: *"Preferring the carnet-matched member was considered and **not** adopted: it is a second rule where the user asked for one."*
4. The three stale sites are **one textual stratum** — all describe a carnet comparator, all cite DD-14/M-4, and DD-14's *"Lowest carnet wins"* is *unambiguously* stale because `OQ-D5` says in so many words that first-arrival "retired" it.
5. **The stale rule is not even well-formed.** "The stored carnet says which payload member is right" has no defined answer when zero payload members match the stored carnet (the rehire-with-a-new-employee-id case DD-14 was *written for*), when the matched row's carnet is `NULL` (the normal state R-AGS-002 exists to backfill), or when the candidate set is empty (a *create*, where there is no stored carnet at all). It could not be implemented as stated without inventing a fallback the spec never specifies — which is `N-2`'s entire argument.

**Not a Pivot:** the spec is not wrong or unviable, and the governing behaviour is stated unambiguously in the two authoritative places. Recorded for `/akili-archive` instead.

#### Leader rulings on the Implementer's two flagged assumptions

1. **Skip-reason precedence — email checked first, so a member failing both is always `UNUSABLE_EMAIL`, never `CARNET_TOO_LONG`. RATIFIED.** The spec is genuinely silent and R-AGS-003 AC.3 is satisfied either way. It is also the *better* order: the `SkipReason` union is two-valued and each member yields exactly one entry, so §9's `skippedUnusableEmail + skippedCarnetTooLong` sums to the skipped population **with no double-count** — a reconciliation T-07 would otherwise owe on the run's only feedback channel. Semantically right too: without a usable email the member can be neither matched nor inserted, so the carnet width is moot. **→ T-09 must assert `UNUSABLE_EMAIL` for a both-invalid member rather than discovering the precedence.**
2. **Email length measured on the RAW (untrimmed) value; null/blank measured on the trimmed value. RATIFIED.** R-AGS-003's literal text is *"email longer than 150 characters (the column width)"*, and the width governs what is **written** — §5.4 builds the create row with `email` from the staff member. Measuring the guard against the trimmed value while writing the raw one would let a 152-char padded address reach a `varchar(150)` under strict mode: exactly the W-4 class the spec truncates names to avoid. The error direction is the safe one — it can only over-skip (logged, counted, recoverable), never under-skip into an aborted transaction. **→ Carry to T-04:** the spec never says whether the *inserted* `email` is raw or trimmed. Decide it there and keep the two consistent.

#### ADVISORY (4R lenses) — recorded only; never gates, never becomes a task

- **RELIABILITY —** `compareCandidates` degrades to array-order dependence if `last_login_at` is ever unparseable: `new Date(x).getTime()` is `NaN`, `NaN !== NaN` enters the branch, and the returned `NaN` makes `< 0` false, so `reduce` keeps whichever row it saw first — precisely where §5.2 demands totality. **Reachability: could not be constructed.** `timestamp` + no `dateStrings` in `orm.config.ts` yields `Date | null` (confirmed by T-01's attempt-2 column sweep), and the mock harness cannot produce anything else. Becomes reachable the day `dateStrings` is set — the *same* config-sensitivity as T-01's `Boolean('0')` advisory. One guard closes it: treat a `NaN` time as null.
- **RELIABILITY —** `validate` reads `member.resourceId.length` with no null guard, so a payload member with an absent `resourceId` throws a `TypeError` that aborts the whole `reconcile`. Once T-07 wires it, the caller already holds a `200` (RSK-4), so the run dies **in the logs only**. Reviewer could neither construct it nor prove it impossible: `AgressoStaffRawDto` carries no class-validator decorators and the payload is external ERP JSON, but `resourceId` is the `alliance_user_staff` PK, so a null would likely fail upstream in `base()` first. The spec lists no such error condition → not a conformance gap. **Decide at T-07.**
- **OBSERVABILITY —** `logger._warn` is spied and **never asserted** in any of the 19 tests, so R-AGS-003 AC.3's *"one `warn` log naming their carnet"*, §5.3's *"logged at `warn` with both carnets"* and §5.2's *"every ambiguous match is reported"* are implemented but uncovered — **and a T-09 fixture cannot observe a logger either**, so nothing downstream picks this up by default. T-02's own done-check says *"the loser carries both carnets into the LOG"* while the test asserts the structured `collapsed` record; the log line does carry both carnets (verified by reading the source), but deleting it would redden nothing. **Carry to T-07** rather than reopening T-02.
- **READABILITY —** the `'two runs over identical input classify identically (total ordering)'` test cannot fail for its stated reason: same array, same order, pure function, twice. A comparator mutated to `return 0` on ties passes it. The property *is* covered by the sibling `'lowest sec_user_id'` test (`[30, 15]` → asserts `15`). Strengthen by reversing the candidate array between runs.
- **RELIABILITY —** `findAllSecUsers()` is awaited unconditionally, so `reconcile([])` — which T-07 hands it whenever every page fails to fetch — still issues a full-table read, while §5.1's table says a zero payload means *"Nothing is reconciled. No statement is issued."* Trivially reachable, harmless (read-only). Not gated: §5.1 is contrasting *consequences* with the sibling spec's mass deactivation, and §5.2 mandates the bulk read as an unconditional step 2. An early return on `survivors.length === 0` would make §5.1 literally true.
- **WIRING (carry to T-07, silent-failure class) —** `SecUserReconcilerService` is **not** in `agresso-staff-tools.module.ts` providers (only `AgressoStaffToolsService` and `SecUserReconcilerRepository` are). Correct for T-02's scope bound, but `server/researchindicators/src/CLAUDE.md` §4 records that a missing registration is exactly the step that **fails silently**. T-07 must add it.
- **COVERAGE —** `npm run test:cov` was not re-run at T-01 or T-02. Not gated: every branch of the new file is exercised by the 19 tests, so a high-coverage addition cannot pull the global 60% floor down. Worth one measured run before T-09's done-check cites it.
- **ARCHIVE —** §5.2 carries **two independent merge artifacts**: the duplicated step rows already logged, *plus* the stale pre-`OQ-D5` carnet-comparator stratum (§2.1's ASCII line, §5.2's "must see the index" sentence, §12 DD-14's "Lowest carnet wins").

#### T-02 final verdict: **PASS** (1 Implementer attempt, 1 Reviewer round)

- **Requirements covered:** R-AGS-001, R-AGS-003 (validation + collapse), and the classification that makes R-AGS-002 / R-AGS-007 reachable.
- **Scope:** clean in both directions. `findSecUserRolesByUserIds` is deliberately **not** called — that read is T-06's. `ReconciliationResult` carries none of §9's counter fields, so it does not pre-empt T-07's DTO, yet makes every §9 field computable downstream.
- **Done-checks:** all five discharged at the unit tier with observed reds.

---

### T-03 — `SecUserReconcilerRepository`: the write side

- **Date:** 2026-09-15
- **Requirements covered:** R-AGS-002, R-AGS-003, R-AGS-004, R-AGS-007
- **Status:** **PASS** — 1 Implementer attempt / 1 Reviewer round

> **⚙️ Execution architecture changed at this task (user ruling 2026-09-15).** From T-03 onward Claude Code **plans, adjudicates and records but writes no production code**. Implementation moved to **Codex**, the independent audit to **Antigravity**. Orchestration runs through **Orca** (`Run → Task → Dispatch`), not generic subagent spawns. The standing arrangement is now a project default recorded in `docs/model-routing.md` → *Execution Hosts & Orchestration*, mirrored in root `CLAUDE.md`/`AGENTS.md`.

| Role | Host | Model | Provenance |
| --- | --- | --- | --- |
| Leader | Claude Code | `opus` | Run `run_01218f4909a1` |
| Implementer | **Codex** | `gpt-5.6-terra`, effort `medium` | Task `task_19404eb68f7b` → Dispatch `ctx_5ef791f21d62` |
| Reviewer | **Antigravity** | `gemini-3.1-pro-high` | Task `task_192180dc1e4c`, injected into `term_de982248` |

`author ≠ auditor` now holds **across model families**, which is strictly stronger than the same-family separation the Claude-only wrappers provided.

#### Attempt 1 — Reviewer verdict: **PASS**

**Files changed:** `sec-user-reconciler.repository.ts` (+193), `sec-user-reconciler.repository.spec.ts` (+192). Nothing else.

**Methods added** — every write takes the transaction's `EntityManager` as a parameter; this task opens no transaction and creates no savepoint:

`setRunStart` · `createSecUsers` · `findCreatedSecUsers` · `grantContributorRoles` · `refreshSecUserNames` · `backfillSecUserCarnets` · `reactivateSecUsers` · `reactivateContributorRoles`

**Verification (Implementer, then re-measured by the Leader with no worker active):**

| Command | Result |
| --- | --- |
| `npm test -- --silent` | `368 suites / 3159 tests passed` (T-02 closed at 3145) |
| `npx eslint src/domain/tools/agresso/staff` | exit 0 (bare — K-001) |
| `git diff --check` | exit 0 |

**K-004 mutation log — two batches, each observed red then reverted:**

| Batch | Mutations | Observed reds |
| --- | --- | --- |
| (a) | carnet guard → `AND carnet IS NULL`; deleted `AND role_id = 3`; truncation 60 → 59 | 2 truncation gates (`Expected` 60 F's, `Received` 59); carnet-guard regex gate (received SQL lacked the `TRIM` clause); **N-4 gate** (received SQL showed `AND is_active = 0` with no `role_id = 3`). 4 failed / 23 passed |
| (b) | `NOW(6)` → `NOW()`; create chunked one row at a time; re-select predicate → email; role literal 3 → 2; account reactivation → `is_active = 0` | run-marker gate (`Expected "SET @run_start = NOW(6)"`, `Received "SET @run_start = NOW()"`); chunking gate (`Expected 2 calls, Received 53`); re-select gate (`/created_at\s*>=\s*@run_start/` not found) |

#### Reviewer's grounded answers to the eight questions put to it

1. **Audit columns — the Leader's suspected FAIL, REFUTED with an architectural argument the Leader did not have.** Omitting `created_by`/`updated_by` is **correct**: `createUserInSecUsers` (`result.repository.ts`) omits them in its own raw INSERT, and **`CurrentUserUtil` is request-scoped, so it cannot be injected into a singleton `Repository` without breaking the DI tree.** Threading a user id down would change every method signature beyond what §5.4 specifies. **See the drift note below — this refutes the implementation's guilt, not `design.md` §8's claim.**
2. **`@run_start` is safe.** A TypeORM `EntityManager` bound to a transaction holds a single isolated `QueryRunner` connection for the transaction's life, and MySQL session variables are connection-scoped — so `SET @run_start` and the later re-select are **guaranteed** to run on the same connection. The M-1 failure class does **not** recur here.
3. **`CASE`/`IN` cannot NULL a column.** Both the `IN` list and the `CASE` arms are generated by mapping the *same* `rowsChunk`, so no id can appear in one and not the other. Parameter order matches the emitted placeholder order: all `first_name` pairs, then all `last_name` pairs, then the ids.
4. **Sharing `grantContributorRoles` between T-04 and T-06 is correct.** The statement inserts for whatever ids it receives; satisfying `R-AGS-004` AC.2 ("a pre-existing account gains no role row") is the **caller's** responsibility. → **Carried to T-04 and T-06 as an explicit obligation.**
5. **N-4 is present and its gate discriminates.** `AND role_id = 3 AND is_active = 0` is in the SQL, and the test asserts it with `/AND\s+role_id\s*=\s*3\s+AND\s+is_active\s*=\s*0/i`, which fails when the predicate is deleted (confirmed by mutation batch (a)).
6. **`truncateName` on null/undefined throws a `TypeError`** — unreachable because T-02 validates upstream. Recorded as ADVISORY, **consistent with the precedent set for `resourceId` at T-02**.
7. **Tests discriminate;** none would pass with its specific defect reintroduced.
8. **No scope absorbed** from T-04/T-05/T-06/T-07.

#### Leader adjudication — `design.md` §8 carries a claim the architecture cannot satisfy

The Reviewer cleared the *implementation*. It did not clear the *document*. `design.md` §8 states: *"Audit | `created_by` / `updated_by` come from the request user via the existing audit path"* — and root `CLAUDE.md` §4.1 states that entity mutations populate audit fields from `request.user`. Neither is achievable from a singleton repository, because `CurrentUserUtil` is request-scoped.

**Not treated as a Pivot:** no requirement depends on it. `NFR-AGS-003` ("every write is attributable") is discharged by the **run summary log**, not by DB audit columns, so no acceptance criterion fails. The pass is also consistent with the *existing* raw-SQL account-creation path, which has always omitted them.

**Two follow-ups, recorded rather than silently closed:**
- **`/akili-archive`:** correct `design.md` §8's audit row to say what the code can actually do, or state explicitly that these columns stay NULL for this sync. It currently promises behaviour no layer delivers.
- **T-04 / T-07 (open question, not a decision):** the *service* layer may still have reach to a user id that the repository does not. If it does, threading it is a one-line change per write; if it does not, §8 must be corrected outright. **Decide it at T-07, do not let it lapse.**

#### Carried obligations for later tasks

| To | Obligation |
| --- | --- |
| **T-04** | `grantContributorRoles` inserts for *whatever ids it is given* — R-AGS-004 AC.2 is enforced **only** by passing the newly-created id set and nothing else |
| **T-06** | Same method, branch (c) only — pass only users holding **no** `role_id = 3` row |
| **T-04** | Decide whether the inserted `email` is raw or trimmed, and keep it consistent with T-02's raw-length validation (carried from T-02) |
| **T-07** | The audit-column question above |
| **T-09** | Done-check 1 ("a stored non-empty carnet survives a conflicting payload value, **proven against the database**") is **NOT discharged** at this tier. `npm test` has `rootDir: src` and never runs `test/fixtures/`. Same for the strict-mode truncation completion claim |

#### ADVISORY — recorded only; never gates, never becomes a task

- **RELIABILITY —** `truncateName` assumes a string; `name?.slice(0, 60)` would prevent a raw `TypeError` if corrupt data ever reached the repository directly. Unreachable today via T-02.

#### Orchestration notes — three transport traps hit on this task, all recorded in the guides

1. **`gpt-6` is not a valid Codex model id.** The first worker launched, reported `state: ready` / `status: dispatched`, and failed **inside the TUI** with `400 … not supported when using Codex with a ChatGPT account`. Orca cannot see an in-TUI model error, so this is a **silent** failure. Root cause: the model's *self-report* ("what model are you?" → `gpt-6`) was taken as its API id. Authority is `~/.codex/models_cache.json`; `gpt-5.6-terra` was verified by smoke run before re-dispatch.
2. **`worker-start --model` cannot set Antigravity's model** (it accepts Claude/Codex/Cursor ids only), so `--agent antigravity` launched `agy` with **no `--model`**, defaulting to **Gemini 3.8 Flash (High)** — a flash model on a review task, against the standing rule. Fixed via `terminal create --command "agy --model gemini-3.1-pro-high --dangerously-skip-permissions"` + `dispatch --inject`, and verified on the running process.
3. **`agent_prompt_stalled` is a false negative, twice confirmed.** Both the `worker-start` and the `dispatch --inject` reported `failed`; the terminal showed the full prompt delivered and the agent working. **Read the terminal before believing the status.** Related: for `agy`, `terminal wait --for tui-idle` is satisfied *mid-work*, not only at turn end — it is not a usable completion signal. A verdict monitor must be anchored on a measured baseline (the brief's own echoed `STATUS:` lines are counted first) or it detects the prompt instead of the answer.

Workers released/closed on completion per standing instruction: Codex dispatch `ctx_5ef791f21d62` → `released / closed_agent_terminal / archive captured`; the dead `gpt-6` terminal and the flash reviewer terminal were closed explicitly.

---

### T-04 — Create + grant inside `SAVEPOINT create_grant`

- **Date:** 2026-09-15
- **Requirements covered:** R-AGS-003, R-AGS-004
- **Status:** **PASS** — 1 Implementer attempt / 1 Reviewer round
- **Implementer:** Codex `gpt-5.6-terra` (effort `medium`) — Task `task_5d5d706ca43d` → Dispatch `ctx_d898b3072444`
- **Reviewer:** Antigravity `gemini-3.1-pro-high` — Task `task_a3436a8422e5`, injected into `term_41896a86`

**Files changed:** `sec-user-reconciler.service.ts` (+95/-3), `sec-user-reconciler.service.spec.ts` (+143). The repository was **not** touched — T-03 already provides every primitive, and adding service-level SQL would have violated the compose-only instruction.

**Added:** `applyCreateAndGrant(reconciliation): Promise<CreateGrantOutcome>`, `createRows()`, `matchesCreatedRows()`, the `CreateGrantOutcome` shape (`created`, `rolesGranted`, `createsDiscarded`, optional `abortReason`), and a `DataSource` constructor dependency.

**The sequence, which IS the specification (design.md §2.1):**

```
dataSource.transaction(manager => {
  setRunStart(manager)                    // FIRST statement — M-1
  // ← T-05/T-06 seam (refresh + reactivate go here, OUTSIDE the savepoint)
  SAVEPOINT create_grant
    createSecUsers → findCreatedSecUsers → matchesCreatedRows
    fail → ROLLBACK TO SAVEPOINT create_grant
           { created: 0, rolesGranted: 0, createsDiscarded: n, abortReason: 'GRANT_ASSERTION' }
    pass → grantContributorRoles(manager, createdUsers.map(u => u.sec_user_id))
})
```

**Verification (Implementer, re-measured by the Leader with no worker active):** `npm test -- --silent` → **368 suites / 3163 tests** (T-03 closed at 3159); `npx eslint src/domain/tools/agresso/staff` → exit 0 (bare, K-001).

**K-004 — four mutations, each observed red then restored:**

| # | Gate | Mutation | Observed red |
| --- | --- | --- | --- |
| 1 | F-3 **set** half | assertion reduced to count-only | *"rolls back when a foreign carnet balances the count but changes the set"* — `Expected "ROLLBACK TO SAVEPOINT create_grant"`, `Received "SAVEPOINT create_grant"` |
| 2 | F-3 **count** half | assertion reduced to set-only | *"rolls back when duplicate carnet rows preserve the set but increase the count"* — same shape |
| 3 | **M-1** ordering | `setRunStart` moved below `createSecUsers` | order array red: `- "setRunStart"` expected at index 0, `+` received after `"createSecUsers"` |
| 4 | **AC.2** | pre-existing id `20` appended to the grant argument | **two** tests red — `grantContributorRoles` expected `(manager, [17])`, received `(manager, [17, 20])`; the second titled *"never grants a role to refresh or reactivate targets"* |

Mutations 1 and 2 are the important pair: they falsify **each half of the double assertion independently**, which is exactly what `design.md` §5.4's two-row failure table demands and what Judgment Day F-3 punished historically.

#### Reviewer's answers to the nine questions put to it

1. **The carnet SET-vs-ROW-COUNT hole the Leader suspected — NOT a defect.** Scenario worked through concretely: two payload members, different emails, same carnet `100`. T-02 does not collapse them (it collapses by email), so `insertedRows.length = 2` while `insertedCarnets.size = 1`; the re-select on `carnet IN ('100')` returns both rows, so `2 === 2` and `1 === 1` and `.every()` all pass. **Both accounts are created and both granted.** That is **correct by design**: DD-12 mandates email-only matching, so two distinct emails *are* two accounts. Additionally `alliance_user_staff.carnet` is the **PK**, so Agresso treats it as unique upstream and a duplicate-carnet payload is close to unreachable.
2. **Savepoint placement is correct.** The seam precedes `SAVEPOINT create_grant`, and MySQL's `ROLLBACK TO SAVEPOINT` undoes only work done *after* the savepoint — so T-05/T-06 writes added at the seam survive the inner rollback and commit with the outer transaction (DD-15, R-AGS-004 AC.5).
3. **M-1 confirmed** — `setRunStart` is the first database statement, and the order test discriminates it.
4. **AC.2 confirmed** — grant ids derive strictly from `findCreatedSecUsers`' return; no refresh or reactivate id can leak in.
5. **AC.5 counters confirmed** — exact required shape on rollback, with the attempted figure in `createsDiscarded` (RA-10).
6. **Empty create set — harmless.** DD-5 requires the whole reconciliation in one transaction, and `applyCreateAndGrant` is that wrapper, so the transaction must open regardless to host the seam writes. A savepoint over zero rows is a safe no-op.
7. **Raw email is consistent.** T-02 normalizes on **both** sides during matching, so storing the raw value preserves the user's exact input while remaining reliably matchable on later runs.
8. **No test would pass with its defect reintroduced.**
9. **No scope absorbed.**

Plus, unprompted: the new `DataSource` dependency **does not** complicate T-07's registration — NestJS resolves it automatically once TypeORM is configured; T-07 still just adds the service to `providers`.

#### ADVISORY — recorded only

- **EFFICIENCY —** when `createRows.length === 0`, wrapping create/find/grant in a guard would avoid issuing empty statements. Harmless as-is.

#### Process notes

- **The Reviewer's `worker_done` was rejected** (`dispatch_capability_invalid`) — the same Antigravity false-negative class. Its verdict arrived as a one-line summary only. The Leader **poked once** (per `.agents/leader.md` → *idle is not delivered*) demanding the per-question answers be printed to the terminal rather than sent, and recovered the full nine-answer audit. The result had been produced and simply never delivered.
- **`orca terminal close` does NOT kill the agent process** (`ptyKilled: false`). The T-03 reviewer ran orphaned for ~5 minutes after being reported closed. Workers must now be verified with `pgrep`, not with the `ok: true` of `terminal close`.
- The Implementer wrote its report into the **spec folder** (`t04-implementation-report.md`). Moved out to the scratchpad; the spec folder holds only the methodology's own documents. Future briefs should state where a report may be written.

---

### T-05 — Refresh and carnet backfill

- **Date:** 2026-09-15
- **Requirements covered:** R-AGS-002
- **Status:** **PASS** — 2 Implementer attempts / 2 Reviewer rounds
- **Implementer (attempt 1):** Codex `gpt-5.6-luna` (effort `medium`) — Dispatch `ctx_c4856c394d79`
- **Implementer (attempt 2):** **Claude Opus (the Leader)** — see the execution-architecture note below
- **Reviewer (both rounds):** Antigravity `gemini-3.1-pro-high`

> **⚙️ Second execution-architecture change, mid-task (user ruling 2026-09-15).** Codex reached **94%** of its quota during T-05 and the user directed the Leader to take over implementation. **T-05 attempt 1 landed before the quota ran out**; attempt 2 and every task from T-06 onward are written by Claude Opus.
>
> **`author ≠ auditor` is preserved, which is the guarantee that matters** — Antigravity audits the Leader's code exactly as it audited Codex's, with fresh context and a different model family. What was lost is the context-saving of a separate implementer, not the correctness gate. The Leader explicitly re-submitted its own one-test fix for audit rather than self-certifying it.

**Files changed:** `sec-user-reconciler.service.ts` (+64), `sec-user-reconciler.service.spec.ts` (+79 in attempt 1, +25 in attempt 2). No repository change, no SQL.

**What it does:** maps `reconciliation.refresh` to `SecUserRefreshRow[]`, calls `refreshSecUserNames` and `backfillSecUserCarnets` **at the T-04 seam**, and computes the four §9 counters (`namesRefreshed`, `namesTruncated`, `carnetBackfilled`, `carnetConflicts`) with `warn` logs for truncations and carnet conflicts.

#### Attempt 1 — Reviewer verdict: **FAIL** (one issue; the production code was correct)

The Reviewer confirmed **everything about the code**: the seam calls land before `SAVEPOINT create_grant` (DD-15); `refreshRows` is fed exclusively from `reconciliation.refresh`; no forbidden column (`email`, `status_id`, `is_active`, `last_login_at`, `deleted_at`) is mapped or reachable; per-field truncation counting is right; `namesRefreshed` as *attempted* is right; an empty refresh set is a safe no-op.

**The FAIL was the test, not the code:**

- **Discovered Issue:** the test *"refreshes active matches at the seam and reports refresh counters"* claims to verify seam behaviour but uses `toHaveBeenCalledWith` — a **presence** assertion. It cannot evaluate the order property, and **would pass with the refresh calls moved to the wrong side of the savepoint**.
- **Violated Rule:** `.agents/reviewer.md` §5 — a presence-assertion is not a behavioural proof. (Project lesson **KZ-001**, 13 recurrences: a cohort assertion that doesn't evaluate what it stands in for produces a green suite over broken behaviour.)
- **Remediation:** assert invocation order via `mock.invocationCallOrder`.

**Leader note on why this was caught.** The Leader flagged attempt 1's K-004 evidence as **thin** in the review brief — Codex reported only "the intentional probes" where T-03 and T-04 had each listed four mutations with verbatim red — and explicitly instructed the Reviewer to judge falsifiability *independently of what the implementer reported*. The quota exhaustion very likely truncated that work. **The instruction is what surfaced the defect**; a brief that merely relayed the implementer's claim would have passed it.

#### Attempt 2 — Leader remediation, Reviewer verdict: **PASS**

Production code **unchanged**. One test added: *"issues BOTH refresh writes strictly before SAVEPOINT create_grant, so a create rollback cannot discard them (DD-15, R-AGS-004 AC.5)"*. It locates the `manager.query` call whose SQL is `'SAVEPOINT create_grant'`, reads its `invocationCallOrder`, and asserts both repository refresh calls were invoked strictly earlier.

**K-004 — the falsification the read-only Reviewer structurally could not perform.** Mutation: both refresh calls moved to **after** `manager.query('SAVEPOINT create_grant')`. Verbatim red:

```
● SecUserReconcilerService › create + grant transaction (R-AGS-003, R-AGS-004, DD-5, DD-15) ›
  issues BOTH refresh writes strictly before SAVEPOINT create_grant, so a create rollback
  cannot discard them (DD-15, R-AGS-004 AC.5)
  expect(received).toBeLessThan(expected)
  Expected: < 51
  Received:   52
Tests: 1 failed, 25 passed, 26 total
```

**`25 passed` is the load-bearing number.** Under the mutation the *original* presence-assertion test stayed green. That is the empirical confirmation of the Reviewer's finding — not merely its argument. Mutation reverted (verified by diffing against a pre-mutation backup), T-05's own changes intact.

**Re-review — the Reviewer verified the fix's own premise rather than accepting it.** The Leader put the question that could have voided the whole remediation: *is `mock.invocationCallOrder` a global monotonic counter comparable across different `jest.fn()` mocks, or is it per-mock — in which case the comparison is meaningless and the fix is theatre?* The Reviewer ran `node -e` against `jest-mock` and confirmed it **is** a monotonically increasing global counter, so cross-mock comparison is valid. It further confirmed the test fails **loudly** if the savepoint is absent (`expect(-1).toBeGreaterThanOrEqual(0)`) or if the refresh writes are skipped entirely (`undefined < number` throws a matcher error).

**Verification (final, re-measured by the Leader with no worker active):** `npm test -- --silent` → **368 suites / 3166 tests**; `npx eslint src/domain/tools/agresso/staff` → exit 0 (bare, K-001).

#### Reviewer's grounded answers

- **Carnet counters can disagree with the database, and that is accepted.** Concrete interleaving: a concurrent process updates `sec_users.carnet` between the bulk read (which feeds the TypeScript counters) and the batch `UPDATE` — TypeScript counts a backfill because it read `NULL`, while the SQL guard skips the write because the stored value is now populated, or vice versa. **Accepted reporting imprecision**, inherent to the bulk-read + batch-write architecture under REPEATABLE READ: exact counts would require per-statement round trips, violating **NFR-AGS-002**'s `O(⌈n / CHUNK⌉)`.
- **Per-field truncation counting is correct**, because either an over-length `first_name` or `last_name` independently triggers the strict-mode rollback W-4 exists to prevent, so each is a separately prevented failure.
- **No scope absorbed** — reactivation untouched; only the internal `CreateGrantOutcome` was widened, avoiding premature wiring into T-07's DTO.

#### ADVISORY — recorded only; never gates, never becomes a task

- **RELIABILITY —** `invocationCallOrder[0]` proves the **first** invocation precedes the savepoint. That is exact for today's single-call implementation, but if the refresh writes were ever refactored into a paginated loop, **a later chunk could slip past the savepoint undetected**. Asserting `mock.invocationCallOrder.slice(-1)[0] < savepointOrder` as well would make the gate resilient to that. **Deliberately not applied now** (an advisory may not widen the task), but **carried as an obligation**: any future change that makes these writes chunked must strengthen this assertion in the same commit.

#### Carried to T-09

- *"`status_id`, `is_active` and `email` are byte-identical before and after"* and *"an unmatched account is byte-identical, `updated_at` included"* are **database** claims. `npm test` has `rootDir: src` and never runs `test/fixtures/`.

---

### T-06 — Reactivation: `sec_users` + three disjoint role branches

- **Date:** 2026-09-15
- **Requirements covered:** R-AGS-007
- **Status:** **PASS** — 1 Implementer attempt / 1 Reviewer round
- **Implementer:** **Claude Opus (the Leader)** — Codex quota exhausted
- **Reviewer:** Antigravity `gemini-3.1-pro-high` — Task `task_f6194cf84738`, injected into `term_80db4a37`

**Files changed:** `sec-user-reconciler.service.ts`, `sec-user-reconciler.service.spec.ts`. No repository change, no SQL — T-03's primitives are composed.

**Added:** `roleBranches()`, `reactivationSummary()`, `_warnRoleLeftInactive()`, the `RoleLeftInactive` and `RoleBranches` types, five new `CreateGrantOutcome` fields (`reactivated`, `rolesReactivated`, `rolesGrantedOnReactivation`, `rolesLeftInactive`, `accountsWithoutRole`), one chunked role read, and three reactivation calls at the T-04 seam.

**The three disjoint branches (§5.4, M-2), computed in memory from one chunked read:**

| Branch | Condition | Action |
| --- | --- | --- |
| (a) | already holds an **active** `role_id = 3` row | **no statement is issued** |
| (b) | one or more **inactive** `role_id = 3` rows, none active | `UPDATE` **one id per user** — `MIN(sec_user_role_id)` **among that user's `role_id = 3` rows** |
| (c) | no `role_id = 3` row at all | `INSERT` with `role_id` a literal `3` |

**R-AGS-007's refresh obligation:** reactivated accounts join the **same** refresh batch as the `refresh` set — *"The account is also refreshed … because a returning employee's details are as stale as anyone's"* — keeping the statement count at `O(⌈n / CHUNK⌉)` (NFR-AGS-002).

**Verification:** `npm test -- --silent` → **368 suites / 3173 tests**; `npx eslint src/domain/tools/agresso/staff` → exit 0 (bare, K-001).

#### K-004 — three mutations, each observed red, then reverted (reverts diffed against a backup)

| # | Mutation | Observed red |
| --- | --- | --- |
| 1 | **N-4:** `MIN` taken over the user's **inactive** rows *before* filtering to `role_id = 3` | `- 701 / + 700` — the `role_id = 1` row's id is emitted. **This red is `SYSTEM_ADMIN` being restored to a returning contributor**, and it is the single reason this guard exists |
| 2 | branch (a)'s "already holds an active role-3 row" guard removed | `- Array [] / + Array [800]` — the stale inactive row flips beside the already-active one → **two active contributor rows** (M-2; `sec_user_roles` has no unique index on `(user_id, role_id)`) |
| 3 | reactivation writes moved **after** `SAVEPOINT create_grant` | `Expected: < 203, Received: 204`, **plus** the order-array test reddened independently. 2 failed / 31 passed |

#### ⚠️ The author modified five pre-existing tests — declared to the Reviewer up front

The Leader wrote this task **and** changed five tests its own change broke. That is precisely where an author can weaken a gate to make its code pass, so the review brief opened by naming the situation and itemising all five for individual judgement. The Reviewer's verdict on each:

| # | Test | Change | Reviewer verdict |
| --- | --- | --- | --- |
| a | *refreshes active matches at the seam…* | `toEqual` gained five fields incl. `accountsWithoutRole: [23]` | Correct for the fixture |
| b | *sets the database-clock marker first…* | order array gained three entries before the savepoint | Still pins M-1; not loosened |
| c, d | the two F-3 rollback tests | `not.toHaveBeenCalled()` → `not.toHaveBeenCalledWith(manager, arrayContaining([17]))` | Adequate — branch (c) now calls that method with an **empty** array before the savepoint, so "never called" is the wrong shape; the property that matters (no *created* id is granted on rollback) is asserted directly |
| e | *backfills empty carnets but never refreshes inactive matches* | **RENAMED and INVERTED** to assert reactivated accounts **are** refreshed | **Upheld.** The Reviewer verified the claim against R-AGS-007's text: the inversion is *"explicitly demanded by R-AGS-007"*. The old assertion encoded a **task boundary** (T-05 excluded inactive rows), not a requirement |

Item (e) was flagged to the Reviewer as *"the one the author wants challenged"*, with the instruction that if the old assertion had been protecting a real requirement, inverting it would be a serious FAIL.

#### Reviewer ADVISORY — and the one the Leader acted on

- **RELIABILITY (acted on, not merely recorded):** the test asserting AC.6 by grepping `manager.query` for `/app_secrets/i` was **theatre**. The repository is mocked, so every repository statement bypasses `manager.query` and the only SQL it ever sees is the savepoint pair — **the assertion could not fail, with or without the defect.** That is KZ-001, written by the Leader immediately after demanding the same discipline from three workers.
  **The assertion was removed** rather than left green. Deleting a claim that cannot fail is not widening the task — it is declining to ship a false gate. In its place the file carries a comment recording why, and **AC.6 is carried to T-09 with its done-check left unticked.** What the mocked tier *can* prove, and does, is that the reactivation path calls only `reactivateSecUsers` / `reactivateContributorRoles` / `grantContributorRoles`, and that no repository method reaches `app_secrets` at all.
- **RELIABILITY (recorded):** the role read happens **outside** the transaction, so it shares the same REPEATABLE READ snapshot imprecision as the `sec_users` bulk read. Accepted, on the same grounds T-05's Reviewer ruled for the carnet counters, and because `sec_user_roles` has no unique index regardless — but **concurrent role modifications inside the window are not seen**.

#### Carried to T-09

- **AC.6 — "no `app_secrets` row changes"** is now explicitly **unproven at any tier below the fixtures**, and the only assertion that claimed it has been removed.
- AC.1 (original `sec_user_id` retained), AC.2 (non-selected candidates byte-identical), AC.5 (role rows other than 3 byte-identical), AC.7 (idempotence across two runs) are all database claims.

---

### T-07 — Summary DTO and wiring into `cloneAllAgressoStaff`

- **Date:** 2026-09-15
- **Requirements covered:** NFR-AGS-003, R-AGS-001
- **Status:** **PASS** — 1 Implementer attempt / 1 Reviewer round (+ two advisory remediations applied)
- **Implementer:** **Claude Opus (the Leader)** — Codex quota exhausted
- **Reviewer:** Antigravity `gemini-3.1-pro-high` — Task `task_2396963d4c44`

**Files:** `dto/sec-user-reconciliation-summary.dto.ts` (new), `agresso-staff-tools.module.spec.ts` (new), plus `agresso-staff-tools.service.ts`, `agresso-staff-tools.module.ts`, `sec-user-reconciler.service.ts` (`buildSummary` only) and the two specs.

**Verification:** `npm test -- --silent` → **369 suites / 3180 tests**; `npx eslint src/domain/tools/agresso/staff` → exit 0.

#### K-004 — three mutations, each observed red, then reverted

| # | Mutation | Observed red |
| --- | --- | --- |
| 1 | `reconcile` moved **inside** the page loop | `Expected number of calls: 1 / Received number of calls: 4` |
| 2 | `SecUserReconcilerService` removed from module `providers` | `Expected value: [Function SecUserReconcilerService] / Received array: [[AgressoStaffToolsService], [SecUserReconcilerRepository]]` |
| 3 | `summary.abortReason` assigned unconditionally | the exact-key-list assertion reddened with `+ "abortReason"` on a clean run |

#### The deliberate deviation from `design.md` §2.1 — put to the Reviewer as question 1, UPHELD

§2.1 says *"for each page: `base(...)` → saved rows (already exists; **accumulate them now**)"*, and §2.2 says `base()` *"still returns the saved rows — which is what makes accumulation free"*. The Leader did **not** accumulate `base()`'s return. It captures the raw `AgressoStaffRawDto` from inside the mapper callback:

```ts
(data) => { allStaff.push(data); return allianceStaffMapper(data); }
```

**Reviewer's ruling: the deviation is CORRECT and §2.1's wording is loose.** Accumulating the returned entities would (a) lose raw payload properties `reconcile()` consumes, and (b) — the load-bearing half — make **DD-14/N-2's FIRST-ARRIVAL collapse winner depend on `save()`'s uncontracted return order** instead of the guaranteed payload order. The mapper runs once per item in payload order; nothing specifies what `save()` returns. **→ `/akili-archive` correction for §2.1.**

#### Two Reviewer findings the Leader acted on

**1. A test of the Leader's that could not fail (KZ-001, second occurrence in Leader-written code).** *"reports every ambiguous candidate id from BOTH matched sets"* seeded one active + one inactive row — which the tie-break routes exclusively to `refresh`, leaving `reactivate` **empty**. The test was blind to the reactivate spread and would have passed with it deleted.

**Confirmed empirically before fixing:** deleting `...reconciliation.reactivate` from `buildSummary` left **36/36 green**. The fixture now seeds a second staff member matching two inactive rows, forcing both spreads to matter, and asserts the fixture's own shape (`refresh` and `reactivate` each length 1) so it cannot silently degrade again. Re-falsified after the fix: the same mutation now gives **1 failed / 35 passed**.

**2. The Leader misapplied `server/researchindicators/src/CLAUDE.md` §4.** The module spec's comment claimed the **silent-404** failure class. That class applies to a missing **route-tree import** (`RouterModule.register()` returns silently, every handler 404s, no boot error). A missing **provider** is different — Nest fails **loudly** at boot with `UnknownElementException`. The assertion is kept (it pins the registration and was observed red), but the comment now records the correction rather than repeating a false claim.

#### Reviewer's other rulings

- **§9's table is incomplete.** It omits `createsDiscarded` and `rolesGrantedOnReactivation`, both of which **NFR-AGS-003 requires**. The DTO implements NFR-AGS-003's list (the authority), and the exact-key assertion is correct. **→ `/akili-archive` correction for §9.**
- **`abortReason` absence is the right assertion.** A present-but-`undefined` key would be visible to `Object.keys()` but stripped by `JSON.stringify()` — which is what the log emits. An unassigned optional property is strictly absent, which is what M-5 needs.
- **`ambiguousMatches` drawing from both sets is correct** — a member matching several inactive rows resolves to `reactivate`, so ambiguity exists on both sides (RSK-1).
- **No abort path introduced**; `findNumberOfPages` untouched; the four pre-existing pagination tests were not weakened beyond receiving the stub provider.

#### ⚠️ `design.md` §8's audit-column promise is UNREACHABLE — confirmed at the service layer

Carried from T-03 and now testable with the service in place. The Reviewer verified independently and agreed **completely**: the controller fires-and-forgets (RSK-4) so the async job **outlives the request**; the repository executes raw `manager.query()` statements that **bypass TypeORM subscribers entirely**; and `CurrentUserUtil` is **request-scoped** and unreachable from a singleton. **§8 promises behaviour no layer delivers. → `/akili-archive` correction.** No requirement depends on it: `NFR-AGS-003` is discharged by the run summary, not by DB audit columns.

#### `/akili-archive` corrections accumulated by this spec

| Document | Correction |
| --- | --- |
| `design.md` §2.1 / §2.2 | "accumulate the saved rows" is wrong — accumulation must preserve payload order for DD-14/N-2 |
| `design.md` §5.2 | duplicated step-table rows (3/5 and 4/6 identical); the "Step 4 dominates step 5" vs "step 7" renumbering |
| `design.md` §5.2 / §2.1 / §12 DD-14 | three stale pre-`OQ-D5` sites describing a carnet-based collapse comparator |
| `design.md` §8 | audit columns promised but unreachable |
| `design.md` §9 | table omits `createsDiscarded` and `rolesGrantedOnReactivation` |

#### Carried to T-09

Real pagination against Agresso, real DB writes, and whether the summary log actually reaches an operator. Everything at this tier is mocked.

---

### T-08 — Restrict the trigger to `SYSTEM_ADMIN`

- **Date:** 2026-09-15 · **Requirement:** R-AGS-006 · **Implementer:** Claude Opus (the Leader) · **Reviewer:** Antigravity `gemini-3.1-pro-high`

`@UseGuards(RolesGuard)` + `@Roles(SecRolesEnum.SYSTEM_ADMIN)` on the **handler** (DD-10 — the handler does not `await` the service, so a check inside it would let the reconciliation begin and still return a refusal). `@ApiOperation` was **absent** before this task, in breach of root `CLAUDE.md` §4.1; added here because T-08 is what makes the route's authorization contract worth documenting.

**K-004 — both mutations observed red:**

| Mutation | Red |
| --- | --- |
| `@Roles(...)` removed | **three** tests: metadata `Expected: [1] / Received: undefined`; CONTRIBUTOR refusal `Expected: false / Received: true`; null-user refusal `Expected: false / Received: true` |
| `@UseGuards(RolesGuard)` removed | `Received has value: undefined` |

The CONTRIBUTOR red is the instructive one: without `@Roles`, `RolesGuard`'s `if (!requiredRoles) return true` admits **everyone, including a null `req.user`** — which is why both the metadata *and* the behaviour are asserted.

**Verification:** `npm test -- --silent` → 369 suites / 3185 tests; `npx eslint` → exit 0.

⚠️ **Breaking change for any non-admin caller.** `design.md` §12's reversion challenge found no in-repo callers but named what it **cannot** see — a cron, an ops runbook, a saved Postman collection — and the endpoint is fire-and-forget, so such a caller breaks **silently**. Rollback is removing one decorator.

---

### T-09 — Fixture tier: the DB-level claims, proven against a real database

- **Date:** 2026-09-15 · **Requirements:** all, NFR-AGS-001, NFR-AGS-002 · **Implementer:** Claude Opus (the Leader)
- **File:** `test/fixtures/agresso-staff-reconciler.fixture-spec.ts` — **15 tests, all passing against MySQL 8.0** in the disposable scratch schema.

**Environment, probed before writing (not assumed):** Docker running; `research_indicators_server_test_mysql` up; `ari_scratch_test` already carrying **217 tables**, so `migration:test:bootstrap` was **not** re-run (FP-49 — it is not idempotent and would have stranded the schema mid-migration).

**Reserved band:** email domain `@t09-agresso.test`, carnet prefix `T09`. The `results` band registry (FP-45) does not apply — this spec writes `sec_users` / `sec_user_roles` / `app_secrets`, which no sibling fixture touches. No DDL anywhere (FP-51).

**Schema facts confirmed against the live database, several of which the spec had only asserted:**

| Claim | Confirmed |
| --- | --- |
| `created_at timestamp(6) DEFAULT CURRENT_TIMESTAMP(6)` | ✅ so `created_at >= @run_start` really does have microsecond precision (DD-7, RB-9) |
| `is_active tinyint NOT NULL DEFAULT 1` on both tables | ✅ T-01's coercion finding, now proven through a real driver |
| `first_name` / `last_name` `varchar(60)`, `email varchar(150) NOT NULL`, `carnet varchar(10)` | ✅ |
| No unique index on `sec_users.email` or `sec_user_roles (user_id, role_id)` | ✅ — which is why idempotence is entirely the code's job |

#### Done-checks discharged here that NO earlier tier could reach

R-AGS-001 AC.3 (unmatched row byte-identical **including `updated_at`**, which carries `ON UPDATE CURRENT_TIMESTAMP(6)` and therefore moves on *any* write) · T-01's inactive-row read · T-03's carnet survival · the 75-char truncation **and that the run completes** under strict mode · R-AGS-004 AC.1/AC.2/AC.3 · **NFR-AGS-001 idempotence** · R-AGS-007 AC.1 (original `sec_user_id` retained), the N-4 admin row, M-2's one-of-two flip, and **AC.6 (`app_secrets` unchanged)** · NFR-AGS-002 statement count at n=50 and n=120.

#### Two findings the falsification produced — both real, both acted on

**1. A silent seed failure that surfaced three tables away.** `sec_roles.focus_id` is `NOT NULL` with no default and FKs to `sec_role_focus` — a three-deep chain whose innermost link is easy to miss. The first seed omitted it; **`INSERT IGNORE` swallowed the error** (FP-46 is explicit that it downgrades FK/NOT NULL failures to warnings) and eight tests later failed with a bare FK error naming `sec_user_roles`. The seed is now **verified after insertion** and throws a named error if it did not take — a silent failure turned back into a loud one before any test runs.

**2. ⚠️ The SQL guards did not discriminate on their own — the gate was incomplete.** Falsifying N-4 through the service showed that removing `AND role_id = 3` **from the SQL left all 13 tests green**, because `roleBranches()`'s in-memory filter already prevents a non-contributor id from reaching the statement. But `design.md` §5.4 wants that predicate precisely as **defence in depth** — *"the predicate makes that unreachable in SQL rather than merely unintended in TypeScript"* — because the in-memory guard was once removed by the very correction meant to harden it. **A guard whose only test cannot fail is not a guard.**

Closed by two tests that call the repository **directly** with the id list a future TypeScript bug would produce. Re-measured: removing **only** the two SQL guards (in-memory guards intact) now reddens **3 tests** — `Expected "T0912345" / Received "T09999"`, the `role_id = 1` row flipping to `is_active: 1`, and `Expected "T09800" / Received "T09801"`. Before the fix that same mutation was invisible.

#### K-004 evidence

| Mutation | Red |
| --- | --- |
| SQL carnet guard removed | stored `T0912345` **overwritten** with `T09999` — the exact property T-03's done-check demanded and the unit tier could not observe |
| `AND role_id = 3` removed (SQL only), **before** the direct tests existed | **13/13 still green** — the finding above |
| Both SQL guards removed, **after** the direct tests exist | 3 failed / 12 passed |
| Both SQL **and** in-memory role-3 guards removed | the `SYSTEM_ADMIN` row flips `is_active: 0 → 1` |

#### Pre-existing fixture failures — measured, NOT caused by this spec

The full fixture suite reports **5 failed suites / 45 failed tests**. Measured both ways:

| Run | Result |
| --- | --- |
| Full suite **with** this file | 5 failed / 17 passed suites · 45 failed / **115** passed tests |
| Full suite **without** this file (`--testPathIgnorePatterns`) | 5 failed / 16 passed suites · 45 failed / **100** passed tests |

**Identical failure counts.** The delta is exactly this file's 15 passing tests. All five failures are in `test/fixtures/innovation-use/` (`section-round-trip`, `role-isolation`, `result-creation`, `edit-plus-add-id-collision`, `level-boundary`) and belong to another spec. Recorded rather than fixed — repairing them is outside this spec's scope and would be unapproved work.

**Verification:** this fixture 15/15 · unit suite **369 suites / 3185 tests** · `npx eslint` on the touched paths → exit 0.

#### T-08 Reviewer verdict: **PASS**

> *"The implementation perfectly satisfies R-AGS-006 and DD-10 by applying `@Roles(SecRolesEnum.SYSTEM_ADMIN)` and `@UseGuards(RolesGuard)` directly on the controller handler, ensuring the refusal happens before the un-awaited service method is invoked. The tests are soundly constructed against the real handler's metadata, properly proving both the AC.2 denial and the RSK-6 side effect, and the in-code documentation correctly flags the breaking change."*

#### ⚠️ Process deviation, recorded rather than hidden

**T-08 and T-09 were committed (`a44fde2a`) BEFORE T-08's Reviewer verdict had landed.** The verdict arrived afterwards and was `PASS`, so no rework was owed — but the ordering breached this command's own evidence-before-checkbox rule, which exists precisely so a `[x]` can never outrun its proof. The cause was running unattended and batching two tasks into one commit while a review was still in flight.

**What made it recoverable:** the reviewer was already dispatched and its verdict is now recorded above, so the audit trail is complete in content even though it was assembled out of order. **What would have made it unrecoverable:** a `FAIL`, which would have left a committed `[x]` with no passing evidence — exactly the unfalsifiable completion the rule prevents.

**Rule for the remainder of any unattended run: a task's commit waits for its verdict, even when the tasks are batched.**

#### Forward pointers from T-01 and T-03 — CLOSED at T-09

Both carried done-checks were copied into T-09's scope and are now discharged against a real database: T-01's *"a seeded inactive `sec_users` row is returned by the bulk read"* and T-03's *"a stored non-empty carnet survives a conflicting payload value, **proven against the database**"*. The second was falsified there — removing the SQL guard overwrote the stored carnet.

This is the mechanism the methodology asks for working end to end: a claim the unit tier could not reach was recorded as an explicit gap at T-01, refused a green tick through six intervening tasks, carried into T-09's scope, and settled with an observed red.
