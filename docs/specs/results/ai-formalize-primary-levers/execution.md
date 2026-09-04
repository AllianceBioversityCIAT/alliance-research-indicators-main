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
