# Design — agresso / Project Dashboard v3 · F3 Indicator Deep-Dive

- **Module:** agresso (server) + client / project-detail (STAR)
- **Spec id:** 2026-08-project-dashboard-v3-f3
- **Status:** draft
- **Owner:** JuanCode
- **Linked requirements:** ./requirements.md
- **Visual reference:** `./mockup/deep-dive-panel.html` (self-contained HTML, owner-approved at Phase 1; Stitch MCP unavailable this session — repo-versioned mockup chosen for traceability)
- **Last updated:** 2026-08-23

---

## 1. Goals & non-goals

**Goals**
1. One lazy aggregate endpoint over the 6 satellite clusters + monthly velocity (R-DD-001/002/006).
2. Tabbed deep-dive panel with honest sparse-metadata states (R-DD-003).
3. Pie/Funnel/Radar registered in `viz-chart`, token-themed, accessible (R-DD-004).
4. Zero behavior change to F1 widgets and F2's in-flight contract (R-DD-005).

**Non-goals:** touching F2's `reports/dashboard` DTO/service; new metrics beyond the six sections + velocity (F4); migrations/schema; `deepDive` deep-link.

> Cross-checked (KZ-016) against requirements clauses and module constraints: composition mirrors F2's **as-built** pattern (repository-level composition + service pass-through — the executing F2 put composition in the repository; F3 follows the shipped shape, not this family's earlier draft); client charts stay inside the lazy project-dashboard chunk (child-guide chart rule); labels resolved server-side (C-3).

## 2. Architecture

### 2.1 Server slice (agresso-contract module)

- `repositories/agresso-contract.repository.ts` — +`getIndicatorDetailsReport(contractId)`: composes **seven private query methods** (six sections + velocity) over `buildPrimaryContractResultsSubquery()` via `Promise.allSettled`; per-section null-on-failure + error entries (same semantics as the shipped dashboard aggregate). Section queries:
  - `capacity_sharing`: join `result_capacity_sharing` + lookups (`session_lengths`, `delivery_modalities`, `session_types`); sums over participant columns with `NULL`-excluded semantics (absent ≠ 0 — SQL `SUM` over joined rows only).
  - `innovation_dev`: join `result_innovation_dev` + `clarisa_innovation_readiness_levels` (+ type/nature/anticipated-users lookups); scalability booleans as `{true_count, answered_count}` per flag (`COUNT(col)` vs `SUM(col = TRUE)` — NULL not answered).
  - `knowledge_product`: `result_knowledge_products` (open_access / access_status / type; `publication_date` grouped by year).
  - `policy_change`: `result_policy_change` + `policy_stage`/`policy_types`; distinct institutions via `result_institutions` role 4. Funnel order: `policy_stage`'s own order column if present, else stage id — **verified at implementation and recorded** (requirements R-1).
  - `oicr`: `result_oicrs` + `maturity_levels`; `for_external_use` split.
  - `innovation_use`: three sub-queries (`result_actors` sums overall + by actor type; `result_institution_types` mix; `result_quantifications` grouped by `unit`).
  - `reporting_velocity`: `results.created_at` truncated to month, last 24 months.
  - Every section also computes `{total_results, n}` (`total_results` from the seed grouped by indicator; `n` = distinct results joined to satellite rows).
- `agresso-contract.service.ts` — pass-through.
- `agresso-contract.controller.ts` — `GET reports/indicator-details` handler, full Swagger, 400 on missing `contract-id`.
- `dto/contract-indicator-details-report.dto.ts` — NEW: per-section DTO classes (labels + counts), `SectionMeta {total_results, n}`, nullable sections, error entry type.

### 2.2 Client slice

- `shared/services/api.service.ts` — +`GET_IndicatorDetails(contractId)`.
- `shared/services/get-indicator-details.service.ts` — NEW signal service (data/loading/loadError + per-section accessors + `sectionFailed`); **no auto-load**: exposes `load(contractId)` invoked by the panel on first viewport intersection; `update()` re-fetches (retry).
- `shared/interfaces/contract-indicator-details.interface.ts` — NEW.
- `pages/.../project-detail/components/indicator-deep-dive/` — NEW component (+spec): velocity strip, tab strip (indicators with results, ordered by count — ids/labels/counts come from the already-loaded F1 indicator summaries, so tabs render before the lazy fetch), sparse notice, per-tab chart grids per the mockup; states skeleton/error/sparse/n=0. IntersectionObserver wrapped in a small overridable member so specs mock the boundary (jsdom limitation, declared).
- `shared/components/viz-chart/viz-chart.component.ts` — register `PieChart`, `FunnelChart`, `RadarChart` + their option types in the ComposeOption union. No API change.
- `project-dashboard.component.html` — mounts `<app-indicator-deep-dive>` in the F1 reserved slot (Results-by-indicator region). **Single-line mount; no other dashboard change** (minimizes the F2-collision surface).

### 2.3 Reuse

Seed subquery, `LoggerUtil`, envelope semantics, F2's as-built service/DTO patterns, F1 indicator summaries (tab metadata), `chart-tokens.util` ramps/series, existing skeleton/error idioms, mockup's card grid (maps to existing Tailwind utility patterns — no new tokens).

## 3. Data model

No data model changes (read-only joins; no OpenSearch, no migrations).

## 4. API surface

### GET /api/v1/agresso/contracts/reports/indicator-details

- **Query:** `contract-id` (required) · **Roles:** none (reports-family parity) · **Errors:** 400 missing param, 401 middleware, 500 all-sections-failed
- **Response data:** `{ capacity_sharing?, innovation_dev?, knowledge_product?, policy_change?, oicr?, innovation_use?, reporting_velocity }` — sections omitted for zero-result indicators, `null` on section failure (+ envelope `errors` entry); every section carries `{total_results, n}`
- **Swagger:** complete (`@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiQuery`)

## 5. Workflows & business rules

1. Panel renders immediately with tabs + skeleton placeholders (tab metadata from F1 summaries); fetch fires on first intersection (or keyboard focus into the region), once per contract view.
2. Server: seed → per-indicator `total_results` → sections in parallel; fulfilled → shaped payload with labels; rejected → null + error + `LoggerUtil.error`.
3. Client render per tab: `n = 0` → notice only; `0 < n < total` → charts + sparse notice; `n = total` → charts. Section `null` → error state with shared retry (never sparse/empty — same F2 rule).
4. Velocity renders above tabs; absent/failed velocity hides the strip (never blocks tabs).
5. No sockets, audit, or cron. Read-only GET.

## 6. Frontend component architecture (mockup-bound)

Per `mockup/deep-dive-panel.html`: panel card (existing card idiom) → header + source label → velocity strip (grey inset, line chart 44px) → tab strip (count chips; active = light-blue underline, F1 toggle idiom) → sparse notice (info-left-border inset) → responsive chart grid `minmax(240px,1fr)`: stat tiles + donut + bars (capacity), histogram + radar + bars (innovation dev), funnel + bars (policy), donut + year bars (KP), donut (OICR), stacked bars + unit table (innovation use). All charts via viz-chart (SVG) with tableModel; colors exclusively `--ac-viz-*` ramps/series; `md:` collapses the grid to one column. Tab strip keyboard-navigable (role=tablist, arrow keys per PrimeNG/manual pattern), WCAG AA (C-4).

## 7. Integration impact / 8. Security / 9. Observability

None new / reports-family parity (JWT or machine token; no roles) / `LoggerUtil.error` per failed section; description marks partial results.

## 10. Testing strategy

- **Server:** repository specs asserting **generated SQL + params** per section (KZ-001) with fixtures for multi-row satellites, absent rows, NULL booleans (radar denominators), month bucketing; controller/service specs; supertest e2e: section presence rules (zero-result indicator omitted), partial failure, 400/401. **Dev ground-truth check** (requirements defect table): endpoint numbers vs hand-run SQL for ≥2 sections on A511, recorded in `execution.md`.
- **Client:** service spec (URL, envelope, sectionFailed); component specs (KZ-015 transitions): no fetch before intersection → one after; skeleton→charts; skeleton→section-null→error+retry; sparse and n=0 tabs; tab order = bar order; viz options fed with **live nested fixtures** (KZ-001).
- **tokens:** `npm run tokens:validate` after registering the three chart types.
- **HITL close (KZ-014):** light+dark screenshots of every new chart form; lazy fetch verified in the network panel **with the panel below the fold**; F1 drills unaffected.

## 11. Rollout

Ships with the dev-branch pipeline after F2's client tasks land (family sequencing); additive endpoint — rollback = revert commit. No flags, no migrations.

## 12. Design decisions log

| # | Date | Decision | Rationale |
|---|---|---|---|
| D-F3-1 | 2026-08-23 | Mirror F2's **as-built** composition (repository-level aggregate + service pass-through) | One composition idiom per module beats this family's earlier draft preference; the Implementer copies a shipped, reviewed pattern |
| D-F3-2 | 2026-08-23 | Tabs render from F1's already-loaded indicator summaries; only chart data is lazy | The panel is visible and navigable at first paint (no layout jump — content space reserved), while the expensive aggregate waits for intersection (NFR-DD-001) |
| D-F3-3 | 2026-08-23 | Scalability radar uses `{true_count, answered_count}` per flag; NULL = unanswered | Encoding "absent ≠ false" in the payload makes the R-DD-004 BUT-clause structurally unbreakable by the client |
| D-F3-4 | 2026-08-23 | Velocity lives in this endpoint, not F2's DTO (closes OQ-1) | F2 is in execution — extending its contract mid-flight buys a cross-session conflict for zero user value; the deep-dive is where the chart renders anyway |
| D-F3-5 | 2026-08-23 | IntersectionObserver behind an overridable component member | jsdom cannot exercise real intersection (declared gap); the boundary mock keeps KZ-015 transition tests honest while HITL owns real laziness |
| D-F3-6 | 2026-08-23 | Quantifications render as a table, not a chart | Units are heterogeneous (hectares, people, USD…) — one axis would be a lie; `dataviz` form-follows-data |
| D-F3-7 | 2026-08-23 | Sections omitted (not null) for zero-result indicators; null reserved for failures | Absence-of-indicator vs failure vs sparse are three distinct states the UI must distinguish (R-DD-003) |

### Reversion challenges (Step 2.3)

None triggered — F3 is purely additive (no delivered behavior removed, disabled, or inverted). Recorded per protocol.

## 13. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 10 |
| LOC (net, both tiers) | ~1,500–1,900 |
| Review rounds | 2 |

Full depth confirmed against the finished design. `/akili-execute` trips to the user when actuals exceed these.

## 14. Open questions

None open (OQ-1/2/3 closed at Phase 1; R-1 policy-stage ordering resolves at implementation with a recorded answer).

## 15. References

Requirements `./requirements.md` · Mockup `./mockup/deep-dive-panel.html` · Satellite-table map: family analysis artifact §6 + server entities · F2 as-built spec (sibling folder) · Kaizen applied: KZ-001, KZ-014, KZ-015, KZ-016, KZ-017, K-016, K-018, K-012 · `dataviz`/`ui-ux-pro-max` form rules (D-F3-6, chart-per-question mapping).
