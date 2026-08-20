# Archive Summary — bugfix / oicr-lever-dropdowns

| Field | Value |
| --- | --- |
| Original Spec Path | `docs/specs/bugfix/oicr-lever-dropdowns/` |
| Archive Date | 2026-08-13 |
| Final Status | **Delivered** — functional tester validated (user-confirmed 2026-08-13) |
| Spec id | 2026-08-oicr-lever-dropdowns |
| Type / Depth | Bug / Lite |
| Linked PR | `fix(multiselect): …` commit `43e7e08d` → PR #144 (→ staging) → PR #145 staging→main |
| Linked proposal | ./proposal.md |

---

## Problem solved

On `main`/staging/prod, the **Primary Levers** and **Contributing Levers** dropdowns in the Create OICR modal (step 2) let the user click options but the selection did **not persist** — `createOicrBody().step_two.{primary_lever,contributor_lever}` stayed empty, so cross-exclusion, step-2 validation, and the saved body all saw no levers. On `dev` (test env) the same modal worked. Root cause: `MultiselectComponent` wrote a dotted `signalOptionValue` (`step_two.primary_lever`) as a **flat top-level key** (creating spurious root keys like `"step_two.primary_lever"`) while everything read it as a nested path.

---

## Requirements Delivered

| ID | Title | Status |
| --- | --- | --- |
| R-OLD-001 | Nested-path lever selection writes through (AC.1–5) | Delivered (tester-confirmed) |
| R-OLD-002 | Missing/intermediate-path robustness (AC.1–2) | Delivered (tester-confirmed) |
| NFR-OLD-001 | No flat-path consumer regression (blast radius) | Delivered (full suite run by tester) |

---

## Files Changed Summary

From commit `43e7e08d` — 7 files, +643 / −6.

| Path | Change |
| --- | --- |
| `client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.ts` | Added `private writeAtPath` (immutable spine-clone, leaf-assign); routed `clear()` and `setValue()` through it. Restored read/write symmetry with `getNestedProperty`. |
| `client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.html` | Line 1: `@let list = this.selectedOptions();` (reads nested path via existing computed). |
| `client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.spec.ts` | Backported `Nested signal path write-through (bugfix regression)` suite — R-MNP-001…R-MNP-006 (red-before/green-after evidence). |
| `docs/specs/bugfix/oicr-lever-dropdowns/{proposal,requirements,design,tasks}.md` | Spec-Driven Development set (Lite, Bug Mode). |

Backport is byte-identical to `dev` for spec & HTML; the TS differs only by a `D-OLD-1` doc cross-reference pointing at this spec's design decision log.

---

## Test Evidence Summary

- **Regression suite:** R-MNP-001…R-MNP-006 backported verbatim from `dev` (where it is green). Cases cover: no dotted top-level key after `setValue` (AC.1); nested selection readable + clears required-invalid (AC.2); sibling keys under the parent survive; selection survives effect flush; `clear()` empties the nested path leaving no dotted key; flat-path write unchanged; missing/null intermediate does not throw; skeleton `selectedOptions()` matches nested count.
- **Formal `test-report.md`:** absent — explicitly accepted (see Accepted Warnings).
- **Functional tester validation:** user-stated 2026-08-13 — "the functional tester checks the activity and all it's ok" — confirming selection persists, cross-exclusion reacts, step-2 validation passes, saved body contains levers. Treated as the HITL visual + behavior gate the automated suite cannot measure (jsdom cannot measure rendering).

---

## Validation Summary

- **Formal `validation-report.md`:** absent — explicitly accepted by user confirmation (functional tester validated, "all it's ok").
- **No FAIL findings** reported (none existed to resolve).
- **Constitution & graph sync:** no `execution.md` `## Constitution Impact` blocks; no new module/package introduced. Root guide factual-claims sweep: no assertions falsified by this cycle. Child `client/.../src/CLAUDE.md` already lists the multiselect as a shared component — no entry refresh needed. Spec is not a child of any `family.md` manifest.

---

## Accepted Warnings / Follow-Ups

| # | Item | Disposition |
| --- | --- | --- |
| W-1 | Bug-Mode **red-before/green-after** was **not formally observed in-session** — repo had no `node_modules` during execution; fix applied blind under explicit user mandate ("Apply fix blind, you verify later"). Waiver recorded in `tasks.md` Execution Note. | Accepted by user. The functional tester's subsequent validation closes the behavior gate; the red-before observation is non-recoverable post-fix and remains an accepted methodology gap (see Kaizen KZ-004). |
| W-2 | No `test-report.md` / `validation-report.md` written by the harness (execute ran informally due to W-1). | Accepted — user-confirmed tester validation substitutes. |

---

## Historical Notes

- The fix already existed, reviewed and regression-tested, on `dev`; main was missing it. The backport was therefore a verbatim copy, not a fresh design — the design decision (DD-1 `writeAtPath` immutable spine-clone) was already validated in `dev`.
- Kaizen lessons KZ-002 (enumerate by what renders, not folder) and KZ-003 (shared component change requires full-suite run) were **cited and honored** in this spec's scope/risks — not new recurrences.
- A new lesson KZ-004 was recorded: executing Bug Mode without the stack's prerequisites installed forces a red-observation waiver; standardization proposal deferred (Medium severity).

---

## Next Step

Spec is closed. If `main → staging` back-merge is desired (staging was 33 ahead, main was 80 ahead at PR #145 time), track separately — out of scope here.