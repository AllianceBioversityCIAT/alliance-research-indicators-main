# Requirements — Changes / Executive Overview Clear Placement (`ai-overview-placement`)

- **Module:** changes (STAR client — `project-dashboard`)
- **Spec id:** 2026-08-ai-overview-placement
- **Status:** draft · **Depth:** Lite · **Approval Mode:** gated
- **Owner:** j.cadavid@cgiar.org · **Last updated:** 2026-08-22
- **Linked proposal:** ./proposal.md · **Extends:** `docs/specs/archive/2026-08-22-changes--dashboard-advanced-analytics/` (D-PD-8/D-PD-9 invariants) — archive frozen; reconciliation recorded here

**Context (short):** a generated AI Executive Overview is invisible today — it renders inside the collapsed "AI Grounding & Executive Overview" section at the bottom of the dashboard. Visibility *logic* is correct (verified in the proposal); *placement* buries it. Split presentation from administration: summary up top when it exists, admin machinery stays at the bottom unchanged.

---

## Functional requirements

### R-AIP-001 — Prominent summary card when a summary exists

The dashboard SHALL render a compact **Executive Overview card high on the page** (adjacent to the Project Context strip — exact side settled at HITL, proposal OQ-1) whenever a generated summary exists, for every role.

#### Scenario: summary exists (any role)
- GIVEN a contract with a generated summary (e.g. ULZ53's, generated 13/08)
- WHEN the dashboard loads
- THEN the card renders above the analytics charts with: "Executive Overview" title, "Generated on …" date, the "Grounded AI Summary" pill, and the summary text collapsed to the first paragraph with a **"View more"** expansion control
- AND "View more" toggles the remaining paragraphs (`aria-expanded` on the control)
- BUT it must NOT reorder or restyle the caveat banner, KPI strip, charts, or pending table
- AND IT MUST render the card's content from the same signals the bottom section used (no second fetch, no new service call)

### R-AIP-002 — State matrix: absence stays silent; admin setup stays put

#### Scenario matrix (rendered DOM, all four cells tested)
| Role | Summary | Prominent card | Bottom AI section |
|---|---|---|---|
| non-admin | none | **absent** | **absent** (as today) |
| non-admin | exists | present | **absent** — presentation moved out; non-admins have nothing left to see below |
| admin | none | **absent** | present under today's exact gate (docs OR loading OR error), renamed to setup-only ("AI Grounding & Setup"); contains **no** summary-presentation card |
| admin | exists | present | present (setup only) |

- BUT it must NOT show any empty/placeholder AI card when no summary exists (no "generate one!" teaser for non-admins)
- AND IT MUST keep the admin bottom section's visibility condition semantically identical to today's admin branch of `showExecutiveOverview` (minus the presentation duplicate)

### R-AIP-003 — D-PD-9 invariants preserved (regression fence)

The admin bottom section SHALL keep, byte-for-byte in behavior: `[hidden]` collapse (file input never destroyed by `@if`), "Generating summary…" progress visible from the collapsed header, auto-expand on Generate, and the generation/upload flows untouched.

- BUT it must NOT alter `DocumentOverview` service calls, generation flow, grounding-doc management, or the caveat banner (proposal non-goals)
- AND IT MUST leave the existing D-PD-9 spec tests passing **unmodified** — they are the fence; editing them to pass is a red flag, not a fix

## Non-functional / defect classes → gates

| Defect class | Gate | Cannot reach (KZ-017) |
|---|---|---|
| State-matrix regressions | New rendered-DOM tests (all 4 cells) asserting card presence/absence + **DOM order** (card precedes the charts section) — KZ-001: assert the rendered output, not computed signals alone | Visual prominence/legibility — jsdom has no layout |
| D-PD-9 regressions | Existing spec tests, unmodified (see R-AIP-003) | — |
| Type errors | `npm run build` · `npx tsc -p tsconfig.spec.json --noEmit` (945 baseline) | build ignores specs; spec-gate baseline, not zero |
| **Visual placement (dominant class)** | **No automated gate** — substitute: HITL browser check (both placements from OQ-1 compared live, light + dark) | — |
| A11y on the new control | Manual: "View more" keyboard-reachable, `aria-expanded` correct; verified at HITL | No automated axe run wired in this repo |

**No data / API / cross-system impact.** Client template + component state only; no server diff.

## Requirement index
R-AIP-001 (prominent card) · R-AIP-002 (state matrix) · R-AIP-003 (invariants fence)

## Sign-off
- [ ] Engineering lead — j.cadavid
- [ ] Product owner — (user, at HITL placement decision)
