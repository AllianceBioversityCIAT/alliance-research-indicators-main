# Execution Log — Results / AI Formalize: Portfolio-Routed Strategic Objectives

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/results/ai-formalize-strategic-objectives` |
| **Spec id** | 2026-09-ai-formalize-strategic-objectives |
| **Approval Mode** | `gated` (proposal §1) — the Leader pauses at every continue/pause gate |
| **Depth** | Standard |
| **Budget (design.md §13.5 — live)** | 7 tasks · ~268 prod LOC + ~1,633 test LOC (~1,901 total) · **4 rework rounds** (0 consumed). Re-baselined 2026-09-02 (§13.3) and 2026-09-03 (§13.5); the review-round metric was retired as mis-specified on 2026-09-03. **This row was itself stale from 2026-09-02 to 2026-09-03** — it still carried the original ~500/2 figures through the first re-baseline, which is the same carried-forward-metric failure KZ-008 names. Fixed and now maintained as a live field |
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

---

## ⚠️ Budget Tripwire — 2026-09-03, T-05 implemented, escalated **before** review

**Two armed thresholds from `design.md` §13.4 fired at the same moment.** Escalated to the owner rather than absorbed. **T-05 is `[~]`, implemented but unreviewed; its work sits uncommitted in the working tree.**

### Why the escalation happened *before* the Reviewer, not after

§13.4 arms three specific figures: *"T-05 above ~350 total, T-06 above ~240, or a fifth review round."* T-05 breached the first, and **spawning T-05's Reviewer is itself the fifth review round** — so the review pass could not be run without consuming the very threshold under watch. Escalating first is the only order that leaves the owner a decision.

### Threshold 1 — T-05 LOC

| Metric | §13.3 estimate | Actual | Delta |
| --- | --- | --- | --- |
| Production | ~90 | **56** | **−38%** (under) |
| Test | ~260 | **~556** | **+114%** |
| Total | ~350 | **~612** | **+75%** |

Plus 2 lines of prettier line-joining in `dto/result-ai.dto.spec.ts` from the mandatory `lint --fix` (root `CLAUDE.md` §4.3 warns the script mutates files). Leader verified: pure formatting, T-01's own tests, no assertion altered. Accepted rather than reverted — reverting re-dirties lint for the next run.

### Threshold 2 — the fifth review round, and why that metric is mis-specified

Four review rounds are consumed (T-01…T-04, one Reviewer pass each) with **zero rework rounds** — every task has passed on attempt 1. T-05's pass would be the fifth.

**But the metric cannot mean what it literally says.** Seven tasks each requiring at least one independent review pass puts the *floor* at **7**, and both the original (2) and revised (4) figures are below that floor. A budget of 4 review rounds for 7 tasks was unsatisfiable the day it was written, regardless of execution quality. Read as *rework* rounds — extra Implementer→Reviewer cycles beyond the first — the spec stands at **0 of 4**, comfortably under.

**This is KZ-008 recurring in a new form.** The 2026-09-02 re-baseline corrected the LOC *basis* (1:1 → 3:1) but carried the review-round metric forward without re-deriving it, so an uncorrected per-item estimate breached again at the next measurement — exactly the failure mode KZ-008 names. Recorded for the Kaizen step; the lesson may need widening from "the basis" to "every metric in the re-baseline, including the ones the trigger did not concern."

### Spec-level position, with two tasks left

| Metric | Revised §13.3 | Actual T-01…T-05 | Remaining (est.) | Projected | vs revised |
| --- | --- | --- | --- | --- | --- |
| Production | ~310 | **258** | ~10 (T-07) | **~268** | **−14% (under)** |
| Test | ~1,130 | **1,233** | ~240 (T-06) | **~1,473** | **+30%** |
| Total | ~1,440 | **1,491** | ~250 | **~1,741** | **+21%** |
| Rework rounds | 4 | **0** | — | — | **under** |

Per-task actuals against §13.3: T-04 160 vs ~120 (+33%), T-05 ~612 vs ~350 (+75%).

**The diagnosis is unchanged from 2026-09-02, and it is not scope growth.** Production LOC is coming in *under* the corrected estimate and will finish there — the feature is the size it was designed to be. The entire variance is test code, and the cause is this spec's own evidence standard, which the Implementer was explicitly forbidden from trimming:

- **The `Disqualifies` clause bans every cheap shortcut.** No `missing_fields` length or presence assertions, no `toContain` where content equality is required, no inertness check that omits the sibling rows. Each prohibition converts one cheap assertion into a fixture-plus-content-equality case.
- **KZ-004 forbids shared fixtures.** Nine acceptance items with per-item routing semantics need nine discriminating fixtures (distinct year *and* distinct ids), which cannot be defaulted or shared.
- **KZ-001 forbids canned doubles.** T-05's `findByYear` double routes by a year→portfolio map and the orchestrator double returns per-portfolio reports — a constant-returning stub would be 2 lines and would certify a batch-wide bug as correct.
- **Two forward obligations arrived as scope**, each with its own mandated red-capable test: T-03's `supported === false` terminating branch (content equality, not `toContain`) and T-02's R-RES-002 AC.4 gap. Neither was in the §13.3 estimate for T-05 — the estimate predates both.

**What the evidence has bought so far:** three defects caught before review across the spec — the empty-survivor wipe (T-03), the missing per-element validator (T-01), and T-05's three falsifier probes each confirmed red on the exact bug their requirement names, including the unconditional-`discarded`-loop bug the T-03 forward pointer predicted in advance.

### Implementer's `Not Done / Assumptions` — carried verbatim, per Step 2.3.0

> - Budget tripwire breach (above) — reported, not silently absorbed.
> - Judgment call: used `processedResult.strategic_objectives` (the carried field) rather than raw `result.strategic_objectives` for the ids passed to the orchestrator, since the task explicitly required carrying the field through `createResultFromAiRoar` and this matches how every other data field in `formalizeResult` flows (sdgs, ipRights, geoScope, etc.). Effective year is computed independently in `formalizeResult` from the raw `result.year` (not from `processedResult.result.year`), per the implementation note's literal expression and to keep the AC.4 test decoupled from how `createResultFromAiRoar` is mocked.
> - `dto/result-ai.dto.spec.ts` was reformatted by mandatory `lint --fix` (pure whitespace, no assertions changed) — flagged, not reverted, since reverting would leave it lint-dirty again for the next run.
> - T-06/T-07 items (mixed-batch cross-item leakage stress test, inertness on sibling `result_sdgs`/`result_contracts` rows, full-package suite, Dev manual checks) are explicitly out of T-05's scope and untouched.

**Leader adjudication of that field:** it contains **no outstanding scope** — an escalation, a recorded judgment call, a disclosure, and a confirmation of what is out of scope. All nine acceptance items plus both forward obligations and the AC.4 injection are reported covered. So this field does not independently bar `[x]`; the unrun review and the tripwire do. The judgment call is sound and worth flagging to the Reviewer: reading ids from `processedResult` while computing the year from raw `result.year` is a deliberate asymmetry, and the Reviewer should confirm it cannot desynchronize the year used for routing from the year persisted.

### Verification already on record (Implementer, pre-review)

| Command | Result |
| --- | --- |
| `npm test -- --silent src/domain/entities/results/results.service.spec.ts` | **PASS** 114/114 |
| `npm test -- --silent src/domain/entities/results` (KZ-003 blast radius, Leader-added) | **PASS** 10 suites / 263 tests |
| `npm run lint -- --quiet` | clean (`git status` re-checked; the one out-of-scope file above) |

**Falsifier probes — all three confirmed red, then reverted and re-confirmed green:**

| Probe | Mutation | Result |
| --- | --- | --- |
| No-fallback-portfolio (R-RES-006) | injected a portfolio-1 fallback when `findByYear` returns null | year-2035 test **red** |
| Step-1 guard (R-RES-007) | replaced the guard with `if (true)` | all three absent/`[]`/`null` cases **red** — `findByYear` called once, expected zero |
| `supported === false` terminating branch (T-03 forward obligation) | replaced the if-else with two independent unconditional `if`s — the exact bug the forward pointer predicted | content-equality test **red**, spurious `strategic_objectives:1` / `:999` entries present |

**Leader-verified independently of the report:** DD-4 clean (no `PORTFOLIO_1` / `PORTFOLIO_2` / portfolio-id comparison anywhere in the added production lines) and DD-7 satisfied at both `push` sites (`resultMetadata?.push(...)`, lines ~955 and ~980).

### Decision required from the owner

The spec's own rule: *"Exceeding a budget is information, not failure; the cost of a mis-sized spec is only recoverable while it is still running."* Options put to the owner:

1. **Re-baseline again and continue** — accept ~1,741 projected total, and re-derive the review-round metric as *rework* rounds (0 of 4 used). Precedent: the 2026-09-02 decision on the same cause.
2. **Continue without re-baselining**, recording T-05 as an accepted overrun with the tripwire re-armed for T-06 at ~240.
3. **Relax the evidence standard for T-06** — the only lever that actually reduces the remaining number, since T-06 is a pure-test task. This trades away the `Disqualifies` protections and the KZ-001/KZ-004 fidelity that have caught three defects. Not recommended.
4. **Stop the spec here** and defer T-06/T-07 to a follow-up.

Pending the decision, **T-05's Reviewer has not been spawned** and no attempt has been consumed.

### ✅ Owner decision — 2026-09-03: **Option 1, re-baseline again and continue**

**Decision:** re-baseline against the measured actuals and proceed with T-05's review. The evidence standard is **not** relaxed (option 3 declined by not being chosen — the `Disqualifies` clauses, KZ-001 double fidelity and KZ-004 discriminating fixtures all stand for T-06).

**Applied to the spec documents:**

| Document | Change |
| --- | --- |
| `design.md` §13 | Preamble rewritten to record **two** re-baselines. §13.3 relabelled *"First revision — superseded by §13.5"*. §13.4 relabelled and annotated with the firing outcome. **New §13.5 is the live budget** (~268 prod / ~1,633 test / ~1,901 total). **New §13.6** re-arms the tripwire |
| `design.md` §13.5 | **The review-round metric is retired**, not merely raised — see below. Replaced by **4 rework rounds**, 0 consumed. T-06 re-estimated ~240 → **~400** off measured multi-item fixture density |
| `tasks.md` header | Live budget line rewritten to §13.5 figures, with both superseded baselines preserved |
| `execution.md` Document Control | Budget row rewritten to §13.5. **This row was itself stale** — it still carried the original ~500/2 figures straight through the 2026-09-02 re-baseline, undetected for a day. Now flagged in place as a live field |

**Why the review-round metric was retired rather than raised.** Seven tasks each requiring one independent Reviewer pass puts the floor at **7**; the original budget said 2 and the first revision said 4. The figure was unsatisfiable the day it was written, so the tripwire was guaranteed to fire on it regardless of execution quality — and it fired on a spec with **zero rework**. One review pass per task is the *method*, not an overrun. What is worth budgeting is **rework** rounds: extra Implementer→Reviewer cycles beyond the first, which signal an under-specified task. Budget 4; consumed 0.

**KZ-008 needs widening, and this is the second instance in two days.** The 2026-09-02 re-baseline corrected the LOC basis but carried the review-round count forward untouched, and it breached at the very next measurement — the same shape of failure KZ-008 already describes for an uncorrected per-item estimate. The `execution.md` Document Control row above is a *third* instance of the identical pattern in this same spec: a live figure that a correction did not sweep. Proposed widening, for the Kaizen step at `/akili-archive`:

> A re-baseline must re-derive **every metric it restates and sweep every live field that carries one** — not only the metric the triggering measurement concerned. An untouched metric carried through a correction is indistinguishable from a validated one, and it breaches at the next measurement exactly as an uncorrected basis does.

**Correction closure sweep (two directions), per `/akili-specify` → *Correction Closure*:**

- **Forward** (the superseded values, swept across the whole spec folder): `~1,440`, `~1,130`, `~310`, `~350`, `~240`, `4 review rounds`. Found and fixed in the two **live** headers (`tasks.md` §header, `execution.md` Document Control). All remaining occurrences are inside `execution.md`'s append-only task entries and `design.md` §13.1/§13.2/§13.3/§13.4 — **deliberately left unchanged**, because those are point-in-time records and a log that rewrites its own history stops being evidence.
- **Backward** (documents citing the corrected sections): `design.md` §13.3 was cited by the `tasks.md` budget header and by the tripwire text in §13.4 — both updated to point at §13.5. `tasks.md` §8's done-check cites `design.md` §13 generically and needs no change. One factual error was caught by the sweep itself and fixed: §13.5's T-06 rationale said *"three measurements"* while listing two.

**Tripwire re-armed** (§13.6): T-06 above ~400, T-07 above ~60, any second rework round on one task or 5 spec-wide, and — the meaningful one — **production LOC above ~300 spec-wide**, which would indicate genuine scope growth rather than evidence density.

**T-05's review now proceeds.** It is the spec's first parallel-lens pass since T-03, triggered by effort `xhigh` and the DC-4 silent-data-loss surface.

---

### T-05 — Wire the alignment step into `formalizeResult`, with reporting and the metadata guard

| Field | Value |
| --- | --- |
| **Final status** | **PASS** on attempt 1 of 3 — **unanimous across a three-lens parallel review** |
| **Date** | 2026-09-03 |
| **Requirements covered** | R-RES-003 (scenario, `BUT`/`AND IT MUST`, AC.3–AC.4), R-RES-004 (scenario, both clauses, AC.1–AC.4), R-RES-006 (scenario, both clauses, AC.1–AC.4), R-RES-007 (both scenarios, all clauses, AC.2, AC.4), R-RES-009 (scenario, both clauses, AC.1–AC.3), NFR-RES-003, **R-RES-002 AC.4** (Leader-injected from T-02's forward pointer) |
| **Implementer attempts** | 1 |
| **Model routing** | Implementer T2 (`sonnet`, effort **`xhigh`**) · Reviewers T3 (`opus`) × 3 in **parallel lens mode** — triggered by effort `xhigh` and the DC-4 silent-data-loss surface. `author ≠ auditor` held on both axes for all three |
| **Skills assigned** | `nestjs-expert`, `error-handling-patterns`, `tdd` (+ `systematic-debugging` on failure) — as the task specifies; no deviation |
| **Budget** | **Tripwire fired.** Escalated before review, owner chose re-baseline; see the two blocks above |

#### Attempt 1

**Files changed**

| File | Kind | LOC |
| --- | --- | --- |
| `src/domain/entities/results/results.service.ts` | production | **+56 / −2** |
| `src/domain/entities/results/results.service.spec.ts` | test | **~+556** |
| `src/domain/entities/results/dto/result-ai.dto.spec.ts` | *incidental* | +2 / −6 — prettier reflow of two already-committed T-01 blocks, from the mandatory `lint --fix` (root `CLAUDE.md` §4.3). Leader-verified pure formatting, no assertion altered |
| | **total** | **~612** |

**What was implemented** — the new step sits at `results.service.ts:949-997`, inside the existing `try`, after the indicator-type `switch` and **before** `customStatus`. Plus `ResultSectionOrchestratorService` injected, `strategic_objectives` carried through `createResultFromAiRoar` (L1231), and both `resultMetadata.push` sites changed to `resultMetadata?.push` (L1008, L1033).

**Verification**

| Command | Result |
| --- | --- |
| `npm test -- --silent src/domain/entities/results/results.service.spec.ts` (task's stated command) | **PASS** 114/114 |
| `npm test -- --silent src/domain/entities/results` (Leader-added, KZ-003 blast radius) | **PASS** 10 suites / 263 tests |
| `npm run lint -- --quiet` | clean; `git status` re-checked, one incidental file above |

**Falsifier probes — three run, all red-then-green.** Lens B independently judged each for *structural necessity* — whether the claimed red actually follows from how the test is written — and found **no overstated red**:

| Probe | Mutation | Lens B's independent judgment |
| --- | --- | --- |
| No-fallback-portfolio (R-RES-006) | portfolio-1 fallback injected on the `null` path | **Doubly red** — trips `not.toHaveBeenCalled()` *and* returns `undefined`, so `alignmentReport.supported` throws into the `catch` and `error: false` fails too |
| Step-1 guard (R-RES-007) | guard replaced with `if (true)` | **Red in all three `it.each` arms** — `findByYear` fires once against a zero-call assertion, and `missing_fields` gains an entry, failing `toEqual([])` as well |
| `supported === false` terminating branch (T-03 obligation) | if-else replaced with two unconditional `if`s | **Red — and only this test catches it.** The other `supported: false` case uses `discarded: []` and stays green. The T-03 forward pointer's mandated test is *uniquely* load-bearing |

That last row is the run's most valuable finding: the obligation T-03's Reviewer deferred forward was not redundant belt-and-braces — it is the **only** guard against the exact bug it predicted, and without the pointer the task would have shipped a green suite over it.

#### Three-lens verdicts — all `STATUS: PASS`

**Lens A — Contract / spec conformance.** All eight §5.1 steps present, in order, with correct terminating behavior. Verified at source rather than accepted: `isEmpty` returns true for exactly `null` / `undefined` / `[]` — the three R-RES-007 AC.2 cases and no more — and the guard provably precedes the year computation, the resolver and the orchestrator. **DD-4 clean** on an independent grep: the only `PortfolioIdEnum` occurrences are the import and a widening cast; zero portfolio-id branching. `missing_fields` appended never replaced. **DD-7 verified at the callers**, not just the `push` sites — `results.controller.ts:645` passes no third argument, so no throwaway collector was introduced. DD-8 clean: no manager threaded, no enclosing transaction.

> The `supported === false` branch is discharged **structurally, not by care**: `if (!supported) {…} else if (!isEmpty(discarded))` makes the per-id path unreachable when unsupported — and Lens A confirmed the branch is load-bearing rather than decorative, since portfolio 1's frozen contract really does echo ids back in `discarded`.

**Lens B — Test evidence / falsifiability.** Every `missing_fields` assertion is `toEqual([...])`; **zero length or presence assertions anywhere in the diff**, so the hard `Disqualifies` rubric is clean. The T-03-mandated content-equality test exists verbatim as specified. All twelve cases carry distinct `result_id` and `title` (KZ-004), and the R-RES-002 AC.4 fixture varies year, ids, title *and* result id with its two years landing in different portfolios — a hardcoded calendar-year default fails call 2 twice over. The `findByYear` double genuinely routes by year where routing is the claim.

> Lens B's structural find: the orchestrator double is shaped `Pick<…, 'saveStrategicObjectivesForPortfolio'>`, so **any call to the section-wide `saveAlignment` from the formalizer would hit an undefined member** → swallowed by the `catch` → `error: true`, which every test asserts is `false`. **R-RES-007 AC.4 is therefore enforced by the double's shape, not by an assertion anyone could delete.**

**Lens C — Reliability / data loss / rollback.** The step is inside the `try` with `resultExists` already assigned at L900, so every later throw reaches the compensating `deleteFullResultById`. R-RES-009 holds in both directions: the optional chain is on the **collector**, not on an operation that can fail, and the roll-back-and-rethrow path for genuine failures is untouched (AC.2). DD-8's window is *narrower* than those already accepted for SDGs, partners and evidence. R-RES-007's code path cannot reach the section-wide save — neither handler's narrow method touches `ResultAlignmentOperationsService`. Observability sufficient: three warn branches, one line per item per case, each naming the result id.

> Lens C's two most valuable finds, neither of which any brief asked for:
>
> 1. **The step's position before `customStatus` is required, not merely acceptable.** `customStatus` on `APPROVED` calls `createSnapshot`, and migration `1783029013035`'s versioning routine copies `result_strategic_objectives` into the new version. A well-intentioned future refactor moving the step *down* to shrink the DD-8 window would **silently drop objectives from an approved item's snapshot**.
> 2. **DD-6's migration dependency fails loudly, not silently.** `deleteFullResultById` runs `SELECT full_delete_result_version(?)` with no surrounding `try`, and the function body declares no `HANDLER` — so an FK 1451 on a pre-migration schema aborts and propagates, preceded by a log naming the item id. RK-6 stays a real rollout gate, but the code's dependence on it is observable rather than hidden.

**Cross-lens corroboration worth recording.** Lens B flagged that the orchestrator double returns `{ supported: true, saved: [], discarded: [] }` for portfolio 1 — a report T-03's frozen contract makes impossible. Lens C, working independently on a different question, **proved that shape cannot occur**: for a non-empty input `Portfolio2` guarantees `saved ∪ discarded = uniqueIds`, and the only producer of an all-empty supported report is the `uniqueIds.length === 0` branch, which step 1 makes unreachable. Two lenses converging on the same impossibility from opposite directions is the strongest evidence in this task's file.

#### Acceptance / done check — all ten closed

| # | Item | Closed by |
| --- | --- | --- |
| 1 | 2026 item, valid ids → rows written, item in `results_created` | Lens A §5.1 steps 4/6; suite green |
| 2 | 2025 item with ids → created, zero rows, entry **in addition to** AI-reported, not in `results_errors` | content-equality test, `toEqual(['sdg_targets','strategic_objectives'])` |
| 3 | 2025 item **without** the field → no such entry (R-RES-004 AC.4) | zero-interaction case + step-1 guard |
| 4 | Year 2035 → created, zero rows, entry, warn names the year, no exception, **no fallback** | falsifier probe 1, doubly red |
| 5 | Discarded ids as `strategic_objectives:<id>`, distinguishable | Lens A §5.1 step 7; `else if` branch |
| 6 | Absent / `[]` / `null` → resolver and orchestrator **never called** | interaction spies on both, all three arms; probe 2 |
| 7 | Single endpoint: valid payload persists; unknown `contract_code` still rolls back and rethrows | Lens C item 1 (R-RES-009 both directions) |
| 8 | Bulk metadata output unchanged | Lens A DD-7 caller check; module-wide suite |
| 9 | **R-RES-002 AC.4** — absent `year` → current calendar year, discriminating fixture | `toHaveBeenNthCalledWith(1, currentYear)` / `(2, 2010)` + per-portfolio args |
| 10 | T-03 obligation's red-capable content-equality test | probe 3 — and it is the *only* test that catches the bug |

#### ADVISORY (4R lenses) — recorded, non-gating, **not convertible into tasks**

Eleven findings across three lenses. Per the Advisory Never Gates / Never Becomes A Task rules: none consumed an attempt, none widened T-05, none minted a task. **Nothing below was acted on** — and a second reason applies here beyond the rule: the diff has just been audited by three independent Reviewers, so editing it post-PASS would invalidate the reviewed artifact.

| Lens | Finding |
| --- | --- |
| **A · RELIABILITY** | The routing year is recomputed at L959 rather than read from `processedResult.result.year`. Values are provably identical in every case but one: an item **omitting** `year` whose formalization straddles a **New Year midnight** would persist Y and route on Y+1. Not a FAIL — §5.1 step 2 prescribes exactly this expression, so the code conforms and the *spec* is what would change. Sub-second annual probability. One-line fix available |
| **A · READABILITY** | The comment at L955-958 justifies recomputation as guaranteeing the portfolio matches the result's effective year — but recomputation is what opens the window above; *reuse* would be the actual guarantee. Reword if the line survives |
| **A · RISK** (T-07/DC-9, not this task) | `ResultRawAi.year` is declared `year: number` but validated `@IsOptional() @IsString()` (pre-existing, `dto/result-ai.dto.ts:289-295`). Benign here — MySQL coerces identically for both the `findByYear` predicate and `report_year_id` — but T-02's memo keys on the raw value, so a batch mixing `"2026"` with year-absent items caches two entries for one year. NFR-RES-002's target still holds. Confirm the extractor's real `year` type during the DC-9 run |
| **B · RELIABILITY** | The orchestrator double returns a constant report and never differs per portfolio, including a contract-impossible report for portfolio 1 (see the cross-lens note above). Masks no present defect — that test discriminates on call **arguments** — but a portfolio-aware double would let it assert per-item *outcomes* instead |
| **B · READABILITY** | The AC.4 test's name says "routing per-item" but it is two sequential `formalizeResult` calls, so it proves per-**call** year computation. Batch-scoped per-item routing is T-06's; the title over-claims |
| **B · RELIABILITY** | The **per-id branch's append semantics** is never asserted against a non-empty AI list — that fixture starts from `missing_fields: []`, so an implementation assigning rather than pushing *in that branch alone* would stay green. Lens B classified it advisory: R-RES-004 AC.3 is discharged on the field-level branch by content equality, and T-05's approved acceptance list does not require it on both shapes. **Leader concurs** — the specialist lens owns this judgment, and a one-word fixture change is exactly the shape the no-widening rule exists to refuse. Surfaced to the owner as an optional follow-up instead |
| **B · RELIABILITY** | The second `resultMetadata?.push` guard (the `catch`, L1033) is unreachable by any test **and any real caller** — single path throws at L1029 first, bulk always supplies a collector. Correct defensive change with zero evidence behind it |
| **C · RISK** | A portfolio row that **exists but has no registered handler** is a hard item failure, not a degradation: `registry.get` throws for any id outside `PortfolioIdEnum {1,2}` while `findByYear` reads the live table. Inserting a portfolio 3 covering 2031–2035 — a pure reference-data change, which R-RES-002's "no code release" premise actively invites — would error *every* AI item in that range, whereas a **missing** row degrades gracefully per R-RES-006. Unreachable with today's seed, loud when it happens, and §5.1 step 8 does sanction a throw. **The most substantive advisory of the run**; suggest a risk row beside RK-6 |
| **C · RELIABILITY** | Single-endpoint degradations are **log-only**: `elementResultMetadata` is fully populated then discarded when no collector is passed, so `POST /api/results/ai/formalize` returns `201` with no signal that ids were dropped. DD-7 accepts this and §9's two-channel rule only ever applied to the bulk report — but it is the DC-4 shape as that consumer sees it. Suggest one sentence in DD-7 |
| **C · READABILITY** | Add a one-line comment that the step must stay **above** `customStatus`, for the snapshot reason in Lens C's find (1). The single highest-value advisory to act on later, precisely because the hazard is invisible at the edit site |
| **C · RESILIENCE** | `isEmpty` treats a non-array truthy scalar as non-empty, so `"1,3,5"` would pass step 1 and reach `new Set(ids)`, iterating characters. Unreachable through both HTTP endpoints (`@IsArray` + `ValidationPipe`), so no gate is owed — noted only because DTO validation is the **sole** barrier, which is Q-2 / DC-9's open question |

#### Decisions made

- **Escalated the budget tripwire *before* spawning the Reviewers**, because one of the armed thresholds was the review round itself. Owner chose re-baseline; §13.5 is now the live budget and the review-round metric is retired.
- **Parallel three-lens review** rather than the default lens-checklist, on effort `xhigh` + DC-4. Lens split: contract / falsifiability / data-loss. Justified by outcome — each lens produced findings the other two did not, and two independently converged on the same impossibility proof.
- **The Implementer's disclosed judgment call was routed to Lens A explicitly**, with instruction that a routing-year/persisted-year desync would be a conformance FAIL rather than an advisory. Lens A traced it and found one narrow window, correctly classified advisory.
- **No advisory acted on**, including the two I consider genuinely valuable (the `customStatus` ordering comment and the portfolio-3 risk row). Recorded and surfaced to the owner.

#### Issues encountered

None in the work. One process observation: the incidental `result-ai.dto.spec.ts` reflow arrived because `npm run lint` carries `--fix`. The constitution already warns of this (§4.3) and the Implementer flagged it as instructed. Lens B's suggestion that it belongs in a separate formatting commit is noted; it rides along here because reverting would re-dirty lint for the next run.

#### Carried to T-07 — **all three lenses raised this independently**

**The full-package `npm test -- --silent` with a coverage figure (DC-6 / KZ-003) is still owed, and five targeted/module runs have now accumulated with no coverage number reported since execution began.** Three independent Reviewers flagging the same gap is the strongest form this log has for a carried obligation. T-07 must not inherit an "already green" assumption from the targeted runs.

**Constitution impact** — none. No module created, no boundary moved. `ResultSectionOrchestratorService` gained a consumer, not a new public surface.

---

### T-06 — Prove per-item routing and inertness with fixtures that can fail

| Field | Value |
| --- | --- |
| **Final status** | **PASS** on attempt 1 of 3 — **unanimous across a two-lens parallel review** |
| **Date** | 2026-09-03 |
| **Requirements covered** | R-RES-008 (both scenarios, all clauses, AC.1–AC.4), R-RES-007 (scenario 1's `AND IT MUST`, scenario 2 and its `BUT`, AC.1, AC.3), R-RES-003 AC.3 (rollback) |
| **Attempts** | 1 |
| **Model routing** | **Tester** T2 (`sonnet`, effort **`xhigh`**) · Reviewers T3 (`opus`) × 2 in parallel lens mode. `author ≠ auditor` held; also `author ≠ tester` — the agent probing T-05's code is not the one that wrote it |
| **Skills assigned** | `tdd`, `nestjs-expert` — as the task specifies; no deviation |
| **Budget** | **395 LOC of the ~400 armed threshold — under.** The Tester reported the closeness itself rather than leaving it to be discovered |

#### Role deviation — Tester, not Implementer (Leader decision, recorded)

T-06 writes **no production code**; its purpose is to *falsify* the implementation T-05 committed. The `akili-tester` role was used instead of `akili-implementer` for two reasons:

1. **Only the Tester role can report `PRODUCT_BUG`.** An Implementer that discovered a real defect would be under pressure to fix it — which is out of scope and would corrupt a diff three Reviewers had already signed off.
2. **It preserves `author ≠ tester`** on the code under test.

The `/akili-execute` triad is otherwise unchanged: the work still passed through the Reviewer gate before `[x]`.

#### Attempt 1

**Files changed:** `src/domain/entities/results/results.service.spec.ts` — **+395 / −0**, additive only. No other file. **Leader-verified independently:** one file in the diff, no `.only`, no `skip`, no leftover probe markers.

**Verification**

| Command | Result |
| --- | --- |
| `npm test -- --silent src/domain/entities/results/results.service.spec.ts` | **PASS** 118/118 |
| `npm test -- --silent src/domain/entities/results` (KZ-003 blast radius) | **PASS** 10 suites / 267 tests |
| `npm run lint` | **deliberately not run** — it carries `--fix` and was not in T-06's stated verification. T-07 owns the lint gate |

**Economy worth crediting.** Rather than duplicating T-05's coverage, the Tester **cited** it: R-RES-007 AC.2 (`[]`/`null`/absent) and the single-endpoint rollback shape are already proven, so T-06 added only the content-based row-survival proof neither could offer. On a spec whose budget has twice been broken by test volume, that is the right instinct.

#### Acceptance / done check — all six closed

| # | Item | Closed by |
| --- | --- | --- |
| 1 | 3-item mixed-year batch: 2026/2027 hold own ids, 2025 holds none + reports the field | `routes each item on its own year… (AC.1, AC.3)` |
| 2 | Reversed order → identical per-item outcome | `…identical per-item outcome when item order is reversed (AC.2)` |
| 3 | No item's objectives attached to another's result id | `assertMixedYearOutcome`'s cross-item leakage check |
| 4 | 2026 item fails mid-way → no surviving row for it; 2025 resolves on its own year | `…continues the batch after the 2026 item fails mid-way…` |
| 5 | Both-fields item: all `result_sdgs` + ALIGNMENT `result_contracts` rows active, **plus** the new row | `leaves every result_sdgs row and every ALIGNMENT result_contracts row active… (R-RES-007 AC.3)` |
| 6 | Suite FAILs under batch-wide resolution | Falsifier probe — red, reverted, re-confirmed green |

**`Disqualifies` — all four clauses clean** (this is the one task in the spec where a listed defect converts the run to *inconclusive* rather than merely losing a point): years differ (2025/2026/2027), objective lists differ and are **disjoint** (`[11]`, `[21,22]`, `[31,32,33]`, `[41,42]`, `[43]`), every assertion is keyed per `result_id` with **no aggregate row count anywhere** in the routing suite, and the inertness case asserts sibling `is_active` rather than mere absence of the new row.

#### Lens A — Routing suite & the falsification probe · `STATUS: PASS`

**Fixture discrimination, analysed past the checkbox.** 2026 and 2027 both resolve to `PORTFOLIO_2`, which looks like weak discrimination until the reason is visible: it is faithful to production (design §3 — P1 = 2010–2025, P2 = 2026–2030), and asserting a portfolio *difference* between them would encode a rule the spec does not state. The load-bearing property is instead that **no single batch-wide portfolio can satisfy both expectations** — constant P1 empties the 2026/2027 items, constant P2 gives the 2025 item rows it must not have. Both branches are asserted.

**The mid-batch failure lands in the right statement.** The throw is triggered from `customStatus`, which is the *very next statement* after the alignment block (`results.service.ts` L997 → L999). A failure before the write would have proven nothing about rollback. The write itself is independently proven by `toHaveBeenNthCalledWith(1, 601, PORTFOLIO_2, [41, 42])`, and the survivor's routing by `(2, 602, PORTFOLIO_1, [43])` — the assertion scenario 2 exists for.

**On item 6, Lens A was candid rather than accommodating**, and its finding is recorded in full because it qualifies the evidence:

> **The probe is valid, and weaker than the mutation `tasks.md` specifies.** The Tester staged the defect test-side — `findByYear` memoizing on nothing and returning its first answer forever. Under a *literal* hoist, `findByYear` would be called **once**; the test-side mutation preserved three per-year calls, so the suite's only call-shape assertions were never exercised by it. The done check was discharged by a semantic equivalent, not by the stated mutation.
>
> **Why it is nonetheless sufficient, and why "stubbing the double proves only that the double is consulted" does not apply:** the three tests do not assert the double's return value or call log as primary evidence. They assert **production-produced downstream outcomes keyed per result id**, deliberately divergent across items. Any implementation yielding one portfolio for the whole batch violates at least one per-item expectation *regardless of the mechanism that produced the constant*. All three reported reds trace to specific assertions, and a literal hoist would break the same three — via outcome divergence rather than call count.

**Leader adjudication.** Accepted as closing item 6, and the Leader could not rule otherwise: **the Tester used one of the two mutations this Leader's own brief authorized.** The brief stated the literal hoist had no in-method loop to hoist out of (`formalizeResult` is invoked once per item from `createResultFromAiBulk`) and offered the `findByYear` stub as an explicit alternative. Failing the task for following its instruction would be incoherent. Lens A's strengthening suggestion is recorded as advisory.

Lens A also enumerated the broken implementations it checked the suite against — batch-wide resolution, wrong year either direction, objectives on the wrong result id, swapped id lists, `missing_fields` on the wrong item, rollback not invoked — all caught. The one mechanism these tests cannot see (an orchestrator that ignores its `portfolioId` argument and reads request-scoped `PortfolioUtil` — RK-2's actual mechanism) is **already closed by T-04**, whose done check uses `PortfolioUtil`/`ResultsUtil` doubles that *throw* on read. The no-leakage claim is jointly covered across T-04 and T-06, not left open.

#### Lens B — Inertness assertion & double fidelity · `STATUS: PASS`

This lens was spawned for one question, raised by the Tester's own `Not Done` disclosure: the fake ALIGNMENT `result_contracts` row is created by the `createResult` double and flipped (or not) by the destructive-save double — so **could the test be asserting that a double it controls did not flip a flag that same double owns?** A perfect tautology, green either way.

**Answer: not tautological, traced four ways.** The flip is owned by a *different* double sitting on a genuinely reachable destructive path — `ResultsService` injects `_alignmentOperations` directly (`results.service.ts:167`) and the un-spied `updateResultAlignment` (L740-745) forwards straight to it. The assertion goes red under every plausible destructive implementation:

| Destructive path the AI flow could plausibly take | Assertion that goes red |
| --- | --- |
| `_alignmentOperations.save(resultId, …)` directly | sibling `is_active` on both tables, **and** `save).not.toHaveBeenCalled()` |
| `updateResultAlignment(resultId, …)` — real, un-spied, forwards to the same service | same |
| `orchestrator.saveAlignment(…)` — the section-wide entry point | the orchestrator double's `Pick<>` shape makes the member `undefined` → `TypeError` → caught → `error: true`, failing `expect(error).toBe(false)` |
| narrow save swapped for the section-wide one, SO row never written | the new-row presence assertion keyed to result id 700 |

**Ordering holds** — the contracts row is pushed by `createResult`, the two SDG rows by `saveSdgAi`, and the alignment step runs after both (L899 → L907 → L954), so a flip at the alignment step reaches rows that already exist. And `expect(error).toBe(false)` is a real **liveness guard**: it prevents the "rows were never created because the flow aborted" vacuity that would otherwise let `.every()` pass on an empty array.

**The destructive double is line-accurate, not a convenient boolean nudge.** Lens B read the real service: with a narrow `{strategic_objectives}` payload both arrays are `undefined`, so `BaseServiceSimple.create`'s `dataToSaveArray` is empty → `persistId` empty → `update({result_id, pk: Not(In([]))}, {is_active: false})` deactivates **every** existing row for that result and role. The double models exactly that, on exactly the two tables DD-1's own rationale names.

**DD-1's boundary is covered by interaction *and* state** — `not.toHaveBeenCalled()` plus the surviving-row assertions plus the `Pick<>` shape. R-RES-007 AC.4 does not rest on inference here.

#### Coverage closure recorded so T-07 does not re-litigate it

`tasks.md` §4 assigns R-RES-007 scenario 1's and R-RES-003's `BUT NOT … levers / lever outcomes / lever sdg targets / impact outcomes` clauses to T-06, and the diff models only `result_contracts` and `result_sdgs`. **Lens B judged this correct rather than incomplete:** `formalizeResult` never writes lever or impact-outcome rows, so no such row exists at the alignment step, and a fixture row for one would model unreachable state. **The modeled surface equals the reachable surface.** Recorded explicitly per Lens B's request.

#### ADVISORY (both lenses) — recorded, non-gating, **not convertible into tasks**

Nine findings. None acted on — the no-widening rule, plus the same reason as T-05: the diff has been audited, and editing it post-PASS invalidates the reviewed artifact.

| Lens | Finding |
| --- | --- |
| **A · RELIABILITY** | **The strongest advisory of this task.** The probe left the suite's only call-shape assertions unexercised. Asserting `findByYear.mock.calls.map(c => c[0])` equals the three distinct years in tests 1–2 would put the *hoist* shape under direct assertion instead of relying on outcome divergence — making AC.4 self-evident to the next reader without re-deriving Lens A's argument |
| **A · RELIABILITY** | The mid-batch "no row survives" proves the rollback is **invoked** for the failing id after its write; that `full_delete_result_version` actually removes `result_strategic_objectives` is **RK-6 / T-07's gate**. Must not be read as covered by this green suite |
| **A · READABILITY** | Test 3's `toHaveBeenNthCalledWith` on `findByYear` pins sequential in-array-order processing — an implementation detail of `createResultFromAiBulk`'s `for…of` loop that no requirement states, and R-RES-008 AC.2 in fact requires order-*independence* of the outcome. Faithful today and the clearest AC.3 evidence, so Lens A would not change it; it would break on a legitimate refactor to concurrent item processing |
| **A · READABILITY** | The reversed-order case asserts `missing_fields` only for item 501, not 502/503. Row-level outcome is fully asserted for all three, so AC.2 is discharged; two lines would make "identical per-item outcome" literal rather than partial |
| **B · RELIABILITY** | `result_contracts` gets `.every(is_active)` with **no companion length assertion**, unlike `result_sdgs` which has both. `[].every()` is `true`, so if the `createResult` double's push were ever dropped, the contracts half would pass **vacuously**. One `toHaveLength(1)` closes the asymmetry — the highest-value one-liner in this diff |
| **B · READABILITY** | The fake store has no role column, and the `createResult` double omits the `result_sdgs` rows the real `createResult` also writes from `agressoContract.sdgs` (L468-482). Both omissions are conservative — the only contracts row in existence is the ALIGNMENT one, and the extra SDG rows would flip identically — but a note would stop a future reader adding a non-ALIGNMENT row and expecting correct role scoping |
| **B · RISK** | The `deleteFullResultById` double encodes **post**-migration-`1783029013035` semantics. Correct per DD-6, but it makes the green "no row survives" conditional on **RB-1 / RK-6** being closed in the target environment — T-07's gate |
| **B** | No double in the added lines fails to express what it stands in for; no assertion encodes a rule outside `requirements.md` (KZ-005 clean) |
| **A** | KZ-005 clean in the routing scope — `expectedOwn = f.year === 2025 ? [] : f.objectives` is D-2 / R-RES-004; the `missing_fields` expectations follow from R-RES-004 AC.3 and R-RES-003 |

#### Decisions made

- **Tester role instead of Implementer** (justified above).
- **Effort `xhigh`, above the task's stated `M`** — T-06 is correctness-critical (data loss), which the dial puts at `max`, but the tier ↔ effort rule forbids maxing a cheaper tier, so `xhigh` is the ceiling for T2.
- **Two-lens split rather than the default checklist**, with a lens dedicated solely to the tautology risk the Tester itself disclosed. Justified by outcome: that question needed a four-way counterfactual trace to answer, and it is the assertion `tasks.md` says would have caught DC-2.
- **The Tester was explicitly instructed not to absorb T-05's open per-id-append advisory**, so an unruled finding could not quietly become scope. It did not.
- **No advisory acted on**, including Lens B's `toHaveLength(1)` one-liner and Lens A's call-args assertion — both genuinely valuable, both surfaced to the owner instead.

#### Issues encountered

None. No rework, no `PRODUCT_BUG`, no inconclusive verdict. The implementation T-05 committed survived a suite purpose-built to falsify it.

**Constitution impact** — none. Test-only change to an existing spec file.
