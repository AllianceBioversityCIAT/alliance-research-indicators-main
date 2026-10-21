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
| `result_prms_sync_log` | `platform_code varchar(50) NOT NULL` | `STAR` (every row is a STAR push today, P-9) | `idx_result_prms_sync_log_code_year (external_reference, result_year)` → `(platform_code, external_reference, result_year)` |
| `result_prms_sync_history` | `platform_code varchar(50) NULL` | `STAR` where `result_official_code REGEXP '^[0-9]+$'`, else NULL | `idx_result_prms_sync_history_code_year` → `(platform_code, result_official_code, result_year)` |

No FK to `reporting_platforms` (the history must accept an uncorrelated row; the log mirrors it for symmetry). `result_official_code` in the history holds the **bare code** for every parsed reference; an unparseable inbound reference keeps its raw string and a NULL platform (today's UNKNOWN_REFERENCE path, unchanged). Down migration: drop the column, restore the previous index definitions.

## 6. API design

No endpoint change. Wire changes:
- **PRMS ingest:** `external_reference` = `TIP-<code>` for TIP; STAR unchanged (R-PPI-003).
- **STAR client → server:** `GET …/pool-funding-alignment` for a TIP result is called with the numeric code; the existing interceptor adds `reportingPlatforms=TIP` (P-15). Response shape unchanged.

## 7. Backend module design

### 7.1 Reference function (D-1)
`prmsRef(platform, code)` → STAR: the code as a string; any other platform: `<platform>-<code>`. `parsePrmsRef(ref)` → `{platform, code}` when the ref is a plain number (STAR) or `<ENUM VALUE>-<digits>` for a `ReportingPlatformEnum` value other than STAR; otherwise null. Total inverse on every value `prmsRef` produces. Lives with the normalizer tool; pure, no DB.

### 7.2 Sync log (R-PPI-001/002/005)
- `claimInsideLock` and `insertRefusedByStarInsideLock` read the result's `platform_code` in the SELECT they already run and write `platform_code` + `external_reference = prmsRef(platform, code)` — so the claim and the settle carry the **same** value (today they differ only when the payload would differ, P-6).
- In-flight lookup and both `MAX(attempt_number)+1` queries key on `(platform_code, external_reference, result_year)`.
- `settleTransaction` unchanged (its COALESCE now writes the same value).
- `recordPrmsResultCodeOnLiveVersion`: `live.platform_code = pushed.platform_code` instead of the `'STAR'` literal. **No year predicate is added** — the live row can belong to another reporting year than the pushed snapshot (P-10).

### 7.3 Decision history (R-PPI-001/002/004)
- **Outbound** (`recordOutboundPendingReview`): writes `platform_code` of the pushed result and `result_official_code` = bare code (today it writes the payload reference, which for STAR is already the bare code — P-11).
- **Inbound** (`recordInsideLock`, via the delivery service): `parsePrmsRef` at insert → `platform_code` + bare code; unparseable → raw string, NULL platform.
- **Imported** (`replaceImportedHistory`, PRMS importer): writes `STAR` explicitly (its rows are STAR rows today, P-12).
- History finders with no production caller (`findHistoryByResultCodeAndYear`, `findHistory`) gain the platform parameter for consistency; no new caller.

### 7.4 Correlator (R-PPI-004)
`classify` uses `parsePrmsRef`: null ref → NO_REFERENCE; unparseable → UNKNOWN_REFERENCE (as today); parsed → `LIVE_ROW_SQL` with `platform_code = parsed.platform` instead of the `'STAR'` literal. Everything after a match (store outcome + year, diff, apply) unchanged.

### 7.5 Readers (R-PPI-002)
- Status reader `LAST_ATTEMPT_SQL`: match the log on `platform_code` and `external_reference = prmsRef(...)` of the result (the same function, expressed in SQL as a `CASE` on `platform_code`); `LAST_DECISION_SQL`: history on `(platform_code, code, year)`.
- History reader: `RESULT_METADATA_SQL` selects `platform_code`; `EVENTS_SQL` / `SYNC_COUNT_SQL` key on it.
- Mapping diff `ACTIVE_SNAPSHOT_SQL` (and the apply service through `resolveActiveSnapshot`): add the history row's `platform_code` (P-14).
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
| D-5 | PRMS-code copy keyed on the pushed row's platform; **no year predicate** | Adding a year would break STAR, whose live row can be another year than the pushed snapshot | Copy by `(platform, code, year)` |
| D-6 | Unused history finders updated, not deleted | Keeps the repository's surface consistent; deletion is out of scope | Delete them |
| D-7 | Client sends the numeric code for any prefixed result | The server route is digits-only and platform comes from the interceptor — the same contract every other result section already uses | Widen the server route token (shared by every result route) |

**Reversion challenge (Step 2.3):** one DD removes a shipped guard — D-7 / R-PPI-006 drops TIP from the client's "never fetch pool funding" exclusion. *What does removing it break?* The server already serves TIP alignments (`display_only`, phase 1); the component is read-only for external results (P-16); the only other reader of `POOL_FUNDING_PLATFORMS` is its own spec (P-15). A TIP result with no alignment gets a 200 with no alignment row and stays hidden (`!alignment`). No breakage found; AICCRA/PRMS/BILATERAL keep the guard.

## 11. Premise Ledger

Verified: 17 · UNVERIFIED: 2 (High 1, Low 1)
Blast-radius triggers: `live-path` (webhook delivery → correlator → live row, P-13), `shared-state` (`external_reference` written by claim, settle and builder, P-6), `consumer` (both tables' readers/writers, `POOL_FUNDING_PLATFORMS`, P-9/P-15).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | Official codes are numbered per platform, so TIP 123 and STAR 123 can coexist | data-env | `domain/entities/results/results.service.ts:496-515` (scout run 1) | 1f56dda25 | Spec unnecessary (High) | — (re-read in T-01 first step) |
| P-2 | The log has no code column; its key is `(external_reference, result_year)` | location | `result-prms-sync-log.entity.ts:14-119`, index `:15-18`; migration `1790023167000:37,46` | 05d056577 | D-2 index shape changes (Low) | — |
| P-3 | History `result_official_code` is `varchar(191)`; index `(code, year)` | location | `prms-webhook-delivery.entity.ts:28-35`; `1790086170692:81-83` | 05d056577 | D-3 backfill regex (Low) | — |
| P-4 | `results.platform_code` is `varchar(50)`, FK to `reporting_platforms` | location | `result.entity.ts:176-182`; `1756224758843:11-17` | 05d056577 | Column type (Low) | — |
| P-5 | `ReportingPlatformEnum` = STAR, PRMS, TIP, AICCRA, BILATERAL | location | `results/enum/reporting-platform.enum.ts:1-7` | 05d056577 | D-4 parser set (Low) | — |
| P-6 | **shared-state:** claim writes `String(code)` (`log.repository.ts:267`, `:398`), settle overwrites with `COALESCE(payload ref, ref)` (`:471`), builder sends `String(code)` (`common-fields.builder.ts:430-437`), service reads it back (`result-prms-sync.service.ts:368-374`), interpreter matches by string equality (`prms-sync-response.interpreter.ts:100,149-150,175-186`) | shared-state | as listed | 05d056577 | D-1 misses a writer → TIP log row flips key mid-attempt (High) | — |
| P-7 | Claim and refused-insert SELECTs have the `result_id` in scope; `platform_code` is not selected yet | location | `log.repository.ts:242`, `:384` | 05d056577 | D-1 needs another lookup (Low) | — |
| P-8 | In-flight lookup and MAX+1 key on `(external_reference, year)` | location | `log.repository.ts:273-284`, `:323-332`, `:400-408` | 05d056577 | R-PPI-002 attempt-number scenario (High) | — |
| P-9 | **consumer:** readers/writers of both tables — 44 files across `src/`, `test/`, client | consumer | `grep -rlE "result_prms_sync_log\|ResultPrmsSyncLog\|result_prms_sync_history\|ResultPrmsSyncHistory\|PrmsWebhookDelivery" server/researchindicators/src server/researchindicators/test client/research-indicators/src` → 44 files; every non-spec hit is a §7 site; client: one comment (`result-sidebar.component.ts:277`) | 05d056577 | A reader still mixes platforms (High) | — |
| P-10 | The live-row PRMS-code copy joins on official code only, platform literal `'STAR'`, no year | location | `log.repository.ts:620-629` (`:627`) | 05d056577 | D-5 (High) | — |
| P-11 | Outbound history writes the payload reference into `result_official_code` | location | `prms-webhook-delivery.repository.ts:426-451`; caller `result-prms-sync.service.ts:302-309` | 05d056577 | D-3 (Low) | — |
| P-12 | `replaceImportedHistory` writes STAR rows (row found with `platform_code: STAR`) | location | `prms-webhook-delivery.repository.ts:471-547`; `prms.opensearch.service.ts:513`, `:715` | 05d056577 | Imported rows mis-platformed (Low) | — |
| P-13 | **live-path:** webhook → delivery service keeps the raw ref (`prms-webhook-delivery.service.ts:222-235`) → `recordInsideLock` (`delivery.repository.ts:304-353`) → correlator `classify` (`delivery-correlator.service.ts:234-248`) → `parseOfficialCode` digits-only (`:95-104`) → `LIVE_ROW_SQL` `platform_code='STAR'`, no year (`:26-34`) → `finish()` stores outcome/year, diff, apply (`:195-204`) | live-path | as listed | 05d056577 | D-4 attached to the wrong step (High) | — |
| P-14 | Mapping diff `ACTIVE_SNAPSHOT_SQL` selects `results` by code + year + snapshot with no platform; apply reuses `resolveActiveSnapshot` | location | `pool-funding-mapping-diff.service.ts:58-65`, `:427`; `pool-funding-mapping-apply.service.ts:516-520` | 05d056577 | Decision applied to the wrong platform's snapshot (High) | — |
| P-15 | **consumer (client):** `POOL_FUNDING_PLATFORMS=[STAR]` read only by `bilateral.service.ts:20,165` and `platform-code.util.spec.ts:57-78`; `getAlignment` returns null for non-capable codes (`bilateral.service.ts:164-180`); `bilateralPath` strips only `STAR-` (`api.service.ts:844-846`); route token `:resultCode(\\d+)` (`results.util.ts:157`); `result.interceptor.ts:22-34,63-69` adds `reportingPlatforms=TIP` on `/result/TIP-123`; spec `bilateral.service.spec.ts:296-297,339` asserts zero requests for `TIP-…` | consumer | `grep -rn "POOL_FUNDING_PLATFORMS\|isPoolFundingCapable" client/research-indicators/src` (scout) | 05d056577 | D-7 404s or still skips (High) | — |
| P-16 | Pool Funding component is read-only for any non-STAR result | location | `bilateral.service.ts:96-97` (`editable` false when `isExternalResult()`); `cache.service.ts:135-138`; `pool-funding-alignment.component.ts:231`, HTML `:128,139,335` | 05d056577 | R-PPI-006 BUT needs a UI change (Low) | — |
| P-17 | Three DB-backed specs still reference the `result_id` column `1790023167000` dropped: `test/result-prms-sync-log-outcome.integration-spec.ts:115-118`, `test/result-prms-sync-claim-concurrency.integration-spec.ts:145`, `test/prms-sync.e2e-spec.ts:385-387`; `test/prms-webhook.e2e-spec.ts:37-73` builds its own table | data-env | scout grep at 05d056577; **whether they fail today:** `UNVERIFIED — confirm at source before relying on it` | — | The integration gate for D-1..D-5 must be a new spec, not these (Low) | T-06 first step: run `npm run test:integration` on a fresh TEST container, record the raw result |
| P-18 | PRMS accepts and echoes `TIP-<code>` as `external_reference` | data-env | `UNVERIFIED — confirm at source before relying on it` — evidence only: contract doc `docs/technical-docs/prms-normalizer/prms-normalizer-technical-field-documentation.md:141` ("Max 191 characters. Stored and returned verbatim"); real capture echoing non-numeric `ARI-SPIKE-20260914-01` (`prms-normalizer/response/__fixtures__/prms-accepted-response.capture.json:18`) | — | FD-2 / R-PPI-003 must change (High) | Child 3's first TEST-env push (owner child 3); until then the docs + capture stand |

## 12. Observability

No new log lines. The correlator's existing multiple-live-rows `warn` adds the platform. Migration logs nothing.

## 13. Testing strategy

| Suite | What |
| --- | --- |
| `prms-external-reference.spec.ts` (new) | `prmsRef` / `parsePrmsRef` round-trip for every enum value; STAR bare; `TIP-123`; `XYZ-1`, `TIP-`, `TIP-12a`, `''`, null → null; the SQL `CASE` text asserted equal in meaning (KZ-001) |
| `result-prms-sync-log.repository.spec.ts` | claim/refused write `platform_code` + `prmsRef`; MAX+1 and in-flight include platform; live copy uses pushed platform and **no** year |
| status / history readers specs | platform in every key; same-code STAR+TIP fixture |
| delivery repository / service / correlator specs | inbound parse; `TIP-123` → TIP live row; `123` → STAR; `XYZ-123` → UNKNOWN_REFERENCE |
| mapping diff / apply specs | snapshot lookup by platform |
| builder spec | STAR bare, TIP prefixed |
| migration spec (`db/migration-specs/`) | up SQL backfill rules, index swap; down restores |
| `test/prms-platform-identity.integration-spec.ts` (new, `test:integration`) | On the TEST schema: STAR 123 + TIP 123 same year; log/history rows for STAR; readers' SQL returns nothing for TIP; next attempt for TIP = 1; correlator on `TIP-123` hits TIP |
| client specs | `POOL_FUNDING_PLATFORMS`, `getAlignment` for `TIP-…` issues one request with the numeric path; sidebar shows tab when `display_only` |
| existing suites | `result-prms-sync*`, `prms-webhook*`, `bilateral*`, `save-all-sections` unchanged and green |

## 14. Rollout

- Migration applied on Dev by the pipeline (root `CLAUDE.md` §4.3 correction 2026-08-27); Prod per the owner's process.
- Backout: revert commits + `migration:revert`; the backfilled STAR rows are unaffected by the down.
- No PRMS communication needed until child 3 sends the first `TIP-` reference.
