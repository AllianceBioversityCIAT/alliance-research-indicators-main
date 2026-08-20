# Proposal — Innovation Use: Details Page (STAR)

> **Chunk 3 of 3** in the `innovation-use` spec family. Client-only. This is the deliverable the user story actually asks for.

---

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/details-page/` |
| Parent Spec | `docs/specs/innovation-use/` |
| Slug | `details-page` — derived from the free-text `/akili-propose` argument |
| Type | Change |
| Approval Mode | gated |
| Depends on | `docs/specs/innovation-use/details-api` — **archived 2026-08-20** → [`docs/specs/archive/2026-08-20-innovation-use--details-api/`](../../archive/2026-08-20-innovation-use--details-api/). Its `design.md` §4 is chunk 3's interface contract; read that table, **including its `400` rows** (two were added at archive-time validation) |
| Parallel-safe | no |
| Tier | client (`client/research-indicators`) |
| Branch in flight | `AC-1679-Create-the-innovation-use-section` |
| Created | 2026-08-14 |

---

## Intent

When a user creates or opens a result whose indicator is Innovation Use, STAR shows a seven-section reporting page whose new **Innovation use details** section captures the use level, actors, organizations, and quantitative measures — built from STAR's own components and tokens, not PRMS's.

---

## Problem / Current Behavior

Selecting Innovation Use in STAR today leads to a **dead end**, because the client has three indicator→section wiring points and indicator 6 is absent from all of them:

| Wiring point | File | State for indicator 6 |
| --- | --- | --- |
| Sidebar section list | `shared/components/result-sidebar/result-sidebar.component.ts:213-260` (`allOptions`) | ❌ no entry — the sidebar renders only the six common sections |
| Route child | `app.routes.ts:143` (siblings for each detail page) | ❌ no `innovation-use-details` route |
| Active-section resolver | `shared/services/cache/cache.service.ts:56-68` (`currentResultIndicatorSectionPath`) | ❌ falls through to `''` |

Meanwhile the indicator **is** selectable: `IndicatorsService.findAll()` filters only on `is_active`, and indicator 6 was seeded active with its `long_description`. `GetInnoUseOutputService` already queries `indicator-codes: [6]`. So the entry point is likely live while the destination is not — this chunk closes an existing gap rather than opening a new one. **Confirm against the deployed environment during specify** (family risk FR-5).

The section is also **not** a copy of the PRMS screenshot. The user was explicit: *"la imagen suministrada no es un mock de star sino una seccion de otra plataforma"* — PRMS defines the fields; STAR defines the look.

---

## Proposed Outcome

- Creating a result with indicator Innovation Use lands on a page with seven sidebar sections: General information, Alliance alignment, **Innovation use details**, Results partners, Geographic scope, Evidence, IP rights.
- The Innovation use details section renders, in STAR's visual language (the `innovation-details` page is the reference):
  - A **0–9 level stepper** identical in style to the readiness stepper, showing the selected level's `name` + `definition` in a bordered callout.
  - A conditional **level justification** textarea, visible and mandatory only at level ≥ 6.
  - Repeatable **Actor** cards: actor type dropdown (CLARISA), four non-negative integer count fields, and a **read-only** auto-computed total.
  - Repeatable **Organization** rows.
  - Repeatable **Other quantitative measures** rows (unit + quantity).
- Mandatory fields carry the red asterisk; invalid fields show STAR's inline `This field is required` treatment naming the field.
- Section status refreshes after create, update, delete, and conditional changes; green checks appear in the sidebar; Submit is blocked while anything mandatory is missing.
- Drafts save and resume. Light and dark themes both render correctly.

---

## Scope

**In**

1. New lazy standalone page under `pages/platform/pages/result/pages/innovation-use-details/`.
2. Route registration in `app.routes.ts`; sidebar entry (`indicator_id: 6`, `greenCheckKey: 'innovation_use'`); `cache.service.ts` section-path case.
3. Sidebar `IP rights` entry for `indicator_id: 6` (product owner confirmed IP Rights is in scope, reusing the existing section).
4. Typed interface + `ApiService` methods for the chunk-2 endpoints and the use-level control list.
5. The level stepper, conditional explanation, and the three repeatable blocks.
6. Client-side mirror of the server validations (non-negative integers, duplicate actor types, conditional explanation) — mirroring, never replacing, per **AC-Role-Correctness**.
7. Reuse decision for `actor-item` / `organization-item` (see Approach Options).
8. Co-located `*.spec.ts`; **full** client suite green.

**Out**

- Schema, stored function, endpoints → chunks 1 and 2.
- Investment / co-investment table (family non-goal).
- Any behavior change to General Information, Alignment, Partners, Geographic Scope, Evidence, or IP Rights beyond adding indicator 6 to their visibility rules.
- Results Center filters, dashboard tiles, or export changes for Innovation Use.

---

## Non-Goals

- Replicating PRMS's visual layout, spacing, or component styling.
- Introducing new design tokens or hex literals — token utilities (`.abc-*`, `.atc-*`, `.rs-*`, `.fs-*`) or `var(--ac-*)` only.
- NgModules, NgRx, or direct `HttpClient` use in components.

---

## Affected Users, Systems, And Specs

| Area | Impact |
| --- | --- |
| `pages/platform/pages/result/pages/innovation-use-details/` | **new** page |
| `app.routes.ts` | new lazy child route |
| `shared/components/result-sidebar/result-sidebar.component.ts` | 2 new `allOptions` entries |
| `shared/services/cache/cache.service.ts` | new `case 6` |
| `shared/services/api.service.ts` | new methods |
| `shared/interfaces/` | new `GetInnovationUseDetails` interface |
| `pages/.../innovation-details/components/{actor-item,organization-item}/` | **possible promotion to shared** — blast radius, see R-1 |
| Persona | Result Contributor (US-RC-1, US-RC-2, R-2, R-5), MEL Expert (read/review) |
| PRD | G6, G7, G8; AC-Controlled-Lists, AC-Theming, AC-Accessibility, AC-Performance, AC-Testing |

---

## Visual Reference

- **Source:** Screenshots supplied in the `/akili-propose` invocation (2026-08-14). No Figma link; no generated mockup — the user confirmed the pasted story is 100% of the requirement source, and STAR's live `innovation-details` page already provides the design system this section must match.
- **Location:**
  - **PRMS Innovation Use reporting form** — *field inventory only*. Defines which inputs exist, their labels, and their grouping. **Explicitly not a STAR mock**; its layout, colors, and controls must not be copied.
  - **STAR `innovation-details` page (result STAR-19530)** — the **binding** style and component reference: the 0–9 stepper with its definition callout, the `Readiness explanation` textarea with word counter and inline required message, the sidebar with per-section status circles and the `n/7 sections completed` counter, and the Back / Next / Save footer.
- **Notes:** The live page at `pages/.../innovation-details/innovation-details.component.html` is the concrete template to mirror. A generated mockup was offered and is unnecessary given a production reference exists — request one during specify if the layout of the repeatable blocks proves ambiguous.

---

## Requirement Delta Preview

### ADDED

- An `Innovation use details` section reachable at a new route for indicator-6 results.
- A 0–9 use-level stepper with per-level definition display.
- A conditional level-justification field gated on level ≥ 6.
- Repeatable actor, organization, and quantitative-measure blocks with a read-only computed actor total.
- Sidebar completion status and submit gating for indicator 6.

### MODIFIED

- `result-sidebar` `allOptions` gains two entries (additive; existing indicators keep their exact section sets because entries are filtered by `indicator_id`).
- `cache.service.ts` `currentResultIndicatorSectionPath` gains `case 6` (previously fell through to `''`).
- If `actor-item` / `organization-item` are promoted to shared, their import paths change for the Innovation Dev page (behavior unchanged).

### REMOVED

- None.

---

## Approach Options

The real decision in this chunk is **how much of the Innovation Dev page to reuse**.

### Option A — Promote `actor-item` and `organization-item` to shared, new page composes them (recommended)

| | |
| --- | --- |
| ✅ | One implementation of the actor/organization card; a fix lands once |
| ✅ | Visual consistency between the two innovation sections is structural, not maintained by hand |
| ✅ | Aligns with the story's core instruction — reuse existing STAR components |
| ⚠️ | The components must become variant-aware (boolean segments for Dev, integer counts + total for Use) |
| ⚠️ | **Blast radius**: Innovation Dev renders these today. KZ-002 and KZ-003 both apply — enumerate by *what renders*, and run the **full** client suite |

### Option B — Duplicate the components under the new page

| | |
| --- | --- |
| ✅ | Zero risk to Innovation Dev; fastest to green |
| ❌ | Two actor cards drift apart on the next design change — exactly the fragmentation the PRD's reuse goal exists to prevent |
| ❌ | Doubles the test surface permanently |

### Option C — One shared page component parameterized by indicator

| | |
| --- | --- |
| ✅ | Maximum reuse |
| ❌ | Innovation Dev's section carries knowledge-sharing and scaling-potential subforms that Innovation Use has none of; the shared component becomes a branch tree |
| ❌ | Every Innovation Use change risks Innovation Dev at the page level, not just the card level |

---

## Recommended Approach

**Option A.** It reuses at the level where the two sections genuinely share a shape (the repeatable actor/organization card) and stops short of the level where they diverge (the page). Option C over-shares and turns two clear components into one conditional one; Option B is cheaper this week and more expensive every week after.

Option A's cost is a real blast radius, and it is exactly the failure mode Kaizen has already recorded twice:

- **KZ-002** — enumerate scope by *what renders*, not by where the feature folder lives. Every screen rendering `actor-item` must be listed in `design.md` before implementation, not discovered during review.
- **KZ-003** — a component many screens render requires a **full-suite** run. `npm test -- --silent` across the whole client, never a targeted suite.

If specify finds the two cards diverge more than expected, falling back to Option B is a documented, low-cost pivot.

---

## Risks, Dependencies, And Open Questions

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R-1 | Promoting shared components regresses Innovation Dev (KZ-002, KZ-003). | **High** | Enumerate every rendering screen in `design.md`; mandatory full client suite; Innovation Dev page spec must stay green unmodified. |
| R-2 | KZ-001 — a test double that doesn't render what it stands in for produces a green suite over a broken page. The existing `innovation-details.component.spec.ts` mocks `GetActorTypesService` and friends. | **High** | Verify double fidelity for the new specs: assert rendered output and computed totals, not just that a mock was called. |
| R-3 | The read-only computed total could disagree with the server's derived total. | Medium | Compute client-side for display only; re-read the server value after save and assert equality in a spec. |
| R-4 | Conditional visibility (level ≥ 6) that clears data on toggle would violate *"changing the response from Yes to No must not remove existing data without a save action."* | Medium | Hide, never clear. Cover with a spec that toggles below 6 and back and asserts the text survives. |
| R-5 | Numeric inputs accepting negatives, decimals, or paste-through of `-1`. | Medium | Validate on input and on blur, not only on submit; spec the paste path explicitly. |
| R-6 | A new lazy route pushing the initial bundle past the `angular.json` 2 MB warning. | Low | Lazy `loadComponent` like every sibling; check budgets in the verification gate. |
| R-7 | Dark-mode or a11y regressions on a new form-dense screen. | Low | Token utilities only; keyboard reachability, visible focus, labels, and contrast on the new controls (**AC-Accessibility**, WCAG 2.1 AA). |
| R-8 | Measuring while a delegated agent runs yields a *wrong* result, not a slow one (root `CLAUDE.md` §4.3 concurrency rule). | Low | Run builds/suites only in the window after a worker reports. |

**Dependencies**

- **Hard:** chunk 2 merged and its contract frozen — the page needs real endpoints and the use-level catalog.
- CLARISA actor types and institution types available through existing control-list services.

**Open Questions**

| ID | Question | Blocks |
| --- | --- | --- |
| OQ-1 | Family **OQ-F1** — is the "linked or bundled with another CGIAR-reported result?" Yes/No question in scope? It sits at the top of the PRMS form and a business rule references a Yes→No toggle, but it is absent from the story's field list. If in scope, does it reuse `links-to-result`? | section layout |
| OQ-2 | Family **OQ-F2** — are the "This is yet to be determined" controls in scope? | field set |
| ~~OQ-3~~ | ~~Four counts vs the screenshot's per-sex arithmetic?~~ **RESOLVED** → **D-3**: the user story governs, the image is reference only. Four disaggregated count fields with a derived read-only total. Plus **D-4**: when "sex and age disaggregation does not apply" is checked, the card shows a single "How many" that **is** the total (aggregate mode, mutually exclusive with the four). | — |
| OQ-6 | **Inherited trap (family D-1).** The 0–9 stepper must render and bind by **`level`**, not by the catalog `id` (`id = level + 1`). Level names repeat in pairs across adjacent levels ("Partners" at 2 *and* 3), so the callout must key on `level` and the component must not identify a level by name. | stepper correctness |
| OQ-4 | Should the Innovation Use section also appear in Results Center filters, the dashboard, and Excel export, or is this cycle page-only? | follow-up chunk |
| OQ-5 | Is the `Pool funding alignment` optional section applicable to indicator 6? It is currently unfiltered by indicator and shows whenever an alignment is eligible. | sidebar behavior |

---

## Success Criteria

- [ ] Creating a result with indicator Innovation Use opens the Innovation Use page with all seven sections in the sidebar.
- [ ] Selecting a level renders that level's `name` and `definition` in the STAR callout style.
- [ ] The justification field appears and is mandatory only at level ≥ 6; toggling below 6 hides it without discarding entered text.
- [ ] Adding an actor requires an actor type; the four counts reject negatives and decimals; the total updates live and is read-only.
- [ ] A second actor row cannot reuse an actor type already chosen on the result.
- [ ] Organizations and Other quantitative measures add, edit, and remove correctly.
- [ ] Saving a draft and reloading restores every field exactly.
- [ ] The sidebar status refreshes after create, update, delete, and conditional changes; Submit stays blocked while anything mandatory is missing, and the message names the field and its section.
- [ ] The Innovation Dev page renders and passes its existing specs unchanged.
- [ ] Light and dark themes render correctly; new controls meet WCAG 2.1 AA.
- [ ] **Full** `npm test -- --silent` and `npm run lint -- --quiet` pass in `client/research-indicators`; coverage floors held (statements 40 / branches 20 / lines 45 / functions 30); `angular.json` budgets respected.

---

## Next Step

Approve chunks 1 and 2 first. Then:

```text
/akili-specify docs/specs/innovation-use/details-page
```
