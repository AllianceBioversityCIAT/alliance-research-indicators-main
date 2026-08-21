# Requirements — Results (Innovation Use) / Details Page (STAR)

- **Module:** results (`innovation-use`) — **client tier** (`client/research-indicators`)
- **Spec id:** 2026-08-innovation-use-details-page
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked PRD sections:** [`docs/prd.md`](../../../prd.md) §3.1 (Result Contributor), §4.1 G6/G7/G8, §6 (US-RC-1, US-RC-2, R-2, R-5), §7 (AC-Controlled-Lists, AC-Role-Correctness, AC-Theming, AC-Accessibility, AC-Performance, AC-Testing)
- **Linked UX/UI sections:** [`docs/ux-ui/design.md`](../../../ux-ui/design.md) §1.1, §2.1, §5.1, §6.1, §7.1, §10.1, §11
- **Linked TRD sections:** [`docs/trd/trd.md`](../../../trd/trd.md) §4.2, §5.3, §6.3, §7.5, §8.1–8.5, §12, §13.2
- **Parent spec:** [`../family.md`](../family.md) — **chunk 3 of 3**
- **Proposal:** [`./proposal.md`](./proposal.md)
- **Extends:** [`docs/specs/archive/2026-08-20-innovation-use--details-api/`](../../archive/2026-08-20-innovation-use--details-api/) (chunk 2, archived — its `design.md` §4 is this spec's wire contract)
- **Depends on:** chunk 2 (`done`, archived 2026-08-20) and chunk 1 (`done`, archived 2026-08-19)
- **Depth:** **Full**
- **Linked tickets:** [AC-1679](https://cgiarmel.atlassian.net/browse/AC-1679)
- **Last updated:** 2026-08-20

---

## Document Control

| Field | Value |
| --- | --- |
| Type | Change |
| Approval Mode | **gated** (inherited from `family.md`) |
| Tier | client only — this spec makes **zero** server changes |
| Branch in flight | `AC-1679-Create-the-innovation-use-section` |
| Visual design context | Yes — PRMS screenshot (field inventory only) + the live STAR `innovation-details` page (binding style reference). No Figma, no generated mockup. UI-state and responsive requirements are therefore **explicit** below (R-IUP-017, R-IUP-018) |
| Dependency warning | none — both `Depends on` chunks are `Status: done` |
| Inherited open gate | family **FR-7** ([AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718)) is **OPEN** and owned by its own spec. It is **not** a blocker for this chunk and **must not** be closed by it |

---

## Executive Summary

**Today, choosing Innovation Use in STAR leads to a dead end.** Indicator 6 is selectable — `GetAllIndicatorsService` applies no client-side filter and the server returns any `is_active` indicator — but the client has no section for it: no sidebar row, no route, and `CacheService.currentResultIndicatorSectionPath()` returns `''` for indicator 6, so *Alliance alignment → Next* and *Results partners → Back* navigate to a non-route.

Chunks 1 and 2 built the schema, the green check, and a frozen REST contract. **This chunk builds the only part a user can see.**

It delivers one new lazy standalone page — `Innovation use details` — plus the three wiring edits that make it reachable, a typed client for the chunk-2 endpoints, and a client-side mirror of the server's validation rules. The page renders in STAR's own visual language: a 0–9 level stepper with a definition callout, a conditional justification textarea, and three repeatable blocks (Actors with integer counts and a read-only computed total, Organizations, Other quantitative measures).

**The scope fence that matters most:** the section's completion contract is not a matter of judgment. It is the stored function `innovation_use_validation`, transcribed verbatim in §6.1 below. Organizations and quantitative measures are **outside** it — they must not be presented as mandatory.

---

## 1. Context

Chunk 3 of the `innovation-use` family. The user story asked for a reporting page for the Innovation Use indicator; chunks 1 and 2 built everything underneath it and shipped no user-visible surface at all.

**Why now:** the entry point is already live in production while the destination does not exist (family risk **FR-5**, confirmed by code inspection in §6.4). This spec closes an existing gap rather than opening a new one.

**Who asked:** product owner, via the user story pasted verbatim into `/akili-propose` on 2026-08-14 and confirmed as 100% of the requirement source.

**What is explicitly NOT changing:**

- Any server file. No migration, no endpoint, no DTO, no stored function.
- The business rules of General Information, Alliance alignment, Results partners, Geographic scope, Evidence, or IP rights — beyond adding indicator 6 to the visibility rules that gate them.
- The Innovation **Dev** page's rendered behavior (R-IUP-019).
- `customSaveInnovationDev`'s authorization gap (family **FR-7** / AC-1718) — a different spec's problem.

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Innovation Use** | Result category `IndicatorsEnum.INNOVATION_USE = 6`. Distinct from Innovation **Dev** (= 2) |
| **Use level** | A point on the 0–9 innovation-use scale. Stored as an FK to `clarisa_innovation_use_levels`, where **`id = level + 1`** |
| **Level name collision** | Catalog `name` values repeat in **pairs** across adjacent levels ("Partners" at level 2 *and* 3). A level can never be identified by name |
| **Aggregate mode** | An actor row where `sex_age_disaggregation_not_apply = true`; the single `actors_count` **is** the total (family **D-4**) |
| **Disaggregated mode** | An actor row where the flag is false/absent; the four `*_count` fields carry the data and their sum is the total |
| **Derived total** | The actor row's total. Computed, never stored, never accepted by the API (`whitelist: true` strips it) |
| **Green check** | Per-section completion tick. Computed server-side by a MySQL stored function; the client only reads `GET results/green-checks/:id` |
| **Section path** | `CacheService.currentResultIndicatorSectionPath()` — the indicator→route map used by two sibling pages for Next/Back navigation |
| **Blank row** | A repeatable-block card the user added but never filled. A UI affordance that must never reach the API |

---

## 3. System Context & Scope

### 3.1 In scope

| # | Deliverable |
| --- | --- |
| 1 | New lazy standalone page at `pages/platform/pages/result/pages/innovation-use-details/` |
| 2 | Route child `innovation-use-details` in `app.routes.ts` |
| 3 | Two `allOptions` rows in `result-sidebar.component.ts`: `Innovation use details` (indicator 6, `greenCheckKey: 'innovation_use'`) and `IP rights` (indicator 6, `greenCheckKey: 'ip_rights'`) |
| 4 | `case 6` in `CacheService.currentResultIndicatorSectionPath()` |
| 5 | `innovation_use` on the client `GreenChecks` interface |
| 6 | `ApiService` methods + typed interface for the two chunk-2 result endpoints and the level catalog |
| 7 | A control-list service for the 0–9 catalog, ordered by `level` |
| 8 | The level stepper, the conditional justification, and the three repeatable blocks |
| 9 | Client-side mirror of the server's validation rules (mirroring, never replacing — PRD **AC-Role-Correctness**) |
| 10 | Co-located `*.spec.ts` for every file added or changed |

### 3.2 Out of scope

| Excluded | Owner |
| --- | --- |
| Schema, stored functions, endpoints, DTOs | chunks 1 & 2 (`done`) |
| Investment / co-investment USD tables | family non-goal (product-owner ruling 2026-08-14) |
| The *"linked or bundled with another CGIAR result?"* Yes/No question | family **OQ-F1** — ruled **out of scope**; must not reappear here |
| *"This is yet to be determined"* tri-state controls | family **OQ-F2** — ruled **out of scope**; `null` already means "not answered" |
| Results Center filters, dashboard tiles, Excel export for indicator 6 | **D-IUP-6** — deferred to a follow-up spec |
| `customSaveInnovationDev` authorization repair | family **FR-7** / AC-1718 |
| New design tokens, hex literals, NgModules, NgRx, raw `HttpClient` in components | PRD constraints C-1…C-6 |

---

## 4. Stakeholders / Personas

| Persona (PRD §3) | Interest |
| --- | --- |
| **Result Contributor / Researcher** | Primary actor. Creates an indicator-6 result and must be able to complete and submit it (US-RC-1, US-RC-2, R-2, R-5) |
| **MEL Regional Expert** | Reads and reviews the section on a submitted result; must see every captured value in a non-editable state |
| **Center Admin** | Monitors indicator-6 results in flight; depends on the completion counter being truthful |
| **Innovation Dev reporters** (indirect) | Must observe **no change** to their page (R-IUP-019) |

---

## 5. Requirement numbering

`R-IUP-<NNN>` for functional, `NFR-IUP-<NNN>` for non-functional. `IUP` = **I**nnovation **U**se **P**age, distinct from chunk 1's `R-IU-` and chunk 2's `R-IUA-`.

Ordered foundation-first: reachability (001–003) → the section's fields (004–012) → persistence (013–014) → status and completion (015–016) → surfaces and blast radius (017–019).

---

## 6. Binding contracts (read before writing any requirement or task)

These are transcriptions, not paraphrases. Every requirement below is derived from them.

### 6.1 The completion contract — `innovation_use_validation`

Transcribed from `server/researchindicators/src/db/migrations/1787078283929-createInnovationUseValidation.ts`. The green check returns true **only when all five conjuncts hold**:

| # | Conjunct | Client consequence |
| --- | --- | --- |
| C1 | `result_innovation_use.innovation_use_level_id IS NOT NULL` | The use level is **mandatory** |
| C2 | `IF(level >= 6, valid_text(explanation), TRUE)` — where `level` comes from **joining the catalog**, not the FK | The justification is mandatory **only at level ≥ 6** |
| C3 | `COUNT(result_actors WHERE actor_role_id = 2 AND is_active) > 0` | **At least one actor row is mandatory** |
| C4 | Every such row: `IF(actor_type_id = 5, valid_text(actor_type_custom_name), TRUE)` | The "Specify other" text is mandatory when actor type is `OTHER` (= 5) |
| C5 | Every such row: `IF(sex_age_disaggregation_not_apply, actors_count IS NOT NULL, women_youth_count IS NOT NULL OR women_not_youth_count IS NOT NULL OR men_youth_count IS NOT NULL OR men_not_youth_count IS NOT NULL)` | Each actor row needs **at least one count in its active mode** |

**Organizations and quantifications appear nowhere in this function.** They are optional data. Presenting either as required would make the page contradict its own green check — the user would see a red asterisk they can satisfy and a tick that was already green, or worse, a blocked submit with no failing check to point at.

### 6.2 The wire contract — chunk 2, frozen

Endpoints (global prefix `/api/v1`, reached through `ApiService`; base URL `environment.mainApiUrl`):

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `results/innovation-use/:resultCode` | Load the whole section |
| `PATCH` | `results/innovation-use/:resultCode` | Save the whole section; response `data` is the re-read GET shape |
| `GET` | `tools/clarisa/innovation-use-levels` | The 0–9 catalog, **ordered by `level` ASC** |

Response `data` for both result endpoints:

```
{
  innovation_use_level_id, innovation_use_level (the resolved scale point), innovation_use_level_explanation,
  actors: [{ result_actors_id, actor_type_id, actor_type_custom_name, sex_age_disaggregation_not_apply,
             women_youth_count, women_not_youth_count, men_youth_count, men_not_youth_count,
             actors_count, total }],
  organizations: [{ result_institution_type_id, institution_id, institution_type_id,
                    sub_institution_type_id, institution_type_custom_name,
                    is_organization_known, organization_count }],
  quantifications: [{ id, quantification_number, unit, description }]
}
```

**`400` responses the client can provoke** (chunk 2 `design.md` §4 — the full table; each one is a payload the client must not construct):

| Trigger | Client obligation |
| --- | --- |
| Negative or fractional count | Prevent at the input (R-IUP-008) |
| Both count modes populated on one row | Structurally impossible in the UI (R-IUP-007) |
| Missing `actor_type_id` | Filter blank actor rows before send (R-IUP-013) |
| Missing justification at effective `level >= 6` | Mirror the rule (R-IUP-006) |
| Duplicate actor type in the payload | Mirror the rule (R-IUP-009) |
| Unknown `innovation_use_level_id` | Only ever send an id from the catalog (R-IUP-005) |
| A `result_actors_id` / `result_institution_type_id` not owned by this result+role | Only ever echo back ids received from the GET (R-IUP-013) |
| The **same** id submitted by two rows | Never duplicate an id across rows (R-IUP-013) |
| An organization row identifying no organization | Filter blank organization rows before send (R-IUP-010, R-IUP-013) |
| `ResultStatusGuard` rejection (note: **`400`**, not `403`) | Do not attempt to save in a non-editable status (R-IUP-015) |

### 6.3 The catalog — all ten rows

Seeded by migration `1787066437593`. `id = level + 1`; `additional_guidance` **does not exist** on this table (unlike the readiness catalog the stepper is modelled on).

| id | level | name | definition |
| --- | --- | --- | --- |
| 1 | 0 | No use | Innovation is not used. |
| 2 | 1 | Project lead organization | Innovation is used by organization(s) leading the innovation development. |
| 3 | 2 | Partners | Innovation is used by some partners involved in initial innovation development. |
| 4 | 3 | Partners | Innovation is commonly used by partners involved in initial innovation development. |
| 5 | 4 | Connected next-user | Innovation is used by some organizations connected to partners involved in the initial innovation development. |
| 6 | 5 | Connected next-user | Innovation is commonly used by organizations connected to partners involved in the initial innovation development. |
| 7 | 6 | Unconnected next-user | Innovation is used by organizations not connected to partners involved in the initial innovation development. |
| 8 | 7 | Unconnected next-user | Innovation is commonly used by organizations not connected to partners involved in the initial innovation development. |
| 9 | 8 | End-user / Beneficiaries | Innovation is used by some end-users or beneficiaries who were not involved in the initial innovation development. |
| 10 | 9 | End-user / Beneficiaries | Innovation is commonly used by end-users or beneficiaries who were not involved in the initial innovation development. |

> **Two traps live in this table.** `innovation_use_level_id >= 6` is off by one — id 6 is level **5**. And `name` alone identifies nothing: five names each cover two levels.

### 6.4 The current dead end — verified, not assumed

| Wiring point | File:line | State for indicator 6 | Live consumers |
| --- | --- | --- | --- |
| Sidebar section list | `result-sidebar.component.ts:118-194` (`allOptions`) | No `indicator_id: 6` row exists. The filter at `:73` keeps a row only when `indicator_id` matches or is absent, so indicator 6 renders the six common sections and **no** detail section and **no** IP rights | the sidebar itself |
| Route child | `app.routes.ts:141-145` | No `innovation-use-details` child | the router |
| Section path map | `cache.service.ts:55-68` | `switch` has cases 1, 2, 4, 5 and `default: ''` | **two live consumers**: `alliance-alignment.component.ts:338` (Next) and `partners.component.ts:73` (Back). Both currently navigate to `['result', id, '']` for indicator 6 |
| Green check keys emitted | `green-checks.repository.ts:96-118` | For indicator 6 the server **already** emits `innovation_use` **and** `ip_rights` alongside the five common keys | `result-sidebar.component.ts:78`, `submission.service.ts:36` |
| Client `GreenChecks` interface | `get-green-checks.interface.ts` | Has neither `innovation_use` nor `ip_rights` | typed reads only; the runtime lookup is an `as keyof` cast, so this is a type gap, not a behavior gap |
| Indicator selectability | `get-all-indicators.service.ts` | **No client-side filter.** Any `is_active` indicator the server returns is offered | the create-result flow |
| `validateOpenResult` | `current-result.service.ts:53` | Returns true only for indicator 5 or specific OICR statuses — indicator 6 takes no special path | the resolver and the sidebar |

**Conclusion:** the entry point is live, three wiring points are missing, and two sibling pages already have broken Next/Back for indicator 6. **AND IT MUST be re-confirmed against the deployed environment before implementation starts** (family FR-5) — code inspection proves the client-side gap, not that indicator 6 is `is_active` in the target database.

---

## 7. Functional requirements

### R-IUP-001 — The Innovation Use section set is reachable from the sidebar

- **As a** Result Contributor
- **I want** an indicator-6 result to show its own section list
- **So that** I can navigate to every part of the record I have to complete

**Details**

- Inputs: `CacheService.currentMetadata().indicator_id === 6`.
- Behavior: `allOptions` gains exactly two rows — `Innovation use details` (`path: 'innovation-use-details'`, `indicator_id: 6`, `greenCheckKey: 'innovation_use'`) and `IP rights` (`path: 'ip-rights'`, `indicator_id: 6`, `greenCheckKey: 'ip_rights'`). Both are additive; existing indicators keep their exact section sets because the filter at `:73` is keyed on `indicator_id`.
- Ordering: the new detail row sits with the other indicator-specific detail rows — after `Alliance alignment`, before `Results partners` — so the rendered order for indicator 6 is General information → Alliance alignment → Innovation use details → Results partners → Geographic scope → Evidence → IP rights.
- Outputs: seven counted sections; the counter reads `n/7`.

**Acceptance criteria**

- [ ] AC.1 — With `indicator_id = 6`, `allOptionsWithGreenChecks()` yields exactly these seven `path` values in this order: `general-information`, `alliance-alignment`, `innovation-use-details`, `partners`, `geographic-scope`, `evidence`, `ip-rights`.
- [ ] AC.2 — `getTotalCount()` returns `7` for indicator 6.
- [ ] AC.3 — For indicators 1, 2, 4 and 5 the yielded `path` list is **byte-identical** to the list produced before this change.
- [ ] AC.4 — The `Innovation use details` row's tick reflects `greenChecks().innovation_use`; the indicator-6 `IP rights` row's tick reflects `greenChecks().ip_rights`.

#### Scenario: An Innovation Use result shows seven sections

- GIVEN a result whose `indicator_id` is `6`
- WHEN the result sidebar renders
- THEN seven section rows appear in the order above
- AND the completion counter reads `n/7`
- BUT it must NOT show `Innovation details`, `CapSharing details`, `Policy Change details`, `OICR Details`, or `Links to result`
- AND IT MUST leave the section list of every other indicator unchanged.

> **Pool funding alignment** is unaffected and deliberately untouched: its row carries no `indicator_id`, so it already renders for indicator 6 whenever `BilateralService.currentAlignment().eligible === true`, and `optional: true` keeps it out of the counter and out of submit gating (**D-IUP-5**). It is not one of the seven.

---

### R-IUP-002 — The Innovation Use details route exists and loads lazily

- **As a** Result Contributor
- **I want** `/result/:id/innovation-use-details` to open the section
- **So that** the sidebar link, a deep link, and a shared URL all work

**Details**

- Behavior: a child route `innovation-use-details` under the existing `result/:id` route, registered with `loadComponent: () => import(...)` and the same `data: createResultData()` as its eleven siblings.
- Outputs: the page renders inside the result shell with the second-level sidebar.

**Acceptance criteria**

- [ ] AC.1 — Navigating to `/result/<numeric-id>/innovation-use-details` renders the page.
- [ ] AC.2 — The route is declared with `loadComponent`, not `component`.
- [ ] AC.3 — `?version=N` survives navigation into and out of the section, exactly as it does for `innovation-details`.

#### Scenario: A deep link opens the section directly

- GIVEN an indicator-6 result with id `1234`
- WHEN a user opens `/result/1234/innovation-use-details?version=2`
- THEN the Innovation Use details section renders for version 2
- BUT it must NOT be eagerly bundled into the initial chunk
- AND IT MUST keep the `version` query parameter on every Back/Next navigation out of the page.

---

### R-IUP-003 — Sibling Next/Back navigation reaches the section

- **As a** Result Contributor
- **I want** *Alliance alignment → Next* and *Results partners → Back* to land on the Innovation Use section
- **So that** the linear reporting flow is not broken for my indicator

**Details**

- Behavior: `CacheService.currentResultIndicatorSectionPath()` gains `case 6: return 'innovation-use-details';`.
- The page's own footer navigates Back → `alliance-alignment`, Next → `partners`, matching the sibling detail pages.

**Acceptance criteria**

- [ ] AC.1 — With `indicator_id = 6`, `currentResultIndicatorSectionPath()` returns `'innovation-use-details'`.
- [ ] AC.2 — The computed still returns `capacity-sharing` / `innovation-details` / `policy-change` / `oicr-details` for indicators 1 / 2 / 4 / 5, and `''` for any other value.
- [ ] AC.3 — On an indicator-6 result, `alliance-alignment`'s **Next** navigates to `['result', <id>, 'innovation-use-details']`.
- [ ] AC.4 — On an indicator-6 result, `partners`' **Back** navigates to `['result', <id>, 'innovation-use-details']`.

#### Scenario: The linear flow closes

- GIVEN an indicator-6 result open on Alliance alignment
- WHEN the user saves and presses Next
- THEN the router navigates to the Innovation Use details section
- BUT it must NOT navigate to `['result', <id>, '']`
- AND IT MUST behave symmetrically from Results partners' Back button.

> AC.3 and AC.4 exist because AC.1 alone is a **presence assertion**: it proves the map returns a string, not that any screen uses it. The two consumers are named in §6.4 and each must be asserted at its own call site.

---

### R-IUP-004 — The section loads and renders its four UI states

- **As a** Result Contributor
- **I want** the section to tell me whether it is loading, empty, broken, or saved
- **So that** I never mistake a failed load for an empty record

**Details**

- Inputs: `GET results/innovation-use/:resultCode`, called with the established `{ loadingTrigger: true, useResultInterceptor: true }` config so `ToPromiseService` clears and re-reads green checks around it.
- Behavior: four states, each visually distinct.

| State | Rendering |
| --- | --- |
| **Loading** | The shared skeleton treatment the custom-field components already provide via `CacheService.currentResultIsLoading` |
| **Empty** (200, all nulls / empty arrays) | No level selected, the level-required inline message shown, one blank Actor card offered as an affordance, no Organization or quantification cards |
| **Error** (`successfulRequest === false`) | The failure is passed to `ActionsService` for the standard toast/alert; the form is not left silently blank |
| **Success** | Every stored value rendered; the derived total shown per actor row |

**Acceptance criteria**

- [ ] AC.1 — A `200` with `{innovation_use_level_id: null, actors: [], organizations: [], quantifications: []}` renders the empty state, including exactly one blank Actor card.
- [ ] AC.2 — A `200` carrying data renders every scalar and every row.
- [ ] AC.3 — A non-2xx response reaches `ActionsService` and does not render as an empty record.
- [ ] AC.4 — The GET is issued with `loadingTrigger: true`, so green checks are refreshed on every load.

#### Scenario: A failed load is not mistaken for an empty section

- GIVEN the GET returns `successfulRequest: false`
- WHEN the section renders
- THEN the user sees the platform's error surface
- BUT it must NOT render as a clean empty form with all fields blank
- AND IT MUST NOT overwrite the cached green checks with an all-false set derived from the failure.

---

### R-IUP-005 — The 0–9 use-level stepper binds by `level`, never by `id` and never by `name`

- **As a** Result Contributor
- **I want** to pick the innovation's current use level and read what that level means
- **So that** I report the right point on the scale

**Details**

- Inputs: the catalog from `GET tools/clarisa/innovation-use-levels` (already `ORDER BY level ASC` server-side).
- Behavior: ten buttons labelled `0`…`9` rendered from each row's `level`. Selecting one stores that row's **`id`** in `innovation_use_level_id`. The selected level's `level - name` and `definition` render in a bordered callout in the same treatment as the readiness stepper.
- Outputs: `innovation_use_level_id` on the payload.

**Acceptance criteria**

- [ ] AC.1 — Ten buttons render, labelled `0` through `9`, in ascending `level` order.
- [ ] AC.2 — Selecting the button labelled `n` sets `innovation_use_level_id` to the catalog row whose `level === n` — i.e. `n + 1` for the seeded catalog.
- [ ] AC.3 — Loading a result with `innovation_use_level_id = 7` highlights the button labelled `6` and shows the level-6 callout.
- [ ] AC.4 — The callout renders `level`, `name`, and `definition` only.
- [ ] AC.5 — The stepper is mandatory: with no level selected, the inline required message shows and the section's green check is false.
- [ ] AC.6 — No code path resolves a level from `name`, and no comparison is made against `innovation_use_level_id` as though it were a scale point.

#### Scenario: The off-by-one trap does not fire

- GIVEN the seeded catalog where `id = level + 1`
- WHEN the user selects the button labelled `6`
- THEN the payload carries `innovation_use_level_id: 7`
- AND the callout reads `6 - Unconnected next-user` with that level's definition
- BUT it must NOT render `additional_guidance` — the column does not exist on this catalog and would render `undefined`
- AND IT MUST NOT identify the level by `name`, because five names each cover two adjacent levels.

---

### R-IUP-006 — The level justification is conditional on `level >= 6`, and hiding it never discards it

- **As a** Result Contributor
- **I want** to explain a high use level, and not lose what I typed if I revise the level
- **So that** I can revisit my answer without retyping

**Details**

- Behavior: a textarea bound to `innovation_use_level_explanation`, rendered **only** when the selected level (the resolved `level`, not the id) is `>= 6`, and marked mandatory in that case.
- Toggling below 6 **hides** the control. It does not clear the value in the in-memory body, and it does not send `null`.

**Acceptance criteria**

- [ ] AC.1 — At level `< 6` the textarea is absent and the section can be complete without it.
- [ ] AC.2 — At level `>= 6` the textarea is present, carries the red asterisk, and shows the inline required message while blank.
- [ ] AC.3 — Typing text at level 7, then selecting level 3, then selecting level 7 again shows the original text unchanged.
- [ ] AC.4 — The condition is evaluated on the resolved `level`, not on `innovation_use_level_id`.

#### Scenario: Lowering the level does not destroy the justification

- GIVEN a result at level 7 with the justification `"used across three countries"`
- WHEN the user selects level 3 and then level 7 again
- THEN the textarea shows `"used across three countries"`
- BUT it must NOT clear the value on the toggle, and must NOT send an explicit `null` for it
- AND IT MUST NOT block completion at level 3 on account of a justification the level does not require.

> **Why "hide, never clear" and not "clear on toggle":** chunk 2 resolves the effective explanation as *key-present ? payload : stored* — an explicit `null` is a **present key** and **clears the stored value**. Clearing on toggle would therefore be a silent data loss on the very next save, not merely a UI reset.

---

### R-IUP-007 — Each actor row has exactly one active count mode

- **As a** Result Contributor
- **I want** to report actor numbers either disaggregated by sex and age, or as a single total
- **So that** I can report what I actually know

**Details**

- Behavior: a `Sex and age disaggregation does not apply` checkbox switches the row between **disaggregated mode** (four count inputs: Women youth / Women non-youth / Men youth / Men non-youth) and **aggregate mode** (a single `How many` input bound to `actors_count`). The two modes are mutually exclusive and only one is ever rendered.
- On mode switch, the fields of the mode being left are cleared in the payload so no stale counts survive (chunk 2 nulls the non-selected side on write; sending both is a `400`).

**Acceptance criteria**

- [ ] AC.1 — Unchecked, the row renders the four disaggregated inputs and no `actors_count` input.
- [ ] AC.2 — Checked, the row renders one `How many` input and none of the four.
- [ ] AC.3 — Switching from disaggregated to aggregate leaves the four `*_count` fields absent-or-null in the payload and `actors_count` populated; switching back does the inverse.
- [ ] AC.4 — No payload the UI can produce carries a value in both modes on the same row.

#### Scenario: Switching a saved row from disaggregated to aggregate

- GIVEN a saved actor row with `women_youth_count: 4` and `men_youth_count: 2`
- WHEN the user checks `Sex and age disaggregation does not apply` and enters `6`
- THEN the payload carries `sex_age_disaggregation_not_apply: true` and `actors_count: 6`
- BUT it must NOT carry any of the four `*_count` values
- AND IT MUST NOT be possible, through any UI interaction, to submit a row populating both modes.

---

### R-IUP-008 — Counts accept non-negative integers only

- **As a** Result Contributor
- **I want** the count fields to refuse impossible numbers as I type
- **So that** I do not discover a `400` after filling the whole section

**Details**

- Behavior: all five count fields (four disaggregated + `actors_count`) and `organization_count` and `quantification_number` reject negatives and fractions. Enforcement is at input, at blur, and on paste — not only at submit.

**Acceptance criteria**

- [ ] AC.1 — Typing `-1` does not produce a negative value in the body.
- [ ] AC.2 — Typing `2.5` does not produce a fractional value in the body.
- [ ] AC.3 — Pasting `-1` into a count field does not produce a negative value in the body.
- [ ] AC.4 — Pasting `2.5` into a count field does not produce a fractional value in the body.
- [ ] AC.5 — `0` is accepted — it is a meaningful count, distinct from absent.

#### Scenario: A pasted negative is refused before the request

- GIVEN an actor row in disaggregated mode
- WHEN the user pastes `-1` into `Women youth`
- THEN the field does not hold a negative value
- BUT it must NOT rely on the server's `@Min(0)` as the only line of defence — the field must refuse it locally
- AND IT MUST treat `0` as valid input, not as empty.

> **Named blind spot.** The server enforces `@IsInt()` + `@Min(0)`. The client mirror exists so the user is not told at save time; it does not replace the server rule (PRD **AC-Role-Correctness**). The `design.md` must state which of the two — a `maxFractionDigits` capability on the shared `app-input`, or a bespoke count control — carries AC.2/AC.4, because `app-input`'s number branch today passes `[min]` but exposes no fraction-digit control.

---

### R-IUP-009 — An actor type is used at most once per result

- **As a** Result Contributor
- **I want** to be told immediately that I already reported this actor type
- **So that** I do not lose a full section save to a duplicate

**Details**

- Behavior: the actor-type dropdown on a row excludes, or the row rejects, a type already chosen on another active actor row of this result. The message names the field.
- This mirrors chunk 2's duplicate-actor-type `400`; the server remains authoritative.

**Acceptance criteria**

- [ ] AC.1 — With actor type `X` chosen on row 1, choosing `X` on row 2 produces an inline error naming the field, or is not offerable.
- [ ] AC.2 — Two rows both of type `OTHER` (= 5) are distinguished by `actor_type_custom_name`; identical custom names are also a duplicate.
- [ ] AC.3 — Removing row 1 makes type `X` available again on row 2.

#### Scenario: A duplicate actor type is caught before saving

- GIVEN an actor row with actor type `Farmers`
- WHEN the user adds a second row and selects `Farmers`
- THEN an inline message names the field and the duplicate
- BUT it must NOT allow the PATCH to be issued with two rows of the same actor identity
- AND IT MUST re-offer `Farmers` once the first row is removed.

---

### R-IUP-010 — Actor rows require a type, and `OTHER` requires a name

- **As a** Result Contributor
- **I want** to know which actor rows are incomplete
- **So that** I understand why the section is not ticked

**Details**

- Behavior: `Actor type` is mandatory on every row (asterisk + inline message). Selecting `OTHER` (id `5` — see assumption **A4**; a client-side literal, not an importable symbol) reveals a mandatory `Specify other` text input bound to `actor_type_custom_name`; choosing any other type clears it.
- Each row shows a **read-only** derived total (R-IUP-011).

**Acceptance criteria**

- [ ] AC.1 — A row with no actor type shows the inline required message and the field's error border.
- [ ] AC.2 — Selecting actor type `5` reveals the `Specify other` input, mandatory while blank.
- [ ] AC.3 — Changing away from `5` clears `actor_type_custom_name` in the body.
- [ ] AC.4 — `Add other actor` appends a row; the per-row remove control deletes it; both are hidden in a non-editable status.
- [ ] AC.5 — At least one actor row is required for the section to be complete (contract **C3**), and the page communicates this rather than showing a silently-false tick.

#### Scenario: Zero actor rows cannot complete the section

- GIVEN an indicator-6 result with a level selected and no actor rows
- WHEN the section is saved
- THEN the `innovation_use` green check stays false
- BUT it must NOT show the section as complete on the strength of the level alone
- AND IT MUST tell the user that at least one actor is required.

---

### R-IUP-011 — The actor total is derived, read-only, and reconciled with the server

- **As a** Result Contributor
- **I want** the row total computed for me
- **So that** I cannot report a total that contradicts its parts

**Details**

- Behavior, mirroring chunk 2 §5.5 exactly:

| Mode | Total |
| --- | --- |
| Aggregate (`sex_age_disaggregation_not_apply === true`) | `actors_count` |
| Disaggregated | sum of the four `*_count`, `NULL` treated as absent; **`null` when all four are null** — not `0` |

- The control is read-only and never editable. `total` is never sent (`whitelist: true` would strip it; sending it is still a contract violation).

**Acceptance criteria**

- [ ] AC.1 — Entering `3` and `2` in two disaggregated fields shows a total of `5`, live.
- [ ] AC.2 — All four disaggregated fields empty shows an empty total, not `0`.
- [ ] AC.3 — In aggregate mode the total equals `actors_count`.
- [ ] AC.4 — The total control cannot receive a typed value.
- [ ] AC.5 — The PATCH body contains no `total` key on any actor row.
- [ ] AC.6 — After a successful save, the client-displayed total equals the `total` returned by the server for the same row.

#### Scenario: The client total agrees with the server total

- GIVEN an actor row with `women_youth_count: 3` and `men_not_youth_count: 2`
- WHEN the section is saved and the response is re-read
- THEN the displayed total is `5` both before and after the round trip
- BUT it must NOT send `total` in the request body
- AND IT MUST show an empty total, not zero, when no count has been entered.

---

### R-IUP-012 — Organizations and Other quantitative measures are repeatable and optional

- **As a** Result Contributor
- **I want** to add the organizations using the innovation and any other measures I have
- **So that** the record is complete when I have that data — and submittable when I do not

**Details**

- Behavior: two independent repeatable blocks.
  - **Organizations** — organization type (CLARISA institution types), sub-type when the chosen type has one, a `Specify other` name when the type is the "other" type, an `is_organization_known` path that selects a specific CLARISA institution, and `organization_count`.
  - **Other quantitative measures** — `unit` (free text, family **D-2**: no catalog, in any chunk), `quantification_number`, `description`.
- **Neither block is mandatory** — contract §6.1 does not reference them.

**Acceptance criteria**

- [ ] AC.1 — Both blocks add, edit, and remove rows; add/remove controls are hidden in a non-editable status.
- [ ] AC.2 — A saved-and-reloaded result restores every organization and quantification row with its identifiers.
- [ ] AC.3 — Neither block carries a red asterisk, and a result with zero rows in both blocks can reach a true `innovation_use` green check.
- [ ] AC.4 — `unit` is a free-text input, not a dropdown.
- [ ] AC.5 — An organization row the user has begun but not identified shows an inline message before save rather than producing a `400`.

#### Scenario: A result with no organizations still completes

- GIVEN an indicator-6 result with a level and one complete actor row, and no organizations or quantifications
- WHEN the green checks are read
- THEN `innovation_use` is true
- BUT it must NOT present either block as required
- AND IT MUST still allow both blocks to be filled without changing that outcome.

---

### R-IUP-013 — Save constructs a payload the API can accept

- **As a** Result Contributor
- **I want** my save to succeed on the first attempt
- **So that** I am not shown a validation error caused by a row I never filled

**Details**

Behavior — the payload rules, each of which prevents a specific chunk-2 `400`:

| Rule | Prevents |
| --- | --- |
| Drop actor rows with no `actor_type_id` | missing-`actor_type_id` `400` |
| Drop organization rows that identify no organization (neither `institution_type_id`, nor `is_organization_known` + `institution_id`) | identity-less-organization `400` (a silent data-destruction path before chunk 2's fix) |
| Drop quantification rows that are entirely empty | needless writes |
| Echo back only `result_actors_id` / `result_institution_type_id` / `id` values received from this result's GET | unauthorized-id `400` |
| Never repeat the same id across two rows of a block | duplicate-submitted-id `400` |
| Send `innovation_use_level_id` only from the catalog | unknown-level `400` |
| Omit `total` | contract violation |

- After a successful PATCH, re-read via the GET (which carries `loadingTrigger: true`) so both the form and the green checks reflect committed state.

**Acceptance criteria**

- [ ] AC.1 — A blank actor card added but not filled is absent from the request body.
- [ ] AC.2 — A blank organization card added but not filled is absent from the request body.
- [ ] AC.3 — Every id in the request body was present in the preceding GET response for the same result.
- [ ] AC.4 — No id appears twice across the rows of a block.
- [ ] AC.5 — On success, a toast confirms and the section re-reads from the server.
- [ ] AC.6 — A save issued while the section is unchanged is still safe — it does not deactivate existing rows.

#### Scenario: An untouched blank card does not break the save

- GIVEN a loaded result with one complete actor row
- WHEN the user presses `Add other actor`, fills nothing, and saves
- THEN the request body carries exactly one actor row
- BUT it must NOT send a row without `actor_type_id`
- AND IT MUST leave the existing saved row intact after the round trip.

---

### R-IUP-014 — Drafts save and resume without loss

- **As a** Result Contributor
- **I want** to leave the section half-finished and come back to it
- **So that** I can report over several sessions (PRD **R-2**)

**Acceptance criteria**

- [ ] AC.1 — A partially filled section (level only, or level + one actor with one count) saves without error.
- [ ] AC.2 — Reloading the page restores every persisted field to the value entered.
- [ ] AC.3 — A partially filled section shows a false `innovation_use` green check, not an error state.
- [ ] AC.4 — Values the contract does not persist (the derived total) are recomputed on load, not stored.

#### Scenario: Round-trip fidelity

- GIVEN a section saved with level 8, one aggregate-mode actor of type `OTHER` named `"local cooperatives"` with `actors_count: 12`, one organization, and one quantification
- WHEN the page is reloaded
- THEN every one of those values renders exactly as entered
- BUT it must NOT resurrect rows the user deleted before saving
- AND IT MUST show the derived total as `12`.

---

### R-IUP-015 — Status governs editability, and the server's rejection surfaces properly

- **As a** MEL Regional Expert
- **I want** to read a submitted Innovation Use section without being able to edit it
- **So that** the workflow is not bypassed from the UI

**Details**

- Behavior: every control on the page is disabled and every add/remove affordance hidden when `SubmissionService.isEditableStatus()` is false — the same gate the sibling detail pages use. External results (`CacheService.isExternalResult()`) are read-only through that same computed.
- A save attempted in a non-editable status is not issued. If the server nevertheless rejects, the message surfaces through `ActionsService`; note the guard returns **`400`**, not `403`.

**Acceptance criteria**

- [ ] AC.1 — With `isEditableStatus() === false`, every input, the stepper buttons, and every add/remove control are non-interactive or absent.
- [ ] AC.2 — In that state the page still renders all stored values.
- [ ] AC.3 — No PATCH is issued from the page while `isEditableStatus()` is false.
- [ ] AC.4 — A `400` from `ResultStatusGuard` is surfaced to the user, not swallowed.

#### Scenario: A submitted result is readable, not editable

- GIVEN an indicator-6 result in a non-editable status
- WHEN a MEL expert opens the Innovation Use section
- THEN every stored value is visible
- BUT it must NOT expose an enabled control, an `Add` button, or a remove icon
- AND IT MUST NOT issue a PATCH on any interaction.

---

### R-IUP-016 — Completion status refreshes and submission is gated

- **As a** Result Contributor
- **I want** the sidebar to update after I save and Submit to stay blocked until the record is complete
- **So that** I can trust what the page tells me

**Details**

- Behavior: green checks are server-computed. The client refreshes them through the existing mechanism — a GET carrying `loadingTrigger: true` triggers `ToPromiseService.updateGreenChecks()` in its `finalize`. The page therefore re-reads after create, update, delete, and after any change that alters the conditional field.
- `SubmissionService.meetsStatusChangeValidationRequirements` already ANDs every emitted key, so `innovation_use` and `ip_rights` gate submission for indicator 6 with no change to that service.

**Acceptance criteria**

- [ ] AC.1 — After a successful save that completes the section, the sidebar tick for `Innovation use details` turns true without a manual reload.
- [ ] AC.2 — After a save that removes the last actor row, the tick turns false.
- [ ] AC.3 — With `innovation_use` false, `canSubmitResult()` is false and the Submit affordance is blocked with the standard tooltip.
- [x] AC.4 — `innovation_use` is present on the client `GreenChecks` interface. **The binding clause is satisfied** (T-10). **Annotated 2026-08-21 (T-10 Pivot):** the trailing rationale *"so the sidebar's lookup is type-checked rather than cast-only"* is **not achieved and is not achievable by declaring the key** — the `as keyof GreenChecks` cast is applied to `greenCheckKey`, typed `string`. The rationale is tracked for closure as `tasks.md` RB-8; **the requirement itself is met.**
- [ ] AC.5 — `innovation_use` is **not** added to `VISUAL_ONLY_GREEN_CHECKS` semantics on the client — it counts and it gates.

#### Scenario: Deleting the last actor un-ticks the section

- GIVEN a complete Innovation Use section with exactly one actor row
- WHEN the user removes that row and saves
- THEN the sidebar tick for the section turns false
- AND the completion counter decreases by one
- BUT it must NOT require a page reload to reflect the change
- AND IT MUST block Submit while the check is false.

---

### R-IUP-017 — The section renders in STAR's visual language, in both themes

- **As a** Result Contributor
- **I want** the section to look like the rest of STAR
- **So that** I am not reading a second product inside the first

**Details**

- Behavior: layout, typography, spacing, and controls follow [`docs/ux-ui/design.md`](../../../ux-ui/design.md) §6.1 and §7.1 — the shared custom-field wrappers (`app-input`, `app-select`, `app-textarea`, `app-radio-button`), the canonical form-label classes (`.label`, `.description`, `.option-label`, `.section-title`), the `rs-*` / `abc-*` / `atc-*` / `fs-*` utilities or `var(--ac-*)`.
- The PRMS screenshot is a **field inventory only**. Its layout, colors, and controls are not copied.
- **New code introduces no hex literals.** The reference `innovation-details` page is full of them; it is a style reference, not a licence.

**Acceptance criteria**

- [ ] AC.1 — Mandatory fields carry `<span class="text-red-500">*</span>`; invalid fields show the platform's inline `This field is required` treatment naming the field.
- [ ] AC.2 — No hex color literal appears in any file this spec adds.
- [ ] AC.3 — Both light and dark themes render the section legibly, with no unreadable contrast and no broken layout.
- [ ] AC.4 — Any component pattern not already in [`docs/ux-ui/design.md`](../../../ux-ui/design.md) §8.1 is registered there in the same change.

#### Scenario: Dark mode is not an afterthought

- GIVEN a user with dark mode enabled
- WHEN the Innovation Use section renders
- THEN every label, callout, count field, and card border is legible
- BUT it must NOT branch on `isDarkMode()` for any color decision
- AND IT MUST NOT introduce a token or a hex literal to make dark mode work.

> **This requirement has no automated gate.** See §9.

---

### R-IUP-018 — The section is accessible and stays within budget

**Acceptance criteria**

- [ ] AC.1 — Every control (stepper buttons, counts, dropdowns, checkboxes, add/remove) is keyboard-reachable with a visible focus ring and no keyboard trap.
- [ ] AC.2 — Every input has a `<label>` or `aria-label`; icon-only controls (remove, add) have accessible names in **English** — the reference page's `aria-label` is Spanish (`'Seleccionar nivel ' + n`) and must not be copied.
- [ ] AC.3 — Required-field and duplicate errors are conveyed by icon + text, never by color alone.
- [ ] AC.4 — The production build stays within `angular.json` budgets: initial ≤ 2 MB warning / 3 MB error, component styles ≤ 4 kB warning / 8 kB error.
- [ ] AC.5 — The page renders usably at the `md:` breakpoint (landscape, height ≤ 768 px) — the repeatable cards stack rather than overflow horizontally.

#### Scenario: The section is operable without a mouse

- GIVEN a keyboard-only user on the Innovation Use section
- WHEN they Tab through the page
- THEN every control receives focus in document order with a visible ring
- BUT it must NOT trap focus inside a repeatable card
- AND IT MUST expose an English accessible name for every icon-only control.

> AC.1–AC.3 and AC.5 have **no automated gate** in jsdom. See §9.

---

### R-IUP-019 — The Innovation Dev page is unchanged

- **As an** Innovation Dev reporter
- **I want** my page to behave exactly as it did
- **So that** a feature for another indicator does not cost me my own

**Details**

- Behavior: whatever reuse strategy `design.md` chooses, the Innovation Dev page's rendered output and behavior are unchanged. Kaizen **KZ-002** applies — enumerate the blast radius by *what renders* `actor-item` / `organization-item`, not by which folder they live in. Kaizen **KZ-003** applies — the verification is a **full** client suite run, never a targeted one.
- Kaizen **KZ-001** applies to the new specs: a double that does not render what it stands in for produces a green suite over a broken page.

**Acceptance criteria**

- [ ] AC.1 — `design.md` enumerates every screen that renders each component this spec touches, derived from imports and templates rather than folder location.
- [ ] AC.2 — `innovation-details.component.spec.ts`, `actor-item.component.spec.ts`, and `organization-item.component.spec.ts` pass **unmodified**, except for import-path edits if a component moves.
- [ ] AC.3 — The full client suite (`npm test -- --silent`) passes; no targeted-suite run is accepted as evidence for this requirement.
- [ ] AC.4 — The new specs assert **rendered output and computed values**, not merely that a mocked service was called.

#### Scenario: A shared-component change does not regress Innovation Dev

- GIVEN the Innovation Dev page rendering actor and organization cards
- WHEN this spec's changes land
- THEN the Innovation Dev page renders and behaves identically
- BUT it must NOT be verified by a targeted suite
- AND IT MUST NOT require any change to Innovation Dev's existing assertions.

---

## 8. Non-functional requirements

### NFR-IUP-001 — Accessibility

- **Category:** a11y
- **Target:** WCAG 2.1 AA on the new section (PRD constraint **C-4**, **AC-Accessibility**).
- **How verified:** human check at a HITL pause, plus a T6-Multimodal visual review. **Not** by `npm test` — see §9.

### NFR-IUP-002 — Theming

- **Category:** compliance (design system)
- **Target:** light and dark parity; zero hex literals in new files; tokens or token utilities only.
- **How verified:** `grep` for hex literals in the added file set (automatable) **plus** a rendered visual check in both themes (not automatable) — see §9.

### NFR-IUP-003 — Performance / bundle

- **Category:** performance
- **Target:** `angular.json` budgets respected; the new route is lazy so the initial bundle does not grow.
- **How verified:** `npm run build` in `client/research-indicators`, budget output read. **Disqualifier:** a build run while another agent is active is a *wrong* measurement, not a slow one (root `CLAUDE.md` §4.3). Measure only in the window after all workers report.

### NFR-IUP-004 — Test coverage

- **Category:** dx
- **Target:** project floors held — statements 40 / branches 20 / lines 45 / functions 30 — and no regression on changed files.
- **How verified:** `npm test -- --silent` (full suite) and `npm run test:coverage`.

### NFR-IUP-005 — Controlled vocabularies

- **Category:** compliance
- **Target:** actor types, institution types, institution sub-types, and institutions come from CLARISA through the existing control-list services. `unit` is free text by family **D-2**; the use-level catalog is CLARISA's vocabulary on local transport by family **D-1** — neither is a parallel taxonomy.
- **How verified:** code review + unit specs asserting the service source. PRD **AC-Controlled-Lists**, constraint **C-3**.

### NFR-IUP-006 — Client architecture

- **Category:** dx
- **Target:** standalone component, lazy `loadComponent`, signals for state, `ApiService` for all HTTP, reactive/`ngModel` forms through the shared wrappers, no NgModules, no NgRx, no raw `HttpClient` in a component.
- **How verified:** `npm run lint -- --quiet` plus code review. ⚠️ the lint script carries `--fix` and **mutates files**; re-check `git status` after running it.

---

## 9. Defect classes this spec can produce, and the gate for each

**A gate blind to the defect class the spec most often produces is not a gate.** This spec's dominant output is *rendered UI*, and that is exactly the class jsdom cannot evaluate.

| # | Defect class | Gate | Can the gate see it? |
| --- | --- | --- | --- |
| D1 | Wrong wiring — section missing, route missing, Next/Back broken | `npm test -- --silent` asserting the resolved section list, the route table, and **each consumer call site** | ✅ Yes, if the assertion is at the call site. A test asserting only `currentResultIndicatorSectionPath() === '...'` is a **presence assertion** and would pass even if no screen used it |
| D2 | Off-by-one on the level scale (`id` vs `level`) | unit spec: select button `6` ⇒ payload id `7`; load id `7` ⇒ button `6` highlighted | ✅ Yes. **Falsifying input:** change the component to bind `id` and the spec must fail |
| D3 | Payload the API rejects (blank rows, foreign ids, duplicate ids, both count modes) | unit specs asserting the **constructed body**, driven from chunk 2's `400` table | ✅ Yes for construction. ❌ **No** for the server's actual acceptance — there is no client-side integration harness against a live API. Recorded as an accepted risk; the wire contract is chunk 2's frozen `design.md` §4 and its fixture tier already proved the server side |
| D4 | Conditional field clearing data on toggle | unit spec: type at 7 → select 3 → select 7, assert text survives | ✅ Yes |
| D5 | Innovation Dev regression from shared-component reuse | **full** client suite; Innovation Dev's three existing specs unmodified | ✅ Yes — provided the run is full, not targeted (KZ-003) |
| D6 | Green suite over a broken page (a double that renders nothing) | new specs assert rendered DOM and computed totals, not mock invocation (KZ-001) | ⚠️ Partially. A spec can still assert the wrong thing convincingly; the substitute is the D7 human/visual check |
| D7 | **Visual defect** — wrong spacing, broken layout, unreadable dark-mode contrast, a callout that renders `undefined`, an untokenized color | **No automated gate exists.** jsdom measures no layout and no contrast; `axe` cannot evaluate contrast over an unrendered tree, and a checker returning "incomplete" has evaluated nothing | ❌ **No.** Substituted by (a) a **human visual check at the Phase-3 HITL pause and again before archive**, in both themes, at 1440 px and at the `md:` breakpoint, and (b) a **T6-Multimodal review** of screenshots. A `grep` for hex literals covers the tokenization half only |
| D8 | Accessibility defect — missing accessible name, focus trap, color-only error | Partially automatable: a spec can assert `aria-label` presence and `<label for>` association | ⚠️ Presence only. Focus order, visible focus ring, and contrast are **not** provable in jsdom → same substitute as D7 |
| D9 | Bundle-budget regression | `npm run build`, budget output | ✅ Yes. **Disqualifier:** a build run concurrently with a delegated agent is not evidence — re-run in a quiet window |
| D10 | Stale documentation claim (a count, a path, a line citation) | the Correction Closure sweep on every Adjust round; prefer **anchors over line numbers** (chunk 2's citations rotted when its own edits moved the lines) | ✅ Yes, by `grep` |

**Accepted risks, recorded rather than substituted:**

- **AR-1 (from D3).** No client-tier test executes against a live server. Contract conformance rests on chunk 2's archived fixture tier plus the `400` table transcribed in §6.2. If that table is wrong, this spec inherits the error.
- **AR-2 (from D7/D8).** Visual and a11y correctness are gated by human observation. Per **KZ-002** recurrence 6, when a criterion is discharged by a human observation the tick **must quote what the observation actually covered** — "the page renders" does not discharge "contrast ≥ 4.5:1 in dark mode".

---

## 10. Assumptions, dependencies, risks

### 10.1 Assumptions (not already in the PRD)

| # | Assumption |
| --- | --- |
| A1 | Chunk 2's endpoints are deployed in the environment this page is tested against. Untested against a live server, the page cannot be verified end to end |
| A2 | Indicator 6 is `is_active` in the target database, so the create-result flow offers it (family **FR-5**) — **to be confirmed against the deployed environment before implementation** |
| A3 | `clarisa_innovation_use_levels` is seeded with the ten rows in §6.3 in every environment the page runs against; the seed ships in chunk 1's migration M1 |
| A4 | The actor-type value for `OTHER` is `5`, and the client's actor-type list exposes it as `code`. **The *value* is shared across both trees; the *symbol* is not.** `ClarisaActorTypesEnum` exists only in the server tree — zero matches under `client/research-indicators/src` — so the client uses the literal `5`, as the existing actor card already does. *(Corrected 2026-08-20 at Judgment Day round 1, `judgment.md` → `C-2`: this row previously read "verified in both trees", which was true of the number and false of the name.)* |
| A5 | The institution-type "other" convention (`institution_type_id === 78`) used by the existing organization card also applies to Innovation Use organizations |

### 10.2 Dependencies

| Kind | Item |
| --- | --- |
| Hard | chunk 2 — `done`, archived 2026-08-20. Its `design.md` §4 is the frozen contract |
| Hard | chunk 1 — `done`, archived 2026-08-19. Schema, catalog seed, and the `innovation_use_validation` function |
| Runtime | CLARISA actor types, institution types, institution sub-types, institutions — all already reachable through existing control-list services |
| Not a dependency | family **FR-7** / AC-1718. Open, owned elsewhere, must not be closed here |

### 10.3 Risks

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| RK-1 | Reusing `actor-item` / `organization-item` regresses Innovation Dev. The coupling is **deeper than the proposal assumed**: both components are typed to `GetInnovationDetails`, both write to a **hardcoded** parent array key (`actors`, `institution_types`), the actor card's data fields are **booleans** where Innovation Use needs **integer counts**, and the organization card has no `organization_count`. | **High** | `design.md` decides and justifies the reuse strategy against this evidence, enumerates the blast radius by what renders (KZ-002), and the gate is a full suite (KZ-003). R-IUP-019 |
| RK-2 | A green suite over a broken page — KZ-001. The existing `innovation-details.component.spec.ts` mocks the control-list services. | **High** | New specs assert rendered output and computed totals (R-IUP-019 AC.4) |
| RK-3 | Visual and a11y defects ship because no automated check can see them. | **High** | D7/D8 substitutes: human visual check in both themes at two viewports + T6 review. Recorded as **AR-2** |
| RK-4 | The `id ≠ level` trap fires in the stepper, the callout, or the `>= 6` condition. | **High** | R-IUP-005 AC.6, R-IUP-006 AC.4, and D2's falsifying input |
| RK-5 | The page presents organizations or quantifications as mandatory, contradicting the green check. | Medium | Contract §6.1 transcribed; R-IUP-012 AC.3 |
| RK-6 | Blank rows produce a `400` on the user's first save. | Medium | R-IUP-013 |
| RK-7 | Counts accept fractions because `app-input`'s number branch exposes no fraction-digit control. | Medium | R-IUP-008 AC.2/AC.4; `design.md` must name which mechanism carries them |
| RK-8 | Measuring the bundle while a delegated agent runs yields a *wrong* number. | Low | NFR-IUP-003 disqualifier; root `CLAUDE.md` §4.3 |
| RK-9 | Doc-citation rot — line-numbered citations in this spec go stale as the tree changes (chunk 2 hit this repeatedly). | Low | Prefer symbol/anchor citations; sweep on every Adjust round (D10) |

---

## 11. Open questions

| ID | Question | Owner | Blocks | Target |
| --- | --- | --- | --- | --- |
| OQ-IUP-1 | Reuse strategy for `actor-item` / `organization-item` — promote to shared and parameterize, or build Innovation-Use-local components? RK-1's evidence materially changes the proposal's Option-A recommendation. | Engineering lead + product owner | `design.md`, task decomposition | Phase 2 approval gate |
| OQ-IUP-2 | Is indicator 6 `is_active` in the deployed environment today (family **FR-5**)? If yes, users can already reach the dead end and this chunk is a fix, not an addition. | Product owner / DevOps | nothing — informs release comms and urgency only | before implementation starts |
| OQ-IUP-3 | Should the `Other quantitative measures` block reuse the OICR page's `quantification-item` component (shape `{number, unit, comments}`) or use the Innovation Use wire shape (`{id, quantification_number, unit, description}`) directly? | Engineering lead | one task's file set | Phase 2 approval gate |

### Resolved at specify time

| # | Decision | Rationale |
| --- | --- | --- |
| **D-IUP-1** | The completion contract is `innovation_use_validation` as transcribed in §6.1 — not the PRMS screenshot's asterisks and not the field list's ordering. | The stored function is what turns the tick green and gates Submit. Anything else is a guess about the gate. Follows family **D-10**: transcribe SQL before writing about it |
| **D-IUP-2** | Organizations and quantifications are **optional**. | They appear nowhere in §6.1's five conjuncts |
| **D-IUP-3** | The IP rights section is reached by adding an `indicator_id: 6` row to the existing sidebar entry — **no** change to `ip-rights.component.ts`. | The component branches on no indicator; chunk 1 added indicator 6 to the `ip_rights` green-check conjunction and chunk 2 added it to `ipAvailables`, so the row and the check already exist server-side |
| **D-IUP-4** | The stepper renders and binds by `level`; the callout shows `level`, `name`, `definition` and **not** `additional_guidance`. | Family **D-1** (`id = level + 1`, non-unique `name`) and the entity: `clarisa_innovation_use_levels` has no `additional_guidance` column |
| **D-IUP-5** | `Pool funding alignment` is left exactly as it is. | Its row carries no `indicator_id`, so it already renders for indicator 6 when eligible, and `optional: true` keeps it out of the counter and out of submit gating. Closes proposal **OQ-5** with no code change |
| **D-IUP-6** | Results Center filters, dashboard tiles, and Excel export for indicator 6 are **out of scope** this cycle. | Already fenced by the proposal's Scope. Closes proposal **OQ-4**; revisit as a fourth family chunk |
| **D-IUP-7** | New code uses design tokens and the canonical form-label classes. The reference `innovation-details` page's hex literals are **not** precedent. | PRD **C-3**-adjacent constraint and `docs/ux-ui/design.md` §7.1's binding contract. Matching an existing violation is not consistency |
| **D-IUP-8** | Citations in this spec's documents prefer symbols and anchors over line numbers. | Chunk 2's line citations rotted from its own edits; recorded there as the FP-50 failure mode |
| **D-IUP-9** | Family **OQ-F1** (linked/bundled question) and **OQ-F2** (tri-state controls) stay out of scope, binding this chunk. | Ruled at chunk 2's specify gate; both bind all three chunks |

---

## 12. Requirement ID Index

| ID | Title | Scenarios | Primary AC count |
| --- | --- | --- | --- |
| R-IUP-001 | Sidebar section set for indicator 6 | 1 | 4 |
| R-IUP-002 | Lazy route exists | 1 | 3 |
| R-IUP-003 | Sibling Next/Back navigation | 1 | 4 |
| R-IUP-004 | Load + four UI states | 1 | 4 |
| R-IUP-005 | 0–9 stepper binds by `level` | 1 | 6 |
| R-IUP-006 | Conditional justification, hide-never-clear | 1 | 4 |
| R-IUP-007 | One active count mode per actor row | 1 | 4 |
| R-IUP-008 | Non-negative integers only | 1 | 5 |
| R-IUP-009 | Actor type unique per result | 1 | 3 |
| R-IUP-010 | Actor type required; `OTHER` needs a name | 1 | 5 |
| R-IUP-011 | Derived, read-only, reconciled total | 1 | 6 |
| R-IUP-012 | Organizations + quantifications, optional | 1 | 5 |
| R-IUP-013 | Payload the API accepts | 1 | 6 |
| R-IUP-014 | Draft save and resume | 1 | 4 |
| R-IUP-015 | Status governs editability | 1 | 4 |
| R-IUP-016 | Green checks refresh + submit gating | 1 | 5 |
| R-IUP-017 | STAR visual language, both themes | 1 | 4 |
| R-IUP-018 | Accessible and within budget | 1 | 5 |
| R-IUP-019 | Innovation Dev unchanged | 1 | 4 |
| NFR-IUP-001…006 | a11y · theming · bundle · coverage · vocabularies · architecture | — | — |

**19 functional requirements · 19 scenarios · 85 acceptance criteria · 6 NFRs.** Every scenario carries at least one `BUT it must NOT` and one `AND IT MUST` clause; `tasks.md` must own each of those clauses by name, not by requirement ID.

---

## 13. Sign-off

- [ ] Engineering lead — David Felipe Casañas Hernández
- [ ] MEL / product owner — *(pending)*
- [ ] Security review — **not applicable.** This spec adds no endpoint, no auth path, and no secret. It consumes two existing JWT-guarded endpoints. Family **FR-7** is a separate spec's security gate and is **not** discharged here
- [ ] DevOps — **not applicable.** No infra, no env var, no migration
- [ ] **Visual + a11y human check (D7/D8 substitute)** — required, in both themes, at 1440 px and at the `md:` breakpoint. When ticked, **quote what was observed** (KZ-002)
