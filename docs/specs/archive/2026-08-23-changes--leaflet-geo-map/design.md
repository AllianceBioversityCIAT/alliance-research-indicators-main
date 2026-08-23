# Design — Changes / Geo Map Replacement (`leaflet-geo-map`)

- **Module:** changes (STAR client — `project-detail` dashboard, shared `viz-chart`)
- **Spec id:** 2026-08-leaflet-geo-map
- **Status:** draft
- **Owner:** j.cadavid@cgiar.org
- **Linked requirements:** ./requirements.md
- **Linked TRD:** ../../../trd/trd.md §2.4 (ADR-11), §8 (frontend architecture), §12 (testing)
- **Last updated:** 2026-08-22

---

## 1. Goals & non-goals

**Goals** (each maps to requirements):
1. Replace the Mapbox point map with an ECharts choropleth on the existing `viz-chart` wrapper — zero new npm dependencies (R-GEO-001, R-GEO-002).
2. Deterministic ISO-alpha-2 join between the geo aggregate and a checked-in world geometry (R-GEO-003).
3. Full theme reactivity and AA accessibility through the established token + tableModel machinery (R-GEO-004, R-GEO-005).
4. Complete, verified Mapbox removal (R-GEO-007) with card states collapsed onto the standard pattern (R-GEO-006).

**Non-goals:** sub-national/regional on-map placement (lists stay); pan/zoom/tile-map feel (see DD-GEO-6); any server or aggregate change; a regional choropleth layer (client type lacks `region_id` — recorded in requirements §6).

---

> **KZ-016 cross-check performed:** this design was read back against every `BUT it must NOT` / `AND IT MUST` clause in `requirements.md` and against the constraints of the touched modules — `viz-chart`'s tableModel pairing rule (options without tableModel ⇒ chart cleared), its single `echarts.use([...])` registration site, `setOption(..., notMerge: true)` (every option object must be complete), `chartTokens()`'s no-fallback empty-string contract, and the K-005 environment-URL discriminator rule (untouched here). No contradiction found. One tension resolved explicitly: R-GEO-001's "no configuration error path" is why the geometry is **bundled**, not runtime-fetched (DD-GEO-2).

## 2. Architecture

The change is confined to the client's lazy **project-dashboard chunk** plus one shared wrapper file and removal sites. Flow after the change:

```
GetGeoScopeService (unchanged)
  └─ topCountries() signal ──▶ GeoScopeCardComponent (outer states, unchanged shell)
        └─ [countries] ──▶ GeoScopeMapComponent (REWRITTEN, same selector + input)
              ├─ geo-choropleth.util (pure: ISO join, series data, tableModel)
              ├─ world-countries geometry (checked-in asset, registerMap once)
              ├─ chartTokens(darkMode) ──▶ ramp colors (concrete values)
              └─ <app-viz-chart [options] [tableModel]> (existing wrapper, SVG)
```

### 2.1 Composition

| File | Action | Responsibility |
|---|---|---|
| `client/.../project-detail/components/geo-scope-map/geo-scope-map.component.{ts,html,scss}` | **rewrite** | Thin presenter: computed ECharts option + tableModel from `countries` input + tokens; hosts `<app-viz-chart>`. Keeps selector `app-geo-scope-map` and the `countries` input signature so `geo-scope-card` and its spec are untouched. |
| `client/.../geo-scope-map/geo-scope-map.component.spec.ts` | **new** | Unit spec for the rewritten component (none exists today). |
| `client/.../geo-scope-map/world-countries.geo.json` (+ `world-countries.README.md`) | **new** | Simplified world geometry (~200–300 kB), Natural-Earth-derived, PD; README records source, license, simplification level, edition quirks. Co-located: only this component consumes it. |
| `client/src/app/shared/utils/geo-choropleth.util.ts` (+ spec) | **new** | Pure functions: series data from `GeoScopeCountry[]` (alpha-2 join + exceptions map), tableModel builder, max-count. Exceptions map const lives here. |
| `client/src/app/testing/fixtures/clarisa-country-codes.fixture.ts` | **new** | Committed alpha-2 fixture backing R-GEO-003 AC.2 (coverage test vs the shipped geometry). |
| `client/src/app/shared/components/viz-chart/viz-chart.component.ts` | **edit** | Extend the single `echarts.use([...])` site with `MapChart` + `GeoComponent`; extend the `EChartsOption` ComposeOption union accordingly. |
| `client/src/app/shared/utils/geo-scope-map.util.ts` (+ spec) | **delete** | Point/geocode/jitter machinery superseded by the choropleth join. |
| `client/src/app/shared/services/mapbox-geocoding.service.ts` (+ spec) | **delete** | Sole consumer was the old component. |
| `client/src/app/shared/constants/country-centroids.constants.ts` | **edit** | Remove `GEO_SCOPE_MAP_STYLE`, `COUNTRY_CENTROIDS`, `getCountryCentroid`; **retain** `PROJECT_DASHBOARD_DEFAULT_LIMIT` (consumed by `get-geo-scope.service.ts`). |
| `client/package.json` / lockfile | **edit** | Drop `mapbox-gl`. |
| `client/angular.json` | **edit** | Drop the global `mapbox-gl.css` style entry (leaves the **initial** bundle). |
| `client/src/environments/environment.example.ts` | **edit** | Remove `mapboxAccessToken` / `mapboxGeocodingUrl` (+ note for gitignored local envs). |
| `client/.../geo-scope-card/geo-scope-card.component.html` | **edit (minimal)** | Grid proportions only (DD-GEO-5). |
| 3 sibling specs mocking `echarts/core` (`viz-chart`, `results-trend-card`, `sp-alignment-graph`) | **edit** | Extend the mock factory for the new registered modules. |

### 2.2 Reuse

`VizChartComponent` (options/tableModel/height/loading, SVG renderer, reduced-motion, sr-only table), `chartTokens()` + `DarkModeService.darkMode()` (note: **method returning a Signal**, not a signal), `ProjectDashboardCardComponent` (outer states, untouched), `GetGeoScopeService` (untouched), `tokens:validate` script (untouched). No new shared components.

---

## 3. Data model

No data model changes. No migrations, no OpenSearch, no server diff.

---

## 4. API surface

No API changes. The card keeps consuming `GET agresso/contracts/reports/geo-scope` through the existing service.

---

## 5. Workflows & business rules (client rendering flow)

1. Card mounts inside the lazy project-dashboard chunk; `GetGeoScopeService.update()` drives the outer skeleton/error/empty states exactly as today.
2. On non-empty `topCountries`, the rewritten map component registers the world geometry with ECharts **once per app lifetime** (idempotent module-level guard), then computes:
   - series data = alpha-2 join of `top_countries` against geometry features, exceptions map applied; rows with no `iso_alpha_2` or no feature are excluded from the series (never thrown);
   - tableModel = **all** rows (matched + unmatched), caption + country/count headers — the completeness channel (R-GEO-005);
   - option object = map series + continuous `visualMap` (min **0** → maxCount, degenerate-domain handling per D-GEO-10) using the concrete 5-stop ramp from `chartTokens()`; neutral base and borders as `var(--ac-grey-*)` strings (DD-GEO-7); tooltip formatter name + count.
3. Theme flip: `chartTokens()` is keyed on the dark-mode signal → the option recomputes → `viz-chart` re-applies with `notMerge: true` (complete object each time, per wrapper contract).
4. Whole-aggregate empty ⇒ the card's **outer** empty state (as today, via `isEmpty()`). **Countries-only empty with non-empty summary/regional data** ⇒ the outer card renders normally and the map pane shows a static pane-level fallback (standard empty idiom); no chart mounts (D-GEO-9, R-GEO-006 country-less scenario, A511 evidence 2026-08-22). No other inner states exist.
5. No side effects: no sockets, no storage, no analytics events.

---

## 6. Frontend / UX component architecture

- **States:** single source = outer `ProjectDashboardCardComponent` (skeleton `role="status"`, error `role="alert"` + 44px retry, empty icon+message). The rewritten map component owns **no** state machinery — its single exception is the static pane-level fallback for the country-less case (D-GEO-9): a data-shape branch, not a loading/error state.
- **Layout:** the card's xl grid currently gives the map the narrow column (`minmax(280px,.5fr)` vs `1.6fr`). A world choropleth needs the wider share: rebalance to give the map pane **≥ 50% at xl** while the summary + three ranked lists keep a workable minimum; exact fractions tuned at the HITL visual check (R-GEO-008 explicitly permits only this).
- **Tokens:** ramp = `--ac-viz-ramp-1…5` via `chartTokens()` (concrete resolved values — required for visualMap interpolation); base fill / borders / visualMap text = `var(--ac-grey-*)` / existing neutrals as raw CSS-var strings (resolve in the SVG DOM, flip free with theme). **No new tokens; no hex literals.**
- **A11y:** magnitude via ramp + tooltip counts + sr-only table (never color alone); `requireTable` stays `true`; wrapper's reduced-motion (`animation: false`) applies unchanged.
- **Typography/copy:** tooltip and visualMap labels use the chart-standard treatment already in the dashboard cards; no new user-facing strings beyond the tableModel caption.

---

## 7. Integration impact

None. No external system, env var (two are **removed**), cron, or event contract is touched.

## 8. Security & authorization

No auth surface change. Net security improvement: one third-party token requirement and one runtime third-party endpoint disappear. No PII. The removed env fields stay harmless if present in gitignored local envs (structural typing) — noted in §11.

## 9. Observability

No new logging. The old component's silent-degradation paths (geocode failures) disappear with geocoding itself. Chart render failures surface as standard Angular errors; no bespoke handler.

---

## 10. Testing strategy

| Layer | What | Named failing input (K-012) |
|---|---|---|
| `geo-choropleth.util.spec.ts` | ISO join, exceptions map, undefined-code exclusion, tableModel completeness, max-count | `{iso_alpha_2:'HK', count:3}` with HK absent from geometry ⇒ series excludes it, table includes it. `FR` when the geometry edition carries `ISO_A2:'-99'` ⇒ test is RED until the exceptions entry exists |
| Fixture coverage test | every alpha-2 in `clarisa-country-codes.fixture.ts` resolves to a feature or an exceptions entry | add a fake code `XX` to the fixture ⇒ test goes red (proves the gate can fail, K-004) |
| `geo-scope-map.component.spec.ts` (new) | option object generated (assert the **output object**, not call sequence — KZ-001), tokens recompute on theme-signal flip, tableModel wiring, no chart on empty input. **KZ-015:** construct with empty `countries` first, assert nothing renders, **then** set data — the transition production performs |
| Sibling mock updates | the 3 specs mocking `echarts/core` get `MapChart`/`GeoComponent`/`registerMap` in the mock factory | run `npm test` before the mock update ⇒ observed import-time failure is the red (K-004) |
| Full suite | `npm test` (coverage floors global; targeted runs need `--coverage=false`, K-020) | — |
| Type gates | `npm run build` (app) · `npx tsc -p tsconfig.spec.json --noEmit` vs the 945 baseline (specs) | — |
| Generated-output gates | post-build sentinel grep for the geometry in the dashboard chunk (NFR-GEO-102, adapted for bundling — KZ-001: assert in `dist/`); recorded bundle sizes before/after (NFR-GEO-101 disqualifiers apply) | delete the geometry import locally ⇒ build fails / sentinel grep empty |
| **HITL visual (dominant class)** | choropleth paints, shading order, tooltip, both themes, grid proportions — real browser, light + dark | no automated gate exists; suites alone may not discharge it (KZ-014: no `[x]` from green suites while the visual check is pending) |

---

## 11. Rollout

- **No feature flag:** the swap is atomic inside one lazy chunk; old and new never coexist.
- **Order:** single client release; no migration, no server coordination.
- **Backout:** `git revert` of the client commits restores Mapbox (lockfile included). No data implications.
- **Comms:** DevOps may drop `mapboxAccessToken` provisioning from client environments after release (not before). Developers with gitignored local `environment*.ts` need no action — leftover fields are inert; `environment.example.ts` is the source of truth for new checkouts.

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
|---|---|---|---|
| D-GEO-1 | 2026-08-22 | Register `MapChart` + `GeoComponent` in `viz-chart`'s existing single `echarts.use([...])` site, not in the geo component | ADR-11's one-engine/one-registration pattern; every viz-chart consumer already lives in the same lazy chunk, so no initial-bundle cost. *Rejected:* per-component registration — splits the registration contract the sibling specs' mocks pin. |
| D-GEO-2 | 2026-08-22 | **Bundle** the geometry into the lazy chunk via a static JSON import co-located with the component (enable `resolveJsonModule` if absent), rather than runtime-fetching from `public/` | A runtime fetch reintroduces exactly the failure class R-GEO-001 abolishes (a network/asset error path for a config-shaped reason) and needs its own loading state. Bundling makes the build itself the packaging gate; NFR-GEO-102's check becomes a sentinel grep in the built chunk. *Trade-off accepted:* dashboard chunk grows ~200–300 kB raw (gzipped in transit); no per-lazy-chunk budget exists — sizes recorded per NFR-GEO-101. |
| D-GEO-3 | 2026-08-22 | Keep selector `app-geo-scope-map` and the `countries` input contract; rewrite only the internals | `geo-scope-card` template, its spec's mock, and `project-dashboard`'s stub all pin the selector/input — keeping them makes R-GEO-008 AC.1 hold by construction. |
| D-GEO-4 | 2026-08-22 | Join key = ISO alpha-2 with a code-level exceptions map; **no runtime name matching** | The endpoint ships `iso_alpha_2` (server sets it unconditionally); ECharts' `nameProperty` lets the series key on the geometry's ISO property. Name matching is the fragile path the proposal's "normalization map" anticipated — alpha-2 reduces it to a bounded exceptions table with a fixture-pinned gate (KZ-001). |
| D-GEO-5 | 2026-08-22 | Rebalance the card grid so the map pane gets ≥ 50% at xl (today `.5fr` vs `1.6fr`) | A world choropleth at 280px is illegible; R-GEO-008 fences this as the only permitted layout change. Verified at HITL (no automated layout gate — declared). |
| D-GEO-6 | 2026-08-22 | `roam: false` — no pan/zoom on the choropleth | The card's job is magnitude-at-a-glance; roam adds scroll-trap risk inside a scrolling dashboard and re-creates "navigation" scope the proposal excluded. **Reversion challenge (Step 2.3) below.** |
| D-GEO-7 | 2026-08-22 | Ramp colors passed as **concrete values** from `chartTokens()`; base/border/text as raw `var(--ac-grey-*)` strings | visualMap interpolates between ramp stops, which requires parseable colors; non-interpolated fills ride CSS vars in the SVG DOM and flip with theme for free (established `results-trend-card` pattern). Guard `chartTokens()`'s empty-string no-fallback contract exactly as existing consumers do. |
| D-GEO-8 | 2026-08-22 | Continuous `visualMap` (min 1 → data max) over the 5-stop ramp, shown as the scale legend | Counts are small integers; a continuous bar communicates the scale with the fewest moving parts and satisfies R-GEO-002's legend clause. Piecewise rejected: bucket edges imply categories the data doesn't have. |
| D-GEO-9 | 2026-08-22 | **Pane-level fallback for the country-less case** — when `top_countries` is empty but the aggregate is not, the map pane renders the standard empty idiom (icon + message) instead of a chart; the outer card stays normal | Live evidence (A511, Testing 2026-08-22): a global/regional-only project produced a dead grey pane the original spec did not anticipate — the outer empty gate cannot fire (data exists) and `countries=[] ⇒ no chart` left the pane blank. An all-neutral choropleth was rejected: a map with an empty-range visualMap *looks* broken and communicates nothing. Added post-approval as a spec correction; requirements R-GEO-006 AC.4 carries the test. |
| D-GEO-10 | 2026-08-22 | **Visibility floor for the visualMap** (refines D-GEO-8, which stays as the base decision): domain runs **0 → maxCount** (not 1 →), so the lowest real count always sits above the scale floor; when the domain is degenerate (all counts equal — including one single country), the value renders at a **high ramp stop**, never the light end | Live evidence: Kenya (count 1, sole country) rendered at the collapsed scale's light extreme — indistinguishable from the no-data base, i.e. the encoding's failure mode is "data looks like no data". Requirements R-GEO-002 new `AND IT MUST` + AC.4 carry the contract. |
| D-GEO-11 | 2026-08-22 | **Bounded pane height**: the chart mounts with a fixed height via `viz-chart`'s `height` input (order-of ~360px, tuned at HITL) and the country-less fallback pane matches that same height — never `h-full` unbounded stretch | Live evidence: both the Kenya render and the A511 fallback left a column of dead whitespace below the visualization. R-GEO-008's new height clause carries the contract; HITL verifies (no automated layout gate — declared). |

### Step 2.3 — Reversion challenges (behavior already delivered that this design removes)

| Removed behavior | Challenge: "what does removing this break?" | Outcome |
|---|---|---|
| Sub-national jittered points on the map | Nothing tested breaks (util spec dies with the util; card spec mocks the map). Information survives in the Top sub-national list, which R-GEO-008 freezes. The proposal explicitly resolves this as a non-goal (OQ-2). | **Accepted** — approved at proposal. |
| Pan/zoom (`NavigationControl`) | No functional consumer; small-country inspection loses zoom. Mitigation: tooltip + ranked lists carry exact counts; choropleth countries are hit-targets at world scale. If product later wants inspection, `roam` is a one-line enable. | **Accepted** (D-GEO-6). |
| Geocoding + in-memory cache | Scout-verified single import site; no other consumer exists. Its spec is deleted with it. | **Accepted** — dead by construction. |
| Inner "Loading map locations…" state | The wait it covered (geocoding round-trips) no longer exists; geometry is bundled (no load latency beyond the chunk itself, which the router already covers). Outer skeleton covers data fetch. | **Accepted** — the waited-for work is gone, not hidden. |
| Mapbox attribution control | Attribution obligation belongs to the tile/data provider; Natural Earth (PD) requires none. License documented per NFR-GEO-104. | **Accepted.** |

### Step 2.4 — Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Expected tasks | **8** |
| Expected hand-written LOC | **~650** net (new component + util + specs + fixture ≈ +600; removals ≈ −900; edits ≈ +50) — the geometry JSON (~200–300 kB) is a data asset, counted separately, not as LOC |
| Expected review rounds | **1–2** |

Fits the declared **Standard** depth (Step 2.4 check: estimate matches; no depth change). Exceeding this budget in execution is an escalation, not a silent continuation.

---

## 13. Open questions

None. D-GEO-5's exact grid fractions are an implementation detail resolved at the HITL visual check.

## 14. References

- ADR-11 (TRD §2.4) — one chart engine behind `viz-chart`.
- `docs/specs/archive/2026-08-22-changes--dashboard-advanced-analytics/` — D-DA-1 (engine), D-DA-8 (viz tokens/ramp).
- UX/UI design §7.1 (tokens), §12.2 (2026-05-20/23 geo-card lineage).
- Scout report (this spec's Phase 0 exploration, 2026-08-22) — factual basis for the removal inventory and wrapper contracts.
