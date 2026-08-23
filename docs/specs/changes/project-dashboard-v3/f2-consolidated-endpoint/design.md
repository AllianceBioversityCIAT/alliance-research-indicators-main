# Design — agresso / Project Dashboard v3 · F2 Consolidated Dashboard Endpoint

- **Module:** agresso (server) + client / project-detail (STAR)
- **Spec id:** 2026-08-project-dashboard-v3-f2
- **Status:** draft
- **Owner:** JuanCode
- **Linked requirements:** ./requirements.md
- **Linked TRD:** `docs/trd/trd.md` (API contracts — agresso reports family)
- **Last updated:** 2026-08-23

---

## 1. Goals & non-goals

**Goals**
1. One aggregate endpoint composing the 7 existing report queries (R-CD-001).
2. Partial-failure visibility without whole-request failure (R-CD-002).
3. One client service, one request, rendering parity (R-CD-003/004).
4. Safe two-step retirement of the standalone endpoints (R-CD-005).

**Non-goals:** rewriting any section SQL; new metrics/sections (F3/F4 add them to this DTO); caching; changes to `results/count`, `contract-staff`, results table, `document-overview`; any visual change.

> Cross-checked (KZ-016) against requirements clauses and module constraints: the composition respects the agresso module's controller→service→repository layering; `ServiceResponseDto.errors` is an existing optional field (verified in `src/domain/shared/global-dto/service-response.dto.ts`), so R-CD-002's envelope-errors-on-200 uses the established spread in `ResponseInterceptor` — no interceptor change.

## 2. Architecture

### 2.1 Server slice (agresso-contract module — compose, don't duplicate)

- `src/domain/entities/agresso-contract/agresso-contract.controller.ts` — +1 handler `getDashboardReport` (full Swagger: `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiQuery` × 3). Later task: `deprecated: true` on the 7 standalone handlers' `@ApiOperation`.
- `src/domain/entities/agresso-contract/agresso-contract.service.ts` — +1 orchestration method: runs the 7 existing repository methods via `Promise.allSettled` with the shared `contract-id`/limits; maps each `rejected` slot to `null` section + an `errors[]` entry (`{section, message}`) + `LoggerUtil` error line; returns a `ServiceResponseDto` whose `errors` is populated only when ≥1 section failed; **throws** (→ `GlobalExceptions` 500) only when all 7 settle rejected. Missing `contract-id` → 400 (same validation the siblings use).
- `src/domain/entities/agresso-contract/dto/contract-dashboard-report.dto.ts` — NEW; **composes the existing DTO classes by reference** (`ContractResultsSummaryReportDto`, the 4 top-N DTOs, `ContractGeoScopeReportDto`, `ContractSpAlignmentReportDto`) as nullable section properties + `errors` entry type. No field duplication.
- `repositories/agresso-contract.repository.ts` — **untouched** (A-1). The aggregate is pure composition.
- Route registration: none needed (existing `/agresso/contracts` controller).

### 2.2 Client slice

- `shared/services/api.service.ts` — +`GET_ContractDashboard(contractId, topLimit?, geoLimit?)`; the 7 report methods deleted in the removal-side task.
- `shared/services/get-contract-dashboard.service.ts` — NEW single signal service: fetch/loading/loadError triple + **per-section computed accessors named after the old services' surface** (`summary()`, `topPartners()`, `topPrimaryLevers()`, `topMainContacts()`, `topContributors()`, `geoScope()`, `spAlignment()`, plus per-section `sectionFailed(name)`), so `project-dashboard.component.ts` and `geo-scope-card.component.ts` rewire with minimal churn (D-F2-5).
- `shared/interfaces/contract-dashboard.interface.ts` — NEW; composes the existing section interfaces.
- `project-dashboard.component.ts` + `geo-scope-card.component.ts` — inject the one service; per-widget `loading/error/empty` computeds derive from (aggregate loading, section null → **error state with shared retry**, section `[]`/zero → empty-collapse). The 7 old services + specs deleted once both components are rewired.

### 2.3 Reuse

Server: repository methods, `normalizeReportLimit`, `LoggerUtil`, `ResponseInterceptor`/`GlobalExceptions`, existing DTOs. Client: F1 components unchanged in template/behavior; `MainResponse<T>` envelope handling via `ApiService`.

## 3. Data model

No data model changes.

## 4. API surface

### GET /api/v1/agresso/contracts/reports/dashboard

- **Controller:** `agresso-contract.controller.ts` · **Roles:** none (parity with siblings) · **Guards/Interceptors:** module defaults
- **Query params:** `contract-id` (required, string), `top-limit` (optional, default 4), `geo-limit` (optional, default 5) — `normalizeReportLimit` semantics, cap 100
- **Response data shape:** `{ summary, tops: { partners, primary_levers, main_contacts, contributors }, geo_scope, sp_alignment }` — each section nullable; envelope `errors` lists failed sections (R-CD-002)
- **Errors:** 400 missing/blank `contract-id`; 401 unauthenticated (middleware); 500 only when all sections fail
- **Swagger:** complete; machine-token visible like siblings

### Deprecation/removal (R-CD-005)

7 standalone report routes → `@ApiOperation({ deprecated: true })` in the swap release; physical removal (handlers + service pass-throughs + route-specific DTO exports kept only if the aggregate DTO references them — it does, so **DTO classes stay**) in the gated final task.

## 5. Workflows & business rules

1. Validate `contract-id` → normalize limits → `Promise.allSettled` over the 7 repository calls (all share the seed predicate internally; no transaction — read-only).
2. Fulfilled → section payload verbatim (no re-sort/re-filter — R-CD-001 BUT-clause). Rejected → section `null`, `errors[] += {section, message}`, `LoggerUtil.error`.
3. `ServiceResponseDto{status: 200, description, data, errors: errors.length ? errors : undefined}`; all-rejected → throw InternalServerError.
4. Client: one fetch on contract change; retry re-invokes the same fetch; section-null → widget error state (never empty-collapse — R-CD-003 BUT-clause).
5. Audit: read-only GET — no audit fields (parity). No sockets, no OpenSearch, no cron.

## 6. Frontend component architecture

No template changes. Wiring map (component computed → new accessor): `contractResultsSummary.list()` → `dashboard.summary()`; `topPartners.list()` → `dashboard.topPartners()`; (same for levers/contacts/contributors); `geoScope` internals in `geo-scope-card` → `dashboard.geoScope()`; `contractSpAlignment.list()` → `dashboard.spAlignment()`. Loading: one aggregate `loading()` feeds all skeleton regions the summary/tops/geo/SP widgets used; `results/count`-driven regions (hero KPIs 1-2, indicator chart) keep their own source untouched.

## 7. Integration impact

None (no external system contract changes). Swagger consumers see 1 new + 7 deprecated routes.

## 8. Security & authorization

Same posture as the 7 endpoints being absorbed: JWT or machine token via `JwtMiddleware`; no `@Roles`. No new secrets. Machine-token consumers are exactly the population the R-CD-005 consumer check protects.

## 9. Observability

- `LoggerUtil.error` per failed section with section name + contract id (no PII).
- Description string distinguishes "complete" vs "partial (n sections failed)" — visible in existing status-based logging.
- No new metrics infrastructure (lite tier parity).

## 10. Testing strategy

- **Server unit:** service orchestration specs (all-fulfilled; one-rejected → null+errors+log; all-rejected → throw; limit plumbing). Controller spec for param validation + Swagger presence. Repository specs untouched (methods unmodified — any modification voids this and reopens SQL-level specs, requirements defect table).
- **Server e2e (supertest, `test/jest-e2e.json`):** composed shape through the real envelope; partial-failure scenario with a section provider mocked to throw (owns R-CD-002 — KZ-017: unit mocks cannot see envelope composition); 400 on missing contract-id; auth failure case.
- **K-019 diff gate (NFR-CD-003):** scripted capture (curl) of 7 standalone payloads + aggregate against dev for 3 named contracts, back-to-back per contract; diffs recorded in `execution.md`.
- **Client:** new service spec (envelope handling, section accessors, sectionFailed); component suites realigned by the failing run (K-018) with aggregate-shaped fixtures (KZ-001 — live nested shape, not primitives); full suite.
- **HITL at close (KZ-014):** real browser against dev — network panel shows exactly 1 aggregate call + the preserved non-analytic calls; drills still navigate (KZ-pd-v3-f1-1: route resolution is only provable here); light + dark (F1's dark-mode debt).

## 11. Rollout

- **Release 1 (this branch → dev):** endpoint + client swap + deprecation flags ship together; old endpoints still live (external consumers unaffected). Backout: revert commit(s) — client falls back cleanly since old endpoints never stopped working.
- **Release 2 (gated removal task):** only after the consumer check evidence (OQ-2 log source) is recorded and owner-approved. Backout: revert the removal commit.
- No migrations, no flags, no config.

## 12. Design decisions log

| # | Date | Decision | Rationale |
|---|---|---|---|
| D-F2-1 | 2026-08-23 | Composition lives in the **service** via `Promise.allSettled`; repository untouched | Preserves layering (repo = queries); allSettled gives per-section failure isolation for free; parallelism equals today's 7 concurrent HTTP requests, so DB pool pressure does not increase (requirements R-2) |
| D-F2-2 | 2026-08-23 | Partial failures ride the **existing** `ServiceResponseDto.errors` optional field through `ResponseInterceptor`'s spread | Verified: the field exists and the interceptor spreads it — R-CD-002 needs zero interceptor/global-contract changes |
| D-F2-3 | 2026-08-23 | Aggregate DTO composes the existing section DTO classes by reference | One source of truth per section shape; K-019 parity is structural, not copied |
| D-F2-4 | 2026-08-23 | `sp_alignment` computed for every contract; bilateral gating stays client-side (closes OQ-1) | Server has no cheap funding-type gate here; query cost is trivial; parity of responsibility with today |
| D-F2-5 | 2026-08-23 | Client service exposes per-section accessors named after the old services' surface | Minimizes F1 component churn and keeps its specs' expectations intact (R-CD-004) |
| D-F2-6 | 2026-08-23 | Limits split as `top-limit` / `geo-limit` (defaults 4/5 = today's client usage) | One `limit` would silently change geo (5) or tops (4); split preserves parity and stays overridable |
| D-F2-7 | 2026-08-23 | Section-null renders the widget's **error** state with the shared retry | A failed section is not an empty dataset; mapping it to empty-collapse would hide outages as "no data" (R-CD-003 BUT-clause) |

### Reversion challenges (Step 2.3 — "what does removing this break?")

| RC | Reverted behavior | Named breakage | Resolution |
|---|---|---|---|
| RC-1 | Removal of the 7 public endpoints | Unknown machine-token consumers (`app_secret_host_list`) break with 404s nobody sees | The R-CD-005 two-step gate exists precisely for this: deprecate first, remove only on recorded consumer-check evidence, escalate on ambiguity |
| RC-2 | Deletion of the 7 client services | `geo-scope-card.component.ts` also injects `GetGeoScopeService` (verified — the only consumer outside `project-dashboard.component.ts`) | Design rewires **both** components before deletion; the failing-suite run (K-018) enumerates any site this sweep missed |
| RC-3 | Per-widget retry replaced by one shared retry | A transient single-section failure now re-fetches everything | Accepted in proposal/requirements R-1; queries are tens of ms; retained per-widget **error rendering** keeps failure visible per widget |

## 13. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 9 (8 executable now + 1 removal task gated on the consumer check) |
| LOC (net, both tiers) | ~950–1,250 |
| Review rounds | 2 |

Full depth confirmed against the finished design (API + deprecation work justified it; size alone would be Standard). `/akili-execute` trips to the user when actuals exceed these.

## 14. Open questions

- **OQ-2 (carried, non-blocking):** dev access-log source for the consumer check — owner names it before the removal task; earlier tasks unaffected.

## 15. References

Requirements `./requirements.md` (R-CD-001…005, NFR-CD-001…004, defect table) · Backend map: family analysis artifact + `agresso-contract.repository.ts` L681-1348 · Kaizen applied: KZ-001, KZ-013, KZ-014, KZ-015, KZ-016, KZ-017, K-018, K-019, KZ-pd-v3-f1-1 (pending), K-015/K-016 (n/a, recorded why).
