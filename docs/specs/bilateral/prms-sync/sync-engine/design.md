# Design — Bilateral / PRMS Sync Engine

- **Module:** `bilateral` → `prms-sync` (new tool `domain/tools/prms-normalizer/` + new entity module `domain/entities/result-prms-sync/`)
- **Spec id:** `2026-09-prms-sync-engine`
- **Status:** `draft`
- **Owner:** ARI / David Casañas
- **Linked requirements:** [`./requirements.md`](./requirements.md) · **Field mapping:** [`./homologation.md`](./homologation.md)
- **Linked TRD:** [`../../../trd/trd.md`](../../../trd/trd.md) §9.1 (integrations), §7.1 (result lifecycle)
- **Last updated:** `2026-09-14`

---

## 1. Goals & non-goals

**Goals**
1. Push an eligible result to the PRMS Normalizer and record the outcome durably (R-PRMS-001, 009, 011, 012).
2. Build a complete, contract-correct payload for **all four** representable types (R-PRMS-003…007).
3. Make "synced" mean *PRMS accepted this row* — never *the HTTP status was 2xx* (R-PRMS-011).
4. Keep every refusal a **data entry**, so lifting one costs no builder change (R-PRMS-002, family R-F6).
5. Emit nothing a reporting user did not supply (R-PRMS-008 / P-1).

**Non-goals:** client work; capture of the sourceless fields; decision webhooks; Bulk Ingest; un-sync; KP/OICR mapping.

---

## 2. Architecture

### 2.0 Tier decision — **LITE**

Modular monolith, one deployable, one primary database, one synchronous outbound call. **No escalation trigger is present**: no independent scaling need, one team, no divergent availability target, no regulatory isolation, and the response measures in §2.4 are met by a direct call. A queue (family proposal option B) was rejected — the Normalizer is already async downstream (R-F1); our own queue would stack a second async hop before any verdict-capture phase exists to justify it. **Revisit condition:** if bulk sync or automatic retry enters scope, re-run the gate.

### 2.1 Composition

Two modules, split on the child guide's own decision tree: the **tool** wraps the external system and owns no table; the **entity module** owns a table and the HTTP edge.

| Path | Responsibility |
|---|---|
| `domain/tools/prms-normalizer/prms-normalizer.module.ts` | Nest module; imports `HttpModule` |
| `domain/tools/prms-normalizer/prms-normalizer.service.ts` | Transport only — extends `BaseApi`, sends the envelope, returns a parsed outcome. **No DB access** |
| `domain/tools/prms-normalizer/builders/common-fields.builder.ts` | The `data` block shared by every type (homologation §4) |
| `domain/tools/prms-normalizer/builders/{capacity-sharing,innovation-development,policy-change,innovation-use}.builder.ts` | One per type; each returns its type-specific block |
| `domain/tools/prms-normalizer/builders/payload.builder.ts` | Selects the type builder and assembles the envelope |
| `domain/tools/prms-normalizer/homologation/` | **Outbound** maps — `indicator-type.homologation.ts` (new), `length-training.homologation.ts`, `center.homologation.ts` |
| `domain/tools/prms-normalizer/dto/` | Normalizer request/response shapes |
| `domain/tools/prms-normalizer/enum/prms-sync-outcome.enum.ts` | The outcome vocabulary (§5.4) |
| `domain/entities/result-prms-sync/result-prms-sync.module.ts` | Nest module; registered in `entities.module.ts` **and** `main.routes.ts` |
| `domain/entities/result-prms-sync/result-prms-sync.controller.ts` | HTTP edge |
| `domain/entities/result-prms-sync/result-prms-sync.service.ts` | Orchestration: eligibility → **claim** → build → send → interpret → persist, with a persist branch on **every** refusal (§5.0) |
| `domain/entities/result-prms-sync/eligibility/sync-gate.ts` | The enumerated refusal list (§5.1) |
| `domain/entities/result-prms-sync/entities/result-prms-sync-log.entity.ts` | The append-only log |
| `domain/entities/result-prms-sync/repositories/` | Aggregate read for payload assembly |

> **Why two modules.** Child guide §3: *"Owns an entity/table?"* → `entities/`; *"Wraps an external system?"* → `tools/`. This feature does both. Keeping them apart means the builders are unit-testable with no database and the transport is substitutable in tests — the **testability tactic** behind DC-1/DC-2/DC-4/DC-5 (all of which assert on serialized JSON produced without any HTTP).

### 2.2 Reuse

| Reused | From | Note |
|---|---|---|
| `BaseApi` | `tools/core/base-api.ts` | With the §2.3 caveat — this is the design's sharpest edge |
| `DeliveryModalityHomologation` | inbound `prms/homologation/` | Inverted; the one bijective map (homologation §12) |
| `SessionLengthHomologation`, `DegreeHomologation` | inbound | Combined, not inverted alone (§12.2) |
| `AcronymExContractEnum` | inbound `enum/rsult-type.enum.ts` | Drives the centre map, keep `.toUpperCase().trim()` |
| `AppConfigService.getEnv` | `entities/app-config/` | The API key, read per request |
| `SyncProcessLogService` | `entities/sync-process-log/` | **Not used in v1** — see DD-14 |
| `ResponseUtils.format`, `LoggerUtil`, `RolesGuard`, `ResultOwnerGuard`, `@ResultOwner()`, `RESULT_CODE` | `shared/` | Standard edge wiring. ⚠️ **`ResultStatusGuard` is deliberately NOT reused** — DD-11b |

> ⚠️ **Explicitly NOT reused:** `indicator.homologation.ts` (numeric PRMS ids vs Normalizer strings — different vocabulary) and `prms.opensearch.service.ts:564` as precedent for the disaggregation flag (family **R-F7**).

### 2.3 Transport — the one decision that needs care

`BaseApi.postRequest` pipes every request through a **private** `handleError` (`base-api.ts:56-71`) whose `returnError` defaults to `false` and is not exposed. Because axios throws on non-2xx, a `401`, a `422` carrying `rejected[]`, and a `503` all collapse to **`null`** after being logged — destroying exactly the evidence R-PRMS-009 AC.4 and R-PRMS-011 require.

**Decision (DD-3):** keep extending `BaseApi` for consistency, and pass an Axios config with `validateStatus: () => true` on this call, so axios never throws. Every HTTP response then arrives intact, and `null` comes to mean unambiguously *"no HTTP response at all"* — a clean tri-state:

| Observed | Meaning | Recorded as |
|---|---|---|
| `AxiosResponse` any status | PRMS answered; interpret per §5.3 | `ACCEPTED` / `REJECTED_BY_PRMS` / `AUTH_FAILED` / `RETRYABLE` |
| `null` | Network error or the 30 s timeout tripped | `TRANSPORT_FAILED` |

> ⚠️ **`base-api.ts:89` reads `config ?? this._defaultConfig` — a supplied config REPLACES the
> default wholesale.** It does not merge: there is no spread in `request()`, `HttpModule` is
> registered bare everywhere (so there is no instance-level axios default either), and
> `base-api.spec.ts:112-122` asserts the verbatim pass-through. A bare
> `{ validateStatus: () => true }` therefore drops **all** of `_defaultConfig` at once —
> `auth`, the `Authorization: Bearer` header, any `customHeaders`, and the legacy-SSL `httpsAgent`.
>
> **This is the design's highest-risk line, and the Step 2.3 challenge found a concrete breakage in
> the first draft** (§2.5). **Required form:** spread `_defaultConfig` (a `protected get`, so
> reachable from the subclass), **re-spread its `headers` object explicitly** — otherwise the
> nested `headers` is itself overwritten — and layer `validateStatus` on top. Never pass a bare
> override.

### 2.4 Quality-attribute scenarios (six-part, compact)

| # | Scenario | Tactic |
|---|---|---|
| **QA-1** | Contributor → triggers a sync on the endpoint + Normalizer during normal operation ⇒ one round-trip, outcome returned, measured by **no request exceeding 35 s** (BaseApi's 30 s timeout + DB writes) | *Bound execution times* |
| **QA-2** | Operator → inspects any persisted artifact on logs + `result_prms_sync_log` during any state ⇒ the API key is unrecoverable, measured by **zero occurrences of the key value** in log output and in the stored payload column | *Limit exposure; audit logging* |
| **QA-3** | A non-production deployment → attempts a sync on the host config during local/dev/staging ⇒ only TEST is reachable, measured by **no PROD URL constructible from the code path** | *Defer binding (configuration)* |
| **QA-4** | Normalizer → is unreachable or slow on the sync service during an attempt ⇒ the attempt is recorded and the result stays unsynced, measured by **a `TRANSPORT_FAILED` row existing and `is_synced_to_prms` unchanged** | *Detect faults (timeouts); graceful degradation* |
| **QA-5** | ARI engineer → lifts a gated type on the gate list during normal development ⇒ that type syncs, measured by **one list entry removed and zero builder files changed** | *Defer binding; localize changes* |
| **QA-6** | Support → is handed a PRMS `requestId` on `result_prms_sync_log` during triage ⇒ the exact attempt is located, measured by **one indexed query returning the attempt with its verbatim response** | *Structured logging with correlation ids* |
| **QA-7** | Two clients → trigger a sync for the same result within the same second on the endpoint during normal operation ⇒ exactly one ingest is sent, measured by **one `ACCEPTED` row, one `409`, and exactly one outbound POST observed** | *Transactions (atomic claim); bulkhead via the `IN_FLIGHT` token* |

**Not architecturally significant here:** cost (no new infrastructure) and scalability *in the throughput sense* — there is no load target. ⚠️ **Concurrency IS architecturally significant** and is handled by the claim-then-settle protocol in §5.1b (QA-7). An earlier draft dismissed it here while `requirements.md` R-PRMS-013 AC.2 demanded at-most-once — Judgment Day **JD-2**, confirmed by both judges.

**Trade-off disclosed:** *Availability ↔ Simplicity.* No retry and no circuit breaker in v1. A failed attempt is recorded and re-driven manually by child 3. Automatic retry is rejected while **no un-sync path exists** — a retry that races a partially-applied ingest could duplicate a result in PRMS, which is worse than a manual retry.

### 2.5 Step 2.3 — Reversion challenge: **one concrete breakage found and fixed**

**Trigger:** DD-3 disables `BaseApi`'s error-swallowing for this call. Question asked: *"what does
this break?"*

**Finding — the first draft was wrong.** Passing a bare `{ validateStatus: () => true }` replaces
`_defaultConfig` entirely, so the POST would have gone out with **no `Authorization` header, no
`auth`, and no legacy-SSL `httpsAgent`**. Two failure modes, and the second is the dangerous one:

| Mode | Why it matters |
|---|---|
| Unauthenticated request | PRMS answers a clean `401` — which this design would record as `AUTH_FAILED` and a human would read as *"the key is wrong"*. **The bug disguises itself as a deliberate observation.** |
| TLS handshake failure (if the host needs the legacy agent) | Collapses to `null` → recorded as `TRANSPORT_FAILED`. **A self-inflicted transport error, indistinguishable from a genuine outage** — it pollutes the exact `null = no HTTP response` invariant DD-3 exists to establish |

**Applied:** §2.3 now mandates spreading `_defaultConfig` and re-spreading its `headers` before
layering `validateStatus`. Consistent with existing practice — `tip-integration.service.ts:120-127`
manually rebuilds the Bearer header for the same reason; no call site in the repo relies on a merge
that does not exist.

**Also confirmed by the challenge:** `validateStatus` does not interact with the rxjs `timeout(30000)`
(they operate on different lifecycles), and the change is genuinely **call-scoped** — `handleError`
stays private and untouched, so no other `BaseApi` consumer or test is affected. One side effect
worth knowing: `handleError`'s "Axios error" log line stops firing for HTTP-level errors on this
call, since axios no longer treats them as errors. That is intended, and §9's `LoggerUtil` lines
replace it.

---

## 3. Data model

**New table `result_prms_sync_log`** (append-only), extending `AuditableEntity`:

| Column | Type | Note |
|---|---|---|
| `id` | bigint PK auto | |
| `result_id` | bigint NOT NULL | FK → `results` |
| `attempt_number` | int NOT NULL | Monotonic per result |
| `environment` | varchar(20) NOT NULL | `TEST` / `PROD` — the host actually used |
| `prms_type` | varchar(50) NULL | The Normalizer `type` sent; NULL when refused before build, or when an attempt expired to `UNKNOWN` before it was known |
| `outcome` | varchar(40) NOT NULL | §5.4 vocabulary |
| `http_status` | int NULL | NULL for `TRANSPORT_FAILED`, STAR-side refusals, and **`UNKNOWN`** — three distinct reasons for the same NULL |
| `request_id` | varchar(191) NULL | PRMS `requestId` |
| `external_reference` | varchar(191) NULL | What we sent — the correlation key |
| `request_payload` | json NULL | **Key redacted** (QA-2) |
| `response_body` | json NULL | Verbatim |
| `failure_reason` | text NULL | STAR-side refusal reason, or the PRMS row's errors |
| *audit* | | `created_at`, `created_by`, `updated_at`, `updated_by`, `is_active`, `deleted_at` — hand-written in the migration |

Index: `idx_result_prms_sync_log_result` on `result_id`; `idx_result_prms_sync_log_request_id` on `request_id` (QA-6).

`results.is_synced_to_prms` and `results.prms_result_code` gain their **first writers**. No schema change, no OpenSearch change.

**Migration:** `src/db/migrations/<timestamp>-createResultPrmsSyncLogTable.ts`, following `1787068132517-createResultInnovationUse.ts` (charset `utf8mb4` / collation `utf8mb4_unicode_520_ci`, audit columns inline, FKs as separate `ALTER TABLE` statements).

> ⚠️ **No bare `?` or `:word` anywhere in the SQL *or its comments*** when no parameters are passed (child guide §7, K-006). Gate = DC-9: the migration must be **run**, not merely compiled.

---

## 4. API surface

### POST /api/results/:resultCode/prms-sync

| | |
|---|---|
| **Route node** | `{ path: \`${RESULT_CODE}/prms-sync\`, module: ResultPrmsSyncModule }` in `ResultsChildren` (`main.routes.ts:81`), mirroring the Bilateral node's shape |
| **Registration** | **Two steps** — the route node **and** `entities.module.ts` imports. A route node alone yields a silent `404` (child guide §4) |
| **Controller** | `result-prms-sync.controller.ts` |
| **Roles** | `@Roles(SecRolesEnum.CONTRIBUTOR, SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)` — **adopts the Bilateral precedent** (DD-11, revised) |
| **Guards** | `@UseGuards(RolesGuard, ResultOwnerGuard)` + `@ResultOwner()`. ⚠️ **NOT `ResultStatusGuard`** — it rejects `APPROVED`, see JD-1 below |
| **Decorators** | `@GetResultVersion()` (Swagger sugar), `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` |
| **Body** | none |
| **Response `data`** | `{ outcome, attempt_number, http_status, request_id, prms_result_code, failure_reason }`. On a refusal that writes **no** row (gate entries 1–2, §5.1), `attempt_number` is `null` — never `0`, which would read as a real attempt (JD-8) |
| **Errors** | `404` not found · `409` already synced · `422` ineligible / gated type / payload incomplete · `502` PRMS rejected · `503` transport or PRMS retryable — **each with a distinct `description`** (R-PRMS-001 AC.2) |

>  **JD-1 — why not `ResultStatusGuard`.** `result-status.guard.ts` bypasses only `SYSTEM_ADMIN`,
> `TECHNICAL_SUPPORT` and `CENTER_ADMIN`; for everyone else it throws `BadRequestException` unless
> the status is `DRAFT`, `REVISED`, `SCIENCE_EDITION` or `KM_CURATION`. This endpoint requires
> **`APPROVED (6)`** — precisely the status the guard rejects — and the guard runs **before** the
> service, so the §5.1 gate would never be reached. A Contributor, the persona R-PRMS-001 is
> written for, would get `400` on every result the feature exists to sync. The status rule lives
> **only** in the §5.1 list.

### GET /api/results/:resultCode/prms-sync

Read surface for children 2–4 (R-PRMS-014): derived state + last attempt. Never returns
`request_payload`. Same guard triad as the POST (JD-9).

---

## 5. Workflows & business rules

### 5.1 The eligibility gate — data, not control flow

The gate is a single **ordered, enumerated list** of `{ condition, http status, description }`. Each entry is evaluated in order; the first failure returns. **No gated type is expressed as a missing branch anywhere else** — this is what makes QA-5 measurable and family R-F6 true.

1. Result exists → else `404`
2. `is_synced_to_prms = false` → else `409`
3. `result_status_id = 6` → else `422`
4. Pool Funding Alignment green-checked → else `422`
5. Primary contract has `is_pool_funding_contributor = true` → else `422`
6. `indicator_id` is mappable (not `3`/`5`) → else `422` *(unmappable)*
7. `indicator_id` is not gated (not `6`) → else `422` *(gated — missing declarations)*
8. Resolved policy type is not PRMS `1` → else `422` *(gated — missing amount fields)*

Entries 6–8 carry **distinct** descriptions; a shared message fails R-PRMS-001 AC.2.

**Which refusals persist a row (JD-3).** `REFUSED_BY_STAR` is written, not decorative:

| Gate entry | Log row? | Why |
|---|---|---|
| 1 — result not found | **No** | No result to attach a row to |
| 2 — already synced | **No** | R-PRMS-001 AC.4 requires the log to be left unchanged |
| 3–8 — status, alignment, contract, unmappable, gated type, gated policy subtype | **Yes**, `REFUSED_BY_STAR` | The Center-Admin persona needs a durable record of every attempt (R-PRMS-012 AC.1) |
| Build failure (§5.2 — a missing mandatory field, P-1) | **Yes**, `REFUSED_BY_STAR` | Same reason; `failure_reason` names the field |
| **Claim collision** (§5.1b — a **live** `IN_FLIGHT` row exists) → `409` | **No** | The in-flight attempt already owns a row; a second would double-count one user action. Matches QA-7's *"one `ACCEPTED` row, one `409`"* |
| **Claim expiry** (§5.1b — an **aged** `IN_FLIGHT` row) → `409` | **No new row** — the **existing** row is settled `IN_FLIGHT → UNKNOWN`, the single transition R-PRMS-012 AC.2 permits | The attempt already has a row; expiry records its true outcome rather than opening a second |

On a `REFUSED_BY_STAR` row, `prms_type`, `http_status`, `request_id`, `request_payload` and
`response_body` are **NULL** (§3's nullability is what makes this representable), and
`failure_reason` carries the refusal text. `attempt_number` is assigned as for any other attempt.

### 5.1b Claiming an attempt — the concurrency control (JD-2, R-PRMS-013 AC.2)

A plain read of `is_synced_to_prms = false` followed by a later write is a race: two simultaneous
requests both observe `false`, both POST, and PRMS accepts both. **A lock held across the HTTP call
is not the answer** — it would pin a database connection for up to the 30 s transport timeout.

**Two short transactions, with the log row itself as the claim token:**

1. **Claim (transaction 1).** `SELECT … FOR UPDATE` on the `results` row, then branch on what is
   found. **The whole branch runs inside the one locked transaction** — splitting it reopens the
   race it exists to close.

   | Found | Action |
   |---|---|
   | `is_synced_to_prms = true` | `409` — already synced |
   | A **live** `IN_FLIGHT` row (younger than the ceiling + margin) | `409` — a claim collision (§5.1's table). Write nothing |
   | An **aged** `IN_FLIGHT` row (older than 30 s + 60 s) | **Settle that row to `UNKNOWN` and commit — then refuse `409` with an *attention-required* reason. Do NOT claim a new attempt in this transaction.** See §5.1b's expiry rule below |
   | No `IN_FLIGHT` row | Assign `attempt_number`; insert the attempt row with `outcome = IN_FLIGHT`; commit |
2. **Send** — outside any transaction (§5.3).
3. **Settle (transaction 2).** Update the attempt row from `IN_FLIGHT` to its terminal outcome and,
   only on `ACCEPTED`, flip `is_synced_to_prms` and `prms_result_code` **in the same transaction**.
   The update is **conditional on the row still being `IN_FLIGHT`**, so a settle arriving after an
   aged row was swept to `UNKNOWN` writes nothing and is logged as a late settle rather than
   silently overwriting a terminal outcome.

**Abandoned claims — and why they are NOT auto-superseded.** A process that dies between 1 and 3
leaves a stale `IN_FLIGHT` row. **Elapsed time cannot tell us what happened.** Two cases hide behind
one symptom:

| What actually happened | Safe to re-send? |
|---|---|
| Died **before** the POST left | Yes — PRMS never saw it |
| PRMS answered (possibly `ACCEPTED`) and the **settle transaction** died before persisting that | **No** — re-sending produces a *second* accepted ingest for one result |

An earlier draft let a claim older than the transport ceiling be superseded by a new one. **That was
wrong twice over** (Judgment Day RA2/RB1, confirmed by both re-judges): it is a time-triggered,
unattended **automatic retry** — exactly what §2.4 rejects, for exactly the stated reason, with no
un-sync path to repair the duplicate — and a merely *slow* process could complete its real settle
**after** the supersession had written a terminal outcome, a second write to a settled row breaking
the very invariant §5.1b introduces.

**The rule instead — expiry, not supersession.** An aged claim is settled to **`UNKNOWN`**
(*"we do not know whether PRMS took this"*) by **the next claim attempt on that result**, which then
**refuses `409`** rather than proceeding. That is the actor the earlier draft lacked: no cron, no
background job, no side-effecting read — the transition rides the very transaction that would
otherwise have been blocked by the stale row (§7's "no new cron" stands).

**Expiry is not a retry.** The expiring attempt stops at the refusal. Reaching PRMS again takes a
**second, separate human action**, and the `409` it returns says so explicitly: *attention required
— this result has an attempt whose outcome PRMS never confirmed; verify before re-sending.*

> ⚠️ **Residual risk, accepted rather than argued away (R-4).** That second action is **not
> protected by anything in v1.** An earlier draft claimed `external_reference` made the re-drive
> "decidable" because PRMS returns it on the **decision webhook** — but webhooks are an explicit
> **non-goal of this spec** (§1). No reconciliation read exists to build on. So if the abandoned
> attempt was the dangerous case — PRMS answered `ACCEPTED` and the settle died — a human who
> re-sends **will** create a duplicate, and there is no un-sync path to repair it.
>
> **v1 accepts this and controls it with a runbook step, not a mechanism:** an `UNKNOWN` may be
> re-driven only after checking the result's `external_reference` with PRMS out of band. The
> `409`'s wording is what carries that instruction to whoever is about to click. Child 3 inherits
> this as its own requirement; the reconciliation becomes mechanical only when the webhook child
> exists.

> **Consequence, stated plainly:** a dead process blocks that one result until a human acts twice —
> once to expire the claim, once to decide, having checked, whether to re-send. That is the price of
> never duplicating *silently* in a system with no un-sync path.

> **The single exception to "append-only"** in R-PRMS-012 AC.2: a row is written once as `IN_FLIGHT`
> and updated **once** to its terminal outcome (`UNKNOWN` included). Nothing is ever deleted, and a
> settled row is never touched again.

### 5.2 Build

1. Load the aggregate through one repository read (the result, its twelve related tables, the four
   type-specific tables, the contract, and the CLARISA catalogues).
2. `common-fields.builder` produces the shared `data` block; **a missing mandatory field throws** with the field named — it never substitutes (P-1, R-PRMS-008).
3. The type builder produces its block. Innovation Use and policy type `1` builders run identically here — they are simply never reached through the endpoint while gated.
4. `payload.builder` assembles `{ tenant, op, results: [{ type, data }] }`.

### 5.3 Send and interpret

1. POST `/ingest` with `x-api-key` read **per request** (R-PRMS-009 AC.1).
2. `null` → `TRANSPORT_FAILED`.
3. `401` → `AUTH_FAILED` (non-retryable). `503` → `RETRYABLE`.
4. `422` → `REJECTED_BY_PRMS`; read `rejected[]` for the reason.
5. `2xx` (including **207**) → locate our row in `results[]` **by `external_reference`**, never by index (R-PRMS-011 AC.4). Accepted → `ACCEPTED`; failed → `REJECTED_BY_PRMS`.
6. Persist the log row in every branch. Flip `is_synced_to_prms` (and `prms_result_code` when present) **only** on `ACCEPTED`, in the same transaction.

> **The load-bearing rule.** Steps 5 and 6 are the whole of DC-3. A 2xx with a failed row that flips the flag 409-locks the alignment permanently, for everyone including SYSTEM_ADMIN (R-F3/R-F4). Its gate is a **live TEST call**, not a mocked 207.

### 5.4 Outcome vocabulary

`IN_FLIGHT` (transient — the claim token, §5.1b) · `ACCEPTED` · `REJECTED_BY_PRMS` · `AUTH_FAILED` · `RETRYABLE` · `TRANSPORT_FAILED` · **`UNKNOWN`** (an abandoned claim — PRMS's verdict is genuinely unknown; never auto-retried) · `REFUSED_BY_STAR`

Extensible to a future PRMS verdict (`APPROVED_BY_SP` / `REJECTED_BY_SP`) with no schema change — `outcome` is a varchar, not an enum column (family R-F1).

---

## 6. Frontend (Admin SSR) impact

None. STAR client impact is children 2–4; this spec makes no change under `client/`.

---

## 7. Integration impact

| | |
|---|---|
| **New env var** | `ARI_PRMS_NORMALIZER_HOST` — one value per environment (K-005 / R-F2). Local + Dev → TEST, Prod → PROD. Unset fails loudly; **no hardcoded default** (R-PRMS-010 AC.3) |
| **Credential** | `app_config` row `ARI_CLARISA_API_KEY` via `AppConfigService.getEnv(...).simple_value`. **No env var** — the value is DB-resident per environment |
| **New cron** | None. v1 is user-triggered only |
| **New events** | None |

---

## 8. Security & authorization

- **Who can call:** `@Roles(SecRolesEnum.CONTRIBUTOR, SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)` + `@ResultOwner()`, enforced by `RolesGuard` + `ResultOwnerGuard` — the Bilateral precedent (DD-11). **Not `ResultStatusGuard`** (DD-11b): it rejects `APPROVED`, the only status this feature acts on.
- **The ownership check is not universal.** `result-owner.guard.ts:26-31` returns `true` for `SYSTEM_ADMIN` and `CENTER_ADMIN` **before** `isUserOnResult` runs; only a plain `CONTRIBUTOR` is matched against `DEFAULT_RESULT_OWNER_TYPES` (`CREATOR` / `PI` / `CONTACT`, `result-owner.decorator.ts:11-15`). A test asserting *"denied: CENTER_ADMIN who does not own the result"* would encode a **false** expectation — the denied case must use a `CONTRIBUTOR` who is not on the result (NFR-PRMS-005, child guide §9).
- **Machine token:** the endpoint is reachable by a valid machine token like every other `/api` route; no `app_secret_host_list` row is added.
- **Secrets:** one existing credential, newly read by this module. It must never appear in a log line, a response, or `request_payload` (QA-2, DC-8). Redaction happens **before** the row is written, not at read time.
- **PII:** the payload carries user names and emails (`created_by`, `submitted_by`, `lead_contact_person`) — already shared with PRMS by design, no new class of disclosure.

---

## 9. Observability

| Signal | Detail |
|---|---|
| **Logs** | `LoggerUtil` with `_error` / `_warn` / `_log` (not `BaseApi`'s plain `Logger`, per child guide §6/§8). Every attempt logs `result_official_code`, environment, `prms_type`, outcome, `requestId` |
| **`result_prms_sync_log`** | The durable record; queryable by `request_id` (QA-6) |
| **Late settle** | A settle arriving after its row expired to `UNKNOWN` writes nothing and logs at `_warn` with `result_official_code` and `requestId`. **This is the signal that tells an operator to reconcile with PRMS** — without it, the one case that can duplicate is invisible |
| **Claim expiry** | Logged at `_warn` when an aged `IN_FLIGHT` is settled to `UNKNOWN`, naming the attempt it closed |
| **`sync_process_log`** | **Not written in v1** — DD-14 |

---

## 10. Testing strategy

| Tier | Covers |
|---|---|
| **Unit — builders** | DC-1, DC-2, DC-4, DC-5. Assert on **serialized JSON**, with expected values transcribed from `homologation.md`, never read off the builder |
| **Unit — gate** | DC-6, DC-10. Every refusal asserts a distinct description **and** that the transport spy was not called |
| **Unit — interpreter** | The five response branches, plus `external_reference`-based row location |
| **Unit — config** | DC-7 (declared limit: config resolution only), DC-8 |
| **E2E** | The endpoint's allowed and denied paths |
| **T-SPIKE (live TEST)** | Per-type happy path against the real `/ingest`, evidence = the **verbatim** response body. Closes OQ-1, OQ-2, OQ-5, OQ-6 |
| **Malformed-row e2e (live TEST)** | **DC-3** — a deliberately bad evidence link, proving the 207-with-failed-row branch leaves `is_synced_to_prms = false`. **A separate, independently required deliverable from T-SPIKE** (`requirements.md` DC-3: *"T-SPIKE + one e2e against TEST, both mandatory"*). Building only the spike does **not** close DC-3 |
| **Executed migration** | **DC-9** — `npm run migration:dev:execute` against a scratch schema; no static gate can see the placeholder trap |

Coverage: the global 60 % threshold. Mock strategy: `HttpService` substituted at the module boundary; **no mocked 207 is ever accepted as DC-3 evidence**.

> **What disqualifies this evidence.** A builder test whose expected value was copied from the builder's own output proves the builder is self-consistent, not correct. A disaggregation test covering one mode proves nothing — both values are valid booleans. A `null` from the transport that a test reads as "no error" reproduces the exact defect DD-3 exists to prevent.

---

## 11. Rollout

1. **Migration first**, code second — the log table must exist before the endpoint is reachable. ⚠️ Per root guide §4.3 (K-015), **the pipeline does not apply migrations**; applying it is a separate human-decided step against a shared database.
2. **Feature exposure:** none needed — the endpoint is inert until child 2 wires the button.
3. **Backout:** revert the migration (`npm run migration:revert`) + code rollback. Because no un-sync path exists, a result already flipped to `is_synced_to_prms = true` stays flipped; the backout plan must state that explicitly.
4. **Comms:** PRMS team (first TEST traffic), STAR team (child 2 unblocked).

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
|---|---|---|---|
| **DD-1** | 2026-09-14 | Tier **LITE**; synchronous call, no queue | No escalation trigger present; the Normalizer is already async downstream — our own queue would stack a second hop for no measured benefit |
| **DD-2** | 2026-09-14 | Split into a **tool** (transport + builders, no DB) and an **entity module** (persistence + HTTP edge) | Child guide §3 assigns each half a different home. The split is also the testability tactic: every payload assertion runs with no database and no HTTP |
| **DD-3** | 2026-09-14 | Extend `BaseApi`; pass a config that **spreads `_defaultConfig`, re-spreads its `headers`, then sets `validateStatus: () => true`**; treat `null` as *no HTTP response* | `handleError` is private and defaults to swallowing, so `401`/`422`/`503` bodies would be destroyed. **Step 2.3 challenge found the first draft's bare override broke authentication and the TLS agent** (§2.5) — the spread form is the corrected decision, not the original one |
| **DD-4** | 2026-09-14 | One builder per type behind a selector (**Strategy**) | Named problem: four type blocks sharing one common block, with two of the four gated. Rejected alternative — a single builder with a type switch: it would make the gated types unreachable branches instead of independently testable units, breaking QA-5 |
| **DD-5** | 2026-09-14 | The eligibility gate is an **ordered data list**, not scattered conditionals | Makes QA-5 measurable and R-F6 true: lifting a gate is removing an entry |
| **DD-6** | 2026-09-14 | Read the API key **per request** | `PdfViewerService` reads in its constructor, so a rotated key needs a restart. `getEnv` has no cache; one indexed read per user-triggered sync is negligible |
| **DD-7** | 2026-09-14 | Send policy `type`/`stage` by **`name`**, not `id` | The inbound ids are PRMS-internal (`policy_change_summary`); the Normalizer resolves against CLARISA. Inverting the map and sending an id is a guess wearing a tested map's costume (homologation §12.1) |
| **DD-8** | 2026-09-14 | Locate our row by **`external_reference`** | Index-based location is correct only while one result is sent per request — true today, silently wrong the day bulk arrives |
| **DD-9** | 2026-09-14 | Append-only log; key redacted **before** write | Auditability without a second place to leak the credential |
| **DD-10** | 2026-09-14 | Send `innovation_use_level.level`, never `id` | `id = 2` is `level = 1`; sending the id shifts every result one stage, silently (homologation §8.1) |
| **DD-11** | 2026-09-14 **(revised after Judgment Day — the first version was built on a false premise)** | Adopt the **Bilateral precedent**: `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)` + `@ResultOwner()` + `@UseGuards(RolesGuard, ResultOwnerGuard)`. **OQ-3 closed.** | The withdrawn rationale claimed *"zero `RESULT_CODE`-scoped controllers declare `@Roles`"*. **False:** `bilateral.controller.ts:230-236` — mounted at exactly `${RESULT_CODE}/pool-funding-alignment`, the node shape §4 mirrors — declares that precise triad on all four mutations, plus class-level `RolesGuard` at `:52`. It is invisible to a grep for the literal `RESULT_CODE` because it reads `resultsUtil.resultCode` from the route prefix instead of importing the constant. **KZ-017:** a check narrower than the claim it backed, returning a confident green. The nearest real precedent — a write endpoint over an Approved result's pool-funding state, keyed to the same 409 mechanism — is now followed rather than contradicted |
| **DD-11b** | 2026-09-14 | **No `ResultStatusGuard`** on this endpoint | It bypasses only `SYSTEM_ADMIN`/`TECHNICAL_SUPPORT`/`CENTER_ADMIN` and otherwise rejects anything outside `DRAFT`/`REVISED`/`SCIENCE_EDITION`/`KM_CURATION` — including `APPROVED`, the only status this feature acts on. Applying it would `400` every Contributor before the §5.1 gate ran (Judgment Day **JD-1**, confirmed by both judges and verified in `result-status.guard.ts:28-40,50-66`). The status rule lives in the §5.1 list alone |
| **DD-15** | 2026-09-14 **(revised after scoped re-judgment)** | **Claim-then-settle with the log row as the token** (§5.1b), not a lock held across the HTTP call. An abandoned claim is swept to **`UNKNOWN`** and **never auto-superseded** | Satisfies R-PRMS-013 AC.2 without pinning a DB connection for the 30 s ceiling. Rejected — `SELECT … FOR UPDATE` spanning the whole flow: holds a row lock across a network call. **Also rejected, after both re-judges flagged it (RA2/RB1): time-based supersession of an aged claim.** It is an automatic retry by another name, it cannot distinguish *died before send* from *PRMS accepted but the settle died*, and it let a slow process overwrite a settled row |
| **DD-16** | 2026-09-14 **(post-judgment, user-directed)** | An aged claim is expired to `UNKNOWN` **by the next claim attempt, which then refuses** — it does not go on to claim | Gives the sweep an actor without a cron and without reintroducing supersession (Judgment Day **FB1**, confirmed by both re-judges). Reaching PRMS again needs a second, separate human action, so expiry is not a retry |
| **DD-17** | 2026-09-14 **(post-judgment, user-directed)** | The duplicate risk on re-driving an `UNKNOWN` is **accepted as residual risk R-4** and controlled by a runbook step, not claimed as solved | The earlier safety argument cited the **decision webhook** — a non-goal of this spec (Judgment Day **FB2**). Naming the gap is honest; asserting a reconciliation that does not exist is not |
| **DD-12** | 2026-09-14 | `LoggerUtil` (`_error`/`_warn`), not `BaseApi`'s inherited plain `Logger` | Child guide §6/§8 mandates `LoggerUtil`; `BaseApi`'s logger bypasses the `[Context]` prefixing |
| **DD-13** | 2026-09-14 | Write a **new** outbound indicator→type map rather than inverting `indicator.homologation.ts` | Different vocabularies: the inbound map's PRMS side is numeric `ResultTypeEnum`; the Normalizer takes strings. Inverting a partial function also yields a partial one, while the outbound side needs totality (homologation §12.3) |
| **DD-14** | 2026-09-14 | **No `sync_process_log` row** in v1 | That table counts records across a *batch run* (`initiateSync`/`update`/`endSync`). A single user-triggered sync has no batch to count; `result_prms_sync_log` is the right grain. Revisit if bulk sync arrives |

---

## 13. Budget (Step 2.4 tripwire)

| Metric | Expected |
|---|---|
| **Tasks** | **14** |
| **LOC** | **≈ 2 000** (≈ 1 150 production, ≈ 850 tests) |
| **Review rounds** | **2** |

Not a quality cap — a tripwire. `/akili-execute` compares actuals and **escalates to the user** rather than continuing past it. The estimate matches the declared **Full** depth: a new integration, a new table, an aggregate read spanning the result plus its twelve related tables, the four type-specific tables and the contract, four builders, a claim-then-settle protocol, and a response interpreter whose dominant defect class has no unit-test gate.

---

## 14. Open questions

| # | Question | Owner | Target |
|---|---|---|---|
| **OQ-1** | `grant_title` composition against CLARISA `/api/projects` | ARI | T-SPIKE |
| **OQ-2** | `innovation_readiness_level` — `id`/`name` or `level` | ARI | T-SPIKE |
| ~~OQ-3~~ | **CLOSED 2026-09-14** by Judgment Day JD-1/JD-4 and the user's ruling: adopt the Bilateral precedent. See DD-11 (revised) and DD-11b | — | Closed |
| **OQ-4** | `keep_editing` — *Editing* or *Pending review* | PRMS PO | PO meeting |
| **OQ-5** | `geo_focus.scope_code = 50` behaviour | ARI | T-SPIKE |
| **OQ-6** | Where the PRMS result code returns (family OQ-F7) | ARI | T-SPIKE |

---

## 15. References

- [`./requirements.md`](./requirements.md) · [`./homologation.md`](./homologation.md) · [`./proposal.md`](./proposal.md) · [`../family.md`](../family.md)
- Child guide: [`server/researchindicators/src/CLAUDE.md`](../../../../server/researchindicators/src/CLAUDE.md) §3, §4, §6, §7, §8
- Kaizen: **K-005** (config discriminators), **K-006** (migration placeholders), **K-015** (pipeline applies no migrations), **KZ-001** (a double that does not evaluate what it stands for), **KZ-017** (declare what a check cannot reach)
