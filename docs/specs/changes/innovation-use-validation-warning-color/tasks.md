# Tasks — Changes / Innovation Use validation warning colour

- **Module:** client — `innovation-use-details`
- **Spec id:** 2026-09-innovation-use-validation-warning-color
- **Status:** in-progress — 4 tasks (T-04 added by the 2026-09-02 Pivot)
- **Owner:** D. Casañas
- **Depth:** Lite
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked design:** [`./design.md`](./design.md)
- **Budget (design.md §8):** 3 tasks · ~40 LOC · 1 review round — `/akili-execute` escalates if exceeded
- **Last updated:** 2026-09-02

---

## 1. Dependency graph

```
T-01 (token + §7.1 registration)
   └──> T-02 (8 call sites)
           └──> T-03 (assertions + R3 role + human visual check)
                   └──> T-04 (Pivot: the 2 border sites never rendered — [style] fix + assertions + re-verify AC.10)
```

**`T-04` was added 2026-09-02 by the Pivot** (`RB-6`, `DD-10`), after `T-03`'s AC.10 human check found the
two border sites render no border in any colour. It is not new scope: it delivers `R-IUW-002` scenario 1's
THEN clause (*"the select's 2px border … render[s] in the warning token"*), which `T-02` was believed to
have delivered and had not.

Strictly sequential. `T-02` cannot resolve a token `T-01` has not defined; `T-03`'s site list is derived from `T-02`'s failing suite (**K-018**).

---

## 2. Task list

### T-01 — Define `--ac-warning-1` and register it in §7.1

- **Requirements covered:** `R-IUW-001` (AC.1–AC.4)
- **Design refs:** `§5.1`, `DD-1`, `DD-2`, `DD-5`, `DD-6`
- **Files touched (intended):**
  - `client/research-indicators/src/styles/colors.scss`
  - `docs/ux-ui/design.md` (§7.1 token table)
- **Description:** Add the approved validation amber as a first-class token in both theme blocks, and register it in the authoritative token table in the same change (`DD-2` — `DD-7`'s own clause requires the registration to accompany the definition).
- **Implementation notes:**
  - Place `--ac-warning-1: #e69f00;` beside `--ac-red-1` in the `:root` block (near `colors.scss:47`).
  - Place the **identical value** beside `--ac-red-1` in `[data-theme='dark']` (near `:154`) — `DD-5`. Do **not** lighten it.
  - Do **not** add a `$colors` map entry — `DD-6`.
  - §7.1 row wording: `| Warning | \`--ac-warning-1\` | Validation warnings, non-blocking field errors |`.
- **Acceptance / done check:**
  - [x] AC.1 — `grep -n 'ac-warning-1' src/styles/colors.scss` returns a `:root` hit with `#e69f00`.
  - [x] AC.2 — the same grep returns a `[data-theme='dark']` hit.
  - [x] AC.3 — the two hits carry the identical value (`AC.4`).
  - [x] AC.4 — `docs/ux-ui/design.md` §7.1 lists the token in the same table format as the existing families.
  - [x] AC.5 — `$colors` map is unchanged (`DD-6`): `git diff` shows no map edit.
- **Verification:** `grep -n 'ac-warning-1' client/research-indicators/src/styles/colors.scss docs/ux-ui/design.md`
- **Input that makes this FAIL (K-012):** define the token only under `:root` → the dark grep returns nothing → AC.2 red.
- **What this cannot prove:** that any component uses the token, or that it renders. Presence only (`KZ-001`).
- **Dependencies:** none
- **Effort:** S
- **Skills:** `ui-ux-pro-max`
- **Status:** done

---

### T-02 — Swap the 8 client-side validation sites to the warning token

- **Requirements covered:** `R-IUW-002` (AC.1–AC.4), `NFR-IUW-001`
- **Design refs:** `§5.2`, `§5.3`, `DD-3`, `DD-4`, `DD-8`
- **Files touched (intended):**
  - `…/innovation-use-details/innovation-use-details.component.html` (2 sites: `107`, `147`)
  - `…/components/innovation-use-actor-item/innovation-use-actor-item.component.html` (4 sites: `3`, `34`, `41`, `52`)
  - `…/components/innovation-use-organization-item/innovation-use-organization-item.component.html` (1 site: `3`)
  - `…/components/innovation-use-level-stepper/innovation-use-level-stepper.component.html` (1 site: `4`)
- **Description:** Replace `var(--ac-red-1)` with `var(--ac-warning-1)` at exactly the 8 client-side field-validation sites. Colour is the only delta — markup, icon, text, spacing, border width and conditionals are untouched.
- **Implementation notes:**
  - Static attributes (`details:107,147` · `actor:3,41` · `org:3` · `stepper:4`): `text-[var(--ac-red-1)]` → `text-[var(--ac-warning-1)]`.
  - ~~Interpolated class strings (`actor:34`, `actor:52`): swap **only** the token inside `{{ … }}`; keep `border-2` and the surrounding ternary intact.~~ **← SUPERSEDED by `T-04` (`RB-6`, `DD-10`).** This instruction was carried out exactly and produced an inert class. Kept struck-through, not deleted, because `T-02`'s commit implemented it and the audit trail must explain what that commit did. **`T-04` removes these fragments** — do not follow this line.
  - **Do not touch** `details:6,7` · `details:114` · `details:247,249` · `actor:16` · `org:16` · `details:15` · `actor:25`.
  - `details:114` is the trap — it sits between two sites that do change and looks field-scoped. It is server-sourced (`DD-8`).
- **Acceptance / done check:**
  - [x] AC.1 — the 8 sites reference `var(--ac-warning-1)`.
  - [x] AC.2 — each changed line keeps its `material-symbols-rounded` `warning` icon and its existing text-size class.
  - [x] AC.3 — `actor:34` and `actor:52` still carry `border-2`.
  - [x] AC.4 — **no hex colour literal** was introduced into the 4 templates (`NFR-IUW-001`).
  - [x] AC.5 — every `--ac-*` name referenced in the 4 templates exists in `colors.scss` (defect class `D-3`).
- **Verification:**
  - Site count: `grep -c 'ac-warning-1' <the 4 templates>` totals **8**.
  - Kept-red count: `grep -c 'ac-red-1'` totals **7** (`details` 6,7,114,247,249 = 5 · `actor:16` · `org:16`).
  - Hex ban: `grep -nE '#[0-9a-fA-F]{3,8}' <the 4 templates>` returns no colour literal.
  - Token cross-check (`D-3`): every `--ac-[a-z0-9-]*` extracted from the 4 templates is present in `colors.scss`.
  - `npm run lint -- --quiet`
- **Input that makes this FAIL (K-012):** misspell one token as `--ac-warning-l` (lowercase L) → the cross-check finds it absent from `colors.scss` → AC.5 red. This is the check's whole reason for existing: a bad CSS custom property **throws no error and reddens no test** — it silently renders the inherited colour.
- **What this cannot prove:** that the rendered pixel is amber. Every check here is a **presence assertion** over markup (`KZ-001`); jsdom paints nothing and Tailwind is a runtime browser script invisible to it. Covered by `T-03`'s human check.
- **Dependencies:** `T-01`
- **Effort:** S
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Status:** done — **but superseded at 2 of its 8 sites by `T-04`** (`RB-6`)
- **⚠️ Supersede note (2026-09-02).** `T-02` executed the approved spec **faithfully and correctly**: all 5 of its ACs hold, its diff is exactly the token substitution the design specified, and its Reviewer PASS stands. The **spec** was wrong. At `actor:34` and `actor:52` the substituted class is inert (`DD-10`), so the token reached the attribute and never the pixel — and the pre-change red was equally inert, meaning `T-02` did not regress anything. Left `done` rather than reopened, because reopening would imply the work was mis-executed; the correction is new, separately-approved work in `T-04`.

---

### T-03 — Realign assertions, extend the R3 WCAG harness, and verify visually

- **Requirements covered:** `R-IUW-002` (scenarios 1–3, all `BUT` / `AND IT MUST` clauses), `NFR-IUW-002`
- **Design refs:** `§6`, `DD-9`, `AR-1`, defect classes `D-2`, `D-6`, `D-7`
- **Files touched (intended):**
  - `…/innovation-use-actor-item/innovation-use-actor-item.component.spec.ts`
  - `…/innovation-use-details/innovation-use-details.component.spec.ts` (R3 block, ~`:2284`)
- **Description:** Realign the assertions broken by `T-02`, add explicit guards for the sites that must **stay** red, extend the route's R3 WCAG instrument to cover the validation role with a documented exception, and perform the human visual check that no command can substitute.
- **Implementation notes:**
  - **Derive the broken-assertion list from the failing run, not from a grep (K-018).** Apply `T-02`, run the suite, let the failures write the list. The pre-flight grep predicted exactly one (`innovation-use-actor-item.component.spec.ts:264`) — treat that as a hypothesis to falsify, not the list.
  - **R3 exception (`DD-9`):** add the validation role to the block at `~:2284`. It measures **below** the 4.5:1 threshold on both of this section's backgrounds, so it **cannot** assert `>= 4.5` (exact ratios: `requirements.md` §8 `AR-1`, the single home — `KZ-005`). Assert the measured value against an explicitly named, cited exception referencing `AR-1` and `DR-1` — so the harness states what it covers and why this role is exempt, instead of omitting the role.
  - **Express colours as decimal RGB triples.** This file's own zero-hex grep bans a literal hex **anywhere, comments included** (`:1997–2000`). `#e69f00` is `[230, 159, 0]`.
  - Add negative guards for `D-2`: the `*` asterisks and the remove buttons still carry red; `details:114` still carries red (`DD-8`).
- **Acceptance / done check:**
  - [x] AC.1 — every assertion broken by `T-02` is realigned; the list came from the failing run, and the run's count is recorded (`K-018`).
  - [x] AC.2 — an assertion proves the invalid `p-select` border carries the warning token *(scenario 1 — THEN)*.
  - [x] AC.3 — an assertion proves the required message keeps its `warning` icon and text-size class *(scenario 1 — AND)*.
  - [x] AC.4 — an assertion proves the `Actor type*` asterisk is still `text-red-500` *(scenario 1 — BUT it must NOT)*.
  - [x] AC.5 — an assertion proves the remove button is still `--ac-red-1` *(scenario 1 — BUT it must NOT)*.
  - [x] AC.6 — an assertion proves the `loadFailed()` banner is still `--ac-red-1` *(scenario 2 — THEN + AND IT MUST)*.
  - [x] AC.7 — an assertion proves **both** `details:114` and `details:249` render `--ac-red-1`, i.e. the same `saveErrors()` array never renders in two colours *(scenario 3 — THEN + AND IT MUST)*.
  - [x] AC.8 — the R3 block covers the validation role, with the exception documented in-file and citing `AR-1` / `DR-1` (`DD-9`, `D-7`).
  - [x] AC.9 — no hex literal was introduced into the spec file (its own `:1997–2000` grep still passes).
  - [ ] AC.10 — **human visual check:** an invalid actor card and the `Justification` field are compared **on the same rendered screen**; the amber is indistinguishable between them and no layout shifted (`NFR-IUW-002`, `D-6`).
  - [x] AC.11 — full route suite green: `npx jest --testPathPattern innovation-use` (baseline **230/230**; expect ≥ 230).
- **Verification:** `npx jest --testPathPattern innovation-use --coverage=false` · then `npm run lint -- --quiet` · then the AC.10 browser check.
- **Input that makes this FAIL (K-012):** revert one `T-02` site back to `--ac-red-1` → AC.2 reddens. For AC.7, colour `details:114` amber → the paired assertion reddens. For AC.10, the disqualifier below applies.
- **Evidence disqualifier:** AC.10 is a human observation, so **quote what was actually observed** (`KZ-002`). A report that the page "looks right" or that "the section renders" does **not** discharge it — the quoted words must state that the *validation* amber on an *invalid actor card* was compared against the *Justification* field. If the observation covers an adjacent property, say which and leave AC.10 blocked. An inconclusive visual check is a legitimate outcome; it is never a pass.
- **What this cannot prove:** the class assertions prove which token name won the element, never the painted pixel — R3's own header says so (`~:2279`). AC.10 is the only criterion here that touches rendering, and it is human, non-repeatable, and unversioned.
- **Dependencies:** `T-02`
- **Effort:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Status:** blocked — code work PASS; AC.10 (human visual check) outstanding; Pivot Record filed (see `execution.md`)

---


### T-04 — Render the two border sites (Pivot: `DD-4` falsified)

- **Origin:** **Pivot**, 2026-09-02 (`execution.md` → *Pivot Record: T-02 / T-03*; risk `RB-6`). User approved direction **A**. Not new scope — it delivers `R-IUW-002` scenario 1's THEN clause, which `T-02` was believed to have delivered and had not.
- **Requirements covered:** `R-IUW-002` AC.3 (revised), scenario 1 THEN (border half), `NFR-IUW-001`, `NFR-IUW-002`
- **Design refs:** `DD-10` (supersedes `DD-4`), `§5.2` (revised row), `§6` (inline-style row), defect class `D-8`
- **Files touched (intended):**
  - `…/components/innovation-use-actor-item/innovation-use-actor-item.component.html` (2 sites: `34`, `52`)
  - `…/components/innovation-use-actor-item/innovation-use-actor-item.component.spec.ts` (realign the border assertions)
- **Description:** Make the two invalid-field borders actually paint, using the codebase's established `[style]` object-binding pattern, and convert their assertions from a class check (which cannot see the cascade) to an inline-style check (which jsdom can).
- **Implementation notes:**
  - `actor:34` → `[style]="actorTypeMissing || duplicateType ? { border: '2px solid var(--ac-warning-1)' } : {}"`
  - `actor:52` → `[style]="otherNameMissing ? { border: '2px solid var(--ac-warning-1)' } : {}"`
  - **Remove** the now-dead `border-2 rounded-md border-[var(--ac-warning-1)]` / `border-2 border-[var(--ac-warning-1)]` fragments from both `class` interpolations. Leaving them would keep a lie in the markup that the old assertions still pass on.
  - Keep `w-full` / `rs-mt-[12]` / `fs-[14]` and both ternary **conditions** exactly as they are. The condition logic is not in scope.
  - **Use the token, NOT the exemplar's hex.** `custom-fields/select/select.component.html:20` hardcodes `'2px solid #E69F00'`; copying that verbatim would violate `NFR-IUW-001` and `DD-7` — the very rule this spec exists to satisfy. Use `var(--ac-warning-1)`.
  - Do **not** add `!important` and do **not** touch component SCSS. That fallback (`radio-button.component.scss:12–17`) is for descendant paint nodes; both sites here paint on their own element.
- **Acceptance / done check:**
  - [x] AC.1 — `actor:34` and `actor:52` each carry an `[style]` binding producing a 2px `var(--ac-warning-1)` border in their invalid state, and `{}`/no border otherwise.
  - [x] AC.2 — the dead Tailwind border fragments are gone from both `class` interpolations; a grep for `border-\[var(--ac-warning-1)\]` in the 4 templates returns **0**.
  - [x] AC.3 — both ternary conditions (`actorTypeMissing || duplicateType`, `otherNameMissing`) and all non-border classes are unchanged.
  - [x] AC.4 — **no hex literal** in the touched files (`NFR-IUW-001`).
  - [x] AC.5 — assertions read the **inline style** (`element.style.border` / the `style` attribute), not the class list, and the old class-based border assertions are replaced rather than kept alongside.
  - [x] AC.6 — every `--ac-*` referenced still exists in `colors.scss` (`D-3` cross-check).
  - [x] AC.7 — route suite green and ≥ its current baseline of **234**.
  - [~] AC.8 — **human visual re-check, PARTIAL 2026-09-02.** ✅ `actor:34` **verified from the user's screenshot**: one 2px amber border (not a double outline — the open question about which `p-select` node receives it), PrimeNG's radius preserved after `rounded-md` was dropped, amber matching the reference, no layout shift, and the red asterisk + red remove button visible in the same frame. ⛔ `actor:52` **NOT verified** — with `Actor type` empty the `Specify other` input is not rendered, so the frame that proves `:34` structurally excludes `:52`, and the two apply the inline style through **different mechanisms** (`p-select` re-applies a `style` @Input via PrimeNG's host binding; `pInputText` is a directive on a native input that Angular writes directly). Inferring one from the other is the same "obviously-the-same-mechanism" step that produced `DD-4`. Needs one frame: `Actor type = Other`, name left empty.
- **Verification:** `npx jest --testPathPattern innovation-use --coverage=false` · `npm run lint -- --quiet` · hex grep · then the AC.8 browser re-check.
- **Input that makes this FAIL (K-012):** revert `actor:34` to the Tailwind class → AC.2's grep finds it and AC.5's inline-style assertion reddens. **Note the falsifier that does NOT work:** changing the token name inside the class fragment reddens nothing visually, because the class was never painting — that is exactly `D-8`, and it is why AC.5 must assert the inline style.
- **What this cannot prove:** the composited pixel colour. An inline style outranks every stylesheet rule, so a passing AC.5 does imply the border paints — a materially stronger claim than the class assertion it replaces, but still not a screenshot. AC.8 remains the only criterion touching rendering.
- **Dependencies:** `T-03`
- **Effort:** S
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Status:** blocked — code work PASS (Reviewer, 1st attempt); **AC.8 human re-check outstanding**

---

## 3. Requirement → clause coverage

Closure is at **scenario and clause** granularity, not requirement ID.

| Requirement | Clause | Task |
| --- | --- | --- |
| `R-IUW-001` | AC.1 · AC.2 · AC.3 · AC.4 | T-01 |
| `R-IUW-002` | AC.1 · AC.2 · AC.3 · AC.4 | T-02 |
| `R-IUW-002` S1 | THEN **message** amber | T-02 (markup) · T-03 AC.3 (assertion) |
| `R-IUW-002` S1 | THEN **border** amber — **reassigned 2026-09-02 (`RB-6`)**; `T-02`'s markup and `T-03` AC.2's assertion both passed over a border that never rendered | **T-04** AC.1 (markup) · T-04 AC.5 (inline-style assertion) · T-04 AC.8 (human) |
| `R-IUW-002` S1 | AND icon + text size kept | T-02 AC.2 · T-03 AC.3 |
| `R-IUW-002` S1 | BUT it must NOT change the asterisk | T-03 AC.4 |
| `R-IUW-002` S1 | BUT it must NOT change the remove button | T-03 AC.5 |
| `R-IUW-002` S1 | AND IT MUST resolve to a defined custom property | T-02 AC.5 (`D-3` cross-check) |
| `R-IUW-002` S2 | THEN banner stays red · AND IT MUST (§7.1 reason) | T-03 AC.6 |
| `R-IUW-002` S3 | THEN save-error block stays red | T-03 AC.7 |
| `R-IUW-002` S3 | AND IT MUST render `:114` in the same red | T-03 AC.7 |
| `R-IUW-002` S3 | BUT it must NOT infer field-scoped ⇒ amber | T-02 (site list excludes `:114`) · T-03 AC.7 |
| `NFR-IUW-001` | zero hex literals | T-02 AC.4 · T-03 AC.9 |
| `NFR-IUW-002` | visual parity | T-03 AC.10 |

---

## 4. Testing expectations

| Spec file | Change |
| --- | --- |
| `innovation-use-actor-item.component.spec.ts` | realign the border assertion (`:264`); add the asterisk + remove-button guards |
| `innovation-use-details.component.spec.ts` | add the `:114` / `:249` paired guard; extend the R3 block with the validation role + documented exception |

No new spec **files**. Coverage floors unchanged (client: statements 40 / branches 20 / lines 45 / functions 30). **Not Bug Mode** — this is a Change, so no red-before-green regression test is owed.

---

## 5. Risks & blockers log

| # | Date | Risk / Blocker | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RB-1 | 2026-09-02 | **`AR-1`** — the amber fails AA on this page. **Widened 2026-09-02 (`RB-5`):** originally recorded as light-mode only; it is in fact **both themes**, and worst in dark. Figures live in `requirements.md` §8 `AR-1` (single home, `KZ-005`) — deliberately not restated here | Accepted per `DR-1`; recorded as an executable exception in R3 for **light mode** (`DD-9`); dark mode has **no** possible gate in this repo (every R3 constant is a light value). Design-system follow-up ticket owed, now covering **both** themes | User | open |
| RB-2 | 2026-09-02 | `D-6` has no automated gate — a wrong rendered colour passes every command | AC.10 human check with a quoted-observation disqualifier | Implementer | open |
| RB-3 | 2026-09-02 | Engineering-lead formal sign-off on a §7.1 token addition may be owed (`DR-3`) | Confirm before merge | D. Casañas | open |
| RB-4 | 2026-09-02 | **`T-02` must not merge without `T-03`.** As of `T-02` the page ships validation text at 2.09:1 / 2.25:1 against PRD `C-4`, and the R3 harness (`innovation-use-details.component.spec.ts:2284`) is silent about the new role — the exact failure mode R3 was built to remediate. `T-02` alone on `dev` is a live *and* undetectable deviation, materially worse than the pre-spec red. Raised by `T-02`'s Reviewer | Treat as a **hard merge condition**, not a preference: no PR carrying `T-02` without `T-03` | Leader / D. Casañas | open |
| RB-5 | 2026-09-02 | **`AR-1`/`DD-5`'s dark-mode claim was false for 3 of the 8 sites.** *"Dark mode passes at 6.29:1; the failure is light-mode only"* holds for the 5 sites on `--ac-grey-100` (dark `#2b2b2b`) but NOT for `details:107`, `details:147`, `stepper:4` on `--ac-white-1`, where it is **worse than in light mode** (figures live in `requirements.md` §8 `AR-1` — the single home, `KZ-005`; deliberately not restated here). Derived independently by Leader, Implementer and Reviewer; backgrounds verified in the markup. Reachable today and **undetectable** — every R3 constant is a light value | **RESOLVED 2026-09-02 — user chose option A** (Pivot Record in `execution.md`): documents corrected (`requirements.md` AR-1 + AC.2 + OQ-3 · `design.md` DD-5 + §9 · `proposal.md` correction notice), token value and scope unchanged, `OQ-3` reopened then accepted, owed ticket widened to both themes. **Residual accepted knowingly: the dark deviation ships documented but ungateable** | D. Casañas | **resolved — residual accepted** |
| RB-6 | 2026-09-02 | **`DD-4` FALSIFIED — the Tailwind border classes at `actor:34` and `actor:52` are inert, and always were.** PrimeNG injects `.p-select`/`.p-inputtext { border: 1px solid … }` **unlayered** (`app.config.ts:29–36` never sets `cssLayer`), while Tailwind v4 emits every utility inside `@layer utilities`; unlayered author CSS unconditionally beats layered. So the border renders as PrimeNG's default and **the red never rendered either** — this spec inherited the defect, it did not cause it. Found by **AC.10's human check**, invisible to all 7 automated gates | **RESOLVED 2026-09-02 — user chose option A** (fix it in this spec). Fix is the established `[style]` object binding (inline style outranks every stylesheet), using `var(--ac-warning-1)` rather than the reference's hardcoded hex so `NFR-IUW-001` still holds | D. Casañas | **resolved — `T-04` owns the fix** |

---

## 6. Done definition

- [ ] `T-01`, `T-02`, `T-03`, **`T-04`** are `done`.
- [ ] Every clause in §3 is discharged by its named task.
- [ ] `npx jest --testPathPattern innovation-use` ≥ 234 passing (baseline raised by `T-03`).
- [ ] `npm run lint -- --quiet` clean.
- [x] AC.10's human observation is **quoted**, not summarised. **Done 2026-09-02 — and it FAILED**, which is what produced the Pivot and `T-04`. Quoted in `execution.md`.
- [ ] `T-04` AC.8's human re-check is **quoted** and passes.
- [ ] `AR-1`'s follow-up design-system ticket is filed — and it must cover **both** themes, not only light mode (`RB-5`).
- [x] Actuals compared against the budget (3 tasks / ~40 LOC / 1 round); any overrun escalated, not absorbed. **Fired and escalated:** 205 LOC vs ~40. User accepted the overrun 2026-09-02; cause recorded in `execution.md` (the estimate priced AC.2–AC.7 at zero) and queued as a Kaizen candidate.
- [x] Full client suite green, not only the route pattern: `npm test -- --silent` → **317 suites / 6790 tests passing**, coverage 98.19 / 96.29 / 97.76 / 98.49 (floors 40 / 20 / 45 / 30). Closes the scope gap the `T-03` Reviewer named — `--testPathPattern innovation-use` is narrower than `npm test` (`KZ-017`).
