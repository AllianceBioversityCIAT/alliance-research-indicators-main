# Execution Log — Innovation Use / Innovation Dev card details

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec id | `docs/specs/innovation-use/dev-card-details` |
| Linked tasks | [`./tasks.md`](./tasks.md) |
| Linked requirements | [`./requirements.md`](./requirements.md) |
| Linked design | [`./design.md`](./design.md) (revision 3) |
| Judgment ledger | [`./judgment.md`](./judgment.md) |
| Approval mode | **gated** (inherited from `proposal.md` — every continue/pause gate stops for the user) |
| Budget (`design.md` §13) | 10 tasks · ~820 LOC · ~14 review rounds |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Started | 2026-09-10 |
| Leader | Claude Code, Opus 5 (T1) |

### 1.1 Lane assignment (user ruling 2026-09-10, re-affirmed at this run's open)

| Lane | Tasks | Who |
| --- | --- | --- |
| server | T-01 … T-05 | This session's AKILI triad — `akili-implementer` (T2) → `akili-reviewer` (T3). **Never dispatched to Antigravity.** |
| client | T-06 … T-09 | **Antigravity**, via the `orchestration` skill. Reviewed here by `akili-reviewer` — which makes `author ≠ auditor` hold across *hosts*, not merely across models |
| human | T-10 | A person, at the HITL pause |

The ruling reads *"server tasks are worked directly in the main session"*. It is read as **"not farmed
out to another host"**, not as *"the Leader writes the code"* — the no-production-code rule and the
Reviewer's independence are constraints of this command that a lane assignment does not lift.

### 1.2 Lanes run SEQUENTIALLY, not concurrently — and `tasks.md` §2 is narrowed here

`tasks.md` §2 says the server lane and T-06…T-08 *"may proceed concurrently"*, qualified as safe **for
editing**. It is not safe for these tasks, because **every one of them verifies with a package-root
`npm test`**, and root `CLAUDE.md` §4.3 records the measured outcome: two workers running `npm test`
in the two packages simultaneously produced **phantom failures** in `excel-workbook.builder.spec.ts`
— re-measured in isolation at 2261/2261 green, after a worker had burned an hour chasing a defect it
had not caused. The same artifact failed the same way on 2026-08-14.

So: **server lane to completion, then the client lane.** This also matches §6's PR order (PR 1 server,
PR 2 client, PR 2 must not merge first) and costs nothing — T-09 was already blocked on T-04.

---

## 2. Pre-flight (Leader, before T-01 was dispatched)

| # | Check | Result |
| --- | --- | --- |
| P-1 | `OQ-3` — does geographic scope ship? (gated the start of T-01) | **RESOLVED — yes, it ships.** User, at this run's opening gate. Nothing leaves T-01/T-02/T-07/T-08; `DD-10` holds. `requirements.md` §10, `tasks.md` §7 and `RB-1` updated |
| P-2 | `OQ-1` — readiness format? (gated the start of T-06) | **RESOLVED — `Level 7 - <name>`,** ordinal + name joined. `DD-9` is settled, not provisional; T-06's acceptance table stands unchanged |
| P-3 | `RB-3` — does the `test:fixtures` tier execute at all? | **Closed, and the risk's premise was wrong in the spec's favour.** The tier holds **18** `*.fixture-spec.ts` files, **14** under `test/fixtures/innovation-use/` — it is this spec family's established gate, not an unrun one. `npm run test:fixtures -- --silent smoke.fixture-spec` → `Test Suites: 1 passed`, `Tests: 1 passed`, 0.556 s. That spec asserts a real `SELECT 1 AS ok` over an **initialized** TEST datasource, and `globalSetup` writes four catalog rows, so the tier demonstrably reaches the live `ari_scratch_test` scratch schema rather than compiling and exiting green |
| P-4 | `RB-2` — the security review `N-2` un-waived has no named reviewer | **Still open.** It gates the **merge of PR 1**, not the start of any task, so it does not block this run. Raised to the user at the first gate; recorded here so the merge cannot quietly proceed without it |
| P-5 | Working tree clean before T-01? | Yes — `git status --porcelain` empty at `11e3a28a`, before the P-1/P-2 spec edits |

**What P-3 does *not* establish:** that the tier can go **red for T-01's reason**. It establishes that
the tier runs and reaches a database. `DC-14`'s `getQuery()` assertion must still be observed failing
against the moved-predicate mutation named in T-01's falsifier (`K-004`, `KZ-014`) — that evidence is
owed by T-01 itself and is not discharged here.

---

## 3. Task Execution History

### T-01 — The shared read: `readInnovationDevCardFacts`, with `is_active` in the `ON` clause

| Field | Value |
| --- | --- |
| Status | *(in progress — see attempts below)* |
| Date | 2026-09-10 |
| Lane | server — `akili-implementer` (Sonnet, T2) → `akili-reviewer` (Opus, T3) |
| Requirements covered | `R-IUC-001`, `R-IUC-002`, `NFR-IUC-001` |
| Defect classes gated | `DC-14`, `DC-2` |
| Skills assigned | `nestjs-expert`, `error-handling-patterns` |

#### Attempt 1 — Reviewer `STATUS: FAIL` (1 issue)

**Files changed:** `result-innovation-use.service.ts` (+117: `Result` import, `InnovationDevCardFacts`
interface, private `readInnovationDevCardFacts`) · `result-innovation-use.service.spec.ts` (+281: a
`Result`-keyed QueryBuilder mock and 9 unit cases) · `test/fixtures/innovation-use/innovation-dev-card-facts.fixture-spec.ts`
(**new**, 440 lines, 10 cases against a real MySQL connection). **398 insertions, 0 deletions** —
purely additive, so the working tree at those ranges *was* the diff byte for byte, which is how the
Reviewer audited it without `Bash`.

**Implementer verification:** unit `359 suites / 2803 tests passed`; `npx eslint` clean; the new
fixture file `10 passed`. Falsifier (predicate moved from `ON` into `.where(...)`) produced
`Tests: 4 failed, 6 passed, 10 total`.

**Reviewer FAIL — the one issue, and it is a good one.** The cited red came from the **wrong
assertion**. AC.9 carried the behavioural half first:

```ts
// line 397 — Behavioural half: the parent row was NOT dropped.
expect(facts.description).toBe('AC.9 sentinel — no detail row.');
```

Jest aborts a test body at the first failed `expect`, so lines 399-435 — the `getQuerySpy` capture,
the `joinSegment` extraction, the `` `detail`.`is_active` `` match and the `whereClause` negative
assertion — **never executed under the mutation**. The pasted AC.9 red
(`Expected: "AC.9 sentinel — no detail row." / Received: null`) is line 397 throwing, which is
**AC.2's** criterion, listed separately in `tasks.md` T-01. So `DC-14`'s gate was *argued, not
measured* — and the fixture's own comment at `:376-378` asserted the unobserved red in prose, which
is `KZ-014`'s violation exactly ("if the red has not been seen, it may not be asserted — not in a
code comment"). Violated: `tasks.md` §5, T-01's own *"what disqualifies the evidence"*
(*"if the SQL assertion did not run in the fixtures tier, this task is **not** verified"*), root
`CLAUDE.md` §4.3.

**Leader adjudication:** in scope, and the fix is evidence-only — the Reviewer verified the
implementation itself as correct on all seven points it was asked to judge. Attempt 2 dispatched at
effort `xhigh` with remediation **(b)** mandated (split AC.9 into two `it` blocks) rather than the
cheaper (a) or a reorder: a reordered single block still cannot distinguish the two criteria by
failure line, and an assertion-ordering artifact has now hidden a gate in this repo twice.

#### Reviewer verdicts on the seven points it was asked to judge (attempt 1, all ✓)

| # | Point | Verdict |
| --- | --- | --- |
| 7 | T-02's scope untouched | ✓ `findOne` still returns exactly four sub-keys; the new method has **no caller in `src/`** |
| 4 | `[0] ?? null` on the `@OneToMany` | ✓ `ResultInnovationDev.result_id` is `@PrimaryColumn`, so §3.1's at-most-one argument holds as a schema fact; `?.[0] ?? null` also survives TypeORM leaving the relation `undefined` |
| 3 | Partial-null readiness not collapsed | ✓ `hasReadiness` uses `!== undefined && !== null` (never `??`); `level`/`name` each `?? null` independently. No `?? ''`, no `?? 0`. The two values without `?? null` (`geo_scope.code`, `readiness.id`) are non-nullable `@PrimaryColumn`s reached only inside truthy branches |
| 5 | `KZ-001` — property asserted in generated output | ✓ *"the strongest part of the diff"* — the unit block states in advance what it cannot prove and titles its AC.9 *"design-conformance only"*; the SQL property is asserted against a **spied-through, not replaced** `SelectQueryBuilder.prototype.getQuery` while `getOne()` really executes |
| 6 | `KZ-015` — transition, not end state | ✓ the fixtures tier inserts a real `is_active = 0` row and observes the parent survive |
| 2 | The DI-bypass deviation | ✓ **valid `DC-14` evidence.** SQL text is a pure function of the builder calls and the DataSource's entity metadata; `orm.config.ts:19-24` builds the *same* `entities` glob for both targets and the `switch` varies only connection credentials, so TEST metadata is identical to CORE. Nest's DI chooses *which* `DataSource` is injected and takes no part in query construction |
| — | `link-results.service.ts` untouched (T-05's guard) | ✓ independently confirmed |

#### `ADVISORY` (4R lenses, attempt 1) — recorded, never gating, and **not** convertible into tasks

Per `/akili-execute` §2.4 these are recorded and die here. None consumed a rework attempt. Items 2
and 3 below were folded into attempt 2 **only** because they are false claims the diff itself
introduced — the same class as the FAIL's own remediation — and that boundary was stated explicitly
in the rework brief.

1. **RELIABILITY / process — the `test:fixtures` tier is red overall, and §9's Done definition assumes it is green.** 5 pre-existing files fail with `Nest cannot create the ResultPolicyChangeModule instance ... imports array is undefined`. Baselined by the Implementer under `git stash` on clean HEAD; the Reviewer independently confirmed exactly **5** committed callers of `createInnovationUseHarness` (`innovation-use-section-round-trip`, `-role-isolation`, `-level-boundary`, `-edit-plus-add-id-collision`, `-catalog-order`), matching the failure count, and confirmed the cycle is real in the committed graph: `ResultPolicyChangeModule.imports[0]` is `LinkResultsModule` (`result-policy-change.module.ts:12-13`), `LinkResultsModule` imports `forwardRef(() => ResultsModule)` (`link-results.module.ts:11`), and `results.module.ts:58` imports `ResultPolicyChangeModule` back **without** a `forwardRef`. The reported error names index `[0]`, which is exactly `LinkResultsModule`. **Reachability verdict:** reachable under any ts-jest require order loading `ResultPolicyChangeModule` first; the Reviewer could not construct or execute the failing boot with read-only tools, and the app boots in production, so it manifests as a harness-order property, not a runtime one. **Owner: not this spec.** See `RB-6`. |
2. **READABILITY — a stale claim in the new unit-spec mock comment.** `result-innovation-use.service.spec.ts:57-58` says `getQuery` is included in the mock, but the literal at `:65-69` has only `leftJoinAndSelect`, `where`, `getOne`. Harmless (nothing reads it) but the comment contradicts its own file. **Folded into attempt 2.**
3. **READABILITY — the FP-45 band header does not describe the codes the file actually uses.** The header claims the file reserves `903_000` for `results.result_official_code`, but `nextOfficialCode()` returns `903_000_000_000 + Date.now()` ≈ 2.69 × 10¹². No collision risk and the monotonic-clock scheme is *better* than a fixed band — but FP-45's registry **is** these headers, so a future fixture will believe the wrong space is occupied. *(Left advisory — the private CLARISA ids `903_001`/`903_002`/`903_010` are in-band and accurate.)*
4. **RELIABILITY — fixture AC.7 is weaker than its siblings.** It asserts `typeof facts.geo_scope.name === 'string'` where AC.1 asserts exact equality on `code` and `name`. Suggested stronger-and-ownership-safe form: `SELECT name FROM clarisa_geo_scope WHERE code = 50` in `beforeAll` and assert against that. Also `Number(facts.geo_scope.code)` is an unnecessary coercion that only weakens the check, since AC.1's bare numeric `toEqual` on the same field passes.
5. **READABILITY — the fixture hand-copies the contract instead of importing it.** `readFacts`'s return type duplicates `InnovationDevCardFacts` structurally because the interface is not exported. Exporting it (T-04 needs a DTO from the same shape) would make the fixture fail to compile on contract drift instead of silently diverging behind an `as unknown as` cast. **Carried forward to T-04 as a forward pointer, not as new scope.**
6. **RISK — none found.** No migration, schema change, auth surface, new route, or payload logging; no DDL in the fixture (FP-51 clean); `afterAll` deletes only rows it created and leaves migration-seeded `clarisa_geo_scope` code 50 in place. `getRepository(Result)` is called from this new method only, so the spec's new `Result`-keyed mock branch cannot perturb a pre-existing path. Blast radius confined to an unreachable private method.

#### Attempt 2 — Reviewer `STATUS: FAIL` (1 issue, prose-only)

**Changed (evidence only):** AC.9 split into two independent `it` blocks — `… (DC-14 behavioural
half)` and `… (DC-14 SQL-shape half)`; the fixture's comments rewritten; the false `getQuery` claim
deleted from `result-innovation-use.service.spec.ts:57-58`. Fixture 440 → 472 lines, unit spec
281 → 280.

**Leader-verified before re-review:** `git diff --numstat` showed `result-innovation-use.service.ts`
still at **117 insertions / 0 deletions across the same three hunks** (`+10`, `+37,19`, `+645,97`) —
byte-identical to attempt 1's audited state, so no production code moved. The `ON`-clause form was
back (`'detail.is_active = :isActive'` inside the `leftJoinAndSelect` at `:711`, single
`.where('result.result_id = :resultId')` at `:716`).

**The red, now naming the right assertion:**

```
✕ AC.9 — the emitted SQL carries the is_active predicate in the JOIN ON clause, and NOT in the WHERE clause (DC-14 SQL-shape half)
    expect(received).toMatch(expected)
    Expected pattern: /`detail`\.`is_active`\s*=/i
    Received string:  "`result_innovation_dev` `detail` ON `detail`.`result_id`=`result`.`result_id`  "
      457 |       expect(joinSegment).toMatch(/`detail`\.`is_active`\s*=/i);
```

Restored GREEN `11 passed, 11 total`; unit `359 suites / 2803 tests`; `npx eslint` clean.

**Reviewer PASSED items 1, 3, 4 — and item 1 on a stronger ground than asked.** It did not merely
accept that separate `it` blocks cannot abort one another; it checked that the three assertions
*preceding* the load-bearing one **necessarily** hold under `S3` rather than happening to:
`toBeDefined()` and `joinStart > -1` depend only on the SQL containing `` `result_innovation_dev` ``,
and the `/\bON\b/i` match depends only on the `ON detail.result_id=result.result_id` predicate — `S3`
moves the `is_active` predicate but removes neither the `LEFT JOIN` nor its `result_id` `ON` clause.
So the first assertion that *can* fail under `S3` is the criterion's own. It also reconciled the
count: 11 = 1 `KZ-006` end-to-end + 8 AC + 2 AC.9 halves.

**Reviewer FAIL — the correction record overstates its own red.** Two sentences in the SQL-shape
docblock claimed the observed failure named the `` `detail`.`is_active` `` **and** `whereClause`
assertions. It named only one: under `S3` the `joinSegment` match at `:457` throws first and Jest
aborts *this* body too, so the `whereClause` negative assertion at `:467` never executed — it has
only ever been observed GREEN. **This is the intra-body version of the very masking defect the record
was written to document, restated as fact inside the record.** Violated: `CLAUDE.md` §4.3 /
`K-004` / `KZ-014` ("if the red has not been seen, it may not be asserted — not in a code comment")
and `KZ-007` (a correction record is the highest-risk artifact class — verify it, don't accept it).

**Leader adjudication.** In scope and correct — and it is worth recording that `KZ-007` predicted
this exact failure mode and the Reviewer caught it in the one artifact class the log flags as
highest-risk. Attempt 3 dispatched with the **exact replacement prose supplied verbatim** rather than
a description of the change: a third FAIL would trigger Step 4's automatic `git restore .` +
`git clean -fd`, and rolling back production code the Reviewer has already certified correct — over
the wording of a comment — is a trade I will not make blind. The brief explicitly forbids re-running
the falsifier, adding a third `it` block, adding another mutation, or touching any other file, each
of which the Reviewer named as a way to convert a wording fix into new scope on the last attempt.

> **Leader ruling, recorded in advance so it is not invented under pressure:** if attempt 3 is FAILed
> on further prose, I will **escalate to the user before executing Step 4's rollback**, not roll back
> automatically. The ceiling exists to stop wasted iteration on broken work; destroying a verified
> implementation over a comment is not what it is for, and the choice belongs to a human.

#### Attempt 3 — Reviewer `STATUS: PASS` ✅

**Changed:** two sentences in one docblock, nothing else. The falsifier-intent sentence now names
only the `` `detail`.`is_active` `` assertion on `joinSegment`; a new closing paragraph states
plainly that the `whereClause` negative assertion **has only ever been observed GREEN**, that under
`S3` the `joinSegment` assertion throws first and aborts the body, and that `whereClause` is
reachable as a red only under a *different, unrun* mutation — one that **adds** an
`.andWhere('detail.is_active = ...')` while **keeping** the `ON` clause.

**Leader note on authorship of the fix:** the replacement prose was supplied by me, verbatim, in the
dispatch brief. That was deliberate — a third FAIL would have triggered Step 4's automatic rollback,
and the failure mode being corrected was a *wording* one, where a paraphrase is exactly what had gone
wrong twice. It also means any residual defect in that prose was mine, and the re-review brief said
so, so the Reviewer was not auditing the Implementer for my sentence.

**Verification:** `git diff --numstat -- server/` unchanged at `280 0` / `117 0` (no production edit,
no unit-spec edit, no other file). `npx eslint` on the fixture: no output, exit 0.

**Reviewer PASS.** It verified all three claims **at source rather than from recollection**, and
cross-checked the record against this very log:

- The falsifier-intent sentence is correct against the mutation's mechanics: under `S3` the `LEFT JOIN` and its `result_id` `ON` predicate both survive, so the three preceding assertions still hold and the `` `detail`.`is_active` `` match is the **first assertion that can fail** — which is the red pasted in this file.
- All four claims in the new closing paragraph check out, including the counterfactual: the `.andWhere` variant *would* leave the `joinSegment` assertion green and redden `whereClause`, and this log claims no such run.
- The attempt-1 history paragraph is **accurate as history** — it is a claim about assertions that did **not** run, which is the opposite of the overstatement that was FAILed (that both *did* run and *did* redden). The Reviewer confirmed it matches this log's attempt-1 entry in substance.

> **Materiality, answered directly because the brief asked:** *"no residual overstatement is material
> to `DC-14`'s gate, and there is no unobserved red asserted anywhere in the file's prose — the one
> thing `KZ-014`/`K-004` forbid."*

**`ADVISORY` (attempt 3, non-gating, recorded only):** READABILITY — the trailing clause *"must
redden — not the behavioural block above"* is about which red **attributes** to this criterion, but
can be misread as *"the behavioural block stays green under `S3`"*, which is **false**: `tasks.md:101`
predicts both criteria redden under `S3`, as separate blocks. Nothing unobserved is asserted, so this
is wording, not a `KZ-014` breach. Suggested form if the file is ever touched again: *"…must redden;
that is the red this criterion is evidenced by, not the behavioural block's."* **Explicitly not worth
a fourth attempt** — the Reviewer said so itself, and §2.4 forbids converting an advisory into new
scope.

---

### T-01 — FINAL: `PASS` ✅ (3 Implementer attempts, 3 Reviewer verdicts: FAIL → FAIL → PASS)

| Field | Value |
| --- | --- |
| Status | **PASS** |
| Date | 2026-09-10 |
| Attempts | 3 (effort `high` → `xhigh` → `xhigh` with prose supplied verbatim) |
| Requirements covered | `R-IUC-001`, `R-IUC-002`, `NFR-IUC-001` |
| Defect classes gated | `DC-14` (emitted-SQL `ON` clause), `DC-2` |

**Final files:** `result-innovation-use.service.ts` (+117, 0 deletions — `Result` import,
`InnovationDevCardFacts` interface, private `readInnovationDevCardFacts`) ·
`result-innovation-use.service.spec.ts` (+280, 0 deletions — `Result`-keyed QueryBuilder mock, 9 unit
cases) · `test/fixtures/innovation-use/innovation-dev-card-facts.fixture-spec.ts` (**new**, 472
lines, 11 cases against a live MySQL connection).

**Final verification:**

| Gate | Result |
| --- | --- |
| Server unit — `npm test -- --silent` | `359 suites / 2803 tests passed`, 1 snapshot |
| Fixtures tier — this spec's file | `11 passed, 11 total` |
| `DC-14` gate observed **RED** for its own reason | ✅ `Expected pattern: /`detail`\.`is_active`\s*=/i` / `Received: "`result_innovation_dev` `detail` ON `detail`.`result_id`=`result`.`result_id`  "` |
| `npx eslint` (no `--fix`) | clean, all three files |
| `link-results.service.ts` untouched (T-05's guard) | ✅ confirmed twice, independently |

**All 9 acceptance criteria met.** AC.9 is the only one whose evidence lives exclusively in the
fixtures tier — by design, since `npm test` has `rootDir: "src"` and structurally cannot see emitted
SQL.

**Decisions made during T-01:**

1. **The fixture bypasses the Nest DI graph**, instantiating `ResultInnovationUseService` directly against the real TEST `DataSource`, because `nest-harness.ts`'s `createInnovationUseHarness` is broken by a pre-existing circular import (`RB-6`). The Reviewer accepted this as valid `DC-14` evidence on the reasoning that SQL text is a pure function of the builder calls and the DataSource's entity metadata, that `orm.config.ts` builds the **same** `entities` glob for both targets with the `switch` varying only credentials, and that Nest's DI decides only *which* `DataSource` is injected and takes no part in query construction. **Scope limit it introduces (`KZ-017`):** this fixture proves nothing about the production module graph resolving a `DataSource` into this service — that property belongs to `result-innovation-use.module.compile.spec.ts` and to T-02/T-04.
2. **`clarisa_geo_scope.code = 50` was missing** from the scratch schema despite its migration being recorded as applied. Restored via `INSERT IGNORE` in `beforeAll`, following the existing precedent in `innovation-use-result-creation.fixture-spec.ts`, and deliberately **not** deleted in `afterAll` — it is a shared catalog row this fixture does not own. Cause of the absence is unknown and was not investigated.
3. **AC.9 is two `it` blocks, not one.** Structural, not cosmetic: one shared body cannot distinguish, by failure line, which of two criteria reddened.

**Issues encountered:** both Reviewer FAILs were **evidence-integrity** findings, not implementation
defects — the production method passed all seven substantive checks on attempt 1 and did not change
across the three attempts (`117 insertions / 0 deletions`, same three hunks, verified by me at each
handoff). Both were the *same* failure mode at two levels: an assertion earlier in a Jest body
aborting the one that carries the criterion, and then that unobserved red being asserted in prose.
`KZ-007` names correction records as the highest-risk artifact class in a spec, and the second FAIL
was precisely that — a correction record overstating its own red.

**Constitution impact:** none. No new module, no moved boundary, no changed public surface — the new
method is `private` and has no caller in `src/` until T-02.
