# Design — project-detail / Project Dashboard Redesign

- **Module:** project-detail (client) + agresso-contract (server)
- **Spec id:** 2026-08-project-dashboard-redesign
- **Status:** draft
- **Owner:** j.cadavid@cgiar.org
- **Linked requirements:** ./requirements.md
- **Linked TRD:** ../../../trd/trd.md §4.2 (client modules), §6 (envelope), §8 (frontend architecture)
- **Visual reference:** ./mockup/ (approved canvas, 2 artboards)
- **Last updated:** 2026-08-21

---

## 1. Goals & non-goals

**Goals** (map to requirements):
1. One SQL-aggregated summary endpoint replaces the client-side 10k-row count (R-PD-001, R-PD-003).
2. Real, accessible, theme-reactive visualizations incl. the missing time dimension (R-PD-004, R-PD-005, R-PD-009).
3. Full token conformance on the route → dark mode works (R-PD-006).
4. Unified skeleton/error/empty pattern on all seven data regions (R-PD-002, R-PD-007).
5. Analytics-first hierarchy with drill-throughs instead of dead ends (R-PD-008).

**Non-goals:** consolidating the per-card report services (`get-top-*` ×4, `get-geo-scope`, `get-contract-staff` — proposal P11, deferred); changing the standalone Results Center's contract-clearing behavior; Mapbox replacement; any schema/migration; AI-grounding functionality changes.

---

## 2. Architecture

Cross-checked (KZ-016) against every `BUT`/`AND IT MUST` clause in requirements §3 and against the touched modules' own constraints (agresso-contract's raw-SQL repository pattern; the client child guide's no-hex / no-`isDarkMode()`-branching rules; `all-modals` overlay rule — see D-PD-6 for why no new modal is added).

### 2.1 Server slice (agresso-contract module — extend, not new)

The **six** sibling `reports/*` endpoints (levers, contributors, contacts, staff, partners, geo-scope) set the pattern this feature copies exactly: controller (`@Get('reports/…')`, `contract-id` query param, `ApiContractReportQueries` decorator) → thin service pass-through → repository method with **raw parameterized SQL** reusing `buildPrimaryContractResultsSubquery()` (which enforces `is_primary = TRUE`, `is_active`, `is_snapshot = FALSE` — R-PD-001's `BUT` clause **plus** primary-only scoping, a declared count change vs. today's any-link chart; judgment SU1 / D-PD-12).

New repository method runs three grouped queries (status: **LEFT-join** `result_status` for `name`, with `result_status_id IS NULL` in an explicit "No status" bucket — judgment SU2; year: group by `report_year_id` directly, **no join** — the FK's value is the year itself, `report_years`' PK; partners: `COUNT(DISTINCT institution)` over partner-role `result_institutions` links of the same subquery — feeds the 4th KPI, judgment S2) and derives `total` such that both bucket sums equal it. Three-query stitching has precedent in `getGeoScopeReport`. Null-year rows likewise get an explicit bucket (AC.2 — never dropped).

**Composition (new/changed files):**
- `src/domain/entities/agresso-contract/agresso-contract.controller.ts` — add `GET reports/results-summary` handler + Swagger.
- `src/domain/entities/agresso-contract/agresso-contract.service.ts` — pass-through method.
- `src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts` — `getResultsSummaryReport(contractId)`.
- `src/domain/entities/agresso-contract/dto/contract-results-summary-report.dto.ts` — response DTO with `ApiProperty`.
- Sibling spec files (controller/service/repository) — extended, matching the existing mock style; the repository spec **asserts on the generated SQL text + bound params** (the KZ-001/KZ-017 answer to "mocked query builders can't represent SQL semantics": the property lives in the SQL string, so assert it there; semantic cross-check happens once on Dev per R-PD-001's correctness scenario).

### 2.2 Client slice (project-detail feature + minimal shared additions)

```
pages/platform/pages/project-detail/
├── project-detail.component.{ts,html}        # shell: hex→tokens; consume shared project service;
│                                             # read drill-through queryParams (statusTab/indicatorTab)
└── components/
    ├── project-dashboard/                    # restructured template: caveat line, KPI strip,
    │   project-dashboard.component.{ts,html} # charts grid, geo, pending table, collapsed AI block
    ├── project-dashboard-card/               # tokens + p-skeleton loading state (shared pattern)
    ├── results-trend-card/                   # NEW — p-chart line (chart.js), lazy-confined
    ├── geo-scope-card/ geo-scope-map/        # tokens only
shared/
├── components/section-header/                # TOUCHED — 4th GET_ResultsCount invocation pair moves to the
│                                             # shared service; its 8 template hex literals join the token pass
│                                             # (renders on every platform route — judgment W4/JB-7)
├── services/
│   ├── api.service.ts                        # + GET_ContractResultsSummary
│   ├── get-project-detail.service.ts         # NEW — shared fetch, per-navigation dedupe keyed BY CONTRACT ID
│   │                                         #   + invalidate(id) (3 components / 4 invocations; D-PD-7/D-PD-10)
│   ├── get-contract-results-summary.service.ts # NEW — same signal-triple shape as get-top-* siblings
│   └── dark-mode.service.ts                  # isDarkMode: boolean → signal (readonly exposure; service stays sole writer)
├── utils/chart-tokens.util.ts                # NEW — resolves --ac-* CSS vars via getComputedStyle (D-PD-5)
├── constants/project-dashboard-chart-colors.constants.ts # REPLACED by token-name maps (no hex)
└── interfaces/contract-results-summary.interface.ts       # NEW
src/styles/colors.scss                        # + new `--ac-viz-*` chart-token family, light AND dark values (D-PD-13)
client/research-indicators/README.md          # token registry mirror (child-guide rule)
docs/ux-ui/design.md §7                       # token registry mirror (same change)
pages/platform/pages/results-center/
└── results-center.service.ts                 # + initializeScopedResultsTable(contractId, {statusIds?, indicatorId?})
                                              #   (generalizes initializeProjectDashboardResultsTable, which delegates to it)
```

### 2.3 Reuse

`ApiService`/`ToPromiseService`, `MainResponse<T>` handling, `p-skeleton` (established inline pattern), `app-custom-progress-bar` (kept where already used), `results-center-table` + `ResultsCenterService` filter composition (`applyStatusFilterFromHomeLink`, `onSelectFilterTab`, `primaryContractId`), Home's queryParams-navigation precedent (`data-overview.component`), token utilities (`.abc-*`, `.atc-*`, `.fs-*`), canonical typography classes.

---

## 3. Data model

No data model changes. No migrations. Reads existing `results`, `result_contracts`, `result_status`, `result_institutions` (the year is grouped from `results.report_year_id` directly — its value is `report_years`' PK, so no join; judgment W8).

---

## 4. API surface

### GET /api/v1/agresso/contracts/reports/results-summary

- **Controller:** `agresso-contract.controller.ts`
- **Roles:** none (any authenticated user — mirrors all six sibling reports; verified: no `@Roles` on any of them)
- **Guards:** global `JwtMiddleware` only
- **Query params:** `contract-id` (required, string) — via `ApiContractReportQueries` (no `limit`; payload is inherently bounded)
- **Response data shape:** `{ total: number; by_status: Array<{ status_id: number | null; name: string; count: number }>; by_year: Array<{ year: number | null; count: number }>; partner_institutions: number }`
- **Swagger:** `@ApiOperation` + decorator above; `@ApiTags`/`@ApiBearerAuth` inherited from the class
- **Errors:** 400 `contract_id is required` (empty param, matching siblings); 401 standard envelope; unknown contract → empty buckets with `total: 0` (sibling behavior, R-PD-001)
- **Notes:** counts scoped to primary-contract, active, non-snapshot results via the shared subquery.

No changes to existing endpoints. Client-side, the dashboard's bulk `GET results (limit 10_000)` call is deleted.

---

## 5. Workflows & business rules

1. **Dashboard load:** route effect resolves `contractId` → shared `GetProjectDetailService.load(id)` (cache hit if the shell already fetched) + `GetContractResultsSummaryService.main(id)` + existing top-* /geo services. Each region renders skeleton until its own source resolves (R-PD-007); regions are independent (a failure never blocks siblings).
2. **Status/indicator drill-through (reworked per judgment S3):** row click → `router.navigate(['/project-detail', id], { queryParams: { statusTab | indicatorTab } })`. The shell **cannot** read these at `ngOnInit` — the parent component survives a child→parent navigation on the same `:id` (no re-init; no `RouteReuseStrategy`/`onSameUrlNavigation` override exists). Instead the shell subscribes to `route.queryParamMap` (fires on every same-component navigation, `takeUntilDestroyed`): on receiving a drill param it (a) ensures the Project Results tab is active (the existing `NavigationEnd`→`getLastSegment()` flow shows the tab), (b) calls the new generic `initializeScopedResultsTable(contractId, { statusIds? , indicatorId? })` — which internally resets state **after** any reset-guard logic and applies the scoped filter, explicitly overriding the dashboard's fixed pending-revision state — and (c) strips the params (`replaceUrl`, results-center precedent). The `isOnlyPendingRevisionStatusFilter()` reset guard MUST NOT discard a status-5 drill-through: the queryParam path bypasses that guard by design (it exists to clear *stale dashboard* state, and the param is an explicit user intent). The scoped table request carries the **primary-contract flag** so its numbers match the chart's primary-scoped counts (D-PD-12). **Not** the standalone `/results-center`: that page structurally clears `primaryContractId` on init (D-PD-4).
3. **Theme rendering (reframed per judgment S4):** the page renders correctly under whatever `data-theme` the document carries at load; `DarkModeService`'s private `isDarkMode` becomes a signal exposed readonly (the service — sole writer via `applyTheme` — updates it in `toggleDarkMode`/`loadThemePreference`; its existing public `isDarkModeEnabled()` is preserved delegating to the signal). `chart-tokens.util` resolves `--ac-viz-*` variables from `getComputedStyle(document.documentElement)` inside a `computed` keyed on that signal, so canvas series re-resolve if the attribute ever flips at runtime. **Known platform gaps, out of this spec's scope, recorded for archive:** no UI in `src/` currently invokes the toggle (the navbar only injects the service), and PrimeNG's `darkModeSelector` is `.dark-mode` (app.config.ts) which nothing sets — so this route must not depend on PrimeNG chrome for any contrast-bearing surface; skeleton/chart surfaces are token-styled wrappers. In jsdom, `getComputedStyle` returns `''` for custom properties: the util's contract is that tests assert the **requested token names**, never resolved values (visual correctness belongs to gate D6), and empty resolution never falls back to a hex literal. No component branches on theme for color decisions (child-guide rule).
4. **View all (ranked cards):** in-card expansion re-invoking the card's existing service with the server's max limit (100, `normalizeReportLimit` cap); collapse restores top-4. No new modal (D-PD-6).
5. **Retry:** each region's error state re-invokes only its own service `update()`.
6. No audit, Socket.IO, RabbitMQ, OpenSearch, or DynamoDB side effects anywhere in this spec.

---

## 6. Frontend component architecture (STAR)

| Concern | Decision |
|---|---|
| **Status composition** | Semantic HTML (flex segments + labeled rows) with token utility classes — *not* canvas. Auto-theming, matches the approved mockup. 2px gaps between segments; label+count+% per row (never color-alone). **A11y (judgment W3):** the region carries `role="img"` + an `aria-label` summarizing the split, and the labeled breakdown is marked up as the accessible data alternative (list/table semantics) — explicitly declared as R-PD-009's table alternative for this chart. No `title=`-only information anywhere (existing `[title]` bindings replaced by visible text/tooltip-with-focus). |
| **Indicator bars** | Semantic HTML ranked bars, single hue (`--ac-viz-series-1`), count per row, `<a>` rows for drill-through with visible focus. Same a11y contract as the status region: `role="img"` container label + the rows as the accessible data alternative. |
| **Trend line** | PrimeNG `p-chart` (type line) in the new `results-trend-card` — chart.js is already a dependency and PrimeNG 19 ships the wrapper; canvas is justified here (line interpolation, tooltips). Colors fed from `chart-tokens.util`; `aria-label` + visually-hidden data table beside the canvas (R-PD-009). Current year rendered as a dashed provisional segment; y-axis min 0. **Sparse years (judgment W2):** with <2 populated year buckets the canvas is not rendered — the card shows the single year's value as a stat with the caption "Not enough reporting history for a trend" (distinct from error and empty states, satisfying R-PD-004's `BUT` clause). |
| **KPI strip** | 4 stat tiles per mockup (4th tile fed by `partner_institutions` from the aggregate — S2; its "across N countries" sub-caption is dropped, no source); skeleton per tile; typography via canonical classes. **Pending tile (judgment W7):** wraps a real link/button that scrolls to the pending-table section (element id + `scrollIntoView`, honoring `prefers-reduced-motion`). |
| **Async states** | One pattern per the `States` artboard: `p-skeleton` blocks / error icon + copy + 44px Retry button / empty icon + copy + next action. Distinct copy per state asserted in rendered DOM. Space reserved (no content jumping). |
| **Caveat & AI blocks** | Caveat: one line + "Learn more" expandable keeping the full original text (OQ-3 hedge). Grounding + Executive Overview: DOM order moved below the pending table, collapsed header row (expand keeps all current functionality; admin gating unchanged). |
| **Tokens** | All hex → tokens across the **six** touched templates (incl. `section-header`'s 8) + all TS sites — the full inventory per judgment W4: dashboard TS holds 12 literals (grounding-count colors, alert `#E69F00`/`#035BA9`, the `#1689CA` fallback, the 6-hex indicator map — the map is **deleted**, not migrated, since bars are single-hue), plus 4 Mapbox paint hexes in `geo-scope-map.component.ts` (paint expressions can't take CSS vars → they consume `chart-tokens.util`-resolved values and re-style on the theme signal). **Chart palette: a NEW `--ac-viz-*` token family (D-PD-13)** with independently chosen light *and* dark values — mandatory because the existing green/blue ramps invert in dark mode (judgment S4: `--ac-green-500` dark is `#14251a` ≈ 1.10:1 on the dark surface; no existing ramp member passes). The family is registered in `colors.scss` + mirrored to the client README and `docs/ux-ui/design.md` §7 in the same change, and validated with the dataviz validator in light **and** dark against the actual card surface tokens (NFR-PD-004) — validation output recorded, adjustments in token *values*, never by reintroducing component hex. |
| **Interaction polish** | `cursor-pointer` + non-layout-shifting hover on clickable rows; 150–300ms color transitions; `prefers-reduced-motion` respected (no chart entry animations when set). |

---

## 7. Integration impact

None. No external system, env var, cron, or event contract changes.

---

## 8. Security & authorization

- New endpoint: any authenticated user (JWT or machine token) — identical posture to the six sibling reports it joins; no new secrets; no PII beyond what `GET results` already exposes (it returns *counts only*, strictly less than today's bulk fetch).
- Client: no guard changes; route stays behind `rolesGuard`.

---

## 9. Observability

- Server: standard `ResponseInterceptor` logging; no new log lines needed (read-only endpoint).
- Client: existing `httpErrorInterceptor` toast path applies; region-level error states surface failures visibly (R-PD-007).

---

## 10. Testing strategy

| Layer | Tests |
|---|---|
| Server unit | Controller/service/repository spec extensions in the existing style; repository spec asserts generated SQL contains the shared-subquery predicates + groupings and the bound params (generated-output assertion, KZ-001) |
| Server e2e | Not added — sibling reports have none; correctness cross-check runs once on Dev (R-PD-001 scenario) and is recorded in `execution.md` |
| Client unit | New services (HTTP via `HttpTestingController`, envelope handling, cache-by-id, error signals); components: state transitions arranged as **transitions** (KZ-015 — construct loading, assert skeleton, then resolve), rendered-DOM assertions for the three distinct states, drill-through navigation, exactly-one `GET_ResultsCount` (R-PD-008 AC.2), no-bulk-fetch assertion (R-PD-003 AC.2) |
| Static gates | D1–D5 + D8 per requirements §4.1 (build, spec-tsc vs 945 baseline, full suites serially, hex grep, budget diff, palette validator) |
| Visual (D6) | HITL: light+dark screenshots of the route at the validation pause; jsdom explicitly cannot cover this |

---

## 11. Rollout

- **Order:** server endpoint merges first (additive, unused until the client lands) → client PR consumes it. No flag needed: the endpoint is additive and the client change is atomic per deploy.
- **Backout:** revert client PR (server endpoint is harmless orphaned); no migrations to unwind.
- **Comms:** none beyond release notes; no partner-facing contract changes.

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
|---|---|---|---|
| D-PD-1 | 2026-08-21 (amended per judgment S1/W1) | New endpoint lives in `agresso-contract` as the **seventh** `reports/*` sibling — six exist today (query-param `contract-id`, raw-SQL repository, shared primary-contract subquery). Requirements.md corrected to the query-param form in the same round | Copies a proven in-module pattern; the subquery already encodes R-PD-001's exclusions |
| D-PD-2 | 2026-08-21 | Charts: semantic HTML+tokens for status & indicator bars; `p-chart`/chart.js **only** for the trend line | HTML bars auto-theme, are inherently accessible, and match the mockup; canvas is justified only where interpolation/tooltip mechanics need it; confines the new bundle weight to one lazy component (NFR-PD-001) |
| D-PD-3 | 2026-08-21 | Status colors: fixed semantic token mapping **keyed by `result_status_id`**, not `result_status.config.color` (resolves OQ-1). **Declared trade-off:** every other result-status chip in the app (results-center table, result-sidebar, status-dropdown, linked-results modal, oicr-header) renders the server config colors, so the dashboard chart may diverge from those chips | Token mapping is theme-reactive and validator-checked; config colors are raw hex, unvalidated, and dark-blind — the `#1689CA` fallback path is the defect class being removed. The chart is a new surface; chips elsewhere are untouched. Divergence accepted and user-visible at the Phase 2 gate; statuses outside the known set get `--ac-grey-500`. The aggregate returns only statuses with ≥1 result (SQL GROUP BY — same visible set as today) |
| D-PD-4 | 2026-08-21 | Drill-through targets the **Project Results tab** (`/project-detail/:id?statusTab=…`) via a new generic `initializeScopedResultsTable`, not `/results-center` (amends the proposal's wording) | The standalone Results Center hard-clears `primaryContractId` on init — contract-scoped deep links there would require changing another feature's contract; the project tab already holds the scope. Requirements Details updated in the same change (correction closure) |
| D-PD-5 | 2026-08-21 (amended per judgment) | `DarkModeService`'s **private** `isDarkMode` field → signal exposed readonly; existing public `isDarkModeEnabled()` preserved (delegates to it). Chart colors resolved from CSS variables at runtime (`chart-tokens.util`, first `getComputedStyle` use in the codebase) re-resolved on the signal. jsdom contract: resolution returns `''` there — tests assert requested token names, never resolved values, and no hex fallback exists | Only mechanism that keeps canvas colors token-derived without hex maps or theme branching (child-guide rule); the jsdom clause keeps the D6 gate honest (KZ-017) |
| D-PD-6 | 2026-08-21 | "View all" = in-card expansion (server cap 100), not a modal | Avoids `all-modals` registry churn for a read-only list; keeps the interaction local to the card |
| D-PD-7 | 2026-08-21 (amended twice: reversion challenge, then judgment W6/SU6) | `GET_ResultsCount` consolidates into a shared `get-project-detail.service` covering **three components / four production invocations** (shell; dashboard; `section-header` ×2 — `loadProjectData` from the route id and `loadProjectDataById` from `GET_Alignments`' primary contract on `/result/:id/*` routes, a *different* id → the dedupe is keyed by contract id and `invalidate(id)` is per-id). The `full_name` mutation is **deleted, not uniformized** — it is dead in practice: its consumer `formatIndicatorName` is optional-chained with server-supplied `full_name` as a live fallback, so deletion is safe because the server value survives (the crash-vector concern applies to the unguarded *mutation site* in the shell, not the consumer — rationale corrected per judgment SU6). Empty state standardizes on `null` (signal type `GetProjectDetail \| null`), and the shell template's unguarded dereferences (a latent crash today under the `undefined` fallback) gain guards in the same change | Three deliberately different empty-state contracts collapse into one *declared* one; the pinned tests on the old fallbacks are realigned with the site list derived **from the failing suite, not grep** (K-018) |
| D-PD-8 | 2026-08-21 | Caveat's full original text stays reachable behind "Learn more" | Hedges OQ-3 (possibly mandated copy) while restoring hierarchy |
| D-PD-9 | 2026-08-21 | The relocated Grounding/Executive-Overview section collapses via **CSS visibility (`[hidden]`/class), never `@if`**, and while `executiveOverviewLoading()` is true the collapsed header row shows an inline progress indicator (the section also auto-expands when the user triggers Generate) | Challenge finding: `@if` destroys `#groundingFileInput` — if the panel closes while the OS file picker is open, the `(change)` event lands on a destroyed element and the upload is silently lost; and a collapsed-by-default panel would hide all generation progress. Both violate R-PD-008's `BUT it must NOT functionally alter upload/generate` |
| D-PD-10 | 2026-08-21 | The shared project service is a **per-navigation request dedupe with an explicit `invalidate()`** (mirroring `invalidateResultsFetchDedupe` in results-center.service), never a TTL cache | Challenge finding: four post-mutation flows navigate straight to `/project-detail/:id` expecting fresh counts, and today every consumer refetches on mount/NavigationEnd. A TTL cache would serve stale aggregates on exactly those flows (K-016 family); per-navigation dedupe keeps freshness semantics while still guaranteeing R-PD-008 AC.2's one-request-per-navigation |
| D-PD-11 | 2026-08-21 (amended per judgment W4/JB-11) | `GEO_SCOPE_SUMMARY_COLORS` is **deleted** (dead — sole occurrence is its own declaration); `getIndicatorChartColor`'s 6-hex map is **deleted too** (bars are single-hue per §6 — "migrate" was wrong); `projectDashboardBarColor` moves to token-name resolution; the remaining TS hexes (grounding-count colors, alert `#E69F00`/`#035BA9`, `#1689CA` fallback, 4 Mapbox paints) map to `--ac-*`/`--ac-viz-*` tokens — `#E69F00`/`#78288c` have no existing equivalent, covered by the new family (D-PD-13); hex-pinning specs realign via failing suite | Importers confined to the project-detail feature (card also reached via geo-scope-card — KZ-002); the full inventory is now enumerated so R-PD-006 AC.1's zero-grep is achievable |
| D-PD-12 | 2026-08-21 (judgment SU1) | Count semantics standardize on **primary-contract-only** across the whole page: the aggregate uses the shared `is_primary = TRUE` subquery (like every sibling report and the indicator counts, which are already primary-scoped), and the drill-through table request carries the primary flag so table and chart agree. **Declared visible change:** status counts may be lower than today's chart wherever non-primary links exist | Today the page already mixes semantics (indicator counts primary-only, status chart any-link); standardizing removes a latent inconsistency instead of preserving it. R-PD-001's cross-check scenario re-anchored to the primary-scoped count |
| D-PD-13 | 2026-08-21 (judgment S4) | New `--ac-viz-*` chart-token family (status: approved/submitted/draft/pending/rejected/no-status + `series-1` for single-hue bars and the trend line), with independently authored light **and** dark values that pass the dataviz validator against the card surface in both modes; registered in `colors.scss` and mirrored to the client README + `docs/ux-ui/design.md` §7 in the same change | The existing green/blue ramps invert in dark mode — no ramp member can serve as a dark chart mark (measured: 1.10:1). Charts need mark-grade tokens the semantic UI ramps cannot provide |
| D-PD-14 | 2026-08-21 (judgment S4/JB-5) | R-PD-006's theme scenario is **attribute-driven** (`data-theme` flip), not toggle-driven; wiring the missing global toggle UI and fixing PrimeNG's `.dark-mode` selector mismatch are **out of scope**, recorded as baseline drift (`docs/ux-ui/design.md` §11 describes a signal-based service and a `.dark-mode` class the code does not have) for the archive sync | The spec's duty is that this route renders correctly under the mechanism-of-record; resurrecting the platform's dark-mode entry point is a platform concern, not a dashboard one |

### Reversion challenge (Step 2.3) — outcomes (independent reviewer, 2026-08-21)

| Reversion | Challenge answer ("what does removing this break?") | Design response |
|---|---|---|
| Bulk 10k fetch + `buildStatusChartItems` removal | Per-status colors have **no other client-side source** (control list carries no colors; `STATUS_COLOR_MAP` is contract-status, would mis-color) — every other status chip reads server config colors, so a token palette makes the dashboard diverge from those chips. Nothing else consumes `statusChartItems` or the fetched rows; pending table independent; bars aren't interactive today. Pinned specs (`project-dashboard.component.spec.ts:244-248, 328-375`, incl. the `#1689CA` fallback) break | Divergence accepted and declared in D-PD-3 (user can overrule at the gate); spec realignment via failing suite (K-018) |
| `GET_ResultsCount` dedupe | `full_name` mapping is **dead code and a crash vector** if uniformized (unguarded `.indicator.name`; two call sites disagree on optionality); `{}`/`undefined`/never-clear are three test-pinned empty-state contracts; the `undefined` fallback is a **latent template crash** in the shell today; section-header needs the service on `/result/:id/*` routes; a TTL cache would serve stale counts on four post-mutation navigation flows | D-PD-7 (delete mutation, `null` standard, guard the shell template) + D-PD-10 (per-navigation dedupe + `invalidate()`) |
| Hex constants → tokens | Importers confined to the feature (card also reached via geo-scope-card); `GEO_SCOPE_SUMMARY_COLORS` is dead; specs pin exact hexes (`constants.spec.ts:5`, `project-dashboard-card.component.spec.ts:97-98`); a second inline 6-hex map (`getIndicatorChartColor`) would otherwise survive the pass | D-PD-11 |
| Caveat shrink + AI relocation | No tours, analytics, anchors, or docs depend on position/text. **But**: `@if`-collapse destroys the file input mid-picker (silent upload loss), and collapsed-by-default hides generation progress; the existing spec makes **zero DOM assertions**, so the restructure is unguarded in CI | D-PD-9 + rendered-DOM assertions mandated in tasks |

---

## 13. Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Tasks | **12** |
| LOC (churn, both packages, incl. tests) | **~1,350** (server ~350; client ~1,000) |
| Review rounds | **2** |

Matches **Standard** depth (re-checked against the finished design; neither Lite nor Full is warranted — no schema/auth/topology risk, but seven UI regions + one endpoint is not a one-task change). Estimate history: the informal pre-design guess given in conversation was ~700–900 LOC (**the proposal document itself records no LOC figure** — judgment W5 corrected an earlier false attribution here); the design pass added the 4th `GET_ResultsCount` invocation, the generic scoped-table method, the `--ac-viz-*` token family + registration, and the section-header tokenization.

---

## 14. Open questions

- OQ-2 (trend by `report_year` vs creation year) — **design assumes `report_year`** (it is the indexed, reporting-semantics column); confirm at Phase 2 approval, cheap to change before T-implementation.
- OQ-3 (caveat copy) — hedged by D-PD-8; confirm at validation.
- OQ-1 — **closed** by D-PD-3.

## 15. References

- Proposal: `./proposal.md` · Mockup: `./mockup/` · Sibling pattern: `agresso-contract.controller.ts` reports family · Client precedents: `results-center.component.initializeState()`, Home `data-overview` queryParams links.
