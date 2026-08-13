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
| Tasks completed | 16 | **3** (T-01, T-04, T-05) | > 19 |
| Insertions | ~2,575 | **334** | > 3,120 |
| Review rounds | 16 | **3** | > 20 |

No tripwire approached. T-05 came in at 93 insertions against a ~60 estimate
(+55%), again concentrated in test lines (78 of 93). Cumulative **334 of ~2,575
across 3 of 16 tasks** — about 13% of the insertion budget for 19% of the tasks,
so tracking slightly under. All three completed tasks passed on attempt 1 with
zero rework attempts consumed, against a budget of 16 review rounds for 16 tasks.

T-04 came in at 120 insertions against a ~50 estimate
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
| **T-07** | ~~T-01's cascade pins must still pass **unmodified**~~ — **SUPERSEDED 2026-08-13 by *Pivot Record: T-07* (user-approved).** The pins are red from T-06 and only **T-11** can make them green, so T-07 proves the same claim **structurally**: no deletions inside the pinned blocks **and** the `deactivateForSps` call site byte-identical. The pins live in **both** `bilateral.service.spec.ts` (`:610`, `:637`) and `...tocAlignments.spec.ts` (`:453+`). **R-BIL-125 AC.3 is discharged at T-11, not T-07.** |
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

### T-05 — `normalizeLeverCodes` returns its catalog instead of discarding it

| Field | Value |
| --- | --- |
| **Status** | ✅ **PASS** |
| **Date** | 2026-08-13 |
| **Implementer attempts** | **1** (of 3 permitted) |
| **Reviewer verdicts** | 1 × `PASS` |
| **Rework attempts consumed** | 0 |
| **Requirements covered** | enabling change for **R-BIL-122 AC.2** · **RA-02** |
| **Dependencies** | T-01 ✅ |
| **Estimated / actual LOC** | ~60 / **93 insertions, 4 deletions** (15/4 production, 78/0 test) |

#### Leader decisions before dispatch

| Decision | Rationale |
| --- | --- |
| **Skills: `nestjs-expert`, `tdd`** — no deviation | Signature widening plus a test-design problem; both earn their place. |
| **Effort: `medium`** — **deliberately lowered** from the `high` used on T-01 and T-04 | The code change is genuinely mechanical; the difficulty is entirely in the discriminating-fixture requirement, which is better addressed by emphasis in the brief than by a higher dial. Running every task at `high` dilutes the signal. **Calibration confirmed correct — PASS on attempt 1.** |
| **Parallelism: none** | T-02 is the only other eligible task and remains environment-blocked (no seeded DEV MySQL). |

#### The change

`normalizeLeverCodes` (`bilateral.service.ts:1339`) widened from `Promise<string[]>`
to `Promise<{ codes: string[]; validCodes: Set<string> }>`. The method **already
built** that `Set` internally and discarded it; this only stops the discard, so
T-06's `resolvePrimarySpCode` can validate `primary_sp_code` against the full
per-result catalog **without a second `getScienceProgramsForResult` call** —
which would otherwise fan out to `findPoolFundingAlignmentContext` +
`findActiveByAgreementId` + CLARISA on *every* PATCH.

Single call site (`:674`) destructures `const { codes: leverCodes } = …`, so
`leverCodes` keeps its old name and type and every downstream consumer —
`validateTocAlignments` (`:702`), `new Set(leverCodes)` for the R-BIL-093 cascade
(`:713`), `leverCodes.length` (`:758`), the SP-row map (`:760`), `lever_codes`
(`:805`) — is untouched.

#### `has_contribution === false` → `validCodes: new Set()`

The catalog is never fetched on that path (R-BIL-014), so an empty `Set` is the
honest value — it records *"no catalog was consulted"*, not *"the catalog is
empty"*.

**The Reviewer strengthened this analysis beyond the Implementer's claim:** on the
`has_contribution === true` path an empty `validCodes` is **unreachable** — empty
`codes` throws first, and non-empty `codes` against an empty catalog throws
`unknown_sp_codes`. So at the return statement, `validCodes.size === 0` ⟺
`has_contribution === false`. The footgun is **latent, not live**. But the
protection is **conventional, not structural** (`Set<string>` cannot distinguish
the two states, and `strictNullChecks: false` means a `| null` type would not be
enforced either) — see ADVISORY 1 and the T-06 forward pointer.

#### Falsification — precise, not blunt

Sabotage: changed **only the final return** to `return { codes, validCodes: new
Set(codes) }`, deliberately leaving the *internal* `validCodes` used by the
unknown-codes filter intact.

```
✕ T-05 — validCodes holds the full per-result catalog, not just the selected codes
  expect(result.validCodes.has('SP10')).toBe(true);
  Expected: true   Received: false
Tests: 1 failed, 5 passed, 6 total
```

All four pre-existing R-BIL-070 scenarios and the `has_contribution=false` test
stayed **green** under the sabotage — the fixture isolates the catalog-vs-selected
defect specifically rather than causing general breakage. Reverted.

**The Reviewer confirmed the isolation is faithful, not understated:** `validCodes
= new Set(codes)` is *exactly* the wrong implementation `tasks.md` T-05 names.
Sabotaging the internal `Set` instead would have broken the `unknown_sp_codes`
filter — a **different** defect, already covered by scenarios 2 and 4.

#### Discriminating fixture — the task's central disqualifier

`mappedSpResponse(['SP09','SP10'])` (spec `:64-78`) against `sp_codes: ['SP09']`:
catalog `{SP09, SP10}` **strictly exceeds** selected `{SP09}`, and the test asserts
`validCodes.has('SP10')` — a code valid for the result but absent from the
selection. Verified at source by the Reviewer.

This matters because T-05's disqualifier is explicit: a fixture where `sp_codes`
equals the catalog **cannot distinguish** the right implementation from the wrong
one, since the two collections coincide whenever every valid SP is selected.

| Test | Catalog | Selected | Discriminating? |
| --- | --- | --- | --- |
| R-BIL-070 scenario 1 (`:155`, untouched) | {SP09,SP10} | {SP09} | yes (pre-existing) |
| scenario 2 | {SP09,SP10} | {SP09,SP99} | n/a — 400 path |
| scenario 3 (`has_contribution=false`) | never fetched | ignored | n/a |
| scenario 4 (unmapped) | {} | {SP01} | n/a — 400 path |
| **T-05 catalog test** | **{SP09,SP10}** | **{SP09}** | **yes — SP10 is the surplus** |
| T-05 `has_contribution=false` | never fetched | ignored | asserts `size === 0` + zero fetches |

#### Reviewer verdict (`opus`) — **`STATUS: PASS`**

Re-ran every gate itself: `npx tsc -p tsconfig.json --noEmit` (exit 0), `npm run
build` (both stages), `npx eslint` (exit 0), `npx jest` (11 suites, **172 passed +
1 todo**), `git status --porcelain`.

Notable rulings:

1. **`codes` is provably byte-identical.** The Reviewer accounted for the entire
   `15/4` numstat across **six** edit sites (call-site comment, destructure, JSDoc,
   return annotation, both returns) and concluded there is **no room for a hidden
   edit**. The validation body appears as unchanged context under `git diff -U15`.
2. **The private-seam cast is precedented in this codebase** — the identical
   `as unknown as` idiom appears at `clarisa-projects.service.spec.ts:60`,
   `clarisa-cgiar-entities.service.spec.ts:52`, `reports.controller.spec.ts:112`,
   alongside widespread `service['privateMember']` access elsewhere. Not novel.
3. **It does not weaken the evidence, because two seams cover two halves:**
   `codes` is proven through the **public** `updateAlignment` path by the four
   pre-existing scenarios (a wrong destructure would make `leverCodes` undefined
   and blow up at `new Set(leverCodes)`), while `validCodes` — which has no public
   observable until T-06 — is proven at the private seam. Combined, no gap.
4. **K-002 covered on both halves.** `tsconfig.json` has no `include` and excludes
   only `node_modules`/`dist`/`vite.config.ts`, so `tsc --noEmit` type-checked the
   spec file too; server Jest uses ts-jest **without** `isolatedModules`, so specs
   are type-checked at test time as well. (Note: this is the *server* tier — the
   client tier's `isolatedModules: true` is what made K-002 bite.)
5. **K-003 sweep independently verified.** `Promise<string[]>` now has 2 hits in
   `src/`, both in `open-search/core/base-open-search-api.ts` and unrelated. Zero
   remaining for this method. No prose in `src/` or the archived C1 spec claims a
   `string[]` return.
6. **`:155` not re-based.** 78/0, zero deletions. The added
   `toHaveBeenCalledTimes(1)` lands at `:177`, *after* that block's existing
   assertions, leaving its claim and line number intact — and T-05's own done
   criterion ("assert the mock's call count is unchanged") makes that block its
   natural home. **Not a T-11 encroachment.**

#### ADVISORY (4R lens findings) — recorded, non-gating

1. **RELIABILITY — input for T-06's brief.** `validCodes: new Set()` on the
   `has_contribution === false` path is protected only by step ordering, and
   nothing *enforces* that T-06 keeps design §5.1 step 1 first. **Concrete
   suggestion, carried into T-06's forward pointer:** T-06 should pin the ordering
   *behaviourally* — one test sending `has_contribution: false` **with a garbage
   `primary_sp_code`**, asserting `resolvePrimarySpCode` still returns `null`
   without consulting `validCodes`. That makes a future re-order go **red** rather
   than silently produce `primary_sp_not_selected`.
2. **READABILITY.** `NormalizeLeverCodesSeam` is a hand-written duplicate reached
   through `as unknown as`, so it is **not** structurally tied to the real
   signature — a future widening would compile against a stale literal. Runtime
   value assertions still fail loudly, so exposure is limited to a misleading type.
   A derived alias is unavailable (indexed access on a `private` member errors), so
   the cheapest fix is **deletion, not derivation**: once T-06 makes `validCodes`
   observable through `updateAlignment`, re-point these two tests at the public
   seam and drop the local type.
3. **RISK — doc drift, outside T-05's file scope.** `design.md:212` and
   `judgment.md:80` still assert in the **present tense** that `normalizeLeverCodes`
   *"is `Promise<string[]>`"*. Both are records of superseded reasoning
   (`design.md:214` supplies the normative resolution two lines later), so this is
   **not** a K-003 breach — K-003 binds corrections, and editing spec docs is
   outside T-05's declared file list. Suggest a `(before T-05)` tense marker at
   T-11 or archive time. **Separately:** `design.md:216` says the signature change
   is *"listed in §2.1"*, but §2.1's `bilateral.service.ts` bullet (`:66`) names
   role resolution, persistence, read-back, ToC restriction and the extracted
   version gate — **not** the `normalizeLeverCodes` signature change. A
   pre-existing spec gap, worth one line at archive time.

#### Forward pointers — carry into the named task's brief

| Target task | Pointer |
| --- | --- |
| **T-06** | **(a)** `resolvePrimarySpCode` takes `validCodes` as a parameter — do **not** call `getScienceProgramsForResult` a second time (RA-02). **(b)** ADVISORY 1: pin the step-1-first ordering behaviourally with a `has_contribution: false` + garbage `primary_sp_code` test asserting `null` and no `validCodes` consult. **(c)** ADVISORY 2: once `validCodes` is observable through `updateAlignment`, re-point T-05's two private-seam tests at the public seam and delete `NormalizeLeverCodesSeam`. **(d)** T-04's obligations still stand — promote the AC.4 `it.todo` **and** re-run the "gate left in place" sabotage to confirm it now goes RED. |
| **T-11** | `normalizeLeverCodes.spec.ts:155` is **still un-re-based and still yours** — it PATCHes `has_contribution: true, sp_codes: ['SP09']` with no `primary_sp_code` and asserts `resolves.toBeDefined()`; it will receive `400 primary_sp_required` once T-06 lands. T-05 added an assertion at `:177` *after* that block without touching it. Scenarios 2 and 4 survive (`normalizeLeverCodes` runs first); scenario 3 is `has_contribution: false`. |
| **`/akili-archive`** | ADVISORY 3 — tense-mark `design.md:212` and `judgment.md:80`; fix `design.md:216`'s claim that the signature change is listed in §2.1 (it is not). |

#### Constitution Impact

**None.** `normalizeLeverCodes` is `private`; no module created or reshaped, no
public surface changed, no HTTP contract touched, no Swagger obligation.

#### Final verification result

✅ `npx jest src/domain/entities/bilateral --coverage=false` — 11 suites, **172 passed, 1 todo**
✅ `npm run build` — clean (nest + vite admin)
✅ `npx tsc -p tsconfig.json --noEmit` — clean (Reviewer, independently; covers the spec file too)
✅ `npx eslint` on both files — clean (**K-001**)
✅ `git diff --numstat` — spec **78 / 0** (zero deletions, `:155` intact), service **15 / 4**
✅ T-01/T-04 protected block still hashes `94573605…`

---

### T-02 — Migration: `sp_role` + generated column + unique index

| Field | Value |
| --- | --- |
| **Status** | 🟡 **`[~]` IN-PROGRESS — artifact authored and PASSed; DB invariant UNVERIFIED** |
| **Date** | 2026-08-13 |
| **Implementer attempts** | **2** (of 3 permitted) — attempt 2 reworks the probe package only |
| **Reviewer verdicts** | 1 × `PASS` (§A DDL + §C process) · **1 × `FAIL` (§B probe package — 5 issues, 3 destructive)** |
| **Rework attempts consumed** | **1** of 3 |
| **Requirements covered** | R-BIL-121 AC.3/AC.4 (**DDL authored, NOT proven**) · R-BIL-126 AC.1/AC.3/AC.5 · **NFR-BIL-120** |
| **Dependencies** | T-01 ✅ |
| **Estimated / actual LOC** | ~70 / **83** (one new migration file) |

#### ⚠ WHY THIS TASK IS `[~]` AND NOT `done`

T-02's own verification section says the manual migration run **"is the only gate that exists"**,
and its disqualifier is explicit that `migration:dev:execute` exiting `0` **is not** evidence the
invariant holds — **only the three direct-SQL probes are.**

**No database was touched.** The user's decision (2026-08-13): *"lo que debemos hacer es pasar los
cambios a la rama DEV y automáticamente se dispara el proceso de CI/CD"* — migrations reach DEV
through CI/CD on the DEV branch, **not** by hand from a developer machine. Running one manually
would mutate a shared team environment outside the deployment process.

**Consequence, stated plainly so nothing downstream misreads it:**

| Claim | Status |
| --- | --- |
| The migration file is correct by inspection, conforms to `design.md` §3.1, lints and builds | ✅ **PASS** (Reviewer, independently re-run) |
| `idx_rpfas_active_primary` rejects a second active `PRIMARY` (R-BIL-121 AC.3) | ❌ **UNVERIFIED** |
| The index permits **unlimited** active `CONTRIBUTING` rows (R-BIL-121 AC.4) | ❌ **UNVERIFIED** |
| Row count + checksum preserved over seeded data (NFR-BIL-120) | ❌ **UNVERIFIED** |
| An `is_read_only` legacy alignment is unmutated (R-BIL-126 AC.3) | ❌ **UNVERIFIED** |
| **The probe package below has itself been audited** | ❌ **UNAUDITED** — see the hold below |

**A CI/CD apply proves the DDL *runs*. It proves nothing about the invariant.** The plausible wrong
implementation (`CONCAT(alignment_id, ':', sp_role)`) applies perfectly cleanly and only then
silently rejects a second Contributing SP. That is precisely what Probe B exists to catch.

**Discharge path:** T-13 automates all three probes against the `TEST` datasource
(`ARI_TEST_MYSQL_*`, present in the `.env`). The manual package below is the interim check.

#### Environment note — why the pre-check first reported "no database"

`.env` is gitignored and lives in the **main checkout**
(`~/Development/alliance-research-indicators-main/server/researchindicators/.env`, branch
`star-monorepo`). It was never carried into the Orca worktree
(`~/orca/workspaces/.../AC-1676`, branch `JuankCadavid/AC-1676`), so every credential probe came
back empty and TypeORM fell back to `localhost:3306` → `ECONNREFUSED`. Resolved 2026-08-13 by
symlinking the main checkout's `.env` into the worktree (user-approved; confirmed gitignored at
`server/researchindicators/.gitignore:43`). This also exposes `ARI_TEST_MYSQL_*`, which **T-13**
will need.

#### The migration

`server/researchindicators/src/db/migrations/1786636994078-addSpRoleToAlignmentSp.ts` — scaffolded
via `npm run migration:empty` (**not** `migration:generate`, which diffs entity metadata, cannot
emit a `STORED GENERATED` column or its expression, and would silently drop the invariant).

`up()` is **character-identical** to `design.md` §3.1's normative block: one `ALTER` adding both
`sp_role varchar(20) NULL` and `active_primary_alignment bigint GENERATED ALWAYS AS (IF(is_active =
1 AND sp_role = 'PRIMARY', alignment_id, NULL)) STORED`, then a second adding
`UNIQUE INDEX idx_rpfas_active_primary`. `down()` drops index → generated column → `sp_role`.

#### Reviewer verdict (`opus`) — **`STATUS: PASS`**, scoped to the artifact

The Reviewer tabulated the generated column across every row shape, which is the clearest
statement of why the trap is avoided:

| Row | `is_active` | `sp_role` | Condition | `active_primary_alignment` |
| --- | --- | --- | --- | --- |
| active PRIMARY | 1 | `'PRIMARY'` | TRUE | `alignment_id` |
| active CONTRIBUTING | 1 | `'CONTRIBUTING'` | FALSE | `NULL` |
| inactive PRIMARY | 0 | `'PRIMARY'` | FALSE | `NULL` |
| legacy, active | 1 | `NULL` | `1 AND NULL` → NULL, else-branch | `NULL` |
| legacy, inactive | 0 | `NULL` | FALSE | `NULL` |

Only active-PRIMARY rows occupy the index; NULLs do not collide. R-BIL-121 AC.4 holds **by
construction**.

Other confirmed findings:
- **`1779190000014` really is the analogue** — it adds `active_result_id bigint GENERATED ALWAYS AS
  (IF(is_active = 1, result_id, NULL)) STORED` + a UNIQUE index. Identical shape. `1779190000015`'s
  `varchar(71)` is `CONCAT(result_id, ':', sp_code)` — a composite key, not applicable.
- **`id` is illegal *and* vacuous** as the key: MySQL 8 forbids `AUTO_INCREMENT` base columns in a
  generated expression, and `id` is already unique so a unique index over it would constrain nothing.
- **RA-10 is genuinely satisfied — one rebuild total.** `ADD COLUMN … STORED` is `ALGORITHM=COPY`;
  the subsequent `ADD UNIQUE INDEX` over an already-materialised STORED column is an ordinary
  secondary-index add (`ALGORITHM=INPLACE`), **not** a second rebuild.
- **No backfill ⇒ the index add cannot fail on pre-existing duplicates** — every row is `NULL` in the
  new column at that moment.
- **`updated_at`'s `ON UPDATE CURRENT_TIMESTAMP(6)` does not fire on an ALTER-TABLE rebuild**, so the
  audit columns and the checksum survive.
- **`down()` leaves no residue.** Generated-column-before-`sp_role` is *forced*
  (`ER_DEPENDENT_BY_GENERATED_COLUMN`); the FK `fk_rpfas_alignment` and both pre-existing indexes are
  untouched, and InnoDB could never have adopted the new index for the FK (different column).
- **`design.md` §11 item 3 cross-check:** this alters `result_pool_funding_alignment_sp`, **not**
  `result_pool_funding_toc_alignment`, so C1's R-BIL-118 AC.2 structural discharge is **not tripped**.
- **Scope clean:** `grep` for `sp_role|active_primary_alignment|idx_rpfas_active_primary` across
  `src/` returns nothing outside the migration. `synchronize: false` (`orm.config.ts:51`), and the
  only raw SQL against this table uses an explicit column list, so an added column breaks nothing.
- **K-001 honoured** — a Prettier error was fixed **by hand**, not `--fix`; `npx eslint` re-run clean
  by the Reviewer independently. `npm run build` clean, migration present in `dist/`.

#### ⛔ HOLD — the probe package is UNAUDITED, do not run it against shared DEV yet

The Reviewer's section B could not be completed: the package existed only in transient inter-agent
messages and was never delivered to it (a **routing** failure by the Leader, not a defect in the
Implementer's work — no rework attempt consumed). **Recording it here is the fix**: the package is
now durable and readable from disk.

**Undischarged items — all still open:**
1. Does **Probe A** fail on `idx_rpfas_active_primary` specifically, rather than on the FK
   `fk_rpfas_alignment` or a NOT NULL constraint? *(A probe that fails for the wrong reason looks
   like proof and is worthless.)*
2. Is **Probe B** genuinely the trap-catcher?
3. **Cleanup over-reach:** can `UPDATE … SET is_active = 1 … WHERE sp_role = 'PRIMARY' AND is_active
   = 0` resurrect a row that was already inactive before the probes ran?
4. **Session-variable hazard:** `@test_alignment_id` is session-scoped. If cleanup runs in a
   different connection it is `NULL` — does that silently no-op (leaving `ZZPROBE_*` rows in DEV) or
   match something dangerous?
5. Does the package discharge R-BIL-121 AC.3/AC.4 **as written**?
6. Is the R-BIL-126 AC.3 check actionable, or does it presuppose a pre-migration snapshot nobody took?

**One schema fact the Reviewer established that bears on item 3:** because there is **no backfill**,
no pre-existing row can have `sp_role = 'PRIMARY'` — but that protects the cleanup *only if* its
`WHERE` is genuinely conjunctive on `sp_role = 'PRIMARY'` **and** the setup touched only the one
promoted row.

#### DEFERRED VERIFICATION PACKAGE — v3, NOT YET RUN

v3 fixes four defects the Reviewer found in v2: (1) `SELECT … INTO` not NULLing
`@promoted_id` on a same-session restart, letting a stale row from a prior run
mask the migration's own guarantee behind a false FAIL; (2) a cleanup DELETE that
leaked `ZZPROBE_A` as an active PRIMARY exactly when something had already gone
wrong; (3) an undeclared two-mode step 7 whose guard blocked the safe,
literal-substituted path and redirected to re-derivation logic this package
exists to eliminate, plus a wrong `@promoted_id` substitution list; (4) four
`must_be_zero` assertions that are only valid before T-06 ships a real writer of
`sp_role`.

Column list confirmed from source: `created_at, created_by, updated_at, updated_by, is_active
(tinyint default 1), deleted_at, id (bigint PK AUTO_INCREMENT), alignment_id (bigint NOT NULL),
sp_code (varchar(50) NOT NULL)` + this migration's `sp_role` and generated
`active_primary_alignment`. `is_read_only` is **computed, not stored** — `bilateral.service.ts:576`,
`platform_code === 'PRMS' OR results.is_synced_to_prms = 1`, both on `results`, joined via
`result_pool_funding_alignment.result_id`.

```sql
-- ============================================================
-- RUN INSTRUCTIONS — READ BEFORE EXECUTING
-- ============================================================
-- Run this file INTERACTIVELY, statement-by-statement (pasted into a MySQL
-- client one block at a time), OR non-interactively with `mysql --force`.
-- Probe A (step 3) is EXPECTED to raise ERROR 1062 and execution MUST
-- CONTINUE past it. A plain `mysql < package.sql` (no --force) ABORTS on
-- the first error and never reaches cleanup (step 8) — leaving the
-- promoted row mutated in shared DEV.
--
-- If you already ran this non-interactively WITHOUT --force and it
-- stopped at Probe A: do NOT re-run from the top. Jump straight to
-- "PRE-CLEANUP IDENTITY CHECK" (step 7) and run cleanup (step 8) before
-- doing anything else.
--
-- OPEN GAP — NOT COVERED BY THIS PACKAGE: T-02 done-criterion 1
-- ("Forward + revert + forward all clean") has NO owner here. Migrations
-- reach DEV only through CI/CD; this package has no vehicle to run
-- down()/up() cycles against a shared environment. The R-BIL-126 AC.5 /
-- NFR-BIL-120 reversibility evidence remains an OPEN GAP, to be closed
-- elsewhere (e.g. T-13's automated probes against the TEST datasource),
-- not invented here.
--
-- ⏳ PRECONDITION — RUN THIS BEFORE T-06 REACHES DEV.
-- Every `must_be_zero` assertion below (steps 1, 8, 9) rests on "no writer has
-- ever written sp_role". T-06 (resolvePrimarySpCode) is that writer. Once it is
-- deployed to DEV, `sp_role IS NOT NULL` is legitimately non-zero and those four
-- assertions are INVALID — a non-zero result then means nothing. If T-06 has
-- already shipped to DEV, this package needs re-scoping before it is run.
--
-- NOTE — TRANSIENT MID-RUN STATE, DEV-ONLY. With the `>= 1` threshold (step 2),
-- the chosen alignment may hold exactly one active SP row. Between steps 5 and 8
-- that row is deactivated in-flight by Probe C/C2 before cleanup restores it —
-- anyone opening that alignment in STAR mid-run will see it with no active SP.
-- This is expected and self-heals at cleanup; it is not a bug.
--
-- ⚠⚠⚠ CRITICAL — THE NULL -> ERROR 1048 INVERSION ⚠⚠⚠
-- `@test_alignment_id` and `@promoted_id` are SESSION variables (step 2).
-- `SET @test_alignment_id = (SELECT … GROUP BY …)` silently returns NULL if no
-- alignment qualifies, OR in a fresh/reconnected session that never ran
-- step 2 on this connection. When `@test_alignment_id` is NULL,
-- `@promoted_id` is also NULL, and step 2's UPDATE `WHERE id = @promoted_id`
-- then matches 0 rows — `Query OK, 0 rows affected`, NO error, NO warning.
-- The promotion silently does not happen.
--
-- Every probe after that point is then inserting `alignment_id = NULL` into
-- a `bigint NOT NULL` column with no default. Under MySQL 8's default
-- STRICT_TRANS_TABLES this raises ERROR 1048 (23000): Column
-- 'alignment_id' cannot be null — BEFORE the FK and BEFORE the unique index
-- (idx_rpfas_active_primary) are ever consulted. This INVERTS the meaning
-- of every probe below, in BOTH directions:
--   * Probe A (step 3, expects 1062) ALSO errors under 1048 — a human
--     scanning "Probe A must fail => it failed => PASS" records a FALSE
--     PASS. The migration's central invariant gets certified by a NOT NULL
--     violation that never touched the unique index.
--   * Probe B (step 4, expects success) FAILS under 1048 — read as "the
--     trap is present and the DDL is wrong", a FALSE FAIL against a
--     migration already certified correct, which would send someone to
--     "fix" working DDL.
--   * Probes C / C2 (steps 5-6) fail the same way, for the same reason.
--
-- DISTINGUISHING THE TWO ERRORS IS THE WHOLE POINT:
--   1062 = the unique index fired (a real result).
--   1048 = the variable was NULL (the run is VOID — restart from step 2).
-- If ERROR 1048 appears anywhere in steps 3-6: STOP. Nothing below that
-- point is evidence of anything. Do not record a PASS or a FAIL from it.
-- ============================================================

-- ============================================================
-- 0. RUN AFTER up() migration lands, BEFORE any probe below
-- ============================================================

-- 1. BASELINE CAPTURE
SELECT COUNT(*) AS row_count FROM result_pool_funding_alignment_sp;

-- Order-independent checksum over (id, alignment_id, sp_code, is_active).
-- NOTE: this checksum is BLIND TO `sp_role` AND `updated_at` BY DESIGN —
-- both are columns the probes below write. "Identical at step 10" does NOT
-- by itself prove those two columns were restored; step 8's cleanup carries
-- its own sp_role-aware assertion for that reason.
SELECT SUM(CRC32(CONCAT_WS('|', id, alignment_id, sp_code, is_active))) AS checksum
FROM result_pool_funding_alignment_sp;

-- Expected: row_count > 0 (seeded DEV data — if 0, STOP: the run is
-- inconclusive per the task's own disqualifier, do not proceed to probes
-- until rows are seeded).

-- WHOLE-POPULATION "no backfill" PROOF. up() provably issues no DML (Reviewer
-- inspection of the migration file confirmed this), so both counts below
-- MUST already read 0 before any probe runs, over the ENTIRE table — not a
-- sample. This is what stands in for a pre-migration snapshot nobody is
-- instructed to take (see step 9's note for why one isn't obtainable here).
SELECT COUNT(*) AS must_be_zero FROM result_pool_funding_alignment_sp WHERE sp_role IS NOT NULL;
SELECT COUNT(*) AS must_be_zero FROM result_pool_funding_alignment_sp WHERE active_primary_alignment IS NOT NULL;

-- ============================================================
-- 2. SETUP — pick a seeded alignment with >=1 active SP row, and CAPTURE
--    THE PROMOTED ROW'S IDENTITY (id). Every later step targets @promoted_id
--    directly; none re-derive "the promoted row" by predicate. That is the
--    fix for §B FAIL issue 1: a predicate like `alignment_id = @test_alignment_id
--    AND sp_role = 'PRIMARY'` only ever meant "the promoted row" by the
--    timing coincidence that no backfill exists yet — it stops meaning that
--    the moment T-06 writes a real PRIMARY row, or a historically
--    deactivated one, onto the same alignment.
-- ============================================================
SET @test_alignment_id = (
  SELECT alignment_id FROM result_pool_funding_alignment_sp
  WHERE is_active = 1
  GROUP BY alignment_id
  LIMIT 1
);
-- No minimum group size is enforced: every GROUP BY group already has >= 1
-- row by definition, so a `HAVING COUNT(*) >= 1` here would be a tautology
-- (dropped). Only ONE active row is ever promoted (below), and Probe B
-- (step 4) creates its own CONTRIBUTING rows rather than requiring
-- pre-seeded ones — no minimum row count is needed, and this lets the
-- package run against more DEV seed shapes without weakening any probe.
SELECT @test_alignment_id AS chosen_alignment_id;
-- ⛔ If NULL: STOP. Run no further statement. Seed DEV, then restart at step 2.
-- ✅ If non-NULL: replace EVERY `@test_alignment_id` in steps 3-6 with the
--    literal number printed above before running them. A literal cannot be
--    lost across a reconnect, cannot be NULL, and makes each later statement
--    independently reviewable before it executes — this closes the NULL ->
--    ERROR 1048 inversion (see RUN INSTRUCTIONS above) and the lost-session
--    hazard together.

-- Promote ONE active row that holds NO existing role (AND sp_role IS NULL)
-- on that alignment to PRIMARY, and capture its id. The added `sp_role IS
-- NULL` makes it impossible to hijack a row that already holds a real role
-- — the mirror-image half of FAIL issue 1.
SET @promoted_id = NULL;   -- SELECT ... INTO leaves the prior value on 0 rows (warning 1329);
                           -- without this the ⛔ NULL guard below cannot fire on a same-session re-run.
SELECT id INTO @promoted_id
FROM result_pool_funding_alignment_sp
WHERE alignment_id = @test_alignment_id AND is_active = 1 AND sp_role IS NULL
ORDER BY id LIMIT 1;
SELECT @promoted_id AS promoted_row_id;
-- ⛔ If NULL: STOP. Every active row on this alignment already holds a role;
--    choose a different @test_alignment_id or seed a role-free active row
--    first, then restart at step 2.
-- ✅ If non-NULL: replace EVERY `@promoted_id` in the UPDATE immediately below
--    AND in steps 5, 7 and 8 with the literal number printed above before
--    running them, for the same reason as `@test_alignment_id` above — a
--    literal cannot be lost across a reconnect, cannot be NULL, and is
--    independently reviewable before it executes. (The UPDATE below runs in
--    this same block, so the window is tiny — substituting there too closes
--    it completely at zero cost.) Write both numbers down before continuing —
--    they are the only durable record of what this run must undo.

UPDATE result_pool_funding_alignment_sp
SET sp_role = 'PRIMARY'
WHERE id = @promoted_id;

-- ============================================================
-- 3. PROBE A — second active PRIMARY on the same alignment ⇒ MUST FAIL
-- ============================================================
INSERT INTO result_pool_funding_alignment_sp
  (alignment_id, sp_code, sp_role, is_active, created_at)
VALUES
  (@test_alignment_id, 'ZZPROBE_A', 'PRIMARY', 1, NOW(6));
-- EXPECTED: ERROR 1062 (23000): Duplicate entry '<alignment_id-value>' for key
--           'result_pool_funding_alignment_sp.idx_rpfas_active_primary'
-- (the exact duplicate-key value is @test_alignment_id's numeric value, since
-- that's what the generated column evaluates to for both the existing PRIMARY
-- row and this new insert attempt)
--
-- ⚠ THIS ERROR IS EXPECTED AND BY DESIGN — see RUN INSTRUCTIONS above.
-- Continue to Probe B; do not stop here.
-- ⚠ If this raises ERROR 1048 rather than 1062, `@test_alignment_id` is
--   NULL — see RUN INSTRUCTIONS; this is NOT a pass.

-- ============================================================
-- 4. PROBE B — three active CONTRIBUTING rows, same alignment ⇒ MUST SUCCEED
-- ============================================================
INSERT INTO result_pool_funding_alignment_sp
  (alignment_id, sp_code, sp_role, is_active, created_at)
VALUES
  (@test_alignment_id, 'ZZPROBE_B1', 'CONTRIBUTING', 1, NOW(6)),
  (@test_alignment_id, 'ZZPROBE_B2', 'CONTRIBUTING', 1, NOW(6)),
  (@test_alignment_id, 'ZZPROBE_B3', 'CONTRIBUTING', 1, NOW(6));
-- EXPECTED: Query OK, 3 rows affected. (This is the probe that catches the
-- trap in constraint 1 — if the expression's value ever incorporated
-- sp_role, e.g. CONCAT(alignment_id, ':', sp_role), a SECOND CONTRIBUTING row
-- would collide on a duplicate CONCAT value and this INSERT would fail
-- instead of succeeding.)
-- ⚠ If this fails with ERROR 1048 rather than succeeding,
--   `@test_alignment_id` is NULL — this is NOT trap detection and the DDL
--   is not implicated.

-- ============================================================
-- 5. PROBE C — deactivate the PRIMARY, insert a new active PRIMARY ⇒ MUST SUCCEED
-- ============================================================
UPDATE result_pool_funding_alignment_sp
SET is_active = 0
WHERE id = @promoted_id;

INSERT INTO result_pool_funding_alignment_sp
  (alignment_id, sp_code, sp_role, is_active, created_at)
VALUES
  (@test_alignment_id, 'ZZPROBE_C', 'PRIMARY', 1, NOW(6));
-- EXPECTED: Query OK, 1 row affected. (The deactivated row's generated column
-- is now NULL — is_active=0 fails the IF condition — so it no longer
-- occupies the unique slot; the new active PRIMARY row inserts cleanly.)

-- ============================================================
-- 6. PROBE C2 — AC.4 says the alignment can be re-saved ANY NUMBER of
--    times, not just once. Demonstrate the n>=2 shape: TWO inactive PRIMARY
--    rows coexisting with one active PRIMARY on the same alignment — the
--    exact shape a plain UNIQUE(result_id, is_active) could not survive
--    (see 1779190000014) ⇒ MUST SUCCEED
-- ============================================================
UPDATE result_pool_funding_alignment_sp SET is_active = 0 WHERE sp_code = 'ZZPROBE_C';
INSERT INTO result_pool_funding_alignment_sp
  (alignment_id, sp_code, sp_role, is_active, created_at)
VALUES (@test_alignment_id, 'ZZPROBE_C2', 'PRIMARY', 1, NOW(6));
-- EXPECTED: succeeds, leaving TWO inactive PRIMARY rows on this alignment
-- (@promoted_id and ZZPROBE_C) plus one active PRIMARY (ZZPROBE_C2).

-- ============================================================
-- 7. PRE-CLEANUP IDENTITY CHECK — refuse to run cleanup blind
-- ============================================================
-- @test_alignment_id and @promoted_id are SESSION variables. A lost or new
-- connection resets both to NULL, and `WHERE id = NULL` / `WHERE
-- alignment_id = NULL` evaluate to UNKNOWN — never TRUE. A cleanup run
-- blind in that state would match ZERO rows with NO error and NO warning,
-- while the DELETE in step 8 (keyed on literal sp_code values) still fires
-- and makes cleanup LOOK successful. This check is the fix for that.
--
-- WHICH MODE ARE YOU IN? Read the branch that applies to you.
--
-- (a) You did NOT substitute literals: ⛔ STOP if either value below is NULL —
--     the session was lost. The probe rows are still removable: step 8's DELETE
--     is literal-scoped and works regardless. But the two UPDATEs below will
--     silently match nothing. To finish by hand:
--       1. Run step 8's DELETE as written (it needs no variables).
--       2. Take the promoted_row_id you wrote down at step 2. If you did not
--          write it down, find it with:
--            SELECT id, alignment_id, sp_code, is_active, sp_role
--            FROM result_pool_funding_alignment_sp
--            WHERE sp_role = 'PRIMARY' AND sp_code NOT LIKE 'ZZPROBE%';
--          CONFIRM BY EYE that exactly one row is returned and that it is the
--          row you promoted. If zero or more than one, STOP and escalate — do
--          not guess.
--       3. Run step 8's two UPDATEs with that LITERAL id substituted for
--          @promoted_id.
--       4. Run the post-cleanup assertion; it must return 0.
--     NOTE: this is a HUMAN-VERIFIED LOOKUP, not a re-derivation the script
--     executes. A person confirms the row before anything writes to it. An
--     TWO earlier drafts had the script re-derive it automatically — v1's
--     cleanup UPDATEs (removed in v2) and v2's step-7 fallback (removed in
--     v3). That is the defect class this package was rewritten twice to
--     remove; do not reinstate it in any form.
--
-- (b) You DID substitute literals (the required path): steps 3-8 contain NO
--     session variables and this is only a SELF-CHECK — confirm the two numbers
--     you substituted match the ones printed at step 2, then run step 8. A NULL
--     below is EXPECTED and harmless in this mode; it does not block cleanup.
SELECT @test_alignment_id AS alignment_id, @promoted_id AS promoted_row_id;

-- ============================================================
-- 8. CLEANUP — delete exactly what steps 2-6 added/changed
-- ============================================================
-- ORDER IS LOAD-BEARING: this DELETE MUST run before the reactivation
-- UPDATE below. ZZPROBE_C2 is an ACTIVE PRIMARY row still holding the
-- unique slot (idx_rpfas_active_primary) for @test_alignment_id at this
-- point. Reactivating @promoted_id first — or reordering these statements
-- "for tidiness" — would attempt to create a SECOND active PRIMARY on the
-- same alignment and fail with 1062, leaving the promoted row deactivated.
-- Deleting ZZPROBE_C2 first frees the unique slot before anything else
-- claims it.
DELETE FROM result_pool_funding_alignment_sp
WHERE sp_code IN ('ZZPROBE_A', 'ZZPROBE_B1', 'ZZPROBE_B2', 'ZZPROBE_B3', 'ZZPROBE_C', 'ZZPROBE_C2');
-- `ZZPROBE_A` is included defensively: its INSERT is expected to be rejected,
-- but if Probe A ever succeeds (broken DDL, or a stale `@promoted_id`) the row
-- would otherwise persist as an active PRIMARY holding the unique slot.
-- Scoped only by the literal sp_code prefix, with no alignment predicate —
-- kept exactly as reviewed. This is the one cleanup statement that SURVIVES
-- a lost session, because it targets rows by their distinctive literal
-- values rather than by re-deriving identity from session state. The two
-- UPDATEs below now follow the same principle by targeting @promoted_id
-- directly instead of re-deriving it.

-- Undo Probe C/C2's deactivation of the ORIGINAL promoted row — scoped to
-- the CAPTURED id, never re-derived by predicate. The old predicate-based
-- `WHERE alignment_id = @test_alignment_id AND sp_role = 'PRIMARY' AND
-- is_active = 0` would match EVERY historically-deactivated PRIMARY row on
-- the alignment once real PRIMARY data exists (post-T-06) — not just this
-- probe's row — and would try to reactivate all of them in one UPDATE,
-- failing with 1062 (statement rolled back) and leaving the alignment with
-- NO active PRIMARY at all. `WHERE id = @promoted_id` can only ever match
-- the one row this session promoted, so that failure mode is now
-- structurally impossible.
UPDATE result_pool_funding_alignment_sp
SET is_active = 1
WHERE id = @promoted_id;

-- Undo the step-2 setup promotion, restoring the legacy NULL state — again
-- scoped to the captured id, never re-derived. The old
-- `WHERE alignment_id = @test_alignment_id AND sp_role = 'PRIMARY'` would
-- wipe the role from EVERY PRIMARY row on the alignment, including real
-- rows the probes never touched — unrecoverable loss of real data.
-- `WHERE id = @promoted_id` makes that impossible.
UPDATE result_pool_funding_alignment_sp
SET sp_role = NULL
WHERE id = @promoted_id;

-- POST-CLEANUP ASSERTION — tests the actual column the probes write, which
-- the step-10 checksum cannot (it is blind to sp_role by design; see step
-- 1's note). This closes the loop with a check that would fail loudly if
-- cleanup silently no-op'd under the lost-session scenario above.
SELECT COUNT(*) AS must_be_zero FROM result_pool_funding_alignment_sp WHERE sp_role IS NOT NULL;

-- ============================================================
-- 9. R-BIL-126 AC.3 CHECK — an is_read_only legacy alignment is unmutated
-- ============================================================
-- is_read_only is computed, not stored: platform_code = 'PRMS' OR is_synced_to_prms = 1,
-- both on `results`, joined via result_pool_funding_alignment.result_id.
-- (Join and predicate below are unchanged from the prior draft — verified
-- correct by the Reviewer; only the assertion shape changes.)
--
-- NO PRE-MIGRATION SNAPSHOT IS NEEDED OR TAKEN HERE: this package's own
-- header pins step 0 to run AFTER up() has already landed via CI/CD, and no
-- step anywhere instructs anyone to capture a baseline before that point —
-- once CI/CD applies the migration, the snapshot can no longer be taken.
-- Since up() provably issues no DML, the falsifiable, WHOLE-POPULATION
-- check is a COUNT, not a sampled diff (the previous `LIMIT 20` certified
-- nothing about the rows outside the sample, against R-BIL-126 AC.1's
-- whole-population claim). If a genuine row-for-row diff against a real
-- pre-migration snapshot is wanted, step 0 must be RESCHEDULED to run
-- BEFORE the CI/CD deploy and its output stored — that is a scheduling
-- change to when this package runs, not something retrofittable here.
SELECT COUNT(*) AS must_be_zero
FROM result_pool_funding_alignment_sp sp
JOIN result_pool_funding_alignment rpfa ON rpfa.id = sp.alignment_id
JOIN results r ON r.result_id = rpfa.result_id
WHERE (r.platform_code = 'PRMS' OR r.is_synced_to_prms = 1)
  AND sp.sp_role IS NOT NULL;
-- EXPECTED: 0 — no is_read_only-backing row carries a role, over the WHOLE
-- population. If non-zero, re-run without the COUNT wrapper to list the
-- offending rows before escalating.

-- ============================================================
-- 10. POST-MIGRATION RE-CHECK — must equal step 1 exactly
-- ============================================================
SELECT COUNT(*) AS row_count FROM result_pool_funding_alignment_sp;
SELECT SUM(CRC32(CONCAT_WS('|', id, alignment_id, sp_code, is_active))) AS checksum
FROM result_pool_funding_alignment_sp;
-- EXPECTED: identical to step 1's output for (id, alignment_id, sp_code,
-- is_active). This checksum is BLIND TO sp_role AND updated_at BY DESIGN —
-- see step 1's note and step 8's dedicated sp_role assertion. `updated_at`
-- on @promoted_id has PERMANENTLY CHANGED (ON UPDATE CURRENT_TIMESTAMP(6)
-- fired on promotion and again on restoration) — this single-row drift on
-- a shared DEV row is ACCEPTED and NOT restored; "identical" above refers
-- only to the four checksummed columns, not byte-identity of the row. The
-- AUTO_INCREMENT counter also advances by 6 and does not reset; cosmetic.
```

**Implementer's own caveat on the v1 package, verbatim — SUPERSEDED, retained as history:** *"The
`SET @test_alignment_id = (...)` setup query assumes at least one seeded alignment has ≥2 active SP
rows in DEV. If DEV's seed data doesn't satisfy that (e.g. only single-SP alignments), the person
running this package will need to seed one first — flagging this rather than guessing at DEV's
actual current contents, which I have no access to."*

> **⚠ Superseded twice — final state: there is NO `HAVING` clause at all.** v2 relaxed `>= 2` to
> `>= 1` (Reviewer advisory, GAP 3); **v3 then dropped the clause entirely**, because
> `HAVING COUNT(*) >= 1` is a **tautology** — every `GROUP BY` group has at least one row by
> definition. The rationale comment survives in the package; the clause does not. *(This note is
> itself a K-003 artefact: written at v2, it asserted `>= 1` as the live value and went stale one
> round later. Caught by the v3 re-grep, corrected here — the sweep has to be re-run after **every**
> round, not once.)* `>= 2` was stricter than the probes need — only **one**
> active row is ever promoted, and Probe B creates its own `CONTRIBUTING` rows rather than requiring
> pre-seeded ones. `>= 1` lets the package run against more DEV seed shapes **without weakening any
> probe**, and removes the needless "seed more data" detour the caveat above describes.
>
> **K-003 note.** The literal-string sweep for the superseded threshold found **two** stale sites,
> not one: this caveat (flagged by the Implementer, which correctly declined to edit outside its
> scope) **and** the step-2 SETUP comment header at the top of the SQL block, which **nobody named**.
> The third hit — `n>=2` in Probe C2's header — is a **different claim** (two *inactive* PRIMARY rows
> coexisting with one active, the R-BIL-121 AC.4 shape) and was correctly left unchanged. This is
> exactly the pattern K-003 exists for: a finding's cited-site list is a starting point, never the
> scope. Forward sweep run and re-grepped to confirm closure.

#### ADVISORY (4R lens findings) — recorded, non-gating

1. **RELIABILITY — `down()` asymmetry.** `down()` splits the two `DROP COLUMN`s into two `ALTER`s,
   causing **two** full rebuilds (dropping a STORED generated column is `ALGORITHM=COPY`, and
   dropping `sp_role` rebuilds again) — while `up()` combines its two `ADD COLUMN`s precisely to
   avoid that (RA-10). The file justifies the split on dependency order, which forces the *sequence*
   but not the *statement count*: `ALTER TABLE … DROP COLUMN active_primary_alignment, DROP COLUMN
   sp_role` is legal and rebuilds once. Not a spec violation — `design.md` §3.1 normatively specifies
   `up()` only — and low impact per `requirements.md` §1.1.
2. **READABILITY/RISK — a factual error in the reasoning, not the code.** The Implementer's claim
   that a separate index `ALTER` is *"unavoidable"* is **wrong** about MySQL: `ADD COLUMN … , ADD
   UNIQUE INDEX …` compose in one statement. The two-statement form is correct **because §3.1
   mandates it normatively**, not because MySQL requires it. Worth correcting before it propagates —
   this file's comment block is the closest thing the repo has to migration doctrine.
3. **RISK — collation note covers case but not padding.** `utf8mb4_unicode_520_ci` is also PAD SPACE,
   so `'PRIMARY  '` satisfies the condition too. Same safe direction as the case nuance (it *widens*
   what the index catches); one clause on the existing comment would close it.

#### Forward pointers

| Target | Pointer |
| --- | --- |
| **Whoever runs the probes on DEV** | **HOLD** — the package above is UNAUDITED. Get a B-only Reviewer verdict on items 1–6 first. It will run against a **shared** database. |
| **T-13** | Automates all three invariant probes against the `TEST` datasource — this is the real discharge path for R-BIL-121 AC.3/AC.4. `ARI_TEST_MYSQL_*` is present in the symlinked `.env`. |
| **T-03** | Depends on T-02's migration **existing**, not on it being verified. `sp_role` on the entity is T-03; **do not** map `active_primary_alignment` (TypeORM would try to write it). |
| **`/akili-archive`** | ADVISORY 2 — correct the "unavoidable" claim in the migration's comment block before it becomes doctrine. |

#### Constitution Impact

**None.** No module created or reshaped, no public surface changed. Schema-only, additive, nullable,
reversible. No CodeGraph re-index needed (migrations are excluded from the index).

#### Verification result

✅ `npx eslint` on the migration — clean (**K-001**; a Prettier error was fixed **by hand**, not `--fix`)
✅ `npm run build` — clean; migration compiled into `dist/db/migrations/`
✅ `git status` — exactly one new file under `src/db/migrations/`
✅ `up()` character-identical to `design.md` §3.1
❌ **Migration forward/revert/forward — NOT RUN** (CI/CD owns this)
❌ **Three direct-SQL invariant probes — NOT RUN**
❌ **Probe package itself — NOT AUDITED** (hold above)

---

#### 🔴 Attempt 1 — Reviewer §B verdict: **`STATUS: FAIL`** (probe package only)

Delivered after the §A/§C PASS, once the package was written to disk (the routing fix above). **The
FAIL is entirely on the SQL package; the migration file passes with zero findings and was NOT
re-opened** — reworking it would mean reworking the one artifact that is correct.

**Two items came back clean and are now closed:**

- **Probe A fails for the right reason (item 9) — CONFIRMED.** `@test_alignment_id` is drawn from
  `result_pool_funding_alignment_sp` itself, so it satisfies `fk_rpfas_alignment` **by
  construction** and the FK cannot fire. `sp_code` is supplied (9 chars into `varchar(50) NOT
  NULL`); `id`, `created_by`, `updated_by`, `deleted_at`, `updated_at` are safely omitted; and
  `active_primary_alignment` is **correctly** omitted — supplying a generated column raises
  `ER_NON_DEFAULT_VALUE_FOR_GENERATED_COLUMN`. **The only constraint that can fire is
  `idx_rpfas_active_primary`.** The expected `ERROR 1062` text is also correctly table-qualified for
  MySQL 8.0.19+.
- **Probe B is the trap-catcher, and the ONLY one (item 10) — CONFIRMED, and this is load-bearing.**
  Verified against the trap variant `CONCAT(alignment_id, ':', sp_role)`: **Probe A would still fail
  with 1062 under the trap** (both rows → `'<id>:PRIMARY'`), so **Probe A cannot discriminate**
  correct from trapped. Probe B's second row collides on `'<id>:CONTRIBUTING'` and the multi-row
  INSERT fails atomically → red. And nothing else catches it — under the trap the *migration itself
  still applies cleanly*, because every legacy row has `sp_role = NULL` ⇒ `CONCAT(...)` → `NULL`.

**FAIL issues — 5, of which 3 can damage real rows in shared DEV:**

| # | Issue | Violated rule | Remediation |
| --- | --- | --- | --- |
| **1** | **Cleanup `UPDATE`s re-find their target by predicate, not identity.** Step 2 promotes an *unidentified* row (`LIMIT 1`, no `ORDER BY`, `id` never captured); cleanup re-derives it as `sp_role = 'PRIMARY'`. Safe **only** because no backfill means no row carries a role — a timing coincidence, not a property of the SQL. The package is deferred with **no ordering constraint relative to T-06**, the task in this same spec that starts writing `'PRIMARY'` into DEV. Run it after T-06 reaches DEV on an alignment with one active + one or more historically deactivated PRIMARY rows — **exactly the state R-BIL-121 AC.4 declares legal** — and the resurrection `UPDATE` matches every historical inactive PRIMARY, fails 1062, and leaves the alignment with **no active Primary at all**; the final `UPDATE … SET sp_role = NULL` then wipes the role from **every** PRIMARY row on that alignment. Unrecoverable loss of real data. Step 2's promotion has the mirror flaw — it can overwrite a row that already holds a real role. | `tasks.md` T-02 Verification (lines 130–131, "against a **seeded DEV database**"); `requirements.md` §1.1 (line 255) *"the DEV rows are real enough to break"* | Capture identity: `SELECT id INTO @promoted_id … WHERE … AND sp_role IS NULL ORDER BY id LIMIT 1`, then scope **every** subsequent `UPDATE` as `WHERE id = @promoted_id`, dropping the `sp_role`/`is_active` predicates. The added `AND sp_role IS NULL` makes hijacking a real role impossible. |
| **2** | **A lost session silently degrades cleanup into a partial no-op.** `@test_alignment_id` is session-scoped; in a new connection it is `NULL`, and `WHERE alignment_id = NULL` is UNKNOWN — **both cleanup `UPDATE`s match zero rows, no error, no warning**. The `DELETE` still fires (keyed on `sp_code` literals), so the `ZZPROBE_*` rows vanish and cleanup *looks* successful. Residue: the promoted **real seeded row** is left `is_active = 0` **and** `sp_role = 'PRIMARY'`. This is the realistic failure mode for a human running the package across a reconnect. | `tasks.md` T-02 disqualifier (line 133); `requirements.md` R-BIL-126 AC.1 (line 265) | Refuse to run blind: `SELECT @test_alignment_id, @promoted_id;` with an explicit **⛔ STOP if either is NULL**, plus a re-derivation recipe. Close with `SELECT COUNT(*) AS must_be_zero … WHERE sp_role IS NOT NULL`. |
| **3** | **Probe A is designed to error, so `mysql < package.sql` aborts there and skips everything after — cleanup included.** The package carries no run instruction. A runner who pipes the file in gets: promoted row mutated, probes B and C never run, **cleanup never run**. | `tasks.md` T-02 Verification (line 131) + Done criteria (line 138) — all three probes required "including the expected failure", unreachable if execution aborts | Add a run header: run interactively statement-by-statement, or with `mysql --force`; state that Probe A **is expected** to raise 1062 and execution must continue past it; and if piped without `--force`, jump straight to cleanup. |
| **4** | **Step 7's AC.3 check presupposes a snapshot nobody is instructed to take**, and samples 20 rows instead of testing the population. The package pins step 1 to run **after** `up()` lands, migrations reach DEV only via CI/CD, and no step instructs anyone to capture a pre-migration baseline — so once CI/CD applies it, the snapshot can no longer be taken. `ORDER BY sp.id LIMIT 20` certifies nothing about the rest. *(The query's schema was otherwise verified correct — it faithfully reproduces the computed `is_read_only`.)* | `requirements.md` R-BIL-126 AC.1 (line 265), AC.3 (line 267); `tasks.md` T-02 Presence-assertion caveat (line 134) | No snapshot needed — `up()` provably issues no DML, so run **before any probe**: `SELECT COUNT(*) … WHERE sp_role IS NOT NULL` and `… WHERE active_primary_alignment IS NOT NULL`, both expected `0`. Whole-population, falsifiable. Keep the `is_read_only` join as the AC.3 slice but drop the `LIMIT`. |
| **5** | **Step 8's checksum is structurally blind to the mutations the package itself causes.** It covers `(id, alignment_id, sp_code, is_active)` — correct per the task — but the probes write **`sp_role`**, and each write bumps `updated_at` via `ON UPDATE CURRENT_TIMESTAMP(6)`. So step 8 can report "identical" while `updated_at` has permanently changed and, under issue 2, while `sp_role` is still wrong. | `tasks.md` T-02 Presence-assertion caveat (line 134) — a green check that structurally cannot observe the property it is offered as evidence for | State the blindness inline; add the `sp_role`-aware post-cleanup assertion from issue 2; acknowledge `updated_at` drift on one DEV row as accepted rather than implying byte-identity. |

**Item 12 — does the package discharge R-BIL-121 AC.3/AC.4 as written?**

- **AC.3 — YES.** Probe A discharges it, for the right reason.
- **AC.4 — PARTIALLY.** Probe C shows one deactivate→reinsert cycle, but AC.4 says *"any number of
  times"* and the package never produces the **n ≥ 2** shape: two inactive PRIMARY rows coexisting
  with one active. **That is precisely the failure mode this module already suffered** —
  `1779190000014` exists because a plain `UNIQUE(result_id, is_active)` collided on the *second*
  deactivated row. The generated-column idiom does handle it, but the package does not show it.
- **NOT COVERED AT ALL — and this gap has no owner anywhere:** T-02 done-criterion 1 (line 136),
  *"Forward + revert + forward all clean"*. The package has no vehicle for `migration:dev:execute` /
  `migration:revert` / re-execute, so the **R-BIL-126 AC.5 + NFR-BIL-120 reversibility evidence is
  currently unowned**. Understandable given CI/CD owns migrations, but recorded as an open gap
  rather than assumed covered.

**ADVISORY (probe package):** the cleanup `DELETE` is scoped only by `sp_code IN ('ZZPROBE_…')` with
no alignment scoping — safe given the distinctive prefix, and in fact **more robust than the
`UPDATE`s because it survives a lost session**. Worth keeping, and worth noting as the pattern the
two `UPDATE`s should have followed.


#### 🔴 Attempt 2 — Reviewer §B re-verdict on v2: **`STATUS: FAIL`** (4 new defects)

**All eight remediations from the first FAIL landed and landed correctly** — the Reviewer re-walked
each against the on-disk text and confirmed none is cosmetic. Confirmed working:

- Identity scoping (three statements key on `@promoted_id`; `AND sp_role IS NULL` closes the
  mirror-image hijack) — **the post-T-06 data-loss path is now structurally impossible**.
- The load-bearing DELETE-before-UPDATE comment, correctly re-pointed at `ZZPROBE_C2`.
- **`>= 1` is safe** — walked with an alignment holding exactly one active SP row: Probe A still
  collides (1062); **Probe B's trap-catching power comes entirely from rows it creates**, so
  pre-seeded CONTRIBUTING rows were never part of it. `>= 2` was pure friction.
- **Probe C2's n≥2 shape is correct and fully reversed by cleanup** — traced step by step; the
  promoted row ends `is_active = 1, sp_role = NULL`, exactly as it began.
- The K-003 sweep **did not over-correct** — `n>=2` in Probe C2's header is intact and still means
  "two inactive PRIMARY rows", and the superseded v1 caveat reads as history, not instruction.

**Four NEW defects introduced by the rewrite. Issues 1 and 2 compound.**

| # | Issue | Fix |
| --- | --- | --- |
| **1** | **`SELECT … INTO @promoted_id` leaves the variable UNCHANGED when no row matches** (MySQL warning **1329**), unlike `SET @x = (subquery)` which correctly yields `NULL`. The package tells the runner to *"STOP … restart at step 2"* **in the same session** — on that restart `@promoted_id` **retains the previous run's id**, so the ⛔ guard never fires. Chain: step 2 promotes a **stale row on a different alignment** → the new alignment's slot is free → **Probe A SUCCEEDS** → recorded as "the index did not fire" = a **false FAIL against a certified-correct migration** → cleanup then runs `is_active = 1` / `sp_role = NULL` against the stale row, **resurrecting it** if it was legitimately inactive. The v2 hazard reintroduced through a different door. Same defect in step 7's fallback re-derivation. | `SET @promoted_id = NULL;` immediately before **both** `SELECT … INTO` statements, with a comment naming warning 1329 |
| **2** | **Cleanup omits `ZZPROBE_A`** on the assumption Probe A always fails. It succeeds in exactly two cases — broken DDL, or issue 1's stale-variable path — and in both the row survives in shared DEV as an **active PRIMARY permanently occupying that alignment's unique slot**, silently breaking the next legitimate save with no trace of its origin. **A cleanup must be outcome-independent: it runs precisely when something went wrong, which is when residue is least acceptable.** | Add `'ZZPROBE_A'` to the DELETE list (no-op when absent, essential when present) + replace the justification comment |
| **3** | **Two mutually exclusive execution modes, neither declared — and step 7's guard fires a FALSE ⛔ STOP on the mode the package recommends.** A runner who substitutes literals correctly and then reconnects gets step 7 = `(NULL, NULL)` → *"do NOT run step 8"* — **even though step 8 now contains only literals, is immune to session loss, and is exactly what must run.** It then redirects to the predicate-based re-derivation the rewrite existed to remove. Mechanical root: a **wrong enumeration** — step 6 contains **no** `@promoted_id`, while step **7 does**, so the substitution list is wrong in both directions. | Correct the list to *"steps 5, 7 and 8"*; rewrite step 7 as a **substitution-aware self-check** (a NULL is EXPECTED and harmless in literal mode); add *"write both numbers down"* to step 2 |
| **4** | **Four `must_be_zero` assertions silently expire when T-06 reaches DEV.** All four assert that **no** row carries a role — legitimately non-zero once `resolvePrimarySpCode` ships, at which point the package **reports failure on a healthy database** and the runner cannot distinguish that from a real defect. v2 fixed the *destructive* half of the post-T-06 problem; the *assertion* half still assumes pre-T-06, and the package is deferred with no deadline. | A `⏳ PRECONDITION — RUN THIS BEFORE T-06 REACHES DEV` banner in the header, naming T-06 as the writer that invalidates the four assertions |

**ADVISORY (v2):** `HAVING COUNT(*) >= 1` is a **tautology** — every `GROUP BY` group has ≥1 row; the
clause could be dropped entirely (the rationale comment is the part worth keeping) · step 9's AC.3
check returns only a `COUNT`, giving no diagnostic on failure — append "re-run without the COUNT
wrapper before escalating" · the header says the `AUTO_INCREMENT` counter advances by 5; six INSERTs
are attempted and InnoDB allocates for the rejected `ZZPROBE_A` too, so it is **6** · with `>= 1` the
chosen alignment may hold exactly one active SP row, left deactivated in-flight — anyone opening that
result in STAR mid-run sees an alignment with no active SP (transient, DEV-only, worth one line).


#### ✅ Attempt 3 — Reviewer §B verdict on v3: **`STATUS: PASS`**

All four v2 defects correctly closed, each fix in the right place. **Full state trace from step 1 to
step 10 returns `@promoted_id`'s row to `is_active = 1, sp_role = NULL` — its exact starting state.**
Every executable hazard found across three review rounds is closed. **Safe for a human to run against
shared DEV**, on the required literal-substitution path.

**Adjudications the Reviewer confirmed:**

- **The Leader's brief contained a genuine contradiction, and the Implementer was right to flag it.**
  FIX 1 said guard *both* `SELECT … INTO` statements; FIX 3, in the same brief, **deleted the second
  one**. Exactly **one** survives (`:914`), with `SET @promoted_id = NULL;` immediately above it
  (`:912`). The other two occurrences of that string are in historical findings tables, not
  executable SQL. Applying FIX 3 as specified and FIX 1 to the survivor was correct on all counts.
- **The self-corrected placement error is genuinely absent.** Verified in file order: `SET … NULL`
  (`:912`) → `SELECT … INTO` (`:914-917`) → `SELECT … AS promoted_row_id` (`:918`) → promoting
  `UPDATE` (`:929-931`). The draft error — `SET … NULL` landing *between* the `SELECT … INTO` and the
  `UPDATE` — would have made the UPDATE match zero rows and silently skip the promotion. **The guard
  fires only when the `SELECT … INTO` genuinely found nothing.**
- **Dropping `HAVING` changes no behaviour** — semantically identical, `ONLY_FULL_GROUP_BY`-clean.
- **All 18 deletions attributed**, none orphaned. (A naive `grep '^-'` reports only 3 because 15
  deleted lines are SQL comments starting `--`; git's `--numstat` is authoritative.)

#### Post-PASS: all four ADVISORIES applied, using the Reviewer's verbatim text

**Leader decision, recorded because it bends a rule.** `/akili-execute` §2.4 says an advisory "is
recorded and dies there… you may not widen an existing task to absorb it." I applied these anyway.
Reasoning:

- **This is not scope growth into new work.** T-02's deliverable already *includes* the deferred
  verification package; these advisories improve that same artifact, mint no task, and add no
  requirement.
- **These are the most-vetted findings in the run, not the least** — three independent review rounds
  on one artifact. The rule's stated rationale (advisories are the weakest-evidenced findings) does
  not describe them.
- **The remediation text is the auditor's own**, applied verbatim, so `author ≠ auditor` holds for
  the content.
- **The artifact is SQL a human will run against a shared database.** The Reviewer confirmed the
  recovery gap is **real** — it classified it non-gating on *severity*, not on correctness, and
  explicitly invited the Leader to overrule that reading.

| Advisory | Applied |
| --- | --- |
| **1 — recovery gap (highest value)** | The ⛔ branch now carries a 4-step **human-verified** manual recovery recipe, with an explicit note that it is a lookup a person confirms — **not** a re-derivation the script executes — and a warning not to reinstate the automated version the package was rewritten twice to remove. |
| **2 — branch order** | Step 7 now opens *"WHICH MODE ARE YOU IN?"* and puts the **⛔ dangerous branch first**. Previously the reassuring *"a NULL is harmless"* line came first, so a skimmer could carry it into the mode where it is not. |
| **3 — `HAVING` residue** | The RUN INSTRUCTIONS illustration `SET @test_alignment_id = (SELECT … HAVING …)` corrected to `(SELECT … GROUP BY …)`. |
| **4 — substitution window** | Step 2's own `UPDATE … WHERE id = @promoted_id` added to the substitution instruction, closing the last window at zero cost. |

#### 🔁 K-003 again — and this time the stale site was the Leader's own correction note

The v3 re-grep for `HAVING` found **two** hits. One is the rationale comment (correct, intended to
survive). The other was the **Leader's own supersession note**, written at v2, asserting *"the
threshold is now `HAVING COUNT(*) >= 1`"* — **stale one round later**, once v3 dropped the clause
entirely.

A correction note that goes stale is still a stale site. Corrected in place, with the final state
recorded: **there is no `HAVING` clause at all.**

**The lesson, third occurrence in this spec:** the sweep must be re-run after **every** round, not
once per finding. K-003 has now failed 3× on C1, 4× in this spec's judgment rounds, and twice inside
T-02's own rework — the second time on text written *by the person running the sweep*.


#### ✅ Confirmation read on the Leader's post-PASS edits — **CLEAN, no findings**

The Leader authored four edits after the PASS and asked the Reviewer to confirm them rather than be
the last word on its own text. Verdict: **all four match intent, nothing lost in the reorder, residue
sweep clean.**

- **The Leader's one original sentence is historically correct.** *"…the defect this package was
  rewritten twice to remove"* — **"twice" holds**: predicate-based re-derivation appeared in two
  places, each removed by a separate rewrite (v1's cleanup `UPDATE`s → removed in v2; v2's step-7
  fallback → removed in v3). The Reviewer flagged one imprecision — *"an earlier draft"* read
  singular while *"twice"* referred to the **defect class** — noting the operative instruction was
  unambiguous regardless. **Tightened anyway** to name both drafts and both removals explicitly.
- **Reordered step 7 loses nothing.** Branch (a) carries the ⛔ STOP, all four recovery steps, the
  CONFIRM-BY-EYE gate, the escalate-on-zero-or-many rule and the HUMAN-VERIFIED-LOOKUP note; branch
  (b) still tells the substituted runner everything it needs. The preamble survives above both. **The
  dangerous branch now reads first — that is the fix.**
- **Residue sweep clean, and broader than the Leader's.** The Reviewer swept strings a `HAVING` grep
  would miss: `"5, 6 and 8"` → **zero hits** (v2's wrong substitution list fully gone);
  `"advances by 5"` → only inside the verbatim record of its own advisory, live text correctly reads
  6; `"LIMIT 20"` → only the comment explaining its removal plus the historical table; the v2 heading
  → gone. Live `HAVING` and `>= 2` hits are the two intended ones (the drop-rationale comment, and
  Probe C2's genuinely different `n>=2`).
- **On the Leader's partial overrule:** *"I think you read it correctly. I classified ADV 1 on
  severity, not correctness, and said so — the gap was real and I left the decision with you.
  Applying a one-paragraph fix to SQL a human runs against a shared database is the right call."*

### T-02 — final state

| Claim | Status |
| --- | --- |
| Migration artifact conforms to `design.md` §3.1; lints, builds, committed at `77f7e4f8` | ✅ **PASS** |
| Probe package is safe and correct for a human to run against shared DEV | ✅ **AUDITED** (3 rounds, 9 defects closed) |
| `idx_rpfas_active_primary` rejects a second active `PRIMARY` (R-BIL-121 AC.3) | ❌ **UNVERIFIED** |
| The index permits unlimited active `CONTRIBUTING` rows (R-BIL-121 AC.4) | ❌ **UNVERIFIED** |
| Row count + checksum preserved over seeded data (NFR-BIL-120) | ❌ **UNVERIFIED** |
| `is_read_only` legacy alignment unmutated (R-BIL-126 AC.3) | ❌ **UNVERIFIED** |
| Forward + revert + forward (T-02 done-criterion 1, R-BIL-126 AC.5) | ❌ **UNOWNED GAP** — no vehicle in this package; CI/CD owns migrations |

**Status `[~]` is correct and deliberate.** The audit certifies only that the SQL is **safe and
correct to execute** — never that the index behaves correctly. Per `tasks.md` line 138 that evidence
exists only once the probes run **and their verbatim output is recorded**.

**Two routes close it:** a human runs the v3 package against DEV **before T-06 ships** (the ⏳
PRECONDITION banner explains why that deadline is real), or **T-13** automates all three probes
against the `TEST` datasource — the durable path, and the one that survives future changes.

**⚠ T-06 ordering constraint, now load-bearing in two directions:** T-06 is the writer that
invalidates the package's four `must_be_zero` assertions. Whoever runs the manual probes must do so
**before** T-06 reaches DEV, or re-scope them first.

---

### 📍 Environment topology — corrected by the user, 2026-08-13

**Correction to a Leader error.** Earlier briefs and chat described the target database as
*"MELIA-DEV (AWS, us-east-1)"*. **That was wrong.** It was inferred from the AWS profile shown in the
user's **shell prompt** — the terminal's context, not this project's environment — and then repeated
as fact. The string never reached any committed file or commit body (swept and confirmed), so the
audit trail is clean of it; the error lived only in transient inter-agent briefs and chat.

**The actual topology, per the user:**

| Branch | Role | Where it runs |
| --- | --- | --- |
| `dev` | **testing** | **On-premise Alliance environment** |
| `staging` | staging | — |
| `main` | **production** | **Corporate AWS account** |

**Deployment model:** everything is triggered by **DevOps on pushes to these branches**. Nothing is
deployed by hand from a developer machine — which is the same constraint recorded throughout T-02
above, now with the correct topology behind it.

**What this changes for T-02, concretely:**

- The manual probe package would run against the **on-premise Alliance `dev` environment**, not an
  AWS RDS instance. Access and scheduling are a **DevOps/on-prem** question, not an AWS-console one.
- **"Shared DEV" is still exactly right** — the caution throughout this entry stands unchanged. If
  anything it hardens: an on-premise shared testing environment is the one every developer on this
  project is pointed at.
- The **⏳ PRECONDITION** stands unchanged: the probes must run **before T-06 reaches `dev`**, since
  T-06 writes `sp_role` and invalidates four `must_be_zero` assertions.
- **T-13's automated path is more attractive under this model, not less.** It runs against the
  `TEST` datasource (`ARI_TEST_MYSQL_*`) inside the test suite, so it needs no on-prem access, no
  DevOps scheduling window, and no branch promotion — and it re-runs on every future change instead
  of once.

**Bearing on RB-4 (`tasks.md` §7, the release constraint).** RB-4 requires PR 2b (server enforcement)
and PR 3 (client) to ship **in the same release**. Under branch-driven promotion that means the same
branch promotion — they must reach `dev`, then `staging`, then `main` **together**. A server that
requires `primary_sp_code` promoted ahead of the client that sends it breaks every save of this
section in whichever environment received it first. Recorded here because the mechanism (branch
promotion, DevOps-triggered) is now explicit where RB-4 states only the intent.

**Leader note on the error itself:** the fix is not just the correction. It is that an environment
fact inferred from a shell prompt should have been stated as an inference and checked, not asserted.
`docs/infrastructure.md` has **no `## Local Environment` section** — had one existed, the topology
would have been read rather than guessed. Recommending `/akili-constitution` Step 6B after this run.

---

### 🖥️ Local environment contract — stated by the user, 2026-08-13

This is the `## Local Environment` contract `docs/infrastructure.md` is missing, and whose absence
caused the topology error corrected above.

| Tier | Local story |
| --- | --- |
| **Client** (`client/research-indicators`) | Runs locally; **dockerizable** |
| **Server** (`server/researchindicators`) | Runs locally; **dockerizable** |
| **Database** | **No local MySQL.** Points at the **`dev` MySQL on the on-premise Alliance environment** |
| **Precondition** | **VPN must be connected** to reach that database |

**Pre-check for any environment-dependent verification** (`/akili-execute` Step 2.1): *is the VPN up,
and is the `dev` MySQL reachable?* If not, the check is blocked — and per `.agents/leader.md`
*"Deferring a check"*, that assumption must be **probed**, not assumed, before a task is parked.

#### What this unblocks

**T-03's `/swagger` visual check.** T-03 requires `primary_sp_code`, `role` (including `null`) and
the three new `400` codes to be **seen rendered** — its disqualifier is explicit that *"the
annotations are in the source" is not a substitute*, and that if the app cannot be started the
criterion is **unmet, not waived**. With VPN + the linked `.env`, the server boots and that criterion
becomes reachable.

#### ⚠ What this does NOT change — and the new risk it introduces

1. **The migration/probe story is unchanged.** Reaching the `dev` database from a laptop does not
   make hand-running migrations correct: promotion is DevOps-triggered by branch pushes. `dev` MySQL
   is **shared on-premise infrastructure**, and every caution recorded against the probe package
   still applies at full strength. **T-13 remains the better discharge path** — it needs no VPN, no
   shared-state access, and re-runs forever.
2. **🔴 NEW RISK — a local server pointed at shared `dev` MySQL WRITES to shared data.**
   `orm.config.ts` sets `synchronize: false` and `migrationsRun: false`, so **booting alone alters no
   schema** — that part is safe. But the app is fully live against real shared rows: any `PATCH`
   exercised locally (deliberately, or by a test click, or by the client's autosave) **mutates the
   same rows every other developer is using**. There is no local database to absorb mistakes.
   - For **T-03** this is acceptable: the criterion is *view `/swagger`*, which needs boot, not
     writes. **Boot, view, stop — exercise no mutating endpoint against `dev`.**
   - For any later task wanting a real round-trip, that is **T-13's** job against the `TEST`
     datasource (`ARI_TEST_MYSQL_*`, already in the linked `.env`), **not** a manual poke at `dev`.

**Recommendation:** promote this table into `docs/infrastructure.md` as a `## Local Environment`
section (`/akili-constitution` Step 6B). It is constitutional content — it belongs where the next
agent will read it, not only in one spec's audit trail. **Not done unilaterally: editing a
constitutional document is the user's call.**

---

### T-03 — Entity column, DTO fields, Swagger

| Field | Value |
| --- | --- |
| **Status** | ✅ **PASS** |
| **Date** | 2026-08-13 |
| **Implementer attempts** | **1** (of 3 permitted) |
| **Reviewer verdicts** | 1 × `PASS` |
| **Rework attempts consumed** | 0 |
| **Requirements covered** | R-BIL-120 (wire shape) · R-BIL-123 AC.3/AC.4 · **D-C2-1**, **D-C2-6**, **D-C2-12** |
| **Dependencies** | T-02 (artifact) ✅ |
| **Estimated / actual LOC** | ~45 / **176 insertions, 2 deletions** (61 production, 115 test) |

#### Leader decisions before dispatch

| Decision | Rationale |
| --- | --- |
| **Skills: `nestjs-expert`, `api-design-principles`** — no deviation | DTO/entity/Swagger surface work; both fit. |
| **Effort: `medium`** | ~45 LOC of declarations; the risk is the manual `/swagger` gate, addressed by emphasis rather than dial. **Calibration confirmed — PASS on attempt 1.** |
| **Environment pre-check RUN** (Step 2.1) | VPN up. `migration:show` (read-only) confirmed the `dev` MySQL reachable **and** that `AddSpRoleToAlignmentSp1786636994078` is **PENDING** — so `sp_role` does not exist in `dev`. Briefed as a hazard: once the entity declares it, any query through that repository fails `Unknown column 'sp_role'` — **expected, not a defect**. `/swagger` renders from decorators without querying, so the criterion stayed reachable. |
| **Database-safety rules in the brief** | Boot → view `/swagger` → stop. **No mutating endpoint against shared `dev`.** `synchronize: false` + `migrationsRun: false` mean booting alters no schema. |

#### The change

`sp_role` on the entity (`varchar(20)`, nullable, **no** `@OpenSearchProperty`, `active_primary_alignment`
**unmapped**); `primary_sp_code?: string` with `@IsOptional() @IsString() @MaxLength(50)` on the request
DTO; `role: 'PRIMARY' | 'CONTRIBUTING' | null` on `SelectedScienceProgramResponse`; the `400`
`@ApiResponse` description extended with the three new codes.

#### `/swagger` — the manual gate, discharged twice over

T-03's disqualifier is explicit that a green jest run proves nothing and *"the annotations are in the
source"* is not a substitute. Both sides went past eyeballing:

- **Implementer:** booted on `ARI_PORT=3099` (3001 was bound by an unrelated PID, left untouched) and
  fetched **`/swagger-json`** — the exact document the UI renders. Stopped the app; **no mutating
  endpoint fired**.
- **Reviewer:** did **not** take that on report — it **re-derived the schema offline** with
  `SchemaObjectFactory` + `ModelPropertiesAccessor`, **no boot, no DB, no port**, and reproduced it
  exactly.

Confirmed rendered: `role` → `{"type":"string","enum":["PRIMARY","CONTRIBUTING"],"nullable":true,…}`
**and present in the schema's `required` array**; `primary_sp_code` → `{"type":"string","maxLength":50,…}`
and **not** in `required`. That `enum` + `nullable` pair is precisely the failure the
Presence-assertion caveat says a source-read cannot catch.

#### Adjudications

**1. `tasks.md`'s file list for T-03 is imprecise — the Implementer was right to leave
`bilateral-science-programs.response.dto.ts` untouched.** `SelectedScienceProgramResponse` is
declared in `update-pool-funding-alignment.dto.ts:31` (Leader-verified), a file that **was** touched.
The unnamed file holds `BilateralScienceProgramItem` — the CLARISA catalog of SPs *assignable* to a
result, where **a role is not merely unspecified but meaningless**: a catalog SP belongs to no
alignment. The Reviewer traced the provenance: `proposal.md:111` lumps both DTO files under one row
("Role on input + output"); `tasks.md:156` inherited that coarse pre-design line; **`design.md` is
normative over the proposal** and resolves the output side to `SelectedScienceProgramResponse` alone.
The heading is literally *"Files touched (**intended**)"*. **Not a rework item — correct
`tasks.md:156` at archive time.**

**2. `role?:` TS-optional is correct, and T-08 cannot silently ship it un-populated.** R-BIL-123 AC.4
is a **Swagger-documentation** criterion and is discharged (verified above). The justification is
load-bearing and the Reviewer checked it rather than accepting it: `toSelectedSciencePrograms`
(`bilateral.service.ts:621-639`) builds its literal without `role`, so a TS-**required** field is a
hard compile error there — exactly the out-of-scope `bilateral.service.ts` edit T-03's scope boundary
forbids. **T-08 is forced to revisit it** because T-08's done criteria are **value** assertions, not
presence assertions (*"exactly one entry with `role: \"PRIMARY\"`"*, *"`role: null` on every entry"*,
*"Assert the value per `sp_code`"*) — and `undefined` fails both `'PRIMARY'` and `null`. The gate is
T-08's own test contract, not the type system.

**3. F-1 verified rather than assumed — with a bonus finding.** The Reviewer traced the mapping
generator (`base-open-search-api.ts:318` + `nestedType` recursion at `:348`): the only roots are
`ResultOpensearchDto`, `AgressoContractOpensearchDto`, `AllianceStaffOpensearchDto`, and
`ResultPoolFundingAlignmentSp` is reachable from none. **Consequence worth recording: the
*pre-existing* `@OpenSearchProperty` on `sp_code` (`:38`) is already inert** — which confirms F-1's
premise rather than merely satisfying it.

**4. The `400` description edit is strictly additive** — diffed **token-by-token** against
`git show HEAD:`, not by eye. All 7 pre-existing codes present in original order; the only unmatched
old token is `AC.6;` → `AC.6,`, a comma forced by appending `R-BIL-124`.

#### ADVISORY (4R) — recorded; one was a factual falsehood and was corrected

1. **🔴 RELIABILITY — a FALSE claim in the new spec file. Corrected by the Leader.** The block comment
   asserted it *"Runs the SAME ValidationPipe configuration the controller uses — **not a
   re-implementation** of it — so a drift in the controller's pipe options would also be caught
   here."* **It is a re-implementation** — an independent object literal. Deleting
   `forbidNonWhitelisted` from `bilateral.controller.ts:236` would leave every test in the block green
   **while the running app silently accepts unknown fields**, losing exactly the R-5′ loud-failure
   posture the comment claims to protect.
   > **Leader action, and the line drawn:** the comment was rewritten to state accurately what the
   > block does and does not guarantee, and to name both closure options (read the pipe off the
   > handler via `Reflect.getMetadata(PIPES_METADATA, …)`, or export one shared options const).
   > **The suggested mechanism was NOT implemented** — that would be scope growth an advisory may not
   > cause. **Correcting a falsehood is honesty maintenance; implementing an improvement is not.**
   > Re-verified after the edit: 11 suites, 178 passed + 1 todo; `npx eslint` exit 0.
2. **READABILITY.** `role`'s Swagger description opens *"Role not yet chosen — legacy rows only."*, so
   a consumer may read that as the meaning of `role` itself rather than of its `null` value.
   Conformant (`tasks.md:163` only requires the `null` case be documented "and what it means"), but a
   one-clause prefix would remove the misreading. **Not applied** — no falsehood, purely stylistic.
3. **RISK — a real branch-state hazard.** Between this commit and T-06/T-07 landing, `/swagger`
   advertises three `400` codes the server **cannot emit**, and accepts `primary_sp_code` while
   **ignoring it entirely**. This is spec-directed (T-03's Description assigns the Swagger text to
   this task), so it is not a defect — **but the branch must not ship to any consumer between T-03 and
   T-06.** Reinforces RB-4 and the PR 2a/2b sequencing.

#### Forward pointers

| Target | Pointer |
| --- | --- |
| **T-08** | **Drop the `?` from `role`** when wiring the `sp_roles` carrier. Today the OpenAPI schema says `role` is always present (it is in `required`) while the TS type still admits `undefined` — and **`JSON.stringify` drops `undefined`**, so any path T-08 misses omits `role` from the wire entirely instead of emitting `null`, contradicting the published schema. T-08's value assertions catch it; tightening the type makes it unrepresentable. |
| **T-06** | The conditional requirement for `primary_sp_code` is deferred here **by design** (D-C2-12) and owned by T-06 (`design.md` §5.1 step 2). The DTO's `@ApiPropertyOptional` description already carries the rule forward so it is not lost in the handoff. |
| **T-11** | `bilateral.controller.spec.ts` is in your re-base census (1 block). The corrected pipe comment above names two closure options for the drift gap — **fix it only if it falls inside your scope**; it is not a re-base item. |
| **`/akili-archive`** | Correct **`tasks.md:156`** — drop `bilateral-science-programs.response.dto.ts` from T-03's file list; the provenance is `proposal.md:111`'s coarse "Role on input + output" row, superseded by `design.md` §4. Also record that the pre-existing `@OpenSearchProperty` on `ResultPoolFundingAlignmentSp.sp_code` is **inert**. |
| **Release** | ADVISORY 3 — do not ship this branch to a consumer between T-03 and T-06. |

#### Constitution Impact

**None.** No module created or reshaped. The HTTP surface gains an optional request field and a
response field, both additive and documented — no new endpoint, no route/guard/pipe change, no
breaking change to the envelope.

#### Final verification result

✅ `npx jest src/domain/entities/bilateral --coverage=false` — 11 suites, **178 passed, 1 todo** (re-run by the Leader after the ADVISORY-1 comment fix)
✅ `npx eslint src/domain/entities/bilateral` — clean (**K-001**; Reviewer re-ran independently and confirmed no `--fix` mutation)
✅ `npm run build` — clean · `npx tsc -p tsconfig.build.json --noEmit` — clean (Reviewer)
✅ **`/swagger` visually confirmed** at `http://localhost:3099/swagger` + `/swagger-json`, and **independently re-derived offline** by the Reviewer
✅ Unknown-field rejection (`forbidNonWhitelisted`) asserted — pipe options verified to match the controller's
✅ No mutating endpoint fired against shared `dev`

---

### T-06 — `resolvePrimarySpCode` + role derivation + `sp_role` persistence

| Field | Value |
| --- | --- |
| **Status** | ✅ **PASS** |
| **Date** | 2026-08-13 |
| **Implementer attempts** | **1** (of 3 permitted) |
| **Reviewer verdicts** | 1 × `PASS` |
| **Rework attempts consumed** | 0 |
| **Requirements covered** | **R-BIL-120** AC.1–AC.4 · **R-BIL-121** AC.1/AC.2 · **R-BIL-122** AC.1–AC.4 · R-BIL-126 AC.4 · **R-BIL-130 AC.4** (promoted) · **D-C2-4**, **D-C2-15** · defect class **D-1** |
| **Dependencies** | T-03 ✅ · T-04 ✅ · T-05 ✅ |
| **Estimated / actual LOC** | ~220 / **489 insertions, 56 deletions** (111/3 production, 378/53 test) |

#### Leader decisions before dispatch

| Decision | Rationale |
| --- | --- |
| **Skills: `nestjs-expert`, `error-handling-patterns`, `tdd`** — no deviation | The task is an error-taxonomy problem as much as a logic one. |
| **Effort: `xhigh`** | Largest task in the spec; four distinct wrong implementations each needing its own red test; carries inherited obligations from two prior tasks. |
| **Pre-empted a file-list trap** | T-06's list names the SP repository, but it is a bare `Repository` subclass and the save goes through `manager.getRepository(...)`. Briefed: **verify first, leave it alone if untouched, do not invent a change to satisfy a list.** T-03 had already proved this spec's file lists imprecise. **Outcome: correctly untouched.** |

#### The implementation

`resolvePrimarySpCode(dto, effectiveSpCodes, validCodes): string | null` at `bilateral.service.ts:885+`,
called at `:700` — **after** T-04's version gate (`:689-691`), **before** `validateTocAlignments`
(`:706`), all **pre-transaction**. Role derived at the save site (`:784`):
`sp_role: spCode === primarySpCode ? 'PRIMARY' : 'CONTRIBUTING'`.

The five steps map 1:1 onto `design.md` §5.1. **Step 1 returns before `validCodes` is touched** —
the ordering T-05's ADVISORY 1 flagged as unenforceable by type, **now enforced by test**.

#### 🔬 The Reviewer mutation-tested the red suite — this is the finding that matters

The suite is **41 red**, all pre-existing blocks lacking `primary_sp_code`. Rather than spot-check
that claim, the Reviewer **proved** it: it neutralised `resolvePrimarySpCode` to `return null`
unconditionally (leaving the `sp_role` write active) and re-ran.

> **41 failures → 0.** The only remaining failures were T-06's own 10 new tests.

Two conclusions, neither obtainable by inspection:
1. **Every one of the 41 is caused solely by the missing `primary_sp_code`. None is a regression.**
2. **The `sp_role` field addition broke zero pre-existing tests** — an extra key in a
   `toHaveBeenCalledWith` row literal was the plausible hidden regression, and it did not materialise.

**The same experiment doubles as a mutation test of the new suite:** all 10 new/re-pointed tests
detect the neutralised implementation. **There is no tautological test in the added set.**

#### ✅ T-04's forward obligation — DISCHARGED, independently reproduced

Since T-04 landed, **R-BIL-130's central claim had been asserted but never falsified** — the sabotage
could not bite until `resolvePrimarySpCode` existed. The Reviewer **re-ran it itself** rather than
accept the Implementer's report: moved the gate back inside `validateTocAlignments`, ran `-t "R-BIL-130"`:

- **AC.1 → RED**: `Expected constructor: ConflictException / Received constructor: BadRequestException`
- **AC.3 → RED** as a bonus (the legacy-body bypass also breaks)
- **AC.4 → stays green**, correctly — on a 2026 result the gate is irrelevant

> **R-BIL-130 is now genuinely falsifiable and has been falsified under sabotage.** This was the
> longest-outstanding item in the run.

Working tree restored after every experiment — `bilateral.service.ts` SHA-256
`c5e61115b956b5cd887efc45463bccb2f62eda691f47757517ce3dbeb698f106`, numstat back to 111/3.

#### Other verified findings

- **Step 3 is load-bearing, proven by mutation.** Deleting the `validCodes.has` check turns **only**
  R-BIL-122 AC.2 red — exactly the claimed defect, nothing else. `normalizeLeverCodes` genuinely
  never inspects `primary_sp_code`.
- **The `unknown_sp_codes` payload is the real contract, not a lookalike** — the Reviewer diffed both
  throw sites and found them byte-identical in envelope, key, description string and array shape.
- **R-BIL-122 AC.4 — both halves of both assertions exist.** AC.1 asserts
  `primary_sp.code === 'primary_sp_not_selected'` **and** `unknown_sp_codes` undefined; AC.2 asserts
  the inverse. **Neither test can pass under the other's implementation.**
- **AC.1 asserts pairs, and R-BIL-126 AC.4 asserts the INVERTED pairing**
  (`SP06⇒CONTRIBUTING, SP09⇒PRIMARY`), so a "first row is always PRIMARY" implementation cannot pass
  both. Stronger than the done-criterion required.
- **Sabotage 3's asymmetry is correct isolation, not a weak test.** Removing `.trim()` leaves `""`
  falsy, so `""` stays green while `"   "` goes red. `""` discriminates the falsy-check; `"   "`
  discriminates the trim — two properties, two mutants. **A red `""` would have been the *less*
  informative outcome.**
- **Casing / collation — no divergence, no action.** `includes` (array) and `has` (Set) agree by
  construction: both operands are trimmed and case-preserved from the same call. `primary_sp_code:
  "sp06"` against `sp_codes: ["SP06"]` fails at step 3 as `unknown_sp_codes` — **identical to how
  `sp_codes: ["sp06"]` already behaves today**, so uniform with the shipped contract. The
  `utf8mb4_unicode_520_ci` case-insensitivity never bites, because only catalog-exact codes reach
  T-02's index.
- **T-05's obligations fully discharged.** `NormalizeLeverCodesSeam` and `callNormalizeLeverCodes`
  **deleted**; the `−46` is fully attributable (seam ~10 + helper ~11 + two old bodies ~25). The
  re-pointed test proves the original claim **harder** — catalog `{SP09,SP10}` ⊋ selected `{SP09}`,
  and under the wrong `validCodes = new Set(codes)` it goes red. `getScienceProgramsForResult` still
  called exactly once (RA-02 preserved).
- **Scope boundary held.** `primarySpCode` is consumed **only** at the `sp_role` derivation and is
  deliberately **not** threaded into `validateTocAlignments`. That is the correct T-06/T-07 line:
  **T-06 produces the resolved Primary, T-07 consumes it.** Wiring it early would have made T-07's
  rule untestable in isolation.

#### ⚠ Coverage — sound for THIS gate, but not a baseline

`npm run test:cov` (Reviewer re-ran): **83.08 / 73.28 / 84.29 / 83.02** — all four metrics ≥ 60%,
13–23 points clear. A red suite generally **under**-counts (throwing tests execute fewer lines), so
this is conservative and the ≥60% criterion is discharged.

> **🔴 Do NOT use these as T-11's comparison baseline.** T-11's criterion is stricter — *"no metric
> lower than before this task"* — and a delta against a **red-run** measurement is meaningless.
> **T-11 must take a fresh measurement once the suite is green.**

#### ADVISORY (4R) — recorded, non-gating

1. **RISK/READABILITY.** `resolvePrimarySpCode(dto, effectiveSpCodes, validCodes)` carries an unstated
   invariant — `validCodes ⊇ effectiveSpCodes` — true only because both come from the same
   `normalizeLeverCodes` call. Worth a one-line note on the signature.
2. **READABILITY.** `'PRIMARY'`/`'CONTRIBUTING'` are bare literals at `:784` while
   `update-pool-funding-alignment.dto.ts:79` already declares the union. **T-08 and T-10 will need the
   same two literals** — a shared `SpRole` union would make all three agree by type rather than
   convention. **Cheapest to introduce at T-08.**
3. **RELIABILITY — a trap for T-08/T-10.** T-06's describe sets
   `transaction.mockImplementation(async (cb) => cb(scopedManager))`, and the file's
   `jest.clearAllMocks()` clears calls but **not implementations** — so `scopedManager` leaks into
   every describe running after it in `bilateral.service.spec.ts`. Harmless today (verified), but
   `scopedManager` **throws on any unexpected entity**, and **T-08 and T-10 both add describes to this
   file**. A `transaction.mockReset()` in a scoped `afterEach` closes it.
4. **RESILIENCE.** `@MaxLength(50)` is evaluated pre-trim, so a 50-char code padded to 51 yields a
   class-validator error rather than `primary_sp_required`. Unreachable in practice (~4-char codes);
   noted so it is not rediscovered as a defect.

#### Forward pointers

| Target | Pointer |
| --- | --- |
| **T-07** | **(a)** Consume `primarySpCode` — T-06 deliberately did not thread it into `validateTocAlignments`. **(b)** See the **Pivot Record below** — T-07's done-criterion re: T-01's pins is unsatisfiable as written. **(c)** 37 of the 41 red blocks are in **T-07's own file** — do **not** re-base them (see Pivot Record §2). |
| **T-08** | ADVISORY 2 — introduce the shared `SpRole` union here. ADVISORY 3 — add `transaction.mockReset()`; `scopedManager` throws on unexpected entities and you are adding describes to that file. Also T-03's pointer: **drop the `?` from `role`**. |
| **T-10** | ADVISORY 3 applies equally — you also add describes to `bilateral.service.spec.ts`. |
| **T-11** | **Take a FRESH coverage measurement once green** — T-06's 83.08/73.28/84.29/83.02 is a red-suite figure and is not a valid baseline. The 41 red tests at `it`-granularity vs the design's "28 blocks" at `describe`-granularity are **not directly comparable** — reconcile using your own census granularity, and report the discrepancy rather than adopting either number silently (RB-6). |

#### Constitution Impact

**None.** No module created or reshaped, no public surface change beyond the already-declared T-03
fields. `resolvePrimarySpCode` is `private`.

#### Final verification result

✅ `npx jest src/domain/entities/bilateral` — 147 passed, **41 failed (all T-11-owned, proven by mutation)**
✅ `npm run test:cov` — **83.08 / 73.28 / 84.29 / 83.02**, all ≥ 60% (Reviewer re-ran independently)
✅ `npx eslint` — clean; `npx prettier --check` — clean; `npx tsc --noEmit` — clean (**K-001**: two Prettier issues fixed **by hand**, no `--fix`; zero collateral churn)
✅ `npm run build` — clean
✅ **:216 block SHA still `94573605…`** — additions only in that file
✅ All four T-06 sabotages **plus two Reviewer-devised extras** land on exactly their target tests

---

## Pivot Record: T-07 — done-criterion unsatisfiable as written (raised pre-emptively, before T-07 starts)

**Trigger.** Reviewer discovery during T-06's audit. **Not an implementation defect** — T-06 passed
with zero findings. This is a defect in the **approved `tasks.md`**, surfaced early enough to fix
before it costs a rework attempt.

**Status: awaiting user approval. `tasks.md` has NOT been amended.** The Pivot Protocol's literal
order is amend-then-approve; I have inverted it deliberately — `tasks.md` is approved scope and the
mode is `gated`, so changing it before the user has seen the reasoning would be the wrong risk to
take on a document the user owns. The exact proposed text is below, ready to apply.

### Problem 1 — the criterion the Leader raised

T-01's two cascade pins (`bilateral.service.spec.ts:610`, `:637`) are among T-06's 41 red tests —
they PATCH `has_contribution: true` with no `primary_sp_code`.

But **T-07's done-criteria require them green**: *"R-BIL-125 AC.3: removing an SP from `sp_codes`
still deactivates its ToC row — T-01's pins green"*, and T-07's verification says *"T-01's cascade
pins must still pass unmodified."*

**T-11, which re-bases them, depends on T-06 AND T-07 — so it runs after T-07.** As written, T-07
cannot discharge its own criterion.

**Reviewer's adjudication — the answer is "the criterion is mis-worded", and the spec contains its
own evidence:**

1. **T-07's operational check already permits the fix.** The verification line is *"`git diff` shows
   no deletions in the pinned blocks."* Adding `primary_sp_code` to a fixture is an **addition**. The
   English gloss ("pass unmodified") and the operationalisation disagree — and **the
   operationalisation is the one that actually detects the defect it targets**: a pin quietly gutted.
2. **The spec has a protected-block mechanism and deliberately did not apply it here.**
   `tocAlignments.spec.ts:216` is guarded three ways — "**OFF LIMITS**", an explicit *"adding
   `primary_sp_code` to that fixture is the D-8 defect, not a re-base"*, and a SHA-256 pin. **T-01's
   cascade pins carry none of that**, and T-11 lists `bilateral.service.spec.ts` at 13 re-base blocks
   with no carve-out. **The spec knows how to say "never touch this" and chose not to say it here.**
3. **The criterion is unsatisfiable for T-07 for the identical reason it was excused for T-06.** Both
   leave the suite red by design; T-11 is the single task that makes it green. Excusing T-06 while
   holding T-07 to a green-suite criterion is the inconsistency — **not the DAG**.

### Problem 2 — the sharper one, which the Leader did NOT raise

**37 of the 41 red blocks live in `tocAlignments.spec.ts` — T-07's OWN test file.** Those 37 are
T-11's to re-base.

So T-07 will work inside a file where its own `npx jest src/domain/entities/bilateral` verification
comes back red, **with 37 one-line fixes sitting right there**. That is a live invitation to silently
do T-11's job **without the mandatory assertion ledger** — **precisely the D-9 defect T-11 exists to
prevent**, and it would arrive looking like helpfulness.

### Proposed amendment — three edits to `tasks.md`, no requirement or design change

1. **T-07 done-criterion** (currently *"R-BIL-125 AC.3 … T-01's pins green"*) →
   > *"R-BIL-125 AC.3 — T-07 adds no cascade trigger: `git diff` shows **no deletions** inside T-01's
   > two pinned blocks, and **no change to the `deactivateForSps` call site**. The pins' green re-base
   > remains **T-11's**, exactly as for T-06. R-BIL-125 AC.3 is finally discharged at T-11, not here."*
2. **T-07 verification** — replace *"T-01's cascade pins must still pass unmodified"* with the
   no-deletions check **plus** a production-diff check that the cascade logic is byte-identical.
3. **T-07 scope boundary — add explicitly:**
   > *"**The suite is red when you start (41 blocks, T-06). That is expected.** 37 of them are in
   > `tocAlignments.spec.ts` — **your own file** — and they are **T-11's to re-base, not yours**.
   > Demonstrate your own tests green with a filtered run (`npx jest … -t "<your pattern>"`); do
   > **not** add `primary_sp_code` to any block you did not author. Re-basing them here would bypass
   > T-11's mandatory assertion ledger — the D-9 defect."*

**Also record:** R-BIL-125 AC.3 is discharged at **T-11**, not T-07.

### Why this is not scope growth
No requirement changes. No design decision is reversed. No task is added or removed. The amendment
**corrects a criterion that cannot be satisfied** and **makes an existing scope boundary explicit**
where the file layout actively invites crossing it. T-07 can still prove its real claim without a
green suite: structurally (cascade call site untouched) and behaviourally on its own fixtures —
`tocAlignments.spec.ts` already carries a cascade test T-07 owns and will supply a Primary to.

---

### ✅ Pivot Record: T-07 — AMENDMENT APPROVED AND APPLIED (2026-08-13)

User approved. All three edits applied to `tasks.md`. **No requirement changed, no design decision
reversed, no task added or removed.**

| # | Edit | Location |
| --- | --- | --- |
| 1 | Verification: *"T-01's cascade pins must still pass unmodified"* → **structural** proof (no deletions inside the pinned blocks **and** `deactivateForSps` call site + `effectiveSpCodes` filter byte-identical), plus a filtered-run convention and a before/after full-suite count | `tasks.md:323` |
| 2 | Done-criterion: *"R-BIL-125 AC.3 … T-01's pins green"* → **T-07 adds no cascade trigger**, proven structurally; **AC.3 finally discharged at T-11** | `tasks.md:338` |
| 3 | Scope boundary: explicit ⛔ that **37 of the ~41 red blocks are in T-07's own file and are T-11's**, with the D-9 rationale spelled out | `tasks.md:319` |

The header banner at `tasks.md:305` was flipped from *"awaiting user approval"* to **AMENDED — user-approved**.

#### 🔁 Correction Closure — the two-direction sweep found FOUR survivors the amendment never named

Per `/akili-specify` → *Correction Closure* and Kaizen **K-003**: grep the **literal superseded
string** forward, and grep references **to** the corrected sections backward. Both directions ran.

**Forward** (`"pins green"`, `"pass unmodified"`, `"pins must still pass"`):

| Site | Verdict |
| --- | --- |
| **`execution.md:250`** — T-01's forward-pointer table, *"T-01's cascade pins must still pass **unmodified**"* | **🔴 STALE AND ACTIVELY WRONG** — the pre-amendment instruction, aimed at T-07, in the very table T-07's brief is built from. **Nobody named this site.** Corrected with a `SUPERSEDED` marker + the structural replacement. |
| `tasks.md:479` — *"must pass unmodified"* for `:216` | ✅ **Different claim, correctly left.** That is the OFF-LIMITS R-BIL-097 AC.2 block, which genuinely must pass unmodified. |
| `execution.md:1805-1843` | ✅ History — the Pivot Record quoting the superseded text. Correct as-is. |
| `tasks.md:305/323/338` | ✅ The amendment itself. |

**Backward** (references *to* R-BIL-125 AC.3's discharge point) — **three incomplete indices, none named by the amendment:**

| Site | Fix |
| --- | --- |
| `requirements.md:575` — requirement index credited only *"T-01, T-07"* | Added **T-11 (AC.3 discharged — pins green)** and marked T-07's AC.3 as structural |
| `tasks.md:728` — §4 coverage matrix, same omission | Same correction; **T-11 added to the owning-task column** |
| `tasks.md:307` — T-07's *"Requirements covered: R-BIL-125 AC.1/AC.2/AC.3"* | Now reads **AC.1/AC.2 fully, AC.3 structurally only**, discharged at T-11 |

**Re-grepped to confirm closure.** The only surviving match is the corrected `requirements.md:575`
line itself, which contains the phrase as part of its *new* text.

> **This is K-003's fourth occurrence in this spec** (twice inside T-02's rework, once on the
> Leader's own supersession note, now once more) and the pattern is identical every time: **a
> finding's cited-site list is a starting point, never the scope.** Here the most dangerous survivor
> was in `execution.md` — the audit trail itself — where a superseded instruction would have been
> read straight into the next task's brief. The sweep is what caught it; the amendment's own citation
> list did not.

---
