# Design — agresso / Project Dashboard v3 · F4 Advanced Cross-Cutting Insights

- **Module:** agresso (server) + client / project-detail (STAR)
- **Spec id:** 2026-08-project-dashboard-v3-f4
- **Status:** draft
- **Owner:** JuanCode
- **Linked requirements:** ./requirements.md
- **Visual reference:** none new — the six cards reuse the card/tile/notice idioms approved in F1 and F3 (`docs/specs/archive/2026-08-24-changes--project-dashboard-v3--f3-indicator-deep-dive/mockup/deep-dive-panel.html`); only the treemap is a new form, token-themed via `--ac-viz-*`
- **Last updated:** 2026-08-23

---

## 1. Goals & non-goals

**Goals**
1. One lazy `reports/insights` endpoint with six nullable, `n`-carrying sections (R-IN-001/002).
2. An Insights section with tri-state cards, SDG declared-vs-reported comparison, and a keywords treemap (R-IN-003).
3. Zero change to F1/F2/F3 surfaces (R-IN-004).

**Non-goals:** the four backlog metrics (ToC bullet, platform origin, AI/PRMS KPIs, Sankey); keyword stemming/NLP; any migration; changes to sibling DTOs.

> Cross-checked (KZ-016) against requirements clauses and module constraints: mirrors F3's as-built lazy-section pattern (repository composition + service pass-through + nullable sections) so the agresso module keeps **one** aggregate idiom; SDG comparison is client-side over data already present (F1 hero) — no new request (R-IN-003 BUT-clause); labels resolved server-side (C-3); HTTP-path tests in-process per K-021.

## 2. Architecture

### 2.1 Server slice (agresso-contract module)

- `repositories/agresso-contract.repository.ts` — +`getInsightsReport(contractId)`: composes **six private section queries** over `buildPrimaryContractResultsSubquery()` via `Promise.allSettled`; fulfilled → shaped section with `{total_results, n}`; rejected → `null` + error entry + `LoggerUtil.error`; all-rejected → throw.
  - `reach`: `result_actors` joined to actor-type lookup; `SUM` over the four disaggregation columns with NULLs excluded; group overall + by `actor_type_id` (custom name when the type is "other"); `not_disaggregated_rows` = `COUNT` where `sex_age_disaggregation_not_apply = TRUE`.
  - `sdg_coverage`: `result_sdgs` ⨝ `clarisa_sdgs` → `{sdg_id, short_name, full_name, count}` (distinct results).
  - `evidence`: `result_evidences` → results with ≥1 evidence, total evidences, `is_private` split, per `evidence_role_id` counts (label).
  - `review_flow`: `result_review_history` → counts per `event_type`/`decision`; cycle time computed **in TS** over the per-result event list ordered by `created_at` (D-F4-2): first submission-type event → first approval-type decision; median/p90 over contributing results; exclusions counted. Vocabulary mapping (which `event_type`/`decision` values are "submission"/"approval") declared in one **canonical constant in the `result-review-history` module** (D-F4-7 — no live enum exists; the constant is the forward-looking source of truth the future `reviewDecision` writer must import); the calculator's spec asserts its values against that canonical constant.
  - `contributing_levers`: `result_levers` where `is_primary = FALSE` ⨝ levers lookup → `{lever_id, short_name, full_name, count}` (distinct results).
  - `keywords`: `result_keywords` → normalized in SQL (`LOWER(TRIM(...))` + inner-whitespace collapse via `REGEXP_REPLACE` on MySQL 8; fallback: normalize in TS if the dev MySQL version lacks it — decided and recorded at T-02), `COUNT(DISTINCT result_id)`, top 30, order count desc / keyword asc.
- `agresso-contract.service.ts` — pass-through. `agresso-contract.controller.ts` — `GET reports/insights` handler, full Swagger, 400 validation.
- `dto/contract-insights-report.dto.ts` — NEW per-section DTOs + `SectionMeta` reuse (import from F3's DTO file, no duplication).

### 2.2 Client slice

- `api.service.ts` — +`GET_ContractInsights(contractId)`.
- `get-contract-insights.service.ts` — NEW signal service, **no auto-load**, `load()`/`update()`, per-section accessors + `sectionFailed` (F3 idiom).
- `contract-insights.interface.ts` — NEW.
- `components/insights-section/` — NEW component (+spec): IntersectionObserver behind an overridable member (F3 D-F3-5); six cards; tri-state per card; receives the contract-declared SDG list as an **input** from the dashboard (already available from the F1 hero source) to compute the three chip groups; treemap/stacked-bar/funnel option builders with `tableModel`.
- `viz-chart` — register `TreemapChart` (+ option type). Funnel/Pie already registered by F3.
- `project-dashboard.component.html` — one mount line after the F3 panel, before the pending table.

### 2.3 Reuse

Seed subquery, `LoggerUtil`, envelope semantics, F3 DTO meta + service/component idioms, F1 hero SDG data, chart tokens, skeleton/error/notice markup from F3.

## 3. Data model

No data model changes.

## 4. API surface

### GET /api/v1/agresso/contracts/reports/insights
- **Query:** `contract-id` (required) · **Roles:** none (parity) · **Errors:** 400 / 401 (middleware) / 500 all-sections-failed
- **Response data:** `{ reach, sdg_coverage, evidence, review_flow, contributing_levers, keywords }` — all keys always present; `null` on section failure; each with `{total_results, n}`
- **Swagger:** complete

## 5. Workflows & business rules

1. Section mounts with skeletons; fetch on first intersection; one fetch per contract view; retry re-fetches.
2. Server composes six sections; TS post-processing only for cycle time and (if needed) keyword normalization fallback.
3. Client per card: `null` → error + shared retry; `n = 0` → empty notice, no chart; `0 < n < total` → chart + sparse notice; `n = total` → chart.
4. SDG chips derived client-side: `declared ∩ reported`, `declared − reported`, `reported − declared` from (hero SDGs, `sdg_coverage`).
5. Read-only GET; no audit/sockets/cron.

## 6. Frontend component architecture

Section card (F1 card idiom) → header "Insights" + subtitle → responsive grid `minmax(300px,1fr)`: Reach (stacked bars + not-disaggregated count), SDG coverage (three chip groups, F1 hero chip styling), Evidence (KPI tiles + role bars), Review flow (funnel + tiles median/p90/sample/excluded), Contributing levers (bars — same builder family as F1 rankings), Keywords (treemap, top 30, tooltip count). Sparse/empty notices per card (F3 markup). `md:` → one column. All charts `viz-chart` + `tableModel`; colors `--ac-viz-*` only; treemap uses the sequential ramp with WCAG-checked label contrast (`tokens:validate`).

## 7. Integration / 8. Security / 9. Observability

None new / reports-family parity / `LoggerUtil.error` per failed section + partial description.

## 10. Testing strategy

- **Server:** repository specs on generated SQL + params (KZ-001) with fixtures: NULL disaggregation, repeated keyword per result, mixed-case/whitespace keywords, out-of-order and anchor-less histories; cycle-time TS specs (median/p90/exclusions — **failing input:** insertion-order fixture changes the median); controller/service specs; **HTTP-path integration spec** under `npm run test:integration` (in-process `TestingModule`, repository `overrideProvider`-mocked, never `AppModule`/`DataSource` — K-021): all-present, one-null, all-fail 500, 400. **Dev ground-truth:** `reach` sums + `keywords` top-3 on A511 vs hand-run SQL, back-to-back, recorded.
- **Client:** service spec (URL, envelope, dedupe); component specs (KZ-015): zero fetch before intersection → one after; per-card tri-state; SDG chip derivation from fixture inputs (declared vs reported sets); no extra SDG request; treemap/stacked/funnel builders fed **live-shaped fixtures**.
- **tokens:** `npm run tokens:validate` after Treemap registration.
- **HITL (KZ-014):** light+dark screenshots of all six cards; laziness with the section below the fold; F1/F3 behavior + request counts unchanged.

## 11. Rollout

Ships after F3's client tasks land (family sequencing); additive endpoint; rollback = revert. No flags, no migrations.

## 12. Design decisions log

| # | Date | Decision | Rationale |
|---|---|---|---|
| D-F4-1 | 2026-08-23 | Own lazy endpoint `reports/insights` mirroring F3 (not F2's eager DTO) | Six new queries would add first-paint cost to every dashboard view; the family already has one lazy idiom — reuse it |
| D-F4-2 | 2026-08-23 | Cycle time computed in TS over timestamp-ordered per-result events; SQL only fetches the events | Window/percentile SQL over messy histories is where operator-precedence and ordering bugs hide (KZ-001 recurrence 15); TS is unit-testable with the messy fixtures the requirement names |
| D-F4-3 | 2026-08-23 | Sections always present; `n = 0` is the empty signal (differs from F3's omission) | Every contract has all six concepts; omission would force the client to distinguish "concept absent" from "no data" for no reason |
| D-F4-4 | 2026-08-23 | SDG comparison client-side from the F1 hero's declared SDGs | Avoids a second contract fetch and keeps one source of truth for "declared" (R-IN-003 BUT-clause) |
| D-F4-5 | 2026-08-23 | Keyword normalization = case + whitespace only, in SQL where supported | Bounded, explainable; stemming would invent groupings the PI cannot audit |
| D-F4-6 | 2026-08-23 | Submission/approval vocabularies live in one server constant, verified at T-03 | The enum is the truth (KZ-012-style assumption trap avoided): a wrong mapping shows as a wrong `sample_size`, so the constant is asserted against the enum in a spec |
| D-F4-7 | 2026-08-24 | **Supersedes D-F4-6's "verified against the live enum" (Pivot T-03, owner-approved):** no live enum exists (`decision` never written; `reviewDecision` is a stub). The vocabulary lives as a canonical exported constant in the `result-review-history` module — the forward-looking source of truth the future `reviewDecision` implementation MUST import; the cycle-time calculator asserts its submission/approval values ⊆ that constant. `sample_size = 0` on current data is correct output | A doc-comment vocabulary cannot gate a spec; making the constant canonical inverts the dependency so implementation and analytics can never drift apart |

### Reversion challenges (Step 2.3)

None triggered — F4 is purely additive. Recorded per protocol.

## 13. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 9 |
| LOC (net, both tiers) | ~1,300–1,700 |
| Review rounds | 2 |

Full depth confirmed against the finished design. Tripwire for `/akili-execute`.

## 14. Open questions

None open.

## 15. References

`./requirements.md` · F3 spec (pattern source) · F2 as-built · entity files under `server/.../domain/entities/{result-actors,result-sdgs,result-evidences,result-review-history,result-levers,result-keywords}` · Kaizen applied: KZ-001, KZ-012 (exclusion), KZ-014, KZ-015, KZ-016, KZ-017, K-018, K-021, KZ-pd-v3-f3-1.
