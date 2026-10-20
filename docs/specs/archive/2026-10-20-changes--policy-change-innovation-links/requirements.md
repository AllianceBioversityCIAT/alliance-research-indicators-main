# Requirements — Policy Change / Innovation links

> **Answer first:** the two "Link to a reported …" pickers on *Policy Change details* are hard-disabled in the template. The server already stores, reads and clears both links. This spec turns the pickers on, makes each one list only its own result type from the results-center endpoint, and adds one server guard so a link can never point at the wrong result type.

## 0. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/policy-change-innovation-links/` |
| Ticket | AC-1754 (branch `AC-1754-Activate-the-Innovation-development-and-innovation-use-selector-in-policy-change`) |
| Type / Depth | Change · **Lite** |
| Packages | client (main), server (one guard) |
| Approval mode | interactive |
| Author | d.casanas@cgiar.org (via `/akili-specify`) |
| Date | 2026-10-20 |

## 1. Context

**Problem.** A Policy Change result cannot be linked to the Innovation Development output or the Innovation Use it came from. Both pickers render greyed out with a tooltip claiming there are no results of that type — which is false.

**Current behavior (cited at commit `3ee449e41`):**

| Claim | Evidence |
| --- | --- |
| Both pickers are disabled unconditionally | `policy-change.component.html:90` and `:103` — `[disabled]="true"` |
| The tooltip text is static, not tied to the option list | `policy-change.component.html:87`, `:99` |
| Option lists already come from the results-center endpoint, filtered by indicator | `get-innovation-dev-output.service.ts` → `GET_Results({'indicator-codes': [2]})`; `get-innovation-use-output.service.ts` → `[6]`; both call `api.service.ts` `GET_Results` (`results` with `indicators=`) |
| Server saves both links as `link_results` rows, role `POLICY_CHANGE` (1) | `result-policy-change.service.ts` `update()` → `linkResultsService.create(..., LinkResultRolesEnum.POLICY_CHANGE, manager)` |
| Server reads them back, split by the linked result's indicator | `result-policy-change.service.ts` `findPolicyChange()` — `indicator_id === INNOVATION_DEV` / `INNOVATION_USE` |
| Clearing a picker removes the link | `base-service.ts` `create()` deactivates every row of the role whose id is not in the payload |
| Server does **not** check the target's result type on save | `update()` pushes `other_result_id` with no indicator filter |
| The Innovation Use list service has no error state (the Dev one does) | `get-innovation-use-output.service.ts` — no `error` signal |

**Actors.** Result contributors editing a Policy Change result; reviewers reading it.

**Out of scope.** Making either link required; changing the green check; new endpoints; a link to more than one result per type.

## 2. Requirement numbering

`R-PCIL-NNN` functional, `NFR-PCIL-NNN` non-functional.

## 3. Functional requirements

### R-PCIL-001 — Innovation Development picker lists only Innovation Development results

The Innovation Development picker SHALL be selectable and SHALL offer only results whose indicator is Innovation Development, sourced from the results-center endpoint.

#### Scenario: Pick an Innovation Development

- GIVEN a Policy Change result in an editable status
- AND at least one Innovation Development result exists
- WHEN the user opens "Link to a reported Innovation Development output"
- THEN the list shows only Innovation Development results
- AND each option shows the result code and title, and the search matches either
- BUT it must NOT show Innovation Use, Policy Change, Capacity Sharing, Knowledge Product or OICR results
- AND IT MUST request the list with indicator filter `2` only
- AND IT MUST leave out results in status Not approved (7) or Deleted (8); every other status is listed

### R-PCIL-002 — Innovation Use picker lists only Innovation Use results

Same contract as R-PCIL-001 for "Link to a reported Innovation Use", with indicator `6`.

#### Scenario: Pick an Innovation Use

- GIVEN a Policy Change result in an editable status
- AND at least one Innovation Use result exists
- WHEN the user opens "Link to a reported Innovation Use"
- THEN the list shows only Innovation Use results, with code and title
- BUT it must NOT show Innovation Development results
- AND IT MUST request the list with indicator filter `6` only
- AND IT MUST leave out results in status Not approved (7) or Deleted (8)

### R-PCIL-003 — Picker states

Each picker SHALL be enabled exactly when the result is editable, its list loaded, and the list is non-empty.

| State | Picker | Message |
| --- | --- | --- |
| Loading | disabled | none |
| Loaded, ≥ 1 option, editable | **enabled** | none |
| Loaded, 0 options | disabled | tooltip: "There are no reported Innovation Development outputs to link." / "There are no reported Innovation Use results to link." |
| Load failed | disabled | inline error: "The … could not be loaded. Please try again." |
| Result not editable (submitted, approved, past version) | disabled, current value still shown | none |

#### Scenario: No options

- GIVEN no Innovation Use result exists
- WHEN the section loads
- THEN the Innovation Use picker is disabled with the empty-state tooltip
- BUT the Innovation Development picker must NOT be affected by the Innovation Use list's state

#### Scenario: Read-only result

- GIVEN a submitted Policy Change result with a saved Innovation Use link
- WHEN the section loads
- THEN the picker shows the linked result and cannot be changed

### R-PCIL-004 — Save, reload and clear

The selected links SHALL survive save and reload, and clearing a picker SHALL remove that link only.

#### Scenario: Round trip

- GIVEN the user picks one Innovation Development and one Innovation Use
- WHEN they save and reload the section
- THEN both pickers show the same two results

#### Scenario: Clear one

- GIVEN both links are saved
- WHEN the user clears the Innovation Use picker and saves
- THEN the Innovation Use link is removed
- BUT the Innovation Development link must NOT be removed

### R-PCIL-005 — Server rejects a link of the wrong type

The server SHALL reject a save whose `innovation_development` is not an existing Innovation Development result, or whose `innovation_use` is not an existing Innovation Use result. It checks the type only, not the status, so a link saved before its target changed status still saves.

#### Scenario: Wrong type

- GIVEN a PATCH to the Policy Change section with `innovation_use` set to the id of an Innovation Development result
- WHEN the server handles it
- THEN it responds `400` in the standard envelope and saves nothing from that request
- AND IT MUST still accept `null` / absent for either field

## 4. Non-functional requirements

### NFR-PCIL-001 — No new endpoint

Options SHALL come from the existing results-center endpoint (`GET /api/results`). No new route.

### NFR-PCIL-002 — Tokens and layout

Labels and messages SHALL use existing token classes; the label padding hack (`&nbsp;` × 36 on the Innovation Use label) SHALL be removed without misaligning the two columns.

## 5. Data requirements

None new. Links live in `link_results` with role `POLICY_CHANGE`.

## 6. API surface delta

`PATCH` Policy Change section: new `400` when a link targets the wrong result type (R-PCIL-005). Wire shape unchanged.

## 7. Cross-system impact

None. PRMS sync and OpenSearch do not read these links (to confirm in design — Premise Ledger).

## 8. Defect classes and their gates

| Defect class | Gate |
| --- | --- |
| Picker still disabled when it should be enabled | Component spec reading the rendered `disabled` state per R-PCIL-003 row |
| Wrong indicator in a list request | Service spec asserting the `GET_Results` filter (`[2]` / `[6]`) |
| Not approved / Deleted result offered | Service spec with a fixture holding statuses 7, 8 and a kept status |
| Option rows of the wrong type reach the picker | Server-side filter of the results endpoint — existing; client spec asserts the request, not the server's filter |
| Link saved against the wrong type | Server unit spec for R-PCIL-005 |
| Clear removes both links | Server unit spec on `update()` payload to `linkResultsService.create` |
| Template type error (strict templates) | `npm run build` (client) |
| Visual alignment of the two columns after removing `&nbsp;` | **No automated check** — human check at the HITL pause in the running app, both themes |

## 9. Open questions

| # | Question | Answer (user, 2026-10-20) |
| --- | --- | --- |
| OQ-1 | Which statuses should the lists include? | **Every status except Not approved (7) and Deleted (8)** — now in R-PCIL-001/002 |
| OQ-2 | R-PCIL-005: reject with `400`, or silently drop the wrong-type link? | **Reject with `400`** |

## 10. Sign-off

Pending.
