# Execution Log — CLARISA projects phase as an admin-editable variable

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral/clarisa-phase-config-variable` |
| Started | 2026-08-18 |
| Leader | Claude Opus 5 (T1) |
| Implementer | `akili-implementer` wrapper (sonnet, T2) |
| Reviewer | `akili-reviewer` wrapper (opus, T3) — not yet spawned |
| Budget (`design.md` §11) | **3 tasks · ~380 LOC · ~5 review rounds** (revised by the T-01 pivot; was 4 · ~450 · ~6) |
| Approval Mode | `gated` |

---

## Task Execution History

### T-01 — Seed the `app_config` row and prove Tier 2 governs the picker

- **Status:** `[~]` — **PIVOT**, stopped before any write
- **Date:** 2026-08-18
- **Implementer attempts:** 1 (stopped at its own pre-flight stop rule; no code authored)
- **Reviewer:** not spawned — there is no diff to audit

**Pre-flight decision by the Leader.** T-01's verification requires executing a migration. The wired target (`migration:dev:execute` → `orm.config.ts:72` → `dataSourceTarget.CORE` → `ARI_MYSQL_*`) is the **shared on-premise Dev database**; no scratch schema is wired and `docker-compose.yml` defines no DB service. Root `CLAUDE.md` §4.3 makes that a human decision. Escalated to the user, who authorized running against shared Dev. Recorded before delegating.

**Implementer outcome.** The brief mandated a read-only blast-radius check before any write. It ran:

```
npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts
...
[X] 368 ScopePoolFundingValidationToPrimarySp1786679227000
[ ] SeedClarisaMappingPhase1786738949211
```

One migration pending, and **not the one T-01 would create**. The Implementer honoured its stop rule, wrote no file, ran no write command, and reported. Correct behaviour — recorded as such.

---

## Pivot Record: T-01

### Blocker

**The spec's central premise is false.** `requirements.md` §1 and the proposal both assert that the `app_config` row for `ARI_CLARISA_PROJECTS_PHASE` "has never existed" and that the spec's job is to create it. A migration that creates it **already exists on this branch**:

`server/researchindicators/src/db/migrations/1786738949211-seedClarisaMappingPhase.ts`
committed as `8431dc4b` — *"[SPEC:bugfix/bilateral-alliance-selector] feat(app-config): seed the mapping-phase row so the phase is admin-editable"*.

That commit message is, almost word for word, this spec's stated intent.

### What the existing migration already does

| Aspect | Existing migration | What T-01 specified |
| --- | --- | --- |
| Key | `ARI_CLARISA_PROJECTS_PHASE` | same |
| `simple_value` | `'2026'` | same (`DD-1`) |
| Idempotency | `ON DUPLICATE KEY UPDATE` | not specified |
| `down()` | Parameterized **and** backticks `` `key` `` | same requirement (`DD-6`) |
| `category` / `subcategory` | `API` / `CLARISA` | `CLARISA` / `PROJECTS` |

It is **better than the exemplar this spec told the Implementer to imitate**: `1781879906673-AddNewEnvCl.ts` leaves the reserved word `key` unescaped in `down()`, and the existing seed migration already fixes that. `DD-6` was written to avoid inheriting a defect that had already been avoided.

The only real divergence is `category`/`subcategory`, which is cosmetic — the resolver reads by `key` and never consults either field.

### Why the picker is still empty in dev — corrected causal chain

The migration is committed **and present in `origin/dev`**, yet `migration:show` against the Dev database reports it **pending**. So the row does not exist in Dev not because nobody wrote the migration, but because **that migration has never been applied to the Dev database**.

The symptom diagnosis in `requirements.md` §1 stands unchanged and is still evidence-backed (CLARISA test serves 299 projects, all `phase=2025`; the resolver falls through to `2026`; the funnel ends at 0). What was wrong is the *remedy*: this is an unapplied-migration problem, not a missing-migration problem.

### Root cause of the specification error — Leader's own

During `/akili-propose` the Leader searched for prior art with:

```
grep -rln "app_config" src/db/migrations/ 2>/dev/null | tail -6
```

There are **nine** such migrations. `tail -6` returned six, in `grep -l`'s arbitrary order, and the excluded three included `1786738949211-seedClarisaMappingPhase.ts` — the one file that would have prevented this entire spec from being written as it was.

The cap was silent: the output looked like a complete answer. This is the failure mode the methodology's *no silent caps* rule exists for, and it is a fresh instance of **K-003** (a search that misses its own target). Every downstream artifact — proposal §3, `requirements.md` §1 and §5, `DD-1`, T-01 — inherited the false premise without a single one of them being able to detect it.

### Alternatives

| # | Option | Effect on the spec |
| --- | --- | --- |
| **A** | **Drop T-01.** Apply the existing pending migration (an ops action, no code). Accept `API`/`CLARISA` as the row's grouping. Amend `requirements.md` §5, §1 and `DD-1` to describe applying rather than creating | Spec drops to 3 tasks. `R-CPC-001` / `R-CPC-002` are satisfied by work already merged |
| **B** | **T-01 becomes an UPDATE migration** correcting `category`/`subcategory` to `CLARISA`/`PROJECTS` | Keeps 4 tasks; spends a migration on a cosmetic relabel the resolver never reads |
| **C** | **Keep T-01 as an INSERT** | **Unviable.** `key` is the entity's `@PrimaryColumn`; a second INSERT for the same key collides once the pending migration lands |

### Recommended direction

**Option A.** The capability this spec exists to deliver — a visible, admin-editable phase row — is already implemented and merged; it is simply undeployed. Spending a migration on a cosmetic relabel (B) adds schema churn to a shared database for a field no code reads. The genuinely new work in this spec is `T-02` (phases endpoint), `T-03` (year selector) and `T-04` (`.env.example`), and none of it is affected by this pivot.

### Status

**Option A approved by the user, 2026-08-18. Pivot applied.**

- `requirements.md` — §1 carries a correction banner; `R-CPC-001` / `R-CPC-002` marked as delivered by merged work; §5 values corrected to what `8431dc4b` ships (`API` / `CLARISA`); D-1/D-2/D-3 struck from the defect-class table; R-3 marked moot; NFR-CPC-004 scoped out.
- `design.md` — §1 two parts not three; §3 migration row struck; §4 reframed; §6.3 retired; `DD-1` superseded-in-mechanism; `DD-6` moot-but-recorded; budget 4→3 tasks / ~450→~380 LOC / 6→5 rounds; X-1 and X-2 retired, **X-6 added** (the merged migration is pending on Dev).
- `tasks.md` — T-01 struck with its resolution; dependency graph, T-03's `Depends on`, coverage-closure rows and budget updated. **The task ID is kept, not renumbered**, so existing references resolve.
- `proposal.md` — **body left unedited** as the point-in-time record of what was approved; a superseded-in-part banner was prepended.

**Correction closure — two-direction sweep run and re-verified.** Forward: grepped the superseded values across the spec folder, which caught five survivors the pivot analysis had not cited (`design.md` "Three moving parts", the architecture-diagram annotation, §6.3's exemplar sentence, the Phase-3 budget note, and `requirements.md`'s OQ resolution line). Backward: grepped every reference to `DD-6`, §6.3, `R-CPC-001` and `R-CPC-002` and re-read each referrer. Re-run confirms zero survivors.

No code was written and no database was touched beyond a read-only `migration:show`.

### Ops action owed (outside this spec)

Apply `SeedClarisaMappingPhase1786738949211` to the Dev database. Until then the variable will not appear on the Configuration Variables screen and `T-03`'s human visual check cannot complete end to end (`design.md` X-6).

---

### T-02 — Phases endpoint derived from the eligible cohort

- **Status:** ✅ **PASS** (first attempt, no rework)
- **Date:** 2026-08-18
- **Implementer attempts:** 1 · **Reviewer verdict:** `STATUS: PASS`
- **Requirements covered:** `R-CPC-003` (both scenarios, server half), `NFR-CPC-002`, `NFR-CPC-003`

**Files changed**

| File | Change |
| --- | --- |
| `dto/clarisa-project-phase.types.ts` | **new** — `ClarisaProjectPhaseCount` / `ClarisaProjectPhasesResponse` |
| `clarisa-projects.service.ts` | + `getEligiblePhases()` |
| `clarisa-projects.controller.ts` | + `@Get('phases')` handler |
| `clarisa-projects.service.spec.ts` | +4 tests |
| `clarisa-projects.controller.spec.ts` | +6 tests |

**Verification (Implementer, from `server/researchindicators`)**

```
npm test -- --silent   → 326 suites / 2271 tests passed
npx eslint src/domain/tools/clarisa/projects → clean (no output)
```

Prettier ran as a fixer, the bare `npx eslint` as the gate — K-001-compliant.

**Leader note — artifact validated before dispatch (K-011).** The new DTO file was **untracked**, so `git diff` excluded it; the Reviewer would have audited an incomplete artifact. Staged with `git add -N` before extracting the diff (313 insertions across 5 files, symbol under audit present 12×).

**Reviewer summary.** All five clause-coverage rows have a passing, non-trivial test. `getEligiblePhases` derives from the pre-phase eligible cohort exactly as `DD-2`/`DD-5`/§6.1 require — no circular read, no additional CLARISA call. Controller handler is a thin `ResponseUtils.format` delegate with correct roles and inherited class-level Swagger decorators.

The Reviewer independently corroborated the evidence rather than accepting it: `2271` is exactly `+10` over the `2261` baseline in root `CLAUDE.md` §4.3, and the diff adds exactly 10 tests.

**Judgment call assessed and accepted.** The Implementer folded non-numeric phase strings into `phaseAbsentCount` — not enumerated in the spec's "null/undefined/blank". The Reviewer ruled it defensible and *disclosed* (the DTO comment states it), noting the alternatives are worse: emitting a non-numeric phase breaks the `phase: number` contract and the numeric sort, while dropping it silently loses the project.

#### ADVISORY (4R lenses — recorded, never gating, never a new task)

| Lens | Finding |
| --- | --- |
| Reliability | **An empty eligible cohort returns `{ phases: [], phaseAbsentCount: 0 }`, indistinguishable from "cohort exists, no phases parsed".** T-03's empty-state hint would say "CLARISA publishes no phase data" for a state that is really "no eligible projects at all" → **carried forward, see below** |
| Reliability | Descending order is implemented but **unasserted** — every service fixture yields ≤1 year, so an inverted comparator would not redden |
| Reliability | No observability on the zero-phase path; `listBilateralProjects` warns when its eligible set is empty, `getEligiblePhases` is silent |
| Risk | `Number()` accepts `"2025.5"` and `"Infinity"`; `Number.isInteger` would exclude them. Implausible upstream today |
| Readability | No e2e case for the new route. Sibling `bilateral` has none either, so local practice is consistent — recorded so the omission is a choice |
| Readability | Tag typo: service spec comment writes `KZ-013` where every other reference uses `K-013` |

#### Forward pointer → T-03 (must be copied into its brief)

The first advisory is not merely advisory *for T-03*: `R-CPC-003` scenario 2 requires the client to **"make clear that no phase data is available upstream, rather than implying there are no projects."** With `phaseAbsentCount: 0` the client cannot tell the two apart.

**T-03's brief MUST state that the empty-state hint branches on `phaseAbsentCount > 0`**, and must render a different message when both `phases` and `phaseAbsentCount` are empty. This is implementation of an existing requirement, not new scope.

---

### T-03 — Editable year selector in the config edit modal

- **Status:** `[~]` — **code PASS, task NOT closed.** The human visual check (D-7) is still owed and is blocked upstream by **X-6**
- **Date:** 2026-08-18
- **Implementer attempts:** 1 · **Reviewer verdict:** `STATUS: PASS`
- **Requirements covered:** `R-CPC-004` (all clauses), `R-CPC-003` client half

**Files changed:** `edit-environment-variable-modal.component.{ts,html,spec.ts}`, `bilateral-project-mapping.interface.ts`, `api.service.ts` — 397 insertions.

**Verification (Implementer, from `client/research-indicators`)**

```
npm test -- --silent   → 6402/6405 passing
npx eslint <4 touched files> → clean
npm run build          → Application bundle generation complete
```

**Leader re-measurement of the 3 failures.** The Implementer claimed they were pre-existing. Not accepted on assertion — verified: the diff touches neither `to-promise.service.*` nor `src/environments/`, and `environment.ts` is **gitignored** (`client/.gitignore:41`), so its URL-substring assertions fail on this checkout regardless of the change. Structurally impossible for this diff to have caused them. Claim confirmed.

**Forward pointer from T-02 — honoured.** `phaseEmptyHint()` branches on `phaseAbsentCount() > 0`, with three genuinely distinguishable states in both component and template: no-phase-data, no-eligible-projects, request-failed. The failed request sets a dedicated error signal rather than folding into an empty array — the swallow-into-empty pattern that made the original defect invisible is **not** repeated.

**Reviewer summary.** All eight clause-coverage rows have a real, non-trivial test asserting against the actual PrimeNG `Select` instance. `DD-3`/`DD-4`/`DD-7` each implemented and asserted. The read-only clause reaches the editable input and the overlay trigger, not just the host. No hex literal introduced; both tokens have dark-mode variants.

The Reviewer verified rather than assumed on three points where assuming was the easy path:
- Read the **PrimeNG 19 source** to confirm `editable` round-trips an unpublished year (`editableInputValue` falls back to `modelValue()`), and that `[disabled]` reaches the editable `<input>` — the binding easiest to miss.
- Checked whether `.fs-*`/`.rs-*` token classes were the required alternative to `text-[15px]`: `src/styles/responsive-size.scss` **does not exist in this tree** and no such class is defined anywhere, so the arbitrary sizing is the file-wide convention, not a violation.
- Confirmed **KZ-001**: no `overrideComponent`/stub anywhere in the spec; `By.directive(Select)` asserts on the real instance. The green suite is over real rendering.

#### ADVISORY (recorded, never gating, never a new task)

| Lens | Finding |
| --- | --- |
| Reliability | `loadPhaseOptions()` has no `try/finally` — `phaseOptionsLoading` would latch `true` forever on a synchronous throw, leaving the select permanently disabled. The Reviewer checked the real path first: `ToPromiseService.TP` wraps every call in `catchError`, so HTTP errors cannot reject. Exposure is narrow |
| Reliability | No request sequencing; the `effect()` refires per `editingItem()` identity and two in-flight responses could land out of order |
| **Risk (R2)** | **`DD-7` and `DD-3` interact.** PrimeNG sets the editable input's text to the option **label**, not its value — after picking a year the field visibly reads `2025 (25)` while the model is correctly `2025`. Saving is safe, but an admin who then edits that text in place produces `simple_value = "2025 (25)"`. Not a spec violation (`R-CPC-002` guarantees a non-numeric value falls through), but it is a silent no-op → **added to the HITL visual checklist below** |
| A11y | `inputId` is set but no `<label for>` references it; the "Value" caption is a bare `<span>`, matching the JSON branch's existing convention. A `<label for>` would be a one-line WCAG improvement here and in that branch |

#### Why T-03 is `[~]` and not `[x]`

`tasks.md` T-03 *Done* row 3 requires the human visual check recorded in `execution.md`, and states: *"A green suite is not a substitute for this check and must not be reported as one."* It is not done. Marking `[x]` on a green suite would be exactly the substitution the task forbids.

**HITL visual checklist (owed, blocked by X-6 until ops applies the pending migration):**

1. The selector renders; years and counts are readable.
2. Typing a custom year works and persists.
3. The empty-state hint reads "no phase data upstream", not "no projects".
4. **After selecting a year, confirm what the editable field displays** — per advisory R2 it will read `2025 (25)`, and editing that text in place would save a non-numeric value.

---

### T-04 — Document the variable in `.env.example`

- **Status:** ✅ **PASS** on attempt **3 of 3** — two Reviewer FAILs, both correct
- **Date:** 2026-08-18
- **Requirements covered:** `R-CPC-005` (scenario + `AND IT MUST` clause)
- **Files changed:** `server/researchindicators/.env.example` only (Leader-verified via `git status --porcelain -- server/`, which the read-only Reviewer cannot run)

**Why a 10-line comment consumed the full rework budget.** T-04's gate is *truth, not presence* — a grep proves the line exists, not that it is correct. Both FAILs were factual errors in the comment that a presence-check would have passed:

| Attempt | Claim written | Reality | Verdict |
| --- | --- | --- | --- |
| 1 | A non-numeric value in this env var "falls back to 2026" | Tier 3 **throws `BadRequestException`** (`mapping-phase.resolver.ts` L108-114). A typo'd value breaks the picker on every call | FAIL |
| 2 | 2026 is reached "**only** when BOTH this variable and the row are unset or blank" | Over-corrected. A non-numeric, inactive, missing **or unreadable** row plus an unset env var also reaches 2026. The sentence contradicted the one directly above it | FAIL |
| 3 | 2026 whenever the env var is unset/blank **AND** the row yields no numeric value (missing, inactive, blank, non-numeric, or unreadable) — a bad row degrades, it does not fail | Verified against L71-119 | **PASS** |

**Both failures are the same class:** a sentence that reads as precise but does not match the cascade — first too permissive, then too strict. The resolver deliberately gives Tier 2 and Tier 3 **opposite** failure semantics (warn-and-fall-through vs throw), and a comment that flattens them misleads exactly the operator it is written for.

**Reviewer's final verification went past the brief.** It confirmed the five-path enumeration is exhaustive (nothing else sits between `getRepository` and the numeric return that isn't inside the `try`), independently re-read the `catch` at L98-104 to confirm it only logs, and checked `env.utils.ts:45` — noting that **without** its `.trim()`, a whitespace-only value would reach `Number('   ') === 0` and return `0` rather than 2026, which would have made the sentence false. It is true only because of that trim.

**Leader note.** The Reviewer flagged that it could not verify file scope (no `Bash`). The Leader ran that check instead — `git status --porcelain -- server/` shows only `.env.example`. Recording the split so the gap is a division of labour, not an unverified claim.

---

## Summary — all tasks resolved

| Task | Status | Outcome |
| --- | --- | --- |
| T-01 | dropped | Pivot — the migration already existed and is merged (`8431dc4b`), pending application to Dev |
| T-02 | `[x]` | PASS, 1 attempt — phases endpoint |
| T-03 | `[~]` | Code PASS, 1 attempt — **human visual check owed**, blocked by X-6 |
| T-04 | `[x]` | PASS, 3 attempts — 2 factual FAILs caught |

### Budget tripwire — LOC exceeded, escalated

| Metric | Budgeted | Actual | Delta |
| --- | --- | --- | --- |
| Tasks | 3 | 3 | on target |
| Review rounds | ~5 | 5 | on target |
| **LOC** | **~380** | **~720** | **+90%** |

**Cause: test volume, not scope creep.** No production requirement was added. The budget assumed ~220 test lines; actual is ~476 across T-02 (216) and T-03 (260). The clause-coverage tables written during `/akili-specify` demanded a test per scenario **and per `BUT`/`AND IT MUST` clause** — 13 clauses across the two tasks — and each needs its own fixture. The estimate priced the requirements, not the clause count they implied.

Production code came in at ~244 lines against an implied ~160 — within noise. **The mis-estimate is in the spec-authoring step, not the execution.**

### Outstanding, outside this spec

1. **Ops action (X-6):** apply `SeedClarisaMappingPhase1786738949211` to the Dev database. Until then the variable does not appear on the Configuration Variables screen and T-03's visual check cannot complete.
2. **T-03's HITL visual checklist** — four items, recorded in T-03's entry above, including advisory R2 (the editable field displays the option *label* `2025 (25)`, not the value).

---

### T-03 — HITL visual check COMPLETED (2026-08-18)

- **Status:** `[~]` → **`[x]`** — the human visual check owed since the code PASS is done
- **Verified by:** Juan Carlos Cadavid
- **Where:** local stack (`localhost:4200`) against the **shared Dev MySQL** and CLARISA `clarisatest-back`. Same client build as deployed dev; the deployed instance differs only in its `ARI_CLARISA_HOST`, which is not readable from the repo

**Checklist results — all four**

| # | Item | Result |
| --- | --- | --- |
| 1 | Selector renders, years and counts readable | ✅ offered **`2025 (25)`** — which also proves T-02's endpoint returns `[{phase: 2025, count: 25}]` end to end |
| 2 | Free entry works (`DD-3` `editable`) | ✅ control accepts typing |
| 3 | Empty-state hint says "no phase data", not "no projects" | ✅ observed on the production-pointing run: *"CLARISA publishes no phase data for these projects"* — the `phaseAbsentCount > 0` branch, exactly as the T-02 forward pointer required |
| 4 | **Advisory R2** — what the editable field displays after selecting | ✅ **checked, and R2 did NOT materialize.** The field shows the label `2025 (25)`, but the value written to the DB is `"2025"` — verified by direct query: numeric, 4 chars, `is_active = 1`. Selecting and saving is safe, as the Reviewer predicted |

**End-to-end confirmation.** After the value was set to `2025`, the bilateral picker returned **25 projects** — matching the independently measured cohort (`clarisatest-back`: 299 total → 221 bilateral → 25 Alliance, all `phase 2025`; `matchesPhase(2025)` → 25, `matchesPhase(2026)` → 0).

**The original defect is closed.** The picker was empty because no `app_config` row existed, so the resolver fell through to the literal `2026` while the feed carried only `2025`.

#### New advisory — the 5-minute TTL is a UX trap

The verification was blocked for several minutes by a false symptom worth recording. After saving `2025` the picker still returned nothing, and the reported symptom was *"no devuelve nada en ninguna phase"*.

Cause: `MappingPhaseResolver` caches the ambient phase for `TTL_MS = 5 * 60 * 1000`. A value saved after the resolver last read is invisible for up to five minutes — **with no signal in the UI**. An admin who changes the value, tests, sees no change and changes it again **restarts the TTL and never escapes the loop**, concluding the feature is broken for every year they try.

This is **spec-conformant** — `NFR-CPC-001` explicitly says "within the resolver's existing 5-minute TTL" — so it is not a FAIL. But the requirement described the latency without asking anything of the UI, and the first real user hit exactly the trap it creates. Resolved here by restarting the backend (fresh process → cold cache).

Candidate for a follow-up spec: surface "may take up to 5 minutes to take effect" next to the control, or expose the resolver's currently-cached value. **Not minted as a task in this spec** — an advisory may not grow scope the user never approved.

---
