# Design — client / Pool-Funding Source Gate

- **Module:** client (`client/research-indicators`)
- **Spec id:** 2026-08-pool-funding-source-gate
- **Status:** draft
- **Owner:** Juan Carlos Cadavid
- **Linked requirements:** [./requirements.md](./requirements.md)
- **Linked TRD:** [`docs/trd/trd.md`](../../../trd/trd.md) — frontend architecture
- **Last updated:** 2026-08-19
- **Depth:** Lite · **Mode:** Bug

---

## 1. Goals & non-goals

**Goals**
- Gate the alignment fetch on the result's source, **inside the service**, so all five call sites are covered by one change (R-PFG-001).
- Express eligibility as a **capability set** derived from `PLATFORM_CODES`, so enabling TIP later is one array element (R-PFG-002).
- **Clear alignment state on the ineligible path** — the guard replaces what the failing request was doing.

**Non-goals**
- Any server change (NFR-PFG-001).
- Normalizing the result code further (*Wrong Fix A*), or widening the 404 suppression (*Wrong Fix B*).
- Runtime-configurable eligible sources — decided against: a one-line code edit, per the requester (2026-08-19).
- Changing `shouldHidePoolFundingTab`, which already works.

---

## 2. Architecture

Client-only. One guard at a chokepoint, plus one shared derivation.

```
platform-codes.ts                    PLATFORM_CODES {STAR, TIP, PRMS, AICCRA}
        │
        ├──► platform-code.util.ts   platformFromResultCode(code)   ← NEW, single source of truth
        │           │                POOL_FUNDING_PLATFORMS = [STAR] ← the capability set
        │           │
        │           ├──► bilateral.service.ts :: getAlignment   ← THE GUARD (covers all 5 call sites)
        │           └──► result.interceptor.ts                  ← refactored to consume it
        │
        └──► api.service.ts :: bilateralPath      UNCHANGED (strips ^STAR- only — the reason TIP 404s)
```

### 2.1 Composition

| Path | Change |
| --- | --- |
| `src/app/shared/utils/platform-code.util.ts` | **New.** `platformFromResultCode(code)` + `POOL_FUNDING_PLATFORMS` + `isPoolFundingCapable(code)` |
| `src/app/shared/services/bilateral.service.ts` | The guard in `getAlignment`: ineligible → clear state, return `null`, **issue no request** |
| `src/app/shared/interceptors/result.interceptor.ts` | Refactored to consume the shared derivation instead of building its own regex |
| `…/platform-code.util.spec.ts` · `bilateral.service.spec.ts` | Tests |

### 2.2 Reuse

`PLATFORM_CODES` is the only source of platform identity. The alternation-building logic currently living inline in `result.interceptor.ts:54` moves into the shared util and both consumers call it.

---

## 3. Data model

**No data model changes.** No entity, no migration, no env var, no `app_config` row.

---

## 4. API surface

**No API surface delta.** No new endpoint, no changed contract, no server file in the diff. The *number* of requests to an existing endpoint drops for ineligible results; its shape does not change.

---

## 5. Workflows & business rules

`getAlignment(resultCode)`:

1. Resolve the result's platform from its code via the shared derivation — a known prefix yields that platform; a bare-numeric code yields STAR (the invariant the client already relies on).
2. If that platform is **not** in the capability set:
   a. **Clear the alignment state** — this is the load-bearing half of the guard, not bookkeeping (DD-3, §13).
   b. Return `null` **without touching the network**.
3. Otherwise proceed exactly as today: fetch, set state on success, clear on failure, manage the loading flag in `try/finally`.

**The loading flag on the ineligible path.** It must never be left true. Simplest correct form: do not raise it at all on that path, since there is nothing to wait for.

---

## 6. Frontend / UX component architecture

**No component changes and no new design tokens.** The correct end state is the *absence* of an error and of a tab — both already produced by existing components once alignment state is empty. `result-sidebar.component.ts` and the alignment page are untouched.

---

## 7. Integration impact

None. No external system, no socket event, no cron. One fewer HTTP request per ineligible result view.

---

## 8. Security & authorization

No change. No new surface, no token handling, no role logic. The guard is a client-side courtesy; the server's digits-only route pattern remains the actual enforcement, unchanged.

---

## 9. Observability

No new log lines. The removed request also removes a recurring console/network 404 per non-STAR result view, which is a small diagnostic improvement in its own right.

---

## 10. Testing strategy

Co-located `*.spec.ts`. Jest via `jest.config.ts`.

| Suite | Role |
| --- | --- |
| `bilateral.service.spec.ts` | **Owns the Bug Mode red-before/green-after** — it tests the function whose body changes. Also owns AC.0, the stale-state navigation case |
| `platform-code.util.spec.ts` | Enumerates `PLATFORM_CODES`; proves every non-member is refused (D-2) |
| `result.interceptor.spec.ts` | **Existing** — it already enumerates `PLATFORM_CODES` (`:353-355`). It protects the refactor for free; **it must pass unmodified** |

> **⚠ Verification-command constraint (measured, KZ-010).** A targeted single-file run trips the repo's **global** coverage floors and **exits 1 with every test passing**. Every targeted run in this spec MUST carry `--coverage=false`. Full-suite `npm test` keeps coverage on.

---

## 11. Rollout

No migration, no feature flag, no backout script — revert is a code revert. Client deploy only; merges to `dev` deploy to On-Premise Dev. No comms needed: the user-visible change is an error disappearing.

**Enabling TIP later** (the anticipated next change): add `PLATFORM_CODES.TIP` to `POOL_FUNDING_PLATFORMS`, **and** confirm the server can serve alignment for a TIP result — the digits-only `RESULT_CODE` pattern will still reject a prefixed code, so that change is server-side work, not a client toggle. Recorded so nobody expects the array edit alone to ship the feature.

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| **DD-1** | 2026-08-19 | **The guard lives in `bilateral.service.ts :: getAlignment`, not at the caller** | `getAlignment` has **5 call sites** — `result.component.ts:57` plus four in `pool-funding-alignment.component.ts`. Guarding at the service covers all five with one change; guarding at the caller the proposal named would leave four unguarded, reachable by direct navigation to the alignment page URL |
| **DD-2** | 2026-08-19 | **Eligibility is a capability set (`POOL_FUNDING_PLATFORMS`), never an `=== 'STAR'` check** | The requester expects **TIP to carry pool-funding data in future** (2026-08-19, closes OQ-3). An identity check encodes today's answer as the question. A set makes the anticipated change one array element. Also the shape that defeats **D-2**, whose precedent is recorded verbatim in `result.interceptor.ts:50-53` — a hardcoded subset omitted AICCRA and produced "Result not found" on every service |
| **DD-3** | 2026-08-19 | **The ineligible path CLEARS alignment state; it does not merely skip the fetch** | **From the Step 2.3 reversion challenge — see §13.** The failing request is load-bearing: it is both the bug and the only thing that nulls `currentAlignment`. Skipping alone leaks the previous result's payload into an ineligible result |
| **DD-4** | 2026-08-19 | **Extract the code→platform derivation into a shared util and refactor `result.interceptor.ts` to consume it** | The proposal's R-2 requires reuse, not a second implementation. Extraction **eliminates the drift class by construction** rather than testing for it — strictly better than an agreement test between two implementations. The refactor is protected by `result.interceptor.spec.ts`'s existing `PLATFORM_CODES` enumeration (`:353-355`), which must pass unmodified |
| **DD-5** | 2026-08-19 | **`api.service.ts :: bilateralPath` is left exactly as-is** | It strips `^STAR-` only, which is *why* STAR works and `TIP-31288` 404s. Normalizing further is *Wrong Fix A*: it would make the route match and let the server evaluate eligibility for a TIP result, removing the accidental gate the digits-only pattern currently provides |
| **DD-6** | 2026-08-19 | **No runtime configuration for the eligible set** | Requester's call (2026-08-19). Runtime config would add a fetch, a TTL cache (**K-016**: config behind a TTL is not in effect when saved), and a loading state — turning a Lite bugfix into a Standard feature for a change that is one array element |

---

## 13. Reversion challenge (Step 2.3)

**Trigger:** DD-1/DD-3 remove a request that ships today and has a visible surface, so the Lite skip does not apply. Run **inline** (this session spawns no subagents; specify's delegated roles break no independence constraint when absorbed inline).

**Question: what does removing this request break?**

| Candidate | Verdict |
| --- | --- |
| **Stale alignment state leaks into an ineligible result** | ⚠️ **REAL — and it is the whole reason DD-3 exists.** `BilateralService` is `providedIn: 'root'`; `currentAlignment` is written in exactly three places (`set(null)` on failed fetch, `set(res.data)` on fetch and on patch success) and **has no reset on navigation**. Sequence: open STAR-123 → state holds `{eligible: true}` → navigate to TIP-456 → guard skips → state unchanged → `shouldHidePoolFundingTab` returns `false` → **the tab appears on a TIP result**. `editable` (`:88`) computes from the same signal. This converts a visible error into a silent wrong state — worse than the bug. **Design fixed before reaching `tasks.md`:** the guard clears state, and AC.0 tests exactly this navigation |
| The tab stops hiding for eligible-but-ineligible STAR results | No. That path still fetches and still receives `eligible: false` |
| The loading flag sticks true | Only if the guard raises it before returning. §5 forbids raising it on the ineligible path |
| Genuine 404s on that path stop surfacing | No. The 400/404 suppression logic is untouched; only the request for ineligible sources disappears |
| Server behavior changes | No. NFR-PFG-001; the route is untouched |

**Cost of not running the challenge:** the naive guard passes AC.1 (no request), passes AC.2 (STAR unaffected), ships — and produces a pool-funding tab on TIP results that nobody sees until a user reports it.

---

## 14. Budget (Step 2.4)

| Signal | Estimate |
| --- | --- |
| **Tasks** | **1** |
| **LOC** | **≈ 90** (util ≈ 20 · guard ≈ 12 · interceptor refactor ≈ −10/+5 · tests ≈ 60) |
| **Review rounds** | **1** |

**Lite is correct and your "easy" read holds** — the production change is a guard and a small util. The care is concentrated in one place: the ineligible path must *clear* state, not just skip. That is the difference between fixing the bug and replacing it with a quieter one.

Not `/akili-quick`: the diff is small, but a client-visible behavior change with a mandatory red-before/green-after is exactly what quick escalates on.

`/akili-execute` trips on this budget. A second task, a second review round, or a diff materially past ~90 LOC means something leaked in — most likely the interceptor refactor growing, or *Wrong Fix A* creeping back.

---

## 15. Open questions

- **OQ-1** — is `numeric ⟺ STAR` true in the data? Owner: Engineering. **Blocking for merge, not for implementation** — the design is identical either way; only confidence in D-5 moves.
- ~~OQ-2~~, ~~OQ-3~~ — closed (see `requirements.md` §8).
