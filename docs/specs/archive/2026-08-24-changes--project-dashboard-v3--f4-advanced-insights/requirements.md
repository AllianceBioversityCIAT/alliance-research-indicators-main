# Requirements — agresso / Project Dashboard v3 · F4 Advanced Cross-Cutting Insights

- **Module:** agresso (server) + client / project-detail (STAR)
- **Spec id:** 2026-08-project-dashboard-v3-f4
- **Status:** draft
- **Owner:** JuanCode
- **Parent Spec:** `changes/project-dashboard-v3` (`../family.md`, child 4 of 4; depends on `f2-consolidated-endpoint` — **done**; ⚠ not parallel-safe with `f3-indicator-deep-dive` (in execution) — client tasks sequence after F3's land)
- **Linked PRD section:** [`docs/prd.md`](../../../../prd.md) (STAR analytics / project dashboard)
- **Linked proposal:** [`./proposal.md`](./proposal.md) — **scope cut applied at specify (owner, 2026-08-23): 6 of 10 candidates**
- **Extends:** F3's lazy per-section aggregate pattern (`reports/indicator-details`: nullable sections, `{total_results, n}`, omitted/null/sparse tri-state); F1 hero (contract-declared SDGs already rendered there)
- **Last updated:** 2026-08-23

---

## 1. Context

The `results` satellite tables hold cross-cutting, analysis-grade fields no dashboard reads: gender×youth disaggregation (`result_actors`), result-level SDGs (`result_sdgs`), evidence records (`result_evidences`), review events (`result_review_history`), non-primary levers (`result_levers`), and free-text keywords (`result_keywords`). F4 turns six of them into an **Insights** section so the PI can judge equity of reach, real vs declared SDG coverage, reporting quality, where reviews stall, the full lever picture, and the thematic profile.

**Scope cut (owner decision, 2026-08-23):** IN — reach, SDG coverage, evidence completeness, review funnel + cycle time, contributing levers, keywords treemap. **Backlog (recorded, not specified):** ToC target-vs-actual (pooled-aligned only → future pool-funding spec), platform-origin donut (blocked on KZ-012's NULL `platform_code` bucket — settle with `SELECT platform_code, COUNT(*) FROM results GROUP BY platform_code` before any spec uses it), AI-assisted/PRMS-synced KPIs (governance, low PI value), lever→indicator Sankey (decorative).

**Not changing:** F1/F2/F3 widgets, endpoints, DTOs or drill contracts; satellite tables (read-only; no migrations — K-015 n/a).

## 2. Requirement numbering

`R-IN-NNN` / `NFR-IN-NNN` (Insights).

---

## 3. Functional requirements

### R-IN-001 — Lazy cross-cutting insights endpoint

- **As a** STAR client
- **I want** one request returning the six insight aggregates for a contract
- **So that** the Insights section renders from one consistent snapshot without touching the dashboard's first paint

**Details:**
- Route: `GET /api/v1/agresso/contracts/reports/insights?contract-id=` (required; missing/blank → 400; reports-family auth parity; full Swagger).
- Response `data`: six **nullable** sections — `reach`, `sdg_coverage`, `evidence`, `review_flow`, `contributing_levers`, `keywords` — each carrying `{total_results, n}` (`n` = results contributing rows to that section); a section whose computation fails is `null` + an envelope `errors` entry (F2/F3 semantics); all-fail → 500. Unlike F3, sections are **never omitted** (every contract has all six concepts; emptiness is `n = 0`).
- All coded dimensions resolve to display names server-side (actor types, SDG short/full names, lever names, evidence roles, review event/decision labels) — no bare ids (C-3).
- Computed over the primary-contract seed predicate (`buildPrimaryContractResultsSubquery`).

#### Scenario: Full payload
- GIVEN contract A511
- WHEN the endpoint is called
- THEN all six sections are present, each with `{total_results, n}` and label-resolved dimensions
- BUT it must NOT omit a section because it is empty — `n = 0` is the empty signal
- AND IT MUST resolve a failed section to `null` with an envelope `errors` entry while the others return

### R-IN-002 — Section contents

| Section | Source | Aggregates (counts — the client derives shares) |
|---|---|---|
| `reach` | `result_actors` | Σ `women_youth`, `women_not_youth`, `men_youth`, `men_not_youth` **overall and per actor type** (label; custom name when type is "other"); `not_disaggregated_rows` = rows flagged `sex_age_disaggregation_not_apply`; rows with NULL disaggregation columns excluded from sums (absent ≠ 0). Portfolio-wide (all indicators) — distinct from F3's Innovation-Use-only view |
| `sdg_coverage` | `result_sdgs` + `clarisa_sdgs` | results per SDG `{sdg_id, short_name, full_name, count}`; the client compares against the **contract-declared SDGs already loaded in the F1 hero** to derive `declared ∩ reported`, `declared-only`, `reported-only` |
| `evidence` | `result_evidences` | `results_with_evidence`, `evidences_total`, `public_count`, `private_count`, per-role counts (label) |
| `review_flow` | `result_review_history` | counts per `event_type`/`decision` (labels); **cycle time**: for results with an approval-type decision, days from their first submission-type event to that approval — `median_days`, `p90_days`, `sample_size`; events ordered by timestamp (never insertion order); results with out-of-order or missing anchor events excluded from cycle time but counted in `excluded_for_incomplete_history` |
| `contributing_levers` | `result_levers` where `is_primary = false` (+ lever names) | results per lever `{lever_id, short_name, full_name, count}` |
| `keywords` | `result_keywords` | top **30** keywords by result frequency after normalization (trim, lowercase, collapse inner whitespace); `{keyword, count}`; distinct results per keyword (a result repeating a keyword counts once) |

#### Scenario: Cycle time with messy history
- GIVEN a result with events inserted out of chronological order and another with an approval but no submission event
- WHEN `review_flow` is computed
- THEN the first result's cycle time uses timestamp order, and the second is excluded from cycle-time stats and counted in `excluded_for_incomplete_history`
- BUT it must NOT compute a negative or zero-anchored duration from insertion order
- AND IT MUST report `sample_size` = results that actually contributed a duration

#### Scenario: Keyword normalization
- GIVEN keywords `"Soil Health"`, `"soil health"`, `" soil  health "` across three results
- WHEN `keywords` is computed
- THEN they collapse into one entry `soil health` with `count = 3`
- BUT it must NOT count the same result twice for a keyword it stores twice
- AND IT MUST cap the list at 30 entries ordered by count desc, then keyword asc

### R-IN-003 — Insights section (lazy, tri-state)

- **As a** PI
- **I want** an "Insights" section below the indicator deep-dive
- **So that** portfolio-level signals sit after the per-indicator detail, on demand

**Details:**
- Placement: after the F3 deep-dive panel, before the pending-revision table (F1 order preserved otherwise).
- **Lazy** on first viewport entry (or keyboard focus), one fetch per contract view, retry re-fetches (F3 rules).
- Cards: **Reach** (stacked bars women/men × youth/not-youth, overall + by actor type; `not_disaggregated` shown as a count), **SDG coverage** (three chip groups: reported∩declared, declared-only, reported-only; counts per SDG), **Evidence** (KPI tiles: % results with evidence, public/private split, per-role bars), **Review flow** (funnel by decision + cycle-time stats tiles median/p90/n; excluded count shown), **Contributing levers** (bars, same idiom as primary levers), **Keywords** (**treemap**, top 30, tooltip with count).
- States per card: skeleton (distinct from empty), error + shared retry (section `null`), **sparse notice** when `0 < n < total_results`, empty notice when `n = 0` (no chart). Every chart via `viz-chart` with `tableModel` + accessible name; `TreemapChart` registered tree-shaken.

#### Scenario: Reach card
- GIVEN `reach.n = 12` of `total_results = 20`
- WHEN the card renders
- THEN stacked bars show the four disaggregation sums and the sparse notice reads "12 of 20"
- BUT rows flagged not-disaggregated must NOT appear inside the bars — they render as a separate count
- AND IT MUST expose the same sums in the chart's accessible table

#### Scenario: SDG comparison
- GIVEN the contract declares SDG 2 and SDG 13, and results report SDG 2 and SDG 15
- WHEN the SDG card renders
- THEN chips show `SDG 2` under reported∩declared, `SDG 13` under declared-only, `SDG 15` under reported-only
- BUT it must NOT re-fetch contract SDGs — they come from the already-loaded F1 hero data
- AND IT MUST show the reported count on each reported SDG chip

### R-IN-004 — Siblings untouched

**Details:** F1 widgets/drills, F2's `reports/dashboard`, F3's `reports/indicator-details` and deep-dive panel remain unchanged; Insights adds one lazy request and one mounted section. The F3 `innovation_use` actors aggregate and F4 `reach` coexist with explicit labels ("Innovation Use reach" vs "Portfolio reach").

#### Scenario: No regression
- GIVEN Insights is mounted
- WHEN the dashboard loads and the user drills any F1 chart
- THEN behavior is identical to pre-F4, and first-paint requests are unchanged
- BUT Insights must NOT fetch before intersection
- AND IT MUST keep F3's panel and its request count unchanged

---

## 4. Non-functional requirements

### NFR-IN-001 — No first-paint cost · **NFR-IN-002** — endpoint p95 ≤ 800 ms (dev, A511-class; 3 runs, spread >±40% → inconclusive) · **NFR-IN-003** — bundle budgets green, Treemap inside the lazy chunk (initial ±5 kB) · **NFR-IN-004** — coverage floors both tiers. *(Verification as F3's NFR-DD-001…004 — same commands, same disqualifiers.)*

## Defect classes and their gates

| Defect class | Gate | Blind-spot handling |
|---|---|---|
| Wrong SQL over satellites (NULL disaggregation as 0, double-counting 1:N, keyword dedupe) | Repository specs on **generated SQL + params** (KZ-001) with fixtures: NULL columns, repeated keyword per result, out-of-order history | **Dev ground-truth** for `reach` sums and `keywords` top-3 on A511 vs hand-run SQL (recorded) |
| Cycle-time correctness (ordering, anchors, exclusions) | SQL/TS specs with messy-history fixtures (R-IN-002 scenario) — **named failing input:** insertion-ordered fixture must produce a different median than timestamp order | ~~Ground-truth on one real approved result~~ **(AMENDED — Pivot T-03: impossible today, zero approval events exist)** Ground-truth = verify on dev that zero submission/approval events exist and the endpoint reports `sample_size = 0` + full `excluded_for_incomplete_history` honestly, recorded |
| Bare ids leaking / wrong labels | DTO + HTTP-path integration spec assertions | — |
| Envelope/partial-failure path | **In-process HTTP-path integration spec** (`npm run test:integration`, repository `overrideProvider`-mocked — never `AppModule`/real DB, K-021) | Unit mocks cannot see the interceptor (KZ-017) |
| Eager fetch / SDG re-fetch | Component specs: zero fetch before intersection; contract SDGs taken from existing hero input, no extra request | Real laziness: HITL network with section below the fold |
| Tri-state misrendering (null vs n=0 vs sparse) | Component specs per card (KZ-015 transitions) | — |
| **Rendered treemap/stacked-bar/funnel correctness + dark mode** | No automated gate — `npm run tokens:validate` + mandatory HITL light+dark (KZ-014) | Presence of options ≠ rendering (declared) |
| Collision with F3's in-flight client changes | Client tasks gated until F3's land; failing-suite run after rebase (K-018) | — |

## 5. Data requirements

None (read-only; no migrations/OpenSearch).

## 6. API surface delta

**NEW:** `GET /api/v1/agresso/contracts/reports/insights` (above). No deprecations.

## 7. Cross-system impact

STAR client only. SDG labels from `clarisa_sdgs` (already synced locally — no new CLARISA calls).

## 8. Assumptions, dependencies, risks

- **A-1 (AMENDED 2026-08-24 — Pivot T-03, owner-approved Option A):** `result_review_history` rows carry `created_at` (AuditableEntity) usable as the event timestamp — **held at verification**. The second half was **false**: `event_type` (varchar 50) / `decision` (varchar 20) have no enum or CHECK constraint; `decision` is written nowhere; the only live writers are `POOL_FUNDING_ALIGNMENT_CHANGED` / `INDICATOR_MAPPING_CHANGED` audit events (`bilateral.service.ts`), and `reviewDecision` — the only plausible submission→approval writer — is a `NotImplementedException` stub. **Resolution:** the submission/approval vocabulary is defined **forward-looking** in one canonical TS constant in the `result-review-history` module (values from the archived bilateral design: `REVIEW_DECISION`; `APPROVE|REJECT|EDIT` — **plus `RESULT_SUBMITTED` as the submission anchor, owner-approved addendum D-F4-8**: audit-edit events are NOT submission proxies); the future `reviewDecision` implementation MUST import it and write both `RESULT_SUBMITTED` and `REVIEW_DECISION` events. On current data, cycle-time `sample_size = 0` is the correct, honest output — not a defect (R-1 already covers the UI honesty).
- **A-2:** contract-declared SDGs are available to the dashboard from the F1 hero source without a new request.
- **R-1 (risk):** review-history vocabulary may be sparse/inconsistent for imported results → cycle time may have tiny `sample_size`; the UI shows `n` and the excluded count honestly.
- **R-2 (risk):** keyword free text quality — normalization is bounded (case/whitespace) by design; no stemming (recorded non-goal).
- **KZ-012:** platform-origin metric deliberately excluded until the NULL bucket is settled.

## 9. Open questions

- None open (scope cut + backlog decided at Phase 1).

## 10. Sign-off

- [ ] Engineering lead — JuanCode
- [ ] MEL / product owner — —
