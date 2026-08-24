# Execution Log — Project Dashboard v3 · F4 Advanced Cross-Cutting Insights

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/project-dashboard-v3/f4-advanced-insights/` |
| Approval Mode | gated (per proposal Document Control) |
| Branch | `bilateral-visual-improvements` |
| Leader session | Claude Code (Fable 5, T1) — Implementer wrapper `akili-implementer` (sonnet), Reviewer wrapper `akili-reviewer` (opus); author ≠ auditor held |
| Started | 2026-08-24 |
| Family gate | F3 client tasks landed and spec archived (`d8357c17`) — 🔒 gates on T-07/T-08 open |
| Budget (design §13) | 9 tasks · ~1,300–1,700 LOC · 2 review rounds — tripwire armed |

**Registry note (Model checkpoint):** the `## Model Routing` registry maps T1 → `opus`; this session runs Fable 5 (newer generation than the registry entry) — passed silently per the floor-not-ceiling rule; registry entry flagged for update at archive.

---

## 2. Task Execution History

### T-06 — Register `TreemapChart` in viz-chart — **PASS** (attempt 1)

- **Date:** 2026-08-24
- **Wave:** 1 (parallel with T-01 — different packages; workers ran targeted verification only, Leader re-measured per §4.3)
- **Implementer attempts:** 1
- **Files changed:**
  - `client/research-indicators/src/app/shared/components/viz-chart/viz-chart.component.ts` — `TreemapChart` + `TreemapSeriesOption` imported tree-shaken from `echarts/charts`, added to `echarts.use([...])` and to the `ComposeOption` union
  - `client/research-indicators/src/app/shared/components/viz-chart/viz-chart.component.spec.ts` — registration assertion extended + runtime treemap-options apply spec
- **Skills:** `angular-developer` (Leader deviation from tasks.md defaults: `ui-ux-pro-max` deferred to T-08/T-09 — registration-only task, no new UI surface). Effort: medium.
- **Implementer verification:**
  - `npx jest src/app/shared/components/viz-chart --coverage=false --silent` → `Tests: 17 passed, 17 total` (K-020 honored)
  - `npx eslint viz-chart.component.ts` → clean (K-001 honored)
  - `npm run tokens:validate` → `STATUS: PASS (0 errors)`, ramp monotonicity PASS
  - K-004 red observed: registration assertion authored first → `Tests: 1 failed, 16 passed` (arrayContaining missing `TreemapChart`) → green after registration
- **Leader re-measure (quiet-window rule):** `npm run build` (client) → **exit 0**; only pre-existing SCSS budget warnings (my-latest-results, alliance-sidebar, my-projects, result-ai-item, features — all present before this diff) + known `pdfjs-dist` CommonJS note. Run while only read-only Reviewer + a server-package worker were active — no client build/test contention (§4.3 ARI note: separate `node_modules`/outputs; the narrowed prohibition targets concurrent full test suites).
- **Reviewer verdict:** `STATUS: PASS` (lens-checklist, sub-50-LOC mode). Summary: diff implements exactly the T-06 scope (tree-shaken registration + option-type union); no hex literals, no token/contract surface touched; K-004 red-before-green observed. Reviewer independently verified both exports exist in the installed echarts, and that every value-importer of `viz-chart.component.ts` sits in the lazy project-detail chunk (only other ref is `import type` in `geo-choropleth.util.ts`) — NFR-IN-003 structurally held; ±5 kB number remains T-09's measurement.
- **Reviewer scope notes (recorded, no rework):**
  1. Build gate deferred by Implementer was correct; Leader observed it green before this entry (above) — checkbox earned.
  2. **KZ-017:** the `tokens:validate` PASS is scope-independent for this diff (registration changes no token) — it must NOT later be cited as covering treemap label contrast. That clause is owned by T-09 HITL (spec's declared presence caveat).
- **Forward pointer → T-09 (MUST be copied into T-09's brief):** if the keywords-treemap builder themes nodes via `visualMap` rather than per-node `itemStyle`, `VisualMapComponent` must also be registered in `echarts.use` — currently absent; its absence fails silently at render, not at build.
- **Requirements covered:** R-IN-003 (treemap registration + tree-shaken clause); NFR-IN-003 partial (structural confinement verified; measurement at T-09).
- **Issues encountered:** none.
- **Final verification result:** targeted specs green · eslint clean · `tokens:validate` PASS · client `npm run build` exit 0.

### T-01 — DTOs + `sdg_coverage`, `evidence`, `contributing_levers` queries — **PASS** (attempt 1)

- **Date:** 2026-08-24
- **Wave:** 1 (parallel with T-06 — different packages)
- **Implementer attempts:** 1
- **Files changed:**
  - `server/.../agresso-contract/dto/contract-insights-report.dto.ts` (NEW) — all six section DTOs + `ContractInsightsReportDto` + `ContractInsightsResponseDto`; imports F3's `SectionMetaDto` (no duplication)
  - `server/.../agresso-contract/repositories/agresso-contract.repository.ts` — 3 private section methods: `getSdgCoverageSection`, `getEvidenceSection`, `getContributingLeversSection` (2 queries each over `buildPrimaryContractResultsSubquery()`, F3 idiom)
  - `server/.../agresso-contract/repositories/agresso-contract.repository.spec.ts` — 3 describe blocks, generated-SQL + params assertions (KZ-001), happy-path + n=0 per section
- **Skills:** `nestjs-expert` (per tasks.md). Effort: medium.
- **Implementer verification:** targeted `npx jest src/domain/entities/agresso-contract --silent` → 4 suites / 178 tests PASS · `npx eslint` (3 files) clean (prettier used as fixer only — K-001) · `npx tsc --noEmit -p tsconfig.build.json` clean.
- **K-004 reds observed** (mutate → red → revert → green, backup-diffed clean): drop `DISTINCT` in SDG count → red; drop `clarisa_sdgs` join → red; flip `is_primary = FALSE` → red. All three named failing inputs from T-01 acceptance exercised.
- **Leader re-measure (quiet window):** full server `npm test -- --silent` → **338 suites / 2486 tests / 1 snapshot PASS, exit 0** (65 s). Full-suite gate satisfied by the Leader per §4.3 (worker correctly ran targeted-only).
- **Reviewer verdict:** `STATUS: PASS`. Verified every emitted SQL identifier against the real entity files (KZ-017 mitigation for mocked `this.query`), `SectionMetaDto` reuse, exemplar fidelity (levers = `getTopPrimaryLeversReport` flipped), one-`?` subquery/params match, ONLY_FULL_GROUP_BY, mock hygiene. Implementer decisions 1–4 adjudicated within spec (private methods per design §2.1; only keywords capped; record-level `by_role` documented; shared portfolio `totalResults`).
- **Note (diff transport):** diff handed to Reviewer as a Leader-validated file (`$CLAUDE_JOB_DIR/tmp/t01.diff`, 876 lines, symbol-checked non-empty per K-011) read via the Reviewer's `Read` tool — economy deviation from inline-only, integrity preserved.
- **ADVISORY (recorded, never gates, never becomes a task):**
  1. `n` vs breakdown filtered independently (lookup `is_active` only in breakdown) → inactive/orphan rows can give `n > 0` with empty array. **→ carry to T-08 brief:** card logic must handle empty array independently of `n`.
  2. `public_count` buckets NULL `is_private` as public — undocumented; spec asserts `private_count` expression only.
  3. `String(row.short_name)` serializes NULL labels as `"null"` (F3 idiom, not a regression) — user-visible risk for SDG chips.
  4. SDG breakdown filters `cs.is_active`; levers breakdown does not filter `clarisa_lever.is_active` (exemplar-faithful) — **→ carry to T-04 brief:** one deliberate consistency call.
  5. **→ carry to T-02 + T-05 briefs:** `result_actors` disaggregation columns are declared `boolean` in `result-actor.entity.ts:45-67` while DTO/requirements treat them as sums/headcounts (F3 already sums them). T-05's A511 reach ground-truth MUST be read as a semantics check, not only arithmetic.
  6. 2 seed-subquery executions per section (12 total once all six land) — first perf lever if NFR-IN-002 comes back slow at T-09.
  7. No `contractId` guard on private methods → **→ carry to T-04 brief:** the 400-on-missing-param acceptance is load-bearing for all six sections.
- **Requirements covered:** R-IN-001 (meta + label MUST for these sections), R-IN-002 rows sdg/evidence/levers; design §2.1, D-F4-3.
- **Issues encountered:** none.
- **Final verification result:** full server suite green (2486/2486) · eslint clean · tsc build clean · K-004 reds observed.
