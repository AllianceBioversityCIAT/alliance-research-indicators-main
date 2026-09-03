# Execution Log — Results / AI Formalize: Portfolio-Routed Strategic Objectives

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/results/ai-formalize-strategic-objectives` |
| **Spec id** | 2026-09-ai-formalize-strategic-objectives |
| **Approval Mode** | `gated` (proposal §1) — the Leader pauses at every continue/pause gate |
| **Depth** | Standard |
| **Budget (design.md §13)** | 7 tasks · ~250 prod LOC + ~250 test LOC · 2 review rounds |
| **Target package** | `server/researchindicators` (all seven tasks) |
| **Verification** | from `server/researchindicators` → `npm test -- --silent` · `npm run lint -- --quiet` |
| **Branch** | `AC-1607-Send-bulk-upload-completion-email-with-CapDev-metrics` — the owner chose on 2026-09-02 to keep this spec's commits on the existing CapDev branch rather than opening a dedicated one. Recorded because the tasks.md §7 two-PR split now has to be carved out of a shared branch |
| **Concurrency** | tasks.md §1 — every task touches one package, so **no parallel Implementers**. One task at a time |
| **Started** | 2026-09-02 |

### Carried open items (not blockers for implementation)

| # | Item | Why it does not block | Owner |
| --- | --- | --- | --- |
| Q-1 | Dev `strategic_objectives` rows and their `portfolio_id` ownership unconfirmed (DC-8) | The design is written against *"the portfolio owns no active objectives"*, never against *"is portfolio 1"* (requirements §7, DD-4), so the code is correct under either Dev state. Q-1 gates the **verdict**, not the build | D. Casañas · T-07 |
| Q-2 | Producer's real payload shape unconfirmed (A-1 / DC-9) | Manual gate, explicitly scheduled before the validation verdict (KZ-007) | D. Casañas · T-07 |
| RK-6 | Migration `1783029013035` applied in every target environment | Rollout blocker, not an implementation blocker | D. Casañas · T-07 |

---

## 2. Task Execution History

---

### T-01 — Add `strategic_objectives` to `ResultRawAi`

| Field | Value |
| --- | --- |
| **Final status** | **PASS** on attempt 1 of 3 |
| **Date** | 2026-09-02 |
| **Requirements covered** | R-RES-001 (scenario "The field is accepted", both clauses, AC.1–AC.4); NFR-RES-004 / DC-7 on the one file this task already edits |
| **Implementer attempts** | 1 |
| **Model routing** | Implementer T2 (`sonnet`, effort `medium`) · Reviewer T3 (`opus`, Lens-checklist mode) — `author ≠ auditor` held on both axes |
| **Skills assigned** | `nestjs-expert`, `api-design-principles` — as recommended by the task; no deviation |

#### Attempt 1

**Files changed**

| File | Change |
| --- | --- |
| `src/domain/entities/results/dto/result-ai.dto.ts` | `+12` — `strategic_objectives?: number[]` on `ResultRawAi` (`@ApiProperty({ type: Number, isArray: true, required: false })` + `@IsOptional` + `@IsArray` + `@IsNumber({}, { each: true })`), placed immediately after the `regions` exemplar; plus the same property on the internal `ResultAiDto` shape as T-05's carrier |
| `src/domain/entities/results/dto/result-ai.dto.spec.ts` | `+78 / -1` — a new appended `describe` with five cases run through the pre-existing `endpointValidationPipe` (the real `whitelist` + `forbidNonWhitelisted` + `transform` configuration), plus the `/v1` comment correction |

**Implementer verification** — `npm test -- --silent src/domain/entities/results/dto/result-ai.dto.spec.ts` from `server/researchindicators`:

```
PASS src/domain/entities/results/dto/result-ai.dto.spec.ts
Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
```

**Falsification probe (the task's `Disqualifies` clause).** Removing `@IsNumber({}, { each: true })` turned the `[1, "x"]` case **RED** (19 passed, 1 failed) with the other nineteen still green; restoring the decorator returned the suite to **GREEN** 20/20. The per-element rule is therefore proven behaviorally, not asserted into existence.

**Reviewer verdict — `STATUS: PASS`.** *The property matches R-RES-001's Details decorator-for-decorator and mirrors the adjacent `regions` shape, the suite proves the per-element rule behaviorally rather than asserting presence, `RootAi` and the id-validity boundary (DD-1/D-3) are untouched, and the `/v1` comment correction is verified against the live controller (no `@Version`, pipe block at 663-669 as cited).*

The Reviewer independently re-derived two points the Leader had flagged as judgment calls rather than waving them through:

- **AC.3 and the weaker `"1,3,5"` case.** AC.3 demands the field be named in `errors` only for `[1, "x"]`, which the suite asserts against `response.message[]`. The scenario clause for `"1,3,5"` demands rejection alone, which is proven. Additionally the *accept* case is itself a falsifier for the whole decorator set: under `whitelist: true` + `forbidNonWhitelisted: true` an undecorated property is stripped and then rejected, so the `toEqual([1,3,5])` assertion cannot pass without the validators present.
- **AC.4 asks for `/swagger`; the suite asserts reflect-metadata.** Judged a legitimate proxy — the Swagger document is generated deterministically from `swagger/apiModelProperties`, and this is the file's own existing precedent (`AiContactDto`, `result-ai.dto.spec.ts:288-310`), not an invention. `RootAi.results[]` is covered by construction via `@ApiProperty({ type: ResultRawAi, isArray: true })`, which is also why the task forbade touching `RootAi`. The residual gap between metadata and rendered document is already owned by T-07's `/swagger` done-check, so nothing is left unowned.

**NFR-RES-004 / DC-7 partial closure.** The Reviewer ran the sweep over this task's surface: `grep -rn "/v1"` over `src/domain/entities/results` now returns **zero** hits, and every remaining hit in the spec folder is a statement that a versioned path is *unreachable*. The full reviewed sweep (spec folder + `server/researchindicators/test`) remains T-07's.

#### ADVISORY (4R lens — recorded, non-gating, and not convertible into new tasks)

| Lens | Finding |
| --- | --- |
| **Readability** | The two rejection tests keep `{ ...minimalResult, strategic_objectives: … }` expanded over three lines. `.prettierrc` sets only `singleQuote`/`trailingComma`, so `printWidth` stays at the default 80 and prettier will collapse them. T-07's `npm run lint -- --quiet` carries `--fix`, so **expect this file to be mutated there** — re-check `git status` after, per root `CLAUDE.md` §4.3 |
| **Reliability** | The `"1,3,5"` case's bare `rejects.toThrow()` would stay green if the rejection ever came from an unrelated cause (a future edit to `minimalResult`, say). Reusing the sibling case's `toMatchObject({ response: { message: arrayContaining([stringContaining('strategic_objectives')]) } })` would make both cases self-diagnosing. Not applied: the Reviewer ruled AC.3 satisfied as written, and an advisory may not widen an approved task |
| **Risk** | `transform: true` without `enableImplicitConversion` means a producer sending `["1","3"]` receives a `400` rather than coercion. That is **correct** under assumption A-1 and must not be "fixed" in the DTO — but it is the most likely concrete shape of a DC-9 failure, so it is the specific thing to look for when Q-2's real extractor payload is finally run against Dev (T-07) |

#### Decisions made

- **Branch.** The owner elected on 2026-09-02 to keep this spec's commits on `AC-1607-…-CapDev-metrics` rather than opening a dedicated branch. The tasks.md §7 two-PR split must therefore be carved out of a shared branch.
- **The `/v1` comment correction was folded into T-01 by the Leader** rather than deferred to T-07. Rationale: the false claim sat in a file this task already edits, and NFR-RES-004's sweep is *reviewed*, not counted — leaving a known-false hit in place for four tasks would have meant reviewing it twice. The task-level sweep obligation is unchanged and still belongs to T-07.

#### Issues encountered

None. First-attempt PASS; no rework attempt consumed.

**Budget draw:** 1 of 7 tasks · ~90 LOC of the ~500 estimate · **0 of the 2 budgeted review rounds consumed.**

---

### T-02 — Add `PortfoliosService.findByYear(year)` with per-request memoization

| Field | Value |
| --- | --- |
| **Final status** | **PASS** on attempt 1 of 3 |
| **Date** | 2026-09-02 |
| **Requirements covered** | R-RES-002 (both scenarios, both clauses, AC.1–AC.3 — **AC.4 is not T-02's, see the forward pointer below**), NFR-RES-001, NFR-RES-002 |
| **Implementer attempts** | 1 |
| **Model routing** | Implementer T2 (`sonnet`, effort `medium`) · Reviewer T3 (`opus`, Lens-checklist mode) — `author ≠ auditor` held |
| **Skills assigned** | `nestjs-expert`, `tdd` — as recommended by the task; no deviation. `tdd` was kept deliberately: both of this task's falsifiers only bite if the test exists before the predicate |

#### Attempt 1

**Files changed** — `+143`, `-0`. Purely additive; no existing method or assertion altered.

| File | Change |
| --- | --- |
| `src/domain/entities/portfolios/portfolios.service.ts` | `+32` — `findByYear(year)` plus the private `Map<number, Portfolio \| null>` memo and the `LessThanOrEqual`/`MoreThanOrEqual` import |
| `src/domain/entities/portfolios/portfolios.service.spec.ts` | `+111` — a new `describe('findByYear')` with **6** cases and a predicate-evaluating repository double |

**Implementer verification** — from `server/researchindicators`:

```
npm test -- --silent src/domain/entities/portfolios/portfolios.service.spec.ts
Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
```

`grep -rn "20[0-9][0-9]" src/domain/entities/portfolios --include="*.ts"` → zero hits in `portfolios.service.ts`; all hits are fixtures in the two spec files (NFR-RES-001 / AC.3 satisfied). `npx eslint --quiet` on both files → clean.

**Falsification probes (the task's `Disqualifies` clause).** Both named falsifiers were proven capable of failing:

| Substitution | Result |
| --- | --- |
| `is_active` dropped from the `where` | **1 failed, 16 passed** — the inactive-portfolio case went RED (returned the inactive row instead of `null`). Restored → 17 GREEN |
| Predicate replaced with a hardcoded `year >= 2026 ? id:2 : id:1` | **2 failed, 15 passed** — the shifted-range case *and* the unresolvable-year case went RED. Restored → 17 GREEN |

**Reviewer verdict — `STATUS: PASS`.** *`findByYear` reproduces the `get_portfolio_id_by_result` predicate exactly (including ORDER BY id / LIMIT 1 via `findOne`'s `take: 1`), memoizes per-year on a request-scoped instance with negative caching and no invalidation, adds no year literal, and changes nothing else. The test double evaluates real `FindOperator` types verified against the installed TypeORM and records real call counts, so every acceptance clause is backed by an assertion that can actually fail.*

Points the Reviewer established at the source rather than accepting from the report:

- **Predicate fidelity against the SQL function.** Migration `1783020803759` defines the reference as `WHERE p.is_active = 1 AND p.start_year <= v_report_year AND p.end_year >= v_report_year ORDER BY p.id LIMIT 1`. The implementation is clause-for-clause identical. On "first row only": TypeORM 0.3's `EntityManager.findOne` spreads the caller's options and applies `take: 1`, so `order` **is** honored and an explicit `take` would be redundant.
- **Double fidelity (the audit's highest-value check).** `FindOperatorType.d.ts` enumerates `"lessThanOrEqual"` / `"moreThanOrEqual"`; `'type' in condition` resolves through the prototype chain to `FindOperator`'s `get type()` accessor and `condition.value` unwraps to the raw number. The double therefore evaluates the **real** predicate — no silent mis-evaluation. The call-count assertion is likewise non-tautological: `mockImplementation` installs the fake *into* `mockFindOne`, so calls land on the outer `jest.fn`, and `clearAllMocks` + a fresh `TestingModule` per test give each case a clean count.
- **The typing question the Leader raised was ruled a non-issue for the gate.** `tsconfig.json:15` sets `strictNullChecks: false`, so `Map<number, Portfolio | null>.get()` is typed `Portfolio` — the cache-hit return is well-typed under this configuration, not an error the build tolerates. Runtime is safe regardless: the `has()` guard means the key exists and the only writer coalesces with `?? null`. Carried as a readability advisory only.
- **The apparent `Disqualifies` breach was adjudicated, not waved through.** Both the unshifted and shifted-range cases use year 2026, which the letter of the task's `Disqualifies` sentence forbids. The Reviewer ruled it *not* a violation because that sentence's own stated rationale ("both would pass a hardcoded rule") is false here: the two cases assert **opposite** outcomes for the same year, which is precisely the pairing `requirements.md` §5 R-RES-002 mandates (Scenario 1: 2026 → P2; Scenario 2: ranges shifted, 2026 → P1). The requirements text governs the task file, and the hardcoded-predicate probe empirically confirms the discriminating power the clause was protecting.
- **Count discrepancy resolved.** The Implementer's prose said "7 tests"; the working tree has **6** `it(` blocks. The file total of 17 reconciles, so the prose was a miscount, not a missing test. All five acceptance clauses are asserted, plus negative caching as a sixth.

#### 🔭 Forward pointer — carry into T-05's brief

**R-RES-002 AC.4** — *"An item with no `year` resolves using the current calendar year"* — is **structurally unmeetable inside `findByYear(year: number)`**, and the T-02 header's "AC.1–AC.4" claim is therefore too broad. `design.md` §5.1 step 2 places the `result.year ?? new Date().getFullYear()` default in the **formalizer**, and T-05's implementation notes already carry that exact line — but **no T-05 acceptance checkbox asserts it**, and tasks.md §4's closure table tracks scenarios and clauses, not bare ACs, so it does not catch this either.

This is a genuine ownership gap in the decomposition, not an advisory: R-RES-002 AC.4 is an approved acceptance criterion currently owned by nobody's check. **The Leader must inject an explicit assertion for it into T-05's brief** (an item with `year` absent resolves via the current calendar year). Recorded here because a forward pointer is carried by the brief that cites it or by nobody at all.

#### ADVISORY (4R lens — recorded, non-gating, not convertible into new tasks)

| Lens | Finding |
| --- | --- |
| **Readability** | The cache-hit branch `return this.portfolioByYear.get(year);` is asymmetric with the miss branch's `portfolio ?? null`. Correct only because `strictNullChecks` is off; a future strict flip makes it TS2322. Coalescing costs nothing. **Not applied** — behavior-neutral, and an advisory may not widen an approved task |
| **Risk** | The memo's whole safety argument rests on `PortfoliosService` inheriting REQUEST scope by bubbling from `CurrentUserUtil` (verified: `current-user.util.ts:7` is `@Injectable({ scope: Scope.REQUEST })`). **If a future refactor drops `currentUser` from the constructor, the Map silently becomes a process-lifetime cache with no invalidation** — breaking R-RES-002's "a data change moves the routing" *without failing a single test*. An explicit `@Injectable({ scope: Scope.REQUEST })` on the service would make the guarantee structural rather than inherited. Behavior-neutral; DD-2 does not require it. **Surfaced to the owner as a judgment call; not applied unilaterally** |
| **Reliability** | `evaluateWhere` throws on any unmodelled `FindOperator` type. Correct (loud over silent), but a later switch to `Between(...)` would surface as a thrown test error rather than a clean assertion failure — worth knowing before someone reads that stack trace as a product bug |
| **Resilience** | `findByYear` does not guard a non-finite `year`. `NaN` is a stable Map key under SameValueZero, so it memoizes one query returning `null` — degraded, not broken. The effective-year computation belongs to T-05 anyway. No action at T-02 |
| **Verification** | The targeted file run is proportionate here (T-02 touches nothing shared and the method has zero callers), but **DC-6's full `npm test -- --silent` remains owed** at T-07. Do not let targeted runs accumulate into a substitute for it (KZ-003) |

#### Decisions made

- Kept `tdd` as assigned rather than dropping it for a small method: the task's value is entirely in whether its two falsifiers can fail, which is a test-first property.
- Did **not** apply the Risk advisory's explicit `Scope.REQUEST` decorator. It is behavior-neutral, DD-2 does not require it, and an advisory may not grow the approved scope. Raised to the owner instead.

#### Issues encountered

None. First-attempt PASS; no rework attempt consumed.

**Budget draw:** 2 of 7 tasks · ~233 LOC of the ~500 estimate · **0 of the 2 budgeted review rounds consumed.**

---

### T-03 — Add the narrow strategic-objectives save to the alignment handler contract

| Field | Value |
| --- | --- |
| **Final status** | **PASS** on attempt 1 of 3 (both lenses) |
| **Date** | 2026-09-02 |
| **Requirements covered** | R-RES-005 (both scenarios, all clauses, AC.1–AC.4), R-RES-010 (scenario, both clauses, AC.1–AC.2), R-RES-004 (`supported: false` half), R-RES-003 (role, dedup — AC.1; **AC.2 discharged by construction, see below**) |
| **Implementer attempts** | 1 |
| **Model routing** | Implementer T2 (`sonnet`, effort **`high`**) · **two parallel lens Reviewers** T3 (`opus`) |
| **Skills assigned** | `nestjs-expert`, `tdd`, `error-handling-patterns` — as recommended; no deviation |

#### Review mode deviation — parallel lens reviewers instead of the checklist

The lens table selects parallel reviewers at effort `xhigh`/`max` **or when the task touches security, migrations, or data-loss surfaces**. T-03's central hazard is `BaseServiceSimple.create`'s reconciliation semantics — a data-loss surface — so the Leader ran two lens-scoped Reviewers concurrently at effort `high` rather than a single checklist pass:

| Lens | Scope |
| --- | --- |
| **Reliability / data-loss** | the empty-survivor guard, R-RES-010's new semantics, the DD-1 boundary |
| **Contract / blast-radius / risk** | the interface change's consumers, the signature deviation, the portfolio-1 `discarded` contract, module wiring |

Both returned `STATUS: PASS`. No lens FAIL, so no adjudication was required.

#### Attempt 1

**Files changed** — `+486`, `-7` across 8 files. All 7 deletions are in production files; the three spec files are purely additive.

| File | Change |
| --- | --- |
| `.../sections/alignment/alignment-section-handler.interface.ts` | `+41/-4` — promoted from type alias to a real `interface` **extending** `PortfolioSectionHandler`, plus the `StrategicObjectivesSaveReport` shape |
| `.../alignment/portfolio-1/portfolio-1-alignment.handler.ts` | `+18` — `saveStrategicObjectives` returning `supported: false`; **no new dependency** |
| `.../alignment/portfolio-2/portfolio-2-alignment.handler.ts` | `+54/-2` — the narrow save, the new `StrategicObjectivesService` dependency, and the two `?? []` guards (R-RES-010) |
| `.../portfolio-handlers.module.ts` | `+2` — `StrategicObjectivesModule` import |
| three sibling `*.spec.ts` | `+38 / +248 / +65` — new describes only; no pre-existing assertion touched |
| **`.../strategic-objectives/strategic-objectives.service.ts` + `.spec.ts`** | `+27/-1`, `+65` — **authorized deviation, see below** |

**Leader-authorized deviation from the task's intended file list.** `design.md` §3 and T-03 both specify validating "via `StrategicObjectivesService`" with the predicate `id IN (ids) AND portfolio_id = <resolved> AND is_active = true`. **That service had no such method**: `findAll(portfolioId?)` carries no id filter, and `findOne(id)` throws `NotFoundException` and ignores `portfolio_id`. Neither was usable. The Leader authorized adding `findActiveByIdsForPortfolio(ids, portfolioId)` to that service plus a sibling spec, rather than loading a whole portfolio's objectives and filtering in memory. Rationale: keep the query in the service that owns the table — the reasoning DD-2 applies to `PortfoliosService` — match the predicate the design names, and avoid degrading as the table grows. The contract lens judged the resulting API "well-formed and correctly placed", and noted that returning `[]` rather than throwing (unlike `findOne`) is load-bearing for R-RES-005: *a throwing finder would have converted a reported discard into a failed item.*

**Implementer verification** — from `server/researchindicators`:

```
npm test -- --silent src/domain/entities/results/portfolio-handlers
Test Suites: 5 passed, 5 total    Tests: 34 passed, 34 total

npm test -- --silent src/domain/entities/strategic-objectives
Test Suites: 2 passed, 2 total    Tests: 22 passed, 22 total

npx tsc --noEmit -p tsconfig.json   → clean
npx eslint --quiet --fix (8 touched files) → clean
```

**Lint incident, resolved.** The project-wide `npm run lint` glob incidentally reformatted an unrelated **already-committed** file; the Implementer reverted it with `git checkout --` before proceeding. The Leader independently confirmed the T-01 and T-02 commits are intact (`git diff HEAD` over both paths is empty). No work was lost. This is the root `CLAUDE.md` §4.3 warning about the `--fix` script behaving exactly as documented.

**Falsification probes — all three required probes went red:**

| Probe | Result |
| --- | --- |
| `portfolio_id` dropped from the finder's `where` | **RED** — the foreign-portfolio discard case failed. Restored → GREEN (16/16) |
| Both `?? []` guards reverted (R-RES-010) | **RED** — `TypeError: Cannot read properties of undefined (reading 'map')` and `... of null (reading 'map')`. Restored → GREEN. The bug provably existed before the fix |
| Empty-survivor guard removed so the empty case calls `create([])` | **RED** immediately on the `create` not-called assertion. With that assertion temporarily disabled, the stateful reconciler fake flipped `preExisting[0].is_active` from `true` to `false` — proving the pre-existing-row assertion is load-bearing, not decorative. Restored → GREEN (34/34) |

#### Reliability / data-loss lens — `STATUS: PASS`

*The empty-survivor guard is airtight on both branches and provably load-bearing; the DD-1 boundary holds by construction on both handlers with the generic `PortfolioSectionHandler` untouched; and the R-RES-010 `?? []` hardening is conformant because `PATCH .../alignments` is already an unvalidated full-section replace for contracts, SDGs, levers and research areas — `strategic_objectives` was the sole outlier, protected only by a crash.*

- **A hole the Leader had not asked about, checked and closed.** `BaseServiceSimple.create` **re-filters** its input with `.filter((el) => !isEmpty(el?.[generalCompareKey]))`, so a non-empty survivor array could in principle collapse to `[]` *inside* `create` and trigger the wipe regardless of the handler's guard. It cannot here: `isEmpty` is false for `0`, and every element carries a real primary key from a row the finder returned.
- **The Leader's "silent wipe" challenge was investigated and refuted on evidence, not on wording.** `PATCH .../alignments` has **no `ValidationPipe`** on the handler, `main.ts` registers no global pipe, and `ResultAlignmentDto` carries **zero class-validator decorators** — so `PATCH {}` reaches the handler unfiltered. Contracts and SDGs already reconcile to empty via `formatDataToArray(undefined) → []`; levers use an explicit `: []` ternary; `research_areas` already yields `undefined` (pre-existing, untouched by this diff). `Portfolio1AlignmentHandler.save` **already commits that full wipe today**. The `TypeError` was not a guard but an outlier bug that accidentally made portfolio 2 atomic-safe against one malformed shape. DC-2 is scoped to *the new write*, and R-RES-007's text binds the *formalizer* — neither covers PATCH replace semantics.

#### Contract / blast-radius lens — `STATUS: PASS`

*The interface change is additive against a type with exactly four in-package references, all of which still compile and behave; the registry, orchestrator and both alignment-endpoint specs are untouched; module wiring introduces no cycle and resolves the injected service.*

- **Blast radius enumerated exhaustively.** Both handlers `implement` the new member; `AlignmentHandlerRegistry` uses the type only as a generic argument and its constraint is still satisfied by extension; its spec's `{ portfolioId } as Portfolio1AlignmentHandler` doubles stay legal because assignability is insensitive to added members; `ResultSectionOrchestratorService` never names the type. Nothing else in `src/` mentions `AlignmentSectionHandler`, `StrategicObjectivesSaveReport` or `saveStrategicObjectives`.
- **The signature deviation satisfies DD-3 and DD-8 without contradicting §2.1**, which fixes the *orchestrator's* signature, not the handler's. All four T-04 acceptance items still hold — and the throwing-doubles check passes *more* strongly, since there is no context to build and therefore nothing to tempt a `{ ...this.resultsUtil.result }` spread. The choice also makes a whole disagreement class unrepresentable: a caller-supplied `context.portfolioId` can no longer diverge from the handler's own `readonly portfolioId`.
- **A silent-failure mode that was one config flag away.** `strategic_objectives.id` is `bigint`. TypeORM's MySQL driver defaults `bigNumberStrings` to `true`, which would have made every `validIds.has(id)` comparison string-vs-number and **silently discarded every id**. `orm.config.ts:53` sets it to `false`, so the comparison is number-to-number and sound.
- **DD-5 holds structurally**: the only occurrence of `missing_fields` under `portfolio-handlers/` is the prohibition in a doc comment. **Portfolio 1's "zero reference-data queries" holds structurally too** — it has no `StrategicObjectivesService` to call.

#### 🔭 Forward pointer — MUST be copied verbatim into T-05's brief

Both lenses independently flagged this. The contract lens's wording is adopted as canonical:

> T-05 MUST treat `supported === false` as a terminating branch. When the report's `supported` is false: append exactly one **field-level** `strategic_objectives` entry to that item's `missing_fields`, emit exactly one `warn` naming the result and the resolved portfolio, and **ignore `report.discarded` entirely** — no `strategic_objectives:<id>` entry may be emitted on that path, however many ids the report lists. Per-id `strategic_objectives:<id>` entries are emitted **only** when `supported === true` and `report.discarded` is non-empty (`design.md` §5.1 steps 5 vs 6–7, §5.2). A T-05 implementation that iterates `report.discarded` unconditionally is a FAIL of R-RES-005 AC.2 and `design.md` §5.2, because an unsupported item would then carry both `missing_fields` shapes at once. T-05 MUST carry a test that goes red under the unconditional loop: a 2025 (portfolio-1) item with `strategic_objectives: [1, 999]`, asserting `missing_fields` **equals** the AI-reported entries plus exactly `['strategic_objectives']` — content equality, not `toContain`, since `toContain` passes with the spurious per-id entries present.

**Second, smaller forward obligation** from the same contract asymmetry: portfolio 2 returns `supported: true` for an empty id list while portfolio 1 returns `supported: false` for one. T-05's `design.md` §5.1 **step 1** guard is therefore load-bearing for **R-RES-004 AC.4** as well as for R-RES-007 — an empty/`null`/absent list reaching the orchestrator for a portfolio-1 item would emit a `strategic_objectives` entry for an item that never carried the field.

**Third — carried to T-07:** **R-RES-003 AC.2 (audit columns) is not directly asserted by any test and cannot be at this unit scope**, because the specs double `ResultStrategicObjectivesService`. It is discharged **by construction**: the narrow save calls the same service, the same `create`, and the same `ALIGNMENT` role as the `PATCH` path, and audit stamping lives in `BaseServiceSimple` via `CurrentUserUtil.audit(SetAuditEnum.BOTH)`, applied unconditionally. Recorded here so T-07 does not re-litigate it and does not silently tick it either.

#### ADVISORY (4R lens — recorded, non-gating, not convertible into new tasks)

| Lens | Finding |
| --- | --- |
| **Risk — undocumented endpoint semantics** | That `PATCH .../alignments` is a full-section replace (absent == empty == deactivate, for *every* sub-array) appears **nowhere** in `requirements.md` or `design.md`. Without it, the next reader of R-RES-010 will read `?? []` as tolerance rather than intent. A one-line note in `design.md` §5 would fix it. Separately and **out of this spec's scope**: `ResultAlignmentDto` has no class-validator decorators, so a destructive `PATCH` runs with no body validation at all — a standing hazard this spec neither caused nor fixes |
| **Risk — portfolio-1 `discarded`** | Returning `[]` there would make the T-05 obligation unnecessary by construction, which is the spec's own stated preference (§5.1 step 1: *"unreachable by construction rather than by care"*). **Not applied** — it is advisory-derived and may not widen an approved task; the forward pointer above is the mitigation |
| **Reliability — DD-8's "own transaction" is loose** | The narrow save passes no manager, so `create`'s deactivate-`update` and insert-`save` are two auto-committed statements with no enclosing transaction; a failure between them deactivates survivors without writing replacements. **Inert for the only intended caller** (a freshly created result has no pre-existing ALIGNMENT rows, and `deleteFullResultById` compensates), but the method is public on the handler contract. DD-8 would be more accurate as *"not the caller's transaction"* |
| **Risk — stale barrel** | `portfolio-handlers/index.ts` exports neither new type, and nothing in `src/` imports from that barrel — `results.service.ts` and `results.controller.ts` both deep-import. T-05 will deep-import too, matching local precedent. Leaving the barrel half-accurate invites a future reader to trust it as the module's public surface |
| **Readability** | `AlignmentSectionHandler` now carries two save methods with dissimilar shapes. Justified and explained in the interface doc comment — keep that comment if the signature is ever revisited |

#### Decisions made

- **Ran parallel lens reviewers** rather than the single checklist, on the data-loss-surface trigger. Cost: one extra Reviewer. Return: the `isEmpty` re-filter hole, the `bigNumberStrings` near-miss, and the exhaustive consumer enumeration each came from a lens that had room to look.
- **Authorized the two-file deviation** to `strategic-objectives.service.ts` + spec (rationale above). T-03's file list in `tasks.md` amended to match, per the contract lens's process advisory.
- **Amended T-04's implementation note.** Its bullet *"Build the handler context with the given portfolio id; leave `result` and `portfolio` absent"* is now a no-op under the frozen signature. Corrected in `tasks.md` so the T-04 Implementer does not build a `PortfolioHandlerContext` and discard it. This is an implementation note, not a DD or AC — nothing in the §4 coverage table is orphaned.
- **Did not apply** the portfolio-1 `discarded: []` change, the DD-8 wording fix, the `design.md` §5 replace-semantics note, or the barrel export. All are advisory-derived; advisories are recorded and do not grow the approved spec.

#### Issues encountered

None blocking. First-attempt PASS on both lenses; no rework attempt consumed.

**Budget draw:** 3 of 7 tasks · ~719 LOC against the ~500 estimate — **the LOC budget is now exceeded; see the tripwire note below** · **1 of the 2 budgeted review rounds consumed** (the parallel-lens pass counts as one round).

> **⚠️ Budget tripwire — LOC.** `design.md` §13 estimated ~500 total LOC across all seven tasks. Three tasks in, the actual is **~719** (90 + 143 + 486), and the four largest-surface tasks remain. The overrun is concentrated in T-03, where ~350 of the 486 lines are **test** code — driven by this spec's own KZ-001/KZ-004 double-fidelity and falsifiability requirements, which the budget's per-task estimate did not price. Per `/akili-execute` Step 2.4 this is escalated to the owner rather than absorbed. See KZ-008: a re-baseline must correct the **basis**, not just the total.

---

## Budget Re-baseline — 2026-09-02, after T-03

**Trigger.** The Step 2.4 tripwire fired at the close of T-03: ~719 actual LOC against a ~500 estimate, with the four largest-surface tasks still ahead. Escalated to the owner rather than absorbed. **Owner decision: re-baseline the basis.**

**What was wrong with the basis.** The original §13 priced test code at ~1:1 against production. Measured across T-01…T-03 the real ratio is **~3:1**, and the cause is this spec's own evidence standard rather than scope growth:

- **KZ-001 (double fidelity)** — doubles must *evaluate* what they stand in for. T-02's repository double parses TypeORM `FindOperator` internals; T-03's is a stateful reconciler modelling `BaseServiceSimple.create`'s deactivation semantics. 20–40 lines each where a canned stub would be 2.
- **KZ-004 (discriminating fixtures)** — fixtures must vary per unit, so they cannot be shared or defaulted.
- **Falsifier probes** — every acceptance clause needs a case that provably goes red, often a second negative-asserting test.
- **Clause-level closure** — tasks.md §4 closes at `BUT` / `AND IT MUST` granularity, so clauses become individual cases.

**Production LOC is tracking close to the original estimate (179 actual of ~250 across three tasks). The entire overrun is test code** — and it is buying the falsifiability that has already caught two real defects: the empty-survivor wipe (T-03) and the missing per-element validator (T-01).

**Revised figures** (`design.md` §13.3 carries the per-task table; §13.1 preserves the superseded original):

| Metric | Original | Revised |
| --- | --- | --- |
| Tasks | 7 | **7** (unchanged — the decomposition was right) |
| Production LOC | ~250 | **~310** |
| Test LOC | ~250 | **~1,130** |
| Total LOC | ~500 | **~1,440** |
| Review rounds | 2 | **4** |

Review rounds raised on measured evidence: T-03 alone consumed a full round as a parallel two-lens pass, and the original §13 correctly predicted R-RES-007 and R-RES-008 would each need one — those are T-05 and T-06, both still ahead.

**Depth re-check: Standard stands.** Task count, file count and requirement set are all unchanged; no migration, auth, or cross-package work has appeared.

**The tripwire stays armed** against the revised figures. Specific thresholds to watch: T-05 above ~350 total, T-06 above ~240, or a fifth review round.

---

## Session Pause — 2026-09-02

**Owner elected to pause here and resume tomorrow.** State is clean: no task is in flight, no delegation is outstanding, and nothing is uncommitted.

| Item | State |
| --- | --- |
| **Completed** | T-01 `[x]`, T-02 `[x]`, T-03 `[x]` — all PASS on attempt 1, all committed |
| **Commits** | `367336de` (T-01) · `d5a1db5b` (T-02) · `4590f22b` (T-03), on branch `AC-1607-Send-bulk-upload-completion-email-with-CapDev-metrics` |
| **Next eligible** | **T-04** — explicit-portfolio entry point on the orchestrator (effort S, no dependencies beyond T-03 which is now done) |
| **Working tree** | clean |
| **Unpushed** | yes — push is the owner's call and has not been requested |

### What the next session MUST carry into T-05's brief

These are recorded here because a forward pointer is carried by the brief that cites it, or by nobody at all. **Re-read this block when composing T-05.**

1. **The `supported === false` terminating branch** — the verbatim obligation is in the T-03 entry above, under *Forward pointer*. It includes the required red-capable test (content equality on `missing_fields`, not `toContain`).
2. **Step 1's guard is load-bearing twice over** — for R-RES-007 *and* for R-RES-004 AC.4, because portfolio 1 returns `supported: false` even for an empty id list.
3. **R-RES-002 AC.4** — injected into T-05's acceptance list after T-02's review; `findByYear(year: number)` structurally cannot cover it.

### Carried to T-07

- **R-RES-003 AC.2 (audit columns)** — box deliberately left unticked; discharged by construction, needs integration-level closure.
- **The full-package suite (DC-6 / KZ-003)** — three targeted runs have accumulated; T-07 must not inherit an "already green" assumption from them. No coverage figure has been reported since execution began.
- **Q-1, Q-2, RK-6** — unchanged and still open (see Document Control).
- **The `/swagger` render check** for R-RES-001 AC.4.

### Recommended resume path

`/akili-resume`, or `/akili-execute results/ai-formalize-strategic-objectives` — the latter rebuilds state from this log and selects T-04 automatically.

---

## Session Resume — 2026-09-03

Resumed via `/akili-execute results/ai-formalize-strategic-objectives`. State rebuilt from this log: T-01…T-03 `[x]`, working tree clean at `2a9a1f70`, no delegation outstanding. Selected **T-04** as next eligible. Approval mode `gated` — unchanged.

---

### T-04 — Add the explicit-portfolio entry point to the orchestrator

| Field | Value |
| --- | --- |
| **Final status** | **PASS** on attempt 1 of 3 |
| **Date** | 2026-09-03 |
| **Requirements covered** | R-RES-008 (scenario 2 clause: no inherited portfolio state), R-RES-003 (delegation path); DD-3, DD-8 |
| **Implementer attempts** | 1 |
| **Model routing** | Implementer T2 (`sonnet`, effort `medium`) · Reviewer T3 (`opus`, Lens-checklist mode) — `author ≠ auditor` held on both axes |
| **Skills assigned** | `nestjs-expert` (as recommended by the task) **+ `tdd` — Leader deviation.** T-04 adds two lines of production logic; its entire value is a test that can go red on a request-scoped read. `tdd` was added so the falsifier probe was authored as a first-class obligation rather than an afterthought. Recorded per the Delegation Discipline rule that deviations from the `## Skill Map` defaults are logged |

#### Attempt 1

**Files changed**

| File | Kind | LOC |
| --- | --- | --- |
| `src/domain/entities/results/portfolio-handlers/application/result-section-orchestrator.service.ts` | production | **+23** (1 import + the method with its DD-3/DD-8 doc comment) |
| `.../application/result-section-orchestrator.service.spec.ts` | test | **+137** (1 import + one new `describe` block, 4 tests) |
| | **total** | **+160** |

Only the two files the task authorized. `resolvePortfolioId`, `buildContext`, `findAlignment` and `saveAlignment` are byte-identical — the Reviewer confirmed this from the hunk headers (`@@ -148,4 +149,139 @@` is a pure append; nothing touches lines 10–148 where the seven pre-existing tests live).

**What was implemented**

```ts
async saveStrategicObjectivesForPortfolio(
  resultId: number,
  portfolioId: PortfolioIdEnum,
  ids: number[],
): Promise<StrategicObjectivesSaveReport> {
  const handler = this.alignmentRegistry.get(portfolioId);
  return handler.saveStrategicObjectives(resultId, ids);
}
```

Two lines, and that is the point: under T-03's frozen handler signature there is no `PortfolioHandlerContext` to build, so DD-3 and DD-8 hold **by construction** rather than by discipline — there is nothing to tempt a `{ ...this.resultsUtil.result }` spread and no `EntityManager` parameter to thread. The `design.md` §2.1 orchestrator signature is unchanged.

**Verification**

`npm test -- --silent src/domain/entities/results/portfolio-handlers/application` from `server/researchindicators`:

```
PASS src/domain/entities/results/portfolio-handlers/application/result-section-orchestrator.service.spec.ts

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
```

**Falsifier probe — red confirmed.** A temporary `const FALSIFIER_PROBE = this.resultsUtil.result;` at the top of the method took the suite from 11 passed to **4 failed / 7 passed**, then was reverted. The arithmetic is itself corroborating evidence: 4 failed is exactly the four new tests — including the `NotFoundException` test, which flips to `BadRequestException` because the injected read happens before the registry lookup — and 7 passed is exactly the untouched pre-existing set, which re-confirms acceptance item 4 held *during* the probe.

**Reviewer verdict — `STATUS: PASS`**

> The explicit-portfolio entry point conforms to DD-3 and DD-8 exactly — no request-scoped read, no `EntityManager`, no transaction wrapper — and the four new tests are a real falsifier, not a certifying one: the registry double faithfully mirrors the real `NotFoundException`, and the two handler doubles are distinguishable so a hardcoded portfolio cannot pass. `saveAlignment` / `findAlignment` are byte-identical.

The Reviewer verified the two double-fidelity questions **at the source** rather than accepting the diff's own comments:

- **The registry double is not tautological.** `AbstractSectionHandlerRegistry.get` genuinely throws `NotFoundException(\`No handler registered for portfolio ${portfolioId} in ${this.constructor.name}\`)`, and the double reproduces both the type and the message shape — hardcoding `AlignmentHandlerRegistry`, which is what `this.constructor.name` actually yields for that subclass. `999` is genuinely unregistered, since the registry maps only `PORTFOLIO_1` / `PORTFOLIO_2`. The test's real content is that the orchestrator neither catches, wraps, nor substitutes a fallback — and the diff contains no `try` and no fallback.
- **The throwing getters match production exactly** — `BadRequestException('Portfolio not found')` (`portfolio.util.ts:85-89`) and `BadRequestException('Result not found')` (`results.util.ts:81-84`). KZ-001 satisfied: the doubles evaluate what they stand in for.
- **KZ-004 satisfied** — two distinguishable jest mocks returning *different* reports, plus mutual `not.toHaveBeenCalled()` assertions, so a hardcoded or constant-portfolio implementation cannot pass either delegation test.

**Acceptance / done check — all four closed**

| # | Item | Evidence |
| --- | --- | --- |
| 1 | Portfolio 2 → portfolio-2 handler; portfolio 1 → portfolio-1 handler | Two tests, distinguishable mocks + reports, mutual `not.toHaveBeenCalled()` |
| 2 | Completes with throwing `PortfolioUtil` / `ResultsUtil` getters | Test 3; falsifier probe proved it goes red on a `resultsUtil.result` read |
| 3 | Unregistered id surfaces the registry's existing `NotFoundException` | Test 4; Reviewer verified the real registry throw at source |
| 4 | `saveAlignment` / `findAlignment` specs pass unmodified | Hunk headers show a pure append; 7 pre-existing tests green, including during the probe |

**Coverage of DD-3's forbidden surface (Reviewer's analysis).** DD-3 names three things the method must not do, and all three are armed — though by two mechanisms: `.portfolio` and `.result` by throwing getters, and `resolvePortfolioId()` *indirectly*, because it reads `portfolioUtil.nullPortfolioId` (plain `undefined` on the double → falsy → the orchestrator's own `BadRequestException`). The third arm is therefore live but coupled to the production guard's internals rather than to the double. See the first advisory.

**Decisions made**

- **`tdd` added to the assigned skills** (deviation, justified above).
- **No `@akili-spec` marker added.** Step 3.4 asks for spec references in *critical or complex* additions; a two-line delegation whose doc comment already cites DD-3, DD-8 and R-RES-008 by name is neither, and the surrounding file uses prose doc comments as its idiom. Consistent with T-01…T-03.
- **The Reviewer's advisories were recorded, not acted on** — see the rule below.

**Issues encountered** — none. No rework, no ambiguity escalation, no environment blocker. The task needed no running stack.

#### ADVISORY (4R lens) — recorded, non-gating

Per the Advisory Never Gates / Advisory Never Becomes A Task rules, none of these consumed an attempt, none widened T-04, and none may mint a new task in this spec.

| Lens | Finding |
| --- | --- |
| **RELIABILITY** | `nullPortfolioId` is left permissive (`undefined`) on the `PortfolioUtil` double, so the `resolvePortfolioId()` arm of the falsifier fires only because `resolvePortfolioId` itself converts falsy to a throw. It works today, but it is the one arm coupled to production-guard internals rather than to the double. Arming `nullPortfolioId` as a throwing getter would make that arm self-sufficient, using the same one-line idiom already present for `.portfolio` |
| **RISK** | The doubles arm only `.portfolio` / `.result`. The real utils have five more throwing getters (`portfolioId`, `portfolioName`, `portfolioDescription`, `resultId`, `resultCode`); a bare read of one would pass this suite silently. Outside DD-3's named scope, so not a conformance gap — but this block is not a *general* DD-3 gate, only a gate on the three surfaces DD-3 names |
| **RISK** | Test 4 asserts the exception type only, not the message. A hand-rolled `NotFoundException` thrown by the orchestrator would satisfy it. No such throw exists in the diff, and the acceptance item's own wording is "error type", so this is literal-AC-compliant |
| **RESILIENCE** | Because the registry is doubled, this suite cannot notice if the real `AbstractSectionHandlerRegistry.get` ever stops throwing. DC-6 already mandates a full-suite run for the shared alignment chain — that is where this closes, not here |
| **READABILITY** | The new block uses `{} as PortfolioUtil` + `Object.defineProperty`, while the existing block uses `as unknown as PortfolioUtil` on an object literal. Cosmetic; the KZ-001 comment already explains the intent |

**Explicitly not carried forward as an obligation.** The second RISK advisory reads as a conditional caution ("*if* T-05 or later widens what the orchestrator may touch"). It is **not** injected into T-05's brief: T-05 does not widen the orchestrator's surface, and turning an advisory into a downstream acceptance item is exactly the scope growth the Advisory Never Becomes A Task rule forbids. Recorded here and it dies here.

**Budget.** +160 LOC (23 prod / 137 test) against the re-baselined ~1,440 total; cumulative production LOC now ~202 of ~310. Review rounds consumed: still 1 per task, 0 rework. The armed tripwire thresholds — T-05 above ~350 total, T-06 above ~240, or a fifth review round — are untouched. **The ~3:1 test-to-production ratio the re-baseline established held again here (137:23 ≈ 6:1 on a task that is almost entirely test), consistent with the corrected basis rather than with the superseded one.**

**Constitution impact** — none. No module created, no boundary moved, no public surface change beyond one method on an existing internal service. No child-guide or `## Module Guides` update needed.
