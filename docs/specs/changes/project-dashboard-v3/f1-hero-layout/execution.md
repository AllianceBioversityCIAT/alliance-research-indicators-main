# Execution Log — changes/project-dashboard-v3/f1-hero-layout

> Append-only audit trail. Every Implementer attempt and every Reviewer verdict is recorded here.
> Do NOT edit past entries — add new entries at the bottom.

## Document Control
- **Spec Path:** `changes/project-dashboard-v3/f1-hero-layout`
- **Started:** 2026-08-23
- **Status:** in-progress

---

## Task: T-01 — Extend the drill-through query-param contract (`leverTab`, `contractTab`, `yearTab`)

### Attempt 1
- **Implementer Model:** Gemini Flash (T2 Coder)
- **Reviewer Model:** Gemini Pro (T3 Auditor)
- **Date:** 2026-08-23
- **Skills Assigned:** `angular-developer`
- **Effort Dial:** `medium`

#### Implementer Report
- **Files Changed:**
  - `client/research-indicators/src/app/pages/platform/pages/results-center/results-center.service.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/results-center/results-center.component.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/project-detail.component.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/results-center/results-center.service.spec.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/results-center/results-center.component.spec.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/project-detail.component.spec.ts` (modified)
- **Summary:** Implemented `leverTab`, `contractTab`, and `yearTab` query-parameter contract in `results-center.component.ts`, `project-detail.component.ts`, and `results-center.service.ts` with validation, filter application, URL cleanup, and unit tests.
- **Verification Command:** `npx jest src/app/pages/platform/pages/project-detail/project-detail.component.spec.ts src/app/pages/platform/pages/results-center/results-center.component.spec.ts src/app/pages/platform/pages/results-center/results-center.service.spec.ts --coverage=false`
- **Verification Evidence:**
  ```text
  PASS src/app/pages/platform/pages/project-detail/project-detail.component.spec.ts
  PASS src/app/pages/platform/pages/results-center/results-center.component.spec.ts
  PASS src/app/pages/platform/pages/results-center/results-center.service.spec.ts

  Test Suites: 3 passed, 3 total
  Tests:       286 passed, 286 total
  Snapshots:   0 total
  Time:        7.393 s
  ```
- **Not Done / Assumptions:** none

#### Reviewer Verdict
- **Status:** PASS
- **Summary:** The implementer successfully extended the drill-through query-param contract for `leverTab`, `contractTab`, and `yearTab` as required by T-01. The modifications to `project-detail.component.ts`, `results-center.component.ts`, and `results-center.service.ts` correctly validate the parameters, apply the corresponding existing table filters (`levers`, `contracts`, `years`), and strip the parameters from the URL after applying. Test coverage is exhaustive and verifies valid, malformed, empty, and combined inputs.
- **Issues Found:** none
- **Advisory:** In `project-detail.component.ts`, `leverId` is validated as `>= 0`, while in `results-center.component.ts` and `initializeScopedResultsTable` it uses `> 0`. Because `initializeScopedResultsTable` acts as the final gate and ignores `leverId === 0`, this minor discrepancy introduces no functional bug.

#### Leader Adjudication
- **Decision:** ACCEPTED (→ finalize T-01)
- **Notes:** All requirements and tests verified; Reviewer verdict is PASS. Proceeding to task completion.

---

## Task: T-02 — Unified hero: dashboard KPI+context rows, shell fact rows conditional, context strip retired

### Attempt 1
- **Implementer Model:** Gemini Flash (T2 Coder)
- **Reviewer Model:** Gemini Pro (T3 Auditor)
- **Date:** 2026-08-23
- **Skills Assigned:** `angular-developer`, `ui-ux-pro-max`
- **Effort Dial:** `medium`

#### Implementer Report
- **Files Changed:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/project-detail.component.html` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/project-detail.component.spec.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.html` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-context-strip/*` (deleted)
- **Summary:** Conditionalized shell `<dl>` fact rows to render only when `lastSegment() !== 'project-dashboard'`. Migrated context strip formatting, timeline, SDG/entity mappings directly into `project-dashboard.component.ts`, rendered context chips in hero, and deleted `project-context-strip` component.
- **Verification Command:** `npx jest src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts src/app/pages/platform/pages/project-detail/project-detail.component.spec.ts --coverage=false`
- **Verification Evidence:**
  ```text
  PASS src/app/pages/platform/pages/project-detail/project-detail.component.spec.ts
  PASS src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts
  Test Suites: 2 passed, 2 total
  Tests: 153 passed, 153 total
  ```
- **Not Done / Assumptions:** none

#### Reviewer Verdict
- **Status:** FAIL
- **Summary:** The provided Git diff successfully implements the structural markup and TypeScript logic for the Unified Hero (T-02), but the diff snippet supplied to reviewer omitted the unit test changes in `project-dashboard.component.spec.ts`.
- **Issues Found:**
  1. **Discovered Issue:** Tests in `project-dashboard.component.spec.ts` not visible in audit diff.
     - **Violated Rule:** `tasks.md` §3 (T-02 Acceptance Criteria)
     - **Remediation Suggestion:** Include the test changes in the diff payload for audit.
- **Advisory:** none

#### Leader Adjudication
- **Decision:** RETRY (Attempt 2)
- **Notes:** Full diff of `project-dashboard.component.spec.ts` was present in the working tree; supplied complete diff for Attempt 2 review.

---

### Attempt 2
- **Implementer Model:** Gemini Flash (T2 Coder)
- **Reviewer Model:** Gemini Pro (T3 Auditor)
- **Date:** 2026-08-23
- **Skills Assigned:** `angular-developer`, `ui-ux-pro-max`
- **Effort Dial:** `high`

#### Implementer Report
- **Files Changed:** Same as Attempt 1.
- **Summary:** Full diff provided including `project-dashboard.component.spec.ts` containing R-HL-001 checklist assertions, S2 no-fabrication rule assertions, timeline clamping, SDG/entity object mappings, and KZ-015 skeleton transitions.
- **Verification Evidence:**
  ```text
  PASS src/app/pages/platform/pages/project-detail/project-detail.component.spec.ts
  PASS src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts
  Test Suites: 2 passed, 2 total
  Tests: 153 passed, 153 total
  ```

#### Reviewer Verdict
- **Status:** PASS
- **Summary:** 1. Shell Fact Rows Conditional correctly implements `@if (lastSegment() !== 'project-dashboard')`. 2. Regression testing in `project-detail.component.spec.ts` ensures fact rows remain on other tabs. 3. Dashboard hero context coverage in `project-dashboard.component.spec.ts` comprehensively covers the R-HL-001 checklist, S2 no-fabrication rule, timeline clamping, and skeleton transitions (KZ-015). 4. Clean build, lint, and zero remaining references to `project-context-strip`.
- **Issues Found:** none
- **Advisory:** none

#### Leader Adjudication
- **Decision:** ACCEPTED (→ finalize T-02)
- **Notes:** All acceptance criteria satisfied and verified.

---

## Task: T-03 — KPI tile actions

### Attempt 1
- **Implementer Model:** Gemini Flash (T2 Coder)
- **Reviewer Model:** Gemini Pro (T3 Auditor)
- **Date:** 2026-08-23
- **Skills Assigned:** `angular-developer`, `ui-ux-pro-max`
- **Effort Dial:** `medium`

#### Implementer Report
- **Files Changed:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.html` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts` (modified)
- **Summary:** Made Total Results, Indicators Covered, and Partner Institutions tiles interactive with accessible labels, disabled loading states, PrimeNG Popover for indicators breakdown with navigation to `project-results`, and smooth-scroll to `#partners-card` with reduced-motion support.
- **Verification Command:** `npx jest src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts --coverage=false`
- **Verification Evidence:**
  ```text
  PASS src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts
  Test Suites: 1 passed, 1 total
  Tests: 111 passed, 111 total
  ```
- **Not Done / Assumptions:** none

#### Reviewer Verdict
- **Status:** PASS
- **Summary:** Total results, Indicators covered, and Partner institutions tiles converted to accessible interactive `<button>` elements with loading guards. Popover implemented via `<p-popover>` displaying indicators with results and navigating to filtered results. Pending revision anchor preserved. Tests, linting, and build pass cleanly.
- **Issues Found:** none
- **Advisory:** Listbox role on popover container can be verified in T-09 HITL for optimal screen reader announcements.

#### Leader Adjudication
- **Decision:** ACCEPTED (→ finalize T-03)
- **Notes:** All acceptance criteria verified; Reviewer verdict is PASS.

---

## Task: T-04 — Section reorder, spacing normalization, caveat compression

### Attempt 1
- **Implementer Model:** Gemini Flash (T2 Coder)
- **Reviewer Model:** Gemini Pro (T3 Auditor)
- **Date:** 2026-08-23
- **Skills Assigned:** `angular-developer`, `ui-ux-pro-max`
- **Effort Dial:** `medium`

#### Implementer Report
- **Files Changed:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.html` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.html` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.spec.ts` (modified)
- **Summary:** Reordered dashboard sections per Design §6 (Hero -> Caveat -> Executive Overview -> Trend/Status -> Indicator -> Geo Scope -> Rankings/SP -> Pending -> AI). Normalised spacing (`gap-5` across dashboard, `gap-6` in geo-scope card).
- **Verification Command:** `npx jest src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.spec.ts --coverage=false`
- **Verification Evidence:**
  ```text
  PASS src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts
  PASS src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.spec.ts
  Test Suites: 2 passed, 2 total
  Tests: 120 passed, 120 total
  ```
- **Not Done / Assumptions:** none

#### Reviewer Verdict
- **Status:** FAIL
- **Summary:** Implementation successfully modifies templates, but test diff snippet for `project-dashboard.component.spec.ts` was truncated in prompt payload.
- **Issues Found:**
  1. **Discovered Issue:** Spec diff in `project-dashboard.component.spec.ts` truncated.
     - **Violated Rule:** `tasks.md` §3 (T-04 Acceptance Criteria)
     - **Remediation Suggestion:** Supply complete diff of `project-dashboard.component.spec.ts`.
- **Advisory:** none

#### Leader Adjudication
- **Decision:** RETRY (Attempt 2)
- **Notes:** Supplied complete diff for Attempt 2 review.

---

### Attempt 2
- **Implementer Model:** Gemini Flash (T2 Coder)
- **Reviewer Model:** Gemini Pro (T3 Auditor)
- **Date:** 2026-08-23
- **Skills Assigned:** `angular-developer`, `ui-ux-pro-max`
- **Effort Dial:** `high`

#### Implementer Report
- **Files Changed:** Same as Attempt 1.
- **Summary:** Complete diff provided verifying DOM order assertions (Hero -> Caveat -> Executive Overview -> Trend/Status -> Indicator -> Geo Scope -> Rankings/SP -> Pending -> AI), trend & status preceding ranking cards, full-width geo-scope card, and zero `gap-16` classes.
- **Verification Evidence:**
  ```text
  PASS src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts
  PASS src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.spec.ts
  Test Suites: 2 passed, 2 total
  Tests: 120 passed, 120 total
  ```

#### Reviewer Verdict
- **Status:** PASS
- **Summary:** DOM structure in `project-dashboard.component.html` matches Design §6. Caveat banner compressed and placed below context strip (D-F1-7). Spacing normalization (`gap-16` to `gap-6`) applied in `geo-scope-card.component.html`. DOM order assertions in `project-dashboard.component.spec.ts` and `geo-scope-card.component.spec.ts` pass cleanly.
- **Issues Found:** none
- **Advisory:** none

#### Leader Adjudication
- **Decision:** ACCEPTED (→ finalize T-04)
- **Notes:** All acceptance criteria satisfied.

---

## Task: T-05 — Empty-collapse rule + `no-data-group` component

### Attempt 1
- **Implementer Model:** Gemini Flash (T2 Coder)
- **Reviewer Model:** Gemini Pro (T3 Auditor)
- **Date:** 2026-08-23
- **Skills Assigned:** `angular-developer`, `ui-ux-pro-max`
- **Effort Dial:** `medium`

#### Implementer Report
- **Files Changed:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/no-data-group/no-data-group.component.ts` (created)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/no-data-group/no-data-group.component.html` (created)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/no-data-group/no-data-group.component.spec.ts` (created)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.html` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts` (modified)
- **Summary:** Created `NoDataGroupComponent` and wired empty-collapse logic across ranking cards, geographic scope, results over time (preserving single-year trend in place), results by status, and bilateral SP alignment.
- **Verification Command:** `npx jest src/app/pages/platform/pages/project-detail/components/no-data-group/no-data-group.component.spec.ts src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts --coverage=false`
- **Verification Evidence:**
  ```text
  PASS src/app/pages/platform/pages/project-detail/components/no-data-group/no-data-group.component.spec.ts
  PASS src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts
  Test Suites: 2 passed, 2 total
  Tests: 122 passed, 122 total
  ```
- **Not Done / Assumptions:** none

#### Reviewer Verdict
- **Status:** FAIL
- **Summary:** The implementation violates R-HL-004 which mandates empty-collapse for "Results by indicator" when total results = 0. "Results by indicator" was omitted from `collapsedEmptyWidgets` and was not wrapped in an `@if` block to collapse when empty.
- **Issues Found:**
  1. **Discovered Issue:** "Results by indicator" empty collapse omitted.
     - **Violated Rule:** R-HL-004
     - **Remediation Suggestion:** Add `indicatorsEmpty` computed signal, include in `collapsedEmptyWidgets`, and wrap `<section aria-labelledby="results-by-indicator-title">` in `@if (!indicatorsEmpty())`.
- **Advisory:** none

#### Leader Adjudication
- **Decision:** RETRY (Attempt 2)
- **Notes:** Dispatched implementer to wire `indicatorsEmpty` and update test assertions.

---

### Attempt 2
- **Implementer Model:** Gemini Flash (T2 Coder)
- **Reviewer Model:** Gemini Pro (T3 Auditor)
- **Date:** 2026-08-23
- **Skills Assigned:** `angular-developer`, `ui-ux-pro-max`
- **Effort Dial:** `medium`

#### Implementer Report
- **Files Changed:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.html` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts` (modified)
- **Summary:** Added `indicatorsEmpty` computed, mapped "Results by indicator" in `collapsedEmptyWidgets`, wrapped indicator section with `@if (!indicatorsEmpty())`, and added test coverage for indicator collapse transitions.
- **Verification Evidence:**
  ```text
  PASS src/app/pages/platform/pages/project-detail/components/no-data-group/no-data-group.component.spec.ts
  PASS src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts
  Test Suites: 2 passed, 2 total
  Tests: 123 passed, 123 total
  ```

#### Reviewer Verdict
- **Status:** PASS
- **Summary:** `indicatorsEmpty` computed signal is properly defined and integrated into `collapsedEmptyWidgets`, ensuring that the "Results by indicator" section is tracked as an empty widget and hidden via `@if (!indicatorsEmpty())`. `no-data-group` component adheres to Angular standalone best practices.
- **Issues Found:** none
- **Advisory:** none

#### Leader Adjudication
- **Decision:** ACCEPTED (→ finalize T-05)
- **Notes:** All R-HL-004 requirements and acceptance checks verified.

---

## Task: T-06 — Ranking cards on viz-chart with lever/contract drill-through

### Attempt 1
- **Implementer Model:** Gemini Flash (T2 Coder)
- **Reviewer Model:** Gemini Pro (T3 Auditor)
- **Date:** 2026-08-23
- **Skills Assigned:** `angular-developer`, `ui-ux-pro-max`
- **Effort Dial:** `high`

#### Implementer Report
- **Files Changed:**
  - `client/research-indicators/src/app/shared/interfaces/project-dashboard.interface.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard-card/project-dashboard-card.component.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard-card/project-dashboard-card.component.html` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard-card/project-dashboard-card.component.spec.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.ts` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.html` (modified)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts` (modified)
- **Summary:** Added `viz-bar` layout to `project-dashboard-card` delegating to `VizChartComponent`. Switched 4 ranking cards (partners, levers, contacts, contributors) to `viz-bar` horizontal charts with rank colors, category `yAxis`, value `xAxis`, and rich HTML tooltips (lever icons, contact emails). Implemented drill-through for lever (`leverTab`) and contributing contract (`contractTab`), while maintaining no navigation for partner and contact bars. Supplied accessible `tableModel` to all cards (R-HL-009).
- **Verification Command:** `npx jest src/app/pages/platform/pages/project-detail/components/project-dashboard-card/project-dashboard-card.component.spec.ts src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts --coverage=false`
- **Verification Evidence:**
  ```text
  PASS src/app/pages/platform/pages/project-detail/components/project-dashboard-card/project-dashboard-card.component.spec.ts
  PASS src/app/pages/platform/pages/project-detail/components/project-dashboard/project-dashboard.component.spec.ts
  Test Suites: 2 passed, 2 total
  Tests: 133 passed, 133 total
  ```
- **Not Done / Assumptions:** none

#### Reviewer Verdict
- **Status:** PASS
- **Summary:** Ranking cards successfully migrated to `viz-bar` layout via `<app-viz-chart>`. Lever click navigates with `leverTab`, contributor click with `contractTab`. Partner and contact bars emit no navigation (R-HL-005). `tableModel` provided to every viz-chart instance for a11y (R-HL-009).
- **Issues Found:** none
- **Advisory:** Clean up redundant `[empty]` bindings in templates where `@if` already gates visibility.

#### Leader Adjudication
- **Decision:** ACCEPTED (→ finalize T-06)
- **Notes:** All acceptance criteria verified; Reviewer verdict is PASS.

---
