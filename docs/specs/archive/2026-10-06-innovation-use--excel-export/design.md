# Design — Innovation Use / Excel export section

- **Module:** reports (reads `result-innovation-use` data)
- **Spec id:** 2026-10-innovation-use-excel-export
- **Status:** in-review
- **Owner:** ARI server squad
- **Linked requirements:** ./requirements.md
- **Linked detailed design:** ../../../trd/trd.md (ADR-11: completeness lives in MySQL stored routines; §5 data model)
- **Last updated:** 2026-10-05

## Document Control

| Field | Value |
| --- | --- |
| Depth | Standard — re-checked against this design in §15 |
| Approval Mode | gated |
| Verified at | `f9d57147` (branch `AC-1681-Include-the-Innovation-use-data-in-the-excel-export`) |
| Exploration | Two read-only scouts (export pipeline; Innovation Use fields and green check) + architect-run `EXPLAIN` experiments on the disposable scratch MySQL (`research_indicators_server_test_mysql`, 8.0.46). The test views were dropped afterwards |
| Kaizen lessons applied | KZ-001 (assert in generated SQL/plan, not on the call sequence) → §10, DD-1 · KZ-017 (name what a check cannot reach) → §10 · K-004/KZ-014 (a red must be seen) → tasks · K-015 (deploy ≠ migrate) → §11 |

---

## Executive Summary

- **One new view, `report_innovation_use`.** Its root is `results` (live rows). It reaches its 1:1 data (`result_innovation_use`, the use-level catalog) through plain joins, and each collection (actors, organizations, quantifications, linked dev) through a **`LEFT JOIN LATERAL`** that aggregates only the current result's rows.
- **Why LATERAL, not the `report_alliance_alignment` pattern:** `EXPLAIN` shows the alliance pattern (derived table + `GROUP BY`) aggregates the **whole** child table on every export. Scalar subqueries in the SELECT list make the whole **view** materialize. LATERAL keeps the view merged into Phase 2 and reads each child by its `result_id` index, only for the requested results (P-5).
- **Green-check rules are transcribed into cell expressions.** The view never calls `innovation_use_validation()`. Parity is enforced by a fixture suite that compares the function with the cells on real MySQL (NFR-IUX-002).
- **Layout:** one appended column group and dictionary rows, with nothing shifted — **75–80, six exported columns, since the 2026-10-06 QA amendment (§3.2a, DD-7)**; first shipped as 75–83 with nine. TS wiring adds 9 column specs, the Phase 2 join, the fallback group, banner span 83, and the new notice text.

---

## 1. Goals & non-goals

**Goals**
1. Expose every business field of `findOne` as 9 Excel cells (R-IUX-001…006).
2. Encode the green check's rules (2–11 incl. 8b, 14, 15, 16; there is no rule 12, and 13 was removed) per cell or line (R-IUX-002…006, NFR-IUX-002).
3. Keep the export's cost proportional to the requested results (NFR-IUX-001).
4. Ship layout and notice changes without touching other sections (R-IUX-007, R-IUX-008).

**Non-goals**
- Refactoring `report_alliance_alignment` or any other existing view, even though they share the full-aggregation cost. That would be a separate spec; §14 records it as a follow-up.
- Fixing the SDG join mismatch between the migration and Dev, or the always-empty `organizations_on_behalf` column.
- A completeness Yes/No column (HITL ruling 2).
- Exposing `innovation_dev_result_id` or the legacy actor booleans `women_youth`/`women_not_youth`/`men_youth`/`men_not_youth` (requirements exclusions, JD-10).
- Fixing the false `SET LOCAL … reverts on commit` comment at `star-results-export.repository.ts:49-50` (pre-existing; `SET LOCAL` is `SET SESSION` in MySQL, so the value stays on the pooled connection). This spec only depends on Phase 2 setting it (S-5).
- Any client change.

> **Cross-check (KZ-016).** Read back against every `AND IT MUST` / `BUT it must NOT` in `requirements.md`: one row per result (§3.2), no snapshots (§3.1), level not id (§3.3), negative numbers valid (§3.5), no top-level aggregate/`ORDER BY`/`LIMIT` and no `*_validation()` (§3.1), no move of existing columns (§5). Module constraints: the Phase 2 repository comment lists the required views (`star-results-export.repository.ts:34-37`) and must gain this one. Migrations with no params must contain no `?` (`src/CLAUDE.md` §7).

---

## 2. Architecture

```
STAR "Export" ─► GET /api/reports/resultCenter/xlsx (reports.controller.ts:110)
   └► ReportsGenerationService ─► ReportHandlerRegistry ─► StarResultsMetadataWorkbookHandler
        ├► ReportLayoutRepository      (sheets, column groups, dictionary — DB)   ◄── layout migration
        └► StarResultsExportRepository
             Phase 1: findResultsV2 → ordered result ids (filters, search, sort)
             Phase 2: report_general_information gi
                        LEFT JOIN … existing views …
                        LEFT JOIN report_innovation_use iu ON iu.result_id = gi.result_id   ◄── NEW
                      WHERE gi.result_id IN (…)
```

### 2.1 Composition

| Path | Responsibility |
| --- | --- |
| `src/db/migrations/<ts>-CreateReportInnovationUseView.ts` | `CREATE OR REPLACE VIEW report_innovation_use`. `down()`: `DROP VIEW IF EXISTS` |
| `src/db/migrations/<ts+1>-StarRawInnovationUseColumnGroup.ts` | Appends the INNOVATION USE group (75–83) and 9 dictionary rows. `down()` deletes exactly those rows |
| `src/db/migrations/<ts+2>-StarRawInnovationUseExportSubset.ts` *(T-06, 2026-10-06)* | Narrows the group to 75–80, deletes the 3 view-only dictionary rows, re-orders the 6 remaining Innovation Use rows among themselves (§3.2a). `down()` restores the 9-row state exactly |
| `src/db/migration-specs/<ts>-CreateReportInnovationUseView.spec.ts` | SQL-text spec: no top-level `GROUP BY`/`ORDER BY`/`LIMIT`/`DISTINCT`, no `_validation(`, no `?`, `down()` drops the view |
| `src/db/migration-specs/<ts+1>-StarRawInnovationUseColumnGroup.spec.ts` | SQL-text spec for the layout rows and their exact `down()` |
| `test/fixtures/innovation-use/report-innovation-use-view.fixture-spec.ts` | Behavioral parity + one-row + `EXPLAIN` gate on scratch MySQL |
| `…/reports/repositories/star-results-export.repository.ts` | +1 `LEFT JOIN`, +9 aliased columns, view list comment |
| `…/star-results-metadata/star-results-metadata.columns.ts` | +9 `ExcelColumnSpec` (74 → 83); **T-06: 6 specs (74 → 80) in the §3.2a order** |
| `…/star-results-metadata/star-results-metadata.sheet-presentation.ts` | +1 fallback group; `bannerTitleMergeToCol` 74 → 83; **T-06: group 75–80, banner 80** |
| `…/star-results-metadata/star-results-metadata.banner-subtitle.ts` | Notice text without Innovation Use |
| sibling `*.spec.ts` of the three TS files above + handler spec | Updated pins |

### 2.2 Reuse

`report_field()` and `valid_text()` (`1779920000000-ExpandReportFieldMediumtext.ts:16-48`), the quantification-number expression of `report_oicr` (`1790688406000…ts:65`), the Phase 2 transaction with `group_concat_max_len = 4 MiB` (`star-results-export.repository.ts:185-208`), and the fixture harness (`test/jest-fixtures.json`, `test/fixtures/global-setup.ts`). No new service, module or endpoint.

**Nearest precedent (S-8):** `report_innovation_dev` exists on Dev (`baseline.sql:2589`, definition `:8026`) but is created by **no** migration (`grep -rln report_innovation_dev server/researchindicators/src` → baseline only), and the export does not join it. Its cells use `report_field(…, root.indicator_id = 2)`, which this design mirrors with `= 6`. Its derived+`GROUP BY` shape is the one DD-1 rejects. It must not be copied or depended on.

---

## 3. Data model — the view

### 3.1 Shape (rules that make it cheap)

| Rule | Why |
| --- | --- |
| Root: `results root WHERE root.is_active = TRUE AND root.is_snapshot = FALSE` | Same live-row contract as every `report_*` view (R-IUX-001) |
| **No** top-level `GROUP BY`, aggregate, `DISTINCT`, `HAVING`, `ORDER BY`, `LIMIT`, `UNION`, or subquery in the SELECT list | Each of these blocks the view from merging. Measured for the SELECT-list subquery in P-5 |
| 1:1 data by `LEFT JOIN` on primary keys, with the **active filter in the ON clause**: `riu ON riu.result_id = root.result_id AND riu.is_active = TRUE` (*JD-3*: rule 14 and `findOne` both require an active detail row), then `ciul ON ciul.id = riu.innovation_use_level_id` | Single-row lookups (P-5). An inactive detail row behaves as no row |
| Each collection = one `LEFT JOIN LATERAL (…) ON TRUE` whose inner `WHERE` is `root.indicator_id = 6 AND child.result_id = root.result_id AND role = N AND is_active = TRUE` | Re-materialized per outer row and read by the `result_id` index (P-5, P-6). The `root.indicator_id = 6` guard (*JD-7*) lets non-Innovation-Use rows skip the child read; their cells are `NA` anyway |
| Aggregates live **inside** the lateral (`GROUP_CONCAT(… ORDER BY <child pk> SEPARATOR '\n')`) with no inner `GROUP BY` | An aggregate with no `GROUP BY` returns exactly one row, so each lateral is 1:1 and the view cannot multiply rows. It is also valid under `ONLY_FULL_GROUP_BY` |
| The linked-dev lateral returns at most one row: `ORDER BY lr.link_result_id DESC LIMIT 1`, joined to the target with rule 16's filters | A `LIMIT` *inside* a lateral does not affect merging (P-5). Deterministic tie-break (R-IUX-006) |
| Every exposed cell goes through `report_field(value, mandatory, applies)` with `applies` starting `root.indicator_id = 6` | Vocabulary `Not applicable` / `Not provided` / `Not mandatory` identical to other sections |
| Role ids are interpolated from the enums (`ActorRolesEnum`, `InstitutionTypeRoleEnum`, `QuantificationRolesEnum`, `LinkResultRolesEnum`) and the indicator id from `IndicatorsEnum`, as `1789100000000` does (S-5) | One source of truth for discriminators (K-005) |
| **`Not provided` only where the green check fails (JD-1).** A catalog name behind an id the check accepts is rendered `COALESCE(name, CONCAT('Unknown (id ', id, ')'))` and never passed as a *mandatory* `report_field` argument | Keeps NFR-IUX-002's "if and only if" true when a CLARISA row is missing |

### 3.2 Columns

| # | View column (= SQL alias = `ExcelColumnSpec.key`) | Header | Value | mandatory | applies |
| --- | --- | --- | --- | --- | --- |
| 75 | `innovation_use_level` | Innovation use level | `Level {ciul.level}: {ciul.name}` when `riu.innovation_use_level_id` is set (the JD-1 fallback if the catalog row is missing); NULL otherwise, so `report_field` gives `Not provided` exactly when rule 14 fails | TRUE | ind = 6 |
| 76 | `innovation_use_level_explanation` | Use level justification | `riu.innovation_use_level_explanation` | TRUE | ind = 6 AND `ciul.level >= 6` |
| 77 | `innovation_use_actors` | Actors | actors lateral (§3.4) | FALSE | ind = 6 |
| 78 | `innovation_use_organizations` | Organizations | organizations lateral (§3.4) | FALSE | ind = 6 |
| 79 | `innovation_use_quantifications` | Quantifications | measures lateral (§3.4) | FALSE | ind = 6 |
| 80 | `innovation_use_linked_dev` | Linked innovation development | `CONCAT_WS(' - ', CONCAT_WS('-', r2.platform_code, r2.result_official_code), r2.title)`: bare code when the platform is NULL, no title part when the title is NULL (*JD-5*). Non-NULL whenever a qualifying link exists | TRUE | ind = 6 |
| 81 | `innovation_use_linked_dev_readiness` | Linked innovation readiness level | `Level {level}: {name}` via `result_innovation_dev rid ON rid.result_id = r2.result_id AND rid.is_active = TRUE` → `clarisa_innovation_readiness_levels ON id = rid.innovation_readiness_id`, the same path as `readInnovationDevCardFacts` (service.ts:741-779) (*S-2*). Resolved inside the linked-dev lateral | FALSE | ind = 6 AND qualifying link exists |
| 82 | `innovation_use_linked_dev_description` | Linked innovation description | `r2.description` | FALSE | same |
| 83 | `innovation_use_linked_dev_geo_scope` | Linked innovation geographic scope | `clarisa_geo_scope.name` | FALSE | same |

### 3.2a Export subset (amended 2026-10-06, QA feedback, user-approved — DD-7)

The view keeps all 9 columns above. The **export** (Phase 2 select list, column specs, fallback group, banner, data dictionary) carries **6**, at Raw data columns 75–80, in this order:

| Export col | View column | Header |
| --- | --- | --- |
| 75 | `innovation_use_level` | Innovation use level |
| 76 | `innovation_use_level_explanation` | Use level justification |
| 77 | `innovation_use_linked_dev` | Linked innovation development |
| 78 | `innovation_use_actors` | Actors |
| 79 | `innovation_use_organizations` | Organizations |
| 80 | `innovation_use_quantifications` | Quantifications |

`innovation_use_linked_dev_readiness`, `innovation_use_linked_dev_description` and `innovation_use_linked_dev_geo_scope` stay in the view as **view-only** columns.

**Hyperlink (T-07, 2026-10-06, DD-8).** A new view migration (`CREATE OR REPLACE VIEW`; the view is applied on the shared DB, so `1791300000000` is not edited) adds one column at the end: `innovation_use_linked_dev_code` = `CONCAT(r2.platform_code, '-', r2.result_official_code)`, resolved inside the linked-dev lateral. It is NULL when there is no qualifying link or when `platform_code` is NULL (`CONCAT` with a NULL returns NULL). Phase 2 builds `innovation_use_linked_dev_url` = `CONCAT('${ARI_CLIENT_HOST}/result/', iu.innovation_use_linked_dev_code, '/general-information')`, interpolating `appConfig.ARI_CLIENT_HOST` as the `platform_link` select item does. That URL is NULL when the code is NULL. Export column 77 becomes `hyperlink: { urlField: 'innovation_use_linked_dev_url', displayField: 'innovation_use_linked_dev', linkAppearance: blue + underline }`, with **no** `emptyDisplay`, so a cell without a URL falls back to its text (`excel-workbook.builder.ts` `buildCellValue`). The new column is not a green-check cell: the parity suite's 9 `CELL_KEYS` are unchanged. `down()` restores the previous view definition exactly. Phase 2 does not select them. The "col 75–83" numbers in §3.2 and §3.3 are the view's column order, not export positions.

The `innovation_use_` prefix avoids collisions in the flat Phase 2 SELECT, which already holds generic keys such as `description` and `geo_scope` from other views.

### 3.3 Rule transcription (rule # → where it lives)

| Green-check rule (`1789100000000` body) | Cell / line effect |
| --- | --- |
| 14 level id not null on an active detail row | col 75 `mandatory = TRUE`: a missing `riu` row or a NULL level gives `Not provided` |
| 15 `level >= 6` ⇒ `valid_text(explanation)` | col 76 `applies` contains `ciul.level >= 6`. A NULL level makes `applies` NULL; `report_field` treats NULL as applicable (`COALESCE(applies, TRUE)`), so the expression MUST be wrapped NULL-safe (`COALESCE(ciul.level >= 6, FALSE)`). This is a NULL trap the fixture must pin |
| 2 Other (`actor_type_id = 5`) ⇒ custom name | actor line: the custom-name slot goes through `report_field(name, TRUE, TRUE)` only when type = 5. The type **name** slot uses the JD-1 fallback, never NP |
| Mode selector | `IF(ra.sex_age_disaggregation_not_apply = TRUE, aggregate, disaggregated)`, the exact form the function uses: a **NULL** flag is disaggregated (*JD-4*). Never `IF(flag, …)` negated, which would route NULL the same way only by accident |
| 3, 4 disaggregated ⇒ 4 counts not null and sum > 0 | each count slot is `report_field` mandatory; the Total slot shows `Not provided` when the sum is not > 0 |
| 5 aggregate ⇒ `actors_count > 0` | Total slot: `Not provided` unless `actors_count > 0` |
| Branch selector | `IF(rit.is_organization_known = TRUE, known, not-known)`: a **NULL** flag is the not-known branch (*JD-4*) |
| 6 known ⇒ `institution_id` | known line: `Not provided` **only** when `institution_id IS NULL`. A set id with a missing or NULL catalog row renders the JD-1 fallback `Unknown (id n)`. *(Corrected by JD-1; the first draft also marked a NULL name, a condition the function does not have)* |
| 7 not known ⇒ type | type slot `Not provided` only when `institution_type_id IS NULL`; the type name uses the JD-1 fallback |
| 8 active root type with children ⇒ sub-type | sub-type slot shown as `Not provided` when the green check's `EXISTS` predicate is true and the sub-type is NULL. The predicate is copied verbatim (parent alias `is_active`, child alias unfiltered) |
| 8b sub-type parent must equal type | sub-type slot `Not provided` when the pairing `NOT EXISTS` |
| 9 count > 0 | `Number of organizations` slot |
| 10 `number <> 0` (negatives valid) | Number slot through the `report_oicr` formatter, guarded `IF(n IS NOT NULL AND n <> 0, fmt(n), NULL)` |
| 11 `valid_text(unit)` | Unit slot mandatory |
| 16 an active role-5 link to an active indicator-2 target | col 80 mandatory. Cols 81–83 `applies` = "the lateral found a row" |

Lines are built with `CONCAT_WS`. Every slot passes through `report_field(…, TRUE|FALSE, TRUE)` so a NULL cannot erase the whole line: `CONCAT` returns NULL if any argument is NULL, which would silently drop a whole line (a defect class the fixture pins).

### 3.4 Line formats (from R-IUX-003…005)

- Actor: `• {clarisa_actor_types.name}[: {custom name}] — Women (youth): a; Women (non-youth): b; Men (youth): c; Men (non-youth): d; Total: t` · aggregate mode: `• {type}[: {custom}] — Total: n (sex and age disaggregation not applicable)`. Total follows `deriveActorTotal` (service.ts:869-890): aggregate → `actors_count`; disaggregated → `null` when all four are NULL (rendered `Not provided` by rules 3–4), else the sum with NULL as 0 (*JD-8*).
- Organization: known `• {acronym} - {name}` (name alone without an acronym) · not known `• {type}[ > {sub-type}][ ({custom name})] — Number of organizations: n`.
- Quantification: `• Number: {n}, Unit: {u}, Comment: {d}`, with comment `report_field(d, FALSE, TRUE)`.

### 3.5 Indexes

None added. Every lateral filters on an existing single-column `result_id` index (P-6) and then filters role and `is_active` on the few rows of one result. A composite `(result_id, role, is_active)` index is **rejected** (DD-4).

---

## 4. API surface

No change. `GET /api/reports/resultCenter/xlsx` keeps its params, guards (`RolesGuard` with no `@Roles`, JWT middleware), Swagger and file name. The response file gains 9 columns.

---

## 5. Workflows — layout migration

1. `INSERT` one `report_workbook_column_group` row: `('star_results_metadata','raw_data', <next sort_order>, 75, 83, 'INNOVATION USE', <new ARGB>, 1)`. Nothing is shifted, because the group goes after the last one.
2. `INSERT` 9 `report_data_dictionary` rows with `sort_order = COALESCE(MAX(sort_order), 0) + k` over `WHERE workbook_key = 'star_results_metadata'`, computed **in SQL at apply time**. The migration then does not depend on a count Dev may have drifted from (P-11), and does not insert NULL into the `NOT NULL` column on an empty table (*S-1*). The group row's `sort_order` is computed the same way. Section `Innovation Use` sits on the first row only (the seed convention), and each row has an explanation and `section_fill_argb`.
3. Colour: one new ARGB, distinct from the 10 in use (`sheet-presentation.ts:26-62`). The value is picked at T-03 and shown to the user at the visual HITL check.
4. `down()`: delete exactly the rows inserted, keyed by workbook, label/section and field labels.

---

## 6. Frontend impact

None. The STAR client calls `reports/resultCenter/xlsx` (`client/…/api.service.ts:386`) and stores the blob, and nothing in the client parses columns.

## 7. Integration impact

None. The view reads CLARISA catalog tables already synced (`clarisa_innovation_use_levels`, `clarisa_actor_types`, `clarisa_institution_types`, `clarisa_institutions`, `clarisa_innovation_readiness_levels`, `clarisa_geo_scope`).

## 8. Security & authorization

Unchanged access: any authenticated user can export. The new cells expose Innovation Use data the same users can already open through `GET /result-innovation-use/:code`. No PII is added; actor counts are aggregates.

## 9. Observability

No new log lines. A failure in Phase 2 surfaces through the existing `GlobalExceptions` → 500 path, which is exactly what a missing view would produce (§11).

## 10. Testing strategy

| Gate | What it proves | What it CANNOT reach (KZ-017) |
| --- | --- | --- |
| Migration specs (SQL text) | No `?` and no `:word` outside quoted strings (the `named-placeholders` pattern, `src/CLAUDE.md:206`) (*S-6*); forbidden top-level constructs absent; `down()` exact | Whether the SQL runs or returns the right values |
| **Fixture suite on scratch MySQL** | Per-rule parity with `innovation_use_validation()` (one fixture per rule 2, 3, 4, 5, 6, 7, 8, 8b, 9, 10, 11, 14, 15, 16 + one fully valid + one other-indicator + the 2-links case + the NULL cases of JD-1/JD-4/JD-5), `COUNT(*)` = 1 per `result_id`, NULL-safety of rule 15, a negative number valid | Dev/Prod catalog data; the actual Prod MySQL version |
| **`EXPLAIN FORMAT=TREE` assertion** inside the fixture suite, on the **real** Phase 2 SQL text: captured from `StarResultsExportRepository`'s `queryRunner.query` call, the same capture pattern `star-results-export.repository.spec.ts` already uses (*JD-2*) | **Positive** matches (JD-2): four `Materialize (invalidate on row from root)` nodes, each correlated on `<child>.result_id = root.result_id` (the inner access path is cost-based and not asserted — amended 2026-10-05, NFR-IUX-001); the view's root `results` reached by `PRIMARY` lookup from `gi`; and **no** `Materialize` / `Hash` whose input is a scan of `results` other than the existing `report_general_information` nodes, which are enumerated in the fixture as the baseline. Mere absence of an alias does not count | Cost-based choices under Prod data volume. Merged-or-not is structural; access paths are cost-based, so the check runs on seeded rows (≥ 200 results, mixed indicators), not empty tables |
| Layout migration round trip (*S-3*, requirements D5) | `up → down → up` on scratch **with representative layout rows seeded first** (the scratch tables are empty, B-3), asserting `down()` removes exactly the 10 inserted rows and leaves the seeded ones byte-identical | Dev's actual rows (P-11) |
| Timing run (*S-3*, NFR-IUX-001) | Phase 2 duration, 3 repetitions before and 3 after, on the same seeded set | Prod volume. It is a reading, not the gate (D3). The ≤ 20% target was dropped on 2026-10-05 (NFR-IUX-001 amendment); real-volume timing is a human check on Dev at T-05 |
| Repository + handler unit specs | JOIN string present, 83 columns, keys equal aliases, fallback 75–83, banner span 83, notice text (**T-06: 80 columns, 6 select items, fallback 75–80, banner 80**) | Real SQL (KZ-001: SQL is asserted in the fixture, not on the mocked call sequence) |
| `.xlsx` read-back unit test (ExcelJS) | Header row and group band cells at 75–83 in the generated buffer (**T-06: 75–80, §3.2a order**) | Visual rendering (colour, wrap) → human check |
| `npm run build` | TS wiring compiles | Spec files (excluded by `tsconfig.build.json`) |

**Drift (S-4, accepted risk R3):** no CI job runs `test:fixtures`, so this gate protects the spec at execute time only. The view migration's header names the parity fixture as mandatory for any future migration that redefines `innovation_use_validation`, `valid_text` or `report_field` (ADR-11 blind spot ii).

The parity fixture computes the expected per-cell result **from the function**, not from the view. That way the gate can fail when the two disagree: mutating any transcribed rule in the view, or the function, turns it red (K-004).

## 11. Rollout

- **Order:** both migrations must be applied on the target **before** the TS change is live, because Phase 2 joins the view unconditionally. On Dev the pipeline runs `migration:execute` during deploy (root `CLAUDE.md` §4.3, Jenkins #72), and migrations and code ship in the same deploy. That works only if migrations run **before** the new code serves traffic. **UNVERIFIED for Prod** (P-4, P-12), so a human checks it before the `main` merge.
- **Cosmetic window (JD-6, accepted):** `ReportLayoutRepository` reads groups and dictionary rows for every export (`report-layout.repository.ts:35-62`). Between the layout migration and the new code, the old code paints the INNOVATION USE band and 9 dictionary rows over columns that do not exist. Nothing errors and no data is wrong; the window lasts one deploy. Both migrations ship in the same release as the code, with the view migration ordered first.
- **Feature flag:** none. The change is additive and reverts cleanly.
- **Backout:** revert the code first (Phase 2 stops joining), then revert **these two migrations by name**, not with a blind `migration:revert ×2` (*S-9*: another migration landing in between would be reverted instead). Check `migration:show` first. The reverse order would 500 every export between the two steps; the JD-6 cosmetic window applies again.
- **Comms:** MEL / product owner (OQ-1 labels), and the notice text tells users Innovation Use is now included.

---

## 12. Design decisions log

| # | Date | Decision | Rationale | Rejected alternatives |
| --- | --- | --- | --- | --- |
| DD-1 | 2026-10-05 | Collections via `LEFT JOIN LATERAL`, no top-level aggregation | P-5: the only measured shape that keeps the view merged **and** reads children by index for the requested results | (a) Alliance pattern, derived + `GROUP BY`: aggregates the entire role-filtered child table every export (P-5). (b) Scalar subqueries in the SELECT list: the whole view materializes and joins by hash (P-5). (c) Calling `innovation_use_validation()` per row: 5 extra queries per row, and it still would not say which field is missing |
| DD-2 | 2026-10-05 | Transcribe the rules into the view instead of calling the function. Parity is guarded by a fixture | ADR-11 keeps completeness in SQL; transcribing is the only way to say *which* cell fails (HITL ruling 2). Drift risk is covered by NFR-IUX-002 | Adding a new shared stored function per rule, which would change the green-check routine set (ADR-11 checklist) for no user benefit |
| DD-3 | 2026-10-05 | Append the column group after OICR, with no shifting; dictionary `sort_order` computed in SQL | No existing column moves (R-IUX-007). Robust to a hand-patched Dev (P-11) | Placing the group next to "Link to Innovation Use" (col 30 area): it would shift 44 columns (31–74) and the 5 groups behind it (*S-7*), the blast radius of `1780690000000` |
| DD-4 | 2026-10-05 | No new index | Per-result child sets are small. The FK index on `result_id` already bounds each lateral to one result's rows. A composite index adds write cost on four shared child tables (`result_actors`, `result_institution_types`, `result_quantifications`, `link_results`) used by other indicators (*S-7*) | Composite `(result_id, role_id, is_active)`: revisit only if the T-02 EXPLAIN/timing shows otherwise. **Revisited 2026-10-05:** T-02 measured a role-index or `PRIMARY` access in two laterals and +68% on 210 seeded results. The user kept DD-4 (no new index) and amended NFR-IUX-001 to the structural gate instead; real-volume timing is a human check on Dev at T-05 |
| DD-5 | 2026-10-05 | Prefix every key with `innovation_use_` | The Phase 2 SELECT is flat; generic aliases (`description`, `geo_scope`) already exist | Unprefixed keys |
| DD-6 | 2026-10-05 | Linked dev follows **rule 16** (active indicator-2 target), not `findOne` (which returns any active link) | HITL ruling 2: cells follow the green check. The difference only shows when a linked dev is soft-deleted after linking, which is exactly when users need to see `Not provided` | Mirroring `findOne` |
| DD-7 | 2026-10-06 | Export 6 of the view's 9 columns (75–80, linked dev right after the justification). Keep the view unchanged, and apply the layout change through a **new** migration | QA feedback (user-approved): the readiness, description and geo-scope cells are not needed today. The view and layout migrations are already applied on the shared database, so editing them is not possible (ADR-5). Keeping the 3 cells in the view lets them return later with a TS + layout change only | (a) Drop the 3 columns from the view: a second view migration, and the cells would have to be rebuilt if requested again. (b) Edit migrations `1791300000000`/`1791400000000` in place: forbidden once applied on a shared DB |
| DD-8 | 2026-10-06 | *Linked innovation development* links to the target's STAR General Information page. The view exposes the target's code (new view migration), and Phase 2 builds the URL from `ARI_CLIENT_HOST` | User request. Same URL shape and same host source as the existing *Link to platform* column, so the environment-specific host stays out of the database | (a) Build the URL in the view: it would hardcode the host per environment in a DB object. (b) Parse the code out of the display text in TS: fragile, because the title may contain ` - ` |

**Reversion challenge (Step 2.3):** no DD removes delivered behavior. The notice edit (R-IUX-008) removes a sentence whose claim becomes false, and the Innovation Development half stays. No challenge was run.

---

## 13. Premise Ledger

**Count:** 20 rows: 14 verified, 6 `UNVERIFIED` (High: 2 — P-4, P-12; Low: 4 — P-11, P-16, P-19, P-20). One verified row (P-13) is a **refuted** premise that a task must work around. *(Rows P-18…P-20 added after judgment round 1, S-5.)*
**Blast-radius triggers:** `live-path` fires (the design names the Export action) → P-1. `consumer` fires (exported TS symbols, the Phase 2 SQL text and the `.xlsx` shape change) → P-14, P-15. `shared-state` fires (`report_workbook_column_group` and `report_data_dictionary` are read for all sections; `report_field`/`valid_text` are shared, called, not changed) → P-17.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | The Export button reaches `StarResultsExportRepository.findStarResultsMetadataRows` Phase 2: `api.service.ts:386` `getBlob('reports/resultCenter/xlsx')` → `reports.controller.ts:110` (no `@Version`, route `main.routes.ts:420-421`) → `reports-generation.service.ts:16-25` → registry (one handler, key `star_results_metadata`, controller:188) → `…workbook.handler.ts:75-76` | live-path | as cited | f9d57147 | The view would not be on the user's path. High | — |
| P-2 | Raw data columns are hardcoded TS; the DB holds only sheets, groups and dictionary | location | `…workbook.handler.ts:85-119`; `report-layout.repository.ts:23-62` | f9d57147 | T-04 scope changes. High | — |
| P-3 | Phase 2 LEFT JOINs each `report_*` view on `gi.result_id` under `WHERE gi.result_id IN (…)` | location | `star-results-export.repository.ts:68-178` | f9d57147 | The EXPLAIN gate would target the wrong query shape. High | — |
| P-4 | **Prod MySQL supports `LATERAL` (≥ 8.0.14)** | data-env | `UNVERIFIED — confirm at source before relying on it` (Dev is 8.0.45, `baseline.sql` header `-- Server version 8.0.45-0ubuntu0.22.04.1`; Prod not reachable from here) | — | DD-1 fails on Prod and the migration errors. High | `SELECT VERSION();` on Prod, by a human, before the `main` merge — owner **T-05** |
| P-5 | On MySQL 8.0.46 under the Phase 2 join: SELECT-list scalar subqueries → `Table scan on v … Materialize` + hash join; derived+`GROUP BY` → `Table scan on ac`, `Materialize`, `Index lookup on ra using FK_561dd… (actor_role_id=2)` (whole role); `LATERAL` → `Invalidate materialized tables (row from root)`, `Index lookup on ra using FK_ddf51… (result_id=root.result_id)`; a prototype with PK joins and a `LIMIT 1` lateral → `riu`/`ciul`/`r2` single-row lookups, `lr` by `result_id`, no view-level materialization | other | `EXPLAIN FORMAT=TREE SELECT gi.result_id, v.… FROM report_general_information gi LEFT JOIN <view> v ON v.result_id = gi.result_id WHERE gi.result_id IN (11,22,33)` with `SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'`, scratch `ari_scratch_test`, **empty tables**; views `zz_a_derived`, `zz_b_scalar`, `zz_c_lateral`, `zz_d_proto` (dropped after) | f9d57147 (code); scratch schema at 364 migrations, **not HEAD** (P-13) | DD-1 is wrong. High. Empty tables cannot show cost-based access paths, so T-02 re-runs the gate on seeded rows at HEAD. Both judges corroborated the lateral shape with their own inline EXPLAIN; view merging itself was not re-run because the test views were dropped (A-10) |
| P-6 | Each child table has a single-column `result_id` index: `result_actors` `FK_ddf5180b…`, `result_institution_types` `FK_b13f998d…`, `result_quantifications` `FK_8aa7d912…`, `link_results` `FK_037db466…`; `result_innovation_use` PK = `result_id` | data-env | `awk` over `CREATE TABLE` blocks in `src/db/baseline/baseline.sql`; `result_innovation_use` entity `…/result-innovation-use.entity.ts:30-69` (table post-dates the baseline) | f9d57147 | DD-4 reverses (an index is needed). High | — |
| P-7 | The business fields of `findOne` are the ones listed in R-IUX-002…006 (no response DTO; inline object) | location | `result-innovation-use.service.ts:553-674`, `readInnovationDevCardFacts` `:741-779`, `deriveActorTotal` `:869-890` | f9d57147 | Columns are missing or extra. High | — |
| P-8 | The latest green check is `1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation.ts` (rules 2–11 incl. 8b, 14, 15, 16), and no later migration redefines it | location | `grep -l -i "innovation_use_validation" src/db/migrations/*.ts` → 6 files; of those, `CREATE FUNCTION` appears in `1787078283929`, `1787280000000`, `1789100000000` (latest), so no later redefinition exists; body `up()` `:88-270`. *(A first, narrower pattern, `FUNCTION \`\?innovation_use_validation`, found only 1 file and was discarded as narrower than the claim)* | f9d57147 | The transcription targets a stale rule set. High | — |
| P-9 | `report_field` returns NA / NP / NM as R-IUX defines, and treats `applies` NULL as TRUE | other | `1779920000000-ExpandReportFieldMediumtext.ts:30-48` (`IF NOT COALESCE(applies, TRUE)`) | f9d57147 | Rule-15 NULL handling (§3.3) changes. Low | — |
| P-10 | No `report_*` view calls a `*_validation()` function, and `report_innovation_use` does not exist | existence | `grep -l "VIEW report_" src/db/migrations/*.ts \| xargs grep -c "_validation("` → 12 files, 0 each; `grep -rn report_innovation_use src` → 0. Widened after S-8: `baseline.sql` defines 11 `report_*` views, none calls `_validation(` (judge A); `report_innovation_dev` exists only there (§2.2) | f9d57147 | Precedent or a name collision to handle. Low | — |
| P-11 | On Dev the last raw-data group is OICR DETAILS ending at column 74 | data-env | `UNVERIFIED — confirm at source before relying on it`. Derived by walking `1779910000000` (59–71) → `1780690000000` (+1) → `1780695000000` (to 73) → `1781215000000` (+1) = 61–74, equal to the fallback `sheet-presentation.ts:58-62`. Dev drift has precedent (alliance SDG join) | — | The band is misaligned (visual only). Low | Read-only `SELECT … FROM report_workbook_column_group` on Dev as the first step of **T-03** |
| P-12 | **Prod deploy applies migrations before the new code serves** | data-env | `UNVERIFIED — confirm at source before relying on it` (root `CLAUDE.md` §4.3: Dev runs `migration:execute` on deploy; Prod "not re-measured") | — | Every export 500s on Prod between deploy and migration. High | Human check of the Prod pipeline before the `main` merge — owner **T-05** |
| P-13 | **REFUTED:** the scratch harness reaches the latest schema. `npm run migration:test:bootstrap` stops at `CreatePiDelegates1787600000000` with errno 3780 (`pi_delegates.project_id` `utf8mb4_0900_ai_ci` vs `agresso_contracts.agreement_id` `utf8mb3_general_ci`). Scratch holds 364 migrations, the last `UpdateInnovationUseValidation1787280000000`, so **rule 16 is absent there** | existence | as run 2026-10-05; `information_schema.COLUMNS` query on both columns | f9d57147 | The parity fixture cannot test rule 16 or the role-5 link. High | **T-01** first step: bring scratch to HEAD with a scratch-only workaround, recorded in `execution.md`, never a migration edit |
| P-14 | Readers of the changed TS symbols: `STAR_RESULTS_METADATA_RAW_COLUMNS`, `STAR_RAW_COLUMN_GROUP_FALLBACK`, `STAR_RAW_SHEET_PREAMBLE_BASE`, `STAR_RAW_COMING_SOON_NOTICE` → only `columns.ts`/`sheet-presentation.ts`/`banner-subtitle.ts` and `…workbook.handler.ts`; `findStarResultsMetadataRows` → `result.repository.ts`, `filters-report.dto.ts`, `star-results-export.repository(.spec).ts`, `…workbook.handler(.spec).ts`. Pins: `…handler.spec.ts:142-143` (notice text), `:165` (74 columns), `star-results-export.repository.spec.ts:99-122` (JOIN strings) | consumer | `grep -rln --exclude-dir={node_modules,dist,.angular,coverage} "<symbol>" server client`, one per symbol | f9d57147 | Missed failing specs. Low | — |
| P-15 | The `.xlsx` contract has one consumer outside the server: the client stores the blob without parsing (`api.service.ts:386`, `api.service.spec.ts`). `coming soon` in `star-report-viewer.component.spec.ts:108-112` is an unrelated PDF message | consumer | `grep -rln "resultCenter/xlsx"` and `grep -rln "coming soon"` over `server client` | f9d57147 | A client change is needed. Low | — |
| P-16 | The dictionary rows are rendered in `sort_order` and the new section lands last | data-env | `UNVERIFIED — confirm at source before relying on it` (`report-layout.repository.ts:35-47` orders by `sort_order`; Dev's current max is unknown, the scratch tables are empty) | — | The dictionary order is wrong. Low | Computed `MAX+k` in SQL (§5), checked on Dev by the same **T-03** read-only query |
| P-17 | Sharing: `report_workbook_column_group` and `report_data_dictionary` are read for **every** section by `report-layout.repository.ts:35-62` (one reader); the 10 existing group rows and their columns are untouched because nothing shifts (§5). `report_field`/`valid_text` are called and not redefined, so every other view is unaffected | shared-state | as cited; fallback list `sheet-presentation.ts:26-62` (10 groups) | f9d57147 | Another section's layout moves. High | — |
| P-18 | Phase 2 sets `group_concat_max_len = 4 MiB` itself before its query (`SET LOCAL`, i.e. session scope), so a lateral's `GROUP_CONCAT` is not truncated at the 1024-byte default. The fixture must set it too, because it runs outside the repository | data-env | `star-results-export.repository.ts:45-52`, `:192-196` | f9d57147 | Long cells are truncated silently in fixtures. Low | — |
| P-19 | Phase 2 plus this view stays below MySQL's 61-table join limit | data-env | `UNVERIFIED — confirm at source before relying on it` (judge A counted 32 plan rows for current Phase 2 on scratch; the view adds `root`, `riu`, `ciul` and 4 lateral derived tables) | — | Phase 2 errors and the view must split. Low | The T-02 EXPLAIN on the real Phase 2 SQL (it fails loudly if the limit is hit) — owner **T-02** |
| P-20 | `CONCAT_WS` and `report_field` over mixed collations (`utf8mb3_general_ci` catalogs, `utf8mb4_unicode_520_ci`/`_ci` result columns) raise no illegal-mix error | data-env | `UNVERIFIED — confirm at source before relying on it` (probed by both judges without error; not run by the architect) | — | The view fails to create or to select. Low | The T-01 migration executed on scratch, plus a T-02 fixture selecting every column — owner **T-01** |

---

## 14. Open questions & follow-ups

- **OQ-1** (from requirements): confirm labels and line formats. Settled by the product owner at the T-05 HITL.
- **FU-1 (not in scope):** `report_alliance_alignment` and the other views use the full-aggregation pattern P-5 measured. Converting them to LATERAL would speed up every export. Separate spec.
- **FU-2:** pre-existing harness defect P-13, which should get its own fix (refresh the baseline or pin the collation) instead of a per-spec workaround.

## 15. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
| --- | --- |
| Tasks | **5** |
| LOC | **~1,450** (view migration ~260 · migration specs ~220 · fixture suite ~550 · layout migration ~110 · TS wiring + specs ~310) |
| Review rounds | **~11** (4 tasks × 2 + T-02 at 3, since fixture density historically runs over) *(corrected by JD-9; first draft said ~10)* |

Depth check: 5 tasks / ~1.4k LOC fits **Standard**. No change.

## 16. References

ADR-11 (`docs/trd/trd.md` §2.4) · family `docs/specs/innovation-use/family.md` row 7 · archived children 1, 4, 5 · `docs/specs/archive/2026-09-*-innovation-use--*` · AC-1681
