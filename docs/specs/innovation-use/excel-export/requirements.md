# Requirements — Innovation Use / Excel export section

- **Module:** reports (consumes `result-innovation-use`)
- **Spec id:** 2026-10-innovation-use-excel-export
- **Status:** in-review
- **Owner:** ARI server squad
- **Linked PRD section:** `docs/prd.md` — MEL-3 (export structured metadata to Excel), G8
- **Linked tickets:** AC-1681
- **Family:** `docs/specs/innovation-use/family.md` row 7 (added with HITL approval 2026-10-05, before this folder existed)
- **Extends:** child 1 (green check `innovation_use_validation`), child 4 (role-5 dev link), child 5 (dev card facts)
- **Last updated:** 2026-10-05

## Document Control

| Field | Value |
| --- | --- |
| Type | Change |
| Depth | Standard (one view, one layout migration, TS wiring — no API or auth change) |
| Approval Mode | gated |
| Source of intent | `/akili-specify` argument (2026-10-05): *"agregar la información de la sección de innovation use al reporte excel del módulo reports … los mismos campos que se usan en el servicio de result_innovation_use findOne … la consulta debe ser una vista con todas las reglas de los green checks de esa sección … basarte en report_alliance_alignment pero primando la optimización de la consulta"* |
| HITL rulings (2026-10-05) | (1) spec lives at family row 7; (2) "green-check rules" = **per-cell rules** (`Not provided` / `Not applicable` / `Not mandatory`), **no** completeness column; (3) each list is **one bulleted cell**, one Excel row per result |

---

## Executive Summary

The Results Center Excel export (`GET /api/reports/resultCenter/xlsx`) has no Innovation Use data, and its banner tells users so. This spec adds an **INNOVATION USE** column group to the Raw data sheet: **6 columns** (amended 2026-10-06 from 9 after QA feedback; see R-IUX-006 and R-IUX-007). The data comes from a new MySQL view, `report_innovation_use`, which still exposes all 9 business fields `ResultInnovationUseService.findOne` returns, so the three dropped *linked* fields can return to the export later without a view change. Each cell follows the section's green-check rules: a required value that is missing reads `Not provided`, and a value whose rule does not apply reads `Not applicable`. The view must cost the export only the rows it was asked for, which `report_alliance_alignment` does not guarantee.

---

## Glossary

| Term | Meaning |
| --- | --- |
| Raw data sheet | The single data sheet of workbook `star_results_metadata`. Each section is a **column group** inside it, not its own sheet |
| Column group | A coloured, merged header band above a range of columns (`report_workbook_column_group`) |
| `report_field(value, mandatory, applies)` | Existing stored function. Returns `Not applicable` when `applies` is false, `Not provided` when the value is mandatory and blank, `Not mandatory` when it is optional and blank, otherwise the value |
| Green check | `innovation_use_validation(result_id)`, the stored function that decides whether the section is complete (rules 2–11 incl. 8b, 14, 15, 16, latest body in migration `1789100000000`) |
| Live result | A `results` row with `is_active = TRUE AND is_snapshot = FALSE`, the row every existing `report_*` view uses |
| Linked dev | The Innovation Development result linked through `link_results` role 5 (`INNOVATION_USE_LINKED_DEV`) |

---

## 1. System Context & Scope

**Current behavior (cited as run at `f9d57147`):**

| Claim | Evidence |
| --- | --- |
| The export has one data sheet. Each section is a column group, and its columns are hardcoded in TS | `star-results-metadata-workbook.handler.ts:85-119`; `star-results-metadata.columns.ts:6` (74 raw columns, pinned by `…handler.spec.ts:165`) |
| The last group is OICR DETAILS, columns 61–74, and the banner merges to column 74 | `star-results-metadata.sheet-presentation.ts:58-62`, `:74` |
| The export tells users Innovation Use is "coming soon" | `star-results-metadata.banner-subtitle.ts:15-18`, rendered at `…handler.ts:102` |
| Phase 2 is one SELECT that LEFT JOINs every `report_*` view on `result_id`, filtered by `gi.result_id IN (…)` | `star-results-export.repository.ts:68-178` |
| Cells encode required/applicable rules through `report_field`; no view calls a `*_validation()` function | `1777046263538-updateDateFormat.ts:52-124`; `grep -l "VIEW report_" db/migrations/*.ts | xargs grep -c "_validation("` → 12 files, 0 hits in each |
| No `report_innovation_use` view exists | `grep -rn report_innovation_use server/researchindicators/src` returns 0 hits |
| The fields `findOne` returns | `result-innovation-use.service.ts:553-674` (inline object; there is no response DTO) |

**In scope:** a new view, a layout migration (column group + data dictionary rows), the export's TS wiring (repository SELECT, column specs, group fallback, banner span), and the banner notice text.

**Out of scope / NOT changing:**
- the other sections' columns, their order, and their content;
- the client (STAR downloads the file unchanged; the button and endpoint stay the same);
- the Innovation Development section, which stays "coming soon" in the notice;
- the green-check function itself;
- the `report_alliance_alignment` SDG join mismatch between the migration and Dev (noted in design, not fixed here);
- the empty `organizations_on_behalf` column (an existing defect: declared in the column specs, never selected).

**Affected surface (what renders):** the downloaded `.xlsx`, both sheets. Raw data gains 6 columns (75–80; amended 2026-10-06), a group band and a wider banner. Data dictionary gains an Innovation Use section. The notice row changes text.

---

## 2. Stakeholders / Personas

| Persona (PRD §3) | Need |
| --- | --- |
| MEL / Results Center analyst | Analyse Innovation Use results offline, and see at a glance which required fields are missing |
| Center admin / PI | Check completeness of their Innovation Use results in bulk |
| ARI server team | Add a section without slowing the export down for every user |

---

## 3. Functional Requirements

> **Cell vocabulary used below.** `NA` = `Not applicable` · `NP` = `Not provided` · `NM` = `Not mandatory`. Every cell is `NA` on a result whose `indicator_id ≠ 6`.
> **Exclusions that apply to every requirement:** no audit columns (`created_*`, `updated_*`, `deleted_at`, `is_active`), and no surrogate or catalog ids: an id is always shown as its catalog name. Also excluded: `innovation_dev_result_id` (an id; its result is shown by R-IUX-006) and the four legacy actor booleans `women_youth`, `women_not_youth`, `men_youth`, `men_not_youth` (spread into `findOne` by `...actor`; the green check ignores them). *(JD-10)*
>
> **`Not provided` follows the green check exactly (JD-1).** A cell or slot reads `Not provided` only when the green-check predicate that guards it fails. A missing catalog **name** behind an id the check accepts (for example an `institution_id` with no `clarisa_institutions` row) renders the neutral `Unknown (id {n})`, never `Not provided`.

### R-IUX-001 — One Innovation Use row per live result

- **As a** MEL analyst **I want** the Innovation Use data in the same row as the rest of the result **so that** one row still means one result.

**Behavior:** the view returns exactly one row per live result, keyed by `result_id`, whatever the number of actors, organizations, quantifications or dev links the result has.

#### Scenario: Many children, one row
- GIVEN a live Innovation Use result with 3 active actors, 2 organizations, 2 quantifications and **2 active role-5 links** (the known race)
- WHEN the export runs for that result
- THEN the Raw data sheet holds exactly one row for it
- AND IT MUST NOT duplicate the row in any other section's columns
- BUT it must NOT include snapshot rows (`is_snapshot = TRUE`) or soft-deleted results

#### Scenario: Other indicators
- GIVEN a live Capacity Sharing result (indicator 1)
- WHEN it is exported
- THEN all 9 Innovation Use cells read `Not applicable`

### R-IUX-002 — Use level and justification

| Column header | Content | Rule (green check) |
| --- | --- | --- |
| Innovation use level | `Level {level}: {name}` from `clarisa_innovation_use_levels` | Mandatory (rule 14) |
| Use level justification | the explanation text | Mandatory **only when the catalog `level` ≥ 6** (rule 15); `NA` otherwise |

#### Scenario: Level requires a justification that is missing
- GIVEN an Innovation Use result at level 7 with a blank explanation
- WHEN it is exported
- THEN *Use level justification* reads `Not provided`
- AND IT MUST compare the catalog **`level`**, never the `id` (`id = level + 1`)

#### Scenario: Level below 6
- GIVEN level 2 and a stale explanation still stored
- THEN *Use level justification* reads `Not applicable`, and the stale text is not shown

#### Scenario: No detail row
- GIVEN an Innovation Use result with no active `result_innovation_use` row
- THEN *Innovation use level* reads `Not provided` and *Use level justification* reads `Not applicable`

### R-IUX-003 — Actors (one bulleted cell)

One line per active Innovation Use actor (`actor_role_id = 2`), in a stable order, prefixed `• `, separated by line breaks:
- disaggregated mode: `• {actor type}[: {custom name}] — Women (youth): a; Women (non-youth): b; Men (youth): c; Men (non-youth): d; Total: t`
- aggregate mode (`sex_age_disaggregation_not_apply = TRUE`): `• {actor type}[: {custom name}] — Total: n (sex and age disaggregation not applicable)`
- a **NULL** flag is disaggregated mode, as in the green check (`IF(flag = TRUE, …)`) and in `deriveActorTotal` (`=== true`). *(JD-4)*

`Total` follows `findOne`'s `deriveActorTotal`: in aggregate mode `actors_count`; otherwise `null` when all four counts are NULL, else their sum with NULL as 0. *(JD-8)* An empty list is valid (rule 13 was removed), so the cell reads `Not mandatory` when there are no actors.

#### Scenario: A line that breaks a rule
- GIVEN an actor of type Other with a blank custom name, and an actor whose `men_youth_count` is NULL in disaggregated mode
- THEN the first line shows `Other: Not provided` (rule 2)
- AND the second shows `Men (youth): Not provided` (rules 3–4)
- AND IT MUST show `Not provided` for an aggregate-mode `actors_count` that is NULL or ≤ 0 (rule 5)
- BUT it must NOT mark a count of `0` as `Not provided` in disaggregated mode when the sum is > 0

### R-IUX-004 — Organizations (one bulleted cell)

One line per active Innovation Use organization (`institution_type_role_id = 2`):
- known (`is_organization_known = TRUE`): `• {acronym} - {institution name}` (the name alone when there is no acronym)
- not known: `• {type}[ > {sub-type}][ ({custom name})] — Number of organizations: n`
- a **NULL** `is_organization_known` is the not-known branch, as in the green check (`IF(is_organization_known = TRUE, …)`). *(JD-4)*

An empty list reads `Not mandatory`.

#### Scenario: Rule violations inside a line
- GIVEN a known organization with no `institution_id` → its line reads `• Not provided` (rule 6)
- GIVEN an unknown organization whose root type has children and no sub-type → `{type} > Not provided` (rule 8)
- GIVEN a sub-type whose parent is not the chosen type → `{type} > Not provided` (rule 8b)
- GIVEN `organization_count` NULL or ≤ 0 → `Number of organizations: Not provided` (rule 9)
- AND IT MUST evaluate rule 8 with the green check's exact predicate (an **active root** type that **has children**)

### R-IUX-005 — Quantifications (one bulleted cell)

One line per active Innovation Use measure (`quantification_role_id = 3`): `• Number: {number}, Unit: {unit}, Comment: {description}`, the line layout `report_oicr` already uses (`1790688406000-linkResultOicrsAndOtherResearchArea.ts:65`). Only the layout is shared: the slot rules are this section's green check, so `0` is `Not provided` here and the comment is optional, whereas `report_oicr` has no `<> 0` guard and makes the comment mandatory. *(S-10)* The number has no trailing zeros (`12.5000` → `12.5`) and keeps its sign. An empty list reads `Not mandatory`. *(Amended 2026-10-05 at design time, for consistency with the OICR section; the first draft read `• {number} {unit} — {description}`.)*

#### Scenario: Rule violations
- GIVEN a number of `0` or NULL → `Not provided` in its place (rule 10)
- GIVEN a blank unit → `Not provided` in its place (rule 11)
- BUT it must NOT mark a **negative** number as `Not provided` (rule 10 is `<> 0`)
- AND a blank description reads `Comment: Not mandatory` (the green check does not require it)

### R-IUX-006 — Linked Innovation Development result (4 view cells, 1 exported cell)

> **Amended 2026-10-06 (QA feedback, user-approved):** the export shows **only** *Linked innovation development*. The view `report_innovation_use` keeps all four cells below, so they can be re-exported later without changing the view, which is already applied on the shared database. *Linked innovation readiness level*, *Linked innovation description* and *Linked innovation geographic scope* are **view-only**: they are not selected by Phase 2, not in the Raw data sheet, and not in the data dictionary.

| Column header | Content | Rule |
| --- | --- | --- |
| Linked innovation development | `{platform}-{official code} - {title}`; the bare code when `platform_code` is NULL, and no ` - {title}` when the title is NULL (*JD-5*: both are nullable, and rule 16 does not test them) | Mandatory (rule 16) |
| Linked innovation readiness level | `Level {level}: {name}` | optional; `NA` when there is no qualifying link |
| Linked innovation description | the dev result's description | optional; `NA` when there is no qualifying link |
| Linked innovation geographic scope | geo scope name | optional; `NA` when there is no qualifying link |

A **qualifying link** is what rule 16 counts: an active role-5 `link_results` row whose target is active and has `indicator_id = 2`.

#### Scenario: Link to a deleted dev result
- GIVEN the only role-5 link points to a dev result that has since been soft-deleted
- THEN *Linked innovation development* reads `Not provided`, and the other three cells read `Not applicable`
- AND IT MUST pick exactly one link deterministically when two qualify: the one created last (highest `link_result_id`)

### R-IUX-007 — Workbook layout

- The 6 exported columns are appended **after OICR DETAILS** (columns 75–80), under a group band labelled **INNOVATION USE** with its own colour, in this order: Innovation use level · Use level justification · Linked innovation development · Actors · Organizations · Quantifications. *(Amended 2026-10-06 from 9 columns at 75–83 in the R-IUX-002…006 order, after QA feedback: the linked-dev cell moves to sit right after the justification, and the three other linked cells leave the export.)*
- The banner title spans the new last column.
- The Data dictionary sheet gains an *Innovation Use* section with one entry per new column, in column order, each with an explanation.
- The fallback group list (used when the layout table is empty) matches the database rows.

#### Scenario: Layout integrity
- WHEN the workbook is generated
- THEN Raw data has 80 columns, the INNOVATION USE band covers exactly 75–80, and every new header matches the dictionary label, in the order above
- BUT it must NOT move, rename or recolour any existing column or group

### R-IUX-008 — Banner notice

The "coming soon" notice no longer mentions Innovation Use, and keeps saying that the Innovation Development section is not yet included.

---

## 4. Non-Functional Requirements

### NFR-IUX-001 — The view costs only the rows asked for (performance)
- **Category:** performance
- **Target:** when Phase 2 joins `report_innovation_use` under `result_id IN (…)`, MySQL **merges** the view into the outer query. `EXPLAIN FORMAT=TREE` shows **no view-level materialization** (no `Materialize` whose input is the view's root `results` scan, and no hash join on the view). Each collection appears as a per-row `Materialize (invalidate on row from root)`, the expected shape of a `LATERAL`, correlated on `<child>.result_id = root.result_id`. The access path MySQL picks inside each lateral (the `result_id` FK, a role index, or another) is a cost-based choice and is **not** part of the gate. The gate matches these lines **positively**; the mere absence of an alias does not count, because a merged view's alias disappears from the plan (*JD-2*). Phase 2's time on the seeded set is **recorded as a reading, not a gate**; the human checks real-volume timing on Dev at the T-05 gate. *(Amended 2026-10-05 at T-02 execute, user-approved: on 210 seeded results MySQL read two laterals by a role index or `PRIMARY` instead of the `result_id` FK, and Phase 2 went from 75 ms to 126 ms. No existing `report_*` view is held to an index-path or a percentage bar. The structural property, a merged view with per-row correlated laterals and no duplicate rows, is what the gate keeps. The first draft also required an `Index lookup … (result_id=root.result_id)` input and a ≤ 20% time growth.)*
- **BUT it must NOT** call `innovation_use_validation()` (or any `*_validation`) per row, and must NOT use a top-level `GROUP BY`, `DISTINCT`, aggregate, `ORDER BY` or `LIMIT`, since any of these forces the whole view to be materialized.
- **How verified:** `EXPLAIN FORMAT=TREE` of the **real** Phase 2 SQL text (captured from the repository's `queryRunner.query` call) on the scratch schema seeded with ≥ 200 results of mixed indicators (with realistic child rows), plus a timing run of three repetitions before and after, recorded as a reading.

### NFR-IUX-002 — Parity with the green check (correctness)
- **Target:** for every fixture **Innovation Use result** (`indicator_id = 6`), `innovation_use_validation(id) = TRUE` **if and only if** none of the 9 cells contains `Not provided`. Each single-rule violation turns **exactly** the cell its rule names to `Not provided`. A result of any other indicator is outside the biconditional: R-IUX-001 governs it (all 9 cells `Not applicable`), and the function is not evaluated for it. *(Amended 2026-10-05 at T-02 execute, user-approved: the function returns 0 for a non-Innovation-Use result because it has no `result_innovation_use` row and never checks the indicator, so the unscoped "every fixture result" contradicted R-IUX-001.)*
- **How verified:** fixture suite against a disposable MySQL (`npm run test:fixtures`), one fixture per green-check rule: 2, 3, 4, 5, 6, 7, 8, 8b, 9, 10, 11, 14, 15, 16 (there is no rule 12, and rule 13 was removed in `1787280000000`), plus one fully valid result, one other-indicator result, the 2-links case and the NULL cases of JD-1/JD-4/JD-5.

### NFR-IUX-003 — Reversible (reliability)
- **Target:** reverting the two migrations drops the view and removes exactly the inserted layout rows. With the code reverted as well, the export works as it does today.
- **Deploy order:** the view migration MUST be applied **before** the code that joins the view reaches an environment. Without the view, Phase 2 fails for **every** export, not only Innovation Use ones.
- **Cosmetic window (JD-6, accepted):** the layout rows are read for every export, so between applying the layout migration and the new code going live, the old code paints the INNOVATION USE band and 9 dictionary rows over columns that do not exist. The same happens during a backout. The window lasts one deploy; nothing errors and no data is wrong.

### NFR-IUX-004 — Migration safety (dx)
- Migrations that pass no params contain no `?` or `:word`, even in comments (`namedPlaceholders`). `down()` restores the previous state exactly.

---

## 5. Defect classes → gates

| # | Defect class this spec can produce | Gate that catches it |
| --- | --- | --- |
| D1 | A rule mis-encoded in SQL (wrong `applies`/`mandatory`, NULL handling, `level` vs `id`) | NFR-IUX-002 fixture suite on real MySQL. A unit spec over SQL text **cannot** execute it (ADR-11) |
| D2 | Row multiplication (more than one view row per result) | Fixture with 2 links and N children asserting `COUNT(*) = 1` per `result_id` |
| D3 | Whole-view materialization or full child scans (slow export) | `EXPLAIN` gate (NFR-IUX-001). A timing run alone is noise-prone and is **not** the gate |
| D4 | Column/key misalignment (header ≠ alias, group range, banner span, dictionary order) | Handler + repository unit specs, plus one generated `.xlsx` read back in a test |
| D5 | Migration placeholder rewrite or a `down()` that does not restore | Migration specs (SQL text, no `?`) plus an up → down → up round trip on scratch |
| D6 | Deployed code without the view → every export 500s | **No automated gate.** Substitute: rollout check `migration:show` on the target before merge (human, at the HITL pause) |
| D7 | Visual rendering (band colour, merged cells, wrapped bullet lines readable) | **No automated gate.** Substitute: a human opens the generated file at the execute HITL pause |
| D8 | Compiler-only defect in the TS wiring | `npm run build` (spec files excluded, so the build only covers production code) |

---

## 6. Data requirements

- New view `report_innovation_use` (migration `<ts>-CreateReportInnovationUseView.ts`).
- New layout rows: 1 `report_workbook_column_group` row and 9 `report_data_dictionary` rows (migration `1791400000000-StarRawInnovationUseColumnGroup.ts`), appended with no shifting. **Amended 2026-10-06:** that migration is already applied on the shared database, so a second migration (`<ts>-StarRawInnovationUseExportSubset.ts`) narrows the group to 75–80, deletes the three view-only dictionary rows, and re-orders the six remaining Innovation Use dictionary rows among themselves. No other section's row moves, and `down()` restores the 9-row state exactly.
- No table, column or index changes are expected. If `EXPLAIN` shows an index is missing, design records it as a decision.

## 7. API surface delta

None. Same endpoint, same params, same file name. The response body (the `.xlsx`) gains columns.

## 8. Cross-system impact

STAR client: none (it downloads the file unchanged). No CLARISA or OpenSearch changes; the view only reads CLARISA catalog tables already synced.

## 9. Assumptions, dependencies, risks

| # | Item | Mitigation |
| --- | --- | --- |
| A1 | Header labels and line formats are proposed by this spec, not yet confirmed by product | OQ-1 |
| R1 | Prod pipeline migration behavior was not re-measured (root `CLAUDE.md` K-015 correction covers Dev only) | NFR-IUX-003 deploy order; human check before the `main` merge |
| R2 | A very long cell (many actors or organizations) | `group_concat_max_len` is already 4 MiB in Phase 2; `report_field` returns MEDIUMTEXT |
| R3 | Transcription drift: a future redefinition of `innovation_use_validation` (or of `valid_text`/`report_field`) silently diverges from the view. No CI job runs `test:fixtures` (`.github/workflows` holds only the Jenkins trigger and SonarCloud) | **Accepted risk (S-4).** The view migration's header and ADR-11's checklist name the parity fixture as a gate for any migration that redefines the function |

## 10. Open questions

| # | Question | Owner | Due |
| --- | --- | --- | --- |
| OQ-1 | Confirm header labels and line formats (R-IUX-002…006) with the product owner | product owner (via user) | before T-01 closes |
| OQ-2 | Should *Linked innovation development* also show the dev result's status? `findOne` does not return it, so it is left out here | product owner | non-blocking |

## 11. Requirement ID Index

| ID | Title | Kind |
| --- | --- | --- |
| R-IUX-001 | One row per live result | functional |
| R-IUX-002 | Use level + justification | functional |
| R-IUX-003 | Actors cell | functional |
| R-IUX-004 | Organizations cell | functional |
| R-IUX-005 | Quantifications cell | functional |
| R-IUX-006 | Linked dev (4 cells) | functional |
| R-IUX-007 | Workbook layout | functional |
| R-IUX-008 | Banner notice | functional |
| NFR-IUX-001 | Merge-able view, indexed reads | performance |
| NFR-IUX-002 | Green-check parity | correctness |
| NFR-IUX-003 | Reversible + deploy order | reliability |
| NFR-IUX-004 | Migration safety | dx |

## 12. Sign-off

- [ ] Engineering lead
- [ ] MEL / product owner (OQ-1)
