# Archive summary — Project Dashboard Redesign shipped

The project-detail dashboard moved off a 10k client-side fetch and hex-painted bars onto a primary-scoped `results-summary` aggregate, `--ac-viz-*` tokens, unified async states, and a KPI + trend layout. Chart.js on the trend card was later replaced by ECharts in the successor spec (already archived). This spec is archived **with explicit user override** (2026-08-22 option 2): no `validation-report.md` / `test-report.md`, and HITL boxes remain open.

## 1. Document control

| Field | Value |
| --- | --- |
| Spec ID | `2026-08-project-dashboard-redesign` |
| Type | Change |
| Owner | j.cadavid@cgiar.org |
| Archived by | `/akili-archive` (user chose option 2) |

## 2. Original spec path

`docs/specs/changes/project-dashboard-redesign/`

## 3. Archive date

2026-08-22

## 4. Final status

**Archived — accepted risk.** T-01…T-12 PASS in `execution.md`. Judgment S1–S4 fixed at specify (fix-only, re-judgment waived). HITL and §8 done-definition boxes **not** closed. Successor: `docs/specs/archive/2026-08-22-changes--dashboard-advanced-analytics/`.

## 5. Requirements delivered

| ID | Outcome |
| --- | --- |
| R-PD-001 | `GET …/reports/results-summary?contract-id=` — primary-scoped SQL, null status/year buckets |
| R-PD-002 | KPI strip from aggregate (`partner_institutions` distinct count — S2) |
| R-PD-003 | Status composition from aggregate; 10k bulk fetch removed |
| R-PD-004 | Trend card (then `p-chart`; successor moved it to `viz-chart`) + sparse-year fallback |
| R-PD-005 | Indicator region async + drill rows |
| R-PD-006 | Token/hex sweep on the feature; D6 HITL **not** attached |
| R-PD-007 | Three-state pattern on dashboard regions |
| R-PD-008 | Hierarchy: analytics above AI; AI collapse via `[hidden]` (D-PD-9) |
| R-PD-009 | Accessible names + tables on chart regions (automated) |
| NFR-PD-001 | Initial bundle 1.16 MB (T-12) |
| D-PD-12 | Counts are primary-contract-only (visible change vs old any-link chart) |

## 6. Files changed summary

From `execution.md` (no `## Constitution Impact` blocks).

**Server:** `agresso-contract` repository + `contract-results-summary-report.dto.ts` + controller/service `reports/results-summary`.

**Client:** `GetContractResultsSummaryService`, `get-project-detail` dedupe, `chart-tokens.util`, `--ac-viz-*` in `colors.scss` + README + ux-ui §7, dashboard/status/KPI/trend/cards/geo, drill-through `initializeScopedResultsTable`, AI section `[hidden]`.

## 7. Test evidence summary

No `test-report.md`. Per-task targeted suites in `execution.md`; T-12: 131/131 project-detail, build 1.16 MB, hex grep 0. T-05/T-06 noted 2 pre-existing `version-selector` failures on the full client suite.

Reviewer rework: T-05 (red-input vs `ToPromiseService.TP`), T-10 (44px retry targets). Zero HALTs/pivots.

## 8. Validation summary

No `validation-report.md`. Judgment ledger **APPROVED** (fix-only): 4 severe closed in requirements/design; SU3–SU5, SU7, SU8 left as info rows. D6 screenshots, Swagger, 401 curl, Dev A1676 cross-check **never recorded**.

## 9. Accepted warnings or follow-ups

- HITL: light+dark screenshots, Swagger, unauthenticated envelope, Dev primary-scoped count check, full dataviz validator (T-03 used a WCAG 3:1 substitute).
- `docs/ux-ui/design.md` §11 still describes `DarkModeService` → `.dark-mode` on `<body>`; mechanism-of-record is `data-theme` (D-PD-14). Pending kaizen `factual-sweep`.
- SU5 cap disclosure, SU4 401 gate, SU3 pending-table three-state — info rows.
- Primary-only count change (D-PD-12) still needs a release note if not already shipped in comms.

## 10. Historical notes

- Mockups stay in this archive under `mockup/`.
- D-PD-2 (chart.js for the trend line only) was **superseded in product** by successor D-DA-1 / TRD ADR-11. Do not revive `p-chart`.
- T-05 Reviewer FAIL assumed `HttpClient` rejects; `ToPromiseService.TP` always resolves with `successfulRequest: false`. See kaizen entry.
