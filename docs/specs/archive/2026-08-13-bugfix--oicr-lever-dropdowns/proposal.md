# Proposal — OICR Modal Lever Dropdowns Selection Failure

## Document Control

| Field | Value |
| --- | --- |
| Spec Path | `bugfix/oicr-lever-dropdowns` |
| Proposal Path | `docs/specs/bugfix/oicr-lever-dropdowns/proposal.md` |
| Type | **Bug** |
| Slug | `oicr-lever-dropdowns` — derived from free-text argument (modal de OICRS, dropdowns failing, primary & contributing levers) |
| Approval Mode | `gated` |
| Depends on | none |
| Parallel-safe | yes |
| Related Kaizen | KZ-002, KZ-003 |

---

## Intent

Restore lever selection in the OICR creation modal on `main`/staging/prod so that **Primary Levers** and **Contributing Levers** can be selected and submitted, matching the behavior already working on `dev`.

---

## Problem / Current Behavior

In the **Create OICR** modal (step 2 — Contributors), both the **Primary Levers** and **Contributing Levers** `<app-multiselect>` dropdowns fail on `main`/staging/prod: the user opens the dropdown, picks levers, but the selection **does not persist** into the nested form body, so the levers cannot be added and the form's step-2 completion / cross-exclusion / save logic never sees them.

On `dev` (test environment) the same modal works correctly — levers are selected and saved without issue. This is a **regression** present only on `main`/staging/prod.

> **Note:** Two screenshots were attached by the user but could not be read (the current session model does not support image input). The diagnosis below is confirmed from code investigation across branches, not from the screenshots.

---

## Proposed Outcome

Selecting a primary or contributing lever in the Create OICR modal writes the selection into `createOicrBody().step_two.primary_lever` / `step_two.contributor_lever` (the nested path), so that:

- the selected chips/state render inside the dropdown,
- cross-exclusion between primary and contributing levers (`optionsDisabled` / `primaryOptionsDisabled`) updates,
- step-2 completion validation passes,
- the saved body contains the chosen levers.

---

## Scope

**In scope:**

- `MultiselectComponent` write path (`clear()`, `setValue()`) and template read path — fix the dotted/nested `signalOptionValue` handling.
- Regression tests proving nested-path write-through (red on `main`, green after fix).

**Out of scope (explicitly):**

- Any change to the OICR form template, `createResultManagementService`, or the levers service — these are identical between `dev` and `main`; the bug is not there.
- New features, lever taxonomy changes, or API contract changes.

> KZ-002 applies: the defective component is a **shared** `app-multiselect` rendered inside the OICR route, not a file under the OICR feature folder. Scope was enumerated by *what renders on the route*, not by folder. KZ-003 applies: `app-multiselect` renders on many routes, so verification must be a **full client test suite** run, not a targeted one.

---

## Non-Goals

- Refactoring the multiselect beyond the minimal nested-write fix.
- Backporting unrelated `dev`-only changes (project dashboard, document overview services, api.service changes, etc.) that diverged from `main`.
- Touching the OpenSearch-based `multiselect-opensearch` variant.

---

## Affected Users, Systems, And Specs

| Layer | Impact |
| --- | --- |
| Users | Any OICR submitter/editor on staging/prod unable to complete step 2 of the Create OICR modal. |
| Client | `shared/components/custom-fields/multiselect/multiselect.component.{ts,html}` — defective write path. |
| Client (consumer) | `shared/.../create-result-modal/components/create-oicr-form/create-oicr-form.component.html` — passes dotted `signalOptionValue` (`step_two.primary_lever`, `step_two.contributor_lever`) that triggers the defect. |
| Specs | None under `docs/specs/` currently cover this; this proposal seeds `bugfix/oicr-lever-dropdowns`. |

Blast radius is bounded to dotted-path `signalOptionValue` consumers. `alliance-alignment.component.html` uses a **flat** `signalOptionValue="primary_levers"` and is unaffected by the flat-write path; only the OICR modal uses dotted paths.

---

## Visual Reference

- Source: None (screenshots attached by the user are unreadable by this session model — no image input support; diagnosis confirmed from cross-branch code investigation).
- Location: —
- Notes: Backend-no-change / UI-only regression; visual is the existing Create OICR modal step 2. No mockup needed.

---

## Bug Diagnosis

### Observed Symptom

In the Create OICR modal step 2, the Primary Levers and Contributing Levers `<app-multiselect>` dropdowns let the user open and click options, but the selection **fails to register**: the chips/state do not persist as a real selection, cross-exclusion between primary and contributing levers doesn't update, and the saved body has empty lever arrays. On `dev` the same action works.

### Reproduction Steps

1. On `main`/staging/prod build, open the Create OICR modal and advance to step 2 (Contributors).
2. Open the **Primary Levers** dropdown, select one or more levers.
3. Expected: selection persists (chips/selected count render) and `createOicrBody().step_two.primary_lever` holds the chosen lever objects; the **Contributing Levers** dropdown disables already-chosen primary levers.
4. Actual: selection does not persist into the nested body; `step_two.primary_lever` remains `[]`; contributing-lever cross-exclusion does not react. Same for Contributing Levers.
5. On `dev`, step 4 behaves as expected (step 3).

### Root Cause (confirmed)

**`MultiselectComponent` on `main` treats the dotted `signalOptionValue` as a flat top-level key on write, while reading it as a nested path.** Confirmed by `git diff HEAD..origin/dev` on `multiselect.component.{ts,html}` — not a hypothesis: the fix exists and is regression-tested on `dev` but is absent from `main`.

Defective code on `main` (`shared/components/custom-fields/multiselect/multiselect.component.ts`):

- `clear()` (l. 373–378):
  ```ts
  this.signal.update(prev => ({ ...prev, [this.signalOptionValue]: [] }));
  ```
- `setValue()` (l. 381–406): reads the previous value **nested** via `this.utils.getNestedProperty(current, this.signalOptionValue)` (l. 387) but **writes flat**:
  ```ts
  nextState = { ...current, [this.signalOptionValue]: nextItems };
  ```
- Template (`multiselect.component.html` l. 1): `@let list = this.signal()[this.signalOptionValue];` — flat-key read.

The OICR modal passes a **dotted** path: `signalOptionValue="step_two.primary_lever"` and `"step_two.contributor_lever"` (`create-oicr-form.component.html` l. 222, 263). Under the flat-write code:

- `setValue` creates a spurious root key literally named `"step_two.primary_lever"` while leaving the **real** nested `body.step_two.primary_lever` untouched (`[]`).
- Everything downstream reads the nested path (`createResultManagementService.createOicrBody().step_two?.primary_lever`, `step_two?.contributor_lever`) and sees empty arrays: cross-exclusion effects (`updateOptionsDisabledEffect` / `updatePrimaryOptionsDisabledEffect`), `isCompleteStepTwo`, `navigateToOicr`, and `mapLeversWithCustomNames` on save. So the lever selection is silently discarded.

**`dev` fix (the backport target):**

- Adds `private writeAtPath(current, path, value)` — clones the spine (`root…intermediate segments`) and assigns `value` at the leaf, mirroring `UtilsService.setNestedPropertyWithReduce`'s `acc[key] ??= {}` convention **without** in-place mutation (immutability preserved for signal change detection).
- `clear()` and `setValue()` write via `writeAtPath(prev, this.signalOptionValue, …)` instead of the flat `[this.signalOptionValue]` spread.
- Template reads `@let list = this.selectedOptions();` (the existing `selectedOptions` computed, l. 176 in `main`, which already resolves the nested path) instead of the flat `this.signal()[this.signalOptionValue]`.

Regression tests already exist on `dev` (`multiselect.component.spec.ts`, `describe('Nested signal path write-through (bugfix regression)')`, cases R-MNP-001…R-MNP-005) covering: no dotted top-level key after `setValue`, nested selection readable + clears required-invalid, sibling keys under the parent survive, selection survives effect flush, `clear()` empties the nested path leaving no dotted key, flat-path write unchanged, and missing/null intermediate segment does not throw.

### Impact & Scope

- **Blast radius:** all consumers of `<app-multiselect>` that pass a **dotted** `signalOptionValue`. Today that is only the OICR creation modal's two lever fields. Flat-path consumers (e.g. `alliance-alignment.component.html` `primary_levers`) are unaffected by the flat-write code and remain unaffected by the nested-write fix (single-segment path is a trivial case).
- **Data integrity:** OICRs created on prod are being submitted with **empty** lever arrays — a real data-quality issue, not just a UI glitch.
- **No security implication.**

### Fix Strategy

**Smallest safe correction:** backport the `dev` multiselect changes verbatim to `main`:

1. Add `writeAtPath` helper to `multiselect.component.ts`.
2. Route `clear()` and `setValue()` writes through `writeAtPath`.
3. Change the template line 1 to `@let list = this.selectedOptions();`.
4. Backport the `Nested signal path write-through (bugfix regression)` spec block (R-MNP-001…005) to prove red-before/green-after.

This is logic/data behavior change with a mandatory regression test, not a cosmetic one-liner — route: **`/akili-specify` (Lite) in Bug Mode**.

---

## Approach Options

| # | Approach | Pros | Cons |
| --- | --- | --- | --- |
| **A (Recommended)** | Backport `dev`'s exact `writeAtPath` + template read fix + regression spec to `main`. | Minimal, already proven & tested on `dev`; no new design; immutable (signal-friendly); surgical to nested-path behavior. | Must ensure no unrelated `dev`-only changes leak in. |
| B | Reimplement a nested-write fix from scratch on `main`. | Avoids any `dev` merge mechanics. | Re-invents an existing, reviewed, tested solution; higher regression risk; duplicates work. |
| C | Change the OICR modal to use flat `signalOptionValue` (renaming the body shape) instead of fixing the shared component. | Avoids touching the shared component. | Breaks the `step_two.*` body contract that the server and the rest of the form expect; larger, riskier, wrong layer. |

---

## Recommended Approach

**Option A** — verbatim backport of the `dev` `MultiselectComponent` nested-write fix and its regression spec. It is the smallest safe path: the fix already exists, is immutable (safe for Angular signals), is regression-tested, and is scoped to the shared component that KZ-002/KZ-003 say must be fixed-and-verified at the shared layer with a full-suite run.

---

## Risks, Dependencies, And Open Questions

| Risk / Question | Mitigation |
| --- | --- |
| `app-multiselect` is rendered on many routes (KZ-003) — a shared-component change could affect flat-path consumers. | `writeAtPath` treats a single-segment path as a trivial leaf case; R-MNP-004 explicitly asserts flat-path write is unchanged. Run the **full** client test suite, not only the OICR/multiselect specs. |
| Confirm screenshots (unreadable here) match the code-confirmed symptom. | Root cause is confirmed from cross-branch code diff independently of the screenshots; user should confirm the symptom description matches. |
| Are there other dotted-`signalOptionValue` consumers silently broken today? | Grep for `signalOptionValue="….…"`; only the OICR modal uses dotted paths today. `/akili-specify` Bug Mode will add a guard test. |
| Merge direction: ensure cherry-pick carries only the multiselect hunks, not adjacent `dev` changes (api.service, dashboard, document-overview). | Cherry-pick by file path, then `git diff` review against the accepted fix. |

---

## Success Criteria

- On `main` build: selecting Primary and Contributing levers in the Create OICR modal persists into `createOicrBody().step_two.{primary_lever,contributor_lever}`.
- Cross-exclusion between primary and contributing levers reacts to selections.
- Step-2 completion validation passes when levers are chosen; the saved OICR body contains the chosen levers.
- Backported regression tests R-MNP-001…005 are **red before** the fix and **green after**.
- Full client suite (`npm test`) stays green; lint (`npm run lint -- --quiet`) stays clean.

---

## Next Step

```text
/akili-specify bugfix/oicr-lever-dropdowns
```

Run in **Bug Mode**: convert the confirmed root cause above into a fix plan (backport `writeAtPath` + template read + regression spec R-MNP-001…005), red-before/green-after.