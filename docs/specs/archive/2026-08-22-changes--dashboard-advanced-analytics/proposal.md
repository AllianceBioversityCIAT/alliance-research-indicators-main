# Proposal — Dashboard Advanced Analytics (ECharts + bilateral/SP intelligence)

## 1. Document Control

| Field | Value |
| --- | --- |
| Type | **Change** |
| Slug | `dashboard-advanced-analytics` — derived from free-text argument (*"otra librería de gráficas… quiero algo innovador… saquemos provecho de la info del proyecto y de los bilaterales (agresso y clarisa)… no todo barras… resultados entre SPs con nodos"*) |
| Spec Path | `changes/dashboard-advanced-analytics` |
| Approval Mode | **gated** |
| Author | j.cadavid@cgiar.org |
| Date | 2026-08-22 |
| Status | Draft v2 — pending approval (v2 2026-08-22: user mandate — open library evaluation, freedom to reshape reports, motion as a design dimension) |
| Depends on | `docs/specs/archive/2026-08-22-changes--project-dashboard-redesign/` (**done** — T-01..T-12 executed; this proposal builds on its endpoint, tokens, and layout) |
| Parallel-safe | **no** (same route, same components, extends the same reports endpoint family) |

## 2. Intent

Evolve the redesigned Project Dashboard from "correct charts" to **project intelligence**: adopt Apache ECharts as the chart engine to unlock relation- and density-native visualizations (node graph, heatmap), and surface the project/bilateral data the platform already stores but the dashboard ignores — AGRESSO contract context (budget, funding type, timeline, SDGs, CGIAR entities) and CLARISA-side bilateral data (Science Program alignments with Primary/Contributing roles, ToC contributions). Each new visualization is chosen **by the data's job** (dataviz discipline), not for novelty: relations → graph, grid magnitude → heatmap, time → line, ranked magnitude → the existing bars.

## 3. Problem / Current Behavior

*(Verified by code exploration 2026-08-22; the redesign spec is merged at `b96abd77`.)*

| # | Gap | Evidence |
|---|---|---|
| P1 | **The chart engine can't express the data's richest structures.** chart.js (via the single `p-chart` in `results-trend-card`) has no graph/network, no native heatmap matrix, no sankey — the exact forms the bilateral data calls for. | only `p-chart type="line"` exists; no echarts/d3 anywhere |
| P2 | **The dashboard consumes exactly one field group** of the project record: `indicators[]`. It ignores `grant_amount`, `donor`, `funding_type`, `contract_status`, `start/end/extension` dates, `sdgs` (json), `center_amount_usd`, and the `pooled_funding_contracts` CGIAR-entity links that already sit on `AgressoContract`. | scout Q4/Q5: dashboard greps show zero consumption |
| P3 | **Bilateral/SP data is invisible at project level.** Per-result tables store SP alignments with roles (`result_pool_funding_alignment_sp.sp_code/sp_role`), ToC rows with `quantitative_contribution`/targets per SP, and the SP catalog (`clarisa_science_programs`: name, category, color, icon) — but **no endpoint aggregates any of it per contract**, so a Center Admin cannot see how a bilateral project's results distribute across Science Programs. | scout Q1/Q6: join path complete, aggregation absent |
| P4 | Indicator distribution is one-dimensional (totals only); the indicator×year density — where reporting concentrates over time — is not visible anywhere. | current bars show totals only |
| P5 | Only one series token exists (`--ac-viz-series-1`) — multi-series/categorical charts have no validated palette yet. | scout Q7 |

## 4. Proposed Outcome

A Center Admin / MEL expert opening the dashboard of a bilateral project additionally sees:

1. **SP Alignment Graph** *(the "graph-webkit-dep" ask)* — a force-layout bipartite node graph: result nodes ↔ Science Program nodes, edge style distinguishing **Primary** vs **Contributing**, SP nodes sized by linked-result count, tooltips with result code/title, click → result. Legacy `sp_role = null` edges render as "role unknown", never hidden. Rendered only when the contract has alignments; clean empty state otherwise.
2. **Indicator × Year heatmap** — density matrix of results per indicator per report year (ECharts heatmap, sequential single-hue ramp), replacing nothing — it complements the ranked bars.
3. **Project Context strip** — budget (`grant_amount_usd`/`center_amount_usd`), `funding_type`, `contract_status`, a compact timeline (start → end → extension, elapsed %), SDG chips (from the `sdgs` json), and CGIAR entities from `pooled_funding_contracts`. Pure display of data already fetched or one field away.
4. **SP contribution rollup** *(candidate — see Options)* — per SP: results count by role + summed `quantitative_contribution` vs frozen `target_value` from the ToC rows.
5. **One chart engine**: the trend card migrates from chart.js/`p-chart` to the same tree-shaken ECharts wrapper (SVG renderer); `chart.js` + `chartjs-plugin-datalabels` leave `package.json`. PrimeNG stays the component chrome everywhere (see Non-Goals).
6. **Motion layer** (per the v2 mandate): staggered entry transitions, SP-graph adjacency focus/blur on hover, and a Universal-Transition morph between the indicator bars and the indicator×year heatmap — every animation informative, 150–400 ms, fully disabled under `prefers-reduced-motion` (see 10.1).

## 5. Scope

- **Client:** thin standalone ECharts wrapper component (echarts/core, only the used chart modules + canvas renderer, lazy-chunk-confined); the three/four new widgets under `project-detail/components/`; `--ac-viz-series-2..n` + heatmap-ramp tokens (light+dark, validator-gated); trend-card engine swap; a11y contract per widget (accessible name + data-table alternative, the R-PD-009 pattern — canvas charts make this **mandatory**, not optional).
- **Server:** new members of the `agresso/contracts/reports/*` family reusing `buildPrimaryContractResultsSubquery`: `reports/sp-alignment` (nodes/edges + per-SP rollup) and an indicator×year matrix (new endpoint or an extension of `results-summary` — decided at design). SP display metadata joined from `clarisa_science_programs`.
- **Docs:** token registry mirrors; ux-ui §8 component inventory entries for the new widgets.

## 6. Non-Goals

- **No shadcn / no framework change.** shadcn/ui is React; the constitution locks the client at **Angular 19 + PrimeNG 19** (PRD C-1, §8.3) and the design baseline forbids mixing component libraries (`docs/ux-ui/design.md` §12.2, 2026-05-13). "Innovador" comes from the visualization layer, which a chart engine swap fully enables — not from the component chassis. If a shadcn-like aesthetic is wanted later, that is a token/styling conversation, not a framework one.
- No changes to the bilateral capture flows (pool-funding-alignment tab, bilateral-mapping admin) — read-only consumption.
- No portfolio-wide analytics (the coverage-report already exists for that); this stays per-contract.
- No `sp_role` backfill for legacy rows (R-BIL-126 stands — the graph renders them honestly).
- No cross-widget brushing/filter workspace (Option C, deferred).

## 7. Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Center Admins / MEL of bilateral projects | Primary beneficiaries — first project-level view of SP alignment (PRD G8, bilateral phase continuity) |
| `client/research-indicators` | New dependency **echarts** (tree-shaken, lazy) replacing chart.js; bundle budgets (C-5) verified both ways |
| `server/researchindicators` | 1–2 read-only reports endpoints; no schema changes, no migrations |
| Specs | Extends archived `project-dashboard-redesign` (done); no overlap with active work |

## 8. Visual Reference

- Source: External reference (user-provided) + prior approved mockup
- Location: ECharts gallery — heatmap (`…/examples/en/index.html#chart-type-heatmap`) and the force-graph family (the `graph-webkit-dep` example is the named target aesthetic for the SP graph) · prior canvas sources at `../2026-08-22-changes--project-dashboard-redesign/mockup/`
- Notes: a new mockup (design canvas) for the three new widgets is **offered at approval** — recommended, since the graph and heatmap are net-new visual patterns for the app; the spec can proceed without it if declined.

## 9. Requirement Delta Preview

### ADDED
- `GET …/reports/sp-alignment` (nodes/edges/rollup per contract) and indicator×year matrix data.
- SP Alignment Graph widget (role-styled edges; null-role honesty; empty/conditional states per the R-PD-007 pattern).
- Indicator×Year heatmap widget (sequential ramp, validated).
- Project Context strip (budget, funding type, status, timeline, SDGs, CGIAR entities).
- `--ac-viz-series-2..n` + heatmap ramp tokens, light+dark, validator-gated.
- Canvas-chart a11y: every ECharts widget ships an accessible name + tabular alternative.

### MODIFIED
- `results-trend-card`: chart.js/`p-chart` → the shared ECharts wrapper (same visual contract: y-min 0, dashed in-progress year, sparse-year stat fallback).
- Possibly `results-summary` extended with the indicator×year matrix (design decision).

### REMOVED
- `chart.js` + `chartjs-plugin-datalabels` dependencies and the only `p-chart` usage (single-engine rule).

## 10. Approach Options

### 10.1 Library evaluation (open field, per user mandate 2026-08-22)

Criteria: single engine covering graph + heatmap + line (the forms this data needs now, plus sankey/chord for the future), bundle behavior under C-5, Angular 19 fit, **animation capability**, a11y story, license, theming via our runtime-resolved tokens, maintenance/community.

| Candidate | Node graph | Heatmap | One engine | Motion | License | Verdict |
|---|---|---|---|---|---|---|
| **Apache ECharts 5** | ✅ force/circular layouts | ✅ native | ✅ (+ sankey, chord-via-graph, sunburst for Option C) | ✅ **best in field**: staged entry transitions, `focus: 'adjacency'` emphasis/blur, **Universal Transition** (morphing between chart forms) | Apache-2.0 | **Selected** |
| Highcharts | ✅ networkgraph | ✅ | ✅ | ✅ | ❌ **commercial** | Runner-up on merit — its a11y module is best-in-class — but licensing disqualifies; our mandatory table-alternative discipline covers the a11y gap |
| D3.js | ✅ d3-force | hand-built | "engine" = build everything | hand-built | ISC | Maximal control, maximal maintenance; wrong trade for a product team; kept in mind for a future truly bespoke widget |
| Cytoscape.js / AntV G6 / Sigma.js | ✅ (specialists) | ❌ | ❌ needs a 2nd engine | partial | MIT | Rejected: pairing two engines is exactly the duplication being removed |
| ApexCharts / chart.js | ❌ | weak/plugin | — | medium | MIT | Fail the headline form |
| Nivo / Recharts / visx | — | — | — | — | MIT | React-only — constitution (C-1) |

**Two engine-level decisions folded into the recommendation:**
- **SVG renderer, not canvas** (ECharts ships both; SVG is its own recommendation for small datasets — ours are ≤13 SPs, ≤10×6 matrix, ≤6 points). Crisper at any zoom, lighter memory, and — decisive for this repo — the chart output is **inspectable DOM**, which makes rendered-output assertions (KZ-001) and the a11y layer far more honest than an opaque canvas. The force graph at our node counts (<100) is comfortably within SVG territory.
- **Motion with purpose, never decoration:** staggered entry transitions per widget; adjacency focus/blur on the SP graph (hovering an SP dims everything not connected — motion that *informs* the relation structure); Universal-Transition morph between the indicator bars and the indicator×year heatmap (two views of the same data, one continuous identity); the force layout's physical settle as the graph's entry. All gated by `prefers-reduced-motion` (animations off via init options — a hard requirement, ux-ui §10). Durations 150–400 ms; no looping/ambient motion.

### 10.2 Options

| Option | Content | Trade-off |
|---|---|---|
| A — Keep chart.js, hand-roll the rest | Heatmap as CSS grid feasible; force graph is **not** reasonably hand-rollable (layout physics, hit-testing, zoom) | Kills the headline ask; two engines' worth of custom code |
| **B — ECharts (SVG renderer) + 3 widgets + context strip + motion layer** *(recommended)* | Tree-shaken `echarts/core` in the lazy chunk; SP graph + heatmap (+ bars↔heatmap morph) + context strip; trend card migrated; chart.js removed; reports family reshaped **additively** (new `sp-alignment`; matrix into `results-summary` or sibling — design decides; existing consumers never broken) | One new dependency (lazy + tree-shaken; C-5 verified both directions); SVG-DOM a11y still requires the explicit accessible-name + table-alternative discipline |
| C — B + analytics workspace | + SP co-occurrence chord, sankey SP→lever→indicator, ToC contribution-vs-target rollup, cross-widget filtering | Real value but doubles the surface; follow-up once B proves the engine |

## 11. Recommended Approach

**Option B with ECharts on the SVG renderer.** The evaluation was run open-field (10.1): ECharts is the only license-clean engine that covers every form this data needs in one dependency, and its animation system is the strongest available — which converts the "movimiento" ask into three purposeful mechanisms (adjacency focus, staggered entries, the bars↔heatmap morph) instead of decoration. Server-side, the reports family is reshaped additively under its proven pattern. The SP contribution rollup (ToC `quantitative_contribution` vs targets) is B's stretch widget: in if design confirms per-SP sums are meaningful with current data quality, else deferred to C.

## 12. Risks, Dependencies, And Open Questions

| Type | Item |
|---|---|
| Risk | **Bundle**: echarts must live only in the lazy chunk; gate = initial-chunk diff, proven able to fail (K-004). Removing chart.js partially offsets. |
| Risk | **Canvas a11y**: ECharts is canvas — without the mandated table alternatives the three widgets are invisible to SR users (R-PD-009 pattern is the floor; D6-style HITL screenshots light+dark again mandatory). |
| Risk | **Legacy `sp_role = null`** (no backfill): the graph must show "role unknown" edges — pinned by test, mirroring the read-only `Contributing`-badge lesson from the bilateral tab (ux-ui §12.2 2026-08-13). |
| Risk | **SP catalog `color` column is raw hex** (dark-blind, unvalidated) — chart marks use validated `--ac-viz-*` tokens; the catalog color stays for badges only (mirrors D-PD-3's reasoning). |
| Risk | KZ-002: widgets render conditionally per contract type — enumerate test scope by *what renders* (bilateral vs non-bilateral fixtures). |
| Dependency | archived `project-dashboard-redesign` merged (done) — wrapper reuses its `chart-tokens.util` + theme signal. |
| Resolved | ~~Which library?~~ → **ECharts, SVG renderer** — open-field evaluation in §10.1 (v2 mandate). |
| OQ-1 | ngx-echarts wrapper vs thin in-house wrapper over `echarts/core`? (leaning in-house: one component, no extra dep, full tree-shake + renderer control — decide at design) |
| OQ-2 | Indicator×year matrix: extend `results-summary` or new sibling endpoint? (additive either way — existing consumers never break) |
| OQ-3 | Include the ToC contribution-vs-target rollup in B, or defer to C? |
| OQ-4 | Mockup now (design canvas of the 3 widgets + motion notes) or straight to `/akili-specify`? |
| Risk (motion) | The bars↔heatmap morph is the one *showcase* animation — if design review finds it confusing rather than clarifying, it degrades to a plain crossfade; the morph is never allowed to cost data legibility. `gsap-animation` skill loads at design if any non-chart motion (KPI count-up, section reveals) enters scope. |

## 13. Success Criteria

1. On a bilateral contract (e.g. A1676 if mapped), the SP graph renders real alignment data with role-distinct edges and honest null-role rendering; on a non-bilateral contract the widget shows its empty/absent state — never an error.
2. Heatmap and context strip render from server data with the three-state async pattern; no widget fabricates a value it has no source for (the S2 lesson).
3. Initial bundle unchanged (C-5); echarts confined to the lazy chunk; chart.js gone from `package.json`.
4. All new palette tokens pass the dataviz validator light **and** dark; zero hex literals in new component code.
5. Every canvas chart has an accessible name + tabular alternative; keyboard reachable interactions; WCAG 2.1 AA on the changed screen.
6. Coverage floors hold in both packages; new endpoints Swagger-documented.

## 14. Next Step

```text
/akili-specify changes/dashboard-advanced-analytics
```
