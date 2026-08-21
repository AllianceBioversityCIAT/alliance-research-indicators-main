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


