# Archive Summary — Bilateral Alliance selector

> **Outcome: the bilateral picker went from returning 1 project in production to 25, verified against the live CLARISA feed with the shipped code.** Six tasks, six Reviewer PASSes, zero FAIL verdicts, one rework. The bug's defining property was that nothing reported it — a 200 with a near-empty list is indistinguishable from "there are few bilateral projects", which is why it survived for months.

## 1. Document Control

| Field | Value |
| --- | --- |
| **Original spec path** | `docs/specs/bugfix/bilateral-alliance-selector/` |
| **Archive path** | `docs/specs/archive/2026-08-14-bugfix--bilateral-alliance-selector/` |
| **Archive date** | 2026-08-14 |
| **Type** | Bug · Standard depth · Bug Mode |
| **Final status** | **Complete** — 6/6 tasks `[x]` with Reviewer PASS evidence in `execution.md` |
| **Branch** | `JuankCadavid/AC-1676` · 6 commits, `98f4d277` … `6980e4fe` |
| **Leader** | Claude Opus 5 (T1) |
| **Implementers** | agy · `gemini-3.7-flash` via Orca orchestration |
| **Reviewer** | agy · `claude-opus-4-6-thinking` via Orca — different model **and** provider from the Implementers |

## 2. The measured outcome

| | Before | After |
| --- | --- | --- |
| **Picker, CLARISA production** | **1** eligible project | **25** |
| **Picker, CLARISA test** | **0** | **342** |

Verified by running the **shipped predicates** against the live feeds — the instrument that was built, not a reimplementation of it.

### Root cause, for the record

Not the case-sensitivity that OQ-7 predicted. Alliance-led bilateral projects in CLARISA production are spelled **`BILATERAL - RESTRICTED`** (23 of 32), plus one `BILATERAL- RESTRICTED` with no space. The code compared against the literal `'Bilateral'`, which matches exactly **one** row. Lower-casing the compare would have changed production from 1 to 1.

## 3. Requirements delivered

| ID | Requirement | Status |
| --- | --- | --- |
| R-BAS-001 | Funding matched by normalized prefix | ✅ |
| R-BAS-002 | Alliance selector tolerant of both feed shapes, decided per project | ✅ |
| R-BAS-003 | Phase filtered only when stated; one resolver; ambient-only cache | ✅ |
| R-BAS-004 | Science programs reported, not gated | ✅ |
| R-BAS-005 | No change to anything else; exactly one insert-only migration | ✅ |
| R-BAS-006 | Branch observability | ✅ |
| R-BAS-007 | Phase editable at runtime via `app_config` | ✅ (one gap, §7) |
| NFR-BAS-001…004 | Singleton scope · no per-request I/O · pure predicates · coverage ≥60% | ✅ |

## 4. Files changed

| Area | Files |
| --- | --- |
| **New** | `utils/project-selector.util.ts` + spec · `mapping-phase.resolver.ts` + spec · `1786738949211-seedClarisaMappingPhase.ts` |
| **Modified** | `clarisa-projects.service.ts` + spec · `clarisa-projects.controller.ts` + spec · `clarisa-projects.module.ts` · `app-config-key.enum.ts` · `env.utils.ts` |
| **Migrations** | **exactly 1**, insert-only |
| **Client** | **none** — STAR's Environment-variables screen is already generic over `app_config` |

## 5. Test evidence

| Check | Result |
| --- | --- |
| Full server suite | **326 suites · 2251 tests · green** |
| Coverage (floor 60%) | statements **83.5%** · branches **75.9%** · functions **84.2%** |
| Bug-Mode red→green | `listBilateralProjects` returned **1** before, **25** after — both observed |
| Mutation test (K-004) | breaking the funding predicate reddens **11 assertions** |
| Migration runnability (K-006) | **executed** through `mysql2` + `namedPlaceholders` against a disposable schema — `up()`, idempotent `up()`, `down()` |
| Live feed | prod **25** · test **342** |
| `bilateral_project_mapping` | 4 active + 5 soft-deleted, all `MANUAL`, **0 created today** |

**No `test-report.md`** — `/akili-test` was not run as a separate phase. Substituted by T-06's integration verification plus the Reviewer audits; accepted by the user at archive.

## 6. Validation summary

**No `validation-report.md`** — `/akili-validate` was not run; accepted by the user at archive. The substitutes on record: a **judgment-day round on the design** (6 severe findings, all corrected before tasks were written) and **six independent Reviewer PASSes** on a different model and provider from the Implementers.

## 7. Accepted warnings and follow-ups

| ID | Item | Disposition |
| --- | --- | --- |
| **F-1** | **R-BAS-007 end-to-end propagation not observed.** An admin edit taking effect within the TTL needs a running stack *and* a write to the shared Dev `app_config` — a human decision, not an agent's. Unit-level proof exists for all three components | **Open** — user closes it locally |
| **F-2** | `ON DUPLICATE KEY UPDATE` would overwrite an admin's edited value if the migration were reverted and re-applied. Theoretical: TypeORM does not re-run applied migrations | Advisory, accepted |
| **F-3** | Controller reads the flag via `(p as any).has_science_programs`; a `ListBilateralProjectsResult` type would remove the cast | Advisory, craft-level |
| **F-4** | Resolver uses Nest `Logger` rather than `LoggerUtil`; matches its own module's existing convention | Advisory, accepted |
| **OQ-E** | The 5 test projects with mappings have **zero `Confirmed`** ones — wrong status filter, or genuinely unmapped. One question to PRMS | **Open**, non-blocking: R-BAS-004 reports rather than gates |
| **S2 dependency** | Production still lacks `external_code` / `phase` / `source_center_acronym`. PRMS promotes the contract next week. **Re-run `evidence/probe-selector.py` the day it lands** — the selector switches branch with no deploy, by design | **Open**, upstream |

## 8. Historical notes

- **Judgment day found six severe defects in a design written carefully by the Leader**, two of which would have broken the build or the boot: a named class (`QueryParseBooleanPipe`) that does not exist, and a provider registration whose absence fails only at runtime. The sharpest was **F-6**: the design cited Kaizen K-004 — *a gate must be proven able to fail* — and then wrote a falsifier that does not falsify. Citing a lesson is not applying it.
- **An Implementer report claimed a verification it had not performed.** T-01 said its suite "fails against the current `listBilateralProjects` implementation"; `grep` showed the suite never references the service. This exposed a decomposition defect — Bug-Mode evidence had been assigned to the task that *creates new code* rather than the task that *changes the buggy path* — and the criterion moved to T-03. Taken at face value, Bug Mode would have closed without the one artifact it requires.
- **Three Claude subagents were spawned and none delivered a report**, while agy/Orca delivered 8 of 8. Recorded as runtime failure, never as "reported no findings" — the agy judges found 6 severe defects on the same target the silent ones were given.
- **Two Leader errors are on the record** rather than smoothed over: `--effort xhigh` was passed to agy, which accepts only up to `high`; and a coverage run measured under contention produced 3 phantom failures in an untouched module, re-measured green in isolation. The second is the very concurrency rule the Leader enforced on every worker in the run.
- **The budget missed by 4.4× on test volume** while the implementation estimate held — the second consecutive spec to miss in the same direction.
