# Archive Summary — Spec Family: Project Dashboard v3 (container)

## 1. Document Control

| Field | Value |
|---|---|
| Original path | `docs/specs/changes/project-dashboard-v3/` (family container — `family.md` manifest only) |
| Archive date | 2026-08-24 |
| Final status | **Family complete — 4/4 children done, each individually archived** |
| Approval | Owner approved the `complete` flip and this container archive in-session (2026-08-24) |

## 2. Children (execution order, each with its own full archive)

| # | Child | Outcome | Archive |
|---|---|---|---|
| 1 | f1-hero-layout | done (client-only hero/interactivity pass) | `archive/2026-08-2x-changes--project-dashboard-v3--f1-hero-layout/` (prior session) |
| 2 | f2-consolidated-endpoint | done — clean run, 0 rework | `archive/2026-08-24-changes--project-dashboard-v3--f2-consolidated-endpoint/` |
| 3 | f3-indicator-deep-dive | done | `archive/2026-08-24-changes--project-dashboard-v3--f3-indicator-deep-dive/` |
| 4 | f4-advanced-insights | done — 1 Pivot (D-F4-7/D-F4-8), owner HITL approved | `archive/2026-08-24-changes--project-dashboard-v3--f4-advanced-insights/` |

## 3. Family outcome

The Project Dashboard went from counter to decision instrument: unified hero (F1), one consolidated `reports/dashboard` aggregate replacing 9 GETs (F2), lazy per-indicator deep-dive via `reports/indicator-details` (F3), and the cross-cutting Insights section via `reports/insights` (F4). One shared idiom family-wide: primary-contract seed subquery + `Promise.allSettled` named sections + viz-chart/tableModel.

## 4. Historical notes

Split rationale, MoSCoW/RICE ordering, dependency graph and the Closed-Set Rule live in `family.md` (preserved unchanged in this folder). Child cross-references to `../family.md` inside the four child archives are point-in-time records, intentionally left as written (KZ-013 note: forward references resolved; the backward grep at this archive found no live-doc references outside archives).
