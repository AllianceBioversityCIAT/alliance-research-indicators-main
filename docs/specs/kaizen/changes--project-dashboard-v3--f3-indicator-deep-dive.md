# Kaizen Entry — changes/project-dashboard-v3/f3-indicator-deep-dive

> Updated in place at archive (2026-08-24); originally opened mid-execution 2026-08-23.

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-dashboard-v3/f3-indicator-deep-dive` |
| Date | 2026-08-23 |
| Branch | bilateral-visual-improvements |
| Archive Run | 1 |
| Approval Mode | gated |
| Branch Context | **spec branch** — one standardization applied early by explicit owner mandate (see P1); digest untouched |

## Metrics

| Signal | Value | Source |
|---|---|---|
| In-flight spec corrections | **1** — T-05 bootstrap scope (supertest e2e → in-process HTTP-path integration spec) | tasks.md T-05 amendment; design §10 |
| Observed cost of the defect | 26 min hang on `npm run test:e2e` (full `AppModule` vs remote dev infra); shared dev DB touched by a test | owner report 2026-08-23 |
| Reviewer FAIL rework attempts | 1 loop (T-08: 2 attempts — inert retry + empty-during-load, both real) | execution.md T-08 |
| HALTs / FATAL_FAILs / Pivots | 0 | execution.md |
| Runtime incidents | 3 quota exhaustions across 2 Leaders + 2 Implementer spawns; zero lost work (audit-trail handoff) | execution.md |
| Validation | owner HITL light-mode approved; latency inconclusive/pending; dark-mode not evidenced (carried) | archive-summary §8/§9 |
| Budget | 10/10 tasks · rounds within (1 loop + 1 addendum) | design §13 vs execution.md |

## Lessons

- **KZ-pd-v3-f3-1 — A spec that asks for an "e2e"/"integration" test must name the bootstrap scope.** (Product + Methodology, High)
  - Root cause: T-05 said "supertest e2e" and nothing about what to mount. The repo's only `*.e2e-spec.ts` imports `AppModule` (TypeORM → shared dev MySQL, RabbitMQ, OpenSearch), so the Implementer copied it; the run hung in connection retries for 26 minutes and a test touched a non-disposable database. The defect class the task owned (envelope/interceptor composition — KZ-017) needs the HTTP layer, not the infrastructure: an in-process `TestingModule` with `overrideProvider`-mocked repositories covers it in seconds (`npm run test:integration`).
  - Evidence: tasks.md T-05 "Amended 2026-08-23" block; design.md §10; `server/researchindicators/test/app.e2e-spec.ts` L4-11 (`AppModule` import).
  - Standardization: → P1 (applied), P2 (methodology upstream)

## Noted, not a lesson

- The correction was applied while another session executed the spec (owner-coordinated); the Correction Closure sweep covered requirements/design/tasks/graph in the same commit set (`98df5e96`, `d66a6233`).

## Noted, not a lesson (archive additions)

- T-08's attempt-1 retry spec asserted the call, not the fetch — the Reviewer's presence≠behavior contract caught it in-loop (the system working; KZ-001's rule, no new ID).
- The cross-host Leader handoff succeeded because execution.md carried complete state — evidence-before-checkbox paying out; no rule change needed.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | root `CLAUDE.md` §4.3 (new K-021 bullet) + `server/researchindicators/src/CLAUDE.md` §9 tests + commands table |
| Edit | `npm run test:e2e` declared an infrastructure smoke test, never a code gate; HTTP-path coverage via `npm run test:integration` with a `TestingModule` (controller+service only, repositories `overrideProvider`-mocked, no `AppModule`/`DataSource`); specs must name the bootstrap scope of any e2e/integration test. |
| Severity | High |
| Status | **applied 2026-08-23 on the spec branch by explicit owner mandate** — default-branch apply only confirms/renumbers the K-021 ID; do not re-apply |

### P2

| Field | Value |
|---|---|
| Kind | standardization (Methodology — upstream to AKILI) |
| Target | `docs/specs/general-setup/task.md` §5 Testing expectations (and AKILI upstream template) |
| Edit | Add: *A task that mandates an e2e/integration test MUST state its bootstrap scope — modules mounted, providers overridden, resources it may not touch (DB, network). "e2e" without scope is read as the repo's nearest example, whatever that boots.* |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §8.1 (component inventory) + §12.2 (decision record) + `docs/trd/trd.md` (API contracts) |
| Edit | Register `app-indicator-deep-dive` (lazy tabbed panel, tri-state, IntersectionObserver-gated fetch) and the viz-chart Pie/Funnel/Radar registrations in §8.1; §12.2 entry for the F3 ship (archive path `docs/specs/archive/2026-08-24-changes--project-dashboard-v3--f3-indicator-deep-dive`); TRD API delta: `GET /api/v1/agresso/contracts/reports/indicator-details` (nullable sections, `{total_results, n}`, partial-failure envelope). |
| Severity | Medium |
| Status | pending |
