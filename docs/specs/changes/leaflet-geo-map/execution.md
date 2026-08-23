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


### T-05 — Card grid rebalance (D-GEO-5)

- **Status:** PASS
- **Date:** 2026-08-22
- **Attempts:** 1
- **Requirements Covered:** R-GEO-008 (AC.1, the `AND IT MAY` grid clause, "must NOT modify service"), R-GEO-006 ("keep retry affordance")
- **Files Changed:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.html` (rebalanced grid to `xl:grid-cols-[minmax(320px,1.1fr)_minmax(0,0.9fr)]`)
- **Implementer Verification:**
  - `npm test -- src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.spec.ts --coverage=false`: 7 passed, 7 total (exit code 0)
  - Layout-only check: no `.ts`, service, or list markup changed
- **Reviewer Verdict:** PASS
- **Reviewer Summary:** The implementation exactly matches T-05's scope. It touches only the grid layout classes in `geo-scope-card.component.html`, safely rebalancing the map pane to `1.1fr` (55%, which satisfies the ≥50% requirement) while leaving all other markup, state handling, and retry affordances completely intact.


### T-06 — Mapbox removal sweep

- **Status:** PASS
- **Date:** 2026-08-22
- **Attempts:** 1
- **Requirements Covered:** R-GEO-007 (all ACs + both BUT/MUST clauses), R-GEO-001 (AC.2, "no new npm dependency"), R-GEO-006 (AC.3)
- **Files Changed / Deleted:**
  - `client/research-indicators/package.json` (removed mapbox-gl)
  - `client/research-indicators/package-lock.json` (updated)
  - `client/research-indicators/angular.json` (removed mapbox-gl.css from styles)
  - `client/research-indicators/src/app/shared/services/mapbox-geocoding.service.ts` (deleted)
  - `client/research-indicators/src/app/shared/services/mapbox-geocoding.service.spec.ts` (deleted)
  - `client/research-indicators/src/app/shared/utils/geo-scope-map.util.ts` (deleted)
  - `client/research-indicators/src/app/shared/utils/geo-scope-map.util.spec.ts` (deleted)
  - `client/research-indicators/src/app/shared/constants/country-centroids.constants.ts` (trimmed, retained `PROJECT_DASHBOARD_DEFAULT_LIMIT = 5`)
  - `client/research-indicators/src/app/shared/constants/country-centroids.constants.spec.ts` (updated)
  - `client/research-indicators/src/environments/environment.example.ts` (removed mapbox fields)
- **Implementer Verification:**
  - Grep verification: `git grep -i "mapbox" client/research-indicators/src client/research-indicators/angular.json client/research-indicators/package.json` returned 0 hits (exit code 1)
  - Unit tests: `npm test -- src/app/shared/constants/country-centroids.constants.spec.ts --coverage=false` passed (exit code 0)
  - Production build: `npm run build` succeeded with exit code 0; initial bundle raw size dropped to 1.12 MB (from 1.16 MB); `project-dashboard-component` chunk dropped to 1.03 MB (from 2.62 MB); Mapbox CommonJS warning eliminated
  - Archive untouched: `docs/specs/archive/**` intact
- **Reviewer Verdict:** PASS
- **Reviewer Summary:** The diff cleanly removes all specified Mapbox artifacts (dependencies, styles, services, utils, env fields) while preserving `PROJECT_DASHBOARD_DEFAULT_LIMIT` and archive files untouched. The verification evidence confirms zero Mapbox hits, passing tests, and reduced bundle sizes as required.


### T-07 — Gates + generated-output measurements

- **Status:** PASS
- **Date:** 2026-08-22
- **Attempts:** 2 (Attempt 1: requested exact tsc spec count; Attempt 2: 939 errors <= 945 baseline PASS)
- **Requirements Covered:** NFR-GEO-101, NFR-GEO-102, NFR-GEO-103 (tokens half), R-GEO-002 (AC.2), R-GEO-008 (AC.2), requirements §5 type-gate rows
- **Measurements Captured:**
  - Production Build (`npm run build` in `client/research-indicators`): Exit code 0
    - Initial Total: 1.12 MB raw / 261.32 kB transfer (Baseline: 1.16 MB raw / 265.81 kB transfer; Delta: -40 kB raw / -4.49 kB transfer)
    - `project-dashboard-component` chunk: 1.03 MB raw / 275.92 kB transfer (Baseline: 2.62 MB raw / 624.86 kB transfer; Delta: -1.59 MB raw / -348.94 kB transfer)
    - Mapbox CommonJS warning eliminated
  - Sentinel Check in `dist/`: `"ISO_A2"` found in built `chunk-MHME7OSP.js`
  - Full Test Suite (`npm test -- --silent`): 319/319 test suites passed, 6,653/6,653 tests passed (Exit code 0)
    - Coverage: Statements 98.67%, Branches 95.85%, Functions 98.61%, Lines 98.99%
  - Spec Type Gate (`npx tsc -p tsconfig.spec.json --noEmit`): 939 errors (strictly <= 945 baseline; 0 errors in touched files)
  - Design Token Validator (`npm run tokens:validate`): 19 tokens verified, strictly monotonic ramps in light and dark mode, 0 errors
  - Server Tree Diff (`git diff HEAD -- server/`): 0 diff
- **Reviewer Verdict:** PASS
- **Reviewer Summary:** All measurement evidence for T-07 has been correctly provided and verified against the acceptance criteria. The tsc spec error count (939) successfully falls below the 945 baseline, and all build, bundle size, sentinel, test suite, and token validation requirements are met.

---

## Addendum — In-Flight Spec Correction (2026-08-22)

### Scope: Country-Less Reach Fallback (D-GEO-9, R-GEO-006 AC.4)

- **Trigger / Context:** Live testing evidence on project A511 (`GLOBAL 7`, `REGIONAL 3`, `top_countries: []`). When a project has non-empty global or regional scope but zero country-specific results, the outer `geo-scope-card` remains non-empty (`isEmpty() === false`), but the map pane previously rendered a blank dead void. Spec updated in flight to add R-GEO-006 Scenario country-less + AC.4 and D-GEO-9 (static pane-level fallback in the standard empty idiom; outer card intact).
- **Files Changed:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.ts` (emits null options/tableModel when `hasData()` is false)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.html` (`@if (hasData())` renders `<app-viz-chart>`; `@else` renders static pane fallback with `pi-globe` and `"No country-level data — this project's reach is global/regional."`)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.spec.ts` (AC.4 DOM fallback assertion + KZ-015 empty-to-data transition test)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.spec.ts` (AC.4 fixture test: `isEmpty()` is false for `{ global: 7, regional: 3, top_countries: [] }`)
  - `docs/specs/changes/leaflet-geo-map/tasks.md` (updated T-04 done-checks, coverage matrix AC.4 row, T-08 two-contract check)

### Named Failing Input Proof (K-012 / K-004 / KZ-014)

- **Probe Inversion:** Inverted the `hasData` guard in `geo-scope-map.component.ts` by setting `readonly hasData = computed(() => true);` (forcing unconditional chart mounting and bypassing the pane fallback).
- **Verification Command:** `npm test -- src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.spec.ts --coverage=false`
- **Observed Verbatim Red Failure (Exit code 1):**

```text
FAIL src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.spec.ts
  GeoScopeMapComponent (R-GEO-001, R-GEO-002, R-GEO-004, R-GEO-005, R-GEO-006)
    KZ-015 Transition fixture & Initial empty state (R-GEO-006 / AC.4 / D-GEO-9)
      ✕ constructs in empty state with static pane fallback in DOM and no chart options (AC.4 / D-GEO-9) (300 ms)
      ✕ transitions from empty initial state to populated input and renders chart, removing fallback (KZ-015 / AC.4) (31 ms)

  ● GeoScopeMapComponent (R-GEO-001, R-GEO-002, R-GEO-004, R-GEO-005, R-GEO-006) › KZ-015 Transition fixture & Initial empty state (R-GEO-006 / AC.4 / D-GEO-9) › constructs in empty state with static pane fallback in DOM and no chart options (AC.4 / D-GEO-9)

    expect(received).toBe(expected) // Object.is equality

    Expected: false
    Received: true

      48 |       fixture.detectChanges();
      49 |
    > 50 |       expect(component.hasData()).toBe(false);
         |                                   ^
      51 |       expect(component.options()).toBeNull();
      52 |       expect(component.tableModel()).toBeNull();
      53 |       expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();

  ● GeoScopeMapComponent (R-GEO-001, R-GEO-002, R-GEO-004, R-GEO-005, R-GEO-006) › KZ-015 Transition fixture & Initial empty state (R-GEO-006 / AC.4 / D-GEO-9) › transitions from empty initial state to populated input and renders chart, removing fallback (KZ-015 / AC.4)

    expect(received).not.toBeNull()

    Received: null

      62 |       // 1. Initial country-less state
      63 |       fixture.detectChanges();
    > 64 |       expect(fixture.nativeElement.querySelector('[data-testid="geo-scope-map-fallback"]')).not.toBeNull();
         |                                                                                                 ^
      65 |       expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeNull();

Test Suites: 1 failed, 1 total
Tests:       2 failed, 7 passed, 9 total
```

### Green Verification Evidence (Post-Restoration)

- **Command:** `npm test -- src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.spec.ts src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.spec.ts src/app/shared/utils/geo-choropleth.util.spec.ts --coverage=false`
- **Output:** Exit Code 0 (3/3 suites passed, 31/31 tests passed).
- **Production Build:** `npm run build` in `client/research-indicators` succeeded with exit code 0 (Initial total: 1.12 MB raw / 261.35 kB transfer; `project-dashboard-component` chunk: 1.02 MB raw / 272.78 kB transfer).
- **Status:** PASS

---

## Addendum #2 — In-Flight Spec Correction (2026-08-22)

### Scope: Degenerate Domain Shading & Bounded Pane Height (D-GEO-10, D-GEO-11, R-GEO-002 AC.4, R-GEO-008)

- **Trigger / Context:** Live testing evidence from single-country results (Kenya count 1) showed that a scale starting at `min: 1` collapsed the single count onto the faint floor stop (`ramp[0]`), making it visually indistinguishable from the neutral base. In addition, unbounded height in chart and fallback left dead vertical space below the left column. Spec corrected with D-GEO-10 (`visualMap.min = 0`, scaling 0→maxCount so degenerate values map to saturated ramp stops), D-GEO-11 (bounded 360px height for both chart and fallback), R-GEO-002 AC.4, and R-GEO-008 bounded height clause.
- **Files Changed:**
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.ts` (configured `visualMap.min = 0, max = maxCount` per D-GEO-10)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.html` (set `height="360px"` on `<app-viz-chart>` and `h-[360px]` on fallback div per D-GEO-11)
  - `client/research-indicators/src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.spec.ts` (added R-GEO-002 AC.4 degenerate fixture test, updated min: 0 expectation)
  - `docs/specs/changes/leaflet-geo-map/tasks.md` (updated T-04 done-checks, coverage matrix, and T-08 checks)

### Named Failing Input Proof (K-012 / K-004 / KZ-014)

- **Probe Execution:** Added AC.4 degenerate domain test for fixture `[{ iso_alpha_2: 'KE', count: 1 }]` expecting `min: 0, max: 1` and ran against the un-fixed code (`min: 1, max: 2`).
- **Command:** `npm test -- src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.spec.ts --coverage=false`
- **Observed Verbatim Red Failure (Exit code 1):**

```text
FAIL src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.spec.ts
  GeoScopeMapComponent (R-GEO-001, R-GEO-002, R-GEO-004, R-GEO-005, R-GEO-006)
    Generated ECharts option structure (KZ-001 / R-GEO-001, R-GEO-002, D-GEO-6, D-GEO-7, D-GEO-8)
      ✕ resolves single-country degenerate fixture to saturated ramp stop and min 0 (R-GEO-002 AC.4 / D-GEO-10) (18 ms)

  ● GeoScopeMapComponent (R-GEO-001, R-GEO-002, R-GEO-004, R-GEO-005, R-GEO-006) › Generated ECharts option structure (KZ-001 / R-GEO-001, R-GEO-002, D-GEO-6, D-GEO-7, D-GEO-8) › resolves single-country degenerate fixture to saturated ramp stop and min 0 (R-GEO-002 AC.4 / D-GEO-10)

    expect(received).toBe(expected) // Object.is equality

    Expected: 0
    Received: 1

      137 |       const opts = component.options() as any;
      138 |       expect(opts).not.toBeNull();
    > 139 |       expect(opts.visualMap.min).toBe(0);
          |                                  ^
      140 |       expect(opts.visualMap.max).toBe(1);
      141 |       expect(opts.series[0].data).toEqual([{ name: 'KE', value: 1 }]);
      142 |     });

Test Suites: 1 failed, 1 total
Tests:       1 failed, 9 passed, 10 total
```

### Green Verification Evidence (Post-Fix)

- **Command:** `npm test -- src/app/pages/platform/pages/project-detail/components/geo-scope-map/geo-scope-map.component.spec.ts src/app/pages/platform/pages/project-detail/components/geo-scope-card/geo-scope-card.component.spec.ts src/app/shared/utils/geo-choropleth.util.spec.ts --coverage=false`
- **Output:** Exit Code 0 (3/3 suites passed, 32/32 tests passed).
- **Status:** PASS



