# Judgment Day — prms-platform-identity design

- **Target:** `design.md` (+ `requirements.md`, `../family.md`) at commit `b7aa52e97` (immutable)
- **Judges:** A and B, blind, read-only, Explore on Sonnet (author: Opus — author ≠ auditor)
- **Round 1 verdicts:** A FAIL · B FAIL
- **Status:** round 1 — awaiting owner approval for the round-one fix

## Frozen ledger (round 1)

| ID | Kind | Severity | Finding | Judge A | Judge B |
| --- | --- | --- | --- | --- | --- |
| J-1 | confirmed | severe | P-9 consumer sweep does not reproduce: the grep returns **43** files, not 44; and "every non-spec hit is a §7 site" is false (modules, controller, consts/enum, `prms.opensearch.module`, 3 migrations also hit) | F-1 | F-1 |
| J-2 | confirmed | severe | P-6 cites `result-prms-sync.service.ts:368-374` for the reference read-back; the file ends there (`_log` helper). Real site: `readExternalReference` ~`:318-325`, called at `:233` | F-2 | F-3 |
| J-3 | confirmed (severity split) | severe (B) / suggestion (A) | `replaceImportedHistory` DELETE (`prms-webhook-delivery.repository.ts:469-476`) and its `NOT EXISTS` dedupe (`:513-529`) key on `(result_official_code, result_year)` only — a TIP row with the same code/year would suppress or delete STAR imported rows; design only says "writes STAR" | F-12 | F-2 |
| J-4 | suspect | severe (A only) | Log backfill "every row is STAR" rests on a file count; the sync endpoint has no platform guard (`result-prms-sync.controller.ts` no `platform`; claim SELECT `WHERE result_id=?` `log.repository.ts:238-246`) and the refused-insert path writes a log row, so a TIP/AICCRA click may already have left rows | F-3 | — |
| J-5 | info | warning | Count line "Verified: 17 · UNVERIFIED: 2" = 19; the ledger has 18 rows; P-1 verified only at 1f56dda25 | F-4 | F-4 |
| J-6 | info | warning | `parsePrmsRef` edge cases unspecified (leading zeros `TIP-007`, `TIP-0`, lowercase, `STAR-123`, unsafe ints) — today `parseOfficialCode` rejects leading zeros and unsafe ints (`delivery-correlator.service.ts:95-104`); history backfill regex `^[0-9]+$` disagrees with it | F-8, F-9 | F-6 |
| J-7 | info | warning | Mapping apply `HISTORY_SQL` / diff `HISTORY_ROW_SQL` select no `platform_code`, and `resolveActiveSnapshot(run, code, year)` has no platform parameter — design names only `ACTIVE_SNAPSHOT_SQL` | F-11 | F-5 |
| J-8 | info | warning | R-PPI-005 says "same platform, code **and year**"; D-5 drops the year without amending the requirement; TIP multi-year live rows unexamined | F-7 | F-7 |
| J-9 | info | warning | Migration: no nullable → backfill → `NOT NULL` sequence or default; down must drop the new index first; NFR-PPI-002's bootstrap + revert run has no home in §13 | F-10 | F-8 |
| J-10 | info | warning | P-17 is refutable from source: the three DB-backed specs insert/delete by the dropped `result_id`, so they cannot pass — contradicts §13 "existing suites unchanged and green" | F-5 | — |
| J-11 | info | warning | P-18 settle owner conflicts: family FD-2 "settled by child 1", requirements OQ-1 "design gate", design "child 3's first TEST push" | F-6 | F-11 |
| J-12 | info | suggestion | `prms-webhook.e2e-spec.ts` builds its own history table and needs the column; budget has no task breakdown yet; §6 interceptor wording (platform comes from the page URL) | F-13 | F-9, F-10 |

Counts: confirmed severe 2 (+1 with split severity) · suspect 1 · contradiction 0 · info 9.
