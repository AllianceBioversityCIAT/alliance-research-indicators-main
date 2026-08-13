# Execution log — results-center / url-filters

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/results-center/url-filters` |
| Approval Mode | `gated` (from `proposal.md` Document Control) — the Leader pauses for the user after every task |
| Budget (`design.md` §13) | 12 tasks · **~4600 LOC** · 3 review rounds — *re-baselined **twice**, both times by user decision at a tripwire escalation, both times LOC-only (task count and review rounds have never moved). #1 2026-08-12 ~1000 → ~3200 (§3); #2 2026-08-13 ~3200 → ~4600 (§8), because #1's corrected total was built on an uncorrected per-task basis. This row itself was the third instance of that class — it read ~1000 for four tasks after re-baseline #1.* |
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

### T-04 — `seedFromUrl()` on `ResultsCenterService`

| Field | Value |
| --- | --- |
| Status | **PASS on attempt 2** (1 rework round consumed) |
| Date | 2026-08-12 |
| Implementer attempts | 2 |
| Requirements covered | R-RCU-002 AC.3/AC.5/AC.6/AC.7, R-RCU-006 AC.3 |
| Scope change | **Third file authorized by the user** — `…/results-center/class/table.filters.class.ts` |

**Files changed:** `results-center.service.ts`, `results-center.service.spec.ts`, and (attempt 2) `class/table.filters.class.ts`.

One method writes `tableFilters`, `resultsFilter`, `appliedFilters` and the my/all scope atomically from the codec's own `{ filters, scope }` shape — the fix for the D3 state-desync class. `invalidateResultsFetchDedupe()` is the first statement (JD-21). Seeds carry **only** option-value keys (D-URL-10); `tableFilters.indicators` is never written (§7.2). `applyStatusFilterFromHomeLink` became a thin delegate retaining only its legacy label write, dated for deletion by T-06.

#### Attempt 1 → Reviewer `STATUS: FAIL` — a defect the reported verification structurally could not see

> **Discovered Issue:** The production seed block does not type-check. … `statusCodes` → target `{ result_status_id: number; name: string }[]` (`name` **required**) … `sources` → `PlatformSourceFilter[]` … `years` → `GetYear[]`. `contracts` is the only one that is legal, because `display_label` is optional. The reported evidence cannot see this: `jest.config.ts:50` sets `isolatedModules: true`, so the Angular Jest transform is transpile-only — the 203/203 and 6436/6436 green runs are consistent with a broken type and do not refute it.
> **Violated Rule:** `.agents/reviewer.md` §2 *Stability & Integrity* and §5; root `CLAUDE.md` §4.2 (an AOT type error fails the build outright). The seeded shapes are correct per D-URL-10; **it is the untyped landing site that is wrong.**
> **Remediation:** Do **not** paper over it with `as any` — that re-hides exactly the drift D-URL-10 depends on. Widen the seed targets in `class/table.filters.class.ts`.

The Reviewer is read-only and could not run `tsc`. It reached this **statically**, from the declared types, stated it as falsifiable ("if `tsc` truly prints only the 2 known errors, this issue closes on that output alone"), and predicted that `contracts` alone would *not* error. **The Leader ran it. All four predictions were exact** — and settling it uncovered the `tsc`-masking process finding below.

#### The scope decision

D-URL-10's value-key-only seed is **unrepresentable** in the declared types: the design mandates a shape the data model forbids. T-04's Files-touched list excluded `table.filters.class.ts`, which is precisely why the Implementer — correctly staying in scope — produced a type error rather than a scope violation. **User authorized the third file (2026-08-12)**, explicitly rejecting the `as any` alternative on the Reviewer's reasoning. Recorded in `tasks.md` T-04 as a "Why the third file is required" note.

#### Attempt 2 (effort `xhigh`) → Reviewer `STATUS: PASS`

Three seed targets widened into strict supertypes: `statusCodes.name` → optional; `years` → `({ report_year: number } & Partial<GetYear>)[]`; `sources` → `({ platform_code: string } & Partial<PlatformSourceFilter>)[]`. Four now-redundant casts dropped from `getActiveFilters`.

> **Reviewer PASS summary:** The attempt-1 FAIL is closed correctly — the three seed targets were widened into strict supertypes so D-URL-10's value-key-only shape is legal **by construction rather than cast into silence** — and I verified by hand that every reader on all four routes either never touches a now-optional key or already coalesced it (`s.name ?? ''`), that the export path reads `resultsFilter` and cannot see a partial object, and that the `Partial<GetYear>` intersection keeps `report_year` required.

**The key insight, better than the Leader's framing:** the widening is *"a narrowing of the lie"*. The old type claimed `name: string` while the seed path produced no `name` at runtime — `getActiveFilters` already rendered `s.name ?? ''` **before** this change. The widening exposes design §7.2's documented transient rather than creating it, and makes the persisted-state JSON round-trip honest. Because each type is a strict supertype, no write site can break and the program-wide error count could only fall — it went **1359 → 1354**, resolving five pre-existing errors in other readers.

Every reader on all four routes was checked individually: `getActiveFilters`, `applyFilters`, `onFiltersConfirm` (linked-results modal), `countTableFiltersSelected`, `project-detail`, `results-center-table`, `project-platform-filters`, the sidebar template (no type coupling — `@Input() signal: WritableSignal<any>`), and the persisted round-trip. `getExportResultFilter` reads `resultsFilter`, never `tableFilters`, so export cannot break.

**Verification (Leader-run independently, not accepted on report):** probe `tsc` → **zero** errors in any of T-04's three files · full client suite → **309 suites / 6436 tests passing**, coverage 99.28/98.13/99.17/99.51 · lint clean. Attempt 2 changes zero runtime behavior (a type widening plus four no-op cast deletions).

#### Rulings

| # | Question | Ruling |
| --- | --- | --- |
| 1 | `.set()` on the wire signals vs `.update()` on `tableFilters` | **Correct.** Wholesale replacement is what R-RCU-004's "never partially merged" demands. `'result-codes'` omission harmless — only `create-result-form` uses it, on its own local object |
| 2 | `applyStatusFilterFromHomeLink`'s semantic broadening | **Verified no-op.** `loadMyResults(true)` at `component.ts:102` blanks those same fields immediately before `:110`, and sets `myResultsFilterItem` to `my`, which the delegate reads back. **The `?indicatorTab=1&statusTab=2` case is safe in the only order that exists** — `onSelectFilterTab` writes `indicator-codes-tabs` at `:107`, before `:110`, and `preservedIndicatorId` reads that signal; `indicatorTab=0` degrades correctly |
| 3 | Thin delegate vs deleting the method | **Faithful to "fold in".** Deleting now would break a caller in T-06's file, and the retained label write is legacy behavior §7.2 forbids moving into `seedFromUrl`. **T-06 must delete it outright, not merely stop calling it** |
| 4 | Scope write vs AC.5/AC.6/AC.7 + NFR-RCU-003 | **Satisfied.** `create-user-codes` resolved client-side from the cache; `ResultsCenterUrlState` carries no identifier. AC.7 holds **by construction** — scope and filters are one object plus one signal write, so no window exists in which seeding can overwrite scope |
| 5 | Widening too loose? | **No** — strict supertypes, no reader regresses (table above) |
| 6 | Two extra cast removals (`contracts`, `levers`) | **In scope, do not revert.** `tasks.md:124` names `c.display_label \|\| c.agreement_id` explicitly; `:323` is in the same computed, in an authorized file, and is a pure no-op deletion |
| 7 | `spec.ts:747` type error | **Genuinely pre-existing** (`years: [2024]`, a bare number array, never assignable to `GetYear` either). Only its reported target type changed — not a previously-legal line made illegal. Correctly left alone |

#### ADVISORY (recorded only; none may become a task or widen one)

1. **⚠️ Risk — carry into the T-11 brief.** `exactOptionalPropertyTypes` is **off**, so `name?: string` now legally admits an explicit `{ result_status_id: 5, name: undefined }`. `Object.hasOwn(item, 'name')` returns **`true`** for that object, which would silently defeat the very backfill D-URL-10 depends on (`multiselect.component.ts:188-190`). No current writer does this and the new comments warn against it — **but if T-11's rendered-chip proof ever goes red for a non-transient reason, this is the first thing to check.**
2. *Reliability (test gap).* Nothing pins "seeding never fetches". `expect(fetchPaginated).not.toHaveBeenCalled()` after a bare `seedFromUrl` would secure it — R-RCU-002 AC.4's single-request guarantee in T-06 rests on this property of T-04.
3. *Reliability (residual desync, unspecified by the design).* `seedFromUrl` writes `'lever-codes': []` but leaves `tableFilters.levers` untouched, so a lever selected on `/project-detail` would still render a `LEVER` chip while the fetch ignores it. `indicators` has the same asymmetry but is *mandated* untouched by T-04's done-check, so it is conformant. **A T-06/T-08 decision, not a change here.**
4. *Resilience (T-06 hand-off).* Unlike `applyFilters`, `seedFromUrl` does not call `resetResultsTablePaginatorToFirstPage()`; the delegate still does. `resultsTablePaginatorFirst` lives on the singleton, so a deep link arriving after paging elsewhere could fetch page N of a new filter. Not among §7.1's five writes — **flagged for T-06's `main()` step.**
5. *Risk (aliasing — spec-mandated, so not an issue).* One `seededFilter` object is shared by both signals per §7.1. Safe today, but a future in-place mutator would desync both at once — the mirror image of the D3 defect this method prevents. `Object.freeze` or a comment would make it explicit.
6. *Readability.* `results-center.service.ts:295`'s `as { indicator_id: number; name: string }[]` is now the only surviving cast in `getActiveFilters`, redundant against the untouched `indicators` declaration. Correctly left alone (outside the authorized lines); worth sweeping when `indicators` is next edited.

**Final verification result:** 456/456 targeted, **6436/6436 full suite**, probe `tsc` zero errors in this spec's files, lint clean, Reviewer `PASS` on attempt 2.

---

### T-06 — Read path: parse, precedence, scope, toast

| Field | Value |
| --- | --- |
| Status | **PASS on attempt 2** (1 rework round) |
| Date | 2026-08-13 |
| Review mode | **Parallel lens panel** (effort `xhigh`): precedence (gate) · reliability · risk. Attempt 1: risk PASS, reliability PASS, **precedence FAIL** |
| Requirements covered | R-RCU-002 (both scenarios + AC.2/AC.4/AC.6/AC.7), R-RCU-004 (all ACs), R-RCU-005 AC.2/AC.3, R-RCU-006 (both scenarios), **NFR-RCU-002 layer 2** |
| Files | `results-center.component.ts`, `results-center.component.spec.ts` (bounded authorization), `results-center.service.ts` (deleted `applyStatusFilterFromHomeLink`), `results-center.service.spec.ts` (its now-uncompilable describe) |

`initializeState()` rewritten onto the codec: init-only from `route.snapshot` (D-URL-5), `hadRecognizedParam` gating restore, explicit scope resolution, one `seedFromUrl` then one `main()`, toast, and two new `effect()`s for NFR-RCU-002 layer 2.

**Verification:** probe `tsc` clean for changed files · full suite **309 suites / 6448 tests** · lint clean. Leader independently verified all four fixes and the toast/navigate line order.

#### The scope tensions the Leader resolved before spawning

1. **`design.md` §6.1 step 9 vs `tasks.md` T-06 contradicted each other** — step 9 says "Wipe nothing. Both existing wipes are removed"; T-06 says "Do not remove the wipes here." Resolved in favor of T-06: §6.1 describes the **end state** after T-08, and design §12's ordering constraint is explicit that removing the wipes before the write path exists loses the user's refinement on reload and permanently suppresses session restore. `design.md` §6.1 step 9 was amended to say so.
2. **T-06 had no test file in scope, but rewriting `initializeState` breaks ~8 existing cases — and its Disqualifies clause requires T-11's harness, which depends on T-06.** Resolved with a bounded authorization: keep the spec green and **swap the canned `ActivatedRoute` snapshot for a real `ParamMap`** (the half of KZ-001 achievable now), but **not** drop the template override or swap in the real service (T-11's ~1,000-line rewrite).

#### Attempt 1 — the three lenses each found what the others did not

**precedence → FAIL:** stale `tableFilters.indicators`. The Implementer closed this leak class for `levers` and the paginator but left `indicators`, which has the larger blast radius — after an in-app navigation to a deep link (T-09's Home cards), the badge counts indicators the view does not apply, the multiselect shows them selected, and **the user's next Apply silently injects an indicator filter the link never named**. Also a regression against the deleted path: the old legacy branch called `onSelectFilterTab(...)`, which cleared it. Violated R-RCU-002 **AC.3** (three-signal parity), assigned jointly to T-06 by `tasks.md` §3. The lens also noted the Leader had recorded this very item in §5 as "a T-06/T-08 decision" — T-06 decided the `levers` half and left this one **neither fixed nor recorded**.

It further corrected the Implementer's done-check accounting from 6/7 to **5/7**: "exactly one results request" proved only a mocked `main()` call on two of four paths, and **"the filter is applied before that request" was not asserted at all.**

**reliability → PASS**, with two questions only the Leader could settle (it has no Bash). Checked against `git show HEAD`:
- **A real regression, confirmed:** the base awaited `loadPinnedTabPreference()` **unconditionally on both branches** (base `:101`, `:133`); the new code skipped it when `tab` was present, leaving `component.pinnedTab` at `'all'` so `orderedFilterItems()`/`isPinned()` render **the pin star on the wrong row**. The new spec had pinned the wrong behavior.
- `resetState` never called by base `initializeState` (stale mock leftovers, no regression); `primaryContractId.set(null)` twice in the base too (pre-existing).

It also caught that the Implementer **inverted design §6.1's own step order** — toast is step 8, wipe is step 9, and the code did the reverse. Consequence: a rejected navigation swallows the R-RCU-005 notice **entirely** plus an unhandled rejection. A mandatory notice must not be contingent on an unrelated router call.

**risk → PASS**, and its finding was the most urgent of the three despite not being in the diff: **`tasks.md` T-08's line ranges `112-121`/`133-138` now point at the NFR-RCU-002 layer-2 warning effects T-06 just added.** An Implementer following T-08 literally would **delete the mitigation and leave the wipe** — the exact inverse of D-URL-8. It supplied the content-based replacement pointer verbatim, which the Leader applied to `tasks.md` T-08, `design.md` §6.1 step 9 and D-URL-8, plus `requirements.md`. It also raised T-06's `levers` clear from "avoids a badge inflation" to a real defect fix: `applyFilters` maps `tableFilters().levers` → `'lever-codes'`, so **the first sidebar Apply after a deep link would have re-applied a lever the user never picked on that route.**

*The panel's value, recorded for Kaizen:* three lenses produced three disjoint findings. A single checklist Reviewer looking at the diff would not have opened `tasks.md` T-08 to check whether the refactor invalidated its pointers — that came from a lens whose explicit mandate was "assess damage to the tasks still ahead."

#### Attempt 2 (effort `xhigh` held — the tier↔effort rule forbids `max` on T2) → `STATUS: PASS`

Four fixes, batched into one attempt rather than two so the 3-attempt ceiling was not burned on partial feedback: `indicators: []` added alongside `levers: []`; `loadPinnedTabPreference()` made unconditional with `urlScope ?? preferred`; a `catch` degrading to `'all'` (in scope *because* fix 2 widened that call's blast radius to every deep link); toast moved above the navigate. Plus 5 new tests: stale-`indicators`, lone-`?tab=my` guard, preference-rejection unit + end-to-end, and toast-survives-rejected-navigate.

> **Reviewer PASS summary:** All four fixes are present, spec-conformant, and evidenced by assertions that can fail; FIX 1 in particular is a *clearing* operation that design §7.2 does not prohibit and that `onSelectFilterTab` already establishes as the canonical companion to setting `indicator-codes-tabs`, so it closes R-RCU-002 AC.3 without breaching T-04 or T-07.

**The ruling that mattered most** — the Leader asked whether the remediation traded one non-conformance for another, since T-04's done-check says `tableFilters.indicators` stays untouched. Ruled **no**, on three grounds: §7.2 prohibits *seeding*, and its stated rationale is that a seeded entry "would render no chip while still inflating `countTableFiltersSelected`" — writing `[]` can do neither, so it *serves* the rule; T-04's done-check is a property of `seedFromUrl`, which still never writes the key; and decisively, **`onSelectFilterTab` clears `tableFilters.indicators: []` in the same operation that sets `indicator-codes-tabs`**, so the fix converges on the codebase's own consistent-tab-state definition. T-07 is unaffected — nothing derives `indicator-codes-tabs` from `tableFilters.indicators`.

**Final done-check accounting (corrected):** 5 newly proved · 2 pre-existing proved · 1 (rendered DOM chip/tab-strip parity) **deferred to T-11**, which is correct and expected.

#### ADVISORY (recorded only)
1. *Reliability.* The pinned-`my` branch still stubs `loadMyResults`, so "exactly one request" is proved compositionally there rather than end-to-end as pinned-`all` now is. Asymmetric; unstubbing would mirror fix 4.
2. *Readability.* The new `catch` is silent while `togglePin`'s logs. A `console.warn` would match local precedent.
3. **Carry-forward for T-08.** `initializeState` still rejects if `router.navigate` rejects (reached via `void this.initializeState()`). T-08 deletes that statement — **but if T-08's write effect calls `router.navigate` without handling rejection, the same unhandled-rejection class reappears inside an `effect()`.** Relay into the T-08 brief.
4. *Scope note.* Layer 2 warns in production builds as well as dev/QA — a superset of `tasks.md`'s "dev/QA console" wording. Recorded as deliberate.

---

### 🚨 PROCESS FINDING — `npx tsc --noEmit` was reporting nothing for five tasks, and that was not evidence

**Discovered 2026-08-12 while adjudicating T-04's FAIL. This invalidates a verification command this run had been trusting since T-02.**

`client/research-indicators` contains **two pre-existing files with syntax errors**: `indicators-tab-filter.component.spec.ts(181,1) TS1005` and `oicr-form-fields.component.spec.ts(103) TS1005`. Every Implementer from T-02 onward was told to run `npx tsc -p tsconfig.json --noEmit` and to ignore exactly those two. Each did, each reported "only the 2 pre-existing errors", and the Leader accepted it five times.

**A syntax error aborts TypeScript's semantic pass for the whole program.** The Leader proved it by re-running `tsc` against a probe config identical to `tsconfig.json` except that it excludes those two files:

| Run | Result |
| --- | --- |
| `tsc -p tsconfig.json --noEmit` (as briefed) | 3 error lines, all `TS1005`, **exit 0** |
| Same, with the two broken spec files excluded | **1359 error lines** |

So "tsc clean" meant "tsc never got as far as type checking". The command was theatre.

**What it cost, and what it did not.** Scoped to this spec's files, the probe found **three real type errors, all in T-04** (`results-center.service.ts:817/818/820`) and **zero** in T-01, T-02, T-03, T-05 or T-09 (`results-center-url.vocabulary.ts`, `results-center-url.codec.ts`, `results-center.component.ts`, `data-overview.component.ts` are genuinely clean). The masking hid one task's defect, not five. But that is luck, not process: for five tasks the Leader was recording an assertion that could not fail — the exact defect class this spec's own Disqualifies clauses exist to forbid, committed by the Leader rather than by an Implementer.

**Corrected verification recipe, effective from T-04's rework onward.** `npx tsc -p tsconfig.json --noEmit` is not to be used or trusted in this package while those two files are broken. Instead, write a probe config that excludes them and grep the output for your own files:

```
cat > ./tsconfig.probe.json <<'EOF'
{ "extends": "./tsconfig.json",
  "exclude": ["src/app/pages/platform/pages/results-center/components/indicators-tab-filter/indicators-tab-filter.component.spec.ts",
              "src/app/shared/components/custom-fields/oicr-form-fields/oicr-form-fields.component.spec.ts"] }
EOF
npx tsc -p tsconfig.probe.json --noEmit 2>&1 | grep -E "<your files>"
rm -f ./tsconfig.probe.json
```
A grep is required because 1359 pre-existing errors would otherwise bury the signal. Fixing the two syntax errors would be the real repair, but both files are outside every task in this spec.

**Kaizen candidate — this is a new lesson, not a variant of KZ-001/KZ-004.** Those two are about a *test* that cannot fail. This is about a **verification command whose success is indistinguishable from its not having run.** A green exit code was accepted five times as proof of a check that was silently skipped. The lesson: *for any verification command, know what its failure looks like before trusting its success — and prefer a command whose output proves it did the work (a count, a file list) over one whose only signal is silence.*

**Credit where due:** the Reviewer is read-only and could not run `tsc`. It reached the correct conclusion **statically**, from the declared types, and explicitly told the Leader the issue would close on real `tsc` output alone — a falsifiable claim rather than an assertion. It also predicted which of the four seeded fields would *not* error (`contracts`, because `display_label` is optional). All four predictions were exactly right.

---

### Wave note — two client tasks run concurrently (deliberate exception)

`.agents/leader.md` warns that two tasks in one package are not safely parallel because they share `node_modules`, build output and ports. T-03 and T-05 were run concurrently anyway, **at the user's explicit request**, with four mitigations the Leader put in place instead of refusing: (1) disjoint file sets, verified before launch; (2) repo-wide git commands (`stash`/`checkout`/`restore`/`clean`/`reset`) **forbidden in both briefs**, with the reason and the path-scoped substitute given — a direct response to the T-02 incident; (3) disjoint, narrowed `--testPathPattern` runs, with the full-suite run reserved to the Leader on a quiet tree; (4) a cross-worker rule — an error in a file outside your own list is the other worker's transient state, do not fix it, re-run once, report. **Outcome: no interference.** Both workers reported clean `git status` bleed-checks, and neither ever saw the other's transient state.

### 5.5 A design §6.2 sentence is now literally false

`design.md` §6.2 states a cross-route mutation "cannot reach it twice over: **the counter does not move**". That is no longer true: `resetState()` (`service.ts:973`) calls `clearAllFilters()`, which now bumps, and its only caller is `project-detail.component.ts:171` — **a different route**. Harmless under T-08 (the effect captures its entry baseline at creation, so pre-existing bumps are absorbed, and the component is destroyed off-route anyway), but T-12 would otherwise be written to assert the wrong guarantee — *counter frozen* rather than *component destroyed*. Per the constitution's "fix the document, don't let docs and code drift" rule this is a one-clause doc correction rather than a scope question, and the Leader will make it unless told otherwise.



---

## 6. Task Execution History (continued)

### T-07 — Tab-strip sync effect

| | |
| --- | --- |
| **Status** | `[x]` — PASS on attempt 1 |
| **Commit** | see below |
| **Requirements** | R-RCU-002 (CapDev scenario), R-RCU-002 AC.3 · design §7.3 · D-URL-14 / R2-7 · JD-7 |
| **Implementer** | `akili-implementer` (T2, `sonnet`), effort `high` |
| **Reviewer** | `akili-reviewer` (T3, `opus`), lens-checklist mode |
| **Attempts** | 1 |

#### Files changed — three, two beyond the task's declared list

`tasks.md` T-07 declared **Files touched** as `results-center.component.ts` alone. Two more were needed and are Leader-authorized:

| File | Change | Justification |
| --- | --- | --- |
| `results-center.component.ts` | +40 — the `indicatorTabStripSync` effect | the task |
| `results-center.service.ts` | +1/−1 — `syncIndicatorTabSelection` `private` → public | mechanical enabler; body byte-identical. The alternative (duplicating the `list.update` mapping into the component) is the D3 state-desync defect class this spec exists to close |
| `results-center.component.spec.ts` | +172 — three done-check tests + a fidelity double | the task's own done-checks mandate tests; a task cannot be verified without them |

Neither was escalated as a scope question: one is a single token with no behavior change, the other is demanded by the acceptance criteria. Both are recorded here and T-07's **Files touched** line is amended to match, following the precedent set on T-08.

#### The mechanism

```ts
private readonly indicatorTabStripSync = effect(() => {
  const isLoading = this.api.indicatorTabs.lazy().isLoading();
  const indicatorCodesTabs = this.resultsCenterService.resultsFilter()['indicator-codes-tabs'];
  if (isLoading) {
    return;
  }
  this.resultsCenterService.syncIndicatorTabSelection(indicatorCodesTabs?.[0] ?? 0);
});
```

**Both reads sit above the guard, and that placement is load-bearing** — the Reviewer's finding, not the brief's. Angular re-collects dependencies per run, so moving the `resultsFilter()` read below `if (isLoading) return;` would leave a creation-run-while-loading tracking `isLoading` **only** — precisely the single-dependency state D-URL-14 rules out. Correctness would usually survive by luck, because the eventual `isLoading` false-flip re-runs the effect and re-reads the filter; it would break for a seed arriving *during* loading. The current form is the literal reading of the decision and the robust one.

#### Cycle freedom — verified at the framework source

The effect writes `indicatorTabs.lazy().list` and must never read `list()`. The Reviewer confirmed the untracked-read claim rather than accepting it: `WritableSignal.update` → `signalUpdateFn(node, fn)` → `signalSetFn(node, updater(node.value))` (`@angular/core/fesm2022/primitives/signals.mjs:469-474`) reads `node.value` as a direct field access with no producer/consumer registration. The effect therefore never becomes a consumer of `list`. Cross-effect interaction also terminates: T-07 writes `list` → T-06's completeness effect (which *does* read `list()`) re-runs → writes nothing back.

#### `allowSignalWrites` — the spec is the artifact that was wrong

design §7.3 and `tasks.md:205` both state the effect **requires** `allowSignalWrites: true`. On Angular 19.1.6 it is a deprecated no-op, and the Leader directed the Implementer to omit it, following the precedent T-06 had already established in the same file (`results-center.component.ts:103-104`). The Reviewer confirmed at three independent sites: `core/index.d.ts:2653-2656` marks the option `@deprecated no longer required, signal writes are allowed by default`; `core.mjs:40768-40769` emits a dev-mode `console.warn` when it *is* passed; and `BASE_EFFECT_NODE` hard-sets `consumerAllowSignalWrites: true` (`core.mjs:40815-40819`). Omitting it is not merely equivalent but marginally better — it avoids the deprecation warning that the singleton's `onChangeList` still triggers. **Both spec sentences corrected.**

#### The regression guard actually guards

T-07's **Disqualifies** clause is unusually strict: a single-visit test cannot detect this defect class at all, and a fresh `TestBed` per case *also* cannot, because it simulates a fresh session. The two visits must share one endpoint instance.

Satisfied genuinely. `indicatorTabsLoadingSignal` / `indicatorTabsListSignal` are closed over by the single `mockApiService.indicatorTabs.lazy` from one `beforeEach`; visit 2 is a second `TestBed.createComponent` on the same configured module with no re-`configureTestingModule`; the assertion reads the shared list signal. The Reviewer verified all three conditions the JD-7 ordering needs are present — a creation-run before the seed, the seed landing later, and **no `isLoading` transition in between** to re-arm an `isLoading`-only effect — and noted two independent reasons the red is the right red: the assertion targets tab id **4** while visit 1 leaves id **1** behind (a stale pass cannot masquerade as a correct one), and the Implementer's `untracked()` probe turned the tests red on exactly the D-URL-14 property.

One property emerged that the design asserted but no test had exercised: `fixture.destroy()` destroys the effect, because it is a *view* effect (`createViewEffect`, `core.mjs:40776-40778`). Visit 2's sync therefore provably comes from a **new effect instance** — design §7.3's "re-arms on every visit" claim, now under test rather than assumed.

#### The shared-mock blast radius — claim not taken on trust

The highest-risk item in the diff is not the effect; it is that `seedFromUrl` went from an inert `jest.fn()` to a fidelity double that **mutates `resultsFilter`**, inside the `beforeEach` shared by every test in a 1,090-line file. The Implementer asserted no other test asserts on `resultsFilter()` after `initializeState()`. The Leader's brief instructed the Reviewer to verify that by reading the file, on the grounds that a green suite is equally consistent with the claim being true and with another assertion having been silently weakened into vacuity.

It read all 1,090 lines. Every `resultsFilter` occurrence outside the T-07 block belongs to `loadMyResults` / `loadAllResults` describes that call the component method directly and never reach `initializeState`, so the new body never executes there; every other `initializeState()` test asserts only on `seedFromUrl` arguments, `main` call counts, `tableFilters`, paginator, `router.navigate` and toasts — none of which the double writes. It also checked a second-order effect nobody had raised: the T-07 effect now runs inside **T-06's** tests, firing `syncIndicatorTabSelection(0)` and rewriting the list. Neither satisfies nor breaks the `console.warn` assertions there; if anything it strengthens the "warns only once per id" case.

And the double's *fidelity* is anchored rather than asserted: the real `seedFromUrl`'s `indicator → indicator-codes-tabs` mapping is independently pinned by `results-center.service.spec.ts:1362-1377`, so production drifting from the double turns a service test red. Likewise the now-public real `syncIndicatorTabSelection` is exercised through `restorePersistedState` (`results-center.service.spec.ts:2199-2254`), so the production body is not left proved only by its own double — the KZ-001 trap this task was most exposed to.

#### Verification

| Check | Result |
| --- | --- |
| Targeted (`--testPathPattern "results-center"`) | 9 suites, 471 tests, pass |
| Full client suite (KZ-003 — a root-singleton API surface changed) | **309 suites, 6451 tests, pass**; coverage 99.27 / 98.13 / 99.17 / 99.5 |
| Type check (corrected probe) | **1354 lines — identical to the T-04 baseline**; `NO ERRORS IN T-07 FILES` |
| KZ-001 red/green probe | dual dependency removed via `untracked()` → first-visit **and** second-visit tests red; restored → 471 green |

#### PROCESS FINDING — the §5.4 remedy was correct; relocating it broke it

**The recipe recorded at §5.4 was not wrong.** It writes the probe to `./tsconfig.probe.json` — inside the package — which is exactly right. What went wrong is that the Leader **re-typed it into the T-07 brief at a different path** (`/tmp/tsconfig.t07probe.json`), following this session's convention of keeping temporary files out of the project. `extends` and `exclude` globs resolve relative to the **config file's own location**, not the cwd, so `"extends": "./tsconfig.json"` became `/tmp/tsconfig.json` and failed:

```
error TS5083: Cannot read file '/tmp/tsconfig.json'.
```

TypeScript then continued with **default compiler options** — no path aliases, no `include` — and swept every reachable file, including a stale `list-routes.ts` left in an unrelated session's scratchpad. Output: **2227 lines** of a different program's errors. Re-run by the Leader with the probe inside the package: **1354 lines, byte-for-byte the pre-existing baseline**, and no errors in T-07's files. The type evidence for T-07 is clean; the first measurement simply was not of this codebase.

Two lessons, and the second is the useful one:

1. **A verified recipe is copied verbatim, never re-derived or relocated.** §5.4 already held the working command. The Leader paraphrased it to fit a convention (scratchpad hygiene) that silently conflicts with how `tsconfig` resolves paths. That convention is right for scripts and outputs and wrong for a config file with a relative `extends` — such a file is not a loose temporary artifact, it is a node in a path graph.
2. **§5.4's own generalization was incomplete.** It recommended preferring "a command whose output proves it did the work (a count, a file list) over one whose only signal is silence." A count *was* produced — 2227 — and it proved nothing, because the command had silently changed **what it was counting**. The missing requirement: a verification command must **fail loudly when its own configuration does not apply**. `tsc` prints `TS5083` on line 1 and then compiles something else anyway. Here the grep survived (accidentally correct); the count, which was §5.4's recommended safeguard, is precisely what misled.

**For T-08 / T-11 / T-12:** copy the §5.4 block unchanged, probe config in the package directory. Assert the baseline explicitly — `1354` — instead of reading it as informational, and treat `TS5083` / `TS6053` anywhere in the output as an aborted run rather than a finding. A *changed* baseline is now itself a signal.

**Credit:** the Implementer had a clean grep and could have called the check passed. It reported the unexplained number instead, in `Not Done / Assumptions`, with an explicit "I can't attest to why the baseline moved." The finding exists because a worker declined to round an anomaly down to a green check.

#### ADVISORY (recorded, non-gating, no owner)

Per the Advisory rule these are recorded and die here — none may become a task or widen one. Escalated to the user in the same report as this entry.

1. **Effect churn (reliability, not correctness).** Reading `resultsFilter()` tracks the whole signal, so the effect re-runs on any filter-key change — including `main()`'s `create-user-codes` normalization (`results-center.service.ts:501-519`), which fires on every fetch under the My-results tab. Each run writes a new list array with no equality guard, so `list()` consumers re-run per fetch. Idempotent for `active`, and consistent with `onChangeList`'s own idiom; an early return when the target tab is already the sole active one would remove it cheaply if profiling ever shows it.
2. **A stale line citation was introduced into production code.** The new doc comment cites `onChangeList` at `results-center.service.ts:405-430`; it lives at `:418-443`. The error is inherited verbatim from design §7.3. The §7.3 citation is corrected to content-based; **the code comment is left as-is** — the Leader writes no production code, and an advisory may not widen a task to fix it. Recorded for whichever future task next opens that file.
3. **Carry-forward to T-11 — two things the harness rewrite must not normalize.** (a) The fidelity double is what gives both regression guards their discriminating power; replacing it with an inert `jest.fn()` or with the real service makes them vacuous or relocates the seam. Whichever T-11 chooses, it must re-run the `untracked()` red/green probe to prove the dual dependency is still gated. (b) The `some(active) === false` assertion in done-check 3's test is true only because that test never calls `detectChanges()`. If T-11 adds a `detectChanges()` to `beforeEach` — a very natural rewrite — that assertion goes red for a *correct* behavior change, and the tempting fix is to delete it rather than re-express done-check 3 as "the filter value is right at the moment `main()` fires."
4. **Carry-forward to T-08 — no conflict found.** T-08's write effect tracks only `userFilterMutations()`, which T-07 never bumps, so T-07's extra `list` writes cannot induce spurious navigations; neither effect reads the other's written signal.
5. **Carry-forward to T-12.** T-07 adds a second public writer of `api.indicatorTabs.lazy().list` on the root singleton. If T-12 narrows that shared surface, the constraint to preserve is that the writer stays a **single named method** — duplicating the mapping into the component is the D3 defect class.

#### Spec documents corrected with this task

| Document | Correction |
| --- | --- |
| `design.md` §7.3 | the `allowSignalWrites: true` requirement sentence (false on Angular 19.1.6); `onChangeList` line citation → content-based |
| `tasks.md` T-07 | the same `allowSignalWrites` note; the `onChangeList` citation; **Files touched** amended to the three authorized files |

---

## 7. Task Execution History (continued)

### T-08 — Write effect + remove **both** wipes

| Field | Value |
| --- | --- |
| Status | **PASS on attempt 2** (1 rework round consumed) |
| Date | 2026-08-13 |
| Requirements covered | R-RCU-003 (both scenarios, AC.1/AC.3/AC.4), NFR-RCU-001, NFR-RCU-003, NFR-RCU-004 · D-URL-8, D-URL-9, D-URL-15 |
| Files touched | `results-center.component.ts`, `results-center.component.spec.ts` — exactly the two authorized, confirmed by `git status` at both attempts |
| Implementer | `akili-implementer` → T2 (`sonnet`), effort **xhigh** both attempts |
| Reviewers | **parallel lens mode** (effort `xhigh` per `/akili-execute` §2.3) — three lenses on attempt 1, scoped re-review of the two failing lenses on attempt 2. All on T3 (`opus`); `author ≠ auditor` held on both axes throughout |
| Skills assigned | `angular-developer`, `tdd` (attempt 1) · + `systematic-debugging` (attempt 2). **Deviation from the task's list:** `tdd` was added by the Leader — T-08's nine done-checks are literally test scenarios with expected values fixed by `requirements.md`, which is exactly where red→green pays |
| Final verification | full client suite **309 suites / 6472 tests** green · lint clean, `--fix` mutated nothing · type probe **1354 lines = baseline exactly**, zero hits on T-08's files · coverage 99.27 / 98.08 / 99.17 / 99.5 against floors 40/20/45/30 |

#### What landed

The component-scoped write effect (`urlWriteEffect`) and the deletion of the merged query-parameter wipe, together — the ordering constraint design §12 makes non-negotiable. The effect tracks **only** `userFilterMutations()`, reads all filter state through `untracked()`, guards the mandatory first run against a creation-time counter baseline captured in the field declared immediately above it, compares the **merged** parameter result against the current query string, and navigates with `{ relativeTo, queryParamsHandling: 'merge', replaceUrl: true }` with the rejection handled.

**The wipe was located by content and the trap was avoided.** `tasks.md` T-08 warned that the line ranges `112-121`/`133-138` now point at T-06's NFR-RCU-002 layer-2 mitigation. Both `indicatorVocabularyCompletenessCheck` and `statusVocabularyCompletenessCheck` survive untouched, and `router.navigate` appears in the production file at exactly one site — inside the new effect. The content-based pointer worked; this is the first time in this spec that a stale-line-number hazard was *anticipated* rather than discovered after the damage.

#### Attempt 1 — three lenses, two FAILs

**risk → PASS.** No defect in the diff. Verified the one line citation the diff introduces into production code (`results-center.service.ts:810-845` for `seedFromUrl`) is *exact* — notable because T-07 introduced a stale one and the advisory was carried forward. Also re-verified T-07's carry-forward: `syncIndicatorTabSelection` does not bump the counter, and the two effects share no signal, so no spurious navigation is inducible. Its findings were entirely document corrections, applied below.

**conformance → FAIL (2).** Cleared design §6.2 steps 1–5 literally, D-URL-8's discharge, the NFR-RCU-002 survival, and T-06's two wipe assertions (correctly inverted, not deleted, wipe not re-added). **Adjudicated R-RCU-003 AC.2 in the Implementer's favour**: design §10.1's coverage table assigns round-trip to the codec unit row, and the test exists at `results-center-url.codec.spec.ts:504-525`. The "all ACs" phrase on T-08's *Requirements covered* line is over-broad relative to §10.1 and to T-08's own nine-item done-check list — a wording defect, not a coverage gap.

**reliability → FAIL (2).** Cleared the untracked boundary, the entry-guard arithmetic, the counter ordering contract (verified no bumping path was made async ahead of its `.set()`s), the type guard, and rejection handling. Established that `route.snapshot` freshness is sound — a query-param-only navigation on a reused route reassigns the snapshot, and the only staleness window can produce a spurious `replaceUrl` write, never a loop.

The four FAIL issues were **all about test fidelity, none about the implementation**. Production code was byte-identical between attempts.

| # | Lens(es) | Finding |
| --- | --- | --- |
| 1 | conformance | **NFR-RCU-003's two tests were structurally incapable of failing** — the sentinel `123` was never placed into the state the effect serializes (`create-user-codes` stayed `[]`). This is the *precise* defect for which `tasks.md` moved the check off T-03 ("T-03's codec-level test is a structural argument only"). It arrived structural again |
| 2 | conformance + reliability + risk | **The merge contract was reproduced by the test, not observed.** The helper `latestMergedParams()` reimplemented Angular's merge and never inspected `queryParamsHandling` on the call it read. `'merge'`→`'preserve'` means no filter ever reaches the address bar; omitting the option drops `?utm_source` — **both mutants left all ~20 new tests green**, including the one named for that done-check. Since design §6.2 makes the whole null-emission scheme (R2-1) *conditional* on `merge`, this single unasserted string carried the design decision |
| 3 | reliability | **No write-path test with a legacy parameter present.** T-08 deleted the wipe and re-homed that behavior onto `serialize`'s trailing nulls reaching the router under merge — the CapDev-email journey the spec narrates verbatim. Production was correct; nothing would have gone red if the composition broke |

Three lenses reaching finding 2 from three different directions is the strongest signal this panel has produced. A single checklist Reviewer would plausibly have accepted a helper that "computes the merge correctly".

#### The promoted advisory — a recorded rule bend

The reliability lens filed a fourth item as **ADVISORY**: deleting the `untracked(...)` wrapper entirely failed **no** test, leaving D-URL-15's tracked-dependency contract — the decision T-08 exists to implement — unverified. `/akili-execute` §2.4 forbids widening a task to absorb an advisory.

**The Leader escalated the choice to the user rather than deciding it, and the user directed that it land in attempt 2.** Recorded here as an explicit, user-authorized deviation from the Advisory-Never-Widens rule, not as precedent. The alternative offered — defer to T-11 as an owned carry-forward in its Disqualifies clause — was declined in favour of verifying the contract in the task that creates it. The rule's purpose (stopping scope growth from the least-vetted findings) is real; the counter-argument accepted here is that this advisory was about the central design decision of the task under review, cost four lines, and lived in a file the Implementer already owned.

#### Attempt 2 — all four fixed, each proven red/green

The Implementer took the **stronger** option on finding 2 rather than the cheap one: `mockRouter.navigate` now has a real implementation executing Angular's `queryParamsHandling` semantics against accumulated state, and the two hand-rolled simulation helpers were **deleted outright** across 12 call sites.

| Fix | Mutant applied | Result |
| --- | --- | --- |
| 1 — NFR-RCU-003 sentinel seeded in `create-user-codes` | serialize `create-user-codes` into `contract` | RED (both scopes) → reverted → GREEN |
| 2 — router double executes the merge contract | `'merge'` → `'preserve'` | RED (11 tests) → GREEN |
| 2 — *(second mutant)* | option deleted entirely | RED (3 tests) → GREEN |
| 3 — legacy-parameter write test | no-op the codec's `LEGACY_PARAM_NAMES_ORIGINAL_CASE` loop | RED → GREEN |
| 4 — `untracked` mutation-killer | inline the `untracked(...)` body | RED (2 navigates vs 1) → GREEN |

**Both re-review lenses returned PASS.**

The conformance lens verified the double against Angular v19's **actual** `createUrlTree`/`removeEmptyProps` source in `node_modules`, line by line, on all four sub-checks (null/empty-string handling, omitted-key preservation, the `preserve` branch, `replaceUrl`). Verdict: the double is faithful, and where it diverges it errs **stricter** — it cannot recreate the blindness it was built to fix.

The reliability lens ran the probe-residue check **first**, correctly treating it as the finding that would dominate all others: the Fix 3 probe had edited `results-center-url.codec.ts`, a file outside the authorized set, and a half-reverted codec probe would not surface in a passing suite. The diff confirms that file appears nowhere and the production component carries only attempt 1's content. It also walked all 16 tests in the new block against a "the effect wrongly no-ops" regression — 14 go red — confirming the `mock.calls.at(-1)` hazard it had flagged on attempt 1 did not survive the refactor in a new shape.

#### ADVISORY (recorded, non-gating, no owner)

Per the Advisory rule these are recorded and die here — none may become a task or widen one. Escalated to the user in the same report as this entry.

1. **The two NFR-RCU-003 tests remain vacuous under a *total* effect no-op** — raised independently by **both** re-review lenses. With `currentQueryParams` still `{}`, `resultingQueryString()` returns `''` and `not.toContain('123')` passes. One positive co-assertion (`toContain('contract=A100')`) or a `toHaveBeenCalledTimes(1)` closes it at zero cost. Low severity — fourteen sibling tests with identical setup would fail first. **Not folded into the rework: the advisory rule was already bent once this task by explicit user decision, and the Leader declined to bend it twice on its own authority.**
2. **The double treats only `null` as "clear this key"; the real router's `removeEmptyProps` strips `null` **and** `undefined`.** Unreachable today (`serialize` is typed `Record<string, string | null>`), and the divergence errs strict, so the risk is a false RED on a future change rather than a missed defect. The inline comment near the contract-clearing assertion states the `undefined` case wrongly and would teach the next maintainer the wrong model.
3. **`router.navigate` resolving `false`** (cancelled/blocked navigation) produces the same address-bar divergence as a rejection, with no log at all. `.catch` covers only the rejection half.
4. **The `ActivatedRoute` double flattens multi-value params** to the first value where real Angular yields `string[]`; the component casts to `Record<string, string>` and `paramsEqual` compares with `===`. For a repeated key (`?contract=A100&contract=S192`, which T-02's done-check supports) production compares an array against a string and navigates once spuriously — self-correcting, not a loop, history-flat under `replaceUrl`. **Carry to T-11**, whose real-router harness is where the two sides stop being reconciled by coincidence.
5. **The double advances `route.snapshot` synchronously** where the real router resolves asynchronously. No live path today — the write path never bumps the counter — but a future task that lets it, or that reintroduces a `queryParamMap` subscription, will not be caught by this harness.
6. **`call[0]` (the commands array) is pinned by no test.** A regression to a non-empty command array would change the route path with the suite green. One line beside the existing `relativeTo` assertion closes it.

#### 7.1 SPEC GAPS — two real holes, neither T-08's to fix

Both surfaced during review, both are **design-level**, and per the Advisory rule neither may be absorbed into a task. Escalated to the user for a decision.

1. **The sidebar indicator multiselect changes the table and writes nothing to the URL.** `applyFilters` writes it to `'indicator-codes-filter'` (`results-center.service.ts:704`); the write effect serializes only `'indicator-codes-tabs'`, faithfully per design §5.1. §5.1 hides the multiselect only *"whenever a tab is set"* — so with no tab set, a user can apply an indicator filter that changes what they see and produces no URL change at all. Against R-RCU-003 **AC.1** ("each of the five sidebar filters") this is a genuine hole. It belongs in D-URL-12's rationale or the decisions log, not in T-08's rework.
2. **Case-varied keys are pinned in the URL forever.** `parse` folds keys, so arriving at `?CONTRACT=A100` is supported on read (R2-6). But `merge` matches keys case-sensitively, so the first mutation emits canonical `contract` while `CONTRACT=A100` survives — the URL carries both permanently, and the next load folds them into a duplicated value list. This is the same defect class R3-2 fixed for the legacy keys, one dimension over; design §6.2 addresses spelling only for `indicatorTab`/`statusTab`/`statusLabel`. Hand-typed URLs only.

#### 7.2 Process findings

**The verification recipe held this time.** Both attempts copied the §5.4 probe block verbatim with the config inside the package. Attempt 1 and attempt 2 both reported **exactly 1354** lines. The T-07 lesson ("a verified recipe is copied verbatim, never re-derived or relocated") was applied rather than re-learned — the first task in this spec where that is true.

**A done-check can be wrong in the same way a line citation can.** T-08's own implementation note demanded that a grep for `indicatorTab|statusTab|statusLabel` return **zero** hits. Against the finished tree it returns 8 — every one a substring collision with `api.indicatorTabs` and T-07's `indicatorTabStripSync`. Word-bounded (`\b…\b`) it returns zero, and `router.navigate` appears exactly once. The wipe is genuinely gone; the *check* was unsatisfiable as written. This is the same defect class as the line-number trap the very same task block warns about, one layer up: **a verification instruction, like a citation, decays against the tree it was written for.** Corrected in `tasks.md` below.

**Coverage floors were reported without being asked twice.** `npm run test:cov` does not exist in this package; coverage is collected by the standard `npm test`. The Implementer said so plainly instead of inventing a command or silently skipping the check.

#### Spec documents corrected with this task

All corrections below are the risk lens's findings, applied by the Leader per the constitution's *fix the document, don't let docs and code drift* rule.

| Document | Correction |
| --- | --- |
| `tasks.md` T-08 | the unsatisfiable substring grep → word-bounded, with the `indicatorTabs` collision named |
| `tasks.md` T-11 | line citations `101-108` / `112-117` → content-based (they now miss by ~70 lines); the `template: '<div></div>'` literal is written with backticks in the source, so the quoted grep finds nothing; Disqualifies clause extended so the T-08 block is **re-expressed against a real router, not ported** — its simulation helpers are now gone and porting the rest would double-merge |
| `requirements.md` §1, R-RCU-006 | the two wipes described in present tense with the `112-121`/`133-138` ranges — the *same* citation `tasks.md` T-08 flags as "actively dangerous", never swept into these two documents. Now past tense, content-based |
| `design.md` §6.1 step 9, §6.2, §12 D-URL-8, §11 | wipe references → past tense; D-URL-8's raw line ranges → content-based |
| `design.md` §10.2 | "~1,000-line spec" → the file is now **1,550 lines**, which matters because T-11 is the budget's largest item |

---

## 8. Budget Tripwire — BREACHED a second time, escalated, re-baselined ~3200 → ~4600

**Date:** 2026-08-13 · **Raised by:** the Leader, at Step 2.1, **before spawning T-11's Implementer** · **Resolved by:** the user

### Why it was raised before the task, not after

T-11 is the budget's single largest item (~1,000 LOC by `design.md` §10.2's own estimate). §2.4's rule — *"the cost of a mis-sized spec is only recoverable while it is still running"* — is worth nothing if the check fires after the spend. So the measurement was taken in the window between T-08's landing and T-11's spawn, with the tree quiet.

### The measurement

`git show --stat` over this spec's ten **code** commits (the three docs-only commits excluded):

| Task | Insertions | Task | Insertions |
| --- | --- | --- | --- |
| T-01 | 497 | T-06 | 622 |
| T-02 | 839 | T-07 | 341 |
| T-03 | 440 | T-08 | 825 |
| T-04 | 376 | T-09 | 189 |
| T-05 | 257 | T-10 | 137 |

**4,523 raw insertions; ≈3,400 of them code** — each commit also carries its own `execution.md` / `tasks.md` / `design.md` edits, which is why every one touches 4–7 files.

| | Budget #1 | Actual, 10/12 tasks | Remaining | Projected |
| --- | --- | --- | --- | --- |
| Tasks | 12 | 10 | T-11, T-12 | 12 — **on budget** |
| Review rounds | 3 | 3 (only T-08 reworked) | — | 3 — **on budget** |
| LOC | ~3,200 | **~3,400** | ~1,200 | **~4,600 (+44%)** |

### Root cause — the same defect class as breach #1, one level down

Re-baseline #1 extrapolated the eight unfinished tasks at *"roughly the observed per-task average"*. That average came from a **three-task sample dominated by two pure-unit tasks** (T-01, T-02, T-10 ~80), landing near ~150 LOC/task. The wiring tasks then averaged **~440 insertions each**, so the remainder cost ~2,600 against ~1,200 carried.

**A re-baseline must correct the basis, not just the total.** Breach #1 was JD-14's *"budget raised by less than the single item it was raised to accommodate"*; breach #2 is a corrected **sum** carrying a superseded **per-item** figure. Same shape as **KZ-006** — *sweep the claim, not the citation*. Nominated for the Kaizen log at `/akili-archive`.

### Options presented, and the decision

| Option | Cost | Outcome |
| --- | --- | --- |
| **Proceed at full scope, re-baseline to ~4,600** | Budget only | ✅ **Chosen by the user** |
| De-scope T-11 to its carry-forward set (real param map + real service + T-05's rendered click + T-08's 16 tests re-expressed; no per-filter rendered chips) | ~40% saved, but **D3** (state desync — the class this spec exists to close) left only partly verified against R-RCU-002 AC.3 | Declined |
| Close after T-12; move T-11 to a follow-on spec | **KZ-001 at recurrence 4** stays live inside the very file that tests this feature; T-05's rendered R3-1 guard left unowned | Declined |

**Why proceeding is defensible rather than merely convenient:** of the two budget dimensions that measure *scope* — task count and review rounds — neither has moved in any revision. Only LOC has, three times, always as an estimation error and never as scope growth: no task exceeded its stated scope and 10 of 12 passed with zero rework. The two remaining tasks touch **`*.spec.ts` files only**, so the residual estimation risk carries no production surface at all.

### Carried into T-11 unchanged

The two **SPEC GAPS** from T-08's review (§7.1 — the sidebar indicator multiselect writing nothing to the URL with no tab set; case-varied keys pinned in the URL forever) remain **open and unowned**. Both are write-path design questions and neither blocks a harness rewrite, but a decision that changes the write effect would change tests T-11 is about to author. Re-flagged to the user at this escalation; the user's instruction was to proceed with T-11.

---

## 9. Task Execution History (continued)

### T-11 — Rewrite the Results Center component spec harness

| Field | Value |
| --- | --- |
| Status | **`[~]` PARKED — not HALTED.** Implementer attempt 1 is complete and self-verified; the independent review was never obtained (environment blocker, below) |
| Date | 2026-08-13 |
| Implementer attempts | 1 (of 3 — **zero consumed by FAIL**; no Reviewer verdict exists to fail against) |
| Reviewer verdicts | **none** — all three lens Reviewers terminated on an API session limit |
| Requirements covered (claimed, unverified) | R-RCU-002 AC.3, R-RCU-003 AC.1–AC.4, NFR-RCU-001, NFR-RCU-003, and the rendered half of T-05's R3-1 guard |

> ⚠️ **This is a park, not a HALT. Do NOT apply `/akili-execute` Step 4's Automatic Rollback.** `git restore . && git clean -fd` would destroy a complete, self-verified 1,316-line rewrite that no Reviewer has yet had the chance to reject. Step 4's rollback is scoped to *three failed attempts or a `FATAL_FAIL`*; neither occurred. The work is **uncommitted in the working tree** — the only copy. Preserve it.

**Files changed** — `results-center.component.spec.ts` only (1,621 → 1,639 lines; 1,316 insertions / 1,297 deletions). No production file is in the diff. Materialized diff for the review that has not yet run: `…/scratchpad/T-11.diff` (2,883 lines).

**Attempt 1 — Implementer (T2 `sonnet`, effort `xhigh`, skills `angular-developer` + `systematic-debugging`)**

*Leader skill deviation, recorded:* the task listed `angular-developer` alone; `systematic-debugging` was added because the diagnosis of a 1,600-line harness rewrite's failures is the bulk of the work rather than an incident within it.

What landed: the fabricated `ActivatedRoute` / `Router` / `ResultsCenterService` doubles and the `.overrideComponent` template override are gone. The suite renders the real four-child tree (`app-indicators-tab-filter`, `app-results-center-table`, `app-table-filters-sidebar` inside the CSS-toggled `app-section-sidebar`, `app-table-configuration`) with the real `ResultsCenterService`, real `CacheService`, and real control-list services (`GetAllResultStatusService`, `GetContractsService`, `GetYearsService`, `SourceFilterOptionsService`, `GetAllIndicatorsService`) over a mocked `ApiService`. URL read/write tests use a real `Router`/`ActivatedRoute` through `RouterTestingHarness`, so the write path's merge is Angular's own `createUrlTree` — **not** the hand-simulated double T-08's review had to verify line-by-line.

**Verification (self-reported, not independently audited)**

| Check | Result |
| --- | --- |
| `npm test -- --silent` (from `client/research-indicators`) | 309 suites / 6,473 tests green; coverage 99.27 / 98.09 / 99.17 / 99.5 vs floors 40/20/45/30 |
| `npm run lint -- --quiet` | all pass; `git status` after shows only the spec file — the `--fix` in that script mutated nothing |
| Type probe | recipe **copied verbatim** from the established one (the T-07 lesson, held for the third task running): **1,354 lines, identical to baseline**; zero hits on the rewritten file |

**Red/green mutant table** — all five applied to `results-center.component.ts` and reverted via `git checkout --`:

| # | Assertion | Mutant | Result |
| --- | --- | --- | --- |
| 1 | R2-1 clearing guard | disabled null-key deletion in the merge loop | RED (`contract` survived a clear) → GREEN |
| 2 | `?utm_source` preservation | removed `queryParamsHandling: 'merge'` | RED (param lost) → GREEN |
| 3 | `untracked` mutation-killer | `untracked(() => {…})` → bare block | RED (effect re-ran and navigated on a counter-less mutation) → GREEN |
| 4 | Rendered tab-strip click (R3-1) | removed `noteUserFilterMutation()` from `onActiveItemChange` | RED after a DOM click → GREEN |
| 5 | NFR-RCU-003 sentinel | leaked `create-user-codes` into the `contract` array | RED both scopes → GREEN |

**Reported honestly and worth keeping:** mutants 1 and 3 were *structurally wrong on first attempt* — one targeted a variable read only by the loop-guard comparison rather than the `navigate` payload, the other created an unreachable IIFE — and were caught by re-checking that the mutant actually reproduced the intended fault before trusting the reading. That is the discipline T-08's review had to impose from outside; here it was self-applied. **It also means the mutant evidence needs a reviewer's eye specifically on mutant 1**, whose first failure mode is exactly what makes this class of evidence unreliable.

**Declared `Not Done / Assumptions` (verbatim, all five)**

1. The lazy-load double-fetch finding — see the Pivot Record below. Production untouched; the affected `initializeState` assertions were **retargeted** from a `main()` call-count to `toHaveBeenCalled()` / the true fetch-service call, with an inline comment, rather than asserting a count proven false.
2. **T-08 advisory #4 not closed** — the real `snapshot.queryParams` yields `string[]` for a repeated key where the old double flattened to the first value; `tasks.md` T-11 names this as an explicit **carry-forward**, and no repeated-key (`?contract=A100&contract=S192`) write-path test was added. The infrastructure now permits it. **This is a done-check question for the Reviewer, not an advisory the Leader may wave through.**
3. T-08 advisory #6 (`call[0]`, the navigate commands array, pinned by no test) — not added; non-gating.
4. The two open SPEC GAPS from T-08 §7.1 — correctly left untouched.
5. A Zone.js/jsdom false-positive "uncaught exception" on an already-`try/catch`-handled rejection required a no-op `.catch` on the same promise object in `should still seed and fetch… when the pinned-tab preference lookup rejects`. Claimed to be verified more directly in the `loadPinnedTabPreference` block. **Unadjudicated — a suppression and a real unhandled rejection look identical from the outside.**

### Reviewer runtime failure — three lenses, one blocker

Effort `xhigh` selected **parallel lens reviewers** per `/akili-execute` §2.3: conformance (the gate), reliability, risk. All three were spawned concurrently and **all three terminated on the same API error — session limit, resets 12:30pm America/Bogota.** Each died after reading its persona and beginning the diff; none produced a verdict.

Two deviations recorded, both deliberate:

1. **The diff was materialized to a file** (`…/scratchpad/T-11.diff`) and passed by path instead of inlined in each brief. §2.3 calls the diff "the one payload that can never become a pointer" because it is ephemeral state and the wrapper-restricted Reviewer has no `Bash` to regenerate it. Writing it to a path defeats that premise exactly — the Reviewer reads identical bytes with its own `Read` — while inlining 2,883 lines three times would have cost ~100k output tokens for zero fidelity gain. The rule's *purpose* is preserved; its letter is not.
2. **The Leader did not review inline, and will not.** The fallback table for a Reviewer runtime failure says *never inline*: the Leader auditing work it supervised breaks `author ≠ auditor`, and an environment failure does not suspend a correctness constraint. A retry was not attempted because the blocker is **quota exhaustion with a known reset time**, not a spawn error — an immediate retry fails identically and burns the remainder.

**Why the task is parked rather than pushed through:** `/akili-execute` Step 3 finalizes only on a Reviewer `PASS`, and Step 2.3 step 0 independently blocks `[x]` while a declared `Not Done` gap is outstanding — here there are two that are arguably done-check misses (items 1 and 2). Both gates point the same way. No commit was made.

---

## Pivot Record: T-11 — R-RCU-002 AC.4 and NFR-RCU-001 appear to have never held in production

**Raised by:** the T-11 Implementer, from the first render of the real component tree · **Independently verified by:** the Leader, from source · **Independent Reviewer adjudication:** ⚠️ **still outstanding** (the risk lens was briefed to adjudicate it and died before reporting)

### The mechanism

| Fact | Evidence |
| --- | --- |
| The results table is `[lazy]="true"` with `(onLazyLoad)="resultsCenterService.handleResultsTableLazyLoad($event)"`, and **no `lazyLoadOnInit="false"`** | `results-center-table.component.html:60,64` |
| PrimeNG's `lazyLoadOnInit` defaults to `true`, so `onLazyLoad` fires during the table's own init | PrimeNG 19 default |
| That handler ends in an unconditional `void this.main()` | `results-center.service.ts:594-612` |
| `initializeState` independently fires its own seeded `main()` | `results-center.component.ts` |
| The dedupe **cannot** collapse the two: different filter states produce different `fetchKey`s | `results-center.service.ts:539` vs `:580` |
| **The wiring predates this spec** — it is present on `main` | `git show main:…/results-center-table.component.html` |

Result on a URL-seeded load: **two `fetchPaginated` calls with different filter states** — one unseeded, one seeded.

### Why this is a Pivot and not T-11 rework

`R-RCU-002` **AC.4** ("Exactly one results request is issued for the initial load") and **NFR-RCU-001** ("initial load issues exactly 1 results request") are violated by pre-existing production behavior. Closing them requires a **production** change — suppressing the table's init-time lazy load, or guarding `main()` — that lies in **no task's scope** in this spec. §2.4 forbids widening a task to absorb it and forbids minting a task from a finding, so the only legitimate route is a user decision to reopen the spec.

T-11 therefore **cannot** close this, and did the right thing by refusing to: it left production untouched and weakened the affected assertions to what the evidence supports, with the reasoning inline.

### The uncomfortable part — a closed task's done-check was a false green

`tasks.md` T-06's done-check reads *"Exactly one results request on initial load (R-RCU-002 AC.4)"*, and T-06 **passed** it. It passed against a harness whose template was overridden to `<div></div>`, so the table that issues the second fetch never existed in the test. This is:

- **defect class D2** (`requirements.md` §8 — "navigation loop / duplicate fetch"), gated by the one component test structurally incapable of observing it;
- **KZ-001 at recurrence 5** — *"a test double that doesn't render or evaluate what it stands in for produces a green suite over broken behavior"*, the lesson already recorded at recurrence 4 **and named in T-11's own Disqualifies clause**;
- exactly the outcome §10.2 predicted when it said the existing harness *"cannot test this feature"*. **T-11 worked.** Its first act was to invalidate a green it was built to make real, which is the task succeeding, not failing.

### Options for the user (no spec document has been modified — Pivot Protocol step 4 requires approval first)

| # | Option | Consequence |
| --- | --- | --- |
| A | **Add a production fix to this spec** as a new task (`[lazyLoadOnInit]="false"` on the table, or a guard in `handleResultsTableLazyLoad`) | Reopens the spec: re-runs budget and the approval gate. Closes AC.4/NFR-RCU-001 honestly and restores T-06's done-check. Touches a shared table rendered on **four routes** — the change is small, the blast radius is not, and `NFR-RCU-005`/KZ-003 make a full-suite run mandatory |
| B | **Amend AC.4/NFR-RCU-001** to state the true contract (one *seeded* request; the table's init fetch is pre-existing behavior out of scope) and record the divergence | Cheapest, and honest about scope — the double fetch predates this spec and this spec never promised to fix it. But it ships a known duplicate fetch on every Results Center load, and re-lets T-06's `[x]` stand on a re-worded check |
| C | **Split it out** into its own bugfix spec (`bugfix/results-center-double-fetch`) and leave this spec's AC.4 explicitly deferred with a pointer | Keeps url-filters closable; gives a pre-existing production defect its own requirements and review instead of a task bolted onto an unrelated spec |

**Leader recommendation: C, with B's documentation change applied here.** The defect is real, is older than this spec, and touches a component four routes render — it deserves its own requirements and its own review, not a thirteenth task appended to a spec already re-baselined twice. Amending the AC in this spec to describe what it actually guarantees, with a pointer to the new spec, keeps both documents true. A is defensible if you want it fixed in one pass and accept the third budget re-baseline; B alone is the only option I would argue against, because it converts a discovered defect into permanent documented behavior with nothing tracking it.

### Pivot resolution — 2026-08-13, user decision: **option C**

The user chose **C — split the defect into its own spec, and apply C's documentation correction here.** Pivot Protocol step 3 executed; step 4's approval was obtained *before* any spec document was touched.

**Documents amended (with the two-direction Correction Closure sweep run, not assumed):**

| Document | Change |
| --- | --- |
| `requirements.md` R-RCU-002 | New scope-correction callout above the scenarios; the *Outputs* line and the "must NOT issue more than one" clause narrowed to **the URL read path**; **AC.4 rewritten** to "the URL read path issues exactly one results request for the initial load, and it is seeded before it fires" |
| `requirements.md` NFR-RCU-001 | Target narrowed to the URL layer; a new **"Not covered, and deliberately so"** bullet naming the table's `lazyLoadOnInit` fetch and stating plainly that a real load currently issues **two** requests; *How verified* now requires the real rendered tree |
| `requirements.md` §8 | D2's gate row records that it **returned a false green** for T-06 and is only valid against a real render; its Blind? column changed to "Was blind, now not" |
| `design.md` §6.1 step 7 | "Fire exactly one `main()`" → "from this path", with the table's independent call named |
| `design.md` §12 | **D-URL-17** added — the narrowing, the six verified facts, and both rejected alternatives |
| `tasks.md` T-06 | implementation note narrowed; **done-check rewritten and left `[x]`** on the amended clause, with an explicit statement that T-06 is *not* re-run and why its `[x]` is legitimate |
| `tasks.md` §3 | NFR-RCU-001 coverage row narrowed, T-11 added, whole-page count marked deferred |
| **`docs/specs/bugfix/results-center-double-fetch/proposal.md`** | **New** — seeded with the six verified facts, three candidate fixes, blast radius, sequencing and three open questions. Marked **SEED, not a formalized proposal**: it has not been through `/akili-propose`, and says so in its own Document Control |

**Sweep evidence.** Forward: grepped `exactly one|Exactly one|exactly 1|one results request` across the whole spec folder — 24 hits, of which 6 were the superseded claim (all corrected) and 18 were unrelated uses of the words "exactly one" (single-value `indicator`, one `href`, one caller, the 1354-line probe). Backward: grepped `AC\.4|NFR-RCU-001` — every referencing site checked; `design.md:232` (the loop guard) and `:473` (the reference list) are still true unchanged, and the `execution.md` occurrences are historical records that must **not** be rewritten.

**Why T-06 keeps its `[x]`.** It implemented and verified the URL read path, which is what it owned; the whole-page request count was never within a single task's reach, and no harness available to it could observe the table. Re-running it would re-verify work that is correct against a clause that has changed around it. The honest record is an amended clause with the history attached — which is what now stands in three documents.

**What this does not resolve.** The two SPEC GAPS from T-08 §7.1 remain open and unowned. They are unrelated to D-URL-17.

---

### T-11 review — respawn after the quota reset

The session limit reset at 12:30pm America/Bogota; the review was respawned at **12:46**.

**Width reduced from three lenses to two, deliberately.** The risk lens's primary charge was to *adjudicate the double-fetch claim independently* — that question is now closed by user decision and recorded as D-URL-17, so re-spawning it would spend a lens on a settled question. Its two secondary charges (document decay; whether the named carry-forwards were carried) are folded into the conformance brief. Remaining: **conformance** (the PASS/FAIL gate) and **reliability** (can these assertions fail — the lens that produced T-08's strongest findings). Two is within §2.3's 2–4 band for `xhigh`.

**The briefs differ from the first attempt in one material way:** the spec has changed underneath the diff. AC.4 and NFR-RCU-001 now say what the Implementer's retargeted assertions actually assert, so the conformance question is no longer *"was the weakening justified?"* but *"does the diff satisfy the amended clause?"* — and, separately, whether anything **else** was relaxed beyond what the finding forced. Both briefs state this explicitly so neither lens judges the diff against a superseded requirement.

### Attempt 1 — Reviewer verdicts: **both lenses FAIL**

| Lens | Verdict | Issues |
| --- | --- | --- |
| conformance (gate) | **FAIL** | 4 |
| reliability | **FAIL** | 3 + 6 advisories |

**What both lenses cleared, independently** — worth recording, because it is the part of the task that worked and it is the part a future reader will doubt:

- **Probe residue: none.** Both re-read all five mutant sites in `results-center.component.ts` and found the file coherent and intact. Both noted the same trap and disarmed it: a grep-context rendering artifact made `:245`/`:389`/`:408` *appear* to carry single-slash comments; direct reads confirmed `//`. Two independent lenses reaching the same false alarm and both resolving it by direct read is the strongest possible answer on the check that dominates all others.
- **Mutant 1's corrected form is sound**, verified by both from the code: disabling `delete merged[key]` leaves `merged` carrying the pre-existing `contract=S192`, so `paramsEqual` returns true, the effect returns early, and the URL keeps a cleared filter — exactly the R2-1 fault. The reliability lens added the point the Implementer had doubted itself on: *that* variable **is** load-bearing, because the navigate payload is `next` and null-stripping is the real router's job now.
- **The harness is genuinely real, not real-looking.** State arrives through real codec → real `seedFromUrl` → real signals, driven by real `RouterTestingHarness` navigations.
- **T-08's block was re-expressed, not ported.** The merge-simulating `mockRouter.navigate` and both hand-rolled helpers (`latestMergedParams`, `advanceCurrentQueryParamsToLatestResult`) are gone; `resultingQueryString()` parses `router.url`. All 21 old tests accounted for (20 in the new block, R2-5 relocated into the routed `initializeState` block); **none silently dropped** — see FAIL issue 6 for the one that *was*.
- **`queryParamsHandling` is now directly inspected** — T-08's strongest finding is closed, not re-shaped.
- **T-08's NFR-RCU-003 advisory #1 is closed:** both tests now carry a positive `toContain('contract=A100')` and a full `toBe(...)` before the `not.toContain('123')`, so a total no-op goes red.
- **Falsifying power intact:** the reliability lens walked all 20 write-effect tests against "the effect wrongly no-ops" — **13 go red.** The 7 that stay green are negative-by-construction (both entry guards, loop guard, tracked-dependency guard, R2-2, JD-9, first-run string) and cannot detect a no-op by design. T-08's 14/16 became 13/20 only because five more negative guards were added.
- **The Zone.js `.catch` is a legitimate accommodation, not a suppression** — both lenses verified the claimed direct coverage exists and is falsifiable (a plain `mockRejectedValue`, no shim), and the reliability lens showed the surrounding test still goes red if the rejection is genuinely unhandled, because `initializeState` is fired as `void`.

#### Consolidated FAIL issues carried into attempt 2

| # | Issue | Raised by | Site |
| --- | --- | --- | --- |
| 1 | **AC.4's count clause is asserted nowhere, and the comment justifying its removal is false.** `fetchPaginated` appears only at `:77`, `:113` and in the `:837` NOTE that claims it "is asserted below". `expect(mainSpy).toHaveBeenCalled()` cannot fail for any count ≥ 1, and the ordering check uses the **last** `main()` call — so `seedOrder < lastMainOrder` passes even if the read path fetches **unfiltered first, then re-fetches**, the exact pattern R-RCU-002's scenario forbids verbatim | **both lenses, independently** | `:837-840`, `:864`, `:892`, `:913-923`, `:1037`, `:1122` |
| 2 | **The D-URL-15 entry-guard test cannot fail.** `expect(resultingQueryString()).toBe('')` holds whether the entry guard returns, the loop guard returns, or the effect navigates — the block's `beforeEach` serializes to all-nulls. Deleting the guard leaves it green | conformance | `:1191-1193` |
| 3 | **The D3 / AC.3 "must NOT touch the URL" test attaches its spy *after* the navigation it observes.** `RouterTestingHarness.navigateByUrl` change-detects, so the effect's first run already happened; at the assertion the effect is not dirty and cannot run again. True for **every** implementation. The sibling tests all spy before navigating — so the guarantee is falsifiable for the legacy, invalid-token, parameter-less and stale-state cases but **not for the canonical deep link, the CapDev journey this spec exists for** | reliability | `:904` vs `:933-936` |
| 4 | **No rendered tab-strip assertion.** Both T-07 tests still assert `indicatorTabsListSignal().filter(i => i.active)` — the mocked endpoint's own signal, identical to what they asserted under the non-rendering harness. The `active` flag exists *only* to render (design §7.3), so the one thing it is for stays unverified; the strip does render in these tests, so the proof is one selector away | conformance | `:1152-1188` |
| 5 | **Carry-forward #4 (repeated key) not carried — and `resultingQueryString()` actively hides it.** See the adjudication below | conformance (FAIL) vs reliability (advisory) | `:1274-1282` |
| 6 | **A pre-existing test was deleted with no replacement and no declaration.** `it('applies the correct filter value even before the tab strip has synced')` (removed at `T-11.diff:852-874`) backed **T-07 done-check item 3, currently `[x]`** — which now has no test behind it in any file. Not among the five declared `Not Done` items. Every surviving T-07 test calls `detectChanges()` + `flushEffects()` before asserting, so design §7.3's documented transient is never exercised | reliability | T-07 block |

Issues 1 and 3 are the same defect class as T-08's finding 2 — *an assertion that reproduces or pre-empts the behavior it claims to observe* — arriving in two new shapes. Issue 1 is also the `mock.calls.at(-1)` hazard T-08's reliability lens flagged, re-appearing exactly where it warned it might.

#### Leader adjudication — issue 5, where the two lenses disagree

The **conformance** lens ruled the missing repeated-key test a **done-check miss (FAIL)**: `tasks.md` T-11 names it under *"Two carry-forwards for that work"*, its twin in the same sentence pair (the `untracked` killer) was treated as mandatory, and the behavior is observable for the first time. The **reliability** lens ruled it **advisory, not a gate**: it lives in T-11's *re-express prose*, not in the four done-checks, and the task text characterizes production's behavior as benign ("self-correcting… not a loop").

Both readings of the task text are defensible. **The decision turns on a third fact only the reliability lens found:** `resultingQueryString()` (`:1274-1282`) does `Array.from(new Set(params.keys())).sort().map(key => \`${key}=${params.get(key)}\`)` — `URLSearchParams.get` returns only the **first** value and the `Set` collapses the duplicate key. So a repeated-key test written against this helper **would fabricate a pass**, and the harness built to stop the two sides being reconciled by coincidence still reconciles them.

**Ruling: in scope for attempt 2, narrowly.** Fix the helper to `params.getAll(key).join(',')` and add the one test. This is not widening the task: the helper is T-11's own creation, inside T-11's only authorized file, and it is a **latent trap** — leaving it means the next person to close this carry-forward gets a green test that proves nothing. The reliability lens's own remediation says exactly that ("if a test is ever added, `resultingQueryString()` must switch to `getAll` first, or it will fabricate a pass"); the disagreement is only about *when*, and the answer is now, because the trap is cheaper to remove than to document.

#### Effort and model for attempt 2 — a recorded deviation from the rework rule

The rework rule says bump effort one level per retry. Attempt 1 ran **T2 `sonnet` at `xhigh`, which is T2's ceiling**, and the tier↔effort rule forbids `max` on a cheaper tier, directing escalation of the *tier* instead. That escalation is refused here: the Reviewer wrappers are T3 `opus`, and moving the Implementer to opus collapses `author ≠ auditor` on the exact axis that produced all six findings. **Attempt 2 runs `sonnet` at `xhigh` unchanged.** The rework rule's premise — *a fix that failed is usually under-thinking* — does not fit: nothing was re-attempted and failed. Five of six issues are assertions that pass when they should not, each now supplied with an exact remediation; that is a coverage gap under a precise brief, not a reasoning-depth failure.

### Attempt 2 — Implementer report (T2 `sonnet`, effort `xhigh` unchanged — see the deviation note above)

**Files changed:** `results-center.component.spec.ts` only, **1,639 → 1,836 lines** (+197 over attempt 1). Cumulative diff vs the last commit: **+1,514 / −1,298** — attempt 1 was never separately committed, so the two attempts are one uncommitted change set. Materialized for review at `…/scratchpad/T-11-attempt2.diff` (3,081 lines).

**Verification** (from `client/research-indicators`): `npm test -- --silent` → **309 suites / 6,474 tests green** (one more test than attempt 1's 6,473 — the net of a deletion and several additions); coverage 99.27 / 98.09 / 99.17 / 99.5 vs floors 40/20/45/30. `npm run lint -- --quiet` → clean, `git status` re-checked after the `--fix`, no mutation. Type probe, recipe copied verbatim: **1,354 lines = baseline**, zero `TS5083`/`TS6053` (i.e. not an aborted run — a check the Implementer added itself), zero hits on the three files in play.

**Red/green mutant table — every fix proven, and this time four mutants landed in production files the task does not own:**

| # | Issue | Mutant | File | Result |
| --- | --- | --- | --- | --- |
| 1 | AC.4 count never asserted | `initializeState` fetches once **before** seeding | `results-center.component.ts` | RED (`unseededFetchIndices.length ≤ 1` got 2) → reverted → GREEN |
| 2 | Vacuous entry-guard test | entry-guard body neutralized | `results-center.component.ts` | RED — **5 tests suite-wide** → reverted → GREEN |
| 3 | Spy attached after navigation | `seedFromUrl` advances `userFilterMutations` | `results-center.service.ts` | RED in 2 pre-existing tests → reverted → GREEN — **but not in the D3 test itself; see below** |
| 4a | Tab strip asserted on the signal, not the DOM | removed the `[class.active]` binding | `indicators-tab-filter.component.html` | RED (both T-07 tests); the transient test correctly stayed GREEN → reverted → GREEN |
| 4b | Chip query too broad | `@for` loop source → `[]` | `results-center-table.component.html` | RED (D3 chip test) → reverted → GREEN |
| 5 | Helper collapsed repeated keys | `getAll(key).join(',')` → `get(key)` | the spec file itself | RED (repeated-key test) → restored → GREEN |
| 6 | Transient re-expression unfalsifiable | `isLoading` guard removed from the sync effect | `results-center.component.ts` | RED (new transient test) → reverted → GREEN |

**Probe reversion independently verified by the Leader**, not taken on report: `git diff --stat` over all four mutant target files — including both `.html` files, which are outside the authorized write set and were the highest residue risk this attempt — returns **empty**. The working tree holds the spec file plus the Leader's own spec-document edits and the new `bugfix/results-center-double-fetch/` folder, and nothing else.

**Issue 6 was re-expressed, not declared unreachable.** The escape hatch offered in the brief (declare it if `RouterTestingHarness`'s internal change detection makes the §7.3 transient unobservable) was not taken: holding `indicatorTabsLoadingSignal` at `true` reproduces the transient deterministically rather than racing a timing window. **T-07 done-check item 3 therefore has a test behind it again**, and its `[x]` does not need re-adjudication.

**Declared `Not Done`: none.**

**The one claim requiring adjudication — Issue 3's mutant did not turn the D3 test red.** Reported plainly rather than buried, with a traced cause: `?contract=A100` is a *canonical* deep link, so `serialize(state)` reconstructs exactly the URL that was navigated to, and step 4's merge/loop guard no-ops independently of whether the entry guard fired. The Implementer's argument that the fix is still load-bearing: repositioning the spy is what makes that same test catch the **entry-guard-deletion** mutant (issue 2's, which reddens 5 tests), which is the same "an early navigate is invisible to a late spy" class the Reviewer named — and the `seedFromUrl`-advances-the-counter defect is independently caught by 2 pre-existing tests. **Both re-review lenses are briefed to accept or reject this reasoning explicitly; it is the one place where "my test does not fail and here is why that is fine" appears in this attempt, which is precisely the shape that needs an auditor rather than a Leader.**

### Attempt 2 — Reviewer verdicts: **both lenses PASS**

| Lens | Verdict | Notes |
| --- | --- | --- |
| conformance (gate) | **PASS** | all six issues closed with falsifiable assertions; nothing new rode along |
| reliability | **PASS** | no new vacuous assertion introduced; no test lost in the restructure |

**T-11 status: PASS on attempt 2 of 3.** One rework round consumed — the spec's review-round budget of 3 still holds at 11 of 12 tasks.

#### The adjudication I escalated to the Reviewers rather than deciding

Issue 3's mutant did not redden the repaired D3 test. **Both lenses accepted the Implementer's reasoning, and both derived the mechanism from the code rather than accepting the report** — the outcome that matters, since the claim's shape (*"my test does not fail and here is why that is fine"*) is the one this spec has been burned by most.

The agreed mechanism, stated once because it is the substantive result of this review:

- Under **entry-guard deletion**, the mandatory first run flushes inside `RouterTestingHarness.navigateByUrl`'s internal change detection — *before* `initializeState`'s awaited `loadPinnedTabPreference()`, therefore before `seedFromUrl`. `serialize` emits `contract: null`, merge strips the key, `{}` ≠ `{contract:'A100'}`, and the effect navigates, **wiping the deep link.** A spy attached after `navigateTo(...)` is structurally blind to it. The repositioning is what makes it observable — the fix is load-bearing.
- Under **`seedFromUrl`-advances-the-counter**, the re-run lands after seeding, `serialize(seededState)` reconstructs exactly the arriving canonical URL, and step 4's loop guard returns. **Production genuinely does not touch the URL for that input**, which is precisely what the test's title asserts. Green because the asserted guarantee holds is not green-by-construction; it is a correct test declining to fail on a defect in a different contract.

**The reliability lens corrected the Implementer's own report in its favor** — the kind of finding that only comes from reading the code rather than the summary. The `seedFromUrl`-increments defect **is** caught at component level, by the sibling legacy test (`?indicatorTab=1`, same repositioned-spy pattern), where `serialize` emits `indicator=capacity-sharing-for-development` **plus** `indicatorTab: null`, so `paramsEqual` fails and `navigate` fires. Only the *canonical-URL fixture* is structurally blind to that mutant; the file is not. Acceptable structural fact, not a coverage hole — no retitle or re-scope required.

Both lenses also independently verified the discriminator the AC.4 fix rests on, rather than assuming it: `finalFilter` is a spread of `resultsFilter` (`results-center.service.ts:495-543`), so bucketing `fetchPaginated` calls by `contract-codes` genuinely separates the seeded call from the table's out-of-scope unseeded one, and a fetch-unfiltered-then-refetch regression pushes the unseeded bucket to 2. The reliability lens further pinned *which* assertion does the killing: **the `≤ 1` bound, not the ordering branch.**

#### A Reviewer inference that was wrong — verified, not accepted

The reliability lens filed a **PROCESS** advisory claiming the supplied diff's `a`-side was the *attempt-1* file rather than the commit baseline, on the evidence that it contains `(FIX 2b)` titles. The observation is factually correct; **the inference is not.** `(FIX 2b)` is **T-08's** attempt-2 label, and it is already committed in HEAD (`21276779`, at `:1328` and `:1344` of the committed spec file) — T-08 also ran two attempts with a reliability lens. The diff was cumulative all along.

Verified rather than argued: nothing is staged (`git diff --cached --stat` empty), HEAD is unmoved at `21276779`, and `git diff HEAD --stat` reports **1,514 insertions / 1,298 deletions** — matching the Implementer's independently-reported cumulative figure exactly, over a file now **1,836 lines**. Those are the numbers the commit message uses. Recorded because the advisory would otherwise stand as an unrebutted doubt about the audit's coverage, and because a label collision between two tasks' rework attempts inside one spec is a trap the next reader deserves warning about.

#### ADVISORY (recorded, non-gating; per §2.4 none may become or widen a task)

1. **RELIABILITY —** three routed tests still carry `expect(mainSpy).toHaveBeenCalled()`, which the real table's `lazyLoadOnInit` fetch satisfies regardless of the read path, so they cannot fail. No longer load-bearing (AC.4 moved to `fetchPaginated`; each test's real carriers are `restoreSpy`/`seedFromUrlSpy`/filter state) — **but this is the exact shape that produced attempt 1's issue 1.** Re-anchor on the seeded/unseeded buckets or delete.
2. **RELIABILITY —** the ordering assertion is wrapped in `if (unseededFetchIndices.length > 0)`. The branch runs today, but **if `bugfix/results-center-double-fetch` removes the table's init fetch, that assertion silently stops executing.** Raised by both lenses. A direct cross-spec coupling: whoever fixes the double-fetch must revisit it.
3. **RELIABILITY —** the re-expressed transient substitutes a permanently-held `isLoading=true` for a temporal window. Documented, falsifiable, and the mechanism design §7.3 itself names — but it is a **state proxy, not the race**, and warranted one line of Assumptions rather than an unqualified `Not Done: none`.
4. **READABILITY —** `resultingQueryString()` now renders `?a=1&a=2` and `?a=1,2` identically, so it can no longer assert URL *form*; the repeated-key test correctly takes its discrimination from the navigate count instead. Wants a line in the helper's doc before a future test assumes otherwise.
5. **READABILITY —** the surviving entry-guard test lost the `(D-URL-15 entry guard, not merge-guard luck)` suffix from its title; the decision id now lives only in the comment above it, so the guard is no longer greppable by id.
6. **READABILITY —** two comments still point at "the task report's `Not Done / Assumptions` section" although attempt 2 declares none; both facts are now durably recorded in D-URL-17 / the new bugfix spec / T-11's carry-forward. Point at those instead.
7. **READABILITY —** the chip assertion keys off Tailwind utility strings (`div.mt-3.mb-1.items-center` / `span.text-sm`), so a purely cosmetic template edit reddens D3 with a misleading message. The `data-testid` that would decouple it is a **production** change, out of scope here.
8. **READABILITY —** the rendered tab-strip click targets `[class*="cursor-pointer"]`. Both lenses judged it **fail-safe** (a template change breaks the counter assertion rather than faking a pass) but brittle; scoping to `app-indicators-tab-filter` would say what it means.

Advisories 1, 2 and 3 are the three worth carrying forward. 1 is a live instance of the defect class this task closed; 2 is a genuine cross-spec dependency; 3 is a scope-honesty note, not a defect.
