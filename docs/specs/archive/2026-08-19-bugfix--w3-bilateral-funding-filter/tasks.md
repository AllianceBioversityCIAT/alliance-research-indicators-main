# Tasks — clarisa / W3-Bilateral Funding Filter

- **Module:** clarisa
- **Spec id:** 2026-08-w3-bilateral-funding-filter
- **Status:** completed
- **Owner:** Juan Carlos Cadavid
- **Linked requirements:** [./requirements.md](./requirements.md)
- **Linked design:** [./design.md](./design.md)
- **Last updated:** 2026-08-19
- **Budget (design §14):** 2 tasks · ≈ 75 LOC · 1 review round

---

## 1. Dependency graph

```
T-01 (predicate + its unit spec — Bug Mode evidence)  ──►  T-02 (realign the two downstream suites)
```

T-02 **must** follow T-01: its suites are red until the predicate changes, and running them first produces a failure that looks like a defect but is the plan working.

---

## 2. Task list

### T-01 — Widen the funding predicate and invert its own negatives

- **Requirements covered:** R-W3B-001 (all four ACs, the full scenario, its `BUT it must NOT` and `AND IT MUST` clauses); NFR-W3B-001 (no-touch clause)
- **Design references:** §5 (rules), D-W3B-1, D-W3B-2, D-W3B-3
- **Files touched (intended):**
  - `server/researchindicators/src/domain/tools/clarisa/projects/utils/project-selector.util.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/utils/project-selector.util.spec.ts`
- **Skills:** `nestjs-expert`, `systematic-debugging`, `tdd`
- **Effort:** S
- **Status:** done

**Description.** Add a W3-family constant next to `BILATERAL_FUNDING_PREFIX` and widen `isBilateralFunding` to accept `BILATERAL*` **or** the W3 family, per design §5. Then invert the five stale W3 negatives in the sibling spec and add the no-space `window3` case. This is the task that changes the buggy code path, so **the Bug Mode red-before/green-after evidence belongs here** and nowhere else.

> **⚠ Site-list correction (Leader decision L-1, 2026-08-19 — recorded during execution).** This work order originally named only the `negative excluded values` describe block. `project-selector.util.spec.ts` contains a **second** affected block — `describe('Bug-Mode Regression Suite: Production-Shaped Dataset …')` at ~`:397`, whose own production fixture holds 5 W3 rows (`501–505`) plus an `SRV` row (`506`) and asserts an eligible count. It goes **25 → 30** and its `Window 3` exclusion assertions invert. There are therefore **two** production-shaped 25-count blocks in this repo, in two different files: this one, owned by T-01, and the one in `clarisa-projects.service.spec.ts`, owned by T-02. Both go 25 → 30, and **neither becomes 32** — the live 25 → 32 figure counts 7 restricted projects in the real feed and is unrelated to either synthetic fixture.

**Implementation notes.**
- Keep `normalizeToken` unchanged — it already supplies trim, collapse, upper-case.
- Two separate branches (D-W3B-1): Bilateral keeps its **open** `startsWith` prefix; W3 gets an **anchored** pattern so `W3` does not admit `W3X`.
- Cover the optional `- RESTRICTED` suffix with free dash spacing, as `BILATERAL- RESTRICTED` already demonstrates upstream.
- **Invert the negatives; delete none** (D-W3B-2 / KZ-001). `SRV`, `''`, `'   '`, `null`, `undefined`, `NON-BILATERAL` stay asserted `false`. The `describe` title `'negative excluded values (OQ-A, R-BAS-001)'` should be re-stated to say which exclusions survive, since `OQ-A` is superseded — but the assertions inside it must survive as `false` cases, only the W3 ones moving to a positive block.
- **Do not rename** `isBilateralFunding` (D-W3B-3). OQ-3 is a follow-up.
- ⚠️ **No-touch:** `server/…/domain/entities/agresso-contract/agresso-contract.service.ts` contains a **local `const isBilateralFunding`** inside `isBilateralTagTarget`. A symbol grep lands on it. Editing it violates NFR-W3B-001 and must not appear in the diff.

**Named inputs that make the gate red, before the test is written (K-012).**

| Input | Before fix | After fix |
| --- | --- | --- |
| `isBilateralFunding('Window 3 - Restricted')` | `false` — **must be observed red** | `true` |
| `isBilateralFunding('window3')` | `false` — **must be observed red** | `true` |
| `isBilateralFunding('SRV')` | `false` | `false` — **must stay** |
| `isBilateralFunding('BILATERAL- RESTRICTED')` | `true` | `true` — **must stay** |

**Verification.**
```
cd server/researchindicators
npx jest src/domain/tools/clarisa/projects/utils/project-selector.util.spec.ts --silent
npx eslint src/domain/tools/clarisa/projects/utils/project-selector.util.ts
```
Run the jest command **twice**: once on `HEAD` with only the new/inverted assertions applied (expect **red**, capture the output), then again after the predicate edit (expect **green**).

**What would make this check FAIL** (so it is evidence, not decoration):
- A predicate that `return true`s unconditionally → the `SRV` assertion reds.
- A predicate matching only the literal `'WINDOW 3'` → the `window3` assertion reds.
- A predicate using `includes('W3')` → admits `W3X`-style values; prevented by the anchored pattern in D-W3B-1.

**What disqualifies this evidence.**
- **If the new W3 assertions pass on `HEAD` before the predicate is edited, they are not evidence** — they assert something already true. Stop and report; do not proceed to T-02.
- **If the red-before run was never executed** — only the post-fix green — the red-before claim is *unverified*. Report it as unverified rather than asserting it. An inconclusive verification is a legitimate outcome.
- `npm run lint` is **not** an acceptable substitute for `npx eslint`: it carries `--fix`, mutates the file, and cannot verify (K-001).

**What this evidence cannot prove.** A green unit suite proves the predicate's **return value**. It does **not** prove that the picker offers the projects, that the cohort moved by the measured amount, or that anything changed against live CLARISA. Those are T-02 and the D-5 human check.

**Done check.**
- [x] The two W3 inputs above were observed **red on `HEAD`**, output captured in `execution.md`
- [x] Both are green after the predicate edit
- [x] `SRV`, `''`, `'   '`, `null`, `undefined`, `NON-BILATERAL` still assert `false` — **count of negative assertions did not decrease** (6 survivors → 6)
- [x] All five pre-existing Bilateral spellings still assert `true`
- [x] `git diff --name-only` contains **no** path under `domain/entities/agresso-contract/`
- [x] `isBilateralFunding` is still named `isBilateralFunding`
- [x] `npx eslint` clean on the changed util

---

### T-02 — Realign the two downstream suites to the widened cohort

- **Requirements covered:** R-W3B-002 (all three ACs, the scenario, its `BUT it must NOT` and `AND IT MUST` clauses); NFR-W3B-001 (no-touch clause); NFR-W3B-002 (doc clause)
- **Design references:** §2.1, §9, §10, D-W3B-4, D-W3B-5
- **Dependencies:** T-01
- **Files touched (intended):**
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.service.spec.ts`
  - `server/researchindicators/src/domain/tools/clarisa/stub/clarisa-stub.fidelity.spec.ts`
- **Skills:** `nestjs-expert`, `systematic-debugging`
- **Effort:** M
- **Status:** done

**Description.** Re-state the downstream expectations that encoded W3 exclusion, and move the fidelity gate's counts to the re-measured values. These suites go red the moment T-01 lands; that redness is the plan, and each red is a named, expected one.

**Scope — `clarisa-projects.service.spec.ts` (6 sites to change, 1 to protect).**

| Test (locate by title) | Change |
| --- | --- |
| `filters to source_of_funding === "Bilateral" led by the Alliance (ABC)` | `window3Project(2)` is now eligible → expected ids `[1, 3]` become `[1, 2, 3]`; the title's `=== "Bilateral"` framing is now wrong and must be re-stated |
| `bug-mode regression: returns all 25 eligible production-shaped projects…` | The 5 synthetic W3 rows (ids 501–505) become eligible → `toHaveLength(25)` becomes **`30`**, and the title's `25` needs re-stating. **`SRV` (506), null (601) and blank (602) stay excluded.** ⚠️ **`30`, not `32`** — the live 25→32 figure counts 7 restricted projects in the real feed; this synthetic fixture holds one row per spelling. The two `25`s are a coincidence |
| `logs a warning naming CLARISA host when zero projects are eligible (R-BAS-006)` | Its payload is W3-only, which is now eligible, so the warning no longer fires. Give it a genuinely ineligible payload (`SRV`, or non-Alliance) rather than deleting the test — the warning is still required behavior (design §9) |
| `omits a year whose projects exist but none are eligible (non-Alliance / non-bilateral)` | Its "ineligible" row is `Window 3`; swap for a genuinely ineligible funding so the test keeps testing what it claims |
| `deserializes fields-absent payload and existing consumers return pre-change results (AC.1)` | Contains a `Window 3` row whose exclusion is load-bearing for the pinned result |
| `regression: listBilateralProjects returns an identical pinned id set before and after change (AC.3)` | The pinned set includes `window3Project(503)` as excluded; the pin moves |
| `does NOT filter by source_of_funding …, retaining window3 and empty mappings (DD-2)` | **DO NOT MODIFY.** It exercises `listProjectsForCoverage`, which never calls the predicate. It must pass **unmodified** — that is R-W3B-002 AC.2 |

**Scope — `clarisa-stub.fidelity.spec.ts` (4 sites).** Re-measured offline this session against the committed fixture (198 rows, vocabulary exactly `{bilateral: 170, window3: 28}`):

| Site | From | To |
| --- | --- | --- |
| `assertHasScienceProgramsCount` threshold + message | `140` | `166` |
| `has_science_programs is true for exactly 140 of the 170 eligible…` — title, `toHaveLength`, `toBe`, and the residual | `170` / `140` / `30` | `198` / `166` / `32` |
| K-004 mutation 1 assertion | `/has_science_programs true count: expected 140, got 170/` | `/has_science_programs true count: expected 166, got 198/` |
| File-header prose citing the eligible cohort | `170` | `198` |

**Implementation notes.**
- **Re-state titles, do not just change numbers.** A test titled `filters to source_of_funding === "Bilateral"` that now expects a W3 row is a lie the next reader will trust.
- **D-W3B-5 — keep the mutation regex strict.** Update *both* numbers. Do not relax to `/expected/`: that drops the pin on *which* divergence was reported, leaving the assertion satisfiable by any thrown message.
- **D-W3B-4** — the archived `2026-08-19-bilateral--clarisa-fixture-stub` document keeps its recorded 170/140 as a point-in-time record. **Do not edit anything under `docs/specs/archive/`.**
- **NFR-W3B-002** — add no claim anywhere that US6 (the external W3 Registry sync) is delivered. It is not.
- ⚠️ **No-touch:** `agresso-contract.service.ts` and `bilateral-mapping-coverage.service.spec.ts`. Neither reaches the predicate; a change to either means the fix went somewhere it should not.

**Named input that makes the gate red (K-012).** Apply T-01's predicate change and run the full suite **without** touching the fidelity spec: `assertHasScienceProgramsCount` throws `expected 140, got 166`. That red is the proof the fidelity gate is actually wired to the shipped predicate rather than to a parallel reimplementation.

**Verification.**
```
cd server/researchindicators
npm test -- --silent
npx eslint src/domain/tools/clarisa/projects/clarisa-projects.service.spec.ts src/domain/tools/clarisa/stub/clarisa-stub.fidelity.spec.ts
grep -c 'expected 166, got 198' src/domain/tools/clarisa/stub/clarisa-stub.fidelity.spec.ts   # must print exactly 1
git diff --stat -- docs/specs/archive/                                                        # must print nothing
```

**What would make these checks FAIL:**
- Leaving the fidelity spec untouched → `expected 140, got 166`.
- Relaxing the mutation regex → the `grep -c` prints `0`.
- Deleting negative assertions instead of re-stating them → the `SRV`/blank cases vanish and D-2's guard is gone; caught by T-01's non-decreasing-negatives check, re-verified here.
- Editing an archived spec → the `git diff --stat` gate prints a path.

**What disqualifies this evidence.**
- **A full-suite run performed while any other full-suite run is active is not evidence.** Two concurrent `npm test` runs across the two packages have twice produced phantom failures in `excel-workbook.builder.spec.ts` — a defect neither run caused. If a failure appears in a suite unrelated to CLARISA, **re-run in isolation before reporting it** (root `CLAUDE.md` §4.3).
- **A green suite does not prove the live picker changed.** It proves the expectations and the code agree. The live movement is **D-5**, which has no automated gate.
- Reporting `npm run lint` as the lint gate (K-001).

**What this evidence cannot prove — and the substitute (D-5).** No suite in this repo can reach live CLARISA; this worktree has no `.env`. The human check at the HITL pause is:

1. Ensure `ARI_CLARISA_HOST` is set and the app restarted **or** at least 5 minutes have elapsed since the last config change — `ClarisaProjectsService` caches for **5 minutes**, so a check inside that window reads as "the fix did nothing" (**K-016**).
2. Open `/administration/center-admin/bilateral-mapping` → **New mapping** → **CLARISA Project**.
3. Search a project whose funding is `Window 3 - Restricted`. **Expected:** it is offered.
4. Confirm the picker's labels, layout, and empty state are visually unchanged — only the option count differs (R-W3B-002's `AND IT MUST` clause).

**The pass condition is directional — W3 projects appear — not the literal 32.** CLARISA published 78 new phase-2026 projects within 24 hours of the 2026-08-19 capture, so treating `32` as an exact gate would red on a healthy feed (**K-013**).

**Done check.**
- [x] `npm test -- --silent` green, run in isolation with no other suite active — **329/329 suites, 2352/2352 tests**, Leader-re-measured
- [x] The pre-fidelity-edit red was observed and captured in `execution.md` — actual message `expected 140, got 198 (eligible cohort size 198)`
- [x] Every re-stated test **title** matches what it now asserts (cost one review round; see L-4)
- [x] `grep -c 'expected 166, got 198'` prints `1`
- [x] The `listProjectsForCoverage` / `DD-2` test is **byte-identical** to `HEAD` (verified at `-U15`)
- [x] `git diff --name-only` contains no path under `docs/specs/archive/`, `domain/entities/agresso-contract/`, or `bilateral-mapping-coverage.service.spec.ts`
- [x] The D-5 human check is **explicitly recorded as NOT YET PERFORMED** (execution.md → Outstanding #1). Not silently omitted

---

## 3. Coverage closure

Clause-level, not ID-level. Each row quotes the clause it claims.

| Requirement | Clause | Owner |
| --- | --- | --- |
| R-W3B-001 | THEN `Window 3 - Restricted` → `true` | T-01 |
| R-W3B-001 | AND `Window 3`, `WINDOW 3 - RESTRICTED`, `Windows 3`, `window3`, `W3` | T-01 |
| R-W3B-001 | **BUT NOT** `SRV`, `''`, `'   '`, `null`, `undefined`, `NON-BILATERAL` | T-01 |
| R-W3B-001 | **AND IT MUST** keep all five Bilateral spellings | T-01 |
| R-W3B-001 | AC.1 red-before/green-after · AC.2 SRV both ways · AC.3 `window3` · AC.4 positives | T-01 |
| R-W3B-002 | THEN 198 eligible / 166 science / 32 non-science | T-02 |
| R-W3B-002 | **BUT NOT** change `listProjectsForCoverage` | T-02 (byte-identical check) |
| R-W3B-002 | **AND IT MUST** leave rendering, labels, empty state unchanged | T-02 (D-5 step 4) |
| R-W3B-002 | AC.1 fidelity · AC.2 coverage unmodified · AC.3 full suite, inverted not deleted | T-02 |
| NFR-W3B-001 | AGRESSO untouched | T-01 + T-02 no-touch clauses |
| NFR-W3B-002 | US6 not claimed closed | T-02 doc clause |

---

## 4. Estimated LOC & PR strategy

| Item | LOC |
| --- | --- |
| `project-selector.util.ts` | ~10 |
| `project-selector.util.spec.ts` | ~15 |
| `clarisa-projects.service.spec.ts` | ~40 |
| `clarisa-stub.fidelity.spec.ts` | ~10 |
| **Total** | **≈ 75** |

**Single PR.** Well under the ~400 LOC split threshold, and splitting would land a predicate change whose downstream suites are red — a broken intermediate commit for no reviewer benefit. Title: `fix(clarisa-projects): admit Window 3 funding in the W3/Bilateral picker`.

**For the reviewer:** read `project-selector.util.ts` first — it is the whole behavior change. Everything else is expectation realignment. The one thing worth auditing closely is that the negative assertions were **inverted, not deleted**.

---

## 5. Risks & blockers log

| # | Date | Risk / Blocker | Mitigation | Status |
| --- | --- | --- | --- | --- |
| RB-1 | 2026-08-19 | Symbol collision: a local `const isBilateralFunding` exists in `agresso-contract.service.ts` | No-touch clause + `git diff --name-only` gate in both tasks | open |
| RB-2 | 2026-08-19 | D-5 has no automated gate; live CLARISA unreachable offline | Human check at HITL, directional pass condition, K-016 cache window stated | **open — NOT PERFORMED, see execution.md Outstanding #1** |
| RB-3 | 2026-08-19 | The synthetic `25` and the live `25` are unrelated; a careless edit makes the synthetic expect `32` | T-02's site table states `30` and says why | **closed** — both synthetic blocks landed at `30` |
| RB-4 | 2026-08-19 | The `tasks.md` site table both over- and under-predicted: 3 named sites were already green (their `window3Project` fixtures were never Alliance-affiliated), and 1 red site was unnamed | Found by measurement, not by the list. Corrected in execution.md T-02 | **closed** |
| RB-5 | 2026-08-19 | The fidelity cohort is now 198-of-198, so that assertion no longer discriminates — D-2 (over-widening) has no guard at the fidelity layer | Rests on the `SRV`/blank negatives in `project-selector.util.spec.ts`, now load-bearing. Add one ineligible fixture row if the fixture is regenerated | **open (advisory)** |

---

## 6. Done definition

- [x] T-01 and T-02 both `done`
- [x] All R-W3B-001 and R-W3B-002 ACs checked (R-W3B-002's rendering clause rides on the outstanding D-5 check)
- [x] `npm test -- --silent` green in isolation, 2352/2352
- [x] Red-before evidence for both tasks captured in `execution.md`
- [x] D-5 human check explicitly recorded as **outstanding**
- [x] OQ-2 (MEL on `SRV`, now five sites) and OQ-3 (rename) carried forward
- [x] No file under `docs/specs/archive/` modified
