# Proposal — Bilateral Registry Analytics (per-type breakdowns + mapping intelligence)

## 1. Document Control

| Field | Value |
| --- | --- |
| Type | **Change** |
| Slug | `bilateral-registry-analytics` — derived from free-text argument (competitor-inspired registry views + *"la información puede cambiar por tipo de resultado"*) |
| Spec Path | `changes/bilateral-registry-analytics` |
| Approval Mode | gated |
| Author / Date | j.cadavid@cgiar.org · 2026-08-22 |
| Status | Draft — **proposal only; specify intentionally held** (see Dependencies) |
| Depends on | `changes/dashboard-advanced-analytics` (done — SP graph, tokens, wrapper) · **PRMS hook contract expected 2026-08-25** (project memory: PRMS Sync family on hold until it lands) · a **data-quality measurement** of `quantitative_contribution` completeness (the D-DA-6 precondition) |
| Parallel-safe | no (same dashboard surface as other dashboard specs) |

## 2. Intent

Bring the project dashboard to parity with — and beyond — the reference the team keeps being shown (the Synapsis *progress tracker* by José Berenguer, which reads the same PRMS mapping database our bilateral data comes from): per-project **program-mapping intelligence** (allocation %, agreement status, ToC links) and **per-result-type breakdowns** that respect how metadata varies by indicator type.

## 3. Problem / Current Behavior

- The competitor's registry detail (user screenshots, 2026-08-22) shows per-project: program mappings with **allocation %** and **agreement status** (Agreed/Locked, center-agreed/program-agreed), **ToC links counts** (AoW/Output/Outcome), **parsed countries with %**, funder, and a narrative summary. STAR's dashboard shows none of the mapping-negotiation dimension, although the underlying data families exist locally (`bilateral_project_mapping`, `result_pool_funding_toc_alignment`, the SP catalog with `allocation` via `deriveScienceProgramMetaByCode`).
- The dashboard's analytics treat all results as homogeneous; in reality **metadata varies by indicator type** (capacity-sharing carries trainees/session data, policy change carries stages, innovation carries readiness, KP carries publication metadata) — none of that type-specific richness surfaces per project.
- The ToC contribution-vs-target rollup was **explicitly deferred** (D-DA-6) pending a data-quality measurement — this spec is its designated home.

## 4. Proposed Outcome (candidate widgets — refined at specify)

1. **Mapping status card**: this contract's bilateral mapping (source, confidence, agreement posture) + per-SP allocation % — the "am I mapped, agreed, and at what share?" answer the competitor gives.
2. **ToC contribution rollup** (the deferred stretch): per SP, results by role + `quantitative_contribution` vs frozen targets — gated on the data-quality measurement coming back usable.
3. **Per-indicator-type panels**: type-aware breakdowns (e.g., capacity-sharing trainee totals, KP publication counts) rendered only for types present on the contract.
4. Geography with % shares (parsed-countries style) — builds on the geo aggregate.

## 5. Scope boundaries / Non-Goals

Read-only consumption of local tables + existing integrations; **no** portfolio-wide registry (the coverage-report and the Synapsis tool own that); no mapping-negotiation *workflow* (viewing, not negotiating); no new taxonomies (C-3).

## 6. Approach sketch (options at specify)

A: mapping card only (smallest) · B: mapping card + per-type panels (recommended shape today) · C: B + ToC rollup (if the quality measurement passes). RICE-order the widgets at specify with real data volumes.

## 7. Risks, Dependencies, Open Questions

| Item | Note |
|---|---|
| **HOLD until 2026-08-25** | The PRMS hook contract may reshape how mapping/ToC data syncs; specifying against today's shape risks immediate drift. Local read-models are *probably* unaffected — verify when the contract lands |
| Data quality gate | `quantitative_contribution` completeness on legacy rows unmeasured — measure BEFORE promising the rollup (D-DA-6's condition, unchanged) |
| Per-type metadata reach | TIP/PRMS-imported results lack STAR metadata richness (the caveat banner's own warning) — per-type panels must declare source coverage, never fabricate |
| K-016 | Any config/TTL-cached inputs (5-min caches on ToC/PRMS reads) must be named in verification steps |

## 8. Success Criteria (headline)

A Center Admin sees, per bilateral contract: mapping + agreement posture + allocations; type-aware result richness; (if quality passes) contribution vs targets — all sourced, never fabricated, AA-accessible, theme-correct.

## 9. Next Step

```text
(hold) → after 2026-08-25 PRMS contract + data-quality measurement:
/akili-specify changes/bilateral-registry-analytics
```

---

## 10. Visual Reference — Synapsis **Analytics** surface (user screenshots, 2026-08-22, session A511-follow-up)

> Second batch of competitor evidence, distinct from §3's registry-detail screenshots: this is Synapsis's **portfolio-wide Analytics page** ("CGIAR W3 & Bilateral Projects Registry — 1,388 working projects"). The user's framing: *"todo es interactivo, a este es el nivel que nos enfrentamos"*. Captured here so the held specify inherits it; screenshots live in the session record, patterns transcribed below.

### Pattern inventory (what makes the reference work — steal the structure, not the pixels)

| # | Pattern | Evidence in the screenshots | Our analogue / gap |
|---|---|---|---|
| VR-1 | **Progressive disclosure at scale**: card gallery ("EXPLORE MORE — TAP A CARD TO EXPAND") with mini-thumbnail, one-line description, count chips (`197 linked HLOs`, `14 centers`), Expand/Collapse per card. Heavy views never render until asked | Analytics landing page | Our dashboard renders all cards eagerly (stagger only). Gap: expand/collapse orchestration; `viz-chart` is ready for it |
| VR-2 | **"How to read" microcopy** on every non-obvious encoding (*outline size = hierarchy level; inner disc = share of linked $ among siblings*) | Radial hierarchy header; Budget-by-HLO header | We have chart titles + sr-only tables; no in-situ encoding legend prose. Cheap, high value |
| VR-3 | **Data honesty as first-class UI**: `DB export 18 Aug 11:31 UTC` badge, "Data as of 19 Aug 2026 — point-in-time snapshot — status changes continuously", a dedicated **Reconciliation & coverage** card (mapped-$ identity: total = linked + unlinked), footnotes explaining full-value double-counting ("columns can sum to more than the portfolio total — see the reconciliation strip") | Header + first gallery card + chart footnote | Kin of our caveat banner (D-PD-8) and KZ-014/K-014 culture. A per-widget provenance/reconciliation treatment is a candidate requirement for this spec's widgets ("sourced, never fabricated" §8 made visible) |
| VR-4 | **Chart vocabulary on one restrained palette**: dual-axis combo (stacked bars + total-$ line + project-count line) with **minimap + horizontal scroll ("Scrollable — nothing truncated")**, Lorenz concentration curve, Pareto overlay, Sankey (programs→centers), AoW treemap, radar center-profiles, radial hierarchy; rich tooltips with per-center value tables | Budget-by-HLO card; More views grid | All expressible with `viz-chart` — Sankey/treemap/radar/heatmap/sunburst are echarts modules registered at the same single `use([...])` site (pattern established by `changes/leaflet-geo-map` D-GEO-1). "Nothing truncated" as an explicit promise is K-014 turned into product copy |
| VR-5 | **Persistent global filter bar** (Center / Program / Funding / Agreement status / More filters) + "Showing 1,388 of 1,388" always visible | Every capture | Per-contract dashboard has no cross-widget filter plane. Portfolio-scope only — see the boundary question below |
| VR-6 | **Project Explorer**: quick search, 44 configurable columns, `Export Excel (1388)` with live count | Explorer capture | `results-center-table` + existing Excel export are the seeds |
| VR-7 | **Geographic footprint** card: countries shaded by projects or budget, impl ⇄ benefit toggle | More views grid | `changes/leaflet-geo-map` (specified 2026-08-22) delivers exactly this shape per contract; the impl⇄benefit toggle is a portfolio-data concept we lack |
| VR-8 | Reference's own flaws — radial-hierarchy label collisions ("Digital Transform…" overlapped), giant sparse rows in the Explorer | Radial + Explorer captures | Steal the level, not the defects: label-collision handling and row-density are explicit quality bars for us |

### Scope-boundary question raised by this batch (decide at specify, product call)

§5 declares the portfolio-wide registry a **non-goal** ("coverage-report and the Synapsis tool own that"). This batch is precisely that portfolio surface. Options the specify must put to the user before writing requirements:

- **(a) Hold the boundary** — per-contract parity only (§4 widgets), importing VR-2/VR-3/VR-4 treatments into the contract dashboard; or
- **(b) Move the boundary** — a portfolio-level analytics surface inside STAR (new top-level spec, likely Full depth, new route + aggregate endpoints; NOT this spec grown silently — the §4 widget set and this surface are different products).

Until decided, this proposal's scope stays (a); the inventory above still applies to (a)'s widgets (VR-2, VR-3, VR-4 treatments; VR-1 if the dashboard gains more cards).
