# Requirements — Pool Funding Theory of Change (ToC) UX/UI Enhancements

## Document Control

| Property | Value |
| --- | --- |
| **Spec Path** | `docs/specs/changes/pool-funding-toc-ux-improvements` |
| **Type** | Change |
| **Approval Mode** | gated |
| **Author** | Antigravity (T1 Architect) |
| **Date** | 2026-08-20 |
| **Status** | draft |

---

## 1. Executive Summary

This specification defines the functional, UX/UI, and accessibility requirements for modernizing the **Theory of Change (ToC) Alignment** component (`sp-toc-alignment-block`) within the STAR Pool Funding Alignment workflow. The feature streamlines cascading alignment (Level $\rightarrow$ HLO / Outcome $\rightarrow$ Indicator $\rightarrow$ Quantitative Contribution) exclusively for the **Primary Science Program**, replacing congested dropdowns with structured, card-style selection options, clean badge separations, and a consolidated 3-stat metric card.

---

## 2. Glossary

- **Science Program (SP):** One of the 13 CGIAR research programs (e.g., SP01 to SP13) that receive pool funding.
- **Primary SP:** The single lead Science Program selected for a result, for which detailed Theory of Change target mapping is configured.
- **Contributing SP:** Additional Science Programs selected on a multi-SP result that receive allocated investment but do not configure independent ToC targets in this form.
- **Level:** The organizational tier in the Theory of Change hierarchy (`High Level Output` / `HLO`, `Outcome`, `Intermediate Outcome`).
- **HLO / Result:** High-Level Output or Outcome node defined in CLARISA for a given Science Program (e.g., `AOW02 — HLO 2.2`).
- **Indicator:** Metric measuring progress against an HLO/Outcome target, containing unit of measurement, target year, target value, and indicator category tags.
- **Quantitative Contribution:** Numerical value submitted for the result toward the indicator's 2026 program target.

---

## 3. System Context & Scope

- **Primary Actor:** Scientists, Project Leads, and M&E Coordinators submitting research results in STAR.
- **Surfaces Affected:**
  - `sp-toc-alignment-block.component.html`
  - `sp-toc-alignment-block.component.ts`
  - `sp-toc-alignment-block.component.scss`
  - `sp-toc-alignment-block.component.spec.ts`
- **Boundaries & Preconditions:**
  - The ToC block is rendered **only** when `primarySelectedSp()` exists and "Yes" is selected for ToC alignment.
  - The CLARISA API backend contracts (`GET /api/bilateral/results/:code/toc-catalog`) and data models remain unchanged.

---

## 4. Defect Classes & Verification Gates

| Defect Class | Example Risk | Verification Gate |
| --- | --- | --- |
| **Visual Clipping & Formatting Collisions** | Brackets `[...]` colliding with category pills in indicator dropdown | Manual review + browser screenshot verification |
| **Accessibility Regression** | Missing ARIA roles, `aria-required`, or keyboard navigation on custom dropdown templates | Automated Jest unit tests (`role="radiogroup"`, `p-select`, `aria-label`) |
| **Form Cascade State Breakdown** | Changing Level does not reset HLO/Indicator, or changing HLO leaves stale indicator | Automated unit tests asserting `onLevelChange`, `onHloChange`, `onIndicatorChange` cascade resets |
| **Primary-Only Isolation Violation** | ToC block rendering for non-primary SP or persisting invalid draft | Unit tests asserting ToC gating on `primarySelectedSp()` alone |

---

## 5. Functional Requirements

### R-PTU-001: Rich Primary Science Program Header & Contextual Banner

The component SHALL render a rich header displaying the Primary Science Program's 512x512 icon, official code, full name, and a prominent `★ Primary Science Program` badge, accompanied by a contextual note clarifying that ToC mapping applies exclusively to the primary program.

#### Scenario 1.1: Primary SP Header Display
- GIVEN a result with a selected Primary Science Program (e.g. `SP03 — Sustainable Animal and Aquatic Foods`)
- WHEN the user views the Theory of Change alignment section
- THEN the component SHALL render an icon container featuring `/sps/SP03.png`, rounded borders, and subtle shadow
- AND the header SHALL display `SP03 — Sustainable Animal and Aquatic Foods`
- AND the header SHALL render a `★ Primary` badge in solid primary blue
- AND the component SHALL display a guidance note: *"Theory of Change alignment is configured for the Primary Science Program."*
- BUT it must NOT render raw 14x14 flat swatches or unformatted text.

---

### R-PTU-002: Level Selector & Adaptive Hierarchy

The component SHALL present the available Theory of Change levels (`High Level Output`, `Outcome`, `Intermediate Outcome`) in an intuitive selector with clear typography and level badges.

#### Scenario 2.1: Level Selection & Cascade Trigger
- GIVEN the catalog contains available levels for the Primary SP
- WHEN the user selects a Level (e.g. `High Level Output`)
- THEN the HLO/Outcome field SHALL be enabled and populated with results matching that level
- AND any previously selected HLO, indicator, and contribution data SHALL be cleanly reset if the level changes
- AND IT MUST keep `aria-required="true"` on the level select element.

---

### R-PTU-003: Structured HLO / Outcome Card Selector with Type-Match Guidance

The component SHALL render HLO / Outcome options in a structured card template featuring a distinct code badge (`AOW02`), clean multi-line description typography, and a prominent `✓ Recommended` badge for items whose indicators match the current result type.

#### Scenario 3.1: HLO Option Rendering with Type-Match
- GIVEN the user opens the HLO / Outcome dropdown
- WHEN the catalog contains HLOs, some of which match the result's indicator type (e.g. `has Trained people`)
- THEN each option SHALL display the code in a bold colored badge (e.g. `<span class="hlo-code-badge">AOW02</span>`)
- AND the title text SHALL render with clean line-height and word-wrapping
- AND matching items SHALL render a `✓ Recommended` pill with high contrast
- AND the search filter SHALL filter by both code and title with placeholder *"Search by code (e.g. AOW02) or keyword..."*.

---

### R-PTU-004: Structured Indicator Selector with Formatted Category Pills

The component SHALL format indicator dropdown items by cleanly separating the core indicator description from bracketed units and category pills, and visually distinguishing the *"Recommended for [Result Type]"* group.

#### Scenario 4.1: Indicator Options Formatting
- GIVEN the user selects an HLO
- WHEN the indicator dropdown is rendered with grouped options
- THEN the *"Recommended for [Result Type]"* group header SHALL render with a distinctive accent highlight
- AND each indicator item SHALL render its core title, category chip (e.g. `[Innovations]`, `[Trained people]`), and target unit cleanly separated without bracket collisions
- AND IT MUST preserve selection of `d.indicator_id` and propagate changes to the contribution panel.

---

### R-PTU-005: 3-Stat Quantitative Contribution & Target Summary Card

The component SHALL render the quantitative contribution section as a unified 3-column metric card containing:
1. **Unit of Measurement** (with measurement icon and label).
2. **2026 Program Target** (formatted target value and year).
3. **Quantitative Contribution Input** (integrated numeric input with validation and stepper limits).

#### Scenario 5.1: 3-Stat Metric Card Rendering
- GIVEN an indicator is selected with `unit_of_measurement="Number"`, `target_year=2026`, and `target_value=50`
- WHEN the user views the contribution section
- THEN the component SHALL display a 3-column stats card containing:
  - Column 1: Unit of Measurement (`Number`) with icon
  - Column 2: 2026 Target (`50`)
  - Column 3: Quantitative contribution input field
- AND entering a valid positive number SHALL update `formData().toc_drafts[0].quantitative_contribution`
- AND validation errors (e.g., negative value or non-numeric) SHALL render directly below the contribution input
- BUT it must NOT render plain asymmetrical text labels or floating unaligned inputs.

---

## 6. Non-Functional Requirements

- **NFR-PTU-001 (Design Token Compliance):** All colors, surfaces, borders, and typography MUST use ARI CSS variables (`--ac-primary-blue-*`, `--ac-grey-*`, `--ac-orange-*`) and PrimeNG Aura tokens. Zero hardcoded hex literals.
- **NFR-PTU-002 (Accessibility & Keyboard Operability):** All dropdowns and inputs MUST support keyboard navigation (`Tab`, `ArrowUp`, `ArrowDown`, `Enter`, `Escape`), clear focus rings, and full screen-reader announcements (`role="status"`, `aria-live="polite"`, `aria-label`).
- **NFR-PTU-003 (Responsive Layout):** The 3-stat contribution card and dropdown overlays MUST be responsive across desktop and tablet screen sizes (`grid-cols-1 md:grid-cols-3`).

---

## 7. Requirement ID Index

- `R-PTU-001`: Rich Primary Science Program Header & Contextual Banner
- `R-PTU-002`: Level Selector & Adaptive Hierarchy
- `R-PTU-003`: Structured HLO / Outcome Card Selector with Type-Match Guidance
- `R-PTU-004`: Structured Indicator Selector with Formatted Category Pills
- `R-PTU-005`: 3-Stat Quantitative Contribution & Target Summary Card
- `NFR-PTU-001`: Design Token Compliance
- `NFR-PTU-002`: Accessibility & Keyboard Operability
- `NFR-PTU-003`: Responsive Layout
