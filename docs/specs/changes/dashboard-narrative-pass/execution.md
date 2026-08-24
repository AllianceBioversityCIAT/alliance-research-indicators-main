# Execution Log — Dashboard Narrative Pass (Project Dashboard v3.1)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/dashboard-narrative-pass/` |
| Approval Mode | gated — **owner directive at launch ("rápida y eficiente"): routine PASS gates auto-approved in chain; exceptions (HALT/Pivot/tripwire/FATAL) and the T-07 HITL always stop** |
| Branch | `bilateral-visual-improvements` |
| Leader session | Claude Code (Fable 5, T1) — same-session continuity from specify (zero re-reads); Implementer wrapper (sonnet), Reviewer wrapper (opus); author ≠ auditor held |
| Started | 2026-08-24 |
| Budget (design §13) | 7 tasks · ~450–650 prod + ~700–1,000 test LOC · 2 review rounds — tripwire armed |
| Wave plan | W1: T-01+T-02+T-04 (disjoint files, targeted verification) → W2: T-03+T-06 → T-05 → T-07 (full battery + HITL) |

---

## 2. Task Execution History

### T-02 — Visual-surface inventory closure — **PASS** (attempt 1)

- **Date:** 2026-08-24 · read-only evidence task · Effort low (no skill load — Leader deviation recorded: pure inventory)
- **Reviewer verdict:** `STATUS: PASS` — independently re-ran discovery repo-wide (10 data-bar sites, no truncation K-014), all mapped; the named disqualifier surface (inline status strip) found and classified; all 3 Leader adjudications verified on evidence (progressbar aria confirms meter; Distribution strip structurally identical to composition strip; unreachable branches confirmed via caller grep + `@else if` fall-through).
- **Scope declaration (KZ-017, per Reviewer):** scan folder-scoped to `project-detail/`; the two dashboard-rendered externals (`app-results-center-table`, `app-no-data-group`) were closed by the Reviewer's own grep over `shared/components/**/*.html` — no width-%/SVG data bar reachable from the dashboard outside the table below.

#### Closure table (deliverable — 23 surfaces, 0 unclassified)

| # | Surface | File:lines | Mechanism | Classification |
|---|---|---|---|---|
| 1 | Trend chart | `results-trend-card.component.html:61` | viz-chart | viz-chart |
| 2 | Status composition strip (bar `:416-428` + per-status share bars `:456` — TWO width-% mechanisms, range **`:383-469`** corrects requirements' `:383-440`) | `project-dashboard.component.html:383-469` | custom width-% + sr-only table + drills | **composition strip (declared)** |
| 3 | Timeline elapsed-% bar | `project-dashboard.component.html:284` | `role="progressbar"` single-value | **scoped OUT of R-DN-002** (meter, not data-viz — Leader adjudication 1; recorded in T-06 §8 exclusion) |
| 4 | Results-by-indicator heatmap/bars (morph) | `:540-546`, `:631-637` | viz-chart | viz-chart |
| 5 | Distribution strip (crossfade fallback — reduced-motion/no-VT, reachable) | `:590-601` | custom width-% part-to-whole | **composition strip (declared)** (Leader adjudication 2) |
| 6-9 | Top partner / primary levers / main contact / contributing projects | `:684-734` | viz-chart `layout="viz-bar"` | viz-chart |
| 10-12 | Top regions / countries / sub-national | `geo-scope-card.component.html:32-51` → `project-dashboard-card.component.html:85-102` | custom width-% `rows-partners` | **migrate at T-03** (OQ-2-A) |
| 13 | Geo scope map | `geo-scope-map.component.html:2` | viz-chart | viz-chart |
| 14 | SP alignment graph | `sp-alignment-graph.component.html:63` | viz-chart | viz-chart |
| 15 | Indicator deep-dive (velocity + 17 charts) | `indicator-deep-dive.component.html:28,102-172` | viz-chart | viz-chart |
| 16 | Insights section (5 charts) | `insights-section.component.html:60,208,259,327,378` | viz-chart | viz-chart |
| 17-18 | `project-dashboard-card` `columns` + default-branch bars | `project-dashboard-card.component.html:59-84,152-167` | custom bars, **unreachable** (only viz-bar/rows-partners callers; `@else if :37` falls through) | out-of-spec follow-up (Leader adjudication 3 — KZ-002: doesn't render) |
| 19-20 | card `rows-stacked-lever`/`rows-stacked` | `:103-151` | text/count | n/a |
| 21-23 | Executive overview / no-data-group / identity+KPI regions | (full files) | prose/KPI | n/a |

- **ADVISORY (recorded):**
  1. **→ T-03 brief (MANDATORY):** `layout` input defaults to `'columns'` (`project-dashboard-card.component.ts:37`) — a migrated caller that drops its `layout` attribute silently revives the dead pill bars; migration must keep explicit layout or sever the default dependency.
  2. **→ T-04/T-06 briefs:** the status surface is `:383-469` with TWO width-% mechanisms (composition bar + table share bars) — both move to the hero and both get named in the §8 idiom entry.
  3. Scope-declared (not scope-lucky) — noted above.
- **Requirements covered:** R-DN-002 inventory scenario + zero-unclassified BUT (KZ-002 closure by what renders).
- **Final verification:** Reviewer's independent repo-wide re-scan = table complete.
- **Gate note:** auto-approved (owner fast-mode chain).

### T-06 — attempt 1 — **FAIL** (Reviewer)

- **Date:** 2026-08-24 · effort low. Placement/format/zero-touch clean; two content defects (one edit fixes both): (1) line-range citations wrong in the working tree (file shifting under concurrent T-04 edits — and internally inconsistent in time: prose describes post-T-04, numbers pre-T-04) → cite by component + stable DOM anchor, never line numbers; (2) only one of the surface's two width-% mechanisms named (T-02 advisory 2 unhonored) + idiom definition claims "sr-only table" but the Distribution instance's companion is a visible list → name both mechanisms, soften to "accessible text companion". Full report relayed verbatim to attempt 2.
- **Bonus observations from the Reviewer:** T-03's working-tree state already carries explicit `layout="viz-bar"` on all three geo cards (advisory-1 hazard clear); progressbar exclusion verified at live `:278`.

### T-01 — BUG: SSR regression spec + trend-series fix — **PASS** (attempt 1)

- **Date:** 2026-08-24 · Skills: `angular-developer` + `systematic-debugging` · Effort: medium (Bug Mode)
- **Files:** `results-trend-card.component.ts` (visualMap removed → two overlapping null-padded series solid/dashed, `connectNulls:false`; local `resolveDesignToken`/`axisTokens` — ALL option colors resolved-or-omitted per D-DN-5), `results-trend-card.component.spec.ts` (assertions migrated + var-omission + tooltip-dedupe tests), NEW `results-trend-card.ssr.spec.ts` (real-echarts SSR render of the real builder output).
- **RED observed (Bug Mode mandate):** on unmodified code the SSR spec fails with `TypeError: Cannot read properties of undefined (reading 'coord') at getVisualGradient (echarts.js:42629)` — the exact probe-confirmed crash. **GREEN after fix:** SSR 2/2 (no-throw, series strokes+symbols, solid AND dashed present, zero `var(--`, visualMap undefined, contract test). Targeted 18/18 `--coverage=false` · eslint clean.
- **Scope adjudication (implementer-flagged, Reviewer-CONFIRMED within spec):** axis/grid/symbol token resolution added beyond the series color — required by design §10 assertion (d) ("zero `var(--` in the SVG"; five pre-existing literals would have made it unsatisfiable); staying file-local was right (`chart-tokens.util`'s `resolveToken` unexported; editing it would touch 8 sibling cards against §1 non-goals).
- **Reviewer verdict:** `STATUS: PASS` — D-DN-1 implemented exactly; every R-IN… R-DN-001 clause asserted on generated SVG output; dark-mode resolution verified at source (`data-theme` overrides); drill series-agnostic (`event.name`); tooltip dedupe null-safe (radar `cfcd223d` trap avoided); zero hex in component code.
- **ADVISORY (recorded):**
  1. Clause (d) passed vacuously in the red run (throw → empty svg) — covered by the specify probe record + the migrated component spec's `JSON.stringify(options)` assertion which reds without a throw; nuance recorded here per Reviewer suggestion (K-004 clause-level honesty).
  2. **Sibling trap, unassigned:** `project-dashboard.component.ts:447,450` feeds `'var(--ac-grey-…)'` into the indicator-heatmap options — no crash (standard `inRange.color`) but axis colors silently inert. Out of T-01 scope; NO task owns it — recorded; owner may propose follow-up outside this spec.
  3. SSR assertion (c) attribute-order-coupled (echarts emit order) — sound today, fragile on major bumps.
  4. Test-title overstatement + **→ T-07 brief:** include `results-trend-card.ssr.spec.ts` in the tsc-spec delta check (K-002 — its casts are otherwise untype-checked).
- **Requirements covered:** R-DN-001 all clauses; design §2.1, D-DN-1/2/5.
- **Gate note:** auto-approved (owner fast-mode chain).
