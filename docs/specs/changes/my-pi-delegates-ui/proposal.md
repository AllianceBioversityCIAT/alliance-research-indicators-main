# Proposal — My PI Delegates (Frontend / STAR screen)

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/my-pi-delegates-ui/` |
| Slug | `my-pi-delegates-ui` |
| Type | **Change** (client / STAR only) |
| Approval Mode | gated |
| **Depends on** | `docs/specs/changes/my-pi-delegates/` (backend PI Delegates — must ship first) |
| Parallel-safe | no (consumes the backend delegation API) |
| Related | AC-1733 |
| Status | Draft — awaiting approval |

**Scope of this spec:** the **frontend module "My PI Delegates"** that lives inside the **PI** area of STAR — the screen where a PI manages the delegates of their projects. This is the visual/interaction layer only; the delegation model, `isPi()` extension, and CRUD API are the sibling **backend** spec.

## Intent

Build the **My PI Delegates** screen in STAR so a Principal Investigator can see and manage their PI Delegates from one place, matching the approved mockup and STAR's existing design system.

## Problem / Current Behavior

The backend spec makes a delegate behave like a PI and exposes a delegation CRUD API, but there is **no UI** for a PI to create/see/revoke delegations — today it can only be done by direct API. This spec adds that screen.

## Proposed Outcome

A `my-pi-delegates` STAR page with:
- **By project** view (default): each of the PI's projects + its delegates; projects **without** a delegate highlighted.
- **By person** view: each delegate + the projects where they are assigned.
- **Summary header:** total PI projects · people in the review team · projects without a delegate.
- **Assign panel:** searchable multi-select of eligible people × multi-select of the PI's projects → creates every (person × project) delegation; no duplicates; not self; Accept disabled until ≥1 + ≥1; confirmation dialog naming people/projects/effect + success toast.
- **Edit** pre-fills the same panel from either view.
- **Revoke** with confirmation.
- **History panel:** granted/revoked events (actor, person, project, timestamp), newest first, read-only.

All built with **STAR's design system** — PrimeNG Aura, token utilities (`.abc-*`/`.atc-*`/`.rs-*`/`.fs-*`, `var(--ac-*)`), and existing shared components (`MultiselectComponent`, etc.). **The mockup is a guide** for layout/flow/copy; **colors, typography, sizing and components come from STAR**, not the mockup's own styling. No hex literals.

## Scope

**In scope:** the `my-pi-delegates` route + page + subcomponents (summary, by-project, by-person, assign-panel, history-panel), the client service that consumes the backend API, and the nav entry under the PI area. Loading/empty/error/success states.

**Non-goals:** the delegation data model, `isPi()`/metadata changes, and the CRUD endpoints (all in the backend spec); any role/RBAC; changing global results-permission logic.

## Affected Users, Systems, And Specs
- **PI / PI Delegate** — primary users (a delegate self-manages, since backend treats them as PI).
- **Client STAR** — new page + service + nav entry.
- **Backend spec** — this UI **requires** a few read endpoints (see Backend Dependencies).

## Visual Reference
- **Source:** approved mockup — `mockup/My-PI-Delegates.html` (persisted in this spec) + design link `https://claude.ai/design/p/65f82161-827c-4356-bb35-6443c0b9329d?file=My+PI+Delegates.dc.html`.
- **Notes:** covers By-project / By-person, summary header, assign panel, history panel. Treat as **layout/flow/copy guide**; apply STAR tokens/typography/components for the actual look.

## Requirement Delta Preview
### ADDED
- `my-pi-delegates` page (By-project default + By-person), summary counters, assign/edit panel, revoke, history panel — all in STAR's design system.
- A client service consuming the backend delegation API.
- Nav entry in the PI area, shown when the user has ≥1 PI/delegate project.

### MODIFIED / REMOVED
- None in the client beyond adding this module.

## Backend Dependencies (must exist for the UI)
The sibling backend spec currently defines: create, list-by-project, verify, update, revoke. **The screen additionally needs these read endpoints — to be added to the backend spec before the UI is built:**
- **List my PI projects + their current delegates** (By-project source, and counters).
- **Eligible-users** picker source (active STAR users of the caller's center, excluding self).
- **History list** for the caller's projects.
Recorded as **OQ-UI-1** so the backend spec can absorb them when the UI is scheduled.

## Approach Options
| # | Approach | Trade-off |
| --- | --- | --- |
| **A (recommended)** | Build the screen after the backend ships, reusing STAR shared components + tokens | Clean dependency order; UI stays thin on a proven API |
| B | Build UI against mocked data now | Rework risk once the real API lands; discouraged |

## Risks, Dependencies, Open Questions
- **OQ-UI-1** — Backend must expose the three read endpoints above.
- **OQ-UI-2** — Exact nav placement/label inside the "PI" area.
- **OQ-UI-3** — a11y: the "no-delegate" highlight and granted/revoked badges must use a non-colour cue (icon/text), verified by a human/T6 visual check (jsdom can't measure contrast).
- **Risk:** design fidelity — must use STAR tokens, not the mockup's raw CSS.

## Success Criteria
- Screen opens on By-project; toggles to By-person; counters correct; no-delegate projects clearly flagged (non-colour cue).
- Assign panel: eligible people × the PI's projects, N×M, no duplicates, no self, Accept gated, confirmation + success.
- Edit pre-fills; revoke with confirmation; history read-only, newest first.
- Built entirely with STAR design tokens/components; no hex; responsive; loading/empty/error states present.

## Next Step
```text
/akili-specify docs/specs/changes/my-pi-delegates-ui
```
(after the backend spec ships and OQ-UI-1 endpoints are agreed). Requirements for this screen are captured in `requirements.md`; design/tasks follow when scheduled.

---
AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). MIT License.
