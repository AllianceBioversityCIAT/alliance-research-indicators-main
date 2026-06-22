# 04 — Glossary

> One-stop vocabulary for the bilateral module work. CGIAR funding terms, PRMS terms, ARI terms.

---

## CGIAR funding windows

| Term | Definition |
| --- | --- |
| **W1 / Window 1** | Pooled funding from donors to the CGIAR System Council, allocated centrally. Most "core" funding. |
| **W2 / Window 2** | Pooled funding earmarked by donors to a specific initiative, program, or center. |
| **W3 / Window 3** | Bilateral funding — donor-direct grants to a single Center or partner for a specific project. NOT pooled. |
| **Bilateral** | Used interchangeably with W3 throughout PRMS and ARI. Means donor-to-Center direct funding. |
| **Pooled** | Funding routed through CGIAR's central allocation (W1/W2). |
| **Non-pooled** | Bilateral / W3 funding. PRMS column names like `non_pooled_projetct_budget_id` (sic) refer to this. |

---

## Programmatic structure

| Term | PRMS context | ARI equivalent |
| --- | --- | --- |
| **Initiative** | A CGIAR research initiative (legacy, pre-2025). | `Initiative` (CLARISA). Modeled in ARI as `ResultInitiative`. |
| **Science Program** | The post-2025 successor to "Initiative". A funded research program (e.g. SP01). PRMS still uses Initiative semantics with Science Program ids. | Maps to **Lever** in ARI (`Lever`, `ResultLever`). |
| **Accelerator** | A cross-cutting program that accelerates outcomes across Science Programs. | No direct ARI concept yet; maps closest to a Lever group. |
| **Area of Work (AoW)** | A grouping of ToC work inside a Science Program. | Closest: `LeverStrategicOutcome` in ARI. |
| **Lever** | ARI's strategic unit; what a result aligns to. Has a primary + contributors. | Same in PRMS at a different granularity (Initiative/Science Program). |
| **Strategic Outcome** | ARI term for the outcome a Lever targets. | `LeverStrategicOutcome`. |
| **SDG Target** | UN Sustainable Development Goal target a result contributes to. | `LeverSdgTargets`, `ResultLeverSdgTargets`. |
| **Impact Area** | One of CGIAR's five Impact Areas (Nutrition, Poverty, Climate, Environment, Gender). | `ResultImpactArea`, `ImpactAreaScore`, `ResultImpactAreaGlobalTargets`. |

---

## Theory of Change (ToC)

| Term | Definition |
| --- | --- |
| **ToC result** | An outcome statement in a Science Program's Theory of Change tree (e.g. "Policy X adopted by Y stakeholders"). |
| **ToC level** | The level in the ToC hierarchy (output, outcome, impact, 2030 outcome). |
| **ToC indicator** | A measurable indicator tied to a ToC result. |
| **ToC target** | A quantified target on an indicator. |
| **Planned result** | A flag indicating whether the result was planned in advance vs emergent. |
| **Contributor / Lead** | Whether the Science Program / Initiative is the LEAD or a CONTRIBUTOR to the result. Maps to `initiative_role_id = 1` (lead) or `2` (contributor) in PRMS. |

---

## PRMS-specific terms

| Term | Definition |
| --- | --- |
| **Result** | The unit of reporting. Has `result_code`, `result_type_id`, `result_level_id`, `status_id`, `source`, phase/year, audit fields. |
| **Source** (`SourceEnum`) | Where the result entered PRMS. `Result` = internal entry; `Bilateral` = external bilateral ingestion. |
| **Phase / Version** | PRMS reporting phase; bound to an AppModule (`REPORTING`). |
| **Active phase / Active year** | Resolved via `VersioningService.$_findActivePhase` and `YearRepository`. |
| **Result type** | A categorical kind of result. PRMS ids: 1 policy_change, 2 innovation_use, 4 other_outcome, 5 capacity_sharing, 6 knowledge_product, 7 innovation_development, 8 other_output, 10 innovation_package. |
| **Result level** | Sub-categorization within a result type (e.g. output level, outcome level). |
| **Result status** | Lifecycle state. PRMS: 1 Editing, 2 Quality Assessed, 3 Submitted, 4 Discontinued, **5 Pending Review**, **6 Approved**, **7 Rejected**. |
| **Pending Review** | Status 5. Default for newly ingested bilateral results. |
| **Approved / Rejected** | Status 6 / 7. Terminal-ish; re-review may be allowed per D7. |
| **Review history** | Audit table recording every decision (actor, decision, timestamp, justification). |
| **`updateExplanation`** | Required justification on ToC / data-standard edits during review. |
| **Share Result Request** | A request from a result owner to add a contributing Initiative / Science Program. Has `request_status` (status 4 = pending). |
| **Idempotency key** | Header / payload field from external systems for at-most-once ingestion semantics. |
| **`auth: <JWT>`** | PRMS custom auth header — NOT used in ARI. |

---

## Result types & ARI equivalents

| PRMS type id | API string | Display name | ARI table / module |
| ---: | --- | --- | --- |
| 1 | `policy_change` | Policy change | `result_policy_change` |
| 2 | `innovation_use` | Innovation use | **Missing in ARI** — D5 |
| 4 | `other_outcome` | Other outcome | No typed table; covered by base `Result` |
| 5 | `capacity_sharing` | Capacity sharing for development | `result_capacity_sharing` (+ `result-cap-sharing-ip`) |
| 6 | `knowledge_product` | Knowledge product | `result_knowledge_product` |
| 7 | `innovation_development` | Innovation development | `result_innovation_dev` (+ `innovation-dev-anticipated-users`, maturity-level, tool-functions) |
| 8 | `other_output` | Other output | No typed table |
| 10 | `innovation_package` | Innovation Package / IPSR | Out of scope Phase 1 — D13 |

---

## Status semantics

| Id | Name | Default for | ARI mapping |
| ---: | --- | --- | --- |
| 1 | Editing | Internal results being edited | `DRAFT` (`ResultStatusEnum.DRAFT`) |
| 2 | Quality Assessed | Internal QA state | Possibly map to a new ARI status row |
| 3 | Submitted | Submitted internal results | `SUBMITTED` (if exists) |
| 4 | Discontinued | Decommissioned | `ARCHIVED` / `DISCONTINUED` |
| **5** | **Pending Review** | New bilateral results | **New ARI row** `BILATERAL_PENDING_REVIEW` |
| **6** | **Approved** | Reviewer-approved bilateral | **New ARI row** `BILATERAL_APPROVED` |
| **7** | **Rejected** | Reviewer-rejected bilateral | **New ARI row** `BILATERAL_REJECTED` |

---

## External systems

| Term | Definition | Role for bilateral |
| --- | --- | --- |
| **CLARISA** | CGIAR master-data service. Source of truth for initiatives, centers, institutions, countries, regions, subnational areas, projects, policy types/stages, innovation typology/readiness/use levels. | Validate every external code on ingestion. |
| **CGSpace** | CGIAR's institutional repository (DSpace-based). | KP metadata source by handle. |
| **MQAP** | CGIAR's Knowledge Product harvester / quality assessment platform. | Alternative KP metadata source. |
| **DSpace** | The repository platform CGSpace runs on. | Underlying KP storage. |
| **AGRESSO** | CGIAR's finance / ERP system. Source of truth for contracts + staff. | Maps to "bilateral projects" in PRMS — D4. |
| **ROAR Management** | CGIAR's identity / authentication service. | Validates JWTs for review-workspace endpoints in ARI. |
| **PRMS** | Performance and Results Management System — the existing CGIAR results reporting platform (legacy + transition). | Source of the bilateral module behavior we're porting. |
| **STAR** | The CGIAR Alliance's research-indicators frontend (this repo's `client/`). | Will consume the new ARI bilateral endpoints. |
| **AICCRA** | Accelerating Impacts of CGIAR Climate Research for Africa — a CGIAR initiative whose dashboards consume ARI/PRMS data. | Downstream consumer. |
| **TIP** | "Technical & Innovation Platform" — CGIAR system that ARI integrates with under `domain/tools/tip-integration/`. | Downstream consumer + master data source. |
| **OpenSearch** | Elasticsearch-fork search engine ARI uses for Results / PRMS / Alliance Staff indexes. | Bilateral results indexed via `@OpenSearchProperty` decorator. |
| **RabbitMQ** | Message broker. ARI uses queue `ARI_QUEUE`. | Optional outbound re-publish of approved bilaterals. |
| **DynamoDB** | AWS key-value store. ARI uses it for feedback. | Optional storage for reviewer comments. |

---

## ARI-specific terms

| Term | Definition |
| --- | --- |
| **Machine token** | Base64-encoded `{ client_id, client_secret }` JSON used as a `Bearer` token for partner-system authentication. Validated against `app_secrets` + `app_secret_host_list`. |
| **`app_secrets`** | Table holding partner client_id/client_secret pairs and associated user identity. |
| **`app_secret_host_list`** | Allowlist of origins or IPs permitted per `app_secrets` row. |
| **ROAR JWT** | The JWT issued by ROAR Management for human users. Validated by ARI's `JwtMiddleware`. |
| **`ResponseInterceptor`** | NestJS interceptor that wraps every controller return in `ServerResponseDto`. |
| **`ServerResponseDto`** | ARI's canonical envelope `{ data, status, description, errors, timestamp, path }`. |
| **`GlobalExceptions`** | NestJS `ExceptionFilter` that serializes all thrown errors into `ServerResponseDto`. |
| **`AuditableEntity`** | Base TypeORM entity carrying `created_by`, `updated_by`, `created_at`, `updated_at`, `is_active`. |
| **`RolesGuard`** | NestJS guard reading `@Roles(...)` metadata; `SYSTEM_ADMIN` bypasses. |
| **`ResultStatusGuard`** | NestJS guard enforcing `result_status_workflow` rules on mutating endpoints. |
| **`@OpenSearchProperty`** | Decorator on entity columns to generate OpenSearch mapping. |
| **`@GetResultVersion()`** | Decorator + interceptor that resolves `:result-code` and populates `_resultsUtil.resultId / resultCode / platformCode`. |
| **`SetUpInterceptor`** | Interceptor that initializes per-request context (e.g. `ResultsUtil`). |
| **`LoggerUtil`** | ARI's logger wrapper. Use this, not `console.*`. |
| **`platform_code`** | FK on `Result` pointing to a `ReportingPlatform` row. The natural place to tag a result's pipeline of origin (`BILATERAL`, `AI`, etc.). |
| **Snapshot** | A frozen copy of a `Result` (`is_snapshot = true`) bound to a past `report_year_id`. |
| **`version_id`** | Increments on each snapshot of a `Result`. |
| **`sync_process_log`** | Table written by every scheduled integration cron job. |
| **`SecRolesEnum`** | Enum of role ids: SYSTEM_ADMIN (1), CONTRIBUTOR (3), TECHNICAL_SUPPORT (7), CENTER_ADMIN (9), MEL_REGIONAL_EXPERT (10). |
| **`ARI_QUEUE`** | RabbitMQ queue name for ARI's microservice. |

---

## Roles cross-walk

| PRMS role | ARI role | Notes |
| --- | --- | --- |
| External submitter | (no explicit role) | Authenticated via machine token; identity stored in `app_secrets` row. |
| Center submitter | `CONTRIBUTOR` | Map at user-creation time. |
| Science Program / Accelerator lead | `MEL_REGIONAL_EXPERT` (or new `BILATERAL_REVIEWER` per D6) | Reviews + approves/rejects bilaterals. |
| Admin / PMU | `CENTER_ADMIN` or `SYSTEM_ADMIN` | Cross-program review + data recovery. |
| Downstream consumer | (no explicit role) | Authenticated via machine token. |

---

## "Backend-compatible typos" to preserve

These typos exist in the PRMS contract and must be preserved in ARI ingestion DTOs until a versioned v2 contract is announced (decision D12):

- `has_unkown_using` (capacity sharing)
- `readinness_level_id` (innovation development)
- `non_pooled_projetct_budget_id` (bilateral project budget)
- `results_by_inititiatives` (PRMS table name — does not affect ARI table naming, but appears in PRMS responses)

Do **not** rename these in DTOs that talk to external partners.

---

## Where each term lives in code

| Term | PRMS source path | ARI source path |
| --- | --- | --- |
| `Result` | `onecgiar-pr-server/src/api/results/entities/result.entity.ts` | `server/researchindicators/src/domain/entities/results/entities/result.entity.ts` |
| Bilateral ingestion | `onecgiar-pr-server/src/api/bilateral/` | `server/researchindicators/src/domain/entities/bilateral/` (proposed) |
| ToC / Strategic Outcome | `onecgiar-pr-server/src/api/results/results-toc-results/` | `server/researchindicators/src/domain/entities/lever-strategic-outcome/` |
| CLARISA adapter | `onecgiar-pr-server/src/clarisa/` | `server/researchindicators/src/domain/tools/clarisa/` |
| AGRESSO adapter | (PRMS does not use AGRESSO) | `server/researchindicators/src/domain/tools/agresso/` |
| Status workflow | (PRMS uses hardcoded status ids) | `server/researchindicators/src/domain/entities/result-status-workflow/` |
| OpenSearch | (PRMS uses OpenSearch separately) | `server/researchindicators/src/domain/tools/open-search/` |
