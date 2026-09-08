# Dispatch Brief — PR 1, part 2 (T-03 + T-08)

**Role:** Implementer. **Host:** `agy` · **Model:** `gemini-3.7-flash-high` · **Auditor:** separate Claude Opus session.
**Working directory:** `/Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676`
**Branch:** `JuankCadavid/AC-1676` — do not branch, do not push.

**Prerequisites — all done, do not redo:** T-01 PASS, T-02 PASS (after one retry), and the DC-8 manual check PASS against real CLARISA (`STAR-2227` → `SP01`; `STAR-3403` → `SP02`+`SP06`). The 198-project cohort is already unblocked. These two tasks harden the result; they do not unblock it.

**Read first:** `requirements.md`, `design.md`, `tasks.md` (**T-03 and T-08 only**), and `execution.md` — especially the two auditor verdicts, which name the failure pattern this brief is written against. The earlier brief `dispatch-pr1.md` still applies in full; §3 (Hard rules) is unchanged and binding.

---

## 0. The pattern to break

Both defects found so far shared one shape: **the worker's own verification could not have detected the defect.**

- **T-01** — asserted an old-vs-new comparison that was never run.
- **T-02** — ran `grep "'Confirmed'"`, which *structurally cannot match* `'Confirmed,Pending'`. The offending literal was invisible to the exact search meant to find it. Clean grep, real defect.

Neither was carelessness. Both were **gates blind to their own target**. So for each claim below, the brief names the mutation that proves the gate can fail. Run them. Paste them.

**Reporting rules that cost you a task last time** (unchanged, still binding): claim only what you ran · `not run — <reason>` is an acceptable answer, `None` in place of a substitution is not · **Deviations includes substitutions** · do not tick `tasks.md` checkboxes · do not write `PASS`.

---

## 1. Environment note (changed since the last dispatch)

The user has since edited `server/researchindicators/.env`: the stub is **off** and `ARI_CLARISA_HOST` now points at **real CLARISA** (`https://clarisatest-back.ciat.cgiar.org/`). This is a deliberate decision (spec OQ-3, closed).

Consequences for you:

- T-08's re-verification query hits the live feed directly (`curl` / a short script). The `.env` already points at real CLARISA, so **no host override is needed** — but read the response yourself rather than assuming which host answered.
- **Rule 3.5 is unchanged: never edit `.env`.** It is a symlink into another checkout and it is now in a state the user chose. `.env.example` *is* yours to edit (T-08 step 3).
- Unit suites mock CLARISA and never touch the live feed, so nothing you run is affected by the host.

---

## 2. T-03 — ToC catalog resolves the same SP set as the picker

Spec: `tasks.md` T-03 · design §4, §5.2 · requirement R-PSP-002.

Add the per-item `mapping_status` field to the SP response DTO, update `@ApiOperation`, and add the cross-endpoint parity test.

### The two blind spots, and the assertions that close them

**Blind spot 1 — equality over two empty sets.** `expect([]).toEqual([])` passes and proves nothing. **Assert non-emptiness first**, then equality.

**Blind spot 2 — a presence-assertion on the new field.** Asserting that `mapping_status` *exists* on each item proves the field was added, not that it carries **the status of the row that admitted that item**. A hardcoded `'Confirmed'` on every item would pass such a test.

Close it with a project carrying **two rows of different statuses on different codes** — e.g. `SP01` `Pending` and `SP03` `Confirmed`, both `P25` — and assert each item reports **its own** status. That is the only shape that discriminates.

### Mutations that must redden (run both, paste both)

| # | Mutation | Must redden |
| --- | --- | --- |
| M1 | Point `getHlosIndicatorsForResult` at a second, unwidened copy of the predicate | the parity test |
| M2 | Hardcode every item's `mapping_status` to `'Confirmed'` | the mixed-status test |

If either stays green, the test is not evidence — say so rather than moving on.

### Verify

```
cd server/researchindicators
npm test -- --silent bilateral
npx eslint src/domain/entities/bilateral
```

**Do not** re-run the DC-8 manual check — done, recorded, passed.

---

## 3. T-08 — **DELETE the CLARISA stub apparatus** (re-scoped)

> **This task changed after the brief was first drafted.** It previously read *"harvest statuses, regenerate the fixture, invert D-4"*. It is now a **deletion**. The spec has been updated — read `tasks.md` T-08, design **§5.4** and **D-PSP-11** before starting, not the old wording.

**Why:** the stub carries its own removal condition, written verbatim in five files:

> *"when CLARISA publishes external_code and phase-2026 data, unset the flag and delete the stub, fixture, dictionary, reference capture and converter; **do not maintain them**"*

Both halves are now true, so repairing the fixture would mean maintaining an artifact the code says to delete.

### Re-verify the enabling measurement FIRST — it is a live reading, not a fact (K-013)

Measured 2026-08-20 against `clarisatest-back`: 1210 projects · `external_code` **911/1210** · phase `{2025: 299, 2026: 911}` · the repo's shipped predicates (`project-selector.util.ts`) at phase 2026 → **198 eligible, 198 carrying `external_code`**.

CLARISA test is periodically reset. **Re-run this before deleting anything.** If `external_code` no longer covers the full phase-2026 eligible cohort, **STOP and report** — R-PSP-007 is void and the stub stays. Deleting on a stale reading is the one unrecoverable mistake available in this task.

### Work

1. Delete `src/domain/tools/clarisa/stub/` **in full** — router, mount, config, both specs, `tools/harvest-reference.ts`, `tools/convert-export.ts`, `tools/convert-export.spec.ts`, all four `fixtures/*.json`.
2. Remove the stub mount call **and its import** from `src/main.ts`. It runs before `listen()` and outside the Nest pipeline — take out the call, leave the surrounding bootstrap order untouched.
3. Retire `ARI_CLARISA_STUB_ENABLED` from `.env.example`. **Never touch `.env`** (rule 3.5 — symlink into another checkout).
4. Annotate `docs/specs/archive/2026-08-19-bilateral--clarisa-fixture-stub/requirements.md`: a dated note that the removal condition fired, **plus M-14's correction** — the `493` population was already filtered to `Confirmed`; the feed holds **1847** rows (493 `Confirmed`, 1354 `Pending`). **Annotate, never overwrite** (K-003, KZ-007).

### The blind spot in this task, and the gate that closes it

**Deleting files cannot break the suites you deleted.** A scoped green run proves nothing here — it can only break the suites that *remain*, and those live outside `bilateral`.

So: **run the full server suite** (`npm test -- --silent`), and **record the suite/test counts before and after**. The drop must equal exactly what you removed. A smaller total is expected; a **different failure** is the defect.

### Mutation that must redden (run it, paste it)

Leave **one** import of a deleted module behind — the `main.ts` mount import is the natural one — and run `npm run build`. **It must fail.** If the build passes with a dangling import, the build is not gating this task, and that fact is worth more than a green report.

### Verify

```
cd server/researchindicators
grep -rn "clarisa-stub\|clarisa-projects.fixture\|ARI_CLARISA_STUB_ENABLED" src .env.example   # expect ZERO
npm test -- --silent
npx eslint src
npm run build
```

### Hard stop

`grep -rln "clarisa-projects.fixture\|clarisa-stub" src` should name **only** files inside `stub/` plus `main.ts`. If it names anything else, **stop and report** — that falsifies the closed-blast-radius premise this whole task rests on, and it is a finding, not an obstacle to route around.

Delete nothing outside `stub/` beyond the two named edits.

## 4. Order, reporting, scope

Do **T-03 first**, report, then **T-08**, report. They are independent, but T-08 rewrites a large artifact — keeping them separate keeps the diffs reviewable and a problem in one from contaminating the other.

**Out of scope:** T-04, T-05, T-06, T-07, T-09. No client package, no entity, no `db/migrations/`, no `.env`.

Append one `execution.md` block per task in the established format, including the **Deviations** and **What I could not verify** sections. Then stop and report:

1. Task id and one-line outcome
2. Files changed
3. Every mutation's red output, verbatim, **including the `Test Suites:` / `Tests:` totals line** — the T-02 retry record omitted it
4. Green results
5. Deviations (substitutions count) and anything not run

If the fixture diff shows unexpected movement, or a suite outside `clarisa-stub` breaks: **stop and report rather than adapting.** A worker that surfaces a blocker is doing its job; silence is recorded as a runtime failure.
