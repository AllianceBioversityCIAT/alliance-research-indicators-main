# Tasks — Bugfix / `SP_versioning` references the dropped column `roles_id`

- **Module:** results (lifecycle routines)
- **Spec id:** 2026-08-sp-versioning-roles-id
- **Status:** not-started
- **Owner:** David Felipe Casañas Hernández
- **Linked requirements:** [`./requirements.md`](./requirements.md) · **Linked design:** [`./design.md`](./design.md)
- **Last updated:** 2026-08-14

---

## 0. Before starting

- **Nothing runs against `ARI_MYSQL_*`.** The existing `migration:dev:execute` / `migration:revert` scripts point at the **shared, non-disposable** database. T-01 exists because there is currently no other route.
- **Migrations are append-only** (ADR-5). Re-check `git status` after `npm run lint -- --quiet` — the script carries `--fix` and mutates files.
- **Re-verify line numbers** before editing. `1783029013035:116` and `:143` were true on 2026-08-14; the stable anchors are the block *names*, not the numbers.

**Budget tripwire:** 3 tasks · ~2,050 LOC · 1–2 review rounds. If the repair turns out to need more than the two blocks, **stop and escalate** — that is a different bug.

---

## 1. Dependency graph

```
T-01 (scratch-schema harness) → T-02 (migration + regression fixture) → T-03 (regression + release)
```

---

## 2. Task list

### T-01 — Scratch-schema harness: TEST datasource, port var, Jest config

- **Requirements covered:** R-SPV-001 (precondition for its gate); RB-1
- **Design references:** §4
- **Size:** M · **Dependencies:** none · **Status:** todo
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
- [ ] Module resolves to `dataSourceTarget.TEST`, demonstrated by the sentinel
- [ ] Full migration suite applies **and reverts** on the scratch schema
- [ ] A smoke fixture passes with the container up and **fails** with it down
- [ ] `orm.config.ts` and `orm-connection-test.module.ts` unmodified

---

### T-02 — The migration and its regression fixture (red → green)

- **Requirements covered:** **R-SPV-001 (AC.1–AC.5)**; DC-A, DC-B, DC-C, DC-D
- **Design references:** §2 (the repaired shape), §3 (migration), DD-2, DD-3
- **Size:** M · **Dependencies:** T-01 · **Status:** todo
- **Skills:** `nestjs-expert`, `systematic-debugging`, `tdd`

**Scope** — migration `repairSpVersioningObjectiveBlocks` (`DROP` + `CREATE` of `SP_versioning`, two blocks changed) plus the regression fixture under `test/fixtures/`.

**Implementation notes**
- Repaired lists are **9 columns / 9 values**: drop `roles_id` and `id` from both the column list and the `SELECT` (design §2.2). Apply to **both** `result_impact_outcomes` (`:116`) and `result_strategic_objectives` (`:143`).
- `FROM` / `WHERE` clauses unchanged.
- **`down()` restores the prior broken body verbatim** (DD-3). Do not "improve" it.
- Change nothing else — the other 27 blocks are byte-identical.
- **Do not** touch the delete-routine divergence over these same tables (DD-4, OQ-2).

**Verification** — the fixture script from T-01.
- **Red first (mandatory):** on current `main`, `CALL SP_versioning(<code>)` must fail with **MySQL 1054**. Capture the error verbatim.
- **Green after:** the same call succeeds; both tables' rows appear on the new version with `role_id` preserved and a **fresh** `id`.
- **Falsifying input:** if the fixture passes *before* the migration, the premise is wrong for this environment — **stop and escalate**, do not ship. Separately, reinstate `roles_id` in one block and confirm the fixture returns to red; a fixture never seen failing has not been shown to discriminate.
- **Disqualifier:** "the migration applied cleanly" proves the SQL parses, **not** that the procedure runs — parsing is exactly what already succeeded on the broken body. This task may not be reported green on a clean apply alone. If the disposable MySQL is unavailable, report **inconclusive**.

**Done**
- [ ] Red run captured verbatim (error 1054) **before** the migration
- [ ] Green run after: AC.1, AC.2, AC.3 all satisfied
- [ ] Full-body diff shows exactly two blocks changed (AC.4)
- [ ] `down()` restores the prior body byte-for-byte (AC.5), verified by diff
- [ ] Fixture observed red again with the defect reintroduced

---

### T-03 — Full-suite regression and release

- **Requirements covered:** R-SPV-001 (AC.4); RB-2, RB-3; OQ-1
- **Design references:** §6
- **Size:** S · **Dependencies:** T-02 · **Status:** todo
- **Skills:** `nestjs-expert`

**Scope** — full server suite, lint, coverage; confirm OQ-1 against the deployed environment; DevOps note; then update `innovation-use/data-model-and-catalog` (drop T-03, add `Depends on`) and `family.md` FR-6.

**Implementation notes**
- The suite must be **FULL**, never targeted (KZ-003) — a routine serving all six indicators changed.
- OQ-1: check whether `1783029013035` is applied in staging/production and whether any version/snapshot has been attempted since. This sets user-facing severity and whether comms are needed; it does **not** gate the fix.

**Verification** — `npm test -- --silent`, `npm run test:cov`, `npm run lint -- --quiet`.
- **Falsifying input:** revert one lifecycle-adjacent spec's expectation — the full suite must fail. A suite that passes regardless is not gating this change.
- **Disqualifier:** a targeted run is not evidence here; the blast radius is every indicator.

**Done**
- [ ] Full suite green; coverage ≥ 60%, not regressed
- [ ] `npm run lint -- --quiet` clean and `git status` re-checked
- [ ] OQ-1 answered and recorded; comms decision made
- [ ] DevOps informed before the shared-DB run
- [ ] Chunk 1 updated: T-03 removed, `Depends on` declared, `family.md` FR-6 closed

---

## 3. Requirement → task coverage

| Requirement | ACs | Scenario clauses | Tasks |
| --- | --- | --- | --- |
| R-SPV-001 | AC.1–AC.3 → **T-02** · AC.4 → **T-02** (diff) + **T-03** (suite) · AC.5 → **T-02** | *versioning a result with objective rows* · BUT NOT reference `roles_id` → **T-02** · BUT NOT copy the source `id` → **T-02** (AC.3) · AND IT MUST NOT alter another block → **T-02** (AC.4) · AND IT MUST leave `down()` restoring the broken body → **T-02** (AC.5) | T-01, T-02, T-03 |

Every AC and every negative clause is owned. **The mandatory Bug Mode regression test is T-02's fixture** — red on current `main` with MySQL 1054, green after the migration.

---

## 4. LOC and PR strategy

| PR | Tasks | ~LOC |
| --- | --- | --- |
| PR 1 | T-01 | ~130 (skip entirely if chunk 1 already built it) |
| PR 2 | T-02 | **~1,960** — `up()` + `down()` each reproduce the 981-line body |
| PR 3 | T-03 | ~20 (doc updates only) |

**Single PR is acceptable** if T-01 is already satisfied: the substantive diff is two blocks, and reviewers should be pointed at the **body diff**, not the file. Total ~2,110 LOC, ~99% of it unchanged body text.

---

## 5. Done definition

- [ ] T-01 … T-03 `done`
- [ ] R-SPV-001's five ACs checked; every scenario clause satisfied
- [ ] Regression fixture demonstrated **red before, green after**
- [ ] Full suite green, coverage not regressed
- [ ] `innovation-use/data-model-and-catalog` unblocked and its dependency recorded
