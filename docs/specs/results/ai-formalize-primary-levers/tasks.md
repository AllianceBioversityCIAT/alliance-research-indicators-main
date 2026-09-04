# Tasks — Results / AI Formalize: Portfolio-Routed Primary Levers

- **Module:** results
- **Spec id:** 2026-09-ai-formalize-primary-levers
- **Status:** in-progress
- **Owner:** David Felipe Casañas Hernández
- **Depth:** Standard
- **Linked requirements:** `./requirements.md` · **Linked design:** `./design.md` · **Proposal:** `./proposal.md`
- **Citation convention:** `[SO] R-RES-NNN` = predecessor spec · bare `R-RES-NNN` = this spec (`requirements.md` §2)
- **Budget (design.md §13):** 7 tasks · ~252 prod LOC + ~1,558 test LOC (~1,810 total) · **4 rework rounds** (not review passes). Priced on the predecessor's *measured* ~6:1 test:production basis from day one, per **KZ-008**
- **Last updated:** 2026-09-04

- **Execution log:** `./execution.md`
---

## 1. Task Numbering

`T-01` … `T-07`, in dependency order. All tasks are server-side (`server/researchindicators`).

**Concurrency (root `CLAUDE.md` §4.3):** every task touches the same package, so **no two tasks may run in parallel**, even where the dependency graph would allow it. Run one at a time; measure only in the window after a worker reports.

**Additional concurrency constraint, specific to this spec:** T-03 and T-05 edit files the predecessor spec also owns (both alignment handlers, `results.service.ts`). This spec must **not** run while the predecessor's T-07 remediation is in flight, and not in a second worktree against the same package (`proposal.md` → `Parallel-safe: No`).

---

## 2. Dependency Graph

```text
T-02 (lever finder) ──► T-03 (both handlers) ──► T-04 (orchestrator) ──┐
                                                                        ├──► T-05 (formalizer) ──► T-06 (specs) ──► T-07 (gate)
T-01 (DTO) ────────────────────────────────────────────────────────────┘
```

| Task | Depends on | Blocks |
| --- | --- | --- |
| T-01 | — | T-05 |
| T-02 | — | T-03 |
| T-03 | T-02 | T-04 |
| T-04 | T-03 | T-05 |
| T-05 | T-01, T-04 | T-06 |
| T-06 | T-05 | T-07 |
| T-07 | T-06 | — |

No cycles.

---

## 3. Task List

### T-01 — Add `primary_levers` to `ResultRawAi`

- **Requirements covered:** R-RES-001 (scenario "The field is accepted", both clauses, AC.1–AC.4; **AC.5 `/swagger` render is T-07's**)
- **Files touched (intended):**
  - `src/domain/entities/results/dto/result-ai.dto.ts`
  - `src/domain/entities/results/dto/result-ai.dto.spec.ts`
- **Description:** Add one optional numeric-array property to `ResultRawAi`, mirroring the shipped `strategic_objectives` property decorator-for-decorator. Nothing else in the DTO changes.
- **Implementation notes:**
  - Copy the shipped `strategic_objectives` decorator stack exactly — including the **per-element** validator. An array-only validator accepts `[11, "x"]` and would silently pass a string id to the query predicate.
  - `@ApiProperty` is required (root `CLAUDE.md` §4.1) and is what the Swagger document is generated from.
  - Do **not** touch `RootAi`, and do **not** add id-validity checking here — ownership and activeness are T-03's, against the resolved portfolio (DD-4).
- **Acceptance / done check:**
  - [x] `primary_levers: [11, 12]` passes validation.
  - [x] `"11,12"` fails with `primary_levers` named in `errors`.
  - [x] `[11, "x"]` fails with the field named — the **per-element** rule.
  - [x] Absence passes, and requires no other new field (the `BUT it must NOT` clause).
  - [x] The `@ApiProperty` reflect-metadata declares an optional number array.
- **Tests:** `result-ai.dto.spec.ts` — extend the existing describe, running payloads through the **real** `endpointValidationPipe` configuration (`whitelist` + `forbidNonWhitelisted` + `transform`), not a hand-rolled validator.
- **Verification:** `npm test -- --silent src/domain/entities/results/dto/result-ai.dto.spec.ts`
- **Falsifying input:** `[11, "x"]`. Run it against the DTO **before** adding the per-element validator and confirm it passes — that is what proves the test can fail. An array-only decorator is the defect this check exists for.
- **Disqualifies:** asserting the property exists on the class, or that a `@ApiProperty` decorator is present, instead of running a payload through the pipe. **A presence-assertion on a decorator proves declaration, not validation** — it cannot distinguish `@IsNumber({}, { each: true })` from `@IsArray()` alone, which is the entire point of this task.
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Estimated effort:** S · **Status:** done — PASS on attempt 1 (lens-checklist review, 5 advisories recorded, none gating); see `execution.md` → T-01

---

### T-02 — Add an id-filtered, portfolio-scoped, active-only lever finder

- **Requirements covered:** R-RES-005 (the predicate that produces AC.1–AC.3); design DD-4
- **Files touched (intended):**
  - `src/domain/tools/clarisa/entities/clarisa-levers/clarisa-levers.service.ts`
  - `src/domain/tools/clarisa/entities/clarisa-levers/clarisa-levers.service.spec.ts`
- **Description:** Add `findActiveByIdsForPortfolio(ids, portfolioId)`, returning only `clarisa_levers` rows whose id is in the list **and** whose `portfolio_id` matches **and** which are active. This is the single predicate that covers all three discard causes.
- **Implementation notes:**
  - **This addition is authorized up front.** The service has `findAllWithPortfolio(portfolioId?)` — portfolio-scoped with **no id filter** — so the predicate DD-4 names is currently unreachable. The predecessor hit the identical gap on `StrategicObjectivesService` and had to authorize the deviation mid-execution; it is pre-authorized here so it is not rediscovered.
  - `is_active` is inherited from `AuditableEntity`; include it in the `where`, do not filter in memory.
  - An empty `ids` array must return an empty result **without** issuing a query whose `IN ()` matches everything.
  - Do not change `findAllWithPortfolio`, `create`, `update`, `remove` or `findByShortName`.
- **Acceptance / done check:**
  - [x] Given ids `[11, 12, 4]` and portfolio 2, only 11 and 12 return (4 is a portfolio-1 record).
  - [x] An id that exists and is active but belongs to the **other** portfolio does not return.
  - [x] An id in the right portfolio with `is_active = 0` does not return.
  - [x] An unknown id does not return and does not throw.
  - [x] `ids: []` returns empty and matches nothing.
  - [x] The existing `findAllWithPortfolio` spec passes unmodified.
- **Tests:** `clarisa-levers.service.spec.ts` — new describe block.
- **Verification:** `npm test -- --silent src/domain/tools/clarisa/entities/clarisa-levers`
- **Falsifying input:** an active `clarisa_levers` row whose `portfolio_id` is the **other** portfolio. An implementation filtering only on `id IN (…)` and `is_active` returns it and FAILs. Confirm the test goes red against a two-part predicate before declaring done.
- **Disqualifies:** a repository double that returns a canned array without evaluating the `where` clause. Then the predicate is untested however green the suite *(KZ-001)* — the double must inspect the `where` it is handed, including the `In(...)`/`is_active` operators, the way the predecessor's `findByYear` double parsed its `FindOperator` internals.
- **Skills:** `nestjs-expert`
- **Estimated effort:** S · **Status:** done — PASS on attempt 1; `is_active` NULL hazard disproved at the schema (tinyint NOT NULL DEFAULT 1) and a bigint-hydration risk handed forward to T-03; see `execution.md` → T-02

---

### T-03 — Add the narrow levers save to both alignment handlers

- **Requirements covered:** R-RES-003 (scenario, both clauses, AC.1–AC.4), R-RES-004 (scenario, both clauses, AC.1–AC.4), R-RES-005 (both scenarios, all clauses), R-RES-007 (scenario, both clauses, AC.2–AC.4), R-RES-008 (AC.4 by double shape), design DD-1, DD-2, DD-3, DD-5, DD-6, DD-8, DD-9, DD-10
- **Files touched (intended):**
  - `.../portfolio-handlers/sections/alignment/alignment-section-handler.interface.ts`
  - `.../alignment/portfolio-1/portfolio-1-alignment.handler.ts` + `.spec.ts`
  - `.../alignment/portfolio-2/portfolio-2-alignment.handler.ts` + `.spec.ts`
  - `.../portfolio-handlers/portfolio-handlers.module.ts` (import `ClarisaLeversModule` if not already present)
- **Description:** Extend `AlignmentSectionHandler` with `saveLevers(resultId, ids)` returning `{ saved, discarded }`. **Both** portfolios implement it with real writes at different roles — this is the structural difference from the predecessor, where portfolio 1 was a stub. Also harden the unguarded `research_areas` map (DD-10).
- **Implementation notes:**
  - **Signature is frozen at `saveLevers(resultId: number, ids: number[])`** — no `PortfolioHandlerContext`, no `EntityManager` (DD-3, DD-8). This makes "no request-scoped read" and "no threaded transaction" true by construction.
  - The report carries **no `supported` flag**: both portfolios support the field (DD-8, §5.1). Do not add one "for symmetry" with the predecessor.
  - **Portfolio 1:** validate against portfolio 1 via T-02's finder, deduplicate, write via `ResultLeversService.create(...)` at `LeverRolesEnum.ALIGNMENT` with **`is_primary: true` explicit on every row**, and include `is_primary` in the fields `create` is told to update (DD-5).
  - **Portfolio 2:** identical shape, validated against portfolio 2, written at `LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT` — the same role its own section save uses for research areas (DD-9). Do **not** construct a `research_areas` payload and delegate to the section `save`; that is what DD-1 forbids.
  - **Zero survivors must write nothing and deactivate nothing.** Handing `create` an empty survivor array reconciles the whole `(result_id, role)` pair to inactive — this is the empty-survivor wipe the predecessor caught in execution. Return early.
  - **DD-10 hardening (Q-6, owner may veto):** treat an absent/`null` `research_areas` as empty inside the existing portfolio-2 section `save`. One expression. Keep the OICR / indicator gates byte-identical. **If the owner vetoes Q-6, drop this bullet and nothing else changes.**
  - `lever_id` is written as the entity models it, matching the existing convention (DD-7). Do not clean the type modelling here.
- **Acceptance / done check:**
  - [ ] Portfolio 1: valid ids → rows at `lever_role_id = 1`, **every row asserted `is_primary === true` by value**.
  - [ ] Portfolio 1: **no row is written with `is_primary` false or null** (the `BUT it must NOT` clause).
  - [ ] Portfolio 2: valid ids → rows at `lever_role_id = 3`, and **no row at `lever_role_id = 1`** (R-RES-004's `BUT`).
  - [ ] Portfolio 2: every `lever_role_id = 1` row already attached to that result is untouched (R-RES-004's `AND IT MUST`).
  - [ ] Either portfolio: `[11, 999, 4]` → rows only for the owned+active ids, `discarded` names the rest, **no throw** (R-RES-005 scenario 1's `BUT`).
  - [ ] Either portfolio: every id discarded → **zero rows written and no pre-existing row for that result and role deactivated** (R-RES-005 scenario 2's `BUT`).
  - [ ] Either portfolio: a repeated id produces one row.
  - [ ] **R-RES-007's falsifying test:** with a persistence double reporting a pre-existing contributor row (role 1, `is_primary = false`) for the target result, that row is still active and still `is_primary = false` afterwards — and the same holds for a portfolio-2 write (the `AND IT MUST` clause).
  - [ ] Audit columns populated from the current user — *by construction via `BaseServiceSimple`; carried to T-07 for integration-level closure, deliberately not ticked on inference.*
  - [ ] Both handlers' existing section `save` / `find` specs pass **unmodified**.
  - [ ] DD-10: the section `save` returns normally for a payload omitting `research_areas`, and its behavior for a populated payload is unchanged.
- **Tests:** `portfolio-1-alignment.handler.spec.ts`, `portfolio-2-alignment.handler.spec.ts` — extend both.
- **Verification:** `npm test -- --silent src/domain/entities/results/portfolio-handlers`
- **Falsifying inputs (three, each must be shown red before done):**
  1. **Omit `is_primary`** from the portfolio-1 write → the value assertion must go red. Without this probe, DC-1 is untested and the DB default silently writes contributors.
  2. **An id valid in the other portfolio** → a two-part predicate writes it and FAILs.
  3. **A double reporting a pre-existing contributor row**, against an implementation that hands `create` only the primary rows → the inertness assertion must go red. This is what makes R-RES-007 falsifiable rather than true-by-accident (DD-6).
  4. For DD-10: a payload omitting `research_areas`, run against the **unmodified** handler, to confirm the guard's test can fail.
- **Disqualifies:** a `ResultLeversService` double that does not record `lever_role_id` **and** `is_primary` per row — then DC-1 and DC-2 are untestable however green the suite *(KZ-001)*. Also: asserting that `create` **was called** rather than asserting its arguments. A call proves delegation, not a row at role 1 with `is_primary = true`; the role and the flag are exactly what can be wrong while the call is right.
- **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`
- **Estimated effort:** L · **Status:** todo

---

### T-04 — Add the explicit-portfolio levers entry point to the orchestrator

- **Requirements covered:** R-RES-009 (the no-inherited-portfolio-state clause), R-RES-003 / R-RES-004 (delegation path); design DD-3
- **Files touched (intended):**
  - `.../portfolio-handlers/application/result-section-orchestrator.service.ts` + `.spec.ts`
- **Description:** Add `saveLeversForPortfolio(resultId, portfolioId, ids)`, resolving the handler from the registry by the given portfolio id and delegating to T-03's narrow save. Mirrors the shipped `saveStrategicObjectivesForPortfolio` exactly.
- **Implementation notes:**
  - Must **not** call `resolvePortfolioId()`, and must **not** read `portfolioUtil.portfolio` or `resultsUtil.result` — both getters throw when unset, which is the state a formalize request is in (`[SO] DD-3`).
  - Do **not** build a `PortfolioHandlerContext` — T-03's frozen signature takes none.
  - Pass no `EntityManager`; do not wrap in `dataSource.transaction`.
  - Leave `saveAlignment`, `findAlignment`, `resolvePortfolioId`, `buildContext` and the shipped `saveStrategicObjectivesForPortfolio` untouched.
- **Acceptance / done check:**
  - [ ] Called with portfolio 2 it invokes the portfolio-2 handler's `saveLevers`; with portfolio 1, the portfolio-1 handler's.
  - [ ] With `PortfolioUtil` and `ResultsUtil` doubles whose getters **throw**, the method still completes — proving no request-scoped read.
  - [ ] An unregistered portfolio id surfaces the registry's existing `NotFoundException` rather than a new error type.
  - [ ] `saveAlignment`, `findAlignment` and `saveStrategicObjectivesForPortfolio` specs pass unmodified.
- **Tests:** `result-section-orchestrator.service.spec.ts` — new describe block.
- **Verification:** `npm test -- --silent src/domain/entities/results/portfolio-handlers/application`
- **Falsifying input:** doubles for `PortfolioUtil`/`ResultsUtil` whose getters throw. An implementation reusing `resolvePortfolioId()` or spreading `this.resultsUtil.result` FAILs immediately.
- **Disqualifies:** doubles that return `{}` instead of throwing. A permissive double lets a request-scoped read pass unnoticed, which is precisely the defect this task guards, and the suite would certify its absence while it is present. Also: two handler doubles that return **identical** reports — then a hardcoded handler passes both routing assertions *(KZ-004)*.
- **Skills:** `nestjs-expert`
- **Estimated effort:** S · **Status:** todo

---

### T-05 — Wire the levers step into `formalizeResult`, with reporting

- **Requirements covered:** R-RES-002 (scenario's `AND IT MUST`, AC.1–AC.3), R-RES-005 (the reporting half of both scenarios, AC.5), R-RES-006 (scenario, both clauses, AC.1–AC.4), R-RES-008 (scenario's `AND IT MUST`, AC.2–AC.3), NFR-RES-001, NFR-RES-002
- **Files touched (intended):**
  - `src/domain/entities/results/results.service.ts` + `results.service.spec.ts`
- **Description:** Carry `primary_levers` through `createResultFromAiRoar`, add the levers step to `formalizeResult` per `design.md` §5.1, and translate the handler's report into `missing_fields` entries and warn lines.
- **Implementation notes:**
  - **Step 1 is the load-bearing guard:** absent, `null` or `[]` → return before calling the resolver or the orchestrator (R-RES-008).
  - Effective year: `result.year ?? new Date().getFullYear()`.
  - `null` from `findByYear` → no write, append the field-level `primary_levers` entry, warn naming the year. **No fallback portfolio** — not portfolio 1, not lowest id, not highest.
  - `discarded` non-empty → one `primary_levers:<id>` entry per id, warn **once** listing them (NFR-RES-002).
  - Entries are **appended** to whatever the AI reported; never replace `elementResultMetadata.missing_fields`.
  - **Place the step adjacent to the shipped strategic-objectives step, inside the existing `try` and ABOVE `customStatus`** (§5.4). Below `customStatus` would silently omit levers from an approved item's snapshot — a hazard invisible at the edit site.
  - Contains **no** portfolio branching. **If an `if` on a portfolio id appears in this file, the task is wrong** (DD-2).
  - The metadata sink is already optional at both `push` sites (shipped). Do not re-guard it.
- **Acceptance / done check:**
  - [ ] Portfolio-1-year item with valid ids → rows written; item in `results_created`.
  - [ ] Portfolio-2-year item with valid ids → rows written at role 3; item in `results_created`.
  - [ ] Year 2035 (no covering portfolio) → item created, zero rows, field-level entry present, warn names the year, **no exception, no fallback portfolio, item not in `results_errors`**.
  - [ ] Discarded ids appear as `primary_levers:<id>`, distinguishable from the field-level entry, **asserted by content equality** on `missing_fields`.
  - [ ] Absent / `[]` / `null` → the resolver and the orchestrator are **never called** (assert zero interactions, not just zero rows).
  - [ ] The AI's own `missing_fields` entries survive alongside the new ones (R-RES-005 AC.5's `AND IT MUST`).
  - [ ] An item with **no** `year` resolves via the current calendar year, asserted against a fixture whose covering portfolio **differs from its sibling's**, so a hardcoded default cannot pass unnoticed (R-RES-002's `AND IT MUST`).
  - [ ] A batch of N items over D distinct years issues at most D `findByYear` calls (NFR-RES-001).
  - [ ] One warn per item per case, never one per id (NFR-RES-002).
  - [ ] Single endpoint: a valid payload returns the created result and it persists; an unknown `contract_code` still rolls back and rethrows.
  - [ ] Bulk metadata output unchanged: one `bulk_upload_results` row per item, same fields.
- **Tests:** `results.service.spec.ts` — extend the `formalizeResult` and `createResultFromAiRoar` describes.
- **Verification:** `npm test -- --silent src/domain/entities/results/results.service.spec.ts`
- **Falsifying inputs:**
  1. `year: 2035`. An implementation defaulting to portfolio 1 when the resolver returns `null` writes rows and FAILs.
  2. A payload with **no** field, asserted with zero-interaction spies on the resolver and orchestrator. An implementation calling the step unconditionally FAILs even though no rows would be written — which is the point: **the row count alone cannot see that defect.**
- **Disqualifies:** asserting `missing_fields` **length** or presence rather than content. A length assertion passes while the entry names the wrong thing, and DC-4 is silent data loss that a presence check is blind to. Also: a `findByYear` double returning a **constant** rather than routing by year — then per-item routing is untested and NFR-RES-001's call-count assertion is meaningless *(KZ-001)*.
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd`, `systematic-debugging` (on any failure)
- **Estimated effort:** L · **Status:** todo

---

### T-06 — Prove per-item routing, inertness, and cross-field composition

- **Requirements covered:** R-RES-002 (scenario's `BUT`), R-RES-007 (AC.1), R-RES-008 (scenario, its `BUT`, AC.1, AC.4), R-RES-009 (scenario, both clauses, AC.1–AC.4), R-RES-010 (scenario, both clauses, AC.1–AC.4)
- **Files touched (intended):**
  - `src/domain/entities/results/results.service.spec.ts`
- **Description:** The three suites the rest of the spec exists to make true. One proves each bulk item routes on its own year; one proves the new write disturbs nothing else; one proves the two AI alignment fields compose. All written to be capable of failing on a plausible wrong implementation. **No production code.**
- **Implementation notes:**
  - **Mixed-year fixture (KZ-004):** at least three items whose `year`, `primary_levers` list and `title` **all** differ, with **disjoint** id sets, spanning both portfolios. A fixture built from identical defaults cannot distinguish per-item routing from a batch-wide constant and would certify the exact bug R-RES-009 exists to prevent.
  - Assert **per item, keyed by that item's own result id** — never aggregate row counts. An aggregate of five rows passes while every row hangs off the wrong result.
  - Add the reversed-order run as a separate case over a **fresh** fixture (R-RES-009 AC.2).
  - Mid-batch failure: force one item to fail **after** its lever write; assert no `result_levers` row survives for it and that later items resolve on their own years.
  - **Inertness (R-RES-008):** an item carrying `sdg_targets`, `strategic_objectives` **and** `primary_levers`, asserting `is_active` on the resulting `result_sdgs` rows, the ALIGNMENT `result_contracts` rows, **and** the `result_strategic_objectives` rows — plus the new lever rows. Absence of the new row is not evidence the old rows survived.
  - **Composition (R-RES-010):** the same fixture proves both fields land; a separate case reverses the order of the two steps and asserts the identical observable state.
  - Cover `[]` and `null` alongside absent.
  - **Cite, do not duplicate.** Where T-05 already proves a clause behaviorally, reference its test rather than re-asserting — this spec's budget has been priced on the predecessor's measured density and duplication is the cheapest way to blow it.
- **Acceptance / done check:**
  - [ ] Mixed-year batch: each item holds exactly its own ids, at the role its own portfolio dictates.
  - [ ] Reversing item order yields the identical per-item outcome.
  - [ ] No item's levers are attached to another item's result id.
  - [ ] After an item fails mid-way, no `result_levers` row survives for it, and later items resolve on their own year.
  - [ ] The three-field item ends with every `result_sdgs`, ALIGNMENT `result_contracts`, `result_strategic_objectives` **and** new lever row `is_active = true`.
  - [ ] Reversing the two alignment steps changes nothing observable (R-RES-010's `AND IT MUST`).
  - [ ] The alignment step is reached only for a result created in the same call (R-RES-007 AC.1).
  - [ ] **The suite FAILs when run against an implementation that resolves the portfolio once per request** — verify this deliberately before declaring the task done.
- **Tests:** `results.service.spec.ts`.
- **Verification:** `npm test -- --silent src/domain/entities/results/results.service.spec.ts`, then `npm test -- --silent src/domain/entities/results` for blast radius *(KZ-003)*.
- **Falsifying input:** stated as a done check above. `formalizeResult` is invoked **once per item** from `createResultFromAiBulk`, so there is no in-method loop to hoist the resolver out of — stage the defect by resolving once in `createResultFromAiBulk` before the item loop, **or** by making the `findByYear` double return its first answer for every subsequent year. Report which mutation was used. A routing test that stays green under batch-wide resolution is not evidence, however green it reports.
- **Disqualifies:** identical fixture years; identical id lists across items; aggregate row-count assertions; an inertness case that omits the sibling-row `is_active` assertions. **Any one of these makes the run inconclusive rather than passing — report it as inconclusive, do not commit it as a pass.** Also: a double for the strategic-objectives write that returns a report shape the frozen `[SO]` contract makes impossible.
- **Skills:** `tdd`, `nestjs-expert`
- **Estimated effort:** M · **Status:** todo

---

### T-07 — Full-suite gate, lint, the `[SO] R-RES-007` amendment, and the manual Dev verification

- **Requirements covered:** every requirement's blast radius; R-RES-001 AC.5; R-RES-003 AC.3 / R-RES-004 AC.3 (integration closure); NFR-RES-003; DC-6, DC-7, DC-8, DC-9, DC-10
- **Files touched (intended):** `docs/specs/results/ai-formalize-strategic-objectives/requirements.md` (the amendment). No source files expected — if lint's `--fix` mutates any, re-check `git status` and commit the formatting separately.
- **Description:** The gates no single earlier task can provide, plus the required cross-spec amendment and the manual checks that substitute for the defect classes with no automated gate.
- **Implementation notes:**
  - **Full suite, not targeted (KZ-003 / DC-6).** Both handlers, the registry and the orchestrator are shared with `PATCH`/`GET .../alignments`. A targeted run confirms the brief was followed, not that the blast radius is clean. Report a **coverage figure**.
  - Lint's script carries `--fix`, so it **mutates files** — never treat the run as read-only (root `CLAUDE.md` §4.3).
  - **The `[SO] R-RES-007` amendment (DC-8).** That requirement's scenario clause and **AC.1** both name `result_levers`, and AC.1 is currently ticked as proven by the predecessor's T-06. Restate the guarantee as *absence of **both** AI alignment fields leaves every other alignment table untouched, and neither new write disturbs the other*. **`[SO] R-RES-007` AC.4 survives unchanged.** Then run the **two-direction Correction Closure sweep**: forward for `result_levers` across that spec's folder, backward for documents citing that section — including its `tasks.md` §4 coverage table and its `execution.md` T-06 entry.
  - **NFR-RES-003 / DC-7:** reviewed `grep -rn "/v1"` over this spec folder and `server/researchindicators/test`. Every hit must state a versioned path is *unreachable*; a hit presenting one as callable is a FAIL *(KZ-006)*.
  - **DC-9 (Q-3):** read-only query of `clarisa_levers` in Dev, confirming ids 11/12 are `portfolio_id = 2` and legacy ids are `portfolio_id = 1`. **Read-only only** — the shared Dev DB is not disposable and destructive operations against it are a human decision.
  - **RK-6 / D-3:** confirm migration `1783029013035` is applied in every target environment. If it is not, the compensating delete hits FK 1451 from inside the `catch` and aborts the whole batch (§11). **Rollout blocker, not a warning.**
  - **DC-10 (Q-4), and this is the first check rather than the last (KZ-007):** one real mixed-year bulk upload against Dev using a payload captured from the **actual** extractor, inspecting `result_levers` (rows, roles, `is_primary`) and `bulk_upload_results.missing_fields`.
- **Acceptance / done check:**
  - [ ] `npm test -- --silent` green across the whole server package; **coverage ≥ 60% reported, not assumed**.
  - [ ] `npm run lint -- --quiet` clean; `git status` re-checked after.
  - [ ] The alignment endpoint specs pass without modification.
  - [ ] `/swagger` shows `primary_levers` as an optional number array on both endpoints (R-RES-001 AC.5).
  - [ ] `[SO] R-RES-007` amended, with both sweep directions run and evidenced.
  - [ ] The `/v1` sweep reviewed.
  - [ ] Dev `clarisa_levers` ownership recorded in the spec (Q-3 closed).
  - [ ] Migration `1783029013035` confirmed applied (RK-6 closed) — **or the rollout is blocked and escalated**.
  - [ ] A real-payload mixed-year upload run against Dev, with observed rows, roles, `is_primary` values and `missing_fields` recorded (Q-4 closed).
  - [ ] Audit columns confirmed at integration level for both roles (R-RES-003 AC.3, R-RES-004 AC.3).
- **Verification:** `npm test -- --silent` and `npm run lint -- --quiet` from `server/researchindicators`; plus the manual steps above, **evidenced in writing**.
- **Falsifying input:** a Dev `clarisa_levers` table whose id 11/12 rows are **not** `portfolio_id = 2` would falsify this spec's reading of the owner's payload and send DD-2 back for re-decision. A real extractor payload sending lever **names** instead of ids would falsify A-3 and require a T-01 change.
- **Disqualifies:** a green targeted run standing in for the full suite. Also: **reporting Q-4 as closed on a hand-written payload** — that tests the spec's own assumption against itself and cannot falsify it. If the real payload is unavailable, report Q-4 as **open**, not passed. Also: treating a green T-06 as evidence for RK-6 — T-06's rollback assertion models **post**-migration semantics and is conditional on it.
- **Skills:** `systematic-debugging` (on any failure)
- **Estimated effort:** M · **Status:** todo

---

## 4. Requirement Coverage — closed at scenario and clause granularity

**ID-level presence is not closure.** Every scenario and every `BUT` / `AND IT MUST` clause is owned by a named task below. A gap may never be discharged by citing a different requirement.

| Requirement | Scenario / clause | Owner |
| --- | --- | --- |
| R-RES-001 | scenario "The field is accepted" | T-01 |
| " | `BUT` must not require any other new field | T-01 |
| " | `AND IT MUST` reject `"11,12"` and `[11,"x"]` | T-01 |
| " | AC.5 `/swagger` render | **T-07** |
| R-RES-002 | scenario "Two items, two years, two portfolios" | T-06 |
| " | `BUT` must not reuse the first item's portfolio | **T-06** |
| " | `AND IT MUST` resolve absent year via calendar year | **T-05** |
| R-RES-003 | scenario "portfolio-1 levers written as primary" | T-03 |
| " | `AND` every row `is_primary = true` (by value) | T-03 |
| " | `BUT` must not create `is_primary` false/null | T-03 (falsifier 1) |
| " | `AND IT MUST` populate audit columns | T-03 by construction → **T-07** integration |
| R-RES-004 | scenario "2026 ids become research areas" | T-03 |
| " | `BUT` must not write at role 1 | T-03 |
| " | `AND IT MUST` leave role-1 rows untouched | T-03, T-06 |
| R-RES-005 | scenario "One valid id, two rejects" | T-03 (write) + T-05 (reporting) |
| " | `BUT` must not write rejects, must not throw | T-03 |
| " | `AND IT MUST` keep AI-reported entries | **T-05** |
| " | scenario "Every id is rejected" | T-03 |
| " | `BUT` must not deactivate pre-existing rows | T-03 |
| " | `AND IT MUST` report each discarded id | T-05 |
| R-RES-006 | scenario "year outside every range" | T-05 |
| " | `BUT` no fallback portfolio, must not raise | T-05 (falsifier 1) |
| " | `AND IT MUST` log one warning naming the year | T-05 |
| R-RES-007 | scenario "inert toward rows it did not create" | T-03 (falsifier 3) |
| " | `BUT` must not deactivate/delete/promote/demote | T-03 |
| " | `AND IT MUST` hold for a portfolio-2 item | T-03 |
| " | AC.1 reached only for a same-call result | **T-06** |
| R-RES-008 | scenario "payload without the field is byte-identical" | T-06 |
| " | `BUT` must not touch the five named tables | **T-06** |
| " | `AND IT MUST` treat `[]` and `null` as absent | T-05 |
| " | AC.3 zero interactions | T-05 (falsifier 2) |
| " | AC.4 no path reaches the section-wide save | T-03 (double shape) + T-06 |
| R-RES-009 | scenario "mixed-year batch, one item fails mid-way" | T-06 |
| " | `BUT` no row survives for the failed item | T-06 |
| " | `AND IT MUST` resolve survivors on their own year | T-06 |
| R-RES-010 | scenario "One item, both fields" | T-06 |
| " | `BUT` no row left `is_active = 0` | T-06 |
| " | `AND IT MUST` be order-independent | T-06 |
| NFR-RES-001 | lookups scale with distinct years | T-05 |
| NFR-RES-002 | one log line per item per case | T-05 |
| NFR-RES-003 | reviewed `/v1` sweep | T-07 |

**Design decision coverage:** DD-1 → T-03, T-05 · DD-2 → T-03, T-05 · DD-3 → T-03, T-04 · DD-4 → T-02 · DD-5 → T-03 · DD-6 → T-03, T-06 · DD-7 → T-03 · DD-8 → T-03, T-05 · DD-9 → T-03 · DD-10 → T-03.

---

## 5. Testing Expectations

| Suite | Files | Notes |
| --- | --- | --- |
| backend-unit | `result-ai.dto.spec.ts`, `clarisa-levers.service.spec.ts`, both handler specs, `result-section-orchestrator.service.spec.ts`, `results.service.spec.ts` | Global 60% coverage threshold applies; T-07 reports the figure |
| backend-e2e | none added | No new endpoint. The existing AI-formalize e2e specs must keep passing |

**Every task carries a `Disqualifies` clause.** Two are stronger than the rest and are repeated here because they decide whether the run is evidence at all:

- **T-03:** a `ResultLeversService` double that does not record `lever_role_id` **and** `is_primary` per row makes DC-1 and DC-2 untestable. Asserting `create` *was called* proves delegation, not a row at the right role with the right flag.
- **T-06:** identical fixture years, identical id lists, aggregate row counts, or an inertness case without sibling-row assertions each make the run **inconclusive rather than passing** — and must be reported as inconclusive.

---

## 6. Execution Conventions

- Branch: the current integration branch, as the owner directs. The predecessor's commits sit on `AC-1607-Send-bulk-upload-completion-email-with-CapDev-metrics`.
- Commit prefix: `[SPEC:results/ai-formalize-primary-levers]`, subject as `<type>(<module>): <subject>`.
- No migration in this spec. Never edit a merged migration.
- `@ApiProperty` ships in the same commit as the DTO change.
- One task at a time — §1's concurrency rule.

---

## 7. PR Strategy

~1,810 LOC total, well past the ~400 single-PR guideline. **Two PRs, split at the contract boundary:**

| PR | Tasks | ~LOC | Review focus |
| --- | --- | --- | --- |
| **PR 1 — persistence contract** | T-01, T-02, T-03, T-04 | ~880 | The two handler bodies and their roles/flags. **Review `is_primary` first** — it is the one value that can be wrong while every row count is right. Out of scope here: the formalizer is untouched, so nothing writes yet |
| **PR 2 — formalizer wiring + gate** | T-05, T-06, T-07 | ~930 | Step ordering relative to `customStatus`, the zero-interaction guard, and the cross-field composition case. Depends on PR 1 |

PR descriptions follow `cognitive-doc-design` review-empathy rules: what to review first, what is deliberately out of scope, and a link to the paired PR. **PR 2's description must name the `[SO] R-RES-007` amendment explicitly** — it edits another spec's approved requirements, and a reviewer skimming a levers PR would not expect that.

---

## 8. Risks & Blockers Log

| # | Date | Risk / Blocker | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RB-1 | 2026-09-04 | **DC-1** — `is_primary` NOT NULL default `false`; an omitted flag silently writes a contributor | R-RES-003 AC.2 as a value assertion + T-03 falsifier 1 | Implementer | open |
| RB-2 | 2026-09-04 | **DC-2** — a primary-only reconciliation at role 1 would wipe contributors. Unreachable today (DD-6) but resting on an incidental fact | T-03 falsifier 3 makes the inertness falsifiable now | Implementer | open |
| RB-3 | 2026-09-04 | Migration `1783029013035` not applied in a target environment | T-07; rollout blocker | D. Casañas | **open** |
| RB-4 | 2026-09-04 | **Q-1 unanswered** — nested lever children unrepresentable from an id array | Design assumes A-1. If the owner needs them, T-03 and the DTO both change | D. Casañas | **open** |
| RB-5 | 2026-09-04 | **Q-6 unanswered** — DD-10 widens scope by one expression | T-03's DD-10 bullet is written to be droppable with no other change | D. Casañas | **open** |
| RB-6 | 2026-09-04 | This spec edits files the predecessor also owns | §1 concurrency constraint; do not run alongside the predecessor's T-07 | Leader | open |
| RB-7 | 2026-09-04 | Cross-spec id collision on `R-RES-007` | `requirements.md` §2 citation convention | all | open |

---

## 9. Done Definition

The spec is complete when:

- [ ] T-01 … T-07 all `done`.
- [ ] **A human has exercised a real mixed-year bulk upload in Dev BEFORE `/akili-validate` issues a verdict** (T-07, KZ-007) — the first check, not the last.
- [ ] Every requirement AC checked; **every scenario and clause in §4 owned and green.**
- [ ] `npm test -- --silent` and `npm run lint -- --quiet` green; coverage ≥ 60% **reported**.
- [ ] `/swagger` shows the new field on both endpoints.
- [ ] No migration added; migration `1783029013035` confirmed applied where the change deploys.
- [ ] **`[SO] R-RES-007` amended, with both Correction Closure sweep directions evidenced.**
- [ ] Q-1, Q-3, Q-4, Q-5 and Q-6 resolved or explicitly carried forward.
- [ ] Actuals compared against the `design.md` §13 budget; **any overrun escalated rather than absorbed.**
