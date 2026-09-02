# Design — Changes / Innovation Use validation warning colour

- **Module:** client — `innovation-use-details`
- **Spec id:** 2026-09-innovation-use-validation-warning-color
- **Status:** draft
- **Depth:** **Lite**
- **Requirements:** [`requirements.md`](./requirements.md) — `R-IUW-001`, `R-IUW-002`, `NFR-IUW-001`, `NFR-IUW-002`
- **Proposal:** [`proposal.md`](./proposal.md) — `DR-1` (value fixed), `DR-2` (Option A), `DR-3` (token approved)
- **Last updated:** 2026-09-02

---

## 1. Goals & non-goals

| | |
| --- | --- |
| **Goal** | Express Innovation use's inline field validation through a registered `--ac-*` token carrying the approved amber, so §7.1's no-hex rule and the app's validation convention hold simultaneously |
| **Non-goal** | Changing the amber value (`DR-1`) · migrating the other 22 files (`DR-2`) · touching validation logic, timing, or required-ness · fixing the light-mode contrast deviation (`AR-1`) · fixing the PrimeNG dark-mode selector gap |

**No architecture change.** This is a two-layer edit: one token definition, nine call sites.

---

## 2. Architecture

### 2.1 Composition

```
src/styles/colors.scss                 ← DD-1: token definition (light + dark)
        │  --ac-warning-1: #e69f00
        ▼
docs/ux-ui/design.md §7.1              ← DD-2: registered in the authoritative table
        │
        ▼
innovation-use-details/                ← DD-3: 8 call sites swap the token name
  ├── innovation-use-details.component.html            (2 sites: 107, 147)
  ├── components/innovation-use-actor-item/…html       (4 sites: 3, 34, 41, 52)
  ├── components/innovation-use-organization-item/…html (1 site: 3)
  └── components/innovation-use-level-stepper/…html    (1 site: 4)
```

### 2.2 Reuse

The target treatment already ships in `shared/components/custom-fields/textarea/textarea.component.html:35,43` (2px border + `material-symbols-rounded warning` icon + `fs-[14]`/`text-sm` message). **Nothing is re-authored** — only the colour reference at the 9 existing sites changes. Markup, icon, spacing, and conditionals are untouched.

---

## 3. Data model

None. No schema, DTO, entity, migration, or persisted value. **Server impact: none.**

---

## 4. API surface

None.

---

## 5. Frontend design

### 5.1 Token definition (`R-IUW-001`)

`src/styles/colors.scss` gains one variable in each theme block, placed beside `--ac-red-1` in both:

| Block | Line region today | Addition |
| --- | --- | --- |
| `:root` | `--ac-red-1: #cf0808;` at :47 | `--ac-warning-1: #e69f00;` |
| `[data-theme='dark']` | `--ac-red-1: #ff4d4d;` at ~:154 | `--ac-warning-1: #e69f00;` — **same value** (`DD-5`) |

The `$colors` SCSS map (which drives the `.abc-*` / `.atc-*` mixin) is **not** extended — no call site needs a utility class; all 8 sites use Tailwind arbitrary values. Adding it would generate two unused classes.

### 5.2 Call-site transformation (`R-IUW-002`)

A pure token-name substitution at 8 sites. Two shapes exist:

| Shape | Sites | Transformation |
| --- | --- | --- |
| Static class attribute | `details:107,147` · `actor:3,41` · `org:3` · `stepper:4` | `text-[var(--ac-red-1)]` → `text-[var(--ac-warning-1)]` — **6 sites, delivered in `T-02` and verified rendering by AC.10** |
| ~~Interpolated class string~~ **→ `[style]` object binding** | `actor:34`, `actor:52` | **REVISED 2026-09-02 (Pivot, `DD-10`).** Originally specified as `border-[var(--ac-red-1)]` → `border-[var(--ac-warning-1)]` inside `{{ cond ? '…' : '' }}`. That class is **inert on a PrimeNG element** and always was — the red never rendered either. The border must move to an inline style: <br> `actor:34` → `[style]="actorTypeMissing \|\| duplicateType ? { border: '2px solid var(--ac-warning-1)' } : {}"` <br> `actor:52` → `[style]="otherNameMissing ? { border: '2px solid var(--ac-warning-1)' } : {}"` <br> and the now-dead `border-2 rounded-md border-[var(--ac-warning-1)]` fragments come **out** of the `class` interpolation. Owned by **`T-04`** |

**The interpolated pair was correctly identified as the higher-risk shape — and the risk was
mis-diagnosed.** `DD-4` treated the danger as *"will the JIT generate a class from an interpolated
string?"* (it does, reliably). The actual danger was that the class would be generated **and lose the
cascade**, which no amount of interpolation analysis would have surfaced. See `DD-10`.

**Why this was invisible for so long:** the two sites sit beside six that work, carry a token name that
exists, and satisfy every grep and class assertion in the spec. Only a human looking at the screen could
separate *"the token reached the attribute"* from *"the token reached the pixel"*.

### 5.3 Sites that deliberately keep `--ac-red-1`

| Site | Class |
| --- | --- |
| `details:6,7` | section load-failure banner — **error**, not field validation |
| `details:114` | `justificationError()` — **server-sourced**; shares one `saveErrors()` array with `:249` (`DD-8`) |
| `details:247,249` | unaddressed server save-errors block — **error**, not attached to a control |
| `actor:16`, `org:16` | destructive remove buttons |
| `details:15`, `actor:25` | required `*` markers (`text-red-500`) |

This is the rule stated in `R-IUW-002`, sharpened by `DD-8`: **amber = the page's own client-side field checks; red = anything sourced from the server response, section-level failure, destructive action, required marker.** The discriminator is the message's **source**, not its proximity to a control.

---

## 6. Testing strategy

> **⚠️ Read this table with the 2026-09-02 Pivot in mind.** Its right-hand column was accurate and it was
> still not heeded strongly enough: AC.10 found that at `actor:34` / `actor:52` the class assertions were
> passing over a border that **never rendered in any colour**. The distinction the table draws between
> *"the token name reached the markup"* and *"the rendered pixel"* turned out to be the whole defect, not
> a footnote. `DD-10`'s `[style]` fix is materially more testable — see the new row below.

| Layer | What it proves | What it cannot prove |
| --- | --- | --- |
| Jest class assertions | the token **name** reached the markup (`D-1`, `D-2`) | that the rendered pixel is amber — **and, as `D-8` now records, not even that any rule applies at all** |
| **Inline-style assertions** (new, `DD-10`) | that the border is set as an **inline style**, which outranks every stylesheet rule layered or not — so a passing assertion here does imply the border paints. `element.style.border` is a real, readable string **in jsdom** | the exact composited colour (antialiasing, OS colour management) — but the cascade question, which is what actually failed, becomes decidable |
| Token cross-check (`D-3`) | every `--ac-*` referenced in the 4 templates exists in `colors.scss` — catches the **silent** typo | — |
| Hex grep (`NFR-IUW-001`) | no literal was inlined | — |
| Full route suite | no behavioral regression (baseline **230/230**) | — |
| **Human visual check** | the actual colour and layout (`D-6`, `NFR-IUW-002`) | — |

**`D-6` has no automated gate** and is this spec's dominant defect class (see `requirements.md` §6). jsdom has no layout engine or computed colour, and the repo has no visual/a11y gate (`AR-2`). The substitute is a person comparing an invalid actor card against the `Justification` field **on the same screen** — a uniquely cheap check here, because the reference and the subject render together.

---

## 7. Design decisions log

| ID | Decision | Rationale |
| --- | --- | --- |
| **DD-1** | Add `--ac-warning-1` rather than reuse `--ac-orange-1` | §7.1 binds `--ac-orange-1` to *Indicators 4–5* (branding). The archived spec's Reviewer already ruled reusing it would be the misuse (`execution.md:421`). A distinct semantic needs a distinct token |
| **DD-2** | Register in `docs/ux-ui/design.md` §7.1 in the **same change** | Resolves `OQ-IUP-4` in the direction that question recorded as its own default. An unregistered token in `colors.scss` is the drift the constitution forbids |
| **DD-3** | Amber applies to **inline field validation only**; section/page errors stay red | Discovered during requirements: 4 of the 13 red sites are `loadFailed()` and `unaddressedSaveErrors()` — genuine *errors*, which §7.1 assigns to red. Scoping by message **semantics** rather than by "is it red today" both honours §7.1 and matches the user's ask ("campos requeridos") |
| ~~**DD-4**~~ | ~~The Tailwind risk is **closed, not deferred**~~ — **❌ FALSIFIED 2026-09-02 by AC.10's human check. Superseded by `DD-10`.** | The original rationale is preserved for the record: *"Tailwind here is a runtime browser CDN JIT (`index.html:12–15`), not a build-time config — there is no `tailwind.config.*` in the repo. It generates from observed DOM, so the two interpolated strings (`actor:34,52`) are as safe as static ones. The residual worry — that the remote `colors.css` (`index.html:9`) hand-defines the red utility, which would leave the amber class with no rule at all — was settled by fetching it: HTTP 200, 867 bytes, `:root` variables only in a separate `--<name>` namespace, zero utility rules, no `--ac-red-1`."* <br><br> **Every factual statement in that rationale is true. The conclusion is still wrong.** `DD-4` asked *"will the class be generated?"* and answered it thoroughly — it even fetched a remote stylesheet to rule out interference. The question that decided the outcome was *"will the class win the cascade?"*, and it was never asked. **`KZ-017` in the design phase: a verification narrower than the claim it backed, returning a confident green.** See `DD-10` for the mechanism and `execution.md` → *Pivot Record: T-02 / T-03* for the evidence |
| **DD-10** | **Colour a PrimeNG element's border with an Angular `[style]` object binding — never with a Tailwind utility class** (supersedes `DD-4`) | PrimeNG injects its own `.p-select { border: 1px solid … }` / `.p-inputtext { border: 1px solid … }` (`primeng-select.mjs:28`, `primeng-inputtext.mjs:17`) **unlayered** — `app.config.ts:29–36` calls `providePrimeNG` without `theme.options.cssLayer`, which defaults to `false`. Tailwind v4 emits **every** utility inside `@layer utilities`, and per the CSS Cascade Layers spec **unlayered author CSS unconditionally beats layered author CSS** for the same property on the same element, irrespective of specificity or source order. A Tailwind `border-*` class on a PrimeNG element is therefore **structurally inert** — generated, correctly placed, and overridden. It cannot be rescued by ordering or specificity. <br><br> An `[style]` object binding is applied by Angular as a real inline style (`Renderer2.setStyle`), and **inline style outranks every stylesheet rule, layered or not**. This is already the codebase's own pattern: `custom-fields/select/select.component.html:20` and `multiselect.component.html:20`. <br><br> **One deliberate divergence from that exemplar:** it hardcodes `'2px solid #E69F00'`. This spec uses `var(--ac-warning-1)` instead — identical rendering, and it keeps `NFR-IUW-001` / `DD-7`. Following the exemplar literally would have re-introduced the hex literal this whole spec exists to remove. <br><br> **Scope note:** where the painted node is a *descendant* PrimeNG does not expose to a host-level `[style]` (e.g. `p-radioButton`'s `.p-radiobutton-box`), the codebase's fallback is component SCSS with `::ng-deep` + `!important` (`radio-button.component.scss:12–17`). Not needed at either site here — both paint on their own element |
| **DD-8** | **`details:114` stays red** — it is not field validation, it is a server error that happens to name a field | `justificationError()` (`…component.ts:283`) and `unaddressedSaveErrors()` (`:296`) are complementary filters over the **same** `saveErrors()` array (single `set` at `:599`). Colouring one amber and the other red paints one server error list in two colours in a single reachable state — a failed save carrying both a justification error and an actor-row error. Raised by the Step 2.3 challenge; **this is the finding that took the change from 9 sites to 8** |
| **DD-9** | The R3 WCAG harness (`spec.ts:2284`) **gains the validation role with a documented exception**, rather than omitting it | R3 exists because a validation report found the earlier instrument *"was aimed at a quarter of the surface"*. Leaving the new role out would recreate exactly that gap, and silently. Recording the deviation as an executable, cited exception keeps the harness honest about what it covers. New assertions must use decimal RGB triples — the file's own zero-hex grep bans a literal hex anywhere, comments included (`:1997–2000`) |
| **DD-5** | Dark-mode value is `#e69f00`, identical to light — no lightening. **Rule unchanged; rationale CORRECTED 2026-09-02 (`T-03` Pivot Record, `RB-5`)** | Today the amber is hardcoded and therefore does not flip; matching that keeps Innovation use identical to the 22 unmigrated files in dark mode — **this half of the rationale stands and is the load-bearing half.** <br><br> ~~*It also needs no lightening: measured 6.29:1 on the dark card, comfortably AA*~~ — **withdrawn.** That measurement was taken only against the dark **card** background and does not generalise: 3 of the 8 sites sit on `--ac-white-1`, where the amber is *worse* in dark mode than in light. See `requirements.md` §8 `AR-1` — the single home of this spec's contrast figures (`KZ-005`); deliberately not restated here. <br><br> So the decision now rests on **consistency with the 22 unmigrated files plus `DR-1`'s authority limit** (the amber is a fixed brand value this change cannot re-decide), **not** on a claim that dark mode is compliant. The user re-decided this knowingly on 2026-09-02 as option **A**. Lightening the dark value only was offered and **declined** — it would have made Innovation use diverge from every other STAR form in dark mode, which is the exact divergence this row exists to prevent |
| **DD-6** | Do **not** extend the `$colors` map | No call site needs `.abc-*` / `.atc-*`; the mixin would emit two dead classes |
| **DD-7-rev** | **Amends the archived `DD-7`'s rationale, not its rule.** `#E69F00` stays banned as a *hex literal*; the warning **role** now has a token | The archived rule was right and is preserved. Its *consequence* — that the page must therefore use red — dissolves once the token exists |

### Step 2.3 — Reversion challenge

`DD-3` reverts already-delivered, test-covered, visible behavior, so the challenge was run (not skipped despite Lite depth).

**Outcome: the challenge found real breakage and changed the design.** Three results, each re-verified independently before acceptance:

| # | Finding | Disposition |
| --- | --- | --- |
| 1 | **`:114` and `:249` are complementary filters over one `saveErrors()` array** — colouring them differently paints one error list in two colours in a reachable state | **Accepted → `DD-8`.** Scope drops 9 → 8 sites. This is the challenge paying for itself |
| 2 | **The route already carries a live WCAG instrument** (`spec.ts:2284`, the R3 block) asserting `>= 4.5:1` for the section's text roles, built as remediation for a finding that it covered too little. The validation role is absent from it, so the amber ships without reddening anything | **Accepted → `DD-9` + `AR-1`.** Raised to the user at the Phase 2 gate: it converts an abstract deviation into a concrete choice about this page's own harness |
| 3 | **Tailwind arbitrary-value generation** flagged as an unresolved RISK, because the remote `colors.css` could not be fetched by the reviewer | **Resolved by the Leader → `DD-4`.** Fetched: 867 bytes, no utility rules. **SAFE** |

**Two reviewer claims were corrected before use** (`KZ-007` — verify a correction against its source):

- **Contrast figures.** The reviewer reported `2.10:1` on white / `1.95:1` on grey-100. Re-computed with sanity checks (black-on-white = `21.00`, WCAG's canonical `#767676` = `4.54`): the correct values are **`2.25:1`** and **`2.09:1`**. The reviewer's red figures (5.69 / 5.29) were right, so the slip was amber-specific. **The conclusion is unchanged — both fail AA by a wide margin — but the spec carries the verified numbers.**
- **Dark-mode token.** The reviewer warned the token would be *"the only `:root` token with no `[data-theme='dark']` counterpart."* `DD-5` already gives it one; the counterpart simply holds the same value. Not a defect.

The reviewer's per-site background mapping **was** correct and is adopted: `details:107,147` and `stepper:4` sit on `--ac-white-1`, the actor/organization cards on `--ac-grey-100`. `AR-1` now records both figures.

**One argument *for* the change surfaced that the design had left implicit and now claims:** the justification field **already** renders "This field is required" in amber (from the shared `app-textarea`) when truly empty and in red (from `details:107`) when whitespace-only — the same string, on the same field, in two colours, mutually exclusive by construction. `DD-3` fixes that pair.

---

## 8. Budget (Step 2.4 tripwire)

| Metric | Expected |
| --- | --- |
| Tasks | **3** |
| LOC | **~40** (2 token lines + 1 doc row + 8 template lines + 1 updated assertion + ~25 lines for the `DD-9` R3 role with its cited exception) |
| Review rounds | **1** |

Depth re-checked against the finished design: **Lite is correct.** It sits above `/akili-quick` (a shared stylesheet and the authoritative token table are touched, and the escalation from `/akili-quick` was on exactly those grounds) and well below Standard. `/akili-execute` should stop and escalate if actuals exceed these numbers.

---

## 9. Open questions

Carried from `requirements.md` §9 — `OQ-1` (token name), `OQ-2` (classification of `actor:41` / `details:114`, defaulted to amber and confirmed at the Phase 1 gate), `OQ-3` (dark value). None blocking.

**`OQ-3` correction, 2026-09-02.** This section previously recorded `OQ-3` as *"settled by `DD-5`"*. It was not settled by measurement — `DD-5`'s measurement covered only the dark card background, and the question **reopened during `T-03`** when the 3 sites on `--ac-white-1` were found to measure **worse in dark mode than in light** (figures: `requirements.md` §8 `AR-1`). It is now **answered by user decision** (option A: keep the value, correct the record, hand the colour to the owed design-system ticket) rather than closed by evidence. The distinction matters for anyone re-reading this spec: `OQ-3` is an accepted deviation, not a cleared check. Figures live in `requirements.md` §8 `AR-1`; audit trail in `execution.md` → *Pivot Record: T-03*; risk row `tasks.md` §5 `RB-5`.

---

## 10. References

- [`requirements.md`](./requirements.md) · [`proposal.md`](./proposal.md)
- [`docs/ux-ui/design.md`](../../../ux-ui/design.md) §7.1, §10
- [`docs/specs/archive/2026-08-26-innovation-use--details-page`](../../archive/2026-08-26-innovation-use--details-page/) — `DD-7`, `DD-17`, `OQ-IUP-4`, `execution.md:421`
- Reference implementation: `client/research-indicators/src/app/shared/components/custom-fields/textarea/textarea.component.html:35,43`
