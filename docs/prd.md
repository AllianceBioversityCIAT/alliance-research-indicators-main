# Product Requirements Document — Alliance Research Indicators (ARI) Backend

> Living document. Update whenever scope, personas, or KPIs change.
> Scope of this PRD: the **server** package (`server/researchindicators`). The standalone client app under `client/` is out of scope here and tracked in its own PRD.

---

## 1. Overview & Purpose

The **Alliance Research Indicators (ARI)** backend is the API platform that powers research results reporting for the CGIAR Alliance and its partner platforms. It centralizes the capture, validation, governance, and publication of research **Results** (innovations, capacity sharing, policy change, OICRs, IP rights, knowledge products, etc.) so that contributors, MEL experts, and center admins can move from raw evidence to formally reported research outcomes against indicators, contracts, levers, and strategic outcomes.

The ARI backend is the system of record for the **Results domain** and is the integration hub between CGIAR master data (CLARISA), finance/contracts (AGRESSO), reporting platforms (PRMS, TIP, AICCRA), authentication (ROAR Management), search (OpenSearch), and external feedback storage (DynamoDB).

---

## 2. Problem Statement

CGIAR research outputs are produced across many centers, contracts, and reporting platforms, each with its own conventions and validation rules. Today, contributors must:

- Re-enter the same research data into multiple platforms.
- Reconcile inconsistent taxonomies for indicators, levers, geographies, and partners.
- Manage approvals, versioning, and audit trails outside a unified workflow.
- Wait on manual cross-checks between CLARISA, AGRESSO, and reporting systems.

This causes duplicated effort, inconsistent reporting to donors and impact-area boards, slow MEL cycles, and weak traceability of who changed what and when.

**The ARI backend exists to be the single, governed source of truth for research result reporting** — exposed via a versioned REST API, real-time socket channel, and OpenSearch indexes — so partner systems and the STAR frontend can consume one consistent dataset, and MEL/admin staff can govern it through a controlled workflow.

---

## 3. Target Personas

### 3.1 Result Contributor (CGIAR researcher / project staff)
- Reports results against contracts, indicators, and levers.
- Captures evidence, partners, geographies, and qualitative narrative.
- Needs simple, guided forms; clear status (DRAFT → SUBMITTED → APPROVED, etc.); validation feedback.

### 3.2 MEL Regional Expert
- Reviews, validates, and curates results before they advance in the workflow.
- Needs filters, bulk views, controlled editing on results in their region/cluster, and traceability of edits.

### 3.3 Center / General Admin
- Oversees a center's reporting cycle.
- Manages users, contracts, indicator coverage, announcements, and reporting feedback.
- Needs reports, controlled editing permissions, and operational visibility.

### 3.4 System Admin / Technical Support / Developer
- Operates the platform end-to-end.
- Manages app configuration, secrets, integrations, cron jobs, and OpenSearch sync.
- Needs admin SSR panel, observability, and a stable, documented API surface.

### 3.5 Downstream API consumers (treated as first-class users)
- **STAR frontend** — research-indicators web app (sibling repo under `client/`), the primary human UI for contributors and MEL.
- **PRMS / TIP / AICCRA** — partner CGIAR platforms that read from ARI APIs and OpenSearch indexes.
- **AI/ML formalization pipeline** — pushes raw AI-extracted results via `/results/ai/formalize` endpoints; ARI normalizes them into the Results domain.
- **Internal Admin SSR panel** — `/admin` routes served from this server using React 19 SSR (Vite build).

---

## 4. Goals & Success Metrics

### Goals
- **G1.** Be the single API of record for research Results across the CGIAR Alliance reporting ecosystem.
- **G2.** Enforce a governed, auditable result lifecycle (status workflow, versioning/snapshots, role-based controlled editing).
- **G3.** Provide a stable, versioned REST API + real-time socket + OpenSearch surface for partner platforms and STAR.
- **G4.** Reduce duplicated data entry by integrating master data (CLARISA), contracts/staff (AGRESSO), and reporting (PRMS/TIP) at the data layer.
- **G5.** Enable AI-assisted result reporting via formalization endpoints without bypassing the governance workflow.

### Success Metrics — *proposed, to be validated with stakeholders*
> Concrete KPI targets are intentionally left open in this PRD (see §9). Candidates:
- Adoption: % of centers/contracts reporting through ARI vs. legacy paths.
- Cycle time: median time from result DRAFT → APPROVED.
- Data quality: % of results that pass validation on first MEL review.
- Integration health: success rate and lag of AGRESSO / CLARISA / OpenSearch sync jobs.
- API health: p95 latency on top result-query endpoints; 4xx/5xx rate.
- Audit completeness: % of mutations with a complete audit trail (created/updated by + version).

---

## 5. Scope

### In scope
- Results domain: lifecycle, versioning/snapshots, status workflow, indicators, contracts, levers, SDGs, impact areas, geographies, partners, evidences, AI formalization, OICR, knowledge products, IP rights, policy change, capacity sharing, innovation dev.
- Master data integrations: CLARISA (countries, regions, levers, indicators, etc.), AGRESSO (contracts, staff, contract countries) via MSSQL/SOAP.
- Auth & authorization: JWT validation against ROAR; alternate `client_id/client_secret` machine tokens; role-based access via `SecRolesEnum` and the `RolesGuard`.
- Search: OpenSearch indexes for Results, Alliance Staff, PRMS feed.
- Messaging: RabbitMQ microservice for cross-system events; Socket.IO gateway for real-time UI updates.
- External feedback: AWS DynamoDB feedback store.
- Reporting feedback, announcements, app configuration, user settings, tags, reports, sync process logs.
- Admin SSR panel under `/admin` (Vite + React 19) embedded in the server.
- Cron jobs: AGRESSO, CLARISA, TIP, sync process logs.
- Versioned REST API at `/api/v{n}/...` documented via Swagger at `/swagger`.

### Out of scope (here)
- The standalone STAR client app under `client/research-indicators` (separate PRD).
- Infrastructure as code, CI/CD pipelines, Elastic Beanstalk deployment specifics (covered in ops docs).
- Visual / brand design system (the ARI backend serves data; visual identity belongs to STAR / Admin UI specs).
- Donor-facing public website or marketing properties.

### Non-goals
- ARI is not a generic project management tool — it is purpose-built for CGIAR research result reporting.
- ARI is not a CLARISA replacement — CLARISA remains the master data authority.
- ARI is not an AGRESSO replacement — contracts/staff remain owned by AGRESSO.

---

## 6. User Stories

Stories follow the form: *As a {persona}, I want {capability} so that {outcome}.*

### Result Contributor
- **US-RC-1.** As a Result Contributor, I want to create a result tied to a contract, indicator, and lever so that my reporting is correctly aligned to my funding and to CGIAR strategic outcomes.
- **US-RC-2.** As a Result Contributor, I want guided forms for capacity sharing / innovation dev / policy change / OICR / IP rights / knowledge products so that I report each result type with the right evidence.
- **US-RC-3.** As a Result Contributor, I want to attach geographies, partners, languages, and evidence so that my result is complete and traceable.
- **US-RC-4.** As a Result Contributor, I want to see my last-updated results quickly so that I can resume work in progress.
- **US-RC-5.** As a Result Contributor, I want AI-assisted result drafting so that I can convert text/evidence into a structured result with minimal manual entry.

### MEL Regional Expert
- **US-MEL-1.** As a MEL Regional Expert, I want to search and filter results by status, contract, year, indicator, and platform so that I can triage my review queue.
- **US-MEL-2.** As a MEL Regional Expert, I want controlled editing permissions on results within my scope so that I can correct data without bypassing the workflow.
- **US-MEL-3.** As a MEL Regional Expert, I want to leave reporting feedback and request changes so that contributors can iterate.
- **US-MEL-4.** As a MEL Regional Expert, I want a full audit trail per result (who, what, when, version) so that I can defend the data to auditors and donors.

### Center / General Admin
- **US-CA-1.** As a Center Admin, I want to manage announcements, app configuration, and per-user settings so that contributors get the right experience and messaging.
- **US-CA-2.** As a Center Admin, I want to bulk-formalize AI-extracted results so that backlog reporting is fast.
- **US-CA-3.** As a Center Admin, I want overview reports (general report, last-updated, by-status) so that I can monitor my center's reporting cycle.

### System Admin / Developer
- **US-SA-1.** As a System Admin, I want to manage app secrets, host allowlists, and integration credentials so that partner platforms can authenticate safely.
- **US-SA-2.** As a System Admin, I want cron-driven sync of AGRESSO, CLARISA, and TIP so that master data stays current without manual triggers.
- **US-SA-3.** As a System Admin, I want operational visibility (logs, sync process logs, swagger, admin panel) so that I can diagnose incidents.

### Downstream consumer (machine)
- **US-DC-1.** As a partner platform (PRMS/TIP/AICCRA), I want to authenticate with a `client_id/client_secret` token and read scoped result data so that I can build dashboards and exports.
- **US-DC-2.** As the STAR frontend, I want stable, versioned REST endpoints and real-time socket notifications so that the UI reflects the current state of results.

---

## 7. Acceptance Criteria

These cut across modules. Each module-level spec under `docs/specs/<module>/` MUST refine its own acceptance criteria.

### AC-Auth
- Every protected endpoint requires a Bearer token; anonymous access is allowed only on the `exclude` list configured in `AppModule` (e.g. `GET /api/configuration/:key`, `/admin/*`).
- Two token shapes are accepted: ROAR-issued JWT, and base64-encoded `{client_id, client_secret}` validated against `app_secrets` + host allowlist.
- `RolesGuard` denies access when the user lacks all required roles, except for `SYSTEM_ADMIN` which bypasses role checks.

### AC-Results-Lifecycle
- A result is uniquely identified by `result_id` and an immutable `result_official_code`; mutations create or update a versioned record honoring `is_snapshot`, `version_id`, and `report_year_id`.
- Status transitions follow the `result_status_workflow` table and are enforced via `ResultStatusGuard` on mutating endpoints.
- All entities derived from `AuditableEntity` capture created/updated user + timestamps; the `LoggingInterceptor` logs the user id on each request.

### AC-API-Surface
- All HTTP endpoints are mounted under `/api` with URI versioning (`/api/v1/...`, `/api/v2/...`).
- All responses pass through `ResponseInterceptor` and emit `ServerResponseDto` (`{ data, status, description, errors, timestamp, path }`).
- All errors flow through `GlobalExceptions` and emit the same envelope shape with a non-2xx `status`.
- Swagger UI is available at `/swagger` and documents all controllers with `@ApiTags`, `@ApiOperation`, `@ApiQuery`, `@ApiBody`, `@ApiBearerAuth`.

### AC-Integrations
- CLARISA-, AGRESSO-, TIP- driven master data is refreshed by scheduled cron jobs and on-demand admin endpoints; failures are logged and surfaced in `sync_process_log`.
- OpenSearch documents are derived from the same TypeORM entities using the `@OpenSearchProperty` decorator; an index is rebuildable.
- The microservice bootstraps a RabbitMQ queue (`ARI_QUEUE`) and exposes message handlers via `AppMicroserviceModule`.
- Socket.IO gateway is reachable on the same Nest application and emits result-update events to connected clients.

### AC-Admin-Panel
- `/admin` routes serve a React 19 SSR app built by Vite; static assets are served from `dist/admin/public`.
- Admin routes are excluded from the JWT middleware but MUST be protected by an admin guard before any production deployment (currently flagged as open work in the README).

---

## 8. Assumptions, Dependencies, & Constraints

### Assumptions
- ROAR Management remains the authoritative identity provider for human users.
- CLARISA remains the master data authority for taxonomy (countries, regions, levers, indicators, institutions).
- AGRESSO remains the authoritative source for contracts, staff, and contract-country links (accessed via MSSQL + SOAP).
- The STAR frontend is the primary human UI for contributors and MEL; ARI does not need to ship a contributor UI.
- AWS Elastic Beanstalk + RDS (MySQL) + DynamoDB + RabbitMQ + OpenSearch is the deployment target.

### Dependencies
- ROAR Management API (token validation).
- CLARISA API.
- AGRESSO (MSSQL DB + SOAP services).
- TIP integration.
- OpenSearch cluster.
- AWS DynamoDB (feedback store).
- AWS S3 (where applicable for static assets / evidence — to confirm in detailed design).
- RabbitMQ broker.

### Constraints
- Node ≥ 20.11.1; TypeScript 5.7; NestJS 10; TypeORM 0.3; MySQL utf8mb4.
- Jest coverage thresholds: 60% branches / functions / lines / statements (configured in `package.json`).
- Strict layering: `entities/<module>` for domain modules; `tools/<integration>` for external integrations; `shared/` for cross-cutting concerns. Migrations live under `src/db/migrations` and are run via npm scripts.
- Helmet CSP is configured for both prod and Vite dev (`http://localhost:5173`).
- Body limit: 50 MB JSON / URL-encoded.

### Risks
- The `client_id/client_secret` token is base64 of plain JSON; rotation policy + host allowlist hardening are critical.
- `/admin` is currently excluded from JWT — needs an explicit admin guard before exposing in production.
- Large fan-out on `Result` entity relations (~30+ `OneToMany`) can cause N+1 issues; pagination + selective `relations` are required on list endpoints.
- `DEPRECATED` roles in `SecRolesEnum` indicate an in-flight access model migration that must be tracked.

---

## 9. Open Questions

- **OQ-1.** What concrete KPI targets do we commit to for adoption, cycle time, data quality, and API health? (Decision left open — see §4.)
- **OQ-2.** What is the long-term plan for the deprecated roles (`IT_SUPPORT`, `GLOBAL`, `CONTRACT_CONTRIBUTOR`, `RESULT_CONTRIBUTOR`, `TESTER`)? Are they being migrated, and on what timeline?
- **OQ-3.** What is the auth model for the embedded `/admin` SSR panel — ROAR JWT, a separate admin guard, or both?
- **OQ-4.** Are PRMS / TIP / AICCRA expected to consume OpenSearch directly, the REST API, or both? What contracts are committed?
- **OQ-5.** What is the SLA/SLO target for cross-system sync jobs (AGRESSO, CLARISA, TIP) and how are failures escalated?
- **OQ-6.** Is the AI formalization pipeline first-party (internal service) or third-party? What does its auth and rate limiting look like?
- **OQ-7.** Data residency / compliance: any constraints on storing evidence and contributor PII (GDPR, donor requirements)?
