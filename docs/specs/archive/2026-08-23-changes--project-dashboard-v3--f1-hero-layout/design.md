# Design — project-detail / Project Dashboard v3 · F1 Hero, Layout & Interactivity

- **Module:** client / project-detail (STAR)
- **Spec id:** 2026-08-project-dashboard-v3-f1
- **Status:** draft
- **Owner:** JuanCode
- **Linked requirements:** ./requirements.md
- **Linked baseline:** `docs/ux-ui/design.md` §6.1, §7.1, §12.2; client child guide (`client/research-indicators/src/CLAUDE.md`)
- **Last updated:** 2026-08-23
- **Visual language:** inherited — no new tokens, faces, or component idioms; this design recomposes §7.1 primitives. (`ui-ux-pro-max` not loaded: no new visual identity is created; the condition that would require it is absent.)

---

## 1. Goals & non-goals

**Goals**
1. One hero region; zero duplicated context facts (R-HL-001).
2. Every headline number actionable (R-HL-002, R-HL-005, R-HL-006).
3. Section order = decision value; empties collapsed (R-HL-003, R-HL-004).
4. Native morph on the indicator toggle without losing the keyboard drill path (R-HL-007, R-HL-009).
5. One spacing scale (R-HL-008).

**Non-goals:** any server change; new chart types; new endpoints; changes to the Project Results tab's behavior or appearance; the F3 deep-dive panel (slot reserved only).

> Cross-checked (KZ-016) against every `BUT`/`AND IT MUST` clause in requirements §3 and against module constraints: client child guide (standalone components, ApiService-only HTTP, token-only colors, viz-chart-only charts), and the §12.2 overlay decision (all overlays via `all-modals` + `modal` — see D-F1-5 for why the popover is not a modal).

## 2. Architecture

Client-only recomposition inside `pages/platform/pages/project-detail/`. Boundary fact that shapes everything: **the shell header (`project-detail.component`) renders on both tabs; the dashboard owns only its tab's content.** The hero therefore splits ownership (D-F1-1):

- **Shell** keeps the identity band (agreement id + title, department, tags, contacts aside) on both tabs — unchanged on Project Results.
- **Shell hides its fact rows (`<dl>` budget/dates/lever/foundress/division/unit) on the dashboard tab only** (conditional on the active tab segment, mirroring the existing `lastSegment()` mechanism).
- **Dashboard** renders the hero's analytics half: KPI row + context chip row (facts from both sources, each exactly once) directly under the shell identity band.

### 2.1 Composition (files touched; no new top-level components except the collapsed group)

- `project-detail.component.{html,ts}` — conditional fact rows; query-param contract extension (`leverTab`, `contractTab`, `yearTab`) beside the existing `statusTab`/`indicatorTab` handling (L79-122 pattern).
- `project-dashboard.component.{html,ts}` — hero KPI+context rows; section reorder; empty-collapse orchestration; morph flag default; drill handlers.
- `components/project-context-strip/` — **deleted**; its computed logic (amount formatting, timeline math, SDG/entity mapping) moves to the hero region of `project-dashboard.component.ts` (or a small hero child component if the template exceeds review comfort — implementer's call, one file either way).
- `components/project-dashboard-card/` — gains a `viz-bar` layout path delegating to `app-viz-chart` (horizontal bars + tableModel + click output); bespoke bar markups retired where replaced.
- `components/no-data-group/` — **new**, dumb list component: `{name, reason}[]` rows.
- `components/geo-scope-card/` — spacing normalization (`gap-16` → `gap-6`).
- `components/results-trend-card/` — click drill-through output; unchanged otherwise.
- `results-center.component.ts` — reads the three new query params and applies the matching existing filters (`levers`, `contracts`, `years`) via `ResultsCenterService`, following the exact `indicatorTab` pattern at L92-118.

### 2.2 Reuse

`viz-chart` (unchanged API: options + tableModel + chartClick), `chart-tokens.util`, `projectDashboardBarColor`, `custom-tag`, PrimeNG `Popover` (D-F1-5), existing skeleton/error/empty structures, `ResultsCenterService` filter methods (`onSelectFilterTab`, `applyStatusFilterFromHomeLink` siblings).

## 3. Data model

No data model changes.

## 4. API surface

No HTTP API changes. **Client navigation contract extension** (the only "API" here): Project Results tab accepts `leverTab` (lever id), `contractTab` (contract code), `yearTab` (report year) query params, validated numerically/format-checked exactly as `indicatorTab` is, cleared from the URL after application (existing pattern).

## 5. Workflows & business rules

1. **Hero field inventory (R-HL-001 checklist):** agreement id, title, department, pool-funding tag, status tag, contacts — shell. Total/center budget, funding type, timeline (start/end/extension + % elapsed), lever, foundress, division, unit, SDGs, CGIAR entities — dashboard hero chips. Sources per field as requirements §3 R-HL-001; three independent skeleton regions (project detail / contract payload / staff).
2. **Empty-collapse:** per-widget `empty` computed (exists today) feeds the section template: `loading || error || !empty` → widget in position; `empty` → row in `no-data-group`. Reasons are fixed strings per widget (copy in tasks). Retry from the group is not offered (retry lives on error states only — empties are confirmed data absence).
3. **Drill handlers:** chart `chartClick` → `Router.navigate` with the mapped param; every chart click has a DOM twin (sr-only link list or row link) for keyboard (R-HL-009).
4. **Morph:** `useCrossfadeFallback` default `false`; `prefers-reduced-motion` flips to the crossfade path at runtime (media query read once per render decision, not per frame).

## 6. Frontend component architecture

Section order and grid (desktop): hero (full width) → caveat line → Executive Overview → `grid-cols-2`: trend | status → indicator section (wide, morphing viz-chart + sr-only link list; F3 slot = documented comment, no DOM) → geo (full width) → `grid-cols-2`: rankings (partners, levers, contacts, contributors as viz-bar cards) | SP alignment (bilateral) → pending table → no-data-group → AI grounding. `md:` breakpoint collapses two-column rows to one column (existing `rs-*`/Tailwind responsive pattern). Spacing: `gap-5` sections / `p-5` cards / `gap-4` internals (R-HL-008).

Ranking-card affordances: axis labels truncate at the category axis; the HTML tooltip carries full label + count, plus contact e-mail and lever icon (ECharts DOM tooltips render HTML; icon via existing `s3-image-url` URL). Partner/contact bars: cursor default, no click handler (R-HL-005 accepted gap).

## 7. Integration impact / 8. Security / 9. Observability

None. No new secrets, roles, events, or logs. Existing route guards unchanged.

## 10. Testing strategy

- Co-located specs updated for every touched component; new specs for `no-data-group` and the viz-bar layout path.
- Navigation assertions on **Router.navigate args** through the real transition (KZ-015): construct with default state, assert no navigation, act, assert extras (KZ-001: fixtures mirror live payload shapes — SDG objects, staff shapes).
- Empty-collapse specs arrange load→empty and load→data transitions, plus the error-keeps-position case.
- **Site list for retired expectations (K-018):** apply the change, run the suite, let failures enumerate the specs pinning old layout/empty-states/fallback default — never a grep list.
- Spec-code type gate: `npx tsc -p tsconfig.spec.json --noEmit` delta vs 945 baseline (K-002).
- Visual/dark/motion: no automated gate (declared in requirements defect table) → mandatory HITL screenshots light+dark, desktop + `md:`, on the final task (KZ-014). Presence assertions recorded as presence only.

## 11. Rollout

Single release, no flag (pure client recomposition; rollback = revert commit). Deploys with the normal `dev` branch pipeline. No migration ordering concerns.

## 12. Design decisions log

| # | Date | Decision | Rationale |
|---|---|---|---|
| D-F1-1 | 2026-08-23 | Hero ownership split: shell keeps identity band on both tabs and hides its fact rows on the dashboard tab; dashboard renders KPI+context rows | Only arrangement that removes duplication on the dashboard while leaving Project Results pixel-identical (requirements non-goal); a shell-owned full hero would force dashboard data loading on both tabs |
| D-F1-2 | 2026-08-23 | Morphing indicator chart is paired with an sr-only list of real per-indicator links | Outcome of RC-2 (below): the retired fallback list was the keyboard drill path; the canvas/SVG chart click is pointer-only and `tableModel` carries no links |
| D-F1-3 | 2026-08-23 | Empty-collapse decided per-widget on the existing `empty` computeds; loading/error keep position | Cheapest mechanism; avoids a state machine; requirements R-HL-004 negative clauses map 1:1 |
| D-F1-4 | 2026-08-23 | Ranking cards keep `project-dashboard-card` shell, delegate chart body to viz-chart | Preserves title/description/skeleton/error/empty chrome and its specs; only the body changes |
| D-F1-5 | 2026-08-23 | Indicators-covered popover uses PrimeNG `Popover` (anchored, focus-managed, Escape-dismiss), not the `all-modals` host | §12.2's overlay decision governs *modals*; an anchored disclosure attached to its trigger is the popover idiom; routing a 4-row list through the global modal host would be heavier than the content it carries. Fallback if a11y review fails: inline disclosure panel |
| D-F1-6 | 2026-08-23 | Drill params extend the existing `indicatorTab`/`statusTab` contract (`leverTab`, `contractTab`, `yearTab`), applied in `results-center.component` then stripped from the URL | Proven pattern at `project-detail.component.ts:79-122` / `results-center.component.ts:92-118`; filters (`levers`, `contracts`, `years`) already exist in `tableFilters` |
| D-F1-7 | 2026-08-23 | Caveat compresses to one line + existing Learn-more expansion; copy unchanged | Copy was approved in the archived spec (D-PD-8); only prominence changes |
| D-F1-8 | 2026-08-23 | All drill navigations target the parent route `['/project-detail', :id]` + query param; Total results uses a new `resultsTab` param; the legacy `project-results` child becomes `redirectTo: ''` | Post-HITL fix: the `project-results` segment was only a broken relative redirect (`'../'`) — navigations to it rejected silently; the parent-route pattern is the one the working drills already used (execution.md Finding 1) |
| D-F1-9 | 2026-08-23 | Executive Overview and AI Grounding merge into ONE collapsible top section (`showOverviewSection`; `[hidden]` panel; default expanded) — **supersedes R-AIP-002's split placement** (archived `ai-overview-placement`) | Owner decision 2026-08-23 (execution.md Finding 2): description and document management belong together; single Expand/Collapse replaces the inner View-more |

### Reversion challenges (Step 2.3 — "what does removing this break?")

| RC | Reverted behavior | Named breakage | Resolution |
|---|---|---|---|
| RC-1 | `app-project-context-strip` removed as a section | Its spec file dies; docs citing it go stale (KZ-013) | Logic + copy migrate to hero; archive sync updates §12.2; backward-reference grep at close |
| RC-2 | `useCrossfadeFallback` true → false | **Concrete breakage found:** fallback bars mode's ranked rows are real `<a>` drill links — the only keyboard path to per-indicator filtering; engine-native chart click is pointer-only | D-F1-2 (sr-only link list). Without the challenge this shipped as an a11y regression that no jest gate would catch |
| RC-3 | Full-size empty-state cards removed | Specs pinning empty messages/markup fail | Expected; K-018 site list from the failing run; copy moves to no-data-group reasons |
| RC-4 | Shell fact rows hidden on dashboard tab | Risk of leaking the change to Project Results tab | Conditional keyed on the same `lastSegment()` the shell already switches on; results-tab regression spec pins the rows' presence there |

## 13. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 9 |
| LOC (net, template-heavy) | ~1,100–1,400 |
| Review rounds | 2 |

Standard depth confirmed against the finished design (matches the Phase 0 guess; no re-route). `/akili-execute` trips to the user if actuals exceed these.

## 14. Open questions

- OQ-2 **closed** → D-F1-5 (PrimeNG Popover, with inline-disclosure fallback).
- None open.

## 15. References

- Requirements: `./requirements.md` (R-HL-001…009, NFR-HL-001…003, defect table).
- Archived designs superseded on layout: `docs/specs/archive/2026-08-22-changes--project-dashboard-redesign/design.md` (layout placement), `--dashboard-advanced-analytics/design.md` (context-strip placement, crossfade default).
- Kaizen applied: KZ-001, KZ-002, KZ-013, KZ-014, KZ-015, KZ-016, K-002, K-018.
