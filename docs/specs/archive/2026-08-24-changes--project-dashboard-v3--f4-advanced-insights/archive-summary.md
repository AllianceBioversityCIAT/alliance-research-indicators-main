# Archive Summary — Project Dashboard v3 · F4 Advanced Cross-Cutting Insights

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/project-dashboard-v3/f4-advanced-insights/` |
| Archive date | 2026-08-24 |
| Final status | **Complete — 9/9 tasks PASS, owner HITL approved** |
| Branch | `bilateral-visual-improvements` (spec branch; shared-doc syncs recorded as kaizen pending items) |
| Parent family | `changes/project-dashboard-v3` — this closes child 4 of 4 |

## 2. Outcome

`GET /api/v1/agresso/contracts/reports/insights` (six always-present nullable sections — reach, sdg_coverage, evidence, review_flow, contributing_levers, keywords — labels server-side, `{total_results, n}` meta, `Promise.allSettled` partial-failure semantics) + lazy **Insights** section in client project-detail (six tri-state cards, SDG declared-vs-reported chips from F1 hero data with zero extra requests, five viz-chart forms incl. the newly registered Treemap).

## 3. Requirements delivered

R-IN-001 (endpoint + envelope + 400 + Swagger) · R-IN-002 (six aggregate rows incl. keyword normalization + cycle-time messy-history semantics) · R-IN-003 (lazy incl. keyboard path, tri-state, SDG scenario, reach BUT-clause, chart forms + tableModel) · R-IN-004 (siblings untouched — automated + HITL) · NFR-IN-001…004 (first-paint untouched; latency proxy max 179.4 ms ≤ 800; bundle Initial 1.12 MB = F3 baseline; coverage floors green both tiers).

## 4. Pivot record (the decision trail asset)

A-1 falsified at T-03: no live submission/approval vocabulary exists (`decision` never written; `reviewDecision` a stub). Owner-approved **D-F4-7** (canonical forward-looking vocabulary constant in `result-review-history` — the future `reviewDecision` MUST import it) + addendum **D-F4-8** (`RESULT_SUBMITTED` submission anchor; audit-edit proxies rejected). `sample_size = 0` on current data is the honest, ground-truthed output.

## 5. Files changed (13 commits `05e3d9e6` … `1430cc13`)

Server: `agresso-contract` DTOs/repository/service/controller (+specs), `result-review-history/constants/review-event-vocabulary.constants.ts` (NEW), `agresso-contract/utils/review-cycle-time.util.ts` (NEW), `test/agresso-contract-insights.integration-spec.ts` (NEW). Client: `viz-chart` (Treemap), `contract-insights.interface.ts`, `api.service.ts`, `get-contract-insights.service.ts` (NEW), `components/insights-section/` (NEW), `project-dashboard.component.*` (mount + declaredSdgs), `setup-jest.ts` (measureText stub).

## 6. Test evidence (embedded — no separate test-report.md, accepted)

Server 340 suites / 2530 tests cov exit 0 · client 318 suites / 6767 tests, coverage 97.95/92.46/97.38/98.32 · HTTP-path integration 5/5 in 7.8 s (K-021 in-process) · dev ground-truth A511+A1048 (SQL vs independent JS identical) · tsc-spec 937 = baseline · K-004 reds observed for every named failing input · `tokens:validate` PASS.

## 7. Validation

No separate validation-report.md (accepted): owner HITL performed in-session 2026-08-24 — light screenshot reviewed, dark/laziness/F1-F3/swagger confirmed. Rework: 3 single-round Reviewer FAILs (T-03 semantics→owner, T-04 service spec, T-08 focus-reachability + SDG string parse), all closed attempt 2.

## 8. Accepted follow-ups (recorded in execution.md advisories + kaizen pending items)

`data-slot="chart-placeholder"` rename · levers full_name tooltip · "Top 30" caption when fewer · reach tooltip actor-group framing polish · `getInsightsTotalResults` logging parity (family-level with F2/F3) · bilateral.service.ts vocabulary-constant import swap · dark-mode chip-contrast token pair (F1-idiom-wide, flagged at HITL as acceptable-for-now).

## 9. Historical notes

Executed in one Leader session with triad delegation (author ≠ auditor held; wrappers sonnet/opus). One runtime interruption (account session limit) parked and resumed with zero attempt loss. LOC ≈ +4,100 vs estimate 1,300–1,700 — overrun is ~60% test code (kaizen lesson recorded). Budget: 9/9 tasks, 3 review rounds vs 2 estimated.
