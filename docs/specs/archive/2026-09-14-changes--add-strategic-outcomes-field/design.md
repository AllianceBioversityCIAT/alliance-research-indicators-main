# Design — Alliance Alignment / Strategic (Impact) Outcomes for Innovation Use

- **Module:** results (Alliance Alignment tab, Portfolio 2 / 2026‑2030)
- **Spec id:** 2026-09-add-strategic-outcomes-field
- **Status:** draft
- **Owner:** Manuel Ricardo Almanzar
- **Linked requirements:** [`./requirements.md`](./requirements.md) (R-ALN-001, R-ALN-002, R-ALN-003)
- **Linked detailed design:** `../../../trd/trd.md` — no section currently documents `alignment_validation`; this design is the first record of its Portfolio‑2 branch logic
- **Last updated:** 2026-09-09

---

## 1. Goals & Non-goals

**Goals** (each maps to a requirement):
- G1 → R-ALN-001: Innovation Use (`indicator_id 6`) sees the Impact Outcomes field on Alliance Alignment (Portfolio 2), identically to OICR/Policy Change.
- G2 → R-ALN-002: Innovation Use's selections are persisted and returned by `Portfolio2AlignmentHandler`.
- G3 → R-ALN-003: Impact Outcomes becomes an *actually* mandatory field (blocks Submit when empty) for Policy Change and Innovation Use, closing a gap that today makes it mandatory in appearance only for Policy Change.

**Non-goals:**
- A dedicated "Innovation Use" results-detail tab/route (proposal §6 non-goal; a separate, larger gap).
- Renaming "Impact Outcomes" to "Strategic Outcomes".
- Any change to Portfolio 1 (legacy), Innovation Development (`2`), Capacity Sharing (`1`), or `ResultImpactOutcomesService` itself.
- Any change to `research_areas` / `strategic_objectives` gating — both already render unconditionally on Portfolio 2 and are untouched.

**Cross-check against requirements' `BUT`/`AND IT MUST` clauses (Kaizen KZ-016):** every clause in R-ALN-001..003 names one of the four existing sites or the one new migration site — none asks for anything this design omits. Cross-checked against module constraints: `portfolio-2-alignment.handler.ts`'s header carries no DI ban or constraint this design violates; `alignment_validation`'s existing structure (declare → select branches → return) is preserved, not restructured.

---

## 2. Architecture Overview

This is a **feature-scale change inside an existing module** — no new module, service, integration, or communication topology. Per the Robust‑vs‑Lite gate, this stays **LITE**: one existing NestJS handler gets two allow-list edits, one existing Angular component gets two allow-list edits, and one existing MySQL stored function gets a one-branch edit via a new migration. No escalation trigger (no independent scaling need, no new team boundary, no divergent availability target) applies.

```
Client (Angular)                     Server (NestJS)                    MySQL
─────────────────                    ────────────────                  ─────
AllianceAlignmentP2Component    →    Portfolio2AlignmentHandler    →    result_impact_outcomes (unchanged)
  .shouldShowImpactOutcomes()          .find() / .save()
  (indicator allow-list)               (indicator allow-list)
                                                                    ↘
AllianceAlignmentComponent                                          alignment_validation()  ← R-ALN-003
  .savePortfolioP2Alignment()                                         (indicator allow-list,
  (includeImpactOutcomes gate)                                         Portfolio-2 branch only)
                                                                        feeds GreenChecksService
                                                                        → Submit gate
```

Three independent layers, one shared allow-list concept (`{OICR, Policy Change, Innovation Use}`), each enforced by its own code path. No layer reads the allow-list from a shared constant today (each hardcodes its own `IndicatorsEnum`/`indicator_id` check) — see DD-1 for why this design does not introduce one.

### 2.1 Composition

No new files. Every change is a diff inside an existing file:

- `client/research-indicators/src/app/pages/platform/pages/result/pages/alliance-alignment/portfolio/alliance-alignment-p2.component.ts` — `shouldShowImpactOutcomes()` (R-ALN-001).
- `client/research-indicators/src/app/pages/platform/pages/result/pages/alliance-alignment/alliance-alignment.component.ts` — `savePortfolioP2Alignment()` (R-ALN-001).
- `server/researchindicators/src/domain/entities/results/portfolio-handlers/sections/alignment/portfolio-2/portfolio-2-alignment.handler.ts` — `find()` and `save()` (R-ALN-002).
- `server/researchindicators/src/db/migrations/<new-timestamp>-includeInnovationUseImpactOutcomes.ts` — new migration re-defining `alignment_validation` (R-ALN-003).

### 2.2 Reuse

- Client: `GetImpactOutcomesService`, `MultiselectComponent`, `CacheService.currentMetadata()` — all already indicator-agnostic, untouched.
- Server: `ResultImpactOutcomesService` (`create`/`find`), `ResultImpactOutcomeRolesEnum.ALIGNMENT` — untouched, already used by the OICR/Policy Change path this change extends.
- SQL: `get_portfolio_id_by_result(result_id)` — existing helper function, called once already inside `alignment_validation`; not modified.

No refactor is needed to reuse these — the change is purely widening existing conditionals.

---

## 3. Data Model

**No schema changes.** No new table, column, or index. `result_impact_outcomes` and its `role_id`/`is_active` columns (used by both `ResultImpactOutcomesService` and `alignment_validation`) already exist and are already portfolio/indicator-agnostic — R-ALN-003 only changes which indicators the *validator* checks them for.

The one migration in scope (R-ALN-003) changes a **stored function body**, not a table structure:

- Function: `alignment_validation(result_code BIGINT) RETURNS tinyint(1)`, defined in `db/migrations/1783021729548-UpdateAlignmentValidation.ts` (confirmed the current, unsuperseded definition — the two later migrations that mention "alignment_validation" as a substring, `1784500000000` and `1786679227000`, both touch only the unrelated `pool_funding_alignment_validation` function; verified by reading both files in full).
- Change: inside the `elseif (portfolio_id = 2) then` branch, `if result_indicator = 5 then` → `if result_indicator in (4, 5, 6) then` (the block that requires ≥1 active `result_impact_outcomes` row with `role_id = 1`). No other line in the function changes.
- Migration filename: `<timestamp>-includeInnovationUseImpactOutcomes.ts` (camelCase action, per repo convention).

---

## 4. API Surface

**No new or changed endpoint.** `PATCH`/`GET` `.../results/:result-code/alignment` (Portfolio‑2 routed via `Portfolio2AlignmentHandler`) already accept/return `impact_outcomes`; this change only widens which `indicator_id`s populate that key. No DTO shape change, no new Swagger annotation, no version bump.

---

## 5. Backend Module Design

### `Portfolio2AlignmentHandler` (R-ALN-002)

Both `.includes([IndicatorsEnum.OICR, IndicatorsEnum.POLICY_CHANGE])` checks become `.includes([IndicatorsEnum.OICR, IndicatorsEnum.POLICY_CHANGE, IndicatorsEnum.INNOVATION_USE])`:

- `find()` (~line 133): gates whether `ResultImpactOutcomesService.find(...)` runs and `impact_outcomes` is attached to the response.
- `save()` (~line 90): gates whether `ResultImpactOutcomesService.create(...)` runs and `impact_outcomes` is attached to the response.

No change to method signatures, DI, transaction boundaries, or the `ResultAlignmentDto` shape.

### `alignment_validation` (R-ALN-003)

New migration's `up()`: identical body to `1783021729548`'s `up()`, with the one branch condition widened as in §3. New migration's `down()`: identical body to `1783021729548`'s `up()` **unchanged** (i.e. reverting restores today's OICR-only behavior) — this is the standard append-only revert pattern already used by every migration in this chain (each `down()` restores the immediately-prior version's body, not a blank state).

---

## 6. Frontend / UX Component Architecture

No new component, no new markup, no new design token. Two existing methods widen their indicator check:

- `AllianceAlignmentP2Component.shouldShowImpactOutcomes()`: `indicatorId === 4 || indicatorId === 5` → `[4, 5, 6].includes(indicatorId)` (R-ALN-001).
- `AllianceAlignmentComponent.savePortfolioP2Alignment()`'s `includeImpactOutcomes` argument to `buildPortfolio2AlignmentPatch(...)`: `this.isOicrIndicator() || this.isPolicyChangeIndicator()` → add a third check, `this.cache.currentMetadata()?.indicator_id === 6` (or a small local helper `isInnovationUseIndicator()` mirroring the existing two computed signals, for symmetry — implementer's choice, either reads identically in tests).

The already-shipped `app-multiselect` instance (required, placeholder "Select the impact outcomes") renders unchanged for the newly-included indicator — confirmed visually equivalent by the functional prototype built during `/akili-propose` (proposal §8).

---

## 7. Shared Contracts / Package Extensions

None. `GetAllianceAlignment`, `Portfolio2AlignmentPatchBody`, `ResultAlignmentDto` — all already carry an optional `impact_outcomes` field, populated or not depending on the gates above. No interface changes.

---

## 8. Design Decisions

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| DD-1 | 2026-09-09 | Keep the allow-list hardcoded independently at each of the 4 code sites (2 client, 2 server) plus the SQL function, rather than introducing a shared constant/config. | Every sibling field on this same screen (`research_areas`, `strategic_objectives`) is gated the same hardcoded way, and the SQL function cannot read a TypeScript constant regardless — a shared source of truth cannot span all three tiers without a new lookup table, which is disproportionate to a 3-indicator allow-list. Consistent with the proposal's Option B rejection (proposal §10). |
| DD-2 | 2026-09-09 | Ship R-ALN-003 as a **new** migration (`<new-timestamp>-includeInnovationUseImpactOutcomes.ts`), never edit `1783021729548-UpdateAlignmentValidation.ts` in place. | Migrations are append-only (root `CLAUDE.md` §4.1, server `CLAUDE.md` §7); that migration may already be applied in Dev/Staging/Prod. Editing it in place would silently diverge already-migrated databases from a fresh checkout — exactly the class of defect K-006/K-015 exist to prevent. **Rejected alternative:** a raw SQL admin script run outside the migration system — rejected because it leaves no audit trail, isn't replayed by `migration:dev:execute`, and drifts from source control the moment anyone forgets to run it by hand. |
| DD-3 | 2026-09-09 | The new migration's `up()` copies `1783021729548`'s **entire** function body verbatim, changing only the one `if` condition — not a partial `ALTER`/patch statement. | MySQL has no `ALTER FUNCTION <body>`; a stored function is only redefinable via `DROP` + `CREATE` of its complete body. Copying verbatim (rather than reconstructing from memory) is the only way to guarantee the untouched branches (contract check, strategic-objectives check, non-OICR SDG requirement, Portfolio‑1 branch) are provably unchanged. |
| DD-4 | 2026-09-09 | No automated Jest gate is added for the SQL function's *logic*; verification is a manual step against a scratch/TEST schema. | `green-checks.repository.spec.ts` mocks `queryRunner.query()` and can only assert the SQL *string* contains a substring — it cannot execute a MySQL stored function. Building a parser/scanner to simulate the function (as attempted once before for a different migration hazard, Kaizen K-006's "corollary") was tried and withdrawn as unreliable. Recorded as an explicit, named manual gate (requirements.md §7) rather than a false green. |

**Step 2.3 — Reversion Challenge:** not triggered. No DD here removes, disables, or inverts behavior the codebase already ships: DD-1 through DD-4 are all additive (widen an allow-list; add a migration) or purely a delivery-mechanism choice (new migration vs. in-place edit — the rejected alternative was never shipped behavior). R-ALN-003 tightens Policy Change's already-*visible* "required" promise into an *enforced* one — that closes a gap, it does not revert delivered behavior (nothing currently relies on Policy Change being submittable without Impact Outcomes; the field has been visually mandatory since it shipped).

---

## 9. Observability

No new log lines, metrics, or dashboards. `LoggerUtil` already logs mutation requests through the existing `ResponseInterceptor`/`LoggingInterceptor` chain; nothing new to instrument. The SQL function change is silent by design (a boolean gate) — its only observable surface is the `alignment` key in the green-checks response, already returned today.

## 10. Security & Authorization

No change. Same `submission.isEditableStatus()` client gate, same guards/roles on the existing PATCH/GET alignment endpoints. `alignment_validation` is `READS SQL DATA` (no write), invoked read-only by `GreenCheckRepository.calculateGreenChecks`.

## 11. Rollout

- **Migration order — CORRECTED 2026-09-09 per `/akili-execute` T-05 (judgment.md Judge B's sharper framing, closes the deploy-order risk in C-1):** the original wording below ("before or alongside") was backwards. **Code first, migration after:** deploy T-01+T-02 (client+server) and confirm they are live, THEN apply T-03's migration — never migration-before-code, which would make the field required for indicator 6 while the client still doesn't render it and the server still drops it, an unfixable-from-the-UI lock-out. As before, note root `CLAUDE.md` §4.3 (K-015): **the pipeline deploys code, not migrations.** Whoever merges this must explicitly confirm the migration was applied in each environment before relying on R-ALN-003's behavior there; until applied, R-ALN-001/002 (display + persistence) work but R-ALN-003 (enforcement) silently does not.
- **Pre-flight measurement and go/no-go (T-05, closes judgment.md C-1):** measured against Dev (2026-09-09, `execution.md` T-05): of 28 existing Portfolio-2 results for Policy Change/Innovation Use, **27 have zero active Impact Outcomes and would flip from complete to incomplete** the moment this migration is applied — including 3 Submitted and 1 Approved result (only 1 of 28 already has data). **Explicit go/no-go recorded from the user/product owner: GO** — proceed with applying the migration to Staging/Prod (after T-01/T-02 code is confirmed live there), accepting that the 4 non-Draft results will show incomplete until someone adds an Impact Outcome, consistent with R-ALN-003's own intent that the field should have been enforced all along.
- **Original wording, superseded by the correction above (kept for history):** ~~the new migration must be applied (Dev → Staging → Prod, per the existing CI/CD pipeline) before or alongside the client/server code deploy~~.
- **Feature flag:** none — this is a correctness fix to an existing conditional, not a rollout that benefits from staged exposure.
- **Backout:** `npm run migration:revert` restores `1783021729548`'s exact body (OICR-only enforcement); client/server code revert is a plain git revert of the two allow-list edits.
- **Comms:** none required beyond the PR description — no visible UI change for existing OICR/Policy Change users; Policy Change contributors gain a new hard-stop only when submitting with Impact Outcomes empty (arguably desired, per R-ALN-003's own rationale — but worth a one-line mention in the PR description so a Policy Change contributor mid-draft isn't surprised).

## 12. Budget (Step 2.4)

> **Corrected post-`judgment-day` (both judges independently flagged the original "3 tasks / ≈220–280 LOC" as understated and inconsistent with requirements.md §7's own "T-01…T-05" reference).** The user accepted the design as-is (Continue) rather than requesting a fix-and-re-judge round; this table is updated to the judges' verified numbers as a factual correction only — no design decision changes.

| Signal | Estimate |
| --- | --- |
| Tasks | 5 (client, server handler, migration, manual schema verification, pre-flight production-data measurement) |
| LOC (incl. tests; the migration alone carries the function body twice — verbatim `up()` + verbatim-as-`down()` — ≈285-290 lines before tests) | ≈ 340–420 |
| Review rounds | 3 (one per code task: client, server handler, migration) — plus two non-code gates (manual DB verification, pre-flight measurement/sign-off) that are not review rounds |

**Against the declared Standard depth:** 5 tasks / ~380 LOC / 3 review rounds is still within Standard, just at its upper edge — not large enough to warrant Full (no new entity, no new endpoint, no rollout with feature flags/phased exposure). No depth change recommended.

## 13. Open Questions

None outstanding — both open questions from the proposal (the missing Innovation Use results-detail tab; the "Strategic Outcomes" naming) are explicitly out of scope (§1 Non-goals) rather than blocking.

## 14. References

- `docs/specs/changes/add-strategic-outcomes-field/proposal.md` — origin, screenshot context, mockups.
- `docs/specs/changes/add-strategic-outcomes-field/requirements.md` — R-ALN-001/002/003.
- `server/researchindicators/src/db/migrations/1783021729548-UpdateAlignmentValidation.ts` — current `alignment_validation` definition (base for the new migration).
- Kaizen: K-006, K-015 (migration discipline); KZ-002 (multi-site enumeration).
