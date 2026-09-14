# Requirements — Bilateral / PRMS Sync Engine

- **Module:** `bilateral` → `prms-sync` (server integration; new tool `domain/tools/prms-normalizer/`)
- **Spec id:** `2026-09-prms-sync-engine`
- **Status:** `draft`
- **Owner:** ARI / David Casañas
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) §3.5 (PRMS as downstream consumer), §4.1 (G1, G4), §5.1 (federation)
- **Linked TRD section:** [`docs/trd/trd.md`](../../../trd/trd.md) §9.1 (integrations), §7.1 (result lifecycle)
- **Linked tickets:** Jira **AC-1676**
- **Parent spec:** [`../family.md`](../family.md) — child 1 of 4
- **Linked proposal:** [`./proposal.md`](./proposal.md) · **Field mapping:** [`./homologation.md`](./homologation.md)
- **Depth:** **Full** — new external integration, new table + migration, new endpoint, outbound credential, cross-system contract
- **Last updated:** `2026-09-14`

---

## 1. Context

STAR results that contribute to pooled funding must reach the **PRMS Reporting Tool**. The trigger
already exists in the UI (`result-sidebar`, `data-testid="sidebar-prms-sync-button"`, enabled when
the result is Approved **and** Pool Funding Alignment is green) and its click handler is empty. The
server already carries `results.is_synced_to_prms` and `results.prms_result_code`, written by
nothing and read only as a 409 read-only gate. **This spec builds the middle**: payload
construction, outbound transport, response interpretation, and durable sync state.

**Not changing:** the button's enablement rule, the Pool Funding Alignment section, the inbound
PRMS import (`domain/tools/open-search/prms/`), the 409 gate's own logic, and every other result
section.

**Surface enumerated by what participates, not by folder** (KZ-002): the Result aggregate and
**twelve** related tables (`result_contracts`, `result_users`, `result_institutions`,
`result_evidences`, `result_countries`, `result_countries_sub_nationals`, `result_regions`,
`result_actors`, `result_institution_types`, `result_quantifications`,
`result_pool_funding_alignment_sp`, `result_pool_funding_toc_alignment`), plus the four
type-specific tables, `agresso_contract`, `submission_history`, `alliance_user_staff`, six CLARISA
catalogues, and the `app_config` row holding the API key.

---

## 2. Executive summary — what v1 delivers

| | Outcome |
|---|---|
| **Builds payloads for** | `capacity_sharing`, `innovation_development`, `policy_change`, `innovation_use` — **all four, complete** |
| **Actually sends** | `capacity_sharing`, `innovation_development`, and `policy_change` for 2 of its 3 subtypes |
| **Refuses, with a stated reason** | Knowledge Product, OICR, Innovation Use, PRMS policy type `1` |
| **Governing principle** | **P-1 — what we do not have, we do not send** ([`homologation.md`](./homologation.md) §1.0) |
| **Key invariant** | `is_synced_to_prms` flips **only** for a row PRMS accepted — never on an HTTP status alone |

**Build ≠ send.** Every builder is written and tested, including for the refused types. The refusal
is a thin enumerated list, so lifting one after the PRMS PO meeting is a list edit, not new
development (family **R-F6**).

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Normalizer** | The PRMS ingest API (`POST /ingest`), distinct from PRMS Reporting itself |
| **Ingest row** | One entry of `results[]` in the request; one result per sync in this spec |
| **Per-row outcome** | PRMS's verdict for a single ingest row, returned **inside** an HTTP 207 |
| **Accepted** | A row the Normalizer validated and queued — **not** "persisted in PRMS" (family R-F1) |
| **Gated type** | A result type whose payload is built but whose send is refused up front |
| **P-1** | *What we do not have, we do not send* — no inferred or defaulted reporting values |
| **Eligible result** | Approved + alignment complete + primary contract is a pool-funding contributor |

---

## 4. System context & scope

**In scope (server only):** the `prms-normalizer` tool module, payload builders, the eligibility
gate, the sync endpoint, the append-only sync log, the migration, env/config wiring, unit + e2e
tests, and one TEST-environment spike.

**Out of scope:** all client work (children 2–4); `usd_budget` / `is_determined` /
`innov_use_to_be_determined` / policy `status_amount`+`amount` capture; decision-webhook
registration; Bulk Ingest; `op: delete` / un-sync; OICR and Knowledge Product mapping.

---

## 5. Stakeholders / personas

| Persona | Interest |
|---|---|
| **Contributor** (result owner) | Presses PRMS SYNC; must learn plainly whether it worked and why not |
| **Center Admin** | Needs a durable, queryable record of every attempt (consumed by child 3) |
| **Principal Investigator** | Project-level view of what reached PRMS (child 4) |
| **PRMS Reporting** | Receives the result; must not receive values no one reported |
| **ARI engineer** | Must be able to lift a gated type without rewriting a builder |

---

## 6. Defect classes this spec can produce, and the gate for each

**A gate blind to the defect class this spec most often produces is not a gate.** This spec's
dominant class is a *silently wrong payload that PRMS accepts* — every value below is type-valid,
so neither the compiler, nor `npm test` over mocks, nor an HTTP status code can see it.

| # | Defect class | Gate | Can the gate see it? |
|---|---|---|---|
| **DC-1** | Value emitted under the wrong key, or a wrong catalogue id | Snapshot assertions over the **serialized JSON** per type, expected values derived from `homologation.md`, not from the builder | ✅ |
| **DC-2** | `sex_and_age_disaggregation` orientation inverted (§12.4) | Both modes asserted on serialized JSON, expected values taken from the **contract**, never from `prms.opensearch.service.ts:564` | ⚠️ Only if the expectation is contract-derived. A test written from the code cannot falsify the code |
| **DC-3** | **207 carrying a failed row read as success** → `is_synced_to_prms` flips → alignment 409-locks for everyone incl. SYSTEM_ADMIN | **A live TEST-environment call with a deliberately malformed row.** A mocked 207 tests our parser against our own assumption of the shape | ❌ **No unit test can close this.** Substitute: T-SPIKE + one e2e against TEST, both mandatory |
| **DC-4** | Innovation Dev rows leaking into an Innovation Use payload (role columns `2`/`2`/`3`, §12.5) | Fixture carrying **both** roles; assert the Development rows are absent from the payload | ✅ |
| **DC-5** | **P-1 violation** — an inferred or defaulted value emitted | Assert the named fields are **absent** from the serialized JSON | ✅ |
| **DC-6** | A gated type actually sent | Denied-case test per gated type, asserting **no HTTP call was made** | ✅ |
| **DC-7** | Non-prod environment reaching the PROD Normalizer | Env-routing unit test | ⚠️ **Structurally cannot** prove the production build is correct — it tests config resolution, not deployment. Recorded as an accepted risk; mitigated by the key being DB-resident per environment |
| **DC-8** | API key leaked into logs or the sync-log payload column | Assert the key appears in no log line and no persisted column | ✅ |
| **DC-9** | **Migration unrunnable** — the `?` / `:word` placeholder trap (child guide §7, K-006) | `npm run migration:dev:execute` against a scratch schema. **Static gates cannot see this**; the migration must be *run* | ❌ static / ✅ executed |
| **DC-10** | Idempotency hole — a **sequential** second sync duplicates in PRMS | Already-synced denied-case test asserting no HTTP call | ✅ |
| **DC-11** | **Concurrency hole** — two simultaneous syncs both POST before either settles | A test issuing both calls before either settles, asserting exactly one outbound POST | ⚠️ Requires a real concurrency harness; a sequential test **cannot** see this class (added 2026-09-14, Judgment Day JD-2) |

**Accepted risks (no automated gate):** DC-7's deployment correctness, and the general class
*"PRMS accepted our payload but recorded it wrong"* — only a human reading the result inside PRMS
Reporting can falsify that, which is why T-SPIKE's evidence is a **verbatim response body**, not a
green assertion.

---

## 7. Functional requirements

### R-PRMS-001 — Sync eligibility gate

- **As a** contributor
- **I want** the server to refuse a sync it cannot honestly perform
- **So that** I never see a success for a result PRMS did not take

**Details**
- Inputs: result code path token.
- Behavior: a result is eligible only when **all** hold — `result_status_id = 6` (APPROVED);
  Pool Funding Alignment green-checked; the result's **primary** contract
  (`result_contracts.is_primary = true`) has `agresso_contract.is_pool_funding_contributor = true`;
  `is_synced_to_prms = false`; and its `indicator_id` is not gated (R-PRMS-002).
- Outputs: `ServerResponseDto` with the sync outcome, or an error envelope naming the failed condition.
- Errors: `409` (already synced), `409`/`422` (not approved, alignment incomplete, contract not a
  pool-funding contributor, gated type), `404` (result not found).
- Permissions: `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)` + `@ResultOwner()` +
  `RolesGuard` + `ResultOwnerGuard` — the **Bilateral precedent** (`bilateral.controller.ts:230-236`).
  ⚠️ **Not `ResultStatusGuard`:** it rejects `APPROVED`, the only status this feature acts on, and
  runs before the service. *(OQ-3 closed 2026-09-14 by Judgment Day JD-1/JD-4.)*
  ⚠️ **`ResultOwnerGuard` short-circuits for admins:** `SYSTEM_ADMIN` and `CENTER_ADMIN` return
  `true` before the ownership check runs (`result-owner.guard.ts:26-31`). The **denied** test case
  must therefore use a plain `CONTRIBUTOR` who is not on the result — a denied-CENTER_ADMIN case
  would encode a false expectation.

**Acceptance criteria**
- [ ] AC.1 — An eligible result returns `2xx` with a sync outcome in `data`.
- [ ] AC.2 — Each ineligible condition returns its own status **and a distinct `description`**; a
  shared generic message fails this AC.
- [ ] AC.3 — For every refusal, **no outbound HTTP call is made** (asserted on the transport spy).
- [ ] AC.4 — An already-synced result returns `409` and leaves the sync log unchanged.

#### Scenario: Approved, aligned, pool-funding contract

- GIVEN a result with `result_status_id = 6`, a green Pool Funding Alignment, and a primary
  contract flagged `is_pool_funding_contributor`
- WHEN a contributor triggers the sync
- THEN the payload is built, POSTed, and the outcome recorded
- AND IT MUST record exactly one sync-log row for the attempt
- BUT it must NOT flip `is_synced_to_prms` unless PRMS accepted the row (R-PRMS-011)

#### Scenario: Contract is not a pool-funding contributor

- GIVEN an Approved, aligned result whose primary contract has
  `is_pool_funding_contributor = false`
- WHEN the sync is triggered
- THEN the request is refused with a reason naming the contract
- AND IT MUST make no outbound HTTP call
- BUT it must NOT write `is_synced_to_prms` or `prms_result_code`

---

### R-PRMS-002 — Result type resolution and gated exclusions

- **As an** ARI engineer
- **I want** the STAR→PRMS type map and the refusal list to be one enumerated place
- **So that** lifting an exclusion is a list edit, not a new builder

**Details**
- Behavior: `results.indicator_id` resolves to a Normalizer `type` string per
  [`homologation.md`](./homologation.md) §3. `indicator_id ∈ {3 (KP), 5 (OICR)}` is **unmappable**.
  `indicator_id = 6` (Innovation Use) and `policy_change` resolving to PRMS `policy_type.id = 1`
  are **mappable but gated** (D-1, D-2 + P-1).
- Outputs: the refusal names which of the two kinds applies.

**Acceptance criteria**
- [ ] AC.1 — The map is **total** over STAR's six indicators; no `undefined` branch exists.
- [ ] AC.2 — Unmappable and gated refusals carry different descriptions.
- [ ] AC.3 — The gate list is data, not control flow: a test that removes an entry makes that type
  send, **with no builder change** (proves family R-F6).

#### Scenario: A gated type is refused but its payload still builds

- GIVEN an eligible Innovation Use result
- WHEN the sync is triggered
- THEN it is refused with a reason naming the missing investment declarations
- AND IT MUST still be possible to build that result's payload through the builder directly
- BUT it must NOT issue any outbound HTTP call

---

### R-PRMS-003 — Common-field payload construction

- **As** PRMS Reporting
- **I want** every result to arrive with the fields the contract demands
- **So that** it can be reviewed without chasing the producer

**Details**
- Behavior: build the envelope (`tenant`, `op`, `results[]`) and the common `data` block exactly as
  [`homologation.md`](./homologation.md) §2–§4 specifies, including `external_reference`
  (= `result_official_code`), `lead_contact_person` (main contact — mandatory, D-3), `lead_center`
  and `contributing_center` (from `ubwClientDescription`: `ExCIAT` → `46`, `ExBIO` → `49`, D-7),
  `toc_mapping` from the **PRIMARY** SP and `contributing_programs` from CONTRIBUTING SPs,
  `geo_focus` with its conditional rules, and `contributing_bilateral_projects` from
  `result_contracts`.

**Acceptance criteria**
- [ ] AC.1 — Serialized JSON matches the §4 mapping field-for-field for a fixture of each type.
- [ ] AC.2 — `ExCIAT` yields `46` **and** `ExBIO` yields `49`; a test covering one value fails this AC.
- [ ] AC.3 — A result whose alignment has **no** `PRIMARY` SP row (legacy null `sp_role`,
  R-BIL-126) is refused, not sent with a missing `toc_mapping`.
- [ ] AC.4 — `is_partner_not_applicable = true` omits `contributing_partners` entirely rather than
  sending an empty array.

#### Scenario: Geographic scope conditionals

- GIVEN a result with `geo_scope_id = 3` (Multi-national) and one country
- WHEN the payload is built
- THEN the build fails with a reason naming the ≥2-country rule
- AND IT MUST NOT send a payload PRMS will reject for a condition STAR could see
- BUT it must NOT invent a second country

---

### R-PRMS-004 — Capacity Sharing block

**Details:** `number_people_trained` from the three `session_participants_*` columns;
`length_training` derived from `degree_id` + `session_length_id` per §12.2; `delivery_method` by
inverting `DeliveryModalityHomologation`.

**Acceptance criteria**
- [ ] AC.1 — `degree_id = PHD → "PhD"`, `MSC → "Master"`, otherwise the session term.
- [ ] AC.2 — `BSc` and `Other` fall through to the session term, and the spec records that this
  makes them indistinguishable in PRMS.
- [ ] AC.3 — `unknown` is **absent** from the payload (P-1 / DC-5).

---

### R-PRMS-005 — Innovation Development block

**Details:** `innovation_typology` and `innovation_readiness_level` from the CLARISA ids STAR
already stores.

**Acceptance criteria**
- [ ] AC.1 — Typology sends `code` **and** `name` from `clarisa_innovation_types`.
- [ ] AC.2 — Readiness sends the shape the spike proves (OQ-2), and the chosen shape is recorded.
- [ ] AC.3 — `innovation_developers` is **absent** (P-1 / DC-5).

---

### R-PRMS-006 — Policy Change block

**Details:** `policy_type` and `policy_stage` sent by **`name`** (§12.1 — PRMS-internal ids are not
proven equal to CLARISA ids); `implementing_organization` from `result_institutions` role
`POLICY_CHANGE (4)`.

**Acceptance criteria**
- [ ] AC.1 — `implementing_organization` holds ≥1 entry; a result with none is refused.
- [ ] AC.2 — For a non-`1` policy type, `status_amount` and `amount` are **absent** — the contract
  forbids them there, so an accidental `undefined` key that serializes must not appear.
- [ ] AC.3 — A result resolving to PRMS policy type `1` is refused (R-PRMS-002), not sent.

#### Scenario: Policy type 1 is gated, the other two send

- GIVEN three policy results, one per STAR policy type
- WHEN each is synced
- THEN *Legal instrument* and *Policy or strategy* are sent
- AND IT MUST refuse *Program, Budget, or Investment* with a reason naming the missing amount fields
- BUT it must NOT send `status_amount` or `amount` on the two that succeed

---

### R-PRMS-007 — Innovation Use block (built, not sent)

**Details:** `innovation_use_level` sends **`level`** (not `id` — off-by-one, §8.1); `actors`,
`organization` and `measures` filtered by their **role enums** (`2`, `2`, `3` — §12.5);
`sex_and_age_disaggregation` passed through per the contract (§12.4).

**Acceptance criteria**
- [ ] AC.1 — `level` is sent, not `innovation_use_level_id`; asserted against the seeded catalogue,
  not a fixture constant.
- [ ] AC.2 — Both disaggregation modes produce the contract-specified shape, asserted on serialized
  JSON (DC-2).
- [ ] AC.3 — `women` = `women_youth_count + women_not_youth_count`; `women_youth ≤ women` holds by
  construction; the four **boolean** legacy columns are never read.
- [ ] AC.4 — `usd_budget`, `is_determined` and `innov_use_to_be_determined` are **absent** (P-1).
- [ ] AC.5 — The type is refused at the endpoint (R-PRMS-002) while this builder remains fully
  exercised in tests.

---

### R-PRMS-008 — P-1: no inferred values

- **As** PRMS Reporting
- **I want** to receive only what a reporting user actually supplied
- **So that** no claim in our records was authored by another system

**Acceptance criteria**
- [ ] AC.1 — `number_people_trained.unknown`, `innovation_developers`,
  `innov_use_to_be_determined`, `usd_budget`, `is_determined`, `status_amount`, `amount` and
  `toc_mapping.result_indicator_type_name` appear in **no** built payload.
- [ ] AC.2 — Arithmetic over user-entered values is explicitly permitted (`women`, `men`) and
  covered by a passing assertion, so the rule is not read as "no computation".

#### Scenario: A missing mandatory field refuses rather than defaults

- GIVEN a result whose main contact is absent from `result_users`
- WHEN the payload is built
- THEN the build fails with a reason naming `lead_contact_person`
- AND IT MUST NOT substitute the creator, the PI, or any other user
- BUT it must NOT emit a partial `lead_contact_person` object

---

### R-PRMS-009 — Outbound transport and authentication

**Details:** one Nest service encapsulating transport; `x-api-key` read **per request** from
`AppConfigService.getEnv(AppConfigKey.ARI_CLARISA_API_KEY).simple_value` (§10.1).

**Acceptance criteria**
- [ ] AC.1 — The key is read on **every** sync, not cached at construction (a rotated key takes
  effect with no restart; `PdfViewerService`'s constructor pattern fails this AC).
- [ ] AC.2 — A missing or inactive `app_config` row surfaces as a clear STAR error, not an empty
  header and a PRMS `401`.
- [ ] AC.3 — The key value appears in **no** log line and in **no** persisted column (DC-8).
- [ ] AC.4 — A PRMS `401` is recorded as non-retryable and a `503` as retryable.

---

### R-PRMS-010 — Environment routing

**Details:** the Normalizer **host** comes from one `ARI_*` variable per environment (K-005 /
family R-F2). Local + Dev → TEST; Prod → PROD. The **key** needs no variable — it is DB-resident
per environment.

**Acceptance criteria**
- [ ] AC.1 — Host resolution is a config read, never an `if (environment)` fork.
- [ ] AC.2 — With the TEST host configured, no PROD URL is constructible from the code path.
- [ ] AC.3 — An unset host fails loudly at the sync, never falls back to a hardcoded default.

---

### R-PRMS-011 — Response interpretation (the 207 rule)

- **As a** contributor
- **I want** "synced" to mean PRMS took it
- **So that** my alignment is not permanently locked for a result PRMS refused

**Details:** the Normalizer returns per-row outcomes **inside HTTP 207**; `rejected[]` (422) is a
separate, earlier failure mode. `external_reference` is present on every row, including failures.

**Acceptance criteria**
- [ ] AC.1 — `is_synced_to_prms` flips **only** when this result's row is in the accepted set.
- [ ] AC.2 — A 207 whose row failed leaves `is_synced_to_prms = false` and records `FAILED` with the
  verbatim row.
- [ ] AC.3 — `requestId` is persisted on every attempt, success or failure.
- [ ] AC.4 — The result's row is located by **`external_reference`**, not by array position.
- [ ] AC.5 — When PRMS returns a result code, it is written to `prms_result_code` in the same
  transaction as the flag; when it does not, the log row records that fact rather than a silent NULL.

#### Scenario: HTTP 207 with a failed row

- GIVEN an eligible result whose evidence link PRMS rejects
- WHEN the sync is triggered and PRMS answers `207` with that row failed
- THEN the attempt is recorded as `FAILED` with the verbatim response
- AND IT MUST leave `is_synced_to_prms = false`
- AND IT MUST leave the Pool Funding Alignment PATCH still writable (no 409)
- BUT it must NOT report success to the caller because the HTTP status was 2xx

---

### R-PRMS-012 — Durable sync state

**Details:** an append-only `result_prms_sync_log` extending `AuditableEntity`: result reference,
attempt, environment, request payload, verbatim response, `requestId`, outcome, actor, timestamps.
A scheduled or bulk run additionally writes `sync_process_log` (child guide §8).

**Acceptance criteria**
- [ ] AC.1 — Every attempt leaves exactly one row, success or failure — including a transport error
  with no HTTP response.
- [ ] AC.2 — Rows are never **deleted**, and a **settled** row is never modified again. *(Amended
  2026-09-14: an attempt row is written once as `IN_FLIGHT` and updated once to its terminal
  outcome — the claim token of design §5.1b. That single transition is the only write to an
  existing row the sync path performs.)*
- [ ] AC.3 — The outcome vocabulary is extensible to a future PRMS-side verdict without a schema
  change (family R-F1).
- [ ] AC.4 — The stored request payload has the API key redacted (DC-8).

---

### R-PRMS-013 — Idempotency

**Acceptance criteria**
- [ ] AC.1 — A second sync of an already-synced result returns `409` and makes no HTTP call.
- [ ] AC.2 — Two concurrent syncs of the same result produce at most one accepted ingest, proven by
  a test that issues both **before either settles** — a sequential second call does not exercise the
  race. Mechanism: design §5.1b claim-then-settle.
- [ ] AC.3 — A claim abandoned by a dead process is expired to **`UNKNOWN`** **by the next claim
  attempt on that result, which then refuses `409`** and does **not** go on to claim. Reaching PRMS
  again therefore requires a **second, separate** human action. No cron, no background job, no
  side-effecting read. *(Corrected twice: the first version permitted time-based supersession — an
  automatic retry (RA2/RB1); the second named no actor at all, leaving the transition
  unimplementable (FB1). The expiring attempt owns it.)*
- [ ] AC.5 — The `409` returned on expiry carries an **attention-required** reason naming the
  unconfirmed attempt; a generic "already in progress" message fails this AC. It is the only thing
  standing between a human and an unverified re-send (see risk **R-4**).
- [ ] AC.4 — A settle arriving **after** its row was swept to `UNKNOWN` writes nothing: the update
  is conditional on the row still being `IN_FLIGHT`. A test must cover this ordering, not only the
  happy path.

---

### R-PRMS-014 — Sync status read surface

**Details:** expose the derived sync state (never synced / synced / failed, last attempt,
`prms_result_code`) for children 2–4.

**Acceptance criteria**
- [ ] AC.1 — The shape is stable and documented in Swagger.
- [ ] AC.2 — It never exposes the request payload's credential fields.

---

## 8. Non-functional requirements

### NFR-PRMS-001 — No PROD ingest from a non-production environment
- **Category:** security · **Target:** zero PROD Normalizer calls reachable from local/dev/staging
- **How verified:** env-routing unit test. ⚠️ **Declared limit (KZ-017):** this verifies config
  resolution, **not** deployment correctness (DC-7) — recorded as an accepted risk.

### NFR-PRMS-002 — Credential hygiene
- **Category:** security · **Target:** the API key never reaches a log, a response, or a stored column
- **How verified:** assertions on log spies and on the persisted payload column.

### NFR-PRMS-003 — Observability
- **Category:** observability · **Target:** every attempt produces a `LoggerUtil` line carrying
  `result_official_code`, environment, outcome and `requestId`
- **How verified:** unit assertions on the logger spy.

### NFR-PRMS-004 — The user can tell "not yet" from "broken" (K-016)
- **Category:** dx/ux · **Target:** the endpoint responds within one Normalizer round-trip and its
  outcome vocabulary distinguishes *accepted*, *refused by STAR*, *rejected by PRMS*, and
  *transport failure*
- **How verified:** response-shape assertions per outcome. Child 2 owns the visual signalling; this
  NFR exists so the contract it needs is defined here rather than invented there.

### NFR-PRMS-005 — Coverage
- **Category:** dx · **Target:** ≥ 60 % global threshold held; every new service, builder, guard and
  controller has a sibling `*.spec.ts`
- **How verified:** `npm test -- --silent`, `npm run test:cov`.

---

## 9. Data requirements

| Change | Detail |
|---|---|
| **New table** `result_prms_sync_log` | Append-only; extends `AuditableEntity`; FK to `results`. Index `idx_result_prms_sync_log_result` on the result reference |
| `results.is_synced_to_prms` | **First writer** — no schema change |
| `results.prms_result_code` | **First writer** — no schema change |
| Migration | `src/db/migrations/<timestamp>-createResultPrmsSyncLogTable.ts`, append-only |
| OpenSearch | No new searchable fields |

⚠️ **Migration hazard (child guide §7, K-006):** no bare `?` or `:word` may appear in the SQL
**or in its comments** when no parameters are passed. Gate is DC-9 — run it.

---

## 10. API surface delta

| | |
|---|---|
| **Method + path** | `POST /api/results/:result-code/prms-sync` (exact shape fixed in `design.md`) |
| **Version** | Unversioned — no `@Version`, matching the rest of the API (root guide §4.1) |
| **Roles** | `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)` — Bilateral precedent (OQ-3 closed) |
| **Guards** | `RolesGuard` + `ResultOwnerGuard` + `@ResultOwner()`. **Never `ResultStatusGuard`** — it rejects `APPROVED` |
| **Body** | None |
| **Response data** | Sync outcome + `requestId` + `prms_result_code` when present |
| **Errors** | `404`, `409`, `422`, `502`/`503` for transport — each with a distinct `description` |
| **Swagger** | `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` **required** |

A read endpoint for R-PRMS-014 is specified in `design.md`.

---

## 11. Cross-system impact

| System | Impact |
|---|---|
| **PRMS Normalizer** | New outbound consumer; TEST + PROD hosts |
| **CLARISA** | Indirect — the API key is CLARISA-issued and validated by PRMS on every call |
| **`app_config`** | Read of the `ARI_CLARISA_API_KEY` row (value already present in TEST and PROD) |
| **`bilateral.service.ts` 409 gate** | Becomes reachable end-to-end for the first time |
| **`domain/tools/open-search/prms/`** | Read-only reuse of `DeliveryModalityHomologation`, `SessionLengthHomologation`, `DegreeHomologation`, `AcronymExContractEnum`. ⚠️ **Not** `indicator.homologation.ts` (different vocabulary) and **never** `prms.opensearch.service.ts:564` as precedent (family R-F7) |
| **STAR client** | None in this spec; children 2–4 consume R-PRMS-014 |

---

## 12. Assumptions, dependencies, risks

| # | Item | Mitigation |
|---|---|---|
| A-1 | The `app_config` `ARI_CLARISA_API_KEY` value is valid for the **Normalizer**, not only for the IBD microservices | T-SPIKE fails loudly on `401` if not; confirm at the PO meeting |
| A-2 | Main contact is populated on every syncable result (D-3) | R-PRMS-008 refuses rather than substitutes, so a wrong assumption surfaces as a refusal, never as bad data |
| D-1 | Requires the TEST Normalizer to be reachable | OQ-F8 closed — key present; host is public |
| R-1 | **A wrongly-flipped `is_synced_to_prms` permanently 409-locks the alignment for everyone incl. SYSTEM_ADMIN** (family R-F3 + R-F4) | DC-3's live-call gate; no un-sync path exists in v1 |
| R-2 | Inverting `sex_and_age_disaggregation` is accepted by PRMS and recorded wrong, silently | DC-2 with contract-derived expectations |
| R-3 | `grant_title` composition unproven (OQ-1) — an unresolvable title fails the row inside a 207 | T-SPIKE closes it before any builder depends on a guess |
| **R-4** | **ACCEPTED RESIDUAL RISK — re-driving an `UNKNOWN` can duplicate in PRMS.** When an attempt expires, STAR genuinely does not know whether PRMS accepted it. A human who re-sends may create a second ingest, and **no un-sync path exists**. An earlier draft claimed `external_reference` made this decidable via the **decision webhook** — that is a **non-goal of this spec** (Judgment Day FB2), so no reconciliation mechanism exists in v1 | **Controlled by a runbook step, not a mechanism:** an `UNKNOWN` may be re-driven only after checking its `external_reference` with PRMS out of band. AC.5's attention-required `409` carries that instruction to the person about to click; the late-settle `_warn` log is the operator-side signal. Child 3 inherits it as a requirement. Becomes mechanical only when the decision-webhook child exists |

---

## 13. Open questions

| # | Question | Owner | Target |
|---|---|---|---|
| **OQ-1** | `grant_title` — what exactly does CLARISA `/api/projects` expose that PRMS matches on? | ARI | T-SPIKE |
| **OQ-2** | `innovation_readiness_level` — `id`/`name`, or `level`? Contract and example disagree | ARI | T-SPIKE |
| ~~OQ-3~~ | **CLOSED 2026-09-14.** Judgment Day JD-1/JD-4 showed the "no `@Roles`" default rested on a false premise; the user ruled to adopt the Bilateral precedent | — | Closed |
| **OQ-4** | `keep_editing` — *Editing* or *Pending review*? Default `false` until decided | PRMS PO | PO meeting |
| **OQ-5** | `geo_focus.scope_code = 50` — accepted, and under what rule? | ARI | T-SPIKE |
| **OQ-6** | Where the PRMS result code returns (family OQ-F7) | ARI | T-SPIKE |

---

## 14. Requirement ID index

| ID | Title | Tasks |
|---|---|---|
| R-PRMS-001 | Sync eligibility gate | *(tasks.md)* |
| R-PRMS-002 | Type resolution and gated exclusions | |
| R-PRMS-003 | Common-field payload construction | |
| R-PRMS-004 | Capacity Sharing block | |
| R-PRMS-005 | Innovation Development block | |
| R-PRMS-006 | Policy Change block | |
| R-PRMS-007 | Innovation Use block (built, not sent) | |
| R-PRMS-008 | P-1: no inferred values | |
| R-PRMS-009 | Outbound transport and authentication | |
| R-PRMS-010 | Environment routing | |
| R-PRMS-011 | Response interpretation (the 207 rule) | |
| R-PRMS-012 | Durable sync state | |
| R-PRMS-013 | Idempotency | |
| R-PRMS-014 | Sync status read surface | |
| NFR-PRMS-001 | No PROD ingest from non-production | |
| NFR-PRMS-002 | Credential hygiene | |
| NFR-PRMS-003 | Observability | |
| NFR-PRMS-004 | Distinguishable outcomes | |
| NFR-PRMS-005 | Coverage | |

---

## 15. Sign-off

- [ ] Engineering lead — David Casañas
- [ ] MEL / product owner — *pending*
- [ ] Security review (outbound credential) — *pending*
- [ ] DevOps (new env var for the Normalizer host) — *pending*
