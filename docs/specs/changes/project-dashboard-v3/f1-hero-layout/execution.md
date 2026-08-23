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
