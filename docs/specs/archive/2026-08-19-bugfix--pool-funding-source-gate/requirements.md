# Requirements — client / Pool-Funding Source Gate

- **Module:** client (`client/research-indicators`) · spec module `bugfix/`
- **Spec id:** 2026-08-pool-funding-source-gate
- **Status:** draft
- **Owner:** Juan Carlos Cadavid
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — STAR result view
- **Linked tickets:** —
- **Last updated:** 2026-08-19
- **Depth:** **Lite** · **Mode:** **Bug**
- **Depends on:** none. Independent of `archive/2026-08-19-bugfix--w3-bilateral-funding-filter` (server-only)

---

## 1. Context

Opening any non-STAR result shows the user an error naming an endpoint they never asked for:

```
Cannot GET /api/v1/results/TIP-31288/pool-funding-alignment
```

The client requests pool-funding alignment for **every** result regardless of source. For a prefixed code no server route matches, so Express emits its own 404 — outside the `ServerResponseDto` envelope — and the error interceptor does not suppress it, because its suppression is scoped to `400`.

**The feature itself is not broken.** `shouldHidePoolFundingTab` already hides the tab when alignment is absent. The error is pure noise from a request that should never have been issued.

**Not changing:** the server (no route, controller, or `RESULT_CODE` change), `shouldHidePoolFundingTab`, the `400` suppression in `http-error.interceptor.ts`, and alignment eligibility logic itself.

---

## 2. Functional requirements

### R-PFG-001 — Alignment is requested only for sources that can support it

- **As a** user opening a TIP / PRMS / AICCRA result
- **I want** the page to render without an error about a feature that does not apply to my result
- **So that** an inapplicable feature stays invisible instead of looking broken

**Details:**
- Inputs: the result code as the client already holds it (`TIP-31288`, `31288`, or `STAR-31288`).
- Behavior: before issuing the alignment request, resolve the result's **source platform** from its code and issue the request **only** when that platform is alignment-capable. When it is not, make no request and leave alignment state empty — which the existing tab-hide logic already reads correctly.
- Outputs: unchanged `MainResponse<AlignmentResponse>` envelope on the eligible path. On the ineligible path there is no response, because there is no request.
- Errors: none introduced. The ineligible path is not an error state — it is a non-event.

#### Scenario: A TIP result renders clean

- GIVEN a result whose code carries a non-alignment-capable platform prefix (`TIP-31288`, `PRMS-…`, `AICCRA-…`)
- WHEN the result view loads
- THEN **no** pool-funding alignment request is issued
- AND no error is displayed
- AND the pool-funding tab remains hidden
- **BUT it must NOT** merely suppress or hide the error while still issuing the request — the requirement is the absent request, not the absent message
- **AND IT MUST** apply on **every** path that can trigger the request, including direct navigation to the alignment page URL, not only the result-view load

#### Scenario: A STAR result is unaffected

- GIVEN a result whose code is bare-numeric (`31288`) or `STAR-`-prefixed
- WHEN the result view loads
- THEN the alignment request **is** issued exactly as today
- AND the tab still appears when the result is eligible
- **BUT it must NOT** change the request URL, the response handling, or the loading-state discipline for this path
- **AND IT MUST** fail loudly if the guard is widened to cover this case — a guard that suppresses everything satisfies the first scenario and silently kills the feature

#### Scenario: Navigating from an eligible result to an ineligible one

- GIVEN a STAR result has been opened and its alignment is held in client state
- WHEN the user navigates to a `TIP-`-prefixed result **in the same session**
- THEN the pool-funding tab is hidden on the TIP result
- AND the alignment state no longer holds the previous result's payload
- **BUT it must NOT** simply skip the request and leave prior state in place — the alignment state is a **root-scoped singleton with no reset path**, so skipping alone leaves the previous result's payload live and the tab **appears on a result that cannot support it**
- **AND IT MUST** treat clearing the state as part of the guard, not as a side effect of a failed request. Today the 404 is doing that clearing; removing the request removes the clear

> **Why this scenario exists.** `BilateralService` is `providedIn: 'root'` and `currentAlignment` is written in exactly three places — `set(null)` on a failed fetch, and `set(res.data)` on fetch or patch success. **There is no reset on navigation.** The failing request is therefore load-bearing: it is simultaneously the bug and the thing that clears stale state. A guard that only skips the call converts a visible error into a wrong tab — and `editable` computes from the same signal. Found by the Step 2.3 reversion challenge before any code was written.

**Acceptance criteria:**
- [ ] AC.1 — Opening a `TIP-`-prefixed result issues **zero** calls to the alignment endpoint. **Red before the fix, green after.**
- [ ] AC.0 — After an eligible result populates alignment state, opening an ineligible result leaves that state empty and the tab hidden. **This test fails against a guard that only skips the request.**
- [ ] AC.2 — Opening a bare-numeric result still issues exactly one call, unchanged. Green **both** before and after.
- [ ] AC.3 — AC.1 holds for **every** non-eligible platform in `PLATFORM_CODES`, not only `TIP` — asserted by enumerating the constant, never by listing codes literally.
- [ ] AC.4 — The guard holds at **every** call site of the alignment fetch, proven by exercising the alignment page directly and not only the result view.

---

### R-PFG-002 — The eligible-source set is data, not a hardcoded identity check

- **As** the team that expects **TIP results to carry pool-funding information in the future** (requester, 2026-08-19)
- **I want** enabling a second source to be a one-line data edit
- **So that** the near-certain next change is not a re-derivation of this logic

**Details:**
- Behavior: alignment capability is expressed as an **explicit set of platform codes**, derived from `PLATFORM_CODES`. Today that set contains STAR alone. Adding TIP later means adding one member — no new conditional, no second parser, no edit at the call site.
- **The check must not be spelled as "is this STAR".** An identity comparison encodes today's answer as the question, and the next change has to unpick it.

#### Scenario: A fifth platform appears

- GIVEN a new code is added to `PLATFORM_CODES`
- WHEN the alignment guard evaluates a result of that platform
- THEN it is treated as **not** alignment-capable, with no edit to the guard
- **BUT it must NOT** require touching the guard, the service, or the call sites to stay correct — only the capability set may need an edit, and only to *grant* capability
- **AND IT MUST** reuse the existing code→platform derivation rather than introducing a second one that can drift from `result.interceptor.ts`

**Acceptance criteria:**
- [ ] AC.1 — The capability set names its members via `PLATFORM_CODES`, with no bare `'STAR'` string literal in the guard.
- [ ] AC.2 — A test enumerates `PLATFORM_CODES` and asserts every non-member is refused, so adding a platform without granting it capability cannot silently pass.
- [ ] AC.3 — The platform derived from a result code agrees with `result.interceptor.ts`'s derivation for every code in `PLATFORM_CODES`, proven by a test that fails if the two drift.

---

## 3. Non-functional requirements

### NFR-PFG-001 — Client-only, zero server change

- **Category:** compliance / blast radius
- **Target:** no file under `server/researchindicators/` in the diff. `RESULT_CODE` and the route pattern are untouched.
- **Why:** the digits-only route pattern is what makes the endpoint STAR-only today, correctly, by construction. Widening it would make alignment reachable for sources that do not support it — the opposite of this requirement.
- **How verified:** `git diff --name-only` contains no `server/` path.

### NFR-PFG-002 — One futile round trip per non-STAR result is removed

- **Category:** performance
- **Target:** requests to the alignment endpoint for non-eligible results drop from one-per-view to **zero**.
- **How verified:** the AC.1 spy assertion. Not separately load-tested — the magnitude is one request, and the reason to fix it is correctness, not throughput.

---

## 4. Defect classes and their gates

| # | Defect class | Gate | Input that makes it FAIL |
| --- | --- | --- | --- |
| **D-1** | **Over-suppression** — the guard is too broad and STAR silently loses the feature. *The dangerous one: it converts a visible bug into an invisible one* | AC.2's bare-numeric test | A guard that returns `false` unconditionally → the STAR test reds |
| **D-2** | **Under-suppression** — a platform is missed because the check was written as a literal list | AC.3's enumeration over `PLATFORM_CODES` | Hardcode `code.startsWith('TIP')` → `PRMS`/`AICCRA` red. *This is the exact shape of the AICCRA bug recorded in `result.interceptor.ts:50-53`* |
| **D-3** | **Drift** — a second code→platform derivation diverges from `result.interceptor.ts` | R-PFG-002 AC.3's agreement test | Change one derivation's regex and not the other → the agreement test reds |
| **D-4** | **The gate lies about its own result** — see below | `--coverage=false` on every targeted run | *(measured, not hypothesized)* |
| **D-6** | **Stale-state leak** — the guard skips the request but leaves the previous result's alignment live, so the tab shows on an ineligible result. *Strictly worse than the bug being fixed: silent instead of visible* | AC.0's navigation test | A guard that only early-returns without clearing state → AC.0 reds |
| **D-5** | **The `numeric ⟺ STAR` invariant is false in the data** | ⚠️ **No automated gate.** Requires a query over result codes by platform against a shared remote DB | *(see below)* |

**D-4 is measured, not predicted.** Pre-flighted this session per **KZ-010**, before any fix exists:

```
npx jest src/app/shared/services/bilateral.service.spec.ts --silent                   → exit 1   (63/63 tests PASS)
npx jest src/app/shared/services/bilateral.service.spec.ts --silent --coverage=false  → exit 0
```

A targeted single-file run trips the repo's **global** coverage floors (branches 20 / lines 45 / functions 30) and **exits non-zero with every test passing**. An agent reading the exit code would report a healthy suite as red — and under Bug Mode's red-before/green-after protocol, "green after" becomes unreachable. **Every targeted verification in this spec MUST carry `--coverage=false`.** The full-suite `npm test` keeps coverage on, where the floors are meaningful.

**D-5 is an acknowledged blind spot, substituted not ignored.** `numeric ⟺ STAR` is asserted by the client in at least two places and depended on by the server route, but **nothing validates it**. It cannot be checked from this worktree: no `.env`, and the Dev database is remote and shared. Substitute: a **data check by the requester or engineering** before merge (`OQ-1`). Bounded honestly — if the invariant fails, the failure mode is a non-STAR result with a bare-numeric code passing the gate, i.e. exactly today's behavior for that result, not a regression.

> **`npm run lint` is not a gate here (K-001)** — use `npm run lint -- --quiet` (`ng lint`, no `--fix`).

---

## 5. Cross-system impact

| Surface | Impact |
| --- | --- |
| `bilateral.service.ts :: getAlignment` | **The guard's home.** It has **5 call sites** — `result.component.ts:57` plus **four** in `pool-funding-alignment.component.ts` (419, 456, 804, 816). Guarding here covers all five in one change; guarding at the caller would leave four unguarded. *(The proposal named only the first.)* |
| `platform-codes.ts` | Source of the capability set. `PLATFORM_CODES = {STAR, TIP, PRMS, AICCRA}` |
| `result.interceptor.ts` | The existing code→platform derivation to reuse (`:50-70`). Read, not rewritten |
| `api.service.ts :: bilateralPath` | **Unchanged.** It already strips `^STAR-` only — which is precisely why STAR works and `TIP-31288` 404s. Normalizing further is *Wrong Fix A* |
| `result-sidebar.component.ts` | **Unchanged.** Already hides the tab on absent alignment |
| `http-error.interceptor.ts` | **Unchanged.** Extending its suppression to 404 is *Wrong Fix B* |
| **Server** | **None** — NFR-PFG-001 |

**No data model change. No API surface delta. No migration. No new env var.**

### Two fixes that are wrong, named so nobody re-derives them

| Tempting fix | Why it is wrong |
| --- | --- |
| **A — normalize the code to numeric** | One line, makes the error vanish, and is the *opposite* of the requirement: the route would then match, so the server would evaluate eligibility **for a TIP result**. It replaces a visible bug with a silent behavior change and removes the accidental gate the digits-only pattern is currently providing |
| **B — extend the interceptor's suppression to 404** | Hides the symptom, still fires a futile request per non-STAR result, and would mask genuine 404s on that path |

**Both pass the naive test "the error is gone."** That is why AC.1 asserts the **absence of the request**, never the absence of the message.

---

## 6. Assumptions, dependencies, risks

| # | Item | Note |
| --- | --- | --- |
| A-1 | **TIP is expected to carry pool-funding information in future** (requester, 2026-08-19) | This is why R-PFG-002 exists. It closes `OQ-3` — "STAR only" is **not** permanent, so the guard is built as a capability set from day one |
| R-1 | Over-suppression | D-1; the bare-numeric scenario is the guard against it |
| R-2 | A second derivation drifting | D-3; agreement test |
| R-3 | The invariant fails in data | D-5; OQ-1, no automated gate, substituted by a data check |

---

## 7. Requirement ID index

| ID | Title | Covered by |
| --- | --- | --- |
| R-PFG-001 | Alignment requested only for capable sources (incl. AC.0 stale-state clear) | T-01 |
| R-PFG-002 | Eligible-source set is data, not an identity check | T-01 |
| NFR-PFG-001 | Client-only, zero server change | T-01 (boundary gate) |
| NFR-PFG-002 | Futile round trip removed | T-01 (AC.1 spy) |

---

## 8. Open questions

| # | Question | Owner | Blocking |
| --- | --- | --- | --- |
| **OQ-1** | **Is `numeric ⟺ STAR` true in the data**, not just in the client's code? | Engineering | **Yes for merge**, no for specify — the design is unchanged either way; only confidence in D-5 moves |
| ~~OQ-2~~ | ~~Do other `RESULT_CODE` routes share this?~~ **CLOSED in the proposal** — ~40 routes across ~15 controllers all work, because their callers pass the numeric id. `GET_PoolFundingAlignment` is the only string-typed outlier | Leader | Closed |
| ~~OQ-3~~ | ~~Is "STAR only" permanent?~~ **ANSWERED 2026-08-19 by the requester — no.** TIP is expected to support pool funding later. Now recorded as A-1 and built into R-PFG-002 | Product | Closed |

---

## 9. Sign-off

- [ ] Engineering lead — <name> (OQ-1 data check)
- [ ] MEL / product owner — <name>
- [ ] Security review — n/a (no auth/secrets touched)
- [ ] DevOps — n/a (no infra touched)
