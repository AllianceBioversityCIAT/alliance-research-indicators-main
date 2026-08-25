# Design — Changes / Dashboard Chart Refinements

- **Module:** changes (agresso server + project-dashboard client)
- **Spec id:** 2026-08-dashboard-chart-refinements
- **Status:** draft
- **Owner:** J. Cadavid / bilateral-visual-improvements
- **Requirements:** ./requirements.md (R-DCR-001…005) · **Proposal:** ./proposal.md
- **Depth:** Standard · **Approval Mode:** gated
- **Last updated:** 2026-08-25
- **Scout evidence:** internals mapped 2026-08-25 (viz-chart registry, geo card/map, color constants, ramp tokens, sp-alignment-graph, server sub-report pattern + cardinality) — citations inline.

---

## 1. Executive Summary

One new degradable server sub-report (`lever_sp_flows`) feeds a Sankey that replaces the SP Alignments force-graph inside the existing `sp-alignment-graph` component shell (states, retry, tableModel and mounting survive; only the series and its data source change). The geo card switches its ranking bars from rank-based colors to a value-mapped share of the same `--ac-viz-ramp-*` family the map already uses, and fixes its two layout defects inside its own echarts options (no cross-spec file touches).

## 2. Architecture Overview

### 2.1 Server

`getContractDashboard` (agresso-contract.repository.ts:1387-1484) gains an 8th entry in its `Promise.allSettled` fan-out: `getLeverSpFlowsReport(contractId)`. Same contract as the existing seven: rejection → block `null` + prefixed string in `errors[]`; no HTTP status change (R-DCR-001 degrade scenario).

**Query design (one raw SQL, no N+1 — NFR-2):** from `buildPrimaryContractResultsSubquery` (repository.ts:723-748), JOIN `result_levers` (`is_primary = TRUE AND is_active = TRUE`, entity col `is_primary` at result-lever.entity.ts:68) and `clarisa_levers`; LEFT JOIN `result_pool_funding_alignment` (`is_active = TRUE`) → `result_pool_funding_alignment_sp` (`is_active = TRUE`) → `clarisa_science_programs` (`is_active = TRUE`) — the same join spine as `getSpAlignmentReport` (repository.ts:1295-1317). GROUP BY (lever_id, sp_code with NULL = unaligned). A second cheap query (or the same result set aggregated) supplies `results_total` and `results_with_alignment` as `COUNT(DISTINCT result_id)` — **never** the sum of link counts.

**Cardinality (scouted, binding):** a result has at most ONE active PRIMARY SP (unique generated-column index, migration 1786636994078) but unbounded CONTRIBUTING and legacy NULL-role rows (surfacing as UNKNOWN per R-BIL-126). Therefore link-count sums exceed distinct-result counts whenever multi-SP results exist — the DTO carries both totals so no consumer can honestly conflate them (R-DCR-001 AND-IT-MUST). *Amended 2026-08-25 (T-01 review adjudication):* the same holds on the UNALIGNED side — `result_levers` has no unique index on `(result_id, is_primary)` and the write paths produce multi-primary-lever rows, so `Σ(unaligned link counts)` may exceed `results_without_alignment` on such data. Accepted and carried honestly, exactly like the aligned side (per-lever attribution is the owner-confirmed OQ-2 story; chips read distinct counts). DD-9's fixture equality stands for single-primary-lever data; T-05's live check verifies the equality or explains any delta via multi-primary rows.

### 2.2 Client

```
GetContractDashboardService          (existing; report interface += lever_sp_flows)
  └─ project-dashboard.component     (existing mount; passes new input)
       └─ sp-alignment-graph          (KEPT shell: states/retry/legend area/tableModel)
            └─ viz-chart              (+ SankeyChart registration)
geo-scope-card                        (bars: value→ramp mapping; axis + spacing fixes)
  └─ geo-scope-map                    (UNTOUCHED — already ramp-correct)
```

## 3. Extended Directory Structure

No new folders. Touched files: server `agresso-contract/{repositories,dto}` (+1 DTO file, repository method, controller untouched — the block rides the existing endpoint), controller spec untouched; client `shared/components/viz-chart/viz-chart.component.ts`, `shared/interfaces/contract-dashboard.interface.ts` (+ block interface), `components/sp-alignment-graph/*`, `components/geo-scope-card/geo-scope-card.component.ts`, `shared/constants/project-dashboard-chart-colors.constants.ts` (+1 export).

## 4. Data Model

No schema change. **New DTO `ContractLeverSpFlowsDto`** (server) mirrored by client interface `ContractLeverSpFlows`:

- `contract_id`
- `results_total` (distinct primary results — lever-agnostic; *corrected 2026-08-25 at T-01 review: the earlier "with a primary lever" parenthetical predated the "No lever" pseudo-source and contradicted DD-9*)
- `results_with_alignment` (distinct, aligned)
- `links[]`: `{ lever_id, lever_short_name, lever_full_name, sp_code | null, sp_name | null, role: 'PRIMARY' | 'CONTRIBUTING' | 'UNKNOWN' | null, count }` — grouped by (lever, sp, role); `sp_code: null` = the per-lever Unaligned remainder (`role: null` there); a **"No lever"** pseudo-source (`lever_id: null`) carries unaligned results that have no primary lever, so every unaligned result has exactly one home (challenge #5).
- `results_without_alignment` (distinct) — the single number the header chip renders; the server unit test asserts `Σ(unaligned link counts) === results_without_alignment` on the fixture (named failing input: a result with no lever at all, which a lever-only GROUP BY silently drops).

## 5. API Design

No new route. `GET /api/agresso/contracts/reports/dashboard` response `data` gains `lever_sp_flows: ContractLeverSpFlowsDto | null`. Additive — existing consumers unaffected (R-DCR-001 BUT). Swagger: extend the report DTO annotation.

## 6. Backend Module Design

- `getLeverSpFlowsReport(contractId, limit?)` repository method (public, like its seven siblings — dashboard unit tests spy on it; *wording corrected 2026-08-25*) following the `getTopPrimaryLeversReport` shape (repository.ts:1035-1077): guard, shared subquery, raw SQL via `this.query` (implemented as four fixed concurrent queries — aligned links, per-lever unaligned, no-lever, counts — still no N+1; *corrected 2026-08-25*), DTO cast. No cap server-side beyond sane `LIMIT` on distinct levers/SPs (cap-to-12 is a CLIENT rendering rule per R-DCR-002 — the server returns complete links so the "N folded" note is truthful).
- Tests: repository unit spec with seeded fixture rows (incl. the named failing input: one result with 2 SPs → 2 link counts); integration spec NOT required — the degrade path is covered by extending the existing dashboard integration/unit pattern with an injected rejection (K-021: no AppModule, overridden providers).

## 7. Frontend / UX Component Architecture

### 7.1 viz-chart (3 scouted edits)

Import `SankeyChart` from `echarts/charts`, add to `use([])` (viz-chart.component.ts:56-76), add `SankeySeriesOption` to the `EChartsOption` union (:85-103). SVG renderer already emits `var(--ac-*)` strings as CSS attributes (scouted: geo-scope-card passes them raw today) — **Sankey node/link colors use `var()` token strings directly, no runtime resolution** (KZ-001-friendly: tests assert the emitted option carries the token names). `requireTable` stays true — the host supplies a tableModel (scouted caveat: options without tableModel render nothing).

### 7.2 sp-alignment-graph (shell kept, series swapped)

- **Inputs:** `report` (kept for the header chips + totals) **+ new `flows: ContractLeverSpFlows | null`**. Mount in project-dashboard.component.html adds the binding from `contractDashboard.data()?.lever_sp_flows`.
- **Series:** `type: 'sankey'`, left→right; lever nodes (short_name label, full_name via tooltip — challenge #10) + "No lever" pseudo-source when present; right nodes = SPs + ONE "Unaligned" node receiving the null-sp links (per-lever attribution kept at link level). `emphasis.focus: 'trajectory'` (challenge #7 — strictly better than adjacency for flows).
- **Role dimension PRESERVED (challenge #1 — a11y non-color-alone, archived R-DA-009 AC.3):** links arrive role-grouped from the server; rendered with `lineStyle.borderType` solid 3px (PRIMARY) / dashed 2px (CONTRIBUTING) / dotted 1.5px (UNKNOWN) — *mechanism corrected 2026-08-25: Sankey does NOT honor `lineStyle.type`; border properties are the renderer-preserved encoding* — and the component's existing DOM legend markup is KEPT verbatim. Legacy null roles render as UNKNOWN (archived "Legacy honesty" scenario stays satisfied).
- **Cap (client):** top 12 role-links by count; remainder folded into "Other" nodes; the EXISTING cap-notice markup is retargeted from result-nodes to links: "Showing top 12 of N links" (challenge #6; K-014 — visible truncation).
- **Tooltip:** lever full name, SP name, role, count.
- **Drill-through (verified surface):** lever-node click → Project Results tab with that lever applied via the results-center's existing `'lever-codes'` filter (results-center.service.ts:53, LEVER chip updater :351). SP nodes, the Unaligned node, and links are **non-interactive** (no pointer cursor, no navigation) — no SP filter surface exists; satisfies R-DCR-002's BUT-clause. *Requirement refinement presented at the Phase-2 gate.*
- **tableModel (challenge #3 — the only non-visual path to per-result data):** *(implemented 2026-08-25, reviewer-accepted, as a TWO-TABLE split: viz-chart's `tableModel` is plain-text sr-only by construction, so it carries the UNCAPPED aggregate links as the chart's a11y alternative, while the anchor-bearing detailed table below is the component's own visible `<table>`)* the DETAILED per-result table is KEPT, sourced from `sp_alignment` (which stays in the report): SP | Result Code | Result Title | Role — and its Result Code column becomes a real anchor to `/result/:code`, which also closes the PRE-EXISTING keyboard drill-through gap (archived R-DA-003 AC.3 was mouse-only in the tree — challenge #2). When `sp_alignment` degrades but flows exist, the table falls back to aggregate per-link rows (Lever | SP | Role | Results).
- **States & single-source coherence (challenge #4/#5):** panel visibility, header chips, and empty/error states are ALL driven by `lever_sp_flows` (chips read its `results_with_alignment`/`results_without_alignment` totals — one source of truth, the chip and the Sankey can never disagree). `sp_alignment` feeds ONLY the detailed table. Degrade matrix, decided here not in the template: flows null → panel error state (Retry); flows empty → panel empty state; flows present + sp_alignment null → chart + chips render, table falls back to aggregate rows. The absent-data inventory entry (`project-dashboard.component.ts:1235-1241`) moves its condition to the flows block with the panel.

### 7.3 geo-scope-card

- **New export in project-dashboard-chart-colors.constants.ts:** `valueRampColor(value, max, rampLength=5)` → returns `var(--ac-viz-ramp-N)` by ceil(share×5) with a floor at ramp-1 for nonzero values; pure, unit-testable, theme-agnostic (tokens flip by theme). `buildGeoRankingChartOptions` (geo-scope-card.component.ts:37-108) swaps `projectDashboardBarColor(index,total)` (:95) for it. `projectDashboardBarColor` itself is untouched — other cards keep rank colors by design (only the geo card claims map correspondence, R-DCR-003 BUT).
- **Value-label contrast:** bar value labels currently render outside/at bar end — keep labels OUTSIDE the bar (axis-side), never on the fill, so ramp-step darkness cannot break label contrast (R-DCR-003 AND-IT-MUST; visual gate confirms).
- **Axis fix:** the rankings' value axis (geo-scope-card.component.ts:61-71) gains `axisLabel.hideOverlap: true` + `splitNumber: 3` (three narrow charts in `lg:grid-cols-3`, scouted); category labels keep their existing 120px truncate.
- **Help-button space (defect fix without cross-spec touches):** the overlap comes from the chart-explainers surface placement (`absolute top:8 right:8`, their scss) over our `grid.top: 8`. Fix inside OUR options: `grid.top` raised to 44 on the three ranking charts, reserving the corner. No chart-explainer file is touched; if their placement later changes, the reserved space degrades to harmless padding. *(Coordination note logged for the concurrent spec.)*
- **Observed, not touched:** geo-scope-map's hardcoded hex fallback ramp + neutral colors (geo-scope-map.component.ts:96-101) — pre-existing token deviation with a boot-time rationale; recorded for a future token pass, out of scope (proposal non-goals).

## 8. Shared Contracts

`ContractDashboardReport` (client interface) += `lever_sp_flows: ContractLeverSpFlows | null`. `GetContractDashboardService` exposes it like its siblings. The **AI context builder does NOT consume it** (proposal non-goal; prevents silent scope growth into R-EOC-002's digest).

## 9. Design Decisions

| # | Decision | Why / evidence |
| --- | --- | --- |
| DD-1 | 8th sub-report on the existing endpoint, not a new route | Inherits the degrade contract + single client fetch (NFR-1/2); D-EOC-1's blast-radius logic applies inversely — this block has no consumer outside the panel |
| DD-2 | Per-lever Unaligned links into ONE right-column Unaligned node | Owner OQ-2 (per-lever story) without N unaligned nodes; link-level detail keeps the lever attribution |
| DD-3 | Client-side top-12 cap with visible fold note; server returns complete links | The truthful "N folded" note needs the real N (K-014); server capping would make the note a guess |
| DD-4 | Role preserved as a LINK GROUPING KEY rendered with the same solid/dashed/dotted `lineStyle.type` + kept legend | Challenge #1: role is the non-color-alone a11y mechanism (archived R-DA-009 AC.3), not decoration. *Corrected 2026-08-25 (T-03 review adjudication):* the premise "Sankey honors lineStyle.type" is FALSE against the vendored echarts (SankeyView maps link lineStyle through ITEM_STYLE_KEY_MAP, which has no `type` key; the ribbon is a filled path) — the encoding is rendered via `lineStyle.borderType/borderWidth/borderColor` (solid 3px / dashed 2px / dotted 1.5px, matching the kept legend 1:1). Intent unchanged. **Challenge outcome: §9.1** |
| DD-5 | Only lever nodes navigate (lever-codes filter exists: results-center.service.ts:53); SP/Unaligned/links inert | Navigation only where a real filter surface exists; Unaligned BUT-clause satisfied structurally |
| DD-6 | `valueRampColor` emits `var()` token strings | SVG renderer passes them through (scouted); zero runtime resolution, jsdom tests assert token names (chart-tokens.util.ts KZ-017 precedent) |
| DD-7 | Geo defect fixes live entirely in our echarts options (`hideOverlap`, `splitNumber`, `grid.top` reserve) | No cross-spec file contention with chart-explainers (highest proposal risk) |
| DD-8 | Panel/chips/states single-sourced from `lever_sp_flows`; `sp_alignment` feeds only the detailed table | Challenge #4/#5: kills the impossible partial states and the double-sourced unaligned count; the chip and the Sankey read the same totals |
| DD-9 | "No lever" pseudo-source + fixture assertion `Σ(unaligned links) === results_without_alignment` | Challenge #5: every unaligned result has exactly one home; discrepancy becomes a red test, not a shipped credibility bug |
| DD-10 | Component rewritten IN PLACE — selector, `report` input, chips, states, legend markup all kept; `flows` input added | Challenge C: every parent-spec assertion, stagger test, act-4 DOM-order test and the jest echarts mock keep working; a rename would also stale chart-explainers' provenance string (their file) |
| DD-11 | `GraphChart` deregistration DEFERRED (dead registry weight after this change) | Challenge #11: it edits shared `viz-chart` lines the concurrent spec may hold; recorded as follow-up to sequence after chart-explainers lands |

### 9.1 Reversion challenge (Step 2.3 — force-graph removal) — COMPLETED

Independent reviewer enumerated 12 breaks (full report in the run record). The three forced decisions and their resolutions: **role dimension** → DD-4 (role-grouped links + lineStyle.type + kept legend); **double-sourced unaligned count** → DD-8/DD-9 (single source + "No lever" node + equality assertion); **two-block degrade matrix** → DD-8 (decided in design, not left to the template). Additional adoptions: trajectory emphasis (#7), SP full name in tooltip (#10), cap-notice retarget (#6), detailed per-result table kept with anchor drill-through fixing the pre-existing keyboard gap (#2/#3), in-place rewrite preserving the parent-spec test surface (C). Deferred with rationale: GraphChart deregistration (DD-11). Accepted losses, recorded: `roam` zoom/pan (#9 — low notice), per-result nodes as VISUAL elements (#2 — mouse drill preserved via table anchors + lever navigation).

## 10. Budget (Step 2.4)

| Metric | Estimate |
| --- | --- |
| Tasks | 6 |
| LOC (prod + tests) | ~750 |
| Review rounds | 7 (6 tasks + 1 rework buffer) |

Depth Standard confirmed against the finished design (matches — no level change). `/akili-execute` trips against these numbers.

## 11. Testing strategy

Per requirements §7 defect-class mapping. Emphases: repository fixture with a 2-SP result (named failing input); emitted-option assertions for Sankey nodes/links/cap/fold-note (KZ-001); `valueRampColor` unit matrix incl. max=0 and value=max edges; degrade-path injection; **HITL visual pass with owner screenshots for everything jsdom cannot see** (color correspondence, overlap fixes, both themes) — the substitute gate is named in requirements §7, not implied.
