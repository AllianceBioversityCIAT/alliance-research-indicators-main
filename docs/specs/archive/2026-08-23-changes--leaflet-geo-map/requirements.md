# Requirements — Changes / Geo Map Replacement (`leaflet-geo-map`)

- **Module:** changes (STAR client — `project-detail` dashboard, shared `viz-chart`)
- **Spec id:** 2026-08-leaflet-geo-map
- **Status:** draft
- **Owner:** j.cadavid@cgiar.org
- **Linked PRD section:** `docs/prd.md` §5.1 (client — dashboard/charts), AC-Theming, AC-Accessibility, AC-Performance
- **Linked proposal:** ./proposal.md — **Approved 2026-08-22, Option C selected** (ECharts-geo choropleth; Leaflet+centroids documented fallback)
- **Linked tickets:** —
- **Last updated:** 2026-08-22
- **Depth:** Standard
- **Approval Mode:** gated (inherited from proposal)

> Slug note: the folder keeps the user's handle `leaflet-geo-map`; the approved implementation is **ECharts-geo (Option C)**, per the proposal's Document Control.

---

## 1. Context

The project-detail dashboard's geographic-scope card renders a Mapbox GL point map. Without a Mapbox access token (every fresh checkout, the localhost env, and any env where the token lapses) the card shows a dead pane with a developer-facing error. The dependency is double — `mapbox-gl` renders and `MapboxGeocodingService` resolves place names at runtime — and the map is theme-blind.

This spec replaces the map with a **country-level choropleth** rendered by the existing `viz-chart` wrapper (tree-shaken `echarts/core`, SVG, ADR-11), shaded with the validated `--ac-viz-ramp-*` tokens, joined to the geo aggregate by **ISO alpha-2** codes the endpoint already supplies. Mapbox (library, CSS, geocoding service, env fields, error string) is removed entirely.

**Not changing:** the `reports/geo-scope` server aggregate, the adjacent summary metrics and Top regions / Top countries / Top sub-national ranked lists, and the outer card shell (`ProjectDashboardCardComponent`). No server changes of any kind.

---

## 2. Requirement numbering

`R-GEO-<NNN>` functional · `NFR-GEO-1NN` non-functional.

---

## 3. Functional requirements

### R-GEO-001 — Token-free, always-rendering geo visualization

- **As a** Result Contributor / MEL expert viewing a project dashboard
- **I want** the geographic card to always render from the project's data alone
- **So that** no environment configuration can produce a dead pane

**Details:**
- Inputs: `GET agresso/contracts/reports/geo-scope` response already consumed by `GetGeoScopeService` (`top_countries[]` with `iso_alpha_2?`, `country_name`, `count`).
- Behavior: the visualization initializes with zero tokens, zero external network calls, zero geocoding. All geometry ships with the app.
- Outputs: a rendered choropleth inside the geo-scope card's map pane.
- Errors: only data-fetch errors surface (standard card error state); **no configuration-error path exists**.

**Scenario: fresh checkout renders**
- GIVEN a clean checkout whose `environment.ts` has no Mapbox fields at all
- WHEN a user opens `/project-detail/:id/project-dashboard` for a project with geo data
- THEN the geo card renders the choropleth with that project's countries shaded
- AND no request leaves the browser toward any Mapbox or geocoding host
- BUT it must NOT be possible to reach any error state whose cause is missing configuration (the string "Check the Mapbox access token" and its code path no longer exist)
- AND IT MUST render without any new npm dependency (geometry is a checked-in asset, not a package)

**Acceptance criteria:**
- [ ] AC.1 — With `top_countries` non-empty, the map pane contains a rendered SVG chart (viz-chart instance) — verified in a real browser at the HITL pause, not only in jsdom.
- [ ] AC.2 — `grep -r "mapbox" client/research-indicators/src client/research-indicators/angular.json client/research-indicators/package.json` returns zero hits (excluding the archived mockup under `docs/specs/archive/`).
- [ ] AC.3 — The browser network panel over a full card load shows only same-origin requests (API + static assets).

### R-GEO-002 — Choropleth shading by result count

- **As a** dashboard viewer
- **I want** countries shaded by how many of the project's results land there
- **So that** geographic magnitude is readable at a glance

**Details:**
- Behavior: countries present in `top_countries` are shaded on a sequential scale driven by `count`; countries absent from the data render in a neutral base surface. A `visualMap` (or equivalent legend) communicates the scale. Hover/tooltip per data country shows country name + result count.
- Colors: the 5-step `--ac-viz-ramp-*` sequential ramp via `chartTokens()` — no hex literals, no new tokens.

**Scenario: magnitude readable**
- GIVEN `top_countries = [{CO,12},{KE,5},{VN,1}]`
- WHEN the chart renders
- THEN Colombia is visibly darker (light mode) than Vietnam, per the ramp's monotonic ordering
- AND hovering Colombia shows its name and count 12
- BUT it must NOT color-encode any country that has no data (neutral base fill only)
- AND IT MUST keep the ramp mapping monotonic: a higher count never maps to an earlier ramp stop
- AND IT MUST render every data country **visually distinct from the no-data base at any count** — including the degenerate domain where all counts are equal (e.g. a single country with count 1, which a min=1→max continuous scale collapses onto the invisible light end; live evidence 2026-08-22: Kenya count 1 rendered indistinguishable from the base) *(added 2026-08-22, spec correction)*

**Acceptance criteria:**
- [ ] AC.1 — Unit test: the generated ECharts option object maps min→max counts onto the ramp array from `chartTokens()` and the series data contains exactly the ISO-matched countries.
- [ ] AC.2 — `npm run tokens:validate` passes (ramp exists in both themes, monotonicity enforced).
- [ ] AC.3 — Human visual check (HITL): shading order matches counts in light AND dark mode.
- [ ] AC.4 — Unit test on the generated option object for the degenerate fixture `[{iso_alpha_2:'KE', count:1}]`: the visualMap/series configuration resolves KE to a visibly saturated ramp stop, never the scale's floor color nor the neutral base (assert the generated output, KZ-001; the painted result is AC.3/T-08's half). *(added 2026-08-22)*

### R-GEO-003 — Country matching by ISO alpha-2 with a pinned exceptions map

- **As a** maintainer
- **I want** the data→geometry join to key on ISO alpha-2 codes
- **So that** country-name spelling differences between CLARISA and the map asset cannot silently drop countries

**Details:**
- Inputs: `GeoScopeCountry.iso_alpha_2?` (optional in the type; populated by the server from `clarisa_countries.isoAlpha2`).
- Behavior: match each data row to a geometry feature by alpha-2; a bounded, fixture-pinned exceptions map handles known asset quirks (e.g. Natural-Earth-derived features carrying `ISO_A2 = "-99"` for FR/NO in some editions). A row with no `iso_alpha_2` or no matching feature is **excluded from the map but still present in the accessible table** (R-GEO-005) and in the adjacent Top countries list.

**Scenario: unmatched country degrades visibly, not silently**
- GIVEN a `top_countries` row `{iso_alpha_2: "HK", country_name: "Hong Kong", count: 3}` whose code has no feature in the shipped geometry
- WHEN the chart renders
- THEN the remaining countries render normally
- AND Hong Kong still appears in the accessible table and the Top countries list with count 3
- BUT it must NOT throw, blank the chart, or shade a wrong country
- AND IT MUST NOT fall back to fuzzy name matching at runtime (the exceptions map is the only indirection)

**Acceptance criteria:**
- [ ] AC.1 — Unit test with the exact fixture above (a code absent from the geometry): chart data excludes it, no exception thrown.
- [ ] AC.2 — Fixture-pinned test: every alpha-2 in a committed fixture of CLARISA country codes resolves to a geometry feature or an explicit exceptions-map entry; the test FAILS if a new unmapped code appears in the fixture.
- [ ] AC.3 — Unit test: a row with `iso_alpha_2: undefined` is excluded from the series without error.

### R-GEO-004 — Theme reactivity

- **As a** user who switches between light and dark mode
- **I want** the geo visualization to re-render with theme-correct colors
- **So that** the card is never the theme-blind pane the tile map was

**Scenario: theme flip**
- GIVEN the choropleth is rendered in light mode
- WHEN the user toggles dark mode
- THEN the chart re-renders using the dark-mode `--ac-viz-ramp-*` values and a dark-appropriate neutral base
- BUT it must NOT branch on `isDarkMode()` for color decisions anywhere except through `chartTokens()` (the sanctioned signal-keyed token reader)
- AND IT MUST NOT contain hex literals in component code (existing token rule; the removed component's `rgb(...)` SSR fallbacks do not migrate)

**Acceptance criteria:**
- [ ] AC.1 — Unit test: flipping the dark-mode signal recomputes the option object with the re-resolved token values.
- [ ] AC.2 — Human visual check (HITL): both themes render legibly; no near-white surface survives in dark mode.

### R-GEO-005 — Accessible alternative and motion

- **As a** screen-reader or reduced-motion user
- **I want** the same information without the visual chart
- **So that** the card meets WCAG 2.1 AA like every other viz-chart card

**Details:**
- Behavior: the chart mounts through `viz-chart` with a populated `tableModel` (caption + country/count rows — including rows excluded from the map by R-GEO-003). The wrapper's built-in reduced-motion handling (`animation: false`) and sr-only table apply unchanged.

**Scenario:**
- GIVEN the choropleth is rendered
- WHEN assistive tech reads the card
- THEN an sr-only table exposes every country and its count
- AND IT MUST include unmatched-geometry rows (the table is the completeness channel)
- BUT it must NOT pass `requireTable=false` (the pairing rule stays enforced)

**Acceptance criteria:**
- [ ] AC.1 — Unit test: `tableModel` rows == all `top_countries` rows (matched + unmatched), with caption.
- [ ] AC.2 — Wrapper contract holds: options set + tableModel null ⇒ chart cleared (existing viz-chart behavior; no override introduced).

### R-GEO-006 — Card states join the standard pattern

- **As a** dashboard viewer
- **I want** loading, error, and empty handled like every other dashboard card
- **So that** the geo card stops carrying its own bespoke inner states

**Details:**
- Behavior: the outer `ProjectDashboardCardComponent` states (skeleton / error-with-retry / empty) remain the single source of state UI, driven by `GetGeoScopeService.loading()/loadError()/isEmpty()`. The inner map-specific states (geocoding spinner, token error bar, "No geographic points could be resolved" bar) are removed with the component that owned them.

**Scenario: empty project**
- GIVEN a project whose geo aggregate returns empty `top_countries` and zero summary counts
- WHEN the card loads
- THEN the standard empty state renders (icon + message), no chart mounts
- BUT it must NOT show a blank chart pane or an error
- AND IT MUST keep the retry affordance on fetch errors (existing card behavior, 44px touch target)

**Scenario: country-less geographic reach (global/regional only)** *(added 2026-08-22 from live evidence: A511 on Testing — GLOBAL 7, REGIONAL 3, zero country rows — rendered a dead grey pane)*
- GIVEN a project whose geo aggregate has **empty `top_countries` but non-empty** summary/regional data
- WHEN the card renders
- THEN the outer card renders normally (summary metrics + ranked lists intact)
- AND the map pane renders a **pane-level fallback** in the standard empty idiom (icon + message, e.g. "No country-level data — this project's reach is global/regional")
- BUT it must NOT render a blank/dead pane, nor an all-neutral chart with an empty-range visualMap
- AND IT MUST NOT trigger the outer card's empty state (data exists at other levels)

**Acceptance criteria:**
- [ ] AC.1 — Existing `geo-scope-card.component.spec.ts` empty-detection tests still pass unmodified.
- [ ] AC.2 — Unit test: fetch error ⇒ outer error state; no chart instance created.
- [ ] AC.3 — Grep: the strings "Check the Mapbox access token" and "No geographic points could be resolved" are gone from `src/`.
- [ ] AC.4 — Unit test with fixture `{ top_countries: [], geo_scope_summary: { global: 7, regional: 3 } }`: no chart options emitted, the pane fallback is present in the rendered DOM, and the outer card is NOT in its empty state.

### R-GEO-007 — Complete Mapbox removal

- **As a** maintainer
- **I want** every Mapbox artifact out of the client
- **So that** no token, cost, or failure mode survives half-removed

**Details** (removal inventory — the scout-verified complete footprint):
- `package.json` dependency `mapbox-gl`
- `angular.json` global style `node_modules/mapbox-gl/dist/mapbox-gl.css` (currently in the **initial** bundle)
- `MapboxGeocodingService` + its spec
- `geo-scope-map.component.*` mapbox code paths and `::ng-deep .mapboxgl-*` styles
- `geo-scope-map.util.ts` point/geocode/jitter machinery + its spec (superseded by the choropleth join)
- `environment.example.ts` fields `mapboxAccessToken`, `mapboxGeocodingUrl` (and a note for gitignored local envs)
- `GEO_SCOPE_MAP_STYLE` constant

**Scenario:**
- GIVEN the spec is implemented
- WHEN the removal inventory is swept
- THEN every item above is gone
- BUT it must NOT delete `country-centroids.constants.ts` wholesale — `PROJECT_DASHBOARD_DEFAULT_LIMIT` lives there and is consumed by `get-geo-scope.service.ts` (relocate or retain)
- AND IT MUST leave the archived mockup reference (`docs/specs/archive/.../Main.dc.html`) untouched (archives are frozen)

**Acceptance criteria:**
- [ ] AC.1 — Same grep as R-GEO-001 AC.2 (zero `mapbox` hits in src/config).
- [ ] AC.2 — `npm run build` succeeds after `npm ci` on a tree where `mapbox-gl` is absent from the lockfile.
- [ ] AC.3 — `GET_GeoScope` consumers still compile: `PROJECT_DASHBOARD_DEFAULT_LIMIT` resolves.

### R-GEO-008 — Adjacent lists and aggregate untouched

- **As a** dashboard viewer
- **I want** the summary metrics and ranked lists exactly as they are
- **So that** the replacement is scoped to the map pane

**Scenario:**
- GIVEN the implemented card
- WHEN compared with the current card outside the map pane
- THEN summary metrics, Top regions, Top countries, Top sub-national lists render identically from the same service signals
- BUT it must NOT modify `GetGeoScopeService`'s fetch/shape logic or the server aggregate
- AND IT MAY adjust only the card's internal grid proportions (the map pane is currently the narrower `.5fr` column; a choropleth may need the wider share) — a design decision, not a data change
- AND IT MUST bound the map pane's height — chart and country-less fallback alike — so the card never stretches with dead vertical space below the visualization (live evidence 2026-08-22: both the Kenya render and the A511 fallback left a full column of blank space) *(added 2026-08-22, spec correction; verified at HITL — no automated layout gate, declared)*

**Acceptance criteria:**
- [ ] AC.1 — `geo-scope-card.component.spec.ts` computed-signal tests (sorting, filtering, fallbacks) pass unmodified.
- [ ] AC.2 — No diff under `server/`.

---

## 4. Non-functional requirements

### NFR-GEO-101 — Bundle budgets & asset placement

- **Category:** performance
- **Target:** `angular.json` budgets hold (initial ≤ 2 MB warn / 3 MB error). The world-geometry asset (~200–300 kB) MUST NOT enter the **initial** bundle — it belongs to the lazy project-dashboard chunk or is runtime-fetched from `public/`. Record the before/after sizes of (a) the initial bundle (mapbox CSS leaves it) and (b) the project-dashboard lazy chunk, in both directions.
- **How verified:** `npm run build` size output, captured before and after. **Disqualifier:** a size measured while any delegated agent runs in this checkout is not evidence (concurrency rule §4.3); if repeated builds vary by more than the delta being claimed, report the spread, not a number. **Declared blind spot:** no per-lazy-chunk budget exists in `angular.json` — the lazy-chunk claim is evidenced only by the recorded measurement, not by a failing gate.

### NFR-GEO-102 — Packaging of the geometry asset (K-017)

- **Category:** reliability (packaging defect class)
- **Target:** the world-geometry asset exists in the production build output at the exact path the code loads it from.
- **How verified:** post-build existence check, e.g. `npm run build && ls dist/research-indicators/browser/<asset-path>` (exact path fixed in design). The unit suite runs over `src` and structurally cannot see this.

### NFR-GEO-103 — Accessibility floor

- **Category:** a11y
- **Target:** WCAG 2.1 AA on the changed card (PRD C-4). Magnitude is conveyed by the ramp **plus** the tooltip counts **plus** the sr-only table — never color alone. Ramp contrast against card surfaces: `tokens:validate` **prints** contrast but only **enforces** monotonicity — contrast adequacy is confirmed at the HITL visual check (declared substitute).
- **How verified:** `npm run tokens:validate` (monotonicity) + HITL visual pass (contrast, both themes).

### NFR-GEO-104 — Geometry asset licensing

- **Category:** compliance
- **Target:** the checked-in GeoJSON derives from a public-domain or license-compatible source (e.g. Natural Earth, PD); source + license + simplification provenance documented next to the asset.
- **How verified:** code review — a `README`/header note accompanies the asset.

---

## 5. Defect classes → gates

| Defect class this spec can produce | Gate that catches it | What the gate CANNOT reach (KZ-017) |
|---|---|---|
| App-code type errors | `npm run build` | `*.spec.ts` (excluded by `tsconfig.app.json`) |
| Spec-code type errors | `npx tsc -p tsconfig.spec.json --noEmit` | Gate against the **945-error baseline**, not zero; a rising count is the signal |
| Behavior regressions (join logic, tableModel, states, theme recompute) | `npm test` (targeted runs need `--coverage=false`, K-020) | Rendered layout/color/contrast — jsdom cannot measure them |
| Wrong option object at module boundaries | Unit assertions on the **generated option object** (KZ-001: assert the output, not the call sequence) | Whether ECharts actually paints it — see visual class |
| **Visual/rendered defects** (choropleth paints, shading order, theme flip, tooltip, dark-mode legibility) | **No automated gate.** Substitute: human visual check at the HITL pause on `npm start` (light + dark), before task sign-off | This is the spec's dominant defect class; a green suite alone may never discharge it |
| Token/ramp regressions | `npm run tokens:validate` | Contrast is printed, not enforced (see NFR-GEO-103) |
| Packaging (asset absent from `dist/`) | post-build `ls` (NFR-GEO-102) | — |
| Bundle regression | `npm run build` budget output + recorded chunk diff | No per-lazy-chunk budget gate exists (see NFR-GEO-101) |
| Broken echarts mocks in sibling specs | `npm test` full run (the 3 spec files mocking `echarts/core` fail at import if registration changes are unmocked) | — |
| Dead Mapbox remnants | grep inventory (R-GEO-007 AC.1) | The gitignored local `environment*.ts` files (developer-local; note in rollout) |

---

## 6. Data requirements

None server-side. Client-side: `GeoScopeCountry.iso_alpha_2?` stays optional — the join handles `undefined` (R-GEO-003 AC.3). No interface changes to the wire shape. (Known, out of scope: `top_regions` loses `region_id`/UM49 in the client type; a regional map layer is a non-goal — recorded in §9.)

---

## 7. API surface delta

None. No new/changed endpoints; no Socket.IO events; no machine-token visibility changes.

## 8. Cross-system impact

None. STAR-client-only; the server aggregate, CLARISA, and all integrations are untouched.

---

## 9. Assumptions, dependencies, risks

| Type | Item | Mitigation |
|---|---|---|
| Assumption | ECharts 6 (`^6.1.0`) ships no world map — geometry is a net-new checked-in asset registered via `echarts.registerMap` | NFR-GEO-102 packaging gate; NFR-GEO-104 licensing |
| Assumption | The geo endpoint's `iso_alpha_2` is populated for CLARISA countries (server sets it unconditionally from `clarisa_countries.isoAlpha2`) | R-GEO-003 handles `undefined` anyway |
| Dependency | `changes/dashboard-advanced-analytics` (done, archived) — viz-chart wrapper, `--ac-viz-ramp-*`, `tokens:validate` | Already shipped; scout-confirmed in code |
| Risk | The three sibling specs mocking `echarts/core` (`viz-chart`, `results-trend-card`, `sp-alignment-graph`) break at import when `MapChart`/`GeoComponent`/`registerMap` are introduced | Named task updates the shared mock pattern; full `npm test` is the gate |
| Risk | GeoJSON quality: over-simplified geometry drops small island states the data may reference | R-GEO-003's fixture-pinned coverage test makes the drop visible at build time, not in production |
| Risk | Map pane width (`.5fr` column) may be too narrow for a legible world choropleth | Design decides the grid proportions (R-GEO-008 allows it); HITL visual check verifies |

## 10. Open questions

- None blocking. Proposal OQ-2 (sub-national on-map placement) is resolved as a **non-goal**: sub-nationals stay list-only, per the approved proposal.

---

## 11. Sign-off

- [ ] Engineering lead — j.cadavid
- [ ] MEL / product owner — (delegated to eng per proposal approval)
- [ ] Security review — n/a (no auth/secrets touched; removes a token requirement)
- [ ] DevOps — n/a (no infra; note: Mapbox token can be dropped from env provisioning after release)
