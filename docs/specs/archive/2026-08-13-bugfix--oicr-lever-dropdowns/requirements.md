# Requirements — bugfix / oicr-lever-dropdowns

- **Module:** client (shared component)
- **Spec id:** 2026-08-oicr-lever-dropdowns
- **Status:** draft
- **Owner:** <name / squad>
- **Linked proposal:** ./proposal.md
- **Type:** Bug (Bug Mode)
- **Depth:** Lite
- **Last updated:** 2026-08-13

---

## 1. Context

On `main`/staging/prod, **Primary Levers** and **Contributing Levers** dropdowns in the Create OICR modal (step 2) let the user click options but the selection **does not persist** — `createOicrBody().step_two.{primary_lever,contributor_lever}` stays empty, so cross-exclusion, step-2 validation, and the saved body all see no levers. On `dev` (test env) the same modal works. Root cause confirmed in `proposal.md` Bug Diagnosis: `MultiselectComponent` on `main` writes a dotted `signalOptionValue` as a flat top-level key (creating spurious `"step_two.primary_lever"` root keys) while everything reads the nested path. This spec backports the already-tested `dev` fix.

Not changing: the OICR form template, `createResultManagementService`, the levers service, the OpenSearch `multiselect-opensearch` variant, server code, data model.

---

## 2. Requirement numbering

`R-OLD-<NNN>` — `OLD` = OICR Lever Dropdowns.

---

## 3. Functional requirements

### R-OLD-001 — Nested-path lever selection writes through

- **As an** OICR submitter
- **I want** my Primary/Contributing Lever selection written into `step_two.primary_lever` / `step_two.contributor_lever`
- **So that** cross-exclusion, step-2 validation, and the saved OICR body all see the chosen levers.

**Behavior:**

- Selecting levers in an `<app-multiselect>` whose `signalOptionValue` is a **dotted path** (`step_two.primary_lever`, `step_two.contributor_lever`) SHALL update the nested property, NOT create a top-level key whose name contains a dot.
- Sibling keys under the nested parent (e.g. `step_two`'s other fields) MUST survive the write.
- The new root reference MUST differ from the previous root (immutability for Angular signal change detection).
- `setValue` reads the previous items via `getNestedProperty` (nested) and SHALL write symmetrically via a nested-path writer.
- `clear()` SHALL empty the nested path (leaving `[]`), not create a dotted key.

**Acceptance criteria:**

- [ ] AC.1 — After `setValue([1,2])` on `signalOptionValue="step_two.primary_lever"`, no top-level key of `signal()` contains a `.`.
- [ ] AC.2 — After `setValue([1,2])`, `signal().step_two.primary_lever` has length 2 and `selectedOptions().length` is 2 and required-invalid clears.
- [ ] AC.3 — Sibling keys under `step_two` survive the write.
- [ ] AC.4 — `clear()` empties `step_two.primary_lever` to `[]` and leaves no dotted key.
- [ ] AC.5 — A flat `signalOptionValue="flat_field"` write keeps current behavior (no regression for flat-path consumers).

**Out of scope:** changing the OICR body contract, server-side lever storage, other dropdown variants.

---

### R-OLD-002 — Missing/intermediate-path robustness

- **As a** developer consuming the shared component
- **I want** a dotted `signalOptionValue` to work when intermediate segments are missing or `null`
- **So that** selection does not crash and the parent is created on demand.

**Behavior:**

- `setValue` on `signalOptionValue="group.trainee_organization_representative"` when `group` is absent or `null` SHALL create the intermediate object on the write path and not throw.

**Acceptance criteria:**

- [ ] AC.1 — `setValue([1])` against `{}` does not throw and yields `.group.trainee_organization_representative.length === 1`.
- [ ] AC.2 — Against `{ group: null }`, same outcome and no throw.

---

## 4. Non-functional requirements

### NFR-OLD-001 — No flat-path consumer regression (blast radius)

- **Category:** reliability
- **Target:** full client test suite stays green for every `<app-multiselect>` consumer (KZ-003: enumerate by what renders, KZ-002: shared component verified at shared layer).
- **How verified:** `npm test` (full suite) — not a targeted multiselect-only run.

---

## 5. Defect classes & verification gates

| Defect class this spec can produce | Catching command |
| --- | --- |
| Nested-path write regression (the bug itself) | `multiselect.component.spec.ts` R-MNP-001/003/005 — **red before fix, green after** |
| Flat-path consumer regression from shared change | R-MNP-004 + full client `npm test` |
| Cross-exclusion effect reaction after selection | existing `create-oicr-form.component.spec.ts` effects + full `npm test` |
| Rendered chip/state visuals (jsdom cannot measure rendering) | **No automated check.** Substitute: human visual check at the HITL execution pause against the live Create OICR modal step 2. Recorded as a HITL gap, not collapsed into a green `npm test`. |

Per the gate rule, the visual class has no automated gate; it is substituted by a HITL visual check. No T6 dispatch is needed — the logic/state fix is fully covered by jest; only the rendered affordance needs human eyes.

---

## 6. Assumptions, dependencies, risks

- Confirmed `app-multiselect` is used on many routes (KZ-003); R-MNP-004 must stay green and full suite must pass.
- Cherry-pick must carry only the multiselect + spec hunks, not adjacent `dev`-only divergence (api.service, dashboard, document-overview).

---

## 7. Open questions

- None requiring another spec; the fix is already shipped-and-tested on `dev`.