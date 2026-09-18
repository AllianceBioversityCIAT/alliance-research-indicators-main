# Proposal — Innovation Use validation warning colour

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/innovation-use-validation-warning-color` |
| Slug | `innovation-use-validation-warning-color` — supplied as kebab-case by the user; used literally, not derived |
| Type | **Change** |
| Approval Mode | **gated** (no explicit end-to-end mandate given) |
| Depends on | none |
| Parallel-safe | **no** — edits `src/styles/colors.scss` and `docs/ux-ui/design.md` §7.1, both repo-wide shared surfaces |
| Parent Spec | none (not a chunked family) |
| Status | **Approved** — 2026-09-02, by the user; proceeding to `/akili-specify` |
| Raised by | User (D. Casañas), 2026-09-02, with two in-app screenshots |
| Escalated from | `/akili-quick` — failed the triviality gate on **new design token** (registering a colour family in §7.1) and **scope** (13 sites / 4 templates + a shared stylesheet) |
| Related archive | [`docs/specs/archive/2026-08-26-innovation-use--details-page`](../../archive/2026-08-26-innovation-use--details-page/) (`DD-7`, `DD-17`, `OQ-IUP-4`) |

### Decision record

| # | Decision | Decided by | Date |
| --- | --- | --- | --- |
| **DR-1** | **The warning colour is `#E69F00`, unchanged.** A darkened AA-compliant variant was proposed and **rejected**: the amber is a long-standing approved brand value, and re-deciding it is out of this change's authority. The value is fixed input, not an open question. | User (D. Casañas) | 2026-09-02 |
| **DR-2** | **Option A selected** — register the token and apply it to the 13 Innovation use validation sites only. The app-wide migration of the remaining 22 files is **not** in this spec. | User (D. Casañas) | 2026-09-02 |
| **DR-3** | **`OQ-IUP-4` resolved: the token may be added in this spec** and registered in `docs/ux-ui/design.md` §7.1 in the same change — the direction that question recorded as its own default. Follows necessarily from `DR-1` + `DR-2`: §6 shows no other compliant implementation exists. ⚠️ *Decided by the user in session; if the Engineering lead's formal sign-off on a §7.1 token addition is required by process, it is still owed and should be obtained before the design phase closes.* | User (D. Casañas) | 2026-09-02 |

---

## 2. Intent

Make required-field validation on the **Innovation use details** page use the **same approved amber warning treatment** already implemented across STAR — one colour, one icon, one treatment — delivered through a registered design token rather than a hex literal.

---

## 3. Problem / Current Behavior

**The Innovation use page renders two different validation styles at the same time, on the same card.**

This is not a page-vs-app inconsistency. Both of the user's screenshots are the **same page**:

| Screenshot | Field | Rendered by | Validation style |
| --- | --- | --- | --- |
| Image #5 | `Justification` textarea | shared `app-textarea` | 🟡 amber border + amber "⚠ This field is required" |
| Image #4 | `Actor type` select | bespoke `p-select` in `innovation-use-actor-item` | 🔴 red border + red "⚠ This field is required" |

Per **KZ-002** (*enumerate by what renders, not by where the feature lives*), the route's real composition is what matters:

| Component on the route | Owner | Validation colour today |
| --- | --- | --- |
| `app-input`, `app-textarea`, `app-quantification-item` | `shared/components/custom-fields/` | 🟡 `#E69F00` |
| `innovation-use-actor-item`, `innovation-use-organization-item`, `innovation-use-level-stepper`, `innovation-use-details` | this feature | 🔴 `var(--ac-red-1)` |

Every shared field component in `custom-fields/` uses the amber for validation and reserves red for the required `*` asterisk. **Amber = validation, red = asterisk + destructive** is the established convention; Innovation use is the only surface that departs from it.

### Why it is red today

The archived spec `innovation-use/details-page` decided this on purpose, and the Reviewer confirmed it ([`execution.md:421`](../../archive/2026-08-26-innovation-use--details-page/execution.md)):

> §7.1 assigns `--ac-red-1` to *"Errors, destructive actions"* and `--ac-orange-1` to *"Indicators 4–5"* — orange is bound to **indicator branding**, so using it for a validation message would have been the misuse. **`#E69F00` has no token by design**: `DD-7` lists it among the reference page's documented §7.1 violations, and `DD-7` *mandates* diverging from it.

The reasoning was sound but it solved the wrong problem: `DD-7` bans the **hex literal**, and with no token available the author had no compliant way to express the warning *role*. The result was a page that satisfies the token rule by adopting the wrong semantic colour.

**This proposal removes that dilemma — register the approved amber as a token, so the role and the token rule are satisfiable at the same time.**

---

## 4. Proposed Outcome

Required-field validation on Innovation use renders in the **approved amber `#E69F00`**, delivered so that:

1. it reads as the identical warning language the rest of STAR already uses;
2. it arrives through a **registered `--ac-*` token**, not a hex literal — upholding `DD-7` and §7.1's *"do not hard-code hex values in new components"*;
3. red survives exactly where §7.1 assigns it — the required `*` asterisk and the destructive remove buttons.

---

## 5. Scope

### In scope

Register the token, then apply it to the **13 validation sites** on the route (enumerated, not estimated):

| File | Lines | What |
| --- | --- | --- |
| `innovation-use-details.component.html` | 6, 7 | section-error banner border + icon |
| | 107, 114, 147 | required / validation messages |
| | 247, 249 | bordered validation block + message |
| `innovation-use-actor-item.component.html` | 3 | `#requiredMessage` template |
| | 34 | invalid `p-select` border |
| | 41 | duplicate-actor-type message |
| | 52 | invalid "Specify other" input border |
| `innovation-use-organization-item.component.html` | 3 | `#requiredMessage` template |
| `innovation-use-level-stepper.component.html` | 4 | required message |

Plus:

- `src/styles/colors.scss` — define the token at **`#E69F00`**, in the `:root` block and the `[data-theme='dark']` block (see `OQ-3`), and in the `$colors` map if `.abc-*` / `.atc-*` utilities are wanted.
- `docs/ux-ui/design.md` §7.1 — register the family in the authoritative token table.
- **1 spec assertion** must be updated: `innovation-use-actor-item.component.spec.ts:264` asserts `border-[var(--ac-red-1)]` on the invalid select.

> **Correction (verified, not estimated).** A first pass reported *8* affected assertions by counting grep hits for `ac-red-1|red-500` across the route's spec files. Re-read line by line, **7 of the 8 are unaffected**: two are comments (`innovation-use-details.component.spec.ts:279,377`), and five assert the required-`*` asterisk (`:1766`, and `innovation-use-organization-item.component.spec.ts:241,244,247,252`) — the asterisk **stays red**, so those stay green. Only the border assertion changes. Classic **KZ-017**: the grep's scope was wider than the claim it was backing.

### Explicitly stays red

| Site | Why |
| --- | --- |
| `*` asterisks (`text-red-500`) — details :15, actor-item :25 | §7.1 red = required marker; the reference screenshot (Image #5) also shows a **red** asterisk above an amber field |
| Remove buttons `pi-times-circle` — actor-item :16, organization-item :16 | §7.1 red = *destructive actions* |

### Non-goals

- **Changing the amber value.** Fixed by `DR-1`.
- Migrating the other **22 client files / 53 occurrences** of hardcoded `#E69F00` to the token (see Option B — a follow-up chunk).
- Resolving the light-mode contrast deviation (`AR-1` below) — a design-system item, not this change's.
- Fixing `dark-mode.service.ts` / the PrimeNG `.dark-mode` selector gap (design.md §7.1 correction, RB-8/RB-9 territory).
- Any change to validation *logic*, timing, or which fields are required. **Colour and token only.**

---

## 6. Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| Users | Result submitters on the Innovation use indicator — consistent, predictable error affordance |
| Client | 4 templates + `colors.scss` + **1** spec file |
| Server | **none** |
| Specs | Amends archived `innovation-use/details-page` **`DD-7` rationale** and **re-opens `OQ-IUP-4`** |
| Design system | First **new colour family** added to §7.1 since the Pool Funding tokens |

### `OQ-IUP-4` — the one question that must be answered first

This proposal is the direct trigger for a question the earlier spec formally deferred rather than answered ([`design.md:641`](../../archive/2026-08-26-innovation-use--details-page/design.md)):

> **`OQ-IUP-4`** — *If a reference colour has no existing `--ac-*` token (`DD-7`), is adding one to `colors.scss` acceptable in this spec, or should it be a separate design-system change?*
> **Owner: Engineering lead.** Default assumption: *add it here and register it in §7.1 in the same change.*

**`DR-1` makes this genuinely blocking.** With the amber fixed at `#E69F00`, there are only two ways to render it:

| Path | Verdict |
| --- | --- |
| Register `--ac-warning-1: #e69f00` and use `var(--ac-warning-1)` | ✅ satisfies `DR-1` **and** `DD-7` |
| Inline `#E69F00` in the templates | ❌ violates `DD-7` and §7.1's explicit *"do not hard-code hex"* |

So a ruling of *"no new token in this spec"* leaves **no compliant implementation**. The token is not a preference here; it is the only path that satisfies both the user's constraint and the repo's standing rules.

---

## 7. Visual Reference

- **Source:** Existing in-app implementation + two user screenshots (2026-09-02), both from `allianceindicatorstest.ciat.cgiar.org` → Result STAR-19911 → Innovation use details.
- **Location:** conversation attachments; the authoritative target pattern is live code — `shared/components/custom-fields/textarea/textarea.component.html:35,43` (2px border + message with `material-symbols-rounded warning` icon).
- **Notes:** No Figma and none needed — the target pattern already ships, and `DR-1` fixes the value to match it exactly. **The result should be pixel-identical to Image #5's treatment**, which makes visual verification a straightforward side-by-side. One human check is still required: jsdom cannot verify rendered colour, and this repo has **no automated visual/a11y gate** (`AR-2`, archive).

---

## 8. Requirement Delta Preview

### ADDED

- A registered warning-colour token family in `colors.scss` + `docs/ux-ui/design.md` §7.1, valued `#E69F00`, documented as *"Validation warnings, non-blocking errors"*.

### MODIFIED

- The 13 Innovation use validation sites move `var(--ac-red-1)` → the warning token.
- 1 spec assertion (`innovation-use-actor-item.component.spec.ts:264`) updated from the red token to the warning token.
- `DD-7`'s recorded rationale is amended: `#E69F00` remains banned as a **hex literal**, but the warning *role* now has a legitimate token, so the reason the page went red no longer applies.

### REMOVED

- Nothing. No behavior, field, or requirement is removed.

---

## 9. Approach Options

With `DR-1` fixing the value, the only remaining axis is **how far the token is applied**.

| # | Option | Scope | Pros | Cons |
| --- | --- | --- | --- | --- |
| **A** | **Token + Innovation use only** | 4 templates, `colors.scss`, §7.1, 1 spec file | Smallest safe path; fixes the reported inconsistency; establishes the token the whole app can adopt later at zero rework | The other 22 files keep their hex literals until the follow-up — same colour on screen, two spellings in code |
| **B** | **Token + app-wide migration** | Option A **+ 22 files / 53 occurrences** | Ends the hex-literal violation everywhere in one pass; makes the amber themeable | Touches every form surface in STAR (`shared-result-form`, `global-alert`, `result-sidebar`, all `custom-fields`); large regression surface with **no automated visual gate** (`AR-2`) |
| **C** | **Inline `#E69F00` in the 4 templates** | 4 templates | No token debate; matches the screenshots immediately | ❌ Violates §7.1 *"do not hard-code hex"* and `DD-7`, in a page whose whole token discipline was the reason the earlier spec chose red. **Reject.** |

---

## 10. Recommended Approach

**Option A — register `--ac-warning-1: #e69f00` and apply it to the 13 Innovation use validation sites.**

Why it is the smallest safe path:

1. It resolves the user's actual complaint (one page rendering two validation languages) with a **13-site, 4-template** edit, and the on-screen result is pixel-identical to the approved pattern.
2. It honours `DR-1` exactly — the approved amber is used, not re-decided.
3. It answers `OQ-IUP-4` in the direction that question already recorded as its own default — *add the token and register it in §7.1 in the same change* — and §6 shows it is the only compliant option remaining.
4. It leaves Option B available as a clean follow-up chunk that reuses the identical token, with no rework and no second visual review.

---

## 11. Risks, Dependencies, And Open Questions

| # | Item | Type | Owner / mitigation |
| --- | --- | --- | --- |
| **AR-1** | **Accepted deviation — light-mode contrast.** `#E69F00` measures **2.09:1** on the `--ac-grey-100` card and **2.25:1** on white, below the **4.5:1** that `docs/ux-ui/design.md` §10 and PRD **C-4** (WCAG 2.1 AA) require for text. Innovation use is currently the *compliant* surface (`--ac-red-1` = 5.29:1), so this change moves one page from passing to failing in light mode. **In dark mode the same amber measures 6.29:1 and passes.** | **Accepted risk** | **Accepted by the user per `DR-1`**, 2026-09-02. Rationale: the amber is approved, and the deviation is **pre-existing and app-wide** (22 files) — Innovation use was the outlier, not the standard. Fixing it is a design-system decision affecting every form in STAR, not this change's call. **Record it in the spec's risk register and raise a separate design-system ticket.** Note `DD-17` is precedent that this project has treated reachable light-theme contrast failures as blocking — this deviation is knowingly taken against that precedent, which is why it is recorded rather than assumed. |
| R-2 | Innovation use keeps `var(--ac-warning-1)` while 22 other files keep `#E69F00` — identical on screen, inconsistent in source | Risk | Accept as Option A's known cost, or approve Option B. No user-visible impact either way |
| R-3 | **No automated visual or a11y gate exists** (`AR-2`, archive) — rendered colour cannot be asserted in jsdom | Risk | Assert the *token name* in the spec; verify appearance by one human side-by-side against Image #5. **KZ-001:** assert the property where it lives (rendered DOM / class list), never on the call sequence |
| R-4 | Dark mode: `--ac-*` tokens do flip, but **PrimeNG chrome never darkens** (§7.1 correction) | Dependency | Define the dark value anyway for consistency with every other token; do not attempt the `dark-mode.service.ts` fix here |
| ~~OQ-1~~ | ~~`OQ-IUP-4`: may this spec add a token to `colors.scss` + §7.1?~~ | **Resolved** | **`DR-3`** — yes, added and registered in the same change. Engineering-lead formal sign-off still owed if process requires it |
| ~~OQ-2~~ | ~~Option A or Option B?~~ | **Resolved** | **`DR-2`** — Option A |
| OQ-3 | Dark-mode value for the token: keep `#E69F00` (matches today's hardcoded rendering exactly, and already measures 6.29:1 on the dark card) or lighten it as `--ac-orange-1` does? | Non-blocking | **Default: keep `#E69F00` in both blocks** — it needs no lightening to be legible on dark, and any other value would make Innovation use differ from the 22 unmigrated files in dark mode. Confirm in `/akili-specify` design |
| OQ-4 | Token name: `--ac-warning-1` (proposed) or another family name? | Non-blocking | Resolve in `/akili-specify`; `-1` suffix matches the existing `--ac-red-1` / `--ac-orange-1` single-value convention |
| OQ-5 | Should the amber also replace red in `innovation-details` (the sibling Innovation dev page), which carries the same bespoke red? | Non-blocking | Out of scope here; candidate for the Option B chunk |

> ### ⚠️ Correction notice — 2026-09-02, added during `/akili-execute` `T-03`
>
> **The rows above are left exactly as they were approved** — a proposal is a point-in-time record and
> its decision rows (`DR-1`..`DR-3`) are never edited in place. This notice records that **two claims in
> the table above were later found inaccurate**, so a reader does not carry them forward:
>
> - **`AR-1`'s sentence** *"In dark mode the same amber measures 6.29:1 and passes"* is true only on the
>   dark **card** background (`--ac-grey-100` → `#2b2b2b`), which covers 5 of the 8 sites. The other 3
>   (`details:107`, `details:147`, `stepper:4`) sit on `--ac-white-1`, which in dark mode is `#e5e5e5`,
>   where the amber measures **worse than in light mode** (figures: `requirements.md` §8 `AR-1`). The deviation is therefore present
>   in **both** themes and is at its worst in dark.
> - **`OQ-3`'s conclusion** *"it needs no lightening to be legible on dark"* over-generalises from the
>   same card-only measurement. `OQ-3` reopened during `T-03` and was re-decided by the user (**option
>   A**: keep the value, correct the record, hand the colour to the owed design-system ticket).
>
> **Provenance worth noting** (`KZ-007` — a derived claim propagates and is rarely re-verified): `OQ-3`'s
> own wording here was *precise* — *"measures 6.29:1 on the dark **card**"*. The imprecision was
> introduced downstream, when `requirements.md` §8 `AR-1` generalised it to *"Dark mode passes at 6.29:1;
> the failure is light-mode only."* The claim got **less** accurate as it moved between documents, which
> is the failure mode `KZ-007` names.
>
> **Live, corrected figures:** `requirements.md` §8 `AR-1` (the single home — `KZ-005`). Audit trail:
> `execution.md` → *Pivot Record: T-03*. Risk row: `tasks.md` §5 `RB-5`.

**Kaizen lessons applied:** `KZ-002` (scope enumerated by what renders — this is what revealed the same-page split) · `KZ-001` (assert the property where it lives) · `KZ-017` (the assertion-count correction in §5) · `KZ-007` (this document corrects an earlier record — the `DD-7`/Reviewer rationale — citing source lines rather than restating from memory).

---

## 12. Success Criteria

1. Every required-field validation message and invalid-field border on the Innovation use details route renders in the **same warning token** — no `var(--ac-red-1)` remains on a validation site.
2. The rendered colour is **exactly `#E69F00`**, visually indistinguishable from the `Justification` textarea's treatment in Image #5 (`DR-1`).
3. Red survives **only** on the `*` asterisks and the destructive remove buttons.
4. The token exists in `colors.scss` with light **and** dark entries and is registered in `docs/ux-ui/design.md` §7.1.
5. **No hex literal is introduced** into any Innovation use template (`DD-7` holds) — verified by grep for `#` colour literals across the 4 files.
6. `AR-1` is recorded in the spec's risk register as an accepted deviation with `DR-1` as its authority, and a follow-up design-system ticket exists for the app-wide amber.
7. Client suite green, including the updated border assertion: `npx jest --testPathPattern innovation-use` (baseline today: **230/230**).
8. A human confirms the rendered result side-by-side against the reference pattern (no automated visual gate exists).

---

## 13. Next Step

**All blocking questions are resolved** (`DR-2`, `DR-3`). Proceed directly to:

```text
/akili-specify docs/specs/changes/innovation-use-validation-warning-color
```

Recommended depth: **Lite** — bounded, no logic change, but it touches a shared stylesheet and the authoritative token table, so it needs real requirements and a design decision record rather than `/akili-quick`.
