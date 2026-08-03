# Tasks — project-dashboard / degree-chart-empty

- **Module:** agresso (server) + project-dashboard (client)
- **Spec id:** 2026-08-degree-chart-empty
- **Status:** not-started
- **Owner:** d.casanas@cgiar.org
- **Linked requirements:** `./requirements.md`
- **Linked design:** `./design.md`
- **Depth:** Lite + **Bug Mode** — T-01 is the mandatory regression task
- **Last updated:** 2026-08-03

---

## 1. Dependency graph

```
T-01 (regression test — must go RED)
  └─> T-02 (remove predicate + param — turns it GREEN)

T-03 (client note copy) — independent, no dependency
```

`T-03` touches only the client and may run in parallel with the server pair (cross-package parallelism is permitted; two tasks in the same package are not — root `CLAUDE.md` §4.3).

**Order matters for T-01 → T-02 and cannot be collapsed.** T-01's value is entirely in being observed failing against unmodified production code. Merged into T-02, it proves nothing.

---

## 2. Tasks

### T-01 — Rewrite the degree assertions to the corrected contract, and watch them fail

- **Requirements covered:** R-DCE-001
- **Defect classes gated:** DC-A (parameter shift), DC-B (stale-degree guard lost)
- **Files touched (intended):**
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/indicator-metadata-reports.repository.spec.ts`
- **Description:** Three existing assertions pin the *wrong* rule and currently pass. Invert them to the rule from R-DCE-001, then run the suite **against unmodified production code** and confirm it is red. No production file is touched in this task.
- **Implementation notes:**
  - `:311` — whole-`params` assertion becomes the **6-element** array: `[contractId, LONG_TERM, INDIVIDUAL, GROUP, GROUP, GROUP]`. This single assertion is the DC-A gate: a predicate removed without its parameter shifts every later value and reddens here.
  - `:330` — the "two operands" test becomes a single-operand test: `params[1]` is `SessionLengthEnum.LONG_TERM`. Drop the `SessionTypeEnum.TRAINING` expectation.
  - `:354` — in the branch-position test, invert the degree predicate assertions: `branches[2]` **must contain** `AND f.session_length_id = ?` and **must NOT contain** `AND f.session_type_id = ?`. Assert the two separately, keeping the existing discipline that either one failing alone reddens.
  - Add a bucketing case for the corrected semantic: a `degree` row whose count comes from an **Engagement + Long-term** record buckets into `sections.degree` exactly as before (the repository does not filter in TypeScript, so this pins that no post-query filtering is introduced).
  - Update the fixture comments that cite the old R-IMC-006 conjunction — they will otherwise describe a rule the file no longer asserts. **Leave the DC-12 positional-hazard comment intact**; it is still the reason the array is asserted whole.
  - Do **not** touch the `session_format`, `session_type`, `gender_individual`, or `gender_group` assertions.
- **Acceptance / done check:**
  - [ ] `npm test -- --silent indicator-metadata-reports.repository.spec` **FAILS**
  - [ ] The failure output names the `session_type_id` / `params` expectations — not an unrelated error, typo, or import failure
  - [ ] `git diff --stat` shows **only** the `.spec.ts` file
- **Evidence that does NOT count:**
  - A red suite whose failure is a compile error, a bad import, or a mistyped enum. That is a broken test, not a reproduced bug — read the failure text, do not just read the exit code.
  - Skipping this task and writing the assertions inside T-02. A test never seen red is **not** a regression test; per `design.md` §10 that outcome is reported as **inconclusive**, never as a pass.
- **Skills:** `nestjs-expert`, `tdd`
- **Estimated effort:** S
- **Status:** todo

---

### T-02 — Remove the `Training` predicate and its positional parameter

- **Requirements covered:** R-DCE-001, NFR-DCE-001, NFR-DCE-002
- **Defect classes gated:** DC-A, DC-B, DC-C
- **Files touched (intended):**
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/indicator-metadata-reports.repository.ts`
- **Description:** Delete `AND f.session_type_id = ?` from the `degree` branch of the Q2 union and delete `SessionTypeEnum.TRAINING` from `params`. Both, or neither — dropping only the predicate shifts the array and returns wrong rows **without erroring**.
- **Implementation notes:**
  - SQL `:317` and `params` `:372` — the array must end at **6** entries.
  - Remove the now-unused `SessionTypeEnum` import if nothing else in the file uses it (nothing does).
  - Update the doc comment above `getCapacitySharingMetadata` that describes the degree branch as a two-condition conjunction, and the `WHERE`-clause inline comment.
  - Keep everything else byte-identical: the CTE, `INNER JOIN degrees`, `GROUP BY`, the union-level `ORDER BY`, bucketing, and the `_debug` per-section log line.
  - **Do not** add `AND f.degree_id IS NOT NULL` (DD-2) and **do not** admit NULL `session_length_id` (DD-3).
- **Acceptance / done check:**
  - [ ] `npm test -- --silent indicator-metadata-reports.repository.spec` **PASSES** — the same command that was red in T-01, unedited
  - [ ] `npm test -- --silent` (full server suite) passes with **no other spec file modified** — DC-C
  - [ ] `npm run lint -- --quiet` clean. ⚠️ the script carries `--fix` and **mutates files** — re-check `git status` after
  - [ ] Production diff is **≤ 4 lines** excluding comments. More than that means the diagnosis was incomplete → **stop and escalate** (`design.md` §9 tripwire)
- **Evidence that does NOT count:**
  - The targeted spec passing while the full suite is unrun. The edited string is shared by all seven union branches; collateral damage shows up in sibling specs, not this one.
  - **Mutation check (falsifiability, KZ-004):** re-add `AND f.session_type_id = ?` **without** its param and confirm the suite goes red. If it stays green, the DC-A gate is not actually gating and T-01 must be fixed before this task can be called done. Restore afterwards.
- **Dependencies:** T-01 (must be red first)
- **Skills:** `nestjs-expert`, `systematic-debugging`
- **Estimated effort:** S
- **Status:** todo

---

### T-03 — Reword the Degree card's filter-scope note

- **Requirements covered:** R-DCE-002
- **Defect classes gated:** DC-D
- **Files touched (intended):**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/indicator-metadata-bands.mapper.ts`
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/indicator-metadata-bands.mapper.spec.ts`
  - `client/research-indicators/src/app/shared/interfaces/contract-full-reports.interface.ts` — comment only (added at execution: the implementation notes below already required this edit; the list omitted it)
- **Description:** `DEGREE_FILTER_SCOPE_NOTE` (`:81`) claims *"long-term **training** records"*, which becomes false once engagements count. Drop the word `training`; keep the sentence, the pill, and its position.
- **Implementation notes:**
  - New value: `Includes only long-term records with a recorded degree.`
  - Update the JSDoc above the constant — it cites `R-IMC-006 AC.4`; add the R-DCE-002 supersession reference so the next reader does not "restore" the old wording from the archived spec.
  - Also fix the stale comment on `contract-full-reports.interface.ts:163` (*"degree, long-term training only (R-IMC-006)"*) — comment only, no type change.
  - No component, template, token, layout, or state change. The card, its empty state, and the pill's position are untouched.
- **Acceptance / done check:**
  - [x] `npm test -- --silent indicator-metadata-bands.mapper.spec` passes with the new string asserted — 18/18 tests passed (process exit 1 is Jest's *global* coverage threshold on a filtered run, a structural artifact verified against `jest.config.ts`; see `execution.md` § T-03)
  - [x] `npm test -- --silent` (full client suite) passes — 306 suites / 6391 tests, exit 0
  - [x] `npm run lint -- --quiet` clean (⚠️ same `--fix` caveat) — `git status` identical before and after
  - [x] No `.html`, `.scss`, or component `.ts` file appears in the diff
- **Evidence that does NOT count:** a spec that asserts the constant equals itself (importing `DEGREE_FILTER_SCOPE_NOTE` and comparing it to `DEGREE_FILTER_SCOPE_NOTE`). The test must pin the **literal sentence**, or it cannot catch a future reword.
- **Dependencies:** none
- **Skills:** `angular-developer`, ~~`ui-ux-pro-max`~~ (Leader dropped `ui-ux-pro-max` at execution — no component, template, token, or layout change in this task; see `execution.md` § Document Control)
- **Estimated effort:** S
- **Status:** **[x] done** — Reviewer PASS on attempt 1, 2026-08-03 (`execution.md` § T-03)

---

## 3. Manual gate — owner, after T-02

**Not a task. Not automatable. Required before this spec closes.** DC-D and DC-E have no jest gate, and DC-D is the exact drift that caused this bug.

| Check | Expected |
| --- | --- |
| `GET /api/agresso/contracts/reports/full?contract-id=A100` | `degree` contains `PhD` (from `STAR-3422`) — no longer `[]` |
| `project-detail/A100/project-dashboard` → Degree card | renders the bar; the empty state is gone |
| Card note vs. applied SQL | the sentence describes **long-term + has a degree**, and that is what the query does |
| A second contract with familiar Degree numbers | counts may **rise** — long-term engagements and historical imports now qualify. Expected (`design.md` §7), not a new defect |

---

## 4. Estimate and PR strategy

| | |
| --- | --- |
| Tasks | **3** |
| Net LOC changed | **~45** — production ~4, the rest specs and copy |
| Review rounds | **1** |

**Single PR.** Far below the ~400 LOC split threshold, and the server fix and the client copy are two halves of one claim — the note must not describe a filter the merged query does not apply. Splitting them would ship a true query with a false label, or the reverse.

**PR description should lead with** the three-row table from `requirements.md` §1 (capture rule vs. report rule vs. the failing record), since the one-line diff is unreviewable without it — and state plainly that it **supersedes R-IMC-006 AC.1**, so a reviewer who knows that AC does not read the inverted tests as a mistake.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
