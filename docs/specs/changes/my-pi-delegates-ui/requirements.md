# Requirements — My PI Delegates (Frontend / STAR screen)

- **Module:** my-pi-delegates-ui (client / STAR only)
- **Spec id:** 2026-09-my-pi-delegates-ui
- **Depth:** Standard
- **Status:** draft (requirements captured now; design/tasks when scheduled)
- **Owner:** STAR squad
- **Depends on:** `docs/specs/changes/my-pi-delegates/` (backend) + its OQ-UI-1 read endpoints
- **Visual reference:** `mockup/My-PI-Delegates.html` + design link (see proposal). Mockup = layout/flow/copy guide; look = STAR design system.
- **Last updated:** 2026-09-09

## 1. Context

The **My PI Delegates** screen inside STAR's **PI** area lets a PI (or a delegate, who behaves like a PI) see and manage delegates across their projects. It is the UI over the backend delegation API. **Design fidelity is a hard requirement:** PrimeNG Aura + STAR token utilities (`.abc-*`/`.atc-*`/`.rs-*`/`.fs-*`, `var(--ac-*)`) + existing shared components (`MultiselectComponent`). **No hex literals; do not clone the mockup's CSS** (root guide §4.2).

## 2. Numbering
`R-UI-NNN` (functional), `NFR-UI-NNN`.

## 3. Functional requirements

### R-UI-001 — Access & nav entry
- **AC.1** — The "My PI Delegates" entry appears in the PI area only when the user has ≥1 project they manage (PI or delegate), driven by the backend eligibility/projects response.
- **AC.2** — The route lazy-loads a standalone component under the platform shell; unauthenticated access is blocked by the existing guard pattern.

### R-UI-002 — By-project view (default)
- **AC.1** — The screen **opens on By project**.
- **AC.2** — Each project lists its current delegates, or an explicit **"No PI Delegate assigned"** empty state.
- **AC.3** — Projects **without** a delegate are highlighted **AND IT MUST** use a non-colour cue (icon/text), not colour alone (NFR-UI-002).

### R-UI-003 — By-person view
- **AC.1** — The user can toggle to **By person**; state persists while on the screen.
- **AC.2** — Each delegate lists the user's projects where they are assigned — **BUT it must NOT** show projects the user does not manage.

### R-UI-004 — Summary header
- **AC.1** — Shows **Total PI projects**, **People in the review team** (distinct), **Projects without a PI Delegate**.
- **AC.2** — Counters refresh after any assign/revoke without a full page reload.

### R-UI-005 — Assign panel (bulk people × projects)
- **AC.1** — Searchable multi-select of **eligible people** (from the backend eligible-users endpoint) × multi-select of **the user's manageable projects**.
- **AC.2** — Selecting N people × M projects requests N×M delegations; existing ones are **not duplicated**.
- **AC.3** — The user **cannot select themselves** as a delegate (self excluded / rejected).
- **AC.4** — **Accept is disabled until** ≥1 person **and** ≥1 project are selected.
- **AC.5** — Only the user's manageable projects are selectable — **BUT it must NOT** offer other projects.

### R-UI-006 — Edit pre-fill (same panel)
- **AC.1** — Opening the panel from **By project** pre-selects that project + its current delegates.
- **AC.2** — Opening from **By person** pre-selects that person + their assigned (manageable) projects.
- **AC.3** — Add/remove maps to create/revoke on confirm — **AND IT MUST NOT** duplicate already-present selections left unchanged.

### R-UI-007 — Confirmation & feedback
- **AC.1** — Every assign and revoke shows a **confirmation dialog naming the people, projects, and effect** before writing.
- **AC.2** — Success shows a success message; **no role change on a single click**.
- **AC.3** — On backend error, an error state is shown and **no partial success is implied**; the screen re-fetches.

### R-UI-008 — Revoke
- **AC.1** — Revoking removes the delegation for the named project(s) only, with confirmation — **BUT it must NOT** affect the same person on other projects.

### R-UI-009 — History panel
- **AC.1** — Shows granted/revoked events (actor, person, project, timestamp) for the user's projects, **newest first**, **read-only** (no edit/delete affordance).
- **AC.2** — Granted vs revoked distinguished by **icon/text + colour**, not colour alone (NFR-UI-002).

### R-UI-010 — Data flow / single source of truth
- **AC.1** — By-project, By-person, counters and history derive from **one** client cache of the backend payload — **AND IT MUST NOT** keep a second, separately-mutated copy that can drift (KZ-002).

## 4. Non-functional requirements

### NFR-UI-001 — STAR design fidelity
- **Category:** ux/consistency. **Target:** PrimeNG Aura + token utilities + shared components only; **no hex literals**; mockup used for layout/flow/copy, not styling. **Verified:** code review + grep for hex in the module (none).

### NFR-UI-002 — Non-colour-only cues (a11y)
- **Category:** a11y (PRD C-4 / WCAG 2.1 AA 1.4.1). **Target:** no-delegate highlight and granted/revoked badges convey state by text/icon **plus** colour. **Verified:** spec asserts markup presence; **rendered contrast is a jsdom gap → human/T6 visual check** (KZ-001).

### NFR-UI-003 — UI states & responsiveness
- **Category:** ux. **Target:** loading, empty ("No PI Delegate assigned" / no projects), error, success states defined; responsive; component styles within budget. **Verified:** component specs per state (arrange the transition, KZ-015).

## Defect classes → gate
| Defect class | Gate |
| --- | --- |
| Colour-only status cue | **No automated gate** — jsdom proves markup only; human/T6 visual check (NFR-UI-002) |
| Hex / off-token styling | grep for hex in the module + review (NFR-UI-001) |
| Duplicate / self / cross-project selection | Component specs on panel logic (R-UI-005) — but server is the source of truth |
| State drift across views | Single-cache derivation test (R-UI-010) |

## 5. Backend dependencies (OQ-UI-1)
The screen requires backend read endpoints not in the backend spec's core: **list my PI projects + delegates**, **eligible-users**, **history list**. These must be added to the backend spec before this UI is built.

## 6. Open questions
| # | Question | Status |
| --- | --- | --- |
| OQ-UI-1 | Backend read endpoints (projects+delegates, eligible-users, history). | Confirm with backend spec |
| OQ-UI-2 | Nav placement/label inside the PI area. | Confirm |
| OQ-UI-3 | a11y cues verified by human/T6 (jsdom can't). | Accepted control |

## 7. Sign-off
- [ ] Engineering lead — <name>
- [ ] UX / product owner — <name>
