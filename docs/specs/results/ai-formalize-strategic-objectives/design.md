# Design — Results / AI Formalize: Portfolio-Routed Strategic Objectives

- **Module:** results
- **Spec id:** 2026-09-ai-formalize-strategic-objectives
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Depth:** Standard
- **Requirements:** `./requirements.md`
- **Proposal:** `./proposal.md` (decisions D-1 … D-4)
- **Last updated:** 2026-09-02

---

## Executive Summary

The formalizer gains **one new step** and no new architecture. Three pieces make it work:

| Piece | Responsibility | Why it exists |
| --- | --- | --- |
| `PortfoliosService.findByYear(year)` | Answer "which active portfolio covers this year?" from the `portfolios` table, memoized per request | D-1 / NFR-RES-002. The rule belongs in data; the lookup belongs next to the table |
| A **narrow save** on the alignment section handler | Persist *only* strategic objectives, decide per portfolio whether they are supported at all, validate ids against its own portfolio, and report what it discarded | Keeps D-2 and D-3 inside the portfolio that owns them, so the formalizer never branches on a portfolio id. Avoids the section-wide save entirely (R-RES-007) |
| An explicit-portfolio entry point on the orchestrator | Let a non-HTTP caller reach the handler registry without request-scoped portfolio state | R-RES-008. `PortfolioUtil` is `REQUEST`-scoped and one batch carries N years |

The formalizer's own logic stays deliberately thin: resolve the year to a portfolio, call the orchestrator, translate the returned report into `missing_fields`. It contains **no** `if (portfolio === 1)`.

**Wiring is already in place.** `ResultsModule` already imports `PortfolioHandlersModule`, `PortfoliosModule` and `ResultStrategicObjectivesModule` (`results.module.ts:50,87,88`). Only `StrategicObjectivesModule` needs adding, and only to `PortfolioHandlersModule`.

---

## 1. Goals & Non-Goals

**Goals**

| # | Goal | Requirement |
| --- | --- | --- |
| G-1 | The field is accepted and reaches the persistence layer | R-RES-001 |
| G-2 | Portfolio selection is a pure function of the item's year and the `portfolios` table | R-RES-002, NFR-RES-001 |
| G-3 | Strategic objectives persist through the portfolio's own handler | R-RES-003 |
| G-4 | Unsupported portfolios, unresolvable years and invalid ids degrade to a reported no-write | R-RES-004, R-RES-005, R-RES-006, NFR-RES-003 |
| G-5 | The new path cannot disturb any other alignment table | R-RES-007 |
| G-6 | Per-item isolation across a batch | R-RES-008 |

**Non-goals**

- No migration, no schema change, no seed change.
- No change to the alignment endpoints' request/response contract.
- No new module, no new controller, no new route.
- No transaction redesign of `formalizeResult` (see DD-8).
- No client change.

---

## 2. Architecture

### 2.1 Composition

```text
POST /api/results/ai/formalize          POST /api/results/ai/formalize/bulk
        │                                          │
        │                                          ├── per item ──┐
        ▼                                          ▼              │
ResultsService.formalizeResult(result, isBulk?, metadataSink?)     │
        │                                                          │
        ├── createResultFromAiRoar ──► ResultAiDto                 │
        │     (carries strategic_objectives through)               │
        │                                                          │
        ├── createResult / updateGeneralInfo / sdgs / ipRights      │
        │   / geoLocation / partners / evidences / indicator block  │
        │                                                          │
        └── NEW: alignment step ─────────────────────────────┐     │
                                                             │     │
              PortfoliosService.findByYear(item year)        │     │
                        │  (memoized per request)            │     │
                        ▼                                    │     │
              portfolioId | null ──── null ──► report only ──┤     │
                        │                                    │     │
                        ▼                                    │     │
              ResultSectionOrchestratorService                │     │
                .saveStrategicObjectivesForPortfolio(         │     │
                   resultId, portfolioId, ids)                │     │
                        │                                    │     │
                        ▼                                    │     │
              AlignmentHandlerRegistry.get(portfolioId)       │     │
                        │                                    │     │
            ┌───────────┴───────────┐                        │     │
            ▼                       ▼                        │     │
   Portfolio1AlignmentHandler  Portfolio2AlignmentHandler     │     │
   → unsupported (D-2)         → validate vs own portfolio    │     │
                                 → ResultStrategicObjectives  │     │
                                    Service.create(ALIGNMENT) │     │
                        │                                    │     │
                        ▼                                    │     │
              StrategicObjectivesSaveReport ─────────────────┘     │
                { supported, saved[], discarded[] }                │
                        │                                          │
                        ▼                                          │
              missing_fields entries on this item's metadata ──────┘
```

The **request-scoped** path (`PATCH`/`GET .../alignments`) keeps using `resolvePortfolioId()` + `saveAlignment` untouched. The two entry points share the registry and the handlers; they do not share portfolio resolution.

### 2.2 Reuse

Everything below already exists and is reused as-is:

| Existing element | Reused for |
| --- | --- |
| `AlignmentHandlerRegistry` (`portfolio-handlers/sections/alignment/`) | portfolio → handler lookup; no change to the registry itself |
| `ResultStrategicObjectivesService.create(...)` (extends `BaseServiceSimple`) | the actual row write, with audit and role scoping |
| `ResultStrategicObjectiveRolesEnum.ALIGNMENT` (= 1) | the role, identical to the `PATCH` path |
| `StrategicObjectivesService` | id ownership/activeness validation (D-3) |
| `CreateBulkUploadResultsDto.missing_fields` (`json` / `string[]`, nullable) | the reporting channel; no schema change |
| `full_delete_result_version` as redefined by migration `1783029013035` | item rollback — it **does** delete `result_strategic_objectives` (see DD-6) |
| `LoggerUtil` / `CgiarLogger` | warn lines for every discard |

**Nothing** in `ResultAlignmentOperationsService` is called by the new path. That is a hard boundary, not a preference — see DD-1.

### 2.3 DI scope facts that constrain the design

`CurrentUserUtil` is declared `@Injectable({ scope: Scope.REQUEST })`. Nest scope bubbling therefore makes every consumer request-scoped, including `ResultsService`, `PortfoliosService` and `StrategicObjectivesService`. Two consequences:

1. **Memoizing the year → portfolio map in `PortfoliosService` is per-request and safe** — the cache cannot outlive the batch or leak between users (NFR-RES-002).
2. **`PortfolioUtil` is also request-scoped and shared by the whole batch**, which is precisely why the new orchestrator entry point takes the portfolio as an argument instead of reading it (DD-3 / R-RES-008).

---

## 3. Data Model

No schema change. Read and write targets:

| Table | Access | Notes |
| --- | --- | --- |
| `portfolios` | read | `start_year <= y AND end_year >= y AND is_active = 1`, `ORDER BY id LIMIT 1` — the same predicate as the `get_portfolio_id_by_result` SQL function |
| `strategic_objectives` | read | filtered by `id IN (...)`, `portfolio_id = <resolved>`, `is_active = 1`. All five seeded rows are `portfolio_id = 2`; portfolio 1 has none |
| `result_strategic_objectives` | write | `result_id`, `strategic_objective_id`, `role_id = 1`, plus `AuditableEntity` columns |
| `bulk_upload_results.missing_fields` | write | `json` column, `string[]`, nullable — appended to, never replaced |

Untouched by the new path, and asserted so: `result_contracts`, `result_sdgs`, `result_levers`, `result_lever_strategic_outcomes`, `result_lever_sdg_targets`, `result_impact_outcomes`.

---

## 4. API Surface

No new endpoint, no version bump. Both handlers stay unversioned — URI versioning is enabled with no `defaultVersion` (`main.ts:53-56`) and neither declares `@Version(...)`, so `/api/results/ai/formalize[/bulk]` is the reachable form (NFR-RES-004).

| Endpoint | Change |
| --- | --- |
| `POST /api/results/ai/formalize` | body gains one optional property; guards, roles and response shape unchanged. Starts actually succeeding (R-RES-009) |
| `POST /api/results/ai/formalize/bulk` | body gains the same property via `RootAi.results[]`; `@Roles`, `RolesGuard`, `@ApiBody({ type: RootAi })` and response shape unchanged |

DTO change is confined to `ResultRawAi` in `src/domain/entities/results/dto/result-ai.dto.ts`: one optional numeric-array property with `@IsOptional`, `@IsArray`, `@IsNumber({}, { each: true })` and `@ApiProperty`. `whitelist: true` then carries it through instead of stripping it, and `forbidNonWhitelisted` stops rejecting it.

---

## 5. Workflows & Business Rules

### 5.1 The alignment step, in order

| Step | Rule | Requirement |
| --- | --- | --- |
| 1 | If the incoming list is absent, `null` or empty → **return immediately, call nothing**. No resolver call, no orchestrator call, no report entry | R-RES-007 |
| 2 | Resolve the portfolio from the item's effective year (`result.year ?? current calendar year`) | R-RES-002 |
| 3 | If no active portfolio covers the year → no write; record the field in `missing_fields`; warn once naming the year | R-RES-006 |
| 4 | Otherwise call the orchestrator with the resolved portfolio and the id list | R-RES-003 |
| 5 | The handler for that portfolio reports `supported: false` → no write; record the field in `missing_fields`; warn once | R-RES-004 |
| 6 | The handler validates ids against **its own** portfolio, writes the valid ones (deduplicated) and returns both lists | R-RES-003, R-RES-005 |
| 7 | Any discarded ids → record them in `missing_fields`; warn once listing them | R-RES-005, NFR-RES-003 |
| 8 | A throw from any of the above propagates to the existing `catch`, which compensates via `deleteFullResultById` and — for bulk — records the item as an error and continues | R-RES-003 AC.3 |

Step 1 is load-bearing for the spec's highest-severity requirement: with no ids there is no code path into the handler at all, so the section-wide save is unreachable by construction rather than by care.

### 5.2 `missing_fields` entry format (observable contract)

| Case | Entry appended | Requirement |
| --- | --- | --- |
| Portfolio owns no objectives, or year unresolvable | `strategic_objectives` | R-RES-004, R-RES-006 |
| Specific ids discarded | `strategic_objectives:<id>` — one entry per discarded id | R-RES-005 |

Two distinguishable shapes so a reader can tell "the whole field did not apply" from "these three ids were rejected" (R-RES-005 AC.2). Entries are **appended** to whatever the AI reported in `metadata.missing_fields`; the existing array is never replaced (R-RES-004 AC.3).

### 5.3 Deduplication and ordering

Duplicate ids in the input collapse to one row. `BaseServiceSimple.create` compares on `strategic_objective_id`, so a duplicate would not produce a second row, but the handler deduplicates before calling it so the returned `saved` list matches the rows written (R-RES-005 AC.3).

---

## 6. Frontend (Admin SSR panel) impact

None. No admin page, no React component, no SSR route touched. The STAR client is unaffected: it reads alignment through `GET /api/results/:result-code/alignments`, whose contract does not change.

---

## 7. Integration Impact

| System | Impact |
| --- | --- |
| CLARISA / AGRESSO / TIP / ROAR | none — `strategic_objectives` is ARI-owned reference data, not a CLARISA controlled list, so PRD AC-Controlled-Lists is satisfied without a new vocabulary |
| OpenSearch | none — no `@OpenSearchProperty` added; `result_strategic_objectives` is not projected into the result document by this spec |
| Socket.IO | none — no new event name or payload |
| RabbitMQ / DynamoDB | none |
| CapDev bulk notification (`docs/specs/results/capdev-bulk-upload-notification`) | shares `createResultFromAiBulk` and the `missing_fields` column. The notification stage is not called, moved, or reordered. Its containment `try/catch` around `dispatch` stays exactly where it is |

---

## 8. Security & Authorization

| Concern | Position |
| --- | --- |
| Roles | Unchanged. Bulk keeps `@Roles(TECHNICAL_SUPPORT, CENTER_ADMIN, MEL_REGIONAL_EXPERT)` + `RolesGuard`; the single endpoint keeps JWT-only via `JwtMiddleware` |
| Audit | The write goes through `ResultStrategicObjectivesService` → `BaseServiceSimple`, which stamps `AuditableEntity` columns from `CurrentUserUtil` — identical to every other write in the method |
| Input trust | The id list is never interpolated into SQL. Ids are matched by a parameterized `IN (...)` filtered by the resolved `portfolio_id`, so a caller cannot attach an objective from another portfolio (R-RES-005) |
| Privilege | The new path grants no capability the `PATCH .../alignments` route does not already grant to the same roles |
| Secrets | none touched |

No security review required (no auth, secrets, or role change).

---

## 9. Observability

| Signal | Level | Content |
| --- | --- | --- |
| Portfolio unresolvable for a year | `warn` | result id + the unresolvable year (R-RES-006) |
| Portfolio does not support strategic objectives | `warn` | result id + resolved portfolio id (R-RES-004) |
| Ids discarded | `warn` | result id + resolved portfolio id + the discarded ids (R-RES-005) |
| Rows written | existing `debug`/none | no new success-path log; the rows and `missing_fields` are the record |

One line per item per case — not per id — so a 500-item batch cannot flood the log (NFR-RES-003). Every discard reaches **two** channels: the log for operators and `missing_fields` for the bulk report consumer.

---

## 10. Testing Strategy

Suite: `backend-unit` (Jest, sibling `*.spec.ts`). No E2E suite is added; the bulk endpoint has no existing e2e harness and adding one is out of scope. The DC-9 manual gate substitutes for real-payload coverage.

| Target spec file | Proves | Defect class |
| --- | --- | --- |
| `dto/result-ai.dto.spec.ts` (exists) | the field validates; `[1,"x"]` and `"1,3,5"` fail | R-RES-001 |
| `portfolios.service.spec.ts` (exists) | year → portfolio predicate incl. `is_active = 0` exclusion; memoization call count | DC-5, NFR-RES-002 |
| `portfolio-1-alignment.handler.spec.ts` (exists) | reports `supported: false`, writes nothing | DC-1, R-RES-004 |
| `portfolio-2-alignment.handler.spec.ts` (exists) | writes valid ids at role 1; discards unknown / inactive / foreign-portfolio ids; deduplicates; tolerates absent arrays | R-RES-003, R-RES-005, R-RES-010 |
| `result-section-orchestrator.service.spec.ts` (exists) | the explicit-portfolio entry point never touches `PortfolioUtil` or `ResultsUtil` | DC-1, R-RES-008 |
| `results.service.spec.ts` (exists) | the whole step: routing per item, absent-field inertness, `missing_fields` content, optional metadata sink | DC-1, DC-2, DC-4, R-RES-009 |

**Fixture rule (KZ-004).** The bulk routing fixture uses three items whose `year` **and** `strategic_objectives` list **and** `title` all differ (2025 / 2026 / 2027). A fixture built from identical defaults cannot distinguish per-item routing from a batch-wide constant, and would certify the very bug R-RES-008 exists to prevent.

**Disqualifying conditions** — when the evidence is inconclusive rather than passing:

| Check | The reading is worthless if… |
| --- | --- |
| Mixed-year routing | the fixture items share a year, or share an objective list — then a passing assertion proves nothing about per-item scoping |
| Inertness (R-RES-007) | the assertion checks only that no `result_strategic_objectives` row exists, without asserting `is_active` on the sibling `result_sdgs` / `result_contracts` rows. Absence of the new row is not evidence the old rows survived |
| Memoization count | the test double resolves synchronously without recording calls — a call-count assertion against a stub that cannot count is a tautology |
| Any handler assertion | the double stands in for `ResultStrategicObjectivesService` without modelling the role scoping — then role-correctness is untested however green the suite (KZ-001) |

**Blast radius (KZ-003).** `Portfolio2AlignmentHandler`, `AlignmentHandlerRegistry` and `ResultSectionOrchestratorService` are shared with `PATCH`/`GET /api/results/:result-code/alignments`. Verification is the **full** server suite (`npm test -- --silent`), never a targeted file run — a targeted run confirms the brief was followed, not that the blast radius is clean.

---

## 11. Rollout

| Aspect | Position |
| --- | --- |
| Migration | none |
| Feature flag | none. The behavior activates only when the producer sends the field; an absent field is byte-identical to today (R-RES-007) |
| Deployment precondition | migration `1783029013035` must be applied in the target environment — see DD-6 |
| Deploy order | server only; no client coordination needed |
| Backout | revert the server release. No data migration to undo. Rows already written stay valid and readable through the existing alignment endpoint |
| Producer coordination | the AI extractor can start sending the field the moment the release is live; before it, the field is rejected with `400` as today |

---

## 12. Design Decisions Log

### DD-1 — The AI path uses a narrow save and never reaches the section-wide alignment save

**Decision.** Add a strategic-objectives-only method to the **alignment section** handler contract (`AlignmentSectionHandler`), not to the generic `PortfolioSectionHandler`. The AI path calls only that method.

**Why.** `BaseServiceSimple.create` reconciles a whole `(result_id, role)` set: it deactivates every existing row whose primary key is absent from the incoming array, and an `undefined` payload yields an *empty* array. `ResultAlignmentOperationsService.save` calls it for contracts and SDGs. So routing the AI path through the section save with only `strategic_objectives` populated would deactivate the ALIGNMENT-role contracts **and the SDGs `formalizeResult` wrote moments earlier**. That is R-RES-007's defect, and it is silent — nothing throws.

**Rejected — reuse `Portfolio2AlignmentHandler.save`:** destructive as above, and it demands levers, research areas and impact outcomes the AI payload does not carry.

**Rejected — put the method on `PortfolioSectionHandler`:** strategic objectives are an alignment concept. A future section (say, geoscope) would inherit a method it cannot implement.

*Layering note:* the narrow method is not "the AI method". It is a legitimately narrower operation on the alignment section, which is why it carries no `Ai` in its name and could later serve any caller that wants to set only this sub-section.

### DD-2 — Portfolio resolution lives in `PortfoliosService`, keyed by year, memoized per request

**Decision.** Add `findByYear(year)` to `PortfoliosService`, applying `start_year <= y AND end_year >= y AND is_active = 1`, `ORDER BY id LIMIT 1`. Memoize by year in a private map on the instance.

**Why.** The service already owns the `portfolios` table and `findOne`. `PortfolioUtil.setup()` contains this exact predicate today but reads its input from the HTTP request, so it cannot be reused by a non-HTTP caller. Because `PortfoliosService` is request-scoped via `CurrentUserUtil` bubbling (§2.3), the memo is per-request — satisfying NFR-RES-002 without a shared cache or an invalidation story.

**Rejected — a new standalone util:** a third place holding the same predicate. Two is already one too many; a third guarantees drift.

**Rejected — call the `get_portfolio_id_by_result` SQL function:** it keys off a persisted `results.report_year_id`, which forces the resolution to happen after the result row exists and couples the resolver to raw SQL. It stays the reference for the *predicate*, not the implementation.

**Rejected — a year constant in TypeScript:** violates NFR-RES-001 and D-1. The owner's requirement is explicit that a data change must move the routing.

### DD-3 — The orchestrator gains an explicit-portfolio entry point; request-scoped portfolio state is never mutated

**Decision.** A new orchestrator method takes `(resultId, portfolioId, ids)` and resolves the handler from the given portfolio. It does **not** call `resolvePortfolioId()`, and does not read `portfolioUtil.portfolio` or `resultsUtil.result` — both of whose getters throw when unset, which is exactly the state a formalize request is in.

**Why.** `PortfolioUtil` is `REQUEST`-scoped and one bulk request processes N items with N years (§2.3). Mutating it per item means a throw mid-item leaves the previous item's portfolio in place for the next one — a silent wrong-portfolio write, the failure R-RES-008 exists to prevent. An argument cannot leak.

**Rejected — `PortfolioUtil.setCurrentPortfolio(id)` per item:** the shared-mutable-state hazard above. The method stays for its existing callers; the AI path does not use it.

**Rejected — make the whole orchestrator take an optional portfolio override on `saveAlignment`:** it would let a caller silently bypass request-based resolution on the *section-wide* save too, widening the DD-1 blast radius for no gain.

### DD-4 — Each portfolio owns its own answer to "are strategic objectives supported, and which ids are mine?"

**Decision.** The narrow save returns a small report: whether the portfolio supports the sub-section at all, which ids were saved, and which were discarded. `Portfolio1AlignmentHandler` returns unsupported. `Portfolio2AlignmentHandler` validates against `strategic_objectives` filtered by its own `portfolioId` and `is_active`, then writes.

**Why.** D-2 and D-3 are portfolio rules. Encoding them as `if (portfolioId === PORTFOLIO_1)` in `ResultsService` would put a portfolio rule outside the portfolio abstraction the module exists to provide — and would be wrong the day portfolio 1 gains a strategic objective, or a portfolio 3 appears. The requirement is deliberately written against *"owns no active objectives"*, not *"is portfolio 1"* (requirements §7), and the handler is the only place that distinction can be made honestly.

**Consequence:** `ResultsService` contains no portfolio branching. It translates a report into `missing_fields` and log lines — a formatting job (§5.2), which is correctly the caller's.

### DD-5 — Reporting formatting lives in the caller, decisions live in the handler

**Decision.** The handler decides *what happened*; `formalizeResult` decides *how it is reported* (the `missing_fields` string shapes of §5.2 and the warn lines of §9).

**Why.** `missing_fields` belongs to the bulk-upload reporting model (`CreateBulkUploadResultsDto`), which the portfolio handlers know nothing about and should not. Injecting the metadata sink into a handler would couple the alignment section to the AI reporting pipeline and break the `PATCH` path's reuse of the same handler.

### DD-6 — Item rollback relies on `full_delete_result_version` as redefined by migration `1783029013035`; that is a deployment precondition

**Decision.** No new rollback logic. The existing compensating delete in the `catch` covers the new rows.

**Why, with the checked evidence.** `result_strategic_objectives.result_id` references `results.result_id` with **`ON DELETE NO ACTION`** (migration `1782486943935`). Three migrations define `full_delete_result_version`; the **older** definition (`1778510205765`) predates the table and does not delete from it, but the **current** definition (`1783029013035`) does delete `result_strategic_objectives` and `result_impact_outcomes` before deleting the `results` row. So the rollback is complete — on a schema at or past `1783029013035`.

**The failure mode if that precondition is unmet.** On an environment stuck before `1783029013035`, the compensating delete would hit FK error 1451. That throw happens *inside* the `catch` block, where `deleteFullResultById` is awaited without its own `try` — so it would propagate out of `formalizeResult`, out of the per-item loop in `createResultFromAiBulk`, and abort the **entire batch**, skipping the remaining items and the notification dispatch. This is latent today only because the formalizer writes no strategic objectives; this change activates it.

**Rejected — wrapping the compensating delete in its own `try/catch`:** it would convert a batch-abort into a silent orphan-row leak, trading a loud failure for a quiet data-integrity one. The right control is the migration precondition, verified once at rollout (§11), and recorded as RK-6.

### DD-7 — The metadata sink becomes optional rather than the single endpoint acquiring its own collector

**Decision.** `formalizeResult`'s third parameter stays optional and is treated as optional at both `push` sites. The single endpoint keeps passing nothing.

**Why.** The single endpoint's contract has no bulk report to fill — `CreateBulkUploadResultsDto` exists for the bulk process. Handing it a throwaway array to satisfy an unguarded `push` would encode the defect as a requirement of every caller. Guarding the two `push` sites fixes R-RES-009 with no change to bulk reporting.

**Not a reversion.** This adds tolerance where code previously threw; it removes no delivered behavior. Genuine failures still roll back and rethrow (R-RES-009 AC.2). No Step 2.3 reversion challenge is triggered by this or any other DD in this spec — every change is additive or tolerance-widening.

### DD-8 — The new write joins the existing per-call transaction model, not a new item-level transaction

**Decision.** The narrow save runs in its own transaction like every other step of `formalizeResult`. No `EntityManager` is threaded through from the formalizer.

**Why.** `formalizeResult` already performs ~8 independent writes, each in its own transaction, and relies on a *compensating* delete for atomicity rather than a single enclosing transaction. Introducing one item-level transaction for only the new step would produce a partially-transactional method — the worst of both models, and a change to rollback semantics nobody asked for. The handler contract still accepts a manager, so the `PATCH` path's enclosing transaction keeps working unchanged.

**Accepted consequence:** between the alignment write and a later failure there is a window where rows exist for a result that will be deleted. The compensating delete closes it (DD-6). This matches the existing behavior for SDGs, partners and evidence.

---

## 13. Budget (Step 2.4 tripwire)

Estimated from the design above, for `/akili-execute` to trip against:

| Metric | Estimate |
| --- | --- |
| Tasks | **7** |
| Production LOC | **~250** |
| Test LOC | **~250** |
| Total LOC | **~500** |
| Review rounds | **2** |

Depth re-check: the estimate matches the declared **Standard** depth — 7 tasks across 6 files with two high-severity constraints is above Lite and well below Full (no migration, no auth, no cross-package work). Depth stands.

Where the two review rounds are expected to be spent: R-RES-007 (proving the section-wide save is unreachable, not merely unused) and R-RES-008 (proving per-item routing with a fixture that can actually fail). Exceeding this budget is information — the Leader escalates rather than continuing.

---

## 14. Open Questions

None blocking. Carried from `requirements.md` §12:

| # | Item | Owner | Target |
| --- | --- | --- | --- |
| Q-1 | Confirm `strategic_objectives` rows and their `portfolio_id` ownership in Dev (DC-8) | D. Casañas | before implementation |
| Q-2 | Confirm the producer's real payload shape for the field (A-1 / DC-9) | D. Casañas | before the validation verdict |
| RK-6 | Confirm migration `1783029013035` is applied in every target environment (DD-6) | D. Casañas | before rollout |

---

## 15. References

| Reference | Relevance |
| --- | --- |
| `./requirements.md` | the behavior this design implements |
| `./proposal.md` §10, §12 | rejected options and decisions D-1 … D-4 |
| `server/researchindicators/src/domain/entities/results/portfolio-handlers/README.md` | the handler module's declared intent, which this design follows |
| `docs/trd/trd.md` | server architecture baseline; no ADR superseded by this spec |
| `CLAUDE.md` §4.1 | routing/versioning reality (`/api/...`, no `defaultVersion`) |
| `docs/specs/kaizen-log.md` | KZ-001 (double fidelity), KZ-003 (blast radius), KZ-004 (fixture discriminating power), KZ-005 (rules belong in requirements), KZ-006 (sweep the claim), KZ-007 (exercise the product first) |
