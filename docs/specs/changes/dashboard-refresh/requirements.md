# Requirements — Changes / Project-dashboard refresh

- **Spec path:** `changes/dashboard-refresh` · **Type:** Change · **Depth:** Lite (2 tasks)
- **Approval Mode:** proposal approved by owner 2026-08-25 ("ye"); phase gates: `auto-approved (owner mandate "como prefieras adelante")`
- **Source:** `./proposal.md`

## Summary
The dashboard must show current data when the reader returns to it, and must offer an explicit Refresh control.

## Scope
In: `project-detail.component.ts` (leave invalidation), `project-dashboard.component.{ts,html,spec.ts}` (button + orchestrator), `get-contract-dashboard.service.ts`, `get-contract-insights.service.ts`, `get-clarisa-project.service.ts` (+ specs). Out: server, results-center table, AI regeneration policy (unchanged).

## Functional requirements

### R-DRF-001 — Fresh data on return
Leaving the project route SHALL invalidate the contract's dashboard-report, insights and CLARISA-project caches so the next visit re-fetches them.
#### Scenario: back from a result
- GIVEN the dashboard for contract X was loaded and the user navigated to `/result/:code` (project-detail destroyed)
- WHEN the user returns to `/project-detail/X/project-dashboard`
- THEN `GetContractDashboardService`, `GetContractInsightsService` and `GetClarisaProjectService` each issue a new request for X
- BUT it must NOT invalidate other contracts' entries
- AND IT MUST keep the existing `GetProjectDetailService.invalidate(X)` behavior.

### R-DRF-002 — Explicit Refresh control
The dashboard hero SHALL render an icon-only Refresh button (`pi pi-refresh`, accessible name "Refresh dashboard data", 32 px hit area, tokens only) that force-reloads project detail, dashboard report, insights and CLARISA project.
#### Scenario: click refresh
- GIVEN the dashboard is loaded
- WHEN the user activates Refresh
- THEN all four sources reload with `force`, the button is `disabled` + `aria-busy="true"` until every reload settles, then re-enabled
- BUT it must NOT clear or auto-regenerate the executive overview (generation stays user/first-load driven — `project-dashboard.component.ts:1671` rule)
- AND IT MUST be hidden/disabled while the initial load skeleton is showing (no double-load).

## NFRs
- NFR-DRF-001: keyboard operable (Enter/Space), focus stays on the button after refresh.

## Defect classes → gate
| Class | Gate |
| --- | --- |
| Cache not invalidated on leave | service/component spec asserting a second `load` after `invalidate` hits the API (HttpTestingController) — **red if invalidate call removed** |
| Refresh reloads only some sources | dashboard spec spies: 4 loads with `force: true` |
| Overview regenerated on refresh | spec asserts `generateExecutiveOverview` NOT called on refresh |
| Visual placement | jsdom cannot — owner glance on D514 |

## Index: R-DRF-001, R-DRF-002, NFR-DRF-001
