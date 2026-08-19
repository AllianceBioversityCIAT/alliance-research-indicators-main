# Proposal — The W3/Bilateral picker excludes W3 funding

> **Headline:** The module is the **W3 / Bilateral** registry, but its funding predicate only accepts `BILATERAL`. W3-funded projects are unselectable, so W3 contracts cannot be mapped at all. The fix is an allowlist of both funding families — roughly one line — but ~28 assertions currently assert the *opposite*, so they invert rather than disappear.
>
> **Measured:** live CLARISA gains **7** projects (25 → 32), all `… - Restricted` variants. The fixture stub gains **28** (170 → 198).
>
> **One risk must be answered before this ships:** AGRESSO's side of the same mapping (`isBilateralTagTarget`) requires `BLR`/`BILATERAL` and **explicitly excludes** pooled-funding contracts. Widening only the CLARISA side makes the two halves of one mapping disagree, and pool-funding tagging is driven by bilateral mapping.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bugfix/w3-bilateral-funding-filter/` |
| **Slug** | `w3-bilateral-funding-filter` — **derived from the free-text argument** `"for Window 3,"`, which is neither a slug nor a path. The original text is context, not a directory name |
| **Type** | **Bug** — reclassified from `Change` on 2026-08-19 after the requester confirmed the module's remit covers both funding types. The predicate does not implement the requirement it was meant to implement |
| **Approval Mode** | `gated` |
| **Module** | `bugfix/` (amends `archive/2026-08-14-bugfix--bilateral-alliance-selector`) |
| **Depends on** | none. **Amends:** `archive/2026-08-14-bugfix--bilateral-alliance-selector` · **Affects:** `bilateral/clarisa-fixture-stub`, `bilateral/clarisa-automapper-s2` |
| **Parallel-safe** | **no** — `project-selector.util.ts` is a shared predicate on the picker hot path |
| **Date** | 2026-08-19 |
| **Requested by** | Juan Carlos Cadavid |

---

## 2. Intent

Make W3-funded projects selectable in the W3/Bilateral mapping picker, so the registry covers the funding types its name declares.

---

## 3. Bug Diagnosis

### Observed Symptom

A center admin opening the bilateral mapping dialog sees only **Bilateral** projects. W3-funded projects never appear, at any phase, with no error and no empty-state explanation — they are simply absent from a list that should contain them. There is no way to map a W3 contract.

### Reproduction Steps

1. Open `/administration/center-admin/bilateral-mapping` → **New mapping** → **CLARISA Project**.
2. Search for any project whose CLARISA `source_of_funding` is `Window 3`, `Window 3 - Restricted`, `WINDOW 3 - RESTRICTED`, `Windows 3`, or `W3`.
3. **Expected:** the project is offered. **Actual:** no result, and no indication it was filtered rather than missing.

Reproducible at the predicate level without any stack:

```
isBilateralFunding('Window 3 - Restricted')   →  false     // today
isBilateralFunding('Bilateral')               →  true
```

### Root Cause

**Confirmed at code level; the intent half attributed, not inferred.**

`project-selector.util.ts` → `isBilateralFunding` accepts a funding source only when its normalized value **starts with** `BILATERAL`:

```
normalizeToken(funding).startsWith('BILATERAL')
```

That is the mechanical cause, verified by reading the predicate and both of its call sites in `clarisa-projects.service.ts` (`listBilateralProjects`, `getEligiblePhases`).

**Why it was written that way, and why that was too narrow.** The archived `bugfix/bilateral-alliance-selector` spec encoded W3 exclusion deliberately:

| Artifact | Content |
| --- | --- |
| Scenario clause | *"**BUT** it must NOT return `'Window 3'`, `'Window 3 - Restricted'`, `'WINDOW 3 - RESTRICTED'`, `'Windows 3'`, `'W3'`, or `'SRV'`"* |
| `OQ-A`, resolved | *"`WINDOW 3 - RESTRICTED` projects are **excluded** from the picker"* |
| Defect class `D2` | *"Normalization **too broad** — Window-3 admitted"* + negative fixtures for all five spellings |

So the predicate faithfully implements its spec. **The spec's scope was narrower than the module's remit** — the bilateral module's own design names the upstream system **`W3 / Bilateral Registry`** (`archive/2026-06-17-bilateral-module/design.md:47`), covering both funding families. `OQ-A` was resolved "excluded" without that reconciliation.

**Attribution, stated plainly:** the code-level cause and its blast radius are confirmed by reading and measurement. The judgement that the remit was always *both* funding types comes from the **requester** (2026-08-19), not from something derivable in the repo — the design says W3 arrives via a separate sync path, and the integration that would have settled it was never built (see Impact). That confirmation is what makes this a bug rather than a change, and it should be recorded as a decision rather than treated as discovered fact.

### Impact & Scope

**Data impact — measured 2026-08-19 against a live `clarisatest-back` capture (377 projects):**

| Cohort | Today | Fixed | Δ |
| --- | --- | --- | --- |
| Live CLARISA, Alliance + phase 2025 | **25** | **32** | **+7** |
| Fixture stub, Alliance + phase 2026 | **170** | **198** | **+28** |

All **7** live additions are `Restricted` variants (`Window 3 - Restricted` ×6, `WINDOW 3 - RESTRICTED` ×1). The 61 plain `Window 3` projects are excluded for *other* reasons (not Alliance, or not phase-matched) — so plain W3 contributes nothing today, and every project this bug currently hides is a restricted one.

Funding-spelling census (377): `Bilateral` 197 · `bilateral` 69 · `Window 3` 61 · `BILATERAL - RESTRICTED` 16 · `window3` 9 · `Bilateral - Restricted` 7 · `Window 3 - Restricted` 6 · `""` 5 · `W3` 2 · `SRV` 2 · `WINDOW 3 - RESTRICTED` 1 · `BILATERAL- RESTRICTED` 1 · `Windows 3` 1.

**Code blast radius:**

| Surface | Impact |
| --- | --- |
| `isBilateralFunding` | The predicate under change. **Its name becomes a misnomer** — consider `isMappableFunding` |
| `clarisa-projects.service.ts` | 2 call sites, both inherit the fix automatically |
| `project-selector.util.spec.ts` + 2 others | **~28 assertions invert** — they currently assert `false` for exactly the values that must now be `true` |
| `bilateral/clarisa-fixture-stub` | Recorded numbers move: 170 → 198 eligible, 140 → 166 with science programs. Its fidelity gate (T-04) asserts the old counts |
| `bilateral/clarisa-automapper-s2` | Matcher cohort grows |

**Not affected:** the fixture stub itself. It already serves all 198 rows deliberately (`DD-3`) and lets the shipped predicates filter — so the stub needs no change, which is exactly what that design decision was for.

### Scope decision — CLARISA only (requester, 2026-08-19)

**Only the CLARISA-side predicate changes. AGRESSO stays exactly as it is.** Recorded as a decision with
its consequence, because the asymmetry is real and someone will meet it later.

**The AGRESSO side, measured against Dev (3,348 contracts):**

| `funding_type` | # | Accepted by `isBilateralTagTarget`? |
| --- | --- | --- |
| **BLR** | **1,545** | ✅ |
| `null` | 1,102 | ❌ |
| **W3R** (Window 3 Restricted) | **204** | ❌ |
| W1/W2 (pooled) | 198 | ❌ |
| NONRUN · HOS · HOS-CG · RUN · ABC-HOS | 285 | ❌ |
| **W3U** (Window 3 Unrestricted) | **5** | ❌ |
| UNFD | 5 | ❌ |
| **BLU** (Bilateral Unrestricted) | **4** | ❌ |

**What this means in practice, stated plainly:** after the fix a W3 CLARISA project can be mapped to any
contract the picker offers — and the picker **does not filter by `funding_type` at all** (it passes only
`exclude-pooled-funding: true` and `limit: 50`). So a W3 project can be mapped to a `W3R` contract, and
`isBilateralTagTarget` will still classify that contract as *not* a bilateral tag target. Pool-funding
tagging therefore stays on AGRESSO's own taxonomy, unchanged.

**Why accepting that is defensible here:** only **4** active mappings exist in the entire system
(`bilateral_project_mapping WHERE is_active=1`), against **1,541 unmapped BLR** contracts. The feature is
effectively unused, so widening the CLARISA filter cannot corrupt a history that does not exist. If
AGRESSO-side symmetry is wanted later, it is a separate, independently reviewable change — and this
proposal records the exact cohorts (209 W3, 4 BLU) it would need to admit.

### Fix Strategy

**Route: `/akili-specify` (Lite) in Bug Mode** — this changes logic and live behaviour, so a regression test is mandatory. Not `/akili-quick`: the diff is one line, the risk is not, and quick escalates on risk rather than line count.

Widen the predicate to an explicit **allowlist of both funding families**, keeping the rest of `D2`'s guard intact:

- **Accept:** normalized values starting with `BILATERAL` **or** matching the W3 family (`WINDOW 3`, `WINDOWS 3`, `WINDOW3`, `W3`, including `- RESTRICTED` suffixes).
- **Still reject:** `''` and **`SRV`** — `SRV` sits in the same archived exclusion clause but **is not W3**, and nothing in the request covers it. Keeping it out preserves `D2`'s purpose.
- **Invert the ~28 assertions, do not delete them.** `D2` must be **reframed**, not dropped: "normalization too broad" remains a real defect class as long as `SRV` and blank must still be refused. Deleting the negative cases would leave a gate that evaluates nothing (**KZ-001**).

**Named failing input for the regression test (K-012)** — state it before writing the test:

```
isBilateralFunding('Window 3 - Restricted')   // false today, must be true after
isBilateralFunding('SRV')                     // false today, must STAY false
```

The first is red before the fix and green after; the second guards against over-correction. A test that only checks the first would pass a predicate that accepts everything.

---

## 4. Proposed Outcome

The picker offers both W3 and Bilateral projects; `SRV` and blank funding stay excluded; the boundary is pinned by a regression test in both directions.

---

## 5. Scope

| In | Out |
| --- | --- |
| The funding-source predicate and its ~28 assertions | `isAllianceProject`, `matchesPhase` |
| Reframing `D2` so it still guards over-broad normalization | The AGRESSO-side `isBilateralTagTarget` predicate (see R-1) |
| Updating `clarisa-fixture-stub`'s recorded counts (170→198, 140→166) | The stub's fixture or converter — unchanged by design (`DD-3`) |
| A possible rename of the now-misnamed predicate | The unbuilt **W3 Registry sync** (US6) — see R-3 |

---

## 6. Non-Goals

- **Not** a change to the fixture stub's data. Filtering is the shipped predicates' job.
- **Not** an implementation of US6 (the external W3 Registry sync).
- **Not** a change to pool-funding tag semantics.

---

## 7. Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| Center admins | Can map W3 contracts — the point of the fix |
| MEL / reporting | The mapped cohort now spans a pooled modality. **Recorded decision, not a side effect** |
| `archive/…bilateral-alliance-selector` | Its `BUT it must NOT` clause and `OQ-A` are superseded. Archived specs are point-in-time records — this proposal supersedes rather than edits it |
| `bilateral/clarisa-fixture-stub` | T-04's asserted counts move; needs a follow-up amendment |

---

## 8. Visual Reference

- **Source:** None — backend predicate. The picker's rendering and labels are unchanged; only the option count differs.

---

## 9. Risks, Dependencies, And Open Questions

### Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| **R-1** | **The two halves of the mapping disagree — accepted asymmetry, not an open question.** `agresso-contract.service.ts` → `isBilateralTagTarget` requires `funding_type` `BLR`/`BILATERAL` **and** `!hasActivePooledFundingContract`, so it rejects all **209** W3 contracts (`W3R` 204, `W3U` 5) and even the **4** `BLU`. After this fix a W3 CLARISA project is mappable to such a contract, which will still not be treated as a bilateral tag target | **ACCEPTED, 2026-08-19 (requester).** CLARISA-side only; AGRESSO unchanged. Bounded by measurement: only **4** active mappings exist in total, so no historical inconsistency is created — see *Scope decision* below. **The consequence must be stated in the spec, not left implicit** |
| **R-2** | **Pool-funding tagging is driven by bilateral mapping** (`archive/…mapping-drives-pool-funding-tag`). Admitting a pooled modality may tag pooled contracts as non-pooled | Investigate during specify; out of scope to change, but must not be discovered afterwards |
| **R-3** | The unbuilt **W3 Registry sync** (US6, still Open, `D-source-w3` blocked on the System Office) was the design's intended route for W3 data. This fix delivers W3 *selectability* without it | Record that this does **not** close US6, so nobody reads it as done |
| **R-4** | **`D2` regresses into a non-gate** if the negative assertions are deleted rather than inverted | Keep `SRV`/blank negatives; reframe `D2` as conditional (**KZ-001**) |
| **R-5** | **K-013 — measurements age fast.** Every number here is dated 2026-08-19, and the live feed changed materially within 24 hours (see below) | Re-measure at specify time; the invalidating condition is recorded |

### Adjacent finding — CLARISA started publishing the PRMS data (affects two other specs, not this one)

Measured while gathering the numbers above:

| Signal | 2026-08-18 | 2026-08-19 |
| --- | --- | --- |
| Projects | 299 | **377** |
| `external_code` populated | **0 / 299** | **78 / 377** |
| `phase` | `{2025: 299}` | `{2025: 299, **2026: 78**}` |
| Prefixes | — | **`A-` 21**, `B-` 53, `C-` 4 |

1. **`clarisa-fixture-stub`'s removal condition is literally satisfied but practically premature** — live CLARISA yields **50** eligible at phase 2026 against the stub's **170**, with **`has_science_programs` 0/50**. The condition was written as *presence* and needed *completeness*.
2. **`clarisa-automapper-s2`'s "closed `{B-, C-}` prefix set" is falsified** — `A-` now exists (AfricaRice), in a different shape (`A-AG10156` vs `B-A1649`).

Both belong to their own specs; recorded here only because this measurement surfaced them.

### Open Questions

| # | Question | Owner | Blocking |
| --- | --- | --- | --- |
| ~~**OQ-1**~~ | ~~Must the AGRESSO side follow?~~ **RESOLVED 2026-08-19 — no. CLARISA only; AGRESSO stays exactly as it is.** See below | Requester | Closed |
| **OQ-2** | **`SRV` — confirm it stays excluded.** It shares the archived clause but is not W3 | MEL | No — proposal assumes excluded |
| **OQ-3** | Rename `isBilateralFunding` → `isMappableFunding`? Accurate, but touches call sites and specs | Engineering | No |

---

## 10. Success Criteria

1. `isBilateralFunding('Window 3 - Restricted')` is **red before the fix, green after** — the Bug Mode regression evidence.
2. `SRV` and blank funding **remain excluded**, proven by a test that would fail if the predicate over-corrected.
3. The picker offers **32** projects against live CLARISA (up from 25) and **198** against the stub (up from 170), re-measured at implementation time.
4. `D2` still catches over-broad normalization.
5. R-1 is resolved or explicitly accepted in writing before merge.
6. `clarisa-fixture-stub`'s recorded counts are amended (170→198, 140→166) so its fidelity gate does not fail on stale expectations.

---

## 11. Next Step

```text
/akili-specify docs/specs/bugfix/w3-bilateral-funding-filter
```

**Lite depth, Bug Mode.** **Answer OQ-1 first** — if the AGRESSO side must follow, the scope doubles and the pool-funding tag path comes into play.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
