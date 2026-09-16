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

## Pivot Record: T-04 — R-PFV-004's "byte-identical" clause is false

**Status: spec amended, PENDING OWNER RATIFICATION.** Raised 2026-09-16 by the Leader from the Implementer's
own disclosure, confirmed and extended by the Reviewer. This is a **spec defect the implementation exposed**,
not an implementation error — the mandated design (DD-6) *cannot* satisfy the mandated clause.

### The blocker

`R-PFV-004` required: *"BUT it must NOT change the request for the live view — with no `?version` the request
must be **byte-identical** to today's"*, resting on `DD-6`'s claim that *"the interceptor appends nothing"*
when no version is present.

**Both are false.** `result.interceptor.ts:25-31` appends `reportYear` behind `if (year)` and
`reportingPlatforms` behind a **separate, independent** `if (platform)`. `getPlatformFromUrl` matches
`/result\/([A-Za-z]+-\d+|\d+)/` against `router.url`; the real route is `result/:id` → `pool-funding-alignment`
(`app.routes.ts:82`, `:112`), and a numeric code resolves to `STAR`. So opting the four calls into the
interceptor makes the **live** request gain `?reportingPlatforms=STAR` where today it carries nothing.

**Reviewer's extension, which the Leader had missed:** the *version* scenario is affected too. The real URL is
`…?reportYear=2026&reportingPlatforms=STAR`, so **all eight** new URL assertions (4 calls × 2 scenarios) — not
only the four byte-identity ones — pinned a string production never emits.

### Alternatives considered

| Option | Verdict |
| --- | --- |
| Change the code to preserve byte-identity | **Impossible.** `reportingPlatforms` cannot be suppressed while opting into the interceptor; `X-Platform` overrides the value, never the append. Avoiding it means abandoning DD-6's whole transport fix |
| Accept the changed bytes, correct the requirement | **Chosen.** The clause is false; the behaviour is sound |
| Leave the clause and keep the test that hides it | Rejected — that is the KZ-017 shape, and it was exactly what attempt 1 shipped |

### Why accepting is safe — measured, not assumed

- `ResultsUtil.setup()` (`server/.../results.util.ts:31-38`) applies
  `where.platform_code = ReportingPlatformEnum[reportingPlatforms] ?? STAR` **unconditionally** → a STAR result
  resolves **identically** with or without the param.
- The section is STAR-only: `bilateral.service.ts:156-160` gates every alignment fetch on
  `isPoolFundingCapable()`, so the value is always `STAR` for these calls.
- No global `ValidationPipe` with `forbidNonWhitelisted` (`main.ts`) → an extra query param cannot 400.
- **`PATCH_PoolFundingTag` (`api.service.ts:811`) already ships `useResultInterceptor: true` in production
  today** — a bilateral call already sends `reportingPlatforms` on the live view, with no incident.
- For a **non-STAR** result the param would be strictly *more* correct than today's silent STAR fallback — the
  exact failure the interceptor's own comment documents ("surfacing as *Result not found* on every service").

### Spec edits landed (reversible in one commit if the owner rules otherwise)

- `requirements.md` R-PFV-004 — clause replaced with "must NOT send `reportYear` on the live view", plus the
  measured acceptance of `reportingPlatforms`.
- `design.md` DD-6 — the false parenthetical struck and replaced with the real interceptor behaviour.
- `tasks.md` T-04 — the spec instruction now mandates the **real route** and the exact assertions, and the
  coverage row is re-scoped to `not.toContain('reportYear')`.
- **Correction closure (K-003, both directions):** grepped `byte-identical` across the whole spec folder — 3
  surviving sites found beyond the one edited, 2 corrected (`tasks.md` §T-04, coverage table) and 1 left
  deliberately (`requirements.md:157`, which is R-PFV-001 about the procedure body, a different claim).

### What the owner is being asked to ratify

That STAR's four pool funding requests may carry `reportingPlatforms` on the **live** view, where today they
carry no query string at all — accepted because the resolved server behaviour is unchanged for STAR and
improved for non-STAR, and because a sibling bilateral call already does it in production. Reversing this
ruling means abandoning the interceptor for these four calls and finding another transport for the version,
which is a redesign of DD-6, not a tweak.

## T-02 — Migration: `SP_versioning` copies the four tables and empties the source

| Field | Value |
| --- | --- |
| Status | **PASS** |
| Date | 2026-09-16 |
| Implementer attempts | **1** |
| Implementer | Cursor CLI `cursor-grok-4.6-high` — Orca `task_94b11a837128` / `ctx_f06dd393bf34` (fresh terminal) |
| Reviewer | `akili-reviewer` (Opus 5, read-only), effort **xhigh** — this task writes to snapshots and deactivates live rows |
| Skills assigned | `nestjs-expert` (as recommended) |
| Effort | xhigh (correctness-critical; two of the task's own falsifiers are known vacuous) |
| Requirements covered | R-PFV-001, R-PFV-002, R-PFV-006, NFR-PFV-001, NFR-PFV-002, NFR-PFV-003 |

### Attempt 1

**Files changed:** `server/researchindicators/src/db/migrations/1789586388552-addPoolFundingCopyToVersioningSp.ts` (new). Nothing else.

**Body diff — measured independently by the Leader** (difflib over the extracted template literals):
**+86 / −0, exactly 2 hunks** — the `DECLARE new_alignment_id BIGINT DEFAULT NULL;`, and the copy +
deactivation blocks inserted immediately after the `link_results` block. `down()` **byte-identical** to the
deployed `1789149538737` `up()` (1027 lines both). DDL scan of the whole file: **0**.

**Verification (Implementer, then re-measured by the Leader after the worker reported):**

| Command | Result |
| --- | --- |
| `npx jest --config ./test/jest-fixtures.json <fixture> --verbose` | **8 passed, 8 total** — the fixture closes |
| `npm run test:fixtures` (full) | 5 failed / 17 passed suites; **45 failed / 108 passed** tests |
| `npx eslint src/db/migrations/1789586388552-*.ts` | exit 0 |
| `npm run build` | exit 0 |

The arc across the three server tasks: **49 → 48 → 45** failing tests; failing suites **6 → 6 → 5**. The five
that remain are the pre-existing `innovation-use` circular-import defect, verified independent of this spec.

**Reviewer verdict: `STATUS: PASS`**, with six judgment points audited against the file rather than the colour:

- **`LAST_INSERT_ID()` pairing correct and load-bearing.** `SET new_alignment_id = IF(ROW_COUNT() > 0, …)` sits
  immediately after the alignment `INSERT` with *nothing* intervening. MySQL leaves `LAST_INSERT_ID()` at its
  previous value when an `INSERT … SELECT` inserts zero rows, and the preceding block (`link_results`) is
  itself an AUTO_INCREMENT insert — so without the guard the previous insert's id would leak into
  `new_alignment_id`. The Implementer's by-construction argument was audited and upheld.
- **`SIGNAL 45001` placement verified structurally, not by colour:** the guard sits ~775 lines above the new
  blocks and before `INSERT INTO results`; the Reviewer grepped the whole file for `HANDLER` — **zero
  matches**, so no `CONTINUE`/`EXIT` handler can swallow the `SIGNAL` and the `CALL` genuinely aborts.
- **`_sp` FK re-mapping literal:** `new_alignment_id AS alignment_id` in the SELECT list; `sp.alignment_id`
  appears only in the join predicate.
- **Deactivation order correct** (`_sp` before parent), and none of the four `UPDATE`s can reach the rows just
  copied — all are keyed on `temp_result_id`, the copies carry `new_result_id` / `new_alignment_id`.
- **Column lists complete against `baseline.sql`, checked against the DDL and not against the fixture:**
  alignment 8/8, `_sp` 9/9 (generated column correctly excluded), ToC 18/18 (ditto), mapping 16/16. No column
  is dropped.
- **Migration proven executed (K-006):** case 1 is RED on `HEAD` by construction and is green.

### Decisions made

- **The guard asymmetry was adjudicated, not waved through.** The two Pattern-A `INSERT`s are unguarded while
  the deactivation of those same tables is inside `IF (new_alignment_id IS NOT NULL)`. The Leader raised it;
  the Reviewer confirmed it is **literally what `tasks.md` §T-02 mandates** (block 2's `END IF;` closes before
  block 3 and a new `IF` opens at block 4) and then tried to **construct** the divergent state and could not:
  `bilateral.service.ts:823-903` writes ToC rows only inside the same transaction that unconditionally saves an
  active alignment, and `upsertContribution` refuses without `getActiveAlignmentForLever`. Not API-reachable.
- **Both vacuous falsifiers were handled by construction, not by colour.** The Implementer was told in-brief
  that `tasks.md`'s claimed reds for the `ROW_COUNT()` guard (case 4) and the `SIGNAL` placement (case 5)
  cannot happen, was forbidden from citing them, and was required to argue each guard structurally. Both
  arguments were then audited by the Reviewer and upheld.

### Spec correction landed with this task

**`design.md` §4's claim "none of the four unique indexes can collide on the copy path" is false** for
`result_pool_funding_alignment_sp` — see the corrected section. Struck and replaced with the measured truth.

### ADVISORY (4R lens — recorded, never gates, never becomes a task)

1. **RISK — the four sibling FK columns on `result_pool_funding_indicator_mapping` are copied verbatim instead
   of re-mapped.** `result_capacity_sharing_id`, `result_knowledge_product_id`, `result_policy_change_id` and
   `result_innovation_dev_id` each FK to `<table>.result_id`, and `SP_versioning` copies those parent tables
   onto `new_result_id` — so the correct value on a snapshot is `new_result_id`, not the source's. **The
   snapshot's mapping row therefore points at the LIVE result's section rows.** This is exactly what
   `tasks.md` mandated ("full column lists, `new_result_id AS result_id`"), so it is a gap in the mandated SQL,
   not a deviation. **Reachability constructed:** with one such row set, `full_delete_result_version(<live
   result>)` deletes the live child row while the snapshot's mapping row still references it → **MySQL 1451**,
   the exact failure class R-PFV-003 exists to eliminate. **Latent only** because `requirements.md` §2.2
   measured **0 live rows** in that table. Needs a follow-up spec item before the table is populated.
2. **RISK — the `_sp` merge can violate `idx_rpfas_active_primary`** when a result carries more than one active
   alignment (→ MySQL 1062, `SP_versioning` aborts, approval fails). Corrected in `design.md` §4 above.
   Reachability is not blocked by the schema anywhere this spec reaches (RB-1), only by the application
   transaction; two concurrent `PATCH`es are the constructible path. Dev shows zero duplicates today.
3. **RELIABILITY — a cheap drift check for the guard asymmetry**, foldable into T-06 with no code:
   `SELECT t.result_id FROM result_pool_funding_toc_alignment t WHERE t.is_active = 1 AND NOT EXISTS (SELECT 1
   FROM result_pool_funding_alignment a WHERE a.result_id = t.result_id AND a.is_active = 1);` — a non-empty
   result on Testing would turn advisory 3 from unreachable into a live data-duplication path.
4. **READABILITY — `LIMIT 1` with no `ORDER BY`.** Deterministic under the single-active-alignment invariant;
   storage-order dependent and silently so if the invariant breaks. `ORDER BY pfa.id DESC` would make the
   choice explicit and match what `findActiveAlignmentByResultId` returns. **Not applied** — it is outside the
   SQL `tasks.md` mandates, and an advisory may not widen a task. Offered to the owner as a decision.

### Scope limits of the green fixture, stated (KZ-017)

A green fixture is **not** proof of the whole procedure. It exercises **4 of 31** copied tables; the other 30
blocks rest entirely on the body diff. Within the four, it seeds and asserts **12/12** ToC payload columns but
only **6/10** mapping payload columns — the four sibling FK columns are **copied but never asserted**, so
deleting them from the `INSERT` list would leave all eight cases green. That hole was closed by reading
`baseline.sql`, not by a test. The fixture also never exercises: an active `_sp` row under an inactive parent,
more than one active alignment on one result, or the `ROW_COUNT()` guard's actual protective case.

### Final verification result

8/8 fixture cases green, body diff +86/−0 in 2 hunks, `down()` byte-identical, zero DDL, eslint 0, build 0.
**Cannot prove** (KZ-017): that Dev, Testing or Prod received this migration — applying it is a separate human
decision (K-015); nothing about the rendered screen (T-06).

## T-04 — Client: the pool funding section follows the viewed version

| Field | Value |
| --- | --- |
| Status | **PASS (attempt 2)** — attempt 1 FAILed review |
| Date | 2026-09-16 |
| Implementer attempts | **2** |
| Implementer | Cursor CLI `cursor-grok-4.6-high` — attempt 1 `ctx_bd24cfa30911`, attempt 2 `ctx_404e2491bcb0` (fresh worker) |
| Reviewer | `akili-reviewer` (Opus 5, read-only) — full sweep on attempt 1, focused re-audit on attempt 2 |
| Skills assigned | `angular-developer`, `ui-ux-pro-max` (as recommended) |
| Effort | medium (attempt 1) → high (attempt 2, per the rework rule) |
| Requirements covered | R-PFV-004 (both scenarios) — **as amended**, see the Pivot Record above |

### Attempt 1 — `STATUS: FAIL`

**Files changed:** the three production files (`api.service.ts`, `pool-funding-alignment.component.ts`,
`result.component.ts`) and their three specs.

**Verification:** `npm test -- --silent` 323/323 suites, 7244/7244 tests; `npm run lint -- --quiet` clean;
`tsc -p tsconfig.spec.json` exit 2 on the pre-existing 944-error corpus with **no TS1005 abort**. The
Implementer ran all three mandated falsifiers and quoted each red.

**Reviewer FAIL — three issues:**

1. **The spec is wrong, not the code.** R-PFV-004's "byte-identical live request" cannot be satisfied by the
   mandated design. → Resolved by the Leader as a **Pivot** (see `## Pivot Record: T-04` above). The Reviewer
   stated the verdict in those words: *"The code is right and the SPEC is wrong … Do not ask the Implementer
   to change `api.service.ts`."*
2. **The test arrangement is a separate, implementation-side defect that survives the spec correction.**
   Attempt 1 configured the Router stub with `'/page'` — a URL this page never has — so all **eight** new URL
   assertions pinned a string production never emits. *"A gate arranged around the condition that falsifies it
   is not a gate."* → This is what attempt 2 fixed.
3. **Unexplained lockfile drift** (`client/.../package-lock.json` modified, root `pnpm-lock.yaml` untracked).
   → **Leader determination: pre-existing, not this spec's.** Both were already dirty in the session's opening
   `git status` before any work began; the package-lock delta is 1 insertion / 3 deletions and its last commit
   is the monorepo migration. Neither is staged into any of this spec's commits. Reviewer confirmed the
   disposition on re-audit, noting the residual risk is procedural: they must not be swept into a later commit.

**Leader note on attempt 1's honesty:** the Implementer *disclosed* the `/page` arrangement in its own
`NOT DONE / ASSUMPTIONS` — which is why it was caught. Disclosure is not discharge (the clause was unmet, not
merely unverified), but the disclosure is what made the review cheap, and it is the behaviour the brief asks for.

### Attempt 2 — `STATUS: PASS`

**Files changed:** `client/research-indicators/src/app/shared/services/api.service.spec.ts` **only**. Production
code and both component specs untouched from attempt 1 (which the Reviewer had passed explicitly).

The URL block now arranges the **real route** — `/result/19941/pool-funding-alignment` and
`…?version=2026` — and asserts, per call, via `it.each(POOL_FUNDING_CALLS)` over all four including the `PATCH`:

| Scenario | Asserted |
| --- | --- |
| `?version=2026` | `…?reportYear=2026&reportingPlatforms=STAR` |
| live | `…?reportingPlatforms=STAR` **and** `not.toContain('reportYear')` |

**Verification, re-measured by the Leader:** `npm test -- --silent` → **323/323 suites, 7244/7244 tests**;
`npm run lint -- --quiet` clean; `git diff --stat` on `result.interceptor.ts` **empty** (the falsifier mutation
was genuinely restored — the Reviewer independently confirmed the `if (year)` guard is back by reading the file).

**Falsifiers — both halves now OBSERVED red, not derived (K-004):**

| Mutation | Observed |
| --- | --- |
| Drop `if (year)` in the interceptor (Implementer) | all four **live** cases red on `not.toContain`, received `…?reportYear=null&reportingPlatforms=STAR` |
| Remove `useResultInterceptor` from `GET_PoolFundingAlignment` only (**Leader**, closing the Reviewer's K-004 advisory) | that **version** case red — expected `…?reportYear=2026&reportingPlatforms=STAR`, received the bare `…/pool-funding-alignment` — **and the other three stayed green**, proving the gate discriminates per call. Restored; 8/8 green after |

**Reviewer re-audit confirmed, at source rather than on trust** (it has no `Bash`, so it read the files):
the route table (`app.routes.ts:51/:82/:112`), that `19941` genuinely resolves to `STAR` via
`platformFromResultCodeOrNull`, that `httpMock.verify()` sits in the outer `afterEach` and covers all 8, that
production is untouched, and that the interceptor's `if (year)` guard is restored. It ruled **no assertion
inert**, and the `startsWith` predicate acceptable because it is a *selector* followed by full-string equality —
a missing param still reddens on the `toBe`.

### ADVISORY (recorded, never gates)

1. **Readability —** `expect(req.request.method).toBe(method)` can never fail; `expectOne` already filters on
   method. Harmless, but it reads as coverage it does not provide.
2. **Risk (no reachable path today) —** the assertions read `req.request.url`, which structurally cannot see a
   param delivered via `HttpParams`. None of the four calls uses `params`, and the interceptor builds a string,
   so the check covers the only mechanism in play. `urlWithParams` would be strictly stronger at zero cost.
3. **Readability —** the Router stub's `parseUrl: () => ({ queryParams })` ignores its argument, so the URL
   string feeds only `getPlatformFromUrl` while query params are supplied out-of-band. Consistent today; a real
   `DefaultUrlSerializer().parse()` would remove the chance of the two drifting in a future edit.
4. **Risk — release ordering (from the attempt-1 review, reachability constructed).** PR 2 (T-04/T-05) can
   deploy while T-02's migration sits unapplied — K-015 measured exactly that, 4 days and several deploys. In
   that window `#19941` at `?version=2026` renders the section **empty**, because the snapshot has zero pool
   funding rows until `SP_versioning` copies them. Conformant with R-PFV-004 and arguably more honest than
   today's contradiction, but user-visible and recorded nowhere else. **Carried into T-06 as a release-ordering
   precondition.**
5. **Reliability — the initial load path is now an effect.** `loadAlignment()`'s only call site is inside
   `versionWatcher.onVersionChange`, an `effect()`, so the first section load moves from synchronous-constructor
   to the first effect flush. Eleven sibling pages carry the same shape, but every spec stubs `onVersionChange`
   and invokes the callback directly, so **no test exercises the real effect's initial run** for this page.
   T-06's first checkbox covers it in the field.

### Final verification result

323/323 client suites green, lint clean, one file changed in the rework, both falsifier directions observed.
**Cannot prove** (KZ-017): that the section *renders* the version's values — jsdom asserts the request, not the
paint (T-06); and R-PFV-004's amended clause remains **pending owner ratification**.
