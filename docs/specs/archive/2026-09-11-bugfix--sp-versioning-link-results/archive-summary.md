# Archive Summary — `SP_versioning` copies `link_results`

**Outcome: shipped and verified end to end.** The migration is applied in Dev by the user, QA approved the whole module, and the data-loss bug is closed. Two tasks, zero rework, zero pivots, zero HALTs.

## Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/bugfix/sp-versioning-link-results` |
| Archive path | `docs/specs/archive/2026-09-11-bugfix--sp-versioning-link-results` |
| Archive date | 2026-09-11 |
| Depth / Mode | Lite / Bug |
| Branch | `AC-1679-Create-the-innovation-use-section` (spec branch — shared-file edits recorded as pending, not applied) |
| Final status | **Done** — implemented, reviewed, applied to Dev, QA-approved |
| Commits | `97cdb383` (spec + failing fixture), `9b031ed4` (T-01 amendment), `a3e4a5c9` (T-02 migration) |

## The bug, in one paragraph

`SP_versioning` copied **30** child tables onto a version snapshot. `link_results` was not one of them, so **every version snapshot silently lost every result-to-result link**. The user-visible symptom was Innovation Use's *Related innovation development* coming back empty on a versioned result. Not a design choice — an omission: the delete side already knew the table existed, only the copy side did not.

## Requirements delivered

| ID | Requirement | Discharged by |
| --- | --- | --- |
| **R-SPL-001** | A version snapshot carries the source result's active links | The block; fixture cases 1–4 green; **five** falsifiers observed red |
| **R-SPL-002** | Nothing else in the procedure changes | One-hunk body diff, Leader-measured, corroborated structurally by lens A |
| **NFR-SPL-001** | `down()` restores the current body verbatim | Zero-difference diff against the deployed `up()` (58,092 == 58,092 bytes) |
| **NFR-SPL-002** | No schema change | Case-insensitive DDL sweep over the file returned zero matches |

## Files changed

| File | Change |
| --- | --- |
| `server/researchindicators/src/db/migrations/1789149538737-addLinkResultsToVersioningSp.ts` | **new**, 2,069 lines — re-declares `SP_versioning` with one added block |
| `server/researchindicators/test/fixtures/sp-versioning-link-results.fixture-spec.ts` | **new** (T-01), 4 cases + the A1/A2 amendment assertions |

**The entire semantic change is 12 lines**, inserted between the `result_innovation_use` and `result_innovation_tool_function` blocks:

```sql
INSERT INTO link_results (
    created_at, created_by, updated_at, updated_by, is_active, deleted_at,
    result_id, other_result_id, link_result_role_id
)
SELECT
lr.created_at, lr.created_by, lr.updated_at, lr.updated_by, lr.is_active, lr.deleted_at,
new_result_id AS result_id,
lr.other_result_id,
lr.link_result_role_id
FROM link_results lr
WHERE lr.is_active = TRUE
    AND lr.result_id = temp_result_id;
```

The other ~2,030 lines are the currently deployed body, transcribed mechanically (DD-4) and proven byte-identical.

## Test evidence

**No `test-report.md`, and the absence is deliberate, not an oversight.** This spec's test tier *is* the fixture harness — `npm run test:fixtures` against a real, disposable MySQL schema, calling the actual stored procedure. That is the stance `sp-versioning-roles-id` established for this routine and what `design.md` §Verification Strategy prescribes. A separate `/akili-test` pass would have re-authored the same fixture at a lower tier of evidence.

| Measurement | Result |
| --- | --- |
| The spec's fixture, isolated | **4/4 pass** |
| Full fixture suite, cold-bootstrapped container | **5 failed / 16 passed / 21 suites**; 45 failed / 100 passed / 145 tests |
| Regression check | The 5 failures are the pre-existing `ResultPolicyChangeModule` DI set, enumerated name-by-name. **No sixth.** `sp-versioning-objective-blocks` still PASS |
| Live routine (KZ-001) | `information_schema.ROUTINES` confirms `INSERT INTO link_results` in the deployed procedure — asserted in the database, not on the file |
| eslint (bare) / prettier / build | exit 0 / 0 / 0 |

**Five falsifiers observed red** (K-004 / KZ-014) — four by the Implementer (drop `is_active`; drop the ownership filter; remap the target; include `link_result_id`), one by the Leader (A1's exact target-side shape, red at `fixture-spec.ts:309`). Every restore verified byte-identical before proceeding.

## Validation

**No `validation-report.md`. Absence explicitly accepted by the user on 2026-09-11**, on the grounds that QA approved the module and the fix was verified against the real database. What stands in its place:

- **Two parallel lens Reviewers, both `STATUS: PASS`** — the review-lens table forces parallel lenses when a task touches migrations *and* a data-loss surface.
- **Lens A** corroborated both diff gates *without execution tools*, via a nine-marker line-offset profile across the three candidate bodies.
- **Lens B** re-derived the delete-path FK audit from the **latest** declaration of each routine rather than trusting `requirements.md`'s table, and could not construct a reachable FK 1451.
- **The user applied the migration in Dev and QA verified the behaviour.** This is the step that `link-innovation-dev` had to withhold `done` for; here it is satisfied before archive, not after.

## Accepted warnings and follow-ups

| # | Item | Disposition |
| --- | --- | --- |
| 1 | **Budget breached** — 2,069 LOC actual vs ~1,080 budgeted | **Accepted; the budget is what is wrong.** It counts the verbatim re-declaration once while NFR-SPL-001 forces it twice. New logic is 13 lines, exactly as budgeted. Both lenses agreed. A `design.md` Budget correction is recorded as a Kaizen pending item |
| 2 | **DD-5 — `delete_result`'s one-direction soft delete** | **Out of scope by user ruling (2026-09-11).** Pre-existing and independent. After this change a logical delete of a source result leaves the snapshot's copied rows active — one more instance of an existing shape, not a new defect class. Every *physical* delete path clears both FK directions (re-audited) |
| 3 | **`full_delete_result_version` covered by reading only** | **Accepted.** The fixture exercises `SP_delete_result_version` exclusively. Lens B traced the family loop in `query.service.ts:56-92` and the two-direction `DELETE` and could not reach a 1451 |
| 4 | **`SP_full_delete_results_by_platform` exists only in `baseline.sql`**, in no migration | **Recorded, not actioned.** It owns no `DELETE`; it cursors results and delegates to `full_delete_result_version`, so the "covered transitively" claim holds. Its live body on Dev/Prod is whatever history put there and no static read can see it |
| 5 | **Prod not yet migrated** | **Open, and a human decision (K-015).** Dev is applied and verified. Prod application is a separate, deliberate step — the pipeline deploys code only |

## Historical notes

**The real trap was `down()`, not the SQL.** MySQL cannot patch a routine body, so the whole ~1,000-line procedure had to be re-declared, making transcription — not logic — the dominant defect class (DD-4). The specific hazard: this file's `down()` must carry the *previous* `up()` body. Had it picked up the previous `down()` instead, the rollback would revert to a two-versions-old procedure **and every test would still have passed**. Lens A closed this by locating the `is_partner_not_applicable` discriminator inside the new `down()` and confirming the offset profile matches the old `up()` exactly.

**A worker's honest self-report carried a wrong conclusion that nearly reached the permanent record.** The Implementer flagged that falsifier probe 3 reddened a different test than T-01's A1 forward pointer predicted, and concluded the pointer was wrong. Lens B established from the fixture source that probe 3 had run a *different mutation* — target remapped but the `WHERE` left intact — so the pointer was never tested, not falsified. The Leader then ran A1's exact shape rather than logging an open claim: it reddens at `fixture-spec.ts:309`, the precise line the amendment added. **That assertion had never been observed failing by anyone**, and this spec had paid a second review round for it.

**A confident zero was caught before it became a fact, twice.** Lens A flagged that the cold run reported 368 applied migrations against 326 files in the repo; the measured cause is that `src/db/baseline/baseline.sql` seeds the `migrations` table with 42 historical rows whose files predate the baseline cut (326 + 42 = 368), and the load-bearing figure — migrations present but unapplied — is **zero**. Separately, `migration:show` against Dev returned `connect ETIMEDOUT` while its grep counters read zero pending; the raw output was checked for an error before the counts were used (K-014), so the zero was discarded rather than reported.

**FP-49 paid for itself.** The Implementer deviated from T-02's literal verification command (`migration:test:bootstrap`) because the child guide documents that it is not idempotent and raises `ER_TABLE_EXISTS_ERROR` on a second run. The Leader verified the citation rather than accepting it, then used FP-49's own recovery path (`compose:test:down` → `up` → `bootstrap`) for the authoritative cold measurement.
