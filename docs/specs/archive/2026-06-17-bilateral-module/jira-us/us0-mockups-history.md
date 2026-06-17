# US0 — Mockups history (AC-1386 + AC-1413)

> **Combined record** for the two US0 stories that delivered the design baseline before any STAR engineering started. Both are closed/done; this file exists so that the design decisions baked into the mockups are not lost as the team moves into implementation.

---

## AC-1386 — Create Mockups for W3/Bilateral Mapping with PRMS ToC Tool

| Field | Value |
| --- | --- |
| Jira id | [AC-1386](https://cgiarmel.atlassian.net/browse/AC-1386) |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Discovery | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Status | **Closed** |
| Priority | Medium |
| Source | Jira (minimal description — mockup link only) |
| Designs | [Figma — initial mockups](https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR?node-id=30222-112062&t=FYy3O44veesdGCKI-4) |

### Outcome captured (per Jira)
> Mockups finalized. User stories are pending to be designed.

### What this means for the team
- The design surface for the bilateral module **exists** and is the visual contract for US1–US7.
- Open the Figma file above before refining or rejecting any AC proposal in the downstream US files.
- If a downstream US conflicts with the mockups, raise it as an open question rather than diverging silently.

---

## AC-1413 — Validate and refine mockups on how STAR Results will be pushed to PRMS

| Field | Value |
| --- | --- |
| Jira id | [AC-1413](https://cgiarmel.atlassian.net/browse/AC-1413) |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Discovery | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Status | **Done** |
| Priority | **High** (only High-priority story in this epic) |
| Source | Jira (minimal description — mockup link only) |
| Designs | [Figma — push-to-PRMS mockups](https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR?node-id=32470-3149&t=jann4Va7PNDV3drp-4) |

### Outcome captured (per Jira)
Mockup validation and refinement of the push-to-PRMS flow — corresponds to US5 visual contract.

### What this means for the team
- The visual contract for **US5 (push results to PRMS)** is locked in this Figma node.
- The integration target — PRMS bilateral ingestion endpoint — is described in [`../prms-context/01-prms-backend-summary.md` §4–§9](../prms-context/01-prms-backend-summary.md).

---

## Design decisions inherited from the mockups

These are not in the Jira tickets but are visible in the Figma mockups. Capture them here so the team does not re-debate them.

> ⚠️ **PO-asserted, not Jira-asserted.** Confirm with the design owner before treating as locked. Replace with the actual decisions once validated.

- **D-MK-1.** The "Pool Funding Alignment" section appears on the result detail page, not as a separate page.
- **D-MK-2.** Project-level "Pool Funding Contributor" tag is shown in (a) the projects table, (b) the project-detail header, (c) the project selector when creating a result.
- **D-MK-3.** SP / Accelerator selection on a result is a multi-select restricted to SPs valid for the result's project.
- **D-MK-4.** ToC indicators are displayed grouped by Science Program / Accelerator, not as a flat list.
- **D-MK-5.** Indicator contribution data is captured inline (no separate modal) per indicator.
- **D-MK-6.** Push-to-PRMS is initiated automatically upon STAR result approval; a manual retry control is provided for admins.

---

## Traceability

- Jira AC-1386: https://cgiarmel.atlassian.net/browse/AC-1386
- Jira AC-1413: https://cgiarmel.atlassian.net/browse/AC-1413
- Epic AC-1385: https://cgiarmel.atlassian.net/browse/AC-1385
- Discovery PARI-194: https://cgiarmel.atlassian.net/browse/PARI-194
- Figma file (all mockups): https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR

---

## Notes for the SDD feature spec

- The feature spec should **link** to the relevant Figma node, not re-draw mockups in markdown.
- For any Phase 1 deviation from the mockups, capture a row in the design decisions log of the spec's `design.md`.
- Mockups are the **visual contract** for STAR; the **API contract** for ARI is in [`../prms-context/01-prms-backend-summary.md`](../prms-context/01-prms-backend-summary.md).
