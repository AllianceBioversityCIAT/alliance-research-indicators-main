# Archive summary — Dashboard Advanced Analytics shipped

Project-detail dashboards now run one ECharts engine (`viz-chart`), with SP alignment graphs, indicator×year heatmaps, and a project-context strip. Archived **with explicit user override** (2026-08-22): remaining HITL evidence (F-3) and the “six vs five indicator types” doc question (F-4) are follow-ups, not blockers.

## 1. Document control

| Field | Value |
| --- | --- |
| Spec ID | `2026-08-dashboard-advanced-analytics` |
| Type | Change |
| Owner | j.cadavid@cgiar.org |
| Archived by | `/akili-archive` (user chose option 2) |

## 2. Original spec path

`docs/specs/changes/dashboard-advanced-analytics/`

## 3. Archive date

2026-08-22

## 4. Final status

**Archived — accepted risk.** Tasks T-01…T-13 `[x]`. Validation FAILs F-1/F-2 resolved in `ad92ca6f`. No `test-report.md` (accepted; evidence in `execution.md` T-13). F-3 HITL and F-4 catalog-count drift accepted as follow-ups.

## 5. Requirements delivered

| ID | Outcome |
| --- | --- |
| R-DA-001 | `GET …/reports/sp-alignment?contract-id=` — SQL `COALESCE` → `UNKNOWN`, primary-scoped |
| R-DA-002 | `results-summary` + `by_indicator_year` (additive, no zero-fill cells) |
| R-DA-003 | Bipartite SP graph, role treatments, cap+disclosure, bilateral gating |
| R-DA-004 | Bars↔heatmap toggle, no refetch, morph + crossfade valve |
| R-DA-005 | Context strip; SDG object mapper fixed post-validate (F-1) |
| R-DA-006 | `chart.js` / `primeng/chart` removed; trend card on `viz-chart` |
| R-DA-007 | Engine-native motion; reduced-motion init asserted (visual HITL still open) |
| R-DA-008 | Series + ramp tokens, both themes, `tokens:validate` |
| R-DA-009 | Structural `tableModel` pairing on `viz-chart` |
| NFR-DA-001 | Initial 265.84 kB transfer; echarts in lazy chunk 624.71 kB transfer |
| NFR-DA-002 / 005 | Dev payload/fluidity **not measured** (F-3 follow-up) |
| D-DA-6 | ToC contribution rollup **deferred** (data-quality first) |

## 6. Files changed summary

From `execution.md` (no `## Constitution Impact` blocks; implicit: new shared chart engine + reports members).

**Server:** `agresso-contract` repository/controller/service + DTOs (`contract-sp-alignment-report`, `results-summary` matrix, `findOneContract` context fields).

**Client:** `viz-chart`, `chart-tokens.util`, `get-contract-sp-alignment.service`, `sp-alignment-graph`, `project-context-strip`, dashboard toggle/stagger, trend-card engine swap, `echarts` dependency, `tokens:validate` script, token mirrors (`colors.scss`, client README, `docs/ux-ui/design.md` §7).

## 7. Test evidence summary

No `test-report.md`. T-13 recorded: client **6,650** passed (319 suites, 98.24% lines); server **2,438** passed (338 suites); both production builds green; hex grep 0; `tokens:validate` 19/19.

Reviewer rework: T-06 (hex fallback), T-09 (cap copy/sort), T-10 (3 attempts), T-11/T-12 (layout/stagger). Zero HALTs, pivots, or `/akili-quick` escalations.

## 8. Validation summary

| Finding | At archive |
| --- | --- |
| F-1 FAIL SDG `[object Object]` | **Resolved** (`ad92ca6f`) |
| F-2 FAIL nested scroll | **Resolved** statically; visual single-scroll still in F-3 |
| F-3 WARN HITL D6/D9 | **Accepted follow-up** (user override) |
| F-4 WARN “6 indicator types” vs docs “five” | **Accepted follow-up** — KPI is `indicatorsTotalCount()` (data-driven); TRD/ux-ui still say five |
| F-5 WARN `$0` center budget | Advisory — stored zero, not fabrication |

## 9. Accepted warnings or follow-ups

- Complete HITL: dark screenshots, morph keep-vs-crossfade, reduced-motion emulation, SP-graph visual + NFR-DA-005 fluidity, Swagger shot, Dev count cross-check (F-3).
- Reconcile indicator-type denominator vs TRD/ux-ui “five” (F-4) — do not silently edit the constitution until the catalog source is verified.
- Out-of-scope (already recorded): Leaflet map swap; more chart-form variety; ToC rollup (D-DA-6).

## 10. Historical notes

- Depends on `docs/specs/archive/2026-08-22-changes--project-dashboard-redesign/` (done). Engine decision **D-DA-1**: in-house `viz-chart` over `echarts/core` + SVG; no ngx-echarts.
- T-13 Reviewer PASS claimed HITL complete; live screenshots later showed F-1/F-2 and an unfinished D6/D9 gate — see kaizen KZ-001 / KZ-014 recurrence.
- Execution log originally recorded path-param URLs; corrected same day to the query-param family form actually implemented.
