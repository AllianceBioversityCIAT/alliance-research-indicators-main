# Requirements — Bilateral / PRMS Sync — Decision Webhook

- **Module:** `bilateral/prms-sync` (server) — family child **5**
- **Spec id:** `2026-09-decision-webhook`
- **Depth:** **Full** — first public inbound **write** endpoint in the application, new table + migration, a new credential, and an external integration contract.
- **Status:** `draft`
- **Owner:** Juan Cadavid / ARI
- **Linked PRD section:** [`docs/prd.md`](../../../../prd.md) §3.5 (cross-platform consumers), §4.1 G1/G4, §5.1 (federation)
- **Linked TRD section:** [`docs/trd/trd.md`](../../../../trd/trd.md) §9.1 (integrations), §7.1 (result lifecycle)
- **Linked tickets:** branch `AC-1675-Syncronization-of-bilateral-status-in-PRMS` — **the Jira ticket is empty**; the contract document plus the owner instruction of 2026-09-17 are the whole known requirement.
- **Extends:** [`../sync-engine`](../sync-engine/requirements.md) (outbound push). **Parent family:** [`../family.md`](../family.md) child 5.
- **Requirement source (now in-repo, R-F5 discharged 2026-09-21):**
  - [`docs/technical-docs/prms-normalizer/prms-result-decision-webhooks.md`](../../../../technical-docs/prms-normalizer/prms-result-decision-webhooks.md) — the callback contract, cited throughout as **[WH]**.
  - [`docs/technical-docs/prms-normalizer/prms-normalizer-technical-field-documentation.md`](../../../../technical-docs/prms-normalizer/prms-normalizer-technical-field-documentation.md) — the ingest contract, cited as **[FD]**.
  - Owner instruction 2026-09-17: *"primero necesitamos hacer la conexión con el hook y dejar registrado cada que el hook mande algo porque ese histórico se tiene que mostrar."*
- **Last updated:** 2026-09-22

---

## 1. Executive Summary

STAR pushes results to PRMS and never learns what a CGIAR Science Program decided about them. This spec closes that loop in its smallest honest form, **server-only**:

1. STAR **registers** a callback destination with PRMS from inside the product (an audited `SYSTEM_ADMIN` action), and can **read back** what PRMS has on file.
2. A **public HTTPS callback endpoint** accepts the PRMS `POST`, **stores the delivery first** and acknowledges with `2xx` well inside the 15 s timeout.
3. **Every delivery is recorded** in an append-only history — including ones that correlate to nothing, carry no `external_reference`, or are malformed. The history is the deliverable.
4. Repeat deliveries of the same `x-prms-delivery-id` are recorded as repeats and **applied once**.
5. A correlated delivery's verdict becomes **readable on the result's PRMS sync status**, without touching the outbound sync state.

**Not built here:** any UI, any re-push on REJECT, any write to `result`, HMAC verification, and any reconciliation job. Each is fenced in §6.

> **The one thing this spec cannot prove.** The callback path is only exercisable from outside the CIAT network, and the Dev host is not publicly routable (**P-6**, §11 R-1). Every requirement below is verifiable by automated test *except* live delivery, which is recorded as an accepted, human-owned gap in §10 and §13.

---

## 2. Glossary

| Term | Meaning |
|---|---|
| **Delivery** | One `POST` from PRMS to STAR's registered callback URL, identified by the `x-prms-delivery-id` header. |
| **Decision / verdict** | The Science Program's action, carried verbatim as `decision: "APPROVE" \| "REJECT"` ([WH] §4). Present tense — **not** `APPROVED`. |
| **Destination** | The single HTTPS URL PRMS holds on file for the STAR platform. One platform, one destination ([WH] §1). |
| **`external_reference`** | STAR's own identifier, sent at ingest and returned verbatim on the callback. Today STAR sends `String(result_official_code)` (`common-fields.builder.ts:421-426`, re-verified 2026-09-22 at HEAD `170da206`). |
| **Correlation** | Resolving a delivery's `external_reference` to the **live** STAR result row, via all **four** predicates of the repo convention: `platform_code = STAR AND result_official_code = X AND is_active = TRUE AND is_snapshot = FALSE` (`results.util.ts:38,41-43`). *(Corrected at round 2 — Judgment Day round 2, judges A/B FC-4/FC-6: this glossary row was missed when C-7/R-PWH-007 were corrected at round 1, JD-8.)* |
| **Repeat** | A second or later delivery bearing a `x-prms-delivery-id` already recorded. |
| **Callback secret** | An unguessable path segment that authenticates the callback. PRMS refuses credentials in the host and explicitly recommends *"put the secret in a path or query string instead"* ([WH] §1 URL requirements). |
| **Store-then-acknowledge** | Persist the raw delivery, answer `2xx`, and only then do any further work ([WH] §5). |
| **SP** | CGIAR Science Program — the reviewer that approves or rejects inside PRMS. |

---

## 3. System Context & Scope

### 3.1 What exists today

Every claim here carries its evidence. **Two commits are in play:** C-4, C-5, C-6 and C-11 were **re-run at `170da206`** on 2026-09-22 after a sibling child's merge moved the code they cite; every other claim was run at **`e0c8c443`** and the merge did not touch it. Each row states its own re-verification where it applies. Claims that could not be settled here are marked. *(Corrected 2026-09-22: this line previously claimed a single commit for every row, which four rows already contradicted.)*

| # | Claim about today | Evidence |
|---|---|---|
| C-1 | **No webhook surface of any kind exists.** | `git grep -in "webhook" -- server/researchindicators/src` → **0 hits**; `git grep -inE "delivery.?id" -- server/researchindicators/src` → **0 hits** |
| C-2 | The only PRMS-sync routes are result-scoped and JWT-protected. | `main.routes.ts:88` — `${RESULT_CODE}/prms-sync` → `ResultPrmsSyncModule` |
| C-3 | `JwtMiddleware` covers `*` with a seven-entry exclusion list; **no PRMS path is on it**. | `app.module.ts:73-106` — exclusions are `configuration/:key`, `/`, `/admin(.*)`, `/admin/public(.*)`, `/.well-known(.*)`, `/favicon.ico`, `reports/${RESULT_CODE}/pdf` |
| C-4 | `result_prms_sync_log` **still cannot** hold a decision-webhook delivery — but not for the reason this row originally gave. **Ground-truth drift, 2026-09-22:** `sync-engine` (a sibling, in-flight child of this family) shipped `db/migrations/1790023167000-replaceResultIdWithOfficialCodeInPrmsSyncLog.ts` on 2026-09-21, **dropping `result_id` and its FK entirely** and re-keying the table on `(external_reference, result_year)`. The FK-based claim this row made is now false. What survives: `attempt_number` stays `nullable: false` (`entity.ts:47-49`) — a decision is not an "attempt" and has no natural value for it — and the table's new identity **deliberately groups a live result with its snapshots** (`entity.ts:27-36`'s own comment: *"identifies the subject the way PRMS does"*, i.e. by code+year alone). That grouping is correct for deduplicating an *outbound* push, but is the **wrong** grouping for a verdict, which per DD-6 must resolve to the live row only. The row shape also still has no `decision`/`justification`/`decided_at`/dedup-on-delivery-id columns. | `result-prms-sync-log.entity.ts:45-49` (`attempt_number` `nullable: false`), `:14-19` (new compound index `idx_result_prms_sync_log_code_year` on `['external_reference','result_year']`, no FK anywhere in the file); migration `1790023167000-replaceResultIdWithOfficialCodeInPrmsSyncLog.ts` (`DROP FOREIGN KEY FK_result_prms_sync_log_result_id`, `DROP COLUMN result_id`) |
| C-5 | Outbound `external_reference` is `String(result_official_code)`, and is mandatory at build time. | `common-fields.builder.ts:421-426` *(re-verified 2026-09-22 at HEAD `170da206` — the builder grew substantially in the `sync-engine` merge; content unchanged, citation moved from `:317-323`)* — `requirePresent(... String(aggregate.result_official_code) ..., 'external_reference')` |
| C-6 | `result_official_code` is a **non-unique** `bigint`; uniqueness needs `is_snapshot`. | `result.entity.ts:75-82`; index `idx_results_official_code_snapshot_report_year` on `['result_official_code','is_snapshot','report_year_id']` (`result.entity.ts:59-63` — `:64` is a *different* index, `idx_results_synced_to_prms`; corrected 2026-09-22, FC2-6) *(re-verified 2026-09-22 at HEAD `170da206` — an unrelated import/relation removed earlier in the file shifted every line below it by −2; content unchanged)* |
| C-7 | The repo-wide convention for "the live result for this official code" has **four** predicates — `platform_code`, `result_official_code`, `is_active`, `is_snapshot = false` — not two. | `results.util.ts:38` (`where.platform_code = reportingPlatforms;`, defaulting to `ReportingPlatformEnum.STAR`) and `:41-43` |
| C-8 | `PrmsNormalizerService` targets `appConfig.ARI_PRMS_NORMALIZER_HOST` (constructor) and reads the API key from `app_config` **per call**. | `prms-normalizer.service.ts:24-29`, `:36-44` |
| C-9 | The webhook endpoints are on the **same host and same key** as ingest. | [WH] §"Service URLs" + §"Authentication" |
| C-10 | The TEST/PROD discriminator already in use is `ARI_IS_PRODUCTION ? 'PROD' : 'TEST'`. | `result-prms-sync.service.ts:130` |
| C-11 | `deriveSyncState` orders the "last attempt" by `attempt_number DESC` and derives `synced` from `is_synced_to_prms` **or** `outcome = ACCEPTED`. | `result-prms-sync-status.reader.ts:11-31`, `:67-81` *(re-verified 2026-09-22 at HEAD `170da206` — `LAST_ATTEMPT_SQL` now resolves the log row via subqueries on `results.result_official_code`/`report_year_id` instead of a direct FK join, matching C-4's drift; the `attempt_number DESC` ordering this claim rests on is unchanged)* |
| C-12 | `PrmsSyncOutcome` is VARCHAR-backed and has **8** members, none of them a Science-Program verdict. | `prms-sync-outcome.enum.ts:10-19` |
| C-13 | `SYSTEM_ADMIN = 1` in `SecRolesEnum` and bypasses role checks. | `sec_role.enum.ts:2`; root `CLAUDE.md` §4.1 |
| C-14 | URI versioning is enabled with **no** `defaultVersion` — an undecorated handler mounts at `/api/<path>`, **not** `/api/v1/<path>`. | `main.ts:54-57` |
| C-15 | The Dev API host is **not publicly routable**. | `dig +short main-allianceindicatorstest.ciat.cgiar.org` → `cerberus.cgiarad.org.` → `192.168.199.32` (RFC1918), re-run 2026-09-21 |
| C-16 | No PROD hostname is resolvable from here. | `dig +short main-allianceindicators.ciat.cgiar.org` and `… allianceindicators.ciat.cgiar.org` → **empty** (NXDOMAIN) |
| C-17 | `ARI_PRMS_NORMALIZER_HOST` is present but **commented out** in `.env.example`; the sync engine has never run live. | `.env.example:36`; [`../HANDOFF.md`](../HANDOFF.md) |
| C-18 | **UNVERIFIED — confirm at source before relying on it.** Whether PRMS sends a callback for a result whose `external_reference` was `null` at ingest. [WH] §4 types the field `string \| null` and says *"null if you did not send one"*, while the FAQ says results created **inside** PRMS get no callback at all. STAR always sends one (C-5), so the null case should be unreachable for STAR — but the contract permits it. Settled by: the endpoint records it either way (R-PWH-005 AC.4); no design decision depends on the answer. |

### 3.2 In scope

Server package only (`server/researchindicators`).

- Two additive methods on `PrmsNormalizerService`: register and read the destination.
- A `SYSTEM_ADMIN`-restricted operator surface for both.
- A public callback endpoint, its `JwtMiddleware` exclusion, and its shared-secret segment.
- A new append-only delivery table + migration, correlation, dedupe, and the verdict read surface.
- Swagger on every new handler, `LoggerUtil` lines, sibling `*.spec.ts`, `.env.example` entries.

### 3.3 Out of scope

Fenced in §6.

---

## 4. Stakeholders / Personas

| Persona (PRD §3) | Stake |
|---|---|
| **System Admin / Technical Support** (§3.4) | The only persona that acts here: registers the destination per environment, reads back what is on file, and diagnoses deliveries from the log. |
| **Cross-Platform Consumer — PRMS** (§3.5) | Becomes an **inbound caller** of STAR for the first time. Its contract ([WH]) is the requirement. |
| **MEL Regional Expert** (§3.2) / **Result Contributor** (§3.1) | **Beneficiaries only in this child.** The verdict becomes *readable*; no screen shows it until a later family row. |
| **Center Admin** (§3.3) | Consumer of the read surface via family children 3 and 4. |

---

## 5. Functional Requirements

### R-PWH-001 — Register STAR's callback destination with PRMS

- **As a** System Admin
- **I want** to register STAR's callback URL with PRMS from inside the product
- **So that** decisions reach STAR, and anyone can answer *"where are our callbacks going right now?"* without a shell.

**Details**
- **Inputs:** none from the caller. The URL is taken from configuration, never from the request body — the destination is an environment property, not a user input.
- **Behavior:** call `POST {ARI_PRMS_NORMALIZER_HOST}/webhook` with `x-api-key` and body `{ "url": <configured callback URL> }`. Registration is an **upsert** ([WH] §1): re-registering replaces the URL and re-enables a disabled destination.
- **Outputs:** `ServerResponseDto` whose `data` carries the stored destination (`id`, `recipient_type`, `recipient_id`, `recipient_acronym`, `url`, `is_active`, `last_updated_date`) and the PRMS `message`.
- **Errors:** `503` when the host is unconfigured, or when the `app_config` row exists but carries an empty `simple_value` (`prms-normalizer.service.ts:41-44`, `:71-77`). **`404` when the `ARI_CLARISA_API_KEY` row is missing or inactive** — `AppConfigService.getEnv` throws `NotFoundException` (`app-config.service.ts:78-84`), and the two cases are genuinely different diagnoses. The PRMS `400` / `401` / `502` / `503` bodies are surfaced with their `message` intact ([WH] §"Response Examples").
- **Permissions:** `@Roles(SecRolesEnum.SYSTEM_ADMIN)` + `RolesGuard`. JWT required.

**Acceptance criteria**
- [ ] AC.1 — A `SYSTEM_ADMIN` call returns `ServerResponseDto` with `status: 200` (or `201`) and `data.url` equal to the configured callback URL echoed back by PRMS.
- [ ] AC.2 — A caller **without** `SYSTEM_ADMIN` receives `403`; an **unauthenticated** caller receives `401`. Both assertions are required — the callback exclusion (R-PWH-004) must not reach this route.
- [ ] AC.3 — The request body sent to PRMS contains **exactly one** property, `url`. [WH] §1: *"No other properties are accepted."*
- [ ] AC.4 — A PRMS `400` (e.g. `The url must use https.`) is surfaced with the PRMS `message` verbatim, not replaced by a generic failure string.
- [ ] AC.5 — The API key is read **per call** from `app_config`, not cached in the constructor, so a rotated key takes effect without a restart (family OQ-F8).
- [ ] AC.6 — The registration attempt and its outcome are logged via `LoggerUtil`, **and the log line contains neither the API key nor the callback secret**.
- [ ] AC.7 — A **missing or inactive** `ARI_CLARISA_API_KEY` row surfaces as `404` and an **empty `simple_value`** surfaces as `503`; the two are not collapsed. An operator must be able to tell "the row is not there" from "the row is there and blank". *(Added at Judgment Day round 1, JD-5; renumbered into sequence at round 2 — Judgment Day round 2, both judges, FC-9.)*

**Scenario: Registration succeeds**
- GIVEN `ARI_PRMS_NORMALIZER_HOST` and the callback URL are configured for this environment
- AND the caller holds `SYSTEM_ADMIN`
- WHEN the caller invokes the registration endpoint
- THEN PRMS is called at `POST <host>/webhook` with the `x-api-key` header and a body of exactly `{ "url": … }`
- AND the response `data` carries the destination PRMS now holds on file
- BUT it must NOT accept a URL supplied in the request body
- AND IT MUST log the attempt without emitting the API key or the callback secret.

**Scenario: Registration refused by PRMS**
- GIVEN PRMS responds `400` with `{"ok": false, "error": "webhook_registration_failed", "message": "The url must point to a publicly reachable host."}`
- WHEN the caller invokes the registration endpoint
- THEN the response surfaces that `message` verbatim
- AND IT MUST NOT report the registration as successful.

**Out of scope:** registering from a UI; automatic registration at boot (rejected — see design DD-2).

---

### R-PWH-002 — Read back the destination currently on file

- **As a** System Admin
- **I want** to see the destination PRMS holds for STAR
- **So that** I can confirm an environment is wired before results go under review — the window in which nothing is registered is an **unrecoverable** loss of verdicts ([WH] §3).

**Details**
- **Behavior:** call `GET {ARI_PRMS_NORMALIZER_HOST}/webhook` with `x-api-key`. **The "nothing registered" case is not an error:** PRMS answers `200` with `response: {}` and the meaning in `message` ([WH] §"Retrieval — nothing registered yet").
- **Outputs:** `ServerResponseDto` with `data.registered: boolean`, `data.destination: <object | null>`, and `data.message` from PRMS.
- **Permissions:** `@Roles(SecRolesEnum.SYSTEM_ADMIN)` + `RolesGuard`.

**Acceptance criteria**
- [ ] AC.1 — When a destination exists, `data.registered` is `true` and `data.destination.url` is the URL on file.
- [ ] AC.2 — When **nothing** is registered, the endpoint returns a success envelope with `data.registered: false` and `data.destination: null` — **not** a `404` and **not** an error.
- [ ] AC.3 — `registered` is derived from the **emptiness of `response`**, never from the HTTP status, which is `200` in both cases.
- [ ] AC.4 — A caller without `SYSTEM_ADMIN` receives `403`; unauthenticated receives `401`.

**Scenario: Nothing registered yet**
- GIVEN PRMS returns `200` with `{"ok": true, "response": {}, "message": "No webhook endpoint registered for this platform."}`
- WHEN a System Admin reads the destination
- THEN the response is a success envelope with `registered: false` and `destination: null`
- AND the PRMS `message` is carried through
- BUT it must NOT be reported as a failure, an error, or a `404`
- AND IT MUST NOT infer "registered" from the `200` status.

---

### R-PWH-003 — Accept and acknowledge a delivery before doing anything else

- **As** PRMS
- **I want** STAR to acknowledge my delivery as soon as it is stored
- **So that** a slow consumer is not read as a failed one and I do not send retries nobody needed ([WH] §5).

**Details**
- **Inputs:** `POST <callback path>`; header `x-prms-delivery-id`; JSON body per [WH] §4 (`result_id`, `external_reference`, `decision`, `decided_at`, optional `justification`, `data`).
- **Behavior:** authenticate the secret (R-PWH-004) → persist the delivery verbatim (R-PWH-005) → **return `2xx`**. Correlation and verdict application (R-PWH-007, R-PWH-008) happen **after** the response is produced and are never awaited by the request.
- **Outputs:** a minimal `2xx` body. The response is an acknowledgement, not a report.
- **Errors:** an invalid or missing secret is the **only** non-2xx outcome for a request that reaches the handler (R-PWH-004).
- **Permissions:** **none** — the route is excluded from `JwtMiddleware`. The secret is the whole authentication.

**Acceptance criteria**
- [ ] AC.1 — A well-formed delivery with a valid secret is answered `2xx`, and the delivery row exists in the database at the moment the response is produced.
- [ ] AC.2 — The acknowledgement **does not await** correlation or verdict application: with the downstream step stubbed as a promise that never settles, the handler still resolves. *(Falsifiability rule 2 — a synchronous stub cannot exercise this; the stub must be deferred.)*
- [ ] AC.3 — A body that fails to parse against the expected shape is still **stored and answered `2xx`** (see R-PWH-005 AC.3). PRMS retrying a payload STAR cannot read would change nothing.
- [ ] AC.4 — An exception raised anywhere in the post-acknowledgement work does **not** turn the already-sent acknowledgement into a `5xx`, and is logged.
- [ ] AC.5 — The handler's own work is bounded well inside the 15 s PRMS timeout; the only I/O before the acknowledgement is the dedupe read and the insert, in one transaction.

**Scenario: Store then acknowledge**
- GIVEN a valid secret and a well-formed delivery
- WHEN PRMS posts it
- THEN a delivery row is written and a `2xx` is returned
- AND the verdict application runs afterwards
- BUT it must NOT delay the `2xx` on correlation, on the result lookup, or on any write to `results`
- AND IT MUST return `2xx` even when the post-acknowledgement work throws.

---

### R-PWH-004 — Authenticate the callback with a shared secret in the path

- **As a** System Admin
- **I want** the public callback to be unguessable and to refuse everything else
- **So that** an unauthenticated write endpoint does not become an open door — [WH] confirms `x-prms-signature` is **reserved and not sent today**, so no signature can be verified.

**Details**
- **Behavior:** the callback path carries a secret segment sourced from a new `ARI_*` environment variable. Comparison is constant-time and length-checked. A wrong or missing secret yields `404` — the path does not admit that it exists.
- **Permissions:** the `JwtMiddleware` exclusion covers **only** the callback subtree. The registration endpoints of R-PWH-001/002 stay JWT + `SYSTEM_ADMIN`.

**Acceptance criteria**
- [ ] AC.1 — A request to the callback path with a wrong secret returns `404` and **writes no delivery row**.
- [ ] AC.2 — A request with the correct secret and **no** `Authorization` header is accepted — proving the exclusion is in force.
- [ ] AC.3 — The registration endpoints (R-PWH-001/002) return `401` without a token, proving the exclusion is **not** over-broad. *(This is the falsifier for a glob that swallows the sibling route.)*
- [ ] AC.4 — The secret never appears in any log line, error message, Swagger example, or `ServerResponseDto.path`. **This is not free, and it is not three edits:** three wrappers read `request.url` at **FIVE** sites — `logging.interceptor.ts:29` (one, assigned to a variable) · `response.interceptor.ts:50` **and `:73`** (two, both inline: envelope and logger) · `global.exception.ts:31` **and `:36`** (two, both inline: envelope and logger). Because the secret lives *in the path*, `request.url` **is** the secret, and the unmodified behaviour violates this AC on the happy path, every time. Satisfied by one shared redaction helper applied at **all five** sites — design **DD-10 v2**. **The two logger sites (`:73`, `:36`) are the ones that matter most**, and `:36` carries the wrong-secret `404`, which the guard raises before the controller so `GlobalExceptions` handles it end to end. *(Widened at round 2 from two wrappers to three — judge B FC-1. Widened again 2026-09-22 from three sites to five, after the final re-judgment confirmed the "one read site per wrapper" claim false in two of three files — FC2-1, both judges.)*
- [ ] AC.5 — Secret comparison is timing-safe and does not throw on a length mismatch.
- [ ] AC.6 — When the secret variable is unset, the application does not expose an unauthenticated callback: the route refuses every request rather than matching an empty segment.
- [ ] AC.7 — The `2xx` body PRMS receives carries **no** path segment containing the secret, and a wrong-secret `404` logs **no** part of the supplied guess. *(Logging a guess at a credential is logging a credential.)* **AND a request to a route OTHER than the callback still carries its real, unredacted path** — the redaction is scoped to one route prefix, never a blanket change to what the envelope reports. *(This second clause is the round-2 fix for judge A's FC-1: under the draft's `@Res()` mechanism, the callback response had no `data.path` at all, so this AC passed whether or not the redaction worked. DD-10 v2 preserves the envelope precisely so this clause is checkable.)*
- [ ] AC.8 — **AC.2 and AC.3 are evidence only on a harness that runs the real `JwtMiddleware`.** Both existing e2e suites stub `JwtMiddleware.prototype.use` unconditionally (`test/prms-sync.e2e-spec.ts:230-235`, corrected at round 2 from `:228-234`; `test/results-ai-formalize-bulk.e2e-spec.ts:98-109`, which documents that `.overrideProvider` does not take). Under that stub an excluded route and a guarded one are indistinguishable: AC.2 passes vacuously and AC.3 **cannot go red at all**, because the stub injects a user and the tokenless case yields `403`, not `401`. The owning task MUST either build a non-stubbing harness or substitute the gate, and MUST state which. *(Added at Judgment Day round 1, JD-2; renumbered into sequence and citation-corrected at round 2.)*

**Scenario: Wrong secret**
- GIVEN the callback secret is configured
- WHEN a request arrives at the callback path with a different secret
- THEN the response is `404`
- BUT it must NOT create a delivery row
- AND IT MUST NOT reveal, in body or headers, that a callback endpoint exists at that prefix.

**Scenario: The exclusion is narrow**
- GIVEN the callback subtree is excluded from `JwtMiddleware`
- WHEN an unauthenticated request hits the **registration** endpoint
- THEN it is rejected with `401`
- AND IT MUST be rejected for the absence of a token, not for a role.

---

### R-PWH-005 — Record every delivery in an append-only history

- **As a** System Admin (and, later, any persona the UI serves)
- **I want** every single thing the hook sends to be written down
- **So that** the history can be displayed — the owner's requirement is literally *"dejar registrado cada que el hook mande algo porque ese histórico se tiene que mostrar."*

**Details**
- **Behavior:** one row per delivery received, written before the acknowledgement. Rows are **never updated to erase** and never deleted; a later delivery is a new row.
- **Retained per row:** the delivery id, the received timestamp, the environment (`TEST`/`PROD`), the raw body verbatim, the decision, the justification (verbatim, absent when PRMS omits it), `decided_at`, PRMS's `result_id`, the `external_reference` as received, the resolved STAR `result_id` (nullable), and a **correlation outcome**.
- **Correlation outcome vocabulary:** `CORRELATED` · `UNKNOWN_REFERENCE` (a reference that matches no live result) · `NO_REFERENCE` (`external_reference` absent or `null`) · `MALFORMED` (the body does not satisfy the contract shape) · `DUPLICATE` (R-PWH-006).

**Acceptance criteria**
- [ ] AC.1 — A correlated delivery produces exactly one row with `CORRELATED` and the resolved STAR `result_id`.
- [ ] AC.2 — A delivery whose `external_reference` matches **no** live result produces a row with `UNKNOWN_REFERENCE` and a null STAR `result_id`, and is answered `2xx`.
- [ ] AC.3 — A **malformed** body (missing `decision`, unparseable `decided_at`, `decision` outside `APPROVE`/`REJECT`) produces a row with `MALFORMED` carrying the raw body, and is answered `2xx`.
- [ ] AC.4 — A delivery with `external_reference: null` produces a row with `NO_REFERENCE` and is answered `2xx`.
- [ ] AC.5 — `justification` is stored **byte-identical** to what PRMS sent, and is stored as absent (`NULL`) — never as an empty string — when PRMS omits it. [WH] §4: *"Omitted entirely when there is none — never an empty string."*
- [ ] AC.6 — `decision` is stored verbatim as `"APPROVE"` / `"REJECT"`, **not** normalized to past tense.
- [ ] AC.7 — No code path updates a stored row's decision, justification, `decided_at`, or raw body after insert. *(The row's processing state may change; its content may not.)*
- [ ] AC.8 — The history is queryable in received order for a given STAR result **and** across all results, including uncorrelated rows.

**Scenario: A delivery that correlates to nothing**
- GIVEN a delivery whose `external_reference` is `"STAR-does-not-exist"`
- WHEN PRMS posts it
- THEN a row is written with correlation outcome `UNKNOWN_REFERENCE` and no STAR result
- AND the response is `2xx`
- BUT it must NOT be dropped, and it must NOT raise an error to PRMS
- AND IT MUST retain the raw body exactly as received.

**Scenario: A malformed body**
- GIVEN a body missing `decision`
- WHEN PRMS posts it
- THEN a row is written with correlation outcome `MALFORMED` and the raw body retained
- AND the response is `2xx`
- BUT it must NOT apply any verdict
- AND IT MUST NOT crash the endpoint or leave the request unanswered.

---

### R-PWH-006 — Deduplicate on `x-prms-delivery-id`

- **As** STAR
- **I want** a repeated delivery to be visible but applied once
- **So that** a retry after a timeout does not double-apply a verdict ([WH] §5 *Retries*).

**Details**
- **Behavior:** before applying, look for an existing non-duplicate row with the same delivery id, inside the same transaction as the insert. If one exists, the new delivery is recorded as `DUPLICATE` and **no verdict is applied**.
- **Scope this rule cannot reach (KZ-017):** a transactional read does not make two *simultaneous* deliveries of the same id impossible. [WH] §5 spaces retries at 1 / 2 / 4 / 8 minutes and checks once per minute, so simultaneity is not a reachable state under the published contract. This is stated, not assumed away.

**Acceptance criteria**
- [ ] AC.1 — The same `x-prms-delivery-id` delivered twice produces **two** rows and **one** applied decision.
- [ ] AC.2 — The second row carries correlation outcome `DUPLICATE` and points at the row it repeats.
- [ ] AC.3 — The second delivery is answered `2xx` — a repeat is not an error.
- [ ] AC.4 — A delivery **without** the `x-prms-delivery-id` header is recorded (it cannot be deduplicated) and is answered `2xx`; it is never treated as a duplicate of another.
- [ ] AC.5 — Two deliveries with **different** ids but identical bodies are **both** applied. *(The falsifier for a dedupe keyed on body hash instead of delivery id.)*
- [ ] AC.6 — The dedupe branch is proven able to fail: removing it makes AC.1 red. **The red must be observed** (K-004/KZ-014).
- [ ] AC.7 — On `ER_LOCK_DEADLOCK` (1213) or `ER_LOCK_WAIT_TIMEOUT` (1205) inside the dedupe transaction, **`prms-webhook-delivery.repository.ts` — the sole owner of the transaction** — retries **once**, then fails loud. The transaction never silently drops a delivery. *(Added at round 2 — judge B FC-7: design §6.3 step 3b existed with no owning requirement. Owner pinned to the repository 2026-09-22 — FC2-5: this AC said "delivery service" while DD-5 said repository and §3.1 split the transaction across both.)*

**Scenario: The same delivery arrives twice**
- GIVEN delivery `4172` has been stored and applied
- WHEN delivery `4172` arrives again
- THEN a second row is written with outcome `DUPLICATE`
- AND the response is `2xx`
- BUT it must NOT apply the verdict a second time
- AND IT MUST remain visible in the history as a repeat, not be silently discarded.

---

### R-PWH-007 — Correlate a delivery to the live STAR result

- **As** STAR
- **I want** `external_reference` resolved to the right result row
- **So that** a verdict lands on the record it is about and never on a snapshot.

**Details**
- **Behavior:** `external_reference` is the string form of `result_official_code` (C-5). Resolution uses **all four** predicates of the repo convention — `platform_code = STAR AND result_official_code = CAST(external_reference) AND is_active = TRUE AND is_snapshot = FALSE` (`results.util.ts:38,41-43`). `platform_code` is set first (`:38`, defaulting to `ReportingPlatformEnum.STAR`) and is the discriminator that makes the official code selective. *(JD-8: the reviewed draft cited `:41-43` only and dropped `platform_code`.)*
- A reference that is non-numeric, or resolves to no live row, is `UNKNOWN_REFERENCE` (R-PWH-005 AC.2).

**Acceptance criteria**
- [ ] AC.1 — A delivery for official code `1441061` resolves to the live row, **not** to a snapshot row bearing the same official code. *(Fixture must contain both, or it cannot discriminate — KZ-004 inert fixture.)*
- [ ] AC.2 — A non-numeric `external_reference` is `UNKNOWN_REFERENCE`, never a database error and never a coerced `0`.
- [ ] AC.3 — Correlation performs **no write** to the `results` table.
- [ ] AC.4 — When more than one live row matches **after all four predicates**, the delivery is recorded with the resolved row **and** a warning is logged naming the ambiguity; it is never silently applied to an arbitrary row.
- [ ] AC.5 — A result on a **different reporting platform** carrying the same official code is **not** matched. *(The falsifier for a query that drops `platform_code`.)*

**Scenario: Snapshot must not win**
- GIVEN a live result and a snapshot both carrying `result_official_code = 1441061`
- WHEN a delivery arrives with `external_reference: "1441061"`
- THEN the delivery correlates to the live row
- BUT it must NOT correlate to the snapshot
- AND IT MUST NOT write anything to the `results` table.

---

### R-PWH-008 — Expose the decision on the result's PRMS sync status

- **As a** consumer of the PRMS sync status (family children 2, 3, 4)
- **I want** the latest Science Program decision on a result
- **So that** a later UI can display the verdict without re-deriving it.

**Details**
- **Behavior:** the existing `GET` status surface (`ResultPrmsSyncStatusReader`) gains an **additive** `last_decision` field: the latest non-duplicate correlated delivery for that result, or `null`.
- **`last_attempt` and `sync_state` are unchanged.** They describe the outbound push; a verdict is a different event (design DD-1).

**Acceptance criteria**
- [ ] AC.1 — For a result with a correlated APPROVE, `last_decision` carries `decision: "APPROVE"`, `decided_at`, and `null` justification.
- [ ] AC.2 — For a correlated REJECT, `last_decision.justification` is the reviewer's text **verbatim**.
- [ ] AC.3 — For a result with no correlated delivery, `last_decision` is `null`.
- [ ] AC.4 — `sync_state` and `last_attempt` return **byte-identical** values before and after this spec for every existing case. *(The falsifier for hijacking the outbound read surface — see design DD-1 and C-11.)*
- [ ] AC.5 — `is_synced_to_prms`, `prms_result_code`, and `prms_phase_id` are **not written** by any code path in this spec.
- [ ] AC.6 — When two decisions exist for one result, `last_decision` is the one with the greater `decided_at`; earlier decisions remain in the history.

**Scenario: A rejection is readable without disturbing the sync state**
- GIVEN a synced result that a Science Program has rejected with a justification
- WHEN the PRMS sync status is read
- THEN `last_decision` reports `REJECT` with the justification verbatim
- AND `sync_state` still reports `synced` and `last_attempt` still reports the outbound attempt
- BUT it must NOT write to `results`, and must NOT change `is_synced_to_prms`
- AND IT MUST leave the earlier decision, if any, in the history.

---

### R-PWH-009 — Keep TEST and PROD destinations separate

- **As a** System Admin
- **I want** environments to be structurally unable to register each other's destinations
- **So that** a developer booting locally cannot silently re-point Dev's callbacks (**K-005**, family R-F2, proposal risk R-2).

**Details**
- **Behavior:** the PRMS host is already one variable per environment (`ARI_PRMS_NORMALIZER_HOST`, C-8). The callback URL to register is a **new, separate** variable per environment. Neither is derived from the other, and neither has a default.
- Every delivery row records the environment it was received in, using the existing discriminator (C-10).

**Acceptance criteria**
- [ ] AC.1 — Registration targets the host in `ARI_PRMS_NORMALIZER_HOST` and there is **no** code path that selects a host from any other source, including a literal.
- [ ] AC.2 — The callback URL comes from its own variable; there is no fallback that constructs it from a request host header. *(A `Host`-derived URL is registrable by whoever calls the endpoint — the failure K-005 names.)*
- [ ] AC.3 — With either variable unset, registration fails loudly with `503` and a message naming the missing variable — never silently to a default.
- [ ] AC.4 — Every delivery row carries `TEST` or `PROD`, resolved by `ARI_IS_PRODUCTION` exactly as `result-prms-sync.service.ts:130` does.
- [ ] AC.5 — Both new variables appear in `.env.example`, commented out. `ARI_PRMS_WEBHOOK_CALLBACK_URL` shows the TEST value, matching the `ARI_PRMS_NORMALIZER_HOST` treatment at `.env.example:36`. **`ARI_PRMS_WEBHOOK_SECRET` shows NO value** — it is a credential and `.env.example` is committed. *(Corrected at Judgment Day round 1, JD-11: the original clause demanded committing the TEST secret.)*

**Scenario: A missing variable fails loudly**
- GIVEN `ARI_PRMS_NORMALIZER_HOST` is unset
- WHEN a System Admin attempts registration
- THEN the response is `503` naming the missing variable
- BUT it must NOT fall back to a hard-coded host, a PROD host, or the request's own `Host` header
- AND IT MUST NOT report success.

---

## 6. Explicit Non-Goals

| # | Not built here | Why |
|---|---|---|
| NG-1 | **Any UI.** No history screen, verdict badge, or rejection display. | A later family manifest row, with its own visual reference. This child is server-only by the manifest's *Closed-Set Rule*. |
| NG-2 | **Re-push or re-open editing on REJECT.** | A product decision nobody has taken — carried as OQ-2. `is_synced_to_prms` currently 409-locks alignment for everyone (family R-F3); changing that is out of scope. |
| NG-3 | **HMAC verification.** | `x-prms-signature` is *"Reserved … Not sent today"* ([WH] §4). Building verification on it would verify nothing. |
| NG-4 | **A reconciliation job.** | `GET /result/:code` polling to recover deliveries PRMS abandoned is a sound follow-up, not v1. |
| NG-5 | **Any change to the outbound push.** | `sync-engine` is untouched apart from the two additive service methods. |
| NG-6 | **Writing `result.prms_result_code` from `data.result_code`.** | The callback does carry it (family OQ-F7, narrowed 2026-09-21), but `sync-engine` owns that column's write path and a second writer has no defined precedence. Recorded verbatim on the delivery row; carried as OQ-4. |
| NG-7 | **New `result_status` values for the verdict.** | Statuses 23/24/25 model STAR's own **pre-push** review and are wired into a transition graph; a verdict is a different axis. Carried as OQ-1. |

---

## 7. Non-Functional Requirements

State only what differs from the inherited defaults (envelope, versioning, audit, `GlobalExceptions`).

### NFR-PWH-001 — Acknowledge inside the delivery timeout
- **Category:** performance / reliability
- **Target:** the callback handler produces its response after **at most two** database round-trips (the dedupe read and the insert, in one transaction) and performs **no** external HTTP call. PRMS abandons at 15 s ([WH] §5).
- **How verified:** unit test with a deferred downstream stub (R-PWH-003 AC.2) + code review that no `await` on correlation precedes the return. **What it cannot reach:** real-world latency under production load — unmeasurable until a public host exists (R-1).

### NFR-PWH-002 — The callback secret is a credential
- **Category:** security
- **Target:** the secret is supplied by environment variable only; is never logged, never returned in a response body, never written to a delivery row, and never appears in a Swagger example. It is rotatable by changing the variable and re-registering ([WH] §1 upsert).
- **How verified:** unit assertions on logger calls + a repository-wide grep gate over the changed files. **What it cannot reach:** a secret leaked through a third-party log shipper or an infrastructure access log — outside the repository.

### NFR-PWH-003 — Every delivery is observable
- **Category:** observability
- **Target:** one `LoggerUtil` line per delivery carrying delivery id, environment, correlation outcome and, when correlated, the STAR official code. Failures in post-acknowledgement work log at `error` with the delivery id.
- **How verified:** unit assertions on the logger; the fields are named in the design.

### NFR-PWH-004 — Retained payload and PII
- **Category:** compliance
- **Target:** the raw body is retained whole. [WH] §4 states `data` is *"the full enriched result document"*, which may carry contributor names and emails. The spec retains it whole in v1 and **declares** that choice rather than filtering silently.
- **How verified:** **no automated gate exists for this class.** Recorded as an accepted risk (§10 DC-8) and carried as OQ-3 for the product owner; PRD OQ-7 (compliance constraints) is the parent question.

### NFR-PWH-005 — The endpoint does not fail the caller for its own reasons
- **Category:** reliability
- **Target:** once the secret is valid, the only outcomes are `2xx` (stored) or a genuine infrastructure failure. Malformed input, unknown references and duplicates are all `2xx`.
- **How verified:** unit tests per R-PWH-005 AC.2–AC.4 and R-PWH-006 AC.3.

---

## 8. Data Requirements

- **New entity:** `result_prms_sync_history` (append-only) *(renamed to `result_prms_sync_history` by the 2026-09-23 Pivot — T-01b)*. Nullable STAR `result_id` — **the reason a new table exists at all** (C-4).
- **Indexes:** on `delivery_id` (dedupe lookup), on the STAR `result_id` (per-result history), on `received_at` (global history order). Named per the `idx_<table>_<purpose>` convention.
- **No column is added to `results`.** No column is added to `result_prms_sync_log`.
- **Migration:** one, `<timestamp>-createPrmsWebhookDeliveryTable.ts`, append-only under `src/db/migrations/` (335 files at `e0c8c443`; the count lives in the folder, never in a document — K-015/KZ-005).
- **No backfill.** There is no history to recover: [WH] §3 — *"A decision taken while you have no destination registered is not replayed later."*
- **No `@OpenSearchProperty`** — the delivery history is not search-surface data in v1.

---

## 9. API Surface Delta

`main.ts:54-57` enables URI versioning with **no** `defaultVersion` (C-14). None of these handlers declares `@Version(...)`, so the reachable paths carry **no** `/v1` segment. A client, test, or document written against `/api/v1/...` will `404`.

| Method + path | Auth | Roles | Requirement |
|---|---|---|---|
| `POST /api/prms-webhook` | JWT | `SYSTEM_ADMIN` | R-PWH-001 |
| `GET /api/prms-webhook` | JWT | `SYSTEM_ADMIN` | R-PWH-002 |
| `POST /api/prms-callback/:secret` | **none** (excluded from `JwtMiddleware`) | — | R-PWH-003, R-PWH-004 |
| `GET /api/results/:result-code/prms-sync` | JWT | existing | R-PWH-008 (additive `last_decision`; existing fields unchanged) |

The two paths are **disjoint at the top level** — `prms-webhook` and `prms-callback`, neither a prefix of the other — so no exclusion glob over one can reach the other. R-PWH-004 AC.3 is the test that proves it.

> **Corrected at Judgment Day round 1 (JD-4).** This table previously nested both routes under `prms-webhook/` while calling them *"disjoint below `prms-webhook/`"* — a contradiction: they shared that prefix, which is the exact property the separation exists to eliminate. `main.routes.ts:413-417` records this repo already paying for an over-broad exclusion glob once (*Pivot Record #1*). Disjoint **top-level** prefixes make the boundary structural instead of careful.

Swagger (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`, `@ApiBody`, `@ApiParam`) is required on every handler. The callback handler is documented **without** `@ApiBearerAuth` and with the secret shown as a placeholder, never a real value.

---

## 10. Defect Classes and Their Gates

Named before the gates were chosen, per the methodology's *"name the defect classes, then choose the gate against them."*

| # | Defect class this spec can produce | Gate | Can it go red? |
|---|---|---|---|
| DC-1 | Correlation resolves the wrong row (snapshot, inactive, coerced non-numeric) | `npm test -- --silent` — unit specs whose fixture holds **both** a live and a snapshot row for one official code | Yes: point the query at `is_snapshot = true` → red |
| DC-2 | A verdict is applied twice | unit spec per R-PWH-006 AC.1 | Yes: delete the dedupe branch → red (**must be observed**, K-004) |
| DC-3 | Auth bypass — callback reachable without the secret, **or** the exclusion swallows the registration route | e2e spec hitting both paths with and without a token — **but only on a harness that does NOT stub `JwtMiddleware.prototype.use`.** Both existing e2e suites do stub it, so the default harness gates nothing here (R-PWH-004 AC.8). Substitute where the harness cannot be built: a unit assertion over `app.module.ts`'s exclusion array plus the NestJS path-normalization behaviour cited at design **P-7** | Yes, **only on a non-stubbing harness**: widen the exclusion entry from `prms-callback(.*)` to a pattern that also matches the registration route, e.g. `prms-(.*)`, → the `401` assertion on `R-PWH-004 AC.3` reddens. *(Corrected at round 2 — Judgment Day round 2, judge A FC-8: under the corrected disjoint top-level paths, `prms-webhook(.*)` no longer widens anything relative to `prms-callback(.*)`; it is a swap, not a widening, and would also un-exclude the callback itself.)* Under the stub it can never redden — that is the defect JD-2 found |
| DC-4 | Schema defect — wrong nullability, missing index, migration that will not revert | entity metadata spec (`result-prms-sync-log.entity.spec.ts:97-98`) + a **migration spec under `src/db/migration-specs/`** (analogue: `1789479131116-createResultPrmsSyncLogTable.spec.ts`; they are **not** siblings of the migration — JD-9) + `npm run migration:test:execute` then `npm run migration:test:revert` against the disposable TEST scratch schema | Yes: flip `nullable` on the entity → red. *(JD-10: this row previously named `npm run migration:run`, which **does not exist** — `node -e "…scripts['migration:run']"` → `undefined`. A gate that cannot be invoked is not a gate, K-004.)* |
| DC-5 | **Compiler-only defect** — a value of the wrong shape assigned into a typed contract | `npm run build` — `tsconfig.build.json` **excludes `**/*spec.ts`**, so the test runner structurally cannot see this class | Yes: assign a wrong-shaped literal → build red, tests still green |
| DC-6 | The acknowledgement waits on downstream work | unit spec with a **deferred** stub (R-PWH-003 AC.2) | Yes: `await` the downstream call → the handler never resolves → red. A synchronous stub would pass either way and is disqualified |
| DC-7 | The secret leaks into a log, a response, or a stored row | unit assertions on logger arguments + `grep` over the changed files for the variable name | Yes: log the secret → red |
| DC-8 | **PII retained without a decision** — `data` kept whole may carry contributor PII | **No automated gate.** Substitute: a product-owner answer at the §13 HITL gate (OQ-3) | **Accepted risk**, recorded here rather than left implicit |
| DC-9 | **Live delivery never arrives** — wrong URL, unreachable host, refused registration | **No gate reachable from inside the CIAT network** (C-15, C-16). Substitute: a human end-to-end check after a public HTTPS host exists, owned by whoever owns the AWS deployment | **Accepted risk**, and the spec says so rather than letting a green local suite stand in for it |
| DC-10 | A regression in the existing sync-status read surface | R-PWH-008 AC.4 — byte-identical `sync_state` / `last_attempt` before and after | Yes: route `last_attempt` through the delivery table → red |
| **DC-11** | **The secret leaks through the inherited response envelope** — `LoggingInterceptor`, `ResponseInterceptor` and `GlobalExceptions` all three read `request.url`, and the secret is in the path | A unit spec asserting **six** things, not two *(widened 2026-09-22 at the T-08 amendment — the defect class is unchanged; its gate was narrower than the class. The first two are:* (a) `data.path` and the logger arguments for the **callback** route carry no segment beyond the route prefix, on both the `2xx` and the wrong-secret `404`; (b) `data.path` for a **non-callback** route is **unchanged** — still the real URL. *(Widened at round 2, judge B FC-1: assertion (a) alone is vacuous under a mechanism that drops the envelope; assertion (b) is what makes the redaction's scope, not just its presence, falsifiable.)* | Yes: remove the redaction → assertion (a) reddens. Yes: over-widen the redaction to match every route → assertion (b) reddens. **Added at Judgment Day round 1 (JD-1), widened at round 2, widened again 2026-09-22.** The four added at the T-08 amendment, each found by a Reviewer round against a gate that could not reach it: **(c)** a mixed-case callback path (Express routes case-insensitively by default) must not leak; **(d)** a **real** URL-bearing `NotFoundException` must leak nothing through `errors` or the first `_error` logger argument — a synthetic substitute is disqualified; **(e)** the path token must end at the first character outside `[A-Za-z0-9_-]` (**C-T08**) so surrounding text survives byte-for-byte; **(f)** absolute-URL forms carrying the callback prefix must be redacted. See [`./tasks.md`](./tasks.md) T-08 *Falsifier* for the executable form and [`./execution.md`](./execution.md) → *HALT: T-08* for why. |
| **DC-12** | **A delivery is silently lost to a MySQL lock conflict** — the dedupe transaction's `FOR UPDATE` read can deadlock under genuine simultaneity (design DD-5), and the current design has no retry | A unit spec that forces the manager's query call to reject with a MySQL `ER_LOCK_DEADLOCK` (1213) or `ER_LOCK_WAIT_TIMEOUT` (1205) error and asserts the transaction is retried once before failing | Yes: remove the retry → a forced deadlock error propagates unretried and the delivery is lost, reddening R-PWH-006 AC.7. **Added at round 2 — Judgment Day round 2, judge B FC-7: this class had no gate in the reviewed draft** |

**Two classes have no automated gate (DC-8, DC-9), and both are stated rather than substituted away.** DC-9 is the spec's dominant risk and the reason R-1 gates verification, not implementation.

---

## 11. Assumptions, Dependencies, Risks

### Assumptions (not already in the PRD)
- **A-1.** PRMS resolves STAR's platform from the API key alone; STAR never names itself in a registration body ([WH] §"Authentication").
- **A-2.** `external_reference` on a callback is byte-identical to what STAR sent ([WH] §"Before you start"), so `String(result_official_code)` round-trips.
- **A-3.** The `ARI_CLARISA_API_KEY` `app_config` row is present and active in both environments (family OQ-F8, verified by the product owner 2026-09-14).

### Dependencies
- `bilateral/prms-sync/sync-engine` — supplies `PrmsNormalizerService`, the host variable, and the `external_reference` convention. **Manifest status: `pending`.** Per the family-membership rule this is a **warning, not a block**: the code this child extends is present on this branch (C-8, C-5), it is the manifest row that is not yet closed.
- An infrastructure decision on R-1.

### Risks

| ID | Risk | Mitigation |
|---|---|---|
| **R-1** | **Hard blocker for verification.** The callback needs a public HTTPS host. Dev resolves to `192.168.199.32`, RFC1918 (C-15), and PRMS refuses private ranges at registration ([WH] §1). Without a public path every delivery times out, retries 5 times over ~15 min, and is **abandoned, never replayed**. *Scope this check cannot reach (KZ-017): it is DNS + an HTTPS response from inside the CIAT network. It does not prove what AWS sees — but a private A record is not routable from AWS.* | Gates **verification**, not implementation. Every requirement above is unit/e2e-verifiable; DC-9 is recorded as an accepted risk with a human owner. |
| **R-2** | **One platform, one destination.** Local and Dev share the TEST key, so there is exactly one TEST callback URL for both. A dev tunnel takes Dev's callbacks with it. | R-PWH-009: the callback URL is its own variable per environment, never derived. Coordination cost stated, not engineered away. |
| **R-3** | The callback is **unsigned**; authentication rests entirely on the path secret. | NFR-PWH-002 + R-PWH-004. The secret is an `ARI_*` variable, never logged, rotatable by re-registering. |
| **R-4** | **Nothing catches up.** No backlog, no replay. Every window with a wrong destination is an unrecoverable loss of verdicts. | R-PWH-002 exists precisely so the destination is checkable before results go under review. |
| **R-5** | `sync-engine` has never run live (C-17), so no result has actually reached PRMS. | This child can be built and unit-verified without it; an end-to-end proof needs both R-1 and a live push. |
| **R-6** | **K-016 — TTL-cached configuration.** The API key arrives through `app_config`, which is TTL-cached; re-saving restarts the window. | Any verification step that changes the key **must state the TTL/restart window**; an empty read is not a failure. |
| **R-7** | **K-005 — a collapsed environment discriminator is silent.** Auto-registration at boot would let any developer re-point Dev's callbacks with no error anywhere. | Rejected explicitly in design DD-2; R-PWH-009 AC.2 is its gate. |

---

## 12. Open Questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| **OQ-1** | **How should the verdict be represented for the user?** This spec exposes it as read-only state (R-PWH-008) and adds **no** `result_status` value, because 23/24/25 model STAR's own pre-push review. If a verdict must become a lifecycle status, that is a new transition graph. | Product owner | Before the UI family row |
| **OQ-2** | **Does a REJECT reopen editing?** `is_synced_to_prms` 409-locks Pool Funding Alignment for everyone including `SYSTEM_ADMIN` (family R-F3). If a rejected result must be fixable, that gate has to learn about verdicts. | Product owner | Before any re-push work |
| **OQ-3** | **What may STAR retain from `data`?** v1 stores the enriched document whole (NFR-PWH-004). It may contain contributor PII. Parent: PRD OQ-7. | Product owner + whoever owns compliance | Before PROD registration |
| **OQ-4** | **May the callback populate `result.prms_result_code`?** The callback carries `data.result_code` (family OQ-F7). NG-6 says no in v1 — `sync-engine` owns that column and two writers have no precedence rule. | Product owner + `sync-engine` owner | Before `sync-engine` closes |
| **OQ-5** | **Who may read the history, and at what grain?** Contributor, Center Admin, PI and `SYSTEM_ADMIN` do not obviously get the same view. v1 exposes only `last_decision` on the existing per-result status endpoint; no global history endpoint is built. **Sequencing decided by the owner 2026-09-22 — the substance is NOT decided.** Asked at the Phase 3 gate whether to widen this child with a history read endpoint now that the visual requirements exist, the owner chose to **finish this child as specified first, then open the visual proposal**: *"podemos trabajar primero lo que tienes entonces y una vez se termine comenzamos con la propuesta visual."* So NG-1 stands and no endpoint is added here. **What remains open is the question itself** — who reads the history and at what grain — and it now belongs to the future UI family row, which must answer it before it can specify a read surface. | Product owner | **Before the UI family row** — which starts after this child's execution completes |
| **OQ-6** | **What is the PROD callback host?** No PROD hostname resolves from here (C-16). | Whoever owns the AWS deployment | Before PROD registration — **this is R-1** |

---

## 13. Requirement ID Index

| ID | Title | Gated by |
|---|---|---|
| R-PWH-001 | Register STAR's callback destination with PRMS | DC-3, DC-5, DC-7 |
| R-PWH-002 | Read back the destination currently on file | DC-3, DC-5 |
| R-PWH-003 | Accept and acknowledge a delivery before doing anything else | DC-6 |
| R-PWH-004 | Authenticate the callback with a shared secret in the path | DC-3, DC-7 |
| R-PWH-005 | Record every delivery in an append-only history | DC-1, DC-4 |
| R-PWH-006 | Deduplicate on `x-prms-delivery-id` | DC-2, DC-12 |
| R-PWH-007 | Correlate a delivery to the live STAR result | DC-1 |
| R-PWH-008 | Expose the decision on the result's PRMS sync status | DC-10 |
| R-PWH-009 | Keep TEST and PROD destinations separate | DC-3 |
| NFR-PWH-001 | Acknowledge inside the delivery timeout | DC-6 |
| NFR-PWH-002 | The callback secret is a credential | DC-7 |
| NFR-PWH-003 | Every delivery is observable | — |
| NFR-PWH-004 | Retained payload and PII | **DC-8 — accepted risk, no automated gate** |
| NFR-PWH-005 | The endpoint does not fail the caller for its own reasons | DC-1, DC-2 |

---

## 14. Sign-off

- [ ] Engineering lead — Juan Cadavid
- [ ] MEL / product owner — *(OQ-1, OQ-2, OQ-3, OQ-4, OQ-5)*
- [ ] Security review — **required**: this spec adds the application's first public, unauthenticated **write** endpoint and a new credential.
- [ ] DevOps — **required**: R-1 / OQ-6, a publicly reachable HTTPS path per environment.
