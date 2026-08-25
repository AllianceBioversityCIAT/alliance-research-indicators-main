# Design — Changes / Executive Overview Grounded Context

- **Module:** changes (agresso + clarisa server; project-dashboard client)
- **Spec id:** 2026-08-executive-overview-grounded-context
- **Status:** draft
- **Owner:** J. Cadavid / bilateral-visual-improvements
- **Requirements:** ./requirements.md (R-EOC-001 … R-EOC-008)
- **Last updated:** 2026-08-24

---

## 1. Goals & non-goals

**Goals**
- Give the AI overview generation a structured, source-labeled project-context digest built from data STAR already trusts (D-1).
- Expose CLARISA's richer project record for mapped bilateral contracts through one small, resilient read endpoint (D-2).
- Make the Executive Overview behave like an Act-1 identity element: scannable card + reading modal for long text (D-3).

**Non-goals**
- No AI-service changes; no new admin surfaces; no chart work; no writes to mapping tables.

---

## 2. Architecture

### 2.1 Composition — server

```
AgressoContractController (existing)
  └─ GET :agreementId/clarisa-project        ← new route method
       └─ AgressoContractService.findClarisaProjectByAgreementId()   ← new
            ├─ BilateralProjectMappingRepository (read: agreement → clarisa_project_id)
            └─ ClarisaProjectsService.findProjectById()  (existing 5-min TTL cache)
```

**DI constraint (verified):** `ClarisaProjectsService` is deliberately singleton-scoped while `AgressoContractRepository` is request-scoped via `CurrentUserUtil`. The merge therefore lives in the **service layer** (`AgressoContractService`), resolving `ClarisaProjectsService` lazily via `moduleRef` — the same pattern `agresso-contract.service.ts:39` already uses for OpenSearch. Do NOT inject request-scoped utilities into `ClarisaProjectsService` (its file-level warning, lines 25–29).

**Lookup path:** `bilateral_project_mapping.agresso_agreement_id = :agreementId` → `clarisa_project_id` → `findProjectById(id)`. Missing mapping ⇒ `data: null`. Cold-cache `ServiceUnavailableException` from the CLARISA fetch is caught and degraded to `data: null` + `errors: ['clarisa_unavailable']` (R-EOC-001 AC.4).

### 2.2 Composition — client

```
project-dashboard.component
  ├─ GetProjectDetailService (existing, in memory)
  ├─ GetContractDashboardService (existing, in memory)
  ├─ GetClarisaProjectService  ← new thin signal service (ApiService.GET_ContractClarisaProject)
  ├─ buildProjectContext(...)  ← new pure util (@shared/utils/project-context.util.ts)
  └─ DocumentOverviewService.generateDocumentOverview(projectId, text?, projectContext?)  ← extended
```

`GetClarisaProjectService` mirrors the `GetProjectDetailService` pattern: `load(contractId)` once per contract, `data` signal, `loading/loadError` signals, session-lifetime memo + `invalidate()`. The dashboard's existing constructor `effect` adds one `void this.clarisaProject.load(contractId)`.

### 2.3 Reuse

- Envelope: `ServerResponseDto` / `MainResponse<T>` — no deviations.
- Modal: `AllModalsService` + `app-modal` (new name `executiveOverviewReader` in `modal.types.ts` + config in `all-modals.service.ts`).
- Skeleton: `primeng/skeleton` already imported by the dashboard.

---

## 3. Data model

No schema changes. Read-only over `bilateral_project_mapping`, `agresso_contracts`, and the CLARISA in-memory cohort.

**New server DTO — `ContractClarisaProjectDto`** (subset of `ClarisaProject`, projected on purpose so upstream shape drift is contained):

```
id, short_name, full_name, summary, description,
start_date, end_date, total_budget, annual,
funder_institution { id, name, acronym },
lead_institution   { id, name, acronym },
external_code, phase,
science_programs[] { code, name, allocation }   // from accepted project_mappings (entity type 22)
```

**New client interface** `ContractClarisaProject` mirroring the DTO (`@shared/interfaces/contract-clarisa-project.interface.ts`).

---

## 4. API surface

### GET /api/v1/agresso/contracts/:agreementId/clarisa-project

- **Auth:** JWT (JwtMiddleware); no `@Roles` — read-only, same visibility class as `results/count`.
- **Params:** `agreementId` (path).
- **200 data:** `ContractClarisaProjectDto | null` (`null` = unmapped contract or CLARISA cold-cache failure; distinguish via `errors[]`).
- **Swagger:** `@ApiTags('Agresso Contracts')`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiParam`.
- **Freshness:** ≤ 5 min stale (ClarisaProjectsService TTL). Any manual verification must wait out the TTL or restart the process (K-016).

### Extended AI-service request (client → document-overview Lambda)

`DocumentOverviewRequest` += `project_context?: string` (≤ 8,000 chars). Sent on POST `/api/document-overview` only; GET summary and delete are untouched. Unknown-field tolerance to be confirmed with the AI team (OQ-1).

---

## 5. Workflows & business rules

### 5.1 Context assembly (`buildProjectContext`)

Inputs: `GetProjectDetail | null`, `ContractClarisaProject | null`, `ContractDashboardReport | null`.
Output: plain-text digest, sections in fixed order, each labeled with provenance:

```
[PROJECT — source: CLARISA (updated) | Agresso]
  title, description/summary, start–end dates, budget, funder, lead/donor
[CONTRACT — source: Agresso]
  agreement id, funding type, grant/center amounts USD, division/unit, SDGs, CGIAR entities
[RESULTS ANALYTICS — source: STAR]
  total results, by status, by year, indicators covered
[REACH — source: STAR]
  top partner institutions, geo scope summary (global/regional/countries)
[STRATEGY — source: STAR]
  Science-Program alignment: aligned vs not, SP codes (+ CLARISA allocations when mapped)
```

Rules:
- **Per-field preference** (R-EOC-002 AC.2): CLARISA value wins where both sources carry the field; the `[PROJECT]` header says which source won.
- **Bound:** 8,000 chars; drop whole trailing sections to fit, never truncate mid-sentence; always keep `[PROJECT]`.
- **Empty-safe:** any null input → its sections omitted; all-null → return `undefined` (caller omits the field entirely, R-EOC-003 AC.4).

### 5.2 Generation flow deltas

- `loadExecutiveOverviewSummary` (entry): unchanged fetch; the auto-baseline `generateDocumentOverview` call now passes `projectContext` when the builder returned one. The dashboard waits for **neither** detail nor report loads — it builds from whatever is in memory at call time (best-effort; NFR-2).
- Manual "Regenerate summary": same context injection, built at click time (by then loads have settled).

### 5.3 Disclosure rule (R-EOC-004/005)

`isLongOverview = text.length > 700 || paragraphs.length > 2` →
- long: primary action "View full overview" opens `executiveOverviewReader` modal; no inline expansion.
- short: inline "View more/View less" (existing signal `executiveOverviewExpanded`).

---

## 6. Frontend impact (STAR client)

### 6.1 Act-1 card (redesigned states)

| State | Rendering |
|---|---|
| loading | 4 skeleton bars, reading width, ≈ collapsed height (no jump) |
| error | message + Retry button; admins keep setup cog |
| short text | clamped 4 lines → inline expand |
| long text | clamped 4 lines → "View full overview" (modal) |
| empty (non-admin) | card hidden (existing rule) |

Typography: body at `max-w-prose` (~75ch), `text-[14px] leading-relaxed text-[var(--ac-grey-800)]`; metadata `text-[12px] text-[var(--ac-grey-600)]`. Footer provenance line (R-EOC-007): "Grounded on: 2 documents · text resource · project data (CLARISA)".

### 6.2 Reading modal `executiveOverviewReader`

Content column `max-w-[70ch]`, full paragraphs, generated-at header, sources section (doc chips reusing the setup-modal chip style + provenance line), admin footer actions: "Grounding & Setup" (opens existing modal) and "Regenerate summary". Esc/close + focus return handled by the shared `app-modal` host.

### 6.3 Accessibility

- Trigger: `aria-haspopup="dialog"`, `aria-expanded` removed (it's a dialog, not disclosure) — inline short-text expand keeps `aria-expanded`.
- Skeleton region: `role="status"`, `aria-label="Loading executive overview"`.
- Both themes via tokens only; contrast validated against `--ac-white-1`/dark surfaces.

---

## 7. Integration impact

- **CLARISA:** read-only, via existing cached service — no new upstream traffic pattern (one shared cohort fetch per 5 min).
- **AI microservice:** additive optional field; no behavior assumed until OQ-1 confirmed.
- **OpenSearch / RabbitMQ / sockets:** untouched.

---

## 8. Security & authorization

- New endpoint behind `JwtMiddleware`; returns no secrets (public-ish project metadata already visible in CLARISA/STAR admin).
- `project_context` contains no tokens/PII beyond institution names and public contract metadata; user email is NOT included (the service already sends `user_id` separately).
- Roles unchanged: setup/generation UI remains admin-gated client-side and the AI endpoints keep their existing header auth.

---

## 9. Observability

- Server: `LoggerUtil` warn on CLARISA degrade path (`clarisa_unavailable`), tagged with agreementId.
- Client: no new analytics events (out of scope), console errors preserved in `DocumentOverviewService`.

---

## 10. Testing strategy

- **Server unit:** service merge logic (mapped / unmapped / cold-cache degrade), controller envelope. Sibling `*.spec.ts` per touched file.
- **Server integration (K-021):** `npm run test:integration` with a `TestingModule` mounting ONLY `AgressoContractController` + service, `overrideProvider` for the mapping repository and `ClarisaProjectsService`; template `test/bilateral-primary-contributing-sp.integration-spec.ts`. It must NOT import `AppModule` nor touch MySQL/RabbitMQ/OpenSearch.
- **Client unit:** `buildProjectContext` matrix (CLARISA-wins, Agresso-only, truncation at section boundary, all-null → undefined); `GetClarisaProjectService` envelope handling; dashboard spec: threshold routing (short→inline, long→modal), skeleton on loading, retry on error, context forwarded to `generateDocumentOverview` on both call sites, generation proceeds without context when builder yields undefined (KZ-015: arrange the transition — construct loading first, then resolve).
- **Gates:** client `npm run build` + `npx tsc -p tsconfig.spec.json --noEmit` (945-error baseline), bare `npx eslint` server-side, `npm run lint -- --quiet` client-side. Verifications must name what they cannot reach (KZ-017).

---

## 11. Rollout

Single branch (`bilateral-visual-improvements`), no migration, no config. Order: T-01 server → T-02/03 client data → T-04/05/06 UX. Feature degrades to current behavior at every seam, so partial landings are safe.

---

## 12. Design decisions log

| # | Decision | Why |
|---|---|---|
| D-EOC-1 | New endpoint instead of extending `results/count` | `results/count` is consumed by 3+ flows; adding a CLARISA await would couple its latency/failure to every project view. Isolated GET keeps blast radius zero. |
| D-EOC-2 | Context sent as new `project_context` field, never merged into `text` | `text` is user-owned state round-tripped by the summary GET; polluting it corrupts the setup modal (R-EOC-003 AC.3). |
| D-EOC-3 | Per-field CLARISA preference with provenance labels | Matches the owner's data rule (CLARISA fresher for pool-funding-contributing bilaterals) while keeping Agresso authority on contract/financial identifiers. |
| D-EOC-4 | Reading modal over unlimited inline expansion | ui-ux-pro-max: clamp+expand sanctioned for short overflow; 65–75ch measure; multi-paragraph AI text inline pushes Acts 2–6 off-screen and breaks the narrative scan. Modal = deliberate reading mode. |
| D-EOC-5 | Client-side assembly (not server-side prompt building) | All inputs are already client-cached signals; server assembly would re-fetch three aggregates per generation and duplicate formatting logic next to a request-scoped repo. |
| D-EOC-6 | `data: null` (200) for unmapped contracts | Unmapped is the majority, normal case; 404 would spam interceptor error paths. |

---

## 13. Open questions

Tracked in requirements §6 (OQ-1 AI-service field adoption; OQ-2 CLARISA chips in hero; OQ-3 threshold tuning).

---

## 14. References

- Server exploration (2026-08-24): `agresso-contract.controller.ts:139-164, 257-269`, `agresso-contract.repository.ts:281-378, 1387-1483`, `clarisa-projects.service.ts:48, 76-158, 218-256`, `bilateral-project-mapping.service.ts:54-140`, `pooled-funding-contract.entity.ts:11-40`.
- Client: `project-dashboard.component.ts` (merge `46afb872`), `document-overview.service.ts`, `agresso-funding.constants.ts`.
- UX: ui-ux-pro-max guidelines — truncation (line-clamp + expand), line length 65–75ch, AI-streaming anti-pattern (spinner >10s), content-jumping reservation.
