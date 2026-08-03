# Requirements — Bilateral module

> **SDD spec.** Follows [`docs/specs/general-setup/requirements.md`](../general-setup/requirements.md).
> Inputs: [`./prms-context/`](./prms-context/), [`./jira-us/`](./jira-us/), [`../../prd.md`](../../prd.md), [`../../system-design/design.md`](../../system-design/design.md), [`../../detailed-design/detailed-design.md`](../../detailed-design/detailed-design.md).
> Companion documents: [`./design.md`](./design.md), [`./tasks.md`](./tasks.md).

---

## 1. Document control

| Field | Value |
| --- | --- |
| Spec id | 2026-05-bilateral-module |
| Module | bilateral-module |
| Status | Draft — pending approval |
| Phase | Phase 1 of the SDD methodology (requirements) |
| Owner | Product Owner: TBC. Engineering lead: TBC. BA: TBC. |
| Linked discovery (Jira) | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Linked epic (Jira) | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Linked PRD section | [`../../prd.md`](../../prd.md) — Personas §3, Scope §5 |
| Last updated | 2026-05-15 |
| Approvers | [ ] PO · [ ] Eng lead · [ ] BA · [ ] Security · [ ] DevOps |

---

## 2. Executive summary

The bilateral module gives the **STAR frontend** (and its **ARI backend**) the capability to:

1. **Tag** AGRESSO-sourced bilateral projects as **Pool Funding Contributors** when the CGIAR System Office validates that they fund Science Programs / Accelerators (W3 / Bilateral funding).
2. **Surface** a **Pool Funding Alignment** section on STAR results whose project is so tagged, letting Principal Investigators declare which SPs / Accelerators the result contributes to.
3. **Map** each aligned result to one or more **ToC indicators** with type-specific contribution data (capacity-sharing counts, KP handles, policy stages, innovation typology, etc.).
4. **Push** approved aligned results into **PRMS** via PRMS's existing bilateral ingestion contract, with idempotency, retry, and audit.
5. **Synchronize** STAR's local copy of the W3 Registry (project tags) and the SP ToC catalog (indicators) on a scheduled cadence.

The module reuses ARI's existing platform capabilities heavily (machine-token auth, response envelope, role + status guards, CLARISA + AGRESSO integrations, audit base, OpenSearch decorator, snapshot/versioning, Socket.IO, RabbitMQ). It adds one new entity module, three sync jobs, a small set of new endpoints, three new status rows, and an audit table.

The epic (AC-1385) is sized **S — 2 to 4 Sprints**, scheduled for **Q2 2026**. This spec covers the **entire epic** across all 7 user stories; [`./tasks.md`](./tasks.md) sequences them into 3 implementation phases.

---

## 3. Glossary

Full vocabulary lives in [`./jira-us/`](./jira-us/) (not re-included — single source of truth). Quick reminders:

| Term | Meaning in this spec |
| --- | --- |
| **W3 / Bilateral** | Donor-direct, non-pooled funding. The opposite of W1/W2 pooled funding. |
| **Pool Funding Contributor** | A bilateral project the System Office has validated as contributing to W1/W2 Pool Funding (SP / Accelerator). |
| **SP / Accelerator** | Science Program or Accelerator — CGIAR's post-2025 funded programmatic units. Maps to ARI's **Lever**. |
| **ToC** | Theory of Change. A hierarchy of outputs / outcomes / 2030 outcomes for an SP, each with indicators and targets. |
| **Indicator** | A measurable concept inside a ToC (e.g. "# people trained"). |
| **Pool Funding Alignment** | The STAR section on a result that captures which SPs/Accelerators the result contributes to. |
| **W3 Registry** | External CGIAR system of record for bilateral-to-Pool-Funding contributions at the project level. |
| **STAR** | The CGIAR Alliance research-indicators web app (sibling repo `client/`). |
| **ARI** | The Alliance Research Indicators backend (this repo's `server/`). |
| **PRMS** | The CGIAR legacy reporting platform that consumes bilateral results. |
| **CLARISA** | CGIAR master-data service. |
| **AGRESSO** | CGIAR finance/ERP system; source of truth for bilateral project records (contracts). |
| **Snapshot / version** | ARI's immutable copies of a `Result` (`is_snapshot=true`, `version_id` increment). |

---

## 4. System context & scope

### 4.1 System context

```
                ┌────────────────────────┐
                │  W3 / Bilateral        │
                │  Registry (System Off.)│
                └───────────┬────────────┘
                            │ pull (US6)
                            ▼
                ┌────────────────────────┐
   CLARISA ◀───►│        ARI server      │◀───── AGRESSO (contracts)
   (master)     │                        │
                │  domain/entities/      │
                │    bilateral/          │──pull──► PRMS / CLARISA ToC service
                │                        │  (US7)
                │  domain/tools/         │
                │    bilateral-push/     │──push (US5)──► PRMS bilateral ingestion
                │    w3-registry/        │
                │    sp-toc-sync/        │
                └───────────┬────────────┘
                            │ REST + Socket.IO
                            ▼
                ┌────────────────────────┐
                │      STAR (client/)    │
                │  Project list + tag    │  (US1)
                │  Pool Funding Align.   │  (US2)
                │  Indicator panel       │  (US3)
                │  Indicator mapping     │  (US4)
                │  Sync issues admin     │  (US5 admin retry)
                └────────────────────────┘
```

### 4.2 In scope

- Project-level Pool Funding Contributor tagging in ARI + STAR (US1).
- Per-result Pool Funding Alignment section + persistence + audit (US2).
- Display of ToC indicators of selected SPs (US3).
- Result → indicator mapping with type-specific contribution rules (US4).
- Push of approved aligned results to PRMS via PRMS bilateral ingestion contract (US5).
- Scheduled pull of W3 Registry into STAR (US6).
- Scheduled pull of SP ToC catalog into STAR (US7).
- Admin tooling (sync run history, manual trigger, dry-run, retry on push failure).

### 4.3 Out of scope

- Modifying the W3 Registry or PRMS implementations.
- Pushing data back to the W3 Registry.
- Authoring or editing ToC trees in STAR.
- Bilateral results that do **not** contribute to Pool Funding (these remain regular STAR results).
- Innovation Package (PRMS type 10) result type — deferred (decision D13).
- Full PRMS ToC editor (deferred — decision D3 option A is a future spec).
- STAR sign-up / authentication flow changes.

### 4.4 Non-goals

- The bilateral module is **not** a replacement for PRMS's bilateral module — STAR results flow **into** PRMS via its existing ingestion.
- The module is **not** a generic project-tagging framework — tags are scoped to Pool Funding Contributor only.

### 4.5 Phasing

| Phase | Stories | Tasks scope |
| --- | --- | --- |
| **Phase 1 — Foundation** | US1, US2 | Project tag + Pool Funding Alignment section. Foundation everyone else depends on. |
| **Phase 2 — Mapping** | US3, US4 | ToC indicator display + indicator mapping with contribution rules. |
| **Phase 3 — Integrations** | US5, US6, US7 | Push to PRMS, pull from W3 Registry, pull SP ToC. |

Detailed task sequencing is in [`./tasks.md`](./tasks.md).

---

## 5. Stakeholders & personas

Inherits from the PRD ([`../../prd.md`](../../prd.md) §3) and the jira-us epic file ([`./jira-us/epic-AC-1385.md`](./jira-us/epic-AC-1385.md)). Roles relevant to this module:

| Persona | Bilateral-module role | ARI `SecRolesEnum` |
| --- | --- | --- |
| **Principal Investigator (PI) / Result owner** | Declares Pool Funding Alignment, maps result to indicators. | `CONTRIBUTOR` |
| **Result contact** | Same as PI for editing rights on the result. | `CONTRIBUTOR` |
| **Center Admin** | Manages project tags; can override; can manually retry push; can review sync issues. | `CENTER_ADMIN` |
| **MEL Regional Expert** | Reviews aligned results, validates mapping correctness. | `MEL_REGIONAL_EXPERT` |
| **System Admin / Technical Support** | Operates sync jobs, manages secrets, accesses dry-run, monitors metrics. | `SYSTEM_ADMIN` / `TECHNICAL_SUPPORT` |
| **External: PRMS** | Consumer of approved bilateral results. | (none — machine-to-machine) |
| **External: W3 Registry** | Provider of project-tag data. | (none — machine-to-machine) |
| **External: SP ToC source** | Provider of indicator catalog (per **D3**). | (none — machine-to-machine) |

---

## 6. Functional requirements

Numbered `R-BIL-NNN` per the convention in [`../general-setup/requirements.md`](../general-setup/requirements.md). Grouped by source user story.

### 6.1 US1 — Tag Bilateral Projects (AC-1438)

#### R-BIL-001 — Persist Pool Funding Contributor tag on bilateral projects

- **As a** Center Admin or System Admin
- **I want** to mark an AGRESSO-sourced bilateral project as Pool Funding Contributor
- **So that** STAR knows which projects expose the Pool Funding Alignment flow

**Details:**
- Tag is a boolean flag on the AGRESSO contract record (ARI entity to be confirmed in design: extension of `agresso-contract` or join table).
- Only bilateral projects (AGRESSO contract classification) may carry the tag (non-bilateral / pooled contracts are rejected by the mutate endpoint).
- Authoritative source of tag values is the W3 Registry (R-BIL-026). Manual overrides allowed via privileged endpoint.

**Acceptance criteria:**
- AC.1 — A bilateral project in the W3 Registry list is tagged `is_pool_funding_contributor=true`.
- AC.2 — A bilateral project not in the list is `false`.
- AC.3 — A non-bilateral contract receives 400 on a tag attempt.
- AC.4 — Setting / clearing the tag writes audit columns (`AuditableEntity`) and emits a `sync_process_log` row when set by W3 Registry sync.

**Out of scope:** Authoring or editing the W3 Registry list inside STAR.

#### R-BIL-002 — Surface Pool Funding tag across STAR project surfaces

- **As a** STAR user (any role with read access to projects)
- **I want** to see the Pool Funding Contributor tag wherever projects are listed
- **So that** I can identify candidates for Pool Funding alignment quickly

**Details:**
- Surfaces: projects listing table, projects-and-results filter, Excel export, result creation flow, project selector inside the result detail, project-detail header.

**Acceptance criteria:**
- AC.1 — Projects listing shows the tag column with `Yes` / `No`.
- AC.2 — Excel export of projects includes the tag column with stable header name.
- AC.3 — Project-detail header displays the tag as a visible badge when `true`.
- AC.4 — Tag is filter-selectable (`Yes` / `No` / `All`) on both projects table and results table.

#### R-BIL-003 — Filter & search projects by Pool Funding tag

- **As a** STAR user
- **I want** to filter projects by `Pool Funding Contributor = Yes` or `No`
- **So that** I can scope my work to the relevant projects

**Acceptance criteria:**
- AC.1 — Filter chip is available on the projects list and on the results list.
- AC.2 — Filter is persisted in the URL.
- AC.3 — Filter combines with other filters (e.g. Center, Status) using AND semantics.
- AC.4 — Server-side filter applied via `?pool-funding-contributor=true|false` (kebab-case per ARI convention).

### 6.2 US2 — Pool Funding Alignment section (AC-1594)

#### R-BIL-010 — Conditional rendering of Pool Funding Alignment section

- **As a** STAR result viewer
- **I want** the Pool Funding Alignment section to appear on results in tagged projects only
- **So that** the UI stays clean when alignment is not applicable

**Acceptance criteria:**
- AC.1 — Section visible iff result's project has `is_pool_funding_contributor = true`.
- AC.2 — Section not present otherwise.
- AC.3 — Result-detail GET endpoint returns the section flag (`has_pool_funding_alignment_eligible`) so STAR does not need a second roundtrip.

#### R-BIL-011 — Capture Yes/No contribution + SP/Accelerator selection

- **As a** PI / contact / admin
- **I want** to declare whether a result contributes to Pool Funding and which SPs/Accelerators
- **So that** the result is formally aligned

**Acceptance criteria:**
- AC.1 — User selects Yes / No.
- AC.2 — `No` hides the SP selector.
- AC.3 — `Yes` shows a multi-select limited to SPs/Accelerators associated with the project (per W3 Registry data).
- AC.4 — Save returns 200 with envelope `ServerResponseDto` including the updated alignment payload.
- AC.5 — Save below 1.0 s p95 at 50 RPS (see NFR-BIL-001).

#### R-BIL-012 — Persistence + audit of Pool Funding Alignment

- **As a** Center Admin (or auditor)
- **I want** every change to Pool Funding Alignment recorded
- **So that** I can reconstruct who changed what and when

**Acceptance criteria:**
- AC.1 — `AuditableEntity` columns populated on insert/update.
- AC.2 — Save creates / updates a row in `result_review_history` (or a dedicated `result_pool_funding_alignment_history` if D2 splits the model).
- AC.3 — Audit visible to admins via an existing or new endpoint (to be confirmed in design).

#### R-BIL-013 — Authorization on Pool Funding Alignment

- **As a** STAR result owner / contact / admin
- **I want** only authorized users to edit Pool Funding Alignment
- **So that** unauthorized changes do not happen

**Acceptance criteria:**
- AC.1 — Editors limited to: Creator, PI, listed contacts on the result, `CENTER_ADMIN`, `SYSTEM_ADMIN`.
- AC.2 — `MEL_REGIONAL_EXPERT` and `TECHNICAL_SUPPORT` have read access without edit.
- AC.3 — Denial returns 403 with `description` indicating role insufficiency.

#### R-BIL-014 — Allow editing regardless of result status (AR.1)

- **As a** PI / admin
- **I want** to edit Pool Funding Alignment even when the result is `Approved`
- **So that** alignment can be refined post-approval

**Acceptance criteria:**
- AC.1 — Endpoint does **not** apply `ResultStatusGuard`.
- AC.2 — Editing an `Approved` result triggers ARI's snapshot/versioning per **D10** (see Open Decision Carry-Forward §10) — to be confirmed.

#### R-BIL-015 — Read-only after PRMS sync (AR.2)

- **As a** PI / admin
- **I want** Pool Funding Alignment to become read-only after the result is pushed to PRMS
- **So that** the synced version stays the canonical version

**Acceptance criteria:**
- AC.1 — Endpoint returns 409 on edit when `is_synced_to_prms = true` for the current version.
- AC.2 — STAR UI disables inputs and shows a "synced — read only" badge.
- AC.3 — Admin unlock path (if any) is out of scope for Phase 1 unless OQ-US2-3 is resolved.

#### R-BIL-016 — Alignment not part of result-submission validator (AR.3)

- **As a** PI
- **I want** to submit results without completing Pool Funding Alignment
- **So that** alignment is optional

**Acceptance criteria:**
- AC.1 — Result `SUBMITTED` transition succeeds even when alignment is empty.
- AC.2 — Alignment fields are flagged as `optional` in any validator schema.

### 6.3 US3 — Display ToC Indicators per selected SP (AC-1439)

> **Draft from PO** — see [`./jira-us/us3-toc-indicators-AC-1439.md`](./jira-us/us3-toc-indicators-AC-1439.md). Reuses the inferred AC.

#### R-BIL-020 — Display ToC indicators grouped by SP

**Acceptance criteria:**
- AC.1 — When at least one SP is selected (R-BIL-011), an "Indicators" panel renders.
- AC.2 — Rows grouped by SP/Accelerator (per **D-MK-4** from US0 mockup history).
- AC.3 — Each row shows: indicator code, name, indicator type (`output | outcome | 2030-outcome`), target description.
- AC.4 — Source: cached locally from US7 sync; no live PRMS / CLARISA call per render.

#### R-BIL-021 — Filter & search indicators

**Acceptance criteria:**
- AC.1 — Search by indicator code, name, or type within the panel.
- AC.2 — Filter by indicator type.
- AC.3 — Loading skeleton on initial fetch; retry control on error.

#### R-BIL-022 — Handle empty / stale catalog

**Acceptance criteria:**
- AC.1 — When SP is selected but ToC catalog is empty (US7 not yet run), an explicit empty state shows with a "ToC not available" copy + link to support.
- AC.2 — When an indicator has been removed from the SP catalog (US7 marked inactive), it is hidden by default; existing mappings (R-BIL-035) keep a stale-badge.

### 6.4 US4 — Map results to indicators with contribution rules (AC-1440)

> **Draft from PO** — depends on decision **D5** (whether to add `result_innovation_use`).

#### R-BIL-030 — Select indicators to map

**Acceptance criteria:**
- AC.1 — From the panel (R-BIL-020), user can mark one or more indicators as "this result contributes to."
- AC.2 — Multiple indicators across multiple SPs allowed.
- AC.3 — Selection is per-result, persisted, audited.

#### R-BIL-031 — Capture type-specific contribution payload

**Acceptance criteria:**
- AC.1 — Per indicator-type, render the matching contribution form:
  - **Capacity sharing**: men / women / non-binary / unknown counts, training term, delivery method.
  - **Knowledge product**: handle, KP type, peer-reviewed, ISI, accessibility, licence.
  - **Policy change**: policy type, policy stage, implementing organizations, optional amount.
  - **Innovation development**: typology, developers, readiness level.
  - **Innovation use** (gated on **D5**).
  - **Other output / outcome**: free-text narrative.
- AC.2 — Payload stored using the **existing ARI typed result tables** (`result_capacity_sharing`, `result_knowledge_product`, `result_policy_change`, `result_innovation_dev`); new entity added only if D5 = A.

#### R-BIL-032 — Per-type validation

**Acceptance criteria:**
- AC.1 — Save blocked when required type-specific fields are missing.
- AC.2 — Backend-compatible typos (`has_unkown_using`, `readinness_level_id`, etc.) preserved per **D12**.

#### R-BIL-033 — Audit on save / delete

**Acceptance criteria:**
- AC.1 — Every save / update / delete writes audit columns and a history row.
- AC.2 — History includes the diff payload (before / after) for forensic review.

#### R-BIL-034 — Read-only after PRMS sync

**Acceptance criteria:** Same as R-BIL-015.

#### R-BIL-035 — Stale flag on catalog drift

**Acceptance criteria:**
- AC.1 — When the underlying indicator is removed upstream (US7), the existing mapping is preserved with `is_stale = true`.
- AC.2 — Stale flag is visible in the STAR UI with a tooltip explaining why.
- AC.3 — Push to PRMS (R-BIL-040) skips stale mappings and logs them as warnings (final policy in **OQ-US5** carry-forward).

### 6.5 US5 — Push approved results into PRMS (AC-1441)

> **Draft from PO** — depends on decisions **D11**, **D12**, **D15**, and the new **OQ-US5-*** decisions.

#### R-BIL-040 — Trigger push on approval

**Acceptance criteria:**
- AC.1 — Result transition into status `BILATERAL_APPROVED` (the new row added per **D-status-1**, see §10) triggers push.
- AC.2 — Trigger mode (sync inside transaction vs async via job/queue) decided in design — default async.
- AC.3 — Push runs against the snapshot version (per **D10**) so the synced payload is immutable.

#### R-BIL-041 — Build PRMS-compatible payload

**Acceptance criteria:**
- AC.1 — Payload matches PRMS bilateral ingestion contract — common DTO + one type-specific block, validated against [`./prms-context/01-prms-backend-summary.md` §6–§9](./prms-context/01-prms-backend-summary.md).
- AC.2 — Mapping preserves CLARISA-facing ids and labels rather than ARI-internal join ids.
- AC.3 — Backend-compatible typos preserved (D12).

#### R-BIL-042 — Idempotency

**Acceptance criteria:**
- AC.1 — Each push includes an `idempotencyKey` deterministic from `result_code + version_id`.
- AC.2 — Retrying with the same key never duplicates in PRMS (verified contractually in E2E test).

#### R-BIL-043 — Logging & metrics

**Acceptance criteria:**
- AC.1 — Per attempt: row in `sync_process_log` with target endpoint, request id, response code, summary (no PII, no tokens).
- AC.2 — Metrics emitted: pushes/min, success rate, p95 latency, retry count.

#### R-BIL-044 — Failure handling + admin retry

**Acceptance criteria:**
- AC.1 — Transient failures (5xx, timeout) auto-retry with exponential backoff.
- AC.2 — Permanent failures (4xx) require human review.
- AC.3 — `CENTER_ADMIN`, `SYSTEM_ADMIN`, `TECHNICAL_SUPPORT` can manually retry from `/admin/sync` view.
- AC.4 — Failure event emits Socket.IO `result.bilateral.push.failed`.

#### R-BIL-045 — Successful sync locks alignment & mapping

**Acceptance criteria:**
- AC.1 — On success: set `is_synced_to_prms = true`, persist PRMS-returned `result_code`, lock the alignment section (R-BIL-015) and the indicator mappings (R-BIL-034).
- AC.2 — Successful event emits Socket.IO `result.bilateral.push.succeeded`.

### 6.6 US6 — Sync bilateral contributions with W3 Registry (AC-1593)

> **Draft from PO** — depends on decisions **OQ-B** (W3 Registry source location), **OQ-C** (cadence).

#### R-BIL-050 — Scheduled pull from W3 Registry

**Acceptance criteria:**
- AC.1 — Cron job runs at the configured cadence (default daily).
- AC.2 — Source defined by env / config — supports REST API or file drop (S3, SharePoint) once OQ-B is resolved.
- AC.3 — Credentials stored in `app_secrets` (no plaintext).

#### R-BIL-051 — Apply tag diffs

**Acceptance criteria:**
- AC.1 — Compute diff: added / removed / unchanged projects.
- AC.2 — Apply tag changes transactionally.
- AC.3 — On a tag-removed project, existing alignment + mappings are preserved and flagged stale (per R-BIL-035).
- AC.4 — Manual overrides honoured (OQ-D resolution) — admin overrides are not reverted by sync.

#### R-BIL-052 — Sync logging & alerting

**Acceptance criteria:**
- AC.1 — `sync_process_log` row per run with: source, started_at, finished_at, # added, # removed, # unchanged, errors.
- AC.2 — Failures emit an operational alert (specific channel out of scope here).
- AC.3 — OpenSearch reindex of projects triggered on success.

#### R-BIL-053 — Admin manual trigger + dry-run

**Acceptance criteria:**
- AC.1 — `SYSTEM_ADMIN` / `TECHNICAL_SUPPORT` / `CENTER_ADMIN` can trigger a sync from `/admin/sync/w3-registry`.
- AC.2 — `dry-run=true` returns a diff report without mutating data.

### 6.7 US7 — Sync the ToC of SPs (AC-1595)

> **Draft from PO** — depends on decision **D3** (ToC source).

#### R-BIL-060 — Scheduled pull of SP ToC

**Acceptance criteria:**
- AC.1 — Cron job runs at configured cadence (default daily).
- AC.2 — Source per **D3** (PRMS ToC / CLARISA Lever / OneCG ToC service).

#### R-BIL-061 — Upsert indicators with stable code preservation

**Acceptance criteria:**
- AC.1 — Upstream indicators upserted by stable code (rename only changes display name).
- AC.2 — Indicator type (`output | outcome | 2030-outcome`) preserved.
- AC.3 — OpenSearch reindex of indicators on success.

#### R-BIL-062 — Mark removed indicators inactive

**Acceptance criteria:**
- AC.1 — Indicators absent from latest upstream snapshot are set `is_active=false`.
- AC.2 — Existing mappings (R-BIL-035) keep working; new mappings to inactive indicators are rejected.

#### R-BIL-063 — Admin manual trigger + dry-run

**Acceptance criteria:**
- AC.1 — Manual trigger from `/admin/sync/sp-toc`.
- AC.2 — Dry-run produces diff report without mutating.

---

## 7. Non-functional requirements

### NFR-BIL-001 — Performance

- **Category:** performance.
- **Target:** Read endpoints (`GET /api/v1/results/:result-code/pool-funding-alignment`, `GET /api/v1/results/:result-code/pool-funding-alignment/indicators`) p95 ≤ 300 ms at 50 RPS. Write endpoints p95 ≤ 1 s. Push to PRMS p95 ≤ 5 s per result.
- **How verified:** load test using existing fixtures + Supertest e2e + production telemetry post-launch.

### NFR-BIL-002 — Security

- **Category:** security.
- **Target:** Every protected endpoint requires ROAR JWT (humans) or machine token (system-to-system); inbound machine-to-machine endpoints validated against `app_secrets` + `app_secret_host_list` (per **D1**). Outbound push (R-BIL-040) authenticates via the agreed mechanism (decision pending — see open question §10). No tokens, idempotency keys, or webhook URLs ever logged.
- **How verified:** code review + security review on the auth path + ESLint rules to prevent logging of `Authorization` / `auth` headers.

### NFR-BIL-003 — Reliability & atomicity

- **Category:** reliability.
- **Target:** Sync jobs are transactional (or apply a snapshot strategy) — a partial failure must not corrupt the project tag state or indicator catalog. The push job is idempotent end-to-end (R-BIL-042).
- **How verified:** integration tests on `TEST` datasource + chaos tests on the broker.

### NFR-BIL-004 — Observability

- **Category:** observability.
- **Target:** All sync runs write to `sync_process_log`. Every push attempt logged. Metrics exposed: project-tag changes / day, alignment edits / hour, indicator mappings / day, push success rate, push p95 latency, sync job duration. All structured logs go through `LoggerUtil`.
- **How verified:** dashboard built in CloudWatch with named metrics + alarms on success rate < 95%.

### NFR-BIL-005 — Accessibility (STAR side)

- **Category:** accessibility.
- **Target:** WCAG 2.1 AA on the new STAR sections (Pool Funding Alignment, Indicator panel, mapping forms, sync issues admin view). Keyboard navigation, visible focus rings, contrast ≥ 4.5:1, status badges with text label not color-only.
- **How verified:** automated axe-core checks + manual QA pass.

### NFR-BIL-006 — Contract compatibility with PRMS

- **Category:** compatibility.
- **Target:** Backend-compatible typos preserved (`has_unkown_using`, `readinness_level_id`, `non_pooled_projetct_budget_id`) per **D12**. Payload shape validated against [`./prms-context/01-prms-backend-summary.md`](./prms-context/01-prms-backend-summary.md).
- **How verified:** payload-shape tests against the contract.

### NFR-BIL-007 — Maintainability

- **Category:** maintainability.
- **Target:** New code follows ARI conventions documented in [`../../detailed-design/detailed-design.md`](../../detailed-design/detailed-design.md) and [`../../../server/researchindicators/src/CLAUDE.md`](../../../server/researchindicators/src/CLAUDE.md). Coverage threshold ≥ 60% per existing Jest config.
- **How verified:** `npm run lint`, `npm test`, `npm run test:cov`, `npm run test:e2e` all green in CI.

### NFR-BIL-008 — Auditability

- **Category:** compliance.
- **Target:** Every mutation persists audit columns; every status transition writes `result_status_transitions`; every Pool Funding Alignment change writes review history. PRMS push audit retained ≥ 3 years.
- **How verified:** schema review + retention policy on `sync_process_log`.

### NFR-BIL-009 — Idempotency

- **Category:** reliability.
- **Target:** All sync jobs + push are idempotent. Re-running with the same input does not duplicate state.
- **How verified:** idempotency e2e test in CI.

### NFR-BIL-010 — Localization

- **Category:** ux.
- **Target:** STAR-side strings localizable; result narrative fields support UTF-8 incl. Spanish characters; admin sync runs UI tolerant of mixed-language Jira titles (per **OQ-F**).
- **How verified:** snapshot tests with Spanish content + manual review.

### NFR-BIL-011 — Rate limiting

- **Category:** security / scalability.
- **Target:** Ingestion endpoint (if exposed) protected via `express-rate-limit` (per **D15**) — per-`client_id` policy of N req/min (N TBC).
- **How verified:** load test exercising rate cap.

---

## 8. Data requirements

Detailed schema lives in [`./design.md`](./design.md) §5. High-level deltas:

### 8.1 New columns

- `agresso_contract.is_pool_funding_contributor BOOLEAN NOT NULL DEFAULT false` (R-BIL-001).
- `result.is_synced_to_prms BOOLEAN NOT NULL DEFAULT false` (R-BIL-045).
- `result.prms_result_code BIGINT NULL` (R-BIL-045) — PRMS-side identifier returned on push.
- `indicator.is_active BOOLEAN NOT NULL DEFAULT true` (R-BIL-062) if not already present.

### 8.2 New entities

- `result_pool_funding_alignment` (working name) — joins `result_id` ↔ list of SP/Accelerator codes + `has_contribution` boolean + audit. Or, per **D2** option B, model as flagged rows on the existing `result_lever` / `result_initiative` join tables. **Final choice in design.md.**
- `result_pool_funding_indicator_mapping` (working name) — joins `result_id` ↔ `indicator_code` + `is_stale` boolean + contribution-payload references into the existing typed result tables (`result_capacity_sharing`, `result_knowledge_product`, etc.).
- `result_review_history` — actor / decision / justification / timestamp.
- `sync_process_log` rows of new types `W3_REGISTRY`, `SP_TOC`, `BILATERAL_PUSH`.

### 8.3 New `ReportingPlatform` row

- `code='BILATERAL'`, `name='Bilateral'`.

### 8.4 New `result_status` rows

- `BILATERAL_PENDING_REVIEW` (id TBC).
- `BILATERAL_APPROVED` (id TBC).
- `BILATERAL_REJECTED` (id TBC).

### 8.5 New `result_status_workflow` rules

- `DRAFT → BILATERAL_PENDING_REVIEW` (ingestion / submission of an aligned result).
- `BILATERAL_PENDING_REVIEW → BILATERAL_APPROVED` — reviewer roles: `MEL_REGIONAL_EXPERT`, `CENTER_ADMIN`, `SYSTEM_ADMIN`.
- `BILATERAL_PENDING_REVIEW → BILATERAL_REJECTED` — same roles.
- Optional re-review: `BILATERAL_APPROVED → BILATERAL_PENDING_REVIEW` and `BILATERAL_REJECTED → BILATERAL_PENDING_REVIEW` (per **D7**).

### 8.6 Migrations

- One migration per concern (do not merge schema changes). Filenames `<timestamp>-<camelCaseAction>.ts` under `server/researchindicators/src/db/migrations/`.

### 8.7 OpenSearch

- Decorate new searchable fields with `@OpenSearchProperty`. Reindex existing `Result` index after migration.

---

## 9. API surface delta

Detailed in [`./design.md`](./design.md) §6. Summary:

### 9.1 New endpoints (inbound machine + ROAR JWT)

| Verb | Path | Story | Auth |
| --- | --- | --- | --- |
| `PATCH` | `/api/v1/agresso/contracts/:contract-code/pool-funding-tag` | US1 | ROAR JWT + `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` |
| `GET` | `/api/v1/agresso/contracts?pool-funding-contributor=true|false` (extension) | US1 | ROAR JWT |
| `GET` | `/api/v1/results/:result-code/pool-funding-alignment` | US2/US3 | ROAR JWT |
| `PATCH` | `/api/v1/results/:result-code/pool-funding-alignment` | US2 | ROAR JWT + ResultOwnerGuard |
| `GET` | `/api/v1/results/:result-code/pool-funding-alignment/indicators` | US3 | ROAR JWT |
| `POST` | `/api/v1/results/:result-code/pool-funding-alignment/indicators/:indicator-code/contribution` | US4 | ROAR JWT + ResultOwnerGuard |
| `PATCH` | `/api/v1/results/:result-code/pool-funding-alignment/indicators/:indicator-code/contribution` | US4 | same |
| `DELETE` | `/api/v1/results/:result-code/pool-funding-alignment/indicators/:indicator-code/contribution` | US4 | same |
| `POST` | `/api/v1/admin/sync/w3-registry` | US6 | ROAR JWT + admin roles |
| `POST` | `/api/v1/admin/sync/sp-toc` | US7 | ROAR JWT + admin roles |
| `POST` | `/api/v1/admin/bilateral/push/:result-code/retry` | US5 admin retry | ROAR JWT + admin roles |
| `GET` | `/api/v1/admin/bilateral/push-failures` | US5 admin retry | ROAR JWT + admin roles |

### 9.2 Outbound

- `POST {PRMS_BILATERAL_INGESTION_URL}` per the PRMS contract (US5).

### 9.3 Real-time events (Socket.IO)

- `result.pool-funding-alignment.changed` (R-BIL-012).
- `result.bilateral.push.succeeded` (R-BIL-045).
- `result.bilateral.push.failed` (R-BIL-044).
- `sync.w3-registry.completed` / `sync.sp-toc.completed` (R-BIL-052 / R-BIL-061).

> Event taxonomy is currently undocumented at ARI level — captured here for completeness and folded into the design decision log per [`../../system-design/design.md` §13 OG-4](../../system-design/design.md).

---

## 10. Open decisions carry-forward

Decisions inherited from [`./prms-context/03-reuse-and-decisions.md`](./prms-context/03-reuse-and-decisions.md) and [`./jira-us/README.md`](./jira-us/README.md). These MUST be closed by the time `design.md` is approved.

| # | Decision | Default in requirements | Blocks |
| --- | --- | --- | --- |
| D1 | Inbound ingestion auth | Machine token (no JWT exclusion) | NFR-BIL-002, R-BIL-040 trigger source if external |
| D2 | Contributor model (alignment storage) | Choice between dedicated table vs flagged join rows | R-BIL-011, R-BIL-012, R-BIL-035 |
| D3 | ToC depth | Lever-only Phase 1 — sourced from CLARISA | R-BIL-020, R-BIL-021, R-BIL-060 |
| D4 | Bilateral projects model | AGRESSO contracts (R-BIL-001) | R-BIL-001 |
| D5 | `result_innovation_use` entity | Defer Phase 1 (option C) unless type 2 is launch-critical | R-BIL-031 |
| D6 | Reviewer role | `MEL_REGIONAL_EXPERT` + `CENTER_ADMIN` for Phase 1 | R-BIL-013, R-BIL-040 |
| D7 | Re-review allowed | Yes (re-entry from APPROVED/REJECTED → PENDING_REVIEW with audit) | R-BIL-014, status workflow §8.5 |
| D8 | Missing CLARISA catalogs (policy, innovation) | Add to CLARISA integration | R-BIL-031 |
| D9 | KP metadata source | CGSpace/MQAP integration required if type 6 in Phase 1 | R-BIL-031 |
| D10 | Snapshot on approval | Yes (matches ARI versioning) | R-BIL-014, R-BIL-040 |
| D11 | Sync wrapper shape | Dual: ARI envelope + raw PRMS wrapper behind `?raw=true` | R-BIL-040 export side (deferred) |
| D12 | Backend-compatible typos | Preserve | R-BIL-032, R-BIL-041 |
| D13 | Innovation Package (type 10) | Defer | R-BIL-031 |
| D14 | Soft-delete on edits | Yes (`is_active=false`) | R-BIL-033 |
| D15 | Rate limiting on ingestion | per `client_id` | NFR-BIL-011 |
| D16 | Real-time event taxonomy | Emit Socket.IO events | §9.3 |
| **NEW D-status-1** | Statuses + workflow rows | Add `BILATERAL_PENDING_REVIEW`, `BILATERAL_APPROVED`, `BILATERAL_REJECTED` | §8.4, §8.5 |
| **NEW D-push-auth** | Outbound auth to PRMS (US5) | TBD with PRMS team | R-BIL-040, NFR-BIL-002 |
| **NEW D-push-trigger** | Sync inside Approve txn vs async job | Async via cron / queue (recommend) | R-BIL-040 |
| **NEW D-source-w3** | W3 Registry source (API / file / SharePoint) | TBD (OQ-B) | R-BIL-050 |
| **NEW D-cadence** | Sync cadence | Daily | R-BIL-050, R-BIL-060 |

---

## 11. Assumptions, dependencies, risks

### 11.1 Assumptions

- ROAR remains the IDP for human users.
- AGRESSO remains the source of truth for bilateral project records (D4 = A).
- CLARISA remains the source for Lever / SP / Accelerator / indicator catalogs (D3 = B for Phase 1).
- PRMS remains the downstream destination for approved bilateral results (US5).
- The W3 Registry exposes a stable identifier per bilateral project that maps to an AGRESSO contract code (resolution of OQ-US6-4).

### 11.2 Dependencies

| Dependency | Owner | Risk |
| --- | --- | --- |
| AGRESSO `agresso_contract` schema | Finance / DevOps | Low — already wired via `domain/tools/agresso/` |
| CLARISA Lever + indicator data | CLARISA team | Medium — D3 still open |
| PRMS bilateral ingestion endpoint reachability + auth | PRMS team | High — D-push-auth open |
| W3 Registry source contract | System Office | High — OQ-B open |
| STAR frontend bandwidth | STAR team | Medium |

### 11.3 Risks

Inherited from [`./prms-context/03-reuse-and-decisions.md` §4](./prms-context/03-reuse-and-decisions.md) plus:

- **R-1.** US5 cannot start until PRMS-side auth + endpoint are confirmed.
- **R-2.** US7 cannot start until D3 closes.
- **R-3.** US3 / US4 UX may be reworked if the team chooses option A (full PRMS ToC port) under D3 in Phase 2.
- **R-4.** Re-review (D7 = B) introduces a loop in the workflow that can be exploited if not gated. Mitigation: rate-limit re-review per result.
- **R-5.** Snapshotting on every Pool Funding Alignment change (D10 + R-BIL-014) may proliferate snapshots. Mitigation: only snapshot on status transitions, not on alignment edits.

---

## 12. Open questions

Story-local OQs live inside each `./jira-us/usN-*.md`. Module-level OQs:

- **OQ-A.** Reviewer persona (Center Admin? MEL? PI delegate? new role?). [`./jira-us/README.md` §Open questions](./jira-us/README.md).
- **OQ-B.** W3 Registry source location.
- **OQ-C.** Sync cadence.
- **OQ-D.** Conflict policy on sync vs manual override.
- **OQ-E.** Versioning policy on alignment edits.
- **OQ-F.** Spanish-language Jira titles (US6, US7).
- **OQ-G.** Real-time UX necessity (Socket.IO vs poll).
- **OQ-US5-1.** Outbound auth to PRMS.
- **OQ-US5-2.** Trigger mechanism (sync vs async).
- **OQ-US5-3.** PRMS error model (per-row failures).
- **OQ-US5-4.** Idempotency key derivation.
- **OQ-US5-6.** Re-push policy.
- **OQ-US7-1.** Source of ToC (closes D3).

> The design phase MUST either decide each OQ or carry it forward as a documented design decision with a rationale.

---

## 13. Requirement ID index

| ID | Title | Story | NFR? |
| --- | --- | --- | --- |
| R-BIL-001 | Persist Pool Funding Contributor tag | US1 | — |
| R-BIL-002 | Surface tag across STAR project surfaces | US1 | — |
| R-BIL-003 | Filter & search projects by tag | US1 | — |
| R-BIL-010 | Conditional render alignment section | US2 | — |
| R-BIL-011 | Capture Yes/No + SP selection | US2 | — |
| R-BIL-012 | Persistence + audit | US2 | — |
| R-BIL-013 | Authorization | US2 | — |
| R-BIL-014 | Edit regardless of status | US2 | — |
| R-BIL-015 | Read-only after sync | US2 | — |
| R-BIL-016 | Not part of submission validator | US2 | — |
| R-BIL-020 | Display indicators grouped by SP | US3 | — |
| R-BIL-021 | Filter & search indicators | US3 | — |
| R-BIL-022 | Empty / stale catalog handling | US3 | — |
| R-BIL-030 | Select indicators to map | US4 | — |
| R-BIL-031 | Type-specific contribution payload | US4 | — |
| R-BIL-032 | Per-type validation | US4 | — |
| R-BIL-033 | Audit on save / delete | US4 | — |
| R-BIL-034 | Read-only after sync | US4 | — |
| R-BIL-035 | Stale flag on catalog drift | US4 | — |
| R-BIL-040 | Trigger push on approval | US5 | — |
| R-BIL-041 | Build PRMS-compatible payload | US5 | — |
| R-BIL-042 | Idempotency | US5 | — |
| R-BIL-043 | Logging & metrics | US5 | — |
| R-BIL-044 | Failure handling + admin retry | US5 | — |
| R-BIL-045 | Lock alignment & mapping on success | US5 | — |
| R-BIL-050 | Scheduled pull from W3 Registry | US6 | — |
| R-BIL-051 | Apply tag diffs | US6 | — |
| R-BIL-052 | Sync logging & alerting | US6 | — |
| R-BIL-053 | Admin manual trigger + dry-run | US6 | — |
| R-BIL-060 | Scheduled pull of SP ToC | US7 | — |
| R-BIL-061 | Upsert with stable code preservation | US7 | — |
| R-BIL-062 | Mark removed indicators inactive | US7 | — |
| R-BIL-063 | Admin manual trigger + dry-run | US7 | — |
| NFR-BIL-001 | Performance | — | yes |
| NFR-BIL-002 | Security | — | yes |
| NFR-BIL-003 | Reliability & atomicity | — | yes |
| NFR-BIL-004 | Observability | — | yes |
| NFR-BIL-005 | Accessibility | — | yes |
| NFR-BIL-006 | PRMS contract compatibility | — | yes |
| NFR-BIL-007 | Maintainability | — | yes |
| NFR-BIL-008 | Auditability | — | yes |
| NFR-BIL-009 | Idempotency | — | yes |
| NFR-BIL-010 | Localization | — | yes |
| NFR-BIL-011 | Rate limiting | — | yes |

**Counts:** 33 functional requirements, 11 non-functional requirements.

---

## 14. Sign-off

```
[ ] Engineering lead — <name>
[ ] Product Owner / BA — <name>
[ ] Security review (auth + secrets) — <name>
[ ] DevOps (CI/CD, infra, cron) — <name>
[ ] STAR frontend lead — <name>
[ ] PRMS integration owner — <name>
```
