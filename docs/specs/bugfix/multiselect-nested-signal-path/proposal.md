# Proposal — Fix `MultiselectComponent` dropping selections bound to a nested signal path

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/multiselect-nested-signal-path` |
| **Slug** | `multiselect-nested-signal-path` — derived from the free-text argument; the full text is proposal context, not a directory name |
| **Type** | **Bug** (data-loss defect in a shared component) |
| **Approval Mode** | `gated` (default — no explicit end-to-end mandate given) |
| **Depends on** | none |
| **Parallel-safe** | **no** — mutates `MultiselectComponent`, rendered by 30 callers across 5 feature areas |
| **Chunk** | 1 of 1 |
| **Source** | User bug report + screenshots (CapSharing details, `STAR-3422`), 2026-08-03 |
| **Date** | 2026-08-03 |

## Intent

Make a multiselect bound to a **nested** signal path (`group.trainee_organization_representative`) persist its selections, exactly as one bound to a flat path already does.

## Problem / Current Behavior

On **Result → CapSharing details → "Select the organizations"**, picking one or more organizations does nothing that lasts:

| Moment | What the user sees |
| --- | --- |
| Click an option | Checkbox ticks (transient) |
| Change detection settles | Checkbox un-ticks, chip list stays empty |
| Panel closed | Field is blank, `This field is required` still shown |
| Press **Save** | Selections are not persisted; the section stays incomplete |

The field is `[isRequired]="true"`, so the section can never be completed — this blocks submitting the result.

## Proposed Outcome

Selecting organizations in any multiselect bound to a nested path keeps the selection on screen, clears the required-field error, and persists it to the server on Save.

## Scope

| In | Out |
| --- | --- |
| `MultiselectComponent.setValue()` — write through the nested path | `MultiselectInstanceComponent` / `MultiselectOpensearchComponent` (separate components, not reported broken) |
| `MultiselectComponent.clear()` — same defect, same fix | Any redesign of the CapSharing form or its layout |
| Regression test covering a nested path with the **real** `UtilsService` | Changing the `signalOptionValue` contract or migrating call sites to flat paths |

## Non-Goals

- Not refactoring `syncBodyWithSignal`. The evidence below shows it behaves **correctly** — it is a downstream victim, not a co-cause.
- Not deduplicating the three multiselect variants.
- Not changing the server payload contract.

## Affected Users, Systems, And Specs

**Users:** anyone completing a Capacity Sharing result (blocked), plus OICR and Innovation Details reporters.

**Call sites bound to a nested path — all affected by the same root cause:**

> **Corrected 2026-08-03 after Judgment Day C-1.** The original list said 5. It was produced by searching only the attribute form `signalOptionValue="a.b"` and missed the property-binding form. The real count is **8**.

| File | `signalOptionValue` | Form |
| --- | --- | --- |
| `capacity-sharing.component.html:150` | `group.trainee_organization_representative` | attribute |
| `create-oicr-form.component.html:222` | `step_two.primary_lever` | attribute |
| `create-oicr-form.component.html:263` | `step_two.contributor_lever` | attribute |
| `innovation-details.component.html:319` | `knowledge_sharing_form.tool_function_id` | attribute |
| `innovation-details.component.html:375` | `knowledge_sharing_form.link_to_result` | attribute |
| `create-oicr-form.component.html:331` | `step_three.regions` | **property-binding** |
| `create-oicr-form.component.html:344` | `step_three.countries` | **property-binding** |
| `create-oicr-form.component.html:404` | `step_three.countries` | **property-binding** |

**A second blocking surface.** OICR create step 3 fails the same way CapSharing does: `isCompleteStepThree` (`create-oicr-form.component.ts:423-424`) reads `step_three.regions.length` / `step_three.countries.length`, which the root cause guarantees stay empty for `geo_scope_id > 1`.

Flat-path call sites (the other ~25) are **unaffected** — verified by a passing control case.

## Visual Reference

- **Source:** None required — behavioral fix, no UI change.
- **Location:** n/a. User-supplied screenshots of the broken state (panel with ticked boxes; closed field showing `This field is required`) are the symptom record.
- **Notes:** The rendered markup is already correct; only the state written behind it is wrong.

## Bug Diagnosis

### Observed Symptom

Organizations selected in the CapSharing "Select the organizations" dropdown do not appear as selected, and the required-field error never clears.

### Reproduction Steps

1. Open a Capacity Sharing result → **CapSharing details** (e.g. `/result/STAR-3422/capacity-sharing`).
2. Set **Were the trainees attending on behalf of an organization?** → **Yes**.
3. Open **Select the organizations** and tick two institutions.
4. **Expected:** both appear as selected chips; `This field is required` clears.
5. **Actual:** the field settles empty and the error persists; Save does not persist the selections.

### Root Cause (confirmed)

`client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.ts:401`

```ts
nextState = { ...current, [this.signalOptionValue]: nextItems };
```

`signalOptionValue` is a **dotted path**, not a key. Used in a computed-property position it creates a literal top-level property named `"group.trainee_organization_representative"` instead of writing into `current.group`.

Every **read** in the same component resolves the path properly via `utils.getNestedProperty` (`utils.service.ts:41-45`, which `reduce`s over `path.split('.')`). Write-flat + read-nested = the two never meet.

**Confirmed by execution**, not by inspection. A throwaway harness instantiated the real component with the real `UtilsService` and called `setValue([1, 2])`:

```
FLAT   -> selectedOptions().length: 2 | isInvalid(): false      ← control passes

NESTED -> top-level signal keys: ["group","group.trainee_organization_representative"]
NESTED -> group.trainee_organization_representative: []          ← real path never written
NESTED -> junk flat key value: [{institution_id:1,…},{institution_id:2,…}]   ← data landed here
NESTED -> body().value: [1,2]                                    ← checkboxes tick (matches screenshot)
NESTED -> body().value AFTER effect flush: null                  ← …then un-tick
NESTED -> selectedOptions().length: 0 | isInvalid(): true        ← empty field + required error
```

The control (flat path) passes and the nested case fails, isolating the defect to the dotted path. The harness was deleted after capture.

**Full causal chain — one root cause, three visible symptoms:**

1. `setValue` writes the junk flat key → the nested path stays empty.
2. `selectedOptions()` reads the nested path → empty chips, `isInvalid()` stays `true`.
3. `syncBodyWithSignal` (line 230) then sees an empty nested path and correctly resets `body.value = null` → the ticked checkboxes un-tick.

`clear()` (line 374-377) contains the identical `[this.signalOptionValue]:` flat-key defect.

### Impact & Scope

- **Data loss on save (confirmed).** `capacity-sharing.component.ts:122` builds the payload as `{ ...this.body(), … }` and PATCHes it. The junk key is spread into the request body while the legitimate field goes up empty — the selection is silently discarded rather than rejected.
- **Blocking.** The field is required, so the section cannot be completed and the result cannot be submitted.
- **5 call sites** across three features (table above).
- **No security or cross-tenant implication.**

**Why no test caught it (Active Lesson KZ-001):** `multiselect.component.spec.ts:46` mocks `UtilsService` with `getNestedProperty: jest.fn().mockReturnValue([])` — a double that cannot evaluate nesting, so the suite is green over broken behavior. All existing cases also use a flat `signalOptionValue`.

### Fix Strategy

Route: **`/akili-specify` (Lite) in Bug Mode** — the fix changes state-write logic in a component with 30 callers, so it requires a regression test (red before, green after).

Smallest safe correction: write through the path with `utils.setNestedPropertyWithReduce` — the helper the rest of this same component (`onChange`, `removeOption`, `setBodyFromSignal`) already uses — in both `setValue` and `clear()`. Roughly 4-8 lines.

## Approach Options

| # | Approach | Trade-off |
| --- | --- | --- |
| **A** | Write through the path with `setNestedPropertyWithReduce` in `setValue` + `clear()` | ✅ Smallest diff; matches the component's existing write idiom; fixes all 5 call sites at once. ⚠️ The helper mutates in place, so the new state object must be cloned before writing to keep `OnPush` change detection reliable. |
| **B** | Migrate the 5 nested call sites to flat `signalOptionValue` paths | ❌ Touches 3 feature areas and the request payload shape; leaves the shared-component landmine armed for the next author. |
| **C** | Reject dotted paths at the input boundary (throw / lint rule) | ❌ Prevents recurrence but fixes nothing today; the 5 call sites would break loudly instead of silently. Worth considering as a **follow-up**, not as the fix. |

## Recommended Approach

**Option A.** It corrects the defect at its source, in the one method that deviates from a convention the rest of the file already follows, and repairs all five call sites without touching any feature code. Symptoms 2 and 3 resolve on their own once the write lands in the right place — no other method needs to change.

Design must specify how immutability is preserved: `setNestedPropertyWithReduce` mutates its target, whereas `setValue` currently produces a fresh `nextState`. Clone `current` (and the intermediate segment) before writing so `OnPush` consumers and `selectEvent` subscribers still observe a new reference.

## Risks, Dependencies, And Open Questions

| # | Item | Type | Note |
| --- | --- | --- | --- |
| R-1 | 30 callers render `MultiselectComponent` | Risk | Per **KZ-003**, requires a full client suite run, not a targeted one. |
| R-2 | The existing spec's `UtilsService` mock hides nesting | Risk | Per **KZ-001**, the regression test must use the **real** `UtilsService`. A test written against the current mock would pass without proving anything. |
| R-3 | In-place mutation vs. `OnPush` | Risk | Mishandling the clone could break change detection for flat-path consumers — the 25 currently-working call sites. |
| Q-1 | Are existing saved results carrying the junk key server-side? | Open question | The payload has been shipping `"group.trainee_organization_representative"` as a literal key. Whether the API stored, ignored, or rejected it needs a backend check — it decides whether a data-repair task is in scope. |
| Q-2 | Is there a Jira ticket for this? | Open question | The current branch is `AC-1672` (dashboard charts), unrelated. Not blocking. |

## Success Criteria

1. Selecting organizations in CapSharing details keeps them selected and clears `This field is required`.
2. Save persists the selections under `group.trainee_organization_representative`; no dotted key appears in the PATCH payload.
3. The same holds for the four OICR / Innovation Details nested call sites.
4. A regression test using the **real** `UtilsService` fails before the fix and passes after.
5. Flat-path multiselects are unchanged — full client suite green.

## Next Step

```text
/akili-specify bugfix/multiselect-nested-signal-path
```

Run in **Bug Mode** (Lite depth) — the confirmed root cause above becomes the fix plan plus a mandatory regression test.
