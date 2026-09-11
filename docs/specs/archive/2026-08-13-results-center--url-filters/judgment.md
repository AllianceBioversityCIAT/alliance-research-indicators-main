# Judgment Day — results-center / url-filters

- **Target:** `design.md` (draft, 2026-08-12), judged against `requirements.md`, `proposal.md`, and the working tree
- **Mode:** `judgment_day` — blind dual review
- **Round:** 1
- **Judges:** two independent read-only agents, fresh context, identical scope, blind to each other
- **Author ≠ auditor:** the judges did not see the authoring conversation. **Caveat recorded honestly:** both judges ran on the same model tier as the design author; blindness here is contextual, not model-diverse
- **Date:** 2026-08-12

## Totals

| Judge | Severe | Warning | Suggestion |
| --- | --- | --- | --- |
| A | 5 | 7 | 3 |
| B | 5 | 7 | 4 |

**Merged:** 4 confirmed severe · 4 suspects promoted by parent verification · 6 confirmed non-severe · 7 unverified suspects · 1 evidence contradiction (resolved)

---

## Confirmed severe — both judges, independently

### JD-1 — Case policy contradicts itself in three places
*A-S5 + B-S2*

`design.md` §5.3 says `contract` is the `agreement_id` **verbatim**; §8's cross-package literal spells `contract=A100` (upper-case) on both sides; `requirements.md` R-RCU-001 mandates "case-insensitive on read and **lower-case on write**". If `serialize` lower-cases, the §10 round-trip property and R-RCU-003 AC.2 fail and the chip renders `PROJECT: a100` (`results-center.service.ts:309`). If it does not, R-RCU-001 AC.3 is violated. D-URL-7 (no control-list validation) removes the only authority that could canonicalize the case. Same conflict recurs for `source` (`STAR` vs `star`).

**Whichever branch the implementer picks, a named acceptance criterion is designed to fail.**

### JD-2 — The prescribed status seed makes R-RCU-006 AC.3 unsatisfiable
*A-S4 + B-S3 — **parent-verified***

`MultiselectComponent.onChange` backfills labels **only for items missing the label key**: `hasNoLabelList = …filter(item => !Object.hasOwn(item, this.optionLabel))`, and the enrichment is gated on `hasNoLabelList?.length` (`multiselect.component.ts:187-192`). The status control declares `optionLabel="name"`. §7.2 prescribes seeding `{ result_status_id, name }` — which **has** the label key — so the backfill never runs and the seeded string is the chip forever. This is why `applyStatusFilterFromHomeLink` renders the literal `'Status'` (`results-center.service.ts:735`).

R-RCU-006 AC.3 ("the label comes from the control list") cannot hold, and D-URL-2's rename-rot rationale is reintroduced at the chip.

> **Resolution available:** seed **without** the label key (`{ result_status_id }`). The existing backfill then supplies the real label from the control list — which is exactly what AC.3 asks for. §5.2's `name` column becomes provenance documentation, not a runtime value.

### JD-3 — The write path has no attachment point; every trigger it names lives on a root singleton
*A-S2 + B-S4 — **parent-verified***

`ResultsCenterService` is `providedIn: 'root'` (`results-center.service.ts:33-35`) — one instance for the whole app. All five write-path triggers named in §6.2 are its methods, and they are called from outside Results Center:

| Consumer | Call |
| --- | --- |
| `project-detail.component.ts:156` + `.html:161` | `applyFilters()` |
| `project-dashboard.component.ts:215` | `initializeProjectDashboardResultsTable` → `main()` |
| `select-linked-results-modal.component.ts:137,156,262` | `clearAllFilters()` / `clearAllFiltersWithPreserve()` |
| `links-to-result.component.ts:169` | `clearAllFiltersWithPreserve()` |
| `results-center-table.component.ts:249` | `removeFilter` → `applyFilters` |

The design gives no mechanism by which `ResultsCenterComponent` observes a service-level mutation, so the natural implementation puts the `navigate` in the service — which rewrites the address bar of `/project-detail/:id` and `/result/:code/…`. **NFR-RCU-005 is defeated by the design itself**, and §10 answers it with a test rather than a structural guard.

### JD-4 — `source` is undecodable as designed
*A-S1 + B-S1 — **parent-verified; judges' evidence contradicted, resolved in A's favor***

§5.3 claims `source` is "resolved against the **loaded control list**, not against a frozen list — platform codes are data, not vocabulary", and §7.2 claims control lists load asynchronously.

Ground truth: `SourceFilterOptionsService` is `list = signal([...SOURCE_FILTER_OPTIONS])` — a **static, synchronous, four-entry client constant** (`AICCRA`, `STAR`, `PRMS`, `TIP`), upper-case. It is exactly the frozen list the design says it is not, and there is no async load.

Judge B asserted the list loads async via `MultiselectComponent.loadData`; that is wrong for this service. **The conclusion is corroborated by both; only A's mechanism is correct.** The finding is easier to fix than either judge assumed: `source` can be a frozen, synchronously-resolved vocabulary like `indicator`.

---

## Suspects promoted by parent verification

Reported by one judge, but confirmed by direct inspection of the working tree. Evidence outranks vote count.

### JD-5 — Home cards silently lose their My-Results scope
*B-S5 — verified at `results-center.component.ts:102`*

The current legacy branch calls `this.loadMyResults(true)` **unconditionally** before applying `indicatorTab`/`statusTab`. That is why cards headed "My results by indicator/status" land on a My-Results view. The new read path (§6.1) never mentions `myResultsFilterItem`, `create-user-codes`, or the my/all scope. After the change, `?indicator=knowledge-product` from a "My results" card shows **every user's** results. No acceptance criterion covers it. The design also never states the default scope for a URL-seeded load with no `tab`.

### JD-6 — §5.2's status table diverges from the codebase's own status source
*A-W — verified at `result-status.enum.ts:6-54`*

`ResultStatusEnum` / `ResultStatusNameEnum` carry **22** ids — 15, 21 and 22 do not exist — against the 25 rows §5.2 lists from the dev database. Eight names differ: id 5 `Revised` (design: "Pending Revision"), 7 `Rejected` ("Not approved"), 9 `Requested` ("OICR Requested"), 10 `OICR Approved` ("OICR Accepted"), 11 `OICR Postpone` ("OICR Postponed"), 12 `Science Edition` ("OICR in Science edition"), 13 `KM Curation` ("OICR in KM Curation"), 14 `Published` ("OICR Published").

Three slugs (`oicr-not-accepted`, `editing-in-aiccra`, `submitted-in-aiccra`) exist in the DB but not in the enum. The design's "verified against the dev database" provenance is not re-checkable from the repo, and NFR-RCU-002's parity test is specified over the *indicator* list only, so **nothing gates this table**.

### JD-7 — The indicator tab strip cannot be seeded synchronously, and its existing self-heal is single-shot on a singleton
*A-W — verified at `results-center.service.ts:405-430`*

`syncIndicatorTabSelection` maps over `api.indicatorTabs.lazy().list()`, normally empty at `ngOnInit`. The existing self-heal is the `onChangeList` effect — which calls **`this.onChangeList.destroy()` on its first successful run**, on a root-provided singleton. Once any earlier route has triggered it, it is gone for the session. On a second visit to Results Center in one session, a deep link's tab seeding writes `active` into an empty list and is never re-synced. §7.2's contingency is written for `MultiselectComponent` and does not reach this path.

**Fails intermittently, in exactly the ordering a manual HITL check is least likely to reproduce.**

### JD-8 — The one isolation test names the wrong component
*B-W — verified*

`initializeProjectDashboardResultsTable` is called only from `project-dashboard.component.ts:215`. `project-detail.component.ts` never references it. §10 assigns the NFR-RCU-005 test to `project-detail.component.spec.ts`; `requirements.md` §1 makes the same mis-attribution. `project-dashboard.component.spec.ts:108` mocks the service wholesale, so nothing today would notice URL leakage into that table.

---

## Confirmed non-severe — both judges

| ID | Finding |
| --- | --- |
| JD-9 | **A second wipe exists.** `results-center.component.ts:133-138` wipes `tab: null` on the `openMyFromQuery` branch. D-URL-8, the reversion challenge and the ordering constraint all name only `112-121`. `requirements.md` §1 repeats the single-wipe claim, so the two documents corroborate the same omission |
| JD-10 | §7.1's "six-key object" is a **seven**-key object (`lever-codes`, `status-codes`, `platform-code`, `years`, `contract-codes`, `indicator-codes-filter`, `create-user-codes`). Line citation correct; the count is the evidence offered for the D3 rationale |
| JD-11 | §6.2 step 3 omits `queryParamsHandling: 'merge'`; Angular replaces the whole query string, silently dropping `?utm_source=…` that R-RCU-004 AC.3 explicitly contemplates. Both existing wipes use `'merge'` |
| JD-12 | R-RCU-002's "**AND IT MUST preserve the order**" clause has no design element. A round-trip property over a set would pass a sorting serializer |
| JD-13 | R-RCU-005 AC.4 (excessively long **or repeated** parameter) is only partly designed: no bound on list length or on `status`/`source`/`indicator` token length, and repeated keys (`get()` vs `getAll()`) are undefined |
| JD-14 | §10's disqualifying conditions invalidate the **existing** `results-center.component.spec.ts`, which does both banned things at once — a canned-snapshot `ActivatedRoute` (lines 101-108) **and** `template: '<div></div>'` override (112-117), over a fabricated service mock. Meeting §10 is a rewrite of a ~1,000-line spec that §13's budget does not carry |

---

## Unverified suspects — one judge, not independently confirmed

| ID | Finding | Judge |
| --- | --- | --- |
| JD-15 | `indicator` has two possible target keys (`indicator-codes-tabs` vs `indicator-codes-filter`) and the design picks neither; the tab strip holds exactly one id, so multi-value `?indicator=a,b` is unrepresentable, and the tab key renders the chip as the literal `Selected` | A (severe) / B (warning) |
| JD-16 | NFR-RCU-002's parity test is inert: `requirements.md` says "over the indicator control-list **fixture**", `proposal.md` says "every id returned by **`GET /indicators`**". A fixture nobody updates stays green forever — the KZ-001/KZ-004 family | B |
| JD-17 | KZ-002 enumeration misses `select-linked-results-modal` and `links-to-result`, the two consumers most likely damaged by JD-3 | B |
| JD-18 | `tab` is canonical in §5.3 but listed among the legacy parameters "never emitted by any producer" in R-RCU-006; the two documents disagree and R-RCU-006 AC.4 is self-defeating | A |
| JD-19 | `data-overview.component.spec.ts:153-163` asserts `{ statusTab: 7, statusLabel: 'Submitted' }`; not listed in §2.1 or §10 | A |
| JD-20 | §6.3 threads `agreement_id` from `dispatch()`; `buildStarLink` is called from `buildTemplateData(input)` where `input.agreementId` already exists — a one-line change, not new plumbing | B |
| JD-21 | Every existing state mutator calls `invalidateResultsFetchDedupe()` first; the new seeding method is specified without it, and `lastSuccessfulResultsFetchKey` survives across component instances on the singleton — an early return in `main()` is a silent "filter applied, table unchanged" | B |

---

## Evidence contradiction — resolved

| Topic | Judge A | Judge B | Parent resolution |
| --- | --- | --- | --- |
| How `sourceFilterOptions` loads | Static synchronous client constant | Async via `MultiselectComponent.loadData` | **A correct** — `source-filter-options.service.ts:8`. Verified by inspection; no human escalation needed |

Both judges reached the same conclusion (JD-4) from different premises. Recorded because a shared conclusion resting on one wrong premise is exactly what the contract warns about.

---

## Parent assessment

The confirmed severe findings are **not typographic**. JD-1, JD-3 and JD-5 are design-level: they change §6.2, §7.1, §7.2, §10 and the shape of the task graph. JD-2 and JD-4 have clean resolutions that make the design *simpler*, not more complex. JD-6 undermines the provenance of an entire vocabulary table.

A spot-fix round would leave the interactions between them unresolved.

---

## Disposition — round 1 corrections applied

User decision at the correction gate: **Fix only** (no scoped re-judgment). Corrections were applied to `requirements.md`, `design.md` and `proposal.md` on 2026-08-12.

The skill's default is to fix only severe findings confirmed by both judges. That was widened deliberately: findings I verified myself against the working tree are backed by **evidence, not vote count**, and leaving a known-false statement in a document an Implementer will execute from is worse than the contract's conservatism. Every widening is listed below.

| ID | Verdict | Disposition |
| --- | --- | --- |
| JD-1 | Confirmed severe | **Fixed** — case policy split by token class; `contract` upper-cased both ways (`requirements.md` R-RCU-001, `design.md` §5.4, D-URL-11) |
| JD-2 | Confirmed severe | **Fixed** — seed the option-value key only, never the label key; backfill supplies the label (`design.md` §7.2, D-URL-10). Transient blank chip documented; sidebar verified CSS-toggled, not `@if`, so the backfill does run |
| JD-3 | Confirmed severe | **Fixed structurally** — the write path is a component-scoped `effect()`, never a service method (`design.md` §6.2, D-URL-9). NFR-RCU-005 becomes a lifecycle guarantee; the tests verify it instead of being it |
| JD-4 | Confirmed severe | **Fixed** — `source` is a frozen synchronous vocabulary from `SOURCE_FILTER_OPTIONS` (`design.md` §5.3, D-URL-13) |
| JD-5 | Parent-verified | **Fixed** — read path resolves the my/all scope explicitly; no `tab` falls back to the pinned preference (`design.md` §6.1 step 3; new R-RCU-002 AC.6/AC.7) |
| JD-6 | Parent-verified | **Fixed** — slugs are frozen strings, not derivations of either source; the 22-vs-25 divergence and eight name mismatches recorded as `requirements.md` §9 R5, explicitly out of scope |
| JD-7 | Parent-verified | **Fixed** — tab-strip sync moved to a component-scoped effect; the design no longer depends on the singleton's self-destructing `onChangeList` (`design.md` §7.3, D-URL-14) |
| JD-8 | Parent-verified | **Fixed** — isolation test retargeted to `project-dashboard.component.spec.ts`; `requirements.md` §1 mis-attribution corrected |
| JD-9 | Confirmed (both) | **Fixed** — D-URL-8 now removes both wipes; `requirements.md` §1 names both |
| JD-10 | Confirmed (both) | **Fixed** — seven-key |
| JD-11 | Confirmed (both) | **Fixed** — `queryParamsHandling: 'merge'` specified |
| JD-12 | Confirmed (both) | **Fixed** — order preservation named in the codec test list |
| JD-13 | Confirmed (both) | **Fixed** — bounds table (50 values / 64 chars / `getAll()` flattening) in `design.md` §5.5 and R-RCU-005 AC.4 |
| JD-14 | Confirmed (both) | **Fixed** — §10.2 states the spec rewrite; budget raised to 11 tasks / ~950 LOC / 3 rounds |
| JD-15 | Suspect (A severe / B warning) | **Fixed** — `indicator` is single-value; a comma is an invalid token, not a truncation (D-URL-12) |
| JD-16 | Suspect | **Fixed** — NFR-RCU-002 rewritten as two layers with the fixture layer's blind spot stated and the residual risk accepted; `proposal.md`'s `GET /indicators` claim corrected |
| JD-17 | Suspect | **Fixed** — all five shared-singleton consumers enumerated in `requirements.md` §1, `design.md` §6.2 and `proposal.md` |
| JD-18 | Suspect | **Fixed** — `tab` is canonical, not legacy; R-RCU-006 reduced to three legacy parameters |
| JD-19 | Suspect | **Fixed** — `data-overview.component.spec.ts` listed in §2.1 and §10.1 |
| JD-20 | Suspect | **Fixed** — `buildStarLink(input.agreementId)` from `buildTemplateData`; no `dispatch` plumbing |
| JD-21 | Suspect | **Fixed** — `seedFromUrl()` calls `invalidateResultsFetchDedupe()` first (`design.md` §7.1 step 1) |

**All 21 findings dispositioned; none deferred.**

---

# Round 2 — scoped re-judgment of the fix delta

Two blind judges, frozen round-1 ledger + fix delta only, mandate to verify each disposition **and** hunt fix-caused defects.

| Judge | Unresolved | Regression | Verified |
| --- | --- | --- | --- |
| A | 1 | 4 | 2 |
| B | 2 | 4 | 3 |

## Confirmed by both — regressions introduced by the round-1 fixes

### R2-1 — `merge` + omitted keys makes filters addable but never removable
*Both judges. The JD-11 fix caused this.*

Angular's `queryParamsHandling: 'merge'` is `{...current, ...new}` with only **null-valued** keys stripped. A key merely *omitted* is preserved verbatim. §6.2 step 2 says "empty filters omitted (never `?contract=`)" — so clearing `contract` serializes to `{}`, merge keeps `?contract=A100`, and the address bar retains a filter the table no longer applies. Both existing wipes get this right today by passing explicit `null`s.

Compounding: a **rejected** token (`?indicator=not-a-real-indicator`) and a legacy `?indicatorTab=1` now also persist forever, because D-URL-8 removed the wipes. And since the read path is init-only, a reload re-applies a filter the user explicitly cleared — a self-resurrecting filter.

Judge B adds: the step-3 loop guard is ill-defined under merge — it must compare the **merged result**, not the serialization, or it navigates on every run whenever an unrecognized parameter such as `?utm_source` is present.

R-RCU-003's clear scenario, AC.1 and AC.2 all fail. **The codec round-trip test still passes**, because the defect lives in the navigate call, not the codec.

### R2-2 — The write effect's first run serializes stale cross-route singleton state, before the seed
*Both judges.*

An Angular `effect()` runs once on creation, during the first change-detection pass. At that moment `appliedFilters` still holds whatever the **root singleton** was left with by the previous route — e.g. `{'status-codes': [5]}` from `initializeProjectDashboardResultsTable` (`results-center.service.ts:783-784`), which nothing resets on navigation away. `initializeState()` reaches its first `await` (`loadPinnedTabPreference()`, an HTTP GET) **before** any seeding, so the effect flush lands inside that window.

Arriving from `/project-detail/:id` at `?indicator=…&contract=A100` therefore rewrites the URL to include `status=pending-revision` — and with R2-1, that injected key is never removed. The deep link loads with a filter the sender never sent. It also adds an unaccounted `router.navigate` that NFR-RCU-001's count-based test will trip over.

### R2-3 — §7.2's `indicator` row is unreachable and contradicts D-URL-12
*Both judges.*

The indicator multiselect is individually `@if`-gated: `@if (forceIndicatorFilter || !resultsFilter()['indicator-codes-tabs']?.length)` (`table-filters-sidebar.component.html:2`). D-URL-12 routes `indicator` to `indicator-codes-tabs` — so seeding `indicator` is **precisely the condition that destroys the component whose backfill the §7.2 row depends on**. `onSelectFilterTab` also clears `tableFilters.indicators` (`:724-727`), and `getActiveFilters` gates the `INDICATOR` chip on `indicator-codes-filter`, so a seeded entry renders no chip while still inflating `countTableFiltersSelected`.

The row's "✅" is evidence for a claim the code contradicts — **the same error class JD-2 was raised for**. The row must be deleted; `indicator` is seeded only through §7.3.

## Confirmed by both — a round-1 disposition that did not close its finding

### R2-4 — JD-5 is relocated, not fixed
*Both judges.*

The round-1 fix closed only the singleton-leak half. The two Home producers are headed "My results by status" / "My results by indicator" (`data-overview.component.html:4,12,37`, `aria-label="View My Results filtered by …"`) and emit **no `tab`**. Today the My scope comes from the unconditional `loadMyResults(true)` at `results-center.component.ts:102`, which §6.1 removes. New AC.6 then resolves the scope from the pinned preference — which defaults to **`all`** (`allPinned || !selfPinned ? 'all' : 'my'`, `:175`).

So AC.6 makes the loss **deterministic** rather than fixing it. Nothing requires those two producers to emit `tab=my`. Closing it needs `tab=my` on both `data-overview` links plus the assertion in `data-overview.component.spec.ts`.

## Single-judge findings

### R2-5 — The write effect fires on the *parameter-less* path too, making session restore self-disabling
*Judge B only. Not independently verified by the parent.*

`restorePersistedState` writes `appliedFilters` (`:978`) and `myResultsFilterItem` (`:975`); `loadMyResults` writes both; `main()` rewrites `appliedFilters['create-user-codes']` (`:481-495`). All are tracked dependencies of the new effect. So a parameter-less visit that restores `contract=A100`, or a user whose pinned tab is `my`, ends up with `?contract=A100` / `?tab=my` in the address bar. On the **next** reload that URL carries a recognized parameter, so §6.1 step 5 skips `restorePersistedState` entirely — discarding `searchInput`, sort field/order, paginator position and `primaryContractId`, none of which the URL carries.

R-RCU-004 AC.2 ("restore behaves exactly as today") is violated by design. Draft 1 did not have this behavior; the correction introduced it.

### R2-6 — JD-1 is only half fixed: AC.3 varies the parameter *name*, and key lookup is case-sensitive
*Judge B only. Parent-verified as correct by inspection of the AC's own text.*

R-RCU-001 AC.3 is `?CONTRACT=a100` ≡ `?contract=A100` — it varies the **key**. `queryParamMap.get('contract')` / `getAll('contract')`, which §6.1 step 1 prescribes, is case-sensitive: `?CONTRACT=a100` yields no `contract` value at all and the upper-casing rule never executes. §5.4 states only a *write* rule for names. Either the codec lower-cases every incoming key before lookup (and §6.1/§5.4 must say so), or AC.3's example must be restated over the value only.

### R2-7 — D-URL-14: judges contradict
**Judge A:** `loading` is created once per endpoint and `lazy()` is guarded by `isInitialized`, so after the first fetch anywhere in the session `isLoading()` is `false` forever. A component effect keyed on it runs exactly once — at creation, i.e. **before** the seed — writes `active: false` everywhere and never re-runs. JD-7's failure reproduced through a different door.

**Judge B:** the effect always runs at least once after creation, and on a repeat visit `isLoading` is already `false` over a cached, populated list, so the sync happens there too. Verified.

**Parent resolution — partial, recorded as unresolved.** Both analyses agree on the two mechanics that matter: the effect runs at creation, and the seed happens after an awaited HTTP call. **A's ordering objection therefore stands independently of B's signal analysis** — B verified that the list is populated but did not address that the effect runs before `seedFromUrl()`. The signal-semantics dispute is moot; the ordering defect is real. A trigger that reads only `isLoading()` is insufficient; it must also read `resultsFilter()['indicator-codes-tabs']`.

Judge B's implementer note, independent of the dispute: the effect writes signals transitively via `lazy()` and needs `allowSignalWrites: true`.

## Verified by both

| Item | Finding |
| --- | --- |
| **D-URL-9's isolation claim** | **Holds.** No shared consumer mutates the service while `ResultsCenterComponent` is alive: `initializeProjectDashboardResultsTable` has exactly one caller on another route; `clearAllFiltersWithPreserve` is reachable only from `links-to-result` and the modal it opens. The lifecycle guarantee is real — its failure mode is the *reverse* direction (R2-2, R2-5) |
| **D-URL-10 for status / source / project / year** | **Holds.** The backfill gate matches the §7.2 table; `firstLoad` is per-instance and re-arms each visit; an early run against an empty selection does not consume it. JD-2's root cause is genuinely closed for these four — the `indicator` row (R2-3) is the exception |
| **D-URL-13** | **Holds.** `SourceFilterOptionsService` has no `main()`, so `loadData()` returns early and `optionsSig` populates synchronously |

## Parent assessment — round 2

**Three of the four confirmed regressions trace to one decision.** D-URL-9 correctly fixed *where* the write lives (component, not service) but introduced *reactivity* that was never required. An unconditional `effect()` fires on creation with stale state (R2-2), on the restore path (R2-5), and cannot express "not yet, the read path has not settled".

The architectural correction is to keep component ownership and **drop the effect**: an explicit `syncUrlFromState()` invoked at defined points *after* the init path settles. That preserves the lifecycle guarantee both judges verified while removing the three defects reactivity caused.

R2-1 and R2-6 are narrow and mechanical. R2-3 deletes a table row. R2-4 adds `tab=my` to two links.

---

# Round 3 — final scoped re-judgment

**Corroboration gap opened, then closed.** Judge A stalled once and judge B stalled twice (600s watchdog, no progress) — an infrastructure failure, not a judgment. This round was initially recorded as resting on **one judge**, with its findings corroborated only by direct parent verification. Once network connectivity was restored, judge B was re-run to **complete round 3 rather than open a fourth**, and returned independently.

**Both judges reached identical conclusions on all eight items** — the same one regression, the same three unresolved findings, and the same four closures. The two-judge agreement mechanism did operate after all, and this round's findings carry full corroboration.

| Judge | Unresolved | Regression | Verified |
| --- | --- | --- | --- |
| A (retry) | 3 | 1 | 4 |
| B (retry) | 3 | 1 | 4 |
| **Agreement** | **identical items** | **identical item** | **identical items** |

## R3-1 — REGRESSION: the my/all tab and the pin toggle bypass the counter entirely
*Parent-verified against the template.*

§6.2's mutator table names `onActiveItemChange` as a `ResultsCenterService` method. **The production path does not go through it.** `results-center.component.html:14` binds `(click)="onActiveItemChange(item)"` to the **component's** method (`results-center.component.ts:190`), which calls `cleanFilters()` and then the component-local `loadMyResults()` / `loadAllResults()` — both of which `.set()` `resultsFilter`, `appliedFilters` and `myResultsFilterItem` directly. Line 17 adds a second bypass: `onPinIconClick` → `togglePin` → the same two methods. The service's own `onActiveItemChange` (`results-center.service.ts:626`) appears to have no production caller at all.

So a user on `?contract=A100&status=submitted` who clicks "My Results" gets a table wiped of both filters and scoped to `my`, while the address bar still reads `?contract=A100&status=submitted`. The counter never moves, so the effect never fires. R-RCU-003 AC.1 and AC.2 fail, and a reload resurrects the cleared filters — R2-1's failure mode through a different door.

**Round 1's unconditional `appliedFilters` effect covered this path; D-URL-15 lost it.** The §10.1 service-unit test would pass on dead code. Remediation: increment in the **component's event handlers**, not inside `loadMyResults` — the latter re-opens R2-5.

Judge B added one detail A did not: the component's handler also calls `cleanFilters()`, a service method on **neither** side of the §6.2 table, which wipes six `tableFilters` collections (`results-center.service.ts:799-807`). It is correctly left out of both columns — it is only ever reached from an incrementing handler, so giving it its own increment would double-count one user action.

## R3-2 — UNRESOLVED (R2-1): legacy keys still self-resurrect
*Parent-verified by reading the design's own rule.*

D-URL-16 says "Nulls are scoped to the canonical parameter list — the codec never nulls a key it does not own." `indicatorTab` / `statusTab` / `statusLabel` are **read** by the codec but are not canonical, so they are never nulled, and `merge` preserves any key it is not handed a `null` for. Both wipes are gone (D-URL-8).

Concretely: arrive from a delivered CapDev email at `?indicatorTab=1`, click "All Indicators" → `indicator: null` is emitted, the URL still reads `?indicatorTab=1`, and a reload re-applies Capacity Sharing. Round 2 named this half explicitly; D-URL-16 fixed only the canonical half. The `?utm_source` preservation goal does not require sparing keys the codec parses.

## R3-3 — UNRESOLVED (new, created by the R2-6 fix): key folding breaks the camelCase legacy names
*Parent-verified by reading the design's own rule.*

§6.1 step 1 folds every incoming key to lower case before lookup. The three legacy parameters are spelled `indicatorTab`, `statusTab`, `statusLabel` in both spec documents and in the live producer. Folded, they are `indicatortab` / `statustab` / `statuslabel`. **Neither document says the recognized-parameter list must itself be stored folded**, and §10.1's case-folding test is specified only over `?CONTRACT=a100` — an already-lower-case canonical key, which cannot catch this.

An implementer who folds incoming keys and compares them against the camelCase names gets zero matches, and **every already-delivered CapDev email silently stops working** — R-RCU-006 AC.1 and its scenario fail. This defect did not exist while lookups were literal; the R2-6 correction created it.

## R3-4 — UNRESOLVED (new): "inactive" is undefined for `tab`
*Parent-verified by reading the design's own rule.*

`tab` is canonical (§5.4, R-RCU-006) and always resolves to a value — `my` or `all` — so under the literal rule "null every canonical parameter that is not currently active" it is **never inactive** and is always emitted. Nothing says `all` is a default that serializes to `null`. Both readings survive the §10.1 round-trip property:

- Emit `all` → clearing all filters yields `/results-center?tab=all`, contradicting R-RCU-003's "the address bar becomes `/results-center` with no query string".
- Never emit `tab` → a user in `my` scope who clears filters loses it, the reload resolves scope from the pinned preference, and R2-4's loss repeats.

One sentence closes it: *`tab` is emitted only when the scope is `my`; `all` serializes to `null`.*

## Verified this round

| Item | Finding |
| --- | --- |
| **R2-2 / R2-5** | **Closed.** None of `seedFromUrl`, `restorePersistedState`, `main()`, `initializeProjectDashboardResultsTable` or `clearAllFiltersWithPreserve` is on the increment side, so neither the first-run flush against stale cross-route state nor the restore path can navigate. The first-run guard is monotone-safe and the untracked read is directly expressible via Angular's `untracked()` |
| **R2-3** | **Closed.** The `indicator` row is gone from §7.2 and the exclusion is justified against a template gate that reads exactly as quoted |
| **R2-4** | **Closed.** R-RCU-007 AC.1b now requires `tab=my` on both cards, and the spec file is listed |
| **R2-7** | **Closed.** §7.3 tracks both signals and requires `allowSignalWrites: true`; the self-destructing `onChangeList` is correctly out of the dependency chain |

## Parent assessment — round 3

The trajectory changed. Round 2 found four regressions concentrated in one architectural mistake; round 3 confirms **four of the six round-2 items are genuinely closed** and the survivors are narrow: one missed binding (R3-1), one scoping rule that is one clause too narrow (R3-2), one folding rule missing its symmetric half (R3-3), and one undefined term (R3-4). Each has a one- or two-sentence remedy already named.

That said, this design has produced defects in the URL-write path in **three consecutive rounds**, and this round had no second judge. Neither fact supports declaring it settled.

## Disposition — round 3 corrections applied

All four findings were **confirmed by both judges independently** and each carried a one- or two-sentence remedy named in the finding itself. They were applied on 2026-08-12 as ordinary edits, **outside the lineage** — the round budget is exhausted, so these corrections carry no automated re-review.

| ID | Disposition |
| --- | --- |
| R3-1 | **Fixed** — the §6.2 mutator table now names the **component's** `onActiveItemChange` and `togglePin` handlers, records that the service's `onActiveItemChange` has no production caller, states that `loadMyResults`/`loadAllResults` must not increment, and explains why `cleanFilters()` sits in neither column |
| R3-2 | **Fixed** — the null set is now "every key the codec parses", explicitly including the three legacy keys; keys the codec does not parse are still never nulled, preserving `?utm_source` |
| R3-3 | **Fixed** — the recognized-key list must itself be stored folded; `requirements.md` R-RCU-001 states folding must be symmetric |
| R3-4 | **Fixed** — `tab` is emitted only when the scope is `my`; `all` serializes to `null`, with both failing readings recorded |

Each also survives as a **regression guard with an explicit disqualifying condition** in its owning task (`tasks.md` §0 and T-01/T-03/T-05/T-08), so execution re-tests them rather than trusting this edit.

## Terminal state

**JUDGMENT: ESCALATED ⚠️**

The lineage is **exhausted**: two fix rounds and two scoped re-judgments consumed, the ceiling the contract permits.

`ESCALATED`, not `APPROVED` — and the distinction is real rather than bureaucratic. Every finding raised across three rounds is now dispositioned and every round-3 finding was dual-confirmed before being fixed. But **the round-3 corrections themselves were never reviewed**, and this design produced defects in the URL-write path in three consecutive rounds. A lineage that ends by editing without review has not earned `APPROVED`.

The next independent reading is the `/akili-execute` Reviewer, which is why every round-3 finding was also written into `tasks.md` as a regression guard rather than being considered closed by this edit.
