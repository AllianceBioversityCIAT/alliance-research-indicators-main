# Requirements — Results / "Update result" asks for the viewed version's year first

## 1. Document Control

| Field | Value |
| --- | --- |
| Module | results (STAR client, version selector) + one additive field on `GET results/versions/:code` |
| Spec id | 2026-10-update-result-year-prompt |
| Depth | Standard (narrow) |
| Type | Enhancement |
| Approval Mode | `interactive` — each phase gate waits for the owner |
| Owner | d.casanas@cgiar.org |
| Baseline commit | `162348264` |
| Related specs | `archive/2026-10-08-bilateral--pool-funding-update-carryover` (the server copies the chosen year's version Pool Funding into the live result on Update result — unchanged here) |
| Visual reference | Owner screenshots, 2026-10-09: current modal ("CONFIRM UPDATING" + required *Reporting year* dropdown) and target modal ("Do you want to update the most recent version of this result (2026)?", version chip, two buttons) |
| Gate log | Phase 1 approved ("sigue") · Phase 2 approved after judgment-day (APPROVED) · Phase 3 approved ("continue"), 2026-10-09 · Phase 2 judgment-day round 1 (2026-10-09): S-3 wording, S-4 null date, S-10, S-11, button-visibility wording added · Phase 1 — Adjust round 1 (2026-10-09): "No" switches the modal content in place instead of close + re-open (owner) |

## 2. Executive Summary

**Problem.** The **Update result** button opens one modal with a required year dropdown. In most cases the user wants to re-open the year of the version they are already looking at, yet they still have to pick it from the list.

**Change.** **Update result** first asks one yes/no question about the year of the version being viewed:

- **Yes, update {year}** — sends the update for that year straight away. Same endpoint as today, so the Pool Funding carry-over still applies.
- **No, choose another year** — the same modal switches its content to today's year dropdown, minus the year that was just offered. The modal does not close and re-open.

**Not changed.** The endpoint, the server's update and carry-over logic, the success and error handling after the request, and who can see the button.

## 3. Glossary

| Term | Meaning |
| --- | --- |
| Viewed version | The approved version chip currently selected in the version selector. When no chip is selected (first load of an Approved result without `?version=`), the most recent approved version (highest year) |
| Offered year | The `report_year_id` of the viewed version |
| Year prompt | The new first modal (yes/no for the offered year) |
| Year picker | Today's modal: "CONFIRM UPDATING" with the required *Reporting year* dropdown |
| Allowed years | The years `GET results/year?resultCode=` returns today: active report years within current year −5 … +2 |

## 4. System Context & Scope

Current behavior:

- **Who sees the button.** The button shows when there is no live row or the live result is Approved (status 6), and the platform is STAR or empty. `version-selector.component.html` — the `@if (!hasLiveVersion && …STAR…)` block; `hasLiveVersion` is defined in `version-selector.component.ts`.
- **What a click does today.** It opens the year picker with `serviceName: 'getYearsByCode'`, then calls `PATCH_ReportingCycle(code, selected)`. On success it clears the version cache, navigates to the live version, and shows "RESULT UPDATED". On failure it shows an error toast. All of this is in `version-selector.component.ts` → `updateResult()`.
- **What the picker lists.** It lists the allowed years with a `has_reported` flag. Picking a reported year shows an overwrite warning. Sources: `report-year.service.ts` → `getReportYear` (window −5…+2) and `global-alert.component.html` (`showReportedWarning`).
- **What the versions endpoint returns.** `GET results/versions/:code` returns `result_id, result_official_code, report_year_id, result_status_id` only, with no date. Source: `results.service.ts` → `findResultVersions`.

**In scope:**
- The year prompt.
- Opening the picker without the offered year.
- The "last updated" date on the prompt, which needs one additive response field.

**Out of scope:**
- Server update and carry-over logic.
- Button visibility.
- Results on PRMS/TIP, which show "Edit in {platform}" instead of this button.
- Restyling the shared alert chrome to match the mockup's spacing.

## 5. Stakeholders / Personas

| Persona | Need |
| --- | --- |
| Result contributor (STAR) | Re-open the year they are looking at in one click, without searching the dropdown |
| Owner / MEL | Fewer updates opened on the wrong year |

## 6. Functional Requirements

### Requirement R-URP-001: Ask about the viewed version's year first

The system SHALL, when **Update result** is clicked and the offered year is an allowed year, show the year prompt instead of the year picker.

#### Scenario S-1: Viewing the latest version

- GIVEN result *C* is Approved and the user views its 2026 version, the most recent one
- WHEN the user clicks **Update result**
- THEN a modal titled "CONFIRM UPDATING" asks "Do you want to update the most recent version of this result (2026)?"
- AND it shows a "2026 VERSION" chip with the caption "Latest reporting version · last updated {d MMM yyyy}"
- AND it shows two buttons, "No, choose another year" and "Yes, update 2026"
- BUT it must NOT show the year dropdown

#### Scenario S-2: Viewing an older version

- GIVEN the user views the 2024 version, and a 2026 version also exists
- WHEN the user clicks **Update result**
- THEN the question reads "Do you want to update the 2024 version of this result?"
- AND the chip reads "2024 VERSION" with the caption "Reporting version · last updated {date}"
- AND the confirm button reads "Yes, update 2024"
- BUT it must NOT call 2024 "the most recent version"

#### Scenario S-3: Offered year is not allowed, or cannot be determined

- GIVEN the viewed version's year is outside the allowed years, or the allowed-years request is unsuccessful or returns no list, or the result has no approved versions
- WHEN the user clicks **Update result**
- THEN today's year picker opens directly, with all allowed years
- AND IT MUST behave exactly as before this change

#### Scenario S-4: Date missing

- GIVEN the viewed version's `updated_at` is absent, `null`, empty, or not a parseable date
- THEN the caption omits the "· last updated …" part
- BUT it must NOT print an empty date, "Invalid Date", "null", or the 1970 epoch

#### Scenario S-10: No chip selected

- GIVEN the result is Approved, versions 2024 and 2026 exist, and no version chip is selected (no `?version=` on first load)
- WHEN the user clicks **Update result**
- THEN the prompt offers 2026, the highest year, as "the most recent version"
- BUT it must NOT offer a year chosen by the order the API returned the versions in

#### Scenario S-11: Repeated clicks

- GIVEN the user clicks **Update result** twice before the allowed years have loaded
- THEN exactly one modal opens
- AND IT MUST ignore clicks while that load is in flight

### Requirement R-URP-002: "Yes" updates the offered year directly

#### Scenario S-5: Confirm

- GIVEN the year prompt for 2026 is open
- WHEN the user clicks "Yes, update 2026"
- THEN the client sends `PATCH results/green-checks/new-reporting-cycle/{code}/year/2026` once
- AND on success it behaves as today: it clears the version cache, refreshes the metadata, navigates to the live version, and shows "RESULT UPDATED"
- AND on failure it shows today's error toast with the server message
- BUT it must NOT open the year picker

### Requirement R-URP-003: "No" switches the same modal to the picker, without the offered year

#### Scenario S-6: Choose another year

- GIVEN the year prompt for 2026 is open and the allowed years are 2028…2021
- WHEN the user clicks "No, choose another year"
- THEN the same modal stays open and its content switches in place to today's year picker content (detail "Please confirm the reporting year associated with this update:", required *Reporting year* dropdown, Cancel / Confirm)
- AND its dropdown lists every allowed year except 2026, with the existing "Already reported" labels and overwrite warning
- AND confirming a year behaves exactly as today; Cancel or × closes with no request
- BUT it must NOT close and re-open the modal (no overlay removal, no second overlay, no flicker)
- AND it must NOT list 2026

#### Scenario S-7: Close without choosing

- GIVEN the year prompt is open
- WHEN the user clicks the close (×) icon
- THEN the modal closes with no request sent and no picker opened

#### Scenario S-8: Other pickers unaffected

- GIVEN any other modal that uses the shared alert with a year dropdown
- THEN its option list is unchanged
- AND IT MUST stay unchanged because the exclusion applies only when a caller asks for it

### Requirement R-URP-004: Versions response carries the last-updated date

#### Scenario S-9

- GIVEN result *C* has approved versions
- WHEN `GET results/versions/{code}` is called
- THEN each item in `versions` and `live` also carries `updated_at`
- BUT it must NOT remove or rename any existing field

## 7. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-URP-001 | Accessibility (WCAG 2.1 AA, PRD C-4): both buttons are keyboard-reachable buttons with visible labels, and the chip text is real text, not an image |
| NFR-URP-002 | No new route, endpoint, or migration. The server change only adds a field to a response |
| NFR-URP-003 | The shared alert's new options are opt-in. A caller that does not set them renders exactly as before |

### Defect classes → gate

| Defect class | Gate |
| --- | --- |
| Wrong branch: prompt vs. picker, wrong year sent, request sent on "No" or "×" | `version-selector.component.spec.ts` (Jest), with the transition arranged (KZ-015) |
| "No" closes and re-opens instead of switching in place | `global-alert.component.spec.ts`: after "No" the alert list still holds exactly one entry at the same index, the overlay element is the same DOM node, and the picker content renders |
| Offered year still listed, or exclusion leaking to other pickers | `global-alert.component.spec.ts`, which asserts the rendered options list with and without the option |
| Copy: latest vs. older, missing or null date, offered year with no chip selected | Version-selector spec, asserting the exact strings and year passed to the alert, with versions mocked in non-ascending order |
| Double click opens two modals | Version-selector spec: two calls before the years resolve → one `showGlobalAlert` |
| Dropdown options unstable (new array each change detection) | Pipe spec: same input reference → same output reference; empty exclusion → identity |
| Template type errors (strictTemplates) | `npm run build` (client) |
| Spec type errors | `npx tsc -p tsconfig.spec.json --noEmit`, comparing the error set for the touched files before and after |
| Server field missing from the select | `results.service.spec.ts`, asserting the `select` contains `updated_at` |
| Visual fidelity to the mockup (chip, caption, button order) | **No automated gate.** Checked by the owner on Dev at the HITL pause (T-04) |

## 8. Requirement ID Index

| ID | Scenarios | Tasks |
| --- | --- | --- |
| R-URP-001 | S-1, S-2, S-3, S-4, S-10, S-11 | T-02, T-03, T-04 |
| R-URP-002 | S-5 | T-03 |
| R-URP-003 | S-6, S-7, S-8 | T-02, T-03 |
| R-URP-004 | S-9 | T-01 |
| NFR-URP-001..003 | — | T-01, T-02, T-04 |
