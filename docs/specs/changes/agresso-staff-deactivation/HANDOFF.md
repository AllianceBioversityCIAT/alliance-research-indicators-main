# HANDOFF — Agresso / Staff Deactivation

> **Paused 2026-09-16 by priority change.** Written to be picked up cold, by someone (or some model)
> with none of this session's context.

---

## 1. Start here

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

## 6. Measurements — TO BE FILLED ON THE FIRST RUN

```
Date:                     ____________
Environment:              Dev
deactivationCandidates:   ____________
activePopulation:         ____________
excludedExternal:         ____________   <-- if 0 with known externals, EX-1 discriminates nothing
excludedSystemAdmin:      ____________
excludedAmbiguous:        ____________
excludedUnmatchable:      ____________
shieldedBySkip:           ____________
distinctCarnets:          ____________
totalElements:            ____________
deactivationAbortReason:  ____________   <-- absent on a healthy run
```

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

**Increment 1: done, green, committed, unpushed, and unrun. Increment 2: not started, fully
specified in the `.bak` drafts, undated — and until it ships, a departed employee keeps their
account, their roles and their machine credentials.**
