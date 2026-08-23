# Requirements — project-detail / Dashboard Advanced Analytics

- **Module:** project-detail (client) + agresso-contract & bilateral read-models (server)
- **Spec id:** 2026-08-dashboard-advanced-analytics
- **Status:** draft
- **Owner:** j.cadavid@cgiar.org
- **Linked PRD section:** `docs/prd.md` G8, M12, AC-Accessibility, AC-Theming, AC-Performance, C-1/C-4/C-5
- **Extends:** `docs/specs/archive/2026-08-22-changes--project-dashboard-redesign/` (done — its endpoint, tokens, async-state pattern, and a11y contract are the baseline)
- **Linked tickets:** — (originates from `proposal.md` v2, approved 2026-08-22)
- **Last updated:** 2026-08-22
- **Approval Mode:** gated
- **Depth:** Standard

---

## 1. Context

The redesigned dashboard shows correct-but-basic analytics. Three data families the platform already stores are invisible at project level: **Science-Program alignments** (per-result SP links with PRIMARY/CONTRIBUTING roles in `result_pool_funding_alignment_sp`, plus per-SP ToC rows — no contract-level aggregation exists), **AGRESSO contract context** (`grant_amount_usd`, `funding_type`, `contract_status`, dates, `sdgs` json, `pooled_funding_contracts` CGIAR entities — the dashboard consumes only `indicators[]`), and **reporting density over time** (indicator×year). The current chart engine (chart.js via one `p-chart`) cannot express relations or matrices. Proposal v2 (approved intent) selects **a relation-capable chart engine** after an open evaluation, adds purposeful **motion**, and reshapes the reports family **additively**. **Not changing:** bilateral capture flows (read-only consumption), the standalone Results Center, portfolio-wide analytics, `sp_role` legacy backfill (R-BIL-126 stands), the component framework (PRD C-1 — no shadcn/React).

**Glossary:** *SP* = CLARISA Science Program (catalog `clarisa_science_programs`: code, name, category, color, icon). *Alignment* = a result's active `result_pool_funding_alignment` + its SP rows with `sp_role ∈ {PRIMARY, CONTRIBUTING, null}`. *Bilateral contract* = contract with pool-funding tag or an active bilateral mapping (`pool-funding.util` predicate). *Morph* = animated transition between two chart forms over the same data.

---

## 2. Requirement numbering

`R-DA-NNN` functional · `NFR-DA-NNN` non-functional. Dependency order: server data first.

---

## 3. Functional requirements

### R-DA-001 — Contract SP-alignment aggregate endpoint (server)

- **As a** STAR client
- **I want** `GET /api/v1/agresso/contracts/reports/sp-alignment?contract-id=<id>`
- **So that** the dashboard can render the results↔SP relation structure without fetching per-result alignments.

**Details:**
- Inputs: `contract-id` query param, required (400 on empty — family behavior).
- Behavior: over the contract's **primary-scoped** results (shared subquery semantics, as `results-summary`), join active alignments → SP rows; group per SP with the linked results and each link's role; join `clarisa_science_programs` for display metadata (name, category, icon_key).
- Outputs: `ServerResponseDto` with `data: { sps: [{ sp_code, name, category, icon_key, links: [{ result_official_code, result_title, role: 'PRIMARY'|'CONTRIBUTING'|'UNKNOWN' }] }], results_with_alignment: number, results_without_alignment: number }`. `sp_role = null` maps to `'UNKNOWN'` — never dropped, never coerced to CONTRIBUTING (the read-only-badge lesson, ux-ui §12.2 2026-08-13).
- Errors: unknown contract or no alignments → empty `sps: []` with the two counters populated; malformed → 400.
- Permissions: any authenticated user (family posture).

**Acceptance criteria:**
- [ ] AC.1 — Envelope + shape above; Swagger decorators (family pattern).
- [ ] AC.2 — A result with two SP links appears under both SPs with its role per link; `links` counts are per-link, not per-result.
- [ ] AC.3 — Null-role rows surface as `'UNKNOWN'` (fixture-pinned).
- [ ] AC.4 — Non-bilateral contract → `sps: []`, `results_without_alignment` = its primary results count, HTTP 200.

#### Scenario: Aggregation honesty
- GIVEN a contract with results holding PRIMARY, CONTRIBUTING, and legacy null-role SP links
- WHEN the endpoint is called
- THEN every link appears with its stored role, null as `UNKNOWN`
- AND IT MUST aggregate in SQL over primary-scoped, active, non-snapshot results only
- BUT it must NOT invent a role for null rows or omit them.

### R-DA-002 — Indicator × report-year matrix data (server)

- **As a** STAR client
- **I want** per-indicator-per-year result counts for a contract
- **So that** the heatmap and the bars↔heatmap morph render from one aggregate.

**Details:**
- Delivery: extension of `results-summary` (`by_indicator_year: [{ indicator_id, year, count }]`) **or** a sibling report — design decides; either way additive (existing consumers unbroken).
- Null year groups into the explicit null bucket (consistent with `by_year`).

**Acceptance criteria:**
- [ ] AC.1 — For every indicator, the sum of its year cells equals that indicator's total; the sum of all cells equals `total` (the existing invariant extended).
- [ ] AC.2 — Existing `results-summary` consumers (dashboard status/trend/KPIs) are byte-compatible: no field renamed or removed.

#### Scenario: Matrix consistency
- GIVEN a contract with results across ≥2 indicators and ≥2 years
- WHEN the matrix is requested
- THEN cell sums reconcile with the per-indicator and per-year totals
- BUT it must NOT emit fabricated zero cells for indicator/year pairs with no results (absent = no cell)
- AND IT MUST bucket null years explicitly.

### R-DA-003 — SP Alignment Graph widget

- **As a** Center Admin / MEL expert on a bilateral project
- **I want** a force-layout bipartite graph: result nodes ↔ SP nodes
- **So that** I see at a glance how the project's results distribute across Science Programs and with which role.

**Details:**
- Edge treatment distinguishes PRIMARY / CONTRIBUTING / UNKNOWN — by more than color alone (e.g. weight/pattern + legend labels; WCAG 1.4.1).
- SP nodes sized by link count; SP labels always visible; result nodes labeled by official code (tooltip: title).
- Hovering/focusing an SP applies adjacency emphasis (non-connected elements de-emphasized); clicking a result node navigates to that result.
- Rendered **only** when `sps` is non-empty; otherwise the widget shows a purposeful absent/empty state ("No Science-Program alignments recorded for this project"), and for non-bilateral contracts it may be omitted entirely (design decides which; either way never an error state for "no data").
- Async states follow the established three-state pattern (skeleton / error+retry / empty).

**Acceptance criteria:**
- [ ] AC.1 — All three role classes render distinguishably, UNKNOWN included and labeled "role unknown" (fixture-pinned).
- [ ] AC.2 — The widget region has an accessible name AND a tabular alternative enumerating SP ↔ result ↔ role (the graph itself is not the only access path).
- [ ] AC.3 — Result-node activation (click AND keyboard) navigates to the result.
- [ ] AC.4 — With `sps: []`, the empty/absent state renders — no error, no empty canvas/SVG.

#### Scenario: Legacy honesty
- GIVEN an alignment whose SP rows have `sp_role = null`
- WHEN the graph renders
- THEN those edges appear in the UNKNOWN treatment with a legend entry
- BUT it must NOT render them as Contributing
- AND IT MUST include them in the tabular alternative.

### R-DA-004 — Indicator × Year heatmap with bars↔heatmap morph

- **As a** dashboard user
- **I want** a density matrix of results per indicator per year, reachable as a second view of the indicator distribution
- **So that** I see *when* reporting concentrated, not only totals.

**Details:**
- Sequential single-hue ramp (magnitude job), theme-reactive via tokens; cell tooltip = indicator, year, count; visible row/column labels.
- A view toggle on the indicator card switches bars ↔ heatmap over the same data with an animated transition (R-DA-007); the toggle state is plain UI state (no persistence requirement).
- Table alternative covers the matrix (may be the same table as the bars view, extended with year columns).

**Acceptance criteria:**
- [ ] AC.1 — Cell values reconcile with the bars view totals (same source, R-DA-002).
- [ ] AC.2 — Ramp legend (min→max) visible; values also readable per cell or via table (never color-only).
- [ ] AC.3 — Toggle is keyboard-operable; the current view is announced (aria-pressed or equivalent).

#### Scenario: One data, two views
- GIVEN the indicator card in bars view
- WHEN the user toggles to heatmap
- THEN the same totals are visible re-expressed as cells
- BUT it must NOT refetch from the server for the toggle
- AND IT MUST remain fully usable with animations disabled (reduced motion).

### R-DA-005 — Project Context strip

- **As a** dashboard user
- **I want** the project's financial/temporal/strategic context: budget (USD), funding type, contract status, timeline (start → end → extension, elapsed %), SDG chips, CGIAR entities
- **So that** the analytics sit in their project frame without visiting the shell header or AGRESSO.

**Details:**
- Sources: fields already on `AgressoContract` (`grant_amount_usd`, `center_amount_usd`, `funding_type`, `contract_status`, dates, `sdgs` json, `pooled_funding_contracts` relation). The current client `GetProjectDetail` lacks `funding_type`/`sdgs`/`center_amount_usd`/entities → the server response is **extended additively** (design decides: extend `findOneContract` payload or a light sibling; no existing field changes).
- **No fabrication rule (the S2 lesson):** any field whose source is absent/null renders nothing (chip omitted), never a placeholder value.
- Timeline: elapsed % computed from start/end (extension shown distinctly); undefined dates → timeline omitted.

**Acceptance criteria:**
- [ ] AC.1 — Every rendered value traces to a server field; a fixture with nulls renders the strip without those chips and without `0`/`N/A` fabrications.
- [ ] AC.2 — Currency values formatted with unit (USD) and locale-stable formatting; elapsed % clamps to [0,100].
- [ ] AC.3 — SDG chips use existing SDG display conventions (no new taxonomy — C-3).

#### Scenario: Partial data
- GIVEN a contract with `grant_amount_usd` set but `funding_type` null and no SDGs
- WHEN the strip renders
- THEN budget and timeline render; funding-type and SDG chips are absent
- BUT it must NOT render empty-labeled chips or invented values
- AND IT MUST keep the strip layout stable (no gap collapse artifacts).

### R-DA-006 — Single chart engine migration

- **As a** maintainer
- **I want** the trend card migrated to the new engine and chart.js removed
- **So that** the route runs one engine and the dormant dependency is gone.

**Details:**
- The trend card's visual contract is preserved: y-axis min 0, dashed in-progress current year, sparse-years (<2 buckets) stat-with-caption fallback, accessible name + hidden table (all pinned by the previous spec's tests — they must keep passing or be realigned only where the assertion was engine-specific).
- `chart.js` + `chartjs-plugin-datalabels` leave `package.json`; no `p-chart`/`ChartModule` import remains.

**Acceptance criteria:**
- [ ] AC.1 — Grep gates: zero `chart.js` / `primeng/chart` imports in `src/`; `package.json` clean of both packages.
- [ ] AC.2 — The previous spec's trend-card behavioral tests pass (engine-agnostic ones unchanged; engine-specific ones realigned via failing suite, K-018).

#### Scenario: Engine swap without behavior drift
- GIVEN the trend card fixtures from the previous spec (sparse and multi-year)
- WHEN rendered on the new engine
- THEN the same states render (stat fallback, dashed current year, table alternative)
- BUT it must NOT change the data contract or drop any state
- AND IT MUST keep the card inside the lazy chunk.

### R-DA-007 — Purposeful motion layer

- **As a** dashboard user
- **I want** animations that explain — staggered widget entries, SP-graph adjacency focus, the bars↔heatmap morph
- **So that** motion carries information (what belongs to what; that two views share one identity), not decoration.

**Details:**
- Durations 150–400 ms; easing standard; **no looping or ambient motion**.
- The morph is the single showcase transition; if it harms legibility it degrades to a crossfade (proposal §12 escape valve — decided at design/HITL, not silently).
- Under `prefers-reduced-motion`: all chart animations disabled at engine init; adjacency emphasis remains (it is a state change, not motion); the morph becomes an instant view swap.

**Acceptance criteria:**
- [ ] AC.1 — With reduced motion emulated, no chart entry/transition animation runs (engine init receives the disabled configuration — asserted on the init options; the *visual* absence is the HITL gate).
- [ ] AC.2 — All information conveyed by motion is available without it (adjacency also visible on focus state; both chart views reachable by toggle).

#### Scenario: Reduced motion
- GIVEN the OS reports `prefers-reduced-motion: reduce`
- WHEN the dashboard loads and the user toggles bars↔heatmap
- THEN views swap instantly with no transitional animation
- BUT it must NOT remove any interaction or data access
- AND IT MUST apply at engine initialization, not by racing an animation.

### R-DA-008 — Chart palette extension (multi-series + ramp)

- **As a** themed-UI user
- **I want** the new widgets colored from validated tokens in light and dark
- **So that** the charts stay legible and theme-correct (extends `--ac-viz-*`, design D-PD-13 of the previous spec).

**Details:**
- New tokens: `--ac-viz-series-2..n` (as many as design needs — SP category accents, role treatments) and a sequential heatmap ramp (≥4 steps, one hue, monotonic lightness per theme).
- Registered in `colors.scss` + mirrored to client README + `docs/ux-ui/design.md` §7 in the same change.
- The SP catalog's `color` column (raw hex, dark-blind) is **not** used for chart marks — badges only.

**Acceptance criteria:**
- [ ] AC.1 — Validator output recorded for light AND dark against the card surface: categorical additions pass the categorical checks; the ramp passes lightness monotonicity.
- [ ] AC.2 — Zero hex literals in new component code (grep gate over new files).

### R-DA-009 — Accessibility of the new visual layer

- **As a** keyboard / screen-reader user
- **I want** every new widget operable and comprehensible without vision or mouse
- **So that** the analytics remain WCAG 2.1 AA (C-4).

**Acceptance criteria:**
- [ ] AC.1 — Each widget: accessible name + tabular alternative (graph: SP↔result↔role table; heatmap: matrix table; context strip is native DOM).
- [ ] AC.2 — Every interactive element (graph nodes, toggle, retry, chips with links) tab-reachable with visible focus; no `title=`-only information.
- [ ] AC.3 — Role/status/category distinctions never color-alone.

---

## 4. Non-functional requirements

### NFR-DA-001 — Bundle discipline
- **Category:** performance
- **Target:** the chart engine lives **only** in the lazy `project-dashboard` chunk; initial bundle unchanged vs. base (±1 kB); `angular.json` budgets hold (C-5). chart.js removal recorded as the offsetting delta.
- **How verified:** base-vs-branch `npm run build` initial-chunk diff; gate proven able to fail (eager-import probe) — K-004. **Disqualifier:** deltas within build noise claimed as proof; mixed raw/gzip comparisons.

### NFR-DA-002 — Payloads
- **Category:** performance
- **Target:** `sp-alignment` + matrix data ≤ 50 kB for the largest Dev contract; no per-result client-side fan-out requests.
- **How verified:** one Dev measurement recorded; client tests assert single aggregate calls.

### NFR-DA-003 — Palette validation
- **Category:** a11y — covered by R-DA-008 AC.1 (validator, both themes; ramp monotonicity).

### NFR-DA-004 — Test floors
- **Category:** dx
- **Target:** client (40/20/45/30) and server (60) floors hold; suites serial (root guide §4.3).

### NFR-DA-005 — Interaction latency
- **Category:** performance
- **Target:** graph interaction (hover focus) remains fluid at the realistic ceiling (13 SPs × ~200 results); if a Dev contract exceeds smooth rendering, the widget caps visible result nodes with an explicit "showing top N by recency" disclosure — never silent truncation (K-014 family).
- **How verified:** manual interaction check at HITL with the largest Dev contract. **Disqualifier:** judging fluidity on a tiny fixture.

---

## 4.1 Defect classes → gates (KZ-017)

| # | Defect class | Gate | Blind-spot handling |
|---|---|---|---|
| D1 | App type/template errors | `npm run build` (strictTemplates) | spec files → D2 |
| D2 | Spec-code type errors | `npx tsc -p tsconfig.spec.json --noEmit` vs 945 baseline | delta-zero, not clean |
| D3 | Behavioral regressions | full suites, serial; rendered-DOM assertions (KZ-001); transition-arranged fixtures (KZ-015) | targeted runs need `--coverage=false` (K-020) |
| D4 | Hex reintroduction | grep over new/touched files, total counted first (K-014) | token misuse → D6 |
| D5 | Bundle breach / engine leaks into initial chunk | build budget + chunk diff (NFR-DA-001), gate seen red first | — |
| D6 | **Visual: graph legibility, morph clarity, contrast, dark mode, motion feel** | **no automated gate** — mandatory HITL: light+dark screenshots + interaction pass (graph hover, morph, reduced-motion emulation) at validation; T6 Multimodal review optional per registry | declared substitute, not skipped |
| D7 | SQL aggregation wrong | repository specs asserting generated SQL + params (KZ-001); Dev cross-check recorded | mocked builders can't run SQL (KZ-017) |
| D8 | Palette not CVD/contrast-safe | dataviz validator light+dark + ramp monotonicity (R-DA-008) | validator ships in the `dataviz` skill — executing agent must load it; unavailable → escalate (SU7 lesson) |
| D9 | Reduced-motion not honored | init-options assertion (presence) — **cannot prove visual absence**; the visual half belongs to D6's HITL with emulation | presence-vs-behavior split declared |
| D10 | Packaging (K-017) | n/a — no runtime asset produced | recorded n/a |
| D11 | Breaking an existing `results-summary` consumer | previous spec's tests kept green (AC R-DA-002.2) + additive-only rule | — |

---

## 5. Data requirements

None schema-wise. No migrations. Reads: `result_pool_funding_alignment(_sp)`, `clarisa_science_programs`, `results`, `result_contracts`, `agresso_contracts` (+ `pooled_funding_contracts`), existing summary tables. ToC tables (`result_pool_funding_toc_alignment`) only if the stretch rollup enters scope (OQ-3).

## 6. API surface delta

| Method + URL | Roles | Data shape | Notes |
|---|---|---|---|
| `GET …/contracts/reports/sp-alignment?contract-id=` | authenticated (family) | `{ sps[], results_with_alignment, results_without_alignment }` | new; Swagger mandatory |
| `results-summary` extension **or** sibling matrix endpoint | authenticated | `by_indicator_year[]` | additive only (D11) |
| Project-detail payload extension (context fields) | authenticated | + `funding_type, sdgs, center_amount_usd, cgiar_entities[], status fields` | additive; design decides carrier |

## 7. Cross-system impact

Client: `project-detail` feature + new shared chart wrapper + token registry. Server: `agresso-contract` reports family + read-only joins into bilateral tables (no bilateral module behavior change). CLARISA/AGRESSO/TIP/OpenSearch/sockets untouched. New client dependency: the selected chart engine (proposal §10.1: ECharts, SVG renderer).

## 8. Assumptions, dependencies, risks

| Type | Item | Mitigation |
|---|---|---|
| Assumption | ECharts (SVG renderer) per proposal §10.1; wrapper form decided at design (OQ-1) | requirements stay engine-behavioral |
| Dependency | `docs/specs/archive/2026-08-22-changes--project-dashboard-redesign/` merged (tokens, util, async pattern) | verified done |
| Risk | Graph illegible at high result counts | NFR-DA-005 cap-with-disclosure |
| Risk | Morph confuses instead of clarifies | R-DA-007 escape valve → crossfade; decided at HITL, recorded |
| Risk | KZ-002: widgets conditional per contract type | bilateral AND non-bilateral fixtures mandatory |
| Risk | Legacy null roles misread | R-DA-001 AC.3 / R-DA-003 Scenario fixture-pinned |

## 9. Open questions

| # | Question | Owner | Target |
|---|---|---|---|
| OQ-1 | ngx-echarts vs in-house wrapper over `echarts/core` | design phase | Phase 2 |
| OQ-2 | Matrix in `results-summary` vs sibling endpoint | design phase | Phase 2 |
| OQ-3 | ToC contribution-vs-target rollup in scope (stretch) or deferred to a C follow-up | j.cadavid | Phase 2 gate |
| OQ-4 | Context fields carrier: extend `findOneContract` vs light sibling endpoint | design phase | Phase 2 |
| OQ-5 | Non-bilateral contracts: SP widget hidden entirely vs explicit absent-state card | j.cadavid (product feel) | Phase 2 gate |

## 10. Sign-off

- [ ] Engineering lead — j.cadavid
- [ ] MEL / product owner — pending
- [ ] Security review — n/a
- [ ] DevOps — n/a
