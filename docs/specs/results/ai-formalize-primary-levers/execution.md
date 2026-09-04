# Execution Log — Results / AI Formalize: Portfolio-Routed Primary Levers

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/results/ai-formalize-primary-levers` |
| **Spec id** | 2026-09-ai-formalize-primary-levers |
| **Owner** | David Felipe Casañas Hernández |
| **Depth** | Standard |
| **Approval Mode** | `gated` — every task gate pauses for the owner (`proposal.md` Document Control) |
| **Branch** | `AC-1607-Send-bulk-upload-completion-email-with-CapDev-metrics` |
| **Commit prefix** | `[SPEC:results/ai-formalize-primary-levers]` |
| **Budget** (`design.md` §13) | 7 tasks · ~252 prod LOC + ~1,558 test LOC (~1,810) · **4 rework rounds** |
| **Rework ceiling** | 3 attempts per task |
| **Started** | 2026-09-04 |
| **Linked** | `./requirements.md` · `./design.md` · `./tasks.md` · `./proposal.md` |

**Citation convention:** `[SO] R-RES-NNN` = predecessor spec (`results/ai-formalize-strategic-objectives`) · bare `R-RES-NNN` = this spec.

---

## 2. Pre-Execution Gate — owner decisions, 2026-09-04

Two questions the spec parked as owner calls were resolved **before** the first Implementer spawn, because each changes what gets written. Recorded here as the authority the tasks are executed under.

| Question | Decision | Effect on the build |
| --- | --- | --- |
| **Q-1** (`requirements.md` §, *"Blocks design sign-off"*) — should AI-created levers carry no nested `result_lever_strategic_outcomes` / `result_lever_sdg_targets`, per assumption **A-1**? | **Accepted A-1 — bare lever rows.** No marker, no richer field shape | None. T-01 stays a plain optional number array; T-03 writes bare rows at the portfolio's role. `R-RES-003` / `R-RES-004` and `DD-2` execute as written. **Q-1 closed** |
| **Q-6** (`design.md` DD-10) — accept the one-expression hardening of the unguarded portfolio-2 `research_areas` map, one expression beyond `proposal.md`'s declared scope? | **Accepted DD-10** | T-03 keeps its DD-10 bullet, its acceptance check, and its fourth falsifying probe. **Q-6 closed** |

**Concurrency clearance (RB-6, `tasks.md` §1).** The predecessor spec's `T-07` is `[~]` PARTIAL, but its outstanding half is **owner-run manual Dev verification** (no Docker / no `.env` / no `mysql` client) which touches no source file; its automated half is closed and green (full suite 328/328, coverage 84.17%, lint clean). No remediation is in flight against the four shared files, so this spec is clear to run. Working tree was clean at start.

**Carried forward, not yet a blocker:** this spec's own `T-07` manual half depends on the same Dev access the predecessor could not obtain. Expect it to park as `[~]` on the owner unless access changes. Q-3, Q-4, Q-5 and RB-3 (migration `1783029013035`) remain open and are T-07's to close or escalate.

---

## 3. Task Execution History

### T-01 — Add `primary_levers` to `ResultRawAi`

| Field | Value |
| --- | --- |
| **Final status** | **PASS** — first attempt, no rework |
| **Date** | 2026-09-04 |
| **Implementer attempts** | 1 |
| **Review mode** | Lens checklist (effort `medium`) — single Reviewer, four advisory lenses |
| **Requirements covered** | R-RES-001 — scenario "The field is accepted", its `BUT it must NOT` clause, its `AND IT MUST` clause, AC.1–AC.4. **AC.5's `/swagger` render remains T-07's**; T-01 closed only the `@ApiProperty` reflect-metadata declaration |
| **Skills assigned** | `nestjs-expert` |
| **Effort** | `medium` |

**Leader skill deviation (Delegation Discipline).** `tasks.md` recommends `nestjs-expert` + `api-design-principles`; the Leader dropped `api-design-principles`. Reason: the task designs no endpoint and negotiates no contract — the wire shape is already frozen in `design.md` §4, and the work is a decorator-for-decorator mirror of a shipped property.

#### Attempt 1

- **Files changed:**
  - `server/researchindicators/src/domain/entities/results/dto/result-ai.dto.ts` — `primary_levers?: number[]` added to `ResultRawAi` immediately after `strategic_objectives`, carrying `@ApiProperty({ type: Number, isArray: true, required: false })` + `@IsOptional()` + `@IsArray()` + `@IsNumber({}, { each: true })`. `RootAi` untouched; no id-validity predicate added (DD-4 keeps that in T-02/T-03).
  - `server/researchindicators/src/domain/entities/results/dto/result-ai.dto.spec.ts` — new describe block, five cases, all driven through the **real** `endpointValidationPipe` configuration.
  - `git diff --stat`: 2 files, +90 / -0.
- **Verification:** `npm test -- --silent src/domain/entities/results/dto/result-ai.dto.spec.ts` from `server/researchindicators` -> `Test Suites: 1 passed, 1 total | Tests: 25 passed, 25 total`.
- **Falsifying probe (demanded by the task, actually run red).** `@IsNumber({}, { each: true })` was removed, leaving `@IsOptional() @IsArray()`, and the AC.3 case re-run in isolation: the pipe **resolved** `primary_levers: [11, "x"]` rather than rejecting it. The array-only decorator therefore does silently pass a string id, which is the defect class the per-element rule exists for. Decorator restored, suite re-run green. The Reviewer independently confirmed the probe was correctly *isolated* — only the per-element validator was removed, `@IsArray()` retained, so the field stayed whitelisted and nothing but the per-element rule was under test.
- **Reviewer verdict:** `STATUS: PASS`.
- **Reviewer summary:** the property mirrors the shipped `strategic_objectives` stack exactly, and all of R-RES-001's clause-level behaviors are proven through the real endpoint pipe configuration rather than by decorator inspection. Scope held: `RootAi` untouched, no id validation, no `ResultAiDto` drift.

#### Leader-requested adjudications (all three resolved by the Reviewer against source)

1. **Does the field reach through the real endpoint path?** Yes, and the evidence is not a test artifact. Both handlers (`results.controller.ts:637-643` `ai/formalize`, `:663-669` `ai/formalize/bulk`) carry the identical three-option pipe the test replicates. `RootAi.results` carries `@ValidateNested({ each: true })` + `@Type(() => ResultRawAi)` (`result-ai.dto.ts:913-916`), so the validator options propagate into each element — nested whitelisting genuinely applies. AC.1 reads the value back off the **transformed instance after** the whitelist pass, not off the input literal.
2. **Is the AC.5 metadata assertion disqualified, or a trespass on T-07?** Neither. The Disqualifies clause bans a decorator-presence assertion *instead of* pipe-driven tests; four pipe-driven cases carry the gate, so the metadata case is additive — and T-01's own done-check #5 mandates it. It reads reflect-metadata off `ResultRawAi.prototype`, never a generated document, so T-07's `/swagger` **render** is untouched.
3. **Scope discipline.** `RootAi` untouched (single hunk). No portfolio / active / id-range predicate anywhere, so DD-4 is intact. `ResultAiDto` (`result-ai.dto.ts:27-39`) is genuinely out of scope — fully undecorated, never an endpoint body metatype, an internal carrier instantiated at `results.service.ts:1200`.

#### ADVISORY (4R lens findings — recorded, never gating, and none may become a task in this spec)

- **RISK — forward pointer, owned by T-05.** The predecessor put its carrier `strategic_objectives?: number[]` on **`ResultAiDto`** (`result-ai.dto.ts:38`). `tasks.md` assigns the `primary_levers` equivalent to **T-05** ("Carry `primary_levers` through `createResultFromAiRoar`"). Omitting it in T-01 is correct — but **if T-05 does not add that carrier, the DTO accepts the field while the formalizer never sees it: a silent no-op that every T-01 test still passes.** -> **Must be copied into the T-05 Implementer brief.**
- **RESILIENCE — T-07 / Q-4.** The pipe runs without `enableImplicitConversion`, so `primary_levers: ["11", "12"]` now returns `400`. Assumption A-4 already records that the owner's real payload sends `year` as the string `"2026"`. If the extractor stringifies numerics generally, Q-4/DC-10 falsifies A-3 and sends T-01 back. Nothing to change now — but T-07 must not close Q-4 on a hand-written payload.
- **RELIABILITY — known gap, not an assumed one.** AC.2/AC.3 assert on `BadRequestException.response.message`, while R-RES-001 words the outcome as `primary_levers` named in the envelope's `errors`. That mapping is `GlobalExceptions`' shipped behavior and `tasks.md` §5 adds no e2e, so the envelope hop stays untested in this spec. Consistent with the shipped predecessor block.
- **READABILITY.** The metadata case is titled "AC.5" while §4 assigns AC.5 to T-07; "AC.5 (declaration half — render is T-07's)" would stop a future reader concluding T-01 closed it. Separately: the new AC.2 case is strictly **stronger** than the shipped equivalent (`:341-349` uses a bare `.rejects.toThrow()`; the new one asserts the field is named).
- **Spec-document accuracy — escalated to the owner, deliberately not self-corrected.** `requirements.md` §1 states the field is *"silently dropped"* by `whitelist: true`. With `forbidNonWhitelisted: true` **also** set on both handlers, the pre-change behavior was a **`400` rejection** (`property primary_levers should not exist`), not an accept-and-drop. The end-user outcome (ids never persisted) and the fix are unaffected, but whoever reproduces the original symptom during T-07's Dev run would be looking for the wrong signal. **Recorded, not actioned:** amending a requirements Context sentence is the owner's call, and an advisory may not mint or widen a task.

#### Decisions made

- Q-1 accepted as A-1 (bare lever rows) at the pre-execution gate — T-01 therefore stayed a plain optional number array, as designed.
- The `@ApiProperty` shipped in the same commit as the DTO change (`tasks.md` §6).

#### Issues encountered

None. No rework, no environment blocker.

#### Final verification result

`npm test -- --silent src/domain/entities/results/dto/result-ai.dto.spec.ts` -> **25/25 green.** Full-suite blast-radius and the coverage figure are T-07's gate (DC-6 / KZ-003), deliberately not claimed here.

#### Correction Closure — the "silently drops" claim (owner-approved, 2026-09-04)

The T-01 advisory was escalated and the owner approved the correction. Applied with the **two-direction sweep** (`/akili-specify` → *Correction Closure*), not by amending only the site the Reviewer cited:

- **Forward** (`grep -rn "silently drop\|whitelist"` across the spec folder): the claim survived in **two** documents, not one — `requirements.md` §1 **and** `proposal.md` §Problem. The Reviewer had named only `requirements.md`. This is exactly the failure **KZ-006** records: sweep the claim, not the citation.
- **Backward** (documents citing §1 Context / restating the symptom): no other restatement. `design.md:262` matched on "never reaches" but is DD-1's unrelated title.

Both sites now read: the formalizer **rejects** such a payload with `400 property primary_levers should not exist`, because `forbidNonWhitelisted: true` is set alongside `whitelist: true`. No requirement, AC, design decision or task changed — the end-user outcome (ids never persisted) and the fix are identical. Committed separately from task work.

### T-02 — Add an id-filtered, portfolio-scoped, active-only lever finder

| Field | Value |
| --- | --- |
| **Final status** | **PASS** — first attempt, no rework |
| **Date** | 2026-09-04 |
| **Implementer attempts** | 1 |
| **Review mode** | Lens checklist (effort `medium`) |
| **Requirements covered** | R-RES-005 — the predicate producing AC.1–AC.3 (the *reporting* half of both scenarios stays with T-05); design **DD-4** |
| **Skills assigned** | `nestjs-expert` (as recommended; no deviation) |
| **Effort** | `medium` |

#### Attempt 1

- **Files changed:**
  - `.../clarisa/entities/clarisa-levers/clarisa-levers.service.ts` — added `findActiveByIdsForPortfolio(ids, portfolioId)`; `In` added to the typeorm import.
  - `.../clarisa-levers.service.spec.ts` — new describe block, four cases.
  - `git diff --stat`: 2 files, +102 / -1. **Zero deletion lines in the spec file** — no existing test was modified.
- **The predicate** (DD-4's three discard causes in one query):
  ```ts
  if (!ids?.length) return [];            // guard sits ABOVE the query — no IN () is ever issued
  return this.mainRepo.find({ where: { id: In(ids), portfolio_id: portfolioId, is_active: true } });
  ```
- **Verification:** `npm test -- --silent src/domain/tools/clarisa/entities/clarisa-levers` from `server/researchindicators` -> `Test Suites: 3 passed, 3 total | Tests: 44 passed, 44 total` (up from 40). `npm run lint -- --quiet` clean; its `--fix` made one cosmetic reformat, re-confirmed green after. **`git status` re-checked: only the two intended files were mutated, no `--fix` collateral.**
- **Falsifying probe (actually run red).** A two-part predicate was staged — `portfolio_id` dropped, leaving `id: In(ids), is_active: true`. The foreign-portfolio case went **red**: `find` was called with a `where` missing `portfolio_id: 2`, so id 4 (active, portfolio-1) was no longer excluded. Reverted and confirmed byte-identical by `diff`; all 44 green.
- **Reviewer verdict:** `STATUS: PASS`.
- **Reviewer summary:** the finder mirrors the shipped `StrategicObjectivesService` equivalent and expresses DD-4's three-part predicate in one `find` with the `IN ()` guard above the query; the new block uses a real `where` evaluator whose portfolio and `is_active` cases were shown red against a staged two-part predicate, and it adds nothing to and removes nothing from the existing specs.

#### Leader-requested adjudications (all five resolved against source)

1. **`is_active: true` vs. real column semantics — the Leader's hypothesis was wrong, and is now evidenced rather than assumed.** The Leader raised a possible silent-data-loss hazard: if a real `clarisa_levers` row could hold `NULL` in `is_active`, the predicate would discard a valid owned lever, invisibly to every double-driven test. **Not representable.** The column was created `is_active tinyint NOT NULL DEFAULT 1` (`src/db/migrations/1726504510058-createdResultEntities.ts:23`) and no later migration touches it; `auditable.entity.ts:34-41` declares `type: 'boolean', nullable: false, default: true`. It is also the exact term both shipped siblings use (`clarisa-levers.service.ts:45-52`, `strategic-objectives.service.ts:41-55`) and the term R-RES-005 and DD-4 mandate verbatim. Any other expression would have been the deviation.
2. **Double fidelity (KZ-001 / the Disqualifies clause) — sound, not an assumption that happens to hold.** `type` and `value` are **public getters on `FindOperator.prototype`**, so `'type' in condition` resolves through the prototype chain — true for every `FindOperator`, false for the plain scalars. `expect.objectContaining({ type: 'in', value: [...] })` is prototype-chain aware and reads through those public getters; it does **not** reach the private `_value`. Throwing on any non-`in` operator is fail-loud, correct for a double. `Object.entries(where).every(...)` only tests terms the implementation actually supplied — which is exactly why the staged two-part predicate went red. The canned-array disqualifier does not apply.
3. **Discriminating power (KZ-004) — five of six checks proven, one thin but not vacuous.** The Leader flagged two fixtures as possibly too thin. The inactive case (single-row fixture) **is** falsifiable: drop the `is_active` term and the evaluator matches the row, so `toEqual([])` goes red — a one-row fixture suffices when the row *is* the counterexample. The unknown-id case (empty fixture) is genuinely the weak one: no predicate defect changes an empty fixture's output. It is not vacuous — it still falsifies the plausible defect for that clause, a finder that **throws** on an unresolvable id (`findOneOrFail`-per-id, or a `survivors.length !== ids.length` guard) — and the clause reads *"does not return **and does not throw**"*. Judged closed; the strengthening is recorded as advisory rather than gated on.
4. **Scope + the `IN ()` guard — clean.** One import edit plus one inserted method. `findAllWithPortfolio`, `create`, `update`, `remove`, `findByShortName`, `homologatedData` untouched. The guard sits above the `find` call, and `expect(mockMainRepo.find).not.toHaveBeenCalled()` proves no query is issued rather than merely proving an early return. Done-check 6 closed.
5. **The `// @akili-spec` marker is not a project convention — not a finding.** It appears exactly once in the repo, and as a record of *not* adopting it (`ai-formalize-strategic-objectives/execution.md:427`: *"the surrounding file uses prose doc comments as its idiom"*). The shipped predecessor's finder cites `design.md §3 / DD-1` in prose exactly as this one cites DD-4. Consistent with precedent.

#### ADVISORY (recorded, never gating; none may mint or widen a task in this spec)

- **RISK — forward pointer, owned by T-03. This is the highest-value finding of the task and MUST be copied into the T-03 brief.** The finder returns `ClarisaLever[]` whose `id` is *declared* `number` on a `@PrimaryGeneratedColumn({ type: 'bigint' })` column. **TypeORM hydrates `bigint` properties as strings**, and `requirements.md` RK-3 records shipped code already coping with exactly that (`parseInt(x) as unknown as string`); `orm.config.ts:53`'s `bigNumberStrings: false` governs the driver layer only, not TypeORM's bigint hydration. So T-03 must **not** compute survivors/discards by strict identity against the incoming numeric ids: `ids.filter(id => !survivors.map(l => l.id).includes(id))` would classify **every id as discarded while the query was perfectly correct** — zero rows written, every id reported discarded, no exception raised. Remedy for T-03: normalize with `Number(...)` on both sides, **and make the T-03 double return string ids in at least one case so the defect is falsifiable there.** Nothing changes in T-02 — DD-7 explicitly forbids cleaning the type modelling here.
- **RISK — note for T-03/T-04 callers, unreachable today.** `portfolioId` is unguarded, and an `undefined` reaching it degrades the predicate to the two-part form DC-3 describes, because TypeORM drops `portfolio_id: undefined` from the `where` (the shipped `findAllWithPortfolio(undefined)` test relies on that behavior). `design.md` §5.1 step 3 already makes it unreachable — no portfolio, no orchestrator call — so this is a caller-side note, not a change to the finder.
- **RELIABILITY.** Fold the unknown id into the multi-row case as the predecessor did (`[11, 12, 4, 999]` against the same three-row fixture). That makes "unknown id does not return" discriminating instead of resting on an empty fixture, at the cost of one array element.
- **READABILITY.** `evaluateWhere` / `fakeFind` is now duplicated verbatim in two spec files, and T-03 will likely want a third variant. Left duplicated deliberately; if a third copy appears, promote it to a shared test helper rather than copying again.
- **RELIABILITY — pre-existing, not introduced.** `beforeEach` uses `jest.clearAllMocks()`, which clears calls but **not** implementations, so a `mockImplementation` on `mockMainRepo.find` leaks into later describes. Harmless today (later describes never call `find`), but this block installs implementations where the file previously used only `mockResolvedValue`, raising the cost of that latent trap slightly.

#### Decisions made

- The service addition was **pre-authorized by the task** rather than rediscovered mid-run, per the predecessor's identical gap on `StrategicObjectivesService`. No deviation had to be negotiated.
- No `// @akili-spec` marker added — adjudication 5 establishes prose doc comments as the file's shipped idiom.

#### Issues encountered

None. No rework, no environment blocker.

#### Final verification result

`npm test -- --silent src/domain/tools/clarisa/entities/clarisa-levers` -> **44/44 green**, lint clean, tree free of `--fix` collateral. Full-suite blast radius and the coverage figure remain T-07's gate (DC-6 / KZ-003).

### T-03 — Add the narrow levers save to both alignment handlers

| Field | Value |
| --- | --- |
| **Final status** | **`[~]` PARKED — Pivot Protocol triggered.** Not a FAIL, not a HALT: no rework attempt was consumed and no Reviewer was spawned |
| **Date** | 2026-09-04 |
| **Implementer attempts** | 1 (implementation delivered; the blocker is in the spec, not the diff) |
| **Effort** | `xhigh` (Leader-raised from the task's `L`, per the owner's Phase-gate decision) |
| **Review mode** | Parallel lens reviewers were selected but **deliberately not spawned** — see *Why no review ran* below |
| **Skills assigned** | `nestjs-expert`, `tdd`, `error-handling-patterns` (as recommended; no deviation) |

**Work delivered in the tree (uncommitted, 6 files, +676 / -11):** `LeversSaveReport { saved, discarded }` on the interface with **no `supported` flag** (DD-8 — the shipped exemplar carries one, and the Leader's brief flagged copying it as the spec violation it would be); `saveLevers` implemented in **both** handlers — portfolio 1 at `LeverRolesEnum.ALIGNMENT (1)` with `is_primary: true` explicit on every row and `is_primary` in `create`'s `otherAttributes` (DD-5), portfolio 2 at `RESEARCH_AREAS_ALIGNMENT (3)` without ever constructing a `research_areas` payload (DD-1/DD-9); zero-survivor early return before `create` is reached; bigint/string id normalization via `Number(...)` on both sides of every comparison, with a string-id (`'11'`) double in each spec so T-02's forward-pointed defect is falsifiable; DD-10 guard applied (Q-6 accepted). Verification reported green: `npm test -- --silent src/domain/entities/results/portfolio-handlers` -> **5 suites / 56 tests passed**; lint clean; `npm run build` clean (module wiring changed).

Three of the four mandated falsifying probes were staged and observed red, then reverted: (1) omitting `is_primary` reddened 5 tests; (2) the two-part predicate reddened T-02's foreign-portfolio test at its own layer; (4) reverting the DD-10 guard reddened the two new DD-10 tests. **Probe (3) is the blocker below.**

---

## Pivot Record: T-03

**Trigger.** The Implementer's `Not Done / Assumptions` field was non-empty — which under `/akili-execute` Step 2.3.0 alone bars the task from `[x]` — and its content is evidence that **the approved spec is internally contradictory**, not that the implementation fell short. Per the Pivot Protocol the loop was stopped immediately rather than spending rework attempts on a spec defect.

**The contradiction.** Two approved clauses describe the *same* implementation and demand opposite outcomes:

| Clause | Demands of the kept implementation |
| --- | --- |
| `tasks.md` T-03 acceptance check 8 / `requirements.md` **R-RES-007 AC.2** | with a double reporting a pre-existing contributor row (role 1, `is_primary = false`), that row is **still active** afterwards -> the assertion must be **GREEN** |
| `tasks.md` T-03 **falsifying input #3** | "a double reporting a pre-existing contributor row, **against an implementation that hands `create` only the primary rows** -> the inertness assertion **must go red**" |

The kept implementation *is* "an implementation that hands `create` only the primary rows" — the spec's own Implementation notes mandate exactly that. So the falsifier demands red and the acceptance check demands green, on the same code, with the same double.

**Independently verified by the Leader at source** (not accepted on the worker's report). `BaseServiceSimple.create` — `src/domain/shared/global-dto/base-service.ts:174-189`:

```ts
const updateWhere = {
  [this.resultKey]: resultId,
  [this.primaryKey]: Not(In(persistId)),
  ...(dataRole ? { [this.roleKey]: dataRole } : {}),
};
await entityManager.update(updateWhere, { is_active: false });
```

Every row for `(result_id, role)` whose primary key is absent from the newly persisted set is deactivated. A pre-existing contributor lever at role 1 is therefore **deactivated by construction** whenever portfolio 1 writes primaries at that same role. The Implementer reached this by building a throwaway stateful fake replicating `create`'s real semantics (role-scoped `existData` + `Not(In(persistId))`), observing the contributor row flip to `is_active = false`, then deleting the fake — it was never committed. The Leader confirmed the same conclusion by reading the primitive directly.

**Why this is a spec defect and not a product defect.** DD-6's construction argument still holds on every reachable path: `formalizeResult` always *creates* the result it formalizes, so no lever row can pre-exist (`results.service.ts:879-901`; this is also what closed Q-2 as moot and downgraded RK-2 to Low on 2026-09-04). The code is correct for reality. What is wrong is **AC.2's wording**, which asserts a positive survival guarantee the handler's code cannot deliver and DD-6 never claimed — DD-6 says "satisfied by construction... proven anyway", and the acceptance check silently upgraded that into "proven by the handler."

**Why no review ran.** A Reviewer handed self-contradictory acceptance criteria produces an unreliable verdict in **both** directions: a FAIL would be indistinguishable from a real implementation defect and would burn a rework attempt on unfixable scope, and a PASS would launder an AC that the code demonstrably does not satisfy. The audit is deferred until the criteria are coherent; it is owed on whatever implementation the decision below selects.

**Alternatives put to the owner.**

| # | Option | Cost | Consequence |
| --- | --- | --- | --- |
| **A** | **Amend `R-RES-007` AC.2 + T-03 check 8 + falsifying input #3** to state what is true and provable: the handler contributes no additional risk (never reads, never merges, hands `create` only validated survivors), and inertness holds *by unreachability* per DD-6 — not by handler code | Doc-only; the delivered diff stands and goes straight to review | Honest and consistent with DD-6 and RK-2. DC-2 stays closed by construction, resting on `formalizeResult` never gaining an update path — the incidental fact RB-2 already flags |
| **B** | **Make AC.2 literally true in code** — portfolio 1 reads pre-existing role-1 rows and passes their ids as `notDeleteIds` (`create`'s 8th parameter) so reconciliation cannot touch them. **Shipped precedent exists**: `result-actors.service.ts:62-84` does exactly this | New read + re-implementation of portfolio 1, new tests, amends **DD-6** and arguably DD-3 | Closes DC-2 defensively rather than incidentally — the wipe becomes impossible even if `formalizeResult` later gains an update path. Widens T-03 beyond the approved design |
| **C** | Drop AC.2's positive-survival clause entirely and rely on T-06's inertness suite | Doc-only, smallest | Loses the clause without replacing it. **Not recommended** — R-RES-007 exists precisely to make this falsifiable, and this is the option that quietly removes the guarantee |

**Leader recommendation: A.** It makes the spec say what the system actually guarantees, which is the point of the requirement, and it leaves RB-2 visible as the open risk it genuinely is. B is a real improvement in robustness and has shipped precedent, but it is a design change and belongs to the owner, not to an execution loop — and adopting it silently would be exactly the scope growth the methodology forbids.

**Blocked pending owner approval.** No spec document has been amended yet: which amendment to write is determined by the decision. Per the protocol, the correction will then be closed with the **two-direction sweep** — forward for every surviving statement of the superseded guarantee, backward for documents citing the amended sections (including `tasks.md` §4's coverage rows for `R-RES-007` and, under option B, DD-6 and DD-3).
