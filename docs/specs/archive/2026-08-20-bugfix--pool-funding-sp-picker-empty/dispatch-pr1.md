# Dispatch Brief — PR 1 (T-01 → T-02 → T-03 → T-08)

**Role:** Implementer. You write code and tests. You do **not** review your own work, apply migrations, or mark tasks complete on your own judgment.
**Host:** Antigravity (`agy`) · **Tier:** T2 Coder · **Model:** `gemini-3.7-flash-high`
**Auditor:** a separate Claude Opus session — `author ≠ auditor` is the point of this split. Do not soften your report to look clean; a hidden problem costs a rework round, a reported one costs a sentence.

**Working directory:** `/Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676`
**Branch:** `JuankCadavid/AC-1676` (already checked out — do not branch, do not push)
**Server package:** `server/researchindicators` · **Client package:** `client/research-indicators`

---

## 1. Read these first, in this order

1. `docs/specs/bugfix/pool-funding-sp-picker-empty/requirements.md`
2. `docs/specs/bugfix/pool-funding-sp-picker-empty/design.md`
3. `docs/specs/bugfix/pool-funding-sp-picker-empty/tasks.md` — **T-01, T-02, T-03, T-08 only**
4. Root `CLAUDE.md` §4.1 (server conventions) and §4.3 (shared rules)
5. `server/researchindicators/src/CLAUDE.md`

The spec is the contract. Where this brief and the spec differ, **the spec wins** — and tell the auditor about the difference instead of picking silently.

**Load these skills before writing code:** `nestjs-expert`, `systematic-debugging`, `tdd` (T-02), `error-handling-patterns` (T-02).

---

## 2. Scope — exactly four tasks, in this order

| Order | Task | One line |
| --- | --- | --- |
| 1 | **T-01** | Extract `resolveMappedProject()` — behavior-preserving refactor, no behavior change |
| 2 | **T-02** | Accepted-status predicate + env var + three call sites — **owns the regression test** |
| 3 | **T-03** | ToC catalog resolves the same SP set as the picker |
| 4 | **T-08** | Fixture statuses harvested, `CONFIRMED_STATUS` deleted, D-4 inverted, M-14 note |

**Out of scope for this dispatch:** T-04, T-05, T-06, T-07, T-09. Do not touch the client package, the entity, or `db/migrations/`.

**Stop and report after EACH task.** Do not chain all four and report once. A FAIL on T-01 must not drag three tasks with it.

---

## 3. Hard rules — violating any of these fails the task regardless of the code

### 3.1 The red must be SEEN, not asserted

This is a **bug fix**. Its entire value is the failure observed *before* the fix. If you write the test and the fix in one pass, the red never existed and the task is not done — the code may be perfect and the task still fails review.

For every gate you add:

1. Run it on current `HEAD`, **before** your change.
2. Copy the failure output **verbatim** into `execution.md`.
3. Then make the change.
4. Run it again, record green.

A gate you did not watch fail is not evidence. Never write "this test would fail before the fix" — either you ran it and have the output, or you have nothing.

### 3.2 Never claim what you did not run

Do not describe a command's result you did not execute. Do not infer an outcome from reading code. If you could not run something, say **"not run"** and why. An honest gap costs one sentence; a fabricated pass costs the whole review round.

### 3.3 Do not tick checkboxes in `tasks.md`

Leave every `- [ ]` alone. The auditor records the PASS in `execution.md` first, then flips it. *(A commit hook enforces this on Claude Code but not on Antigravity — so here it is on you.)*

### 3.4 Do not apply migrations, and do not touch the database

No `migration:run`, no `migration:revert`, no `INSERT`/`UPDATE`/`DELETE` against `192.168.20.210`. The Dev database is **shared and not disposable**. PR 1 creates no migrations at all; if you think you need one, stop and report instead.

### 3.5 Never edit `server/researchindicators/.env`

It is a **symlink into another checkout** — editing it changes the other working tree. Override per-command instead (see T-08).

### 3.6 Verify your own scope only

Run the scoped suites named below. **Do not run the full test suite** — the auditor re-measures it in isolation afterwards. Two full-suite runs in parallel produce phantom failures that cost real hours.

### 3.7 Lint: `npx eslint`, never `npm run lint`

`npm run lint` carries `--fix`: it **mutates files and measures nothing**, so it cannot gate. Use bare `npx eslint <path>` to verify. You *may* run `npx prettier --write <path>` to format — that produces a file and measures nothing, so it cannot contaminate evidence.

---

## 4. Per-task instructions

### T-01 — Extract the resolution seam

`bilateral.service.ts` duplicates the same five-step chain twice: `getScienceProgramsForResult` (`:153`–`:202`) and `getHlosIndicatorsForResult` (`:267`–`:322`). Extract one private `resolveMappedProject()` returning a discriminated union (`unmapped` | `mapped` + project + mapping row).

- **Do not add `stale`** — that is T-04, out of scope here.
- The two branches' `clarisa_project` null/snapshot semantics **differ today**. Both must survive byte-identical.

**Pass condition is a comparison, not a green suite.** Capture the full response object from **both** public methods over four inputs — mapped, no-agreement, no-mapping-row, unresolvable-project — before and after your change. Require **zero divergences** in the whole object, not just `mapping_status`. The existing tests were written for the old shape and may not cover all four branches, so "the suite is green" does not prove preservation.

**Named red input:** flip one branch's `clarisa_project` from the stored snapshot to `null`. The existing suite must redden. If it does **not**, say so — it means the suite does not pin this refactor, and that fact is more valuable than a clean report.

**Verify:** `cd server/researchindicators && npm test -- --silent bilateral`

---

### T-02 — Predicate + env + three call sites — the regression test lives here

Create `src/domain/entities/bilateral/utils/sp-mapping.predicate.ts`: pure constants and functions, **no Nest imports** (mirror `domain/tools/clarisa/projects/utils/project-selector.util.ts`). It holds the accepted-status set and the four-clause SP-row rule.

Point these three at it — **status clause only**:
- `isProjectScienceProgramMapping` (`bilateral.service.ts:490`)
- `deriveScienceProgramMetaByCode`
- `hasSciencePrograms` (`clarisa-projects.service.ts:59`)

Add `ENV.BILATERAL_ACCEPTED_SP_STATUSES` in `domain/shared/utils/env.utils.ts`, reading `ARI_BILATERAL_ACCEPTED_SP_STATUSES`, default `Confirmed,Pending`. Declare it in `.env.example` beside `ARI_BILATERAL_ACTIVE_PORTFOLIO`.

**Leave alone:** the portfolio clause, the AOW clause, the `/^SP\d/i` clause, and `hasSciencePrograms`'s `cgiar_entity_type_object.code === 22` narrowing. That last one is a deliberate recorded decision (**D-PSP-8**) — do not "harmonize" it.

**The regression test drives `getScienceProgramsForResult`** (existing code), not the new pure function. A test over code you just created is green from the moment it compiles and could never have been red.

**Named red input — use this object verbatim.** A CLARISA project whose only mapping row is:

```
{
  status: 'Pending',
  global_unit_object: {
    smo_code: 'SP01',
    name: 'Multifunctional Landscapes',
    cgiar_entity_type_object: { prefix: 'SP', code: 22 },
    portfolio_object: { acronym: 'P25' }
  }
}
```

On current `HEAD` the endpoint returns `science_programs: []`. After your change it returns exactly `['SP01']`.

**Second gate — the falsifiability pin (AC.4).** With the accepted set forced to `Confirmed` alone, the same input must return `[]` again. If it does not, you have hardcoded a widen instead of making the set the discriminator, and the task fails. Add this as a test case.

**Third gate.** A project with one `Rejected` row and one `Pending` row returns only the `Pending` one.

**Verify:**
```
cd server/researchindicators
npm test -- --silent bilateral
npx eslint src/domain/entities/bilateral src/domain/tools/clarisa/projects
grep -rn "'Confirmed'" src/domain/entities/bilateral src/domain/tools/clarisa/projects --include=*.ts | grep -v spec
```
The grep must show **no surviving inline status literal** in the SP predicates.

**Do not** attempt the manual Dev verification — that is the auditor's, against real CLARISA, and it needs a 5-minute cache window.

---

### T-03 — Catalog parity

Confirm `getHlosIndicatorsForResult` inherits T-02 through the shared derivation. Add `mapping_status` to each `science_programs[]` item in `dto/bilateral-science-programs.response.dto.ts` (the CLARISA status that admitted the row). Update the `@ApiOperation` description. Add the cross-endpoint equality test.

**Assert non-emptiness first, then equality.** Two empty arrays are trivially equal and prove nothing — an equality test over `[] === []` is the exact shape of a gate that cannot fail.

**Named red input:** point `getHlosIndicatorsForResult` at a second, unwidened copy of the predicate. The equality test must redden. If it stays green, it is comparing nothing — report that.

**Verify:** `npm test -- --silent bilateral`

---

### T-08 — Fixture statuses harvested; D-4 inverted

Extend `stub/tools/harvest-reference.ts` to derive a third artifact from the fetch it already makes: a `(normalized external_code, smo_code) → status` map. Source `convert-export.ts`'s status from it and **delete `CONFIRMED_STATUS`** (`convert-export.ts:63`). A pair absent from the map **fails loudly**, exactly like the existing unknown-program-code behavior — never a silent fallback to `Confirmed`. Then regenerate the fixture and invert D-4 in `clarisa-stub.fidelity.spec.ts`.

**Harvesting needs the real CLARISA host, and `.env` currently points at the stub.** Override on the command line — **never edit the symlinked `.env`**:

```
cd server/researchindicators
ARI_CLARISA_HOST=https://clarisatest-back.ciat.cgiar.org/ \
  ./node_modules/.bin/ts-node -T src/domain/tools/clarisa/stub/tools/harvest-reference.ts
```

`dotenv` does not override already-set process env by default, so the prefix should win — but **verify from the script's own output which host it actually read** rather than assuming. If it read the stub anyway, stop and report; do not work around it by editing `.env`.

**Expected outcome, so you can tell success from silent failure:** the real feed returns ~1210 projects; the 198-project cohort's 283 SP rows come back **all `Pending`**. A regenerated fixture that is still uniformly `Confirmed` means the harvest did not take effect.

**Named red input (AC.2 — by mutation, not assertion):** regenerate the fixture with every status forced to `Confirmed` and run the fidelity suite. The inverted D-4 **must fail**. Asserting the inversion without watching it fail is a presence-check that proves nothing.

**Do not break the other fidelity invariants.** Re-run the whole stub suite and confirm they all still hold: `global_unit_object` byte-equal to the dictionary, the `{22, 23, 24}` entity-code spread (never 22 alone), the 11 mapping-level keys, numeric `allocation`, lowercase `high|medium|low`.

**Also update** `docs/specs/archive/2026-08-19-bilateral--clarisa-fixture-stub/requirements.md`: add a dated correction note on **M-14** (and the population of M-11/M-12). Its "status histogram over 493 real mappings → `{Confirmed: 493}`" was computed over a set already filtered to `Confirmed`; the feed holds 1847 rows — 493 `Confirmed`, 1354 `Pending`. **Preserve the superseded text**; annotate, never overwrite.

**Verify:**
```
npm test -- --silent clarisa-stub
npm run build && ls -l dist/**/clarisa-projects.fixture.json
```
That second command is the only gate for the fixture reaching the build output — a unit suite runs over `src` and structurally cannot see a fixture missing from `dist`.

---

## 5. `execution.md` — the format the auditor reads

Create `docs/specs/bugfix/pool-funding-sp-picker-empty/execution.md` and append one block per task. Do not write `PASS` anywhere — that word is the auditor's.

```markdown
## T-0N — <title>

- **Worker:** agy · gemini-3.7-flash-high · <date>
- **Files changed:** <paths, with +/- line counts>

### Gate observed RED (before the fix)
Command: <exact command>
Input:   <the concrete input that produced the failure>
Output:
```
<verbatim failure output — do not summarize, do not trim>
```

### Gate observed GREEN (after the fix)
Command: <exact command>
Output:  <summary line only>

### Other verifications
| Command | Result |
| --- | --- |
| <exact command> | <verbatim result, or "not run — <why>"> |

### Deviations from the spec
<Anything you did differently, and why. "None" if none.>

### What I could not verify
<Named gaps. "None" is a valid answer only if it is true.>
```

---

## 6. Report back

After **each** task, return:

1. Task id and one-line outcome
2. Files changed
3. The red output, verbatim
4. The green result
5. Anything you could not verify, or did differently

Then **stop and wait**. Do not start the next task.

If you get stuck, blocked, or find that the spec is wrong about the code: **say so and stop**. A worker that reports a blocker is doing its job. A worker that goes quiet is indistinguishable from a worker that found nothing — and silence gets recorded as a runtime failure, not a pass.
