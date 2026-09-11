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
