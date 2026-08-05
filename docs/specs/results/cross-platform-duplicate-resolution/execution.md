# Execution Log — results / cross-platform-duplicate-resolution

## 1. Document Control

- **Module:** results
- **Spec id:** 2026-08-cross-platform-duplicate-resolution
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked design:** [`./design.md`](./design.md) (rev 2, post-correction)
- **Linked tasks:** [`./tasks.md`](./tasks.md)
- **Linked review ledger:** [`./judgment.md`](./judgment.md)
- **Branch:** `AC-1641-Integration-improvements`
- **Approval mode:** not declared in the spec's Document Control → **interactive** (the Leader pauses at each continue/pause gate)
- **Created:** 2026-08-04

### 1.1 Provenance note — why this file starts at T-11

This log was created during the execution of **T-11**. Tasks **T-01 … T-10 and T-12** were executed in earlier sessions of this spec and recorded their audit evidence **inline in `tasks.md`** — each task carries a `**Result (date)**` / `**Progress**` block with its files, verification command, measured figures, declared deviations, and declared limits. That evidence is not reproduced here; `tasks.md` remains its canonical location, and the 13 `[SPEC:results/cross-platform-duplicate-resolution]` commits on this branch are its git-side trail.

From T-11 onward the audit trail lives here, in the format `/akili-execute` defines.

---

## 2. Task Execution History

<!-- entries appended below, newest last -->

### T-11 — E2E: hard delete of a fully-populated result without errno 1451

- **Status:** `[~]` — **PAUSED BY OWNER**, not failed, not reviewed
- **Date:** 2026-08-04
- **Implementer attempts:** 1 (stopped mid-flight, before it reported)
- **Reviewer verdict:** none — the Reviewer was never spawned, so **no independent audit exists for this code**

#### Why it is paused

The owner stopped the loop to validate T-11 manually, judging the agent-run proof not worth its token cost. This is an owner decision recorded as-is, not a blocker discovered by the loop.

#### Environment history (the expensive part of this task, recorded so it is not re-derived)

1. T-11 specifies the `TEST` datasource (`ARI_TEST_MYSQL_*` → `alliance_main_automation`). **That host is dead at the network level.** With the CGIAR VPN connected and routing correct (`utun67` → `172.30.1.254`), it returns 100% ICMP loss and times out on every port tried (3306, 3307, 1433, 22, 443). The CORE dev DB on the same tunnel connects instantly. **This is a dead/firewalled host, not a VPN fault** — it needs an infra owner.
2. A local disposable MySQL built from the 307-migration chain was **evaluated and rejected**: per T-01, `project_indicators_results` exists in **no migration at all** and lives only in the live schema. A from-scratch database would silently omit the feature's only `ON DELETE CASCADE` relationship — precisely the case T-05 protects. That is the "thin seed" failure one level up: a **thin schema**, yielding a green run that proves nothing.
3. Target was therefore resolved to the **CORE dev DB** with owner authorization, under a mandatory transaction-and-always-rollback harness (no DDL, seeded-id-scoped assertions, marker prefix). The enabling property is T-07's finding that `full_delete_result_version` contains no implicit-commit statement, so its DML participates in the caller's transaction.
4. **Dev schema verified read-only and complete** — no migration outstanding: `full_delete_result_version` **44/44** DELETE targets · `result_duplicate_resolution_log` present · `sync_process_logs.omitted_duplicate_records` present · 4/4 `app_config duplicate_resolution.*` rows · **38/38** FKs referencing `results` · `project_indicators_results` present. All six relevant migrations recorded in the `migrations` table.
5. Migration pre-approval was **withdrawn** mid-task at the owner's instruction: the owner applies all migrations manually. The Implementer was barred from any migration or DDL and instructed to stop-and-report on any missing schema.

#### Artifacts left on disk (untracked, uncommitted, unreviewed)

| File | Lines |
| --- | --- |
| `server/researchindicators/test/duplicate-resolution.e2e-spec.ts` | 590 |
| `server/researchindicators/test/support/duplicate-resolution-seed.util.ts` | ~600 (23.7 kB) |

Three cases were authored, each wrapped in a rolled-back transaction:
1. hard-deletes a fully-populated result across every enumerated table with no errno 1451
2. a dry-run plan mutates nothing, measured by row counts before and after
3. retains and reports a STAR-linked loser even with hard delete armed

**No production source was modified** — the scope bound held.

#### Verification status — READ THIS BEFORE TRUSTING ANYTHING ABOVE

| Check | Result |
| --- | --- |
| `npm test -- --silent` (unit suite) | reported green by the Implementer, **unconfirmed by me** |
| `npm run test:e2e` | **NEVER RUN** |
| `npx tsc --noEmit` | not confirmed |
| `npm run lint -- --quiet` | in flight when stopped (**note: carries `--fix` and mutates files**) |
| Seeded table count vs T-01's 38-FK enumeration | **NEVER VERIFIED** — this is T-11's disqualifying-evidence clause |
| Reviewer audit | **NEVER RAN** |

**None of T-11's three acceptance criteria are met.** The task's own disqualifier states that a seed not covering T-01's full enumeration makes a green run evidence of a thin seed rather than a complete function — and here there is no run at all. The authored spec is therefore **unvalidated scaffolding, not proof**. It must not be read as passing work.

#### Limits still open, inherited from earlier tasks

These were explicitly deferred to T-11 and remain **unclosed**:

1. **T-02** — completeness of the 44-target function, including the *transitive* dependency `result_pool_funding_alignment_sp`.
2. **T-07** — whether MySQL actually rolls back a mid-family delete failure (only propagation was asserted).
3. **T-07** — whether a snapshot carries its live row's `report_year_id`. If it does not, year scoping *excludes* snapshots and creates the orphans T-07 exists to prevent.
4. **T-05** — the STAR-protection query shape has still never executed against a database.

#### Next step

Superseded by the Pivot Record below. The owner validated manually; three of the four limits closed and the fourth **fired the tripwire**.

---

## Pivot Record: T-07 (surfaced during T-11 manual validation)

- **Date:** 2026-08-04
- **Raised by:** the owner's manual validation, replacing the agent-run e2e
- **Status:** **BLOCKS `apply` against real data.** Awaiting the owner's decision on direction.
- **Trigger:** the tripwire T-07 wrote into `query.service.ts:43-47` — *"If snapshots turn out to be stored under a different year, they would land here instead of in `targetIds`, and a non-empty list on a live seed is the signal to stop and re-derive the scope rather than delete."*

### What was measured

| Check | Result | Verdict |
| --- | --- | --- |
| Tables with a `NO ACTION` FK not covered by `full_delete_result_version` | **0** | ✅ T-02 coverage complete — no errno 1451 |
| `START TRANSACTION` → delete → `ROLLBACK` restores the row | **yes** | ✅ T-07 rollback confirmed against real MySQL |
| Snapshots with no live row sharing their `report_year_id` | **469** | ⚠️ split below |
| → of those, **a live row exists under a different year** | **451** | ❌ **THE DEFECT** |
| → of those, no live row exists at all | 18 | pre-existing orphans, out of scope |
| Snapshots with `report_year_id IS NULL` | 0 | confound eliminated |
| Distinct years per `result_official_code`+`platform_code` | 13,839 codes @1 · 139 @2 · 103 @3 · 31 @4 · 3 @5 · 1 @7 | 277 multi-year codes |

**A first-pass query returned 451 by cross-joining live rows against snapshots across years. That number was an artifact and was discarded** — it double-counted legitimate multi-year codes. The 451 recorded above comes from the corrected formulation (a snapshot with a live counterpart but no year match) and is a different quantity that coincidentally shares the value. Recorded because the coincidence is misleading on re-reading.

### The defect

`findResultFamilyIds` (`query.service.ts:106-113`) scopes the family to `result_official_code + platform_code + report_year_id`. **451 snapshots carry a `report_year_id` that no live row of their own identity shares** — consistent with a snapshot retaining the historical year it was taken for while its live row advances to the current year.

Deleting such a live row therefore expands to a family that **excludes its own snapshots**, leaving them in `results` with no live counterpart: the permanent-invisibility orphan T-07 was written to prevent, produced by T-07 itself.

**This regression was introduced by T-07.** Before it, the family was `official_code + platform_code` with no year, so a delete swept every snapshot — no orphans, but it destroyed other years' live rows, which is the bug T-07 correctly fixed. T-07 applied one filter to two structurally different kinds of row: year scoping is right for **live siblings** and wrong for **snapshots**, which are versions of a result rather than reporting-year rows of it.

### Why this is a Pivot and not a rework

The implementation faithfully matches `design.md` §5. The **design** is wrong: it assumed a snapshot carries its live row's `report_year_id`, and that assumption is false in 451 live cases. Retrying T-07 against the same design reproduces the defect. No rework attempt was consumed.

### Scale — this is the norm, not an edge case

| Measure | Value |
| --- | --- |
| Snapshots total | **574** |
| Unreachable by year-scoped expansion | **469 (82 %)** |
| Reachable | 105 (18 %) |

Four out of five snapshots would be orphaned by any live-row deletion.

### `version_id` eliminated as the parent link

`results.version_id` is populated on **0 of 574** snapshots — always NULL. There is **no explicit snapshot→parent link in the schema**. Direction 1 below is therefore closed.

### The data model, measured

| Measure | Value |
| --- | --- |
| Live rows | **14,108** |
| Identities (`result_official_code` + `platform_code`) with **more than one live row** | **4** |

**99.97 % of identities are "one live row + N historical snapshots."** The live row carries the current `report_year_id`; snapshots retain the year they were taken for. That is exactly the shape that makes year-scoped expansion miss them.

### Chosen direction — RECOMMENDED, pending owner approval

**Year scoping is correct for live siblings and must not apply to snapshots.** Split the family resolution by row kind:

- `live_siblings` = same identity, `is_snapshot = FALSE`, **year-scoped** (preserves T-07's real fix — deleting a 2024 loser must not destroy the live 2025 row)
- `snapshots` = same identity, `is_snapshot = TRUE`, **no year filter** (a snapshot is a version of the result, not a reporting-year row of it)
- `targetIds` = snapshots first, live rows last (existing ordering rule unchanged)

**Guard for the 4 ambiguous identities:** when an identity has more than one live row, snapshot ownership is undecidable without a parent link, so an unscoped sweep could destroy a surviving live row's version history. Those must **refuse deletion and flag for manual handling** rather than guess. 4 identities out of 14,108 is a precisely bounded exclusion.

**`siblingIdsOutsideReportYear` must be narrowed to live rows only.** As written it counts snapshots, so post-fix it would fire on virtually every delete and become noise — a tripwire that always trips gets waived, which is the failure mode `tasks.md` §T-12 already warns about.

Rejected alternatives: sweeping every snapshot with **no** guard (destroys version history for the 4); and blocking whenever `siblingIdsOutsideReportYear` is non-empty (safe but leaves 82 % of snapshots permanently undeletable).

### Work this implies

1. `design.md` §5 — record the corrected scope rule and these measurements.
2. `query.service.ts` — split live/snapshot resolution, add the multi-live-row guard, narrow `siblingIdsOutsideReportYear`.
3. `query.service.spec.ts` — cases for: snapshot under a different year is swept; live sibling in another year is not; multi-live-row identity refuses.
4. T-07's four per-caller verdicts re-derived under the new rule.
5. T-11's e2e gains a case asserting a differing-year snapshot is not orphaned.

No migration required — this is query-shape only.

### Direction approved by the owner 2026-08-04. `design.md` §5.4.1 + D-dup-17 written. Execution resumed.

---

## T-07 (rework) — Attempt 1: Reviewer **FAIL**

- **Date:** 2026-08-04 · **Implementer:** sonnet @ `xhigh` · **Reviewer:** opus @ `high`
- **Files changed:** `query.service.ts` (+spec), and three forced caller touches — `result-duplicate-resolution-log.entity.ts` (added `DuplicateRowOutcome.REFUSED`), `duplicate-resolution-runner.service.ts` (maps `REFUSED` instead of falling through to `NOOP`), `result-duplicate-resolution-log.service.ts` (warns on `REFUSED`) + their specs.
- **Implementer verification:** `npm test -- --silent` → **329 suites / 2211 tests green**; `npx tsc --noEmit` clean; `npm run lint -- --quiet` clean with `git status` byte-identical. Regression test confirmed **RED against pre-fix code** by reverting `query.service.ts` to `HEAD` with the new fixture (`findResultFamilyIds(100)` returned `[100]` — the snapshot excluded), then restoring.

### What the Reviewer confirmed correct

The core split; `deleteResultFamily` never puts a sibling live row in `targetIds`, so **T-07's original cross-year destruction is not reintroduced**; ordering survives; the refusal genuinely touches nothing (returns before the snapshot query and any routine call, inside the transaction); both `FOR UPDATE` ranges are index-bounded and consistently ordered; and the guard **is** reachable on every delete path — `findResultFamilyIds` has no production caller besides `resolveResultDeleteScope`, and both delete entry points funnel through `deleteResultFamily`, which re-derives under lock.

### FAIL issues (verbatim, carried to attempt 2)

**1 · Rows with `is_snapshot IS NULL` fall into neither bucket — guard blind spot, over-deletion, and a regression introduced by this diff.**
Every new predicate is a concrete boolean (`is_snapshot = 0`/`= 1` at `query.service.ts:381,401`; `is_snapshot: false`/`true` at 132, 188, 197). A NULL row matches none. Consequences: (a) identity with live row A (`= 0`) and row B (NULL, semantically live) → seed A gives `liveRows = [A]`, length 1, **no refusal** → every snapshot of the identity is swept — exactly the harm D-dup-17 exists to prevent, walking through the guard; (b) a NULL-`is_snapshot` seed takes the live branch, is never locked by either `FOR UPDATE`, and sweeps all snapshots while the real live row survives; (c) a NULL row is never swept as a snapshot either, so it orphans. **Pre-diff neither path had an `is_snapshot` predicate, so NULL rows were included and ordered live — the diff removes them from the world.** Reachable: `dedupScopeSql` (`public-link-normalizer.util.ts:161-163`) uses `COALESCE(is_snapshot, FALSE) = FALSE`, so this spec's own matching side admits NULL rows as live participants and one can be elected a loser. Column is `nullable: true`, no DB default; AICCRA is loaded by a raw MySQL script with no ARI code path enforcing it.
*Violated:* `design.md` §5.4.1 (guard) and §5.4 bullet 3 (orphan prevention); the T-04 precedent in `public-link-normalizer.util.ts:154-163`.
*Remediation:* partition the identity **exhaustively** with `COALESCE(is_snapshot, FALSE)` on both sides so every row lands in exactly one bucket; restore the deleted defensive case asserting a NULL row buckets live and, with a second live row present, **refuses**.

**2 · `REFUSED` never reaches the dry-run plan — the artifact that *is* the DC-5 human gate.**
Both consumers discard `refusalReason`. `duplicate-resolution-runner.service.ts:121-131` builds the plan from `scope.targetIds` only; for an ambiguous loser that is `[]`, the row is written as `PLANNED` with `expandedResultIds: []`, and in DRY_RUN `recordOutcomes` never runs — so the operator's review artifact **claims a deletion is planned for a row that will always refuse**, with nothing saying "needs manual handling". `duplicate-resolution.service.ts:229-237` has the same hole: the group reports `RESOLVED` with empty `toDelete` and no reason.
*Violated:* `design.md` §5.4.1 ("flagged for manual handling"); R-RES-009 AC.3; D-dup-4 (the reviewed plan is the only gate).
*Remediation:* carry `scope.refusalReason` into the plan tuple; emit `DuplicateRowOutcome.REFUSED` with the reason instead of `PLANNED`; surface it in the plan DTO. Apply re-derives the same verdict, so the digest is unaffected.

**3 · `REFUSED` is invisible at the three rollback callers and reported as success by the bulk endpoint; the per-caller re-derivation was not actually done in the diff.**
All four discard `ResultDeleteOutcome[]`. `results.service.ts:355-367` returns the array to the operator as deleted even when every row refused. `save-all-sections.service.ts:424-433` only catches a *thrown* error, so a refused rollback leaves the created row stored with no log line; `results.service.ts:960` and `prms.opensearch.service.ts:163` identical. A silently retained row on an ambiguous identity is a live row the matcher sees again next run.
*Violated:* Pivot Record "Work this implies" item 4 and `tasks.md` T-07; R-RES-009 AC.3.
*Remediation:* state the four verdicts, and have each caller inspect outcomes and `warn` via `LoggerUtil` on `REFUSED`. For the bulk endpoint, exclude refused ids from the returned "deleted" set or annotate them.

**4 · The NULL-year live-sibling predicate is silently dropped by TypeORM; the JSDoc and the test assert the opposite.**
`query.service.ts:187` passes `report_year_id: seed.report_year_id ?? null`. TypeORM 0.3's find-options builder skips null/undefined keys (`SelectQueryBuilder.js:2468`: `if (where[key] === undefined || where[key] === null) continue;`), so for a NULL-year seed the year predicate is **removed**, not rendered `IS NULL`. The JSDoc at 161-164 claims NULL-safety; the covering test (`query.service.spec.ts:295-316`) passes only because the fake repository compares with `===` — against a real database it returns `[301, 300, 302]` and fails its own `not.toContain(302)`. Blast radius is contained today (the guard means the method is only reached with one live row), but the specified predicate is not the one that executes.
*Violated:* `design.md` §5.4.1 `live_siblings` row; §10 / KZ-001.
*Remediation:* use `IsNull()`; correct the JSDoc; make the fixture treat a `null` where-value the way the ORM does, so the test can only pass for the right reason.

### ADVISORY (recorded, never gates)

- **Reliability:** `summarizeRun` derives `deleted/protected/failed/noop` only — a refusal sits in the `outcomes` JSON but in none of the counts, so counts no longer sum. Derive a `refused` figure from the JSON; no schema change.
- **Risk:** `removeFromSearchIndex(plan.targetIds)` removes *planned* ids, not deleted ones. Pre-existing; the plan/execute split widens the window. Consider indexing on returned `DELETED` outcomes.
- **Readability:** `orderSnapshotsFirst` still declares `is_snapshot?: boolean | null` and routes non-`true` live, but the test documenting that tolerance was deleted.
- **Evidence:** no coverage figure restated for this change (T-07 previously reported 98.11% statements on this file; the 60% floor is not at risk).

### Leader adjudication

All four are in scope and none is adjudicated away. Issues 2 and 3 were declared by the Implementer as deferrals; the Reviewer correctly ties them to D-dup-4 and R-RES-009 AC.3 — introducing `REFUSED` without surfacing it to the human gate makes the gate report a deletion that cannot happen, which is a defect of *this* change, not of T-09.

**Effort not bumped, and this is a deliberate deviation.** The rework rule says bump one level (`xhigh` → `max`), but the tier↔effort rule forbids `max` on a T2 model and says escalate the tier instead — and escalating the Implementer to opus would collapse `author ≠ auditor`, since the Reviewer is opus. Attempt 2 therefore runs sonnet @ `xhigh` again, compensated by fully verbatim structured feedback plus attempt history. Recorded rather than silently resolved. **The same constraint applies to attempt 3.**

---

## T-07 (rework) — Attempt 2: Reviewer **FAIL** (1 issue; all four attempt-1 issues CLOSED)

- **Date:** 2026-08-04 · **Implementer:** sonnet @ `xhigh` · **Reviewer:** opus @ `high`
- **Files changed:** 8 production + 8 spec — `query.service.ts`, `duplicate-resolution-runner.service.ts`, `duplicate-resolution.service.ts`, `dto/duplicate-resolution.dto.ts`, `result-duplicate-resolution-log.service.ts`, `results.service.ts`, `save-all-sections.service.ts`, `prms.opensearch.service.ts`. No migration.
- **Implementer verification:** `npm test -- --silent` → **329 suites / 2227 tests green** (run twice); `npx tsc --noEmit` clean; `npm run lint -- --quiet` clean with `git status` re-checked; `query.service.ts` coverage **97.46% stmts / 85.71% branch / 96.15% funcs / 98.63% lines**. Every new assertion RED-checked by reverting its specific fix; the rewritten spec run against attempt-1 source failed **30 of 36**.

### All four attempt-1 issues CLOSED (Reviewer-confirmed)

1. **NULL `is_snapshot`** — every bucket predicate is now `COALESCE(is_snapshot, FALSE) = FALSE`/`= TRUE` (`query.service.ts:147,222,234,432,452`). Partition exhaustive and **matched to `dedupScopeSql`**, so the guard counts what the matcher counts. TypeScript side agrees end to end.
2. **`REFUSED` in the dry-run plan** — emitted in `plannedOutcomes` *before* `recordGroup`, so it lands in the audit row in `DRY_RUN` where `recordOutcomes` never runs. DTO gained `refused: number[]`.
3. **`REFUSED` at the callers** — all four inspect outcomes and warn; the bulk endpoint excludes refused ids from its returned set.
4. **NULL-year predicate** — now literal SQL. **The T-04 literal-`?` hazard was specifically checked and is absent**: the `IS NULL` branch sends 2 `?` with 2 params, the `= ?` branch 3 with 3; tests assert exact SQL text *and* exact param arrays, so a parameter shift cannot pass silently.

Also cleared: injection/parameterization (all identity values bound); sargability (index range on the leading column, a handful of rows — not a regression, the pre-diff lock query could not use `is_snapshot` from the index either); lock ordering (no new deadlock ordering); bucketing exhaustiveness; fixture fidelity under KZ-001.

### FAIL issue (verbatim, carried to attempt 3)

**The "self-heal" path deletes a family the STAR guard never evaluated, the audit record does not list, and OpenSearch is never told about.**

`duplicate-resolution-runner.service.ts:239-244` widens the delete-loop lookup to match `PLANNED` **or** `REFUSED`, and the loop's only skip is `if (plan.protectedIds.length) continue;`. For a refused loser `scope.targetIds` is `[]`, so `starRelationships.evaluate([])` short-circuits to no protection, `protectedIds.length` is 0, the loop does **not** skip, and `deleteFullResultById` is called. Normally `deleteResultFamily` re-refuses under `FOR UPDATE`. But if the second live row disappeared between `resolveResultDeleteScope` (line 136, outside any transaction) and the lock (line 427), the delete proceeds and destroys the seed **plus every snapshot of the identity** — a set on which **zero** ids were ever passed to `StarRelationshipService`. Then `anyDeleted` is true so `removeFromSearchIndex([])` leaves the deleted rows in the index, and `finalOutcomes[index]` keeps `expandedResultIds: []` while `outcome` becomes `DELETED` — `recordOutcomes` writes `deleted_count: 1` against an empty expanded set, so **the ids actually destroyed appear in no audit record, on the one path where the audit record is the only surviving trace.** The behavior is test-locked at `duplicate-resolution-runner.service.spec.ts:413-430`.

*Violated:* R-RES-004 (protection evaluated for **every** id in the resolved target set — the guard is the only protection, per design §12.1); R-RES-008 AC.3 (apply deletes exactly the fully expanded set of the confirmed plan); R-RES-003 AC.3 / R-RES-009 AC.1 / D-dup-2 (every deletion recorded, naming the rows); §5.4.1 + D-dup-17 (ambiguous identities are *flagged for manual handling*, and auto-deleting them the moment ambiguity clears is not that).

*Remediation:* add `if (plan.refusalReason) continue;` beside the `protectedIds` skip and revert the `findIndex` to `PLANNED` only. The plan-time `REFUSED` then survives into `recordOutcomes`, and a cleared ambiguity is picked up by the **next** plan run — scoped, STAR-guarded, digested, human-reviewed, de-indexed. Nothing is lost: the safety-critical direction (`PLANNED` at plan time → ambiguous under lock → `REFUSED`) still flows through `deleteFullResultById`. Replace the spec case at 413-430 with one asserting a refused plan entry is **not** passed to `deleteFullResultById` and stays `REFUSED`.

### ADVISORY (recorded, never gates)

- **`findLiveRowsForIdentity` has no `is_active` predicate**, so a soft-deleted row counts as a second live row and refuses the identity, while `dedupScopeSql` excludes it from matching. OQ-4 measured 21 AICCRA rows at `is_active = 0`. Safe direction, but **the "4 of 14,108" bound in §5.4.1 may understate the refusal population** — measure in the T-12 dry run before an operator reads a refusal as an anomaly.
- Plan summary has `rowsToDelete` but no `rowsRefused`; an operator reviewing 116 groups must scan every group's `refused` array. `summarizeRun` gained the count — mirror it in `buildPlan`.
- `removeFromSearchIndex(plan.targetIds)` de-indexes plan-time ids (pre-existing, widened by the plan/execute split).
- `resolveResultDeleteScope` issues five queries on a live seed; `findResultFamilyIds` re-fetches the seed and re-runs the live-rows query the caller just ran.
- A NULL `platform_code` makes plan and apply diverge (unreachable from the sweep, which requires `platform_code IN (…)`).
- A structural `?`-count-equals-param-count check in the fixture's `query` mock would make the T-04 property hold for statements added later, not just the two asserted.

### Leader adjudication

The single FAIL stands. The self-heal was **not** in the Reviewer's attempt-1 remediation — the Implementer added it on its own judgment, and it is the one place where apply can diverge from the artifact the human approved. Proceeding to **attempt 3 of 3**; the remediation is two lines plus a test swap.

---

## T-07 (rework) — Attempt 3: Reviewer **PASS** ✅

- **Date:** 2026-08-04 · **Implementer:** sonnet @ `xhigh` · **Reviewer:** opus @ `high`
- **Files changed:** exactly two — `duplicate-resolution-runner.service.ts` + its spec. `query.service.ts` untouched (already cleared in attempt 2).
- **Verification:** `npm test -- --silent` → **329 suites / 2226 tests green**; `npx tsc --noEmit` clean; `npm run lint -- --quiet` clean with `git status` re-checked before and after. **RED-check performed:** reverting the service hunk to attempt-2 shape with the new spec in place fails on `expect(jest.fn()).not.toHaveBeenCalled()` / `Received number of calls: 1` — the exact signature the new test must produce.

### The fix

`if (plan.refusalReason) continue;` beside the existing `protectedIds` skip, and `findIndex` reverted to match `PLANNED` only. The plan-time `REFUSED` outcome now survives untouched into `recordOutcomes`; a cleared ambiguity is picked up by the **next** plan run, where it is scoped, STAR-guarded, digested, human-reviewed and de-indexed like any other deletion.

### Reviewer PASS summary

The attempt-2 blocking issue is closed **at the only reachable path**. Verified point by point:

1. **Closed.** `deleteFullResultById` is invoked from exactly one place in this service, now behind the skip. `duplicate-resolution.service.ts` routes every deletion through `runner.applyGroup`, and its `collectGroups` already pushes refused losers to `refusedLoserIds` and `continue`s, so they enter neither `toDelete` nor the digest. The fix **restores agreement between the plan artifact and apply**, which is what R-RES-008 AC.3 actually requires — under attempt 2, apply could destroy a family present in neither.
2. **The apply-time `refused` branch is live and correct, not dead code.** `deleteResultFamily` re-derives the live-row count under `FOR UPDATE` independently, so a row unambiguous at plan time that gains a second live row before the lock still returns `REFUSED`. Covered by the pre-existing test at spec 319-332. `anyDeleted` is false there, so `removeFromSearchIndex` is correctly not called.
3. **`findIndex` returning `-1` is unreachable.** Only the `plans.map` segment can carry `PLANNED`; every non-skipped plan produces exactly one such entry, and each iteration rewrites the entry it consumed — so even duplicate loser ids resolve 1:1.
4. **The two-test removal was correct.** The second test asserted `deleteFullResultById` *was* called for a plan-time-refused scope — the same defect from the positive side; leaving it would have made the suite contradict itself. The legitimate behavior it also covered survives at spec 319-332. Test arithmetic corroborates (2227 → 2226).
5. **R-RES-009 AC.1 satisfied.** `REFUSED` is written before `recordGroup`, so it lands in the audit row even in `DRY_RUN` where `recordOutcomes` never runs. Counts stay consistent; `summarizeRun` derives `refused` from the stored JSON; `logNotableOutcomes` runs unconditionally and warns "Needs manual handling". The shared reason string makes plan-time and apply-time refusals read identically to an operator.
6. **No regression** in `PROTECTED` / `PLANNED` / `OMITTED` / `FAILED`.

### ADVISORY (recorded, never gates — carried forward, not actioned)

- `finalOutcomes[index]` is written without an `index >= 0` check. Unreachable today, but `finalOutcomes[-1] = {...}` would silently set an array *property* and drop the outcome from the audit record — an invisible failure mode. An `if (index < 0) continue;` would make the invariant local rather than derived from three code paths.
- `ApplyGroupReport` exposes `deleted`/`protectedRows`/`failed` but no `refused`; `buildPlan` likewise has no `rowsRefused`. `summarizeRun` already computes it — mirror it in both for symmetry.
- A `REFUSED` row carries plan-time `expandedResultIds` though nothing was deleted (same semantics as `PROTECTED`). **Worth a line in the runbook so an operator does not read that list as "destroyed".**
- `findLiveRowsForIdentity` has no `is_active` predicate, so a soft-deleted row counts as a second live row and refuses the identity, while `dedupScopeSql` excludes it from matching. OQ-4 measured 21 inactive AICCRA rows — **the "4 of 14,108" bound in §5.4.1 may understate the refusal population. Measure in the T-12 re-run.**
- `removeFromSearchIndex(plan.targetIds)` de-indexes plan-time ids (pre-existing, widened by the plan/execute split).
- A structural `?`-count-equals-param-count assertion in the fixture's `query` mock would extend the T-04 guarantee to statements added later.

### Four per-caller verdicts — re-derived under §5.4.1 (supersedes the pre-pivot table in `tasks.md`)

| Caller | Verdict under the corrected rule |
| --- | --- |
| `results.service.ts` bulk `delete-results-by-parameters` | Sweeps the result's whole version history plus its own year-scoped live row — correct: "delete this result" should take its versions. Warns on `REFUSED` and **excludes the refused id from the returned "deleted" set**, so the operator is never told a refusal was a deletion. |
| `results.service.ts` AI-report rollback | Same rule. Warns on `REFUSED`; does not throw; the row correctly stays in place. |
| `prms.opensearch.service.ts` sync rollback | Same. Warns; does not throw. |
| `save-all-sections.service.ts` winner rollback | Same; its own lookup already keys on `report_year_id`. Warns in `.then()` — correct, because a refusal **resolves** rather than rejects, so the existing `.catch()` would never have seen it. |

**Known consequence, accepted:** if a row being rolled back belongs to one of the ambiguous identities, the refusal applies there too and the just-created row is left in place rather than removed. Softening it would mean guessing for rollback but not for the sweep — an inconsistency the design does not sanction.

### Outcome

**T-07 PASSES on attempt 3 of 3.** The pivot is closed: the 451-snapshot orphaning defect is fixed, the ambiguous-identity guard is exhaustive and matched to the matcher, and `REFUSED` is visible in the plan, the audit record, the logs and all four callers.

Committed as `c139608c`.

---

## Session close — T-11 parked for manual validation (2026-08-04)

The owner elected to validate T-11 manually in a later session. **Not critical now, but it is a release gate:** `apply` against real data is already blocked by OQ-7 and OQ-8, so nothing destructive can run regardless — T-11 gates turning the feature on, not the safety of the code at rest.

### What the owner's manual validation already closed

| Limit | Result |
| --- | --- |
| T-07 real MySQL rollback | ✅ delete inside a transaction, `ROLLBACK`, row restored |
| T-07 snapshot `report_year_id` assumption | ✅ **disproved** — drove the pivot, now fixed |
| T-05 STAR protection query shape | ✅ exercised against live data |
| T-02 delete-function coverage | ⚠️ **partially** — see the caveat below |

### ⚠️ Caveat on the coverage check — do not read it as full proof

The `information_schema` query that returned **0 uncovered tables** matched table names against the function body with `ROUTINE_DEFINITION NOT LIKE CONCAT('%', TABLE_NAME, '%')`. Two blind spots:

1. **Substring false-positives.** A table is reported covered if its name appears *anywhere* in the body — including as a substring of a longer table name. `result_pool_funding` would be reported covered by a `DELETE FROM result_pool_funding_indicator_mapping` line. Several tables in this schema nest that way.
2. **One level only.** It enumerates FKs referencing `results` directly. It cannot see the **transitive** closure — the class that produced `result_pool_funding_alignment_sp` in T-02, a table that does not reference `results` at all and was invisible to T-01's one-level inventory.

So the coverage evidence is *strong but not conclusive*. **Only T-11's seeded delete against real FK constraints closes it** — that is precisely why the task exists and why it is unmockable.

### Artifacts on disk — untracked, unreviewed, and now partly STALE

`server/researchindicators/test/duplicate-resolution.e2e-spec.ts` (590 lines) + `test/support/duplicate-resolution-seed.util.ts`, three rolled-back-transaction cases.

**Treat as a draft, not as work to resume from unexamined.** They were authored *before* the pivot, against the old whole-family year-scoping rule that §5.4.1 has since replaced, and they never executed. Whoever picks T-11 up should re-derive them against the corrected scope rather than trust them.

### What T-11 still owes

- A seeded result with at least one row in **every** table T-01 enumerated — **including the transitive set** — hard-deleted with no errno 1451 and zero rows left in every child table. State the seeded table count; a thin seed makes a green run meaningless.
- A case asserting a **snapshot under a different `report_year_id` is swept, not orphaned** (the pivot's regression, at e2e level).
- A case asserting an **ambiguous identity (>1 live row) refuses** end to end.
- Dry-run row-count invariance, scoped to seeded ids.

**Target:** the dev DB with the transaction-and-always-rollback harness (no DDL — an implicit commit destroys the guarantee). The `TEST` datasource `alliance_main_automation` is **dead at the network level** and needs an infra owner; that is independent of this spec.

### Spec status at session close

**11 of 12 tasks `[x]`.** T-11 `[~]`. `apply` against real data blocked by OQ-7, OQ-8, and T-11.

### Consequences

- **`apply` against real data stays blocked**, alongside the already-open OQ-7 and OQ-8.
- **T-07 reopened to `[~]`.** Its year-scoping decision table and its four per-caller verdicts must be re-derived, since all four callers inherit this scope.
- T-11 remains `[~]`; its e2e must gain a case asserting a snapshot under a different year is not orphaned.
- No TRD ADR is overturned — this is spec-level, so no superseding ADR is required.
- **Nothing was deleted.** All validation was read-only except one delete inside a transaction that was rolled back and verified.
