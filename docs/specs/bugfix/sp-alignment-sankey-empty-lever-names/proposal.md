# Proposal — Bugfix / SP-alignment Sankey renders blank when a lever has no `short_name`

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `bugfix/sp-alignment-sankey-empty-lever-names` |
| Slug | `sp-alignment-sankey-empty-lever-names` — derived from the free-text bug report (owner screenshot, project D514) |
| Type | **Bug** |
| Approval Mode | pre-approved (owner, 2026-08-25 — "como prefieras adelante"; exceptions still stop) |
| Depth (expected) | Lite · Bug Mode (mandatory regression test) |
| Depends on | none (independent of `changes/dashboard-chart-refinements`, whose T-05 HITL is pending — this fix should land before that HITL) |
| Parallel-safe | yes (touches `sp-alignment-graph.component.*` client-side only; server change optional, see Fix Strategy) |
| Origin | commit `b1bfa4d0` (`dashboard-chart-refinements` T-03 — Sankey replaces force-graph) |
| Author / date | Leader session, 2026-08-25 |

## Intent

Make the Science Program Alignments Sankey render for every project, regardless of whether CLARISA has assigned a `short_name` to a lever.

## Problem / Current Behavior

On `/project-detail/D514/project-dashboard` the "Science Program Alignments" card shows the header chips (5 aligned / 365 unaligned), the legend and the detail table, but the chart area is a blank 320 px box.

## Proposed Outcome

The Sankey renders all lever → SP flows; a lever without a short name is labeled by its full name (fallback chain), and node identity never depends on a display string.

## Scope

- `client/research-indicators/src/app/shared/...`: **no**.
- `client/.../project-detail/components/sp-alignment-graph/sp-alignment-graph.component.ts` — node naming / identity in `chartOptions()`.
- `sp-alignment-graph.component.spec.ts` — regression test.
- (Optional, server) `agresso-contract.repository.ts` flows query — `COALESCE(short_name, …)` is **not** recommended (see Options).

## Non-Goals

- Fixing `clarisa_levers` data in the shared dev DB (human decision — the rows for levers 11–14 legitimately have no short name today).
- Any other Sankey change (colors, caps, table) — the table height was fixed separately in `[SPEC:quick/sp-alignment-table-max-height]`.
- The local `saveErrors` self-reporting loop (documented K-005 trap; separate hardening if wanted).

## Affected Users, Systems, And Specs

- Users: every dashboard reader of a project whose results use levers 11–14 (the current CLARISA lever set) — i.e. most active projects.
- Specs: `changes/dashboard-chart-refinements` (owner of the Sankey; its T-05 HITL would have caught this).

## Visual Reference

- Source: owner screenshot (blank chart, 2026-08-25) — no mockup needed; the target state is "the Sankey draws".

## Bug Diagnosis

### Observed Symptom
Blank Sankey; the rest of the card works. Measured live in the embedded browser: `app-viz-chart svg` is 406×320 with `<g></g>` as its only child — **0 paths, 0 texts**. No ECharts error in console (the 1,000 console errors on that page are the unrelated K-005 `saveErrors` 504 loop).

### Reproduction Steps
1. Open `http://localhost:4200/project-detail/D514/project-dashboard` (any project with results on levers 11–14).
2. Observe `GET /api/agresso/contracts/reports/dashboard?contract-id=D514` → 200, `lever_sp_flows.links` (11 links, `count` numeric).
3. Distinct levers in the payload: `2:"Lever 2"`, `3:"Lever 3"`, `6:"Lever 6"`, `8:"Lever 8"`, **`11:""`, `12:""`, `13:""`, `14:""`** (full names present: Multifunctional Landscapes, Climate Action, Biodiversity for Food and Agriculture, Digital Inclusion). The `tops.primary_levers` sub-report returns the same levers with `short_name: null`.
4. Chart area renders nothing.

### Root Cause (confirmed)
`sp-alignment-graph.component.ts:131` builds each lever node with `name: link.lever_short_name`. `clarisa_levers.short_name` is empty for levers 11–14, so **four distinct levers become four nodes named `""`** (the `Map` is keyed by `lever:<id>`, so they are four entries, not one). ECharts' sankey resolves `links[].source` by node **name**; duplicate/empty names make the graph invalid and the series draws nothing. Cause = data shape (empty short names) × client using a display string as node identity. Not a rendering, registration or value-type issue (SankeyChart registered; `count` is a number; no cycle — node constants are distinct).

### Impact & Scope
Every project touching any lever without a short name → the whole chart disappears (not just those nodes). Tooltips/labels also depend on the same field. No data-integrity or security impact; the sr-only table and detail table remain correct.

### Fix Strategy
**Client, in `chartOptions()`:** give nodes a stable unique `name` derived from identity, and a separate display label —
`name: \`lever:\${link.lever_id}\`` with `label.formatter` → `short_name || full_name || \`Lever \${id}\`` (or simply use the fallback chain as the name, since full names are unique). Regression test: feed two links whose levers have `lever_short_name: ''` and distinct ids → assert the sankey `data` contains two nodes with distinct, non-empty names (red today: both `""`). Route: **`/akili-specify` Lite, Bug Mode** (logic change + test — not `/akili-quick`).

## Approach Options

| # | Option | Trade-off |
| --- | --- | --- |
| A | Client fallback chain for the node name (`short \|\| full \|\| Lever <id>`) | Smallest; fixes all environments; relies on full names being unique (they are — CLARISA names) |
| B | Client: identity name `lever:<id>` + display label via formatter | Most robust (identity never a display string); slightly more code (tooltip/label formatter) |
| C | Server: `COALESCE(NULLIF(short_name,''), full_name)` in the flows query | Hides the data gap for every consumer, but silently changes a DTO field's meaning and does not protect the client from future empty strings |

## Recommended Approach

**B** (identity name + display label), with A's fallback chain as the label. It removes the failure class, not just this instance, and keeps the DTO honest. Server untouched.

## Risks, Dependencies, And Open Questions

- Concurrent session: `dashboard-chart-refinements` owns this file and is active in this checkout — coordinate the commit (pathspec, additive change).
- OQ-1: should CLARISA data for levers 11–14 get a short name (product decision)? Out of scope here.
- KZ-001 applies: the regression test must assert on the produced `series[0].data` names, not on a call sequence.

## Success Criteria

- Sankey renders on D514 with 8 lever nodes, 4 of them labeled by full name.
- Regression test red on `HEAD~`, green after.
- Existing `sp-alignment-graph` spec (23 tests) unchanged and green.

## Next Step

```text
/akili-specify bugfix/sp-alignment-sankey-empty-lever-names   (Lite · Bug Mode)
```
