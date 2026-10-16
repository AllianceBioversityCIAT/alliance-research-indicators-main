# Design — Pool Funding Theory of Change (ToC) UX/UI Enhancements

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

This design document specifies the component architecture, PrimeNG template extensions, layout redesign, and styling tokens for the Theory of Change mapping block in the STAR client. The redesign transforms [`sp-toc-alignment-block.component.html`](file:///Users/jcadavid/orca/workspaces/alliance-research-indicators-main/AC-1676/client/research-indicators/src/app/pages/platform/pages/result/pages/pool-funding-alignment/components/sp-toc-alignment-block/sp-toc-alignment-block.component.html) into an intuitive, visually rich workflow for the Primary Science Program.

---

## 2. Component Architecture & Template Hierarchy

```
[sp-toc-alignment-block] (Container Section)
├── [Primary SP Header & Guidance Banner] (R-PTU-001)
│   ├── SP Icon Container (512x512 with rounded-lg, shadow-xs)
│   ├── Title (SP Code + Full Name)
│   ├── Primary Badge (★ Primary Science Program)
│   └── Guidance Note (Contextual banner)
│
├── [Theory of Change Alignment Yes/No] (Existing Form State)
│   └── Radio buttons (Yes / No)
│
└── [Cascade Form Group] (@if aligns_with_toc)
    ├── [Level Selector] (R-PTU-002)
    │   └── p-select / segmented level cards (Output / HLO, Outcome, Intermediate Outcome)
    │
    ├── [HLO / Outcome Selector] (R-PTU-003)
    │   └── p-select with custom Item & SelectedItem Templates:
    │       ├── Code Badge (e.g. AOW02 in primary blue chip)
    │       ├── Clean Title (multi-line wrapped, high readability)
    │       └── Type Match Tag (✓ Recommended)
    │
    ├── [Indicator Selector] (R-PTU-004)
    │   └── p-select with Group Header & Item Templates:
    │       ├── Group Highlight (Recommended for [Type])
    │       ├── Formatted Item Description
    │       └── Clean Category & Unit Chips
    │
    └── [3-Stat Quantitative Contribution Card] (R-PTU-005)
        ├── Callout Banner (Info note)
        └── 3-Column Metrics Grid (Unit of Measurement | 2026 Target | Contribution Input)
```

---

## 3. UI/UX Component Specifications

### 3.1 Primary SP Header & Context Banner (R-PTU-001 / DD-1)
- **Container:** `bg-white border border-[var(--ac-primary-blue-200)] rounded-[10px] p-4 flex flex-col gap-3 shadow-xs`
- **Top Row:**
  - SP Icon: `w-9 h-9 rounded-lg border border-black/5 shrink-0 object-cover shadow-xs`
  - Text: `text-[15px] font-semibold text-[var(--ac-grey-900)]`
  - Badge: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--ac-primary-blue-50)] text-[var(--ac-primary-blue-700)] border border-[var(--ac-primary-blue-300)]`
- **Context Banner:** `text-xs text-[var(--ac-grey-600)] bg-[var(--ac-grey-50)] border-l-2 border-l-[var(--ac-primary-blue-500)] p-2 rounded-r`

### 3.2 HLO / Outcome Selector Template (R-PTU-003 / DD-2)
- **PrimeNG Template (`pTemplate="item"`):**
  - Card-style list item with flexible row layout.
  - Code Pill: `px-2 py-0.5 rounded text-xs font-bold bg-[var(--ac-primary-blue-50)] text-[var(--ac-primary-blue-700)] border border-[var(--ac-primary-blue-200)]`
  - Description: `text-sm text-[var(--ac-grey-800)] font-medium leading-snug flex-1`
  - Recommended Pill: `px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200`
- **Selected Item Template (`pTemplate="selectedItem"`):**
  - Displays `[AOW02] Title` in a clean, uncluttered format.

### 3.3 Indicator Selector Template & Clean Formatting (R-PTU-004 / DD-3)
- **Helper Formatter Function in Component:**
  - Parses the raw indicator description, stripping raw bracketed tokens (`[ innovations = number ongoing ]`) into distinct structured properties (`displayTitle`, `unitTag`, `categoryTag`).
- **Group Header (`pTemplate="group"`):**
  - Recommended Group: `bg-[var(--ac-primary-blue-50)] text-[var(--ac-primary-blue-800)] font-semibold text-xs tracking-wider uppercase px-3 py-1.5 rounded-t`
  - Other Indicators: `bg-[var(--ac-grey-100)] text-[var(--ac-grey-700)] font-semibold text-xs tracking-wider uppercase px-3 py-1.5`
- **Item Template (`pTemplate="item"`):**
  - Title: `text-sm text-[var(--ac-grey-800)] leading-snug`
  - Category Badge: `px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--ac-grey-200)] text-[var(--ac-grey-700)] border border-[var(--ac-grey-300)]`

### 3.4 3-Stat Contribution & Target Metric Card (R-PTU-005 / DD-4)
- **Card Container:** `bg-white border border-[var(--ac-grey-300)] rounded-[10px] p-5 flex flex-col gap-4 shadow-xs`
- **Info Banner:** Left-bordered callout with info icon.
- **Metrics Grid (`grid grid-cols-1 md:grid-cols-3 gap-4 pt-2`):**
  - **Stat Box 1 (Unit of Measurement):**
    - Label: `text-xs font-semibold uppercase tracking-wider text-[var(--ac-grey-500)]`
    - Value: `text-lg font-bold text-[var(--ac-grey-900)]`
  - **Stat Box 2 (2026 Program Target):**
    - Label: `text-xs font-semibold uppercase tracking-wider text-[var(--ac-grey-500)]`
    - Value: `text-lg font-bold text-[var(--ac-primary-blue-700)]`
  - **Stat Box 3 (Result Contribution Input):**
    - Label: `text-xs font-semibold uppercase tracking-wider text-[var(--ac-grey-700)]`
    - Control: `<p-inputNumber>` or styled `<input>` with rounded border, clear focus ring, min/max constraints, and error display.

---

## 4. Design Decisions (ADRs)

### DD-1: Explicit Primary SP Header & Visual Identity
- **Decision:** Include the 512x512 SP icon and `★ Primary` badge directly inside `sp-toc-alignment-block`.
- **Rationale:** Prevents confusion on multi-SP projects by reinforcing that this section configures targets for the Primary program.

### DD-2: Rich Item Templates for HLO and Indicator Selects
- **Decision:** Use PrimeNG `pTemplate="item"`, `pTemplate="selectedItem"`, and `pTemplate="group"` to structure codes, titles, and category tags.
- **Rationale:** Default text strings wrap awkwardly and collide with brackets. Structured templates improve scanning speed and user comprehension.

### DD-3: 3-Column Metrics Grid for Contribution Panel
- **Decision:** Group Unit, Target, and Contribution into a 3-column stats card rather than disjointed vertical labels.
- **Rationale:** Provides high visual clarity, balances whitespace, and directly associates the user's input with the program target.

---

## 5. Budget & Sizing

- **Expected Tasks:** 3 executable tasks (T-PTU-01, T-PTU-02, T-PTU-03).
- **Expected LOC:** ~150 lines modified/added across template, component, and specs.
- **Expected Review Rounds:** 1 round per task.
- **Depth:** Standard.
