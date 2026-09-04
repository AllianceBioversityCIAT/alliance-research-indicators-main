# Proposal — Innovation Use required-field semantics and green check

> **In one sentence:** make every Innovation Use sub-form validate *per row* — a section with no rows
> is complete, a section with a row must be filled completely — and give every newly-required field
> the repo's established red-asterisk + amber-border treatment.

---

## Document Control

| Field | Value |
| --- | --- |
| Slug | `innovation-use-required-fields` — **derived** from the free-text `/akili-propose` argument (Spanish, ~250 words, no slug supplied) |
| Spec path | `docs/specs/changes/innovation-use-required-fields/` |
| Type | **Change** |
| Approval Mode | **gated** |
| Module | client — `innovation-use-details` · server — `db/migrations` (stored function) |
| Owner | D. Casañas |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Family | Follows `docs/specs/innovation-use/family.md` chunk 3 (`details-page`, archived 2026-08-26). Filed under `changes/` per the convention of the three prior post-family adjustments. |
| Depends on | none (all three family chunks are `done` + archived) |
| Parallel-safe | **no** — touches `quantification-item` and `app-input`, both shared with OICR |
| Source of intent | User instruction + 10 screenshots supplied in the `/akili-propose` invocation (2026-09-04). No Jira/Figma. |
| Decisions taken at proposal time | **D-1** zero rows in every section → green check **passes** (user ruling, 2026-09-04). **D-2** the `Organization` select on the *known* path is required (user ruling, 2026-09-04). |
| Created | 2026-09-04 |

---

## Intent

Two things are being asked for, and they are separable:

1. **A validation-semantics change** — which fields are required, and under what condition.
2. **A visual-consistency change** — every required field shows a red `*` on its label and, when
   empty, an amber border plus amber helper text.

The unifying rule the user stated, and the one the whole proposal hangs on:

> **A section with no rows is valid. A section with at least one row validates that row completely.**

---

## Problem / Current Behavior

| # | Today | Why it is wrong |
| --- | --- | --- |
| P-1 | The four disaggregated count fields (`Women youth`, `Women non-youth`, `Men youth`, `Men non-youth`) are **optional**, with no `*` and no amber state. The green check accepts a row where **any one** of the four is non-null. | A row reporting only `Women youth` passes the submit gate while three quarters of the disaggregation is missing. |
| P-2 | On the aggregate path (`Sex and age disaggregation does not apply`), `How many` is optional and the green check accepts `actors_count = 0`. | A count of zero actors is not a use. |
| P-3 | Nothing anywhere requires the actor totals to be **> 0**. | A row of four explicit zeros currently passes. |
| P-4 | On the *organization not known* path, `Organization type`, `Sub-type` and `Organization count` are **all optional** — no `*`, no amber, and the green check ignores organizations entirely. | An organization row can be saved carrying no information at all. |
| P-5 | Measures pass `[fieldsRequired]="false"`, so `Number`, `Unit` **and** `Comments` are all optional. | An empty measure row is meaningless; `Number` + `Unit` are what a measure *is*. |
| P-6 | **`At least one actor is required`** renders in amber on first load, before the user has done anything. | Per **D-1** the rule itself is being withdrawn, so the message is not merely mistimed — it is wrong. |

### The defect underneath P-1/P-2 that makes this non-trivial

`app-input`'s required check is `!this.body()?.value` (`input.component.ts:179`, and `!value` at
`:184`/`:187`). **`0` is falsy in JavaScript**, so the shared component treats a deliberately-entered
`0` as an empty field.

The user's requirement is the exact opposite — *"todos deben estar con datos **así sea 0**"*. So the
existing `[isRequired]` input **cannot** express this requirement, and every count field in this
change needs a required check that distinguishes `0` from blank. This is the single largest technical
decision in the change and drives the Approach Options below.

---

## Proposed Outcome

### Rule 1 — conditional, per-row validation

| Section | No rows | ≥ 1 row |
| --- | --- | --- |
| Actors | valid | every row fully valid |
| Organizations | valid | every row fully valid |
| Other quantitative measures | valid | every row fully valid |

### Rule 2 — required fields, by path

| Card | Path | Required | Extra constraint |
| --- | --- | --- | --- |
| **Actor** | any | `Actor type` *(already required)* | — |
| **Actor** | disaggregated | **all four** counts | **sum > 0** |
| **Actor** | aggregate (`not apply` checked) | `How many` | **> 0** |
| **Organization** | known | `Organization` *(new — **D-2**)* | — |
| **Organization** | not known | `Organization type` *(new)* | — |
| **Organization** | not known | `Sub-type` *(new)* | **only when the chosen type has sub-types** |
| **Organization** | not known | `Organization count` *(new)* | **> 0** |
| **Measure** | any | `Number`, `Unit` *(new)* | `Comments` stays **optional** |

`0` counts as a supplied value everywhere. It satisfies "the field is filled"; it does not satisfy
"> 0".

### Rule 3 — one visual treatment, everywhere

Established by the archived `changes/innovation-use-validation-warning-color` spec and visible in
`mockup/01` and `mockup/02`:

- label carries a red `*`
- when empty/invalid: **2px amber border** (`--ac-warning-1`, `#e69f00`)
- below it: amber `⚠ This field is required`

### Rule 4 — the green check follows the same rules

`innovation_use_validation` is rewritten to match, including dropping `tempFullActors > 0` per
**D-1**.

---

## Scope

**In scope**

- `innovation-use-actor-item` — 4 disaggregated counts + aggregate count: `*`, amber, sum/value > 0.
- `innovation-use-organization-item` — known path (`Organization`) and unknown path (`Organization type`, `Sub-type`, `Organization count`).
- `innovation-use-details.component.html` — remove the `At least one actor is required` block; switch measures to per-field required.
- `quantification-item` (**shared**) — split the single `fieldsRequired` flag so `Comments` can be optional while `Number`/`Unit` are required.
- `app-input` (**shared**) — an opt-in required mode in which `0` is a value (see Approach Options).
- **One new append-only migration** replacing `innovation_use_validation`.
- Co-located spec updates for every touched component.

**Out of scope / Non-Goals**

- Any other result type, indicator, or page. OICR consumes both shared components and **must not change behavior**.
- The `--ac-warning-1` AA contrast failure. It fails in both themes (light 2.09:1 / 2.25:1) and is an accepted, user-owned exception carried from the prior spec (`RB-1`/`RB-5`). This change *inherits* it; it does not re-open it.
- A repo-wide audit of inert Tailwind borders on PrimeNG elements (prior spec's `Blast radius` follow-up — still owed, still its own proposal).
- Applying the migration to any environment. That is a human step (see `RD-1`).
- Server-side DTO/`class-validator` changes. The green check is the submit gate; the API stays permissive so drafts remain saveable.

---

## Affected Users, Systems, And Specs

Enumerated by **what renders**, not by folder — `KZ-002`.

| Surface | File | Risk |
| --- | --- | --- |
| Actor card | `.../innovation-use-actor-item/` | local |
| Organization card | `.../innovation-use-organization-item/` | local |
| Page shell | `innovation-use-details.component.html` | local |
| **Shared** measure card | `shared/components/quantification-item/` | **2 consumers: this page + `oicr-details`** |
| **Shared** input | `shared/components/custom-fields/input/` | **18 templates app-wide** |
| **Shared** green check | `db/migrations/…-createInnovationUseValidation.ts` → new migration | indicator 6 only (function is name-scoped) |
| Submit gate | `result-status-workflow/function-handler.service` | reads the function's boolean |

**Users:** anyone reporting an Innovation Use result. The change makes previously-submittable drafts
non-submittable (see `R-2`).

---

## Visual Reference

- **Source:** User-supplied screenshots of the live application (2026-09-04).
- **Location:** `docs/specs/changes/innovation-use-required-fields/mockup/`
- **Notes:** These are *current-state* captures plus two *target-pattern* captures — not new mockups. The target visual already exists in the product; this change propagates it.

| File | Shows |
| --- | --- |
| `01-pattern-justification-textarea.png` | **Target pattern**: red `*`, amber border, amber `This field is required` |
| `02-pattern-actor-type-select.png` | **Target pattern** on a `p-select` |
| `03-actor-card-disaggregated.png` | Current actor card, disaggregated — counts carry no `*` |
| `04-actor-four-count-fields.png` | The four count fields, close-up |
| `05-actor-card-aggregate.png` | Current actor card, `not apply` checked |
| `06-org-unknown-no-subtype.png` | Org, not known, type + count, no `*` anywhere |
| `07-org-unknown-with-subtype.png` | Org, not known, with the `Sub-type` select present |
| `08-measure-card.png` | Measure card — all three fields currently optional |
| `09-three-empty-sections.png` | The three sections empty, with the amber actor message |
| `10-at-least-one-actor-message.png` | **The message to remove**, close-up |

---

## Requirement Delta Preview

### ADDED

- **A-1** All four disaggregated counts required when the row is disaggregated; `0` is a valid value.
- **A-2** Disaggregated **sum > 0**.
- **A-3** Aggregate `How many` required and **> 0**.
- **A-4** `Organization` required on the known path (**D-2**).
- **A-5** `Organization type` required on the unknown path.
- **A-6** `Sub-type` required **iff** the chosen type has children in `clarisa_institution_types` (feasible in SQL — the table carries `parent_code`).
- **A-7** `Organization count` required and **> 0**.
- **A-8** `Number` and `Unit` required on any measure row.
- **A-9** Red `*` + amber border + amber message on every field A-1…A-8.
- **A-10** The green check validates organizations and measures, which it does not do today at all.

### MODIFIED

- **M-1** Green check actor rule: from *"at least one of the four counts is non-null"* to *"all four non-null **and** sum > 0"*.
- **M-2** Green check aggregate rule: from `actors_count IS NOT NULL` to `IS NOT NULL AND > 0`.
- **M-3** `quantification-item`'s single `fieldsRequired` boolean → per-field flags, defaults preserving OICR's current behavior exactly.
- **M-4** `app-input` gains an opt-in zero-aware required mode; the default path is untouched.

### REMOVED

- **R-1** The `At least one actor is required` message (`innovation-use-details.component.html:154-159`).
- **R-2** The `tempFullActors > 0` clause from `innovation_use_validation` (**D-1**).

---

## Approach Options

The only genuinely contested decision is **how `app-input` learns that `0` is a value**. Everything
else follows.

| | Option A — opt-in input | Option B — fix the shared check | Option C — bypass `app-input` |
| --- | --- | --- | --- |
| **What** | Add `[allowZero]` (or `[requiredMode]="'present'"`); when set, required tests `value === null \|\| value === undefined \|\| value === ''` | Change `!value` to a null/blank test for **all** `app-input` consumers | Hand-roll the count fields in the two innovation-use cards with `p-inputNumber` + `[style]` binding |
| **Blast radius** | 18 templates compile; **0** behavior change unless opted in | **18 templates**, behavior changes wherever a numeric `0` is currently reported as missing | 0 shared files touched |
| **Fixes latent bugs elsewhere?** | no | **probably yes** — any numeric required field app-wide has this bug today | no |
| **Risk** | low | **high** — an unbounded, unmeasured regression surface | medium — duplicates markup the shared component owns; drifts from `DD-10` unless carefully replicated |
| **Cost** | small | small to write, **large to verify** | medium, and recurring |

### Recommended: **Option A**

It is the smallest change that satisfies the requirement, and it is the only one whose blast radius
is *provably* zero for the other 17 templates — an un-passed input cannot change their behavior.

Option B is tempting because P-1's root cause is almost certainly a latent bug in other numeric
forms too. **That is a real finding and it should be written down — but not fixed here.** Verifying
it means auditing 18 templates for whether a `0` is currently reachable and expected, which is a
larger job than this change and would hide a data-quality fix inside a UI-consistency change.
Recommend logging it as a follow-up proposal.

Option C is rejected: it re-creates the exact conditions of the prior spec's `D-8` defect class
(hand-placed border styling that may not win the cascade), for no benefit.

### A second, smaller choice: `quantification-item`'s flag split

Recommend **three inputs** — `numberRequired`, `unitRequired`, `commentsRequired`, each defaulting
to `true`, with `fieldsRequired` kept as a deprecated alias that sets all three. OICR passes nothing
and is bit-for-bit unchanged; this page passes `commentsRequired = false`.

---

## Risks, Dependencies, And Open Questions

| ID | Item | Severity |
| --- | --- | --- |
| **RD-1** | **The migration will not ship with the code.** Per `K-015` (measured 2026-08-18) CI/CD deploys code only — a merged migration can sit unapplied indefinitely. Between the deploy and a human applying it, the **UI will demand fields the green check does not yet check**. The spec must state the apply step explicitly and the client/server skew must be safe in both orders. | **High** |
| **RD-2** | **`DD-10` (prior spec):** a Tailwind `border-*` utility on a PrimeNG element is **inert** — PrimeNG injects unlayered CSS, Tailwind v4 emits `@layer utilities`, and unlayered author CSS wins unconditionally. Every new border in this change must use an `[style]` object binding. Ask *"will the class win the cascade?"*, not *"will it be generated?"* — that question is what `KZ-017` exists for, and its absence is what produced `D-8`. | **High** |
| **RD-3** | **R-2 makes the submit gate strictly weaker.** After **D-1**, a result with a level, a justification, and no actors/organizations/measures becomes submittable. Existing results that are currently blocked will become submittable. This is a **data-quality decision**, taken by the user, and should be visible to whoever owns Innovation Use reporting — not buried in a migration. | **High** |
| **RD-4** | **M-1/M-2 make the gate strictly stronger in the other direction.** Results that pass today (one of four counts filled; a zero count) will **stop** passing. There is no migration of existing data and no user-facing notice. How many live results are affected is **unmeasured** — a `SELECT` against Dev should size it before execution. | **Medium** |
| **RD-5** | `--ac-warning-1` fails WCAG AA in **both** themes (accepted exception `RB-1`/`RB-5`). This change multiplies the number of elements rendering in it. It does not create the defect; it does widen it. | Medium |
| **RD-6** | `quantification-item` and `app-input` are shared with OICR — `KZ-002`. The full client suite (currently **317 suites / 6798 tests**) is the gate, not a targeted run. | Medium |
| **OQ-1** | **Are the amber messages immediate or deferred?** Today they render on first paint (`mockup/09`). With ~8 new required fields, adding an actor row will paint 5+ amber warnings at once before the user types anything. Recommend keeping immediate for consistency with `Actor type`, but this is a UX call worth making deliberately. | — |
| **OQ-2** | **What is the exact `Sub-type` rule server-side?** The client shows `Sub-type` only when `subTypeOptions().length > 0`, sourced from a client service. The SQL must derive the same condition from `clarisa_institution_types.parent_code`. If the two disagree, a row is unsubmittable with no visible cause. **This must be proven equivalent, not assumed.** | — |
| **OQ-3** | Should `Specify other` (custom name, actor type 5 / org type "other") get the `*` too? It is already enforced in the green check for actors but carries no asterisk. Not mentioned by the user. | — |

---

## Success Criteria

1. A section with zero rows shows no warning and does not block the green check — **including all three sections empty** (`D-1`).
2. Adding one row to any section makes that row's required fields enforced, both visually and in the green check.
3. A count field containing `0` renders as **filled** (no amber), and a disaggregated row of four zeros is rejected for **sum > 0**, not for emptiness.
4. `At least one actor is required` no longer renders in any state.
5. **OICR details is byte-for-byte unchanged** in behavior — proven by its own suite, not asserted.
6. Every new amber border is verified **rendering in a real browser**, not merely present as an attribute (`AC.10` of the prior spec is the precedent: seven automated gates passed over an inert border).
7. Full client suite green; new/updated migration spec green.
8. The green-check function is verified against a real MySQL instance for each of the 8 rules — a mocked query builder cannot represent SQL operator precedence (`KZ-017`).

---

## Next Step

```text
/akili-specify docs/specs/changes/innovation-use-required-fields
```

Recommended depth: **Standard** — not Lite. Three reasons: it crosses the client/server boundary,
it carries an append-only migration with a human apply step, and it edits two components shared with
another live page.

---

## References

- `docs/specs/archive/2026-09-02-changes--innovation-use-validation-warning-color/` — the amber token, `DD-10`, `D-8`, and the AA exception this change inherits
- `docs/specs/archive/2026-08-26-innovation-use--details-page/` — chunk 3, which built these cards
- `docs/specs/innovation-use/family.md` — parent manifest
- `server/researchindicators/src/db/migrations/1787078283929-createInnovationUseValidation.ts` — the function being replaced
- Kaizen: `KZ-002` (shared components), `KZ-017` (verification scope), `K-015` (migrations are not deployed), `K-004`/`KZ-014` (prove the gate can redden)
