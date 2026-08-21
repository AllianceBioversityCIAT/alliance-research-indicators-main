# Execution — project-dashboard / degree-chart-empty

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/degree-chart-empty/` |
| Spec id | 2026-08-degree-chart-empty |
| Depth | **Lite** + **Bug Mode** |
| Owner | d.casanas@cgiar.org |
| Branch | `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator` |
| Execution started | 2026-08-03 |
| Leader model | Opus 5 (T1 — matches the registry's T1 binding) |
| Approval mode | **not pre-approved** — the proposal's Document Control carries no `Approval Mode` field, so every continue/pause gate stops for the owner |
| Budget (`design.md` §9) | 3 tasks · ~45 net LOC (production ~4) · 1 review round |

### Delegation decision (recorded at Step 0)

This session carries a standing operating policy that forbids spawning subagents unless the user asks — the same policy that forced `design.md`'s Step 2.3 reversion challenge to run inline (see its **Delegation note**). `/akili-execute` is structurally a Leader → Implementer → Reviewer triad, and its Reviewer half cannot be collapsed inline without breaking `author ≠ auditor`.

The Leader surfaced the conflict before spawning anything and the owner chose the **full triad**. Consequently:

- Implementers run on the `akili-implementer` wrapper (T2 / `sonnet`).
- Reviewers run on the `akili-reviewer` wrapper (T3 / `opus`, read-only `Read`/`Grep`/`Glob`).
- `author ≠ auditor` is enforced by configuration on both axes (different model, fresh context, no write tools).

No waiver was needed and none is recorded.

### Leader skill deviations from `tasks.md`

| Task | Task file recommended | Leader assigned | Reason |
| --- | --- | --- | --- |
| T-01 | `nestjs-expert`, `tdd` | unchanged | — |
| T-03 | `angular-developer`, `ui-ux-pro-max` | `angular-developer` only | No component, template, token, or layout change — a string constant, two comments, one test assertion. A UI-design skill on a copy edit is cost without leverage. |

### Leader effort assignments

| Task | Effort | Reason |
| --- | --- | --- |
| T-01 | `high` | Well-specified, but the task's entire value rests on producing the *right* red. Misreading the failure invalidates T-02's gate. |
| T-03 | `medium` | Mechanical copy edit; the one judgement call is replacing a tautological assertion. |

### Parallelism decision

T-01 (server) and T-03 (client) were spawned **concurrently**. They pass both independence tests in `.agents/leader.md`: different files, and — per that file's ARI-specific note — the two packages have separate `node_modules`, build outputs, and ports. T-02 was **not** parallelized: it depends on T-01 being observed red first, and that ordering cannot be collapsed.

Concurrent width: **2**, within the default ceiling.

---

## 2. Task Execution History

_Entries are appended on Reviewer verdict. Evidence is written here before any `tasks.md` checkbox is flipped._

---

### T-03 — Reword the Degree card's filter-scope note

| Field | Value |
| --- | --- |
| Final status | **PASS** |
| Date | 2026-08-03 |
| Implementer attempts | **1** |
| Requirements covered | R-DCE-002 (and NFR-DCE-002 on the client side) |
| Defect classes gated | DC-D |
| Implementer | `akili-implementer` (T2 / `sonnet`), effort `medium`, skills `angular-developer` |
| Reviewer | `akili-reviewer` (T3 / `opus`, read-only) — `author ≠ auditor` satisfied on both axes |

#### Attempt 1

**Files changed**

| File | Change |
| --- | --- |
| `client/.../project-dashboard/indicator-metadata-bands.mapper.ts` | `DEGREE_FILTER_SCOPE_NOTE` → `Includes only long-term records with a recorded degree.`; JSDoc gains an explicit R-DCE-002 supersession warning against restoring `training` |
| `client/.../project-dashboard/indicator-metadata-bands.mapper.spec.ts` | Tautological `toBe(DEGREE_FILTER_SCOPE_NOTE)` replaced with a literal-sentence pin; now-dead import removed |
| `client/.../shared/interfaces/contract-full-reports.interface.ts` | Stale comment at `:163` corrected (comment only — `degree: IndicatorMetadataCount[]` untouched) |

Diff: 3 files, +14 / −5.

**Verification** (all from `client/research-indicators/`)

| Command | Result |
| --- | --- |
| `npm test -- --silent indicator-metadata-bands.mapper.spec` | 1 suite / **18 tests passed**. Process exit **1** — see the note below |
| `npm test -- --silent` (full client suite) | **306 suites / 6391 tests passed**, exit 0 |
| `npm run lint -- --quiet` | "All files pass linting", exit 0. `git status` **identical** before and after — the `--fix` flag mutated nothing |

**On the targeted suite's exit code 1 — adjudicated, not waved through.** The Implementer attributed it to Jest's global coverage thresholds rather than a test failure. The Reviewer verified that claim against config independently: `jest.config.ts` sets `collectCoverage: true` with a project-wide `collectCoverageFrom` glob and a **global** `coverageThreshold` (statements 40 / branches 20 / lines 45 / functions 30). Any run narrowed by test-path pattern therefore reports every file in the glob — the un-exercised ones at 0% — and necessarily trips the global thresholds regardless of the change under test. The artifact is structural. Because the thresholds are global rather than per-file, the **full-suite** run (exit 0) is the conclusive coverage evidence and substitutes cleanly. Recorded as *explained*, not as *explained away*.

**Reviewer verdict: `STATUS: PASS`**

> T-03 implements R-DCE-002 exactly as designed — the note becomes `Includes only long-term records with a recorded degree.` (byte-identical to `design.md` §6), the tautological spec assertion is replaced by a literal-string pin that actually gates DC-D, and the stale interface comment named in T-03's implementation notes is corrected without touching the type. All three acceptance checks are met with conclusive evidence; the one factual error in the Implementer's narrative (the import-removal justification) does not affect conformance.

Reviewer findings on the five questions it was asked:

1. **R-DCE-002 conformance** — satisfies all three scenario clauses: no session-type restriction, single sentence, and the leading `Includes only` preserves the anti-"all degrees" function `design.md` DD-5 requires survive. Byte-identical to `design.md` §6's `After` row. Pill position untouched (`mapper.ts:261` not in the diff).
2. **The assertion is now a real gate** — the mapper assigns `filterScopeNote` *from* the constant, so the old `toBe(DEGREE_FILTER_SCOPE_NOTE)` was structurally incapable of failing on any reword. The literal pin would redden on a restoration of `training`.
3. **Third file is in scope** — T-03's *implementation notes* authorize `contract-full-reports.interface.ts:163` verbatim. The task's *Files touched (intended)* list is simply incomplete relative to its own notes: a spec bookkeeping gap, not Implementer scope creep. NFR-DCE-002 holds.
4. **Exit code 1** — sound and independently checkable from config (see above).
5. **Budget tripwire** — inside the allowance. `design.md` §9's tripwire scopes to the *server* SQL and `params` (§2 rows 1–2); this diff contains no server change. No `.html`, `.scss`, component `.ts`, token, layout, or state change. No hex literals, no `HttpClient`, no NgRx, no auth surface.

**Correction recorded (KZ-007 — a correction record is the highest-risk artifact class, so this one names what it was verified against).** The Implementer's report claimed removing the `DEGREE_FILTER_SCOPE_NOTE` import "was necessary to keep lint clean (unused-import rule)". That is **false**: `client/research-indicators/eslint.config.js:9` ignores `**/*.spec.ts`, and `tsconfig.json` sets no `noUnusedLocals`, so nothing would have flagged the dead import. The removal was correct hygiene, not a forced consequence. Verified by the Reviewer against those two config files. **Non-gating** — the edit lands in a file T-03 explicitly authorizes and `grep` confirms zero remaining references — but the loop's evidence must be true, so the retracted claim is quoted here beside the correction rather than overwritten.

#### ADVISORY (4R lenses — recorded, never gating)

The Reviewer raised no advisory findings requiring action. Its one Leader-directed note is handled below.

#### Leader actions taken

- **`tasks.md` bookkeeping reconciled.** Acting on the Reviewer's closing note, T-03's *Files touched (intended)* list was corrected to include `contract-full-reports.interface.ts`, which its own implementation notes already required editing. This is a documentation-accuracy fix to an approved task's file list — **not** new scope, and no new task was minted.

#### Issues encountered

None. First-attempt PASS, matching the `design.md` §9 budget of one review round.

#### Open item carried (not closed by this task)

Per `requirements.md` §6 **DC-D**, no automated check proves the new sentence is *true of the SQL*. That link is human-verified at the manual gate in `tasks.md` §3 and is an **accepted risk** recorded in the spec — it is explicitly not something T-03 closes.

---

### T-01 — Rewrite the degree assertions to the corrected contract, and watch them fail

| Field | Value |
| --- | --- |
| Final status | **PASS** |
| Date | 2026-08-03 |
| Implementer attempts | **1** (plus one Leader-initiated lint-hygiene addendum — see below; not a rework attempt) |
| Requirements covered | R-DCE-001 |
| Defect classes gated | DC-A (positional parameter shift), DC-B (stale-degree guard) |
| Implementer | `akili-implementer` (T2 / `sonnet`), effort `high`, skills `nestjs-expert` + `tdd` |
| Reviewer | `akili-reviewer` (T3 / `opus`, read-only) — `author ≠ auditor` satisfied on both axes |

#### The inverted success condition

T-01's deliverable is a **deliberately failing** suite: it edits only a `.spec.ts`, touches no production code, and its acceptance criterion is that the targeted suite **FAILS** with the failure naming the `session_type_id` / `params` expectations. Both the Implementer brief and the Reviewer brief stated this inversion explicitly, because an Implementer's default instinct is to make red things green — and doing so here would have destroyed the gate.

#### Attempt 1

**Files changed:** `server/.../agresso-contract/repositories/indicator-metadata-reports.repository.spec.ts` only. Diff: 1 file, +55 / −32. Production file confirmed unmodified.

**Verification** (from `server/researchindicators/`): `npm test -- --silent indicator-metadata-reports.repository.spec` → **FAIL, 3 failed / 12 passed / 15 total** — as required.

**Verbatim failure output (the evidence the whole spec hangs on)**

```
● … › binds all 6 parameters in the exact SQL placeholder order — degree keeps only its Long-term operand (R-DCE-001; DC-A gate…)

    expect(received).toEqual(expected) // deep equality
    - Expected  - 0
    + Received  + 1
    @@ -1,7 +1,8 @@
      Array [
        "A9001",
    +   1,
        2,
        1,
        2,
        2,
        2,
      320 |       expect(params).toEqual([

● … › binds the degree branch's single Long-term operand to SessionLengthEnum.LONG_TERM at the placeholder position…

    expect(received).toBe(expected) // Object.is equality
    Expected: 2
    Received: 1
    342 |       expect(params[1]).toBe(SessionLengthEnum.LONG_TERM);

● … › gates the degree branch's single Long-term predicate (and the absence of the superseded session-type predicate)…

    expect(received).not.toContain(expected) // indexOf
    Expected substring: not "AND f.session_type_id = ?"
    Received string:        "SELECT 'degree' AS section, l.degree_id AS id, l.name AS name, COUNT(*) AS count FROM result_capacity_sharing f INNER JOIN contract_results cr ON cr.result_id = f.result_id INNER JOIN degrees l ON l.degree_id = f.degree_id WHERE f.is_active = TRUE AND f.session_type_id = ? AND f.session_length_id = ? GROUP BY l.degree_id, l.name"
    391 |       expect(branches[2]).not.toContain('AND f.session_type_id = ?');
```

**Reviewer verdict: `STATUS: PASS`**

> T-01 delivers the intended red — all three failures are verified genuine disagreements with unmodified production code (`session_type_id` predicate at repository.ts:317, `SessionTypeEnum.TRAINING` at :372), not compile or import errors, satisfying the No-pass clause in `requirements.md` §6. The corrected contract matches `design.md` §5 exactly, DC-B is gated more strongly than before (branch-scoped rather than whole-SQL), and the sibling sections are untouched.

**The No-pass clause is satisfied — and here is what was executed to satisfy it** (KZ-008: "verified" without recorded execution is a trap). The Reviewer independently read the unmodified production file and the three enums, and derived that production binds `['A9001', 1, 2, 1, 2, 2, 2]` — byte-for-byte the "Received" in the evidence above. It further counted **15 `it()` blocks** in the file (1 + 6 Q1 + 8 Q2) against the reported `3 failed, 12 passed, 15 total`; a broken import or type error would have zeroed the file rather than failing 3 of 15. The red is therefore a genuine behavioural disagreement, not a broken test.

**DC-A is two-sided, and the Reviewer identified which assertion catches which mutation** — worth recording because T-02's mutation check depends on it:

| Mutation | Assertion that reddens |
| --- | --- |
| Predicate removed, parameter kept (the DC-A hazard) | The whole-`params` array assertion — 7 entries instead of 6, and `params[1]` is `1` not `2` |
| Predicate re-added, parameter not (T-02's prescribed mutation check) | `expect(branches[2]).not.toContain('AND f.session_type_id = ?')` — the array stays valid, so **only** the SQL-text negative catches this |

Both must survive for the pair to remain two-sided. T-02's mutation check will genuinely gate.

**DC-B was strengthened, not weakened.** The diff deletes two whole-SQL `squashed.toContain(...)` assertions and replaces them with `branches[2]`-scoped equivalents plus a negative assertion that did not previously exist. The Reviewer's judgement: the deleted form would have stayed **green** if `AND f.session_length_id = ?` had migrated to a different union branch; the branch-scoped form cannot. Coverage is strictly stronger. `expect(branches).toHaveLength(7)` correctly stays at 7 — the fix removes a predicate, not a branch (NFR-DCE-001).

**DC-C confirmed.** The `session_format`, `session_type`, `gender_individual`, and `gender_group` assertions and the two closing tests are byte-identical to pre-diff. The only sibling-adjacent change is a `DC-2` → `DC-B` token in one test title, which touches no assertion.

**Comment scope — inside the instruction.** The DC-12 positional-hazard rationale survives in substance in all three places it lives (the untouched docstring block, the retained "shift every later value" comment, and a restatement at the new branch assertions), and the literal token `DC-12` still appears at three other lines. The Implementer's self-flagged wider comment edits were **required**, not creep: leaving them would have left the file asserting one rule while documenting the opposite — the exact drift the instruction exists to prevent.

#### Addendum — Leader-initiated lint hygiene (not a rework attempt, does not consume the 3-attempt ceiling)

The Reviewer's ADVISORY block flagged that the now-dead `SessionTypeEnum` import leaves server lint red. **The Leader verified this independently before acting, and found more than the advisory reported** — executed read-only, `npx eslint <file>` with no `--fix`, so nothing was mutated:

```
  8:10   error  'SessionTypeEnum' is defined but never used. Allowed unused vars must match /^_/u   @typescript-eslint/no-unused-vars
330:8   error  Replace `'binds·the·degree·branch\'s…'` with `"binds·the·degree·branch's…"`          prettier/prettier
352:8   error  Replace `'gates·the·degree·branch\'s…'` with `"gates·the·degree·branch's…"`          prettier/prettier

✖ 3 problems (3 errors, 0 warnings)
```

Three errors, not one. The two prettier errors — new test titles written as single-quoted strings containing escaped apostrophes — were missed by both the Implementer and the Reviewer, and they are **autofixable**, which is what makes this urgent rather than cosmetic: `package.json`'s `lint` script is `eslint "{src,apps,libs,test}/**/*.ts" --fix`, so T-02 running its acceptance box 3 would have silently rewritten two lines of T-01's file *and still* failed on the non-autofixable import. That surfaces as an inexplicable T-02 failure caused by T-01 — precisely the class of cross-task contamination the child guide's `--fix` warning exists for.

**Why this is not advisory-driven scope growth** (the *Advisory Never Becomes A Task* rule): no task was minted and no task was widened. Lint-clean on touched code is a standing requirement of root `CLAUDE.md` §4.3, independent of any advisory; the advisory only located the breach. The work is a two-line deletion/quote fix inside the single file T-01 already owns.

Routed back to the **original T-01 Implementer** (author fixes its own artifact; the Leader wrote no code) with a hard constraint: the suite must remain red with the **identical three failures**, since neither edit may touch an assertion.

**Addendum result — resolved.** The Implementer changed exactly three lines: deleted the dead import at `:8`, and switched the two test titles at `:329`/`:351` from single- to double-quoted strings (quote style only, **no wording change** — the titles are spec-traceable and were audited as written).

| Check | Result |
| --- | --- |
| `npx eslint <file>` (read-only, Implementer) | zero problems |
| `npx eslint <file>` (read-only, **Leader re-verified**) | **CLEAN — zero problems** |
| `npm test -- --silent indicator-metadata-reports.repository.spec` | still **`3 failed, 12 passed, 15 total`** — the identical three failures |
| `git diff --stat` (server) | 1 file, +55 / −33 — only the `.spec.ts` |

**The critical check passed: the red is unchanged.** Neither edit may touch an assertion, so the failure set had to stay identical — and it did: the whole-`params` array mismatch, `params[1]` Expected `2` / Received `1`, and `not.toContain('AND f.session_type_id = ?')` on `branches[2]`. This mattered because after T-02 turns the suite green the red is no longer inspectable; any drift had to be caught here or not at all.

**Leader-executed confirmation of the assertion delta** (KZ-008 — recording what was run, not just the conclusion). `git diff -- server/ | grep -E "^[+-].*expect\("` returns exactly the set the Reviewer audited, proving the hygiene pass added and removed no assertion:

```
removed:  expect(params[1]).toBe(SessionTypeEnum.TRAINING);
          expect(params[2]).toBe(SessionLengthEnum.LONG_TERM);
          expect(squashed).toContain('AND f.session_type_id = ?');
          expect(squashed).toContain('AND f.session_length_id = ?');

added:    expect(params[1]).toBe(SessionLengthEnum.LONG_TERM);
          expect(branches[2]).toContain('AND f.session_length_id = ?');
          expect(branches[2]).not.toContain('AND f.session_type_id = ?');
          expect(result.degree).toEqual([{ id: 5, name: 'PhD', count: 1 }]);
```

(The 7 → 6 whole-`params` array assertion spans multiple lines and so does not appear in this single-line grep; it was audited directly by the Reviewer against `design.md` §5.)

**No re-review was spawned for the addendum.** The substantive spec-conformance question had already been independently audited, and the addendum is provably non-semantic: a dead-symbol deletion plus two quote-style changes, with the assertion delta confirmed unchanged by the grep above and the failure set confirmed identical. Re-spawning a T3 Reviewer for three lines of quote style would violate the Delegation Ceiling's caution against over-delegation; inspecting a three-line diff in one file is inline work under the Delegation Thresholds. Recorded here so the decision is auditable rather than implicit.

#### ADVISORY (4R lenses — recorded, never gating; no task minted from any of these)

| Lens | Finding | Leader disposition |
| --- | --- | --- |
| **RISK** | Dead `SessionTypeEnum` import breaks `npm run lint` and would block T-02's acceptance box 3. Confirmed non-speculative: `eslint.config.mjs:51-57` sets `no-unused-vars` to `error`, the rule has no autofixer, and `package.json:19`'s glob covers the file | **Acted on** — see the addendum above. Justified by `CLAUDE.md` §4.3, not by the advisory |
| **RELIABILITY** | The new bucketing test at `:486` cannot fail for the reason its title gives. `MetadataSectionRow` (repository.ts:56-61) is `{ section, id, name, count }` — no session-type field exists at that layer, so a "post-query session-type filter" is not expressible and the fixture row is indistinguishable from a Training-sourced one. Functionally a second copy of the `result.degree` assertion with different values | **Recorded, not acted on.** It conforms: `tasks.md` :42 asked for exactly this test and its own parenthetical concedes the mechanism. Strengthening it would widen an approved task on advisory evidence. The Reviewer's suggested improvement (also assert the params/SQL are identical to the default case) is preserved here for a future spec |
| **READABILITY** | Fixture comment at `:295-297` still attributes the degree row to "the R-IMC-006 'stale degree' scenario" while the body comment at `:429` now attributes it to R-DCE-001. Both are true (AC.2 survives) but a reader hitting the fixture first sees the superseded id | **Recorded, not acted on** — cosmetic, no task widened |
| **RISK** | `// @akili-spec project-dashboard/indicator-metadata-charts` at line 1 under-reports the governing specs; the file is now co-governed by `project-dashboard/degree-chart-empty` | **Recorded.** Deferred to `/akili-archive`'s constitution sync rather than widening a task here |

#### Issues encountered

No spec-conformance rework. One lint-hygiene addendum, described above. The `design.md` §9 budget of one review round holds for T-01.

---

### T-02 — Remove the `Training` predicate and its positional parameter

| Field | Value |
| --- | --- |
| Final status | **PASS** |
| Date | 2026-08-03 |
| Implementer attempts | **1** |
| Requirements covered | R-DCE-001, NFR-DCE-001, NFR-DCE-002 |
| Defect classes gated | DC-A, DC-B, DC-C |
| Implementer | `akili-implementer` (T2 / `sonnet`), effort `high`, skills `nestjs-expert` + `systematic-debugging` |
| Reviewer | `akili-reviewer` (T3 / `opus`, read-only) — `author ≠ auditor` satisfied on both axes |

**Leader note on effort and review mode.** The effort dial nominates `max` for correctness-critical work, and it also forbids `max` on a cheaper tier (escalate the tier instead). Neither was chosen: effort was set to **`high`**, keeping the single-Reviewer lens-checklist mode. Reasoning — `xhigh`/`max` would have triggered parallel lens reviewers, i.e. 2–4 agents auditing a **three-line** production diff whose safety net was already built and independently proven two-sided by T-01. The proof burden for this task sits in the committed gate, not in the review. Recorded so the deviation from the dial's nominal reading is auditable.

#### Attempt 1

**Files changed:** `server/.../agresso-contract/repositories/indicator-metadata-reports.repository.ts` only.

**Production lines removed — three, zero added:**

| Line | Change | `design.md` §2 row |
| --- | --- | --- |
| `import { SessionTypeEnum } …` | deleted (dead once the param goes) | authorized by T-02's notes and §2's closing sentence |
| `AND f.session_type_id = ?` | deleted from the `degree` branch's `WHERE` | row 1 |
| `SessionTypeEnum.TRAINING,` | deleted from `params` — array 7 → 6 | row 2 |

Plus the doc-comment rewrite above `getCapacitySharingMetadata` (row 3, exempt from the line count).

Final `params`: `[contractId, LONG_TERM, INDIVIDUAL, GROUP, GROUP, GROUP]` — six entries, matching `design.md` §5 exactly.

**Verification** (all from `server/researchindicators/`)

| Command | Result |
| --- | --- |
| `npm test -- --silent indicator-metadata-reports.repository.spec` | **PASS**, 15/15 — the same command, unedited, that was red in T-01 |
| `npm test -- --silent` (full server suite) | **PASS — 325 suites / 2088 tests**, 1 snapshot |
| `npm run lint -- --quiet` | clean; `git status` after showed only the intended file — `--fix` touched nothing else |

**Mutation check (KZ-004 falsifiability) — passed, and it discriminated correctly**

| Step | Result |
| --- | --- |
| Re-add `AND f.session_type_id = ?` **without** restoring its param | Suite **RED**, 14 passed / 1 failed |
| Which assertion caught it | `expect(branches[2]).not.toContain('AND f.session_type_id = ?')` at `:390` — the SQL-text negative |
| Which assertion did **not** | The whole-`params` array assertion stayed **green**: the 6-entry array is untouched by this particular mutation |
| Restore and re-run | **PASS** 15/15, plus a confirming full-suite run at 325/2088 |

This is exactly the discrimination T-01's Reviewer predicted, and it matters more than a bare red/green: **falsifiability is established across the pair, not by either task alone.** The whole-`params` assertion's gating power was proven by T-01's red (`Received` carried 7 entries with `1` inserted at index 1); the SQL-text negative's was proven by this mutation. Both directions of the DC-A hazard are now demonstrated red rather than argued.

**Reviewer verdict: `STATUS: PASS`**

> T-02 implements R-DCE-001 exactly — the degree branch is now a single `session_length_id = LONG_TERM` predicate with its positional parameter removed in lockstep, and I verified the 6 placeholders against the 6-entry `params` array by tracing the SQL text myself across all seven branches, including the CTE's single `?`. Q2's shape, DD-2, DD-3, and the §9 tripwire all hold; the mutation check is a genuine falsifiability proof and, combined with T-01's red, demonstrates both sides of the DC-A gate.

**DC-A verified by independent trace, not by accepting the report** (KZ-008 — recording what was executed). The Reviewer enumerated every `?` in Q2 in emission order and mapped each to its bound value:

| # | Placeholder site | Bound value |
| --- | --- | --- |
| 0 | `primary-contract-results.util.ts:42` — `rc.contract_id = ?` in the CTE (exactly one `?`; called without `includeGeoScope`, which adds none) | `contractId` |
| 1 | `repository.ts:319` — degree branch `AND f.session_length_id = ?` | `SessionLengthEnum.LONG_TERM` |
| 2 | `:332` — `gender_individual` `AND f.session_format_id = ?` | `SessionFormatEnum.INDIVIDUAL` |
| 3 | `:344` — `gender_group` Male | `SessionFormatEnum.GROUP` |
| 4 | `:355` — `gender_group` Female | `SessionFormatEnum.GROUP` |
| 5 | `:366` — `gender_group` Non-binary | `SessionFormatEnum.GROUP` |

Six placeholders, six params, aligned. Branches 1, 2 and 5–7 carry no placeholder (`WHERE f.is_active = TRUE` only). A grep across server `src` returns **zero** remaining production references to `session_type_id = ?` or `SessionTypeEnum.TRAINING` — the sole hit is the spec's own negative assertion at `:390`. That independently re-confirms `design.md` §7's reversion-challenge grep, which had claimed exactly two occurrences, both in this `params` array.

**NFR-DCE-001 (query shape) confirmed untouched:** CTE call, `UNION ALL` count still 7, `INNER JOIN degrees`, `GROUP BY l.degree_id, l.name`, union-level `ORDER BY section, count DESC, id ASC`, the bucketing loop, `toEntry`/`rowCountsBySection`, and the `_debug` per-section log line at `:402-406` all byte-identical. Still one `dataSource.query` round-trip (pinned by `toHaveBeenCalledTimes(1)`). A predicate was removed from an existing `WHERE` — no fan-out added.

**DD-2 / DD-3 confirmed:** no `degree_id IS NOT NULL` anywhere (NULL exclusion still rests on `INNER JOIN degrees`); no `OR session_length_id IS NULL` (NULL-length rows stay excluded).

**DC-C confirmed adequate.** The three degree-adjacent sibling consumers (`agresso-contract.service.spec.ts:581-582, 727, 795-815`) assert the repository's `degree` value is forwarded from a mock, so they are structurally insensitive to a SQL change and correctly needed no edit. Nothing in the sibling specs asserted training-only semantics, so no assertion "should have changed but didn't". Full suite plus the zero-hit grep is sufficient for a change confined to one branch's `WHERE`.

**Budget tripwire not breached** (`design.md` §9): three non-comment production lines, all inside §2 rows 1–3. The "no inline `WHERE`-clause comment exists to update" report was verified correct — `design.md` §1's `-- Training` annotation is illustrative only. Recorded as a no-op rather than silently skipped, which is the right handling.

#### ADVISORY (4R lenses — recorded, never gating; no task minted)

**RISK — the deleted resolve-by-id rationale still governs the *surviving* predicate.** The doc-comment rewrite dropped two sentences. One (the live measurement: loose 54 rows vs conjunction 36, an 18-row over-count) is **correctly** deleted as newly false. The other is not so simple:

> _Retracted text, quoted rather than overwritten:_ "Training is resolved **by id** (seed migration `1727119632564`), never by `name`, because `session_types.name` is `TEXT` and a label edit would silently empty this chart with no error."

The Leader raised this at review time as possible information loss, since the hazard is a property of the **enum-vs-TEXT-name choice**, not of Training — and it applies identically to the retained `SessionLengthEnum.LONG_TERM`. The Reviewer's independent judgement, which the Leader accepts:

- **Not a conformance issue.** T-02's notes authorize rewriting the bullet that "describes the degree branch as a two-condition conjunction," and the sentence sat inside that bullet, worded wholly about Training. Left in place it would be a dangling rationale for a predicate that no longer exists — the exact drift the instruction exists to prevent. Nothing in `requirements.md`, `design.md` §8, or T-02 requires preserving it, and the code still resolves by id, so no behaviour or convention was weakened.
- **But the substance survives the wording.** The hazard now governs the one remaining operand with no comment recording why the id is used. `session_lengths.name` carries the same label-edit exposure as `session_types.name`, and the failure mode is a silently empty chart — the same class of defect this entire spec was opened to fix.

**Disposition: recorded, not acted on.** Restoring a generalized version would widen an approved task on advisory evidence, which the *Advisory Never Becomes A Task* rule closes off. Deferred to `/akili-archive`'s constitution sync, with the Reviewer's suggested wording preserved for whoever picks it up: *"the operand is bound by seeded id, never by `name` — a label edit would silently empty this chart with no error."*

#### Issues encountered

None. First-attempt PASS. The `design.md` §9 budget of **1 review round** holds across all three tasks.

---

## 3. Summary — all tasks complete

| Task | Status | Attempts | Reviewer | Surface |
| --- | --- | --- | --- | --- |
| T-01 — invert degree assertions, observe red | **[x]** | 1 (+ lint-hygiene addendum) | PASS | server (spec only) |
| T-02 — remove `Training` predicate + param | **[x]** | 1 | PASS | server (production) |
| T-03 — reword the card's filter-scope note | **[x]** | 1 | PASS | client (copy) |

**Budget outcome vs. `design.md` §9**

| Metric | Expected | Actual |
| --- | --- | --- |
| Tasks | 3 | **3** |
| Net LOC changed | ~45 (production ~4) | production **3**; total ~90 across spec + copy + comments |
| Review rounds | 1 | **1** — no rework attempt consumed on any task |

No HALT, no `FATAL_FAIL`, no Pivot, no budget breach, no spec-conformance FAIL. One Leader-initiated lint-hygiene addendum on T-01 (outside the rework ceiling by construction — it was a `CLAUDE.md` §4.3 convention breach, not a conformance FAIL).

**The chain of evidence that makes this fix trustworthy, in order:**

1. T-01's gate was observed **red** against unmodified production code, with the red independently verified genuine (production's `['A9001', 1, 2, 1, 2, 2, 2]` binding traced from source and matched to the printed `Received`; 15 `it()` blocks counted against `3 failed, 12 passed, 15 total` to rule out a zeroed file).
2. T-02 turned that same command, unedited, **green** at 15/15.
3. The **mutation check** re-broke it deliberately and the correct assertion caught it — proving the gate gates rather than merely passing.
4. The full server suite (325/2088) and full client suite (306/6391) confirm no collateral damage.
5. A zero-hit grep confirms no residual `session_type_id` predicate or `SessionTypeEnum.TRAINING` anywhere in production.

**What remains, and it is not automatable.** Per `requirements.md` §6 **DC-E** and `tasks.md` §3, no jest gate can prove the real screen renders. The manual owner gate is still open:

| Check | Expected |
| --- | --- |
| `GET /api/agresso/contracts/reports/full?contract-id=A100` | `degree` contains `PhD` (from `STAR-3422`) — no longer `[]` |
| `project-detail/A100/project-dashboard` → Degree card | renders the bar; the empty state is gone |
| Card note vs. applied SQL | the sentence describes **long-term + has a degree**, and that is what the query does — **DC-D's known blind spot**, human-verified by design |
| A second contract with familiar Degree numbers | counts may **rise** — long-term engagements and historical imports now qualify. Expected (`design.md` §7), **not** a new defect |

The fourth row is worth stating plainly to anyone reviewing the change: a Degree count going **up** on a familiar project is the fix working, not a regression.
