# Proposal — Strategic (Impact) Outcomes for Innovation Use & Policy Change

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/add-strategic-outcomes-field` |
| Slug | `add-strategic-outcomes-field` — derived from free-text argument (no slug/path was given; input was a pasted ticket) |
| Type | **Change** |
| Approval Mode | `gated` (default — no end-to-end mandate given) |
| Parent Spec | none |
| Date | 2026-09-04 |
| Requester context | Pasted ticket ("Add the Strategic Outcomes field...") + a screenshot of the current OICR Alliance Alignment screen |

## 2. Intent

Make the **Impact Outcomes** field on the Alliance Alignment screen (what the ticket calls "Strategic Outcomes") appear and save for **Innovation Use** results, exactly as it already does for **OICR** and **Policy Change**, in the 2026‑2030 portfolio.

## 3. Problem / Current Behavior

The field the ticket calls "Strategic Outcomes" already exists in the code as **Impact Outcomes** — confirmed by the screenshot itself, whose highlighted control's placeholder reads *"Select the impact outcomes"*. It lives on the **Portfolio‑2 (2026‑2030) Alliance Alignment screen** (`AllianceAlignmentP2Component`), directly below Research Areas / Strategic Objectives.

Today it is gated to exactly two indicators, on **both** tiers, independently:

| Layer | File | Gate |
| --- | --- | --- |
| Client (show) | `alliance-alignment-p2.component.ts:31-34` | `shouldShowImpactOutcomes()` → `indicatorId === 4 \|\| indicatorId === 5` |
| Client (save) | `alliance-alignment.component.ts:355-357` | `includeImpactOutcomes = isOicrIndicator() \|\| isPolicyChangeIndicator()` |
| Server (find) | `portfolio-2-alignment.handler.ts:133-137` | `[IndicatorsEnum.OICR, IndicatorsEnum.POLICY_CHANGE].includes(...)` |
| Server (save) | `portfolio-2-alignment.handler.ts:90-94` | same allow-list |

`IndicatorsEnum` (`server/.../indicators/enum/indicators.enum.ts`) defines:

| id | Indicator |
| --- | --- |
| 1 | Capacity Sharing for Development |
| 2 | Innovation Development |
| 4 | Policy Change |
| 5 | OICR |
| **6** | **Innovation Use** |

**Innovation Use is indicator `6` — a distinct indicator from Innovation Development (`2`), and it is absent from all four gates above.** So today, an Innovation Use result never shows or saves Impact Outcomes on Alliance Alignment, even in Portfolio 2. Policy Change (`4`) is **already implemented** — the ticket lists it alongside Innovation Use, but no code change is needed there; it's included below only as a regression-safety boundary.

## 4. Proposed Outcome

For a result whose `indicator_id = 6` (Innovation Use) in Portfolio 2 (2026‑2030):
- Alliance Alignment shows the **Impact Outcomes** multiselect, required, identical in behavior/copy to how it renders for OICR and Policy Change today.
- Saving the section persists `impact_outcomes`; reloading the result returns them.

No change for any other indicator or for Portfolio 1 (legacy, pre‑2026 results), which does not use this component path at all.

## 5. Scope

- `client/research-indicators/src/app/pages/platform/pages/result/pages/alliance-alignment/portfolio/alliance-alignment-p2.component.ts` — add indicator `6` to `shouldShowImpactOutcomes()`.
- `client/research-indicators/src/app/pages/platform/pages/result/pages/alliance-alignment/alliance-alignment.component.ts` — add indicator `6` to the `includeImpactOutcomes` save gate (`savePortfolioP2Alignment`).
- `server/researchindicators/src/domain/entities/results/portfolio-handlers/sections/alignment/portfolio-2/portfolio-2-alignment.handler.ts` — add `IndicatorsEnum.INNOVATION_USE` to **both** `.includes([...])` checks (`find` and `save`).
- **New migration** — `alignment_validation` MySQL function (currently defined in `db/migrations/1783021729548-UpdateAlignmentValidation.ts`): extend its Portfolio‑2 "impact outcomes required" branch from `result_indicator = 5` to `result_indicator in (4, 5, 6)`. Found during `/akili-specify` — see the correction in §11.
- Matching spec updates: `alliance-alignment-p2.component.spec.ts`, `portfolio-2-alignment.handler.spec.ts` (and any alliance-alignment.component spec covering the save gate). The migration has no Jest equivalent — see the manual gate in `requirements.md` §7.

**KZ-002 applies directly here** ("enumerating scope by feature folder misses shared components on the same route"): the same allow-list is duplicated in **5** places across 2 tiers (4 display/save sites + 1 validator). `/akili-specify` should treat all five as one atomic change with dedicated tests/checks proving each stays in sync, not five independent edits.

## 6. Non-Goals

- **Not building a dedicated "Innovation Use" results-detail tab.** See Risks §12 — this is a separate, larger gap discovered during investigation, out of scope for this ticket's stated acceptance criteria (which only names the Alliance Alignment section).
- **Not renaming** the shipped "Impact Outcomes" label/copy to "Strategic Outcomes" — see Open Question in §12.
- Not touching Portfolio 1 (legacy) Alliance Alignment, Innovation Development (`2`), or Capacity Sharing (`1`).

## 7. Affected Users, Systems, And Specs

- **Result Contributor / Researcher** creating or editing an Innovation Use result in the 2026‑2030 portfolio.
- **MEL Regional Expert** reviewing such results.
- Systems: `AllianceAlignmentP2Component` (client), `Portfolio2AlignmentHandler` (server), `ResultImpactOutcomesService` (unchanged — already indicator-agnostic).
- No existing spec under `docs/specs/` currently owns this behavior; no collision found.

## 8. Visual Reference

- Source: Two mockups, both generated in-session (no Figma link was available; Stitch MCP has no tools registered here):
  1. **Static HTML sketch** — `docs/specs/changes/add-strategic-outcomes-field/mockup/alliance-alignment-innovation-use.html`. Faithfully reproduces the existing, already-shipped Alliance Alignment (Portfolio 2) screen using real STAR tokens (colors, layout, field order) — no new component or style. Only the "Impact Outcomes" field is highlighted (dashed blue outline, "NEW" tag).
  2. **Clickable prototype (Claude Design canvas)** — published at https://claude.ai/code/artifact/6df6d567-a4e8-4a05-9220-c3ad113a4c48. All dropdowns/checkboxes are functional, and an **"Indicator" tweak** lets a reviewer switch live between OICR / Policy Change / Innovation Use / Innovation Development / Capacity Sharing to see the exact gating rule in action: "Impact Outcomes" appears for OICR, Policy Change and Innovation Use (tagged **NEW** only for Innovation Use — the one indicator this proposal adds), and stays hidden for Innovation Development and Capacity Sharing. Working files: `docs/specs/changes/add-strategic-outcomes-field/mockup/functional/` (`Main.dc.html`, `canvas.json`).
- Notes: Both mockups reuse the real STAR tokens observed in the codebase (`--ac-primary-blue-300 #345b8f`, `--ac-green-500 #358540`, `--ac-orange-1 #f58220`, border `#e8ebed`, text `#4c5158`/`#777c83`, fonts Space Grotesk / Barlow) — no invented visual language. Project / objective / impact-outcome / SDG option labels in the prototype are **illustrative sample data** (the real CLARISA-backed catalogs weren't queried in this session); Research Areas labels are verbatim from the ticket's own screenshot. Also referenced: the ticket's screenshot of the current OICR Alliance Alignment screen (pasted inline, not saved as a file), which confirms the target field's copy ("Select the impact outcomes") and required-field treatment.

## 9. Requirement Delta Preview

### ADDED Requirements
- None — no new field or component.

### MODIFIED Requirements
- Alliance Alignment (Portfolio 2) shows the Impact Outcomes multiselect, marked required, when `indicator_id ∈ {4, 5, 6}` (was `{4, 5}`).
- The Portfolio‑2 alignment save/find payload includes `impact_outcomes` when `indicator_id ∈ {4, 5, 6}` (was `{4, 5}`), on both client and server.

### REMOVED Requirements
- None.

## 10. Approach Options

| Option | Description | Trade-off |
| --- | --- | --- |
| **A — Extend the enum allow-list (recommended)** | Add `IndicatorsEnum.INNOVATION_USE` to the 4 existing gates listed in §5. | Smallest possible diff; reuses a fully-built, already-tested field; matches "work the same way as OICRs" literally. |
| B — Config-driven indicator gating | Replace the hardcoded `[OICR, POLICY_CHANGE]` arrays with a data-driven list (e.g. portfolio/indicator config table) so future indicators don't need a code change. | More flexible long-term, but every sibling field on this same screen (`research_areas`, `strategic_objectives`) is gated the same hardcoded way — introducing config-driven gating for only this one field is inconsistent and out of proportion to the ask. |
| C — Defer until the Innovation Use tab is built | Bundle this fix into the (currently unscoped) work to give Innovation Use its own results-detail tab. | Safer sequencing, but blocks a small, independently valuable, low-risk fix behind unscoped, unbounded work. |

## 11. Recommended Approach

**Option A**, revised during `/akili-specify` (see the correction below): a 5-site change — the 4 sites named here, plus a migration to the `alignment_validation` MySQL function so the field is *actually* mandatory, not just visually marked. Still no new UI, no CLARISA/AGRESSO dependency, no new entity — the smallest safe path that satisfies the literal acceptance criteria plus a real "required" enforcement.

**Correction found during `/akili-specify` (user asked to double-check the validators):** this proposal originally said "no migration." That was wrong. The field's `[isRequired]="true"` is a **client-only visual cue** — the actual mandatory-field gate that blocks Submit is a MySQL stored function, `alignment_validation`, whose Portfolio‑2 branch only requires `impact_outcomes` when `indicator_id = 5` (OICR). **Policy Change (`4`) can be submitted today with Impact Outcomes empty** — the "required" asterisk is cosmetic for Policy Change already, independent of this change. Full detail in `requirements.md` R-ALN-003.

## 12. Risks, Dependencies, And Open Questions

- **Risk / open question — Innovation Use has no results-detail tab today.** `result-sidebar.component.ts`'s `allOptions` list (the source of which indicator-specific tab renders) has entries for `indicator_id` 1, 2, 4, 5 — **none for 6**. `cache.service.ts`'s `currentResultIndicatorSectionPath()` switch likewise has no `case 6`, so clicking "Next" from Alliance Alignment on an Innovation Use result today navigates to a blank path (`''`). This proposal does **not** fix that — Alliance Alignment is still directly reachable via the sidebar regardless, so the Impact Outcomes fix delivers value on its own, but the user should confirm whether the missing tab is: (a) already tracked in another spec/ticket, (b) intentionally deferred, or (c) something to raise as a follow-up proposal.
- **Open question — is "Strategic Outcomes" a naming preference or a rename ask?** The ticket's own screenshot shows the shipped placeholder "Select the impact outcomes" for the exact field being requested. Recommendation: keep the existing "Impact Outcomes" label as-is (it's implemented, tested, and matches the screenshot) unless the user explicitly wants a copy change — a pure rename would be a trivial follow-up, not part of this change.
- **Risk — duplicated gate, now 5 sites, 2 tiers.** See KZ-002 in §5: a partial edit (e.g., client shows the field but the server `find`/`save` gate — or the SQL validator — is missed) produces a field that renders, accepts input, but either silently fails to persist or never actually blocks an incomplete submission. `requirements.md` §7 maps each site to its own gate, including a manual gate for the SQL function (no Jest test can execute a MySQL stored function).
- **Dependency:** none external. `result_impact_outcomes` / `impact_outcome` entities and the `GetImpactOutcomesService` control-list are already portfolio-scoped, not indicator-scoped — no schema or CLARISA change needed. The migration only edits an existing function's body; no new column/table.

## 13. Success Criteria

- Innovation Use (`indicator_id = 6`) result in Portfolio 2: Alliance Alignment renders "Impact Outcomes" (required), matching OICR/Policy Change pixel-for-pixel (same component, no new markup).
- PATCH persists `impact_outcomes` for indicator 6; a subsequent GET returns them.
- No regression: indicators 4 and 5 unchanged; Portfolio 1 legacy path unaffected (different component branch).
- `alliance-alignment-p2.component.spec.ts` and `portfolio-2-alignment.handler.spec.ts` both gain an indicator‑6 case mirroring their existing indicator‑5 case.

## 14. Next Step

```text
/akili-specify docs/specs/changes/add-strategic-outcomes-field
```
