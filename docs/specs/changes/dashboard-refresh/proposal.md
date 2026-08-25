# Proposal — Changes / Project-dashboard refresh (explicit button + fresh data on return)

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `changes/dashboard-refresh` |
| Slug | `dashboard-refresh` — derived from the owner's request ("adicionar un botón de refresh para el dashboard…") |
| Type | **Change** |
| Approval Mode | gated (proposal needs owner approval; owner's "adelante" covered routing, not this scope) |
| Depth (expected) | Lite–Standard (2 tasks) |
| Depends on | none · Parallel-safe: yes (touches dashboard shell + 3 shared data services; no server) |
| Author / date | Leader session, 2026-08-25 |

## Intent
After creating/editing a result and returning to `/project-detail/:id/project-dashboard` (browser back or in-app link), the dashboard must show current data — and the reader must have an explicit **Refresh** control when they want to re-pull.

## Problem / Current Behavior
- `GetProjectDetailService` is invalidated in `project-detail.component.ts` `ngOnDestroy` → KPI counts refresh on return.
- `GetContractDashboardService`, `GetContractInsightsService`, `GetClarisaProjectService` dedupe by `loadedContractId` and are **never invalidated on leave** → tops / trend / SP flows / insights / executive overview stay stale until a hard page reload.
- No refresh affordance exists on the dashboard (only scoped retries on error regions).

## Proposed Outcome
1. **Fresh on return:** leaving the project route invalidates the three dashboard caches for that contract (same pattern `GetProjectDetailService` already uses — K-016 family: per-id invalidate, not TTL).
2. **Explicit Refresh:** a `pi pi-refresh` icon button in the dashboard hero (Act 1 header, right of the caveat/context chips), accessible name "Refresh dashboard data", `aria-busy` while in flight, disabled during any dashboard load; it force-reloads project detail + dashboard report + insights + CLARISA project (executive overview regenerates only if its input digest changed — reuse existing `project_context` flow, do not re-call the AI endpoint unconditionally).

## Scope
- `client/.../project-detail/project-detail.component.ts` (`ngOnDestroy` invalidations), `project-dashboard.component.{ts,html,spec.ts}` (button + `refreshAll()`), `get-contract-dashboard.service.ts` (already has `force`), `get-contract-insights.service.ts` + `get-clarisa-project.service.ts` (add/confirm `invalidate(id)`), specs.

## Non-Goals
- Auto-polling / websockets; server changes; refreshing the results-center table (own state persistence).

## Affected Users, Systems, And Specs
- All dashboard readers; specs `changes/project-dashboard-redesign` (archived, hero layout), `changes/executive-overview-grounded-context` (AI overview regeneration rules — must not be broken).

## Visual Reference
- Source: None (single icon button using existing tokens; placement described above). Optional mockup not needed.

## Requirement Delta Preview
### ADDED
- Refresh button (a11y name, busy/disabled states, 32 px hit area per chart-explainer precedent D-CXP-4).
- `refreshAll()` orchestrating forced reloads with a single loading state.
### MODIFIED
- Dashboard-related services invalidated per contract on route leave (currently only project detail).
### REMOVED
- none.

## Approach Options
| # | Option | Trade-off |
| --- | --- | --- |
| A | Invalidate-on-leave only | Fixes the back-navigation case; no control for "data changed while I'm here" |
| B | Button only (force reload) | Gives control but back-navigation still shows stale data until clicked |
| C | **Both** (A + B) | Two small pieces; covers both reported symptoms |

## Recommended Approach
**C.** A is a 3-line mirror of an existing pattern; B is one button + one orchestrator method. Guard: the AI executive overview must not regenerate on every refresh unless its digest changed (cost + K-016 latency signalling).

## Risks, Dependencies, And Open Questions
- Concurrent session on `project-dashboard.component.*` (`dashboard-chart-refinements` active) — coordinate commits.
- OQ-1: should Refresh also re-run the AI executive overview when the digest is unchanged? Proposed: no.
- KZ-015: tests must arrange the leave→return transition, not a pre-invalidated state.

## Success Criteria
- Create a result → back to dashboard → tops/trend/flows reflect it without page reload.
- Refresh button re-pulls all four sources; button announces busy; no duplicate AI calls when digest unchanged.

## Next Step
```text
/akili-specify changes/dashboard-refresh   (Lite/Standard)
```
