# Proposal — Results / AI Formalize: Portfolio-Routed Strategic Objectives

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/results/ai-formalize-strategic-objectives` |
| **Slug** | `ai-formalize-strategic-objectives` — derived from free-text argument (the argument was a paragraph of intent, not a path) |
| **Type** | **Change** |
| **Approval Mode** | `gated` (no end-to-end mandate given) |
| **Module** | `results` (server) |
| **Owner** | David Felipe Casañas Hernández |
| **Status** | **approved 2026-09-02** (open questions resolved by owner) |
| **Last updated** | 2026-09-02 |
| **Parent Spec** | none (single bounded change) |
| **Depends on** | none |
| **Parallel-safe** | yes (server-only; no client, no migration) |

---

## 2. Intent

Let the AI formalizer accept the new-portfolio alignment field `strategic_objectives: [1, 3, 5]` on both `POST /api/results/ai/formalize` and `POST /api/results/ai/formalize/bulk`, and persist it through the **portfolio alignment handler selected automatically from the result's year** — portfolio 1 for years up to 2025, portfolio 2 for 2026 and later.

---

## 3. Problem / Current Behavior

| # | Fact (verified in code) | Where |
| --- | --- | --- |
| 3.1 | `ResultRawAi` has **no** `strategic_objectives` property. Both endpoints run `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, so sending the field today is rejected with `400 property strategic_objectives should not exist`. | `dto/result-ai.dto.ts`; `results.controller.ts:636-683` |
| 3.2 | `formalizeResult` persists result, general information, SDGs, IP rights, geo scope, partners, evidences and the indicator-specific block. **It never touches the alignment section.** So there is no existing save path to extend — one has to be added. | `results.service.ts:876-991` |
| 3.3 | The portfolio handler chain exists and works, but resolves the portfolio **only from the HTTP request**: `PortfolioUtil.setup()` reads `portfolioId` (param/query) or `reportYear` (query / current result). The two formalize routes carry neither, so `ResultSectionOrchestratorService.resolvePortfolioId()` would throw `BadRequestException('Portfolio not found')` if called as-is. | `shared/utils/portfolio.util.ts`; `portfolio-handlers/application/result-section-orchestrator.service.ts:38-47` |
| 3.4 | The year → portfolio rule is **already data-driven**, not a constant: `portfolios` holds P1 = 2010–2025 and P2 = 2026–2030. A SQL function `get_portfolio_id_by_result(result_id)` performs the same lookup. | migrations `1782328490591`, `1783024745006`, `1783020803759` |
| 3.5 | `POST ai/formalize` (single) calls `formalizeResult(resultAi)` with no `resultMetadata`, and `formalizeResult` does an unguarded `resultMetadata.push(...)`. The single endpoint therefore throws `TypeError`, rolls the result back and rethrows — **it is non-functional today**, before this change. | `results.controller.ts:645`; `results.service.ts:955` |

**Consequence:** the new portfolio's alignment data cannot enter the platform through bulk upload at all, and the field the AI extractor now emits is actively rejected at the DTO boundary.

---

## 4. Proposed Outcome

| Given | When | Then |
| --- | --- | --- |
| A formalize payload with `year: 2026` and `strategic_objectives: [1, 3, 5]` | the item is formalized (single or bulk) | the portfolio covering 2026 with `is_active = 1` is looked up in the DB (D-1), and its alignment handler persists three `result_strategic_objectives` rows with `role_id = ALIGNMENT`, inside the same unit of work as the rest of the item |
| A payload with `year: 2025` and `strategic_objectives: [...]` | the item is formalized | the portfolio-1 handler is selected; the field is ignored and recorded in the item's `missing_fields` (D-2) — the item is still created |
| A payload with no `strategic_objectives` | the item is formalized | behavior is byte-identical to today — no alignment write, nothing deactivated |
| A mixed batch (2025 and 2026 items) | one bulk request | each item routes to its own portfolio; one item's portfolio never leaks into the next |

---

## 5. Scope

- `ResultRawAi`: add validated, optional `strategic_objectives?: number[]`.
- `createResultFromAiRoar`: map the raw field into the `ResultAiDto` intermediate shape.
- A year → portfolio resolver reused from the `portfolios` table (never a hardcoded `2026`), so moving a portfolio's year range in data moves the routing.
- A **narrow** strategic-objectives save path on the alignment handler contract, invoked per item by `formalizeResult`, with the portfolio passed explicitly.
- `formalizeResult` guard so the single endpoint (§3.5) works — it is the same method this change edits and the user named it in scope.
- Unit specs for the resolver, both handlers, and the formalizer's routing (per KZ-004: fixture years must differ per item, otherwise the test cannot tell per-item routing from a batch-wide constant).
- Swagger `@ApiProperty` for the new field.

---

## 6. Non-Goals

- No change to `PATCH`/`GET /api/results/:code/alignments` request or response shapes.
- No migration, no new table, no seed change.
- No client work.
- No new alignment sub-sections in the formalizer (levers, research areas, impact outcomes, contracts beyond today's `contract_id`) — strategic objectives only.
- No change to the `formalize/bulk` role guard or the CapDev notification stage.

---

## 7. Affected Users, Systems, And Specs

| Surface | Impact |
| --- | --- |
| `results.controller.ts` — `POST ai/formalize`, `POST ai/formalize/bulk` | payload contract widened (additive) |
| `dto/result-ai.dto.ts` — `ResultRawAi` | new optional field |
| `results.service.ts` — `formalizeResult`, `createResultFromAiRoar` | new save path + portfolio resolution |
| `portfolio-handlers/` — handler interface, registry, P1 + P2 alignment handlers, orchestrator | new narrow entry point |
| `result_strategic_objectives` table | new writer (AI path); shape unchanged |
| Related spec | `docs/specs/results/capdev-bulk-upload-notification` — shares `createResultFromAiBulk`; the notification stage must stay untouched |
| Callers of the bulk endpoint | AI extraction service (payload producer) |

---

## 8. Visual Reference

- **Source:** None
- **Location:** —
- **Notes:** Backend-only change. Two JSON API contracts and one persistence path; no rendered surface.

---

## 9. Requirement Delta Preview

### ADDED

- `ResultRawAi.strategic_objectives?: number[]` — optional, validated (`@IsArray`, `@IsNumber({}, {each:true})`, `@IsOptional()`), documented in Swagger.
- Automatic year → portfolio resolution for the AI formalize path, read from the `portfolios` table.
- A strategic-objectives-only save on the alignment handler contract, implemented per portfolio.
- Per-item routing in `formalizeResult`: the portfolio comes from that item's year, never from the request or from the previous item.

### MODIFIED

- `createResultFromAiRoar` carries the new field into `ResultAiDto`.
- `formalizeResult` gains one alignment step and the `resultMetadata` guard (§3.5).
- `ResultSectionOrchestratorService` gains an explicit-portfolio entry point (see §11) so a non-HTTP caller can use the handler chain.

### REMOVED

- Nothing.

---

## 10. Approach Options

Every option must clear the same two hazards, both verified in code:

- **H-1 — the section-wide save is destructive from a partial payload.** `BaseServiceSimple.create` deactivates every existing row for `(result_id, role)` whose primary key is not in the incoming array, and `create(resultId, undefined, …)` yields an *empty* array. Calling `ResultAlignmentOperationsService.save` (or `Portfolio2AlignmentHandler.save`) from the formalizer with only `strategic_objectives` filled would therefore deactivate the ALIGNMENT-role contracts **and the SDGs `formalizeResult` has already written moments earlier**. `base-service.ts:120-190`; `result-alignment-operations.service.ts:28-120`.
- **H-2 — the portfolio-2 handler dereferences absent arrays.** `Portfolio2AlignmentHandler.save` calls `payload.strategic_objectives.map(...)` unguarded, and `payload.impact_outcomes.map(...)` unguarded for OICR / POLICY_CHANGE — `TypeError` on any payload that omits them. `portfolio-2-alignment.handler.ts:50-107`.

| Option | Mechanics | Trade-offs |
| --- | --- | --- |
| **A — narrow AI save on the handler contract** *(recommended)* | Add a strategic-objectives-only method to the alignment handler contract. P2 implements it via `ResultStrategicObjectivesService.create(resultId, ids, 'strategic_objective_id', ALIGNMENT, manager)`. P1 implements the §12 OQ-1 decision. `formalizeResult` resolves the portfolio from the item's year and calls the orchestrator with that portfolio passed explicitly. | Clears H-1 by construction — the write touches one role and nothing else. Fixes H-2 within the touched handler. Keeps the orchestrator as the single delegation point the module README declares. Cost: one new method on three files (interface + two handlers). |
| **B — reuse the existing section `save`** | Formalizer assembles a full `ResultAlignmentDto` and calls the P2 handler's existing `save`. | **Reject.** Walks straight into H-1 — it wipes contracts and SDGs already persisted for the same result. Also requires levers, research areas and impact outcomes the AI payload does not carry. |
| **C — bypass the handler chain** | `formalizeResult` does `if (year >= 2026) resultStrategicObjectivesService.create(...)` inline. | **Reject.** The user asked explicitly for the handler; and it hardcodes the portfolio rule in a second place, so a data change to `portfolios.end_year` would silently desync from §3.4. |

### Sub-decision — how the formalizer supplies the portfolio

| Option | Trade-offs |
| --- | --- |
| **B1 — explicit `portfolioId` argument on the orchestrator** *(recommended)* | Pure function of the item; no shared mutable state; each bulk item is independent and unit-testable without a request. |
| B2 — mutate request-scoped `PortfolioUtil` per item (`setCurrentPortfolio`) | **Reject.** `PortfolioUtil` is `REQUEST`-scoped and one bulk request processes N items with N different years. A throw mid-item leaves the previous item's portfolio in place for the next one — a silent wrong-portfolio write, which is exactly the failure mode this change exists to prevent. |

---

## 11. Recommended Approach

**Option A + sub-decision B1.** The smallest path that satisfies "use the handler, route by year" without touching the alignment endpoints or risking data already persisted in the same request:

1. Add `strategic_objectives?: number[]` to `ResultRawAi` (validated, optional, Swagger-documented) and carry it through `createResultFromAiRoar`.
2. Add a year → portfolio resolver backed by the `portfolios` table (`start_year <= year <= end_year`, `is_active = 1`), mirroring `get_portfolio_id_by_result`. No literal `2026` anywhere in TypeScript.
3. Extend the alignment handler contract with a strategic-objectives-only save; implement it in P2, and in P1 per the OQ-1 decision.
4. Give `ResultSectionOrchestratorService` an explicit-portfolio entry point; `formalizeResult` calls it once per item with the portfolio derived from that item's year.
5. Guard `resultMetadata.push` so the single endpoint stops rolling back (§3.5).
6. Harden the two unguarded `.map` calls in the P2 handler (H-2).

---

## 12. Decisions (approved 2026-09-02, owner)

| ID | Decision | Consequence for the spec |
| --- | --- | --- |
| **D-1** *(was OQ-1)* | **Portfolio resolution is a database lookup, never a year constant.** For a result's year, select the portfolio whose `start_year <= year <= end_year` **and** `is_active = 1`. Owner confirmed against Dev: P1 = 2010–2025, P2 = 2026–2030. No literal `2026` may appear in TypeScript; moving a range in data must move the routing. | The resolver reads `portfolios`, mirroring `get_portfolio_id_by_result` (§3.4). An unresolvable year (no active portfolio covers it) is its own case — see D-4. |
| **D-2** *(was OQ-1)* | A payload whose resolved portfolio owns no strategic objectives (today: portfolio 1) **ignores the field and records it in the item's `missing_fields`.** The item is still created. | The portfolio-1 handler implements the narrow save as a no-op that reports. Historical and mixed-year batches never fail on this. `elementResultMetadata.missing_fields` is the carrier — it already flows into `bulkUploadResults`. |
| **D-3** *(was OQ-2)* | An id that does not exist, is inactive, or belongs to a different portfolio is **discarded; the valid ids are saved and the discarded ones recorded in `missing_fields`.** | Neither of the two precedents in `createResultFromAiRoar` is copied wholesale: unlike `contract_code` the item does not fail, and unlike `sdg_targets` the drop is not silent. Validation queries `strategic_objectives` filtered by the resolved `portfolio_id` + `is_active`. |
| **D-4** | Derived from D-1: if **no** active portfolio covers the item's year, treat it as D-2 (ignore + `missing_fields`), not as a crash. | Keeps a data gap in `portfolios` from taking down a batch. To be stated as a requirement, not left to the handler's discretion (KZ-005). |

---

## 13. Risks And Dependencies

| ID | Item | Severity | Note |
| --- | --- | --- | --- |
| R-1 | H-1 (destructive partial save) — mitigated by Option A, but a reviewer must confirm the AI path never reaches the section-wide `save`. | **High** | |
| R-2 | `formalizeResult` runs each item's writes without an item-level transaction; failures roll back via `deleteFullResultById`. The new write must sit inside that same rollback envelope, not after it. | Medium | |
| R-3 | KZ-005 — D-2, D-3 and D-4 are *requirements*, not handler details. Each must land in `requirements.md` as its own numbered requirement with a scenario; a rule that survives only in a handler is a gap. | Medium | Kaizen |
| R-4 | KZ-004 — the bulk routing test must vary `year` per fixture item (e.g. 2025 + 2026 + 2027). Identical years cannot distinguish per-item routing from a batch-wide constant. | **High** | Kaizen |
| R-5 | KZ-007 — exercise a real mixed-year bulk upload against Dev before the validation verdict, not after. | Medium | Kaizen |
| DEP-1 | Dev MySQL must actually contain the portfolio rows from migrations `1782328490591` / `1783024745006` and the five strategic objectives from `1782400514019`. Verify before implementing; the shared Dev DB is not disposable. | Medium | |
| R-6 | §3.5 is a pre-existing defect in an endpoint the user named in scope. Included in §5; say the word if you would rather it ship separately. | Medium | |

---

## 14. Success Criteria

1. `POST ai/formalize/bulk` accepts `strategic_objectives: [1, 3, 5]` without a 400.
2. A `year: 2026` item persists exactly those three rows in `result_strategic_objectives` with `role_id = 1` (ALIGNMENT).
3. A `year: 2025` item creates the result, writes **no** `result_strategic_objectives` row, and reports the field in that item's `missing_fields` (D-2).
4. A single bulk request mixing 2025 / 2026 / 2027 items routes each to its own portfolio, proven by a fixture whose years differ per item (R-4).
5. A payload without the field leaves `result_strategic_objectives`, ALIGNMENT-role contracts and `result_sdgs` untouched — nothing deactivated (H-1 regression guard).
6. `GET /api/results/:code/alignments` returns the AI-saved strategic objectives, unchanged in shape.
7. `POST ai/formalize` (single) returns `201` on a valid payload instead of rolling back.
8. `npm test -- --silent` and `npm run lint -- --quiet` green in `server/researchindicators`; coverage stays ≥ 60%.

---

## 15. Next Step

Decisions D-1 … D-4 are recorded. Proceed to:

```text
/akili-specify results/ai-formalize-strategic-objectives
```
