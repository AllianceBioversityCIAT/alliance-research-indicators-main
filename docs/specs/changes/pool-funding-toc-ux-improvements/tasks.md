# Tasks — Pool Funding Theory of Change (ToC) UX/UI Enhancements

## Document Control

| Property | Value |
| --- | --- |
| **Spec Path** | `docs/specs/changes/pool-funding-toc-ux-improvements` |
| **Type** | Change |
| **Approval Mode** | gated |
| **Author** | Antigravity (T1 Architect) |
| **Date** | 2026-08-20 |
| **Status** | done |

---

## Task List

| Task ID | Description | Size | Status | Dependencies | Requirements Covered |
| --- | --- | --- | --- | --- | --- |
| **T-PTU-01** | Primary SP Header & Context Guidance Banner | Small | done | None | `R-PTU-001`, `NFR-PTU-001`, `NFR-PTU-002` |
| **T-PTU-02** | Structured HLO & Indicator Templates with Formatted Category Pills & Group Accents | Medium | done | `T-PTU-01` | `R-PTU-002`, `R-PTU-003`, `R-PTU-004`, `NFR-PTU-001` |
| **T-PTU-03** | 3-Stat Quantitative Contribution Card & Unit Test Suite Updates | Medium | done | `T-PTU-02` | `R-PTU-005`, `NFR-PTU-001`, `NFR-PTU-002`, `NFR-PTU-003` |

---

## Detailed Task Specifications

### T-PTU-01: Primary SP Header & Context Guidance Banner
- **Size:** Small
- **Dependencies:** None
- **Requirements Covered:** `R-PTU-001`, `NFR-PTU-001`, `NFR-PTU-002`
- **Design References:** `design.md` §3.1, `DD-1`
- **Files to Touch:**
  - `client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.html`
  - `client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.scss`
  - `client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.spec.ts`
- **Scope:**
  - Replace the 14x14 flat swatch with the 512x512 Science Program icon container (`/sps/` + `sp().icon_key || spCode()` + `.png`), rounded border, and subtle shadow.
  - Render title (`spCode()` + `sp().name`) and `★ Primary` badge in primary blue.
  - Add contextual guidance banner explaining that Theory of Change target mapping is configured for the Primary Science Program.
- **Verification Command:**
  `npx jest src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.spec.ts --coverage=false`
- **Done Criteria:**
  - Primary SP icon, title, badge, and guidance banner are visible and test assertions pass.

---

### T-PTU-02: Structured HLO & Indicator Templates with Formatted Category Pills & Group Accents
- **Size:** Medium
- **Dependencies:** `T-PTU-01`
- **Requirements Covered:** `R-PTU-002`, `R-PTU-003`, `R-PTU-004`, `NFR-PTU-001`
- **Design References:** `design.md` §3.2, §3.3, `DD-2`
- **Files to Touch:**
  - `client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.html`
  - `client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.ts`
  - `client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.spec.ts`
- **Scope:**
  - Update `p-select` for Level, HLO, and Indicator with custom templates (`pTemplate="selectedItem"`, `pTemplate="item"`, `pTemplate="group"`).
  - Format HLO items with bold blue code pills (`AOW02`), clean typography, and `✓ Recommended` badges.
  - Format Indicator items, stripping awkward bracket tokens and rendering distinct category pills (`[Innovations]`, `[Trained people]`).
  - Highlight the *"Recommended for [Result Type]"* group header with accent styling.
- **Verification Command:**
  `npx jest src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.spec.ts --coverage=false`
- **Done Criteria:**
  - All dropdown templates render structured items cleanly and unit tests pass.

---

### T-PTU-03: 3-Stat Quantitative Contribution Card & Unit Test Suite Updates
- **Size:** Medium
- **Dependencies:** `T-PTU-02`
- **Requirements Covered:** `R-PTU-005`, `NFR-PTU-001`, `NFR-PTU-002`, `NFR-PTU-003`
- **Design References:** `design.md` §3.4, `DD-3`
- **Files to Touch:**
  - `client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.html`
  - `client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.scss`
  - `client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.spec.ts`
- **Scope:**
  - Redesign the quantitative contribution panel as a 3-column stats card: Unit of Measurement, 2026 Target, and Quantitative Contribution input.
  - Ensure reactive signal binding and validation feedback when entering values.
  - Update full unit test suite in `sp-toc-alignment-block.component.spec.ts` and `pool-funding-alignment.component.spec.ts` to ensure 100% green coverage.
- **Verification Command:**
  `npx jest src/app/pages/platform/pages/result/pages/pool-funding-alignment/ --coverage=false`
- **Done Criteria:**
  - 3-column stats card renders cleanly, user input updates draft, and all 342+ tests in the pool-funding-alignment suite pass.
