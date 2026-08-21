# Archive Summary — client / Pool-Funding Source Gate

> **Outcome:** shipped. Non-STAR results render without the spurious error, and no futile request is issued for them. One guard, one shared util, 6 files. Merged to `dev` (`3cfe77d5`) and deployed to On-Premise Dev. Manually verified in Dev by the requester.

## 1. Document Control

| Field | Value |
| --- | --- |
| **Original spec path** | `docs/specs/bugfix/pool-funding-source-gate/` |
| **Archive path** | `docs/specs/archive/2026-08-19-bugfix--pool-funding-source-gate/` |
| **Archive date** | 2026-08-19 |
| **Spec id** | 2026-08-pool-funding-source-gate |
| **Depth / Mode** | Lite · Bug Mode |
| **Final status** | ✅ **Complete — implemented, reviewed, merged, deployed, manually verified** |
| **Commits** | `bbfa6cb8` (spec) · `8d464825` (fix) → merged to `dev` as `3cfe77d5` |
| **Package** | client (`client/research-indicators`) — **zero server changes** |

## 2. What was wrong, and what changed

Opening any non-STAR result surfaced `Cannot GET /api/v1/results/TIP-31288/pool-funding-alignment` — Express's bare 404, outside the `ServerResponseDto` envelope, for a feature that never applied to that result. The client requested alignment for **every** result regardless of source; the server route accepts digits only, so no route matched and nothing in the Nest pipeline ran.

**The fix guards a request that should never have been made.** Eligibility is a capability set derived from `PLATFORM_CODES`, and the ineligible path **clears alignment state** rather than merely skipping the fetch.

## 3. Requirements delivered

| ID | Requirement | Status |
| --- | --- | --- |
| **R-PFG-001** | Alignment requested only for capable sources (AC.0–AC.4) | ✅ Red-before captured; guard at the service covers all 5 call sites |
| **R-PFG-002** | Eligible-source set is data, not an identity check | ✅ No bare `'STAR'` literal; enumeration over `PLATFORM_CODES`; one derivation by construction |
| **NFR-PFG-001** | Client-only, zero server change | ✅ 0 forbidden paths in the diff |
| **NFR-PFG-002** | Futile round trip removed | ✅ API-spy assertion on request count |

## 4. Files changed

**6 files, 238 insertions, 19 deletions.** Production code ≈ 51 lines; the rest is tests.

| File | Change |
| --- | --- |
| `shared/utils/platform-code.util.ts` *(new)* | `platformFromResultCodeOrNull` (the single derivation), `platformFromResultCode` (STAR-defaulting wrapper), `POOL_FUNDING_PLATFORMS`, `isPoolFundingCapable` |
| `shared/services/bilateral.service.ts` | The guard in `getAlignment` — clears state, returns, issues no request |
| `shared/interceptors/result.interceptor.ts` | Consumes the shared derivation; acceptance set unchanged |
| 3 × `*.spec.ts` | Tests, incl. 2 **appended** interceptor cases |

**Not touched, by design:** the server, `api.service.ts :: bilateralPath`, `http-error.interceptor.ts`, `result-sidebar.component.ts`.

## 5. Test evidence

**No `test-report.md` — `/akili-test` was not run. Deliberately accepted** (requester, 2026-08-19): the regression evidence is owned by T-01 and the suite it would have authored already exists and passes.

| Evidence | Result |
| --- | --- |
| Bug Mode red-before | 4 failures, `Received: 1`, argument `"TIP-31288"` — the request being issued, which *is* the bug |
| **AC.0 falsification** | Guard flipped to skip-only → returned the stale `RES-001` payload where `null` was expected. **Defect class D-6 reproduced on demand** |
| Full client suite, Leader-measured in isolation | **6435 passed · 3 failed · 308/309 suites** |
| The 3 failures | **Stashed to clean `HEAD` and re-run**: `3 failed, 41 passed` in `to-promise.service.spec.ts`, same assertions → pre-existing, measured not inferred |
| Coverage | 98.55 / 97.38 / 98.41 / 98.75 vs floors 40/20/45/30, zero threshold breaches |
| `npm run build` | exit 0 — the type gate for new app code (per K-002, neither `ng lint` nor Jest type-checks it) |
| Lint | `npm run lint -- --quiet` clean |

## 6. Validation

**No `validation-report.md` — `/akili-validate` was not run. Deliberately accepted.** Substituted by an independent Reviewer (opus T3, read-only, ≠ Implementer model) across 2 rounds, plus the Leader's own isolated measurements.

**Manual browser check — PERFORMED by the requester against On-Premise Dev, reported as passing.** Recorded as a **requester attestation**: no artifact captured, not observed by the Leader. This is the evidence the control produces by design, since jsdom cannot evaluate rendered output.

## 7. Accepted warnings and follow-ups

| # | Item | Disposition |
| --- | --- | --- |
| **1** | **OQ-1 — the `numeric ⟺ STAR` invariant is assumed in three layers and validated in none.** The DB stores `result_official_code` as a **number** and `platform_code` as a separate `varchar(50)` that is **`nullable: true`**; the prefix is composed for display, not stored. A row with NULL/empty `platform_code` renders bare-numeric and is therefore classified STAR | **OPEN — merge-blocking for production, carried OUT of the archive** into `kaizen-log.md` as **KZ-012** so it stays visible. Answer with `SELECT platform_code, COUNT(*) FROM result GROUP BY platform_code;` — any NULL/`''` with a non-zero count falsifies it. **Bounded:** if false, behaviour for such a result equals today's, so this fix does not worsen it |
| **2** | Guard lowercase behaviour: `getAlignment('tip-31288')` resolves to STAR → capable → request fires | **Accepted.** Equals `HEAD`; no clause mentions casing. If case-tolerance is ever wanted, normalize **inside the wrapper**, never inside `OrNull`, or the interceptor's acceptance set widens again |
| **3** | R-PFG-001 AC.4's wording asks the guard be proven "by exercising the alignment page directly"; no test drives that component | **Covered as the spec chose to cover it** (DD-1 — single API caller, five call sites, all through `getAlignment`, structurally verified). Wording gap recorded so it is not later mistaken for a tested claim |
| **4** | Full-suite coverage reads 98.55 % against a 40 % floor — likely a narrowly-scoped `collectCoverageFrom` | **Out of scope.** The gate passed as configured; worth a look outside this spec if the floors are meant to be a real ratchet |
| **5** | **Enabling TIP later needs server work.** `RESULT_CODE` is digits-only and will still reject a prefixed code | Recorded so nobody expects the one-element array edit to ship the feature |

## 8. Historical notes

**Budget vs actual (design §14).**

| Signal | Budgeted | Actual |
| --- | --- | --- |
| Tasks | 1 | **1** ✅ |
| LOC | ≈ 90 | **238 insertions** ⚠️ — production landed on budget (~51 vs ~37); tests were 171 of 238 |
| Review rounds | 1 | **2** ⚠️ |

**The Step 2.3 reversion challenge is what this spec was shaped around, and it paid for itself.** It asked "what does removing this request break?" and found that `BilateralService` is root-scoped, `currentAlignment` has no reset on navigation, and the *failing 404 is load-bearing* — simultaneously the bug and the only thing that clears stale state. A guard that merely skipped would have passed AC.1 and AC.2, shipped, and shown the pool-funding tab on a TIP result after any STAR visit. Caught before `tasks.md` existed.

**The one FAIL was a scope leak `design.md` §14 had predicted by name.** The interceptor refactor, authorised as "consume the shared derivation", widened the URL matcher's acceptance set: `/result/FOO-123` went `null` → `STAR`, and `/result/tip-123` went `null` → `TIP` (case-sensitivity lost). Neither delta was covered — `result.interceptor.spec.ts` enumerates `PLATFORM_CODES` and is **structurally incapable** of exercising an unrecognized or differently-cased prefix, so its 29/29 green certified nothing about the changed cases.

**The remediation's pass condition was an old-vs-new comparison over nine URLs at zero divergences — and it earned its place twice.** The first draft of the fix skipped STAR in the prefix loop, introducing a **new** divergence on `/result/STAR-31288` (`STAR` → `null`). No unit suite would have surfaced it. The table caught it before the report was written.

**Judgment calls worth preserving.** The Reviewer offered a recorded waiver on the interceptor finding, since the server maps absent / `'STAR'` / unknown all to STAR and user impact was nil; the Leader upheld the FAIL instead, because the next code shape added to the router would inherit a classification nobody chose. And the guard's own STAR default was deliberately kept: defaulting to *capable* preserves today's behaviour rather than newly suppressing a possibly-legitimate request.

**KZ-010 held.** The verification command's prerequisites were pre-flighted before the fix existed, and the pre-flight found a real trap: a targeted `jest` run trips the repo's global coverage floors and **exits 1 with every test passing**, which would have made Bug Mode's "green after" unreachable.
