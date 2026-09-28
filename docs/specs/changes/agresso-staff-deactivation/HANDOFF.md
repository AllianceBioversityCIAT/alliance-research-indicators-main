# HANDOFF — Agresso / Staff Deactivation

> **Paused 2026-09-16 by priority change. RESUMED 2026-09-25.** Written to be picked up cold, by
> someone (or some model) with none of this session's context.

---

> ## ⚠️ SUPERSEDED IN PART — read [`MEASUREMENT-2026-09-25.md`](./MEASUREMENT-2026-09-25.md) first
>
> **Increment 1 HAS now been run** (Dev, 2026-09-25). §1's "never been run" and §6's blank table are
> history, kept as the record of the state this file was written in. What the run settled:
>
> - **146 candidates** against an **activePopulation of 1985** — the C-3 ceiling (99.25 — see `design.md` §20.2) is breached at 7.36%, as §11 of the design predicted.
> - **`D-3` / `RB-2` / `JS-1` are CLOSED: `EX-1` shields nobody.** Zero of 1985 active users carry `status_id = 4`, so the external exclusion is structurally inert, not merely unused. Increment 2 cannot rely on it.
> - The run first aborted on `C-4` because the live row is named **`External Accepted`**, not `External`. Fixed by selecting on the id — **uncommitted**, per the barrier below.
> - The 146 are four distinct cohorts, not one. **3 of them are active platform users who are not Agresso staff**, and 91 sit behind an Agresso-side question STAR cannot answer.
>
> **STANDING BARRIER (user ruling 2026-09-25): no commit on this work until it is validated with
> real data that the right users are deactivated and no wrong ones are.** The list is with BI.
>
> `D-1` is **fixed — the deletion was approved 2026-09-25.** `D-2` (the ceiling) is informed but not
> decided; `design.md` §25 handles it with a raise-then-restore pair.
>
> ---
>
> ### 🔖 WHERE THIS STANDS — updated 2026-09-25, end of session
>
> **`/akili-specify` is mid-flight. Phases 1 and 2 are DONE and user-approved. Phase 3 is next.**
>
> | Phase | State |
> | --- | --- |
> | 1 — `requirements.md` | ✅ Approved. Increment 2 is **Part II, §14–§23** |
> | 2 — `design.md` | ✅ Approved. Increment 2 is **Part II, §17–§27** |
> | Judgment Day | ✅ Ran. **Both judges REJECT** (`gemini-3.1-pro-high` + `gpt-5.6-terra`, neither Claude). 9 of 10 findings fixed; **re-judgment NOT run by user ruling**, so the fixes are unaudited. See `judgment.md` → *Round 2* |
> | 3 — `tasks.md` | ⬜ **NOT STARTED — this is the next action** |
>
> **Resume with:**
> ```
> /akili-specify docs/specs/changes/agresso-staff-deactivation
> ```
> and tell it: *Phases 1 and 2 are complete and approved — go straight to Phase 3 (`tasks.md`) for
> increment 2 only (Part II). Do not rewrite `requirements.md` or `design.md`.*
>
> **Five things a cold session must not re-derive:**
>
> 1. **🚫 NO COMMITS.** Standing user barrier: nothing is committed until it is validated with real data that the right users are deactivated and no wrong ones are. Everything below lives in the working tree only.
> 2. **Increment 2 numbers from `R-AGD-008`.** Increment 1 owns `001…005` with *different meanings* and 39 live citations. `006`/`007` are **retired unused**. Never reuse them.
> 3. **Budget is 6 tasks / ~1,150 LOC / 6 rounds** (`design.md` §24), re-counted after §17 found the draft was sized against an empty tree. It is **not** the draft's 10 / ~2,200.
> 4. **`P-9` is the open High-impact premise** and no command in this repo can settle it — it is BI's call on the 2026-08-24 block. `P-11` is the other High row.
> 5. **Uncommitted code changes already exist** for the `C-4` id fix: `sec-user-deactivation.repository.ts`, its spec, and `agresso-staff-tools.service.ts`. Green: 396 suites / 3,514 tests, mutation probe observed red.
>
> Read [`MEASUREMENT-2026-09-25.md`](./MEASUREMENT-2026-09-25.md) before anything else — it carries
> the measured numbers and the three traps that produced a wrong answer first.

---

## 1. Start here

> **Historical as of 2026-09-25 — the run described here has happened.** See the banner above.

**Increment 1 is code-complete, committed, green — and has NEVER BEEN RUN.**

That last clause is the whole state of this work. The increment exists to produce **four
measurements**, and until someone triggers it those four numbers are still the assumptions that made
the destructive half of this spec unsafe to write in the first place.

**The single next action, which needs no code and no decision:**

```
GET /api/agresso/staff/clone/execute     # SYSTEM_ADMIN, against Dev. NOTE: no /v1 segment.
```

Read the response body. Record these four and paste them into §6 of this file:

| Field | Why it matters |
| --- | --- |
| `deactivationCandidates` | How many accounts increment 2 would retire. Nobody knows this number |
| `activePopulation` | The denominator for C-3's ceiling, which is currently a guess (`0.05`) |
| `excludedExternal` | **If this is 0 and the platform has known external users, `EX-1` discriminates nothing** — see `RB-2` |
| `distinctCarnets` vs `totalElements` | Whether the Agresso fetch arrives intact at all |

The run writes nothing. There is no write path in this increment — not a guarded one, not a
transaction that rolls back. It is safe to run against Dev repeatedly.

---

## 2. What exists

**Branch:** `new-spec-auto-sync-sec-users` · **Not pushed.** Six commits, `be6443d9`..`b49a352d`,
all on top of `eee1bc5c`.

| Commit | Contents |
| --- | --- |
| `be6443d9` | The spec, rescoped to increment 1 after Judgment Day |
| `262f5838` | T-01 email key util + shield predicate · T-02 page-count fix + `FetchReport` |
| `a62aadf0` | T-03 read-only repository (Cursor) · T-04 the measurement · T-05 wiring |
| `3d0d62ba` | T-05 fixture — proves the increment writes nothing |
| `8adb83a6`, `b49a352d` | Execution audit trail and the budget-breach record |

**Verification as left:** `npm test` **372 suites / 3243 tests green**; this increment's fixture
green; `npx eslint` (bare) and `tsc --noEmit` clean.

**Documents in this folder:**

| File | What it is |
| --- | --- |
| `requirements.md`, `design.md`, `tasks.md` | **Increment 1 only.** All five tasks `done` |
| `execution.md` | Per-task evidence, every mutation proof, the budget breach and its cause |
| `judgment.md` | **Judgment Day round 1 ledger — read before touching increment 2** |
| `judgment-inherited.md` | The parent spec's exhausted lineage. Historical evidence, not a to-do list |
| `proposal.md` | Original intent + the user rulings. ⚠️ Contains two claims this session disproved — see §5 |
| `.increment2-carryover-{requirements,design}.md.bak` | **The full destructive spec**, preserved verbatim. Increment 2 starts from these, not from scratch |

---

## 3. The judgment lineage — do not get this wrong

| | |
| --- | --- |
| Lineage | **Fresh** (the parent's was `ESCALATED` and is **not** resumed) |
| Fix rounds | **1 of 2 used** |
| Scoped re-judgments | **0 of 2 used** |
| Round-1 result | 4 confirmed SEVERE · 2 suspect SEVERE · 5 confirmed WARNING · 7 suspect WARNING, **0 contradictions** |

All four confirmed-severe findings were **fixed or dissolved** in increment 1 (see `requirements.md`
§12 for the per-finding disposition). **The rounds that remain belong to increment 2**, which is the
half that historically consumed them — every severe finding across the parent's three passes landed
in the destructive branch.

**Do not run a fresh Judgment Day on increment 1.** It is reviewed, and its findings are closed.

> ⚠️ **The counters above are increment 1's and are now HISTORY.** Increment 2 ran its own round on
> 2026-09-25: **both judges REJECT**, 10 findings merged, 9 applied, **re-judgment declined by the
> user**. Its live counters are **1 fix round used of 2, 0 scoped re-judgments used of 2**, and the
> transaction state is `escalated` — the REJECT was never retracted and **no judge has seen the
> fixes**. Full ledger: `judgment.md` → *Round 2 — Increment 2 (Part II)*.

---

## 4. Resuming — in order

### 4a. Run the measurement (§1). No decisions required.

### 4b. Then decide, with real numbers in hand

| # | Decision | Currently |
| --- | --- | --- |
| **D-1** | **Increment 2's date.** It is the one that actually solves the problem | **Unset. This is `RB-1` and it is the reason this file exists** |
| **D-2** | C-3's ceiling values, now that `activePopulation` is known | Guessed at `0.05` / floor `10` |
| **D-3** | Whether `EX-1` survives, given `excludedExternal` | Unresolved — `RB-2` / `JS-1` |

### 4c. Then spec increment 2

Start from `.increment2-carryover-design.md.bak`, which still holds the full destructive design:
the three-table cascade, the write transaction, `DD-D8`'s `app_secrets`-first ordering, the
`app_config` keys and their seeding migration, and the dry-run flag.

**Findings deferred to it, already written and not to be re-discovered:**

| # | What |
| --- | --- |
| `JD-8` | Cross-table lock order is **inverted relative to the sibling's shipped transaction**, and the trigger has no in-flight guard. Sorting ids mitigates the *within-table* dimension, which was already safe. `app_secrets` has **no index on `responsible_user_id`**, so id sorting has no effect on that statement at all |
| `JS-2` | A catch placed **inside** the transaction callback commits partial chunks — and the sibling's shipped code returns a summary from inside its callback, which is the pattern an implementer will copy |
| `JD-9` | "Audit columns are written on every row" is unsatisfiable-or-vacuous: `updated_at` is `ON UPDATE CURRENT_TIMESTAMP` and `updated_by` has no actor in a background job |
| `JG-2` | The belt-and-braces falsification note applies to `sec_users` only, not to all three writes |

### 4d. Budget increment 2 by counting, not by scaling

Increment 1 came in at **1,657 LOC against ~850 budgeted (+95%)**. The test ratio held (1.5x); the
**implementation base** was wrong — 675 lines against ~300. The design sized it as a fraction of the
sibling on the grounds of what the increment does *not* have, and never counted what it *is*: four
exclusion rules and three preconditions, each with a counter, a precedence and an abort operand.

**Increment 2 has a strictly larger rule surface. Size it by counting rules and statements.**

---

## 5. Traps — each of these cost real time, or would have

| # | Trap |
| --- | --- |
| T-1 | **`proposal.md` §3 says `DD-14` collapses "lowest carnet winning". That is stale.** The shipped rule is **first-arrival**, per a user ruling that overturned it before implementation. The stale text also survives in the archived sibling's `DD-14` table row |
| T-2 | **`proposal.md` `OQ-D2` warns about a 5-minute `app_config` TTL (K-016). It does not apply.** `AppConfigService` holds **no cache**; the TTL lives in `MappingPhaseResolver` / `ClarisaProjectsService`, which are consumers. Verified both directions |
| T-3 | **`proposal.md` `F-2` claims the config keys cannot be seeded. False.** There are **six** migrations that seed `app_config`; the pattern is `1786738949211-seedClarisaMappingPhase.ts` |
| T-4 | **Never inject `AppConfigService` into this path.** It carries `CurrentUserUtil` (`Scope.REQUEST`) and the scope bubbles to the fire-and-forget controller. The repo forbids it in writing at `mapping-phase.resolver.ts:11-15`. Singleton config reads use `dataSource.getRepository(AppConfig)` |
| T-5 | **`migration:test:bootstrap` is NOT idempotent** (FP-49). The scratch container was already up and bootstrapped; re-running it strands the schema. Recover only via `compose:test:down` → `up` → `bootstrap` |
| T-6 | **`npm test` has `rootDir: src` and never runs `test/fixtures/`.** No `npm test` result is evidence for any database claim here. Fixture files must be named `*.fixture-spec.ts` or **no config collects them** — a silent zero-tests pass |
| T-7 | **`isUsableEmail` measures the UNTRIMMED length; the match key is trimmed.** This is `JD-3`, the defect three adversarial passes never reached. `shieldKeyFor` in `email-key.util.ts` exists precisely to not repeat it — do not "simplify" it back to `isUsableEmail` |

---

## 6. Measurements — FILLED 2026-09-25 (first run)

Full record, classification of the 146 and the traps hit while measuring:
[`MEASUREMENT-2026-09-25.md`](./MEASUREMENT-2026-09-25.md).

```
Date:                     2026-09-25
Environment:              Dev
deactivationCandidates:   146
activePopulation:         1985
excludedExternal:         0        <-- a REAL 0. EX-1 discriminates nothing: see M-1 below
excludedSystemAdmin:      0
excludedAmbiguous:        0
excludedUnmatchable:      3
shieldedBySkip:           []
distinctCarnets:          2001
totalElements:            2001
deactivationAbortReason:  (absent — the pass completed)
```

> **M-1 — the trap that makes this table readable.** A `C-4` abort returns the **empty report**:
> `checkAborts` runs before candidates are computed, so `deactivationCandidates: 0` and
> `excludedExternal: 0` on an aborted run are not measurements at all. The first trigger on
> 2026-09-25 produced exactly that and was nearly read as "nobody to deactivate". **The
> discriminator is `deactivationAbortReason` — absent above, so these figures are real.**

Derived, and consistent — the counts reconcile without a remainder:

```
1985 active − 1835 matched                          = 150
− 140 (d.gaviria's twin, shielded by the same key)  = 149
− 3 excludedUnmatchable                             = 146   ✓
```

**C-3:** `max(0.05 × 1985, 10)` = **99.25** (unrounded — see `design.md` §20.2); 146 candidates = **7.36%** → ceiling breached, as
`design.md` §11 step 3 said it would be on the first run. `D-2` is now informed but not decided.

---

## 7. Found along the way, unrelated to this spec — worth its own bugfix

**Five Innovation Use fixture suites are RED on this branch and on `dev`**, all on
`Nest cannot create the ResultPolicyChangeModule instance. The module at index [0] of the "imports"
array is undefined` — a circular-import symptom in the results domain.

**Verified pre-existing by measurement, not inference:** `src/` was checked back out at `eee1bc5c`
(before any work on this spec) and the identical failure reproduced. This spec's changes are
confined to `domain/tools/agresso/staff/`.

They have been red long enough to have been normalised, and nothing surfaced them. Recorded as
`RB-4` in `execution.md`.

---

## 8. Execution arrangement used

| Role | Host |
| --- | --- |
| Leader — plan, adjudicate, audit trail, full-suite re-measurement | Claude Code (`opus`) |
| Implementer | Claude Code (T-01, T-02, T-04, wiring) · **Cursor** (T-03, T-05 fixture) |

**Codex was excluded by user ruling (2026-09-16)** — do not route to it on resume without re-asking.
Cursor was probed with a live prompt before being planned against, not just `--version`: an auth
check cannot see a billing state, which is how a sibling host once reported "logged in" while every
request returned `402`.

`author ≠ auditor` was held **per task**: Cursor wrote the fixture that falsifies the Leader's
measurement code, which is the check that mattered most.

---

## 9. One-line status

> **Updated 2026-09-25.** Previous wording, now history: *"Increment 1: done, green, committed,
> unpushed, and unrun."*

**Increment 1: RUN (Dev, 2026-09-25) — 146 candidates of 1985 active, ceiling breached, `EX-1`
proven to shield nobody. Its `C-4` fix is green but UNCOMMITTED under a standing no-commit barrier
while BI verifies the list. Increment 2: not started, fully specified in the `.bak` drafts,
undated — and until it ships, a departed employee keeps their account, their roles and their machine
credentials.**
