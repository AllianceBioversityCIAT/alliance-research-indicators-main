# Design — Innovation Use / Required-field semantics and green check

- **Module:** client (`innovation-use-details` + 2 shared components) · server (1 migration)
- **Spec id:** 2026-09-innovation-use-required-fields
- **Status:** draft — **revision 3**, after Judgment Day round 2 (final bounded fix)
- **Owner:** D. Casañas
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Findings ledger:** [`./judgment.md`](./judgment.md)
- **Linked TRD:** [`docs/trd/trd.md`](../../../trd/trd.md) §6.3
- **Last updated:** 2026-09-04
- **Depth:** **Full** — raised from Standard at Step 2.4; see §11

> **Revision 3 note.** Round 1: 15 confirmed findings — the structure survived, the **factual layer**
> did not; five were the same mistake, asserting parity between surfaces that are not in parity
> (`DC-3`, the class this design named dominant). Round 2 re-judged the correction and returned
> **21 closed, 3 partial, 0 regressed — plus 9 defects caused by the fix itself**, two of them severe:
> the `DD-8` actor scenario was not constructible (`N-1`), and `DD-3` and `DD-10` cancelled each other
> (`N-2`). Both are resolved below. Corrections carry their finding ID; `N-*` are round 2.
>
> **This revision has NOT been independently judged** — the review budget (2 fix rounds, 2 scoped
> re-judgments) is spent. Terminal state is **ESCALATED**, not approved. See [`judgment.md`](./judgment.md).

---

## 1. Goals & Non-Goals

**Goals**

| # | Goal | Requirements |
| --- | --- | --- |
| G-1 | One rule set, expressed **equivalently** on the client and in SQL — equivalence proven, never assumed | `R-IUR-001`, `R-IUR-012` |
| G-2 | `0` is a value; "empty", "blank" and "not positive" are three distinct states | `R-IUR-004`, `R-IUR-005`, `R-IUR-009` |
| G-3 | Every new required field renders the amber treatment **in the registered token**, and is proven painted | `R-IUR-003` |
| G-4 | No consumer outside this page changes behavior | `R-IUR-013` |
| G-5 | No user-entered data is silently destroyed by a save — across **both** destruction sites | `R-IUR-014` |

**Non-goals**

- Changing the API, its DTOs, or its validators.
- Fixing `app-input`'s falsy-`0` check for the **15** templates this spec does not touch (`OQ-3`). *(`C-8`: 18 templates use `app-input`; this spec changes 3 of them. "17" was wrong.)*
- Re-opening the `--ac-warning-1` contrast exception.
- Making the save gate stricter than `DD-8` requires.

---

## 2. Architecture

```
┌─ Client ──────────────────────────────────────────────────────┐
│  innovation-use-details.component        page rules, save gate │
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
| `shared/components/custom-fields/input/input.component.{ts,html}` | **+1 input** `requiredMode`; **4** live hex literals → `var(--ac-warning-1)`, **1 dead** Tailwind border utility deleted (`C-14`, `N-3`) |
| `shared/components/quantification-item/quantification-item.component.{ts,html}` + `.spec.ts` | `fieldsRequired` → 4 per-field inputs; spec rewrite is **in scope** (`S-5`) |
| `.../innovation-use-actor-item/*.{ts,html,spec.ts}` | count required states + total-positivity message |
| `.../innovation-use-organization-item/*.{ts,html,spec.ts}` | required states on 4 fields, message precedence |
| `.../innovation-use-details.component.{ts,html,spec.ts}` | remove message + seed, wire measures, save gate, blocked-save toast |
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
| 10 | measure row | `quantification_number` | always | filled (`0` valid, no positivity) | `app-input` | `IS NOT NULL` |
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

**Decision.** Add `requiredMode: 'off' | 'filled' | 'positive'`, defaulting to `'off'`.

| Mode | Invalid when | Message |
| --- | --- | --- |
| `'off'` | *(existing `isRequired` / `validateEmpty` logic, untouched)* | existing |
| `'filled'` | `null`, `undefined`, `''`, **or whitespace-only for string values** (`C-2`) | `This field is required` |
| `'positive'` | not filled → required message; filled and `≤ 0` → positivity message | `This field is required` / `Must be greater than 0` |

Asterisk renders when `isRequired || requiredMode !== 'off'`.

**`validateEmpty` is left alone and must not be passed alongside `requiredMode`** (`S-8`): it is
already unreachable whenever `isRequired` is true, so `quantification-item`'s two existing
`[validateEmpty]="fieldsRequired"` bindings are dead code today. `DD-4` removes them rather than
porting a binding that has never fired.

**Rejected — fixing `!value` globally.** Likely a real latent bug elsewhere, but verifying it means
auditing 15 templates for whether a `0` is reachable and expected. That is a larger job, and folding
it in would hide a data-quality fix inside a UI-consistency change (`OQ-3`).

### DD-2 — Positivity placement

- **Single-field positivity** (rules 5, 9) → `requiredMode="positive"`; the field owns border + message.
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

**Resolution — neither decision is dropped.** Assert through the **setter spy** the codebase already
uses, which is value-agnostic and survives tokenization:
`jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set')`, then assert the captured call
(`innovation-use-actor-item.component.spec.ts:291`, `:298` — it captures
`'2px solid var(--ac-warning-1)'` today). Never read `element.style.border`.

This also sidesteps an unmeasured question: the number control's literal carries `!important`
**inside** the shorthand (`input.component.html:55`), and whether `cssstyle` accepts that form was
never verified. The setter spy does not care.

It still does not prove **paint** — record that limit next to it (`DC-7`); the human browser check
remains the gate for `DC-1`.

### DD-4 — `quantification-item` splits `fieldsRequired` into four inputs

| Input | Default | Innovation Use passes |
| --- | --- | --- |
| `numberRequired` | `true` | `true` |
| `unitRequired` | `true` | `true` |
| `commentsRequired` | `true` | **`false`** |
| `numberAllowsZero` | `false` | **`true`** |

`fieldsRequired` is removed, along with the two dead `[validateEmpty]` bindings (`DD-1`).
`numberAllowsZero` exists because OICR's `Number` must keep rejecting `0` while Innovation Use must
accept it; collapsing them would silently change OICR.

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

**Decision.** Block the save when a row would lose typed data at **either** site:

| Blocks | Does not block |
| --- | --- |
| Site 1 — a row carrying typed data but lacking its identity field | An entirely blank row |
| Site 2 — an **organization** row whose inactive path still carries typed values (either direction) | A toggle with the inactive path empty |
| — | **Actor** rows at site 2 — the card already clears on toggle, so nothing is left to destroy (`N-1`) |
| — | Measures — no loss case at either site |

A blank row is dropped harmlessly and must not block, preserving `R-IUD-001`'s permissive-draft
behavior. The rule is exactly: **block iff saving would destroy something the user typed.**

**The user must be told — and there is no existing channel to reuse** (`S-2`). Revision 1 claimed the
blocked save would use *"the same `ActionsService` channel the duplicate-actor block already uses"*.
**That channel does not exist:** at `:584` a duplicate skips the entire save body and falls to
`if (page) this.navigateTo(page)`; the only `showToast` calls are `:335`, `:588`, `:600`. Today a user
with a duplicate row clicks Next, sees nothing, and navigates away.

So this spec **introduces the first blocked-save message**, and it must cover the duplicate case too —
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

`showNotIdentifiedMessage` therefore becomes unreachable and is **removed**, not left dormant.

**Blast radius of this removal (`N-5`)** — enumerated here because `DD-7` was corrected in round 1
for exactly this omission, and revision 2 repeated it on a *new* reversion:

| Item | Effect |
| --- | --- |
| `innovation-use-organization-item.component.spec.ts:302-316` | **Breaks.** Asserts the message text at `:309` and exactly one `warning` icon at `:313-315`. Rewritten, not deleted. |
| `:299`, `:325` | Negative assertions — survive. |
| `ng-template #notIdentifiedMessage` (`.html:2-7`) | Removed with its only consumer. |
| Archived `R-IUP-012` AC.5 (details-page spec) | This message discharged it. Removing it retires a shipped, user-visible affordance. |

**No requirement authorizes the removal** — `R-IUR-006` forbids *two* messages for one cause, which
suppression also satisfies. `OQ-6` is therefore raised to **blocking**: removal versus suppression is
a user decision, not an implementer's.

### DD-10 — `app-input`'s amber moves to the token (`C-14`)

`app-input` hard-codes `#E69F00` at `input.component.html:30`, `:55`, `:65`, `:71`, and uses
`text-sm` rather than `fs-[14]`. §7 routes five of the fifteen rules through `app-input` while `G-3`
promises "the established amber treatment" — defined in `requirements.md` as
`var(--ac-warning-1)` + `fs-[14]`. The root guide makes a hex literal in a component a FAIL.

**There are five hex sites, not four (`N-3`).** The fifth is `input.component.html:49`:
`'border-2 rounded-[8px] border-[#E69F00]'` — a hex literal **and** a Tailwind `border-*` utility on
a PrimeNG control, i.e. exactly the inert-border pattern `DD-3` forbids. It paints nothing today and
has never painted. It is **deleted**, not converted; the `[style]` binding at `:55` is what actually
renders that border.

**Decision.** Convert the four live literals to `var(--ac-warning-1)`, delete the dead utility at
`:49`, and convert `text-sm` to `fs-[14]`. `--ac-warning-1` **is** `#e69f00` (`colors.scss:48`,
`:156`), so the colour change is **zero-delta**.

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

**No API changes.** Draft saves stay permissive at the API — but see the `NFR-IUR-003` narrowing in
§10 (`S-6`): `DD-8` blocks a defined class of saves **client-side**, so the requirement's target
("a user may save an incomplete draft exactly as today") is deliberately narrowed. Revision 1 cited
the surviving half ("the API is untouched") as proof of the whole.

---

## 7. Frontend Component Architecture

| Component | Owns | Does not own |
| --- | --- | --- |
| `input` (shared) | field border + message for rules 3, 5, 9, 10, 11; token compliance (`DD-10`) | anything cross-field |
| `quantification-item` (shared) | which of its three fields are required | the zero policy (passed in) |
| `actor-item` | rules 1, 2; rule 4's total message; `p-select` border | field-level count messages (delegated) |
| `organization-item` | rules 6, 7, 8, 8b; message precedence (`DD-9`); three `p-select` borders | rule 9's message (delegated) |
| `details` page | the `DD-8` save gate + blocked-save toast; measure wiring; no seeding | row-level messages |

**Design tokens.** No new tokens; `--ac-warning-1` everywhere after `DD-10`. The red asterisk is
inconsistent in the codebase today (`text-red-500` in the innovation-use cards, `#CF0808` in
`quantification-item`); this spec propagates each site's existing convention and does not unify them
— worth its own `/akili-quick`.

---

## 8. Error Handling & Observability

| Case | Behavior |
| --- | --- |
| Save blocked by `DD-8` (either site) | **New** toast naming the affected rows; no PATCH |
| Save blocked by duplicate actor type | **Changed** — silent today, now uses the same new toast (`S-2`) |
| PATCH rejected | Unchanged |
| Green check `false` | Submit disabled; existing mechanism |
| Migration not yet applied | UI stricter than the gate — safe direction |

---

## 9. Rollout & Rollback

| Step | Actor | Note |
| --- | --- | --- |
| 1 | CI/CD | Deploy client + migration file. **The migration does not run** (`K-015`). |
| 2 | *(window)* | UI stricter than the gate. **Safe.** |
| 3 | Human | `npm run typeorm migration:run -- -d ./src/db/config/mysql/orm.config.ts` |
| 4 | Human | `migration:show` — **read the raw output for an error before counting**; the passthrough emits ANSI escapes, so `grep '^\[ \]'` reads a pending migration as zero pending (`K-014`). |

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
| `R-IUR-006` | exactly one message, never zero, never two | **`DD-9`** precedence table |
| `R-IUR-007` | not evaluated on the known path | §3.2 branch on `is_known` |
| `R-IUR-008` | same source of truth on both surfaces | **`DD-5`** |
| `R-IUR-008` | **must NOT leave a stale sub-type contributing to validity** | **`DD-5b`** |
| `R-IUR-009` | `0` filled-but-not-positive | `DD-1` `'positive'` mode |
| `R-IUR-010` | **must NOT change OICR** | `DD-4` defaults + `numberAllowsZero` |
| `R-IUR-010` | **`0` is a valid `Number`** | `DD-4` `numberAllowsZero`, rule 10 |
| `R-IUR-010` | **whitespace-only `Unit` rejected** | §3.3, `DD-1` |
| `R-IUR-011` | **must NOT remove per-row actor rules** | rules 1–5 retained |
| `R-IUR-011` | **must NOT touch another validation function** | §5 |
| `R-IUR-012` | not verified by string assertion | `DD-6` constraint 3 |
| `R-IUR-012` | **must preserve level + justification verbatim** | **`DD-6` constraint 1**, rules 14–15 |
| `R-IUR-013` | full suite, not targeted | §12 |
| `R-IUR-014` | **must NOT block an entirely blank row** | `DD-8` decision table |
| `R-IUR-014` | **same rule for organization rows** | `DD-8` sites 1 and 2 |

**Cross-check against module constraints:** the actor card's `lg:` breakpoint rationale, the
`app-textarea` no-edit constraint, `R-IUD-001`'s permissive-save decision, and the create migration's
`level`-vs-`id` header note were all read. `DD-8` narrows `R-IUD-001` and `NFR-IUR-003` deliberately
and says so in §6.

---

## 11. Budget (Step 2.4 tripwire) — re-baselined

| Metric | Revision 1 | **Revision 2** | Why |
| --- | --- | --- | --- |
| Tasks | 13 | **16** | +`DD-5b`, +`DD-10` token sweep, +`quantification-item` spec rewrite (`S-5`) |
| LOC | ~1,150 | **~1,500** | test tier was under-budgeted (`S-4`, `C-4`): the fixture truth table, the catalog enumeration, and the `c2` seed test were all missed |
| Review rounds | ~20 | **~24** | — |

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
| `OQ-1` | Immediate vs. deferred messages (`DD-9`) | no |
| `OQ-2` | Asterisk on `Specify other` | no |
| `OQ-3` | Audit `app-input`'s falsy-`0` across the other 15 templates | no — separate proposal |
| `OQ-4` | Who applies the migration, and when (§9) | **yes, before execution** |
| ~~`OQ-5`~~ | ~~`R-IUR-014` must be added~~ — **CLOSED**: it already exists (`requirements.md` §5, `R-IUR-014`, indexed in §11, mitigated as `RSK-5`). Revision 1 carried it as blocking against a satisfied condition (`C-9`). *(Line citations dropped at round 2 — `A-N4`: they had already rotted two lines because the citing and cited files shared an edit window.)* | closed |
| **`OQ-6`** | `DD-9` **removes** `showNotIdentifiedMessage`, a shipped message discharging archived `R-IUP-012` AC.5, breaking one test. No requirement authorizes removal over suppression. | **yes** — raised from non-blocking at round 2 (`N-5`) |
