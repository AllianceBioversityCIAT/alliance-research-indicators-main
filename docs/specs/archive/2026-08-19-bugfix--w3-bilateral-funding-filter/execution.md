# Execution Log — clarisa / W3-Bilateral Funding Filter

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/bugfix/w3-bilateral-funding-filter/` |
| **Spec id** | 2026-08-w3-bilateral-funding-filter |
| **Depth / Mode** | Lite · **Bug Mode** |
| **Approval Mode** | `gated` |
| **Branch** | `JuankCadavid/AC-1676` |
| **Budget (design §14)** | 2 tasks · ≈ 75 LOC · 1 review round |
| **Leader** | Claude Opus 5 (T1) |
| **Implementer** | `akili-implementer` → sonnet (T2) |
| **Reviewer** | `akili-reviewer` → opus (T3), read-only. **author ≠ auditor satisfied on both axes** |
| **Started** | 2026-08-19 |

---

## Task Execution History

### T-01 — Widen the funding predicate and invert its own negatives

- **Status:** ✅ **PASS**
- **Date:** 2026-08-19
- **Implementer attempts:** 2
- **Requirements covered:** R-W3B-001 (AC.1–AC.4, full scenario incl. `BUT it must NOT` and `AND IT MUST` clauses); NFR-W3B-001 (no-touch)
- **Final LOC:** 42 insertions / 19 deletions across 2 files

#### Attempt 1 — Reviewer FAIL

**Files changed:** `project-selector.util.ts`, `project-selector.util.spec.ts` (boundary respected — `git diff --name-only` showed nothing else, and nothing under `domain/entities/agresso-contract/`).

**Implementation.** Added `W3_FUNDING_PATTERN = /^(?:WINDOWS|WINDOW|W)\s?3(?:\s*-\s*RESTRICTED)?$/` beside `BILATERAL_FUNDING_PREFIX`; widened `isBilateralFunding` to `startsWith(BILATERAL_FUNDING_PREFIX) || W3_FUNDING_PATTERN.test(normalized)`. `normalizeToken` untouched; function name untouched (D-W3B-3).

**Bug Mode evidence — red-before, captured verbatim.** Spec file edited first, util untouched:

```
FAIL src/domain/tools/clarisa/projects/utils/project-selector.util.spec.ts (7.732 s)
  ● … › positive W3 family values (R-W3B-001) › accepts Window 3
    Expected: true / Received: false
  ● … › accepts Window 3 - Restricted        Expected: true / Received: false
  ● … › accepts WINDOW 3 - RESTRICTED        Expected: true / Received: false
  ● … › accepts Windows 3                    Expected: true / Received: false
  ● … › accepts W3                           Expected: true / Received: false
  ● … › accepts window3 (no-space spelling used by 28 of 198 stub rows, AC.3)
                                             Expected: true / Received: false
Test Suites: 1 failed, 1 total
Tests:       6 failed, 35 passed, 41 total
```

Green after the util edit: `PASS … Tests: 41 passed, 41 total`. `npx eslint` clean (K-001 — `npm run lint` was **not** used as the gate).

**Reviewer verdict: `STATUS: FAIL` — 1 issue.**

> **Discovered Issue:** the enclosing `describe` and two comment blocks in the edited region still encode the pre-fix cohort and now contradict the assertions beneath them. `:397` `describe('… (25 eligible vs 1 pre-fix)')` wraps a suite now asserting `toBe(30)`. `:398` `// 25 eligible production rows …`. `:442–443` `// --- NEGATIVE ROWS (Must be excluded) ---` + `// Window 3 spellings (all 6 observed spellings)` sit above rows `501–505`, which the test twelve lines later now asserts **are** eligible.
> **Violated Rule:** `tasks.md:123` — *"Re-state titles, do not just change numbers. A test titled X that now expects Y is a lie the next reader will trust."* Reinforced by `tasks.md:163`.
> **Remediation:** three mechanical edits, no assertion changes.

Everything else passed on attempt 1 and carried forward: D-W3B-1 regex traced against `W3X`, `WINDOW 33`, `NOT WINDOW 3`, `W 3`, `WINDOWS3` and the `normalizeToken` interaction; D-W3B-2/KZ-001 negatives inverted not deleted (6 survivors → 6); D-W3B-3 name intact; NFR-W3B-001 clean (`W3_FUNDING_PATTERN` has four repo-wide references, all inside `project-selector.util.ts`); red-before judged genuine.

#### Attempt 2 — Reviewer PASS

**Effort bumped medium → high** per the rework rule. Scope restricted to comments and `describe` names; no assertion, expected value, or `it` title touched.

Three remediations applied: `:397` → `(30 eligible vs 1 pre-fix)`; `:398` → `// 25 Bilateral + 5 W3-family eligible rows + …`; `:442`/`:473` → marker split, `// --- W3-FAMILY ROWS (eligible since R-W3B-001) ---` above `501–505` and `// --- NEGATIVE ROWS (Must be excluded) ---` moved down to `506`.

**Verification:** `npx jest …project-selector.util.spec.ts --silent` → PASS 41/41. `npx eslint` → clean. `git diff --name-only` → two allowed files only (Leader-confirmed independently).

**Reviewer verdict: `STATUS: PASS`.** All three findings closed. The Reviewer verified the relocated marker's **scope against the actual row order** rather than the diff hunk: `W3-FAMILY` covers exactly `501–505`, `NEGATIVE ROWS` covers `506` through end (`601`/`602` blank+null, `701–706` non-Alliance lead, `801` non-Alliance centre, `901` phase 2025) — every row under it genuinely absent from the eligible set. It also re-ran the staleness sweep independently rather than accepting the report: 14 digit-bearing comment lines and 14 `describe` names checked; no fourth stale site. Arithmetic independently confirmed: 25 Bilateral (`101` + `200–209` + `300–312` + `401`) + 5 W3 (`501–505`) = 30.

#### Advisory findings (recorded; never gate, never become tasks)

| Lens | Finding |
| --- | --- |
| RELIABILITY | The second production-shaped block's edits (`30`, the `501–505` inversion) were necessarily made *after* the util fix, so they carry no observed red of their own. Not an AC.1 gap — the first block's red covers the requirement — but a `git stash` + one run would complete the record |
| READABILITY | `project-selector.util.ts` gained a second `@sdd-spec` header line; the sibling spec file's header still cites only `bilateral-alliance-selector` |
| READABILITY | `W3_FUNDING_PATTERN` is exported but has no assertion in the `Exported Constants` block that pins its siblings |
| READABILITY | `:73 describe('isBilateralFunding (R-BAS-001, DD-2)')` — the parent of both blocks — still cites only the archived spec's IDs. It **under-cites** rather than asserting anything false, and is unchanged from `HEAD`. Fold into the OQ-3 rename follow-up. *The Reviewer flagged this as a note on sweep design: the Implementer's keyword sweep was structurally blind to it, because a keyword sweep verifies presence of the keyword, not absence of the defect* |

#### Leader decisions

| # | Decision |
| --- | --- |
| **L-1** | **Scope-widening ruled IN SCOPE.** The Implementer disclosed editing a second production-shaped block in `project-selector.util.spec.ts` that T-01's work order did not name. Leader verified with `grep`: **two** production-shaped 25-count blocks exist — `project-selector.util.spec.ts:397` and `clarisa-projects.service.spec.ts:274/471`. The `tasks.md` site list was **incomplete** — a gap in the spec, not Implementer overreach. Editing it was forced: leaving it red would have failed T-01's own green-suite gate. `tasks.md` T-01 scope corrected to record the true site list |
| **L-2** | Advisories recorded and **not** actioned, per the *Advisory Never Becomes A Task* rule. The three named in attempt 2's brief were explicitly fenced out of that attempt's scope |
| **L-3** | The `tasks.md` correction was deliberately **deferred until both workers were idle**. Mutating a work order while a Reviewer is reading it produces a wrong verdict, not a slow one (root `CLAUDE.md` §4.3 concurrency rule) |

**Final verification (T-01):** `npx jest project-selector.util.spec.ts --silent` → **41/41 PASS** · `npx eslint` on both files → **clean** · boundary gates → **clean**.

---

### T-02 — Realign the two downstream suites to the widened cohort

- **Status:** ✅ **PASS**
- **Date:** 2026-08-19
- **Implementer attempts:** 2
- **Requirements covered:** R-W3B-002 (AC.1–AC.3, scenario + `BUT it must NOT` + `AND IT MUST`); NFR-W3B-001, NFR-W3B-002 (no-touch / doc clauses)

#### Attempt 1 — Reviewer FAIL

**Named-failing-input evidence (K-012), captured before any edit.** T-01's predicate change left the downstream suites red on their own — which is the proof the fidelity gate is wired to the *shipped* predicate, not to a parallel reimplementation (defect class D-3):

```
FAIL clarisa-projects.service.spec.ts
  ● bug-mode regression: returns all 25 eligible production-shaped projects …
      Expected length: 25 / Received length: 30
  ● getEligiblePhases … scenario 1 — the trap        received extra { phase: 2026, count: 1 }
  ● omits a year whose projects exist but none are eligible   received extra { phase: 2026, count: 1 }
  ● deserializes fields-absent payload … (AC.1)      pinned ids received [101, 102], expected [101]
FAIL clarisa-stub.fidelity.spec.ts
  ● has_science_programs is true for exactly 140 of the 170 eligible …
      Expected length: 170 / Received length: 198
  ● K-004 mutation 1 — Received message:
      "has_science_programs true count: expected 140, got 198 (eligible cohort size 198)."
Test Suites: 3 failed, 326 passed, 329 total
Tests:       7 failed, 2345 passed, 2352 total
```

A third suite (`star-results-metadata-workbook.handler.spec.ts`) failed on a 5000 ms Jest timeout. **Correctly handled per the concurrency rule:** re-run in isolation → PASS 20/20, confirmed an unrelated flake and *not* chased. Same family as the `excel-workbook.builder.spec.ts` incidents, different artifact.

**Two corrections to the spec's blast-radius analysis, both found by measurement rather than by following the site list:**

| Direction | Finding |
| --- | --- |
| **Over-predicted** | 3 of the 6 sites `tasks.md` named were **already green** and were correctly left untouched: `filters to source_of_funding === "Bilateral" …`, `logs a warning naming CLARISA host …`, and `regression: … identical pinned id set … (AC.3)`. Cause, traced by the Reviewer to source: the `window3Project` helper sets only `id`, `short_name`, `source_of_funding`, `project_mappings_array` — so `isAllianceProject` returns `false` at the affiliation branch and never reaches the funding question. Those rows were **never** Alliance-affiliated; the site table assumed they were |
| **Under-predicted** | 1 site the spec never named was genuinely red: `getEligiblePhases … scenario 1 — the trap` |

**Technique adopted, and why it is better than what the spec asked for.** Four red sites were repaired by swapping the fixture row's funding `'Window 3'` → `'SRV'` rather than by inverting the test's expectation. Each of those tests exists to prove that an *ineligible* 2026 project does not leak into the derived phase list; inverting the expectation would have deleted that check while leaving it looking present. Swapping the fixture keeps the row ineligible and the test's purpose intact. **The only assertion that moved in the entire service spec is `toHaveLength(25)` → `30`.** The Reviewer audited all four against their stated purpose and confirmed each preserved — notably that the "trap" row keeps `source_center_acronym: 'CIAT'`, so it remains ineligible *by funding alone* and the leak path it tests still exists.

**Reviewer verdict: `STATUS: FAIL` — 1 issue.**

> **Discovered Issue:** `clarisa-projects.service.spec.ts:227` — `it('filters to source_of_funding === "Bilateral" led by the Alliance (ABC)')` still carries the pre-fix framing. After R-W3B-001 the title states the operative reason for row 2's exclusion and it is now the wrong reason: `Window 3` is admitted by the predicate, and the row drops out solely for lacking Alliance affiliation. It is the first test in the block — what a maintainer reads to learn what the filter does — and both halves are now false as an account of the code. The three sibling sites carrying the same hazard each got a clarifying comment; this one got neither.
> **Violated Rule:** `tasks.md:105`, second clause of that row. Reinforced by `tasks.md:123`, which uses **this exact title** as its worked example.

#### Attempt 2 — Reviewer PASS

**Effort bumped medium → high.** Title re-stated to `'filters to bilateral-family funding led by the Alliance (ABC); the Window 3 row is dropped for lacking Alliance affiliation, not for its funding'`, plus the same two-line clarifying comment the three sibling sites carry. No assertion changed; the pin stays `[1, 3]`.

**Reviewer verdict: `STATUS: PASS`.** Both halves of the new title verified accurate against the traced mechanism; every other assertion confirmed byte-identical in the file (not the diff); nothing newly falsified. The Reviewer also declined to raise `:914` (the last window3-bearing row without a comment) as scope creep on a three-line delta, routing it to the existing advisory instead.

#### Leader decisions

| # | Decision |
| --- | --- |
| **L-4** | **The FAIL was caused by my brief, not by the Implementer.** The `tasks.md` row for that test holds **two independent clauses** — the id change (`[1,3]`→`[1,2,3]`) and the title re-statement. I retired the first when the fixture proved Alliance-less, and the Implementer reasonably read the whole row as retired. The second clause stands on its own reasoning: the framing is wrong because the *predicate* is no longer `=== "Bilateral"`, which is true regardless of fixture shape. Stated explicitly in the rework brief so the retry did not read it as a reversal |
| **L-5** | The Implementer's refusal to edit three tests the work order named is recorded as **correct behavior**. It verified each in isolation before touching anything. Editing already-correct tests is the same class of error as leaving stale prose |

#### Advisory findings (recorded; never gate, never become tasks)

| Lens | Finding |
| --- | --- |
| **RISK** | **The fidelity gate's eligible cohort is now 198 of 198 fixture rows** — `expect(eligible).toHaveLength(198)` equals `expect(fixture).toHaveLength(198)`. The composed predicate excludes nothing in this fixture, so that assertion would **also pass against an `isBilateralFunding` that returned `true` unconditionally**. Not a defect and not fixable here — the vocabulary is exactly `{bilateral: 170, window3: 28}` and AC.1 mandates the 198 — but **defect class D-2 (over-widening) now has no guard at the fidelity layer.** It rests entirely on the `SRV`/blank/`NON-BILATERAL` negatives in `project-selector.util.spec.ts`, which have become load-bearing for the whole spec. If the fixture is ever regenerated, one deliberately ineligible row would restore a discriminating cohort assertion |
| **RISK** | `SRV` now carries the "permanently ineligible funding" role across **five** sites while **OQ-2 leaves its status formally open with MEL**. Correct either way — an overturn reds all five visibly — but the follow-up would be a five-site change, not a one-liner. Recorded against OQ-2's carry-forward |
| **RELIABILITY** | `clarisa-projects.service.spec.ts:923` — the comment *"Pins the exact expected project ids to go red if filtering logic changes"* over-claims: the pin did **not** move when the filtering logic changed materially in this very spec, because its `window3Project(503)` row was never Alliance-affiliated. Same misreading that produced the site-table over-prediction. Consider giving that fixture an Alliance-affiliated W3 row when AC.3 is next revisited |
| **READABILITY** | File headers at `clarisa-projects.service.spec.ts:14` and `clarisa-stub.fidelity.spec.ts:2` still cite only their originating specs — same under-citation class as T-01's `:73` advisory. Fold into the OQ-3 rename follow-up |

---

## Summary — all tasks complete

**Both tasks PASS. Spec implemented.**

### Leader-verified final measurement (2026-08-19, run in isolation, no worker active)

| Gate | Result |
| --- | --- |
| `npm test -- --silent` (full server suite) | **329/329 suites · 2352/2352 tests · PASS** (191 s) |
| `grep -c 'expected 166, got 198'` (D-4 mutation-gate pin) | **1** ✅ |
| `git diff --stat -- docs/specs/archive/` | **empty** ✅ (D-W3B-4) |
| Forbidden paths in diff (`agresso-contract`, `bilateral-mapping-coverage`, `archive`) | **0** ✅ (NFR-W3B-001) |
| `npx eslint` on all four changed files | **clean** (K-001 — `npm run lint` never used as a gate) |
| Diff size | **4 files, 72 insertions, 44 deletions** |

> A Jest teardown warning (*"A worker process has failed to exit gracefully"*) appears in the full-suite run. It is pre-existing hygiene noise unrelated to this diff, present with all suites passing.

### Budget reconciliation (design §14)

| Signal | Budgeted | Actual | Note |
| --- | --- | --- | --- |
| Tasks | 2 | **2** | ✅ |
| LOC | ≈ 75 | **116 total (72+/44−)**; ≈ 72 insertions | ≈ On target on insertions; total churn higher because inversions both add and delete |
| Review rounds | 1 | **4** (2 per task) | ⚠️ **Exceeded.** Both overruns were the same defect class — stale prose around correct assertions — and both were caused by an incomplete site list in `tasks.md`, not by implementation error |

**Not escalated as a tripwire:** Lite depth skips the budget check, and the overrun is in review rounds on a diff that is otherwise on-size. Recorded as information, and it is the most useful Kaizen signal from this run.

### Requirements closure

| Requirement | Status | Evidence |
| --- | --- | --- |
| R-W3B-001 (AC.1–AC.4) | ✅ | Red-before captured verbatim (6 failures, exactly the 6 new W3 assertions); green after; `SRV`/blank/`NON-BILATERAL` negatives intact at 6 survivors |
| R-W3B-002 AC.1 | ✅ | Fidelity gate asserts 198 / 166 / 32 and passes |
| R-W3B-002 AC.2 | ✅ | DD-2 `listProjectsForCoverage` test **byte-identical to `HEAD`**, verified at `-U15` context |
| R-W3B-002 AC.3 | ✅ | Full suite green; negatives inverted, never deleted |
| R-W3B-002 `AND IT MUST` (rendering unchanged) | ⏳ | Backend-only diff; covered by the **D-5 human check**, outstanding |
| NFR-W3B-001 | ✅ | Zero paths under `domain/entities/agresso-contract/`; `W3_FUNDING_PATTERN` has four repo-wide references, all in `project-selector.util.ts` |
| NFR-W3B-002 | ✅ | No claim of US6 delivery in either file |

### Outstanding — must not be silently dropped

1. **D-5 human check (RB-2) — NOT PERFORMED.** No automated gate can reach live CLARISA; this worktree has no `.env`. Recorded as outstanding, not omitted. Procedure in `tasks.md` T-02. **Pass condition is directional — W3 projects appear — not the literal 32** (K-013). **Observe the K-016 5-minute cache window**, or the check reads as "the fix did nothing".
2. **OQ-2** — MEL to confirm `SRV` stays excluded. Now carries a five-site footprint (advisory above).
3. **OQ-3** — rename `isBilateralFunding` → `isMappableFunding`. Deferred by D-W3B-3; would absorb three of the four recorded READABILITY advisories.
4. **Not committed.** Changes are in the working tree on `JuankCadavid/AC-1676`.

### Constitution Impact

**None.** No module created, no boundary moved, no public surface changed. No child guide needed, no `## Module Guides` index update, no CodeGraph re-index owed beyond the routine one `/akili-archive` recommends.
