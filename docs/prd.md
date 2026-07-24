# Product Requirements Document — Alliance Research Indicators (ARI) Monorepo

> Living document. Update whenever scope, personas, or KPIs change — never let it drift behind the implementation.
>
> **Scope of this PRD:** the **ARI monorepo**, which contains two packages:
> - **Server** (`server/researchindicators`) — the NestJS backend: system of record for the Results domain and integration hub across CGIAR master data, finance, reporting, auth, and search.
> - **Client** (`client/research-indicators`) — the **STAR** web app (Angular 19 + PrimeNG 19): the primary human UI for contributors, MEL experts, and admins.
>
> Bullets and criteria are tagged **(server)**, **(client)**, or **(both)** where the tier matters. Technical detail lives in `docs/detailed-design/`; UX system rules live in `docs/system-design/`.

---

## 1. Overview & Purpose

**Alliance Research Indicators (ARI)** is the platform the CGIAR Alliance (Bioversity International + CIAT) and its partner ecosystem (STAR, TIP, PRMS, AICCRA) use to **report, validate, search, and analyze research results** mapped to a standardized indicator framework.

Research **Results** — innovations, capacity sharing, policy change, OICRs, IP rights, knowledge products, and related artifacts — are captured once, with structured metadata drawn from canonical controlled vocabularies (CLARISA institutions, countries, SDGs, levers, impact areas), so they are comparable across platforms and reportable to funders and global frameworks.

| Package | Role |
| --- | --- |
| **Server** (`server/researchindicators`) | System of record for the **Results domain** and the integration hub between CLARISA (master data), AGRESSO (finance/contracts), reporting platforms (PRMS, TIP, AICCRA), ROAR Management (auth), OpenSearch (search), and DynamoDB (feedback). Exposes a versioned REST API, a real-time socket channel, and OpenSearch indexes. Also serves an internal `/admin` SSR panel. |
| **Client — STAR** (`client/research-indicators`) | The primary user-facing layer: a role-aware, federation-aware Angular web app to capture, link, search, and analyze results. Consumes the server's APIs; does not define their data model. |

---

## 2. Problem Statement

CGIAR research outputs are produced across many centers, contracts, and reporting platforms, each with its own conventions and validation rules. Historically:

- **Reporting was fragmented.** Contributors re-entered the same research data into multiple platforms, each with incompatible structures, making cross-platform aggregation expensive and error-prone.
- **Controlled vocabularies drifted.** Institution names, country codes, SDGs, and lever taxonomies were re-entered manually, producing inconsistent reporting to donors and impact-area boards.
- **Evidence was scattered.** Files, OICR narratives, partner lists, and policy/innovation metadata lived in spreadsheets, emails, and ad-hoc tools.
- **Approvals and auditability were weak.** Status, versioning, and audit trails lived outside a unified workflow; centers had little visibility into who reported what, when, and whether it was validated.
- **Cross-checks were manual.** Reconciling CLARISA, AGRESSO, and reporting systems slowed MEL cycles.

**ARI exists to be the single, governed source of truth for research result reporting.** The **server** provides a versioned REST API, real-time socket channel, and OpenSearch indexes so partner systems consume one consistent dataset and MEL/admin staff govern it through a controlled workflow. The **client (STAR)** provides the one structured, role-aware, federation-aware interface where humans capture, link, search, and analyze those results.

---

## 3. Target Personas

Personas are **shared across both tiers**. Each entry notes where server and client responsibilities differ. All are first-class — decisions should not regress any of them.

### 3.1 Result Contributor / Researcher (project staff or scientist)
- **Job:** Create a result tied to a contract, indicator, and lever; fill tabbed metadata (general info, partners, evidence, OICR, IP rights, capacity sharing, policy change, innovation, geographic scope); attach evidence; submit for review.
- **Client:** guided, tabbed forms with pre-population, save-in-progress, duplicate warnings, clear status.
- **Server:** enforces lifecycle, validation, versioning, audit; exposes AI-assisted formalization endpoints.
- **Pain to remove:** re-entering institution/country data, losing form state between tabs, unclear required fields, unclear submission status.

### 3.2 MEL Regional Expert
- **Job:** Review, edit, and validate any result in their region/scope; leave structured feedback; accept or return; surface aggregate trends.
- **Client:** review queue, controlled editing on in-scope results, structured feedback, aggregate dashboards, Excel export.
- **Server:** enforces scoped controlled-editing permissions, feedback storage, and full audit trail (who/what/when/version).
- **Pain to remove:** inability to edit results owned by others without bypassing workflow; lack of trustworthy aggregate views.

### 3.3 Center / General Admin
- **Job:** Oversee a center's reporting cycle; manage users, announcements, app configuration, SDG alignment, and portfolio; unblock reporters.
- **Client:** capacity-sharing bulk upload with per-row validation, center-scoped overview of in-flight results, SDG/portfolio management.
- **Server:** manages announcements, app configuration, per-user settings; supports bulk AI formalization; produces overview reports.
- **Pain to remove:** no bulk path for high-volume capacity-sharing data; no center-scoped view of in-flight results.

### 3.4 System Admin / Technical Support / Developer
- **Job:** Operate the platform end-to-end.
- **Server:** manage app secrets, host allowlists, integration credentials, cron jobs, and OpenSearch sync; observability via logs, sync process logs, Swagger, and the `/admin` SSR panel.
- **Client:** a supporting persona (not a driver of client product decisions).

### 3.5 Cross-Platform / Downstream Consumers (machine + human)
First-class users who **find and consume** results that already exist across federated platforms.
- **STAR client** — the primary human UI (this monorepo's `client/`).
- **PRMS / TIP / AICCRA** — partner CGIAR platforms that read from ARI REST APIs and OpenSearch indexes.
- **AI/ML formalization pipeline** — pushes raw AI-extracted results via `/results/ai/formalize`; the server normalizes them into the Results domain.
- **Human federation consumers** — funder analysts, leadership, partner researchers who search a unified cross-platform view, follow deep links, and export structured metadata.
- **Client responsibility:** search across STAR/TIP/PRMS/AICCRA, deep-link to counterparts, warn on duplicates (link instead of re-create), export.
- **Server responsibility:** stable versioned REST endpoints, `client_id/client_secret` machine auth, OpenSearch surface, real-time socket notifications.

---

## 4. Goals & Success Metrics

### 4.1 Goals

| # | Goal | Tier |
| --- | --- | --- |
| G1 | Be the single API/record of truth for research Results across the CGIAR reporting ecosystem — one canonical result record, linkable across STAR/TIP/PRMS/AICCRA. | both |
| G2 | Enforce a governed, auditable result lifecycle (status workflow, versioning/snapshots, role-based controlled editing). | server |
| G3 | Provide a stable, versioned REST API + real-time socket + OpenSearch surface for partner platforms and STAR. | server |
| G4 | Reduce duplicated data entry by integrating master data (CLARISA), contracts/staff (AGRESSO), and reporting (PRMS/TIP) at the data layer. | server |
| G5 | Enable AI-assisted result reporting via formalization endpoints without bypassing governance. | both |
| G6 | Trust the taxonomy — every controlled-vocabulary field is sourced from CLARISA, never free text. | both |
| G7 | Role-correct access — each persona sees and edits exactly its scope, without surprises. | both |
| G8 | Reportable in minutes, not days — aggregate dashboards and structured exports replace ad-hoc spreadsheets; evidence is permanent and findable. | client |

### 4.2 Success Metrics (KPIs)

> These KPIs are the testable bar. **Concrete numeric targets are intentionally open** (see §9) and need product-owner sign-off before becoming commitments.

| # | KPI | Tier | Why it matters |
| --- | --- | --- | --- |
| M1 | Adoption: % of centers/contracts reporting through ARI vs. legacy paths | both | Coverage of the ecosystem |
| M2 | Cycle time: median time from result DRAFT → APPROVED (and time-to-submit by indicator) | both | Reporting friction is the #1 complaint |
| M3 | Data quality: % of results passing MEL validation on first review | both | Review efficiency |
| M4 | Taxonomy adoption: % of results submitted with **zero free-text overrides** of CLARISA fields | client | Controlled-list integrity |
| M5 | Federation correctness: % of results linking to a cross-platform counterpart when one exists | both | Federation health |
| M6 | Duplicate conflicts: number of 409 duplicate-result conflicts per month (trend → 0) | both | Search/linking quality |
| M7 | Active monthly users by persona (Researcher / Center Admin / MEL / Consumer) | client | Persona coverage |
| M8 | Bulk-upload success: % of capacity-sharing bulk jobs completing without manual fixup | both | Center Admin productivity |
| M9 | Integration health: success rate and lag of AGRESSO / CLARISA / OpenSearch sync jobs | server | Data freshness |
| M10 | API health: p95 latency on top result-query endpoints; 4xx/5xx rate | server | Consumer reliability |
| M11 | Audit completeness: % of mutations with a complete audit trail (created/updated by + version) | server | Defensibility to auditors/donors |
| M12 | UX quality: Lighthouse / Web Vitals on Home, Results Center, Dashboard | client | UX floor |
| M13 | Accessibility: WCAG 2.1 AA conformance on changed screens (per release) | client | A11y floor |

---

## 5. Scope

### 5.1 In Scope

**Server responsibilities**
- Results domain: lifecycle, versioning/snapshots, status workflow, indicators, contracts, levers, SDGs, impact areas, geographies, partners, evidences, AI formalization, OICR, knowledge products, IP rights, policy change, capacity sharing, innovation dev.
- Master data integrations: CLARISA (countries, regions, levers, indicators, institutions), AGRESSO (contracts, staff, contract countries) via MSSQL/SOAP.
- Auth & authorization: JWT validation against ROAR; `client_id/client_secret` machine tokens; role-based access via `SecRolesEnum` + `RolesGuard`.
- Search: OpenSearch indexes for Results, Alliance Staff, PRMS feed.
- Messaging & real-time: RabbitMQ microservice for cross-system events; Socket.IO gateway for live UI updates.
- External feedback: AWS DynamoDB feedback store; reporting feedback, announcements, app configuration, user settings, tags, reports, sync process logs.
- Admin SSR panel under `/admin` (Vite + React 19) embedded in the server.
- Cron jobs: AGRESSO, CLARISA, TIP, sync process logs.
- Versioned REST API at `/api/v{n}/...`, documented via Swagger at `/swagger`.

**Client (STAR) responsibilities**
- Authenticated, role-aware web client on **Angular 19 + PrimeNG 19** with lazy-loaded standalone components.
- Result lifecycle UI: create, edit, version, submit, search, link, export.
- Result metadata tabs: general information, links to result, alliance alignment, partners, evidence, OICR details, IP rights, capacity sharing, policy change, innovation details, geographic scope.
- Indicator catalog browser and "About Indicators" educational surface.
- Results Center hub, dashboard/charts, full-text search.
- Project portfolio ("My Projects") and project detail with linked results.
- Center Admin tools: capacity-sharing bulk upload, SDG management, portfolio management.
- Real-time presence / notifications / alerts via WebSocket.
- Multi-platform federation: cross-platform result linking and duplicate detection (409 handling).
- Excel export (ExcelJS), PDF preview (pdfjs-dist), OICR download workflows.
- Light & dark theming via PrimeNG Aura preset + CSS-variable tokens.
- Analytics/feedback: Hotjar, Microsoft Clarity, Google Analytics, BugHerd.

### 5.2 Out of Scope / Non-Goals

**Shared / cross-cutting**
- Infrastructure as code, CI/CD pipelines, deployment specifics (Elastic Beanstalk, Docker/Nginx) — covered in ops docs.
- Donor-facing public website or marketing properties.

**Server non-goals**
- Not a generic project management tool — purpose-built for CGIAR research result reporting.
- Not a CLARISA replacement — CLARISA remains the master data authority.
- Not an AGRESSO replacement — contracts/staff remain owned by AGRESSO.

**Client non-goals**
- **Backend ownership.** The APIs (`mainApiUrl`, `textMiningUrl`, `fileManagerUrl`) and CLARISA are external systems the client consumes; it does not define their data model.
- **Identity provider alternatives.** Client auth stays on **AWS Cognito + JWT** — no SAML/enterprise SSO branching in the client.
- **Framework migration.** No React/Vue/Svelte rewrite; stack locked at Angular 19 + PrimeNG 19. No NgModules — standalone components only.
- **Parallel taxonomies.** Controlled lists come from CLARISA; none re-implemented locally.
- **Standalone mobile app.** Responsive web only (tuned for landscape / height ≤ 768px); no native iOS/Android shell.
- **Cross-platform write federation.** The client links to STAR/TIP/PRMS/AICCRA results but does not write into them.
- **Custom AuthZ engine.** Authorization is role-based and enforced by the backend; the client mirrors but does not replace those checks.

---

## 6. User Stories

Form: *As a {persona}, I want {capability} so that {outcome}.* Grouped by persona; stories tagged **(server)**, **(client)**, or **(both)**. IDs preserved from the source PRDs.

### Result Contributor / Researcher
- **US-RC-1 (both).** Create a result tied to a contract, indicator, and lever so reporting aligns to funding and CGIAR strategic outcomes.
- **US-RC-2 (client).** Guided, tabbed forms for capacity sharing / innovation dev / policy change / OICR / IP rights / knowledge products so I report each type with the right evidence.
- **US-RC-3 (both).** Attach geographies, partners, languages, and evidence so my result is complete and traceable.
- **US-RC-4 (both).** See my last-updated results quickly so I can resume work in progress.
- **US-RC-5 (both).** AI-assisted result drafting so I can convert text/evidence into a structured result with minimal manual entry.
- **R-1 (client).** Have the system pre-populate my center, contact info, and known project links so I don't re-type them.
- **R-2 (client).** Save partial progress on any tab and return later without losing data.
- **R-3 (both).** Attach evidence files (PDFs, images, datasets) with progress feedback and a permanent reference URL.
- **R-4 (client).** Be warned before creating a duplicate that already exists (here or another platform) and choose to link instead.
- **R-5 (client).** Submit a result for MEL review and see its status (draft / submitted / accepted / returned) at a glance.
- **R-6 (both).** Search by free text, indicator, year, country, partner, or project and find my own and the Alliance's prior work.

### MEL Regional Expert
- **US-MEL-1 (both).** Search and filter results by status, contract, year, indicator, and platform so I can triage my review queue.
- **US-MEL-2 / MEL-1 (both).** Controlled editing on results within my scope, leave structured feedback, and accept or return without bypassing the workflow.
- **US-MEL-3 (both).** Leave reporting feedback and request changes so contributors can iterate.
- **US-MEL-4 (server).** A full audit trail per result (who, what, when, version) so I can defend the data to auditors and donors.
- **MEL-2 (client).** View aggregate dashboards filtered by region, indicator, and year.
- **MEL-3 (client).** Export structured metadata of selected results to Excel for offline analysis.

### Center / General Admin
- **US-CA-1 (both).** Manage announcements, app configuration, and per-user settings so contributors get the right experience and messaging.
- **US-CA-2 (both).** Bulk-formalize AI-extracted results so backlog reporting is fast.
- **US-CA-3 (both).** Overview reports (general, last-updated, by-status) so I can monitor my center's reporting cycle.
- **CA-1 (client).** Bulk-upload capacity-sharing events from a structured template with per-row validation errors.
- **CA-2 (client).** See in-flight results owned by my center and the bottlenecks in their lifecycle.
- **CA-3 (client).** Manage SDG alignment for my center so reporting rolls up correctly.

### System Admin / Developer
- **US-SA-1 (server).** Manage app secrets, host allowlists, and integration credentials so partner platforms authenticate safely.
- **US-SA-2 (server).** Cron-driven sync of AGRESSO, CLARISA, and TIP so master data stays current without manual triggers.
- **US-SA-3 (server).** Operational visibility (logs, sync process logs, Swagger, admin panel) so I can diagnose incidents.

### Cross-Platform / Downstream Consumer
- **US-DC-1 (server).** As a partner platform (PRMS/TIP/AICCRA), authenticate with a `client_id/client_secret` token and read scoped result data so I can build dashboards and exports.
- **US-DC-2 (both).** As the STAR frontend, consume stable versioned REST endpoints and real-time socket notifications so the UI reflects current result state.
- **CP-1 (both).** Search across STAR/TIP/PRMS/AICCRA and see results from all of them in one list.
- **CP-2 (both).** Follow a deep link to a result and see its full metadata, evidence, partners, and cross-platform counterparts.
- **CP-3 (client).** Download an OICR template / report when needed.

### System-wide (client)
- **S-1 (client).** Switch between light and dark mode and have the choice persist.
- **S-2 (both).** Receive real-time notifications and alerts without refreshing the page.
- **S-3 (both).** The app respects my role — I never see actions I'm not allowed to perform.

---

## 7. Acceptance Criteria

Always-on bars that cut across modules. Each module-level spec under `docs/specs/<module>/` MUST refine its own. Tagged by tier.

### AC-Auth (both)
- **(server)** Every protected endpoint requires a Bearer token; anonymous access only on the `AppModule` `exclude` list (e.g. `GET /api/configuration/:key`, `/admin/*`).
- **(server)** Two token shapes accepted: ROAR-issued JWT and base64-encoded `{client_id, client_secret}` validated against `app_secrets` + host allowlist.
- **(server)** `RolesGuard` denies access when the user lacks all required roles, except `SYSTEM_ADMIN`, which bypasses role checks.
- **(client)** Unauthenticated users only see `landing`, `login`, `auth`. JWT-protected routes are gated by `rolesGuard`; center-admin routes by `centerAdminGuard`. Expiring tokens are proactively refreshed before request dispatch (AWS Cognito + JWT).

### AC-Role-Correctness (both)
- **(client)** Edit/destroy actions are hidden when the backend would reject them. Center Admin and MEL Regional Expert see scopes consistent with their `role_id` (1, 9, 10) and `sec_role_id` / `focus_id` where applicable.
- **(server)** Authorization is the source of truth; the client mirrors but never replaces it.

### AC-Results-Lifecycle (both)
- **(server)** A result is uniquely identified by `result_id` and an immutable `result_official_code`; mutations create/update a versioned record honoring `is_snapshot`, `version_id`, `report_year_id`.
- **(server)** Status transitions follow `result_status_workflow` and are enforced by `ResultStatusGuard` on mutating endpoints.
- **(server)** All entities derived from `AuditableEntity` capture created/updated user + timestamps; the `LoggingInterceptor` logs the user id per request.
- **(client)** A submitted result cannot be silently overwritten; version transitions are persisted and visible in the UI.

### AC-Controlled-Lists (both)
- **(client)** No screen allows free-text entry for a field that maps to a CLARISA list (institutions, countries, regions, subnational, SDGs, levers, languages, delivery modalities, session types).
- **(server)** CLARISA-derived master data is the canonical source for these fields.

### AC-Duplicate-Detection (both)
- Creating a result that collides with an existing record (same `platform_code` + `official_code`) surfaces a **409 conflict**; the client links to the existing result instead of producing a duplicate.

### AC-Evidence (both)
- **(client)** Files uploaded via the file-manager service have a stable URL and survive result edits.
- **(server)** Evidence references persist across result versions/snapshots.

### AC-API-Surface (server)
- All HTTP endpoints mounted under `/api` with URI versioning (`/api/v1/...`, `/api/v2/...`).
- All responses pass through `ResponseInterceptor` and emit `ServerResponseDto` (`{ data, status, description, errors, timestamp, path }`); the client relies on a consistent `MainResponse<T>` envelope (`successfulRequest`, `status`, `data`, `errorDetail`).
- All errors flow through `GlobalExceptions` with the same envelope shape and a non-2xx `status`.
- Swagger UI at `/swagger` documents all controllers with `@ApiTags`, `@ApiOperation`, `@ApiQuery`, `@ApiBody`, `@ApiBearerAuth`.

### AC-Integrations (server)
- CLARISA-, AGRESSO-, TIP-driven master data is refreshed by scheduled cron jobs and on-demand admin endpoints; failures are logged and surfaced in `sync_process_log`.
- OpenSearch documents are derived from the same TypeORM entities via `@OpenSearchProperty`; an index is rebuildable.
- The microservice bootstraps a RabbitMQ queue (`ARI_QUEUE`) and exposes message handlers via `AppMicroserviceModule`.
- A Socket.IO gateway on the same Nest application emits result-update events to connected clients.

### AC-Real-Time (both)
- **(server)** Socket.IO gateway is reachable on the Nest application and emits result-update events.
- **(client)** WebSocket disconnects degrade gracefully; the UI never blocks on a missing socket.

### AC-Admin-Panel (server)
- `/admin` routes serve a React 19 SSR app built by Vite; static assets served from `dist/admin/public`.
- Admin routes are excluded from the JWT middleware but MUST be protected by an admin guard before any production deployment (currently flagged open).

### AC-Theming (client)
- Both light and dark themes render every screen without unreadable contrast or broken layout; the user can toggle and the choice persists.

### AC-Accessibility (client)
- Every changed screen meets **WCAG 2.1 AA**: keyboard-reachable controls, visible focus, labels on inputs, sufficient contrast, accessible names for icon-only buttons.

### AC-Performance (client)
- Production bundle stays within `angular.json` budgets (initial ≤ 3 MB, component styles ≤ 8 kB). New lazy routes do not push the initial bundle past the 2 MB warning threshold.

### AC-Testing (both)
- **(server)** Jest coverage ≥ 60% branches / functions / lines / statements; sibling `*.spec.ts` for every controller/service/guard/interceptor touched.
- **(client)** Jest coverage meets or exceeds project thresholds (statements 40%, branches 20%, lines 45%, functions 30%) and does not regress on changed files.

---

## 8. Assumptions, Dependencies, & Constraints

### 8.1 Assumptions
- **(both)** ROAR Management remains the authoritative identity provider for human users; the client authenticates via AWS Cognito + JWT.
- **(both)** CLARISA remains the master data authority (countries, regions, levers, indicators, institutions); client caches lists via `control-list-cache.service.ts` / `dropdowns-cache.service.ts`.
- **(server)** AGRESSO remains authoritative for contracts, staff, and contract-country links (MSSQL + SOAP).
- **(both)** The STAR client is the primary human UI; the server need not ship a contributor UI beyond `/admin`.
- **(client)** Users have modern evergreen browsers (Chromium, Firefox, Safari current — Angular 19 baseline).
- **(both)** Federation partners (STAR/TIP/PRMS/AICCRA) provide deep-link-able result URLs the client can reach.
- **(both)** The backend exposes a consistent response envelope (`ServerResponseDto` / `MainResponse<T>`).
- **(server)** AWS Elastic Beanstalk + RDS (MySQL) + DynamoDB + RabbitMQ + OpenSearch is the deployment target.

### 8.2 Dependencies
- **CLARISA** — controlled lists (institutions, countries, regions, subnational, SDGs, levers, impact areas). (both)
- **Main API** (NestJS REST) at `environment.mainApiUrl` — the server package itself. (client)
- **ROAR Management API** — token validation. (server)
- **AGRESSO** — MSSQL DB + SOAP services. (server)
- **TIP integration** and PRMS/AICCRA federation partners. (both)
- **OpenSearch cluster.** (server)
- **AWS DynamoDB** (feedback store). (server)
- **AWS S3** (static assets / evidence — confirm in detailed design). (server)
- **RabbitMQ broker.** (server)
- **Text-mining microservice** at `environment.textMiningUrl` — intelligence/auto-fill flows. (client)
- **File-manager microservice** at `environment.fileManagerUrl` — evidence uploads. (client)
- **AWS Cognito** — client authentication. (client)
- **WebSocket gateway** (ngx-socket-io target) — live presence, notifications, alerts, room collaboration. (both)
- **Analytics / feedback SaaS** — Hotjar, Microsoft Clarity, Google Analytics, BugHerd. (client)
- **CI/CD** — GitHub Actions (`jenkins-trigger.yml`, `sonarcloud-analysis.yml`, `unit-tests.yml`); Docker + Nginx deployment images. (both)

### 8.3 Constraints (hard rules)
- **(server)** Node ≥ 20.11.1; TypeScript 5.7; NestJS 10; TypeORM 0.3; MySQL utf8mb4.
- **(server)** Strict layering: `entities/<module>` for domain modules, `tools/<integration>` for external integrations, `shared/` for cross-cutting concerns. Migrations live under `src/db/migrations` and are **append-only**.
- **(server)** Helmet CSP configured for prod and Vite dev (`http://localhost:5173`); body limit 50 MB JSON / URL-encoded.
- **(server)** Every response wrapped in `ServerResponseDto` via `ResponseInterceptor`; every new endpoint declares the Swagger decorators above.
- **(client)** Stack locked at **Angular 19 + PrimeNG 19**; new features are **lazy-loaded standalone components** (no NgModules).
- **(client)** Auth is **AWS Cognito + JWT** — no alternative IdPs.
- **(both)** Controlled vocabularies come from **CLARISA** — no parallel taxonomies.
- **(client)** Accessibility minimum is **WCAG 2.1 AA**; bundles must respect `angular.json` budgets.
- **(both)** Jest coverage thresholds enforced per package (server 60% all; client statements 40% / branches 20% / lines 45% / functions 30%).

### 8.4 Risks (server)
- The `client_id/client_secret` token is base64 of plain JSON; rotation policy + host allowlist hardening are critical.
- `/admin` is currently excluded from JWT — needs an explicit admin guard before production exposure.
- Large fan-out on `Result` entity relations (~30+ `OneToMany`) can cause N+1 issues; pagination + selective `relations` required on list endpoints.
- `DEPRECATED` roles in `SecRolesEnum` indicate an in-flight access-model migration that must be tracked.

---

## 9. Open Questions

Unresolved items that block specific commitments; triage with the product owner.

- **OQ-1.** What concrete **numeric KPI targets** do we commit to (adoption, cycle time / time-to-submit, data quality, free-text-override rate, API health)? *(both — see §4.)*
- **OQ-2.** What is the **canonical role list**? Server has deprecated roles (`IT_SUPPORT`, `GLOBAL`, `CONTRACT_CONTRIBUTOR`, `RESULT_CONTRIBUTOR`, `TESTER`) mid-migration; client formalizes Admin (1), Center Admin (9), MEL Regional Expert (10). Are there others (reviewer, project manager), and what is the migration timeline?
- **OQ-3.** What is the auth model for the embedded `/admin` SSR panel — ROAR JWT, a separate admin guard, or both? *(server)*
- **OQ-4.** Are PRMS / TIP / AICCRA expected to consume OpenSearch directly, the REST API, or both? What contracts are committed? *(server)*
- **OQ-5.** What is the SLA/SLO target for cross-system sync jobs (AGRESSO, CLARISA, TIP), and how are failures escalated? Likewise, expected SLO (uptime, p95 latency) for backend services the client depends on. *(both)*
- **OQ-6.** Is the AI formalization pipeline first-party (internal) or third-party? What does its auth and rate limiting look like? *(server)*
- **OQ-7.** Are there **compliance constraints** (GDPR, funder/donor data-handling, residency for evidence and contributor PII) that should be reflected explicitly? *(both)*
- **OQ-8.** Is **light + dark theme parity** a hard requirement for every new screen or "nice to have"? *(client)*
- **OQ-9.** What is the **data-retention policy** for results submitted from decommissioned platforms (e.g., if AICCRA winds down)? *(both)*
- **OQ-10.** Should **cross-platform write federation** ever come into scope? Currently out of scope (§5.2). *(client)*
- **OQ-11.** What is the **mobile / tablet** support matrix? CSS includes a `md:` breakpoint tuned to landscape & height ≤ 768px — is that the official target? *(client)*
