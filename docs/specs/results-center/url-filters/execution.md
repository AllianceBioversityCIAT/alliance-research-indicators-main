# Execution log — results-center / url-filters

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/results-center/url-filters` |
| Approval Mode | `gated` (from `proposal.md` Document Control) — the Leader pauses for the user after every task |
| Budget (`design.md` §13) | 12 tasks · ~1000 LOC · 3 review rounds |
| Branch | `AC-1607-Send-bulk-upload-completion-email-with-CapDev-metrics` — **user decision, 2026-08-12.** The branch already carries the archived CapDev notification spec; the Leader flagged that the two specs' commits will interleave and that this makes the three-PR split in `tasks.md` §5 harder to cut. The user chose to stay on it |
| Leader model / tier | Opus 5 (1M) — T1, matches the `## Model Routing` registry |
| Implementer wrapper | `.claude/agents/akili-implementer.md` → T2 (`sonnet`) |
| Reviewer wrapper | `.claude/agents/akili-reviewer.md` → T3 (`opus`), read-only `Read/Grep/Glob` — `author ≠ auditor` enforced by configuration on both axes |
| Task status markers | `tasks.md` shipped from `/akili-specify` without per-task status markers (only per-check boxes). The Leader added `[ ]` to each `### T-NN` heading before the first task so `[ ]` → `[~]` → `[x]` transitions have somewhere to live |
| Step 8F tasks gate | **Not installed** (`.claude/hooks/` does not exist). The evidence-before-checkbox order is held by the Leader, unenforced by the harness |
| Carried findings | R3-1 → T-05 · R3-2 → T-03 · R3-3 → T-01 · R3-4 → T-08/T-03. `judgment.md` terminal state is **ESCALATED**, not APPROVED: the round-3 corrections were applied outside the review lineage, so the `/akili-execute` Reviewer is their first independent reading |

---

## 2. Task Execution History

<!-- Entries are appended in completion order. Evidence is written here BEFORE the tasks.md checkbox flips. -->

### T-01 — Frozen vocabulary, bounds, and the folded recognized-key list

| Field | Value |
| --- | --- |
| Status | **PASS** |
| Date | 2026-08-12 |
| Implementer attempts | 1 |
| Requirements covered | R-RCU-001 (AC.1–AC.5), R-RCU-005 AC.4, NFR-RCU-002 (layer 1 only) |
| Carried finding | **R3-3** — regression guard verified load-bearing (below) |

**Files changed**

- `client/research-indicators/src/app/pages/platform/pages/results-center/url/results-center-url.vocabulary.ts` (new, 205 lines)
- `client/research-indicators/src/app/pages/platform/pages/results-center/url/results-center-url.vocabulary.spec.ts` (new, 236 lines)

**Attempt 1 — Implementer (T2 `sonnet`, effort `high`)**

Verification, run from `client/research-indicators`:

- `npm test -- --silent --testPathPattern=results-center-url` → `Test Suites: 1 passed, 1 total / Tests: 31 passed, 31 total`
- `npm run lint -- --quiet` → `All files pass linting.` `git status` re-checked after the `--fix` pass: no files mutated.

**Attempt 1 — Reviewer verdict (T3 `opus`, lens-checklist mode): `STATUS: PASS`**

> The frozen vocabulary matches design §5.1/§5.2/§5.3 character for character (all 6 indicator slugs byte-identical to `QueryIndicatorsEnum`, all 25 status rows, all 4 source pairs), every T-01 done-check is met, and the R3-3 regression guard is genuinely load-bearing — a camelCase revert or a neutered fold each break four separate assertions. All three flagged judgment calls are within spec, and §5.4's `contract`/`year` validation correctly belongs to T-02.

**R3-3 guard — falsifiability traced, not assumed.** The Reviewer walked the counterfactual in both directions: reverting `LEGACY_PARAM_NAMES` to camelCase reddens four independent assertions (the folded-literal `toEqual`, the per-name self-lower-case check, the six-case `it.each`, and the `RECOGNIZED_PARAM_NAMES.has('indicatorTab') === false` check); neutering `foldParamName` to identity reddens the fold tests plus the `it.each`. Both halves of design §6.1's "folding must be symmetric or not done at all" are independently gated, and the `it.each` includes `INDICATORTAB`/`StatusTab` so it cannot pass on a no-op fold.

**Decisions made**

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Effort set to `high`, above the T2 `medium` default | R3-3's failure mode is silent — folded lookups against raw camelCase names match nothing and every already-delivered CapDev email stops filtering with no error. Plus 25 status rows to transcribe exactly, where one typo is a permanently dead slug |
| 2 | Skills: `angular-developer` only; `tdd` deliberately **not** assigned | Deviation from nothing (task's own list), but recorded per the Leader's skill-selection duty. T-01 is a frozen constant map plus a contract test; red-green earns its cost on algorithms and business rules, not on a transcription whose correctness is checked by iterating the exported map. The test-quality requirement was instead put in the brief verbatim from the Disqualifies clause |
| 3 | Targeted test run (`--testPathPattern`) authorized as evidence for this task | Both files are new and nothing imports them yet, so blast radius is zero. KZ-003 / the full-suite requirement binds T-12, not T-01. Reviewer independently confirmed no other file in the `results-center` tree references the module |
| 4 | Reviewer received **file pointers, not an inlined diff** | Deviation from `/akili-execute` Step 2.3's diff-inline rule, taken knowingly. That rule exists because a diff is ephemeral state a read-only Reviewer cannot regenerate; this change set is 100% additions in two new files, so there is no "before" side and the working tree *is* the diff verbatim. The exact `git diff --stat` was supplied so the Reviewer could confirm it had the complete change set. **This reasoning does not extend to any later task that modifies an existing file** |
| 5 | Derived `SOURCE_SLUG_TO_PLATFORM_CODE` accepted as satisfying D-URL-2 | Reviewer's ruling: D-URL-2's rationale scopes the hazard to derivation *from a display name*, while `platform_code` is a wire value (sent as `platform-code` in `ResultFilter`) whose rename is already a breaking change. Frozen-ness is gated rather than assumed — the spec pins `SOURCE_FILTER_OPTIONS.length` to 4 and all four slug→code pairs verbatim |
| 6 | `TAB_SCOPE_VALUES` / `TabScope` and `LEGACY_PARAM_TO_CANONICAL` accepted as in scope | `tab` is one of R-RCU-001's six canonical parameters and its `my`/`all` vocabulary is design §5.4, inside the §5 block T-01 points at in full. The legacy→canonical map keeps a legacy-name concern inside the single source of truth instead of hard-coded in T-02 |
| 7 | Design §5.4's `contract` regex and `year` range confirmed **out** of T-01 | Leader raised this as a possible missing-scope FAIL and asked for an explicit verdict. Reviewer confirmed T-02 owns them: T-01's covered-requirements line names R-RCU-005 AC.4 (the §5.5 bounds), T-02's notes already cite §5.4 by name, and design §2.1 scopes this module to maps + recognized-parameter list + bounds constants — validation predicates are the codec's |

**Issues encountered**

The targeted Jest run prints a global coverage-threshold failure alongside the passing suite. Not a defect in the change: `jest.config.ts:7` sets `collectCoverage: true` globally with app-wide `collectCoverageFrom`, so any `--testPathPattern` run measures the whole app while executing one file and necessarily breaches the floor. Independently confirmed by the Reviewer against the config.

**ADVISORY (4R lens findings — recorded only; never gated, never triggered rework, and per the Advisory rule none of these may become a task or widen one)**

1. *Reliability (test design).* The near-collision test (`spec.ts:124-128`) is unfalsifiable for the defect it names: a typo duplicating `accepted` collapses the Map, so `get('oicr-accepted')` returns `undefined` and `not.toBe(3)` still passes. The collision defect is fully covered by the count + id-uniqueness + row-by-row trio, so no coverage is lost.
2. *Reliability (test design).* `expect(new Set(slugs).size).toBe(25)` (`spec.ts:108`) cannot fail independently — `Map.keys()` is unique by construction; the real duplicate detector is the preceding length check. Same tautology in the per-option loop at `spec.ts:135-139`. The **id**-side Set check at `:114` is genuinely load-bearing.
3. *Risk (hand-off to T-02).* `LEGACY_PARAM_TO_CANONICAL` maps `statuslabel → 'status'`, the same slot as `statustab`. A T-02 `parse` that resolves legacy values by walking this map would read `?statusLabel=Submitted` as a status value, breaking R-RCU-006 AC.3 and T-02's own done-check. **Leader action: relay verbatim into the T-02 brief.** This is not new scope — T-02's approved done-check already requires it; the advisory only names the mechanism by which it could be missed.
4. *Readability.* Neither file is formatted to the repo `.prettierrc` (printWidth 150, `arrowParens: 'avoid'`, `trailingComma: 'none'`). No gate catches it: `eslint.config.js:9` ignores `**/*.spec.ts` outright, prettier is not wired into `ng lint`, and `.husky/pre-commit` is empty.
5. *Risk (verification recipe).* `jest.config.ts:51` sets `isolatedModules: true`, so `npm test` performs **no type checking**, typed lint rules are off, and spec files are not linted at all — neither Implementer command type-checks new code. The Reviewer hand-verified the four inference-sensitive sites here and found them sound. **Leader action: add `npx tsc -p tsconfig.json --noEmit` to the verification recipe from T-02 onward**, where the type surface is much larger. Applies to the brief's verification command, not to any task's scope.

**Final verification result:** 31/31 tests pass, lint clean, Reviewer `PASS` on attempt 1. Budget consumed: 1 of 12 tasks, ~441 LOC of ~1000, 1 of 3 review rounds used on this task (1 round).

