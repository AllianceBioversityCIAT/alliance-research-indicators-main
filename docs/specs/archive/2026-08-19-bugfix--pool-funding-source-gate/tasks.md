# Tasks — client / Pool-Funding Source Gate

- **Module:** client (`client/research-indicators`)
- **Spec id:** 2026-08-pool-funding-source-gate
- **Status:** completed
- **Owner:** Juan Carlos Cadavid
- **Linked requirements:** [./requirements.md](./requirements.md)
- **Linked design:** [./design.md](./design.md)
- **Last updated:** 2026-08-19
- **Budget (design §14):** 1 task · ≈ 90 LOC · 1 review round

---

## 1. Dependency graph

Single task. No graph.

---

## 2. Task list

### T-01 — Gate the alignment fetch on the result's source, and clear state on the ineligible path

- **Requirements covered:** R-PFG-001 (AC.0–AC.4, all three scenarios and every `BUT`/`AND IT MUST` clause); R-PFG-002 (AC.1–AC.3, its scenario and clauses); NFR-PFG-001; NFR-PFG-002
- **Design references:** §2.1, §5, DD-1 … DD-6, §13
- **Files touched (intended):**
  - `src/app/shared/utils/platform-code.util.ts` *(new)*
  - `src/app/shared/utils/platform-code.util.spec.ts` *(new)*
  - `src/app/shared/services/bilateral.service.ts`
  - `src/app/shared/services/bilateral.service.spec.ts`
  - `src/app/shared/interceptors/result.interceptor.ts` *(refactor only — consume the shared derivation)*
- **Skills:** `angular-developer`, `systematic-debugging`, `tdd`
- **Effort:** M
- **Status:** done

**Description.** Add a shared code→platform derivation plus a `POOL_FUNDING_PLATFORMS` capability set, both built from `PLATFORM_CODES`. Guard `getAlignment` on it: when the result's platform is not capable, **clear the alignment state and return without touching the network**. Refactor `result.interceptor.ts` to consume the same derivation so no second implementation exists.

**Implementation notes.**
- **DD-1 — the guard goes in `bilateral.service.ts :: getAlignment`, not at any caller.** There are **5 call sites**: `result.component.ts:57` and four in `pool-funding-alignment.component.ts` (419, 456, 804, 816). The last four are reachable by direct navigation to the alignment page URL.
- **DD-2 — no `'STAR'` string literal in the guard.** Eligibility is membership in `POOL_FUNDING_PLATFORMS`, whose members are named via `PLATFORM_CODES`. Today: STAR alone.
- **DD-3 — clear the state; do not merely skip.** `currentAlignment` is a root-scoped singleton with **no reset on navigation**, and today the *failing request* is what nulls it. A guard that only early-returns leaks the previous result's payload onto an ineligible result and shows the tab there.
- **Do not raise `loadingAlignment` on the ineligible path** — there is nothing to await, and a flag raised before an early return sticks true.
- **DD-4 — refactor `result.interceptor.ts` to consume the shared util.** Its own spec (`result.interceptor.spec.ts:353-355`) already enumerates `PLATFORM_CODES`; **it must pass unmodified.** That existing test is the refactor's safety net — if you find yourself editing it, stop and report.
- **DD-5 — `api.service.ts :: bilateralPath` is NOT touched.** It strips `^STAR-` only, which is exactly why STAR works and `TIP-31288` 404s.
- 🚫 **No-touch:** anything under `server/`; `result-sidebar.component.ts`; `http-error.interceptor.ts`; `api.service.ts`.

**Named inputs, before the tests are written (K-012).** Note which are red-before and which are green-both — conflating them is how a guard-only-skips bug survives.

| Input | Before fix | After fix | Role |
| --- | --- | --- | --- |
| Open a `TIP-31288` result; count alignment requests | **1 — must be observed RED** | **0** | The Bug Mode repro |
| Every non-STAR code in `PLATFORM_CODES`, same count | **≥1 — must be observed RED** | **0** | D-2, enumerated not listed |
| Open a bare-numeric result; count requests | 1 | **1 — must stay** | D-1, the over-suppression guard |
| Populate state from a STAR result, then open a TIP result; assert state empty + tab hidden | **PASSES today** (the 404 nulls it) | **PASSES** | **AC.0 — green both ways.** It is *not* red-before evidence; it is the D-6 guard. It fails against a guard that only skips |

**Verification.**
```
cd client/research-indicators
npx jest src/app/shared/utils/platform-code.util.spec.ts --silent --coverage=false
npx jest src/app/shared/services/bilateral.service.spec.ts --silent --coverage=false
npx jest src/app/shared/interceptors/result.interceptor.spec.ts --silent --coverage=false
npm test -- --silent                 # full suite, coverage ON — floors are meaningful here
npm run lint -- --quiet
git diff --name-only | grep '^server/' && echo "NFR-PFG-001 VIOLATED" || echo "client-only OK"
```
Run the `bilateral.service.spec.ts` command **twice**: once with the new tests applied and the service body untouched (expect **RED** on the two rows above, captured verbatim), then again after the guard lands (expect **GREEN**).

**⚠ `--coverage=false` is mandatory on every targeted run — measured, not assumed (KZ-010).**
```
npx jest …/bilateral.service.spec.ts --silent                   → exit 1  (63/63 tests PASS)
npx jest …/bilateral.service.spec.ts --silent --coverage=false  → exit 0
```
A single-file run trips the repo's **global** coverage floors and exits non-zero with everything green. **An exit code from a run without that flag is not a signal.**

**What would make these checks FAIL:**
- A guard that returns early for everything → the bare-numeric row reds.
- A guard written as `code.startsWith('TIP')` → `PRMS` and `AICCRA` red in the enumeration. *(This is the AICCRA bug recorded verbatim at `result.interceptor.ts:50-53`.)*
- A guard that skips the request but leaves state → **AC.0 reds.**
- Editing `result.interceptor.ts`'s derivation without the shared util → its existing `PLATFORM_CODES` enumeration reds.
- Any `server/` path in the diff → the last gate prints `NFR-PFG-001 VIOLATED`.

**What disqualifies this evidence.**
- **An exit code from a targeted run without `--coverage=false`.** Measured above: green tests, exit 1. Read the test summary, not the exit status, if the flag was omitted — or better, re-run with it.
- **Asserting "no error is displayed" instead of "no request is issued."** Both *Wrong Fix A* (normalize the code) and *Wrong Fix B* (suppress 404) make the error vanish while leaving the defect. **AC.1 must assert the request count, via a spy on the API method — never the absence of a toast.**
- **Citing AC.0 as red-before evidence.** It passes on `HEAD`. Reporting it as the Bug Mode repro would close Bug Mode without producing the artifact Bug Mode exists for.
- A full-suite run performed while another full-suite run is active (root `CLAUDE.md` §4.3). Re-run in isolation before reporting an unrelated failure.
- `npm run lint` without `--quiet` is `ng lint`; use the quiet form as the gate (K-001 family).

**What this evidence cannot prove.** The suite runs in **jsdom**. It proves *no request is issued* and *state is empty*; it does **not** prove that the user sees no error banner, nor that the tab is visually absent — those are rendered outcomes jsdom cannot evaluate. The inference (no request → no 404 → no error) is sound but is an inference. **Substitute: a manual check** — open a `TIP-`-prefixed result in the running app, confirm no error appears and no `pool-funding-alignment` request is in the Network tab, then navigate from a STAR result to a TIP result in the same session and confirm the tab does not appear. Record it as performed or explicitly as outstanding.

**Done check.**
- [x] The TIP request-count input was observed **RED on `HEAD`** — 4 failures, `Received: 1`, argument `"TIP-31288"`
- [x] Same input green after the guard
- [x] Bare-numeric result still issues exactly one request, unchanged URL
- [x] The non-eligible enumeration is written over `Object.values(PLATFORM_CODES)`, no literal in the guard
- [x] **AC.0 passes, and was confirmed to FAIL against a skip-only guard** — the skip-only variant returned the stale `RES-001` payload where `null` was expected
- [x] `result.interceptor.spec.ts`'s original 29 cases pass **unmodified** (pure append of 2 → 31/31)
- [x] `loadingAlignment` is never raised on the ineligible path (guard returns before `set(true)`)
- [x] Full suite in isolation: 6435 passed / 3 failed (pre-existing, measured on clean `HEAD`); coverage 98.55/97.38/98.41/98.75 vs floors 40/20/45/30; lint clean; `npm run build` exit 0
- [x] `git diff --name-only` contains no `server/` path, no `api.service.ts`, no `http-error.interceptor.ts`, no `result-sidebar.component.ts`
- [x] The manual check is **explicitly recorded as NOT YET PERFORMED** (execution.md → Outstanding #1)

---

## 3. Coverage closure

Clause-level. Each row quotes the clause it claims.

| Requirement | Clause | Owner |
| --- | --- | --- |
| R-PFG-001 | THEN no request for a non-capable prefix | T-01 (AC.1 spy) |
| R-PFG-001 | AND no error displayed | T-01 (inferred; **manual check** — jsdom gap) |
| R-PFG-001 | AND the tab remains hidden | T-01 (AC.0 + manual) |
| R-PFG-001 | **BUT NOT** suppress the error while still requesting | T-01 (assertion is on request count, not on absence of a toast) |
| R-PFG-001 | **AND IT MUST** apply on every triggering path incl. direct navigation | T-01 (DD-1 — guard at the service, all 5 call sites) |
| R-PFG-001 | THEN a bare-numeric result still fetches; AND the tab still appears when eligible | T-01 (AC.2) |
| R-PFG-001 | **BUT NOT** change URL, response handling, or loading discipline for STAR | T-01 (unchanged-URL assertion + `loadingAlignment` check) |
| R-PFG-001 | **AND IT MUST** fail loudly if the guard is widened | T-01 (AC.2 reds against a blanket guard) |
| R-PFG-001 | THEN tab hidden after eligible→ineligible navigation; AND state no longer holds prior payload | T-01 (**AC.0**) |
| R-PFG-001 | **BUT NOT** skip and leave prior state in place | T-01 (AC.0 confirmed to fail against a skip-only guard) |
| R-PFG-001 | **AND IT MUST** treat clearing as part of the guard | T-01 (DD-3) |
| R-PFG-002 | THEN a new platform is not capable with no guard edit | T-01 (AC.2 enumeration) |
| R-PFG-002 | **BUT NOT** require touching guard/service/call sites | T-01 (capability set is the only edit point) |
| R-PFG-002 | **AND IT MUST** reuse the existing derivation | T-01 (**DD-4** — extraction removes the second implementation entirely) |
| R-PFG-002 | AC.1 no bare `'STAR'` literal · AC.3 no drift | T-01 |
| NFR-PFG-001 | Client-only | T-01 (`git diff` gate) |
| NFR-PFG-002 | Futile round trip removed | T-01 (AC.1 spy) |

---

## 4. Estimated LOC & PR strategy

| Item | LOC |
| --- | --- |
| `platform-code.util.ts` | ~20 |
| `bilateral.service.ts` guard | ~12 |
| `result.interceptor.ts` refactor | −10 / +5 |
| Tests (util + service) | ~60 |
| **Total** | **≈ 90** |

**Single PR.** Far below the ~400 LOC split threshold. Title: `fix(bilateral.service): skip pool-funding alignment for sources that cannot support it`.

**For the reviewer:** read `bilateral.service.ts :: getAlignment` first — the guard is the whole change, and the half worth scrutinising is that the ineligible path **clears state** rather than only returning early. Out of scope by design: the server, `api.service.ts`, and the 404 suppression.

---

## 5. Risks & blockers log

| # | Date | Risk / Blocker | Mitigation | Status |
| --- | --- | --- | --- | --- |
| RB-1 | 2026-08-19 | **Stale-state leak** — a skip-only guard shows the tab on an ineligible result | DD-3 + AC.0 | **closed** — AC.0 falsified against a skip-only guard, red observed |
| RB-2 | 2026-08-19 | Targeted jest runs exit 1 with all tests passing | `--coverage=false` mandated | **closed** — held throughout both attempts |
| RB-3 | 2026-08-19 | OQ-1 (`numeric ⟺ STAR` in data) unverifiable offline — no `.env`, shared remote DB | Data check by engineering before merge; failure mode bounded (equals today's behavior for such a result) | open |
| RB-4 | 2026-08-19 | *Wrong Fix A* creeping back | DD-5 + no-touch on `api.service.ts` | **closed** — `api.service.ts` absent from the diff |
| RB-5 | 2026-08-19 | **The DD-4 interceptor refactor widened its URL matcher's acceptance set** (`FOO-123` null→STAR; `tip-123` null→TIP), untested. Predicted by name in `design.md` §14 | Reverted in attempt 2 via `platformFromResultCodeOrNull`; pass condition was a 9-URL old-vs-new table at zero divergences | **closed** |
| RB-6 | 2026-08-19 | `platform-code.util.ts:3-10`'s header still describes draft 1's defect ("non-STAR prefix"), the sentence a future editor would act on | Header rewritten to name "STAR-31288" explicitly | **closed** — user-requested, post-PASS, re-verified 121/121 + lint |

---

## 6. Done definition

- [x] T-01 `done`
- [x] All R-PFG-001 and R-PFG-002 ACs checked (the "no error displayed" clause is inferred, not measured — jsdom gap, rides on the manual check)
- [x] Red-before evidence captured; AC.0's skip-only falsification demonstrated
- [x] Full client suite measured in isolation; coverage floors met with margin
- [x] Manual check explicitly recorded as **outstanding**
- [ ] OQ-1 resolved or explicitly accepted before merge — **still open, merge-blocking**
- [x] The `enabling TIP later` note carried forward into `execution.md` Outstanding #4
