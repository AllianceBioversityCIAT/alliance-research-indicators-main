# Design — bugfix / multiselect-nested-signal-path

- **Module:** client — `shared/components/custom-fields/multiselect`
- **Spec id:** 2026-08-multiselect-nested-signal-path
- **Status:** draft
- **Owner:** d.casanas@cgiar.org
- **Depth:** **Lite** + **Bug Mode**
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Delegation note:** the Step 2.3 reversion challenge was run **inline**, not delegated — subagent spawning is not authorized in this session. No independence constraint is broken; specify's designer role is safe to absorb inline.
- **Last updated:** 2026-08-03

---

## 1. Executive summary

Make the write side of `MultiselectComponent` address the same location the read side already addresses. The change is confined to two methods; nothing else moves.

| Site | Today | After |
| --- | --- | --- |
| `setValue` (`:381`) | Spreads a **literal dotted key** onto the state root | Writes through the path, cloning each segment |
| `clear` (`:373`) | Same literal-key defect | Same path-aware write |
| `multiselect.component.html:1` | `this.signal()[this.signalOptionValue]` — **literal-key read** | Path-resolved read |

Everything else — `selectedOptions`, `syncBodyWithSignal`, `onChange`, `removeOption`, `setBodyFromSignal` — is already correct and is **not touched**.

> **Corrected after Judgment Day (round 1).** This section previously listed two methods and asserted "every read uses `getNestedProperty`". A judge found a third site — the component's own template — and I verified it. The template read is cosmetic in effect (it sizes the loading skeleton), but excluding it would leave the spec's own defect class armed in the file the spec exists to fix.

---

## 2. Architecture overview

No architectural change. This is a defect inside one standalone shared component; no module boundary, service contract, route, or DI graph moves.

**Data flow after the fix** (the only altered hop is ①):

| # | Hop | Mechanism |
| --- | --- | --- |
| ① | `p-multiselect` `ngModelChange` → `setValue` | **Changed** — writes through the dotted path |
| ② | state signal → `selectedOptions()` | Unchanged — `utils.getNestedProperty` |
| ③ | state signal → `syncBodyWithSignal` → `body` | Unchanged — now finds a populated path, so it stops nulling `body` |
| ④ | `body()` → PATCH payload | Unchanged — now carries the real field, no dotted key |
| ⑤ | state signal → template `@let list` → skeleton rows | **Changed** — path-resolved instead of literal-key |

Symptoms 2 and 3 from `requirements.md` §1 resolve as consequences of ①. They get **no** code of their own.

### 2.1 What becomes reachable (Judgment Day C-2)

The fix does not only change values — it **restores a dead data path**. Today `setValue` never lands in `step_three.countries`, so everything downstream of a populated OICR country list has never executed:

| Newly-reachable | Location | Status |
| --- | --- | --- |
| Sub-national cascade rows | `create-oicr-form.component.html:360-380` | Calls `result_countries_sub_nationals_signal()` with **no call guard** |
| Sub-national signal attachment | `create-oicr-form.component.ts:470-477` | Runs only after `step_three.countries` is populated |
| `isCompleteStepThree` passing | `create-oicr-form.component.ts:423-424` | Currently unsatisfiable for `geo_scope_id > 1` |
| `removeOption` at nested sites | `multiselect.component.ts:418-430` | Chips cannot exist today, so removal has never run |

**This is treated as design surface, not as an incidental risk.** T-04 verifies it before the fix ships; requirements D-6 records that no automated gate covers it.

---

## 3. Extended directory structure

```
client/research-indicators/src/app/shared/components/custom-fields/multiselect/
├── multiselect.component.ts          # MODIFIED — setValue(), clear(), private path-write helper
├── multiselect.component.html        # MODIFIED — line 1, literal-key read → path-resolved
└── multiselect.component.spec.ts     # MODIFIED — append nested-path regression describe block
```

No new files, no new directories.

---

## 4. Data model

Unchanged. No entity, DTO, migration, or persisted shape is altered. The PATCH payload changes only in that it stops carrying a malformed key — the documented contract was always the nested field.

---

## 5. API design

Unchanged. No endpoint, envelope, or version is touched.

---

## 6. Backend module design

Not applicable — client-only change.

---

## 7. Frontend component architecture

### 7.1 The write helper

`setValue` needs a path-aware write that returns a **new** root reference. Two candidates were evaluated (DD-1); the chosen one clones the spine of the path — the root object and each intermediate segment along `signalOptionValue` — then assigns the leaf. Objects outside the path keep their identity, so unrelated consumers are undisturbed.

Ordering constraint: `setValue` reads `prevItems` from the current state **before** writing. The clone-then-assign shape preserves that ordering naturally; a mutate-in-place shape would make read/write order load-bearing.

`clear()` uses the same helper with an empty array.

**Invariants the helper must satisfy** (added after Judgment Day; none of these were implied by the acceptance criteria alone, so an implementer could satisfy every AC and still break them):

| # | Invariant | Why |
| --- | --- | --- |
| I-1 | A **single-segment** path reduces to exactly `{ ...current, [key]: value }` | Keeps the existing flat assertions green (`multiselect.component.spec.ts:427-431`, `:508`) |
| I-2 | The caller **reassigns** `nextState` from the helper's return | `setValue` emits `nextState` later via `queueMicrotask` (`:405`); a helper whose result is dropped emits `undefined` to every `(selectEvent)` subscriber |
| I-3 | A missing or `null` intermediate segment is **created** as a plain object | Matches `setNestedPropertyWithReduce`'s `acc[key] ??= {}` convention (R-MNP-005) |
| I-4 | An existing intermediate segment keeps its other keys | R-MNP-001 AC.3 — `group.is_attending_organization` must survive |

### 7.1.1 Template read

`multiselect.component.html:1` derives `list` — used only for skeleton-row count at `:96` — from a literal-key lookup. It changes to the path-resolved selection. `selectedOptions()` already computes exactly this and is the natural source.

### 7.2 Where the helper lives

It stays **private to `MultiselectComponent`**. `UtilsService.setNestedPropertyWithReduce` is deliberately not extended or altered: it has 9+ callers across radio-button, textarea, and oicr-form-fields, and changing its mutation semantics would put every one of them in the blast radius for no benefit here (**KZ-003**).

### 7.3 UI / UX

No visual change. No token, class, layout, or a11y attribute is touched. The fix restores the component's already-designed behavior.

---

## 8. Shared contracts

None. `signalOptionValue`'s public contract — "a dot-delimited path into the bound signal" — is unchanged; it simply starts being honored on write. All **8** nested call-site templates keep working with no edit.

> **Corrected after Judgment Day C-1: 8, not 5.** The original enumeration searched only the attribute form and missed three property-bindings in the OICR create modal (`create-oicr-form.component.html:331, 344, 404`). Verified independently by re-running the search across both binding forms.

Consumers of the three missed sites read the nested path directly — `create-oicr-form.component.ts:423-424` (`isCompleteStepThree`) and `:448-449` (`mapCountriesToSubnationalSignals`) — which is what makes OICR create step 3 a **second blocking surface**, not merely a second cosmetic one.

---

## 9. Design decisions

### DD-1 — Clone the path spine rather than reuse `setNestedPropertyWithReduce`

**Decision:** implement a private clone-then-assign write; do **not** call the existing mutating helper.

**Reversion challenge (Step 2.3).** Choosing the mutating helper would revert a property `setValue` ships today: it is currently the component's only *purely immutable* writer (`{ ...current, … }`). Question asked: *what does removing that immutability break?*

Inline investigation — the only prev-vs-next comparator in the client is `pool-funding-alignment.component.ts:236` (`isDirty`), which is also a multiselect consumer (`:135`). It baselines off `snapshotFromServer(alignment())` — a **separate** server-backed signal — not a retained previous form-state object. It therefore does **not** break under in-place mutation.

**Outcome: no concrete breakage found.** The reversion is nonetheless rejected — but **not for the reason first recorded here**.

> **Rationale corrected after Judgment Day C-3 (both judges, independently).** The original text justified the extra work as removing "a latent hazard: the moment anyone adds a snapshot-based dirty check over a multiselect-backed form, in-place mutation would corrupt the baseline silently."
>
> **That claim is false.** Two sibling writers in this very component already mutate the caller's object in place — `removeOption` (`:426`) and the `onChange` effect (`:193`), both via `setNestedPropertyWithReduce`, which assigns through `acc[key]` with no cloning (`utils.service.ts:31-38`). For a nested path both write into the *previous* root's intermediate segment before returning a fresh root. The hazard is therefore **not removed**; at best it is reduced for two of four writers.
>
> Recording it as removed would have told the next author this component is immutable-by-construction. It is not.

**The surviving reason to choose the immutable form** is DD-4's, and only DD-4's: `setValue` must return a **new root reference** for `OnPush` consumers and for the `queueMicrotask` `selectEvent` emission. Clone-then-assign gets that by construction; mutate-then-spread gets it too, but makes read/write ordering load-bearing (`prevItems` is read from `current` before the write). The clone form is chosen for that ordering safety — a smaller and honest claim than the one it replaces.

**Rejected alternatives:**

| Option | Why rejected |
| --- | --- |
| Reuse `setNestedPropertyWithReduce` | Mutates in place; reverts `setValue`'s immutability for no gain (above) |
| Migrate the 5 call sites to flat paths | Touches 3 features + payload shapes; leaves the shared-component defect armed |
| Reject dotted paths at the input boundary | Fixes nothing today; would break all 5 call sites loudly. Viable **follow-up**, not this spec |

### DD-2 — Do not touch `syncBodyWithSignal`

It reads correctly and is a downstream victim. Modifying it would mask symptom 3 while leaving the root cause live, and would put the 25 flat-path call sites at risk. Recorded so no implementer "helpfully" fixes it.

### DD-3 — Regression test uses the real `UtilsService` (**KZ-001**)

The existing spec's providers mock `getNestedProperty` to always return `[]`. The new `describe` block must provide the **real** `UtilsService` in its own TestBed so nesting is genuinely evaluated. The existing mocked cases stay as-is — rewriting them is out of scope.

Corollary: the test must be observed **red on current code** before the fix. A green-on-first-run test here is evidence the mock leaked in, not evidence of correctness.

**Setup mechanics — mandatory (added after Judgment Day C-4, both judges).** The file's top-level `beforeEach` already *instantiates* the TestBed (`multiselect.component.spec.ts:68`, `TestBed.inject(MultiselectComponent)`). A nested `describe` that calls `configureTestingModule` without first resetting throws *"Cannot configure the test module when the test module has already been instantiated"*.

| Requirement | Detail |
| --- | --- |
| Reset first | `TestBed.resetTestingModule()` in the block's `beforeEach` (and `afterEach`) |
| Re-supply doubles | All five others — `ElementRef`, `ActionsService`, `ServiceLocatorService`, `CacheService`, `AllModalsService` — are lost by the reset |
| Precedent to copy | The SSR block at `multiselect.component.spec.ts:1512-1531` already does exactly this |

Without this, the red-before-green step yields a **setup error rather than a meaningful red** — indistinguishable from a real failure, and it consumes the single review round the §10 budget allows.

**Strongest assertion.** `Object.keys(signal())` containing no dotted key (R-MNP-001 AC.1) is **mock-independent** and genuinely red today. Lead with it: it is the one assertion that cannot false-green.

### DD-5 — Verify the newly-reachable OICR path before shipping (Judgment Day C-2)

The fix restores a dead data path (§2.1). The design treats this as first-class scope rather than a downstream surprise:

- **T-04** verifies the OICR sub-national cascade renders with the items `setValue` actually produces — plain clones from `multiselect.component.ts:394-398` that carry no `result_countries_sub_nationals_signal`, against a template that calls it unguarded.
- If that combination throws, the guard belongs in **this** spec. Shipping a "no other method changes" bugfix that crashes the OICR modal would be the worst possible outcome of a green suite.
- The single-judge `removeOption` re-entrancy concern (requirements R-3) is verified in the same task, since it becomes reachable through the same door.

### DD-4 — Assert a new root reference

`OnPush` consumers and `selectEvent` subscribers depend on the root reference changing. R-MNP-004 AC.2 pins this so a future refactor toward in-place mutation fails loudly instead of silently degrading change detection.

---

## 10. Budget (Step 2.4 — tripwire for `/akili-execute`)

**Re-baselined after Judgment Day round 1.** The pre-review budget (3 tasks / ~70 LOC / 1 round) was set against a 5-call-site, two-method scope that review proved wrong.

| Metric | Pre-review | **Current** |
| --- | --- | --- |
| **Tasks** | 3 | **5** |
| **LOC** | ~70 (~12 prod) | **~110** — ~20 production, ~90 test |
| **Review rounds** | 1 | **1** |

Growth is entirely from findings, not scope creep: +1 task for the newly-reachable OICR verification (DD-5), +1 for the template read (R-MNP-006), +~30 test LOC for R-MNP-005 edge cases and the flat-path reference assertion.

**Depth re-check: still Lite.** Production change remains ~20 lines in one component. Five small tasks with one human verification does not warrant Standard — the count grew because the *verification surface* grew, not the design.

If execution exceeds these numbers, the Leader stops and escalates. **Not a cap on quality:** both browser checks (D-5 steps 1 and 2) are mandatory regardless of budget, and D-5 step 2 is the only gate for D-6.

---

## 11. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| R-1 | 30 callers render this component | Full client suite, not targeted (**KZ-003**) |
| R-2 | Test written against the leaked mock proves nothing | Red-before-green is the falsifiability check (**KZ-001**, DD-3) |
| R-3 | Unit tests cannot prove the rendered checkbox stays ticked | Mandatory human browser check (**KZ-006**, requirements §6 D-5 step 1) |
| **R-4** | **The fix makes dormant OICR code reachable and it may throw** | T-04 verification + D-5 step 2. **No automated gate exists** (requirements D-6) |
| **R-5** | `removeOption` re-entrant `selectEvent` inside `signal.update()` becomes reachable at nested sites | Single-judge finding, uncorroborated. Verified in T-04 |
| **R-6** | The judges shared the author's model tier | Independence was **context blindness, not model diversity**. A defect visible only to a different model generation would survive this review. Recorded in `judgment.md` |
