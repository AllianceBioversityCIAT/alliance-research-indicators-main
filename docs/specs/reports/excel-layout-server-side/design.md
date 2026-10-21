# Design — Reports / Excel workbook layout on the server

- **Module:** reports (workbook `star_results_metadata`)
- **Spec id:** 2026-10-excel-layout-server-side
- **Status:** approved (2026-10-06; Judgment Day APPROVED)
- **Owner:** ARI server squad
- **Linked requirements:** ./requirements.md
- **Linked detailed design:** ../../../trd/trd.md (ADR-5 append-only migrations — no migration here)
- **Last updated:** 2026-10-06

## Document Control

| Field | Value |
| --- | --- |
| Depth | Standard — re-checked in §13 |
| Approval Mode | gated |
| Verified at | `7afcedfc` (branch `AC-1681-Include-the-Innovation-use-data-in-the-excel-export`) |
| Exploration | Inline: Dev read-only `SELECT`s on both tables, scratch reading, `git show origin/dev` of the June migration, one consumer grep per changed symbol, a `ts-node` listing of the 80 raw columns against the current groups |
| Requirements gate | Passed 2026-10-06 ("Continue") |
| Judgment Day | Round 1 ([`judgment.md`](judgment.md)): 0 severe; 5 warnings confirmed by both judges (J-1…J-5), 3 single-judge (J-6…J-8), 6 suggestions. User chose **Fix and Re-judge**; J-1…J-14 applied 2026-10-06 |
| Kaizen lessons applied | KZ-001 (staging lineage: assert in generated output) → the `.xlsx` read-back in §10 · KZ-017 (name what a check cannot reach) → §10 · K-004 (a gate seen red) → every task's falsifier |

---

## Executive Summary

- **A section catalog** in server code: one entry per section (key, title, `FF` colour), in the order of §1 of the requirements.
- **A Raw data column type** that requires a `section` key from that catalog. The 80 column objects each gain one `section` field. A missing or unknown key is a compile error.
- **One pure function** derives the bands from the tagged columns: it walks the columns, opens a band when the section changes, and throws when a closed section reappears. Its output is the shape the builder already consumes (`fromCol`, `toCol`, `label`, `fillArgb`), so **the builder does not change**.
- **The handler** takes the sheet list from a server constant, the bands from the derivation, each header colour from the column's own section, and the banner end column from the derivation's last column (= the column count). It stops calling the two layout readers.
- **Nothing in the database changes.** The readers and the fallback list are deleted; the tables, entities and migrations stay.

---

## 1. Goals & non-goals

**Goals:** R-WBL-001…007, NFR-WBL-001…003.

**Non-goals:** changing the builder; changing `report_data_dictionary` or its reader; dropping the tables or deleting their entities (ruling (c)); any other preamble value; the client.

> **Cross-check (KZ-016).** Against every `AND IT MUST` / `BUT it must NOT`: no read of either table (§2, §5); a split section throws instead of painting (§3.3); a new section moves no existing band (§3.3 — bands follow column order); unknown sheet keys in the override are still ignored (P-9); colours never in 6-character form (§3.1, §10).

---

## 2. Architecture

```
GET /api/reports/resultCenter/xlsx
 └► StarResultsMetadataWorkbookHandler.buildWorkbookSpec
      ├─ sheets   ← STAR_RESULTS_METADATA_SHEETS (constant)  → WorkbookSheetOrderResolver (env override, unchanged)
      ├─ columns  ← STAR_RESULTS_METADATA_RAW_COLUMNS (each with `section`)
      ├─ bands    ← deriveColumnGroups(columns, STAR_RAW_SECTIONS)     ◄── NEW, pure
      ├─ header fill per column ← STAR_RAW_SECTIONS[column.section].fillArgb
      ├─ banner end column      ← the derivation's last column (= column count)
      ├─ dictionary rows ← ReportLayoutRepository.findDataDictionaryRows (unchanged)
      └─ result rows     ← StarResultsExportRepository (unchanged)
 └► ExcelWorkbookBuilder (unchanged: merges each band fromCol..toCol)
```

### 2.1 Composition

| Path | Change |
| --- | --- |
| `…/star-results-metadata/star-results-metadata.sections.ts` (new) | `STAR_RAW_SECTIONS`: the 11 sections (key → title, fill), and the derived key type |
| `…/star-results-metadata/star-results-metadata.columns.ts` | Raw array typed as the section-tagged column type; each of the 80 objects gains `section` |
| `…/core/excel-workbook.column-groups.ts` (new) | The pure derivation (§3.3), generic over the section key |
| `…/constants/star-results-metadata.constants.ts` | `STAR_RESULTS_METADATA_SHEETS` (2 entries, §3.2) |
| `…/star-results-metadata-workbook.handler.ts` | Uses the constant, the derivation, per-section header fill, computed banner end; drops both readers and the fallback |
| `…/star-results-metadata.sheet-presentation.ts` | `STAR_RAW_COLUMN_GROUP_FALLBACK` deleted; `bannerTitleMergeToCol` leaves the base preamble (set by the handler), so its type becomes `Omit<ExcelSheetPreamble, 'columnGroups' \| 'bannerTitleMergeToCol'>` (only consumer: the handler) |
| `…/repositories/report-layout.repository.ts` | `findActiveSheets`, `findColumnGroups` and `ReportWorkbookColumnGroupRow` deleted; `findDataDictionaryRows` kept |
| sibling specs | New: sections, derivation. Updated: handler spec, repository spec (§10) |

---

## 3. Data model (server-side constants)

### 3.1 Sections

One entry per section, keyed by a stable identifier (upper snake case of the title, e.g. `IP_RIGHTS`). Each entry holds `label` and `fillArgb`. **The catalog is declared as a literal object (`as const`) checked against the entry shape with `satisfies`, and the key type is `keyof typeof` that object** — a literal union of the 11 keys. Declaring it as `Record<string, …>` would widen the key to `string` and silently remove the compile gate of R-WBL-002 (JD J-1). Values are exactly requirements §1 "intended layout" (titles byte-equal to the Dev rows; colours in `FF` form, ruling (a)). Insertion order of the catalog is **not** used for layout — band order always follows the columns (§3.3) — so a catalog reorder can never move a band.

### 3.2 Sheets

`STAR_RESULTS_METADATA_SHEETS`: `[{ sheet_key: 'raw_data', sheet_name: 'Raw data', sort_order: 1 }, { sheet_key: 'data_dictionary', sheet_name: 'Data dictionary', sort_order: 2 }]` — the Dev rows (requirements §1), in the existing `WorkbookSheetRow` shape so the resolver is reused unchanged.

### 3.3 Band derivation

| Rule | Why |
| --- | --- |
| Walk the columns in order; position = index + 1 | Column order is the single source of position |
| A change of `section` closes the current band and opens a new one | One band per contiguous run (R-WBL-003) |
| Opening a section that already closed earlier → throw a Nest `InternalServerErrorException` whose message names the section key, the **stray column** (the first column of the interrupting section: key and position) and the **reopening column** (key and position) | R-WBL-003 "Split section": no overlap, no double band. A Nest exception, not a raw `Error`, because it runs on the HTTP path (`src/CLAUDE.md:197`, JD J-8) |
| Band = `{ fromCol: first position, toCol: last position, label, fillArgb }` from the catalog entry | The builder's existing contract (P-5) |
| A catalog section with no column produces nothing | R-WBL-003 "Empty section" |
| Pure, no I/O; run once per export. It also returns the **last column** (= column count), which the handler uses as the banner end (R-WBL-005) | Deterministic; unit-testable over the real array and over synthetic arrays (81 columns, JD J-14) |

### 3.4 Column type

A Raw data column type = the shared `ExcelColumnSpec` plus a **required** `section` whose type is the catalog's key union. The shared `ExcelColumnSpec` is **not** changed (P-8: it also types the dictionary columns and the builder). Typing the raw array with it (an explicit annotation on the exported constant) makes a missing or misspelled key a compile error (R-WBL-002, NFR-WBL-003) — **only** because the key type is the literal union of §3.1; T-01 must observe the build fail once for each (K-004). `npm run build` type-checks `columns.ts` (P-12). The handler strips nothing: the builder ignores unknown properties on a column (P-5).

---

## 4. API surface

No change.

## 5. Backend module design

**Handler, `buildWorkbookSpec`:**
1. Sheets: `this.sheetOrderResolver.resolve(STAR_RESULTS_METADATA_SHEETS, csvOverride)` — the repository call is gone.
2. Bands: `deriveColumnGroups(STAR_RESULTS_METADATA_RAW_COLUMNS, STAR_RAW_SECTIONS)`.
3. Header fills: each raw column gets `headerFillArgb` = its section's colour (replaces the position-range lookup, `handler.ts:183-193`). The helper takes the **section-tagged** column type, not `ExcelColumnSpec[]`, or the tag is lost (JD J-7); the `FF1565C0` default fill disappears (every column has a section).
4. Presentation: `{ ...STAR_RAW_SHEET_PREAMBLE_BASE, bannerTitleMergeToCol: <derived last column>, columnGroups, … }`; every other preamble value unchanged, including the notice row (the paused Innovation Development spec owns its removal).
5. Dictionary rows and result rows: unchanged calls.

**Repository:** only `findDataDictionaryRows` remains; the now-unused `WorkbookSheetRow` import goes (lint). No DI change (the class stays, `reports.module.ts:37`).

**Entities:** `report-workbook-sheet.entity.ts` and `report-workbook-column-group.entity.ts` stay, unread — deleting them is outside ruling (c) and buys nothing (P-7).

## 6. Frontend impact

None.

## 7. Integration impact

None.

## 8. Security & authorization

Unchanged.

## 9. Observability

No new log lines. A split section throws during `buildWorkbookSpec`; it surfaces on the existing 500 path, and the unit test over the real array makes it unreachable in a build that passed CI.

---

## 10. Testing strategy

| Gate | Proves | Cannot reach (KZ-017) |
| --- | --- | --- |
| Sections spec | 11 entries; every colour `^FF[0-9A-F]{6}$`; titles equal the §1 table | Whether a column uses them |
| Derivation spec (synthetic arrays) | Contiguous runs → bands; split → throws naming section, stray column and reopening column; empty section → no band; one-column section → `fromCol = toCol`; **a column added inside a section** → that band +1 and every later band shifted by 1; **a section appended** → one new band, every earlier band byte-identical; 81 columns → last column 81 | The real array |
| Derivation over the **real** raw array | Output equals the requirements §1 table exactly (11 bands: from, to, label, fill) | Rendering |
| Handler spec | 2 sheets from the constant ("Raw data", "Data dictionary"); override reorders; unknown override key ignored; bands = derivation output; header fill per section (e.g. col 31 = `FF35749A`); banner end = column count; neither removed reader exists or is called; **the Data dictionary sheet still holds the `findDataDictionaryRows` rows** (R-WBL-007). **Existing cases that change (JD J-2):** `getWorksheet('Raw')` at `:208`, `:279`, `:357` → `'Raw data'` (the old name came from the mocked DB row, `:51-62`, `sheet_name: 'Raw'` at `:54`); `:452-464` (fallback groups) and `:480-495` (unknown DB sheet → 0 sheets) are replaced by the override case; `:541-560` (`FF1565C0` default) is removed; dead mocks `:232`, `:458`, `:547` go; the `beforeEach` stubs of the deleted readers (`:51-62`, `:77-84`) and their providers (`:95`, `:97`) are removed, or kept only to assert the readers are never called; the case titled "builds workbook spec with DB column groups…" (`:114`) is renamed; the merge checks at `:292-295` are kept and re-pointed at the derived bands | Real ExcelJS merges |
| `.xlsx` read-back (builder + handler, mocked rows) | Merged ranges of the band row and their titles/fills located **by content**; banner merge `C1:<last>1` | Visual appearance (human, D7) |
| `npm run build` | Missing/unknown `section` fails to compile; all types | Spec files |

Expected values come from the requirements §1 table, never from the derivation's own output.

---

## 11. Rollout

- One deploy, no migration, no ordering constraint.
- **Dev:** the export stops painting the June INNOVATION DETAILS band and the shifted OICR band (it ignores the table) — the overlap disappears even before Thursday's restore.
- **Prod (P-4, UNVERIFIED):** a human reads Prod's two tables before the `main` merge. If Prod differs from the intended layout, the difference is shown to the user before merge: either the code adopts it, or the Prod rows were drift.
- **Backout:** revert the code commit; the tables were never touched, so the DB-driven path resumes exactly.

---

## 12. Design decisions log

| # | Decision | Rationale | Rejected alternatives |
| --- | --- | --- | --- |
| DD-1 | Section catalog keyed by a stable id; each column carries the id | Titles/colours stated once; the tag is short and typed | Title string on each column (80 copies of a title; a typo makes a new band); colour per column |
| DD-2 | Bands derived from contiguous runs in column order; split → throw | Order and ranges have one source (the array); overlap is impossible by construction | Catalog `sort_order` + ranges (re-creates the hand-numbering); silently merging split runs (hides a misplaced column) |
| DD-3 | Builder unchanged; derivation produces its existing `columnGroups` shape | Smallest change; builder specs stay valid | Teach the builder about sections (wider blast radius, P-5 consumers) |
| DD-4 | New column type extends `ExcelColumnSpec` with a required `section`; shared type untouched | Dictionary columns and builder keep compiling; compile-time gate | Optional `section` on the shared type (no compile gate; dictionary columns would need it) |
| DD-5 | Sheets as a constant in `WorkbookSheetRow` shape; resolver reused | Override behaviour unchanged | Hardcode two sheets in the handler without the resolver (drops the env override) |
| DD-6 | Delete `findActiveSheets`, `findColumnGroups`, their row type and `STAR_RAW_COLUMN_GROUP_FALLBACK`; keep entities, tables, migrations | Dead code would invite a second source; ruling (c) keeps the data | Keep readers "just in case" (two sources of truth); delete entities (outside ruling (c), P-7) |
| DD-7 | Banner end = the derivation's last column (= column count), set in the handler; removed from the base preamble | R-WBL-005; base preamble keeps no number that depends on columns | Keep `80` in the base and override (two values, one stale) |

**Reversion challenge (Step 2.3, run inline by the architect — not an independent reviewer):** DD-6 removes delivered behaviour — the database-driven layout and its fallback. *What does removing it break?* (1) The ability to change a band, rename a sheet or hide a sheet (`is_active = 0`) by a data edit without a deploy — intentionally given up (requirements R2). (2) Handler spec cases built on the DB path (full list in §10, JD J-2): "omits sheets not present in ordered metadata" (`handler.spec.ts:480-495`) can no longer arise and is replaced by "an unknown key in the env override is ignored" (R-WBL-001); the fallback case (`:452-464`) and the `FF1565C0` default-fill case (`:541-560`) lose their subject; three read-backs look the sheet up as `'Raw'` (`:208`, `:279`, `:357`), a name that came from the mocked DB row and becomes "Raw data". (3) `report-layout.repository.spec.ts:20-28` and `:39-…` test the deleted readers and are deleted with them; `:30-37` (dictionary) stays. (4) Dev's stored bands stop rendering — intended (F-1/F-2). No other reader found (§13 P-6). Recorded; the design addresses each.

---

## 13. Premise Ledger

**Count:** 13 rows — 12 verified, 1 `UNVERIFIED` (High: 1 — P-4). P-11…P-13 added at Judgment Day round 1.
**Blast-radius triggers:** `live-path` fires (the Export action) → P-1. `shared-state` fires (`ExcelColumnSpec` and the builder's `columnGroups` contract are shared) → P-5, P-8. `consumer` fires (exported symbols deleted or retyped; spec lookups by sheet name) → P-6, P-11.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | The Export action reaches `StarResultsMetadataWorkbookHandler.buildWorkbookSpec` | live-path | Chain cited in `docs/specs/innovation-dev/excel-export/design.md` P-1 (`api.service.ts:386` → `reports.controller.ts:110` → `reports-generation.service.ts:21` → `StarResultsMetadataWorkbookHandler.buildWorkbookSpec`, `handler.ts:58`); handler unchanged since (`git log 13310040..7afcedfc -- …/star-results-metadata-workbook.handler.ts` → empty) | 7afcedfc | Wrong code path. High | — |
| P-2 | Dev holds 2 sheet rows and 12 group rows as listed in requirements §1 | data-env | Dev `alliancereportingdb` (8.0.45), `SELECT * FROM report_workbook_sheet ORDER BY workbook_key, sort_order` → 2 rows; `SELECT * FROM report_workbook_column_group ORDER BY workbook_key, sheet_key, sort_order` → 12 rows (2026-10-06) | 7afcedfc | Intended layout wrong. High | — |
| P-3 | The June migration inserts INNOVATION DETAILS and shifts later groups +27, so OICR's intended range is 61–74 | data-env | `git show origin/dev:server/researchindicators/src/db/migrations/1781301000000-StarRawInnovationDevColumnGroup.ts` lines 7, 17-23 (`from_col + ?` where `sort_order >= 10`) | 7afcedfc | OICR band wrong. High | — |
| P-4 | Prod's two tables equal the intended layout | data-env | `UNVERIFIED — confirm at source before relying on it` (no Prod access; ruling (b)) | — | Prod export changes visibly at deploy. High | Human reading of Prod before the `main` merge — owner **T-03** |
| P-5 | The builder merges each `columnGroups` entry `fromCol..toCol` with its `label`/`fillArgb`, and reads only `key`/`header`/`width`/fill/hyperlink/type fields of a column | location | `excel-workbook.builder.ts:219-235`; `excel-workbook.types.ts:33-…` (`ExcelColumnSpec`), `:103-108` (`columnGroups`) | 7afcedfc | DD-3 needs a builder change. Low | — |
| P-6 | Readers of the deleted/retyped symbols are exactly: `findActiveSheets`/`findColumnGroups` → repository + its spec + handler + handler spec; `STAR_RAW_COLUMN_GROUP_FALLBACK` → sheet-presentation + handler; `STAR_RESULTS_METADATA_RAW_COLUMNS` → columns + handler; `ReportWorkbookColumnGroupRow` → repository only. No client hit | consumer | `grep -rln "<symbol>" server/researchindicators/src server/researchindicators/test client/research-indicators/src`, one per symbol (2026-10-06) | 7afcedfc | A missed reader fails to compile or a spec breaks. Low (build catches it) | — |
| P-7 | Entities are loaded by glob; keeping the two entity files keeps TypeORM metadata as today | other | `orm.config.ts:19-23` (`domain/entities/**/*.entity{.ts,.js}`) | 7afcedfc | Irrelevant if kept — row records why DD-6 keeps them. Low | — |
| P-8 | `ExcelColumnSpec` is shared by the dictionary columns and the builder | shared-state | `grep -rln ExcelColumnSpec src test` → builder, builder spec, types, handler, columns (incl. `STAR_RESULTS_METADATA_DICTIONARY_COLUMNS`, `columns.ts:290`) | 7afcedfc | DD-4 could modify the shared type. Low | — |
| P-9 | The order resolver keeps listed keys first, ignores unknown keys, appends the rest | location | `workbook-sheet-order.resolver.ts:16-33` | 7afcedfc | R-WBL-001 override scenario fails. Low | — |
| P-10 | The 80 raw columns form 11 contiguous runs matching the intended layout (first/last keys: `result_code`…`main_contact_person`, …, `innovation_use_level`…`innovation_use_quantifications`) | data-env | `npx ts-node --transpile-only` listing of `STAR_RESULTS_METADATA_RAW_COLUMNS` against `STAR_RAW_COLUMN_GROUP_FALLBACK` (2026-10-06): 80 columns, every position in exactly one group, no gap | 7afcedfc | Tagging would move a band. High | — |
| P-11 | The handler spec looks the Raw data sheet up by name, and that name came from the mocked DB row (`'Raw'`), not from the code | consumer | `handler.spec.ts:51-62` (mock, `sheet_name: 'Raw'` at `:54`), lookups `getWorksheet('Raw')` at `:208`, `:279`, `:357` (JD J-2, both judges) | 7afcedfc | Three read-backs throw a TypeError on the `undefined` sheet once the name becomes "Raw data" — loud, not silent. Low | — |
| P-12 | `npm run build` type-checks `star-results-metadata.columns.ts` (default tsc builder, only specs excluded) | other | `nest-cli.json` (no `builder`/swc entry); `tsconfig.build.json` `exclude: ["node_modules","test","dist","**/*spec.ts","vite.config.ts"]` | 7afcedfc | The compile gate of R-WBL-002 does not run in CI. High | — |
| P-13 | The builder does **not** clamp the banner: `min(b, max(colCount, b))` always equals `b` (the banner end), so the merge ends exactly where the preamble says; a banner end equal to the column count therefore merges exactly to the last column, and a larger value would merge past it | location | `excel-workbook.builder.ts:100` (`lastCol = Math.max(colCount, pre.bannerTitleMergeToCol)`), `:167-168` (`tTo = Math.min(…, lastCol)`) | 7afcedfc | R-WBL-005 read-back expectation wrong. Low | — |

---

## 14. Open questions & follow-ups

- **FU-1:** dropping the two tables (and their entities) — a later, separate human decision (ruling (c)).
- **FU-3:** the Data dictionary's section titles and fills stay in `report_data_dictionary` and already differ from the band colours (e.g. Evidences dictionary fill `FF5C7EC4`, `1777026100000:31`, vs band `FF64B1DD`). Two sources of section identity remain; unifying them is a later decision (JD J-12).
- **FU-2:** `docs/specs/innovation-dev/excel-export` re-plan: T-03 keeps only the dictionary half; T-04 tags its 32 columns with a new `INNOVATION_DEVELOPMENT` section instead of a fallback row and a banner literal.

## 15. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
| --- | --- |
| Tasks | **3** (T-01 sections + tagged columns + derivation · T-02 handler/repository wiring + specs + read-back · T-03 rollout gate and doc updates) |
| LOC | **~700** (catalog ~40 + sections spec ~40 · 80 `section` tags, ~80–160 after prettier expands one-line objects · derivation ~60 + spec ~150 · handler/repo/presentation ~60 net · handler/repo spec updates + read-back ~200 · docs ~30). *Corrected at JD round 1 (J-4): the first figure, ~450, did not add up (its own parts summed to ~530) and omitted the sections spec* |
| Review rounds | **~6** |

Depth check: 3 tasks / ~700 LOC, most of it tests and one-line tags, fits **Standard**. No change.

## 16. References

Requirements §1 tables · `1777026100000` (canonical `FF` fills) · `1781301000000` on `origin/dev` (June shift) · `docs/specs/innovation-dev/excel-export/` (paused).
