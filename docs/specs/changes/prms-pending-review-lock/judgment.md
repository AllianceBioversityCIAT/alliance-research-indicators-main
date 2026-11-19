# Judgment Day — prms-pending-review-lock / design.md

| Field | Value |
|---|---|
| Target | `design.md` (draft) against `requirements.md` and `proposal.md`, verified at `3e5f2b85c` |
| Mode | judgment_day, round 1 |
| Judge A | akili-reviewer (opus, read-only) |
| Judge B | Explore (sonnet, read-only) |
| Skills passed | none (design-only review) |
| State | **closed — approved after round 2** |

## Frozen ledger

### Confirmed severe (both judges)

| ID | Finding | A | B |
|---|---|---|---|
| JD-S1 | **P-3 is contradicted.** A PRMS decision row gets its `result_year` from the *live* row when the detached correlator runs (`delivery-correlator.service.ts` `LIVE_ROW_SQL` … `is_snapshot = FALSE`; `resultYear = Number(rows[0].report_year_id)`), and `newReportingCycle` moves the live row's year (`green-checks.service.ts:621-633`). A decision for a 2026 push that arrives after the user updated to 2027 is booked to 2027. 2026 stays `pending_review` for good, and 2027 reads `rejected` with no push behind it. The "Update anyway" path makes this reachable. | A-1 | B-1 |

### Contradiction (same defect, different severity) → owner decision

| ID | Finding | A | B |
|---|---|---|---|
| JD-C1 | **A third history writer: the PRMS "as-STAR" import.** `prms.opensearch.service.ts:584,801,938-983` builds STAR PENDING_REVIEW and PRMS APPROVE/REJECT rows. `replaceImportedHistory` (`prms-webhook-delivery.repository.ts:495-509`) deletes and re-inserts them, so each new import gives them higher ids. A re-import can put an old REJECT after a live push and make that push look resubmittable. D-1 and DD-1 omit this writer, and it has no ledger row. | A-2 severe | B-5c warning |

### Suspect (one judge), settled by the architect

| ID | Finding | Judge | Architect re-run |
|---|---|---|---|
| JD-P1 | Tooltip order: putting the held branch second hides the existing "not approved" and "no contribution" texts, which S-23 forbids. | B-2 severe | **Confirmed.** `result-sidebar.component.ts:157-168`: today's order is already-synced, then `canSyncPrms()`, then has_contribution, then the default. The held branch must sit just before `return ''`, inside the `canSyncPrms()` true path. |

### Warnings (info)

| ID | Finding | Source |
|---|---|---|
| JD-W1 | S-6 lists APPROVED/REJECTED as decisions. The `decision` column only ever holds APPROVE/REJECT; APPROVED/REJECTED live in `status`. Align S-6. | A-3, B-3 |
| JD-W2 | The server gate has no read-failure policy. State fail-closed (the error propagates as 5xx) and test it. | A-4, B-5a |
| JD-W3 | The global alert closes as soon as confirm runs (`global-alert.component.html:101-127`), so there is no button left to disable while the read runs. The design needs a real loading state and an in-flight guard on `updateResult`. | A-5, B-6 |
| JD-W4 | Sidebar states: reset push status on version change, a loading policy, and a re-fetch after a gate 409. | B-7 |
| JD-W5 | The warning title "PRMS review in progress" is used for Approved too. Approved needs its own title. | A-6 |
| JD-W6 | The 698 sequence disagrees across documents. Proposal §3.1 says "same path as 702". S-5, DD-1 and P-1 say push → REJECT → accepted push. | A-7 |
| JD-W7 | P-2 overstates "exactly one row". The write is swallowed on failure, so it is at most one (A-2 already accepts this). | B-4, A ledger |
| JD-W8 | `COALESCE` belongs on `results.platform_code` only, with strict equality on the history column. The §5.1.6 citation is wrong. | A-10, B-5d |
| JD-W9 | Proposal non-goal "no change for TIP" contradicts S-10 and §5.2, which put the gate on the TIP cron. | B-8 |
| JD-W10 | Missing template sections (security, testing, rollout, open questions, references). NFR-PRL-002 is not mapped. | B-9 |

### Suggestions (info)

Same idea from both judges:

- Match S-25 on a machine field (`entry_id`) instead of a prose prefix (A-9, B-10).
- P-4 should cite the admin path too (`SetUpInterceptor`) (A-11, B-11).

Single judge:

- `pushYear` camelCase, range validation, `noCache` (A-12, B-11).
- A TOCTOU row, because the gate runs outside the claim lock (A-8).
- `ORDER BY id` belongs in SQL, since bigint ids come back as strings (B-5b).
- KZ-016 wording should list every BUT (B-12).

## Counts

Confirmed severe 1 · contradiction 1 · suspect 1 (architect-confirmed) · info 10 warnings + 6 suggestion groups.

## Open decision (blocks round-one correction)

JD-S1 and JD-C1 have the same root: per-year ordering by `id` is not a reliable key for PRMS decisions. Both rows already carry `prms_result_code` (`recordOutboundPendingReview` binds it). The fix depends on whether PRMS gives a new code to each pushed year or reuses one code per STAR result. That is a fact about PRMS that this repo cannot settle. It needs the Dev DB or the PRMS team.

## Owner decision and round-one correction (2026-11-19)

The owner said PRMS keeps **one result code per result**; years differ by PRMS phase id. That ruled out keying on `prms_result_code`. The architect then queried the shared Dev DB, read-only:

- **P-1 confirmed.** 698 history in `id` order: 339 push, 344 REJECT, 345 push. That is the real order; `occurred_at` order is not.
- **12 of 12 callbacks** carry `raw_body.data.obj_version.phase_year`, and none disagrees with `result_year` yet.
- **77 imported rows** have no `delivery_id` and `raw_headers = {}`.

Correction applied to `design.md`, `requirements.md` and `proposal.md`:

| Finding | Fix |
|---|---|
| JD-S1 | DD-8: a decision's year comes from the callback's phase year, read at query time. New scenario S-26 |
| JD-C1 | DD-1: order by `(imported, id)`; imported rows always rank first. New scenario S-27 |
| JD-P1 | The held tooltip goes inside the `canSyncPrms()` true branch |
| JD-W1…W10 and suggestions | All applied (see design §§3–14) |

## Round 2 — scoped re-judgment

Both judges were given the frozen ledger plus the fix delta.

| Judge | Frozen findings | New severe | New warnings | New suggestions |
|---|---|---|---|---|
| A | 14 resolved, 4 partial | 0 | 4 (RA-1…RA-4) | 3 (RA-5…RA-7) |
| B | 14 resolved, 2 partial | 0 | 2 (RB-1, RB-2) | 4 (RB-3…RB-6) |

There are no severe findings, so no fix round is required. The warnings were applied to the documents anyway, recorded here as info:

| ID | Judges | Disposition |
|---|---|---|
| R2-1 `gate_entry_id` had no producer (`throwHttp` drops the entry id) | RA-1, RB-1 | A typed `PrmsSyncNoRowRefusalException` carries `entryId`; `result-prms-sync.service.ts` is added to §2.1 |
| R2-2 Imported-first cannot unlock a year whose callback was lost | RA-4, RB-2 | Recorded as an accepted limitation (§5.1.6). It is consistent with the owner's no-unlock decision, and S-5 forbids the timestamp alternative |
| R2-3 The `imported` expression is NULL for pushes | RA-2, RB-3a | The expression is never NULL; no SQL `ORDER BY imported`; the fixture asserts 0 for a push |
| R2-4 `phase_year` type coercion | RA-5, RB-6 | `CAST(JSON_UNQUOTE(…) AS UNSIGNED)` plus `Number()`, and a fixture case with a string year |
| R2-5 *Update result* has no busy state | RA-3 | Specified: `aria-disabled`, `aria-busy`, a spinner, and a handler guard |
| R2-6 The rule's contract relied on caller order | RB-4 | Contract: input is pre-sorted by `id`; the rule never compares ids |
| R2-7 The callback marker overstated in §3 | RA-6, RB-3b | Cell reworded: a callback has non-empty allowlisted headers |
| R2-8 A history-read 500 masks the 503 pause | RA-7 | Recorded as accepted in §5.2 |
| R2-9 A-2 still said "exactly one" | RA (JD-W7 partial) | `requirements.md` A-2 now says "at most one" |
| R2-10 Design commitments with no requirement row | RB-5 | Info only. They are design-level: fail-closed 500, `pushYear` range, `gate_entry_id`, disabled-while-loading |

**Counts:**

| Round | Confirmed severe | Contradiction | Suspect | Info |
|---|---|---|---|---|
| 1 | 1 | 1 | 1 | 10 warnings + 6 suggestion groups |
| 2 | 0 new | — | — | 10 |

Correction work units: 1 (architect, documents only).

JUDGMENT: APPROVED ✅
