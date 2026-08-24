# Execution Log — agresso / Project Dashboard v3 · F3 Indicator Deep-Dive

- **Spec id:** 2026-08-project-dashboard-v3-f3
- **Parent:** `changes/project-dashboard-v3` (`../family.md`)
- **Status:** in-progress
- **Started:** 2026-08-23
- **Leader:** Antigravity (T1 Orchestrator)

---

## Task Execution History

### Task T-01 — DTOs + section-meta and velocity queries

- **Status:** PASS (Attempt 1)
- **Implementer:** custom-implementer (flash)
- **Reviewer:** custom-reviewer (pro)
- **Files touched:**
  - `server/researchindicators/src/domain/entities/agresso-contract/dto/contract-indicator-details-report.dto.ts` (NEW)
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`
- **Verification Evidence:**
  - Unit tests: `jest src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts --silent` (86/86 passed)
  - Linter: `npx eslint src/domain/entities/agresso-contract/dto/contract-indicator-details-report.dto.ts src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` (clean, 0 errors)
  - Full server suite: 338 suites passed, 2443 tests passed
- **Reviewer Verdict:**
  - `STATUS: PASS`
  - Summary: The implementation successfully fulfills Task T-01. The per-section DTOs and metadata shapes accurately model the requirements for F3, and the new repository queries correctly compute `total_results` (via distinct seed counts) and `reporting_velocity` (by `created_at` month), backed by spec tests adhering to the Kaizen baseline KZ-001.
  - Advisory: Convert `ContractIndicatorDetailsReportResponseDto` from an interface to a class with `@ApiProperty` in T-04 for NestJS Swagger introspection.

### Task T-02 — Section queries: capacity_sharing, knowledge_product, oicr

- **Status:** PASS (Attempt 1)
- **Implementer:** custom-implementer (flash)
- **Reviewer:** custom-reviewer (pro)
- **Files touched:**
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`
- **Verification Evidence:**
  - Unit tests: `jest src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts --silent` (98/98 passed)
  - Linter: `npx eslint src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` (clean, 0 errors)
  - Full server suite: 338 suites passed, 2455 tests passed
- **Reviewer Verdict:**
  - `STATUS: PASS`
  - Summary: The implementation successfully fulfills Task T-02. The SQL aggregates correctly implement `absent != 0` semantics using `INNER JOIN` to exclude missing satellite rows from `SUM` operations. The lookup tables (`session_lengths`, `delivery_modalities`, `session_types`, `maturity_levels`) are properly joined to resolve label names, and `{ total_results, n }` meta computations are accurate. All repository specifications correctly assert the generated SQL + params (KZ-001) to guard against any mutating regressions.

### Task T-03 — Section queries: innovation_dev, policy_change, innovation_use

- **Status:** PASS (Attempt 1)
- **Implementer:** custom-implementer
- **Files touched:**
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`
  - `docs/specs/changes/project-dashboard-v3/f3-indicator-deep-dive/tasks.md`
  - `docs/specs/changes/project-dashboard-v3/f3-indicator-deep-dive/execution.md`
- **R-1 Resolution:**
  - `policy_stage` entity/table does not have a separate `order` column; stages are identified and sequentially sequenced by `policy_stage_id`. Funnel ordering therefore uses `ORDER BY ps.policy_stage_id ASC`.
- **Verification Evidence:**
  - Unit tests: `npm test -- src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts --silent` (110/110 passed)
  - Linter: `npx eslint src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` (clean, 0 errors)


### Task T-03 — Section queries: innovation_dev, policy_change, innovation_use

- **Attempt 1:** FAIL
- **Reviewer Issues:**
  - **Discovered Issue:** In `getInnovationUseDetailsReport`, the queries for overall gender/youth reach and actor reach treat the numerical reach columns (`women_youth`, `women_not_youth`, `men_youth`, `men_not_youth`) from the `result_actors` table as boolean flags (`SUM(CASE WHEN ra.women_youth = 1 THEN 1 ELSE 0 END)`), counting occurrences of 1 instead of summing the actual participant counts.
  - **Violated Rule:** R-DD-002 ("innovation use: ... gender×youth reach: Σ `women_youth`..."), KZ-001.
  - **Remediation Suggestion:** Update the SQL queries in `getInnovationUseDetailsReport` to sum the actual quantities directly, e.g. `COALESCE(SUM(ra.women_youth), 0) AS women_youth`. Update the corresponding assertions and mock fixtures in the spec file to expect and validate realistic integer values.

- **Attempt 2 (Rework):** PASS
- **Implementer:** custom-implementer
- **Files touched:**
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`
- **Summary of fixes:**
  - In `getInnovationUseDetailsReport`, updated `overallGenderYouthQuery` and `actorReachQuery` to directly sum numerical reach quantities via `COALESCE(SUM(ra.women_youth), 0) AS women_youth` (and `women_not_youth`, `men_youth`, `men_not_youth`).
  - In `agresso-contract.repository.spec.ts`, updated generated SQL expectations to assert `COALESCE(SUM(ra.*), 0)` and updated test fixtures and expected values to reflect realistic non-boolean counts (15, 25, 30, 40, etc.).
- **Verification Evidence:**
  - Unit tests: `npm test -- src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts --silent` (110/110 passed)
  - Linter: `npx eslint src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` (clean, 0 errors)


- **Attempt 2:** PASS (Rework)
- **Implementer:** custom-implementer (flash)
- **Reviewer:** custom-reviewer (pro)
- **Remediation Applied:** In `getInnovationUseDetailsReport`, updated reach aggregations to sum numerical values via `COALESCE(SUM(ra.column), 0)` rather than boolean presence counts. Updated spec mock values and SQL assertions to validate proper summation.
- **R-1 Resolution Recorded:** The `policy_stage` table does not possess an explicit `order` column; stages are sequentially ordered by `ps.policy_stage_id ASC`.
- **Verification Evidence:**
  - Unit tests: `jest src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts --silent` (110/110 passed)
  - Linter: `npx eslint src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` (clean, 0 errors)
- **Reviewer Verdict:**
  - `STATUS: PASS`
  - Summary: The remediation has been correctly applied to `getInnovationUseDetailsReport`. The aggregation logic now correctly utilizes `COALESCE(SUM(ra.column), 0)` to calculate exact population quantities rather than counting boolean presences, satisfying R-DD-002 rows 2, 4, 6. The `agresso-contract.repository.spec.ts` test suite accurately reflects this behavioral change with realistic mocked summations, successfully verifying the logic.

### Task T-04 — Composition method + service + controller + Swagger

- **Status:** PASS (Attempt 1)
- **Implementer:** custom-implementer (flash)
- **Reviewer:** custom-reviewer (pro)
- **Files touched:**
  - `server/researchindicators/src/domain/entities/agresso-contract/dto/contract-indicator-details-report.dto.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.service.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.service.spec.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.controller.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.controller.spec.ts`
- **Verification Evidence:**
  - Unit tests: `jest src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts src/domain/entities/agresso-contract/agresso-contract.service.spec.ts src/domain/entities/agresso-contract/agresso-contract.controller.spec.ts --silent` (171/171 passed)
  - Linter: `npx eslint` across touched files (0 errors, 0 warnings)
  - Full server test suite: 338 suites passed, 2480 tests passed
- **Reviewer Verdict:**
  - `STATUS: PASS`
  - Summary: The implementation for Task T-04 correctly fulfills the specified requirements, including the complete tri-state error handling semantics (D-F3-7) and the proper Swagger annotations, validation, and response formatting in the controller. The use of `Promise.allSettled` along with a precise conditional population safely isolates individual section failures while cleanly omitting zero-result indicators.

### Task T-05 — HTTP-path integration spec (in-process, no infra) + dev ground-truth check

- **Status:** PASS (Attempt 1)
- **Implementer:** custom-implementer (flash)
- **Reviewer:** custom-reviewer (pro)
- **Files touched:**
  - `server/researchindicators/test/agresso-contract-indicator-details.integration-spec.ts` (NEW)
- **Amended Implementation Notes (Owner Decision 2026-08-23):**
  - Bootstraps an isolated `TestingModule` containing only `AgressoContractController` + `AgressoContractService`, mock `AgressoContractRepository`, and mocked support providers.
  - Zero connection to remote dev DB, RabbitMQ, OpenSearch, or real TypeORM `DataSource` (KZ-017 guard).
  - Exercises full HTTP pipeline via `supertest` with real global `ResponseInterceptor` and `GlobalExceptions` filter.
  - 401 authentication rejection cited from `src/domain/shared/middlewares/jwr.middleware.spec.ts` ('rejects missing authorization header').
- **Verification Evidence:**
  - Integration suite: `npm run test:integration -- test/agresso-contract-indicator-details.integration-spec.ts --silent` (5/5 passed in 8.15s, wall-clock < 60s)
  - Linter: `npx eslint test/agresso-contract-indicator-details.integration-spec.ts` (0 errors, 0 warnings)
- **Reviewer Verdict:**
  - `STATUS: PASS`
  - Summary: The implementation of Task T-05 strictly adheres to the requirements and amended owner decisions. The integration test correctly isolates the module without importing AppModule or real DataSource, cleanly simulating in-process behavior. The ResponseInterceptor and GlobalExceptions filters are wired properly, and all 5 specified HTTP cases are accurately verified with zero network calls.

### Task T-06 — Register Pie/Funnel/Radar in viz-chart

- **Status:** PASS (Attempt 1)
- **Implementer:** custom-implementer (flash)
- **Reviewer:** custom-reviewer (pro)
- **Files touched:**
  - `client/research-indicators/src/app/shared/components/viz-chart/viz-chart.component.ts`
  - `client/research-indicators/src/app/shared/components/viz-chart/viz-chart.component.spec.ts`
- **Verification Evidence:**
  - Unit tests: `jest src/app/shared/components/viz-chart/viz-chart.component.spec.ts --silent --coverage=false` (16/16 passed in 1.12s)
  - Token validator: `npm run tokens:validate` (19/19 tokens valid in light/dark modes, monotonic ramps, 0 errors)
  - Client build: `npm run build` (0 errors, clean exit 0)
- **Presence Caveat Recorded:** Module registration and type acceptance in `viz-chart.component` makes `PieChart`, `FunnelChart`, and `RadarChart` available for use. Actual visual rendering of deep-dive charts, option generation, and token theme mapping are owned by tasks T-09 and T-10.
- **Reviewer Verdict:**
  - `STATUS: PASS`
  - Summary: The implementation strictly conforms to Task T-06 specifications. `PieChart`, `FunnelChart`, `RadarChart`, and `RadarComponent` are successfully registered via tree-shaken imports and added to the `EChartsOption` union type in `viz-chart.component.ts`, with corresponding assertions passing in `viz-chart.component.spec.ts`.

### Task T-07 — Client interface + API method + GetIndicatorDetailsService

- **Status:** PASS (Attempt 1)
- **Implementer:** custom-implementer (flash)
- **Reviewer:** custom-reviewer (pro)
- **Files touched:**
  - `client/research-indicators/src/app/shared/interfaces/contract-indicator-details.interface.ts` (NEW)
  - `client/research-indicators/src/app/shared/services/api.service.ts`
  - `client/research-indicators/src/app/shared/services/get-indicator-details.service.ts` (NEW)
  - `client/research-indicators/src/app/shared/services/get-indicator-details.service.spec.ts` (NEW)
- **Verification Evidence:**
  - Unit tests: `jest src/app/shared/services/get-indicator-details.service.spec.ts --silent --coverage=false` (11/11 passed in 0.98s)
  - Linter: `npx eslint` on touched client files (0 errors)
- **Reviewer Verdict:**
  - `STATUS: PASS`
  - Summary: The task T-07 implementation cleanly fulfills all specified requirements and passes the 4R assessment. The client interfaces strictly mirror the server DTO tri-state model, GetIndicatorDetailsService leverages Angular signals flawlessly for state management and deduplication, and testing coverage correctly verifies all edge cases, including error transitions and partial failures.

### Task T-08 — Deep-dive component: tabs, states, laziness

- **Status:** in-progress (Attempt 1 FAIL → Attempt 2 dispatched)
- **Leader (from Attempt 1):** Claude Code session (T1, Fable 5) — took over after the Antigravity Leader hit its quota mid-T-08 (the aborted Implementer left no working-tree changes; restarted clean)
- **Implementer:** akili-implementer (sonnet) · **Reviewer:** akili-reviewer (opus)
- **Skills / effort:** `angular-developer`, `ui-ux-pro-max` · attempt 1 `high`, attempt 2 `xhigh` (rework bump)

#### Attempt 1
- **Files touched:** NEW `client/.../project-detail/components/indicator-deep-dive/indicator-deep-dive.component.{ts,html,spec.ts}`; MOD `client/.../components/project-dashboard/project-dashboard.component.{ts,html,spec.ts}` (import + mount + 3 specs).
- **Implementer verification (verbatim):** `npx jest .../indicator-deep-dive .../project-dashboard --coverage=false --silent` → 3 suites, 115 passed; `npx eslint` on both folders → exit 0; `npm run build` → Output location, no ERROR; K-004 falsifier: `ngOnInit(){ this.triggerLoad(); }` → zero-fetch spec RED (`Received number of calls: 1`), reverted → GREEN.
- **Not Done / Assumptions (Implementer):** chart builders + velocity deferred to T-09 (in scope boundary); real intersection deferred to T-10 HITL (declared); id→section mapping 1..6 taken from server `IndicatorsEnum` (Reviewer verified correct).
- **Reviewer verdict:** `STATUS: FAIL`
  1. **Discovered Issue:** "Try again" is inert in the whole-payload failure path: `retry()` calls `update()`, which re-fetches only when `loadedContractId()` is set, and `load()` sets it only on success — a first-fetch 500 leaves the panel permanently on the error card. T-08 spec asserts `update` was *called* (presence, not fetch). **Violated Rule:** R-DD-003 ("error with retry"; "a retry action re-fetches"), design §5 workflow 3; presence-assertion ≠ behavioral proof. **Remediation:** `retry()` → `load(contractId, { force: true })`; add a spec: `loadError` with `loadedContractId = null`, click Try again, assert a re-fetch (failing input: keep `update()` → red).
  2. **Discovered Issue:** panel renders the terminal "No indicators with results…" copy while F1's indicator source is still loading (mount guarded only by `!indicatorsEmpty()`, which is `false` during load and on load error); the skeleton branch is unreachable with zero tabs; the skeleton spec always sets non-empty indicators (KZ-017). **Violated Rule:** R-DD-003 Details ("skeleton while loading, explicitly distinguishable from empty — K-016"), defect row "sparse rendered as error/empty wrongly", D-F3-2. **Remediation:** gate the mount with the F1 idiom (`!indicatorsEmpty() && !loading() && !loadError()`) or add a `loading` input rendering the skeleton when `tabs().length === 0 && loading()`; add a dashboard spec asserting the empty copy is absent while `getProjectDetailService.loading()` (failing input: current guard → red).
- **ADVISORY (4R, recorded, non-gating):** (Reliability) `triggerLoad()` sets `hasIntersected` before the `contractId` check — an empty id at `ngAfterViewInit` suppresses the fetch permanently; (Readability) inline `section === null` instead of the service's `sectionFailed()`; (Risk) `activeSectionKey` falls back to `tab.id`, which F1 sets to the array index when ids are absent — could map onto a real section; (Reliability) missing `meta` renders as `empty` ("The 0 … results were imported…") instead of `unavailable`; (Placement) mount is a 4-line block after the Results-by-indicator `</section>` rather than inside the reserved slot — better rendering (component is its own card), order preserved — accepted by the Leader, HITL at T-10; (Readability) sparse copy drops the indicator label the mockup shows.

#### Attempt 2 (+ post-quota completion)
- **Runtime note:** the attempt-2 Implementer hit the account session limit after writing the rework but before running the build gate; per the runtime-failure protocol the Leader verified the tree state, re-ran verification inline (jest 118/118, eslint clean — build RED with TS18047), and dispatched a second Implementer spawn (single retry) scoped to the type error only.
- **Files touched:** same six as attempt 1 (component ts/html/spec + dashboard ts/html/spec).
- **Remediations:** (1) `retry()` → `load(contractId, { force: true })` with contract-id guard; two retry specs cover section-`null` and whole-payload `loadError` with `loadedContractId = null`, asserting a second forced `load` and `update` never called. (2) `loading = input<boolean>(false)` bound to `getProjectDetailService.loading()`; zero-tabs branch renders skeleton (role=status) while loading, terminal copy only otherwise; component spec asserts skeleton-not-empty + skeleton→empty transition (KZ-015); dashboard spec asserts the binding. Micro-fix: `=== undefined` guard → `if (!section)` (TS18047; narrowing aid only — `sectionFailed()` remains the failure decision, D-F3-7). Advisories adopted: contractId guard before `hasIntersected`; `sectionFailed()` over inline `=== null`; `activeSectionKey` strict on `indicatorId` (index-collision risk closed); `!meta` → `unavailable`; sparse copy carries the indicator label (mockup parity).
- **Verification (final state, verbatim):** `npm run build` → "Output location", zero ERROR lines, zero indicator-deep-dive mentions (a genuine K-004 red — TS18047 — observed on this task's own code before the fix); `npx jest .../indicator-deep-dive .../project-dashboard --coverage=false --silent` → 3 suites, 118 passed (Leader independently reproduced); `npx eslint` → exit 0.
- **Reviewer verdict:** `STATUS: PASS` — "Both attempt-1 FAIL issues are fixed in real behavior, each with a spec that would go red against the attempt-1 code… Tri-state classification, laziness, tab order, keyboard tablist, token-only styling and the R-DD-005 no-drill-regression coverage are unchanged and still conform."
- **ADVISORY (recorded, non-gating):** align the charts-slot `data-indicator-id` attr to plain `tab.indicatorId` when T-09 consumes it (fallback is dead but would go live); the empty-contract-id early return can leave an in-view element with no further intersection event — recovery via focusin/scroll, do not lean on it in T-09/T-10; mount placement after `</section>` accepted by the Leader (component is its own card; §2.2 said "single-line in the reserved slot" — deviation recorded, T-10 HITL glances at it); `unavailable` copy also fronts malformed payloads (cosmetic); the dashboard loading test is a binding assertion paired with the component behavioral pair — keep both.
- **Status:** **PASS (Attempt 2)** — 2026-08-24. Requirements covered: R-DD-003 (all clauses), R-DD-005; design D-F3-2/5/7.

### Task T-09 — Per-tab chart grids + velocity strip

- **Status:** PASS (Attempt 1) — 2026-08-24
- **Implementer:** akili-implementer (sonnet, effort high) · **Reviewer:** akili-reviewer (opus) · **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Files touched:** `client/.../indicator-deep-dive/indicator-deep-dive.component.{ts,html,spec.ts}` (+914/−11).
- **Scope adjudication (Leader):** extra bar builders (session type, org type) beyond R-DD-004's literal list accepted as in-scope — those mixes are part of the R-DD-002 payload contract.
- **Verification (verbatim):** targeted jest 3 suites / **124 passed** (`--coverage=false --silent`); `npx eslint` clean; `npm run build` → Output location, zero `[ERROR]`; hex grep over the 3 files → zero; **K-004 falsifier:** radar builder switched to divide by `meta.n` → radar spec RED (`expect 75, received 50` on a 3/4-answered-of-n=6 fixture), reverted → 124/124 GREEN.
- **Reviewer verdict:** `STATUS: PASS` — radar derives from `answered_count` with a genuinely discriminating fixture; funnel preserves delivered order (`sort:'none'` + non-monotonic fixture); all 17 builders' null predicates are ⊆ their tableModels' (chart ⇒ table, structurally); quantifications as accessible HTML table (D-F3-6); velocity outside the tab machinery, hidden without data; `data-indicator-id` strict (T-08 advisory closed); tokens only; T-08/F1/trend logic untouched.
- **ADVISORY (recorded, non-gating — carried to T-10 where noted):** radar `answered_count = 0` renders as value 0, pixel-identical to all-false (one-expression `null`-gap fix suggested **before HITL screenshots** — carried to T-10); `gender_youth_reach` builder throws on a malformed payload missing `overall` (interface makes it required; early `return null` would close it); stale `#chartsGrid` comment claims a `tab` dependency that no longer exists; during retry the velocity strip keeps the previous line while tabs re-skeleton (accepted behavior — HITL should not file it); presence caveat stands (options ≠ rendered — T-10 HITL owns visuals); §6 "md: one column" implemented via `auto-fit`/`minmax`, same outcome without a breakpoint class.
- Requirements covered: R-DD-004 (all clauses incl. radar scenario + accessible-table MUST), R-DD-006 (created_at rendering + trend-untouched BUT).

#### T-09 addendum — radar null-gap (owner-approved pre-HITL adoption of a T-09 advisory)
- **Author:** Leader inline (explicit user-approved fallback — both Implementer spawns quota-exhausted earlier in the run); **Reviewer:** akili-reviewer (opus) — independence gate, audited against working-tree source with author disclosure.
- **Change:** `answered_count === 0` → radar value `null` (ECharts gap), never a false 0; helper widened to `(number | null)[]` (single caller); fixture Commercial → 0/0 with `expect(values[4]).toBeNull()` (red under the old `': 0'` fallback) + table row `['Commercial', 0, 0]` asserted.
- **Verification:** deep-dive suite 23/23 (`--coverage=false`); eslint clean; build → Output location, zero `[ERROR]`.
- **Reviewer verdict:** `STATUS: PASS` — semantics match the advisory; widening loosens nothing; the 75-vs-50 discrimination intact; diff contains nothing else. **Coverage note (recorded):** the fixture no longer pins that a legitimate 0% (`0/2`) renders as `0` not `null`; re-cover cheaply if that ternary is ever touched.
