# Requirements — bugfix / multiselect-nested-signal-path

- **Module:** client — `shared/components/custom-fields/multiselect`
- **Spec id:** 2026-08-multiselect-nested-signal-path
- **Status:** draft
- **Owner:** d.casanas@cgiar.org
- **Depth:** **Lite** + **Bug Mode**
- **Linked PRD section:** `docs/prd.md` — Results capture / Capacity Sharing
- **Linked tickets:** none (see proposal Q-2)
- **Proposal:** [`./proposal.md`](./proposal.md)
- **Last updated:** 2026-08-03

---

## 1. Executive summary

**`MultiselectComponent` writes selections to a key it never reads back.**

`setValue()` uses the dotted `signalOptionValue` in a computed-property position, which creates a literal top-level key instead of descending the path:

| Operation | Path handling | Line |
| --- | --- | --- |
| **Write** (`setValue`, `clear`) | `{ ...current, [this.signalOptionValue]: … }` → literal key `"group.trainee_organization_representative"` | `multiselect.component.ts:401`, `:376` |
| **Read** (`selectedOptions`, `onChange`, `syncBodyWithSignal`) | `utils.getNestedProperty` → descends `path.split('.')` | `multiselect.component.ts:177`, `utils.service.ts:41-45` |
| **Read** (component template, skeleton branch) | `this.signal()[this.signalOptionValue]` → **also a literal key** | `multiselect.component.html:1`, consumed `:96` |

> **Corrected after Judgment Day S-1.** An earlier draft claimed *"every read uses `getNestedProperty`"*. That is false — the component's own template reads by literal key. Its user-visible effect is cosmetic (it drives skeleton-placeholder count while options load), but it is the same defect class, in the same file, and is therefore in scope.

Confirmed by execution (proposal §Bug Diagnosis): the flat-path control returns `selectedOptions().length: 2`; the nested case returns `0` with the payload stranded under the literal key.

**One root cause, three symptoms.** Fixing the write resolves all three — no other method changes:

1. Nested path stays empty → chips empty, `isInvalid()` stays `true`.
2. `syncBodyWithSignal` correctly observes the empty path and resets `body.value = null` → ticked checkboxes un-tick.
3. `capacity-sharing.component.ts:122` spreads `body()` into the PATCH → the literal key ships to the server and the real field ships empty → **selections are silently discarded on Save**.

### Ruled out — do not re-investigate

| Hypothesis | Verdict |
| --- | --- |
| `syncBodyWithSignal` is a co-cause | ❌ It reads correctly; it is a downstream victim. **Do not modify it.** |
| PrimeNG `p-multiselect` model binding is at fault | ❌ Flat-path control passes with identical bindings |
| `getNestedProperty` fails to descend | ❌ Verified: `reduce` over `path.split('.')` |
| Only CapSharing is affected | ❌ 5 nested call sites across 3 features |

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Nested path** | A `signalOptionValue` containing `.` (e.g. `group.trainee_organization_representative`) |
| **Flat path** | A `signalOptionValue` with no `.` (e.g. `result_countries`) — the ~25 currently-working call sites |
| **Literal key** | The bogus top-level property whose name is the whole dotted string |

---

## 3. Scope

**In:** `MultiselectComponent.setValue()`, `.clear()`, and the template's literal-key read (`multiselect.component.html:1`); a regression test.

**Not changing:** `syncBodyWithSignal`, `selectedOptions`, `onChange`, `removeOption`, `setBodyFromSignal`; `MultiselectInstanceComponent`; `MultiselectOpensearchComponent`; every call-site template; the server contract.

---

## 4. Functional requirements

### R-MNP-001 — Selection persists to the nested path

- **As a** result reporter completing CapSharing details
- **I want** the organizations I select to stay selected
- **So that** I can complete the section and submit the result

**Behavior:** `setValue` SHALL write the selected items to the location addressed by `signalOptionValue`, descending each `.` segment, for both nested and flat paths.

#### Scenario: Nested path — the failing case

- GIVEN a multiselect with `signalOptionValue = "group.trainee_organization_representative"`
- AND a signal state of `{ group: { is_attending_organization: true, trainee_organization_representative: [] } }`
- WHEN `setValue([1, 2])` runs
- THEN `signal().group.trainee_organization_representative` contains both items
- AND `selectedOptions()` has length `2`
- AND `isInvalid()` is `false`
- BUT it must NOT create a top-level key named `"group.trainee_organization_representative"`
- AND IT MUST leave `signal().group.is_attending_organization` untouched at `true`

**Acceptance criteria:**
- [ ] AC.1 — `Object.keys(signal())` contains **no** key containing a `.`
- [ ] AC.2 — `selectedOptions().length === 2` and `isInvalid() === false`
- [ ] AC.3 — sibling keys under `group` survive the write

### R-MNP-002 — Selection survives change detection

**Behavior:** After effects flush, the selection SHALL still be present — `syncBodyWithSignal` must find a populated path and leave `body` alone.

#### Scenario: Post-flush stability

- GIVEN the state after R-MNP-001's scenario
- WHEN effects are flushed
- THEN `body().value` still equals `[1, 2]`
- BUT it must NOT be reset to `null` (today's observed behavior)

**Acceptance criteria:**
- [ ] AC.1 — `body().value` is `[1, 2]` **after `TestBed.flushEffects()`**

> **Judgment Day S-4 — this AC is only falsifiable with the flush.** `setValue` sets `body` unconditionally at `multiselect.component.ts:382`, so an assertion on `body().value` *without* a preceding flush **passes green on today's broken code**. The flush is not a formality; it is what makes this a real gate. A test that omits it is a false green, not a weak test.

### R-MNP-003 — `clear()` empties the nested path

**Behavior:** `clear()` SHALL reset the location addressed by `signalOptionValue`.

#### Scenario: Clearing a nested selection

- GIVEN a populated nested path
- WHEN `clear()` runs
- THEN `signal().group.trainee_organization_representative` is `[]`
- BUT it must NOT create or leave a dotted literal key

**Acceptance criteria:**
- [ ] AC.1 — nested path is `[]`; no dotted key present

### R-MNP-004 — Flat-path behavior is unchanged

**Behavior:** The ~25 flat-path call sites SHALL behave exactly as before.

#### Scenario: Flat path regression guard

- GIVEN `signalOptionValue = "flat_field"`
- WHEN `setValue([1, 2])` runs
- THEN `signal().flat_field` contains both items
- AND IT MUST emit a **new** top-level object reference so `OnPush` consumers and `selectEvent` subscribers still update

**Acceptance criteria:**
- [ ] AC.1 — flat path populated; `selectedOptions().length === 2`
- [ ] AC.2 — `signal()` returns a different object reference than before the call
- [ ] AC.3 — the full client suite is green
- [ ] AC.4 — for a single-segment path the write result is **exactly** `{ ...current, [key]: value }` (keeps the existing flat assertions at `multiselect.component.spec.ts:427-431, :508` green)

### R-MNP-005 — Absent or non-object intermediate segments are handled deterministically

**Behavior:** The write SHALL define one explicit behavior when a path segment does not resolve to a plain object.

> **Added after Judgment Day S-2.** Today `setValue` never touches `current.group`, so this case does not arise. The fix introduces intermediate traversal, so it does. Left unspecified, two implementers could write two spec-conformant helpers that differ invisibly to every listed gate. This matters at the OICR sites, where `step_three` is service-initialized (`create-result-management.service.ts:47`) but the picker can render before an autofill settles.

#### Scenario: Missing intermediate segment

- GIVEN a signal state of `{}` and `signalOptionValue = "group.trainee_organization_representative"`
- WHEN `setValue([1])` runs
- THEN the intermediate segment is **created** as a plain object (matching `setNestedPropertyWithReduce`'s `acc[key] ??= {}` convention)
- AND the leaf holds the item
- BUT it must NOT throw
- AND IT MUST NOT overwrite a segment that exists and is a non-empty object

**Acceptance criteria:**
- [ ] AC.1 — `signal() === {}` → write succeeds, no throw
- [ ] AC.2 — segment present as `null` → treated as absent and created, no throw

### R-MNP-006 — The template renders selection state from the resolved path

**Behavior:** The component template SHALL derive its skeleton-row list from the path-resolved selection, not from a literal-key lookup.

> **Added after Judgment Day S-1.** Cosmetic in effect, but leaving it means the spec eliminates a defect class everywhere except the file it was written to fix.

**Acceptance criteria:**
- [ ] AC.1 — `multiselect.component.html:1` no longer indexes the signal by the raw `signalOptionValue`
- [ ] AC.2 — skeleton row count during loading equals the selected-item count for a nested path

---

## 5. Non-functional requirements

### NFR-MNP-001 — The regression test must be able to fail

- **Category:** dx / test integrity
- **Target:** The regression test uses the **real** `UtilsService`, not a mock.
- **How verified:** Red-before-green — the test fails on current `main` and passes after the fix.
- **Rationale (KZ-001):** `multiselect.component.spec.ts:46` mocks `getNestedProperty` as `jest.fn().mockReturnValue([])`. A double that cannot evaluate nesting produced a green suite over this defect for the component's whole life. A test written against that mock would pass without proving anything.

---

## 6. Defect classes this spec can produce, and the gate for each

| # | Defect class | Gate | Automated? |
| --- | --- | --- | --- |
| D-1 | Fix does not actually write the nested path | New regression test with real `UtilsService` — **must be red first** | ✅ |
| D-2 | Fix breaks the 25 flat-path call sites | Full client suite `npm test -- --silent` (**KZ-003** — targeted suites prove the brief was followed, not that the blast radius is clean) | ✅ |
| D-3 | In-place mutation breaks `OnPush` / `selectEvent` | R-MNP-004 AC.2 asserts a new object reference | ✅ |
| D-4 | Test passes against a mock and proves nothing | NFR-MNP-001 red-before-green; **inspect the test's providers for `UtilsService`** | ⚠️ partial — the red-first step is the falsifiability check |
| D-5 | **Rendered checkbox still un-ticks in the real browser** | ❌ **No automated gate.** Unit tests assert component state, not PrimeNG's rendered DOM across a real change-detection cycle | ❌ |
| D-6 | **The fix makes previously-dead code reachable and it fails there** | ❌ **No automated gate.** See below — added after Judgment Day C-2 | ❌ |

### D-5 — rendered state (acknowledged blind spot)

`body().value === [1,2]` after `TestBed.flushEffects()` is the closest proxy the unit layer offers, and it is not the same claim as "the checkbox stays ticked and the chips render". Per **KZ-006**, the substitute is a **human check in a real browser**, reproducing the known failure first as a control.

**Scope corrected after Judgment Day C-1** — the original script covered CapSharing only, which left a second blocking surface unverified. Both are mandatory:

1. **CapSharing** — `/result/<code>/capacity-sharing` → "Yes" → select two organizations → they stay ticked, chips render, the required error clears, **Save** persists after reload.
2. **OICR create, step 3** — open the OICR create modal → set a geographic scope with `geo_scope_id > 1` → select regions and countries → selections persist, **`isCompleteStepThree` turns true**, and the sub-national rows render per selected country **without a console error**.

### D-6 — newly-reachable code (added after Judgment Day C-2)

**The fix activates code that has never executed.** Today `setValue` never lands in `step_three.countries`, so the OICR sub-national cascade is unreachable. After the fix it goes live for the first time.

The specific hazard raised by one judge and **not yet verified**: `setValue` builds items as plain clones (`multiselect.component.ts:394-398`) that do not carry `result_countries_sub_nationals_signal`, while the `#rows` template calls it as a function with no guard (`create-oicr-form.component.html:360, 361, 380`); the signal is attached only later by the effect at `create-oicr-form.component.ts:470-477`. If that holds, the result is a render-time `TypeError` in the OICR modal.

Why no listed gate catches it:

| Gate | Why it misses D-6 |
| --- | --- |
| D-2 full client suite | Green today over the broken behavior; asserts nothing about this path |
| D-5 browser check | Was CapSharing-scoped (now extended above — that extension **is** the substitute gate) |

**Substitute:** D-5 step 2 above, plus an execution-time task to verify the sub-national mechanism **before** the fix ships. This class is why the spec's task list grew.

> **Method note.** D-6 exists because a reviewer asked "what becomes reachable?", a question the original defect-class list never asked. Any spec whose fix restores a dormant data path should carry this class by default.

---

## 7. Assumptions, dependencies, risks

| # | Item | Note |
| --- | --- | --- |
| A-1 | The **7** non-CapSharing nested call sites share the identical defect | **Corrected from 4 after Judgment Day C-1.** Same code path; only CapSharing was reproduced empirically |
| R-1 | 30 callers render this component | Full-suite gate (D-2) |
| R-2 | `setNestedPropertyWithReduce` mutates in place | Design must preserve a fresh top-level reference (D-3) |
| R-3 | `removeOption` becomes **reachable for the first time** at nested sites, and emits `selectEvent` re-entrantly inside `signal.update()` (`:424-428`) — a clobbering shape documented in-repo at `pool-funding-alignment.component.ts:336-341` | Single-judge finding (S-3), not corroborated. `removeOption` is confirmed *path*-correct by both judges; the concern is *reachability*. Verify chip removal at an OICR country multiselect during execution |

---

## 8. Open questions

| # | Question | Owner | Blocking? |
| --- | --- | --- | --- |
| Q-1 | Are results already persisted server-side carrying the dotted literal key? Decides whether a data-repair task is in scope. | d.casanas@cgiar.org | **No** — the fix is correct either way; repair would be a separate spec |
| Q-2 | Jira ticket to link? | d.casanas@cgiar.org | No |

---

## 9. Requirement ID index

| ID | Title | Covered by |
| --- | --- | --- |
| R-MNP-001 | Selection persists to the nested path | T-01, T-02 |
| R-MNP-002 | Selection survives change detection | T-01, T-02 |
| R-MNP-003 | `clear()` empties the nested path | T-01, T-02 |
| R-MNP-004 | Flat-path behavior unchanged | T-01, T-02, T-05 |
| R-MNP-005 | Absent / non-object intermediate segments | T-01, T-02 |
| R-MNP-006 | Template renders from the resolved path | T-03 |
| NFR-MNP-001 | Regression test must be able to fail | T-01 |

---

## 10. Sign-off

- [ ] Engineering lead — d.casanas@cgiar.org
- [ ] Browser verification **D-5 step 1 (CapSharing)** — mandatory before close
- [ ] Browser verification **D-5 step 2 (OICR create step 3)** — mandatory before close; this is the only gate for D-6
