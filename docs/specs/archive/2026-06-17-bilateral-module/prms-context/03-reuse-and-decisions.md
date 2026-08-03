# 03 — Reuse-vs-rebuild + open decisions

> The PO-grade synthesis. Maps reuse opportunities, adds-required, and decisions still pending. Resolve (or carry forward) every decision below **before** writing `docs/specs/bilateral-module/<feature>/requirements.md`.

---

## 1. Reuse pillar — what ARI already has

ARI brings substantial infrastructure that we can lean on without writing new code.

| Capability | Why it matters for bilateral |
| --- | --- |
| **`Result` aggregate** with `result_official_code`, `version_id`, `is_snapshot`, `report_year_id`, `result_status_id`, `platform_code`, `is_active`, audit columns via `AuditableEntity` | The whole PRMS bilateral header maps onto the existing `Result` table. No new "bilateral result" table needed. |
| **`ReportingPlatform`** entity referenced via `result.platform_code` | Already the right place to tag results coming from the bilateral pipeline (add a `BILATERAL` row). |
| **Machine-token auth** (`AppSecretsService.validation(client_id, client_secret, originOrIp)` against `app_secrets` + `app_secret_host_list`) | Solves PRMS's "perimeter must exist outside NestJS" problem **inside the application**. Each ingestion partner gets an `app_secrets` row + an `app_secret_host_list` allowlist entry. |
| **ROAR JWT** flow via `JwtMiddleware` | Already wired for review workspace endpoints. |
| **`RolesGuard`** + `@Roles(...)` decorator + `SecRolesEnum` (`MEL_REGIONAL_EXPERT`, `CENTER_ADMIN`, `SYSTEM_ADMIN`) | Review-decision authorization is a one-line `@Roles(...)` on the existing endpoint. |
| **`ResultStatusGuard`** + `result_status` + `result_status_workflow` + `result_status_transitions` | Status transitions for `PENDING_REVIEW → APPROVED/REJECTED` are configuration, not new code. |
| **`ResponseInterceptor`** + `ServerResponseDto` + `GlobalExceptions` | Every endpoint already returns the right envelope. PRMS's hand-rolled envelope translation is free. |
| **CLARISA integration** under `domain/tools/clarisa/` | Initiatives, centers, institutions, countries, regions, subnational areas, projects, policy types/stages, innovation catalogs — all already exposed. |
| **AGRESSO integration** under `domain/tools/agresso/` | "Bilateral projects" in PRMS map to AGRESSO contracts in ARI (see D4). |
| **Existing typed result tables**: `result_policy_change`, `result_capacity_sharing`, `result_innovation_dev`, `result_knowledge_product`, plus `result_actors`, `result_quantifications`, `result_oicr`, `result_ip_rights`, `result_evidences`, `result_institutions`, `result_countries`, `result_regions`, `result_languages`, `result_keywords`, `result_initiatives`, `result_levers`, `result_sdgs`, `result_impact_areas` | 4 of 5 PRMS typed tables already exist. Only innovation-use is missing. |
| **`OpenSearchProperty`** decorator | Searchable bilateral fields require zero new mapping code. |
| **`Socket.IO` gateway** + **RabbitMQ** microservice (`ARI_QUEUE`) | Real-time review updates + downstream re-publish without new transports. |
| **Swagger** at `/swagger` | Documentation surface comes for free. |
| **AI formalization endpoints** (`/results/ai/formalize`) | Pattern for accepting external structured payloads with `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` already in place. Bilateral ingestion is a peer of AI formalization. |

> **Implication:** the bilateral module's "new code" surface is **much smaller than a PRMS port** would suggest. The bulk is **configuration + small DTOs + handlers + a few new entities**.

---

## 2. Add pillar — what must be ADDED to ARI

The minimum new surface to deliver a Phase 1 bilateral module.

### 2.1 New entity module

```
server/researchindicators/src/domain/entities/bilateral/
├── bilateral.controller.ts
├── bilateral.service.ts
├── bilateral.module.ts
├── dto/
│   ├── create-bilateral.dto.ts
│   ├── list-bilateral-query.dto.ts
│   ├── review-decision.dto.ts
│   ├── update-toc.dto.ts
│   └── update-data-standard.dto.ts
└── handlers/
    ├── bilateral-result-type-handler.interface.ts
    ├── policy-change.handler.ts
    ├── capacity-sharing.handler.ts
    ├── innovation-development.handler.ts
    ├── innovation-use.handler.ts        (gated on D5)
    ├── knowledge-product.handler.ts
    └── noop.handler.ts
```

### 2.2 New entity for review audit

```
server/researchindicators/src/domain/entities/result-review-history/
├── result-review-history.controller.ts
├── result-review-history.service.ts
├── result-review-history.module.ts
├── entities/result-review-history.entity.ts   # actor, decision, justification, timestamp
├── dto/
└── enum/review-decision.enum.ts
```

### 2.3 Reference / catalog rows

- New `ReportingPlatform` row: `code='BILATERAL'`, `name='Bilateral'`.
- New `result_status` rows: `BILATERAL_PENDING_REVIEW`, `BILATERAL_APPROVED`, `BILATERAL_REJECTED`.
- New `result_status_workflow` rules wiring the transitions (see [`02-ari-mapping.md` §6](./02-ari-mapping.md)).

### 2.4 New (or extended) shared concerns

- A `MachineTokenGuard` or `@MachineToken()` decorator (if a clearer DX is wanted than relying on `JwtMiddleware` alone).
- A small mapper that translates PRMS `result_type_id` → ARI's internal indicator/type model.
- A `JustificationRequired` validator pipe (or DTO-level `class-validator` rule) for `updateExplanation` on review-edit endpoints.

### 2.5 New (optional) integration

- A `tools/cgspace-integration/` module if Phase 1 requires KP handle-based metadata (gated by D9).

### 2.6 Migrations + OpenSearch

- One migration per schema concern (new entity tables, new status/workflow rows, new platform row).
- `@OpenSearchProperty` decoration on any new searchable column.

### 2.7 Module spec

- `docs/specs/bilateral-module/<feature>/requirements.md` + `design.md` + `task.md` following `docs/specs/general-setup/`.

---

## 3. Decision pillar — open decisions before specifying

Each row below must have an outcome (DECIDED / DEFERRED / DROPPED) before we write the feature `requirements.md`. Owners are placeholders; replace with real names.

| # | Decision | Options | Recommendation | Owner | Due |
| --- | --- | --- | --- | --- | --- |
| **D1** | How to authenticate ingestion. | A. Use ARI's existing machine-token (`Bearer base64({client_id, client_secret})`). B. Exclude `/api/v1/bilateral/*` from `JwtMiddleware` and rely on external perimeter (PRMS-style). C. Add a new API-key header. | **A.** ARI already has the perimeter inside the app; no need to duplicate PRMS's external-gateway approach. | Eng lead + Security | TBD |
| **D2** | How to model "contributing Science Programs" (`share_result_request` equivalent). | A. New `result_share_request` entity. B. Re-use `result_lever`/`result_initiative` with a role column. C. Defer to Phase 2 and accept lead-only in Phase 1. | **B** if the existing role tables support a "contributor" role; otherwise **A** if granularity is needed for invitations/notifications. | Eng lead + PO | TBD |
| **D3** | How deep to port ToC into ARI. | A. Full PRMS ToC port (Science Program → AoW → ToC result → indicator → target). B. Lever / Strategic Outcome / SDG Target / Impact Area (current ARI) — initiative-only mapping in Phase 1. C. Hybrid: store ToC as opaque JSON for now. | **B** for Phase 1, with **A** as a Phase 2 spec. | PO + Architect | TBD |
| **D4** | "Bilateral projects" model. | A. Always map to AGRESSO contracts (look up by code or partner_contract_id). B. Add a separate `bilateral_project` entity decoupled from AGRESSO. C. Mix — use AGRESSO when available, fallback to a new entity. | **A** if every bilateral grant has an AGRESSO contract; **C** otherwise. Need data check with finance. | PO + Finance/AGRESSO owner | TBD |
| **D5** | Whether to add `result_innovation_use`. | A. New entity + handler + typed service. B. Compose from existing `result_actors` + `result_quantifications`. C. Skip type 2 (innovation use) for Phase 1. | **C** for Phase 1 if low priority; otherwise **A** to preserve PRMS contract fidelity. | PO + Architect | TBD |
| **D6** | Reviewer-role model. | A. Map MEL_REGIONAL_EXPERT + CENTER_ADMIN to "reviewer". B. Add a new `SecRolesEnum.BILATERAL_REVIEWER`. C. Use a per-Lever assignment table. | **A** for Phase 1 (simplest). Revisit if scoping per-Lever is required. | PO + Security | TBD |
| **D7** | Allow re-review of approved/rejected results? | A. One-shot: APPROVED/REJECTED is terminal. B. Allow `→ PENDING_REVIEW` re-entry with audit. | **B**. Reviewers should be able to re-open if a contributor provides new evidence. Capture justification on each re-entry. | PO | TBD |
| **D8** | Catalogs ARI may be missing (policy types/stages, innovation typology/readiness/use levels). | A. Add to CLARISA integration. B. Hardcode enums in Phase 1. | **A**. Lean on CLARISA as the master data authority. | Architect | TBD |
| **D9** | KP metadata source. | A. Build `tools/cgspace-integration/` and call CGSpace by handle. B. Use an existing CGIAR MQAP API if available. C. Trust the payload in Phase 1 (anti-pattern per PRMS docs) and harden in Phase 2. | **A or B** — do NOT trust payload. KP must be metadata-sourced. | Architect + PO | TBD |
| **D10** | Snapshot on approval. | A. Approving sets `is_snapshot=true` + bumps `version_id`. B. No snapshot on approval; rely on review history. | **A**. Aligns with ARI's existing versioning; preserves an immutable approved version for downstream sync. | Architect | TBD |
| **D11** | Sync / list contract. | A. Mirror PRMS `{ type, result_id, data }[]` wrapper for `GET /api/v1/bilateral/results`. B. Use ARI's `ServerResponseDto` envelope. C. Both: A behind a `?raw=true` flag. | **C**. Default ARI envelope; raw wrapper for downstream consumers that already integrate with PRMS-shaped sync. | Eng lead + downstream consumers | TBD |
| **D12** | Backend-compatible typos (`has_unkown_using`, `readinness_level_id`, `non_pooled_projetct_budget_id`). | A. Preserve typos to keep payload contract. B. Rename and ship contract v2. | **A** for Phase 1 (preserve contract). Plan v2 in a later spec. | PO + downstream consumers | TBD |
| **D13** | Innovation Package / type 10. | A. In-scope Phase 1. B. Defer. | **B**. Not in PRMS bilateral data flow today (`-` in PRMS table). | PO | TBD |
| **D14** | Soft-delete vs hard-delete relations on data-standard updates. | A. Soft-delete (`is_active=false`) — PRMS rule. B. Hard-delete. | **A**. Matches PRMS + ARI auditability requirements. | Eng lead | TBD |
| **D15** | Rate limiting on ingestion endpoint. | A. None (PRMS `@SkipThrottle()`). B. Per-`client_id` limit using `express-rate-limit`. C. AWS API Gateway level. | **B + C**. Defense in depth. | DevOps + Security | TBD |
| **D16** | Real-time event taxonomy. | A. Emit `result.bilateral.review.decided` (and similar) on Socket.IO. B. Skip real-time in Phase 1. | **A**. Add a small section to a future `docs/specs/socket/` module spec. | Architect | TBD |

> Decisions D1, D3, D5, D9 are blocking for the requirements doc. The rest are blocking for the design doc.

---

## 4. Risk register

Carried forward from PRMS replication-checklist + new ARI-specific risks.

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| RB-1 | Machine-token credentials leak. | Low | High | Rotate `app_secrets` rows on a schedule; enforce host allowlist; never log token bodies. |
| RB-2 | ToC mapping mismatch (Science Program → Lever). | Medium | High | Phase 1 stays at Lever-only; defer indicator/target editing to Phase 2 (D3). |
| RB-3 | `result_status_workflow` mis-config blocks valid transitions. | Medium | Medium | Add migration tests asserting allowed transitions; spec test cases for each role. |
| RB-4 | KP metadata trusted from payload (anti-pattern). | Medium | High | D9 requires CGSpace/MQAP integration before Phase 1 KP support. |
| RB-5 | Bilateral grants with no AGRESSO contract. | Medium | Medium | D4 outcome must cover the fallback case. |
| RB-6 | `result_innovation_use` decision delays Phase 1. | Low | Medium | If type 2 not critical for Phase 1, drop (D5 option C). |
| RB-7 | Downstream consumers depend on PRMS sync wrapper shape. | High | Medium | D11 option C (dual shape) keeps both consumers happy. |
| RB-8 | Snapshot strategy diverges from PRMS phase model. | Medium | Low | Document in design doc; rely on existing ARI versioning. |
| RB-9 | Real-time events undocumented across STAR/PRMS. | High | Low | Capture in a follow-up `docs/specs/socket/` spec. |
| RB-10 | OpenSearch reindex pressure when adding `BILATERAL` platform. | Low | Medium | Run reindex job off-hours; size the cluster first. |
| RB-11 | Reviewers across many Levers; pending-count latency. | Medium | Medium | Cache pending counts; recompute on `result.bilateral.review.decided` event. |
| RB-12 | Backwards compatibility break by renaming typos. | High | High | D12 — preserve until v2 contract. |

---

## 5. Open product questions

Beyond technical decisions, the PO needs answers from stakeholders before Phase 1 scope is fixed.

- **OQ-1.** Which CGIAR Centers are the launch partners? Do their existing reporting flows already produce structured payloads compatible with `CreateBilateralDto`?
- **OQ-2.** What is the SLA for review turnaround (Pending Review → decision)? This shapes pending-count refresh cadence and notification design.
- **OQ-3.** Where do reviewers live in STAR today? Do we add a bilateral-specific page or extend the existing results dashboard?
- **OQ-4.** Compliance: does any bilateral data include donor-restricted information that must be siloed from regular CGIAR result data? (Links back to PRD OQ-7.)
- **OQ-5.** Reporting metrics: is bilateral reported separately to donors, or aggregated with W1/W2 results? Affects the export shape.
- **OQ-6.** Pricing / cost: any bilateral-specific quotas or limits we must enforce (e.g. # of pending results per partner)?
- **OQ-7.** Do we need a dry-run / validation-only endpoint for partners to test payloads before committing?

---

## 6. Phase 1 recommended scope (PO recommendation, pending decisions)

Subject to decisions above:

- **In scope**:
  - `POST /api/v1/bilateral/create` for result types 1 (policy), 5 (capacity), 6 (KP — with CGSpace integration), 7 (innovation dev).
  - Review endpoints (`GET pending-review`, `GET list`, `GET detail`, `PATCH title`, `PATCH alignments`, `PATCH general-information`, `POST status/transitions`).
  - Statuses + workflow rows.
  - `result_review_history` entity.
  - Machine-token auth for ingestion (D1 = A).
  - Lever-only ToC mapping (D3 = B).
  - Snapshot on approval (D10 = A).
  - Soft-delete relations on review edits (D14 = A).
  - Real-time `result.bilateral.review.decided` event (D16 = A).
  - Dual sync contract (D11 = C) — gated by partner readiness.

- **Out of scope (Phase 2+)**:
  - Innovation use (type 2) — D5 option C.
  - Innovation package (type 10) — D13 option B.
  - Full ToC indicator/target editing in review drawer — D3 option A is a future spec.
  - SharePoint-specific evidence joins.
  - Dry-run endpoint (OQ-7).

---

## 7. Next step

Once D1, D3, D5, D9 are decided, create the actual feature spec:

```
docs/specs/bilateral-module/<feature-slug>/
├── requirements.md   # follows docs/specs/general-setup/requirements.md
├── design.md         # follows docs/specs/general-setup/design.md
└── task.md           # follows docs/specs/general-setup/task.md
```

Suggested `<feature-slug>` for the first deliverable: **`phase-1-ingestion-and-review`** (covers ingestion + review of types 1/5/6/7).

The feature spec MUST link back to:

- [`README.md`](./README.md)
- [`01-prms-backend-summary.md`](./01-prms-backend-summary.md)
- [`02-ari-mapping.md`](./02-ari-mapping.md)
- This file
- [`04-glossary.md`](./04-glossary.md)
- The matching Jira user stories under [`../jira-us/`](../jira-us/)
