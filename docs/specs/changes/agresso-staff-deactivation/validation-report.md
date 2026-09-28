# Validation Report — Agresso / Staff Deactivation (Increment 2)

## Verdict

**WARN — archive-ready for the BUILD, NOT clear for ROLLOUT.**

No `FAIL`. Three clause-level `WARN`s, all cheap to close, none blocking archive. **The rollout is
blocked by human steps that no amount of code can discharge**, and those are the reason this is not
a clean PASS.

| | |
| --- | --- |
| Clauses audited | **40** — 25 `AC`, 9 `AND IT MUST`, 6 `BUT`, across `R-AGD-008`…`R-AGD-013` |
| Clean | **37** |
| `WARN` | **3** (2 evidence gaps, 1 non-CI-repeatable evidence) |
| `FAIL` | **0** |
| `BLOCKED` (rollout, not build) | **3** — `DO-1`, `P-9`/BI, migration application |

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/agresso-staff-deactivation` (increment 2) |
| Validated | 2026-09-28 |
| Auditor | Claude `opus` (T3) |
| Implementers | Cursor `grok-4.7-xhigh` (T-07…T-11) · Claude `opus`, prior session (T-06) |
| `author ≠ auditor` | **Holds for T-07…T-11** (different model family). ⚠️ **T-06 was authored by an `opus` Leader in a prior session**, so this validation is not model-independent for that task alone — its execution Reviewer *was* independent (Antigravity `gemini-3.1-pro-high`) |
| Branch | `new-spec-auto-sync-sec-users`, **unpushed** |

---

## 2. Summary

Increment 2 delivers the destructive write the spec exists for: a chunked, transactional three-table
cascade that disables credentials first, then roles, then the account. It ships **inert**
(`DRY_RUN` seeds to `'true'`), behind a volume ceiling and four preconditions.

**What makes this build unusually well-evidenced:** every falsifier was *executed and observed red*,
never inferred — including three the Leader ran personally when a Reviewer reasoned a red "would"
occur. The rollback is proven on **real InnoDB** over 120 rows using a two-connection design that
distinguishes *rolled back* from *never written*. And `AC.4` rests on a **live driver probe**, not on
documentation: mysql2's default flags make `affectedRows` count matched rows, so `AND is_active = 1`
is load-bearing, not decorative.

---

## 3. Task Completion — **PASS**

| Task | Status | Attempts | Reviewer | Evidence |
| --- | --- | --- | --- | --- |
| T-06 | `[x]` | 1 | Antigravity `gemini-3.1-pro-high` | PASS |
| T-07 | `[x]` | 1 | Claude `opus` | PASS |
| T-08 | `[x]` | 1 | Claude `opus` | PASS |
| T-09 | `[x]` | 1 | Claude `opus` | PASS |
| T-10 | `[x]` | 1 | Claude `opus` | PASS |
| T-11 | `[x]` | 1 (+1 recovered spawn failure) | Claude `opus` | PASS |

**Six tasks, six first-attempt PASSes, zero rework rounds.** Every task carries an `execution.md`
entry with attempt history, verification evidence and a `KZ-017` scope declaration. No
`REVIEW_WAIVED` and no `REVIEW_SKIPPED` record exists.

---

## 4. File Existence — **PASS**

All design-named artifacts exist: `staff-deactivation-config.resolver.ts` (+ spec),
`dto/deactivation-config.dto.ts`, `1790602688746-seedStaffDeactivationConfig.ts`, the three write
methods on `sec-user-deactivation.repository.ts`, `apply()` on `sec-user-deactivation.service.ts`,
six summary fields on the DTO, and the extended fixture. No orphan or duplicate fixture file.

---

## 5. Build Integrity — **PASS (with one WARN)**

| Gate | Result |
| --- | --- |
| `npm test -- --silent` | **397 suites / 3549 tests passed** |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint src test` (bare, `K-001`) | exit 0 · 1 pre-existing warning outside this spec |
| `npm run test:cov` | **90.7% stmts · 77.75% branch · 87.16% funcs · 90.34% lines** vs a 60% floor |
| `npm run test:fixtures` | ⚠️ **exits 1** — see below |

> **WARN-1 · `test:fixtures` exits 1.** This spec's fixture **PASSES** (5/5). The five failures are
> `test/fixtures/innovation-use/*`, dying on `Nest cannot create the ResultPolicyChangeModule
> instance` — a circular import verified at `eee1bc5c`, **before this spec began**, and re-confirmed
> 2026-09-28. Recorded as `RB-4`. **Consequence: until `RB-4` clears, `test:fixtures` is evidence,
> not a gate** — no CI check can distinguish a regression in this fixture from the known five.
> **Not this spec's defect; it is this spec's exposure.**

---

## 6. Requirement Coverage — **37 / 40 clean**

Audited at **scenario and clause granularity**, not by ID presence. Full clause map below; only the
three findings are expanded.

| Requirement | AC | `AND IT MUST` | `BUT` | Clean | Finding |
| --- | --- | --- | --- | --- | --- |
| `R-AGD-008` | 6 | 4 | 2 | 10 / 12 | **WARN-2, WARN-3** |
| `R-AGD-009` | 4 | 2 | 1 | 7 / 7 | — |
| `R-AGD-010` | 3 | 1 | 1 | 5 / 5 | — |
| `R-AGD-011` | 4 | 0 | 0 | 4 / 4 | WARN-4 (evidence form) |
| `R-AGD-012` | 4 | 1 | 1 | 6 / 6 | — |
| `R-AGD-013` | 4 | 1 | 1 | 6 / 6 | — |

### WARN-2 — `R-AGD-008` AC.3 has no behavioural test

> *"`app_secrets` rows whose `responsible_user_id` is a shielded, excluded or matched user are
> untouched."*

**What exists:** the unit test `writes app_secrets through manager.getRepository(AppSecret)` asserts
the generated SQL carries `responsible_user_id IN (…)`, so the statement structurally cannot reach an
id outside the list.

**What does not exist:** the fixture seeds **three** users — `9_062_001`, `9_062_002`, `9_062_003` —
and **all three are candidates** (`LIVE_USER_IDS`). No `app_secrets` row belonging to a **shielded,
excluded or matched** user is placed in the database and asserted to survive. The `-off` rows that
*are* asserted unchanged belong to candidates and prove `AC.4`, not `AC.3`.

**Risk: low.** The `IN` predicate is asserted on generated SQL (`KZ-001`-compliant) and the shield
logic is separately tested at the service tier. **But the AC as written is unevidenced**, and it is
the AC that protects everyone the run is *not* supposed to touch.

**Remediation (small):** seed a fourth user who is shielded by `EX-1`/`EX-2`, give them an active
`app_secrets` row, and assert it is still `is_active = 1` after the live run.

### WARN-3 — `R-AGD-008`'s `RSK-6` clause is satisfied by construction, not by test

> *"AND IT MUST close the live auth path in which `validation()` returns `isValid = true` with
> `user = null` (`RSK-6`) for that credential."*

**Verified at source, both halves:** the cascade sets `app_secrets.is_active = 0`, and
`app-secrets.service.ts:78` queries `where: { app_secret_uuid: clientId, is_active: true }`. A
deactivated secret therefore cannot authenticate. **The mechanism is real.**

**No test asserts the join.** Nothing proves that deactivating a secret makes `validation()` reject —
the two halves are verified independently and connected by reading.

**Context that limits the severity:** `RSK-6` itself is an explicit **non-goal** (design `NG-5`,
`OQ-D6`), out of scope, owed its own bugfix spec. This clause claims only the narrow consequence for
a retired credential.

**Remediation (small):** one test that deactivates a secret then calls `validation()` with its
`clientId` and asserts rejection.

### WARN-4 — `R-AGD-011` AC.1/AC.2 evidence is real but not CI-repeatable

`up()` → 4 keys seeded · `down()` → **exactly four** deleted with the three pre-existing keys
untouched · re-`up()` → updated, not duplicated. **Executed against the scratch schema**, recorded
verbatim in `execution.md`, and **independently re-queried by the validator** against the live
container.

**The gap is form, not substance:** it is a one-time manual observation. Re-running the suite
re-proves nothing.

**Checked before filing:** the repo has **11 migration specs across 339 migrations**, and **no seed
migration has one**. So the absence follows this repo's actual practice rather than deviating from
it — which is why this is a WARN on evidence durability, **not** a convention violation.

### Clauses verified clean — highlights

| Clause | Evidence |
| --- | --- |
| `008` AC.2 · `BUT` no partial commit | Fixture, **real InnoDB**, 120 rows, two connections. Mid-transaction read `{users:120, roles:70, secrets:0}` proves the writes reached the engine; the post-read proves they are gone |
| `008` AC.4 | **Live driver probe**: `affectedRows:1, changedRows:0` — plus **three** predicate falsifiers, one per table, all observed red |
| `008` AC.5 | Three falsifiers, one per table, each observed alone (`JG-2` satisfied — a `sec_users`-only note would not have) |
| `008` AC.6 · `AND IT MUST NOT` via `catch` | Behavioural: role id 51 (start of chunk 2) left active while chunk 1 and all secrets flipped — a genuine committed partial cascade under the mutation |
| `009` AC.4 | Asserted on the **`DataSource`**, not a zero row-delta (`DD-D10`) |
| `009` `AND IT MUST` abort on C-1/C-2/C-4 in dry-run | C-4 has an explicit dry-run test. **C-1/C-2 pass by construction**: they live in `measure()`, which has no dry-run branch and therefore cannot behave differently |
| `011` AC.3 | Four keys, four separate reds, each on its own behavioural assertion |
| `012` AC.3 · `BUT` no name fallback | Observed red under the name-match mutation |
| `013` AC.3 | `not.toHaveProperty` on the **real returned DTO instance**, not a spread that could hide a present-undefined key |

---

## 7. Linting & Code Quality — **PASS**

`eslint` exit 0, `tsc` exit 0, coverage well above floor. No `AppConfigService` import in the staff
path (grep: zero hits). No `AppSecretRepository` in the staff path (grep: zero hits). No DDL against
the shared scratch schema (`FP-51`); the only DDL is a temporary table inside a query runner released
in `finally`.

### 4R advisory findings (carried from `execution.md` — advisory only, never gating)

| Lens | Finding |
| --- | --- |
| **Risk** | **`CEILING_FRACTION` has no upper bound.** `5` instead of `0.05` yields a ceiling of 5× the active population, silently disarming the volume defence — one admin typo away. **This is what `R-AGD-011` specifies**, so changing it is a product decision, not a defect |
| **Risk** | Two `configResolver.resolve()` calls per invocation (`measure()` and stage 5b). Harmless today — disjoint keys — but per `K-016` any future TTL cache makes a config change invisible for its window |
| **Reliability** | The rollback test monkeypatches `manager.query` and never restores it. The Reviewer **tried and could not construct a leak** (TypeORM builds a fresh `EntityManager` per `transaction()`), but it rests on a library internal |
| **Readability** | The DTO imports a type from the service (DTO ← service). `import type` is erased, so no runtime cycle |
| **Readability** | `APPLY_TX_CALLBACK_START/END` markers are the only machine-checkable anchor for the `DD-D11` invariant — worth keeping |

---

## 8. Design Conformance — **PASS**

Gate order matches §20.1 exactly: resolve config → evaluate C-3 → **dry-run returns before any
transaction** → live enforces C-3 → transaction. `DD-D11` holds (no `catch` inside the callback; the
`catch` sits outside at `:231`). `DD-D12` holds (`updated_by` omitted, not set to NULL — the
Reviewer grounded this on `requirements.md` §18's *"Three tables written (`is_active` only)"*, a
stronger citation than the design's own rationale). Write order is `app_secrets → sec_user_roles →
sec_users`: credentials die first.

**Intentional deviations, all documented:**

| Deviation | Recorded |
| --- | --- |
| Implementer/Reviewer hosts differ from `tasks.md` §7 (Grok/Claude, not Codex/Antigravity) | User ruling 2026-09-28, `execution.md` |
| T-07 widened to wire C-4 to its config key | User-approved at the continue gate, `tasks.md` + `fd5a72ee` |
| `WRITE_FAILED` added to the abort-token set | T-09 Reviewer ruled conforming — no spec text closes the set, and reusing `C-3` would repeat the `JS-4` conflation |

### Cross-document figure check — one contradiction found and closed

The C-3 ceiling was asserted as **`99`** in **four documents across six sites**, while `R-AGD-010`'s
formula carries **no rounding operator** and `apply()` computes and reports **`99.25`**. The gate
behaves identically (a candidate set is an integer; 146 exceeds both), but the `ceiling` field is
**reported**, and the old figure implied a `Math.floor` that does not exist.

Corrected across all six sites; `design.md` §20.2 is now the figure's single home. **The mandated
re-grep caught the sixth site** (`HANDOFF.md:226`) that the first pass missed — the document a cold
session reads first.

**No further figure contradictions found** in this sweep.

---

## 9. Test Evidence Summary

No `test-report.md` exists (no `/akili-test` run); coverage was verified directly.

| Tier | Command | Proves |
| --- | --- | --- |
| Unit | `npm test` | Logic, gate order, config directions, SQL text. **No database claim** (`rootDir: "src"`) |
| Fixture | `npm run test:fixtures` | **The only tier evidencing any §19 claim** — cascade, InnoDB rollback, AC.4, dry run |
| Types | `npx tsc --noEmit` | Includes `test/` |
| Lint | `npx eslint src test` | Bare, no `--fix` |

**Unproven at every tier, carried forward:**

- The **HTTP path** `GET /api/tools/agresso/staff/clone/execute` and the fire-and-forget controller.
- **Seeded `app_config` driving a live write** — the fixture injects config objects. **Rollout step 4 is the only proof that will ever exist.**
- **Lock ordering under concurrency** (`JD-8`, accepted risk).
- **That `EX-1` shields anyone** (`D-15`) — see below.

---

## 10. Agent Guide / Constitution Impact — **PASS**

No `## Constitution Impact` block was recorded: no module was created, no boundary moved, no public
surface reshaped outside the spec's own module. The root guides **were** updated this session
(`CLAUDE.md`, `AGENTS.md`, `docs/model-routing.md`) to correct the Cursor model registry from
`cursor-grok-4.6-*` to the live `grok-4.7-*` family — `ae3a3b38`. CodeGraph re-index pending at
archive.

---

## 11. Remediation

| # | Finding | Severity | Effort | Owner |
| --- | --- | --- | --- | --- |
| WARN-2 | `R-AGD-008` AC.3 — seed a shielded user with an active secret, assert it survives | Low risk, real gap | ~15 lines in the fixture | Follow-up task |
| WARN-3 | `R-AGD-008` `RSK-6` — one test joining a deactivated secret to `validation()` rejection | Low | ~15 lines | Follow-up task |
| WARN-4 | `R-AGD-011` AC.1/AC.2 — evidence is one-time manual | Form, not substance | Optional; no seed migration in this repo has a spec | Accept as-is |
| WARN-1 | `RB-4` — 5 pre-existing `innovation-use` fixture suites red | Blocks using `test:fixtures` **as a gate** | Its own bugfix spec | Separate spec |

**Recommendation on WARN-2 and WARN-3:** both are ~15 lines and both cover *who must NOT be touched*
— the direction of error that is unrecoverable here. Worth closing **before** the live run, and both
fit in one small follow-up task.

---

## 12. Archive Readiness

### The build — **READY, with WARNs accepted or scheduled**

All tasks `[x]`, no `FAIL`, drift documented, evidence traceable.

### The rollout — **NOT CLEAR. Three human blockers.**

| Blocker | State |
| --- | --- |
| **Migration not applied** | The pipeline deploys code but **does not apply migrations** (`K-015`); `8431dc4b` once sat unapplied for 4 days across several deploys. Until applied, the pass **aborts on C-3/C-4 and writes nothing** |
| **`DO-1` not applied** | Eight accounts must carry `status_id = 4`. **Today `excludedExternal` is 0 and `EX-1` shields nobody** — measured, not inferred: of 1985 active users, **zero** carry status 4. A live run with that field still 0 **retires all eight** |
| **`P-9` `UNVERIFIED`, Impact High** | That those eight are the *complete* set of legitimate non-payroll users is unconfirmed; 17 further `@cgiar.org` carnet-less accounts in the `2026-08-24` block await BI. **A wrong answer is not recoverable — `app_secrets` is never re-armed by any automatic path** |

> **The trap that has already cost one wrong answer:** a `C-4` abort returns the **empty** report, so
> `excludedExternal: 0` after an abort is **not a measurement** — candidates are computed *after* the
> abort check. **Read `abortReason` before interpreting the number.**

> **Rollout step 7 restores the ceiling and `DRY_RUN`.** A numbered step, not a reminder — `F-5`
> records the opposite, and a forgotten restore disables the only volume defence invisibly and
> indefinitely.

### Next command

```text
/akili-archive docs/specs/changes/agresso-staff-deactivation
```

**Archiving records the build as complete. It does not make the rollout safe.** The three blockers
above survive the archive and must be discharged by humans before anything runs live.
