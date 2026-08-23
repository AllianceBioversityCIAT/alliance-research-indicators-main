# Archive Summary — Changes / Geo Map Replacement (`leaflet-geo-map`)

**Outcome:** shipped. The project-dashboard geo card now renders an ECharts choropleth (SVG, bundled Natural Earth geometry, zero new npm deps) on the existing `viz-chart` wrapper; Mapbox is fully removed (−1.59 MB raw off the dashboard chunk). Country-less reach shows a static pane fallback; degenerate single-count domains shade at a saturated stop; pane bounded at 360 px.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/leaflet-geo-map` |
| Type / Depth | Change · Standard (Option C — ECharts-geo; Leaflet documented fallback, unused) |
| Approval Mode | gated |
| Owner | j.cadavid@cgiar.org |
| Executed by | Antigravity session (Leader T1) · specified by Claude session |
| Archived by | Claude (Fable 5) · `bilateral-visual-improvements` worktree |
| Branch Context | **spec branch** — no shared-file writes; pending items only |

## 2. Original Spec Path

`docs/specs/changes/leaflet-geo-map/` → `docs/specs/archive/2026-08-23-changes--leaflet-geo-map/`

## 3. Archive Date

2026-08-23

## 4. Final Status

| Gate | Result |
|---|---|
| Tasks | T-01…T-08 all PASS · 40/40 checkboxes · attempts: T-07 ×2, rest ×1 |
| Budget (8 tasks · ~650 LOC · 1–2 review rounds) | respected |
| In-flight corrections | 2 addenda (D-GEO-9 fallback; D-GEO-10/11 min-0 + bounded height), both with verbatim K-012 red proofs |
| `test-report.md` | absent — **accepted**: frontend-unit evidence per task + full suite 6,653/6,653 in T-07 |
| `validation-report.md` | absent — **accepted**: T-08 HITL + owner confirmation (Addendum #3) |
| Unresolved FAIL | none |

## 5. Requirements Delivered

| Requirement | Status | Evidence |
|---|---|---|
| R-GEO-001 — ECharts choropleth, no config path, zero external requests, no new deps | delivered | T-04, T-06 grep 0 hits, T-08 network panel |
| R-GEO-002 — count shading, monotonic ramp, visible at any count (AC.4 degenerate) | delivered | T-02/T-04 option asserts, Addendum #2 red→green, T-08 visual |
| R-GEO-003 — alpha-2 join + exceptions map + fixture coverage | delivered | T-01/T-02 (249-code fixture, 14 tests) |
| R-GEO-004 — theme-correct tokens (`--ac-viz-ramp-*`, greys) | delivered | T-04, T-07 `tokens:validate` 19 tokens monotonic |
| R-GEO-005 — `viz-chart` contract intact (`tableModel`, sr-only table) | delivered | T-03/T-04, T-08 sr-only check |
| R-GEO-006 — states incl. country-less fallback (AC.4/D-GEO-9) | delivered | Addendum #1 red→green; live fallback confirmed by owner (Addendum #3) |
| R-GEO-007 — Mapbox removal sweep | delivered | T-06 (deps, styles, services, utils, env.example) |
| R-GEO-008 — card grid rebalance + bounded pane height (D-GEO-11) | delivered | T-05, Addendum #2, T-08 |
| NFR-GEO-101/102/103/104 | delivered | T-07 measurements: initial 1.16→1.12 MB raw; dashboard chunk 2.62→1.03 MB raw; tsc 939 ≤ 945; contrast + a11y at T-08 |

## 6. Files Changed Summary

| Area | Change |
|---|---|
| `geo-scope-map/` component | rewritten as ECharts choropleth presenter (+`world-countries.geo.json` ~207 kB CC0 + README provenance, new 10-test spec) |
| `shared/utils/geo-choropleth.util.ts` (+spec) | new pure join/exceptions/tableModel/max-count (14 tests) |
| `viz-chart.component.ts` (+3 sibling spec mocks) | registered `MapChart`, `GeoComponent` at the single `echarts.use` site |
| `geo-scope-card.component.html` | grid rebalance `xl:grid-cols-[minmax(320px,1.1fr)_minmax(0,0.9fr)]` |
| Mapbox removal | `mapbox-gl` dep + css, `mapbox-geocoding.service.*`, `geo-scope-map.util.*` deleted; centroids trimmed to `PROJECT_DASHBOARD_DEFAULT_LIMIT`; `environment.example.ts` cleaned |
| `tsconfig.json` | `resolveJsonModule: true` |

Commits: `652f5396`, `60b44aa0`, `9145eed0`, `20e8473b` (+ execution-phase commits), all `[SPEC:changes/leaflet-geo-map]`-tagged.

## 7. Test Evidence Summary

| Check | Result |
|---|---|
| Full suite (`npm test -- --silent`, T-07) | 319/319 suites, 6,653/6,653 tests, exit 0 |
| Targeted suites per task (`--coverage=false`, K-020) | green per execution.md |
| K-012 red proofs | 3 verbatim reds on record: fallback guard inversion, degenerate `min` expectation, plus T-01 TS2307 probe |
| Generated-output gates (KZ-001) | `"ISO_A2"` sentinel found in built `dist/` chunk; option-object asserts |
| Type gate | `npx tsc -p tsconfig.spec.json --noEmit` 939 ≤ 945 baseline |
| Tokens | `npm run tokens:validate` 0 errors, monotonic both themes |
| Declared limits (KZ-017) | KE-count-1 saturation proven at option level, visually analogized on Colombia count 2 (Addendum #3) |

## 8. Validation Summary

No `validation-report.md`. Reviewer PASS on all 8 tasks (1 rework: T-07 attempt 1 lacked the exact tsc count). T-08 HITL on A511 (both themes, network panel, 360 px bound); live fallback confirmed by owner at archive (Addendum #3). Accepted.

## 9. Accepted Warnings Or Follow-Ups

| Item | Disposition |
|---|---|
| T-08 two-contract evidence half-recorded (A511 changed shape on Testing; fallback contract unnamed) | Closed by owner confirmation at archive — Addendum #3. Kaizen: KZ-014 recurrence noted |
| "COUNTRI…" summary label truncation | Pre-existing, reported as finding, out of scope (per T-08 check) — candidate `/akili-quick` |
| Local untracked `environment.ts`/`environment.dev.ts` keep dead `mapbox*` fields | Machine-local only; delete at leisure (example file is clean) |
| Leaflet fallback path (design) | Never needed; documented in design.md for posterity |

## 10. Historical Notes

- Proposal offered Leaflet (A), Mapbox-keep (B), ECharts-geo (C); user approved **C** for zero-dependency weight.
- Two live-evidence correction rounds mid-execution (this session authored the briefs, agy executed): country-less fallback (A511 `GLOBAL 7 / REGIONAL 3 / []`), then min-0 degenerate shading + 360 px bound (Kenya count 1 screenshots).
- Shared Testing data proved mutable mid-spec: A511 was the fallback exemplar on 08-22 and had Colombia count 2 by T-08 on 08-23.
- The dashboard chunk shrank 61% raw (2.62→1.03 MB) — the single largest client-size win recorded in this repo's spec history.
