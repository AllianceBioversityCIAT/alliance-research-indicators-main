# Proposal — Geo Map Replacement (retire Mapbox; Leaflet vs. ECharts-geo)

## 1. Document Control

| Field | Value |
| --- | --- |
| Type | **Change** |
| Slug | `leaflet-geo-map` — user-named; note the recommendation below may resolve to an ECharts-geo implementation (slug kept as the user's handle for the intent "replace the map") |
| Spec Path | `changes/leaflet-geo-map` |
| Approval Mode | gated |
| Author | j.cadavid@cgiar.org |
| Date | 2026-08-22 |
| Status | **Approved 2026-08-22** — user delegated the choice ("como te parezca mejor"); **Option C selected** (ECharts-geo choropleth, zero new dependencies). Option B (Leaflet + bundled centroids) remains the documented fallback |
| Depends on | `changes/dashboard-advanced-analytics` (done — viz-chart wrapper + `--ac-viz-*` tokens exist if Option C is chosen) |
| Parallel-safe | **yes** vs. other proposed follow-ups (touches only `geo-scope-map` + its service; no shared files with the AI-placement or registry-analytics candidates) |

## 2. Intent

Remove the Mapbox dependency from the geographic-scope card so the map **always renders** — no access token, no dev-facing error, no dead pane — while keeping (or improving) the analytical value: where this project's results land, by country/region/sub-national.

## 3. Problem / Current Behavior

Confirmed live by the user's screenshots (A511, 2026-08-22) and by code:

| # | Defect | Evidence |
|---|---|---|
| P1 | Without a Mapbox token the card shows a **large blank pane** with the developer-facing string "Map could not be loaded. Check the Mapbox access token" | screenshot; `geo-scope-map.component` error path |
| P2 | The dependency is **double**: `mapbox-gl` ^3.25.0 renders, and `MapboxGeocodingService` resolves place names → coordinates at runtime — both token-gated. Swapping only the renderer does not free the card | `package.json:45`; `geo-scope-map.component.ts:23,55` |
| P3 | Token management burden per environment (the localhost env has none — hence the error in a fresh worktree) | env merge session 2026-08-21 |
| P4 | The map is theme-blind (tile imagery ignores dark mode) and its popups carry `::ng-deep` overrides | `geo-scope-map.component.scss` |

## 4. Proposed Outcome

The geo card always renders a token-free, theme-aware visualization of the project's geographic distribution (countries shaded/marked by result count, regional + sub-national lists unchanged beside it), with a graceful empty state when no geo data exists — and the Mapbox token disappears from `environment*.ts` requirements.

## 5. Scope

`geo-scope-map` component (+ service), `package.json` (`mapbox-gl` out; possibly `leaflet` in), environment interface (token fields removed or optional-deprecated), the card's empty/error states aligned to the established three-state pattern. No server changes — the `reports/geo-scope` aggregate already supplies names + counts.

## 6. Non-Goals

Street-level detail, routing, clustering at coordinates; changing the geo aggregate; touching the regional/sub-national ranked lists.

## 7. Approach Options

| Option | Content | Trade-off |
|---|---|---|
| A — Keep Mapbox, just fix token provisioning | Document/inject the token per env | Keeps both dependencies, the cost, and the failure mode; rejected as not answering the ask |
| **B — Leaflet + free tile provider** (the named ask) | `leaflet` (~42 kB gz, BSD-2), OSM/Carto basemap tiles, markers per country | Still needs **coordinates**: either keep a geocoder (Nominatim has strict usage limits; Mapbox geocoding defeats the purpose) or bundle a country/region **centroid dataset** (~15–30 kB) — the honest form of B is *Leaflet + bundled centroids, no geocoder*. Residual: tile-server network dependency + attribution requirements + tiles stay theme-blind |
| **C — ECharts `geo`/`map` choropleth on the existing viz-chart wrapper** *(recommended)* | Bundle a simplified world GeoJSON (~200–300 kB in the lazy chunk), shade countries by result count with the validated `--ac-viz-*` ramp; sub-national/regional stay as the adjacent lists | **Zero new dependencies, zero network, zero token, zero geocoding** (GeoJSON matches by country name — needs a name-normalization map for mismatches, a bounded known task); fully theme-reactive and a11y-patterned like every other chart (table alternative built-in via the wrapper). Loses the "real map" pan/zoom tile feel |

## 8. Recommended Approach

**Option C.** The card's job is a **country-level magnitude view** (choropleth), not navigation — and C is the only option that eliminates *both* Mapbox dependencies with **no replacement dependency at all**: the engine, wrapper, ramp tokens, and a11y pattern already shipped in `dashboard-advanced-analytics`. Option B stays fully specified as the fallback if product wants the tile-map feel: its honest form is Leaflet + bundled centroids (no geocoder), accepting tiles' network/attribution/theme costs. Decide at approval — both fit in the same small spec.

## 9. Requirement Delta Preview

**ADDED:** always-rendering geo visualization (choropleth or tile map) with count shading/markers, tooltip per country, empty state, table alternative; country-name normalization map (C) or centroid dataset (B).
**REMOVED:** `mapbox-gl` dependency, `MapboxGeocodingService`, `mapboxAccessToken`/`mapboxGeocodingUrl` env requirements, the dev-facing error string.
**MODIFIED:** geo card states join the standard skeleton/error/empty pattern.

## 10. Risks, Dependencies, Open Questions

| Type | Item |
|---|---|
| Risk (C) | GeoJSON size in the lazy chunk (budget-gated, K-004 probe) · country-name mismatches vs CLARISA names → normalization map with a fixture-pinned test |
| Risk (B) | OSM public tile policy discourages production load; Carto free tier requires attribution — pick provider explicitly |
| OQ-1 | C vs B — product feel decision at approval (recommendation: C) |
| OQ-2 | Do sub-national names ever need on-map placement? (today: list-only — proposal keeps that) |

## 11. Success Criteria

1. Fresh checkout with zero tokens renders the geo card with real data — no error pane possible for a config reason.
2. `mapbox-gl` gone from `package.json`; no geocoding network calls from the card.
3. Theme flip re-renders the visualization correctly (C) or keeps legends/labels legible (B); a11y table alternative present.
4. Bundle budgets hold (lazy-chunk diff recorded both directions: mapbox-gl out ≈ −800 kB raw offsets the GeoJSON in).

## 12. Next Step

```text
/akili-specify changes/leaflet-geo-map
```
