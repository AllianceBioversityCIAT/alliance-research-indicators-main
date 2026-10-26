# Design — TIP Integration / Push TIP Knowledge Products to PRMS

- **Module:** tip-integration (server) + `entities/result-prms-sync` + `tools/prms-normalizer`
- **Spec id:** 2026-10-tip-prms-push
- **Status:** approved 2026-10-26 — Judgment Day round 1 done (`judgment.md`); fixes applied 2026-10-26, owner chose fix-and-continue (no re-judgment)
- **Owner:** David Casañas
- **Linked requirements:** ./requirements.md (Phase 1 approved 2026-10-26; R-TPP-003 narrowed to the TIP sync's push phase while this design was written — owner decision 3, recorded there)
- **Linked detailed design:** ../../../../trd/trd.md §9.1 (TIP, PRMS Normalizer), §7.1 (result lifecycle)
- **Last updated:** 2026-10-26

---

## 1. Goals & non-goals

**Goals**
- G1 — The TIP run ends with a sequential push of its reporting-year version rows (R-TPP-001, 002, 008).
- G2 — The gate accepts TIP KPs in status 20, only from that push phase (R-TPP-003).
- G3 — The TIP KP payload has the common fields, TIP authorship and the TIP `toc_mapping` (R-TPP-004, 005).
- G4 — Outcome recording and the actor work without an HTTP request (R-TPP-006, 007).

**Non-goals**
- No change to the HTTP route, its guards, or the client.
- No change to STAR gate outcomes, STAR payloads, the response interpreter, the log/history tables, or the webhook correlator.
- No schema change, no migration.
- No retry scheduling — the next TIP run is the retry.

## 2. Architecture

```mermaid
flowchart TD
  A[getKnowledgeProductsByYear] --> B[persistHandles → syncHandle per handle]
  B --> C[collectSaved, version call only: created/updated → push candidate {resultId, year, tocMapping, userData}]
  C --> D[logTipRunSummary + update counters]
  D --> E[pushToPrms — own try/catch, before endSync]
  E --> F[reporting year = ReportingYearResolver]
  F --> G[keep year == reporting year, one per resultId; empty → log 0 and return]
  G --> G2[tocMapping null → not_eligible]
  G2 --> H[skip ids with prms_result_code — one read query]
  H --> I{for each candidate, sequentially}
  I --> J[setSystemUser submitter, force]
  J --> K[ResultPrmsSyncService.sync resultId, origin TIP_SYNC, tocMapping, author]
  K --> L[gate: TIP+origin → status 20 ok, KP ok]
  L --> M[claim → aggregate → run author as created_by/submitted_by → build with TIP toc_mapping → ingest → settle → history]
  M --> N[classify outcome / exception → counters]
  N --> O[clearSystemUser]
  O --> I
  I --> P[push summary log line]
  P --> Q[endSync]
```

### 2.1 Composition

| Path | Change |
| --- | --- |
| `entities/result-prms-sync/eligibility/sync-gate.ts` | `SyncGateSnapshot` gains **optional** `platform_code` and `origin` (literals build this type: `result-prms-sync-log.repository.ts:152-165`, `test/…claim-concurrency.integration-spec.ts:98` — JD-12) (`'HTTP' \| 'TIP_SYNC'`, default `'HTTP'`). A pure helper, `isTipSyncPush(snapshot)`, is true only when `origin === 'TIP_SYNC'` **and** `platform_code === 'TIP'`. Entry `approved` passes on status 6, or on status 20 when the helper is true. Entry `indicator_mappable` lets Knowledge Product through when the helper is true. OICR stays unmappable everywhere. Entry order, HTTP statuses, `persistsRow` and messages do not change |
| `entities/result-prms-sync/repositories/result-prms-sync-log.repository.ts` | `loadGateSnapshot` also selects `r.platform_code`; `origin` is not stored, the service sets it |
| `entities/result-prms-sync/result-prms-sync.service.ts` | `SyncOptions` gains `origin?: 'TIP_SYNC'`, `tocMapping?: TipTocMappingDto` and `author?: { email, first_name, last_name } \| null`. When `origin` is `TIP_SYNC`: (1) the snapshot gets `origin` before `evaluateSyncGate`; (2) after `loadByResultId`, `aggregate.created_by` is replaced by the run's `author` staff (null when the submitter has no STAR staff), and `submitted_by` = `{ staff: that author, submitted_date: created_at, comment: null }` (R-TPP-004, OQ-1 default — JD-7); (3) `payloadBuilder.build(aggregate, { tocMapping })`, where a missing `tocMapping` throws `PrmsPayloadBuildError('toc_mapping')` — it never falls back to the stored alignment (JD-6). Without `origin`, the code path does not change |
| `tools/prms-normalizer/builders/payload.builder.ts`, `common-fields.builder.ts` | `build` takes an optional `overrides: { tocMapping? }`. When `tocMapping` is given, `toc_mapping` = the TIP keys `science_program_id`, `aow_compose_code`, `toc_result_id`, `result_title`, `result_indicator_description`, `result_indicator_type_name`, `target_contribution` (owner, 2026-10-26 — JD-1). Empty values are omitted, and a missing `science_program_id` throws `Missing mandatory field 'toc_mapping.science_program_id'`. Without overrides: unchanged |
| `tools/tip-integration/tip-integration.service.ts` | A run-level `pushCandidates` array is created in `getKnowledgeProductsByYear` and passed through `persistHandles` → `syncHandle`. Only the **version** call of `collectSaved` (the one that passes `savedYears`, `:641-647`; the live call `:674` does not) pushes `{ resultId, year, tocMapping: payload.poolFunding, userData: payload.userData }` for `created`/`updated` outcomes (JD-5). `update(counters)` moves before the push; a new `pushToPrms(candidates)` runs after it and before `endSync`, inside its own `try/catch` (JD-14). It is injected with `ResultPrmsSyncService` and `ReportingYearResolver` (global) |
| `tools/tip-integration/repository/tip-handle.repository.ts` | new read `idsWithPrmsCode(ids)` → `SELECT result_id FROM results WHERE result_id IN (…) AND prms_result_code IS NOT NULL` (TypeORM `In`, no `?` / `:word` literals in comments); an empty `ids` returns `[]` without a query (JD-2) |
| `tools/tip-integration/tip-integration.module.ts` | imports `ResultPrmsSyncModule` (no cycle: it imports `PrmsNormalizerModule`, `AppConfigModule`, `ResultUsersModule` only) |

### 2.2 Reuse

The whole engine: gate, claim lock, `PayloadBuilder` + `KnowledgeProductBuilder` (handle from `'Handled'`), `PrmsNormalizerService.ingest`, `interpretPrmsSyncResponse`, `settleAttempt`, `recordPrmsResultCodeOnLiveVersion` (platform-aware since child 1), `recordOutboundHistory`, `ReportingYearResolver`, `CurrentUserUtil.setSystemUser/clearSystemUser`. The child-1/child-2 `test:integration` harness (TEST container).

## 3. Data model

No change. A push writes the existing tables exactly as a STAR push does: `result_prms_sync_log` (`platform_code = 'TIP'`, `external_reference = 'TIP-<code>'`, `result_year`), `results.is_synced_to_prms` / `prms_result_code` / `prms_phase_id` on the version row, `prms_result_code` on the TIP live row, `result_prms_sync_history` `PENDING_REVIEW`.

## 4. API surface

No endpoint change. `POST results/:resultCode/prms-sync` never sets `origin`, so a TIP KP sent through it is still refused as not Approved (R-TPP-003 "TIP KP through the HTTP route").

## 5. Workflows & business rules

**Push phase** (`pushToPrms`, end of each TIP run):

1. `reportingYear = await reportingYearResolver.resolve()`. Keep the candidates whose `year === reportingYear`; one per `resultId` (first wins). That count is `candidates`. If it is 0, log `PRMS push: candidates=0` and return before any query (R-TPP-001 "Run without the reporting year").
2. A candidate whose `tocMapping` is null is counted `not_eligible`, with no PRMS call and no log row (R-TPP-002, JD-6/JD-8).
3. `withCode = idsWithPrmsCode(ids)` over the rest. Those are counted `skipped`, with no PRMS call and no log row (R-TPP-002).
4. For each remaining candidate, **sequentially** (`for … of` + `await`):
   1. `currentUser.setSystemUser(candidate.userData, true)`. A null `userData` forces a null actor (`user_id` is `undefined`; the log's `created_by` column is nullable — proven on real MySQL, JD-10), never the previous candidate's.
   2. `await resultPrmsSyncService.sync(resultId, { origin: 'TIP_SYNC', tocMapping, author: candidate.userData })`.
   3. Classify. A return counts under its `outcome` (one key per outcome in the engine's set). `PrmsSyncPersistedRefusalException` counts as `REFUSED_BY_STAR`; check it first, because it extends `UnprocessableEntityException`. Any other `HttpException` counts as `NOT_SENT`, with its status and message logged `warn` (409 already synced — RK-1; 503 feature off; 409 claim collision; 409 claim expiry). Anything else counts as `ERROR`, logged `error`.
   4. `finally`: `currentUser.clearSystemUser()`.
5. Log one summary line: `PRMS push: candidates=N skipped=… not_eligible=… ACCEPTED=… REJECTED_BY_PRMS=… REFUSED_BY_STAR=… RETRYABLE=… AUTH_FAILED=… TRANSPORT_FAILED=… UNKNOWN=… NOT_SENT=… ERROR=… duration_ms=…`. Every key after `candidates` sums to `N` (R-TPP-008, JD-2).
6. If the phase itself throws (e.g. the code query fails), log `error` and return. The run continues to `endSync` (NFR-TPP-003).

**Why before `endSync`:** while the run is `IN_PROGRESS` and younger than 6 h, the child-2 guard refuses a second run, so two runs do not push at the same time inside that window. A run whose push ends after 6 h from its start can overlap a new run (RK-8, accepted — JD-3); the claim lock still serializes per reference, and `duration_ms` makes the real length visible.

**Why after all handles:** a push needs the Pool Funding import of its row, which runs in `syncHandle`'s `finally`. A push inside `syncHandle` would also add PRMS latency inside the handle loop and mix push errors into the handle's `catch`.

**Gate equivalences (R-TPP-003):** both changed entries keep their first-failure-wins position. For TIP rows from the push phase, the effective sequence is: feature on → exists → not synced → reporting year → status 6 **or 20** → Pool Funding green → primary contributor → indicator mappable (**KP allowed**) → policy type.

**Authorship (R-TPP-004/005):**
- `results.created_by` is written only when the row is inserted (`results.service.ts:435`; the update branch `save-all-sections.service.ts:191-200` never rewrites it), so it can hold the author of a legacy row's first import (JD-7, P-15).
- For `TIP_SYNC`, `created_by` and `submitted_by` therefore come from the run's `author` (the submitter's staff resolved this run, `tip-integration.service.ts:311-358`), with `submitted_date = results.created_at`.
- A null author (submitter not in Alliance staff) makes `requireStaff` throw. The engine records `REFUSED_BY_STAR` with "Missing mandatory field '<field>'" for the first failing field (`lead_center` builds first, `common-fields.builder.ts:418-419` — JD-11), and PRMS is not called.
- `lead_contact_person` stays the row's main contact, which the sync rewrites to the submitter each run (`tip-integration.service.ts:366-370`).

**`toc_mapping` (R-TPP-004):** from `payload.poolFunding`, which is the primary project's TIP `toc_mapping`, set only when that project contributes and has a Science Program (`tip-projects.mapper.ts:89-93`). When it is null, the candidate is `not_eligible` before the gate (step 2). An earlier run may have left a green alignment that the current run does not clear (`tip-integration.service.ts:719` imports only when `poolFunding != null`), so the stored alignment is never a fallback (JD-6). The service also throws on a missing `tocMapping` for `TIP_SYNC`, so a future caller cannot reach the fallback either.

**Accepted rows keep being re-written.** Later runs re-save a synced version row and re-import its alignment (`importAlignmentFromTip` has no sync guard, `bilateral.service.ts:1050-1115`). This is pre-existing and unchanged; the row is not re-sent (RK-1).

## 6. Frontend impact

None.

## 7. Integration impact

- PRMS Normalizer: one `POST /ingest` per eligible candidate. Local and Dev go to TEST; Prod goes to PROD (R-F2).
- A run's push time is about N × PRMS latency. Each call is capped at 30 s (`result-prms-sync.constants.ts:6-9`).
- PRMS-side refusals (dedup by handle, repository, cycle year, date rule) arrive as 207 failed rows and are recorded verbatim.

## 8. Security & authorization

The API key is read per request (`ARI_CLARISA_API_KEY`) and redacted in the stored payload, both unchanged. No new route. The equivalence is reachable only from server code that passes `origin: 'TIP_SYNC'`. No DTO or controller accepts it.

## 9. Observability

- `log`: the push summary line.
- `warn`: `NOT_SENT` rows, with status and message.
- `error`: `ERROR` rows, and a failed push phase.
- Each claimed attempt also appears in `result_prms_sync_log`, queryable by `platform_code = 'TIP'`.

## 10. Testing strategy

| Layer | What | Where |
| --- | --- | --- |
| Unit | Gate: TIP+`TIP_SYNC` status 20 KP allowed. STAR KP refused. STAR status 20 refused. TIP KP with `origin` absent refused. OICR refused for TIP. All existing gate tests unchanged | `sync-gate.spec.ts` |
| Unit | Builder: with `tocMapping` override → exactly the seven TIP keys, empty omitted, missing SP throws. Without override → today's JSON (existing tests). KP row: `type = knowledge_product`, `external_reference = TIP-<code>`, handle, common fields | `common-fields.builder.spec.ts`, `payload.builder.spec.ts` |
| Unit | Service: `origin` reaches the snapshot. For `TIP_SYNC`, the run `author` wins over a different `results.created_by` (JD-7 falsifier) and becomes `submitted_by`. Missing `tocMapping` → `REFUSED_BY_STAR`, stored alignment never read (JD-6 falsifier). No-`origin` path builds as today | `result-prms-sync.service.spec.ts` |
| Unit | TIP push phase: only version rows of the reporting year (the live call never adds one). Dedup. `candidates=0` returns before the code query. Null `tocMapping` → `not_eligible`, no `sync` call. Code-skip without a `sync` call. Every outcome key summed. **Sequential with deferred `sync` promises** (second not started before the first resolves). Throwing `sync` does not stop the rest nor fail the run. Actor set per candidate and cleared, including null. Summary counts | `tip-integration.service.spec.ts` |
| Integration (real MySQL, TEST container) | `loadGateSnapshot` returns `platform_code` for a TIP row. `idsWithPrmsCode` returns only rows with a code. The TIP gate path on a seeded TIP version row (status 20, KP, green, contributor) reaches the build with the ingest stubbed. A null-actor `sync()` writes a log row with `created_by IS NULL` (JD-10). An ACCEPTED stub writes `prms_result_code` on the TIP live row and not on a STAR row with the same official code (JD-13) | `test/tip-prms-push.integration-spec.ts` |
| Compile | `npm run build` — the runner does not type-check the new optional fields | every code task |
| Live (HITL) | One TIP sync with `year = 2026` locally → PRMS **TEST**. Read the log rows: at least one claimed TIP attempt, and its outcome and message. Settles OQ-2 (child 1 P-18) | owner + `execution.md` |

## 11. Rollout

1. Merge to `dev`. No migration.
2. The Dev weekly cron (or a manual `PATCH ipr-data/sync`) runs the push phase against PRMS TEST.
3. Kill switch: set `POOL_FUNDING_PRMS_SYNC_BUTTON_ENABLED` to its disable value. The push phase then counts every candidate `NOT_SENT (503)`, and the save still runs (NFR-TPP-004). The same flag also pauses the STAR button. That is accepted: one switch for one integration.
4. Backout: revert the code. Rows already accepted stay accepted in PRMS, and nothing in STAR needs cleaning.

## 12. Design decisions

| # | Decision | Rationale | Rejected |
| --- | --- | --- | --- |
| DD-1 | The equivalence is keyed on `origin = TIP_SYNC` **and** `platform_code = TIP` | Owner decision 3: only the sync pushes TIP. Keying on the platform alone would make the sidebar route send TIP KPs too | Platform only |
| DD-2 | Reuse `ResultPrmsSyncService.sync` per candidate | Gate, claim lock, log, 207 handling, code write-back and history are already correct and platform-aware. One code path for both platforms | A TIP-specific engine (duplicates settle/claim logic) |
| DD-3 | Push after all handles, before `endSync` | Pool Funding exists before the green check. The run guard covers the push. Handle errors and push errors stay separate | Push inside `syncHandle`; push after `endSync` (unguarded overlap) |
| DD-4 | `toc_mapping` override passed in from the in-memory TIP payload, with `toc_result_id` and `target_contribution` when TIP gives them; no fallback to the stored alignment | Owner decision 4 and JD-1 answer. The stored alignment has no `aow_compose_code` or `result_indicator_type_name`; PRMS resolves on `toc_result_id` (`common-fields.builder.ts:213-221`). Every candidate was written in the same run, so the payload is always in memory | Store the TIP mapping (schema change); read the stored alignment; the five example keys only |
| DD-5 | TIP `created_by` and `submitted_by` = the run's author staff + `created_at`, set in the service for `TIP_SYNC` only | No `submission_history` exists for TIP rows. FD-3 names the submitter. `results.created_by` is insert-only, so it can be stale (JD-7). STAR keeps its approval record | Writing a fake `submission_history` row (invents a STAR approval); reading `results.created_by` |
| DD-6 | Code-skip is a TIP pre-filter, not a gate entry | Owner decision 2 says no call and no log row. A gate entry would surface as an HTTP exception to classify. The engine's `is_synced_to_prms` refusal is kept, not added (RK-1) | New gate entry |
| DD-8 | A candidate with no TIP Pool Funding mapping is dropped before the gate | No stale-alignment send (JD-6); no log row per non-contributing KP per run (JD-8) | Letting the gate refuse it (one `REFUSED_BY_STAR` row per run) |
| DD-9 | An `UNKNOWN`/`TRANSPORT_FAILED` attempt is re-sent by the next run | Owner, 2026-10-26: the skip rule stays `prms_result_code` only; PRMS dedups by handle (RK-7) | Skipping until checked out of band |
| DD-7 | Candidates are version rows only | One push per handle and year. The live row of the reporting year is a copy of the same data. The engine copies the code onto it | Pushing the live row (two rows per handle with the same reference and year would contend for one claim) |

**Reversion challenge (Step 2.3):** DD-1 lifts KP and status-20 refusals that today hold for every platform. *What does removing this break?* Answer: nothing for STAR or the HTTP route, because the lift needs a server-only `origin` that no request can set. The falsifier is the unit test "TIP KP with no `origin` → refused" (T-01). The existing test that asserts the KP refusal (HANDOFF `:218-246`) stays green unchanged.

## 13. Premise Ledger

**Count:** 18 rows — 16 verified, 2 `UNVERIFIED` (1 High: P-13; 1 Low: P-14). Round-1 judges confirmed P-1..P-12 at source; P-15..P-18 added from their findings.
**Blast-radius triggers:**
- `live-path` — user action: run the TIP sync.
- `shared-state` — `evaluateSyncGate`, `ResultPrmsSyncService.sync`, `CommonFieldsBuilder.build` and `CurrentUserUtil` are shared with the STAR push.
- `consumer` — the exported `SyncGateSnapshot` / `SyncOptions` / `build` signatures change.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | The TIP run reaches `persistHandles` → `syncHandle` → `collectSaved` → `importPoolFunding`, then `logTipRunSummary` → `update` → `endSync` | live-path | cron `tip.cron.ts:15` → `tip-integration.controller.ts:45` → `tip-integration.service.ts:205-277`; `persistHandles` `:542-566`, `syncHandle` `:610-690`, `collectSaved` `:706-729`, `importPoolFunding` `:731-753` | 007a18fc | High — hook placed wrong | — |
| P-2 | `sync()` evaluates the gate on a snapshot loaded by `result_id`, then claims, builds, ingests and settles, awaiting PRMS | location | `result-prms-sync.service.ts:140-292` | 007a18fc | High — DD-2 | — |
| P-3 | Gate entries are pure functions of the snapshot. KP/OICR are refused at `indicator_mappable` and status ≠ 6 at `approved` | location | `sync-gate.ts:72-75,131-138,155-170,194-220` | 007a18fc | High — DD-1 | — |
| P-4 | `loadGateSnapshot` does not select `platform_code` today | existence | `result-prms-sync-log.repository.ts:167-193` (column list read in full) | 007a18fc | Low — T-01 adjusts | — |
| P-5 | The build throws on a missing `submitted_by`, and the aggregate reads it only from `submission_history` to Approved | location | `common-fields.builder.ts:420-429`; `result-prms-sync-aggregate.repository.ts:165-193` | 007a18fc | High — DD-5 | — |
| P-6 | `toc_mapping` is built from stored alignment and emits no `aow_compose_code` / `result_indicator_type_name`. The TIP DTO carries both, plus `toc_result_id` and `target_contribution` (9 keys) | location | `common-fields.builder.ts:195-238`; `response-year-tip.dto.ts:10-20` | 007a18fc | High — DD-4 | — |
| P-7 | `payload.poolFunding` is the primary project's TIP `toc_mapping`, set only when it contributes and has an SP | location | `tip-projects.mapper.ts:89-93` | 007a18fc | Low — candidate filter | — |
| P-8 | The KP builder takes the `'Handled'` evidence link and throws when absent | location | `knowledge-product.builder.ts:10-36` | 007a18fc | Low | — |
| P-9 | `CurrentUserUtil` is request-scoped, and `setSystemUser(user, true)` makes `user_id` the given user's id (or `undefined` for null). The TIP service and `saveAllSections` already share one instance for audit | shared-state | `current-user.util.ts:7-35`; `save-all-sections.service.ts:85,149,306`; TIP service injects it `tip-integration.service.ts:81` | 007a18fc | High — actor wrong (R-TPP-007) | — |
| P-10 | `ResultPrmsSyncModule` exports `ResultPrmsSyncService`, imports no TIP module, and `ReportingYearResolver` is global | other | `result-prms-sync.module.ts:22` (imports) and `:45` (exports) (imports `PrmsNormalizerModule, AppConfigModule, ResultUsersModule`); `global-utils.module.ts:21,31` | 007a18fc | Low — DI wiring | — |
| P-11 | The claim refuses `is_synced_to_prms = 1`, so an accepted row with no code is not re-sent | existence | `result-prms-sync-log.repository.ts:281-283`; gate `sync-gate.ts:115-121` (predicate `:119`) | 007a18fc | Low — RK-1 | — |
| P-12 | The TIP save path never clears `prms_result_code` / `is_synced_to_prms`. It writes the code only when the mapped result carries one, and TIP's does not | location | `save-all-sections.service.ts:215-216`; no other hit in `grep -n "is_synced_to_prms\|prms_result_code" shared/services/save-all-sections.service.ts entities/results/results.service.ts` (2 hits, both `:215-216`) | 007a18fc | High — re-push every run | — |
| P-13 | Dev holds ≥ 1 TIP 2026 version row in status 20, Pool Funding green, contributing primary, no code — so the push has something to send | data-env | `UNVERIFIED — confirm at source before relying on it` (read-only query 2026-10-26: `connect ETIMEDOUT`, VPN) | — | High — feature unreachable on Dev (spike measured 0 alignment rows on KPs, 2026-09-16, before phase 1 imported Pool Funding) | T-04 first step (owner VPN) |
| P-15 | `results.created_by` is set only on insert; the update path does not rewrite it | location | `results.service.ts:435`; `save-all-sections.service.ts:191-200` (judge B J-3, re-read by the architect) | 007a18fc | High — stale author (DD-5) | — |
| P-16 | The run guard is `IN_PROGRESS` and younger than 6 h, measured from the run's `created_at` | location | `tip-integration.service.ts:206-210`; `sync-process-log.service.ts:51-64` | 007a18fc | Low — RK-8 | — |
| P-17 | The stored builder sends `toc_result_id` because PRMS resolves on it, and dropping it once produced a missing-field error | other | `common-fields.builder.ts:213-221` (comment) | 007a18fc | Low — DD-4 | — |
| P-18 | `throwHttp` raises `HttpException` subclasses and `PrmsSyncPersistedRefusalException` extends `UnprocessableEntityException`, so the classifier must test the refusal first | location | `result-prms-sync.service.ts:110-121`; judge A (no-row premises) | 007a18fc | Low — misclassified counts | — |
| P-14 | PRMS accepts `TIP-<code>` and a KP carrying every common field | data-env | `UNVERIFIED — confirm at source before relying on it` (child 1 P-18; spike got no KP ACCEPTED) | — | Low — payload adjusts, approach stands | T-05 live TEST push |

`consumer` rows: `SyncGateSnapshot` is read by `sync-gate.spec.ts` and the service. `SyncOptions`/`sync()` are read by the controller and the service spec. `build()` is read by `payload.builder.spec.ts` and `common-fields.builder.spec.ts`. The full test-file sweep goes in each task's `Consumers` field (Step 3.2).

## 14. Budget (Step 2.4)

| Measure | Estimate |
| --- | --- |
| Tasks | 6 (T-05 integration spec and T-06 live HITL split out at Phase 3) |
| LOC (incl. tests) | ~850 |
| Review rounds | 8 |

Depth `Full` holds on risk (shared gate on STAR's path, outbound integration). The volume is Standard.

## 15. Open questions

OQ-1 (`submitted_date`) and OQ-2 (PRMS acceptance) carry over from `requirements.md` §9. Nothing else blocks.
