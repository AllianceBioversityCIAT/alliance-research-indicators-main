# US3 — Display ToC Indicators as per selected Science Program

| Field | Value |
| --- | --- |
| Jira id | [AC-1439](https://cgiarmel.atlassian.net/browse/AC-1439) |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Discovery | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Status | Open |
| Priority | Medium |
| Source | **DRAFT (PO-authored)** — Jira ticket has no description yet |
| Designs | [Figma file](https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR) — node TBD |

> ⚠️ **DRAFT.** This file is a PO proposal. The BA must validate and replace before the SDD feature spec is written.

---

## Story (DRAFT)

> **As a** STAR Principal Investigator (or result contact / admin) editing a result that has at least one Science Program selected in the Pool Funding Alignment section (US2),
> **I want** STAR to show me the Theory of Change indicators of each selected SP / Accelerator,
> **so that** I can choose which indicator(s) my result contributes to in the next step (US4).

---

## Context (DRAFT)

US2 lets the user say "this result contributes to SP01" but stops there. US3 is the **display** step: when the user opens the result, STAR fetches and renders the ToC indicator catalog for each selected SP/Accelerator. US4 is the actual mapping/saving step. US7 keeps the ToC catalog fresh.

Without US3, the user has no way to find the right indicator inside the SP's ToC tree.

---

## Acceptance criteria (DRAFT)

- **AC.1** When a result has at least one SP selected via US2, STAR displays a "ToC Indicators" panel listing all indicators of those SPs.
- **AC.2** Indicators are **grouped by SP / Accelerator** (matches design decision D-MK-4 from US0 mockup history).
- **AC.3** Each indicator row shows at least: indicator code, name, indicator type (output / outcome / 2030 outcome), and target description.
- **AC.4** Users can **filter / search** indicators by name, code, or type within the panel.
- **AC.5** When no SP is selected (US2 = No, or empty), the panel is hidden or shows an explicit empty state.
- **AC.6** When the SP's ToC catalog is empty or not yet synced (US7 hasn't run), the panel shows a clear "ToC not available" state with a help link.
- **AC.7** Loading + error states are handled (skeleton on fetch, retry on error).
- **AC.8** The panel is read-only in US3 (selection is US4).
- **AC.9** Data is sourced from a STAR-cached copy of the SP ToC (fed by US7), not by live-calling PRMS / CLARISA on every page load.

---

## Out of scope (DRAFT)

- Mapping the result to an indicator + capturing contribution data (US4).
- Authoring or editing the ToC tree.
- ToC level navigation beyond indicators (e.g. ToC-result narrative).

---

## Dependencies

| Type | Dependency |
| --- | --- |
| Other US | **US2** (SP selection must exist) and **US7** (ToC catalog must be synced) must be live. Blocks US4. |
| ARI backend | New read endpoint `GET /api/v1/results/:result-code/pool-funding-alignment/indicators` returning indicators grouped by SP code. Backed by ARI's existing Lever / Strategic Outcome / SDG / Impact Area schema (see decision **D3** in [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md)). |
| Catalog freshness | Depends on US7's scheduled sync writing into ARI / STAR cache. |

---

## Open questions

- **OQ-US3-1.** Source of truth for ToC indicators in Phase 1 — D3 in `../prms-context/03-reuse-and-decisions.md` recommended Lever-only mapping. Confirm whether the indicators shown in US3 come from PRMS ToC or from ARI's `LeverStrategicOutcome` / `LeverSdgTargets`.
- **OQ-US3-2.** How many SPs can be selected in US2 in practice? If users can pick 5+ SPs, the panel may become unwieldy — pagination?
- **OQ-US3-3.** Do indicators have **eligibility rules** per result type (KP, capacity, innovation dev, etc.)? Should the panel pre-filter out indicators that don't apply to the result's type?
- **OQ-US3-4.** Permissions: same gating as US2 (Creator/PI/contact/admin can view + later select), or all users with read access to the result?

---

## Traceability

- Jira: https://cgiarmel.atlassian.net/browse/AC-1439
- Epic: https://cgiarmel.atlassian.net/browse/AC-1385
- Discovery: https://cgiarmel.atlassian.net/browse/PARI-194
- PRMS-context (ToC mapping § 7): [`../prms-context/02-ari-mapping.md`](../prms-context/02-ari-mapping.md)
- PRMS-context (decision D3): [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md)
- PRMS-context (terms): [`../prms-context/04-glossary.md`](../prms-context/04-glossary.md)

---

## Notes for the SDD feature spec

- **ARI side**:
  - Read-only endpoint joining `result` → `result_pool_funding_alignment` (US2) → SP code → indicators via the chosen ToC mapping (D3).
  - Cache hits served from ARI's database; underlying data refreshed by US7's cron.
  - OpenSearch is NOT required here (read pattern is per-result).
- **STAR side**:
  - Pure presentation. No mutation.
  - Component is responsible for empty / loading / error states.
- **Test coverage**:
  - Visibility based on SP selection state (US2).
  - Grouped rendering by SP.
  - Filter / search behavior.
  - Empty / loading / error states.
- **Blocker** for US4 — write US3 first.
