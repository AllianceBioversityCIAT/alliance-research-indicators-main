# Proposal — Results / AI Formalize: Portfolio-Routed Primary Levers

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/results/ai-formalize-primary-levers` |
| **Spec id** | 2026-09-ai-formalize-primary-levers |
| **Module** | results |
| **Type** | **Change** |
| **Approval Mode** | `gated` — every phase gate pauses for the owner. No end-to-end mandate was given |
| **Owner** | David Felipe Casañas Hernández |
| **Slug** | `ai-formalize-primary-levers` — the argument was a paragraph of intent; the slug was derived from its core and the full text became context, not a directory name |
| **Depends on** | `docs/specs/results/ai-formalize-strategic-objectives` — **architecturally**, not by schedule. That spec is code-complete; only its owner-only Dev checks (T-07) remain open |
| **Parallel-safe** | **No.** It edits the same four files as the predecessor (`results.service.ts`, both alignment handlers, the orchestrator). It must not run concurrently with that spec's T-07 remediation, nor in a second worktree against the same package |
| **Sibling, not child** | Chosen deliberately by the owner (2026-09-04) over extending the predecessor with `T-08…T-1x`. No `family.md` is created: this is one bounded change, not a decomposed family |
| **Created** | 2026-09-04 |

---

## 2. Intent

Accept one more field on the AI-formalize payload — `primary_levers: number[]`, at the root of each result item alongside the already-shipped `strategic_objectives` — and persist it through **the portfolio's own alignment handler**, so the formalizer never learns what a lever means for a given portfolio.

The owner supplied a real payload showing the field in position:

```json
{ "year": "2026", "primary_levers": [11, 12], "strategic_objectives": [3], … }
```

---

## 3. Problem / Current Behavior

Today the AI formalizer **rejects any payload carrying `primary_levers`**. The field is not on `ResultRawAi`, and `ValidationPipe` runs with `whitelist: true` **and `forbidNonWhitelisted: true`**, so the request fails with `400 property primary_levers should not exist` and the ids the extractor resolved never reach the database. A human must re-enter them by hand through `PATCH /api/results/:result-code/alignments`, which is exactly the gap the predecessor spec closed for strategic objectives.

**Two facts make this worth specifying rather than patching.**

**Fact 1 — the routing is the mirror image of the predecessor's, and both portfolios support the field.**

| | `strategic_objectives` (shipped) | `primary_levers` (this spec) |
| --- | --- | --- |
| Portfolio 1 (2010–2025) | ❌ `supported: false`, writes nothing | ✅ levers at `lever_role_id = ALIGNMENT (1)`, `is_primary = true` |
| Portfolio 2 (2026–2030) | ✅ supported | ✅ **research areas** at `lever_role_id = RESEARCH_AREAS_ALIGNMENT (3)` |

Portfolio 2's handler currently **discards** the section-save form outright — `payload.primary_levers = []`, `payload.contributor_levers = []`, then `delete alignment?.primary_levers` (`portfolio-2-alignment.handler.ts:45-56`) — and writes `research_areas` instead (`:60-73`). Portfolio 1's handler mentions levers not at all; it delegates wholesale to `ResultAlignmentOperationsService.save`, which splits `primary_levers` / `contributor_levers` by `is_primary` (`result-alignment-operations.service.ts:33-69`).

**Fact 2 — the owner's payload is coherent, and proves the field name is portfolio-agnostic.** Migration `1782402733402-InsertNewResearchAreas` inserted ids 10–17 with `portfolio_id = 2`:

```sql
(11, 'Multifunctional Landscapes', 2),
(12, 'Climate Action',             2)
```

Legacy levers were all set to `portfolio_id = 1` by `1782337004400-AddedPortfolioIdClarisaLevers`. The payload's `year: "2026"` routes to portfolio 2, and ids 11/12 are that portfolio's research areas — consistent with the item's *"Eje 5"* title and climate-change description.

So the extractor emits one portfolio-agnostic field name and **each portfolio decides what it means**. That is precisely **DD-4** from the predecessor spec, already approved and shipped.

---

## 4. Proposed Outcome

| # | Behavior |
| --- | --- |
| O-1 | The formalizer accepts `primary_levers: number[]` on both AI endpoints, optional, rejecting non-numeric elements with the field named in `errors` |
| O-2 | The item's effective year resolves a portfolio, and that portfolio's handler persists the ids **in its own terms** — role 1 + `is_primary = true` for portfolio 1, role 3 for portfolio 2 |
| O-3 | Ids not owned by the resolved portfolio, inactive, or unknown are **discarded and reported**, never written |
| O-4 | An unresolvable year writes nothing, reports the field, and warns — **no fallback portfolio** |
| O-5 | Absent / `[]` / `null` performs no alignment call at all, leaving every other alignment table untouched |
| O-6 | Each bulk item routes on **its own** year, with no leakage between items |
| O-7 | **The write is inert toward any lever row it did not create** — see R-4, whose severity was revised down on 2026-09-04 once it was confirmed that `formalizeResult` always creates the result it formalizes |

---

## 5. Scope

**In scope**

- `ResultRawAi.primary_levers?: number[]` on the AI DTO, mirroring the shipped `strategic_objectives` decorators.
- An id-filtered, portfolio-scoped, active-only finder on `ClarisaLeversService`.
- A second narrow method on the `AlignmentSectionHandler` contract, implemented differently by each portfolio.
- A second explicit-portfolio entry point on `ResultSectionOrchestratorService`.
- One more step in `formalizeResult`, reusing the shipped guard/report/warn shape.
- Unit specs at the same evidence standard the predecessor established (KZ-001, KZ-004, falsifier probes).

**Reused as-is — no change needed**

| Element | Why it is free |
| --- | --- |
| `PortfoliosService.findByYear(year)` | Already built, already memoized per request (predecessor T-02). **This spec needs no resolver work at all** |
| The `missing_fields` reporting channel and entry format | Predecessor §5.2 — `primary_levers` and `primary_levers:<id>` follow the same two shapes |
| `formalizeResult`'s step-1 guard pattern and `resultMetadata?.push` guard | Shipped and reviewed |
| `ResultLeversService.create(...)` | Extends `BaseServiceSimple`, role column `lever_role_id`; the same write primitive the `PATCH` path uses |

**Out of scope**

- `contributor_levers` — the AI payload carries only the primary form. Not **writing** them is out of scope; being **inert toward** them is in scope (O-7).
- Nested `result_lever_strategic_outcomes` / `result_lever_sdg_targets` — see Q-2.
- Any migration, schema change, or seed change.
- Any change to the alignment endpoints' request/response contract.
- Any client change.
- Hardening the unguarded `payload?.research_areas?.map` — see R-5.

---

## 6. Non-Goals

- Not a refactor of `ResultAlignmentOperationsService` or of either portfolio's section-wide `save`.
- Not a transaction redesign of `formalizeResult` — the predecessor's DD-8 stands.
- Not a change to what `PATCH .../alignments` does with levers.
- Not a correction of the `lever_id` type modelling beyond what this path needs (see R-2).

---

## 7. Affected Users, Systems, And Specs

| Surface | Impact |
| --- | --- |
| **Result Contributor** (PRD §3.1) | AI-created results arrive with levers already attached instead of needing manual re-entry |
| `results.service.ts` | One new step in `formalizeResult`; one field carried through `createResultFromAiRoar` |
| Both alignment handlers + the handler interface | One new narrow method each, with genuinely different bodies |
| `result-section-orchestrator.service.ts` | One new explicit-portfolio entry point |
| `ClarisaLeversService` | One new finder |
| **`docs/specs/results/ai-formalize-strategic-objectives`** | **R-RES-007 must be amended — see §9 MODIFIED.** Its scenario clause and AC.1 both name `result_levers` |
| STAR client | None. It reads alignment through `GET .../alignments`, whose contract does not change |

---

## 8. Visual Reference

- **Source:** None.
- **Location:** n/a.
- **Notes:** Backend-only change. No screen, no admin page, no SSR route, no client component. The observable surfaces are the API payload, the `result_levers` rows, and `bulk_upload_results.missing_fields`.

---

## 9. Requirement Delta Preview

### ADDED

- `primary_levers` is accepted on both AI-formalize endpoints and must not require any other new field.
- Portfolio resolution for the field reuses the item's effective year (`result.year ?? current calendar year`).
- Portfolio 1 persists the ids as levers at role `ALIGNMENT`, with `is_primary = true` **set explicitly**.
- Portfolio 2 persists the ids as research areas at role `RESEARCH_AREAS_ALIGNMENT`.
- Ids failing the three-part predicate (`id IN (…)` AND `portfolio_id = mine` AND `is_active = true`) are discarded and reported per id.
- An unresolvable year reports the field and warns, with no fallback portfolio.
- **The AI lever write must not deactivate, delete, promote or demote any `result_levers` row it did not itself create** (new — see R-4). Unreachable today by construction, and kept as a falsifiable guarantee rather than an incidental fact.

### MODIFIED

- **`results/ai-formalize-strategic-objectives` → R-RES-007.** Its scenario clause (*"BUT it must NOT deactivate or delete any `result_contracts`, `result_sdgs`, `result_levers` or `result_impact_outcomes` row"*) and **AC.1** (*"row counts in `result_contracts`, `result_sdgs`, `result_levers` match a run on the pre-change code"*) both name `result_levers`, and **stop being true the moment this spec writes lever rows.** AC.1 is currently ticked as proven by that spec's T-06.

  The amendment must restate the guarantee as: *absence of **both** fields leaves every other alignment table untouched, and neither new write disturbs the other.* **AC.4 — no code path in the formalizer reaches the section-wide alignment save — survives unchanged and becomes more important, not less**, since there will be two narrow writes that must both avoid it.

  This is a cross-spec edit and cannot be done silently. It is recorded in that spec's `execution.md` → *Scope Extension Request — 2026-09-04*.

### REMOVED

- None. Every change is additive or tolerance-widening.

---

## 10. Approach Options

### Option A — Mirror the shipped architecture with a second narrow handler method **(recommended)**

Add `saveLevers(resultId, ids)` to `AlignmentSectionHandler`; each portfolio implements it in its own terms. Add `saveLeversForPortfolio(resultId, portfolioId, ids)` to the orchestrator. Add one step to `formalizeResult`.

| | |
| --- | --- |
| **For** | Reuses an architecture that has just passed seven tasks with zero rework. Keeps DD-1 (never reach the section-wide save), DD-4 (portfolio owns its semantics), DD-5 (handler decides, caller reports) and DD-8 (no threaded transaction) intact. Every reviewer lens that audited the predecessor transfers directly |
| **Against** | A second near-identical narrow method on the contract invites a later "generalize these two" refactor |
| **Cost** | Smallest safe path. No resolver work; the expensive `supported: false` branch does not exist here |

### Option B — Generalize the shipped narrow save into one method taking a section key

One `saveAlignmentSubsection(resultId, key, ids)` handling both strategic objectives and levers.

| | |
| --- | --- |
| **For** | No contract duplication |
| **Against** | **Refactors code that shipped hours ago and is under a validated audit trail.** The two fields differ in role, in `is_primary`, in which portfolios support them, and in reconciliation hazard — a shared signature would hide exactly the differences that matter. It also reopens the predecessor's reviewed diff |
| **Cost** | Higher, and it puts shipped behavior at risk to save one method |

### Option C — Route `primary_levers` through the existing section-wide save

Populate the alignment DTO and call `handler.save(...)`.

| | |
| --- | --- |
| **For** | No new contract at all |
| **Against** | **Directly violates the predecessor's highest-severity requirement (R-RES-007 AC.4).** The section-wide save's reconciliation deactivates every row for `(result_id, role)` absent from the incoming array — it would wipe the SDGs and contracts the same method wrote moments earlier. This is the defect the whole predecessor spec exists to prevent |
| **Cost** | Rejected outright |

---

## 11. Recommended Approach

**Option A.** It is the smallest change that satisfies the owner's two semantic decisions, and it inherits an architecture whose design decisions have already survived review.

Three properties make it cheaper than the predecessor:

1. **No resolver work.** `findByYear` exists and is memoized — the predecessor's T-02 is free here.
2. **No `supported: false` branch.** Both portfolios support the field, which removes the predecessor's single most expensive forward obligation (the T-03 → T-05 terminating-branch chain that consumed a full review round).
3. **The reporting shape, guard pattern and warn discipline are shipped and reviewed** — copy, don't design.

**Expected shape:** ~6 tasks, all server-side in `server/researchindicators`, no migration.

**Budget basis — set from measured evidence on day one, per KZ-008.** The predecessor's budget was wrong twice because it priced test code at 1:1 against production; measured, this codebase's evidence standard runs **~3:1 overall and up to 6:1 on test-heavy tasks**. `/akili-specify` must price this spec on the corrected basis from the start, and must budget **rework rounds**, not review passes — one review pass per task is the method, not an overrun. Indicative: **~200 production LOC, ~900–1,200 test LOC, 4 rework rounds.**

---

## 12. Risks, Dependencies, And Open Questions

### Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| **R-1** | **`is_primary` is `NOT NULL` with a DB default of `false`.** A write that omits it silently creates a **contributor** lever where a primary was intended | **High — DC-4-class silent wrong data.** No row count, no exception and no `missing_fields` entry would reveal it | Requirements must assert the written `is_primary` value, not merely the row's existence. A test asserting "a row exists for lever 11" passes while the data is wrong |
| **R-2** | `lever_id` is a `bigint` column typed as `string` on the entity, and the shipped code casts with `parseInt(x) as unknown as string` (`portfolio-2-alignment.handler.ts:62`) | Medium | An explicit design decision: replicate the existing cast for consistency, or clean it locally. Not a decision to improvise mid-implementation |
| **R-3** | Reconciliation is scoped by `lever_role_id` (`ResultLeversService` → `super(ResultLever, …, 'lever_role_id')`), so a role-1 write cannot disturb role-3 rows and vice versa | Low — this is *protective* | Record it as a design fact: the two portfolios' writes are mutually inert by construction |
| **R-4** | **But within role `ALIGNMENT (1)`, primary and contributor levers share the role** — `is_primary` distinguishes them, not the role. So a primary-only reconciliation at role 1 would **deactivate every existing contributor lever** for that result | **Low** — *revised down 2026-09-04 from High.* `formalizeResult` has no update path: it always calls `createResult` and uses the returned row only as a rollback handle (`results.service.ts:879-901`). The result reaching the alignment step is milliseconds old, so no lever row can pre-exist for it. Portfolio 2 is doubly unaffected — role 3 cannot reach role-1 rows | The portfolio-1 handler **may** call `create` with just the primary ids. `[PL] R-RES-007` AC.2 (**amended 2026-09-04**, Pivot T-03) asserts the handler-boundary property — exactly the survivors handed to the reconciler, no read-back, no self-issued deactivation — which is falsifiable now. It does **not** assert that a pre-existing contributor row survives: the reconciler deactivates same-role rows absent from the persisted set, so that is unachievable, and the residual rests on unreachability (RK-2, accepted) |
| **R-5** | `payload?.research_areas?.map(...)` is unguarded (`portfolio-2-alignment.handler.ts:61`) — the same class of bug the predecessor's R-RES-010 hardened for `strategic_objectives` and `impact_outcomes`, which left `research_areas` out | Low; pre-existing, not caused here | Out of scope as written, but this spec touches that exact method. Either harden it as an explicit in-scope addition or record why not — do not leave it unremarked |
| **R-6** | Amending the predecessor's R-RES-007 touches a spec with a closed, validated audit trail | Medium | The amendment is already recorded as a cross-spec obligation. `/akili-specify` must apply the two-direction Correction Closure sweep, and `/akili-validate` on the predecessor must not read its green T-06 as still covering `result_levers` |

### Dependencies

- **`ClarisaLeversService` needs an id-filtered finder.** It has `findAllWithPortfolio(portfolioId?)` — portfolio-scoped but with **no id filter** — which is exactly the gap `StrategicObjectivesService` had, and which the predecessor closed with an authorized deviation (`findActiveByIdsForPortfolio`). Expect the same addition here, and authorize it in the task rather than discovering it mid-implementation.
- `is_active` is inherited from `AuditableEntity`, so the three-part validation predicate is expressible for `clarisa_levers` identically to `strategic_objectives`. Confirmed.
- **`RK-6` (predecessor)** — migration `1783029013035` must be applied wherever this deploys, for the same compensating-delete reason. Still open and owner-owned.

### Open Questions

| # | Question | Why it matters | Blocks? |
| --- | --- | --- | --- |
| **Q-1** | Are lever ids 11/12 in the owner's payload actually `portfolio_id = 2` **in Dev**, and are legacy levers still all `portfolio_id = 1`? | The migration says yes; Dev state is unverified. Same shape as the predecessor's Q-1 | No — the design is written against *"the portfolio owns the id"*, never against a hardcoded id range. Gates the **verdict**, not the build |
| **Q-2** | Should the AI path write levers with **no** `result_lever_strategic_outcomes` and no `result_lever_sdg_targets`? | A plain id array cannot express them, so AI-created levers would be structurally poorer than `PATCH`-created ones. That may be entirely acceptable — or may need the AI path to leave a marker | **Specify-blocking.** Needs one owner answer before design |
| ~~Q-3~~ | ~~For a portfolio-1 item, may a primary-only AI write coexist with contributor levers a human added earlier?~~ | **CLOSED — moot, 2026-09-04.** The situation cannot arise; the result is always created by the same call that formalizes it. Closed by code evidence, not by a decision | — |
| **Q-4** | Is the owner's example payload **captured from the real extractor** or hand-written? | It already confirms A-1 (numeric ids) and the year-as-string advisory. If captured, it materially advances DC-9 for *both* specs; if hand-written, it cannot | No, but it changes what the predecessor's T-07 may record |
| **Q-5** | The payload carries `metadata.manually_edited: true` — a field **neither spec has considered.** Should a manually-edited item route or report differently? | An owner-edited item may warrant different treatment from a purely AI-extracted one | No — but it must not be discovered later as a surprise |

---

## 13. Success Criteria

- [ ] `primary_levers: [11, 12]` on a 2026 item produces two `result_levers` rows at `lever_role_id = 3` for that result, and the item lands in `results_created`.
- [ ] The same ids on a 2025 item are **discarded and reported** — they are portfolio-2 ids.
- [ ] Portfolio-1-owned ids on a 2025 item produce rows at `lever_role_id = 1` with **`is_primary = true` asserted explicitly** (R-1).
- [ ] **A contributor lever reported by a persistence double survives the AI primary write** (R-4 / O-7) — the falsifying test for an inertness that is otherwise unreachable.
- [ ] An unresolvable year writes nothing, reports the field, warns naming the year, and selects **no** fallback portfolio.
- [ ] Absent / `[]` / `null` calls neither the resolver nor the orchestrator — asserted as **zero interactions**, not zero rows.
- [ ] A mixed-year batch attaches each item's levers to that item's own result id, and reversing item order changes nothing.
- [ ] Both fields on one item — `primary_levers` **and** `strategic_objectives` — end with all rows active and neither write disturbing the other.
- [ ] No code path in the formalizer reaches the section-wide alignment save.
- [ ] The predecessor's R-RES-007 is amended, with the two-direction Correction Closure sweep applied.
- [ ] Full-package suite green with a coverage figure ≥ 60%; lint clean.

---

## 14. Next Step

```text
/akili-specify results/ai-formalize-primary-levers
```

**Standard depth**, matching the predecessor. Answer **Q-2 first** — it is the one remaining specify-blocking question. *(Q-3 was closed as moot on 2026-09-04 during Phase 2 exploration.)*
