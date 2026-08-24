# Requirements — Results Center / Innovation Use filter chip

- **Module:** results-center (STAR client)
- **Spec id:** 2026-08-results-center-innovation-use-filter
- **Status:** specified (Phase 3 complete; not executed)
- **Owner:** Engineering / product owner (AC-1679)
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) **R-6**, **US-MEL-1**
- **Linked tickets:** [AC-1679](https://cgiarmel.atlassian.net/browse/AC-1679) (family; no dedicated Jira)
- **Last updated:** 2026-08-24
- **Extends:** [`docs/specs/innovation-use/OPEN-ITEMS.md`](../../innovation-use/OPEN-ITEMS.md) §0 **N-1** — not a family child

---

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/results-center-innovation-use-filter` |
| **Depth** | **Lite** · **Bug Mode** |
| **Type** | Bug |
| **Approval Mode** | `gated` |
| **Proposal** | [`./proposal.md`](./proposal.md) — option **A** (add `6`; do not delete the list) |
| **Root cause** | Confirmed: client allowlist `[0, 1, 2, 3, 4, 5]` in `ResultsCenterService.onChangeList` omits `IndicatorsEnum.INNOVATION_USE = 6`. See `proposal.md` §9 |
| **Date** | 2026-08-24 |

---

## 2. Context

On Results Center the **INNOVATION USE** chip is grey and unselectable (`pointer-events: none`). The server already returns indicator 6; the client overwrites `able` with a list that stops at 5. Same omit-6 shape as the create-result dropdown, which was already fixed.

This spec makes that chip selectable. It does not change how chips filter, how create-result lists indicators, or N-2 (stale justification).

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **Chip** | An indicator tab on Results Center (`app-indicators-tab-filter`) |
| **`able`** | Client-only flag. Class `able` is what the SCSS uses to allow click/Enter (`pointer-events: auto`). Without it the chip is dimmed and inert |
| **Allowlist** | The hardcoded `indicator_id` array that `onChangeList` uses to set `able` |
| **Sentinel 7** | A non-catalog id used only in tests to prove the list still rejects unknowns |

---

## 4. System Context & Scope

**In scope:** the Results Center chip bar’s `able` flag for indicator 6, the unit spec that must go red on current code, a unit call `onSelectFilterTab(6)` (AC.2; method body unchanged), and a grep that no third omit-6 allowlist remains.

**Out of scope:** N-2; deleting the allowlist (proposal option B); unifying with create-result (`[1, 2, 4, 5, 6]` excludes Knowledge Product); server; details page; T-13 human gate; chip SCSS; changing the `onSelectFilterTab` method body (it already accepts any id). AC.2 is a **unit call** with id 6, not a production edit.

**Renders on:** `/results-center` only (KZ-002).

---

## 5. Stakeholders / Personas

| Persona | Interest |
| --- | --- |
| **Result Contributor** (PRD §3.1) | Filter own Innovation Use results in the hub (**R-6**) |
| **MEL Regional Expert** (PRD §3.2) | Triage the review queue by indicator (**US-MEL-1**) |

---

## 6. Functional Requirements

### R-RCF-001 — The Innovation Use chip is selectable

- **As a** Result Contributor or MEL Regional Expert
- **I want** the INNOVATION USE chip on Results Center to work like the other indicator chips
- **So that** I can filter the table to indicator 6

**Details**

- After `GET /indicators` loads into `indicatorTabs`, the overlay that sets `able` SHALL treat `indicator_id = 6` as able.
- Selecting that chip SHALL use the existing tab-select path (no new filter machinery).

**Acceptance criteria**

- [ ] AC.1 — After the tab list is built, the row with `indicator_id = 6` has `able === true`.
- [ ] AC.2 — Selecting it sets the active tab to 6 and `'indicator-codes-tabs'` to `[6]` (existing `onSelectFilterTab` behavior, now reachable).

**Out of scope (for this requirement):** creating Innovation Use results; the sidebar Indicator multiselect.

#### Scenario: Innovation Use becomes able

- GIVEN `indicatorTabs` contains a row with `indicator_id: 6` (and the usual siblings)
- WHEN the Results Center tab list is built
- THEN that row has `able === true`
- AND the All Indicators row (`indicator_id: 0`) remains `able === true`
- BUT it must NOT leave indicator 6 with `able === false`
- AND IT MUST still set `able === false` for a non-catalog id (sentinel `7`)

---

### R-RCF-002 — Sibling chips do not change

- **As a** Result Contributor
- **I want** every chip that already works to keep working
- **So that** enabling Innovation Use is not a regression on the rest of the bar

**Details**

- Ids **0, 1, 2, 3, 4, 5** keep today’s `able: true`. Create-result’s exclusion of Knowledge Product (3) does **not** apply here.

**Acceptance criteria**

- [ ] AC.1 — After the tab list is built, ids 0–5 are `able === true`.
- [ ] AC.2 — Create-result `targetIndicatorIds` is byte-identical (`[1, 2, 4, 5, 6]`).

#### Scenario: Knowledge Product stays filterable

- GIVEN the tab list includes `indicator_id: 3`
- WHEN the list is built
- THEN that row stays `able === true`
- BUT it must NOT adopt the create-result list (which omits 3)
- AND IT MUST leave the create-result file untouched

---

## 7. Non-Functional Requirements

### NFR-RCF-001 — Regression test is red before the fix

- **Category:** dx / reliability
- **Target:** A spec that includes `indicator_id: 6` fails on current code (`able === false`) and passes after (`able === true`). Removing `6` from the allowlist makes it fail again.
- **How verified:** `results-center.service.spec.ts` `onChangeList` effect. Both runs recorded verbatim (KZ-014 / K-012). A targeted run may use `--coverage=false` (client child guide K-020).

### NFR-RCF-002 — No third omit-6 allowlist remains unrecorded

- **Category:** dx
- **Target:** Grep of the defect shape across `client/` and `server/` lists every hit, including zeros (KZ-007). After the fix, `[0, 1, 2, 3, 4, 5]` is gone from `client/`. The create-result list is an **exemption**: it already contains 6; quote this clause.
- **How verified:** bounded grep at execute, re-run after the edit (KZ-005: re-grep the new value).

---

## 8. Defect classes → gates

| # | Defect this spec can produce | Gate | If the gate cannot see it |
| --- | --- | --- | --- |
| D1 | Allowlist still omits 6 | NFR-RCF-001: id 6 `able === true`, proven red on current code | — |
| D2 | Allowlist becomes “everything true” | Sentinel 7 stays `able === false` (R-RCF-001) | — |
| D3 | Sibling chips regress | R-RCF-002 AC.1 | — |
| D4 | Create-result list accidentally rewritten | R-RCF-002 AC.2 (`git diff --exit-code` on that path) | — |
| D5 | A third omit-6 site is missed | NFR-RCF-002 grep with zeros reported | — |
| D6 | `able === true` in the service but the chip still not clickable | **No automated gate.** jsdom does not apply this SCSS. Mechanism is existing `.able { pointer-events: auto }`. **Accepted risk** (proposal R2). Human click on test is visual close, not a task gate |

A presence-check that the class name `able` exists in the template proves nothing about id 6 (KZ-001). The seam is the **computed `able` value** on the list row.

---

## 9. Data / API

None. No migration, no endpoint, no envelope change. `GET /indicators` already returns indicator 6.

---

## 10. Assumptions, dependencies, risks

| | |
| --- | --- |
| **Assumption** | Indicator 6 is `is_active` in the catalog the test environment already uses (family FR-5 / T-13 Pivot). This spec does not re-verify the catalog |
| **Depends on** | none |
| **Risk R1** | Option A does not prevent a third site when a new indicator appears. Mitigation: filed as proposal option B; not this spec |
| **Family** | Not a `family.md` child. Specify/execute add a **follow-up/risk row** only |

---

## 11. Open questions

None that block design. Option B (trust `is_active`) stays a later product ruling.

---

## 12. Sign-off

- [ ] Engineering lead
- [ ] MEL / product owner
- [ ] Security review — n/a (read-only filter)
- [ ] DevOps — n/a
