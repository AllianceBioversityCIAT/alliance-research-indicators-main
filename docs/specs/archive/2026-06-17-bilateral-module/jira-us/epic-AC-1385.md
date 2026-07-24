# Epic AC-1385 + Discovery PARI-194 — Module to map W3/Bilateral results to CGIAR Pool Funding (SP/A)

| Field | Value |
| --- | --- |
| Epic Jira id | [AC-1385](https://cgiarmel.atlassian.net/browse/AC-1385) |
| Epic status | Open (To Do) |
| Epic priority | Medium |
| Epic assignee | Daniela Zuñiga Pino |
| Epic creator / reporter | Hector Tobon |
| Discovery Jira id | [PARI-194](https://cgiarmel.atlassian.net/browse/PARI-194) |
| Discovery status | Delivery (In Progress) |
| Discovery quarter / roadmap | Q2 2026 / Next |
| Discovery T-shirt size | S — 2 to 4 Sprints |
| Digital Product | STAR |
| Product Area | Data IN |
| Designs | [Figma — bilateral mapping](https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR?node-id=26203-90593&t=ZCMPChzPg5fQEVo3-4) |

---

## Summary (from PARI-194)

A new section in STAR to enable the **mapping of W3/Bilateral project results to CGIAR Pool Funding (Science Programs and Accelerators)**, based on previously reported contributions in the W3/Bilateral Registry.

---

## Problem / Opportunity (from PARI-194)

Currently, there is no structured mechanism within STAR to explicitly associate results from bilateral projects with CGIAR Pool Funding contributions. Although centers report project-level contributions to Science Programs and Accelerators in the W3/Bilateral Registry, there is a gap in linking **individual results** to these frameworks. This limits the ability to track and validate how specific outputs contribute to pooled efforts.

---

## Potential impact (from PARI-194)

By introducing this section, STAR will allow Principal Investigators to:

1. **Confirm** whether a result contributes to Pool Funding.
2. If yes, **see pre-reported SPs / Accelerators** from the W3/Bilateral Registry for that result's project.
3. **Map** the result to a specific Theory of Change and corresponding indicator.

This strengthens traceability and accountability of bilateral project outcomes, improves the quality of aggregated reporting, and ensures alignment with CGIAR strategic priorities.

---

## Bounded scope of this epic

| In scope | Out of scope |
| --- | --- |
| Project-level "Pool Funding Contributor" tagging (US1) | Generic project taxonomy refactor |
| Per-result Pool Funding Alignment section (US2) | New result types beyond what STAR/ARI already support |
| Display of ToC indicators for selected SP (US3) | Editing or authoring of ToC trees |
| Result → indicator mapping with contribution rules (US4) | Re-modeling ARI's Lever / Strategic Outcome schema |
| Push results to PRMS via the bilateral ingestion contract (US5) | Replacing or rebuilding PRMS's bilateral module |
| Pull updates from W3 Registry into STAR (US6) | Replacing the W3 Registry |
| Pull ToC of Science Programs into STAR (US7) | Authoring ToC inside STAR |

---

## Why this matters for ARI (the backend behind STAR)

ARI is the system of record this epic depends on. Every STAR user story below maps to one or more endpoints + entities described in the [PRMS-context dossier](../prms-context/), specifically [`../prms-context/02-ari-mapping.md`](../prms-context/02-ari-mapping.md).

In short, this epic introduces into ARI:

- A new `bilateral` entity module under `domain/entities/bilateral/`.
- A new `ReportingPlatform` row (`BILATERAL`).
- New `result_status` rows (`BILATERAL_PENDING_REVIEW`, `BILATERAL_APPROVED`, `BILATERAL_REJECTED`) + `result_status_workflow` rules.
- A new `result_review_history` entity (justification-bearing audit log).
- New ingestion DTOs, type-specific handlers, machine-token auth, and three sync jobs.

See the full pillar lists in [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md).

---

## Story map (under this epic)

```
            AC-1385 (epic)
            ↑ implements
        PARI-194 (discovery)
            │
   ┌────────┼─────────────────────────────────────────────────┐
   ▼        ▼                                                 ▼
 US0       US1                  US2 ◀──── current branch     US3 ─ US4 ─ US5
 (mockups) (project tag)        (result alignment)            │      │     │
   │                                                          │      ▼     ▼
   └─────── DONE                                              └─► indicator
                                                                  mapping → push

                                            ┌─ US6 (sync W3 Registry → project tag)
                                            │
                                            └─ US7 (sync SP ToC → indicators)
```

- **US0** (history) — design mockup deliverables. Closed/Done.
- **US1** — Project-level: tag bilateral projects from AGRESSO as Pool Funding Contributor. Foundation for US2.
- **US2** — Result-level: surface a Pool Funding Alignment section on STAR results inside a tagged project. Foundation for US3/US4.
- **US3** — Result-level: when the user picks an SP, show that SP's ToC indicators.
- **US4** — Result-level: map the result to one or more indicators following per-indicator contribution rules.
- **US5** — System: push the approved result + its Pool Funding mapping into PRMS via the bilateral ingestion contract.
- **US6** — System: pull updates from the W3 Registry into STAR (keeps US1 tags fresh).
- **US7** — System: pull the ToC of each SP into STAR (keeps US3 indicators fresh).

---

## Acceptance criteria at the epic level

- AE.1 — STAR users can identify Pool Funding Contributor projects in lists, filters, exports, and result-creation flows.
- AE.2 — STAR users can mark a result as contributing to Pool Funding, picking from the SPs/Accelerators valid for that project.
- AE.3 — STAR users can map a Pool-Funding-contributing result to one or more ToC indicators with valid contribution data.
- AE.4 — Approved STAR results are pushed to PRMS via PRMS's bilateral ingestion API following the agreed payload contract, with idempotency and failure logs.
- AE.5 — Pool Funding Contributor tags and SP ToCs stay current via scheduled syncs from the W3 Registry and PRMS/CLARISA.
- AE.6 — All mutations are audited (`AuditableEntity`) and visible to admins; sync jobs write to `sync_process_log`.
- AE.7 — Authorization gates: only Creator / PI / contacts / Center Admin / System Admin can edit Pool Funding fields on a result; only Center Admin / PMU can manage project-level tags.
- AE.8 — Phase 1 scope respects decisions D1–D16 in [`../prms-context/03-reuse-and-decisions.md`](../prms-context/03-reuse-and-decisions.md), in particular D1 (machine-token auth), D3 (Lever-only ToC), D5 (defer innovation_use), D10 (snapshot on approval).

---

## Risks

Inherited from [`../prms-context/03-reuse-and-decisions.md` §4](../prms-context/03-reuse-and-decisions.md) plus story-specific ones tracked inside each US file.

---

## Open product questions

- See [README — Open questions section](./README.md) for OQ-A through OQ-G.

---

## Traceability

- Jira (epic): https://cgiarmel.atlassian.net/browse/AC-1385
- Jira (discovery): https://cgiarmel.atlassian.net/browse/PARI-194
- Figma: https://www.figma.com/design/5a9xZJdb2rZAQm2wdk1CNT/STAR?node-id=26203-90593
- PRMS-context dossier: [../prms-context/](../prms-context/)
- ARI baseline: [../../../prd.md](../../../prd.md), [../../../detailed-design/detailed-design.md](../../../detailed-design/detailed-design.md)

---

## Notes for the SDD feature spec

When this epic is sliced into a feature spec under `docs/specs/bilateral-module/<feature-slug>/`:

- The `<feature-slug>` should reflect the **phase**, not the epic id (e.g. `phase-1-project-tag-and-result-alignment` for US1+US2, then a separate spec for US3–US5, then sync-jobs spec for US6+US7).
- `requirements.md` should reference each US file in this folder by `Jira: AC-XXXX`.
- `design.md` should pull integration details from [`../prms-context/02-ari-mapping.md`](../prms-context/02-ari-mapping.md).
- `task.md` should respect dependency order: US1 → US2 → US3 → US4 → US5; sync jobs (US6, US7) can run in parallel once US1 / US3 land.
