# 02 — PRMS ↔ ARI mapping

> Side-by-side translation of every PRMS concept that matters for the ARI bilateral module.
> Use this with [`01-prms-backend-summary.md`](./01-prms-backend-summary.md) (PRMS reference) and [`../../../detailed-design/detailed-design.md`](../../../detailed-design/detailed-design.md) (ARI baseline).

---

## 1. Module / folder layout mapping

| Concern | PRMS path | ARI path (proposed) | Notes |
| --- | --- | --- | --- |
| Headless ingestion | `onecgiar-pr-server/src/api/bilateral/` | `server/researchindicators/src/domain/entities/bilateral/` | New entity-module folder. Follows ARI convention in [`server/researchindicators/src/CLAUDE.md` §3](../../../../server/researchindicators/src/CLAUDE.md). |
| Review workspace | `onecgiar-pr-server/src/api/results/` (`results.service.ts`, `result.repository.ts`, sub-folders) | `server/researchindicators/src/domain/entities/results/` (extend existing controller/service) + new `results-review-history` entity | ARI's results module already exists. Extend it; do **not** fork it. |
| Type-specific handlers | `api/bilateral/handlers/` | `domain/entities/bilateral/handlers/` | Same handler-interface pattern. Each handler delegates to its existing ARI typed module (`result-knowledge-product`, `result-capacity-sharing`, `result-innovation-dev`, `result-policy-change`). |
| DTOs | `api/bilateral/dto/` | `domain/entities/bilateral/dto/` | Same DTO surface — `CreateBilateralDto` family. |
| Routes registration | (Nest routes by controller) | `domain/routes/main.routes.ts` (ARI uses `RouterModule.register`) | Add a top-level `bilateral` route + nested sub-resources. |
| Shared utilities | `api/results/summary/` | Reuse ARI's existing per-typed-result services where possible. | Don't duplicate ARI's typed services. |

---

## 2. Auth / perimeter mapping

| Aspect | PRMS | ARI | Action |
| --- | --- | --- | --- |
| Ingestion auth | JWT-**excluded** + `@SkipThrottle()` + external perimeter (gateway / IP allowlist / API key / mTLS). | **ARI already has** a machine-token path: `Bearer base64({client_id, client_secret})` validated by `AppSecretsService.validation(client_id, client_secret, originOrIp)` against `app_secrets` + `app_secret_host_list`. | **Re-use ARI's machine token** instead of excluding the path from JWT middleware. Add a row per partner to `app_secrets` and an origin/IP to `app_secret_host_list`. |
| Review auth | Custom header `auth: <JWT>` validated by PRMS middleware. | Standard `Authorization: Bearer <JWT>` validated by `JwtMiddleware` against ROAR. | **Use ARI's standard ROAR JWT** flow. No custom header. |
| Throttling | `@SkipThrottle()` on ingestion. | `express-rate-limit` installed but not centrally configured. | Decide per-endpoint rate limit at controller level. |
| Audit log | Implicit. | `LoggingInterceptor` + `LoggerUtil` + per-status logging in `ResponseInterceptor`. | Use ARI conventions; do **not** log token payloads. |

> **Architectural win:** ARI's existing machine-token + host-allowlist mechanism *is* the perimeter protection PRMS relies on external infra for. This is the single biggest reuse opportunity.

---

## 3. Response envelope mapping

| Field | PRMS shape | ARI shape (`ServerResponseDto`) |
| --- | --- | --- |
| Payload | `response` | `data` |
| HTTP status | `statusCode` | `status` |
| Human description | `message` | `description` |
| Error payload | (collapsed into `message`) | `errors` |
| Timestamp | `timestamp` | `timestamp` |
| Path | `path` | `path` |

- **No new code is required** in ARI for this — `ResponseInterceptor` wraps every controller return into `ServerResponseDto` automatically.
- **Sync endpoints that PRMS returns as raw arrays** (`GET /api/bilateral/results`) — in ARI, wrap them too (return `ServerResponseDto<RawSyncRow[]>`), or use `StreamableFile` for very large dumps, but do not bypass the envelope.

---

## 4. Data model mapping (entity-by-entity)

| PRMS entity | ARI equivalent | Notes |
| --- | --- | --- |
| `Result` | `Result` (`domain/entities/results/entities/result.entity.ts`) | Already shares: `result_id`, `result_official_code`, `version_id`, `is_snapshot`, `report_year_id`, `result_status_id`, `is_active`, audit fields via `AuditableEntity`. |
| `Result.source = SourceEnum.Bilateral` | **New `ReportingPlatform` row** `BILATERAL` referenced via `result.platform_code` | ARI already has `ReportingPlatform` entity + `platform_code` FK on `Result`. Decision recorded in [`03-reuse-and-decisions.md` D1](./03-reuse-and-decisions.md). |
| `result_code` | `result_official_code` (bigint) | Same intent, different name. |
| `result_type_id` | ARI ties result type to `indicator_id` + the type-specific table that hangs off `Result` (e.g. `result_knowledge_product`). | Need a small mapping table or enum to translate PRMS `result_type_id` (1, 2, 5, 6, 7, 8, 4, 10) into ARI's `IndicatorsEnum`. |
| `result_level_id` | No direct ARI column; closest concept lives via `Indicator` + the per-type tables. | Decision needed (carry as enum on bilateral DTO; do **not** add a column without a clear use). |
| `status_id` (5 Pending Review / 6 Approved / 7 Rejected) | `result_status` rows + `result_status_workflow` transitions | Add three new `result_status` rows + workflow rules. ARI's `ResultStatusGuard` already enforces transitions. |
| `User` | ARI uses `secondary/user` entity + ROAR user context. | New entry-path: `findOrCreateExternalUser` for ingestion. ROAR remains the canonical IDP for humans. |
| `ResultReviewHistory` | **New entity** `ResultReviewHistory` under `domain/entities/results-review-history/` | ARI has `result_status_transitions` but not the justification-bearing review audit. Add explicit table. |
| `ResultsByInititiatives` (sic) | `ResultInitiative` + `ResultLever` | ARI separates Initiative and Lever (Strategic Outcome). Mapping decision in §7. |
| `ShareResultRequest` | No direct equivalent in ARI yet | Decision D2 — add a `result_share_request` entity, or model contributors via existing `ResultLever`/`ResultInitiative` rows with a role enum. |
| `ResultsTocResult` + `ResultsTocResultIndicators` + `ResultsTocTargetIndicator` | `LeverStrategicOutcome` + `LeverSdgTargets` + `LeverRole` + `ImpactAreaScore` + `ResultImpactArea` + `ResultImpactAreaGlobalTargets` + `ResultLeverSdgTargets` | ARI fragments ToC across several entities. Decision D3 details the mapping; not 1:1. |
| `ResultsCenter` | `ResultInstitution` filtered by an "is_lead_center" role flag, OR a `ResultInstitutionType` row for centers | ARI already centralizes institutions (CLARISA). Capture the "lead center" via institution role rather than a separate join table. |
| `ResultsByInstitution`, `ResultsByInstitutionType` | `ResultInstitution`, `ResultInstitutionType` | Already aligned. |
| `ResultCountry`, `ResultRegion`, `ResultCountrySubnational` | `ResultCountry`, `ResultRegion`, `ResultCountriesSubNational` | Already aligned. |
| `Evidence` (+ SharePoint join) | `ResultEvidence` | Already aligned. ARI does not currently model SharePoint specifically — capture as a generic URL/description. |
| `ResultsByProjects` + non-pooled project budget repos | `ResultContract` + AGRESSO `agresso_contract` + `result-contracts` | **Big concept gap**: PRMS calls them "bilateral projects" with grant titles + budgets; ARI calls them "contracts" sourced from AGRESSO. Decision D4 explains. |
| `Result` versioning via phase + year + `is_active` | `Result` versioning via `version_id` + `is_snapshot` + `report_year_id` + `is_active` | Already aligned. Use ARI's snapshot model. |
| Typed: `result_knowledge_product` | `result_knowledge_product` | Already exists in ARI. |
| Typed: `result_capacity_sharing` | `result_capacity_sharing` | Already exists. |
| Typed: `result_innovation_dev` | `result_innovation_dev` (+ `innovation-dev-anticipated-users`) | Already exists. |
| Typed: `result_innovation_use` | **Missing in ARI**. Closest existing concept: `result_actors` + `result_quantifications`. | Decision D5 — add `result_innovation_use` entity or compose from existing tables. |
| Typed: `result_policy_change` | `result_policy_change` | Already exists. |
| Typed: `innovation_package` (PRMS type 10) | **Out of scope for Phase 1.** | Defer. Note in `03-reuse-and-decisions.md`. |

---

## 5. API surface mapping

### 5.1 Ingestion endpoints

| PRMS | ARI (proposed) | Auth in ARI |
| --- | --- | --- |
| `POST /api/bilateral/create` | `POST /api/v1/bilateral/create` | Machine token (`app_secrets`) |
| `GET /api/bilateral` | `GET /api/v1/bilateral` | Machine token or ROAR JWT |
| `GET /api/bilateral/list` | `GET /api/v1/bilateral/list` | Machine token or ROAR JWT |
| `GET /api/bilateral/results` | `GET /api/v1/bilateral/results` | Machine token (sync) |
| `GET /api/bilateral/:id` | `GET /api/v1/bilateral/:id` | Machine token or ROAR JWT |

### 5.2 Review workspace endpoints

PRMS uses `/api/results/bilateral/*` and `/api/results-framework-reporting/*`. ARI's natural fit:

| PRMS | ARI (proposed) | Notes |
| --- | --- | --- |
| `GET /api/results/pending-review?programId=...` | `GET /api/v1/results/bilateral/pending-review?leverCode=...` | Re-key from Science Program to ARI's Lever (D3). |
| `GET /api/results/by-program-and-centers?programId=...&centerIds=...` | `GET /api/v1/results/bilateral?leverCode=...&institutionCodes=...` | Reuse ARI's v2 list endpoint shape (`/api/v2/results`) if it covers filters. |
| `GET /api/results/bilateral/:resultId` | `GET /api/v1/results/bilateral/:result-code` | Use `RESULT_CODE` path token + `@GetResultVersion()` decorator. |
| `PATCH /api/results/bilateral/:id/title` | `PATCH /api/v1/results/:result-code/title` (gated to bilateral source) | Re-use ARI's per-result patch pattern. |
| `PATCH /api/results/bilateral/review-update/toc-metadata/:id` | `PATCH /api/v1/results/:result-code/alignments` (gated to bilateral + with `updateExplanation`) | ARI already has `PATCH /:result-code/alignments` — extend to require justification when source is BILATERAL. |
| `PATCH /api/results/bilateral/review-update/data-standard/:id` | `PATCH /api/v1/results/:result-code/general-information` (gated + with `updateExplanation`) | Same pattern; extend with justification. |
| `PATCH /api/results/bilateral/:id/review-decision` | `POST /api/v1/results/:result-code/status/transitions` (with body `{ decision, justification }`) | ARI already has a status-transitions sub-resource via `ResultStatusModule`. Map APPROVE/REJECT onto new transitions. |
| `GET /api/results-framework-reporting/.../progress` | `GET /api/v1/results/bilateral/lever-progress` (or equivalent) | New endpoint; aggregates pending counts per Lever. |
| `GET /api/notification/recent-activity` | (defer — uses ARI's existing activity tracking if any; otherwise out of scope) | Decision D6. |
| `GET /api/results-framework-reporting/bilateral-projects?tocResultId=...` | `GET /api/v1/agresso/contracts?leverCode=...` | Map to AGRESSO contracts; not 1:1. |

---

## 6. Status workflow mapping

PRMS uses 7 status ids hard-coded. ARI uses `result_status` rows + `result_status_workflow` for allowed transitions per role.

| PRMS id | PRMS name | ARI handling |
| ---: | --- | --- |
| 1 | Editing | Use ARI's `DRAFT` (already in `ResultStatusEnum`). |
| 2 | Quality Assessed | Map to a new ARI `QUALITY_ASSESSED` row OR omit for Phase 1. |
| 3 | Submitted | Use ARI's `SUBMITTED` if it exists; otherwise add. |
| 4 | Discontinued | Map to ARI's `ARCHIVED`/`DISCONTINUED` (verify in `result_status`). |
| **5** | **Pending Review** | **Add new row** `BILATERAL_PENDING_REVIEW`. |
| **6** | **Approved** | **Add new row** `BILATERAL_APPROVED`. |
| **7** | **Rejected** | **Add new row** `BILATERAL_REJECTED`. |

Add corresponding rows to `result_status_workflow`:

- `DRAFT → BILATERAL_PENDING_REVIEW` (ingestion).
- `BILATERAL_PENDING_REVIEW → BILATERAL_APPROVED` (reviewer = MEL_REGIONAL_EXPERT, CENTER_ADMIN, SYSTEM_ADMIN).
- `BILATERAL_PENDING_REVIEW → BILATERAL_REJECTED` (reviewer = same as above).
- `BILATERAL_APPROVED → BILATERAL_PENDING_REVIEW` (if re-review allowed — D7).
- `BILATERAL_REJECTED → BILATERAL_PENDING_REVIEW` (if re-submission allowed — D7).

`ResultStatusGuard` then enforces these without any new code.

---

## 7. ToC concept mapping

PRMS uses **Science Program → Area of Work → ToC result → indicator → target**. ARI uses **Lever → Strategic Outcome → SDG Target / Impact Area Global Target**.

| PRMS concept | ARI concept | Mapping notes |
| --- | --- | --- |
| Science Program (e.g. `SP01`) | `Lever` (via `result_lever` + CLARISA Lever) | Both are funded programmatic units. The Science Program id should map to a CLARISA Lever code. |
| Lead Science Program (initiative role 1) | Primary Lever (`result_lever.is_primary = true`) | Already a pattern in ARI. |
| Contributing Science Program (role 2) | Secondary Lever rows on `result_lever` | Add a `role` or `is_primary=false` to distinguish. |
| Area of Work (AoW) | `LeverStrategicOutcome` | Closest semantic match; verify with product. |
| ToC result | `LeverStrategicOutcome` + `LeverSdgTargets` | Need a small bridge table or just a denormalized field. |
| ToC indicator | `Indicator` + `LeverSdgTargets` row | Already exists; needs explicit linkage decision. |
| ToC target | `result_impact_area_global_targets` row | ARI splits this into impact area + global target tables. |
| `share_result_request` | New `result_share_request` entity OR a status flag on `result_lever` | D2. |

> Mapping ToC fully is **the most ambiguous translation** in this work. Phase 1 may treat ToC as **initiative-only / Lever-only** (skip ToC indicator/target editing in the review drawer) — see [`03-reuse-and-decisions.md` D3](./03-reuse-and-decisions.md).

---

## 8. Type-specific tables mapping

| PRMS type | PRMS table | ARI table | Reuse status |
| ---: | --- | --- | --- |
| 1 — policy change | `result_policy_change` | `result_policy_change` | Reuse 1:1 (DTO + service). |
| 2 — innovation use | `result_innovation_use` | **Missing — needs new entity** (or compose from `result_actors` + `result_quantifications`) | D5. |
| 5 — capacity sharing | `result_capacity_sharing` | `result_capacity_sharing` (+ `result-cap-sharing-ip`) | Reuse 1:1 — verify gender disaggregation columns. |
| 6 — knowledge product | `result_knowledge_product` | `result_knowledge_product` | Reuse 1:1 — confirm KP metadata service equivalent (CGSpace / MQAP). |
| 7 — innovation development | `result_innovation_dev` (+ developers, anticipated users, typology, readiness) | `result_innovation_dev` + `innovation-dev-anticipated-users` + maturity-level + tool-functions | Reuse, with care around `readinness_level_id` (PRMS typo). |

**Preserve backend-compatible typos** until a versioned v2 contract is announced — even if ARI's column names are correct, the ingestion DTO must accept the PRMS-shaped payload to stay contract-compatible. Map at the service layer.

---

## 9. Geography mapping

ARI geography mirrors PRMS almost exactly:

| PRMS field | ARI field |
| --- | --- |
| `geo_focus.scope_code` (1/2/4/5/50) | `result.geo_scope_id` → `clarisa_geo_scope` |
| `geo_focus.regions[]` | `ResultRegion` (already nested under `Result`) |
| `geo_focus.countries[]` | `ResultCountry` |
| `geo_focus.subnational_areas[]` | `ResultCountriesSubNational` |
| `geo_focus.comment` | `result.comment_geo_scope` |

Validation rules are the same. CLARISA lookups already wrapped under `domain/tools/clarisa/`.

---

## 10. CLARISA & catalog mapping

ARI already exposes `domain/tools/clarisa/` with the full catalog surface PRMS references (initiatives, centers, institutions, countries, regions, subnational areas, projects, policy types/stages, innovation typology/readiness/use levels).

- **Initiatives** — ARI has `ResultInitiative` + CLARISA `Initiative`. PRMS uses `official_code` to validate Science Program ids; ARI must validate Lever (Science Program) codes the same way before transaction work.
- **Innovation catalogs** — verify ARI's `maturity-level`, `tool-functions`, `innovation-dev-anticipated-users` cover PRMS typology/readiness/use levels.
- **Policy catalogs** — verify ARI has equivalents for policy types/stages (decision D8).

---

## 11. Knowledge Product metadata source

PRMS uses **CGSpace + DSpace + MQAP** for KP metadata.

ARI:

- No current first-party CGSpace integration (verify under `domain/tools/`).
- The bilateral KP ingestion handler must call an equivalent service to fetch metadata from the handle (`10568/...`).
- Phase 1 decision (D9): build a new `tools/cgspace-integration/` module, or call an existing CGIAR-hosted MQAP-like API, or carry metadata in the payload temporarily.

---

## 12. Integrations that ARI brings that PRMS does not document here

These are ARI-side additions — opportunities, not requirements:

| ARI capability | Use for bilateral module |
| --- | --- |
| **OpenSearch** indexes for Results / PRMS / Alliance Staff | Bilateral results should be indexed via `@OpenSearchProperty` on the existing `Result` entity. No new index required if `source/platform_code` is filterable. |
| **Socket.IO** gateway | Emit a `result.bilateral.review.decided` event on approve/reject so STAR refreshes the table + pending counts in real time. Event taxonomy is currently undocumented in ARI — capture in the module spec. |
| **RabbitMQ microservice** (`ARI_QUEUE`) | Optional: re-publish approved bilateral results to downstream platforms (PRMS, TIP, AICCRA). |
| **AGRESSO** integration | Map "bilateral projects" → AGRESSO contracts (see §4 and D4). |
| **DynamoDB feedback** | Reviewer comments can flow into the existing feedback store. |
| **Versioning / snapshots** | When a bilateral result is approved, ARI can snapshot it (`is_snapshot=true`) to freeze the approved version. Decision D10. |

---

## 13. Conventions every bilateral controller in ARI MUST adopt

From [`docs/detailed-design/detailed-design.md`](../../../detailed-design/detailed-design.md) and [`docs/specs/general-setup/`](../../general-setup/):

- Global prefix `/api`; URI versioning `/api/v1/...`.
- Every response wrapped in `ServerResponseDto` (handled automatically by `ResponseInterceptor`).
- Every error thrown as a Nest HTTP exception (never raw `Error`).
- `@ApiTags('Bilateral')` (and `'Results'` where extending the results module), `@ApiBearerAuth`, `@ApiOperation`, per-param `@ApiQuery` / `@ApiBody`.
- `@Roles(...)` on every protected endpoint; `RolesGuard` is global.
- `ResultStatusGuard` on every result-mutating endpoint.
- Audit fields populated from `request.user` (`AuditableEntity`).
- New columns get a migration **and** `@OpenSearchProperty(...)` if searchable.
- Sibling `*.spec.ts` per controller / service / guard / interceptor.
- Cron-driven sync goes under `domain/tools/cron-jobs/` and writes `sync_process_log`.

---

## 14. What this mapping does NOT decide

This file is a **technical translation reference**. The architectural / product choices that follow from it — including which result types ship in Phase 1, how ToC is modeled, whether to add `result_innovation_use`, and how reviewer roles map onto `SecRolesEnum` — are tracked as decisions in [`03-reuse-and-decisions.md`](./03-reuse-and-decisions.md).
