# Design — bugfix / oicr-lever-dropdowns

- **Module:** client (shared component)
- **Spec id:** 2026-08-oicr-lever-dropdowns
- **Status:** draft
- **Linked requirements:** ./requirements.md
- **Depth:** Lite
- **Last updated:** 2026-08-13

---

## 1. Goals & non-goals

- **Goals:** (1) make `MultiselectComponent` write `signalOptionValue` symmetrically to how it reads it (nested path) so OICR-modal primary/contributing levers persist — R-OLD-001/002; (2) ship a regression suite red-before/green-after — R-OLD-* AC.
- **Non-goals:** refactor beyond the minimal nested-write fix; touch the OICR form template or service; modify the OpenSearch variant; any server/data change.

---

## 2. Architecture

No new files, no new modules. The change is surgical to the existing shared component:

- `client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.ts`
- `client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.html`
- `client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.spec.ts`

**Reuse:** the existing `selectedOptions` computed (already reads nested via `UtilsService.getNestedProperty`) and the existing `UtilsService.setNestedPropertyWithReduce` convention. The write side closes the read/write asymmetry that caused the bug.

**Bug Mode constraint:** scope stays at the root cause. The OICR form that *passes* the dotted path (`create-oicr-form.component.html`) is a legitimate user of a nested body shape (`step_two.*`) and is not the defect — `app-multiselect` is.

---

## 3. Data model

No data model changes. Server lever storage is unchanged.

---

## 4. API surface

No API changes.

---

## 5. Workflows & business rules

- OICR modal step 2 selecting a lever appends a `{lever_id, …}` object to the nested array via `setValue`; `clear` empties it.
- Symmetry restored: `getNestedProperty` (read) ↔ `writeAtPath` (write). `writeAtPath` clones the spine (root + intermediate segments) and assigns at the leaf, returning a new root — immutable by construction (safe for Angular signals), mirroring `setNestedPropertyWithReduce`'s `acc[key] ??= {}` without its in-place mutation.
- Cross-exclusion (`optionsDisabled`/`primaryOptionsDisabled` effects) is downstream of the nested body; once the write reaches the nested path, the existing effects fire unchanged.

---

## 8. Security & authorization

No auth/authz surface touched.

---

## 10. Testing strategy

- Unit: backport `describe('Nested signal path write-through (bugfix regression)')`, cases R-MNP-001…R-MNP-005 (red on current `main`, green after fix). Covers dotted-key absence, nested readable + required-invalid clear, sibling-key survival, effect-flush body persistence, `clear()` empties nested path, flat-path unchanged, missing/null intermediate.
- Suite: run the **full** client suite (KZ-003) to confirm the shared-component change does not regress flat-path consumers.
- Visual (gap): a HITL visual check of the live Create OICR modal step 2 confirms rendered chips/state — jsdom cannot measure rendering (see requirements §5).

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- | 
| D-OLD-1 | 2026-08-13 | Backport `writeAtPath` verbatim from `dev` (immutable spine-clone write) instead of in-place mutation or changing the dotted consumer | Smallest safe path; already shipped, reviewed, and regression-tested on `dev`; preserves angular-signal immutability by returning a new root reference each write |
| D-OLD-2 | 2026-08-13 | Template read switches to existing `selectedOptions()` computed instead of flat `this.signal()[this.signalOptionValue]` | `selectedOptions` already resolves the nested path via `getNestedProperty`; the read side was never broken, aligning the template with it completes the read/write symmetry |
| D-OLD-3 | 2026-08-13 | Keep the OICR dotted `signalOptionValue` contract (`step_two.primary_lever`) — do not flatten it | The nested `step_two.*` body shape is the server-expected contract; coercing the shared component to write nested is cheaper/safer than changing every consumer's body shape |

Step 2.3 reversion challenge: no DD removes already-delivered behavior — all three ADD correction to broken behavior on `main`. No challenge required.

---

## 2.4 Budget (post-design re-check)

| Metric | Estimate |
| --- | --- |
| Expected tasks | 1 (plus the implicit suite gate) |
| Expected LOC | ~25 TS + ~20 spec lines backported + 1 template line |
| Expected review rounds | 1 |

Matches Lite — no escalation. `/akili-execute` trips when actuals exceed this.

---

## 13. Open questions

- None.