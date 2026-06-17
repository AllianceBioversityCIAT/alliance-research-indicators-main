# US4 — Map results to indicators including rules (Contributions)

| Field | Value |
| --- | --- |
| Jira id | [AC-1440](https://cgiarmel.atlassian.net/browse/AC-1440) |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Discovery | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Status | Open |
| Priority | Medium |
| Source | **DRAFT (PO-authored)** — Jira ticket has no description yet |
| Designs | [Figma file](https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR) — node TBD |

> ⚠️ **DRAFT.** This file is a PO proposal. The BA must validate and replace before the SDD feature spec is written.

---

## Story (DRAFT)

> **As a** STAR Principal Investigator (or result contact / admin) editing a Pool-Funding-aligned result,
> **I want** to select one or more ToC indicators from the panel surfaced by US3 and capture the result's contribution to each (qualitative narrative and/or quantitative value as required by the indicator type),
> **so that** my result is formally credited against the SP's ToC and ready for the PRMS push (US5).

---

## Context (DRAFT)

US3 displays the available indicators. **US4 is where the actual mapping happens** — selecting indicators and recording how the result contributes to each. Contribution data shape depends on the indicator type (e.g. capacity-sharing indicators require disaggregated participant counts; KP indicators require the handle; policy-change indicators require policy type/stage). This is the most rule-heavy story in the epic.

---

## Acceptance criteria (DRAFT)

- **AC.1** From the US3 panel, users can mark one or more indicators as "this result contributes to this indicator."
- **AC.2** For each selected indicator, the system displays a contribution form whose **shape depends on the indicator type**:
  - **Capacity sharing**: men / women / non-binary / unknown counts, training term, delivery method (mirrors PRMS `capacity_sharing` block).
  - **Knowledge product**: handle, KP type, peer-reviewed flag, ISI flag, accessibility flag, licence (mirrors PRMS `knowledge_product` block).
  - **Policy change**: policy type, policy stage, implementing organizations, optional amount (mirrors PRMS `policy_change` block).
  - **Innovation development**: typology, developers, readiness level (mirrors PRMS `innovation_development` block).
  - **Innovation use** (Phase 1: decide per **D5** in PRMS-context dossier).
  - **Other output/outcome**: free-text contribution narrative.
- **AC.3** Per-indicator validation enforces all required fields before save. Save is blocked otherwise.
- **AC.4** Users can **edit** or **remove** an existing mapping; remove triggers a confirmation.
- **AC.5** Each save creates / updates an audit row (`AuditableEntity` + `result_review_history`-style log entry).
- **AC.6** Authorization: same gating as US2 (Creator / PI / contact / admin).
- **AC.7** **Read-only** after PRMS sync (US5), matching US2 AR.2.
- **AC.8** Indicator contribution data **must not** be lost if the user re-opens the indicator selection — values persist per-indicator.
- **AC.9** If an indicator is removed from the SP's ToC catalog after a mapping was saved (catalog drift), the existing mapping is preserved but flagged as "stale" with an explanatory tooltip.

---

## Out of scope (DRAFT)

- Selecting the SP itself (US2).
- Showing the indicator catalog (US3).
- Pushing data to PRMS (US5).
- Editing ToC indicator definitions or thresholds.

---

## Dependencies

| Type | Dependency |
| --- | --- |
| Other US | **US3** must be live (indicator list source). Blocks US5. |
| ARI backend | New entity `result_pool_funding_indicator_mapping` (working name) joining `result` + indicator code + contribution payload (JSON or normalized per type). Reuses ARI's existing typed tables (`result_capacity_sharing`, `result_knowledge_product`, `result_innovation_dev`, `result_policy_change`); creates a new typed table for innovation use **only if** decision **D5** = A. |
| ARI endpoints | `GET / POST / PATCH / DELETE /api/v1/results/:result-code/pool-funding-alignment/indicators/:indicator-code/contribution`. |
| Catalog freshness | Depends on US7's ToC catalog sync. |
| Authorization | `ResultOwnerGuard` (introduced by US2). |

---

## Open questions

- **OQ-US4-1.** Where should the contribution payload live — denormalized JSON on a mapping table, or normalized into the existing typed result tables (`result_capacity_sharing`, etc.)? Recommendation: **reuse existing typed tables**, mirroring PRMS handler pattern — but verify with engineering.
- **OQ-US4-2.** What's the rule when the result has more than one selected indicator of the **same type**? Single contribution payload shared across them, or per-indicator copy?
- **OQ-US4-3.** Validation severity: are some fields warnings vs hard blockers? PRMS treats KP `issue_year` as a soft warning when missing.
- **OQ-US4-4.** Decision **D5** (add `result_innovation_use` entity) — confirm before writing requirements.
- **OQ-US4-5.** Catalog drift handling (AC.9) — does "stale" allow PRMS push (US5) to proceed, or block it?
- **OQ-US4-6.** Localization of contribution narratives (Spanish-language results exist — see OQ-F at the folder level).

---

## Traceability

- Jira: https://cgiarmel.atlassian.net/browse/AC-1440
- Epic: https://cgiarmel.atlassian.net/browse/AC-1385
- Discovery: https://cgiarmel.atlassian.net/browse/PARI-194
- PRMS-context (type-specific tables + handlers): [`../prms-context/02-ari-mapping.md` §8](../prms-context/02-ari-mapping.md), [`../prms-context/01-prms-backend-summary.md` §8](../prms-context/01-prms-backend-summary.md)
- PRMS-context (decision D5 — innovation_use entity): [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md)
- PRMS-context (backend-compatible typos to preserve): [`../prms-context/04-glossary.md`](../prms-context/04-glossary.md)

---

## Notes for the SDD feature spec

- **Most complex US in the epic** — likely its own feature folder under `docs/specs/bilateral-module/<feature>/`.
- **ARI side**:
  - Decide the storage model per OQ-US4-1 (reuse typed tables vs new mapping table). Recommended: **reuse existing typed tables** to align with PRMS contracts and ease the US5 push.
  - One controller endpoint per HTTP verb; service layer dispatches by indicator type via a `BilateralIndicatorTypeHandler` interface (mirrors PRMS pattern).
  - Validation via `ValidationPipe({ whitelist, forbidNonWhitelisted: false, transform: true })` — matches PRMS ingestion (forgiving on unknown).
  - Stale-flag in OpenSearch as `pool_funding_mapping_stale` boolean.
- **STAR side**:
  - Indicator-type-specific contribution form components.
  - Persist user input drafts locally if the user navigates away mid-edit.
- **Test coverage**:
  - Each indicator type's contribution payload validation (happy + each required-field-missing path).
  - Authorization denial paths (non-owner cannot save).
  - Read-only-after-sync behavior.
  - Catalog drift (delete an indicator from the catalog after mapping exists).
- **Blockers**: D5, OQ-US4-1, US3 must land before this US starts implementation.
