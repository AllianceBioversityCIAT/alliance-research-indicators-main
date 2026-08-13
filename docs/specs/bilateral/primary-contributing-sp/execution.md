# Execution Log — Bilateral / Primary vs Contributing Science Programs

Append-only audit trail of the AKILI Leader → Implementer → Reviewer loop for
`docs/specs/bilateral/primary-contributing-sp`.

---

## Document Control

| Field | Value |
| --- | --- |
| **Module** | bilateral |
| **Spec id** | 2026-08-primary-contributing-sp |
| **Spec path** | `docs/specs/bilateral/primary-contributing-sp` |
| **Approval Mode** | `gated` (from `proposal.md` §1) — the continue/pause gate stops for the user after every task |
| **Branch** | `JuankCadavid/AC-1676` |
| **Started** | 2026-08-13 |
| **Last updated** | 2026-08-13 |
| **Tasks** | 16 (`T-01` … `T-16`) |
| **Rework ceiling** | 3 attempts per task |
| **Budget (design.md §12)** | 16 tasks · ~2,575 insertions · 16 review rounds |
| **Tripwires** | > 19 tasks · > 3,120 insertions · > 20 review rounds ⇒ **stop and escalate** |

### Status vocabulary mapping

`tasks.md` uses a `Status: todo` field rather than the AKILI `[ ]` / `[~]` / `[x]`
checkbox convention. The mapping used throughout this log:

| AKILI | `tasks.md` |
| --- | --- |
| `[ ]` pending | `todo` |
| `[~]` started / blocked | `in-progress` (started) · `blocked` (HALT or Pivot) |
| `[x]` complete | `done` |

### Model routing actually used

| Role | Model | Note |
| --- | --- | --- |
| Leader | `opus` (T1) | Matches the registry's T1 binding — no downgrade recommended |
| Implementer | `sonnet` (T2) | via `.claude/agents/akili-implementer.md` |
| Reviewer | `opus` (T3) | via `.claude/agents/akili-reviewer.md` — **≠ Implementer**, `author ≠ auditor` held |

### Budget actuals (running)

| | Budgeted | Actual to date | Tripwire |
| --- | --- | --- | --- |
| Tasks completed | 16 | **2** (T-01, T-04) | > 19 |
| Insertions | ~2,575 | **241** | > 3,120 |
| Review rounds | 16 | **2** | > 20 |

No tripwire approached. T-04 came in at 120 insertions against a ~50 estimate
(+140% on the task; the overage is entirely test lines — 70 of the 120 — and the
production extraction itself was 50). Cumulative 241 of ~2,575 across 2 of 16
tasks, i.e. tracking at roughly the budgeted rate overall. Recorded, not
escalated.

T-01 came in at 120 insertions against a ~90 estimate
(+33% on one task, +30 lines absolute). Recorded, not escalated — a single
small-task overrun is noise against a 3,120 ceiling. Tracked so the pattern is
visible if it repeats, because C1's 3.2× breach (`kaizen-log.md`) accumulated
task by task without any single one looking alarming.

---

## Task Execution History

### T-01 — Pin the pre-existing cascade and `409` ordering, before anything changes

| Field | Value |
| --- | --- |
| **Status** | ✅ **PASS** |
| **Date** | 2026-08-13 |
| **Implementer attempts** | **1** (of 3 permitted) |
| **Reviewer verdicts** | 1 × `PASS` |
| **Rework attempts consumed** | 0 |
| **Requirements covered** | R-BIL-125 AC.4 · R-BIL-130 AC.2 (baseline half) · defect classes **D-7**, **D-8** |
| **Dependencies** | none |
| **Estimated / actual LOC** | ~90 / **120 insertions, 1 deletion** |

#### Leader decisions before dispatch

| Decision | Rationale |
| --- | --- |
| **Skills: `nestjs-expert`, `tdd`** — no deviation from the task list | Characterisation tests over an existing NestJS service with Jest mocks. `tdd` retained despite this being characterisation rather than red→green, because the task's sabotage-and-revert protocol *is* a red/green discipline. |
| **Effort: `high`** (above the T2 `medium` default) | ~90 LOC, but the evidence protocol (falsifiable pins, sabotage/revert on both, SHA capture, zero-production-file diff) is the part most likely to be under-executed — and every downstream task leans on these pins. |
| **Parallelism: none** | T-01 is the sole dependency-free node; T-02, T-04 and T-05 all wait on it. No independent track existed to run beside it. |
| **Environment pre-check: not required** | Verification is Jest unit tests with mocked TypeORM repositories — no running stack, no database. `docs/infrastructure.md` §Local Environment was not consulted because no gate in this task depends on it. |

#### Ambiguity resolved at dispatch (not escalated)

T-01 instructs: *"Capture the file's SHA-256 in the task evidence so T-04 can
prove the test was not edited"* — but T-01 **itself** appends 28 lines to that
same file, which changes any whole-file hash and makes it useless to T-04.

**Resolution (Leader):** capture **both** artifacts, and designate the
block-level hash as the durable one.

| Artifact | Value |
| --- | --- |
| Whole-file SHA-256 @ `HEAD` (pre-task baseline) | `e2b05b60ed1e575fee2fd9568290311081540d558ed3b23cb1f43c1b88d803f2` |
| **R-BIL-097 AC.2 block SHA-256** — lines **216–250** (35 lines, 1176 bytes) | **`94573605dbbe22b943339c80e2601ae492ade7022614d161aa5d63d932ceed57`** |

> **⚠ Designated comparison artifact for T-04 and T-11: the block hash
> `94573605…`, anchored by CONTENT — the `it('version gate — toc_alignments on a
> non-2026 live version → 409 toc_mapping_version_locked, nothing persisted
> (R-BIL-097 AC.2)')` block — NOT by the line range `216–250`.** Any later
> insertion above line 216 shifts that range while leaving the block itself
> untouched. The whole-file hash `e2b05b60…` is a pre-task baseline only and goes
> stale the moment T-01 commits; it must **not** be used as T-04's gate.

Judged a routine interpretation call rather than a blocking question: both
readings are satisfied by capturing both hashes, so no reading was foreclosed
and the user was not stopped for a decision that cost nothing to defer.

#### Attempt 1 — Implementer (`sonnet`, effort `high`)

**Files changed** — both `*.spec.ts`, **zero production files**:

| File | Δ |
| --- | --- |
| `server/researchindicators/src/domain/entities/bilateral/bilateral.service.spec.ts` | +93 / −1 |
| `server/researchindicators/src/domain/entities/bilateral/bilateral.service.updateAlignment.tocAlignments.spec.ts` | +28 / −0 |

**Tests added:**

- `bilateral.service.spec.ts` — new describe `updateAlignment — SP-deselection ToC cascade pin (T-01 / R-BIL-125 AC.4)`; this file had **zero** prior cascade coverage:
  - `'deactivates a ToC row when its SP leaves sp_codes'` — asserts `deactivateForSps` called once with `(19792, ['SP03'], 42, fakeManager)`.
  - `'does NOT deactivate a ToC row when its SP stays in sp_codes'` — asserts `deactivateForSps` never called when both SPs remain selected.
  - One supporting change: the anonymous `deactivateForSps: jest.fn()` on the `ResultPoolFundingTocAlignmentRepository` provider became a named top-level const so the assertions can reach it (the sole `−1`). Test-observability only.
- `bilateral.service.updateAlignment.tocAlignments.spec.ts` — appended after the pre-existing "leaves ⇒ deactivated" test at `:427–452`:
  - `'does NOT deactivate a ToC row when its SP stays in sp_codes (R-BIL-125 AC.4 — T-01 cascade pin)'` — supplies the missing direction so this file also pins both.
- **409 pin:** no new test authored. The existing `:216` test discharges R-BIL-130 AC.2's baseline half; the task's wording is verify-and-capture. Adjudicated below.

**Sabotage / revert evidence (the T-01 disqualifier — a pin that survives sabotage is not a pin):**

| Pin | Sabotage | RED | Revert | GREEN |
| --- | --- | --- | --- | --- |
| Cascade | `bilateral.service.ts:705` filter inverted: `.filter((c) => !effectiveSpCodes.has(c))` → `.filter((c) => effectiveSpCodes.has(c))` | 6 failures, incl. `Expected: ["SP03"] Received: ["SP01"]` and `Expected number of calls: 0 Received number of calls: 1` | `git checkout --` | 6/6 pass |
| `409` | `validateTocAlignments` gate inverted: `!== MAPPABLE_LIVE_VERSION` → `=== MAPPABLE_LIVE_VERSION` | `Expected constructor: ConflictException / Received constructor: BadRequestException` | `git checkout --` | 3/3 pass |

**Verification (verbatim):**

```
$ npx jest src/domain/entities/bilateral --coverage=false
Test Suites: 11 passed, 11 total
Tests:       168 passed, 168 total

$ npx eslint <both spec files>
(no output — clean)          # K-001: npx eslint, NOT npm run lint

$ git diff --stat -- server/researchindicators/
 2 files changed, 120 insertions(+), 1 deletion(-)

$ git diff --stat -- .../bilateral.service.ts
(empty — production file untouched after the sabotage reverts)
```

#### Attempt 1 — Reviewer verdict (`opus`) — **`STATUS: PASS`**

> The diff is characterisation tests only, adds no production change, and pins
> the SP-deselection cascade in both directions with a genuinely falsifiable
> assertion — the one-line sabotage at `bilateral.service.ts:705` breaks the
> "stays ⇒ untouched" test, not just the "leaves" one. The mock-hoist is
> neutralised by the file's existing `afterEach(jest.clearAllMocks())`, the new
> `jest.spyOn` calls are instance-scoped and cannot reach sibling describes
> (verified empirically on jest 29.7.0), the R-BIL-097 AC.2 block is
> byte-identical between `HEAD` and the working tree, and both gate commands
> re-run clean under `npx eslint`.

**The Reviewer re-ran the gates independently rather than accepting the
Implementer's report** — 168 tests, `npx eslint`, both SHA-256 hashes, the
production-file check, and a grep confirming no `primary_sp_code` / `sp_role`
appears in the added lines.

Rulings on the three risks the Leader flagged in the brief:

1. **Shared named `deactivateForSps` mock — no cross-test bleed.** The jest
   config in `package.json` sets **neither** `clearMocks`, `resetMocks`, nor
   `restoreMocks` — so the concern was correctly raised. It is neutralised by
   `bilateral.service.spec.ts:195`, `afterEach(() => jest.clearAllMocks())`.
   Two further reasons it is behaviour-neutral: no implementation is ever set on
   the mock (it stays a bare `jest.fn()`, identical to the anonymous one it
   replaced), and no pre-existing test could assert on it while it was anonymous.
2. **`jest.spyOn(service, …)` — no leak into sibling describes.** Verified
   **empirically** on jest 29.7.0 with a throwaway probe rather than by
   reasoning, since the behaviour is version-dependent: spying an
   instance-resolved prototype method installs an *own* property on the instance
   and leaves the prototype untouched. `service` is rebuilt from a fresh
   `TestingModule` in the outer `beforeEach` (`:103-193`), so the spies die with
   the instance; `listIndicators`, `upsertContribution` and `deleteContribution`
   cannot see them. The absence of `restoreAllMocks` is harmless here.
3. **The short-circuit does not weaken the pin.** The cascade decision is
   computed at `bilateral.service.ts:700-705`, *before* the transaction;
   `getAlignment` is only the post-transaction read-back at `:816`. Stubbing
   `getScienceProgramsForResult` is load-bearing in the required direction —
   `normalizeLeverCodes` validates `dto.sp_codes` against
   `perResult.science_programs`, so without the stub the test would `400` on
   `unknown_sp_codes` and never reach the cascade.

#### Adjudication of the Implementer's `Not Done / Assumptions`

Both entries were flags, not outstanding scope. Neither left work owed.

| # | Assumption | Adjudication |
| --- | --- | --- |
| 1 | **File allocation** — full both-directions pin in `bilateral.service.spec.ts` (zero prior coverage), only the missing "stays" direction added to the tocAlignments file (which already had "leaves" at `:427–452`). | **Accepted.** T-01 lists both files under *Files touched (intended)* and its Done criteria are file-agnostic ("A test asserts…"). Net result: both directions pinned in both files, with no duplicated pre-existing test. Reviewer concurred independently. |
| 2 | **No new 409 test authored** — flagged by the Implementer as the one possible gap. | **Not a gap.** T-01's note reads *"record that `:216` … passes on `HEAD`"* — verify-and-capture, not author-new. No Done criterion names a new test; they require only the red/green pair and the SHA. R-BIL-130 AC.2 is literally *"The existing test … passes **unmodified**."* A duplicate would not discharge that better than the unchanged block hash does, and the `!==`→`===` inversion supplied the required falsification. **The Leader stated this reading in the Reviewer's brief and asked it to confirm or contradict** rather than accepting its own interpretation — the Reviewer independently confirmed it. |

#### ADVISORY (4R lens findings) — recorded, non-gating

Per `/akili-execute` §2.4 these never trigger rework, never consume attempts, and
**may not become new tasks in this spec**. Recorded here and closed.

1. **RISK / traceability.** The whole-file SHA `e2b05b60…` is `HEAD`'s and goes
   stale the instant T-01 commits, so it cannot serve T-04's purpose. The block
   hash `94573605…` is the artifact that survives, and it should be anchored by
   **content** (the `it('version gate — …')` block) rather than by the line range
   `216–250`, since any insertion above line 216 shifts the range.
   → **Already actioned**: recorded as the designated comparison artifact in the
   *Ambiguity resolved* section above, anchored by content. This advisory
   independently confirms the Leader's dispatch-time decision.
2. **RELIABILITY.** Both pins assert at the **repository seam**
   (`deactivateForSps` called with `['SP03']`), not on a persisted `is_active`
   flag. That is the correct unit-level seam and exactly what T-01's
   *Verification* section prescribes — but T-01's *Presence-assertion caveat*
   describes the assertions as covering "the persisted `is_active` flags", which
   is true only **transitively**, via
   `result-pool-funding-toc-alignment.repository.spec.ts` (where
   `deactivateForSps` issues the `is_active: false` update, repository lines
   109–134). **Stated plainly here so nothing downstream reads these unit pins as
   proof of persistence.**
3. **READABILITY.** The "stays ⇒ untouched" direction now exists in both spec
   files with near-identical fixtures — justified (each file must stand alone),
   but a future cascade change touches two places. The cross-reference comments
   the Implementer added in both directions are what keeps this maintainable and
   **should be preserved when T-11 re-bases these blocks**.

#### Forward pointers — carry into the named task's brief

| Target task | Pointer |
| --- | --- |
| **T-04** | Compare against block hash **`94573605dbbe22b943339c80e2601ae492ade7022614d161aa5d63d932ceed57`**, located by **content** (the `it('version gate — …(R-BIL-097 AC.2)')` block), not by lines 216–250. Do **not** use the whole-file hash `e2b05b60…` — T-01 has already invalidated it. |
| **T-11** | Same block hash and the same content-anchored rule; `:216` is off-limits. Preserve the T-01 cross-reference comments in both cascade-pin blocks when re-basing (ADVISORY 3). |
| **T-07** | T-01's cascade pins must still pass **unmodified** — `git diff` must show no deletions in the pinned blocks. The pins live in **both** `bilateral.service.spec.ts` (new describe) and `...tocAlignments.spec.ts` (`:453+`). |
| **T-09 / T-13** | ADVISORY 2 — these unit pins prove the repository **seam**, not persistence. Persistence of `is_active: false` is evidenced only in `result-pool-funding-toc-alignment.repository.spec.ts`. Do not cite T-01 as persistence evidence. |

#### Issues encountered

**Reviewer went idle without delivering its contracted verdict.** A runtime
delivery failure, not a work failure — the audit had in fact completed. Recovered
per `.agents/leader.md` (*"idle ≠ delivered"*) with **one** direct poke demanding
the contracted report; the full verdict came back intact on the first poke. No
re-dispatch was needed and no rework attempt was consumed. Recorded because the
same failure mode is likely to recur across the remaining 15 tasks, and because
the recovery — poke once, then replace on a second idle — is what held.

#### Constitution Impact

**None.** T-01 created no module, moved no module boundary, and changed no public
surface. No child guide is needed or stale; no `## Module Guides` index entry
changes; no CodeGraph re-index is pending on account of this task (test-only
change).

#### Final verification result

✅ `npx jest src/domain/entities/bilateral --coverage=false` — 11 suites, **168 passed**
✅ `npx eslint` on both spec files — clean (**K-001 honoured**; `npm run lint` never cited)
✅ `git diff --stat` — 2 files, **both `*.spec.ts`**, zero production files
✅ R-BIL-097 AC.2 block byte-identical between `HEAD` and working tree
✅ No `primary_sp_code` / `sp_role` in any added line (T-01 forbids anticipating the change)

---

### T-04 — Extract the ToC version gate so the shipped `409` keeps firing first

| Field | Value |
| --- | --- |
| **Status** | ✅ **PASS** |
| **Date** | 2026-08-13 |
| **Implementer attempts** | **1** (of 3 permitted) |
| **Reviewer verdicts** | 1 × `PASS` |
| **Rework attempts consumed** | 0 |
| **Requirements covered** | **R-BIL-130** AC.1 / AC.2 / AC.3 (AC.4 deferred to T-06 — see below) · **D-C2-13** · defect class **D-8** |
| **Dependencies** | T-01 ✅ |
| **Estimated / actual LOC** | ~50 / **120 insertions, 18 deletions** (50/18 production, 70/0 test) |

#### Leader decisions before dispatch

| Decision | Rationale |
| --- | --- |
| **Skills: `nestjs-expert`, `error-handling-patterns`, `tdd`** — no deviation | A contract-preserving refactor whose entire risk is error *ordering*; all three earn their place. |
| **Effort: `high`** (above the T2 `medium` default) | ~50 LOC, but this is the load-bearing ordering guarantee for the whole spec, and both plausible wrong implementations are subtle. |
| **Task order: T-04 before T-02/T-05** | User's call at the `gated` pause. T-04 is on the critical path and `tasks.md` §0 is explicit it must land **before** T-06; T-02's only gate is manual and needs a seeded DEV MySQL that is not currently established. |
| **Parallelism: none** | T-04 and T-05 both edit `bilateral.service.ts` — a genuine file conflict. T-02 is file-disjoint but environment-blocked. |

#### The change

The gate — formerly the **first statement inside** `validateTocAlignments` — became a
named private method `assertTocMappingVersionUnlocked(context)`
(`bilateral.service.ts:851-864`), invoked at the call site (`:685-687`) behind
`if (dto.toc_alignments)`, positioned **after** `normalizeLeverCodes` (`:671-675`)
and **before** the `tocUpserts` ternary (`:696`). That is exactly `design.md` §4
step 2.

The thrown shape is a character-for-character move: same `ConflictException`, same
`{ message: { description, code: 'toc_mapping_version_locked' } }` packing, same
`Number(context.report_year_id) !== MAPPABLE_LIVE_VERSION` comparison. Only the
*position* changed.

#### Tests added (additions only)

New `describe('R-BIL-130 — version gate vs Primary validation ordering (T-04)')` at
`bilateral.service.updateAlignment.tocAlignments.spec.ts:1015-1085`:

| AC | Test | Live version |
| --- | --- | --- |
| **AC.1** | `toc_alignments` present + non-2026 + no `primary_sp_code` ⇒ `409`, asserted on the actual `code`, with `transaction`/`upsertForSp`/`deactivateForSps`/`getTocResults` all uncalled | `report_year_id: 2025` |
| **AC.3** | legacy body (no `toc_alignments`) bypasses the gate and validates normally; `transaction` called once | `report_year_id: 2025` |
| **AC.4** | **`it.todo`** — named for T-06 to promote (see forward obligation below) | n/a |

#### Falsification — one red, one honestly declined

| Sabotage | Result |
| --- | --- |
| **Drop the `dto.toc_alignments` guard** (extract unconditionally) | **RED.** AC.3 failed with `Rejected to value: [ConflictException]`, and the *pre-existing* R-BIL-097 AC.3 legacy-body test at `:196` went red too — confirming the sabotage is real, not test-specific. Reverted. |
| **Leave the gate inside `validateTocAlignments`** | **Did NOT go red — reported honestly rather than fabricated.** With T-06 absent there is no step between design §4 step 2 and step 4, so "gate inside" and "gate extracted" are behaviourally indistinguishable for every input on this tree. |

> **The Reviewer independently confirmed this reasoning is correct**, and noted that
> `tasks.md` T-04 states the conditional itself: *"leaving the gate inside
> `validateTocAlignments` **while T-06 exists** makes AC.1 return `400` instead of
> `409`."* The non-falsification is a property of the current tree, not a gap in
> the work. The Implementer was explicitly briefed to state this plainly rather
> than manufacture a red, and did so.

#### Reviewer verdict (`opus`) — **`STATUS: PASS`**

Re-ran the gates independently rather than accepting the report: `npx eslint`
(exit 0), `npx jest` (11 suites, **170 passed / 1 todo**), `npx tsc -p
tsconfig.json --noEmit` clean, and `git diff --numstat` re-derived.

Rulings on the risks the Leader flagged in the brief:

1. **`toc_alignments: []` is handled identically.** An empty array is truthy in
   JS, so the gate fires under both the old inline check and the new call-site
   guard; `undefined`/`null` skip under both. **No input exists for which the two
   differ** — the extraction is provably behaviour-preserving on this tree.
2. **Narrowed param is safe.** `assertTocMappingVersionUnlocked(context: {
   report_year_id?: number | string })` is *wider* than the caller's actual source
   type (`result.repository.ts:25` -> `report_year_id?: number`); structural typing
   accepts it and `tsc --noEmit` confirms. Retaining `| string` preserves what the
   R-BIL-097 AC.1 driver-string test (`report_year_id: '2026'`, spec `:1001-1005`)
   pins.
3. **K-003 correction-closure sweep — clean.** Swept `src/` and `docs/specs/`
   (including the archived C1 spec) for `steps 2a`, `2a-2d`, `step "a"`, `§6.3`,
   `step 2[a-d]`. The renumbered citation *"design §6.3 steps 2b–2d"* is
   **correct** against the archived design's §6.3 (`a`=gate, `b`=structural,
   `c`=catalog, `d`=atomic 400). The only other letter citation —
   `archive/…/execution.md:204`, *"design §6.3 step 2c"* — cites the untouched
   archived design and remains correct. No stale cross-reference.
4. **Test nesting does not weaken the assertions.** Both new tests override
   `findContext` to `report_year_id: 2025` in their own body, so the T-08
   describe's inherited 2026 default cannot leak. **AC.3's
   `expect(transaction).toHaveBeenCalledTimes(1)` is not vacuous** — under the
   unconditional-extraction sabotage the legacy body throws, `resolves` fails, and
   the count is 0. It is a live falsifier today.
5. **AC.1 is discriminating.** `patchDto([sp01Yes()])` genuinely yields
   `toc_alignments` present + `has_contribution: true` + no `primary_sp_code`.
   Under a reordering defect the throw is a `BadRequestException`, failing
   `toBeInstanceOf(ConflictException)` before the code assertion is reached.
6. **Scope boundary clean.** All 5 `primary_sp` occurrences in the diff are
   comments or test titles forward-pointing at T-06. No `resolvePrimarySpCode`, no
   `primary_sp_code` field, no `sp_role`, no cascade change, no
   `normalizeLeverCodes` signature change (T-05 untouched).

#### FORWARD OBLIGATION — T-06 owes two things, not one

This is the single most important carry-forward from T-04. **Both** the Implementer
and the Reviewer independently arrived at it:

1. **Promote the `it.todo`** at spec `:1179-1184` into a real assertion — on a
   **2026** result, `primary_sp_required` still fires (R-BIL-130 AC.4). T-06 must
   *promote* it, not invent adjacent behaviour.
2. **Re-run the "leave the gate inside `validateTocAlignments`" sabotage once
   `resolvePrimarySpCode` exists, and confirm it now goes RED.** T-04's AC.1 test
   at spec `:1023` becomes discriminating only when T-06 lands. Until that
   re-check happens, **R-BIL-130's central claim — that the `409` still wins — is
   asserted but not falsified.** T-06's Reviewer must confirm both that AC.1 is
   still green *and* that the sabotage is now red. A green AC.1 alone does not
   discharge this.

#### ADVISORY (4R lens findings) — recorded, non-gating

1. **READABILITY.** `bilateral.service.ts:870-889` cites *"design §6.3 steps
   2b–2d"* but labels its own sub-list `a/b/c`. Before the change the local letters
   mapped 1:1 onto the design's `2a`–`2d`; now local `a` = design `2b`, so a reader
   cross-referencing *by letter* lands one step off. Cosmetic — the sentence above
   states the gate was extracted, so nothing is actually misleading. Keeping the
   local list as `b/c/d` would restore the correspondence.
2. **RISK (low).** The throw lives in `assertTocMappingVersionUnlocked` while the
   `dto.toc_alignments` trigger lives at the call site, so a **future second call
   site added without that guard** would silently break R-BIL-097 AC.3, and no
   existing test would catch it (AC.3 exercises only the current path). Mitigated
   by `private` + single call site + explicit docstring. Moving the guard inside
   would satisfy the requirement but hide the ordering `design.md` §4 deliberately
   makes visible, so the current split is the right trade. **T-06 and T-07 add
   steps around this call — carry this note into their briefs.**
3. **DOCS HYGIENE.** `requirements.md:383` and `tasks.md:195/197` still cite
   `bilateral.service.ts:867-876` as the gate's location; post-extraction those
   lines land inside the `validateTocAlignments` docstring. They are phrased as
   **pre-change baseline statements** (*"Today the version gate is…"*), so this is
   **not** a T-04 scope miss. **Sweep at `/akili-archive` time** — T-11's scope is
   `*.spec.ts` only and will not catch it.

#### Forward pointers — carry into the named task's brief

| Target task | Pointer |
| --- | --- |
| **T-06** | **(a)** Promote the AC.4 `it.todo` at spec `:1179-1184`. **(b)** Re-run the "gate left inside `validateTocAlignments`" sabotage and confirm it now goes RED — R-BIL-130 is asserted-but-unfalsified until then. **(c)** Insert `resolvePrimarySpCode` at design §4 **step 3** — after the extracted gate at `bilateral.service.ts:685-687`, before the `tocUpserts` ternary. **(d)** ADVISORY 2: do not add a second call site of `assertTocMappingVersionUnlocked` without the `dto.toc_alignments` guard. |
| **T-07** | ADVISORY 2 applies — you add step 4 logic around this call. |
| **T-11** | `:216` remains off-limits; block hash `94573605…` located by **content**. T-04 added its tests at `:1015-1085`, so the block is still at lines 216–250 and unshifted — but keep locating it by content. |
| **`/akili-archive`** | ADVISORY 3 — sweep the stale `bilateral.service.ts:867-876` gate-location citations in `requirements.md:383` and `tasks.md:195/197`. |

#### Constitution Impact

**None.** No new module, no module boundary moved, no public surface changed —
`assertTocMappingVersionUnlocked` is `private`. The HTTP contract is unchanged
(same status, same code, same envelope), so no Swagger obligation was triggered;
the Reviewer spot-checked `bilateral.controller.ts:219`'s 409 prose and confirmed
it remains accurate post-extraction. No CodeGraph re-index pending beyond the
normal end-of-spec sync.

#### Final verification result

✅ `npx jest src/domain/entities/bilateral --coverage=false` — 11 suites, **170 passed, 1 todo**
✅ `npm run build` — clean (nest + vite admin)
✅ `npx tsc -p tsconfig.json --noEmit` — clean (Reviewer, independently)
✅ `npx eslint` on both files — clean (**K-001**; `npm run lint` never cited)
✅ `git diff --numstat` on the spec file — **70 / 0**, zero deletions (R-BIL-130 AC.2)
✅ R-BIL-097 AC.2 block SHA still `94573605…`, matching T-01's artifact

---
