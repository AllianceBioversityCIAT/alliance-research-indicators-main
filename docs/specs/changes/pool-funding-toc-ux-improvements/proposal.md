# Proposal — Pool Funding Theory of Change (ToC) UX/UI Enhancements

## Document Control

| Property | Value |
| --- | --- |
| **Spec Path** | `docs/specs/changes/pool-funding-toc-ux-improvements` |
| **Type** | Change |
| **Slug** | `pool-funding-toc-ux-improvements` — derived from user request on ToC dropdowns and mapping section |
| **Approval Mode** | gated |
| **Author** | Antigravity (T1 Architect) |
| **Date** | 2026-08-20 |
| **Status** | draft |

---

## 1. Intent

Elevate the user experience and visual design of the **Theory of Change (ToC) Alignment** section (`Map HLOs and/or indicators*`) in the Result Pool Funding Alignment module (`sp-toc-alignment-block`). The goal is to replace clunky, text-heavy dropdowns and disjointed metric boxes with a modern, high-contrast, and intuitive cascading workflow tailored exclusively to the **Primary Science Program**, making it effortless for scientists to map results to High-Level Outputs (HLOs) / Outcomes and enter quantitative contributions.

---

## 2. Problem / Current Behavior

Through user feedback and UI audit of the active flow ([`sp-toc-alignment-block.component.html`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.html)), several friction points were identified:

1. **Header & Context Disconnection:**
   - The ToC block header currently renders a tiny 14x14px color swatch `■` without the official high-resolution SP icon or clear indication that this detailed mapping applies **only to the Primary Science Program**.
2. **Clunky Level Selection:**
   - The `Level` selector uses a generic full-width dropdown even when only 1 or 2 level options exist (e.g. `High Level Output`, `Outcome`, `Intermediate Outcome`), forcing extra clicks and hiding available options.
3. **Overcrowded & Hard-to-Read HLO Dropdown:**
   - HLO entries contain long text, codes (`AOW01`, `AOW02`), and type-match tags (`has Trained people`) with cramped line-height, poor item hierarchy, and standard browser text wrapping that is difficult to scan.
4. **Complex Indicator Dropdown with Cluttered Metadata:**
   - Indicator options mix descriptions, bracketed formulas (`[ innovations = number ongoing ]`), and category badges without clean visual separation. Group headers (`RECOMMENDED FOR...` vs `OTHER INDICATORS`) lack strong contrast.
5. **Disjointed Quantitative Contribution & Target Box:**
   - The unit of measurement, target, and input field are arranged in an asymmetrical, spaced-out layout with a plain blue left-border callout, giving it an unpolished appearance.

---

## 3. Proposed Outcome

1. **Rich Primary SP Header with Contextual Guidance:**
   - Prominently feature the crisp 512x512 Science Program icon, code, full title, and a `★ Primary Science Program` pill.
   - Include a concise helper note stating: *"Theory of Change alignment is configured for the Primary Science Program."*
2. **Segmented / Modern Level Selector:**
   - Display level options (`Output / HLO`, `Outcome`, `Intermediate Outcome`) as modern segmented toggle cards or a polished custom selector with level indicators.
3. **Structured, Card-Style HLO / Outcome Selector:**
   - Render HLO items with clear visual hierarchy: bold code badge (`AOW02`), clean title typography, and a prominent badge for recommended / type-matching options (`✓ Recommended`).
   - Enhanced search placeholder (*"Search by code (e.g. AOW02) or title..."*).
4. **Enhanced Indicator Dropdown with Distinct Badges & Highlights:**
   - Visually elevate the *"Recommended for [Result Type]"* group with a soft accent surface.
   - Cleanly format indicator items with structured badge tags (e.g., Category pill, Unit tag) separated from the core indicator text.
5. **Modern Metric & Target Contribution Card:**
   - Consolidate the contribution box into a 3-column stats card:
     - **Unit of Measurement** (with measurement icon).
     - **Program Target (2026)** (formatted bold metric).
     - **Result Contribution** (interactive input with stepper/limits, validation feedback, and clear alignment to target).

---

## 4. Scope

### In Scope
- [`client/.../pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.html`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.html) — template refactor for Level, HLO, Indicator dropdowns, and Contribution Card.
- [`client/.../pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.scss`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.scss) — design token styling and layout polish.
- [`client/.../pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.ts) — helper computeds for level badges, grouping styling, and item formatting.
- Unit test suite updates in [`sp-toc-alignment-block.component.spec.ts`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.spec.ts) maintaining 100% green coverage.

### Non-Goals
- Modifying the underlying CLARISA ToC catalog data structure or API contracts (`GET /api/bilateral/results/:code/toc-catalog`).
- Changing how Contributing SPs are stored in the backend (they remain contributing at the science program allocation level).
- Altering existing business validation rules (ToC alignment remains optional when "No" is chosen, mandatory cascade when "Yes" is chosen).

---

## 5. Visual Reference

- **User Screenshots:**
  - Overall ToC section: `orca-paste-1787280642520-c70c0f8c-b505-4990-9540-94abb1300a26.png`
  - Level dropdown: `orca-paste-1787280698152-cba573a2-eb1f-4341-82b4-1a3ffdba57b9.png`
  - HLO dropdown: `orca-paste-1787280713802-aeadcd71-2632-4dcd-9f1d-ec72bfd77ea9.png`
  - Indicator dropdown: `orca-paste-1787280729923-fb454eee-ee32-4d8f-93ec-d05f50cd82bc.png`
  - Quantitative contribution box: `orca-paste-1787280741190-d1a29206-3fd6-4f14-a3ea-25401cc227d0.png`
- **Design Tokens:** Alliance Research Indicators design system (`--ac-primary-blue-*`, `--ac-grey-*`, Tailwind utility classes, PrimeNG Aura components).

---

## 6. Requirement Delta Preview

### ADDED Requirements
- **R-PTU-001 (Primary SP Header with High-Res Icon):** Header displays the 512x512 SP icon in a rounded badge container, official code, full title, `★ Primary` status pill, and explicit contextual guidance.
- **R-PTU-002 (Enhanced Level & HLO Dropdowns):** HLO and Outcome items format codes as distinct colored badges (`AOW02`), clean typography for descriptions, and prominent `✓ Recommended` tags for type-matches.
- **R-PTU-003 (Structured Indicator List with Category Chips):** Indicator list splits raw bracketed strings into clean metadata badges and highlights recommended indicator groups.
- **R-PTU-004 (3-Stat Contribution & Target Card):** Quantitative contribution section presents Unit of Measurement, 2026 Target, and Contribution Input in an integrated 3-column visual metric card.

### MODIFIED Requirements
- **M-PTU-001:** Replaces plain swatch and simple select templates with accessible, rich PrimeNG templates (`ng-template pTemplate="selectedItem"`, `pTemplate="item"`, `pTemplate="group"`).

---

## 7. Approach Options

| Option | Architecture & UX Strategy | Pros | Cons |
| --- | --- | --- | --- |
| **Option A: Pure CSS styling tweaks** | Keep existing dropdown templates and only adjust margins, font sizes, and colors. | Lowest effort. | Does not solve cluttered metadata, bracketed text wrapping, or disjointed metric layout. |
| **Option B (Recommended): Rich PrimeNG Templates & 3-Column Metric Card** | Refactor dropdown templates with structured chips/badges, clean hierarchical typography, and redesign the contribution block as a modern 3-column stats card. | Transforms the UX into an intuitive, polished tool; clean separation of codes/tags; crystal-clear metrics. | Requires updating component item templates and unit test selector assertions. |
| **Option C: Custom Modal / Stepper Wizard** | Move the entire ToC mapping into a multi-step modal dialog. | Full screen real estate. | High cognitive friction; breaks in-page form context; overengineered for a 3-field cascade. |

**Recommended Approach:** **Option B**. It delivers maximum clarity and visual quality while staying seamlessly integrated into the page flow and preserving existing form signal architecture.

---

## 8. Success Criteria

1. ToC block header clearly identifies the Primary Science Program with its high-res icon and `★ Primary` badge.
2. HLO/Outcome dropdown items display bold code pills (`AOW02`), legible titles, and prominent `✓ Recommended` tags.
3. Indicator dropdown cleanly separates indicator titles from category tags without awkward text collisions.
4. Contribution section presents Unit, 2026 Target, and Input in a unified 3-column card.
5. All 342+ unit tests in `pool-funding-alignment` remain 100% green with zero ESLint errors.

---

## 9. Next Step

To proceed with detailed requirements, UX design tokens, and task decomposition:

```
/akili-specify docs/specs/changes/pool-funding-toc-ux-improvements
```
