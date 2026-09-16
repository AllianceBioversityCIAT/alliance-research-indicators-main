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

## T-03 — Migration: the delete routines clear the four tables

| Field | Value |
| --- | --- |
| Status | **PASS** |
| Date | 2026-09-16 |
| Implementer attempts | **1** |
| Implementer | Cursor CLI `cursor-grok-4.6-high` — Orca `task_df222cc9fa57` / `ctx_21daf0c2d61a` (fresh terminal; the T-01 worker was released at 68% context because this task is bulk verbatim transcription) |
| Reviewer | `akili-reviewer` (Opus 5, read-only) |
| Skills assigned | `nestjs-expert` (as recommended — no deviation) |
| Effort | high (correctness-critical: migration + delete routines; transcription is the dominant defect class, RB-2) |
| Requirements covered | R-PFV-003 (hard-delete scenario proven; version-delete scenario gated only from T-02), R-PFV-006, NFR-PFV-001, NFR-PFV-002 |

### Attempt 1

**Files changed:** `server/researchindicators/src/db/migrations/1789583572262-addPoolFundingDeletesToDeleteRoutines.ts` (new, 773 lines — of which ~757 are mandatory verbatim re-declaration). Nothing else.

**Body diff — measured independently by the Leader** (extracted each routine's template literal from both
files and ran `difflib.unified_diff`, rather than trusting the worker's own diff):

| Routine | `up()` vs deployed body | `down()` |
| --- | --- | --- |
| `SP_delete_result_version` | **+16 / −0**, one hunk | **byte-identical** to `1787083305648` `up()` |
| `full_delete_result_version` | **+16 / −0**, one hunk | **byte-identical** to `1787083305648` `up()` |

The single hunk, identical in both routines, sits immediately before `DELETE FROM results`: `_sp` (via the
`alignment_id IN (SELECT …)` sub-select) → `alignment` → `toc_alignment` → `indicator_mapping`, all keyed on
`temp_result_id`.

**Verification (Implementer, then re-measured by the Leader after the worker exited):**

| Command | Result |
| --- | --- |
| `npx jest --config ./test/jest-fixtures.json <fixture> --verbose` | 3 failed, 5 passed, 8 total |
| `npm run test:fixtures` (full) | 6 failed / 16 passed suites; **48 failed / 105 passed tests** (was 49/104) |
| `npx eslint src/db/migrations/1789583572262-*.ts` | exit 0, no output (`npm run lint` NOT used — K-001) |
| `npm run build` | exit 0 |

Colour transition: **case 8 RED (MySQL 1451 on `fk_rpfa_result`) → GREEN**; case 7 stays GREEN; cases 1, 3, 6
stay RED for T-02. The single test gained across the whole suite is case 8 — that is the task's entire
behavioural footprint, and it matches.

**Reviewer verdict: `STATUS: PASS`.** Independently confirmed, beyond the Leader's checks:

- **The DD-4 sharp edge is not reachable.** `temp_result_id` is assigned exactly once in
  `SP_delete_result_version` (`SELECT r.result_id INTO temp_result_id … WHERE r.is_snapshot = TRUE AND
  r.report_year_id = reportYear AND r.result_official_code = resultCode`) — the **snapshot** — with no second
  `INTO`/`SET` between that resolution and the new blocks, and `resultCode` occurring in the whole body only
  twice (signature + that `WHERE`). No `DELETE` keys on the code.
- **The `_sp` sub-select is complete, not merely ordered:** `fk_rpfas_alignment` is the *single* FK anywhere
  pointing at the four tables (`baseline.sql:3693`), so an orphaned `_sp` row cannot exist and the set deleted
  is exactly the set the FK would block. `toc_alignment` and `indicator_mapping` have no child tables.
- **Line-count corroboration of the +16/−0:** source `up()` SP 174 lines → new 190; source `up()` function 175
  → new 191; both `down()` bodies exactly 174 / 175. Also proved the paste came from `up()` and not `down()` —
  all four bodies contain `result_innovation_use`, which the source's `down()` routines do not.
- Repo migration-killer checked (`src/CLAUDE.md` §7): no `?` and no `:word` anywhere in the file, so
  `namedPlaceholders` cannot reject it.
- `1787083305648` confirmed the latest prior declaration of either routine (15 files match, none newer);
  `1789583572262` is the highest timestamp in the directory; no merged migration was modified.

### Decisions made

- **Case 6 stays RED by design, and `tasks.md`'s Done-when was corrected before dispatch.** The original
  "cases 6, 7 and 8 are green" is unachievable at T-03 time: this task lands **before** T-02 deliberately (the
  tree must never hold a copy the delete routines cannot clear), so case 6's mandated pre-delete premise
  cannot pass. Forcing it green would require hand-seeding snapshot rows (hiding the missing copy) or pulling
  T-02's copy blocks into this migration (destroying the FK-safety ordering). The brief carried an explicit
  *"do not try to make case 6 green — if you find yourself editing the fixture or `SP_versioning`, STOP and
  escalate"*. Reviewer independently agreed with the correction.
- **Stated scope limit (KZ-017):** `SP_delete_result_version`'s new blocks are **not fixture-gated until T-02
  lands** — before the copy exists, that routine never meets a pool-funding FK on a snapshot. Only the
  `full_delete_result_version` half (case 8) is proven here. Accepted cost of the deliberate ordering.

### Issues encountered

- The scratch bootstrap is **not idempotent** (FP-49: `ER_TABLE_EXISTS_ERROR` on an already-migrated
  container). Worker recovered the documented way — `compose:test:down` + `compose:test:up`, wait for
  `mysqld is alive`, then bootstrap unchanged. No harness file touched.
- A Leader check mid-run looked alarming and was falsified before acting on it: the worker was reading
  `1784250000000-RepairSpDeleteResultVersionObjectiveTables.ts`, raising the possibility that a **later**
  migration had re-declared these routines and that copying from `1787083305648` would revert a repair. First
  grep (narrowed to `PROCEDURE \`SP_…\``) returned a single misleading file; re-run unfiltered, 15 files match
  and `1787083305648` is the newest — the spec's source-of-truth claim holds. Recorded because the narrow grep
  is exactly the KZ-017 shape, and acting on its confident answer would have derailed the task.

### ADVISORY (4R lens — recorded, never gates, never becomes a task)

1. **Risk — the rollback path is now asymmetric.** `down()` correctly removes the DELETE blocks (NFR-PFV-001
   mandates verbatim restoration). Once T-02 is applied and a snapshot has actually received pool funding
   rows, reverting **both** migrations leaves those rows in place while `SP_delete_result_version` loses the
   ability to clear them — the next re-approval of that result hits MySQL 1451 again. TypeORM reverts
   newest-first, so T-02's copy is removed *before* T-03's deletes are. **Not actionable in this task** — any
   "safer" `down()` would violate NFR-PFV-001. Carried into the risk log as **RB-3** so the rollback path is a
   deliberate decision rather than a discovery.

### Final verification result

Case 8 green from a real MySQL 1451, both body diffs +16/−0, both `down()` bodies byte-identical, eslint 0,
build 0. **Cannot prove** (KZ-017): that Dev, Testing or Prod received this migration — applying it is a
separate human decision (K-015); and `SP_delete_result_version`'s half is unproven by any test until T-02.
