# Proposal — Project Dashboard v3 / F3: Indicator Deep-Dive

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/project-dashboard-v3/f3-indicator-deep-dive/` |
| Parent Spec | `changes/project-dashboard-v3` (see `../family.md`) |
| Type | Change |
| Approval Mode | gated |
| Depends on | `f1-hero-layout` (reserved layout slot), `f2-consolidated-endpoint` (service/DTO pattern) |
| Parallel-safe | no |
| Date | 2026-08-23 |
| Author | JuanCode (via AKILI-SPECS) |
| Status | Proposed |

## 2. Intent

Surface the metadata that is **exclusive to each indicator type** — today stored in six satellite tables and readable only result-by-result — as a per-project, tabbed deep-dive panel, so the PI sees *what kind* of results the project produces, not just how many.

## 3. Problem / Current Behavior

Each indicator type has a rich detail table (`result_capacity_sharing`, `result_innovation_dev`, `result_policy_change`, `result_knowledge_products`, `result_oicrs`; Innovation Use reuses `result_actors`/`result_quantifications`/`result_institution_types`). **No endpoint aggregates any of them per contract** — the only bulk reader is the global flat export `GET /results/general-report/all` (not contract-scoped, no aggregation). The dashboard therefore cannot answer questions like "how many people did this project train, and at what gender split?" even though the data exists.

## 4. Proposed Outcome

- **`GET /api/v1/agresso/contracts/reports/indicator-details?contract-id=`** — aggregates over the same primary-contract seed subquery, one named section per indicator type (sections only for indicators with results):

| Indicator | Source | Aggregates |
|---|---|---|
| Capacity Sharing (1) | `result_capacity_sharing` | total trainees; gender split (M/F/NB); short vs long format; delivery modality mix; session purpose mix |
| Innovation Dev (2) | `result_innovation_dev` | readiness-level (IRL) histogram; type/nature mix; anticipated users; 7 scalability booleans (radar); varieties count |
| Knowledge Product (3) | `result_knowledge_products` | open-access %; access-status mix; type mix; publication-date timeline |
| Policy Change (4) | `result_policy_change` | policy-stage funnel; policy-type mix; implicated institutions (role 4) |
| OICR (5) | `result_oicrs` | maturity-level distribution; external-use share |
| Innovation Use (6) | `result_actors` + `result_quantifications` + `result_institution_types` | gender×youth reach; org-type mix; quantifications by unit |

- **Client**: "Indicator deep-dive" panel beside Results by indicator (slot reserved by F1), tabs per indicator-with-results; **lazy-loaded when the panel enters the viewport** — no first-render cost. While loading, an explicit skeleton (K-016: the user must be able to tell "not yet" from "broken").
- **viz-chart**: register `PieChart`, `FunnelChart`, `RadarChart` (tree-shaken, inside the lazy project-dashboard chunk).
- **Reporting velocity**: monthly `results.created_at` line added as a `summary` extension — the answer to "Results over time" being empty when only one report year exists.

## 5. Scope

- **Server**: repository aggregate methods (SQL joins liftable from `result.repository.ts` `general-report/all`, re-scoped to the contract seed), controller handler + Swagger, DTO + specs. Lookup joins: `session_formats`, `clarisa_innovation_readiness_levels`, `policy_stage`, `policy_types`, `maturity_levels`, etc.
- **Client**: `GET_IndicatorDetails` in `api.service.ts`, one service, deep-dive panel component(s) under project-detail, viz-chart chart registrations + `tokens:validate` run.

## 6. Non-Goals

- No changes to per-result editing screens or the satellite tables themselves (read-only aggregation; no migrations — K-015 not in play).
- No cross-cutting metrics (SDGs, keywords, evidence, review funnel — F4).
- No AICCRA/PRMS/TIP enrichment beyond what the satellite tables already hold (the existing caveat covers source variance).

## 7. Affected Users, Systems, And Specs

- **Users:** PIs and research teams — the primary informational win of the family.
- **Systems:** server `agresso-contract` module (+ read-only joins into result satellite tables), client project-detail, shared viz-chart.
- **Specs:** TRD API contracts + data-model reading notes; `docs/ux-ui/design.md` component registry gains the deep-dive panel.

## 8. Visual Reference

- Source: None yet (metric table in the analysis artifact, `family.md` link, §6).
- Location: n/a.
- Notes: **recommend generating a Stitch mockup at `/akili-specify` time** — this is the one child with a genuinely new UI surface (tabbed panel, radar/funnel forms).

## 9. Requirement Delta Preview

### ADDED
- `reports/indicator-details` endpoint; deep-dive tabbed panel; Pie/Funnel/Radar chart forms; monthly velocity metric.

### MODIFIED
- Results-by-indicator region becomes the entry point (bar/heatmap click focuses the matching deep-dive tab).

### REMOVED
- Nothing.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| A. Dedicated lazy endpoint (recommended) | Own route, loaded on viewport entry | Heavy 6-way aggregate never blocks first render; clean cache boundary |
| B. Sections inside `reports/dashboard` | Extend F2's DTO | One request, but the heaviest queries gate the whole dashboard's first paint — against the family's latency stance |
| C. Client-side aggregation from per-result endpoints | Reuse existing by-result reads | N+1 explosion; moves aggregation logic into the client; violates the server-as-system-of-record posture |

**Recommended: A.**

## 11. Risks, Dependencies, And Open Questions

- **KZ-001**: aggregate correctness must be asserted on **generated SQL + real fixtures** per table (gender splits, funnel ordering) — mocked query builders cannot represent operator precedence.
- **KZ-017**: per-indicator specs must declare which satellite tables a check cannot reach (e.g., Innovation Use has no dedicated table; its metrics come from three shared tables that other indicators also write).
- **Data sparsity risk**: satellite completeness varies by source platform (PRMS/TIP/AICCRA imports lack STAR metadata) — every aggregate must carry an `n` (results contributing) so the PI can judge representativeness; ties into the existing caveat copy.
- **OQ-1**: gender vocabulary — `result_capacity_sharing` has explicit M/F/NB columns; `result_actors` uses women/men × youth. Confirm display labels with the owner (CLARISA vocabulary check, C-3).
- **OQ-2**: does the panel deep-link (query param `deepDive=<indicatorId>`) for sharing? Cheap if decided at specify.

## 12. Success Criteria

- For a project with capacity-sharing results, the panel answers trainees total + gender split without opening any result.
- Each aggregate displays its `n`; indicators with 0 results show no tab.
- First dashboard paint time unchanged (endpoint fires only on viewport entry).
- `tokens:validate` passes with the new chart forms; bundle budgets hold (C-5); suites green both tiers.

## 13. Next Step

```text
/akili-specify changes/project-dashboard-v3/f3-indicator-deep-dive
```
