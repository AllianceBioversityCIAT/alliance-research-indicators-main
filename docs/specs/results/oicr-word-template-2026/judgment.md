# Judgment Day — results/oicr-word-template-2026 (design review)

- **Target (frozen):** `design.md` sha1 `6211b4b190d5…` against `requirements.md` sha1 `67f61829203d…`, at commit `83d6c37d`.
- **Mode:** `/akili-specify` Step 2.5 → Review Design. Two blind, read-only judges (A, B), `akili-reviewer` persona on **sonnet**; the author ran on opus (author ≠ auditor).
- **Round:** 1 of max 2.
- **Date:** 2026-10-23.

## Merged ledger

**Status values:**
- **corroborated:** both judges found the same defect.
- **suspect:** one judge only.
- **info:** suggestion, or a premise confirmation.

Severity is per judge (A / B).

| # | Finding | A | B | Status | Proposed resolution |
|---|---|---|---|---|---|
| J-1 | A **mapped** label that is not an option of the template's dropdown is silently skipped. This contradicts "never partially filled" (the POC throws) | A-2 WARNING | B-1 **SEVERE** | corroborated, **severity split** | Unmapped (mapper → none) leaves the control untouched. A mapped label that is missing from the options → named 500 |
| J-2 | Leaf controls inside repeating rows are addressed by **position**. A reordered or extra column fills the wrong cell with no error | A-1 W | B-2 W | corroborated | Structure pre-check before writing: one item per section; section 15 has 6 leaves of the expected types; role combo holds `Contact Person`. Named 500 otherwise. Add a ledger row |
| J-3 | Unstated template-shape premises: one item per repeating section; no revision/bookmark inside a target | A-3 W | B-3 W | corroborated | Add ledger rows. The engine asserts both (J-2 pre-check) |
| J-4 | `w14:paraId` is refreshed only on `w:p`, but `w:tr` may carry one too. The uniqueness test only covers `w:p` | A-4 W | B-4 W | corroborated | Refresh every cloned element that carries `w14:paraId`/`w14:textId`. Assert uniqueness over all elements |
| J-5 | "36 parts" is ambiguous; it is 36 **non-document** parts of 37. P-8's evidence prints only the first diff | A-9 W | B-6 W | corroborated | Say "every part except `word/document.xml`", count computed from the fixture. Add a null-edit test: parse → serialize → restore prolog, equals the original exactly |
| J-6 | The error message order is wrong. `GlobalExceptions` puts the human message in `errors` and the exception name in `description` | A-10 W | B-10 W | corroborated | Read `errors`, then `description`, then a generic message when the Blob is not JSON (e.g. an nginx HTML page) |
| J-7 | 400 `Result not found` fires on **getter access**, not before the handler. The name `getWordTemplate` is already taken | A-13 S | B-11 W, B-19 S | corroborated | The handler reads `resultId`/`indicatorId` first. Test: missing result → 400, no HttpService call. New handler name `downloadWordTemplate`. Fix P-1 wording |
| J-8 | The spec-inversion list owned by T-05 is incomplete | A-11 W | B-12 W | corroborated | T-05 sweeps every spec that reads `isOicrTemplateDownloadHidden` (full list in both reports) |
| J-9 | `\r\n`/`\r` and XML-1.0-invalid control characters are not handled | A-8 W | B-16 W | corroborated | Normalize `\r\n?` → `\n`; strip XML-invalid characters; add a test |
| J-10 | Version view: the button follows the snapshot's metadata, but the download hits the live row | A-7 W | B-18 W | corroborated | The download is always the **live** OICR (no `useResultInterceptor`). State it |
| J-11 | P-16 can be settled from source. Both signals read `results.report_year_id`; the ranges do not overlap | A-12 S | B-22 S | corroborated | P-16 → confirmed by source (live results). The Dev payload read stays as a T-05 smoke check, not a gate |
| J-12 | "ORCID not filled" has no assertion; the fidelity strip hides it | A-5 W | B-25 S | corroborated | End-to-end XML assertion: ORCID still shows its placeholder |
| J-13 | R-OWT-012 doc edits are not in the composition tables | A-17 S | B-8 W | corroborated | Add rows for `docs/ux-ui/design.md:100,250` and `docs/trd/trd.md:204` |
| J-14 | The "same PII exposure" claim has no row. The details query returns no contact; `/modal` does | A-16 S | B-15 W | corroborated | Cite the `/modal` endpoint (`result-oicr.service.ts:579-601`) in a row |
| J-15 | The main-project rule is ambiguous: `contract_role_id = 1` is used in one precedent and not in others; several linked handles are possible | A-15 S | B-26 S | corroborated | Pick the rule the modal uses and state it, plus "first linked handle" |
| J-16 | Server egress to S3 from the Dev/Prod runtime is unverified (P-6 ran on the author's workstation) | — | B-14 W | suspect | Add a row, settled by one request from the deployed server as the first step of the server task |
| J-17 | §3 omits `is_active = 1` for regions, countries, sub-nationals and the TEMP link, and the research-area `ORDER BY` | A-6 W | — | suspect | State `is_active = 1` everywhere and order by `result_lever_id` |
| J-18 | The rule "filled control has no `showingPlcHdr`/PlaceholderText style" has no gate | — | B-5 W | suspect | Add the test |
| J-19 | The POC sabotage reds were never observed in a recorded run (K-004) | — | B-7 W | suspect | Each ported falsifier must be observed red in `execution.md` |
| J-20 | Route-config, `npm ls` and build gates are missing from §10 | — | B-9 W | suspect | Add a routes spec (`canMatch` + `isLoggedIn`) and list the build/`npm ls` gates |
| J-21 | NFR-OWT-002 is not met for "Result not found" | — | B-17 W | suspect | Narrow the NFR to the cases the handler attributes |
| J-22 | The `GET_OICRDetails` removal misses `api.service.spec.ts:1781-1787` | (confirmed specs exist) | B-13 W | suspect | Add to the T-07 deletion list |
| J-23 | The regions/countries string format is not pinned | — | B-20 S | info | Quote the exact format |
| J-24 | Deleted LOC is ~1 600, not ~600 | — | B-21 S | info | Correct the budget |
| J-25 | The `download_url` producer change has no requirement | — | B-24 S | info | Link it to R-OWT-010 |
| J-26 | `filesStorageUrl` becomes unused, not "stays for other uses" | A-14 S | — | info | Correct §7 |
| J-27 | Engine/test details: `generateAsync` options; axios not aborted by an RxJS timeout; `Blob.text()` in jsdom; `um49Code` is a bigint | A-18 S | — | info | Settle in tasks |
| J-28 | P-5/P-6/P-19 evidence is machine-local | A-19 S | — | info | Mark it |
| J-29 | The stale mapping doc says contact `user_role_id = 3` | A-20 S | — | info | Out of the repo; the code (1) is the authority |

**Premise Ledger verdicts:** no premise was contradicted by its source, and every in-repo citation reproduces (both judges).
- P-1 is right about the outcome but wrong about the timing (J-7).
- P-16 is confirmed by source for live results (J-11).
- P-6 and P-8 were not re-run by either judge (binary file / outside the repo).

## Counts (round 1)

| Status | Count |
|---|---|
| Corroborated SEVERE by both | **0** |
| Corroborated, severity split (one SEVERE) | 1 (J-1) |
| Corroborated WARNING/SUGGESTION | 14 |
| Suspect (one judge) | 7 |
| Info | 7 |

## Fix rounds

### Round 1 — owner chose "Fix and Re-judge" (2026-10-23)

The fix actor was the orchestrator itself, inline: these are document edits, and specify's authoring role may be absorbed inline. Every ledger row J-1…J-28 was applied, including the suspects (owner chose fix-all). J-29 is outside the repo.

| Changed section | Ledger rows |
|---|---|
| design Exec summary, §2.1 controller row, §2.2 api/GET_OICRDetails/docs rows | J-7, J-10, J-13, J-22 |
| design §3 (whole) | J-15, J-17, J-27 (bigint) |
| design §4 errors table | J-1, J-2 |
| design §5 (whole) | J-1, J-2, J-3, J-4, J-7, J-9, J-10, J-23, J-27 (axios timeout, zip options) |
| design §6 button row, §7 client env, §8 personal data, §9 logs | J-6, J-26, J-14, J-21 |
| design §10 (whole) | J-4, J-5, J-9, J-12, J-18, J-19, J-20, J-16 |
| design §12 D-OWT-3/7/9/14 edited, D-OWT-15/16 added | J-1, J-2, J-6, J-7, J-9, J-10 |
| design §13 D-OWT-11 inversion list | J-8 |
| design §14 LOC | J-24 |
| design §15: count line, P-1, P-8, P-16, new P-21/P-22/P-23 | J-5, J-7, J-11, J-3, J-16, J-14, J-28 |
| requirements R-OWT-001 (version), R-OWT-003 (mapped vs unmapped), R-OWT-005 (special characters scenario), R-OWT-006 (new row), R-OWT-010 (server link), NFR-OWT-002, §8 D-1/D-10 | J-1, J-2, J-9, J-10, J-19, J-21, J-25 |

**Post-fix hashes:** see the scoped re-judgment entry below.


### Scoped re-judgment of round 1 (both judges, 2026-10-23)

- **Ledger:** J-1…J-28 have 25 resolved, 3 partially resolved (J-2, J-9, J-27), 0 not resolved. Post-fix hashes: requirements `e7659f84a3e6`, design `8c086ba9b6b9`.
- **Fix-caused findings:** 0 SEVERE.

| # | Finding | A | B | Status |
|---|---|---|---|---|
| R-1 | The `w14:textId` uniqueness assertion would fail on the template itself. Measured: 200 of 434 textIds are `77777777` | R-A-1 W | R-B-1 W | corroborated |
| R-2 | The XML-invalid character set is incomplete (U+FFFE/FFFF, lone surrogates) | R-A-3 W | R-B-3 W | corroborated |
| R-3 | A swap between section-15 text leaves goes undetected with positional addressing | R-A-4 W | R-B-2 W | corroborated |
| R-4 | "Always live" overstates it: a direct caller can still pass `reportYear` | R-A-2 W | — | suspect |
| R-5 | `environment.example.ts` is committed and still holds the dead keys | — | R-B-4 W | suspect |
| R-6 | P-21's count of "22" is undefined, and its script was not retained | R-A-8 S | R-B-5 S | corroborated (S) |
| R-7 | P-8's second comparison was unscripted | R-A-8 S | R-B-6 S | corroborated (S) |
| R-8 | The missing-result test belongs at the controller layer; fresh paraIds must stay below 0x80000000; N counts none-label items | R-A-5/6/7 S | — | info |

**Judge A error noted:** A said `roundtrip.js` is absent. `ls ~/Desktop/OICR-2026-word-export/poc` lists it.

### Round 2 — final bounded fix (orchestrator, 2026-10-23)

Every R-1…R-8 row was applied:
- leaves pinned by `w:id` (9 ids read from the template);
- `textId` copied, not asserted;
- XML 1.0 `Char` whitelist;
- version wording;
- `environment.example.ts:61,74`;
- P-8 and P-21 evidence restated;
- test layers.

Post-fix hashes: requirements `243478caa0a3`, design (before the status line) `02cbdfbd1495`.

No second re-judgment was run. Round 2 fixed only WARNING/SUGGESTION rows with mechanical, measured corrections. No SEVERE finding was open, so the lineage terminates.

## Terminal receipt

- **Target:** `results/oicr-word-template-2026` design + requirements.
- **Rounds:** 2 fix rounds, 1 scoped re-judgment.
- **Totals:**

  | Measure | Count |
  |---|---|
  | Corroborated SEVERE (both judges) | 0 |
  | Split-severity row J-1, fixed in round 1 | 1 |
  | Corroborated WARNING, fixed | 17 |
  | Suspect, fixed | 9 |
  | Info, applied or noted | 9 |

- **Judges:** `akili-reviewer` on sonnet ×2 per round; author on opus.

**JUDGMENT: APPROVED ✅**
