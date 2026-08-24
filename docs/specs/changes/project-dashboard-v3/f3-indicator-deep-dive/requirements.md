# Requirements — agresso / Project Dashboard v3 · F3 Indicator Deep-Dive

- **Module:** agresso (server) + client / project-detail (STAR)
- **Spec id:** 2026-08-project-dashboard-v3-f3
- **Status:** draft
- **Owner:** JuanCode
- **Parent Spec:** `changes/project-dashboard-v3` (`../family.md`, child 3 of 4; depends on `f1-hero-layout` — **done** — and `f2-consolidated-endpoint` — **in execution**; ⚠ execution of F3 must start only after F2's client tasks land)
- **Linked PRD section:** [`docs/prd.md`](../../../../prd.md) (STAR analytics / project dashboard)
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Extends:** F2's consolidated service pattern (as-built: `GetContractDashboardService`, `reports/dashboard`); F1's dashboard layout (reserved deep-dive slot beside/below Results by indicator)
- **Last updated:** 2026-08-23

---

## 1. Context

Each indicator type stores rich, exclusive metadata in satellite tables (`result_capacity_sharing`, `result_innovation_dev`, `result_policy_change`, `result_knowledge_products`, `result_oicrs`; Innovation Use derives from `result_actors` / `result_institution_types` / `result_quantifications`) that **no endpoint aggregates per contract** — the dashboard can count results but cannot answer "how many people did this project train, at what gender split?" or "what readiness levels are its innovations at?". F3 adds one lazy aggregate endpoint and a tabbed deep-dive panel, plus three new chart forms (Pie, Funnel, Radar) in `viz-chart`.

**Key data reality (drives several requirements):** satellite completeness varies by source platform — results imported from TIP/PRMS/AICCRA lack STAR satellite metadata. Every aggregate therefore carries its **n** (results contributing metadata) against the indicator's total, and sparse metadata is a first-class UI state, never an error.

**Not changing:** any F1 widget or drill behavior (Results-by-indicator clicks keep navigating to filtered results); F2's `reports/dashboard` DTO (in flight — F3 does not touch it); satellite tables themselves (read-only; no migrations — K-015 n/a).

## 2. Requirement numbering

`R-DD-NNN` / `NFR-DD-NNN` (Deep-Dive).

---

## 3. Functional requirements

### R-DD-001 — Per-indicator aggregate endpoint

- **As a** STAR client
- **I want** one request returning per-indicator-type aggregates for a contract
- **So that** the deep-dive panel renders what kind of results the project produces

**Details:**
- Route: `GET /api/v1/agresso/contracts/reports/indicator-details?contract-id=` (required param; missing/blank → 400; auth parity with the reports family; full Swagger).
- Response `data`: one nullable section per indicator type (`capacity_sharing`, `innovation_dev`, `knowledge_product`, `policy_change`, `oicr`, `innovation_use`) **present only when the indicator has ≥1 result on the contract** (primary-contract seed predicate), plus `reporting_velocity` (R-DD-006).
- Every section carries `{ total_results, n }` where `n` = results of that indicator contributing satellite metadata (`n ≤ total_results`).
- All id-coded dimensions resolve to display names via their lookup tables server-side (session formats/lengths/modalities, readiness levels, policy stages/types, maturity levels, actor types) — the client receives labels, not bare ids (C-3: labels come from the system-of-record lookups, no client-side taxonomy).
- Partial failure: a failed section resolves `null` + envelope `errors` entry (same semantics as F2's aggregate); all-fail → 500.

#### Scenario: Contract with mixed indicators
- GIVEN contract A511 with Knowledge Product, Capacity Sharing, Policy Change and Innovation Development results
- WHEN the endpoint is called
- THEN exactly those four sections are present (no `oicr`, no `innovation_use` keys)
- AND each carries `total_results` and `n`
- BUT it must NOT emit a section for an indicator with zero results
- AND IT MUST resolve every dimension to its display name (a bare lookup id in the payload is a defect)

### R-DD-002 — Aggregate contents per indicator type

The endpoint SHALL aggregate, per section:

| Section | Source | Aggregates (each with counts, not percentages — the client derives shares) |
|---|---|---|
| `capacity_sharing` | `result_capacity_sharing` | total trainees (Σ `session_participants_total`); gender split (Σ male / female / non-binary); session length mix (short/long via `session_lengths`); delivery modality mix; session type mix |
| `innovation_dev` | `result_innovation_dev` | readiness-level histogram (level value + name, ordered by level); innovation type mix; nature mix; anticipated-users mix; scalability profile: for each of the 7 booleans (`is_cheaper_than_alternatives`, `is_simpler_to_use`, `does_perform_better`, `is_desirable_to_users`, `has_commercial_viability`, `has_suitable_enabling_environment`, `has_evidence_of_uptake`) → `{true_count, answered_count}` |
| `knowledge_product` | `result_knowledge_products` | open-access split (open vs restricted vs unknown); access-status mix; type mix; publications by year (`publication_date`) |
| `policy_change` | `result_policy_change` | stage funnel (ordered by `policy_stage` order); policy-type mix; implicated institutions count (`result_institutions` role 4, distinct) |
| `oicr` | `result_oicrs` | maturity-level distribution; external-use split (`for_external_use`) |
| `innovation_use` | `result_actors` + `result_institution_types` + `result_quantifications` | gender×youth reach: Σ `women_youth`, `women_not_youth`, `men_youth`, `men_not_youth` (overall and by actor type); organization-type mix; quantifications grouped by `unit` (Σ `quantification_number`, count) |

#### Scenario: Sparse satellite data (imported results)
- GIVEN an indicator with 5 results of which only 2 have satellite rows (3 imported from TIP)
- WHEN the section is computed
- THEN `total_results = 5`, `n = 2`, and every aggregate reflects only the 2 contributing results
- BUT it must NOT treat missing satellite rows as zeros inside averages/sums (absent ≠ 0)
- AND IT MUST return the section (with its small `n`) rather than omitting it

### R-DD-003 — Lazy deep-dive panel

- **As a** PI
- **I want** an "Indicator deep-dive" panel with one tab per indicator the project reports
- **So that** I see the nature of results without opening them one by one

**Details:**
- Renders in the dashboard's reserved F1 slot (Results-by-indicator region); tabs only for indicators with results, ordered by result count (same order as the bars).
- **Lazy:** the endpoint fires only when the panel first enters the viewport (or is focused via keyboard); one fetch per contract view, retained for the session's view (no TTL cache added — K-016 n/a; a retry action re-fetches).
- States: skeleton while loading (explicitly distinguishable from empty — K-016 lesson); error with retry; per-tab **metadata-sparse notice** when `n < total_results` ("Showing metadata from n of N results; results imported from other platforms may not include it" — pairs with the existing caveat); per-tab empty body when `n = 0` (notice only, no charts).

#### Scenario: Lazy fetch
- GIVEN a user lands on the dashboard and does not scroll
- WHEN the first paint completes
- THEN zero requests to `indicator-details` have been issued
- AND scrolling the panel into view issues exactly one
- BUT it must NOT re-fetch on subsequent scrolls or tab switches
- AND IT MUST show the loading skeleton (not an empty state) between intersection and response

#### Scenario: Sparse tab
- GIVEN the Capacity Sharing section returns `n = 2, total_results = 5`
- WHEN its tab renders
- THEN charts render from the 2 contributing results and the sparse notice shows "2 of 5"
- BUT a section with `n = 0` must NOT render charts — notice only
- AND IT MUST NOT present the sparse state as an error (no retry button on it)

### R-DD-004 — Chart forms per aggregate

**Details:** rendered via `viz-chart` (each with `tableModel` + accessible name — C-4/R-HL-009 conventions):
- capacity sharing: gender split donut + modality/length bars; trainees total as stat.
- innovation dev: readiness histogram (vertical bars, ordered by level) + **scalability radar** (7 axes, value = true_count/answered_count).
- knowledge product: open-access **donut** + publications-by-year line/bars.
- policy change: stage **funnel** (ordered) + type bars.
- oicr: maturity donut + external-use split.
- innovation use: gender×youth **stacked bars** + quantifications table (units are heterogeneous — table, not chart).
- `viz-chart` registers `PieChart`, `FunnelChart`, `RadarChart` (tree-shaken, inside the lazy project-dashboard chunk); chart colors from `--ac-viz-*` tokens only; `npm run tokens:validate` green.

#### Scenario: Radar renders answered-only
- GIVEN 4 of 6 innovation-dev rows answered `is_simpler_to_use`
- WHEN the radar renders
- THEN that axis shows 4 as its denominator basis (from `answered_count`)
- BUT unanswered booleans must NOT count as `false`
- AND IT MUST expose the same numbers in the chart's accessible table

### R-DD-005 — F1 behavior preserved

**Details:** Results-by-indicator bar/heatmap clicks keep navigating to filtered Project Results (F1 contract, untouched); the deep-dive tabs are an independent control. No `deepDive` query param in F3 (proposal OQ-2 closed: MAY come later; not now).

#### Scenario: No drill regression
- GIVEN the deep-dive panel is rendered
- WHEN the user clicks a Results-by-indicator bar
- THEN navigation to filtered Project Results happens exactly as in F1
- BUT the deep-dive panel must NOT intercept or alter that navigation

### R-DD-006 — Reporting velocity (monthly)

**Details:** the endpoint's `reporting_velocity` section returns results-created-per-month (`results.created_at`, last 24 months, primary-contract seed) — the activity signal that stays informative when only one `report_year` exists. Rendered as a compact "Reporting activity" line above the tabs inside the deep-dive section. Kept in this endpoint (not F2's DTO) to avoid touching F2's in-flight contract — recorded as a design decision.

#### Scenario: Single report-year project
- GIVEN a project whose 20 results all share report year 2026 but were created across 6 months
- WHEN the deep-dive loads
- THEN the velocity chart shows the 6 monthly buckets
- AND IT MUST bucket by `created_at` month, never by `report_year`
- BUT it must NOT replace or modify the F1 "Results over time" widget

---

## 4. Non-functional requirements

### NFR-DD-001 — No first-paint cost
- **Category:** performance
- **Target:** dashboard first-paint request set unchanged (the F2 aggregate + non-analytic calls); `indicator-details` appears only after the panel enters the viewport.
- **How verified:** component spec (no fetch before intersection) + HITL network panel; **disqualifier:** a check with the panel initially in-viewport (short viewport) proves nothing about laziness — verify with the panel below the fold.

### NFR-DD-002 — Endpoint latency
- **Category:** performance
- **Target:** p95 ≤ 800 ms on dev for A511-class contracts (6 sections + velocity, concurrent).
- **How verified:** 3 timed runs at close; spread >±40% → report spread, no pass.

### NFR-DD-003 — Bundle budgets with 3 new chart types
- **Category:** performance
- **Target:** `angular.json` budgets green; echarts additions stay inside the lazy project-dashboard chunk (initial bundle unchanged ±5 kB).
- **How verified:** `npm run build` budget output + initial-bundle size compared before/after; **disqualifier:** comparing against a build from a different day/branch state.

### NFR-DD-004 — Coverage
- **Category:** dx
- **Target:** server 60% global; client floors (40/20/45/30); sibling specs for every touched file.
- **How verified:** `npm run test:cov` / `npm run test:coverage`.

## Defect classes and their gates

| Defect class | Gate | Blind-spot handling |
|---|---|---|
| **Wrong SQL aggregates over satellite tables** (bad joins, absent-as-zero, double counting on 1:N satellites) | Repository specs asserting **generated SQL + params** (KZ-001) with fixtures covering: multi-row satellites, missing satellite rows, NULL booleans | Mocked query builders cannot represent SQL semantics (KZ-017) → substituted by the **dev ground-truth check**: for A511, compare endpoint numbers against hand-run SQL for ≥2 sections (capacity trainees total + KP open-access), recorded in `execution.md` |
| Bare lookup ids leaking to the client | DTO/integration-spec assertions on label fields (**failing input:** drop a lookup join → label null → must fail) | — |
| Section emitted for zero-result indicator / omitted for present one | In-process HTTP-path integration spec (`npm run test:integration`, repository mocked — never `AppModule`/real DB) + unit specs | Amended 2026-08-23: a full-`AppModule` e2e is an infrastructure test, not this gate |
| Eager fetch (laziness broken) | Component spec: no fetch before intersection event (KZ-015 transition: construct below-fold, assert zero calls, intersect, assert one) | jsdom has no real IntersectionObserver → mock at boundary; the **real** laziness is HITL's network check (declared) |
| Sparse state rendered as error/empty wrongly | Component specs for `n=0`, `0<n<total`, `n=total` transitions | — |
| **Rendered chart correctness** (radar shape, funnel order, donut labels, dark-mode contrast of new forms) | **No automated gate** — substituted: `npm run tokens:validate` for token contrast + mandatory HITL light+dark screenshots of every new chart form (KZ-014) | Presence of options objects ≠ rendered chart (declared presence caveat) |
| Bundle regression | `npm run build` budgets + before/after initial size (NFR-DD-003) | — |
| Collision with F2's in-flight client changes | Rebase gate: F3 client tasks **blocked until F2 client tasks land**; the failing-suite run after rebase enumerates conflicts (K-018) | — |

## 5. Data requirements

None — read-only aggregation; no entities, columns, indexes, migrations, or OpenSearch changes.

## 6. API surface delta

**NEW:** `GET /api/v1/agresso/contracts/reports/indicator-details` (params, sections, nullable semantics above; Swagger complete; machine-token visible like siblings). No deprecations.

## 7. Cross-system impact

STAR client only (deep-dive panel + viz-chart registrations). No CLARISA/AGRESSO-sync/TIP/OpenSearch/DynamoDB/RabbitMQ/Socket.IO changes. Lookup labels come from the server's own lookup tables (no new CLARISA calls).

## 8. Assumptions, dependencies, risks

- **A-1:** F2's as-built patterns (repository composition method, consolidated signal service, partial-failure envelope) are the templates F3 mirrors; F3 reads but does not modify F2's DTO/service.
- **A-2:** satellite lookup tables (`session_lengths`, `clarisa_innovation_readiness_levels`, `policy_stage`, `maturity_levels`, etc.) carry display names adequate for UI (verified in the family analysis; re-check at implementation for NULL names).
- **R-1 (risk):** `policy_stage` ordering for the funnel may not have an explicit order column — if absent, order by stage id and record it; a wrong funnel order is a HITL-visible defect.
- **R-2 (risk / dependency):** F2 execution is concurrently modifying `project-dashboard.component` — F3's client tasks are sequenced after F2's land (family manifest: not parallel-safe).
- **KZ-012 adjacency:** none of F3's aggregates depend on `platform_code`; the sparse-notice copy references "other platforms" generically (the NULL-platform question stays with F4).

## 9. Open questions

- **OQ-1 (closed):** velocity lives in `indicator-details`, not F2's DTO (see R-DD-006 rationale).
- **OQ-2 (closed):** no `deepDive` deep-link param in F3 (MAY, later).
- **OQ-3:** mockup — proposal recommends generating a Stitch/design mockup for the tabbed panel before implementation. Owner decides at Phase 1 approval; absence does not block (design §6 carries the layout contract either way).

## 10. Sign-off

- [ ] Engineering lead — JuanCode
- [ ] MEL / product owner — —
