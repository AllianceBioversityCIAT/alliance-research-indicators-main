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

Per `/akili-execute`'s Budget Tripwire rule the run **stopped here** rather than continuing on the assumption that finishing is what was wanted. Options put to the user: re-baseline §13 and continue · continue without re-baselining · descope · pause.

**USER DECISION (2026-08-12): re-baseline §13 and continue.** No descope; task count unchanged at 12.

### Root cause found by the correction sweep — a review finding closed by an edit that did not fix it

The two-direction sweep required before amending a spec value turned up the origin, which is worse than a bad estimate:

- `judgment.md:104` — **JD-14, confirmed by both judges**: *"Meeting §10 is a rewrite of a ~1,000-line spec that §13's budget does not carry."* The defect was correctly identified during review.
- `judgment.md:161` — its disposition: **"Fixed — §10.2 states the spec rewrite; budget raised to 11 tasks / ~950 LOC / 3 rounds."**

**The raise (~630 → ~950, i.e. +320) was smaller than the single item it was raised to accommodate (~1000).** JD-14 was marked `Fixed` on the strength of the *narrative* half of the remedy (§10.2 now documents the rewrite) while the *numeric* half silently failed. Round 2 then moved the total to ~1000 for unrelated reasons (counter plumbing), so the contradiction survived three review rounds, a two-judge lineage, and the specify-phase HITL gate, and only surfaced when execution measured real lines.

This is a distinct failure mode from anything in the Kaizen Active Lessons and is a **Kaizen candidate** for `/akili-archive`: *a finding whose remedy has both a prose half and a numeric half can be closed by the prose half alone — the disposition recorded "budget raised" without checking the raise against the item that forced it. Verify a corrected number against the thing that caused the correction, not merely that a change was made.*

### Sites corrected (two-direction sweep, per `/akili-specify` Correction Closure)

| Direction | Site | Action |
| --- | --- | --- |
| Forward (superseded value) | `design.md:424` §13 table | Re-baselined column added: LOC **~3200**; tasks and review rounds unchanged |
| Forward | `tasks.md:10` Budget line | Updated to ~3200 with a pointer to the re-baseline record |
| Forward | `tasks.md:356` PR strategy | Updated to ~3200 |
| Backward (references *to* the corrected section) | `design.md:366` §10.2 | Read — already states the ~1,000-line rewrite correctly; it was the *source* of the true figure, not a casualty. No edit needed |
| Backward | `tasks.md:281` T-11 notes | Read — already states "~1,000-line spec … the single largest item in the budget". Consistent with the new total; no edit needed |
| Deliberately **not** edited | `judgment.md:104`, `:161` | A point-in-time record of the review lineage. Editing it would erase the evidence of how the error survived. Cited above instead |

### Second correction made during the same sweep — PR strategy vs. the single-branch decision

The sweep surfaced an unrelated live contradiction: `tasks.md` §5 prescribes a three-PR split, but all work is landing on one shared branch per the user's branch decision, and **T-10 (PR 3) has already landed before T-03 (PR 1).** The split is therefore not being produced by the branch structure. A warning note was added at `tasks.md:356` recording that the split must now be cut deliberately from the commit range if still wanted, and that design §11's client-before-server ordering has become a deploy-time obligation only. Flagged because a stale PR plan reads as a plan that is being followed.

**Tripwire status: resolved. It will not be re-raised unless actuals exceed ~3200 LOC**, at which point it is a genuine overrun rather than a bad estimate.

---

## 4. Task Execution History (continued)

### T-03 — Codec: `serialize` (carried R3-2 and R3-4)

| Field | Value |
| --- | --- |
| Status | **PASS on attempt 2** (1 rework round consumed) |
| Date | 2026-08-12 |
| Implementer attempts | 2 |
| Requirements covered | R-RCU-003 (both scenarios + AC.1/AC.2), R-RCU-004 AC.3, NFR-RCU-003 (structurally — see the ruling) |
| Wave | Ran concurrently with T-05 (both client — a deliberate exception, see the wave note below) |

**Files changed:** `client/…/results-center/url/results-center-url.codec.ts` (+94 net), `…/results-center-url.codec.spec.ts` (+251 net) — `serialize` appended to T-02's module without restructuring `parse`.

#### Attempt 1 — Implementer (T2 `sonnet`, effort `high`) → Reviewer `STATUS: FAIL`

Verification was green (83/83 tests, `tsc` clean for these files, lint clean), and the Reviewer passed the substance: R3-2's legacy-key nulling in **camelCase** with a merge-based proof, R3-4 both directions, `utm_source` survival, the round-trip fixture, and purity. **One issue failed it:**

> **Discovered Issue:** `serialize` does not upper-case `contract` on the write side… `parse` guarantees that for URL-sourced state, but the write path's state is not URL-sourced: `results-center.service.ts:702,713` build `'contract-codes'` from `tableFilters().contracts.map(c => c.agreement_id)` — control-list values — and `restorePersistedState` reloads them from sessionStorage… Compounding it, the test that appears to cover this **cannot fail**: it is named *"comma-joined, **already upper-cased** list"* and feeds `['A100','S192']` — an input that produces identical output whether the upper-casing exists or not.
> **Violated Rule:** `design.md` §5.4 (`contract` row: "Upper-cased on read **and write**") and §12 **D-URL-11**. Secondarily `requirements.md` R-RCU-003 AC.2.

The second half is the more instructive half: the defect was not only a missing call, it was **a test that could not have caught it** — the same non-discriminating-fixture shape T-02's Disqualifies clause names for ordering.

#### Attempt 2 — Implementer (T2 `sonnet`, effort **`xhigh`**, bumped per the rework rule) → Reviewer `STATUS: PASS`

Fix: `filters.contract.map((code) => code.toUpperCase()).join(',')`. Fixture replaced with `['s192','a100']` → `'S192,A100'` — lower-case **and** non-alphabetical, so it fails on a removed `.toUpperCase()` *and* on an introduced `.sort()`. Both advisory items also taken (see below). Verification: 83/83 (unchanged count — fixtures only), `tsc` clean, lint clean.

> **Reviewer PASS summary:** The single FAIL issue is genuinely closed — `serialize` now upper-cases `contract` before joining, satisfying design.md §5.4 / D-URL-11's "upper-cased on read **and** write" independently of its caller — and the replacement fixture `['s192','a100'] → 'S192,A100'` is falsifiable on both case and order, so the assertion can now actually fail. The two advisory edits strengthened the `year` fixture and corrected prose only; R3-2's merge-based proof, R3-4, the clear scenario, `utm_source`, the round-trip and purity are all intact.

The re-review also confirmed the fix cannot break a previously-passing state: any state that round-tripped was already upper-case (because `parse` upper-cases unconditionally), so the new map is the identity on exactly those; lower-case states were *already* broken before the fix.

#### Rulings on the four judgment calls raised at attempt 1

| # | Question | Ruling |
| --- | --- | --- |
| 1 | Two legacy-name lists now exist — vocabulary's folded `LEGACY_PARAM_NAMES` and codec's local `LEGACY_PARAM_NAMES_ORIGINAL_CASE`. Drift hazard? | **Acceptable.** Verified at framework source: `Router.createUrlTree` spreads over the URL's **raw** keys (`router.mjs:5728`), so nulling `indicatortab` would add a new key and leave `indicatorTab=1` untouched — the folded list genuinely is the wrong shape for the output side. Also, adding a paired export to the vocabulary would reopen a `[x]`-closed task's file list. **But nothing protects it from drift** — see advisory 2 |
| 2 | Is the NFR-RCU-003 test capable of failing? | **A structural tautology, but not a violation.** `serialize` never receives a user id, so the assertion cannot fail — yet it asserts exactly what the done-check words. `requirements.md` NFR-RCU-003's own *How verified* puts the real assertion on **the written URL**, a component-level artifact outside T-03's file list. The comment labels the limit honestly. **Coverage consequence escalated separately — see §5** |
| 3 | `serialize` silently drops ids absent from the frozen map | **(b) SPEC GAP, not a FAIL** — routed to the user, not to rework. See §5 |
| 4 | Round-trip vs. the Disqualifies clause | **Satisfied across the suite.** The clause disqualifies a round-trip test as R3-2 *evidence* and relocates that proof to a merge assertion, which the suite does in four places. Requiring the round-trip fixture to also carry a cleared filter would make it a worse round-trip test |

#### ADVISORY (recorded only; none may become a task or widen one)

1. *Reliability.* `.toUpperCase()` now dereferences every element of `filters.contract`, so a non-string the **runtime** can supply throws a `TypeError` where `join(',')` degraded silently. Reachable in principle: `results-center.service.ts:315` casts `tableFilters().contracts`, and both `get-contracts-by-user.interface.ts:2` and `find-contracts.interface.ts:12` declare `agreement_id?: string`. **Leader action: carry into the T-04/T-08 briefs** — narrow the type at the boundary, or the codec should use `String(code).toUpperCase()`.
2. *Risk.* Nothing ties `LEGACY_PARAM_NAMES_ORIGINAL_CASE` to the vocabulary's list; a fourth legacy parameter would be parsed and never cleared, and the hand-enumerated nine-key `toEqual` would stay green. Suggested computed invariant: folded `Object.keys(serialize(emptyState))` equals `[...CANONICAL_PARAM_NAMES, ...LEGACY_PARAM_NAMES]`, sorted.
3. *Resilience.* A case-varied legacy key (`?INDICATORTAB=1`) is parsed but never nulled, since only exact camelCase is emitted. Unsolvable without giving `serialize` the current params, which design §6.2 step 3 excludes by design. Recorded, not fixed.
4. *Readability.* `'all'` and `undefined` both serialize to `tab: null`, so `'all'` does not round-trip — correct per R3-4 and asserted, but the round-trip block deserves a one-line note so nobody "fixes" it.
5. *Readability.* The fixture comment explaining *why* those values were chosen is the most useful artifact to leave against a future tidy-up; worth mirroring above other order-sensitive fixtures.

**Final verification result:** 83/83 tests, `tsc` clean for these files, lint clean, Reviewer `PASS` on attempt 2.

---

## 5. RESOLVED — non-functional requirements whose prescribed verification was owned by no task

> **USER DECISION (2026-08-12): assign all four to existing tasks.** No new task created; three existing tasks gained a done-check, and two document inaccuracies were corrected. Amendments applied the same day:
>
> | Gap | Assigned to | Site |
> | --- | --- | --- |
> | NFR-RCU-002 **layer 2** (runtime completeness warning) | **T-06** — where the control lists resolve | `tasks.md` T-06 covered-requirements line + done-check + a scope note; `design.md` §10.1 runtime row now names T-06; `tasks.md` §3 row split by layer |
> | NFR-RCU-003 **written-URL** assertion | **T-08** — the first task that calls `router.navigate` | `tasks.md` T-08 done-check + rationale note; §3 row split between the structural (T-03) and real (T-08) verification |
> | R3-1 **rendered** my/all click | **T-11** — its harness rewrite is what makes a DOM click possible | `tasks.md` T-11 done-check, plus a **new Disqualifies clause** forbidding the rewrite from dropping T-05's counter assertions |
> | `design.md` §6.2's false "the counter does not move" clause | Corrected in place | §6.2, with a note that the isolation guarantee is **component destruction alone**, and that T-12 must assert that rather than a frozen counter |
>
> **Why NFR-RCU-002's §3 row was split by layer:** the requirement is explicit that layer 1 *cannot* detect a server-side addition. Recording both layers under one row is what let the unimplemented half hide behind the implemented one for three review rounds — the coverage table said "covered" and was not lying about layer 1.

### Original escalation (retained as the record of what was found)

**Raised by the T-03 Reviewer, 2026-08-12. Pending a user decision; not actionable by the Leader alone, because creating or widening tasks is scope the user never approved.**

### 5.1 NFR-RCU-002 **layer 2** has no owning task

`requirements.md` NFR-RCU-002 specifies verification in **two layers** and is explicit that one is insufficient:

> 2. **Runtime completeness check** — when the relevant control list resolves, the codec compares it against the frozen map and emits a console warning naming any id with no slug. **This is the layer that actually sees a server-side addition**, and it fires in every dev and QA session.

`design.md` §10.1 lists it as a "Runtime | dev/QA console" row **with no owning task**. `tasks.md` §3 maps NFR-RCU-002 to **T-01**, whose Requirements-covered line reads "NFR-RCU-002 (**layer 1**)". So layer 2 is specified in two constitutional documents and implemented by nobody.

This matters more than a missing test, because layer 2 is the *named mitigation* for the §5.2 hazard below.

### 5.2 The unmapped-id drop — a spec gap the Reviewer ruled is NOT a defect

`serialize` maps ids to slugs and filters out misses, so an id present in **live filter state** but absent from the frozen 25-row map is silently omitted from the URL. If it is the only status selected, the key is stripped and a copied link shows **unfiltered** results while the user's table is filtered — against R-RCU-003's user story.

The Reviewer ruled this **(b) a genuine gap, not (c) a FAIL**, because every alternative violates a different explicit decision: emitting the raw id breaks D-URL-2 and AC.2 (`parse` would reject `status=26`); omitting the key instead of nulling it breaks D-URL-16/R3-2 and would let `merge` pin a stale value — strictly worse; and reporting the drop needs a return channel that design §6.2 step 3 does not give `serialize`. **The implementation picked the least-bad option the spec leaves available**, and the id class involved is already an accepted residual risk under NFR-RCU-002.

**Two things need a human decision:** (i) who implements the layer-2 completeness warning, and (ii) whether the write side should surface an unmapped id at all — which requires amending design §6.2 step 3 to give `serialize` a `dropped`-style channel.

### 5.3 NFR-RCU-003's own prescribed verification is also unowned

`requirements.md` NFR-RCU-003 → *How verified*: "asserted by a test that **the written URL** never contains the cached user id." A written URL is a component-level artifact. `tasks.md` §3 maps NFR-RCU-003 to **T-03 alone**, which cannot produce one. **Suggested placement: add it to T-08's check list**, where `router.navigate` is first exercised.

### 5.4 T-11's done-check is missing the rendered half of T-05's guard

Raised by the T-05 Reviewer. T-05's done-check wants the my/all counter increment "asserted through the template binding"; the current harness makes a DOM click impossible, so the Leader authorized asserting through the component handler instead (accepted by the Reviewer). But **T-11's done-check does not mention a rendered my/all click asserting the counter**, so the template-binding half will silently vanish once T-11 rewrites that spec.

### T-05 — `userFilterMutations` counter (carried R3-1)

| Field | Value |
| --- | --- |
| Status | **PASS on attempt 2** (1 rework round consumed) |
| Date | 2026-08-12 |
| Implementer attempts | 2 |
| Requirements covered | R-RCU-003 (write trigger), R-RCU-004 AC.2, NFR-RCU-005 (partially — the counter is inert until T-08) |
| Wave | Ran concurrently with T-03 (both client — deliberate exception, see wave note) |

**Files changed:** `results-center.service.ts`, `results-center.component.ts`, `results-center.service.spec.ts`, `results-center.component.spec.ts` (+168 net across attempt 1; +3 assertions and one moved line at attempt 2).

**Design:** a private `_userFilterMutations` signal exposed read-only as `userFilterMutations`, advanced through a single public `noteUserFilterMutation()`. `onSelectFilterTab` gained a `skipBump?: boolean` so its non-user-facing callers can suppress the increment.

#### Attempt 1 — Implementer (T2 `sonnet`, effort `high`) → Reviewer `STATUS: FAIL` (2 issues)

Verification was green (360→358 tests, `tsc` clean, lint clean) and the Reviewer passed the substance — but found two defects, the first of which is the most instructive finding of the run so far:

> **Issue 1 — `togglePin` advances the counter *before* the state mutation it is supposed to publish, across an `await`.** … The click handler returns at the first `await`, Angular runs change detection, and the component effect flushes there — with the counter already at `N+1` and the state still **pre-toggle**. Step 4's loop guard then makes that run a no-op, the PATCH resolves, `loadMyResults()` mutates state — and the effect never re-runs, because its only tracked dependency did not move again. Net result: **the pin toggle changes the scope and wipes six filter collections, and the address bar is never updated.** That is verbatim R3-1's symptom reproduced through the very handler T-05 was written to fix. … A correctness property that holds only when the framework declines to flush during a network round-trip is not a property.
> **Violated Rule:** `design.md` §6.2 (the `togglePin` mutator row with Steps 1-3, and the claim that D-URL-15 closes R2-2); `requirements.md` R-RCU-003 AC.1/AC.2; `tasks.md` §0 **R3-1**.

> **Issue 2 — the `loadMyResults` / `loadAllResults` row of the "must not increment" column has no assertion anywhere.** Production code is correct… But nothing pins it. A future bump added inside either method — the exact edit judgment.md R2-5 warns about — fails no test.
> **Violated Rule:** `tasks.md` § T-05 Acceptance item 2; T-05's Disqualifies ("A counter test that never exercises the 'must not' column proves half the contract"); design.md §6.2's blockquote.

**Note on how this was found.** The Leader asked whether bumping on *attempt* rather than *success* was correct (the error path). The Reviewer answered a sharper question: the defect bites on the **success** path, and attempt-vs-success is a side issue the correct fix resolves for free. Recorded because it is the clearest case in this run of an independent audit outperforming the Leader's own framing of a concern.

#### Attempt 2 — Implementer (T2 `sonnet`, effort **`xhigh`**) → Reviewer `STATUS: PASS`

The bump moved to after the `if (newPinnedTab === 'my') … else …` branch, still inside `try`. Three assertions added: `not.toHaveBeenCalled()` in each of `describe('loadMyResults')` / `describe('loadAllResults')`, plus one in the existing rejected-PATCH case. Verification: 360/360, `tsc` clean, lint clean.

> **Reviewer PASS summary:** Both prior FAIL issues are closed for the reasons they were raised — the `togglePin` bump now lives inside a single synchronous block after every filter-state write (including `main()`'s pre-await `create-user-codes` normalization), so no effect flush can ever see an advanced counter over stale state, and a rejected PATCH provably cannot bump given the complete four-site call-site enumeration; the `loadMyResults`/`loadAllResults` "must not increment" rows now have real assertions with clean per-test mock state. The success path still bumps exactly once on both the `my` and `all` branches, and no attempt-1 behavior was weakened.

The re-review closed the one gap the remedy did not cover on its own: `loadMyResults()` fires `void main()`, so the Leader asked whether `main()` mutates filter state *asynchronously* after the bump. It does write `create-user-codes` (`service.ts:496-519`) — but **before its first `await`** (`:542`), so inside the same synchronous block, ahead of the bump. After the await it writes only `resultsTableTotalRecords`, `list`, `lastSuccessfulResultsFetchKey`, `loading` — none of which the codec serializes. **No async window remains.**

#### Rulings on the six points raised at attempt 1

| # | Question | Ruling |
| --- | --- | --- |
| 1 | `togglePin` bumping before its async work | **Defect — but not the attempt-vs-success question.** FAIL issue 1 |
| 2 | Bump-by-delegation for `removeFilter` / `clearAllFilters` | **Conformant.** §6.2's column heading is "Increments" — a behavioral contract, not "calls `noteUserFilterMutation`". Both advance exactly once, asserted at the named sites, and both delegated bumps land *after* their state writes, so neither reproduces issue 1 |
| 3 | `skipBump` added to the legacy `indicatorTab` load path — a site the §6.2 table never names | **Correct, in scope, and R-RCU-006-preserving.** Without it a plain `?indicatorTab=1` page load would advance the counter after effect creation and fire the write effect *during the read path* — exactly what §6.2 claims cannot happen. `component.ts` is a T-05 file, and the flag holds T-05's own invariant. Related asymmetry confirmed right: `applyStatusFilterFromHomeLink` writes signals directly and reaches no bumping method, so the `statusTab` load path needed no flag |
| 4 | Two pre-existing component-spec assertions modified | **Strengthening, masks nothing.** `toHaveBeenCalledWith` stays an exact-object match, so they now *pin* `skipBump: true` and fail if it is dropped |
| 5 | Does the component-side R3-1 assertion prove the counter advances? | **The two-part composition is sound.** The Disqualifies clause's operative requirement is "the assertion must go through the component's handler", and `component.onActiveItemChange` / `component.togglePin` are exactly what the template binds (`html:14`, `html:17`→`onPinIconClick`→`togglePin`). The component spec proves the call; the service spec proves the call advances the signal; the counter has one write path. A DOM click is structurally impossible under the current harness — T-11 owns that. **Residual → §5.4** |
| 6 | `removeFilter`'s early return not bumping | **Correct.** Unrecognized label, mutates nothing; a bump there would fire the effect for a non-event |

#### ADVISORY (recorded only; none may become a task or widen one)

1. **Reliability — the invariant that just failed is undocumented at two other call sites.** `onActiveItemChange` (`component.ts:197`) and `applyFilters` (`service.ts:691`) still bump *before* their mutations. Safe **today** only because both are wholly synchronous — the moment either gains an `await` ahead of its `.set()` calls, the exact defect just fixed in `togglePin` returns. The rule currently lives only in `togglePin`'s comment. **Leader action: carry verbatim into the T-08 brief** (T-08 is the counter's only consumer): the contract is *call `noteUserFilterMutation()` only after the state you publish has been written*.
2. *Risk.* Verification was targeted, not the whole-client suite design §10.1 requires for D5 (KZ-003). Acceptable here — the counter has no reader until T-08, so blast radius outside these files is nil — but **the full-suite run remains owed**, and T-12 is where that debt is booked.
3. *Reliability.* Bump-by-delegation is load-bearing on two inline comments; a note on `applyFilters`/`onSelectFilterTab` that they are *bump-carrying delegates* would show the constraint at the site being edited.
4. *Readability.* `skipBump` reads as an escape hatch; `fromLoadPath: true` would make a future caller choose it for the right reason. Low value — T-06 replaces the only current user.

**Final verification result:** 360/360 tests, `tsc` clean, lint clean, Reviewer `PASS` on attempt 2.

---

### T-09 — Home link producers

| Field | Value |
| --- | --- |
| Status | **PASS on attempt 1** |
| Date | 2026-08-12 |
| Implementer attempts | 1 |
| Requirements covered | R-RCU-007 AC.1, **AC.1b**, AC.3; R-RCU-001 AC.2 (no numeric id emitted); R-RCU-006 AC.3 (producer half) |
| Wave | Ran concurrently with T-04 (client, disjoint folders) |

**Files changed:** `…/home/components/data-overview/data-overview.component.{ts,html,spec.ts}` (+137/−10). `…/main-actions/main-actions.component.html` was in the Files-touched list and **deliberately not modified** — line 22 already emits `[queryParams]="{ tab: 'my' }"` with no legacy parameter. The Reviewer confirmed this is *satisfied work, not skipped work*: `tab` is canonical by R-RCU-001, and R-RCU-006 states outright "**`tab` is not legacy** … it keeps its current spelling and its current producer."

Both cards now emit frozen-vocabulary **slugs** resolved from `STATUS_ID_TO_SLUG` / `INDICATOR_ID_TO_SLUG` plus a mandatory `tab: 'my'`. The old code emitted `{ indicatorTab: <number> }` — a numeric database id, which R-RCU-001 AC.2 forbids.

**Verification** (from `client/research-indicators`): `tsc` clean but for the 2 known pre-existing errors · `npm test -- --silent --testPathPattern="data-overview|main-actions"` → 27/27 · lint clean.

> **Reviewer PASS summary:** Both producers emit only frozen-vocabulary slugs plus a mandatory `tab=my` (R-RCU-007 AC.1/AC.1b), no numeric id or legacy key reaches any URL (R-RCU-001 AC.2, AC.3 verified by a word-boundary sweep of both packages), and the drift fallback matches a degradation the spec already ruled acceptable for the same id class on the write side. `main-actions.component.html` was correctly left alone — `tab` is canonical, not legacy.

#### Ruling on the drift fallback — the Leader's concern was overruled, correctly

The Implementer flagged an unspecified judgment call: an id with no slug emits `{ tab: 'my' }` alone. **The Leader argued this was possibly a FAIL** — the card says "12 results in status X", the user clicks, lands on all their results unfiltered with no notice, because no invalid token reaches the read path and R-RCU-005's toast never fires. The Leader proposed emitting the invalid token instead, so the designed drop-and-toast degradation would run.

**The Reviewer ruled (a) correct as implemented, and the reasoning defeats the Leader's on three counts:**

1. **R-RCU-005 governs *inbound* links the platform did not author** — "mistyped, stale or truncated". Its AC.2 toast is an error-reporting channel for foreign input, **not a notification bus the platform may self-trigger**. "Manufacturing a bad link so a downstream handler will apologize for it is a design inversion."
2. Emitting a knowingly-invalid token would make **a producer emit a non-canonical token** — exactly what R-RCU-007's own title forbids ("Every link producer emits the canonical scheme") and what freezing the map exists to prevent.
3. **The spec had already ruled on this id class** on the write side (§5.2 above: `serialize` silently omits an unmapped id, ruled a gap and not a FAIL because it is "the least-bad option the spec leaves available"). Ruling differently for the producers would contradict an accepted ruling.

The Leader's third option — omit the link entirely — was also rejected: it destroys a working `tab=my` affordance and makes a clickable count non-clickable, for a branch **unreachable in current data** (the frozen maps cover all 25 live `allResultStatus` rows and all 6 `QueryIndicatorsEnum` values, and both cards source ids from those same server vocabularies). The branch fires only on a genuine server-side addition — NFR-RCU-002's explicitly accepted residual risk, whose designated surfacing mechanism is **layer 2, now owned by T-06**.

Recorded because it is the second case in this run where the independent audit corrected the Leader's own analysis, and the first where the Leader was arguing *for* extra work.

#### Ruling on the cross-feature import

`data-overview.component.ts` importing `@platform/pages/results-center/url/results-center-url.vocabulary` is **acceptable as-is; do not move it, and moving is out of scope for T-09.** Design §2.1 places the vocabulary there *and*, in the same table, assigns `home/components/*` the job of emitting canonical parameters — the cross-feature dependency is deliberate. The `@platform/*` alias exists to make such an import legal without `../../..`, and there is repo precedent in the stricter direction (`shared/components/section-header` and `shared/components/alliance-navbar` both import from `@platform/pages/whats-new/…`). A move would touch T-01's file plus the two codec files T-02/T-03 import, and would require amending design §2.1.

#### Bookkeeping consequence — §5.2's open decision now spans three sites

§5.2's pending human decision **(ii)** — "whether the write side should surface an unmapped id at all" — now covers **three** producers, not one: `serialize` plus both `data-overview` cards. Recorded here so that whenever that decision is taken it does not amend `serialize` and silently leave the two home producers behind.

#### ADVISORY (recorded only; none may become a task or widen one)

1. **⚠️ Reliability — the highest-value advisory of the run so far.** `indicator_id` is **not coerced** before the map lookup. `getIndicatorData()` assigns `response.data` (typed `any`) straight into `indicatorList`, whereas the status path *does* coerce (`Number(item.result_status_id)`). If the indicators endpoint ever returns `"1"` as a string, `INDICATOR_ID_TO_SLUG.get("1")` misses a `Map<number, string>` and the card silently takes the drift branch — **and the Reviewer notes this is *not* the accepted NFR-RCU-002 risk**, it is a distinct latent defect producing exactly the silent-unfiltered-link the Leader was worried about, by a different route. One-token fix: `INDICATOR_ID_TO_SLUG.get(Number(indicator.indicator_id))`. **Surfaced to the user** — an advisory may not become a task, so this is theirs to decide.
2. *Readability.* The status fixture pairs `result_status_id: 7` with `label: 'Submitted'`, while the frozen map has 7 → `not-approved` and 2 → `submitted`. Harmless (the label no longer reaches the URL) and inherited from the old fixture, but it reads as a bug; either align it or cite requirements §9 R5 in a comment.
3. *Risk (sequencing).* T-06 is still `[ ]`, so today's read path recognizes only `indicatorTab`/`statusTab` — **both cards' filters are inert in the working tree right now** and only `tab=my` takes effect. That is the expected intermediate state, and T-09's Disqualifies clause assigns the end-to-end My-scope proof to T-06. **Leader must not treat that assertion as closed by T-09's unit tests.**
4. *Pre-existing, not this diff.* `data-overview.component.ts:77` hard-codes the fallback colour `'#1689CA'`, violating root `CLAUDE.md` §4.2's no-hex-literals rule. Untouched here; a separate cleanup.

**Final verification result:** 27/27 tests, `tsc` clean, lint clean, Reviewer `PASS` on attempt 1.

---

### Wave note — two client tasks run concurrently (deliberate exception)

`.agents/leader.md` warns that two tasks in one package are not safely parallel because they share `node_modules`, build output and ports. T-03 and T-05 were run concurrently anyway, **at the user's explicit request**, with four mitigations the Leader put in place instead of refusing: (1) disjoint file sets, verified before launch; (2) repo-wide git commands (`stash`/`checkout`/`restore`/`clean`/`reset`) **forbidden in both briefs**, with the reason and the path-scoped substitute given — a direct response to the T-02 incident; (3) disjoint, narrowed `--testPathPattern` runs, with the full-suite run reserved to the Leader on a quiet tree; (4) a cross-worker rule — an error in a file outside your own list is the other worker's transient state, do not fix it, re-run once, report. **Outcome: no interference.** Both workers reported clean `git status` bleed-checks, and neither ever saw the other's transient state.

### 5.5 A design §6.2 sentence is now literally false

`design.md` §6.2 states a cross-route mutation "cannot reach it twice over: **the counter does not move**". That is no longer true: `resetState()` (`service.ts:973`) calls `clearAllFilters()`, which now bumps, and its only caller is `project-detail.component.ts:171` — **a different route**. Harmless under T-08 (the effect captures its entry baseline at creation, so pre-existing bumps are absorbed, and the component is destroyed off-route anyway), but T-12 would otherwise be written to assert the wrong guarantee — *counter frozen* rather than *component destroyed*. Per the constitution's "fix the document, don't let docs and code drift" rule this is a one-clause doc correction rather than a scope question, and the Leader will make it unless told otherwise.


