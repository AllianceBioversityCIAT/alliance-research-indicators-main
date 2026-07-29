# Proposal — Project Dashboard Analytics Expansion (umbrella)

> **Umbrella proposal.** The request bundles five independent workstreams over the *Result analytics* section of the Project Detail dashboard. This document decomposes it into **4 bounded changes** (one of them phased), prioritizes them, and records the cross-chunk dependencies. Each chunk gets its own `proposal.md` + `/akili-specify` cycle once the decomposition is approved.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/analytics-expansion/` |
| Slug | `analytics-expansion` — derived from the free-text argument ("varios ajustes para el dashboard de los proyectos"); parented under the `project-dashboard` client-feature module per root guide §2 |
| Type | **Change** (feature/enhancement — no defect reported) |
| Approval Mode | `gated` — no end-to-end mandate was given |
| Created | 2026-07-29 |
| Requester | d.casanas@cgiar.org |
| Source | Free-text intent (Spanish) + a Jira-style Summary/Acceptance-Criteria block pasted by the requester + screenshot of the current dashboard |
| Surfaces | Client `client/research-indicators` (primary) + Server `server/researchindicators` (payload extension) |
| Kaizen | `docs/specs/kaizen-log.md` does not exist yet — no Active Lessons to apply |
| Umbrella | Yes — decomposes into 4 child specs (§7) |
| Status | **Decisions D-1…D-7 recorded (2026-07-29)** — all blocking open questions closed; awaiting approval of the decomposition |

---

## 2. Intent

Turn the Project Detail *Result analytics* section from a set of read-only **top-N** cards into a **complete, drillable analytics surface**: one server call carries every aggregation, each chart can reveal its full ranked list on demand, indicator-specific metadata gets its own charts, chart labels match the exact form field they come from, chart items link into the filtered Project Results table, and the map runs on Leaflet instead of Mapbox GL.

## 3. Problem / Current Behavior

Verified against the code, not the ticket:

| # | Current behavior | Where |
| --- | --- | --- |
| P-1 | The dashboard fires **6 separate requests** on load — 4 `reports/top-*` + `reports/geo-scope` + `agresso/contracts/:id/results/count` — each capped at **N = 4** for the four top-cards (`PROJECT_DASHBOARD_DEFAULT_LIMIT` is 5, but the component passes `4`) and **5** for geo-scope. | `project-dashboard.component.ts:210-214`, `api.service.ts:867-895` |
| P-2 | `GET /api/v1/agresso/contracts/reports/full` **already exists on the server** and already returns every section unbounded (levers, contributors, main contacts, staff, partners, geo scope). **No client code calls it** — there is no `GET_FullContractReports` in `api.service.ts`. The work the requester describes as "done on the server" is real but unconsumed. | `agresso-contract.controller.ts:155-175`, `agresso-contract.repository.ts:1167-1203` |
| P-3 | There is **no way to see beyond the top 4** in any chart. Data past rank 4 is fetched by nobody and shown nowhere. | `project-dashboard.component.html:157-198` |
| P-4 | *Results by status* is computed **client-side by downloading up to 10 000 results** (`GET_Results` with `limit: 10_000`) and counting them in the browser. | `project-dashboard.component.ts:459-476` |
| P-5 | **No indicator-specific charts exist.** All the required source columns are already persisted — `result_innovation_dev.innovation_nature_id / innovation_type_id / innovation_readiness_id`, `result_oicr.maturity_level_id`, `result_policy_change.policy_type_id / policy_stage_id`, `result_capacity_sharing.session_format_id / session_type_id / session_length_id / degree_id / gender_id / session_participants_male|female|non_binary`. Nothing aggregates them per contract. | server entity tree |
| P-6 | Chart titles are editorial ("Top partner institution", "Top main contact person"), not the field names used in the reporting forms. | `project-dashboard.component.html` |
| P-7 | Chart rows are **inert** — no click target, no route, no filter hand-off. | same |
| P-8 | The geographic-scope map renders with **`mapbox-gl` ^3.25.0** and resolves centroids through the **Mapbox Geocoding API** (`environment.mapboxAccessToken`, `mapboxGeocodingUrl`). | `geo-scope-map.component.ts:15`, `mapbox-geocoding.service.ts` |
| P-9 | `ResultFilter` supports **only** `indicator-codes`, `lever-codes`, `status-codes`, `contract-codes`, `platform-code`, `result-codes`, `years`, `create-user-codes`. There is **no** partner-institution, contact-person, contributing-project, geography, or indicator-metadata filter. | `result.interface.ts:50-61` |

## 4. Proposed Outcome

After all chunks land:

- The dashboard loads its analytics from **one** call (`reports/full`) plus the results-count call; the 10 000-row status fetch is gone (D-6).
- Every ranked chart shows its top **5** by default and a **"Show more"** control that **expands the chart in place** to the complete ranked list — served from memory, zero extra requests, same page (D-2, D-3).
- New charts exist for Innovation Development (Nature, Type, Current Readiness), OICR (Maturity Level), Policy Change (Policy Type, Stage of the Policy Process) and Capacity Sharing (Training or engagement to report, Gender across individual + group, Training vs Engagement, Degree for long-term training only).
- Chart titles match the exact reporting-form field labels.
- Clicking a chart item navigates to the project's Results table with the matching filter pre-applied.
- The map renders through **Leaflet**, dropping ~800 kB of `mapbox-gl` from the initial bundle.

## 5. Scope (umbrella)

In scope across the four chunks: the `Result analytics` block of `project-dashboard.component.*`, its child components (`project-dashboard-card`, `geo-scope-card`, `geo-scope-map`), the five `Get*` dashboard services + their `api.service` methods, `ResultFilter` / results-center filter plumbing for the drill-down, and the `agresso-contract` reports layer on the server (`controller` → `service` → `repository` → `dto`).

## 6. Non-Goals

- Redesigning the *Grounding & Setup* / *Executive Overview* AI blocks.
- Changing the *Pending revision* embedded table's own default filter.
- Backfilling indicator metadata for TIP / PRMS / AICCRA imported results (the dashboard already carries a banner about this — new charts will legitimately read low for external-heavy projects).
- Removing the six existing `reports/top-*` server endpoints (they stay for API consumers; only the *client* stops calling them).
- Any new CLARISA vocabulary — all new charts group by existing lookup tables.
- Cross-project (portfolio-level) analytics.

---

## 7. Decomposition — 4 bounded changes

All child proposals are written (2026-07-29). **Chunk A was split into A and A2 on 2026-07-29** after two rounds of blind dual review put the severe finding and most warnings on the geographic card — see [`../full-payload-show-more/judgment.md`](../full-payload-show-more/judgment.md) §10. The cut is structural: A's card change is purely additive (`visibleLimit` defaults to `null` = today's behaviour), so the geographic card renders unchanged until A2 lands.

| # | Chunk | Proposal | Depends on | Parallel-safe | MoSCoW | RICE |
| --- | --- | --- | --- | --- | --- | --- |
| **A** | Full-payload migration + Show-more + title alignment — **four ranked cards only** | [`../full-payload-show-more/proposal.md`](../full-payload-show-more/proposal.md) | none | no | **Must** | **36** |
| **A2** | Geographic scope card — full payload, geocoding bounding (**D-1**), expansion | [`../geo-scope-expansion/proposal.md`](../geo-scope-expansion/proposal.md) | A | no (conflicts with D) | **Must** | **20** |
| **B** | Indicator-metadata charts + server status aggregation | [`../indicator-metadata-charts/proposal.md`](../indicator-metadata-charts/proposal.md) | A | no vs A/C · **yes vs D** | **Must** | **16** |
| **C1** | Chart drill-down — indicator / status / lever | [`../chart-drilldown/proposal.md`](../chart-drilldown/proposal.md) | A (schedule after B) | no | **Should** | **30** |
| **C2** | Results filter expansion — new drill-down dimensions | [`../results-filter-expansion/proposal.md`](../results-filter-expansion/proposal.md) | C1 | no | **Could** | **8** |
| **D** | Leaflet map migration | [`../leaflet-map-migration/proposal.md`](../leaflet-map-migration/proposal.md) | none | **yes** | **Should** | **17** |

> RICE = (Reach × Impact × Confidence) / Effort, Reach = 100 % of Project-Detail users in every row. Effort in dev-days: A 5 · B 10 · C1 4 · C2 12 · D 4.
>
> **Recommended build order: A → A2 → (B ∥ D) → C1 → C2.** A2 must precede D: A2 changes only what is *passed to* the map, D changes only how the map *renders*, so running A2 first gives D a stable, already-bounded input contract to port against. Umbrella **D-1** (the geocoding limiter) moved from A to A2, because the limiter becomes mandatory only at the moment the geographic card is re-sourced to the unbounded payload — which is A2's job, not A's.
>
> Original rationale, unchanged: **A → (B ∥ D) → C1 → C2.** RICE ranks C1 above B, but B is the ticket's headline business ask and B's new cards are what C1 would eventually have to make clickable — building C1 first means touching the same template twice. A second reason surfaced while writing the children (**C1-R3**): *Results by status* changes data source in B per D-6, so running C1 first would mean writing its status click handler twice. D is the only chunk with **no file overlap** with the others (`geo-scope-map.component.*`, `country-centroids.constants.ts`, `package.json`), so it can run in a parallel worktree alongside B — a property that **D-1's placement of the geocoding limiter in `GeoScopeCardComponent` exists to protect**.

### Chunk A — Full-payload migration + Show-more + title alignment

| | |
| --- | --- |
> **Updated 2026-07-29 for the A/A2 split.** The geographic card, `GetGeoScopeService`, the `mapCountries` limiter and umbrella **D-1** all moved to **A2**. Chunk A covers the **four ranked cards only**.

| | |
| --- | --- |
| Delivers | P-1, P-2, P-3, P-6 — **for the four ranked cards** (Results Partners, Primary Levers, Main contact person, Contributing projects) |
| Server | None required — `reports/full` already ships, and **GATE-1 measured its size as ~36 KB worst case**, so no ceiling is needed. |
| Client | New `ContractFullReports` interface + `GET_FullContractReports` in `api.service.ts`; one `GetFullContractReportsService` replacing `GetTopContributorsContractsService`, `GetTopMainContactPersonsService`, `GetTopPartnersService`, `GetTopPrimaryLeversService`; top-5 sliced client-side (D-3); `project-dashboard-card` becomes **presentational** — `visibleLimit` input (default `null`) + `expandToggled` output — with expansion state held by the host (**DD-1r**, which reversed the original internal-signal design); titles renamed per D-4. |
| Retires | **4** client services + **4** `GET_Top*` api methods + their specs (server endpoints untouched). **`GetGeoScopeService` and `GET_GeoScope` survive — they retire in A2.** |
| Key risk | **Resolved.** `reports/full` was feared unbounded; GATE-1 measured the real worst case at **137** partner rows / ~36 KB across the top 25 contracts, so no ceiling is warranted. The geocoding fan-out is **A2's** risk, settled there by **D-1**. |
| Judgment | Three rounds of blind dual review — [`../full-payload-show-more/judgment.md`](../full-payload-show-more/judgment.md) |

### Chunk B — Indicator-metadata charts

Server aggregations to add to `ContractFullReportsDto`, all scoped to results whose **primary contract** is `contract-id` (same join the existing top-N reports use). Field mapping is **verified against the reporting forms**, not guessed:

| AC chart | Source column | Lookup table | Form label (verified) |
| --- | --- | --- | --- |
| Innovation Nature | `result_innovation_dev.innovation_nature_id` | `innovation_natures` | Innovation Nature |
| Innovation Type | `result_innovation_dev.innovation_type_id` | `innovation_types` | Innovation Type |
| Current Readiness | `result_innovation_dev.innovation_readiness_id` | readiness levels | Current Readiness |
| OICR Maturity | `result_oicr.maturity_level_id` | `maturity_level` | Maturity Level |
| Policy Type | `result_policy_change.policy_type_id` | `policy_types` | Policy Type |
| Stage of the Policy Process | `result_policy_change.policy_stage_id` | `policy_stages` | — |
| Training or engagement to report | `result_capacity_sharing.session_format_id` | `session_formats` | "Training or engagement to report" → Individual / Group Training (`session_format_id = 1` is Individual) |
| Gender (combined) | Individual: `gender_id` → `genders`. Group: `session_participants_male` + `_female` + `_non_binary` summed. | — | totals across both formats |
| Training vs Engagement | `result_capacity_sharing.session_type_id` | `session_types` | "Is this a training or a engagement?" |
| Degree (long-term training) | `result_capacity_sharing.degree_id`, filtered to `session_type_id` = Training **and** `session_length_id = 2` (Long-term) | `degrees` | "Degree" — the form itself only shows this when long-term is selected (`isLongTermSelected`) |

Plus, per **D-6**, a `results_by_status` aggregation (`result_status_id`, `name`, `count`) replacing the client-side 10 000-row fetch (P-4).

Client: new cards reusing `project-dashboard-card`, each inheriting Chunk A's in-place expansion, each hidden when the project has zero results for the owning indicator (D-7); `loadProjectResultsByStatus` and `buildStatusChartItems` deleted in favour of the server aggregation.

### Chunk C1 — Chart drill-down (supported filters only)

Clicking an item in *Results by indicator*, *Results by status* or *Top primary levers* routes to `/project-detail/:id` (the Project Results tab — the default child route) with `indicator-codes`, `status-codes` or `lever-codes` applied. This covers **exactly the three examples the ticket names** and needs no backend work. Requires a `ResultsCenterService` entry point analogous to `initializeProjectDashboardResultsTable` that seeds an arbitrary filter, plus visible/removable filter chips so the user understands why the table is filtered.

### Chunk C2 — New filter dimensions (deferred)

Partner institution, main contact person, contributing project, geography, and every Chunk-B metadata dimension have **no filter today** (P-9). Each needs a new query param on `GET /api/v1/results`, repository join, `ResultFilter` field, and results-center filter UI. This is a results-center change wearing a dashboard hat — it belongs in its own spec, after C1 proves the drill-down UX.

### Chunk D — Leaflet map migration

Swap `mapbox-gl` for `leaflet` in `geo-scope-map.component.ts` (map init, `GeoJSONSource`, `LngLatBounds`, `Popup`, circle layer → `L.circleMarker`/`L.geoJSON`). Bundle win: ~800 kB → ~42 kB, easing the `angular.json` initial budget (C-5). **Leaflet ships no tiles** — a provider decision is required (OQ-4). Whether the Mapbox *Geocoding* dependency also goes is a separate question from the *rendering* library.

---

## 8. Affected Users, Systems, And Specs

| Area | Detail |
| --- | --- |
| Users | Project leads / program staff viewing `platform/project-detail/:id/project-dashboard` |
| Client files | `project-dashboard.component.{ts,html,spec.ts}`, `project-dashboard-card.component.*`, `geo-scope-card.component.*`, `geo-scope-map.component.*`, `api.service.ts`, `shared/services/get-top-*.service.ts`, `get-geo-scope.service.ts`, `mapbox-geocoding.service.ts`, `shared/interfaces/project-dashboard.interface.ts`, `result.interface.ts`, `results-center.service.ts`, `package.json`, `angular.json` budgets |
| Server files | `agresso-contract.{controller,service}.ts`, `agresso-contract.repository.ts`, `dto/reports-full.dto.ts` (+ new per-indicator DTOs), sibling specs |
| Constitutional docs | `docs/ux-ui/design.md` — screen inventory + decisions log (map library swap, new chart inventory); `docs/trd/trd.md` — API contract for the extended `reports/full` |
| Related specs | None active. `docs/specs/archive/` holds only bilateral-module work. No prior project-dashboard spec exists — this is the first. |

## 9. Visual Reference

- **Source:** Screenshot of the current dashboard supplied by the requester (current state, not a target design).
- **Location:** conversation attachment only — no design file persisted under this spec.
- **Notes:** Covers the current *Result analytics* grid: Top partner institution, Top primary levers, Results by indicator, Top main contact person, Top contributing projects, Top geographic scope, Results by status. **There is no visual design for the new elements** — the expanded-card state, the ~10 new chart cards, the drill-down affordance, and the Leaflet map all lack a mockup.
- **Now upgraded from "recommended" to "needed":** D-2 chose in-place expansion over a modal, which makes layout the central design problem rather than a contained one. A modal would have been visually self-contained; an expanding card has to grow inside a `lg:grid-cols-2` / `lg:items-stretch` grid without disturbing its siblings, and there will be ~17 such cards. Recommend generating a mockup with `stitch-design` (or a self-contained HTML sketch under `docs/specs/project-dashboard/<chunk>/mockup/`) covering **collapsed and expanded states** during Chunk A specification, before Chunk B multiplies the card count.

## 10. Requirement Delta Preview

### ADDED

- `GET /api/v1/agresso/contracts/reports/full` becomes the dashboard's single analytics source (endpoint exists; **client consumption is new**).
- `reports/full` gains per-indicator aggregation sections (Innovation Development, OICR, Policy Change, Capacity Sharing) — Chunk B.
- `reports/full` gains a `results_by_status` aggregation (`{ result_status_id, name, count }`), replacing the client-side 10 000-row count — Chunk B, per D-6.
- "Show more" / "Show less" affordance on every ranked chart, expanding it **in place** to the complete ranked list from already-loaded state (D-2).
- A `mapCountries` limiter on `GeoScopeCardComponent` bounding geocoding to top-5 countries × top-3 sub-nationals (D-1).
- ~10 new chart cards on the dashboard.
- Click-to-filter navigation from chart item → Project Results table.
- Chunk C2 only: new `ResultFilter` dimensions + matching `GET /api/v1/results` query params.

### MODIFIED

- Dashboard load path: 6 requests → 2 (`reports/full` + `results/count`) — **reached across A + A2 + B, not by A alone**: A collapses the four `reports/top-*` calls, A2 retires `reports/geo-scope`, B retires the `limit: 10_000` status fetch.
- Top-N is applied **client-side** from the full payload instead of server-side via `limit`, and the cap goes from **4 → 5** (D-3).
- Chart titles renamed per the verified D-4 table.
- Geographic scope map: `mapbox-gl` → `leaflet`, rendering Mapbox raster tiles with the existing token (D-5).
- `angular.json` bundle budgets — expected to improve.

### REMOVED

- Client services `GetTopContributorsContractsService`, `GetTopMainContactPersonsService`, `GetTopPartnersService`, `GetTopPrimaryLeversService`, `GetGeoScopeService` and api methods `GET_TopContributorsContracts`, `GET_TopPartners`, `GET_TopMainContactPersons`, `GET_TopPrimaryLevers`, `GET_GeoScope` (dashboard call sites only — **server endpoints are retained**).
- The `limit: 10_000` results fetch for the status chart, plus `loadProjectResultsByStatus` and `buildStatusChartItems` (D-6).
- `mapbox-gl` from `package.json` (D-5). `MapboxGeocodingService` and `mapboxGeocodingUrl` **stay**.

---

## 11. Approach Options

| | **Option 1 — One big spec** | **Option 2 — 4 bounded chunks (recommended)** | **Option 3 — Ticket order, verbatim** |
| --- | --- | --- | --- |
| Shape | Single `requirements/design/tasks` covering all five workstreams | A → (B ∥ D) → C1 → C2, one spec each | Charts first, then titles, then Show-more, then interactivity, then map |
| Reviewability | Poor — a ~35-day spec, gates lose meaning | Each chunk is independently reviewable, testable, shippable | Medium |
| Rework risk | High — the payload contract, the Show-more component and the drill-down all get designed before any of them is validated | Low — A fixes the payload contract once; B and C1 build on a proven base | **High** — building charts before the payload/Show-more pattern exists means every new card is retrofitted twice |
| Parallelism | None | D runs in a parallel worktree; C2 can be scheduled independently | None |
| First value | Day ~35 | Day ~5 (A ships alone: the four `reports/top-*` calls collapse to one, full ranked data reachable, titles fixed. **6 → 2 arrives after A2 and B**) | Day ~10 |

**Recommended: Option 2.** It is the smallest safe path because Chunk A alone establishes the two contracts every other chunk consumes — the full-payload shape and the Show-more component — and it is shippable on its own. Chunk D is genuinely orthogonal and gets a free parallel slot. Chunk C2 is honestly separated as a **results-center** change so its true cost is not hidden inside a dashboard ticket.

## 12. Risks, Dependencies, And Open Questions

### Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| **R-1** | **Unbounded payload.** `reports/full` has no cap. A project with 521 results can carry hundreds of partners/contacts plus every country with nested sub-nationals — and Chunk B adds ~10 more arrays. Slow first paint, large memory footprint. **Still open — D-1 bounds geocoding, not payload size.** | Measure `reports/full` against the largest real contract before Chunk A design closes. If it exceeds a size budget, add a server-side hard ceiling (e.g. 200 rows/section) with a `truncated` flag the expanded card surfaces — never silently drop rows (the AC requires "no results are omitted"). Note D-2 makes this more acute than the modal would have: the expanded list renders inside the dashboard's change-detection tree, so 200+ rows × 10 cards is a real render cost, mitigated by the internal scroll of SC-2b. |
| **R-2** | **Geocoding fan-out.** `geo-scope-map` resolves centroids via the Mapbox Geocoding API from the country/sub-national list, today capped at 5 by the server `limit`. Feeding it the *full* list could fire hundreds of geocoding calls per dashboard load — cost and rate limits. | **RESOLVED — see D-1.** Client-side limiter: the map receives a top-5 sub-list; the full list is used only in the Show-more table. |
| **R-3** | **Empty new charts on external results.** TIP/PRMS/AICCRA imports lack this metadata (the existing dashboard banner already admits it). Ten new mostly-empty cards on an import-heavy project reads as a bug. | Hide each chart when its owning indicator has zero results on the project (**D-7**); keep the banner; state the expected read explicitly in Chunk B's requirements. |
| **R-4** | **Grid overload.** Going from 7 to ~17 cards on one page without a layout design will produce an unusable wall of charts — compounded by D-2, since any of those 17 cards can now grow. | Generate a mockup before Chunk B implementation; consider grouping new cards under per-indicator collapsible sections. D-7 removes the cards that would be empty. |
| **R-5** | **Visible change in top-N.** Resolved as a deliberate change by **D-3**: 4 → 5 rows per card. | Regression test pinning 5 in Chunk A. |
| **R-6** | ~~Leaflet tile licensing / attribution.~~ **Closed by D-5** — Mapbox raster tiles behind Leaflet, existing token, no OSM usage policy in play. Mapbox attribution must still render on the Leaflet map. | — |
| **R-7** | **Drill-down UX trap.** Applying a filter the results-center toolbar cannot display or clear leaves users stuck with no way back. | Chunk C1 must render a removable filter chip for every programmatically applied filter — a hard acceptance criterion. |
| **R-8** | **Server coverage floor.** New repository aggregations must keep the 60 % Jest threshold; the repository is already 1 200+ lines. | Sibling specs per new aggregation in Chunk B tasks. |

### Decisions

#### D-1 — Geocoding limiter lives in the client, before the resolution plan (2026-07-29, requester)

Since `reports/full` returns every country unbounded, the client caps the list **before** any geocoding work happens. Recorded because it constrains Chunk A's design and pre-empts a Chunk D collision.

**Two dimensions must be capped, not one.** `buildGeoScopeResolutionPlan` walks countries *and* their nested `top_sub_nationals`, queueing a geocode task for **every** sub-national (sub-nationals never hit the static centroid table, so each one is always a network call). Capping only countries still allows 5 countries × N sub-nationals:

| Dimension | Cap | Rationale |
| --- | --- | --- |
| Countries passed to the map | **top 5 by count** | The requester's decision; matches the current server-side `limit = 5` (`PROJECT_DASHBOARD_DEFAULT_LIMIT`), so the map keeps rendering exactly what it renders today. |
| Sub-nationals per country | **top 3 by count** | `GeoScopeCardComponent.topCountries` already slices sub-nationals to 3 for its own list (`geo-scope-card.component.ts`) — the map is the only consumer receiving the raw array. Aligning at 3 makes the map agree with the list beside it and bounds geocoding at **≤ 20 calls** (5 countries, of which those with a static centroid cost 0, + 15 sub-nationals). |

**Placement: `GeoScopeCardComponent`, as a new `mapCountries` computed feeding `[countries]`** — currently `[countries]="service.topCountries()"` (`geo-scope-card.component.html:7`). Not inside `GeoScopeMapComponent`, for three reasons:

1. The card already owns every display-slicing decision; the map stays a presenter driven by its input.
2. A pure `computed` is unit-testable without instantiating a map or stubbing Mapbox/Leaflet.
3. **Chunk D rewrites `geo-scope-map.component.ts` wholesale.** Keeping the limiter out of that file means Chunk A and Chunk D never touch the same lines — which is what preserves D's `Parallel-safe: yes` status in §7.

Consequence for Chunk A requirements: expanding the geographic-scope card (D-2) reveals the complete country/sub-national **list** from the in-memory payload with **zero** geocoding. The **map keeps its top-5 / top-3 sub-list even while the card is expanded** — expansion grows the list beside the map, it does not re-plot the map. This is the one place where "Show more" deliberately does *not* expand every element of the card, and it must be stated as an explicit acceptance criterion so it is not read as a bug.

#### D-2 — "Show more" expands the chart in place (2026-07-29, requester)

Resolves OQ-2 **in favour of the ticket wording**, overriding the modal-with-table option: the chart itself expands to show all rows; the user stays on the dashboard; no dialog is opened. Implementation is an `expanded` signal internal to `ProjectDashboardCardComponent` toggling between the sliced and full item lists — no new component, no PrimeNG dialog.

Design constraints that follow, to be locked in Chunk A's design (they are the reason the modal was originally floated):

- **The expanded list must scroll inside the card** (`max-height` + `overflow-y: auto`), not push the dashboard grid. A project with hundreds of partners would otherwise produce a page metres long and shove *Results by indicator*, *Results by status* and the *Pending revision* table off-screen.
- The card's grid cell must not resize its siblings when expanded — the existing `lg:items-stretch` rows mean an unconstrained expansion would stretch the neighbouring card too.
- The toggle is a two-way control: **"Show more" / "Show less"**, with `aria-expanded` on the button and an accessible name that includes the chart title (C-4 / WCAG 2.1 AA).
- Expansion state is per-card and resets on contract change.

#### D-3 — Top-N default is 5 (2026-07-29, requester)

Resolves OQ-1. Slicing moves client-side and the cap becomes **5** for all four ranked cards, matching the ticket and the existing `PROJECT_DASHBOARD_DEFAULT_LIMIT = 5`. Note this is a **deliberate visible change**: the dashboard currently passes `limit = 4` (`project-dashboard.component.ts:210-213`), so users will see one extra row per card. Chunk A carries a regression test pinning the value.

#### D-4 — Chart titles: verbatim field label where it is a noun phrase (2026-07-29, requester)

Resolves OQ-3, using the derivation rule as proposed. **Verified against the actual form templates, not assumed.** The rule: use the form field's label verbatim when it is a noun phrase; when the label is a full question or sentence it cannot serve as a chart title, so use the section/tab name (recorded below with its source).

| Current title | Verified form label | New chart title | Source |
| --- | --- | --- | --- |
| Top partner institution | *"Partner(s) that made a significant contribution to the achievement of the result that is being submitted"* — a sentence | **Results Partners** (section title) | `partners.component.html:6,29` |
| Top primary levers | "Primary Levers" | **Primary Levers** | `alliance-alignment` |
| Top main contact person | "Main contact person" | **Main contact person** | `general-information` |
| Top contributing projects | "Contributing projects" | **Contributing projects** | `alliance-alignment` |
| Top geographic scope | *"What is the main geographic focus of the Impact?"* — a question | **Geographic Scope** (tab name) | `geographic-scope` |
| Results by indicator | no single field — derived from indicator counts | **Results by indicator** (unchanged) | — |
| Results by status | no field — workflow status | **Results by status** (unchanged) | — |

Titles for the Chunk B charts, same rule — **three diverge from the ticket's wording and the ticket is wrong**:

| Ticket name | Verified form label | New chart title |
| --- | --- | --- |
| Innovation Nature | "Innovation nature" | **Innovation nature** |
| Innovation Type | "Innovation type" | **Innovation type** |
| Current Readiness | *"How would you assess the current readiness of this innovation?"* — a question | **Current readiness** (ticket's short name) |
| OICR Maturity | "Maturity of change reported" | **Maturity of change reported** ⚠️ |
| Policy Type | "Policy Type" | **Policy Type** |
| Stage Policy Process | "Stage in Policy Process" | **Stage in Policy Process** ⚠️ |
| Training or Engagement to Report | "Training or engagement to report" | **Training or engagement to report** |
| Training vs. Engagement | *"Is this a training or a engagement?"* — contains a grammatical error in the live form | **Training or engagement** ⚠️ |
| Degree | "Degree" | **Degree** |
| Gender | "Gender" (individual) / participant totals (group) | **Gender** |

⚠️ = worth a BA confirmation line, since the resulting title differs from what the ticket asked for. The third one is the notable case: reproducing the field label verbatim would put *"Is this a training or a engagement?"* on the dashboard, typo included. Recommend the clean noun phrase and a separate ticket to fix the form label.

#### D-5 — Leaflet renders Mapbox raster tiles; Mapbox geocoding stays (2026-07-29, requester accepted the default)

Resolves OQ-4. Chunk D swaps only the **rendering** library: `mapbox-gl` → `leaflet`, with `L.tileLayer` pointed at Mapbox raster tiles using the existing `environment.mapboxAccessToken`. `MapboxGeocodingService` and `environment.mapboxGeocodingUrl` are **untouched** — geocoding is a separate concern from rendering, and D-1 already bounds it to ≤ 20 calls.

Consequences: no new vendor, no new key, no OSM tile-usage-policy or attribution question (R-6 closes), and the ~800 kB `mapbox-gl` bundle win is still realised. Mapbox attribution must be preserved on the Leaflet map (`attributionControl` is on today). If the real goal ever becomes *removing the Mapbox account*, that is a different change and this decision must be revisited — noted here so the reasoning is not lost.

#### D-6 — Results by status moves to the server (2026-07-29, requester)

Resolves OQ-5. The client stops downloading up to 10 000 results to count them (P-4). `reports/full` gains a `results_by_status` array of `{ result_status_id, name, count }` — **counts only, no result payloads**, computed with a `GROUP BY` on the same primary-contract join the other aggregations use. The status colour currently read from `result.result_status.config.color.text` must either be included in the aggregation or resolved client-side from the existing status cache — Chunk B design decides which. Placed in **Chunk B** (server aggregation work), not A, so Chunk A stays client-only and ships fast.

#### D-7 — Indicator-specific charts are hidden when the indicator has no results (2026-07-29, proposer default, unchallenged)

Resolves OQ-6. Avoids R-3 (empty cards on TIP/PRMS/AICCRA-heavy projects) and R-4 (grid overload).

### Dependencies

- Chunk B needs confirmation that all lookup tables (`innovation_natures`, readiness levels, `maturity_level`, `policy_types`, `policy_stages`, `session_formats`, `session_types`, `session_lengths`, `degrees`, `genders`) are populated in every environment.
- Chunk C2 needs results-center ownership sign-off — it changes a shared filter contract.
- Chunk D needs no new environment key (D-5 reuses `environment.mapboxAccessToken`), but does need `leaflet` + `@types/leaflet` added and `mapbox-gl` removed from `package.json`.

### Open Questions

All blocking questions are resolved — OQ-1 → D-3, OQ-2 → D-2, OQ-3 → D-4, OQ-4 → D-5, OQ-5 → D-6, OQ-6 → D-7. Two non-blocking items remain, both answerable inside the child specs:

| ID | Question | Proposed default | Blocks |
| --- | --- | --- | --- |
| **OQ-7** | For the combined Gender chart, individual training counts **people** (one `gender_id` per record) while group training counts **participants** (summed totals). Are these summed into one distribution, or shown as two series? | Ticket says "Show the total distribution by gender across both training types" → **one summed distribution**, with the mixed unit documented on the card. | Chunk B design only |
| **OQ-8** | Should the four superseded `reports/top-*` server endpoints be deprecated on a schedule, or kept indefinitely? | **Kept** — out of scope here; raise separately if API surface reduction is wanted. | nothing |

### Confirmations to route to the BA (non-blocking)

Per D-4, three chart titles will differ from the ticket's wording because the ticket does not match the live form labels: **"Maturity of change reported"** (not "OICR Maturity"), **"Stage in Policy Process"** (not "Stage Policy Process"), and **"Training or engagement"** (the live label *"Is this a training or a engagement?"* carries a grammatical error that should not be promoted onto the dashboard). Implementation proceeds on D-4; these need an FYI, not an approval gate.

## 13. Success Criteria

| ID | Criterion |
| --- | --- |
| SC-1 | The dashboard issues **at most 2** analytics requests on load (`reports/full` + `results/count`), verified in the network panel. |
| SC-2 | Every ranked chart shows its top **5** by default and a "Show more" control; activating it expands the chart **in place** to **all** rows in the same ranking order, with **zero** additional network calls, the user still on the dashboard, and a "Show less" control to collapse. |
| SC-2b | An expanded card **scrolls internally** and does not change the height of its sibling cards or push the *Pending revision* table off-screen — asserted against a fixture with 200+ partners. |
| SC-3 | All 10 charts from the AC render correct counts against a seeded fixture, including the Degree chart restricted to `session_type = Training` **and** `session_length = Long-term`. |
| SC-3b | *Results by status* renders from the server aggregation (D-6); no request with `limit: 10_000` is issued anywhere on the dashboard. |
| SC-4 | Chart titles match the D-4 table exactly — asserted in a component test, so a future edit cannot silently drift them back. |
| SC-5 | Clicking an item in *Results by indicator*, *Results by status* or *Top primary levers* lands on the project's Results table with the matching filter applied **and displayed as a removable chip**. |
| SC-5b | Per D-1, a dashboard load issues **≤ 20 geocoding requests** regardless of how many countries `reports/full` returns — asserted with a spied `MapboxGeocodingService` against a fixture carrying 40+ countries with 20+ sub-nationals each. Expanding the geographic card issues **zero** further geocoding calls and leaves the map's plotted points unchanged. |
| SC-6 | The map renders on Leaflet with no `mapbox-gl` import in the built bundle; initial bundle size drops and stays inside the `angular.json` budgets (C-5). |
| SC-7 | `npm test` + `npm run lint` pass in both packages; server coverage ≥ 60 %, client floors held (statements 40 / branches 20 / lines 45 / functions 30). |
| SC-8 | `docs/ux-ui/design.md` records the new chart inventory and the map-library decision; `docs/trd/trd.md` records the extended `reports/full` contract. |

## 14. Next Step

Approve this decomposition, then per chunk:

```text
# on approval of the umbrella, generate the child proposals:
#   docs/specs/project-dashboard/full-payload-show-more/proposal.md
#   docs/specs/project-dashboard/indicator-metadata-charts/proposal.md
#   docs/specs/project-dashboard/chart-drilldown/proposal.md
#   docs/specs/project-dashboard/results-filter-expansion/proposal.md
#   docs/specs/project-dashboard/leaflet-map-migration/proposal.md

# then specify chunk A first:
/akili-specify project-dashboard/full-payload-show-more
```

If the decomposition is rejected in favour of a single spec, the next command is:

```text
/akili-specify project-dashboard/analytics-expansion
```

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
