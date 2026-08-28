# Design — Results (Innovation Use) / Details Page (STAR)

- **Module:** results (`innovation-use`) — **client tier** (`client/research-indicators`)
- **Spec id:** 2026-08-innovation-use-details-page
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked TRD sections:** [`docs/trd/trd.md`](../../../trd/trd.md) §4.2, §5.3, §6.3, §7.5, §8.1–8.5, §12, §13.2
- **Linked UX/UI sections:** [`docs/ux-ui/design.md`](../../../ux-ui/design.md) §6.1, §7.1, §8.1, §10.1, §11
- **Parent spec:** [`../family.md`](../../innovation-use/family.md) — chunk 3 of 3
- **Frozen upstream contract:** [`docs/specs/archive/2026-08-20-innovation-use--details-api/design.md`](../../archive/2026-08-20-innovation-use--details-api/design.md) §4
- **Depth:** Full
- **Last updated:** 2026-08-20

---

## Document Control

| Field | Value |
| --- | --- |
| Type | Change |
| Approval Mode | gated |
| Server files modified | **zero** |
| File inventory | **Deliberately not stated as a count here.** The authoritative enumeration is **§2.1** (`New — the page`, `New — the contract layer`, `Promoted`, `Modified`) plus **§10.2**'s spec table, which marks each spec `(updated)` or new. Judgment Day round 1 confirmed the counts previously asserted in this row (`8` modified, `13 implementation + 9 spec` new) survived neither recomputation from §2.1 nor a glob of the tree — three of the nine "new" specs already exist — and that the stated derivation pointed at the wrong sections. Per **KZ-005** the remedy is not a corrected number but **no number**: derive from §2.1 + §10.2 at the moment one is needed, and never restate it here (`judgment.md` → `C-1`) |
| Migrations | none |
| Budget | see §12 — **13 tasks · ~3,200 LOC · ~28 review rounds**. **Amended 2026-08-26 (Amendment 01): 14 tasks · ~3,400 LOC · ~31 review rounds** against §12's *written* baseline. ⚠️ **§12's written figure is not the governing one:** the user **re-baselined LOC to ~4,600 after T-07**, and the actual was already above that too by `T-09` (**4,874** — corrected 2026-08-26 from 4,871). **The single home of the actual is `execution.md` → `T-13` c10**, not the Budget ledger, which stops at `T-09`; this cell previously designated the ledger and that designation is withdrawn. So Amendment 01's delta applies to **both** baselines: ~3,400 against the written one, **~4,800** against the re-baseline. |
| Reversion challenge run | **1** — DD-2 (declining the proposal's Option A). Challenged; a concrete cost was named; the design was narrowed rather than reversed. See §11 |
| Skills loaded | `brainstorming` (Phase 1), `angular-developer` (Phase 2). **`ui-ux-pro-max` deliberately not loaded** — see DD-13 |

---

## Executive Summary

**Follow `capacity-sharing`'s page shape, not `innovation-details`'s.** The reference page uses a four-panel accordion because it has four distinct sub-forms; the Innovation Use section has one detail group and three repeatable blocks. `capacity-sharing`'s `app-page-wrapper` → `app-form-header` → titled cards → `app-navigation-buttons` is the closer precedent and the simpler page.

Three findings from code inspection changed the design away from the proposal:

| # | Finding | Consequence |
| --- | --- | --- |
| 1 | `actor-item` and `organization-item` are coupled to `GetInnovationDetails` **by hardcoded parent array key**, and refactoring them to a clean API would force a rewrite of the Innovation Dev spec set DD-2 measures — which R-IUP-019 AC.2 forbids | **The proposal's Option A is declined for these two cards.** Build Innovation-Use-local cards on the `quantification-item` pattern (`@Input` value + `@Output` events), which is the *good* in-repo precedent (DD-2) |
| 2 | `quantification-item` (OICR) already uses that clean event-based API and has **no** parent coupling | **Promote it to `shared/`** with two additive, default-preserving inputs. This is the reuse that actually pays (DD-3) |
| 3 | `app-input type="number"` passes `[min]` but **not** `maxFractionDigits`, so PrimeNG resolves `maximumFractionDigits: 3` from `Intl` — **verified**, not assumed (§6.3) | A **pasted** `2.5` reaches the body as `2.5`. Fixed by an additive `app-input` input (DD-4), forwarded to **every count field** the section renders **except the promoted quantification card's Number** — ⚠️ **AMENDED 2026-08-27 by `docs/specs/changes/measure-number-signed-decimal` (`S-10`, `DC-12`): that card's Number now receives a derived non-zero `min`/`max` and `[maxFractionDigits]="4"` instead of `0`, since it accepts signed decimals. See §4.3's amendment note and §16.** |

The riskiest surface is not the new page. It is `app-input` — rendered by **16** template files — and the single OICR file whose import path moves (`oicr-details.component.ts`; its template is untouched — §2.1). Both changes are additive with behavior-preserving defaults, and both are gated by a **full** client suite (KZ-003), never a targeted one.

---

## 1. Goals & non-goals

**Goals**

| # | Goal | Requirements |
| --- | --- | --- |
| G1 | An indicator-6 result is reachable, navigable, completable and submittable end to end | R-IUP-001, R-IUP-002, R-IUP-003, R-IUP-016 |
| G2 | The section captures every field in the contract, with the traps closed by construction | R-IUP-005…R-IUP-012 |
| G3 | Every payload the UI can build is one chunk 2 accepts | R-IUP-013, R-IUP-014 |
| G4 | Innovation Dev, OICR, and every other `app-input` consumer are provably unchanged | R-IUP-019 |
| G5 | The section looks and behaves like STAR, in both themes, for keyboard users | R-IUP-017, R-IUP-018 |

**Non-goals**

- Any server change. Any migration. Any endpoint.
- Refactoring `actor-item` / `organization-item` (DD-2) or the Innovation Dev page.
- Repairing `customSaveInnovationDev` (family FR-7 / AC-1718).
- Results Center / dashboard / export surfaces for indicator 6 (D-IUP-6).
- Consolidating the two actor-card implementations DD-2 creates — named as owed follow-up work in §13.

---

## 2. Architecture

The change is one new lazy route leaf plus three additive edits to shared client state, inside the existing result-detail shell. No new architectural layer.

```
Platform shell (navbar + alliance-sidebar)
└── result/:id  ── resultExistsResolver ──► GetMetadataService (indicator_id, status_id)
    ├── result-sidebar ──────────────► allOptions (+2 rows for indicator 6)   [R-IUP-001]
    │                                  greenChecks() ──► GET results/green-checks/:id
    └── router-outlet
        └── innovation-use-details  (NEW, lazy)                              [R-IUP-002]
            ├── InnovationUseLevelStepperComponent      (0–9 + callout)      [R-IUP-005]
            ├── app-textarea  (conditional, level >= 6)                      [R-IUP-006]
            ├── InnovationUseActorItemComponent    × n                       [R-IUP-007…011]
            ├── InnovationUseOrganizationItemComponent × n                   [R-IUP-012]
            ├── QuantificationItemComponent  (promoted to shared) × n        [R-IUP-012]
            └── app-navigation-buttons  (Back → alliance-alignment,
                                         Next → partners)                    [R-IUP-003]

Data in : ApiService.GET_InnovationUseDetails   → results/innovation-use/:code
          GetInnovationUseLevelsService          → tools/clarisa/innovation-use-levels
          GetActorTypesService / GetInstitutionTypesService /
          GetClarisaInstitutionsSubTypesService / GetInstitutionsService   (existing)
Data out: ApiService.PATCH_InnovationUseDetails → results/innovation-use/:code
Green checks: refreshed as a side effect of the GET's `loadingTrigger: true`  [R-IUP-016]
```

### 2.1 Composition — every file, with its responsibility

**New — the page**

| Path (under `client/research-indicators/src/app/`) | Responsibility |
| --- | --- |
| `pages/platform/pages/result/pages/innovation-use-details/innovation-use-details.component.ts` | Page state (`body` signal), load, payload construction, save, navigation, cross-row validation |
| `…/innovation-use-details.component.html` | Layout: form header, four titled cards, nav buttons |
| `…/components/innovation-use-level-stepper/innovation-use-level-stepper.component.{ts,html}` | The 0–9 buttons + the definition callout |
| `…/components/innovation-use-actor-item/innovation-use-actor-item.component.{ts,html}` | One actor card: type, OTHER name, mode switch, counts, derived total |
| `…/components/innovation-use-organization-item/innovation-use-organization-item.component.{ts,html}` | One organization card: known/unknown paths, type + sub-type, OTHER name, count |

**New — the contract layer**

| Path | Responsibility |
| --- | --- |
| `shared/interfaces/get-innovation-use-details.interface.ts` | The wire shapes of §4, as classes with defaulted fields (matching the `GetInnovationDetails` convention so `new X()` seeds a blank card) |
| `shared/interfaces/get-innovation-use-levels.interface.ts` | `InnovationUseLevel` — `id`, `level`, `name`, `definition`. **No `additional_guidance`** |
| `shared/services/control-list/get-innovation-use-levels.service.ts` | Loads the catalog once into a signal, mirroring `GetInnovationReadinessLevelsService` |

**Promoted**

| From | To | Why |
| --- | --- | --- |
| `pages/…/oicr-details/components/quantification-item/` | `shared/components/quantification-item/` | Two pages now render it; a cross-feature import from another page's folder is not allowed (DD-3) |

**Modified**

| Path | Edit |
| --- | --- |
| `app.routes.ts` | one `innovation-use-details` child route |
| `shared/components/result-sidebar/result-sidebar.component.ts` | two `allOptions` rows |
| `shared/services/cache/cache.service.ts` | `case 6` in `currentResultIndicatorSectionPath` |
| `shared/interfaces/get-green-checks.interface.ts` | `innovation_use?: number` **and** `ip_rights?: number` (the latter is a pre-existing type gap the indicator-6 row would otherwise widen — see DD-9, **corrected 2026-08-21**: declaring the keys does not remove the `as keyof` cast; that closure is RB-8) |
| `shared/services/api.service.ts` | three methods |
| `shared/components/custom-fields/input/input.component.ts` + `.html` | additive `maxFractionDigits` passthrough (DD-4) |
| `pages/…/oicr-details/oicr-details.component.ts` | **import path only — the `.html` is not touched.** The selector `app-quantification-item` is unchanged by the move, and OICR passes neither new input (both defaults preserve its behavior), so its template needs no edit (`judgment.md` → `C-1`, which corrected an earlier claim that two OICR files change) |

### 2.2 Reuse — what is consumed unchanged

`app-page-wrapper` (SCSS class) · `app-form-header` · `app-navigation-buttons` · `app-input` · `app-select` · `app-textarea` · `p-select` · `p-checkbox` · `app-partner-selected-item` · `SubmissionService.isEditableStatus()` · `CacheService` (`currentMetadata`, `greenChecks`, `getCurrentNumericResultId`, `isExternalResult`, `currentResultIsLoading`) · `ActionsService` (toast, error surface) · `VersionWatcherService.onVersionChange` · `ApiService` / `ToPromiseService` · `AllModalsService` (request-partner modal) · the four CLARISA control-list services · `GetInstitutionTypesService` sub-type cascade.

**Nothing in `shared/` is refactored.** The only two shared edits are additive (`app-input` input, `GreenChecks` keys) and one is a file move with an unchanged public API.

### 2.3 Blast radius — enumerated by what renders, not by folder (KZ-002)

| Shared thing this spec touches | Rendered by | Preservation mechanism |
| --- | --- | --- |
| `app-input` | **16 template files**: `portfolio-management`, `json-structure-editor`, `alliance-alignment`, `capacity-sharing`, `evidence`, `general-information`, `innovation-details`, `ip-rights`, `other-reference-item`, `quantification-item`, `oicr-details`, `create-oicr-form`, `edit-environment-variable-modal`, `submit-result-content`, `oicr-form-fields`, `global-alert` | New input is **optional**; `undefined` reproduces today's `Intl` resolution exactly. 7 existing `type="number"` call sites pass nothing and are unaffected |
| `QuantificationItemComponent` | `oicr-details.component.html` — **twice** (the `quantifications()` loop and the estimated loop) + the new page | Both new inputs are default-preserving: `fieldsRequired` defaults to `true` (OICR's current, field-asymmetric behavior — §5.6) and `maxFractionDigits` defaults to `undefined` (today's `Intl` resolution). OICR passes neither, so its template is untouched |
| `GreenChecks` interface | `result-sidebar` (`:78`), `submission.service` (`:36`), `my-latest-results` | Additive optional keys; no key removed, no key renamed |
| `result-sidebar.allOptions` | the sidebar on every result | New rows carry `indicator_id: 6`, and the existing filter keeps a row only on an `indicator_id` match |
| `currentResultIndicatorSectionPath` | `alliance-alignment` (Next), `partners` (Back) | New `case` added before `default`; existing cases untouched |

**Not in the blast radius:** `actor-item`, `organization-item`, `innovation-details.component.*` — DD-2 leaves all three byte-identical.

---

## 3. Data model

**No data model changes.** No entity, no column, no migration, no `@OpenSearchProperty` (family **D-8**: the results index reflects off `ResultOpensearchDto`, never an entity, and no indicator has detail fields indexed).

Client-side view shapes only, mirroring §4's wire contract into `shared/interfaces/` per TRD §5.3.

---

## 4. API design — consumption contract

This spec **consumes** a frozen contract and defines no endpoint. Full producer detail: chunk 2's archived `design.md` §4.

### 4.1 Methods added to `ApiService`

| Method | Verb + path | Config | Returns |
| --- | --- | --- | --- |
| `GET_InnovationUseDetails(resultCode)` | `GET results/innovation-use/:resultCode` | `{ loadingTrigger: true, useResultInterceptor: true }` | `MainResponse<GetInnovationUseDetails>` |
| `PATCH_InnovationUseDetails(resultCode, body)` | `PATCH results/innovation-use/:resultCode` | `{ useResultInterceptor: true }` | `MainResponse<GetInnovationUseDetails>` |
| `GET_InnovationUseLevels()` | `GET tools/clarisa/innovation-use-levels` | *(default — a catalog is not result-scoped)* | `MainResponse<InnovationUseLevel[]>` |

`loadingTrigger: true` on the GET is **load-bearing, not decoration**: it is the only mechanism by which `ToPromiseService` clears and re-reads green checks (`finalize` → `updateGreenChecks()`). Omitting it silently breaks R-IUP-016. The PATCH deliberately omits it, matching every sibling — the page re-reads via the GET after a successful save, which is what refreshes the checks.

### 4.2 Client view shapes

`GetInnovationUseDetails` — three scalars plus three arrays:

| Field | Type | Notes |
| --- | --- | --- |
| `innovation_use_level_id` | `number \| undefined` | The **FK**. `id = level + 1` |
| `innovation_use_level` | `number \| undefined` | The **resolved scale point**, server-derived. Read-only; never sent |
| `innovation_use_level_explanation` | `string \| undefined` | |
| `actors` | `InnovationUseActor[]` | |
| `organizations` | `InnovationUseOrganization[]` | |
| `quantifications` | `InnovationUseQuantification[]` | |

`InnovationUseActor`: `result_actors_id`, `actor_type_id`, `actor_type_custom_name`, `sex_age_disaggregation_not_apply`, `women_youth_count`, `women_not_youth_count`, `men_youth_count`, `men_not_youth_count`, `actors_count`, `total` *(read-only, server-derived, never sent)*.

`InnovationUseOrganization`: `result_institution_type_id`, `institution_id`, `institution_type_id`, `sub_institution_type_id`, `institution_type_custom_name`, `is_organization_known`, `organization_count`.

`InnovationUseQuantification`: `id`, `quantification_number`, `unit`, `description`.

> **Deliberately *not* reusing `GetInnovationDetails.Actor` / `.InstitutionType`.** They carry the four legacy **booleans** and no counts. Aliasing them would make the type system agree with a payload the server rejects.

### 4.3 The `400` map — every rejection, and where this design closes it

> ⚠️ **AMENDED 2026-08-27 by `docs/specs/changes/measure-number-signed-decimal` (`S-10`, `DC-12`).** The row below originally closed the negative/fractional rejection for **seven** fields — the five actor counts, `organization_count`, and `quantification_number` — with the same `[min]="0"` + `[maxFractionDigits]="0"` mechanism. `quantification_number` (the Innovation Use measure's Number, §5.6) is now carved OUT: it accepts **signed decimals** (scale ≤ 4, magnitude bounded per that spec's `DD-14`), the opposite of "reject negatives and fractions." Its call site now passes a derived, non-zero `min`/`max` and `[maxFractionDigits]="4"` instead. It is governed by `R-MSD-007`/`R-MSD-011` in [`docs/specs/changes/measure-number-signed-decimal/requirements.md`](../../changes/measure-number-signed-decimal/requirements.md), not by this row. The row now governs the **six** surviving fields only. See the Revision log (§16) and the archived `requirements.md`'s matching amendment on `R-IUP-008`.

| Chunk 2 rejection | Closed by | Section |
| --- | --- | --- |
| negative / fractional count | `[min]="0"` (verified: blocks typed and pasted minus) + `[maxFractionDigits]="0"`, on the **six** surviving count fields the section renders — the five actor counts (§5.4) and `organization_count` (§5.5). ~~and `quantification_number` (§5.6)~~ — **REMOVED 2026-08-27, see the amendment note above; `quantification_number` is no longer governed by this row.** | §6.3 |
| both count modes on one row | only one mode is ever rendered | §6.2 |
| missing `actor_type_id` | blank-row filter in `buildPayload` | §6.5 |
| ~~missing justification at effective `level >= 6`~~ — **removed 2026-08-21 by `bugfix/innovation-use-draft-save`; no longer a `400` to close** | ~~page-level guard before save~~ + inline required message (message-only now — see §6.6's correction) | §6.4 |
| duplicate actor type | `duplicateActorTypeIndexes` computed, checked before save | §6.6 |
| unknown `innovation_use_level_id` | the stepper can only emit a catalog `id` | §6.1 |
| unauthorized `result_actors_id` / `result_institution_type_id` | ids are only ever echoed from the GET; never synthesized | §6.5 |
| same id on two rows | ids are never copied between rows; add always creates an id-less row | §6.5 |
| identity-less organization row | blank-row filter + inline message | §6.5 |
| `ResultStatusGuard` (**`400`**, not `403`) | no PATCH is issued while `isEditableStatus()` is false | §6.7 |

---

## 5. Frontend component architecture

### 5.1 Page layout

`capacity-sharing`'s shape (DD-1): `app-page-wrapper` → `app-form-header` → four titled cards → `app-navigation-buttons`. No accordion.

| Card | `.section-title` | Contents |
| --- | --- | --- |
| 1 | `INNOVATION USE DETAILS` | The question label, **the guidance callout (Amendment 01)**, the 0–9 stepper, the definition callout, **the definitions link + the evidence callout (Amendment 01)**, the conditional justification textarea — see **§5.8** |
| 2 | `ACTORS` | Guidance callout, `n` actor cards, `Add other actor` |
| 3 | `ORGANIZATIONS` | `n` organization cards, `Add other organization` |
| 4 | `OTHER QUANTITATIVE MEASURES` | `n` quantification cards, `Add other measure` |

Cards 3 and 4 carry **no** asterisk and **no** required messaging (R-IUP-012 AC.3 — contract §6.1 does not reference them). Card 2 states that at least one actor is required.

### 5.2 Component contracts

Every new child component follows **`quantification-item`'s** pattern, which is the good in-repo precedent: a value `@Input`, an `@Output` per user action, and no reference to the parent's signal or to any parent field name.

| Component | Inputs | Outputs |
| --- | --- | --- |
| `InnovationUseLevelStepperComponent` | `levels: InnovationUseLevel[]`, `selectedLevelId?: number`, `disabled: boolean` | `levelSelected: EventEmitter<number>` *(emits the catalog **`id`**)* |
| `InnovationUseActorItemComponent` | `actor: InnovationUseActor`, `actorNumber: number`, `disabled: boolean`, `duplicateType: boolean` | `update: EventEmitter<InnovationUseActor>`, `remove: EventEmitter<void>` |
| `InnovationUseOrganizationItemComponent` | `organization: InnovationUseOrganization`, `organizationNumber: number`, `disabled: boolean` | `update: EventEmitter<InnovationUseOrganization>`, `remove: EventEmitter<void>` |

**Why this and not the existing cards' pattern.** `actor-item` and `organization-item` take `bodySignal: WritableSignal<GetInnovationDetails>` and write back through a hardcoded key (`current.actors[index] = …`, `body.institution_types.push(…)`), reconciling with `effect` + `JSON.stringify` comparisons and, in the organization card, an `allowSignalWrites` effect that mutates the parent array's length. That is untestable in isolation, un-reusable across parents, and the source of the sync bugs the spec set DD-2 measures exists to pin down. The new cards are pure: given inputs they render, and they emit on change. This makes R-IUP-019 AC.4 (assert rendered output, not mock invocation — KZ-001) achievable rather than aspirational.

**The parent owns identity.** Rows are keyed by array index at the template level; `result_actors_id` is carried in the row object and only ever originates from the GET. A card never sets, copies, or clears an id — which is what makes the two id-related `400`s structurally unreachable rather than defended against.

### 5.3 The stepper

Rendered from `levels` in the order received (server-side `ORDER BY level ASC` — DD-6 of chunk 2; the client adds no sort and depends on none).

| Aspect | Rule |
| --- | --- |
| Button label | the row's **`level`** |
| Selection state | `levels.find(l => l.id === selectedLevelId)?.level === thisLevel` |
| Emitted value | the row's **`id`** |
| Callout | `{level} - {name}` on line 1, `definition` on line 2. **`additional_guidance` is not rendered** — the column does not exist on this catalog and would print `undefined` (the reference stepper renders it) |
| Tooltip | `name` + `definition`, matching the reference stepper |
| Accessible name | `Innovation use level {level}` — **English**. The reference page's `aria-label` is Spanish (`'Seleccionar nivel ' + n`) and is not copied (R-IUP-018 AC.2) |
| Empty catalog | renders no buttons and the required message, not ten dead buttons |

### 5.4 The actor card

| Region | Control | Rule |
| --- | --- | --- |
| Header | `ACTOR # n` + remove icon | Remove hidden when `disabled` |
| Actor type | `p-select` over `GetActorTypesService.list()`, `optionValue: 'code'` | Mandatory. `duplicateType` renders the duplicate message instead of the generic required message |
| Specify other | `pInputText` | Shown and mandatory **only** when `actor_type_id === 5`; cleared on change away. **`5` is a client-side literal, not an import.** `ClarisaActorTypesEnum.OTHER = 5` exists **only in the server tree** (`server/.../clarisa-actor-types/enum/`); a grep of `client/research-indicators/src` returns zero matches, and the reference card hardcodes `=== 5`. The Implementer must either use the literal with a comment naming the server enum as its source, or introduce a client constant — but **must not attempt to import the enum** (`judgment.md` → `C-2`) |
| Mode switch | `p-checkbox` `Sex and age disaggregation does not apply` | Toggling clears the fields of the mode being left |
| Disaggregated | four `app-input type="number"` — Women youth / Women non-youth / Men youth / Men non-youth | Rendered only when the flag is falsy |
| Aggregate | one `app-input type="number"` `How many` → `actors_count` | Rendered only when the flag is true (family **D-4**: this **is** the total) |
| Total | read-only text, **not an input** | `computed` per §6.2 |

The four disaggregated inputs and the aggregate input all pass `[min]="0"` and `[maxFractionDigits]="0"`.

### 5.5 The organization card

Field set and cascade behavior mirror the existing organization card's *rules* without importing its code:

| Path | Fields |
| --- | --- |
| `is_organization_known === true` | `p-select` over `GetInstitutionsService.list()` (filterable, virtual-scrolled, `html_full_name`), `app-partner-selected-item` preview, and the `request to add an institution` link into `AllModalsService.openModal('requestPartner')` |
| `is_organization_known` falsy | `p-select` over `GetInstitutionTypesService.list()`; a sub-type `p-select` when `GetClarisaInstitutionsSubTypesService.getSubTypes(2, typeId)` returns rows; a `Specify other` input when `institution_type_id === 78` |
| both paths | `organization_count` — `app-input type="number"`, `[min]="0"`, `[maxFractionDigits]="0"`, **optional** |

**Divergence from the reference card, deliberate:** every field here is **optional**, so no asterisks and no required messages. The one message that does render is R-IUP-012 AC.5's — *this row does not identify an organization yet* — shown when the row has been touched but satisfies neither identity path. That message exists to prevent the `400` whose root cause chunk 2 documented as a silent data-destruction path.

### 5.6 The quantification card

`QuantificationItemComponent`, promoted to `shared/components/quantification-item/`, gains **two** inputs, both default-preserving:

| Input | Default | Effect |
| --- | --- | --- |
| `fieldsRequired: boolean` | **`true`** | `true` reproduces OICR's current rendering, which is **not uniform across the three fields** — Number and Unit carry `[isRequired]="true"` **and** `[validateEmpty]="true"`; **Comments** (an `app-textarea`) carries `[isRequired]="true"` and **no `[validateEmpty]`**. The `true` branch must reproduce that asymmetry field-by-field, not apply both attributes to all three. `false` — passed only by the new page — drops the asterisks and the required validation. *(Corrected at Judgment Day round 1, `judgment.md` → `S-1`: this row previously read "all three fields `[isRequired]` `[validateEmpty]`", and an Implementer building to that sentence would have added `validateEmpty` to OICR's Comments field at both of §2.3's call sites.)* |
| `maxFractionDigits?: number` | **`undefined`** | Forwarded to the Number field's `app-input`, exactly as DD-4 does for the actor and organization counts. `undefined` reproduces today's `Intl` resolution, so OICR stays byte-identical; **the new page passed `0` at the time this row was written.** ⚠️ **AMENDED 2026-08-27 by `docs/specs/changes/measure-number-signed-decimal` (`S-10`, `DC-12`): the Innovation Use page's call site no longer passes `0` — it now passes a derived, signed `min`/`max` and `[maxFractionDigits]="4"`, because `quantification_number` accepts signed decimals (scale ≤ 4) on this page. The shared card's own `undefined` default, and OICR's reliance on it, are unchanged — this amendment affects only the Innovation Use call site's argument.** **Added at Judgment Day round 1** (`judgment.md` → `S-2`) — without it `quantification_number` was the one count field in the section with no fraction guard, while the server DTO enforces `@IsInt() @Min(0)` on it, so a pasted `2.5` produced a chunk-2 `400`: the defect class §4.3 claims to close by construction. Chosen over hardcoding `0` inside the component, which would also have closed OICR's identical latent exposure but at the cost of changing another page's behavior and widening this spec's scope |

Its `QuantificationItemData` shape (`{number, unit, comments}`) is **not** changed. The new page adapts at its own boundary: `{id, quantification_number, unit, description}` ↔ `{number, unit, comments}`, merging by array index so `id` round-trips without the shared component knowing it exists. Changing the shared shape instead would have rewritten OICR's mapping code for no gain.

### 5.7 Design tokens and styling

Per [`docs/ux-ui/design.md`](../../../ux-ui/design.md) §7.1, which is a **binding contract**, not a suggestion.

| Element | Class / token |
| --- | --- |
| Field label / question | `.label` |
| Helper text | `.description` |
| Checkbox option text | `.option-label` |
| Card section heading | `.section-title` |
| Required marker | `<span class="text-red-500">*</span>` |
| Colors | `.abc-*` / `.atc-*` or `var(--ac-*)` |
| Sizing, spacing, gaps | `.rs-*`, `.fs-*`, with `.md:` variants |

**Zero hex literals in new files (DD-7).** The reference `innovation-details` page is saturated with them (`#1689CA`, `#E8EBED`, `#F4F7F9`, `#E69F00`, `#CF0808`, …). It is a *layout and interaction* reference; its color practice is a documented violation of §7.1 and matching it would propagate the violation into a file that has no legacy excuse. Where a reference hex has no existing token, the token is added to `src/styles/colors.scss` and registered in §7.1 in the same change — **not** inlined.

Dark mode requires no branch: tokens flip under `:root[data-theme="dark"]` and the `.dark-mode` body class. **Never** branch on `isDarkMode()` for a color (R-IUP-017 scenario).

---

### 5.8 Amendment 01 — the two guidance blocks (R-IUP-020, R-IUP-021)

Both blocks are **plain markup inside `innovation-use-details.component.html`**. No new component, no new input, no new service. They sit in card 1 in this order: label → guidance callout → `app-innovation-use-level-stepper` (untouched) → definitions link → evidence callout → conditional `app-textarea` (untouched).

**Why the copy is not attached to the textarea.** `app-textarea` already exposes `helperText`, which is the obvious home for P1 — and it does not work here, for two independent reasons:

1. `helperText` renders through `[innerHTML]`. Angular sanitizes that string and **does not compile bindings in it**, so a `routerLink` inside it is inert. A raw `href` would work visually and then full-page-reload the SPA, dropping the in-memory `body()`.
2. The textarea is conditional on `showJustification()` (`level >= 6`). Evidence is required at **every** level, so guidance hosted by the textarea would disappear at levels 0–5 — the exact population least likely to know it applies (R-IUP-021 AC.5).

**Token choices — and why the two obvious precedents are both wrong.** The instinct is to copy the neighbouring callout: either the in-page `ACTORS` guidance block, or the Innovation Dev page's readiness callout. **Both fail WCAG 2.1 AA in the light theme**, which PRD **C-4** makes non-negotiable and which **DD-14** explicitly keeps fully gated. Measured, not assumed:

| Role | Token | Ratio on `--ac-grey-100` (`#f4f7f9`) | Verdict |
| --- | --- | --- | --- |
| Body text — `ACTORS` callout's current choice | `--ac-grey-600` `#8d9299` | **2.91:1** | ❌ fails AA |
| Body text — Dev page's choice (as hex) | `#777c83` = `--ac-grey-700` | **3.91:1** | ❌ fails AA (large text only) |
| **Body text — use this** | **`--ac-grey-800`** `#4c5158` | **7.44:1** | ✅ |
| Link — Dev page's choice (as hex) | `#1689ca` = `--ac-light-blue-300` | **3.57:1** | ❌ fails AA |
| **Link — use this** | **`--ac-light-blue-400`** `#035ba9` | **6.35:1** | ✅ |
| Link — darker alternative | `--ac-light-blue-500` `#074b86` | **8.27:1** | ✅ |

Background `--ac-grey-100`; left border `--ac-light-blue-300` (decorative, not text — the 3.57:1 figure does not apply to it). The callout reuses the `ACTORS` block's `bg` / `border-l` / `rs-p-*` shape so the two callouts read as one family.

**⚠️ `.description` cannot carry these colours on its own — two traps, read out of the stylesheets themselves, not assumed. They live in **two different files**, which is the detail this warning originally got wrong:** the body-colour rule is `src/styles/custom-fields.scss:99–101`; the link repaint is `src/styles/styles.scss:193–199` (a nested SCSS `a` inside `.description`). *(Corrected 2026-08-26 at `T-14` finalization — this line read "both read out of `src/styles/custom-fields.scss`", which is false for the second row. Found by the Implementer, verified against both files by the Leader before writing, and independently re-confirmed by the Reviewer. **KZ-007:** a correction record is the highest-risk artifact class — and a wrong file path inside a trap warning is worse than no warning, because the next reader greps the named file, finds nothing, and concludes the trap is gone.)*

| Trap | What the stylesheet actually does | Consequence | What `T-14` must do |
| --- | --- | --- | --- |
| **Body colour** | `.description { color: #777c83; … }` — a **hardcoded hex in a shared stylesheet**, resolving to `--ac-grey-700` | **3.91:1** on `--ac-grey-100` → **fails AA**. Using `.description` alone silently ships the exact defect DD-17 exists to prevent | Use `.description` for **typography only** and pair it with an explicit `--ac-grey-800` colour utility on the same element |
| **Link colour** | `.description a { color: #2e2e2e; text-decoration: underline; }` — a nested selector, **in `styles.scss:193–199`, not `custom-fields.scss`** | Any link **inside** a `.description` element is repainted **near-black**. It passes contrast (**12.62:1**) and fails *discoverability*: it becomes visually identical to body text apart from the underline, silently defeating DD-17's link token | Keep the two links **outside** any `.description` element, or give them a colour utility that wins the cascade — and prove which, at `c12` |

Do **not** read the second row as a contrast problem. It is a **D8/D7** problem that every contrast gate passes, which is why it is written down here rather than left to the ratio table.

> **Advisory with a reachability verdict, filed rather than left in prose (KZ-008).** `.description`'s `#777c83` is **already shipped** and is **already used by this page's stepper definition callout** (`innovation-use-level-stepper.component.html`, delivered by `T-04`). It renders at **4.20:1** on `--ac-white-1`. **No `.description`-on-`--ac-grey-100` site is cited anywhere in this spec** — the `3.91:1` this paragraph once carried was the `loadFailed` banner's `--ac-grey-700`, a **local utility**, closed by `R1`. ⚠️ **And `.description` is not the worst role in this file: `.section-title { color: #a2a9af }` (`custom-fields.scss:90`) is 2.378:1 on white and renders four times in this section** (`innovation-use-details.component.html:13, 125, 166, 194`). Both are carried by `OQ-IUP-8`.
>
> ⛔ **Corrected 2026-08-26 by validation `F-2`.** This paragraph previously also named **the `ACTORS` guidance text** as a `.description` site, and quoted the range as **2.91:1–3.91:1**. **The ACTORS text never used `.description`** — it carried a **local Tailwind colour utility** on a line this spec authored, and the `2.91:1` end of that range was that utility, not this rule. The consequence was not cosmetic: it placed a **one-word, zero-blast-radius fix** behind an app-wide deferral, which is why the defect survived to be raised as `F-1`. **`R1` closed it** (`execution.md` → *R1 / R2 / R3*, `--ac-grey-600` → `--ac-grey-800`, **2.91:1 → 7.44:1**). What remains below is true of `custom-fields.scss`'s `.description` rule alone.
>
> **Reachability verdict: REACHABLE.** Light theme, default route, no toggle required — a reporter sees it today. This is therefore a **live PRD C-4 defect**, not a hypothetical, and stating it here is what keeps it from being "recorded as an advisory three times" (KZ-008's own failure mode).
>
> **The surviving half is nonetheless OUT of Amendment 01's scope**, deliberately: fixing `.description` edits a **shared stylesheet** consumed across the whole SPA, whose blast radius is every screen — not this card. **That argument reaches the shared stylesheet and reached nothing else**, which is the correction above — and it reaches **every** failing shared-class role in that stylesheet, not only `.description`. Narrowing it to one rule orphaned `.section-title` for one commit; `OQ-IUP-8` now carries both. Widening `T-14` to cover it would put an app-wide style change inside a copy amendment, with a copy amendment's gate. Filed as **OQ-IUP-8** for its own spec. `T-14` avoids inheriting it by not relying on `.description` for colour (row 1 above).

> **This closes `OQ-IUP-4` for this amendment, and does not reopen it.** Every colour these blocks need already exists in `src/styles/colors.scss` — verified by reading the file, not inferred. **No token is added, so `colors.scss` and `docs/ux-ui/design.md` §7.1 are untouched**, `T-11 c4`'s gate is not re-entered, and **DD-7**'s zero-hex rule is satisfiable with existing tokens alone.

---

## 6. Workflows & business rules

### 6.1 Load

1. `ngOnInit` / `VersionWatcherService.onVersionChange` → `GET_InnovationUseDetails(getCurrentNumericResultId())`.
2. `successfulRequest === false` → hand to `ActionsService`; **do not** set `body` to an empty shape (R-IUP-004 AC.3). A distinct `loadFailed` signal drives the error surface so an error is never rendered as an empty form.
3. On success: `body.set(response.data)`.
4. If `actors` is empty, push **one** blank `InnovationUseActor` as a UI affordance. `organizations` and `quantifications` stay empty — they are optional, and offering a blank card for an optional block invites the identity-less-organization `400`.
5. The catalog is loaded independently and once by `GetInnovationUseLevelsService` (root-provided, `constructor → main()`), mirroring `GetInnovationReadinessLevelsService`.

Green checks refresh as a side effect of step 1's `loadingTrigger: true`.

### 6.2 Derived total — transcribed from chunk 2 §5.5

| Mode | Total |
| --- | --- |
| `sex_age_disaggregation_not_apply === true` | `actors_count` |
| otherwise | sum of the four `*_count`, `null`/`undefined` treated as absent — **and `null` when all four are absent, not `0`** |

Computed in the actor card as a `computed`, rendered read-only, and **stripped from every payload**. The distinction between `null` and `0` is not cosmetic: `0` would tell the user they have reported a count of zero when they have reported nothing.

### 6.3 Numeric input — what is verified, and what is not

Read from `primeng@19.0.6`'s `primeng-inputnumber.mjs`, not inferred:

| Case | Mechanism | Verdict |
| --- | --- | --- |
| Typed `-` | `insert()` returns early when `!allowMinusSign()`; `allowMinusSign()` is `min == null \|\| min < 0` | **Blocked** by `[min]="0"` |
| Pasted `-1` | `onPaste` → `parseValue` → `insert()`, same early return | **Blocked** by `[min]="0"` |
| Below-min value on blur | `validateValue` clamps to `min` | **Clamped** |
| Typed `.` | `insert()`'s decimal branch requires `decimalCharIndex === -1 && this.maxFractionDigits`; `app-input` passes nothing, so this is `undefined` → falsy → the separator is dropped | **Blocked today** — `2.5` typed yields `25` |
| **Pasted `2.5`** | `onPaste` → `insert()` → `insertText('', '2.5', 0, 0)` → `textSplit.length === 2`, `decimalCharIndex === -1` → returns `formatValue('2.5')`, and `numberFormat` resolves `maximumFractionDigits: 3` because both fraction options are `undefined` (confirmed against `Intl.NumberFormat().resolvedOptions()`) | **NOT blocked today.** `2.5` reaches the body |

**Therefore** `app-input` gains `@Input() maxFractionDigits?: number`, forwarded to `p-inputNumber`. The new page passes `0` for its count fields (the five actor counts and `organization_count`). ⚠️ **AMENDED 2026-08-27 by `docs/specs/changes/measure-number-signed-decimal` (`S-10`, `DC-12`): the quantification card's Number field is now the exception — it passes a derived, signed `min`/`max` and `[maxFractionDigits]="4"`, not `0`. See §4.3's amendment note and §16.**

Two honest consequences, recorded rather than glossed:

- With `maxFractionDigits = 0`, a pasted `2.5` is **rounded to `3`** (`Intl` `roundingMode: 'halfExpand'`), not rejected. R-IUP-008 AC.4 requires "no fractional value in the body" — rounding satisfies it. A mid-form `400` would be worse UX for a count of people. This is documented behavior, not an oversight, **and it applies only to the six surviving count fields — the quantification card's Number is no longer bound by R-IUP-008 AC.4 (amendment above) and a pasted `2.5` there is now accepted, not rounded.**
- The typed case yielding `25` from `2.5` is **existing platform-wide behavior** of the shared control. This spec does not introduce it and does not fix it. Recorded as an accepted quirk.

### 6.4 The conditional justification

- Visibility and requiredness are evaluated on the **resolved `level`** — `levels.find(l => l.id === body().innovation_use_level_id)?.level` — never on `innovation_use_level_id` (R-IUP-006 AC.4).
- Lowering the level **hides** the control. The value stays in `body()` and is **still sent**.
- Sending it unchanged is deliberate and is the whole point: chunk 2 resolves the effective explanation as *key-present ? payload : stored*. An explicit `null` is a **present key** and **clears the stored column**. So "clear on toggle" is not a UI reset — it is data loss on the next save.

### 6.5 Payload construction — `buildPayload()`

A pure function over `body()`, unit-testable without rendering. Each rule maps to one chunk 2 rejection (§4.3):

| Step | Rule |
| --- | --- |
| 1 | Copy the three scalars. Omit `innovation_use_level` (server-derived) |
| 2 | `actors`: drop rows with no `actor_type_id`. Per surviving row, keep the active mode's fields and set the other mode's to `null`. Omit `total` |
| 3 | `organizations`: drop rows satisfying neither identity path — neither `institution_type_id`, nor `is_organization_known === true` with an `institution_id` |
| 4 | `quantifications`: drop rows where `quantification_number`, `unit` and `description` are all absent |
| 5 | Ids (`result_actors_id`, `result_institution_type_id`, `id`) are passed through **only** where the row already carried one from the GET. A row created by `Add` has none and must not be given one |

**The two id-related `400`s are unreachable by construction, not by validation.** Ids only ever enter `body()` from a GET response for this result, and no code path copies an id from one row to another. That is a stronger property than a check, and the spec that proves it must assert the *absence* of a synthesis path, not just a happy-path body.

### 6.6 Cross-row validation

| Rule | Mechanism |
| --- | --- |
| Duplicate actor type | A `duplicateActorTypeIndexes` computed over `body().actors`, keyed on `actor_type_id` — or, for type `5`, on `actor_type_id + trimmed lowercase actor_type_custom_name`. Flagged rows receive `duplicateType: true` and render the message; save is blocked while any row is flagged |
| Justification required at `level >= 6` | ⛔ **Superseded 2026-08-21 by `bugfix/innovation-use-draft-save`.** This row read *"Save blocked, textarea shows the inline required message"* — the save-time block is **deleted**. Save now proceeds regardless; the textarea still shows the inline required message and the red asterisk, and the section's green check stays `false` until real text is saved — enforcement moved entirely to submit time. See `execution.md` → *Pivot Record: R-IUP-006 / T-09* |
| No actor rows | Save is **allowed** (a draft with no actors is legal — R-IUP-014); the green check simply stays false and card 2 says at least one actor is required |

Every one of these mirrors a server rule. The server stays authoritative (PRD **AC-Role-Correctness**); no client check replaces one.

### 6.7 Save

1. If `!isEditableStatus()` → issue nothing (R-IUP-015 AC.3); handle Back/Next navigation only.
2. If a blocking client rule fails → show it inline, issue nothing.
3. `PATCH_InnovationUseDetails(id, buildPayload())`.
4. On `successfulRequest` → success toast → `await getData()`. That GET carries `loadingTrigger: true`, which is what turns the sidebar tick (R-IUP-016 AC.1/AC.2).
5. On failure → `ActionsService`, rendering `errorDetail.errors[]` inline against the offending field where the message carries a field name (TRD §6.3).
6. Navigation: `Back → alliance-alignment`, `Next → partners`, preserving `?version=N`, matching every sibling detail page.

**`Add` does not auto-save.** The reference page calls `actions.saveCurrentSection()` from `addActor()` / `addInstitutionType()`. Here that would PATCH a payload containing a row with no `actor_type_id` — a guaranteed `400` on the user's first click of `Add other actor`. Deliberate divergence (DD-8).

---

## 7. Shared contracts / package extensions

| Extension | Shape | Compatibility |
| --- | --- | --- |
| `GreenChecks` | `+ innovation_use?: number`, `+ ip_rights?: number` | Additive optional. Nothing renamed or removed |
| `app-input` | `+ @Input() maxFractionDigits?: number` | Optional; `undefined` reproduces current `Intl` resolution exactly for all 16 consumers |
| `QuantificationItemComponent` | `+ @Input() fieldsRequired = true`, `+ @Input() maxFractionDigits?: number`; moved to `shared/components/` | Both defaults preserve OICR byte-for-byte; the move changes **one** import path (`oicr-details.component.ts`) and no template |

No new path alias. No `tsconfig` / `jest.config` change. No `service-locator` registration — the stepper consumes its service by injection, not by `[serviceName]`, so the locator's `switch` is untouched.

---

## 8. Security & authorization

No new endpoint, no new auth path, no secret, no PII beyond what the Results domain already holds.

| Concern | Handling |
| --- | --- |
| Authentication | `jWtInterceptor`, unmodified. Both endpoints sit behind the global JWT middleware |
| Authorization | Chunk 2 attaches no `@Roles(...)` to this section; access is JWT + `ResultStatusGuard`. The client **mirrors** editability via `isEditableStatus()` and never claims to enforce it |
| External results | `isExternalResult()` already forces `isEditableStatus()` false, so a federated indicator-6 record renders read-only with no extra code |
| Family FR-7 / AC-1718 | **Untouched and not discharged.** This spec writes Innovation Use rows only through chunk 2's guarded endpoint. It neither widens nor narrows the Innovation **Dev** endpoint's exposure. Do not read this spec's completion as closing that row |

---

## 9. Observability

Client-tier only, and deliberately thin: no new logging channel, no analytics event, no socket subscription.

- Failures surface through `httpErrorInterceptor` → `ActionsService` (toast/alert), as every sibling page does.
- Successes surface as a toast naming the section.
- No token, no user identifier, and no free-text field content is passed to Hotjar / Clarity / GA / BugHerd — the client guide forbids it and this spec adds no exception.

---

## 10. Testing strategy

### 10.1 Two tiers, and what neither can prove

| Tier | Proves | Cannot prove |
| --- | --- | --- |
| Jest + jsdom unit specs | Wiring, payload construction, derived values, conditional logic, DOM presence and text | Anything **rendered**: layout, contrast, focus ring, focus order. jsdom computes no layout |
| `npm run build` | Compilation, `strictTemplates`, bundle budgets | Behavior |

**Neither tier can see the defect class this spec most often produces** (visual). §9 of `requirements.md` names the substitutes: a human visual check **in the light theme** at 1440 px and at the `md:` breakpoint, plus a T6-Multimodal screenshot review. That is a gate, not a formality, and it is the reason R-IUP-017 and R-IUP-018 carry no automated done-criterion. *(Amended 2026-08-21 — this sentence read "in both themes"; **DD-14** lifts the dark half because dark mode is unreachable by any user. The gate itself is undiminished for everything a user can actually see.)*

### 10.2 Unit specs

| Spec | Must assert |
| --- | --- |
| `innovation-use-details.component.spec.ts` | The four UI states; `buildPayload` against every rule in §6.5; the level-6 conditional including the *hide-then-restore* sequence; duplicate-actor-type blocking; save/re-read; no-PATCH-when-not-editable |
| `innovation-use-level-stepper.component.spec.ts` | Ten buttons labelled 0–9; **select label `6` ⇒ emits `7`**; **load id `7` ⇒ label `6` selected**; callout renders `level`/`name`/`definition` and **no `additional_guidance`**; empty catalog renders no buttons; English `aria-label` |
| `innovation-use-actor-item.component.spec.ts` | Mode switching renders exactly one mode; total computes per §6.2 including **`null` not `0`** when all four absent; total is not an input; OTHER reveals and clears the custom name; duplicate message renders when flagged |
| `innovation-use-organization-item.component.spec.ts` | Both identity paths render their own fields; the sub-type cascade appears only when sub-types exist; `78` reveals the custom name; **no asterisk on any field**; the not-yet-identified message |
| `quantification-item.component.spec.ts` (updated) | `fieldsRequired` defaults to `true` and reproduces the current rendering **including the Number/Unit vs Comments `validateEmpty` asymmetry** (§5.6); `false` drops asterisks and required validation. `maxFractionDigits` is forwarded to the Number field, and **omitting it leaves that field's rendered binding unchanged**. These assertions do not exist today — the current spec has zero coverage of required-ness or fraction handling — so they must be written, not assumed (see §10.3) |
| `input.component.spec.ts` (updated) | `maxFractionDigits` is forwarded; **omitting it leaves the rendered `p-inputNumber` binding unchanged** |
| `result-sidebar.component.spec.ts` (updated) | Indicator 6 yields the seven paths in order; indicators 1/2/4/5 yield **identical** lists to before |
| `cache.service.spec.ts` (updated) | `case 6`; every other case unchanged |
| `api.service.spec.ts` (updated) | The three methods hit the right URLs with the right configs, asserted on the `MainResponse<T>` envelope via `HttpTestingController` |
| `alliance-alignment` / `partners` specs (updated) | **Next / Back navigate to `innovation-use-details` for indicator 6** — asserted at the call site, because the `cache.service` assertion alone is a presence assertion (R-IUP-003) |

### 10.3 The falsifying input for each check

A check that cannot fail is not evidence. Each of these must be shown to fail against a deliberately broken variant:

| Check | Input that must make it FAIL |
| --- | --- |
| Stepper id/level binding | Bind `level` instead of `id` on emit → the `label 6 ⇒ emits 7` spec fails |
| Derived total | Return `0` instead of `null` for all-absent → the `null not 0` spec fails |
| Blank-row filter | Remove the `actor_type_id` guard → the `buildPayload` spec sees two rows |
| Section-path wiring | Delete `case 6` → **the `alliance-alignment` Next spec fails**, not only the cache spec |
| `app-input` non-regression | Give `maxFractionDigits` a non-`undefined` default → the "omitting it changes nothing" spec fails |
| `fieldsRequired` default | Flip the default to `false` → **the new assertion §10.2 orders into the updated spec** fails. Note explicitly: OICR's *existing* specs cannot detect this — `quantification-item.component.spec.ts` today asserts input defaults, disabled state, `ngOnInit`/`ngOnChanges` sync and emit behavior, and **nothing** about `isRequired` / `validateEmpty` / asterisks. Falsifiability here is created by writing the assertion, not inherited |
| `maxFractionDigits` on the quantification card | Remove the forwarding → a spec pasting `2.5` into the Number field sees a fractional value in the emitted row. ⚠️ **AMENDED 2026-08-27 by `docs/specs/changes/measure-number-signed-decimal` (`S-10`, `DC-12`): this falsifier held only under the original contract, where any fractional value in this field was a defect. On the Innovation Use page's own Number field, a fractional value (scale ≤ 4) is now the intended, accepted behavior — R-MSD-003. The falsifier survives unchanged for OICR's two quantification blocks only, which still receive the shared card's `0` default and are not edited by that spec. See §4.3's amendment note and §16.** |
| Callout fields | Render `additional_guidance` → the spec asserting its absence fails |

### 10.4 Disqualifiers — when a green run is not evidence

| Signal | Disqualifier |
| --- | --- |
| `npm test` | A **targeted** suite is not evidence for R-IUP-019 (KZ-003). Only a full `npm test -- --silent` counts. A run that skips or filters files must be reported as inconclusive, not as a pass |
| `npm run build` / budget | A build run while any delegated agent is active is a **wrong** number, not a slow one (root `CLAUDE.md` §4.3). If concurrency cannot be ruled out, report *inconclusive* and re-run in a quiet window |
| `npm run lint` | ⚠️ the script carries `--fix` and **mutates files**. It is not a read-only check; `git status` must be re-inspected after |
| Coverage | A coverage number above the floor achieved by adding assertions that mock away the rendering is **not** evidence (KZ-001). The specs in §10.2 assert rendered text and computed values |
| Human visual check | A tick must **quote what was observed**. "The page renders" does not discharge "contrast ≥ 4.5:1 in dark mode" (KZ-002 recurrence 6) |

### 10.5 What a green run still does not prove

- That the server accepts the payload — **AR-1**. No client-tier test reaches a live API. Contract conformance rests on chunk 2's archived fixture tier plus §4.3's transcription.
- ~~That indicator 6 is selectable in the deployed environment — **A2 / OQ-IUP-2**, a deployment fact.~~ **Corrected 2026-08-21 at the T-13 Pivot:** this was not a deployment fact and not unprovable from the repo. `indicators.service.ts:34` closes the create-result dropdown to indicator 6 with a hardcoded allowlist `[1, 2, 4, 5]`. **A2 is falsified, OQ-IUP-2 is resolved**, and the allowlist correction is authorized in `execution.md` → `## Pivot Record: T-13`. What a green run still does not prove is the *deployed* state of that corrected code — which is an ordinary release fact, not a spec unknown.
- That the section is visually correct or accessible — **AR-2**, human-gated.

---

## 11. Design decisions

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| **DD-1** | 2026-08-20 | Page shape follows **`capacity-sharing`** (titled cards), not `innovation-details` (four-panel accordion) | The reference's accordion exists because it has four distinct sub-forms. This section has one detail group and three repeatable blocks; an accordion would hide three of the four cards behind a click for no structural reason |
| **DD-2** | 2026-08-20 | **Decline the proposal's Option A** for `actor-item` / `organization-item`. Build Innovation-Use-local cards instead. | Three independent reasons. (1) The data half genuinely differs — four **booleans** vs five **int** counts plus an aggregate mode and a derived total; sharing would produce the conditional card Option C was rejected for, one level down. (2) Both components write to the parent through a **hardcoded array key** and reconcile with `effect` + `JSON.stringify`; parameterizing that is a refactor of a live page. (3) Decisive: R-IUP-019 AC.2 requires Innovation Dev's existing specs to pass unmodified, and any API change to those cards rewrites them. **This is the one home for that figure** (KZ-005): **1,665 lines across three files** — `innovation-details.component.spec.ts` 638, `organization-item.component.spec.ts` 635, `actor-item.component.spec.ts` 392. All three, not just the two card specs, because the page spec renders the page that passes `[bodySignal]` into both cards, so a card-API change breaks it too. Derived by `wc -l` over those three paths; re-derive rather than restate. The proposal anticipated this exactly — *"if specify finds the two cards diverge more than expected, falling back to Option B is a documented, low-cost pivot."* Challenged in §11.1 |
| **DD-3** | 2026-08-20 | **Promote `QuantificationItemComponent` to `shared/`** with two additive inputs — `fieldsRequired` and `maxFractionDigits`. Closes **OQ-IUP-3** | This is the reuse that pays. It already uses the clean `@Input` value + `@Output` event API with **no** parent coupling, so it is reusable as-is. Two default-preserving inputs (`fieldsRequired`, and `maxFractionDigits` added at Judgment Day round 1 per `judgment.md` → `S-2`) keep OICR exactly as it is. Duplicating it would clone the number/unit/comment card a third time |
| **DD-4** | 2026-08-20 | `app-input` gains an optional `maxFractionDigits`, forwarded to `p-inputNumber`; the new page passes `0` | **Verified** against `primeng@19.0.6`: with both fraction options `undefined`, `Intl` resolves `maximumFractionDigits: 3`, and `insertText` formats a pasted `2.5` through that resolution — so a fraction reaches the body. `[min]="0"` already blocks negatives on both paths. Optional-with-`undefined`-default keeps all 16 consumers byte-identical (§6.3) ⚠️ **AMENDED 2026-08-27 by `docs/specs/changes/measure-number-signed-decimal` (`S-10`, `DC-12`): "the new page passes `0`" now holds only for the **six** surviving count fields — the five actor counts (§5.4) and `organization_count` (§5.5). The measure Number (`quantification_number`, §5.6) passes `[maxFractionDigits]="4"` with a derived signed `min`/`max`, because it accepts signed decimals (scale ≤ 4). The `undefined` default and every other consumer are unchanged — this amendment narrows only the Innovation Use call site's argument.** |
| **DD-5** | 2026-08-20 | New child components use `@Input` + `@Output`, never a `WritableSignal` of the parent's whole body | Makes the cards pure and independently testable, which is what makes KZ-001's "assert rendered output, not mock invocation" achievable. It also removes the id-synthesis paths that produce two of chunk 2's `400`s (§6.5) |
| **DD-6** | 2026-08-20 | The client applies **no sort** to the level catalog and depends on none | Chunk 2's `ClarisaInnovationUseLevelsService` overrides `findAll()` with `order: { level: 'ASC' }`. Re-sorting client-side would hide a server regression; the spec asserts the rendered order instead |
| **DD-7** | 2026-08-20 | **Zero hex literals** in new files. Missing colors become tokens in `colors.scss` + a §7.1 registration, never inline hex | `docs/ux-ui/design.md` §7.1 is a binding contract. The reference page's hex saturation is a documented violation; matching an existing violation is not consistency. Dark mode "just works" only for token users |
| **DD-8** | 2026-08-20 | `Add other actor` / `Add other organization` do **not** auto-save | The reference calls `saveCurrentSection()` from `addActor()`. Here that PATCHes a row with no `actor_type_id` — a guaranteed `400` on the user's first click |
| **DD-9** | 2026-08-20 | Add **both** `innovation_use` and `ip_rights` to the client `GreenChecks` interface | The sidebar's existing indicator-1 and indicator-2 IP rights rows read `ip_rights`, which the interface never declared — the lookup only compiles because of an `as keyof GreenChecks` cast. Adding an indicator-6 row would widen a known type gap while touching the exact line. **Corrected 2026-08-21 (T-10 Pivot):** the original text read *"Closing it costs one line"* — **that was false, and it conflated declaring a key with removing the cast.** The cast is applied to `greenCheckKey`, typed `string`, so it is required regardless of how many keys are declared. Declaring the two keys is what this decision authorizes; **closing the cast is a separate ~10-line change tracked as `tasks.md` RB-8** |
| **DD-10** | 2026-08-20 | The empty state offers **one** blank actor card and **no** blank organization or quantification card | Actors are required (contract C3), so a blank card is a helpful affordance. Organizations are optional, and a blank organization card is precisely the identity-less row whose `400` chunk 2 added to stop a silent data-destruction path |
| **DD-11** | 2026-08-20 | A load failure sets a distinct `loadFailed` signal; it never seeds `body` with an empty shape | Otherwise a failed GET is indistinguishable from an empty section, and the user's next save wipes the record. R-IUP-004 AC.3 |
| **DD-12** | 2026-08-20 | Citations in this document use **symbols and anchors**, not line numbers | Chunk 2's line citations rotted from its own edits to the same files — recorded there as FP-50. Two citations in its `design.md` had to be converted mid-spec |
| **DD-13** | 2026-08-20 | `ui-ux-pro-max` was **not** loaded, though the command prefers it for UI work | Its value is style, palette, and font-pairing selection. All three are already fixed by `docs/ux-ui/design.md` §7.1's binding contract, and this section must match an existing production page. Loading a style-selection skill here adds a source of non-conforming suggestions with no decision left to make. `angular-developer` was loaded instead. Recorded because it is a deviation from the command's stated preference, not an omission |
| **DD-14** | **2026-08-21** | **Dark mode is dropped from this spec's *verification* obligations, and kept in its *implementation* obligations.** The human visual check (`T-13` c7), the T6-Multimodal review (`T-13` c8), the D7 substitute, and the §closure checklist all become **light-theme only**. The token-based implementation rules stay exactly as they are: DD-7's zero-hex rule, R-IUP-017's "never branch on `isDarkMode()` for a color", and `T-11` c5 (already `[x]`) are **unchanged and still binding** | **User ruling, 2026-08-21, on verified evidence — not a waiver.** Dark mode is **not reachable by any user**: `DarkModeService` is imported and injected at `alliance-navbar.component.ts:22,52` but appears **nowhere** in `alliance-navbar.component.html`, and no other control exposes a toggle. It is a dead injection. The §5.7 contrast defect the T-11 review found (**1.29:1** and **1.887:1** against 4.5:1) is therefore in an **unreachable state**, and an unreachable state is not a defect worth spending a human gate on — this is **KZ-008's reachability discipline applied in the negative direction**, the same test that turns an advisory *into* a defect used to rule this one out. **The split is deliberate:** the verification half costs a human pass per theme and buys nothing today, while the implementation half already passed, costs nothing to keep, and is precisely what would make dark mode work if it is ever wired up — deleting it would be a real loss disguised as a saving. **Reopening condition:** if a dark-mode toggle is ever exposed, `T-13` c7/c8 revert to both themes and the §5.7 contrast defect becomes live and blocking. **Light-mode WCAG 2.1 AA remains fully gated** (PRD **C-4**); only the dark half is lifted. Full record: `execution.md` → *Dark-mode deferral* |

| **DD-15** | **2026-08-26** | **Amendment 01's guidance blocks are plain markup in the page template, not a new component and not `app-textarea`'s `helperText`** | `helperText` renders via `[innerHTML]`, which Angular sanitizes and does not compile — a `routerLink` inside it is inert, and a raw `href` would full-page-reload the SPA. And the textarea is conditional on `showJustification()`, while the guidance must render at every level. A dedicated component would be one consumer, zero inputs, zero outputs. §5.8 |
| **DD-16** | **2026-08-26** | **The Evidence link builds its own `['/result', id, 'evidence']` + query params rather than reusing the sidebar's `navigateTo()`** | `navigateTo()` is a private method on `ResultSidebarComponent` taking a `SidebarOption`; calling it would mean injecting a sibling component or exporting a helper for one caller. The *contract* is copied — same commands shape, same `version` / `from` forwarding — and R-IUP-021 AC.4 asserts that contract on the built arguments, which is what actually protects it. **The duplication is named, not hidden:** if the sidebar's param policy changes, this call site must change with it, and AC.4 is the test that will fail if it does not. ⚠️ **AMENDED 2026-08-26 after this decision shipped a defect — read this before copying anything from the sidebar again.** "Copy the contract" was read as including the sidebar's **id source**, `route.snapshot.paramMap.get('id')`, and that source is **invalid at this component's depth**: `paramsInheritanceStrategy` is never set in `app.config.ts`, so Angular's default `'emptyOnly'` applies and a child route does not inherit its parent's params. `:id` lives on `result/:id`; `innovation-use-details` is its **child**, so `.get('id')` returned `null` and the button navigated to `/result/null/evidence`. `ResultSidebarComponent` reads it successfully only because it is declared **at** `result/:id` (`result.component.html`), not below it. **Identical code at a different route-tree depth behaves differently, and that is precisely why a line-by-line review confirmed the copy as correct and passed the bug.** **The id source is therefore NOT part of the copied contract.** Use `cache.currentResultId()` — what this page's own `navigateTo()` and 12 sibling result pages already use. It is depth-independent (set once per `:id` change by `ResultComponent`'s effect, at the `result/:id` level) and it is `WritableSignal<string | number>` that carries a **platform-coded** id such as `STAR-13232` **verbatim**. Never `getCurrentNumericResultId()` or `getCurrentPlatformCode()` here: both truncate, producing a URL form no other page in the app emits. What IS copied: the commands shape and the `version` / `from` forwarding rules. See `execution.md` → *Pivot Record: DD-16* |
| **DD-17** | **2026-08-26** | **The new blocks use `--ac-grey-800` for body text and `--ac-light-blue-400` for links — not the tokens the two neighbouring callouts use** | **Measured, not assumed** (§5.8): the `ACTORS` callout's `--ac-grey-600` is **2.91:1** and the Dev page's `#777c83` / `#1689ca` are **3.91:1** / **3.57:1** on `--ac-grey-100`, all below AA's 4.5:1. Copying the nearest precedent would ship a **reachable** light-theme **C-4** violation — the same defect class **DD-14** dismissed only because its instance was in unreachable dark mode. Applying KZ-008's reachability test in the positive direction makes this one blocking |

### 11.1 Reversion challenge (Step 2.3) — DD-2

**Trigger.** DD-2 declines a refactor rather than removing shipped behavior, so the strict trigger is not met. Run anyway, per *"when in doubt, run it: one question is cheaper than one rework attempt"* — DD-2 overturns the proposal's own recommendation, which is the class of decision that reaches implementation unaudited.

**Question: what does *not* reusing `actor-item` / `organization-item` break?**

**Answer — one concrete cost, and it is real.** Visual and behavioral consistency between the two innovation sections becomes hand-maintained. A future change to the actor card's layout, its OTHER handling, or its disaggregation copy must be applied in two places, and the second will eventually be missed. This is exactly the fragmentation the PRD's reuse goal (G6-adjacent) exists to prevent, and the proposal's Option-B column named it: *"two actor cards drift apart on the next design change."*

**Design narrowed in response** (not reversed):

1. **Share the primitives, not the cards.** Both card families are built from the same `app-input` / `app-select` / `p-checkbox` / `.label` / `.section-title` / `app-partner-selected-item` set. A change to a *primitive* still lands once. What is duplicated is composition, which is the part that genuinely differs.
2. **Name the debt where a future spec will find it.** §13 carries an explicit follow-up: *consolidate the two actor-card implementations behind one variant-aware component, once Innovation Dev's cards can be refactored on their own schedule with their own spec rewrite budget.* An unnamed duplication is what drifts; a named one is a backlog item.
3. **Bound it.** Only the two cards are duplicated. The quantification card is promoted (DD-3), and no shared component is forked.

**What the challenge did not find:** no test covers `actor-item` or `organization-item` in a way that DD-2 breaks — they are untouched, so the whole spec set DD-2 measures keeps passing unmodified, which is R-IUP-019 AC.2's requirement rather than a casualty of it.


### 11.2 Reversion challenge (Step 2.3) — R-IUP-020 AC.1, the label change

**Trigger — met.** `T-07` shipped the label `Level of use of this innovation`; **R-IUP-020 AC.1 replaces it.** Replacing shipped user-visible text is a reversion, so the challenge is owed.

**Question: what does changing this label break?**

**Answer — one real thing, and it is not a test.** Nothing automated breaks: the string is asserted **nowhere**. Verified by grep across `requirements.md`, `design.md`, `tasks.md`, and `client/research-indicators/src` — the only hits are the template itself and the amendment proposal. The two spec tests that reason about this label are scoped to the `TextareaComponent` instance (`By.directive(TextareaComponent)`), explicitly *because* a page-wide search would match the stepper's own label vacuously — so they are indifferent to its text.

What does break is **cross-page consistency of a different kind than expected**. The Innovation **Development** page asks `How would you assess the current readiness of this innovation?`. Today the two pages are inconsistent (`Level of use of this innovation` vs `How would you assess…`); after this change they become **parallel**. So the change *reduces* inconsistency rather than creating it — which inverts the usual reversion finding and is the reason to record it rather than assume it.

**Design not narrowed — one risk registered instead.** The change also makes the two pages' copy near-identical, which raises the odds that a future edit to one is assumed to have covered the other. Filed as **OQ-IUP-7** (mirror the Dev page's label? out of scope here — R-IUP-019 forbids touching it), so the divergence is a named backlog item rather than a silent one.

**What the challenge did not find:** no test, no green-check key, no payload field, and no `docs/ux-ui/design.md` entry depends on the old string. The reversion is safe.

---

## 12. Budget (Step 2.4)

| Dimension | Estimate | Derivation |
| --- | --- | --- |
| **Tasks** | **13** | §13's decomposition preview |
| **LOC** | **~3,200** | ~1,700 implementation (page 650 · actor card 350 · organization card 380 · stepper 150 · contract layer 120 · wiring 50) + ~1,500 specs |
| **Review rounds** | **~28** | **Derived from chunk 2's actuals, not from optimism.** Chunk 2 ran 13 tasks / ≥ 26 rounds ≈ 2.0 rounds per task, after its specify-time estimate of 6–8 proved ~3× low — as chunk 1's had. Chunk 3 has the same task count and a **weaker** automated gate (visual defects are human-gated), so 2.0–2.3 rounds per task is the honest baseline. Estimating 6–8 again would repeat a documented error twice over |

**Sizing verdict: the estimate matches the declared `Full` depth.** Comparable to chunk 2 in task count, larger in LOC, and carrying an irreducible human-gated verification. Neither dropping to `Standard` nor splitting is indicated: the task graph has one hard sequence (contract layer → cards → page → wiring → verification) and splitting it would put the page in one PR and its reachability in another, shipping a page no user can open.

#### Amendment 01 delta (2026-08-26)

| Dimension | Was | Amendment 01 | New total |
| --- | --- | --- | --- |
| Tasks | 13 | **+1** (`T-14`) | **14** |
| LOC | ~3,200 *(written)* / **~4,600** *(user re-baseline after T-07)* | **+180 … +260** (~45 template/TS, ~150–215 spec — the spec tier dominates on every task this branch has run) | **~3,400** / **~4,800** |
| Review rounds | ~28 | **+2 … +3** | **~31** |

**Amendment 01 does not reconcile the running overrun and must not be read as absorbing it.** `T-13 c10` owns the reconciliation, and it reconciles against **~3,400 / ~31**, not ~3,200 / ~28. ✅ **It was re-run 2026-08-26** (after validation `F-3`/`F-4`) and is **closed**: the LOC tripwire is breached and the review-round budget is not. **`execution.md` → `T-13` c10 is the single home of both figures** (`KZ-005`): it carries the deriving command, the per-commit split and the deltas against this table's two baselines. **This paragraph deliberately does not restate them** — it names the baselines they are measured against, which is this table's job. Adding the delta here rather than silently is the point — **KZ-005**'s escalation is *fewer sites asserting a derived figure*, so this table is the only place the amended budget lives.

**This is a tripwire, not a cap.** `/akili-execute` compares actuals and **stops and escalates** on a breach. Exceeding it is information; passing it silently is how a UI feature grows a fourteen-task machinery.

---

## 13. Rollout

| Concern | Answer |
| --- | --- |
| Deploy order | Client-only, and it consumes endpoints that shipped with chunk 2. **The server must be deployed first** — a client ahead of its server renders a section whose GET `404`s |
| Feature flag | **None.** The page is only reachable from an indicator-6 result, which today reaches a dead end. Shipping it strictly improves that path; a flag would add a state to test with no state to protect |
| Migration | none |
| Backout | Revert the client commit. No data written by the page is orphaned — chunk 2's endpoint owns the rows and other paths already read them |
| Comms | STAR reporters: Innovation Use is now reportable — **and newly *selectable*, which this spec did not originally plan to change.** *(Amended 2026-08-21 at the T-13 Pivot: this row previously said "Confirm A2 / OQ-IUP-2 first — if indicator 6 is already selectable in production…". It cannot be: `indicators.service.ts:34`'s allowlist closed it everywhere, so the premise was false in every environment.)* MEL: a seventh section appears in the review flow for indicator 6. **Two audiences, not one:** (a) reporters gain a new selectable indicator in *Create result* — the visible product change; (b) any results already parked on indicator 6 (created before the allowlist, or by another path) become completable the moment this ships. Whether (b) is a non-empty set remains a deployment fact worth confirming for comms, but it no longer gates anything |
| Follow-up owed | (a) Consolidate the two actor-card implementations (§11.1). (b) Results Center / dashboard / export for indicator 6 (**D-IUP-6**). (c) Family **FR-7** / AC-1718 — **not** this spec's, and not closed by it. **The `docs/ux-ui/design.md` §8.1 + §12 registration is *not* on this list**: R-IUP-017 AC.4 requires it "in the same change" and **`T-12`** budgets it inside this spec. *(Corrected at Judgment Day round 1, `judgment.md` → `C-3`: it was previously listed here as owed follow-up, so a reader of this table alone would have shipped in breach of AC.4.)* |

### Task decomposition preview (authored in Phase 3)

Contract layer → shared additive edits → child components → page → wiring → verification.

`T-01` interfaces + `ApiService` + level service · `T-02` `app-input` `maxFractionDigits` · `T-03` promote `quantification-item` + `fieldsRequired` + `maxFractionDigits` · `T-04` stepper · `T-05` actor card · `T-06` organization card · `T-07` page shell + load/states · `T-08` `buildPayload` + save · `T-09` cross-row validation · `T-10` route + sidebar + section path + `GreenChecks` · `T-11` a11y + tokens + dark-mode pass · `T-12` docs registration · `T-13` full-suite + build + budget + human visual/a11y gate.

---

## 14. Open questions

| ID | Question | Owner | Blocks | Status |
| --- | --- | --- | --- | --- |
| OQ-IUP-2 | Is indicator 6 `is_active` in the deployed environment (family **FR-5**)? | Product owner / DevOps | ~~nothing — informs §13 comms and urgency~~ → **blocked `T-13` c1/c7/c8/c9** | ✅ **RESOLVED 2026-08-21 at the T-13 Pivot.** The status previously read *"a deployment fact, not answerable from the repo"* — **both halves were wrong.** It was answerable from the repo (`indicators.service.ts:34`, allowlist `[1, 2, 4, 5]`), and it blocked the spec's entire human gate. `is_active` is now moot for reachability |
| OQ-IUP-4 | If a reference color has no existing `--ac-*` token (DD-7), is adding one to `colors.scss` acceptable in this spec, or should it be a separate design-system change? | Engineering lead | one criterion of `T-11` | **new** — raised by DD-7; default assumption is *add it here and register it in §7.1 in the same change*, per the client guide's own instruction |

### Closed at design time

| ID | Resolution |
| --- | --- |
| ~~OQ-IUP-1~~ | **Closed → DD-2 + DD-3.** Split verdict: local cards for actors and organizations, promotion for quantifications. Grounded in the coupling evidence and in R-IUP-019 AC.2, and challenged in §11.1 |
| ~~OQ-IUP-3~~ | **Closed → DD-3.** Promote the OICR card to `shared/`; adapt the shape at the page boundary so `id` round-trips without changing `QuantificationItemData` |

---

## 15. References

- [`./requirements.md`](./requirements.md) — R-IUP-001…019, NFR-IUP-001…006, §6 binding contracts, §9 defect-class gate table
- [`../family.md`](../../innovation-use/family.md) — family decisions **D-1** (`id = level + 1`, non-unique `name`), **D-2** (unit is free text), **D-3** (story governs over the screenshot), **D-4** (aggregate mode is the total), **D-8** (no OpenSearch decoration), **D-9** (four lifecycle routines), **D-10** (transcribe SQL); risks **FR-1**, **FR-4**, **FR-5**, **FR-7**
- [`docs/specs/archive/2026-08-20-innovation-use--details-api/design.md`](../../archive/2026-08-20-innovation-use--details-api/design.md) — §4 the frozen wire contract and its full `400` table, §5.1 the write transaction, §5.5 total derivation, §5.6 catalog ordering
- [`docs/specs/archive/2026-08-19-innovation-use--data-model-and-catalog/`](../../archive/2026-08-19-innovation-use--data-model-and-catalog/) — the schema, the seeded catalog, `innovation_use_validation`
- [`docs/ux-ui/design.md`](../../../ux-ui/design.md) §7.1 — the form-label and token binding contract; §8.1 — the component inventory this spec must register into
- [`client/research-indicators/src/CLAUDE.md`](../../../../client/research-indicators/src/CLAUDE.md) — path aliases, where files go, hard rules C-1…C-6
- `docs/specs/kaizen-log.md` Active Lessons — **KZ-001** (double fidelity, §10.2/§10.4), **KZ-002** (enumerate by the real thing, §2.3; quote what a human observation covered, §10.4), **KZ-003** (full suite, §10.4), **KZ-005** (bound a correction sweep on every axis; one home per derived figure, §Document Control), **KZ-006** (end-to-end criterion for a verification mechanism, `T-13`)

---

## 16. Revision log

| Date | Change |
| --- | --- |
| 2026-08-20 | Initial draft. OQ-IUP-1 and OQ-IUP-3 closed at design time (DD-2, DD-3). Step 2.3 reversion challenge run on DD-2 — found a concrete cost, design narrowed. Budget re-baselined from chunk 2's actuals rather than its specify-time estimate. |
| **2026-08-26** | **Amendment 01 — level-selector guidance & evidence copy.** Added §5.8, **DD-15** (markup, not `helperText`), **DD-16** (own router call, contract copied), **DD-17** (contrast-driven token choice), §11.2 (reversion challenge on the label change), and the budget delta in §12. Amended §5.1's card-1 row. **`OQ-IUP-4` closed for this amendment — no token added.** Source: [`proposal-amendment-01-level-guidance.md`](./proposal-amendment-01-level-guidance.md). |
| **2026-08-27** | **External amendment by `docs/specs/changes/measure-number-signed-decimal` (`S-10`, `DC-12`) — `quantification_number` carved out of the negative/fractional-count guarantee.** This document's `§4.3` 400-map row, the §0 findings-table row 3, §5.6's `maxFractionDigits` input table row, §6.3's `maxFractionDigits`/rounding claims, and §10.3's `maxFractionDigits` falsifier row all asserted, unqualified, that the promoted `QuantificationItemComponent`'s Number field (§5.6) rejects negatives and fractions via `[min]="0"` + `[maxFractionDigits]="0"`, the same as the five actor counts and `organization_count`. That is no longer true for the **Innovation Use details page's own call site**: the field now accepts signed decimals (scale ≤ 4, magnitude bounded per that spec's `DD-14`) and passes a derived `min`/`max` plus `[maxFractionDigits]="4"` instead. Each affected passage is qualified in place with a dated note. **OICR's two quantification blocks are unaffected and unedited** — they still receive the shared card's `0` default. This document is a point-in-time record and is not otherwise re-verified; only the superseded present-tense claims are struck/qualified. Governing requirements: `R-MSD-007`, `R-MSD-011` (see also the matching amendment on `requirements.md`'s `R-IUP-008`). ⚠️ *§5.6's row was found only on this rework attempt's second sweep pass (a field-keyed, repo-wide pattern), after a first pass limited to the previously-cited line list missed it — see `execution.md` → `### T-12`'s fixed-point record.* **§11's `DD-4` decision row is amended in place by the same note.** |
