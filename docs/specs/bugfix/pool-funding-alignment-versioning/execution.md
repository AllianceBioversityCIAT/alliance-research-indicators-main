# Execution Log — Pool Funding Alignment versioning

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/pool-funding-alignment-versioning` |
| Linked tasks | [`./tasks.md`](./tasks.md) |
| Branch | `fix-pool-funding-2026-09-16` |
| Started | 2026-09-16 |
| Leader | Claude Opus 5 (1M) — T1 orchestration |
| Implementer | **Cursor CLI / `cursor-grok-4.6-high`** (user-directed: non-thinking execution model) |
| Reviewer | `akili-reviewer` wrapper — Opus 5, read-only (`Read`/`Grep`/`Glob`) — author ≠ auditor holds by host **and** by model family |
| Approval mode | gated (pause at each task gate) |
| Budget (design.md §7) | 6 tasks · ~3,350 LOC · 2 review rounds |

**Lane order.** Server lane serial by dependency (T-01 → T-03 → T-02); client lane serial after it
(T-04 → T-05) — the two client tasks share the Angular build output and dev-server port, so they are
not parallelizable with each other, and root `CLAUDE.md` §4.3 forbids two concurrent full-suite runs
across packages. T-06 is a HITL check owed to the user, not a delegated task.

---

## Task Execution History

_(appended per task)_

## T-01 — Regression fixture: pool funding survives versioning

| Field | Value |
| --- | --- |
| Status | **PASS** |
| Date | 2026-09-16 |
| Implementer attempts | **1** |
| Implementer | Cursor CLI `cursor-grok-4.6-high` — Orca `run_a06bc412c9ea` / `task_c20795b2a7ee` / `ctx_8f4e11c81ca4` |
| Reviewer | `akili-reviewer` (Opus 5, read-only) — full four-lens sweep |
| Skills assigned | `nestjs-expert`, `systematic-debugging`, `tdd` (as `tasks.md` recommended — no deviation) |
| Effort | medium (well-specified task; the 8 cases are the work order) |
| Requirements covered | R-PFV-001, R-PFV-002, R-PFV-003 (all three scenarios), NFR-PFV-003 |

### Attempt 1

**Files changed:** `server/researchindicators/test/fixtures/sp-versioning-pool-funding.fixture-spec.ts` (new, 1007 lines). No production code, no migration, no other test, no checkbox flip.

**Verification — `npx jest --config ./test/jest-fixtures.json test/fixtures/sp-versioning-pool-funding.fixture-spec.ts`:**

```
Test Suites: 1 failed, 1 total
Tests:       4 failed, 4 passed, 8 total
```

**Re-measured by the Leader after the worker reported** (root `CLAUDE.md` §4.3 — never measure while a worker is active; K-004 — the red must be *seen*, not cited): identical, 4 failed / 4 passed.

| Case | Colour on HEAD | Required? | Failing assertion |
| --- | --- | --- | --- |
| 1 Copy | 🔴 | required | `expect(copiedAlignments).toHaveLength(1)` → `[]` |
| 2 Inactive not copied | 🟢 | allowed | — |
| 3 Source deactivation | 🔴 | required | `expect(activeAlignments).toHaveLength(0)` → 1 active row |
| 4 Empty section | 🟢 | allowed | — |
| 5 Duplicate 45001 | 🟢 | allowed | — |
| 6 Version delete | 🔴 | required | `expect(snapshotAlignments.length).toBeGreaterThan(0)` → 0 |
| 7 AR-1 pin | 🟢 | expected green | — |
| 8 Hard delete | 🔴 | required | `QueryFailedError` — MySQL **1451** `fk_rpfa_result` |

**Full prescribed gate — `npm run test:fixtures`** (run by the Leader in the isolation window, closing the Reviewer's advisory 3b):

```
Test Suites: 6 failed, 16 passed, 22 total
Tests:       49 failed, 104 passed, 153 total
```

The other 5 failing suites are **pre-existing and unrelated** — verified, not assumed: run in isolation,
`npx jest --config ./test/jest-fixtures.json test/fixtures/innovation-use` gives **5 failed / 13 passed with
this spec's file not in the run at all**. Cause is documented in
`innovation-use/innovation-dev-card-facts.fixture-spec.ts:27-30` (`ResultPolicyChangeModule "imports" array is
undefined` — a circular-import ordering defect in the production module graph). Siblings
`sp-versioning-link-results` and `sp-versioning-objective-blocks` PASS.

**Reviewer verdict: `STATUS: PASS`** — "a faithful, non-vacuous implementation of all eight T-01 cases against
real database state via the real routines, with genuine per-row discriminators, a red set of exactly the four
cases `tasks.md` requires for reasons that are the defect and not the harness, clean teardown, and a
collision-free seed band". Zero mocks and zero call-sequence assertions (KZ-001 clean); discriminators
(`created_by` 61001–61005 / 62001–62004, distinct `sp_code`/`sp_role`) are seeded **and read back** (KZ-004);
seed band `905_000` and report year `2117` verified unclaimed by unfiltered grep; `maxWorkers: 1` rules out a
cross-file race.

### Decisions made

- **Case 6 reddens via its copy-premise assertion, not via MySQL 1451, and that is correct.** `tasks.md`'s
  "Input that makes it fail" line predicts 1451 for case 6, but its **own case-6 text** mandates asserting
  *before* the delete that the snapshot carries the rows. On HEAD that premise fails first, so the delete is
  never reached; 1451 is the post-T-02/pre-T-03 colour. Declared by the Implementer unprompted, ruled correct
  by the Leader, and independently reached by the Reviewer. Case 8's 1451 is genuine.
- Skills and effort taken as `tasks.md` recommended; no deviation to record.

### Issues encountered

- **Transient environment blocker (not a defect):** the first `npm run migration:test:bootstrap` hit
  `ERROR 2002 … mysqld.sock` because the scratch container had just been restarted and mysqld was still
  initializing. Leader diagnosed it live (`mysqladmin ping` → `mysqld is alive`; container log 18:14:19
  `ready for connections`) and instructed the worker to re-run the bootstrap **unchanged** and to escalate
  rather than edit `load-baseline.js`, the compose file or `.env`. Resolved on the retry; no harness file was
  touched. Recorded because a worker "fixing" the harness is how a green stops meaning anything.

### Spec correction landed with this task (KZ-007 — verified against the source before writing)

**`tasks.md` RB-1 and `design.md` §4 + DD-2 asserted something false.** RB-1 claimed the scratch schema *has*
`uq_rpfa_active_result`, "so the fixture exercises the enforced shape". Measured during T-01:

- `SHOW CREATE TABLE ari_scratch_test.result_pool_funding_alignment` → **no unique index at all**, no
  `active_result_id` generated column;
- `src/db/baseline/baseline.sql` carries the ledger row `1779190000014,'FixResultPoolFundingAlignmentPartialUnique1779190000014'` marked **applied**, while its own `CREATE TABLE` in the same dump carries **no unique index**;
- therefore `migration:test:execute` skips the migration and the scratch schema inherits Dev's drift.

This is **worse than a pending migration**: `migration:show` can never flag it, because the ledger says
applied. **DD-2's conclusion is unaffected** — every copied row lands on a new `result_id` (and `_sp` on a new
`alignment_id`), so no unique index can collide on the copy path (design §4) — but the at-most-one-active
invariant now demonstrably rests on `bilateral.service.ts:823-856` plus the Dev measurement, **not** on the
schema. Corrected in `tasks.md` RB-1 and `design.md` (2 sites) rather than left to drift.

### ADVISORY (4R lens — recorded, never gates, never becomes a task)

1. **Reliability — case 2's "no copied `_sp` row carries the source `alignment_id`" assertion is structurally
   inert.** `spsFor(resultId)` joins `_sp → alignment WHERE a.result_id = ?`, so a row carrying the *source*
   `alignment_id` can never enter `copiedSps`; the assertion cannot fail. The clause is still genuinely gated
   by case 1 (`toHaveLength(2)` + `alignment_id === copiedAlignment.id` + fresh-PK), which is also where
   `tasks.md` T-02 assigns it — nothing escapes; the cost is that case 2 *reads* as coverage it does not give.
2. **Risk — case 4 cannot redden for the `ROW_COUNT()` guard, although T-02 nominates it to.** T-02's "Input
   that makes it fail" claims *"dropping the `ROW_COUNT()` guard (→ case 4 red)"*. It would not: with the
   guard gone, the four `UPDATE`s key on `result_id = temp_result_id` and match **zero** rows on a result with
   no pool funding rows — nothing observable. Leaves R-PFV-002's *"a failed copy must not destroy the source"*
   half uncovered. Reviewer constructed the reachable discriminator: a result with **no active alignment** but
   an **active** ToC + mapping row (`new_alignment_id` stays NULL → with the guard those rows stay active,
   without it they are deactivated); green on HEAD, so the required colour map survives.
3. **Resilience — case 5 cannot redden for `SIGNAL`-placement either.** Moving the new blocks before the
   `SIGNAL 45001` guard leaves case 5 green, because by the second call the source rows are already inactive
   and `WHERE is_active = TRUE` matches nothing. Reachable discriminator: after the first `SP_versioning`,
   re-activate the source rows, then call again — expect 45001 **and** the re-activated rows still active.

**Leader ruling on advisories 2 and 3.** These are not fixture defects — the fixture discharges every case
exactly as `tasks.md` writes it. They are a **decomposition gap in T-02's falsifier list**: two of its stated
"input that makes it fail" lines name reds that cannot happen, which is the K-004/KZ-014 failure mode aimed at
the spec rather than the code. Per `/akili-execute`, an advisory may not mint a task or widen one, so nothing
is changed here; the gap is carried **forward into T-02's brief** so that task's verification does not rest on
two vacuous falsifiers, and the two extra cases are offered to the user as an explicit scope decision.

### Final verification result

Fixture **RED on HEAD in exactly cases 1, 3, 6, 8** — observed twice (worker, then Leader). Teardown leaves
zero seeded rows (`leftover_year 0`, zero results in band `905_000`). **Cannot prove** (KZ-017): anything about
Dev, Testing or Prod — only the disposable scratch schema is exercised; nothing about the rendered screen.
