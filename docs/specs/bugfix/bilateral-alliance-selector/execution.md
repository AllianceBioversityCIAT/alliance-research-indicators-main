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

### T-03 — Service wiring, module registration, Bug-Mode evidence · *review pending*

| Field | Value |
| --- | --- |
| **Date** | 2026-08-14 |
| **Implementer attempts** | 1 |
| **Dispatch** | `ctx_77877485cdc2` |
| **Files** | `clarisa-projects.service.ts`, `clarisa-projects.service.spec.ts`, `clarisa-projects.module.ts` |

**Implementer report:** red observation **1 returned project**, green observation **25**. Resolver registered in `ClarisaProjectsModule.providers`. Service spec compiles the real module. S1's env tests moved intact, still asserting the throw. `NOT DONE: None`.

**Leader verification:** 98 tests passed across 4 suites · `npx eslint` clean · module `providers: [ClarisaProjectsService, MappingPhaseResolver]` confirmed by inspection · the private `resolvePhase` is gone from the service and delegated · constructor is `(http: HttpService, phaseResolver: MappingPhaseResolver)` — both singleton.

Reviewer verdict pending.

---

## Budget

| | Estimate | Actual after T-01…T-03 |
| --- | --- | --- |
| Tasks | 6 | 3 complete |
| LOC | ≈450 → **re-baselined ≈1950** | ≈1600 |
| Review rounds | 2 | 1 rework (lint) |

**Tripwire fired after T-02** at 1349 lines against a ≈450 estimate. Escalated to the user per the guardrail — which stops for the user regardless of `pre-approved` mode. Cause: the implementation estimate was accurate (232 vs 195); the **test estimate was 4.4× low**, driven by this spec's own requirement for exhaustive fixtures over eleven measured funding spellings with asserted counts. User approved re-baselining to ≈1950 rather than trimming coverage, on the ground that the fixtures are what make the suite evidence.
