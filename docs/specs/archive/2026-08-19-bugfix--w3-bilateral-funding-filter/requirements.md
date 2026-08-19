# Requirements — clarisa / W3-Bilateral Funding Filter

- **Module:** clarisa
- **Spec id:** 2026-08-w3-bilateral-funding-filter
- **Status:** draft
- **Owner:** Juan Carlos Cadavid
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — bilateral mapping / CLARISA controlled vocabularies
- **Linked tickets:** AC-1676
- **Last updated:** 2026-08-19
- **Depth:** **Lite** · **Mode:** **Bug**
- **Supersedes:** `archive/2026-08-14-bugfix--bilateral-alliance-selector` — its `OQ-A` ("W3 excluded") and the `BUT it must NOT return 'Window 3'…` clause. The archived spec is a point-in-time record and is **not edited**.
- **Amends (live code only):** `archive/2026-08-19-bilateral--clarisa-fixture-stub` — see §5.

---

## 1. Context

The module is the **W3 / Bilateral** registry, but `isBilateralFunding` accepts a funding source only when it starts with `BILATERAL`. W3-funded projects never reach the picker, so a W3 contract cannot be mapped at all — silently, with no empty-state explanation.

The predicate faithfully implements the archived `bilateral-alliance-selector` spec, whose scope was narrower than the module's remit. The requester confirmed on 2026-08-19 that the remit was always both funding families; that confirmation is what makes this a **bug** and not a change, and it is recorded as a decision, not as a discovered fact.

**Not changing:** `isAllianceProject`, `matchesPhase`, the CLARISA stub fixture data, the AGRESSO-side `isBilateralTagTarget`, pool-funding tag semantics, and the predicate's name (OQ-3 deferred).

---

## 2. Functional requirements

### R-W3B-001 — The funding predicate admits both funding families

- **As a** center admin mapping a bilateral or W3 contract
- **I want** the funding filter to accept the funding types the registry is named for
- **So that** W3 contracts can be mapped at all

**Details:**
- Inputs: a raw `source_of_funding` string (or `null` / `undefined`) from the CLARISA `api/projects` payload.
- Behavior: after `normalizeToken` (trim → collapse whitespace → upper-case), the value is admitted when it **starts with `BILATERAL`** *or* matches the **W3 family**. The W3 family covers every spelling observed in the live feed and the stub fixture: `WINDOW 3`, `WINDOW3`, `WINDOWS 3`, `WINDOWS3`, `W3`, each with an optional `- RESTRICTED` suffix (dash spacing free, as `BILATERAL- RESTRICTED` already demonstrates).
- Outputs: `boolean`. Pure function; no envelope.
- Errors: none — `null`, `undefined`, `''` and whitespace-only return `false`.
- Permissions: unchanged (pure util, no HTTP edge).

#### Scenario: A restricted W3 project becomes selectable

- GIVEN a CLARISA project whose `source_of_funding` is `Window 3 - Restricted`
- WHEN the funding predicate evaluates it
- THEN it returns `true`
- AND the same holds for `Window 3`, `WINDOW 3 - RESTRICTED`, `Windows 3`, `window3`, and `W3`
- **BUT it must NOT** return `true` for `SRV`, `''`, `'   '`, `null`, `undefined`, or `NON-BILATERAL`
- **AND IT MUST** keep returning `true` for every previously-accepted spelling: `Bilateral`, `bilateral`, `BILATERAL - RESTRICTED`, `Bilateral - Restricted`, `BILATERAL- RESTRICTED`

> **`SRV` stays excluded (OQ-2).** It sits in the same archived exclusion clause but is **not** W3 and nothing in the request covers it. It is the over-correction guard: a test that only proves the W3 case would pass a predicate that accepts everything.

**Acceptance criteria:**
- [ ] AC.1 — `isBilateralFunding('Window 3 - Restricted')` is **`false` on current `HEAD` and `true` after the fix** (the Bug Mode red-before/green-after evidence).
- [ ] AC.2 — `isBilateralFunding('SRV')` is `false` **both before and after**.
- [ ] AC.3 — `isBilateralFunding('window3')` is `true` after the fix — the no-space spelling is the one the shipped stub fixture actually uses (28 of its 198 rows); an allowlist that only handles `WINDOW 3` passes AC.1 and still leaves the stub cohort wrong.
- [ ] AC.4 — All five pre-existing positive Bilateral spellings still return `true`.

---

### R-W3B-002 — The picker and its phase list offer the widened cohort

- **As a** center admin
- **I want** W3 projects to appear in the CLARISA Project picker and to count toward the offered phases
- **So that** the fix is visible where the bug was observed, not only at the predicate

**Details:**
- Behavior: `listBilateralProjects` and `getEligiblePhases` inherit R-W3B-001 through their existing call sites. No new filtering, no signature change, no change to `listProjectsForCoverage` (which deliberately does not filter by funding — its `window3` rows must keep flowing through untouched).
- Outputs: `ServerResponseDto` envelope unchanged; only the option count differs.

#### Scenario: The picker offers the W3 rows it used to hide

- GIVEN the stub fixture of 198 projects at phase 2026
- WHEN `listBilateralProjects` runs with the fixed predicate
- THEN it returns **198** eligible projects (up from **170**), of which **166** have science programs (up from **140**) and **32** do not (up from **30**)
- **BUT it must NOT** change `listProjectsForCoverage`'s output — its unfiltered `window3` retention is a deliberate contract (`DD-2`), not a leak
- **AND IT MUST** leave the picker's rendering, labels, and empty state unchanged — only the option count moves

**Acceptance criteria:**
- [ ] AC.1 — The stub fidelity suite asserts eligible **198** / science **166** / non-science **32** and passes.
- [ ] AC.2 — `listProjectsForCoverage`'s existing "does NOT filter by `source_of_funding`" test passes **unmodified**.
- [ ] AC.3 — The full server suite is green, with every stale pre-fix expectation *inverted or re-stated*, never deleted (see D-2 in §4).

> **Measured 2026-08-19, offline, against the committed fixture** (`clarisa-projects.fixture.json`, 198 rows, funding vocabulary exactly `{bilateral: 170, window3: 28}`): today 170/140/30 → fixed 198/166/32; all 28 additions are `window3`. **Re-measured this session and confirmed identical to the proposal.** *Invalidating condition (K-013): any change to the fixture file or to `isAllianceProject`/`matchesPhase`.*

---

## 3. Non-functional requirements

### NFR-W3B-001 — The AGRESSO side is deliberately left asymmetric

- **Category:** compliance / data integrity
- **Target:** `agresso-contract.service.ts` → `isBilateralTagTarget` is **unchanged**. It continues to require `funding_type` `BLR`/`BILATERAL` **and** `!hasActivePooledFundingContract`, so it still rejects all 209 W3 contracts (`W3R` 204, `W3U` 5) and the 4 `BLU`.
- **Consequence, stated rather than implied (R-1):** after this fix a W3 CLARISA project **can** be mapped to a contract that `isBilateralTagTarget` will still classify as *not* a bilateral tag target. Pool-funding tagging stays on AGRESSO's own taxonomy.
- **Why acceptable:** only **4** active rows exist in `bilateral_project_mapping WHERE is_active=1`, against 1,541 unmapped `BLR` contracts. The feature is effectively unused, so widening the CLARISA filter cannot corrupt a history that does not exist.
- **How verified:** code review — a diff that touches `agresso-contract.service.ts` fails this NFR by definition. Accepted in writing by the requester, 2026-08-19 (closes OQ-1).

### NFR-W3B-002 — This does not close US6

- **Category:** compliance
- **Target:** the unbuilt external **W3 Registry sync** (US6, `D-source-w3`, blocked on the System Office) remains Open. This fix delivers W3 *selectability* from the existing CLARISA feed only.
- **How verified:** documentation check at archive time.

---

## 4. Defect classes and their gates

**The classes this spec can actually produce, and what catches each.** A gate blind to the dominant class is not a gate.

| # | Defect class | Gate | Input that makes it FAIL |
| --- | --- | --- | --- |
| **D-1** | **Under-widening** — a live spelling the allowlist misses | `npx jest project-selector.util.spec` — one assertion per observed spelling | An allowlist of literal `'WINDOW 3'` only: `isBilateralFunding('window3')` returns `false` → AC.3 reds |
| **D-2** | **Over-widening** — the predicate accepts everything (**KZ-001 / R-4**) | The **retained** `SRV` / blank / `NON-BILATERAL` negatives. `D2` from the archived spec is **reframed, not dropped** | `return true` in the predicate: `isBilateralFunding('SRV')` reds |
| **D-3** | **Stale downstream expectation** — a suite still asserts pre-fix counts | `npm test -- --silent` (full server suite) | Fix the predicate, leave `clarisa-stub.fidelity.spec.ts` untouched: `expected 140, got 166` reds |
| **D-4** | **Weakened mutation gate** — the fidelity suite's K-004 falsifier is relaxed while being renumbered, so it stops pinning *which* divergence it detected | `grep -c 'expected 166, got 198' …/clarisa-stub.fidelity.spec.ts` returns exactly `1` | Any relaxation of the regex (`/expected/`, `/got/`) drops the count to `0`. *A relaxed regex does not make the mutation test pass on clean data — the helper throws only on a divergence — so the loss is the pin, not the gate itself* |
| **D-5** | **Live-feed divergence** — the live CLARISA cohort does not move 25 → 32 | ⚠️ **No automated gate.** This worktree has no `.env`, so live CLARISA is unreachable from the suite | *(see below)* |

**D-5 is an acknowledged blind spot, substituted not ignored.** The 25 → 32 figure comes from a 2026-08-19 live capture and cannot be re-measured offline. It is verified by a **human check at the HITL pause** (open the picker against Dev and confirm W3 rows appear), and the invalidating condition is recorded: CLARISA published 78 new phase-2026 projects within 24 hours of the capture, so the exact figure is expected to drift. **The requirement that must hold is directional — W3 projects appear — not the literal 32.** An acknowledged blind spot is recoverable; an unacknowledged one consumes rework attempts.

> **`npm run lint` is not a gate here (K-001)** — it carries `--fix`. Use `npx eslint <path>`.

---

## 5. Cross-system impact

| Surface | Impact |
| --- | --- |
| `project-selector.util.ts` | The predicate under change. **Its name becomes a misnomer**; rename deferred (OQ-3) |
| `clarisa-projects.service.ts` | 2 call sites (L77, L116) inherit the fix — **no edit** |
| `project-selector.util.spec.ts` | 5 W3 negatives invert; `SRV`/blank/`NON-BILATERAL` negatives stay |
| `clarisa-projects.service.spec.ts` | 6 tests use W3 as a *negative fixture*; each inverts or re-states |
| `clarisa-stub.fidelity.spec.ts` | Counts move 170→198 / 140→166 / 30→32, in 4 places including a thrown-message assertion |
| `bilateral-mapping-coverage.service.spec.ts` | **NOT affected.** It reaches CLARISA through `listProjectsForCoverage`, which never calls the predicate. *(This corrects the proposal's blast-radius row, which implied it was one of the "2 others".)* |
| `archive/…clarisa-fixture-stub` | Its recorded 170/140 are a point-in-time record and stay as written. **Only the live `*.spec.ts` gate is amended** — which is what proposal Success Criterion #6 was actually protecting |
| AGRESSO / pool-funding | Unchanged by design — NFR-W3B-001 |

**No data model changes. No API surface delta. No migration. No new env var.**

---

## 6. Assumptions, dependencies, risks

| # | Item | Note |
| --- | --- | --- |
| A-1 | `SRV` stays excluded | OQ-2, non-blocking; MEL may overturn |
| R-1 | AGRESSO asymmetry | **Accepted in writing** — NFR-W3B-001 |
| R-2 | Pool-funding tagging is driven by bilateral mapping | Investigated: the coverage path does not use the predicate, so the tagging input set is unchanged by this diff. Out of scope to alter |
| R-4 | `D2` regresses into a non-gate | Mitigated by D-2 above — negatives inverted, never deleted (**KZ-001**) |
| R-5 | Measurements age (K-013) | Fixture side **re-measured this session, identical**. Live side deferred to the human check in D-5 with its invalidating condition stated |

---

## 7. Requirement ID index

| ID | Title | Covered by |
| --- | --- | --- |
| R-W3B-001 | Predicate admits both funding families | T-01 |
| R-W3B-002 | Picker and phase list offer the widened cohort | T-02, T-03 |
| NFR-W3B-001 | AGRESSO left asymmetric | T-03 (review clause) |
| NFR-W3B-002 | US6 not closed | T-03 (doc clause) |

---

## 8. Open questions

| # | Question | Owner | Blocking |
| --- | --- | --- | --- |
| ~~OQ-1~~ | ~~Must AGRESSO follow?~~ **RESOLVED 2026-08-19 — no.** Now NFR-W3B-001 | Requester | Closed |
| OQ-2 | Confirm `SRV` stays excluded | MEL | No — spec assumes excluded |
| OQ-3 | Rename `isBilateralFunding` → `isMappableFunding` | Engineering | No — **deferred out of this bugfix** (K: do not fold cleanup into a bugfix) |

---

## 9. Sign-off

- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name> (OQ-2)
- [ ] Security review — n/a (no auth/secrets touched)
- [ ] DevOps — n/a (no infra touched)
