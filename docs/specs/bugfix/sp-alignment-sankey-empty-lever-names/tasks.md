# Tasks — Bugfix / SP-alignment Sankey with empty lever `short_name`

- **Depth:** Lite (Bug Mode) · **Approval Mode:** pre-approved — Phase 3 gate: `auto-approved (pre-approved mode)`
- **Budget:** 1 task · ≈ 40 LOC · 1 review round
- All commands from `client/research-indicators/`; targeted jest MUST use `--coverage=false` (K-020).

### T-01 — Lever label chain + collision guard, with regression test
- **Requirements:** R-SKY-001 (both scenarios, all `BUT`/`AND IT MUST` clauses), NFR-SKY-001
- **Design:** DD-1, DD-2, DD-3
- **Files:** `src/app/pages/platform/pages/project-detail/components/sp-alignment-graph/sp-alignment-graph.component.{ts,spec.ts}` — nothing else.
- **Scope:** add `leverLabel(link)`; use it for node name (with ` (<id>)` suffix on label collision between distinct ids) and the `tableModel` + `aggregateRows` lever cells; node tooltip and link `leverFullName` use `full_name?.trim() || leverLabel(link)` (amended 2026-08-25). Keep `No lever`/`Other levers` buckets and every other option untouched.
- **Regression test (Bug Mode, mandatory — RED before fix):** fixture with links for lever 11 (`short_name: ''`, full "Multifunctional Landscapes") and lever 12 (`short_name: ''`, full "Climate Action"), plus lever 3 (`"Lever 3"`). Assert on `component.chartOptions()!.series[0]`: (a) lever node names are all non-empty and pairwise distinct; (b) every link `source` matches exactly one node name; (c) lever 3's node name is `"Lever 3"`; (d) `tableModel().rows` lever cells contain no `""`. Second case: `lever_short_name: null`. Third case (collision guard): two distinct ids with identical full names and empty short names → names differ by the ` (<id>)` suffix. *Falsifying input:* the fixture itself on current HEAD → red on (a) with `Received: ["", ""]`-shaped output. **Observe and quote the red before fixing (K-004).**
- **Done check:** `npx jest src/app/pages/platform/pages/project-detail/components/sp-alignment-graph --coverage=false --silent` → 23 existing + new green (record the new count); `npm run build` green; `npx tsc -p tsconfig.spec.json --noEmit 2>&1 | grep -c 'error TS'` = **942** baseline (re-measured on unmodified HEAD 2026-08-25; was 938 earlier on this branch); bare `npx eslint` on the component.
- **Disqualifiers:** a green run without observing the red first is not evidence; a test asserting on `leverLabel` calls instead of `series[0].data` is not evidence (KZ-001). jsdom cannot prove the SVG draws — declared; owner verifies on D514.
- **Skills:** `angular-developer`, `tdd` · **Effort:** medium · **Status:** todo
