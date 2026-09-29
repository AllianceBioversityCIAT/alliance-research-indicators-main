# Archive Summary — PI Delegates

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/changes/my-pi-delegates` |
| Archive date | 2026-09-11 |
| Final status | ✅ Complete — validation PASS, archive-ready |
| Branch | `AC-1733-pi-delegates` (not merged; push/PR + Dev/Prod migration are the user's manual steps) |

## 2. Final Status

Delivered across 5 iterations: v2 single-item → v3 bulk (many×many) → v4 per-project assignments + history → v5 (`pi_user_id` removed) → v6 (`active_delegate_key` removed + by-delegate endpoint) + GET response enrichment. 21 tasks + refactors, **each Reviewer-PASS**. Full unit suite **2739/2739**, build + lint clean, `client/` untouched. Behaviorally verified against the real local DB (core 12/12, history 10/10, enriched shapes PASS — all with cleanup).

## 3. Requirements Delivered

| Req | Delivered |
| --- | --- |
| R-PID-001/002/003 | `pi_delegates` table; `isPi()` + `queryPrincipalInvestigator()` gain a delegate fallback (existing PI paths byte-for-byte; existing specs green) |
| R-PID-004 | CRUD → superseded by bulk: `POST` (per-project sync), `DELETE` (bulk revoke, 2 shapes), `GET ?projectId`, `GET /verify`, `GET /by-delegate` — all Swagger-documented |
| R-PID-005/NFR-003 | transactional find-or-create sec_user (genuine atomicity) |
| R-PID-006/001 AC.3 | one-active-per-pair — **now app-enforced** (v6 removed the DB unique-active key; documented) |
| R-PID-007/008 | auth (PI/delegate/SYSTEM_ADMIN of project; own-or-admin for by-delegate); PI-exclusion (a PI can't be their own delegate) |
| R-PID-009–013 (v3/v4) | bulk sync, per-project assignments (empty=revoke-all), append-only history per movement |
| NFR-001/002 | no role/frontend change; PI behavior preserved |

## 4. Files Changed (from execution.md)

- **New:** migrations `1787600000000-createPiDelegates` + `1787601000000-createPiDelegateHistory`; module `entities/pi-delegates/` (controller, service, module, repository, 2 entities, enum, 7 DTOs, spec); e2e `test/pi-delegates.e2e-spec.ts`.
- **Edited:** `result-status-workflow.repository.ts` (isPi fallback), `gloabl-queries.const.ts` (metadata fallback, +3 callers), `main.routes.ts` + `entities.module.ts` (route + app-graph wiring — the P0 fix).

## 5. Test Evidence

Unit 2739/2739 (346 suites). e2e: routes mounted + DTO validation; DB-behavioral deferred to migration apply (proven instead by real-DB smokes). Real-DB behavioral: core 12/12, history 10/10, enriched shapes PASS.

## 6. Validation Summary

`validation-report.md`: PASS, 0 FAIL, 3 WARN (all accepted). Archive-ready.

## 7. Accepted Warnings / Follow-ups

| # | Item | Disposition |
| --- | --- | --- |
| WARN-1 | one-active-per-pair now app-enforced (not DB) | Accepted (Product) |
| WARN-2 | migration applied local-only; Dev/Prod = human step (K-015) | User's manual step; reconfirm utf8mb3 |
| WARN-3 | untracked test-DB scaffolding (`docker-compose.test.yml`, `scripts/`, `package.json`) | User decision (keep/commit/revert) |
| — | push / PR | User's manual step |

## 8. Historical Notes

- **P0 caught by process:** `/api/pi-delegates` 404'd in production because the module was in `main.routes.ts` but not the app graph (`entities.module.ts`). Invisible to build/unit/lint; the e2e boot (T-09) surfaced it; the worker misdiagnosed it as a harness issue and the Leader rejected that. → **KZ-017 recurrence** (a check narrower than its claim: "module registered" ≠ "route reachable").
- **Charset/FK (errno 3780):** the migration passed all static gates but the FK would fail on the real apply (`agresso_contracts.agreement_id` is utf8mb3); caught only during the local apply and fixed (pin `utf8mb3`). → **K-006 recurrence** (a migration is verified only by running it).
- The spec deliberately grew via 4 Product-confirmed amendments after v2 shipped; all recorded in `requirements.md §11–12`, `design.md §10–13`, `execution.md`.
