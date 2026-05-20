# Validation Report — Bilateral module

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec id | 2026-05-bilateral-module |
| Spec path | `docs/specs/bilateral-module/` |
| Validated against | `requirements.md`, `design.md`, `tasks.md`, `execution.md` |
| Constitutional baseline | `docs/prd.md`, `docs/system-design/design.md`, `docs/detailed-design/detailed-design.md`, `docs/specs/general-setup/`, root + `server/researchindicators/src/CLAUDE.md` |
| Validation run | 2026-05-19 |
| Branch | `AC-1594-bilateral-module` |
| Overall status | **PARTIAL** — Phase 0–2 backend + T-24 push skeleton complete and verifiable; Phase 3 integrations (US5/US6/US7) and Phase 4 quality/rollout still pending. Three external blockers (T-21, T-22, T-23) remain open. STAR FE tasks (T-13/T-14/T-19) are intentionally out of scope for this repo. |

---

## 2. Summary

- **Spec scope:** 7 user stories, 33 functional + 11 non-functional requirements, 38 tasks across 5 phases.
- **Tasks completed:** 17 / 38 (`T-01`–`T-12`, `T-15`–`T-18`, `T-20`, `T-24`).
- **Tasks pending / blocked:** 18 — `T-21`/`T-22`/`T-23` external decision blockers; `T-25`–`T-32` Phase 3 integrations; `T-33`–`T-38` Phase 4.
- **Tasks out-of-scope for this repo:** 3 (`T-13`, `T-14`, `T-19` — STAR frontend coordination tickets).
- **Build:** `npm run build` → exit 0 (Nest + Vite admin).
- **Unit tests:** 36 suites / 267 tests pass on the bilateral surface (1 opt-in DB integration suite skipped by design).
- **Focused e2e:** `bilateral.e2e-spec.ts` + `agresso-contract.e2e-spec.ts` → 2 suites / 25 tests pass.
- **Scoped ESLint:** clean across bilateral/, bilateral-push/, result-owner guard + decorator, result-review-history/, agresso-contract/, socket gateway, env.utils.
- **Coverage (last `npm run test:cov`, per `execution.md` T-20 record):** bilateral package statements 95.32%, functions 93.10%, branches 73.83% — all above the 60% global threshold (NFR-BIL-007).
- **Known limitation:** full `npm run test:e2e` is not used as a completion gate because the pre-existing `test/app.e2e-spec.ts` setup imports the full `AppModule` and leaves open handles (documented in `execution.md`). Not a regression introduced by this spec.

---

## 3. Task Completion

| Phase | Task | Status (tasks.md) | Status (execution.md) | Result |
| --- | --- | --- | --- | --- |
| 0 | T-01 Schema extensions | completed | completed (2026-05-19) | PASS |
| 0 | T-02 Statuses + workflow + platform | completed | completed | PASS |
| 0 | T-03 New tables | completed | completed | PASS |
| 0 | T-04 ResultOwnerGuard | completed | completed | PASS |
| 0 | T-05 Bilateral module skeleton | completed | completed | PASS |
| 0 | T-06 Feature flags | completed | completed | PASS |
| 1 | T-07 AGRESSO tag service | completed | completed | PASS |
| 1 | T-08 PATCH agresso tag endpoint | completed | completed | PASS |
| 1 | T-09 Filter projects by tag | completed | completed | PASS |
| 1 | T-10 Alignment GET | completed | completed | PASS |
| 1 | T-11 Alignment PATCH + audit | completed | completed | PASS |
| 1 | T-12 Socket alignment event | completed | completed | PASS |
| 1 | T-13 STAR FE project tag | pending (coordination) | n/a — STAR repo | OUT-OF-SCOPE |
| 1 | T-14 STAR FE alignment section | pending (coordination) | n/a — STAR repo | OUT-OF-SCOPE |
| 2 | T-15 Indicator panel GET | completed | completed | PASS |
| 2 | T-16 Type-specific handlers | completed | completed | PASS |
| 2 | T-17 Mapping POST/PATCH/DELETE | completed | completed | PASS |
| 2 | T-18 Stale-flag logic | completed | completed | PASS |
| 2 | T-19 STAR FE indicator panel | pending (coordination) | n/a — STAR repo | OUT-OF-SCOPE |
| 2 | T-20 Phase 2 e2e + coverage | completed | completed | PASS |
| 3 | T-21 BLOCKER D-push-auth | pending (blocker) | not started | BLOCKED (external) |
| 3 | T-22 BLOCKER D-source-w3 | pending (blocker) | not started | BLOCKED (external) |
| 3 | T-23 BLOCKER OQ-US5-3/6 | pending (blocker) | not started | BLOCKED (external) |
| 3 | T-24 Push module skeleton | completed (skeleton only) | completed (skeleton only) | PASS (partial — `send()` and `execute()` are `NotImplementedException` placeholders by design) |
| 3 | T-25 ResultToPrmsMapper | pending | paused/blocked | BLOCKED (missing PRMS field-level contract) |
| 3 | T-26 Push service + queue + retry | pending | not started | PENDING (blocked by T-23, T-25) |
| 3 | T-27 Approve transition triggers push | pending | not started | PENDING |
| 3 | T-28 Admin push retry + SSR page | pending | not started | PENDING |
| 3 | T-29 W3 Registry sync module | pending | not started | PENDING (blocked by T-22) |
| 3 | T-30 Admin W3 sync SSR page | pending | not started | PENDING |
| 3 | T-31 SP ToC sync module | pending (next candidate) | triaged | PENDING (blocked on confirmed upstream payload shape) |
| 3 | T-32 Admin SP ToC SSR page | pending | not started | PENDING |
| 4 | T-33 Full E2E suite | pending | not started | PENDING |
| 4 | T-34 Idempotency / failure injection | pending | not started | PENDING |
| 4 | T-35 CloudWatch dashboard + alarms | pending | not started | PENDING |
| 4 | T-36 Runbook | pending | not started | PENDING |
| 4 | T-37 Staging rollout | pending | not started | PENDING |
| 4 | T-38 Production rollout | pending | not started | PENDING |

**Counts:** 17 PASS, 1 PASS-partial, 3 BLOCKED, 14 PENDING, 3 OUT-OF-SCOPE — totals 38 tasks plus the 3 STAR FE coordination tickets.

**Cross-file consistency:** `tasks.md` document-control status line ("Phase 2 backend complete locally; Phase 3 skeleton started …") matches `execution.md` ("Phase 0 complete … T-24 Phase 3 skeleton complete … T-25 paused"). No drift.

---

## 4. File Existence

### 4.1 Migrations (`db/migrations/`)

| Expected (design §4) | Present | Notes |
| --- | --- | --- |
| `addPoolFundingContributorTagToAgressoContract` | ✓ `1779190000001-…` | |
| `addIsSyncedToPrmsAndPrmsResultCodeToResults` | ✓ `1779190000002-…` | |
| `addBilateralResultStatuses` | ✓ `1779190000003-…` | |
| `addBilateralResultStatusWorkflow` | ✓ `1779190000004-…` | |
| `addReportingPlatformBilateral` | ✓ `1779190000005-…` | |
| `createResultPoolFundingAlignment` | ✓ `1779190000006-…` | |
| `createResultPoolFundingAlignmentSp` | ✓ `1779190000007-…` | Added vs design (design mentions Sp as part of §5.1.6 but lists only one migration in §4) — split is documented in `execution.md` T-03. |
| `createResultPoolFundingIndicatorMapping` | ✓ `1779190000008-…` | |
| `createResultReviewHistory` | ✓ `1779190000009-…` | |
| `addIsActiveToIndicator` (conditional) | n/a — column already exists | Confirmed in `execution.md` T-01 (decision recorded). |

**Result:** All required migrations present. Forward + revert verified in execution log; no merged migration was edited (append-only rule honoured).

### 4.2 `domain/entities/bilateral/`

| Expected | Present | Notes |
| --- | --- | --- |
| `bilateral.controller.ts` + spec | ✓ | 19 `@Api*` annotations. |
| `bilateral.service.ts` + spec | ✓ | |
| `bilateral.module.ts` + spec | ✓ | Registered in `domain/routes/main.routes.ts` line 79 under `RESULT_CODE/pool-funding-alignment`. |
| `dto/update-pool-funding-alignment.dto.ts`, `upsert-indicator-mapping.dto.ts`, `list-indicators-query.dto.ts`, `review-decision.dto.ts`, `push-retry.dto.ts` | ✓ 4 of 5 (split 2026-05-19); `push-retry.dto.ts` deferred to T-28 | `bilateral-skeleton.dto.ts` removed and split into per-design-file DTOs. `push-retry.dto.ts` lands with T-28 (admin retry endpoint). |
| `enum/pool-funding-decision.enum.ts`, `review-decision.enum.ts` | ✗ | Not yet introduced; `has_contribution` modeled as `boolean` in DTO. Acceptable for current scope but worth revisiting before T-27. |
| `entities/result-pool-funding-alignment.entity.ts` | ✓ | + spec. |
| `entities/result-pool-funding-alignment-sp.entity.ts` | ✓ (added vs design — D2 dedicated-tables decision) | |
| `entities/result-pool-funding-indicator-mapping.entity.ts` | ✓ | + spec. |
| `entities/indicator.entity.ts` (conditional) | n/a | Existing ARI `indicators` table reused. |
| `repositories/alignment.repository.ts`, `mapping.repository.ts` | ✓ (renamed `result-pool-funding-alignment.repository.ts`, `result-pool-funding-alignment-sp.repository.ts`, `result-pool-funding-indicator-mapping.repository.ts`) | More specific naming; aligns with ARI convention. |
| `handlers/{interface, capacity-sharing, knowledge-product, policy-change, innovation-development, innovation-use, noop}.handler.ts` | 5 of 6 present | `innovation-use.handler.ts` intentionally skipped per D5 = C (deferred). All other 5 handlers + sibling spec files exist. |
| `mappers/result-to-prms-payload.mapper.ts` | ✗ | T-25 paused — blocked by missing PRMS field-level contract. |

### 4.3 `domain/entities/result-review-history/`

| Expected | Present | Notes |
| --- | --- | --- |
| `result-review-history.module.ts` + spec | ✓ | |
| `result-review-history.service.ts` + spec | n/a — design updated 2026-05-19 | Design §4 now reflects "module + entity + repository only"; `BilateralService` writes via the repository directly. Add a dedicated service if a second module ever needs to mutate review history. |
| `entities/result-review-history.entity.ts` + spec | ✓ | |
| `repositories/result-review-history.repository.ts` | ✓ | |

### 4.4 `domain/tools/`

| Expected | Present | Notes |
| --- | --- | --- |
| `bilateral-push/` module, service, connection, queue consumer, DTOs, mappers | ✓ (skeleton) / ✗ mapper | `bilateral-push.module/service/connection/consumer/dto/constants` all present + specs. Registered in `app-microservice.module.ts` line 29. `mappers/result-to-prms.mapper.ts` not present (T-25). `bilateral-push.queue.consumer.ts` renamed `bilateral-push.consumer.ts` — equivalent. |
| `w3-registry/` (module, service, connection, DTOs) | ✗ | T-29 pending (blocked by T-22). |
| `sp-toc-sync/` (module, service, connection, DTOs) | ✗ | T-31 pending (blocked on upstream payload). |
| `cron-jobs/w3-registry.cron.ts`, `sp-toc.cron.ts`, `bilateral-push.cron.ts` | ✗ | All three crons depend on Phase 3 integrations (T-26/T-29/T-31). |
| `socket/server.gateway.ts` extended with `emitPoolFundingAlignmentChanged` | ✓ | Event name `result.pool-funding-alignment.changed` documented in `socket/README.md`. |
| `clarisa/` extended for D8 catalogs | not in scope yet | Levers already wired; CLARISA indicator/policy/innovation extensions land with T-31/T-16 follow-ups. |

### 4.5 Shared

| Expected | Present | Notes |
| --- | --- | --- |
| `shared/guards/result-owner.guard.ts` + spec | ✓ | |
| `shared/decorators/result-owner.decorator.ts` | ✓ | |
| `shared/enum/sec_role.enum.ts` (no new roles per D6) | unchanged | Confirmed — no new roles introduced. |

### 4.6 Admin SSR

| Expected | Present | Notes |
| --- | --- | --- |
| `admin/controllers/admin-sync.controller.ts` | ✗ | T-28/T-30/T-32 pending. |
| `admin/services/admin-sync.service.ts` | ✗ | Same. |
| `admin/client/pages/SyncW3Registry.tsx` | ✗ | T-30 pending. |
| `admin/client/pages/SyncSpToc.tsx` | ✗ | T-32 pending. |
| `admin/client/pages/BilateralPushFailures.tsx` | ✗ | T-28 pending. |

### 4.7 Wiring sanity

- `app.module.ts` does **not** directly import `BilateralModule` — registration happens through `domain/routes/main.routes.ts` (line 66 import, line 79 route). Confirmed consistent with how other result sub-resources are wired (e.g. capacity-sharing children). PASS.
- `app-microservice.module.ts` imports and registers `BilateralPushModule`. PASS.
- Feature flags `ARI_BILATERAL_MODULE_ENABLED`, `ARI_BILATERAL_PUSH_ENABLED`, `ARI_BILATERAL_W3_SYNC_ENABLED`, `ARI_BILATERAL_SP_TOC_SYNC_ENABLED` present in both `env.utils.ts` and `.env.example`. Documented in `server/researchindicators/src/CLAUDE.md §8.1`. PASS.
- `ResultStatusEnum` extended with `BILATERAL_PENDING_REVIEW=23`, `BILATERAL_APPROVED=24`, `BILATERAL_REJECTED=25`. PASS.
- `ReportingPlatformEnum` extended with `BILATERAL='BILATERAL'`. PASS.

**Section result:** PASS for completed-task scope; remaining gaps are entirely accounted for by tasks marked pending/blocked.

---

## 5. Build Integrity

| Check | Command | Result |
| --- | --- | --- |
| Build (Nest + Vite admin) | `npm run build` | PASS (exit 0; 46 modules transformed, admin bundle 233.24 kB). |
| Unit tests — bilateral surface | `npx jest --runInBand --testPathPattern 'bilateral\|result-owner\|result-review-history\|env\.utils\|server\.gateway\|agresso-contract\|result-status-workflow\|reporting-platform'` | PASS (36 suites / 267 tests; 1 opt-in DB integration suite intentionally skipped). |
| E2E — focused bilateral | `npm run test:e2e -- --testPathPattern 'bilateral\|agresso-contract' --runInBand` | PASS (2 suites / 25 tests). |
| Scoped ESLint | `npx eslint` against bilateral + bilateral-push + shared/guards + shared/decorators + result-review-history + agresso-contract + socket/server.gateway + env.utils | PASS (no diagnostics). |
| Migrations forward/revert | Per `execution.md` T-01..T-03 records | PASS — every new migration runs forward and reverts cleanly on `TEST` datasource. |
| Coverage | Per `execution.md` T-20: `npm run test:cov` | PASS — bilateral package statements 95.32%, functions 93.10%, branches 73.83% (≥ 60% threshold). |
| Full `npm run test:e2e` | not run as a gate | Known pre-existing open-handle hang in `test/app.e2e-spec.ts`; not introduced by this spec. Tracked outside the spec. |

**Section result:** PASS.

---

## 6. Requirement Coverage

Mapping each `R-BIL-*` / `NFR-BIL-*` to (1) task(s), (2) implementation status, (3) code/test evidence. "Status" inherits from §3; "Evidence" is the canonical file where the requirement is implemented or tested.

### 6.1 US1 — Tag bilateral projects

| Req | Tasks | Status | Evidence |
| --- | --- | --- | --- |
| R-BIL-001 Persist tag | T-01, T-07 | DONE | `AgressoContractService.setPoolFundingTag`; migration `…001`; entity column + `@OpenSearchProperty`. |
| R-BIL-002 Surface tag on STAR | T-13 | OUT-OF-SCOPE (STAR) | Server side returns `is_pool_funding_contributor` in list/detail (confirmed in T-09 changes). STAR PR tracked separately. |
| R-BIL-003 Filter & search by tag | T-09, T-13 | DONE (backend) | Query param `pool-funding-contributor=true\|false` on `GET /api/v1/agresso/contracts` (controller lines 75, 88, 255, 277). |

### 6.2 US2 — Pool Funding Alignment section

| Req | Tasks | Status | Evidence |
| --- | --- | --- | --- |
| R-BIL-010 Conditional render flag | T-10 | DONE | `BilateralService.getAlignment` returns `eligible` + `has_pool_funding_alignment_eligible`. |
| R-BIL-011 Yes/No + SP selection | T-11 | DONE | `BilateralService.updateAlignment` with `has_contribution` + `lever_codes[]`. |
| R-BIL-012 Persistence + audit | T-11, T-12 | DONE | `result_review_history` row `POOL_FUNDING_ALIGNMENT_CHANGED`; Socket.IO event emitted post-transaction. |
| R-BIL-013 Authorization | T-04, T-11 | DONE | `ResultOwnerGuard` + `@Roles(...)`; spec covers each branch. |
| R-BIL-014 Edit regardless of status (AR.1) | T-11 | DONE | Endpoint has no `ResultStatusGuard`. |
| R-BIL-015 Read-only after PRMS sync (AR.2) | T-10, T-11 | DONE (backend semantics) | 409 returned when `is_synced_to_prms = true`; flag exposed in GET. |
| R-BIL-016 Not part of submission validator (AR.3) | T-11 | DONE | E2E asserts `SUBMITTED` transition with empty alignment. |

### 6.3 US3 — Display ToC indicators

| Req | Tasks | Status | Evidence |
| --- | --- | --- | --- |
| R-BIL-020 Grouped by SP | T-15 | DONE (pre-catalog behavior) | `BilateralService.listIndicators` returns groups; empty arrays until T-31 fills SP ToC catalog (explicit behavior). |
| R-BIL-021 Filter & search | T-15 | DONE (accepted as no-op pre-catalog) | `search`, `indicator-type` query params accepted; filtering applies once catalog populated. |
| R-BIL-022 Empty / stale catalog | T-15, T-18 | DONE | Stale mapped indicators surfaced with `is_active=false, is_mapped=true, is_stale=true`. |

### 6.4 US4 — Map results to indicators

| Req | Tasks | Status | Evidence |
| --- | --- | --- | --- |
| R-BIL-030 Select indicators | T-17 | DONE | POST contribution route; per-result mapping with `lever-code` + `indicator-code`. |
| R-BIL-031 Type-specific payload | T-16, T-17 | DONE (5 types; innovation-use deferred D5) | 5 handlers + sibling specs; handler interface in place. |
| R-BIL-032 Per-type validation | T-16, T-17 | DONE | Handler validates required fields; backend-compatible typos preserved (D12). |
| R-BIL-033 Audit on save/delete | T-17 | DONE | `result_review_history` `INDICATOR_MAPPING_CHANGED`; DELETE soft-deletes. |
| R-BIL-034 Read-only after sync | T-17 | DONE | 409 returned when `is_synced_to_prms = true`. |
| R-BIL-035 Stale flag on drift | T-18 | DONE (primitive) | `markIndicatorMappingsStale` + repo methods; T-31 will trigger from sync. |

### 6.5 US5 — Push to PRMS

| Req | Tasks | Status | Evidence |
| --- | --- | --- | --- |
| R-BIL-040 Trigger push on approval | T-24 (skeleton), T-26, T-27 | PARTIAL — skeleton only | `BilateralPushService.execute` is `NotImplementedException`; consumer wired on `bilateral.push.requested`. |
| R-BIL-041 PRMS-compatible payload | T-25 | BLOCKED | Mapper paused pending PRMS field-level contract. |
| R-BIL-042 Idempotency | T-26 | PENDING | Design specifies `sha1(result_code + version_id)`; not yet implemented. |
| R-BIL-043 Logging & metrics | T-26 | PENDING | Will hook into `sync_process_log` + CloudWatch (T-35). |
| R-BIL-044 Failure handling + admin retry | T-26, T-28 | PENDING | Admin retry endpoint + SSR page deferred. |
| R-BIL-045 Lock alignment & mapping on success | T-26, T-27 | PARTIAL | Backend honours `is_synced_to_prms` lock (R-BIL-015/034 already enforced); set-on-success path pending T-26. |

### 6.6 US6 — W3 Registry sync

| Req | Tasks | Status | Evidence |
| --- | --- | --- | --- |
| R-BIL-050 Scheduled pull | T-29 | PENDING (blocked T-22) | No `tools/w3-registry/` directory yet. |
| R-BIL-051 Apply tag diffs | T-29 | PENDING | |
| R-BIL-052 Sync logging & alerting | T-29 | PENDING | |
| R-BIL-053 Admin manual trigger + dry-run | T-30 | PENDING | |

### 6.7 US7 — SP ToC sync

| Req | Tasks | Status | Evidence |
| --- | --- | --- | --- |
| R-BIL-060 Scheduled pull | T-31 | PENDING (blocked upstream contract) | |
| R-BIL-061 Upsert with stable code | T-31 | PENDING | |
| R-BIL-062 Mark removed indicators inactive | T-31 | PENDING | |
| R-BIL-063 Admin manual trigger + dry-run | T-32 | PENDING | |

### 6.8 Non-functional

| Req | Status | Evidence / Notes |
| --- | --- | --- |
| NFR-BIL-001 Performance | DONE (Phase 1/2 endpoints) | `bilateral.e2e-spec.ts` includes 50-RPS p95 < 300 ms check on `listIndicators` (per `execution.md` T-15). Push p95 deferred until T-26 implemented. |
| NFR-BIL-002 Security | DONE for endpoints in scope | ROAR JWT + `RolesGuard` + `ResultOwnerGuard`; no logs of tokens/idempotency keys. Outbound auth (D-push-auth) pending T-21. |
| NFR-BIL-003 Reliability & atomicity | PARTIAL | `updateAlignment` is transactional. Sync jobs (T-29/T-31) + idempotency e2e (T-34) pending. |
| NFR-BIL-004 Observability | PARTIAL | `sync_process_log` rows used in T-07 path; CloudWatch dashboard (T-35) pending. |
| NFR-BIL-005 Accessibility | OUT-OF-SCOPE (STAR) | Covered by T-13/T-14/T-19 in STAR repo. |
| NFR-BIL-006 PRMS contract compatibility | PARTIAL | Backend-compatible typos preserved in handlers (D12); payload contract validated post T-25. |
| NFR-BIL-007 Maintainability | DONE | Coverage 95.32% statements on bilateral package; lint clean. |
| NFR-BIL-008 Auditability | DONE | `AuditableEntity` on all new entities; review history populated on alignment + mapping changes. |
| NFR-BIL-009 Idempotency | PENDING | T-34 e2e harness not yet built. |
| NFR-BIL-010 Localization | PENDING | UTF-8 + Spanish snapshot tests not yet added. |
| NFR-BIL-011 Rate limiting | PENDING | `express-rate-limit` on ingestion endpoint deferred until D15 inbound endpoint exists. |

**Coverage tally:** 22 requirements DONE, 4 PARTIAL, 12 PENDING, 2 BLOCKED, 4 OUT-OF-SCOPE (STAR).

---

## 7. Linting & Code Quality

- **ESLint:** scoped run across every directory touched by the spec — `domain/entities/bilateral/`, `domain/tools/bilateral-push/`, `domain/shared/guards/result-owner.guard.ts`, `domain/shared/decorators/result-owner.decorator.ts`, `domain/entities/result-review-history/`, `domain/entities/agresso-contract/`, `domain/tools/socket/server.gateway.ts`, `domain/shared/utils/env.utils.ts` → no errors.
- **Convention compliance (server CLAUDE.md §4):**
  - `@ApiTags('Bilateral')` + `@ApiBearerAuth()` on controller. ✓
  - Each handler decorated with `@ApiOperation` plus per-param `@ApiQuery` / `@ApiBody` / `@ApiParam` — 19 `@Api*` annotations on the controller. ✓
  - `RolesGuard` on the controller, `@Roles(...)` + `@ResultOwner()` + `ResultOwnerGuard` on mutation handlers. ✓
  - `ResultStatusGuard` correctly **omitted** on alignment endpoints (AR.1 / R-BIL-014). ✓
  - `RESULT_CODE` path token + `@GetResultVersion()` used. ✓
  - Responses wrapped via `ResponseUtils.format({ description, status, data })`. ✓
- **AuditableEntity:** every new entity (`ResultPoolFundingAlignment`, `ResultPoolFundingAlignmentSp`, `ResultPoolFundingIndicatorMapping`, `ResultReviewHistory`) extends `AuditableEntity`. ✓
- **OpenSearch decorators:** `is_pool_funding_contributor` on `AgressoContract` decorated with `@OpenSearchProperty({ type: 'boolean' })` and indexed (`idx_agresso_contract_pool_funding`). ✓
- **Logging:** `BilateralPushService` uses `LoggerUtil`. `BilateralService` does not log directly — relies on `ResponseInterceptor` / `GlobalExceptions` for error envelope logging; no `console.*` calls anywhere in the new code. ✓
- **Migrations:** append-only; one concern per file; forward + revert verified (per `execution.md`). ✓
- **Swagger sanity:** Bilateral tag declared; every new endpoint visible at `/swagger` per `execution.md` T-08/T-10/T-11/T-15/T-17. ✓
- **Coverage:** bilateral package well above the 60% global threshold (statements 95.32%, functions 93.10%, branches 73.83%). ✓

**Minor drifts (non-blocking):**
1. ~~DTOs collapsed into `bilateral-skeleton.dto.ts`~~ — **CLOSED 2026-05-19.** Split into `update-pool-funding-alignment.dto.ts`, `list-indicators-query.dto.ts`, `upsert-indicator-mapping.dto.ts`, `review-decision.dto.ts`. `push-retry.dto.ts` lands with T-28.
2. `bilateral/enum/` directory not created — `pool-funding-decision.enum.ts` / `review-decision.enum.ts` not yet introduced; current code uses inline booleans/strings. Intentionally deferred to T-27 (reviewer flow).
3. ~~`result-review-history.service.ts` not present~~ — **CLOSED 2026-05-19.** Design §4 updated to match the current "module + entity + repository only" pattern.
4. `bilateral-push.queue.consumer.ts` is named `bilateral-push.consumer.ts` (cosmetic).
5. `BilateralModule` is registered via `RouterModule` only — `app.module.ts` does not import it directly. This matches ARI's existing pattern for result sub-resources (see `capSharingChildren` etc.), so no change required.

---

## 8. Design Conformance

### 8.1 Architecture (design §3, §4)

- Module folder layout matches design §4 except for the gaps listed in §4 of this report — all gaps map 1:1 to pending tasks.
- Bilateral sits under `domain/entities/`, not `domain/tools/` — consistent with design §3 ("the bilateral module owns its own entities + its own service surface").
- External integrations isolated under `domain/tools/bilateral-push/`; future `w3-registry/` and `sp-toc-sync/` will follow the same pattern.

### 8.2 Data model (design §5)

- Schema deltas match design §5.1 exactly. Indexes match the documented `idx_<table>_<purpose>` convention. Status rows used ids 23/24/25 (next free ids), recorded as a decision in `execution.md` T-02 — not a deviation from design, which left the ids `TBC`.
- Workflow rows expanded across non-OICR `indicator_id`s 1/2/3/4/6 — schema-aware expansion of the logical D-status-1 transitions; explicit decision in `execution.md` T-02.
- D2 dedicated-table decision honoured (alignment + alignment-sp tables, not flagged join rows). Design §5.1.6 explicitly chose this path.
- D5 (innovation-use) deferred — `result_innovation_use_id` column omitted from `result_pool_funding_indicator_mapping`. Documented in `execution.md` T-03.

### 8.3 API design (design §6, requirements §9.1)

| Endpoint | Status |
| --- | --- |
| `PATCH /api/v1/agresso/contracts/:code/pool-funding-tag` | ✓ live |
| `GET /api/v1/agresso/contracts?pool-funding-contributor=…` | ✓ live |
| `GET /api/v1/results/:result-code/pool-funding-alignment` | ✓ live |
| `PATCH /api/v1/results/:result-code/pool-funding-alignment` | ✓ live |
| `GET /api/v1/results/:result-code/pool-funding-alignment/indicators` | ✓ live |
| `POST /api/v1/results/:result-code/pool-funding-alignment/indicators/:indicator-code/contribution` | ✓ live |
| `PATCH …/contribution` | ✓ live |
| `DELETE …/contribution` | ✓ live |
| `POST /api/v1/admin/sync/w3-registry` | ✗ pending (T-30) |
| `POST /api/v1/admin/sync/sp-toc` | ✗ pending (T-32) |
| `POST /api/v1/admin/bilateral/push/:result-code/retry` | ✗ pending (T-28) |
| `GET /api/v1/admin/bilateral/push-failures` | ✗ pending (T-28) |

All implemented endpoints honour the kebab-case query convention (`pool-funding-contributor`, `indicator-type`) per detailed-design conventions.

### 8.4 Real-time events (design §9.2, requirements §9.3)

- `result.pool-funding-alignment.changed` — ✓ implemented + documented in `socket/README.md`.
- `result.bilateral.push.succeeded` / `result.bilateral.push.failed` — pending T-26.
- `sync.w3-registry.completed` / `sync.sp-toc.completed` — pending T-29 / T-31.

### 8.5 Decision log alignment (design §15, requirements §10)

Decisions D1–D16 + D-status-1 + D-push-auth + D-push-trigger + D-source-w3 + D-cadence are all carried through into the implementation either as code paths (D2, D6, D7, D10, D12, D14, D-status-1) or as documented blockers (D-push-auth, D-source-w3, D-cadence, D5 deferred). No silent deviations detected.

### 8.6 Cross-cutting (design §10–§14)

- Workflows §10 (alignment edit, mapping save, review transition) implemented in `BilateralService` for Phase 1/2; status transition + push enqueue (T-27) pending.
- Security §11: authentication & roles match design; outbound PRMS auth deferred to T-21.
- Observability §12: `sync_process_log` rows wired in T-07; full dashboard pending T-35.
- Testing §13: unit + focused e2e coverage in place; idempotency + full e2e (T-33/T-34) pending.
- Rollout §14: feature flags wired; staged rollout playbook (T-37/T-38) pending.

**Section result:** PASS for the in-scope (Phase 0–2 backend + T-24 skeleton) surface. Outstanding items are explicit pending tasks, not silent design drifts.

---

## 9. Remediation

Items below are grouped by severity. None of these block the in-scope work that is already marked complete; they are the remaining gap between current state and full spec done-ness.

### 9.1 External blockers (cannot be unblocked in this repo)

1. **T-21 — Close `D-push-auth` with PRMS team.** Outbound auth (API key / machine token / mTLS / OAuth client-credentials) is undecided. Until closed, `T-25` mapper and `T-26` push service stay paused.
2. **T-22 — Close `D-source-w3` with System Office.** W3 Registry source (REST API / S3 drop / SharePoint / CSV) + AGRESSO mapping key are undecided. `T-29`/`T-30` blocked.
3. **T-23 — Close `OQ-US5-3` + `OQ-US5-6` with PRMS team.** Per-row error model + re-push semantics undecided. `T-26` retry/idempotency design depends on this.

### 9.2 Backend remediation (post-blocker)

4. **T-25 ResultToPrmsMapper** — once PRMS field-level payload contract arrives, implement pure mapper + fixture-based snapshot tests under `test/fixtures/prms-payload/`.
5. **T-26 Push service + queue consumer + retry cron** — implement deterministic idempotency key (`sha1(result_code + version_id)`), CloudWatch metric emissions, exponential backoff for 5xx/timeouts, permanent-failure for 4xx, success-side lock + `prms_result_code` persistence.
6. **T-27 Approve transition triggers push** — hook `BilateralService.reviewDecision` into `bilateral.push.requested` queue; cover re-review semantics (D7).
7. **T-29 W3 Registry sync module** — full sync service with diff/transactional apply + dry-run + `sync_process_log` + OpenSearch reindex.
8. **T-31 SP ToC sync module** — stable-code upsert, inactivate-on-absence, triggers `BilateralService.markIndicatorMappingsStale`.

### 9.3 Admin SSR remediation

9. **T-28 / T-30 / T-32 — Admin SSR pages** + corresponding `POST` endpoints under `/api/v1/admin/...` per `src/admin/README-REACT.md`. Add `admin-sync.controller.ts` + `admin-sync.service.ts`.

### 9.4 Quality / rollout remediation

10. **T-33 Full E2E suite** for every bilateral endpoint (auth-success/failure, role denial, AR.1 edit-in-Approved, AR.2 409 after sync, owner vs non-owner).
11. **T-34 Idempotency + failure-injection harness** — replay same idempotency key 3× and assert no duplicate state; cover 5xx / 4xx / timeout / 2xx paths.
12. **T-35 CloudWatch dashboard + alarms** — commit dashboard JSON under `docs/specs/bilateral-module/observability/dashboard.json`; alarm on push success rate < 95% / 1 hour.
13. **T-36 Runbook** as `docs/specs/bilateral-module/runbook.md`.
14. **T-37 Staging rollout + dry-runs**, then **T-38 Production rollout** per design §14 step order.
15. **NFR-BIL-009 / NFR-BIL-010 / NFR-BIL-011** — add idempotency e2e, Spanish-content snapshot tests, and `express-rate-limit` on the inbound ingestion endpoint when D15 is exercised.

### 9.5 Documentation / hygiene drifts (non-blocking)

16. ~~**DTO split.**~~ **CLOSED 2026-05-19.** `bilateral-skeleton.dto.ts` deleted; split into `update-pool-funding-alignment.dto.ts` (`UpdatePoolFundingAlignmentDto` + `AlignmentResponse` + `SelectedLeverResponse`), `list-indicators-query.dto.ts` (`ListIndicatorsQueryDto` + `IndicatorGroupResponse` + `IndicatorPanelIndicatorResponse`), `upsert-indicator-mapping.dto.ts` (`ContributionDto` + `MappingResponse`), and `review-decision.dto.ts`. `push-retry.dto.ts` deferred to T-28. Build, scoped ESLint, focused Jest (17 suites / 79 tests), and focused e2e (2 suites / 25 tests) all green after the move.
17. **Bilateral enums.** Create `bilateral/enum/pool-funding-decision.enum.ts` + `review-decision.enum.ts` when reviewer + decision flows land with T-27. Intentionally not created now to avoid placeholder-only files.
18. ~~**`result-review-history.service.ts`.**~~ **CLOSED 2026-05-19.** Design §4 updated to drop the service file and document the "module + entity + repository only" pattern; `BilateralService` writes via the repository directly.
19. **STAR FE coordination tickets (T-13/T-14/T-19).** These remain "pending — coordination ticket" in `tasks.md`. Track their resolution against the STAR repo and reflect status in the next spec sync.
20. **`tasks.md` and `execution.md` last-updated dates.** Both currently `2026-05-19`; refresh as new tasks complete so the validation timeline stays self-consistent.

**Total remediation items:** 20 (3 external blockers + 5 backend + 1 admin + 6 quality/rollout + 5 hygiene/docs). Two hygiene items closed 2026-05-19 (#16, #18); 18 remain.

---

## 10. Verdict

- **Phase 0–2 backend + T-24 push skeleton:** verified, conventions-compliant, tests + lint green. **PASS.**
- **Phase 3 integrations (US5 / US6 / US7):** mostly pending; three external blockers must close first. **BLOCKED / PENDING.**
- **Phase 4 quality + rollout:** entirely pending. **PENDING.**
- **STAR frontend coordination tasks (T-13 / T-14 / T-19):** out of scope for this repo; track in the STAR repo.

Overall: **PARTIAL** — the spec is on plan, with no silent design drift or undocumented deviations. Remaining work is fully enumerated in §9 and in `tasks.md` / `execution.md`.
