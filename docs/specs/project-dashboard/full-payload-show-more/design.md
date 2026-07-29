# Design — Project Dashboard / Full-payload migration + Show-more + title alignment

- **Module:** project-dashboard (STAR client)
- **Spec id:** 2026-07-full-payload-show-more
- **Status:** draft — **revision 3** (scope reduced; round-2 findings applied)
- **Owner:** d.casanas@cgiar.org
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked judgment:** [`./judgment.md`](./judgment.md)
- **Split off:** [`../geo-scope-expansion/`](../geo-scope-expansion/proposal.md)
- **Stack:** Angular **19.1.6** + PrimeNG 19, standalone, signals, `OnPush`
- **Last updated:** 2026-07-29

> **Revision history.** R1: expansion state inside the card (DD-1) + geographic toggles in the host (DD-6) — a combination with no wiring path. R2: inverted to a presentational card (DD-1r), and added a reactive route (DD-10). R3: **the geographic card is split into its own spec**, and **DD-10 is reverted** — two independent judges confirmed it converted benign staleness into a split-brain page with a cross-contract delete call.

---

## 1. Goals & Non-Goals

**Goals**

| # | Goal | Requirements |
| --- | --- | --- |
| G1 | One request, one data service, for the four ranked charts | R-PDB-001, R-PDB-008 |
| G2 | Collapsed top-5 with in-place expansion, layout-agnostic | R-PDB-002, R-PDB-003 |
| G3 | Encoding invariant across expand/collapse | R-PDB-004 |
| G4 | Titles traceable to their reporting-form fields | R-PDB-007 |
| G5 | **The card's public contract stays backward-compatible**, so the geographic card is untouched | R-PDB-002 AC.5 |

**Non-goals** — each fence with the reason it exists:

| Fence | Reason |
| --- | --- |
| `geo-scope-card.component.*`, `geo-scope-map.component.*`, `GetGeoScopeService`, `GET_GeoScope` | Split to `../geo-scope-expansion/`. **The cut works only because G5 holds** — see §2.3 |
| `project-detail.component.*` | DD-10r — fixing one side of the parent's route staleness is worse than fixing none |
| Server / `reports-full.dto.ts` | Endpoint already ships (provisional per GATE-1) |
| `CustomProgressBarComponent` | 8 unrelated screens render it (KZ-002) |
| `projectDashboardBarColor()` signature | Outside callers keep current semantics (DD-4) |
| *Results by status* | Chunk B owns it (umbrella D-6) |
| The three `<h3>` headings in the geographic card | Sub-list labels in another card, not chart titles — R-PDB-007 AC.4 |

---

## 2. Architecture

Presentation slice of `project-detail`. No new architectural layer, no persistence or transport change — no ADR warranted.

```
ApiService.GET_FullContractReports(contractId)          [new method, existing endpoint]
        │  MainResponse<ContractFullReports>
        ▼
GetFullContractReportsService        [new — component-scoped on ProjectDashboardComponent, DD-9]
        │  payload() ─┬─ topPartners()  … per-section computeds
        ▼             │
ProjectDashboardComponent   [owns expansion state: one signal holding a Set of chart keys]
        └── 4× ProjectDashboardCardComponent   [presentational: visibleLimit in / expandToggled out]

GetGeoScopeService ─→ GeoScopeCardComponent ─→ 3× card (variant="list", no visibleLimit binding)
        ▲                                        └→ GeoScopeMapComponent
        └── UNTOUCHED. Renders the same rows as today because visibleLimit defaults to null.
```

### 2.1 Composition

**New files**

| Path | Responsibility | ~LOC |
| --- | --- | --- |
| `shared/interfaces/contract-full-reports.interface.ts` | Client mirror of `ContractFullReportsDto` + its nested shapes, including the `geo_scope` section (unused here, needed by the geographic spec). Adds `user_id` to the ranked-item shape | ~90 |
| `shared/services/get-full-contract-reports.service.ts` | **`payload` signal** + derived per-section computeds + `loading`, `loadError`, `update()` (DD-2r) | ~75 |
| `shared/services/get-full-contract-reports.service.spec.ts` | Envelope mapping, `loading` transitions, error, retry, **URL + `contract-id` encoding** | ~110 |
| `app/testing/contract-full-reports.mock.ts` | The one shared fixture (§10) | ~60 |

**Modified files** — corrected inventory

| Path | Change | ~LOC |
| --- | --- | --- |
| `shared/services/api.service.ts` | `+ GET_FullContractReports`; `−` **four** `GET_Top*` methods (`GET_GeoScope` stays) | ±28 |
| `shared/services/api.service.spec.ts` | `+` new cases; `−` the four old blocks | ±80 |
| `…/project-dashboard.component.ts` | One service injected; 4 item-computeds + **4 `*Empty()` computeds** (`:153,169,184,198`) re-sourced; `id` keys hardened; expansion state (DD-1r/DD-2r) | ~110 |
| `…/project-dashboard.component.html` | **4** titles (DD-5); `[visibleLimit]` + `(expandToggled)` per card; **16 state bindings** re-sourced | ~40 |
| `…/project-dashboard.component.spec.ts` | **848 lines** — rewrite the provider/override block (`:205-226`) **and `ProjectDashboardCardStubComponent` (`:20-37`)**, which must gain `visibleLimit`/`expandToggled` or `strictTemplates` fails the build | ~200 |
| `…/project-dashboard-card.component.ts` | `visibleLimit` input (**default `null`**), `expandToggled` output, `visibleItems`, `canExpand`, encoding pinned to `items()`, toggle a11y | ~55 |
| `…/project-dashboard-card.component.html` | Toggle in the shell; `@for` → `visibleItems()`; **`columns` structural bindings → `visibleItems().length`**; bounded wrapper on the **`variant="card"` outlet only** — the `variant="list"` outlet is left alone (§6.3, and A2-8 claims that work) | ~50 |
| `…/project-dashboard-card.component.spec.ts` | 114 → ~340 lines | ~230 |
| `shared/interfaces/project-dashboard.interface.ts` | `ProjectDashboardRankedItem` gains `user_id` | ~5 |

**Deleted** — measured (`wc -l`, 2026-07-29): four services **164 LOC** + four specs **304 LOC** = **468 LOC**.

### 2.2 Reuse

Unchanged: `ApiService.TP`, `MainResponse<T>` handling, `CustomProgressBarComponent`, `TruncatedTextTooltipDirective`, `TooltipModule`, `ButtonModule`, `projectDashboardBarColor()`, `ProjectUtilsService.sortIndicators`, and the entire geographic stack.

### 2.3 Why the geographic card stays untouched — the load-bearing detail

Today `ProjectDashboardCardComponent` renders **every** `items()` entry; it has no cap. Adding a `visibleLimit` input that defaulted to `5` would silently cap the geographic card's three lists — its sub-national list currently shows up to 6 — a regression in a file this spec claims not to touch.

**Therefore `visibleLimit` defaults to `null` (show all)** and the four ranked cards pass `5` explicitly. The card change becomes **purely additive**: every existing call site keeps its behaviour by construction, not by inspection. This is what makes the geographic split a clean cut rather than a deferred coupling, and it is asserted directly (R-PDB-002 AC.5).

---

## 3. Data Model

**No data model changes.**

## 4. API Surface

**No server-side change — provisional per GATE-1 (§13).** Both this document and `requirements.md` §9 now carry that condition, so they cannot disagree if the measurement comes back bad.

| Item | Value |
| --- | --- |
| Consumed | `GET /api/v1/agresso/contracts/reports/full?contract-id=<encoded>` |
| Server owner | `agresso-contract.controller.ts:156` → `…service.ts:208` → `…repository.ts:1167` |
| Data shape | `ContractFullReports` — this spec consumes `top_partners`, `top_primary_levers`, `top_main_contact_persons`, `top_contributors`; `staff` and `geo_scope` are mirrored but unused here |
| Identity fields | `top_main_contact_persons[].user_id` **confirmed present** |
| Retired | four `GET_Top*` client methods. `GET_GeoScope` **kept** |

---

## 5. Workflows & Business Rules

### 5.1 Load

1. `contractId` keeps its current `snapshot`-based derivation — **unchanged** (DD-10r).
2. The dashboard's existing `effect` calls `GetFullContractReportsService.main(contractId)` **once**, replacing four calls. `initializeProjectDashboardResultsTable`, the executive-overview load and the status chart are untouched.
3. Service sets `loading`, requests, assigns `response.data` to its **`payload` signal**, clears `loading`; on failure sets `loadError` and **clears `payload`**.
4. Per-section accessors are `computed` over `payload` — not independent imperative signals. This is what gives DD-2r a real reset source.
5. Each item list is derived via the existing formatting functions (`formatPartnerLabel`, `formatLeverDisplayLabel`, `formatContributorLabel`, `formatMainContactPersonName`) — **unchanged**, so label rendering cannot regress.

### 5.2 Expansion

1. Every card receives the **full** section in `items()`.
2. Every card receives `visibleLimit`: a number, or `null` for all. Default `null` (§2.3).
3. `visibleItems()` = `visibleLimit() === null ? items() : items().slice(0, visibleLimit()!)`.
4. Templates iterate `visibleItems()`; **all encoding reads `items()`** (§5.3).
5. `canExpand()` = `items().length > COLLAPSED_ITEM_LIMIT`. The card renders its toggle only when `canExpand()` **and** `variant() === 'card'`, emitting `expandToggled`.
6. The host holds one `signal<ReadonlySet<ChartKey>>`. On `expandToggled` it emits a **new `Set`** (never mutates in place — a mutated `Set` re-`set()` fails Angular's `Object.is` check and silently never re-renders). `visibleLimit` per card = `expanded.has(key) ? null : COLLAPSED_ITEM_LIMIT`.
7. **Reset semantics — a plain `signal` is not an omission, it is the mechanism (AC.6 / AC.7).** The signal's lifetime *is* the component's, so a contract change collapses everything for free: every navigation that changes `:id` destroys `ProjectDashboardComponent` (D-AC5, verified across all seven call sites), taking the signal with it. Nothing keyed to `payload()` is needed or wanted — a payload-sourced reset would also fire on the per-card **Try again**, collapsing a list the user deliberately opened. That is why revision 2's `linkedSignal` was **broader than the requirement**, as judgment round 1 recorded (S-8), and why dropping it is correct rather than a lost mechanism. AC.7 pins the retry behaviour so it is tested, not accidental.

### 5.3 Encoding invariance (R-PDB-004)

**Rule: every visual encoding is computed against the full list, never the visible window.** Since `items()` *is* the full list, this holds by leaving every encoding member reading `items()`:

| Member | Reads | Effect |
| --- | --- | --- |
| `barColor(index)` → `projectDashboardBarColor(index, total)` | `items().length` | the 5th row keeps its colour when the 6th appears |
| `maxCount()` → `partnerBarWidthPercent` | full list | widths stable |
| `totalCount()` / `fillPercent` | full list | stable for `columns` / default (Chunk B) |

The `@for` index is then the true rank, so `rows-stacked-lever`'s `index + 1` badge stays correct past 5 for free.

**Structural bindings are NOT encoding.** The `columns` branch derives container geometry from the item count *outside* the `@for` — `[class.justify-center]="items().length <= 3"` and `[style.grid-template-columns]` built twice from `items().length` (`project-dashboard-card.component.html:49-54`). These **must** switch to `visibleItems().length`, or a 40-item section collapsed to 5 renders 40 grid tracks holding 5 bars. `columns` is unused today but is the **default** value of the `layout` input, and Chunk B may adopt it. Gated by DC-6.

**Sort hardening (AC.4).** Explicit descending sort on all four ranked computeds — `partnerItems()` performs **no** sort today (`:176-182`); the other three do.

### 5.4 Chart keys

`ChartKey` is an exported string-literal union of exactly four members — `'partners' | 'levers' | 'contacts' | 'contributors'` — so a typo is a compile error rather than a silently dead toggle. Chunk B extends the union; adding a card costs one union member and one template binding, no new signal.

---

## 6. Client Component Architecture

### 6.1 `ProjectDashboardCardComponent` — presentational

| Member | Kind | Notes |
| --- | --- | --- |
| `items` | `input<readonly ProjectDashboardRankedListItem[]>` | the **full** section |
| `visibleLimit` | `input<number \| null>(null)` | **new.** `null` = all. Default preserves every existing call site (§2.3) |
| `expandToggled` | `output<void>()` | **new.** `variant="card"` shell toggle only |
| `visibleItems` | `computed` | §5.2.3 |
| `canExpand` | `computed` | `items().length > COLLAPSED_ITEM_LIMIT` |
| `maxCount` / `totalCount` | `computed` | **unchanged — keep reading `items()`** |
| `toggleLabel` / `toggleAriaLabel` | `computed` | from `visibleLimit() === null`; aria name includes `title()` (NFR-PDB-003) |

Holds **no expansion state**. `COLLAPSED_ITEM_LIMIT = 5` is an **exported** module constant so the host uses the same number rather than a hardcoded literal that can drift.

### 6.2 Toggle placement — pinned

Rendered **inside the `@if (items().length)` arm** of the state chain (`project-dashboard-card.component.html:32-35`), immediately after the `rankedList` outlet — *not* after the outer state-chain `<div>`. Reason: with one shared service, any card's **Try again** sets `loading` for all four while section signals may still hold data, so `canExpand()` could stay true; a toggle outside the arm would render beneath the spinner.

**With the geographic split, every toggle in this spec is rendered by this component** — one implementation, one place to gate a11y (NFR-PDB-003). Revision 2's second, host-rendered toggle is gone.

### 6.3 Bounded height (NFR-PDB-004) — **revised by DD-14, 2026-07-29**

- The `variant="card"` outlet's wrapper becomes a scroll container, bounded **only when `visibleLimit() === null`**. Collapsed rendering is unaffected by the wrapper (the 4 → 5 row change and DD-4's ramp are separate, intended changes).
- The `variant="list"` outlet is left alone — it has no wrapper today and, with the geographic split, nothing in this spec expands a `variant="list"` card.
- ~~Bound is viewport-relative (OQ-3), pending GATE-2.~~ **Superseded by DD-14.** The bound is **card-area-relative**: the list scrolls inside the space the card already occupies, and the card's height does not change on expand. See §6.3.2.
- **Geometry, corrected:** the four cards sit in a nested `lg:grid-cols-2 lg:items-stretch` grid (`project-dashboard.component.html:157`), itself the left column of an outer `lg:grid-cols-[3fr_1fr] lg:min-h-[520px] lg:items-stretch` grid (`:153`) whose right column holds *Results by indicator* / *Results by status*. Unbounded expansion stretches **both** the row-mate card **and** the right-hand column. Revision 2 mis-stated this adjacency; since DC-8 has no automated gate, the human-check script *is* the gate, so `requirements.md` §7 has been corrected to match.
- **jsdom computes no layout**, so tests verify only that the container exists and is conditioned correctly.

### 6.3.2 Freeze the geometry (DD-14) — **the resolution of the T-06 pivot**

> **Supersedes DD-13.** DD-13 (§6.3.1, retained below as the record of a wrong turn) tried to stop the growth **propagating**. DD-14 removes the growth **at its source**. Recorded in full because a future reader will otherwise re-derive DD-13, which looks correct and is not.

**The constraint.** The expanded list is bounded to the area the card **already occupies**. The card's rendered height is **identical** collapsed and expanded; only the list's scroll state differs.

**Why this is the only mechanism that satisfies both conditions literally.** The failure chain has four links — expanded card → ranked grid track → left column → outer grid row → right column. `align-items` acts on **link 1 only**, and it acts on the wrong thing: it governs how a *shorter* item sits inside a track, never how the track is *sized*. A track is sized to its tallest item's max-content contribution regardless of alignment. So DD-13 could stop the row-mate stretching while every downstream link kept growing. **If the card's height never changes, no growth exists to propagate, and all four links are satisfied by one property.**

**Consequences, stated so they are not discovered later:**

- **DD-13's conditional grid class becomes unnecessary.** With no height change there is no row-mate stretch and no empty gap, so the ranked grid keeps `lg:items-stretch` unconditionally — the collapsed *and* expanded views both look exactly like today's collapsed view. This **simplifies** the shipped T-06: the `rankedGridIndependent` computed and its two class bindings can go.
- **OQ-3 is reopened and re-closed.** It was closed as "viewport-relative (`46vh`)" on the GATE-2 mockup's evidence. That evidence was unsound (the mockup could not model the defect — see `requirements.md` §7). **New answer: neither fixed nor viewport-relative — relative to the card's own already-established area.**
- **T-03's committed bounded container is amended**, not discarded: the `overflow-y-auto` conditioning stays, `max-h-[46vh]` goes. This is the only committed work the pivot touches.
- **The scroll area is smaller than under DD-13** — roughly five rows rather than `46vh`. That is the honest cost of the option, and it is the right trade: GATE-1 measured the worst realistic case at 137 rows, so *any* bound means scrolling. The question was only whether the surrounding page moves while you do it.

**Implementation constraint.** For the track not to grow, the expanded list must not contribute a **larger** max-content height than the collapsed list does.

> ⚠️ **A `max-height` alone does NOT achieve this, and the first attempt at DD-14 failed on exactly this point.** A `max-height` clamps a box's max-content contribution **only when the content exceeds it**. Collapsed, five rows sit *below* any sane bound, so the container contributes its **natural** height; expanded it contributes the bound. **The cap binds in one state only**, and the difference propagates through all four links. Measured in real Chrome: a static `max-h-[280px]` produced **+52px** growth on the row-1 cards and **+13px** on row-2, landing entirely in *Results by status*.
>
> A per-call-site constant also cannot work. The collapsed heights are exact arithmetic (`line-clamp-2` plus fixed row heights make them font-independent): `rows-partners` **208.25px**, `rows-stacked-lever` **239.25px**, `rows-stacked-lever` + `itemHeightPx=43` **267px**. One constant would have to equal all three.
>
> ~~"A definite height must come from above (the row track)"~~ — **this earlier wording was circular and is retracted.** The ranked grid's rows are `auto`, so they are sized **by** the card; nothing definite comes from above unless the track is *made* definite or the collapsed height is *captured*.

**Two mechanisms are known to satisfy the constraint. Either is acceptable; a third is fine if it demonstrably freezes the height.**

| # | Mechanism | Why it works |
| --- | --- | --- |
| **(i)** | **Measure and freeze.** Hold the container in an `ElementRef`, capture its `offsetHeight` while collapsed, and apply that value as an inline `height`/`max-height` while expanded. Guard jsdom's `0`. | The bound **equals** the collapsed height, so the contribution is identical in both states. Exactly card-area-relative, and the applied inline style is structurally assertable. |
| **(ii)** | **Remove the expanded list from intrinsic sizing.** Keep a 5-row in-flow list — which *is* the collapsed geometry that defines "the area the card already occupies" — and render the full list while expanded in a `position: absolute; inset: 0; overflow-y: auto` overlay inside a `relative` parent. | An absolutely-positioned box contributes **nothing** to track sizing, so growth is structurally zero **with no measurement to get wrong**. Encoding survives: `barColor(index)` and `partnerBarWidthPercent` already read `items()`. |

**Verification note.** A headless Chrome is available in this environment (`~/.cache/puppeteer/chrome-headless-shell/…`, `--headless --dump-dom`, no npm dependency), and a reusable geometry probe exists at `scratchpad/geometry-probe.html`. **DC-8's "no automated gate for rendered layout" premise is therefore weaker than RSK-4 and RB-2 assume** — a real browser can measure the four-link chain directly. The six-step human check remains the acceptance gate, but a candidate mechanism should be measured *before* review rather than argued.

### 6.3.1 ~~Bounding is not enough — the grid must also stop stretching (DD-13)~~ — **SUPERSEDED by DD-14**

> **Retained as a record of a wrong turn, not as guidance.** Everything below correctly identifies a real defect (the row-mate's empty gap) and then prescribes a mechanism that cannot fix it, because `align-items` does not size grid tracks. Read §6.3.2 for what shipped. The value of keeping this section is that its reasoning is *plausible* — which is why it survived three rounds of blind review, a mockup, and an implementation.

**Found by operating the GATE-2 mockup, after three rounds of review had passed on the design as written.** Bounding the list stops the *page* from growing, but it does not stop the *row-mate* from growing: `lg:items-stretch` on the ranked grid (`project-dashboard.component.html:157`) forces every card in a row to match the tallest. So an expanded Results Partners card at `46vh` drags Primary Levers to `46vh` too — and Primary Levers only has 5 rows to show, leaving **a tall empty gap with its rows stranded at the top and its own "Show more" pushed far below its content**.

That gap has only two possible fixes, and one of them is out of scope:

| Fix | Verdict |
| --- | --- |
| Fill the gap — render more rows in the un-expanded card | **Rejected.** Showing rows the user did not ask for contradicts R-PDB-002 (collapsed = top 5) and widens the ticket's scope. A card must not silently expand because its neighbour did |
| Remove the height — let the cards size independently while one is expanded | **Adopted.** The gap exists because of an imposed height, so the height is what goes |

**Mechanism.** The ranked grid carries `align-items: start` **only while the host's expanded set is non-empty**; collapsed it keeps `lg:items-stretch`. Consequences:

- The default view is **unchanged** — equal-height cards, exactly as today. This matters because R-PDB-002's 4 → 5 row change and DD-4's colour ramp are already visible changes; a third one to the collapsed layout was neither asked for nor needed.
- Expanded, each card keeps its natural height: the expanded one scrolls inside itself, the row-mate ends after its own content, and its **"Show more" stays adjacent to its list** instead of floating below a void.
- It is one conditional class on one container, driven by state the host already holds (`expanded.size > 0`) — no new signal, no per-card plumbing.

**Testability.** Like everything in DC-8 this is invisible to jsdom, which computes no layout: a spec can assert the **class is applied when the set is non-empty and absent when it is empty**, and nothing more. The rendered outcome stays a human check — now with a mockup that demonstrates all three states side by side.

### 6.4 Design tokens

No new tokens. Existing PrimeNG `pButton` text styling and the palette already in these templates (`#1771b3`, `#777C83`). PRD **C-4** contrast; no `isDarkMode()` branching.

---

## 7. Integration Impact

| System | Impact |
| --- | --- |
| Server, CLARISA, AGRESSO, TIP, ROAR, OpenSearch, DynamoDB, RabbitMQ, Socket.IO | **None** |
| Mapbox Geocoding | **None** — the geographic card is untouched and keeps its `limit=5` source |
| New env vars | **None** |

## 8. Security & Authorization

No change. No endpoint, role, guard, secret, token or PII surface touched.

## 9. Observability

No new logging, metrics or tracing. Failure stays visible through the per-card error state and **Try again** — now retrying one request instead of four, a small reliability gain: a partial failure previously left the four charts mutually inconsistent.

---

## 10. Testing Strategy

**Dictated by KZ-001.** `project-dashboard.component.spec.ts:205-226` replaces the real card with `ProjectDashboardCardStubComponent`. Everything in R-PDB-002/003/004 renders **inside** the real card.

| Spec | Asserts | Doubles |
| --- | --- | --- |
| `project-dashboard-card.component.spec.ts` (114 → ~340) | `visibleLimit` honoured incl. `null` = all; toggle presence/absence and position in the state chain; `expandToggled` emission; **colour + width invariance across limit change**; rank continuity; **`columns` track count equals rendered cells in both states** (DC-6); `aria-expanded`; accessible name contains the title; keyboard activation; bounded container present and conditioned | **No stub. Real template.** |
| `get-full-contract-reports.service.spec.ts` | `payload` assignment, per-section computeds, `loading`, `loadError` **clears `payload`**, `update()`, **URL + encoding** | `HttpTestingController` |
| `api.service.spec.ts` | new method URL; removal of the four old blocks | existing pattern |
| `project-dashboard.component.spec.ts` (rewrite stub + providers) | one `main()` per contract and zero calls to retired services (spy level); correct `title`/`items`/`layout`/`visibleLimit` **inputs** per card; **`expandToggled` from the stub flips host state and pushes a new `visibleLimit` down** (DC-11); a **new `Set`** is emitted, not a mutated one; **expansion survives a `loadError` → `update()` retry cycle (AC.7)** and a fresh component instance starts collapsed (AC.6); `id` keys payload-derived; homonym fixture | Card stub **legitimate**, but must gain the new input/output |
| **Full suite** | collateral damage from the deletion (**KZ-003**) | — |

**The seam is tested from both sides (DC-11).** DD-1r moved expansion across a host↔card boundary. The card spec proves the card honours `visibleLimit` and emits `expandToggled` against the real template; the dashboard spec proves the host reacts to that output and pushes a new limit down. Neither side alone proves the seam, and the stub cannot substitute for the card side.

**Fixture** (`app/testing/contract-full-reports.mock.ts`): > 5 partners; a duplicate-display-name contact pair; a deliberately **out-of-order** section (AC.4); a section of exactly 5 and one of 3 (AC.2 / R-PDB-002 AC.5).

Coverage: client floors (40/20/45/30). Net coverage should rise.

---

## 11. Rollout

| Item | Value |
| --- | --- |
| Migration order | N/A |
| Feature flag | **None** — presentational, revert-able, endpoint already live |
| Backout | `git revert`. Nothing to unwind |
| Deploy coupling | **None** — client-only |
| Comms to MEL / product owner — **four** visible changes | 4 → 5 rows (R-PDB-002) · **four** renamed titles (R-PDB-007) · the collapsed-view colour consequence of DD-4 (§12.1) · the new "Show more" control itself |

---

## 12. Design Decisions Log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| ~~DD-1~~ | | ~~Expansion state in the card~~ | **REVERSED by DD-1r** |
| **DD-1r** | 2026-07-29 | The card is **presentational**: `visibleLimit` input + `expandToggled` output; state lives in the host, keyed by chart | The only contract that also works for `variant="list"`. `items()` stays the full list, so R-PDB-004 survives — which the host-pre-slices alternative did not. Confirmed working against source by both judges |
| **DD-2r** | 2026-07-29 | The service exposes a **`payload` signal**; per-section accessors are `computed` over it. The host holds `signal<ReadonlySet<ChartKey>>`, emitting a **new `Set`** on every toggle | Revision 2 sourced the reset on "the payload signal" without declaring one — the source did not exist. Declaring it makes AC.6 implementable. A key set means Chunk B adds a card with one union member and no new signal. **`linkedSignal` is no longer used** — see DD-10r; a plain `signal` suffices, which also removes the `@developerPreview` dependency |
| **DD-3** | 2026-07-29 | Toggle rendered once in the `variant="card"` shell, inside the `@if (items().length)` arm | One implementation for five layouts; position pinned so it cannot render under the shared-service spinner |
| **DD-4** | 2026-07-29 | Encoding computed against the **full** list; `projectDashboardBarColor()` untouched | Satisfies R-PDB-004 with no shared-code refactor. **Reverts shipped visual behaviour — challenged in §12.1** |
| **DD-5** | 2026-07-29 | Titles verbatim from form labels, or the section/tab name when the label is a question. **All four live in `project-dashboard.component.html`** | Umbrella D-4, verified against live templates |
| **DD-7** | 2026-07-29 | `COLLAPSED_ITEM_LIMIT = 5` is an **exported** module constant | The host needs the same number; an unexported constant invites a drifting literal |
| **DD-8** | 2026-07-29 | No feature flag | §11 |
| **DD-9** | 2026-07-29 | `GetFullContractReportsService` is **component-scoped** on `ProjectDashboardComponent`, as the services it replaces are (`:49-55`) | Both judges verified the nesting: `<app-geo-scope-card>` is rendered only by `project-dashboard.component.html:200`, so element-injector resolution holds and the `project-results` route never instantiates a consumer. `providedIn: 'root'` would retain the previous contract's payload across navigation |
| ~~DD-10~~ | | ~~Make `contractId` reactive~~ | **REVERTED by DD-10r** |
| **DD-10r** | 2026-07-29 | **`contractId` keeps its `snapshot` derivation. This spec adds no route reactivity.** R-PDB-001 AC.5 is satisfied by component recreation | See §12.2. Both judges confirmed DD-10 traded a benign defect for a dangerous one |
| ~~DD-11~~ | | ~~`mapCountries` shape~~ | **MOVED** to `../geo-scope-expansion/` |
| **DD-12** | 2026-07-29 | `visibleLimit` defaults to **`null`** (show all), not `5` | §2.3. Makes the card change purely additive and the geographic split a clean cut. Asserted by R-PDB-002 AC.5 |
| ~~DD-13~~ | 2026-07-29 | ~~While any card is expanded, the ranked grid switches to `align-items: start`~~ | **SUPERSEDED by DD-14** — `align-items` does not size grid tracks, so it cannot stop the growth it was chosen to contain. §6.3.1 retained as the record of a wrong turn |
| **DD-14** | 2026-07-29 | **Freeze the geometry: the expanded list is bounded to the area the card already occupies, so the card's height is identical collapsed and expanded.** The ranked grid keeps `lg:items-stretch` unconditionally | **Resolution of the T-06 pivot.** Removes the growth at its source instead of trying to stop it propagating through a four-link chain, so both NFR-PDB-004 conditions become literally true rather than approximately true. Re-closes **OQ-3**: the bound is neither fixed nor viewport-relative but card-area-relative. See §6.3.2 |

### 12.1 Reversion Challenge — DD-4

DD-4 removes shipped behaviour: today `projectDashboardBarColor` paints the last visible bar `#112F5C` whenever `total >= 4`. Computing against the full list means a truncated chart shows nothing dark navy.

**Challenge — what does removing it break?** The collapsed view's only *end-of-list* cue, since `rows-partners` renders no rank badge and OQ-2's default is not to add one.

**Resolution — proceed:**

1. **The toggle is a better cue in the same place.** "Show more" sits directly beneath the 5th row and says *there is more*. The dark bar said *this is the end* — which, in a chart truncated at 4 of 37, **was false**. A lie is being corrected, not a cue removed.
2. **The cue survives where it is true.** With ≤ 5 items there is no toggle, full list == visible list, and the last bar renders dark navy as today.

In the §11 comms line — the product owner's call to overrule.

### 12.2 Reversion record — DD-10 → DD-10r

Round 1 correctly found that `contractId` reads a non-reactive `snapshot` (`:79`), so an in-place `:id` change would not re-fire the load. Revision 2 answered by making the **child** reactive. Both round-2 judges independently found this **worse than the defect**:

- `ProjectDetailComponent` seeds its own id from `snapshot.params['id']` inside **`ngOnInit`** (`:70`), which does not re-run, and drives the header, `contractStaff.main()` and `bilateralService.getContract()`. Reactive child + snapshot parent = one contract's header beside another's charts. Today's failure is uniformly stale and **self-consistent**.
- `removeGroundingDocumentAsync` calls `deleteDocumentOverviewFiles(this.contractId(), [document.fileName])` (`:380-401`) against an **ungated** `groundedDocuments()` list — after DD-10 that is contract **B**'s id with contract **A**'s filename. Same class at `:298-311`, where `contractId()` is re-read after an `await`.
- The navigations that exist — `result-sidebar.component.ts:472`, `section-header.component.ts:245` — route to `/project-detail/:id` **without** the `project-dashboard` segment, which **destroys** the component. DD-10 bought reactivity on a path that does not occur.

**Resolution:** revert. AC.5 is satisfied by component recreation on every navigation path that exists. The parent's latent staleness is a genuine, page-wide defect — filed separately against `project-detail.component.ts`, out of scope for a presentation-slice spec. Consequence: DD-2r no longer needs `linkedSignal`, so the `@developerPreview` dependency disappears and a plain `signal` does the job.

### 12.3 Scope reduction record — the geographic split

Two rounds of dual review put the severe finding and most warnings on the geographic card. It is structurally different: a chrome-less variant, per-row geocoding cost, two pre-existing truncations serving both the map and the display list, and its own service. Continuing to patch it here consumed review budget without converging.

**DD-12 is what makes the cut clean.** Had `visibleLimit` defaulted to `5`, splitting would have left the geographic card silently capped — a regression in a file declared untouched. Defaulting to `null` makes the separation structural rather than a promise.

---

## 13. Budget (tripwire for `/akili-execute`)

**Re-derived from §2.1's own inventory, reconciled.** Revision 2 was internally inconsistent — its decomposition contradicted its file table two sections earlier, which is the same failure C-6 raised. Revision 3 sums the table.

**This is the third attempt at this number.** C-6 said 600 was ~3× low; R2-7 said 1,700 contradicted §2.1; R3-3 said 1,260 contradicted §2.1 *and itself*, and that the claim "re-derived by summing §2.1's own table" described a summation that was never performed. It is performed here, line by line, and the arithmetic is shown so the next reviewer can check it rather than trust it.

| Group | Rows | LOC |
| --- | --- | --- |
| Modified — production | `api.service.ts` 28 · `project-dashboard.component.ts` 110 · `.html` 40 · `card.component.ts` 55 · `card.component.html` 50 · `project-dashboard.interface.ts` 5 | **288** |
| New — production | interface 90 · service 75 | **165** |
| Modified — tests | `api.service.spec` 80 · `project-dashboard.component.spec` 200 · `card.component.spec` 230 | **510** |
| New — tests | service spec 110 · fixture 60 | **170** |
| Deleted | four services 164 + four specs 304 (`wc -l`, measured) | **468** |
| | | **= 1,601** |

| Metric | R1 | R2 | R3 | **R3.1** | Basis |
| --- | --- | --- | --- | --- | --- |
| Tasks | 8 | 11 | 8 | **8** | Geographic work (3 tasks) left with the split |
| Changed LOC | ≈ 600 | ≈ 1,700 | ≈ 1,260 | **≈ 1,600** | The table above. Both round-3 judges independently estimated ~1,550+; the gap was the four new files, which carried no LOC at all |
| Review rounds | 2 | 3 | 2 | **2** | Implementer→Reviewer rework rounds. **Design-review rounds are a separate budget and are not counted here** — revision 2 conflated them |

**Sizing verdict: `Standard`, at its upper edge.** Eight tasks and ≈1,600 changed lines, of which **468 is deletion** and **680 is test code**. Net new production is ~450 lines. No data model, no API contract, no auth, no migration — so `Full`'s alternatives/rollout/observability apparatus would still be ceremony.

**PR consequence:** past the ~400 LOC single-PR guidance — `tasks.md` proposes a split.

### Gates before implementation

| ID | Gate | Status | Outcome |
| --- | --- | --- | --- |
| **GATE-1** | Measure `reports/full` size against the largest real contracts | ✅ **CLOSED — measured 2026-07-29** against the local backend's MySQL, replicating `buildPrimaryContractResultsSubquery` + the four section queries over the **top 25 contracts by result count**. See §13.1 | **The fence holds. No server ceiling needed.** Worst case ≈ **36 KB uncompressed / ~7 KB gzipped**; this spec's four sections ≈ **31 KB** |
| **GATE-2** | Collapsed + expanded mockup at `./mockup/` | ⛔ **OPEN** | Spec author. Now informed by GATE-1's real row counts (137 max, not the hundreds feared) — see §13.1 |

### 13.1 GATE-1 measurement (2026-07-29)

Measured, not estimated. Read-only queries against the local backend's database, replicating the repository's own `buildPrimaryContractResultsSubquery` join and each ranked section's `DISTINCT` grouping, across the 25 contracts with the most results.

| Section | Worst case across the sample | Fidelity |
| --- | --- | --- |
| **Partners** | **137** distinct institutions (`institution_role_id = 3`) | Exact — matches the reference project (A1578 → 67 partners, top one linked to 44 results, consistent with the screenshot) |
| Contributing projects | 15 | Exact |
| Main contact persons | 35 | **Upper bound** — counts all `result_users`; the report filters by contact role, so the real figure is lower |
| Primary levers | 8 | **Upper bound** — no lever-role filter applied |
| Countries | 30 | Exact |
| Sub-nationals | 0 across the whole sample | **Needs independent confirmation in A2** — the geographic query is the least validated here, and this figure sits oddly beside the reference project's sub-national summary count. Not relied on by this spec |

**Consequences for this spec:**

1. **RSK-1 (unbounded payload) is effectively closed.** The realistic worst case is a 137-row partner list, not the hundreds the risk was written against. A 36 KB body is unremarkable, and no server-side ceiling is warranted — so §1's "no server change" fence is **valid, not provisional**, and `requirements.md` §9's conditional wording can stand as history rather than a live condition.
2. **The expanded card renders at most ~137 rows.** That is well inside what `OnPush` plus the bounded scroll container of §6.3 handles, and it retires the concern that expansion would be a render-cost problem.
3. **It also de-risks A2.** The geographic spec's A2-OQ1 was written against a hypothetical 40 × 20 = 800-row flatten. Real data shows ≤ 30 countries and (pending confirmation) no sub-national rows in the top contracts, so the bound A2 chooses is far less consequential than feared. Recorded in the geo proposal.

Method and script: `scratchpad/gate1-measure.js` (throwaway, read-only). The two upper-bound rows would only move the total **down**.

## 14. Open Questions

| ID | Question | Owner | Default | Due |
| --- | --- | --- | --- | --- |
| OQ-2 | Rank badges on `rows-partners` when expanded? | d.casanas | **No** — §12.1 | before implementation |
| ~~OQ-3~~ | Bound height: fixed or viewport-relative? | design | **CLOSED 2026-07-29 — neither. Card-area-relative (DD-14).** Originally closed as viewport-relative `46vh` on GATE-2 evidence; reopened by the T-06 pivot when that evidence proved unsound (the mockup could not model the defect), and re-closed by DD-14 | closed |

Closed: OQ-1 and umbrella D-1 moved with the geographic spec · OQ-4 (`user_id` confirmed) · AC.5 mechanism (D-AC5 / DD-10r).

## 15. References

- Judgment ledger — [`./judgment.md`](./judgment.md)
- Geographic spec — [`../geo-scope-expansion/proposal.md`](../geo-scope-expansion/proposal.md)
- Umbrella decisions D-1 … D-7 — [`../analytics-expansion/proposal.md`](../analytics-expansion/proposal.md)
- Kaizen Active Lessons KZ-001/002/003 — `docs/specs/kaizen-log.md` **on branch `dev`** (absent from `AC-1672`; read via `git show dev:…`)
- No ADRs introduced.
