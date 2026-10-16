# Design — clarisa / W3-Bilateral Funding Filter

- **Module:** clarisa
- **Spec id:** 2026-08-w3-bilateral-funding-filter
- **Status:** draft
- **Owner:** Juan Carlos Cadavid
- **Linked requirements:** [./requirements.md](./requirements.md)
- **Linked TRD:** [`docs/trd/trd.md`](../../../trd/trd.md) — CLARISA integration
- **Last updated:** 2026-08-19
- **Depth:** Lite · **Mode:** Bug

---

## 1. Goals & non-goals

**Goals**
- Widen one pure predicate to an explicit two-family allowlist (R-W3B-001).
- Let both call sites inherit it with no edit (R-W3B-002).
- Keep the over-correction guard alive by *inverting* the stale negatives, never deleting them.

**Non-goals**
- Renaming the predicate (OQ-3). Not folded into a bugfix.
- Any AGRESSO-side change (NFR-W3B-001).
- Any change to the stub fixture data, `isAllianceProject`, `matchesPhase`, or `listProjectsForCoverage`.

---

## 2. Architecture

No architectural change. One pure function in `src/domain/tools/clarisa/projects/utils/project-selector.util.ts` — no injectables, no I/O, no framework imports. Both consumers already import it; the fix propagates by composition.

```
project-selector.util.ts :: isBilateralFunding   ← the only production edit
        ├── clarisa-projects.service.ts:77   listBilateralProjects
        └── clarisa-projects.service.ts:116  getEligiblePhases
                    (listProjectsForCoverage does NOT call it — unchanged)
```

### 2.1 Composition

No new files. Edits:

| Path | Change |
| --- | --- |
| `…/projects/utils/project-selector.util.ts` | Add a W3-family constant; widen `isBilateralFunding` to `BILATERAL*` OR W3 |
| `…/projects/utils/project-selector.util.spec.ts` | Invert 5 W3 negatives; add the `window3` no-space case; retain all other negatives |
| `…/projects/clarisa-projects.service.spec.ts` | Re-state 6 tests that used W3 as a negative fixture |
| `…/clarisa/stub/clarisa-stub.fidelity.spec.ts` | 170→198, 140→166, 30→32, and the K-004 thrown-message regex |

### 2.2 Reuse

`normalizeToken` is reused unchanged — it already supplies trim, whitespace collapse, and upper-casing, which is what makes a single anchored pattern sufficient for every observed spelling.

---

## 3. Data model

**No data model changes.** No migration, no entity, no OpenSearch field, no env var.

---

## 4. API surface

**No API surface delta.** No route, DTO, guard, role, or Swagger change. `listBilateralProjects` and `getEligiblePhases` keep their signatures and their `ServerResponseDto` envelope; only the option count moves.

---

## 5. Workflows & business rules

`isBilateralFunding(raw)`:

1. `normalizeToken(raw)` → `''` on null/undefined/blank → **reject**.
2. Accept when the normalized value **starts with** `BILATERAL` (unchanged branch — preserves `BILATERAL- RESTRICTED` and every other suffix form).
3. Otherwise accept when it matches the **W3 family**: the stem `WINDOW`/`WINDOWS`/`W` immediately followed by `3` (optional single space before the digit, since whitespace is already collapsed), then either end-of-string or a `RESTRICTED` suffix separated by a dash with free spacing.
4. Otherwise **reject** — which is what keeps `SRV`, `NON-BILATERAL`, and blank out.

**Why an anchored pattern and not `includes('W3')` or a literal spelling list.** A literal list is the failure mode D-1 names: the live feed and the stub disagree on spacing (`Window 3` vs `window3`), so a list built from the proposal's prose misses 28 of the stub's rows while still passing the proposal's named failing input. A substring test is the D-2 failure mode: it would admit any value containing the stem. The anchored pattern is the only form of the three that both AC.1 and AC.3 can falsify.

**Side effects:** none. No audit write, no OpenSearch reindex, no socket emit, no `sync_process_log` row, no transaction.

---

## 6. Frontend impact

None. Backend predicate only; the picker's rendering, labels, and empty state are untouched.

---

## 7. Integration impact

CLARISA read path only, and only the client-side filtering of an already-fetched payload. The upstream request (`api/projects`) is unchanged, as is the 5-minute cache — **note K-016: the widened cohort will not appear until the existing cache TTL lapses or the process restarts.** That is a pre-existing window, not one this change introduces, but a manual check performed inside it will read as "the fix did nothing".

---

## 8. Security & authorization

No change. Pure util behind existing guards; no new secret, no PII, no machine-token surface.

---

## 9. Observability

One behavioral note, not a new log line: the `R-BAS-006` "zero projects eligible" warning names the CLARISA host when the eligible cohort is empty. After the fix a **W3-only payload no longer triggers it**, because such a payload is now eligible. The alarm becomes marginally less sensitive — correctly so, since it is meant to fire on *nothing usable*, and W3 is now usable.

---

## 10. Testing strategy

Sibling `*.spec.ts` only; no e2e. Global 60% coverage threshold unchanged.

| Suite | Role |
| --- | --- |
| `project-selector.util.spec.ts` | **Owns the Bug Mode red-before/green-after evidence** — it tests the function whose body changes |
| `clarisa-projects.service.spec.ts` | Proves the call sites inherit the fix, and that `listProjectsForCoverage` did not |
| `clarisa-stub.fidelity.spec.ts` | Proves the cohort moved by the measured amount, and that its own K-004 mutation gate still fails |

Gate: `npm test -- --silent` from `server/researchindicators/`. Lint gate is `npx eslint <path>` — **not** `npm run lint`, which carries `--fix` (K-001).

---

## 11. Rollout

No migration, no feature flag, no backout script — revert is a code revert of one predicate plus its test expectations. **Deploy is code-only:** merge to `dev` deploys to On-Premise Dev via CI/CD; nothing here needs a schema or seed step. Notify MEL, since the mapped cohort now spans a pooled modality (a recorded decision, not a side effect).

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| **D-W3B-1** | 2026-08-19 | Widen via an **anchored W3-family pattern**, keeping the existing `startsWith('BILATERAL')` branch intact | The two branches have different shapes: Bilateral needs an open prefix (arbitrary suffixes are already in production), W3 needs a closed one (or `W3` would admit `W3X`). Collapsing them into one loose test is D-2 |
| **D-W3B-2** | 2026-08-19 | **Invert the stale negatives; delete none.** Reframe archived defect class `D2` as conditional rather than dropping it | `D2` ("normalization too broad") stays a live defect class as long as `SRV` and blank must be refused. Deleting the negatives leaves a gate that evaluates nothing — **KZ-001** |
| **D-W3B-3** | 2026-08-19 | **Do not rename** `isBilateralFunding`, despite the name now being a misnomer | Renaming touches both call sites, three spec files, and two archived spec references. Unrelated cleanup inside a bugfix widens the diff the Reviewer must audit for the regression. Recorded as OQ-3 for a follow-up |
| **D-W3B-4** | 2026-08-19 | Amend the **live fidelity `*.spec.ts`**, not the archived fixture-stub document | The fixture-stub spec was archived on 2026-08-19; archived specs are point-in-time records. Proposal Success Criterion #6 was protecting the gate, and the gate is the code |
| **D-W3B-5** | 2026-08-19 | Keep the fidelity suite's K-004 mutation assertion **as strict as it is today** — update both numbers in the regex, do not relax it | `/expected 140, got 170/` becomes `/expected 166, got 198/`. Relaxing it to `/expected/` while renumbering is defect class **D-4**. *Stated precisely:* the helper only throws on a divergence, so a relaxed regex does **not** make the test pass on clean data — what it costs is the pin on *which* divergence was reported, leaving the assertion satisfiable by any thrown message, including one from a helper that mis-reports the counts. That pin is the entire reason the numbers are in the message |

---

## 13. Reversion challenge (Step 2.3)

**This DD removes shipped, test-covered, user-visible behavior** (the W3 exclusion), so the Lite skip does not apply. Challenge run **inline** — this session is configured not to spawn subagents; per the command's delegation rule the fallback is recorded here, and specify's delegated roles break no independence constraint when absorbed inline.

**Question: what does removing the W3 exclusion break?**

| Candidate breakage | Verdict |
| --- | --- |
| **Pool-funding tagging is corrupted (R-2 — the one the proposal said must not be discovered afterwards)** | **Does not occur. Closed by inspection, not by scope.** `setPoolFundingTag` gates on `isBilateralTagTarget(contract)`, which reads the **AGRESSO contract's own** `funding_type` and its active pooled-funding relations. It never consults the CLARISA project's `source_of_funding`, and it never asks whether a bilateral mapping exists. A W3 project entering the picker therefore cannot cause a pooled contract to be tagged non-pooled — the attempt throws `BadRequestException` at a guard this diff does not touch. R-2 moves from "out of scope, investigate" to **resolved** |
| The "zero eligible" operational warning stops firing on W3-only payloads | **Real but correct.** Recorded in §9 |
| `getEligiblePhases` may offer additional phase years | **Intended.** It is the same requirement seen from the phase list |
| Downstream suites go red | **Intended and gated** — D-3, owned by T-02 |

**One concrete trap this challenge surfaced.** There are **two** functions with near-identical names: the CLARISA util `isBilateralFunding`, and a **local `const isBilateralFunding`** inside `agresso-contract.service.ts :: isBilateralTagTarget`. An implementer grepping the symbol lands on both, and editing the AGRESSO one silently violates NFR-W3B-001. Both tasks carry an explicit no-touch clause naming the file.

---

## 14. Budget (Step 2.4)

| Signal | Estimate |
| --- | --- |
| **Tasks** | **2** |
| **LOC changed** | **≈ 75** (production ≈ 10; test expectations ≈ 65 across 3 spec files) |
| **Review rounds** | **1** |

**Sizing verdict: the Lite depth is correct, and the user's "the solution should be simple" is accurate for the production diff.** The production change is one predicate. The work is concentrated in *test expectation inversion*, which is mechanical but must not be mechanical-minded — deleting instead of inverting is the KZ-001 failure the whole spec is shaped to prevent.

Not routed to `/akili-quick`: the diff is small, the risk is not (a live-behavior change with a mandatory red-before/green-after), and quick escalates on risk rather than line count.

`/akili-execute` trips on this budget. Exceeding it — a third task, a second review round, or a diff materially past ~75 LOC — is a signal to stop and escalate, most likely meaning the rename (OQ-3) leaked in.

---

## 15. Open questions

- **OQ-2** — MEL to confirm `SRV` stays excluded. Non-blocking; **user reaffirmed "keep excluded" 2026-08-19**.
- **OQ-3** — rename to `isMappableFunding`. Deferred out of this bugfix by D-W3B-3.
