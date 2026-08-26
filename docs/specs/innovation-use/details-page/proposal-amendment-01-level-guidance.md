# Proposal — Amendment 01: Level-selector guidance & evidence copy (Innovation Use details)

> **This is an amendment to an in-flight child spec, not a new spec.** It is filed beside
> [`proposal.md`](./proposal.md) rather than in its own folder **on purpose**: creating a folder under
> `docs/specs/innovation-use/` would mint a child the family manifest's **closed set** has not
> authorized. No new row in [`../family.md`](../family.md) §Children is requested; chunk 3's existing
> row gains an *Amendments* note instead.

**Answer up front:** add two copy blocks around the existing 0–9 use-level stepper (a guidance callout
above it, an evidence-guidance block below it), change the field label to the reference wording, and
add a link to the use-level definitions PDF. Fold it into chunk 3 as **R-IUP-020 / R-IUP-021 + T-14**
while `T-10`…`T-13` are still open, so the full-suite/visual/a11y gate (KZ-003) is paid **once**.


> ### ⛔ Corrected at the `/akili-specify` gate — 2026-08-26
>
> Specify's own reads falsified four claims below. They are **struck through in place** rather than rewritten, because the recommendation they supported survived — on a *different* and stronger argument.
>
> | # | This proposal claimed | Actually |
> | --- | --- | --- |
> | 1 | `T-11`, `T-12` and `T-13` "have not run" | **`T-01`…`T-12` are all `done`.** Only **`T-13`** is open (`[~]` 7 of 11). **The recommendation gets stronger, not weaker:** the four criteria still owed are `c1` (e2e pass), `c7` (human visual), `c8` (T6 screenshots) and `c9` (keyboard) — the **expensive human** ones, entirely unspent |
> | 2 | `R-IUP-005`'s "label clause" needs amending | **There is no label clause.** `Level of use of this innovation` is asserted by **no requirement and no test** — a `T-07` implementation choice. Verified by grep across all three spec docs and `client/research-indicators/src`. `R-IUP-020` is the label's **first** owner; `R-IUP-005` is untouched |
> | 3 | `OQ-IUP-4` "is now more likely to bite" | **Closed for this amendment.** Every colour needed already exists in `src/styles/colors.scss`. **No token added**, so `colors.scss` and `docs/ux-ui/design.md` §7.1 are untouched and `T-11 c4`'s gate is not re-entered |
> | 4 | Human check "in both themes at 1440 px" | **Light theme only** — `DD-14` (2026-08-21) dropped dark mode from this spec's verification obligations because `DarkModeService` is a dead injection with no toggle in any template. Light-mode AA stays fully gated (PRD **C-4**) |
>
> **And specify found one thing this proposal missed entirely, which is now the amendment's most valuable output:** the obvious implementation — reuse the neighbouring callout's colours — **fails WCAG 2.1 AA in the light theme.** Measured, not assumed: the `ACTORS` callout's `--ac-grey-600` is **2.91:1** and the Innovation Dev page's `#777c83` / `#1689ca` are **3.91:1** / **3.57:1** against `--ac-grey-100`, all under 4.5:1. Recorded as **DD-17**; the passing tokens are `--ac-grey-800` (**7.44:1**) and `--ac-light-blue-400` (**6.35:1**). This is a **reachable** `C-4` violation, unlike the dark-mode one `DD-14` dismissed.

---

## Document Control

| Field | Value |
| --- | --- |
| Slug | `level-guidance-copy` — derived from the free-text `/akili-propose` argument ("agregar textos alrededor del selector… modificar el primer párrafo") |
| Amends | [`docs/specs/innovation-use/details-page/`](./) — chunk 3 of the `innovation-use` family |
| Parent Spec | [`docs/specs/innovation-use/`](../family.md) |
| Document path | `docs/specs/innovation-use/details-page/proposal-amendment-01-level-guidance.md` |
| Type | **Change** |
| Approval Mode | **gated** — no pre-approval mandate was given |
| Tier | **Client only.** Zero server files, no migration, no endpoint, no catalog change |
| Source of intent | User message in the `/akili-propose` invocation (2026-08-26), plus four decisions taken at the clarification gate the same day (see §Decisions taken) |
| Branch in flight | `AC-1679-Create-the-innovation-use-section` |
| Repo | `alliance-research-indicators-main` (the `/akili-propose` session opened in `alliance-research-indicators-management/server/app-authorization`; **this change touches neither that repo nor the server tier**) |
| Created | 2026-08-26 |

### Decisions taken at the clarification gate (2026-08-26)

| # | Question | Decision |
| --- | --- | --- |
| D-1 | How much of the guide image is replicated above the selector? | **All of it** — new label, the 4-bullet callout, and the "definition of all use levels" link. The user supplied the definitions target as an external PDF, which removes the "new modal" objection that made this the expensive option |
| D-2 | The requested copy says "Innovation Readiness Level" / "innovation development level" — Development terminology on a **Use** page | **Adapt to Use terminology.** The rendered strings say *Innovation Use Level* and *current innovation use level*. This is a deliberate, recorded departure from the literal text pasted in the invocation |
| D-3 | Second paragraph ("Documentation may include idea-notes…") | **Verbatim from the guide image**, including its "current development/ maturity stage of the innovation" tail — even though D-2 adapted paragraph 1. Recorded as an intentional asymmetry, not an oversight |
| D-4 | Spec home | **Amend chunk 3 in place** (this document) |

---

## Intent

Reporters selecting an innovation use level get a bare label, a stepper, and one definition box. The
reference UI wraps that same control in the guidance that makes the choice answerable — how to pick a
level when it differs by geography, that the claim will be quality-assessed, a calculator that derives
it in three clicks, where the definitions live, and what evidence must back it. Bring that guidance
onto the STAR page while the page is still being built.

## Problem / Current Behavior

Rendered today by [`innovation-use-details.component.html`](../../../../client/research-indicators/src/app/pages/platform/pages/result/pages/innovation-use-details/innovation-use-details.component.html)
lines 15–20 and [`innovation-use-level-stepper.component.html`](../../../../client/research-indicators/src/app/pages/platform/pages/result/pages/innovation-use-details/components/innovation-use-level-stepper/innovation-use-level-stepper.component.html):

| Rendered element | Today | Reference guide |
| --- | --- | --- |
| Field label | `Level of use of this innovation*` | `How would you assess the current use level of the innovation?:*` |
| Guidance above the stepper | **absent** | 4-bullet callout, last bullet linking a calculator |
| 0–9 stepper | present (T-04) | present — **no change** |
| Selected-level definition box | present (T-04) | present — **no change** |
| Link to all level definitions | **absent** | `Click here to see the definition of all use levels` |
| Evidence guidance below the stepper | **absent** | 2-paragraph callout, first paragraph pointing at the Evidence section |
| Justification textarea | present, conditional at resolved `level >= 6` (R-IUP-006) | n/a |

Consequences that are already live on the branch:

- **The calculator is unreachable from the Use page.** The Innovation *Development* page links
  `calculator-readiness-headless` ([`innovation-details.component.html:114`](../../../../client/research-indicators/src/app/pages/platform/pages/result/pages/innovation-details/innovation-details.component.html)); the Use page links nothing.
  The two pages are inconsistent for the same class of decision.
- **Nothing on the page says the level needs evidence**, while `innovation_use_validation` gates
  submission on it. The reporter learns the requirement at the submit failure, not at the field.
- **Definitions are visible one at a time.** The stepper's tooltip and definition box show only the
  hovered/selected level, so choosing between two adjacent levels means clicking back and forth.

## Proposed Outcome

Render, top to bottom, inside the existing `INNOVATION USE DETAILS` card:

1. Label → `How would you assess the current use level of the innovation?` + required marker.
2. **New** guidance callout (4 bullets; bullet 4 links `https://www.scalingreadiness.org/calculator-use-headless/`, new tab).
3. Existing stepper + existing definition box — untouched.
4. **New** link → `Click here` → `https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view` (new tab), followed by `to see the definition of all use levels`.
5. **New** evidence callout, two paragraphs:
   - **P1** (adapted per D-2): *"Please provide a brief explanation justifying the selected Innovation Use Level. Make sure you provide the necessary evidence/documentation that support the current innovation use level in the 'Evidence' section of the form (Click here to go there)"* — `Click here to go there` is an **in-app** navigation to the result's Evidence section.
   - **P2** (verbatim per D-3): *"Documentation may include idea-notes, concept-notes, technical report, pilot testing report, experimental data paper, newsletter, etc. It may be project reports, scientific publications, book chapters, communication materials that provide evidence of the current development/ maturity stage of the innovation."*
6. Existing conditional justification textarea — untouched.

Behavioral rules the outcome commits to:

| Rule | Value | Why |
| --- | --- | --- |
| Visibility of blocks 2, 4, 5 | **Always**, independent of the selected level and of `showJustification()` | Guidance that only appears after a choice cannot inform the choice; evidence is required at every level, not only `>= 6` |
| Visibility in read-only status | **Always** | The text is guidance, not an input. `submission.isEditableStatus()` must not gate it |
| External links | `target="_blank" rel="noopener noreferrer"` | Matches the existing Development-page precedent |
| Evidence link | Angular `Router` to `/result/:id/evidence`, **preserving `version` and `from` query params** | `result-sidebar.component.ts:321` `navigateTo()` builds exactly this. A bare `href` or a params-less `navigate` drops version context and can strand the reporter on the wrong version |

## Scope

- `innovation-use-details.component.html` — label text, two new blocks, definitions link.
- `innovation-use-details.component.ts` — one navigation method for the Evidence link; the two URLs as named constants.
- `innovation-use-details.component.spec.ts` — new specs for copy presence, link targets, unconditional visibility, and the navigation call's `commands` + `queryParams`.
- [`requirements.md`](./requirements.md) — add **R-IUP-020**, **R-IUP-021**. ~~amend **R-IUP-005**~~ (Correction 2: nothing to amend).
- [`tasks.md`](./tasks.md) — add **T-14**; add it to `T-13`'s dependencies. ~~extend `T-11`, `T-12`~~ (Correction 1: both `done`, not reopened).
- [`design.md`](./design.md) — the two new blocks' placement, token choices, and the navigation decision.
- [`../family.md`](../family.md) — chunk 3's row gains an *Amendments* note; **no new child row**.
- ~~[`../../../ux-ui/design.md`](../../../ux-ui/design.md) — register the guidance-callout pattern.~~ **Not owed** (Correction 3): `T-12`'s trigger is a **new token**, and none is added.

## Non-Goals

| Not doing | Why |
| --- | --- |
| Touching the stepper component or the definition box | T-04 shipped and reviewed them; this amendment renders *around* them |
| Changing `showJustification()` / the `level >= 6` rule | R-IUP-006 and its 2026-08-21 Pivot are settled; guidance visibility is a separate axis |
| An in-app modal or page listing all 10 definitions | D-1 resolved this to an external PDF. A native definitions view stays a candidate follow-up |
| Any change to the Innovation **Development** page | R-IUP-019 holds — its copy and its readiness-calculator link stay as they are |
| Server, catalog, migration, or endpoint work | Copy and client routing only |
| Backfilling the same guidance onto other result sections | Out of this amendment's intent |

## Affected Users, Systems, And Specs

| Affected | How |
| --- | --- |
| Reporters (all centers) filing an Innovation Use result | See new guidance; gain two links |
| Quality assessors | Reporters are told up front the level is quality-assessed and needs evidence |
| `innovation-use/details-page` (chunk 3, **mid-execution**: T-01…T-09 done, T-10…T-13 open) | Requirements, tasks, design amended; T-11/T-12/T-13 absorb the new surface |
| `R-IUP-005` | ~~Label clause amended.~~ **Correction 2 — untouched entirely.** No label clause exists; `R-IUP-020` owns the label |
| `R-IUP-017` (STAR visual language, both themes) | New blocks must satisfy it — extra surface for the human visual gate (**D7**, no automated gate) |
| `R-IUP-018` (a11y + budget) | New links need discernible names and focus states (**D8**, no automated gate); two text blocks are immaterial against the bundle budget |
| `R-IUP-019` (Innovation Dev unchanged) | Must still hold — the temptation is to "harmonize" the Dev page's callout in the same pass. Do not |
| `docs/ux-ui/design.md` | New pattern registered by `T-12` |

## Visual Reference

- **Source:** Screenshots supplied verbatim in the `/akili-propose` invocation (2026-08-26) — one of the current STAR page, one of the reference UI carrying the target copy. **Not a Figma file.**
- **Location:** the originals were pasted into the session and are **no longer on disk**; the session image cache was cleared before they could be copied into this folder. `mockup/` therefore holds a **copy-review mockup authored from them**, not the screenshots themselves:
  - [`mockup/level-guidance-target.html`](./mockup/level-guidance-target.html) — standalone HTML rendering the target block order with every final string, both link targets, and inline comments marking `ADDED` / `MODIFIED` / `UNCHANGED`. Its literal hex values are a standalone-file artifact; the comments name the `var(--ac-*)` token each one stands for.
- **Owed before the specify gate:** re-attach the two original screenshots to `mockup/` (`current-…png`, `guide-…png`). The mockup is a faithful transcription of the copy, but it is **not** evidence of the reference UI's own layout — a reviewer comparing spacing or emphasis has nothing to compare against. Tracked as **OQ-A1**.
- **Notes:** covers exactly one surface — the `INNOVATION USE DETAILS` card of `/result/:id/innovation-use-details`. No other screen or flow.

## Requirement Delta Preview

### ADDED Requirements

- **R-IUP-020 — The use-level field carries reference guidance above the stepper.** The label reads
  `How would you assess the current use level of the innovation?`; a callout renders the four bullets
  in order; bullet 4 links the use-level calculator in a new tab; a `Click here` link opens the
  definitions PDF in a new tab. All of it renders regardless of selected level and of edit status.
- **R-IUP-021 — The use-level field carries evidence guidance below the stepper.** Two paragraphs, the
  first as adapted (D-2), the second verbatim (D-3). `Click here to go there` navigates **in-app** to
  `/result/:id/evidence` carrying `version` and `from` forward. Renders regardless of selected level
  and of edit status.

### MODIFIED Requirements

- ~~**R-IUP-005** — the label-text clause only.~~ **Withdrawn (Correction 2):** `R-IUP-005` is **not** modified. It never specified the label.
- **R-IUP-017 / R-IUP-018** — coverage extended over the new blocks. No rule text changes.

### REMOVED Requirements

- None.

## Approach Options

| # | Approach | Cost | Verdict |
| --- | --- | --- | --- |
| **A** | **Amend chunk 3 in place** — R-IUP-020/021 + T-14, with T-11/T-12/T-13 extended | ~1 task, ~180–260 LOC (spec tier dominant, per the branch's own +19% spec-tier trend), 2–3 review rounds | ✅ **Recommended** |
| B | Separate spec under `docs/specs/changes/innovation-use-level-guidance/` | Full requirements/design/tasks cycle **plus a second** full client suite + human visual + a11y pass over a page chunk 3 has not finished | ❌ Pays KZ-003's full-suite gate twice on the same file, and its D7/D8 human gates twice |
| C | New child row in `family.md` + child folder | B's cost plus manifest ceremony, for work that shares chunk 3's every file | ❌ The family's own rule — "each chunk consumes the previous one's artifact" — does not describe this; it is not a chunk |

Sub-option rejected inside A: **putting paragraph 1 into `app-textarea`'s `helperText`.** `helperText`
renders through `[innerHTML]` (`textarea.component.html:41`), which Angular sanitizes and does **not**
compile — a `routerLink` inside it is inert, and a raw `href` would full-page-reload the SPA. The
in-app Evidence link is therefore only possible from the page template. This is also why the block is
**not** attached to the textarea: the textarea is conditional at `level >= 6`, and evidence guidance
must not be.

## Recommended Approach

**Option A.** The smallest safe path, for three reasons that are specific to this branch, not general
preference:

1. **The expensive half of the verification gate is unspent.** `T-13` c1/c7/c8/c9 — the e2e pass, the
   human visual check, the T6 screenshot review and the keyboard pass — are still owed. A change
   landing before them is verified by passes that were already due; a change landing after forces a
   second round of *human* work, which is the costly kind.
2. ~~**`T-11` and `T-12` are the natural owners.**~~ **Withdrawn (Correction 1): both are `done`.**
   `T-14` therefore carries its own scoped equivalents (`c8` mirrors `T-11 c1`'s zero-hex grep, `c3`
   mirrors `T-11 c2`'s accessible-name check), and **no `docs/ux-ui/design.md` registration is owed**
   because no token is added. Neither done task is reopened.
3. **The file is single-writer today.** `execution.md` mandates one client task at a time in this
   checkout; a parallel spec on `innovation-use-details.component.html` would contend with T-10.

Execution shape: **one new task, T-14**, placed **before T-11** so the a11y/token/design-registration
tasks see the final surface. `tasks.md` §6's derivation and `design.md` §12's budget both need the
delta recorded — the running total is already **4,871 LOC against ~3,200 budgeted**, so T-14 must be
added to the ledger explicitly, not absorbed.

## Risks, Dependencies, And Open Questions

| ID | Risk / dependency | Sev | Mitigation |
| --- | --- | --- | --- |
| RK-A1 | The Evidence link drops `version` / `from` and strands the reporter on the wrong result version | **High** | R-IUP-021 asserts the built `commands` **and** `queryParams` against `navigateTo()`'s shape, not merely "router.navigate was called" — **KZ-001 (`innovation-use` lineage), recurrence 4**: a double that doesn't evaluate what it stands in for goes green over this exactly |
| RK-A2 | Editing `innovation-use-details.component.html` regresses something else rendered on that route | Medium | Blast radius enumerated **by what renders**, not by folder — KZ-002 (`innovation-use` lineage, recurrence 6). Gate is a **full** client suite, not a targeted one — KZ-003 |
| RK-A3 | "Harmonizing" the Dev page's callout in the same pass breaks R-IUP-019 | Medium | R-IUP-019 is unchanged and `T-14` must state the Dev page is out of its file set |
| RK-A4 | New blocks fail contrast; jsdom measures none of it, and `axe` returning *incomplete* has evaluated nothing | **High** *(raised at specify — the failure is now measured, not hypothetical: see the correction box)* | Tokens fixed by **DD-17** and computed at `T-14` c12; rendered check at `T-13` c7, **light theme only** (Correction 4, `DD-14`) under `AR-2` — a human gate, **never** reported as automated coverage |
| RK-A5 | The budget ledger absorbs T-14 silently on a spec already 52% over its LOC line | Medium | T-14 gets its own ledger row before execution; `design.md` §12 re-stated once, citing its deriving command — **KZ-005, recurrence 6**: one home per measured figure, not a better sweep |
| DEP-1 | Chunk 3's `T-10` must land first (it owns the route and sidebar rows this page is reached through) | — | Sequence T-14 after T-10 |
| DEP-2 | The two URLs must be live and public | Low | Verify both return 200 unauthenticated at the specify gate. The Drive link in particular must be **anyone-with-the-link**, or every reporter outside CGIAR hits a permission wall |
| **OQ-A1** | The two original screenshots are not persisted (see §Visual Reference) | — | User re-attaches them to `mockup/` before `/akili-specify` |
| **OQ-A2** | D-1 was answered by supplying the definitions URL, not by picking the label option. **Assumption taken:** the label changes, per *"sobre el selector debe ir el texto tal cual como en la imagen guía"* | — | Confirm at the specify gate. If the label stays, R-IUP-005 needs no amendment at all |
| **OQ-A3** | D-3 leaves paragraph 2 saying *"current development/ maturity stage of the innovation"* on a **Use** page, while D-2 adapted paragraph 1 away from exactly that vocabulary. Recorded as intentional; flagged because a reviewer will read it as a missed sweep | — | Confirm, or adapt the tail to "current use level of the innovation" |
| **OQ-A4** | Is a Google Drive PDF an acceptable long-term home for the definitions, or a stopgap? | — | Product call. If stopgap, an in-app definitions view is a follow-up spec, not a widening of T-14 |

~~Carried, unchanged: chunk 3's `OQ-IUP-4` … **is now more likely to bite**.~~ **Withdrawn (Correction 3):** `OQ-IUP-4` is **closed for this amendment** — no token is added. `OQ-IUP-2` was resolved on 2026-08-21 at the `T-13` Pivot, and it turned out to be the wrong question (the blocker was `indicators.service.ts`'s `[1, 2, 4, 5]` allowlist, answerable from the repo all along).

## Success Criteria

| # | Criterion | How it is checked |
| --- | --- | --- |
| SC-1 | All four bullets render, in order, with the exact strings | Component spec asserting rendered text |
| SC-2 | The calculator link points at `https://www.scalingreadiness.org/calculator-use-headless/`, opens in a new tab, carries `rel="noopener noreferrer"` | Component spec asserting `href`, `target`, `rel` |
| SC-3 | The definitions link points at the supplied Drive URL and opens in a new tab | Component spec |
| SC-4 | Both paragraphs render with the exact approved strings (P1 adapted, P2 verbatim) | Component spec |
| SC-5 | `Click here to go there` navigates to `/result/:id/evidence` **with `version` and `from` preserved** — asserted on the built commands and query params, not on the fact that navigate was called | Component spec with a `Router` spy asserting both arguments |
| SC-6 | Blocks 2, 4 and 5 render at every level (including none selected) and in a non-editable status | Component spec across level `null`, `0`, `9`, and `isEditableStatus() === false` |
| SC-7 | The stepper, the definition box, and `showJustification()` behave exactly as before | Existing T-04/T-07/T-09 specs pass unmodified |
| SC-8 | The Innovation Development page is byte-identical | `git diff --stat` shows no `innovation-details/` file |
| SC-9 | Full client suite green, coverage floors held, build clean, bundle within `angular.json` budgets | `T-13`'s existing commands, re-run |
| SC-10 | **Light theme only** (Correction 4) at 1440 px and the `md:` breakpoint reviewed by a human; new links have discernible names and visible focus | **Human gate under `AR-2`. No automated gate exists for D7/D8 — this criterion must never be reported as automated coverage** |

## Next Step

```text
/akili-specify docs/specs/innovation-use/details-page
```

Amendment mode: add **R-IUP-020** and **R-IUP-021**, amend **R-IUP-005**'s label clause, add **T-14**
(sequenced after `T-10`, before `T-11`), extend `T-11`/`T-12`/`T-13`'s criteria over the new blocks,
and record T-14's row in the `execution.md` budget ledger.

> Not `/akili-quick`: the Evidence link is routing behavior with a query-param contract (RK-A1), and
> the change lands inside a spec that is mid-execution with an open verification gate. Neither is a
> trivial cosmetic edit.
