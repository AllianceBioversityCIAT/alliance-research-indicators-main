# Design — Changes / Project-dashboard refresh
- **Depth:** Lite · gates auto-approved (owner mandate)

## Summary
Mirror the existing per-id invalidate pattern (`GetProjectDetailService`, K-016 family) onto the three dashboard services, and add one orchestrator `refreshAll()` in `project-dashboard.component.ts` driving a single `refreshing` signal bound to a hero icon button.

## Decisions
| # | Decision | Why |
| --- | --- | --- |
| DD-1 | Invalidate in `project-detail.component.ts` `ngOnDestroy` next to the existing call (services expose `invalidate(id)`; add it to dashboard + insights, reuse CLARISA's) | one place, same lifecycle as the existing invalidation |
| DD-2 | `refreshAll()` = `Promise.allSettled` of `getProjectDetailService.invalidate+load`, `contractDashboard.load(id,{force:true})`, `insights.load(id,{force:true})`, `clarisaProject.invalidate(id)+load(id)` | `allSettled` so one failure doesn't strand the busy state; each region keeps its own error UI |
| DD-3 | Button in Act 1 hero header, right-aligned beside the context chips, `pButton` text/rounded severity secondary, `h-8 w-8` | consistent with chart-explainer hit-area precedent (D-CXP-4) |
| DD-4 | Do not touch executive-overview generation | its auto-generation is first-load-only by design |

## Reversion challenge: nothing removed — skipped by rule.
## Budget: 2 tasks · ≈ 120 LOC (≈ 40 code, ≈ 80 spec) · 1 review round each.
