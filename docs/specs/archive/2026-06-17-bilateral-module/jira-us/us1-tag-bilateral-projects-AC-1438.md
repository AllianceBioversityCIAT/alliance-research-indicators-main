# US1 — Tag Bilateral Projects Contributing to Pool Funding

| Field | Value |
| --- | --- |
| Jira id | [AC-1438](https://cgiarmel.atlassian.net/browse/AC-1438) |
| Epic | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Discovery | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Status | Open |
| Priority | Medium |
| Source | **Jira (full description + AC)** |
| Designs | [Figma — US1](https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR?node-id=33486-133230&t=75DyZixpTfjtK6tu-0) |

---

## Story

> **As a** Center Admin / PMU operator,
> **I want** to flag bilateral projects (from AGRESSO) that have been validated by the System Office as contributors to CGIAR Pool Funding,
> **so that** Principal Investigators can later associate the **results** of those projects with Science Programs and Accelerators in STAR.

---

## Context (from Jira)

The System Office collects a list of bilateral projects contributing to Pool Funding. This validated list is shared with each Center and needs to be reflected in STAR at the **project level**. Without this tag, STAR has no way to know which projects expose the Pool Funding Alignment section (US2) on their results.

This is the **first** story in the epic chronologically: tags persisted by US1 are read by every other story.

---

## Acceptance criteria (from Jira)

- **AC.1** A bilateral project listed in the bilateral mapping list is tagged as **Pool Funding Contributor** in STAR.
- **AC.2** A bilateral project **not** included in the list is **not tagged** in STAR.
- **AC.3** The Pool Funding tag is **visible** in:
  - the projects listing table,
  - as a filter in the projects and results tables,
  - in exported Excel files,
  - the result creation flow,
  - the project selectors inside the result.
- **AC.4** The tag is **stored persistently** in the STAR database.
- **AC.5** Only **bilateral projects from AGRESSO** can be tagged.
- **AC.6** Users can **filter** projects by `Pool Funding Contributor = Yes` and `Pool Funding Contributor = No`.
- **AC.7** The tag is **displayed in the project-detail header** when a tagged project is opened.

---

## Out of scope (for this US)

- Result-level mapping (that is US2).
- Editing the System Office's bilateral mapping list inside STAR (the list is sourced externally — see US6).
- Tagging non-bilateral / non-AGRESSO projects.

---

## Dependencies

| Type | Dependency |
| --- | --- |
| Other US | None upstream. Blocks US2, US3, US4, US5, US6. |
| ARI backend | Add a `is_pool_funding_contributor` column (or equivalent) to ARI's `AgressoContract` entity (`domain/entities/agresso-contract/`). Expose CRUD via a privileged endpoint. See [`../prms-context/02-ari-mapping.md` §4](../prms-context/02-ari-mapping.md) (data model mapping) and §5 (API surface). |
| AGRESSO | Bilateral project must exist in `agresso_contract`. |
| External | The "official internal list" from the System Office — format and storage to be confirmed (OQ-B in [README](./README.md)). |

---

## Open questions

- **OQ-US1-1.** Who maintains the "Pool Funding Contributor" list in STAR — Center Admin via a UI screen, or a periodic sync from a System Office source (US6)? (Likely both: bulk sync + manual override.)
- **OQ-US1-2.** When a project is **un-tagged**, what happens to results that were already mapped via US2? Lock them? Hide them? Warn the user?
- **OQ-US1-3.** Should the tag carry an "effective date" so that historical results retain their original tagging?
- **OQ-US1-4.** Is the tag immutable after a result has been pushed to PRMS (US5)?

---

## Traceability

- Jira: https://cgiarmel.atlassian.net/browse/AC-1438
- Epic: https://cgiarmel.atlassian.net/browse/AC-1385
- Discovery: https://cgiarmel.atlassian.net/browse/PARI-194
- Figma: https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR?node-id=33486-133230&t=75DyZixpTfjtK6tu-0
- PRMS-context (data-model mapping): [`../prms-context/02-ari-mapping.md` §4](../prms-context/02-ari-mapping.md)
- PRMS-context (decision on bilateral-projects vs AGRESSO): decision **D4** in [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md)
- PRMS-context (vocab): [`../prms-context/04-glossary.md`](../prms-context/04-glossary.md)

---

## Notes for the SDD feature spec

When this US is implemented:

- **ARI side**:
  - Add a migration to `agresso_contract` (or wherever bilateral projects live in ARI — confirm under `domain/entities/agresso-contract*/`) for the new flag, plus an audit-aware service to set/clear it.
  - Expose `GET /api/v1/agresso/contracts?pool-funding-contributor=true|false` (mirrors filter requirement AC.6).
  - Reflect the flag in OpenSearch via `@OpenSearchProperty` so STAR filters are fast.
  - Add a `sync_process_log` entry when the tag is updated by the W3 Registry sync (US6).
  - Audit columns from `AuditableEntity` capture who tagged + when.
- **STAR side**:
  - Add a column to the projects table, a filter chip, and a header badge on project detail.
  - Update the Excel exporter.
  - Update the project selector inside the result-creation flow.
- **Role gating**: `@Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)` on the mutate endpoint; read-only for `CONTRIBUTOR` / `MEL_REGIONAL_EXPERT`.
- **Test coverage**: filter combinations (Yes / No / All), tag immutability if AC.4 + OQ-US1-4 are confirmed, Excel export shape.
