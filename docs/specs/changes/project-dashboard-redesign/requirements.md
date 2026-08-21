# Requirements — project-detail / Project Dashboard Redesign

- **Module:** project-detail (client) + agresso (server, one read endpoint)
- **Spec id:** 2026-08-project-dashboard-redesign
- **Status:** draft
- **Owner:** j.cadavid@cgiar.org
- **Linked PRD section:** `docs/prd.md` G8 (reportable in minutes), M12 (UX quality), AC-Accessibility, AC-Theming, AC-Performance, C-4/C-5
- **Linked tickets:** — (originates from `proposal.md` in this folder, approved 2026-08-21)
- **Last updated:** 2026-08-21
- **Approval Mode:** gated (inherited from proposal)
- **Depth:** Standard

---

## 1. Context

The Project Dashboard (`/project-detail/:id/project-dashboard`) renders every visualization as hand-built `div`+width-% lists — no axes, legends, tooltips, or time dimension — computes the status chart by downloading up to 10,000 full result rows client-side, uses 140+ hex literals with zero design tokens (dark mode structurally impossible), and shows inconsistent loading/error/empty states (the indicator card displays the *empty* message while loading). The approved `proposal.md` (Option B) mandates: real charts including a results-by-year trend, a KPI strip, one server aggregate endpoint replacing the 10k fetch, token conformance, unified async states, and WCAG 2.1 AA. **Not changing:** the Project Results tab, Results Center behavior, the pending-revision table's columns, AI-grounding functionality (placement only), Mapbox, any taxonomy. Service consolidation (proposal P11) is explicitly deferred.

Approved visual reference: `mockup/` (design canvas, 2 artboards) — light theme, sample data.

---

## 2. Requirement numbering

`R-PD-NNN` functional · `NFR-PD-NNN` non-functional. Numbered in dependency order (server data first).

---

## 3. Functional requirements

### R-PD-001 — Contract results-summary aggregate endpoint (server)

- **As a** STAR client (and any authenticated consumer)
- **I want** `GET /api/v1/agresso/contracts/reports/results-summary?contract-id=<id>`
- **So that** the dashboard renders status and yearly distributions without downloading result rows.

> *Corrected per judgment S1 (2026-08-21): query-param form, matching all six sibling `reports/*` endpoints — the earlier path-param form (`/contracts/:contractId/...`) is superseded everywhere in this spec.*

**Details:**
- Inputs: `contract-id` query param (agreement id, e.g. `A1676`), required — empty → 400 `contract_id is required` (sibling behavior).
- Behavior: aggregate over active, non-snapshot results linked to the contract **as primary** (`result_contracts.is_primary = TRUE` — the shared subquery semantics every sibling report uses; judgment SU1: this is a **declared count change** vs. today's chart, which counted any-link results). Counts grouped by `result_status` and by `report_year`, plus a distinct partner-institution count; computed in SQL (no in-memory scan of full entities).
- Outputs: `ServerResponseDto` with `data: { total: number, by_status: [{ status_id, name, count }], by_year: [{ year, count }], partner_institutions: number }`. Status `name` sourced from `result_status`; `partner_institutions` = `COUNT(DISTINCT institution)` over partner-role links of the same result set (feeds R-PD-002's 4th tile — judgment S2). Results with `result_status_id IS NULL` group under a `null`/`"No status"` bucket (judgment SU2 — `result_status_id` is nullable; never dropped by an inner join).
- Errors: unknown/inaccessible contract → `data: { total: 0, by_status: [], by_year: [], partner_institutions: 0 }`; missing param → 400 via `GlobalExceptions`.
- Permissions: any authenticated user (same as the six sibling `agresso/contracts/reports/*` endpoints); JWT or machine token.

**Acceptance criteria:**
- [ ] AC.1 — Response passes through `ResponseInterceptor` and matches the envelope + data shape above.
- [ ] AC.2 — `by_status` counts sum to `total` **and** `by_year` counts sum to `total` — with null-status and null-year rows each in their explicit bucket, never dropped silently.
- [ ] AC.3 — Controller declares `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, and the `contract-id` `@ApiQuery` (via `ApiContractReportQueries` or equivalent).
- [ ] AC.4 — An unauthenticated request returns 401 with the standard envelope.

#### Scenario: Aggregation correctness
- GIVEN a contract with results in ≥2 statuses across ≥2 report years
- WHEN the endpoint is called
- THEN each `by_status` and `by_year` count equals the equivalent **primary-scoped** results count (`GET /results` filtered by `contract-codes` + the primary-contract flag — not the any-link count; judgment SU1)
- AND IT MUST aggregate in the database query (no `find()`-all + JS counting)
- BUT it must NOT include snapshot (`is_snapshot=true`) or inactive rows
- AND IT MUST place NULL-status and NULL-year rows in explicit buckets so both sums still equal `total`.

**Out of scope:** caching layer; pagination (payload is inherently small); OpenSearch involvement.

---

### R-PD-002 — KPI summary strip

- **As a** contributor / Center Admin / MEL expert
- **I want** four stat tiles at the top of the dashboard analytics: Total results, Indicators covered, Pending revision, Partner institutions
- **So that** the headline numbers are scannable without reading lists.

**Details:**
- Total results + indicators from the existing `GET_ResultsCount` data; Pending revision from R-PD-001 `by_status`; Partners from R-PD-001's `partner_institutions` distinct count (judgment S2 — the top-partners report exposes neither a total nor a distinct count, and a `limit`-capped list length would fabricate "4" for every project). The mockup's "across 11 countries" sub-caption has no source and is **omitted** (sample-data artifact, not a requirement).
- "Pending revision" tile links to the pending-revision table section (in-page anchor or scroll).

**Acceptance criteria:**
- [ ] AC.1 — Tiles render above all charts, under the section header, per the mockup layout.
- [ ] AC.2 — While any tile's source is in flight, that tile shows a skeleton (R-PD-007), never `0`.

#### Scenario: No fabricated zeros
- GIVEN the results-count request is still in flight
- WHEN the dashboard renders
- THEN the Total results tile shows a skeleton
- BUT it must NOT display `0` or the empty-state copy before the response resolves.

---

### R-PD-003 — Results by status: composition chart fed by the aggregate

- **As a** dashboard user
- **I want** a horizontal stacked composition bar plus a labeled per-status breakdown (dot + label + count + %)
- **So that** I read the status split at a glance without scrolling a capped list.

**Details:**
- Data source: R-PD-001 `by_status` exclusively.
- All statuses render (no `max-h` scroll cap), including the explicit "No status" bucket when present. Colors: semantic mapping from the **`--ac-viz-*` chart-token family** (design D-PD-13; hues per the mockup: green approved / blue submitted / grey draft / orange pending / red rejected); statuses outside the known set fall back to a neutral token, never a hardcoded hex.
- Each status row navigates to the project's filtered results view (Project Results tab with the status pre-applied — see design D-PD-4; the standalone Results Center clears contract scope on init and is not the target).

**Acceptance criteria:**
- [ ] AC.1 — Segment widths and row percentages derive from `by_status` and sum to 100% (±1 rounding).
- [ ] AC.2 — The dashboard issues **no** `GET results` bulk call: the `limit: 10_000` fetch and `buildStatusChartItems` path are removed.
- [ ] AC.3 — Identity is never color-alone: every segment/row carries a text label and count (WCAG 1.4.1).

#### Scenario: Bulk fetch removed
- GIVEN the dashboard loads for a contract with results
- WHEN the status chart renders
- THEN exactly one summary request (R-PD-001) feeds it
- BUT it must NOT request `GET results` with `limit: 10_000` (or any bulk row fetch) from this page
- AND IT MUST render every returned status (no truncation, no scroll cap).

---

### R-PD-004 — Results over time (trend by report year)

- **As a** MEL expert / Center Admin
- **I want** a line chart of result counts per report year, current year visually marked as in-progress
- **So that** the project's reporting trajectory is visible (currently absent entirely).

**Details:**
- Data source: R-PD-001 `by_year`. Rendered with Chart.js (already a package dependency) or an equivalent shared chart wrapper — one library decision recorded in `design.md`.
- Current (max) year segment styled as provisional (dashed/annotated "in progress") per the mockup.
- With <2 populated years, render a single-point/degenerate view with an explanatory caption instead of an empty chart.

**Acceptance criteria:**
- [ ] AC.1 — One point per `by_year` bucket; y-axis starts at 0; tooltips show year + count.
- [ ] AC.2 — The chart has an accessible name summarizing the series (R-PD-009).

#### Scenario: Sparse years
- GIVEN a contract whose results all fall in one report year
- WHEN the trend card renders
- THEN it shows that single year with its count and a caption noting insufficient history
- BUT it must NOT render an axis-only empty plot or the error state.

---

### R-PD-005 — Results by indicator: ranked bars with drill-through

- **As a** dashboard user
- **I want** the existing indicator distribution as labeled horizontal bars (count + track) with drill-through
- **So that** indicator comparison is visual and actionable.

**Details:**
- Data source: existing `GET_ResultsCount` indicators (unchanged endpoint).
- Single-hue bars (magnitude job — one token hue: `--ac-viz-series-1` from the new chart-token family, design D-PD-13; the earlier `--ac-light-blue-400` suggestion fails dark-mode contrast); count right-aligned per row; clicking a row opens the project's filtered results view (Project Results tab with the indicator pre-applied — design D-PD-4).
- The one-row stacked "share" figure may remain only if it gains per-segment accessible names; otherwise it is removed in favor of the bars.

**Acceptance criteria:**
- [ ] AC.1 — Bars ordered descending by count; widths proportional to the max.
- [ ] AC.2 — A loading state exists (today this card has none — it must never show the empty message while `GET_ResultsCount` is in flight).

#### Scenario: Loading is not empty
- GIVEN `GET_ResultsCount` is in flight
- WHEN the indicator card renders
- THEN it shows the skeleton state
- BUT it must NOT show "No results were found for any indicator" until the request has resolved with zero results.

---

### R-PD-006 — Design-token conformance and dark mode

- **As a** user with dark theme enabled
- **I want** the entire dashboard route (dashboard body + `project-detail` shell + card/geo components) rendered from `--ac-*` tokens / utility classes
- **So that** the page respects the theme instead of staying hardcoded-light.

**Details:**
- Every hex literal in the touched templates and TS (66+28+6+6+34 counted in the proposal, plus TS constants) is replaced by a token reference, a token utility class, or a value in `src/styles/colors.scss` (new tokens registered per child-guide rule: update `README.md` + `docs/ux-ui/design.md` §7 in the same change).
- Chart series colors are token-*derived* at runtime (resolved from CSS variables) so charts flip with the theme; the chart palette itself is validated (NFR-PD-004).
- `font-['Barlow']`/`font-['Space_Grotesk']` arbitrary utilities replaced by the canonical typography classes (`.label`, `.section-title`, `.fs-*`, etc.).

**Acceptance criteria:**
- [ ] AC.1 — `grep -nE '#[0-9a-fA-F]{3,8}\b' <touched templates + TS>` returns zero hits (excluding `colors.scss` itself).
- [ ] AC.2 — In dark mode, every text/background pairing on the route meets 4.5:1 (body) / 3:1 (large+UI) — verified in **rendered DOM**, not asserted from token names (KZ-001; defect-class table §4.1).
- [ ] AC.3 — No `isDarkMode()` branching for color decisions (child-guide rule).

#### Scenario: Theme flip
- GIVEN the dashboard is open in light mode
- WHEN the document's `data-theme` attribute switches to `dark` (the `DarkModeService.applyTheme` mechanism-of-record; judgment S4 — no UI currently invokes the toggle anywhere in `src/`, so the scenario is attribute-driven and wiring a global toggle control is **out of this spec's scope**, recorded as baseline drift for `docs/ux-ui/design.md` §11)
- THEN cards, charts, text, and bars re-render with the dark token values without reload
- BUT it must NOT leave any surface at a literal light value (the `bg-[#fcfcfc]` class of defect)
- AND IT MUST keep chart series distinguishable on the dark surface (NFR-PD-004 re-run for dark).

---

### R-PD-007 — Unified async states on every data region

- **As a** dashboard user
- **I want** each of the seven data regions (KPI strip, status, trend, indicators, 4 ranked cards as one pattern, geo, pending table) to show skeleton → data | error+retry | empty as three distinct states
- **So that** "loading", "failed", and "genuinely no data" are never conflated.

**Details:**
- Pattern per the `States` mockup artboard: skeleton blocks while in flight; error names the failed region and offers a scoped Retry; empty states confirm no data and point to the next action.
- "Results by status" error and empty become distinct (today one message covers both, with no retry).
- Retry re-issues only that region's request.

**Acceptance criteria:**
- [ ] AC.1 — For each region, the three states are visually and verbally distinct (distinct copy asserted in rendered DOM).
- [ ] AC.2 — A failed region never blocks sibling regions from rendering their data.

#### Scenario: Error is not empty
- GIVEN the results-summary request fails
- WHEN the status card renders
- THEN it shows the error state with a Retry control
- BUT it must NOT show "No result statuses were found for this project"
- AND IT MUST recover to the data state when Retry succeeds.

---

### R-PD-008 — Information hierarchy and dead-end removal

- **As a** dashboard user
- **I want** analytics first: a compact one-line caveat (expandable, not 90 words), AI grounding/executive summary relocated below the analytics as a collapsed section, and "View all" affordances on the four top-4 ranked cards
- **So that** the first screen shows metrics, and top-N cards stop being dead ends.

**Details:**
- Caveat: one sentence + "Learn more" affordance (popover or expand). Copy change is presentation-only — pending OQ-3 confirmation that the full text is not mandated always-visible.
- Grounding & Setup + Executive Overview keep all current functionality; only DOM order/collapse changes. Admin-only visibility rules unchanged.
- "View all" on partners/levers/contacts/contributing-projects opens the full ranked list (modal via `all-modals`, or an expanded in-card list — decided in `design.md`).
- The duplicate `GET_ResultsCount` (parent shell + child) collapses to one fetch shared via a service/signal.

**Acceptance criteria:**
- [ ] AC.1 — With an admin role, the first viewport (1440×900 reference) shows the KPI strip and at least one chart before any AI/grounding block.
- [ ] AC.2 — Exactly one `GET_ResultsCount` request per navigation to the route (asserted via HTTP testing).
- [ ] AC.3 — Each ranked card exposes a working "View all" showing the full list from its existing endpoint (limit raised or removed for the expanded view only).

#### Scenario: Admin first screen
- GIVEN a Center Admin opens the dashboard
- WHEN the page renders
- THEN KPI strip and charts appear above Grounding & Setup
- BUT it must NOT remove or functionally alter upload/generate capabilities
- AND IT MUST keep them reachable within one interaction (scroll or expand).

---

### R-PD-009 — Chart accessibility (WCAG 2.1 AA)

- **As a** keyboard / screen-reader user
- **I want** every chart to expose an accessible name and a non-visual data path, and every interactive element to be keyboard-reachable
- **So that** the analytics are not sight-and-mouse-only.

**Details:**
- Each chart: `role="img"` + `aria-label` summarizing the data, **plus** a visually-hidden (or toggleable) data table with the same numbers.
- Drill-through rows/segments are real `<a>`/`<button>` elements with visible focus.
- Tooltips' information is available without hover (the labels/table carry the values).

**Acceptance criteria:**
- [ ] AC.1 — Every chart region has an accessible name and an associated table alternative (asserted in rendered DOM).
- [ ] AC.2 — All interactive controls tab-reachable with visible focus; no `title=`-only information.
- [ ] AC.3 — Status/error/empty communicated by icon + text, never color alone.

---

## 4. Non-functional requirements

### NFR-PD-001 — Bundle budget
- **Category:** performance
- **Target:** Chart.js (and any chart wrapper) loads only in the lazy `project-dashboard` chunk; initial bundle size unchanged (±1 kB) vs. base branch; `angular.json` budgets hold (C-5).
- **How verified:** `npm run build` twice (base vs. branch), compare initial-chunk sizes from the build stats; budget gate **proven able to fail** once (K-004) by temporarily importing Chart.js from an eagerly-loaded file and observing the delta/budget error.

### NFR-PD-002 — Payload economy
- **Category:** performance
- **Target:** status+trend data transfer for the dashboard ≤ 5 kB (vs. today's up-to-10k-row payload); no request from this route carries `limit: 10_000`.
- **How verified:** network assertion in component/service tests (no bulk call — R-PD-003 AC.2) + endpoint response size observed once in dev.

### NFR-PD-003 — Endpoint latency
- **Category:** performance
- **Target:** `results-summary` p95 ≤ 500 ms on Dev data for the largest contract.
- **How verified:** manual timing (3 runs) on Dev during validation. **Disqualifier:** if the 3 runs vary by more than the margin to the target, report the spread instead of a pass.

### NFR-PD-004 — Validated chart palette
- **Category:** a11y
- **Target:** the status palette passes the dataviz validator's categorical checks (adjacent CVD ΔE ≥ 8 or paired with secondary encoding; normal-vision floor ≥ 15; contrast ≥ 3:1 or labeled relief) in **both** light and dark modes against the actual card surface. The failing `PROJECT_DASHBOARD_RANK_BAR_COLORS` set (proposal P12) is not reused for multi-hue series.
- **How verified:** `node <dataviz>/scripts/validate_palette.js "<hexes>" --mode light|dark --surface <surface>` — output recorded in `execution.md`.

### NFR-PD-005 — Test coverage
- **Category:** dx
- **Target:** client coverage floors hold (statements 40 / branches 20 / lines 45 / functions 30); server ≥ 60% on touched module; new components/services carry co-located specs.
- **How verified:** `npm test -- --silent` per package (full suite, run serially — never both packages concurrently, root guide §4.3).

---

## 4.1 Defect classes → gates (KZ-017 mapping)

| # | Defect class this spec can produce | Gate that catches it | Blind spot handling |
|---|---|---|---|
| D1 | Type/template errors in app code | `npm run build` (client) — type-checks templates via `strictTemplates` | spec files not covered → D2 |
| D2 | Type errors in spec code | `npx tsc -p tsconfig.spec.json --noEmit` vs. the **945-error baseline** (child guide K-002/K-004) | expects delta-zero, not clean |
| D3 | Behavioral regressions (states, wiring, dedupe) | `npm test -- --silent` full suite; assertions on **rendered DOM**, not call sequences (KZ-001); fixtures arrange the **transition** (KZ-015) | targeted runs need `--coverage=false` (K-020) |
| D4 | Hex-literal reintroduction | `grep -nE '#[0-9a-fA-F]{3,8}\b'` over touched files — checked against the full touched-file list, total counted before filtering (K-014) | grep cannot judge *token misuse* → D6 |
| D5 | Bundle/budget breach | `npm run build` budget errors + initial-chunk diff (NFR-PD-001) | gate proven able to fail first (K-004) |
| D6 | **Visual defects: contrast, dark-mode rendering, layout, chart legibility** | **No automated gate exists** — jsdom cannot measure layout or contrast (KZ-017). Substitute: mandatory **human visual check at the HITL validation pause** (light + dark screenshots) and/or a T6 Multimodal review per the Model Routing registry | explicitly substituted, not skipped |
| D7 | Server aggregation wrong (counts ≠ reality) | server spec asserting SQL-level grouping against seeded fixtures + the R-PD-001 cross-check scenario | mocked query builders cannot represent SQL semantics (KZ-017) — the spec must assert on generated SQL or use the TEST datasource |
| D8 | Palette not CVD/contrast-safe | dataviz validator runs (NFR-PD-004), light **and** dark | validator covers color only, not layout (→ D6) |
| D9 | Packaging (K-017) | n/a — no runtime asset is produced by this spec | recorded as not-applicable, not forgotten |

---

## 5. Data requirements

None. No entities, columns, indexes, OpenSearch fields, or migrations. R-PD-001 reads existing `results`, `result_status`, `result_contracts`, and `result_institutions` tables (`report_year_id`'s value **is** the year — FK onto `report_years` whose PK is the year itself, so no year join is needed; judgment W8).

---

## 6. API surface delta

| Method + URL | Roles/Guards | DTO | Data shape | Notes |
|---|---|---|---|---|
| `GET /api/v1/agresso/contracts/reports/results-summary?contract-id=` | authenticated (JWT or machine token); no `@Roles` restriction (matches the six sibling reports) | response DTO under the owning module's `dto/` | `{ total, by_status[], by_year[], partner_institutions }` | v1; Swagger decorators mandatory; counts are primary-contract-scoped (SU1) |

No changes to existing endpoints. The client stops calling `GET results` with `limit: 10_000` from this route (removal, not a contract change).

---

## 7. Cross-system impact

- **STAR client:** this spec's primary surface (`pages/platform/pages/project-detail/**`, `shared/constants/project-dashboard-chart-colors.constants.ts`, possibly a small shared chart wrapper under `shared/components/`).
- **CLARISA / AGRESSO / TIP / OpenSearch / DynamoDB / RabbitMQ / Socket.IO:** untouched.
- **Design system:** any new token registered in `colors.scss` must be mirrored to `client/.../README.md` and `docs/ux-ui/design.md` §7 in the same change.

---

## 8. Assumptions, dependencies, risks

| Type | Item | Mitigation |
|---|---|---|
| Assumption | Chart.js ^4.4.7 (already in `package.json`) is the chart library; PrimeNG `p-chart` or a thin wrapper — decided in `design.md` | if rejected, hand-rolled SVG per the mockup remains viable; requirements are library-agnostic |
| Assumption | The sibling `agresso/contracts/reports/*` endpoints' auth posture (authenticated, unrestricted role) is correct to mirror | verify in design exploration; if they carry `@Roles`, mirror that |
| Dependency | None on in-flight specs; `changes/pool-funding-*` touch different routes | — |
| Risk | Dark-mode contrast regressions invisible to jsdom (D6) | HITL visual check is a **mandatory** gate, not optional |
| Risk | Full-suite phantom failures if client+server suites run concurrently (root guide §4.3) | run suites serially; Leader re-measures after workers |
| Risk | Caveat-copy reduction may be product-mandated text (OQ-3) | keep full copy reachable behind "Learn more"; confirm at first HITL pause |

---

## 9. Open questions

| # | Question | Owner | Target |
|---|---|---|---|
| OQ-1 | Status chart colors: fixed semantic token mapping (mockup) vs. `result_status.config.color` from the API — which wins when they conflict? | j.cadavid | before design approval |
| OQ-2 | Trend counts by `report_year` (assumed) vs. creation year | j.cadavid / product | before T-implementation of R-PD-004 |
| OQ-3 | May the caveat banner collapse to one line + "Learn more"? | product | first HITL pause |
| OQ-4 | Original user screenshot for before/after — attach when available | j.cadavid | validation |

---

## 10. Sign-off

- [ ] Engineering lead — j.cadavid
- [ ] MEL / product owner — pending
- [ ] Security review — n/a (no auth/secrets touched)
- [ ] DevOps — n/a (no infra touched)
