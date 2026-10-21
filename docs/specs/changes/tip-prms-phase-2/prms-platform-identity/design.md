# Design — PRMS Sync / Platform identity for TIP results

- **Module:** prms-sync + prms-webhook (server) · bilateral read path (client)
- **Spec id:** 2026-10-prms-platform-identity
- **Status:** draft
- **Owner:** David Casañas
- **Linked requirements:** ./requirements.md
- **Linked TRD section:** ../../../../trd/trd.md (integrations — PRMS Normalizer; result lifecycle)
- **Family:** ../family.md (child 1 of 3)
- **Depth:** Full
- **Last updated:** 2026-10-21

---

## 1. Executive summary

One rule, applied everywhere a PRMS sync is written or matched: **a result is identified by `(platform_code, official_code)`, and its PRMS reference is a pure function of that pair** — the bare code for STAR, `<PLATFORM>-<code>` otherwise.

- A shared **reference function and its inverse** (D-1) replace every ad-hoc `String(code)` and the correlator's digits-only parse.
- The sync log and the decision history gain `platform_code` (D-2, D-3); every reader adds it to its key (D-6).
- The correlator parses the prefix and looks up the live row of that platform (D-4); the PRMS-code copy uses the pushed row's platform (D-5).
- The client asks for Pool Funding on TIP results and sends the numeric code (D-7).

No change to the STAR gate, payload, or values: for STAR every key and reference is what it is today.

**Budget (tripwire for `/akili-execute`):** 6 tasks · ~800 LOC (≈ 260 production, 540 tests) · 10 review rounds.

## 2. Goals & non-goals

**Goals** — R-PPI-001…006, NFR-PPI-001/002.

**Non-goals**
- No TIP push (child 3); no TIP versioning (child 2).
- No change to `evaluateSyncGate`, payload fields other than `external_reference` for non-STAR, or the 207 interpretation (R-F4).
- No repair of the three stale DB-backed specs beyond what this spec's own verification needs (P-17).
- No UI change beyond fetching and showing the existing section.

## 3. Architecture overview

```mermaid
flowchart LR
  subgraph Outbound
    B[Payload builder] -->|ref = prmsRef(platform, code)| N[PRMS Normalizer]
    C[Claim / refused insert] -->|log: platform_code + ref| L[(result_prms_sync_log)]
    S[Settle] -->|COALESCE ref - same value| L
    S -->|code copy, same platform| R[(results live row)]
    O[Outbound history] -->|platform_code + bare code| H[(result_prms_sync_history)]
  end
  subgraph Inbound
    W[Webhook delivery] -->|parsePrmsRef(ref)| H
    K[Correlator] -->|live row WHERE platform| R
  end
  subgraph Reads
    SR[Status reader] --> L & H
    HR[History reader] --> H
    D[Mapping diff/apply] --> R
  end
```

## 4. Extended directory structure

```
server/researchindicators/src/
├── db/migrations/<ts>-addPlatformCodeToPrmsSyncTables.ts        # NEW
├── db/migration-specs/<ts>-addPlatformCodeToPrmsSyncTables.spec.ts  # NEW (§9 placement rule)
└── domain/
    ├── tools/prms-normalizer/
    │   ├── reference/prms-external-reference.ts (+ .spec.ts)      # NEW pure: prmsRef / parsePrmsRef
    │   └── builders/common-fields.builder.ts                       # uses prmsRef
    ├── entities/result-prms-sync/
    │   ├── entities/result-prms-sync-log.entity.ts                 # + platform_code, index
    │   ├── repositories/result-prms-sync-log.repository.ts         # claim/refused/MAX+1/in-flight/live copy
    │   ├── result-prms-sync-status.reader.ts                       # platform in key
    │   └── prms-sync-history.reader.ts                             # platform in key
    └── entities/prms-webhook/
        ├── entities/prms-webhook-delivery.entity.ts                # + platform_code, index
        ├── repositories/prms-webhook-delivery.repository.ts        # inbound/outbound/imported writes
        ├── prms-webhook-delivery.service.ts                        # parse at insert
        ├── delivery-correlator.service.ts                          # prefix parse, platform live row
        └── pool-funding-mapping-diff.service.ts                    # ACTIVE_SNAPSHOT_SQL platform
client/research-indicators/src/app/shared/
├── utils/platform-code.util.ts (+ spec)                            # TIP pool-funding capable
└── services/api.service.ts · bilateral.service.ts (+ specs)        # numeric code for any platform prefix
```

## 5. Data model

| Table | Change | Backfill | Index |
| --- | --- | --- | --- |
| `result_prms_sync_log` | `platform_code varchar(50) NOT NULL` | The platform of the result the row's `(external_reference, result_year)` names; `STAR` when STAR is among the matches or nothing matches (P-19: on Dev all 3 rows are STAR `627/2026`) | `idx_result_prms_sync_log_code_year (external_reference, result_year)` → `(platform_code, external_reference, result_year)` |
| `result_prms_sync_history` | `platform_code varchar(50) NULL` | `STAR` where `correlation_outcome = 'CORRELATED'` (the correlator matches STAR only today, P-13) or `event_source = 'STAR'` (outbound and imported rows are STAR pushes/imports, P-11/P-12); NULL otherwise | `idx_result_prms_sync_history_code_year` → `(platform_code, result_official_code, result_year)` |

No FK to `reporting_platforms` (the history must accept an uncorrelated row; the log mirrors it for symmetry). `result_official_code` in the history holds the **bare code** for every parsed reference; an unparseable inbound reference keeps its raw string and a NULL platform (today's UNKNOWN_REFERENCE path, unchanged). **Migration order:** add both columns nullable → backfill → `MODIFY` the log column to `NOT NULL` → drop the old `(code, year)` indexes → create the new ones. **Down:** drop the new indexes → recreate the old ones → drop the columns. No default on the log column: every writer sets it (§7.2/§7.3), and a missing value must fail loudly, not silently become STAR.

## 6. API design

No endpoint change. Wire changes:
- **PRMS ingest:** `external_reference` = `TIP-<code>` for TIP; STAR unchanged (R-PPI-003).
- **STAR client → server:** `GET …/pool-funding-alignment` for a TIP result is called with the numeric code; the existing interceptor adds `reportingPlatforms=TIP` from the **page** URL (`/result/TIP-123`), not from the request URL (P-15). Response shape unchanged.

## 7. Backend module design

### 7.1 Reference function (D-1)
`prmsRef(platform, code)` → STAR: the code as a string; any other platform: `<platform>-<code>`. `parsePrmsRef(ref)` → `{platform, code}` only for the **canonical forms `prmsRef` produces**: a code with no leading zero that is a positive safe integer (the rule `parseOfficialCode` enforces today, `delivery-correlator.service.ts:95-104`), either bare (STAR) or prefixed by an exact, upper-case `ReportingPlatformEnum` value other than STAR plus `-`. Everything else → null: `STAR-123` (STAR is bare only), `tip-123`, `TIP-007`, `TIP-0`, `TIP-`, `TIP-12a`, an unsafe integer, `''`, null. It is the exact inverse of `prmsRef`. Lives with the normalizer tool; pure, no DB.

### 7.2 Sync log (R-PPI-001/002/005)
- `claimInsideLock` and `insertRefusedByStarInsideLock` read the result's `platform_code` in the SELECT they already run and write `platform_code` + `external_reference = prmsRef(platform, code)` — so the claim and the settle carry the **same** value (today they differ only when the payload would differ, P-6).
- In-flight lookup and both `MAX(attempt_number)+1` queries key on `(platform_code, external_reference, result_year)`.
- `settleTransaction` unchanged (its COALESCE now writes the same value).
- `recordPrmsResultCodeOnLiveVersion`: `live.platform_code = pushed.platform_code` instead of the `'STAR'` literal. **No year predicate is added** — the live row can belong to another reporting year than the pushed snapshot (P-10).

### 7.3 Decision history (R-PPI-001/002/004)
- **Outbound** (`recordOutboundPendingReview`): writes `platform_code` of the pushed result and `result_official_code` = bare code (today it writes the payload reference, which for STAR is already the bare code — P-11).
- **Inbound** (`recordInsideLock`, via the delivery service): `parsePrmsRef` at insert → `platform_code` + bare code; unparseable → raw string, NULL platform.
- **Imported** (`replaceImportedHistory`, PRMS importer): writes `STAR` explicitly, **and its DELETE (`prms-webhook-delivery.repository.ts:471-476`) and its `NOT EXISTS` dedupe (`:511-520`) add `platform_code = 'STAR'`** — otherwise a TIP row with the same code and year would be deleted or would suppress the STAR insert (P-12).
- History finders with no production caller (`findHistoryByResultCodeAndYear`, `findHistory`) gain the platform parameter for consistency; no new caller.

### 7.4 Correlator (R-PPI-004)
`classify` uses `parsePrmsRef`: null ref → NO_REFERENCE; unparseable → UNKNOWN_REFERENCE (as today); parsed → `LIVE_ROW_SQL` with `platform_code = parsed.platform` instead of the `'STAR'` literal. Everything after a match (store outcome + year, diff, apply) unchanged.

### 7.5 Readers (R-PPI-002)
- Status reader `LAST_ATTEMPT_SQL`: match the log on `platform_code` and `external_reference = prmsRef(...)` of the result (the same function, expressed in SQL as a `CASE` on `platform_code`); `LAST_DECISION_SQL`: history on `(platform_code, code, year)`.
- History reader: `RESULT_METADATA_SQL` selects `platform_code`; `EVENTS_SQL` / `SYNC_COUNT_SQL` key on it.
- Mapping diff and apply: `HISTORY_ROW_SQL` (`pool-funding-mapping-diff.service.ts:48`) and `HISTORY_SQL` (`pool-funding-mapping-apply.service.ts:36`) also select `platform_code`; `resolveActiveSnapshot` (`diff.service.ts:419`) gains a platform parameter, passed by both callers (`diff.service.ts:838`, `apply.service.ts:515`); `ACTIVE_SNAPSHOT_SQL` filters on it (P-14). A history row with a NULL platform is never correlated, so it never reaches these paths.
- **One SQL expression for the reference.** The `CASE` used in readers is defined once next to `prmsRef` and asserted against it in a test over every `ReportingPlatformEnum` value (KZ-001: the property is asserted in the SQL output, not the call).

### 7.6 Logging
Unchanged lines; the correlator's existing "multiple live rows" warn now names the platform.

## 8. Frontend / UX

- `POOL_FUNDING_PLATFORMS` = `[STAR, TIP]` (R-PPI-006). AICCRA, PRMS, BILATERAL stay excluded.
- `bilateralPath` (`api.service.ts`) strips **any** known platform prefix, not only `STAR-`, so the route receives digits (P-15); platform travels in the interceptor's `reportingPlatforms` query.
- No template or component change: the Pool Funding component is already read-only for any external result (P-16); the sidebar rule `eligible || display_only` is unchanged.
- Specs to flip: `platform-code.util.spec.ts` (`toEqual([STAR])`), `bilateral.service.spec.ts:296-297,339` (asserts zero requests for `TIP-…`).

## 9. Shared contracts

`external_reference` gains a second form (`TIP-<code>`). The inverse `parsePrmsRef` is the single parser; `ReportingPlatformEnum` is its closed set.

## 10. Design decisions

| # | Decision | Rationale | Rejected alternative |
| --- | --- | --- | --- |
| D-1 | One pure `prmsRef` / `parsePrmsRef` pair, and one SQL `CASE` tested against it | Today the same identity is produced in three places (claim `String(code)`, builder, correlator regex). One function makes STAR provably unchanged and TIP consistent | Prefix only in the builder (the claim would still write `123`, settle would flip it to `TIP-123`, P-6) |
| D-2 | `platform_code` on the log **and** the prefixed reference | The owner asked for the column; the prefix alone already separates the log keys, but readers that start from a `results` row need a plain equality, not a string build | Prefix only, no column |
| D-3 | History `platform_code` nullable; `result_official_code` always the bare code when parsed | Uncorrelated deliveries genuinely have no platform; keeping the code bare keeps every reader's numeric join | NOT NULL with a fake platform; storing `TIP-123` in the code column |
| D-4 | Correlator accepts any `ReportingPlatformEnum` prefix | The parser is the closed set; only STAR/TIP push today, but a third platform needs no correlator change | Hard-code `TIP-` |
| D-5 | PRMS-code copy keyed on the pushed row's platform; **no year predicate** | Adding a year would break STAR, whose live row can be another year than the pushed snapshot. TIP cannot copy across years by accident: each TIP year row gets its own official code (P-20). R-PPI-005 amended to match | Copy by `(platform, code, year)` |
| D-6 | Unused history finders updated, not deleted | Keeps the repository's surface consistent; deletion is out of scope | Delete them |
| D-7 | Client sends the numeric code for any prefixed result | The server route is digits-only and platform comes from the interceptor — the same contract every other result section already uses | Widen the server route token (shared by every result route) |

**Reversion challenge (Step 2.3):** one DD removes a shipped guard — D-7 / R-PPI-006 drops TIP from the client's "never fetch pool funding" exclusion. *What does removing it break?* The server already serves TIP alignments (`display_only`, phase 1); the component is read-only for external results (P-16); the only other reader of `POOL_FUNDING_PLATFORMS` is its own spec (P-15). A TIP result with no alignment gets a 200 with no alignment row and stays hidden (`!alignment`). No breakage found; AICCRA/PRMS/BILATERAL keep the guard.

## 11. Premise Ledger

Verified: 19 · UNVERIFIED: 1 (High 1) — after judgment-day round 1 (`./judgment.md`)
Blast-radius triggers: `live-path` (webhook delivery → correlator → live row, P-13), `shared-state` (`external_reference` written by claim, settle and builder, P-6), `consumer` (both tables' readers/writers, `POOL_FUNDING_PLATFORMS`, P-9/P-15).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | Official codes are numbered per platform, so TIP 123 and STAR 123 can coexist | data-env | `domain/entities/results/results.service.ts:495-514` `newOfficialCode(platform)` (re-read by judge B at b7aa52e97) | b7aa52e97 | Spec unnecessary (High) | — |
| P-2 | The log has no code column; its key is `(external_reference, result_year)` | location | `result-prms-sync-log.entity.ts:14-119`, index `:15-18`; migration `1790023167000:37,46` | 05d056577 | D-2 index shape changes (Low) | — |
| P-3 | History `result_official_code` is `varchar(191)`; index `(code, year)` | location | `prms-webhook-delivery.entity.ts:28-35`; `1790086170692:81-83` | 05d056577 | D-3 backfill regex (Low) | — |
| P-4 | `results.platform_code` is `varchar(50)`, FK to `reporting_platforms` | location | `result.entity.ts:176-182`; `1756224758843:11-17` | 05d056577 | Column type (Low) | — |
| P-5 | `ReportingPlatformEnum` = STAR, PRMS, TIP, AICCRA, BILATERAL | location | `results/enum/reporting-platform.enum.ts:1-7` | 05d056577 | D-4 parser set (Low) | — |
| P-6 | **shared-state:** claim writes `String(code)` (`log.repository.ts:267`, `:398`), settle overwrites with `COALESCE(payload ref, ref)` (`:471`), builder sends `String(code)` (`common-fields.builder.ts:430-437`), service reads it back (`readExternalReference`, `result-prms-sync.service.ts:319`, called at `:233`), interpreter matches by string equality (`prms-sync-response.interpreter.ts:100,149-150,175-186`) | shared-state | as listed | 05d056577 | D-1 misses a writer → TIP log row flips key mid-attempt (High) | — |
| P-7 | Claim and refused-insert SELECTs have the `result_id` in scope; `platform_code` is not selected yet | location | `log.repository.ts:242`, `:384` | 05d056577 | D-1 needs another lookup (Low) | — |
| P-8 | In-flight lookup and MAX+1 key on `(external_reference, year)` | location | `log.repository.ts:273-284`, `:323-332`, `:400-408` | 05d056577 | R-PPI-002 attempt-number scenario (High) | — |
| P-9 | **consumer:** readers/writers of both tables | consumer | `grep -rlE "result_prms_sync_log|ResultPrmsSyncLog|result_prms_sync_history|ResultPrmsSyncHistory|PrmsWebhookDelivery" server/researchindicators/src server/researchindicators/test client/research-indicators/src` (run from repo root, unescaped `|`) → **43** files, **21** non-spec. Of the 21: SQL readers/writers — all §7 sites (`result-prms-sync-log.repository.ts`, `result-prms-sync-status.reader.ts`, `prms-sync-history.reader.ts`, `result-prms-sync.service.ts`, `prms-webhook-delivery.repository.ts`, `prms-webhook-delivery.service.ts`, `delivery-correlator.service.ts`, `pool-funding-mapping-diff.service.ts`, `pool-funding-mapping-apply.service.ts`, `prms.opensearch.service.ts`); entities (2); wiring with no SQL (`result-prms-sync.module.ts`, `prms-webhook-callback.module.ts`, `prms-webhook-callback.controller.ts` — injects the service only, `prms.opensearch.module.ts`); a doc comment (`delivery-processing-state.enum.ts:2`); migrations (3); client comment (`result-sidebar.component.ts:277`) | b7aa52e97 | A reader still mixes platforms (High) | — |
| P-10 | The live-row PRMS-code copy joins on official code only, platform literal `'STAR'`, no year | location | `log.repository.ts:620-629` (`:627`) | 05d056577 | D-5 (High) | — |
| P-11 | Outbound history writes the payload reference into `result_official_code` | location | `prms-webhook-delivery.repository.ts:426-451`; caller `result-prms-sync.service.ts:302-309` | 05d056577 | D-3 (Low) | — |
| P-12 | `replaceImportedHistory` writes STAR rows (row found with `platform_code: STAR`), and its DELETE and `NOT EXISTS` dedupe key on `(result_official_code, result_year)` only | location | `prms-webhook-delivery.repository.ts:464` (method), DELETE `:471-476`, `NOT EXISTS` `:511-520`; `prms.opensearch.service.ts:513`, `:715` | b7aa52e97 | A TIP row deletes or suppresses STAR imported history (High) | — |
| P-13 | **live-path:** webhook → delivery service keeps the raw ref (`prms-webhook-delivery.service.ts:222-235`) → `recordInsideLock` (`delivery.repository.ts:304-353`) → correlator `classify` (`delivery-correlator.service.ts:234-248`) → `parseOfficialCode` digits-only (`:95-104`) → `LIVE_ROW_SQL` `platform_code='STAR'`, no year (`:26-34`) → `finish()` (`:250`) stores outcome/year, then diff and apply run (`:195-204`) | live-path | as listed | 05d056577 | D-4 attached to the wrong step (High) | — |
| P-14 | Mapping diff `ACTIVE_SNAPSHOT_SQL` selects `results` by code + year + snapshot with no platform; `HISTORY_ROW_SQL` / apply `HISTORY_SQL` select no platform; `resolveActiveSnapshot` has no platform parameter | location | `pool-funding-mapping-diff.service.ts:48`, `:58-65`, `:419`, `:838`; `pool-funding-mapping-apply.service.ts:36`, `:515` | b7aa52e97 | Decision applied to the wrong platform's snapshot (High) | — |
| P-15 | **consumer (client):** `POOL_FUNDING_PLATFORMS=[STAR]` read only by `bilateral.service.ts:20,165` and `platform-code.util.spec.ts:57-78`; `getAlignment` returns null for non-capable codes (`bilateral.service.ts:164-180`); `bilateralPath` strips only `STAR-` (`api.service.ts:844-846`); route token `:resultCode(\\d+)` (`results.util.ts:157`); `result.interceptor.ts:22-34,63-69` adds `reportingPlatforms=TIP` on `/result/TIP-123`; spec `bilateral.service.spec.ts:296-297,339` asserts zero requests for `TIP-…` | consumer | `grep -rn "POOL_FUNDING_PLATFORMS\|isPoolFundingCapable" client/research-indicators/src` (scout) | 05d056577 | D-7 404s or still skips (High) | — |
| P-16 | Pool Funding component is read-only for any non-STAR result | location | `bilateral.service.ts:96-97` (`editable` false when `isExternalResult()`); `cache.service.ts:135-138`; `pool-funding-alignment.component.ts:231`, HTML `:128,139,335` | 05d056577 | R-PPI-006 BUT needs a UI change (Low) | — |
| P-17 | Three DB-backed specs still use the `result_id` column `1790023167000` dropped, so they cannot pass on the migrated schema: `test/result-prms-sync-log-outcome.integration-spec.ts:115-118`, `test/result-prms-sync-claim-concurrency.integration-spec.ts:145,274,307`, `test/prms-sync.e2e-spec.ts:385-387`; `test/prms-webhook.e2e-spec.ts:37-73` builds its own table | data-env | grep of `result_id` in the three files vs `1790023167000` DROP COLUMN (judge A, b7aa52e97) — refuted as a regression gate | b7aa52e97 | — (the integration gate is the new spec, §13) | — |
| P-18 | PRMS accepts and echoes `TIP-<code>` as `external_reference` unchanged | data-env | `UNVERIFIED — confirm at source before relying on it` — evidence only: contract doc `docs/technical-docs/prms-normalizer/prms-normalizer-technical-field-documentation.md:141` ("Max 191 characters. Stored and returned verbatim"); real capture echoing non-numeric `ARI-SPIKE-20260914-01` (`prms-normalizer/response/__fixtures__/prms-accepted-response.capture.json:18`). Failure mode if PRMS ever transforms it: the interpreter matches response rows by exact string equality (`prms-sync-response.interpreter.ts:100`), so the row would read as missing — surfaced as a failed sync, never as a wrong match | — | FD-2 / R-PPI-003 must change (High) | Child 3's first TEST-env push — the first moment a `TIP-` reference is sent (owner: child 3); family FD-2 and requirements OQ-1 point here |
| P-19 | Every existing sync-log row on Dev is a STAR push, and every history row is CORRELATED with a numeric code | data-env | read-only Dev query 2026-10-21: `SELECT id, external_reference, result_year, outcome FROM result_prms_sync_log` → 3 rows (`627/2026`), each matching only a STAR result; history grouped by `event_source, correlation_outcome, numeric` → `STAR/CORRELATED/1` ×2, `PRMS/CORRELATED/1` ×1 | b7aa52e97 (Dev data) | Backfill rule mis-tags rows (Low — §5 derives the platform by join anyway) | — |
| P-20 | Each TIP year row gets its own official code, so a TIP code has at most one live row | location | `shared/services/save-all-sections.service.ts:147-155` (`manageOfficialCode` → `newOfficialCode(platform)` on create) | b7aa52e97 | D-5 could copy a TIP code onto several live rows (Low) | — |

## 12. Observability

No new log lines. The correlator's existing multiple-live-rows `warn` adds the platform. Migration logs nothing.

## 13. Testing strategy

| Suite | What |
| --- | --- |
| `prms-external-reference.spec.ts` (new) | `prmsRef` / `parsePrmsRef` round-trip for every enum value; STAR bare; `TIP-123`; null for `STAR-123`, `tip-123`, `TIP-007`, `TIP-0`, `TIP-`, `TIP-12a`, `XYZ-1`, an unsafe integer, `''`, null; the SQL `CASE` asserted to produce `prmsRef` for every enum value (KZ-001) |
| `result-prms-sync-log.repository.spec.ts` | claim/refused write `platform_code` + `prmsRef`; MAX+1 and in-flight include platform; live copy uses pushed platform and **no** year |
| status / history readers specs | platform in every key; same-code STAR+TIP fixture |
| delivery repository / service / correlator specs | inbound parse; `TIP-123` → TIP live row; `123` → STAR; `XYZ-123` → UNKNOWN_REFERENCE |
| mapping diff / apply specs | snapshot lookup by platform |
| builder spec | STAR bare, TIP prefixed |
| migration spec (`db/migration-specs/`) | up order (nullable → backfill → NOT NULL → index swap) and both backfill rules; down order (drop new indexes → recreate old → drop columns) |
| `test/prms-platform-identity.integration-spec.ts` (new, `test:integration`) | On the TEST schema: STAR 123 + TIP 123 same year; log/history rows for STAR; readers' SQL returns nothing for TIP; next attempt for TIP = 1; correlator on `TIP-123` hits TIP |
| client specs | `POOL_FUNDING_PLATFORMS`, `getAlignment` for `TIP-…` issues one request with the numeric path; sidebar shows tab when `display_only` |
| existing unit suites | `result-prms-sync*`, `prms-webhook*`, `bilateral*`, `save-all-sections` unit specs unchanged and green (except the SQL-text assertions this design changes) |
| existing DB-backed specs | **Already broken before this spec** (P-17): three specs still use the dropped `result_id` column. They are not this spec's regression gate; the new integration spec is. `prms-webhook.e2e-spec.ts` builds its own history table and needs the new column only if it is run (recorded, not fixed here) |
| migration run | `npm run compose:test:up` → `npm run migration:test:bootstrap` → `npm run migration:test:revert` on a fresh container (NFR-PPI-002; FP-49: bootstrap once per container) |

## 14. Rollout

- Migration applied on Dev by the pipeline (root `CLAUDE.md` §4.3 correction 2026-08-27); Prod per the owner's process.
- Backout: revert commits + `migration:revert`; the backfilled STAR rows are unaffected by the down.
- No PRMS communication needed until child 3 sends the first `TIP-` reference.
