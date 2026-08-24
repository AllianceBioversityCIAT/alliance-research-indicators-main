# Archive Summary — clarisa / W3-Bilateral Funding Filter

> **Outcome:** shipped. W3-funded projects are selectable in the W3/Bilateral picker. One-line predicate change, 2 tasks, both Reviewer-PASSed, full server suite green (2352/2352), merged to `dev` and deployed to On-Premise Dev.

## 1. Document Control

| Field | Value |
| --- | --- |
| **Original spec path** | `docs/specs/bugfix/w3-bilateral-funding-filter/` |
| **Archive path** | `docs/specs/archive/2026-08-19-bugfix--w3-bilateral-funding-filter/` |
| **Archive date** | 2026-08-19 |
| **Spec id** | 2026-08-w3-bilateral-funding-filter |
| **Depth / Mode** | Lite · Bug Mode |
| **Final status** | ✅ **Complete — implemented, reviewed, merged, deployed** |
| **Ticket** | AC-1676 |
| **Branch** | `JuankCadavid/AC-1676` → merged to `dev` (`9ccce6a9`, pushed) |
| **Supersedes** | `archive/2026-08-14-bugfix--bilateral-alliance-selector` — its `OQ-A` and the `BUT it must NOT return 'Window 3'…` clause |

## 2. What was wrong, and what changed

`isBilateralFunding` accepted a funding source only when it started with `BILATERAL`, so W3-funded projects never reached a picker belonging to a module named the **W3 / Bilateral** registry. A W3 contract could not be mapped at all — silently, with no empty-state explanation.

The predicate faithfully implemented the archived `bilateral-alliance-selector` spec, whose scope was narrower than the module's remit. Reclassified Change → **Bug** on the requester's confirmation that the remit was always both funding families.

**The fix:** widen to an allowlist of two funding families — the existing open `BILATERAL` prefix, **or** an anchored W3 pattern (`WINDOW`/`WINDOWS`/`W` + `3`, optional `- RESTRICTED`). Anchored so `W3` does not admit `W3X`. `SRV`, blank and `NON-BILATERAL` stay excluded.

## 3. Requirements delivered

| ID | Requirement | Status |
| --- | --- | --- |
| **R-W3B-001** | Predicate admits both funding families (AC.1–AC.4) | ✅ Red-before/green-after captured verbatim |
| **R-W3B-002** | Picker and phase list offer the widened cohort (AC.1–AC.3) | ✅ Fidelity gate 198/166/32; `listProjectsForCoverage` byte-identical |
| **NFR-W3B-001** | AGRESSO left deliberately asymmetric | ✅ Zero paths under `domain/entities/agresso-contract/` |
| **NFR-W3B-002** | US6 (external W3 Registry sync) not claimed closed | ✅ No such claim in either file |

## 4. Files changed

From `execution.md`. **4 files, 72 insertions, 44 deletions.**

| File | Change |
| --- | --- |
| `…/projects/utils/project-selector.util.ts` | **The entire behavior change.** `W3_FUNDING_PATTERN` + one `\|\|` clause |
| `…/projects/utils/project-selector.util.spec.ts` | 5 W3 negatives inverted + `window3` case added; `SRV`/blank/`NON-BILATERAL` retained |
| `…/projects/clarisa-projects.service.spec.ts` | 1 assertion moved (25→30); 4 fixture rows re-funded to `SRV`; titles and markers re-stated |
| `…/clarisa/stub/clarisa-stub.fidelity.spec.ts` | 170→198, 140→166, 30→32, and the K-004 mutation regex renumbered on both sides |

**Not touched, by design:** `clarisa-projects.service.ts` (both call sites inherit the fix), the stub fixture data, `isAllianceProject`, `matchesPhase`, `agresso-contract.service.ts`, `bilateral-mapping-coverage.service.spec.ts`, and everything under `docs/specs/archive/`.

## 5. Test evidence

**No `test-report.md` — `/akili-test` was not run. Deliberately accepted:** the spec is Lite/Bug Mode, its regression evidence is owned by T-01, and the suite it would have authored already exists and passes.

| Evidence | Result |
| --- | --- |
| Bug Mode red-before (T-01) | 6 failures, exactly the 6 new W3 assertions, each `Expected: true / Received: false` |
| Bug Mode red-before (T-02) | `expected 140, got 198 (eligible cohort size 198)` — proves the fidelity gate is wired to the **shipped** predicate, not a reimplementation |
| Full server suite, Leader re-measured in isolation | **329/329 suites · 2352/2352 tests · PASS** (191 s) |
| D-4 mutation-gate pin | `grep -c 'expected 166, got 198'` → `1` |
| Lint | `npx eslint` clean on all 4 files (`npm run lint` never used as a gate — K-001) |

## 6. Validation

**No `validation-report.md` — `/akili-validate` was not run. Deliberately accepted.** Substituted by: an independent Reviewer (opus T3, read-only, ≠ Implementer model) auditing both tasks to PASS across 4 review rounds, plus the Leader's own isolated re-measurement of the full suite and all boundary gates.

**Defect class D-5 (live-CLARISA divergence) — the spec's one acknowledged blind spot, with no automated gate.**

> **Performed by the requester on 2026-08-19 against the On-Premise Dev environment, and reported as passing.** Recorded as a **requester attestation**: no artifact was captured and the Leader did not observe it. That is the evidence this control produces by design — the spec designated a human check precisely because nothing in the repo can reach live CLARISA. Stated plainly so a future reader does not mistake it for a machine-verified result.

## 7. Accepted warnings and follow-ups

| # | Item | Disposition |
| --- | --- | --- |
| **1** | **NFR-W3B-001 — AGRESSO asymmetry.** After this fix a W3 CLARISA project can be mapped to a contract that `isBilateralTagTarget` still classifies as *not* a bilateral tag target | **Accepted in writing** (requester, 2026-08-19). Bounded by measurement: only **4** active mappings exist system-wide against 1,541 unmapped `BLR` contracts, so no historical inconsistency is created |
| **2** | **The fidelity gate stopped discriminating.** Its eligible cohort is now **198 of 198** fixture rows, so that assertion would also pass against a predicate returning `true` unconditionally. Defect class D-2 (over-widening) has **no guard at the fidelity layer** | **Open.** It now rests entirely on the `SRV`/blank/`NON-BILATERAL` negatives in `project-selector.util.spec.ts`, which have become load-bearing for the whole spec. Fix when the fixture is next regenerated: add one deliberately ineligible row |
| **3** | **OQ-2 — MEL to confirm `SRV` stays excluded.** Now carries a **five-site** footprint | **Open, non-blocking.** An overturn reds all five sites visibly rather than passing silently, but the follow-up is a five-site change, not a one-liner |
| **4** | **OQ-3 — rename `isBilateralFunding` → `isMappableFunding`.** The name is now a misnomer | **Deferred by D-W3B-3**, to avoid widening a bugfix diff. Would absorb three of the four recorded READABILITY advisories (under-cited file headers at `project-selector.util.spec.ts:73`, `clarisa-projects.service.spec.ts:14`, `clarisa-stub.fidelity.spec.ts:2`) |
| **5** | **`clarisa-projects.service.spec.ts:923`** — the comment *"Pins the exact expected project ids to go red if filtering logic changes"* over-claims: the pin did **not** move when the filtering logic changed materially in this very spec | **Open (advisory).** Give that fixture an Alliance-affiliated W3 row when AC.3 is next revisited |
| **6** | **No stub → live CLARISA fallback exists.** `ARI_CLARISA_HOST` selects one host; if it points at a disabled stub, the service serves stale cache or throws `ServiceUnavailableException` — it never switches to real CLARISA | **Out of scope, recorded.** Raised by the requester post-merge. A real fallback is a design change to `getCachedAll` and needs its own spec (which errors trigger it, caching of the fallback result, UI signalling of the data source) |

## 8. Historical notes

**Budget vs actual (design §14).**

| Signal | Budgeted | Actual |
| --- | --- | --- |
| Tasks | 2 | **2** ✅ |
| LOC | ≈ 75 | **72 insertions / 44 deletions** — on target |
| Review rounds | 1 | **4** (2 per task) ⚠️ |

**Both overruns were the same defect class and the same cause.** Neither FAIL was an implementation error: both were *stale prose around correct assertions*, and both trace to an inaccurate site list in `tasks.md`.

**The spec's own blast-radius analysis was wrong in both directions, and measurement — not the list — found it:**

| Direction | Finding |
| --- | --- |
| **Missed a file** | Two production-shaped 25-count blocks exist, in two different files. `tasks.md` named one |
| **Over-predicted** | 3 of the 6 sites named for T-02 were **already green**. Their `window3Project` fixtures were never Alliance-affiliated, so `isAllianceProject` excluded them regardless of funding. The Implementer verified each in isolation and correctly declined to edit them |
| **Under-predicted** | 1 genuinely red site (`getEligiblePhases … scenario 1 — the trap`) was never named |

**Two judgment calls worth preserving.**

1. **R-2 was closed by inspection, not deferred.** The proposal flagged "pool-funding tagging may mistag pooled contracts" as *investigate, must not be discovered afterwards*. It cannot occur: `setPoolFundingTag` gates on the **AGRESSO contract's own** `funding_type`, never on the CLARISA project's `source_of_funding`, and never on whether a mapping exists.
2. **Red tests were repaired by swapping fixture data, not by inverting expectations.** Those tests exist to prove an *ineligible* 2026 project does not leak into the derived phase list. Inverting the expectation would have deleted the check while leaving it looking present; re-funding the row to `SRV` keeps it ineligible and the test's purpose intact.

**Measurement discipline that held.** The fixture cohort was re-measured offline at specify time and matched the proposal exactly (K-013). A flaky `star-results-metadata-workbook.handler.spec.ts` timeout was re-run in isolation and confirmed unrelated rather than chased (root `CLAUDE.md` §4.3). The `tasks.md` correction was deferred until both workers were idle, because mutating a work order mid-review produces a wrong verdict, not a slow one.
