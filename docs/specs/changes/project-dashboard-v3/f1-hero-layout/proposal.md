# Proposal — Project Dashboard v3 / F1: Hero, Layout & Interactivity (client-only)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/project-dashboard-v3/f1-hero-layout/` |
| Parent Spec | `changes/project-dashboard-v3` (see `../family.md`) |
| Type | Change |
| Approval Mode | gated |
| Depends on | none |
| Parallel-safe | no (rewrites `project-dashboard.component.*`, which every sibling also touches) |
| Date | 2026-08-23 |
| Author | JuanCode (via AKILI-SPECS) |
| Status | Proposed |

## 2. Intent

Make the dashboard read as **one** coherent surface: a single hero block answering "how is this project doing?", charts ordered by decision value, every headline number clickable, and no large empty boxes above the fold. **No API contract changes** — this chunk consumes exactly the endpoints the screen consumes today.

## 3. Problem / Current Behavior

Verified in `project-detail.component.html` and `project-dashboard.component.{ts,html}`:

1. **Duplicated context.** The shell header shows Budget, Start/End/Extension dates, Status; the `app-project-context-strip` repeats Total Budget, Status, Funding Type, and a Timeline built from the same dates. Two data sources (`GET .../results/count` vs `findOneContract`) render the same facts twice.
2. **Dead KPIs.** Of the 4 KPI tiles only "Pending revision" has an action (in-page anchor). "Total results", "Indicators covered", "Partner institutions" are static text.
3. **Empty widgets in prime positions.** "Top contributing projects" (empty by definition for most bilaterals — it counts *other* contracts contributing to this primary) and "Results over time" (declared sparse with a single report year) render large empty-state boxes high in the layout.
4. **Order inverted vs value.** The `3fr/1fr` grid gives the wide column to four top-N cards and squeezes Results by indicator / by status / over time / SP alignment into the narrow column.
5. **Static top-N cards.** Partners/levers/contacts/contributors are HTML bars (not `viz-chart`), with no drill-through.
6. **Inconsistent spacing.** Mixed `gap-4/5/6`, `p-4/4.5/5`; geo card uses an internal `gap-16` (the visible hole between "Top regions" and "Top countries").
7. **Dead code path.** `useCrossfadeFallback` is hard-set to `true`, so the implemented ECharts `universalTransition` bars↔heatmap morph never runs.

## 4. Proposed Outcome

- **Unified hero**: project identity (code, title, tags, department) + the 4 KPI tiles + compact context chips (budget, center budget, funding type, timeline progress, SDGs, CGIAR entities) in one block; `app-project-context-strip` content merges into it; the duplicate rows disappear. Caveat banner reduces to a single info line with the existing "Learn more" expansion.
- **Clickable KPIs**: Total results → Project Results tab; Indicators covered → popover listing indicators with counts, each linking to the filtered tab; Pending revision → existing anchor (kept); Partner institutions → scroll to partners widget.
- **Reorder by PI question**: activity (Results over time + Results by status) → what (Results by indicator, with the F3 deep-dive slot reserved beside it) → where (geo scope, full width) → with whom (partners/levers/contacts + SP alignment) → action queue (pending revision) → admin (AI grounding).
- **Empty-collapse rule**: any widget with no data collapses to a compact "No data yet" row grouped at the end, with the reason (e.g. "no other projects contribute to this one") — never a full-size empty card.
- **Interactivity**: top-N cards migrate to `viz-chart` horizontal bars with click → Project Results pre-filtered (lever filter exists today; partner/contact fall back to search or are non-navigating where no filter exists — resolved at specify); trend chart click → year-filtered results; status composition segments clickable (rows already are); enable the native morph (`useCrossfadeFallback = false`) with the crossfade kept as the reduced-motion path.
- **Spacing normalization**: `gap-5` between sections, `p-5` card padding, `gap-4` inside widgets; geo card `gap-16` → `gap-6`.

## 5. Scope

- `client/research-indicators/src/app/pages/platform/pages/project-detail/` — `project-detail.component.html` (header slimming), `project-dashboard.component.{ts,html}`, `project-context-strip` (absorbed), `project-dashboard-card` (viz-chart layouts), `geo-scope-card`, `results-trend-card`.
- Per **KZ-002** (enumerate by what renders): the route also renders shared `results-center-table`, `viz-chart`, `custom-tag`, `section-sidebar` — layout changes must be checked against them, and `viz-chart` gains no new chart types in this chunk.
- Co-located spec updates for every touched component; light/dark verified per changed screen (C-4).

## 6. Non-Goals

- No new endpoints, no changes to consumed payloads (that is F2).
- No new chart types registered in `viz-chart` (F3).
- No per-indicator metadata (F3) or new metrics (F4).
- No changes to the Project Results tab or the results table beyond receiving existing query params.

## 7. Affected Users, Systems, And Specs

- **Users:** PIs, research assistants, admins viewing any project dashboard.
- **Systems:** STAR client only.
- **Specs:** supersedes layout decisions D-PD-8/D-DA layout placement from archived `2026-08-22-changes--project-dashboard-redesign` and `--dashboard-advanced-analytics` (record deltas in `docs/ux-ui/design.md` decisions log).

## 8. Visual Reference

- Source: None (before/after layout blueprint embedded in the analysis artifact — `family.md` Document Control link).
- Location: <https://claude.ai/code/artifact/0ff68e48-630a-480f-8693-f5f4e04f271b> §3.
- Notes: F1 recomposes existing, already-styled components; a Stitch/Claude-Design mockup can be generated at `/akili-specify` time if the owner wants pixel-level review of the hero.

## 9. Requirement Delta Preview

### ADDED
- Unified hero block; KPI click actions; indicators-covered popover; empty-collapse rule with "No data yet" group; drill-through on top-N/trend widgets; morph-enabled indicator toggle.

### MODIFIED
- Section order; spacing scale; caveat banner presentation; top-N cards rendered via `viz-chart`; geo card internal grid.

### REMOVED
- `app-project-context-strip` as a separate section (content absorbed by hero); duplicate budget/date/status rows; full-size empty states for no-data widgets.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| A. Recompose in place (recommended) | Restructure `project-dashboard.component.html` + shell header; absorb context strip; keep all services untouched | Smallest diff surface; component spec churn contained to project-detail folder |
| B. New `dashboard-v3` component behind a flag | Build the new layout beside the old, flip route when done | Safer rollback but doubles maintenance and test surface for a purely visual change; no production flag infra exists |
| C. Full redesign including endpoint migration in one chunk | Do F1+F2 together | Couples visual review with contract migration; violates the family's clean seam and inflates review risk |

**Recommended: A** — the change is visual recomposition of proven components; the existing suites pin behavior.

## 11. Risks, Dependencies, And Open Questions

- **KZ-014 / KZ-015**: interactivity tests must arrange the transition (click → navigation) the product performs, and no checkbox flips without seen-red evidence; HITL visual verification (light + dark) is mandatory before close-out — the archived dashboard spec's F-1/F-2 escaped exactly this way.
- **OQ-1**: which drill-through target do partner/contact clicks get? The results table has no partner/contact filter today — options: search-term fallback, or non-navigating until F2 adds filter support. Decide at specify.
- **OQ-2**: does "Indicators covered" popover need keyboard/screen-reader treatment beyond PrimeNG popover defaults (C-4)?
- **Risk**: absorbing the context strip changes `GetProjectDetail`-vs-`findOneContract` field usage; the hero must state its single source per field to avoid re-introducing drift.

## 12. Success Criteria

- Budget/dates/status each rendered exactly once on the screen.
- All 4 KPI tiles have a working action; Total results lands on Project Results tab.
- No full-size empty widget above the pending-revision table for a bilateral project with 0 contributors and 1 report year.
- Morph runs between bars/heatmap (reduced-motion falls back to crossfade).
- Suites green; changed screens pass light+dark HITL; bundle budgets respected (C-5).

## 13. Next Step

```text
/akili-specify changes/project-dashboard-v3/f1-hero-layout
```
