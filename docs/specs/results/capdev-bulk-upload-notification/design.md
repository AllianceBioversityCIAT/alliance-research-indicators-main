# Design — Results / CapDev Bulk Upload Notification

- **Module:** results (implementation lives in `ai-reports`)
- **Spec id:** 2026-08-capdev-bulk-upload-notification
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Last updated:** 2026-08-06
- **Depth:** Full
- **Revision:** r4 — post Judgment Day rounds 1–2, plus JD-06 / JD-S9 closed by human election (see [`./judgment.md`](./judgment.md))

---

## Executive summary

**The whole feature is one new service inside `AiReportsModule`, invoked once at the end of `createResultFromAiBulk`, that reads the batch back from the database by process id.**

Reading back from the database (rather than threading in-memory objects through) is the load-bearing choice: it makes the email and the persisted metrics provably the same numbers (R-CBU-008 AC.6), keeps the service unit-testable without a bulk upload, and lets the whole stage be wrapped in a single `try/catch` that cannot poison result creation (R-CBU-010).

Everything else is reuse. The PI join already exists. The mailer already exists. The template engine already exists. The SPRM address already exists in config. This spec adds **no new endpoint, no new external integration, and no new deployment surface** — one additive DTO field, three additive migrations, and one service with two collaborators.

**But three of those reuse points are not safe to call bare**, and Judgment Day round 1 established this against source: `TemplateService._getTemplate` throws on a missing row rather than returning empty (§6.2), `EnvAppConfigUtil` throws on an absent config row rather than defaulting (§6.3), and `AppConfig.SPRM_EMAIL_ARRAY` throws when its env var is unset (§2.2). Each is wrapped. Reuse here means *reusing the mechanism*, not trusting its failure behavior.

**Review status:** Judgment Day rounds 1 and 2 (blind dual review, Opus + Sonnet) are recorded in [`./judgment.md`](./judgment.md). All five confirmed-SEVERE findings and all five verified single-judge findings are corrected here and annotated inline with their `JD-*` ids; the round-2 re-judgment confirmed every one against source and found **zero new SEVERE**, only coherence slips, which r3 swept. r4 additionally closes JD-06 (DD-3 rationale + token-owner resolution) and JD-S9 (salutation fallback ownership). **Nine** non-severe entries remain open on the ledger by human scope decision.

---

## 1. Goals & non-goals

**Goals**
- Notify each project's PI + collaborators after a CapDev bulk upload, per contract.
- Persist the same aggregates on `bulk_upload_processes` for later analytics.
- Make the feature switchable off from the database, default-off.
- Guarantee the notification stage can never fail, delay, or roll back a bulk upload.

**Non-goals**
- Delivery tracking / bounce handling — the mailer microservice is fire-and-forget and this spec does not change that.
- A UI to preview, resend, or configure recipients.
- Any dashboard consuming the persisted metrics.
- Notifications for non-CapDev indicators.
- Deduplicating notifications across *retried* bulk uploads (each call is a new process; see DD-7).

---

## 2. Architecture

### 2.1 Composition

```
ResultsService.createResultFromAiBulk()
  │
  ├─ for each result → formalizeResult(...)                     [unchanged]
  ├─ const process = await AiReportsService.create(...)          [now captures the return]
  │
  └─ try { await CapdevBulkNotificationService                   ← NEW, wrapped
              .dispatch(process.id, metadata?.contacts) }
     catch → LoggerUtil.error, swallow                           [R-CBU-010]

CapdevBulkNotificationService.dispatch(processId, fileContacts)
  │
  1. findGroups(processId)      — grouped, 1 read                              [R-CBU-002]
  2. findMetrics(processId)     — grouped, 1 read                              [R-CBU-006]
  3. findCountries(processId)   — grouped, 1 read                              [R-CBU-006]
  4. findUnattributed(processId)— result_id list, 1 read                       [R-CBU-002 AC.3]
  5. persistProcessMetrics(processId, aggregate)          — 1 write            [R-CBU-008]
  ─────────────────────────────────────────────────────────────────────────────
  6. CAPDEV_BULK_UPLOAD_ENABLED() → false/absent ⇒ status SKIPPED, return      [R-CBU-009]
  ─────────────────────────────────────────────────────────────────────────────
  7. for each group  → try { buildRecipients → render → sendEmail } catch      [per-group isolation]
  8. update notification_status / notification_sent_at    — 1 write
```

**Step order is load-bearing.** The flag check sits **after** metric persistence, not before it: R-CBU-009 AC.1 requires metrics to be written and `notification_status = 'SKIPPED'` to be recorded even when the feature is off. Gating the queries behind the flag would satisfy "no email" while silently failing R-CBU-008 and R-CBU-009 AC.1/AC.2. *(Judgment Day JD-01.)*

**Module placement.** The service, its repository, and its DTOs live in `AiReportsModule` — the module that already owns `bulk_upload_processes` and `bulk_upload_results`, and that `ResultsService` already injects (`results.service.ts:166`). No new module, no new wiring in `main.routes.ts`, no circular import (the notification service depends only on `DataSource`, `TemplateService`, `MessageMicroservice`, `AppConfig`, `EnvAppConfigUtil` — none of which depend on `AiReportsModule`).

**`CurrentUserUtil` is deliberately *not* a dependency** *(JD-06)*. The token owner is read from `bulk_upload_processes.created_by` (§6.1), so nothing in this service touches request state — which is what keeps DD-2's async-dispatch seam real.

### 2.2 Reuse inventory

| Need | Reused from | Notes |
| --- | --- | --- |
| PI / RA / PA resolution | the join at `result-status-workflow.repository.ts:94` — `alliance_user_staff aus ON aus.carnet = ac.projectLeadId` | copied as a pattern into the new repository, **not** imported — the workflow query is result-scoped and single-row; this one is batch-scoped and grouped |
| Email dispatch | `MessageMicroservice.sendEmail(EmailBody)` | already handles `from`, environment marker, auth. ⚠️ **The rendered HTML goes in `message.socketFile` as `Buffer.from(html)`, never `message.text`** — every existing caller does this (`result-oicr.service.ts:183`, `green-checks.service.ts:582`, `function-handler.service.ts:66`). The field naming invites the wrong choice; a `text` body would send an empty email that no content assertion in §11 would catch *(JD-S4)* |
| Template rendering | `TemplateService._getTemplate<T>(TemplateEnum, data)` | Handlebars, DB-stored. ⚠️ **Must be wrapped** — see §6.2 (JD-05) |
| SPRM address | `AppConfig.SPRM_EMAIL_ARRAY` | ⚠️ **Not safe to call bare.** `app-config.util.ts:318` is `process.env.ARI_SPRM_EMAIL.split(',')` — unguarded, so it throws `TypeError` when the env var is unset, which would sink every group and defeat R-CBU-004 AC.5. The service reads it defensively (`process.env.ARI_SPRM_EMAIL ?? ''`) and passes the parsed array into the builder *(JD-S2)*. `ARI_SPRM_EMAIL` is listed as a required env var in §12 |
| STAR host | `AppConfig.ARI_CLIENT_HOST` | existing getter, safe |
| DB-backed config | `AppConfigCategory/Subcategory/Field` enums + **new defaulting accessors** | ⚠️ **Not the same shape as `EMAIL_READINESS_LEVEL_7_TO`** — see §6.3 (JD-02) |
| Name/text cleaning | `cleanName`, `cleanText` (`shared/utils/object.utils.ts`) | |
| Logging | `LoggerUtil` | |

---

## 3. Extended directory structure

```
src/domain/entities/ai-reports/
├── ai-reports.module.ts                                  [MOD] register new providers
├── entities/
│   └── bulk-upload-processes.entity.ts                   [MOD] +9 nullable columns
├── notifications/                                        [NEW]
│   ├── capdev-bulk-notification.service.ts               [NEW] orchestration
│   ├── capdev-bulk-notification.service.spec.ts          [NEW]
│   ├── capdev-bulk-notification.repository.ts            [NEW] 4 grouped queries + 2 writes
│   ├── capdev-bulk-notification.repository.spec.ts       [NEW]
│   ├── capdev-recipients.builder.ts                      [NEW] pure: assemble/sanitise/dedupe
│   ├── capdev-recipients.builder.spec.ts                 [NEW]
│   ├── capdev-metrics.formatter.ts                       [NEW] pure: numbers/dates → strings
│   ├── capdev-metrics.formatter.spec.ts                  [NEW]
│   ├── dto/
│   │   ├── capdev-bulk-group.dto.ts                      [NEW] query row shapes
│   │   └── capdev-bulk-email-template.dto.ts             [NEW] Handlebars contract
│   └── enum/
│       └── notification-status.enum.ts                   [NEW] SENT|SKIPPED|FAILED|PARTIAL
src/domain/entities/results/
├── results.service.ts                                    [MOD] capture process, call dispatch
└── dto/result-ai.dto.ts                                  [MOD] +AiContactDto, +ProcessMedatada.contacts
src/domain/shared/
├── auxiliar/template/enum/template.enum.ts               [MOD] +CAPDEV_BULK_UPLOAD_SUMMARY
├── auxiliar/template/template/capdev-bulk-summary.html   [NEW] reference copy of the seeded HTML
└── utils/env-app-config.util.ts                          [MOD] +2 accessors
src/domain/entities/app-config/enum/
└── app-config-catergory.enum.ts                          [MOD] +subcategory, +2 fields
src/db/migrations/
├── <ts>-addBulkUploadNotificationMetrics.ts              [NEW] additive columns
├── <ts>-insertCapdevBulkSummaryTemplate.ts               [NEW] template row
└── <ts>-insertCapdevBulkNotificationConfig.ts            [NEW] 2 app_config rows
```

**Two pure modules are split out on purpose** (`capdev-recipients.builder`, `capdev-metrics.formatter`): they hold every rule that D1 and D2 in the defect-class table can break, and as pure functions they are exhaustively testable without a database, a broker, or a template.

---

## 4. Data model

### 4.1 `bulk_upload_processes` — additive columns

| Column | Type | Null | Purpose |
| --- | --- | --- | --- |
| `total_results` | `bigint` | ✔ | created rows in the batch, all indicators |
| `total_capdev_results` | `bigint` | ✔ | created CapDev rows (the batch-wide training count) |
| `total_participants` | `bigint` | ✔ | summed across the batch |
| `total_female_participants` | `bigint` | ✔ | summed across the batch |
| `activity_start_date` | `timestamp` | ✔ | `MIN(start_date)` across the batch |
| `activity_end_date` | `timestamp` | ✔ | `MAX(end_date)` across the batch |
| `countries` | `json` | ✔ | distinct ISO alpha-2 list |
| `notification_sent_at` | `timestamp` | ✔ | null unless at least one group dispatched |
| `notification_status` | `varchar(20)` | ✔ | `SENT` \| `SKIPPED` \| `FAILED` \| `PARTIAL` |

All nullable, no defaults, no backfill — existing rows keep NULLs, which correctly read as "predates the feature" (NFR-CBU-005). No new index: every read is by primary key.

**Batch-level, not group-level.** Per-group metrics are recomputable from `bulk_upload_results` + `result_contracts` at any time; storing them again would create a second source of truth to keep in sync. The process row stores the batch roll-up that a dashboard actually queries.

### 4.2 `sec_template` — one seeded row

**The table is `sec_template`, not `templates`.** `template.entity.ts:11` declares `@Entity('sec_template')`, and all 17 template-touching migrations write to `sec_template`; no migration in the repo references a `templates` table. *(An earlier draft named `templates`, which would have produced a migration that fails at runtime — JD-S1.)*

`INSERT INTO sec_template (name, template, description)` with `name = 'capdev-bulk-upload-summary'`; `is_active` is inherited from `AuditableEntity` and must be true for `_getTemplate` to find the row. Follows the existing idiom (`1772481692172-insertNewTemplateInnovationLevel.ts`). A copy of the same HTML is committed at `shared/auxiliar/template/template/capdev-bulk-summary.html` for review and diffability, matching how the existing templates are mirrored on disk.

### 4.3 `app_config` — two seeded rows

| key | value |
| --- | --- |
| `EMAIL.CAPDEV_BULK_UPLOAD.ENABLED` | `'false'` ← **seeded off** |
| `EMAIL.CAPDEV_BULK_UPLOAD.CC_EMAIL` | `''` (comma-separated when set) |

---

## 5. API design

**One request-side change. No new endpoint.**

`POST /api/v1/results/ai/formalize/bulk` — `metadata.contacts?: AiContactDto[]`

```
AiContactDto
  email          string   required   @IsEmail
  name           string   optional
  role           enum     optional   reporting_leader | contact_person | other
  contract_code  string   optional   scopes the contact to one project group
```

- Declared `@IsOptional()` + `@ValidateNested({each:true})` + `@Type(() => AiContactDto)` on `ProcessMedatada`.
- Stays on `/v1`: purely additive and backward compatible, so a `/v2` would be ceremony without a consumer.
- `@ApiProperty` on every field so Swagger documents it (D4's gate depends on the DTO being real, not on prose).

**Why this must exist before the AI service can send anything:** the endpoint already runs `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` (`results.controller.ts:666-672`). Today an unknown `contacts` property is a hard `400`. The DTO change is the enabling step, not a nicety.

---

## 6. Backend module design

### 6.1 The four queries (NFR-CBU-001)

All four are keyed on `bulk_upload_process_id` and grouped in SQL.

**Query budget — `4 grouped reads + 2 writes`, plus `1 template read + 1 config read per group`.** That is **O(groups), never O(results)** — which is what NFR-CBU-001 and §11 actually require. *(An earlier draft claimed a constant "3 reads + 1 write"; that was false — `template.service.ts:11-22` issues a `findOne` on every `_getTemplate` call, each `EnvAppConfigUtil` accessor issues its own, and there are two writes. JD-04.)*

The CapDev filter is bound from `IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT`, never a literal `1`.

**Q1 — groups + people.** Joins `bulk_upload_results → result_contracts (is_primary = true AND is_active = true) → agresso_contracts`, then three `LEFT JOIN`s onto `alliance_user_staff` for `projectLeadId`, `researchAssistantId`, `programAssistantId`. Filtered to `result_id IS NOT NULL AND error_message IS NULL AND indicator_id = :capdev`.

**`GROUP BY ac.agreement_id` is mandatory here.** The join spine yields one row **per bulk-upload row**, not per contract. Without the grouping, a project with N results produces N rows — and therefore **N emails**, violating R-CBU-002 AC.1. PI/RA/PA columns are functionally dependent on `agreement_id` and are selected via `MAX()`/`ANY_VALUE()` so the grouping is valid under `ONLY_FULL_GROUP_BY`. Selected columns include `ac.project_lead_description` (needed for the salutation fallback) and `ac.agreement_id`.

**Tie-break:** nothing in the schema **or in any write path** constrains a result to exactly one `is_primary = true AND is_active = true` contract row — there is no unique index, and the only place the single-primary assumption surfaces is the *read* at `result-contracts.service.ts:48-56`, which silently returns one row. When a result has more than one, take the lowest `result_contract_id` and emit a warn log naming the `result_id`; without this, the result is counted in both groups, violating R-CBU-006 AC.6. *(JD-03.)*

**Token owner** is resolved in this same query, not from request state: `bulk_upload_processes bup → sec_users su ON su.sec_user_id = bup.created_by`. It is process-level and therefore constant across groups, so it costs no additional read. `results.service.ts:1043` already writes `created_by` on the process row before `AiReportsService.create()` runs, which makes the owner durably resolvable and satisfies R-CBU-007 AC.4 — the requirement had no owning component before *(JD-S9, JD-06)*. For a machine token the same column carries `app_secrets.responsible_user_id`, per the requirements glossary.

**Q2 — metrics.** Same spine and same tie-break, joined to `result_capacity_sharing`, `GROUP BY ac.agreement_id`, selecting `COUNT`, `SUM(COALESCE(session_participants_total, male+female+non_binary))`, `SUM(female)`, `MIN(start_date)`, `MAX(end_date)`.

**Q3 — countries.** Same spine joined to `result_countries → clarisa_countries`, `GROUP BY ac.agreement_id`, selecting **both** `GROUP_CONCAT(DISTINCT cc.name ORDER BY cc.name)` for the email body and `GROUP_CONCAT(DISTINCT rc.isoAlpha2)` for the `countries` JSON column of §4.1 — the two are different values and §4.1 specifies ISO codes.

**Q4 — unattributed results.** Results with no active primary contract fall out of Q1's inner join. Q4 **selects their `result_id`s** (not a `COUNT(*)`): R-CBU-002 AC.3 and §10 both require the warning log to *name* each `result_id`, which a scalar count cannot supply. Still one query regardless of batch size. *(JD-S5.)*

### 6.2 Template retrieval must be wrapped

`TemplateService._getTemplate` **cannot** be called bare. Its implementation is `findOne({...}).then(({ template }) => template)` (`template.service.ts:12-20`) — when no active row matches, `findOne` resolves `null` and the destructuring throws `TypeError: Cannot destructure property 'template' of 'null'`.

Consequences if unwrapped: the `NO_TEMPLATE` branch is **unreachable**, the failure lands in the generic per-group catch, and R-CBU-011 AC.3 (a skipped group must be distinguishable from a failed one) cannot hold.

**The service therefore wraps the call and treats *both* a throw and an empty/undefined return as `NO_TEMPLATE`, logged at `error` level** — R-CBU-007 AC.5 mandates an error log, not a warning. §10's observability table reflects this. *(JD-05.)*

### 6.3 The two new config accessors default; they do not delegate

`EnvAppConfigUtil.getConfig` **throws** on a missing row — `env-app-config.util.ts:43-51` logs and raises `InternalServerErrorException`. Every existing accessor, including `EMAIL_READINESS_LEVEL_7_TO`, delegates straight to it. Reusing that shape would mean:

- a missing `ENABLED` row throws → swallowed by the outer catch → **no metrics persisted, no `notification_status` written**, breaking R-CBU-009 AC.2 and R-CBU-008;
- a missing `CC_EMAIL` row throws inside the group build → **no email at all**, breaking R-CBU-004 AC.6.

**Both new accessors therefore resolve a default instead of throwing** — `CAPDEV_BULK_UPLOAD_ENABLED() → false`, `CAPDEV_BULK_UPLOAD_CC_EMAIL() → []`. Defaulting to `false` is also what makes DD-5's "absent ⇒ disabled" true rather than aspirational. *(JD-02.)*

Two implementation constraints, both from the round-2 review:

- **Do not `try/catch` around `getConfig`.** `env-app-config.util.ts:43-47` calls `this.logger.error(...)` **before** it throws, so catching the exception suppresses the throw but not the ERROR line. The absent-row path is the *expected* resting state of a default-off feature, and it would emit an error on every upload in an environment where the rows were never seeded — alert noise that also muddies R-CBU-010 AC.5's "exactly one error log". The accessors must instead query the `AppConfig` repository directly (or go through a new non-throwing `tryGetConfig` private) so the absent row is simply a miss.
- **The accessor does not log.** It returns the default plus a `defaulted: true` marker; **the notification service emits the warn**, because only the service holds the bulk process id that §10's observability row requires. `EnvAppConfigUtil` is a shared, non-request-scoped utility whose only dependency is `DataSource` (`env-app-config.util.ts:15-17`) — it has no way to know which batch it is serving.

### 6.4 `capdev-recipients.builder.ts` (pure)

`build(group, fileContacts, sprmEmails, configuredCc) → { to: string[], cc: string[], salutation: string } | null`

Returns `null` when the PI address is unresolvable — the caller then skips the group and logs (R-CBU-003 AC.2/AC.3). The single hard rule encoded here: **`to` is only ever the PI**; a missing PI is never backfilled from CC. Sanitisation order is normalise → validate → drop-if-in-`to` → dedupe, and the `to` comparison is done on the lowercased/trimmed form so `PI@Example.org` suppresses `pi@example.org` (R-CBU-004 AC.3).

File contacts are partitioned by `contract_code`: entries naming a contract go only to that group; entries without one go to every group.

**The salutation fallback chain lives here too** — it is PI identity resolution, and it had no owning component before *(JD-S9)*. R-CBU-003 specifies three tiers, evaluated in order:

| Tier | Source | Condition |
| --- | --- | --- |
| 1 | `cleanName(staff.first_name) + ' ' + cleanName(staff.last_name)` | the `alliance_user_staff` row resolved and the cleaned name is non-blank |
| 2 | `cleanText(group.project_lead_description)` | tier 1 empty; the column is selected by Q1 for exactly this purpose |
| 3 | `"Colleagues"` | both empty |

Note the asymmetry, and it is deliberate: a missing *address* returns `null` and skips the group; a missing *name* falls through to tier 3 and still sends. Never conflate the two — R-CBU-003 AC.4 asserts tier 1 wins when both are available, which is only testable if the tiers are ordered rather than coalesced.

### 6.5 `capdev-metrics.formatter.ts` (pure)

Takes raw aggregate row + country list, returns the template DTO of **pre-rendered strings**. Every degenerate case is resolved here, not in Handlebars:

| Input state | Rendered |
| --- | --- |
| participants `0` or all-null | participants clause and percentage clause both absent (empty strings; the template guards with `{{#if}}`) |
| participants > 0, women share `<= 0` | percentage clause absent; participants clause still renders *(OD-2)* |
| participants > 0, women share `0 < p < 1` | `"<1%"` — the floor clause, never suppression *(OD-2)* |
| either date bound null | date clause absent — never a half-range, never `Invalid Date` |
| empty country set | `"multiple countries"` |
| normal | `"12"`, `"1,204"`, `"58%"`, `"March 2025"`, `"Kenya, Uganda"` |

**`percentageWomen` carries its own `%` sign** *(OD-2, 2026-08-09)*. The template slot is bare — `— {{percentageWomen}} of whom were women` — so one slot renders both `"<1%"` and `"58%"` without the template branching on magnitude. Putting the `%` in the template would force `"<1"` to render as `"<1%"` only by accident of adjacency, and would leave no way to express a floor at all. Full rule and its error-direction rationale in `requirements.md` → R-CBU-006.

Doing this in TypeScript rather than in Handlebars is deliberate: Handlebars fails *silently* (a null renders as an empty string, a missing helper renders nothing), which is exactly the failure mode that would put `NaN` or a dangling "from to" in front of a Project Leader. In TS the branches are enumerable and testable (D2, D6).

### 6.6 Failure containment (R-CBU-010)

Two nested boundaries:

1. **Outer** — the whole `dispatch()` call is wrapped in `ResultsService`. Nothing thrown, rejected, or timed out reaches the caller's return path.
2. **Inner** — each group's build/render/send is individually wrapped, so group 2 dispatches after group 1 throws.

`dispatch()` runs **after** `AiReportsService.create()` and outside any transaction governing result creation — a mail failure has nothing to roll back. `notification_status` records the aggregate outcome; `PARTIAL` when the dispatched count is strictly between zero and the group count.

---

## 7. Frontend / UX component architecture

**None.** No client change. The email links to the existing `results-center` route; nothing in `client/research-indicators` is touched by this spec.

The only human-facing surface is the email body itself, whose copy is the approved text from the ticket, stored in the `sec_template` table (§4.2). Its correctness gate is human, not automated (defect class D7).

---

## 8. Shared contracts / package extensions

| Contract | Change | Compatibility |
| --- | --- | --- |
| `RootAi` / `ProcessMedatada` (AI mining service → ARI) | `+contacts?` | Backward compatible; ARI tolerates its absence indefinitely |
| `EmailBody` (ARI → mailer microservice) | none | Reused as-is |
| `ServerResponseDto` of `ai/formalize/bulk` | none | Byte-identical `data` payload (R-CBU-001 AC.4) |
| Socket.IO events | none | |
| OpenSearch mappings | none | `bulk_upload_processes` is not indexed |

---

## 9. Security & authorization

- Endpoint roles unchanged (`TECHNICAL_SUPPORT`, `CENTER_ADMIN`, `MEL_REGIONAL_EXPERT`). No new endpoint means no new authorization surface.
- **Outbound PII.** The email carries aggregates only. `trainee_name` and any participant-level field are never rendered (NFR-CBU-003) — a unit test asserts their absence from the rendered body.
- **Log hygiene.** Info level logs counts; addresses appear only at debug (R-CBU-011 AC.2).
- **Recipient injection.** `metadata.contacts[].email` comes from an authenticated caller but originates in a user-supplied file. It is validated with `@IsEmail` at the DTO boundary **and** re-validated in the builder, then only ever placed in the `cc` field — never in `to`, never interpolated into the subject, and Handlebars escapes it in the body by default.
- **Default-off flag** is a security control as much as an ops one: a mis-seeded environment cannot mail external stakeholders.

---

## 10. Observability

| Signal | Level | Content |
| --- | --- | --- |
| dispatch start | info | process id, group count, CapDev result count |
| per-group sent | info | process id, `agreement_id`, `to`/`cc` **counts**, training count |
| group skipped | warn | process id, `agreement_id`, reason `NO_PI` |
| template missing/inactive | **error** | process id, `agreement_id`, reason `NO_TEMPLATE` — R-CBU-007 AC.5 mandates an **error** log, and §6.2 is what makes the branch reachable at all *(JD-05)* |
| unattributed results | warn | process id, count, **and the `result_id` list** from Q4 — a scalar count cannot satisfy R-CBU-002 AC.3 *(JD-S5)* |
| multiple active primary contracts | warn | process id, `result_id`, the contract chosen by the §6.1 tie-break *(JD-03)* |
| config row absent | warn | process id, the key that defaulted — **emitted by the notification service, not by the accessor**, which has no batch context (§6.3) *(JD-02)* |
| group failed | error | process id, `agreement_id`, cause |
| feature disabled | warn (once) | process id |
| recipient dropped | debug | the dropped raw value |

Durable record: `notification_status` + `notification_sent_at` on the process row — a "why did I get this / why didn't I" question is answerable months later without log retention.

---

## 11. Testing strategy

| Layer | Command | Covers |
| --- | --- | --- |
| Unit — builder | `npm test -- --silent` | D1: PI-only `to`, dedupe, casing, malformed drop, null PI, contract-scoped contacts |
| Unit — formatter | `npm test -- --silent` | D2/D6: zero participants, all-null dates, empty countries, thousands separators, no `NaN`/`Infinity`/`Invalid Date` |
| Unit — service | `npm test -- --silent` | D3: throwing `sendEmail`, throwing repository, per-group isolation, flag off, absent flag, missing template, status transitions incl. `PARTIAL` |
| Unit — repository | `npm test -- --silent` | grouping shape, **Q1 returns one row per `agreement_id` for an N-result group** (JD-03), multi-primary-contract tie-break, Q4 returns `result_id`s not a count (JD-S5), exclusion of errored/non-CapDev rows, O(groups) query count |
| Unit — defensive wrappers | `npm test -- --silent` | **JD-02 / JD-05 / JD-S2:** absent `ENABLED` row ⇒ `false` + warn (not a throw); absent `CC_EMAIL` row ⇒ `[]` and the email still sends; `_getTemplate` throwing ⇒ classified `NO_TEMPLATE` at **error** level; `ARI_SPRM_EMAIL` unset ⇒ no `TypeError`, group still dispatches |
| Unit — flag ordering | `npm test -- --silent` | **JD-01:** flag `false` ⇒ metrics **written** and `notification_status = 'SKIPPED'`, zero `sendEmail` calls |
| Unit — dispatch payload | `npm test -- --silent` | **JD-S4:** the rendered HTML arrives in `message.socketFile` as a `Buffer`, and `message.text` is unset |
| Unit — `results.service` | `npm test -- --silent` | response `data` unchanged when dispatch throws |
| E2E | `npm run test:e2e` | D4: legacy payload without `contacts` → `201`; payload with `contacts` → `201`; malformed contact email → `400` envelope |
| Migration | `npm run migration:dev:execute` / `npm run migration:revert` on dev | D5 — *(`migration:run` is **not** a script in this package; `package.json:28-32` defines `migration:empty`, `:generate`, `:revert`, `:execute` (dist) and `:dev:execute` (src). JD-S3)* |
| **Human** | staged rollout, §12 | **D7, D8 — no automated gate exists; see requirements §7** |

Every new file gets a sibling `*.spec.ts` (NFR-CBU-004).

---

## 12. Rollout & rollback

| Step | Action | Gate |
| --- | --- | --- |
| 0 | Confirm `ARI_SPRM_EMAIL` is set in the target environment. | `AppConfig.SPRM_EMAIL_ARRAY` throws when it is unset *(JD-S2)*; the service reads it defensively, but an unset var silently drops SPRM from every CC. |
| 1 | Deploy code + `npm run migration:dev:execute` (dev) / `migration:execute` (deployed). Flag seeded `false`. | Bulk uploads behave exactly as before — zero emails, **but metrics are already being written** (the flag gates dispatch only, §2.1). This is the safe resting state. |
| 2 | Point `EMAIL.CAPDEV_BULK_UPLOAD.CC_EMAIL` at an internal address and enable on **dev only**. Run a real bulk upload. | **Human review of the received email** — copy, tone, Outlook rendering (**D7**), and the resolved recipient list checked against the real contracts (**D8**). |
| 3 | AI mining service starts sending `metadata.contacts`. Re-run on dev. | File contacts appear in CC; legacy shape still accepted. |
| 4 | Enable in production. | Watch the per-group info logs and `notification_status` for the first uploads. |

**Rollback:** set `EMAIL.CAPDEV_BULK_UPLOAD.ENABLED` to `'false'` — an `UPDATE` on one row, no deploy, effective on the next upload (R-CBU-009 AC.3). The migrations are additive and need no reversal; results and metrics are unaffected.

---

## 13. Design decisions log

| ID | Decision | Alternatives rejected | Why |
| --- | --- | --- | --- |
| **DD-1** | Notification service lives in `AiReportsModule` | (a) new top-level module; (b) inside `results` | `AiReportsModule` already owns both bulk tables and is already injected by `ResultsService`. A new module adds routing/wiring for no boundary gain; `results.service.ts` is already ~1000 lines and is the wrong home for a second concern. |
| **DD-2** | `dispatch()` re-reads the batch from the DB by process id | Thread the in-memory `resultsCreated` array through | Guarantees email and stored metrics are the same numbers (R-CBU-008 AC.6); makes the service testable without running a bulk upload; keeps the seam for a future async/queued dispatch. Cost: 4 grouped reads + 2 writes — O(groups), per §6.1. |
| **DD-3** | Dispatch runs inline (awaited) before the HTTP response | (a) fire-and-forget promise; (b) push to RabbitMQ for a worker | Fire-and-forget in Nest risks unhandled rejections, loses log correlation once the request context closes, and leaves nowhere to record `notification_status` before the response. A queue is real infrastructure for a stage that costs 4 grouped reads + 2 writes plus one template and one config read per group, and one `client.emit` — O(groups), per §6.1. Bounded by NFR-CBU-001 and fully wrapped by R-CBU-010.<br><br>**Corrected r3 *(JD-06)*:** an earlier draft justified this with "`CurrentUserUtil` is request-scoped, so the token owner would be unresolvable." That was false — `current-user.util.ts:9-29` holds a hard reference to the Express `Request`, which a closure keeps readable. It was also unnecessary: the token owner now comes from a `created_by` join (§6.1), so the service depends on no request state at all. DD-2's "seam for a future async dispatch" is now actually true rather than asserted. |
| **DD-4** | Metrics formatted to strings in TypeScript; Handlebars only interpolates | Handlebars helpers / raw values with `{{#if}}` logic | Handlebars fails silently — a null renders as an empty string and a missing helper renders nothing. Every degenerate case that would embarrass us in front of a PI (`NaN`, dangling "from to", `Invalid Date`) becomes an enumerable, testable TS branch instead. |
| **DD-5** | Flag default **off**, absent config ⇒ disabled, **via a defaulting accessor that catches rather than delegating to the throwing `getConfig`** (§6.3) | Default on; env var instead of `app_config`; plain delegation like `EMAIL_READINESS_LEVEL_7_TO` | The failure mode of "absent config means enabled" is mailing external stakeholders from a mis-seeded environment. DB-backed enables rollback without a deploy. Plain delegation was rejected on evidence: `getConfig` **throws** on a missing row, so "absent ⇒ disabled" would have been aspirational rather than true, and would have taken the metric write down with it *(JD-02)*. |
| **DD-6** | Batch-level metrics on the process row; per-group metrics not stored | A `bulk_upload_process_contracts` table | Per-group values are recomputable from existing rows; a second table is a second source of truth to keep in sync, for a dashboard that does not exist yet. Revisit if/when the dashboard needs per-project rows. |
| **DD-7** | No cross-process idempotency | Dedupe on `(ai_interaction_id, file_name)` | A retried upload genuinely creates new results and warrants a new notification. Suppressing it would hide a real duplicate-upload problem behind a silent email skip. Documented as an accepted limitation (NFR-CBU-002). |
| **DD-8** | PI join copied as a pattern, not extracted into a shared repository | Refactor `result-status-workflow.repository.ts` to share it | The workflow query is single-result and single-row; this one is batch-scoped and grouped. Extracting a shared abstraction over two genuinely different queries would couple the email workflow to bulk upload for no reuse. Reconsider at a third caller. |

**Superseded ADRs:** none. This design extends the TRD's existing notification and integration patterns without overturning any accepted ADR.

**Reversion challenge (Step 2.3):** **not applicable — no decision above reverts, removes, disables, or inverts already-delivered behavior.** Every change is additive: new columns, new rows, a new optional DTO field, a new service. The only existing line modified in a non-additive way is `results.service.ts:1058`, where a discarded return value starts being captured.

---

## 14. Budget (Step 2.4 tripwire)

| Signal | Expected |
| --- | --- |
| Tasks | **12** (+1 vs r1: the defensive config accessors and template wrapper are their own task, per JD-02 / JD-05) |
| Lines of code | **~4,600** — *re-baselined 2026-08-06 after the tripwire fired at T-05; original ~1,450 (≈750 production, ≈700 tests) retained in §14.1* |
| Review rounds | **2** |

*r1 estimated 11 tasks / ~1,300 LOC. The increase to ~1,450 was the wrapper work Judgment Day surfaced — it was always required, it was simply invisible while the design assumed the reused utilities defaulted gracefully.*

Consistent with the declared **Full** depth. `/akili-execute` should **stop and escalate** rather than continue if actuals exceed these.

**PR strategy:** exceeds ~400 LOC → split. See `tasks.md` §PR strategy.

### 14.1 Re-baseline — 2026-08-06 (tripwire fired at T-05)

The tripwire fired as designed at the end of T-05 and was escalated; the user accepted a re-baseline. **This is a Leader revision recorded during execution, not a re-run of `/akili-specify`** — the task decomposition and the design are unchanged. Only the size estimate was wrong.

| | Original | Actual / projected |
| --- | --- | --- |
| PR 1 — T-01…T-04 | ~450 | **812 actual** (1.8×) |
| PR 2 — T-05…T-08 | ~600 | **1,051 actual for T-05 alone** · ~1,300 projected for T-06…T-08 |
| PR 3 — T-09…T-12 | ~400 | ~1,500 projected |
| **Total** | **~1,450** | **1,863 actual at 5/12 tasks · ~4,600 projected** |

**Why the original was wrong — two independent causes:**

1. **The production estimate was low across the board.** ≈750 production lines were budgeted for all twelve tasks. T-05's repository alone is 545 — four grouped SQL builders, a shared join spine, a correlated tie-break subquery, and two writes. That is what Size L means in this codebase, and the original figure never reflected it.
2. **The test estimate was structurally low, and specifically so.** ≈700 test lines for twelve tasks assumed tests roughly proportional to production code. The realised ratio is about **1:1** (T-05: 545 production / 506 test), driven by two things the estimate could not have priced: the `Disqualifies` clause this spec attaches to every task demands non-vacuous fixtures rather than smoke tests, and the **DB-less constraint** forces every SQL claim to be proven twice — structurally against the QueryBuilder and behaviorally against an extracted pure mapper — where one integration test would otherwise suffice.

A flat 1.8× multiplier from PR 1 would project ~2,600 and is **too optimistic**: T-05 by itself exceeded PR 2's entire allocation, and PR 3 carries the heaviest work in the spec (T-09 orchestration, T-11 E2E, T-12 the failure-isolation sweep). The ~4,600 figure is bottom-up at the observed 1:1 test ratio.

**This is a projection, and the tripwire still binds against it.** If actuals exceed ~4,600, `/akili-execute` stops and escalates again rather than quietly absorbing the next overrun.

**Consequence for PR strategy:** PR 2 and PR 3 will each land well above the ~400-LOC single-PR guidance. `tasks.md` §3 splits by blast radius rather than line count, which remains the right axis — but each PR description must state its real size up front rather than let a reviewer discover it.

---

## 15. Open questions

Carried from `requirements.md` §12; none blocks starting T-01.

| # | Question | Blocks | Owner |
| --- | --- | --- | --- |
| Q1 | Exact query string for the STAR CapDev panel link | T-08 | Product |
| Q2 | CC the Program Assistant, or Research Assistant only? | T-04 | Product |
| Q3 | Digest to the token owner when one file spans many contracts? | none (post-v1) | Product |
| Q4 | Does the AI service already parse contact columns from the CapDev file? | T-01 (rollout step 3, not the code) | AI service team |

Design stance where unresolved: **Q2 — PA is included**, because dropping a recipient is a one-line change in a pure builder with an existing test, whereas adding one later needs a new query column. **Q1 — the link points at `results-center` with the CapDev indicator tab preselected**; a wrong query string degrades to a correct page rather than a broken link.

---

## 16. References

- `server/researchindicators/src/domain/entities/results/results.service.ts:1032` — `createResultFromAiBulk`
- `server/researchindicators/src/domain/entities/result-status-workflow/repositories/result-status-workflow.repository.ts:94` — the PI join
- `server/researchindicators/src/domain/tools/broker/message.microservice.ts` — `sendEmail`
- `server/researchindicators/src/domain/shared/auxiliar/template/template.service.ts` — Handlebars rendering
- `server/researchindicators/src/domain/shared/utils/env-app-config.util.ts` — DB-backed config precedent
- `docs/trd/trd.md` — notification and integration patterns
- `docs/specs/kaizen-log.md` — Active Lessons (KZ-001 applied: see below)

**KZ-001 applied** (*"a test double that doesn't render what it stands in for produces a green suite over broken behavior"*): the template must **not** be stubbed in the tests that verify body content. Rendering assertions run Handlebars against the **real seeded HTML** read from `shared/auxiliar/template/template/capdev-bulk-summary.html`, so an empty-string stub cannot make a "no `{{` remaining" or a "no `NaN`" assertion vacuously pass. This shaped DD-4 and the on-disk template mirror in §3.
