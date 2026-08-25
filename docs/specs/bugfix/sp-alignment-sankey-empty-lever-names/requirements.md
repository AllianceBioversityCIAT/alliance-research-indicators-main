# Requirements — Bugfix / SP-alignment Sankey with empty lever `short_name`

- **Spec path:** `bugfix/sp-alignment-sankey-empty-lever-names` · **Type:** Bug · **Depth:** Lite (Bug Mode)
- **Approval Mode:** pre-approved (owner, 2026-08-25) — Phase 1 gate: `auto-approved (pre-approved mode)`
- **Source of truth:** `proposal.md` → Bug Diagnosis (root cause confirmed live 2026-08-25)

## Executive summary
The Sankey in `sp-alignment-graph` must render whenever `lever_sp_flows.links` is non-empty, even when one or more levers have an empty/null `short_name` (levers 11–14 today). Node identity must never be a display string.

## Glossary
- **Lever node** — one Sankey node per distinct `lever_id` (or the `No lever` bucket).
- **Display label** — `short_name || full_name || "Lever <id>"`.

## Scope
In: `sp-alignment-graph.component.ts` `chartOptions()` node naming/labeling + regression test. Out: server query, CLARISA data, any other Sankey behavior.

## Functional requirements

### R-SKY-001 — Distinct lever nodes regardless of `short_name`
The Sankey SHALL create one node per distinct lever with a **unique, non-empty** node name, and SHALL label it with `short_name`, falling back to `full_name`, then `Lever <id>`.

#### Scenario: Two levers without short names (the D514 case)
- GIVEN `lever_sp_flows.links` contains links for `lever_id` 11 (`short_name: ""`, `full_name: "Multifunctional Landscapes"`) and 12 (`short_name: ""`, `full_name: "Climate Action"`), both to `SP06`
- WHEN `chartOptions()` is computed
- THEN `series[0].data` contains two lever nodes with **different, non-empty** names
- AND every `series[0].links[].source` equals the name of exactly one node
- AND the rendered label / tooltip for lever 11 reads "Multifunctional Landscapes"
- BUT it must NOT emit any node whose name is `""`, and must NOT merge distinct `lever_id`s into one node
- AND IT MUST keep levers that do have a short name labeled by it (`"Lever 3"` stays `"Lever 3"`).

#### Scenario: null short name (tops-shaped payload)
- GIVEN a link with `lever_short_name: null` — THEN same outcome as `""`.

## Non-functional
- NFR-SKY-001: no change to the sr-only `tableModel` (still uses the same label chain — a `""` cell there is also a defect; assert it uses the fallback).

## Defect classes → gate
| Class | Gate |
| --- | --- |
| Empty/duplicate node names (this bug) | Regression test on `chartOptions()` output (`series[0].data` names) — **red on HEAD, green after** |
| Label regression for named levers | Same test, second assertion |
| Visual: chart actually draws in a browser | jsdom cannot; **owner check on D514 after deploy/`ng serve`** (accepted human gate; T-05 of `dashboard-chart-refinements` also covers) |

## Requirement index
R-SKY-001 · NFR-SKY-001
