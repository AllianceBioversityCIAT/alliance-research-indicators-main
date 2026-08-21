# Proposal — Chunk D: Leaflet map migration

> Child of [`../analytics-expansion/proposal.md`](../analytics-expansion/proposal.md) (umbrella). Shared context — problem inventory, decomposition, decisions **D-1…D-7** — lives there and is **not restated here**.
>
> ✅ **The only parallel-safe chunk.** It shares no files with A, B, C1 or C2, so it can run in its own worktree alongside Chunk B.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/leaflet-map-migration/` |
| Type | **Change** |
| Approval Mode | `gated` |
| Created | 2026-07-29 |
| Umbrella | `docs/specs/project-dashboard/analytics-expansion/` |
| Depends on | **none** |
| Parallel-safe | **yes** — owns `geo-scope-map.component.*`, `country-centroids.constants.ts`, `package.json`; touches nothing A/B/C own |
| Governing decision | **D-5** — Leaflet renders Mapbox raster tiles; `MapboxGeocodingService` stays |
| Surfaces | **Client only** |

## 2. Intent

Render the geographic-scope map with Leaflet instead of Mapbox GL JS, keeping the visual result and the existing Mapbox account, and dropping ~800 kB from the initial bundle.

## 3. Problem / Current Behavior

Umbrella **P-8**. `geo-scope-map.component.ts:15` imports `mapboxgl, { GeoJSONSource, LngLatBounds, Map as MapboxMap, Popup }` from `mapbox-gl` (`^3.25.0`). The component:

- gates on `environment.mapboxAccessToken` and sets `mapboxgl.accessToken`;
- creates a `MapboxMap` with `GEO_SCOPE_MAP_STYLE`, `center: [0, 20]`, `zoom: 1.2`, `attributionControl: true`;
- adds `NavigationControl` (no compass);
- on `load`, calls `ensureMapLayers()` — a GeoJSON source (`GEO_SCOPE_SOURCE_ID`) + a circle layer (`GEO_SCOPE_LAYER_ID`);
- binds `click` / `mouseenter` / `mouseleave` on the layer id for popups and cursor;
- uses `LngLatBounds` to fit, a `Popup` for tooltips, and a `ResizeObserver` → `map.resize()`.

The requester asked for [Leaflet](https://leafletjs.com/). Leaflet ships **no tiles and no vector-style support**, which is what makes this a real port rather than an import swap — see §5 and D-1's placement rationale.

## 4. Proposed Outcome

The card renders the same points, popups, zoom controls and attribution, driven by Leaflet + Mapbox **raster** tiles authenticated with the existing token. `mapbox-gl` leaves `package.json`. `MapboxGeocodingService` and `environment.mapboxGeocodingUrl` are unchanged.

## 5. Scope

| # | Item | Mapbox GL → Leaflet |
| --- | --- | --- |
| D-1 | Map creation | `new MapboxMap({container, style, center, zoom})` → `L.map(el, {center: [20, 0], zoom: 1.2})` — **note the coordinate order flips**: Mapbox is `[lng, lat]`, Leaflet is `[lat, lng]`. See D-R1. |
| D-2 | Basemap | `GEO_SCOPE_MAP_STYLE` (vector style URL) → `L.tileLayer` against Mapbox **raster** tiles with the existing token. The vector style must be re-expressed as a raster style id; visual parity is a review item, not a given. |
| D-3 | Points | GeoJSON source + circle layer (`GEO_SCOPE_SOURCE_ID` / `GEO_SCOPE_LAYER_ID`) → `L.geoJSON` with `pointToLayer: L.circleMarker`, radius/colour from the same `getGeoScopeMaxCount()` scaling. `buildGeoScopeFeatureCollection` output is plain GeoJSON and is **reused unchanged**. |
| D-4 | Popups | `Popup` → `L.popup` / `bindPopup`, reusing `buildGeoScopePopupHtml` verbatim (already escapes via `escapeHtml`). |
| D-5 | Fit bounds | `LngLatBounds` → `L.latLngBounds` + `fitBounds`. |
| D-6 | Controls | `NavigationControl({showCompass:false})` → `L.control.zoom`; preserve `attributionControl` with Mapbox attribution (D-5 requires it). |
| D-7 | Events | layer-scoped `map.on('click', LAYER_ID, …)` → per-feature handlers in `onEachFeature`. **The event model differs**: Leaflet has no layer-id-scoped map events. See D-R2. |
| D-8 | Resize | `ResizeObserver` → `map.invalidateSize()` instead of `map.resize()`. |
| D-9 | Dependencies | remove `mapbox-gl`; add `leaflet` + `@types/leaflet`; import `leaflet/dist/leaflet.css`; re-check `angular.json` budgets. |
| D-10 | Token gate | `hasMapboxToken` guard and the `mapError` empty state preserved. |
| D-11 | Specs | rewrite `geo-scope-map.component.spec.ts` against a Leaflet test double; **`geo-scope-map.util.spec.ts` must keep passing untouched** — proof the port did not leak into the pure helpers. |

## 6. Non-Goals

- **Geocoding** — `MapboxGeocodingService`, `mapboxGeocodingUrl` and `country-centroids` centroid lookup are untouched (D-5).
- The **top-5 / top-3 geocoding limiter** — that is **D-1 in Chunk A**, deliberately placed in `GeoScopeCardComponent` so this chunk can rewrite `geo-scope-map.component.ts` without colliding. **Do not add it here.**
- Removing the Mapbox account or token.
- New map features (clustering, choropleth, drill-down from the map).
- Changing `GeoScopeCountry` / `GeocodedLocation` interfaces or the util layer.

## 7. Affected Users, Systems, And Specs

| Area | Detail |
| --- | --- |
| Modified | `geo-scope-map.component.{ts,html,scss,spec.ts}`, `shared/constants/country-centroids.constants.ts` (style/layer constants), `package.json`, possibly `angular.json` budgets + global styles for Leaflet CSS |
| Reused unchanged | `shared/utils/geo-scope-map.util.ts` + its spec, `mapbox-geocoding.service.ts`, `geo-scope.interface.ts` |
| **Not touched** | `geo-scope-card.component.*` — Chunk A owns it (D-1). **Hard boundary.** |
| Docs | `docs/ux-ui/design.md` decisions log — map library swap + tile provider (D-5) |

## 8. Visual Reference

- **Source:** the umbrella's screenshot shows the current Mapbox map (bottom-left of the dashboard).
- **Location:** conversation attachment.
- **Notes:** The target is **visual parity**, so no new mockup is needed — but before/after screenshots at the same zoom belong in the validation evidence, since D-2 swaps a vector style for a raster one and drift there is the likeliest cosmetic regression.

## 9. Requirement Delta Preview

### ADDED
- `leaflet` + `@types/leaflet`; Leaflet CSS; `L.tileLayer` basemap; `circleMarker` points; `onEachFeature` handlers.

### MODIFIED
- `geo-scope-map.component.ts` rewritten against the Leaflet API; constants for style/layer re-expressed; bundle budgets improve.

### REMOVED
- `mapbox-gl` from `package.json` and all its imports.

## 10. Approach Options

| | **Option 1 — Port in place** (recommended) | **Option 2 — New component, swap, delete old** | **Option 3 — Abstraction layer over both** |
| --- | --- | --- | --- |
| How | Rewrite `geo-scope-map.component.ts` internals; public `countries` input unchanged | Build `geo-scope-leaflet-map.component`, switch the card's usage, delete the old one | A map-provider interface with two implementations |
| Blast radius | One file | Two + a card change — **breaks parallel-safety**, since the card belongs to Chunk A | Three+ files, new indirection |
| Rollback | `git revert` | Keep both temporarily, then clean up | Flip a token |
| Verdict | Cleanest | Touches Chunk A's file — **conflicts** | Over-engineering for a one-time swap |

**Recommended: Option 1.** The component's public surface is a single `countries` input, so the port is fully contained and the card never changes — which is exactly what preserves this chunk's `Parallel-safe: yes`. Option 2 is rejected specifically because switching the card's template would collide with Chunk A.

## 11. Risks, Dependencies, And Open Questions

| ID | Item |
| --- | --- |
| **D-R1** | **Coordinate order inversion.** Mapbox uses `[lng, lat]`; Leaflet uses `[lat, lng]`. GeoJSON is `[lng, lat]` (so `L.geoJSON` handles features correctly on its own), but every **hand-built** `center`/bounds/`circleMarker` position must flip. **The highest-probability defect in this chunk** — a silent flip renders points in the wrong hemisphere and still "works". Needs an explicit test asserting a known country's rendered position. |
| **D-R2** | **Event model differs.** Mapbox's layer-id-scoped `map.on('click', LAYER_ID, cb)` has no Leaflet equivalent; handlers attach per feature via `onEachFeature`. The cursor-change behaviour (`mouseenter`/`mouseleave` on the layer) must be reimplemented per marker. Easy to lose the pointer cursor. |
| **D-R3** | **Vector → raster parity.** `GEO_SCOPE_MAP_STYLE` is a vector style; Leaflet needs raster tiles. Labels, colours and detail at `zoom: 1.2` may differ noticeably. Mitigation: before/after screenshots in validation (§8). |
| **D-R4** | **Leaflet CSS is mandatory** and global. Omitting it produces a broken-looking map (misplaced controls, wrong marker offsets) with no error — a classic silent Leaflet failure. Must be imported and asserted. |
| **D-R5** | **SSR / `window` access.** Leaflet touches `window` at import time. The client is a SPA (no Angular SSR configured), so this is expected to be a non-issue — the child spec must **confirm** rather than assume, since the server package does run SSR for `/admin`. |
| **D-R6** | Bundle budgets should improve, but adding Leaflet CSS to global styles interacts with the component-style budget (8 kB error / 4 kB warning). Verify, don't assume. |
| **D-D1** | No code dependency on A/B/C. **Coordination dependency only:** Chunk A adds the geocoding limiter to the *card*; if that placement is ever changed to the *map* component, this chunk stops being parallel-safe. |
| **D-OQ1** | Which Mapbox raster style id replaces the current vector `GEO_SCOPE_MAP_STYLE`? Resolve in design against visual parity. |
| **D-OQ2** | Keep `L.control.zoom` in the same corner (`top-right`) as today's `NavigationControl`? Default: **yes**. |

## 12. Success Criteria

Umbrella SC-6, SC-7, SC-8 apply. Chunk-specific:

| ID | Criterion |
| --- | --- |
| D-SC1 | No `mapbox-gl` import remains in the built bundle; `leaflet` is present; measured initial bundle drops and stays inside `angular.json` budgets (C-5). |
| D-SC2 | Per D-R1: a fixture country renders at its correct latitude/longitude — asserted numerically, not visually. |
| D-SC3 | Per D-R2: clicking a point opens the popup with the same content as today (`buildGeoScopePopupHtml` output), and hovering shows a pointer cursor. |
| D-SC4 | Zoom control and **Mapbox attribution** are both present (D-5 obligation). |
| D-SC5 | The missing-token path still renders the `mapError` empty state. |
| D-SC6 | Container resize re-renders correctly via `invalidateSize()`. |
| D-SC7 | `geo-scope-map.util.spec.ts` passes **unmodified**, proving the port stayed inside the component. |
| D-SC8 | Before/after screenshots at identical zoom attached to the validation report (D-R3). |
| D-SC9 | `npm test` + `npm run lint` + `npm run s-lint` pass; client coverage floors held. |

## 13. Next Step

Can start immediately — no dependency on Chunk A. Recommended slot: **in parallel with Chunk B**, in its own worktree.

```text
/akili-specify project-dashboard/leaflet-map-migration
```

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
