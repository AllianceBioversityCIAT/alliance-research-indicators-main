# Proposal — PI Sync Control Panel (project level)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/pi-sync-panel` |
| Parent Spec | `bilateral/prms-sync` (see [`../family.md`](../family.md)) |
| Type | Change |
| Approval Mode | gated |
| Date | 2026-08-21 |
| Depends on | `prms-sync/sync-engine` |
| Slug | `pi-sync-panel` — derived from free-text argument |

## 2. Intent

The project PI answers, per project and at a glance: which results are **synced**, **pending sync** (ready but not pushed), **pending Pool Funding Alignment** (not yet eligible), **failed**, and — once the future PRMS phase lands — **accepted/rejected by the SP leader**. A per-project sync control panel, not another admin page.

## 3. Problem / Current Behavior

- Sync state (after children 1–2) lives per-result in the sidebar; nobody has a project-level view.
- `project-detail` lists linked results with lifecycle status but knows nothing about the PRMS pipeline stage.
- The PI **is** identifiable today (OQ-F4 closed): the contract-level Principal Investigator from AGRESSO (`principal_investigator` / `project_lead_description`, surfaced in My Projects), matched to STAR users via `is_principal` (`queryPrincipalInvestigator`) — but nothing yet *uses* that identity as a view guard for a sync panel.

## 4. Proposed Outcome

- A **"PRMS Sync" panel inside `project-detail`**: summary counts (chips/cards per pipeline state) + a results table with a per-result pipeline chip: `Pending Pool Funding Alignment` → `Ready to sync` → `Synced` / `Sync failed` (+ reserved future states `Accepted in PRMS` / `Rejected in PRMS`, rendered only when the data exists).
- Derived states come from one server aggregate endpoint (per project: result, lifecycle status, alignment completeness, sync status/last attempt, **`prms_result_code`** when synced) — the client derives nothing the server can state. Synced rows show the PRMS code as the cross-platform reference.
- Visibility: PI + Center Admin (+ SYSTEM_ADMIN); read-only — actions stay in children 2–3 (deep-link from a row to the result / to re-sync where the viewer's role allows).
- Status chips use tokens + non-color cues (icon + label), light/dark parity, table follows `results-table` patterns.

## 5. Scope

Client: `project-detail` panel + chips + table + tests. Server: one aggregate read endpoint (+ Swagger + tests). Copy for each pipeline state.

## 6. Non-Goals

- No sync/re-sync mutations here beyond deep links. No PRMS verdict *capture* (future family member — this panel only reserves the rendering slots). No cross-project global dashboard (project-level only, per the request).

## 7. Affected Users, Systems, And Specs

PIs (primary — new visibility), Center Admins; `project-detail` page; child-1 state model (must expose a queryable per-result status — design alignment needed).

## 8. Visual Reference

- Source: User-provided mockup (**Image #60**) — re-share to persist under `../mockup/`. This child is the strongest candidate for a generated mockup (`stitch-design` / `claude-design`) at `/akili-specify` if no Figma exists: it is a net-new screen section.

## 9. Requirement Delta Preview

### ADDED
- Project-level sync pipeline panel + aggregate endpoint + state chip system (future-proofed vocabulary).

### MODIFIED
- `project-detail` gains a section/tab.

### REMOVED
- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A (recommended)** | Section/tab inside `project-detail` fed by one aggregate endpoint | Where the PI already lives; no new route |
| B | Standalone dashboard page under Projects | More room, but new IA surface for one persona; defer until usage proves need |

## 11. Risks, Dependencies, And Open Questions

Blocked by `sync-engine` (state model). OQ-F4 closed — the guard builds on the existing `is_principal` match (plus Center Admin / SYSTEM_ADMIN). Risk: state derivation duplicated client/server drifts — server owns derivation (single source). Future verdict states must not require a schema break (child-1 design constraint, R-F1).

## 12. Success Criteria

- For a seeded project, the panel's counts and chips match the ground truth of each linked result (asserted on the aggregate endpoint AND the rendered DOM — KZ-001).
- A PI sees the panel on their project; a non-member does not (client + server tests).
- Light/dark parity on all chips; WCAG AA contrast.

## 13. Next Step

```text
/akili-specify bilateral/prms-sync/pi-sync-panel
```
