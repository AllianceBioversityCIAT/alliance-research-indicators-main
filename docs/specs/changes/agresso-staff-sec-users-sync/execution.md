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
