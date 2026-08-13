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

---

### T-10 — Server: CapDev email link

| Field | Value |
| --- | --- |
| Status | **PASS** — with one **undischarged manual gate** (see below); the task is code-complete but D6 is not closed |
| Date | 2026-08-12 |
| Implementer attempts | 1 |
| Requirements covered | R-RCU-007 AC.2, AC.3 (server half only — the client half of AC.3 is T-09's), defect class D6 |
| Wave | Ran concurrently with T-02 (client). Cross-package parallelism per `.agents/leader.md` — separate `node_modules`, build outputs and ports |

**Files changed**

- `server/researchindicators/src/domain/entities/ai-reports/notifications/capdev-bulk-notification.service.ts` — `buildStarLink` takes `agreementId: string`; emits `/results-center?indicator=${QueryIndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT}&contract=${agreementId}` via `COMPLETE_CLIENT_HOST`; call site passes `input.agreementId`; `CAPDEV_INDICATOR_TAB_QUERY` deleted; `IndicatorsEnum` import replaced with `QueryIndicatorsEnum`
- `…/capdev-bulk-notification.service.spec.ts` — new `describe('sendGroupNotification — STAR link (R-RCU-007, D6)')` with 3 cases

**Attempt 1 — Implementer (T2 `sonnet`, effort `medium`)**

Verification, from `server/researchindicators`:

- `npm test -- --silent --testPathPattern=capdev-bulk-notification` → `Test Suites: 2 passed, 2 total`, `Tests: 89 passed, 89 total`
- `npm run lint -- --quiet` → clean; `git status` re-checked after (the script carries `--fix`): no additional mutations
- Leader independently confirmed by grep that `IndicatorsEnum` is fully gone (only `QueryIndicatorsEnum` remains, at the import and the one usage)

**Attempt 1 — Reviewer verdict (T3 `opus`, lens-checklist mode): `STATUS: PASS`**

> The diff implements exactly the one-string change `design.md` §4/§6.3 specifies — `buildStarLink(input.agreementId)` via `COMPLETE_CLIENT_HOST`, canonical `indicator`/`contract` pair, `CAPDEV_INDICATOR_TAB_QUERY` removed — and all three T-10 done checks hold: per-group scoping proven across two differing agreement ids, zero `indicatorTab` producers server-wide, and the D6 literal asserted verbatim with a byte-identical twin on the client.

**Rulings on the five points the Leader raised**

| # | Question | Ruling |
| --- | --- | --- |
| 1 | Does the D6 literal bite, given the code composes the slug from `QueryIndicatorsEnum` while the test asserts the expanded string? | **Satisfied, and stronger than a retyped literal.** The obligation is on the *test* (requirements §8 control 1; T-10 says "the **spec** must assert the exact literal"). The frozen wire value lives only in the test, so editing the enum turns the suite **red** — the test does not follow the change |
| 2 | Is the `href` regex safe against the real template? | **Safe.** `capdev-bulk-summary.html:21` contains **exactly one** `href` (`<a href="{{{starLink}}}">`); a server-wide grep finds no second anchor and no `mailto`. Asserting through the rendered body is *stronger* than calling the private method — it proves the link reached `starLink` and survived real Handlebars |
| 3 | Do two sequential calls on one instance genuinely discriminate per-group scoping (KZ-004)? | **Yes.** A regression capturing the first group's id into instance state makes `hrefOf(1)` return `contract=A100` and fails; a hard-coded constant fails both |
| 4 | Any surviving server-side `indicatorTab` producer? | **None.** Server-wide grep for `indicatorTab\|statusTab\|statusLabel` returns only the new negative assertion. The seeding migration carries only `{{{starLink}}}`, so the append-only rule needs no migration edit |
| 5 | Is the client-first rollout order (design §11) a defect in this diff? | **No — out of scope for this gate.** §11 governs *deployment*; `tasks.md` §5 already sequences T-02 into PR 1 and T-10 into PR 3, and §11's backout note says the new link degrades to R-RCU-005 behavior if the client half is absent. It is the Leader's release concern, recorded below |

**⚠️ Undischarged manual gate — D6 is NOT closed by this PASS**

`requirements.md` §8 substitute control 2 mandates a human paste-the-built-link-into-a-running-client check "at the Phase-3 HITL pause **and again after execution**". The Reviewer confirmed it remains genuinely required: nothing in this diff crosses the package boundary — the server suite never runs the client parser and vice versa. The Implementer correctly declined it as unautomatable rather than substituting a weaker proxy. **This must be performed by a human before the spec's Done Definition can be checked.**

**Release note carried forward (not a task, not scope)**

Design §11 requires **client first, then server**. This branch now carries the server half (T-10) while the client parser (T-02) is in the same wave. Both land on one branch here per the user's branch decision, so the ordering obligation moves entirely to deploy time: the server's new link must not reach production before the client parser does. Recorded here because the three-PR split that would have enforced it is harder to cut on a shared branch.

**ADVISORY (recorded only; never gated, and per the Advisory rule none may become a task or widen one)**

1. *Risk.* The "never hard-code the host" clause is **not discriminated** by any test — the `appConfig` mock returns the same `HOST` from both `ARI_CLIENT_HOST` and `COMPLETE_CLIENT_HOST`, so a hand-concatenated variant would pass every assertion in the file. Conformance rests on code inspection. Pre-existing property shared by the older AC.3 check, not introduced here. One-line close: make `COMPLETE_CLIENT_HOST` a `jest.fn` and assert `toHaveBeenCalledWith(...)`.
2. *Resilience.* `agreementId` is interpolated raw, with no `encodeURIComponent`. Requirements §8 A1 *assumes* URL-safe ids and design §5.4 pins the client validator to `^[A-Za-z0-9._-]{1,32}$`, but the server neither encodes nor validates — an id containing `&`, `#`, `?` or a space would emit a link the client silently mis-parses. `encodeURIComponent` is a no-op for every conforming id, so it would be free insurance.
3. *Readability.* The second test is a strict subset of the first's first assertion, yet uses a different extraction path (local `hrefOf` closure vs. `extractBody` + inline regex) for the same job. One shared helper would make a future template change a one-line fix.
4. *Reliability.* The strongest available AC.2 evidence was left unused: the existing `dispatchThreeGroups` harness already resolves an email per contract, so one loop there would extend per-group link scoping across the real `dispatch` plumbing rather than just `sendGroupNotification`.
5. *Risk (low).* `{{{starLink}}}` is a triple-stash, so the `&` reaches the body unescaped. Not a practical decode hazard (`&contract` is not a legacy semicolon-less named reference); the theoretical failure mode is a strict mail sanitizer re-escaping the attribute. If ever addressed, the fix belongs in the **template**, not the built string — changing the string would break the cross-package literal.

**Final verification result:** 89/89 tests pass, lint clean, Reviewer `PASS` on attempt 1. **D6 manual gate outstanding.**

