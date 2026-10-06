# Requirements — Innovation Development / Excel export section

- **Module:** reports (consumes `result-innovation-dev`)
- **Spec id:** 2026-10-innovation-dev-excel-export
- **Status:** in-review
- **Owner:** ARI server squad
- **Linked PRD section:** `docs/prd.md` — MEL-3 (export structured metadata to Excel), G8
- **Linked tickets:** none yet (lands on branch `AC-1681-Include-the-Innovation-use-data-in-the-excel-export`)
- **Precedent:** `docs/specs/archive/2026-10-06-innovation-use--excel-export/` (AC-1681), whose rules this spec reuses
- **Last updated:** 2026-10-06

## Document Control

| Field | Value |
| --- | --- |
| Type | Change |
| Depth | Standard (one view, one layout migration, TS wiring — no API or auth change) |
| Approval Mode | gated |
| Source of intent | `/akili-specify` argument (2026-10-06): *"desarrollar ahora el reporte de innovation dev partiendo de lo que ya tenemos en esta rama y las últimas migraciones del desarrollo de innovation use … las mismas reglas … se deben mostrar todos los campos del get de innovation dev … basarte en las vistas ya existentes como innovation use"* |
| HITL rulings (2026-10-06) | (1) the group goes **after INNOVATION USE** (columns 81+), with nothing shifted; (2) the June Dev-only Innovation Development export (`5b426acf`, branch `dev`, removed on Thursday) is treated **as if it does not exist** — the view takes the name `report_innovation_dev`; (3) column labels come from the **existing seed dictionary** (`Innovation details` rows), plus new labels only for the GET fields the seed lacks |
| Same rules as the precedent | One row per result · each list in **one bulleted cell** · `Not provided` exactly where the green check fails · no completeness column · ids shown as catalog names · no audit columns |

---

## Executive Summary

The Results Center Excel export has no Innovation Development data, and a notice row tells users so. This spec adds an **INNOVATION DEVELOPMENT** column group to the Raw data sheet: **32 columns at 81–112**, one per business field that `GET /api/results/innovation-dev/:resultCode` returns. The data comes from a new view `report_innovation_dev`, built with the same shape as `report_innovation_use`: a merged view, collections read per result. Each cell follows the green check `innovation_dev_validation`. A missing required value reads `Not provided`, a value whose form branch is not shown reads `Not applicable`, and an optional blank reads `Not mandatory`. The 27 `Innovation details` data-dictionary rows that already exist (active, but describing columns the sheet does not have) are re-labelled, completed with 5 new rows, and moved to the end so the dictionary follows the column order. The "coming soon" notice is removed.

---

## Glossary

| Term | Meaning |
| --- | --- |
| Raw data sheet | The single data sheet of workbook `star_results_metadata`. Each section is a **column group** inside it |
| Column group | A coloured, merged header band above a range of columns (`report_workbook_column_group`) |
| `report_field(value, mandatory, applies)` | Existing stored function: `Not applicable` when `applies` is false, `Not provided` when mandatory and blank, `Not mandatory` when optional and blank, otherwise the value |
| Green check | `innovation_dev_validation(result_id)`; latest body in migration `1758125999162` |
| Live result | A `results` row with `is_active = TRUE AND is_snapshot = FALSE` |
| Users determined | `anticipated_users_id = 2` ("Users have been determined"). `1` = "This is yet to be determined" |
| Scaling panel | The knowledge-sharing and scaling questions, shown only when the readiness **level** is ≥ 7 |
| Tool block | The questions shown only when knowledge sharing is *Yes* **and** the dissemination qualification is `2` ("Proceed") |

---

## 1. System Context & Scope

**Current behavior (cited as run at `13310040`):**

| Claim | Evidence |
| --- | --- |
| The export has 80 raw columns. INNOVATION USE (75–80) is the last group | `star-results-metadata.columns.ts:6` (80 entries, Innovation Use block `:259-288`); `1791500000000-StarRawInnovationUseExportSubset.ts` |
| The export says Innovation Development is "coming soon" | `star-results-metadata.banner-subtitle.ts:15-18` |
| Phase 2 reads `report_general_information gi` and LEFT JOINs 10 more `report_*` views on `gi.result_id` (11 views, **60 tables** in its top-level join, 1 below MySQL's 61 cap); none is an Innovation Development view | `star-results-export.repository.ts:68-162`; `grep -rn report_innovation_dev src/db/migrations src/domain` → no matches |
| A `report_innovation_dev` view exists in the Dev baseline dump, created by no migration on this branch | `src/db/baseline/baseline.sql:8026`. Per HITL ruling 2 this spec does not depend on it; `CREATE OR REPLACE` supersedes it |
| The data dictionary already has 27 active `Innovation details` rows (seeded at sort 58–84, shifted +1 since by `1780690000000:38-39`; they follow `Link to Innovation Use`), but no column group and no raw column matches them | `seed-data/star-results-metadata-dictionary.seed.ts:351-515`; `1781210173864-activeAllDictionaryData.ts:8` |
| The GET's fields | `result-innovation-dev.service.ts:456-527` (inline object, ids only — every display name comes from a catalog join) |
| Green-check rules | `1758125999162-AdaptInnovationDevValidationToManyToolFunctions.ts` `up()` |

**In scope:** a new view, a layout migration (column group + dictionary), the export's TS wiring (repository SELECT, column specs, group fallback, banner span), and removal of the notice row.

**Out of scope / NOT changing:**
- other sections' columns, order and content;
- the client (STAR downloads the file unchanged);
- the green-check function;
- the June Dev-only work (`5b426acf`, migrations `1781300000000`/`1781301000000`): its removal on Dev is a separate human action (HITL ruling 2);
- the possible null dereference in `findOne` (`service.ts:480`), noted only.

**Affected surface (what renders):** the downloaded `.xlsx`. Raw data gains 32 columns (81–112), a group band and a wider banner. The notice row disappears. The Data dictionary's Innovation Development section moves to the end, with 32 entries.

---

## 2. Stakeholders / Personas

| Persona (PRD §3) | Need |
| --- | --- |
| MEL / Results Center analyst | Analyse Innovation Development results offline and see which required fields are missing |
| Center admin / PI | Check completeness of their Innovation Development results in bulk |
| ARI server team | Add the section without slowing the export for every user |

---

## 3. Functional Requirements

> **Cell vocabulary.** `NA` = `Not applicable` · `NP` = `Not provided` · `NM` = `Not mandatory`. Every cell is `NA` on a result whose `indicator_id ≠ 2`.
> **Exclusions:** no audit columns, no surrogate or catalog ids (an id is always shown as its catalog name).
> **`Not provided` follows the green check exactly.** A cell reads `NP` only when the green-check predicate that guards it fails. A missing catalog **name** behind an id the check accepts renders `Unknown (id {n})`, never `NP`.
> **Booleans** render `Yes` / `No`. **Scaling answers** (1–5, no catalog) render the number.

### R-IDX-001 — One Innovation Development row per live result

The view returns exactly one row per live result, keyed by `result_id`, whatever the number of actors, organizations, tool functions or linked results.

#### Scenario: Many children, one row
- GIVEN a live Innovation Development result with 3 actors, 2 organizations, 3 tool functions and 2 linked results
- WHEN the export runs for it
- THEN the Raw data sheet holds exactly one row for it
- AND IT MUST NOT duplicate the row in any other section's columns
- BUT it must NOT include snapshot rows or soft-deleted results

#### Scenario: Other indicators
- GIVEN a live Innovation Use result (indicator 6)
- WHEN it is exported
- THEN all 32 Innovation Development cells read `Not applicable`

#### Scenario: No detail row
- GIVEN an Innovation Development result with no active `result_innovation_dev` row
- THEN every cell the green check's `commonFields` covers reads `NP` (short title, nature, type, readiness level, readiness explanation, anticipated users), and every conditional cell reads `NA`

### R-IDX-002 — General innovation fields

| # | Column header | Content | Rule (green check) |
| --- | --- | --- | --- |
| 81 | Short title | text | Mandatory |
| 82 | Innovation nature | `clarisa_innovation_characteristics.name` | Mandatory (id) |
| 83 | Innovation type | `clarisa_innovation_types.name` (joined on **code**) | Mandatory (id) |
| 84 | New or improved variety or breed | Yes / No | Optional (`NM` when blank) |
| 85 | Number of new or improved lines/varieties | number | Mandatory and `> 0` **only when** the variety answer is *Yes*; `NA` otherwise |
| 86 | Innovation readiness level | `Level {level}: {name}` | Mandatory (id) |
| 87 | Readiness explanation | text | Mandatory |

#### Scenario: Variety count
- GIVEN variety = *Yes* and a count of `0`
- THEN *Number of new or improved lines/varieties* reads `NP`
- BUT with variety = *No* or blank it reads `NA`, even when a stale count is stored

### R-IDX-003 — Anticipated users, actors and organizations

| # | Column header | Content | Rule |
| --- | --- | --- | --- |
| 88 | Anticipated users | `innovation_dev_anticipated_users.name` | Mandatory |
| 89 | Sex and age disaggregation not applicable | Yes / No | Optional, always applies on indicator 2 (no rule; the field is written only by the PRMS sync — OQ-2) |
| 90 | Actors | bulleted list | Applies only when **users determined**; then the list must hold **at least one** actor and every line must be complete |
| 91 | Organizations | bulleted list | Same as actors |
| 92 | Intended beneficiaries/users elaborated | text | Mandatory when users determined; `NA` otherwise |
| 93 | Expected outcomes | text | Mandatory when users determined; `NA` otherwise |

**Actor line** (one per active actor with `actor_role_id = 1`, ordered by id): `• {actor type}[: {custom name}]` followed by ` — {segments}`, where segments are the *true* booleans of `Women (youth)`, `Women (non-youth)`, `Men (youth)`, `Men (non-youth)` joined by `, `. When `sex_age_disaggregation_not_apply = TRUE` the suffix is ` — Sex and age disaggregation not applicable`. With no true segment and the flag not TRUE, there is no suffix.

**Organization line** (one per active row with `institution_type_role_id = 1`): known (`is_organization_known = TRUE`) → `• {acronym} - {name}` (name alone without acronym); not known → `• {type}[ > {sub-type}][ ({custom name})]`.

#### Scenario: Users determined, empty list
- GIVEN users determined and no active actors
- THEN *Actors* reads `NP`

#### Scenario: Line-level violations
- GIVEN an actor of type Other (5) with a NULL custom name → its line shows `Other: Not provided`
- GIVEN an actor with no `actor_type_id` → its line reads `• Not provided`
- GIVEN a known organization with no `institution_id` → its line reads `• Not provided`
- GIVEN an unknown organization of type Other (78) with no custom name → `Other (Not provided)`
- GIVEN an unknown organization whose type has children and no sub-type → `{type} > Not provided`
- GIVEN an unknown organization with no type → `• Not provided`
- AND IT MUST evaluate the "has children" predicate exactly as the green check does (any `clarisa_institution_types` row whose `parent_code` is the type)

#### Scenario: Users not determined
- GIVEN anticipated users = "This is yet to be determined"
- THEN *Actors*, *Organizations*, *Intended beneficiaries…* and *Expected outcomes* read `NA`, even when stale rows or text exist

### R-IDX-004 — Knowledge sharing and tool fields (scaling panel)

All cells below are `NA` unless the readiness **level** is ≥ 7 (compare the catalog `level`, never the id).

| # | Column header | Content | Rule |
| --- | --- | --- | --- |
| 94 | Potential for researchers/policymakers adaptation | Yes / No (`is_knowledge_sharing`) | Mandatory |
| 95 | Method/tool qualifies for dissemination | `dissemination_qualifications.name` | Mandatory when knowledge sharing = *Yes*; `NA` otherwise |
| 96 | Context for tool usefulness | text | Tool block: mandatory |
| 97 | Results detailed with examples | text | Tool block: mandatory |
| 98 | Tool function | bulleted `• {tool_functions.name}`, active rows, ordered by id | Tool block: at least one |
| 99 | Innovation used beyond original context | Yes / No | Tool block: mandatory |
| 100 | Adopted and adapted in other contexts | text | Tool block: mandatory when *used beyond* = *Yes*; optional (`NM`) when *No*; `NA` when blank *used beyond* |
| 101 | Tools often used together | bulleted `• {platform}-{official code} - {title}` per active role-2 link, ordered by link id | Tool block: optional |
| 102 | Other tools | text | Tool block: optional |
| 103 | Other tools' usage with this one description | text | Tool block: optional |

"Tool block" = `NA` unless knowledge sharing = *Yes* **and** dissemination = `2` ("Proceed").

#### Scenario: Readiness below 7
- GIVEN readiness level 6 and stale knowledge-sharing data stored
- THEN cells 94–103 and 104–112 read `NA`, and the stale values are not shown

#### Scenario: Opt out
- GIVEN level 8, knowledge sharing *Yes*, dissemination "Opt out"
- THEN *Method/tool qualifies…* shows `Opt out`, and cells 96–103 read `NA`

#### Scenario: Proceed with gaps
- GIVEN level 8, *Yes*, "Proceed", no active tool function, *used beyond* = *Yes* and a blank adoption context
- THEN *Tool function* and *Adopted and adapted…* read `NP`
- BUT *Tools often used together*, *Other tools* and their description read `NM` when blank, never `NP`

### R-IDX-005 — Scaling potential (scaling panel)

| # | Column header (seed label) | Content | Rule |
| --- | --- | --- | --- |
| 104–110 | the 7 seed labels *Formulation: …*, *Demand and Investment: …*, *Sustained use: …* | the 1–5 answer | Optional; `NA` unless level ≥ 7 |
| 111 | Sustained use: Is there potential for actor in new contexts and for new purposes? | `expansion_potentials.name` | Optional; `NA` unless level ≥ 7 |
| 112 | Expansion and adaptation details | text | Optional; `NA` unless level ≥ 7 **and** expansion potential = `2` ("Yes, with adaptations") |

#### Scenario: Optional scaling answers
- GIVEN level 7 and no scaling answers
- THEN cells 104–111 read `NM`
- BUT it must NOT read `NP`: the green check does not require them

### R-IDX-006 — Workbook layout

- The 32 columns are appended after INNOVATION USE (**81–112**), in the order of R-IDX-002…005, under a band labelled **INNOVATION DEVELOPMENT**, coloured `FF00897B` (the colour the seed already gives the `Innovation details` section).
- The banner title spans column 112.
- **Data dictionary:** the 27 existing `Innovation details` rows are reused. Their labels are normalised (each newline run becomes one space, then trimmed, so each one equals its header — the full list is in design §3.2a), each gets an explanation, and the section is renamed **Innovation Development**. 5 rows are added for the fields the seed lacks: 84, 85, 88, 89, 112. All 32 move to the end of the dictionary, in column order.
- The fallback group list matches the database rows.

#### Scenario: Layout integrity
- WHEN the workbook is generated
- THEN Raw data has 112 columns, the INNOVATION DEVELOPMENT band covers exactly 81–112, and every header equals its dictionary label, in column order
- BUT it must NOT move, rename or recolour any existing column or group
- AND IT MUST leave no `Innovation details` dictionary row behind (no duplicate, orphaned section)
- BUT it must NOT change any Innovation Use dictionary row, even though two of its labels (`Actors`, `Organizations`) equal Innovation Development labels

### R-IDX-007 — Notice removed

The "coming soon" notice row no longer appears, because both Innovation sections are now in the export.

#### Scenario: No notice
- WHEN the workbook is generated
- THEN no row contains the text `coming soon`

---

## 4. Non-Functional Requirements

### NFR-IDX-001 — The view costs only the rows asked for (performance)
- **Target (structural, same bar as precedent NFR-IUX-001 as amended):** the export reads `report_innovation_dev` under `result_id IN (…)` **without degrading any existing view**: (a) MySQL merges `report_innovation_dev` in the query that reads it — no view-level materialization, each collection a per-row `Materialize (invalidate on row from root)` correlated on `result_id`; (b) the existing Phase 2 query keeps every view merged (its top-level table count does not grow past today's 60; MySQL silently un-merges a view past 61). Access paths and timing are **readings, not gates** (Kaizen KZ-innovation-use--excel-export-1). *(Amended 2026-10-06 at Judgment Day round 1, C-4: the first draft required the view to merge "under Phase 2", which the 61-table cap makes impossible without degradation — design DD-1.)*
- **BUT it must NOT** call `innovation_dev_validation()` per row, and must NOT use a top-level `GROUP BY`, `DISTINCT`, aggregate, `ORDER BY` or `LIMIT`.
- **How verified:** `EXPLAIN FORMAT=TREE` of the **real SQL the repository sends** (captured from `queryRunner.query`) on scratch MySQL seeded with ≥ 200 mixed results: the query that reads the view for (a), and the Phase 2 query for (b).

### NFR-IDX-002 — Parity with the green check (correctness)
- **Target:** for every fixture result with `indicator_id = 2`, `innovation_dev_validation(id) = TRUE` **if and only if** none of the 32 cells contains `Not provided` — **except two named divergences**, each pinned by its own fixture: (1) an inactive `result_innovation_dev` row (the function ignores `is_active`, the GET does not), (2) active actor/organization rows of role 2 on an indicator-2 result (the function counts every role, the GET reads role 1). *(Exceptions added 2026-10-06, Judgment Day S-5.)* Each single-rule violation turns **exactly** the named cell (or line slot) to `Not provided`.
- **How verified:** fixture suite on scratch MySQL. One fixture per rule: short title, nature, type, readiness id, readiness explanation, variety count, anticipated users, actors empty, actor Other without name, organizations empty, each organization branch, beneficiaries, outcomes, knowledge sharing NULL, dissemination NULL, context, results, tool functions empty, *used beyond* NULL, adoption context. Plus a fully valid result, users-not-determined, level < 7, opt out, and another-indicator result.

### NFR-IDX-003 — Reversible (reliability)
- Reverting the migrations drops `report_innovation_dev` (design DD-6: the baseline-only definition is not re-created — HITL ruling 2) and restores the previous dictionary rows **exactly**: label (byte-exact), explanation, section, fill, `sort_order` and activity of the 27 seed rows **as they stood before `up()`** (not the seed file's numbers, which later migrations shifted), the 5 new rows and the group row deleted, every other row untouched. *(Amended 2026-10-06, Judgment Day C-3/C-4.)*
- **Deploy order:** the view migration MUST be applied before the code that joins it; otherwise every export 500s.

### NFR-IDX-004 — Migration safety (dx)
- Migrations that pass no params contain no `?` or `:word`, even in comments. `down()` is exact.

---

## 5. Defect classes → gates

| # | Defect class | Gate |
| --- | --- | --- |
| D1 | A rule mis-encoded in SQL (wrong `applies`/`mandatory`, NULL handling, level vs id, branch order) | NFR-IDX-002 fixture suite on real MySQL. A unit spec over SQL text cannot execute it |
| D2 | Row multiplication | Fixture asserting `COUNT(*) = 1` per `result_id` with many children |
| D3 | Whole-view materialization | `EXPLAIN` structural gate (NFR-IDX-001) |
| D4 | Column, key, header or dictionary misalignment (32 headers, 81–112, banner 112) | Handler and repository unit specs, plus an `.xlsx` read-back test |
| D5 | Migration placeholder rewrite, a `down()` that does not restore the pre-`up()` rows, or a write that touches another section's rows | Migration specs, plus an up → down → up round trip on scratch over a realistic pre-state (shifted seed rows + Innovation Use rows) |
| D6 | Code deployed without the view → every export 500s | **No automated gate.** Substitute: a human checks `migration:show` on the target before merge |
| D7 | Visual rendering (band, wrapping of bulleted cells, long headers) | **No automated gate.** Substitute: a human opens a generated file at the execute HITL pause |
| D8 | Compiler-only defect in the TS wiring | `npm run build` |
| D9 | Dev environment overlap with the June Dev-only layout (`INNOVATION DETAILS` 61–87) | **Accepted risk** (HITL ruling 2): resolved by its removal on Thursday, not by this spec |

---

## 6. Data requirements

- New view `report_innovation_dev` (`CREATE OR REPLACE`). It supersedes the baseline-only definition (HITL ruling 2).
- Layout migration: 1 `report_workbook_column_group` row (81–112); `UPDATE` the 27 seed rows (label, explanation, section, `sort_order` = `MAX + k`); `INSERT` 5 rows. `down()` restores the 27 rows' original values and deletes the 5.
- No table, column or index changes.

## 7. API surface delta

None. Same endpoint and file name; the `.xlsx` gains columns and loses the notice row.

## 8. Cross-system impact

STAR client: none. No CLARISA or OpenSearch change.

## 9. Assumptions, dependencies, risks

| # | Item | Mitigation |
| --- | --- | --- |
| A1 | Green check counts actors and organizations **without** a role filter; the GET and this view filter role 1. Parity holds only if indicator-2 results carry no active rows of other roles | Read-only check on Dev (design Premise Ledger) |
| R1 | Prod pipeline migration order not re-measured | NFR-IDX-003 deploy order; human check before the `main` merge (same as precedent G2) |
| R2 | Prod MySQL `LATERAL` support (≥ 8.0.14) | Shared with precedent gate G1 |
| R3 | A future redefinition of `innovation_dev_validation` silently diverges from the view (no CI runs fixtures) | **Accepted risk**; the view migration's header names the parity fixture as mandatory |
| R4 | Dev shows `Cannot merge already merged cells` while the June layout still exists there | D9, accepted |

## 10. Open questions

| # | Question | Owner | Due |
| --- | --- | --- | --- |
| OQ-1 | Confirm the 5 new labels (84, 85, 88, 89, 112), the band label **INNOVATION DEVELOPMENT** and the line formats (actor, organization, tool function, linked tools) | user / product owner | **this requirements gate** (Kaizen KZ-innovation-use--excel-export-2: asked before build, not at rollout) |
| OQ-2 | Keep *Sex and age disaggregation not applicable* (89)? It is in the GET but STAR never writes it; only the PRMS sync does | user | this requirements gate |

## 11. Requirement ID Index

| ID | Title | Kind |
| --- | --- | --- |
| R-IDX-001 | One row per live result | functional |
| R-IDX-002 | General innovation fields (81–87) | functional |
| R-IDX-003 | Users, actors, organizations (88–93) | functional |
| R-IDX-004 | Knowledge sharing and tool fields (94–103) | functional |
| R-IDX-005 | Scaling potential (104–112) | functional |
| R-IDX-006 | Workbook layout + dictionary | functional |
| R-IDX-007 | Notice removed | functional |
| NFR-IDX-001 | Merged view | performance |
| NFR-IDX-002 | Green-check parity | correctness |
| NFR-IDX-003 | Reversible + deploy order | reliability |
| NFR-IDX-004 | Migration safety | dx |

## 12. Sign-off

- [ ] Engineering lead
- [ ] MEL / product owner (OQ-1, OQ-2)
