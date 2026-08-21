# Execution Log — Bilateral Alliance selector

## Document Control

| Field | Value |
| --- | --- |
| **Spec** | `docs/specs/bugfix/bilateral-alliance-selector/` |
| **Started** | 2026-08-14 |
| **Approval Mode** | `gated` at start → **`pre-approved` (YOLO) from T-03 onward**, user instruction 2026-08-14. Exceptions (HALT, Pivot, budget tripwire, `FATAL_FAIL`) still stop |
| **Leader** | Claude Opus 5 (T1) |
| **Implementers** | agy · `gemini-3.7-flash` via Orca orchestration |
| **Reviewer** | agy · `claude-opus-4-6-thinking` via Orca orchestration — different model **and** different provider from the Implementers |
| **Orca run** | `run_c155b1c0fcd0` |

### Delegation deviations from `tasks.md` defaults — recorded per `.agents/leader.md`

| Deviation | Reason |
| --- | --- |
| Skills not loaded via the `skill` tool | The Implementer is agy, which has no Claude skill mechanism. Skill guidance was replaced by **exemplar-file pointers** (`external-code.util.ts` for T-01, `AppConfig.DB_SUPPORT_EMAIL()` for T-02) — the substitution `.agents/leader.md` endorses as the stronger steer anyway |
| Workers forbidden from running `npm test` / `eslint` (T-01, T-02) | Two Implementers ran concurrently; a measurement under contention is **wrong**, not slow (root `CLAUDE.md` §4.3). Leader measured in the window after both reported. `npx prettier --write` was explicitly **allowed** — it produces a file and measures nothing (**K-007**) |
| T-03 permitted `npm test` scoped to its own suite | It was the only Implementer active, and its red-before-green deliverable is unobtainable without running the test before its own edit |

### ⚠️ Runtime incident — Claude subagents did not deliver

Three Claude subagents (`judge-b-3`, `judge-b2`, `rev-t01-t02`) were spawned across judgment and review. **All three ran, went idle, and never delivered a report**; a direct message to one did not wake it. None is recorded as "reported no findings" — the distinction is load-bearing, because a silent reviewer is indistinguishable from a clean one, and the agy judges found 6 severe defects on the same target.

**Resolution:** the Reviewer was re-dispatched through agy on `claude-opus-4-6-thinking`, preserving `author ≠ auditor` on both axes without the Leader ever reviewing its own supervised work. agy/Orca delivered 6 of 6 dispatches.

### ⚠️ Leader error — corrected

`--effort xhigh` was passed to agy for T-02 and T-03. **agy's `--effort` accepts only `low|medium|high`**, so those tasks did not run at the stated effort. T-01 (`high`) was valid. Both tasks passed every gate regardless; the record is corrected rather than left standing. Any future escalation on this host must raise the **tier** (`gemini-3.1-pro`, `claude-opus-4-6-thinking`), since the effort dial has no headroom above `high`.

---

## Task Execution History

### T-01 — Selector predicates and regression suite · **PASS**

| Field | Value |
| --- | --- |
| **Date** | 2026-08-14 |
| **Implementer attempts** | 1 |
| **Dispatch** | `ctx_2725e638a38d` · effort `high` |
| **Files** | `utils/project-selector.util.ts` (100), `utils/project-selector.util.spec.ts` (727) |
| **Requirements** | R-BAS-001 (all clauses), R-BAS-002 (all clauses), R-BAS-003 phase-tolerance, NFR-BAS-003 |

**Leader verification:** 64 tests passed · `npx eslint` clean · `prettier --check` clean.

**Mutation test (K-004), run by the Leader:** replacing `isBilateralFunding` with `() => true` produced **11 failing assertions**. The gate is proven able to redden, not assumed to be.

**Reviewer verdict — `STATUS: PASS`.** Confirmed per-project Alliance decision, the `/^ABC([^A-Z0-9]|$)/` bound that excludes `ABCD`, and every mandated literal fixture string by grep count — including `'BILATERAL- RESTRICTED'` with no space before the dash.

#### Scope correction applied mid-task (user-approved)

The Implementer's report claimed its suite *"fails against the current `listBilateralProjects` implementation (yielding 1 vs 25)"*. **The Leader verified this was false** — `grep -c 'listBilateralProjects\|ClarisaProjectsService'` on the spec file returned `0`. The suite never touches the service.

This exposed a **defect in the task decomposition, not in the work**: T-01 creates a *new* util, so its tests are green from the moment it compiles and can never have been red. Bug-Mode evidence can only exist where the bug exists. The red-before-green criterion was **moved to T-03** and `tasks.md` amended, with user approval.

*Had the report been taken at face value, Bug Mode would have closed without the one artifact Bug Mode requires.*

---

### T-02 — `MappingPhaseResolver`, config key, `ENV` getter · **PASS**

| Field | Value |
| --- | --- |
| **Date** | 2026-08-14 |
| **Implementer attempts** | 2 (1 implementation + 1 lint rework) |
| **Dispatch** | `ctx_a6ab5a966d48`, rework `ctx_613900d081ff` |
| **Files** | `mapping-phase.resolver.ts` (121), `mapping-phase.resolver.spec.ts` (390), `app-config-key.enum.ts` (+1), `env.utils.ts` (+10) |
| **Requirements** | R-BAS-003, R-BAS-007 scenarios 1–2, NFR-BAS-002 |

**Attempt 1** — implementation complete, 64 tests green, but `npx eslint` reported `'Repository' is defined but never used` in the spec. Workers were forbidden from running lint under the concurrency rule, so the Leader routed it back rather than fixing it inline.

**Attempt 2 (rework)** — unused import removed, nothing else touched. `npx eslint` clean.

**Reviewer verdict — `STATUS: PASS`**, with line-cited evidence on the four hazards:

- **DI:** constructor takes `DataSource` only; `AppConfigService` / `CurrentUserUtil` / `Scope.REQUEST` appear solely in warning comments
- **Tier asymmetry:** tier 1 throws · tier 2 logs and falls through · tier 3 throws · tier 4 defaults. Database *errors* caught and treated as a tier-2 miss without throwing
- **Cache isolation:** explicit arguments return before the cache is touched, and the spec **proves** it — an explicit `2025` call leaves the ambient cache serving `2026`
- **Falsifiability:** tier reordering and cache leaks both redden real assertions

#### ADVISORY (recorded, non-gating — never becomes a task)

| # | Finding | Disposition |
| --- | --- | --- |
| **A** | The resolver uses Nest's `Logger` rather than `LoggerUtil` (server child guide §6) | Recorded. Note: `ClarisaProjectsService` itself already uses `Logger`, so the new class matches its module's local convention. Non-blocking |
| **B** | A redundant `resolve()` alias delegating to `resolvePhase()` adds surface the spec never asked for | Recorded. Non-blocking |

Per `/akili-execute` §2.4, advisories are recorded and die there — they may not mint a task or widen one.

---

### T-03 — Service wiring, module registration, Bug-Mode evidence · **PASS**

| Field | Value |
| --- | --- |
| **Date** | 2026-08-14 |
| **Implementer attempts** | 1 |
| **Dispatch** | `ctx_77877485cdc2` |
| **Files** | `clarisa-projects.service.ts`, `clarisa-projects.service.spec.ts`, `clarisa-projects.module.ts` |

**Implementer report:** red observation **1 returned project**, green observation **25**. Resolver registered in `ClarisaProjectsModule.providers`. Service spec compiles the real module. S1's env tests moved intact, still asserting the throw. `NOT DONE: None`.

**Leader verification:** 98 tests passed across 4 suites · `npx eslint` clean · module `providers: [ClarisaProjectsService, MappingPhaseResolver]` confirmed by inspection · the private `resolvePhase` is gone from the service and delegated · constructor is `(http: HttpService, phaseResolver: MappingPhaseResolver)` — both singleton.

**Reviewer verdict — `STATUS: PASS`**, all nine audit criteria satisfied and **all four Implementer claims independently verified against the diff** rather than accepted:

- **Bug-Mode evidence is genuine.** The Reviewer reconstructed the red observation from the fixtures themselves: against the pre-fix predicate (`source_of_funding === 'Bilateral' && acronym === 'ABC'`) only one of the 25 Alliance rows matches, so the `toHaveLength(25)` assertion would have returned 1. Red-before-green confirmed by analysis, not by trusting the report
- **K-005 satisfied:** the private `resolvePhase` is deleted; grep confirms a single resolution path
- **Module registration + real-module compilation** both confirmed — the spec uses `Test.createTestingModule({ imports: [ClarisaProjectsModule, …] })`, so a missing provider would fail the compile
- **S1's env test moved intact**, still asserting both the `BadRequestException` *and* its exact message string
- **Blast radius clean:** `findProjectById`, the TTL, the stale-serve path and the cold-cache `503` are byte-for-byte unchanged
- **D6 named substitute discharged:** constructor is `(http: HttpService, phaseResolver: MappingPhaseResolver)` — both singleton, no `Scope.REQUEST` in the graph

#### ADVISORY → carried forward as a T-04 obligation

The controller still holds a **pre-existing inline copy** of the `Confirmed` / entity-type-22 expression (`clarisa-projects.controller.ts:58-62`) that will drift from the service's `hasSciencePrograms()` helper. Design §7.3 item 2 assigns its replacement to **T-04**.

*Recorded here **and copied verbatim into T-04's brief**. A forward pointer is not carried by having been filed — the brief carries it or nobody does.*

---

### T-05 — `app_config` seed migration · **PASS**

| Field | Value |
| --- | --- |
| **Date** | 2026-08-14 |
| **Implementer attempts** | 1 |
| **Dispatch** | `ctx_5d45f2b069ba` |
| **Files** | `src/db/migrations/1786738949211-seedClarisaMappingPhase.ts` (new) |
| **Requirements** | R-BAS-005 (one insert-only migration), R-BAS-007 scenario 3 |

**Leader verification — the K-006 gate, which only execution can provide.** The migration was run through the **same driver stack the application uses** (`mysql2` with `extra.namedPlaceholders: true` — the setting that makes the placeholder trap fire), against a **disposable local schema** in the `ari-t13-mysql` container. The shared Dev database was never touched: it is remote, shared, and not disposable.

```
after up() #1 : [{"key":"ARI_CLARISA_PROJECTS_PHASE","simple_value":"2026",
                  "category":"API","subcategory":"CLARISA"}]
after up() #2 : [{"n":"1"}]   <- idempotent, no duplicate row
after down()  : [{"n":"0"}]   <- reverts cleanly
MIGRATION RUNNABLE: yes
```

The SQL uses `?` placeholders **with** parameter arrays (the exemplar's safe form) and contains no SQL comments, so the named-placeholders rewrite has parameters to bind. Scratch schema dropped afterwards.

> This is the gate that migration `1784500000000` never had: it shipped unrunnable and passed lint, typecheck, build and human review on the way (**K-006**).

**Reviewer verdict — `STATUS: PASS`** on all seven audit checkpoints: insert-only (no DDL), placeholder-safe with bound parameter arrays, keyed off the `AppConfigKey` enum member rather than a hardcoded string, correct values per design §5, `down()` deletes only its own row, timestamp append-only, scope confined to one file.

#### ADVISORY (recorded, non-gating)

`ON DUPLICATE KEY UPDATE` would **overwrite an administrator's edited `simple_value`** if the migration were ever reverted and re-applied. Theoretical — TypeORM tracks applied migrations and does not re-run them — and the spec does not prohibit the mechanism.

*The Leader raised this to the Reviewer deliberately, because the Leader's own green execution could not surface it: the run inserted into an empty table, so the overwrite path was never exercised. A passing measurement that structurally cannot reach the risky branch is not evidence about that branch.*

---

### T-04 — Controller parameters and response fields · **PASS**

| Field | Value |
| --- | --- |
| **Date** | 2026-08-14 |
| **Implementer attempts** | 1 |
| **Dispatch** | `ctx_d343ae69219f` |
| **Files** | `clarisa-projects.controller.ts`, `clarisa-projects.controller.spec.ts` |
| **Requirements** | R-BAS-003 (explicit phase + 400), R-BAS-004, R-BAS-006 |

**Leader verification:** 38 tests passed · `npx eslint` clean · claims confirmed by inspection — `QueryParseBool` is the imported name, `phase` is forwarded unmodified, and the inline `Confirmed`/code-22 filter is gone (the sole remaining occurrence of the word is inside an `@ApiQuery` description).

**Reviewer verdict — `STATUS: PASS`** on all eight axes. The two that mattered:

- **The carried-forward obligation was discharged.** The controller now calls the service's `hasSciencePrograms` helper for both the flag and the per-mapping filter — one expression, not two. This is the pointer T-03's Reviewer filed and this Leader copied into the brief; without that copy it would have died in the log.
- **Test-double fidelity (KZ-001) verified at the byte level.** The Reviewer compared the mock's predicate against the service's method and found them identical, confirmed `has_science_programs` is present in every fixture, and noted the spec uses strict `toEqual` — so a missing field fails rather than passes. This was flagged in the brief as the most likely way the task could be green and wrong; it was checked rather than assumed.
- **Falsifiability:** flipping the default to `true` reddens the pipe assertion; swallowing the error reddens the 400 test; hard-coding the phase reddens the forwarding test. No surviving tautology found.

#### ADVISORY (recorded, non-gating)

The controller reads the service-computed flag via `(p as any).has_science_programs` because `ClarisaProject` does not declare it, with a defensive `?? hasSciencePrograms(p)` fallback. Functional and correct; a `ListBilateralProjectsResult` type extending `ClarisaProject` would remove the cast. **Craft suggestion for a follow-up — not a spec violation, and per `/akili-execute` §2.4 it may not mint a task or widen one.**

---

### T-06 — Integration verification and the measured re-reading · **PASS (with one declared gap)**

| Field | Value |
| --- | --- |
| **Date** | 2026-08-14 |
| **Performed by** | the Leader. T-06 writes no files — it is measurement, which is Leader work, not Implementer work |
| **Requirements** | R-BAS-005 (blast radius), R-BAS-007 scenario 1, NFR-BAS-004 |

| Check | Result |
| --- | --- |
| Full server suite | **326 suites · 2251 tests · all green** |
| Coverage (threshold 60%) | statements **83.5%** · branches **75.9%** · functions **84.2%** |
| **Live feed, prod** | **25 eligible — MATCH** |
| **Live feed, test** | **342 eligible — MATCH** (see correction below) |
| Migrations added | **exactly 1** |
| `bilateral_project_mapping` | **4 active + 5 soft-deleted, all `MANUAL`, 0 created today**, last created 2026-07-02 — the table was not written to |

**The live check ran the shipped predicates against the live CLARISA feeds**, not a reimplementation of them — the same instrument-vs-reimplementation discipline S1 established, because measuring with a different instrument than the one built is the failure this whole line of work exists to avoid.

#### Correction found by execution — the criterion was wrong, not the code

T-06 originally required the test feed to yield **380**. It yields **342**, and 342 is correct: **380 is the *coverage-report* slice** (centre + phase, no funding filter), while the picker additionally excludes Window-3 per **OQ-A**. The D8 reading had already recorded that split as *342 bilateral / 38 window3*. `tasks.md` was corrected.

#### Leader error — recorded

The first coverage run reported **3 failures** in `ExcelWorkbookBuilder`, a module untouched by this spec. Cause: the Leader ran that measurement **concurrently** with a `ts-node` live check and an HTTP probe — a violation of the same §4.3 concurrency rule the Leader enforced on every worker in this run. Re-measured in isolation: **2251/2251 green**. *A measurement under contention is not slow, it is wrong* — and this run produced its own proof of that.

#### ⚠️ Declared gap — not silently closed

**R-BAS-007 scenario 1's end-to-end propagation** ("an admin edits the row and the picker follows within the TTL") was **not observed end to end.** It requires a running stack **and a write to the shared Dev `app_config` table**, and per root `CLAUDE.md` the Dev database is remote, shared, and not disposable — writes to it are a human decision, not an agent's.

What *is* proven: the TTL cache and its reset seam are unit-tested (T-02), the tier-2 read is unit-tested against a `DataSource` double, and the migration was executed against a disposable schema. What is *not* proven is the composition of those three against a live server.

**How the user closes it:** start the stack locally, edit the `ARI_CLARISA_PROJECTS_PHASE` row on the Environment-variables screen, and confirm the picker follows within 5 minutes.

---

## Budget

| | Estimate | Actual after T-01…T-03 |
| --- | --- | --- |
| Tasks | 6 | **6 complete** |
| LOC | ≈450 → **re-baselined ≈1950** | ≈1900 |
| Review rounds | 2 | **1 rework** (lint), 4 Reviewer passes, 0 FAIL verdicts |

**Tripwire fired after T-02** at 1349 lines against a ≈450 estimate. Escalated to the user per the guardrail — which stops for the user regardless of `pre-approved` mode. Cause: the implementation estimate was accurate (232 vs 195); the **test estimate was 4.4× low**, driven by this spec's own requirement for exhaustive fixtures over eleven measured funding spellings with asserted counts. User approved re-baselining to ≈1950 rather than trimming coverage, on the ground that the fixtures are what make the suite evidence.
