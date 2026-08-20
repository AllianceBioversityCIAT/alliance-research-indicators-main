# Requirements — Bilateral Module / Bilateral Project Mapping UI Refinements

- **Module:** bilateral-module / center-admin
- **Spec id:** 2026-08-bilateral-mapping-ui-improvements
- **Status:** in-review
- **Owner:** Platform UI Squad / Center Admin
- **Linked PRD section:** [docs/prd.md](../../../prd.md) — Center Administration & Bilateral Management
- **Linked tickets:** AC-1676
- **Extends:** [docs/specs/archive/2026-08-14-bilateral--clarisa-project-automapping](../../archive/2026-08-14-bilateral--clarisa-project-automapping/design.md) (R-CAM-004)
- **Last updated:** 2026-08-20

---

## 1. Context

The Bilateral Project Mapping screen (`/platform/admin/center-admin/bilateral-mapping`) allows Center Administrators and Operations managers to map bilateral projects originating from CLARISA to contracts and agreements in AGRESSO.

Operators reported UX ambiguities regarding column names (whether "Agreement ID" is AGRESSO or CLARISA), fragmented button placement (`Auto-map` buried inside the coverage strip rather than beside `New mapping`), and a lack of contextual guidance about the active CLARISA phase filtering (e.g. Phase 2026).

This specification establishes clear requirements to elevate the primary action buttons, provide contextual module onboarding/help, clarify table headers, harmonize status nomenclature, and apply production-grade design craft (`ui-ux-pro-max`).

---

## 2. Requirement Numbering

Every requirement uses the identifier prefix `R-BIL-UI-<NNN>` for functional requirements and `NFR-BIL-UI-<NNN>` for non-functional requirements.

---

## 3. Functional Requirements

### R-BIL-UI-001 — Header Action Group Reorganization

- **As a** Center Administrator
- **I want** the `Auto-map` action button to sit in the top page header alongside `New mapping`
- **So that** all primary workflow triggers for bilateral project mapping are grouped together at the top of the interface.

**Details:**
- The top header flex container SHALL render both `⚡ Auto-map` (secondary action button) and `+ New mapping` (primary action button) side-by-side on the top-right.
- Clicking `Auto-map` SHALL trigger the existing Automapper run modal dialog (`openAutomapperDialog()`).
- The `Mapping Coverage` sub-strip SHALL retain its KPI metric cards (Mapped, Pending, Reachable), the freshness label (`(CLARISA cache: 5-min TTL)`), and the manual metrics refresh button (`pi-refresh`), but SHALL NOT duplicate the `Auto-map` trigger button.

#### Scenario 1.1: Automapper Trigger from Page Header
- GIVEN an operator is on the Bilateral Project Mapping screen
- WHEN they click the `⚡ Auto-map` button in the top page header
- THEN the automapper dialog (`app-automapper-dialog`) opens
- AND IT MUST emit telemetry if configured
- BUT IT MUST NOT navigate away from the current mapping table.

#### Scenario 1.2: Coverage Strip Retains Telemetry & Refresh
- GIVEN the Bilateral Project Mapping screen is loaded
- WHEN viewing the `Mapping Coverage` container
- THEN the container renders the 3 KPI metric tiles (Mapped, Pending, Reachable)
- AND renders the `pi-refresh` button
- BUT does NOT contain the `Auto-map` action button.

---

### R-BIL-UI-002 — Module Help & Onboarding Affordance (`(?)` Popover)

- **As a** Center Administrator or Operations Operator
- **I want** an inline help affordance `(?)` next to the page title
- **So that** I can understand the purpose of this module and why CLARISA bilateral projects are filtered by phase (e.g. Phase 2026).

**Details:**
- An accessible icon button with a question mark (`pi pi-question-circle` or `(?)`) SHALL be rendered immediately adjacent to the page heading `Bilateral Project Mapping`.
- Clicking the button SHALL open a floating popover (`p-popover`) with structured descriptive text.
- The popover copy MUST explain:
  1. Purpose: Mappings between CLARISA bilateral research projects and AGRESSO agreements/contracts.
  2. Phase filtering: Scoped to the active CLARISA reporting phase (Phase 2026).
  3. Downstream impact: Drives Science Program alignment, Pool Funding allocations, and Indicator reporting in STAR.
- The popover SHALL be dismissible by clicking outside or pressing `Escape`.

#### Scenario 2.1: Opening and Viewing Module Help
- GIVEN the operator is viewing the page header
- WHEN they click the `(?)` help icon button
- THEN a popover appears containing the module explanation and active phase note
- AND the popover carries `role="region"` / accessible ARIA attributes
- AND pressing `Escape` or clicking outside dismisses the popover.

---

### R-BIL-UI-003 — Explicit Table Column Headers

- **As an** Operator reviewing mapping records
- **I want** the table column headers to explicitly name their source systems (`AGRESSO`, `CLARISA`)
- **So that** there is zero confusion about which column corresponds to AGRESSO agreements vs. CLARISA projects.

**Details:**
- Column 1 header SHALL be labeled `Agreement ID (AGRESSO)`.
- Column 2 header SHALL be labeled `CLARISA Project (Bilateral)`.
- Column 3 (`Source`), Column 4 (`Confidence`), Column 5 (`Status`), Column 6 (`Last Updated`), and Column 7 (`Actions`) SHALL remain aligned.

#### Scenario 3.1: Table Header Render
- GIVEN mapping records exist and the table is rendered
- WHEN inspecting the table headers (`<thead>`)
- THEN Column 1 contains `Agreement ID (AGRESSO)`
- AND Column 2 contains `CLARISA Project (Bilateral)`.

---

### R-BIL-UI-004 — Harmonized Status Filter and Status Badges

- **As an** Operator filtering mapping records
- **I want** the status dropdown filter and table status badges to use consistent terminology
- **So that** filtering by `Active` or `Inactive` produces clear, predictable results.

**Details:**
- The status dropdown filter options SHALL be:
  - `All` (value: `'all'`)
  - `Active` (value: `'active'`)
  - `Inactive` (value: `'inactive'`)
- The table status column SHALL render:
  - Green badge `Active` when `row.is_active === true` (`.bil-status-badge--active`)
  - Neutral/gray badge `Inactive` when `row.is_active === false` (`.bil-status-badge--inactive`).

#### Scenario 4.1: Status Filter Coherence
- GIVEN the operator selects `Inactive` from the status dropdown
- WHEN the table refreshes
- THEN all rendered rows display the `Inactive` badge
- AND the filter query parameter is `is_active=false`.

---

## 4. Non-Functional Requirements

### NFR-BIL-UI-001 — Accessibility (WCAG 2.1 AA) & Design Tokens
- **Category:** a11y, compliance, style
- **Target:** All interactive elements (`(?)`, `Auto-map`, `New mapping`, `Refresh`, filter dropdowns, table action buttons) MUST have accessible `aria-label` or `title` attributes. Color contrast ratio on all badges and text must be ≥ 4.5:1. All color variables MUST use STAR / PrimeNG Aura design tokens (`var(--ac-*)` or utility classes).
- **How verified:** `npm run lint -- --quiet` and automated unit tests.

### NFR-BIL-UI-002 — Component Isolation & Test Coverage
- **Category:** reliability, dx
- **Target:** All unit tests in `bilateral-mapping.component.spec.ts` and `bilateral-mapping-coverage.component.spec.ts` MUST pass with 100% green exit code.
- **How verified:** `npm test -- --silent` in `client/research-indicators`.

---

## 5. Defect Classes & Verification Gates

| Defect Class | Vulnerable Area | Gate Command | Substitute Check |
| --- | --- | --- | --- |
| **Broken Action Wiring** | `Auto-map` button click fails to open dialog | `npm test -- --silent` | Unit test asserting `openAutomapperDialog()` invocation |
| **Help Popover Dismissal / A11y** | `(?)` popover traps focus or lacks ARIA labels | `npm test -- --silent` | Unit test checking `data-testid="help-popover-btn"` |
| **Column Header Mismatch** | Header copy regressions | `npm test -- --silent` | Unit test asserting `Agreement ID (AGRESSO)` and `CLARISA Project (Bilateral)` |
| **CSS Token Violation** | Hardcoded hex values or un-themed styles | `npm run lint -- --quiet` | Angular ESLint linter gate |

---

## 6. Requirement ID Index

| ID | Title | Priority |
| --- | --- | --- |
| `R-BIL-UI-001` | Header Action Group Reorganization (`Auto-map` elevation) | P1 |
| `R-BIL-UI-002` | Module Help & Onboarding Affordance (`(?)` Popover) | P1 |
| `R-BIL-UI-003` | Explicit Table Column Headers (`AGRESSO`, `CLARISA`) | P1 |
| `R-BIL-UI-004` | Harmonized Status Filter and Status Badges | P2 |
| `NFR-BIL-UI-001` | Accessibility (WCAG 2.1 AA) & Design Token Compliance | P1 |
| `NFR-BIL-UI-002` | Component Isolation & Test Coverage Floor | P1 |
