# Proposal — Project Dashboard v3 / F4: Advanced Cross-Cutting Insights

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/project-dashboard-v3/f4-advanced-insights/` |
| Parent Spec | `changes/project-dashboard-v3` (see `../family.md`) |
| Type | Change |
| Approval Mode | gated |
| Depends on | `f2-consolidated-endpoint` (metrics land as new DTO sections) |
| Parallel-safe | no |
| Date | 2026-08-23 |
| Author | JuanCode (via AKILI-SPECS) |
| Status | Proposed (exploratory — expect scope trimming at specify) |

## 2. Intent

Exploit the cross-cutting result metadata that exists in the DB but is exposed nowhere, turning the dashboard from a counter into a decision instrument: equity of reach, thematic map, reporting quality, review bottlenecks, and target attainment.

## 3. Problem / Current Behavior

The `results` satellite tables hold analysis-grade fields no dashboard endpoint reads: `result_actors` (gender×youth disaggregation), `result_sdgs`, `result_keywords`, `result_evidences`, `result_review_history` (event/decision/justification per version), `results.platform_code` / `is_ai` / `is_synced_to_prms` / `created_at`, `result_levers` contributing rows (`is_primary = FALSE`), and `result_pool_funding_toc_alignment` (`target_value`, `quantitative_contribution`). The PI cannot see reach equity, topics, evidence quality, where reviews stall, or progress against ToC targets.

## 4. Proposed Outcome

Candidate metric set (each lands as a section of `reports/dashboard` or a sibling lazy endpoint; final cut decided at specify with the owner):

| Metric | Source | Visual | Decision it enables |
|---|---|---|---|
| Gender×youth reach | `result_actors` | stacked bars | equity of reach (richest untapped dataset) |
| Result SDGs | `result_sdgs` | chips with counts | actual coverage vs contract-declared SDGs |
| Keyword map | `result_keywords` | treemap | thematic portfolio profile |
| Evidence completeness | `result_evidences` | KPI % + public/private split | reporting quality |
| Review funnel + cycle time | `result_review_history` | funnel + duration stats | where and why results stall |
| Platform origin | `results.platform_code` | donut | source mix (pairs with the caveat) |
| AI-assisted / PRMS-synced share | `is_ai`, `is_synced_to_prms` | KPIs | data governance |
| ToC target vs actual | `result_pool_funding_toc_alignment` | bullet chart | attainment against `target_value` |
| Contributing levers | `result_levers` (`is_primary=FALSE`) | secondary bars | full lever picture (only primaries counted today) |
| Lever→indicator flow | join | Sankey | portfolio structure at a glance |

`viz-chart` additions this chunk: `TreemapChart`, `SankeyChart` (+ `GaugeChart` only if the bullet form needs it).

## 5. Scope

- **Server**: new aggregate queries over the shared seed (all read-only; no migrations), extending the F2 DTO or one lazy `reports/insights` endpoint (decided at specify); Swagger + specs.
- **Client**: new widget components under project-detail; chart registrations; `tokens:validate`.

## 6. Non-Goals

- No workflow/status changes, no new capture forms — read-only analytics over existing data.
- No PRMS/TIP/AICCRA enrichment work.
- No ML/forecasting; "insights" here means aggregation, not inference.

## 7. Affected Users, Systems, And Specs

- **Users:** PIs, M&E teams, center admins.
- **Systems:** server `agresso-contract` (+ read-only joins), client project-detail, shared viz-chart.
- **Specs:** TRD API + data-model notes; design.md component registry.

## 8. Visual Reference

- Source: None yet (metric table in the analysis artifact — `family.md` link, §7).
- Location: n/a.
- Notes: mockup recommended at specify for the widgets that survive the scope cut.

## 9. Requirement Delta Preview

### ADDED
- The selected subset of the 10 candidate metrics as dashboard sections/widgets; Treemap/Sankey chart forms.

### MODIFIED
- Dashboard DTO (new nullable sections) or one new lazy endpoint.

### REMOVED
- Nothing.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| A. Curated cut at specify (recommended) | Owner picks ~4-6 metrics by decision value; rest recorded as backlog rows here | Keeps the chunk bounded; backlog preserved in this proposal |
| B. Ship all 10 | Full sweep in one spec | Largest surface in the family; review and HITL cost balloons |
| C. One-per-quick | Ship each metric as `/akili-quick` | These are not trivial (new queries + widgets); quick's escalation rule would bounce them back anyway |

**Recommended: A.**

## 11. Risks, Dependencies, And Open Questions

- **KZ-012 (open lesson, carried from archive)**: `platform_code` is `nullable: true` and NULL is classified as STAR by assumption in three layers. The platform-origin donut **must** first answer `SELECT platform_code, COUNT(*) FROM results GROUP BY platform_code;` on dev and define the NULL bucket explicitly — this chunk is where that open question gets settled or the metric gets cut.
- **KZ-001**: funnel/cycle-time aggregates over `result_review_history` must be asserted on generated SQL with realistic event sequences (out-of-order events, missing decisions).
- **Sparsity/representativeness**: every metric carries its `n`; metrics with structurally missing data for imported results state so inline (caveat pairing).
- **OQ-1**: `result_review_history` payload columns may be large (`payload_before/after`) — aggregates must never select them.
- **OQ-2**: ToC bullet applies only to pool-funding-aligned results — confirm whether it renders for bilaterals without ToC alignment or collapses under F1's empty rule.

## 12. Success Criteria

- The approved metric subset renders with correct `n` and drill-through where a results-table filter exists.
- Platform-origin NULL handling decided and documented (KZ-012 closed or explicitly re-carried).
- No regression in dashboard first-paint; budgets and suites green both tiers.

## 13. Next Step

```text
/akili-specify changes/project-dashboard-v3/f4-advanced-insights
```
*(after f2 is done; expect a scope-cut conversation first)*
