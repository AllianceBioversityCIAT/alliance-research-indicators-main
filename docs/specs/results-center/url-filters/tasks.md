# Tasks — results-center / url-filters

- **Module:** results-center (client) + results (server, link producer only)
- **Spec id:** 2026-08-url-filters
- **Status:** not-started
- **Owner:** d.casanas@cgiar.org
- **Linked requirements:** ./requirements.md
- **Linked design:** ./design.md
- **Linked judgment:** ./judgment.md — **read §Round 3 before starting.** Four findings (R3-1 … R3-4) are open and are folded into T-01, T-03, T-05 and T-08 below
- **Budget (design §13):** 12 tasks · ~1000 LOC · 3 review rounds
- **Last updated:** 2026-08-12

---

## 0. Carried findings — read first

Judgment Day round 3 raised four findings, **each confirmed by both judges independently**. All four have been corrected in `design.md` — but the correction itself was never reviewed (the lineage is exhausted), so **each survives here as a regression guard with its own disqualifying condition.** Treat them as live hazards, not as history: an Implementer who skims past them will re-introduce a defect two rounds of review already found.

| Finding | What is wrong | Owning task |
| --- | --- | --- |
| **R3-1** | The my/all tab and the pin toggle bypass the mutation counter — they bind to the **component's** `onActiveItemChange` (`results-center.component.html:14`), not the service's | **T-05** |
| **R3-2** | Nulls are scoped to canonical keys, so `indicatorTab`/`statusTab`/`statusLabel` persist in the URL forever and resurrect on reload | **T-03** |
| **R3-3** | Lower-case key folding does not match the camelCase legacy parameter names unless the recognized list is stored folded too | **T-01** |
| **R3-4** | "Inactive" is undefined for `tab`, which always resolves to `my` or `all` | **T-03** |

---

## 1. Dependency graph

```mermaid
graph TD
  T01[T-01 Vocabulary + bounds] --> T02[T-02 Codec: parse]
  T01 --> T03[T-03 Codec: serialize]
  T02 --> T06[T-06 Read path + precedence + toast]
  T04[T-04 seedFromUrl] --> T06
  T06 --> T07[T-07 Tab-strip sync effect]
  T03 --> T08[T-08 Write effect + remove BOTH wipes]
  T05[T-05 userFilterMutations counter] --> T08
  T06 --> T08
  T02 --> T09[T-09 Home producers]
  T01 --> T10[T-10 Server link builder]
  T06 --> T11[T-11 Rewrite component spec harness]
  T08 --> T11
  T05 --> T12[T-12 Shared-consumer isolation]
  T08 --> T12
```

**Hard ordering constraint (design §12, reversion challenge):** T-08 removes both query-parameter wipes. It MUST NOT land before the write path exists, and the wipe removal MUST NOT be split into an earlier standalone task. T-08 carries both halves together.

---

## 2. Task list

### T-01 [ ] — Frozen vocabulary, bounds, and the folded recognized-key list

- **Requirements covered:** R-RCU-001 (all ACs), R-RCU-005 AC.4, NFR-RCU-002 (layer 1)
- **Files touched:** `…/results-center/url/results-center-url.vocabulary.ts` (new), `…/results-center-url.vocabulary.spec.ts` (new)
- **Description:** The single source of truth for every token this feature understands: `indicator` (6 slugs, byte-identical to the server's `QueryIndicatorsEnum`), `status` (25 slugs, design §5.2), `source` (4 slugs from `SOURCE_FILTER_OPTIONS`), the bounds constants, and the recognized-parameter name list.
- **Implementation notes:**
  - **R3-3 — the recognized-key list MUST be stored lower-case-folded**, and lookups fold the incoming key before comparison. The legacy names are camelCase (`indicatorTab`, `statusTab`, `statusLabel`); stored raw, folded lookups match none of them and every already-delivered CapDev email silently stops working.
  - Slugs are **frozen strings**, never derived at runtime from a display name (D-URL-2).
  - Do **not** add a `lever` entry (D-URL-6) and do **not** introduce a fourth indicator spelling — `cap_sharing` stays a PDF-report key (R-RCU-001 AC.5).
- **Acceptance / done check:**
  - [ ] All 25 status slugs and all 6 indicator slugs are unique; bidirectional mapping holds both ways.
  - [ ] `capacity-sharing-for-development` is byte-identical to `QueryIndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT`.
  - [ ] A folded lookup of `indicatortab` / `statustab` / `statuslabel` resolves to the legacy parameters — **this is the R3-3 regression guard.**
  - [ ] Bounds exported: 50 values per list parameter, 64 chars per token.
- **Disqualifies:** a uniqueness test over a hand-typed subset of the 25 statuses proves nothing about the other rows — iterate the exported map, not a literal list. A parity test over a fixture **cannot** detect a value added server-side; that limit is accepted in NFR-RCU-002 and must not be claimed as coverage.
- **Dependencies:** none · **Effort:** M · **Skills:** `angular-developer`

---

### T-02 [ ] — Codec: `parse`

- **Requirements covered:** R-RCU-001 AC.3, R-RCU-002 (both scenarios), R-RCU-005 (both scenarios + all ACs), R-RCU-006 (both scenarios + AC.1/AC.2/AC.3)
- **Files touched:** `…/url/results-center-url.codec.ts` (new), `…/url/results-center-url.codec.spec.ts` (new)
- **Description:** Pure `parse(paramMap) → { filters, scope, dropped, hadRecognizedParam }`. No DI, no router, no signals — it *returns* what it dropped and never logs or toasts (D-URL-1).
- **Implementation notes:**
  - Fold every incoming key to lower case **before** lookup (R2-6); read values with `getAll()` and flatten, so a repeated key combines rather than silently losing all but the first (R-RCU-005 AC.4).
  - `indicator` is **single-value**: a comma is an invalid token, rejected — never truncated to the first value (D-URL-12).
  - `contract` is upper-cased; `status`/`source`/`indicator`/`tab` are lower-case-folded; `year` is numeric (design §5.4).
  - `contract` is **not** validated against the contracts control list (D-URL-7).
  - A legacy parameter is consulted **only** when its canonical counterpart is absent — resolved by key presence, never by parameter order.
  - Order of values within a list parameter is **preserved** (R-RCU-002 multi-value scenario, `AND IT MUST`).
- **Acceptance / done check:**
  - [ ] Each of the six canonical parameters, alone, produces the right filter (R-RCU-002 AC.1).
  - [ ] `?CONTRACT=a100` ≡ `?contract=A100` (R-RCU-001 AC.3) — asserted with that literal.
  - [ ] `?indicator=oicr,policy-change` is rejected, not truncated.
  - [ ] `?indicator=not-a-real-indicator&contract=A100` returns the contract filter **and** a non-empty `dropped` (R-RCU-005 AC.1).
  - [ ] A list of 51 values is dropped whole; a 65-char token is dropped; `?contract=A100&contract=S192` yields both.
  - [ ] `?indicatorTab=1&indicator=policy-change` resolves to `policy-change` deterministically (R-RCU-006 AC.2).
  - [ ] `statusLabel`'s value never appears in the returned object (R-RCU-006 AC.3).
  - [ ] Multi-value order is preserved — asserted with values whose sorted order differs from their input order.
- **Disqualifies:** an order test whose input is already sorted cannot fail. A `dropped` assertion on length alone does not prove the *right* token was dropped.
- **Dependencies:** T-01 · **Effort:** L · **Skills:** `angular-developer`, `error-handling-patterns`

---

### T-03 [ ] — Codec: `serialize` (carries R3-2 and R3-4)

- **Requirements covered:** R-RCU-003 (both scenarios + AC.1/AC.2), R-RCU-004 AC.3, NFR-RCU-003
- **Files touched:** `…/url/results-center-url.codec.ts`, `…/url/results-center-url.codec.spec.ts`
- **Description:** Pure `serialize(state) → params`. The output is consumed by a `queryParamsHandling: 'merge'` navigation, which strips only **null-valued** keys and preserves omitted ones — so what this function omits is what stays in the URL forever.
- **Implementation notes:**
  - **R3-2 — the null set MUST include the three legacy keys** (`indicatorTab`, `statusTab`, `statusLabel`), not only the canonical ones. The design's earlier wording ("never nulls a key it does not own") is superseded: the codec *parses* these keys, therefore it owns clearing them. Without this, arriving from a delivered email at `?indicatorTab=1` and switching to "All Indicators" leaves the URL unchanged and a reload resurrects Capacity Sharing.
  - Keys the codec does **not** parse (`utm_source`, anything unrecognized) are still never nulled — that is what R-RCU-004 AC.3 protects.
  - **R3-4 — `tab` is emitted only when the scope is `my`; `all` serializes to `null`.** `tab` always resolves to a value, so "inactive" is otherwise undefined for it: emitting `all` would leave `/results-center?tab=all` after clearing filters, contradicting R-RCU-003's clear scenario.
  - Never serialize a user identifier (NFR-RCU-003).
- **Acceptance / done check:**
  - [ ] Every inactive canonical key **and** every one of the three legacy keys is present as `null` in the output — **R3-2 regression guard.**
  - [ ] An unrecognized key present in the current URL is neither emitted nor nulled.
  - [ ] Scope `all` → `tab: null`; scope `my` → `tab: 'my'` — **R3-4 regression guard.**
  - [ ] Round-trip: `parse(serialize(state))` reproduces `state` for a fixture exercising all six parameters (R-RCU-003 AC.2).
  - [ ] No output value equals the cached `sec_user_id` for any scope.
- **Disqualifies:** a round-trip test over a state with a single filter cannot detect the null-emission defect at all — the fixture must include at least one filter that is **cleared** relative to a prior URL. Testing `serialize` in isolation without a merge simulation proves nothing about R3-2; assert the merged result.
- **Dependencies:** T-01 · **Effort:** M · **Skills:** `angular-developer`

---

### T-04 [ ] — `seedFromUrl()` on `ResultsCenterService`

- **Requirements covered:** R-RCU-002 AC.3/AC.5/AC.6/AC.7, R-RCU-006 AC.3
- **Files touched:** `…/results-center/results-center.service.ts`, `…/results-center.service.spec.ts`
- **Description:** One method that writes all seeded state atomically, replacing the hand-duplicated multi-signal writes that make state desync (D3) the recurring defect class here.
- **Implementation notes:**
  - **Call `invalidateResultsFetchDedupe()` first.** `lastSuccessfulResultsFetchKey` survives across component instances on the root singleton; without this, `main()` early-returns and the user sees "filter applied, table unchanged" (JD-21).
  - **Seed the option-value key only — never the label key** (D-URL-10). `{ result_status_id }`, `{ platform_code }`, `{ agreement_id }`, `{ report_year }`. Seeding `name` freezes the chip label permanently, because `MultiselectComponent` backfills only items *missing* the label key.
  - **Do not seed `tableFilters.indicators`.** `indicator` goes to `indicator-codes-tabs` only (T-07); seeding it renders no chip while inflating the filter badge (design §7.2).
  - Write the my/all scope (`myResultsFilterItem` + `create-user-codes`) from the resolved scope.
  - Fold `applyStatusFilterFromHomeLink` into this method rather than duplicating it.
  - **This method MUST NOT increment `userFilterMutations`** (T-05).
- **Acceptance / done check:**
  - [ ] `tableFilters`, `resultsFilter`, `appliedFilters` and the scope are all consistent after one call.
  - [ ] No seeded object carries its control's `optionLabel` key.
  - [ ] `invalidateResultsFetchDedupe` is called before any signal write.
  - [ ] `tableFilters.indicators` is untouched when `indicator` is seeded.
- **Disqualifies:** asserting the signals hold the right ids is a **presence assertion** — it cannot prove the chip renders. Rendered proof belongs to T-11 and must be taken **after** the control lists resolve; asserting before would pin the documented transient (design §7.2) as the expected value.
- **Dependencies:** none · **Effort:** M · **Skills:** `angular-developer`

---

### T-05 [ ] — `userFilterMutations` counter (carries R3-1)

- **Requirements covered:** R-RCU-003 (write trigger), R-RCU-004 AC.2, NFR-RCU-005
- **Files touched:** `…/results-center/results-center.service.ts`, `…/results-center/results-center.component.ts`, `…/results-center.service.spec.ts`
- **Description:** A monotonic counter expressing **user intent**, which is what R-RCU-003's "changed through the UI" always meant. It is the write effect's only tracked dependency (D-URL-15), and it is what keeps the URL from being rewritten during load, during restore, or from another route.
- **Implementation notes:**
  - **R3-1 — the increment for the my/all tab and the pin toggle MUST live in the component's event handlers**, not in the service. `results-center.component.html:14` binds to the **component's** `onActiveItemChange` (`:190`), and line 17's pin button reaches `togglePin` (`:254`); both call the component-local `loadMyResults()` / `loadAllResults()`, which never touch a service mutator. The service's own `onActiveItemChange` (`:626`) appears to have no production caller — **verify before relying on it.**
  - **Do NOT increment inside `loadMyResults` / `loadAllResults`.** They are also reached from the read path, and incrementing there re-opens R2-5 (a parameter-less visit with a pinned `my` tab would write `?tab=my`, which then suppresses session restore on the next load).

  | MUST increment | MUST NOT increment |
  | --- | --- |
  | `applyFilters` (sidebar Apply) | `seedFromUrl` |
  | `removeFilter` (chip dismissal) | `restorePersistedState` |
  | `clearAllFilters` | `main()` |
  | `onSelectFilterTab` | `initializeProjectDashboardResultsTable` |
  | component `onActiveItemChange` handler *(R3-1)* | `clearAllFiltersWithPreserve` |
  | component `togglePin` handler *(R3-1)* | `loadMyResults` / `loadAllResults` |

- **Acceptance / done check:**
  - [ ] Every row in the left column advances the counter exactly once per invocation.
  - [ ] Every row in the right column leaves it unchanged.
  - [ ] Clicking the My/All tab advances it — **R3-1 regression guard, asserted through the template binding, not by calling the service method directly.**
  - [ ] Toggling the pin advances it.
- **Disqualifies:** calling `ResultsCenterService.onActiveItemChange` directly in a test **passes on dead code** and is the exact blind spot R3-1 names. The assertion must go through the component's handler. A counter test that never exercises the "must not" column proves half the contract.
- **Dependencies:** none · **Effort:** M · **Skills:** `angular-developer`

---

### T-06 [ ] — Read path: parse, precedence, scope, toast

- **Requirements covered:** R-RCU-002 (both scenarios + AC.2/AC.4/AC.6/AC.7), R-RCU-004 (scenario + all ACs), R-RCU-005 AC.2/AC.3, R-RCU-006 (both scenarios)
- **Files touched:** `…/results-center/results-center.component.ts`
- **Description:** Wire the codec into `initializeState()` per design §6.1. Init-only, from `route.snapshot` — **never a `queryParamMap` subscription** (D-URL-5); that is the structural reason a write cannot re-enter a read.
- **Implementation notes:**
  - Resolve the my/all scope **explicitly**: `tab` when present, otherwise `loadPinnedTabPreference()`. Never leave it at whatever the root singleton held from a previous route (R-RCU-002 AC.6).
  - Any recognized filter parameter suppresses `restorePersistedState` entirely; an unrecognized parameter alone (`?utm_source`) does not (R-RCU-004 AC.3).
  - A wholly invalid link still counts as explicit navigation — it does **not** fall through to restore (R-RCU-005, second scenario).
  - Exactly one `main()` for the initial load, **after** seeding — never fetch unfiltered and re-fetch.
  - Toast once per navigation, naming counts not values (D-URL-4).
  - **Do not remove the wipes here** — that is T-08's, together with the write path.
- **Acceptance / done check:**
  - [ ] Exactly one results request on initial load (R-RCU-002 AC.4).
  - [ ] The filter is applied *before* that request.
  - [ ] A recognized parameter suppresses restore; `?utm_source=email` alone does not.
  - [ ] An all-invalid link renders the unfiltered page with the toast and does **not** restore.
  - [ ] The toast fires once per navigation regardless of how many tokens were dropped.
  - [ ] A token containing markup cannot alter the toast's rendering.
- **Disqualifies:** a hand-rolled `ActivatedRoute` returning a canned snapshot tests the assertion, **not the parsing** *(KZ-001)* — the harness from T-11 is required for these checks to count.
- **Dependencies:** T-02, T-04 · **Effort:** L · **Skills:** `angular-developer`

---

### T-07 [ ] — Tab-strip sync effect

- **Requirements covered:** R-RCU-002 (CapDev scenario, "the Capacity Sharing tab is the active tab"), R-RCU-002 AC.3
- **Files touched:** `…/results-center/results-center.component.ts`
- **Description:** A component-scoped effect that sets the visual `active` flag on the indicator tab strip, re-armed on every visit.
- **Implementation notes:**
  - Track **both** `indicatorTabs.lazy().isLoading()` **and** `resultsFilter()['indicator-codes-tabs']` (D-URL-14). Keying on the loading signal alone reproduces JD-7: on a repeat visit the list is already cached with `isLoading()` permanently `false`, so the effect's single creation-run lands before `seedFromUrl()` and never re-runs.
  - Requires `allowSignalWrites: true` — it writes signals transitively through `lazy()`.
  - Do **not** repair or depend on the singleton's self-destructing `onChangeList` (`results-center.service.ts:405-430`); it is out of scope.
- **Acceptance / done check:**
  - [ ] A deep link activates the right tab on a **first** visit.
  - [ ] A deep link activates the right tab on a **second visit within the same session** — the JD-7 / R2-7 regression guard.
  - [ ] The filter value is correct even if the strip has not yet synced.
- **Disqualifies:** a single-visit test cannot detect this defect class at all; the second-visit case is the test. Mounting a fresh `TestBed` per case simulates a fresh session and therefore does **not** reproduce it — the two visits must share one endpoint instance.
- **Dependencies:** T-06 · **Effort:** S · **Skills:** `angular-developer`

---

### T-08 [ ] — Write effect + remove **both** wipes

- **Requirements covered:** R-RCU-003 (both scenarios + all ACs), NFR-RCU-001, NFR-RCU-004
- **Files touched:** `…/results-center/results-center.component.ts`
- **Description:** The component-scoped write effect (D-URL-9/D-URL-15) **and** the removal of both query-parameter wipes, landed together.
- **Implementation notes:**
  - The effect's **only** tracked dependency is `userFilterMutations()`; filter state is read via `untracked()`.
  - Guard: on the mandatory first run (counter still at its entry value), **return**.
  - Compare the **merged** result (`{...current, ...next}` with nulls stripped) against the current query string — comparing raw serializations navigates on every run whenever an unrecognized parameter is present.
  - `router.navigate([], { relativeTo, queryParams, queryParamsHandling: 'merge', replaceUrl: true })`.
  - **Remove both wipes** — `results-center.component.ts:112-121` **and** `:133-138`. The second one clears `tab` and was missed in an earlier draft (JD-9).
- **Acceptance / done check:**
  - [ ] Applying, changing and clearing each sidebar filter (plus `tab`) updates the URL correspondingly (R-RCU-003 AC.1).
  - [ ] **Clearing a filter removes its key from the address bar** — the R2-1 guard; assert the resulting URL string, not the serializer output.
  - [ ] Zero `router.navigate` during init when arriving with stale singleton state from `/project-detail/:id` (R2-2 guard).
  - [ ] Zero `router.navigate` on a parameter-less visit that restores persisted state, and restore still honoured on the **next** load (R2-5 guard).
  - [ ] A filter change produces zero additional results requests (R-RCU-003 AC.3).
  - [ ] Browser history depth after N filter changes is unchanged (R-RCU-003 AC.4).
  - [ ] `?utm_source=email` survives the first filter change.
  - [ ] `?tab=my` no longer self-destructs (JD-9 guard).
- **Disqualifies:** asserting on the object passed to `router.navigate` is a presence assertion about the *call*, not the resulting URL — R2-1 lives in the merge, so at least the clearing checks must assert the router's resulting URL. A history-depth check that never navigates twice cannot fail.
- **Dependencies:** T-03, T-05, T-06 · **Effort:** L · **Skills:** `angular-developer`

---

### T-09 [ ] — Home link producers

- **Requirements covered:** R-RCU-007 AC.1, **AC.1b**, AC.3
- **Files touched:** `…/home/components/data-overview/data-overview.component.html` + `.ts` + `.spec.ts`, `…/home/components/main-actions/main-actions.component.html`
- **Description:** Switch the three Home producers to canonical parameters.
- **Implementation notes:**
  - **Both `data-overview` cards must emit `tab=my`** alongside their filter (R-RCU-007 AC.1b). They are headed "My results by status" / "My results by indicator"; their My-scope currently comes from the unconditional `loadMyResults(true)` that T-06 removes, and without `tab=my` they would resolve to the pinned preference — which defaults to `all`.
  - `data-overview.component.spec.ts:153-163` currently asserts `{ statusTab: 7, statusLabel: 'Submitted' }` and must be updated.
  - `statusLabel` disappears from the emitted set entirely.
- **Acceptance / done check:**
  - [ ] Both cards emit `tab=my` plus their canonical filter parameter.
  - [ ] Clicking "My results by indicator" lands on a **My-Results** view — the R2-4 / JD-5 regression guard.
  - [ ] A repository-wide search finds no producer of `indicatorTab` / `statusTab` / `statusLabel` (R-RCU-007 AC.3).
- **Disqualifies:** asserting the emitted `queryParams` object is not evidence that the resulting view is My-scoped; the scope assertion belongs with T-06's read path and must be exercised end to end.
- **Dependencies:** T-02 · **Effort:** S · **Skills:** `angular-developer`

---

### T-10 [ ] — Server: CapDev email link

- **Requirements covered:** R-RCU-007 AC.2, defect class D6
- **Files touched:** `server/…/notifications/capdev-bulk-notification.service.ts` + `.spec.ts`
- **Description:** `buildStarLink(input.agreementId)` called from `buildTemplateData` — `input.agreementId` is already present on `CapdevGroupSendInput`, so no plumbing through `dispatch` is needed (JD-20).
- **Implementation notes:**
  - Keep using `COMPLETE_CLIENT_HOST` — never concatenate the host (R-RCU-007).
  - Remove `CAPDEV_INDICATOR_TAB_QUERY`.
  - The spec must assert the **exact literal** `/results-center?indicator=capacity-sharing-for-development&contract=A100` — this literal is half of the cross-package contract (design §8); its twin lives in T-02's codec spec.
- **Acceptance / done check:**
  - [ ] The built link carries the notified group's `agreement_id`, not a batch-wide or hard-coded value.
  - [ ] No `indicatorTab` is emitted.
  - [ ] The literal assertion is present and matches the client-side literal byte for byte.
- **Disqualifies:** a test asserting the link merely *contains* `results-center` cannot detect a spelling drift on either side — the whole point of the literal. **No automated gate crosses the package boundary** (requirements §8, D6); a manual paste-into-a-running-client check is required at the HITL pause and is not optional.
- **Dependencies:** T-01 · **Effort:** S · **Skills:** `nestjs-expert`

---

### T-11 [ ] — Rewrite the Results Center component spec harness

- **Requirements covered:** enables the rendered assertions for R-RCU-002 AC.3 and every T-06/T-08 check
- **Files touched:** `…/results-center/results-center.component.spec.ts`
- **Description:** The existing spec does **both** things design §10.3 disqualifies at once — a canned-snapshot `ActivatedRoute` (lines 101-108) **and** `template: '<div></div>'` (112-117), over a fabricated service mock with no real signals. Nothing renders and no real state exists, so it cannot test this feature.
- **Implementation notes:**
  - Drop the template override; use the real `ResultsCenterService`; provide real control-list services for the child multiselects; use a real router/param-map harness.
  - Rendered chip assertions must be taken **after** the control lists resolve (design §7.2's documented transient).
  - This is a rewrite of a ~1,000-line spec — it is the single largest item in the budget and is scoped as its own task deliberately.
- **Acceptance / done check:**
  - [ ] The suite drives a real param map; no canned snapshot remains.
  - [ ] The component renders; chips and the tab strip are assertable from the DOM.
  - [ ] All pre-existing behavioral cases still pass under the new harness.
- **Disqualifies:** porting the old assertions onto the new harness without removing the fabricated service mock leaves the same blindness with more ceremony *(KZ-001)*.
- **Dependencies:** T-06, T-08 · **Effort:** L · **Skills:** `angular-developer`

---

### T-12 [ ] — Shared-consumer isolation

- **Requirements covered:** NFR-RCU-005
- **Files touched:** `…/project-dashboard/project-dashboard.component.spec.ts`, `…/project-detail/project-detail.component.spec.ts`, `…/select-linked-results-modal/…spec.ts`, `…/links-to-result/…spec.ts`
- **Description:** Prove the lifecycle guarantee. `ResultsCenterService` is a root singleton mutated from five surfaces on four routes; the component-scoped effect means none of them can write the URL — this task verifies that rather than assuming it.
- **Implementation notes:**
  - `initializeProjectDashboardResultsTable` is called **only** from `project-dashboard.component.ts:215`; `project-detail.component.ts` never references it (JD-8). The existing dashboard spec mocks the service wholesale and must be extended with a real-service case.
  - Assert **zero** `router.navigate` from service-level filter mutations on each of those routes.
- **Acceptance / done check:**
  - [ ] Each of the four surfaces mutates filters with zero `router.navigate`.
  - [ ] The project dashboard's fixed table is behaviorally unchanged.
  - [ ] Full client suite green: `npm test -- --silent`.
- **Disqualifies:** a targeted `--testPathPattern=results-center` run is **not** evidence for this task regardless of exit code *(KZ-003)* — the shared singleton means only a full-suite run bounds the blast radius. A spec that mocks `ResultsCenterService` cannot observe URL leakage and does not satisfy the check.
- **Dependencies:** T-05, T-08 · **Effort:** M · **Skills:** `angular-developer`

---

## 3. Requirement → task coverage

Closure is at **scenario and clause** granularity, not requirement ID.

| Requirement / clause | Task(s) |
| --- | --- |
| R-RCU-001 AC.1–AC.5 | T-01, T-02 |
| R-RCU-001 case policy (names folded, `contract` upper) | T-01, T-02 |
| R-RCU-001 `indicator` single-value | T-02 |
| R-RCU-002 CapDev scenario (+ both clauses) | T-06, T-07 |
| R-RCU-002 multi-value scenario (+ order clause) | T-02 |
| R-RCU-002 AC.1–AC.7 | T-02, T-04, T-06, T-07 |
| R-RCU-003 add scenario (+ history + no-reentry clauses) | T-08 |
| R-RCU-003 clear scenario (+ no-orphan clause) | T-03, T-08 |
| R-RCU-003 AC.1–AC.4 | T-03, T-08 |
| R-RCU-004 scenario (+ no-merge clause) | T-06 |
| R-RCU-004 AC.1–AC.3 | T-06 |
| R-RCU-005 bad-token scenario (+ both clauses) | T-02, T-06 |
| R-RCU-005 unusable-link scenario (+ no-restore clause) | T-06 |
| R-RCU-005 AC.1–AC.4 | T-02, T-06 |
| R-RCU-006 delivered-email scenario | T-01, T-02 |
| R-RCU-006 mixed scenario (+ determinism clause) | T-02 |
| R-RCU-006 AC.1–AC.4 | T-01, T-02, T-09 |
| R-RCU-007 scenario (+ both clauses) | T-10 |
| R-RCU-007 AC.1, AC.1b, AC.2, AC.3 | T-09, T-10 |
| NFR-RCU-001 | T-08 |
| NFR-RCU-002 | T-01 |
| NFR-RCU-003 | T-03 |
| NFR-RCU-004 | T-08 |
| NFR-RCU-005 | T-05, T-12 |

**Carried findings:** R3-1 → T-05 · R3-2 → T-03 · R3-3 → T-01 · R3-4 → T-03.

---

## 4. Risks & blockers log

| # | Date | Risk / Blocker | Mitigation | Status |
| --- | --- | --- | --- | --- |
| RB-1 | 2026-08-12 | Four Judgment Day findings ship into execution unverified; the review lineage is exhausted | Each is a named done-check with a regression guard in its owning task; the `/akili-execute` Reviewer is the next independent reading | open |
| RB-2 | 2026-08-12 | Round 3 had **one judge**, not two — judge B stalled twice on infrastructure | Findings were parent-verified against code; recorded in `judgment.md` §Round 3 as a corroboration gap | open |
| RB-3 | 2026-08-12 | D6 (cross-package link) has **no automated gate** | Twin literals in both packages' specs (T-02, T-10) + a mandatory manual check | open |
| RB-4 | 2026-08-12 | `result_status` names diverge between the database and `ResultStatusNameEnum` (22 vs 25 ids, 8 name mismatches) | Slugs are frozen strings, immune to either source; divergence is out of scope (requirements §9 R5) | open |

---

## 5. PR strategy

~1000 LOC across two packages — **split into three PRs**:

| PR | Tasks | Rationale |
| --- | --- | --- |
| **PR 1 — codec + vocabulary** | T-01, T-02, T-03 | Pure, fully unit-tested, zero behavior change on its own. Reviewable in isolation and the highest-value review target |
| **PR 2 — wiring** | T-04, T-05, T-06, T-07, T-08, T-11 | The behavior change. T-08's ordering constraint (write path before wipe removal) is satisfied inside a single PR |
| **PR 3 — producers + isolation** | T-09, T-10, T-12 | Client and server link producers plus the isolation proofs |

PR descriptions follow `cognitive-doc-design` review-empathy rules: what to review first, what is out of scope, and links to the previous/next PR.

---

## 6. Done definition

- [ ] All T-01 … T-12 are `done`.
- [ ] Every requirement AC **and every scenario clause** in §3 is checked.
- [ ] R3-1 … R3-4 regression guards are green.
- [ ] Client coverage floors hold (statements 40 / branches 20 / lines 45 / functions 30).
- [ ] Full client suite green — not a targeted run.
- [ ] The manual cross-package check (D6) has been performed and recorded.
- [ ] `docs/ux-ui/design.md` decisions log records the URL vocabulary as a durable contract.
