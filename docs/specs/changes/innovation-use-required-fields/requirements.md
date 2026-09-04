# Requirements — Innovation Use / Required-field semantics and green check

- **Module:** client (`innovation-use-details`) + server (`db/migrations` stored function)
- **Spec id:** 2026-09-innovation-use-required-fields
- **Status:** draft
- **Owner:** D. Casañas
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — Results reporting completeness
- **Linked tickets:** —
- **Last updated:** 2026-09-04
- **Extends:** [`docs/specs/archive/2026-08-26-innovation-use--details-page/`](../../archive/2026-08-26-innovation-use--details-page/) (chunk 3 of `innovation-use/family.md`)
- **Extends:** [`docs/specs/archive/2026-09-02-changes--innovation-use-validation-warning-color/`](../../archive/2026-09-02-changes--innovation-use-validation-warning-color/) (the amber treatment, `DD-10`, `D-8`)
- **Depth:** **Full** — raised from Standard at `design.md` Step 2.4 (§11)
- **Approval Mode:** gated (inherited from `proposal.md`)

---

## 1. Context

The Innovation Use details page collects three optional collections — actors, organizations,
quantitative measures — plus a use level and a justification. Today each collection's fields are
almost entirely unvalidated, while the submit gate (`innovation_use_validation`) enforces a
different and narrower rule set than the UI suggests.

This spec makes one rule govern both surfaces:

> **A section with no rows is complete. A section with at least one row must have that row filled
> completely.**

and gives every newly-required field the red-asterisk + amber-border treatment already established
for `Justification` and `Actor type`.

**Not changing:** any other result type or indicator; OICR's behavior (it shares two components);
the `--ac-warning-1` contrast exception; the API's permissiveness for drafts.

---

## 2. Executive Summary

| | |
| --- | --- |
| **Problem** | Field-level requirements are inconsistent between what the UI shows, what the user is told, and what the submit gate enforces. |
| **Core rule** | Conditional per-row validation (`R-IUR-001`). |
| **Biggest technical obstacle** | `app-input`'s required check is falsy-based (`input.component.ts:179`, `:184`), so a deliberate `0` reads as empty — the exact opposite of this spec's requirement. The check is **gated by `isRequired`**, which no innovation-use count field passes today, so the defect is latent at these sites rather than active. |
| **Biggest risk** | The green check lives in a MySQL stored function that CI/CD **does not deploy** (`K-015`). |
| **Reverts** | Two documented decisions — see `R-IUR-002` and `R-IUR-011`. |

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **Row** | One card in a collection: an actor card, an organization card, a measure card. |
| **Filled** | The field holds a value that is not `null`, `undefined`, or `''`. **`0` is filled.** |
| **Positive** | Filled *and* numerically greater than zero. |
| **Disaggregated path** | An actor row with `sex_age_disaggregation_not_apply = false`: four count fields. |
| **Aggregate path** | An actor row with `sex_age_disaggregation_not_apply = true`: one `How many` field. |
| **Known path** | An organization row with `is_organization_known = true`: a CLARISA institution lookup. |
| **Unknown path** | An organization row with `is_organization_known = false`: type + sub-type + count. |
| **Green check** | The MySQL function `innovation_use_validation(result_code)`; its boolean gates submission. |
| **Amber treatment** | Red `*` on the label, 2px `--ac-warning-1` border when invalid, amber `⚠ This field is required` below. |

---

## 4. Defect Classes And Their Gates

Named before the verification commands are chosen, per the methodology's *"a gate blind to the
defect class the spec most often produces is not a gate."*

| # | Defect class | Can it be caught automatically? | Gate |
| --- | --- | --- | --- |
| **DC-1** | **Inert border** — the amber border is generated and correctly placed but loses the CSS cascade and paints nothing (`D-8`, prior spec's Pivot 2). | **No.** jsdom paints nothing; `cssstyle@2.3.0` drops a shorthand carrying `var()`. Seven automated gates passed over this exact defect in the prior spec. | **Human browser check at the HITL pause** (`AC` on every visual requirement) + mandatory `[style]` object binding on PrimeNG elements (`DD` in design). **Accepted: no automated gate exists.** |
| **DC-2** | **`0` read as empty** — a deliberately-entered `0` renders as a missing field. | **Yes.** | Unit test per field: set `0`, assert no amber and no message. Falsifying input: `0`. |
| **DC-3** | **Client/server divergence** — the UI enforces rule X while the green check enforces Y, so a row looks complete and is unsubmittable (or vice versa). | **Partly.** | One shared rule table; a test per rule on **both** sides. The SQL half must be **executed**, not string-matched. |
| **DC-4** | **SQL operator precedence** — `A OR B AND C` parsed as `A OR (B AND C)`. | **Not by a mocked query builder** (`KZ-017`: a mock passed `A OR B AND C` as `(A OR B) AND C`). | Execute the function against a real MySQL instance with a truth-table of inputs. |
| **DC-5** | **Shared-component regression** — OICR's measure card or any of the 18 `app-input` consumers changes behavior. | **Yes.** | Full client suite (`KZ-002` — enumerate by what renders, not by folder). Falsifying input: OICR measure card with `Comments` empty must still show its required message. |
| **DC-6** | **Migration never applied** — code ships, function does not (`K-015`). | **No** — no test in this repo can observe a remote schema. | Explicit human apply step in `tasks.md` + `npm run typeorm migration:show`. Raw output inspected before counting (`K-014`: the passthrough emits ANSI escapes). **Accepted: deployment-time, not build-time.** |
| **DC-2b** | **Whitespace-only text passes the client and fails SQL.** `valid_text` strips whitespace; nothing on the client trims. Affects rule 2 (`actor_type_custom_name`, owned by the actor card — **not** by `app-input`) and rule 11 (`unit`). | **Yes.** | Unit tests per field, falsifying input `'   '`. Rule 2 needs its **own** check; `requiredMode` never reaches it. *(Registered at Judgment Day round 2, `N-10`/`N-11`.)* |
| **DC-8** | **Stale TypeScript references in spec files** — `ng build` uses `tsconfig.app.json`, ESLint ignores specs, and `ts-jest` runs `isolatedModules`, so a removed `@Input` referenced from a `.spec.ts` is caught by nothing. | **Yes, but never as a clean run.** | `npx tsc -p tsconfig.spec.json --noEmit`, compared as a **normalized before/after error set** — the repo has a standing error population and this spec's own target file carries 5 pre-existing `TS2552`. *(Registered at Judgment Day round 2, `N-6`/`N-10`.)* |
| **DC-7** | **Presence mistaken for behavior** — asserting a class/attribute exists and calling the behavior proven. | — | Every presence assertion must record what it cannot prove (`KZ-001`). |

---

## 5. Functional Requirements

### R-IUR-001 — Conditional per-row validation

- **As a** contributor reporting an Innovation Use result
- **I want** empty optional sections to leave me alone, and started rows to tell me what is missing
- **So that** I am not blocked by data I chose not to report, nor allowed to submit half a row

The system SHALL treat each of the three collections independently: a collection with zero rows
SHALL be valid; a collection with one or more rows SHALL require every row to satisfy its path's
rules.

#### Scenario: All three sections empty

- GIVEN an Innovation Use result with a use level and, if required, a justification
- AND zero actor rows, zero organization rows, and zero measure rows
- WHEN the green check is evaluated
- THEN it returns **true** and the result is submittable
- AND no amber validation message renders anywhere in the three sections
- BUT it must NOT render the message `At least one actor is required` in any state
- AND IT MUST reach this outcome with no user action — an untouched empty section is valid on first paint

#### Scenario: One started row invalidates its section

- GIVEN a result that is otherwise complete
- WHEN exactly one actor row exists and its `Actor type` is empty
- THEN the green check returns **false**
- AND the row renders the amber treatment on `Actor type`
- BUT it must NOT flag the organizations or measures sections, which remain empty and valid

**Acceptance criteria**

- [ ] AC.1 — Zero rows in all three sections ⇒ green check `true`.
- [ ] AC.2 — Zero rows in a section ⇒ no message rendered for that section.
- [ ] AC.3 — One invalid row in a section ⇒ green check `false`.
- [ ] AC.4 — An invalid row in one section does not produce messages in another section.

---

### R-IUR-002 — No auto-seeded actor row on an empty result

The client SHALL NOT create a blank actor row when the server returns zero actors.

**Why this is a reversion.** `docs/ux-ui/design.md:560` records details-page `DD-10`: *"exactly one
blank Actor card … actors are required, so a blank starter card helps completion."* The seeding is
implemented at `innovation-use-details.component.ts:353`. **`R-IUR-011` removes the premise** — once
actors are not required, a seeded blank card is a row the user never created that immediately fails
five validations (`Actor type` + four counts) and, under `R-IUR-001`, flips a valid empty result to
invalid on first paint.

#### Scenario: Fresh result renders no actor card

- GIVEN a result whose `GET` returns an empty `actors` array
- WHEN the page finishes loading
- THEN the ACTORS section renders its guidance callout and the `Add other actor` button, and no card
- AND no amber message renders in the section
- BUT it must NOT alter the behavior for a result that returns one or more actors
- AND IT MUST leave `addActor()` unchanged — clicking `Add other actor` still appends one blank row

**Acceptance criteria**

- [ ] AC.1 — Empty `actors` from the API ⇒ zero rendered actor cards.
- [ ] AC.2 — Non-empty `actors` ⇒ every returned row rendered, unchanged.
- [ ] AC.3 — `Add other actor` appends exactly one blank row.
- [ ] AC.4 — `docs/ux-ui/design.md` is updated: line 560's `DD-10` is marked superseded by this spec, with the reason.

---

### R-IUR-003 — One visual treatment for every required field

Every field this spec makes required SHALL render the amber treatment, identical to the existing
`Justification` and `Actor type` fields (`mockup/01`, `mockup/02`).

**Details**

- Label: field name immediately followed by a red `*`.
- Invalid state: **2px solid `var(--ac-warning-1)`** border on the control.
- Below the control: `⚠ This field is required` in `--ac-warning-1` at `fs-[14]`.
- Validity is evaluated continuously; the message appears as soon as the field is empty and clears as soon as it is filled.

#### Scenario: Amber appears and clears

- GIVEN a newly added row
- WHEN a required field is empty
- THEN it renders a red `*`, an amber border, and the amber required message
- WHEN the user supplies any value, **including `0`**
- THEN the border and the message disappear in the same change detection cycle
- BUT it must NOT colour a PrimeNG control's border with a Tailwind utility class — PrimeNG injects unlayered CSS and Tailwind v4 emits `@layer utilities`, so a utility loses the cascade unconditionally and paints nothing (`D-8`)
- AND IT MUST be confirmed rendering in a real browser, because no automated gate in this repo can observe a painted border (`DC-1`)

**Acceptance criteria**

- [ ] AC.1 — Red `*` present on the label of every field in `R-IUR-004` … `R-IUR-010`.
- [ ] AC.2 — Amber border present when empty, absent when filled.
- [ ] AC.3 — Amber message present when empty, absent when filled.
- [ ] AC.4 — `0` clears the amber state (see `R-IUR-004`).
- [ ] AC.5 — **Human browser check**: every new border verified painted, in light theme, on a real browser. Records which fields were checked.

---

### R-IUR-004 — Actor, disaggregated path: four counts required, sum positive

When an actor row is on the disaggregated path, all four count fields SHALL be filled, and their sum
SHALL be greater than zero.

#### Scenario: A zero is a value, not a blank

- GIVEN a disaggregated actor row
- WHEN `Women youth` = `0`, `Women non-youth` = `5`, `Men youth` = `0`, `Men non-youth` = `0`
- THEN no field renders the amber treatment
- AND the row is valid, because the sum is `5`
- AND IT MUST hold that `0` satisfies "filled" for every one of the four fields

#### Scenario: All four zeros fail the positivity rule, not the fill rule

- GIVEN a disaggregated actor row
- WHEN all four counts are `0`
- THEN no field renders `This field is required` — all four are filled
- AND the row is invalid and the green check returns **false**
- AND the row renders a distinct message stating the total must be greater than zero
- BUT it must NOT report the four fields as empty, which would tell the user to do something they have already done

#### Scenario: A partially filled row

- GIVEN a disaggregated actor row
- WHEN only `Women youth` is filled
- THEN the other three fields each render the amber treatment
- AND the green check returns **false**

**Acceptance criteria**

- [ ] AC.1 — Each of the four fields carries a red `*` and validates independently.
- [ ] AC.2 — `0` in a field ⇒ that field is valid (falsifying input for `DC-2`).
- [ ] AC.3 — Fewer than four filled ⇒ amber on each unfilled field, green check `false`.
- [ ] AC.4 — Four filled, sum `0` ⇒ a **total** message, not a required message; green check `false`.
- [ ] AC.5 — Four filled, sum `> 0` ⇒ valid; green check `true` for this clause.
- [ ] AC.6 — The green check enforces AC.3–AC.5 identically to the client (`DC-3`).

---

### R-IUR-005 — Actor, aggregate path: count required and positive

When `Sex and age disaggregation does not apply` is checked, `How many` SHALL be filled and greater
than zero.

#### Scenario: Aggregate zero is rejected

- GIVEN an actor row with the aggregate checkbox checked
- WHEN `How many` is empty
- THEN it renders the amber treatment and the green check returns **false**
- WHEN `How many` = `0`
- THEN it renders the positivity message, not the required message, and the green check returns **false**
- WHEN `How many` = `1`
- THEN the row is valid
- BUT it must NOT evaluate the four disaggregated counts while this path is active

**Acceptance criteria**

- [ ] AC.1 — `How many` carries a red `*` on this path only.
- [ ] AC.2 — Empty ⇒ required message; green check `false`.
- [ ] AC.3 — `0` ⇒ positivity message; green check `false`.
- [ ] AC.4 — `> 0` ⇒ valid.
- [ ] AC.5 — Toggling the checkbox switches which fields are evaluated, with no stale message left behind from the other path.

---

### R-IUR-006 — Organization, known path: institution required

When `Is the organization known?` is checked, the `Organization` select SHALL be filled.

*(Decision **D-2**, user ruling 2026-09-04. Not enumerated in the original request; confirmed at
proposal time.)*

#### Scenario: Known organization with no institution chosen

- GIVEN an organization row with the known checkbox checked
- WHEN no institution is selected
- THEN the `Organization` label carries a red `*` and the select renders the amber treatment
- AND the green check returns **false**
- BUT it must NOT render two competing messages — the existing `This row does not identify an organization yet` and the new required message must not both appear for the same cause

**Acceptance criteria**

- [ ] AC.1 — Red `*` on `Organization` when the known path is active.
- [ ] AC.2 — Empty ⇒ amber treatment; green check `false`.
- [ ] AC.3 — Exactly one message renders for an unidentified known-path row — never zero, never two.
- [ ] AC.4 — Filled ⇒ valid.

---

### R-IUR-007 — Organization, unknown path: type required

When `Is the organization known?` is unchecked, `Organization type` SHALL be filled.

#### Scenario: Unknown organization with no type

- GIVEN an organization row with the known checkbox unchecked (`mockup/06`)
- WHEN `Organization type` is empty
- THEN it renders the amber treatment and the green check returns **false**

**Acceptance criteria**

- [ ] AC.1 — Red `*` on `Organization type` when the unknown path is active.
- [ ] AC.2 — Empty ⇒ amber treatment; green check `false`.
- [ ] AC.3 — The field carries no `*` and is not evaluated while the known path is active.

---

### R-IUR-008 — Organization, unknown path: sub-type conditionally required

`Sub-type` SHALL be required **if and only if** the selected `Organization type` has sub-types.

#### Scenario: A type with sub-types

- GIVEN an unknown-path row whose selected type has one or more sub-types (`mockup/07`)
- WHEN `Sub-type` is empty
- THEN the `Sub-type` field renders and carries a red `*` and the amber treatment
- AND the green check returns **false**

#### Scenario: A type with no sub-types

- GIVEN an unknown-path row whose selected type has no sub-types (`mockup/06`)
- THEN the `Sub-type` field does not render at all
- AND its absence does not make the row invalid
- BUT it must NOT leave a stale `sub_institution_type_id` from a previously selected type contributing to validity
- AND IT MUST evaluate "has sub-types" from the **same source of truth** on both surfaces — a client list and a SQL predicate that disagree produce a row that looks complete and cannot be submitted, with nothing on screen explaining why (`DC-3`)

**Acceptance criteria**

- [ ] AC.1 — Type with sub-types + empty `Sub-type` ⇒ amber treatment; green check `false`.
- [ ] AC.2 — Type with no sub-types ⇒ field absent; row can still be valid.
- [ ] AC.3 — Changing the type clears any sub-type value that does not belong to the new type.
- [ ] AC.4 — **Equivalence proof:** for every institution type in the catalog, the client's "shows a sub-type select" and the SQL's "requires a sub-type" agree. Verified by enumeration over the catalog, not by sampling. **The client predicate is `is_active = true AND parent_code IS NULL AND has children at depth 2`** — root-only and active-only, strictly narrower than `EXISTS(parent_code = type)`; the enumeration MUST run against that predicate's real source (`ClarisaInstitutionTypesService.getInstitutionTypesByDepthLevel`), not against a mocked sub-types service, which cannot observe either filter (`KZ-017`). *(Corrected at Judgment Day round 1, finding `C-1`.)*

---

### R-IUR-009 — Organization, unknown path: count required and positive

`Organization count` SHALL be filled and greater than zero on the unknown path.

#### Scenario: Organization count boundary

- GIVEN an unknown-path organization row
- WHEN `Organization count` is empty ⇒ required message, green check `false`
- WHEN it is `0` ⇒ positivity message, green check `false`
- WHEN it is `1` ⇒ valid
- AND IT MUST treat `0` as filled-but-not-positive, exactly as `R-IUR-004`/`R-IUR-005` do

**Acceptance criteria**

- [ ] AC.1 — Red `*` on `Organization count` on the unknown path.
- [ ] AC.2 — Empty ⇒ required message; `0` ⇒ positivity message; the two are distinguishable.
- [ ] AC.3 — `> 0` ⇒ valid.
- [ ] AC.4 — Green check enforces the same boundary.

---

### R-IUR-010 — Measures: number and unit required, comments optional

A measure row SHALL require `Number` and `Unit`. `Comments` SHALL remain optional.

#### Scenario: A measure row is started

- GIVEN one measure row exists (`mockup/08`)
- WHEN `Number` and `Unit` are empty
- THEN both render the amber treatment and the green check returns **false**
- WHEN both are filled and `Comments` is empty
- THEN the row is valid and `Comments` renders **no** `*` and **no** message
- BUT it must NOT change the OICR measure card, which requires all three fields today and must keep doing so (`DC-5`)
- AND IT MUST accept `0` as a valid `Number` — this field is a signed decimal by `changes/measure-number-signed-decimal`, and zero is a legitimate measurement
- AND IT MUST reject a **whitespace-only** `Unit`. The server's `valid_text` strips whitespace before measuring length, so `'   '` is invalid in SQL; the client does not trim anywhere today. Client and server MUST apply the same trimmed test, or a row renders complete, saves, and is unsubmittable with no message (`DC-3`). *(Added at Judgment Day round 1, finding `C-2`.)*

**Acceptance criteria**

- [ ] AC.1 — `Number` and `Unit` carry a red `*`; `Comments` does not.
- [ ] AC.2 — Either empty ⇒ amber treatment; green check `false`.
- [ ] AC.3 — Both filled, `Comments` empty ⇒ valid.
- [ ] AC.4 — `Number` = `0` ⇒ valid (no positivity rule here; the user did not ask for one).
- [ ] AC.5 — **OICR's measure card renders all three asterisks and all three required messages, unchanged**, for **both** OICR call sites (`oicr-details.component.html:60` "Actual count" and `:81` "EXTRAPOLATED ESTIMATES" — three call sites exist across two files, not two). Falsifying input for `DC-5`. **This CANNOT be proven by OICR's own suite**, which stubs the card with an empty-template `FakeQuantificationItemComponent` (`oicr-details.component.spec.ts:872-880`) and is structurally blind to every property this AC names; it must be proven in `quantification-item.component.spec.ts` against the default (no-inputs-passed) configuration. *(Corrected at Judgment Day round 1, findings `C-3` and `S-7`.)*
- [ ] AC.6 — Whitespace-only `Unit` ⇒ amber treatment; green check `false`. Falsifying input: `'   '`.
- [ ] AC.7 — The same holds for `Specify other` on an actor row of type `5` (`actor_type_custom_name`). It is owned by the actor card, not `app-input`, so it needs its **own** trimmed check — `requiredMode` will never reach it. *(Added at Judgment Day round 2, `N-11`.)*

---

### R-IUR-011 — Remove the "at least one actor" rule

The rule requiring at least one actor SHALL be removed from both surfaces.

*(Decision **D-1**, user ruling 2026-09-04.)*

**Why this is a reversion.** The clause `tempFullActors > 0` has been in
`innovation_use_validation` since it was created. Removing it means an Innovation Use result with a
level, a justification, and **no** actors, organizations, or measures becomes submittable.

#### Scenario: The message is gone

- GIVEN the ACTORS section with zero rows (`mockup/09`, `mockup/10`)
- THEN `At least one actor is required` does not render
- AND the green check does not consider the actor row count
- BUT it must NOT remove the per-row actor rules — a row that *exists* is still fully validated (`R-IUR-004`, `R-IUR-005`)
- AND IT MUST leave the `INNOVATION_DEV` actor role (`actor_role_id = 1`) untouched; this function filters on role `2` and no other validation function may be modified

**Acceptance criteria**

- [ ] AC.1 — The message renders in no state.
- [ ] AC.2 — Green check `true` for a result with a level, a justification, and zero rows everywhere.
- [ ] AC.3 — Green check `false` for a result with one incomplete actor row.
- [ ] AC.4 — The new migration's `DROP`/`CREATE` name **only** `innovation_use_validation`.

---

### R-IUR-012 — Green check parity

`innovation_use_validation` SHALL enforce exactly the rules in `R-IUR-004` … `R-IUR-011`, evaluated
over rows discriminated by `actor_role_id = 2`, `institution_type_role_id = 2`, and
`quantification_role_id = 3`.

#### Scenario: The function is proven, not assumed

- GIVEN the new migration applied to a real MySQL instance
- WHEN the function is evaluated against a truth table covering each rule's pass and fail case
- THEN every result matches the client's verdict for the same data
- BUT it must NOT be verified by asserting on the migration's SQL **string** alone — a mocked query builder cannot represent operator precedence, and `A OR B AND C` has previously passed as `(A OR B) AND C` (`DC-4`, `KZ-017`)
- AND IT MUST preserve the existing level and justification rules unchanged (`commonFields`, and `IF(useLevel >= 6, explanationValid, TRUE)`)

**Acceptance criteria**

- [ ] AC.1 — Executed truth table: at minimum one pass and one fail row per rule.
- [ ] AC.2 — Level/justification behavior byte-identical to the current function.
- [ ] AC.3 — Migration is **new and append-only**; the existing migration file is not edited.
- [ ] AC.4 — `down()` restores the previous function definition.
- [ ] AC.5 — A migration spec asserts the structural constraints (single function named, append-only) — and **records that it cannot prove the function's runtime behavior** (`DC-7`).

---

### R-IUR-013 — Shared components must not change other consumers

Changes to `quantification-item` and `app-input` SHALL be opt-in, leaving every existing consumer's
behavior byte-identical.

#### Scenario: The other 15 templates

- GIVEN `app-input` gains a new capability for zero-aware required checking
- WHEN a template that does not pass the new input is rendered
- THEN its validation behavior is exactly what it was before this change
- BUT it must NOT be verified by a targeted run — shared components render on routes this spec never names (`KZ-002`)
- AND IT MUST be gated on the **full** client suite run from `client/research-indicators/`, green — **not** on a pinned suite/test total, which any unrelated commit moves (`C-15`)

**Acceptance criteria**

- [ ] AC.1 — `quantification-item`'s default behavior (no inputs passed) is unchanged; OICR proves it.
- [ ] AC.2 — `app-input`'s default behavior is unchanged for all **15** templates this spec does not touch. *(18 templates use `app-input`; this spec changes the call sites in 3 of them — both innovation-use cards and `quantification-item`. Corrected at Judgment Day round 1, finding `C-8`: "17" was wrong in three documents.)*
- [ ] AC.3 — Full client suite green.

---

### R-IUR-014 — No silent data loss on save

*(Added during Phase 2. Not knowable from the UI alone — it was found by reading `buildPayload()`
during the `design.md` reversion challenge. See `design.md` `DD-8`.)*

The system SHALL NOT discard user-entered data on save without telling the user.

**Context.** `buildPayload()` drops any row that lacks the identity field the server requires: an
actor row without `actor_type_id`, an organization row without an institution or institution type.
Combined with `R-IUR-011`, this creates a trap that does not exist today — a dropped row leaves
**zero** rows, which is now **valid**, so the result silently becomes submittable while the user's
typed values are gone.

#### Scenario: Counts typed, actor type left empty

- GIVEN an actor row whose four counts are filled and whose `Actor type` is empty
- WHEN the user saves
- THEN the save does not proceed
- AND the user is told which row is blocking and why
- BUT it must NOT block a save because of a row the user started and left **entirely** blank — such a row carries nothing to lose and must save harmlessly, preserving the permissive-draft behavior of `R-IUD-001`
- AND IT MUST apply the same rule to organization rows carrying a count or sub-type with no identity

#### Scenario: A blank row does not block

- GIVEN the user clicks `Add other actor` and types nothing
- WHEN the user saves
- THEN the save proceeds normally and the blank row is discarded without a message

**Acceptance criteria**

- [ ] AC.1 — Actor row with any count filled and no `actor_type_id` ⇒ save blocked, user informed.
- [ ] AC.2 — Organization row with `organization_count` or `sub_institution_type_id` filled and no identity ⇒ save blocked, user informed.
- [ ] AC.3 — Entirely blank row ⇒ save proceeds, no message, row discarded.
- [ ] AC.4 — Measure rows never block: the existing drop rule is already content-aware, so no loss case exists.
- [ ] AC.5 — The existing duplicate-actor-type save block still blocks. **It is silent today** — when `hasDuplicateActorType()` is true the save body is skipped and execution falls to `navigateTo()`, raising no toast (verified, `innovation-use-details.component.ts:584`, `:588`, `:600`). This spec introduces the *first* blocked-save message; there is no prior message to preserve. *(Corrected at Judgment Day round 1, finding `S-2`.)*
- [ ] AC.6 — **Falsifying input:** four counts + no actor type. Before the fix this saves and loses the counts; after it, the save is blocked.

---

## 6. Non-Functional Requirements

### NFR-IUR-001 — Deployment safety across the migration gap

- **Category:** reliability
- **Target:** the application behaves correctly in **both** orders — code deployed before the migration is applied, and after.
- **How verified:** reasoned in `design.md` and stated in `tasks.md` as an explicit human step. Between deploy and apply, the UI will demand fields the green check does not enforce; this is **safe** (the UI is stricter than the gate) and must be confirmed to be the direction of the skew, not the reverse.
- **Note:** `K-015` — the pipeline deploys code only; a merged migration can sit unapplied indefinitely.

### NFR-IUR-002 — Accessibility of the required signal

- **Category:** a11y
- **Target:** a required field is discoverable without relying on colour alone. The red `*` is a glyph, not only a colour, and the amber message carries a `warning` icon plus text.
- **How verified:** code review against the existing pattern. **Known gap:** the amber `--ac-warning-1` fails WCAG AA in both themes (light 2.09:1 / 2.25:1) — an accepted, user-owned exception inherited from `changes/innovation-use-validation-warning-color` (`RB-1`/`RB-5`). This spec **widens** that exception's surface and does not re-open it.

### NFR-IUR-003 — No change to draft-save permissiveness

- **Category:** reliability
- **Target:** every rule in this spec gates **submission**, not saving — **with one deliberate, named exception.** `R-IUR-014` / `design.md` `DD-8` blocks the save **client-side** for a row that would lose typed data. So a user may save an incomplete draft exactly as today *except* where saving would destroy what they typed. **This narrowing was added at Judgment Day round 2 (`S-6`)**: revision 2 recorded it only in `design.md` §6, leaving this requirement asserting the opposite.
- **How verified:** the API and its DTO validators are untouched, **and** a save of an incomplete row still returns `201`/`200` **for every case `DD-8` does not block**. The first half alone is not proof of the whole — it was cited as such in revision 2 and is exactly the half-proof this correction exists to remove.

---

## 7. Data Requirements

No schema change. One new migration replacing a stored function.

| Item | Detail |
| --- | --- |
| Migration | `src/db/migrations/<timestamp>-updateInnovationUseValidation.ts`, append-only |
| Function | `innovation_use_validation(result_code BIGINT) RETURNS tinyint(1)` |
| Tables read | `results`, `result_innovation_use`, `clarisa_innovation_use_levels`, `result_actors`, `result_institution_types`, `clarisa_institution_types`, `result_quantifications` |
| Discriminators | `actor_role_id = 2`, `institution_type_role_id = 2`, `quantification_role_id = 3` |
| Sub-type derivation | `clarisa_institution_types.parent_code` — confirmed present on the entity |
| Backfill | **none.** Existing rows are re-graded by the new rules, not migrated. See `RSK-2`. |

---

## 8. Cross-System Impact

| System | Impact |
| --- | --- |
| **STAR client** | 3 innovation-use files + 2 shared components |
| **Server** | 1 migration; no controller, service, DTO, or entity change |
| **Submit gate** | `result-status-workflow/function-handler.service` consumes the function's boolean; not modified |
| **OICR details** | Must be provably unchanged (`R-IUR-013`) |
| **CLARISA / OpenSearch / sockets / RabbitMQ** | none |

---

## 9. Assumptions, Dependencies, Risks

| ID | Item | Mitigation |
| --- | --- | --- |
| **ASM-1** | `0` is a meaningful reported value for every count field. Stated explicitly by the user. | — |
| **ASM-2** | Validation messages appear immediately, not after a save attempt — consistent with `Actor type` today. | `OQ-1` |
| **RSK-1** | **The submit gate becomes strictly weaker** (`R-IUR-011`). Results with no content at all become submittable. | User decision `D-1`; recorded here so it is visible to whoever owns Innovation Use reporting rather than buried in SQL. |
| **RSK-2** | **The submit gate also becomes strictly stronger** (`R-IUR-004`, `R-IUR-005`). Results that pass today — one of four counts filled, or a zero count — will stop passing, with no notice and no data migration. **The population is unmeasured.** | Size it with a `SELECT` against Dev **before** execution; `tasks.md` owns this as a task, not an afterthought. |
| **RSK-3** | The amber border can be inert (`DC-1`). Seven automated gates missed exactly this in the prior spec. | Mandatory `[style]` binding + human browser check. |
| **RSK-5** | **`buildPayload()` silently drops rows lacking an identity field.** With `R-IUR-011` removing the zero-actor backstop, a dropped row makes the result *valid*, so typed data is lost and submission is unblocked at the same time. Found in Phase 2. | `R-IUR-014` / `design.md` `DD-8` — block the save exactly when it would destroy typed data. |
| **RSK-4** | `app-input` is used by 18 templates, 15 of which this spec does not touch. The falsy-`0` check is **gated by `isRequired`**, which none of the five innovation-use count fields passes today — so the bug is **latent at these sites, not active**, and may or may not be active elsewhere. | Out of scope by design — opt-in change here, separate proposal for the audit (`OQ-3`). *(Corrected at Judgment Day round 1, findings `C-8`, `S-8`.)* |
| **DEP-1** | All three `innovation-use/family.md` chunks are `done` + archived. No blocking dependency. | — |

---

## 10. Open Questions

| ID | Question | Owner | Target |
| --- | --- | --- | --- |
| **OQ-1** | Immediate vs. deferred validation messages. Adding an actor row will paint up to 5 amber messages at once. `ASM-2` assumes immediate, for consistency with `Actor type`. Confirm at the Phase 1 gate. | D. Casañas | Phase 1 approval |
| **OQ-2** | Should `Specify other` (custom name for actor type `5` / organization type "other") also carry a red `*`? It is already enforced in the green check for actors but shows no asterisk — a pre-existing inconsistency this spec neither creates nor, currently, fixes. | D. Casañas | Phase 1 approval |
| **OQ-3** | Should the `app-input` falsy-`0` bug be audited across the other 15 templates? Recommended as a **separate** proposal. | D. Casañas | after this spec |
| **OQ-4** | Who applies the migration, and to which environments, and when relative to the code deploy? (`NFR-IUR-001`) | D. Casañas | before execution |

---

## 11. Requirement ID Index

| ID | Title | Surface | Defect classes |
| --- | --- | --- | --- |
| `R-IUR-001` | Conditional per-row validation | both | DC-3 |
| `R-IUR-002` | No auto-seeded actor row | client | — |
| `R-IUR-003` | One visual treatment | client | DC-1, DC-7 |
| `R-IUR-004` | Disaggregated: four counts, sum positive | both | DC-2, DC-3, DC-4 |
| `R-IUR-005` | Aggregate: count required and positive | both | DC-2, DC-3 |
| `R-IUR-006` | Known path: institution required | both | DC-3 |
| `R-IUR-007` | Unknown path: type required | both | DC-3 |
| `R-IUR-008` | Unknown path: sub-type conditional | both | DC-3 |
| `R-IUR-009` | Unknown path: count required and positive | both | DC-2, DC-3 |
| `R-IUR-010` | Measures: number + unit required | both | DC-2, DC-5 |
| `R-IUR-011` | Remove "at least one actor" | both | DC-4 |
| `R-IUR-012` | Green check parity | server | DC-3, DC-4, DC-6, DC-7 |
| `R-IUR-013` | Shared components opt-in | client | DC-5 |
| `R-IUR-014` | No silent data loss on save | client | DC-3 |
| `NFR-IUR-001` | Deployment safety | server | DC-6 |
| `NFR-IUR-002` | A11y of the required signal | client | — |
| `NFR-IUR-003` | Draft saves stay permissive | both | — |

---

## 12. Sign-off

- [ ] Engineering lead — D. Casañas
- [ ] MEL / product owner — **required for `RSK-1`** (the submit gate becomes weaker)
- [ ] Security review — not applicable (no auth or secrets touched)
- [ ] DevOps — **required for `NFR-IUR-001`** (migration apply step)
