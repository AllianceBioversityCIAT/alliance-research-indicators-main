# Execution Log — project-detail / Dashboard Advanced Analytics

- **Spec Path:** `docs/specs/changes/dashboard-advanced-analytics/`
- **Spec ID:** `2026-08-dashboard-advanced-analytics`
- **Started:** 2026-08-22
- **Status:** in-progress

---

## Task Audit Log

### T-01 — Server: sp-alignment aggregation (repository + DTO)
- **Status:** PASS
- **Attempts:** 1
- **Implementer (Attempt 1):**
  - Files created: `server/researchindicators/src/domain/entities/agresso-contract/dto/contract-sp-alignment-report.dto.ts`
  - Files modified: `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`, `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`
  - Verification:
    - Jest: `PASS src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` (71 passed, 71 total)
    - ESLint: `npx eslint src/domain/entities/agresso-contract/` (0 errors)
- **Reviewer Audit (Attempt 1):**
  - **Verdict:** STATUS: PASS
  - **Findings:**
    - R-DA-001 / AC.1 (Shape & Output): PASS. DTOs are correctly shaped with Swagger `@ApiProperty`.
    - R-DA-001 / AC.2 (Multiple SP links): PASS. Distinct grouping handles multiple SPs correctly, and `results_with_alignment` remains a distinct count of results.
    - R-DA-001 / AC.3 & D-DA-4 (UNKNOWN Mapping): PASS. Enforced in SQL via `COALESCE(rpfas.sp_role, 'UNKNOWN') AS role`.
    - R-DA-001 / AC.4 (Counters & Empty Array): PASS. Empty alignments properly resolve to `sps: []` and correct total counts.
    - Error handling: Empty `contractId` yields `BadRequestException` (400).

### T-02 — Server: sp-alignment endpoint + Swagger
- **Status:** PASS
- **Attempts:** 1
- **Implementer (Attempt 1):**
  - Files modified:
    - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.controller.ts`
    - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.service.ts`
    - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.controller.spec.ts`
    - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.service.spec.ts`
  - Verification:
    - Jest: `PASS src/domain/entities/agresso-contract/agresso-contract.service.spec.ts`, `PASS src/domain/entities/agresso-contract/agresso-contract.controller.spec.ts` (54 passed, 54 total)
    - ESLint: `npx eslint src/domain/entities/agresso-contract/` (0 errors)
- **Reviewer Audit (Attempt 1):**
  - **Verdict:** STATUS: PASS
  - **Findings:**
    - R-DA-001 AC.1: PASS. `GET reports/sp-alignment` endpoint declared with `@ApiOperation` and `@ApiContractReportQueries()`.
    - Envelope & Error handling: PASS. Response formatted with `ResponseUtils.format`, 400 on empty contract-id verified.
    - 4R sweep clean. Swagger metadata presence verified via reflection tests.

### T-03 — Server: results-summary matrix extension
- **Status:** PASS
- **Attempts:** 1
- **Implementer (Attempt 1):**
  - Files modified:
    - `server/researchindicators/src/domain/entities/agresso-contract/dto/contract-results-summary-report.dto.ts`
    - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`
    - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`
  - Verification:
    - Jest: `PASS src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`, `PASS src/domain/entities/agresso-contract/agresso-contract.service.spec.ts`, `PASS src/domain/entities/agresso-contract/agresso-contract.controller.spec.ts` (126 passed, 126 total)
    - ESLint: `npx eslint src/domain/entities/agresso-contract/` (0 errors)
- **Reviewer Audit (Attempt 1):**
  - **Verdict:** STATUS: PASS
  - **Findings:**
    - R-DA-002 AC.1 & Scenario: PASS. `by_indicator_year` matrix aggregate groups by `indicator_id` and `year`, no fabricated zero cells emitted, null year bucket mapped explicitly, cell sums reconcile with `total` and indicator/year totals.
    - R-DA-002 AC.2 & D11: PASS. Existing fields (`total`, `by_status`, `by_year`, `partner_institutions`) byte-compatible and untouched.
    - 4R sweep clean. SQL generation, parameter binding, and invariant tests verified.

### T-04 — Server: findOneContract payload extension
- **Status:** PASS
- **Attempts:** 1
- **Implementer (Attempt 1):**
  - Files modified:
    - `server/researchindicators/src/domain/entities/agresso-contract/dto/contract-result-count.dto.ts`
    - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`
    - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`
  - Verification:
    - Jest: `PASS src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`, `PASS src/domain/entities/agresso-contract/agresso-contract.service.spec.ts` (100 passed, 100 total)
    - ESLint: `npx eslint src/domain/entities/agresso-contract/` (0 errors)
- **Reviewer Audit (Attempt 1):**
  - **Verdict:** STATUS: PASS
  - **Findings:**
    - R-DA-005 & D-DA-3: PASS. `ContractResultCountDto` and `findOneContract` payload extended with `funding_type`, `center_amount_usd`, `grant_amount_usd`, `sdgs`, `contract_status`, `status_name`, and `cgiar_entities`.
    - Data Retrieval & S2: PASS. Subquery on `pooled_funding_contracts` aggregates active entities, defaults to `[]` when absent. Defensive JSON parsing ensures cross-driver stability.
    - 4R sweep clean. Existing fields byte-identical; no breaking changes.

### T-05 — Client: token extension + validation + mirrors
- **Status:** PASS
- **Attempts:** 1
- **Implementer (Attempt 1):**
  - Files modified:
    - `client/research-indicators/src/styles/colors.scss`
    - `client/research-indicators/scripts/validate-tokens.mjs` (NEW)
    - `client/research-indicators/package.json`
    - `client/research-indicators/README.md`
    - `docs/ux-ui/design.md`
  - Verification:
    - Validator: `npm run tokens:validate` (19/19 tokens valid, light ramp 93.1% > 77.1% > 61.0% > 46.1% > 34.1%, dark ramp 16.3% < 28.0% < 42.7% < 61.0% < 77.1%)
    - Lint: `npm run lint -- --quiet` (0 errors)
- **Reviewer Audit (Attempt 1):**
  - **Verdict:** STATUS: PASS
  - **Findings:**
    - R-DA-008 AC.1 & D-DA-8: PASS. Automated validator script parses `colors.scss`, checks WCAG contrast, verifies strict ramp monotonicity per theme.
    - R-DA-008 AC.2 & Mirrors: PASS. 12 tokens registered in `colors.scss`, mirrored to client `README.md` and `docs/ux-ui/design.md` §7.1.
### T-06 — Client: viz-chart wrapper
- **Status:** PASS
- **Attempts:** 2 (Attempt 1: FAIL due to `#ffffff` fallback in overlay template; Attempt 2: PASS after replacing with `bg-[var(--ac-white-1)]/80`)
- **Implementer (Attempt 1 & 2):**
  - Files modified/created:
    - `client/research-indicators/src/app/shared/utils/chart-tokens.util.ts`
    - `client/research-indicators/src/app/shared/utils/chart-tokens.util.spec.ts`
    - `client/research-indicators/src/app/shared/components/viz-chart/viz-chart.component.ts` (NEW)
    - `client/research-indicators/src/app/shared/components/viz-chart/viz-chart.component.html` (NEW)
    - `client/research-indicators/src/app/shared/components/viz-chart/viz-chart.component.scss` (NEW)
    - `client/research-indicators/src/app/shared/components/viz-chart/viz-chart.component.spec.ts` (NEW)
    - `client/research-indicators/jest.config.ts`
    - `client/research-indicators/package.json`
    - `docs/ux-ui/design.md`
  - Verification:
    - Jest: `PASS src/app/shared/components/viz-chart/viz-chart.component.spec.ts`, `PASS src/app/shared/utils/chart-tokens.util.spec.ts` (16 passed, 16 total)
    - Lint: `npm run lint -- --quiet` (0 errors)
    - Zero hex check: 0 hex literals in `viz-chart/`
- **Reviewer Audit (Attempt 2):**
  - **Verdict:** STATUS: PASS
  - **Findings:**
    - R-DA-009 AC.1: PASS. Structural `tableModel` input renders `.sr-only` `<table>` with `<caption>`, `<thead>`, `<tbody>`, preventing charts from rendering without paired accessible data.
    - R-DA-007 AC.1: PASS. Checks `prefers-reduced-motion: reduce` and sets `animation: false` on ECharts options.
    - R-DA-006 & D-DA-1: PASS. Tree-shaken `echarts/core` with `SVGRenderer`, `ResizeObserver` lifecycle management, clean `dispose()` on destroy.
    - Gate D4: PASS. Zero hex literals across component files.
    - 4R sweep clean. Safe, accessible, and reactive foundation for advanced dataviz widgets.

### T-07 — Client: services + interfaces
- **Status:** PASS
- **Attempts:** 1
- **Implementer (Attempt 1):**
  - Files modified/created:
    - `client/research-indicators/src/app/shared/interfaces/contract-sp-alignment.interface.ts` (NEW)
    - `client/research-indicators/src/app/shared/interfaces/contract-results-summary.interface.ts`
    - `client/research-indicators/src/app/shared/interfaces/find-contracts.interface.ts`
    - `client/research-indicators/src/app/shared/interfaces/get-project-detail.interface.ts`
    - `client/research-indicators/src/app/shared/services/api.service.ts`
    - `client/research-indicators/src/app/shared/services/api.service.spec.ts`
    - `client/research-indicators/src/app/shared/services/get-contract-sp-alignment.service.ts` (NEW)
    - `client/research-indicators/src/app/shared/services/get-contract-sp-alignment.service.spec.ts` (NEW)
  - Verification:
    - Jest: `PASS src/app/shared/services/get-contract-sp-alignment.service.spec.ts`, `PASS src/app/shared/services/api.service.spec.ts` (232 passed, 232 total)
    - Lint: `npm run lint -- --quiet` (0 errors)
- **Reviewer Audit (Attempt 1):**
  - **Verdict:** STATUS: PASS
  - **Findings:**
    - R-DA-001: PASS. Interfaces `ContractSpAlignmentReport`, `ContractSpAlignmentSp`, `ContractSpAlignmentLink` with precise `'PRIMARY' | 'CONTRIBUTING' | 'UNKNOWN'` typing. `ApiService.GET_ContractSpAlignment` with encoded query param and `GetContractSpAlignmentService` with reactive signals.
    - R-DA-002: PASS. `ContractResultsSummaryIndicatorYearBucket` with `year: number | null` and `by_indicator_year` added without breaking existing fields.
    - R-DA-005: PASS. `GetProjectDetail` and `FindContracts` extended with `center_amount_usd`, `grant_amount_usd`, `funding_type`, `sdgs`, `cgiar_entities`.
    - 4R sweep clean. Strict additive types and resilient signal state management.





