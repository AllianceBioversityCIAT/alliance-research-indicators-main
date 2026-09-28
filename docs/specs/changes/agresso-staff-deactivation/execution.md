# Execution — Agresso / Staff Deactivation · Increment 1

- **Spec:** [`./tasks.md`](./tasks.md) · **Started:** 2026-09-16
- **Budget:** 5 tasks · ~850 LOC · 2 review rounds — **BREACHED at 1,657 LOC, see Budget tracking**
- **Status:** all 5 tasks PASS · **PAUSED 2026-09-16**, see [`HANDOFF.md`](./HANDOFF.md)

| Role | Host | Note |
| --- | --- | --- |
| Leader | Claude Code (`opus`) | Plan, adjudicate, audit trail, full-suite re-measurement |
| Implementer | Claude Code (T-01, T-02, T-04, T-05 wiring) · **Cursor** (T-03, T-05 fixture) | Codex excluded by user ruling 2026-09-16 |

> **`author ≠ auditor` is held per task, not per run.** Cursor authored T-03; the Leader audited it.
> The Leader authored T-04; **Cursor authors the fixture that falsifies it** (T-05), which is the
> check that matters most here — a zero-delta proof written by the author of the code under test is
> the weakest possible version of that gate.

---

## Host pre-flight (before planning against either)

| Host | Probe | Result |
| --- | --- | --- |
| Cursor | `cursor-agent --version`, then a live one-token prompt | **2026.09.10-fd3934a**, returned `PROBE_OK` |
| Scratch MySQL | `docker ps` | `research_indicators_server_test_mysql` up 23h — **RB-3 closed**. Not re-bootstrapped (FP-49: not idempotent) |

Probing past `--version` was deliberate: an auth check cannot see a billing state, which is how a
sibling host reported "logged in" while every request returned `402`.

---

## T-01 — email key util and shield predicate · **PASS**

**Implementer:** Claude Code · **Files:** `email-key.util.ts`, `email-key.util.spec.ts`, `sec-user-reconciler.service.ts` (delegate only)

| Gate | Result |
| --- | --- |
| `npx jest email-key.util.spec.ts` | **10/10 passed** |
| Reconciler suite, **unchanged** | **36/36 passed** — no test edited, which is what makes the move behaviour-preserving (K-019) |

**Mutation proof (K-004):** gating `shieldKeyFor` on the raw length — i.e. reintroducing
`isUsableEmail`'s semantics — turned the padded-email test **RED (1 failed)**. Restored, green.

**Root-cause confirmation, read from source before writing anything:** `isUsableEmail` tests
`email.length > MAX_EMAIL_LENGTH` at `sec-user-reconciler.service.ts:588` on the **untrimmed** value,
while `normalizeEmail` trims at `:594`. `JD-3` is reproduced in the code exactly as both judges
described it.

---

## T-02 — page count and fetch report · **PASS**

**Implementer:** Claude Code · **Files:** `agresso-staff-tools.service.ts` (+ spec), `dto/fetch-report.dto.ts`

| Gate | Result |
| --- | --- |
| `npx jest agresso-staff-tools.service.spec.ts` | **18/18 passed** |
| `npx tsc --noEmit` | clean |

**The existing suite wrote the site list, not a grep (K-018).** Exactly one test failed:
`should compute pages with round + remainder (1500 -> 3 calls)` — the test that **pinned the bug by
name**. Replacing it is the falsifier the design's reversion challenge predicted.

**Mutation proofs (K-004):**

| Mutation | Result |
| --- | --- |
| Restore `round + remainder` | **RED — 4 tests** |
| `distinctCarnets` → `allStaff.length` | **RED — 2 tests** |

**Leader-initiated correction during execution.** `R-AGD-004` AC.3 requires the C-2 abort to **list
the duplicated carnets**, and the first implementation reported counts only. That is not cosmetic:
the abort is permanent while the condition holds, and its *diagnosability* is the entire ground on
which the R-4 trade was accepted. `FetchReport.duplicatedCarnets` was added and wired into
`abortDetail`. Caught by re-reading the AC against the code, not by a gate — recorded as such.

---

## T-03 — read-only repository · **PASS**

**Implementer:** Cursor · **Files:** `sec-user-deactivation.repository.ts` (+ spec), `agresso-staff-tools.module.ts`

| Gate | Result (worker-reported, Leader-verified) |
| --- | --- |
| `npx jest sec-user-deactivation.repository.spec.ts` | **16/16 passed** |
| `npx eslint` | clean |
| `npx tsc --noEmit` | clean |

**Mutation proofs, reported by the worker:**

| Mutation | Red test |
| --- | --- |
| Drop `AND deleted_at IS NULL` | `emits both active and non-deleted predicates in the status SQL` |
| Remove chunking | `chunks 120 candidate ids into exactly three CHUNK-sized queries` (expected 3 calls, got 1) |

**Leader audit of the diff:**
- Write-verb scan over the file: **no `UPDATE` / `INSERT` / `DELETE` / `transaction`** — the
  increment's central constraint holds structurally.
- Constructor takes `EntityManager` only. No `AppConfigService`, no `CurrentUserUtil`,
  no `AppSecretRepository` — `NFR-AGD-005` satisfied, and the `mapping-phase.resolver.ts:11-15`
  prohibition respected.
- Coercions present on every branched column.

**One finding recorded, not blocking.** `findActiveSystemAdminUserIds` filters `role_id = 1 AND
is_active = 1` **in SQL and again in memory**. That is the sibling Kaizen **P1** shape: the
in-memory filter shadows the SQL one, so deleting the SQL predicate leaves the unit suite green. The
SQL side is therefore **not falsifiable at the unit tier** and its proof is deferred to T-05's
fixture, which is where `tasks.md` T-03 already routed it. No change requested.

---

## T-04 — shields, exclusions, preconditions · **PASS**

**Implementer:** Claude Code · **Files:** `sec-user-deactivation.service.ts` (+ spec)

| Gate | Result |
| --- | --- |
| `npx jest sec-user-deactivation.service.spec.ts` | **21/21 passed** |
| `npx tsc --noEmit` | clean |

**All five mutations `tasks.md` mandates, each observed RED (K-004):**

| # | Mutation | Red |
| --- | --- | --- |
| M1 | `shieldKeyFor` → `isUsableEmail` semantics (`JD-3`) | 1 test |
| M2 | distinct carnets → row count (`JD-1`) | 1 test |
| M3 | EX-3 counts inactive rows (`F-10`) | 3 tests |
| M4 | drop the last-page exemption (`JS-5`) | 1 test |
| M5 | shields built after validation, not from the raw payload (`F-8`) | 13 tests |

---

## T-05 — summary, wiring, fixture · **PASS**

**Wiring (Claude Code): complete.** Summary DTO extended with 11 measurement fields plus two
optional abort fields; stage 5 wired after `applyCreateAndGrant`; service registered in
`AgressoStaffModule`; reconciler exposes its `sec_users` snapshot (`DD-D4`), so the measurement
performs no second read and opens no TOCTOU window.

**The sibling's exhaustive-field test was extended, not loosened.** `sec-user-reconciler.service
.spec.ts` asserts the summary's complete key set; the 11 new keys were added to that list. Relaxing
the assertion would have been the cheaper fix and would have destroyed the property that makes the
test worth having.

**Fixture (Cursor): delivered and Leader-verified.** `test/fixtures/agresso-staff-deactivation
.fixture-spec.ts`, 1 test, green. It asserts a **non-zero candidate count before** the zero-delta
comparison, and compares both `rowCount` **and** `SUM(is_active)` across `sec_users`,
`sec_user_roles` and `app_secrets`.

**The no-write gate was proven red by the Leader, not only by its author.** This is the increment's
central safety claim, so it was not accepted on the implementer's report: injecting one
`UPDATE sec_users SET is_active = 0 WHERE sec_user_id = 9050501` into `measureOrThrow` turned the
fixture **RED** at `expect(after.secUsers.activeSum).toBe(before.secUsers.activeSum)` —
`Expected: 1, Received: 0` — matching the worker's reported message exactly. Reverted; green.

> **A first attempt at this proof produced a meaningless green and was discarded.** A failed `cd`
> left the target path empty, so no mutation was ever applied and the fixture passed for the wrong
> reason. Recorded because it is the same class the gate itself defends against: a green that
> measured nothing. The mutation's presence in the source was verified by grep before the run was
> trusted the second time.

**It also closes T-03's deferred SQL claim** — the belt-and-braces predicate that the unit tier
structurally could not falsify (sibling Kaizen **P1**). The fixture seeds a second, soft-deleted
`External` row against real MySQL and asserts resolution still returns exactly one.

---

## Leader full-suite re-measurement

Run in the window **after** the worker reported and with none active — per the concurrency rule, two
concurrent full-suite runs produce wrong results, not merely slow ones.

| Gate | Result |
| --- | --- |
| `npm test -- --silent` | **372 suites / 3243 tests passed** |
| `npm run test:fixtures` | **18 of 23 suites passed.** This increment's fixture passes; 5 Innovation Use suites fail — see below |
| `npx eslint src/domain/tools/agresso/staff/` (bare — `npm run lint` carries `--fix` and cannot verify, K-001) | **clean** (2 errors found and fixed first) |
| `npx tsc --noEmit` | **clean** |

---

## Budget tracking — **BREACHED. Escalated, not absorbed.**

| Metric | Budget | Actual | Delta |
| --- | --- | --- | --- |
| Tasks | 5 | **5** | on |
| LOC | ~850 | **1,657** | **+95%** |
| Review rounds | 2 | **1** | under |

| Tier | Budgeted | Actual |
| --- | --- | --- |
| Implementation | ~300 | **675** (+125%) |
| Tests | ~550 | **982** (+79%) |
| Test : impl ratio | 1.9x | **1.5x** |

**The estimate was wrong in the implementation dimension, and the reasoning that produced it is
the thing to fix — not the number.** Design §14 sized implementation at "roughly a quarter of the
sibling's" and applied the sibling's measured 1.9x test ratio to that. The ratio held up well
(1.5x actual). The base did not: the measurement path is 675 lines, not 300.

**Where the 375 extra implementation lines went**, since a breach without a cause is not information:

| Cause | ~LOC | Was it foreseeable? |
| --- | --- | --- |
| Four exclusion rules, each with its own precedence, counter and log line | ~120 | **Yes.** §14 counted "no transaction, no migration" as the driver of a smaller base and never counted the *rules*, which are what this increment actually is |
| Three preconditions with structured `abortDetail` operands | ~90 | Partly — `JS-7` added the operands after the budget was written |
| `FetchReport` + the page-loop instrumentation | ~130 | **No.** `DD-D2` and the distinct-carnet measure were discovered during design and after |
| Doc comments carrying the judgment findings to the code | ~35 | **No**, and deliberate: each explains a defect that has been reintroduced twice |

**Why this was not escalated mid-flight.** The tripwire was checked after T-04 at ~1,010 and the
stated threshold for stopping was ~1,200, on the reasoning that only T-05's fixture remained. That
reasoning was wrong in a specific way worth recording: the *wiring* half of T-05 was counted as
done, but the summary DTO, the module registration, the snapshot exposure and two sibling-spec
repairs had not yet been written. **"The remaining work is one fixture" was an estimate presented as
a fact**, and it is the same class as the budget error it was meant to catch.

**Consequence for increment 2 — this is the part that matters.** Its budget will be produced by the
same method against a *larger* surface (the three-table cascade, a transaction, a migration, config
resolution, the C-3 ceiling). Sizing it as a fraction of the sibling will under-count it the same
way. **Size increment 2 by counting its rules and statements, not by scaling a sibling.**

## Open at increment close

| # | Item |
| --- | --- |
| RB-1 | **The problem is not solved.** Departed staff still keep accounts, roles and credentials. Increment 2 needs a date |
| RB-2 | `JS-1` — C-4 proves a row named external exists, not that external accounts carry that id. The first Dev run's `excludedExternal` is the measurement that settles it |
| RB-4 | **5 Innovation Use fixture suites fail, and it is NOT this increment's doing — measured, not asserted.** All five die on `Nest cannot create the ResultPolicyChangeModule instance. The module at index [0] of the "imports" array is undefined` — a circular-import symptom inside the results domain. The worker reported it as pre-existing; the Leader **verified** it by checking `src/` back out at `eee1bc5c` (the commit before any work on this spec) and reproducing the identical failure. This increment's changed files are confined to `domain/tools/agresso/staff/`. **Worth its own bugfix spec** — five fixture suites have been red on `dev` and nothing surfaced it |

---

# PART II — Increment 2: The Write

- **Started:** 2026-09-28
- **Budget (tasks.md §12 / design §24):** 6 tasks · ~1,150 LOC · 6 review rounds
- **Status:** in progress

| Role | Host | Model |
| --- | --- | --- |
| Leader | Claude Code | `opus` (T1) — plans, adjudicates, re-measures the full suite. Writes no production code |
| Implementer | Codex (`codex exec`) | `gpt-5.6-terra`, effort `medium` |
| Reviewer | Antigravity (`agy`) | `gemini-3.1-pro-high` — never `*-flash`, never the Implementer's model |

## Host pre-flight — 2026-09-28 (before planning against any of them)

| Host | Probe | Result |
| --- | --- | --- |
| Antigravity | `agy --version`, then `agy models` | **1.2.11**; 14 slugs returned, `gemini-3.1-pro-high` present. List matches the 2026-09-09 re-probe — **no drift this cycle** |
| Codex | `codex --version` | **codex-cli 0.154.0**. ⚠️ **Not yet smoke-tested with a live request** — `login status` cannot see a billing state (the `402 deactivated_workspace` class). Probe before dispatching T-07 |
| Cursor | `cursor-agent --version` | **2026.09.26-dd393fe** |
| Scratch MySQL | `docker ps` | ❌ **Docker daemon not running** — `dial unix /Users/pelitos/.docker/run/docker.sock: connect: no such file or directory`. **Blocks T-07** (`up()`/`down()` executed against the scratch schema) and **T-11** (the whole fixture tier). Does not block T-06, T-08, T-09, T-10 at the unit tier |

---

## T-06 — Resolve the external status by id, not by name · **PASS**

- **Date:** 2026-09-28 · **Implementer attempts:** 1 (pre-existing; implemented 2026-09-25 by the Leader of the prior session, committed as `de338e97`)
- **Requirements covered:** `R-AGD-012` AC.1–AC.4 · **Design:** §21.1, `DD-D13`, §23
- **Files changed:** `sec-user-deactivation.repository.ts`, `sec-user-deactivation.repository.spec.ts`, `agresso-staff-tools.service.ts` (+58 / −20)

### Attempt 1 — the existing diff (`de338e97`)

`runtime events: none`

**What this task owed on entry.** T-06's code was already in the tree and committed; its two open
Done items were a Reviewer PASS from Antigravity and *AC.3's inverse test observed red under a
mutation that selects by name*. The commit message asserted "3 tests reddened, observed" but never
named **which** three — and the task's own Disqualifier is precisely that a test passing on a
fixture named `External` proves nothing. An unnamed aggregate is not evidence for a specific
member (`KZ-014`), so the falsifier was re-executed rather than relayed.

**Evidence re-run — Leader-inline, non-author. Result: `VERIFIED`.**

| Gate | Command | Result |
| --- | --- | --- |
| Target spec, baseline | `npx jest --testPathPattern sec-user-deactivation.repository.spec` | **16 passed, 16 total** |
| **AC.3 falsifier** | production filter reverted to `row.name.trim().toLowerCase() === 'external'`, same spec re-run | **RED — observed** (below) |
| Restore | filter restored, spec re-run; `git status --porcelain` | **16/16 green**, working tree **clean** |
| Full unit suite | `npm test -- --silent` | **396 suites / 3514 tests passed** |
| Types | `npx tsc --noEmit` | exit 0, no output |
| Lint | `npx eslint src test` — bare, no `--fix` (`K-001`) | exit 0. 1 warning, **pre-existing**, in `test/results-ai-formalize-bulk.e2e-spec.ts`, outside this diff |

Mutation output, verbatim — the third line is the one the Done item names:

```
✕ resolves the external row by id even though its name is not the bare word External (3 ms)
✓ returns a null id and matchCount 0 when no active row carries the external id
✕ does not resolve a row merely because its name reads External
✕ returns exactly one matching id after Number coercion (1 ms)
Tests:       3 failed, 13 passed, 16 total
```

**What this re-run cannot reach (`KZ-017`).** `npm test` runs with `rootDir: "src"` and collects
neither `test/` nor `test/fixtures/`. Nothing here is evidence about a real `user_status` table —
every assertion above is over a mocked `query` spy. That the live Dev row is `{4, 'External Accepted'}`
is a 2026-09-25 measurement recorded in `MEASUREMENT-2026-09-25.md`, not something this task re-proves.
`C-4`'s behavior against a real renumbered `user_status` remains unevidenced at every tier.

**Reviewer — Antigravity `gemini-3.1-pro-high`, effort `high`. `STATUS: PASS`.**

> The diff successfully fulfills the scope of T-06 by migrating the external status resolution from
> a brittle name lookup to the stable `user_status_id`. The updated test suite cleanly asserts all
> criteria from AC.1–AC.4, proving that name-only matches are rejected and string coercion functions
> correctly. The hardcoded `EXTERNAL_STATUS_ID = 4` conforms exactly to the task instructions; while
> this leaves a temporary gap against `R-AGD-012`'s dynamic `app_config` requirement, that gap is
> structurally necessary given the explicit allocation of the config integration to T-07 and
> introduces no functional risk.

`author ≠ auditor` holds on **both** axes: the author was Claude `opus`, the auditor Antigravity
`gemini-3.1-pro-high` — the registry's T3 tier for that host, not a degraded pair.

**ADVISORY (4R lens — recorded, never gates, never becomes a task):**

> *Readability / Scope* — the diff includes a change in `agresso-staff-tools.service.ts` to log the
> full candidate set. Strictly outside T-06's declared file scope, but benign, correctly typed
> against `DeactivationMeasurement.candidates`, and it satisfies the measurement-reconstruction
> requirement in `design.md` §19.4.

**Leader adjudication of the advisory.** The out-of-scope hunk is real and the Reviewer is right to
name it. It is **not** reworked: the lines are already committed and shipped in `de338e97`, they
carry the measurement the task's own commit message justifies, and reverting them would remove the
only path by which the 146-candidate id list is readable (`candidateSample` caps at 50). Recorded
and closed here per *Advisory Never Becomes A Task*.

**Decisions made:** none. No execute-time edit to `requirements.md` or `design.md` was needed.

**Issues encountered:** the `R-AGD-012` / T-06 boundary — the requirement says the id SHALL be read
from `ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID`, while T-06 ships a module constant. This was named
to the Reviewer as a sourced fact rather than waved away, and the Reviewer judged it structurally
necessary because `design.md` §21 allocates that key to **T-07**. **The gap is therefore open until
T-07 lands**, and T-07 must replace the constant, not merely add the key beside it.

**Final verification result:** green on every tier that can reach this change. **Task closed `[x]`.**

---

## T-08 — The three destructive statements · **PASS**

- **Date:** 2026-09-28 · **Implementer attempts:** 1
- **Requirements covered:** `R-AGD-008` AC.3–AC.5, `NFR-AGD-006`, `NFR-AGD-007` · **Design:** §19, §19.2, §19.3
- **Files changed:** `sec-user-deactivation.repository.ts` (+79), `sec-user-deactivation.repository.spec.ts` (+314) — **+389 / −4**

### Execution-arrangement deviation — recorded, not silent

`tasks.md` §7 names **Codex `gpt-5.6-terra`** as increment 2's Implementer and **Antigravity
`gemini-3.1-pro-high`** as its Reviewer. **User ruling 2026-09-28 (*"utiliza grok de cursor para
ejecutar las actividades y tu solo revisas"*) replaces both:**

| Role | Planned in §7 | Actually used | `author ≠ auditor` |
| --- | --- | --- | --- |
| Implementer | Codex `gpt-5.6-terra` | **Cursor `grok-4.7-xhigh`** | — |
| Reviewer | Antigravity `gemini-3.1-pro-high` | **Claude `opus`**, fresh read-only context (`akili-reviewer`) | **Holds** — different model family *and* different context |

Codex was never dispatched, so its `402 deactivated_workspace` risk was never retested this session.
`grok-4.7-xhigh` was chosen over the registry's `cursor-grok-4.6-*` because the 4.7 family is live
(re-probed 2026-09-28) and T-08 is the spec's only data-loss surface, where the effort dial mandates
the top rung and the tier-vs-effort rule forbids forcing `max` onto a cheaper tier. **The registry
was corrected in the same session** (`ae3a3b38`) rather than left stale.

The Reviewer being Claude is **not** a `REVIEW_WAIVED (inline)` case: the audit ran in a separate
read-only context that did not supervise the work, so no property of the gate was lost.

### Attempt 1 — Grok `grok-4.7-xhigh` (Cursor, via Orca `run_9a5ef8079b60` / `ctx_06decd851213`)

`runtime events: none`

**Falsifiers — three separate reds, one per table (`JG-2` satisfied).** The Implementer observed all
three and reported verbatim jest output for each. **The Leader re-executed the third independently**,
because it is the subtlest and the one guarding against a silently-inflated count:

Leader's own run, `AND is_active = 1` removed from the `sec_user_roles` UPDATE:

```
✕ does not rewrite an already-inactive row and does not inflate the count (3 ms)
Tests:       1 failed, 25 passed, 26 total
```

Restored; 26/26 green; `git diff --stat` back to +389 / −4. Falsifiers 1 (`app_secrets`) and 2
(`sec_user_roles`) stand on the Implementer's verbatim output and were **not** re-executed by the
Leader — stated here rather than implied, per `KZ-014`.

**Evidence re-run — Leader-inline, non-author. Result: `VERIFIED`. Every figure matched.**

| Gate | Implementer reported | Leader measured |
| --- | --- | --- |
| `npx jest …repository.spec.ts --silent --no-coverage` | 26 passed, 26 total | **26 / 26** |
| `npm test -- --silent` | 396 suites / 3524 tests | **396 / 3524** |
| `npx tsc --noEmit` | exit 0 | **exit 0** |
| `npx eslint src test` (bare, `K-001`) | exit 0, 1 pre-existing warning | **exit 0**, same warning, outside the diff |
| `grep -rn "AppSecretRepository" src/domain/tools/agresso/staff/` | zero hits | **zero hits** (grep exit 1) |
| `git diff --stat` | +389 / −4 | **+389 / −4** |

**Done checks.** All four met: three falsifiers red individually · chunking asserted over **120 ids
across 3 chunks** (not the inert sub-`CHUNK` set `JR2-6` warns about) · zero `AppSecretRepository`
hits · `updated_by` per `DD-D12`.

**The `KZ-001` disqualifier was cleared on its own terms.** The task forbids proving a `WHERE` on a
call sequence. The tests assert **generated SQL text**: the `app_secrets` case captures real TypeORM
output through a metadata-only `DataSource` with an intercepted `QueryRunner.query`. The Reviewer
confirmed none of the three `WHERE` clauses mixes `OR` with `AND`, and that the harness actively
guards against one appearing (`!/\bOR\b/i.test(sql)`).

**Reviewer — Claude `opus`, fresh read-only context. `STATUS: PASS`.**

> All three destructive statements conform to `R-AGD-008` (Details table, AC.3–AC.5), `NFR-AGD-006`
> and `NFR-AGD-007`: `app_secrets` goes through `manager.getRepository(AppSecret)` (never
> `AppSecretRepository`), all three carry the active-row predicate, ids are deduplicated/sorted
> ascending and chunked at `CHUNK = 50` over a 120-id set spanning 3 chunks, counts come from driver
> affected-rows rather than `userIds.length`, no transaction is opened here, and
> `alliance_user_staff` is untouched.

### Decision — the `DD-D12` ambiguity, escalated to the Reviewer rather than settled by the Leader

The Implementer surfaced a genuine ambiguity: design §19.3 says *"`updated_by` is left NULL and that
is recorded"*, but **omitting the column from the `SET` clause does not NULL a row that already
carries a value** — it preserves it. The Leader's provisional reading (omission conforms, because
§19.3's rationale is about not inventing a synthetic actor) was **passed to the Reviewer as a named
conformance check with an explicit instruction not to defer to it.**

**The Reviewer ruled independently, and on a stronger citation than the Leader had:**

> Omission conforms; an explicit `SET updated_by = NULL` would be the violation. `requirements.md`
> §18 states *"**No schema change.** Three tables written (`is_active` only)"*. `SET updated_by = NULL`
> writes a second column and breaches that line. `NFR-AGD-007` frames the decision as a binary —
> *"between leaving `updated_by` NULL and introducing a system actor id"* — and "leaving" is the
> absence of a write, not a write of NULL. Verified at the source: `updated_by` in
> `src/domain/shared/global-dto/auditable.entity.ts:28` is a plain `@Column` with no listener and no
> TypeORM auto-stamp.

**No spec edit was made.** §19.3's wording is loose but not wrong, and the Reviewer's citation chain
(`requirements.md` §18 + `NFR-AGD-007` + the entity source) resolves it without amendment. Recorded
here so the next reader does not re-litigate it.

The Reviewer also ruled the Implementer's other five assumptions **legitimate scope boundaries, not
violations** — notably that cross-table write order belongs to `apply()` (T-09), which the task's own
Scope and Consumers fields already assign there.

### What this task's verification structurally cannot reach (`KZ-017`)

Both the Implementer and the Reviewer declared this, and the declarations agree:

- `npm test` runs with `rootDir: "src"`. It collects neither `test/fixtures/`, `test/*.e2e-spec.ts`
  nor `test/*.integration-spec.ts`. **`npm run test:fixtures` could not run at all — the Docker
  daemon is down and the scratch MySQL cannot start.** Nothing in this task is a database claim.
- `idsRewrittenByStatement` is a **simulator** that reads the predicate off SQL text by regex. It
  cannot show that MySQL's `affectedRows` counts matched-vs-changed rows the way **AC.4's "do not
  inflate the counts"** assumes, nor that `In()` + boolean `true` binds to `tinyint(1)` at the wire.
- Rollback, second-chunk failure, dry-run and shield membership (`R-AGD-008` AC.1, AC.2, AC.6) are
  **not** proven here. These three methods write exactly the ids handed to them; the shield set is
  the caller's.
- Cross-table lock order was not executed as one transaction. `JD-8` remains the accepted risk.

> **Carried forward to T-11:** the Reviewer's instruction that **T-11 must carry `AC.4` explicitly
> rather than inherit it as proven.** T-08's count assertions are simulator-grade; only the fixture
> tier can settle matched-vs-changed. This pointer must be copied into T-11's Implementer brief — a
> forward pointer is carried by the brief or by nobody.

### ADVISORY (4R lens — recorded, never gates, never becomes a task)

1. **Risk — a safety guard lost its case-insensitive flag.** The no-write source guard went from
   `/\b(?:UPDATE|INSERT|DELETE)\b/i` to `/\b(?:INSERT|DELETE)\b/`
   (`sec-user-deactivation.repository.spec.ts:186`). **Dropping `UPDATE` is mandatory** — T-08 exists
   to add UPDATEs. **Dropping `/i` is not**, and nothing in the task asked for it: a future lowercase
   `delete from …` in this file now passes the guard silently.
2. **Reliability** — `idsRewrittenByStatement` is a regex simulator; see the `KZ-017` block above.
3. **Readability** — `affectedRowsForRawSql` and `affectedRowsForAppSecretsSql` are byte-identical
   one-line delegations to the same helper.

**Leader adjudication of advisory 1 — referred to the user, and the user ruled.** It was not
reworked inside this task and not converted into a new task; both are forbidden. It was also not
mere style: a weakening of a safety gate, on a line **this diff itself edited**, in the one task of
the spec that can destroy access. The Reviewer weighed it and chose not to gate, and that verdict
stands — T-08 closed on a genuine PASS. **The user was asked at the continue gate and elected to
restore the flag**, applied as a separate follow-up commit rather than reopening T-08.

**The advisory was correct, and the proof is a discrimination test, not an opinion.** A lowercase
`delete from sec_users where 1=1` was injected into the production source and the guard run both
ways:

```
A) guard WITH /i, lowercase write injected
   ✕ opens no transaction and does not write alliance_user_staff (2 ms)
   Tests: 1 failed, 25 skipped, 26 total

B) same injection, guard WITHOUT /i (the state T-08 shipped)
   ✓ opens no transaction and does not write alliance_user_staff (2 ms)
   Tests: 25 skipped, 1 passed, 26 total
```

Case B is the finding: the shipped guard **passed green over an injected lowercase write**. Both
files restored; 26/26 green, then `npm test -- --silent` 396 suites / 3524 tests, `npx eslint src test`
exit 0. Checked before applying that the production file contains no lowercase `insert`/`delete`
that `/i` would newly match (`grep -nEi '\b(insert|delete)\b'` → no hits), so the flag tightens the
guard without creating a false positive.

**Issues encountered:** none blocking. Docker unavailability is recorded above as a scope limit, not
an issue with this diff.

**Final verification result:** green on every tier that can reach this change. **Task closed `[x]`.**

---

## T-07 — Config: four keys, typed enum, resolver, seed migration, and the C-4 wiring · **PASS**

- **Date:** 2026-09-28 · **Implementer attempts:** 1
- **Requirements covered:** `R-AGD-011` (AC.1–AC.4), `R-AGD-012` (AC.1–AC.4, closing the gap below) · **Design:** §21, §21.1
- **Implementer:** Cursor `grok-4.7-xhigh` · **Reviewer:** Claude `opus`, fresh read-only context
- **Files changed:** 8 modified (**+277 / −50**) + **4 new** — `staff-deactivation-config.resolver.ts` (+ spec), `dto/deactivation-config.dto.ts`, `1790602688746-seedStaffDeactivationConfig.ts`

### Scope widening — the gap this task was grown to close

**`R-AGD-012` would have been unmet at spec close with every task marked done.** It requires C-4 to
resolve the external `user_status` id **from** `ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID`, but no
task connected the key to any code: `T-06` shipped the module constant, `T-07` only created the key
and the resolver, and `T-09` resolves config for `apply()` — while C-4 runs inside `measure()`, which
executes first. The key would have been seeded and never read.

**How it surfaced, because the mechanism is the point.** The `T-06` entry above recorded a forward
pointer — *"T-07 must replace the constant, not merely add the key beside it"*. The Leader **re-read
that pointer at the moment of composing T-07's brief**, which is the only thing that makes a forward
pointer work: one filed two tasks ago is carried by the brief or by nobody. Raised at the continue
gate and widened on the **user's ruling** (2026-09-28), never absorbed silently — growing an approved
task is the user's call. Recorded in `tasks.md` §9 T-07 and committed as `fd5a72ee`.

### Execute-time spec edits made during this task

| File + section | Edit | Reason |
| --- | --- | --- |
| `tasks.md` §9 `T-07` Scope | Added the fifth deliverable (C-4 wiring) + its falsifier + 2 Done items | The user-approved widening above |
| `tasks.md` §9 `T-07` Scope note | **Corrected the Leader's own wording** — see below | It contradicted `R-AGD-011` |
| `tasks.md` §9 `T-11` Consumers | `none — new file` → the fixture is **not** new | Factually wrong; found by the Reviewer |
| `tasks.md` §9 `T-06` Consumers | Annotated the sweep as narrower than its claim (`KZ-017`) | It missed the fixture; found by the Reviewer |

**The Leader wrote a defect into the task text, and the Implementer caught it.** The widening first
read *"`EXTERNAL_STATUS_ID` may remain **only** as the resolver's documented default for the key's
absence"*. `R-AGD-011`'s table marks that key **"abort C-4 — fails loud"**, and the requirement adds
*"a missing external-status id must never become 'shield nobody'"* — so a documented default is
exactly the failure direction the key's own falsifier exists to catch. **The Implementer read the
requirement over the Leader's phrasing and implemented fail-loud, which is correct.** The task text
was repaired before the Reviewer saw it, and the Reviewer was told to verify the *behavior* rather
than accept either account.

### Attempt 1 — Grok `grok-4.7-xhigh` (Orca `ctx_4c29bb2f8811`)

`runtime events: none`

**Five falsifiers, five separate reds**, each with verbatim jest output naming the test:

| Falsifier | Mutation | Red test |
| --- | --- | --- |
| `DRY_RUN` | unreadable branch returns `false` | `DRY_RUN unresolvable fails safe to enabled` |
| `CEILING_FRACTION` | silently returns `0.05` | `CEILING_FRACTION unresolvable aborts C-3` |
| `ABSOLUTE_FLOOR` | silently returns `10` | `ABSOLUTE_FLOOR unresolvable aborts C-3` |
| `EXTERNAL_STATUS_ID` | silently returns `4` | `EXTERNAL_STATUS_ID unresolvable aborts C-4` |
| **C-4 wiring** | filter on the constant, not the argument | `measure selects configured …EXTERNAL_STATUS_ID when it is not 4` |

**The inert-fixture trap was avoided.** The wiring test configures id **`9`**, not `4`. A fixture
configuring the constant's own value passes whether or not the wiring exists — the task named that
trap explicitly and the Implementer respected it. The red output shows candidate `980` (status 9)
where `981` (status 4) was expected, so the two cohorts genuinely swap.

**Evidence re-run — Leader-inline, non-author. Result: `VERIFIED`. Every figure matched.**

| Gate | Implementer reported | Leader measured |
| --- | --- | --- |
| `npm test -- --silent` | 397 suites / 3534 tests | **397 / 3534** (was 396 / 3524 before this task) |
| `npx tsc --noEmit` | exit 0 | **exit 0** |
| `npx eslint src test` (bare, `K-001`) | exit 0, 1 pre-existing warning | **exit 0**, same warning, outside the diff |
| `grep -rn "AppConfigService" src/domain/tools/agresso/staff/` | zero hits | **zero hits** (grep exit 1) |
| `git diff --stat` | +277 / −50 over 8 files | **+277 / −50** |

**Migration evidence — the Leader queried the scratch schema directly rather than relaying it:**

```
ARI_CLARISA_PROJECTS_PHASE                  2026
ARI_STAFF_DEACTIVATION_ABSOLUTE_FLOOR       10
ARI_STAFF_DEACTIVATION_CEILING_FRACTION     0.05
ARI_STAFF_DEACTIVATION_DRY_RUN              true
ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID   4
POOL_FUNDING.PRMS_SYNC_BUTTON.ENABLED       true
POOL_FUNDING.SECTION.ENABLED                true
```

`up()` → 7 rows / 4 staff keys · `down()` → 3 rows / 0 staff keys, **exactly four deleted** with the
three pre-existing keys untouched · `up()` re-applied. **Environment prepared by the Leader, once:**
the container was created fresh this session and `migration:test:bootstrap` was run a single time
(`FP-49` — it is not idempotent), and the brief told the Implementer not to re-run it.

**Reviewer — Claude `opus`, fresh read-only context. `STATUS: PASS`,** with all five escalated checks
verified independently rather than accepted:

1. **Fail-loud is real, not asserted.** `readLoud()` pushes a failure and returns `null`; no seed
   substitution anywhere. `sec-user-deactivation.service.ts:224-235` aborts C-4 **before** touching
   the repository, and `export const EXTERNAL_STATUS_ID` was **deleted from the repository file** —
   it survives only in the DTO, consumed by the migration and by specs.
2. **The fixture change is a forced consumer repair, not T-11 creep.** `tsconfig.json` has no
   `include` and excludes only `node_modules`/`dist`/`vite.config.ts`, so `tsc --noEmit` compiles
   `test/` and the signature change made the fixture non-compiling. `pinExternalStatusConfig` is
   equally forced: the fixture's own `EXTERNAL_STATUS_ID = 9_050_511` is not what the migration seeds,
   so without the pin the pre-existing `measure()` assertion would abort C-4. State restored in a
   `finally`.
3. **The re-run `up()` discharges AC.2.** The criterion is a property of the **statement**, not of
   TypeORM's ledger; deleting the `migrations` row is the only way to reach a second execution, it
   was disclosed plainly, and the Leader's own post-state query shows **four** staff rows, not eight.
   `app_config` has `PRIMARY KEY (key)`, so `ON DUPLICATE KEY UPDATE` has a key to collide on.
4. **`'API'` / `'STAFF'` conform.** `category` is a free taxonomy here (`seedClarisaMappingPhase` =
   `API`/`CLARISA`; `categorisePoolFundingFeatureToggles` = `FRONT`/`SECTIONS`), `API` marking
   backend-consumed config. No spec decision was owed.
5. **Additivity verified by sweep, not accepted.** Zero `Object.values`/`Object.keys(AppConfigKey)`,
   zero `switch` over it, zero exhaustive mapped type outside this diff. Every consumer names one
   member. Adding four is additive — which also settles the task text's stale "10 files" against the
   Implementer's measured **25**.

The Reviewer also ruled the `Not Done / Assumptions` list free of conformance violations: keeping
C-3 out of `measure()` is **correct, not deferred**, because `R-AGD-010`'s scenario requires dry-run
*not* to abort on ceiling.

### ADVISORY (4R lens — recorded, never gates, never becomes a task)

1. **Risk, reachable today — `CEILING_FRACTION` has no upper bound.** `parsePositive` accepts any
   finite `> 0`, exactly as `R-AGD-011` specifies. But `5` typed instead of `0.05` yields a ceiling of
   **five times the active population**, silently disarming the volume defence — reachable by one
   admin typo in the `/admin` config UI. **In spec today**; the Reviewer suggests an upper bound
   (`<= 1`) when **T-09** consumes it.
2. **Reliability** — the fixture repair was never executed. `npm run test:fixtures` did not run and
   `npm test` (`rootDir: "src"`) structurally cannot collect it. Type-correct and logically sound,
   but a **presence-level claim** until T-11 runs that tier.
3. **Coverage** — `npm run test:cov` was not among this task's gates and the 60% floor is reported
   nowhere for it. T-07's Done list does not require it; **§12's close definition does.**

**Leader adjudication.** None is reworked and none becomes a task. Advisory 1 is a genuine hazard but
it is **what the requirement says**, so changing it is a spec decision, not an execution one — carried
to the user and to T-09's gate rather than actioned here. Advisories 2 and 3 are carried as
verification debt below.

### What this task's verification structurally cannot reach (`KZ-017`)

- `npm test` runs with `rootDir: "src"`: no `test/fixtures/`, no e2e, no integration tier.
  **`npm run test:fixtures` was not run at all**, so the fixture repair is unexecuted.
- Resolver unit tests mock `getRepository(AppConfig).find` and never see the SQL TypeORM emits. The
  scratch run proves the **migration's** INSERT/DELETE, not the **resolver's** SELECT.
- `resolveExternalStatusId` tests assert an in-memory filter over a mocked `query` result; MySQL's
  evaluation of `is_active = 1 AND deleted_at IS NULL` is unproven at every tier.
- The second `up()` was reached by deleting the migration's ledger row — the runner executing `up()`
  again, **not** a second call through an already-applied history.
- The `AppConfigService` grep is source text; it cannot see a name built at runtime.
- The migration runner printed *"377 migrations are already loaded in the database. 339 migrations
  were found in the source code."* The 38-record gap was **not enumerated** by anyone. It did not stop
  this migration, and it is a property of the scratch ledger, not of this diff — but it is unexplained
  and recorded here rather than dropped.

> **Carried forward, to be copied into the briefs that own them:**
> - **T-09:** the `CEILING_FRACTION` upper-bound question (advisory 1) arrives at T-09's gate.
> - **T-11:** must **execute** the T-07 fixture repair, not inherit it; and must carry `AC.4`
>   explicitly rather than inherit it as proven (carried from T-08).
> - **Spec close (§12):** `npm run test:cov` and the 60% floor are **reported nowhere yet**.

**Final verification result:** green on every tier that can reach this change, plus executed
migration evidence against a real MySQL. **Task closed `[x]`.**

---

## Budget tripwire — fired at the T-07 gate, escalated, re-baselined

**Measured with 3 of 6 tasks closed**, `git diff --numstat de338e97~1 HEAD -- server/researchindicators/{src,test}`:

| Metric | Budget (§24, **all six tasks**) | Actual (**three tasks**) |
| --- | --- | --- |
| Implementation | ~400 | **381** |
| Tests | ~750 | **700** |
| Ratio | 1.9× | **1.8×** |
| Review rounds | 6 | **3**, zero rework |

Per commit: `de338e97` +58 (T-06) · `f8a2aa51` +389 (T-08) · `b7425b47` +1 (guard fix) · `644d7dfa` +654 (T-07).

**The cause is recorded in `design.md` §24.1** rather than restated here (`KZ-005` — a measured figure
gets one home). In one line: the ratio was right and the *count* priced a four-item enumeration as
though the orchestrator — its largest item, still unbuilt — were free.

**Escalated to the user at the continue gate, not absorbed.** The user elected to continue with the
budget re-baselined. The overrun is volume, not defects.

## Coverage — reported, not assumed (§12 close item)

`npm run test:cov -- --silent`, run at the T-07 gate with no worker active:

```
All files    | % Stmts 90.7 | % Branch 77.75 | % Funcs 87.16 | % Lines 90.34
Test Suites: 397 passed, 397 total
Tests:       3534 passed, 3534 total
```

Global floor is 60%; jest exited 0 with no threshold failure. This increment's own files:

| File | Stmts | Branch | Funcs | Lines |
| --- | --- | --- | --- | --- |
| `sec-user-deactivation.repository.ts` | 100 | 77.77 | 100 | 100 |
| `sec-user-deactivation.service.ts` | 97.05 | 86.11 | 100 | 97.91 |
| `staff-deactivation-config.resolver.ts` | 96.36 | 78.94 | 88.88 | 96.07 |

**Scope limit (`KZ-017`):** `test:cov` runs the same `rootDir: "src"` config as `npm test`. It
measures **no** fixture, e2e or integration tier, so these percentages say nothing about the fixture
repair T-07 forced. That remains T-11's to execute.
