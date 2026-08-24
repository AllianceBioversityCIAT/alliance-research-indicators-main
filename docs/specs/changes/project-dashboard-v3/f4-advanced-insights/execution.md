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

### T-02 — `reach` + `keywords` queries — **PASS** (attempt 1)

- **Date:** 2026-08-24
- **Implementer attempts:** 1 · Skills: `nestjs-expert` · Effort: high (NULL semantics + normalization)
- **Files changed:**
  - `server/.../repositories/agresso-contract.repository.ts` — +`getReachSection`, +`getKeywordsSection` (private, portfolio-wide over `buildPrimaryContractResultsSubquery()`)
  - `server/.../repositories/agresso-contract.repository.spec.ts` — +2 describe blocks, 8 tests (KZ-001 generated-SQL + params)
- **Decision record (RB-3 CLOSED — normalization path):** **SQL**. Dev MySQL version observed by Leader probe immediately before dispatch: **`8.0.45-0ubuntu0.22.04.1`**; `REGEXP_REPLACE` confirmed working on dev. Expression: `LOWER(TRIM(REGEXP_REPLACE(rk.keyword, '[[:space:]]+', ' ')))` — inner-whitespace collapse, then edge TRIM, then case fold. No TS fallback needed.
- **Entity observation (T-01 advisory 5 follow-through):** disaggregation columns confirmed `@Column('boolean', {nullable:true})` / DDL `tinyint NULL` — flags, not headcounts; SUM counts flagged rows. Follows F3 as-built idiom `COALESCE(SUM(col),0)` (never `SUM(COALESCE(col,0))` — absent ≠ 0 preserved). T-05 A511 ground-truth remains the semantics gate.
- **Implementer verification:** targeted `npx jest src/domain/entities/agresso-contract --silent` → 4 suites / 185 tests PASS · `npx eslint` clean (prettier fixer only, jest re-ran green after) · `npx tsc --noEmit -p tsconfig.build.json` clean (KZ-017 note: tsc structurally excludes `**/*spec.ts` — spec-file types covered by the ts-jest run, recorded so tsc is not miscited).
- **K-004 reds observed** (mutate → red verbatim → revert → backup-diff identical → green): (a) `COALESCE(SUM(ra.women_youth),0)` → `SUM(COALESCE(ra.women_youth,0))` reddened 2 tests; (b) `COUNT(DISTINCT rk.result_id)` → `COUNT(rk.result_id)` reddened 2 tests. Also exercised: 31-item cap/order fixture (cap=30, 31st absent), n=0 both sections.
- **Leader re-measure (quiet window):** full server `npm test -- --silent` → **338 suites / 2493 tests / 1 snapshot PASS, exit 0** (88 s).
- **Reviewer verdict:** `STATUS: PASS` (full 4-lens sweep). Every SQL identifier verified at entity/DDL source; single-`?` subquery/params match; T-01 idiom preserved (D-F4-1). Six adjudications resolved in favor: boolean-SUM idiom correct per R-IN-002's own clauses; SQL normalization conforms to D-F4-5; `cat.code = 5` = "Other" independently verified (seed migration `1761840859164` + client gate); `MAX(custom_name)` satisfies the literal grouping clause; reach `n` unfiltered-by-nullness conforms to R-IN-001; `not_disaggregated_rows` correctly separated.
- **ADVISORY (recorded, never gates, never becomes a task):**
  1. **→ owner call at the pre-client gate, before T-09 labels:** `MAX(actor_type_custom_name)` can mislabel a merged code-5 group (two custom names → one bar with lexicographic-max label over combined sums). Reviewer options: (a) label "Other" when group heterogeneous, custom name only when homogeneous (no design change); (b) split per custom name (design clarification). Surface to owner at the client-tasks pause.
  2. `by_actor_type` (filters `cat.is_active`) need not reconcile with `overall` (no lookup join) — Σ(bars) can be < overall. **→ carry to T-09 HITL checklist.**
  3. **→ carry to T-05 brief (MANDATORY):** A511 keyword ground-truth MUST include a case-and-whitespace variant pair — the collapse clause's only end-to-end evaluation (KZ-017: mocked-query specs pin the expression, they cannot execute it).
  4. Magic `5` in SQL template (pre-existing idiom client-side too) — a module-local named constant would help; recorded only.
  5. Perf levers if NFR-IN-002 slow at T-09: `GROUP BY cat.code` alone (TEXT sort key avoidable); normalized-keyword expression evaluated twice per row (alias in GROUP BY would do); plus T-01 advisory 6.
  6. Dead null-guard on `actor_type_id` mapping (NOT NULL PK through INNER JOIN) — cosmetic.
  7. K-004 evidence one mutation short: normalization expression itself never mutated red (the `toContain` would redden, but unproven) — close if T-02 revisited.
- **Requirements covered:** R-IN-002 reach + keywords rows + keyword-normalization scenario (expression-level; execution-level owned by T-05); design §2.1, D-F4-5.
- **Issues encountered:** first diff extraction empty (persisted `cd` made pathspec miss) — caught by K-011 validation, regenerated from worktree root before dispatch.
- **Final verification result:** full server suite green (2493/2493) · eslint clean · tsc build clean · K-004 reds observed.
- **Gate note (gated mode):** auto-approved — user selected "Continuar en cadena T-02→T-05" at the Wave-1 gate (pre-approval for routine PASS gates through T-05; exceptions still stop).

## Pivot Record: T-03

- **Date:** 2026-08-24 · **Status:** T-03 marked `[~]` — Pivot Protocol triggered (no rework attempts consumed; no code written)
- **Blocker (Implementer finding, Leader-verified against source per KZ-007):** requirements §8 **A-1 is false**. `result_review_history.event_type` (varchar 50) / `.decision` (varchar 20) are plain strings — no TypeORM enum, no CHECK constraint. Only 3 writers exist, all in `bilateral.service.ts` (L909 `POOL_FUNDING_ALIGNMENT_CHANGED`, L1467/L1521 `INDICATOR_MAPPING_CHANGED`) — audit entries for a different feature, neither submission- nor approval-shaped. `decision` is written **nowhere** (grep over src: zero non-spec writers). `reviewDecision`, the only plausible submission→approval writer, is a stub: `throw new NotImplementedException` (`bilateral.service.ts:1535`, present since module skeleton `cfa2a8e1`). The intended vocabulary (`REVIEW_DECISION`; `APPROVE|REJECT|EDIT`) exists only as SQL comments in the archived bilateral design (`docs/specs/archive/2026-06-17-bilateral-module/design.md:479-480`) — documented, never built.
- **Consequence:** D-F4-6's "constant asserted against the live enum" is unimplementable (no live enum); on real data cycle-time `sample_size` would be 0 for 100% of results (no submission/approval events have ever been written); requirements' defect-table ground-truth "on one real approved result" is impossible today. R-IN-002's `review_flow` counts-by-event_type remain buildable (real values exist); counts-by-decision would be empty; the cycle-time sub-feature computes over data that cannot exist yet.
- **Alternatives:**
  - **A (Implementer-recommended):** build calculator + constant against the documented-intended vocabulary; constant-vs-enum spec asserts against a NEW canonical TS vocabulary constant (created now in `result-review-history` module as forward-looking source of truth for the future `reviewDecision` implementation); synthetic fixtures carry all K-004/KZ-001 evidence; `sample_size = 0` on live data is the honest output (D-F4-6 already frames wrong-mapping as visible via sample_size; R-1 already warns tiny samples; UI already shows `n` + excluded honestly). Amend D-F4-6 wording + defect-table ground-truth to "0 approval events observed, recorded as such".
  - **B (rejected):** relabel existing audit event_types as submission/approval — invents semantics R-IN-002 does not support.
  - **C:** descope cycle_time entirely (always null/0) or hold T-03 until bilateral `reviewDecision` ships; keep event_type/decision counts.
- **Leader recommendation:** **A**, with the vocabulary constant living in the `result-review-history` module (not agresso-contract) so the future writer imports the same source of truth; spec amendments to `requirements.md` A-1 + defect table + `design.md` D-F4-6 drafted after owner choice (two-direction correction sweep per protocol).
- **Awaiting:** owner decision — gated mode; chain pre-approval does not cover a Pivot.
