# Requirements — Bugfix / `SP_versioning` references the dropped column `roles_id`

- **Module:** results (lifecycle routines)
- **Spec id:** 2026-08-sp-versioning-roles-id
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked design:** [`./design.md`](./design.md) · **Linked tasks:** [`./tasks.md`](./tasks.md)
- **Routine authority:** [`../../innovation-use/data-model-and-catalog/routine-transcript.md`](../../innovation-use/data-model-and-catalog/routine-transcript.md) §2.4
- **Last updated:** 2026-08-14

---

## Document Control

| Field | Value |
| --- | --- |
| Type | **Bug** |
| Depth | **Lite** (Bug Mode) — one migration, one fixture, no design latitude |
| Approval Mode | gated |
| Severity | **High** — versioning/snapshot is non-functional for **all six indicators** |
| Discovered by | `innovation-use/data-model-and-catalog`, while transcribing lifecycle routines for migration M6. **Not found by any test** — no test in this repository executes a stored routine |
| Blocks | `innovation-use/data-model-and-catalog` (its M6 reproduces this procedure's body; no versioning fixture can run until this lands) |
| Root cause | **Confirmed** against the working tree — see §2. Not a hypothesis. |

---

## 1. Executive Summary

`SP_versioning` — the stored procedure that copies a result and its children into a new snapshot — **cannot execute**. Two of its `INSERT` blocks name `roles_id`, a column dropped by an earlier migration, so the procedure raises **MySQL 1054, Unknown column** on first call.

The defect is invisible to CI because **nothing in this repository executes a stored routine**; the only coverage of this layer is presence-assertions on emitted SQL strings.

**Fix:** one append-only migration rewriting those two blocks. Nothing else in the 981-line body changes.

---

## 2. Bug Diagnosis — confirmed root cause

### 2.1 Reproduction

```sql
CALL SP_versioning(<any active non-snapshot STAR result_official_code>);
-- ERROR 1054 (42S22): Unknown column 'roles_id' in 'field list'
```

Reachable from the application at `green-checks.repository.ts:307` and `result-status-workflow.repository.ts:172`.

### 2.2 Timeline

| Migration | Action |
| --- | --- |
| `1782486943935:15,21` | Creates `result_strategic_objectives` and `result_impact_outcomes` with **both** `roles_id` (NOT NULL) and `role_id` (NULL) |
| `1783022620616:10,26` | Copies `role_id = roles_id` on both tables |
| `1783022620616:13,29` | **`ALTER TABLE … DROP COLUMN roles_id`** on both tables |
| `1783029013035:8` | Recreates `SP_versioning` — its two new blocks **still name `roles_id`** |

`1783022620616` runs **before** `1783029013035`, and no later migration re-adds the column (migrations run to `1784211738931`). The entities confirm the end state: `result-impact-outcome.entity.ts` declares `role_id` only.

### 2.3 Three independent defects, both blocks

| # | Defect | Evidence | Error |
| --- | --- | --- | --- |
| 1 | Names the dropped column `roles_id` | `1783029013035:126`, `:153` | **1054** Unknown column |
| 2 | **11 columns against 10 `SELECT` expressions** | `:117-127` vs `:129-138`; `:144-154` vs `:156-165` | **1136** Column count doesn't match |
| 3 | Copies the source **AUTO_INCREMENT PK** (`rio.id` / `rso.id`) into the same PK column | `:135`, `:162`; PK declared `1782486943935:15,21` | **1062** Duplicate entry |

Defect 1 masks 2 and 3 — all three must be fixed for the block to execute.

---

## 3. Requirements

### R-SPV-001 — `SP_versioning` executes and copies both objective tables

The procedure **SHALL** complete without error, and **SHALL** copy `result_impact_outcomes` and `result_strategic_objectives` rows to the new version.

**Acceptance criteria:**
- [ ] AC.1 — `CALL SP_versioning(<code>)` completes without error.
- [ ] AC.2 — Both tables' active rows are copied to the new version with `role_id` preserved.
- [ ] AC.3 — Each copied row receives a **fresh** `id`; the source row's `id` is not reused.
- [ ] AC.4 — **No other block of the procedure changes.** The other 27 copy blocks are byte-identical.
- [ ] AC.5 — `down()` restores the exact prior body, **defects included**.

#### Scenario: Versioning a result with objective rows

- GIVEN an active, non-snapshot STAR result carrying `result_impact_outcomes` and `result_strategic_objectives` rows
- WHEN `SP_versioning` is called for it after the fix
- THEN the procedure completes and a new snapshot row exists
- AND both tables' rows appear against the new `result_id`, with `role_id` preserved
- BUT it must NOT reference `roles_id`, which exists on neither table
- BUT it must NOT copy the source row's `id`, which would collide with the existing primary key
- AND IT MUST NOT alter any other copy block — this is a repair of two blocks, not a rewrite
- AND IT MUST leave `down()` restoring the broken body verbatim, because a `down()` that improves on its `up()` is not a reversal

---

## 4. Verification Strategy

### 4.1 Defect class → gate

| # | Defect class | Gate | Verdict |
| --- | --- | --- | --- |
| DC-A | The procedure still cannot execute | **Regression fixture, red before green** (§4.2) | ✅ substituted |
| DC-B | The repair silently changes another block | Full-body diff of `up()` against `1783029013035:8-988`, statement by statement | ✅ covered |
| DC-C | `down()` does not restore the prior state | Diff `down()`'s body against the pre-fix body | ✅ covered |
| DC-D | Copied rows collide or lose `role_id` | Fixture asserts fresh `id` **and** preserved `role_id` | ✅ covered |

> **No existing automated gate covers any of these.** Jest does not instrument SQL, and the repository's green-check specs are presence-assertions on emitted strings. The fixture below is the only real coverage.

### 4.2 The regression fixture is mandatory — red before green

- **Red:** on the current `main`, `CALL SP_versioning(<code>)` **must fail with MySQL 1054**.
- **Green:** after the migration, the same call must succeed and satisfy AC.2 and AC.3.
- **Falsifying input:** if the fixture passes *before* the migration, the premise is wrong for that environment — **stop and escalate**; do not ship a migration for a defect that is not present.
- **Disqualifier:** a green run never observed red is not evidence — it proves the fixture ran, not that it discriminates. If the disposable MySQL cannot be provisioned, report **inconclusive, not passed**.

**Harness dependency.** This fixture needs a scratch schema, and the repo has **no working mechanism** for one: `migration:dev:execute` / `migration:revert` hardcode the `orm.config.ts` export, which is bound to `CORE` — the shared, non-disposable database. See §5.

---

## 5. Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| RB-1 | **No scratch-schema mechanism exists.** The TEST datasource target (`orm.config.ts:34-39`) is unreachable from any npm script; `ARI_TEST_MYSQL_PORT` does not exist; `orm-connection-test.module.ts` binds to `CORE` despite its name | **High** | This spec depends on the TEST datasource module and Docker MySQL scaffolding (chunk-1 tasks T-01/T-02, or built here if this ships first — see `design.md` §4) |
| RB-2 | Migrations are append-only (ADR-5) against a shared, non-disposable DB | **High** | Additive/repair-only; no DDL on any table; human approval before the shared DB; verified `down()` |
| RB-3 | Touching a procedure that serves **all six indicators** | **High** | Only two blocks change; full-body diff is a done criterion; fixture proves the other blocks still copy |
| RB-4 | Unknown production exposure — how long versioning has been broken, and whether callers swallow the error | Medium | §6 OQ-1; confirm against the deployed environment before release comms |

---

## 6. Open Questions

| # | Question | Blocks |
| --- | --- | --- |
| OQ-1 | Has `1783029013035` been applied to staging/production, and has anyone attempted a version/snapshot since? This sets the user-facing severity and whether a comms note is needed | release comms, not the fix |
| OQ-2 | `SP_delete_result_version` does **not** delete these two tables while `full_delete_result_version` does (transcript §4.1) — a separate pre-existing divergence. Out of scope here; worth its own ticket? | nothing |

---

## 7. Sign-off

- [ ] Engineering lead
- [ ] DevOps — required before the migration runs against the shared dev database
- [ ] Security review — not required (no auth, secrets, or PII surface changed)
