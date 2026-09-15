# Requirements — Alliance Alignment / Strategic (Impact) Outcomes for Innovation Use

- **Module:** results (Alliance Alignment tab, Portfolio 2 / 2026‑2030)
- **Spec id:** 2026-09-add-strategic-outcomes-field
- **Depth:** **Standard** — upgraded from an initial Lite estimate once a 5th site surfaced: the *actual* mandatory-field enforcement lives in a MySQL stored function (`alignment_validation`) touched by a migration, not just client/server display gates. Still narrow (one function, additive branch, no new tables/columns), but "migration work" moves it out of Lite per depth guidance.
- **Status:** draft
- **Owner:** Manuel Ricardo Almanzar
- **Linked PRD section:** [`docs/prd.md` §6 US-RC-2](../../../prd.md) (tabbed forms for policy change / innovation / OICR)
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Linked tickets:** AC-1753
- **Last updated:** 2026-09-09

---

## 1. Executive Summary

The Alliance Alignment screen already shows an **"Impact Outcomes"** field (what the ticket calls "Strategic Outcomes") for **OICR** (`indicator_id 5`) and **Policy Change** (`indicator_id 4`) results in Portfolio 2 (2026‑2030), on both client and server. **Innovation Use** (`indicator_id 6`) is a distinct indicator, absent from that allow-list in all four places it is checked. This spec makes Innovation Use behave identically to OICR/Policy Change — nothing else changes.

**Correction from the initial proposal, found while specifying (user asked to double-check the validators):** the field's `[isRequired]="true"` marker is a **client-only visual cue** (asterisk + warning text) — it does not block Save or Submit. The actual mandatory-field gate that blocks submission is a MySQL stored function, `alignment_validation`, whose Portfolio‑2 branch only requires `impact_outcomes` when `result_indicator = 5` (OICR). **Policy Change (`4`) results can be submitted today with Impact Outcomes empty** — the visual "required" mark is cosmetic for Policy Change, and would be for Innovation Use too if this were left unfixed. R-ALN-003 below closes this for both.

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Impact Outcomes | The field the ticket calls "Strategic Outcomes"; PrimeNG multiselect, catalog `impact_outcome`, portfolio-scoped (not indicator-scoped) |
| Portfolio 2 | The 2026‑2030 CGIAR portfolio; `portfolio_id = 2`. The only portfolio where this field exists |
| `IndicatorsEnum` | Server enum (`indicators.enum.ts`): `1` Capacity Sharing, `2` Innovation Development, `3` Knowledge Product, `4` Policy Change, `5` OICR, `6` **Innovation Use** |
| `shouldShowImpactOutcomes()` | Client method on `AllianceAlignmentP2Component` gating field visibility |
| `Portfolio2AlignmentHandler` | Server handler gating field persistence/return for `find`/`save` |
| `alignment_validation` | MySQL stored function (`db/migrations/1783021729548-UpdateAlignmentValidation.ts`) computing the `alignment` green check — the **actual** field-required gate that blocks Submit; independent of the client's visual asterisk |
| Green check / `completness` | Per-section + overall boolean computed server-side (`GreenChecksService.findByResultId`) and read by the client's Submit gate (`cache.service.ts` `allGreenChecksAreTrue`, `submission.service.ts` `meetsStatusChangeValidationRequirements`) |

## 3. System Context & Scope

**In scope:**
- Client: `AllianceAlignmentP2Component.shouldShowImpactOutcomes()` (visibility) and `AllianceAlignmentComponent.savePortfolioP2Alignment()`'s `includeImpactOutcomes` gate (save payload).
- Server: `Portfolio2AlignmentHandler.find()` and `.save()`'s two `IndicatorsEnum` allow-lists.
- **Server (new migration):** the `alignment_validation` MySQL function's Portfolio‑2 branch — extend its `impact_outcomes`-required check from `result_indicator = 5` to `result_indicator IN (4, 5, 6)`, so the field is **actually** mandatory (blocks Submit when empty) for Policy Change and Innovation Use, not only OICR.

**Out of scope (see proposal §6):**
- Building a dedicated "Innovation Use" results-detail tab/route (a separate, larger gap; not required for this field to work — Alliance Alignment is reachable via the sidebar regardless).
- Renaming "Impact Outcomes" to "Strategic Outcomes".
- Portfolio 1 (legacy), Innovation Development (`2`), Capacity Sharing (`1`).

## 4. Stakeholders / Personas

- **Result Contributor / Researcher** reporting an Innovation Use result in Portfolio 2 (PRD §3.1).
- **MEL Regional Expert** reviewing such results (PRD §3.2).

## 5. Functional Requirements

### R-ALN-001 — Client shows and saves Impact Outcomes for Innovation Use

- **As a** Result Contributor
- **I want** the Impact Outcomes field to appear on Alliance Alignment for an Innovation Use result and be included when I save
- **So that** I can report strategic outcomes the same way OICR and Policy Change contributors already do

**Details:**
- Inputs: `cache.currentMetadata().indicator_id` (number), portfolio 2 context.
- Behavior: `shouldShowImpactOutcomes()` (`alliance-alignment-p2.component.ts`) returns `true` for `indicatorId ∈ {4, 5, 6}` (currently `{4, 5}`); the save gate `includeImpactOutcomes` in `savePortfolioP2Alignment()` (`alliance-alignment.component.ts`) likewise extends to indicator `6`.
- Outputs: rendered field (required multiselect, unchanged copy/placeholder); `PATCH_Alignments` payload includes `impact_outcomes: [{ impact_outcome_id }]` when populated.
- Permissions: unchanged — same `submission.isEditableStatus()` gating as every other field on this screen.

**Acceptance criteria:**
- [ ] AC.1 — With `indicator_id = 6`, `shouldShowImpactOutcomes()` returns `true` and the rendered DOM contains "Impact Outcomes".
- [ ] AC.2 — With `indicator_id = 6`, saving with one or more selected outcomes sends `impact_outcomes: [{ impact_outcome_id: <id> }]` in the PATCH body.
- [ ] AC.3 — With `indicator_id ∈ {1, 2}` (Capacity Sharing, Innovation Development), `shouldShowImpactOutcomes()` still returns `false` and the PATCH payload's `impact_outcomes` key is `undefined` (no regression).
- [ ] AC.4 — With `indicator_id ∈ {4, 5}`, behavior is byte-for-byte unchanged (existing tests keep passing unmodified).

#### Scenario: Innovation Use shows and persists Impact Outcomes

- GIVEN a result with `indicator_id = 6` in Portfolio 2
- WHEN the Alliance Alignment screen renders
- THEN "Impact Outcomes" appears as a required multiselect, identical to how it renders for `indicator_id = 5`
- AND WHEN the user selects one or more outcomes and saves
- THEN the PATCH payload includes `impact_outcomes: [{ impact_outcome_id: <id> }, ...]`
- BUT it must NOT appear, and must NOT be sent, for `indicator_id ∈ {1, 2}`
- AND IT MUST leave the "Contribution to SDG" field's visibility (`indicator_id !== 5`) completely unaffected

**Out of scope (for this requirement):** the field's copy, styling, or placeholder text — unchanged.

---

### R-ALN-002 — Server persists and returns Impact Outcomes for Innovation Use

- **As a** system of record
- **I want** `Portfolio2AlignmentHandler` to persist and return `impact_outcomes` for Innovation Use results
- **So that** the client's PATCH is not silently dropped and a subsequent GET reflects what was saved

**Details:**
- Inputs: `context.result.indicator_id`, `payload.impact_outcomes` (`ResultAlignmentDto`).
- Behavior: both `.includes([IndicatorsEnum.OICR, IndicatorsEnum.POLICY_CHANGE])` checks in `portfolio-2-alignment.handler.ts` (`find()` line ~133, `save()` line ~90) extend to include `IndicatorsEnum.INNOVATION_USE`.
- Outputs: `find()`/`save()` response includes `impact_outcomes` (array of persisted rows) only when the indicator is in the allow-list; otherwise the key is omitted (`undefined`), matching current behavior for excluded indicators.
- Permissions: unchanged — same guards/roles as the rest of the alignment save path.

**Acceptance criteria:**
- [ ] AC.1 — `save()` called with `context.result.indicator_id = IndicatorsEnum.INNOVATION_USE` calls `ResultImpactOutcomesService.create(...)` with the payload's outcomes mapped to `{ impact_outcome_id }`, and the returned object includes `impact_outcomes`.
- [ ] AC.2 — `find()` called with the same indicator calls `ResultImpactOutcomesService.find(...)` and includes its result as `impact_outcomes`.
- [ ] AC.3 — Called with `indicator_id = IndicatorsEnum.KNOWLEDGE_PRODUCT` (`3`), neither `create` nor `find` on `ResultImpactOutcomesService` is invoked and `impact_outcomes` is `undefined` on the response (existing test, must keep passing).
- [ ] AC.4 — Called with `indicator_id ∈ {OICR, POLICY_CHANGE}`, behavior is byte-for-byte unchanged (existing tests keep passing unmodified).

#### Scenario: Save persists Impact Outcomes for Innovation Use

- GIVEN a Portfolio‑2 alignment PATCH for a result with `indicator_id = IndicatorsEnum.INNOVATION_USE`
- WHEN `Portfolio2AlignmentHandler.save()` runs
- THEN `ResultImpactOutcomesService.create(resultId, [{impact_outcome_id}], 'impact_outcome_id', ResultImpactOutcomeRolesEnum.ALIGNMENT, manager)` is called
- AND the returned object's `impact_outcomes` equals the service's resolved rows
- BUT it must NOT be called for `indicator_id = IndicatorsEnum.KNOWLEDGE_PRODUCT`

#### Scenario: Find returns Impact Outcomes for Innovation Use

- GIVEN a Portfolio‑2 alignment GET for a result with `indicator_id = IndicatorsEnum.INNOVATION_USE`
- WHEN `Portfolio2AlignmentHandler.find()` runs
- THEN `ResultImpactOutcomesService.find(resultId, ResultImpactOutcomeRolesEnum.ALIGNMENT)` is called and its result is set as `impact_outcomes` on the response
- BUT it must NOT be called for `indicator_id = IndicatorsEnum.KNOWLEDGE_PRODUCT`, and the response's `impact_outcomes` stays `undefined` in that case

**Out of scope (for this requirement):** any change to `ResultImpactOutcomesService` itself — it is already indicator-agnostic and untouched.

---

### R-ALN-003 — Impact Outcomes is actually mandatory for Policy Change and Innovation Use

- **As a** MEL Regional Expert
- **I want** a result to be blocked from Submit when Impact Outcomes is required but empty
- **So that** the visual "required" asterisk on the field reflects a real constraint, not a decoration

**Details:**
- Inputs: `result_impact_outcomes` rows (`role_id = 1`, `is_active = true`) for the result; `results.indicator_id`; `get_portfolio_id_by_result(result_id) = 2`.
- Behavior: inside `alignment_validation`'s `elseif (portfolio_id = 2)` branch, the existing `if result_indicator = 5 then <impact_outcomes required>` guard becomes `if result_indicator in (4, 5, 6) then <impact_outcomes required>`. Everything else in the function (contract check, strategic-objectives check, non-OICR SDG requirement) is untouched.
- Outputs: `alignment_validation(result_id)` returns `0`/`false` when the result's indicator is in `{4, 5, 6}`, `portfolio_id = 2`, and it has zero active `role_id = 1` `result_impact_outcomes` rows — same as it already does for OICR today.
- Delivery mechanism: a **new, append-only migration** (never edit `1783021729548-UpdateAlignmentValidation.ts` in place) that `DROP FUNCTION`s and re-`CREATE FUNCTION`s `alignment_validation` with the one-line branch change, copying the rest of the current body verbatim.

**Acceptance criteria:**
- [ ] AC.1 — A Portfolio‑2 result with `indicator_id = 4` (Policy Change) and zero active `impact_outcomes` rows: `alignment_validation(result_id)` returns `false`, and the "alignment" green check is `false`.
- [ ] AC.2 — Same result, after one active `impact_outcomes` row is added (`role_id = 1`): `alignment_validation(result_id)` returns `true` (all else being satisfied).
- [ ] AC.3 — Same two cases for `indicator_id = 6` (Innovation Use).
- [ ] AC.4 — `indicator_id = 5` (OICR) behavior is byte-for-byte unchanged (already required today).
- [ ] AC.5 — `indicator_id` outside `{4, 5, 6}` in Portfolio 2 (e.g. Knowledge Product `3`): `impact_outcomes` presence/absence has **no effect** on the return value (unchanged from today).

#### Scenario: Policy Change result cannot submit without Impact Outcomes

- GIVEN a Portfolio‑2 result with `indicator_id = 4`, a primary contract, and a primary strategic objective, but **no** active `impact_outcomes` row
- WHEN `alignment_validation(result_id)` is evaluated (e.g. via the result's green-checks / Submit flow)
- THEN it returns `false`
- AND WHEN an active `impact_outcomes` row is added
- THEN it returns `true`
- BUT it must NOT change the result for `indicator_id = 3` (Knowledge Product) regardless of `impact_outcomes` presence
- AND IT MUST leave the OICR (`5`) branch's existing pass/fail behavior unchanged

**Out of scope (for this requirement):** any change to how `impact_outcomes` rows are written (`ResultImpactOutcomesService`, R-ALN-002) — this requirement only changes what counts as "complete."

## 6. Non-Functional Requirements

None differ from the inherited defaults (PRD AC-API-Surface / AC-Testing), except:

- **Migration discipline (server `CLAUDE.md` §7, Kaizen K-006):** the new migration must be applied and manually verified against a scratch/TEST schema (`npm run migration:dev:execute`) — a MySQL stored function's *logic* cannot be exercised by a mocked Jest test (see §7 below), so "the migration ran" is necessary but not sufficient; the function's return value must be checked against real fixture rows.

## 7. Defect Classes → Gates

| Defect class | Gate | Automated? |
| --- | --- | --- |
| Wrong indicator set (e.g. off-by-one, wrong enum value) on any of the 4 display/save sites | Unit test asserting the exact boolean/call for `indicator_id = 6` (client component spec + server handler spec) | Yes |
| Partial fix — sites updated, one forgotten (Kaizen KZ-002) | Each site has its **own** dedicated test (T-01…T-05 in `tasks.md`); a forgotten site fails its own test, not a shared one | Yes |
| Regression on existing indicators (1, 2, 3 stay excluded; 4, 5 stay unchanged) | Existing test suite (already covers indicator 1 → `impact_outcomes: undefined`, indicator 3 → service not called, indicators 4/5 → full round-trip) — re-run unmodified | Yes |
| Visual/rendering defect | Not applicable — no new markup or component is introduced; the same `app-multiselect` instance now renders for one more `indicator_id`. Existing DOM-presence assertions in `alliance-alignment-p2.component.spec.ts` are sufficient | Yes (presence-level; no visual-only risk since nothing new is drawn) |
| **SQL validator logic defect** — `alignment_validation`'s branch change is wrong (wrong indicator list, wrong operator, breaks the OICR case, edits the wrong of the function's two `if result_indicator = 5` occurrences, or a migration that doesn't apply cleanly) | **No automated Jest gate exists for this class** — `green-checks.repository.spec.ts` mocks the datasource's `query()` call and only asserts the SQL *string* contains a substring (e.g. `'oicr_validation'`); it cannot execute a MySQL stored function. **Substitute:** manual verification against a disposable/scratch MySQL schema (never the shared Dev database) — apply the migration, then run `SELECT alignment_validation(<id>)` against fixture rows covering indicator 4/5/6 × {with, without} an active `impact_outcomes` row, **plus** an indicator-3 negative case and a Portfolio‑1 negative case (`tasks.md` T-04's 8-case matrix). | **No — recorded here as the substitute, per the requirement above** |
| **Unguarded dereference on the newly-widened path** — `Portfolio2AlignmentHandler.save()`'s `payload.impact_outcomes.map(...)` has no optional chaining; a PATCH that omits the (optional) key for a now-included indicator throws instead of leaving the key `undefined` | `tasks.md` T-02's dedicated negative test: `save()` with `indicator_id = INNOVATION_USE` and no `impact_outcomes` key must not throw | Yes (found during `judgment-day`, both judges; see `judgment.md` C-2) |
| **Unmeasured production-data impact** — tightening `alignment_validation` to require `impact_outcomes` for indicators 4 and 6 can flip already-submitted results' completeness from green to red for data nobody is currently editing | **No automated gate** — this is a data/business-risk class, not a code-correctness one. Substitute: `tasks.md` T-05's pre-flight count against Dev (broken out by `result_status_id`) plus an explicit human go/no-go before Staging/Prod, following this repo's own precedent (migration `1786679227000`'s documented pre-flight measurement) | No — recorded as the substitute, per the requirement above; found during `judgment-day`, both judges (`judgment.md` C-1) |

Two defect classes above were not identified until the design's `judgment-day` review (`judgment.md`) — recorded here rather than silently absorbed into `tasks.md` alone, so this table stays the authoritative map from defect class to gate. Every defect class either has an automated gate or an explicitly named manual substitute — none is an unacknowledged/accepted risk.

## 8. Requirement ID Index

| ID | Title | Tier |
| --- | --- | --- |
| R-ALN-001 | Client shows and saves Impact Outcomes for Innovation Use | client |
| R-ALN-002 | Server persists and returns Impact Outcomes for Innovation Use | server |
| R-ALN-003 | Impact Outcomes is actually mandatory for Policy Change and Innovation Use (`alignment_validation`) | server (migration) |
