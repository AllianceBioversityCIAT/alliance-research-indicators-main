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

---

### T-02 — Codec: `parse`

| Field | Value |
| --- | --- |
| Status | **PASS** |
| Date | 2026-08-12 |
| Implementer attempts | 1 |
| Requirements covered | R-RCU-001 AC.3, R-RCU-002 (both scenarios + AC.1/AC.2), R-RCU-005 (both scenarios + AC.1–AC.4), R-RCU-006 (both scenarios + AC.1/AC.2/AC.3) |
| Wave | Ran concurrently with T-10 (server) |

**Files changed**

- `client/…/results-center/url/results-center-url.codec.ts` (new, 442 lines) — pure `parse(paramMap) → { filters, scope, dropped, hadRecognizedParam }`; also exports `ResultsCenterUrlFilters`, `DroppedUrlToken`, `ResultsCenterUrlState`, `ParsedResultsCenterUrl`
- `client/…/results-center/url/results-center-url.codec.spec.ts` (new, 305 lines) — 34 cases, all driving real `convertToParamMap`

**Attempt 1 — Implementer (T2 `sonnet`, effort `high`)**

Verification, from `client/research-indicators`:

- `npx tsc -p tsconfig.json --noEmit` → 2 errors, both pre-existing in unrelated spec files (`indicators-tab-filter.component.spec.ts`, `oicr-form-fields.component.spec.ts`). Reviewer confirmed neither is imported by this diff. **This step was newly added to the recipe after T-01's advisory 5** and is the reason the type surface is now covered at all
- `npm test -- --silent --testPathPattern=results-center-url` → `Test Suites: 2 passed, 2 total`, `Tests: 65 passed, 65 total`
- `npm run lint -- --quiet` → `All files pass linting.` No `--fix` mutations

**⚠️ Concurrency incident — `git stash` used while a parallel worker was writing**

The Implementer isolated the two pre-existing `tsc` errors by running `git stash` / `git stash pop`, **while T-10 was concurrently editing server files.** `git stash` is repo-wide, not agent-scoped: it stashed and restored T-10's in-flight edits too. The Leader verified afterwards that the tree was intact (T-10's four changed lines present, its spec block intact, `CAPDEV_INDICATOR_TAB_QUERY` still removed, 18 stash entries all pre-existing from other branches with no residue from this run). **No damage occurred — but only because of timing.** Had T-10 been mid-write inside that window, its edits would have been stashed out from under it and it would have reported success against a reverted tree, with the failure surfacing later as an inexplicable missing change.

**Standing correction, applied from the next parallel wave onward:** every Implementer brief in a concurrent wave must forbid repo-wide git operations (`stash`, `checkout`, `restore`, `clean`, `reset`) outright, and offer the safe substitute for the "is this error pre-existing?" question — check the error's file path against the task's own touched-files list, or run `git stash push -- <only-my-paths>`. **Kaizen candidate** for `/akili-archive`: the constitution's concurrency rule warns the *Leader* not to measure beside a worker, but says nothing to the *worker* about repo-wide git commands, which is the same hazard from the other direction.

**Attempt 1 — Reviewer verdict (T3 `opus`, lens-checklist mode): `STATUS: PASS`**

> `parse` conforms to R-RCU-001 AC.3, R-RCU-002, R-RCU-005 and R-RCU-006 AC.1/AC.2/AC.3 and to design §5.4/§5.5/§6.1 steps 1-2, and all eight T-02 done-checks are covered by falsifiable tests that drive the real `ParamsAsMap` — verified at the Angular source, which also confirms the case-sensitivity that motivates the folding and confirms the D6 object literal is byte-faithful to the query string it stands for. All four flagged judgment calls resolve in the Implementer's favor; the two Disqualifies clauses are both satisfied.

**Rulings on the four flagged judgment calls**

| # | Question | Ruling |
| --- | --- | --- |
| 1 | `.trim()` on split tokens, and blank segments skipped **silently** (no `dropped` entry) | **Both accepted.** A blank segment from `?contract=A100,,S192` carries no sender intent, so nothing the link promised is missing and a toast would be a false positive. Trim is affirmatively supported by R-RCU-001's "hand-edit the link" motivation and cannot cause a wrong resolution (resolvers still validate after). Order is safe: trim precedes the 64-char bound, so whitespace cannot smuggle an over-long token through. Recorded consequence, non-gating: the 50-value bound counts *post-skip* tokens |
| 2 | `dropped` as typed `{ param, value, reason }` objects rather than `string[]` | **Accepted.** Design §2.1 constrains `dropped`'s presence, not its element type; the server exemplar is cited for *purity*, not for a shared shape. The richer type is what makes T-02's own Disqualifies clause satisfiable at all |
| 3 | `tab` given `indicator`'s reject-on-repeated-key rule, admittedly under-tested | **In scope; the gap is advisory, not FAIL.** Design §5.4 types `tab` as `my \| all` with "exact match", so it is single-valued by definition and `?tab=my&tab=all` is genuinely ambiguous. R-RCU-005 AC.4 forbids *silently* taking the first occurrence — rejecting-and-reporting is the opposite of silent, and the resulting `scope: undefined` lands on design §6.1 step 3's documented no-`tab` path, composing correctly with R-RCU-002 AC.6. No done-check requires the untested branches |
| 4 | D6 literal asserted via `convertToParamMap({...})` rather than a URL string — **is this KZ-001?** | **Satisfies design §8. Explicitly NOT KZ-001.** Verified at framework source: `convertToParamMap` returns `new ParamsAsMap(params)` (`router.mjs:60-62`) — the **same class** backing `route.snapshot.queryParamMap`, so the test's double *is* the production type, not a stand-in. Case-sensitivity is genuinely present (`hasOwnProperty` / `Object.keys`), so the folding is really exercised. And `UrlParser.parseQueryParam` (`:687-711`) does **no comma handling**, so the object literals are byte-faithful to what Angular's parser would hand the codec. The only unexercised thing is Angular's own `&`/`=` splitting, which this codec neither owns nor can break — its input type is `ParamMap`, not a URL string |

**Other verifications performed**

- **Falsifiability:** both order tests use inputs whose sorted order differs from input order (`'S192,A100'` → `['S192','A100']`; `'oicr-published,editing'` → `[14, 1]`, sorted-by-id would be `[1, 14]`). `dropped` assertions name the token via `toContainEqual({ param, value, reason })` in 8 of 9 places
- **KZ-001 sweep:** all 34 `parse(...)` call sites use `convertToParamMap`; no hand-rolled `ParamMap` literal anywhere
- **Test count corrected:** **34**, not the 33 the Implementer reported — it miscounted its own contribution; the run total of 65 is right (31 vocabulary + 34 codec). No test missing
- **`statusLabel`:** claim verified against code. `rawValuesFor` is called for exactly eight groups, `statuslabel` not among them, so its value cannot reach `filters` *or* `dropped`. Only effect is `hadRecognizedParam` via set membership — presence, not content
- **Case policy §5.4:** `contract` uppercase-then-validate (so `a100`→`A100` passes); `status`/`source`/`indicator`/`tab` all lower-folded; `year` numeric. `contract` shape-validated only (`/^[A-Za-z0-9._-]{1,32}$/`), no control-list lookup — D-URL-7 affirmatively tested with `ZZZ999`
- **Bounds §5.5:** 51 values → whole param dropped `too-many-values` before any token inspected; 65-char → `too-long` (checked before pattern validation, so the reason is specific); repeated key via `getAll()` per folded key, concatenated
- **Legacy precedence** by key presence, never order; no `dropped` entry for a legacy value that merely lost to its canonical counterpart (correct — overridden ≠ unrecognized)
- **Purity D-URL-1:** `import type { ParamMap }` is type-only, so zero runtime dependency on `@angular/router`. No DI, router, signals, `console` or toast
- **Extensibility for T-03:** confirmed. `ResultsCenterUrlState` already exported and documented as `serialize`'s input; the vocabulary already exports the three inverse maps `serialize` needs; nothing blocks nulling the legacy keys per R3-2

**ADVISORY (recorded only; never gated, and none may become a task or widen one)**

1. *Reliability.* Done-check 7 says `statusLabel`'s value never appears in "the **returned object**", but the three tests fence only `filters`. Behavior over `dropped`/`scope` is correct by construction. Widening one assertion to `JSON.stringify(parse(...))` would close it as literally worded.
2. *Reliability.* `resolveScope`'s repeated-key branch (`:348-351`) and invalid-value branch (`:359`) are untested — the gap the Implementer admitted. **Worth covering before T-03/T-06 build on `scope`.**
3. *Reliability.* Vocabulary-token case-insensitivity is implemented for all four token classes but directly tested for none — `{ CONTRACT: 'a100' }` covers only `contract`.
4. *Reliability.* Legacy precedence gates on **raw** presence for `indicator` but **post-split token count** for `status`, so `?status=&statusTab=2` consults the fallback while `?indicator=&indicatorTab=1` does not. Deterministic either way, so no requirement is contradicted, but the asymmetry reads as accidental.
5. *Readability.* `YEAR_PATTERN` is reused as the numeric-id test in both legacy resolvers, where years are not involved — a false semantic link.
6. **Risk / hand-off to T-06.** `DroppedUrlToken.value` carries the raw unescaped token. Right shape for testing, but it makes T-06's done-check "a token containing markup cannot alter the toast's rendering" a live hazard rather than a structural impossibility. Design §7.4's guarantee is *non-interpolation*, so **T-06 must read only `dropped.length`, never `dropped[i].value`. Leader action: carry verbatim into the T-06 brief.**
7. *Readability.* `DroppedUrlToken.param` is typed `string` though every producer passes a `CanonicalParamName` or a folded legacy name; a union would let T-06 group by parameter without a cast.
8. *Resilience.* `splitMultiValue` calls `.split(',')`/`.trim()` on values Angular types `any`. Production values are always strings, so not a production risk, but a future test passing `{ year: 2025 }` as a number would throw rather than drop.
9. *Risk (process, D6 / RB-3).* A strictly stronger twin form exists — hoist the literal to one exported const and derive the paramMap from it via `new URL(...).searchParams` — buying grep-comparability for humans rather than behavioral coverage. Optional; the manual HITL check stays mandatory regardless.

**Final verification result:** 65/65 tests pass (31 vocabulary + 34 codec), `tsc` clean for this diff, lint clean, Reviewer `PASS` on attempt 1.

---

## 3. Budget Tripwire — BREACHED, escalated to the user

**Raised 2026-08-12, after T-02 (3 of 12 tasks complete).**

| Metric | `design.md` §13 budget | Actual after 3 tasks | Delta |
| --- | --- | --- | --- |
| Tasks | 12 | 3 done (T-01, T-02, T-10) | on track |
| **LOC** | **~1000 total** | **~1268** | **+27% over the whole-spec budget, with 9 tasks left** |
| Review rounds | 3 | 3 used, 3 PASS on first attempt, 0 rework | on track — every task passed first time |

LOC by task: T-01 441 · T-02 747 · T-10 ~80.

**Cause — the estimate is internally inconsistent, not the execution overrunning.** The overrun is not sloppy implementation: all three tasks passed review on the first attempt with zero rework, and the Reviewer judged the test volume *necessary* (the Disqualifies clauses in this spec demand falsifiable assertions, which cost lines). The real problem is that **`design.md` §13's ~1000 LOC cannot be right on its own terms**: `tasks.md` T-11 describes itself as "a rewrite of a ~1,000-line spec … the single largest item in the budget." T-11 alone therefore approaches the entire spec's LOC budget, before the nine other remaining tasks. The three heaviest tasks (T-06, T-08, T-11) are all still ahead.

Realistic projection: **~3000–3500 LOC** for the full spec, roughly 3× the recorded budget.

Per `/akili-execute`'s Budget Tripwire rule the run **stops here** rather than continuing on the assumption that finishing is what was wanted. Options put to the user: re-baseline §13 and continue · continue without re-baselining (tripwire noted once, not re-raised) · descope · pause. Decision to be recorded here.


