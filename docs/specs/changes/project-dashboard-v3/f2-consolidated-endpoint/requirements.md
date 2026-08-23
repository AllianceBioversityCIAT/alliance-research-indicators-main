# Requirements — Project Dashboard v3 / F2: Consolidated Dashboard Endpoint

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/project-dashboard-v3/f2-consolidated-endpoint/` |
| Parent Spec | `changes/project-dashboard-v3` (see `../family.md`) |
| Type | Change |
| Depth | Full |
| Approval Mode | gated |
| Depends on | `f1-hero-layout` (Status: done) |
| Date | 2026-08-23 |
| Author | JuanCode (via AKILI-SPECS) |
| Status | Specified |

---

## 2. Executive Summary

`project-dashboard` currently fires seven separate analytic `GET` requests (`results-summary`, `top-partners`, `top-primary-levers`, `top-main-contact-persons`, `top-contributors-contracts`, `geo-scope`, `sp-alignment`) per project view. Each query is evaluated against the same underlying contract results dataset and shares the exact same seed query (`buildPrimaryContractResultsSubquery`). On the client, this manifests as 7 separate signal-triple services, 7 skeleton loading handlers, and 7 independent error/retry loops.

This feature consolidates these seven calls into a single aggregate endpoint (`GET /api/v1/agresso/contracts/reports/dashboard?contract-id=`) returning a structured composite payload with nullable sections. If one analytic section fails internally, the response delivers `null` for that section alongside error details in the standard `ServerResponseDto` envelope without failing the entire dashboard. The client migrates to a single `GetContractDashboardService` with unified loading, error, and retry states.

---

## 3. Glossary

- **Composite Payload:** A single structured JSON response containing named sections (`summary`, `tops`, `geo_scope`, `sp_alignment`).
- **Nullable Section:** A top-level section in the composite response that evaluates to `null` if that specific calculation encounters an error or is not applicable (e.g. `sp_alignment` for non-bilateral projects).
- **Partial Failure Semantics:** The server responds with `HTTP 200` when at least one section succeeds, populating the `errors` array in `ServerResponseDto` with specific section error messages if any section fails.
- **Signal-Triple Service:** An Angular service encapsulating a reactive state pattern consisting of `data` (or `list`/`summary`), `loading`, and `loadError` signals.

---

## 4. System Context & Scope

### In-Scope
- **Server Tier:**
  - New aggregate controller endpoint `GET /api/v1/agresso/contracts/reports/dashboard` with query parameter `contract-id`.
  - Repository composition method `getContractDashboard(contractId)` executing section queries concurrently (`Promise.allSettled` or `Promise.all` with individual catch boundaries).
  - DTO definition `ContractDashboardReportDto` enforcing runtime validation and Swagger schema documentation.
  - Server unit tests verifying payload construction, concurrent execution, and partial failure isolation.
- **Client Tier (STAR):**
  - New client method `apiService.GET_ContractDashboard(contractId)`.
  - Consolidated Angular service `GetContractDashboardService` exposing structured signals (`dashboard`, `summary`, `tops`, `geoScope`, `spAlignment`, `loading`, `loadError`).
  - Migration of `project-dashboard.component.ts` to consume `GetContractDashboardService`.
  - Client unit tests verifying unified loading/error/retry states and empty-collapse compatibility.
- **Deprecation & Cleanup:**
  - Deprecate old 7 report endpoints in Swagger (`deprecated: true`).
  - Remove deprecated endpoints in server controller and retire obsolete client services once migration is verified.

### Out-of-Scope (Non-Goals)
- No schema or database migration changes (all aggregation is read-only).
- No visual or styling redesigns (must maintain 100% visual parity with F1 hero layout).
- No consolidation of non-dashboard endpoints (`results/count`, `contract-staff`, paginated `GET results`, or `document-overview`).

---

## 5. Stakeholders & Personas

- **Project Lead / Researcher:** Experiences a faster, single-trip dashboard load with synchronized data rather than staggered widget hydration.
- **System Administrator / API Consumer:** Benefits from unified analytics contract and reduced connection concurrency on the server.
- **Frontend Engineer:** Interacts with a single cohesive service rather than orchestrating 7 disparate services for one view.

---

## 6. Functional Requirements

### Requirement: R-CE-001 Consolidated Dashboard API Endpoint

The server SHALL provide a single aggregated report endpoint `GET /api/v1/agresso/contracts/reports/dashboard` requiring query parameter `contract-id`.

#### Scenario: Successful full aggregation
- GIVEN a valid `contract-id` for a bilateral contract with complete reporting history
- WHEN a client sends `GET /api/v1/agresso/contracts/reports/dashboard?contract-id=C-100`
- THEN the server executes the queries in parallel
- AND returns `HTTP 200` with `ServerResponseDto` wrapping `ContractDashboardReportDto`
- AND the `data` object contains non-null `summary`, `tops` (`partners`, `primary_levers`, `main_contacts`, `contributors`), `geo_scope`, and `sp_alignment`
- BUT it must NOT execute queries sequentially
- AND IT MUST include standard Swagger annotations (`@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiQuery`).

#### Scenario: Non-bilateral contract SP alignment omission
- GIVEN a valid `contract-id` for a non-bilateral contract (e.g. pooled funding or non-research contract)
- WHEN a client sends `GET /api/v1/agresso/contracts/reports/dashboard?contract-id=C-POOL`
- THEN `summary`, `tops`, and `geo_scope` return their calculated objects
- AND `sp_alignment` returns `null`
- BUT the response must NOT return an error for `sp_alignment`.

---

### Requirement: R-CE-002 Partial Failure Resilience & Isolation

The server SHALL isolate failures within individual report subqueries so that a failure in one section does not abort the entire dashboard report.

#### Scenario: Single section query error isolation
- GIVEN a database hiccup or transient error occurring during `geo_scope` calculation
- WHEN the consolidated report handler executes
- THEN `geo_scope` section in `data` returns `null`
- AND `summary`, `tops`, and `sp_alignment` sections contain their successfully computed data
- AND `ServerResponseDto.errors` contains an error descriptor identifying `geo_scope` failure
- BUT the overall HTTP response must NOT fail with `500 Internal Server Error`
- AND IT MUST return HTTP status `200` with available sections intact.

---

### Requirement: R-CE-003 Client Consolidated State Management

The client SHALL encapsulate the composite dashboard payload in a single injectable service `GetContractDashboardService`.

#### Scenario: Synchronized loading and hydration
- GIVEN the user navigates to `/project-detail/:contractId/project-dashboard`
- WHEN `GetContractDashboardService.load(contractId)` is triggered
- THEN `loading()` signal transitions to `true`
- AND all dashboard sections display their coordinated loading skeletons
- AND when the response arrives, all dashboard sections hydrate simultaneously from the single snapshot
- BUT it must NOT trigger multiple distinct network requests for the 7 analytic widgets
- AND IT MUST expose memoized computed signals (`summary()`, `topPartners()`, `topLevers()`, `topContacts()`, `topContributors()`, `geoScope()`, `spAlignment()`) for component consumption.

#### Scenario: Unified retry action
- GIVEN the dashboard failed to load due to network error (`loadError() === true`)
- WHEN the user clicks "Try again" on any widget's error state
- THEN `GetContractDashboardService.update()` re-fetches the entire dashboard composite
- AND all widgets transition to loading and then to resolved state together.

---

### Requirement: R-CE-004 Parity with F1 Visual & Behavioral Contracts

The client migration SHALL preserve 100% of the interactive behaviors, empty-collapse rules, and drill-through routing implemented in F1.

#### Scenario: Empty widget collapse from composite data
- GIVEN a project where `tops.partners` is empty (`[]`) and `summary.total` is `0`
- WHEN `GetContractDashboardService` resolves
- THEN `no-data-group` collapses Top Partners and Results by Indicator into the collapsed list
- AND the other widgets render in accordance with F1 rules (R-HL-004)
- BUT it must NOT break drill-through query params (`leverTab`, `contractTab`, `yearTab`, `indicatorTab`, `statusTab`).

---

### Requirement: R-CE-005 Deprecation & Retirement of Legacy Report Endpoints

The system SHALL mark legacy report endpoints as deprecated in Swagger, migrate the STAR client, and cleanly remove obsolete endpoints and services.

#### Scenario: Legacy cleanup
- GIVEN the client has fully switched to `GET /api/v1/agresso/contracts/reports/dashboard`
- WHEN verification confirms zero external callers
- THEN the 7 legacy report endpoints on `AgressoContractController` and the 7 legacy client services are retired
- BUT the standalone `reports/contract-staff` and `results/count` endpoints must remain untouched.

---

## 7. Non-Functional Requirements

- **NFR-CE-001 (Network Efficiency):** Dashboard initial load network request count for analytics SHALL decrease from 7 HTTP requests to 1 HTTP request.
- **NFR-CE-002 (Execution Time):** The backend aggregation SHALL execute section subqueries concurrently (`Promise.allSettled`), with server processing time not exceeding `max(query_time) + 15ms`.
- **NFR-CE-003 (Test Coverage):** Global server and client test coverage thresholds (60% server, 40%/20%/30%/45% client) SHALL be maintained with 100% green test suites.

---

## 8. Defect Classes & Verification Matrix

| Defect Class | Vulnerable Surface | Verification Gate |
|---|---|---|
| **Partial Failure Leakage** | Repository query execution | Server unit tests mocking individual section rejection and asserting non-null sibling sections and envelope `errors`. |
| **Object-Shaped Data Drift (KZ-001)** | DTO serialization / Mock fixtures | Server DTO validation tests with TypeORM query builders + client unit tests using full object fixtures. |
| **Co-Rendered Component Breakage (KZ-002)** | Dashboard child widgets / No-data group | Full client unit tests across `project-dashboard.component.spec.ts` and `no-data-group.component.spec.ts`. |
| **Stale Signal Desynchronization** | Computed signals on dashboard service | Reactive signal tests verifying simultaneous updates on `load()` and `update()`. |
| **Routing / Drill Contract Regression** | Navigation query parameters | Unit tests in `project-detail.component.spec.ts` and `project-dashboard.component.spec.ts`. |

---

## 9. Requirement ID Index

- `R-CE-001`: Consolidated Dashboard API Endpoint
- `R-CE-002`: Partial Failure Resilience & Isolation
- `R-CE-003`: Client Consolidated State Management
- `R-CE-004`: Parity with F1 Visual & Behavioral Contracts
- `R-CE-005`: Deprecation & Retirement of Legacy Report Endpoints
- `NFR-CE-001`: Network Efficiency
- `NFR-CE-002`: Execution Time
- `NFR-CE-003`: Test Coverage
