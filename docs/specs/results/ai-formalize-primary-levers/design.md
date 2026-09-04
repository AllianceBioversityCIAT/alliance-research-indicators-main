# Design — Results / AI Formalize: Portfolio-Routed Primary Levers

- **Module:** results
- **Spec id:** 2026-09-ai-formalize-primary-levers
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Depth:** Standard
- **Requirements:** `./requirements.md` · **Proposal:** `./proposal.md`
- **Citation convention:** `[SO] R-RES-NNN` = predecessor spec · bare `R-RES-NNN` = this spec (`requirements.md` §2)
- **Last updated:** 2026-09-04 *(R-RES-007 AC.2 amended — Pivot, T-03)*

---

## Executive Summary

The formalizer gains **one more step and no new architecture**. Everything structural was built and reviewed by the predecessor spec; this design reuses it and adds three small pieces:

| Piece | Responsibility | Why it exists |
| --- | --- | --- |
| `ClarisaLeversService.findActiveByIdsForPortfolio(ids, portfolioId)` | Answer "which of these lever ids are active and mine?" in one query | R-RES-005. The service has `findAllWithPortfolio(portfolioId?)` — portfolio-scoped but with **no id filter** — so the predicate is currently unreachable |
| A second **narrow save** on the alignment handler contract | Persist only levers, in the portfolio's own terms, and report what it discarded | R-RES-003, R-RES-004. Keeps the portfolio-specific meaning inside the portfolio (DD-2) and avoids the section-wide save entirely (DD-1) |
| A second explicit-portfolio entry point on the orchestrator | Let the formalizer reach the registry without request-scoped state | R-RES-009. Mirrors the shipped `saveStrategicObjectivesForPortfolio` exactly |

**What is free.** `PortfoliosService.findByYear` is already built and memoized per request, so this spec does **no resolver work at all**. The `missing_fields` entry format, the step-1 guard pattern, the warn discipline and the `resultMetadata?.push` guard are all shipped and reviewed — copied, not designed.

**The one structural difference from the predecessor.** There, portfolio 1 was a stub reporting `supported: false`. Here **both portfolios write**, at different roles, so there is no `supported` concept at all — which removes the predecessor's most expensive obligation (its `supported === false` terminating branch consumed a full review round) and replaces it with a second real write path.

---

## 1. Goals & Non-Goals

**Goals**

| # | Goal | Requirement |
| --- | --- | --- |
| G-1 | The field is accepted and reaches the persistence layer | R-RES-001 |
| G-2 | Portfolio selection is a pure function of the item's year and the `portfolios` table | R-RES-002 |
| G-3 | Each portfolio persists the ids in its own terms | R-RES-003, R-RES-004 |
| G-4 | Unowned ids and unresolvable years degrade to a reported no-write | R-RES-005, R-RES-006 |
| G-5 | The write cannot reach a row it did not create | R-RES-007 |
| G-6 | The new path is inert when the field is absent | R-RES-008 |
| G-7 | Per-item isolation across a batch | R-RES-009 |
| G-8 | The two AI alignment fields compose | R-RES-010 |

**Non-goals**

- No migration, no schema change, no seed change.
- No change to the alignment endpoints' request/response contract.
- No new module, no new controller, no new route.
- No transaction redesign of `formalizeResult` — `[SO] DD-8` stands.
- No refactor of `ResultAlignmentOperationsService` or either portfolio's section-wide `save`.
- No client change.
- No writing of `contributor_levers`.

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
        ├── createResultFromAiRoar ──► carries primary_levers      │
        │                              through, alongside          │
        │                              strategic_objectives         │
        │                                                          │
        ├── createResult / … / strategic-objectives step (shipped)  │
        │                                                          │
        └── NEW: levers step ───────────────────────────────┐      │
                                                            │      │
              PortfoliosService.findByYear(item year)       │      │
                        │  (shipped, memoized per request)  │      │
                        ▼                                   │      │
              portfolioId | null ──── null ──► report only ─┤      │
                        │                                   │      │
                        ▼                                   │      │
              ResultSectionOrchestratorService               │      │
                .saveLeversForPortfolio(                     │      │
                   resultId, portfolioId, ids)               │      │
                        │                                   │      │
                        ▼                                   │      │
              AlignmentHandlerRegistry.get(portfolioId)      │      │
                        │                                   │      │
            ┌───────────┴───────────┐                       │      │
            ▼                       ▼                       │      │
   Portfolio1AlignmentHandler  Portfolio2AlignmentHandler    │      │
   → validate vs portfolio 1   → validate vs portfolio 2     │      │
   → role ALIGNMENT (1)        → role RESEARCH_AREAS_        │      │
     is_primary = true           ALIGNMENT (3)               │      │
                        │                                   │      │
                        ▼                                   │      │
              LeversSaveReport ────────────────────────────┘       │
                { saved[], discarded[] }                           │
                        │                                          │
                        ▼                                          │
              missing_fields entries on this item's metadata ──────┘
```

The **request-scoped** path (`PATCH`/`GET .../alignments`) keeps `resolvePortfolioId()` + `saveAlignment` untouched. The two entry points share the registry and the handlers; they do not share portfolio resolution.

### 2.2 Reuse

Everything below exists and is reused as-is:

| Existing element | Reused for |
| --- | --- |
| `PortfoliosService.findByYear(year)` | year → portfolio, memoized per request. **No change** |
| `AlignmentHandlerRegistry` | portfolio → handler lookup. **No change** |
| `ResultLeversService.create(...)` (extends `BaseServiceSimple`, role column `lever_role_id`) | the row write, with audit and role scoping |
| `LeverRolesEnum.ALIGNMENT` (1), `LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT` (3) | the two roles |
| `CreateBulkUploadResultsDto.missing_fields` | the reporting channel; no schema change |
| `full_delete_result_version` as redefined by migration `1783029013035` | item rollback — it deletes `result_levers` |
| `LoggerUtil` / `CgiarLogger` | one warn per item per case |
| The shipped step-1 guard, report translation and `resultMetadata?.push` guard in `formalizeResult` | the new step's skeleton |

**Nothing in `ResultAlignmentOperationsService` is called by the new path.** That is a hard boundary inherited from `[SO] DD-1`, not a preference.

### 2.3 Facts that constrain this design

1. **`formalizeResult` has no update path.** It always calls `createResult` and assigns the result to `resultExists` purely as a rollback handle (`results.service.ts:879-901`). The result reaching the alignment step is milliseconds old, so **no `result_levers` row can pre-exist for it** — this is why R-RES-007 is satisfied by construction (DD-6).
2. **Reconciliation in `BaseServiceSimple.create` scopes by `(result_id, role)`** and deactivates every row for that pair absent from the incoming array. Two consequences: the two portfolios' writes are **mutually inert** (role 1 vs role 3), and within role 1 a primary-only array would wipe contributors — see DD-6.
3. **`is_primary` is `NOT NULL` with a database default of `false`.** Omitting it writes a valid row with the wrong meaning (DD-5).
4. **`CurrentUserUtil` is request-scoped**, which bubbles to every consumer. The memoized `findByYear` cache is therefore per-request and cannot leak between users — inherited, unchanged.

---

## 3. Data Model

No schema change. Read and write targets:

| Table | Access | Notes |
| --- | --- | --- |
| `result_levers` | **write** | `result_id`, `lever_id`, `lever_role_id`, `is_primary` all `NOT NULL`; `is_primary` defaults to `false`. `custom_lever_name` nullable, **not written by this path** |
| `clarisa_levers` | read | Validation source. `portfolio_id` nullable FK; `is_active` inherited from `AuditableEntity` |
| `portfolios` | read | Via the shipped `findByYear` |
| `bulk_upload_results` | write | `missing_fields` only |
| `result_lever_strategic_outcomes`, `result_lever_sdg_targets` | **neither read nor written** | Nested children a plain id array cannot express — Q-1 |

**Reference data.** `clarisa_levers` ids 10–17 carry `portfolio_id = 2` (`1782402733402-InsertNewResearchAreas`); legacy ids were set to `portfolio_id = 1` (`1782337004400-AddedPortfolioIdClarisaLevers`). **No id range is hardcoded anywhere in this design** — the predicate asks the table, so a reference-data change moves the routing with no release (R-RES-002 AC.3).

---

## 4. API Surface

| Endpoint | Change |
| --- | --- |
| `POST /api/results/ai/formalize` | one new optional body field, `results[].primary_levers?: number[]` |
| `POST /api/results/ai/formalize/bulk` | same |

No new route, no new controller, no version segment. **Both handlers are mounted unversioned** — URI versioning is enabled with no `defaultVersion` and neither declares `@Version(...)`, so `/api/v1/...` returns `404` (NFR-RES-003). Response envelope unchanged.

---

## 5. Workflows & Business Rules

### 5.1 The levers step, in order

| Step | Rule | Requirement |
| --- | --- | --- |
| 1 | If the incoming list is absent, `null` or empty → **return immediately, call nothing.** No resolver call, no orchestrator call, no report entry | R-RES-008 |
| 2 | Resolve the portfolio from the item's effective year (`result.year ?? current calendar year`) | R-RES-002 |
| 3 | If no active portfolio covers the year → no write; record the field in `missing_fields`; warn once naming the year. **No fallback portfolio** | R-RES-006 |
| 4 | Otherwise call the orchestrator with the resolved portfolio and the id list | R-RES-003, R-RES-004 |
| 5 | The handler validates the ids against **its own** portfolio, deduplicates, writes the survivors **in its own role and flags**, and returns both lists | R-RES-003, R-RES-004, R-RES-005 |
| 6 | Any discarded ids → record one entry per id; warn once listing them | R-RES-005, NFR-RES-002 |
| 7 | A throw from any of the above propagates to the existing `catch`, which compensates via `deleteFullResultById` and — for bulk — records the item as an error and continues | R-RES-009 |

**Step 1 is load-bearing for the spec's highest-severity requirement**, exactly as in the predecessor: with no ids there is no code path into the handler at all, so the section-wide save is unreachable by construction rather than by care.

**There is no `supported` step.** The predecessor's step 5 (`supported: false` → terminate) has no analogue: both portfolios support the field. This removes the predecessor's most expensive forward obligation and its whole class of "both `missing_fields` shapes at once" defect.

### 5.2 `missing_fields` entry format (observable contract)

| Case | Entry appended | Requirement |
| --- | --- | --- |
| Year unresolvable | `primary_levers` | R-RES-006 |
| Specific ids discarded | `primary_levers:<id>` — one per discarded id | R-RES-005 |

Two distinguishable shapes, identical in structure to the shipped `strategic_objectives` pair, so a reader can tell "the field did not apply" from "these ids were rejected". Entries are **appended** to whatever the AI reported; the existing array is never replaced.

### 5.3 Deduplication and ordering

Duplicate ids collapse to one row. The handler deduplicates **before** calling `create`, so the returned `saved` list matches the rows written (R-RES-003 AC.4, R-RES-004 AC.4).

### 5.4 Ordering relative to the shipped strategic-objectives step

The levers step runs **adjacent to** the strategic-objectives step, both inside the existing `try` and both **above** `customStatus`. Position above `customStatus` is required, not merely convenient: `customStatus` on `APPROVED` calls `createSnapshot`, and migration `1783029013035`'s versioning routine copies `result_levers` into the new version — a step placed below it would silently omit levers from an approved item's snapshot. *(Discovered by the predecessor's data-loss review lens; recorded here so it is not re-derived.)*

The two steps are **order-independent** in outcome (R-RES-010 AC.3) because they write different tables at different roles.

---

## 6. Frontend / UX impact

None. No admin page, no React component, no SSR route. The STAR client is unaffected: it reads alignment through `GET /api/results/:result-code/alignments`, whose contract does not change.

---

## 7. Integration Impact

| System | Impact |
| --- | --- |
| `PATCH`/`GET .../alignments` | **None.** Request-based resolution and the section-wide save untouched. Both handlers gain a method; neither loses one |
| OpenSearch | None — no `@OpenSearchProperty` column added |
| Socket / broker / Agresso / CLARISA sync / TIP | None |
| **`docs/specs/results/ai-formalize-strategic-objectives`** | **`[SO] R-RES-007` must be amended** — its scenario clause and AC.1 both name `result_levers` and stop being true once this spec writes lever rows. AC.1 is currently ticked as proven by that spec's T-06. Owned by T-07, with the two-direction Correction Closure sweep |

---

## 8. Security & Authorization

Unchanged. The AI-formalize handlers keep their existing `@Roles(...)` and `ResultStatusGuard` wiring; this spec adds no endpoint and no role. Audit columns are populated from `request.user` through `BaseServiceSimple`'s unconditional `CurrentUserUtil.audit(SetAuditEnum.BOTH)` — the same mechanism the `PATCH` path uses, which is why R-RES-003 AC.3 / R-RES-004 AC.3 are satisfied by the shared write primitive rather than by new code.

---

## 9. Observability

One `warn` per item per case, each carrying the result id (NFR-RES-002):

| Case | Line content |
| --- | --- |
| Year unresolvable | result id + the effective year |
| Ids discarded | result id + the resolved portfolio id + the discarded ids joined into **one** line |

Never one line per id. `LoggerUtil` / `CgiarLogger` only — no `console.*`.

**A degraded write is visible in two channels**, the report and the log, so an item's outcome can be reconstructed afterwards. The single endpoint is the exception: it passes no metadata sink, so its degradations are log-only — inherited from `[SO] DD-7` and unchanged here.

---

## 10. Testing Strategy

Same evidence standard as the predecessor, which caught three defects before review.

| Concern | Approach |
| --- | --- |
| **Double fidelity** *(KZ-001, recurrence 5)* | The `findByYear` double must route by year (a year→portfolio map), never a constant. The lever-finder double must evaluate the **three-part** predicate — id, portfolio ownership, active — or DC-3 goes untested. The persistence double must record `lever_role_id` **and** `is_primary` per row, or DC-1 and DC-2 are untestable |
| **Discriminating fixtures** *(KZ-004)* | A mixed-year fixture varies year **and** ids **and** title per item, with disjoint id sets, asserted per `result_id`. Shared defaults cannot distinguish per-item routing from a batch-wide constant |
| **Value assertions, not presence** | `is_primary` and `lever_role_id` are asserted **by value** on every written row. A test asserting only "a row exists for lever 11" is explicitly disqualified (R-RES-003 AC.2) |
| **Falsifier probes** | Every acceptance clause needs a case that provably goes red. Three are named in `tasks.md`: batch-wide portfolio resolution, an implementation that reads or widens what it hands the reconciler (R-RES-007 AC.2, amended 2026-09-04), and an omitted `is_primary` |
| **Blast radius** *(KZ-003)* | Both handlers, the registry and the orchestrator are shared with `PATCH`/`GET .../alignments`. A targeted run confirms the brief was followed, not that the shared chain is clean — T-07 runs the full package with a coverage figure |
| **Human gate** *(KZ-007)* | Q-3 and Q-4 need a real mixed-year upload against Dev **before** any validation verdict. An automated gate verifies the system against the spec's own description of itself |

---

## 11. Rollout

- **No migration.** But migration `1783029013035` must be applied wherever this deploys: `full_delete_result_version` must delete `result_levers`, or the compensating delete hits FK 1451 from inside the `catch` and aborts the whole batch. Same rollout precondition as the predecessor's RK-6, and it is **still open**.
- **Backward compatible.** The field is optional; a payload omitting it behaves exactly as today (R-RES-008).
- **No feature flag.** The behavior is additive and reported; a flag would add a branch with no rollback benefit.
- **Rollback:** revert the commit. No data migration to undo. Rows already written remain valid `result_levers` rows reachable through the normal `PATCH`/`GET` path.

---

## 12. Design Decisions Log

### DD-1 — The AI path uses narrow saves and never reaches the section-wide alignment save

**Decision.** The levers step calls a lever-only handler method. `ResultAlignmentOperationsService` is never invoked from this path.

**Why.** The section-wide save reconciles by deactivating every row for `(result_id, role)` absent from the incoming payload. Reaching it with a levers-only payload would wipe the SDGs and contracts the same method wrote moments earlier. This is `[SO] DD-1` inherited verbatim, and it is the reason `[SO] R-RES-007` AC.4 survives this spec unchanged and matters *more*: there are now two narrow writes, and both must avoid it.

**Rejected.** Populating `ResultAlignmentDto` and calling `handler.save(...)` — rejected outright in `proposal.md` Option C.

---

### DD-2 — Each portfolio owns its own answer to what a "primary lever" is

**Decision.** The handler contract exposes one method; the two implementations differ. Portfolio 1 writes `lever_role_id = ALIGNMENT (1)` with `is_primary = true`. Portfolio 2 writes `lever_role_id = RESEARCH_AREAS_ALIGNMENT (3)`. **The formalizer contains no branch on a portfolio id.**

**Why.** The extractor emits one portfolio-agnostic field name, and the two portfolios genuinely disagree about its meaning — portfolio 2's own section save deliberately discards `primary_levers` and writes `research_areas` instead. Putting the mapping in the formalizer would place portfolio knowledge in the one component that must not have it. This is `[SO] DD-4` applied to a case that fits it even better than the original.

**Consequence.** An `if` on a portfolio id appearing in `results.service.ts` means the implementation is wrong, not merely inelegant — the same tripwire the predecessor used.

---

### DD-3 — The narrow save takes `(resultId, ids)` and no context

**Decision.** `saveLevers(resultId: number, ids: number[])`, mirroring the shipped `saveStrategicObjectives`. No `PortfolioHandlerContext`, no `EntityManager`.

**Why.** The predecessor froze this signature during execution and its reviewers confirmed the payoff: with no context to build, `[SO] DD-3` (no request-scoped reads) and `[SO] DD-8` (no threaded transaction) hold **by construction** rather than by discipline, and a caller-supplied `portfolioId` diverging from the handler's own `readonly portfolioId` is unrepresentable. Adopting the same shape costs nothing and inherits the same guarantees.

**Consequence.** The step runs in its own transaction like every other write in `formalizeResult` — no partially-transactional method (`[SO] DD-8`).

---

### DD-4 — Id validation is one query in the reference-data service, not an in-memory filter

**Decision.** Add `findActiveByIdsForPortfolio(ids, portfolioId)` to `ClarisaLeversService`. The handler passes its **own** `portfolioId`; everything not returned is discarded.

**Why.** The three discard causes — unknown id, inactive id, foreign portfolio — collapse into one predicate: `id IN (…)` AND `portfolio_id = mine` AND `is_active = true`. The service today has `findAllWithPortfolio(portfolioId?)` with no id filter, so the predicate is unreachable; loading a portfolio's whole lever set and filtering in memory would work but puts a data rule in a handler and scales with the catalogue.

**Precedent.** `StrategicObjectivesService` had the identical gap and the predecessor closed it the same way, as an authorized deviation discovered mid-execution. **Here it is authorized up front** (task T-02) so it is not rediscovered.

---

### DD-5 — `is_primary` is written explicitly on every row, never left to the column default

**Decision.** Every row the portfolio-1 path writes carries `is_primary: true` explicitly, and `is_primary` is included in the fields `create` is told to update.

**Why.** The column is `NOT NULL` with a database default of `false`. A write that omits it therefore **succeeds** and produces a *contributor* lever where a primary was intended — no exception, no unusual row count, no `missing_fields` entry, and a row-presence test passes. This is defect class **DC-1** and the reason R-RES-003 AC.2 is written as a value assertion.

**Consequence for tests.** The persistence double must record `is_primary` per row. A double that ignores it makes this decision unverifiable *(KZ-001)*.

---

### DD-6 — Inertness toward rows the write did not create is satisfied by construction, and proven anyway

**Decision.** The portfolio-1 handler hands `create` **only** its own primary rows. It does **not** read existing levers and merge them.

**Why that is safe.** `formalizeResult` has no update path (§2.3 fact 1): the result is created milliseconds earlier in the same method, so there are no pre-existing lever rows to preserve. A read-merge-write would be dead code justified by a state that cannot occur, and it would add a query per item.

**Why the guarantee is still tested.** Within role `ALIGNMENT (1)`, primary and contributor levers **share the role** — `is_primary` distinguishes them, not the role — so a primary-only reconciliation *would* wipe contributors if such rows ever existed. The safety therefore rests on an incidental fact about a method this spec does not own.

**Amended 2026-09-04 (Pivot, T-03).** R-RES-007 AC.2 originally required a double reporting a pre-existing contributor row to show that row **still active** afterwards. Execution proved that unachievable: `BaseServiceSimple.create` deactivates every `(result_id, role)` row absent from the persisted set (`base-service.ts:174-189`), so *any* implementation handing the reconciler only the survivors — which this design mandates — deactivates it. AC.2 now asserts the **handler-boundary** property instead: exactly the survivor rows are handed over, `result_levers` is never queried, and no deactivation is issued by the handler. Same-role survival is carried by the unreachability argument above and stays open as **RK-2 / RB-2**; it is not claimed as tested. Portfolio 2's role-3 write keeps the stronger, directly assertable guarantee. The rejected alternative — reading pre-existing role-1 rows and passing them as `create`'s `notDeleteIds` (shipped precedent: `result-actors.service.ts:62-84`) — would close the hazard defensively but widens this design; see `execution.md` → *Pivot Record: T-03*.

**Precedent.** The predecessor's ban on request-scoped reads was also unreachable by construction and was still proven with doubles whose getters throw. Same treatment, same reason.

**Superseded assumption.** This decision retired assumption A-2 and closed question Q-2 in `requirements.md`, both of which presumed contributor levers could pre-exist.

---

### DD-7 — `lever_id` is written as the entity models it, and the type defect is left alone

**Decision.** Pass the numeric id through to `lever_id`, matching what the shipped portfolio-2 research-areas path does. **Do not** clean the entity's type modelling in this spec.

**Why.** `result_levers.lever_id` is a `bigint` column declared `lever_id!: string` on the entity, and the existing code casts with `parseInt(x) as unknown as string`. The modelling is wrong, but correcting it touches every lever consumer — the section save, the `GET` view, OpenSearch mapping, TIP integration — none of which this spec is scoped to change. Replicating the existing convention keeps the new path consistent with the old one; a local-only cleanup would make the two paths disagree about the same column.

**Recorded as debt**, not fixed: `proposal.md` R-3.

---

### DD-8 — The handler reports; the caller formats

**Decision.** The narrow save returns `{ saved: number[], discarded: number[] }`. The handler never learns about `missing_fields`.

**Why.** `[SO] DD-5` inherited. Reporting format is a property of the bulk-upload contract, not of a portfolio's alignment rules. The report carries no `supported` flag because, unlike the predecessor, both portfolios support the field (§5.1).

---

### DD-9 — Portfolio 2 writes at role 3 directly, not through its own `research_areas` payload path

**Decision.** The portfolio-2 narrow save calls `ResultLeversService.create(...)` at `RESEARCH_AREAS_ALIGNMENT` itself, rather than constructing a `research_areas` payload and delegating to its section `save`.

**Why.** Delegating would run the whole section save, which is precisely what DD-1 forbids. The narrow method reuses the same **write primitive and role** its section path uses, so the rows are indistinguishable from manually-entered ones — without inheriting the section save's reconciliation of every other sub-array.

---

### DD-10 — The unguarded `research_areas` map is hardened, as a scoped exception

**Decision.** Treat an absent/`null` `research_areas` array as empty inside the existing portfolio-2 section `save`. Scope is one expression; the OICR / indicator gates around it stay byte-identical.

**Why.** `payload?.research_areas?.map(...)` currently yields `undefined` when the key is absent, which is then handed to `create` — the same shape as the empty-survivor wipe that could deactivate every research area for the result. The predecessor's `[SO] R-RES-010` hardened exactly this pattern for `strategic_objectives` and `impact_outcomes` and **left `research_areas` out**, so the gap is a known omission rather than a new discovery.

**Why in scope at all**, given `proposal.md` listed it out of scope: this spec's tasks edit that exact method to add the narrow save. Leaving a known wipe hazard in a method the spec is already opening, one line from the new code, trades a one-expression fix for a latent data-loss bug. **This widening is deliberate and recorded here for the owner to overrule** — it is the only place this design exceeds the proposal's stated scope.

**Not a reversion.** It adds a guard; it removes nothing.

---

### Step 2.3 — Reversion challenge: not triggered

No decision in this log removes, disables, or inverts behavior the codebase already ships. DD-10 **adds** a guard; DD-7 deliberately **declines** to change existing behavior; every other decision adds a new path alongside the old one. The challenge is therefore recorded as not applicable rather than skipped silently.

---

## 13. Budget (Step 2.4 tripwire)

**Priced on the corrected basis from day one** — the predecessor's budget was wrong twice because it assumed test code runs ~1:1 against production. Measured across its seven tasks the real ratio is **~6:1** (258 production, 1,633 test). This estimate uses that measured basis, per **KZ-008**.

| Task | Prod LOC | Test LOC | Total |
| --- | --- | --- | --- |
| T-01 DTO field | ~12 | ~78 | ~90 |
| T-02 `ClarisaLeversService` finder | ~25 | ~90 | ~115 |
| T-03 handler contract + **both** handlers | ~130 | ~380 | ~510 |
| T-04 orchestrator entry point | ~25 | ~140 | ~165 |
| T-05 formalizer wiring | ~55 | ~450 | ~505 |
| T-06 routing / inertness / composition specs | 0 | ~420 | ~420 |
| T-07 full gate + `[SO] R-RES-007` amendment | ~5 | 0 | ~5 |
| **Total** | **~252** | **~1,558** | **~1,810** |

| Metric | Estimate |
| --- | --- |
| Tasks | **7** |
| Production LOC | **~252** |
| Test LOC | **~1,558** |
| Total LOC | **~1,810** |
| **Rework rounds** | **4** — extra Implementer→Reviewer cycles beyond the first. **Not** review passes: one review per task is the method, not an overrun. The predecessor's "review rounds" metric was retired as unsatisfiable |

**This is higher than the proposal's ~900–1,200 test estimate, and that revision is the point of Step 2.4.** The proposal was written before the design existed and before it was known that **both** portfolios need a real write path — the predecessor's portfolio 1 was a stub. Two real handlers with different roles, plus DD-5's value assertions and R-RES-010's cross-field composition case, are what moved the number.

**Depth re-check: Standard stands.** Comparable to the predecessor's measured ~1,901 at the same depth. Task count, file count and requirement set are all bounded; no migration, no auth change, no cross-package work.

### 13.1 Armed thresholds

| Figure | Threshold |
| --- | --- |
| T-03 total | above **~600** — the largest single task, and the one with two real write paths |
| T-05 total | above **~600** |
| T-06 total | above **~500** |
| **Production LOC, spec-wide** | above **~300** — the meaningful one. Test overruns on this pair of specs have twice been evidence density; a *production* overrun would indicate genuine scope growth and should reopen scope, not the budget |
| Rework rounds | any **second** rework round on one task, or **5** spec-wide |

---

## 14. Open Questions

| # | Question | Blocking? |
| --- | --- | --- |
| **Q-1** | Should AI-created levers carry **no** `result_lever_strategic_outcomes` and no `result_lever_sdg_targets`? A plain id array cannot express them, so AI-created levers would be structurally poorer than `PATCH`-created ones | **Blocks design sign-off.** DD-2 and §3 assume yes (assumption A-1) |
| ~~Q-2~~ | ~~May a primary-only AI write coexist with pre-existing contributor levers?~~ | **CLOSED — moot, 2026-09-04.** `formalizeResult` always creates the result it formalizes; see DD-6 |
| Q-3 | In **Dev**, are lever ids 11/12 actually `portfolio_id = 2`, and legacy levers still `portfolio_id = 1`? | No — gates the verdict, not the build. No id range is hardcoded |
| Q-4 | Is the example payload captured from the real extractor or hand-written? | No — decides whether A-3 is evidence or assumption, for both specs |
| Q-5 | `metadata.manually_edited: true` is carried by the payload and considered by **neither** spec. Should such an item route or report differently? | No — recorded so it is not a later surprise |
| **Q-6** | **DD-10 widens scope by one expression** beyond what `proposal.md` declared out of scope. Accept, or leave the `research_areas` wipe hazard in place? | **Owner call at the Phase 2 gate** |

---

## 15. References

- `./requirements.md` — R-RES-001…010, NFR-RES-001…003, defect classes DC-1…DC-10
- `./proposal.md` — options A/B/C, risks R-1…R-6
- `docs/specs/results/ai-formalize-strategic-objectives/{requirements,design,tasks,execution}.md` — the inherited architecture, and the reconnaissance under *Scope Extension Request — 2026-09-04*
- Root `CLAUDE.md` §4.1 / §4.3 — server conventions, agent-lean verification, concurrency
- `docs/specs/kaizen-log.md` — KZ-001, KZ-003, KZ-004, KZ-007, KZ-008
