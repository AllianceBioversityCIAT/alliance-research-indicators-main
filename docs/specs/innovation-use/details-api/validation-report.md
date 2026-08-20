# Validation Report — Results (Innovation Use) / Details API

> ## ❌ NOT ARCHIVE-READY — 7 FAIL · 22 WARN · 1 BLOCKED
>
> **Two of the seven are product defects, and one of them is reachable, silent, and destroys data on a `200`.** The other five are record defects, in a spec whose own thesis is that claims must be derived rather than asserted.
>
> **The finding that matters most was already in this document.** The previous round's advisory register carried, verbatim: *"identity-less organization rows binding `findOne` to an arbitrary existing row (forward-pointed to T-06, never implemented — correct under the never-widen rule, but live)."* That is not an advisory. It is **FAIL-1** below: a two-field payload that overwrites an arbitrary organization row with nulls and deactivates every other row in the section. It was filed as advisory, and it stayed filed as advisory, for the same reason the ownership defect did — **an advisory is a finding nobody has to act on.**
>
> This is the **fourth** occurrence of that pattern in this spec. The record now reads: *the missing ownership check was recorded as an advisory three times before becoming a proven defect* — and the sentence immediately below it in the same register was the next one.

- **Spec:** `docs/specs/innovation-use/details-api/` · **Module:** results (`innovation-use`) · chunk 2 of 3
- **Package:** `server/researchindicators` · **Branch:** `AC-1679-Create-the-innovation-use-section` · **HEAD** `941b0260`
- **Validated:** 2026-08-20 (second run) · **Tier:** T3 Auditor, **delegated to three independent auditors** on distinct lenses

---

## Document Control

| Field | Value |
| --- | --- |
| Verdict | ❌ **NOT ARCHIVE-READY** |
| FAIL | **7** — 2 product defects, 5 record defects |
| WARN | **22** — enumerated in the register below; the total is the row count of that enumeration, not an asserted figure (3 task · 1 file-existence · 11 coverage · 4 design-conformance · 2 commit-review · 1 agent-guide) |
| BLOCKED | **1** — review-round actual cannot be derived from the tree |
| Build integrity | ✅ `npm run build` · `tsc --noEmit` · `npm run lint -- --quiet` all clean |
| Unit | **336 suites / 2285 tests** green · coverage **89.79 / 75.75 / 85.30 / 89.26** (floor 60) |
| Fixtures | **15 suites / 71 tests** green, twice on the same scratch container |
| Independence | **The Leader authored the commit under audit (`941b0260`), every `execution.md` entry, and every spec correction in this and the previous round.** Model identity satisfies `author ≠ auditor`; investment in the narrative does not. Phases 1/2/4, 5, and 6 were delegated to three auditors with fresh context and disjoint lenses. **That decision is what surfaced FAIL-1, FAIL-2 and FAIL-3 — none of which any green run would have shown.** |

### What the three auditors were pointed at, and what each found

| Auditor | Lens | Headline |
| --- | --- | --- |
| **A** | Phases 1/2/4 — task completion, file existence, coverage at **clause** granularity | **FAIL-3** — a Done criterion closed by an adjacent satisfied thing, which is what made the spec's "unflipped count is zero" claim false |
| **B** | Phase 5 — adversarial defect hunt in the implementation, told explicitly not to trust the green suite | **FAIL-1** and **FAIL-2** — two reachable corruption paths, one of them inside this spec's own remediation |
| **C** | Phase 6 — cross-document figure integrity, citation resolution, and an independent review of commit `941b0260` | **FAIL-5** — 13 stale figure sites under two headers that claim currency, including two cross-document identity claims the Leader wrote in the audited commit |

---

## Summary

**What is genuinely good, stated first because it is load-bearing.** The build passes. Coverage is 89/76/85/89 against a floor of 60, and re-running it today reproduced the recorded figures to the digit. Zero `it.failing` remain. Every read predicate on the write path names both `result_id` and its role — Auditor B verified all eleven at source and ruled out cross-role and cross-result leakage entirely. `design.md` §9's observability, a whole design section the previous round found undelivered, is now delivered (`result-innovation-use.service.ts:89` plus four `warn` sites). The previous round's FAIL-5 is genuinely closed: `R-IUA-012 AC.1` now has a test that drives *this* section's own save, asserts both sides of the transition, and pins non-vacuity. And the five fixture cases added in `941b0260` are real evidence — four of five survive adversarial review intact.

**What fails is, again, almost entirely the record — with two exceptions that are not.** FAIL-1 and FAIL-2 are code. Both were found by reading code against a claim. Neither would ever have been shown by a test run, because both produce a `200`.

| Phase | Verdict |
| --- | --- |
| 1 · Task completion | 10 PASS · 3 WARN · 0 FAIL |
| 2 · File existence | All `design.md` §2.1 paths present · **WARN** — 4 files hold gates and appear in no task's *Files touched* |
| 3 · Build integrity | ✅ build · tsc · lint · 336/2285 unit · 15/71 fixtures ×2 · coverage 89.79/75.75/85.30/89.26 |
| 4 · Requirement coverage | **1 FAIL** (FAIL-3) · 11 WARN · 116 clause instances checked, 102 pass |
| 5 · Quality / defect hunt | **2 FAIL** (both product defects) · advisory register updated |
| 6 · Design conformance | **4 FAIL** (contract gap + 3 record-integrity) · 4 WARN |

---

## FAIL-1 · HIGH · An identity-less organization row overwrites an arbitrary sibling and deactivates the rest of the section

**Severity: the highest in this spec's history.** Silent, reachable by a two-field payload, destroys data that no other code path can restore, and returns `200 OK`.

### Reach

```
PATCH /api/v1/results/innovation-use/:resultCode
{ "organizations": [ { "organization_count": 12 } ] }
```

`{"organizations":[{}]}` and `{"organizations":[{"institution_id":123}]}` (flag omitted) reach it identically.

### Mechanism, verified at source by the Leader after the auditor raised it

| Step | Site | What happens |
| --- | --- | --- |
| 1 | `create-result-innovation-use.dto.ts:135-170` | **Every** field of `InnovationUseOrganizationDto` is `@IsOptional()`. The row passes `ValidationPipe`. |
| 2 | `result-institution-types.service.ts:346` | Ownership guard **returns early** — `rawIdsPresent` is empty, no id was submitted. |
| 3 | `:204` → `:549-559` | `removeDuplicates` leaves `key` **unassigned** — none of its four branches match an identity-less row. |
| 4 | `:471-478` | `buildWhereClause`: `is_organization_known === true` is false → falls to `constructWhereClause`. |
| 5 | **`:574`, `:580`, `:586`** | **All three `if` branches are false.** The emitted predicate is `{ result_id, institution_type_role_id }` **and nothing else**. |
| 6 | `:449` → `:459-461` | `findOne` returns an **arbitrary** existing Innovation Use organization row of this result. Its PK is **adopted**. |
| 7 | `:505-526` | The else-branch of `buildDataTemplate` writes `institution_type_id: null`, `sub_institution_type_id: null`, `institution_type_custom_name: null`, `institution_id: null`, `is_organization_known: false`, `organization_count: null`. |
| 8 | `:238` then `:243` | `deactivateExistingRecords` deactivates every **other** Use org row; `save` issues the PK-keyed UPDATE on the victim. |

### Observable result

`200 OK`. A row that read `{institution_type_id: 42, organization_count: 10}` comes back as `{result_institution_type_id: 77, institution_type_id: null, sub_institution_type_id: null, institution_type_custom_name: null, institution_id: null, is_organization_known: false, organization_count: null}`, and every sibling organization row is `is_active = FALSE`. The persisted row is in a state **no other code path can produce or render**, and the original values are unrecoverable.

### Why all three protections are inert — this is the part that matters

| Protection | Why it does not fire |
| --- | --- |
| `assertInnovationUseOwnership` | Inspects `result_institution_type_id` only. The payload supplies none, so it returns at `:346`. |
| `reconcileAdoptedPrimaryKey` | Fires only when **another row in the same payload** claimed the adopted PK. `idsAlreadyClaimed` is empty, so it returns at `:287`. It was built for payload-internal collisions, not for a PK adopted by an unscoped lookup. |
| `removeDuplicates` | Sees one row. |

**The three protections this spec added are all keyed on a submitted id. This payload submits none.** They are guards on the id-present door; this is the id-less door, and the lookup behind it has no identity predicate at all.

### The asymmetry is this spec's own authorship

`R-IUA-004 AC.6` required `actor_type_id` on every actor row, and T-02 delivered it: `create-result-innovation-use.dto.ts:80-83` makes it `@IsNotEmpty()`, so `{"actors":[{}]}` is a clean `400`. **There is no organization equivalent of AC.6 in `requirements.md`, and no server-side "at least one identity field" rule anywhere on the organization path.** The actor half of the same DTO, written by the same task, is immune.

### Scope beyond this endpoint

`constructWhereClause` is **shared with Innovation Dev**, and `CreateResultInstitutionTypeDto` (`:4-38`) is equally permissive — so the helper hole is inherited, not introduced. What this spec introduced is a **public endpoint over it**, with `organization_count` as the one field a user types first. This widens **FR-7** (see FAIL-7).

**Requirements violated:** `R-IUA-007 AC.1`, `R-IUA-007 AC.3`, and `R-IUA-003`'s *"Removing a row removes exactly that row"* scenario — *"A and C remain `is_active = TRUE` with their ids preserved"*.

**Remediation is a user ruling, not an agent's call** — the fix touches a helper shared with a live sibling feature. Options in Remediation below.

---

## FAIL-2 · MED · `reconcileAdoptedPrimaryKey` fires on a phantom collision and destroys the row the caller named by id

A defect **inside this spec's own PK-collision remediation**, landed the same day.

### Reach — order-dependent, which is itself the tell

DB has Use organization row `77`, `institution_type_id = 5`, count 10.

```
{ "organizations": [
    { "result_institution_type_id": 77, "institution_type_id": 5, "organization_count": 10 },
    { "institution_type_id": 5, "organization_count": 99 }
] }
```

### Mechanism

| Step | Site | What happens |
| --- | --- | --- |
| 1 | `:337-369` | Ownership guard passes — 77 is genuinely owned — and the duplicate-PK branch does not fire, because only **one** id was submitted. |
| 2 | `:217-221` | `idsAlreadyClaimed` is built from the **raw** `data` → `{"77"}`. |
| 3 | `:204` → `:555-561` | `removeDuplicates` keys **both** rows `type_5` and is last-write-wins → keeps only the second, **id-less** row. **Row 77 is gone from `uniqueData`.** |
| 4 | `:449` → `:459-461` | The surviving row's `findOne` matches row 77 on identity and **adopts its PK**. |
| 5 | **`:283-294`** | `reconcileAdoptedPrimaryKey` sees `adoptedId = 77 ∈ idsAlreadyClaimed` → **deletes the PK**, deletes `updated_by`, stamps `created_by`. The row becomes an INSERT. |
| 6 | `:238` | Row 77 was already flagged inactive by `deactivateExistingRecords`, and **nothing re-saves it**. |

### The bug, stated precisely

`idsAlreadyClaimed` is computed over **raw `data`** (correct for the FAIL-B guard, and its comment at `:207-216` says exactly why) but **consumed against `uniqueData`** at `:230-234`. The two sets diverge exactly when `removeDuplicates` drops an id-present row. The reconcile's predicate asks *"did some row in the raw payload claim this PK?"* when the question it must ask is *"will some **surviving** row write this PK?"*

The collision is **phantom**: nothing else is going to write PK 77, so disowning it is wrong.

### Observable result

`200 OK`; row 77 left permanently `is_active = FALSE`; a new row inserted with a new id. The caller named row 77 explicitly and it did not survive with its id preserved — against `R-IUA-003`'s scenario clause directly. **Swap the two payload elements and row 77 is updated in place instead**, so one pair of rows produces two different persisted outcomes depending on array order.

### Why the actors path is immune, and why that is instructive

Actors exclude claimed ids **inside the where clause** (`result-actors.service.ts:467-469`, `Not(In(excludeIds))`) rather than post-hoc, so no adoption happens to reconcile. And `validateNoDuplicateActorTypes` rejects this payload shape pre-`BEGIN` (`result-innovation-use.service.ts:330-355`). **There is no organizations equivalent of that rule** — the same missing-rule asymmetry as FAIL-1.

The unit suite already has this payload shape at `result-institution-types.service.spec.ts:706-712`, but with an **unauthorized** id (`999`), which short-circuits at the guard. Substituting an owned id is untested.

---

## FAIL-3 · A Done criterion was closed by an adjacent satisfied thing, and it is the tick that made "zero" false

**T-01 criterion c1** (`tasks.md:97`): *"the catalog `GET` returns ten rows in a `ServerResponseDto`."*

**Ticked on the strength of** the user's `/swagger` observation (`execution.md:2086`), released at `execution.md:2097`.

**What that observation actually covers**, in `execution.md`'s own words at `:2090`: *"the observation supplies the one thing static evidence cannot — that the page **renders** as intended."* And `test-report.md:153` (G-3) states that *"the `ServerResponseDto` envelope on the wire"* is proven at **no tier**.

**A rendered Swagger page is not a live `200` carrying ten rows.** The criterion's own task limits say *"No live `200`."*

**Why this is the most expensive record defect here.** `tasks.md` §7 states: *"ALL FOUR ARE NOW CLOSED. The unflipped count is zero, reached honestly rather than by a forced tick."* Two of those four (T-01 c1, T-01 c4) were released by this single observation. c4 — *"the endpoint **renders** under the `Clarisa` tag with the bearer lock"* — is genuinely discharged by it; **c1 is not**, and it is precisely the substitution `/akili-validate` exists to catch: *the clearance substitutes an adjacent satisfied thing rather than quoting the clause.* The count is not zero. It is one.

---

## FAIL-4 · The duplicate-PK `400` shipped with no contract row, no AC, and a citation that resolves to nothing

Two user-observable rejections ship in production code, are unit-proven, and are now fixture-proven:

```
result_actors_id: same id submitted by more than one row — <id>
result_institution_type_id: same id submitted by more than one row — <id>
```

| Where it should be | Present? |
| --- | --- |
| `design.md` §4's PATCH error table (`:200-208`) — the contract chunk 3 consumes | ❌ **No row.** The FAIL-1 remediation, by contrast, explicitly *"gave §4 two error rows"* (`design.md:554`) |
| `requirements.md` — any AC | ❌ **None.** The behaviour has no requirement to regress against |
| `test-report.md`'s coverage matrix | ❌ **No row** |
| `execution.md` | ✅ only here |

**And the citation offered for it does not resolve.** Six sites claim *"`design.md` §15 made the two messages deliberately distinct"* — including **two shipped `src/` doc comments** (`result-actors.service.ts:340`, `result-institution-types.service.ts:335`), the new fixture (`:843-845`), and `execution.md:2367`. `design.md` §15 is the **Revision Log**; it contains no such statement, and `execution.md:1128` itself tabulates §15 as *"Revision-log entry."* The section that *should* carry the promise is §4 — which does not have the row.

This is **FP-50's own corollary** — *"an anchor is only an anchor if it resolves"* — violated by the round that amended FP-50, in shipped code.

---

## FAIL-5 · 13 stale figure sites, under two headers that claim currency — and the Leader wrote two of the false claims in the audited commit

`test-report.md:5` states: *"**Every figure and verdict in this file is now current** as of the 2026-08-20 closing run."* It is not.

| file:line | asserted | correct |
| --- | --- | --- |
| `test-report.md:36` | *"336 unit suites … and **five** real-MySQL fixtures"* | The spec authored **8** suite files and **6** fixtures. This is the *exact* wording `:40` records as corrected — the correction was applied at `:40` and never swept to `:36` |
| `test-report.md:40` | `336 / **2279**` | 336 / **2285** |
| `test-report.md:41` | `→ **64**` | → **71**. And the chain is broken: `49→54→64` here vs. `:26`'s *"Was 66"* — nothing records the 64→66 step |
| `test-report.md:79` | `336 suites / **2279** tests` | 336 / **2285** |
| `test-report.md:85` | `**14 suites / 64 tests**` | **15 / 71** |
| `test-report.md:89-95` | fixture table lists **F-A…F-E only** | **No row for the sixth fixture** — the one gating two product defects — while the header count was raised to 71. The authority now records a total whose contents it does not enumerate |
| `test-report.md:92` | F-B *"assertions 18 → 24"* | Unresolvable under any reading (16 `it(`, 30 `expect(`) |
| `test-report.md:130` | NFR-IUA-002 `**64** tests` | **71** |
| `test-report.md:131` | NFR-IUA-003 `**89.76/75.64/85.27/89.22**` | **89.79/75.75/85.30/89.26** |
| `validation-report.md:17` (previous) | `336/2279` · `89.76/…` · `14 suites/64` · *"Recorded identically in `tasks.md` §7 and `test-report.md`"* | All three wrong; the identity clause **false in both directions** |
| `validation-report.md:153` (previous) | *"against the current **64**"* | **71** — the third time this cell has gone stale, **inside the parenthetical that exists to note it going stale** |
| `validation-report.md:191` (previous) | *"**14** fixture suites"* | **15** |
| `validation-report.md:117` (previous) | *"across **2,037** log lines"* | `execution.md` is **2,446** lines |
| `family.md:45` | chunk 2 *"not executed … T-01, T-02, T-03 done"* | All 13 tasks `[x]`. `family.md` has not been swept since T-03 |
| `tasks.md:621` | C-4 *"enumerated by grep over all **14** files and ruled conclusive"* | **15** files. Two further live `*Seeded` guards now sit outside that enumeration — correctly live, so no regression, but the enumeration no longer covers the tree |
| `tasks.md:5` / `:765` | *"**24** consumed — exactly on budget"* / *"24 of ~24 (**exact**)"* | **≥ 26** — a review died on a session limit and a Reviewer was re-dispatched after the closing run, and two later commits each carry a round. Exact value **BLOCKED** (not derivable from the tree) |
| `tasks.md:765` | fixture tier **3,225** LOC | **4,619** LOC measured today (this spec's six fixtures + harness). The multiple must be recomputed, not carried |

**Ownership, stated plainly.** `tasks.md:760` says *"recorded identically in `test-report.md`"* and `test-report.md:28` says *"Identical figures in `tasks.md` §7."* **The Leader wrote both of those sentences in commit `941b0260`, while updating only the two header rows** — and both were false the moment they were written, because the bodies of both documents still held the pre-71 values. Under this spec's own **correction-closure** rule, that correction was **relocated, not applied**. The rule exists because of this exact failure, and it was skipped by the agent that had just invoked it.

---

## FAIL-6 · `tasks.md` contradicts its own body on the two most severity-laden facts in the spec

**`tasks.md:691`** states the §3 clause matrix has *"22 `BUT`/`AND IT MUST` clauses — **all owned**."* The clause count of 22 is correct. *"All owned"* is **false**, and three other documents say so: `test-report.md:147-149` (G-2), the previous `validation-report.md:151`, and `execution.md:2440` all record `R-IUA-011`'s *"the submit transition is permitted"* as owned by no task. `tasks.md:759` is the honest checkbox; `:691` is the false sentence.

**`tasks.md:5`** — the header `**Status:**` line, the first thing `/akili-archive` and any resuming session reads — carries five stale or retracted claims:

| Claim at `:5` | Reality |
| --- | --- |
| T-13 `[~]` | `[x]` DONE 2026-08-20 (`:621`, `execution.md:2100`) |
| *"quarantined via `it.failing` under option B"* | **Zero remain** — grep confirms only prose references |
| *"Options A/D remain open"* | **A was ruled and delivered** (`execution.md:2102`) |
| *"role isolation itself is proven"* | The **exact phrase retracted** at `:494` |
| *"T-12 carries a known blocker … decide seed ownership before it starts"* | T-12 closed |

`tasks.md:10` still reads *Last updated: 2026-08-19*.

---

## FAIL-7 · `family.md` FR-7 understates the live Innovation Dev exposure — and FAIL-1 widens it further

FR-7 (`family.md:98`) is the row **both** previous auditors independently recommended gating the archive on. It is now the least accurate description of residual risk in the spec.

| FR-7 says | Actual |
| --- | --- |
| Chunk 2 fixed this via `assertInnovationUseOwnership` — **one** protection | The Use path has **three** the Dev path lacks: ownership guard, adopted-PK reconcile, duplicate-PK rejection (`execution.md:2436`) |
| — | **FAIL-1 adds a fourth shape**, and this one the Use path does **not** have either: `constructWhereClause` is shared, and `CreateResultInstitutionTypeDto` is equally permissive, so **both** endpoints are exposed to the identity-less overwrite |

FR-7's remediation note says the fix *"needs a migration-grade human review gate rather than a copy-paste."* That is still right, and the scope is now larger than the row states.

---

## Requirement coverage — Phase 4

**116 clause instances checked** (all 73 ACs for ownership, plus 43 assertive scenario clauses, plus at-source evidence for the ~30 ACs carrying declared risk). **102 pass.**

### The structural cause of every orphan

`tasks.md` §3's clause column is scoped by its own preamble (`:670`) to *"every `BUT it must NOT` and `AND IT MUST`"* — **22 of the 43** assertive clauses. The other 21 (`THEN`, plain `AND`) are **invisible to it by construction.** That is the mechanism, not an oversight in any one row.

### `tasks.md:759` — *"Every scenario clause in §3 owned and discharged"* — is open for four reasons, not one

| # | Clause | Status |
| --- | --- | --- |
| 1 | `R-IUA-011` — *"AND the submit transition is permitted"* (`requirements.md:542`) | **OPEN — accepted as G-2.** No owner, no assertion anywhere; accepted as structurally implied. Not a new FAIL — what fails is `tasks.md:691`'s claim that it *is* owned (FAIL-6) |
| 2 | `R-IUA-001` — *"AND a subsequent PATCH … succeeds rather than returning 404"* (`:215`) | **WARN — newly found.** F-E runs the real `createResultType` on `result1Id` and never `update()`s it; the only `update()` is on `result4Id`, whose detail row came from a direct `create()`. Proven as two separate links, never composed |
| 3 | `R-IUA-003` S1 — *"AND the level is unchanged in the database"* (`:285`) | **WARN — newly found.** Unit tier only (mocked). The property *is* watched at the DB tier — but for a **different** rejection cause (the new fixture's canary), never for the negative-count case the scenario specifies |
| 4 | `R-IUA-010` — *"BUT it must NOT achieve that order by inheriting default primary-key ordering"* (`:512`) | **OPEN — accepted as G-5.** Owned but **undischargeable at any tier**; §7 demands "owned **and** discharged", so the checkbox correctly stays open |

### WARN register — requirement level

| Requirement / clause | Verdict | Why |
| --- | --- | --- |
| `R-IUA-010 AC.3/AC.4` ordering | **WARN** (G-5, unchanged) | Order clause exists at `clarisa-innovation-use-levels.service.ts:53`; F-D stays green with it deleted, and the unit gate is a presence assertion over a mock |
| `R-IUA-010 AC.1` | **WARN** | See FAIL-3 — ticked via a render observation |
| `R-IUA-002` AC.2/AC.3/AC.4 + *"must NOT return any row belonging to another role"* | **WARN** | Proven only over mocked repositories. F-B holds the exact both-roles DB state and **discards** the section `update()` returns (`innovation-use-role-isolation.fixture-spec.ts:702`) — the DB-tier read assertion was one line away. Contrast `R-IUA-009`, whose scenario *demands* fixture proof for the write side |
| `R-IUA-002 AC.7` | **WARN** (G-4) | Mechanism only — **and** its own comment overstates it: `app.module.spec.ts:20-24` promises *"a future change that widened the exclude list … would be caught"*, while the check is `path.includes('innovation-use')` (`:46`), which any wildcard exclude (`results(.*)`) passes untouched |
| `R-IUA-005 AC.2` | **WARN** (G-6) | `execution.md:906` records the exclusive falsifier as **not run**; no later entry records it running |
| `R-IUA-009 AC.4` clause (c) | **WARN — correctly unticked** | Clause (c) is **accurate**: `base-service.ts:348-360` scopes the `find`, `:429-434` keys the update on PKs alone, and `roleKey` is genuinely set (`result-quantifications.service.ts:28`). **No test gates it** — all four F-B saves pass `quantifications: []`, taking the role-named early return at `:341` and never the bulk update at `:429` |
| `R-IUA-003 AC.7` | **WARN** | `updated_at` advances only at **second** granularity (bare `CURRENT_TIMESTAMP` into `timestamp(6)`), so the AC is product-observably unreliable |
| Declared coverage authority | **WARN** | `requirements.md:184` leaves all 73 AC boxes unticked on the grounds that `test-report.md`'s matrix *"carries a per-AC verdict"*. It does not — **8 of 13** requirements are single requirement-level rows, and `R-IUA-010 AC.1/AC.2/AC.5/AC.6` and `R-IUA-006 AC.6` have **no row at all**. The argument for 73 unticked boxes depends on granularity the substitute lacks |
| `test-report.md:112` | **WARN** | Still reads `last_updated_date` — the column that **does not exist** — an 11th surviving site of a correction applied at `requirements.md:278` and `tasks.md:474` |

### Genuinely closed since the last round

| Finding | Disposition |
| --- | --- |
| **FAIL-5** (prev) · `R-IUA-012 AC.1` discharged by IP Rights' save | ✅ **FIXED.** `innovation-use-result-creation.fixture-spec.ts:771-824` drives `ResultInnovationUseService.update` at `:787`, asserts both sides at `:802-803`, pins non-vacuity via `updated_by` at `:819-823` |
| **FAIL-2** (prev) · `design.md` §9 observability undelivered | ✅ **DELIVERED.** `result-innovation-use.service.ts:89` + four `warn` sites — verified by the Leader |
| **FAIL-4** (prev) · `results.module.ts` missing from §2.1 | ✅ **CLOSED.** `design.md:113` carries the row; the file genuinely imports the module |
| **FAIL-1** (prev) · cross-role authorization variant | ✅ **FIXED** and now fixture-gated |
| **WARN-1** (prev) · DD-3's rollback dependency unasserted | ✅ **CLOSED**, and independently re-confirmed this round |

---

## Phase 2 · File existence

Every path in `design.md` §2.1 **exists**. Four files hold gates and appear in **no** task's *Files touched* and no §2.1 row:

| File | Holds |
| --- | --- |
| `src/app.module.spec.ts` | The **sole** gate for `R-IUA-002 AC.7` (T-07 c11) |
| `src/domain/entities/entities.module.spec.ts` | T-07's DD-15 gate |
| `src/domain/tools/clarisa/clarisa.module.spec.ts` | T-01 c6's DD-15 gate |
| `test/fixtures/innovation-use/innovation-use-edit-plus-add-id-collision.fixture-spec.ts` | Two product defects. **Owned by no task**, while `design.md:119` still describes the fixture set as *"F-A … F-E"* |

**Why this is more than bookkeeping.** DD-15's entire lesson is that a file omitted from §2.1 gets no Implementer to touch it and no Reviewer criterion. The omission class is **unclosed — and now includes the file that gates the DD-15 fix itself.**

---

## Phase 5 · Quality audit — what was ruled out, and the advisory register

**Ruled out at source** (Auditor B, each with file:line): writes outside the transaction (every write threaded through the callback `manager`, DD-10 honoured); throw paths that could commit; Dev-path behaviour change from the shared helpers (`resolveOrganizationCount` returns `{}` off the Use path, so no property is added — verified by reading, not by the insertion count); cross-role and cross-result leakage (all eleven read predicates name `result_id` + role); mode-exclusivity states that would make `innovation_use_validation` permanently FALSE; the four legacy Dev booleans being strandable; `total` ever being stored; the read path returning or missing a row; quantifications as a PK-write vector (a caller-supplied `id` cannot reach a write — `setOtherAttributes` yields `{}`).

### Advisory register — non-gating, carried forward

| Advisory | Note |
| --- | --- |
| **Four unvalidated catalog FKs → `500` carrying raw MySQL** | `actor_type_id`, `institution_type_id`, `sub_institution_type_id`, `institution_id` have real FKs and no validation; only `innovation_use_level_id` is protected. `GlobalExceptions` has **zero** `QueryFailedError` handling (verified: `global.exception.ts:22,29`), so the client gets `status: 500`, `description: "QueryFailedError"`, and `errors` = the driver text **including the database name and the FK constraint name**. `design.md:205` documents this exact hazard as its reason for protecting the level field, and the reasoning was not applied to the four fields sharing the failure mode. **Now also an input to the security review** — it discloses schema internals to any authenticated caller |
| Free-text overflow → the same raw `500` | No `@MaxLength` on five `text` columns; a 64–100 KB body reaches MySQL and raises `ER_DATA_TOO_LONG` |
| Collection semantics contradict the verb | `?? []` means `PATCH {"innovation_use_level_explanation":"x"}` **wipes all three collections**, while scalars follow partial-merge (DD-14). Correct per `R-IUA-003`'s *"full section"* title — but **belongs in `design.md` §4 before chunk 3 is written** |
| `?reportYear=` retargets the write to a snapshot row | Platform-wide, inherited from the Dev controller. `ResultStatusGuard` normally blocks it, but `SYSTEM_ADMIN`/`TECHNICAL_SUPPORT`/`CENTER_ADMIN` bypass. Recorded so it is not mistaken for a Use-specific guarantee |
| Custom names not trimmed | `"ACME"` and `"ACME "` are distinct identities in three places. Consistent, so no corruption |
| Duplicate quantification rows insertable | Two identical composite keys produce two INSERTs; self-healing next save. No AC forbids it |
| Unguarded `afterAll` deletes — now **five** fixtures | A throw skips `harness.close()` and leaks the connection |
| Three FP-50 citations still unconverted | Plus the `execution.md` table documenting their rot has itself rotted (see WARN table below) |

---

## Phase 6 · Design conformance

### Contract and step-order drift

| Item | Verdict |
| --- | --- |
| `design.md` §4 PATCH error table | **FAIL-4** — no row for the duplicate-PK `400`; and no `500` row despite four reachable `500` paths |
| `design.md` §5.1 step order | **WARN** — steps 7a/8a describe only the guard's *unauthorized-id* half. Neither `reconcileAdoptedPrimaryKey` nor the duplicate-PK branch appears in the step list, though both are shipped and one is user-observable |
| `design.md` §10.3 fixture table | **WARN** — lists F-A…F-E; the tree has six spec-owned fixtures, and the missing one is cited **by name** in two production service comments |
| `design.md` §15 revision log | **WARN** — no row for the duplicate-PK `400` or today's fixture tier |
| `design.md:369` cleanup item | **WARN** — carries a cleanup item for work already done, pointing at `result-innovation-use.service.ts:78-81`, which now contains the **correction itself**, not the stale claim |

### Broken citations — 15 sites, verified at HEAD

| file:line | claims | actually |
| --- | --- | --- |
| `innovation-use-section-round-trip.fixture-spec.ts:498` | `result-actors.service.ts:244` = an audit spread | Doc-comment prose; spreads at **139**, **288** |
| `…:709` | `result-institution-types.service.ts:240` = an audit spread | `tempRepo,`; spreads at **421**, **437** |
| `execution.md:2243` | *"the spread is at 138 and 265"* | **139 and 288** — the table documenting citation rot has itself rotted |
| `execution.md:2244` | line 240 is *"inside the new guard's doc comment"* | It is `tempRepo,` |
| `execution.md:2221` | dedup at actors `:308` / inst-types `:250` | **350** and **345** |
| `execution.md:2160` | logger declaration at `:83` | **89** |
| `execution.md:1513` | audit spread at inst-types `:240` | **421/437** |
| `tasks.md:174` | `customSaveInnovationDev` at `:88-152` | **91-158** — `design.md:267` records converting this exact citation; the sweep never reached `tasks.md` |
| `tasks.md:217` | `customSaveInnovationDev` at `:115-135` | **127-152** — same un-swept correction |
| `requirements.md:100` | `case INNOVATION_USE` **ABSENT**, `:531-548` | Switch is **533-554**; the case is **present** at 546-548 |
| `requirements.md:101` | `INNOVATION_USE in ipAvailables` **ABSENT**, `:550-553` | `ipAvailables` at **556-560**; **present** at 559 |
| `requirements.md:38` | `createResultType()` at `:526-558` | **528-565** |
| 6 sites incl. 2 shipped `src/` comments | *"`design.md` §15 made the two messages deliberately distinct"* | §15 is the Revision Log and says no such thing — **FAIL-4** |

`requirements.md` §4.1's *"ABSENT"* rows are point-in-time records of pre-implementation state, so their **verdict** is historically correct; their **line ranges** have drifted and now point at present-tense code.

---

## Independent review of commit `941b0260` — the Leader's own work

Audited by Auditor C against the services, because the Leader authored it.

| # | Item | Verdict |
| --- | --- | --- |
| 1 | Do the 5 new tests prove what they claim? | **4 PASS · 1 WARN** — see below |
| 2 | Is the "nothing persisted" canary real? | ✅ **PASS** — step 6 writes at `:193-199` inside the transaction opened at `:188`, before step 7 at `:202`; `create()` leaves the column NULL; no pre-`BEGIN` rejection is possible for the payload used. All three sub-checks verified at source |
| 3 | The rollback-witness sequence, and *"no equivalent witness by construction"* | ✅ **PASS** — both halves confirmed at source |
| 4 | Message assertions, em-dash included | ✅ **PASS** — one `Grep` for the literal matched code and assertions in the same pass, so the U+2014 is identical; the strings genuinely discriminate from `unknown or unauthorized …` |
| 5 | Band and sentinel hygiene | ✅ **PASS** — `902_`/`2113`/`T99IUAC` appear in exactly one file; the reserved-year and platform-code lists match the tree 11-for-11 and 7-for-7 |
| 6 | Cleanup / second-run safety | ✅ **PASS** — all four results, both actor sets **including the witness row**, both org sets, all 9 catalog codes, and the guarded year/platform rows are removed; child deletes precede parents |
| 7 | Header accuracy | ⚠️ **WARN** — see below |
| 8 | Doc edits + correction closure | ⚠️ **WARN** — edits accurate **as written**; the sweep did not run → **FAIL-5** |

**Item 1 WARN — test 5 is weaker than its name and its own doc comment.** The rollback-witness assertion is a pure **end-state** comparison. It cannot distinguish *"the sweep ran and was rolled back"* from *"the sweep never ran"*: delete `result-actors.service.ts:298-305` and **the test stays green** while its name becomes false. The doc comment states the stronger claim as established — *"Byte-identical here **means** the `ROLLBACK` genuinely undid a committed-in-transaction row change"* — but that inference rests on source ordering the assertion never touches. The ordering **does** hold (verified independently), so the claim is *true*; it is simply not *proven here*. `execution.md:2371` calling it *"the strongest single piece of rollback evidence in this file"* is a mild overclaim — the step-6 canary is at least as strong and covers both cases.

**Item 7 WARN — the rewritten header still describes two fixed defects in the present tense**, in the commit whose stated purpose was to remove a stale directive from that same header:
- `:39-43` claims `constructWhereClauseInnovationUse` has *"no exclusion of a `result_actors_id` already claimed earlier in the same payload."* The exclusion **exists** at `result-actors.service.ts:467-469`. Partly excused by the *"verified at source before this file was written"* framing.
- `:69-80` (*"The organizations mirror"*) describes the call chain with *"the same two gaps"*, carries **no** historical framing, and **omits `reconcileAdoptedPrimaryKey`** — which now sits between `processInstitution` and `dataToSave.push`. A maintainer reading this header concludes the organization collision is still open.

**Process note.** The `execution.md` section this commit added (`:2347-2399`) records a Leader-run verification block and **no Reviewer**, unlike its neighbours — `:2337` documents a re-dispatch specifically to preserve `author ≠ auditor`. The five tests, the header rewrite and three doc edits went in without an independent round. **That is why items 1 and 7 survived to this phase**, and it is the same shortcut, one level down, that FAIL-5 records.

---

## Agent Guide / Constitution Impact

`src/CLAUDE.md` and `src/AGENTS.md` carry the DD-15 block identically at all three amended sites; the previous round verified the mechanism description against the code. Not stale.

**WARN, unchanged and pre-existing:** the child guide's §4 step-3 recipe still prescribes `@Roles` + `RolesGuard`, which **DD-5 forbids** — an agent following it literally adds the one thing this spec ruled out. For `/akili-audit`.

CodeGraph re-index and the TRD §4.1/§6.1 check remain pending for `/akili-archive`.

---

## Test evidence summary

| Tier | Figure | Provenance |
| --- | --- | --- |
| Unit | **336 suites / 2285 tests** green | Re-run by the Leader today |
| Coverage | **89.79 / 75.75 / 85.30 / 89.26** | Re-run today; reproduced the recorded figures to the digit |
| Fixtures | **15 suites / 71 tests** green, twice consecutively | Re-run today, same scratch container |
| Build | `npm run build` clean (`nest build` + admin Vite bundle) | Run today |
| `tsc --noEmit` | clean | Run today |
| Lint | `npm run lint -- --quiet` clean | Run today; it carries `--fix`, `git status` re-checked after |
| `it.failing` | **0** live; 7 textual references, all historical comments | Grepped today |
| Fixture-tier LOC | **4,619** (six fixtures + harness) | Measured today; supersedes the recorded 3,225 |

**None of the seven FAILs was found by running any of the above.** Every one came from reading an artifact against the document that claims it — the third consecutive round in which that is true.

---

## Remediation

### Requires a user ruling — both are code, both touch a shared helper

| # | Finding | The decision |
| --- | --- | --- |
| **1** | **FAIL-1** identity-less organization overwrite | Three options. **(a)** Mirror `R-IUA-004 AC.6`: add a new AC requiring at least one identity field on an organization row, enforce it in `InnovationUseOrganizationDto`, reject `400`. Narrowest blast radius, Use-path only, no shared helper touched — **recommended**. **(b)** Make `constructWhereClause` return a never-matching predicate when no identity field is present, so an identity-less row always inserts. Fixes Dev too, and therefore carries Dev's risk. **(c)** File as its own spec with FR-7. Note **(a) leaves the Dev endpoint exposed**, exactly as the ownership fix did — the asymmetry is the cost of the narrow option, and it must be recorded, not glossed |
| **2** | **FAIL-2** phantom-collision reconcile | Compute `idsAlreadyClaimed` from the **surviving** rows, or check the adopted PK against ids that a surviving row will actually write. One-line class of fix, Use-path only. Add the owned-id variant of `result-institution-types.service.spec.ts:706-712`, plus a fixture case — the payload is already written in this report |

### The Leader's own to fix, and mandated by correction closure

| # | Finding | Action |
| --- | --- | --- |
| 3 | **FAIL-5** 13 stale figure sites | One sweep, all sites, from the table above. **Do not** update the two header rows again without the bodies |
| 4 | **FAIL-4** contract gap | Add the duplicate-PK `400` row to `design.md` §4; add an AC to `requirements.md`; add the matrix row to `test-report.md`; **repoint the six `design.md` §15` citations at §4**, including the two in shipped `src/` |
| 5 | **FAIL-6** `tasks.md:5` and `:691` | Rewrite the header status line; correct *"all owned"* to name the R-IUA-011 orphan |
| 6 | **FAIL-7** FR-7 | Restate as three protections plus FAIL-1's fourth shape, and record that FAIL-1 exposes **both** endpoints |
| 7 | **FAIL-3** T-01 c1 | Un-tick, restore it to the carve-out with *"blocked on a live HTTP seam (G-3)"* as its class, and correct §7's *"the unflipped count is zero"* |
| 8 | Test 5's name / comment | Either assert a precondition that the sweep is reachable, or add the delete-the-sweep mutation to the falsification set. Fix the two present-tense header paragraphs |
| 9 | 15 broken citations | Convert to anchors per FP-50 |
| 10 | `test-report.md:89-95` | Add the sixth fixture's row; record the missing 64→66 arithmetic step |

### Accepted, unchanged

**G-2** (submit transition, structurally implied) · **G-3** (HTTP tier needs a shared DB — a follow-up spec) · **G-4** (`401` mechanism-only per DD-16) · **G-5** (catalog ordering has no behavioural gate) · **G-6** (one unrun mutation). Each is a stated limit of a tier, not missing work.

### The two human gates, unchanged and still open

| Gate | Status |
| --- | --- |
| **Security review** (`requirements.md` §15) | ⚠️ **REQUIRED.** `assertInnovationUseOwnership` is an authorization control on two tables shared with Innovation Dev. **This round adds a second input:** the unvalidated-FK `500` discloses the database name and FK constraint name to any authenticated caller |
| **FR-7** (`family.md`) | **OPEN**, and wider than the row states — see FAIL-7 |

---

## Archive Readiness Recommendation

**Do not archive.** FAIL-1 is a reachable, silent data-destruction path on a `200`, and FAIL-2 is a defect inside the remediation shipped to close the previous one. Neither is closable without a user ruling, because both live next to a helper shared with a live sibling feature. The five record defects are the Leader's to sweep, and one of them — FAIL-5 — is a correction-closure rule the Leader invoked and then skipped.

**What this spec got right is worth stating beside that**, because the failures are what a working process looks like: 336 unit suites and 15 fixture suites green, a clean production build, coverage at 89/76/85/89 reproduced to the digit, four genuine product defects found across three rounds and **none hidden**, a falsification that reproduced an actual bypass rather than merely reddening an assertion, and a fixture tier that now catches two corruption shapes a `200` would otherwise have concealed.

**The pattern worth carrying to Kaizen — and it is now measurable.** Every FAIL in three consecutive validation rounds has been a **claim–artifact mismatch**, and the two product defects in this round were both sitting in the **advisory register** of the previous one. The register is where findings go to stop being acted on. This spec's own lesson was written after the third such instance: *"a run of low-severity findings is not evidence that the severe ones are gone — it is evidence about where the last reviewer was looking."* The advisory register **is** that run of low-severity findings, in written form.

**The concrete process change this suggests:** an advisory that names a reachable state — not a style or a comment — is not an advisory. It is an unfiled defect awaiting someone with the budget to construct its payload. Auditor B was given that budget for the first time this round, and it converted two of them in one pass.
