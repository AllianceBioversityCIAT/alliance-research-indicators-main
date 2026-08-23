# Proposal — Project Dashboard v3 / F2: Consolidated Dashboard Endpoint

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/project-dashboard-v3/f2-consolidated-endpoint/` |
| Parent Spec | `changes/project-dashboard-v3` (see `../family.md`) |
| Type | Change |
| Approval Mode | gated |
| Depends on | `f1-hero-layout` |
| Parallel-safe | no (client migration touches the same `project-dashboard.component.ts` F1 rewrites) |
| Date | 2026-08-23 |
| Author | JuanCode (via AKILI-SPECS) |
| Status | Proposed |

## 2. Intent

Collapse the screen's **seven analytic GETs into one** aggregate endpoint with named sections, so the dashboard loads in one round-trip from one consistent snapshot — and every future metric becomes a **DTO section**, not a new endpoint.

## 3. Problem / Current Behavior

`project-dashboard` fires 7 analytic requests per view (`results-summary`, 4× `top-*`, `geo-scope`, `sp-alignment`), all served by `AgressoContractController` → `AgressoContractRepository`, all built on the **same** seed subquery (`buildPrimaryContractResultsSubquery()`, repository L689-712), each returning a small payload. The client mirrors this with 7 near-identical signal-triple services, 7 loading/error states, and 7 retry paths. Adding any metric today means a new endpoint + DTO + service + spec on both tiers — the proliferation is structural.

## 4. Proposed Outcome

- **`GET /api/v1/agresso/contracts/reports/dashboard?contract-id=`** — one handler; server executes the existing report queries in parallel (`Promise.all`) over the shared seed and responds:

  ```jsonc
  {
    "summary":      { /* today's results-summary shape */ },
    "tops":         { "partners": [], "primary_levers": [], "main_contacts": [], "contributors": [] },
    "geo_scope":    { /* today's geo-scope shape */ },
    "sp_alignment": { /* today's sp-alignment shape, null for non-bilateral */ }
  }
  ```

  Sections are nullable: a failed section returns `null` plus an entry in the envelope's `errors` — partial failure stays visible without failing the whole response.
- **Client**: the 7 services collapse into one `GetContractDashboardService`; one skeleton orchestration, one retry.
- **Deprecation**: the 7 old report endpoints remain live (additive change, `/api/v1` intact) until the client migrates, then are removed in this same spec's final task — with Swagger `deprecated: true` in between.

## 5. Scope

- **Server**: `agresso-contract.controller.ts` (+1 handler, full Swagger decorators), `agresso-contract.service.ts`, `repositories/agresso-contract.repository.ts` (composition method — existing query methods reused, not duplicated), new `dto/contract-dashboard-report.dto.ts`; sibling `*.spec.ts`.
- **Client**: `api.service.ts` (+`GET_ContractDashboard`, −7 methods at the end), new `get-contract-dashboard.service.ts`, interface file; `project-dashboard.component.ts` consumption swap; delete the 7 obsolete services + their specs.
- OpenSearch, sockets, migrations: untouched (read-only aggregation, no schema change — the K-015 migration trap does not apply).

## 6. Non-Goals

- No new metrics or sections beyond today's payloads (F3/F4 add sections).
- No change to `results/count`, `contract-staff`, the paginated `GET results`, or `document-overview` — they stay separate by design (shared by shell / other lifecycle / other microservice).
- No visual changes.

## 7. Affected Users, Systems, And Specs

- **Users:** none visibly (latency should improve: 1 round-trip vs 7).
- **Systems:** server `agresso-contract` module; client project-detail feature + shared services.
- **Specs:** extends the API surface defined by archived `2026-08-22-changes--dashboard-advanced-analytics`; TRD API contracts section must gain the new route.

## 8. Visual Reference

- Source: None — backend/plumbing change with no UI surface.
- Location: n/a.
- Notes: behavior parity is the acceptance bar; F1's screens must render identically from the new payload.

## 9. Requirement Delta Preview

### ADDED
- `GET reports/dashboard` aggregate endpoint; nullable-section partial-failure semantics; single client dashboard service.

### MODIFIED
- Dashboard component consumes one service; loading/error/retry orchestration is single-sourced.

### REMOVED
- Client services + `api.service` methods for the 7 individual reports; the 7 endpoints themselves (final task, after client migration; Swagger-deprecated in between).

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| A. One aggregate endpoint, nullable sections (recommended) | `Promise.all` over existing repository methods; sections null on per-section failure | One round-trip + consistent snapshot; loses per-widget retry (retry re-fetches all — acceptable at tens of ms per query) |
| B. Two endpoints (core + heavy) | Split summary/tops from geo+sp-alignment | No current query is heavy enough to justify the second round-trip; F3's genuinely heavy aggregate already gets its own lazy endpoint |
| C. Keep 7, add a client-side facade only | Single client service fans out 7 HTTP calls | Removes client boilerplate but keeps the network chatter and the endpoint-per-metric growth pattern |

**Recommended: A** — the repository methods already exist; the endpoint is composition, and it is the option that structurally stops endpoint proliferation (F3/F4 land as sections).

## 11. Risks, Dependencies, And Open Questions

- **KZ-001 (Critical, recurrence 14)**: repository/DTO specs must assert the **generated SQL and the real payload shape**, not the call sequence — and the client mock fixtures must mirror the live nested section shape (the SDG `[object Object]` escape came from primitive fixtures).
- **KZ-017**: the parity check must name what it cannot reach — e.g. a unit spec over mocked sections cannot prove envelope-level `errors` composition; an e2e or supertest pass covers that.
- **Deprecation risk**: confirm no consumer outside the STAR client calls the 7 report endpoints (machine tokens exist — grep server logs/consumers before removal; keep removal as a separately-approvable final task).
- **OQ-1**: cache headers/TTL for the aggregate — none exists today on the individual reports; decide whether to keep none (parity) or add short TTL (then the K-016 lesson applies: the UI must signal staleness windows).

## 12. Success Criteria

- Dashboard renders identically (F1 layout) from a single analytic request — verified against the same contract in dev.
- Section failure yields `null` + envelope error, remaining sections render.
- Old endpoints Swagger-deprecated after client swap; removed only after the no-external-consumer check passes.
- Server + client suites green; coverage floors respected.

## 13. Next Step

```text
/akili-specify changes/project-dashboard-v3/f2-consolidated-endpoint
```
