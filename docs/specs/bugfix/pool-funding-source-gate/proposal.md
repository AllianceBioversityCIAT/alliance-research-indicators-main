# Proposal — Pool-funding alignment is requested for every source, and 404s visibly on non-STAR results

> **Headline:** The sidebar tab already hides itself correctly. The defect is that the client **asks the server for alignment on every result regardless of source**, and for a non-STAR result that request 404s with Express's bare `Cannot GET` — which the error interceptor does not suppress, because it only suppresses `400` on that path. The user sees an error for a feature that was never applicable.
>
> **The fix is a guard on a request that should never be made, not a change to the feature.** The invariant that makes it safe is already encoded in the codebase: a bare-numeric result code *is* STAR; every other source carries a `PLATFORM-` prefix.
>
> **Do not hardcode `'STAR'`.** The same file that establishes this invariant carries a comment recording the last bug caused by hardcoding a platform subset — it omitted AICCRA and produced *"Result not found"* on every service.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bugfix/pool-funding-source-gate/` |
| **Slug** | `pool-funding-source-gate` — **derived from free-text intent** (*"para el pool funding alignment solo debemos usar los de STAR"*), not a supplied path |
| **Type** | **Bug** — a symptom (a visible error on a supported screen), with a confirmed root cause |
| **Approval Mode** | `gated` |
| **Module** | `bugfix/` · client (`client/research-indicators`) |
| **Depends on** | none. **Independent of** `bugfix/w3-bilateral-funding-filter` — different surface, different cause |
| **Parallel-safe** | **yes** — client-only; the W3 fix is server-only |
| **Date** | 2026-08-19 |
| **Requested by** | Juan Carlos Cadavid |

---

## 2. Intent

Stop offering — and stop asking about — pool-funding alignment for results whose source cannot support it, so non-STAR results render without a spurious error.

---

## 3. Bug Diagnosis

### Observed Symptom

Opening a non-STAR result surfaces a user-visible error:

```
Cannot GET /api/v1/results/TIP-31288/pool-funding-alignment
```

Note the shape: that is **Express's default 404 body**, not the `ServerResponseDto` envelope every other ARI error uses. That difference is the clue — no route matched at all, so nothing in the Nest pipeline ever ran.

### Reproduction Steps

1. Open any result whose code carries a platform prefix — `TIP-31288`, `PRMS-…`, `AICCRA-…`.
2. **Expected:** the result renders; pool-funding alignment is simply not offered.
3. **Actual:** the page renders, the tab is correctly absent, **and an error is displayed** naming an endpoint the user never asked for.

### Root Cause (confirmed — three links, each verified in code)

**1. The client asks unconditionally.** `bilateral.service.ts:150`:

```ts
async getAlignment(resultCode: string): Promise<AlignmentResponse | null> {
  const res = await this.api.GET_PoolFundingAlignment(resultCode);   // no platform guard
  if (!res?.successfulRequest) { this.currentAlignment.set(null); return null; }
  ...
}
```

There is no source check anywhere on this path.

**2. The server route cannot match a prefixed code.** `results.util.ts:157` and `main.routes.ts:82`:

```ts
export const RESULT_CODE = ':resultCode(\\d+)';        // digits ONLY
path: `${RESULT_CODE}/pool-funding-alignment`
```

`TIP-31288` contains letters and a hyphen, so **no route matches** → Express emits its own `Cannot GET` 404, bypassing `GlobalExceptions` and the response envelope entirely.

**3. And it sends the *prefixed display code*, unlike every sibling endpoint.** This is why the failure is specific to non-STAR results rather than universal. `result.component.ts:54`:

```ts
const alignmentCode = (typeof idParam === 'string' && idParam.length > 0)
  ? idParam                       // ← "TIP-31288", the prefixed display code
  : (id > 0 ? String(id) : null);
void this.bilateralService.getAlignment(alignmentCode);
```

It deliberately prefers the raw route param over the parsed numeric `id` that the very next line above it already computed. The contract asymmetry is visible in `api.service.ts`:

| Endpoint | Client contract |
| --- | --- |
| `GET_GeneralInformation` | `(id: **number**)` |
| ~40 other result-scoped endpoints | numeric |
| **`GET_PoolFundingAlignment`** | **`(resultCode: **string**)`** |

`RESULT_CODE` (digits-only) is used by **~40 route definitions across ~15 controllers** — and they all work for TIP results, because their callers pass the numeric part. **`pool-funding-alignment` is the only one fed the prefixed string.** That single inconsistency is the whole mechanism.

**4. The error interceptor suppresses the wrong status.** `http-error.interceptor.ts:63-64`:

```ts
const isPoolFundingAlignmentValidationError =
  error.status === 400 && req.url.includes('/pool-funding-alignment');
```

Suppression is scoped to **400**. This is a **404**, so it falls through and is shown to the user.

**What is NOT broken.** `result-sidebar.component.ts:82` already hides the tab correctly — `shouldHidePoolFundingTab` returns `true` when `!alignment`, and the failed request sets `currentAlignment` to `null`. So the feature gates itself properly; the error is pure noise from a request that should never have been issued.

### The invariant that makes the fix safe

`result.interceptor.ts:46-70` already establishes the mapping between code shape and source:

```ts
const platformRegex = new RegExp(`result/(${platformAlternation})-(\\d+)`);  // STAR|TIP|PRMS|AICCRA
if (platformMatch) return platformMatch[1];

const resultRegex = /result\/(\d+)/;
if (resultMatch) return PLATFORM_CODES.STAR;      // a bare numeric code IS STAR
```

So **`numeric code` ⟺ `STAR`** is not an assumption this proposal introduces — the client already relies on it. Which means the server's digits-only route pattern **already restricts pool-funding alignment to STAR results, correctly, by construction.** The backend needs no change; the client simply does not know the rule it is already subject to.

### Impact & Scope

| Aspect | Assessment |
| --- | --- |
| **User-visible** | An error on **every** non-STAR result view. Erodes trust in unrelated screens |
| **Data** | **None.** No write path; the request fails before any handler runs |
| **Wasted requests** | One futile round trip per non-STAR result opened |
| **Surface** | Client only — `bilateral.service.ts`, plus its callers. **No server change** |
| **Severity** | Low impact, high visibility, trivial fix — the combination that makes it worth doing now |

### Fix Strategy

**Route: `/akili-specify` (Lite) in Bug Mode.** It changes behaviour, so a regression test is required — but it is genuinely small and client-scoped.

**Guard the request on the result's source, derived from `PLATFORM_CODES`:**

- Skip `getAlignment()` entirely unless the result's platform is STAR (equivalently, unless its code is bare-numeric).
- **Derive the check; do not hardcode `'STAR'`.** The precedent is in the very file that defines the invariant: *"a hardcoded subset silently omitted AICCRA, so `/result/AICCRA-123` matched neither this regex nor the numeric fallback, no `reportingPlatforms` param was sent, and the server fell back to `platform_code='STAR'` — surfacing as 'Result not found' on every service."* The same shortcut caused the last bug in this area.
- Reuse the existing derivation rather than writing a second one — two implementations of "which platform is this result" is how they drift apart.

**Named failing inputs (K-012), stated before the test exists:**

```
open a TIP-prefixed result  →  today: error displayed.  after: no request, no error.
open a bare-numeric result  →  must STILL fetch and still show the tab when eligible.
```

The second is the one that matters: a fix that suppresses the request for everything would pass the first check and silently kill the feature.

### Two tempting fixes that are both wrong — named deliberately

**Wrong fix A — "just normalize the code to numeric."** It is the obvious repair given root-cause link 3, it is one line, and it would make the error disappear. **It is the opposite of the requirement.** Passing `31288` instead of `TIP-31288` makes the route *match*, so the server would then evaluate pool-funding eligibility **for a TIP result** — reaching an endpoint the requester explicitly wants unreachable for non-STAR sources. The bug would be replaced by a silent behaviour change, and the digits-only route pattern that is currently enforcing the rule by accident would stop enforcing anything.

**Wrong fix B — extend the interceptor's suppression to 404.** Hides the symptom while still firing a pointless request per non-STAR result, and would mask genuine 404s on that path. Treating the visible error as the bug rather than the needless request is the wrong level.

**Both fixes pass the naive test "the error is gone."** That is precisely why the regression test must assert the *absence of the request*, not the absence of the error — and why a bare-numeric result must still fetch successfully.

---

## 4. Proposed Outcome

Non-STAR results render with no pool-funding request, no tab, and no error. STAR results behave exactly as today.

---

## 5. Scope

| In | Out |
| --- | --- |
| Gating the alignment request by source, in the client | The server route pattern — already correct |
| Reusing the existing `PLATFORM_CODES` derivation | The `http-error.interceptor` 400-suppression (unchanged) |
| A regression test covering both directions | Any change to alignment logic or eligibility rules |

---

## 6. Non-Goals

- **Not** a widening of `RESULT_CODE` to accept prefixed codes. That would make the endpoint reachable for sources it does not support — the opposite of the requirement.
- **Not** a change to `shouldHidePoolFundingTab`, which already works.
- **Not** a general audit of which other endpoints assume numeric result codes (see OQ-2).

---

## 7. Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| Users viewing TIP / PRMS / AICCRA results | The spurious error disappears |
| `bilateral.service.ts` | The guard |
| Server | **None** |
| `bilateral-module` specs | Behaviour clarified, not changed |

---

## 8. Visual Reference

- **Source:** None needed — the correct end state is the *absence* of an error and of a tab. A screenshot of the current error was supplied by the requester and is reproduced in §3.

---

## 9. Risks, Dependencies, And Open Questions

| # | Risk | Mitigation |
| --- | --- | --- |
| **R-1** | **Over-suppression** — guarding too broadly would silently remove the tab for eligible STAR results, turning a visible bug into an invisible one | The second named input exists for exactly this: a bare-numeric result must still fetch and still show the tab |
| **R-2** | **A second source-detection implementation** drifting from `result.interceptor.ts`'s | Reuse the existing derivation; do not re-implement |
| **R-3** | If any STAR result ever carried a prefixed code, or any non-STAR result a bare-numeric one, the client guard and the server route would disagree — **which is the exact shape of this bug** | Confirm the invariant holds in data before implementing (OQ-1) |

### Open Questions

| # | Question | Owner | Blocking |
| --- | --- | --- | --- |
| **OQ-1** | **Is `numeric ⟺ STAR` true in the data**, not just in the client's code? The client asserts it and the server route depends on it, but neither validates it | Engineering | **Yes** — the whole fix rests on it |
| ~~**OQ-2**~~ | ~~How many other endpoints use `RESULT_CODE` while the client may call them for any source?~~ **ANSWERED 2026-08-19 — not a family.** `RESULT_CODE` backs **~40 routes across ~15 controllers**, and all of them work for non-STAR results because their callers pass the **numeric** id (`GET_GeneralInformation(id: number)`). `GET_PoolFundingAlignment(resultCode: string)` is the **only** result-scoped endpoint typed as a string and fed the prefixed code. One outlier, not a class | Leader | Closed |
| **OQ-3** | Is "STAR only" the permanent rule, or should eligible sources become configurable if AICCRA/PRMS later support alignment? | Product | No — STAR only for now |

**OQ-2 was run before this proposal was committed** — see its answered row above. The grep inverted the expectation: the digits-only pattern is used almost everywhere and works everywhere, so this is a single inconsistent caller rather than a family of source bugs. That narrows the fix and removes the audit this proposal would otherwise have implied.

---

## 10. Success Criteria

1. Opening a `TIP-` / `PRMS-` / `AICCRA-` result issues **no** pool-funding request and displays **no** error.
2. Opening a STAR result still fetches alignment and still shows the tab when eligible — proven by a test that fails if the guard is too broad.
3. The source check **derives** from `PLATFORM_CODES`; adding a fifth platform requires no edit here.
4. No server change; `RESULT_CODE` untouched.
5. OQ-1 confirmed against data before merge.

---

## 11. Next Step

```text
/akili-specify docs/specs/bugfix/pool-funding-source-gate
```

**Lite depth, Bug Mode.** Answer **OQ-1** first (cheap: a query over result codes by platform), and run **OQ-2**'s grep — if other `RESULT_CODE` routes are reachable from non-STAR results, the scope should be decided knowingly rather than discovered one bug at a time.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
