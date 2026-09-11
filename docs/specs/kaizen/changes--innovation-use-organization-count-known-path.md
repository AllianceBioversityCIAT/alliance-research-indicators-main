# Kaizen Entry — changes/innovation-use-organization-count-known-path

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/innovation-use-organization-count-known-path` |
| Date | 2026-09-03 |
| Branch | `AC-1679-Create-the-innovation-use-section` (**spec branch** — default is `main`, unique) |
| Archive Run | 1 |
| Approval Mode | gated |

**Branch Context: spec branch.** No shared file was written — not a guide, template, persona, design doc, TRD, or the digest. Every proposed edit below is recorded as a pending item and awaits the apply phase on `main`.

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | `tasks.md` |
| Reviewer FAIL rework attempts | **0** | `execution.md` |
| HALTs / FATAL_FAILs | **0** | `execution.md` |
| Pivots | **0** | `execution.md` |
| PRODUCT_BUGs | **0** | `test-report.md` |
| Step 2.3 reversion-challenge blockers | **2** (both real, both folded in pre-approval) | `design.md` §6.1 |
| Validation FAIL / WARN | **0 / 4** (all closed before archive) | `validation-report.md` |
| `/akili-quick` escalations into this spec | **1** | `docs/specs/quick/quick-log.md` |
| Drift attributable to this spec | none | no report under `docs/specs/audits/` |

**Not a clean run**, despite zero rework: the pre-implementation challenge found two blockers and the post-implementation audit found four document defects. The pipeline caught everything before it shipped — which is the system working, not the system idle.

## Lessons

- **KZ-changes--innovation-use-organization-count-known-path-1 — The client's test gate cannot type-check, and no guide says so.** (Product, **Medium**)
  - **Root cause:** `client/research-indicators/jest.config.ts` sets `isolatedModules: true` on the `jest-preset-angular` transform, so `npm test` compiles without type-checking. The root guide's *Agent-lean verification* table lists `npm test -- --silent` as the client gate with **no note that it type-checks nothing**. An agent reading that table has no way to know a `TS2322` passes it.
  - **What it cost:** the payload edit as originally scoped did not compile. Only the Step 2.3 reversion challenge caught it; had that step been skipped — as it would have been under `/akili-quick`, which is how this work arrived — the whole 6,798-test suite would have gone green over a broken build.
  - **Evidence:** `design.md` §6.1 finding 1; `execution.md` → T-02 red (i), the observed `TS2322` naming both `:526` and `:92`.
  - **Why it is its own lesson and not just a `KZ-017` instance:** KZ-017 states the *principle* (a check narrower than its claim returns a confident green). This is the specific, repo-local **fact** that makes the principle actionable here, and it is written down nowhere. The principle did not prevent the defect; the fact would have.
  - Standardization → **P1**

- **KZ-changes--innovation-use-organization-count-known-path-2 — A falsifying edit must be as narrow as the claim it falsifies.** (**Product + Methodology**, Medium)
  - **Root cause:** the K-004 red proof for validation finding F-3 applied `sed -i '' 's/\[disabled\]="disabled"$/…/'`, whose `$` anchor rewrote **every** line ending in that binding — not just the count input's. The `c8` **known**-path test then failed too, for a binding this spec never touches. Because a test stops at its first failing assertion, the resulting red could not distinguish *"my new assertion fired"* from *"I broke an unrelated select"*.
  - **What it cost:** nothing shipped — the contamination was caught by reading the failure list and asking why a known-path test reddened for a field that is not rendered there. The proof was discarded and re-run one falsifying input at a time, each yielding exactly one failing test.
  - **Evidence:** `test-report.md` §4 (the contaminated run and both narrow re-runs); `validation-report.md` §12.
  - **The sharpening:** `KZ-014` already governs a red that is **too weak** ("a red that would pass with the defect reintroduced is not evidence"). This is the opposite failure — a red that is **too broad**, and therefore not *attributable*. Both produce a confident-looking red that proves nothing. The rule that covers both: **a red is evidence only if exactly the claimed defect could have produced it.**
  - **Dual:** the root cause names no stack, domain, or local convention — it is a property of falsification itself. Local edit **and** upstream.
  - Standardization → **P2** (local) + **P3** (upstream to the AKILI methodology repo)

## Noted, not a lesson

- **Two figures were published without their evidence and one of them was wrong** — "13 paths" (actually 11, inflated by a command that concatenated the committed range *and* the working tree) and "~90 LOC met exactly" (never measured). Both were caught by the independent auditor, not by the Leader who wrote them. This is a **recurrence of `KZ-014`**, not a new lesson — see the `digest-update` at **P4**.
- **The independent auditor produced 100% of the validation findings.** The validator had authored the spec documents and delegated the substantive audit for exactly that reason; all four WARNs came from the delegate, and at least two (`T-04`; the archive's live `DD-4`) had survived three per-task Reviewer passes. Evidence that `author ≠ auditor` pays at the *document* layer, not only the code layer. Below the lesson bar because the process already did the right thing — feeds the recurrence check if a future spec skips the delegation and misses comparable defects.
- **The `/akili-quick` refusal was correct and load-bearing.** The change looked like a one-line `@if`; it was a non-compiling three-line edit that reversed an approved decision. Feeds the recurrence check on triviality-gate calibration.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | root `CLAUDE.md` — §4.3 *Agent-lean verification* table, the `Client tests` row |
| Edit | Append to the Note column: **⚠️ `npm test` does NOT type-check** — `jest.config.ts` sets `isolatedModules: true`, so the whole suite goes green over a `TS2322`. `npm run build` is the only type gate for client code. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | root `CLAUDE.md` — §4.3, appended to the `K-004` / `KZ-014` cluster |
| Edit | **A red must be *attributable*, not merely present.** Apply the falsifying edit as narrowly as the claim: a broad pattern (an unanchored `sed`, a whole-file revert) can redden a test for a defect you did not introduce, and a test stops at its first failing assertion — so the red no longer proves which change caused it. One falsifier at a time; if more than the expected tests redden, the proof is contaminated, not stronger. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | **Upstream — AKILI methodology repo** (`.agents/tester.md` and/or the `K-004` guidance). No local file. |
| Edit | Same rule as P2, stated generically: a falsifying edit must be as narrow as the claim it falsifies, or the resulting red is not attributable to the claim. |
| Severity | Medium |
| Status | pending — **Methodology, upstreaming recommended** |

### P4

| Field | Value |
|---|---|
| Kind | `digest-update` |
| Target | `KZ-014` (staging lineage) |
| Edit | Raise recurrence and add this spec as a source: *"+1 in `changes/innovation-use-organization-count-known-path`: a path count published without its list was **wrong** (13 vs 11 — the command concatenated the committed range and the working tree, double-counting two files), and a budget row asserted 'met exactly' with no measurement behind it. A count without its list is unauditable in the same way a truncated search is — the reader cannot tell what was included."* |
| Severity | High (raised from the digest's current level on recurrence) |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | `digest-update` |
| Target | `KZ-017` |
| Edit | Add this spec as a source: *"+1 — the client's `npm test` gate does not type-check (`isolatedModules: true`), a scope limit the verification table did not declare; the un-declared gap let a non-compiling edit reach a green suite in review. See `KZ-changes--innovation-use-organization-count-known-path-1` for the repo-local fact that makes this actionable."* |
| Severity | High (unchanged; recurrence noted) |
| Status | pending |

---

### Step 3 constitution-sync items

**None owed.** `execution.md` carries no `## Constitution Impact` block — no module was created or reshaped, no boundary moved, no public surface changed. The factual-claims sweep of the root guides found one incomplete (not false) statement, which is **P1** above rather than a separate `factual-sweep` item. No `trd-adr` item: no design decision or pivot overturned a TRD ADR.
