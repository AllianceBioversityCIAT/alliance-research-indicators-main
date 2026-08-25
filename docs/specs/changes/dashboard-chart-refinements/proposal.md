# Proposal — Dashboard Chart Refinements (Sankey SP flows + geo color unification)

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `changes/dashboard-chart-refinements` |
| **Slug** | `dashboard-chart-refinements` — derived from free-text argument (owner request 2026-08-25) |
| **Type** | Change |
| **Approval Mode** | gated |
| **Status** | proposed |
| **Owner** | J. Cadavid / bilateral-visual-improvements |
| **Depends on** | `changes/executive-overview-grounded-context` (landed through T-09; only T-07 visual pass open) |
| **Parallel-safe** | Partially — see Risks: the concurrent `changes/chart-explainers` spec is actively editing dashboard card files in this same checkout |
| **Date** | 2026-08-25 |

## 2. Intent

Two chart-quality fixes on the project dashboard, both owner-requested from live screenshots:

1. Replace the **Science Program Alignments** bipartite bubble graph with a **Sankey** (Levers → Science Programs + Unaligned), backed by a new server `lever × SP` aggregation.
2. Unify the **Top geographic scope** color encoding — the Top Regions / Top Countries bars adopt the map's sequential ramp so a country's bar color corresponds to its map fill — and fix the visible axis-label overlap and help-button overlap defects in that card.

Owner decision already made: **Top primary levers stays as bars** (a Sankey was evaluated and rejected for that card — single-dimension ranking with extreme skew 360/18/1/1 renders 1-count flows as invisible hairlines).

## 3. Problem / Current Behavior

- **SP Alignments** renders floating force-graph bubbles with raw ids (`2764`, `19912`) and no readable structure; the key fact (2 aligned vs 365 unaligned) hides in header chips. A bipartite weighted mapping is exactly what a Sankey exists for, and the current form communicates almost nothing (owner screenshot on record).
- **Geo scope card** uses two unrelated encodings for the same measure: the choropleth uses a sequential blue ramp (correct), while Top Regions / Top Countries bars use rank-based categorical colors (green→blue by position). Kenya can be dark green in the bars and dark blue on the map. Additionally: x-axis tick labels collide into garbage strings ("1206080"), and the floating "?" help buttons overlap the first bar row.

## 4. Proposed Outcome

- SP Alignments panel shows a left→right Sankey: lever nodes → SP nodes + an explicit **Unaligned** sink; link width = result count; drill-through on link/node click to the filtered results table (consistent with existing chart click-through). Empty/degraded data falls back exactly like the other cards.
- Geo card bars are colored by the **same sequential ramp** as the map, value-normalized (not rank-normalized), sourced from the validated `--ac-viz-*` ramp tokens; map and bars read as one system in both themes. Axis labels no longer overlap; help buttons no longer cover data.

## 5. Scope

- **Server:** one new sub-report in the existing `reports/dashboard` aggregation (8th entry in the `Promise.allSettled` set, same degrade-to-null contract): `lever_sp_flows` — per-contract counts joining primary-contract results × `result_levers` (primary lever) × `result_pool_funding_alignment(_sp)` × `clarisa_science_programs`, plus the unaligned remainder per lever. DTO + Swagger + unit/integration tests per K-021 bootstrap scope.
- **Client:** `sp-alignment-graph` component replaced (or internally rewritten) to render the Sankey via `viz-chart` — requires adding echarts `SankeyChart` to the tree-shaken registry inside the lazy dashboard chunk; `tableModel` accessibility alternative as with every chart.
- **Client:** `geo-scope-card` — bar color function switches from rank-based `projectDashboardBarColor` to a value→ramp mapping shared with the map's visualMap; axis label formatting/rotation fix; help-button positioning fix.
- Tests for all of the above (KZ-001: assert emitted echarts option/link data and rendered DOM, not call sequences).

## 6. Non-Goals

- No change to Top primary levers (stays as bars; owner decision).
- No new chart types elsewhere; no changes to the Executive Overview feature.
- No re-styling of `chart-explainers` (separate concurrent spec, different owner session).
- No map projection/zoom changes.

## 7. Affected Users, Systems, And Specs

- **Users:** all project-dashboard viewers.
- **Server:** `agresso-contract` module (repository sub-report + DTO). Read-only SQL; no schema change.
- **Client:** `components/sp-alignment-graph/`, `components/geo-scope-card/`, `shared/components/viz-chart/` (Sankey module registration), `shared/constants/project-dashboard-chart-colors.constants.ts`.
- **Specs:** consumes `ContractDashboardReport` extended by this spec; touches files adjacent to `changes/chart-explainers` (in flight).

## 8. Visual Reference

- Source: Owner screenshots (live app, 2026-08-25)
- Location: `docs/specs/changes/dashboard-chart-refinements/reference/` — `sp-alignments-and-levers-current.png` (bubble graph + levers bars), `geo-scope-color-mismatch-current.png` (map vs bars mismatch, axis overlap, help-button overlap)
- Notes: current-state evidence; target Sankey sketched in the owner conversation (levers left, SPs + Unaligned right, width = results).

## 9. Requirement Delta Preview

### ADDED
- Server `lever_sp_flows` block on the dashboard report (nodes + weighted links incl. Unaligned).
- Sankey rendering + drill-through in SP Alignments.
- Value→ramp color mapping shared by geo map and geo bars.

### MODIFIED
- SP Alignments panel (bubble graph → Sankey; aligned/unaligned chips stay).
- Geo bars coloring; geo card axis label layout; help-button placement.

### REMOVED
- Force-graph bubble rendering in SP Alignments.

## 10. Approach Options

| # | Option | Trade-off |
| --- | --- | --- |
| A (recommended) | New server sub-report `lever_sp_flows`; client renders Sankey from it | Correct at any result volume; one more degradable block in an existing pattern; small server task |
| B | Client-side join (fetch all results + levers + alignments, aggregate in browser) | No server change, but N+1 fetches, heavy payloads, wrong at 10k-result contracts — rejected |
| C | Sankey from existing `sp_alignment.sps[].links[]` only (no lever dimension: Aligned SPs vs Unaligned) | Zero server work but loses the lever→SP story that justifies a Sankey; would be a 2-node band chart — rejected unless the server task is blocked |

## 11. Recommended Approach

**Option A.** The per-result facts already exist (`result_levers`, `result_pool_funding_alignment_sp` — verified 2026-08-25); the aggregation is one JOIN away, and the dashboard repository's `Promise.allSettled` + degrade-to-null contract absorbs it without touching existing consumers. Client-side, `viz-chart` already owns the echarts registry, so Sankey lands inside the lazy chunk with a bundle-budget check.

## 12. Risks, Dependencies, And Open Questions

- **Concurrent-spec collision (highest):** `changes/chart-explainers` (another session, same checkout) is editing `project-dashboard-card.*` and `project-dashboard.component.*` right now, and may target the same cards this spec restyles. Execution must serialize with that spec or coordinate file ownership; measurements need clean-scope discipline (already exercised: `--testPathIgnorePatterns='chart-explainer'`). KZ-003/§4.3 concurrency rules apply.
- **Sankey link explosion:** a contract with many levers × SPs could clutter; cap to top-N links + "Other" bucket if needed (open question OQ-1: N threshold — decide in specify with real data).
- **Ramp granularity:** value-normalized bar colors need the ramp validated for adjacent-step distinguishability (`npm run tokens:validate` covers monotonicity; KZ-001 requires asserting the emitted colors).
- **Bundle budget:** SankeyChart import must stay inside the lazy dashboard chunk (C-5 budgets; verify with build stats).
- **OQ-2:** does "Unaligned" split by lever (one link per lever) or collapse to one sink node? Recommend per-lever links (keeps the lever story symmetric) — confirm in specify.

## 13. Success Criteria

- SP Alignments renders a legible Sankey with real data (D514: Lever 3-dominant flows + a thick Unaligned band) and degrades to the existing empty/error states.
- A country's bar color visually matches its map fill for the same value in both themes; axis labels legible; no overlap defects.
- All suites green (clean scope), build within budgets, tokens validate, KZ-001-grade assertions on emitted chart options.

## 14. Next Step

```text
/akili-specify changes/dashboard-chart-refinements
```
