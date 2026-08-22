# Execution Log — Changes / Geo Map Replacement (`leaflet-geo-map`)

- **Module:** changes (STAR client — `project-detail` dashboard, shared `viz-chart`)
- **Spec id:** 2026-08-leaflet-geo-map
- **Started:** 2026-08-22
- **Status:** in-progress
- **Approval Mode:** gated
- **Leader:** Antigravity (T1 orchestration)

---

## Baseline Measurements (2026-08-22)

- Command: `npm run build` in `client/research-indicators`
- **Initial Total:** 1.16 MB raw / 265.81 kB transfer
- **`project-dashboard-component` (`chunk-FBSRSW6P.js`):** 2.62 MB raw / 624.86 kB transfer

---

## Task Execution History


### T-01 — Geometry asset, license note, fixture, baseline measurements

- **Status:** PASS
- **Date:** 2026-08-22
- **Attempts:** 1
- **Requirements Covered:** R-GEO-003 (AC.2 fixture half), NFR-GEO-101 (baseline half), NFR-GEO-104
- **Files Changed / Created:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/world-countries.geo.json` (created: ~207 kB simplified Natural Earth 1:110m GeoJSON)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/world-countries.README.md` (created: source, CC0/PD license, simplification, quirks)
  - `client/research-indicators/src/app/testing/fixtures/clarisa-country-codes.fixture.ts` (created: CLARISA_COUNTRY_CODES_FIXTURE with 249 ISO-3166-1 alpha-2 codes)
  - `client/research-indicators/tsconfig.json` (modified: resolveJsonModule: true)
- **Implementer Verification:**
  - Baseline size: Initial total 1.16 MB raw / 265.81 kB transfer; project-dashboard lazy chunk 2.62 MB raw / 624.86 kB transfer
  - `npm run build` in `client/research-indicators`: exit code 0
  - Failing input (K-004): Verified TS2307 on invalid JSON import path
- **Reviewer Verdict:** PASS
- **Reviewer Summary:** The implementation fulfills all T-01 acceptance criteria. The baseline sizes are properly recorded, the geometry asset and its README contain the required provenance and properties (ISO_A2), the CLARISA fixture is added, and `resolveJsonModule: true` is enabled in the client's `tsconfig.json` with verification evidence included.


### T-02 — geo-choropleth.util.ts + spec (join, exceptions, tableModel)

- **Status:** PASS
- **Date:** 2026-08-22
- **Attempts:** 1
- **Requirements Covered:** R-GEO-003 (AC.1, AC.2 test half, AC.3, both BUT/MUST clauses), R-GEO-005 (AC.1 tableModel completeness), R-GEO-002 (monotonic max-count input)
- **Files Changed / Created:**
  - `client/research-indicators/src/app/shared/utils/geo-choropleth.util.ts` (created: pure join, exceptions, tableModel, max count functions)
  - `client/research-indicators/src/app/shared/utils/geo-choropleth.util.spec.ts` (created: 14 unit tests including fixture coverage and K-004 failing input check)
- **Implementer Verification:**
  - `npm test -- src/app/shared/utils/geo-choropleth.util.spec.ts --coverage=false`: 14 passed, 14 total (exit code 0)
  - Grep verification: `country_name` never used as join key
  - Failing input check (K-004): Verified fake code `'XX'` fails coverage test
- **Reviewer Verdict:** PASS
- **Reviewer Summary:** The `geo-choropleth.util.ts` and its spec accurately implement the required ISO alpha-2 extraction, exceptions mapping, table model generation, and monotonic maximum count logic. The coverage test effectively uses a set of known unmapped microstates to validate the CLARISA fixture against the world geometry.
- **Reviewer Advisory:**
  - *Readability:* The tracking of `KNOWN_UNMAPPED_MICROSTATES` in the spec file is a clean way to satisfy the AC.2 test gate without polluting the production exceptions map with dead entries.
  - *Reliability:* `buildGeoChoroplethSeriesData` returns `{ name: mappedCode, value: country.count }`. If T-04 needs the full country name in the tooltip formatter, T-04 can carry `country_name` or handle lookup in the formatter closure.


### T-03 — viz-chart registration extension + sibling mock updates

- **Status:** PASS
- **Date:** 2026-08-22
- **Attempts:** 1
- **Requirements Covered:** R-GEO-005 (AC.2 wrapper contract intact), requirements §5 "broken echarts mocks" defect class
- **Files Changed:**
  - `client/research-indicators/src/app/shared/components/viz-chart/viz-chart.component.ts` (extended echarts.use with MapChart, GeoComponent; extended EChartsOption union)
  - `client/research-indicators/src/app/shared/components/viz-chart/viz-chart.component.spec.ts` (updated jest.mock for echarts/core)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/results-trend-card/results-trend-card.component.spec.ts` (updated jest.mock for echarts/core)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/sp-alignment-graph/sp-alignment-graph.component.spec.ts` (updated jest.mock for echarts/core)
- **Implementer Verification:**
  - Unit tests: 35/35 passed across the 3 suites (exit code 0)
  - `npm run build` in `client/research-indicators`: exit code 0
  - Failing input check (K-004): Verified mock isolation and `registerMap`/`getMap` requirements
- **Reviewer Verdict:** PASS
- **Reviewer Summary:** The diff successfully registers `MapChart` and `GeoComponent` with ECharts and correctly extends the `EChartsOption` union in `viz-chart.component.ts`. The sibling test mocks have been updated to include `registerMap` and `getMap`, preventing import-time failures. Verification evidence is complete and all requirements (R-GEO-005 AC.2, defect class prevention) hold without modifying the wrapper contract.


### T-04 — Rewrite geo-scope-map component (+ new spec)

- **Status:** PASS
- **Date:** 2026-08-22
- **Attempts:** 1
- **Requirements Covered:** R-GEO-001 (config-error path removal), R-GEO-002 (AC.1, both BUT/MUST clauses), R-GEO-004 (AC.1, both BUT/MUST clauses), R-GEO-005 (AC.2, `BUT NOT requireTable=false`), R-GEO-006 (AC.1, AC.2, "must NOT blank pane")
- **Files Changed / Created:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.ts` (rewritten: ECharts choropleth presenter, idempotent map registration, chartTokens ramp, tableModel)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.html` (rewritten: viz-chart host template)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.scss` (rewritten: standard host styling)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.spec.ts` (created: 8 comprehensive unit tests)
- **Implementer Verification:**
  - `npm test -- src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.spec.ts src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.spec.ts --coverage=false`: 16 passed, 16 total (exit code 0)
  - KZ-015 transition fixture verified (empty init -> data transition)
  - KZ-001 output asserted on generated option object
  - Mapbox strings verified removed
- **Reviewer Verdict:** PASS
- **Reviewer Summary:** The diff successfully rewrites `geo-scope-map.component` to render an ECharts choropleth map. All criteria from R-GEO-001, R-GEO-002, R-GEO-004, R-GEO-005, and R-GEO-006 hold.
- **Reviewer Advisory:**
  - *Resilience:* `ensureWorldMapRegistered` executes safely behind a typeof safeguard, avoiding module collision.
  - *Readability:* The separation of computing layout structure, data payload, and exceptions map provides declarative logic paths.

