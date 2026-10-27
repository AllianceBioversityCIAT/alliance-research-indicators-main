# Archive Summary — Innovation Use / Excel export section (AC-1681)

**Outcome:** the Results Center Excel export now carries an **INNOVATION USE** column group: 6 cells at Raw data columns 75–80, backed by the `report_innovation_use` view. *Linked innovation development* is a hyperlink to the linked result. Tasks T-01…T-04, T-06 and T-07 passed review. T-05's human rollout gates (G1–G6) are **open**, and this archive was explicitly accepted with them outstanding.

## Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/innovation-use/excel-export/` |
| Archive path | `docs/specs/archive/2026-10-06-innovation-use--excel-export/` |
| Archive date | 2026-10-06 |
| Branch | `AC-1681-Include-the-Innovation-use-data-in-the-excel-export` (pushed by the user) |
| Family | `docs/specs/innovation-use/family.md` row 7 |
| Ticket | AC-1681 |
| Archived by | `/akili-archive`, user-approved with accepted gaps (below) |

## Final Status

| Task | Status | Commit |
| --- | --- | --- |
| T-01 view migration `1791300000000` | PASS (attempt 2) | `c26aaff4` |
| T-02 parity + EXPLAIN fixture | PASS (attempt 2) | `0091be2e` |
| T-03 layout migration `1791400000000` | PASS (attempt 1) | `7dd41597` |
| T-04 TS wiring | PASS (attempt 1) | `abf90565` |
| T-05 rollout + human gates | `[~]` — docs PASS (`ba196b68`); G1–G6 open | — |
| T-06 export subset (6 cells, 75–80) `1791500000000` | PASS (attempt 1) | `2cc75999` |
| T-07 linked-dev hyperlink `1791600000000` | PASS (attempt 1) | `067c70ec` |

**Accepted at archive (user, 2026-10-06):** T-05 not `[x]`; no `test-report.md` (`/akili-test` not run); no `validation-report.md` (`/akili-validate` not run). Test evidence lives in `execution.md`.

## Requirements Delivered

| Requirement | State |
| --- | --- |
| R-IUX-001 one row per live result | Delivered (view + Excel) |
| R-IUX-002…005 level, justification, actors, organizations, quantifications | Delivered |
| R-IUX-006 linked dev (amended twice) | Delivered: 4 cells in the view, 1 exported, as a hyperlink |
| R-IUX-007 layout (amended) | Delivered: 80 columns, band 75–80, §3.2a order |
| R-IUX-008 notice | Delivered (text pending OQ-1 confirmation) |
| NFR-IUX-001 (amended: structural gate) | Delivered; timing recorded as a reading (81 → 140 ms on 210 scratch results) |
| NFR-IUX-002 (amended: indicator 6) | Delivered |
| NFR-IUX-003 reversible + deploy order | `down()` exact for every migration; deploy order is gate G2 (open) |
| NFR-IUX-004 migration safety | Delivered |

## Files Changed Summary

| Area | Files |
| --- | --- |
| Migrations (all applied on the shared DB — immutable) | `1791300000000-CreateReportInnovationUseView`, `1791400000000-StarRawInnovationUseColumnGroup`, `1791500000000-StarRawInnovationUseExportSubset`, `1791600000000-AddLinkedDevCodeToReportInnovationUseView` + 4 migration specs |
| Export TS | `star-results-export.repository.ts`, `star-results-metadata.columns.ts`, `….sheet-presentation.ts`, `….banner-subtitle.ts` + their specs and `…workbook.handler.spec.ts` |
| Fixtures (scratch MySQL) | `report-innovation-use-view.fixture-spec.ts`, `star-raw-innovation-use-column-group.fixture-spec.ts`, `star-raw-innovation-use-export-subset.fixture-spec.ts` |
| Docs | `docs/trd/trd.md` ADR-11 line, `innovation-use/family.md` row 7, `innovation-use/OPEN-ITEMS.md` §3.3 |

## Test Evidence Summary

| Gate | Last result (Leader re-run, non-author) |
| --- | --- |
| Full server suite `npm test -- --silent` | 425 suites / 4036 tests passed (T-07) |
| `npm run build` | exit 0 |
| Innovation Use fixtures on scratch | 3 suites / 41 tests passed |
| Falsifiers | Every task's falsifiers observed red with quoted messages (`execution.md`) |
| Visual | Mocked-data previews v1–v3 opened by the user; per-item visual on real data = G3 (open) |

## Validation Summary

No `/akili-validate` run (accepted). Each task had an independent `akili-reviewer` (Claude) against an Implementer on Grok (Cursor). 11 Reviewer verdicts in total: 2 FAIL rounds (T-01, T-02), every task closed on PASS. No `REVIEW_WAIVED` or `REVIEW_SKIPPED`.

## Accepted Warnings Or Follow-Ups

| # | Item | Home |
| --- | --- | --- |
| G1 | Prod `SELECT VERSION()` ≥ 8.0.14 (`LATERAL`) — blocks `main` | `OPEN-ITEMS.md` §3.3 |
| G2 | Prod applies migrations before the new code serves — blocks `main` | §3.3 |
| G3 | Per-item visual check on real data; TIP/PRMS link route (`/result/TIP-<code>/general-information`) | §3.3 |
| G4 | OQ-1 labels / line formats / notice text | §3.3 |
| G5 | Dev layout: **Dev-only Innovation Development rows (`INNOVATION DETAILS 61–87`, OICR `88–101`) overlap our 75–80 band → `Cannot merge already merged cells`**. Its removal (announced for Thursday) must revert those layout rows | §3.3 (pending repoint, Kaizen P5) |
| G6 | Real-volume timing on Dev | §3.3 |
| FU-1…FU-4 | LATERAL for other `report_*` views; scratch collation (P-13); 5 pre-existing Nest-bootstrap fixture failures; broken `migration:scan` | §3.3 |

## Historical Notes

- Two user-approved Pivots: **NFR-IUX-001** (index-path + ≤ 20% timing gate → structural gate, after the user flagged over-complication; DD-4 kept) and **QA feedback** (9 → 6 exported cells; T-06). Two amendments: NFR-IUX-002 scoped to indicator 6; the linked-dev hyperlink (T-07, DD-8).
- The view still exposes all 9 cells (+ the linked-dev code) so the dropped cells can be re-exported without a view change.
- The `@akili-spec docs/specs/innovation-use/excel-export` tags in migrations, specs and fixtures keep the original path as a point-in-time reference; the applied migrations cannot be edited.
