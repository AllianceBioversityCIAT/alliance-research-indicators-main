# Execution Log — `SP_versioning` copies `link_results`

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/sp-versioning-link-results` |
| Depth / Mode | Lite / Bug |
| Started | 2026-09-11 |
| Leader | Claude Opus 5 (T1) |
| Budget | 2 tasks · ~1,080 LOC (≈14 new) · 1 review round |

## Pre-flight — harness baseline (Leader, before any task)

Measured **before** spawning any Implementer, because T-01's whole value is a red that can be told apart from noise. Without this, a red fixture is unreadable: it could be the bug or it could be the harness.

`npm run test:fixtures` on a clean tree, no agents running (concurrency rule respected):

| | Count | Detail |
| --- | --- | --- |
| Suites FAIL | **5** | `innovation-use-{section-round-trip, role-isolation, result-creation, level-boundary, edit-plus-add-id-collision}` |
| Suites PASS | **15** | includes `sp-versioning-objective-blocks` and `innovation-use-lifecycle-routines` |
| Tests | 45 failed / 96 passed / 141 total | |

**The 5 failures are pre-existing and out of scope.** All five boot the full Nest application and die identically at `Nest cannot create the ResultPolicyChangeModule instance` → `TypeError: Cannot read properties of undefined (reading 'query')` — a DI/bootstrap problem, not a schema or SP problem. No fixture that talks to `dataSource` directly fails.

**Why this does not block T-01:** T-01 belongs to the raw-`dataSource` + `CALL SP_…` class, whose two existing members (`sp-versioning-objective-blocks`, `innovation-use-lifecycle-routines`) **both pass today**. The baseline for the relevant class is green, so the red T-01 must produce is attributable.

**Standing rule for the rest of this run:** a suite count of `5 failed / 15 passed` is the floor, not a regression. Any attempt reporting a *sixth* failing suite has broken something.

Environment: `research_indicators_server_test_mysql` up on `127.0.0.1:3307` (scratch schema, disposable — never the shared Dev DB).

## Task Execution History

### T-01 — Regression fixture: a versioned result keeps its links

| Field | Value |
| --- | --- |
| Status | **PASS** |
| Date | 2026-09-11 |
| Implementer attempts | **1** |
| Requirements covered | R-SPL-001 (all clauses) |

**Files changed:** `server/researchindicators/test/fixtures/sp-versioning-link-results.fixture-spec.ts` (new, 326 lines). Nothing else — no migration, no `SP_versioning` re-declaration, no DDL.

**Verification** — `npm run test:fixtures`:

| | Baseline (pre-flight) | After T-01 | Delta |
| --- | --- | --- | --- |
| Suites | 5 failed / 15 passed / 20 | **6 failed / 15 passed / 21** | +1 failed |
| Tests | 45 failed / 96 passed / 141 | **46 failed / 99 passed / 145** | +1 failed, +4 total |

Failing assertion: `expect(copiedLink).toBeDefined()` — `SELECT … FROM link_results WHERE result_id = <new snapshot id>` returns nothing. **This is the required red.**

**Reviewer verdict: `STATUS: PASS`.** The red was confirmed structurally, from two independent directions rather than taken on the Implementer's word: (a) the deployed procedure body (`1788878752646-UpdateVersionSp.ts`, the highest-timestamp of the 12 migrations that re-declare `SP_versioning`) contains **zero** occurrences of `link_results`, so no row can exist to find; (b) `expect(snapshot).toBeDefined()` sits two assertions *before* the failing one, so a broken seed could not masquerade as this red. The counts corroborate independently: 21 suites is only reachable through `test:fixtures` (`testRegex: .fixture-spec.ts$`), never `npm test` (`rootDir: src`) — which discharges the KZ-017 disqualifier arithmetically — and `+4 tests with +1 failing` proves `beforeAll` completed, discharging the un-bootstrapped-schema disqualifier.

Also verified: every R-SPL-001 clause maps to a row-level assertion; KZ-001 clean (four real `CALL` invocations, zero assertions on SQL text); teardown covers all four seeded tables **including snapshot-side rows**, so it is already forward-compatible with T-02's copies; the `904_000` band and year `2116` are collision-free against **all 20** siblings (checked unfiltered, not sampled).

#### ADVISORY (4R lenses — recorded, never gating, never a new task)

1. **RELIABILITY — case 4 cannot verify its own premise.** Its purpose is *"copied rows do not block the physical delete"*, but nothing asserts a copied row exists on `snapshot1Id` before `CALL SP_delete_result_version`. Post-T-02 it would pass identically whether the copy landed or silently did not. The exemplar avoids this by asserting its rows present before its delete (`sp-versioning-objective-blocks.fixture-spec.ts:279-288`).
2. **RELIABILITY — case 3 covers one of the two DD-2 violation shapes.** It queries only `WHERE result_id = snapshot.result_id`, so a block that remapped the **target** side (`new_result_id AS other_result_id … WHERE lr.other_result_id = temp_result_id`) writes a row this query cannot see, and the case stays green.
3. **READABILITY — the header's band ledger carries one false attribution.** It credits the `903_0xx` band to `innovation-use-linked-dev-validation`, which actually uses `902_400_…`. The operative conclusion (`904_000` is free) is correct and was verified independently, but a future author picking a band from this ledger reads one wrong entry.
4. **RESILIENCE — teardown is not step-isolated.** A throw in the first `DELETE` skips the remaining cleanups and `dataSource.destroy()`. Matches the exemplar it was told to mimic; several siblings use a stronger `tryStep` pattern.

#### Leader note — bookkeeping drift found by the Reviewer

`tasks.md`'s Coverage table assigns *"leave the source untouched"* to case 2; the fixture asserts it inside case 1. Real assertions exist, so this is drift in the table, not a coverage gap. Left as-is rather than silently edited — recording it is the point.

#### ⚠️ Forward pointer to T-02 — carried into its brief, not just filed here

**Only 1 of the fixture's 4 cases can fail today.** Cases 2, 3 and 4 pass identically before and after the fix (nothing is copied yet, so "does not copy X" holds trivially). They become real gates only once T-02 lands, and are therefore **unproven under K-004**.

T-02 must probe them at red before citing them:

| Case | Input that must make it go red, once T-02 exists |
| --- | --- |
| 2 | Omit `AND lr.is_active = TRUE` from the new block, or drop `AND lr.result_id = temp_result_id` |
| 3 | Widen the `WHERE` to `lr.result_id = temp_result_id OR lr.other_result_id = temp_result_id` |
| 4 | **Cannot be probed as written** — see advisory 1. It can only go red on the FK path (if `SP_delete_result_version`'s clear were removed), never on "a copied row was present" |

A green run of cases 2–4 after T-02 is **not** evidence until each has been observed failing.

### T-01 — REOPENED (amendment A1/A2)

| Field | Value |
| --- | --- |
| Status | `[~]` — reopened after PASS |
| Date | 2026-09-11 |
| Trigger | Reviewer ADVISORY 1 and 2, **escalated to the user and approved by them** |

The first PASS was correct on its own terms and is committed (`97cdb383`). It is reopened because the Reviewer showed two of the four cases could not fail for the reason they exist — not a defect in the delivered work, a gap in what it could prove.

Per this command's rule, an advisory may not silently become a task or widen one. It was therefore **escalated as a spec gap**, the user chose to reopen, and `tasks.md` T-01 now carries the amendment explicitly. The scope change is approved and recorded, not absorbed.

**Why it was worth reopening:** this fixture is the *only* gate the bug has. Case 4 protects against the FK failure (MySQL 1451) that motivated auditing every delete routine in the first place — and as written it would have passed whether or not the copy landed.

#### T-01 amendment — result

| Field | Value |
| --- | --- |
| Status | **PASS** (2nd Reviewer verdict, no advisories) |
| Implementer attempts | 1 (amendment) |
| Total T-01 attempts | 2 — one original + one approved amendment, **zero rework-for-defect** |

**Changes:** A1 (case 3 target-side query), A2 (case 4 premise assertion), A3 (band-ledger correction). One file, +42/-11.

**Verification** — `npm run test:fixtures`:

| | Before amendment | After | Reading |
| --- | --- | --- | --- |
| Suites | 6 failed / 21 | **6 failed / 21** | no new suite broken |
| Tests failed | 46 | **47** | +1, the new A2 red |
| Tests total | 145 | **145** | unchanged → assertions added, not `it` blocks |

Case 4's new red: `expect(snapshot1Links.length).toBeGreaterThan(0)` → `Received: 0`, at **L332**, with `CALL SP_delete_result_version` at **L336**.

**Reviewer verdict: `STATUS: PASS`.** The two findings that make this verdict worth more than a green run:

1. **The failure modes are distinguishable.** An FK 1451 would be a thrown driver error out of `dataSource.query` at L336; what is observed is an assertion failure over a `SELECT` result at L332. So case 4's red is the missing copy, not the delete routine.
2. **The hazard the Leader raised was real and is closed by construction.** A1 could have been permanently red if it bound the seed's own id: case 3 seeds a row whose `other_result_id` IS the versioned result. It binds `snapshot.result_id` instead, and the snapshot is selected under `is_snapshot = TRUE` while `insertResult` always writes `is_snapshot = 0` — so the seeded row is **structurally unable** to match. The Reviewer also noted the corroboration: had the wrong value been bound, case 3 would be red; it is green.

A3 was re-verified rather than accepted on faith: an unfiltered grep for `903_0xx`/`903_000` across `test/` returns the new header and `innovation-dev-card-facts.fixture-spec.ts:56` only — the false attribution is gone and the surviving one is true.

Advisory 4 (teardown step-isolation) remains **deliberately out of scope** by user ruling; the Reviewer confirmed no `tryStep` helper was added.

#### ⚠️ Forward pointer to T-02 — updated, supersedes the one above

Cases 2 and 3 remain green-before-and-after and must still be probed at red once T-02 exists:

| Case | Input that must make it go red |
| --- | --- |
| 2 | Omit `AND lr.is_active = TRUE`, or drop `AND lr.result_id = temp_result_id` |
| 3 | Widen to `… OR lr.other_result_id = temp_result_id` (owner shape), **or** remap the target (`new_result_id AS other_result_id`) — A1 now catches the second shape too |
| 4 | **Now probeable.** It reddens today on the missing copy (A2) |

**New, and easy to miss:** because case 4 now aborts at L332 on current `main`, the delete round-trip **executes zero times** until T-02 lands. T-02 is therefore the first run in which `CALL SP_delete_result_version` is exercised against a snapshot that actually carries `link_results` rows — the FK path this whole spec was audited for. A green case 4 after T-02 is the first real evidence for it.

---

### T-02 — Migration: add the `link_results` block to `SP_versioning`

| Field | Value |
| --- | --- |
| Status | **PASS** |
| Date | 2026-09-11 |
| Implementer attempts | **1** — zero rework |
| Reviewers | **2 in parallel** (lens mode forced: the task touches migrations *and* a data-loss surface) — **both PASS** |
| Requirements | R-SPL-001, R-SPL-002, NFR-SPL-001, NFR-SPL-002 |
| Design | DD-1, DD-3, DD-4 |

**Change:** one new file, `server/researchindicators/src/db/migrations/1789149538737-addLinkResultsToVersioningSp.ts`, 2,069 lines. Nothing else in the tree.

Built mechanically per DD-4: a throwaway generator read `1788878752646-UpdateVersionSp.ts`, extracted its `up()` procedure statement as the canonical body, wrote it verbatim into the new `down()`, and wrote it again into `up()` with one block spliced in after `result_innovation_use`. The generator was deleted and never entered the repo (confirmed: no stray script in the package root or `scripts/`).

#### Verification — every figure below was re-measured by the Leader, not relayed

| Gate | Command | Result |
| --- | --- | --- |
| **NFR-SPL-001** | `diff <new down()> <old up()>` | **0 differences**, 58,092 == 58,092 bytes |
| **R-SPL-002** | `diff <new down()> <new up()>` | **exactly 1 hunk** (`797a798,810`) — the block plus its trailing separator, nothing else |
| Cold schema | `compose:test:down` → `compose:test:up` → `migration:test:bootstrap` | clean; new migration applied last |
| Fixtures (full) | `npm run test:fixtures` | **5 failed / 16 passed / 21 suites**; 45 failed / 100 passed / 145 tests |
| The spec's fixture | isolated jest run | **1 suite / 4 tests, all pass** |
| **Live routine (KZ-001)** | `information_schema.ROUTINES` on the scratch schema | `ROUTINE_DEFINITION LIKE '%INSERT INTO link_results%'` → **1**. Asserted in the database, never on the migration file |
| Lint | `npx eslint <file>` (bare — `npm run lint` carries `--fix`, K-001) | exit **0** |
| Format | `npx prettier --check <file>` | exit **0** |
| Build | `npm run build` | exit **0** |

The 5 failing suites are the pre-flight baseline set, enumerated and compared name-by-name: `innovation-use-{section-round-trip, role-isolation, result-creation, level-boundary, edit-plus-add-id-collision}`, all dying at `Nest cannot create the ResultPolicyChangeModule instance`. **No sixth failure.** `sp-versioning-objective-blocks.fixture-spec.ts` still PASS.

**Why the container was rebuilt from cold.** The Implementer's falsifier loop reverted and re-applied migrations several times against the shared scratch schema, so its green was measured on a schema state the Leader had not seen built. `compose:test:down` → `up` → `bootstrap` removes that variable.

#### Adjudicated: the Implementer's deviation from the literal verification command

T-02's brief prescribes `npm run migration:test:bootstrap && npm run test:fixtures`. The Implementer ran `npm run migration:test:execute` alone, citing **FP-49**. The Leader checked the citation rather than accepting it (K-011): FP-49 is real — `docs/specs/archive/2026-08-20-innovation-use--details-api/execution.md:1479` and `design.md:448` — and records that `migration:test:bootstrap` is **not idempotent**; a second run against an already-bootstrapped container yields `ER_TABLE_EXISTS_ERROR`, which that spec listed as a **disqualifier**. Following the brief literally would have errored. **The deviation was correct**; the recovery path FP-49 names (`compose:test:down` → `up` → `bootstrap`) is what the Leader then used for the authoritative measurement.

#### Resolved: the 368-applied vs 326-files delta (raised as an advisory by lens A)

Measured rather than reasoned:

| | Count |
| --- | --- |
| Migration `.ts` files in the repo | 326 |
| Rows in the scratch `migrations` table | 368 |
| **Migration files present but NOT applied** | **0** |
| Rows applied with no corresponding file | 42 |

`src/db/baseline/baseline.sql` seeds the `migrations` table with 42 historical rows whose files predate the baseline cut and were removed from the tree. 326 + 42 = 368 exactly. **The load-bearing fact is the zero:** every migration file in the repo is applied to the schema the fixture ran against. Recorded so the delta is not later read as a discrepancy.

#### Falsifier evidence (K-004 / KZ-014) — five probes, all observed

Four by the Implementer, each mutating the block, re-applying, and observing:

| # | Mutation | Observed red |
| --- | --- | --- |
| 1 | dropped `AND lr.is_active = TRUE` | case 2: `Expected length: 0, Received length: 1` |
| 2 | dropped `AND lr.result_id = temp_result_id` | cases 2 **and** 3 (case 2 received 6 rows, case 3 received 12) |
| 3 | remapped the target, `WHERE` left intact | case 1: `other_result_id` `Expected: 37035, Received: 37042` |
| 4 | added `link_result_id` to both lists | cases 1 and 4: `Duplicate entry '1262' for key 'link_results.PRIMARY'` |

**All four falsifiers T-02 declares in its *Input that makes it fail* list were observed red.** Each restore was verified byte-identical before the next probe.

#### Correction to the record: probe 3 did not test what T-01's A1 forward pointer describes

The Implementer reported probe 3 as reddening "case 1, not case 3 as T-01's forward pointer predicted", and drew the conclusion that the forward pointer was wrong. **Lens B established from the fixture source that this conclusion is itself wrong, and the Leader then settled it by execution.**

A1's shape (`tasks.md`; fixture comment at `sp-versioning-link-results.fixture-spec.ts:300-304`) is `new_result_id AS other_result_id … WHERE lr.other_result_id = temp_result_id` — the target remapped **and** the `WHERE` flipped to the target side, with `lr.result_id` left in position 7. Probe 3 remapped position 8 while leaving both position 7 and the `WHERE` unchanged; its own observed output proves it (the row was *found* by `WHERE result_id = <newResultId>`, which A1's shape would never produce). **Two different mutations.** The forward pointer was therefore neither confirmed nor falsified — it was not tested, and it is not a spec-text error.

**Leader probe 5 — A1's exact shape, run 2026-09-11 to discharge the claim rather than record it as open:**

```
expect(targetSideRows).toHaveLength(0);
  Received length: 1
  Received array:  [{"link_result_id": 270}]
  at fixture-spec.ts:309
```

Line 309 is precisely the assertion amendment A1 added. **A1's second query has now been observed red on the shape it was written to catch**, and the suite returned to 4/4 after a byte-identical restore (`diff` exit 0). The claim is closed by evidence, not by argument.

*Why this matters beyond bookkeeping:* it is a KZ-007 instance caught in flight. A worker's honest self-report contained a mis-attribution that would have written "T-01's forward pointer was wrong" into the permanent record, and would have left A1 — an amendment this spec paid a second review round for — as an assertion nobody had ever seen fail.

#### `ADVISORY` — recorded, non-gating, and none of it becomes a task in this spec

From lens A (conformance):

1. **DD-5's known gap gains one more instance, by design.** `delete_result` deactivates `link_results` on `result_id` only, so logically deleting a source result leaves a snapshot's copied rows active. **Reachable**, but not a new defect class: every *physical* delete path was re-audited (below) and clears both FK directions, and DD-5 rules the logical path out of scope on an explicit user ruling. Recorded so a later reader does not rediscover it as this bug.
2. **The block's line-wrapping differs from its 30 neighbours** (compact column list). Correct: `tasks.md` prescribes that SQL verbatim and DD-4 prefers mechanical transcription over re-formatting. Side benefit — the single hunk is legible at a glance. No change wanted.
3. **`design.md`'s Budget row should read ~2,070, not ~1,080** — see the tripwire note below. A documentation fix, deliberately **not** applied by this task; it is the user's call.

From lens B (SQL semantics / reliability / risk):

4. **The `full_delete_result_version` path is covered by reading only.** The fixture exercises `SP_delete_result_version` exclusively. Lens B traced `query.service.ts:56-92`'s family loop and the two-direction `DELETE` at `1787083305648:1313-1316` and **could not construct a reachable FK 1451**. Recorded because the requirements' *Defect classes* table gates only the path it tested.
5. **`SP_full_delete_results_by_platform` exists only in `baseline.sql`** (`:6883`), in no migration. It owns no `DELETE`; it cursors results and calls `full_delete_result_version` per id, so the requirements table's "covered transitively" claim is accurate. Its *live* body on Dev/Prod is whatever history put there and no static read can see it.

#### Independent findings worth keeping from the two lenses

- **Lens A corroborated both diff gates without execution tools**, which is stronger evidence than agreement would have been. It built a nine-marker line-offset profile over the three candidate bodies and showed the new `down()` is offset-identical to the old **`up()`** and diverges from the old `down()` at exactly the two `is_partner_not_applicable` lines. That was the real trap in this task: had `down()` carried the old `down()` body, the migration would revert to a two-versions-old procedure and both fixtures would still have passed.
- **Lens B confirmed the fresh-id property at its source rather than assuming it:** `baseline.sql:2183`, `link_result_id bigint NOT NULL AUTO_INCREMENT`, `PRIMARY KEY`. It also established there is **no** unique index on `(result_id, other_result_id, link_result_role_id)`, so the copy cannot collide.
- **Lens B re-derived the delete-path audit from the *latest* declaration of each routine** (`1787083305648-AmendLifecycleRoutinesForInnovationUse.ts`) instead of trusting the requirements table, checking the total first (66 `link_results` occurrences across 22 migration files) per K-014. All four rows of that table hold.
- **Re-entrancy is closed upstream of the block, by construction:** the source select carries `AND r.is_snapshot = FALSE`, so a snapshot can never be versioned; a duplicate call hits `SIGNAL SQLSTATE '45001'` before any `INSERT`; and `new_result_id` is captured by `SET new_result_id = last_insert_id()` immediately after the `results` insert, so the 30 intervening inserts cannot poison it.
- **Audit-column carry-over matches three sibling blocks verbatim**, including copying `lr.is_active` under a `WHERE lr.is_active = TRUE`. The redundancy is the house pattern; omitting it would have been the inconsistency.
- **No application behaviour changes.** Duplicate-result Rule 4 (`save-all-sections.service.ts:405-411`) queries `other_result_id` with no `is_active` filter, but the copy reproduces only `other_result_id` values the source row already contributes, so `protectedResultIds` is set-identical before and after — precisely because DD-2 declined to copy the target side.

#### Budget tripwire — breached, cause identified, escalated

| Metric | Budgeted | Actual |
| --- | --- | --- |
| Tasks | 2 | **2** ✅ |
| Review rounds | 1 | **1** (2 parallel lenses, zero rework) ✅ |
| LOC | ~1,080 | **2,069** ⚠️ |

**The cause is an arithmetic error in the budget, not scope creep.** `design.md`'s Budget row counts the verbatim re-declaration **once** (~1,020), but NFR-SPL-001 — on the same page — requires `down()` to restore the body verbatim, which forces it **twice**. The genuinely new logic is **13 lines**, exactly as budgeted. Both lenses independently agreed with this characterisation. Flagged to the user before the Implementer was spawned, not after.

#### Requirements covered

| ID | Discharged by |
| --- | --- |
| R-SPL-001 | the block; fixture cases 1–4 green; five falsifiers observed red |
| R-SPL-002 | one-hunk body diff, re-measured by the Leader and corroborated structurally by lens A |
| NFR-SPL-001 | zero-difference diff of new `down()` against the deployed `up()`, with the `is_partner_not_applicable` discriminator confirming it is the old `up()` and not the old `down()` |
| NFR-SPL-002 | case-insensitive DDL sweep over the file returned zero matches; only four `DROP PROCEDURE` / `CREATE PROCEDURE` statements |

#### What this task does NOT prove (KZ-017)

- **Nothing about Dev or Prod.** Only the disposable scratch schema on `127.0.0.1:3307` was exercised. Applying this migration is a separate human decision (K-015) and is explicitly outside T-02's done criteria.
- `npm test` (`rootDir: src`) never runs `test/fixtures/`. No green from it is evidence for this spec.
- Both Reviewers are read-only and ran no commands; every runtime figure in their verdicts is inherited from the Leader's measurements. Lens A's corroboration of the two diff gates is structural (offset isomorphism), not byte-level.
- A transcription error elsewhere in the ~1,020 re-pasted lines is invisible to lens B's greps; it is caught only by the Leader's zero-difference diff, which is the sole gate for that defect class.
- Lens B read 3 of the 31 sibling blocks, and audited no STAR client rendering or OpenSearch/report projection that may now see snapshot rows it never saw before.

#### Constitution Impact

**None.** No module created, no module boundary moved, no public surface changed. One append-only migration in an existing folder. No child guide is needed or made stale. A CodeGraph re-index is pending as usual (the new file is a migration, not a symbol surface agents navigate).
