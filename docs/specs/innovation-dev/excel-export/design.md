# Design — Innovation Development / Excel export section

- **Module:** reports (reads `result-innovation-dev` data)
- **Spec id:** 2026-10-innovation-dev-excel-export
- **Status:** in-review
- **Owner:** ARI server squad
- **Linked requirements:** ./requirements.md
- **Linked detailed design:** ../../../trd/trd.md (ADR-11: completeness lives in MySQL stored routines)
- **Precedent:** `docs/specs/archive/2026-10-06-innovation-use--excel-export/design.md` (the view shape and rule transcription are reused; the join strategy is not — DD-1)
- **Last updated:** 2026-10-06 (amended at T-02's gate)

## Document Control

| Field | Value |
| --- | --- |
| Depth | Standard — re-checked in §15 |
| Approval Mode | gated |
| Verified at | `13310040` (branch `AC-1681-Include-the-Innovation-use-data-in-the-excel-export`) |
| Exploration | One read-only scout (Innovation Dev GET contract, report views, latest migrations) + architect-run `EXPLAIN` probes on scratch MySQL `research_indicators_server_test_mysql` (8.0.46, **at HEAD**: 392 migrations, last `1791600000000`) |
| Requirements gate | Passed 2026-10-06 ("Continue"). **OQ-1 and OQ-2 were not answered**; the proposals in `requirements.md` stand and are re-asked at this gate |
| Judgment Day | Round 1 ([`judgment.md`](judgment.md)): 3 confirmed severe-class findings (C-1…C-3), 2 confirmed warnings, 5 single-judge items. User chose **Fix only** (no re-judgment). C-1…C-5 and S-2…S-5 applied 2026-10-06. S-1 (view-name ownership on Dev) left to HITL ruling 2, with a rollout rule (§11) |
| Amendments | 2026-10-06 at T-02's gate, user-approved (Pivot Record in `execution.md`): blank catalog names → `Unknown (id n)` (§3.1); NFR-IDX-001 (b) EXPLAIN wording (§10); layout moved to server code — no group row, band and banner derived from a new section tag (§2, §2.1, §5, §11, P-7, P-10) |
| Kaizen lessons applied | KZ-innovation-use--excel-export-1 (structural perf gate, timing is a reading) → NFR-IDX-001, §10 · KZ-innovation-use--excel-export-2 (OQ asked before build) → OQ-1 due at the gates · KZ-001 (assert in generated SQL/output) → §10 · KZ-017 (name what a check cannot reach) → §10 · K-015 (deploy ≠ migrate) → §11 |

---

## Executive Summary

- **A new view, `report_innovation_dev`**, in the `report_innovation_use` shape: root `results` (live rows), 1:1 data and 6 catalogs by plain `LEFT JOIN`, and each collection (actors, organizations, tool functions, linked tools) through a `LEFT JOIN LATERAL` that aggregates only the current result's rows.
- **It is NOT joined into Phase 2.** Phase 2 already references **60 tables** in its top-level join (P-3), and MySQL's cap is 61. Past the cap MySQL raises no error: it silently **stops merging** a view and materializes it whole (P-4). That is the D3 defect, landing on someone else's view. The view is read by a **Phase 3** query on the same connection, `SELECT … FROM report_innovation_dev WHERE result_id IN (…)`. Its rows are merged into the Phase 2 rows by `result_id` in TypeScript (DD-1).
- **Green-check rules are transcribed into cell expressions** from `innovation_dev_validation` (`1758125999162`). Parity is enforced by a fixture suite on real MySQL (NFR-IDX-002).
- **Layout:** one appended band (81–112), derived in server code from a new `INNOVATION_DEVELOPMENT` section that tags the 32 columns (`docs/specs/reports/excel-layout-server-side`); no group row is written. The 27 existing `Innovation details` dictionary rows are updated in place (label, explanation, section, order), and 5 rows are inserted. `down()` restores the seed values exactly. The TS side adds the section, 32 tagged column specs (band and banner span 112 are derived), and drops the notice row. *(Amended 2026-10-06 at T-02's gate, user-approved — Pivot Record in `execution.md`.)*

---

## 1. Goals & non-goals

**Goals**
1. Expose every business field of `GET /api/results/innovation-dev/:resultCode` as 32 Excel cells (R-IDX-001…005).
2. Encode the green check's rules per cell or line slot (NFR-IDX-002).
3. Keep the export's cost proportional to the requested results, without degrading any existing view (NFR-IDX-001, DD-1).
4. Make the layout and dictionary consistent and remove the notice (R-IDX-006, R-IDX-007).

**Non-goals**
- Reducing Phase 2's table count, or converting existing views to `LATERAL` (follow-up FU-1, §14).
- Removing the June Dev-only work (`5b426acf`) or reconciling Dev's layout with it (HITL ruling 2; requirements D9).
- Changing `innovation_dev_validation`, `report_field` or `valid_text`.
- Fixing `findOne`'s unguarded `short_title` read (`result-innovation-dev.service.ts:480`).
- Any client change.

> **Cross-check (KZ-016).** Read back against every `AND IT MUST` / `BUT it must NOT`: one row per result (§3.1), no snapshots (§3.1), level not id (§3.3), stale values hidden behind `NA` (§3.3), optional cells never `NP` (§3.3), the green check's exact "has children" predicate (§3.3), no `*_validation()` and no top-level aggregate (§3.1), no existing column moved (§5), no `Innovation details` row left behind (§5). Module rule: migrations with no params contain no `?` (`src/CLAUDE.md` §7).

---

## 2. Architecture

```
STAR "Export" ─► GET /api/reports/resultCenter/xlsx
   └► StarResultsMetadataWorkbookHandler
        ├► ReportLayoutRepository           (dictionary only)            ◄── dictionary migration
        └► StarResultsExportRepository.findStarResultsMetadataRows
             Phase 1: findResultsV2 → ordered ids
             one pinned connection, one transaction, group_concat_max_len = 4 MiB
               Phase 2: report_general_information gi + 11 views   (unchanged join; + gi.result_id key)
               Phase 3: SELECT … FROM report_innovation_dev WHERE result_id IN (…)   ◄── NEW
             merge Phase 3 into Phase 2 rows by result_id (Map lookup)               ◄── NEW
```

### 2.1 Composition

| Path | Responsibility |
| --- | --- |
| `src/db/migrations/<ts>-CreateReportInnovationDevView.ts` | `CREATE OR REPLACE VIEW report_innovation_dev` (§3). `down()`: `DROP VIEW IF EXISTS report_innovation_dev` (DD-6) |
| `src/db/migrations/<ts+1>-StarRawInnovationDevDictionary.ts` | `UPDATE` the 27 seed rows; `INSERT` 5 rows (§5). No group row — the band is derived in code. `down()` exact |
| `src/db/migration-specs/<ts>…spec.ts`, `<ts+1>…spec.ts` | SQL-text specs |
| `test/fixtures/innovation-dev/report-innovation-dev-view.fixture-spec.ts` | Parity, one-row and `EXPLAIN` gate on scratch MySQL |
| `test/fixtures/innovation-dev/star-raw-innovation-dev-dictionary.fixture-spec.ts` | Dictionary round trip on a realistic pre-state (§10) |
| `…/reports/repositories/star-results-export.repository.ts` | `gi.result_id` key in Phase 2; Phase 3 query in the same transaction; merge; view list comment |
| `…/star-results-metadata/star-results-metadata.innovation-dev.columns.ts` (new) | 32 `StarRawSectionColumn` tagged `section: 'INNOVATION_DEVELOPMENT'`, spread into `STAR_RESULTS_METADATA_RAW_COLUMNS` (80 → 112). Kept in its own file because `columns.ts` is already 309 lines |
| `…/star-results-metadata.sections.ts` | +1 section `INNOVATION_DEVELOPMENT` (`INNOVATION DEVELOPMENT`, `FF00897B`). The band 81–112 and the banner end 112 are derived by `deriveColumnGroups`; no fallback or banner literal exists any more (excel-layout spec) |
| `…/star-results-metadata.banner-subtitle.ts` + handler | Notice removed (R-IDX-007) |
| sibling `*.spec.ts` of the files above + handler spec | Updated pins |

### 2.2 Reuse

`report_field()` / `valid_text()` (`1779920000000-ExpandReportFieldMediumtext.ts`); the lateral pattern, NULL-safe mode selectors and `Unknown (id n)` fallback of `report_innovation_use` (`1791600000000-AddLinkedDevCodeToReportInnovationUseView.ts`, laterals at `:105`, `:180`, `:269`, `:302`); the layout-migration `MAX(sort_order) + k` pattern (`1791400000000-StarRawInnovationUseColumnGroup.ts:114`, `:165`); the fixture harness (`test/jest-fixtures.json`). No new service, module or endpoint.

---

## 3. Data model — the view

### 3.1 Shape

| Rule | Why |
| --- | --- |
| Root `results root WHERE root.is_active = TRUE AND root.is_snapshot = FALSE` | Live-row contract of every `report_*` view (R-IDX-001) |
| `rid` = `result_innovation_dev ON rid.result_id = root.result_id AND rid.is_active = TRUE` | `findOne` reads the active row (`service.ts:456-459`). An inactive row behaves as no row (R-IDX-001 "No detail row"). The green check does not test `rid.is_active` — P-11 |
| Catalogs by `LEFT JOIN` on keys: `cic` (`id = rid.innovation_nature_id`), `cit` (**`code`** `= rid.innovation_type_id`), `cirl` (`id = rid.innovation_readiness_id`), `idau`, `dq`, `ep` | Single-row lookups (P-9) |
| 4 `LEFT JOIN LATERAL (…) ON TRUE`, inner `WHERE root.indicator_id = 2 AND child.result_id = root.result_id AND <role> AND is_active = TRUE`, aggregate `GROUP_CONCAT(… ORDER BY <child pk> SEPARATOR '\n')`, no inner `GROUP BY` | One row per lateral, so the view cannot multiply rows (R-IDX-001). The lateral also returns the counters the rules need (§3.3) |
| **No** top-level `GROUP BY`, aggregate, `DISTINCT`, `HAVING`, `ORDER BY`, `LIMIT`, `UNION` or SELECT-list subquery | Keeps the view mergeable within Phase 3 (NFR-IDX-001). The baseline definition's top-level `ORDER BY` (`baseline.sql:8026`) is exactly what this forbids |
| Every cell is `report_field(value, mandatory, applies)`; **every** `applies` is the full expression of §3.2's *applies* column, wrapped `COALESCE(…, FALSE)` as a whole — never only its `U`/`L7`/`T` parts (JD C-2) | `report_field` treats a NULL `applies` as TRUE (P-19). A NULL variety, knowledge-sharing, expansion-potential or level must yield `NA`, not `NP`/`NM` or a stale value |
| Yes/No cells (84, 89, 94, 99) use `CASE WHEN b IS NULL THEN NULL WHEN b = TRUE THEN 'Yes' ELSE 'No' END` (JD S-2) | `IF(b,'Yes','No')` turns NULL into `No`, hiding the `NP` of 94/99 (the check fails on NULL) and the `NM` of 84/89 |
| Role and indicator ids interpolated from `ActorRolesEnum.INNOVATION_DEV`, `InstitutionTypeRoleEnum.INNOVATION_DEV`, `LinkResultRolesEnum.INNOVATION_DEV`, `IndicatorsEnum.INNOVATION_DEV`; catalog discriminators (`OTHER` actor 5, `OTHER` institution 78, anticipated users 2, dissemination 2, expansion 2) from their enums | One source of truth (K-005) |
| `Not provided` only where the green check fails; a catalog name behind an accepted id is `COALESCE(NULLIF(name, ''), CONCAT('Unknown (id ', id, ')'))` — a blank name falls back like a missing one *(Amended 2026-10-06 at T-02's gate, user-approved — Pivot Record in `execution.md`.)* | NFR-IDX-002's biconditional |

### 3.2 Columns (view alias = `ExcelColumnSpec.key`, prefixed `innovation_dev_`)

`I` = `root.indicator_id = 2`. Every *applies* cell below is passed to `report_field` as `COALESCE(<expression>, FALSE)` — the whole expression, as written (JD C-2).

| # | Alias suffix | mandatory | applies |
| --- | --- | --- | --- |
| 81 | `short_title` | TRUE | `I` |
| 82 | `nature` | TRUE (id) | `I` |
| 83 | `type` | TRUE (id) | `I` |
| 84 | `is_new_variety` (Yes/No, NULL-safe) | FALSE | `I` |
| 85 | `varieties_count` (value only when `> 0`) | TRUE | `I AND rid.is_new_or_improved_variety = TRUE` |
| 86 | `readiness_level` `Level {level}: {name}` | TRUE (id) | `I` |
| 87 | `readiness_explanation` | TRUE | `I` |
| 88 | `anticipated_users` | TRUE (id) | `I` |
| 89 | `no_sex_age_disaggregation` (Yes/No, NULL-safe) | FALSE | `I` |
| 90 | `actors` | TRUE (list non-empty) | `U` = `I AND rid.anticipated_users_id = 2` |
| 91 | `organizations` | TRUE (list non-empty) | `U` |
| 92 | `beneficiaries` | TRUE | `U` |
| 93 | `expected_outcome` | TRUE | `U` |
| 94 | `knowledge_sharing` (Yes/No, NULL-safe) | TRUE | `L7` = `I AND cirl.level >= 7` |
| 95 | `dissemination` | TRUE (id) | `L7 AND rid.is_knowledge_sharing = TRUE` |
| 96 | `tool_useful_context` | TRUE | `T` = `L7 AND rid.is_knowledge_sharing = TRUE AND rid.dissemination_qualification_id = 2` |
| 97 | `results_achieved_expected` | TRUE | `T` |
| 98 | `tool_functions` | TRUE (list non-empty) | `T` |
| 99 | `used_beyond_context` (Yes/No, NULL-safe) | TRUE | `T` |
| 100 | `adoption_context` | `COALESCE(rid.is_used_beyond_original_context = TRUE, FALSE)` | `T AND rid.is_used_beyond_original_context IS NOT NULL` |
| 101 | `linked_tools` | FALSE | `T` |
| 102 | `other_tools` | FALSE | `T` |
| 103 | `other_tools_integration` | FALSE | `T` |
| 104–110 | `cheaper`, `simpler`, `performs_better`, `desirable`, `commercial_viability`, `enabling_environment`, `evidence_of_uptake` | FALSE | `L7` |
| 111 | `expansion_potential` | FALSE | `L7` |
| 112 | `expansion_details` | FALSE | `L7 AND rid.expansion_potential_id = 2` |

The `innovation_dev_` prefix avoids collisions in the merged row object (the Phase 2 row already holds generic keys such as `description` and `actors`-like names from other views).

### 3.2a Final labels (header = dictionary `field_label`, JD S-3)

Seed labels are normalised by replacing `\s*\n\s*` with one space and trimming (derived by running that rule over `seed-data/…seed.ts:351-515`). *New* = no seed row; label proposed under OQ-1.

| # | Label | Seed origin (seed sort) |
| --- | --- | --- |
| 81 | Short title | 58 |
| 82 | Innovation nature | 59 |
| 83 | Innovation type | 60 |
| 84 | New or improved variety or breed | *new* |
| 85 | Number of new or improved lines/varieties | *new* |
| 86 | Innovation readiness level | 61 |
| 87 | Readiness explanation | 62 (`"Readiness explanation "`) |
| 88 | Anticipated users | *new* |
| 89 | Sex and age disaggregation not applicable | *new* (OQ-2) |
| 90 | Actors | 63 |
| 91 | Organizations | 64 |
| 92 | Intended beneficiaries/users elaborated | 65 (trailing `\n`) |
| 93 | Expected outcomes | 66 (trailing space) |
| 94 | Potential for researchers/policymakers adaptation | 67 |
| 95 | Method/tool qualifies for dissemination | 68 (trailing `\n`) |
| 96 | Context for tool usefulness | 69 |
| 97 | Results detailed with examples | 70 |
| 98 | Tool function | 71 |
| 99 | Innovation used beyond original context | 72 |
| 100 | Adopted and adapted in other contexts | 73 |
| 101 | Tools often used together | 74 |
| 102 | Other tools | 75 |
| 103 | Other tools' usage with this one description | 76 |
| 104 | Formulation: Is it cheaper compared to alternatives? | 77 |
| 105 | Formulation: Is it simpler to use? | 78 |
| 106 | Formulation: Does it perform better? | 79 |
| 107 | Demand and Investment: Is the innovation desirable to intended users? | 80 |
| 108 | Demand and Investment: Is the innovation commercially viable/is there investment potential? | 81 |
| 109 | Sustained use: Is the innovation supported by a suitable enabling environment? | 82 |
| 110 | Sustained use: Is there already evidence of uptake? | 83 |
| 111 | Sustained use: Is there potential for actor in new contexts and for new purposes? | 84 |
| 112 | Expansion and adaptation details | *new* |

`Actors` and `Organizations` also head Innovation Use columns 78–79; duplicate headers across sections are intended (JD A J-10), so header checks are scoped by column range, never by label alone.

### 3.3 Rule transcription (green-check clause → cell)

| Green-check clause (`1758125999162`) | Cell / slot effect |
| --- | --- |
| `valid_text(short_title)`, `nature/type/readiness id IS NOT NULL`, `valid_text(readiness_explanation)`, `anticipated_users_id IS NOT NULL` (`commonFields`) | Cols 81, 82, 83, 86, 87, 88 mandatory. A missing `rid` row → all `NP` |
| `IF(variety = TRUE, count > 0, TRUE)` | Col 85: value passed only when `> 0`, so `0` and NULL give `NP`; `applies` only when variety is TRUE (stale count hidden) |
| `anticipatedUserId = 1 OR NULL` ⇒ the actor/org/text block is skipped | `U` gates cols 90–93 |
| `tempActors = tempFullActors AND tempActors > 0` | Col 90: lateral returns the line list; the cell value is NULL when the lateral found **0** rows, so mandatory → `NP`. Per line: type 5 ⇒ `actor_type_custom_name IS NOT NULL` (the check uses `IS NOT NULL`, **not** `valid_text`, so an empty string is accepted and shown empty); other types ⇒ `actor_type_id IS NOT NULL`, else the line reads `• Not provided` |
| Organization `CASE` (known ⇒ `institution_id`; 78 ⇒ custom name; type with any child (`parent_code = type`, no active filter) ⇒ sub-type; no type ⇒ FALSE) | Col 91 lines, each slot mirroring the branch. Branch selector `IF(rit.is_organization_known = TRUE, known, not-known)`: a **NULL** flag is not-known. The type-78 custom-name slot tests **`IS NOT NULL`**, not `valid_text` — an empty string passes the check and renders empty, never `Not provided` (JD S-4). Note there is **no** rule 8b here (sub-type parent pairing), unlike Innovation Use |
| `valid_text(expected_outcome) AND valid_text(beneficiaries)` | Cols 92, 93 |
| `IF(level >= 7, knowledgeSharing, TRUE)`; `ks IS NULL ⇒ FALSE` | `L7` gates 94–112; col 94 mandatory |
| `ks = TRUE ⇒ dq IS NOT NULL`; `dq = 2 ⇒ context, results, ≥1 active tool function, used_beyond rule` | Cols 95–100 |
| `used_beyond = TRUE ⇒ valid_text(adoption)`; `NULL ⇒ FALSE`; `FALSE ⇒ TRUE` | Col 99 mandatory (NULL → `NP`); col 100 mandatory only when TRUE, `NM` when FALSE, `NA` when NULL (col 99 already carries the `NP`) |
| Not tested by the check: 84, 89, 101–112 | All `mandatory = FALSE` |

**Actor and organization counts in the green check have no role filter** (they count every active row of the result), while `findOne` and this view filter role 1. The cells follow the GET; parity holds only under P-12.

**Known divergences from the function (JD S-5), excluded from NFR-IDX-002's biconditional and each pinned by one fixture that asserts the divergence itself:** (1) an inactive `result_innovation_dev` row (P-11) — the function may be TRUE while the cells read `NP`; (2) active actor/organization rows of role 2 on an indicator-2 result (P-12).

### 3.4 Line formats

- Actor: `• {type name}[: {custom name}]` (the custom-name part only for type 5, Other) + ` — {Women (youth), Women (non-youth), Men (youth), Men (non-youth)}` built from the **TRUE** booleans with `CONCAT_WS(', ', IF(b, label, NULL), …)`, or ` — Sex and age disaggregation not applicable` when `sex_age_disaggregation_not_apply = TRUE`; no suffix when neither applies.
- Organization: known `• {acronym} - {name}` (name alone without acronym); not known `• {type}[ > {sub-type}][ ({custom name})]`.
- Tool function: `• {tool_functions.name}` (active rows, ordered by `innovation_tool_function_id`; no role column).
- Linked tool: `• {platform_code}-{result_official_code} - {title}` per active `link_result_role_id = 2` row whose target is active, ordered by `link_result_id`; bare code when `platform_code` is NULL, no title part when the title is NULL (precedent JD-5).

Every slot goes through `report_field(…)` or `IFNULL` before `CONCAT_WS`, so one NULL cannot drop a whole line.

### 3.5 Indexes

None added (precedent DD-4 stands). Each lateral filters an existing `result_id` index.

---

## 4. API surface

No change. Same endpoint, guards and file name.

---

## 5. Workflows — dictionary migration

*(Amended 2026-10-06: the group-row insert and delete are removed. Since `docs/specs/reports/excel-layout-server-side`, the export derives every band from the columns' section tag and never reads `report_workbook_column_group`.)*

*(Rewritten after Judgment Day round 1, C-1 and C-3: the first draft matched rows by label alone and restored seed constants. Both are wrong. `Actors`/`Organizations` also label Innovation Use rows, and `1780690000000:38-39` / `1781215000000:33-37` shifted every row with `sort_order >= 26` after seeding.)*

**Identifying the 27 rows (P-16, P-17). Never by label alone.**

1. Read once, in TS, before writing: the anchor row `field_label = 'Link to Innovation Use'` (workbook `star_results_metadata`). Its `sort_order` is `A`.
2. The block is the 27 rows with `sort_order` in `A+1 … A+27`.
3. **Guard:** the anchor must be exactly 1 row, and every block row must equal, **position by position**, the seed label of that slot (byte-exact, as stored; precedent PAD SPACE note: trailing spaces do not discriminate, newlines do, so the comparison runs in TS on the fetched strings, not in SQL). Any mismatch throws before any write. TypeORM's per-migration transaction then leaves nothing applied. Rows outside the block, the Innovation Use rows included, are never selected by an `UPDATE`.
4. Every write keys on the `id`s resolved in step 2, never on a label.

**`up()`:**

1. Base `B` = `MAX(sort_order)` over the workbook, read **once** in TS before any write. This avoids MySQL error 1093 and re-evaluation (precedent used a derived `inner_base`; reading in TS is the same contract).
2. `UPDATE` each of the 27 ids:
   - label from §3.2a;
   - an explanation;
   - `sort_order = B + k`, where `k` is its column position 1…32;
   - `section = 'Innovation Development'` on the row for column 81 only, NULL on the others;
   - `section_fill_argb = 'FF00897B'` on column 81 only, NULL on the others, matching the seed's pattern of one fill per section (`1777026000000:52`).
3. `INSERT` the 5 new rows (84, 85, 88, 89, 112) at `B + k`, `section` NULL, fill NULL, `is_active = 1`.
4. Numeric values are interpolated as integers. No `?` and no `:word` (NFR-IDX-004).

**`down()`:**

1. Resolve the 32 rows the same way: the row with `section = 'Innovation Development'` is the start `S`. The block is `S … S+31`. Guard each label against §3.2a, position by position.
2. Read the anchor `A` again. **The restore target is relative, not a seed constant.** The 27 seed-origin rows return to `sort_order = A + j`, where `j` is the seed position 1…27.
3. They also get back:
   - the seed label byte-exact (newlines and trailing spaces included);
   - explanation **NULL** (the seed's `''` is stored as NULL by `1777025000000:45-60`);
   - `section` `'Innovation details'` on the first row and NULL on the rest;
   - fill `FF00897B` on the first row and NULL on the rest.
4. Delete the 5 inserted rows by id.

**Why relative positions:** rows `A+1 … A+27` were the block before `up()`. `up()` moves them past `B`, and nothing else is inserted in between, so `A + j` is exactly the pre-state on any database that passed the guard. The round-trip fixture (§10) proves it on a pre-state that includes the +1 shift and the Innovation Use rows.
## 6. Frontend impact

None.

## 7. Integration impact

None. The view reads already-synced CLARISA catalogs (`clarisa_innovation_characteristics`, `clarisa_innovation_types`, `clarisa_innovation_readiness_levels`, `clarisa_actor_types`, `clarisa_institution_types`, `clarisa_institutions`) and local catalogs (`innovation_dev_anticipated_users`, `dissemination_qualifications`, `expansion_potentials`, `tool_functions`).

## 8. Security & authorization

Unchanged access. The cells expose data the same users can open through the GET. No PII.

## 9. Observability

No new log lines. A Phase 3 failure rolls back and surfaces as the existing 500 path.

---

## 10. Testing strategy

| Gate | What it proves | What it CANNOT reach (KZ-017) |
| --- | --- | --- |
| Migration specs (SQL text) | No `?`/`:word` outside quotes; no top-level `GROUP BY`/`ORDER BY`/`LIMIT`/`DISTINCT`/aggregate; no `_validation(`; 4 laterals each guarded by `root.indicator_id = 2`; 32 aliases; `down()` exact | Whether the SQL runs or returns the right values |
| **Parity fixture** on scratch | For each case, `innovation_dev_validation(id) = TRUE` ⇔ no cell holds `Not provided`; each single-rule case turns exactly its cell/slot; expected strings come from `requirements.md`, never from the view. **NULL / empty cases (JD C-2, S-2, S-4):** variety NULL (85 = `NA`), knowledge sharing NULL at level ≥ 7 (94 = `NP`, 95 = `NA`), expansion potential NULL (112 = `NA`), level NULL (94–112 = `NA`), each Yes/No column NULL, `is_organization_known` NULL, actor type 5 with `''` custom name and org type 78 with `''` custom name (function TRUE, no `NP`). **Divergence fixtures** (§3.3): inactive `rid`, role-2 rows — each asserts the divergence, outside the biconditional | Dev/Prod data; Prod MySQL version |
| **One-row fixture** | `COUNT(*) = 1` per `result_id` with many children; snapshot and soft-deleted ids absent | — |
| **`EXPLAIN FORMAT=TREE`** of the **real Phase 3 SQL** (captured from the repository's `queryRunner.query`) on ≥ 200 seeded mixed results | 4 × `Materialize (invalidate on row from root)` correlated on `result_id`; root `results` by its `result_id` range/lookup, no full scan of the view. **And** the real Phase 2 SQL's top-level table count is **unchanged at 60**, and no view merged today becomes `<derived…>` — the 28 pre-existing `<derived…>` rows stay as they are (guards DD-1) *(Amended 2026-10-06 at T-02's gate, user-approved — Pivot Record in `execution.md`.)* | Cost-based access paths at Prod volume; timing (a reading, 3 + 3 runs) |
| Layout round trip | `up → down → up` on scratch over a **realistic pre-state** (JD C-1/C-3): the 27 seed rows at their **post-shift** positions (seed + 1, after `Link to Innovation Use`), stored with NULL for `''`, **and** the 6 Innovation Use rows (incl. `Actors`/`Organizations`) and the OICR rows present. Asserts: `down()` restores every row byte-identical (label, explanation, section, fill, `sort_order`), the Innovation Use rows are byte-identical after `up()` **and** after `down()`, and a pre-state with one seed label altered makes `up()` throw with nothing applied | Dev's real rows (P-14) |
| Repository unit spec | Phase 3 runs on the same `queryRunner`, inside the transaction, with the ids, after Phase 2; merge per the DD-1 merge contract; a Phase 3 failure rolls back; zero ids → no Phase 3. Existing pins on `queryRunnerQuery.mock.calls[n]` move by one call and are updated, never deleted (JD C-5) | Real SQL (asserted in fixtures, KZ-001) |
| Handler + `.xlsx` read-back | 112 columns, band 81–112, headers = dictionary labels, no `coming soon` row | Visual rendering → human |
| `npm run build` | TS compiles | Spec files |

The parity fixture computes the expected verdict **from the function**, so mutating any transcribed rule turns it red (K-004).

---

## 11. Rollout

- **Order:** the view migration must be live before the code (Phase 3 selects it unconditionally). Dev runs `migration:execute` on deploy; Prod ordering is UNVERIFIED (P-13) and checked by a human before the `main` merge — the same gate as precedent G2.
- **Cosmetic window:** between the dictionary migration and the code, the old code's Data dictionary sheet already lists the 32 renamed and moved rows while Raw data still has 80 columns. One deploy, no error. *(Amended 2026-10-06 at T-02's gate, user-approved — Pivot Record in `execution.md`.)*
- **Dev overlap:** resolved. Since `docs/specs/reports/excel-layout-server-side` the export no longer reads Dev's group rows, so the June `INNOVATION DETAILS` band is never painted (requirements D9). *(Amended 2026-10-06 at T-02's gate, user-approved — Pivot Record in `execution.md`.)*
- **Dev view-name ownership (JD S-1, P-18):** on Dev, `report_innovation_dev` is also owned by `1781300000000-CreateReportInnovationDevView` (branch `origin/dev`), whose `down()` is `DROP VIEW IF EXISTS report_innovation_dev`. HITL ruling 2 keeps the name. **Rollout rule:** if Thursday's removal reverts that migration *after* this view is deployed to Dev, `migration:execute`-time re-creation does not happen (this migration is already recorded), so the person removing it must re-run this view's `up()` SQL or remove the June migration's row without running its `down()`. Owner: the user, at T-05.
- **Backout:** revert the code first, then these two migrations by name (never a blind `migration:revert ×2`).

---

## 12. Design decisions log

| # | Decision | Rationale | Rejected alternatives |
| --- | --- | --- | --- |
| DD-1 | Read the view in a **separate Phase 3 query** on the same connection and transaction, then merge by `result_id` in TS. **Merge contract (JD C-5):** Phase 2 selects `gi.result_id AS result_id` (no column spec uses that key); Phase 3 selects `result_id` plus the 32 aliases; keys are compared as `String(result_id)` on both sides (bigint may hydrate as string); Phase 2's order is kept (iterate Phase 2 rows, `Map` lookup); a Phase 2 row with no Phase 3 row gets all 32 keys = `Not applicable` (cannot happen today — both roots are live `results`, P-20 — but never a blank cell) | P-3/P-4: Phase 2's top level is at 60 of 61 tables. Joining a view that brings ~12 tables makes MySQL silently un-merge some view — measured by both judges: `report_innovation_use` is the one that un-merges — a whole-view materialization on every export (D3). Phase 3 costs one round trip, with the view merged inside its own query | (a) `LEFT JOIN report_innovation_dev` in Phase 2: over the cap, silent degradation. (b) Wrap the view in one `LEFT JOIN LATERAL` from Phase 2: counts as 1 table (P-4 probe: top level 61), so it works, but leaves **zero** headroom for any future section and still adds a per-row dependent subquery to the already-large Phase 2. (c) Split Phase 2 in general: out of scope (FU-1) |
| DD-2 | Transcribe the rules into the view; parity guarded by a fixture | Same as precedent DD-2: only a transcription can name *which* cell fails | Calling `innovation_dev_validation()` per row |
| DD-3 | Append after INNOVATION USE, nothing shifted | HITL ruling 1; precedent DD-3 | Between POLICY and OICR (shifts 20 published columns) |
| DD-4 | Reuse the 27 seed dictionary rows (update in place) + 5 inserts, instead of deactivating them and inserting 32 new ones | No orphaned or duplicate section (R-IDX-006); labels the product already defined (HITL ruling 3) | Leave them and insert 32 more (duplicate section); deactivate and insert (two copies to keep in sync) |
| DD-5 | Prefix every key `innovation_dev_` | Flat merged row object | Unprefixed keys |
| DD-6 | View name `report_innovation_dev`, `CREATE OR REPLACE`; `down()` drops it | HITL ruling 2 (the June work is treated as non-existent). The baseline-only definition is superseded, not preserved | Restore the baseline definition in `down()` (would re-create an object no migration owns) |
| DD-7 | Actor and organization cells follow the GET (role 1), not the green check's unscoped counts | Cells describe what the user reported in the section; the difference only shows if a dev result carries rows of another role (P-12) | Unscoped lists (would show Innovation Use rows on a re-categorised result) |

**Reversion challenge (Step 2.3, run inline by the architect — not an independent reviewer; Review Design would supply one):** R-IDX-007 removes the notice row (delivered behaviour). *What does removing it break?* The handler renders the notice through a dedicated warning-row path (`star-results-metadata-workbook.handler.ts:102`, `bannerNotice`, warning-notice support from `0858dc9cf`). Removing the row shifts the header row up by one, so any test or consumer that pins the header **row index** breaks. Answer recorded: T-04 must find those pins with a consumer sweep (`grep -rn "STAR_RAW_COMING_SOON_NOTICE\|bannerNotice" src test`) and the `.xlsx` read-back must locate headers by content, not by a fixed row. The warning-row capability itself stays in the builder (unused, not deleted). DD-6 removes nothing delivered on this branch.

---

## 13. Premise Ledger

**Count:** 20 rows — 16 verified, 4 `UNVERIFIED` (High: 2 — P-12, P-13; Low: 2 — P-14, P-15). P-6 and P-10 were **refuted in part** at Judgment Day round 1 and are corrected below; P-16…P-20 were added there.
**Blast-radius triggers:** `live-path` fires (the Export action) → P-1. `consumer` fires (exported TS symbols, Phase 2/3 SQL, `.xlsx` shape, notice constant) → P-7, P-8. `shared-state` fires (`report_workbook_column_group`/`report_data_dictionary` read for every section; the shared Phase 2 transaction) → P-10.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | Export reaches `StarResultsExportRepository.findStarResultsMetadataRows` | live-path | Precedent P-1 chain (`api.service.ts:386` → `reports.controller.ts:110` → `reports-generation.service.ts:16-25` → `…workbook.handler.ts:75-76`); repository `:65-195` | 13310040 | Wrong code path. High | — |
| P-2 | The GET's fields are those of R-IDX-002…005 (ids only, names come from joins) | location | `result-innovation-dev.service.ts:456-527`; role filters `:461-477`; entity `result-innovation-dev.entity.ts:28-210` | 13310040 | Columns missing or extra. High | — |
| P-3 | Phase 2's top-level join references **60** tables today | data-env | Scratch at HEAD: `EXPLAIN SELECT gi.result_id FROM report_general_information gi LEFT JOIN <the 10 other views as in repository :152-162> WHERE gi.result_id IN (1,2,3)` with `sql_mode='STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'` → **60** rows with `id = 1`. Per view: gi 7, aa 6, pr 2, gl 4, ev 1, ip 3, csd 13, pc 5, oc 11, lkr 1, iu 7 | 13310040 | DD-1 is unnecessary. High | — |
| P-4 | Past 61 tables MySQL **does not error**: it stops merging a view. One lateral-wrapped view counts as 1 table | data-env | Same query + `k` × `LEFT JOIN results xk`: k=1 → top 61, no error; k=2 → top 56, no error, with `<derivedN>` rows replacing merged tables; k=12 → 56, no error. Lateral wrapper `LEFT JOIN LATERAL (SELECT v.* FROM report_innovation_use v WHERE v.result_id = gi.result_id) z ON TRUE` → top 61, inner 7 `DEPENDENT` | 13310040 | DD-1 alternatives re-open. High | — |
| P-5 | Latest green check is `1758125999162` | location | `grep -l -i innovation_dev_validation src/db/migrations/*.ts` → 9 files; `CREATE FUNCTION` in `1753460254629`, `1753992795699`, `1754341867460`, `1758039230848`, `1758050480166`, `1758125999162` (latest); the 3 Innovation Use files name it without redefining (count 0) | 13310040 | Transcription targets a stale rule set. High | — |
| P-6 | Dictionary has 27 active `Innovation details` rows, seeded at sort 58–84 and **since shifted** (P-17); they sit right after `Link to Innovation Use` | data-env | `seed-data/star-results-metadata-dictionary.seed.ts:351-515`; inserted by `1777025000000…ts:45-60` (`''` stored as NULL); activated by `1781210173864…ts:8`. *(Corrected at JD round 1: the first citation said "no later migration touches them", from a grep for the text "innovation details", which cannot see a `sort_order` shift.)* | 13310040 | DD-4 targets rows that do not exist (repo-wise). High | — |
| P-7 | Readers of the changed TS symbols (`STAR_RESULTS_METADATA_RAW_COLUMNS`, `STAR_RAW_SECTIONS` (was `STAR_RAW_COLUMN_GROUP_FALLBACK`, deleted by the excel-layout spec), `STAR_RAW_SHEET_PREAMBLE_BASE`, `STAR_RAW_COMING_SOON_NOTICE`, `findStarResultsMetadataRows`) are the files listed in precedent P-14, plus the pins `…handler.spec.ts` (80 columns, notice), `star-results-export.repository.spec.ts` (`:77`, `:251`) | consumer | Precedent P-14 grep, re-run by **T-04 as its first step** over `server client` (one grep per symbol) | 13310040 | Missed failing specs. Low | — |
| P-8 | The `.xlsx` has no consumer that parses columns (client stores the blob) | consumer | Precedent P-15 (`api.service.ts:386`) | 13310040 | A client change is needed. Low | — |
| P-9 | Catalog join keys: `cit.code`, `cic.id`, `cirl.id`, `idau.id`, `dq.id`, `ep.id`, `tool_functions.id`, `clarisa_actor_types.code`, `clarisa_institution_types.code`, `clarisa_institutions.code` | data-env | Entities cited in the scout report (`result-innovation-dev.entity.ts:220-266`, `result-actor.entity.ts:134-138`, `result-institution-type.entity.ts:83-114`) | 13310040 | Names render as `Unknown (id n)`. Low | — |
| P-10 | Sharing *(updated 2026-10-06: since the excel-layout spec only the dictionary is read; the group table is not, and this spec writes no group row)*: groups and dictionary are read for every section by `report-layout.repository.ts:35-62`; the 10 + 1 existing group rows and every dictionary row outside the id-resolved block stay untouched — **guaranteed by §5's id-keyed writes, not by labels** (P-16); Phase 3 shares Phase 2's connection and `group_concat_max_len` (set by `SET LOCAL`, which in MySQL is session scope, so it persists on the pooled connection — pre-existing, harmless here) | shared-state | as cited; `star-results-export.repository.ts:193-215`. *(Corrected at JD round 1: the label-matched draft would have rewritten Innovation Use rows.)* | 13310040 | Another section moves, or Phase 3 truncates lists at 1 KiB. High | — |
| P-11 | The green check joins `result_innovation_dev` **without** `is_active`; `findOne` and this view require an active row | other | `1758125999162` `up()` (`INNER JOIN result_innovation_dev rid ON r.result_id = rid.result_id`); `service.ts:456-459` | 13310040 | An inactive row with complete data: function TRUE, cells `NP`. Parity fixture excludes that case and records it as a known divergence. Low | — |
| P-12 | No live indicator-2 result has **active** `result_actors` / `result_institution_types` rows of role 2 (Innovation Use) — the only other valid role, since both role columns are NOT NULL FKs (JD B J-10) | data-env | `UNVERIFIED — confirm at source before relying on it` (scratch holds no data; Dev not queried) | — | Parity breaks for those results (DD-7 shows fewer lines than the check counts). High | Read-only `SELECT COUNT(*)` on Dev for each table joined to `results` with `indicator_id = 2` and role `<> 1`, as **T-01's first step**; a non-zero count goes to the user before T-02 |
| P-13 | Prod deploy applies migrations before the new code serves, and Prod MySQL ≥ 8.0.14 (`LATERAL`) | data-env | `UNVERIFIED — confirm at source before relying on it` (shared with precedent G1/G2, still open) | — | Every export 500s on Prod. High | Human, before the `main` merge — owner **T-05** |
| P-14 | Dev and Prod hold the 27 seed rows with their seed labels unchanged | data-env | `UNVERIFIED — confirm at source before relying on it` | — | The migration's guard throws (§5 step 4) — loud, not silent. Low | Read-only `SELECT field_label FROM report_data_dictionary WHERE …` on Dev, **T-03 first step** |
| P-15 | Phase 3's `IN (…)` with one placeholder per id fits MySQL's 65,535-placeholder cap for any export Phase 2 already handles | data-env | `UNVERIFIED — confirm at source before relying on it`. Phase 2 already binds **2 ×** ids (`repository.ts:181-185`), so Phase 3's 1 × is strictly smaller | — | Phase 3 errors on huge exports. Low | Argument above; T-04 unit spec pins the count |
| P-16 | `Actors` and `Organizations` are also active dictionary labels of the **Innovation Use** section (fill `FF6A1B9A`), so a label is not a unique key | shared-state | `1791400000000-StarRawInnovationUseColumnGroup.ts` `DICTIONARY_ROWS` (header: "Actors and Organizations already exist as dictionary field labels on an earlier section"); both judges' scratch `SELECT … FROM report_data_dictionary` | 13310040 | §5 corrupts Innovation Use rows. High | — |
| P-17 | The 27 rows' live `sort_order` is not the seed's: `1780690000000` and `1781215000000` shift every row with `sort_order >= 26` by +1 after seeding | data-env | `1780690000000-StarRawLinkResultColumnGroup.ts:38-39` (`AND sort_order >= 26`), re-run by the architect; `1781215000000…ts:33-37` (judge A) | 13310040 | `down()` restores wrong positions. High | — |
| P-18 | On Dev, `report_innovation_dev` is also created by `1781300000000-CreateReportInnovationDevView` (branch `origin/dev`, not in HEAD), whose `down()` drops it | shared-state | judge A: `git show origin/dev:…/1781300000000-CreateReportInnovationDevView.ts` (line 7 `CREATE OR REPLACE VIEW`, line 123 `DROP VIEW IF EXISTS`); `git merge-base --is-ancestor 5b426acf HEAD` → not an ancestor | 13310040 | Removing the June work drops this view on Dev → every Dev export 500s. High | Rollout rule §11, owner the user at T-05 |
| P-19 | `report_field` treats a NULL `applies` as TRUE; `valid_text` is the green check's text test | other | `1779920000000-ExpandReportFieldMediumtext.ts` (`IF NOT COALESCE(applies, TRUE)`), confirmed on scratch by `SHOW CREATE FUNCTION report_field` (judge B) | 13310040 | §3.2 wrapping rule is unnecessary or insufficient. High | — |
| P-20 | Phase 3's view root (live `results`) is a superset of Phase 2's `gi` root, so every Phase 2 row has a Phase 3 row | location | `report_general_information` root ends `WHERE root.is_active = TRUE AND root.is_snapshot = FALSE` (`1777046263538-updateDateFormat.ts`, judge A) and inner-joins status/indicator (judge B, `SHOW CREATE VIEW`) | 13310040 | Cells would be blank; the DD-1 merge contract fills `NA` anyway. Low | — |

---

## 14. Open questions & follow-ups

- **OQ-1 / OQ-2** (requirements §10): unanswered at the requirements gate; re-asked here. Due before T-03 builds the layout.
- **FU-1:** Phase 2 is at 60 of 61 tables. **Any future section joined into Phase 2 will silently degrade a view.** Recommend a follow-up that moves more sections to the Phase 3 pattern, or converts the heavy views (`report_capacity_sharing_development` 13, `report_oicr` 11) to `LATERAL`. To be filed in `docs/specs/innovation-use/OPEN-ITEMS.md` §3.3 by T-05.

## 15. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
| --- | --- |
| Tasks | **5** (T-01 view + spec · T-02 fixtures · T-03 dictionary migration + round trip · T-04 TS wiring incl. Phase 3 · T-05 rollout/docs) |
| LOC | **~2,300** (view ~400 · view spec ~200 · fixture suite ~800 · dictionary migration ~300 · its spec + realistic round trip ~300 · TS + specs ~300). *Raised at JD round 1: id-resolved writes, relative `down()`, and NULL/divergence fixtures* |
| Review rounds | **~12** (precedent actuals: 11 verdicts for 7 tasks; T-02 and T-03 budgeted at 3) |

Depth check: 5 tasks / ~2.3k LOC fits **Standard**, at its upper edge. No change.

## 16. References

Precedent spec and Kaizen entry `docs/specs/kaizen/innovation-use--excel-export.md` · ADR-11 · `1758125999162` · `baseline.sql:8026` (superseded) · `5b426acf` (Dev-only, out of scope)
