# Design — Pool Funding Alignment versioning

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/pool-funding-alignment-versioning` |
| Depth | **Standard** |
| Status | draft |
| Linked requirements | [`./requirements.md`](./requirements.md) |
| Satisfies | R-PFV-001 … R-PFV-006, NFR-PFV-001 … NFR-PFV-004 |
| Last updated | 2026-09-16 |

## 1. Executive Summary

Three independent fixes, one symptom.

| # | Layer | Change |
| --- | --- | --- |
| 1 | MySQL | `SP_versioning` gains four copy blocks and one source-deactivation block |
| 2 | MySQL | `SP_delete_result_version` and `full_delete_result_version` each gain four `DELETE` blocks |
| 3 | Angular | Four pool funding requests opt into `useResultInterceptor`; the page reacts to version changes; the shared Save button gains an opt-in override |

No schema change. No new endpoint. No new service.

## 2. Goals & non-goals

**Goals**

- The version is the system of record for the section once a result is approved (R-PFV-001, R-PFV-002).
- Approval and re-approval never raise FK 1451 (R-PFV-003).
- The screen stops showing two different results at once (R-PFV-004).
- The section stays editable on a version, alone (R-PFV-005).

**Non-goals**

- PRMS SYNC itself (`onPrmsSync()` stays a stub — this spec only makes its gate satisfiable).
- `delete_result`'s logical-delete gap.
- `pool_funding_alignment_validation`.
- Any change to the live (non-version) view's request shape.

## 3. Architecture

```
APPROVE
  └─ createSnapshot(code, year)                    green-checks.repository.ts:301
       ├─ CALL SP_delete_result_version(code, year)   ← [2] DELETE blocks (new)
       └─ CALL SP_versioning(code)                    ← [1] copy + deactivate (new)

VIEW ?version=2026
  └─ resultInterceptor  ──X── pool funding requests   ← [3] opt-in (new)
       (X-Use-Year header) ──✓── every other section
```

`SP_versioning` is the only routine that writes a version; `createSnapshot` is the only caller (two sites, `green-checks.repository.ts:301-317` and `result-status-workflow.repository.ts:146-178`), both gated on `ResultStatusEnum.APPROVED`. Nothing else needs to know about this change.

## 4. Data model

No DDL. The four tables and their constraints as they exist today:

| Table | Parent key | Partial-unique index while active | Copy shape |
| --- | --- | --- | --- |
| `result_pool_funding_alignment` | `result_id` | ~~`uq_rpfa_active_result` on generated `active_result_id`~~ — **absent on Dev AND on the scratch schema** *(corrected 2026-09-16 in T-01: `baseline.sql` holds the `1779190000014` ledger row as applied while its own table definition carries no unique index, so the migration is skipped and the drift is invisible to `migration:show`. See tasks.md RB-1.)* | **Pattern A′** — single row, id captured |
| `result_pool_funding_alignment_sp` | `alignment_id` | `idx_rpfas_active_primary` on generated `active_primary_alignment` | **Pattern B** — FK re-mapped to the new alignment id |
| `result_pool_funding_toc_alignment` | `result_id` | `idx_rpfta_active_result_sp` on generated `result_id:sp_code` | **Pattern A** |
| `result_pool_funding_indicator_mapping` | `result_id` | `uq_rpfim_result_indicator_active` on `(result_id, lever_code, indicator_code, is_active)` | **Pattern A** |

~~Because every copied row lands on a **new** `result_id` (and the `_sp` rows on a **new** `alignment_id`), **none of the four unique indexes can collide** on the copy path.~~

**Corrected 2026-09-16 (T-02 review) — the claim is false in one reachable case.** It holds for the three
`result_id`-keyed tables. It does **not** hold for `result_pool_funding_alignment_sp`: the copy block joins
`src.is_active = TRUE AND src.result_id = temp_result_id`, so it collects `_sp` rows from **every** active
source alignment and re-parents them all onto the single `new_alignment_id` produced by the `LIMIT 1` copy.
If two source alignments each own a `sp_role = 'PRIMARY'` row, both copies compute the same generated
`active_primary_alignment` and violate `idx_rpfas_active_primary` (`baseline.sql:3688-3690`) → **MySQL 1062,
`SP_versioning` aborts, the approval fails**. DD-2's stated degradation ("only one active alignment is
copied") does not cover this `_sp` merge.

**Reachability is not blocked by the schema in any environment this spec reaches** — RB-1 records that
`uq_rpfa_active_result` is absent from Dev *and* the scratch schema while its ledger row reads applied. The
only guard is the application transaction (`bilateral.service.ts:823-856`), so two concurrent `PATCH`es are
the constructible path. Dev's 110 rows show zero duplicates today, so this is latent, not live. Under DD-4 nothing is ever moved back onto a live result, so there is no second path that could collide either.

"Pattern A" and "Pattern B" are the two shapes `SP_versioning` already uses for its 30 blocks; both are reused verbatim rather than invented (DD-1).

## 5. Design Decisions

### DD-1 — Follow the procedure's established block shapes

`SP_versioning` already contains both shapes this fix needs:

- **Pattern A** — flat child: explicit column list, `new_result_id AS result_id`, `WHERE x.is_active = TRUE AND x.result_id = temp_result_id`, audit columns carried from the source. Exemplars: `result_innovation_use` (live body), `link_results`.
- **Pattern B** — grandchild whose parent surrogate key must be re-resolved on the new side. Exemplars: `result_lever_sdg_targets`, `result_impact_area_global_target`, `result_countries_sub_nationals`.

Placement: immediately after the `link_results` block — adjacent to the most recent addition, with no ordering constraint against any other block (the pool funding tables have no FK to any other child table). `result_pool_funding_alignment` **must** precede `result_pool_funding_alignment_sp`.

### DD-2 — The `_sp` FK is re-mapped through `LAST_INSERT_ID()`, not a join

Pattern B re-resolves the parent by joining on a **natural key** (`lever_id`, `impact_area_id`, `isoAlpha2`). `result_pool_funding_alignment` has no natural key — only `has_contribution`, which is not discriminating. So the parent id is captured the way the procedure already captures `new_result_id`: a single-row `INSERT … SELECT … WHERE … LIMIT 1` followed by `SET new_alignment_id = LAST_INSERT_ID()`, guarded by `ROW_COUNT()`.

This is sound because **at most one active alignment row exists per result**:

- enforced in application code — `bilateral.service.ts:823-856` deactivates the previous row inside the same transaction before inserting the new one;
- ~~enforced in the schema wherever migration `1779190000014` is applied~~ — **measured 2026-09-16 (T-01): enforced in NO environment reached by this spec.** Dev and the scratch schema both lack the index although the ledger marks the migration applied (tasks.md RB-1). The invariant therefore rests on the application layer and the measurement below, not on the schema;
- **measured** on Dev 2026-09-16: 110 total rows, 49 active, 49 distinct results, **zero** results with more than one active row.

**Degradation if the invariant is ever violated:** only one active alignment is copied — the same one `pool_funding_alignment_validation` (`limit 1`) and `findActiveAlignmentByResultId` already read. The snapshot would therefore match what the product displays, not diverge from it. Recorded so a later reader does not mistake it for this bug.

*Rejected: a `DECLARE … CURSOR` loop.* Correct for all N, but it introduces the procedure's first cursor for a case the data and two layers of enforcement say cannot occur, and a cursor's failure mode inside a 1,000-line routine is worse than the one it prevents.

### DD-3 — The source deactivation is guarded on the copy actually happening

`SP_versioning` contains **zero** `UPDATE` statements today; R-PFV-002 introduces the first. Three constraints follow:

1. It runs **after** the duplicate-snapshot `SIGNAL 45001` guard, so a rejected call cannot empty the source (NFR-PFV-003).
2. It is guarded on `new_alignment_id IS NOT NULL` — an empty section is not "emptied", and a copy that inserted nothing does not destroy a source it failed to read.
3. It is keyed on `temp_result_id` / the source `alignment_id`, never on `result_official_code`, so it cannot reach another result's rows.

`_sp` has no `result_id`, so its deactivation goes through `alignment_id IN (SELECT id FROM result_pool_funding_alignment WHERE result_id = temp_result_id)` — the same sub-select shape the baseline's `full_delete_result_version` uses for this table.

### DD-4 — Both delete routines physically delete; nothing is ever moved back *(owner-ruled 2026-09-16)*

| Routine | Semantics | Pool funding handling |
| --- | --- | --- |
| `SP_delete_result_version(code, year)` | "throw this version away, the live result survives" | **Physical `DELETE`** scoped to `temp_result_id` (the snapshot), `_sp` before `alignment` (`fk_rpfas_alignment`) |
| `full_delete_result_version(result_id)` | "this result is gone" | **Physical `DELETE`**, same ordering |

Both routines take the same shape, keyed on the `temp_result_id` they already resolve. The `_sp` table has no `result_id`, so it is reached through `alignment_id IN (SELECT id FROM result_pool_funding_alignment WHERE result_id = temp_result_id)` — the sub-select shape `baseline.sql:5819-5830` already uses for this exact table. This clears the FK 1451 hazard, which is the whole reason R-PFV-003 exists.

**Scoping is the sharp edge.** `SP_delete_result_version` resolves *two* results implicitly — the snapshot it deletes and the live row that shares the `result_official_code`. The `DELETE` must key on `temp_result_id`, never on the code, or it takes the live result's section with it. That clause has its own fixture assertion.

*Rejected: restoring the snapshot's rows onto the live result before deleting.* It would make re-approval lossless, but it costs a second result lookup, a live-side deactivation to dodge the partial-unique indexes, and a fallback for a missing live row. **Presented to the owner with its consequence on 2026-09-16 and declined** in favour of the cheaper shape. The consequence is carried as **AR-1** in `requirements.md` §3: a re-approval performed *without* re-filling the section leaves the new version empty. Accepted deliberately — a result reopened for revision is expected to have its section re-filled. R-PFV-003's second scenario asserts the emptiness **as specified behaviour**, so reversing the ruling later is a visible test change rather than a silent one.

### DD-5 — Reversion challenge (Step 2.3)

R-PFV-002 **removes** behaviour the product ships today: after approval, the live result no longer shows its pool funding section.

*What does removing it break?* Two concrete answers, both addressed rather than dismissed:

1. **Re-approval without re-filling loses the section.** Named, put to the owner with the alternative that prevents it, and **declined** — carried as **AR-1** (`requirements.md` §3) and pinned by R-PFV-003's second scenario. Recorded as a ruled consequence, not an unexamined one.
2. **The live result's green check turns grey, and STAR's Submit gate reads the raw green-check payload without filtering `VISUAL_ONLY_GREEN_CHECKS`** (the behaviour `1786679227000`'s own comment warns about), so an eligible live result may show a disabled Submit until the section is re-filled. Put to the owner and **ruled to be the intended behaviour** (Decision 5): the live result is being reset for the next cycle. Not reported, not verified, not fixed here.

No third breakage was found: nothing else reads the live result's pool funding rows (the PRMS sync is a stub; reports read the snapshot).

Both answers came back "accept" — but the challenge still earned its cost. Neither consequence was visible from the requirements alone, and #1 in particular is a data-loss path that would otherwise have reached `tasks.md` unnamed.

### DD-6 — The client fix is one flag, not a new mechanism

`useResultInterceptor: true` on the four pool funding calls is the *whole* transport fix. It is what every other result-section call already does.

~~It makes the request identical to today's when no `?version` is present (`getYearFromUrl` returns `null`, the interceptor appends nothing).~~ **False — corrected 2026-09-16 during T-04, pending owner ratification.** `getYearFromUrl` returning `null` suppresses only `reportYear`; `reportingPlatforms` sits behind a **separate, independent** `if (platform)` (`result.interceptor.ts:25-31`) and is appended whenever `router.url` matches `result/<code>`, regardless of the year. So on the live view the request **bytes do change** (they gain `reportingPlatforms=STAR`) while the **resolved server behaviour does not** — see the measurement carried in R-PFV-004. Both scenarios are affected, not just the live one: under a version the real URL is `…?reportYear=2026&reportingPlatforms=STAR`.

Two supporting changes, both because the section is the only result page that is not already version-reactive:

- `pool-funding-alignment.component.ts` injects `VersionWatcherService` and refetches on `onVersionChange`, the pattern all eleven sibling pages use.
- `result.component.ts:54-58` memoises the pre-fetch on the result **code**; the key gains the version so switching version re-issues the pre-fetch.

*No change to `bilateralPath()`* — the version is a query param appended by the interceptor, not a path segment.

### DD-7 — `navigation-buttons` gets an opt-in override, default off

`showSave` is already declared on the shared component and already passed by this page — it is simply never read by the template (`navigation-buttons.component.ts:41` vs `.html:20`). The template's condition becomes "editable status **or** the caller explicitly overrode it", with the override defaulting to `false`.

This is the KZ-002 hazard in its exact shape: a **shared component rendered on every result route**. Enumerating by "what renders" rather than by feature folder, the change touches all twelve section pages, so the override must be opt-in and its default must be covered by a test that fails if it flips (R-PFV-005's last `AND IT MUST`).

*Rejected: giving the pool funding page its own Save button.* It duplicates the navigation bar's layout, spacing and tokens, and the two would drift.

*Rejected: widening `submission.isEditableStatus()` with a version term.* That signal is read by every section and by the submit flow; adding a version branch there changes far more than this section.

### DD-8 — No server-side write gate is added or removed

The bilateral `PATCH` already carries no `ResultStatusGuard` and no snapshot guard, and the component documents that as intentional (`pool-funding-alignment.component.ts:362`). Once the client sends `reportYear`, the existing path writes to the snapshot with no server change. The four existing refusals — PRMS-sourced, TIP/AICCRA-sourced, not a pool funding contributor, already synced — keep applying unchanged (R-PFV-005's second `BUT`).

## 6. Verification strategy

| Layer | Harness | Note |
| --- | --- | --- |
| Routines | `npm run migration:test:bootstrap` then `npm run test:fixtures` (`test/jest-fixtures.json`) | Against the **disposable TEST scratch schema** — never the shared Dev DB. Model the new file on `test/fixtures/sp-versioning-link-results.fixture-spec.ts` (same seed/teardown contract, same "call the real routine" stance) |
| Client | `npm test -- --silent` from `client/research-indicators` | Assert the **outgoing request URL**, not the call sequence (KZ-001) |
| Body diffs | `diff` of each re-declared routine against the currently-deployed migration text | R-PFV-006 |
| Screen | Human check on Testing at the HITL pause | The only gate for circle colour, Save placement and PRMS SYNC — jsdom cannot evaluate them |

**Scope limits, stated (KZ-017).**

- `npm test` on the server (`rootDir: "src"`) **never** runs `test/fixtures/`. It is not evidence for R-PFV-001/002/003/006.
- The fixtures exercise the **scratch schema only**. They say nothing about Dev, Testing or Prod; applying a migration there is a separate human decision (K-015).
- `npm run lint` on the server carries `--fix` and **cannot** act as a gate (K-001). Use bare `npx eslint <path>`.
- A jsdom client spec can assert the URL a request carries; it **cannot** assert that a button is visible at a given viewport or that a circle is green.

## 7. Budget (tripwire for `/akili-execute`)

| Metric | Expected |
| --- | --- |
| Tasks | **6** |
| LOC | **~3,350** — of which ~3,150 is verbatim re-declaration of three routines (MySQL has no partial `ALTER PROCEDURE`); genuinely new logic is **~90 lines of SQL + ~40 lines of TypeScript**, plus ~250 lines of fixture |
| Review rounds | **2** (one per lane: server, client) |

Exceeding this stops execution and escalates.
