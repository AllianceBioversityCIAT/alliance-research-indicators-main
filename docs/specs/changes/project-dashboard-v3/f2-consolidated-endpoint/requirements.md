# Requirements — agresso / Project Dashboard v3 · F2 Consolidated Dashboard Endpoint

- **Module:** agresso (server) + client / project-detail (STAR)
- **Spec id:** 2026-08-project-dashboard-v3-f2
- **Status:** draft
- **Owner:** JuanCode
- **Parent Spec:** `changes/project-dashboard-v3` (`../family.md`, child 2 of 4; depends on `f1-hero-layout` — **done**)
- **Linked PRD section:** [`docs/prd.md`](../../../../prd.md) (STAR analytics / project dashboard)
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Extends:** archived `2026-08-23-changes--project-dashboard-v3--f1-hero-layout` (consumes its final component structure); archived `2026-08-22-changes--dashboard-advanced-analytics` (the reports family being consolidated)
- **Last updated:** 2026-08-23

---

## 1. Context

The dashboard fires **7 analytic GETs** per view (`results-summary`, `top-partners`, `top-primary-levers`, `top-main-contact-persons`, `top-contributors-contracts`, `geo-scope`, `sp-alignment`), all served by `AgressoContractController` over the **same seed subquery** (`buildPrimaryContractResultsSubquery()`), each mirrored by a near-identical client signal service. Every new metric today costs a new endpoint + DTO + service + spec on both tiers. F2 collapses consumption into **one aggregate endpoint with named, nullable sections**, migrates the client to one service, and retires the 7 endpoints after a consumer check. Read-only aggregation: **no schema change, no migration** (K-015 not in play).

**Not changing:** any SQL semantics of the existing report queries (reused, not rewritten); `results/count`, `contract-staff`, paginated `GET results`, `document-overview` (out of scope by design); any dashboard visual or drill behavior (F1 contract).

## 2. Requirement numbering

`R-CD-NNN` / `NFR-CD-NNN` (Consolidated Dashboard).

---

## 3. Functional requirements

### R-CD-001 — Aggregate dashboard report endpoint

- **As a** STAR client (and any authorized API consumer)
- **I want** one request returning every dashboard analytics section
- **So that** the dashboard loads from a single consistent snapshot

**Details:**
- Route: `GET /api/v1/agresso/contracts/reports/dashboard`
- Query params (kebab-case): `contract-id` (required), `top-limit` (optional, default **4**), `geo-limit` (optional, default **5**) — both normalized by the existing `normalizeReportLimit` rules (default 10 → here per-param defaults; hard cap 100; invalid → default).
- Response `data` shape (each section exactly the payload its standalone endpoint returns today):

  | Section | Parity source |
  |---|---|
  | `summary` | `reports/results-summary` (`total`, `by_status`, `by_year`, `by_indicator_year`, `partner_institutions`) |
  | `tops.partners` / `tops.primary_levers` / `tops.main_contacts` / `tops.contributors` | the four `reports/top-*` endpoints (at `top-limit`) |
  | `geo_scope` | `reports/geo-scope` (at `geo-limit`) |
  | `sp_alignment` | `reports/sp-alignment` — computed for **every** contract (refines the proposal's "null for non-bilateral": the server does not gate by funding type; the client keeps its existing bilateral rendering gate) |
- Sections are computed concurrently server-side over the shared seed; the response is one `ServerResponseDto` envelope.
- Auth: same posture as the existing reports family (JWT/machine token via `JwtMiddleware`; no `@Roles` restriction — parity).
- Swagger: `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, per-param `@ApiQuery` (mandatory, server guide).
- Errors: missing/blank `contract-id` → 400 via `GlobalExceptions` (parity with the existing handlers' validation).

#### Scenario: One request, full payload
- GIVEN contract A511 with results, partners, geo data and SP alignments
- WHEN `GET .../reports/dashboard?contract-id=A511` is called with a valid token
- THEN the envelope's `data` contains all six sections populated
- AND each section deep-equals the payload of its standalone endpoint called with the same params (K-019 parity)
- BUT it must NOT alter, re-sort, or re-filter any section relative to its standalone counterpart
- AND IT MUST honor `top-limit`/`geo-limit` identically to the standalone `limit` params (cap 100, invalid → default)

### R-CD-002 — Partial-failure semantics: nullable sections, visible errors

**Details:** a section whose computation fails resolves to `null`; the envelope's `errors` gains one entry naming the failed section; remaining sections still return; HTTP status stays 200 when at least one section succeeds. If **all** sections fail, the response is a 500 through `GlobalExceptions`.

#### Scenario: One section fails
- GIVEN the sp-alignment query throws for a contract
- WHEN the aggregate endpoint is called
- THEN `data.sp_alignment` is `null` and `errors` contains an entry identifying `sp_alignment`
- AND `summary`, `tops`, `geo_scope` are populated normally with HTTP 200
- BUT it must NOT fail the whole request for a single-section error
- AND IT MUST log the section failure at error level via `LoggerUtil` (status-based levels preserved)

### R-CD-003 — Client consumes one dashboard service

- **As a** dashboard user
- **I want** the screen to load its analytics in one round-trip
- **So that** it renders faster and from one consistent snapshot

**Details:**
- New `GET_ContractDashboard` in `api.service.ts`; new single signal service replaces `GetContractResultsSummaryService`, `GetTopPartnersService`, `GetTopPrimaryLeversService`, `GetTopMainContactPersonsService`, `GetTopContributorsContractsService`, `GetGeoScopeService`, `GetContractSpAlignmentService` for the dashboard (the 7 services and their `api.service.ts` methods are deleted once nothing consumes them).
- One loading orchestration; one retry action re-fetching the aggregate; a `null` section renders that widget's existing **error** state (with the shared retry), never its empty state.

#### Scenario: Single analytic request per view
- GIVEN a user opens `/project-detail/A511/project-dashboard`
- WHEN the dashboard finishes loading
- THEN exactly **one** request to `reports/dashboard` was issued and zero requests to the 7 standalone report endpoints
- AND every widget renders the same data it rendered from the standalone endpoints (R-CD-004)
- BUT a `null` (failed) section must NOT render as "No data yet" — empty-collapse (F1 R-HL-004) applies only to successfully-returned empty datasets
- AND IT MUST keep `results/count`, `contract-staff`, the pending-revision table fetch, and `document-overview` requests unchanged

### R-CD-004 — Rendering and interaction parity

**Details:** every F1 widget (KPI tiles, trend, status, indicator bars/heatmap+morph, geo, rankings, SP graph, empty-collapse, drill-throughs) behaves identically fed from the aggregate. The F1 component specs keep their expectations — only service wiring/mocks change shape.

#### Scenario: Parity on a real contract
- GIVEN the same contract on the same dev database
- WHEN the dashboard renders from the aggregate vs from the standalone endpoints (pre-migration build)
- THEN every widget shows identical values, ordering, and drill targets
- AND IT MUST be evidenced by the K-019 old-vs-new JSON diff (NFR-CD-003 gate) plus the existing component suites staying green with only mock-shape changes
- BUT it must NOT change any `tableModel`, aria-label, or query-param contract from F1

### R-CD-005 — Deprecate, then remove, the 7 standalone report endpoints

**Details:**
1. **Deprecation (same release as client swap):** the 7 handlers gain Swagger `deprecated: true` and remain functional.
2. **Removal (final, separately-approvable task):** handlers + service pass-throughs + DTOs removed **only after** a consumer check records evidence that no non-STAR consumer calls them: (a) grep of both packages for the 7 routes (STAR migrated), (b) review of `app_secret_host_list` machine-token consumers against dev access logs over an agreed window. The repository query methods are **kept** (the aggregate composes them).
3. Docs citing the 7 routes (TRD API section, archived-spec references excluded) are updated in the same removal task (KZ-013 sweep).

#### Scenario: Removal gate
- GIVEN the client swap is deployed and the consumer-check evidence is recorded in `execution.md`
- WHEN the removal task runs
- THEN the 7 routes return 404 and Swagger no longer lists them
- BUT it must NOT remove them while any consumer evidence is missing, ambiguous, or shows traffic — the task escalates to the owner instead
- AND IT MUST leave the repository methods and their specs intact

---

## 4. Non-functional requirements

### NFR-CD-001 — Latency
- **Category:** performance
- **Target:** aggregate p95 ≤ **600 ms** on dev for A511-class contracts (sections run concurrently; the gate is the slowest section + composition, not the sum).
- **How verified:** 3 timed runs against dev at execution close; **disqualifier:** if the 3 runs spread wider than the effect (>±40%), report the spread, do not certify.

### NFR-CD-002 — No caching introduced
- **Category:** reliability
- **Target:** the aggregate adds no TTL cache (parity with the standalone reports). If caching is ever added later, K-016 applies (UI must signal the staleness window).
- **How verified:** code review at Reviewer pass (absence check — declared as such).

### NFR-CD-003 — Behavior-preserving refactor gate (K-019)
- **Category:** dx / correctness
- **Target:** old-vs-new comparison over a fixed input set: for **≥3 dev contracts** (one rich e.g. A511, one sparse/bilateral, one with zero results), capture the 7 standalone JSON payloads and the aggregate's sections, and diff them (ordering included). Zero divergences, or each divergence explained and approved.
- **How verified:** the diff artifacts are recorded in `execution.md`; **disqualifier:** a diff run against different contracts, a different environment, or after data changed between captures (capture both sides back-to-back per contract).

### NFR-CD-004 — Coverage
- **Category:** dx
- **Target:** server global 60% holds; client floors (40/20/45/30) hold; sibling `*.spec.ts` for every touched controller/service/repository.
- **How verified:** `npm run test:cov` (server), `npm run test:coverage` (client).

## Defect classes and their gates

| Defect class F2 can produce | Gate | Blind-spot handling |
|---|---|---|
| Aggregate composition bugs (wrong section wiring, param plumbing) | Server unit specs on the new service/controller + **supertest e2e** asserting the composed `data` shape through the real envelope | KZ-017: unit specs over mocks cannot see envelope/error composition — the e2e owns R-CD-002's scenario |
| Silent payload drift vs the 7 endpoints | **K-019 diff gate** (NFR-CD-003) over fixed real contracts | The named failing input: point the diff at a section that re-sorts rows — it must fail |
| SQL/param regressions in reused repository methods | Existing repository specs (assert generated SQL + params — KZ-001); methods are reused, not rewritten | Any rewrite voids this and requires new SQL-level specs |
| Partial-failure semantics wrong (500 on one section; silent null) | Supertest e2e with a section mocked to throw | Unit-only coverage disqualified for this class (KZ-017) |
| Client rendering regression | F1 component suites green with only mock-shape changes + full client suite | KZ-001: the new service mock fixtures MUST mirror the live nested aggregate shape, not per-service primitives |
| Wrong loading/error orchestration (null section → empty-collapse) | Component specs arranging load→section-null transition (KZ-015) | — |
| Breaking an external machine-token consumer at removal | **No automated gate** — substituted by the R-CD-005 consumer check (grep + `app_secret_host_list` × dev access logs), evidence recorded before the removal task; residual risk accepted and owner-approved at that task | |
| Latency regression | NFR-CD-001 timed runs with spread disqualifier | |
| Live-app regression (drills, morph, widgets against real backend) | **HITL browser pass** at close (KZ-014: human-observed, light+dark owed from F1) — includes the network-count check (1 aggregate call) | jsdom cannot verify real HTTP flow |

## 5. Data requirements

None. No entities, columns, indexes, migrations, or OpenSearch changes.

## 6. API surface delta

- **NEW:** `GET /api/v1/agresso/contracts/reports/dashboard` (params/DTO above; Swagger complete; machine-token visible like its siblings).
- **DEPRECATED then REMOVED:** the 7 standalone report routes (R-CD-005 two-step). Versioning stays `/v1` — additive endpoint + removal of deprecated routes after the consumer gate; no `/v2`.

## 7. Cross-system impact

- **STAR client:** service consolidation (this spec, client slice). No CLARISA/AGRESSO-sync/TIP/OpenSearch/DynamoDB/RabbitMQ/Socket.IO contract changes.
- **Swagger consumers:** 7 routes flagged deprecated — release note to the STAR team via the normal dev-branch deploy.

## 8. Assumptions, dependencies, risks

- **A-1:** the 7 repository methods remain the single source of section SQL; the aggregate only composes them.
- **A-2:** dev access logs (or equivalent) are available to the owner for the consumer check; if not, the removal task escalates rather than assumes (BUT-clause of R-CD-005).
- **R-1 (risk):** losing per-widget retry granularity — accepted in the proposal (one retry re-fetches all; queries are tens of ms).
- **R-2 (risk):** concurrent sections multiply DB connections per request (7 parallel queries × concurrent users on the shared dev DB). Mitigation: sections share the TypeORM pool; the parallelism equals what 7 HTTP requests already caused today — net connection pressure does not increase.
- **KZ-013:** removal task sweeps docs citing the old routes.

## 9. Open questions

- **OQ-1 (closed in this draft):** sp_alignment always computed server-side; bilateral gating stays client-side. Owner may override at Phase 1 approval.
- **OQ-2:** dev access-log source for the consumer check (owner to name it before the removal task; not blocking earlier tasks).

## 10. Sign-off

- [ ] Engineering lead — JuanCode
- [ ] MEL / product owner — —
