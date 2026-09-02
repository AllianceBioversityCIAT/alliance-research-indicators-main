# Tasks — Results / AI Formalize: Portfolio-Routed Strategic Objectives

- **Module:** results
- **Spec id:** 2026-09-ai-formalize-strategic-objectives
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Depth:** Standard
- **Requirements:** `./requirements.md` · **Design:** `./design.md`
- **Budget (design.md §13):** 7 tasks · ~250 prod LOC + ~250 test LOC · 2 review rounds
- **Last updated:** 2026-09-02

---

## 1. Task Numbering

`T-01` … `T-07`, in dependency order. All tasks are server-side (`server/researchindicators`).

**Concurrency (root `CLAUDE.md` §4.3):** every task touches the same package, so **no two tasks may run in parallel**, even where the dependency graph would allow it. Run one at a time; measure only in the window after a worker reports.

---

## 2. Dependency Graph

```text
T-02 (resolver) ─────┐
                     │
T-03 (handlers) ──► T-04 (orchestrator) ──┐
                                           ├──► T-05 (formalizer wiring) ──► T-06 (routing + inertness specs) ──► T-07 (full gate)
T-01 (DTO) ───────────────────────────────┘
```

| Task | Depends on | Blocks |
| --- | --- | --- |
| T-01 | — | T-05 |
| T-02 | — | T-05 |
| T-03 | — | T-04 |
| T-04 | T-03 | T-05 |
| T-05 | T-01, T-02, T-04 | T-06 |
| T-06 | T-05 | T-07 |
| T-07 | T-06 | — |

No cycles.

---

## 3. Task List

### T-01 — Add `strategic_objectives` to `ResultRawAi`

- **Requirements covered:** R-RES-001 (scenario "The field is accepted", both clauses, AC.1–AC.4)
- **Files touched (intended):**
  - `src/domain/entities/results/dto/result-ai.dto.ts`
  - `src/domain/entities/results/dto/result-ai.dto.spec.ts`
- **Description:** Add one optional numeric-array property to `ResultRawAi` so the validation pipe stops rejecting the field and `whitelist: true` carries it through. `RootAi` inherits it via `ResultRawAi[]`; do not touch `RootAi` itself.
- **Implementation notes:**
  - `@IsOptional()`, `@IsArray()`, `@IsNumber({}, { each: true })`, `@ApiProperty({ type: Number, isArray: true, required: false })` — matching the shape `regions: number[]` already uses in the same DTO.
  - Also add the field to the internal `ResultAiDto` shape so T-05 has somewhere to carry it.
  - Do **not** add a `@Min`/whitelist of known ids — id validity is T-03's job, per D-3, and duplicating it here would make an invalid id a `400` instead of a reported discard.
- **Acceptance / done check:**
  - [x] `strategic_objectives: [1, 3, 5]` passes validation; `"1,3,5"` and `[1, "x"]` fail with the field named in `errors`.
  - [x] Absence of the field passes (the `BUT it must NOT require any other new field` clause).
  - [ ] `/swagger` shows it as an optional number array under `RootAi.results[]` and `ResultRawAi`. — **carried to T-07:** T-01 asserted the `@ApiProperty` reflect-metadata (the file's own precedent, and what the Swagger document is generated from); the rendered `/swagger` check is T-07's done-check. See `execution.md` → T-01.
- **Tests:** `dto/result-ai.dto.spec.ts` — extend the existing suite.
- **Verification:** `npm test -- --silent src/domain/entities/results/dto/result-ai.dto.spec.ts`
- **Falsifying input (would this check ever FAIL?):** `strategic_objectives: [1, "x"]` against a property declared without `@IsNumber({}, { each: true })` — the per-element rule is the one an `@IsArray()`-only declaration silently omits, and it is exactly what a careless implementation produces.
- **Disqualifies:** a suite that only asserts the happy array. Validating `[1,3,5]` proves the property exists, not that the per-element rule is wired — that is a presence-assertion, not a behavioral proof.
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Effort:** S · **Status:** done

---

### T-02 — Add `PortfoliosService.findByYear(year)` with per-request memoization

- **Requirements covered:** R-RES-002 (both scenarios, both clauses, AC.1–AC.3), NFR-RES-001, NFR-RES-002 — **AC.4 is not T-02's:** `findByYear(year: number)` cannot observe an absent year. `design.md` §5.1 step 2 places the `result.year ?? new Date().getFullYear()` default in the formalizer, so AC.4 is asserted by **T-05** (see `execution.md` → T-02 forward pointer)
- **Files touched (intended):**
  - `src/domain/entities/portfolios/portfolios.service.ts`
  - `src/domain/entities/portfolios/portfolios.service.spec.ts`
- **Description:** Resolve the active portfolio covering a given year from the `portfolios` table, memoized by year on the instance. Returns the portfolio or `null` — never throws, because an unresolvable year is R-RES-006's reported no-write, not an error.
- **Implementation notes:**
  - Predicate: `start_year <= year`, `end_year >= year`, `is_active = true`, ordered by `id`, first row only — mirroring the `get_portfolio_id_by_result` SQL function (`design.md` §3).
  - Memoize in a private `Map<number, Portfolio | null>`. `PortfoliosService` is request-scoped via `CurrentUserUtil` bubbling (`design.md` §2.3), so the cache is per-request; do **not** add invalidation.
  - Cache negative results too, or a batch of 200 unresolvable items produces 200 queries.
  - No year literal anywhere (NFR-RES-001).
- **Acceptance / done check:**
  - [x] 2025 → the portfolio covering 2025; 2026 → the portfolio covering 2026.
  - [x] A portfolio with `is_active = 0` whose range matches is **not** returned (the `AND IT MUST` clause).
  - [x] With fixture ranges shifted so 2026 falls in portfolio 1, the method returns portfolio 1 — the "data change moves the routing" scenario.
  - [x] A year outside every range returns `null` without throwing.
  - [x] A 10-call sequence over 2 distinct years issues 2 repository calls.
- **Tests:** `portfolios.service.spec.ts` — new `describe('findByYear')`.
- **Verification:** `npm test -- --silent src/domain/entities/portfolios/portfolios.service.spec.ts`
- **Falsifying input:** an inactive portfolio row whose range contains the year — an implementation that omits `is_active` from the `where` returns it and FAILs. And the shifted-range fixture FAILs any implementation that compares the year to a constant.
- **Disqualifies:** the memoization assertion is worthless if the repository double does not record calls — a call-count assertion against a stub that cannot count is a tautology (`design.md` §10). The shifted-range test is worthless if it reuses the same year as the unshifted test, since both would pass a hardcoded rule.
- **Skills:** `nestjs-expert`, `tdd`
- **Effort:** S · **Status:** done

---

### T-03 — Add the narrow strategic-objectives save to the alignment handler contract

- **Requirements covered:** R-RES-005 (both scenarios, all clauses, AC.1–AC.4), R-RES-010 (scenario, both clauses, AC.1–AC.2), R-RES-004 (the handler's `supported: false` half), R-RES-003 (the write itself: role, audit, dedup — AC.1, AC.2)
- **Files touched (intended):**
  - `src/domain/entities/results/portfolio-handlers/sections/alignment/alignment-section-handler.interface.ts`
  - `.../alignment/portfolio-1/portfolio-1-alignment.handler.ts` + `.spec.ts`
  - `.../alignment/portfolio-2/portfolio-2-alignment.handler.ts` + `.spec.ts`
  - `src/domain/entities/results/portfolio-handlers/portfolio-handlers.module.ts`
  - **Authorized deviation (Leader, 2026-09-02):** `src/domain/entities/strategic-objectives/strategic-objectives.service.ts` + `.spec.ts` — `StrategicObjectivesService` had no id-filtered finder (`findAll(portfolioId?)` has no id filter; `findOne(id)` throws and ignores `portfolio_id`), so the predicate `design.md` §3 names was unreachable. `findActiveByIdsForPortfolio(ids, portfolioId)` was added there rather than filtering in memory. Recorded in `execution.md` → T-03 so T-07's blast-radius review has the reason.
- **Description:** Extend `AlignmentSectionHandler` (not the generic `PortfolioSectionHandler` — DD-1) with a method that persists only strategic objectives and returns a report: whether the portfolio supports the sub-section, which ids were saved, which were discarded. Portfolio 1 reports unsupported and writes nothing. Portfolio 2 validates ids against **its own** portfolio and writes the survivors. Also harden the two unguarded `.map` calls in the portfolio-2 section save (R-RES-010).
- **Implementation notes:**
  - Report shape carries `supported`, `saved` and `discarded`; the caller formats the reporting (DD-5). The handler must not know about `missing_fields`.
  - Portfolio 2 validation: query `strategic_objectives` by `id IN (ids)` **and** `portfolio_id = this.portfolioId` **and** `is_active = true`, via `StrategicObjectivesService`. Everything not returned is discarded — that single predicate covers all three discard causes (unknown, inactive, foreign portfolio).
  - Deduplicate the input before writing so `saved` matches the rows written (R-RES-005 AC.3).
  - Write through `ResultStrategicObjectivesService.create(..., 'strategic_objective_id', ResultStrategicObjectiveRolesEnum.ALIGNMENT, manager)` — the same role and service the `PATCH` path uses.
  - Add `StrategicObjectivesModule` to `PortfolioHandlersModule` imports. The other three modules this needs are already imported.
  - Portfolio 1 must report unsupported **without** querying anything — its emptiness is a property of the portfolio, not a query result to discover per call.
  - R-RES-010 hardening: treat an absent/null `strategic_objectives` or `impact_outcomes` array as empty inside the existing `save`. Keep the OICR / POLICY_CHANGE indicator gate byte-identical.
- **Acceptance / done check:**
  - [x] Portfolio 2: `[1, 999, 3]` where 1 and 3 are valid → two rows at `role_id = 1`, `discarded` contains 999, no row for 999, no throw.
  - [x] Portfolio 2: an id that exists but has `portfolio_id` of another portfolio is discarded; an id with `is_active = 0` is discarded (the `AND IT MUST` clause).
  - [x] Portfolio 2: `[999, 1000]` → zero rows written, and **no pre-existing row for that result and role is deactivated** (R-RES-005 scenario 2's `BUT`).
  - [x] Portfolio 2: `[1, 1, 3]` → two rows.
  - [ ] Portfolio 2: audit columns populated from the current user. — **not directly assertable at this unit scope** (both specs double `ResultStrategicObjectivesService`). Discharged **by construction**: the narrow save calls the same service, the same `create`, and the same `ALIGNMENT` role as the `PATCH` path, and audit stamping lives in `BaseServiceSimple` via `CurrentUserUtil.audit(SetAuditEnum.BOTH)`, applied unconditionally. **Carried to T-07** for integration-level closure — see `execution.md` → T-03. Deliberately left unticked rather than ticked on inference.
  - [x] Portfolio 1: `supported: false`, zero writes, zero reference-data queries.
  - [x] The existing section `save` returns normally for a payload omitting both arrays, and its behavior for a fully populated payload is unchanged — proven by the **pre-existing** handler spec assertions still passing untouched.
- **Tests:** `portfolio-1-alignment.handler.spec.ts`, `portfolio-2-alignment.handler.spec.ts` — extend both.
- **Verification:** `npm test -- --silent src/domain/entities/results/portfolio-handlers`
- **Falsifying input:** an id row with `portfolio_id` set to the *other* portfolio — an implementation that filters only by `id IN (...)` and `is_active` saves it and FAILs. For R-RES-010, a payload omitting `strategic_objectives` FAILs today's handler with `TypeError`; run it against the unmodified handler first to confirm the test can fail.
- **Disqualifies:** a double for `ResultStrategicObjectivesService` that does not model role scoping — then role correctness is untested however green the suite (KZ-001). Likewise, asserting only that `create` was called proves a call, not a row at role 1: assert the arguments, including the role.
- **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`
- **Effort:** M · **Status:** done

---

### T-04 — Add the explicit-portfolio entry point to the orchestrator

- **Requirements covered:** R-RES-008 (scenario 2 clause: no inherited portfolio state), R-RES-003 (delegation path)
- **Files touched (intended):**
  - `src/domain/entities/results/portfolio-handlers/application/result-section-orchestrator.service.ts`
  - `.../application/result-section-orchestrator.service.spec.ts`
- **Description:** A method that takes the result id, an explicit portfolio id and the objective ids, resolves the handler from the registry, and delegates to T-03's narrow save. It must not consult request-scoped state.
- **Implementation notes:**
  - Must **not** call `resolvePortfolioId()`, and must **not** read `portfolioUtil.portfolio` or `resultsUtil.result` — both getters throw when unset, which is the state a formalize request is in (DD-3).
  - ~~Build the handler context with the given portfolio id; leave `result` and `portfolio` absent.~~ **Superseded by T-03's frozen contract (Leader, 2026-09-02).** T-03 implemented `saveStrategicObjectives(resultId: number, ids: number[])` — it takes no `PortfolioHandlerContext` at all, which makes DD-8's "must not thread an `EntityManager`" true *by construction* rather than by discipline, and makes a caller-supplied `context.portfolioId` diverging from the handler's own `readonly portfolioId` unrepresentable. So: **do not build a `PortfolioHandlerContext`** — resolve the handler from the registry by the given portfolio id and call `registry.get(portfolioId).saveStrategicObjectives(resultId, ids)`. The orchestrator's own signature from `design.md` §2.1 (`saveStrategicObjectivesForPortfolio(resultId, portfolioId, ids)`) is unchanged, and the contract-lens Reviewer confirmed all four T-04 acceptance items still hold — the throwing-doubles check passes *more* strongly, since there is now no context to build and therefore nothing to tempt a `{ ...this.resultsUtil.result }` spread. See `execution.md` → T-03.
  - Pass no `EntityManager` (DD-8): the step runs in its own transaction like every other write in `formalizeResult`.
  - Leave `saveAlignment` / `findAlignment` untouched — the `PATCH`/`GET` path keeps request-based resolution.
- **Acceptance / done check:**
  - [ ] Called with portfolio 2, it invokes the portfolio-2 handler's narrow save; with portfolio 1, the portfolio-1 handler's.
  - [ ] With `PortfolioUtil` and `ResultsUtil` doubles whose getters **throw**, the method still completes — proving no request-scoped read.
  - [ ] An unregistered portfolio id surfaces the registry's existing `NotFoundException` rather than a new error type.
  - [ ] `saveAlignment` and `findAlignment` specs pass unmodified.
- **Tests:** `result-section-orchestrator.service.spec.ts` — new describe block.
- **Verification:** `npm test -- --silent src/domain/entities/results/portfolio-handlers/application`
- **Falsifying input:** doubles for `PortfolioUtil`/`ResultsUtil` whose getters throw. An implementation that reuses `resolvePortfolioId()` or spreads `this.resultsUtil.result` FAILs immediately — this is the check that makes DD-3 enforceable rather than aspirational.
- **Disqualifies:** doubles that return `{}` instead of throwing. A permissive double lets a request-scoped read pass unnoticed, which is precisely the defect this task guards, and the suite would certify its absence while it is present.
- **Skills:** `nestjs-expert`
- **Effort:** S · **Status:** todo

---

### T-05 — Wire the alignment step into `formalizeResult`, with reporting and the metadata guard

- **Requirements covered:** R-RES-003 (scenario, `BUT`/`AND IT MUST`, AC.3–AC.4), R-RES-004 (scenario, both clauses, AC.1–AC.4), R-RES-006 (scenario, both clauses, AC.1–AC.4), R-RES-007 (both scenarios, all clauses, AC.2, AC.4), R-RES-009 (scenario, both clauses, AC.1–AC.3), NFR-RES-003, **R-RES-002 AC.4** (injected by the Leader after T-02's review: `findByYear(year: number)` structurally cannot observe an absent year, and `design.md` §5.1 step 2 places the default here — see `execution.md` → T-02 forward pointer)
- **Files touched (intended):**
  - `src/domain/entities/results/results.service.ts`
  - `src/domain/entities/results/results.service.spec.ts`
- **Description:** Carry the new field through `createResultFromAiRoar`, add the alignment step to `formalizeResult` per `design.md` §5.1, translate the handler's report into `missing_fields` entries and warn lines, and make the metadata sink optional so the single endpoint stops rolling back.
- **Implementation notes:**
  - **Step 1 is the load-bearing guard:** if the list is absent, `null` or empty, return before calling the resolver or the orchestrator. This makes the section-wide save unreachable by construction rather than by care (R-RES-007).
  - Effective year: `result.year ?? new Date().getFullYear()` — the same value `createResultFromAiRoar` already persists.
  - `null` from `findByYear` → no write, append the field-level entry, warn naming the year (R-RES-006). **No fallback portfolio** — not portfolio 1, not lowest id, not highest.
  - `supported: false` → no write, append the field-level entry, warn naming the portfolio (R-RES-004).
  - `discarded` non-empty → append one `strategic_objectives:<id>` entry per discarded id, warn once listing them (`design.md` §5.2).
  - Entries are **appended** to whatever the AI reported; never replace `elementResultMetadata.missing_fields`.
  - One log line per item per case, not per id (NFR-RES-003).
  - Metadata guard: treat the third parameter as optional at **both** `push` sites (the success path and the `catch`). Do not give the single endpoint a throwaway collector (DD-7).
  - Place the step where a later failure still routes through the existing `catch` → `deleteFullResultById`.
  - Contains **no** portfolio branching. If an `if` on a portfolio id appears here, the task is wrong (DD-4).
- **Acceptance / done check:**
  - [ ] 2026 item with valid ids → rows written; item in `results_created`.
  - [ ] 2025 item with ids → item created, zero rows, `missing_fields` contains `strategic_objectives` **in addition to** the AI-reported entries; item **not** in `results_errors`.
  - [ ] 2025 item **without** the field → no such `missing_fields` entry (R-RES-004 AC.4).
  - [ ] Year 2035 (no covering portfolio) → item created, zero rows, field-level entry present, warn names the year, no exception, no fallback portfolio.
  - [ ] Discarded ids appear as `strategic_objectives:<id>`, distinguishable from the field-level entry.
  - [ ] Absent / `[]` / `null` field → the resolver and orchestrator are **never called** (assert zero interactions, not just zero rows).
  - [ ] Single endpoint: a valid payload returns the created result and it persists; an unknown `contract_code` still rolls back and rethrows.
  - [ ] Bulk metadata output unchanged: one `bulk_upload_results` row per item, same fields.
  - [ ] **R-RES-002 AC.4** — an item with **no** `year` resolves via the current calendar year (`result.year ?? new Date().getFullYear()`), and the portfolio it routes to is the one covering that year. Assert against a fixture whose covering portfolio differs from the other items, so a hardcoded calendar-year default cannot pass unnoticed.
- **Tests:** `results.service.spec.ts` — extend `formalizeResult` and `createResultFromAiRoar` describes.
- **Verification:** `npm test -- --silent src/domain/entities/results/results.service.spec.ts`
- **Falsifying input:** an item with `year: 2035`. An implementation that defaults to portfolio 1 when the resolver returns `null` writes rows and FAILs. And a payload with **no** field, asserted with zero-interaction spies on the resolver and orchestrator: any implementation that calls the alignment step unconditionally FAILs even though no rows would be written — which is the whole point, since the row count alone cannot see that defect.
- **Disqualifies:** asserting `missing_fields` **length** or presence rather than content — a length assertion passes while the entry names the wrong thing (DC-4 is silent data loss, and a presence check is blind to it). Also: any inertness assertion that checks only the absence of the new row, without asserting the sibling rows survived (see T-06).
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd`, `systematic-debugging` (on any failure)
- **Effort:** L · **Status:** todo

---

### T-06 — Prove per-item routing and inertness with fixtures that can fail

- **Requirements covered:** R-RES-008 (both scenarios, all clauses, AC.1–AC.4), R-RES-007 (scenario 1 `AND IT MUST`, scenario 2 and its `BUT`, AC.1, AC.3), R-RES-003 (AC.3 rollback)
- **Files touched (intended):**
  - `src/domain/entities/results/results.service.spec.ts`
- **Description:** The two specs the rest of the spec exists to make true. One proves each bulk item routes on its own year; the other proves the new write disturbs nothing else. Both are written to be capable of failing on a plausible wrong implementation.
- **Implementation notes:**
  - **Mixed-year fixture (KZ-004):** three items whose `year` (2025 / 2026 / 2027), `strategic_objectives` list, and `title` **all differ**. A fixture built from identical defaults cannot distinguish per-item routing from a batch-wide constant, and would certify the exact bug R-RES-008 exists to prevent.
  - Assert per item, keyed by that item's own result id — not aggregate row counts. An aggregate count of 5 rows passes while every row hangs off the wrong result.
  - Add the reversed-order run (R-RES-008 AC.2) as a separate case over the same fixture.
  - Mid-batch failure case: force the first (2026) item to fail after its alignment write; assert the second (2025) item resolves to the portfolio covering 2025 and that the batch continues.
  - **Inertness assertion (R-RES-007):** an item carrying both `sdg_targets` and `strategic_objectives`, asserting `is_active` on the resulting `result_sdgs` rows **and** the ALIGNMENT-role `result_contracts` rows. Absence of the new row is not evidence the old rows survived — that is the assertion that would have caught DC-2.
  - Cover `[]` and `null` alongside absent.
- **Acceptance / done check:**
  - [ ] Three-item mixed-year batch: 2026 and 2027 items each hold exactly their own ids; the 2025 item holds none and reports the field.
  - [ ] Reversing item order yields the identical per-item outcome.
  - [ ] No item's objectives are attached to another item's result id.
  - [ ] After the 2026 item fails mid-way, no `result_strategic_objectives` row survives for it, and the 2025 item resolves on its own year.
  - [ ] The both-fields item ends with every `result_sdgs` row and every ALIGNMENT `result_contracts` row `is_active = true`, plus the new row.
  - [ ] The suite FAILs when run against an implementation that resolves the portfolio once per request — verify this deliberately before declaring the task done.
- **Tests:** `results.service.spec.ts`.
- **Verification:** `npm test -- --silent src/domain/entities/results/results.service.spec.ts`
- **Falsifying input:** stated as a done check above — temporarily hoist the resolver call out of the per-item loop and confirm the suite goes red. A routing test that stays green under batch-wide resolution is not evidence, however green it reports.
- **Disqualifies:** identical fixture years; identical objective lists across items; aggregate row-count assertions; an inertness case that omits the sibling-row `is_active` assertions. Any one of these makes the run inconclusive rather than passing — report it as inconclusive, do not commit it as a pass.
- **Skills:** `tdd`, `nestjs-expert`
- **Effort:** M · **Status:** todo

---

### T-07 — Full-suite gate, lint, and the manual Dev verification

- **Requirements covered:** every requirement's blast radius; NFR-RES-004; DC-6, DC-8, DC-9; RK-6
- **Files touched (intended):** none expected. If lint's `--fix` mutates files, re-check `git status` and commit the formatting separately.
- **Description:** The gates that no single earlier task can provide: the full server suite (because the handler chain is shared), and the manual checks that substitute for the three defect classes with no automated gate.
- **Implementation notes:**
  - **Full suite, not targeted (KZ-003).** `Portfolio2AlignmentHandler`, `AlignmentHandlerRegistry` and `ResultSectionOrchestratorService` are shared with `PATCH`/`GET /api/results/:result-code/alignments`. A targeted run confirms the brief was followed, not that the blast radius is clean.
  - Lint's script carries `--fix`, so it **mutates files** — never treat the run as read-only (root `CLAUDE.md` §4.3).
  - **DC-8 (Q-1):** query `strategic_objectives` in Dev and confirm the rows and their `portfolio_id` ownership. `portfolios` was already confirmed by the owner on 2026-09-02 (P1 = 2010–2025, P2 = 2026–2030). Read-only queries only — the shared Dev DB is not disposable and destructive operations against it are a human decision.
  - **RK-6:** confirm migration `1783029013035` is applied in every target environment. If it is not, the compensating delete hits FK error 1451 from inside the `catch`, which aborts the whole batch (`design.md` DD-6). This is a **rollout blocker**, not a warning.
  - **DC-9 (Q-2), and this is the first check rather than the last (KZ-007):** run one real mixed-year bulk upload against Dev using a payload captured from the actual AI extractor — not a hand-written one — and inspect `result_strategic_objectives` and `bulk_upload_results.missing_fields`. Automated gates verify the system against the spec's own description of itself; only this can falsify the assumption that the producer sends numeric ids (A-1).
  - **NFR-RES-004:** reviewed `grep -rn "/v1"` over this spec folder and `server/researchindicators/test`. Every hit must be a statement that a versioned path is *un*reachable; a hit presenting one as callable is a FAIL (KZ-006).
- **Acceptance / done check:**
  - [ ] `npm test -- --silent` green across the whole server package; coverage ≥ 60%.
  - [ ] `npm run lint -- --quiet` clean; `git status` re-checked after.
  - [ ] The alignment endpoint specs pass without modification.
  - [ ] Dev `strategic_objectives` rows and ownership recorded in the spec (Q-1 closed).
  - [ ] Migration `1783029013035` confirmed applied in the target environment (RK-6 closed) — or the rollout is blocked and escalated.
  - [ ] A real-payload mixed-year upload run against Dev, with the observed rows and `missing_fields` recorded (Q-2 closed).
  - [ ] The `/v1` sweep reviewed.
- **Verification:** `npm test -- --silent` and `npm run lint -- --quiet` from `server/researchindicators`; plus the manual steps above, evidenced in writing.
- **Falsifying input:** a Dev `strategic_objectives` table whose rows are not all `portfolio_id = 2` would falsify R-RES-004's premise and send D-2 back for re-decision. A real extractor payload sending names instead of ids would falsify A-1 and require a T-01 change.
- **Disqualifies:** a green targeted run standing in for the full suite. Also: reporting Q-2 as closed on a hand-written payload — that tests the spec's own assumption against itself, which cannot falsify it. If the real payload is unavailable, report Q-2 as **open**, not passed.
- **Skills:** `systematic-debugging` (on any failure)
- **Effort:** M · **Status:** todo

---

## 4. Coverage Closure

Closure is at **scenario and clause** granularity, not requirement ID. Every scenario and every `BUT` / `AND IT MUST` clause below is owned by a named task.

| Requirement | Scenario | `BUT` / `AND IT MUST` clause | Owner |
| --- | --- | --- | --- |
| R-RES-001 | The field is accepted | `BUT` no other new field required | T-01 |
| R-RES-001 | " | `AND IT MUST` reject `"1,3,5"` and `[1,"x"]` | T-01 |
| R-RES-002 | 2026 resolves to its portfolio | `BUT NOT` by a TypeScript literal | T-02 |
| R-RES-002 | " | `AND IT MUST` ignore `is_active = 0` | T-02 |
| R-RES-002 | A data change moves the routing | — | T-02 |
| R-RES-003 | Portfolio 2 persists its objectives | `BUT NOT` touch contracts / sdgs / levers / lever outcomes / lever sdg targets / impact outcomes | T-06 |
| R-RES-003 | " | `AND IT MUST` be undone completely on later failure | T-06 |
| R-RES-003 | " (role, audit, dedup) | — | T-03 |
| R-RES-004 | A 2025 item carrying objectives | `BUT NOT` fail the item or any other item | T-05 |
| R-RES-004 | " | `AND IT MUST` leave other `missing_fields` intact | T-05 |
| R-RES-004 | " (handler reports unsupported) | — | T-03 |
| R-RES-005 | Mixed valid / invalid ids | `BUT NOT` fail the item; `BUT NOT` write for 999 | T-03 |
| R-RES-005 | " | `AND IT MUST` discard foreign-portfolio and inactive ids | T-03 |
| R-RES-005 | Every id invalid | `BUT NOT` deactivate pre-existing rows | T-03 |
| R-RES-006 | A year outside every range | `BUT NOT` throw; `BUT NOT` default to any portfolio | T-05 |
| R-RES-006 | " | `AND IT MUST` log a warning naming the year | T-05 |
| R-RES-007 | Absent field is byte-identical to today | `BUT NOT` deactivate contracts / sdgs / levers / impact outcomes | T-06 |
| R-RES-007 | " | `AND IT MUST` treat `[]` and `null` as absent | T-05, T-06 |
| R-RES-007 | Portfolio-2 item's SDGs survive | `BUT NOT` leave any `result_sdgs` row inactive | T-06 |
| R-RES-008 | A mixed-year batch | `BUT NOT` cross-attach objectives between items | T-06 |
| R-RES-008 | " | `AND IT MUST` be order-independent | T-06 |
| R-RES-008 | A failing item does not poison its successor | `BUT NOT` inherit portfolio state | T-06 |
| R-RES-008 | " (no request-scoped read at all) | — | T-04 |
| R-RES-009 | A valid single payload | `BUT NOT` change bulk metadata reporting | T-05 |
| R-RES-009 | " | `AND IT MUST` still roll back and rethrow on genuine failure | T-05 |
| R-RES-010 | Payload omitting the arrays | `BUT NOT` change the populated-payload outcome | T-03 |
| R-RES-010 | " | `AND IT MUST` keep the OICR / POLICY_CHANGE gate | T-03 |
| NFR-RES-001 | no year literal | — | T-02 |
| NFR-RES-002 | lookups ≤ distinct years | — | T-02 |
| NFR-RES-003 | every discard observable in both channels | — | T-05 |
| NFR-RES-004 | reviewed `/v1` sweep | — | T-07 |

No clause is discharged by citing a different requirement. Every row above quotes the clause it covers.

---

## 5. Testing Expectations

| Item | Value |
| --- | --- |
| Suites | `backend-unit` only. No E2E added — the bulk endpoint has no existing e2e harness, and DC-9's manual gate substitutes for real-payload coverage |
| Spec files | `result-ai.dto.spec.ts`, `portfolios.service.spec.ts`, `portfolio-1-alignment.handler.spec.ts`, `portfolio-2-alignment.handler.spec.ts`, `result-section-orchestrator.service.spec.ts`, `results.service.spec.ts` — all exist; all extended, none replaced |
| Coverage target | global 60% floor, unchanged |
| Fixture rule | **KZ-004** — every multi-item fixture varies `year`, objective list and title per item. Identical defaults cannot distinguish per-unit scoping from a batch-wide bug |
| Double fidelity | **KZ-001** — a double for `ResultStrategicObjectivesService` must model role scoping, and doubles for `PortfolioUtil`/`ResultsUtil` in T-04 must **throw** on read. A permissive double certifies the absence of the defect it was meant to catch |
| Blast radius | **KZ-003** — the final gate is the full package suite, never a targeted run |
| Product exercise | **KZ-007** — the real-payload Dev run (T-07) happens **before** `/akili-validate` issues a verdict, not after |

---

## 6. Execution Conventions

- Commits: `<type>(<module>): <subject>` — e.g. `feat(results.service): route AI strategic objectives by portfolio year`.
- Docs and commit messages in English; discussion may be in Spanish.
- Never `--no-verify`; do not bypass husky.
- One task at a time — all seven touch the same package (§1).
- Never run a measurement command while a delegated agent is active.
- Push only on explicit human request.

---

## 7. PR Strategy

Estimated ~500 total LOC, above the ~400 single-PR threshold. **Two PRs**, split so that no intermediate merge leaves the API accepting a field it silently ignores:

| PR | Tasks | Why this boundary |
| --- | --- | --- |
| **PR 1 — portfolio plumbing** | T-02, T-03, T-04 | Resolver, handler contract, orchestrator entry point. **Zero externally visible change** — nothing calls the new code yet, so it is safe to merge and review on its own. Also lands the R-RES-010 hardening, which is independently valuable |
| **PR 2 — formalizer wiring** | T-01, T-05, T-06, T-07 | The DTO field and the persistence that honors it land **together**. Splitting T-01 into PR 1 would ship a release where a payload is accepted and silently dropped — worse than rejecting it |

PR descriptions follow `cognitive-doc-design` review-empathy rules: what to review first (PR 1 → DD-1's boundary and T-03's discard predicate; PR 2 → T-05 step 1 and T-06's fixture), what is out of scope, and a link to the sibling PR.

---

## 8. Risks & Blockers Log

| # | Date | Risk / Blocker | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RB-1 | 2026-09-02 | Migration `1783029013035` may not be applied in a target environment → FK 1451 inside the `catch` aborts the whole batch | T-07 confirms before rollout; blocker, not warning | D. Casañas | open |
| RB-2 | 2026-09-02 | Real extractor payload may not send numeric ids (A-1) | T-07 real-payload Dev run; report Q-2 open if unavailable | D. Casañas | open |
| RB-3 | 2026-09-02 | Dev `strategic_objectives` ownership unconfirmed (Q-1) | T-07 read-only query | D. Casañas | open |

---

## 9. Done Definition

- [ ] T-01 … T-07 all `done`.
- [ ] A human has exercised a real mixed-year bulk upload in Dev **before** `/akili-validate` issues a verdict (T-07, KZ-007).
- [ ] Every requirement AC checked; every clause in §4 owned and green.
- [ ] `npm test -- --silent` and `npm run lint -- --quiet` green; coverage ≥ 60%.
- [ ] `/swagger` shows the new field on both endpoints.
- [ ] No migration added; migration `1783029013035` confirmed applied where the change deploys.
- [ ] Q-1, Q-2 and RB-1 resolved or explicitly carried forward.
- [ ] Actuals compared against the `design.md` §13 budget; any overrun escalated rather than absorbed.
