# Tasks — Bugfix / `SP_versioning` references the dropped column `roles_id`

- **Module:** results (lifecycle routines)
- **Spec id:** 2026-08-sp-versioning-roles-id
- **Status:** in-progress
- **Owner:** David Felipe Casañas Hernández
- **Linked requirements:** [`./requirements.md`](./requirements.md) · **Linked design:** [`./design.md`](./design.md)
- **Last updated:** 2026-08-18 (F-2 "37"→32 correction, budget-tripwire ~350→~165 corrections, LOC-total pointer fix — 2026-08-18 validation-remediation pass; four of five tasks `[x]`, T-03 `[~]`)

---

## 0. Before starting

- **Nothing runs against `ARI_MYSQL_*`.** The existing `migration:dev:execute` / `migration:revert` scripts point at the **shared, non-disposable** database. T-01 exists because there is currently no other route.
- **Migrations are append-only** (ADR-5). Re-check `git status` after `npm run lint -- --quiet` — the script carries `--fix` and mutates files.
- **Re-verify line numbers** before editing. `1783029013035:116` and `:143` were true on 2026-08-14; the stable anchors are the block *names*, not the numbers.

**Budget tripwire:** ~~3 tasks · ~2,050 LOC · 1–2 review rounds~~ → ~~4 tasks · ~2,050 LOC + baseline dump · 2–3 review rounds~~ (T-01 pivot) → **5 tasks · ~2,750 LOC + baseline dump · 3–4 review rounds** (revised 2026-08-14 by the T-02 pivot: the companion delete-routine migration reproduces a second ~165-line body twice *(corrected 2026-08-18 from "~350-line" — W-9; the routine is 162 lines)*). If the repair turns out to need more than the two blocks, **stop and escalate** — that is a different bug.

---

## 1. Dependency graph

```
T-01 (harness plumbing) → T-01b (baseline schema) → T-02 (SP_versioning repair + fixture)
                                                       → T-02b (SP_delete_result_version companion) → T-03 (regression + release)
```

**T-02b was added on 2026-08-14** by the T-02 Pivot: the `SP_versioning` repair activates a latent 1451 in the delete routine. See [`./execution.md`](./execution.md) → *Pivot Record: T-02*, `design.md` §3.1 / DD-6, and requirements R-SPV-002 / RB-5.

**T-01b was added on 2026-08-14** by the T-01 pivot: the migration history presumes `sec_*` tables no migration creates, so an empty scratch schema cannot be migrated at all. See [`./execution.md`](./execution.md) → *Pivot Record: T-01* and `design.md` §4.1 / DD-5.

---

## 2. Task list

### T-01 — Scratch-schema harness: TEST datasource, port var, Jest config

- **Requirements covered:** R-SPV-001 (precondition for its gate); RB-1
- **Design references:** §4
- **Size:** M · **Dependencies:** none · **Status:** **`[x]` done** — Reviewer PASS 2026-08-14. Criterion #2 retired as never-achievable (RB-1d). See [`./execution.md`](./execution.md)
- **Skills:** `nestjs-expert`

> **Shared with `innovation-use/data-model-and-catalog` T-01/T-02.** If that chunk already landed them, verify and close this task as a no-op — do not build a second mechanism.

**Scope** — `src/db/config/mysql/orm.test.config.ts` exporting a `TEST`-bound `DataSource`; `ARI_TEST_MYSQL_PORT` read by it and documented in `.env.example`; npm scripts passing `-d ./src/db/config/mysql/orm.test.config.ts`; Docker MySQL (utf8mb4 / `utf8mb4_unicode_520_ci`); dedicated Jest config for the fixture directory.

**Implementation notes**
- `orm.config.ts:71-73` exports one `CORE`-bound instance at module load; `-d` cannot retarget it. Do not modify that export.
- ⚠️ `orm-connection-test.module.ts` binds to `CORE` (`:10`) despite its name. It is a decoy, not this piece.
- `orm.config.ts:46` uses `DB_PORT` for both targets — hence the new port var.

**Verification**
- Print the resolved options: they must show the `ARI_TEST_MYSQL_*` host/port.
- **Falsifying input:** set `ARI_TEST_MYSQL_HOST` to a sentinel; if the printed host is the `ARI_MYSQL_*` one, the module is still `CORE`-bound and the task **fails**.
- **Disqualifier:** compiling is not connecting. If the options cannot be printed and read, report **inconclusive**, not passed.

**Done**
- [x] Module resolves to `dataSourceTarget.TEST`, demonstrated by the sentinel
- [x] ~~Full migration suite applies **and reverts** on the scratch schema~~ → **criterion retired 2026-08-14, it was never achievable.** The migration history is not replayable from empty (RB-1d): two independent blockers in the first 139 of 303, 164 unexercised. Replaced by T-01b's snapshot criterion. Revert is separately proven TEST-routed
- [x] A smoke fixture passes with the container up and **fails** with it down
- [x] `orm.config.ts` and `orm-connection-test.module.ts` unmodified

---

### T-01b — Baseline schema artifact for the scratch container

- **Requirements covered:** R-SPV-001 (precondition for its gate); **RB-1b**
- **Design references:** §4.1, DD-5
- **Size:** S–M · **Dependencies:** T-01 · **Status:** **`[x]` done** — Reviewer PASS 2026-08-14, snapshot model. See [`./execution.md`](./execution.md) → *T-01 + T-01b — final outcome*
- **Skills:** `nestjs-expert`

> **Added by the T-01 pivot, 2026-08-14.** Without this, DC-A cannot execute and neither T-02 nor `innovation-use/data-model-and-catalog` T-01/T-02 can be verified.

**Scope (revised 2026-08-14 — snapshot, not replay)** — a committed **schema-only snapshot** under `src/db/baseline/`, plus a load step wired so the scratch container cannot be migrated before it is loaded, plus documentation of source environment and date.

> **Why the scope changed.** The first shape of this task assumed the 303 migrations could be replayed on top of a minimal baseline. They cannot — RB-1d. Keep what already works: the loader, the RB-1c same-host guard, and the derivation method. Replace the artifact's contents.

**Implementation notes**
- The snapshot is **all base tables and views + `--routines` + the `migrations` table with its rows**, so TypeORM records all 303 as applied and only genuinely new migrations run.
- **`--routines` is essential:** it is what delivers `SP_versioning` present and broken, which is what makes T-02's red real.
- **No business data.** The single deliberate exception is the `migrations` table's own rows — bookkeeping, not domain data. State the exception explicitly in the README.
- Generated, never hand-written (DD-5).
- Producing it reads the **shared, non-disposable** database. Read-only only; any write, schema change, or `migration:revert` against it is a human decision, never an agent's (root guide §4.3).
- Never point the load step at `ARI_MYSQL_*`. Verify the resolved **host**, not the variable name (RB-1c) — already enforced in `scripts/load-baseline.js`.
- Do **not** try to fix `CreateStaffGroups1759786024597` or any other unreplayable migration. That is OQ-3, deliberately out of scope.

**Verification**
- From a freshly created empty container: load the snapshot → `npm run migration:test:execute` reports **no pending migrations** (all 303 recorded as applied).
- **`SP_versioning` exists in the scratch schema and is the broken version** — `SHOW CREATE PROCEDURE SP_versioning` contains `roles_id`. This is the handoff T-02 depends on; without it T-02 has no red to observe.
- **Falsifying input:** on a fresh container, skip the snapshot load — `migration:test:execute` must fail immediately (no schema). A run that succeeds without the snapshot means the container was not empty; **stop and re-check**.
- **Disqualifier:** a snapshot that loads is not a snapshot that is sufficient. The evidence is *TypeORM reporting zero pending migrations* **and** *`SP_versioning` present with `roles_id` in its body*. Anything less is INCONCLUSIVE.

**Done**
- [x] **Snapshot** artifact committed under `src/db/baseline/` — 196 tables + 17 views + 23 routines + `migrations` rows; 1 `INSERT`, targeting `migrations`; source environment and date recorded
- [x] On a fresh container: snapshot loads and `migration:test:execute` reports **zero pending migrations** (`No migrations are pending`)
- [x] `SHOW CREATE PROCEDURE SP_versioning` in the scratch schema contains `roles_id` — Reviewer confirmed structurally: body spans `baseline.sql:6935`–`:7917`, both occurrences inside it at `:7054` and `:7081`, all three §2.3 defects intact
- [x] Falsifying input: without the snapshot, `migration:test:execute` fails immediately on a fresh container (MySQL 1146)
- [x] README states the `migrations`-rows exception explicitly and records the derivation
- [x] Load step ordered ahead of the migration script and documented (`migration:test:bootstrap` chains load → execute)
- [x] RB-1c enforced in code: `load-baseline.js` refuses to run when `ARI_TEST_MYSQL_HOST` resolves to the same host as `ARI_MYSQL_HOST`
- [x] Live table enumeration performed (196 base tables + 17 views); source-only derivation proven 95% incomplete and the lesson recorded
- [x] Only read-only statements executed against the shared database

---

### T-02 — The migration and its regression fixture (red → green)

- **Requirements covered:** **R-SPV-001 (AC.1–AC.5)**; DC-A, DC-B, DC-C, DC-D
- **Design references:** §2 (the repaired shape), §3 (migration), DD-2, DD-3
- **Size:** M · **Dependencies:** T-01, **T-01b** · **Status:** **`[x]` done** — Reviewer PASS 2026-08-14, parallel-lens mode (spec conformance + risk + reliability, all PASS). See [`./execution.md`](./execution.md) → *T-02*
- **Skills:** `nestjs-expert`, `systematic-debugging`, `tdd`

**Scope** — migration `repairSpVersioningObjectiveBlocks` (`DROP` + `CREATE` of `SP_versioning`, two blocks changed) plus the regression fixture under `test/fixtures/`.

**Implementation notes**
- Repaired lists are **9 columns / 9 values**: drop `roles_id` and `id` from both the column list and the `SELECT` (design §2.2). Apply to **both** `result_impact_outcomes` (`:116`) and `result_strategic_objectives` (`:143`).
- `FROM` / `WHERE` clauses unchanged.
- **`down()` restores the prior broken body verbatim** (DD-3). Do not "improve" it.
- Change nothing else — the other 27 blocks are byte-identical.
- **Do not** touch the delete-routine divergence over these same tables (DD-4, OQ-2). *(Correct for T-02, which complied. The divergence itself moved **in scope** on 2026-08-14 as **T-02b** / R-SPV-002 — DD-4 is amended by DD-6. Left as written: it is what T-02 was executed against.)*

**Verification** — the fixture script from T-01.
- **Red first (mandatory):** on current `main`, `CALL SP_versioning(<code>)` must fail with **MySQL 1054**. Capture the error verbatim.
- **Green after:** the same call succeeds; both tables' rows appear on the new version with `role_id` preserved and a **fresh** `id`.
- **Falsifying input:** if the fixture passes *before* the migration, the premise is wrong for this environment — **stop and escalate**, do not ship. Separately, reinstate `roles_id` in one block and confirm the fixture returns to red; a fixture never seen failing has not been shown to discriminate.
- **Disqualifier:** "the migration applied cleanly" proves the SQL parses, **not** that the procedure runs — parsing is exactly what already succeeded on the broken body. This task may not be reported green on a clean apply alone. If the disposable MySQL is unavailable, report **inconclusive**.

**Done**
- [x] Red run captured verbatim (error 1054) **before** the migration — the migration file was held outside `src/db/migrations/` so the red could not be contaminated
- [x] Green run after: AC.1, AC.2, AC.3 all satisfied — asserted on **both** tables against the seeded `role_id`, with `id` asserted unequal to the source PK
- [x] Full-body diff shows exactly two blocks changed (AC.4) — Leader-extracted mechanically: four hunks, all removals, no other change
- [x] `down()` restores the prior body byte-for-byte (AC.5), verified by diff — `cmp` byte-identical, **and** re-proven live by revert→RED→execute→GREEN
- [x] Fixture observed red again with the defect reintroduced — via the real `migration:test:revert`, which exercises `down()` live rather than by hand-editing one block

> **Rollout hold — advisory B-1 (`execution.md`).** The repair *activates* a latent FK failure: after this migration, `SP_versioning` writes snapshot rows into two tables that `SP_delete_result_version` never deletes and that hold RESTRICT FKs to `results`, so the next **re-version** of a result with objective rows raises MySQL 1451 — on the `green-checks` path with partial, committed deletion. Not a T-02 defect (DD-4 forbids touching the delete routine) and not rework. **Ruled by the user 2026-08-14: companion migration → now T-02b / R-SPV-002.** T-02 must not merge to a shared environment without it (RB-5).

---

### T-02b — Companion migration: `SP_delete_result_version` deletes the objective tables

- **Requirements covered:** **R-SPV-002 (AC.1–AC.5)**; DC-E; RB-5
- **Design references:** §3.1, **DD-6** (amends DD-4), §6
- **Size:** M · **Dependencies:** T-02 · **Status:** **`[x]` done** — Reviewer PASS 2026-08-14, parallel-lens mode (conformance + risk, both PASS). See [`./execution.md`](./execution.md) → *T-02b*
- **Skills:** `nestjs-expert`, `systematic-debugging`

> **Added 2026-08-14 by the T-02 Pivot** — user ruling on advisory B-1. T-02's repair activates a latent MySQL 1451 in the re-versioning path; this closes it. **This is not optional cleanup:** merging T-02 without it converts "versioning never works" into "re-versioning destroys the previous snapshot's children on the untransacted path" (RB-5).

**Scope** — migration `repairSpDeleteResultVersionObjectiveTables` (`DROP` + `CREATE` of `SP_delete_result_version`, two `DELETE` statements added) plus an extension of T-02's fixture to a full **version → delete-version → re-version** cycle.

**Implementation notes**
- The two statements mirror `full_delete_result_version` exactly and go **before** the final `DELETE FROM results` (design §3.1 has the verbatim SQL).
- Derive the body mechanically from the routine's latest definition — `1778510205765`, **not** `1783029013035` (which does not contain this routine's name at all). Re-verify that before editing; guessing which migration owns a routine is the mistake family D-10 was written for.
- **`down()` restores the prior body verbatim**, omission included — same reasoning as DD-3.
- Change nothing else: **32** existing child deletes (33 statements including the final parent delete), the `temp_result_id` selection, the `SIGNAL` guard, and the `(resultCode BIGINT, reportYear INT)` signature all stay byte-identical. *(Corrected 2026-08-18 from "37" — the same Leader miscount already fixed in `requirements.md` AC.4 and `design.md` §3.1, advisory B-12; this was a third site the B-12 remediation missed, caught by the 2026-08-18 validation pass, F-2.)*
- **Do not** add a transaction or handler to the routine. It has neither today; adding one changes failure semantics for all six indicators and stays out of scope.

**Verification** — the extended fixture, on the scratch container.
- **Red first (mandatory):** with T-02's migration applied but this one absent, the version → delete-version → re-version cycle must fail with **MySQL 1451** on the delete. Capture it verbatim.
- **Green after:** the full cycle completes; the first snapshot's objective rows are gone and the second snapshot carries its own.
- **Falsifying input:** revert this migration and confirm the cycle returns to 1451.
- **Disqualifier:** a fixture that versions only **once** structurally cannot see this defect — it needs a pre-existing snapshot. A green single-version run is not evidence for this task.

**Done**
- [x] Red run captured verbatim (error 1451) before the migration — the migration file was held outside `src/db/migrations/`; T-02's test kept passing throughout (1 failed, 1 passed)
- [x] Green run after: AC.1, AC.2 satisfied on the full re-version cycle — snapshot 1's objective rows gone, snapshot 2 carrying its own
- [x] Body diff shows exactly two statements added, placed before `DELETE FROM results` (AC.3, AC.4) — one hunk, +8 lines; `DELETE` count 33 → 35
- [x] `down()` restores the prior body byte-for-byte (AC.5), verified by diff — `cmp` byte-identical
- [x] Fixture observed red again with the migration reverted — revert log confirmed it removed exactly `1784250000000`

---

### T-03 — Full-suite regression and release

- **Requirements covered:** R-SPV-001 (AC.4); RB-2, RB-3; OQ-1
- **Design references:** §6
- **Size:** S · **Dependencies:** T-02 · **Status:** ~~todo~~ → `[~]` **all delegable scope complete, Reviewer PASS on attempt 2 (2026-08-18).** Held open by ONE user-owned criterion: the DevOps note is drafted but not yet sent. See `execution.md` → *T-03 attempt 2 → PASS* and its `Not Done` section
- **Skills:** `nestjs-expert`

**Scope** — full server suite, lint, coverage; confirm OQ-1 against the deployed environment; DevOps note; then update `innovation-use/data-model-and-catalog` (drop T-03, add `Depends on`) and `family.md` FR-6.

> **Carried forward from the T-01 pivot's backward sweep (2026-08-14) — do not drop this.** The correction to this spec made statements in a *neighbouring* spec false. `innovation-use/data-model-and-catalog/tasks.md` must be updated in this task:
> - `:111` — Done criterion "Full migration suite applies **and reverts** cleanly on the scratch schema" is **unachievable as written** without the baseline artifact. Restate it against `design.md` §4.1 / DD-5.
> - `:97` — "Run the **full** migration suite against the scratch schema" carries the same false premise.
> - `:486` — RB-B claims the scratch-schema gap is closed by its T-01 + T-02. It is not; the baseline piece is missing. Restate or add RB-B2.
> - Its T-01/T-02 are now **superseded** by this spec's T-01 + T-01b — mark them as such rather than letting a second harness be built.
>
> **Added by the T-02 pivot's backward sweep (2026-08-14) — this one is an acceptance-criteria conflict, not prose drift.** Chunk 1 asserts the delete-routine divergence as a *fixture expectation*: `design.md:499` and `tasks.md:319` require M6's edit-set assertion to leave "**both divergences intact**" (R-IU-011 AC.8/AC.9), and `design.md:422` files harmonization as out of scope. **T-02b removes one of those two divergences.** M6's assertion must be restated against the post-T-02b body, or it fails for the right reason at the wrong place. Amending it is chunk 1's own gate — this task raises it, it does not silently edit it.

**Implementation notes**
- The suite must be **FULL**, never targeted (KZ-003) — a routine serving all six indicators changed.
- OQ-1: check whether `1783029013035` is applied in staging/production and whether any version/snapshot has been attempted since. This sets user-facing severity and whether comms are needed; it does **not** gate the fix.

**Verification** — `npm test -- --silent`, `npm run test:cov`, `npm run lint -- --quiet`.
- **Falsifying input:** revert one lifecycle-adjacent spec's expectation — the full suite must fail. A suite that passes regardless is not gating this change.
- **Disqualifier:** a targeted run is not evidence here; the blast radius is every indicator.

**Done**
- [x] Full suite green; coverage ≥ 60%, not regressed — 321 suites / 2042 tests; 83.57% stmts, 74.76% branches, 84.62% funcs, 83.56% lines
- [x] `npm run lint -- --quiet` clean and `git status` re-checked — no `--fix` mutations
- [x] OQ-1 answered and recorded; comms decision made — ruling carried verbatim with provenance in `execution.md`; comms: none needed
- [ ] **DevOps informed before the shared-DB run** — ⚠️ **USER-OWNED, STILL OPEN.** [`devops-note.md`](./devops-note.md) is drafted and Reviewer-verified; **sending it is a human action the Leader cannot take** (user ruling 2026-08-18). Flip this by sending the note, then checking the DevOps box in `requirements.md` §7 Sign-off with approver and date
- [x] Chunk 1 updated: T-03 removed, `Depends on` declared, `family.md` FR-6 closed (merge-conditionally, with the residual pre-flight named)

---

## 3. Requirement → task coverage

| Requirement | ACs | Scenario clauses | Tasks |
| --- | --- | --- | --- |
| R-SPV-001 | AC.1–AC.3 → **T-02** · AC.4 → **T-02** (diff) + **T-03** (suite) · AC.5 → **T-02** | *versioning a result with objective rows* · BUT NOT reference `roles_id` → **T-02** · BUT NOT copy the source `id` → **T-02** (AC.3) · AND IT MUST NOT alter another block → **T-02** (AC.4) · AND IT MUST leave `down()` restoring the broken body → **T-02** (AC.5) | T-01, **T-01b**, T-02, T-03 |
| **R-SPV-002** | AC.1–AC.5 → **T-02b** · AC.4 also → **T-03** (suite) | *re-versioning a result with objective rows* · BUT NOT raise 1451 → **T-02b** (AC.1) · BUT NOT leave children deleted with the parent surviving → **T-02b** (AC.1, proven by the full cycle) · AND IT MUST NOT alter another table's delete semantics → **T-02b** (AC.4) | **T-02b**, T-03 |
| RB-1b (harness) | Gate precondition — the scratch schema must be buildable at all | — | **T-01b** |
| RB-5 (activation) | The versioning repair must never merge without the delete repair | — | **T-02b** (fix) + **T-03** (release order) |

Every AC and every negative clause is owned. **The mandatory Bug Mode regression test is T-02's fixture** — red on current `main` with MySQL 1054, green after the migration.

---

## 4. LOC and PR strategy

| PR | Tasks | ~LOC |
| --- | --- | --- |
| PR 1 | T-01 | ~130 (skip entirely if chunk 1 already built it) |
| PR 1b | T-01b | baseline dump (generated artifact) + ~20 of load wiring |
| PR 2 | T-02 | **~1,960** — `up()` + `down()` each reproduce the 981-line body |
| PR 2b | **T-02b** | **~700** — `up()` + `down()` each reproduce the ~165-line delete routine *(corrected 2026-08-18 from "~350-line" — W-9; the routine is 162 lines)*, plus the fixture extension. **Must merge with or before PR 2** (RB-5) |
| PR 3 | T-03 | ~20 (doc updates only) |

**Single PR is acceptable** if T-01 is already satisfied: the substantive diff is two blocks, and reviewers should be pointed at the **body diff**, not the file. Total LOC matches the Document Control budget above (~2,750), ~99% of it unchanged body text. *(Corrected 2026-08-18 — this line said "Total ~2,110 LOC", a figure that predates PR 2b/T-02b and was never updated after the T-02 Pivot added it; newly found during the 2026-08-18 validation-remediation sweep, same defect class as F-1.)*

---

## 5. Done definition

- [ ] T-01, **T-01b**, T-02, **T-02b**, T-03 `done`
- [ ] R-SPV-001's five ACs checked; every scenario clause satisfied
- [ ] **R-SPV-002's five ACs checked; the re-version cycle proven green**
- [ ] Regression fixture demonstrated **red before, green after** — for both defects (1054 and 1451)
- [ ] Full suite green, coverage not regressed
- [ ] `innovation-use/data-model-and-catalog` unblocked and its dependency recorded
