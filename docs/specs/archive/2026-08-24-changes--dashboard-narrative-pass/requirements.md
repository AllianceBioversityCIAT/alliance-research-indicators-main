# Requirements — client / Dashboard Narrative Pass (Project Dashboard v3.1)

- **Module:** client / project-detail (STAR) — client-only
- **Spec id:** 2026-08-dashboard-narrative-pass
- **Status:** draft
- **Owner:** JuanCode
- **Type:** Change + embedded Bug (workstream 1 in Bug Mode)
- **Linked proposal:** [`./proposal.md`](./proposal.md) — approved 2026-08-24
- **Extends (read-only):** archived family `project-dashboard-v3` (F1 layout, F2 endpoint, F3 deep-dive, F4 insights — point-in-time, never edited)
- **Depth:** Full · **Approval Mode:** gated
- **Last updated:** 2026-08-24

---

## 1. Context

The v3 family delivered the data and the widgets; this pass makes the page *read*. Three verified problems: (1) the "Results over time" line chart crashes its series render (axes paint, line never does); (2) three surfaces render data as custom HTML pills while five sibling cards use `viz-chart`/echarts — an undeclared mixed visual language that reads as legacy; (3) the page order is a block list, not a narrative — adjacent cards don't answer consecutive questions.

**Bug root cause — CONFIRMED offline (2026-08-24, SSR probe, deterministic):** `results-trend-card.component.ts` builds `visualMap.pieces[].lineStyle` (a nonstandard visualMap piece property). Rendering those exact options throws `TypeError: Cannot read properties of undefined (reading 'coord')` in echarts `getVisualGradient` (`LineView.render`, echarts.js:42629) — the series render aborts after axes are drawn, matching the screenshot exactly. Fix viability confirmed: identical options with `series.lineStyle` and no `visualMap` render 4 series strokes. Secondary latent trap: the builder's fallback color string `'var(--ac-viz-series-1)'` is emitted as a literal SVG attribute (browsers do not resolve `var()` in presentation attributes) — the fix must keep resolved token colors.

## 2. Requirement numbering

`R-DN-NNN` / `NFR-DN-NNN` (Dashboard Narrative).

---

## 3. Functional requirements

### R-DN-001 — Results-over-time series renders (BUG — corrected behavior)

The trend card SHALL render its line series whenever ≥2 valid year buckets exist, preserving the delivered semantics: solid segments through the last closed year, dashed segment into the in-progress year, clickable points, tooltip, and accessible table.

#### Scenario: The exact failing input (regression anchor)
- GIVEN buckets `[{2024,0},{2025,12},{2026,9}]` (the reproduction shape) and a resolved series color
- WHEN the chart options are built and rendered to SVG
- THEN the series paints (≥1 series-colored stroke path + symbols) with solid-then-dashed segmentation
- BUT it must NOT construct `visualMap.pieces[].lineStyle` (the confirmed crash input) nor emit unresolved `var(--…)` strings into SVG attributes
- AND IT MUST keep tooltip content, chartClick drill, and `tableModel` sums identical to the pre-fix contract

### R-DN-002 — One declared visual language

Every data-bearing surface on project-dashboard SHALL render through `viz-chart` OR belong to an explicitly declared non-echarts idiom (e.g. "composition strip", "ranking strip") registered in `docs/ux-ui/design.md` §8 with a when-to-use rule. The inventory closes **by what renders** (KZ-002), not by folder.

#### Scenario: Inventory closure
- GIVEN the three known custom surfaces (status composition bar inline in `project-dashboard.component.html:383-440`; `project-dashboard-card` pills at lines 95/160; Top Regions/Countries pills) plus any surface the inventory task discovers
- WHEN the spec completes
- THEN each surface is either migrated to `viz-chart` or listed under the declared idiom with its rule
- BUT no surface may remain unclassified, and no data bar may carry hex literals or non-token colors
- AND IT MUST preserve each surface's existing a11y contract (aria labels, sr-only tables, keyboard focus)

### R-DN-003 — Narrative order in six acts

The page SHALL present its content as a six-act narrative — (1) Identity & health, (2) Production, (3) Reach, (4) Direction, (5) Quality & process, (6) Depth on demand — each card carrying a question-subtitle, with act grouping visible in layout (shared rows/sections). The concrete card-to-act mapping and the two open placements (OQ-1 status-in-hero; OQ-2 pills migration) are resolved by the approved mockup at design phase.

#### Scenario: Order and grouping
- GIVEN the approved mockup's act mapping
- WHEN the dashboard renders for a dense contract
- THEN cards appear in act order with their question-subtitles, and same-act cards share a visual group
- BUT the first-paint request set must NOT change (lazy sections stay lazy; no eager fetch introduced by reordering)
- AND IT MUST keep every existing drill-through and filter link functional at its new position

### R-DN-004 — Delivered behavior preserved

F1 drills/KPIs, F2 dashboard data, F3 deep-dive panel, and F4 insights SHALL behave identically after the pass (same requests, same interactions), except where R-DN-001/002/003 explicitly change presentation.

#### Scenario: No regression
- GIVEN the reordered page
- WHEN a user exercises F1 chart drills, opens the F3 panel, and scrolls into F4 insights
- THEN network request counts and destinations match pre-pass behavior
- BUT no card may lose its loading/error/empty/sparse states in the move
- AND IT MUST keep suite green both packages and client budgets green

---

## 4. Non-functional requirements

**NFR-DN-001** first-paint request set unchanged (component specs + HITL network check) · **NFR-DN-002** initial bundle ±5 kB vs pre-pass baseline, same-branch states · **NFR-DN-003** coverage floors green (client 40/20/45/30) · **NFR-DN-004** WCAG AA on changed surfaces; HITL light+dark mandatory (KZ-014).

## Defect classes and their gates

| Defect class | Gate | Blind-spot handling |
|---|---|---|
| Series render crash / invisible series (R-DN-001) | **SSR-SVG regression test** (echarts `ssr:true` render of the real builder output; red on current code — probe already reproduces it — green after fix); named failing input = the crash options | Presence of options ≠ render — the SSR assertion IS on generated output (KZ-001) |
| Unresolved `var()` in SVG attributes | Same SSR test asserts no `var(--` substring in emitted SVG | — |
| Surface misclassification (R-DN-002) | Inventory task greps by render markup (`style.width`, `app-viz-chart`) + closure table in design.md §8 update | KZ-002: enumerate by what renders |
| Order/grouping regression (R-DN-003) | Component spec DOM-order assertions on act sequence + subtitle presence | Visual grouping quality: no automated gate → **HITL (declared)** |
| Eager-fetch regression (R-DN-003/NFR-DN-001) | Zero-fetch-before-intersection specs re-run (F3/F4 pattern, KZ-015 transitions) | Real network: HITL below-the-fold check |
| Rendered visual quality, dark mode, act legibility | No automated gate — `tokens:validate` + **mandatory HITL light+dark** (KZ-014) with the mockup as reference | Declared: this spec's dominant defect class is visual; the mockup approval + HITL are the gate |
| Broken drills after move (R-DN-004) | Existing drill specs re-run + HITL click-through | — |

## 5. Data requirements

None — client-only; no API/DTO/migration changes (K-015 n/a).

## 6. API surface delta

None.

## 7. Cross-system impact

None (STAR client presentation layer only).

## 8. Assumptions, dependencies, risks

- **A-1 (verified at specify — probe recorded above):** the trend crash reproduces deterministically in echarts SSR with the builder's exact options; no runtime-only factor is required to trigger it.
- **A-2:** the v3 endpoints already serve every datum the narrative needs — no new data (verified: the reorder consumes existing DTOs only).
- **R-1 (risk):** moving the status composition into the hero (OQ-1) may crowd F1's hero on mobile — mockup must show `md:` behavior before it becomes a requirement.
- **R-2 (risk):** act grouping could tempt layout rewrites beyond reordering — scope guard: reorder + group + subtitles, no new components except where R-DN-002 migration requires one.

## 9. Open questions

- **OQ-1:** status composition → hero semaphore vs strip below hero — resolved at mockup gate.
- **OQ-2:** top-N pills → migrate to viz-chart bars vs declare "ranking strip" idiom — resolved at mockup gate by side-by-side comparison.

## 10. Sign-off

- [ ] Engineering lead — JuanCode
- [ ] MEL / product owner — —
