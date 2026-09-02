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
