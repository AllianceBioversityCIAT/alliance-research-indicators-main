# Requirements — Project Dashboard / Full-payload migration + Show-more + title alignment

- **Module:** project-dashboard (STAR client)
- **Spec id:** 2026-07-full-payload-show-more
- **Status:** draft — **revision 2** (scope reduced; see §0)
- **Owner:** d.casanas@cgiar.org
- **Depth:** **Standard**
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) §G8, §M12, US **MEL-2**
- **Linked proposal:** [`./proposal.md`](./proposal.md) · **Umbrella:** [`../analytics-expansion/proposal.md`](../analytics-expansion/proposal.md)
- **Linked judgment:** [`./judgment.md`](./judgment.md)
- **Linked tickets:** AC-1672
- **Last updated:** 2026-07-29

**Blocks:** `../indicator-metadata-charts/` (Chunk B), `../chart-drilldown/` (Chunk C1).
**Split off:** `../geo-scope-expansion/` — see §0.

---

## 0. Scope reduction (revision 2)

**The geographic-scope card has been split into its own spec: [`../geo-scope-expansion/`](../geo-scope-expansion/proposal.md).**

Two rounds of blind dual review put the severe finding and most warnings on that one surface — it is a different animal from the four ranked cards: a chrome-less card variant, a map with per-row geocoding cost, two pre-existing truncations serving both the map and the display list, and its own data service. Continuing to patch it inside this spec was consuming the review budget without converging.

**The cut that makes the split clean:** this spec **does not touch `geo-scope-card.component.*` or its data service at all.** The geographic card keeps `GetGeoScopeService` and its server-side `limit=5` until the new spec lands. That matters because the moment this spec re-sourced the geographic card to the unbounded full payload, the map's geocoding limiter would become mandatory here — which is exactly the coupling that made the two inseparable.

Moved out, with their IDs retired in place rather than renumbered so traceability survives: **R-PDB-006**, **NFR-PDB-002**, the fifth chart title, the deletion of `GetGeoScopeService`/`GET_GeoScope`, and umbrella decision **D-1** (the geocoding limiter).

---

## 1. Executive Summary

The dashboard's four ranked charts fire **four separate requests** and show only the **top 4** of each. A server endpoint returning everything — `GET /api/v1/agresso/contracts/reports/full` — **already exists and is called by nobody**.

This spec makes the client consume it for those four charts, shows **5** rows by default, and adds a **"Show more"** control that expands each chart **in place** to its complete ranked list from memory — no dialog, no navigation, no second request.

**No server change (provisional — see GATE-1). No data model change. No new endpoint.**

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Full payload** | The response of `GET /api/v1/agresso/contracts/reports/full?contract-id=<id>` |
| **Ranked chart / card** | An `app-project-dashboard-card` rendering an ordered list of `{ id, label, count }` |
| **The four ranked cards** | Results Partners, Primary Levers, Main contact person, Contributing projects — the scope of this spec |
| **Collapsed view** | The default state of a ranked card: its first 5 items |
| **Expanded view** | After "Show more": every item, same order |
| **`visibleLimit`** | The card input carrying the whole expansion contract: a number, or `null` for "show all" |
| **Chart encoding** | The visual mapping of a value to a bar width and a bar colour |

## 3. System Context & Scope

```
GET reports/full ─→ ApiService.GET_FullContractReports
                      └→ GetFullContractReportsService (signals)
                           └→ ProjectDashboardComponent ─→ 4× ProjectDashboardCardComponent
                                                            (visibleLimit in / expandToggled out)

GET reports/geo-scope ─→ GetGeoScopeService ─→ GeoScopeCardComponent   [UNTOUCHED — see §0]
```

**In scope:** `project-dashboard.component.*`, `project-dashboard-card.component.*`, `api.service.ts`, four superseded dashboard services, two new files (interface + service), one new fixture.

**Explicitly NOT changing:**

| Not changing | Why |
| --- | --- |
| `geo-scope-card.component.*`, `geo-scope-map.component.*`, `GetGeoScopeService`, `GET_GeoScope` | Split to `../geo-scope-expansion/` (§0) |
| `project-detail.component.*` | See §12 D-AC5 — the parent's route staleness is a pre-existing, page-wide concern, filed separately. Touching only one side of it produces a **split-brain page** |
| Server (`agresso-contract.*`, `reports-full.dto.ts`) | The endpoint already returns what is needed |
| `CustomProgressBarComponent` | Rendered by 8 unrelated screens (**KZ-002**). A change here would be a platform-wide blast radius for a dashboard feature |
| `projectDashboardBarColor()` signature | Callers outside this spec keep current semantics |
| *Results by status* (`loadProjectResultsByStatus`, the `limit: 10_000` fetch) | Chunk B owns it (umbrella **D-6**) — see ASM-3 |
| The four `reports/top-*` **server** endpoints | Retained for API consumers (umbrella OQ-8) |

## 4. Stakeholders / Personas

| Persona | Interest |
| --- | --- |
| **Project lead / program staff** | Sees the full ranked list without leaving the dashboard |
| **MEL analyst** (MEL-2) | Aggregate figures that are complete, not truncated at rank 4 |
| **Front-end maintainer** | One data service instead of four; one place for Chunk B to extend |

---

## 5. Functional Requirements

### R-PDB-001 — Single-source payload for the four ranked charts

- **As a** project lead **I want** the ranked charts to load from one request **So that** the page settles faster and they are mutually consistent.

**Details:** one `GET reports/full` per contract, exposed through a signal-based service with `loading` / `loadError` / per-section accessors. Existing per-chart label formatting and sort are preserved. Errors surface the existing per-card error state with its **Try again** retry.

**Acceptance criteria:**
- [ ] AC.1 — Loading the dashboard issues **exactly one** request whose URL contains `reports/full`.
- [ ] AC.2 — **No** request is issued to `reports/top-partners`, `reports/top-primary-levers`, `reports/top-main-contact-persons` or `reports/top-contributors-contracts`.
- [ ] AC.3 — `contract-id` is URL-encoded (a code containing a space or `/` yields a valid URL).
- [ ] AC.4 — On failure every ranked card shows its error state; **Try again** re-issues the single request.
- [ ] AC.5 — Arriving at the dashboard for a different contract loads that contract's sections. **Satisfied by component recreation** — see **D-AC5**; this spec adds no route-reactivity mechanism.

#### Scenario: One request feeds the four ranked charts
- GIVEN a project with partners, levers, contacts and contributors
- WHEN the dashboard loads
- THEN one `reports/full` request is issued AND all four ranked charts render from it
- BUT it must NOT issue any `reports/top-*` request
- AND IT MUST encode `contract-id` so codes containing `/` or a space stay valid

---

### R-PDB-002 — Collapsed view shows the top 5

- **As a** project lead **I want** each ranked chart to open showing its five strongest entries **So that** the dashboard stays scannable.

**Details:** slicing moves from the server `limit` to the client. The cap is **5** (umbrella **D-3**), replacing today's `limit = 4`. Ordering is unchanged. The card's `visibleLimit` **defaults to `null` (show all)** so that adding the input cannot change any existing call site; the four ranked cards pass `5` explicitly.

**Acceptance criteria:**
- [ ] AC.1 — A ranked chart with more than 5 items renders exactly **5** collapsed.
- [ ] AC.2 — A ranked chart with 5 or fewer items renders all of them **and shows no "Show more" control**.
- [ ] AC.3 — The 5 shown are the top 5 by count, descending.
- [ ] AC.4 — A chart with 0 items keeps its existing empty state.
- [ ] AC.5 — A card rendered **without** a `visibleLimit` binding renders every item, exactly as today.

#### Scenario: Adding the input changes no existing consumer
- GIVEN the geographic card renders `app-project-dashboard-card` with no `visibleLimit` binding
- WHEN this spec's card changes are applied
- THEN those lists render exactly the same rows they render today
- BUT it must NOT cap them at 5, because nothing asked it to

---

### R-PDB-003 — In-place expansion to the full ranked list

- **As a** project lead **I want** to reveal every entry without leaving the page **So that** no result is hidden from me.

**Details:** per umbrella **D-2**, the chart grows in place; no dialog, no navigation. Two-way toggle. State is per chart and resets when the payload changes.

**Acceptance criteria:**
- [ ] AC.1 — **Show more** renders **every** item of that section, same order, ranks continuing past 5.
- [ ] AC.2 — Expanding issues **zero** network requests.
- [ ] AC.3 — The control becomes **Show less**; collapsing restores exactly the top 5.
- [ ] AC.4 — Expanding one card does not expand or collapse any other card.
- [ ] AC.5 — The route does not change; **no modal dialog opens and no navigation occurs.** *(Clarified 2026-07-29 after the DD-14 pivot: the original wording said "no dialog or **overlay**", which now reads as self-contradictory, because DD-14 mechanism (ii) deliberately renders the expanded list in a `position: absolute` in-card overlay. The intent of this criterion was always **umbrella D-2** — in-place growth instead of a modal — so what it forbids is a dialog, a route change or an element escaping the card, not CSS positioning inside it.)*
- [ ] AC.6 — Arriving at the dashboard for a **different contract** shows every card collapsed. Satisfied by component recreation (**D-AC5**), the same mechanism as R-PDB-001 AC.5.
- [ ] AC.7 — A **Try again** retry of the *same* contract **preserves** each card's expanded/collapsed state. A user who expanded a list and hit retry gets their list back, not a silently collapsed one.

#### Scenario: Expanding a long list
- GIVEN a partner chart whose payload holds 37 partners
- WHEN the user activates **Show more**
- THEN all 37 render in descending count order AND the control reads **Show less**
- BUT it must NOT issue a network request, open a modal, or navigate away
- AND IT MUST leave every other card collapsed

#### Scenario: A retry does not throw away the user's expansion

- GIVEN the user has expanded the partner chart, and a transient failure has put the cards into their error state
- WHEN the user activates **Try again** and the request succeeds for the **same** contract
- THEN the partner chart renders expanded again
- AND every other card keeps the state it had
- BUT it must NOT collapse the expanded chart, because the user did not ask it to

> **Why AC.6 was narrowed (revision 2 → 3).** AC.6 originally read "when the **payload** is replaced, every card returns to collapsed". That wording came from an implementation, not from intent: revision 2 reset expansion via `linkedSignal` sourced on the payload, which collapses on *any* payload identity change. Judgment-day round 1 already recorded this as **broader than AC.6 requires** (finding S-8), and round 3 showed the remaining in-life trigger is the per-card **Try again** — where collapsing is the wrong behaviour. AC.6 now states the contract-change intent it always had, and AC.7 makes the retry behaviour explicit and testable instead of accidental. This narrows a stated criterion, so it is recorded here rather than done silently.

---

---

### R-PDB-004 — Expansion must not alter the encoding of already-visible items

- **As a** project lead **I want** the bars I was already looking at to keep their meaning **So that** I can trust the chart.

**Details — a confirmed defect in current code.** `barColor(index)` delegates to `projectDashboardBarColor(index, total)`, which assigns the `last` colour `#112F5C` when `total >= 4 && index === total - 1` and `middle` `#345b8f` otherwise — so a window-scoped total recolours the 5th row on expand. Widths in `rows-partners` come from `partnerBarWidthPercent` → `maxCount()`, stable only while the list is sorted descending; `partnerItems()` performs **no sort** today.

**Acceptance criteria:**
- [ ] AC.1 — Every item visible before expanding keeps the **same bar colour** after expanding.
- [ ] AC.2 — Every item visible before expanding keeps the **same bar width** after expanding.
- [ ] AC.3 — Collapsing restores the collapsed-state colours and widths exactly.
- [ ] AC.4 — Bar scale is computed against a **descending-sorted** list, so an out-of-order payload cannot make a later bar exceed 100 %.

#### Scenario: The visible rows keep their encoding

- GIVEN a partner chart whose payload holds 37 partners, collapsed to its first 5 rows
- WHEN the user expands the chart to all 37 rows
- THEN each of those first 5 rows renders with the same bar colour and the same bar width it had while collapsed
- AND the 37th row is the one rendered in the `last` colour `#112F5C`
- BUT it must NOT recolour or resize any row that was already on screen
- AND IT MUST hold identically when collapsing again

> **Note for the Tester.** Do not assert an absolute colour for the 5th row. Under design decision DD-4 the ramp is computed over the **full** list, so in a 37-item section the `last` colour belongs to row 37 and the 5th row is `middle` `#345b8f` in **both** states. The requirement is *invariance between states*, not any particular colour at rank 5. Asserting `#112F5C` at rank 5 produces a test that cannot pass.

---

### R-PDB-005 — Stable item identity across the full list

- **As a** front-end maintainer **I want** every row to have a unique key **So that** the full list renders without collisions.

**Details:** `mainContactPersonItems` derives `id` from the formatted display name. Top-4 rarely collides; a full contact list can contain two people with the same display name, breaking `@for … track`. `top_main_contact_persons[].user_id` is **confirmed present** in the payload DTO.

**Acceptance criteria:**
- [ ] AC.1 — Two contacts with an identical display name both render as separate rows when expanded.
- [ ] AC.2 — No `@for` tracking collision for any of the four sections at full length.
- [ ] AC.3 — Each of the four ranked sections derives `id` from a payload identifier, not from a formatted label.

#### Scenario: Homonymous contacts
- GIVEN a payload with two distinct contacts both displaying as "MARIA GARCIA"
- WHEN the contact chart is expanded
- THEN both appear as separate rows with their own counts
- BUT it must NOT collapse them into one row or drop either

---

### ~~R-PDB-006~~ — MOVED

Geographic card expansion and map bounding moved to [`../geo-scope-expansion/`](../geo-scope-expansion/proposal.md) (§0). **ID retired, not reused.**

---

### R-PDB-007 — Chart titles match the verified field names

- **As a** MEL analyst **I want** each chart titled with the field the data comes from **So that** figures are traceable to the reporting form.

**Details:** per umbrella **D-4**, verified against the live form templates. Where the form label is a full question or sentence it cannot serve as a title, so the section/tab name is used. **All four titles in this spec live in `project-dashboard.component.html`** (lines 160/170/180/190).

| Current | New | Source of the name |
| --- | --- | --- |
| Top partner institution | **Results Partners** | `partners.component.html:6` section title (the field label is a sentence) |
| Top primary levers | **Primary Levers** | `alliance-alignment` field label |
| Top main contact person | **Main contact person** | `general-information` field label |
| Top contributing projects | **Contributing projects** | `alliance-alignment` field label |
| Results by indicator / Results by status | *unchanged* | bespoke markup, not cards; no single field |

The fifth rename ("Top geographic scope" → "Geographic Scope") is in the geographic card and **moves with it**.

**Acceptance criteria:**
- [ ] AC.1 — Each of the four renamed charts renders its new title exactly as tabled.
- [ ] AC.2 — None of those four titles begins with "Top ".
- [ ] AC.3 — *Results by indicator* and *Results by status* are unchanged.
- [ ] AC.4 — The three `<h3>` headings inside the geographic card ("Top regions", "Top countries", "Top sub-national levels") are **out of scope** and must not be renamed here. They are sub-list labels inside another card, not chart titles.

---

### R-PDB-008 — Retire the four superseded ranked-chart services

- **As a** front-end maintainer **I want** one analytics data path **So that** Chunk B extends one service.

**Details:** delete `GetTopContributorsContractsService`, `GetTopMainContactPersonsService`, `GetTopPartnersService`, `GetTopPrimaryLeversService` and the api methods `GET_TopContributorsContracts`, `GET_TopPartners`, `GET_TopMainContactPersons`, `GET_TopPrimaryLevers`, plus their specs. **`GetGeoScopeService` and `GET_GeoScope` survive** — they move with the geographic spec. **Server endpoints are untouched.**

**Acceptance criteria:**
- [ ] AC.1 — The four service files and their specs no longer exist.
- [ ] AC.2 — The four `api.service.ts` methods and their spec cases no longer exist.
- [ ] AC.3 — No remaining source file references any deleted symbol.
- [ ] AC.4 — `GetGeoScopeService` and `GET_GeoScope` still exist and the geographic card still works.
- [ ] AC.5 — The **full** client suite passes after deletion (**KZ-003**).

#### Scenario: Nothing else depended on them
- GIVEN the four services are removed
- WHEN the full client test suite runs
- THEN it passes
- BUT it must NOT leave a dangling import or a skipped spec
- AND IT MUST be a full-suite run, not a targeted one — targeted suites confirm the brief was followed, not that the blast radius is clean

---

## 6. Non-Functional Requirements

### NFR-PDB-001 — Request reduction
- **Category:** performance
- **Target:** the four `reports/top-*` requests collapse to **one** `reports/full`. That is the whole claim, and it is the only one this spec controls.
- **One consistent basis, since revision 2 mixed two.** Counting every request the dashboard's load effect fires: today **7** — four `reports/top-*`, `reports/geo-scope`, `results/count`, and the `limit: 10_000` *Results by status* fetch. After this spec: **4** (`reports/full`, `reports/geo-scope`, `results/count`, status). After A2 retires `reports/geo-scope`: 3. After Chunk B retires the status fetch (**D-6**): **2** — the umbrella's target. The umbrella's "6" excluded the status call; quoting "6 → 4" compared unlike quantities.
- Not counted on either side: `initializeProjectDashboardResultsTable` and `loadExecutiveOverviewSummary`, which the same effect also fires and which this spec does not touch.
- **How verified:** URL assertions — see §7 DC-2 for **where** they can actually be written.

### ~~NFR-PDB-002~~ — MOVED
Geocoding ceiling moved to `../geo-scope-expansion/` with umbrella **D-1**. ID retired.

### NFR-PDB-003 — Accessibility of the toggle
- **Category:** a11y (PRD **C-4**, WCAG 2.1 AA)
- **Target:** a real `button`, keyboard reachable and operable by `Enter`/`Space`, with `aria-expanded` reflecting state and an accessible name **including the chart title**, so a screen-reader user hearing four "Show more" buttons can tell them apart. With the geographic split, **every toggle in this spec is rendered by `ProjectDashboardCardComponent`** — there is exactly one implementation and one place to gate it.
- **How verified:** card-component spec assertions on role, `aria-expanded`, accessible name, keyboard activation.

### NFR-PDB-004 — Layout containment
- **Category:** ux / reliability
- **Target — revision 4 (2026-07-29), rewritten after the T-06 pivot. Two conditions, and both are now literally achievable:**
  1. **An expanded card scrolls inside itself and the page does not grow.**
  2. **An expanded card must not change the height of anything outside itself** — not its row-mate, and not the right-hand column.
- **Resolved by DD-14 (freeze the geometry):** the expanded list is bounded to the area the card **already occupies**, not to the viewport. The card's height never changes, so no growth is produced and therefore none can propagate. See `design.md` §6.3.2.

> **Why revision 3 was wrong, and it is worth stating plainly.** Revision 3 set condition 1 as a viewport-relative bound (`46vh`) and resolved condition 2 with **DD-13** — dropping the ranked grid to `align-items: start` while any card is expanded. The T-06 audit established that this cannot work: **`align-items` does not size grid tracks.** It stops a *shorter* item being stretched inside a track, but the track is still sized to its tallest item's content. So the expanded card still grew the ranked grid → the left column → the outer `lg:items-stretch` grid, and `flex-1` on *Results by status* absorbed the entire delta as a visible white void.
>
> The underlying reasoning error: revision 3 assumed **bounding** removed the outer-grid propagation, leaving DD-13 only the inner one. Bounding **caps** growth at `46vh`; it does not **zero** it. A bounded-but-taller card propagates a bounded-but-nonzero stretch through exactly the adjacency this requirement itself named. For the same reason revision 3's condition 1 — *"so the page does not grow"* — was also literally false: the page grew by `(46vh − collapsed list height)`.
>
> DD-14 removes the growth at its source rather than trying to stop it propagating, which is why both conditions become true rather than approximately true.

- **Explicit non-solution (unchanged):** a gap beside an expanded card must **not** be filled by rendering extra rows in the un-expanded card. That would contradict R-PDB-002 (collapsed = top 5) and show data the user did not request. Under DD-14 no gap arises, but the fence stands.
- **Geometry, stated correctly:** the four ranked cards sit in a nested `lg:grid-cols-2` grid (`project-dashboard.component.html:157`), itself the left column of an outer `lg:grid-cols-[3fr_1fr] lg:min-h-[520px] lg:items-stretch` grid (`:153`) whose right column holds *Results by indicator* (`shrink-0`) and *Results by status* (`flex-1`). **That `flex-1` is why the defect is visible rather than merely present** — the whole of any outward growth lands in one bordered white card. Any future change to the expanded card's height must be checked against this chain, all four links of it.
- **How verified:** structural assertion in the card spec that the bounded container exists and is conditioned on `visibleLimit() === null`; plus the human check in §7 (no automated gate evaluates rendered layout).

### NFR-PDB-005 — Test and lint floors
- **Category:** dx
- **Target:** `npm test` and `npm run lint` pass; client coverage floors held (statements 40 / branches 20 / lines 45 / functions 30). `project-dashboard-card.component.spec.ts` (114 lines today) grows to cover the expansion contract.
- **How verified:** `npm test` from `client/research-indicators/`.

---

## 7. Defect Classes And Their Gates

| # | Defect class | Caught by | Automated? |
| --- | --- | --- | --- |
| DC-1 | Mis-mapped payload section (a chart reads the wrong array) | service spec + dashboard spec against a realistic fixture | ✅ |
| DC-2 | Requests not actually eliminated | **`get-full-contract-reports.service.spec.ts` and `api.service.spec.ts`**, which use `HttpTestingController`. **Not** the dashboard spec — it provides `{ provide: ApiService, useValue: apiMock }` with no mock backend, so request/URL assertions cannot be expressed there. The dashboard spec asserts at spy level (one `main()` call per contract, zero calls to retired services) | ✅ |
| DC-3 | **Expansion asserted against a stub, so the assertion is vacuous** | `project-dashboard-card.component.spec.ts` against the **real** template | ✅ |
| DC-4 | Encoding drift on expand (colour/width) — R-PDB-004 | explicit before/after colour + width assertions in the card spec | ✅ |
| DC-5 | `@for` track collision at full length — R-PDB-005 | fixture with duplicate display names | ✅ |
| DC-6 | Structural-binding drift in the `columns` layout (grid tracks vs rendered cells) | card spec asserting track count equals rendered cells in both states | ✅ |
| DC-7 | Missing `aria-expanded`, unreachable by keyboard | card spec | ✅ |
| DC-8 | **Rendered layout breakage** — expanded card stretches a sibling or grows the page | **NOT automatable here.** Jest+jsdom computes no layout: no box model, so `overflow`, height propagation and grid stretching are invisible. A passing spec proves the container is present, never that the layout holds | ❌ |
| DC-9 | Title typo / wrong casing | exact-string assertions | ✅ |
| DC-10 | Collateral breakage from deleting shared code | **full-suite** run (**KZ-003**) | ✅ |
| DC-11 | **The host↔card seam is untested** — the card emits and the host never reacts, or vice versa | Both sides, deliberately: the **card** spec asserts `expandToggled` fires and `visibleLimit` is honoured against the real template; the **dashboard** spec asserts that receiving `expandToggled` from the stub flips the host's state and pushes a new `visibleLimit` down. Neither side alone proves the seam | ✅ |

**DC-3 is the dominant risk and it is already live in this repo.** `project-dashboard.component.spec.ts:205-226` replaces `ProjectDashboardCardComponent` with `ProjectDashboardCardStubComponent`. Everything in R-PDB-002/003/004 renders **inside** the real card, so asserting it there asserts against a stub that renders none of it — **KZ-001** (High, recurrence 4). Therefore:

| Behavior | Asserted where | Why |
| --- | --- | --- |
| Slicing, expansion, colour/width invariance, `columns` tracks, `aria-expanded`, keyboard, bounded container | `project-dashboard-card.component.spec.ts` — **real template, no stub** | The stub renders none of it |
| That the dashboard passes the right title/items/`visibleLimit` **inputs**, and reacts to `expandToggled` | `project-dashboard.component.spec.ts` — stub legitimate, but it **must gain the new inputs/outputs** or `strictTemplates` fails the build | Passing correct inputs and reacting to outputs *is* the dashboard's job |
| Rendered title text | card spec | Requires the real template |

**DC-8 has no automated gate and is not substituted by one.** Its substitute is a **named human check**, on a project with more than 5 partners:

1. Expand each of the four ranked cards in turn.
2. Confirm the **expanded card itself does not change height** — its list scrolls inside the area the card already occupied. Under **DD-14** this is the root check: if the card's height is unchanged, steps 3 and 4 follow by construction, and if it is not, they cannot be fixed downstream.
3. Confirm its **row-mate card in the nested 2-column grid** does not change height and shows **no empty gap** below its own content — the row-mate's "Show more" must stay adjacent to its list, not float below a void.
4. Confirm the **right-hand column** (*Results by indicator*, *Results by status*) does not stretch. **Watch *Results by status* specifically** — it carries `flex-1` while *Results by indicator* is `shrink-0`, so any outward growth lands entirely inside that one bordered white card as a visible void. **This is the step that failed under DD-13** and the reason the T-06 pivot happened.
5. Confirm the page does not grow — no new vertical scroll on the page itself.
6. Collapse everything and confirm the four cards are **equal height again**, exactly as before the change.

Reference: the GATE-2 mockup at `./mockup/index.html`.

> ⚠️ **The mockup carried this defect too, and that is the real lesson of the T-06 pivot.** Until 2026-07-29 its right column omitted the real DOM's `flex-1` / `shrink-0` split, so the column grew invisibly while its boxes stayed content-sized — and mode 3's banner claimed *"the right-hand column keeps its height"*, which was true of the mockup and false of the product. **The artefact used to close GATE-2, derive DD-13 and serve as this very human check's reference reproduced the blind spot it existed to catch.** A fidelity fix has been applied (`.rightcol > .sidebox:last-child{flex:1}`). Before trusting the mockup on any future layout question, verify the property under test is actually modelled in it.

Recorded as an **accepted, named blind spot** — not silently covered by `npm test`.

---

## 8. Data Requirements

**No data model changes.** No entity, column, index, migration, OpenSearch field or backfill.

## 9. API Surface Delta

**No server change — provisional, conditioned on GATE-1 (§11).** No endpoint added, modified or removed; no DTO, guard, role or Swagger change. **If GATE-1 shows the payload needs a server-side ceiling, this section and §8 must be reopened before implementation** — recorded here, and not only in `design.md`, so the two documents cannot disagree.

| Client method | Endpoint | Status |
| --- | --- | --- |
| `ApiService.GET_FullContractReports(contractId)` | `GET /api/v1/agresso/contracts/reports/full?contract-id=<encoded>` | **new client method, existing endpoint** (`agresso-contract.controller.ts:156`) |
| `GET_TopContributorsContracts`, `GET_TopPartners`, `GET_TopMainContactPersons`, `GET_TopPrimaryLevers` | — | **deleted from the client**; server routes retained |
| `GET_GeoScope` | `reports/geo-scope` | **kept** — moves with the geographic spec |

Envelope is `MainResponse<T>` — unchanged.

## 10. Cross-System Impact

| System | Impact |
| --- | --- |
| Server (`agresso-contract`) | **None** (provisional per GATE-1) |
| CLARISA / AGRESSO / TIP / ROAR / OpenSearch / DynamoDB / RabbitMQ / Socket.IO | **None** |
| Mapbox Geocoding | **None in this spec** — the geographic card is untouched and keeps its `limit=5` source |
| Other STAR screens | **None.** Per **KZ-002**, scope was enumerated by *what renders*: `ProjectDashboardCardComponent` has exactly two hosts, `project-dashboard.component.html` and `geo-scope-card.component.html`. This spec modifies the card but keeps its public contract **backward-compatible** (`visibleLimit` defaults to `null` = today's behaviour), so the second host is unaffected — that is the mechanism, not an assumption. `CustomProgressBarComponent` **is** shared with 8 screens and is fenced out (§3) |

## 11. Assumptions, Dependencies, Risks

| ID | Assumption |
| --- | --- |
| ASM-1 | `reports/full` returns each section pre-sorted descending by count. **If false, R-PDB-004 AC.4 fails** — hence the explicit client-side sort rather than trusting order. |
| ASM-2 | `top_main_contact_persons` carries `user_id`. **Confirmed** in `reports-main-contact-persons.dto.ts`; no composite-key fallback needed. |
| ASM-3 | *Results by status* keeps its `limit: 10_000` request (Chunk B) and the geographic card keeps `reports/geo-scope` (geographic spec). On the single basis fixed in NFR-PDB-001, this spec takes the dashboard's load effect from **7 requests to 4** — not to 2. Stated so the outcome is not overclaimed. |
| ASM-4 | No consumer outside `project-detail` injects the four deleted services (verified by grep; re-confirm before deletion — AC.3). |

| ID | Risk | Mitigation |
| --- | --- | --- |
| ~~RSK-1~~ | ~~**Unbounded payload** (umbrella R-1)~~ — **CLOSED by measurement 2026-07-29.** GATE-1 measured the real cardinalities across the top 25 contracts by result count: worst case **137** partners, 15 contributors, ≤ 35 contacts, ≤ 8 levers → a **~36 KB** body (~7 KB gzipped), of which this spec's four sections are ~31 KB. The risk was written against "hundreds of rows"; the reality is a 137-row worst case. | No server ceiling needed. `design.md` §13.1 records the method, the per-section figures and which two are upper bounds. NFR-PDB-004's bounded scroll container remains, now as ordinary hygiene rather than mitigation. |
| RSK-2 | The card supports 5 `layout()` branches; only `rows-partners` and `rows-stacked-lever` are live, and `columns` is the input's **default** value. A toggle wired per-branch would need five implementations. | The toggle lives in the card **shell**, layout-agnostic. Separately, the `columns` branch's count-derived **structural** bindings must switch to the visible list — DC-6. |
| RSK-3 | Deleting four services and rewiring one component in one pass makes a bisect harder. | Task order: add the new path and switch consumers first, delete last. |
| RSK-4 | **DC-8** — no automated gate for rendered layout. | Named human check (§7); accepted blind spot. |

### Gates before implementation

| ID | Gate | Status | Outcome |
| --- | --- | --- | --- |
| **GATE-1** | Measure the `reports/full` response size against the largest real contracts | ✅ **CLOSED — measured 2026-07-29** | Umbrella R-1 / proposal A-9 required this before design close. Done against the local backend's database over the top 25 contracts by result count: worst case ≈ **36 KB uncompressed / 7 KB gzipped**, driven by a **137-row** partner list. **No server ceiling needed — the §9 fence is valid.** Method and per-section figures in `design.md` §13.1. |
| **GATE-2** | Collapsed + expanded mockup at `./mockup/` | ⛔ **OPEN** | Umbrella and proposal §8 marked it *needed*. It is the concrete input for the bounded-height decision (OQ-3) and the DC-8 human check, and it is the layout contract Chunk B inherits. Now informed by GATE-1's real counts: the expanded worst case is ~137 rows, not hundreds. |

**Dependency:** none. **Blocks:** Chunk B, Chunk C1. **Split off:** the geographic spec.

## 12. Open Questions & Closed Decisions

| ID | Question | Owner | Default | Due |
| --- | --- | --- | --- | --- |
| OQ-2 | Add rank badges to `rows-partners` when expanded? | d.casanas | **No** — see `design.md` §12.1 for why the toggle already provides the cue it would give | before implementation |
| OQ-3 | Bound height: fixed or viewport-relative? | design | **Viewport-relative** | GATE-2 |

**D-AC5 — how R-PDB-001 AC.5 is satisfied (closed).** `contractId` reads a **non-reactive** route `snapshot`, and no one subscribes to `paramMap`, so an in-place `:id` change would not re-fire the load. Revision 1 tried to fix this by making the dashboard's `contractId` reactive; two independent judges confirmed that **makes things worse**: `ProjectDetailComponent` seeds its own id from `snapshot.params['id']` inside `ngOnInit`, which does not re-run, so the page would show one contract's header beside another's charts — and `removeGroundingDocumentAsync` would call `deleteDocumentOverviewFiles` with the **new** contract id and the **old** filename.

**Resolution: AC.5 is satisfied by component recreation, and that is a structural property, not an assumption.** `app.routes.ts:184-206` gives `project-detail/:id` **no default child route**, so every id-changing navigation in the codebase — `result-sidebar.component.ts:472`, `section-header.component.ts:245`, `result-exists.resolver.ts:105`, `results-center-table.component.ts:467` / `.html:183`, `select-linked-results-modal.component.ts:184`, `create-oicr-form.component.ts:508-512` — targets `/project-detail/<id>` with **no child segment**, emptying the outlet and destroying `ProjectDashboardComponent`. The only link carrying the `project-dashboard` segment originates from My Projects, where the dashboard is not mounted. Verified independently by both round-3 judges across all call sites. This spec therefore adds **no** route-reactivity mechanism.

**Correction to an earlier claim in this section.** Revision 2 described today's behaviour as "uniformly stale and self-consistent". **That is wrong, and the truth is worse.** Navigating from `/project-detail/A/project-dashboard` to `/project-detail/B` reuses `ProjectDetailComponent` (its `ngOnInit` does not re-run, so the header, `contractStaff.main()` and `bilateralService.getContract()` stay on **A**) while destroying the dashboard — which, when the user clicks the Project Dashboard tab, is recreated reading the parent's **already-updated** snapshot → **B**. So the split-brain page attributed to DD-10 **already exists in production today**: A's header and staff beside B's analytics. The revert decision is unaffected and AC.5 holds for this spec's own sections, but the separately-filed `project-detail.component.ts` defect is **reachable now, not latent** — and the follow-up ticket must say so.

**Closed by the umbrella, not reopened:** modal-vs-in-place (D-2), top-N = 5 (D-3), titles (D-4). OQ-1 and umbrella D-1 moved to the geographic spec. OQ-4 closed: `user_id` confirmed present.

## 13. Requirement ID Index

| ID | Title | Type | Verified by |
| --- | --- | --- | --- |
| R-PDB-001 | Single-source payload for the four ranked charts | Functional | DC-1, DC-2 |
| R-PDB-002 | Collapsed view shows the top 5 | Functional | DC-3 |
| R-PDB-003 | In-place expansion to the full ranked list | Functional | DC-3, DC-11 |
| R-PDB-004 | Expansion must not alter existing encoding | Functional | DC-4 |
| R-PDB-005 | Stable item identity across the full list | Functional | DC-5 |
| ~~R-PDB-006~~ | *moved to `../geo-scope-expansion/`* | — | — |
| R-PDB-007 | Chart titles match verified field names | Functional | DC-9 |
| R-PDB-008 | Retire the four superseded services | Functional | DC-10 |
| NFR-PDB-001 | Request reduction | Performance | DC-2 |
| ~~NFR-PDB-002~~ | *moved to `../geo-scope-expansion/`* | — | — |
| NFR-PDB-003 | Toggle accessibility | A11y | DC-7 |
| NFR-PDB-004 | Layout containment | UX | **DC-8 — human check** |
| NFR-PDB-005 | Test and lint floors | DX | DC-10 |

## 14. Sign-off

- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name>. **Four visible changes** need acknowledgement: 4 → 5 rows (R-PDB-002) · four renamed titles (R-PDB-007) · the collapsed-view colour consequence of DD-4 · the new "Show more" control itself.
- [ ] Security review — **not required** (no auth, secrets, roles or PII touched)
- [ ] DevOps — **not required** (no infra, env var or deployment change)
