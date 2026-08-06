# Requirements — Results / CapDev Bulk Upload Notification

- **Module:** results
- **Spec id:** 2026-08-capdev-bulk-upload-notification
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked PRD section:** `docs/prd.md` — Results lifecycle, Reporting & traceability
- **Linked tickets:** AC-1607 — *Send bulk upload completion email with CapDev metrics*
- **Last updated:** 2026-08-06
- **Depth:** Full (DB migration + outbound email to external humans + AI-service contract change)

---

## 1. Context

After `POST /api/v1/results/ai/formalize/bulk` finishes, ARI persists the batch (`bulk_upload_processes` + `bulk_upload_results`) and returns a payload to the caller. **Nobody outside that HTTP call learns the upload happened.** Project Leaders, Research Assistants and reporting contacts have no signal that their Capacity Sharing for Development trainings are now recorded in STAR, and no aggregate view of what landed.

This spec adds an automatic, per-project summary email at the end of a successful CapDev bulk upload, and persists the same aggregates on the process row so dashboards can consume them later.

**Not changing:** the bulk upload's own success/failure semantics, the shape of the `ServerResponseDto` returned by `ai/formalize/bulk`, individual result creation logic (`formalizeResult`), the existing `result-status-workflow` email flows, and any client (`client/research-indicators`) code.

---

## 2. Glossary

| Term | Meaning in this spec |
| --- | --- |
| **Bulk process** | One row in `bulk_upload_processes`, created per call to `createResultFromAiBulk`. |
| **Batch** | The set of `bulk_upload_results` rows belonging to one bulk process. |
| **Created result** | A batch row with `result_id IS NOT NULL` and no `error_message` — the record actually exists in STAR. |
| **CapDev result** | A created result whose `indicator_id = IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT`. |
| **Project group** | All CapDev results in one batch sharing the same primary contract (`result_contracts.is_primary = true` → `agresso_contracts.agreement_id`). One email per project group. |
| **PI** | Principal Investigator = Project Leader. `agresso_contracts.projectLeadId` (a carnet), resolved to a person via `alliance_user_staff.carnet`. |
| **RA / PA** | Research Assistant / Program Assistant on the contract (`researchAssistantId`, `programAssistantId`), resolved the same way. |
| **File contacts** | Reporting leaders and main contact persons declared **inside the CapDev source file**, delivered to ARI through the AI bulk payload. Do not exist in Agresso. |
| **Token owner** | The identity that executed the bulk upload — the JWT user, or for a machine token the `app_secrets.responsible_user_id`. Named in the email as the support contact. |

---

## 3. System Context & Scope

```
AI mining service ──POST /api/v1/results/ai/formalize/bulk──▶ ResultsService.createResultFromAiBulk
                                                                      │
                                                     persists batch ──┤
                                                                      ▼
                                              CapDevBulkNotificationService  (NEW)
                                                   │
        ┌──────────────────────┬───────────────────┼────────────────────┬───────────────────────┐
        ▼                      ▼                   ▼                    ▼                       ▼
  agresso_contracts +    result_capacity_sharing  templates      bulk_upload_processes    MessageMicroservice
  alliance_user_staff    + result_countries       (Handlebars)   (metrics columns, NEW)   → RabbitMQ → mailer
  (PI / RA / PA emails)  (metrics)
```

**In scope:** server only (`server/researchindicators`). Recipient resolution, metric computation, template rendering, dispatch, metric persistence, and the AI payload contract extension that carries file contacts.

**Out of scope:** any client change; a UI to preview/resend the email; per-recipient delivery tracking (the mailer microservice is fire-and-forget today); non-CapDev indicators; a dashboard consuming the persisted metrics (this spec only *produces* the data).

---

## 4. Stakeholders / Personas

| Persona | Interest |
| --- | --- |
| Project Leader (PI) | Primary recipient. Learns their trainings are recorded, sees scope at a glance. |
| Research / Program Assistant | CC. Operational follow-up on the project's reporting. |
| Reporting leader / contact person | CC. Declared in the CapDev file; needs confirmation the submission landed. |
| SPRM team (`alliance-sprm@groups.cgiar.org`) | CC. Institutional oversight of reported CapDev activity. |
| Center Admin / MEL Regional Expert (token owner) | Executes the upload; named in the email as the person to contact. |
| ARI maintainer | Needs the notification to never break a bulk upload, and to be switchable off without a deploy. |

---

## 5. Functional requirements

### R-CBU-001 — Notification fires after a successful CapDev bulk upload

- **As a** Project Leader
- **I want** an email as soon as my training results are recorded
- **So that** I know the submission landed without asking anyone

**Details:**
- Trigger: end of `ResultsService.createResultFromAiBulk`, **after** `AiReportsService.create` has persisted the batch and **before** the HTTP response is returned.
- Only **created CapDev results** feed the notification. Rows with `error_message`, rows with `result_id IS NULL`, and rows for any other indicator are excluded from both recipients and metrics.
- If the batch contains zero created CapDev results, **no email is sent at all** and the process completes normally.

**Outputs:** unchanged `ServerResponseDto` from `POST /api/v1/results/ai/formalize/bulk` (`201`, `data = { results_errors, results_created }`).

**Acceptance criteria:**
- [ ] AC.1 — Given a batch with ≥1 created CapDev result, exactly one `MessageMicroservice.sendEmail` call occurs per project group.
- [ ] AC.2 — Given a batch where every row carries an `error_message`, `sendEmail` is never called and the endpoint still answers `201`.
- [ ] AC.3 — Given a batch of created results none of which are CapDev, `sendEmail` is never called.
- [ ] AC.4 — The `data` payload of the response is byte-identical to today's for the same input.

**Scenario: Happy path**
- GIVEN a bulk upload of 12 CapDev results all belonging to contract `ABC-123`
- WHEN the bulk process finishes
- THEN one email is dispatched with subject `[ABC-123] Training Results Successfully Recorded in the Alliance Institutional Reporting System`
- AND the body reports 12 trainings
- BUT it must NOT include any result that failed to be created
- AND IT MUST leave the endpoint's HTTP status and `data` payload unchanged

---

### R-CBU-002 — One email per project group

- **As a** Project Leader
- **I want** an email scoped to my project only
- **So that** I am not copied on other projects' training data

**Details:**
- Group created CapDev results by the `agreement_id` of their **primary** contract (`result_contracts.is_primary = true AND is_active = true`).
- One email per group. The subject's `[Project ID]` token is that `agreement_id`.
- A created CapDev result with **no** primary contract is excluded from every group and counted in an "unattributed" log line — it is never folded into another project's email.

**Acceptance criteria:**
- [ ] AC.1 — A batch spanning 3 distinct contracts produces exactly 3 `sendEmail` calls.
- [ ] AC.2 — Group A's email body reports only group A's counts; no metric is computed across the whole batch.
- [ ] AC.3 — A result without a primary contract appears in no email and produces one warning log naming its `result_id`.

**Scenario: Cross-project isolation**
- GIVEN a batch with 5 results on contract `A` and 2 on contract `B`
- WHEN notifications are dispatched
- THEN the `A` email reports 5 trainings and the `B` email reports 2
- BUT the recipients of `A` must NOT appear in the `To` or `CC` of `B` unless they are independently a contact of `B`
- AND IT MUST use each group's own contract for the subject token

---

### R-CBU-003 — Principal Investigator resolved from Agresso as the sole `To`

- **As a** reporting stakeholder
- **I want** the email addressed to the project's PI
- **So that** ownership of the notification is unambiguous

**Details:**
- Resolution: `agresso_contracts.projectLeadId` → `alliance_user_staff.carnet` → `email`, `first_name`, `last_name`. This is the join already used at `result-status-workflow.repository.ts:94`.
- Salutation name: `"{first_name} {last_name}"` from `alliance_user_staff`, cleaned with the existing `cleanName` util. Fall back to `agresso_contracts.project_lead_description` when the staff row is missing; fall back to `"Colleagues"` when both are empty.
- `To` contains **only** the PI address.

**Errors:** no exception surfaces to the caller — see R-CBU-010.

**Acceptance criteria:**
- [ ] AC.1 — `To` equals exactly `[pi.email]` for a contract with a resolvable project lead.
- [ ] AC.2 — Given `projectLeadId` matches no `alliance_user_staff` row, no email is sent for that group and a warning naming the `agreement_id` is logged.
- [ ] AC.3 — Given the staff row exists but `email` is null/blank, behavior is identical to AC.2.
- [ ] AC.4 — The salutation renders the cleaned staff name, not the raw `project_lead_description`, when both are available.

**Scenario: Unresolvable PI**
- GIVEN contract `XYZ-9` whose `projectLeadId` has no matching carnet in `alliance_user_staff`
- WHEN the notification for that group is built
- THEN no email is dispatched for the group
- AND a warning is logged with the `agreement_id` and bulk process id
- BUT it must NOT promote a CC recipient into the `To` slot
- AND IT MUST NOT abort the notifications of the other project groups in the same batch

---

### R-CBU-004 — CC list assembled, deduplicated and sanitised

- **As a** collaborator on the project
- **I want** to be copied on the confirmation
- **So that** the whole reporting team shares the same view

**Details — CC sources, in this order:**

| # | Source | Origin |
| --- | --- | --- |
| 1 | Research Assistant | `agresso_contracts.researchAssistantId` → `alliance_user_staff` |
| 2 | Program Assistant | `agresso_contracts.programAssistantId` → `alliance_user_staff` |
| 3 | Reporting leaders | File contacts from the AI payload (R-CBU-005) |
| 4 | Main contact persons | File contacts from the AI payload (R-CBU-005) |
| 5 | SPRM group | `AppConfig.SPRM_EMAIL_ARRAY` (existing) |
| 6 | Additional configured stakeholders | New DB-backed key `EMAIL.CAPDEV_BULK_UPLOAD.CC_EMAIL` via `EnvAppConfigUtil` |

**Sanitisation rules (all mandatory):**
- Drop empty, null and whitespace-only entries.
- Drop any entry failing a basic RFC-shaped address check.
- Compare case-insensitively and trim before deduplicating.
- Drop any address already present in `To`.
- Deduplicate within CC.

**Acceptance criteria:**
- [ ] AC.1 — A PI who is also the contract's RA appears only in `To`, never in `CC`.
- [ ] AC.2 — The same address supplied by two different sources appears once in `CC`.
- [ ] AC.3 — `"PI@Example.org"` in `To` suppresses `"pi@example.org"` from `CC`.
- [ ] AC.4 — A malformed entry (`"n/a"`, `"—"`, `"John Doe"`) is dropped and logged at debug level; the email is still sent.
- [ ] AC.5 — With every optional source absent, `CC` still contains the SPRM address(es).
- [ ] AC.6 — When `EMAIL.CAPDEV_BULK_UPLOAD.CC_EMAIL` is absent from `app_config`, the email is still sent with the remaining CC sources.

**Scenario: Overlapping recipients**
- GIVEN a contract where the PI is also listed as a reporting leader in the CapDev file
- WHEN the recipient list is built
- THEN the address appears exactly once, in `To`
- BUT the CC list must NOT contain any casing variant of it
- AND IT MUST still contain the SPRM address

---

### R-CBU-005 — AI bulk payload carries file-sourced contacts

- **As an** ARI maintainer
- **I want** reporting leaders and contact persons delivered with the batch
- **So that** recipients that exist only in the CapDev file can be copied

**Details:**
- Extend `ProcessMedatada` (`src/domain/entities/results/dto/result-ai.dto.ts`) with an **optional** `contacts` array. Each entry: `email` (required, string), `name` (optional, string), `role` (optional enum: `reporting_leader | contact_person | other`), `contract_code` (optional string).
- Scoping: an entry with `contract_code` is CC'd only on that project group's email; an entry without one is CC'd on **every** group of the batch.
- **Backward compatible.** The field is optional; omitting it must not change validation outcomes for existing callers. `forbidNonWhitelisted: true` is already active on this endpoint, so an unknown property today is a `400` — this requirement is what makes the AI service able to send it at all.
- The endpoint's `@ApiBody({ type: RootAi })` Swagger definition must reflect the new field.

**Permissions:** unchanged — `TECHNICAL_SUPPORT`, `CENTER_ADMIN`, `MEL_REGIONAL_EXPERT`.

**Acceptance criteria:**
- [ ] AC.1 — A payload **without** `metadata.contacts` is accepted and produces the same `201` as before this change.
- [ ] AC.2 — A payload with `contacts: [{email, name, role: "reporting_leader"}]` is accepted and that address appears in `CC`.
- [ ] AC.3 — A contact with `contract_code: "A"` appears only in group `A`'s CC.
- [ ] AC.4 — A contact entry with a non-string or missing `email` yields `400` with the standard `GlobalExceptions` envelope; the batch is not persisted.
- [ ] AC.5 — Swagger at `/api` documents `metadata.contacts`.

**Scenario: Legacy caller**
- GIVEN the AI mining service still posting the pre-change payload shape
- WHEN the bulk upload runs
- THEN results are created and the notification is sent with the Agresso + SPRM + configured CC sources only
- BUT it must NOT return `400` for the absent `contacts` field
- AND IT MUST NOT block the email on the missing contacts

---

### R-CBU-006 — CapDev metrics computed per project group

- **As a** Project Leader
- **I want** the headline numbers in the email
- **So that** I can sanity-check what was reported without opening STAR

**Details — metric definitions (all scoped to the group's created CapDev results):**

| Metric | Definition | Empty/edge behavior |
| --- | --- | --- |
| Trainings | `COUNT(*)` of the group's created CapDev results | never zero (group would not exist) |
| Countries | `DISTINCT` CLARISA country names via `result_countries.isoAlpha2` | renders `"multiple countries"` when the set is empty |
| Start date | `MIN(result_capacity_sharing.start_date)`, formatted `Month YYYY` | see below |
| End date | `MAX(result_capacity_sharing.end_date)`, formatted `Month YYYY` | see below |
| Participants | `SUM(session_participants_total)`; when a row's total is null, use `male + female + non_binary` for that row | `0` when every source value is null |
| Women % | `round(SUM(female) / SUM(participants) * 100)` | **omitted from the sentence entirely** when the participant total is `0` |

- When **either** date bound is missing, the date clause is dropped from the sentence rather than rendering `null`, `Invalid Date`, or a partial range.
- Country names come from CLARISA (`clarisa_countries`), joined on `isoAlpha2` — never free text.
- Numbers are rendered with thousands separators in `en-US`.

**Acceptance criteria:**
- [ ] AC.1 — 12 CapDev results in the group renders "12 trainings".
- [ ] AC.2 — Countries render as CLARISA names, comma-separated, alphabetically ordered, deduplicated.
- [ ] AC.3 — Given rows with `session_participants_total` null but male/female present, the total sums the components.
- [ ] AC.4 — Given a total participant count of 0, the rendered body contains no `NaN`, no `Infinity`, and no percentage clause.
- [ ] AC.5 — Given every `start_date` null, the body contains no date range clause and no literal `null`/`Invalid Date`.
- [ ] AC.6 — Metrics count only the group's results, never the batch's.

**Scenario: Degenerate metrics**
- GIVEN a group of 3 CapDev results with no participant counts, no dates and no countries
- WHEN the email is rendered
- THEN the body reports 3 trainings and omits the participants, percentage, date-range and country clauses
- BUT it must NOT render `NaN`, `Infinity`, `null`, `undefined`, `Invalid Date`, or an unsubstituted `{{token}}`
- AND IT MUST still render the salutation, the STAR link and the token-owner contact line

---

### R-CBU-007 — Email rendered from a DB-stored Handlebars template

- **As an** ARI maintainer
- **I want** the copy in the `templates` table like every other ARI email
- **So that** wording changes do not require a code deploy

**Details:**
- New `TemplateEnum.CAPDEV_BULK_UPLOAD_SUMMARY = 'capdev-bulk-upload-summary'`, seeded by migration, rendered through the existing `TemplateService._getTemplate`.
- Subject: `[{agreement_id}] Training Results Successfully Recorded in the Alliance Institutional Reporting System`, prefixed with the environment marker the platform already applies to non-production mail.
- Body content per the approved copy: salutation to the PI, the confirmation sentence, the metrics sentence, the STAR CapDev panel link, the delegates/contact sentence naming the **token owner**, and a sign-off.
- **STAR link:** `{AppConfig.ARI_CLIENT_HOST}/results-center` with a query string preselecting the CapDev indicator tab.
- If `_getTemplate` returns empty/undefined for the key, **no email is sent** for that group and an error is logged — a blank email is never dispatched.

**Acceptance criteria:**
- [ ] AC.1 — The rendered body contains no `{{` sequence.
- [ ] AC.2 — The subject begins with `[<agreement_id>]`.
- [ ] AC.3 — The STAR link resolves against `ARI_CLIENT_HOST` for the running environment, never a hard-coded host.
- [ ] AC.4 — The token owner's display name and email appear in the contact sentence.
- [ ] AC.5 — Given the template row is missing or inactive, no `sendEmail` call occurs and one error is logged.
- [ ] AC.6 — The migration is additive and its `down()` removes only the row it inserted.

---

### R-CBU-008 — Aggregated metrics persisted on the bulk process

- **As a** reporting analyst
- **I want** the same aggregates stored alongside the process record
- **So that** dashboards can query bulk-upload activity without re-deriving it

**Details:**
- Extend `bulk_upload_processes` with additive, nullable columns: `total_results`, `total_capdev_results`, `total_participants`, `total_female_participants`, `activity_start_date`, `activity_end_date`, `countries` (JSON, ISO alpha-2 list), `notification_sent_at`, `notification_status`.
- Written after the batch is persisted, from the **same computed values** the email uses — the email and the stored metrics must never disagree.
- `notification_status` ∈ `SENT | SKIPPED | FAILED | PARTIAL`. `PARTIAL` when some groups dispatched and others did not.
- Migration is append-only and additive; no existing column is altered or dropped.

**Acceptance criteria:**
- [ ] AC.1 — After a successful bulk upload, the process row's `total_capdev_results` equals the sum of the per-group training counts.
- [ ] AC.2 — `notification_status = 'SKIPPED'` when the batch has no created CapDev result.
- [ ] AC.3 — `notification_status = 'PARTIAL'` when one of two groups fails to dispatch.
- [ ] AC.4 — `notification_sent_at` is null whenever `notification_status = 'SKIPPED'`.
- [ ] AC.5 — Existing rows are unaffected by the migration (all new columns nullable, no default backfill).
- [ ] AC.6 — Metrics stored are byte-consistent with the values rendered into the email for the same run.

---

### R-CBU-009 — Notification is switchable off without a deploy

- **As an** ARI maintainer
- **I want** a kill switch
- **So that** a copy or recipient problem can be stopped in minutes

**Details:**
- New DB-backed flag `EMAIL.CAPDEV_BULK_UPLOAD.ENABLED` read through `EnvAppConfigUtil` on every bulk run (no caching that outlives the request).
- Flag off → no email dispatched, `notification_status = 'SKIPPED'`, metrics still computed and persisted.
- **Absent or unreadable config resolves to disabled.** A missing flag must never mean "mail everyone".

**Acceptance criteria:**
- [ ] AC.1 — Flag `false` → zero `sendEmail` calls, metrics still written, `notification_status = 'SKIPPED'`.
- [ ] AC.2 — Flag row absent → identical to AC.1, plus one warning log.
- [ ] AC.3 — Flag flipped between two bulk runs takes effect on the second without a restart.

---

### R-CBU-010 — Notification failures never fail the bulk upload

- **As a** Center Admin running an upload
- **I want** the upload to succeed even if mail does not
- **So that** a mailer outage never costs me a re-upload of 200 records

**Details:**
- The entire notification stage is wrapped so that **no** thrown error, rejected promise or timeout propagates into `createResultFromAiBulk`'s return path.
- Per-group isolation: one group's failure does not prevent the remaining groups from dispatching.
- Every failure logs via `LoggerUtil` with the bulk process id, the `agreement_id`, and the failure cause.
- The notification stage runs **outside** any transaction that governs result creation — a mail failure must not roll back persisted results.

**Acceptance criteria:**
- [ ] AC.1 — `MessageMicroservice.sendEmail` throwing yields a `201` response with the unchanged `data` payload.
- [ ] AC.2 — Group 1 throwing still dispatches group 2.
- [ ] AC.3 — A repository/query error during metric computation for one group is caught, logged, and does not prevent the other groups.
- [ ] AC.4 — Results created before a notification failure remain persisted and readable.
- [ ] AC.5 — Every caught failure produces exactly one error log carrying the bulk process id.

**Scenario: Broker down**
- GIVEN the RabbitMQ message queue is unreachable
- WHEN a bulk upload of 40 CapDev results completes
- THEN the endpoint answers `201` with all 40 results in `results_created`
- AND `notification_status` is `FAILED`
- BUT it must NOT roll back, delete or mark any created result
- AND IT MUST log the failure with the bulk process id

---

### R-CBU-011 — Notification activity is observable

- **As an** ARI maintainer
- **I want** to reconstruct who was emailed for a given upload
- **So that** a "why did I get this" question is answerable from logs and data

**Details:**
- One info log per dispatched group: bulk process id, `agreement_id`, recipient **counts** (`to`, `cc`), training count.
- Log **counts, not addresses**, at info level. Full address lists only at debug level.
- `notification_sent_at` / `notification_status` on the process row are the durable record (R-CBU-008).

**Acceptance criteria:**
- [ ] AC.1 — A 3-group batch produces 3 info logs each naming the bulk process id and its `agreement_id`.
- [ ] AC.2 — Info-level output contains no email address.
- [ ] AC.3 — A skipped group (unresolvable PI, template missing, flag off) is distinguishable in the logs from a dispatched one.

---

## 6. Non-functional requirements

### NFR-CBU-001 — Bulk upload latency
- **Category:** performance
- **Target:** the notification stage adds ≤ 2 s wall-clock for a batch of 100 results across ≤ 10 project groups. Metric queries are grouped — no per-result query fan-out.
- **How verified:** unit test asserting query count is O(groups), not O(results); timed integration run against the dev DB.

### NFR-CBU-002 — No duplicate notification per process
- **Category:** reliability
- **Target:** a given `bulk_upload_processes.id` never produces a second email set. A retried HTTP call creates a **new** process row and is treated as a new upload — this is accepted, not deduplicated across processes.
- **How verified:** unit test; documented explicitly as a limitation in `design.md`.

### NFR-CBU-003 — Recipient data minimisation
- **Category:** security
- **Target:** no email address at info-level logs; no participant-level personal data (`trainee_name`) in the email body — aggregates only.
- **How verified:** code review + a unit test asserting the rendered body excludes `trainee_name` values.

### NFR-CBU-004 — Test coverage
- **Category:** dx
- **Target:** every new service, repository and util has a sibling `*.spec.ts`; global Jest threshold of 60% is not regressed.
- **How verified:** `npm test -- --silent`, `npm run test:cov`.

### NFR-CBU-005 — Migration safety
- **Category:** reliability
- **Target:** all migrations additive (nullable columns, inserted rows). No `ALTER` narrowing a type, no data backfill, `down()` strictly reverses the `up()`.
- **How verified:** code review of the migration + `npm run migration:run` against dev.

---

## 7. Defect classes this spec can produce → gate mapping

Per the AKILI gate rule: each class below is mapped to the command that catches it, or explicitly recorded as unautomatable.

| # | Defect class | Caught by |
| --- | --- | --- |
| D1 | Wrong recipient set (missing PI, leaked cross-project CC, duplicate address) | `npm test -- --silent` — unit tests on the recipient-resolution service with fixture contracts (AC R-CBU-003.*, R-CBU-004.*) |
| D2 | Wrong metric arithmetic (bad sum, `NaN`, wrong grouping) | `npm test -- --silent` — unit tests on the metrics service, including the degenerate-input scenario (AC R-CBU-006.*) |
| D3 | Bulk upload regression (notification throws into the caller) | `npm test -- --silent` + `npm run test:e2e` — throwing-mock tests asserting `201` and unchanged `data` (AC R-CBU-010.*) |
| D4 | Payload contract break (legacy caller now `400`s) | `npm run test:e2e` — supertest posting the pre-change payload shape (AC R-CBU-005.1) |
| D5 | Migration defect (non-additive, broken `down()`) | `npm run migration:run` + `migration:revert` on dev, plus code review |
| D6 | Unsubstituted template token / broken link in the rendered HTML | `npm test -- --silent` — assertion that the rendered string contains no `{{` and that the link starts with `ARI_CLIENT_HOST` (AC R-CBU-007.1, .3) |
| **D7** | **Email copy, tone, and visual rendering across mail clients** | ⚠️ **No automated gate.** No test can judge whether the copy reads correctly to a Project Leader, or whether the HTML renders acceptably in Outlook. **Substitute:** a mandatory human check at the HITL pause — a real send to an internal test address, reviewed by a human before the flag is enabled in production (see the rollout in `design.md`). |
| **D8** | **Delivery to a wrong real person via bad Agresso data** | ⚠️ **Partially unautomatable.** Code tests can prove the join is correct; they cannot prove `agresso_contracts.projectLeadId` points at the right human. **Substitute:** the dry-run rollout step — enable with recipients redirected to an internal address, inspect the resolved recipient lists against a sample of live contracts, then go live. **Accepted residual risk:** stale Agresso staff data mails a departed employee. |

---

## 8. Data requirements

| Entity / file | Change |
| --- | --- |
| `src/domain/entities/ai-reports/entities/bulk-upload-processes.entity.ts` | Add nullable columns per R-CBU-008. |
| `src/domain/shared/auxiliar/template/enum/template.enum.ts` | Add `CAPDEV_BULK_UPLOAD_SUMMARY`. |
| `src/domain/entities/app-config/enum/app-config-catergory.enum.ts` | Add `AppConfigSubcategory.CAPDEV_BULK_UPLOAD`; add `AppConfigField.CC_EMAIL`, `AppConfigField.ENABLED`. |
| `src/domain/shared/utils/env-app-config.util.ts` | Add accessors for the two new keys. |
| `src/db/migrations/` | (a) additive columns on `bulk_upload_processes`; (b) insert the template row; (c) insert the two `app_config` rows. Filename pattern `<timestamp>-<camelCaseAction>.ts`. |

No new indexes required — all reads are keyed on existing primary/foreign keys. No new OpenSearch fields (`bulk_upload_processes` is not indexed).

---

## 9. API surface delta

| Endpoint | Change |
| --- | --- |
| `POST /api/v1/results/ai/formalize/bulk` | **Request only.** `metadata.contacts` added as an optional array (R-CBU-005). Roles unchanged (`TECHNICAL_SUPPORT`, `CENTER_ADMIN`, `MEL_REGIONAL_EXPERT`). Response envelope and `data` shape unchanged. Stays on `/v1` — the change is additive and backward compatible, so no `/v2` is warranted. Swagger `@ApiBody({ type: RootAi })` must document the new field. |

No new endpoints.

---

## 10. Cross-system impact

- **AGRESSO** — read-only reuse of `agresso_contracts` + `alliance_user_staff`. No new Agresso API call; both tables are already synced locally.
- **CLARISA** — read-only, country names for the metrics. No new taxonomy.
- **RabbitMQ / mailer microservice** — one additional `send` event per project group via the existing `MessageMicroservice.sendEmail`. No contract change to the mailer.
- **AI mining service** — **contract change**: it must begin sending `metadata.contacts`. Coordinate before enabling the flag; ARI tolerates its absence indefinitely.
- **STAR client** — none. The email links to an existing route.
- **Socket.IO** — none.

---

## 11. Assumptions, dependencies, risks

**Assumptions**
1. One email per **contract**, not per bulk file — the approved subject carries a single `[Project ID]`, and the PI is a property of the contract.
2. `alliance_user_staff` is the authoritative carnet→email map and is kept fresh by the existing Agresso sync.
3. The mailer microservice is fire-and-forget; ARI cannot observe bounces. `notification_status = SENT` means *dispatched to the queue*, not *delivered*.
4. "Token owner" is the authenticated identity of the bulk call; for machine tokens it is `app_secrets.responsible_user_id`.

**Dependencies**
- AI mining service adopting `metadata.contacts` (blocking only for R-CBU-005 AC.2–AC.4; everything else ships without it).
- `app_config` rows seeded by migration before the feature is enabled.

**Risks**

| Risk | Mitigation |
| --- | --- |
| Mass-mailing real external stakeholders with wrong content/recipients | Kill switch defaulting to **off** (R-CBU-009), staged rollout with redirected recipients (D7/D8 substitutes) |
| Stale Agresso staff data mails a departed employee | Accepted residual; Agresso sync is the correction path, not this feature |
| A large batch spanning many contracts floods the mail queue | One email per group, not per result; batch size is already bounded by the upload itself |
| Metric queries slow the upload | Grouped queries, O(groups) (NFR-CBU-001) |

---

## 12. Open questions

| # | Question | Owner | Target |
| --- | --- | --- | --- |
| Q1 | Exact query string for the STAR CapDev panel link — `results-center?indicatorTab=<capdev id>` preselects the tab, but should it also filter by contract or by upload date? | Product / David | before T-08 |
| Q2 | Should the Program Assistant be CC'd, or only the Research Assistant? The story names only "Research Assistants". | Product | before T-04 |
| Q3 | Is a per-group email acceptable when one file spans many contracts, or should a digest be sent to the token owner as well? | Product | before implementation |
| Q4 | Does the AI mining service already parse reporting-leader/contact-person columns from the CapDev file, or is that parsing work on their side too? | AI service team | before T-03 |

---

## 13. Requirement ID index

| ID | Title | Covered by |
| --- | --- | --- |
| R-CBU-001 | Notification fires after a successful CapDev bulk upload | T-07, T-09 |
| R-CBU-002 | One email per project group | T-02, T-09 |
| R-CBU-003 | PI resolved from Agresso as the sole `To` | T-03 |
| R-CBU-004 | CC list assembled, deduplicated and sanitised | T-04 |
| R-CBU-005 | AI bulk payload carries file-sourced contacts | T-01 |
| R-CBU-006 | CapDev metrics computed per project group | T-05 |
| R-CBU-007 | Email rendered from a DB-stored Handlebars template | T-06, T-08 |
| R-CBU-008 | Aggregated metrics persisted on the bulk process | T-02, T-10 |
| R-CBU-009 | Notification is switchable off without a deploy | T-06, T-07 |
| R-CBU-010 | Notification failures never fail the bulk upload | T-07, T-09 |
| R-CBU-011 | Notification activity is observable | T-07 |
| NFR-CBU-001 | Bulk upload latency | T-05, T-11 |
| NFR-CBU-002 | No duplicate notification per process | T-07 |
| NFR-CBU-003 | Recipient data minimisation | T-04, T-08 |
| NFR-CBU-004 | Test coverage | all |
| NFR-CBU-005 | Migration safety | T-02, T-08 |

---

## 14. Sign-off

- [ ] Engineering lead — David Felipe Casañas Hernández
- [ ] MEL / product owner — <pending>
- [ ] Security review (outbound PII to external addresses) — <pending>
- [ ] DevOps (app_config seeding per environment) — <pending>
