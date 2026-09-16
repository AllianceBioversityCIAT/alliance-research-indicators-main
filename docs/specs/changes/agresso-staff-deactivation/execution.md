# Execution — Agresso / Staff Deactivation · Increment 1

- **Spec:** [`./tasks.md`](./tasks.md) · **Started:** 2026-09-16
- **Budget:** 5 tasks · ~850 LOC · 2 review rounds

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
