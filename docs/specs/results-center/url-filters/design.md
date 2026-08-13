# Design — results-center / url-filters

- **Module:** results-center (client) + results (server, link producer only)
- **Spec id:** 2026-08-url-filters
- **Status:** draft — **revised after Judgment Day round 1** (see `judgment.md`)
- **Owner:** d.casanas@cgiar.org
- **Linked requirements:** ./requirements.md
- **Linked TRD:** `docs/trd/trd.md:370` — URL state is owned by the Angular Router
- **Last updated:** 2026-08-12

> **Revision note — two review rounds.** Round 1 of a blind dual review found four confirmed severe defects and four parent-verified suspects (D-URL-9 … D-URL-14). A scoped re-judgment of those fixes then found **four regressions the fixes themselves introduced**, three of which traced to a single decision: making the URL write an unconditional `effect()`. Round 2's correction (D-URL-15) keeps component ownership — which both judges verified as sound — and replaces reactivity with an explicit user-intent trigger. Full ledger in `judgment.md`.

---

## 1. Goals & non-goals

**Goals**

1. One pure, testable codec that is the single authority for `URL ⇄ filter state` in both directions (R-RCU-001, R-RCU-002, R-RCU-003).
2. A frozen slug vocabulary that cannot rot when a display name changes (R-RCU-001).
3. Deterministic precedence between URL, session state and legacy parameters (R-RCU-004, R-RCU-006).
4. Failure that degrades rather than blocks (R-RCU-005).
5. **A structural guarantee — not a test — that the URL write path cannot fire outside Results Center** (NFR-RCU-005).

**Non-goals** — see `requirements.md` §1. Restated where the design could be misread: no `lever` parameter, no pagination/sort/search in the URL, no database or API contract change, and **no attempt to reconcile the `result_status` name divergence** recorded as R5.

---

## 2. Architecture

```
        ┌───────────────────────────────────────────────┐
        │  URL  /results-center?indicator=…&contract=…   │
        └───────────────┬───────────────▲───────────────┘
                 parse  │               │  serialize
                        ▼               │
        ┌───────────────────────────────────────────────┐
        │  results-center-url.codec.ts        (PURE)    │
        │  results-center-url.vocabulary.ts   (FROZEN)  │
        └───────────────┬───────────────▲───────────────┘
                        ▼               │
        ┌───────────────────────────────────────────────┐
        │  ResultsCenterComponent                       │
        │   · read  — init only, from route.snapshot    │
        │   · write — on userFilterMutations() only ◄───┼── ownership + intent
        │   · owns precedence + toast                   │
        └───────────────┬───────────────────────────────┘
                        ▼  seedFromUrl() — one call, all state
        ┌───────────────────────────────────────────────┐
        │  ResultsCenterService   (providedIn: 'root')  │
        │  tableFilters · resultsFilter · appliedFilters│  ← shapes unchanged
        │  ⚠ shared by 5 surfaces on 4 routes           │
        └───────────────┬───────────────────────────────┘
                        ▼
             GetResultsService.fetchPaginated   ← contract unchanged
```

The codec is **pure** — no DI, no router, no signals — following `capdev-recipients.builder.ts` on the server: it *returns* what it dropped instead of logging, and the caller decides what to do about it.

### 2.1 Composition

| Path | Responsibility |
| --- | --- |
| `…/results-center/url/results-center-url.vocabulary.ts` | Frozen `slug ⇄ id` maps (`indicator`, `status`, `source`); recognized-parameter list; bounds constants |
| `…/results-center/url/results-center-url.codec.ts` | `parse(paramMap) → { filters, scope, dropped, hadRecognizedParam }` and `serialize(state) → params`. Pure |
| `…/results-center/url/results-center-url.codec.spec.ts` | Codec units, round-trip property, vocabulary uniqueness/parity |
| `…/results-center/results-center.component.ts` | **Modified** — read path, precedence, **component-scoped write effect**, toast |
| `…/results-center/results-center.component.spec.ts` | **Rewritten** — the existing harness cannot test this (see §10.2) |
| `…/results-center/results-center.service.ts` | **Modified** — `seedFromUrl()`; `applyStatusFilterFromHomeLink` folded into it |
| `…/home/components/data-overview/*` (+ `.spec.ts`), `…/home/components/main-actions/*` | **Modified** — emit canonical parameters; both `data-overview` cards must add **`tab=my`** (R-RCU-007 AC.1b) |
| `…/project-dashboard/project-dashboard.component.spec.ts`, `project-detail`, `select-linked-results-modal`, `links-to-result` specs | **Extended** — isolation assertions (NFR-RCU-005) |
| `server/…/notifications/capdev-bulk-notification.service.ts` (+ `.spec.ts`) | **Modified** — `buildStarLink(input.agreementId)` |

### 2.2 Reuse

- `ActivatedRoute` / `Router` — already injected (`results-center.component.ts:30-31`).
- `ActionsService.showToast` — already injected (line 35).
- **`MultiselectComponent`'s existing label backfill** — the mechanism D-URL-10 leans on; see §7.2.
- `applyStatusFilterFromHomeLink` (`results-center.service.ts:733`) — folded into `seedFromUrl()`, not duplicated.
- `AppConfig.COMPLETE_CLIENT_HOST` — the server keeps using it (R-RCU-007).

---

## 3. Data model

**No data model changes.**

---

## 4. API surface

**No endpoint changes.** The only server delta is one string:

| Before | After |
| --- | --- |
| `COMPLETE_CLIENT_HOST('/results-center?indicatorTab=1')` | `COMPLETE_CLIENT_HOST('/results-center?indicator=capacity-sharing-for-development&contract=<AGREEMENT_ID>')` |

`buildStarLink(agreementId)` is called from `buildTemplateData(input)`, where `input.agreementId` is **already present** (`CapdevGroupSendInput.agreementId`, set by `dispatch` at line 346). No new plumbing through `dispatch` is needed — this is a one-line change.

---

## 5. The vocabulary (frozen)

### 5.1 `indicator` — single-value

Byte-identical to the server's `QueryIndicatorsEnum` (R-RCU-001 AC.5):

| id | slug |
| --- | --- |
| 1 | `capacity-sharing-for-development` |
| 2 | `innovation-dev` |
| 3 | `knowledge-product` |
| 4 | `policy-change` |
| 5 | `oicr` |
| 6 | `innovation-use` |

The slug is **not** a kebab of the display name for ids 2 and 5 — the server's spelling is the contract, not a derivation.

**`indicator` is single-value** (D-URL-12). It writes `indicator-codes-tabs`, which holds exactly one id; the sidebar's indicator multiselect is hidden whenever a tab is set (`table-filters-sidebar.component.html:2`). A comma in `indicator` is an invalid token, rejected via R-RCU-005 — never truncated to the first value.

### 5.2 `status` — multi-value

Authored from the `allResultStatus` control list the filter actually offers (25 rows, dev database, 2026-08-12). Slugs were seeded once by mechanical kebab-casing; **the map is the contract, the derivation is not** (D-URL-2).

| id | slug | id | slug |
| --- | --- | --- | --- |
| 1 | `editing` | 14 | `oicr-published` |
| 2 | `submitted` | 15 | `oicr-not-accepted` |
| 3 | `accepted` | 16 | `editing-in-prms` |
| 4 | `draft` | 17 | `submitted-in-prms` |
| 5 | `pending-revision` | 18 | `qaed-in-prms` |
| 6 | `approved` | 19 | `discontinued-in-prms` |
| 7 | `not-approved` | 20 | `completed-in-tip` |
| 8 | `deleted` | 21 | `editing-in-aiccra` |
| 9 | `oicr-requested` | 22 | `submitted-in-aiccra` |
| 10 | `oicr-accepted` | 23 | `bilateral-pending-review` |
| 11 | `oicr-postponed` | 24 | `bilateral-approved` |
| 12 | `oicr-in-science-edition` | 25 | `bilateral-rejected` |
| 13 | `oicr-in-km-curation` | | |

**Uniqueness verified** — all 25 distinct; the near-collisions (`accepted`/`oicr-accepted`, `editing`/`editing-in-prms`) are genuinely different strings. A test asserts it.

> ⚠️ **Known divergence, out of scope (requirements §9 R5).** The server's `ResultStatusNameEnum` carries **22** ids — 15, 21, 22 are absent — and eight differing names (id 5 `Revised`, 7 `Rejected`, 9 `Requested`, 10 `OICR Approved`, 11 `OICR Postpone`, 12 `Science Edition`, 13 `KM Curation`, 14 `Published`). **The slugs above are frozen strings, not derivations of either source**, so the divergence cannot change them. Ids the control list does not return simply never resolve, degrading via R-RCU-005. Reconciling the two sources is a data-integrity concern for another spec.

### 5.3 `source` — frozen, synchronous, multi-value

**Corrected (D-URL-13).** `SourceFilterOptionsService` is `list = signal([...SOURCE_FILTER_OPTIONS])` (`source-filter-options.service.ts:8`) — a **static, synchronous, four-entry client constant**, not a remote list. There is no async load to wait for:

| slug | `platform_code` |
| --- | --- |
| `aiccra` | `AICCRA` |
| `star` | `STAR` |
| `prms` | `PRMS` |
| `tip` | `TIP` |

The codec resolves `source` from this constant at parse time, exactly like `indicator` and `status`.

### 5.4 Natural keys and case policy

| Param | Value | Case | Validation |
| --- | --- | --- | --- |
| `contract` | `agreement_id` | **Upper-cased on read and write** (D-URL-11) | `^[A-Za-z0-9._-]{1,32}$`; **not** existence-validated (D-URL-7) |
| `year` | report year | n/a | integer in `[2000, 2100]` |
| `tab` | `my` \| `all` | lower | exact match |

`contract` upper-casing is what makes R-RCU-001 AC.3 (`?CONTRACT=a100` ≡ `?contract=A100`) and R-RCU-003 AC.2 (round-trip) hold **simultaneously**, without consulting the contracts control list. `agreement_id` values are upper-case alphanumeric in the source system, so the normalization is lossless.

### 5.5 Bounds (R-RCU-005 AC.4)

| Bound | Value | Behavior on breach |
| --- | --- | --- |
| Values per list parameter | 50 | the whole parameter is dropped |
| Characters per token | 64 | that token is dropped |
| Repeated key | — | read via **`getAll()`** and flattened, never reduced to the first occurrence |

---

## 6. Workflows

### 6.1 Read path — init only

1. Read `route.snapshot.queryParamMap`. **Fold every incoming key to lower case before lookup** — `queryParamMap.get()/getAll()` are case-sensitive, so `?CONTRACT=a100` yields nothing under a raw `getAll('contract')` and R-RCU-001 AC.3 would fail on the very example that names it *(R2-6)*. **The recognized-key list in `results-center-url.vocabulary.ts` MUST itself be stored folded** *(R3-3)*: the three legacy names are camelCase (`indicatorTab`, `statusTab`, `statusLabel`), so folded incoming keys compared against raw stored names match **nothing**, and every already-delivered CapDev email silently stops filtering. Folding must be symmetric or not done at all. Read values with **`getAll()`** per folded key (§5.5).
2. `codec.parse(...)` → `{ filters, scope, dropped, hadRecognizedParam }`. A legacy parameter is consulted **only** when its canonical counterpart is absent — deterministic and order-independent (R-RCU-006 AC.2).
3. **Resolve the my/all scope** (R-RCU-002 AC.6/AC.7 — the defect the previous draft missed entirely):
   - `tab=my` / `tab=all` → that scope, explicitly.
   - **no `tab`** → the pinned-tab preference, via the existing `loadPinnedTabPreference()`, exactly as a parameter-less visit resolves it today. The scope is **never** left at whatever the root singleton happened to hold from a previous route.
4. If `hadRecognizedParam` is false → unchanged behavior: `restorePersistedState`, pinned preference, `loadAllResults`/`loadMyResults`. **Exit.**
5. If true → **skip `restorePersistedState` entirely** (R-RCU-004).
6. Call `service.seedFromUrl({ filters, scope })` — one call that writes all state (§7.1) **before** any fetch.
7. Fire exactly one `main()` (R-RCU-002 AC.4).
8. If `dropped` is non-empty → one toast, counts only, once per navigation (R-RCU-005 AC.2/AC.3).
9. **Wipe nothing.** Both existing wipes are removed (D-URL-8) — **by T-08, not by T-06.** *(Clarified 2026-08-13: this step describes the **end state**. T-06 implements steps 1–8 and deliberately **keeps** the wipe, because design §12's ordering constraint forbids removing it before the write path exists. T-06 merged the two wipes into one `router.navigate` call; T-08 deletes that single call. **Locate it by content, never by the old `112-121`/`133-138` line ranges, which now point at T-06's NFR-RCU-002 layer-2 warning effects** — see `tasks.md` T-08.)*

### 6.2 Write path — component-owned, driven by user intent

**Two things must both be true, and round 2 proved they are different problems:** the write must be *owned by the component* (so it cannot fire on another route — NFR-RCU-005), **and** it must fire only on *user-initiated* change (so it cannot fire during load, restore, or a cross-route mutation). Round 1 solved only the first, with an unconditional `effect()` watching `appliedFilters`; that caused three separate regressions (R2-2, R2-5, and half of R2-1's damage).

#### The trigger is intent, not state — D-URL-15

`ResultsCenterService` exposes a monotonic counter, `userFilterMutations`, incremented **only** by the user-facing mutators reachable while the Results Center is on screen:

| Increments | Does **not** increment |
| --- | --- |
| `applyFilters` (sidebar Apply) | `seedFromUrl` (the read path) |
| `removeFilter` (chip dismissal) | `restorePersistedState` |
| `clearAllFilters` | `main()` (including its `create-user-codes` rewrite) |
| `onSelectFilterTab` | `initializeProjectDashboardResultsTable` |
| **component** `onActiveItemChange` handler *(R3-1)* | `clearAllFiltersWithPreserve` (modal/links-to-result only) |
| **component** `togglePin` handler *(R3-1)* | `loadMyResults` / `loadAllResults` |

> **R3-1 — the my/all tab and the pin toggle increment in the *component*, not the service.** `results-center.component.html:14` binds `(click)="onActiveItemChange(item)"` to the **component's** arrow function (`results-center.component.ts:190`), which calls `cleanFilters()` — a service method on *neither* side of this table, wiping six `tableFilters` collections at `results-center.service.ts:799-807` — and then the component-local `loadMyResults()` / `loadAllResults()`, which `.set()` the three signals wholesale. Line 17's pin button reaches `togglePin` (`:254-293`) via the same two methods. **`ResultsCenterService.onActiveItemChange` (`:626`) has no production caller at all** — a counter placed there increments on dead code and the service-unit test passes while the feature is broken.
>
> The increment must **not** go inside `loadMyResults` / `loadAllResults`: those are also reached from the read path, and incrementing there re-opens R2-5.

**`cleanFilters()` is deliberately absent from both columns** — it is only ever reached *from* an incrementing handler, so giving it its own increment would double-count a single user action.

The component's effect declares **`userFilterMutations()` as its only tracked dependency** and reads the filter signals **untracked** to serialize them. Consequences, each closing a named regression:

- It cannot fire during the read path or restore, because those do not increment *(closes R2-2, R2-5)*.
- Its mandatory first run at creation sees the counter at its entry value and **no-ops by explicit guard** — not by luck of comparison *(closes R2-2)*.
- A cross-route mutation cannot reach the effect, because **the component that owns it is destroyed** *(preserves the isolation both judges verified)*.

> **Corrected 2026-08-12 during execution (T-05).** This bullet previously read *"the counter does not move, and the component is destroyed anyway"*. The first clause is **false**: `resetState()` (`results-center.service.ts:973`) calls `clearAllFilters()`, which increments, and its only caller is `project-detail.component.ts:171` — a different route. So a cross-route mutation *can* move the counter. The isolation guarantee is therefore **exactly one thing: component destruction** — which is what D-URL-9 always claimed and what makes it a lifecycle guarantee rather than a convention. Harmless in practice (the effect captures its entry baseline at creation, so bumps that happened while it did not exist are absorbed), but **T-12 must assert the right guarantee — component destroyed, not counter frozen.**

This also matches R-RCU-003's own wording, which scopes the write to filters changed **"through the UI"** — the reactive design could not express that distinction; an intent counter can.

#### Steps

1. The counter advances. The effect runs.
2. Guard: if the counter equals its value at effect creation, **return** — this is the mandatory first run.
3. `codec.serialize(state)` → a parameter object that **carries an explicit `null` for every inactive parameter the codec parses** — the six canonical ones **and the three legacy ones** — alongside the active ones. **`tab` is emitted only when the scope is `my`; `all` serializes to `null`** *(R3-4)*.
4. Compare the **merged result** (`{...currentParams, ...next}` with nulls stripped) against the current query string. If identical, **return** — the loop guard (NFR-RCU-001).
5. `router.navigate([], { relativeTo, queryParams, queryParamsHandling: 'merge', replaceUrl: true })`.

#### Why step 3 emits nulls — R2-1

`queryParamsHandling: 'merge'` is `{...current, ...new}` with only **null-valued** keys stripped. A key that is merely **omitted is preserved verbatim**. An earlier draft said "empty filters omitted (never `?contract=`)", which meant clearing `contract` serialized to `{}`, merge kept `?contract=A100`, and the address bar retained a filter the table no longer applied — and because the read path is init-only, a reload **resurrected a filter the user had explicitly cleared**. The same mechanism pinned rejected tokens and legacy parameters in the URL forever, since D-URL-8 removed both wipes.

Emitting `null` for inactive parameters is exactly what the two existing wipes already do, and it is what makes `merge` safe. `merge` is still required: it is what preserves unrecognized parameters such as `?utm_source=…`, which R-RCU-004 AC.3 contemplates.

**The null set is "every key the codec parses", not "every canonical key"** *(R3-2)*. `indicatorTab` / `statusTab` / `statusLabel` are read by the codec but are not canonical; scoping nulls to canonical keys alone left them pinned in the URL forever, because D-URL-8 removed the wipe that used to clear them. Arriving from a delivered email at `?indicatorTab=1` and switching indicator would emit `indicator: null` while the URL still read `?indicatorTab=1`, and the next load would re-apply the legacy value — the user could never leave it. **The codec parses these keys, therefore it owns clearing them.** Keys it does *not* parse are still never nulled: that is what protects `?utm_source`.

**Why `tab` needs its own rule** *(R3-4)*: the scope always resolves to `my` or `all` (§6.1 step 3), so `tab` is never "inactive" under a literal reading and would always be emitted — leaving `/results-center?tab=all` after a clear, contradicting R-RCU-003's "no query string". Never emitting it is equally wrong: a user in `my` scope who clears filters would lose it, and the reload would re-resolve from the pinned preference (default `all`), repeating R2-4's loss.

Step 4 compares the *merged result*, not the raw serialization: comparing serializations would navigate on every run whenever an unrecognized parameter is present.

`replaceUrl` keeps history depth flat (NFR-RCU-004).

**Why this is structural, not a convention.** `ResultsCenterService` is `providedIn: 'root'` and is mutated from five surfaces across four routes:

| Consumer | Call | Route |
| --- | --- | --- |
| `project-detail.component.ts:156`, `.html:161` | `applyFilters()` | `/project-detail/:id` |
| `project-dashboard.component.ts:215` | `initializeProjectDashboardResultsTable` | `/project-detail/:id` |
| `select-linked-results-modal.component.ts:137,156,262` | `clearAllFilters*()` | `/result/:code/…` |
| `links-to-result.component.ts:169` | `clearAllFiltersWithPreserve()` | `/result/:code/…` |
| `results-center-table.component.ts:249` | `removeFilter` → `applyFilters` | both |

A write placed in the service would rewrite the address bar of every one of those routes. An effect owned by `ResultsCenterComponent`'s injector is **destroyed with the component**, so when the user is anywhere else it cannot run — the guarantee comes from the framework's lifecycle, not from a reviewer remembering. The isolation tests in §10 then verify the guarantee rather than being the guarantee.

### 6.3 Server link build

`buildStarLink(input.agreementId)` from `buildTemplateData` — one line, no new plumbing (§4).

---

## 7. Frontend design

### 7.1 `seedFromUrl()` — one method, all state

The recurring defect class is **state desync** (D3): the API filter applies while the sidebar chip or tab strip shows nothing, because a writer updated `resultsFilter` and forgot `tableFilters`. The existing code already carries the hazard — `applyFilters` hand-writes the same **seven**-key object twice into two signals (`results-center.service.ts:672-692`).

`seedFromUrl({ filters, scope })` writes, in one call:

1. `invalidateResultsFetchDedupe()` **first** — every existing mutator does this (`applyFilters:668`, `onSelectFilterTab:699`, `clearAllFilters:811`), and `lastSuccessfulResultsFetchKey` survives across component instances on the singleton. Omitting it yields a silent "filter applied, table unchanged" — the D3 defect through a side door.
2. `tableFilters` — option objects per §7.2.
3. `resultsFilter` + `appliedFilters` — the wire keys.
4. `myResultsFilterItem` + `create-user-codes` — the scope from §6.1 step 3.
5. Indicator tab selection — per §7.3.

`applyStatusFilterFromHomeLink` is folded in. Nothing in the URL path writes a signal directly.

### 7.2 Seed the value key, never the label key

**Corrected (D-URL-10).** `MultiselectComponent.onChange` backfills labels from its own option list — but **only for items missing the label key**:

```
hasNoLabelList = …filter(item => !Object.hasOwn(item, this.optionLabel))
…gated on hasNoLabelList?.length          // multiselect.component.ts:187-192
```

The previous draft prescribed seeding `{ result_status_id, name }`. That object **has** `name` — the status control's `optionLabel` — so the backfill never runs and the seeded string becomes the chip permanently. That is exactly why `applyStatusFilterFromHomeLink` renders the literal `'Status'` (line 735), and it made R-RCU-006 AC.3 unsatisfiable.

**Rule: seed only the option-value key.**

| Filter | `optionValue` | `optionLabel` | Seed | Backfill runs? |
| --- | --- | --- | --- | --- |
| status | `result_status_id` | `name` | `{ result_status_id }` | ✅ |
| source | `platform_code` | `name` | `{ platform_code }` | ✅ |
| project | `agreement_id` | `select_label` | `{ agreement_id }` | ✅ |
| year | `report_year` | `report_year` | `{ report_year }` | n/a — label **is** the value |

The label then comes from the control list, which is precisely what R-RCU-006 AC.3 requires, and the §5.2 `name` column reverts to provenance documentation with no runtime role.

> **`indicator` is deliberately absent from this table** *(R2-3)*. The indicator multiselect is individually `@if`-gated on `!resultsFilter()['indicator-codes-tabs']?.length` (`table-filters-sidebar.component.html:2`), and D-URL-12 routes `indicator` to exactly that key — so seeding it is the very condition that **destroys the component whose backfill this mechanism relies on**. `onSelectFilterTab` also clears `tableFilters.indicators` (`:724-727`), and `getActiveFilters` gates the `INDICATOR` chip on `indicator-codes-filter`, so a seeded entry would render no chip while still inflating `countTableFiltersSelected`. **`indicator` is seeded only through §7.3 — never into `tableFilters.indicators`.**

**Transient, stated so it is not mistaken for a defect:** between seeding and control-list resolution, `getActiveFilters` renders `s.name ?? ''` — a briefly blank chip label for status and source. It resolves, because `<app-table-filters-sidebar>` is projected into a **CSS-toggled** panel (`[class.show-sidebar]`, `section-sidebar.component.html:1`), not an `@if` — so the multiselects instantiate and load on page load whether or not the sidebar is open. The D3 test must assert the chip **after** the control list resolves; asserting it before would pin the transient as the expected value.

### 7.3 Indicator tab strip — do not rely on the existing self-heal

**New (D-URL-14).** `syncIndicatorTabSelection` maps over `api.indicatorTabs.lazy().list()`, which is normally **empty at `ngOnInit`**. The existing self-heal is the `onChangeList` effect in `results-center.service.ts` — which calls **`this.onChangeList.destroy()` on its first successful run**, on a root singleton. Once any earlier route has triggered it, it is gone for the session, and a second visit to Results Center seeds `active` into an empty list that is never re-synced.

Design: the filter value (`indicator-codes-tabs`) is written immediately, so **the fetch is correct regardless**. The *visual* `active` flag is synced by a **component-scoped effect** in `ResultsCenterComponent`, created and destroyed with the component so it re-arms on every visit.

**Its dependencies are `indicatorTabs.lazy().isLoading()` AND `resultsFilter()['indicator-codes-tabs']` — both, not the first alone** *(R2-7)*. Keying on `isLoading()` alone is insufficient: an effect runs once at creation, and on a repeat visit the list is already cached with `isLoading()` permanently `false`, so that single run lands **before** `seedFromUrl()` — which happens after `initializeState()`'s awaited `loadPinnedTabPreference()` — writing `active: false` everywhere with no re-run. Tracking the filter signal makes the seed itself the trigger, so ordering stops mattering.

**Do not pass `allowSignalWrites`** *(corrected 2026-08-13, T-07)*. An earlier revision of this subsection called it required, on the reasoning that the effect writes signals transitively through `lazy()`. On this repo's Angular (19.1.6) the option is a **deprecated no-op** and writes from an effect are always allowed: `@angular/core/index.d.ts` marks it `@deprecated no longer required, signal writes are allowed by default`, `core.mjs` emits a dev-mode `console.warn` when it *is* passed, and `BASE_EFFECT_NODE` hard-sets `consumerAllowSignalWrites: true`. Omitting it is therefore not merely equivalent but slightly better — it avoids that deprecation warning, which the singleton's `onChangeList` still triggers. The precedent to follow is T-06's two effects in the same component file, which omit it and say why in their doc comment.

**Both dependency reads must sit above the `isLoading` guard, not below it** *(T-07)*. Angular re-collects an effect's dependencies on every run, so an early `return` placed before the `resultsFilter()` read leaves a creation-run-while-loading tracking `isLoading` **only** — reintroducing exactly the single-dependency state R2-7 rules out. Correctness would usually survive by luck, because the eventual `isLoading` false-flip re-runs the effect and re-reads the filter; it breaks for a seed that arrives *during* loading.

**The effect must never read `list()`.** It writes `indicatorTabs.lazy().list` through `syncIndicatorTabSelection`, which uses `list.update(prev => …)` — an untracked read (`signalUpdateFn` reads `node.value` as a direct field access, registering no consumer). Reading `list()` in the effect body instead would make it a consumer of the signal it writes, and the mapping returns a new array every time, so it would never settle.

The singleton's self-destructing `onChangeList` effect — the one whose `destroy()`-on-first-success is the whole reason this mechanism exists — is left untouched (out of scope) and nothing here depends on it. **Locate it by content, not by line:** search `results-center.service.ts` for `onChangeList = effect(`. (An earlier `:405-430` citation in this subsection had already drifted 13 lines by the time T-07 ran, and stale line ranges have twice caused real damage in this spec — see `tasks.md` T-08.)

### 7.4 Toast

`ActionsService.showToast({ severity: 'warn', … })`, naming **counts, not values**. Not interpolating the token is a stronger guarantee than escaping it (R-RCU-005 AC.3).

---

## 8. Cross-package contract

No shared package exists, so the contract is a **literal asserted on both sides** (D6):

| Side | Assertion |
| --- | --- |
| Server | `capdev-bulk-notification.service.spec.ts` — the built link ends with exactly `/results-center?indicator=capacity-sharing-for-development&contract=A100` |
| Client | `results-center-url.codec.spec.ts` — parsing that same literal yields indicator id 1 and contract `A100` |

Neither imports the other. A spelling change on either side turns one test red. This makes D6 **detectable**, not covered — the honest claim.

---

## 9. Security

- No new authorization surface; the URL expresses nothing the sidebar could not already select.
- **NFR-RCU-003** — `tab=my` is the only expression of user scope; no identifier is serialized.
- `contract` is not existence-validated (D-URL-7), so the URL cannot probe which contract codes exist.
- No token value is interpolated into the toast or any DOM sink.

---

## 10. Testing strategy

### 10.1 Coverage

| Level | File | Covers |
| --- | --- | --- |
| Unit (pure) | `results-center-url.codec.spec.ts` | D1 — per-parameter parse/serialize, multi-value **with order preserved** (R-RCU-002), `getAll()` flattening, bounds (§5.5), **key case-folding** via the literal `?CONTRACT=a100` (R2-6), single-value `indicator` rejection, canonical-beats-legacy, round-trip, vocabulary uniqueness, and **`serialize` emits `null` for every inactive canonical key and never for a key it does not own** (R2-1 / D-URL-16) |
| Component | `results-center.component.spec.ts` (**rewritten**) | D2, D3 — navigate/fetch call counts; **rendered** chip and tab strip after control-list resolution; scope resolution with and without `tab`; precedence over sessionStorage; toast once per navigation. **Plus the three regression guards from round 2:** zero `router.navigate` during init when arriving with stale singleton state from another route (R2-2); zero `router.navigate` on a parameter-less visit that restores persisted state, and `restorePersistedState` still honoured on the *next* load (R2-5); and clearing a filter **removes** its key from the address bar (R2-1) |
| Service unit | `results-center.service.spec.ts` (extend) | D-URL-15 — `userFilterMutations` advances for each of the five user-facing mutators and **does not** advance for `seedFromUrl`, `restorePersistedState`, `main()`, `initializeProjectDashboardResultsTable` or `clearAllFiltersWithPreserve`. This table is the contract; a mutator added later without a decision lands in the wrong column silently |
| Component | `project-dashboard.component.spec.ts` (**extend, real service**) | D5 — NFR-RCU-005 on the only caller of `initializeProjectDashboardResultsTable` (`project-dashboard.component.ts:215`) |
| Component | `project-detail`, `select-linked-results-modal`, `links-to-result` specs | D5 — no `router.navigate` from service-level filter mutations on those routes |
| Component | `data-overview.component.spec.ts` | Producer change — currently asserts `{ statusTab: 7, statusLabel: 'Submitted' }` (lines 153-163) |
| Server unit | `capdev-bulk-notification.service.spec.ts` | D6 half — the literal |
| Runtime | dev/QA console — **owned by T-06** *(assigned 2026-08-12; this row previously named no task)* | NFR-RCU-002 layer 2 — completeness warning when a control-list id has no slug. Also the named mitigation for the write-side gap in `execution.md` §5.2: `serialize` silently omits an id absent from the frozen map, so a link can under-describe the view. Layer 2 is the only thing that surfaces such an id |
| Full suite | `npm test -- --silent` (**whole client suite**) | D5 *(KZ-003)* |
| Manual | HITL | D6 — paste the server-built string into a running client |

### 10.2 The existing component spec must be rewritten, not extended

`results-center.component.spec.ts` currently does **both** disqualified things at once: a canned-snapshot `ActivatedRoute` double (lines 101-108) **and** `template: '<div></div>'` (112-117), over a fabricated service mock with no real signals. Nothing renders and no real state exists.

Meeting §10.1 means dropping the template override, using the real `ResultsCenterService`, providing real control-list services for the child multiselects, and switching to a real router harness. **This is a rewrite of a ~1,000-line spec and is its own task in the budget** — the previous draft's estimate did not carry it.

### 10.3 Disqualifying conditions

A green command that does **not** count as evidence:

- A hand-rolled `ActivatedRoute` returning a canned snapshot tests the assertion, **not the parsing** *(KZ-001)*.
- Asserting `tableFilters().contracts` contains an object is a **presence assertion**; it cannot prove the chip renders. D3 closes only on a rendered assertion, taken **after** control lists resolve (§7.2).
- A targeted `--testPathPattern=results-center` run is **not** evidence for D5, regardless of exit code.
- The vocabulary **fixture** test passing is not evidence that no drift exists — by construction it cannot see a server-side addition (NFR-RCU-002).

---

## 11. Rollout

- **Deployment order: client first, then server.** A server emitting the new link before the client parses it points every delivered email at ignored parameters. Client-first is always safe (legacy still works).
- **No feature flag** — additive on read; the write path is inert until a filter changes.
- **Backout:** revert the client commit; the server's new link degrades to R-RCU-005 behavior (parameters ignored, page usable).
- **Comms:** none external; only the URL behind `[STAR CapDev panel link]` changes.

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D-URL-1 | 2026-08-12 | Codec is a **pure module** returning `dropped` | Mirrors `capdev-recipients.builder.ts`; testable with plain fixtures |
| D-URL-2 | 2026-08-12 | Slug vocabulary is a **frozen constant**, not runtime-derived — closes Q2 | A slug resolved from a display name rots every delivered link on a rename |
| D-URL-3 | 2026-08-12 | `contract`, `status`, `year`, `source` accept comma lists — closes Q1 | Symmetry; the email emits one value |
| D-URL-4 | 2026-08-12 | Notice is a **toast** naming counts, not values — closes Q3 | Reuses the platform pattern; non-interpolation beats escaping |
| D-URL-5 | 2026-08-12 | Read path is **init-only from `route.snapshot`** | Structural loop guard: a write cannot re-enter a read that does not listen |
| D-URL-6 | 2026-08-12 | `lever` excluded | No sidebar control renders it; a URL-only filter is a trap |
| D-URL-7 | 2026-08-12 | `contract` not existence-validated | An invisible-but-real contract must yield an empty table; conflating leaks existence |
| D-URL-8 | 2026-08-12 | **Remove both query-parameter wipes** — `112-121` **and** `133-138` | *Revised (JD-9): the previous draft named only the first, leaving `?tab=my` self-destructing* |
| **D-URL-9** | 2026-08-12 | **The URL write is a component-scoped `effect()`, never a service method** | *(JD-3)* The service is a root singleton mutated from five surfaces on four routes; a service-level write rewrites `/project-detail` and `/result` URLs. Component ownership makes NFR-RCU-005 a lifecycle guarantee instead of a test |
| **D-URL-10** | 2026-08-12 | **Seed only the option-value key; never the label key** | *(JD-2)* The multiselect backfills labels only for items *missing* the label key. Seeding the label freezes it forever and makes R-RCU-006 AC.3 unsatisfiable |
| **D-URL-11** | 2026-08-12 | **`contract` is upper-cased on read and write**; case policy is per token class | *(JD-1)* A blanket "lower-case on write" made R-RCU-001 AC.3 and R-RCU-003 AC.2 mutually unsatisfiable and rendered `PROJECT: a100` |
| **D-URL-12** | 2026-08-12 | **`indicator` is single-value**; a comma is an invalid token | *(JD-15)* The tab strip holds one id and hides the indicator multiselect; multi-value is unrepresentable, so rejecting beats truncating |
| **D-URL-13** | 2026-08-12 | **`source` is a frozen synchronous vocabulary** from `SOURCE_FILTER_OPTIONS` | *(JD-4)* The previous draft claimed it resolved against an async control list; the service is a static client constant |
| **D-URL-14** | 2026-08-12 | **Tab-strip sync is a component-scoped effect** keyed on the loading signal **and** the filter signal | *(JD-7, revised R2-7)* `onChangeList` calls `destroy()` on first success on a root singleton. Keying the replacement on `isLoading()` alone reproduced the bug: on a repeat visit that signal is already `false`, so the effect's single run lands before the seed |
| **D-URL-15** | 2026-08-12 | **The write effect's only tracked dependency is a `userFilterMutations` counter**; filter state is read untracked | *(R2-2, R2-5)* An unconditional effect fires at creation with stale cross-route state, and again on the restore path — which then made session restore self-disabling. Intent, not state, is the correct trigger, and it is what R-RCU-003's "through the UI" wording always meant |
| **D-URL-16** | 2026-08-12 | **The serializer emits explicit `null` for every inactive canonical parameter** | *(R2-1)* `merge` preserves omitted keys and strips only nulls. Omitting made filters addable but never removable, and let a reload resurrect a filter the user had cleared |

### Reversion challenge — D-URL-8 *(Step 2.3)*

**What does removing the wipes break?** Without a wipe *and* without a write path, a user who arrives via `?contract=A100`, refines in the UI, then reloads gets `A100` back and loses the refinement, with nothing explaining why; and session restore is permanently suppressed for that tab (R-RCU-004).

**Resolution:** the write path is not an independent feature — **it is the precondition that makes removing the wipes safe**, because it keeps the address bar equal to live state.

> **Ordering constraint:** the wipe removal MUST NOT land before the write path, and MUST NOT be split into an earlier standalone task. Both wipes are removed together.

---

## 13. Budget *(Step 2.4 — revised after Judgment Day)*

| Metric | Draft 1 | Round 1 | Round 2 | **Re-baselined (execution)** | Why it moved |
| --- | --- | --- | --- | --- | --- |
| Tasks | 8 | 11 | 12 | **12** | Unchanged — the decomposition was right; only the LOC estimate was wrong |
| LOC | ~630 | ~950 | ~1000 | **~3200** | See the arithmetic error below. The pre-execution figures never carried §10.2's own ~1,000-line spec rewrite, and undercounted the falsifiable-assertion cost this spec's Disqualifies clauses mandate |
| Review rounds | 2 | 3 | 3 | **3** | Unchanged — and holding: T-01, T-02 and T-10 each passed on the first attempt with zero rework |

Depth re-checked: **Standard still holds.** Not `Full` — no migration, no auth surface, no data model change, no rollback beyond a code revert. The LOC volume is test mass, not architectural surface. If execution exceeds these numbers, `/akili-execute` stops and escalates rather than continuing.

### Re-baseline record — 2026-08-12, during `/akili-execute` after T-02

**The pre-execution budget was arithmetically impossible, and the review lineage recorded the defect as fixed without fixing it.** `judgment.md:104` (JD-14, confirmed by both judges) states plainly: *"Meeting §10 is a rewrite of a ~1,000-line spec that §13's budget does not carry."* Its disposition at `judgment.md:161` records **"Fixed — budget raised to 11 tasks / ~950 LOC / 3 rounds."** But ~950 **total** cannot contain a ~1,000-line rewrite plus ten other tasks — the raise was smaller than the single item it was raised to accommodate. Round 2 then moved the total to ~1000 for unrelated reasons (counter plumbing), leaving the contradiction intact through three review rounds and into execution.

Measured after 3 of 12 tasks (T-01 441 · T-02 747 · T-10 ~80 = **~1268 LOC**, already +27% over the whole-spec figure), with the three heaviest tasks (T-06, T-08, T-11) still ahead.

Basis for ~3200: ~1268 actual for 3 tasks · T-11 ~1000 by its own §10.2 estimate · the remaining eight tasks at roughly the observed per-task average, weighted for T-06/T-08 being the largest wiring tasks.

**Why this is a re-baseline and not a scope change:** zero rework has been consumed, no task grew beyond its stated scope, and the Reviewer judged the test volume *necessary* rather than gold-plated — this spec's Disqualifies clauses require assertions that can actually fail, which costs lines that a presence assertion would not. The LOC figure was wrong; the work is not. Decision recorded by the user at the tripwire escalation; full detail in `execution.md` §3.

---

## 14. Open questions

None. Q1/Q2/Q3 closed as D-URL-3 / D-URL-2 / D-URL-4.

---

## 15. References

- `requirements.md` — R-RCU-001…007, NFR-RCU-001…005, §8 defect classes, §9 R5
- `judgment.md` — Judgment Day round 1 ledger and the disposition of every finding
- `proposal.md` — Option A rationale and rejected alternatives
- `docs/trd/trd.md:370` — URL state owned by the Angular Router
- `docs/specs/kaizen-log.md` — KZ-001, KZ-002, KZ-003
