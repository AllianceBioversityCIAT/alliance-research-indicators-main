# Design — Bugfix / SP-alignment Sankey with empty lever `short_name`

- **Depth:** Lite (Bug Mode) · **Approval Mode:** pre-approved — Phase 2 gate: `auto-approved (pre-approved mode)`
- **Linked:** `./requirements.md`, `./proposal.md`

## Summary
Separate **identity** from **display** in `sp-alignment-graph.component.ts` `chartOptions()`: the lever node `name` becomes a stable key derived from `lever_id`, and the visible text comes from a label chain. `viz-chart`, server and DTO untouched.

## Component change (conceptual — no code here)
- Add a private helper `leverLabel(link)` → `short_name?.trim() || full_name?.trim() || \`Lever ${lever_id}\``; reuse it for the node display, the tooltip, the link `leverFullName`, and the `tableModel` row (NFR-SKY-001).
- Node `name` for real levers: use the label chain **as the name** (full names are unique in CLARISA) — chosen over a synthetic `lever:<id>` name because ECharts' sankey shows `name` as the label and a formatter-only approach would need per-node label config plus tooltip rewiring (more surface for a Lite fix). Uniqueness guard: if two distinct `lever_id`s resolve to the same label, suffix ` (<id>)` to the second — makes the invariant "distinct ids → distinct names" hold by construction.
- `No lever` / `Other levers` buckets unchanged.

## Design decisions
| # | Decision | Why |
| --- | --- | --- |
| DD-1 | Label chain as node name + collision suffix (Option A+guard) instead of synthetic identity name (Option B) | Smallest diff that removes the failure class; B's formatter/tooltip rewiring is out of proportion for Lite |
| DD-2 | No server `COALESCE` | Would change DTO semantics for all consumers and not protect against future empties (proposal Option C rejected) |
| DD-3 | Collision guard asserted by test (KZ-001: assert on produced `series[0].data`, never on call order) | The fixture data of this bug (two `""` levers) is exactly the falsifying input |

## Reversion challenge (Step 2.3)
Nothing delivered is removed/inverted — **skipped by rule** (Lite, additive).

## Budget (Step 2.4 tripwire)
**1 task · ≈ 40 LOC (≈ 15 component, ≈ 25 test) · 1 review round.** Matches Lite.
