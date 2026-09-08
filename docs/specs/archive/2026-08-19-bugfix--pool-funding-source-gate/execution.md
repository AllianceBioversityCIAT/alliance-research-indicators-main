# Execution Log — client / Pool-Funding Source Gate

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bugfix/pool-funding-source-gate/` |
| **Spec id** | 2026-08-pool-funding-source-gate |
| **Depth / Mode** | Lite · **Bug Mode** |
| **Approval Mode** | `gated` |
| **Branch** | `JuankCadavid/AC-1676` |
| **Budget (design §14)** | 1 task · ≈ 90 LOC · 1 review round |
| **Leader** | Claude Opus 5 (T1) |
| **Implementer** | `akili-implementer` → sonnet (T2) |
| **Reviewer** | `akili-reviewer` → opus (T3), read-only. **author ≠ auditor satisfied on both axes** |
| **Started / Completed** | 2026-08-19 |

---

## Task Execution History

### T-01 — Gate the alignment fetch on the result's source, and clear state on the ineligible path

- **Status:** ✅ **PASS**
- **Date:** 2026-08-19
- **Implementer attempts:** 2
- **Requirements covered:** R-PFG-001 (AC.0–AC.4, all three scenarios and every `BUT`/`AND IT MUST` clause); R-PFG-002 (AC.1–AC.3); NFR-PFG-001; NFR-PFG-002
- **Final diff:** 6 files, 237 insertions, 19 deletions

#### Leader pre-flight (before any spawn)

**KZ-010 applied — the test command's prerequisites were verified before the fix existed**, and it found a trap:

```
npx jest src/app/shared/services/bilateral.service.spec.ts --silent                   → exit 1  (63/63 tests PASS)
npx jest src/app/shared/services/bilateral.service.spec.ts --silent --coverage=false  → exit 0
```

A targeted single-file run trips the repo's **global** coverage floors and exits non-zero with everything green. Under Bug Mode's red-before/green-after protocol that makes "green after" unreachable. `--coverage=false` was mandated in the spec and in both briefs.

**Effort set to `high` at attempt 1** (above the T2 default). Leader call, recorded: the previous spec in this session produced two FAILs, both from care in the surroundings of a correct change rather than from wrong logic, and this task carried exactly one such trap (DD-3).

#### Attempt 1 — Reviewer FAIL

**Bug Mode evidence — red-before, captured verbatim** (new tests applied, service body untouched):

```
● BilateralService › getAlignment › a TIP-prefixed result issues zero alignment requests
    expect(jest.fn()).not.toHaveBeenCalled()
    Expected number of calls: 0 / Received number of calls: 1 / 1: "TIP-31288"
● … › TIP is not capable — zero alignment requests      (same shape, "TIP-31288")
● … › PRMS is not capable — zero alignment requests     (same shape, "PRMS-31288")
● … › AICCRA is not capable — zero alignment requests   (same shape, "AICCRA-31288")
Tests: 4 failed, 66 passed, 70 total
```

**AC.0 falsification — the required deliverable, captured verbatim** (guard temporarily made skip-only):

```
● AC.0 — after an eligible fetch populates state, an ineligible code clears it
    expect(received).toBeNull()
    Received: {"eligible": true, "has_contribution": true, … "result_code": "RES-001", …}
```

That is defect class **D-6 reproducing on demand** — the stale STAR payload surviving onto an ineligible result. Clearing restored immediately; re-run 70/70 green. **AC.0 passes on `HEAD` and was correctly never cited as red-before evidence.**

**Reviewer verdict: `STATUS: FAIL` — 1 issue.**

> **Discovered Issue:** the `result.interceptor.ts` change is not a refactor — it widens the URL matcher's acceptance set. Old: `result/(STAR|TIP|PRMS|AICCRA)-(\d+)` plus a separate `result/(\d+)` fallback; `/result/FOO-123` matched neither → `null` → no param. New: `/result\/([A-Za-z]+-\d+|\d+)/` matches `FOO-123` → `platformFromResultCode` → `STAR` → `reportingPlatforms=STAR` appended. **A second, unreported divergence in the same family:** the old alternation was case-sensitive, so `/result/tip-123` → `null`; the util's `.toUpperCase()` made it `TIP` — changing a *known* platform's param from absent to present. Neither delta is covered by any test; `result.interceptor.spec.ts` enumerates `PLATFORM_CODES` and is structurally incapable of exercising an unrecognized or lowercase prefix, so 29/29 green certifies nothing about the changed cases.
> **Violated Rule:** `tasks.md` §2 T-01 — *"result.interceptor.ts (refactor only — consume the shared derivation)"*; `design.md` §2.2 — *"the **alternation-building logic** … moves into the shared util"*; `requirements.md` §5 — *"the existing code→platform derivation to reuse. **Read, not rewritten**"*. `design.md` §14 named this exact leak in advance: *"most likely the interceptor refactor growing"*.

Everything else passed on attempt 1 and carried forward: DD-1 (5 call sites verified, and `GET_PoolFundingAlignment` has exactly one production caller, so no path bypasses the guard), DD-2 (no bare `'STAR'` literal; both enumerations written over `Object.values(PLATFORM_CODES)`), DD-3 (clears before `loadingAlignment` is raised), DD-5 and all boundaries, and the Bug Mode red-before judged genuine.

#### Attempt 2 — Reviewer PASS

**Effort bumped high → xhigh.** Remediation: split `platformFromResultCodeOrNull` (returns `null` for an unrecognized code) from `platformFromResultCode` (the STAR-defaulting wrapper). The interceptor consumes the `OrNull` variant; the guard keeps the wrapper. `.toUpperCase()` removed — derivation is case-sensitive again. Two cases **appended** to `result.interceptor.spec.ts` (`/result/FOO-123`, `/result/tip-123`), leaving the DD-4 safety net untouched.

**Leader-imposed pass condition: an old-vs-new divergence table over 9 URLs, zero divergences.** Result: **0/9**.

> **The table caught a defect nobody else would have.** The Implementer's first draft of `platformFromResultCodeOrNull` skipped STAR in the prefix loop, assuming STAR was only reachable via the bare-numeric fallback. That produced a **new** divergence — `/result/STAR-31288` resolved to `STAR` before and `null` after. It was caught by the mandated comparison before reporting, and fixed. Neither the unit suites nor the interceptor's own enumeration would have surfaced it.

**Reviewer verdict: `STATUS: PASS`.** The equivalence was verified by **deriving it from the code, not by accepting the table**: the original's three outcomes (platform-prefix match → that platform; bare-numeric → STAR; fall-through → `null`) map onto the new function's three branches in the same order of precedence, with nothing unmapped. The Reviewer additionally probed `/result/XSTAR-123` — `startsWith('STAR-')` is `false`, matching the original, where a `.includes()` form would have broken. It confirmed the two new tests are **provably able to fail**: under attempt-1's code both would have produced a `reportingPlatforms` param and reddened.

#### Leader-measured evidence (independent of both workers)

| Measurement | Result |
| --- | --- |
| Full client suite, isolation, no worker active | **6435 passed · 3 failed · 308/309 suites** (91 s) |
| The 3 failures, **stashed to clean `HEAD` and re-run** | `Tests: 3 failed, 41 passed, 44 total` in `to-promise.service.spec.ts`, same `'main'`/`'management'` assertions → **pre-existing, measured not inferred**. Work restored intact |
| Coverage floors (full run) | `All files 98.55 % Stmts · 97.38 % Branch · 98.41 % Funcs · 98.75 % Lines` vs floors 40/20/45/30; **zero** "threshold not met" lines |
| Boundary | 0 paths matching `server/`, `api.service`, `http-error`, `result-sidebar` |
| `npm run build` | exit 0 — the type gate for new app code, since per K-002 neither `ng lint` nor Jest type-checks it |

#### Leader decisions

| # | Decision |
| --- | --- |
| **L-1** | **The FAIL was upheld, not waived.** The Reviewer noted server behaviour is identical today (`results.util.ts:31-34` maps absent / `'STAR'` / unknown all to STAR), so user impact was nil, and offered a recorded waiver. Rejected: it was an unauthorised, untested behaviour change in an interceptor on *every* HTTP request, and the next code shape added to the router would inherit a classification nobody chose |
| **L-2** | **The guard's STAR default was explicitly preserved.** R-PFG-002's scenario is scoped to codes *added to `PLATFORM_CODES`*; defaulting the guard to capable preserves today's behaviour rather than newly suppressing a possibly-legitimate request. Only the interceptor path was reverted |
| **L-3** | **One advisory was folded into the remediation** — the retained AICCRA comment at `result.interceptor.ts:50-54`, whose referents no longer resolved. Justification, recorded because it bends *Advisory Never Becomes A Task*: the comment became false **because of this diff**, and accuracy of what a worker writes is baseline, not added scope. It sat in the exact function the remediation rewrote |
| **L-4** | **An old-vs-new divergence table over a fixed input set was made the pass condition**, rather than accepting "looks equivalent". It found a second, self-inflicted divergence |
| **L-5** | A Leader `git stash` to clean `HEAD` initially failed because of an earlier `git add -N` used only to produce a diff stat. Reverted the intent-to-add, re-stashed, measured, restored; stash list verified back to its 2 pre-existing entries, working tree intact |

#### Advisory findings (recorded; never gate, never become tasks)

| Lens | Finding |
| --- | --- |
| **READABILITY** | **`platform-code.util.ts:3-10`'s header comment still describes the bug that was just fixed.** It reads *"a known **non-STAR** prefix resolves to that platform … **anything else** … returns null"* — under which `STAR-31288` is neither non-STAR nor bare-numeric and would fall to `null`. **That is precisely draft 1's defect, still asserted in prose directly above the loop that fixes it.** The inner comment contradicts it correctly, but this is the sentence a future editor would act on. Fix is deleting one word: *"non-STAR"* |
| **RELIABILITY** | The guard's lowercase behaviour moved between attempts, **toward `HEAD`**: `getAlignment('tip-31288')` was suppressed in attempt 1, and now resolves to STAR → capable → the request fires. Not a regression (it equals `HEAD`), and no clause mentions casing. Recorded because `api.service.ts :: bilateralPath` and `getSciencePrograms` both strip `^STAR-` with `/i`, so the codebase does contemplate lowercase codes. **If case-tolerance is ever wanted in the guard, normalize inside the wrapper — never inside `OrNull`, or the interceptor's acceptance set widens again** |
| **RISK** | One residual structural difference, **checked for reachability rather than left hypothetical**: the original ran two independent unanchored searches; the new one runs a single leftmost match then classifies. They differ only when `result/` occurs twice in one URL with mixed shapes. `app.routes.ts:82` declares `result/:id` with no nesting, and the only `returnUrl` is attached to `/login`, which yields a single occurrence. **Not reachable through any route this app defines** |
| **OUT OF SCOPE** | The full-suite `98.55 % Stmts` against a 40 % floor is a large gap for a repo this size, which usually means `collectCoverageFrom` is scoped narrowly. The gate passed as configured and nothing here depends on it — worth a look sometime outside this spec |
| **RESILIENCE** | R-PFG-001 AC.4's wording asks the guard be *"proven by exercising the alignment page directly"*; no test drives `pool-funding-alignment.component.ts`. `tasks.md` §3 maps AC.4 to DD-1 instead, and the structural premise was verified (single API caller, five call sites, all through `getAlignment`). Covered as the spec chose to cover it; the wording gap is recorded so it is not later mistaken for a tested claim |

---

## Summary

**T-01 PASS. Spec implemented.** 6 files, 237 insertions, 19 deletions.

### Budget reconciliation (design §14)

| Signal | Budgeted | Actual | Note |
| --- | --- | --- | --- |
| Tasks | 1 | **1** | ✅ |
| LOC | ≈ 90 | **237 insertions** | ⚠️ **Exceeded ~2.6×.** Cause: tests. Production code came in at ~51 lines (util 41, guard 10) against ~37 budgeted — on target. Test code is **171 of the 237**, against ~60 budgeted, and grew again in attempt 2 when the remediation added the `OrNull` cases and the two interceptor cases the FAIL required |
| Review rounds | 1 | **2** | ⚠️ Exceeded. Cause: the interceptor refactor widening its acceptance set — the leak `design.md` §14 predicted **by name** |

**Surfaced to the user during the run rather than after**, per the tripwire rule. Not escalated as a blocker: the overage is concentrated in test code on a Lite spec whose production diff landed on budget, and the second round bought a real defect.

### Requirements closure

| Requirement | Status | Evidence |
| --- | --- | --- |
| R-PFG-001 AC.1 (zero requests, TIP) | ✅ | Red-before captured; 4 failures with `Received: 1` and argument `"TIP-31288"` |
| R-PFG-001 AC.2 (STAR unaffected) | ✅ | Bare-numeric still issues exactly one call, argument `'31288'` |
| R-PFG-001 AC.0 (stale-state clear) | ✅ | Passes, **and falsified against a skip-only guard** — the only proof DD-3 does anything |
| R-PFG-001 AC.3 (every non-eligible platform) | ✅ | Enumerated over `Object.values(PLATFORM_CODES)` |
| R-PFG-001 AC.4 (every call site) | ✅ | DD-1 — guard at the service; single API caller verified |
| R-PFG-001 "AND no error displayed" | ⏳ | **Inferred, not measured** — jsdom cannot evaluate rendered output. Covered by the outstanding manual check |
| R-PFG-002 AC.1–AC.3 | ✅ | No bare literal; enumeration; one derivation by construction (DD-4) |
| NFR-PFG-001 (client-only) | ✅ | 0 forbidden paths in the diff |
| NFR-PFG-002 (round trip removed) | ✅ | AC.1 spy |

### Outstanding — must not be silently dropped

1. **Manual browser check — NOT PERFORMED.** jsdom proves *no request* and *empty state*; it cannot prove the user sees no error banner or that the tab is visually absent. Procedure in `tasks.md` T-01. Explicitly permitted to be recorded outstanding — recorded, not omitted.
2. **OQ-1 — `numeric ⟺ STAR` in the data.** Merge-blocking, owned by Engineering. Unverifiable from this worktree (no `.env`, shared remote DB).
3. ~~**The one-word advisory fix** at `platform-code.util.ts:3-10`~~ — **DONE 2026-08-19, post-PASS, at the user's explicit request.** The header now reads *"A known platform prefix resolves to that platform — 'TIP-31288' and equally 'STAR-31288'; STAR is matched by prefix here, not only via the numeric fallback below."* Leader-inline rather than a re-spawn: the task was already closed, the user asked for it directly, and it is a comment. Re-verified after the edit — the three targeted suites 121/121, `npm run lint -- --quiet` clean.
4. **Enabling TIP later needs server work**, not just the array element — `RESULT_CODE` is digits-only and will still reject a prefixed code (design §11).
5. **Not committed.** Changes are in the working tree on `JuankCadavid/AC-1676`.

### Constitution Impact

**None.** No module created, no boundary moved, no public surface changed. `platform-code.util.ts` is a new file inside an existing `shared/utils/` folder that already holds sibling utilities. No child guide needed, no `## Module Guides` index update.
