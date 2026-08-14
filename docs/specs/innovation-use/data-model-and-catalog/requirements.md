# Requirements — Results (Innovation Use) / Data Model, Catalog & Green Check

- **Module:** results (`innovation-use`)
- **Spec id:** 2026-08-innovation-use-data-model
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked PRD section:** [`docs/prd.md` §5.1 Server responsibilities](../../../prd.md), AC-Results-Lifecycle, AC-Controlled-Lists, AC-Testing
- **Linked TRD sections:** [`docs/trd/trd.md`](../../../trd/trd.md) §2.4 (ADR-5 append-only migrations, ADR-6 OpenSearch decorators), §5.1 Server persistence, §5.2 Result aggregate, §7.1 Result lifecycle, §12 Testing strategy
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Parent spec:** [`../family.md`](../family.md) — chunk 1 of 3
- **Linked tickets:** AC-1679 (branch `AC-1679-Create-the-innovation-use-section`)
- **Depth:** Full (data + migration work against a shared, non-disposable database)
- **Last updated:** 2026-08-14

---

## Document Control

| Field | Value |
| --- | --- |
| Type | Change |
| Approval Mode | gated (inherited from `proposal.md`) |
| Depends on | **[`bugfix/sp-versioning-roles-id`](../../bugfix/sp-versioning-roles-id/)** — must merge before T-10 (M6). No other spec dependency; family root otherwise |
| Blocks | `innovation-use/details-api`, then `innovation-use/details-page` |
| Depth rationale | Creates two tables, alters two shared tables, adds a MySQL stored function, seeds a controlled vocabulary, **amends four lifecycle routines that serve all six indicators** (R-IU-011 — the chunk's largest item), and **depends on the extracted `sp-versioning-roles-id` bugfix** for a non-executable `SP_versioning` block it discovered. ADR-5 makes every migration immutable once merged. Full depth is mandatory, not stylistic. |
| Judgment Day | 3 rounds, lineage **exhausted**, terminal `ESCALATED`. R1: 21 findings. R2: 17/21 closed, 11 new. R3: 12 new. R1–R2 applied in-lineage; **R3 applied by the 2026-08-14 fresh pass**. Ledger: [`./judgment.md`](./judgment.md). |
| Fresh pass | SQL-lifecycle layer re-specified per [`./HANDOFF.md`](./HANDOFF.md): routine set re-derived **by call site**, all four bodies re-transcribed **by reading**. Non-SQL layers unchanged. |
| Delegation | None. All exploration performed inline (session constraint); no scout or design subagent was spawned. |
| Open questions | **All six resolved by the product owner on 2026-08-14.** See §10 Decisions. |

---

## Executive Summary

Innovation Use (`indicator_id = 6`) is **half-wired** in ARI: the indicator row, the enum, the query slug, and all six status-workflow transitions already exist, but there is nowhere to store Innovation Use data and no way to compute its section completion. A user who selects it today gets a result whose indicator-specific section does not exist and whose completeness can never turn green.

This spec delivers only the substrate: **two tables, a ten-row use-level catalog, six additive columns on two shared tables, three role discriminators, one MySQL stored function, amendments to all **four** lifecycle routines, a repair to a fifth-defect surface in `SP_versioning`, and the green-check wiring.** It ships no endpoint and no UI — it is invisible to users until chunk 2 lands.

Four findings drive the design more than the schema does:

1. **The repository has no automated coverage of stored-routine behavior** (§4.1). The existing green-check spec mocks `DataSource.query` and asserts only that a helper returns a string containing a function name — a presence-assertion that would stay green if `innovation_use_validation` returned garbage. §4 substitutes a real gate rather than inheriting a blind one.
2. **The catalog's `id` is not its `level`** (D-1). `id = level + 1`. Any rule written as `innovation_use_level_id >= 6` is off by one and would make the justification mandatory a full level too early. The rule must join the catalog and compare `level`.
3. **Four lifecycle routines enumerate every child table and column by name** (R-IU-011). Unamended, versioning silently discards the entire Innovation Use detail record and every new count, both hard-delete paths orphan rows, and **soft delete leaves an *active* orphan**. A data-loss class with **no runtime signal**. The routine count was wrong in three consecutive review rounds (2 → 3 → 4), every time from enumerating by suspected name — which is why [`./routine-transcript.md`](./routine-transcript.md) now transcribes all four verbatim **and records the call-site method that produced it**.
4. **`SP_versioning` is non-executable today, for every indicator** (R-IU-012). Two of its blocks reference `roles_id`, a column dropped by an earlier migration. Discovered by this spec's transcription discipline, not by any test — because nothing in the repository executes a stored routine (§4.1). It blocks R-IU-011's gate and so must be repaired first.

---

## 1. Context

**What:** the persistence and validation substrate for the Innovation Use result category.

**Why now:** the STAR product owner requested a dedicated Innovation Use reporting page (AC-1679). The client page (chunk 3) cannot be built without an API (chunk 2), which cannot be built without this.

**Who asked:** product owner, via the user story pasted into `/akili-propose` on 2026-08-14, with the catalog data and six scope rulings supplied on the same date.

**Explicitly NOT changing:**

- Innovation Dev's boolean sex/age disaggregation semantics or its data.
- The `innovation_dev_validation`, `cap_sharing_validation`, `policy_change_validation`, or `oicr_validation` stored functions.
- `clarisa_innovation_readiness_levels` — a separate vocabulary, left untouched.
- Any HTTP endpoint, DTO, controller, or service (chunk 2).
- Any client file (chunk 3).
- The decision to implement green checks as MySQL stored functions — inherited, not endorsed (see D-6).

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Innovation Use** | Result category `IndicatorsEnum.INNOVATION_USE = 6`; measures the extent to which an innovation is already being used. Distinct from **Innovation Dev** (`= 2`), which measures readiness of an innovation under development. |
| **Use level** | A 0–9 point on the innovation *use* maturity scale, each with a `name` and a `definition`. A distinct vocabulary from the *readiness* scale used by Innovation Dev. |
| **Catalog `id` vs `level`** | The catalog primary key is **not** the scale point. `id = level + 1` (id 1 → level 0 … id 10 → level 9). Every business rule uses `level`. |
| **Green check** | A per-section boolean completeness flag, computed by a MySQL stored function named `<section>_validation(result_code BIGINT)` and assembled by `GreenCheckRepository.calculateGreenChecks`. |
| **Role discriminator** | A `*_role_id` FK on a shared child table (`result_actors.actor_role_id`, `result_institution_types.institution_type_role_id`, `result_quantifications.quantification_role_id`) recording which indicator's section owns the row. |
| **Submit gate** | `StatusWorkflowFunctionHandlerService.completenessValidation` — ANDs every non-visual-only key from `calculateGreenChecks` and throws `BadRequestException` if any is false. |
| **Disaggregated mode / aggregate mode** | An actor row is in *disaggregated* mode when sex/age breakdown applies (four counts, total derived) and in *aggregate* mode when `sex_age_disaggregation_not_apply = TRUE` (one standalone count, no parts). Mutually exclusive. |
| **Presence-assertion** | A test proving an artifact exists (a name in a string, a column in a table) without proving it behaves correctly. |
| `valid_text()` | Existing MySQL helper testing that a text column is meaningfully non-empty. |

---

## 3. System Context & Scope

### 3.1 What exists today (verified against the working tree, 2026-08-14)

| Concern | State | Evidence |
| --- | --- | --- |
| Indicator catalog row | ✅ seeded, `is_active` default 1, with `long_description` | `1729174028390-addedDescriptionColumnIndicators.ts:14`; `1753303310598-updateIndicators.ts` |
| Enum + query slug | ✅ `INNOVATION_USE = 6`, `'innovation-use'` | `indicators/enum/indicators.enum.ts` |
| Status workflow | ✅ **12** transition rows for indicator 6 | 6 base rows (`1767901590080`, ids 25–30) + 1 (`1768573722571:23`, id 49) + 5 bilateral (`1779190000004`, indicators `[1,2,3,4,6]` × 5 transitions) |
| Lifecycle routines | ⚠️ **Four** routines enumerate every child table **and column** by name | `SP_versioning` `1783029013035:8` (snapshot copy) · `SP_delete_result_version` `1778510205765:173` (hard-remove a version) · `full_delete_result_version` `1783029013035:993` (hard-remove any result) · **`delete_result` `1764275660631:312` (THE soft delete, 3 call sites)**. Enumerated by call site; full transcription: [`./routine-transcript.md`](./routine-transcript.md) |
| `SP_versioning` health | ❌ **non-executable** — blocks 3–4 name `roles_id`, dropped by `1783022620616:13,29`; plus a column/value count mismatch and an AUTO_INCREMENT PK collision | transcript §2.4. Raises MySQL **1054** on first call, for all six indicators |
| Shared child tables | ✅ `result_actors`, `result_institution_types`, `result_quantifications` exist, shared across indicators | `domain/entities/*/entities/*.entity.ts` |
| Submit gate | ✅ generic — ANDs **all** non-visual-only green-check keys | `result-status-workflow/function-handler.service.ts:312-333` |
| Detail table | ❌ no `result_innovation_use` | — |
| Use-level catalog | ❌ only `clarisa_innovation_readiness_levels` (Innovation **Dev**) | `tools/clarisa/entities/` |
| Actor counts | ❌ disaggregation columns are `boolean` | `result-actors/entities/result-actor.entity.ts:44-68` |
| Organization count | ❌ no count column | `result-institution-types/entities/` |
| Role discriminators | ❌ `ActorRolesEnum` / `InstitutionTypeRoleEnum` only have `INNOVATION_DEV = 1` | both `enum/` files |
| Green check | ❌ no `INNOVATION_USE` case; no `innovation_use_validation` | `green-checks/repository/green-checks.repository.ts:82-104` |

### 3.2 In scope

Tables and entity for the Innovation Use detail record · the ten-row use-level catalog and its migration seed · six additive count columns across two shared tables (disaggregated **and** aggregate modes) · three new role-discriminator rows · the `innovation_use_validation` stored function · **amendments to all FOUR lifecycle routines** — `SP_versioning`, `SP_delete_result_version`, `full_delete_result_version`, `delete_result` (R-IU-011) · **the `SP_versioning` block repair** (R-IU-012) · `GreenCheckRepository` and `FindGreenChecksDto` wiring · the `Result` entity relation · a runnable scratch-schema harness **including the TEST datasource module and `ARI_TEST_MYSQL_PORT`** · unit specs for everything testable in TypeScript.

### 3.3 Out of scope

Endpoints, DTOs, controllers, services (chunk 2) · any client file (chunk 3) · investment / co-investment tables (family non-goal) · a unit-of-measure catalog (D-2: unit stays free text) · a live CLARISA sync for the use-level catalog (D-1: a sync would erase the fields the feature needs) · **OpenSearch indexing of indicator-specific detail fields** (D-5 revised → DD-8; no indicator has it) · a column-agnostic rewrite of the lifecycle procedures (ADR-11 alternative *b*) · backfill of existing indicator-6 results (A-3).

---

## 4. Verification Strategy — Defect Classes and Their Gates

> **This section is load-bearing.** It is written before the tasks precisely because this spec's dominant defect class has no automated gate in the repository today, and inheriting the existing green-check test pattern would produce a green suite over broken validation.

### 4.1 The blind spot, stated plainly

`green-checks.repository.spec.ts` constructs the repository with a mocked `DataSource` whose `query` is `jest.fn()`, then asserts:

```
expect(repository.innovationDevValidation('r.x')).toContain('innovation_dev_validation')
```

That is a **presence-assertion**: it proves the helper emits a string containing a name. It cannot prove the named function exists in the database, cannot prove it compiles, and cannot prove it returns the right boolean. `test/` contains a single `app.e2e-spec.ts`. **No test in this repository has ever executed a stored function.**

Therefore: writing `innovation_use_validation` and adding a matching `toContain(...)` assertion would satisfy every existing convention, pass `npm test`, pass lint, pass the 60% coverage floor — and prove nothing about the behavior this spec exists to deliver.

### 4.2 Defect class → gate mapping

| # | Defect class this spec can produce | Automated gate | Verdict |
| --- | --- | --- | --- |
| DC-1 | Destructive or irreversible DDL against the shared DB | **New** npm scripts passing `-d ./src/db/config/mysql/orm.test.config.ts` (`design.md` §6.5.1), then apply + revert on a scratch schema; diff review of every migration file. ⚠️ **The existing `migration:dev:execute` / `migration:revert` CANNOT serve this** — both hardcode the `orm.config.ts` export, which is bound to **`CORE`** (the shared DB) at module load. **There is no `migration:run` script** either (`package.json:28-32`) | ✅ covered, **only once RB-9's mechanism exists** |
| DC-2 | **`innovation_use_validation` returns the wrong boolean** (wrong operator, wrong join, wrong null handling, missing role filter) | **none exists** | ❌ **substituted — §4.3** |
| DC-3 | The stored function fails to compile / is absent at runtime | none in unit tests | ❌ **substituted — §4.3** |
| DC-4 | Innovation Dev regression from altering `result_actors` / `result_institution_types` | Full server suite `npm test -- --silent` + Innovation Dev specs | ✅ covered |
| DC-5 | `FindGreenChecksDto` drifts from what `calculateGreenChecks` returns | Unit spec asserting the returned key set for an indicator-6 result | ✅ covered |
| DC-6 | Repository switch omits `INNOVATION_USE` or omits it from the `ip_rights` inclusion list | Unit spec on `calculateGreenChecks` per indicator | ✅ covered |
| DC-7 | Entity column type mismatch (e.g. `bigint` where the function reads an integer) | `tsc` + entity metadata spec | ✅ covered |
| DC-8 | Use-level seed content wrong (wrong text, missing level, duplicated row) | **Now automatable** — the canonical ten rows are known (§R-IU-002). A migration spec asserts the seeded set equals the fixed table exactly. | ✅ covered *(upgraded — see D-1)* |
| DC-9 | Submit gate silently starts or stops blocking indicator 6 | Unit spec on `completenessValidation` with an indicator-6 payload | ✅ covered |
| DC-10 | **Off-by-one from comparing the catalog `id` instead of `level`** — `id = level + 1`, so `id >= 6` means `level >= 5` and makes the justification mandatory one level too early | Part of the §4.3 truth table (fixtures at level 5 and level 6 are the discriminating pair) | ❌ **substituted — §4.3** |
| ~~DC-11~~ | ~~OpenSearch mapping breaks or drops existing fields~~ | **Withdrawn** — R-IU-010 reduced to a non-goal (D-5 revised). No OpenSearch file is touched | n/a |
| **DC-12** | **Lifecycle data loss** — all **four** routines enumerate tables (and on the copy path columns) by name, so new schema is silently skipped on version/snapshot, orphaned on both hard deletes, and left as an **active orphan** on soft delete. **No error, no log, no metric** | **none exists** | ❌ **substituted — §4.3** |
| **DC-13** | **A lifecycle routine that cannot execute at all** — `SP_versioning` names the dropped column `roles_id` (transcript §2.4). Distinct from DC-12: not silent-wrong, but hard-failing, and **invisible for the same reason** — nothing executes routines, so nobody has called it | **none exists** | ❌ **gated externally** by [`bugfix/sp-versioning-roles-id`](../../bugfix/sp-versioning-roles-id/) |

### 4.3 Substitutions for the unguarded classes

| Class | Substitute gate | Disqualifier |
| --- | --- | --- |
| DC-2, DC-3, DC-10, DC-12, **DC-13** | **A real-MySQL integration harness** on a **disposable** database, running the **full** migration suite (not only this spec's migrations — the function depends on `results`, `result_actors`, `clarisa_actor_types`, and `valid_text()`, none of which this spec creates). **Nineteen fixtures, F1–F18** (incl. F9b), defined in `design.md` §6.5. The discriminating pairs: **F3 (level 5, no explanation → 1)** vs **F4 (level 6, no explanation → 0)** catches DC-10; **F13** (version → all fields preserved), **F14** (version hard delete → no orphan), **F15** (full hard delete → no orphan), **F18** (soft delete → row deactivated) and **F16** (Innovation Dev unchanged across all four routines) catch DC-12. **DC-13 is gated by the extracted bugfix spec**, not here. | If the disposable MySQL cannot be provisioned, the check is **inconclusive, not passed**. Report it as inconclusive and escalate — never substitute a `toContain` assertion and call the class covered. A run that exits `0` because it skipped every fixture is not a pass. **Never point the harness at `ARI_MYSQL_*`** — that is the shared, non-disposable database, and the default `orm.config.ts` export goes there. |

**What would make each gate FAIL** — a check that cannot fail is not evidence:

| Fixture | Input that produces a FAIL |
| --- | --- |
| F3 / F4 | Writing the rule as `innovation_use_level_id >= 6`: F4 returns `1` instead of `0` |
| F13 | Omitting any of the six new columns from `SP_versioning`'s copy lists: that column reads `NULL` on the new version |
| F14 / F15 / F18 | Omitting the corresponding statement from that routine: the detail row survives (or, for F18, survives **active**) |
| F16 | Any edit that changes an Innovation Dev column or row across the four routines — including "harmonizing" the delete divergence |
| F19 | Running it **before** M0: `CALL SP_versioning` raises MySQL 1054 and the fixture errors rather than asserting |

**Accepted risk:** if the environment cannot run a disposable MySQL, DC-2 / DC-3 / DC-10 / DC-12 / DC-13 remain unguarded. Recorded here as an accepted, acknowledged blind spot — recoverable — rather than hidden behind a green `npm test`. It must be stated in the task's execution note, not discovered later.

### 4.4 Two silent-failure classes, named

Neither DC-2 nor DC-12 produces any runtime signal. A validation function returning a wrong boolean yields no error and no log — just a section that will not turn green, or turns green wrongly. A stored procedure that forgets a column yields no error either — just `NULL` where data used to be. **Automated observability cannot substitute for either gate**, which is why §4.3's harness is the only real coverage.

**Kaizen:** **KZ-001** ("a test double that doesn't evaluate what it stands in for produces a green suite over broken behavior") is the exact failure mode of §4.1 and is what §4.3 exists to prevent. **KZ-002** ("enumerate by *what renders*, not by where the feature lives") is the shape of DC-12 at the server tier — the lifecycle procedures *read* these tables from outside the feature folder. **KZ-004** requires pre-flighting the verification command's prerequisites — `node_modules`, a provisionable MySQL, **and the exact npm script names** (there is no `migration:run` script in this repo) — *before* the migration lands.

---

## 5. Stakeholders / Personas

| Persona (PRD §3) | Interest in this chunk |
| --- | --- |
| Result Contributor / Researcher | Indirect — cannot see this chunk, but every Innovation Use behavior depends on it. US-RC-1, US-RC-2, R-2. |
| MEL Regional Expert | Indirect — the submit gate they rely on must treat indicator 6 exactly as it treats indicators 1, 2, 4, 5. US-MEL-4 (audit trail). |
| System Admin / Developer | Direct — owns migration execution against the shared DB and any rollback. US-SA-3. |
| Product owner | Direct — supplied the catalog data and all six scope rulings (§10). |

---

## 6. Functional Requirements

### R-IU-001 — Innovation Use detail record

- **As a** Result Contributor
- **I want** my Innovation Use level and its justification stored against my result
- **So that** the reporting page can save a draft and resume it later

**Details:**
- Table `result_innovation_use`, entity extending `AuditableEntity`, `result_id` as primary key (mirrors `result_innovation_dev`).
- Columns: `innovation_use_level_id` (bigint, nullable, FK to the use-level catalog), `innovation_use_level_explanation` (text, nullable).
- Relations: `Result` gains the inverse side; the entity gains `@ManyToOne` to `Result` and to the catalog.
- Audit + soft-delete columns from `AuditableEntity`.

**Acceptance criteria:**
- [ ] AC.1 — The table exists with `result_id` as PK and both FKs resolvable.
- [ ] AC.2 — The entity is registered in the TypeORM datasource and `tsc` compiles clean.
- [ ] AC.3 — Inserting a row and reading it back preserves both columns and populates the audit columns.
- [ ] AC.4 — `is_active` defaults to `1`, `deleted_at` to `NULL`, matching every sibling entity.

#### Scenario: A detail record persists

- GIVEN a result with `indicator_id = 6`
- WHEN a `result_innovation_use` row is written for it
- THEN the row is retrievable by `result_id`
- AND the audit columns are populated from the acting user
- BUT it must NOT be possible to write two active rows for the same `result_id`
- AND IT MUST reject an `innovation_use_level_id` absent from the catalog

**Out of scope:** the endpoint that writes this row (chunk 2).

---

### R-IU-002 — Innovation Use level catalog

- **As a** Result Contributor
- **I want** the 0–9 innovation use scale with each level's definition
- **So that** selecting a level shows me what that level means

**Details:**
- Table `clarisa_innovation_use_levels`, mirroring the shape of `clarisa_innovation_readiness_levels`: `id` (PK, bigint, **not** auto-increment), `level` (bigint), `name` (text), `definition` (text), plus `AuditableEntity` columns.
- Seeded **by migration** with exactly the ten canonical rows below.
- **`id` is not `level`.** `id = level + 1`. Both are stored; `id` is the FK target, `level` is the business value.
- **`name` is not unique** — it repeats in pairs across adjacent levels. Only `level` uniquely identifies a scale point.

**Canonical seed (product owner, 2026-08-14; `id` + `name` match CLARISA `GET /api/innovation-use-levels`):**

| id | level | name | definition |
| --- | --- | --- | --- |
| 1 | 0 | No use | Innovation is not used. |
| 2 | 1 | Project lead organization | Innovation is used by organization(s) leading the innovation development. |
| 3 | 2 | Partners | Innovation is used by some partners involved in initial innovation development. |
| 4 | 3 | Partners | Innovation is commonly used by partners involved in initial innovation development. |
| 5 | 4 | Connected next-user | Innovation is used by some organizations connected to partners involved in the initial innovation development. |
| 6 | 5 | Connected next-user | Innovation is commonly used by organizations connected to partners involved in the initial innovation development. |
| 7 | 6 | Unconnected next-user | Innovation is used by organizations not connected to partners involved in the initial innovation development. |
| 8 | 7 | Unconnected next-user | Innovation is commonly used by organizations not connected to partners involved in the initial innovation development. |
| 9 | 8 | End-user / Beneficiaries | Innovation is used by some end-users or beneficiaries who were not involved in the initial innovation development. |
| 10 | 9 | End-user / Beneficiaries | Innovation is commonly used by end-users or beneficiaries who were not involved in the initial innovation development. |

**Acceptance criteria:**
- [ ] AC.1 — Exactly ten active rows exist, ids 1–10, levels 0–9, no gaps and no duplicate `level`.
- [ ] AC.2 — Every row's `name` and `definition` match the table above **verbatim**.
- [ ] AC.3 — The seed is inside a migration file, not applied manually.
- [ ] AC.4 — Re-running the migration suite from empty produces the identical ten rows.
- [ ] AC.5 — `clarisa_innovation_readiness_levels` is unchanged — same row count, same contents.

#### Scenario: The catalog is reproducible and exact

- GIVEN an empty database
- WHEN the full migration suite runs
- THEN `clarisa_innovation_use_levels` contains exactly ten rows, ids 1–10, levels 0–9
- AND each row's name and definition match the canonical table verbatim
- BUT it must NOT contain the duplicate rows ids 13–20 observed in the source system (see D-1)
- AND IT MUST NOT be populated by direct database insert outside a migration
- AND IT MUST NOT modify `clarisa_innovation_readiness_levels`

> **Two precedents, one deliberately broken.** `clarisa_innovation_readiness_levels` was created by migration (`1749604157074`) but its rows were **never inserted by any migration in this repository** — only a later `UPDATE ... SET additional_guidance` exists, presuming rows already present. Those rows entered the shared database out-of-band, and the product owner confirmed the same pattern in the source system: synced once, levels added by migration, sync then abandoned. This requirement keeps the *table shape* precedent and breaks the *population* precedent, so no environment depends on a manual step (NFR-IU-003).

**Out of scope:** the control-list endpoint exposing this catalog (chunk 2). See D-1 for the ordering constraint that endpoint inherits.

---

### R-IU-003 — Actor counts, disaggregated and aggregate

- **As a** Result Contributor
- **I want** to record how many actors use the innovation, broken down by sex and age when that applies
- **So that** disaggregated reporting is possible without forcing a breakdown that does not apply

**Details:**
- An actor row is in exactly one of two mutually exclusive modes, selected by the existing `sex_age_disaggregation_not_apply` column:
  - **Disaggregated** (`FALSE`/`NULL`): four additive **nullable integer** columns — `women_youth_count`, `women_not_youth_count`, `men_youth_count`, `men_not_youth_count`. Total is **derived** as their sum.
  - **Aggregate** (`TRUE`): one additive **nullable integer** column — `actors_count` — holding the single "How many" figure. This *is* the total for that row (D-4).
- Existing boolean columns (`women_youth`, `women_not_youth`, `men_youth`, `men_not_youth`) are **left in place and untouched** — Innovation Dev continues to read and write them.
- Which column set applies is determined by `actor_role_id` (R-IU-005) plus the mode flag.

**Acceptance criteria:**
- [ ] AC.1 — The five count columns exist, are nullable, and accept `0`.
- [ ] AC.2 — Existing `result_actors` rows are unchanged after the migration — same row count, same boolean values, new columns `NULL`.
- [ ] AC.3 — Innovation Dev's actor persistence and its green check behave identically before and after.
- [ ] AC.4 — No column stores a total that duplicates a value derivable from parts present in the same row.

#### Scenario: Counts coexist with the legacy booleans

- GIVEN existing `result_actors` rows written by Innovation Dev
- WHEN the count columns are added
- THEN every existing row keeps its boolean values and its identity
- AND the new count columns are `NULL` on those rows
- BUT it must NOT alter, drop, or repurpose any existing column
- AND IT MUST NOT add a total column for the disaggregated mode, because a stored total can disagree with its parts

#### Scenario: The two modes are exclusive

- GIVEN an actor row in aggregate mode (`sex_age_disaggregation_not_apply = TRUE`)
- WHEN its count is recorded
- THEN `actors_count` holds the figure and the four disaggregated columns stay `NULL`
- BUT it must NOT populate both modes on one row — `actors_count` is not a redundant total, it is the count for a row that has no parts
- AND IT MUST be possible to switch a row between modes without a schema change

> **Invariant with no constraint behind it.** The mutual exclusion above is enforced by the API edge (chunk 2) and by the validation function (R-IU-006), not by a database constraint. This is stated so it is designed for, not assumed. See RB-5.

**Out of scope:** rejecting negative values at the API edge (chunk 2 — this requirement only guarantees the columns can hold the values).

---

### R-IU-004 — Organization count

- **As a** Result Contributor
- **I want** to record how many organizations of a given type use the innovation
- **So that** the organization block matches the reporting form

**Details:**
- One additive nullable integer column on `result_institution_types` (`organization_count`).
- Applies when `institution_type_role_id` marks the row as Innovation Use.

**Acceptance criteria:**
- [ ] AC.1 — The column exists, is nullable, and accepts `0`.
- [ ] AC.2 — Existing rows are unchanged; the new column is `NULL` on them.
- [ ] AC.3 — Innovation Dev's organization persistence and green check are unaffected.

#### Scenario: The count column is additive only

- GIVEN existing `result_institution_types` rows
- WHEN the count column is added
- THEN no existing row changes
- BUT it must NOT be declared `NOT NULL`, which would break every existing row

---

### R-IU-005 — Role discriminators for Innovation Use

- **As a** developer
- **I want** actor, organization, and quantification rows to record which indicator's section owns them
- **So that** Innovation Use rows are never confused with Innovation Dev rows

**Details:**
- New enum members and seeded catalog rows: `ActorRolesEnum.INNOVATION_USE`, `InstitutionTypeRoleEnum.INNOVATION_USE`, `QuantificationRolesEnum.INNOVATION_USE`.
- `QuantificationRolesEnum` currently holds `ACTUAL_COUNT = 1`, `EXTRAPOLATE_ESTIMATES = 2`; the new member takes the next free id.
- `ActorRolesEnum` and `InstitutionTypeRoleEnum` currently hold only `INNOVATION_DEV = 1`.

**Acceptance criteria:**
- [ ] AC.1 — Each enum gains exactly one member with a value not already in use.
- [ ] AC.2 — A matching catalog row is seeded by migration for each.
- [ ] AC.3 — No existing enum member's numeric value changes.

#### Scenario: Discriminators are additive

- GIVEN the three role catalogs as they exist today
- WHEN the Innovation Use rows are seeded
- THEN each catalog has exactly one more active row
- BUT it must NOT renumber or reuse any existing role id, because existing rows reference them by value

> **Note for `design.md`:** `innovation_dev_validation` counts **all** active `result_actors` / `result_institution_types` rows for a result **without filtering by role**. That is safe today only because a result has exactly one indicator (A-1). `innovation_use_validation` must nonetheless filter by role, so correctness does not rest on that coincidence.

---

### R-IU-006 — `innovation_use_validation` stored function

- **As a** Result Contributor
- **I want** the Innovation use details section to report completeness accurately
- **So that** the green check tells me the truth about what is missing

**Details:**
- MySQL function `innovation_use_validation(result_code BIGINT) RETURNS tinyint(1)`, `READS SQL DATA`, following the structure of `innovation_dev_validation`.
- Returns true only when: an active `result_innovation_use` row exists; `innovation_use_level_id` is not null; **and** if the **joined `level` is ≥ 6**, `valid_text(innovation_use_level_explanation)` is true.
- **The level comparison MUST be made against the catalog's `level` column, reached by joining `clarisa_innovation_use_levels` on `id = innovation_use_level_id`** — never against the FK value directly. `innovation_dev_validation` already sets this precedent (`LEFT JOIN clarisa_innovation_readiness_levels cirl ON cirl.id = rid.innovation_readiness_id`, then tests `cirl.level`).
- Actor completeness: every active Innovation-Use-role `result_actors` row for the result has a resolvable actor type (`actor_type_id`, or `actor_type_custom_name` when the type is "Other" — `actor_type_id = 5`, per `ClarisaActorTypesEnum.OTHER`).
- Uses the existing `valid_text()` helper; introduces no new helper function.

**Acceptance criteria:**
- [ ] AC.1 — The function exists and is callable after migration.
- [ ] AC.2 — Returns `0` for a result with no `result_innovation_use` row.
- [ ] AC.3 — Returns `0` when `innovation_use_level_id` is null.
- [ ] AC.4 — Returns `1` for **level 5** with a null explanation.
- [ ] AC.5 — Returns `0` for **level 6** with an empty or whitespace-only explanation.
- [ ] AC.6 — Returns `1` for level 6 with a valid explanation.
- [ ] AC.7 — Returns `0` when an active Innovation-Use actor row has no resolvable actor type.
- [ ] AC.8 — Ignores `result_actors` rows whose role is Innovation Dev.
- [ ] AC.9 — `innovation_dev_validation` returns identical values before and after this migration for a fixed fixture set.
- [ ] AC.10 — **Mode consistency:** returns `0` when an Innovation-Use actor row is in aggregate mode (`sex_age_disaggregation_not_apply = TRUE`) with a null `actors_count`, **and** when it is in disaggregated mode with all four counts null. *(Backs RB-5 layer 2, which `design.md` §6.4 step 4 implements. Added in round 2 — the SQL existed with no acceptance criterion authorizing it.)*
- [ ] AC.11 — **Returns `0` for a result with zero Innovation-Use actor rows** (DD-11). Steps 3–4 are per-row predicates and would otherwise be vacuously true over an empty set, turning an actorless result green.

#### Scenario: The conditional explanation rule

- GIVEN an Innovation Use result whose use **level** is 6
- WHEN the level justification is empty
- THEN `innovation_use_validation` returns `0`
- AND the section cannot be green
- BUT it must NOT require an explanation at level 5 or lower
- AND IT MUST NOT be implemented as `innovation_use_level_id >= 6`, which is off by one — id 6 is level 5 (DC-10)
- AND IT MUST treat a whitespace-only explanation as empty, via `valid_text()`

#### Scenario: Role isolation

- GIVEN a result carrying `result_actors` rows under the Innovation Dev role
- WHEN `innovation_use_validation` runs for that result
- THEN those rows are not counted toward Innovation Use actor completeness
- BUT it must NOT change how `innovation_dev_validation` counts rows

> **Verification note:** AC.2 through AC.9 are the DC-2 / DC-10 defect classes. They are **not** provable by the repository's existing test pattern (§4.1) and require the §4.3 substitute gate, or must be reported inconclusive. AC.4 and AC.5 are the discriminating pair for the off-by-one.

---

### R-IU-007 — Green check assembly and submit gating

- **As a** Result Contributor
- **I want** my Innovation Use sections to show completion status and to block submission when incomplete
- **So that** I cannot submit an invalid result

**Details:**
- `GreenCheckRepository.calculateGreenChecks` gains a `case IndicatorsEnum.INNOVATION_USE` appending `innovation_use_validation(...) as innovation_use`.
- `IndicatorsEnum.INNOVATION_USE` is added to the array that appends `intellectual_property_validation(...) as ip_rights` (currently `[INNOVATION_DEV, CAPACITY_SHARING_FOR_DEVELOPMENT]`) — the product owner confirmed IP Rights is in scope for Innovation Use.
- `FindGreenChecksDto` gains an optional `innovation_use?: boolean`.
- The submit gate needs **no change**: `completenessValidation` already ANDs every non-visual-only key it receives, so adding the key gates submission automatically.

**Acceptance criteria:**
- [ ] AC.1 — For an indicator-6 result, the returned object contains the six common keys plus `innovation_use` and `ip_rights`.
- [ ] AC.2 — For indicators 1, 2, 4, and 5, the returned key set is exactly what it is today.
- [ ] AC.3 — `innovation_use` is **not** in `VISUAL_ONLY_GREEN_CHECKS`.
- [ ] AC.4 — `completenessValidation` throws `BadRequestException` when `innovation_use` is false and passes when every key is true.

#### Scenario: Submission is blocked while the section is incomplete

- GIVEN an Innovation Use result whose `innovation_use` green check is false
- WHEN submission is attempted
- THEN `completenessValidation` throws `BadRequestException`
- AND the message names that sections are still pending
- BUT it must NOT change the gating outcome for any other indicator
- AND IT MUST NOT be added to `VISUAL_ONLY_GREEN_CHECKS`, which would silently make the section non-blocking

---

### R-IU-008 — Innovation Dev is not regressed

- **As a** Result Contributor reporting Innovation Dev
- **I want** my existing results to behave exactly as before
- **So that** an unrelated feature does not break my reporting

**Details:** a standing constraint over R-IU-003, R-IU-004, R-IU-005, and R-IU-006, elevated to a requirement because it is the highest-severity failure mode of this spec (family risk FR-1, Kaizen KZ-003).

**Acceptance criteria:**
- [ ] AC.1 — The full server suite passes: `npm test -- --silent`.
- [ ] AC.2 — Every existing `result-innovation-dev`, `result-actors`, `result-institution-types`, and `green-checks` spec passes **unmodified**.
- [ ] AC.3 — Global Jest coverage stays ≥ 60%.
- [ ] AC.4 — `npm run lint -- --quiet` is clean, and `git status` is re-checked afterward because the lint script carries `--fix` and mutates files.

#### Scenario: The blast radius stays clean

- GIVEN the server test suite passing before this spec
- WHEN all migrations and code changes are applied
- THEN the full suite still passes
- BUT it must NOT be verified with a targeted suite — a shared table changed, so only a full run is evidence (KZ-003)
- AND IT MUST NOT be made to pass by editing an existing Innovation Dev spec's expectations

---

### R-IU-009 — Migrations are safe and reversible

- **As a** System Admin
- **I want** every migration to be additive and to revert cleanly
- **So that** a bad deploy against the shared database is recoverable

**Details:**
- Migrations are **append-only** (ADR-5, root guide §4.1). Never edit a merged migration.
- Filenames follow `<timestamp>-<camelCaseAction>.ts` under `src/db/migrations/`.
- One migration per schema concern.
- Every `up()` has a corresponding `down()` restoring the prior state.
- No `DROP COLUMN`, no `MODIFY COLUMN`, no `NOT NULL` addition on an existing table.

**Acceptance criteria:**
- [ ] AC.1 — Every new migration's `down()` reverses its `up()` on a scratch schema.
- [ ] AC.2 — No migration issues destructive DDL against a pre-existing column.
- [ ] AC.3 — The stored-function migration drops and recreates only `innovation_use_validation`, never another `*_validation` function.
- [ ] AC.4 — No migration runs against the shared dev database without explicit human approval.

#### Scenario: A bad deploy is recoverable

- GIVEN the migrations applied to a scratch schema
- WHEN `npm run migration:revert` runs for each in reverse order
- THEN the schema returns to its prior state with no residue
- BUT it must NOT drop or alter `innovation_dev_validation` or any other existing function
- AND IT MUST NOT be executed against the shared dev database as part of testing — that database is not disposable (root guide §4.3)

---

### ~~R-IU-010~~ — Innovation Use fields are searchable · **WITHDRAWN**

Decision **D-5** was taken on a premise investigation disproved: there is **no search parity to reach**. The results index mapping is generated from `ResultOpensearchDto` (`result.opensearch.api.ts:25` → `base-open-search-api.ts:316-344`), never from an entity, so decorating a detail entity is **inert**. And `result.opensearch.dto.ts` contains **no indicator-specific detail fields for any indicator** — not policy change, capacity sharing, OICR, or innovation dev.

Indexing Innovation Use detail fields would make it the only indicator with searchable detail: a new cross-indicator capability, not parity, and one deserving its own spec. **Reduced to a non-goal** (`design.md` §7, DD-8). Innovation Use header fields remain indexed through `ResultOpensearchDto` with no change, exactly like every sibling.

**To reverse:** restore this requirement, add a task decorating `ResultOpensearchDto`, reinstate DC-11, and add an index-rebuild gate.

---

### R-IU-011 — Innovation Use data survives versioning, snapshot, and both delete paths

- **As a** Result Contributor
- **I want** my Innovation Use data to still be there after my result is versioned or snapshotted, and properly removed when it is deleted
- **So that** a new reporting cycle does not silently erase what I reported, and a deleted result does not leave live rows behind

**Details:**
- **Four** routines enumerate every child table, and on the copy path every column, by name. The set was derived **by call site** (transcript §0 step 1), the method rounds 1–3 never used. Full transcription: [`./routine-transcript.md`](./routine-transcript.md) — the authority for M6 (DD-12).

  | Routine | Kind | Latest definition | Call sites | What it does |
  | --- | --- | --- | --- | --- |
  | `SP_versioning` | PROCEDURE | `1783029013035:8-988` | 2 | Snapshot copy |
  | `SP_delete_result_version` | PROCEDURE | `1778510205765:173-334` | 2 | Hard-remove a **version** |
  | `full_delete_result_version` | FUNCTION | `1783029013035:993-1163` | 1 | Hard-remove **any** result |
  | **`delete_result`** | **FUNCTION** | **`1764275660631:312-511`** | **3** | **The soft delete** |

  > `SP_delete_result_version` is **not** the soft delete — it issues `DELETE FROM` on 33 tables. That mislabel, carried through three review rounds, is what hid `delete_result`.

- Verified consequences if unamended: the five new `result_actors` counts are not copied (`1783029013035:625`); `organization_count` is not copied (`:662`); `result_innovation_use` has **no copy block at all**, since `result_innovation_dev` is copied by its own dedicated block (`:695-770`); rows are orphaned on both hard deletes (`1778510205765:279`, `1783029013035:1106`); and **soft delete leaves `is_active = TRUE`** (`1764275660631:467`) — an *active* orphan visible to every `is_active = TRUE` query.
- All four routines are amended by migration M6 via `DROP` + `CREATE` reproducing each body in full. **M6 depends on M0** (R-IU-012): it reproduces `SP_versioning`'s body and must inherit the repaired one.
- **The pre-existing divergences must not be harmonized** — the two hard-delete routines (transcript §4.1) or `delete_result`'s six soft-delete gaps (§5.1). Either change would alter behavior for every indicator.

**Acceptance criteria:**
- [ ] AC.1 — Versioning a populated Innovation Use result reproduces the `result_innovation_use` row on the new version, with level id and explanation intact.
- [ ] AC.2 — Versioning preserves all four disaggregated counts, `actors_count`, and `organization_count`.
- [ ] AC.3 — `SP_delete_result_version` leaves no orphaned `result_innovation_use` row.
- [ ] AC.4 — `full_delete_result_version` leaves no orphaned `result_innovation_use` row.
- [ ] AC.5 — **`delete_result` sets `result_innovation_use.is_active = FALSE` and populates `deleted_at`** — no *active* orphan survives a soft delete.
- [ ] AC.6 — Versioning **and all three delete paths** behave identically for an **Innovation Dev** result before and after M0+M6, compared column by column and row by row. *(Gated by fixture F16 — **not** by F12, which compares a stored function and executes no routine.)*
- [ ] AC.7 — M6's `down()` restores all four prior bodies exactly. *(`SP_delete_result_version`'s historical `down()` is a bare `DROP` with no recreation — the neighbouring pattern must not be copied blindly.)*
- [ ] AC.8 — M6 makes exactly the six edits in transcript §6 and no others. In particular it adds **no** `result_quantifications` copy block (already copied at `:297`), and both pre-existing divergences survive intact.
- [ ] AC.9 — No routine amendment is applied to `result_actors` / `result_institution_types` on any delete path — both are already removed wholesale by row; only the versioning copy lists change.

#### Scenario: A versioned result keeps its Innovation Use data

- GIVEN an Innovation Use result with a level, an explanation, actor counts, and an organization count
- WHEN the result is versioned or snapshotted
- THEN the new version carries every one of those values
- BUT it must NOT drop, reorder, or alter any table or column the routines already copy
- AND IT MUST NOT add a `result_quantifications` copy block, which would duplicate quantification rows on every version bump for every indicator
- AND IT MUST be proven by executing the routine, not by reading the migration — a column missing from an enumerated list produces **no error, no log, and no metric** (DC-12)

#### Scenario: Deleting a version leaves nothing behind

- GIVEN an Innovation Use result version with a detail row
- WHEN that version is deleted via `SP_delete_result_version` or `full_delete_result_version`
- THEN no `result_innovation_use` row remains for it
- BUT it must NOT delete rows belonging to other versions or other results

#### Scenario: Soft-deleting deactivates the detail row

- GIVEN an active Innovation Use result with a detail row
- WHEN `delete_result` runs for it
- THEN `result_innovation_use.is_active` becomes `FALSE` and `deleted_at` is set
- BUT it must NOT leave the row active, which would surface a deleted result's detail to every `is_active = TRUE` query
- AND IT MUST NOT hard-delete the row — this path is a soft delete, and `results` itself is only deactivated (and set to `result_status_id = 8`)

> **This requirement did not exist before Judgment Day round 1** (found by one judge, verified by the orchestrator — [`./judgment.md`](./judgment.md) P1), and its routine set was wrong in every subsequent round until the fresh pass enumerated by call site.

---

### ~~R-IU-012~~ — `SP_versioning` is executable · **EXTRACTED to [`../../bugfix/sp-versioning-roles-id/`](../../bugfix/sp-versioning-roles-id/)**

> **Ruled 2026-08-14.** This is a pre-existing, cross-indicator production defect that this chunk merely discovered, so it ships on its own schedule as a Lite Bug-Mode spec (there, **R-SPV-001**). It is retained below as the **record of the discovery**; the ACs and the red-before-green regression test are owned by that spec.
>
> **This chunk `Depends on` it** — T-10 (M6) reproduces `SP_versioning`'s body and must inherit the repaired one.

- **As a** Result Contributor on **any** indicator
- **I want** versioning a result to work at all
- **So that** a new reporting cycle does not fail outright

**Details:**
- `SP_versioning`'s `result_impact_outcomes` (`1783029013035:116`) and `result_strategic_objectives` (`:143`) blocks each carry three independent defects (transcript §2.4): they name **`roles_id`**, dropped by `1783022620616:13,29`; they list **11 columns against 10 `SELECT` expressions**; and they copy the source **AUTO_INCREMENT primary key**, colliding with the row it was read from.
- **This is pre-existing and affects all six indicators.** It is not caused by Innovation Use. It is in scope only because **M6 must reproduce this body**, and because no versioning fixture can run until it is repaired — leaving DC-12 ungated however well M6 is written.
- Repaired by migration **M0**, ahead of M6. `down()` restores the prior (broken) body verbatim.
- **Routing is a user decision** (`design.md` §12): keep M0 in this spec, or extract it into its own bugfix spec that ships sooner and independently.

**Acceptance criteria:**
- [ ] AC.1 — After M0, `CALL SP_versioning(<code>)` completes without error for an Innovation Dev result.
- [ ] AC.2 — `result_impact_outcomes` and `result_strategic_objectives` rows are copied to the new version, with `role_id` preserved and a **fresh** `id` assigned.
- [ ] AC.3 — No other block of `SP_versioning` changes.
- [ ] AC.4 — M0's `down()` restores the exact prior body, defects included.

#### Scenario: Versioning works after the repair

- GIVEN a result whose `result_impact_outcomes` rows exist
- WHEN `SP_versioning` runs after M0
- THEN the procedure completes and the rows appear on the new version
- BUT it must NOT reference `roles_id`, which no longer exists on either table
- AND IT MUST NOT copy the source row's `id`, which would collide with the existing primary key
- AND IT MUST be demonstrated red-before-green: the same fixture (F19) **errors with MySQL 1054 before M0** and passes after

---

## 7. Non-Functional Requirements

### NFR-IU-001 — Green-check latency does not regress

- **Category:** performance
- **Target:** `calculateGreenChecks` for an indicator-6 result completes within the same order of magnitude as an indicator-2 result on comparable data (no full-table scan introduced).
- **How verified:** review the function's join plan; the correlated subqueries mirror `innovation_dev_validation`, the accepted baseline. If an index is needed, name it `idx_<table>_<purpose>`.
- **Disqualifier:** a timing taken while a delegated agent is running is **not** a measurement (root guide §4.3). Measure in a quiet window or report inconclusive.

### NFR-IU-002 — Auditability

- **Category:** compliance
- **Target:** every new table carries the full `AuditableEntity` column set; every mutation populates `created_by` / `updated_by` from `request.user`.
- **How verified:** entity metadata spec + code review. Inherited from PRD AC-Results-Lifecycle; stated here only because two **new** tables are introduced.

### NFR-IU-003 — Reproducible controlled vocabulary

- **Category:** reliability
- **Target:** the use-level catalog is fully reconstructible from migrations alone, with no manual step.
- **How verified:** run the migration suite against an empty schema and assert the ten rows match R-IU-002's table (AC.4). This NFR exists because the analogous readiness-level catalog is **not** reproducible today.

### NFR-IU-004 — Test coverage floor

- **Category:** dx
- **Target:** global Jest coverage ≥ 60% (repo default), not regressed on changed files.
- **How verified:** `npm run test:cov`.
- **Known limit:** coverage says nothing about DC-2 / DC-3 / DC-10 / DC-12 / DC-13, which live in SQL Jest does not instrument. A green coverage number must not be read as validation coverage.

> Inherited without restatement: `ServerResponseDto` envelope (D-1 convention), `/api/v{n}` versioning, `GlobalExceptions` routing. This chunk adds no endpoint, so none are exercised here.

---

## 8. Data Requirements Summary

| Change | Table | Type | Reversible |
| --- | --- | --- | --- |
| Create | `result_innovation_use` | new table | yes — `DROP TABLE` |
| Create | `clarisa_innovation_use_levels` | new table + 10 seeded rows | yes — `DROP TABLE` |
| Add | `result_actors` × 4 disaggregated count columns | additive, nullable | yes — `DROP COLUMN` (new only) |
| Add | `result_actors` × 1 aggregate count column (`actors_count`) | additive, nullable | yes — `DROP COLUMN` (new only) |
| Add | `result_institution_types` × 1 count column | additive, nullable | yes — `DROP COLUMN` (new only) |
| Insert | `actor_roles`, `institution_type_roles`, `quantification_roles` | 1 row each | yes — `DELETE` by id |
| Create | `innovation_use_validation` | new stored function | yes — `DROP FUNCTION` |
| **Repair** | **`SP_versioning`** — blocks 3–4 only | **`DROP` + `CREATE` (M0, R-IU-012)** — pre-existing defect, not an Innovation Use change | **yes — `down()` restores the prior broken body verbatim** |
| **Amend** | **`SP_versioning`, `SP_delete_result_version`, `full_delete_result_version`, `delete_result`** | **`DROP` + `CREATE`, additive within each body — six edits (M6, R-IU-011)** | **yes — `down()` restores all four prior bodies verbatim** |
| Modify | `Result` entity | new relation | code-only |
| ~~Modify~~ | ~~OpenSearch mapping~~ | **Withdrawn** — R-IU-010 is a non-goal | n/a |

Six new columns total: 5 on `result_actors`, 1 on `result_institution_types`. No backfill required (A-3). No index added — see `design.md` §3.7 for the review basis.

---

## 9. Assumptions, Dependencies, Risks

### Assumptions

| # | Assumption | If wrong |
| --- | --- | --- |
| A-1 | A result has exactly one indicator, so no single result carries both Innovation Dev and Innovation Use child rows. | Role filtering in R-IU-005/R-IU-006 becomes load-bearing rather than defensive — which is why it is specified anyway. |
| A-2 | The use scale is a distinct vocabulary from the readiness scale. **Confirmed** — different names, different definitions, different ten-row content. | — resolved, see D-1. |
| A-3 | No production Innovation Use results exist needing backfill. | A backfill becomes a separate requirement, never inline in a migration. |
| A-4 | A disposable MySQL is reachable for the §4.3 substitute gate. | DC-2 / DC-3 / DC-10 / DC-12 / DC-13 remain unguarded; must be reported as an accepted blind spot in the execution note, not silently passed. |
| ~~A-5~~ | ~~The source system's duplicate rows (ids 13–20) are a data-quality artifact.~~ **CONFIRMED by the product owner 2026-08-14** — they are wrong data. Promoted to decision **D-7**. | — |

### Dependencies

- None on other specs — this is the family root.
- MySQL helper `valid_text()` must remain available (it is; last corrected in `1758054920860`).
- CLARISA actor types and institution types are already synced.

### Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| RB-1 | Stored-function logic is untested by any existing harness (DC-2). | **High** | §4.3 substitute gate; explicit inconclusive-reporting rule. |
| RB-2 | Migrations are immutable once merged (ADR-5) and target a shared, non-disposable DB. | **High** | Human approval gate; additive-only DDL; verified `down()`; scratch-schema testing only. |
| RB-3 | Altering shared tables regresses Innovation Dev (KZ-003). | **High** | R-IU-008; full-suite-only verification. |
| RB-4 | **Off-by-one between catalog `id` and `level`** (DC-10). The FK is `id`; every business rule is on `level`. | **High** | R-IU-006 mandates the join; §4.3 fixtures 3–4 are the discriminating pair; D-1 records it. |
| RB-5 | `result_actors` carries three column sets (booleans, disaggregated counts, aggregate count) whose applicability depends on `actor_role_id` + the mode flag — an invariant no constraint enforces. | Medium | Document on the entity; enforce at the API edge in chunk 2; encode in the validation function. |
| RB-6 | The green-check architecture (validation in SQL, untestable and undocumented) is not recorded as a TRD ADR. | Low | D-6 — new ADR proposed in `design.md`. |
| RB-7 | Duplicate `name` values in the catalog make `ControlListBaseService.findByName` (a `LIKE %name%` match) ambiguous, and `findAll()` has **no `order` clause** at all — scale order would rest on accidental PK ordering. | Medium | This chunk seeds `id = level + 1` so PK order coincides with scale order; chunk 2 must order explicitly by `level` and must not look levels up by name. Recorded in D-1 for chunk 2 to inherit. |
| **RB-8** | **All four lifecycle routines enumerate tables and columns by name, so new schema is silently skipped (DC-12).** M6 amends routines that serve **every** indicator. **The routine set itself was wrong in three consecutive review rounds** — the meta-risk is trusting a set enumerated by name. | **High** | R-IU-011 + fixtures **F13/F14/F15/F18**; **F16** is the Innovation Dev regression gate (**not F12**, which executes no routine); M6 is additive within each body; full-suite regression; M6 ships as its own PR. ADR-11 makes "amend all four, **enumerated by call site**" a standing checklist item for every future spec adding a table or column under `results`. |
| **RB-9** | **No scratch-schema mechanism exists.** `migration:revert` and `migration:dev:execute` hardcode `-d ./src/db/config/mysql/orm.config.ts`, whose export is bound to **`CORE`** (the shared DB) at module load (`:71-73`); the `TEST` target (`:34-39`) is unreachable from any npm script, `ARI_TEST_MYSQL_PORT` does not exist, and `orm-connection-test.module.ts` binds to `CORE` despite its name. | **High** | `design.md` §6.5.1 specifies **five** concrete pieces, starting with a new `orm.test.config.ts` sibling module. Until piece 1 exists, **DC-1, DC-2, DC-3, DC-10, DC-12 and DC-13 are all ungated** and no migration testing may run at all. ⚠️ Two earlier revisions asserted a working mechanism that did not exist; do not assume this one works without executing it. |
| **RB-11** | **`SP_versioning` is non-executable in `main` today** (DC-13, R-IU-012), for all six indicators, with no test that would notice. | **High** | M0 repairs it ahead of M6; **F19** is the red-before-green gate. Escalated to the user in `design.md` §12 — the repair may be extracted into its own bugfix spec so it ships sooner. |
| **RB-10** | **Adding indicator 6 to the `ip_rights` inclusion list makes every Innovation Use result unsubmittable until IP Rights is filled.** `intellectual_property_validation` defaults to `FALSE` and returns `FALSE` with no active `result_ip_rights` row. | Medium | Follows directly from the product decision to include IP Rights, and is likely intended — but it is a second SQL-only submit-blocking behavior, so it gets fixture F10 rather than being assumed. Confirm with the product owner at sign-off. |

---

## 10. Decisions (formerly Open Questions)

All six open questions were resolved by the product owner on 2026-08-14 and are recorded here as decisions.

| # | Decision | Rationale / consequence |
| --- | --- | --- |
| **D-1** | The catalog is **seeded locally by migration** with the ten canonical rows (R-IU-002), not live-synced from CLARISA. | CLARISA's `GET /api/innovation-use-levels` returns only `{id, name}` — it does **not** carry `level` or `definition`, the two fields every business rule and the UI depend on. A live sync would erase them. The source system shows the same history: synced once, levels added by migration, sync abandoned. Consequences: `id = level + 1` (RB-4); `name` is non-unique (RB-7); duplicate source rows ids 13–20 are **not** replicated (A-5). |
| **D-2** | "Unit of measure" on Other quantitative measures is **free text**. | `result_quantifications.unit` stays as-is. No unit catalog in this chunk or any chunk. |
| **D-3** | Where the user story and the PRMS screenshot disagree, **the user story text governs**; the image is reference only. | R-IU-003 keeps the four disaggregated counts with a derived total, as the story specifies — not the screenshot's *Women total / Youth / Non-youth* arithmetic. |
| **D-4** | The screenshot's "How many" (shown when sex/age disaggregation does not apply) **is the total** for that actor row. | Adds the aggregate-mode column `actors_count` (R-IU-003). It is not a redundant total: in aggregate mode the row has no parts to derive from, so the two modes stay mutually exclusive and the "no stored total" constraint is preserved. |
| ~~**D-5**~~ | ~~The new fields are `@OpenSearchProperty`-decorated.~~ **REVISED 2026-08-14 after Judgment Day** → see **D-8**. | The question was posed as "search parity". Investigation disproved the premise. |
| **D-8** | **R-IU-010 withdrawn; OpenSearch indexing of detail fields is a non-goal.** | The results mapping is generated from `ResultOpensearchDto`, never from an entity (`result.opensearch.api.ts:25` → `base-open-search-api.ts:316-344`), so decorating a detail entity is inert. And **no indicator's** detail fields are indexed. Implementing D-5 literally would ship inert code or make Innovation Use the only indicator with searchable detail. **Reversible in one task if the product owner overrules.** |
| **D-9** | **All FOUR lifecycle routines are amended in this chunk** — `SP_versioning`, `SP_delete_result_version`, `full_delete_result_version`, `delete_result` — rather than deferred. *(Revised by the fresh pass; earlier revisions said two, then three.)* | Found by Judgment Day, verified against the code, **set finally derived by call site**. Unamended, versioning silently discards the entire detail record and every new count, and soft delete leaves an active orphan. Shipping a feature that loses data on its first version bump is not an acceptable known bug. Added as R-IU-011. |
| **D-11** | **The `SP_versioning` repair (M0) is carried in this chunk by default**, with the option to extract it into its own bugfix spec. | Pre-existing, cross-indicator, and **blocking**: M6 reproduces the body, and no versioning fixture can run until it is repaired. Added as R-IU-012 / DD-13. **Routing is escalated to the user** — `design.md` §12 recommends extraction on urgency grounds, since versioning is broken today for every indicator. |
| **D-6** | The green-check-as-stored-function architecture **will be recorded as a TRD ADR**. | `design.md` proposes the ADR. This spec inherits the decision; it does not endorse it. Documenting it is what makes §4.1's blind spot visible to the next spec instead of rediscovered. |

| **D-7** | The source system's rows ids 13–20 are **wrong data** and are **not** replicated. The catalog is exactly ten rows, ids 1–10, levels 0–9. | Product owner confirmed 2026-08-14. They duplicate ids 3–10 verbatim (same name, level, definition), and CLARISA's endpoint returns only ids 1–10. R-IU-002 AC.1 asserts exactly ten rows, which fails loudly if a duplicate is ever seeded. Cross-platform reconciliation against the source system must match on **`level`**, never on `id`, since the two systems' ids do not correspond. |

**No open questions remain for this chunk.**

---

## 11. Requirement ID Index

| ID | Title | Type | Priority | Tasks |
| --- | --- | --- | --- | --- |
| R-IU-001 | Innovation Use detail record | Functional | Must | T-05, T-08, T-12 |
| R-IU-002 | Innovation Use level catalog | Functional | Must | T-04 |
| R-IU-003 | Actor counts, disaggregated and aggregate | Functional | Must | T-06, T-08, T-09, T-12 |
| R-IU-004 | Organization count | Functional | Must | T-06, T-08 |
| R-IU-005 | Role discriminators | Functional | Must | T-07, T-08 |
| R-IU-006 | `innovation_use_validation` stored function | Functional | Must | T-09, T-12 |
| R-IU-007 | Green check assembly and submit gating | Functional | Must | T-11, T-12 |
| R-IU-008 | Innovation Dev is not regressed | Functional | Must | T-14 |
| R-IU-009 | Migrations are safe and reversible | Functional | Must | T-01…T-07, T-09, T-10, T-14 |
| ~~R-IU-010~~ | ~~Innovation Use fields are searchable~~ | **Withdrawn** (D-5 revised, DD-8) | — | — |
| **R-IU-011** | **Innovation Use data survives versioning, snapshot, and both delete paths** | Functional | **Must** | T-10, T-13 |
| ~~R-IU-012~~ | ~~`SP_versioning` is executable~~ — **extracted** to `bugfix/sp-versioning-roles-id` (R-SPV-001) | Functional | **Must** | *external* |
| NFR-IU-001 | Green-check latency does not regress | NFR | Should | T-09, T-14 |
| NFR-IU-002 | Auditability | NFR | Must | T-05, T-08 |
| NFR-IU-003 | Reproducible controlled vocabulary | NFR | Must | T-04 |
| NFR-IU-004 | Test coverage floor | NFR | Must | T-14 |

---

## 12. Sign-off

- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name> *(catalog data and all six rulings supplied 2026-08-14; A-5 confirmation still open)*
- [ ] Security review — not required (no auth, secrets, or PII surface changed)
- [ ] DevOps — required before any migration runs against the shared dev database (R-IU-009 AC.4)
