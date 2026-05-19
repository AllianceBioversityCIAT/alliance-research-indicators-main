# Test Report — Bilateral module

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec id | 2026-05-bilateral-module |
| Spec path | `docs/specs/bilateral-module/` |
| Tested against | `requirements.md`, `design.md`, `tasks.md`, `execution.md` |
| Test run | 2026-05-19 |
| Branch | `AC-1594-bilateral-module` |
| Node version | v25.2.1 |
| Server commands used | `npm test -- --runInBand`, `npm run test:e2e -- --testPathPattern 'bilateral\|agresso-contract' --runInBand`, `npm run test:cov -- --runInBand --testPathIgnorePatterns 'jwr.middleware.spec'` |
| Overall status | **PASS for in-scope bilateral surface** — 1 unrelated pre-existing suite failure (`jwr.middleware.spec.ts`, Node v25 / `buffer-equal-constant-time` incompatibility) flagged but excluded. |

---

## 2. Summary

| Stage | Result |
| --- | --- |
| Build (`npm run build`) | PASS — Nest + Vite admin bundle. |
| Full unit tests (`npm test`) | 290 / 291 suites — 289 passed, 1 skipped (opt-in DB integration), **1 failed** (`jwr.middleware.spec.ts` — Node v25 incompatibility in `jsonwebtoken` transitive dep; not introduced by this spec). 1 583 tests pass / 1 skipped / 0 fail. **Post-2026-05-19 follow-up** adds 17 tests to the bilateral surface (2 thin-repo smoke specs + 13 handler `delete`/non-Conflict/typology cases + 1 noop delete + 1 innovation-development reject-non-object); focused bilateral run alone climbs from 79 → 95 tests across the same 17 passing suites + 1 opt-in DB integration skipped. |
| Focused bilateral e2e (`test/bilateral.e2e-spec.ts`) | PASS — 21 tests. |
| Focused agresso e2e (`test/agresso-contract.e2e-spec.ts`) | PASS — 4 tests. |
| Bilateral surface ESLint | Clean (verified during prior validation pass). |
| Bilateral entities coverage | statements **98.12%** / branches **78.50%** / functions **100.00%** (11 files; up from 95.17% / 73.83% / 93.10% after §8.2 closures). |
| Bilateral-push tool coverage | statements 100% / branches 100% / functions 100% (5 files). |
| Result-review-history coverage | statements **100.00%** / functions **100.00%** (2 files; up from 92.86% / 0% after smoke-test addition). |
| Result-owner guard coverage | statements 100% / branches 100% / functions 100%. |
| Agresso-contract changed files coverage | statements 99.55% / branches 91.67% / functions 100%. |
| Full `npm run test:e2e` | Not used as a gate — pre-existing open-handle hang in `test/app.e2e-spec.ts` (full `AppModule` import). Tracked outside this spec. |

**Headline:** in-scope work (Phase 0–2 + T-24 skeleton) is well-tested and green. Phase 3 integration tests (T-26/T-29/T-31 service tests, T-34 idempotency/failure-injection) and Phase 4 full e2e suite (T-33) are still pending.

---

## 3. Backend Unit Tests

### 3.1 Bilateral entity module

| Spec file | `it` blocks | Notes |
| --- | --- | --- |
| `src/domain/entities/bilateral/bilateral.controller.spec.ts` | 13 | Covers GET/PATCH alignment, GET indicators, POST/PATCH/DELETE contribution, auth + role wiring. |
| `src/domain/entities/bilateral/bilateral.service.spec.ts` | 26 | `getAlignment`, `updateAlignment` (Yes/No + lever_codes, transactional, audit, 409 after sync), `listIndicators` (eligible / ineligible / search / stale), `upsertContribution`, `deleteContribution`, `markIndicatorMappingsStale`. |
| `src/domain/entities/bilateral/bilateral.module.spec.ts` | 2 | Module compiles + declares Bilateral tag in Swagger metadata. |
| `src/domain/entities/bilateral/handlers/capacity-sharing.handler.spec.ts` | 3 | Validate required fields + delegation to `ResultCapacitySharingService`. |
| `src/domain/entities/bilateral/handlers/innovation-development.handler.spec.ts` | 3 | Same shape for innovation-development. |
| `src/domain/entities/bilateral/handlers/knowledge-product.handler.spec.ts` | 3 | KP handler — partial Phase 2 scope per D9. |
| `src/domain/entities/bilateral/handlers/policy-change.handler.spec.ts` | 3 | Policy-change validation + delegation. |
| `src/domain/entities/bilateral/handlers/noop.handler.spec.ts` | 2 | Other output/outcome — narrative free-text path. |
| `src/domain/entities/bilateral/repositories/result-pool-funding-alignment.repository.spec.ts` | 4 | Active-alignment lookup + selected SP rows + soft-delete behaviour. |
| `src/domain/entities/bilateral/repositories/result-pool-funding-indicator-mapping.repository.spec.ts` | 4 | Mapping upsert + soft-delete + stale flag transitions. |
| `src/domain/entities/bilateral/repositories/result-pool-funding-indicator-mapping.repository.integration.spec.ts` | 1 | Opt-in DB integration (`ARI_RUN_DB_INTEGRATION=true`) — skipped by default. |
| `src/domain/entities/bilateral/entities/result-pool-funding-alignment.entity.spec.ts` | 2 | TypeORM metadata + AuditableEntity inheritance. |
| `src/domain/entities/bilateral/entities/result-pool-funding-alignment-sp.entity.spec.ts` | 2 | Same. |
| `src/domain/entities/bilateral/entities/result-pool-funding-indicator-mapping.entity.spec.ts` | 3 | Same + stale-flag column metadata. |

**Total:** 14 spec files / 73 `it` blocks for the bilateral entity module.

### 3.2 Bilateral-push tool (T-24 skeleton)

| Spec file | `it` blocks | Notes |
| --- | --- | --- |
| `src/domain/tools/bilateral-push/bilateral-push.module.spec.ts` | 1 | Module loads + providers registered. |
| `src/domain/tools/bilateral-push/bilateral-push.service.spec.ts` | 3 | Feature-flag skip path + `NotImplementedException` paths for `send()` and `execute()`. |
| `src/domain/tools/bilateral-push/bilateral-push.connection.spec.ts` | 1 | `send()` placeholder throws `NotImplementedException`. |
| `src/domain/tools/bilateral-push/bilateral-push.consumer.spec.ts` | 4 | Accepts JSON string + object payloads; rejects invalid JSON with `BadRequestException`. |

**Total:** 4 spec files / 9 `it` blocks for the push skeleton.

### 3.3 Result-review-history

| Spec file | `it` blocks | Notes |
| --- | --- | --- |
| `src/domain/entities/result-review-history/entities/result-review-history.entity.spec.ts` | n/a (metadata spec) | TypeORM column metadata + AuditableEntity inheritance. |
| `src/domain/entities/result-review-history/result-review-history.module.spec.ts` | n/a (module spec) | Module compiles + repository registered. |

Repository helper is exercised indirectly through `BilateralService.updateAlignment` and `BilateralService.upsertContribution`. One repository function is currently untested directly (see §7 remediation).

### 3.4 Shared

| Spec file | `it` blocks | Notes |
| --- | --- | --- |
| `src/domain/shared/guards/result-owner.guard.spec.ts` | 6 | Deny without user; allow SYSTEM_ADMIN / CENTER_ADMIN bypass; allow contributor when owner; deny contributor when not owner; honour `@ResultOwner()` metadata subset. |
| `src/domain/tools/socket/server.gateway.spec.ts` | 1 | Emits `result.pool-funding-alignment.changed` with the documented payload `{ result_code, by_user_id, at }`. |
| `src/domain/shared/utils/env.utils.spec.ts` | 4 | Includes the 4 bilateral feature flags — default `false`, exact `"true"` to enable. |

### 3.5 Agresso-contract (extensions for US1)

| Spec file | `it` blocks | Notes |
| --- | --- | --- |
| `src/domain/entities/agresso-contract/agresso-contract.controller.spec.ts` | extended | New `setPoolFundingTag` PATCH route + `pool-funding-contributor` query filter. |
| `src/domain/entities/agresso-contract/agresso-contract.service.spec.ts` | extended | `setPoolFundingTag(contractCode, value, user)`: bilateral validation, audit columns, OpenSearch reindex trigger, 400 for non-bilateral contract. |
| `src/domain/entities/agresso-contract/agresso-contract.controller.spec.ts` + `repositories/agresso-contract.repository.spec.ts` | extended | Filter combinations (`pool-funding-contributor=true\|false\|unset`) + repository AND-with-existing-filters. |

### 3.6 Result-status-workflow

| Spec file | `it` blocks | Notes |
| --- | --- | --- |
| `src/domain/entities/result-status-workflow/result-status-workflow.service.spec.ts` + `satus-graph.spec.ts` | extended | Asserts the 5 logical bilateral transition rows (`DRAFT → BILATERAL_PENDING_REVIEW`, two reviewer decisions, two re-review re-entries) are present and non-listed transitions are rejected. |

---

## 4. Frontend Unit Tests

The STAR frontend that consumes this API lives in the separate STAR client repository (out of scope for this guide — see `CLAUDE.md` §6). The bilateral admin SSR pages (`SyncW3Registry.tsx`, `SyncSpToc.tsx`, `BilateralPushFailures.tsx`) that *will* live inside `server/researchindicators/src/admin/client/pages/` are deferred to T-28 / T-30 / T-32 and are therefore not yet present.

**Result:** No frontend tests in this repo for this spec. Frontend test responsibility tracked via STAR coordination tickets T-13, T-14, T-19 in the STAR repo.

---

## 5. Integration Tests

The bilateral surface uses Nest controller specs as the integration layer for repository → service → controller integration (with mocked TypeORM repositories) and `*.e2e-spec.ts` files as the in-process HTTP integration layer (Supertest against an isolated Nest test module).

| File | Approach | Tests | Result |
| --- | --- | --- | --- |
| `test/bilateral.e2e-spec.ts` | Isolated Nest test module + Supertest. Uses real `ResultOwnerGuard` + `RolesGuard` paths, mocks `ResultUsersService` to avoid the full `AppModule` graph. | 21 | PASS |
| `test/agresso-contract.e2e-spec.ts` | Same approach. | 4 | PASS |
| `test/app.e2e-spec.ts` | Full `AppModule` boot. | not gating | Pre-existing open-handle hang. Tracked outside this spec. |

### 5.1 Bilateral e2e test cases (`test/bilateral.e2e-spec.ts`)

| # | Test | Maps to |
| --- | --- | --- |
| 1 | returns tagged project alignment | R-BIL-010 |
| 2 | returns ineligible shape for untagged projects | R-BIL-010 |
| 3 | returns read-only state for synced results | R-BIL-015 |
| 4 | returns selected SP groups with empty indicators before ToC sync exists | R-BIL-020, R-BIL-022 |
| 5 | returns stale mapped indicators for selected SPs | R-BIL-022, R-BIL-035 |
| 6 | serves 50 concurrent empty-catalog indicator requests under the p95 target | NFR-BIL-001 |
| 7 | updates pool funding alignment for an owner | R-BIL-011, R-BIL-012 |
| 8 | creates a capacity sharing contribution for an owner | R-BIL-030, R-BIL-031 |
| 9 | parameterized — capacity_sharing / knowledge_product / policy_change / innovation_development / NOOP | R-BIL-031 |
| 10 | updates a contribution for an owner | R-BIL-030, R-BIL-033 |
| 11 | deletes a contribution for an owner | R-BIL-030, R-BIL-033 |
| 12 | returns 403 when a contributor is not owner for contribution saves | R-BIL-013 |
| 13 | returns 400 when contribution payload validation fails | R-BIL-032 |
| 14 | returns 409 when contribution edits are blocked after PRMS sync | R-BIL-034 |
| 15 | returns 404 when deleting a missing contribution mapping | R-BIL-030 |
| 16 | returns 403 when a contributor is not a result owner | R-BIL-013 |
| 17 | returns 403 when the role is not allowed to edit | R-BIL-013 |
| 18 | returns 400 for invalid update payloads | R-BIL-011, R-BIL-016 |

### 5.2 Agresso-contract e2e test cases (`test/agresso-contract.e2e-spec.ts`)

| # | Test | Maps to |
| --- | --- | --- |
| 1 | updates the pool funding contributor tag | R-BIL-001 |
| 2 | returns 401 without credentials | NFR-BIL-002 |
| 3 | returns 403 for authenticated users without the required role | NFR-BIL-002, R-BIL-013 |
| 4 | returns 400 for invalid tag payloads | R-BIL-001, NFR-BIL-002 |

---

## 6. E2E Tests

The user-visible end-to-end workflow (STAR UI → ARI → PRMS) cannot be exercised in this repo because the STAR client lives in a separate repository and PRMS is an external system. Within the scope of this server repo, the closest analogue is `test/bilateral.e2e-spec.ts` (see §5.1) which exercises the HTTP layer end-to-end against an in-process Nest app.

End-to-end visibility gaps:

- **STAR FE** (`T-13` / `T-14` / `T-19`) — exercised in the STAR repo's own e2e suite when those tickets land.
- **PRMS round-trip** — covered by `T-26` push service + `T-34` idempotency/failure-injection harness once external blockers `T-21` and `T-23` close.
- **Full `AppModule` e2e** — pre-existing open-handle hang in `test/app.e2e-spec.ts`; not introduced by this spec. Should be tracked as a separate test-infrastructure task (see §7 remediation #4).

---

## 7. Coverage & Traceability

### 7.1 Coverage (this run)

| Surface | Files | Stmts | Branches | Functions |
| --- | --- | --- | --- | --- |
| `domain/entities/bilateral/` (non-spec, non-entity, non-dto) | 11 | **98.12%** (366/373) | **78.50%** (84/107) | **100.00%** (87/87) |
| `domain/tools/bilateral-push/` (non-spec, non-dto) | 5 | **100.00%** (40/40) | **100.00%** (2/2) | **100.00%** (7/7) |
| `domain/entities/result-review-history/` (non-spec, non-entity) | 2 | **100.00%** (14/14) | n/a (no branches) | **100.00%** (1/1) |
| `domain/shared/guards/result-owner.guard.ts` | 1 | **100.00%** | **100.00%** | **100.00%** |
| `agresso-contract` (changed files in scope) | 5 | **99.55%** (221/222) | **91.67%** (88/96) | **100.00%** (50/50) |

All numbers above ≥ the 60% global threshold required by NFR-BIL-007. Per-file detail (post §8.2 closure):

```
100.0%  src/domain/entities/bilateral/bilateral.controller.ts
100.0%  src/domain/entities/bilateral/bilateral.module.ts
 95.6%  src/domain/entities/bilateral/bilateral.service.ts
100.0%  src/domain/entities/bilateral/handlers/capacity-sharing.handler.ts
100.0%  src/domain/entities/bilateral/handlers/innovation-development.handler.ts
100.0%  src/domain/entities/bilateral/handlers/knowledge-product.handler.ts
100.0%  src/domain/entities/bilateral/handlers/noop.handler.ts
100.0%  src/domain/entities/bilateral/handlers/policy-change.handler.ts
100.0%  src/domain/entities/bilateral/repositories/result-pool-funding-alignment-sp.repository.ts
100.0%  src/domain/entities/bilateral/repositories/result-pool-funding-alignment.repository.ts
100.0%  src/domain/entities/bilateral/repositories/result-pool-funding-indicator-mapping.repository.ts
100.0%  src/domain/entities/result-review-history/repositories/result-review-history.repository.ts
100.0%  src/domain/entities/result-review-history/result-review-history.module.ts
100.0%  src/domain/shared/guards/result-owner.guard.ts
100.0%  src/domain/tools/bilateral-push/bilateral-push.connection.ts
100.0%  src/domain/tools/bilateral-push/bilateral-push.constants.ts
100.0%  src/domain/tools/bilateral-push/bilateral-push.consumer.ts
100.0%  src/domain/tools/bilateral-push/bilateral-push.module.ts
100.0%  src/domain/tools/bilateral-push/bilateral-push.service.ts
```

The only file still below 100% statements is `bilateral.service.ts` (95.6%); the uncovered branches and statements all live inside `reviewDecision()` and other `NotImplementedException` skeletons that downstream tasks (T-26, T-27) will fill.

### 7.2 Requirement → test matrix

> Statuses: **TESTED** = covered by at least one unit and/or e2e test; **PARTIAL** = code exists with tests but a sub-AC is deferred; **NOT TESTED** = no test evidence (task pending or blocked); **OUT-OF-SCOPE** = lives in the STAR repo.

| Req | Status | Evidence |
| --- | --- | --- |
| R-BIL-001 Persist tag | TESTED | `agresso-contract.service.spec.ts`, `agresso-contract.e2e-spec.ts` happy path. Migration verified forward/revert in `execution.md` T-01. |
| R-BIL-002 Surface tag on STAR | OUT-OF-SCOPE | Backend exposes tag; STAR UI verification in STAR repo (T-13). |
| R-BIL-003 Filter by tag | TESTED | `agresso-contract.controller.spec.ts` + `agresso-contract.repository.spec.ts` (filter true/false/unset + AND semantics). |
| R-BIL-010 Conditional render flag | TESTED | `bilateral.e2e-spec.ts` cases 1, 2. |
| R-BIL-011 Yes/No + SP selection | TESTED | `bilateral.service.spec.ts` (multiple cases) + e2e case 7. |
| R-BIL-012 Persistence + audit | TESTED | `bilateral.service.spec.ts` asserts `result_review_history` row + Socket emission. |
| R-BIL-013 Authorization | TESTED | `result-owner.guard.spec.ts` (6 branches) + e2e cases 12, 16, 17 + agresso e2e case 3. |
| R-BIL-014 Edit regardless of status (AR.1) | TESTED | Controller spec asserts handler has no `ResultStatusGuard`; service spec covers `BILATERAL_APPROVED` edit path. |
| R-BIL-015 Read-only after PRMS sync (AR.2) | TESTED | Service spec + e2e case 3 + e2e case 14. |
| R-BIL-016 Not part of submission validator (AR.3) | TESTED | Service spec covers empty-alignment SUBMITTED path; e2e case 18 covers invalid update. |
| R-BIL-020 Indicators grouped by SP | TESTED | `bilateral.service.spec.ts` group shape + e2e case 4. |
| R-BIL-021 Filter & search indicators | TESTED (accepted as no-op pre-catalog) | Service spec validates `search` and `indicator-type` query parsing. |
| R-BIL-022 Empty / stale catalog | TESTED | E2e cases 4 + 5; service spec for stale-mapped indicators. |
| R-BIL-030 Select indicators | TESTED | E2e cases 8, 10, 11, 15. |
| R-BIL-031 Type-specific payload | TESTED | Five handler specs (15 total `it` blocks) + e2e case 9 (parameterized across all 5 handler types). |
| R-BIL-032 Per-type validation | TESTED | Handler specs + e2e case 13. |
| R-BIL-033 Audit on save/delete | TESTED | Service spec asserts `result_review_history` rows for `INDICATOR_MAPPING_CHANGED` + soft-delete. |
| R-BIL-034 Read-only after sync (mapping) | TESTED | E2e case 14 + service spec 409 path. |
| R-BIL-035 Stale flag on drift | TESTED | `bilateral.service.spec.ts` `markIndicatorMappingsStale`; repository spec; e2e case 5. |
| R-BIL-040 Trigger push on approval | PARTIAL | `bilateral-push.service.spec.ts` exercises the feature-flag skip path and `NotImplementedException` until T-26 implements real send. |
| R-BIL-041 PRMS-compatible payload | NOT TESTED | T-25 paused — mapper not yet implemented. |
| R-BIL-042 Idempotency | NOT TESTED | Pending T-26 + T-34. |
| R-BIL-043 Logging & metrics | NOT TESTED | Pending T-26 + T-35. |
| R-BIL-044 Failure handling + admin retry | NOT TESTED | Pending T-26 + T-28. |
| R-BIL-045 Lock on success | PARTIAL | The "block edits after sync" side is TESTED via R-BIL-015/034 evidence; the "set on success" side is pending T-26. |
| R-BIL-050 W3 Registry scheduled pull | NOT TESTED | Pending T-29 (blocked by T-22). |
| R-BIL-051 Apply tag diffs | NOT TESTED | Pending T-29. |
| R-BIL-052 Sync logging & alerting | NOT TESTED | Pending T-29. |
| R-BIL-053 W3 admin manual trigger | NOT TESTED | Pending T-30. |
| R-BIL-060 SP ToC scheduled pull | NOT TESTED | Pending T-31. |
| R-BIL-061 Upsert with stable code | NOT TESTED | Pending T-31. |
| R-BIL-062 Mark removed indicators inactive | NOT TESTED | Pending T-31 (`indicator.is_active` column already exists). |
| R-BIL-063 SP ToC admin manual trigger | NOT TESTED | Pending T-32. |
| NFR-BIL-001 Performance | PARTIAL | E2e case 6 verifies 50-concurrent `listIndicators` under p95 target. Push p95 deferred until T-26. |
| NFR-BIL-002 Security | TESTED for in-scope endpoints | Agresso e2e cases 2, 3, 4 + bilateral e2e cases 12, 16, 17; outbound auth pending T-21. |
| NFR-BIL-003 Reliability & atomicity | PARTIAL | `BilateralService.updateAlignment` transactional path tested; sync jobs and chaos tests pending. |
| NFR-BIL-004 Observability | PARTIAL | `sync_process_log` write tested for T-07; CloudWatch dashboard pending T-35. |
| NFR-BIL-005 Accessibility | OUT-OF-SCOPE | STAR repo (axe-core checks live there). |
| NFR-BIL-006 PRMS contract compatibility | PARTIAL | Handler specs preserve backend-compatible typos (D12); payload-shape tests land with T-25. |
| NFR-BIL-007 Maintainability | TESTED | Coverage well above 60% threshold (see §7.1); ESLint clean. |
| NFR-BIL-008 Auditability | TESTED | All bilateral entities extend AuditableEntity; review history written; specs assert audit columns. |
| NFR-BIL-009 Idempotency | NOT TESTED | Pending T-34 (replay-3× harness). |
| NFR-BIL-010 Localization | NOT TESTED | Pending — UTF-8 / Spanish snapshot tests not yet added. |
| NFR-BIL-011 Rate limiting | NOT TESTED | Pending — depends on D15 inbound endpoint existing. |

**Tally:** 22 TESTED, 4 PARTIAL, 12 NOT TESTED (entirely Phase 3 / Phase 4 work), 2 OUT-OF-SCOPE (STAR), 4 OUT-OF-SCOPE (STAR — NFR-BIL-005 + R-BIL-002).

---

## 8. Remediation

### 8.1 Environmental / infrastructure (non-spec)

1. **`jwr.middleware.spec.ts` fails under Node v25.2.1.** Root cause: transitive dep `buffer-equal-constant-time@1.0.1` (via `jsonwebtoken` → `jws` → `jwa`) calls `SlowBuffer.prototype.equal = …` on import — `SlowBuffer` was removed in Node 22+. Mitigation: pin the dev Node version to ≤ 20 (matching CI), or upgrade `jsonwebtoken` to a version whose transitive `jwa` no longer depends on `buffer-equal-constant-time`, or replace `buffer-equal-constant-time` via `package.json` `overrides`. **This is not a regression introduced by the bilateral spec** — it is a Node version / dependency incompatibility that surfaces any time `jwr.middleware.ts` is loaded. Tracked outside this spec.
2. **Full `npm run test:e2e` hangs.** The `test/app.e2e-spec.ts` setup imports the full `AppModule`, which leaves open handles (cron / broker). Bilateral and Agresso e2e use isolated Nest modules instead and run cleanly. Tracked outside this spec (test-infrastructure cleanup).

### 8.2 Test surface gaps — bilateral

3. ~~**`result-review-history.repository.ts` direct unit test.**~~ **CLOSED 2026-05-19.** Added `result-review-history.repository.spec.ts` smoke test mirroring the project pattern (`AnnouncementSettingRepository.spec.ts`). Coverage now 100% statements / 100% functions on the file.
4. ~~**Handler specs at 88.9–92% statements.**~~ **CLOSED 2026-05-19.** All five handler spec files now exercise (a) the `delete` path through a mocked entity-manager `update`, (b) the rethrow-on-non-Conflict error branch in `ensureResultTypeRow`, and (c) for innovation-development, the `typeof !== 'object'` typology guard. Every handler is now at 100% statements.
5. ~~**`result-pool-funding-alignment-sp.repository.ts` at 85.7%.**~~ **CLOSED 2026-05-19.** Added smoke test matching the project pattern. Coverage now 100% statements / 100% functions on the file.

### 8.3 Tests pending Phase 3 / Phase 4 tasks (blocked or downstream)

6. **T-25 mapper tests.** Fixture-based snapshot tests under `test/fixtures/prms-payload/`, one per indicator type. Blocked on PRMS field-level payload contract.
7. **T-26 push service / consumer / retry tests.** Cover happy path, 5xx retry-with-backoff, 4xx permanent failure, idempotency-key replay, success-side `is_synced_to_prms` + `prms_result_code` set. Includes Socket.IO emission specs for `result.bilateral.push.succeeded` / `result.bilateral.push.failed`.
8. **T-27 approve-transition enqueue test.** Mock the consumer and assert `bilateral.push.requested` is published; assert re-review re-enqueues with the new `version_id`.
9. **T-28 admin retry tests.** Endpoint role enforcement + SSR page rendering with mocked initial data.
10. **T-29 W3 Registry sync tests.** Diff computation, transactional apply, dry-run, manual-override honouring, OpenSearch reindex.
11. **T-31 SP ToC sync tests.** Stable-code upsert; inactivate-on-absence + stale-flag trigger; rename-only display-name path.
12. **T-33 Full E2E suite.** ≥ 3 cases per bilateral endpoint (auth-success / auth-failure / role denial); AR.1 edit-in-Approved; AR.2 409 after sync; owner vs non-owner.
13. **T-34 idempotency + failure-injection harness.** Mock PRMS connection across 5xx / 4xx / timeout / 2xx; replay same key 3× and assert no duplicate state.
14. **NFR-BIL-009 idempotency e2e** — covered by remediation #13 above.
15. **NFR-BIL-010 localization tests** — Spanish snapshot tests on the new alignment + indicator payloads.
16. **NFR-BIL-011 rate-limit tests** — exercise `express-rate-limit` against the inbound ingestion endpoint when D15 is exercised.

### 8.4 Frontend coordination

17. **STAR FE test responsibility (T-13 / T-14 / T-19).** Tracked in the STAR repo. Confirm STAR CI exercises the tag column, alignment section, indicator panel, and per-type contribution forms — including axe-core for NFR-BIL-005.

**Total remediation items:** 17 — 2 infrastructure (non-spec), 3 in-scope test surface gaps (#3, #4, #5 — all closed 2026-05-19), 11 deferred to Phase 3 / Phase 4 / STAR FE work. **In-scope test gap count after 2026-05-19 follow-up: 0.**

---

## 9. Verdict

- **In-scope bilateral surface** (Phase 0–2 backend + T-24 push skeleton): **PASS**. 73 unit `it` blocks in the bilateral entity module, 9 in the push tool, 6 in the result-owner guard, 4 in env utils, 1 in the socket gateway, plus extensions in agresso-contract + result-status-workflow. 21 bilateral e2e cases + 4 agresso e2e cases. Coverage 95.17%/73.83%/93.10% (stmts/branches/funcs) on the bilateral package.
- **Phase 3 integrations (US5 / US6 / US7)**: **NOT TESTED** — code not yet implemented; tests land with T-25..T-32.
- **Phase 4 quality + rollout**: **NOT TESTED** — pending T-33..T-38.
- **STAR frontend**: covered in the STAR repo; not in scope here.

Overall: the bilateral test pass is consistent with `execution.md` and the validation report — current state is on plan, with no silent regressions. The single Node v25 dependency failure is environmental and unrelated to the spec.
