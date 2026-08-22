# Execution — project-detail / Project Dashboard Redesign

- **Spec id:** 2026-08-project-dashboard-redesign
- **Status:** in-progress
- **Owner:** j.cadavid@cgiar.org
- **Linked requirements:** ./requirements.md
- **Linked design:** ./design.md
- **Linked tasks:** ./tasks.md
- **Approval Mode:** gated (inherited from proposal)
- **Started:** 2026-08-21

---

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/project-dashboard-redesign` |
| Approval mode | `gated` (inherited from proposal; each task pauses for user approval) |
| Model note | Leader running on `opencode-go/glm-5.2` (T2 Coder per the registry). T1 OpenCode slug `<CONFIRM SLUG>` is unconfirmed. `author ≠ auditor` degrades to same-model separation — the OpenCode `task` tool exposes no per-spawn model selector, so Implementer and Reviewer run on the same default model. The constraint is recorded, not waived. |
| CodeGraph | `.codegraph/` absent in this checkout — workers explore by file. |
| Started | 2026-08-21 |

---

## Task Execution History

### T-01 — Server: results-summary aggregation in the repository

- **Final status:** PASS on attempt 1
- **Date:** 2026-08-21
- **Requirements covered:** R-PD-001 (Details, Scenario incl. both `AND IT MUST` clauses, `BUT` clause, AC.2)
- **Design decisions applied:** D-PD-1 (seventh sibling), D-PD-12 (primary-only semantics)

#### Attempt 1 — Implementer

- **Files changed:**
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts` (+101, -3)
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` (+126)
  - `server/researchindicators/src/domain/entities/agresso-contract/dto/contract-results-summary-report.dto.ts` (NEW — 3 DTO classes)

- **What was implemented:**
  - `getResultsSummaryReport(contractId)` method running three grouped queries over the shared `buildPrimaryContractResultsSubquery()`:
    1. By-status: `LEFT JOIN result_status` with `COALESCE(rs.name, 'No status')` for explicit null bucket (judgment SU2)
    2. By-year: `GROUP BY r.report_year_id` directly, no join (judgment W8), null-year bucket preserved
    3. Partner-institutions: `COUNT(DISTINCT institution_id)` over partner-role `result_institutions` links
  - `total` derived from `by_status.reduce()` so bucket-sum = total
  - `buildPrimaryContractResultsSubquery()` extended with `includeStatusId` / `includeReportYearId` boolean options (judgment call — preserves shared predicates per D-PD-12)
  - 4 new spec tests: empty-contract-id → 400, SQL-text + bound-params assertion, NULL-bucket + bucket-sum invariant, unknown-contract empty buckets

- **Implementer verification:**
  - Command: `npm test -- --silent` from `server/researchindicators/`
  - Result: **2418/2418 passed** (second run; first run had phantom timeout in `star-results-metadata-workbook.handler.spec.ts` — unrelated module, cleared by isolated re-run: 20/20 green in 44ms + second full-suite green)
  - Lint: `npx eslint` on 3 touched files — clean
  - Red input (KZ-014): Changed `LEFT JOIN` to `INNER JOIN`, assertion `expect(statusSql).toContain('LEFT JOIN')` FAILED as expected. Reverted; green.

- **Implementer `Not Done / Assumptions` (carried verbatim):**
  - Inconclusive first full-suite run (phantom timeout in unrelated module) — declared per KZ-017 inconclusive third outcome; cleared by isolated re-run + second full run
  - KZ-017 gap: unit tests assert generated SQL text but cannot prove SQL semantic correctness against real MySQL — deferred to T-02 Dev cross-check
  - Judgment call: extended `buildPrimaryContractResultsSubquery()` with two new boolean options rather than writing a separate subquery — preserves shared predicates per D-PD-12

#### Reviewer verdict — Attempt 1

- **STATUS: PASS**
- **Summary:** The implementation faithfully realizes R-PD-001's Details, both `AND IT MUST` clauses, the `BUT` clause, AC.2 (NULL buckets preserved, bucket-sum invariant tested with both NULL rows present), and D-PD-12 (shared primary-contract subquery reused across all three queries). Server conventions hold (DTOs decorated, no migration, parameterized raw SQL via `this.query`), and the KZ-017 SQL-semantics gap is correctly bounded to T-02. The `total`-from-`by_status`-only derivation is sound by SQL construction but would benefit from a defensive `by_year`-sum check (advisory, not gating).
- **ADVISORY (non-gating, recorded):**
  1. RELIABILITY/RESILIENCE: `total` is derived from `by_status` only; `by_year`≡`total` holds by SQL construction (identical result_id set in both subqueries) but is not enforced in code — a future predicate change to one subquery would silently break AC.2. Suggest asserting `sum(by_year) === total` or deriving `total` from an independent `COUNT(*)` over the base subquery.
  2. READABILITY: `GROUP BY contract_results.result_status_id, rs.name` is redundant (`rs.name` is functionally dependent on `result_status_id` via the LEFT JOIN); grouping by `result_status_id` alone is equivalent and marginally clearer.

#### Final verification result

- Server suite: 2418/2418 green (`npm test -- --silent` from `server/researchindicators/`)
- Lint: clean on 3 touched files (`npx eslint`, no `--fix`)
- Red input: discriminating (LEFT JOIN → INNER JOIN fails the assertion)

### T-02 — Server: endpoint, service pass-through, Swagger

- **Final status:** PASS on attempt 1 (automated checks); **task `[~]`** — 3 manual-substitute checks deferred to HITL validation
- **Date:** 2026-08-21
- **Requirements covered:** R-PD-001 (AC.1, AC.3, AC.4 [manual substitute], 400-on-empty), §6 API delta
- **Design decisions applied:** D-PD-1 (seventh sibling)

#### Attempt 1 — Implementer

- **Files changed:**
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.controller.ts` (+17)
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.controller.spec.ts` (+79)
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.service.ts` (+4)
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.service.spec.ts` (+36)

- **What was implemented:**
  - `@Get('reports/results-summary')` controller handler with `@ApiOperation` + `@ApiContractReportQueries()` (no `limitDescription` — no limit param)
  - Thin service pass-through: `getResultsSummaryReport(contractId)` → `repository.getResultsSummaryReport(contractId)`
  - Controller wraps response via `ResponseUtils.format({ description, status: OK, data })`
  - 6 new spec tests (3 controller, 3 service): happy path with DTO shape, empty contract-id → 400 propagation, Swagger metadata via `Reflect.getMetadata`

- **Implementer verification:**
  - Command: `npm test -- --silent` from `server/researchindicators/`
  - Result: **2423/2423 passed** (338 suites)
  - Lint: `npx eslint` on 4 touched files — clean
  - Red input (KZ-014): Removed empty-contract-id guard from repository → 400 test failed (TypeError instead of BadRequestException). Guard restored; green.

- **Implementer `Not Done / Assumptions` (carried verbatim):**
  1. **Swagger check (AC.3 visual):** Deferred to manual screenshot at HITL validation. Unit test asserts Swagger metadata via `Reflect.getMetadata` (unit-testable proxy); rendered Swagger UI is not.
  2. **AC.4 (401 envelope):** Deferred to Leader — one manual unauthenticated `curl` against local/Dev. Unit specs mock `JwtMiddleware` and cannot exercise the 401 path (KZ-017). *Disqualifier noted: a 401 from a wrong URL (404-shaped) is not evidence — the response body must carry the standard envelope.*
  3. **Dev cross-check (R-PD-001 scenario):** Deferred to Leader — endpoint counts vs. primary-scoped `GET /results` counts for contract A1676. *Disqualifier noted: comparing against the any-link count — the scenario is primary-scoped by D-PD-12.*
  - **Judgment call:** The controller/service 400 tests mock the underlying layer to throw `BadRequestException` (standard unit-test mocking). The red input was run against the repository spec (where the guard lives), confirming the guard is the mechanism.

#### Reviewer verdict — Attempt 1

- **STATUS: PASS**
- **Summary:** The diff adds the seventh `reports/*` sibling endpoint following the exact established pattern — `@Get('reports/results-summary')` + `@ApiOperation` + `@ApiContractReportQueries()` (no `limit`, matching design §4); a 4-line thin service pass-through (D-PD-1); and spec tests covering happy path, 400-on-empty propagation, and AC.3 Swagger metadata. All spec-conformance gates met; the 3 manual-substitute checks are explicitly deferred to HITL per judgment SU4 and honestly declared.
- **ADVISORY (non-gating, recorded):**
  1. RELIABILITY: Brief said "3 new service tests" but diff shows 2 `it()` blocks in service spec — coverage still gates.
  2. READABILITY: No explicit return type annotation on service method — matches sibling idiom (`getGeoScopeReport` also lacks one).
  3. RISK (informational): 400-propagation tests mock the upstream throw — correct scope split (T-01 owns the guard's SQL-level proof).

#### Deferred manual checks (HITL validation — scope still owed)

| # | Check | Needs | Disqualifier |
|---|---|---|---|
| 1 | Swagger screenshot | Running server, `/swagger` page | — |
| 2 | 401 unauthenticated curl | Running server (local or Dev) | 401 from wrong URL is not evidence — body must carry standard envelope |
| 3 | Dev cross-check (A1676) | Running server + Dev DB | Must compare against primary-scoped counts, not any-link (D-PD-12) |

#### Final verification result (automated)

- Server suite: 2423/2423 green (`npm test -- --silent` from `server/researchindicators/`)
- Lint: clean on 4 touched files (`npx eslint`, no `--fix`)
- Red input: discriminating (guard removed → TypeError instead of BadRequestException)

### T-03 — Client: `--ac-viz-*` token family + validation + registry mirrors

- **Final status:** PASS on attempt 1 (validator DEFERRED — unavailable)
- **Date:** 2026-08-21
- **Requirements covered:** R-PD-006 (Details: token registration), NFR-PD-004
- **Design decisions applied:** D-PD-13 (new `--ac-viz-*` chart-token family)

#### Attempt 1 — Implementer

- **Files changed:**
  - `client/research-indicators/src/styles/colors.scss` (+22)
  - `client/research-indicators/README.md` (+19)
  - `docs/ux-ui/design.md` (+1)

- **What was implemented:**
  - 7 new `--ac-viz-*` CSS variables: `status-approved`, `status-submitted`, `status-draft`, `status-pending`, `status-rejected`, `status-no-status`, `series-1`
  - Light values in `:root` block; dark values in `:root[data-theme="dark"]` block — independently authored (not formula-derived per D-PD-13)
  - Mirror rows in README.md (light Visualization section + Dark Mode Variables section) and docs/ux-ui/design.md §7
  - Purely additive: 42 insertions, 0 deletions

- **Implementer verification:**
  - Dataviz validator: **UNAVAILABLE** — no `dataviz` skill found in any skills directory. Escalated per task instruction ("if unavailable, escalate rather than skip") and KZ-017.
  - Substitute: WCAG 3:1 contrast check against actual card-surface tokens (`--ac-white-2: #fcfcfc` light; `--ac-background: #191919` dark) — all 14 values pass.
  - 3-file mirror grep: all 7 tokens present in all 3 files (3/3 per token).
  - Did NOT run `npm test`/`npm run build` per parallel execution constraint (T-06 running client suite).

- **Implementer `Not Done / Assumptions` (carried verbatim):**
  - Dataviz validator UNAVAILABLE — NFR-PD-004 validator gate NOT discharged; pending HITL visual check (D6 gate) or validator availability
  - Token values are best-effort, not validator-confirmed; CVD ΔE ≥ 8 and normal-vision floor ≥ 15 checks NOT run
  - Judgment calls on values: light `no-status` darkened from `#9e9e9e` to `#757575` (2.61→4.49:1); light `pending` darkened from `#ef6c00` to `#e65100` (3.00→3.69:1); `series-1` reuses blue family
  - Did NOT add viz tokens to `$colors` map (no utility classes) — followed `--ac-pool-funding-*` precedent

#### Reviewer verdict — Attempt 1

- **STATUS: PASS**
- **Summary:** All 7 `--ac-viz-*` tokens registered in both `:root` (light) and `:root[data-theme="dark"]` (dark) blocks with independently authored dark values (D-PD-13 confirmed). All 7 mirrored in README.md and docs/ux-ui/design.md §7 — 3/3 files per token. Diff purely additive (42 insertions, 0 deletions). NFR-PD-004 validator DEFERRED per SU7 accommodation — Implementer escalated rather than skipped (KZ-017), recorded substitute WCAG contrast evidence. Remaining CVD/floor checks are an explicitly recorded gap for HITL.
- **ADVISORY:** omitted per persona §7 (diff under 50-LOC threshold for checklist-style review).

#### Deferred checks (HITL validation)

| # | Check | Needs | Status |
|---|---|---|---|
| 1 | NFR-PD-004 dataviz validator (CVD ΔE ≥ 8, normal-vision ≥ 15) | `dataviz` skill / `validate_palette.js` | UNAVAILABLE — substitute WCAG 3:1 check passes; full validation at HITL or when skill available |

#### Final verification result

- 3-file mirror: 3/3 per token (grep confirmed)
- WCAG 3:1 contrast: all 14 values pass against actual card-surface tokens
- Diff: 42 insertions, 0 deletions (purely additive)

### T-06 — Client: shared project-detail service + dedupe (3 components / 4 invocations)

- **Final status:** PASS on attempt 1 (verification mode — previous run interrupted, changes verified)
- **Date:** 2026-08-21
- **Requirements covered:** R-PD-008 (AC.2 + duplicate-fetch REMOVED delta)
- **Design decisions applied:** D-PD-7 (shared service + delete mutation + null standard + guard shell), D-PD-10 (per-navigation dedupe + invalidate, NOT TTL)

#### Attempt 1 — Implementer (verification of pre-existing changes)

- **Context:** A previous run was cancelled mid-work but left complete changes in the working tree. The Leader confirmed the full client suite passed (6519/6521, 2 pre-existing `version-selector` failures unrelated). The Implementer was re-spawned in verification mode.

- **Files changed (10 total):**
  - `client/research-indicators/src/app/shared/services/get-project-detail.service.ts` (NEW)
  - `client/research-indicators/src/app/shared/services/get-project-detail.service.spec.ts` (NEW)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/project-detail.component.{ts,html,spec.ts}` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.{ts,html,spec.ts}` (modified)
  - `client/research-indicators/src/app/shared/components/section-header/section-header.component.{ts,spec.ts}` (modified)

- **What was implemented (verified by Implementer):**
  - `GetProjectDetailService` with per-navigation dedupe keyed by contract id (`inFlightByContractId` Map + `loadedContractIds` Set), `invalidate(contractId?)` per-id
  - 4 invocations migrated: shell (`getProjectDetail`), dashboard (`syncProjectFromSharedService`), section-header ×2 (`loadProjectData` + `loadProjectDataById`)
  - `full_name` mutation DELETED (consumer uses `indicator.indicator?.name ?? indicator.full_name ?? 'Indicator'` — server value survives per D-PD-7)
  - Empty state standardized on `null` (`signal<GetProjectDetail | null>(null)`) across all 3 consumers
  - Shell template guarded: `currentProject()?.` optional chaining for all 6 dereferences
  - Empty state `null` everywhere: service signal, `project-detail.component.ts:54`, `project-dashboard.component.ts:82`, `section-header.component.ts:51`

- **Implementer verification:**
  - Command: `npm test -- --silent` from `client/research-indicators/`
  - Result: **6519 passed, 2 failed** (pre-existing `version-selector.component.spec.ts:413,422` — unrelated, confirmed by stash-test at HEAD)
  - Red input (KZ-014): Re-added `this.api.GET_ResultsCount(contractId)` in `syncProjectFromSharedService` → `should load project dashboard data for the parent contract via the shared service` FAILED: `expect(apiMock.GET_ResultsCount).not.toHaveBeenCalled()` → Expected 0, Received 1. Reverted; diff unchanged.

- **K-018 realignment (derived from failing suite, not grep):**
  - `project-detail.component.spec.ts`: 4 old tests rewritten — full_name assertion now `undefined`; `GET_ResultsCount` direct-call negation; `invalidate` on destroy; null contract test
  - `project-dashboard.component.spec.ts`: setup fixture swapped `apiMock.GET_ResultsCount` for `getProjectDetailServiceMock` (signal-based `project`, `load`, `invalidate`); renamed tests to reflect shared-service delegation; null contract test
  - `section-header.component.spec.ts`: 5 tests rewritten across `loadProjectData`, `loadResultData`, `loadProjectDataById`, `clearData` — all swap API mock for service mock, assert `not.toHaveBeenCalled()` on direct API, `toBeNull()` on empty

#### Reviewer verdict — Attempt 1

- **STATUS: PASS**
- **Summary:** Shared `GetProjectDetailService` implements per-navigation dedupe keyed by contract id with `invalidate(id)` (no TTL), all four `GET_ResultsCount` invocations migrated, `full_name` mutation deleted, empty state `null`, shell + dashboard template guarded — all conforming to R-PD-008 AC.2, D-PD-7, D-PD-10. 3 pinned spec files realigned to encode `null` contract (K-018). New service goes through `ApiService`, uses signals, no hex literals. 2 pre-existing `version-selector` failures confirmed unrelated.
- **ADVISORY (non-gating, recorded):**
  1. RESILIENCE: `GetProjectDetailService.project()` is a single shared signal overwritten on each fetch. Safe under actual usage (all callers within one navigation share the same contract id; `invalidate(id)` on shell `ngOnDestroy` prevents cross-navigation stale reads), but would be fragile if used for two different ids concurrently. A per-id signal map would be more robust — noting for T-09/T-11 consumers.
  2. RELIABILITY: The 2 `version-selector` spec failures are baseline noise unrelated to T-06. Recorded so T-12's "full suites green" gate knows these pre-exist.

#### Final verification result

- Client suite: 6519/6521 green (2 pre-existing `version-selector` failures, unrelated — confirmed by stash-test at HEAD)
- Red input: discriminating (re-added `GET_ResultsCount` → "exactly one request" test failed)
- K-018: 3 spec files realigned from failing suite


