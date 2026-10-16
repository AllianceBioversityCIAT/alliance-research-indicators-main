# Proposal — "Inactive" Mappings Are Unexplainable in the Bilateral Mapping Admin

## Document Control

| Field | Value |
| --- | --- |
| Spec Path | `bugfix/superseded-mapping-traceability` |
| Proposal Path | `docs/specs/bugfix/superseded-mapping-traceability/proposal.md` |
| Type | **Bug** — the screen misinforms; the data is correct |
| Slug | `superseded-mapping-traceability` — derived from the free-text argument (*"a qué hacen referencia esos inactivos… esto no debería pasar"*) |
| Approval Mode | `gated` |
| Depends on | none |
| Parallel-safe | yes |
| Related | `docs/specs/archive/2026-08-20-bugfix--pool-funding-sp-picker-empty` (**R-PSP-004** — the same defect class, one screen over) · `archive/2026-08-20-bilateral--clarisa-automapper-s2` (R-CAM-005 supersede) |
| Date | 2026-08-21 |

---

## Short answer to the question asked

**Those 200 inactive rows are the residue of the first automapper run, correctly superseded by the second.** Nothing was lost, nothing is broken, and the 199 active rows are the right ones.

The automapper ran **twice on 2026-08-20**:

| Run | Time | Fed by | `clarisa_project_id` range |
| --- | --- | --- | --- |
| 1st | **13:01** | the CLARISA **stub fixture** | **7 – 376** |
| 2nd | **14:52** | **real CLARISA** | **1389 – 1586** |

Zero ids overlap between the two groups — the same 198 projects simply carry different numeric ids in each feed. On the second run every contract already had an active `DERIVED` row pointing at a *different* project id, which R-CAM-005 classifies as **supersede**: *deactivate the old row and CREATE a new one — two rows, never one row mutated in place.* That is the specified behavior, chosen deliberately so the audit trail survives.

**So `esto no debería pasar` is half right.** The rows should exist. What should not happen is that **the screen gives you no way to know that** — which is why the only reasonable reading of it was alarm.

---

## Cleanup already applied (2026-08-21)

**194 of the 200 inactive rows were deleted from Dev**, on the user's decision, after the diagnosis below. This resolves the immediate noise; it does **not** resolve the defect, because re-running the automapper is normal operation and will produce supersede residue again.

**Predicate** — deliberately narrow, so only our own test residue was in range:

```sql
is_active = 0 AND source = 'DERIVED'
  AND DATE(created_at) = '2026-08-20' AND HOUR(created_at) = 13
  AND clarisa_project_id BETWEEN 7 AND 376
```

| Check | Value |
| --- | --- |
| Rows selected | **194** — all `DERIVED`, created 13:00–13:01 |
| Active rows in the selection | **0** |
| Total rows | 399 → **205** |
| Active rows after | **199** (unchanged) |
| Inactive rows after | **6** |
| Backup | all 194 rows exported to JSON before the `DELETE` |

**Verified independently of the script that performed the delete:** coverage still reads `198 / 0 / 198`, and `STAR-2227` still resolves `SP01 · Pending`.

**Untouched:** the 6 remaining inactive rows are `MANUAL`, dated May–July 2026 (`D527` ×5, `D504` ×1). They predate this work and were not ours to remove.

**Pre-flight that made this safe:** `bilateral_project_mapping` is referenced **by value** (`agresso_agreement_id`), never by row id — no foreign key points at these rows, and both resolution and coverage read active rows only.

---

## Problem / Current Behavior

The Bilateral Mapping admin's `Status` filter offers `all | mapped | pending | inactive`. Selecting **Inactive** returns 200 rows, every one labelled identically, with:

- **no reason** for the deactivation,
- **no link** to the row that replaced it,
- **no distinction** between kinds of inactive.

Measured on 2026-08-21 against Dev, those 200 rows are **three different things**:

| What it actually is | Count | Evidence |
| --- | --- | --- |
| Superseded by a newer active row for the same contract | **195** | an active row exists for the same `agresso_agreement_id` |
| Deliberately deactivated MANUAL history on contract `D527` | **5** | `MANUAL`, created May–Jul 2026, no active successor |
| Total | **200** | 194 `DERIVED` + 6 `MANUAL` |

An operator cannot tell "normal supersede residue" from "someone deleted 200 mappings". Both render as the word *Inactive*.

---

## Proposed Outcome

1. An inactive row states **why** it is inactive — superseded, or deactivated on purpose.
2. A superseded row **points at the row that replaced it**, so the trail is followable in one click.
3. The `Status` filter can separate the two, instead of returning one undifferentiated pile.
4. Coverage and totals are unaffected — this changes what the screen *explains*, never what it counts.

---

## Scope

| Area | Change |
| --- | --- |
| `domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.ts` | Derive a per-row inactive reason and successor in the list query |
| `dto/list-bilateral-project-mappings.query.dto.ts` | Widen the lifecycle filter beyond a single `inactive` value |
| `dto/` response shape | Add `inactive_reason` and `superseded_by` (nullable) |
| `admin/client/pages/BilateralProjectMappings.tsx` | Render the reason and a link to the successor |

**Not in scope:** changing supersede behavior, re-running or repairing any mapping, touching the automapper's matching logic, or altering coverage counting.

---

## Non-Goals

- Any *further* deletion. The one-off cleanup above removed this project's own test residue; the rows a future run produces are the audit trail R-CAM-005 exists to preserve.
- Preventing double runs. Running the automapper twice against different feeds is legitimate; the second run correcting the first is the system working.
- Any migration, unless Approach C is chosen (see below).

---

## Affected Users, Systems, And Specs

| Affected | How |
| --- | --- |
| **Bilateral operations / admin** | The people who read this screen and cannot currently interpret it — the reporters of this issue |
| **`archive/…clarisa-automapper-s2`** | Its **R-CAM-005** supersede rule is the *correct* behavior producing these rows; this spec surfaces it, never changes it |
| **`archive/…pool-funding-sp-picker-empty`** | **R-PSP-004** solved exactly this defect class on the reporter-facing screen: three situations collapsed onto one status with one misleading message. This is the same shape on the admin screen |
| Recent admin work | `95ad6d10` added the lifecycle filter (`all/mapped/pending/inactive`) and sorting — this extends that surface rather than reworking it |

---

## Visual Reference

- **Source:** User-provided screenshot (Image #58).
- **Location:** not persisted; the state is reproducible by selecting `Status = Inactive` on `/administration/center-admin/bilateral-mapping`.
- **Notes:** the change adds a column/badge and a link to an existing table. No new screen; no mockup needed.

---

## Bug Diagnosis

### Observed Symptom

Filtering the Bilateral Mapping admin by `Status = Inactive` returns 200 rows, all `Derived` / `Inactive` / `20 Aug 2026`, with no explanation. The operator's reading — *"esto no debería pasar"* — is the only one the screen supports.

### Reproduction Steps

1. Open `/administration/center-admin/bilateral-mapping`.
2. Set **Status** to **Inactive**.
3. **Expected:** rows that say why they are inactive. **Actual:** 200 identical `Inactive` badges.

### Root Cause (confirmed)

**Two causes, and the first is not a defect.**

**1. The rows exist because supersede worked.** Measured on Dev, 2026-08-21 (399 rows total, 199 active / 200 inactive):

- 194 inactive `DERIVED` rows, `clarisa_project_id` **7–376** — the deleted stub fixture's exact id range — created **13:01**.
- 194 active `DERIVED` rows, `clarisa_project_id` **1389–1586** — real CLARISA's range — created **14:52**.
- **Zero** shared ids between the groups.

The 14:52 run found an active non-`MANUAL` row pointing at a different project for every contract, which `automapper.service.ts` classifies as `supersede` and applies as *deactivate + create*. Exactly as R-CAM-005 specifies.

This is the same feed-scoped-id phenomenon that `bugfix/pool-funding-sp-picker-empty` diagnosed as **RC-B** — here it produced a correct outcome, because the automapper re-derives from `external_code` rather than trusting the stored id.

**2. The actual defect: `Inactive` is one label over at least two states.** The row carries `is_active = false` and nothing else — no reason column, no successor pointer. The service does not derive them either, so the API cannot expose what the UI would need. An operator has no path from the screen to the explanation, and the 5 genuinely-deactivated `MANUAL` rows on `D527` sit indistinguishable among 195 that were simply replaced.

### Impact & Scope

| Dimension | Assessment |
| --- | --- |
| Data integrity | **None.** No row is wrong, missing, or duplicated. Coverage reads `198/198` |
| Functional | **None.** Resolution reads only active rows |
| Operational | **Real.** The screen cannot distinguish routine residue from mass deletion, so it produces false alarms — and would equally hide a genuine one |
| Blast radius | One admin screen; the same `is_active` field is read correctly everywhere else |

### Fix Strategy

Route: **`/akili-specify` (Lite) in Bug Mode.** It is small, but it is logic (a derived classification) plus an API contract change, not a copy edit — so it needs a regression test, red before the fix.

The smallest safe correction: **derive** the distinction rather than store it. An inactive row whose `agresso_agreement_id` has a newer active row *is* superseded — that is computable from data already present, needs no migration, and stays correct for rows created before the fix.

---

## Approach Options

### Option A — Derive reason + successor in the list query *(recommended)*

Compute per row: `inactive_reason ∈ {superseded, deactivated}` and `superseded_by` (the active row's id, when one exists). Split the filter into `superseded` / `deactivated`. Render a badge and a link.

**Trade-off:** no schema change, no migration, correct retroactively for all 200 existing rows. It infers intent from shape — a row deactivated on purpose that *later* gets a new active mapping would read as `superseded`. Acceptable: for the reader, "there is a newer active mapping for this contract" is the fact that matters.

### Option B — Record the reason at write time

Add `deactivation_reason` (+ optionally `superseded_by_id`) to `bilateral_project_mapping`; set it in the automapper's supersede path and the admin's deactivate action.

**Trade-off:** exact rather than inferred, and it survives edge cases Option A collapses. Costs a migration, a backfill for the existing 200 rows (which would have to be inferred anyway — i.e. Option A's logic, run once), and — per **K-015** — a human-applied migration step against the shared Dev database.

### Option C — Just document it

Add an explanatory note to the admin screen: *"Inactive rows include mappings replaced by a later automapper run."*

**Trade-off:** minutes of work, and it does answer the question asked. But it does not let anyone check *which* rows were replaced or by what, so the next mass-deactivation still cannot be told from routine residue.

---

## Recommended Approach

**Option A.** It resolves the operator's actual question — *what are these and should I worry* — with no migration, no schema risk, and correct results for rows that already exist. Option B is the more precise design and the right follow-up **if** a case appears that inference gets wrong; buying its migration now would be paying for precision nobody has yet needed.

Precedent: `R-PSP-004` took the same route one screen over — three collapsed states separated by deriving the distinction, no new column.

---

## Risks, Dependencies, And Open Questions

| # | Item | Type |
| --- | --- | --- |
| **OQ-1** | Should the default `Status` filter exclude superseded rows, so the screen opens on what is actionable? Changes what operators see on load | Open — ops |
| **OQ-2** | Are the 5 deactivated `MANUAL` rows on `D527` intentional history, or leftovers worth cleaning? They date from May–Jul 2026 and predate the automapper | Open — ops |
| **R-1** | Inference (Option A) misreads a deliberately-deactivated row that later gains an active mapping. Low likelihood; the displayed fact stays true either way | Risk |
| **R-2** | The count dropped once (194 deleted), but **the next automapper re-run restores the situation**. This spec makes supersede residue *explainable*, not absent — deleting again after every run is not a strategy | Risk |
| **A-1** | Measurements are from Dev on 2026-08-21 and reflect two automapper runs on 2026-08-20. Re-running the automapper again will legitimately add more superseded rows (**K-013**) | Assumption |

---

## Success Criteria

- [ ] An inactive row shows **why** it is inactive, distinguishing superseded from deliberately deactivated.
- [ ] A superseded row exposes the id of the row that replaced it, and the UI links to it.
- [ ] The `Status` filter can return `superseded` and `deactivated` separately.
- [ ] The superseded-vs-deactivated split is reproduced by the endpoint, asserted in a test (the live data now holds 6 inactive rows; the test drives its own fixtures).
- [ ] Coverage still reads `198/198` and no active row changes.
- [ ] A regression test covers an inactive row **with** and **without** an active successor — red before the fix.

---

## Next Step

```text
/akili-specify bugfix/superseded-mapping-traceability
```

Run in **Bug Mode**. If OQ-1 and OQ-2 come back as "just tell us what they are", drop to `/akili-quick` with Option C instead — but that leaves the next mass-deactivation as indistinguishable as this one was.
