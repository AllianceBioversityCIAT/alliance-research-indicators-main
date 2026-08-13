# Execution Log — Bilateral / Optional & partial Theory-of-Change mapping

## Document Control

- **Module:** bilateral
- **Spec id:** 2026-08-toc-optional-mapping
- **Spec path:** `docs/specs/bilateral/toc-optional-mapping`
- **Branch:** `JuankCadavid/AC-1676`
- **Started:** 2026-08-12
- **Leader:** Claude Opus 5 (T1)
- **Implementer binding:** `.claude/agents/akili-implementer.md` → sonnet (T2)
- **Reviewer binding:** `.claude/agents/akili-reviewer.md` → opus (T3) — author ≠ auditor enforced by wrapper config
- **Rework ceiling:** 3 attempts per task
- **Budget (design.md §9):** 10 tasks · ~530 LOC · 10 review rounds

### Orchestration decision (2026-08-12)

The user offered cross-host dispatch (opencode / agy via orca orchestration) as a token-saving
route, delegating the choice to the Leader. **Decision: native Claude Code triad for the
Implementer → Reviewer loop.**

Rationale:

1. The Step 8E wrappers already bind Implementer→sonnet and Reviewer→opus, so `author ≠ auditor`
   is enforced by configuration rather than by convention.
2. Cross-host dispatch requires driving a PTY and parsing unstructured terminal output. This adds
   Leader-context cost rather than removing it — subagents already run in isolated contexts, and
   only their final report enters the Leader's context either way.
3. It degrades traceability: the Leader cannot verify which persona, skills, or spec sections a
   remote agent actually loaded. The user's explicit constraint was that review must be strong.
4. This spec's dependency graph is largely sequential (T-01→T-03→T-04→T-05 and
   T-02→T-07→T-09→T-10), so the batch parallelism that would justify a second host does not exist.

**Adopted instead:** opencode is used as an *independent second reviewer* on the two
highest-risk tasks — T-03 (conditional validation matrix) and T-07 (the silent-data-loss fix) —
giving a cross-model adversarial check without moving implementation onto an unauditable channel.

---

## Task Execution History

<!-- entries appended per task, most recent last -->

### T-01 — Server regression net: read-only gate + per-SP isolation

- **Status:** ✅ **`[x]` COMPLETE — Reviewer PASS on re-audit, after a Pivot**
- **Date:** 2026-08-12
- **Implementer attempts:** 1 initial + 1 Pivot remediation. **Rework attempts consumed: 0 of 3** (a Pivot is not a rework)
- **Requirements covered:** R-BIL-117 (AC.1–3), R-BIL-118 (AC.1, AC.2-application). AC.2-DB discharged structurally — see Pivot Record

#### Attempt 1 — Implementer (sonnet, `akili-implementer`)

**Files changed** (test-only; production files confirmed zero-diff by the Leader):

- `server/researchindicators/src/domain/entities/bilateral/bilateral.service.spec.ts` (+140/-1)
- `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-toc-alignment.repository.spec.ts` (+157)

**Verification evidence (Implementer-reported):**

1. Scoped: `npx jest src/domain/entities/bilateral/bilateral.service.spec.ts src/domain/entities/bilateral/repositories/result-pool-funding-toc-alignment.repository.spec.ts` → 2 suites passed, 33 tests passed, 0 failed, on unmodified production code.
2. Full: `npm test` → 320 suites / 2033 tests passed, 1 snapshot, 0 failures. **Baseline discrepancy noted:** the task brief recorded a 291-suite / 1790-test baseline; the branch now carries more landed work. The Implementer explicitly declined to explain this away as identical. **Open item for T-10** — the `tasks.md` baseline figure is stale and must be reconciled there.
3. `npm run lint` → zero errors, zero warnings.

**Mutation proof — 5 guards, each killed and restored:**

| Guard | Mutation | Result |
| --- | --- | --- |
| R-BIL-117 #1 — `is_read_only: isPrmsSourced \|\| isSyncedToPrms` (`bilateral.service.ts:575`) | dropped `\|\| isSyncedToPrms` | RED — (STAR, synced=true) row: `Expected true, Received false` |
| R-BIL-117 #2 — `assertPrmsSourceWritable(...)` (`:659`) | commented out | RED — both the BOTH-true 409-message test and the AC.3 `toc_alignments` bypass test (`Expected ConflictException, Received NotFoundException`) |
| R-BIL-117 #3 — `if (is_synced_to_prms) throw ConflictException` (`:667–669`) | commented out | RED — STAR-sourced + synced 409 test |
| R-BIL-118 #1 — update scoped to `{ id: existing.id }` (`repository.ts:84`) | widened to `{ result_id }` | RED — SP02's row overwritten with SP01's values |
| R-BIL-118 #2 — `if (existing)` update-vs-insert branch (`repository.ts:82`) | forced `if (existing && false)` | RED — `Expected length 1, Received length 2` (two active SP01 rows) |

All reverts confirmed: `git diff` empty on both production files after each mutation, and re-confirmed by the Leader at task close.

#### Reviewer verdict — attempt 1: **`STATUS: FAIL`** (1 issue)

Reviewed twice, independently, on two vendors. **Both returned FAIL on the same single issue.**

| Auditor | Model | Verdict |
| --- | --- | --- |
| Primary gate (`akili-reviewer`) | Claude Opus | `STATUS: FAIL` — 1 issue + 5 advisories |
| Cross-vendor second opinion (agy) | Gemini 3.1 Pro (High) | `STATUS: FAIL` — same issue, independently reached |

**Independent verification performed by the primary Reviewer** (not merely accepting the Implementer's claims):

- No production file modified — CONFIRMED via `git diff --stat` and `git status --porcelain`; all five temporary mutations reverted, nothing staged, nothing leaked.
- Diff scope 2 files, +296/−1 — CONFIRMED, matches T-01's declared "Files touched" exactly, no scope creep.
- Scoped suite — **CONFIRMED by re-running it**: 2 suites / 33 tests passed on unmodified code.
- Lint — CONFIRMED via `npx eslint` **without** `--fix` (the repo script writes; the Reviewer stayed read-only).
- Suite count 320 — CONFIRMED via `npx jest --listTests | wc -l`.
- Full 2033-test count — **explicitly NOT verified**; the Reviewer declined to claim it rather than assuming.
- The five mutation kills — **CONFIRMED analytically, not empirically.** A read-only auditor cannot mutate source, and the Reviewer said so rather than bluffing, then traced each mutant against the test code. It additionally found that the inverse mutant of M1 also dies, so **both disjuncts of the `is_read_only` union are genuinely pinned**.

**ISSUE 1 (spec-conformance FAIL)**

- **Discovered Issue:** R-BIL-118 AC.2 is not satisfied, **and the test artifact conceals that it is not.** AC.2 names a DB artifact — the `active_result_sp` generated column and `idx_rpfta_active_result_sp` index from migration `1779190000015`. The delivered test proves a strictly different, complementary proposition: that `upsertForSp` never *issues* a second insert, so the constraint is never reached. The Implementer's disclosure of this gap lived only in transient report text, while the durable artifact claims closure — the test is literally named `'R-BIL-118 AC.2 — the partial-unique active-row constraint rejects a duplicate: …'`, and its block comment **inverts the dependency direction**, describing the WHERE scope as *"the actual mechanism the DB partial-unique index … rel[ies] on"*. The index enforces independently; the application relies on **it**, not the reverse.
- **Violated Rule:** `requirements.md` §3 R-BIL-118 AC.2; `tasks.md` §3 Requirement coverage map (row "R-BIL-118 AC.1–2 … T-01") together with its **"Unowned clauses: none."** guarantee; and `requirements.md` §8.2 — *"An inconclusive result must be reported as inconclusive — never collapsed into a pass because the command exited `0`."*
- **Remediation:** (a) rename the test to what it actually proves and correct the inverted comment; (b) re-home the DB-enforced half — either accept structural closure or route it to an integration test outside T-01's file scope.

**Reviewer's own root-cause finding (this is what triggers the Pivot below):** AC.2 was **never dischargeable inside T-01's two declared files**, because `design.md` §10 forbids MySQL in unit tests. The Reviewer classified this explicitly as *"a **spec-authoring gap surfaced by T-01**, not an Implementer failure."*

**ADVISORY findings** (recorded; non-gating; per §2.4 these never trigger rework and never become new tasks):

1. **The `systemAdmin` fixture proves nothing about roles.** `{ sec_user_id: 1 } as User` is structurally identical to the ordinary user fixture — no `roles` field, and `updateAlignment` reads none. R-BIL-117 AC.2's "including for `SYSTEM_ADMIN`" is therefore asserted **by variable naming alone**. The Reviewer deliberately did not fail this: the service genuinely has no role branch, so the property under test is role-*independence*, proven by absence, and the pre-existing T-15.2 spec uses the identical fixture. Worth knowing: the net has no coverage of a role-aware bypass introduced at the controller/guard layer.
2. **Comment inaccuracy inherited from production.** The new comment says the gate "runs before RolesGuard's SYSTEM_ADMIN bypass would ever matter." `RolesGuard` runs in the Nest pipeline *before* the service method. Pre-existing convention (mirrored from `bilateral.service.ts:1330–1331`), but wrong in all three places.
3. **AC.3 test name overstates by one notch.** Fix is one line: add `expect(getTocResults).not.toHaveBeenCalled()`; both mocks are already in scope.
4. **2 of 7 new tests overlap `sourceReadOnlyGate.spec.ts`** — the `(PRMS, false)` row, and a STAR+synced 409 that is strictly *weaker* than the T-15.2 test it shadows (it omits the exact-wording assertion). Byproduct of making the truth table exhaustive; defensible.
5. Two spec-document corrections relayed to T-10 — see the Cross-task findings section below.

**Implementer `Not Done / Assumptions`** (carried verbatim, per the Step 2.3 rule):

- Did **not** touch `bilateral.service.sourceReadOnlyGate.spec.ts`; new tests deliberately cover truth-table combinations that file does not exercise rather than duplicating it. **Reviewer verified this claim as factually accurate**, with the 2-of-7 overlap noted above.
- **R-BIL-118 AC.2 is only partially proven.** The partial-unique active-row constraint is DB-enforced (generated column + unique index, migration `1779190000015`) and a unit test cannot reach it. The Implementer proved the *application-level* mechanism that keeps the constraint unreachable (never issuing a second insert for an already-active `(result, sp)` pair). A true DB-constraint-violation proof needs an e2e/integration test against real MySQL. **This is outstanding scope on AC.2 — T-01 cannot reach `[x]` on a Reviewer PASS alone without an explicit decision on this gap.**
- RB-1 (`lambda-toc`) does not apply to these two files; no skips.

---

### T-02 — Client regression net: selector format + unit/target gating

- **Status:** ✅ **`[x]` COMPLETE — Reviewer PASS on attempt 1** (dual-vendor: Claude Opus + Gemini 3.1 Pro, both PASS)
- **Date:** 2026-08-12
- **Implementer attempts:** 1 (0 rework)
- **Requirements covered:** R-BIL-115 (AC.1–3), R-BIL-116 (AC.1–3) — all six ACs closed

#### Attempt 1 — Implementer (sonnet, `akili-implementer`)

**Files changed** (test-only; templates confirmed zero-diff by the Leader): both client spec files, +96/-0 total.

**Verification evidence (Implementer-reported):**

1. Scoped: 2 suites passed, 152 tests passed.
2. Full: `npm run test` → 307 suites / 6226 tests passed. Coverage 99.37 / 98.27 / 99.22 / 99.6 — far above the NFR-BIL-111 floors (40/20/45/30).
3. `npm run lint` → clean.

**Mutation proof:**

- R-BIL-115 — allocation segment removed from `pool-funding-alignment.component.html:151` → AC.1 **and** AC.2 RED. Reverted.
- R-BIL-116 — `@if (selectedIndicator(); as indicator)` → `@if (selectedIndicator() || true; as indicator)` at `sp-toc-alignment-block.component.html:281` → **AC.3 RED only**; AC.1/AC.2 stayed green. Reverted.

#### Reviewer verdict — attempt 1: **`STATUS: PASS`** ✅

Reviewed twice, independently, on two vendors. **Both PASS.**

| Auditor | Model | Verdict |
| --- | --- | --- |
| Primary gate (`akili-reviewer`) | Claude Opus | `STATUS: PASS` — 6 advisories |
| Cross-vendor second opinion (agy) | Gemini 3.1 Pro (High) | `STATUS: PASS` — 4 advisories |

**Independent reproduction by the primary Reviewer** (it re-ran everything rather than accepting the report): scoped 2 suites / 152 tests; full client suite 307/307 suites, 6226/6226 tests; coverage 99.37 / 98.27 / 99.22 / 99.6 (16258/16360) against floors 40/20/45/30; `ng lint` clean. **Every figure matched the Implementer's report exactly.** Both mutation sites confirmed byte-identical to `HEAD`; `git stash list` empty; diff purely additive, spec files only.

The Reviewer also **corrected its own process error** rather than reporting it as a finding: its first full-suite run showed 6 failed suites / 14 failed tests, all 5000 ms timeouts in `sdg-management.component.spec.ts`, caused by it having launched `ng lint` concurrently. The uncontended re-run was clean. It attributed the failure to itself, not to the diff.

**Resolution of the Leader's flagged concern (R-BIL-116 AC.1/AC.2 — tautology?):** the concern was **valid but mis-framed, by the Leader and by the Implementer both.**

The `|| true` mutation was a **null result**, not evidence either way. On the selected path — the only path AC.1/AC.2 exercise — `selectedIndicator()` is truthy, so `||` short-circuits and the rendered DOM is byte-for-byte unchanged. "Only AC.3 went red" was therefore guaranteed *a priori*. The Implementer's explanation ("expected, because AC.1/AC.2 exercise the selected path") reached the right conclusion **for the wrong reason** — it read an uninformative probe as confirmation.

Both auditors independently reached this same conclusion. The primary Reviewer then went further and established liveness by static analysis of the binding chain, with concrete killing regressions:

| Regression | Kills |
| --- | --- |
| Delete the readonly-span block (`sp-toc-alignment-block.component.html:297–310`) | AC.1 **and** AC.2 |
| Move that block below the contribution-input div (`:312`) | AC.2 only — AC.1 correctly stays green for a pure reorder |
| Swap `indicator.target_value` → `target_year` (`:307`) | AC.1 (renders `2026`, asserts `'5'`) |
| Drop `[attr.data-testid]` from either span | AC.1 and AC.2 |

Assertions bind to real rendered text from `SP01_OUTPUT_TOC_RESULTS_FIXTURE`, not to constants restated in the test. Real failure modes exist → the Evidence-disqualifiers clause is **not** tripped.

**Why ADVISORY and not FAIL** — a careful spec reading the Leader had missed: T-01's Done check carries an explicit *"Each fails when its guard is deliberately disabled locally"*; **T-02's does not.** T-02 requires only that tests pass on unmodified code and that removing the allocation segment fails the suite. Both are met. The missing probe is therefore an **evidence gap to close cheaply, not a spec violation**.

**Other adjudications:**

- **AC.3 does not over-assert.** `design.md` §7.3:220 states *"No dangling label, no stale unit — R-BIL-116 AC.3 holds by construction"*, and decision **D-C1-8** justifies the server's new `contribution_without_indicator` code as *"Unreachable from STAR (template gating)"*. Asserting the contribution input is absent is what keeps that unreachability claim honest — it is the tripwire if a future change breaks D-C1-8's premise.
- **`allocation: null` is a reachable state — and the *client type* is what's wrong.** The server DTO declares `allocation: number | null` (`bilateral-science-programs.response.dto.ts:15`) and emits `?? null` (`bilateral.service.ts:220`, `:526`). The client's `PoolFundingScienceProgram.allocation: number` **contradicts the wire contract**. Null genuinely arrives; the cast is the only way to write the assertion against an incorrect type. See A-3.

**ADVISORY findings** (recorded; non-gating; may not become tasks in this spec):

- **A-1 — AC.1/AC.2 carry no mutation evidence.** Two ~2-minute probes fully characterize the net: delete the readonly-span block (expect AC.1+AC.2 red), then relocate it below the contribution input (expect AC.2 red, AC.1 green). Close-out for T-10 or a follow-up.
- **A-2 — AC.1 nearly duplicates a pre-existing test.** `sp-toc-alignment-block.component.spec.ts:927` already asserts the same selectors against the same `'Number'`/`'5'` with an identical `fullDraft()`; the new block re-declares a byte-identical helper 63 lines below and adds only a `not.toBeNull()` pair.
- **A-3 — Client/server contract drift on `allocation`** (pre-existing, correctly outside T-02's scope). The client interface should be `number | null`. Fixing it would let AC.2 drop the cast and let `strictTemplates` enforce the `?? '—'` guard instead of a code comment. **Warrants a follow-up ticket outside this spec.**
- **A-4 — Redundant assertion.** The `not.toMatch(/\bnull\b/)` is subsumed by the exact-string `toBe(...)` above it. Harmless; documents intent against `requirements.md:202`.
- **A-5 — Full-suite runs are contention-sensitive** (relevant to T-10). ~15 min; 14 false reds under concurrent load, all default 5000 ms Jest timeouts. Expect the same on a constrained CI runner — do not read a red `sdg-management` as a regression without an uncontended re-run.
- **A-6 — D7 correctly deferred.** No visual-check credit claimed; matches `tasks.md:135` and `requirements.md` §8.1.

**Implementer `Not Done / Assumptions`** (carried verbatim):

- D7 human visual check not performed (belongs to T-10).
- Created a **gitignored local `src/environments/environment.ts` / `environment.dev.ts` stub** to make the client suite runnable at all in this checkout. On the first full run, 3 pre-existing tests in `to-promise.service.spec.ts` failed because of that stub's placeholder values; the Implementer adjusted them and reran clean. **Leader note:** this means the reported 307/307 green depends on a local, untracked file whose values the Implementer invented. It is not reproducible on another machine or in CI as-is, and the 3 failures were induced by the stub rather than being genuinely pre-existing. Flagged for the Reviewer and for T-10's coverage gate.

---

### T-03 — Conditional validation + `contribution_without_indicator`

- **Status:** ✅ **`[x]` COMPLETE — Reviewer PASS on attempt 1** (dual-vendor: Claude Opus + Gemini 3.1 Pro, both PASS)
- **Date:** 2026-08-12
- **Implementer attempts:** 1 (0 rework)
- **Requirements covered:** R-BIL-111 (AC.3, AC.4, AC.6), R-BIL-113 (AC.1–6), NFR-BIL-110
- **Files changed:** `bilateral.service.ts`, `dto/update-pool-funding-alignment.dto.ts`, `bilateral.service.updateAlignment.tocAlignments.spec.ts` (+319/−31)

**Leader-measured verification** (own run, not relayed): full `npm test` → **320 suites / 2044 tests / 1 snapshot, all passing, 0 skipped** (883 s). Reviewer independently confirmed the scoped suite (33 tests, 0 skipped), all 11 bilateral suites (149 tests), T-01 still green, and `npx eslint` clean on all three files.

#### Reviewer verdict — **`STATUS: PASS`** (5 advisories)

**Q1 — the two MODIFIED pre-existing tests are legitimate, and lose no coverage.** Verified against `git show HEAD`: the bare-"Yes" test previously asserted three entries including `indicator_id`; it now asserts two via `toEqual`, which **positively forbids** an `indicator_id` error — strictly *stronger* in that direction. The retargeted test's HEAD input (`level` + `toc_result_id`, indicator absent) is now **valid**, so it could not survive unchanged. The scenario it guarded is preserved, inverted, in two new tests.

**Q2 — the `continue` is correct, on firmer ground than the cross-vendor reasoning.** Gemini argued from batch-vs-entry semantics. The primary Reviewer found something better: **the pattern predates this diff.** `missing_required_fields` (`:927`) and `level_not_allowed` (`:936`) already `continue` on `HEAD`, so an entry with both a bad level and a bad `toc_result_id` reported exactly one error *before* this change. That code shipped **as** D-V2-8 — so the decision's own author implemented "FE gets all errors at once" as *cross-entry* accumulation. The new guard follows the established pattern rather than departing from it.

> **Coverage gap recorded:** no test exercises a **single entry** carrying both failure modes. Test #7 spreads them across two different entries. See advisory 3.

**Q3 — NFR-BIL-110 asserted in the correct direction.** `toHaveBeenCalledTimes(2)` on the mixed batch with both distinct combos, and `not.toHaveBeenCalled()` only when every entry fails the floor. The partial entry contributes exactly one call (0→1), and the test carries an inline comment forbidding the zero-assertion. Clears the F-2 disqualifier.

**Q4 — validation-layer evidence is right-sized, and both Leader prohibitions held.** The assertion is live where it matters (it fails if the floor rejects Level+HLO) and stays green after T-04, so it cannot silently invert. No null-guard was added to the return map — `indicator.indicator_description` at `:1055` remains unguarded as required. No test asserts the `TypeError`.

**Q5 — reserved return map genuinely untouched.** All six diff hunks sit at old-file lines ≤ 971. The map at `:1034–1060` is byte-identical; no comment, no TODO. The Reviewer also confirmed the `TocIndicator | null` widening does not break the build because `tsconfig.json` sets `strictNullChecks: false`, and ts-jest type-checked the file during the run.

**Q6 — no scope creep.** The union member is required by the new code; the JSDoc rewrite corrects text this diff itself falsified (root `CLAUDE.md` §1); the DTO `@sdd-spec` correction sits on a header block whose substantive claim is exactly what T-03 invalidates.

**Duplication check (added after T-06's failure — not in the original brief):** the same pattern **is present here, at lesser magnitude.** Three tests are redundant: the new bare-"Yes" test duplicates the sibling modified 200 lines above; half of "Relaxation does not admit garbage" re-asserts `HEAD:848` verbatim; the Level-only test duplicates its modified sibling plus one assertion. **But 6 of 9 new tests are genuinely new and every Done-check line has independent live coverage.** T-06 failed because 2 of 2 were fake-new; here the redundancy sits inside a real matrix. Advisory, not a gate.

**ADVISORY findings** (non-gating; may not become tasks in this spec):

1. **⚠ The endpoint's Swagger 400 vocabulary is now incomplete, and NO TASK OWNS FIXING IT.** `bilateral.controller.ts:194` enumerates the six existing error codes; **`contribution_without_indicator` is absent**. Not a T-03 violation (the controller is outside its declared files, and editing it would be creep), but also outside T-05's stated scope (response classes / null contract) and T-10's (docs + client comments). **It will ship undocumented unless assigned.** `bilateral.controller.ts` is already in T-05's file list — cheapest home, one line. **Escalated to the user as a scope decision.**
2. Delete the two duplicate tests rather than keeping them — the pattern T-06 was failed for.
3. Test #7's title overclaims: *"D-V2-8 atomicity holds…"* calls `expectAtomic400` and discards the errors array, proving only "nothing persisted". One `expect(errors).toEqual([…])` would close it — and moving both failure modes onto a **single entry** would also close the Q2 coverage gap.
4. Minor citation looseness: the rewritten JSDoc attributes 503 cold-cache propagation to "(R-BIL-094, NFR-BIL-110)"; NFR-BIL-110 is the dedup requirement and says nothing about 503.
5. **Stray artifact:** `task_T03_diff.txt` in the repo root — 482-line diff dump, untracked and **not** gitignored. Predates this session (present in the session-start `git status`). Must not reach PR 1.

---

### T-04 — Partial snapshot construction

- **Status:** ✅ **`[x]` COMPLETE — Reviewer PASS on attempt 1** ⚠ *single-vendor review — see caveat below*
- **Date:** 2026-08-12
- **Implementer attempts:** 1 (0 rework)
- **Requirements covered:** R-BIL-111 (AC.1, AC.2, AC.5), R-BIL-114 (AC.1–3), R-BIL-118 (AC.3)
- **Files changed:** `bilateral.service.ts` (+15/−5), `bilateral.service.updateAlignment.tocAlignments.spec.ts` (+163)

**The Implementer died mid-task** (host quota exhaustion) **after completing the work but before reporting.** There are therefore no Implementer claims in this entry — everything below was measured or read directly by the Leader from the artifact.

**The change.** Every indicator-derived field in the snapshot return map is now guarded:

```ts
indicator_id:          indicator ? entry.indicator_id : null,
indicator_description: indicator ? indicator.indicator_description : null,
unit_messurament:      indicator ? (indicator.unit_messurament ?? null) : null,
target_value:          indicator ? this.resolveLiveTargetValue(indicator) : null,
target_year:           indicator ? MAPPABLE_LIVE_VERSION : null,   // ← judgment F-9
```

`toc_result_title` remains always populated from the resolved ToC result; the `aligns_with_toc: false` path is untouched. **This closes the `TypeError` crash path T-03 was deliberately forbidden from patching** — and lands the F-9 `target_year` correction with it, which was the entire reason that inline guard was refused at T-03 (a crash-only fix would have left `target_year` hardcoded and shrunk this diff so its reviewer never questioned it).

**Leader-measured verification** (own runs, no relayed claims):

- Scoped: **38 passed / 38 total, 0 skipped** (was 33 pre-T-04 — five new tests, one per Done-check line).
- Full: **320 suites / 2049 tests / 1 snapshot, all passing.** Exactly **+5** over the 2044 baseline — the count *rose*, which is what T-10's amended gate requires and what a relabeled test could not produce.

**Leader-verified against the Evidence disqualifier** (checked directly rather than accepting the Reviewer's summary):

- Tests assert **persisted** values via `expect(upsertForSp).toHaveBeenCalledWith(...)` — the payload handed to the repository, not the returned object. The disqualifier is satisfied.
- Complete-row byte-identity is *positively* pinned: the complete-row test asserts `indicator_id: 5972` and `target_year: 2026`, so any regression in the new guard fails it. The partial test asserts the exact mirror (`indicator_id: null`, `target_year: null`).

#### Reviewer verdict — **`STATUS: PASS`** (Gemini 3.1 Pro via agy)

Confirmed the crash path closed, F-9 satisfied in both directions, complete-row path byte-identical, tests asserting persisted payloads, and scope limited to the two declared files.

> ⚠ **CAVEAT — single-vendor review, weaker evidence than T-01/T-02/T-03.** Claude Opus was quota-blocked at the time (reset 5:50pm America/Bogota), so the primary `akili-reviewer` gate did not run. Gemini's report was also **notably thinner than its own earlier ones** — a bare summary with no per-question working, against 4 numbered advisories on each of T-02 and T-03. Its verdicts have never contradicted Opus where both ran, and the Leader independently re-verified the two highest-consequence checks (persisted-value assertions; complete-row byte-identity), which is why this was accepted rather than held. **Recommendation: run a confirming Opus audit on T-04 before PR 1 ships.** The complete-row path affects every existing complete row, and `strictNullChecks: false` means the compiler catches nothing.

---

### T-05 — Swagger response classes + `@ApiResponse`

- **Status:** ✅ **`[x]` COMPLETE — Reviewer PASS on attempt 1** (Claude Opus)
- **Date:** 2026-08-12 · **Implementer attempts:** 1 (0 rework)
- **Requirements covered:** R-BIL-114 (AC.4)
- **Files changed:** `dto/update-pool-funding-alignment.dto.ts`, `bilateral.controller.ts`, `bilateral.controller.spec.ts`

**The F-3 disqualifier is cleared by rendered output, not by inference.** The Reviewer verified the metadata assertion three ways: it traced `createApiPropertyDecorator` → `createPropertyDecorator` → `Reflect.defineMetadata(DECORATORS.API_MODEL_PROPERTIES, …)` in the installed library and confirmed `ModelPropertiesAccessor` / `SchemaObjectFactory` read that same store; it ran live probes proving the assertion fails **differently** when `nullable: true` is removed (`?.nullable` undefined) versus when the whole `@ApiProperty` is removed (metadata undefined, plus the field-list test fails); and it **built the actual OpenAPI schema** via `SchemaObjectFactory.exploreModelSchema(AlignmentResponse, {})`, confirming `"nullable": true` and the partial-row prose render on all six indicator-derived fields.

**Byte-identical JSON confirmed across every construction site** — not just the one cited: `bilateral.service.ts:568`, `:601`, `:623` all return object literals, `updateAlignment:816` delegates to `getAlignment`, no `new`, no `plainToInstance`, and **no `ClassSerializerInterceptor` anywhere in `src/`**. The classes declare no initializers, so nothing is emitted at runtime.

**The extra interface→class conversion is legitimate, not creep.** `@ApiProperty({ type: () => X })` needs a runtime value; an interface is erased (`TS2693`). The alternatives were worse documentation (untyped array) or a hand-duplicated shape. Decorators only — no new fields, no logic, no renames, both pre-existing `@sdd-spec` comments preserved.

**`contribution_without_indicator` landed** at `controller.ts:207-209` as a seventh alternative, matching the emitted code at `service.ts:953` and the union at `:96`. All six pre-existing codes intact and unreordered, and the spec pins all six in a regression loop so a future drop goes red. *(This resolves the orphan surfaced by T-03's audit — Leader-assigned to T-05.)*

**Reviewer's own verification runs:** 11 bilateral suites / 165 tests, 0 skipped; scoped 72 tests; `npx tsc --noEmit` exit 0; `npx eslint` exit 0; rendered schema inspected.

**⚠ Correction to the Leader, accepted.** My briefs for T-04 and T-05 framed the partial-row null set as **five** fields. `requirements.md` R-BIL-114 Details lists **six** — it includes `quantitative_contribution`. Verified: the requirement text is unambiguous. No defect resulted (T-03 rejects a contribution without an indicator, so the field is null for a partial row regardless), but the framing was mine and it was wrong. The Reviewer also reached the D-V2-4 wire-rename conclusion **independently, before** my retraction of that flag.

**ADVISORY** (non-gating):
1. The handler-level `@ApiResponse` descriptions (`controller.ts:63-69`, `:199-205`) enumerate **five** null fields, omitting `quantitative_contribution`. AC.4 requires the contract on the **response class**, which does document it — so the AC is met and this is not a gate. Adding the sixth name would make the handler blurb agree with the requirement. *(Same gap as the Leader's framing above.)*
2. `SelectedScienceProgramResponse.allocation` now renders in Swagger but `toSelectedSciencePrograms` (`service.ts:623-638`) never populates it — the CLARISA path carrying allocation returns a different type. Pre-dates T-05, which only annotated it; `@ApiPropertyOptional` correctly marks it non-required, so nothing false is claimed. Possible vestigial field worth a later cleanup.

---

### T-06 — Submission green-check proof + SQL comment fix

- **Status:** `[~]` **BLOCKED — Reviewer `STATUS: FAIL` (4 issues), escalated to Pivot Record: T-06 below**
- **Date:** 2026-08-12
- **Implementer attempts:** 1 · **Rework attempts consumed: 0 of 3** (spec defect → Pivot, not rework)
- **Requirements covered (attempted):** R-BIL-119 (AC.1–4)

#### Attempt 1 — Implementer (sonnet)

**Files changed:** new migration `1784500000000-correctPoolFundingAlignmentValidationComment.ts`; modified `result-status-workflow/function-handler.service.spec.ts` (+2 tests).

**What the Implementer got right, and disclosed honestly:**

- It **could not** verify the migration against a database (`ECONNREFUSED 127.0.0.1:3306`, no `.env`) and **said so plainly** rather than implying it had. It substituted a mechanical byte-identity proof of `up()`/`down()`.
- It **discovered `VISUAL_ONLY_GREEN_CHECKS`** — see Pivot Record below. This is the most consequential finding of the run and the spec did not know it.
- It correctly declined to build new DB-integration infrastructure for SQL functions (no precedent: `find src/db/migrations -name "*.spec.ts"` → 0 results repo-wide).

#### Reviewer verdict — **`STATUS: FAIL`** (Claude Opus)

Independently verified, with tooling rather than by reading: scripted byte-comparison of both migration files, full `npx jest`, isolated re-run of a failing suite, repo-wide consumer grep, eslint.

**Clean and not at issue:** migration append-only compliance (`1782950000000` confirmed unmodified); `up()`/`down()` byte-identity **re-derived by script**, not accepted; `down()` revert safety (in fact **better** than the original migration, whose own `down()` only drops the function without recreating it); migration ordering and glob discovery; eslint; scope discipline (exactly the 2 declared files); the 7-failure attribution.

**Reviewer's own suite run differed from the Leader's and it reported the discrepancy rather than smoothing it:** 319/320 suites, one 5000 ms timeout in `star-results-metadata-workbook.handler.spec.ts` (that suite took 352 s on its host). The Leader's independent run was clean at 320/2044 — consistent with advisory A-5 from T-02 (this repo's suites are contention-sensitive; a lone red under load is not a defect).

**ISSUE 1 — the decisive one, and nobody asked for it.** The two added tests **duplicate assertions that already exist on `HEAD`** and add zero new coverage. `git show HEAD:.../function-handler.service.spec.ts` line **496** already contains `it('should not throw when only the visual-only pool_funding_alignment check fails')` with mock `{general: true, alignment: true, pool_funding_alignment: false}` and `resolves.not.toThrow()` — the new "R-BIL-119 AC.3" test is that body **verbatim**, differing only in name and comment. The new AC.1/AC.2 test differs from the pre-existing all-pass test only by adding `pool_funding_alignment: true`, a key `completenessValidation` **skips** at line 325, so it cannot affect the outcome under any mutation. **Leader independently confirmed this at `HEAD:496`.**

Consequence: the guarantee T-06 was written to make *"explicit and load-bearing"* **was already pinned before T-06 ran**. What landed is a relabeling — and it is why the Implementer's "zero failures from my change" evidence carries no signal.
- **Violated Rule:** `tasks.md` T-06 Description and Done-check bullets 1–2; `design.md` §10 row "Server unit — Submission (R-BIL-119)".

**ISSUE 2 — R-BIL-119's rationale is factually wrong and the correction was unrecorded.** See Pivot Record below.
- **Violated Rule:** root `CLAUDE.md` §1 (*"prefer fixing the document and recording a decision… Do NOT silently let docs and code drift"*); the precedent set by Pivot Record: T-01.

**ISSUE 3 — AC.1 and AC.3 are unmet.** Neither test constructs a partial row or an unanswered SP; both mock the function's return value, so each **names the exact property it cannot reach** — the identical shape T-01 was FAILED for. Static reading does not discharge them, because `design.md` §10 places these assertions at the **Server unit** tier while the same section forbids MySQL there. The Reviewer explicitly rejected the Implementer's disqualifier defense: T-06's disqualifier clause governs **AC.2** and guards the opposite error (SQL-only evidence overclaiming submission); it is not a blanket exemption for AC.1/AC.3.

The Reviewer did credit that the boundary is *"recorded prominently and honestly in the code comment — a real improvement over T-01, and not concealment"* — but noted **CI reports show test names, not comments.**

**ISSUE 4 (smallest; AC.4's literal demand IS met).** The false claim is gone, but the replacement comment adds *"a partial row … satisfies this check by design — AC-1676 requires that missing ToC detail must never block submission"*, implying this function's return value gates submission. It does not. AC.4 exists precisely to stop this comment documenting a non-existent invariant; substituting a weaker one is in scope to fix. Remediation is one line, landed on the **new** (still untracked) migration — never on `1782950000000`.

---

## Pivot Record: T-06

**Date:** 2026-08-12 · **Status:** T-06 held at `[~]` · **Rework attempts consumed: 0 of 3**

### The discovery

`pool_funding_alignment` is a member of `VISUAL_ONLY_GREEN_CHECKS` (`green-checks/dto/find-green-checks.dto.ts:5–7`). The Reviewer swept **every** consumer in the tree — exactly three sites, no fourth path:

| Site | Behavior |
| --- | --- |
| `green-checks/repository/green-checks.repository.ts:66–67,115` | emits `pool_funding_alignment_validation(…) as pool_funding_alignment` into the SELECT |
| `green-checks/green-checks.service.ts:65` | `if (VISUAL_ONLY_GREEN_CHECKS.has(key)) continue;` |
| `result-status-workflow/function-handler.service.ts:325` | same skip, inside `completenessValidation` |

The value is computed, returned to the client as an informational field, and **excluded from both completeness computations**. The DTO comment says so outright, and the merged migration's own commit message is `a77fffbb feat(green-checks): emit **visual-only** pool_funding_alignment check` — visual-only since the day it was introduced.

~~**The SQL function is load-bearing on no path. Even a function returning `false` cannot block submission.**~~ **CORRECTED 2026-08-12 (3rd pass, T-06 re-audit):** server-side only — the client gates Submit on the raw payload (`cache.service.ts:43`, `submission.service.ts:35-38`), so a `false` DOES disable Submit. It is not load-bearing on any *server* path.

### What this falsifies in the approved spec

| Document | Claim | Status |
| --- | --- | --- |
| `requirements.md` R-BIL-119 preamble | *"currently satisfied **by accident** — the SQL function tests only row presence"* | **False.** Satisfied *structurally* |
| `design.md` §8 Finding 3 (server row) | *"a partial row still reads complete. That **happens to** match AC-1676"* | **False.** By design, not coincidence |
| `design.md` §8 defect class **D8** | *"Submission silently blocked — a partial row fails the green check and traps the result"* | ~~Structurally impossible via this path~~ — **REVERSED; D8 was reinstated, see the correction block below** |
| `design.md` §13 **D-C1-11** | *"correct by accident and **untested**"* | **Both halves false** — see Issue 1: it was already tested |

**Effect on the ACs:** AC.2 collapses to a structural property that is already true and already tested. AC.1 and AC.3 survive only as claims about a **UI indicator**, not about submission.

### The propagation risk — worse than the Leader framed it

`OQ-C1-6` instructs T-10 to "correct" `docs/ux-ui/design.md` §12.2's entry stating `pool_funding_alignment` is *"intentionally absent from `GreenChecks`"*, on the grounds that migration `1782950000000` contradicts it. **That entry is nearer the truth than the spec allows** — the check is emitted but excluded from every completeness gate, so "never part of the completeness computation" is right in substance.

**T-10 as currently instructed would write a new inaccuracy into the constitutional UX/UI document**, where it would outlive this spec. **T-10's §12.2 correction is BLOCKED until this Pivot lands.**

### Decision required from the user

Mirrors T-01's AC.2 decision:

- **(A) Structural closure + sign-off** — AC.1/AC.3 discharged by unchanged SQL plus the visual-only exclusion, with a lapse condition. Cheapest; consistent with the T-01 precedent. *(The original rationale — "stronger than T-01 since the function gates nothing" — was **struck**; see the correction block below.)*
- **(B) Integration test** against the `TEST` datasource, outside T-06's declared file scope. Strongest evidence, but new scope the budget does not carry, and no precedent exists in the repo.

**Mandatory under either option:** rename both tests to what they actually assert; delete or justify the duplicates (Issue 1); fix the comment implication (Issue 4); and correct the four false spec statements above. Keep the boundary comment — the Reviewer called it *"the right instinct"* and it should survive the rename.

### Resolution — **(A) Structural closure, approved by user 2026-08-12**

AC.1 and AC.3 are discharged structurally rather than by test. The argument is **stronger here than at T-01**: not only does this spec change no DDL and leave the function's logic untouched (the new migration's `up()` SQL is byte-identical to the merged original, re-derived by script during review), but the value is **excluded from every completeness computation** — so even if the reading of the SQL were wrong, submission could not be blocked. AC.1/AC.3 govern a **UI indicator only**.

**Lapse condition:** the discharge holds only while the function's logic is unchanged. If any migration alters `pool_funding_alignment_validation`'s body, **or** `pool_funding_alignment` is removed from `VISUAL_ONLY_GREEN_CHECKS`, it lapses and AC.1/AC.3 require an integration test against the `TEST` datasource.

### Spec amendments landed (Pivot Protocol step 3)

| File | Change |
| --- | --- |
| `requirements.md` R-BIL-119 preamble | The *"satisfied by accident … and it is untested"* claim corrected — **both halves were false**. Structural exclusion documented with all three consumption sites and the `a77fffbb` commit evidence |
| `requirements.md` R-BIL-119 AC.1/AC.3 | Structural discharge recorded with the lapse condition, **plus a binding prohibition**: tests may not be named as though they prove these ACs, since mocking the function's return value proves the consumer, not the function — the exact defect T-01 was failed for and T-06 repeated |
| `requirements.md` §8.1 defect table | **D8 struck as structurally impossible.** The spec was carrying — and gating on — a risk that cannot occur |
| `requirements.md` §8.2 verification matrix | D8 removed from the `npm test` row |
| `design.md` §8 Finding 3 (server row) | *"happens to match"* → corrected to structural, with the skip sites named |
| `design.md` §8 F-4 parenthetical | *"previously satisfied only by accident and untested"* — corrected on both counts |
| `design.md` §9 budget prose | *"holds today only by accident"* → *"structurally"* |
| `design.md` §13 D-C1-11 | *"correct by accident and untested"* corrected; only the comment-correction half of the decision survives |
| `tasks.md` T-10 | **§12.2 instruction rewritten, not merely unblocked** — it now says to *sharpen* the entry (visual-only, excluded from completeness) and explicitly forbids claiming the migration contradicts it |

### Correction closure sweep (two-direction)

- **Forward:** grepped `by accident`, `happens to`, `D8`, `291`, and `intentionally absent` across the spec folder — every surviving instance corrected or struck above.
- **Backward:** the amended statements are cited by `tasks.md` T-06 and T-10 and by `design.md` §8/§13; all were updated in the same pass, so no document now asserts the superseded rationale.

### ⚠ CORRECTION TO THIS PIVOT — the re-audit found the Leader's own resolution partly false (2026-08-12)

The T-06 re-audit returned **`STATUS: FAIL`** and its most important finding was against **the Leader's Pivot resolution above, not the Implementer's work.**

**What was wrong.** The resolution asserted the stakes were *"structurally bounded — the value is excluded from every completeness computation, so even if this reading were wrong, submission could not be blocked."* **That is false.** `VISUAL_ONLY_GREEN_CHECKS` is honored **server-side only**:

| Site | Behavior |
| --- | --- |
| `green-checks.service.ts:62-69` | excludes the key from `completness` — **but still returns it on the payload** |
| `green-checks.repository.ts:115` | emits `pool_funding_alignment` unconditionally, every result |
| `client/.../cache/cache.service.ts:43` | `Object.values(this.greenChecks()).every(check => check)` — **no VISUAL_ONLY filter** |
| `client/.../submission.service.ts:35-38` | same `every(Boolean)`, gating `canSubmitResult` |
| `result-sidebar.component.html:82-83,100,115` · `status-dropdown.component.ts:133` | disable Submit |

**Leader independently verified all of this** before accepting the finding.

**Root cause of the Leader's error.** T-06's consumer sweep covered `server/researchindicators/src` only and concluded *"exactly three sites, no fourth path"*. The Leader accepted it without checking the client tier. As the Reviewer noted, this is **the mirror image of judgment F-4**, which `design.md:259` records against round 1 for searching *client TypeScript only* and stating a general verdict — the same mistake in the opposite direction, made while citing the document that warns about it.

**What survives, stated precisely** (the Reviewer's framing was slightly broader than the evidence supports, and the Leader narrowed it after re-reading the SQL):

- **AC-1676's promise still holds.** The function returns `true` when a row exists regardless of completeness, so a **partial row passes** and never blocks submission. D8's *original trigger* remains unreachable.
- **But the reason recorded was wrong.** It holds because of **row-presence semantics**, not because the check is visual-only.
- **D8's mechanism is real.** A `false` from this function **does** disable Submit in STAR. For an unanswered SP that is the *intended* behavior (R-BIL-112 AC.4, R-BIL-119 AC.3) — so this is not a live user-facing bug, but the "cannot block submission" claim must never be relied on again.
- **A genuine pre-existing inconsistency is now documented:** the server declares this check visual-only; the client silently ignores that declaration. **Pre-existing on `HEAD` — not introduced by this spec.**

**Corrections landed by the Leader:**

| Site | Correction |
| --- | --- |
| `requirements.md` R-BIL-119 AC.1/AC.3 discharge | **Support 3 struck** with the evidence above. The discharge **stands on supports 1 and 2 alone** (unchanged byte-identical SQL + row-presence predicate), both independently verified |
| `requirements.md` §8.1 | **D8 reinstated**, precisely scoped: original trigger unreachable, mechanism real |
| `requirements.md` §8.2 matrix | D8 restored to the `npm test` row |
| `requirements.md` R-10 · `design.md` §8/§14 · `tasks.md` T-06 description | four surviving superseded statements corrected — **the previous closure sweep reported completion it had not achieved** |

**The lapse condition is also widened:** it must now trigger on changes to `cache.service.ts:43` or `submission.service.ts:35-38`, or the addition of any new visual-only key — not only on DDL changes.

**Reviewer's verdict on scope, recorded because it matters:** *"the single-migration deliverable is the **right** scope… Scope is not the problem. The problem is the truth of one sentence inside it."*

### Remaining work on T-06 (Issue 1 → rework attempt 1 of 3; Issue 2 was Leader spec work, corrected above)

1. Delete the two duplicate tests (Issue 1) — the guarantee was already pinned at `HEAD:496`.
2. Fix the migration comment's submission implication (Issue 4) — one line, on the **new** untracked migration only.
3. Record in the code comment that the check is visual-only **server-side**, and that the client still gates Submit on the raw payload.

### Re-audit verdict (3rd round) — **`STATUS: PASS`** ✅

The auditor **did not inherit the Leader's citations** — the Implementer had disclosed taking them as given, and the Leader's verification was exactly what had been wrong the round before. It re-walked all five claims to source itself, including the client files.

- **It hunted specifically for the intermediate filter that would falsify the caution, and found none.** `to-promise.service.ts:152-155` sets `this.cacheService.greenChecks.set(response.data)` — the raw envelope, wholesale. *"THIS is the site where a filter could have existed and does not."* Chain confirmed end to end through `cache.service.ts:43`, `submission.service.ts:35-38`, to the disabled Submit button at `result-sidebar.component.html:100-102`. MySQL `tinyint 0` is falsy → `every(Boolean)` fails → Submit disabled. **The Leader's D8 reinstatement was correct.**
- **Byte-identity re-derived post-edit, with a fairness check neither the Leader nor the Implementer thought of:** it grepped for *inline* (non-leading) `--` in both executable bodies to prove the comment-stripping was a fair equivalence rather than silently discarding SQL. None found. *"This is the check that would have caught a cheat; it passes."*
- Merged migration untouched; no backticks or `${` in `--` lines; `eslint` and `tsc --noEmit` clean.
- **AC.4 satisfied without trading one false claim for a third** — all five replacement clauses independently proven.
- **Caution judged proportionate:** *"Given the comment has been wrong twice in opposite directions, the caution is precisely what stops a fourth agent from 'simplifying' it back to the false version."*

#### ⚠ SECOND FINDING AGAINST THE LEADER — the closure sweep failed again

The Leader reported striking the false support and correcting "four surviving spec sites". **The struck sentence survived verbatim in more places.** The auditor found three; the Leader's follow-up grep found **six** (including `gates nothing` variants):

| Site | Status |
| --- | --- |
| `requirements.md:285` · `design.md:255` · `execution.md:352` | *"Even a function returning `false` cannot block submission"* — **all struck and corrected** |
| `execution.md:360` (D8 row) · `:375` (option A rationale) · `:447` (comment instruction) | `gates nothing` variants — **all corrected** |

`execution.md:352` had been **directly contradicting `:427` inside the same file**, where the truth was already correctly recorded.

**This is the second time a Leader closure sweep reported completeness it had not achieved.** The auditor also diagnosed why its own first grep missed them — its exclusion filter dropped lines containing the word "false", which is the very word in *"returning `false`"* — and prescribed the fix: **grep the literal string, not a semantic pattern.** The Leader applied that and verified closure by literal-string grep afterward.

Why it matters more than it looks: `design.md:255` is precisely the authoritative-sounding site a future implementer reads before editing this function. **Those lines were the seed that produced the second wrong comment.**

**Precision nit (non-blocking, no fix required):** the comment cites `cache.service.ts` and `submission.service.ts` together for the Submit gate. Strictly, `submission.service.ts:35-38` gates Submit's disabled state while `cache.service.ts:43` gates the *Review Result* button and Submit's tooltip. Both consume the raw unfiltered payload, so the citation pair is fair and the substantive claim is unaffected.

---

### T-07 — Client save gate + payload writer

- **Status:** ✅ **`[x]` COMPLETE — Reviewer PASS on attempt 1** (Claude Opus) · 0 rework
- **Date:** 2026-08-12 · **Commit:** `0a8f4d41` (with T-09; files entangled)
- **Requirements covered:** R-BIL-112 (AC.1–5), NFR-BIL-112

**The spec's headline fix.** `writeDtoFromDrafts` `continue`d past an incomplete "Yes", omitting it from the request body — the PATCH succeeded, the UI reported success, and nothing persisted. The branch's own comment called it *"defensive only"*, and it was, until the gate was relaxed. Gate and writer therefore changed together.

**Reviewer's independent findings:**

- **Every modified pre-existing test verified as the minimum consequence, with its guard preserved or relocated.** Per-file counts vs `HEAD`: component `it(` 85→89, service 53→55; **no test or `describe` deleted**. The `>= 0` sign guard did not vanish — it moved with the behavior into a new `canSave` false test.
- **The mock stub** (the sharpest risk — a stub drifting from the real writer makes component tests green against semantics that exist nowhere) was compared line by line against `bilateral.service.ts:371-390`: identical control flow, identical four conditional spreads. **No drift.**
- **NFR-BIL-112 branches enumerated from the code**, not from the report. Field omission provably persists as a **clear** server-side, so clearing a saved indicator actually saves.
- Reviewer re-ran the scoped suites itself: 2 suites / 144 tests, 0 skipped.

**ADVISORY (carried to T-10):**
- **A-1** — the component's PATCH-body test cannot fail on a real-writer regression, and **nothing type-checks the stub**: ESLint ignores `*.spec.ts` *and* Jest runs `isolatedModules: true`. Fix: have the mock delegate to `BilateralService.prototype.writeDtoFromDrafts`. *(Validation later showed this advisory understated the problem — see the Validation Findings section.)*
- **A-2** — the code comment claims a below-floor "Yes" is emitted *"so the server can reject it"*, but 400s on `level`/`toc_result_id` **render nowhere**; the block renders only `aligns_with_toc` and `quantitative_contribution` errors. Not a live regression (the path is gated off by `canSave`), but the same gap already swallows `level_not_allowed`, `unknown_toc_result_id` and `unknown_indicator_id` on **reachable** saves. **Pre-existing; warrants its own ticket.**
- **A-4** — T-07 adds **6** `it()` blocks, not the 9 the full-suite delta suggested; the rest was concurrent tasks sharing the worktree.

---

### T-08 — Question copy

- **Status:** ✅ **`[x]` COMPLETE — Reviewer PASS on attempt 1** (Claude Opus) · 0 rework
- **Date:** 2026-08-12 · **Commit:** `31453bfa` · **Requirements:** R-BIL-110 (AC.1–3)

Reworded `ALIGN_QUESTION`. **No template change needed** — the question already rendered through the canonical `.label` class on the legend.

**Reviewer's independent findings:**

- String compared **codepoint-by-codepoint** against `requirements.md` AC.1, `design.md` §7.4 and `tasks.md` — all three agree, no internal conflict. The old string returns **zero** hits tree-wide.
- **D-C1-2 verified by per-file site-text diff, not by count** — and this produced a **method finding**: the Implementer's tree-wide grep read **133**; the Reviewer measured **144** minutes later as T-07 landed. A count is also structurally unable to distinguish "unchanged" from "renamed plus a compensating mention". Every `aligns_with_toc` line in both files is byte-identical to `HEAD`.
- **The Implementer's refusal to overclaim traceability was verified correct and explicitly not penalised:** it declined to label the `.label` test "AC.3", because AC.3 owns the Yes/No required-answer behavior while the `.label` obligation comes from the scenario's `AND IT MUST` clause, owned by no numbered AC.
- **The Tailwind question was reasoned, not reflexed:** `class="label inline-block mb-1"` — `inline-block` and `mb-1` touch none of the four typographic properties §7.1 pins, so they co-exist with the canonical class rather than substituting for it, and they are pre-existing on `HEAD`.
- **Method finding:** the flat ESLint config **ignores `*.spec.ts`** ("File ignored because no matching configuration was supplied"), so "lint clean" covers production files only.

**D7 explicitly NOT claimed.** Placement, size and legibility remain unproven — jsdom has no layout engine.

---

### T-09 — Client partial render + reload

- **Status:** ✅ **`[x]` COMPLETE — Reviewer PASS on attempt 1** (Claude Opus) · 0 rework
- **Date:** 2026-08-12 · **Commit:** `0a8f4d41` (with T-07) · **Requirements:** R-BIL-114 (client scenario)

**No production change was needed — design §7.3's prediction held exactly.** `draftsFromSaved` already null-coalesced every field; the Reviewer confirmed it byte-unchanged and verified T-09 contributed nothing to either modified production file.

**Reviewer's independent findings:**

- **T-09's contribution isolated** from T-07/T-02/T-08 by `git diff --numstat` plus line inspection: +64 in the block spec (one appended `describe`, 3 tests) and a +33 insertion at line 947 of the page spec (1 test). All 18 deletions in the page spec sit in **T-07's** regions.
- **The `whenStable()` finding was verified real, not a workaround.** Read directly in `node_modules/@angular/forms`: `NgModel._updateValue` wraps `control.setValue` in `resolvedPromise.then()`, so the CVA write provably cannot run before the microtask queue drains. **User-visible consequence: none** — a microtask resolves before paint. Stock Angular behavior, already house convention in this suite.
- **Positive display assertions, not absence:** the three `.p-select-label` assertions are the **only** ones in the entire suite; had `d.level` been null, PrimeNG would render the placeholder, so they cannot pass on an unrendered value.
- **The coverage gap was verified genuine** — `SAVED_TOC_ALIGNMENTS_FIXTURE` contains only a *complete* "Yes" and a "No"; T-02's AC.3 pins a *mid-entry* cascade. **No saved *partial* row round-tripping existed anywhere.** Materially unlike T-06, where the guarantee was already pinned at `HEAD:496`.

**ADVISORY (carried to T-10):**
- **A-1** — one of the three block tests overlaps T-02's committed AC.3 test. Not gated, applying this spec's own precedent consistently: *"T-06 failed because 2 of 2 were fake-new; here the redundancy sits inside a real matrix."* *(Validation later corrected the "byte-identical" characterisation — see below.)*
- **A-2** — the reload linkage is composed **by comment, not by machine**: `reloadedPartialDraft()` re-declares the shape as a literal and nothing type-checks it against `SavedTocAlignment`. **Same class as T-07's A-1** — fix both together or neither.
- **A-3** — the null/undefined/NaN sweep runs on the **pre-microtask DOM**, so the settled DOM a user actually sees is never swept.

---

## Blockers

### BL-1 — Claude session usage limit exhausted mid-loop (2026-08-12)

The Claude Code session hit its usage limit at ~16:00 UTC (resets 12:40pm America/Bogota).
`impl-T01` delivered its complete report before terminating; **`rev-T02` was terminated before
returning any verdict**, and no Reviewer was ever spawned for T-01.

Per `/akili-execute` → *Runtime-failure fallback*, a Reviewer runtime failure is an **environment
blocker, not a work FAIL**, and the Reviewer role may **never** be run inline by the Leader — a
runtime failure does not suspend the `author ≠ auditor` constraint. Both tasks therefore remain
`[~]`; neither may be marked `[x]` without an independent Reviewer verdict.

**State is safe:** the working tree contains exactly the 4 intended test files
(+392 insertions), with zero production, template, or migration changes, and every temporary
mutation reverted — verified by the Leader via scoped `git diff`.

**Resolution route:** cross-host Reviewer dispatch to opencode on a non-Claude frontier model.
This was the user's own suggestion at kickoff (originally weighed as a token-saving measure and
declined — see *Orchestration decision* above). The limit changes the trade-off decisively: it is
a **separate quota**, and a different vendor's model is *stronger* independence than a second
Claude tier, which directly serves the user's "review must be strong" constraint. The earlier
objection — unauditable channel — applies to *implementation*, not to review: a Reviewer's output
is a written verdict the Leader records verbatim, and the diff it audits is pinned in this log.

### BL-2 — R-BIL-118 AC.2 not provable at the unit tier — **escalated to Pivot Record below**

Raised by the Leader from T-01's `Not Done`, then **independently confirmed as a FAIL by both
reviewers** (Claude Opus and Gemini 3.1 Pro, no communication between them). Superseded by the
Pivot Record below.

---

## Pivot Record: T-01

**Date:** 2026-08-12 · **Status:** T-01 held at `[~]` · **Rework attempts consumed: 0 of 3**

### Why this is a Pivot and not a rework

Per `/akili-execute` → *Pivot Detection*: when a Reviewer surfaces evidence that **the spec itself**
is wrong or unviable — not merely the implementation — the loop stops immediately and no rework
attempt is consumed. The primary Reviewer reached exactly that conclusion unprompted:

> "this AC was never dischargeable inside T-01's two declared files given design §10's no-MySQL
> rule: that is a **spec-authoring gap surfaced by T-01**, not an Implementer failure, and should
> be logged as such."

The contradiction is internal to the approved spec, and holds regardless of who implements T-01:

| Spec document | Says |
| --- | --- |
| `requirements.md` §3 R-BIL-118 AC.2 | the **DB** partial-unique constraint must be shown to reject a duplicate active row |
| `tasks.md` §3 coverage map | AC.1–2 owned by **T-01 alone**, and "Unowned clauses: none." |
| `tasks.md` T-01 "Files touched" | two **unit** spec files |
| `design.md` §10 | **no MySQL in unit tests** |

No implementation can satisfy all four at once. Three further Implementer attempts would each
rediscover the same wall.

### Alternatives

- **(A) Structural closure — recommended.** `design.md` §4 records that the `active_result_sp`
  generated column and `idx_rpfta_active_result_sp` index are **untouched**, and `requirements.md`
  §5 states **"No data model changes."** R-BIL-118 is a *regression* requirement — its purpose is
  "do not break what already works." For a constraint this spec provably never modifies, an
  unchanged-DDL argument is a legitimate discharge. Cost: none. Requires explicit sign-off, and
  must be recorded rather than silently assumed.
- **(B) Integration test against the `TEST` datasource.** Strongest evidence: actually attempts the
  duplicate insert and asserts the DB rejects it. Cost: a new task outside T-01's declared file
  scope, plus a real MySQL dependency in CI — new scope the approved budget does not carry.
- **(C) Amend AC.2's text** to require only application-level avoidance. Cheapest to satisfy, but
  **weakens a regression guarantee to match what was convenient to build** — the failure mode the
  spec's own §8.2 exists to prevent. Not recommended.

### Mandatory regardless of which alternative is chosen

Remediation (a) is **not optional under any option**: the test name and its inverted block comment
currently assert a guarantee the suite does not deliver. Whichever way AC.2 is homed, the artifact
must stop claiming closure it has not earned — that misrepresentation, not the coverage gap, is
what the Reviewer failed the task for.

### Resolution — **(A) Structural closure, approved by user 2026-08-12**

AC.2's DB-enforced half is discharged structurally: this spec changes no DDL. The backward leg of
the correction sweep found the argument was **already latent in the approved design** —
`design.md` §4 line 106 states *"The partial-unique `active_result_sp` generated column and
`idx_rpfta_active_result_sp` are untouched, so R-BIL-118 holds structurally"* — the spec simply
never connected that statement to the AC. So this is a wiring correction, not a new concession.

**Lapse condition (recorded so it is not lost):** if a future spec in this module alters the DDL,
this structural discharge lapses and AC.2 reverts to requiring an integration test against the
`TEST` datasource.

### Spec amendments landed (Pivot Protocol step 3)

| File | Change |
| --- | --- |
| `requirements.md` R-BIL-118 AC.2 | Split into application half (proven by T-01) and DB half (structural), with the lapse condition |
| `tasks.md` §3 coverage map | AC.1 / AC.2-application / AC.2-DB split into three rows with distinct owners |
| `tasks.md` §3 closure guarantee | "Unowned clauses: none." → **"one, deliberately"**, naming the exception and forbidding silent re-absorption |
| `tasks.md` T-01 implementation notes | AC.2 instruction rewritten to ask for the application half and to forbid naming the test as if it proved the constraint |
| `requirements.md` NFR-BIL-111 · `tasks.md` T-10 · `proposal.md` | stale 291/1790 baseline replaced with the measured 320 suites (CF-1) |

### Correction closure sweep (two-direction, per `/akili-specify` → *Correction Closure*)

- **Forward** (superseded values across the whole spec folder): found **six** surviving instances,
  including `tasks.md` T-01's own implementation note — which still instructed the very assertion
  the pivot overturned — and the stale baseline in `proposal.md`, a document the pivot analysis
  never cited. All corrected. This is precisely the failure mode the two-direction rule exists to
  catch: amending only the cited sites would have left T-01's work order contradicting its own
  amended AC.
- **Backward** (documents citing the corrected sections): `design.md` §4 and `requirements.md` §5
  both assert "No data model changes" and the structural-hold claim. Both **support** the amended
  AC; no document was left asserting a falsehood.

### Rework dispatched

The mandatory artifact fix (remediation (a) — test rename + inverted comment) was dispatched to a
fresh Implementer in parallel with the pivot decision, scoped to names and comments only, with the
Reviewer's ADVISORY items explicitly ruled out of scope. **This is a Pivot remediation, not a
rework attempt: the 3-attempt ceiling remains at 0 consumed.**

### Re-audit verdict — **`STATUS: PASS`** ✅ (same auditor, Claude Opus)

The Reviewer that issued the FAIL re-derived everything from the working tree rather than trusting the rework summary.

- **"Names and comments only" proved arithmetically, not by eye.** The file diff moved +157 → **+165**. The old header comment was 12 lines (10 body + blank + `@sdd-spec`); the new one is 20. Delta **+8**, and 157 + 8 = 165 exactly. The renamed `it(...)` title is one line in both revisions, consuming none of it. **That leaves exactly zero lines available for any code change.** Corroborated by re-reading the `matches()` helper, both fixtures, all four spies and both test bodies (character-identical to attempt 1), by the unchanged 2 suites / 33 tests, and by re-certifying that the M4 and M5 mutation-kill properties still hold on the current text.
- **Issue 1 discharged on both fronts.** The title now claims exactly what the suite delivers; the inverted parenthetical is deleted outright and replaced with the correct direction — *"which enforces independently and which `upsertForSp` relies on as a backstop, not the reverse."*
- **The Reviewer independently re-verified the citations** rather than accepting the Leader's check, and went further: it read migration `1779190000015:42–44` and confirmed the constraint is a **real artifact**, not a documented fiction —
  ```sql
  `active_result_sp` varchar(71)
    GENERATED ALWAYS AS (IF(`is_active` = 1, CONCAT(`result_id`, ':', `sp_code`), NULL)) STORED,
  UNIQUE INDEX `idx_rpfta_active_result_sp` (`active_result_sp`),
  ```
  MySQL treats NULLs as distinct in a unique index, so this is a genuine partial-unique over active rows only. **The structural argument rests on something that actually exists.**
- **No advisory was acted on** — verified by grepping the `bilateral.service.spec.ts` diff for every advisory-relevant token; that file's diffstat is byte-for-byte unchanged at +140/−1. No scope creep.

**On whether the structural discharge is legitimate or merely relabels the gap** — the Reviewer was explicitly invited to reject it, and states it read the wording *"with a view to disagreeing, and I don't."* Five distinguishing reasons:

1. **AC.2's text is untouched** — the AC still asserts the constraint holds; only the means of showing it changed.
2. **The argument suits this AC's type.** R-BIL-118 is a *regression* AC; the only thing that can break a DB constraint is a DDL change, and this spec makes none (independently verified: no migration in the diff, none untracked).
3. **It carries a falsifiable lapse condition** — *"the decisive feature. A relabeling grants permanent absolution; this grants a discharge conditional on a stated fact remaining true, and names what happens when it stops being true."*
4. **The closure guarantee was weakened honestly** — "none" → "one, deliberately", with the exception named inline, given its own table row, an owner, a sign-off date, and an instruction against silent re-absorption. *"Making a gap loud is the opposite of hiding it."*
5. **The root cause is recorded, not just the symptom** — the note states the AC was not dischargeable by its owning task, and why, where the next author will hit it.

**Key context the Reviewer added:** the DB half was **never covered by a test before this spec either**. The amendment does not create an untested invariant — it makes a pre-existing one visible and bounded. Net improvement over the status quo.

It also confirmed NFR-BIL-111's corrected baseline *"reproduces my own caveat rather than laundering it"* — recording that 320 is measured, that 291/1790 corresponds to no ref that ever existed, and that the 2033 figure was never independently verified and must be measured at T-10. All `execution.md` cross-references resolve; no dangling refs introduced.

**NEW advisories from the re-audit** (both concern Leader bookkeeping, both actioned):

- **A-7 — stale status line.** `tasks.md` T-01 Status still referenced the now-closed BL-1/BL-2, contradicting the amended implementation note directly above it. **Actioned.**
- **A-8 — the lapse condition is scoped slightly narrow.** It triggers on *"a future spec in this module"* altering the DDL; a migration touching `result_pool_funding_toc_alignment` authored **outside** the bilateral module would not trip it as written. Low likelihood, cheap to widen. **Actioned — re-keyed to the table rather than the module.**

**Carried-forward advisories** (unchanged from attempt 1; non-gating, not to be actioned inside T-01): the `systemAdmin` fixture proving role-*independence* only; the RolesGuard-ordering comment wrong in three places (fix together or not at all); the AC.3 test name overstating by one notch — *"the same overstated-name pattern as Issue 1, one degree milder. It stayed advisory because the assertion still covers the AC's actual subject, where Issue 1's did not"*; and the two redundant assertions, one of which is strictly weaker than the test it shadows.

---

## Cross-task findings (relayed to T-10)

Both surfaced by the T-01 audit; both **independently confirmed by both reviewers**. Neither is a
T-01 defect — T-01 correctly declined to explain either away.

### CF-1 — The 291-suite / 1790-test baseline was never true for this tree

The Implementer attributed the 291→320 gap to "additional landed work on this branch." The primary
Reviewer checked and **falsified that explanation**:

```
HEAD:                    320 server src *.spec.ts files
origin/main:             320
main (stale local ref):  299
```

This diff adds **zero** new spec files. The tree already measured 320 when `tasks.md` was authored
on 2026-08-12, and `origin/main` measured 320 too — **291 corresponds to no ref that has ever
existed.** It is a stale figure carried into the spec, not branch drift.

**Consequence:** `requirements.md` NFR-BIL-111 and the `tasks.md` T-10 done-check both gate on a
baseline that was never real. **T-10's scope widens** from "explain the gap" to "replace 291/1790
with the measured figure." (The Leader's own earlier framing of this as benign drift was also
wrong; the Reviewer's measurement supersedes it.)

### CF-2 — RB-4 is stale and should be closed

`activePortfolio` exists only at `bilateral.service.ts:446/454/510/520` and is **used at every
site**; there is nothing at or near line 205 (`:203–207` is `deriveSciencePrograms` / catalog-map
code). `npx eslint` on that file exits 0. The risk as written does not exist on this branch and
must not be carried into T-10's lint gate as an open blocker.
