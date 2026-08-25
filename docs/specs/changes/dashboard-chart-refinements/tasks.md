# Tasks — Changes / Dashboard Chart Refinements

- **Module:** changes · **Spec id:** 2026-08-dashboard-chart-refinements
- **Status:** draft · **Owner:** J. Cadavid · **Depth:** Standard · **Approval Mode:** gated
- **Requirements:** ./requirements.md · **Design:** ./design.md (budget: 6 tasks / ~750 LOC / 7 review rounds — this decomposition lands at 5 tasks, under budget)
- **Last updated:** 2026-08-25

## 1. Dependency graph

```
T-01 (server flows block)  ─────────────┐
T-02 (interfaces + viz-chart Sankey) ─► T-03 (sankey rework in place) ─┐
T-04 (geo card: ramp + defects)  ───────────────────────────────────► T-05 (validation sweep)
T-01 ────────────────────────────────────────────────────────────────► T-05
```

T-01 (server) ∥ client chain — cross-package parallel OK. T-02→T-03→T-04 serialize (client package). **T-02 execution constraint:** `viz-chart.component.ts` may hold the concurrent chart-explainers session's uncommitted edits — before touching it, check `git status` on that file; if foreign-dirty, coordinate/wait rather than interleave (root §4.3).

## 2. Task list

### T-01 — Server: `lever_sp_flows` sub-report

- [~] **Covers:** R-DCR-001 (Mapped flows: all AND/BUT clauses; Degrade: all clauses) · **Design:** §2.1, §4, §5, §6, DD-1/DD-9 · **Skills:** `nestjs-expert` · **Effort:** medium · **Size:** ~200 LOC
- Scope: `ContractLeverSpFlowsDto`; `getLeverSpFlowsReport(contractId)` (role-grouped links incl. per-lever Unaligned `sp_code:null` and "No lever" pseudo-source `lever_id:null`; distinct-count totals); 8th `Promise.allSettled` entry + errors[] prefix; Swagger on the report DTO.
- Tests (named failing inputs from requirements §7): fixture with a 2-SP result → 2 role-links (a count-by-result returns 1 and MUST fail); fixture with a no-lever unaligned result → appears under "No lever" (a lever-only GROUP BY drops it and MUST fail); `Σ(unaligned link counts) === results_without_alignment`; totals are DISTINCT counts, never link sums; degrade injection → block null + errors entry, siblings intact, HTTP unchanged.
- **Verify:** targeted `npx jest` on repository/service specs; bare `npx eslint`; `npm run build`. **Disqualifier:** mocked-query tests cannot see real SQL (KZ-017/KZ-001) — SQL correctness is owed to T-05's live HTTP check; a green here is NOT evidence of SQL correctness and must not be reported as such.

### T-02 — Client plumbing: interfaces + Sankey registration

- [x] **Covers:** R-DCR-005 bundle clause (lazy-chunk placement); enables R-DCR-002 · **Design:** §7.1, §8 · **Skills:** `angular-developer` · **Effort:** low · **Size:** ~60 LOC
- Scope: `ContractLeverSpFlows` interface; `ContractDashboardReport += lever_sp_flows`; viz-chart 3 edits (import SankeyChart, `use([])`, `SankeySeriesOption` in the union). NOTHING else in viz-chart (GraphChart deregistration is DEFERRED, DD-11).
- **Verify:** `npm run build` + build-stats check naming the chunk that contains the sankey module (failing input: an eager import in a shared module puts it in the initial bundle — the check MUST be able to show that); existing viz-chart spec green; bare eslint. **Disqualifier:** "build green" alone doesn't prove chunk placement — the stats check is the gate.

### T-03 — Sankey rework of `sp-alignment-graph` (in place)

- [ ] **Covers:** R-DCR-002 (Render: chips kept, tableModel, top-12 cap + visible fold note, BUT no force-graph; Drill-through: lever-node navigation, BUT Unaligned/SP/links inert; Empty/loading/error: all, AND `links:[]` = empty) + R-DCR-005 a11y clauses · **Design:** §7.2, DD-2…DD-5, DD-8…DD-10, §9.1 · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** **xhigh** (panel review at gate) · **Size:** ~350 LOC
- Scope: in-place rewrite (selector/`report` input/chips/states/legend markup KEPT — DD-10); new `flows` input + mount binding; role-grouped links with solid/dashed/dotted `lineStyle.type`; "No lever" source + single "Unaligned" sink; trajectory emphasis; tooltip (lever full name, SP name, role, count); cap-notice retarget; chips/visibility/states single-sourced from flows (DD-8 degrade matrix incl. sp_alignment-null table fallback); detailed per-result tableModel kept with Result Code as anchor to `/result/:code`; lever-node click → Results tab with `lever-codes` filter; absent-data inventory condition moves to flows.
- Tests (KZ-001 — emitted option + rendered DOM): 13-link fixture → 12 rendered + "Other" + note showing real N (13 rendered = FAIL); role → lineStyle.type mapping asserted per role; Unaligned/SP click → NO navigation (failing input: a navigation call on Unaligned click); lever click → router args carry lever filter; degrade matrix per DD-8 (each cell arranged as a TRANSITION, KZ-015); legend + "Legacy honesty" (null role renders UNKNOWN in legend AND table); anchor present in table rows.
- **Verify:** targeted `npx jest --coverage=false`; `npm run build`; `npm run lint -- --quiet`; bare eslint. **Disqualifier:** jest mocks `echarts/core` — nothing verifies ECharts accepts the option shape (KZ-017); that is owed to T-05's live visual. A presence-assertion on lineStyle classes proves config, not rendering.

### T-04 — Geo card: value-ramp bars + defect fixes

- [ ] **Covers:** R-DCR-003 (Correspondence: value-mapped ramp both themes, AND label contrast config [labels outside bars], BUT rank colors removed from this card) + R-DCR-004 (Axis: hideOverlap/splitNumber, AND 3-digit case; Help buttons: grid.top reserve, BUT help behavior untouched) + R-DCR-005 token clauses · **Design:** §7.3, DD-6/DD-7 · **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** medium · **Size:** ~90 LOC
- Scope: `valueRampColor(value, max)` export (pure; edges: max=0, value=0, value=max); swap in `buildGeoRankingChartOptions`; labels kept/moved outside the bar fill; `axisLabel.hideOverlap:true` + `splitNumber:3` on the value axis; `grid.top:44` on the three ranking charts. `projectDashboardBarColor` and geo-scope-map UNTOUCHED.
- Tests: valueRampColor matrix (returns `var(--ac-viz-ramp-N)` names; max=0 → lightest; value=max → ramp-5; monotonic by share); emitted options assert per-datum ramp tokens (rank function absent — failing input: any `--ac-green-*` in this card's options), hideOverlap/splitNumber/grid.top present.
- **Verify:** targeted jest --coverage=false; `npm run tokens:validate`; build; lint. **Disqualifier:** all layout/color assertions here are presence-assertions on config (KZ-017: jsdom renders no layout/color) — visual truth is owed to T-05; do not report "overlap fixed" from this task's green.

### T-05 — Validation sweep (final gate)

- [ ] **Covers:** every clause's runtime/visual owed evidence; NFR-1/2/3 · **Design:** §11 · **Skills:** `systematic-debugging` · **Effort:** high
- Scope: full server + client suites (clean scope if the concurrent session is still active — `--testPathIgnorePatterns='chart-explainer'`, contamination noted); coverage floors; `tokens:validate`; build + budgets + chunk stats; **live HTTP check** on dev DB (D514: flows block vs hand-computed expectation from the SP/lever reports — closes T-01's SQL disqualifier); **HITL visual pass** (owner screenshots or browser): Sankey renders with role line-styles + legend + cap note, map↔bars color correspondence both themes, axis no-collision at 768px with 3-digit values, "?" button clear of data, label contrast on all ramp steps used (closes the R-DCR-008-style contrast gap named in requirements §7).
- **Verify:** each command's raw output recorded; failures verbatim. **Disqualifier:** a green full suite that includes the foreign session's in-flight specs is contaminated — measure clean-scope or after their landing; the visual pass without BOTH themes is incomplete evidence, report it as partial.

## 3. Testing expectations

Per requirements §7 (defect classes → gates) and design §11. K-020 (`--coverage=false` on targeted runs), K-004 (see each new discriminating test red first, quote verbatim), KZ-015 (arrange transitions), K-021 (no AppModule in any integration-style spec).

## 4. Estimated totals & PR strategy

~700 LOC across 5 tasks (under the ~750 budget). Work lands commit-per-task on `bilateral-visual-improvements` as this branch's flow does; for the eventual PR to main, recommend keeping this spec's commits reviewable as one logical group (server commit first, then client) — no split PR needed at this size, but if combined with the concurrent chart-explainers spec the PR description must separate the two changesets (cognitive-doc-design review-empathy rules).

## 5. Done definition

All ACs verified with evidence in `execution.md` (written BEFORE checkboxes — guardrail hook); suites green (clean scope documented); budgets/chunk stats recorded; visual pass evidence attached; spec status flipped to `implemented`.
