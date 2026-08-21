# Proposal — Project Dashboard Redesign (data-viz, UX & token conformance)

## 1. Document Control

| Field | Value |
| --- | --- |
| Type | **Change** |
| Slug | `project-dashboard-redesign` — derived from free-text argument (*"cómo mejorarías esta sección … /project-detail/A1676/project-dashboard … think as a data science / frontend / UX expert"*) |
| Spec Path | `changes/project-dashboard-redesign` |
| Approval Mode | **gated** (default — no pre-approval mandate given) |
| Author | j.cadavid@cgiar.org |
| Date | 2026-08-21 |
| Status | Draft — pending approval |
| Depends on | none |
| Parallel-safe | yes (no active spec touches `pages/project-detail/**`; the one shared component, `results-center-table`, is consumed read-only) |

> **Evidence basis:** full code exploration of the live component tree (paths/lines cited below). The page could **not** be visually inspected this session (Chrome extension disconnected; the screenshot attached to the request did not reach the agent context) — every defect below is asserted from the templates/TS, which is sufficient for structure but not for rendered contrast. Attach the screenshot (or a fresh capture) at `/akili-specify` time.

## 2. Intent

Turn the Project Dashboard (`/project-detail/:id/project-dashboard`) from a hand-rolled list-of-numbers page into a genuinely analytical, token-conformant, accessible dashboard: real charts (including the missing time dimension), a scannable KPI layer, consistent loading/error/empty states, and dark-mode support — while fixing the worst data-transfer anti-pattern behind it.

## 3. Problem / Current Behavior

The page renders in `project-dashboard.component.{ts,html}` (564 LOC TS / 321 LOC HTML, **no SCSS**) plus `project-dashboard-card`, `geo-scope-card`, `geo-scope-map`, and a reused `results-center-table`.

| # | Defect | Evidence |
| --- | --- | --- |
| P1 | **Every "chart" is hand-built `div` + width-% styling.** No axes, legends, or real tooltips. `chart.js` ^4.4.7 + `chartjs-plugin-datalabels` are in `package.json` and imported **nowhere** in `src/`. | `project-dashboard.component.html:231-238, 283-303`; grep across `src/` |
| P2 | **"Results by indicator" / "Results by status" are ranked lists, not visualizations**; status list scrolls inside `max-h-[172px]`, hiding categories. | `html:202-305` |
| P3 | **No temporal view at all** — results-over-time is absent even though `year` exists on the results model (it is explicitly *excluded* from the pending-revision table). | `pendingRevisionExcludedColumns` |
| P4 | **Status chart fetches up to 10,000 full result rows client-side** just to count ~5 statuses (`GET_Results`, `limit: 10_000`, `buildStatusChartItems`). Silently truncates past 10k. | `project-dashboard.component.ts:459-476, 510-535` |
| P5 | **Zero design-token usage; 140+ hex literals** across the page + shell templates (66 in the dashboard HTML alone) and more in TS (`getIndicatorChartColor:551-558`, `'#1689CA'` fallback `:527`). Violates the client guide's no-hex rule and makes **dark mode structurally impossible** on this page (TRD §13.4 already flags this class of defect repo-wide). | explorer hex census |
| P6 | **Inconsistent async states.** "Results by indicator" has **no loading state** — it shows the *empty* message ("No results were found…") while the request is in flight; "Results by status" collapses error and empty into one message with no retry; no skeletons anywhere. | `html:274, 276-281` |
| P7 | **Duplicate fetch**: parent shell and dashboard both call `GET_ResultsCount(contractId)` into two separate signals. | `project-detail.component.ts:132` / `project-dashboard.component.ts:223` |
| P8 | **Information hierarchy inverted**: a ~90-word always-on caveat banner plus (for admins) the Grounding & AI-summary blocks consume the first screen before any metric appears. | `html:2-11, 13-144` |
| P9 | **Dead-end top-4 cards**: partners / levers / contacts / contributing projects are hard-capped at 4, with no drill-down or links. | `ts:210-213` |
| P10 | **A11y gaps**: bars `aria-hidden` with no per-segment accessible name or table fallback; `title=` tooltips unreachable by keyboard; ~10 `!important` overrides per PrimeNG button. | `html:31, 44, 231-238` |
| P11 | **Five byte-identical services** (`get-top-*`, `get-geo-scope`) and a 30-field all-optional `ProjectDashboardRankedItem` bag with render-time shape-guessing. | `@services/get-top-*.service.ts` |
| P12 | **The rank-bar palette fails color-vision/contrast validation** as a categorical set: `#358540/#7CB580/#1689CA/#345B8F/#112F5C` fails the normal-vision separation floor (worst adjacent ΔE 14.4 < 15) and `#7CB580` sits at 2.33:1 against the card surface (< 3:1). Measured with the dataviz palette validator, 2026-08-21. | `project-dashboard-chart-colors.constants.ts` |

## 4. Proposed Outcome

A user opening the Project Dashboard sees, in order: **(1)** a KPI strip (total results, indicators covered, statuses, partners), **(2)** real charts — a status composition (horizontal stacked bar + labeled breakdown; a donut was considered and rejected per data-viz form rules), indicator horizontal-bars, and a **results-by-year trend line** — with legends, tooltips, and drill-through links to the filtered Results Center, **(3)** the ranked cards and geo map, restyled onto `--ac-*` tokens so dark mode works, **(4)** the pending-revision table. The caveat becomes a compact dismissible/info affordance; admin AI-grounding moves below the analytics. Every async region has skeleton → data | error+retry | empty, distinctly. The status chart is fed by an aggregate endpoint, not a 10k-row download.

## 5. Scope

- **Client** `pages/platform/pages/project-detail/**` (dashboard, card, geo-scope components + shell header hex cleanup) and the constants file `project-dashboard-chart-colors.constants.ts`.
- Introduce charts via **Chart.js (already a dependency)** — through PrimeNG `p-chart` or a thin shared wrapper; datalabels plugin optional.
- Tokenization of colors/typography onto `--ac-*` / `.abc-*` / `.atc-*` / `.fs-*` (+ dark-mode verification of each pairing).
- Unified async-state pattern (skeleton components, error+retry, true empty) across all six data regions.
- **Server (Option B only):** one aggregate endpoint on the existing contracts-reports family (e.g. `GET /api/v1/agresso/contracts/:id/reports/results-summary` returning counts by status **and** by year) with Swagger decorators + sibling spec, replacing P4 and enabling P3.
- A11y: accessible chart names, visually-hidden data-table fallback, keyboard-reachable tooltips (WCAG 2.1 AA, PRD AC-Accessibility).

## 6. Non-Goals

- No change to the Project Results tab, Results Center, or the pending-revision table's columns/behavior (it is only re-consumed).
- No redesign of the AI grounding/executive-overview *functionality* — only its placement.
- No Mapbox replacement; `geo-scope-map` keeps mapbox-gl (its dev-facing error copy may get a friendlier string, nothing more).
- No new taxonomy or free-text fields (CLARISA rule untouched).
- Service consolidation (P11) is **Option C only** — not in the recommended slice.

## 7. Affected Users, Systems, And Specs

| Who / what | Effect |
| --- | --- |
| Contributors, Center Admins, MEL experts | Primary beneficiaries — the dashboard becomes readable and analytical (PRD G8, M12) |
| `client/research-indicators` | All UI work; bundle budget must absorb Chart.js (~70 kB gz) — PERF-1 check required |
| `server/researchindicators` (Option B) | One new read endpoint in the agresso reports family; no schema change, no migration |
| Specs | New folder `changes/project-dashboard-redesign`; no overlap with `changes/pool-funding-*` (different routes/components) |

## 8. Visual Reference

- Source: Generated mockup (design canvas / Claude Design preview)
- Location: `docs/specs/changes/project-dashboard-redesign/mockup/` (working sources: `Main.dc.html`, `States.dc.html`, `canvas.json`) · published canvas: https://claude.ai/code/artifact/4ec0fd7a-2e65-448b-a5ff-8a14b1a753a9
- Notes: two artboards — (1) proposed desktop layout (KPI strip, status stacked bar, results-over-time line, indicator bars, ranked cards, geo, pending table, collapsed AI summary) in light theme with the app's `--ac-*` token values and Space Grotesk/Barlow; (2) the unified skeleton/error/empty state pattern. All figures are **sample data**. **The user's original screenshot was not ingested** — attach it during `/akili-specify` for a before/after check.

## 9. Requirement Delta Preview

### ADDED
- KPI summary strip (total results, indicators with results, status split, partner count).
- Results-by-year trend chart (new data need — Option B endpoint or derived server-side).
- Real chart rendering (status stacked-bar composition, indicator h-bars) with legend, tooltip, drill-through link to the filtered results view. *(Amended at design: target is the Project Results tab, not the standalone Results Center, which clears contract scope on init — design D-PD-4.)*
- A validated chart palette: status colors semantic (green/blue/grey/orange/red from `--ac-*` tokens, never color-alone), replacing the failing rank palette (P12).
- Skeleton loading states; distinct error-with-retry vs empty states on every data region.
- Dark-mode rendering of the entire page (token-driven).
- Accessible chart alternatives (SR-visible data table / per-segment names).

### MODIFIED
- Caveat banner → compact dismissible note or info-icon popover.
- Admin Grounding & AI Executive Overview move below "Result analytics".
- All hex literals → `--ac-*` tokens / utility classes; fonts → `.fs-*`/existing font utilities.
- Status data source: client-side 10k-row count → aggregate endpoint (Option B).
- Top-4 cards gain "view all" affordance (modal or link) — counts stay top-4 by default.

### REMOVED
- The `limit: 10_000` `GET_Results` call from the dashboard (Option B).
- Duplicate `GET_ResultsCount` call (child reuses parent's signal via a shared service or input).

## 10. Approach Options

| Option | Content | Trade-off |
| --- | --- | --- |
| **A — Client-only visual pass** | Tokens, hierarchy, async states, Chart.js on *existing* data (status still computed client-side; no trend chart) | No server coordination, fastest; leaves P3 unsolved and P4 in place — the worst data-science defect survives |
| **B — A + one aggregate endpoint** *(recommended)* | Everything in A, plus `results-summary` (by-status + by-year) endpoint; kills the 10k fetch, enables the trend line | One small server task (controller+service+spec, no migration); still one bounded spec |
| **C — Full overhaul** | B + consolidate the five duplicate services + generic ranked-item typing + drill-down everywhere | Largest diff and test surface; refactor risk exceeds the visual goal — better as a follow-up chunk |

## 11. Recommended Approach

**Option B.** It is the smallest slice that resolves every *user-visible* defect class (P1–P10) **and** the one genuine data anti-pattern (P4) without opening the refactor front (P11). Chart.js is already a declared dependency, so the "new" library is bundle-weight we currently pay for in `package.json` hygiene anyway; the endpoint is a read-only addition to an existing reports controller family with established conventions.

## 12. Risks, Dependencies, And Open Questions

| Type | Item |
| --- | --- |
| Risk | Bundle budget (PERF-1): Chart.js must stay inside the lazy chunk, not the initial bundle — verify with a build measurement (K-004: see the gate fail first). |
| Risk | Dark-mode token pairings must be **contrast-verified in rendered DOM**, not asserted from token names (KZ-001; the pool-funding tab's `bg-[#fcfcfc]` 1.6:1 incident is the precedent). |
| Risk | KZ-002: the route also renders the shared `results-center-table` and the parent shell — enumerate scope by *what renders*, not by the feature folder; the shell's 34 hex literals are in scope. |
| Dependency | Option B endpoint lands in the agresso reports family — needs server reviewer familiar with `GET .../reports/*` conventions; Swagger decorators mandatory. |
| Open Q | **OQ-1:** exact status set for the donut — from `result_status` config colors or a fixed palette? (Design tokens vs `result_status.config.color.text` currently mixed.) |
| Open Q | **OQ-2:** should the trend chart count by `report_year` or creation year? Needs product confirmation. |
| Open Q | **OQ-3:** is the caveat banner copy legally/product-mandated always-visible, or may it collapse? |
| Open Q | **OQ-4:** the user's screenshot was not ingested — confirm the mockup matches what they saw before specify. |

## 13. Success Criteria

1. Lighthouse/Web Vitals on the route do not regress (PRD M12); initial bundle unchanged (PERF-1).
2. Zero hex literals in the touched templates/TS (`grep -E '#[0-9a-fA-F]{3,6}' <files>` returns only token definitions elsewhere) — and the page renders correctly in dark mode.
3. Status + indicator + trend charts render from aggregate data; the `limit: 10_000` call is gone (network tab shows no bulk `GET results` from this page).
4. Every data region shows skeleton → (data | error+retry | empty) as three visually distinct states; "loading" never displays the empty-state copy.
5. WCAG 2.1 AA on the changed screen: charts have accessible names + non-visual data access; keyboard reaches every interactive element.
6. Client tests cover the new state logic; coverage floors hold (statements 40 / branches 20 / lines 45 / functions 30).

## 14. Next Step

```text
/akili-specify changes/project-dashboard-redesign
```
