# Design — project-detail / Dashboard Advanced Analytics

- **Module:** project-detail (client) + agresso-contract (server, reports family + detail payload)
- **Spec id:** 2026-08-dashboard-advanced-analytics
- **Status:** draft
- **Owner:** j.cadavid@cgiar.org
- **Linked requirements:** ./requirements.md
- **Linked TRD:** ../../../trd/trd.md §4.2, §6, §8 · **Baseline spec:** ../project-dashboard-redesign/ (tokens D-PD-13, theme signal D-PD-5, async pattern, a11y contract)
- **Visual reference:** ECharts gallery (heatmap + `graph-webkit-dep`) per proposal §8; prior mockup sources `../project-dashboard-redesign/mockup/`
- **Last updated:** 2026-08-22

---

## 1. Goals & non-goals

**Goals:** 1 relation/density data served as contract-level aggregates (R-DA-001/002); 2 three new widgets — SP graph, indicator×year heatmap view, context strip (R-DA-003/004/005); 3 one chart engine, chart.js retired (R-DA-006); 4 purposeful motion incl. reduced-motion discipline (R-DA-007); 5 validated palette extension + AA (R-DA-008/009).

**Non-goals:** bilateral capture-flow changes; portfolio analytics; `sp_role` backfill; component-framework changes (C-1); ToC contribution rollup (**deferred** — D-DA-6); non-chart DOM animation (`gsap-animation` explicitly not loaded — all motion is engine-native).

Cross-checked (KZ-016) against every `BUT`/`AND IT MUST` clause in requirements §3 and against touched-module constraints (reports family raw-SQL pattern; child-guide no-hex/no-theme-branching; the previous spec's D-PD decisions, which this design extends rather than contradicts).

---

## 2. Architecture

### 2.1 Server slice (agresso-contract module — three additive touches)

1. **`GET reports/sp-alignment`** (eighth member of the reports family): repository method joining `buildPrimaryContractResultsSubquery()` → `result_pool_funding_alignment` (active) → `result_pool_funding_alignment_sp` (active) → `clarisa_science_programs` (display metadata) → `results` (official code, title). One SQL pass, grouped client-of-the-repository-side into the `sps[]` shape; `sp_role NULL → 'UNKNOWN'` mapped in SQL (COALESCE), never in the client. The two counters (`results_with/without_alignment`) come from the same subquery with an EXISTS split.
2. **`results-summary` extension** (D-DA-2): one more grouped query `by_indicator_year[{indicator_id, year, count}]` appended to the existing DTO — additive field, existing fields untouched (D11 gate: previous spec's tests stay green).
3. **`findOneContract` payload extension** (D-DA-3): add `funding_type`, `center_amount_usd`, `sdgs` (already a json column), and `cgiar_entities[]` (join `pooled_funding_contracts`) to the existing per-contract response. `contract_status`/`status_name` already present. Additive; interface extended client-side.

**Composition:** `agresso-contract.controller.ts` (+1 handler), `agresso-contract.service.ts` (+1 pass-through), `repositories/agresso-contract.repository.ts` (+2 methods, 1 extension), `dto/contract-sp-alignment-report.dto.ts` (NEW), `dto/contract-results-summary-report.dto.ts` (extended). Sibling specs extended in the established mock style; repository specs assert generated SQL + params (KZ-001).

### 2.2 Client slice

```
shared/
├── components/viz-chart/viz-chart.component.{ts,html}   # NEW — the ONE engine wrapper (D-DA-1):
│                                                        #   input: EChartsOption + accessibleName + tableModel
│                                                        #   renders SVG-renderer chart + visually-hidden table
│                                                        #   re-themes via chart-tokens.util on the theme signal
│                                                        #   sets animation:false under prefers-reduced-motion
├── utils/chart-tokens.util.ts                           # EXTENDED — series-2..n + ramp resolution
├── services/api.service.ts                              # + GET_ContractSpAlignment
├── services/get-contract-sp-alignment.service.ts        # NEW — sibling signal-triple shape
└── interfaces/{contract-sp-alignment,…}.interface.ts    # NEW/extended (incl. GetProjectDetail additions)
pages/platform/pages/project-detail/components/
├── sp-alignment-graph/                                  # NEW — graph widget (R-DA-003)
├── project-context-strip/                               # NEW — context strip (R-DA-005)
├── project-dashboard-card + indicator card region       # EXTENDED — bars↔heatmap toggle (R-DA-004)
├── results-trend-card/                                  # ENGINE SWAP (R-DA-006) — p-chart → viz-chart
└── project-dashboard.component.{ts,html}                # layout: context strip under KPI row; SP graph
                                                         # in the analytics grid (bilateral contracts only)
src/styles/colors.scss + client README + docs/ux-ui/design.md §7   # token registry (R-DA-008)
```

**Dependency change:** `echarts` added; `chart.js` + `chartjs-plugin-datalabels` removed. The wrapper imports from `echarts/core` and registers exactly: GraphChart, HeatmapChart, LineChart, Grid/Tooltip/Legend/VisualMap components, SVGRenderer. No `ngx-echarts` (D-DA-1).

### 2.3 Reuse

Previous spec's `chart-tokens.util` + theme signal (D-PD-5), async three-state pattern, `get-project-detail.service` (context strip consumes the extended payload through it — no new fetch), `results-summary` service (matrix rides the same request), pool-funding predicate surfaced via existing `BilateralService.getContract` badge data for the bilateral-visibility rule (D-DA-5).

---

## 3. Data model

No schema changes, no migrations. Read-only joins into `result_pool_funding_alignment(_sp)`, `clarisa_science_programs`, `pooled_funding_contracts`.

---

## 4. API surface

### GET /api/v1/agresso/contracts/reports/sp-alignment
- **Controller/roles/guards/Swagger:** identical posture to the seven existing family members (`contract-id` query param via `ApiContractReportQueries`; authenticated; 400 on empty id).
- **Data shape:** `{ sps: [{ sp_code, name, category, icon_key, links: [{ result_official_code, result_title, role }] }], results_with_alignment, results_without_alignment }` — `role ∈ 'PRIMARY'|'CONTRIBUTING'|'UNKNOWN'`.
- **Errors:** empty id → 400; unknown/non-bilateral contract → 200 with `sps: []` + counters.

### results-summary (extended)
- `+ by_indicator_year: [{ indicator_id, year: number|null, count }]` — absent pairs emit no cell (R-DA-002 `BUT`); null-year bucket consistent with `by_year`.

### findOneContract payload (extended)
- `+ funding_type, center_amount_usd, sdgs, cgiar_entities[{ code, name }]` — additive; nullable fields stay nullable (no-fabrication rule renders absence).

---

## 5. Workflows & business rules

1. **Load:** dashboard effect triggers, as today, one `results-summary` call (now carrying the matrix) + one `sp-alignment` call **only when** the contract is bilateral (predicate from the already-fetched contract data — D-DA-5); context strip renders from the shared project service (zero extra requests).
2. **SP graph:** nodes = SPs (size ∝ link count, label always) + results (label = official code); edges styled per role — weight+pattern+legend, not color alone; `emphasis.focus: 'adjacency'` on hover/focus; result-node activation navigates to `/result/:code`. Non-bilateral → widget omitted; bilateral with `sps: []` → absent-state card (D-DA-5, user-overridable at the gate).
3. **Bars↔heatmap toggle:** both views read the already-fetched matrix (no refetch — R-DA-004 `BUT`); shared dataset identity enables the Universal-Transition morph; toggle is a keyboard-operable segmented control with state announced; under reduced motion the swap is instant (R-DA-007).
4. **Theme:** viz-chart rebuilds its option colors from `chart-tokens.util` on the theme signal (same mechanism as the previous spec — attribute-driven, D-PD-14 stands).
5. **Reduced motion:** wrapper reads the media query once per init + on change, sets engine-level `animation: false`; adjacency emphasis remains (state, not motion).
6. No writes anywhere; no sockets/broker/OpenSearch side effects.

---

## 6. Frontend component architecture

| Concern | Decision |
|---|---|
| **viz-chart wrapper** | One standalone component owning: engine init (SVG renderer), option merge (base a11y/animation config + widget option), theme re-resolution, reduced-motion, resize observer, and the paired visually-hidden table rendered from a declarative `tableModel` input — so **no widget can ship a chart without its table** (R-DA-009 AC.1 enforced structurally). Registered in ux-ui §8 inventory. |
| **SP graph** | ECharts `graph` series, force layout, `roam` limited to zoom (no free pan drift); role legend with the three treatments; NFR-DA-005 cap: >150 result nodes → top-N by recency + disclosed "showing N of M" line. |
| **Heatmap** | ECharts `heatmap` + VisualMap (continuous, ramp tokens); rows = indicators, columns = years; cell labels on when densities are few, tooltip always. |
| **Context strip** | Native DOM (no chart) — tiles/chips + a CSS timeline bar (elapsed % clamped); SDG chips follow existing SDG display conventions; absent field → absent chip (S2 rule). |
| **Trend card** | Same visual contract on `viz-chart` (line series, y-min 0, dashed in-progress year, sparse fallback untouched — that branch never reaches the chart). |
| **Motion** | Entry: per-widget `animationDelay` stagger (≤400 ms total); graph settle = its entry; morph via `universalTransition` between bars/heatmap series sharing dataset ids; escape valve: config flag downgrades morph to crossfade (decided at HITL, recorded — R-DA-007). |
| **Tokens** | `--ac-viz-series-2` (CONTRIBUTING treatment), `--ac-viz-series-3` (UNKNOWN neutral), `--ac-viz-ramp-1..5` (single-hue sequential, monotonic per theme) — light+dark, validator-gated, registered + mirrored (R-DA-008). SP catalog `color` column: badges only, never marks. |

---

## 7. Integration impact

None external. New client dependency `echarts` (Apache-2.0). No env vars, no cron, no events.

## 8. Security & authorization

New/extended endpoints keep the family posture (authenticated, no `@Roles`); alignment data exposed is counts/links of data the same user can already read per-result; no PII beyond existing exposure; no secrets.

## 9. Observability

Standard interceptor logging; region-level error states surface failures (previous spec's pattern). No new log lines.

## 10. Testing strategy

| Layer | Tests |
|---|---|
| Server | Repository specs: generated-SQL assertions (COALESCE→UNKNOWN, primary-scoped subquery, matrix GROUP BY) + fixtures with null-role/null-year rows; controller/service specs per family style; D11: previous spec's summary tests untouched and green |
| Client | viz-chart: table-pairing enforced (a chart without tableModel fails to render — structural test), reduced-motion init-option assertion (presence — D9 split declared), theme re-resolution on signal; widgets: rendered-DOM (KZ-001) for role legend incl. UNKNOWN, empty/absent states (bilateral AND non-bilateral fixtures — KZ-002), toggle no-refetch (HttpTestingController), context-strip no-fabrication fixtures; engine swap: previous trend tests green or realigned via failing suite (K-018) |
| Static | D1–D5, D8 gates per requirements §4.1 |
| Visual/motion (D6) | Mandatory HITL: light+dark screenshots + interaction pass (graph hover adjacency, morph, reduced-motion emulation) on Dev with a real bilateral contract |

## 11. Rollout

Server PR first (additive endpoints/fields — harmless unused). Client PR(s) after. Backout: revert client; server extensions are inert. No flags, no migrations. Release note: SP counts are primary-scoped (inherits D-PD-12 semantics).

## 12. Design decisions log

| # | Date | Decision | Rationale |
|---|---|---|---|
| D-DA-1 | 2026-08-22 | **In-house `viz-chart` wrapper over `echarts/core` + SVG renderer; no ngx-echarts** (closes OQ-1) | Full tree-shake + renderer control; one component enforces the a11y table pairing structurally; avoids a wrapper dependency whose Angular-version cadence we don't control. SVG renderer: crisper, lighter for our small datasets, and DOM-inspectable (KZ-001-friendlier than canvas) |
| D-DA-2 | 2026-08-22 | Matrix rides **`results-summary`** as an additive field (closes OQ-2) | One request already feeds KPIs/status/trend; the matrix is ≤~60 rows; a sibling endpoint would buy nothing but a second round-trip. D11 guards existing consumers |
| D-DA-3 | 2026-08-22 | Context fields extend the **existing `findOneContract` payload** (closes OQ-4) | The dashboard already holds this response via the shared service — zero new requests; fields are columns/joins on the same row |
| D-DA-4 | 2026-08-22 | `UNKNOWN` mapping happens **in SQL** (COALESCE), and the DTO enum carries it | One source of truth for the honesty rule; the client cannot re-interpret null |
| D-DA-5 | 2026-08-22 | SP widget **omitted** for non-bilateral contracts; **absent-state card** for bilateral with no alignments (default answer to OQ-5 — user may overrule at the gate) | A non-bilateral project can never have alignments — an empty card there is noise; a bilateral one without alignments is actionable information |
| D-DA-6 | 2026-08-22 | ToC contribution-vs-target rollup **deferred** to a follow-up spec (closes OQ-3 for this spec) | `quantitative_contribution` completeness on legacy data is unverified; shipping sums over unknown-quality data violates the no-fabrication discipline. Follow-up starts with a data-quality measurement |
| D-DA-7 | 2026-08-22 | Motion is engine-native only; `gsap-animation` not loaded; morph has a config-level crossfade fallback | All required motion (stagger, adjacency, morph) is first-class in the engine; a second animation system is surface without benefit |
| D-DA-8 | 2026-08-22 | New tokens limited to two series treatments + a 5-step ramp | Smallest validated set that covers roles + density; more series tokens wait for a real consumer |

### Reversion challenge (Step 2.3) — outcomes

| Reversion | Challenge ("what does removing this break?") | Response |
|---|---|---|
| Remove `chart.js`/`chartjs-plugin-datalabels` + the only `p-chart` (`ChartModule`) usage | Discharged with independent scout evidence (2026-08-22 grep sweep): **exactly one consumer** — `results-trend-card` (`ChartModule` import :12, `<p-chart>` :62); zero direct `chart.js` imports anywhere in `src/`; no other `ChartModule` registration. Breakage surface = that card's engine-specific test assertions | R-DA-006 AC.2: engine-agnostic tests stay green; engine-specific ones realigned via failing suite (K-018) |

## 13. Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Tasks | **13** |
| LOC (churn, both packages, incl. tests) | **~1,600** (server ~350; client ~1,250) |
| Review rounds | **2** |

Standard depth holds at its upper edge (no schema/auth risk; one new dependency is the largest single risk and is gate-covered). If execution trips the budget, the first candidate to descope is the morph (crossfade fallback ships the same information).

## 14. Open questions

- OQ-5 default answered by D-DA-5 — confirm at this gate.
- OQ-3 closed by D-DA-6 (deferred) — confirm at this gate.

## 15. References

Proposal v2 §10.1 (library evaluation) · previous spec design (D-PD-5/12/13/14) · scout reports 2026-08-22 (bilateral data availability; single-consumer chart.js evidence).
