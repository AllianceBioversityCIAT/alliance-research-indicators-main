# Requirements — Results / AI Formalize: Portfolio-Routed Strategic Objectives

- **Module:** results
- **Spec id:** 2026-09-ai-formalize-strategic-objectives
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Depth:** Standard
- **Type:** Change
- **Approval Mode:** gated
- **Linked PRD section:** `docs/prd.md` §3.3 (Center / General Admin — "supports bulk AI formalization"), §3.5 (AI/ML formalization pipeline)
- **Linked tickets:** —
- **Extends:** `docs/specs/results/capdev-bulk-upload-notification` (shares `createResultFromAiBulk`; notification stage untouched)
- **Proposal:** `./proposal.md` (approved 2026-09-02, decisions D-1 … D-4)
- **Last updated:** 2026-09-02 · **R-RES-007 amended 2026-09-04** (cross-spec, `docs/specs/results/ai-formalize-primary-levers` T-07/DC-8 — see the requirement itself, §1's "Must stay inert" row, and `execution.md`'s dated append)

---

## 1. Context

The AI extraction pipeline now emits a new-portfolio alignment field, `strategic_objectives: [1, 3, 5]`. Today both formalize endpoints reject it outright: `ResultRawAi` has no such property and the handlers run `ValidationPipe({ forbidNonWhitelisted: true })`, so the payload fails with `400 property strategic_objectives should not exist`.

Accepting the field is only half the work. Strategic objectives belong to the **alignment** section, and alignment is portfolio-scoped: `portfolio-handlers/` routes a save to `Portfolio1AlignmentHandler` or `Portfolio2AlignmentHandler`. That routing currently derives the portfolio **only from the HTTP request** (`PortfolioUtil.setup()` reads `portfolioId` param/query or `reportYear`), and neither formalize route carries either. So the formalizer must resolve the portfolio itself — from each item's own year, by querying the `portfolios` table.

**Affected surface, enumerated by what executes on the route** (KZ-002 applied to a server path — every collaborator the request touches, not just the feature folder):

| Layer | Element |
| --- | --- |
| Route | `POST /api/results/ai/formalize`, `POST /api/results/ai/formalize/bulk` |
| Pipe | `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` on both handlers |
| DTO | `ResultRawAi` (both), `RootAi` (bulk wrapper), `ResultAiDto` (internal shape) |
| Service | `ResultsService.formalizeResult`, `.createResultFromAiRoar`, `.createResultFromAiBulk` |
| Handler chain | `ResultSectionOrchestratorService` → `AlignmentHandlerRegistry` → `Portfolio1AlignmentHandler` / `Portfolio2AlignmentHandler` |
| Reference data | `portfolios`, `strategic_objectives` |
| Write target | `result_strategic_objectives` (role `ALIGNMENT` = 1) |
| Reporting | `CreateBulkUploadResultsDto.missing_fields` → `bulk_upload_results` |
| Must stay inert | ALIGNMENT-role `result_contracts`, `result_sdgs`, ~~`result_levers`~~, the CapDev notification stage — **amended 2026-09-04 (cross-spec, DC-8):** `result_levers` struck because a sibling AI-write field, `primary_levers` (`docs/specs/results/ai-formalize-primary-levers`), now writes that table independently of `strategic_objectives`. Its inertness is no longer this spec's to guarantee alone; see R-RES-007 below |

**Explicitly not changing:** the request/response shape of `PATCH`/`GET /api/results/:result-code/alignments`; the bulk role guard; the CapDev notification stage; the `portfolios` and `strategic_objectives` seed data.

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Portfolio** | A reporting era with a year range, held in `portfolios` (`start_year`, `end_year`, `is_active`). P1 = 2010–2025, P2 = 2026–2030 as seeded. |
| **Resolved portfolio** | The single active portfolio whose year range contains the item's year. The only legitimate source of portfolio routing in this spec. |
| **Strategic objective** | A row in `strategic_objectives`, each owned by exactly one portfolio via `portfolio_id`. All five seeded rows belong to portfolio 2. |
| **Narrow alignment save** | A write that touches only `result_strategic_objectives` for role `ALIGNMENT`, as opposed to the section-wide alignment save that also rewrites contracts, levers and SDGs. |
| **Item** | One element of `RootAi.results`; the unit of portfolio resolution, success, failure and reporting. |
| **`missing_fields`** | The per-item reporting channel already carried by `CreateBulkUploadResultsDto` into `bulk_upload_results`. |

---

## 3. System Context & Scope

**In scope**

- `ResultRawAi.strategic_objectives?: number[]` — optional, validated, Swagger-documented.
- Year → portfolio resolution by database lookup, memoized per request.
- A narrow, strategic-objectives-only save reached through the existing portfolio handler chain.
- Per-item portfolio routing inside `formalizeResult`, with the portfolio supplied explicitly rather than read from request state.
- Reporting of ignored and discarded ids via `missing_fields`.
- Repair of the unguarded `resultMetadata.push` that makes the single endpoint fail today.
- Unit specs for every touched service, handler and DTO.

**Out of scope**

- Any migration, new table, index, or seed change.
- Any client (`client/research-indicators`) change.
- Any other alignment sub-section in the formalizer (levers, research areas, impact outcomes, contracts beyond the existing `contract_id`).
- OpenSearch mapping changes (`result_strategic_objectives` is not an indexed result column in this spec).
- Changing the alignment endpoints' contract.

---

## 4. Stakeholders / Personas

| Persona (PRD §3) | Interest |
| --- | --- |
| §3.5 AI/ML formalization pipeline | Producer of the payload; needs the field accepted, not 400-rejected |
| §3.3 Center / General Admin | Runs bulk upload; needs per-item outcomes visible in the bulk report rather than a silent drop |
| §3.2 MEL Regional Expert | Consumes the alignment of AI-created results downstream; needs it correct or explicitly absent, never wrong-portfolio |
| §3.1 Result Contributor | Sees the AI-created result in STAR; must not find its contracts or SDGs wiped by the new write |

---

## 5. Functional Requirements

### R-RES-001 — Accept `strategic_objectives` on both formalize endpoints

- **As a** downstream AI formalization pipeline (PRD §3.5)
- **I want** to send `strategic_objectives: [1, 3, 5]` alongside the rest of an extracted result
- **So that** new-portfolio alignment data reaches ARI through the same call, without a second request

**Details**
- Inputs: `ResultRawAi.strategic_objectives?: number[]` — `@IsOptional()`, `@IsArray()`, `@IsNumber({}, { each: true })`, `@ApiProperty({ type: Number, isArray: true, required: false })`.
- Behavior: the field is whitelisted, so `forbidNonWhitelisted` no longer rejects it. It reaches `createResultFromAiRoar` and is carried into the internal `ResultAiDto` shape.
- Outputs: unchanged `ServerResponseDto` envelope. Single: `{ status: 201, description: 'AI Result created', data: <result> }`. Bulk: `{ status: 201, description: 'AI Results created', data: { results_created, results_errors } }`.
- Errors: a non-array, or an array containing a non-number, yields `400` through `GlobalExceptions` with the `class-validator` messages in `errors`.
- Permissions: unchanged — bulk keeps `@Roles(TECHNICAL_SUPPORT, CENTER_ADMIN, MEL_REGIONAL_EXPERT)`; the single endpoint keeps JWT-only.

#### Scenario: The field is accepted

- GIVEN a formalize payload that is valid today
- WHEN `strategic_objectives: [1, 3, 5]` is added to it
- THEN the request is not rejected by the validation pipe
- AND the response envelope is `201` with the same shape as before
- BUT it must NOT require any other new field to be present
- AND IT MUST still reject `strategic_objectives: "1,3,5"` and `strategic_objectives: [1, "x"]` with `400`

**Acceptance criteria**
- [ ] AC.1 — `POST /api/results/ai/formalize/bulk` with the field returns `201`, not `400`.
- [ ] AC.2 — `POST /api/results/ai/formalize` with the field returns `201`, not `400`.
- [ ] AC.3 — `strategic_objectives: [1, "x"]` returns `400` and names the field in `errors`.
- [ ] AC.4 — `/swagger` shows the property as an optional number array on both `RootAi.results[]` and `ResultRawAi`.

---

### R-RES-002 — Resolve the portfolio from the item's year by database lookup

- **As a** platform operator
- **I want** portfolio selection to follow the `portfolios` table
- **So that** moving a portfolio's year range in data moves the routing, with no code release

**Details** *(decision D-1)*
- Behavior: for an item's effective year, select the portfolio where `start_year <= year AND end_year >= year AND is_active = 1`, ordered by `id`, limit 1 — the same predicate as the existing `get_portfolio_id_by_result` SQL function.
- The effective year is the one the item is persisted with: `result.year ?? new Date().getFullYear()` (as `createResultFromAiRoar` already computes).
- Outputs: an internal portfolio id; not exposed in the response.
- Errors: none — an unresolvable year is R-RES-006, not an error.

#### Scenario: 2026 resolves to the portfolio covering 2026

- GIVEN active portfolios P1 (2010–2025) and P2 (2026–2030)
- WHEN an item with `year: 2026` is formalized
- THEN the resolved portfolio is P2
- AND its alignment handler is the one invoked
- BUT it must NOT be selected by comparing the year to a literal in TypeScript
- AND IT MUST ignore a portfolio whose row has `is_active = 0`, even when its year range matches

#### Scenario: A data change moves the routing

- GIVEN P1's `end_year` is changed to 2026 and P2's `start_year` to 2027
- WHEN an item with `year: 2026` is formalized
- THEN the resolved portfolio is P1
- AND no code change was needed to produce that outcome

**Acceptance criteria**
- [ ] AC.1 — `year: 2025` → the portfolio whose range contains 2025; `year: 2026` → the portfolio whose range contains 2026.
- [ ] AC.2 — An inactive portfolio matching the range is never selected.
- [ ] AC.3 — `grep -rn "2026" src/domain/entities/results src/domain/entities/portfolios --include=*.ts` finds no year literal used for routing (test fixtures excluded).
- [ ] AC.4 — An item with no `year` resolves using the current calendar year.

---

### R-RES-003 — Persist strategic objectives through the resolved portfolio's alignment handler

- **As a** MEL Regional Expert (PRD §3.2)
- **I want** AI-created results to carry the same alignment data a manually created result would
- **So that** aggregate views over the new portfolio are complete

**Details**
- Behavior: the formalizer invokes a **narrow alignment save** on the handler registered for the resolved portfolio, passing the validated id list. The portfolio-2 handler writes `result_strategic_objectives` rows with `role_id = ResultStrategicObjectiveRolesEnum.ALIGNMENT` (1).
- The write participates in the same unit of work as the rest of the item, so the existing failure path (`deleteFullResultById`) still fully undoes the item.
- Outputs: rows in `result_strategic_objectives`; no response-shape change.
- Permissions: unchanged.

#### Scenario: Portfolio 2 item persists its strategic objectives

- GIVEN an item with `year: 2026` and `strategic_objectives: [1, 3, 5]`, all three owned by portfolio 2 and active
- WHEN the item is formalized
- THEN `result_strategic_objectives` holds exactly three active rows for that result with `role_id = 1`
- AND `GET /api/results/:result-code/alignments` returns those three objectives
- BUT it must NOT write, deactivate, or rewrite any `result_contracts`, `result_sdgs`, `result_levers`, `result_lever_strategic_outcomes`, `result_lever_sdg_targets` or `result_impact_outcomes` row
- AND IT MUST be undone completely when a later step of the same item fails

**Acceptance criteria**
- [ ] AC.1 — Three active rows exist with the expected `strategic_objective_id` values and `role_id = 1`.
- [ ] AC.2 — Audit columns are populated from `request.user` (`AuditableEntity`), matching every other write in the method.
- [ ] AC.3 — After a forced failure in a step following the alignment write, no `result_strategic_objectives` row survives for that result.
- [ ] AC.4 — `GET .../alignments` for that result returns the objectives with the shape the endpoint already documents.

---

### R-RES-004 — A portfolio that owns no strategic objectives ignores the field and reports it

- **As a** Center / General Admin (PRD §3.3)
- **I want** a pre-2026 row carrying strategic objectives to still be created, with the discrepancy visible
- **So that** a historical or mistagged batch is not lost, and nobody assumes data landed that did not

**Details** *(decision D-2)*
- Behavior: when the resolved portfolio owns no active strategic objectives (today: portfolio 1, which has zero seeded rows), the field is not persisted. The item is created normally, and `strategic_objectives` is appended to that item's `missing_fields`.
- Outputs: the item appears in `results_created`, not `results_errors`; `bulk_upload_results.missing_fields` names the field.

#### Scenario: A 2025 item carrying strategic objectives

- GIVEN an item with `year: 2025` and `strategic_objectives: [1, 3, 5]`
- AND the portfolio covering 2025 owns no active strategic objectives
- WHEN the item is formalized
- THEN the result is created and returned in `results_created`
- AND no `result_strategic_objectives` row is written
- AND that item's `missing_fields` contains `strategic_objectives`
- BUT it must NOT fail the item, and must NOT fail any other item in the batch
- AND IT MUST leave the item's other `missing_fields` entries intact rather than replacing them

**Acceptance criteria**
- [ ] AC.1 — The item is in `results_created` with `error: false`.
- [ ] AC.2 — Zero `result_strategic_objectives` rows for that result.
- [ ] AC.3 — The persisted `bulk_upload_results` row's `missing_fields` includes `strategic_objectives` **in addition to** whatever the AI reported.
- [ ] AC.4 — A 2025 item **without** the field produces no such `missing_fields` entry.

---

### R-RES-005 — Unknown, inactive, or foreign-portfolio ids are discarded and reported

- **As a** MEL Regional Expert (PRD §3.2)
- **I want** only ids that genuinely belong to the resolved portfolio to be stored, with the rest traceable
- **So that** alignment is never wrong, and never silently incomplete

**Details** *(decision D-3)*
- Behavior: each incoming id is validated against `strategic_objectives` filtered by the resolved `portfolio_id` and `is_active = 1`. Valid ids are saved; ids that do not exist, are inactive, or belong to another portfolio are discarded, and the discarded ids are recorded in that item's `missing_fields`. Duplicate ids in the input collapse to one row.
- This deliberately matches neither existing precedent wholesale: unlike `contract_code` the item does not fail; unlike `sdg_targets` the drop is not silent.
- Observability: one `LoggerUtil` warning per item listing the discarded ids.

#### Scenario: A mixed list of valid and invalid ids

- GIVEN an item with `year: 2026` and `strategic_objectives: [1, 999, 3]`
- AND ids 1 and 3 are active and owned by the portfolio covering 2026, while 999 does not exist
- WHEN the item is formalized
- THEN exactly two rows are written, for 1 and 3
- AND that item's `missing_fields` records the discarded id 999
- BUT it must NOT fail the item, and must NOT write a row for 999
- AND IT MUST discard an id that exists but belongs to a different portfolio, and an id whose row has `is_active = 0`

#### Scenario: Every id is invalid

- GIVEN an item with `year: 2026` and `strategic_objectives: [999, 1000]`
- WHEN the item is formalized
- THEN no `result_strategic_objectives` row is written for that result
- AND the item is still created and reported in `results_created`
- BUT it must NOT deactivate any pre-existing row for that result and role

**Acceptance criteria**
- [ ] AC.1 — Only ids active **and** owned by the resolved portfolio produce rows.
- [ ] AC.2 — Discarded ids are named in `missing_fields`, distinguishable from the field-level entry of R-RES-004.
- [ ] AC.3 — `[1, 1, 3]` produces two rows, not three.
- [ ] AC.4 — An all-invalid list is a no-write, not a no-op deactivation and not an error.

---

### R-RES-006 — A year no active portfolio covers behaves as R-RES-004

- **As a** platform operator
- **I want** a gap in `portfolios` to degrade one field, not a whole batch
- **So that** reference-data drift never takes down bulk upload

**Details** *(decision D-4)*
- Behavior: when no active portfolio contains the item's year, no alignment write occurs, the item is created, and `strategic_objectives` is recorded in `missing_fields`. One `LoggerUtil` warning names the unresolvable year.
- This is stated as a requirement, not left to handler discretion (KZ-005).

#### Scenario: A year outside every portfolio range

- GIVEN active portfolios covering only 2010–2030
- WHEN an item with `year: 2035` and `strategic_objectives: [1]` is formalized
- THEN the item is created and returned in `results_created`
- AND no `result_strategic_objectives` row is written
- AND that item's `missing_fields` contains `strategic_objectives`
- BUT it must NOT throw, and must NOT default to portfolio 1 or to the lowest/highest id as a fallback
- AND IT MUST log a warning naming the unresolvable year

**Acceptance criteria**
- [ ] AC.1 — The item is in `results_created`.
- [ ] AC.2 — No row written; no exception surfaced.
- [ ] AC.3 — No implicit portfolio fallback is applied.
- [ ] AC.4 — A warning line names the year.

---

### R-RES-007 — Absence of the field leaves every other alignment table untouched *(scope narrowed 2026-09-04, cross-spec DC-8; see the amendment note under Scenario 1)*

- **As a** Result Contributor (PRD §3.1)
- **I want** the new code path to be inert when the field is absent
- **So that** my AI-created result does not lose its contracts or SDGs

**Details**
- Behavior: when `strategic_objectives` is absent, `null`, or `[]`, the formalizer performs **no** alignment call at all. It must never route through the section-wide alignment save, whose row-reconciliation deactivates every row for `(result_id, role)` absent from the incoming array — including the SDGs and contracts the same method wrote moments earlier.
- This is the spec's highest-severity constraint; it is a behavioral requirement, not an implementation note.

#### Scenario: A payload without the field is byte-identical to today

- GIVEN an item with no `strategic_objectives` key
- WHEN the item is formalized
- THEN the resulting database state is identical to the state produced by the current code for the same payload
- BUT it must NOT deactivate or delete any `result_contracts`, `result_sdgs`, ~~`result_levers`~~ or `result_impact_outcomes` row
- AND IT MUST behave the same for `strategic_objectives: []` and `strategic_objectives: null`

> **Amended 2026-09-04 (cross-spec, DC-8 — `docs/specs/results/ai-formalize-primary-levers` T-07).** `result_levers` is struck from this scenario's `BUT` clause: a sibling AI-write field, `primary_levers`, now writes `result_levers` independently of `strategic_objectives`, so a scenario scoped to `strategic_objectives` alone can no longer promise that table untouched — it never claimed to guard against the sibling field, only against itself, and the sibling field did not exist when this line was written. **The guarantee is restated jointly:** absence of **both** AI alignment fields leaves every other alignment table untouched, and neither new write disturbs the other. **Correction 2026-09-04 (H-1, Reviewer rework):** the carrier pointer below originally named the sibling spec's bare `R-RES-007`; that requirement is silent on `result_levers` when `primary_levers` is absent and does not carry this half of the guarantee. Corrected to the actual carriers, per that spec's own §7. The `result_levers` half of that joint guarantee is now carried jointly by the sibling spec's `[PL] R-RES-008` — "Absence of the field leaves every other alignment table untouched" (its AC.1 names `result_levers` explicitly for a payload without the field) — for the **absence** half, and by `[PL] R-RES-010` — "Both AI alignment fields on one item do not disturb each other" — for the **mutual non-disturbance** half; not by this one. (The sibling's bare `R-RES-007` — "The AI write cannot reach a lever it did not create" — is a related but narrower guarantee about which rows the lever write may touch; it is not the carrier here.) **AC.4 below (no code path reaches the section-wide alignment save) survives unchanged**, and binds both narrow writes now, not just this one.

#### Scenario: A portfolio-2 item's SDGs survive the new write

- GIVEN an item with `year: 2026`, `sdg_targets` that resolve to two SDGs, and `strategic_objectives: [1]`
- WHEN the item is formalized
- THEN both SDG rows and the one strategic-objective row are active
- BUT it must NOT leave any `result_sdgs` row with `is_active = 0`

**Acceptance criteria**
- [ ] AC.1 — ~~For a payload without the field, row counts in `result_contracts`, `result_sdgs`, `result_levers` match a run on the pre-change code.~~ **Amended 2026-09-04 (cross-spec, DC-8).** For a payload without `strategic_objectives`, row counts in `result_contracts` and `result_sdgs` match a run on the pre-change code. `result_levers` is removed from this AC's scope — see the amended scenario clause above. **This AC was ticked as proven by the predecessor's T-06; that tick is not invalidated by this narrowing** (T-06's diff modeled only `result_contracts` and `result_sdgs` — see `execution.md`'s dated append to the T-06 entry), but must not be read as still covering `result_levers`.
- [ ] AC.2 — `[]` and `null` behave as absent.
- [ ] AC.3 — A portfolio-2 item with both `sdg_targets` and `strategic_objectives` ends with all of both active.
- [ ] AC.4 — No code path in the formalizer reaches the section-wide alignment save.

---

### R-RES-008 — Each bulk item routes on its own year, with no leakage between items

- **As a** Center / General Admin (PRD §3.3)
- **I want** one upload to carry rows from several reporting years
- **So that** a mixed file does not need splitting, and no row is filed under the wrong portfolio

**Details**
- Behavior: portfolio resolution is a function of the item, evaluated per item. No request-scoped mutable portfolio state may carry a value from one item into the next — notably `PortfolioUtil` is `REQUEST`-scoped and shared across the whole batch.
- A failure part-way through one item must not change the portfolio any later item resolves.

#### Scenario: A mixed-year batch

- GIVEN a bulk payload of three items with `year` 2025, 2026 and 2027, each carrying a **distinct** `strategic_objectives` list and a distinct `title`
- WHEN the batch is formalized
- THEN the 2026 and 2027 items each store exactly their own objectives
- AND the 2025 item stores none and reports the field in `missing_fields`
- BUT it must NOT store any item's objectives against another item's result
- AND IT MUST produce the same outcome regardless of item order in the array

#### Scenario: A failing item does not poison its successor

- GIVEN a batch where the first item (`year: 2026`) fails after its alignment write
- WHEN the batch continues to a second item with `year: 2025`
- THEN the second item resolves to the portfolio covering 2025, not the one the failed item used
- BUT it must NOT inherit any portfolio state from the failed item

**Acceptance criteria**
- [ ] AC.1 — A three-item mixed-year batch produces the per-item outcome above, with fixture years and objective lists differing per item (KZ-004).
- [ ] AC.2 — Reversing the item order produces the same per-item outcome.
- [ ] AC.3 — After a mid-batch item failure, the next item's resolved portfolio matches its own year.
- [ ] AC.4 — No test passes while the implementation resolves the portfolio once for the whole batch.

---

### R-RES-009 — `POST /api/results/ai/formalize` succeeds on a valid payload

- **As a** downstream AI formalization pipeline (PRD §3.5)
- **I want** the single-result endpoint to work
- **So that** the non-bulk integration path is usable

**Details**
- Current behavior: the controller calls `formalizeResult(resultAi)` without the third argument, and `formalizeResult` performs an unguarded `resultMetadata.push(...)`. The resulting `TypeError` is caught, the freshly created result is deleted by `deleteFullResultById`, and the error is rethrown because `isbulk` is false. The endpoint therefore cannot succeed.
- Required behavior: metadata collection is optional. When no collector is supplied, the metadata is simply not collected and the result is returned.
- This is a pre-existing defect in the method this spec edits, included per §5 of the proposal.

#### Scenario: A valid single payload

- GIVEN a payload that would succeed through the bulk endpoint
- WHEN it is posted to `POST /api/results/ai/formalize`
- THEN the response is `201` with `description: 'AI Result created'` and the created result in `data`
- AND the result persists — it is not rolled back
- BUT it must NOT change the bulk endpoint's metadata reporting in any way
- AND IT MUST still roll back and rethrow when the failure is a genuine one

**Acceptance criteria**
- [ ] AC.1 — A valid single payload returns `201` and the result exists in the database afterwards.
- [ ] AC.2 — A genuinely invalid single payload (e.g. unknown `contract_code`) still returns a `4xx` envelope and leaves no orphan result.
- [ ] AC.3 — Bulk metadata rows are unchanged: one `bulk_upload_results` row per item, same fields.

---

### R-RES-010 — The unguarded portfolio-2 handler payload access is hardened

- **As a** developer maintaining the alignment endpoints
- **I want** the portfolio-2 handler to tolerate an absent array
- **So that** the narrow AI path and the existing endpoint cannot be crashed by a partial payload

**Details**
- Current behavior: `Portfolio2AlignmentHandler.save` calls `payload.strategic_objectives.map(...)` unguarded, and `payload.impact_outcomes.map(...)` unguarded for the OICR and POLICY_CHANGE indicators — a `TypeError` on any payload omitting them.
- Required behavior: an absent or null array is treated as an empty list by the handler's own contract, so the caller decides intent and the handler never throws on shape.

#### Scenario: A payload omitting the arrays

- GIVEN a `PATCH .../alignments` payload for a portfolio-2 result with neither `strategic_objectives` nor `impact_outcomes`
- WHEN the portfolio-2 handler saves it
- THEN no `TypeError` is raised
- BUT it must NOT change the outcome for a payload that does supply both arrays
- AND IT MUST keep the OICR / POLICY_CHANGE indicator gate on impact outcomes exactly as it is

**Acceptance criteria**
- [ ] AC.1 — The handler returns normally for a payload omitting both arrays.
- [ ] AC.2 — Existing behavior for a fully populated payload is unchanged, proven by the existing handler spec still passing untouched.

---

## 6. Non-Functional Requirements

Inherited without restatement: `ServerResponseDto` envelope, `GlobalExceptions`, `AuditableEntity` audit, Swagger annotations, 60% Jest coverage floor.

### NFR-RES-001 — No year constant in application code

- **Category:** dx / maintainability
- **Target:** zero year literals used for portfolio routing in `src/` (fixtures excluded). The rule lives in data (`portfolios`), not in code.
- **How verified:** `grep -rn "2026" src/domain/entities/results src/domain/entities/portfolios --include=*.ts` reviewed; code review.

### NFR-RES-002 — Portfolio resolution does not scale with batch size

- **Category:** performance
- **Target:** portfolio lookups per bulk request ≤ the number of **distinct years** in the batch, not the number of items. Memoize per request.
- **How verified:** unit test counting repository calls for a 10-item, 2-distinct-year batch — expect 2, not 10.

### NFR-RES-003 — Every discard is observable

- **Category:** observability
- **Target:** each ignored field (R-RES-004, R-RES-006) and each discarded id (R-RES-005) is recorded in the item's `missing_fields` **and** emitted once per item via `LoggerUtil` at `warn`.
- **How verified:** unit test asserting both channels; no silent drop.

### NFR-RES-004 — Reachable path documented without a version segment

- **Category:** dx
- **Target:** every path this spec writes is `/api/results/ai/formalize[/bulk]`. URI versioning is enabled with **no** `defaultVersion` (`main.ts:53-56`), and neither handler declares `@Version(...)`, so a `/api/v1/...` form returns `404`. The PRD's AC-API-Surface still asserts `/api/v1/...`; that is known baseline drift flagged in `CLAUDE.md` §4.1 and is not corrected by this spec.
- **How verified:** `grep -rn "/v1" docs/specs/results/ai-formalize-strategic-objectives server/researchindicators/test` — a **reviewed** sweep, not a zero-hit one: every hit must be a statement that a `/v1` path is *un*reachable. A hit asserting a `/v1` path as callable, in a doc or a test URL, is a FAIL. Pattern derived from the claim (`/v1`), not from the citation that surfaced it (`api/v1`) — KZ-006.

---

## 7. Data Requirements

| Concern | Detail |
| --- | --- |
| Entities read | `portfolios` (`src/domain/entities/portfolios/entities/portfolio.entity.ts`), `strategic_objectives` (`.../strategic-objectives/entities/strategic-objective.entity.ts`) |
| Entity written | `result_strategic_objectives` (`.../result-strategic-objectives/entities/result-strategic-objective.entity.ts`) — role `ALIGNMENT` = 1 |
| Columns added / changed | **none** |
| Migrations | **none added.** The write target, both reference tables, and the year ranges already exist (`1782328490591`, `1782400514019`, `1783020803759`, `1783024745006`). **Precondition:** migration `1783029013035` must already be applied — its redefinition of `full_delete_result_version` is the one that deletes `result_strategic_objectives`; the older definition (`1778510205765`) does not. See RK-6 and `design.md` DD-6 |
| Indexes | none added |
| OpenSearch | no new `@OpenSearchProperty` |
| Backfill | none. Results already formalized are out of scope |
| Seed dependency | Portfolio 1 has **zero** `strategic_objectives` rows; all five seeded rows are `portfolio_id = 2`. R-RES-004 exists because of this, and must remain correct if portfolio 1 ever gains rows — the requirement is written against "owns no active objectives", not against "is portfolio 1" |

---

## 8. API Surface Delta

### `POST /api/results/ai/formalize`

| Aspect | Value |
| --- | --- |
| Roles / guards | JWT only (`JwtMiddleware`); no `@Roles`, no `ResultStatusGuard` |
| Body DTO | `src/domain/entities/results/dto/result-ai.dto.ts` → `ResultRawAi` |
| Change | `strategic_objectives?: number[]` added (additive, optional) |
| Data shape | unchanged (`Result` + `error: false`) |
| Versioning | unversioned — no `@Version(...)` on the handler (see NFR-RES-004) |
| Swagger | `@ApiProperty` required on the new field |

### `POST /api/results/ai/formalize/bulk`

| Aspect | Value |
| --- | --- |
| Roles / guards | `@Roles(TECHNICAL_SUPPORT, CENTER_ADMIN, MEL_REGIONAL_EXPERT)` + `RolesGuard` — unchanged |
| Body DTO | same file → `RootAi` (wraps `ResultRawAi[]`) |
| Change | inherited from `ResultRawAi`; `RootAi` itself unchanged |
| Data shape | unchanged (`{ results_created, results_errors }`) |
| Versioning | unversioned |
| Swagger | inherited via `@ApiBody({ type: RootAi })` |

No new endpoint. No breaking change, so no `/v2`.

---

## 9. Defect Classes And Their Gates

The classes of defect this spec can actually produce, and the command that catches each. A gate blind to the dominant class is not a gate.

| # | Defect class | Gate | Would it fail? — the input that produces a FAIL |
| --- | --- | --- | --- |
| DC-1 | **Wrong-portfolio write** — an item filed under the portfolio of another item, or of the request | `npm test -- --silent` on the resolver + mixed-year bulk spec (R-RES-008) | A batch of 2025/2026/2027 items with distinct objective lists, against an implementation that resolves once per request: the 2025 item gains rows it must not have. **Only fails if fixture years differ** — identical years cannot distinguish per-item routing from a batch constant (KZ-004) |
| DC-2 | **Collateral deactivation** — the new write reconciles a whole role and wipes contracts / SDGs the same method just wrote | `npm test -- --silent` on the R-RES-007 DB-state spec | An item with both `sdg_targets` and `strategic_objectives`, asserted on `is_active` of the SDG rows: routing through the section-wide save flips them to `0` |
| DC-3 | **Crash on absent arrays** — `TypeError` from an unguarded `.map` | `npm test -- --silent` on the R-RES-010 handler spec | A payload omitting `strategic_objectives` / `impact_outcomes` against today's handler: throws |
| DC-4 | **Silent data loss** — invalid ids dropped with no trace | `npm test -- --silent` asserting `missing_fields` **content**, not presence | `[1, 999, 3]` against an implementation that filters with `In(...)` and reports nothing: `missing_fields` lacks 999 |
| DC-5 | **Year constant** — routing hardcoded, so a data change desyncs | Test that moves the fixture portfolio ranges (R-RES-002 scenario 2) + the NFR-RES-001 grep | Portfolio ranges shifted so 2026 belongs to P1: a hardcoded `>= 2026` still picks P2 |
| DC-6 | **Regression on the alignment endpoints** | Full `npm test -- --silent` in `server/researchindicators`, not a targeted suite — the handler chain is shared by `PATCH`/`GET .../alignments` (KZ-003) | Any change to `Portfolio2AlignmentHandler` or the registry that alters the endpoint's output |
| DC-7 | **Path drift** — a versioned path asserted as callable in the spec or a test | Reviewed `grep -rn "/v1"` over this spec folder and `server/researchindicators/test` (KZ-006); see NFR-RES-004 | A test that calls `/api/v1/results/ai/formalize/bulk`, or a doc line stating that path is reachable — both pass a zero-hit grep only if the grep is scoped to miss them, which is why the gate is reviewed rather than counted |

**Classes with no automated gate — substituted or accepted:**

| # | Class | Why no automated gate | Control |
| --- | --- | --- | --- |
| DC-8 | **Dev reference data does not match the assumption** — `portfolios` or `strategic_objectives` rows differ from the seed the spec reasons about | Unit tests use fixtures by design; the shared Dev DB is remote, mutable, and not disposable | **Manual pre-flight at the first HITL pause:** query both tables in Dev and confirm the ranges and `portfolio_id` ownership before implementing. Owner-supplied screenshot on 2026-09-02 already confirms `portfolios`; `strategic_objectives` still to confirm |
| DC-9 | **The producer's real payload does not match the accepted contract** — the AI pipeline sends a different shape (strings, objects, a different key) | The producer lives outside this repo; no test here can falsify its output | **Manual gate, before the validation verdict (KZ-007):** run one real mixed-year bulk upload against Dev with a payload captured from the actual extractor, and inspect `result_strategic_objectives` + `bulk_upload_results`. This is the first check, not the last |
| DC-10 | **`missing_fields` is consumed downstream in a way this change breaks** — the CapDev notification and bulk report read the same column | Cross-spec behavioral coupling; only partly covered by that spec's own suites | **Accepted risk**, mitigated by DC-6's full-suite run and by R-RES-004 AC.3 asserting *addition*, never replacement |

---

## 10. Cross-System Impact

| System | Impact |
| --- | --- |
| CLARISA / AGRESSO / TIP / ROAR | none — `strategic_objectives` is ARI-owned reference data, not a CLARISA list, so AC-Controlled-Lists is satisfied by construction |
| OpenSearch | none |
| Socket.IO | none — no new event |
| RabbitMQ / DynamoDB | none |
| STAR client | none. The client already reads alignment through `GET .../alignments`, whose contract is unchanged |
| CapDev bulk notification spec | shares `createResultFromAiBulk` and the `missing_fields` column; the notification stage is untouched and must stay so |

---

## 11. Assumptions, Dependencies, Risks

**Assumptions**

| # | Assumption |
| --- | --- |
| A-1 | The producer sends `strategic_objectives` as an array of numeric ids referencing `strategic_objectives.id` — not names, not codes, not objects. Unverifiable in this repo; see DC-9 |
| A-2 | `role_id = 1` (`ALIGNMENT`) is the correct role for AI-sourced strategic objectives, the same role the `PATCH .../alignments` path uses |
| A-3 | An item's `year` is authoritative for portfolio selection. No separate portfolio hint arrives in the payload |

**Dependencies**

| # | Dependency |
| --- | --- |
| D-1 | Dev MySQL holds the rows from migrations `1782328490591`, `1782400514019`, `1783024745006`. Confirm before implementing (DC-8) |
| D-2 | `docs/specs/results/capdev-bulk-upload-notification` — same method; no behavioral overlap expected, but its suites are part of DC-6's full run |

**Risks**

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| RK-1 | The section-wide alignment save is reachable from the new path and wipes sibling rows | **High** | R-RES-007 as a behavioral requirement + DC-2 gate + explicit design constraint |
| RK-2 | Portfolio state leaks across bulk items via request-scoped `PortfolioUtil` | **High** | R-RES-008; the design forbids mutating request-scoped portfolio state in the loop |
| RK-3 | A test fixture whose items share a year certifies per-item routing that does not exist | **High** | KZ-004 written into R-RES-008 AC.1 and DC-1 |
| RK-4 | Changing the shared portfolio-2 handler regresses `PATCH`/`GET .../alignments` | Medium | KZ-003 — full suite, not targeted (DC-6) |
| RK-5 | A rule ends up living only in a test or handler rather than here | Medium | KZ-005 — D-2, D-3, D-4 are each their own numbered requirement (R-RES-004, R-RES-005, R-RES-006) |
| RK-6 | On an environment before migration `1783029013035`, the compensating delete hits FK error 1451 (`result_strategic_objectives.result_id` → `results` is `ON DELETE NO ACTION`). That throw originates *inside* the existing `catch`, where the delete is awaited without its own `try`, so it would abort the **whole batch** and skip the notification dispatch. Latent today because the formalizer writes no such rows; **this change activates it** | **High** | Verify the migration is applied in every target environment before rollout (`design.md` DD-6, §11). Deliberately not masked with a nested `try/catch` — that would trade a loud failure for a silent orphan-row leak |

---

## 12. Open Questions

None blocking. Proposal OQ-1 and OQ-2 were resolved by the owner on 2026-09-02 and are recorded as decisions D-1 … D-4 in `proposal.md` §12, then written into R-RES-002, R-RES-004, R-RES-005 and R-RES-006.

| # | Carried item | Owner | Target |
| --- | --- | --- | --- |
| Q-1 | Confirm `strategic_objectives` rows and their `portfolio_id` ownership in Dev (DC-8) | D. Casañas | before implementation starts |
| Q-2 | Confirm the producer's real payload shape for the field (A-1 / DC-9) | D. Casañas | before the validation verdict |

---

## 13. Requirement ID Index

| ID | Title | Decision source | Severity |
| --- | --- | --- | --- |
| R-RES-001 | Accept `strategic_objectives` on both formalize endpoints | proposal §4 | High |
| R-RES-002 | Resolve the portfolio from the item's year by database lookup | D-1 | High |
| R-RES-003 | Persist through the resolved portfolio's alignment handler | proposal §11 | High |
| R-RES-004 | Portfolio owning no objectives ignores and reports the field | D-2 | High |
| R-RES-005 | Unknown / inactive / foreign ids discarded and reported | D-3 | High |
| R-RES-006 | Unresolvable year behaves as R-RES-004 | D-4 | Medium |
| R-RES-007 | ~~Absence of the field leaves other alignment tables untouched~~ — **narrowed 2026-09-04 (cross-spec DC-8):** now joint with `[PL] R-RES-008`/`R-RES-010`; see the amendment note under Scenario 1 | proposal H-1 | **Highest** |
| R-RES-008 | Per-item routing with no leakage between items | proposal §10 B1 | High |
| R-RES-009 | Single formalize endpoint succeeds on a valid payload | proposal §3.5 | Medium |
| R-RES-010 | Portfolio-2 handler hardened against absent arrays | proposal H-2 | Medium |
| NFR-RES-001 | No year constant in application code | D-1 | High |
| NFR-RES-002 | Portfolio resolution does not scale with batch size | — | Medium |
| NFR-RES-003 | Every discard is observable | D-2 / D-3 | Medium |
| NFR-RES-004 | Reachable path documented without a version segment | KZ-006 | Medium |

---

## 14. Sign-off

- [ ] Engineering lead — David Felipe Casañas Hernández
- [ ] MEL / product owner — <pending>
- [ ] Security review — not required (no auth, secrets, or role change)
- [ ] DevOps — not required (no migration, no infra change)
