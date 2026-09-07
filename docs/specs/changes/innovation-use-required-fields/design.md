# Design — Innovation Use / Required-field semantics and green check

- **Module:** client (`innovation-use-details` + 2 shared components) · server (1 migration)
- **Spec id:** 2026-09-innovation-use-required-fields
- **Status:** draft — **revision 6**; all Judgment Day findings closed, all open questions decided, Phase 3 correction-closure sweep applied
- **Owner:** D. Casañas
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Findings ledger:** [`./judgment.md`](./judgment.md)
- **Linked TRD:** [`docs/trd/trd.md`](../../../trd/trd.md) §6.3
- **Last updated:** 2026-09-04
- **Depth:** **Full** — raised from Standard at Step 2.4; see §11

> **Revision 3 note.** Round 1: 15 confirmed findings — the structure survived, the **factual layer**
> did not; five were the same mistake, asserting parity between surfaces that are not in parity
> (`DC-3`, the class this design named dominant). Round 2 re-judged the correction and returned
> **21 closed, 3 partial, 0 regressed — plus 12 defects caused by the fix itself**, two of them severe:
> the `DD-8` actor scenario was not constructible (`N-1`), and `DD-3` and `DD-10` cancelled each other
> (`N-2`). Both are resolved below. Corrections carry their finding ID; `N-*` are round 2.
>
> **Round 3 judged this revision and the budget is now spent.** Terminal state: **ESCALATED**.
>
> ## ✅ All three round-3 severe findings are now RESOLVED
>
> Round 3's judges **contradicted each other**; orchestrator verification found the dissenting judge
> correct on all three. All three are now closed — `P-1` by a per-control gate, `P-2` by a browser
> measurement the user supplied (which no judge and no test in this repo could produce), `P-3` by
> `DD-12`. Full record in [`judgment.md`](./judgment.md).
>
> **Both remaining decisions were taken by the user on 2026-09-04:** `OQ-4` — D. Casañas runs the
> migration manually (§9 step 3); `OQ-6` — `showNotIdentifiedMessage` is **suppressed, not removed**
> (`DD-9`). **No blocking item remains.**
>
> | ID | Verified fact | What breaks if implemented as written |
> | --- | --- | --- |
> | **P-1** | ✅ **RESOLVED 2026-09-04.** `p-inputNumber` declares `style` as an `@Input` (`primeng-inputnumber.mjs:1677`) and never applies it, so the setter spy cannot fire for rules 3, 5, 9, 10. | `DD-3` now specifies a **per-control gate**: setter spy for `p-select`/`p-inputtext`, **class assertion** for `p-inputNumber`. |
> | **P-2** | ✅ **RESOLVED 2026-09-04 by browser evidence.** The user supplied a screenshot of an `app-input type="number"` rendering the amber border; with `:55` proven a no-op and no global CSS in play, **`:49` is the live mechanism** — the opposite of what revision 3 asserted. | `DD-10` **inverted**: `:49` is converted (not deleted) and the dead `:55` is deleted. Revision 3 would have removed the only amber border on every numeric field app-wide. |
> | **P-3** | ✅ **RESOLVED 2026-09-04.** The inactive path's controls are not rendered (`@if`/`@else` at `.html:36`/`:79`) and no select sets `[showClear]`, so a gate over hidden state could not be escaped. | **`DD-12`** clears the path being left on toggle, mirroring the actor card. The hidden state is removed at its source, so `DD-8`'s site-2 gate is **withdrawn** rather than repaired. |
>
> `DD-8`'s site-1 gate, `DD-0`, `DD-5`, `DD-5b`, `DD-6`, `DD-7`, `DD-9` and the rule table are
> unaffected by these three and were confirmed closed by both judges.
>
> ## Revision 6 — Phase 3 correction-closure sweep
>
> The Phase 3 gate ran the **backward** sweep the methodology mandates on every Adjust round, over
> the two corrections that landed in `requirements.md` without one. It found **four** sites where
> this design still asserted the superseded value — none of them cited by the finding that caused
> the correction, which is precisely how a stale claim survives:
>
> | Site | Asserted | Corrected to | Would have caused |
> | --- | --- | --- | --- |
> | `DD-4` table + rationale | `numberAllowsZero` (`true` for Innovation Use ⇒ `0` **valid**) | **`numberRequiredMode`** (`'nonzero'` ⇒ `0` **invalid**, `-5` valid) | An implementer building the exact **opposite** of `R-IUR-010` AC.4 from a boolean that cannot express the corrected three-state rule |
> | §10 cross-check | "**`0` is a valid `Number`**" | "`0` is REJECTED, negatives accepted" | The read-back table certifying the inverted rule as honored |
> | §2.1 | "**1 dead Tailwind border utility** deleted" | "1 dead **`[style]` binding** deleted at `:55`"; the utility at `:49` is KEPT | Deleting the only amber border on every numeric field app-wide — the `P-2` defect, resurrected from the composition table after `DD-10` was inverted |
> | `DD-10` | convert `:59`'s `text-[#8D9299]` "to `var(--ac-warning-1)`" | **`var(--ac-grey-600)`** (`colors.scss:33`) | Repainting the grey helper text amber |
>
> Two design gaps were also closed, both required for a correct decomposition: `DD-1` now states
> **mode precedence** (`requiredMode` bypasses the legacy `isRequired`/`validateEmpty` branches —
> left additive, it re-creates `DC-2`), and `DD-4` records the evidence that the two
> `[validateEmpty]` bindings are dead. All line citations in `DD-10`/`DD-1` were re-verified against
> the working tree at this gate.

---

## 1. Goals & Non-Goals

**Goals**

| # | Goal | Requirements |
| --- | --- | --- |
| G-1 | One rule set, expressed **equivalently** on the client and in SQL — equivalence proven, never assumed | `R-IUR-001`, `R-IUR-012` |
| G-2 | `0` is a value; "empty", "blank" and "not positive" are three distinct states | `R-IUR-004`, `R-IUR-005`, `R-IUR-009` |
| G-3 | Every new required field renders the amber treatment **in the registered token**, and is proven painted | `R-IUR-003` |
| G-4 | No consumer outside this page changes behavior | `R-IUR-013` |
| G-5 | No data the user typed **in this session and can still see** is silently destroyed by a save. Legacy rows carrying hidden state are an explicit, recorded exclusion (`P-6`) | `R-IUR-014`, `R-IUR-015` |

**Non-goals**

- Changing the API, its DTOs, or its validators.
- Fixing `app-input`'s falsy-`0` check for the **15** templates this spec does not touch (`OQ-3`). *(`C-8`: 18 templates use `app-input`; this spec changes 3 of them. "17" was wrong.)*
- Re-opening the `--ac-warning-1` contrast exception.
- Making the save gate stricter than `DD-8` requires.

---

## 2. Architecture

```
┌─ Client ──────────────────────────────────────────────────────┐
│  innovation-use-details.component     page rules, dropped-row │
│    ├── innovation-use-actor-item         actor row rules       │
│    ├── innovation-use-organization-item  organization row rules│
│    └── app-quantification-item  (SHARED) measure row rules     │
│          └── app-input          (SHARED) field-level required  │
└───────────────────────────┬───────────────────────────────────┘
                            │ PATCH — rows dropped AND fields nulled
┌───────────────────────────▼───────────────────────────────────┐
│  Server — unchanged controllers/services/DTOs                  │
│  innovation_use_validation()  ← the only server change         │
└───────────────────────────────────────────────────────────────┘
```

Two facts drive most of this design:

1. **The green check reads persisted rows only** — so anything the client drops is invisible to it (`DD-8`).
2. **Rows are soft-deleted, not deleted** — so "persisted" is not the same as "active" (`DD-0`).

### 2.1 Composition

| Path | Change |
| --- | --- |
| `shared/components/custom-fields/input/input.component.{ts,html}` | **+1 input** `requiredMode`; **5** live hex literals tokenized — 4 amber (`:30`, `:49`, `:65`, `:71`) → `var(--ac-warning-1)` + 1 grey (`:59`) → `var(--ac-grey-600)`; **1 dead `[style]` binding deleted at `:55`** (`C-14`, `N-3`, corrected by `P-2`). *(Revisions 3–4 read "1 dead **Tailwind border utility** deleted" — the pre-`P-2` framing, exactly backwards: the Tailwind utility at `:49` is the live renderer and is KEPT. Backward-sweep miss caught at the Phase 3 gate.)* |
| `shared/components/quantification-item/quantification-item.component.{ts,html}` + `.spec.ts` | `fieldsRequired` → **5** per-field inputs (`unitRequiredMode` added 2026-09-04 by pivot); spec rewrite is **in scope** (`S-5`) |
| `.../innovation-use-actor-item/*.{ts,html,spec.ts}` | count required states + total-positivity message |
| `.../innovation-use-organization-item/*.{ts,html,spec.ts}` | required states on 4 fields, message precedence |
| `.../innovation-use-details.component.{ts,html,spec.ts}` | remove message + seed, wire measures, **dropped-row report toast** (no gate — T-13 Pivot), pass the used-type set to the actor cards (`DD-18`) |
| `server/.../db/migrations/<ts>-updateInnovationUseValidation.ts` | **new**, append-only |
| `server/.../test/fixtures/**/innovation-use-validation.fixture-spec.ts` | **extended** — the existing band-`900_100` fixture (`S-4`) |
| `docs/ux-ui/design.md` · `docs/specs/innovation-use/family.md` | doc sweep (`DD-11`) |

### 2.2 Reuse

- The amber treatment exists at 8 sites — reuse the shape.
- `total()` already computes the disaggregated sum; the positivity rule consumes it.
- The `[style]` object binding is mandatory for PrimeNG borders (`DD-3`).
- **The sub-type SQL clause already exists** at `1758125999162-AdaptInnovationDevValidationToManyToolFunctions.ts:91` in innovation-**dev**'s function. Read it before writing a new one — and see `DD-5`, because it carries the same latent mismatch this spec is correcting.

---

## 3. The Rule Table — single source of truth

`G-1` is served by writing the rules once, here. Both surfaces implement this table and every test
on both sides is generated from it.

### 3.0 Row scoping — **all three predicates include `is_active`** (`S-1`)

```
actors        : result_id = ? AND is_active = TRUE AND actor_role_id            = 2
organizations : result_id = ? AND is_active = TRUE AND institution_type_role_id = 2
measures      : result_id = ? AND is_active = TRUE AND quantification_role_id   = 3
```

**Revision 1 omitted `is_active` and it was a severe defect.** Rows are **soft-deleted**:
`result-quantifications.service.ts:150`/`:214` and `result-institution-types.service.ts:565` all
set `{ is_active: false }`, and the function being replaced filters `is_active` on every query. A
violation count scoped only by `result_id` + role would count every row the user has ever deleted —
turning the green check permanently `false` with **nothing on screen**, because a deactivated row is
not rendered and therefore cannot be fixed.

### 3.1 Rules

| # | Applies to | Field | Required when | Extra | Client owner | SQL |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | actor row | `actor_type_id` | always | — | card | **none — structurally vacuous** (`S-3`) |
| 2 | actor row | `actor_type_custom_name` | type = `5` | **non-blank** (`C-2`) | card | `valid_text(...)` — existing |
| 3 | actor row | 4 counts | disaggregated mode | each **filled** (`0` valid) | `app-input` | all 4 `IS NOT NULL` |
| 4 | actor row | *(cross-field)* | disaggregated mode | **sum > 0** | card | sum `> 0` |
| 5 | actor row | `actors_count` | aggregate mode | filled **and > 0** | `app-input` | `IS NOT NULL AND > 0` |
| 6 | org row | `institution_id` | known mode | — | card | `IS NOT NULL` |
| 7 | org row | `institution_type_id` | unknown mode | — | card | `IS NOT NULL` |
| 8 | org row | `sub_institution_type_id` | unknown mode **and** the type is **active, root, and has children** (`C-1`) | — | card | see `DD-5` |
| 8b | org row | `sub_institution_type_id` | whenever set on the unknown path | **must belong to the chosen type** (`C-11`) | card | join `parent_code = institution_type_id` |
| 9 | org row | `organization_count` | unknown mode | filled **and > 0** | `app-input` | `IS NOT NULL AND > 0` |
| 10 | measure row | `quantification_number` | always | filled **and `≠ 0`** — negatives valid (`≠ 0`, **not** `> 0`) | `app-input` | `IS NOT NULL AND <> 0` |
| 11 | measure row | `unit` | always | **non-blank** (`C-2`) | `app-input` | `valid_text(unit)` |
| 12 | measure row | `description` | **never** | — | — | — |
| 13 | result | actor row count | **never** (`R-IUR-011`) | — | — | *clause deleted* |
| **14** | result | `innovation_use_level_id` | always | — | stepper *(existing)* | `IS NOT NULL` — **preserved verbatim** (`C-5`) |
| **15** | result | `innovation_use_level_explanation` | level **≥ 6** | `valid_text` | textarea *(existing)* | `IF(useLevel >= 6, explanationValid, TRUE)` — **preserved verbatim** (`C-5`) |

**Rules 14 and 15 were missing from revision 1's table** while `DD-6` ordered a rewrite driven by
that table — so a rewrite that silently dropped the level and justification requirements would have
passed every stated check, a regression far larger than the one `RSK-1` was signed off for.

### 3.2 Mode predicates are NULL-safe (`C-6`)

`sex_age_disaggregation_not_apply` and `is_organization_known` are both `nullable: true`. In MySQL
`NULL = TRUE` and `NULL = FALSE` both evaluate to `NULL`, so an equality-branch rewrite would let a
NULL-mode row match **neither** branch and be vacuously valid.

**Every mode branch MUST be written as `COALESCE(col, FALSE)` or the `IF(col = TRUE, a, b)` form the
current function already uses** — which routes `NULL` to the else branch, matching the client
(`@if (!body().sex_age_disaggregation_not_apply)`). Reachability is legacy/direct-write only (both
client defaults are `false`), which is why this is a design constraint rather than a scenario.

### 3.3 Text fields are compared trimmed on both sides (`C-2`)

`valid_text` is `LENGTH(TRIM(REGEXP_REPLACE(text,'\s+','')))>0` — whitespace-only is **invalid** in
SQL. Nothing on the client trims. Rules 2 and 11 were both marked "already in parity" and were not.

**Decision:** `requiredMode`'s `'filled'` test **trims** for string values (`String(v).trim() === ''`
is empty) while leaving numeric `0` filled — `String(0).trim()` is `'0'`, so a zero stays filled.

**Rule 2 does not flow through `app-input` (`N-11`).** Its client owner is the actor card:
`otherNameMissing` is `... && !this.body().actor_type_custom_name`
(`innovation-use-actor-item.component.ts:95`) driving a plain `pInputText`. It needs **its own**
trimmed check and its own falsifying input; `requiredMode` will never reach it. This repo has paid for this asymmetry once already —
`justificationWhitespaceOnly()` exists solely because `app-textarea`'s untrimmed check disagreed
with a trimmed server check. Do not build the second instance.

---

## 4. Design Decisions

### DD-0 — Active rows only

See §3.0. Every predicate, every test fixture, and every truth-table row carries `is_active = TRUE`.
A fixture that deletes a row and re-checks the green check is a **required** truth-table case, not
an optional one.

### DD-1 — `app-input` gains one opt-in `requiredMode`

**Problem.** `isInvalid()` is `!this.body()?.value` (`:179`) and `inputValid()` uses `!value`
(`:184`). `0` is falsy. **The check is gated by `isRequired`** (`S-8`), which none of the five
innovation-use count fields passes today — so the defect is **latent at these sites, not active**.
Revision 1's truncated quotation dropped that guard.

**Decision.** Add `requiredMode: 'off' | 'filled' | 'positive' | 'nonzero'`, defaulting to `'off'`.

| Mode | Invalid when | Message |
| --- | --- | --- |
| `'off'` | *(existing `isRequired` / `validateEmpty` logic, untouched)* | existing |
| `'filled'` | `null`, `undefined`, `''`, **or whitespace-only for string values** (`C-2`) | `This field is required` |
| `'positive'` | not filled → required message; filled and `≤ 0` → positivity message | `This field is required` / `Must be greater than 0` |
| `'nonzero'` | not filled → required message; filled and `= 0` → zero message. **Negatives are valid.** | `This field is required` / `Must be different from 0` |

Asterisk renders when `isRequired || requiredMode !== 'off'`.

**Precedence is mandatory, not incidental (added at the Phase 3 gate).** When `requiredMode !== 'off'`
the mode **owns the verdict outright** and the legacy `isRequired` / `validateEmpty` emptiness
branches (`input.component.ts:179`, `:184`, `:187`) MUST be bypassed for that field. Left additive,
a call site passing both `isRequired` and `requiredMode="filled"` would still hit `isRequired &&
!value` and redden a deliberate `0` — **re-creating `DC-2` inside the decision written to close it**,
and rendering two messages for one cause. The only field where both are legitimately live is a
`'off'`-mode field. Falsifying input: a field with `isRequired=true` and `requiredMode="filled"`
holding `0` — it must render **no** amber and **no** message.

**`validateEmpty` is left alone and must not be passed alongside `requiredMode`** (`S-8`): it is
already unreachable whenever `isRequired` is true, so `quantification-item`'s two existing
`[validateEmpty]="fieldsRequired"` bindings are dead code today. `DD-4` removes them rather than
porting a binding that has never fired.

**Rejected — fixing `!value` globally.** Likely a real latent bug elsewhere, but verifying it means
auditing 15 templates for whether a `0` is reachable and expected. That is a larger job, and folding
it in would hide a data-quality fix inside a UI-consistency change (`OQ-3`).

### DD-2 — Positivity placement

- **Single-field positivity** (rules 5, 9) → `requiredMode="positive"`; the field owns border + message.
- **Non-zero** (rule 10, measures) → `requiredMode="nonzero"`. Distinct from `'positive'` **by user ruling 2026-09-04**: a measure may legitimately be negative, so the rule is `≠ 0`, never `> 0`. The `numberAllowsZero` boolean of revisions 1–4 is therefore **retired and replaced** by `numberRequiredMode` on `quantification-item` (`DD-4`) — Innovation Use passes `'nonzero'` and OICR keeps its existing falsy `isRequired`.
- **Cross-field positivity** (rule 4) → the **actor card** renders one message beneath the four fields, **no** border on any of them, driven by the existing `total()`.

When all four are filled and sum to `0`, no field may render `This field is required` — all four
*are* filled. One message, never five.

### DD-3 — PrimeNG borders use `[style]`, never a Tailwind utility

PrimeNG injects `.p-select` / `.p-inputtext` border rules **unlayered**; Tailwind v4 emits utilities
inside `@layer utilities`; unlayered author CSS wins unconditionally, regardless of specificity. A
`border-*` utility on these elements is **generated, correctly placed, and inert** (`D-8`).

**Scope correction (round 2, `N-2`).** Revision 2 said the number control's **literal** shorthand
is readable from `element.style`, so an automated assertion was available. That was true *and*
self-defeating: `DD-10` tokenizes exactly that literal, and `cssstyle@2.3.0` drops a shorthand
carrying `var()`. The two decisions cancelled each other, on the primary automatable gate for
`R-IUR-003`.

**Resolution — the gate differs by control type (corrected by `P-1`/`P-2`).**

| Control | Mechanism that renders | Automated assertion |
| --- | --- | --- |
| `p-select`, `p-inputtext` (cards, rules 1, 2, 6, 7, 8) | `[style]` object binding, applied to the DOM | **Setter spy** — `jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set')`, then assert the captured call. Value-agnostic, survives tokenization; in-tree exemplar at `innovation-use-actor-item.component.spec.ts:291`, `:298` |
| `p-inputNumber` via `app-input` (rules 3, 5, 9, 10) | **the CLASS at `input.component.html:49`** — the `[style]` at `:55` is never applied | **Assert the class**, not the style. The setter spy **cannot fire here** and an implementer who used it would read the silence as their own bug (`P-1`) |

Never read `element.style.border`: `cssstyle@2.3.0` drops a shorthand carrying `var()`.

**What neither assertion proves is paint** (`DC-7`) — but `P-2` established empirically, from a real
browser, that the class at `:49` *does* paint, so a class assertion is now backed by a measurement
rather than by inference. The human browser check remains the gate for `DC-1`.

It still does not prove **paint** — record that limit next to it (`DC-7`); the human browser check
remains the gate for `DC-1`.

### DD-4 — `quantification-item` splits `fieldsRequired` into five inputs

| Input | Default | Innovation Use passes |
| --- | --- | --- |
| `numberRequired` | `true` | `true` |
| `unitRequired` | `true` | `true` |
| `commentsRequired` | `true` | **`false`** |
| `numberRequiredMode` | `'off'` | **`'nonzero'`** |
| `unitRequiredMode` | `'off'` | **`'filled'`** |

**`unitRequiredMode` added 2026-09-04 by user ruling at the T-01 execution gate** (Pivot Record in
`execution.md`). The revision-6 table carried **four** inputs and gave a mode only to `Number`, so
`Unit` reached `app-input` through the boolean `unitRequired` → `isRequired`, whose branch is
`!value || value.length === 0`. A whitespace-only `'   '` is truthy with `length === 3` and therefore
evaluated **valid** — leaving `R-IUR-010`'s S1 `AND IT MUST` clause and **AC.6** with no owner on the
client, while `tasks.md` §5 credited them to `T-01`, whose three-file scope
(`input.component.{ts,html,spec.ts}`) structurally cannot discharge them. T-01 built and proved the
trimming mechanism (`isFilled()` trims strings, §3.3); nothing routed `Unit` into it. The gap was
**reachable**: type spaces into `Unit`, the client renders no amber and saves, then SQL's `valid_text`
rejects the row and the green check returns `false` **with nothing on screen** — `DC-2b` + `DC-3`
together, the exact failure pair Judgment Day finding `C-2` was raised to close, re-created inside
the decision written to close it.

`'filled'` is the correct mode, **not** `'positive'` or `'nonzero'`: `Unit` is a free-text string and
the only rule on it is non-blankness after trimming, matching the server's
`LENGTH(TRIM(REGEXP_REPLACE(text,'\s+','')))>0` (§3.3). Both new modes default to `'off'`, so OICR's
byte-for-byte behavior below covers this input too.

`fieldsRequired` is removed, along with the two dead `[validateEmpty]` bindings (`DD-1`) — confirmed
dead in the template: `:17` and `:23` bind `[isRequired]` and `[validateEmpty]` to the **same**
`fieldsRequired` value, so the `validateEmpty` branch (`input.component.ts:187`) is unreachable
whenever it is `true` and inert whenever it is `false`.

**`numberRequiredMode` replaces the `numberAllowsZero` of revisions 1–4** (superseded by the user
ruling of 2026-09-04 that made rule 10 `≠ 0`, not `> 0`). A boolean cannot express the corrected
rule: the three states now needed are OICR's existing falsy check (`0` reads as empty), Innovation
Use's `≠ 0` (`0` invalid, **`-5` valid**), and `off`. `numberAllowsZero = true` would have made `0`
**valid**, which is the opposite of `R-IUR-010` AC.4. It is passed straight through to `app-input`'s
`requiredMode` (`DD-1`), so `quantification-item` holds no zero policy of its own.

OICR passes nothing, receives `'off'` for **both** modes, and keeps its existing untrimmed falsy `isRequired` behavior byte-for-byte.

**The removal is NOT self-gating** (`S-5`). Revision 1 claimed a stale binding becomes a template
compile error. True for the **one** template that binds it (`innovation-use-details.component.html:227`; OICR's two call sites pass nothing and would not redden — `N-9`) — but `quantification-item.component.spec.ts:130`
and `:134` reference `fieldsRequired` as a **TypeScript property**, which no template compiler sees:
`ng build` uses `tsconfig.app.json`, ESLint ignores specs, and `ts-jest` runs `isolatedModules` with
no type-checking. Only `npx tsc -p tsconfig.spec.json --noEmit` catches them — now an explicit gate
in §12, and that spec rewrite is now in §2.1 and the budget.

### DD-5 — The sub-type predicate, corrected (`C-1`)

**Revision 1 was wrong.** It claimed the client asks "does `parent_code = type` have rows". It does
not. `subTypesService.list(typeId)` is a `Map` read, populated only by
`GET_SubInstitutionTypes(2, typeId)` → `getInstitutionTypesByDepthLevel`, whose `where` is
`{ is_active: true, parent_code: IsNull(), code: institutionTypeId }` followed by
`getItemsAtLevel(..., 2)`.

**The real client predicate is: the type is `is_active`, is a ROOT type (`parent_code IS NULL`), and
has children at depth 2.** That is strictly narrower than `EXISTS(parent_code = type)`: a non-root
type with children, or an inactive type, satisfies the SQL clause and renders **no** sub-type select.

**Decision.** The SQL clause mirrors the **client** predicate, including `is_active` and the root
condition — not the looser `EXISTS`.

**`is_active` binds to the PARENT type only (`N-7`).** In `getInstitutionTypesByDepthLevel`,
`is_active: true` sits in the root `where`; the descendants arrive through
`relations: { children: { children: true } }`, an unconditioned join TypeORM does not filter. So an
**inactive child still makes the sub-type select render.** A literal mirror written as
`EXISTS(... c.parent_code = t.code AND c.is_active = TRUE)` would be strictly narrower than the
client and re-create `DC-3` inside the decision written to close it. Correct form: `is_active` on
the **parent**, nothing on the child. The equivalence rests on an invariant that must be **stated,
not assumed**: the `Organization type` dropdown is fed by `GET_SubInstitutionTypes(1)`, so it offers
root types only. Under that invariant the two agree; if the dropdown ever offers a non-root type,
they diverge silently. The invariant is therefore an explicit truth-table case.

**`R-IUR-008` AC.4's enumeration must run against `getInstitutionTypesByDepthLevel`, not against a
mocked sub-types service** — a jsdom mock cannot observe either the `is_active` or the root filter,
so it would "prove" equivalence against a source the client never consults (`KZ-017`).

### DD-5b — A sub-type must belong to its type (`C-11`)

`R-IUR-008`'s `BUT it must NOT leave a stale sub_institution_type_id contributing to validity` was
owned by nothing in revision 1.

`IS NOT NULL` is satisfied by a sub-type belonging to a *different* parent. And the client's clearing
is incomplete for persistence: `onInstitutionTypeChange()` sets the field to `undefined`, but
`buildOrganizationPayload` sends `sub_institution_type_id: known ? null : row.sub_institution_type_id`
— on the unknown path `undefined` is dropped by JSON serialization, so the key never reaches the
server and a previously stored sub-type survives.

**Decision.** Two halves, both required: SQL joins the sub-type back to
`parent_code = institution_type_id` (rule 8b); the client sends an explicit `null`, never
`undefined`, when the type changes.

### DD-6 — The green check is rewritten, preserving rules 14–15 verbatim

The existing function counts actor rows into `tempFullActors` and compares **two** `SUM(...)`
aggregates against it (`C-10` — revision 1 said three; `tempFullActors` is a `COUNT`, and the third
conjunct is the rule-13 row guard).

**Decision.** New body: one `COUNT(*)` of **violating** rows per collection; return true when every
violation count is zero **and** rules 14–15 hold.

Rationale: removing rule 13 leaves the `= tempFullActors` comparisons without their anchor; a
violation count needs none and is `0` for an empty collection — which *is* `R-IUR-001`, structurally
rather than as a carve-out. It is also inspectable: a failing truth table names the collection.

**Three hard constraints:**

1. **Rules 14–15 are copied verbatim** (`C-5`): the `SELECT ... INTO commonFields, useLevel, explanationValid` block, including its `r.is_active` / `riu.is_active` filters and `LIMIT 1`, and the `IF(useLevel >= 6, explanationValid, TRUE)` conjunct. Note the documented `level`-vs-`id` trap in the current migration's header — `useLevel` reads `ciul.level`, not the FK.
2. **Every mode branch is NULL-safe** (`C-6`, §3.2).
3. **Every grouping is explicitly parenthesized** and the function is verified by **execution** (`DC-4`). A mocked query builder has previously passed `A OR B AND C` as `(A OR B) AND C`.

### DD-7 — Stop seeding a blank actor row *(reversion — challenged, challenge corrected)*

**What is reverted:** `innovation-use-details.component.ts:353` seeds `[new InnovationUseActor()]`
when the API returns no actors. Documented at `docs/ux-ui/design.md:560` with the rationale
*"actors are required, so a blank starter card helps completion."*

**Step 2.3 challenge — corrected after `C-4`:**

| Checked | Finding |
| --- | --- |
| Does anything downstream require ≥ 1 row? | **No.** `buildPayload()` filters the array; an empty array is a legal payload. |
| Does the seeded row ever persist? | **No.** Rows without `actor_type_id` are dropped, so it has never reached the server. |
| **Which test asserts the seed?** | **`describe('c2 — empty state')`, `innovation-use-details.component.spec.ts:143-160`** — it mocks an all-empty `200`, awaits `getData()`, and asserts `actorCards.length === 1` at `:157`. **This is the test that breaks, and revision 1 missed it entirely.** It belongs to `R-IUR-002`, not `R-IUR-011`. |
| Other affected tests | The at-least-one-actor message assertions at `:347` and `:354` (revision 1 cited `:346`/`:351`, which are a blank line and an arrangement), plus a third at ~`:1766`. All belong to `R-IUR-011`. |
| Discoverability cost | Real but small — the guidance callout and `Add other actor` remain; organizations and measures have always rendered this way. |

**Outcome: proceed.** The reverted rationale is *"actors are required"*, and `R-IUR-011` removes that
premise by decision `D-1`. Keeping the seed would open every fresh result with five amber errors on
a row the user never created, and flip a valid empty result to invalid on first paint.

### DD-8 — Block the save only when it would destroy typed data

`buildPayload()` destroys user input at **two** sites, not one (`C-7`). Revision 1 enumerated only
the first.

**Site 1 — row drop** (`:470-472`):

| Collection | Kept when | Silent-loss case |
| --- | --- | --- |
| Actors | `actor_type_id` set | counts typed, no type → four counts lost |
| Organizations | `institution_type_id` set, or known-path with `institution_id` | `organization_count` typed, no identity → count lost |
| Measures | any of number / unit / description present | none — already content-aware |

**Site 2 — field nulling on a KEPT row** (`:494-498`, `:521-532`). `buildActorPayload` nulls the four
counts when the aggregate flag is true and nulls `actors_count` when it is false;
`buildOrganizationPayload` nulls `organization_count`, `institution_type_id`,
`sub_institution_type_id` and `institution_type_custom_name` when `is_organization_known` is true —
**and `institution_id` when it is false** (`:527`, `N-4`).

**The two cards behave differently here, and revision 2 got the actor half backwards (`N-1`).**

| Card | On mode toggle | Site-2 reachable through the UI? |
| --- | --- | --- |
| **Actor** | `onModeChange()` **clears the leaving mode's fields** — the four counts to `undefined` when going aggregate, `actors_count` when leaving it (`innovation-use-actor-item.component.ts:111-125`, wired at `.html:71`), and the card's `effect` emits the cleared row upward | **No.** By save time `body()` no longer holds the typed counts; the nulling writes fields that are already empty. Reachable only via legacy or direct-write data. |
| **Organization** | `onKnownToggle()` **clears nothing** (`innovation-use-organization-item.component.ts:130-133`, a deliberate documented choice) | **Yes** — the real case. |

The reachable scenarios are therefore both on the organization card:

> Type + sub-type + count on the unknown path → tick *"Is the organization known?"* → the row is kept
> (identity satisfied via `institution_type_id`) and every unknown-path field is nulled. No warning, no undo.
>
> Or the mirror: pick an institution on the known path → untick the box → pick a type → the row is
> kept and the chosen `institution_id` is written `null` (`N-4`).

Revision 2's flagship actor example was **not constructible**, which would have made the site-2 gate
unable to redden for actor rows for the reason it exists — the `K-004` failure this design flags
elsewhere, committed inside its own correction record.

**Decision — REVISED 2026-09-07 by the T-13 Pivot (user ruling). Never block the save; report what
was dropped.** Site 1's gate is **withdrawn**, on exactly the principle that already withdrew site 2
(`P-3`): a gate the user cannot escape destroys more than it protects. Here the escape hatch existed —
fill in the type — but the gate combined with the page's **pre-existing unconditional**
`if (page) this.navigateTo(page)` to convert a **partial** loss into a **total** one: the level, the
justification and every other edited row were discarded where they previously persisted, while the
message named only the blocking row. Full sequence in `execution.md` → `Pivot Record: T-13`.

| Reports (save still proceeds) | Silent (nothing to report) |
| --- | --- |
| Site 1 — a row carrying typed data but lacking its identity field, which `buildPayload()` drops | An entirely blank row — nothing to lose |
| — | **Site 2 — nothing.** `DD-12` makes both cards clear on toggle, so no hidden state survives to be nulled (`P-3`) |
| — | Measures — no loss case; the drop rule is already content-aware |
| — | **Duplicate actor types — prevented at source by `DD-18`/`R-IUR-017`, no longer gated at save** |

**Nothing blocks the save, and navigation is untouched.** `R-IUR-014`'s headline — *"SHALL NOT discard
user-entered data on save **without telling the user**"* — is satisfied by the telling; blocking was
only ever the mechanism this design chose, and it was the wrong one. `NFR-IUR-003` loses its `S-6`
exception and returns to *"every rule gates submission, not saving"*.

**Site 2 was withdrawn, not weakened (`P-3`).** Revision 3 gated the organization card in "either
direction". Because the inactive path's controls are **not rendered** (`@if`/`@else` at `.html:36`,
`:79`) and no select sets `[showClear]`, the user had no way to clear the values the gate objected
to: the row could neither be saved nor repaired, only deleted — destroying more than the gate
protected. `DD-12` removes the hidden state at its source instead, which is strictly better than
gating it: nothing to detect, nothing to explain, nothing to trap.

A blank row is dropped harmlessly and must not block, preserving `R-IUD-001`'s permissive-draft
behavior. The rule is exactly: **block iff saving would destroy something the user typed.**

**The user must be told — and there is no existing channel to reuse** (`S-2`). Revision 1 claimed the
blocked save would use *"the same `ActionsService` channel the duplicate-actor block already uses"*.
**That channel does not exist:** at `:584` a duplicate skips the entire save body and falls to
`if (page) this.navigateTo(page)`; the only `showToast` calls are `:335`, `:588`, `:600`. Today a user
with a duplicate row clicks Next, sees nothing, and navigates away.

So this spec **introduces the first save-time message of any kind**. *(Superseded in part by the T-13 Pivot: the message now reports what was **dropped** rather than what was blocked, and it no longer covers the duplicate case at all — `DD-18` prevents duplicates in the dropdown instead. The paragraph below is retained as the record of why no channel existed.)* It must cover the duplicate case too —
otherwise `DD-8` ships a second silent block, trading silent data loss for silent save refusal, which
is the failure it exists to close.

**Rejected — persisting partial rows.** The server deliberately `400`s identity-less organization
rows; making them persistable is an API change, out of scope.
**Rejected — a confirm dialog.** It converts silent loss into acknowledged loss; the data still dies.

### DD-9 — Messages remain immediate, with an explicit precedence (`C-12`)

Immediate, consistent with `Actor type`. Under `DD-7` a fresh result renders no rows, so nothing is
flagged until the user adds one.

`R-IUR-006` AC.3 ("exactly one message — never zero, never two") was discharged in revision 1 by
`DD-2`, which governs only the actor card and does not address it. The real competitor is
`showNotIdentifiedMessage` = `touched() && !identitySatisfied`, which fires on **both** organization
paths — so it competes with rule 6 *and* rule 7.

**Decision — precedence on the organization card:**

| State | Renders |
| --- | --- |
| Identity missing, row **touched** | The **new required message** on the specific empty field. `showNotIdentifiedMessage` is suppressed — it names the row, the required message names the field, and the field-level one is more actionable. |
| Identity missing, row **untouched** | The **new required message**, still. This closes AC.3's "never zero" half: today an untouched known-path row loaded without an institution shows nothing, because the old message is gated on `touched()`. The new messages are not gated on `touched()` (`DD-9` immediacy). |

`showNotIdentifiedMessage` is therefore **SUPPRESSED, not removed** — user ruling, 2026-09-04
(`OQ-6` closed).

**What suppression means concretely.** The getter, the `ng-template #notIdentifiedMessage`
(`.html:2-7`) and its render site all **stay**. The render condition gains one clause: it does not
render while any field-level required message is showing on the same row. Nothing is deleted.

**Blast radius — stated honestly, including what suppression does NOT save:**

| Item | Effect |
| --- | --- |
| `innovation-use-organization-item.component.spec.ts:302-316` | **Breaks anyway.** It fills `Organization count` on an unknown-path row with no type, then asserts the message text (`:309`) and exactly one `warning` icon (`:313-315`). Under `R-IUR-007` that row now shows a required message on `Organization type`, so the row-level message is suppressed. **Removal and suppression break this test identically** — rewritten, not deleted. |
| `:299`, `:325` | Negative assertions — survive either way. |
| `ng-template` + getter | **Survive** under suppression. This is the whole difference. |
| Archived `R-IUP-012` AC.5 | The affordance is retained in code, so the archived AC's implementation is not retired — only gated. |

**The honest caveat.** With `DD-9`'s immediate messages, a missing identity *always* raises a
field-level required message, so the suppressed branch is **unreachable in practice** — it becomes
dead-but-reversible code. That is the accepted cost of the user's choice, and the reason for the
choice is sound: gating is reversible in one line, deletion is not, and no requirement demanded
removal (`R-IUR-006` forbids *two* messages, which suppression satisfies).

### DD-10 — `app-input`'s amber moves to the token (`C-14`)

`app-input` hard-codes `#E69F00` at `input.component.html:30`, `:55`, `:65`, `:71`, and uses
`text-sm` rather than `fs-[14]`. §7 routes five of the fifteen rules through `app-input` while `G-3`
promises "the established amber treatment" — defined in `requirements.md` as
`var(--ac-warning-1)` + `fs-[14]`. The root guide makes a hex literal in a component a FAIL.

**INVERTED 2026-09-04 by browser evidence (`P-2`).** Revision 3 said `input.component.html:49` was
inert and ordered it **deleted**, with `:55` named as the real renderer. **That is backwards, and
deleting `:49` would have removed the only amber border on every numeric field in the application.**

The user supplied a screenshot of Capacity sharing's `Total participants?` — an `app-input` with
`type="number"` and `[isRequired]="true"` (`capacity-sharing.component.html:92-94`) — **rendering the
amber border**. The chain is then closed:

| Step | Evidence |
| --- | --- |
| The number branch has exactly two candidates | `:49` (Tailwind class) and `:55` (`[style]`) |
| `:55` is a **no-op** | `p-inputNumber` declares `style` as an `@Input` (`primeng-inputnumber.mjs:1677`) and never applies it — `0` `styleMap`, `0` `this.style`, host bindings are `attribute`×2 + `classMap` |
| No global CSS paints invalid inputs amber | `grep` over `src/styles/*.scss` returns only the token definitions |
| The border **does** paint | the user's screenshot |
| ⇒ | **`:49` is the live mechanism** |

`DD-3`'s inertness argument never applied here: it is scoped to elements PrimeNG styles **unlayered**,
and `.p-inputnumber` carries no competing border rule at all (`primeng-inputnumber.mjs:15-18` is
`display:inline-flex; position:relative`). With nothing to lose the cascade to, the utility wins.

**Corrected decision — the two lines swap fates:**

| Line | Revision 3 said | **Now** |
| --- | --- | --- |
| `:49` (`border-2 rounded-[8px] border-[#E69F00]`) | delete (inert) | **CONVERT** the hex to the token, keep the utility — it is what renders |
| `:55` (`[style]` with `!important`) | keep, it renders | **DELETE** — provably never applied, dead since it was written |

**Decision.** Convert the live literals — including `:49` — to `var(--ac-warning-1)`, **delete the
dead `[style]` binding at `:55`**, and convert `text-sm` to `fs-[14]`. A **sixth** literal exists at
`:59` (`text-[#8D9299]`, helper text, a plain `div` — live) and is converted too (`P-4`) — **to
`var(--ac-grey-600)`, NOT to `--ac-warning-1`**: `#8d9299` is the grey registered at
`colors.scss:33` / `:108`, and the blanket "convert the literals to `var(--ac-warning-1)`" of
revisions 3–4 would have repainted the helper text amber. *(Corrected at the Phase 3 gate.)*
`--ac-warning-1` **is** `#e69f00` in **both** themes (`colors.scss:48` `:root`, `:156` inside
`[data-theme='dark']`), so the amber change at `:30`, `:49`, `:65`, `:71` is **zero-delta in both
themes**.

**The `:59` grey change is zero-delta in LIGHT THEME ONLY** — corrected 2026-09-04 at the T-02
execution gate, measured by the Leader and independently confirmed by the Reviewer. `--ac-grey-600`
is `#8d9299` in `:root` (`colors.scss:33`) but **`#949494`** inside `[data-theme='dark']`
(`colors.scss:148`, a block opening at `:122` that the earlier citation pair — `:33` / `:108` — never
named; `:108` is the `$colors` **SCSS map** entry, which only generates class *names*). So converting
`:59`'s hardcoded `text-[#8D9299]` **changes the dark-theme helper-text colour** from `#8d9299` to
`#949494`.

**This is intended, not a regression, and the conversion ships as ordered.** A hardcoded hex cannot
respond to `data-theme` at all, so tokenizing it is precisely the point of `G-3`; `#949494` is
strictly better contrast on the dark surface; and root `CLAUDE.md` §4.2 mandates relying on tokens
rather than branching on `isDarkMode()`. Reachability is confirmed, not theoretical: `DarkModeService`
sets `data-theme` on `document.documentElement` (`docs/ux-ui/design.md:359`), which is what the dark
block matches, and the payload is every `app-input` carrying `helperText` — e.g.
`innovation-details.component.html:31`, `oicr-form-fields.component.html:20`,
`submit-result-content.component.html:58`, `evidence.component.html:10`.

**The recorded consequence for `T-16`:** gate 3 is scoped *light theme* (`tasks.md` §4, T-16), so the
one behavioural change this task introduces falls in the only theme the human gate does not inspect.
That asymmetry is deliberate and now recorded rather than latent; whether gate 3 gains a dark-theme
helper-text look is a user decision taken at the T-02 gate, not a silent widening of an approved task.

**The `text-sm` → `fs-[14]` half is NOT zero-delta (`N-8`)** and the earlier blanket claim was wrong:
`.fs-[14]` sets `font-size` only (`responsive-size.scss:17-21`), while `text-sm` also sets
`line-height: 1.25rem`. Those two sites (`:65`, `:71`) render for all 18 consumers, so this is a
small baseline shift against `G-4`. Either pair `fs-[14]` with an explicit line-height, or leave
`text-sm` and record the deviation — a decision the implementer must make explicitly, and the human
browser check must look at it.

### DD-11 — Documentation sweep (`KZ-013`, `S-7`)

| Doc | Line | Action |
| --- | --- | --- |
| `docs/ux-ui/design.md` | 441 | *"Every field on this card is optional — no asterisks"* → rewrite to rules 6–9 |
| `docs/ux-ui/design.md` | 560 | details-page `DD-10`'s blank starter card → mark **superseded** by `DD-7` |
| `docs/specs/innovation-use/family.md` | 113 | describes `innovation_use_validation` as **"frozen"** — a live, non-archived manifest this change falsifies |

### DD-12 — The organization card clears the path being left *(reversion — challenged)*

**What is reverted.** `onKnownToggle` currently updates only the flag
(`innovation-use-organization-item.component.ts:130-133`), under the comment *"Neither path clears
the other's fields — mirrors the reference card's own rule (§5.5)."*

**Step 2.3 challenge — what does clearing break?**

| Checked | Finding |
| --- | --- |
| Does a test assert value preservation across the toggle? | **No.** The one toggle test (`innovation-use-organization-item.component.spec.ts:217-232`) asserts the **control's visibility** across a live toggle, not its value. Clearing leaves it green. |
| Does a requirement mandate non-clearing? | **No.** The archived §5.5 says the card mirrors *the reference card's rules*; the behavior is inherited from innovation-dev, not required by any AC. |
| Is the section internally consistent today? | **No** — the **actor** card in the same section already clears on toggle (`onModeChange`, `R-IUP-007`). The two cards disagree, and this makes them agree. |
| What does clearing cost? | The user loses the other path's values when they toggle. **This is still data loss** — but immediate, visible, and the direct result of an explicit action, not a silent casualty at save time. It is the tradeoff the actor card already ships. |
| Divergence from innovation-dev? | **Yes, and deliberate.** Recorded here rather than inherited silently. That card has the same latent trap; fixing it is not in this spec's scope. |

**Outcome: proceed.** Clearing dissolves `P-3` at its source and removes destruction site 2
altogether, which lets `DD-8` shrink to one rule instead of gaining a second one that could not be
escaped.

**Symmetry requirement.** Both directions clear (`R-IUR-015` AC.1/AC.2), otherwise the mirror case
(`institution_id` nulled at `:527`) survives as a one-sided trap.

---

### DD-18 — Duplicate actor types are prevented in the dropdown, not gated at save

*(Added 2026-09-07 by the T-13 Pivot — user ruling, superseding the Leader's proposal to keep the
save block as a backstop.)*

**The split is: the client prevents for UX, the server validates for correctness.** The client-side
save block existed only because the prevention did not. With `R-IUR-017` disabling an already-used
type in every other row's dropdown, a duplicate cannot be created through the UI at all.

**The backstop argument was weak and is recorded as rejected.** The Leader proposed keeping the block
for pre-existing duplicate data. But the server rejects duplicates, so such data **cannot have entered
through the API** — only a direct database write produces it, and that case is already handled by the
existing server-error toast (`extractErrorMessages` + error toast).

**Two rules the implementation must honour, both trap-shaped:**

| Rule | Why |
| --- | --- |
| The holding row's own dropdown keeps its own value **enabled** | Otherwise a row renders its own current selection as disabled |
| **`OTHER` is never disabled** | Duplicates there are keyed on `type + trimmed lowercase custom name` (`duplicateActorTypeIndexes`), so several `OTHER` rows are legitimate |

`hasDuplicateActorType()` **stops gating `saveData`**. The computed itself stays — it still drives the
card's own duplicate message (`DD-5`, unchanged).

---

## 5. Data Model

No schema change. One new append-only migration replacing one stored function.

| Item | Value |
| --- | --- |
| File | `src/db/migrations/<timestamp>-updateInnovationUseValidation.ts` |
| `up()` | `DROP FUNCTION IF EXISTS innovation_use_validation` then `CREATE FUNCTION …` |
| `down()` | Restores the **previous body verbatim** — the prior migration's `down()` drops it, so a bare drop here leaves no function at all |
| Names touched | `innovation_use_validation` **only** |
| Tables read | `results`, `result_innovation_use`, `clarisa_innovation_use_levels`, `result_actors`, `result_institution_types`, `clarisa_institution_types`, `result_quantifications` |
| Backfill | none — existing rows are re-graded (`RSK-2`) |

---

## 6. API Surface

**No API changes.** Draft saves stay permissive at the API **and on the client**. *(Revisions 2–6 recorded an `S-6` narrowing here — `DD-8` blocked a defined class of saves client-side. *(T-13 Pivot, 2026-09-07)* **withdrew that gate**, so the narrowing is gone and `NFR-IUR-003` holds without exception.)* Revision 1 cited the surviving half ("the API is untouched") as proof of the whole; the whole is now true, but that reasoning was still invalid.

---

## 7. Frontend Component Architecture

| Component | Owns | Does not own |
| --- | --- | --- |
| `input` (shared) | field border + message for rules 3, 5, 9, 10, 11; token compliance (`DD-10`) | anything cross-field |
| `quantification-item` (shared) | which of its three fields are required | the zero policy (passed in) |
| `actor-item` | rules 1, 2; rule 4's total message; `p-select` border; **the used-type disable (`DD-18`/`R-IUR-017`)** | field-level count messages (delegated) |
| `organization-item` | rules 6, 7, 8, 8b; message precedence (`DD-9`); **path clearing on toggle (`DD-12`)**; three `p-select` borders | rule 9's message (delegated) |
| `details` page | the `DD-8` **dropped-row report** toast (no gate — T-13 Pivot); the used-type set for `DD-18`; measure wiring; no seeding | row-level messages; the option-disable itself (card-owned) |

**Design tokens.** No new tokens; `--ac-warning-1` everywhere after `DD-10`. The red asterisk is
inconsistent in the codebase today (`text-red-500` in the innovation-use cards, `#CF0808` in
`quantification-item`); this spec propagates each site's existing convention and does not unify them
— worth its own `/akili-quick`.

---

## 8. Error Handling & Observability

| Case | Behavior |
| --- | --- |
| A row would be dropped by `buildPayload()` while carrying typed data | **New** toast naming the affected rows. **The PATCH still fires** — `DD-8` reports, it does not block (T-13 Pivot) |
| Duplicate actor type | **Prevented at source** — the option is disabled in every other row's dropdown (`DD-18`). No save-time block, no toast. A duplicate from a direct DB write is rejected by the server and surfaced by the existing error toast |
| PATCH rejected | Unchanged |
| Green check `false` | Submit disabled; existing mechanism |
| Migration not yet applied | UI stricter than the gate — safe direction |

---

## 9. Rollout & Rollback

| Step | Actor | Note |
| --- | --- | --- |
| 1 | CI/CD | Deploy client + migration file. **The migration does not run** (`K-015`). |
| 2 | *(window)* | UI stricter than the gate. **Safe.** |
| 3 | **D. Casañas** | `npm run typeorm migration:run -- -d ./src/db/config/mysql/orm.config.ts` — **owner assigned by user ruling 2026-09-04 (`OQ-4` closed).** Not a pipeline step, not an Implementer step |
| 4 | **D. Casañas** | `migration:show` — **read the raw output for an error before counting**; the passthrough emits ANSI escapes, so `grep '^\[ \]'` reads a pending migration as zero pending (`K-014`). |

**The reverse order is unsafe:** migration first ⇒ the gate demands fields the UI does not mark, and
Submit is disabled with no on-screen explanation.

**Rollback:** run `down()`. The client is forward-compatible with the old function (stricter, not
incompatible), so a client rollback is optional and independent.

---

## 10. Cross-check Against Requirements (`KZ-016`)

Revision 1 claimed to read back "every" `AND IT MUST` / `BUT it must NOT` clause and covered 13 of
~22 (`C-13`). Complete table:

| Req | Clause | Honored by |
| --- | --- | --- |
| `R-IUR-001` | never render "At least one actor is required" | rule 13, `DD-7` |
| `R-IUR-001` | empty section valid with no user action | `DD-6` violation counts |
| `R-IUR-001` | **must NOT flag other sections** | per-collection counts are independent (§3.1) |
| `R-IUR-002` | **must NOT alter behavior when ≥ 1 actor returns** | `DD-7` — only the empty branch of `:353` changes |
| `R-IUR-002` | `addActor()` unchanged | `DD-7` scope |
| `R-IUR-003` | no Tailwind border on PrimeNG | `DD-3` |
| `R-IUR-003` | confirmed in a real browser | `DD-3`, `DC-1` |
| `R-IUR-004` | **`0` satisfies "filled" for all four** | `DD-1` `'filled'` mode |
| `R-IUR-004` | four zeros ⇒ total message, not four required messages | `DD-2` |
| `R-IUR-005` | the inactive path is not evaluated | §3.2 NULL-safe branch on `not_apply` |
| `R-IUR-006` | exactly one message, never zero, never two | **`DD-9`** precedence table — the row-level message is **suppressed**, never deleted (`OQ-6`, user ruling) |
| `R-IUR-007` | not evaluated on the known path | §3.2 branch on `is_known` |
| `R-IUR-008` | same source of truth on both surfaces | **`DD-5`** |
| `R-IUR-008` | **must NOT leave a stale sub-type contributing to validity** | **`DD-5b`** |
| `R-IUR-009` | `0` filled-but-not-positive | `DD-1` `'positive'` mode |
| `R-IUR-010` | **must NOT change OICR** | `DD-4` defaults — `numberRequiredMode` **and `unitRequiredMode`** both default to `'off'` |
| `R-IUR-010` | **`0` is REJECTED as a `Number`, negatives accepted** | `DD-4` `numberRequiredMode='nonzero'` → `DD-1` `'nonzero'`, rule 10. *(Corrected 2026-09-04: revisions 1–4 read "`0` is a valid `Number`" here, honored by a `numberAllowsZero` that asserted the opposite of the user's ruling. Backward-sweep miss from the `97acf54d` correction, caught at the Phase 3 gate.)* |
| `R-IUR-010` | **whitespace-only `Unit` rejected** | §3.3, `DD-1` `'filled'` ← routed by **`DD-4` `unitRequiredMode='filled'`**. *(Corrected 2026-09-04: this row previously cited only §3.3 + `DD-1` — the trimming **mechanism** — while `DD-4` had no input to route `Unit` into it, so the clause and AC.6 had no client owner. Phantom coverage found at the T-01 execution gate; see the Pivot Record in `execution.md`.)* |
| `R-IUR-011` | **must NOT remove per-row actor rules** | rules 1–5 retained |
| `R-IUR-011` | **must NOT touch another validation function** | §5 |
| `R-IUR-012` | not verified by string assertion | `DD-6` constraint 3 |
| `R-IUR-012` | **must preserve level + justification verbatim** | **`DD-6` constraint 1**, rules 14–15 |
| `R-IUR-013` | full suite, not targeted | §12 |
| `R-IUR-014` | **must NOT block an entirely blank row** | `DD-8` — nothing blocks at all now *(T-13 Pivot, 2026-09-07)*; a blank row is additionally **silent**, raising no message |
| `R-IUR-014` | **same rule for organization rows** | `DD-8` site 1's **report** (its gate withdrawn, *(T-13 Pivot, 2026-09-07)*) |
| `NFR-IUR-003` | **no exception — the narrowing was REMOVED** *(T-13 Pivot, 2026-09-07)* | `DD-8`'s client-side gate is withdrawn, so nothing narrows draft permissiveness. `requirements.md` `NFR-IUR-003` carries the amendment history |
| `R-IUR-016` | **must NOT be implemented through `requiredMode`** | §3.3 / `DD-1` — rule 2 is card-owned |
| `R-IUR-015` | **must NOT clear the path being entered** | `DD-12` symmetry requirement |
| `R-IUR-015` | **must NOT be confused with `R-IUR-014`'s rule** | `DD-12` — clearing is at the toggle; `R-IUR-014` **reports** at the save. *(Both were once framed against "blocking at the save"; there is no blocking rule any more, *(T-13 Pivot, 2026-09-07)*.)* |

**Cross-check against module constraints:** the actor card's `lg:` breakpoint rationale, the
`app-textarea` no-edit constraint, `R-IUD-001`'s permissive-save decision, and the create migration's
`level`-vs-`id` header note were all read. `DD-8` **no longer narrows** `R-IUD-001` or `NFR-IUR-003`
*(T-13 Pivot, 2026-09-07)*: its client-side gate is withdrawn, so `R-IUD-001`'s permissive draft save is honoured in full
and `NFR-IUR-003` needs no exception. *(Revisions 2–6 recorded the narrowing here and in
`requirements.md`; `P-6` had corrected revision 3, where §6 and §10 pointed at each other with the
substance in neither. The amendment history is retained in `requirements.md` `NFR-IUR-003`.)*

---

## 11. Budget (Step 2.4 tripwire) — re-baselined

| Metric | Rev 1 | Rev 2 | Rev 4 | **Rev 6** | Why |
| --- | --- | --- | --- | --- | --- |
| Tasks | 13 | 16 | 18 | **20** | **+2 breach, declared at the Phase 3 gate** (`tasks.md` §1.1): `T-14` (catalog equivalence — folded into a sibling it would have been discharged by the very mock `DD-5` rejects) and `T-16` (the three post-change client gates, which had no owner among the feature tasks). Rev 4's own deltas stand: +`DD-12` path clearing, +`R-IUR-016`, +the `'nonzero'` mode; −the withdrawn site-2 gate |
| LOC | ~1,150 | ~1,500 | ~1,600 | **~1,650** | Re-baselined for the two extra tasks; the `DD-9` and `c2` spec rewrites remain the bulk |
| Review rounds | ~20 | ~24 | ~24 | ~~~24~~ **~37** | **RE-BASELINED 2026-09-07 by user ruling, mid-execution** (`RB-9`). Derived from measurement, not re-estimated: **24 rounds consumed across 13 completed tasks = 1.85/task**. Seven remain, of which **T-20 is a human migration step consuming no review round**, so 6 x 1.85 ~= 11 more, plus margin. *(Written before *(T-13 Pivot, 2026-09-07)*, which shrank T-13 from `L` to `M` — its gate is withdrawn and attempt 1's predicates survive — withdrew `R-IUR-014` AC.4b, and added `T-21`, taking the task count to 21. The round figure is unchanged: T-21 is small and T-13's rewrite reuses reviewed work.)*. **This figure is the single home; every other site links here** (`KZ-005`) |

**Depth stays Full.** A tripwire, not a cap; `/akili-execute` escalates on breach.

**Two PRs**, boundary defined here (`S-9` — revision 1 pointed at §12, which defines no PR split):

| PR | Contents | Merge order |
| --- | --- | --- |
| **PR 1 — client** | `app-input`, `quantification-item`, three innovation-use components, all specs, `DD-10` token sweep, `DD-11` doc sweep | first |
| **PR 2 — server** | the migration + the extended fixture spec | second, applied by a human per §9 |

---

## 12. Verification Strategy

| Defect class | Gate | What it **cannot** reach |
| --- | --- | --- |
| DC-2 (`0` as empty) | unit tests, falsifying input `0` per field | nothing rendered |
| DC-2b (whitespace) *(registered in `requirements.md` §4 by this revision — `N-10`)* | unit tests, falsifying input `'   '` on rules **2 and 11** — rule 2 needs its own check (`N-11`) | — |
| **DC-5 (OICR regression)** | **`quantification-item.component.spec.ts` against the default, no-inputs configuration** | **OICR's own suite is structurally BLIND here** — it stubs the card with an empty-template `FakeQuantificationItemComponent` (`oicr-details.component.spec.ts:872-880`), so a green OICR suite is compatible with the asterisks vanishing. Revision 1 recorded "—" in this cell (`C-3`). Both call sites (`:60`, `:81`) must be covered. |
| DC-3 (parity) | one rule table, both sides | catalog agreement — `DD-5` AC.4, run against the real service |
| DC-4 (SQL precedence) | **executed** truth table, real MySQL | — |
| DC-6 (migration unapplied) | `migration:show`, raw output read first | any remote environment |
| **DC-1 (inert border)** | **human browser check** | jsdom cannot see a painted border |
| DC-7 (presence ≠ behavior) | each presence assertion records its limit | — |
| **DC-8 (stale spec references)** | **`npx tsc -p tsconfig.spec.json --noEmit`, compared as a NORMALIZED BEFORE/AFTER ERROR SET** (`S-5`, corrected by `N-6`) | It sees no template or runtime staleness. **A clean run is not achievable and must not be the criterion:** the client guide records this gate repaired 2026-08-13 and re-measured at 938 errors on 2026-08-27, and `quantification-item.component.spec.ts` carries **5 pre-existing `TS2552`** errors (`SimpleChanges` used at `:323,:341,:360,:370,:387` against an import of the singular `SimpleChange` at `:4`). Strip `(line,col)`, sort, diff the sets in the same window — never compare totals, never expect zero. |

**Harness for the truth table** (`S-4` — revision 1 named none). The only route in this repo is the
fixture suite: `npm run test:fixtures` over `test/jest-fixtures.json`, which collects **only**
`*.fixture-spec.ts` — a plain `*.spec.ts` is collected by neither runner and passes with zero tests.
An `innovation-use-validation.fixture-spec.ts` already exists on reserved band `900_100` and is
**extended**, not replaced. Constraints: `migration:test:bootstrap` runs exactly once per fresh
container (not idempotent); no DDL against the shared scratch schema while it runs.

**Disqualifiers.** A green client suite while the migration has not executed is **not** evidence for
`R-IUR-012`. A jsdom presence assertion is **not** evidence for `R-IUR-003`. A catalog enumeration
run against a mocked sub-types service is **not** evidence for `R-IUR-008`. If the truth table cannot
run against real MySQL, the task reports **inconclusive** — never a pass. **Gate on "full client
suite green", not on a pinned suite/test total** (`C-15`), which any unrelated commit moves.

**Falsifying inputs (`K-004`):** `0` in a count field · `'   '` in `Unit` · an OICR measure with
empty `Comments`, rendered through the **real** component · a soft-deleted organization row on an
otherwise valid result (`S-1`) · an actor row with four counts and no type (`DD-8` site 1) · a mode
toggle over typed values (`DD-8` site 2) · an active non-root type with children (`DD-5`) · a
sub-type belonging to another parent (`DD-5b`) · a result at level ≥ 6 with a blank justification
(rule 15) · reverting one `[style]` binding to a Tailwind class (`DC-1` — must be seen failing in
the browser; no test will redden).

---

## 13. Open Questions

| ID | Question | Blocking? |
| --- | --- | --- |
| ~~`OQ-1`~~ | ~~Immediate vs. deferred messages~~ — **CLOSED 2026-09-04 at the Phase 3 gate: IMMEDIATE**, as `DD-9` already decided. Closed explicitly because `tasks.md` `T-07` depends on it. | closed |
| `OQ-2` | Asterisk on `Specify other` | no |
| `OQ-3` | Audit `app-input`'s falsy-`0` across the other 15 templates | no — separate proposal |
| ~~`OQ-4`~~ | ~~Who applies the migration~~ — **CLOSED 2026-09-04:** D. Casañas runs it manually, after the client PR deploys (§9 step 3). | closed |
| ~~`OQ-5`~~ | ~~`R-IUR-014` must be added~~ — **CLOSED**: it already exists (`requirements.md` §5, `R-IUR-014`, indexed in §11, mitigated as `RSK-5`). Revision 1 carried it as blocking against a satisfied condition (`C-9`). *(Line citations dropped at round 2 — `A-N4`: they had already rotted two lines because the citing and cited files shared an edit window.)* | closed |
| ~~`OQ-6`~~ | ~~Remove or suppress `showNotIdentifiedMessage`~~ — **CLOSED 2026-09-04: SUPPRESS.** The getter and template stay; only the render condition is gated. The `:302-316` test breaks either way. | closed |
