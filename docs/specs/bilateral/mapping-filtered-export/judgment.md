# Judgment Day — bilateral/mapping-filtered-export

| Field | Value |
| --- | --- |
| Target | `design.md`, `requirements.md`, `proposal.md`, drafts at 2026-11-05 over commit `350998fa` |
| Mode | Blind dual review, two read-only judges on a model other than the author's |
| Round | 2 of 2 |
| Skill resolution | `judgment-day`; shared reference files not packaged, contract from the skill text |
| State | **Closed: APPROVED** (2026-11-05) |

## Frozen ledger, round 1

### Confirmed by both judges, severe

| ID | Judges | Defect | Failure |
| --- | --- | --- | --- |
| JD-1 | A-1, B-1 | The handler cannot detect a CLARISA failure. `list()` swallows it (`bilateral-project-mapping.service.ts:126-140`), and DD-3 shares that enrichment with no return channel | Cold cache and upstream error on `status=mapped` gives blank allocations with no notice, which R-MFE-011 forbids |
| JD-2 | A-2, B-3 | P-14 is contradicted for its admin clause. The panel sends no `Authorization` header (`BilateralProjectMappings.tsx:280-288`), and `JwtMiddleware` requires one | R-MFE-007 AC.5 cannot be shown on a deployed environment. No audit write is lost |

### Same defect, judges disagree on severity

| ID | Judges | Defect | Failure |
| --- | --- | --- | --- |
| JD-3 | B-2 severe, A-3 warning | No timeout under the CLARISA call (`clarisa.connection.ts`; axios default `timeout: 0`). P-7 covers rejections only | CLARISA accepts and never answers: the export hangs, and the button stays loading |

### Confirmed by both judges, warning

| ID | Judges | Defect |
| --- | --- | --- |
| JD-4 | A-5, B-4 | `httpErrorInterceptor` already toasts, and a blob error body hides the server message. §6 adds a second toast |
| JD-5 | A-7, B-5 | Ticket §3 says Last Updated reflects the last status change; `updated_at` moves on any edit. Not recorded as a deviation |
| JD-6 | A-10, B-6 | Justification can pair with another actor: reactivation with a blank justification keeps the inactivation reason beside the reactivating user |
| JD-7 | A-6, B-8 | P-19 is rated Low, yet its failure drops the year and breaks R-MFE-005 |
| JD-8 | A-8, B-9 | §11 has no ordering for the code and the migration, requirements §9 disagrees with it, and the claim that the deploy migrates has no row |
| JD-9 | A-11, B-7 | Notice table contradicts R-MFE-003 AC.3 and R-MFE-011 AC.1 on the empty cohort; R-MFE-002 AC.1 is literally false for Pending |
| JD-10 | A-13, A-15, B-10 | Plumbing is unstated: where the `sec_users` join lives, how the year returns with zero rows, how `{ buffer, fileName }` travels |
| JD-11 | A-15, B-11 | `ClarisaProjectsService` is not reachable from `ReportsModule`: DI fails at boot, and mocked specs do not show it |
| JD-12 | A-9, B-16 | No time zone for the file name or the date cells |
| JD-13 | A-14, B-14 | The name fallback stops at `''` with `??` (`bilateral-project-mapping.service.ts:134`) |
| JD-14 | A-12, B table | P-16's citation is elided and cannot be re-run. The claim holds |

### Suspect, one judge only

| ID | Finding |
| --- | --- |
| S-1 (A-4) | Allocations looked up by id only, while the module resolves by external code first |
| S-2 (A-12) | Requirements §7 says other endpoints are unchanged, design §4 adds fields to detail, and mutations also return them |
| S-3 (A-16) | Without paging, `updated_at DESC` has no tie-break |
| S-4 (A-18) | P-18 omits a cold CLARISA fetch from the 15 s target |
| S-5 (B-1) | A 200 with a non-array body poisons the cache and raises a plain `TypeError` |
| S-6 (B-12) | "Validation stays identical" needs an explicit pipe: no global pipe exists, so `?status=a&status=b` gives a 500 |
| S-7 (B-13) | `allocation: null` prints `SP01 (null%)` |
| S-8 (B-15) | §10 omits the Pending parity and filter transition gates, plus the e2e the server guide asks for |
| S-9 (B-17) | Raw-to-entity alignment depends on primary keys and has no row. It holds today |

### Noted, no action

A-17: under impersonation the target user is stored. Judge B found this deliberate (profile-simulation D-imp-3).

### Premise results

| Rows | Result |
| --- | --- |
| P-1 to P-13, P-15, P-16 | Confirmed by both |
| P-14 | Contradicted by both, admin clause only |
| P-17, P-18, P-19 | Not re-run; not refuted |

**Held under attack by both:** index alignment and count with the joins, route capture, `StreamableFile` through the response interceptor, `SetUpInterceptor`, the `updated_at = updated_at` backfill, and all counts.

## Round 1 correction

The owner chose **Fix and Re-judge** on 2026-11-05. The option offered covered the confirmed findings, not only the severe ones, so the warnings were corrected at the owner's direction. The five decisions presented with it were not changed by the owner, and are taken as approved (`requirements.md` §9).

| ID | Correction |
| --- | --- |
| JD-1 | One cohort load reports `{ projects, available }`; `list()` ignores the flag; the export result carries `clarisaAvailable` (design §2.1, §5, DD-3, P-21) |
| JD-2 | P-14 rewritten, R-MFE-007 AC.5 at endpoint level, panel authentication out of scope |
| JD-3 | 10-second limit in the export path only; timeout is the failure branch (design §5, DD-12, R-MFE-011, P-22) |
| JD-4 | Interceptor URL exemption, Blob error parsed, one toast (design §6, R-MFE-009 AC.3, P-23) |
| JD-5 | Deviation recorded, DD-14 |
| JD-6 | Deviation recorded, DD-15; rewrite branch documented in §5 |
| JD-7 | Fallback uses `reportingYear()`; P-19 raised to High |
| JD-8 | §11 order rule; P-24 added, `UNVERIFIED`; requirements §9 aligned |
| JD-9 | R-MFE-002 AC.1, R-MFE-003 AC.3, R-MFE-011 AC.1 and scenarios amended |
| JD-10 | Export result shape; `{ buffer, fileName }`; join in the shared query |
| JD-11 | Handler injects mapping services only; `ReportsModule` keeps one new import |
| JD-12 | UTC, DD-13, stated on the sheet |
| JD-13 | "First non-blank" rule |
| JD-14 | P-16 command written in full |

**Suspects also addressed:** S-2 (requirements §7), S-3 (sets), S-4 (P-18 and NFR), S-5 (catch-all), S-6 (P-25), S-7 (code alone), S-8 (§10), S-9 (P-20). **Left as is:** S-1, because the screen's name also uses the id.

## Scoped re-judgment, round 1

Two blind read-only judges on Sonnet ran against a frozen snapshot of the four documents at HEAD `350998fa`. Their scope was the ledger above plus the correction delta.

| Judge | Ledger rows | New severe | New warning |
| --- | --- | --- | --- |
| A | 21 resolved, 1 partial (JD-7) | 0 | 4 |
| B | 20 resolved, 2 partial (JD-4, S-5) | 1 | 5 |

**Premises.** Both judges confirmed P-14, P-16, P-20, P-21, P-22, P-23 and P-25. Neither re-ran or refuted P-19 or P-24. P-16 reproduces only once its table-escaped `\|` is unescaped (see RJ-4). Judge B adds a note on P-24: the repo holds a Jenkins trigger workflow, not "no pipeline definition", but the job definition itself is not in the repo.

### Severe, one judge, settled by the architect's re-run

| ID | Judge | Defect | Re-run | Result |
| --- | --- | --- | --- | --- |
| RJ-S1 | B-1 | Design §6 "Failure" reads the Blob error body for `description`. In the server envelope `description` is the exception class name; the text is in `errors` (a string, or an array for validation). R-MFE-009 AC.3 ("the server's text") fails: the toast shows `ServiceUnavailableException`. JD-4 is reopened by this. | `global.exception.ts:31` `const description = exception?.name`; `errors` from `response.message` | **Confirmed by source** |

### Warnings, both judges

| ID | Judges | Defect |
| --- | --- | --- |
| RJ-1 | A F-1, B 2 | The "Export result" text in §2.1 was inserted inside the component table, so row 7 (`ExcelWorkbookBuilder`) renders outside it |
| RJ-2 | A F-4, B 3 | §11's order rule ("columns exist before code that reads them") cannot be met by step 1. The image starts before `migration:execute`, so entity reads can hit `ER_BAD_FIELD_ERROR` |
| RJ-3 | A F-3, B 5b | Pending path: `AutomapperService.resolve()` returns no cohort, so where row 5b gets Pending allocations is unstated. A second fetch would be unbounded, and DD-4 puts DB work under the CLARISA 10 s limit |
| RJ-4 | A F-2 (warning), B 7c (suggestion) | Ledger regexes use table-escaped `\|`. Pasted verbatim into `git grep -E` they match nothing, which is a false zero (K-014) |
| RJ-5 | B 4 (warning), A (suggestion) | A stale cache plus a hung refresh trips the 10 s limit and gives the notice, contradicting the "stale served" row of the §5 table |

### Suspect, one judge only

| ID | Judge | Finding |
| --- | --- | --- |
| RS-1 | B 5a | A malformed CLARISA 200 on the Pending path gives a 500, not the 503 that §4 promises (S-5 partial) |
| RS-2 | B 6 | The R-MFE-011 lead sentence is unscoped against R-MFE-003 AC.3 for a Pending error |
| RS-3 | A, JD-7 | R-MFE-005 AC.1 and AC.2 depend on P-19 being settled at T-04, and the AC text does not say so |
| RS-4 | A | The mapping from an empty cohort to `clarisaAvailable` is unspecified |
| RS-5 | B 7a, 7b | `SESSION_INVALID` gives a double toast; the interceptor's 5 s pending tracker fires on exports under the 15 s NFR |

**Held under attack by both:** no module cycle from the `ReportsModule` import; `StreamableFile` passes the response interceptor (`response.interceptor.ts:44`); the URL exemption mechanism exists; the 10 s limit is not pre-empted by `BaseApi`; S-1 is not made worse.

## Round 2 correction (final)

The owner chose **Severe + 5 warnings** on 2026-11-05. This is the last fix round. Single-judge suspects stay recorded. RS-1, RS-2 and RS-4 were closed as a side effect of the same edits.

| ID | Correction |
| --- | --- |
| RJ-S1 | Design §6: the toast shows `errors` (string as is, array joined), never `description`. P-26 added. §10 toast row asserts it on a real Blob in the envelope shape |
| RJ-1 | "Export result" text moved below row 7 of the §2.1 table |
| RJ-2 | §11: Dev's start-to-migration window stated with its sources (`orm.config.ts:52`, Dockerfile `CMD`) and accepted as DD-16; step 4 states how the other environments meet the rule; requirements §9 aligned |
| RJ-3 | New `ClarisaProjectsService.loadBilateralCohort(phase, limitMs?)` is the one cohort load (rows 5b and 6, DD-3, DD-4). Pending loads once and passes the cohort to a refactored `resolve()`. The 10 s limit covers the CLARISA load only. §10 Pending cohort row |
| RJ-4 | Every ledger command now uses `-e` per alternative, with no pipe in a table cell. Re-run 2026-11-05: P-11 23, P-14 0 (pattern probed: 22 hits under `domain/shared`), P-16 3 and 1, P-22 0, P-25 0, P-5 2 outside the module |
| RJ-5 | A limit hit with a same-phase stale cache returns the stale feed with `available: true`. Table row, R-MFE-011 scenario and AC.1 aligned. Undeduplicated retries accepted, in §5 |
| RS-1 | The catch-all is stated for Pending too |
| RS-2 | R-MFE-011 lead sentence scoped to non-Pending |
| RS-4 | Empty cohort reports `available: true`; the notice comes from the zero count |

## Final scoped re-judgment, round 2

Two blind read-only judges on Sonnet ran against a frozen snapshot plus the exact fix delta (`fix-delta.diff`).

| Judge | Ledger rows | New severe | New warning |
| --- | --- | --- | --- |
| A | 7 of 9 resolved; RJ-2 and RJ-5 partial (only through F-1 and F-2 below) | 0 | 3 |
| B | 9 of 9 resolved | 0 | 1 |

**Premises.** Both judges ran every rewritten `-e` command verbatim, and the counts matched the ledger: P-4, P-5, P-11, P-14, P-15, P-16, P-22, P-25. Both confirmed P-26 and `orm.config.ts:52`. Both found `loadBilateralCohort` implementable on the private cache, and the `resolve()` split a pure extraction. Neither re-ran P-19 or P-24.

### Info: warnings left open, not severe, no fix round left

| ID | Judges | Finding |
| --- | --- | --- |
| FJ-1 | A F-4, B 1 | R-MFE-011 AC.1 attaches "when no feed for the year is cached" to the empty response as well. An empty 200 replaces the cache and always gives the notice (design §5, DD-11). The qualifier should cover error and timeout only |
| FJ-2 | A F-1 (one judge) | The stale-on-limit rule is stated for every status, while R-MFE-003 AC.3, design §4 Errors and the "Pending; error or timeout" row say a Pending timeout is always an error. The Pending rows need the same stale-cache exception, or the rule needs scoping to non-Pending |
| FJ-3 | A F-2 (one judge) | §11 states the "migration runs after the container is up" sequence as fact. It rests on P-24 (`UNVERIFIED`), so DD-16 may describe a window that does not exist |
| FJ-4 | A F-3, B 2–3 (suggestions) | §11 cites only the production `CMD` (also `npm run start` at `Dockerfile:31`, which does not migrate either). The P-4 and P-5 commands omit the exclusions their hit lists assume. P-24 should say "only a Jenkins trigger workflow; no job definition" |

## Terminal receipt

| Field | Value |
| --- | --- |
| Target | `bilateral/mapping-filtered-export`: `requirements.md`, `design.md`, `proposal.md` at HEAD `350998fa` |
| Rounds | 2 of 2 fix rounds used, 2 of 2 scoped re-judgments |
| Round 1 | JD-1 to JD-14 corrected, 2 severe among them; suspects S-2 to S-9 addressed |
| Round 2 | RJ-S1 (severe, settled by the architect's re-run of the source) plus RJ-1 to RJ-5 corrected; RS-1, RS-2 and RS-4 closed |
| Final | 0 severe from either judge; 1 warning from both (FJ-1); 2 single-judge warnings (FJ-2, FJ-3); suggestions (FJ-4) |
| Skill resolution | `judgment-day`; shared reference files not packaged, contract from the skill text |

JUDGMENT: APPROVED ✅

## Post-approval amendment (2026-11-12)

The owner approved correcting FJ-1 and FJ-2 outside the closed lineage. These edits were not re-judged.

| ID | Edit |
| --- | --- |
| FJ-1 | R-MFE-011 AC.1: the cache qualifier now covers error and timeout only. An empty response always gives the notice |
| FJ-2 | Pending follows the same stale-cache rule as the other statuses, the behavior `getCachedAll` already has (P-8). R-MFE-003 AC.3, design §4 Errors and the §5 "Pending; error or timeout" row are aligned |

FJ-3 and FJ-4 stay open as info.
