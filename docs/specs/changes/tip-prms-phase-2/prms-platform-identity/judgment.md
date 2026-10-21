# Judgment Day — prms-platform-identity design

- **Target:** `design.md` (+ `requirements.md`, `../family.md`) at commit `b7aa52e97` (immutable)
- **Judges:** A and B, blind, read-only, Explore on Sonnet (author: Opus — author ≠ auditor)
- **Round 1 verdicts:** A FAIL · B FAIL
- **Status:** round 2 fix applied (final round per the two-round ceiling); final scoped re-judgment pending

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

## Round 1 — fix (owner-approved "Corregir y re-juzgar") and scoped re-judgment

- **Fix delta:** `b7aa52e97..c680b609` — J-1/J-2/J-3 fixed; J-4 settled by a read-only Dev query (P-19); J-5…J-11 incorporated; J-12 partly.
- **Re-judgment:** A **FAIL** · B **PASS**. Both: J-1, J-2, J-3, J-5, J-6, J-7, J-10, J-11 resolved; J-4 partly.

| ID | Kind | Severity | Fix-caused finding | Judge A | Judge B |
| --- | --- | --- | --- | --- | --- |
| N-1 | confirmed (severity split) | severe (A) / warning (B) | `requirements.md` :23, :178-179 still state the old backfill rules — contradicts design §5 | N-1 | N-2 |
| N-2 | confirmed | warning / suggestion | Log backfill can tag a row TIP while its `external_reference` stays bare → readers miss it | N-4 | N-1 |
| N-3 | confirmed | warning / suggestion | History backfill `event_source='STAR'` tags a non-numeric code STAR — conflicts with "never matched → no platform" | N-3 | N-4 |
| N-4 | resolved by Leader check | warning (A) | P-20 did not show TIP sets `manageOfficialCode` — it does: `tip-integration.service.ts:207` | N-2 | (J-8 yes, same citation) |
| N-5 | info | suggestion | §4 tree label, P-9 `\|` rendering, P-3 stale "D-3 backfill regex" | N-5 | N-3 |

## Round 2 — final fix

- N-1: requirements §1, §8 and the R-PPI-001 scenario aligned with design §5.
- N-2: a backfilled non-STAR log row also gets `external_reference = prmsRef(platform, code)`.
- N-3: history STAR-sent rows need a canonical numeric code; otherwise NULL.
- N-4: P-20 cites `tip-integration.service.ts:207`.
- N-5: tree label, escape note, P-3 cell fixed; off-by-one ranges corrected (P-1, P-12, §7.3).

## Round 2 — final scoped re-judgment

- **Verdicts:** A **FAIL** · B **FAIL** — same single residual, both `warning`; N-2…N-5 resolved, all re-checked citations correct, §5 table intact.

| ID | Kind | Severity | Finding | Judge A | Judge B |
| --- | --- | --- | --- | --- | --- |
| R2-1 | confirmed | warning | R-PPI-001 *Existing rows* still says "every existing sync-log row reads platform `STAR`", while design §5 tags a TIP-only-match row `TIP` and rewrites its `external_reference`; requirements §8 omits the rewrite and still says "No data correction beyond the backfill" | R2-1 | M-1 |
| R2-2 | suspect | suggestion | §5 does not say what happens if a rewritten `TIP-<code>` key collides with an existing row (Dev has none, P-19) | — | M-2 |

**Terminal state: `ESCALATED`** — the two-round fix ceiling is spent and one confirmed (warning) item remains. Decision handed to the owner.

## Owner decision after escalation (2026-10-21)

"Corregir la frase y seguir": R-PPI-001 *Existing rows* and requirements §8 now state the join-derived log platform and the reference rewrite; design §5 adds an explicit abort on a rewritten-key collision (R2-2). Applied as an owner-approved edit outside the judgment lineage (no further re-judgment). Design accepted; proceed to `tasks.md`.
