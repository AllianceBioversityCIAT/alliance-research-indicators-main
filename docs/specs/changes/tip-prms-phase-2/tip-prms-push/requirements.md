# Requirements — TIP Integration / Push TIP Knowledge Products to PRMS

- **Module:** tip-integration (server) — reuses `entities/result-prms-sync` and `tools/prms-normalizer`
- **Spec id:** 2026-10-tip-prms-push
- **Status:** approved at the Phase 1 gate (2026-10-26); amended after Judgment Day round 1 (R-TPP-002 `not_eligible`, R-TPP-004 author and `toc_mapping` keys, R-TPP-008 summary, RK-7/RK-8) — see `judgment.md`
- **Owner:** David Casañas
- **Linked PRD section:** `docs/prd.md` §3.5 (PRMS as downstream consumer), §5.1 (federation — TIP)
- **Linked tickets:** AC-1761 (phase 2)
- **Family:** [`../family.md`](../family.md) — child 3 of 3; depends on `tip-versioning` (`done`, 2026-10-26)
- **Depth:** Full (outbound integration + change to the shared PRMS sync gate on STAR's critical path)
- **Approval mode:** gated
- **Extends:** `docs/specs/bilateral/prms-sync/sync-engine` (engine, gate, log), `docs/specs/changes/prms-sync-knowledge-products/spike` (KP contract), `docs/specs/changes/tip-prms-phase-2/tip-versioning` (rows per handle and year)
- **Owner decisions (chat, 2026-10-26):** (1) a KP payload carries **all common fields** plus the `knowledge_product` block; the pasted JSON is the documentation example, and its `external_reference` is `TIP-<code>`. (2) A result is not pushed when it **has a `prms_result_code`**. (3) The push is triggered **only by the TIP sync**. (4) `toc_mapping` comes **from the TIP payload**.
- **Deadline:** TIP data in PRMS, QA-tested, by Thursday 2026-10-29 (owner).
- **Last updated:** 2026-10-26

---

## 1. Executive summary

Today no TIP result can reach PRMS. The PRMS sync gate refuses Knowledge Products on every platform. It also requires status Approved (6), while TIP results sit in status 20 *Completed in TIP*. And it builds `submitted_by` from an approval record that the TIP sync never writes.

After this change, every TIP sync run ends with a **push phase**. For each TIP row the run wrote for the PRMS reporting year, the sync sends one `knowledge_product` to the PRMS Normalizer, one result at a time, and waits for PRMS's answer before it sends the next. A result is sent only when:

- its year is the reporting year;
- its primary contract contributes to Pool Funding;
- its Pool Funding section is green;
- it has no `prms_result_code`.

The payload is the common block plus `knowledge_product.handle`. The author is the TIP submitter. Each outcome is recorded exactly as it is for a STAR push. STAR's gate and payloads do not change.

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Reporting year | `app_config.ARI_PRMS_SYNC` year, read by `ReportingYearResolver` (default 2026) |
| Candidate row | A TIP `results` row the current run **created or updated**, whose `report_year_id` is the reporting year; one per handle, the **version row** (`is_snapshot = 1`) of that year |
| TIP submitter | The person in the TIP record's `submitter`. Their STAR user is resolved by the sync and stored as the row's `created_by` and main contact |
| Handle | The `result_evidences.evidence_url` whose `evidence_description = 'Handled'` (`= public_link`) |
| Push phase | The new last step of a TIP run that sends candidate rows to PRMS |
| Outcome | `ACCEPTED`, `REJECTED_BY_PRMS`, `REFUSED_BY_STAR`, `RETRYABLE`, `AUTH_FAILED`, `TRANSPORT_FAILED`, `UNKNOWN` — the existing `result_prms_sync_log.outcome` set |

## 3. System context & scope (current behavior, cited)

Code citations at HEAD `007a18fc`; paths under `server/researchindicators/src/domain/`.

| Today | Evidence |
| --- | --- |
| The only trigger of a PRMS push is `POST results/:resultCode/prms-sync` (no cron, no RMQ, no event) | `entities/result-prms-sync/result-prms-sync.controller.ts:121-190`; `routes/main.routes.ts:96-97,300-302` |
| `ResultPrmsSyncService.sync(resultId)` runs gate → claim → build → `ingest` → interpret → settle → history, and awaits PRMS (synchronous, one result per envelope) | `result-prms-sync.service.ts:140-292`; `tools/prms-normalizer/builders/payload.builder.ts:43-57` |
| The gate refuses Knowledge Product and OICR on every platform | `entities/result-prms-sync/eligibility/sync-gate.ts:72-75,155-170` |
| The gate requires `result_status_id = 6`; TIP rows are written with status 20 `COMPLETED_IN_TIP` | `sync-gate.ts:131`; `tools/tip-integration/tip-integration.service.ts:294`; `entities/result-status/enum/result-status.enum.ts:21` |
| `submitted_by` is read from the latest `submission_history` row to Approved, and the build throws without it; the TIP sync writes no `submission_history` | `tools/prms-normalizer/builders/common-fields.builder.ts:420-429`; aggregate repository `:165-193` |
| A KP builder already exists: `{ knowledge_product: { handle } }` from the `'Handled'` evidence | `tools/prms-normalizer/builders/knowledge-product.builder.ts:10-36` |
| `toc_mapping` is built from the stored Pool Funding alignment and never carries `aow_compose_code` or `result_indicator_type_name`; the TIP payload carries both | `common-fields.builder.ts:195-238`; `tools/tip-integration/dto/response-year-tip.dto.ts:10-20` |
| `external_reference` is already `TIP-<code>` for TIP rows; the log, the 207 interpreter and the webhook correlator are platform-aware | `tools/prms-normalizer/reference/prms-external-reference.ts:40-77`; child 1 (archived) |
| A claim is refused when the row already has `is_synced_to_prms = 1`; the gate has no `prms_result_code` check | `result-prms-sync-log.repository.ts:281-283`; `sync-gate.ts:115` |
| The TIP sync writes, per handle, version rows then the live row, then imports Pool Funding on the written rows | `tip-integration.service.ts:542-566,610-690,731-753` |

**In scope:** push phase inside the TIP sync; TIP-only gate equivalences; TIP `knowledge_product` payload (common fields + handle, TIP authorship, TIP `toc_mapping`); legacy TIP results (any row a run re-writes).

**Out of scope:** the sidebar PRMS SYNC button for TIP results (owner decision 3); any client change; STAR gate, STAR payloads, STAR authorship; cron cadence; re-push or update of a result PRMS already holds (`op` update/delete); PRMS-side rules (dedup by handle, supported repository, cycle year, journal-article date rule — spike README).

## 4. Stakeholders

| Persona | Need |
| --- | --- |
| MEL / reporting staff | TIP Knowledge Products that meet the rules appear in PRMS without manual work |
| PRMS / Science Program reviewers | Receive TIP KPs with handle, ToC mapping and lead project, authored by the real submitter |
| Center Admin / ARI support | See why a TIP result was not sent, in the same sync log as STAR |
| STAR contributors | Their push behaves exactly as today |

## 5. Functional requirements

### R-TPP-001 — The TIP sync ends with a push phase

After every handle of a run is saved and its Pool Funding imported, the TIP sync SHALL push the run's candidate rows to PRMS one at a time, awaiting PRMS's answer for each before sending the next.

#### Scenario: Two eligible results

- GIVEN a run wrote reporting-year version rows A and B, both eligible
- WHEN the save loop finishes
- THEN A is sent, its outcome is recorded, and only then B is sent
- BUT it must NOT send two results in one envelope or in parallel

#### Scenario: One push fails

- GIVEN A's push ends `RETRYABLE` or throws
- THEN the outcome is recorded (when the engine records one), the error is logged, and B is still sent
- AND IT MUST NOT mark the TIP run `FAILED` because of a push outcome

#### Scenario: Run without the reporting year

- GIVEN a run with `year = 2024` while the reporting year is 2026
- THEN the push phase sends nothing and logs `candidates=0`

### R-TPP-002 — Candidate rows and the skip rule

A candidate row SHALL be the TIP row the run created or updated whose `report_year_id` equals the reporting year, taken as the **version row** of that year, at most one per handle. Before any PRMS call, a candidate SHALL be dropped, with no PRMS call and no log row, when:

- it already has a `prms_result_code` — counted `skipped`; or
- the run's TIP payload for that year carries no Pool Funding mapping (the primary project does not contribute in TIP, or has no Science Program) — counted `not_eligible`.

*(Second bullet added 2026-10-26 after Judgment Day JD-6/JD-8: without it, a handle that stopped contributing in TIP could be sent with the alignment an earlier run stored, and every non-contributing KP would add a log row on every run.)*

#### Scenario: Already has a PRMS code

- GIVEN the 2026 version row of handle `H` has `prms_result_code = 4521`
- WHEN a run re-writes it
- THEN it is counted `skipped` and PRMS is not called

#### Scenario: No longer contributes in TIP

- GIVEN handle `H`'s 2026 version row holds a green alignment from an earlier run
- WHEN this run's TIP payload for `H` 2026 has a primary project that no longer contributes
- THEN `H` is counted `not_eligible` and PRMS is not called
- BUT IT MUST NOT be sent with the stored alignment

#### Scenario: Legacy result

- GIVEN a TIP result created before this change, with no `prms_result_code`, which a full run re-writes for 2026
- THEN it is a candidate like any new result

#### Scenario: Row the run did not write

- GIVEN a 2026 TIP row that the run did not create or update (the run skipped it, or the save failed)
- THEN it is not a candidate

### R-TPP-003 — TIP gate equivalences; STAR gate unchanged

For a row with `platform_code = 'TIP'` **sent by the TIP sync's push phase**, the gate SHALL:

- accept status `COMPLETED_IN_TIP` (20) where it requires Approved (6);
- accept indicator Knowledge Product;
- keep every other entry: feature enabled, result exists, not already synced, reporting year, Pool Funding green, primary contract is a Pool Funding contributor, policy type.

For every other platform, and for any push reaching the gate through the HTTP route (TIP rows included — owner decision 3), the gate SHALL behave exactly as today.

#### Scenario: Eligible TIP KP

- GIVEN a TIP KP, status 20, year 2026 = reporting year, primary contract a contributor, Pool Funding green, no PRMS code
- THEN the gate allows it and the payload is built

#### Scenario: TIP KP with the section not green

- GIVEN the same KP with Pool Funding not green
- THEN the attempt is refused with "Pool Funding Alignment is not green-checked", recorded as `REFUSED_BY_STAR` (as for STAR today)

#### Scenario: STAR KP

- GIVEN a STAR result of indicator Knowledge Product
- THEN it is still refused with the existing unmappable-indicator message
- BUT IT MUST NOT become sendable through the TIP equivalence

#### Scenario: STAR result in status 20

- GIVEN a STAR result whose status is 20
- THEN it is refused as not Approved, as today

#### Scenario: TIP KP through the HTTP route

- GIVEN the same eligible TIP KP
- WHEN someone calls `POST results/:resultCode/prms-sync` for it
- THEN it is refused as today (not Approved)
- BUT IT MUST NOT be sendable through the HTTP route

### R-TPP-004 — TIP Knowledge Product payload

The payload for a TIP candidate SHALL be one `knowledge_product` row whose `data` holds every common field the engine sends today plus `knowledge_product.handle`, with these TIP-specific values:

| Field | TIP value |
| --- | --- |
| `external_reference` | `TIP-<result_official_code>` (unchanged rule, child 1) |
| `created_date` | the row's `created_at` |
| `created_by` | the STAR user (`name`, `email`) of the TIP submitter **this run** received for that year — not the author stored when the row was first created (JD-7) |
| `submitted_by` | the same user, with `submitted_date` = the row's `created_at` — *default, OQ-1* |
| `lead_contact_person` | the row's main contact (the sync sets it to the TIP submitter) |
| `lead_center` | the existing primary-contract rule (`ABC RH` → 46, `ABC` → 49) |
| `toc_mapping` | from the TIP payload of that year, primary project's `toc_mapping`: `science_program_id`, `aow_compose_code`, `result_title`, `result_indicator_description`, `result_indicator_type_name`, plus `toc_result_id` and `target_contribution` (owner, 2026-10-26: PRMS resolves the ToC result on the ID) — each sent only when TIP gave a value |
| `contributing_bilateral_projects` | the existing primary-contract rule (`grant_title`, `is_lead: true`) |
| `knowledge_product.handle` | the `'Handled'` evidence URL |

Every other common field (title, description, geo focus, evidence, partners, contributing center, `keep_editing: false`) SHALL follow today's rules.

#### Scenario: Payload shape

- GIVEN eligible TIP result code 19191 with handle `https://hdl.handle.net/10568/148990` and TIP `toc_mapping` `{SP01, SP01-AOW05, …}`
- THEN `results[0].type = "knowledge_product"`, `data.external_reference = "TIP-19191"`, `data.knowledge_product.handle` is that URL, and `data.toc_mapping` carries the TIP fields TIP gave
- AND IT MUST NOT send `toc_mapping` from the stored alignment for a TIP row
- BUT it must NOT invent a value for a field TIP left empty (prms-sync P-1): the key is omitted

#### Scenario: Missing mandatory value

- GIVEN a TIP candidate with an empty description (TIP `abstract`), or no `'Handled'` evidence
- THEN the attempt is recorded `REFUSED_BY_STAR` with "Missing mandatory field '<field>'" naming the **first** field that fails, and PRMS is not called

### R-TPP-005 — Submitter without a STAR user is not pushed

A TIP candidate whose submitter has no STAR user SHALL NOT be sent. The attempt SHALL be recorded `REFUSED_BY_STAR` with a reason that names the missing author (FD-3).

#### Scenario: Unknown submitter

- GIVEN the TIP submitter was not found in Alliance staff (the sync logged the warning and left `userData` null)
- THEN no PRMS call is made and the log row reads "Missing mandatory field '<field>'" for the first field that fails (`created_by` when the lead center resolves)

### R-TPP-006 — Outcomes are recorded as for STAR

Every attempt the engine claims SHALL be settled and recorded by the existing engine: the log row, PRMS's per-row message verbatim on a 207 (R-F4), `is_synced_to_prms = 1` only on `ACCEPTED` (R-F3), `prms_result_code` on the pushed row and on the TIP live row of the same handle, and one `PENDING_REVIEW` history row on `ACCEPTED`.

#### Scenario: PRMS rejects (207)

- GIVEN PRMS answers 207 with a failed row "This knowledge product has already been reported in the PRMS Reporting Tool."
- THEN the log row is `REJECTED_BY_PRMS` with that message verbatim
- AND `is_synced_to_prms` stays 0

#### Scenario: PRMS accepts

- GIVEN PRMS accepts with a result code
- THEN the version row gets `is_synced_to_prms = 1` and `prms_result_code`, the TIP live row of the handle gets the same `prms_result_code`, and the next run skips the version row (R-TPP-002)
- BUT IT MUST NOT write the code onto a STAR row with the same official code

### R-TPP-007 — Author and audit without an HTTP request

The push phase SHALL run without an HTTP request user. Each push SHALL use the candidate's TIP submitter's STAR user as the actor, so the log and history rows record `created_by` / `actor_user_id`. It SHALL clear that actor after the push.

#### Scenario: Cron run

- GIVEN the weekly cron starts the run (RMQ, no request)
- THEN each log row's `created_by` is the TIP submitter's `sec_user_id` of that result
- BUT it must NOT carry the previous result's actor into the next push

### R-TPP-008 — Run summary

The TIP run SHALL log one push-phase summary line holding: `candidates` (after the reporting-year filter and the one-per-row dedup), `skipped`, `not_eligible`, one count per engine outcome, `NOT_SENT` (refused by the engine before a claim: already synced, feature off, claim collision), `ERROR`, and the push duration. The counts after `candidates` SHALL add up to `candidates`.

#### Scenario: Summary

- GIVEN 10 candidates: 2 with a code, 1 not eligible, 4 accepted, 2 rejected by PRMS, 1 refused by STAR
- THEN the summary reads `candidates=10 skipped=2 not_eligible=1 ACCEPTED=4 REJECTED_BY_PRMS=2 REFUSED_BY_STAR=1` followed by the remaining keys at 0 and the duration

## 6. Non-functional requirements

### NFR-TPP-001 — STAR unchanged

- **Category:** reliability
- **Target:** for any non-TIP row, the gate, the payload and the HTTP route behave exactly as before; every existing `result-prms-sync` and `prms-normalizer` test stays green unchanged
- **How verified:** `npm test` (server); body diff of the gate showing TIP-only branches

### NFR-TPP-002 — One at a time

- **Category:** integration safety
- **Target:** at most one PRMS call in flight per TIP run; each call is bounded by the existing 30 s transport ceiling
- **How verified:** unit test with deferred `ingest` promises; the second call does not start before the first resolves

### NFR-TPP-003 — The sync survives the push

- **Category:** reliability
- **Target:** no push outcome or push exception changes the TIP run's saved rows, counters or final status
- **How verified:** unit test where `sync()` throws for one candidate

### NFR-TPP-004 — Kill switch

- **Category:** operability
- **Target:** turning off the existing PRMS sync feature flag (`POOL_FUNDING.PRMS_SYNC_BUTTON.ENABLED`) stops the TIP push phase too, without a deploy; the TIP save still runs
- **How verified:** unit test on the gate's `feature_enabled` entry; live check at the HITL pause

## 7. Defect classes and the gate for each

| Defect class | Gate |
| --- | --- |
| STAR gate loosened (STAR KP or STAR status 20 becomes sendable) | Unit tests on `evaluateSyncGate` for STAR rows; falsifier: drop the platform check → STAR KP test red |
| TIP equivalence missing (TIP KP still refused) | Unit test on `evaluateSyncGate` for a TIP KP in status 20 |
| Wrong payload shape or values (stored `toc_mapping` sent, missing `external_reference`, wrong author) | Builder unit tests that assert on the built JSON, not on calls |
| Gate snapshot SQL wrong for TIP (status / platform read wrong) | Integration spec on real MySQL (TEST container) — mocked repositories cannot evaluate SQL (KZ-001) |
| Null actor written wrong (`undefined` bound into the raw INSERT) | Same integration spec, a null-actor `sync()` case |
| Stale author (author of the first import sent) | Service unit test: the run's author wins over `results.created_by` |
| Pushes in parallel, or the run aborts on a push error | Unit tests with deferred promises and a throwing `sync()` |
| Code written to a STAR row with the same official code | Covered by child 1's platform-aware writer; re-asserted in the integration spec |
| PRMS accepts the TIP payload end to end (`TIP-<code>` reference, KP with all common fields) | **No automated gate** — live push to PRMS TEST at the HITL pause; settles FD-2 / P-18 of child 1 |
| A real eligible TIP KP exists in the reporting year | **No automated gate** — read-only Dev count at design time, then the HITL pause |
| Compile errors hidden by the test runner | `npm run build` |

## 8. Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| RK-1 | **Accepted without a code.** PRMS may accept without returning `result_code` (prms-sync OQ-F7). The skip rule checks only `prms_result_code` (owner decision 2). Such a row is not pushed again only because the engine already refuses `is_synced_to_prms = 1` (`sync-gate.ts:115-121`; claim `result-prms-sync-log.repository.ts:281-283`). | That engine behavior is kept, not added: the TIP phase relies on it and counts such a row `NOT_SENT`. |
| RK-2 | **PRMS dedups by handle across producers.** A TIP KP another center already reported in PRMS is rejected with "already reported" on every run. | Accepted. The 207 message is recorded verbatim, and each weekly run adds one more `REJECTED_BY_PRMS` row for that result. |
| RK-3 | **Date rule.** PRMS reads Date Online before Date Issued for journal articles, so a KP that STAR shows as 2026 can be refused (spike). | Accepted. PRMS-side; the message is surfaced verbatim. |
| RK-4 | **Volume.** A full run may hold hundreds of candidates, each waiting up to 30 s. | Sequential by owner decision. The run is already long and async (cron/RMQ). The Dev count was unreachable at design time (VPN), so it is design P-13, settled by T-04's first step. |
| RK-5 | **Environment.** Local and Dev runs push to PRMS **TEST**, and Prod pushes to PROD (R-F2). A local full sync sends real TEST data. | Documented in rollout. The feature flag can pause it. |
| RK-6 | **Contributor tests disagree.** TIP's `is_contributing_to_pool_funding` and STAR's contributor test can differ. TIP's flag decides `not_eligible` (R-TPP-002); STAR's test still runs in the gate. | Accepted. A refused row records the reason. |
| RK-7 | **Re-send after an unconfirmed attempt.** After `UNKNOWN` or `TRANSPORT_FAILED`, PRMS may or may not hold the result, and the engine asks for an out-of-band check before re-sending (`result-prms-sync.constants.ts:19-32`). The next run re-sends (owner, 2026-10-26). | Accepted. PRMS dedups by handle, so a duplicate comes back as "already reported" (RK-2). |
| RK-8 | **Run guard window.** The child-2 guard treats a run as in progress for 6 h from its start (`sync-process-log.service.ts:51-64`). A run whose push ends after that can overlap a new run. | Accepted. The push duration is logged (R-TPP-008); the claim lock still serializes per reference. |

## 9. Open questions

| ID | Question | Owner | Default if unanswered |
| --- | --- | --- | --- |
| OQ-1 | `submitted_by.submitted_date` for a TIP KP: the TIP record's `created_at` (stored as the row's `created_at`), or the moment of the push? | David Casañas | the row's `created_at` |
| OQ-2 | Does PRMS accept `external_reference = "TIP-<code>"` and a KP payload carrying every common field? | First live TEST push (HITL) | assumed yes (FD-2) |

## 10. Requirement ID index

| ID | Title |
| --- | --- |
| R-TPP-001 | The TIP sync ends with a push phase |
| R-TPP-002 | Candidate rows and the skip rule |
| R-TPP-003 | TIP gate equivalences; STAR gate unchanged |
| R-TPP-004 | TIP Knowledge Product payload |
| R-TPP-005 | Submitter without a STAR user is not pushed |
| R-TPP-006 | Outcomes are recorded as for STAR |
| R-TPP-007 | Author and audit without an HTTP request |
| R-TPP-008 | Run summary |
| NFR-TPP-001 | STAR unchanged |
| NFR-TPP-002 | One at a time |
| NFR-TPP-003 | The sync survives the push |
| NFR-TPP-004 | Kill switch |
