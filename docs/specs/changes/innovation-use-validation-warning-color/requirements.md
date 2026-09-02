# Requirements — Changes / Innovation Use validation warning colour

- **Module:** client — `innovation-use-details` (STAR result page)
- **Spec id:** 2026-09-innovation-use-validation-warning-color
- **Status:** draft
- **Owner:** D. Casañas
- **Depth:** **Lite**
- **Linked PRD section:** constraint **C-4** (WCAG 2.1 AA) — see §8 `AR-1`
- **Linked design section:** [`docs/ux-ui/design.md`](../../../ux-ui/design.md) §7.1 (client tokens), §10 (accessibility)
- **Linked tickets:** —
- **Extends:** [`docs/specs/archive/2026-08-26-innovation-use--details-page`](../../archive/2026-08-26-innovation-use--details-page/) — amends its `DD-7` rationale, resolves its `OQ-IUP-4`
- **Source proposal:** [`proposal.md`](./proposal.md) (`DR-1`, `DR-2`, `DR-3`)
- **Last updated:** 2026-09-02

---

## 1. Context

The **Innovation use details** page renders two different validation styles at once. Fields drawn by the shared `custom-fields/` components (`app-input`, `app-textarea`) show the approved amber `#E69F00`; fields drawn by the page's own templates show `var(--ac-red-1)`. Both appear on the same card — the user's two screenshots are the same screen.

The red was deliberate: `DD-7` of the archived `innovation-use/details-page` spec banned hex literals, `#E69F00` had no token, so the author used the only token available for the role. This spec removes that dilemma by **registering the approved amber as a token**.

**Not changing:** the amber value itself (`DR-1`), validation *logic*, which fields are required, when messages appear, the red required-`*` asterisk, the red destructive buttons, and the 22 other client files that still hardcode `#E69F00` (`DR-2` — Option A).

---

## 2. Requirement numbering

`R-IUW-<NNN>` / `NFR-IUW-<NNN>`. IUW = **I**nnovation **U**se **W**arning.

---

## 3. Functional requirements

### R-IUW-001 — A registered warning-colour token exists

- **As a** STAR front-end developer
- **I want** the approved validation amber available as an `--ac-*` design token
- **So that** validation styling can be expressed without a hex literal, satisfying §7.1 and `DD-7` at the same time

**Details:**
- Value: **`#E69F00`**, unchanged (`DR-1`). Defined in `src/styles/colors.scss` in both the `:root` block and the `[data-theme='dark']` block.
- Semantic: *validation warnings / non-blocking field errors*. Distinct from `--ac-red-1` (*errors, destructive actions*) and `--ac-orange-1` (*Indicators 4–5*).
- Registered as a row in `docs/ux-ui/design.md` §7.1's authoritative token table.

**Acceptance criteria:**
- [ ] AC.1 — `colors.scss` defines the token as `#e69f00` under `:root`.
- [ ] AC.2 — `colors.scss` defines the token under `[data-theme='dark']`, also `#e69f00` (`OQ-3` default: today's hardcoded amber does not flip, so matching it preserves current rendering). **Rationale corrected 2026-09-02 (`RB-5`):** this criterion originally justified the dark value with *"it already clears AA on the dark surface at 6.29:1"*. That is true only on the dark card background; on dark `--ac-white-1` the amber is **worse** than in light mode. See §8 `AR-1` for the figures — the criterion's mechanical content (a `[data-theme='dark']` definition exists at `#e69f00`) is unaffected and still holds; only its stated reason was wrong.
- [ ] AC.3 — `docs/ux-ui/design.md` §7.1 lists the token with its use, in the same table format as the existing families.
- [ ] AC.4 — Both definitions use the identical value; a diff of the two blocks shows no variance.

**Out of scope:** adding `.abc-*` / `.atc-*` utility classes via the `$colors` map (only if a call site needs one).

---

### R-IUW-002 — Inline field validation on Innovation use renders in the warning token

- **As a** result submitter completing the Innovation use section
- **I want** every required-field error to look the same as everywhere else in STAR
- **So that** I read one consistent signal instead of guessing whether red and amber mean different things

**Details — the governing rule.** Colour follows *scope of the message*, not merely "is it red today":

| Class | Treatment | Sites |
| --- | --- | --- |
| **Client-side field validation** — the page's own required/duplicate checks on one control | **warning token** | 8 (below) |
| **Server-returned error** — any message sourced from `saveErrors()`, field-scoped or not | `--ac-red-1` (unchanged) | 3 |
| **Section-level failure** — `loadFailed()` banner | `--ac-red-1` (unchanged) | 2 |
| **Required `*` marker** | `text-red-500` (unchanged) | 2 |
| **Destructive action** | `--ac-red-1` (unchanged) | 2 |

**The 8 sites that change:**

| File | Line | Trigger | Background |
| --- | --- | --- | --- |
| `innovation-use-details.component.html` | 107 | justification required message | `--ac-white-1` |
| | 147 | "At least one actor is required" | `--ac-white-1` |
| `innovation-use-actor-item.component.html` | 3 | `#requiredMessage` template | `--ac-grey-100` |
| | 34 | invalid `p-select` border | `--ac-grey-100` |
| | 41 | duplicate-actor-type message | `--ac-grey-100` |
| | 52 | invalid "Specify other" input border | `--ac-grey-100` |
| `innovation-use-organization-item.component.html` | 3 | `#requiredMessage` template | `--ac-grey-100` |
| `innovation-use-level-stepper.component.html` | 4 | required message | `--ac-white-1` |

> **`details:114` was moved OUT of this list by the Step 2.3 reversion challenge.** `justificationError()` (`innovation-use-details.component.ts:283`) and `unaddressedSaveErrors()` (`:296`) are **complementary filters over the same `saveErrors()` array** — one includes `innovation_use_level_explanation`, the other excludes it, both fed by a single `saveErrors.set(...)` at `:599`. A save that returns both a justification error and an actor-row error would render **one server error list in two colours at once**, with byte-identical markup. Keeping every `saveErrors()`-sourced message red removes that split by construction.

**Acceptance criteria:**
- [ ] AC.1 — All 8 sites reference the warning token; a grep for `ac-red-1` across them returns 0.
- [ ] AC.2 — Each changed site keeps its existing `material-symbols-rounded warning` icon, text, spacing and layout — **colour is the only delta**.
- [ ] AC.3 — Border sites (`actor:34`, `actor:52`) keep `border-2`; only the colour token changes.
- [ ] AC.4 — No hex colour literal is introduced into any of the 4 templates.

#### Scenario: A required actor type is left empty

- GIVEN an Innovation use result in an editable status with an actor card whose **Actor type** is unset
- WHEN the page renders the card's validation state
- THEN the select's 2px border and the "This field is required" message both render in the warning token
- AND the message keeps its `warning` icon and its `fs-[14]` text size
- BUT it must NOT change the red colour of the `Actor type*` asterisk
- BUT it must NOT change the red colour of the card's remove (`pi-times-circle`) button
- AND IT MUST resolve to a defined CSS custom property — a token name that does not exist in `colors.scss` renders the inherited colour silently, with no error

#### Scenario: The section fails to load

- GIVEN the Innovation use section request fails (`loadFailed()` is true)
- WHEN the failure banner renders
- THEN its border and icon remain `var(--ac-red-1)`
- AND IT MUST stay red because §7.1 assigns red to *errors*, and this message is a section-level failure, not field validation

#### Scenario: The server rejects the save with unaddressed errors

- GIVEN a save returns errors that map to no field on the page (`unaddressedSaveErrors()`)
- WHEN the aggregate error block renders (`details:247`, `:249`)
- THEN its border and messages remain `var(--ac-red-1)`
- AND IT MUST render `justificationError()` at `:114` in the same red, because both are filters over one `saveErrors()` array and any other choice paints one list in two colours
- BUT it must NOT be inferred that field-scoped means amber — the discriminator is **source** (client check vs server response), not proximity to a control

---

## 4. Non-functional requirements

### NFR-IUW-001 — Token discipline

- **Category:** dx / compliance
- **Target:** zero hex colour literals introduced into the 4 touched templates (`DD-7`, `docs/ux-ui/design.md` §7.1 *"do not hard-code hex values"*).
- **How verified:** `grep -nE '#[0-9a-fA-F]{3,8}' <the 4 templates>` returns no colour literal.

### NFR-IUW-002 — Visual parity with the shipped pattern

- **Category:** a11y / ux
- **Target:** the rendered treatment is indistinguishable from `app-textarea`'s (`textarea.component.html:35,43`) — same amber, same icon, same 2px border weight.
- **How verified:** **human side-by-side check at the HITL pause.** No automated substitute exists (see §6).

---

## 5. Data requirements

None. No schema, DTO, endpoint, or persisted value changes. **Server impact: none.**

---

## 6. Defect classes and their gates

| # | Defect class this spec can produce | Gate | Can it actually fail? |
| --- | --- | --- | --- |
| D-1 | A site is missed and stays red | `grep -c 'ac-red-1'` over the 8 sites = 0 | ✅ leave one unchanged → non-zero |
| D-2 | A site that should stay red is changed (asterisk, delete button, load banner, save-error block) | grep asserts `ac-red-1` still present at the 4 red sites + `text-red-500` at the 2 asterisks | ✅ over-apply → count drops |
| D-3 | **Token name typo** — `var(--ac-warning-1)` misspelled at a call site. CSS custom properties fail **silently**: the element renders the inherited colour with no console error and no build error | **cross-check:** every `--ac-*` token referenced in the 4 templates must exist in `colors.scss` | ✅ introduce a typo → the name is absent from `colors.scss` |
| D-4 | A hex literal is inlined instead of the token | `NFR-IUW-001`'s grep | ✅ inline `#E69F00` → grep hits |
| D-5 | Existing behavior regressed (messages stop appearing, wrong field) | `npx jest --testPathPattern innovation-use` (baseline **230/230**) | ✅ break a conditional → suite reddens |
| D-6 | **The rendered colour is wrong or the layout shifted** | ❌ **no automated gate.** jsdom has no layout engine and no computed colour; the repo has no visual/a11y gate (`AR-2`) | **Substitute:** mandatory human visual check at the HITL pause, side-by-side against the `Justification` field on the same page |
| D-7 | **The route's own WCAG harness silently stops covering the surface it was built to cover** | `innovation-use-details.component.spec.ts:2284` — the **R3** block asserts `>= 4.5:1` for every text role in the section | ✅ it already fails on four falsifying inputs at `:2480–2502`. See `AR-1` — this spec must either add the validation role and record an exception, or knowingly reopen the gap R3 exists to close |

> **D-6 is this spec's dominant defect class** and it has no command. `npm test` and a grep both pass over a page that renders wrong. The gate is a person looking at the screen — stated here so it is not quietly skipped. Per **KZ-001**, the class assertions in D-1/D-2/D-3 are **presence assertions**: they prove the token *name* reached the markup, never that the pixel is amber.

---

## 7. Cross-system impact

| Surface | Impact |
| --- | --- |
| Server | **none** |
| Client — other pages | **none** in Option A; the 22 files keeping `#E69F00` render the identical colour |
| Design system | first new colour family in §7.1 since the Pool Funding tokens; adopted app-wide in the Option B follow-up |
| Dark mode | token flips like every `--ac-*`, but PrimeNG chrome still does not (§7.1 correction; out of scope) |

---

## 8. Assumptions, dependencies, risks

| # | Item | Status |
| --- | --- | --- |
| **AR-1** | **Accepted deviation — contrast, in BOTH themes, and it collides with the route's own test harness.** **This row is the single home of this spec's measured contrast figures (`KZ-005`); every other document points here rather than restating them.** *Deriving method: WCAG 2.1 relative-luminance / contrast-ratio formula over the token values in `client/research-indicators/src/styles/colors.scss`, sanity-checked against WCAG's canonical `#767676` on white = 4.54:1 and black-on-white = 21.00. Independently derived three times (Leader, Implementer, Reviewer) on 2026-09-02 during `T-03`; all three agree.* <br><br> **Light mode** — `#E69F00` is **2.25:1** on `--ac-white-1` `#fff` (sites `details:107,147`, `stepper:4`) and **2.09:1** on `--ac-grey-100` `#f4f7f9` (sites `actor:3,34,41,52`, `org:3`), against the **4.5:1** design.md §10 / PRD **C-4** require for text — and below the **3:1** SC 1.4.11 asks of the two border sites. `--ac-red-1` passed at **5.69:1 / 5.29:1**. <br><br> **Dark mode — CORRECTED 2026-09-02 (`T-03` Pivot Record, `RB-5`).** This row previously read *"Dark mode passes at 6.29:1; the failure is light-mode only."* **That was true for 5 of the 8 sites and false for the other 3**, and the corrected reading is: the amber (identical in both themes per `DD-5`) measures **6.29:1** on dark `--ac-grey-100` `#2b2b2b` — passing AA, the 5 card sites — but only **≈1.79:1** on dark `--ac-white-1` `#e5e5e5`, which is **worse than light mode's 2.25:1**, for `details:107`, `details:147` and `stepper:4`. Those three sit inside cards at `innovation-use-details.component.html:12` / `:124`, verified in the markup rather than inferred from the site table. **So the deviation is not light-mode-only: it is present in both themes and is at its worst in dark mode.** <br><br> **New in Step 2.3:** `innovation-use-details.component.spec.ts:2284` is a live WCAG instrument built as remediation for a validation-report finding that it *"was aimed at a quarter of the surface"* — it asserts `>= 4.5:1` across the section's text roles. The validation role is not in it yet, so nothing reddens; adding amber means either adding the role **with a documented exception** or leaving the gap R3 exists to close. | **Deviation accepted** per `DR-1`; **the harness consequence is a new decision** raised at the Phase 2 gate. Recommended: add the validation role to R3 with an explicit, cited exception, so the deviation is executable and visible rather than an omission. The deviation is pre-existing and app-wide (22 files) — Innovation use was the outlier, not the standard — and fixing the colour is a design-system decision over every STAR form. **A follow-up design-system ticket is owed, and per the 2026-09-02 correction it must cover BOTH themes, not only light mode.** `DD-17` is precedent that this project treats reachable light-theme contrast failures as blocking; this is taken knowingly against it. <br><br> **Disposition of the dark-mode correction (user decision, 2026-09-02):** option **A** — correct the documents, keep the token value and the scope. The ≈1.79:1 dark reading ships **knowingly and recorded**; the amber is not lightened (`DD-5` stands, its rationale corrected) and R3 is not extended to dark mode in this spec. **Residual, accepted with eyes open:** because every constant in the R3 block is a light-theme value, **no assertion in this repo can redden on the dark-mode deviation** — it is documented but undetectable, which is the `D-7` gap reopened on the dark axis. Carried by `RB-5` and the owed design-system ticket. |
| A-1 | Tailwind arbitrary values resolve `var(--ac-warning-1)` like the existing `var(--ac-red-1)` | **Verified, not assumed.** Tailwind is a runtime browser CDN JIT (`src/index.html:12–15`, `@tailwindcss/browser@4.1.6`) with no `tailwind.config.*` in the repo, so classes are generated from observed DOM — including the two interpolated ones. The remote `colors.css` (`index.html:9`) was fetched: **HTTP 200, 867 bytes, `:root` custom properties only in a separate `--<name>` namespace, zero utility-class rules, no mention of `--ac-red-1`**. It therefore cannot be the source of the existing red classes, and a new arbitrary value carries no extra risk |
| A-2 | Engineering-lead formal sign-off on a §7.1 token addition, if process requires it | **Owed** (`DR-3`) |
| D-1 | No dependency on any other spec | — |

---

## 9. Open questions

| # | Question | Blocking? | Default |
| --- | --- | --- | --- |
| OQ-1 | Token name: `--ac-warning-1`? | No | Yes — matches the `--ac-red-1` / `--ac-orange-1` single-value convention |
| ~~OQ-2~~ | ~~Classification of `actor:41` and `details:114`~~ | **Resolved** | Step 2.3 split them: `actor:41` is a **client-side** check → amber; `details:114` is **server-sourced** and shares one array with `:249` → stays red |
| **OQ-3** | **Dark-mode value — REOPENED 2026-09-02, then accepted for now (`RB-5`)** | No — accepted, not blocking | `#E69F00`, same as light. The original default cited *"already passes AA on dark"*; **that reason was wrong for the 3 sites on `--ac-white-1`** (see §8 `AR-1` for the corrected figures). Re-decided by the user on 2026-09-02 as **option A**: keep the value, correct the record, and hand the colour question to the owed design-system ticket — which is where a change to a brand value belongs, not here (`DR-1`). The question is *answered*, not *settled by measurement* |
| **OQ-4** | **How does the R3 harness (`spec.ts:2284`) absorb the validation role?** | **Decide at the Phase 2 gate** | Add the role with a documented, cited exception rather than omitting it — see `AR-1`, `D-7` |

---

## 10. Requirement ID index

| ID | Title | Tasks |
| --- | --- | --- |
| R-IUW-001 | A registered warning-colour token exists | T-01 |
| R-IUW-002 | Inline field validation renders in the warning token | T-02, T-03 |
| NFR-IUW-001 | Token discipline (zero hex literals) | T-02 |
| NFR-IUW-002 | Visual parity with the shipped pattern | T-03 |
