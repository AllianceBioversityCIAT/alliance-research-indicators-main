# Judgment Day — tip-versioning design

- **Target:** `requirements.md` (approved) + `design.md` (draft, 2026-10-22), HEAD `5bde0b8c`, server tree clean
- **Mode:** blind dual review, two read-only judges on `sonnet` (author `opus` — author ≠ auditor), no DB access
- **Round:** 1 of 2
- **Status:** awaiting owner decision before round-one correction

## Premise Ledger audit (merged)

| Row | Judge A | Judge B | Merged |
|---|---|---|---|
| P-1, P-2, P-3, P-5, P-6, P-7, P-10 | confirmed | confirmed | confirmed |
| P-4 | does-not-reproduce (plural grep = 0 hits; singular hits `:871,:879,:1996,:2004`) | same | **confirmed severe (citation)** — conclusion holds |
| P-8 | confirmed, `:157` not `:156` | confirmed, ~3 lines off | confirmed; fix line |
| P-9 | does-not-reproduce: 6 hits (2 definitions), not 4 | same | **confirmed severe (citation)** — conclusion holds |
| P-11 | not re-run (data-env) | not re-run | unchanged |
| P-12 | `report_general_information` is a VIEW over `results` | same | settled — risk closed; wording "generated report table" false |
| P-13 | server + interceptor chain confirmed; display HITL | same | stays UNVERIFIED (display only) |

## Findings

| ID | A | B | Severity (A / B) | Status | Summary |
|---|---|---|---|---|---|
| JD-1 | A-1 | B-1 | SEVERE / SEVERE | **confirmed severe** | Update path calls `updateInactiveResult(id, isAppliedVersion)` (`save-all-sections.service.ts:173-176`) with staging's `is_version`; `target.isSnapshot` covers creation only → a version update for the run's highest year flips it to live |
| JD-2 | A-2 | ledger | SEVERE / ledger verdict | **confirmed severe (low impact)** | P-4 and P-9 citations do not reproduce as written |
| JD-3 | A-10 (+A-3) | B-2 | WARNING / SEVERE | confirmed, severity split | `consumer` rows incomplete: OpenSearch code index, `delivery-correlator` `LIVE_ROW_SQL`, `pool-funding-mapping-diff` `ACTIVE_SNAPSHOT_SQL`, prms-sync-log live copy, `findResultFamilyIds`, `ResultsUtil.setup`, `findResultTIPData`; sync-log keys on `external_reference`, not a code column |
| JD-4 | A-4 | B-3 | WARNING / WARNING | info (agreed) | Resolver filters `is_active`; today's lookup reactivates inactive rows → new code + duplicate rows |
| JD-5 | A-8 | B-4 | WARNING / WARNING | info (agreed) | Skip/failure gaps: highest year skipped as duplicate abandons lower years (conflicts R-TVR-007); live save failure while live exists; only-versions handle mints a new code; same handle+year twice; null link |
| JD-6 | A-5 | B-5 | WARNING / WARNING | info — **settled by architect data** | The 3 Dev version rows share their live row's code (21156, 21780, 21870 — read-only query 2026-10-22); a rule for >1 active live row per handle is still missing |
| JD-7 | A-11 | B-6 | WARNING / WARNING | info (agreed) | Migration: `CREATE TABLE` commits implicitly (not atomic), `?`/`:word` rule, duplicate links after re-point, `result_id` side of links, groups >2 / same year unguarded, collation 1267 |
| JD-8 | A-6 | B-7 | WARNING / WARNING | info (agreed) | `clearAlignmentWhenPortfolioChanges` on a live-row year move has no row; null `poolFunding` leaves it cleared |
| JD-9 | A-9 | B-8 | WARNING / WARNING | info (agreed) | `newOfficialCode` race between overlapping runs now merges two handles |
| JD-10 | A-12 | B-11 | SUGGESTION / SUGGESTION | info (agreed) | `saveAllSections` returns void: how written ids and skip vs write are detected; `target` must be per call |
| JD-11 | A-14 | B-13 | SUGGESTION / SUGGESTION | info (agreed) | Budget undersized vs child 1 actuals (≈2,900 LOC, 10 tasks, 12 rounds) |
| JD-12 | A-7 | — | WARNING | suspect (one judge) | Backout after a full sync: `down()` restores demoted rows to live while the survivor moved years |
| JD-13 | A-3 | — | WARNING | suspect | Precheck key for sync log unspecified; `prms_result_code`/`is_synced_to_prms` on demoted rows unchecked |
| JD-14 | A-13 | — | SUGGESTION | suspect | Staging save errors only logged — awaiting does not guarantee completeness |
| JD-15 | — | B-9, B-10 | SUGGESTION | suspect | `public_link` normalization mismatch; two unindexed TEXT scans per handle |
| JD-16 | — | B-12 | SUGGESTION | suspect | Reversion challenge ran inline; its P-12 wording is false |

**Counts:** confirmed severe 2 (JD-1, JD-2) · confirmed with severity split 1 (JD-3) · agreed info 8 · suspect 5 · contradictions 0.

## Round-one correction

Owner chose option 1 (fix severe + agreed warnings, then re-judge). Fix actor: the architect (author), recorded as such.

| ID | Correction (design.md unless noted) |
|---|---|
| JD-1 | §2.1: `target.isSnapshot` sets `isAppliedVersion` on create **and** update; DD-2; unit falsifier in §10 |
| JD-2 | P-4 and P-9 citations rewritten as run (0 / 4 hits; 6 hits incl. 2 definitions); P-8 line `:157` |
| JD-3 | P-16 lists the readers with effect; OpenSearch reset added to rollout §11 step 3 |
| JD-4 | DD-9 — resolver sees active and inactive rows (P-15) |
| JD-5 | §5 step 5: versions first, live once with the highest **saved** year (DD-3); version-only handle reuses its code; empty link / repeated year / >1 live rules; `requirements.md` R-TVR-003 reworded + new scenario |
| JD-6 | P-11 records the 3 existing versions share their live code |
| JD-7 | §3.2: `CREATE TABLE IF NOT EXISTS`, record-before-update, re-run after partial up, duplicate-link deactivation, `result_id` side stated, prechecks (a)–(d), no `?`/`:word` |
| JD-8 | P-14 + §5 paragraph + unit test |
| JD-9 | DD-10 run guard on `IN_PROGRESS` (< 6 h) |
| JD-10 | `saveAllSections` returns `{ resultId, outcome }`; per-call `target` |
| JD-11 | Budget 8 tasks / ~1,600 LOC / 11 rounds |
| JD-12 | §3.2 Down + §11 step 4 state the post-sync limit |
| JD-14 | DD-6 counts staging failures |
| new | Failed live create compensates that row only (DD-11) — today's live-seed compensation is a family delete |
| retracted | A duplicate-deletion change drafted during the fix was dropped: the rule file shows TIP prevails over PRMS and no live sync deletes TIP rows (P-17, `duplicate-result-priority.util.ts:11-31`) |

## Round-one re-judgment

Both judges (scoped: this ledger + corrected documents): **no severe finding**. Every JD closed or partially closed at WARNING level; P-4, P-8, P-9, P-14..P-17 reproduce (P-11 not re-run, data-env).

| Agreed warnings (A + B) | Post-judgment info edit |
|---|---|
| A2-1 / B2-1 run guard not implementable by reuse; failed run blocks 6 h; async PATCH | new read method + `FAILED` on failure in §2.1; guard before the `try`; §4 async wording; non-atomic check accepted |
| A2-2 / B2-2 partial-up re-run skips recorded-but-unconverted rows | skip by current state, not by record; order links → row |
| A2-3 / B2-4 `compensateRowOnly` and `ExtraData` path | flag in `target`, row-only delete in `QueryService`, correct `ExtraData` location |
| A2-4 / B2-5 RK-2 / DD-3 overclaim | reworded "narrowed; healed by next run" in both documents |
| A2-6 / B2-6 requirements wording | R-TVR-002/003/007 qualified; "not below the live row's year"; re-approval flagged |
| B2-3 (one judge) inactive live row preference | active preferred, others logged |
| B2-7 (one judge) precheck (c) could fail the Dev pipeline | (c) becomes skip-with-count; Dev count unreadable (DB unreachable 2026-10-22) |
| A2-5 / B-drifts citation lines | P-17 `:32`, sync-log key `:15-19,:41-52,:102` |

JUDGMENT: APPROVED ✅ — round 1 of 2, 2 confirmed severe fixed, 0 severe remaining.
