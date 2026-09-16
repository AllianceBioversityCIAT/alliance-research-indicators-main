# Requirements — Pool Funding Alignment is not versioned

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/pool-funding-alignment-versioning` |
| Module | `bilateral` (server) + `pool-funding-alignment` (client) |
| Spec id | `2026-09-pool-funding-alignment-versioning` |
| Depth | **Standard** |
| Mode | **Bug** (three defects with one user-visible symptom) |
| Status | draft |
| Owner | David Felipe Casañas Hernández |
| Date | 2026-09-16 |
| Related | `archive/2026-09-11-bugfix--sp-versioning-link-results` (same routine, same fixture harness) · `archive/2026-08-19-bugfix--pool-funding-source-gate` (client alignment state) · `changes/pool-funding-ux-improvements` |

---

## 1. Executive Summary

A result whose **primary contract contributes to pool funding** gets an extra optional section, *Pool funding alignment*. That section is **invisible to the whole versioning machinery**: `SP_versioning` does not copy its tables, the delete routines do not clear them, and the client's four pool-funding requests are the only result-section requests in STAR that do not carry the version.

The user-visible symptom on an APPROVED result is one screen that contradicts itself: the section renders **full of data**, its sidebar circle is **grey**, the **Save** button is gone, and **PRMS SYNC** stays disabled.

All four follow from the same three defects. Fixing them makes PRMS SYNC work with no change to PRMS SYNC.

---

## 2. Bug Diagnosis (measured, not assumed)

Evidence gathered **2026-09-16 against the live on-premise Dev/Testing database** (`alliancereportingdb @ 192.168.20.210`, read-only), plus the migration history. Every row below is a measurement, not a reading of intent.

### 2.1 The reported result, `#19941`

| Row | `result_id` | `is_snapshot` | `result_status_id` |
| --- | --- | --- | --- |
| live / current | `33830` | `0` | `4` |
| version 2026 | `34008` | `1` | `6` (Approved) |

```
pool_funding_alignment_validation(33830) = 1      -- live: complete
pool_funding_alignment_validation(34008) = 0      -- version: empty
```

The pool funding rows (`result_pool_funding_alignment` id 93, its two `_sp` rows SP06/`PRIMARY` + SP09/`CONTRIBUTING`, and `result_pool_funding_toc_alignment` id 59) **all sit on `33830`**. `34008` has none.

Across the whole database: **zero** pool funding rows exist on **any** snapshot result.

### 2.2 Defect 1 — `SP_versioning` does not copy the four tables

The live procedure body (58,911 chars, 1,025 lines) contains **31 `INSERT INTO`** statements: the `results` snapshot row plus **30 child tables**. `pool_funding` appears **0 times**.

The four tables are:

| Table | Keyed by | Notes |
| --- | --- | --- |
| `result_pool_funding_alignment` | `result_id` | at most **one active row per result** (enforced by `bilateral.service.ts:823-856`, which deactivates the previous row before inserting; measured: 49 active rows / 49 distinct results, zero duplicates) |
| `result_pool_funding_alignment_sp` | `alignment_id` → the row above | **no `result_id` column** — the only pool funding table that needs the parent surrogate key re-resolved on the new side |
| `result_pool_funding_toc_alignment` | `result_id` | unique on generated `active_result_sp` = `result_id:sp_code` while active |
| `result_pool_funding_indicator_mapping` | `result_id` | unique on `(result_id, lever_code, indicator_code, is_active)`; currently 0 rows live |

### 2.3 Defect 2 — the client never sends the version on the pool funding requests

STAR carries the version as `?version=<report_year_id>` in the route. `resultInterceptor` turns that into the `reportYear` query param — but **only** for requests that opt in with `useResultInterceptor: true` (which sets the `X-Use-Year` header).

`api.service.ts:817-847` — all four pool funding calls pass `{}`:

```ts
GET_PoolFundingAlignment      → this.TP.get(this.bilateralPath(resultCode), {});
GET_PoolFundingSciencePrograms→ this.TP.get(this.bilateralPath(resultCode, '/science-programs'), {});
GET_PoolFundingHlosIndicators → this.TP.get(this.bilateralPath(resultCode, '/hlos-indicators'), {});
PATCH_PoolFundingAlignment    → this.TP.patch(this.bilateralPath(resultCode), body, {});
```

Every other result-section call in STAR — including `GET_Metadata` and the sidebar's own `getGreenChecks()` (`to-promise.service.ts:147-150`) — passes `useResultInterceptor: true`.

Server-side there is **no bug**: `ResultsUtil.setup()` already resolves `is_snapshot = true` when `reportYear` arrives, and the bilateral controller already passes `resultsUtil.resultId` into the service. The version is dropped in the **client transport**.

**This is why the screen contradicts itself.** The sidebar circle is version-aware and reads `0` from the snapshot; the section body is not and renders the live result's rows. Two different results on one screen.

The section also does not refetch on a version change: `result.component.ts:54-58` memoises `getAlignment` on the result **code** alone, and `pool-funding-alignment.component.ts` is the only result page that does **not** inject `VersionWatcherService`.

### 2.4 Defect 3 — the delete routines cannot remove what the copy would create

| Routine | `pool_funding` occurrences (live body) | Ends with |
| --- | --- | --- |
| `SP_delete_result_version` | **0** | `DELETE FROM results` |
| `full_delete_result_version` | **0** | `DELETE FROM results` |
| `delete_result` (logical) | **0** | `UPDATE … is_active = 0` |

All four tables carry `ON DELETE NO ACTION` FKs to `results` (`fk_rpfa_result`, `fk_rpfta_result`, `fk_rpfim_result`). The moment `SP_versioning` copies a row onto a snapshot, `SP_delete_result_version` fails with **MySQL 1451** — and `createSnapshot` calls it on **every re-approval** (`green-checks.repository.ts:301-317`).

`full_delete_result_version` is already latently broken today for a *live* result carrying pool funding rows. The baseline dump (`baseline.sql:5650-5875`, a 2026-08-14 hand-edited Dev snapshot) does contain those four `DELETE` blocks, but **no migration ever did**, and migration `1787083305648` re-declared the routine without them. Live body: 0.

### 2.5 Why `Save` disappears on a version

`navigation-buttons.component.html:20` gates the button on `submission.isEditableStatus()` alone. The page-level `[showSave]` input is **declared and never read** (`navigation-buttons.component.ts:41`). On a version, metadata resolves status `6` (Approved), which is not in `editableStatuses = [4,5,12,13,10]`, so the button is hidden for every section including this one.

Nothing on the server blocks the write: the bilateral `PATCH` carries `RolesGuard` + `ResultOwnerGuard` only — **no `ResultStatusGuard`, no snapshot guard** (`bilateral.controller.ts:193-262`; the component documents this at `:362`, *"alignment edit is NOT gated by result_status"*).

### 2.6 Why PRMS SYNC is disabled

`result-sidebar.component.ts:98-103`:

```ts
canSyncPrms = computed(() => {
  const isApproved = this.cache.currentMetadata()?.status_id === 6;
  const isPoolFundingComplete = Boolean(this.cache.greenChecks()?.pool_funding_alignment);
  return isApproved && isPoolFundingComplete;
});
```

`isApproved` is already `true`. `isPoolFundingComplete` is `pool_funding_alignment_validation(34008) = 0`. **Fixing Defect 1 makes this button work with no change to this code.**

---

## 3. Confirmed Decisions

These are rulings, not assumptions, and a later reader who disagrees is reopening a settled call.

| # | Question | Ruling |
| --- | --- | --- |
| 1 | After copying, should the live result's rows be deleted or deactivated? | **Deactivated** (`is_active = 0`, `deleted_at = NOW()`). User instruction: *"cuando digo borrar es inactivar"*. |
| 2 | Should the copy be restricted to pool-funding-eligible results? | **No.** `SP_versioning` copies what exists; eligibility is already decided upstream by whether rows exist at all. A filter would add a second, divergent definition of eligibility. |
| 3 | Should the section stay editable while a version is being viewed? | **Yes — and only this section.** Every other section stays read-only on a version. |
| 4 | Should `SP_delete_result_version` **restore** the snapshot's rows to the live result, or physically **delete** them? | **Delete.** Both delete routines remove the rows; neither moves anything back. *Ruled 2026-09-16 after the alternative was presented with its consequence.* See **Accepted risk AR-1** — this makes a re-approval performed **without re-filling the section** leave the new version empty. Accepted deliberately: a result reopened for revision is expected to have its section re-filled before it is approved again. |
| 5 | Emptying the live result turns its own pool funding green check grey, and STAR gates Submit on the raw green-check payload without filtering `VISUAL_ONLY_GREEN_CHECKS`. Is that a problem? | **No — it is the intended behaviour.** The live result is being reset for the next reporting cycle and the user is expected to re-fill the section. Not reported, not verified, not fixed here. *Ruled 2026-09-16.* |

### Accepted risk AR-1 — re-approval without re-filling empties the version

`createSnapshot` (`green-checks.repository.ts:301-317`) runs `SP_delete_result_version` then `SP_versioning` on **every** re-approval. Under Decision 4 the sequence is:

1. first approval — rows move to the version, the live result is emptied (R-PFV-002);
2. result is reopened for revision — the live section is empty;
3. re-approval **without** re-filling — the delete removes the version's rows, the copy finds nothing active on the live result and copies nothing. **The version ends empty and the previous version's data is gone.**

This is a known, accepted consequence of Decisions 1 + 4, not an oversight, and **not** a defect to be reported later. It is pinned by T-01 case 6, which asserts the emptiness *as the specified behaviour* — so the day the ruling is revisited, the test names exactly what changes.

---

## 4. Functional Requirements

### R-PFV-001 — A version snapshot carries the result's pool funding alignment

`SP_versioning` **SHALL** copy the **active** rows of all four pool funding tables onto the new snapshot, re-mapping `result_id` to the snapshot and `alignment_id` to the newly-created alignment row.

#### Scenario: the section survives approval

- GIVEN an active, non-snapshot STAR result with an active `result_pool_funding_alignment` row, its active `_sp` rows, and an active `result_pool_funding_toc_alignment` row
- WHEN `SP_versioning` is called for its `result_official_code`
- THEN a `result_pool_funding_alignment` row exists on the new snapshot's `result_id` with the same `has_contribution`
- AND every active `_sp` row of the source alignment exists pointing at the **new** alignment's `id`, with `sp_code` and `sp_role` preserved
- AND every active `result_pool_funding_toc_alignment` and `result_pool_funding_indicator_mapping` row exists on the new snapshot's `result_id` with every payload column preserved
- AND every copied row receives a **fresh** primary key — no source `id` is reused
- BUT it must NOT copy rows where `is_active = FALSE`
- BUT it must NOT attach a copied `_sp` row to the **source** alignment id — the FK must point at the row created in this same call
- AND IT MUST leave every other block of the procedure byte-identical

#### Scenario: the green check turns green on the version

- GIVEN the copy above has run for result `19941`
- WHEN `pool_funding_alignment_validation(<snapshot result_id>)` is evaluated
- THEN it returns `1`
- AND the sidebar circle for *Pool funding alignment* renders green on the version
- AND **PRMS SYNC becomes enabled**, with no change to `canSyncPrms`

### R-PFV-002 — After the copy, the live result's section is emptied

`SP_versioning` **SHALL**, after a successful copy and in the same call, set `is_active = 0` and `deleted_at = NOW()` on the **source** result's active rows in all four tables.

#### Scenario: the live result starts the next cycle empty

- GIVEN the copy of R-PFV-001 has completed
- WHEN the live (`is_snapshot = FALSE`) result is read
- THEN it has **no** active pool funding rows
- AND the snapshot has exactly the rows that were on the live result
- BUT it must NOT hard-delete any source row — deactivation only, and the source rows keep their ids, their audit columns and their `result_id`
- BUT it must NOT deactivate rows belonging to any other result
- AND IT MUST NOT run at all if the copy inserted nothing — an empty section must not be "emptied" a second time, and a failed copy must not destroy the source

### R-PFV-003 — The delete routines can remove a result that carries pool funding rows

`SP_delete_result_version` and `full_delete_result_version` **SHALL** physically delete the four tables' rows for the result they are removing, before `DELETE FROM results`.

> **Why this is mandatory and not polish.** The four FKs to `results` are `ON DELETE NO ACTION`. The moment `SP_versioning` copies a row onto a snapshot, `SP_delete_result_version` fails with **MySQL 1451** — and `createSnapshot` calls it on **every** re-approval. R-PFV-001 without R-PFV-003 breaks approval itself.

#### Scenario: a version carrying the section can be deleted

- GIVEN a result approved once, so its version carries pool funding rows
- WHEN `SP_delete_result_version` is called for that `result_official_code` + `report_year_id`
- THEN the four tables hold no rows for the snapshot's `result_id`
- AND the snapshot `results` row is deleted
- BUT it must NOT raise MySQL 1451 at any point
- BUT it must NOT touch the **live** result's rows — only the snapshot's
- AND IT MUST delete `result_pool_funding_alignment_sp` **before** `result_pool_funding_alignment`, or `fk_rpfas_alignment` blocks it

#### Scenario: approve, revise, approve again *(pins Accepted risk AR-1)*

- GIVEN a result approved once (version holds the section, live result is empty)
- WHEN it is sent back for revision and approved again **without** the section being re-filled
- THEN the sequence completes with no error
- AND the new version holds **no** pool funding rows — this is the ruled behaviour of Decision 4, asserted so that revisiting the ruling is a visible test change, not a silent one
- BUT it must NOT raise MySQL 1451 at any point

#### Scenario: the hard delete can still remove the result

- GIVEN a result (live or snapshot) carrying pool funding rows
- WHEN `full_delete_result_version` is called for it
- THEN the four tables' rows are physically deleted before `DELETE FROM results`
- AND the routine returns `TRUE`
- AND IT MUST delete `result_pool_funding_alignment_sp` **before** `result_pool_funding_alignment`, or `fk_rpfas_alignment` blocks it

### R-PFV-004 — The section reads and writes the version being viewed

The STAR client **SHALL** send the viewed version on every pool funding request, and **SHALL** refetch the section when the viewed version changes.

#### Scenario: a version shows the version's data

- GIVEN result `19941` is open at `?version=2026`
- WHEN the *Pool funding alignment* section loads
- THEN `GET .../pool-funding-alignment` carries `reportYear=2026`
- AND the rendered SPs, ToC alignment and quantitative contribution are the **snapshot's** rows
- AND the sidebar circle and the section body agree
- BUT it must NOT change the request for the live view — with no `?version` the request must be byte-identical to today's
- AND IT MUST apply to all four calls (`alignment`, `science-programs`, `hlos-indicators`, and the `PATCH`), not only the read

#### Scenario: switching version refetches

- GIVEN the live view has been opened and its alignment is held in the root-scoped `currentAlignment` signal
- WHEN the user switches to a version **in the same session**
- THEN the section refetches and renders the version's rows
- BUT it must NOT keep serving the previous view's payload — the memo in `result.component.ts` is keyed on the result **code** alone and will otherwise skip the refetch
- AND IT MUST also refetch when switching **back** to the live view

### R-PFV-005 — Save stays available for this section on a version

The *Pool funding alignment* section **SHALL** keep its Save control while a version is being viewed; every other section **SHALL** stay read-only.

#### Scenario: editing the version's section

- GIVEN result `19941` is open at `?version=2026` and the user is an owner or Center Admin
- WHEN the pool funding form is changed
- THEN the Save button is visible and enabled
- AND saving issues `PATCH … ?reportYear=2026`
- AND the saved values are read back from the **snapshot**, not the live result
- BUT it must NOT make Save appear on General information, Alliance alignment, CapSharing details, Results partners, Geographic scope, Evidence, IP rights, Policy change, Innovation details/use, OICR details or Links on a version
- BUT it must NOT bypass the existing gates — `is_read_only` (PRMS-sourced / synced), external-source results, and non-owner users must still be refused exactly as today
- AND IT MUST fail loudly if the override is widened: a change to `navigation-buttons` that shows Save by default for every section satisfies the first clause and silently breaks the whole read-only model

### R-PFV-006 — Nothing else changes

Re-declaring the three routines **MUST NOT** alter any existing block; the shared `navigation-buttons` component **MUST NOT** change behaviour for any caller that does not opt in.

#### Scenario: the other 30 tables still copy

- GIVEN the migrations have been applied
- WHEN a result carrying rows in the previously-copied tables is versioned
- THEN those rows are copied exactly as before
- AND IT MUST be shown by diffing each new routine body against the currently-deployed one, with only the intended hunks differing

---

## 5. Non-Functional Requirements

| ID | Category | Requirement | How verified |
| --- | --- | --- | --- |
| NFR-PFV-001 | reliability | Each migration's `down()` restores the pre-change routine body **verbatim** | body diff of `down()` against the previous migration's `up()` |
| NFR-PFV-002 | compliance | **No schema change** — no table, column, index or FK is added or altered | `git diff` of the migration contains no `ALTER TABLE` / `CREATE TABLE` |
| NFR-PFV-003 | reliability | `SP_versioning` stays **idempotent-safe**: it already `SIGNAL`s `45001` on a duplicate snapshot; the new blocks must run **after** that guard so a rejected call cannot deactivate the source | fixture: call twice, assert the second raises 45001 **and** the source rows are still active |
| NFR-PFV-004 | dx | Client change is transport-level only — no new service, no new state container | diff confined to `api.service.ts`, `bilateral.service.ts`, the page component, and `navigation-buttons` |

---

## 6. Defect classes and their gates

| Defect class this spec can produce | Gate that catches it | Can it go red? |
| --- | --- | --- |
| A copy block copies nothing, wrong columns, or the wrong `alignment_id` | `npm run test:fixtures` — calls the **real** `SP_versioning` against the scratch TEST schema | Yes: red on current code, green after T-03 |
| The source deactivation fires on a failed/empty copy, or hits another result | Fixture cases on R-PFV-002's `BUT`/`AND IT MUST` clauses | Yes: drop the `ROW_COUNT()` guard → red |
| FK 1451 on version delete | Fixture: version → delete-version → version (the `sp-versioning-roles-id` T-02b pattern) | Yes: omit the `DELETE` blocks → red |
| The delete reaches the **live** result's rows instead of only the snapshot's | Same fixture case, asserting the live result's rows are untouched | Yes: key the `DELETE` on `result_official_code` instead of `temp_result_id` → red |
| Transcription error in the ~1,000 re-pasted lines of each routine (MySQL has no partial `ALTER PROCEDURE`) | Body diff, old vs new (R-PFV-006) | Yes: any stray edit shows as an extra hunk |
| The client still drops `reportYear` | `npm test -- --silent` in the client: spec asserting the outgoing URL carries `reportYear` under `?version=`, and does **not** under the live view | Yes: revert the flag → red |
| `navigation-buttons` override leaks Save onto other sections | Client spec asserting the button is hidden with the default input and shown only with the opt-in | Yes: default the input to `true` → red |
| **Behaviour on Dev / Testing / Prod after merge** | **No automated gate.** The pipeline deploys code; applying a migration is a separate human decision (root `CLAUDE.md`, K-015) | **Accepted risk — recorded, not substituted** |
| **The rendered screen** (circle colour, Save placement, PRMS SYNC enabled) | **No automated gate** — jsdom cannot evaluate it | **Substituted:** human check at the HITL pause on Testing, before `/akili-validate` |

**Scope limit (KZ-017).** `npm test` on the server has `rootDir: "src"` and **never** runs `test/fixtures/`. A green `npm test` is not evidence for R-PFV-001/002/003/006. Only `npm run test:fixtures` is.

---

## 7. Out of scope

- `delete_result` (the **logical** delete) does not deactivate pool funding rows. Real, pre-existing, independent — folding it in would widen a bug fix into a routine audit. Recorded, not fixed.
- `SP_full_delete_results_by_platform` — covered transitively; it owns no `DELETE` and loops over `full_delete_result_version`.
- The `GET_GreenChecks` method at `api.service.ts:1099` is version-unaware, but the sidebar does **not** use it (it uses `to-promise.service.ts:147`, which is version-aware). Not touched.
- PRMS SYNC's `onPrmsSync()` is still a no-op stub. This spec enables the button; it does not implement the sync.
- Any change to `pool_funding_alignment_validation`.

---

## 8. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| RB-1 | `result_pool_funding_alignment`'s one-active-row invariant is enforced by the **application**, not by the Dev schema — `SHOW CREATE TABLE` on Dev (2026-09-16) shows **no** `active_result_id` column and **no** `uq_rpfa_active_result`, so migration `1779190000014` is not applied there | The copy resolves the source alignment explicitly and captures the new id from `LAST_INSERT_ID()`; design DD-2 states the degradation if the invariant is ever violated |
| RB-2 | Three routines are re-declared in full; transcription is the dominant defect class | Build each body from the **currently-deployed** migration text verbatim, then diff (R-PFV-006) |

**AR-1** (§3) is an *accepted* risk, not an open one: it is a ruled behaviour with a test that pins it.

## 9. Open questions

None. Both questions raised while drafting were put to the owner on 2026-09-16 and answered — they are Decisions 4 and 5 in §3.

---

## 10. Requirement ID Index

| ID | Title |
| --- | --- |
| R-PFV-001 | A version snapshot carries the result's pool funding alignment |
| R-PFV-002 | After the copy, the live result's section is emptied |
| R-PFV-003 | The delete routines can remove a result that carries pool funding rows |
| R-PFV-004 | The section reads and writes the version being viewed |
| R-PFV-005 | Save stays available for this section on a version |
| R-PFV-006 | Nothing else changes |
| NFR-PFV-001 | `down()` restores verbatim |
| NFR-PFV-002 | No schema change |
| NFR-PFV-003 | The duplicate-snapshot guard still protects the source |
| NFR-PFV-004 | Client change is transport-level only |
