# Proposal — Innovation Use: Data Model, Catalog & Green Check

> **Chunk 1 of 3** in the `innovation-use` spec family. Server-only. Delivers the persistence and validation substrate every later chunk consumes.

---

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/data-model-and-catalog/` |
| Parent Spec | `docs/specs/innovation-use/` |
| Slug | `data-model-and-catalog` — derived from the free-text `/akili-propose` argument |
| Type | Change |
| Approval Mode | gated |
| Depends on | none |
| Parallel-safe | no |
| Tier | server (`server/researchindicators`) |
| Branch in flight | `AC-1679-Create-the-innovation-use-section` |
| Created | 2026-08-14 |

---

## Intent

Give the Innovation Use result category (`indicator_id = 6`) a place to store its data and a way to compute its section completion status, so the API chunk has tables and stored functions to write against.

---

## Problem / Current Behavior

Innovation Use is **half-wired today**. The scaffolding exists; the substance does not.

| Concern | State today | Evidence |
| --- | --- | --- |
| Indicator catalog row | ✅ Exists, active, with `long_description` | `1729174028390-addedDescriptionColumnIndicators.ts:14`; `1753303310598-updateIndicators.ts` |
| Enum + query slug | ✅ `INNOVATION_USE = 6`, `'innovation-use'` | `indicators/enum/indicators.enum.ts` |
| Status workflow | ✅ **12** transition rows seeded for indicator 6 *(corrected — this proposal originally said 6, counting only the base migration)* | `1767901590080` (6) + `1768573722571:23` (1) + `1779190000004` bilateral (5) |
| Detail table | ❌ No `result_innovation_use` | no such entity under `domain/entities/` |
| Use-level catalog | ❌ Only `clarisa_innovation_readiness_levels` (Innovation **Dev**) | `tools/clarisa/entities/` |
| Actor counts | ❌ `result_actors` disaggregation is **boolean** | `result-actors/entities/result-actor.entity.ts:44-68` |
| Organization count | ❌ `result_institution_types` has no "how many" column | `result-institution-types/entities/` |
| Role discriminators | ❌ `ActorRolesEnum` and `InstitutionTypeRoleEnum` only have `INNOVATION_DEV = 1` | both `enum/` files |
| Green check | ❌ `calculateGreenChecks` switch has no `INNOVATION_USE` case; no `innovation_use_validation` function | `green-checks/repository/green-checks.repository.ts:82-104` |

**Net effect:** a user who selects Innovation Use today gets a result whose indicator-specific section does not exist and whose completion status can never turn green.

---

## Proposed Outcome

After this chunk:

- Innovation Use detail data has a home, and the four sex/age counts persist as non-negative integers alongside Innovation Dev's untouched boolean flags.
- A 0–9 innovation **use** level catalog exists with per-level `name` + `definition`, so the UI can show the level definition on selection.
- `calculateGreenChecks(result_id)` returns an `innovation_use` boolean (plus `ip_rights`) for indicator 6, and the submit gate honors it.
- Every new table extends `AuditableEntity`; audit fields populate from `request.user`.

No endpoint or UI behavior changes in this chunk — it is invisible until chunk 2 lands.

---

## Scope

**In**

1. `result_innovation_use` table + entity: `result_id` PK, `innovation_use_level_id`, `innovation_use_level_explanation` (conditional, level ≥ 6).
2. `clarisa_innovation_use_levels` catalog table + entity + ten-row seed (`id`, `level`, `name`, `definition`) — name and content fixed by **D-1**.
3. Additive nullable **integer** columns on `result_actors`: `women_youth_count`, `women_not_youth_count`, `men_youth_count`, `men_not_youth_count`. Existing boolean columns untouched.
4. Additive nullable count column on `result_institution_types` (e.g. `organization_count`).
5. New discriminator rows: `ActorRolesEnum.INNOVATION_USE`, `InstitutionTypeRoleEnum.INNOVATION_USE`, `QuantificationRolesEnum.INNOVATION_USE`.
6. `innovation_use_validation(result_code BIGINT)` MySQL stored function.
7. `GreenCheckRepository.calculateGreenChecks` — add the `INNOVATION_USE` case and add indicator 6 to the `ip_rights` inclusion list.
8. `FindGreenChecksDto` — add optional `innovation_use`.
9. `Result` entity relation for `result_innovation_use`.
10. Sibling `*.spec.ts` for the repository/DTO changes; server suite green.

**Out**

- Any controller, service, or DTO for reading/writing Innovation Use details → **chunk 2**.
- Any client change → **chunk 3**.
- Investment/co-investment tables (family non-goal).
- ~~OpenSearch mapping changes (deferred)~~ → ~~now IN scope per D-5~~ → **OUT of scope, final** (**D-8**, after Judgment Day). No indicator's detail fields are indexed, and the results mapping is generated from `ResultOpensearchDto`, never an entity. This proposal's original "deferred" instinct was closer than D-5.

---

## Non-Goals

- Modifying Innovation Dev's boolean disaggregation semantics or migrating its data.
- Refactoring `green-checks` away from stored functions — out of scope even though it is the fragile part.
- Adding a "unit of measure" catalog for Other quantitative measures; `result_quantifications.unit` is free text today and stays so (see Risk R-4).

---

## Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| `server/.../entities/result-innovation-use/` | **new** module |
| `server/.../entities/result-actors/` | additive columns |
| `server/.../entities/result-institution-types/` | additive column |
| `server/.../entities/actor-roles`, `institution-type-roles`, `quantification-roles` | new enum member + seed row each |
| `server/.../entities/green-checks/` | repository switch + DTO |
| `server/.../entities/results/entities/result.entity.ts` | new relation |
| `server/.../tools/clarisa/entities/` | new catalog entity |
| `server/.../db/migrations/` | ~~~3~~ → **6** append-only migrations *(superseded by `design.md` §5; the 6th amends the lifecycle stored procedures, unknown at proposal time)* |
| `server/.../db/migrations/1783029013035`, `1778510205765`, `1764275660631` | **All four lifecycle routines amended** (`SP_versioning`, `SP_delete_result_version`, `full_delete_result_version`, `delete_result`) **plus an M0 repair to `SP_versioning`** — none of it anticipated by this proposal |
| Persona | Result Contributor (US-RC-1, US-RC-2, R-2) |
| PRD | G1, G2, G6; AC-Results-Lifecycle, AC-Controlled-Lists, AC-Testing |

---

## Visual Reference

- **Source:** Screenshots supplied in the `/akili-propose` invocation (2026-08-14). No Figma, no generated mockup — user confirmed the pasted story is the complete requirement source.
- **Location:**
  - PRMS Innovation Use reporting form — **field/data reference only**. Explicitly *not* a STAR mock; it defines *what* is captured, never *how* it looks.
  - STAR `innovation-details` page (result STAR-19530) — the live **style and component** reference.
- **Notes:** This chunk is backend-only and has no visual surface. The screenshots bind chunk 3. Recorded here so the family shares one visual provenance.

---

## Requirement Delta Preview

### ADDED

- Innovation Use detail records persist per result with a use level and a conditional explanation.
- A 0–9 innovation use level catalog with definitions is queryable.
- Actor rows can carry four non-negative integer counts.
- Organization rows can carry a count.
- Actor / organization / quantification rows can be discriminated as belonging to Innovation Use.
- `calculateGreenChecks` returns `innovation_use` for indicator 6.

### MODIFIED

- `FindGreenChecksDto` gains an optional field (additive; no consumer breaks).
- The `ip_rights` inclusion list grows from `[INNOVATION_DEV, CAPACITY_SHARING_FOR_DEVELOPMENT]` to include `INNOVATION_USE`.

### REMOVED

- None. Nothing is deleted or repurposed.

---

## Approach Options

### Option A — Extend the shared tables additively (recommended)

New `result_innovation_use` table; `result_actors` / `result_institution_types` / `result_quantifications` reused via new role discriminators plus additive nullable columns.

| | |
| --- | --- |
| ✅ | Matches how Innovation Dev and Capacity Sharing already share these tables — the role-discriminator pattern is the established convention |
| ✅ | One partner/actor/organization query shape across indicators; reporting and OpenSearch stay uniform |
| ✅ | Purely additive DDL — no data migration, no risk to existing rows |
| ⚠️ | `result_actors` ends up with both boolean and count columns; the correct set depends on `actor_role_id`. Needs a clear comment and a documented invariant |

### Option B — Dedicated `result_innovation_use_actors` / `_organizations` tables

| | |
| --- | --- |
| ✅ | Clean columns, no boolean/count ambiguity |
| ❌ | Forks the actor model; every cross-indicator query, export, and OpenSearch mapping must union two shapes |
| ❌ | Duplicates the CLARISA actor-type relation and the audit plumbing |
| ❌ | Diverges from the pattern the codebase already committed to |

### Option C — Convert `result_actors` booleans to counts for all indicators

| | |
| --- | --- |
| ✅ | One coherent column set |
| ❌ | Destructive migration against a **shared, non-disposable** dev DB (root `CLAUDE.md` §4.3) |
| ❌ | Innovation Dev's semantics are genuinely boolean ("which segments apply"), not counts — the conversion is lossy in both directions |
| ❌ | Breaks live Innovation Dev reporting; far beyond this story's mandate |

---

## Recommended Approach

**Option A.** It is the smallest safe path: every DDL statement is additive, no existing row changes, and it follows the discriminator pattern the repo already uses for three indicators. Option C's risk is disqualifying against a shared database, and Option B's cost lands on every future cross-indicator query for a cosmetic gain.

The boolean/count ambiguity (Option A's one weakness) is contained by making the invariant explicit in the entity, the DTO validation, and the stored function — and by covering it with the Innovation Dev regression suite.

---

## Risks, Dependencies, And Open Questions

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R-1 | Migrations are **append-only** and target a shared, non-disposable dev DB. A wrong migration cannot be edited after merge. | **High** | Human review gate on every migration file before execution. Additive-only DDL. Verified `down()` for each. |
| R-2 | `innovation_use_validation` is SQL living outside the type system; it can silently drift from the DTO. | **High** | Author it against `innovation_dev_validation` as the template; assert the repository switch in `green-checks.repository.spec.ts`; record the full function body in `design.md`. |
| R-3 | Adding count columns to `result_actors` puts Innovation Dev in the blast radius (KZ-003). | Medium | Full server suite `npm test -- --silent`, not targeted. Innovation Dev e2e included in the verification gate. |
| ~~R-4~~ | ~~`result_quantifications.unit` free text may conflict with AC-Controlled-Lists.~~ **CLOSED** by **D-2** — unit is free text by product decision; no catalog, no conflict. | — | — |
| ~~R-5~~ | ~~A locally-seeded use-level catalog is a parallel taxonomy.~~ **CLOSED** by **D-1** — the vocabulary *is* CLARISA's (`GET /api/innovation-use-levels` supplies `id` + `name`); only its transport is local, because CLARISA does not publish `level` or `definition` and a live sync would erase them. | — | — |
| R-7 | **Off-by-one between catalog `id` and `level`** — `id = level + 1`, so `innovation_use_level_id >= 6` means `level >= 5` and makes the justification mandatory one level early. Discovered during specify; not anticipated by this proposal. | **High** | Defect class DC-10; R-IU-006 mandates joining the catalog and comparing `level`; fixtures at level 5 and level 6 are the discriminating pair. |
| R-6 | KZ-004 — verification gates were once waived because `node_modules` was absent. | Low | Pre-flight `node_modules` in `server/researchindicators` before the first gate. |

**Dependencies:** none. This chunk is the family's root.

**Open Questions — all resolved 2026-08-14**

> Superseded by the Decisions table in [`requirements.md` §10](./requirements.md#10-decisions-formerly-open-questions). Kept here as a record of what was open at proposal time.

| ID | Question | Resolution |
| --- | --- | --- |
| ~~OQ-1~~ | Where do the canonical use-level texts come from? | **D-1** — CLARISA's `GET /api/innovation-use-levels` supplies `{id, name}` only; `level` and `definition` are not published, so the catalog is seeded by migration with ten canonical rows. `id = level + 1`. |
| ~~OQ-2~~ | Is "Unit of measure" free text or a controlled list? | **D-2** — free text. `result_quantifications.unit` unchanged. |
| ~~OQ-3~~ | Story's four counts vs the screenshot's per-sex arithmetic? | **D-3** — the story governs; the image is reference only. Four disaggregated counts, total derived. |
| ~~OQ-4~~ | Does `sex_age_disaggregation_not_apply` + a single "How many" apply here? | **D-4** — yes, and the "How many" *is* the total. Adds an aggregate-mode column, mutually exclusive with the four counts. |

**Two findings from specify that this proposal did not anticipate:**

- **`id ≠ level` in the catalog** (`id = level + 1`). A rule written `innovation_use_level_id >= 6` is off by one and makes the justification mandatory a level early. Now defect class **DC-10** with a dedicated fixture pair.
- ~~**`@OpenSearchProperty` decoration is in scope** (D-5)~~ → **reversed again after Judgment Day.** The results mapping is generated from `ResultOpensearchDto`, never from an entity, and **no indicator** has detail fields indexed. R-IU-010 withdrawn; OpenSearch is a non-goal (**D-8**). This proposal's original "deferred" instinct turned out closer than D-5.
- **The lifecycle routines were the blind spot of this proposal — and of three review rounds after it.** **Four** routines (`SP_versioning`, `SP_delete_result_version`, `full_delete_result_version`, `delete_result`) enumerate every child table and column by name, so unamended they silently discard the whole detail record on version/snapshot, orphan it on both hard deletes, and leave an **active** orphan on soft delete. The count was wrong at every stage (0 → 2 → 3 → 4) until the routine set was enumerated **by call site**. Now **R-IU-011** + migration M6, plus **R-IU-012** / M0 for a pre-existing non-executable `SP_versioning` block found by the same transcription. Together roughly **6×** this proposal's implied size — all of it discovered work that was always required, not scope creep.

---

## Success Criteria

- [ ] Migrations run clean up and down against a scratch schema; no existing row is altered.
- [ ] `result_innovation_use` and the use-level catalog exist with correct FKs and `AuditableEntity` columns.
- [ ] The 0–9 catalog is seeded with `level`, `name`, and `definition` for every level.
- [ ] `calculateGreenChecks` on an indicator-6 result returns `innovation_use` and `ip_rights` keys.
- [ ] `innovation_use_validation` returns `0` for an empty result and `1` when the mandatory fields are satisfied (including the level ≥ 6 explanation rule).
- [ ] Innovation Dev green check and actor persistence are unchanged (regression asserted).
- [ ] `npm test -- --silent` and `npm run lint -- --quiet` pass in `server/researchindicators`; coverage ≥ 60%.

---

## Next Step

```text
/akili-specify docs/specs/innovation-use/data-model-and-catalog
```
