# Kaizen Entry — changes/project-dashboard-v3/f3-indicator-deep-dive

> **Pre-archive entry (opened mid-execution, 2026-08-23).** `/akili-archive` updates this file in place (exact-name re-run detection); it does not create a second one.

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-dashboard-v3/f3-indicator-deep-dive` |
| Date | 2026-08-23 |
| Branch | bilateral-visual-improvements |
| Archive Run | 0 (in execution) |
| Approval Mode | gated |
| Branch Context | **spec branch** — one standardization applied early by explicit owner mandate (see P1); digest untouched |

## Metrics

| Signal | Value | Source |
|---|---|---|
| In-flight spec corrections | **1** — T-05 bootstrap scope (supertest e2e → in-process HTTP-path integration spec) | tasks.md T-05 amendment; design §10 |
| Observed cost of the defect | 26 min hang on `npm run test:e2e` (full `AppModule` vs remote dev infra); shared dev DB touched by a test | owner report 2026-08-23 |
| (other signals) | filled at archive | — |

## Lessons

- **KZ-pd-v3-f3-1 — A spec that asks for an "e2e"/"integration" test must name the bootstrap scope.** (Product + Methodology, High)
  - Root cause: T-05 said "supertest e2e" and nothing about what to mount. The repo's only `*.e2e-spec.ts` imports `AppModule` (TypeORM → shared dev MySQL, RabbitMQ, OpenSearch), so the Implementer copied it; the run hung in connection retries for 26 minutes and a test touched a non-disposable database. The defect class the task owned (envelope/interceptor composition — KZ-017) needs the HTTP layer, not the infrastructure: an in-process `TestingModule` with `overrideProvider`-mocked repositories covers it in seconds (`npm run test:integration`).
  - Evidence: tasks.md T-05 "Amended 2026-08-23" block; design.md §10; `server/researchindicators/test/app.e2e-spec.ts` L4-11 (`AppModule` import).
  - Standardization: → P1 (applied), P2 (methodology upstream)

## Noted, not a lesson

- The correction was applied while another session executed the spec (owner-coordinated); the Correction Closure sweep covered requirements/design/tasks/graph in the same commit set (`98df5e96`, `d66a6233`).

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
