# Archive Summary — results-center / url-filters

## 1. Document Control

| Field | Value |
| --- | --- |
| **Original spec path** | `docs/specs/results-center/url-filters` |
| **Archive path** | `docs/specs/archive/2026-08-13-results-center--url-filters` |
| **Spec id** | 2026-08-url-filters |
| **Type** | Change (feature) |
| **Owner** | d.casanas@cgiar.org |
| **Depth** | Standard |
| **Archive date** | 2026-08-13 |
| **Lifecycle** | propose → judgment-day ×2 → specify → execute (13 tasks) → validate → **archive**. TEST phase deliberately skipped |

## 2. Final Status

**DELIVERED.** 13/13 tasks, 0 unresolved FAIL, all acceptance criteria met, both packages green.

| Signal | Value |
| --- | --- |
| Tasks | **13/13** (T-01…T-12 planned; **T-13 added post-validation**) |
| Passed on attempt 1 | 9 of 12 planned tasks; T-08, T-11, T-12 consumed one rework round each (budget was 3) |
| HALTs / FATAL_FAILs | **0** |
| Pivots | **1** — T-11 → D-URL-17 |
| Judgment-day findings | Round 1: 4 confirmed severe + 4 parent-verified suspects. Round 2: **4 regressions introduced by round 1's own fixes** |
| Validation | **1 FAIL** (found post-pass, fixed under T-13) · 5 WARN · 0 BLOCKED · 5 advisories |
| Client suite | **309 suites / 6,507 tests** green |
| Client coverage | 99.27 / 98.08 / 99.5 / 99.17 — every floor cleared by ~60 points |
| Server suite | 328 suites / 2,217 tests green |
| Code volume | **~5,810 insertions** vs a ~4,600 budget (**+26%**) — LOC re-baselined 3× plus one unrecorded projection miss |
| Live production defects surfaced (out of scope) | **2** — both routed to their own specs |

## 3. Requirements Delivered

| Req | Delivered |
| --- | --- |
| **R-RCU-001** | Seven canonical parameters — `indicator`, `indicators`, `contract`, `status`, `year`, `source`, `tab`. Frozen slug vocabularies; per-token-class case policy; `contract` upper-cased; `lever` excluded |
| **R-RCU-002** | Deep links apply on load with state parity across all three signals plus the rendered chip and tab strip. AC.4 narrowed to the URL layer by D-URL-17 |
| **R-RCU-003** | Applied filters written back on user intent only; `replaceUrl` keeps history flat; clearing removes the key; round-trip holds for both the tab and the multiselect |
| **R-RCU-004** | Any recognized parameter suppresses session restore; an unrecognized one alone does not |
| **R-RCU-005** | Per-token degradation, bounds (50 values / 64 chars), `getAll()` flattening, one toast per navigation naming counts not values |
| **R-RCU-006** | `indicatorTab` / `statusTab` / `statusLabel` read forever, never emitted, **no deprecation date**; canonical wins deterministically |
| **R-RCU-007** | All four producers emit the canonical scheme, including the server's CapDev email link |
| **NFR-RCU-001…005** | No loop / no duplicate URL-layer fetch · two-layer drift detection with its limits stated · no user id in the URL · history hygiene · shared-consumer isolation across four routes |

## 4. Files Changed Summary

**Client** — new `results-center/url/` layer (`results-center-url.vocabulary.ts`, `results-center-url.codec.ts` + specs); modified `results-center.component.ts`, `results-center.service.ts`, `class/table.filters.class.ts`, the Home producers (`data-overview`, `main-actions`); rewritten `results-center.component.spec.ts` (1,836 lines); extended specs for the four shared consumers.

**Server** — one string: `buildStarLink(input.agreementId)` in `capdev-bulk-notification.service.ts`; `CAPDEV_INDICATOR_TAB_QUERY` deleted.

**No** data model, migration, endpoint, OpenSearch or socket change.

## 5. Test Evidence Summary

No `test-report.md` — the TEST phase was **skipped by user decision**, and this is the accepted absence. It is defensible on this spec specifically: T-11 and T-12 were themselves test-authoring tasks, carrying mutation testing across four shared consumers and two independent reviewer lenses. `/akili-validate` re-derived all coverage evidence from live runs rather than reusing a report.

| Defect class | Gate | Outcome |
| --- | --- | --- |
| D1 codec | Unit + round-trip | ✅ closed |
| D2 loop / duplicate fetch | Real rendered tree (T-11) | ✅ closed for the URL layer; **its re-arming is what discovered the pre-existing double fetch** |
| D3 state desync | Rendered chip + tab strip after control lists resolve | ✅ closed |
| D4 vocabulary drift | Fixture parity + runtime completeness warning | ⚠️ partly, **by design and stated** |
| D5 shared-consumer regression | Full client suite | ✅ closed |
| D6 cross-package | Twin literals + **manual check** | ✅ closed — literals verified statically, manual pass performed by the product owner |

## 6. Validation Summary

`/akili-validate` ran on `opus` with the Implementer on `sonnet` (author ≠ auditor).

**Its first pass returned PASS and was wrong.** The product owner then exercised the running client and found the sidebar Indicator multiselect never reached the URL — an unmet requirement. The report was revised, the miss kept on the record, and the defect fixed under T-13.

| Finding | Disposition |
| --- | --- |
| **F-1** — R-RCU-001 + R-RCU-003 AC.1 unmet: the sidebar indicator multiselect had no query parameter | ✅ Fixed by **T-13 / D-URL-18**, re-verified |
| W-1 — D6 manual check | ✅ Performed and recorded |
| W-2 — final LOC +26% over re-baseline #2 | Recorded, routed to Kaizen |
| W-3/W-4/W-5 — three stale figures/citations | ✅ Corrected in place with closure sweeps |

## 7. Accepted Warnings & Follow-Ups

**Nothing blocking. Four items leave this spec alive elsewhere:**

| # | Item | Home |
| --- | --- | --- |
| 1 | **The Results Center issues two results requests per load.** Pre-existing, discovered by T-11, narrowed out by D-URL-17 | `docs/specs/bugfix/results-center-double-fetch` (seed proposal) |
| 2 | **`clearAllFiltersWithPreserve`'s `preserveIndicatorCodes` is dead** — written at `:996`, overwritten with `[]` at `:1023`→`:740`. Two call sites rely on behavior that does not exist | Needs `/akili-propose` |
| 3 | The two GREEN mutation cells in T-12 are correct but *incidental*; one `expect(...userFilterMutations()).toBe(mutationsBefore)` per block would make design §6.2's contract asserted rather than commented | Follow-on decision |
| 4 | `TestBed.flushEffects()` is `@developerPreview`; already in 19 spec files, so no new exposure, but an Angular bump touches all at once | Future Angular upgrade |

## 8. Historical Notes

**The design was re-cut three times before a line of code was written.** Judgment Day round 1 found four confirmed severe defects; a scoped re-judgment of those *fixes* then found four regressions the fixes themselves introduced — three tracing to one decision (making the URL write an unconditional `effect()`). D-URL-15's replacement — an intent counter as the effect's only tracked dependency, filter state read untracked — is the spine of the final design and closed R2-2, R2-5 and half of R2-1 at once.

**Two live production defects were surfaced without being asked to.** Both were declined here on the same principle: a defect that predates the spec earns its own requirements and its own review rather than an extra task on a spec already re-baselined twice.

**The budget's LOC dimension was wrong four times; its scope dimensions never moved.** Task count (12) and review rounds (3) held through every revision. LOC went ~1000 → ~3200 → ~4600 → 5810 actual, each time because a corrected total was built on an uncorrected per-item basis — the fourth instance occurring inside the note that diagnosed the third.

**The defect that mattered most was found by a person looking at the screen.** F-1 survived 6,479 passing tests, mutation testing, two independent reviewer lenses and a full validation audit — because every one of those gates verified the system against its own description, and the description said "six parameters". Two controls writing two wire keys are two filters, whatever the design doc calls them. The manual D6 gate, written into the requirements as a *substitute* control for a known coverage gap, turned out to be the only gate that could see the product.
