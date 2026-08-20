# Proposal — Delete same-handle cross-year PRMS↔TIP duplicates on apply

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/cross-year-duplicate-deletion` |
| **Slug** | `cross-year-duplicate-deletion` — derived from free-text argument (PRMS 7154 / TIP 27277 same handle, duplicate not deleted on apply). Full text is proposal context, not a directory name |
| **Type** | **Bug** |
| **Approval Mode** | `gated` (default — no explicit end-to-end mandate given) |
| **Proposal status** | **Approved** 2026-08-20 (user: “approbed and continue”) — worktree `/Users/pelitos/Documents/CIAT/alliance-research-indicators-ac1641-duplicates` |
| **Depends on** | `results/cross-platform-duplicate-resolution` (lives on branch `AC-1641-Integration-improvements`) |
| **Parallel-safe** | **no** — shares `duplicate-result-priority.util`, `DuplicateResolutionService`, and the apply runner with the parent spec |
| **Parent Spec** | `results/cross-platform-duplicate-resolution` |
| **Source** | Operator report on `AC-1641-Integration-improvements` · live-dev SELECT + audit row `result_duplicate_resolution_log.id = 180` |
| **Linked tickets** | Branch / story **AC-1641** (Jira details not pulled yet — confirm ticket id if different) |
| **Date** | 2026-08-20 |
| **KZ lessons** | **KZ-004** — Bug Mode needs a runnable verification command before the fix lands (parent apply path is remote-DB gated). **KZ-002** — do not treat “same report year” as a proxy for “same publication”; enumerate by normalized handle |

## Intent

When PRMS and TIP store the **same publication handle**, applying duplicate-resolution rules must delete the loser (TIP wins → PRMS goes) even if the two rows sit in **different `report_year_id` values**. Today those pairs are classified `CROSS_YEAR_REVIEW` and left untouched.

## Problem / Current Behavior

Concrete case (live shared dev DB, SELECT-only, 2026-08-20):

| Role | `result_official_code` | `result_id` | Platform | Year | Identity |
| --- | --- | --- | --- | --- | --- |
| Loser (expected) | **7154** | 23584 | PRMS | **2023** | evidence `https://hdl.handle.net/10568/129634` |
| Winner (expected) | **27277** | 29308 | TIP | **2022** | `public_link` `https://hdl.handle.net/10568/129634` |

Same title (Musa beccarii genome assembly). Same normalized group key `hdl.handle.net/10568/129634`.

Audit proof — sweep dry-run already saw this group and **refused to delete**:

| Field | Value |
| --- | --- |
| `result_duplicate_resolution_log.id` | **180** |
| `run_id` | `83c94039-8a84-4536-9e7d-5e324655dd65` |
| `mode` | `DRY_RUN` |
| `classification` | **`CROSS_YEAR_REVIEW`** |
| `reason` | `Participants span 2 report years; auto-deletion is confined to a single year.` |
| `outcomes` | both `UNTOUCHED` (`23584`, `29308`) |
| `deleted_count` | 0 |

So the handler match works; **apply never schedules a deletion** for this group because the resolver short-circuits before Rule 1 (TIP wins).

**Note on id ambiguity:** `result_id = 27277` is a *different* TIP row (`official_code` 25246, handle `…/115234`). The operator’s “27277-TIP” is the **official code**, mapped to `result_id` 29308.

## Proposed Outcome

- A PRMS↔TIP (or other cross-platform) group that shares one normalized publication identity is resolved under the approved platform rules **without requiring equal `report_year_id`**.
- For the exemplar pair, TIP 27277 wins and PRMS 7154 is hard-deleted (subject to STAR protection / multi-identity refusal / `hard_delete_enabled`) when the operator runs apply.
- A regression test fails on today’s `flagCrossYear: true` behavior for a two-year same-handle fixture and passes after the fix.
- Parent runbook / R-RES-006 language is updated so operators no longer expect a permanent manual queue for every cross-year same-handle pair.

## Scope

| In | Out |
| --- | --- |
| Change (or replace) the sweep’s `flagCrossYear: true` gate so same-handle cross-year groups become `RESOLVED` under Rules 1–3 | Re-opening PRMS identity (R-RES-010 / handle-from-evidence) — already correct for this pair |
| Update parent requirements/design that declare cross-year as “reported, never auto-deleted” (R-RES-006 / OQ-3) | Soft-delete fallback |
| Regression util + service tests for the 7154/27277 shape (years differ, handle equal, TIP wins) | Building a separate manual-review UI for leftover conflicts |
| Dry-run / apply verification notes for this exemplar on `AC-1641` | Enabling `hard_delete_enabled` policy itself (already `true` on live config; seed migration still defaults `false`) |
| Clarify official-code vs `result_id` in runbook examples | STAR / AICCRA CS exception redesign |

## Non-Goals

- Deleting **same-platform** duplicates (still `SAME_SYSTEM_IGNORED`).
- Auto-deleting `UNRESOLVED_CONFLICT` compositions (Gate A/B / OQ-9).
- Changing PRMS sync mappers or TIP ingestion contracts.
- Implementing this on the current workspace branch (`AC-1679…`) without the parent feature — code lives on `AC-1641-Integration-improvements`.

## Affected Users, Systems, And Specs

| Affected | Detail |
| --- | --- |
| **Operators** | Sweep plan/apply on AC-1641 — cross-year same-handle groups move from review-only into `toDelete` |
| **Code (AC-1641)** | `duplicate-result-priority.util.ts` (`resolveDuplicateGroup` + `flagCrossYear`), `duplicate-resolution.service.ts` (`collectGroups`), specs/tests, parent `requirements.md` / `design.md` / `runbook.md` |
| **Specs** | Parent `results/cross-platform-duplicate-resolution` (R-RES-006, OQ-3, DC-2 wording) |
| **Data** | Live exemplar PRMS `23584` / TIP `29308`; probe of KP handle pairs suggested **many** PRMS↔TIP matches are cross-year (see Impact) |

## Visual Reference

- **Source:** None
- **Location:** n/a
- **Notes:** Backend-only (plan/apply + resolver). No STAR UI surface.

## Bug Diagnosis

### Observed Symptom

PRMS official code **7154** and TIP official code **27277** share publication handle `hdl.handle.net/10568/129634`, but after duplicate-resolution plan/apply the PRMS duplicate **remains live**. Operator expectation: Rule 1 (TIP prevails) → delete PRMS.

### Reproduction Steps

1. Environment: shared remote MySQL used by `AC-1641-Integration-improvements` (`hard_delete_enabled` currently `true` in `app_config`).
2. Confirm rows: `result_official_code IN (7154, 27277)` with platforms PRMS/TIP as in the table above; both active; identities equal after normalization.
3. `GET /api/v1/results/duplicate-resolution/plan` (or inspect audit): group key `hdl.handle.net/10568/129634`.
4. **Expected (business):** `classification = RESOLVED`, `rule = RULE_1_TIP`, winner TIP `29308`, PRMS `23584` in `toDelete`.
5. **Actual:** `classification = CROSS_YEAR_REVIEW`, both `UNTOUCHED`, `toDelete` empty — audit id **180**.

### Root Cause (confirmed)

Not a handler-matching failure. The sweep calls:

```ts
resolveDuplicateGroup(participants, { flagCrossYear: true });
```

When participants’ `reportYearId` set has size > 1, the resolver returns `CROSS_YEAR_REVIEW` with **empty `losers`** before Rule 1 runs (`duplicate-result-priority.util.ts` on AC-1641). `DuplicateResolutionService.collectGroups` only expands deletions for `RESOLVED`, so apply deletes nothing for this group.

This encodes parent requirement **R-RES-006** (“auto-deletion confined to the same report year”). Against the business rule “same public link → TIP wins, loser must not be stored”, that gate is **under-deletion (DC-2)** for every same-handle pair that spans years — including the reported exemplar.

Live config `duplicate_resolution.hard_delete_enabled = true` is **not** the blocker for this pair; classification never reaches the delete loop.

### Impact & Scope

| Axis | Finding |
| --- | --- |
| Exemplar | PRMS 7154 / TIP 27277 — confirmed in audit |
| Blast radius | Parent measured **56** cross-year groups in the full sweep corpus (rev 3). A SELECT probe of PRMS KP evidence-handle ↔ TIP `public_link` pairs found **44 matches, 0 same-year** under an approximate normalizer — if production grouping agrees, **PRMS↔TIP KP duplicates are systematically stuck in `CROSS_YEAR_REVIEW`** |
| Safety | Removing the gate increases irreversible deletes (esp. any AICCRA losers in cross-year groups). STAR protection and multi-identity refusal still apply |
| Sync path | Sync uses `flagCrossYear: false` and year-scoped candidate lookup — behavior differs from sweep; fixing only the sweep gate must stay consistent with sync expectations |

### Fix Strategy

**Route:** `/akili-specify bugfix/cross-year-duplicate-deletion` in **Bug Mode** (Lite) — logic change + mandatory regression test (red before / green after). Not `/akili-quick`.

Smallest safe correction (recommended below): **stop treating unequal `report_year_id` as a hard stop when the group already shares one normalized publication identity**; resolve with Rules 1–3; keep year metadata on the plan for operator review. Optionally retain a **filter/batch** by year without refusing deletion.

## Approach Options

| Option | What | Pros | Cons |
| --- | --- | --- | --- |
| **A — Resolve cross-year under existing rules** (recommended) | Remove or default-off `flagCrossYear` for the sweep; amend R-RES-006 / OQ-3 | Matches business “same handle → TIP wins”; unblocks exemplar and likely most PRMS↔TIP pairs; small code change | Larger irreversible delete set; needs dry-run HITL before apply |
| **B — Explicit apply for `CROSS_YEAR_REVIEW`** | Keep classification; add digest-gated apply that includes selected cross-year groups | Safer ops control | More API/surface; operator still must act per batch; under-deletion remains default |
| **C — Year-align data, keep gate** | Manually/ETL fix years so pairs become same-year | No resolver change | Does not scale; years are often legitimately different reporting periods for the same publication |

## Recommended Approach

**Option A**, implemented on `AC-1641-Integration-improvements` against the parent module:

1. Regression fixture: two participants, same normalized handle, years 2022 vs 2023, TIP + PRMS → must be `RESOLVED` / `RULE_1_TIP` / PRMS in losers (today: `CROSS_YEAR_REVIEW`).
2. Change `collectGroups` (and util defaults) so cross-year same-identity groups resolve; update R-RES-006 text to “year is informational / filterable, not a deletion veto.”
3. Re-plan dry-run; confirm exemplar appears in `toDelete`; only then apply (KZ-004: verify DB/harness prerequisites first).

## Risks, Dependencies, And Open Questions

| Risk / Q | Notes |
| --- | --- |
| **Worktree / branch** | Feature code is on `AC-1641-Integration-improvements`, not on current `AC-1679…`. Implementation must target that branch (or merge parent first) |
| **OQ-3 product flip** | Parent left “cross-year = review only” as assumed default. This proposal **reverses** that for same-handle groups — needs owner ack in specify |
| **AICCRA permanence** | Cross-year groups that delete AICCRA remain non-re-syncable — runbook §0 still applies |
| **KZ-004** | Confirm `npm test` + any live dry-run script path before Bug Mode execution |
| **Jira** | Confirm whether a child ticket exists under AC-1641 for this symptom, or paste acceptance notes |
| **Probe caveat** | The 44/0 same-year figure used an approximate SQL normalizer; specify should re-count with `DuplicateCandidateRepository`’s CTE |

## Success Criteria

- [ ] Exemplar group `hdl.handle.net/10568/129634` plans as `RESOLVED` with TIP winner and PRMS in `toDelete`.
- [ ] Util regression covers cross-year same-handle TIP↔PRMS (and at least one AICCRA cross-year case for rule matrix).
- [ ] Parent R-RES-006 / runbook no longer promise “never auto-deleted” for cross-year same-identity groups.
- [ ] After apply (flag on, digest match), PRMS `23584` is hard-deleted or explicitly `PROTECTED`/`REFUSED` with a recorded reason — not silent `UNTOUCHED` via `CROSS_YEAR_REVIEW`.

## Next Step

```text
/akili-specify bugfix/cross-year-duplicate-deletion
```

Run in **Bug Mode** (confirmed root cause above → fix plan + mandatory regression test). Implement on branch `AC-1641-Integration-improvements` (or a worktree of it).
