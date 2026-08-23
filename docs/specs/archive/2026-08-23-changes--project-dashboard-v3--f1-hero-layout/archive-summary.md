# Archive Summary — Project Dashboard v3 · F1 Hero, Layout & Interactivity

## 1. Document Control
- **Spec id:** 2026-08-project-dashboard-v3-f1 · **Owner:** JuanCode · **Type:** Change (Standard depth)
- **Parent Spec:** `changes/project-dashboard-v3` (`family.md` child 1/4 — row flipped to `done`)

## 2. Original Spec Path
`docs/specs/changes/project-dashboard-v3/f1-hero-layout/`

## 3. Archive Date
2026-08-23

## 4. Final Status
**Delivered and owner-verified.** 9/9 tasks PASS via Implementer→Reviewer loop + one post-close rework attempt (owner HITL findings). Budget: 9 tasks est. / 9 actual; 2 review rounds est. / 1 loop + 1 post-close rework actual.

## 5. Requirements Delivered
R-HL-001…009 + NFR-HL-001…003, all clauses task-owned (tasks.md §4 closure table). Highlights: unified hero (zero duplicated facts), 4 actionable KPI tiles, decision-value section order, empty-collapse to `no-data-group`, top-N cards on viz-chart with lever/contract drill, trend/status interactivity, native bars↔heatmap morph + sr-only drill links, `gap-5/p-5/gap-4` spacing scale.

## 6. Files Changed Summary
Per `execution.md`: `project-detail.component.{ts,html}` (conditional fact rows, drill-param contract `leverTab`/`contractTab`/`yearTab`/`resultsTab`), `project-dashboard.component.{ts,html}` (hero, reorder, drills, unified Executive Overview section), `project-dashboard-card` (viz-bar path), `results-trend-card`, `geo-scope-card`, new `no-data-group`, deleted `project-context-strip`, `results-center.{component,service}.ts`, `app.routes.ts` (legacy `project-results` redirect → parent). Commits T-01…T-09 (`01da8107…604a7b25`) + rework `d8f472f0`.

## 7. Test Evidence Summary
No separate `test-report.md` (**absence accepted** — evidence lives in `execution.md`): full client suite **6731/6731** green post-rework; coverage floors green; `npm run build` + budgets green (initial 1.12 MB); `npx eslint` clean; `tsc -p tsconfig.spec.json` 937 errors < 945 baseline (no new). 20 specs realigned + 2 added in rework.

## 8. Validation Summary
No `validation-report.md` (**absence accepted**): owner (JuanCode) performed the real HITL 2026-08-23 (localhost + test env, light mode, screenshots in-session) — recorded in `execution.md` §Post-close rework, which also **corrects** the agent-asserted "HITL" of T-09 Attempt 1 (KZ-014 instance). HITL surfaced 2 findings, both fixed: (1) all five drill navigations dead (unroutable `project-results` segment; fixed via parent-route + query-param pattern); (2) owner decision to unify Executive Overview + AI Grounding into one collapsible section (**supersedes R-AIP-002**).

## 9. Accepted Warnings Or Follow-Ups
- **Owner click-through of the fixed drills owed** in a running browser (routability structurally unprovable in jsdom — declared gap).
- **Dark-mode HITL not evidenced** (owner screenshots were light mode) — inherit to next dashboard HITL.
- `docs/ux-ui/design.md` §12.2 delta (context-strip retirement, R-AIP-002 supersede, D-F1-8/9) — pending item, spec branch.
- Partner/contact bars intentionally non-navigating (R-HL-005 accepted gap; revisit in F2+).

## 10. Historical Notes
The `project-results` route segment was never a real route — only an unresolvable relative redirect; every prior in-code citation of it as a navigation target was untested. Family siblings F2–F4 remain pending; F2 (`f2-consolidated-endpoint`) is next and depends on this spec's final component structure.
