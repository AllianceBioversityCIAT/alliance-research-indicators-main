# 01 — PRMS bilateral backend, distilled

> **Source:** `onecgiar_pr/docs/bilateral-module/{backend.md, integration-contracts.md, replication-checklist.md, README.md}`.
> This file is a **filtered, ARI-relevant summary**. For field-level export contracts, defer to `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.

---

## 1. Module mission

The PRMS bilateral module lets CGIAR Centers submit **W3 / Bilateral-funded** research results into PRMS and lets **Science Program / Accelerator leads** review those results before they become accepted program results.

It has **two halves that must remain distinct**:

| Half | Where | What it does | Auth posture |
| --- | --- | --- | --- |
| **Headless ingestion** | `api/bilateral/*` | Accepts structured payloads, creates a PRMS `Result` + associations, dispatches type-specific handlers. | JWT-**excluded** + `@SkipThrottle()`. Perimeter-protected externally. |
| **Authenticated program review** | `api/results/bilateral/*` (and `api/results-framework-reporting/*`) | Lets Science Program leads list pending bilateral results by center, edit ToC and data-standard fields, approve or reject with audit history. | Authenticated. Custom `auth: <JWT>` header. |

The module mission has not changed in the source documents reviewed.

---

## 2. High-level architecture

```text
External bilateral source
  │
  │ POST /api/bilateral/create  (JWT-excluded; perimeter-protected externally)
  ▼
Backend bilateral ingestion (api/bilateral/)
  │ validates user / CLARISA codes / phase / year / uniqueness
  │ writes Result + associations inside ONE transaction
  │ delegates typed fields to handlers (KP, capacity, innov dev/use, policy)
  ▼
PRMS results data model (Result + typed tables + audit)
  │
  │ GET/PATCH /api/results/bilateral/*  (authenticated)
  ▼
Frontend "Bilateral Results Review" workspace
  │ center sidebar, filters, grouped table, review drawer
  │ inline title edit, ToC edit, data-standard edit (all with justification)
  │ approve / reject (justification required to reject)
  ▼
Accepted or rejected bilateral result + review history audit row
```

---

## 3. Backend module map

```text
api/bilateral/
├── bilateral.controller.ts
├── bilateral.service.ts
├── bilateral.module.ts
├── dto/
│   ├── create-bilateral.dto.ts
│   └── list-results-query.dto.ts
└── handlers/
    ├── bilateral-result-type-handler.interface.ts
    ├── knowledge-product.handler.ts
    ├── capacity-change.handler.ts
    ├── innovation-development.handler.ts
    ├── innovation-use.handler.ts
    ├── policy-change.handler.ts
    └── noop.handler.ts

api/results/
├── results.controller.ts
├── results.service.ts
├── result.repository.ts
├── summary/                       # reusable typed save/get patterns
├── results-toc-results/
├── results-centers/
├── results_by_inititiatives/      # (sic — preserve typo at write time)
├── results_by_institutions/
├── result-countries/
├── result-regions/
├── evidences/
├── results_by_projects/
├── result_budget/
└── result-review-history/
```

> The handler pattern is the key reusable design: common result creation stays in `BilateralService`; type-specific writes live in `handlers/`.

---

## 4. Ingestion endpoints

| Endpoint | Purpose | Service method |
| --- | --- | --- |
| `POST /api/bilateral/create` | Create one or more bilateral results from external payload. | `BilateralService.create` |
| `GET /api/bilateral` | Recent active bilateral results, default limit 10. | `findAll` |
| `GET /api/bilateral/list` | Paginated list across Result/API sources with filters. | `listAllResults` |
| `GET /api/bilateral/results` | Raw sync list `{ type, result_id, data }` for external sync. | `getResultsForSync` |
| `GET /api/bilateral/:id` | One bilateral result by internal id. | `findOne` |

**Validation:** `POST /create` uses `ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true })`. Unknown fields are stripped; forbidden non-whitelisted errors are not raised. DTOs are `class-validator` + `class-transformer` + Swagger-decorated.

---

## 5. Ingestion orchestration (`BilateralService.create`)

The transaction body is **non-negotiable**: result, associations, and typed writes all roll back together if anything fails.

```text
RootResultsDto
  → unwrapIncomingResults()
  → for each result:
      validate `data`
      validate Science Program codes vs CLARISA initiative official_codes
      START transaction
        find admin user
        findOrCreate created_by user
        findOrCreate submitted_by user
        resolve active reporting phase (VersioningService.$_findActivePhase)
        resolve active year (YearRepository)
        if KP: validate metadataCG.issue_year against known years
        validate non-KP unique title (within active phase)
        initializeResultHeader (default OR type handler override)
        handle lead_center
        handle geography (skip for KP; CGSpace populates)
        handle ToC mapping (lead + contributors)
        handle contributing partners (institutions)
        handle evidence (skip for KP; metadata sourced from CGSpace)
        handle contributing_bilateral_projects + budgets
        run type-specific handler.afterCreate()
        handle contributing_center
        enrich + return result response
      COMMIT
```

---

## 6. Root payload shapes

`RootResultsDto` accepts **three** shapes (normalized by `unwrapIncomingResults()`):

```json
{ "result":  { "type": "BILATERAL", "data": { … } } }
```

```json
{ "results": [ { "type": "BILATERAL", "data": { … } } ] }
```

```json
{
  "type": "knowledge_product",
  "data": { … },
  "received_at": "2026-05-12T00:00:00.000Z",
  "idempotencyKey": "external-key",
  "tenant": "external-system",
  "op": "dataset.ingest.requested"
}
```

---

## 7. Common ingestion DTO

`CreateBilateralDto` — shared by **all** result types:

| Field | Required | Notes |
| --- | --- | --- |
| `result_type_id` | yes | PRMS result type id; use `ResultTypeEnum`. |
| `result_level_id` | yes | Result level reference. |
| `created_date` | yes | Source creation date string. |
| `submitted_by` | yes | `{ email, name, submitted_date, comment? }`. |
| `created_by` | yes | `{ email, name }`. |
| `lead_center` | yes | `{ name?, acronym?, institution_id? }`. |
| `title` | **non-KP only** | KP title sourced from CGSpace metadata. |
| `description` | **non-KP only** | KP description sourced from metadata. |
| `toc_mapping` | yes | Lead Science Program + optional ToC fields. |
| `contributing_programs` | optional | Contributing Science Programs → share requests. |
| `geo_focus` | **non-KP only** | scope + regions/countries/subnational. |
| `contributing_center` | optional | CGIAR centers. |
| `contributing_partners` | optional | Partner institutions. |
| `evidence` | optional | URL + description list. |
| `contributing_bilateral_projects` | yes | Grant titles, lead flag, budget metadata. |

---

## 8. Type-specific blocks + handlers

| Result type | `result_type_id` | API string | Required block | Handler |
| --- | ---: | --- | --- | --- |
| Policy change | 1 | `policy_change` | `policy_change` | `PolicyChangeBilateralHandler` |
| Innovation use | 2 | `innovation_use` | `innovation_use` | `InnovationUseBilateralHandler` |
| Other outcome | 4 | `other_outcome` | — | `NoopBilateralHandler` |
| Capacity sharing | 5 | `capacity_sharing` | `capacity_sharing` | `CapacityChangeBilateralHandler` |
| Knowledge product | 6 | `knowledge_product` | `knowledge_product` | `KnowledgeProductBilateralHandler` |
| Innovation development | 7 | `innovation_development` | `innovation_development` | `InnovationDevelopmentBilateralHandler` |
| Other output | 8 | `other_output` | — | `NoopBilateralHandler` |
| Innovation Package / IPSR | 10 | `innovation_package` | (read-only export) | — |

### Handler interface

```ts
interface BilateralResultTypeHandler {
  readonly resultType: number;
  initializeResultHeader?(context): Promise<{ resultHeader: Result; isDuplicate?: boolean } | null>;
  afterCreate?(context): Promise<void>;
}
```

- `initializeResultHeader` — override for special header creation (KP).
- `afterCreate` — typed-table writes and derived associations.

---

## 9. Knowledge Product special case

- Requires the `knowledge_product.handle` field.
- **Does NOT trust** `title` / `description` / `evidence` / `geo_focus` from the payload.
- `ResultsKnowledgeProductsService` fetches/populates metadata from CGSpace / DSpace / MQAP.
- Validates `metadataCG.issue_year` against known reporting years when provided.
- Skips normal evidence creation to avoid duplicated/malformed KP evidence.
- May use existing KP records to detect duplicates.

> **Rule for any rebuild:** KP is metadata-sourced, not payload-sourced.

---

## 10. ToC mapping rules

`handleTocMapping()`:

- `toc_mapping.science_program_id` is the **lead** program → initiative **role 1**.
- `contributing_programs[].science_program_id` → **role 2** (creates `share_result_request` with request status 4).
- All Science Program IDs validated against CLARISA `initiative.official_code` **before** transaction work continues.
- Role 1 processed first; establishes `ownerInitiativeId`.
- If ToC result fields are present → attempt to find the ToC result; if not found, create initiative-only mapping.
- Missing `result_title` → initiative-only mapping.

---

## 11. Geography rules (non-KP only)

| Scope code | Label | Required arrays |
| ---: | --- | --- |
| 1 | Global | — |
| 2 | Regional | `regions[]` |
| 4 | National | `countries[]` |
| 5 | Sub-national | `countries[]` + `subnational_areas[]` |
| 50 | To be determined | — |

- Region lookup: UM49 code OR name.
- Country lookup: id, name, ISO alpha-3, or ISO alpha-2.

---

## 12. External user creation

`findOrCreateUser(userData, adminUser)`:

- Email required.
- Find by email; if missing, create with:
  - `first_name` from payload.
  - `last_name = "(external)"`.
  - `is_cgiar` inferred from email domain.
- Uses `UserService.createFull` with **AD lookup disabled** and **emails skipped**.
- Audits using admin or creator user ids.

> Ingestion MUST NOT block on Active Directory lookups. Mask emails in debug logs.

---

## 13. Result header defaults

The bilateral result header is created with:

- `source = SourceEnum.Bilateral`.
- Active reporting phase from `VersioningService.$_findActivePhase(AppModuleIdEnum.REPORTING)`.
- Active year from `YearRepository`.
- Creator + submitter user ids.
- Status **`Pending Review` (status_id = 5)** for reviewable bilateral results.
- Type / level / title / description / geographic scope where applicable.

---

## 14. List & sync enrichment

| Method | Output |
| --- | --- |
| `findAll(limit)` | Recent active bilateral results with relations + enrichment. |
| `listAllResults(query)` | Paginated list across Result/API sources with filter + metadata. |
| `getResultsForSync(bilateral, type)` | Raw `{ type, result_id, data }[]` for external sync. |

`listAllResults` filters:

- `source` — `Result` → `SourceEnum.Result`, `API` → `SourceEnum.Bilateral`.
- `portfolio` — portfolio acronym via version → portfolio relation.
- `phase_year` — version year.
- `result_type` — name → result type id.
- `status_id` + `status`.
- `last_updated_from/to`, `created_from/to`.
- `center` — lead center id/code/acronym.
- `initiative_lead_code` — lead initiative official code.
- `search` — escaped title `LIKE`.

**Pagination defaults:** page 1 / limit 10 / **max limit 500**.

---

## 15. Review backend

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `getScienceProgramProgress` | `GET /api/results-framework-reporting/.../progress` | Progress cards by Science Program. |
| `getPendingReviewCount` | `GET /api/results/pending-review?programId=...` | Pending count by program. |
| `getResultsByProgramAndCenters` | `GET /api/results/by-program-and-centers?...` | Grouped table rows by project + center selection. |
| `getBilateralResultById` | `GET /api/results/bilateral/:id` | Full detail for review drawer. |
| `updateBilateralResultTitle` | `PATCH /api/results/bilateral/:id/title` | Inline title edit. |
| `updateBilateralResultTocMetadata` | `PATCH /api/results/bilateral/review-update/toc-metadata/:id` | Save ToC edits with justification. |
| `updateBilateralResultReview` | `PATCH /api/results/bilateral/review-update/data-standard/:id` | Save data-standard edits with justification. |
| `reviewBilateralResult` | `PATCH /api/results/bilateral/:id/review-decision` | Approve or reject with audit history. |

### Review decision contract

```json
{ "decision": "APPROVE", "justification": "Approved" }
```

```json
{ "decision": "REJECT", "justification": "Reason entered by reviewer" }
```

Rules:

- Result must exist AND have `source = Bilateral`.
- Reject **requires** justification.
- Status changes ONLY through this service — never direct repository updates.
- Review history MUST record actor + decision + timestamp + justification.
- Approval MAY trigger ToC mapping updates + contributor workflows.

### Bilateral detail load (`getBilateralResultById`)

Returns conceptually:

```json
{
  "commonFields": {…},
  "tocMetadata": {…},
  "geographicScope": {…},
  "contributingCenters": [],
  "contributingProjects": [],
  "contributingInitiatives": {
    "contributing_and_primary_initiative": [],
    "accepted_contributing_initiatives": [],
    "pending_contributing_initiatives": []
  },
  "contributingInstitutions": [],
  "evidence": [],
  "resultTypeResponse": [],
  "contributors_result_toc_result": []
}
```

`contributingInitiatives` can be a legacy array OR the object above — frontend must tolerate both.

### Data-standard update

`PATCH /api/results/bilateral/review-update/data-standard/:id`:

- Common description/type, geography + extra geography.
- Contributing centers + lead-center marker.
- Contributing bilateral projects.
- Accepted + pending contributing initiatives.
- Contributing institutions.
- Evidence.
- Type-specific `resultTypeResponse`.
- `updateExplanation` (required for justification audit).

**Update rules:**

- Validate `updateExplanation`.
- Update only fields present in the payload — **but** explicit empty arrays **clear** relationships.
- Preserve audit columns; **soft-delete** inactive relations where possible (no hard deletes).
- Use type-specific services/repositories for typed fields.

---

## 16. Status semantics (cross-cutting)

| ID | Name | Notes |
| ---: | --- | --- |
| 1 | Editing | Standard PRMS editing state. |
| 2 | Quality Assessed | Standard QA state. |
| 3 | Submitted | Standard submitted state. |
| 4 | Discontinued | Standard discontinued state. |
| **5** | **Pending Review** | Bilateral result awaiting program review. |
| **6** | **Approved** | Bilateral result accepted by reviewer. |
| **7** | **Rejected** | Bilateral result rejected by reviewer. |

Frontend currently handles `status_id` as string OR number — rebuilds **must** coerce to number at the API boundary.

---

## 17. Data model dependencies

### Core entities used by bilateral flows

- `Result` — `source`, `result_code`, `result_type_id`, `result_level_id`, `status_id`, phase/version, year, audit fields.
- `User` — creator / submitter / reviewer / external users.
- `ResultReviewHistory` — review decisions + update audit.
- `ResultsByInititiatives` — lead initiative / Science Program mapping.
- `ShareResultRequest` — contributing Science Program requests.
- `ResultsTocResult`, `ResultsTocResultIndicators`, `ResultsTocTargetIndicator` — ToC alignment.
- `ResultsCenter` — contributing + lead centers.
- `ResultsByInstitution`, `ResultsByInstitutionType` — partners, implementing orgs, innovation-use orgs.
- `ResultCountry`, `ResultRegion`, `ResultCountrySubnational` — geography.
- `Evidence` (+ SharePoint join).
- `ResultsByProjects` + non-pooled project budget repos — bilateral projects + investments.
- Typed result tables: KP, capacity sharing, innovation dev, innovation use, policy change.

### External catalogs

- **CLARISA**: initiatives, centers, institutions, countries, regions, subnational areas, projects, policy types/stages, innovation typology/readiness/use levels.
- **ToC** services + ToC level/result catalogs.
- **CGSpace / MQAP** for Knowledge Product metadata.

---

## 18. Security posture (PRMS-side)

- `/api/bilateral/*` is **JWT-excluded** in `app.module.ts`.
- `BilateralController` is `@SkipThrottle()`.
- `ResponseInterceptor` wraps standard responses; sync endpoints may return raw arrays intentionally.
- Perimeter security MUST exist OUTSIDE NestJS (API Gateway, IP allowlists, API keys, mTLS, HMAC).
- `/api/results/bilateral/*` is authenticated via the custom `auth: <JWT>` header.
- Never log `auth`, JWTs, idempotency keys, webhook URLs, credentials, or sensitive env values.

---

## 19. Response envelope (PRMS)

```json
{
  "response": {…},
  "statusCode": 200,
  "message": "Successful response",
  "timestamp": "2026-05-12T00:00:00.000Z",
  "path": "/api/..."
}
```

Internal service envelope: `{ response, message, status }` → wrapped by `ResponseInterceptor`.

Sync endpoints intentionally return raw arrays.

---

## 20. Risks the PRMS docs explicitly call out

| # | Risk | Mitigation |
| --- | --- | --- |
| R-1 | Public ingestion unprotected. | Add perimeter auth + monitoring. |
| R-2 | Status id string/number mismatch. | Coerce at API boundary. |
| R-3 | KP treated as normal payload. | Use handle-based metadata sync. |
| R-4 | CLARISA ids confused with PRMS join ids. | Normalize export payloads to CLARISA ids/labels. |
| R-5 | Contract changes undocumented. | Require changelog + payload-shape tests. |
| R-6 | ToC tree not ported (frontend). | Start read-only, port `app-cp-multiple-wps` as shared component later. |
| R-7 | `status_id` updated outside review service. | Block direct writes; route through review. |
| R-8 | Hard-deleted relations. | Soft-delete on `is_active`. |
| R-9 | Renaming backend-compatible typos (`has_unkown_using`, `readinness_level_id`, `non_pooled_projetct_budget_id`) without versioned contract. | Preserve typos until a v2 contract is announced. |

---

## 21. Tests the PRMS docs prescribe (backend)

- DTO validation per type-specific block.
- `unwrapIncomingResults` for single, bulk, direct-data shapes.
- CLARISA initiative validation failures.
- External user creation path.
- KP duplicate / metadata behavior.
- Each type-specific handler.
- `listAllResults` filters + pagination boundaries.
- Bilateral detail shape per result type.
- Review decision transitions + reject justification.
- Data-standard update body mapping (incl. empty arrays).
- Payload-shape tests against `bilateral-result-summaries.en.md`.

---

## 22. Cross-references

- Endpoint catalog with full request/response bodies → `onecgiar_pr/docs/bilateral-module/integration-contracts.md`.
- Step-by-step rebuild plan → `onecgiar_pr/docs/bilateral-module/replication-checklist.md`.
- Field-level export shape → `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
- ARI mapping of everything above → [`02-ari-mapping.md`](./02-ari-mapping.md).
