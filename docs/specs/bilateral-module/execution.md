# Execution — Bilateral module

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec id | 2026-05-bilateral-module |
| Module | bilateral-module |
| Execution started | 2026-05-19 |
| Last updated | 2026-05-19 |
| Current task | T-25 paused pending PRMS field-level payload contract; T-31 identified as the next backend-safe candidate |

## 2. Task Execution History

### T-01 — Schema: extend `agresso_contract`, `result`, `indicator`

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/db/migrations/1779190000001-addPoolFundingContributorTagToAgressoContract.ts`
  - `server/researchindicators/src/db/migrations/1779190000002-addIsSyncedToPrmsAndPrmsResultCodeToResults.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/entities/agresso-contract.entity.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/entities/agresso-contract.entity.spec.ts`
  - `server/researchindicators/src/domain/entities/results/entities/result.entity.ts`
  - `server/researchindicators/src/domain/entities/results/entities/result.entity.spec.ts`
  - `server/researchindicators/src/domain/entities/indicators/entities/indicator.entity.spec.ts`
  - `server/researchindicators/src/domain/shared/mappers/agresso-contract.mapper.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Used the actual table name `agresso_contracts` from the current entity/schema, while preserving the spec intent for the Pool Funding Contributor tag.
  - Did not create `addIsActiveToIndicator` because `indicators.is_active` already exists through `AuditableEntity` and `1726504510058-createdResultEntities.ts`.
  - Defaulted AGRESSO sync mapper output to `is_pool_funding_contributor: false` so newly pulled contracts satisfy the new non-null entity field without auto-tagging.
- **Issues encountered:**
  - Initial build failed because `AgressoContractMapper` constructed `AgressoContract` without the new required flag; fixed by setting the default `false` value.
  - `npm run lint` auto-fixed unrelated existing files because the project script uses `--fix`; those unrelated lint-only edits were reverted, and scoped ESLint was run on the T-01 files.
  - Existing worktree had unrelated `server/researchindicators/package-lock.json` changes and `server/researchindicators/nvm/` before the task; they were left untouched.
- **Verification result:**
  - `npm test -- --runTestsByPath src/domain/entities/agresso-contract/entities/agresso-contract.entity.spec.ts src/domain/entities/results/entities/result.entity.spec.ts src/domain/entities/indicators/entities/indicator.entity.spec.ts` passed: 3 suites, 7 tests.
  - `npm run build` passed.
  - `npm run migration:dev:execute` passed for both new migrations.
  - `npm run migration:revert` twice passed for both new migrations; `npm run migration:dev:execute` re-applied them successfully.
  - Scoped ESLint on all T-01 changed source files passed.
  - Full `npm test` passed: 267 suites, 1471 tests.

### T-02 — Schema: new statuses, workflow, `ReportingPlatform` row

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/db/migrations/1779190000003-addBilateralResultStatuses.ts`
  - `server/researchindicators/src/db/migrations/1779190000004-addBilateralResultStatusWorkflow.ts`
  - `server/researchindicators/src/db/migrations/1779190000005-addReportingPlatformBilateral.ts`
  - `server/researchindicators/src/domain/entities/result-status/enum/result-status.enum.ts`
  - `server/researchindicators/src/domain/entities/results/enum/reporting-platform.enum.ts`
  - `server/researchindicators/src/domain/entities/result-status-workflow/result-status-workflow.service.spec.ts`
  - `server/researchindicators/src/domain/entities/result-status-workflow/satus-graph.spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Used status ids 23, 24, and 25 because ids 1-22 are already occupied by existing ARI, PRMS, TIP, and AICCRA statuses.
  - Used current schema conventions: `result_status.result_status_id` numeric ids and `reporting_platforms.platform_code` / `platform_name`, instead of the older `code` / singular-table examples in the design prose.
  - Expanded the 5 logical bilateral transitions across current non-OICR workflow indicator ids 1, 2, 3, 4, and 6 because `result_status_workflow` is scoped by `indicator_id`.
- **Issues encountered:**
  - The combined three-step migration revert timed out during the final status-row revert after the first two T-02 migrations reverted. `migration:show` confirmed only `AddBilateralResultStatuses1779190000003` remained applied; rerunning `npm run migration:revert` with a longer timeout reverted it successfully.
  - Existing worktree had unrelated `server/researchindicators/package-lock.json` changes and `server/researchindicators/nvm/`; they were left untouched.
- **Verification result:**
  - `npx jest domain/entities/result-status-workflow/result-status-workflow.service.spec.ts domain/entities/result-status-workflow/satus-graph.spec.ts --runInBand` passed: 2 suites, 19 tests.
  - Scoped ESLint on all T-02 changed source files passed.
  - `npm run build` passed.
  - `npm run migration:dev:execute` passed for the 3 T-02 migrations.
  - `npm run migration:revert` passed for the 3 T-02 migrations; `npm run migration:dev:execute` re-applied them successfully.
  - `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts` shows all 3 T-02 migrations applied.
  - Full `npm test -- --runInBand` passed: 267 suites, 1473 tests.

### T-03 — Schema: new tables (alignment, mapping, review history)

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/db/migrations/1779190000006-createResultPoolFundingAlignment.ts`
  - `server/researchindicators/src/db/migrations/1779190000007-createResultPoolFundingAlignmentSp.ts`
  - `server/researchindicators/src/db/migrations/1779190000008-createResultPoolFundingIndicatorMapping.ts`
  - `server/researchindicators/src/db/migrations/1779190000009-createResultReviewHistory.ts`
  - `server/researchindicators/src/domain/entities/bilateral/`
  - `server/researchindicators/src/domain/entities/result-review-history/`
  - `server/researchindicators/src/domain/entities/results/entities/result.entity.ts`
  - `server/researchindicators/src/domain/entities/result-capacity-sharing/entities/result-capacity-sharing.entity.ts`
  - `server/researchindicators/src/domain/entities/result-knowledge-product/entities/result-knowledge-product.entity.ts`
  - `server/researchindicators/src/domain/entities/result-policy-change/entities/result-policy-change.entity.ts`
  - `server/researchindicators/src/domain/entities/result-innovation-dev/entities/result-innovation-dev.entity.ts`
  - `server/researchindicators/src/domain/entities/entities.module.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Created bilateral alignment, sub-practice alignment, indicator mapping, and review history as auditable TypeORM entities with matching migration audit columns.
  - Omitted `result_innovation_use_id` from the indicator mapping table because D5 defers innovation use support.
  - Used metadata-focused module specs instead of instantiating `TypeOrmModule` without a datasource.
- **Issues encountered:**
  - Existing worktree had unrelated `.gitignore`, `server/researchindicators/.gitignore`, `server/researchindicators/package-lock.json`, and `server/researchindicators/nvm/` changes; they were left untouched.
- **Verification result:**
  - Focused T-03 specs passed: 6 suites, 11 tests.
  - Scoped ESLint on all T-03 changed source files passed.
  - `npm run build` passed.
  - `npm run migration:dev:execute` passed for the 4 T-03 migrations.
  - `npm run migration:revert` passed for the 4 T-03 migrations; `npm run migration:dev:execute` re-applied them successfully.
  - `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts` shows all 4 T-03 migrations applied.
  - Full `npm test -- --runInBand` passed: 273 suites, 1484 tests.

### T-04 — Shared: `ResultOwnerGuard` + `@ResultOwner()` decorator

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/shared/guards/result-owner.guard.ts`
  - `server/researchindicators/src/domain/shared/guards/result-owner.guard.spec.ts`
  - `server/researchindicators/src/domain/shared/decorators/result-owner.decorator.ts`
  - `server/researchindicators/src/domain/entities/result-users/result-users.service.ts`
  - `server/researchindicators/src/domain/entities/result-users/result-users.service.spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Implemented `ResultOwnerGuard` as a shared Nest guard that should be composed with existing `@Roles(...)` + `RolesGuard` on owner-gated endpoints.
  - Preserved admin bypass for `SYSTEM_ADMIN` and `CENTER_ADMIN`, matching R-BIL-013.
  - Adapted the SDD ownership terms to the current schema: Creator uses `results.created_by`, contact uses active `result_users` main-contact rows mapped through staff/user email, and PI uses the existing primary-contract AGRESSO principal-investigator query.
  - Added `@ResultOwner()` metadata to allow future endpoints to restrict checks to a subset of `CREATOR`, `PI`, and `CONTACT`; default remains all three.
- **Issues encountered:**
  - Current `result_users` does not contain literal `CREATOR`, `PI`, or `CONTACT` roles, so the implementation reuses existing result metadata and relationship queries rather than adding schema.
  - Scoped ESLint initially reported formatting-only issues; fixed manually without running the repo `lint` script because it uses `--fix` across the project.
- **Verification result:**
  - `npx jest domain/shared/guards/result-owner.guard.spec.ts domain/entities/result-users/result-users.service.spec.ts --runInBand` passed: 2 suites, 23 tests.
  - `npm run build` passed.
  - Scoped ESLint on all T-04 changed source files passed.
  - Full `npm test -- --runInBand` passed: 274 suites, 1495 tests.

### T-05 — Module: `domain/entities/bilateral/` skeleton

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.module.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.module.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/dto/bilateral-skeleton.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/bilateral-indicator-type-handler.interface.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/noop.handler.ts`
  - `server/researchindicators/src/domain/routes/main.routes.ts`
  - `server/researchindicators/src/domain/routes/main.routes.spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Added the bilateral controller shell with `@ApiTags('Bilateral')`, `@ApiBearerAuth()`, `SetUpInterceptor`, and `RolesGuard`, but no endpoints yet.
  - Added `BilateralService` with the public method signatures from design §7.2 and explicit `NotImplementedException` stubs so downstream tasks can fill behavior incrementally.
  - Added the handler interface and a no-op handler skeleton for unsupported/deferred indicator types.
  - Registered the bilateral module under `/bilateral` in the main route tree and imported current dependencies that already exist in this repo.
  - Did not add `BilateralPushModule` yet because that module is introduced later by T-24.
- **Issues encountered:**
  - The Swagger assertion initially did not inspect real metadata; replaced it with direct checks against Nest Swagger metadata keys.
- **Verification result:**
  - `npx jest domain/entities/bilateral/bilateral.controller.spec.ts domain/entities/bilateral/bilateral.service.spec.ts domain/entities/bilateral/bilateral.module.spec.ts domain/routes/main.routes.spec.ts --runInBand` passed: 4 suites, 10 tests.
  - Scoped ESLint on all T-05 changed source files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 277 suites, 1504 tests.

### T-06 — Config: feature flags

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/shared/utils/env.utils.ts`
  - `server/researchindicators/src/domain/shared/utils/env.utils.spec.ts`
  - `server/researchindicators/.env.example`
  - `server/researchindicators/src/CLAUDE.md`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Added the four bilateral rollout toggles to the existing static `ENV` helper: module, push, W3 sync, and SP ToC sync.
  - Preserved the existing boolean parsing convention: only the exact env string `true` enables a flag; missing, `false`, or uppercase values evaluate to `false`.
  - Documented the toggles in `.env.example` and the server source guide.
- **Issues encountered:**
  - Scoped ESLint reported one formatting-only issue; fixed manually without running the repo `lint` script because it uses `--fix` across the project.
- **Verification result:**
  - `npx jest domain/shared/utils/env.utils.spec.ts --runInBand` passed: 1 suite, 4 tests.
  - Scoped ESLint on T-06 TypeScript files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 277 suites, 1506 tests.

### T-07 — AGRESSO contract service: pool funding tag

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.service.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.service.spec.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.module.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`
  - `server/researchindicators/src/domain/tools/open-search/agresso-contract/agresso-contract.opensearch.api.ts`
  - `server/researchindicators/src/domain/tools/open-search/agresso-contract/agresso-contract.opensearch.module.ts`
  - `server/researchindicators/src/domain/tools/open-search/agresso-contract/dto/agresso-contract.opensearch.dto.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Implemented `AgressoContractService.setPoolFundingTag(contractCode, value, user)` as a service-only operation; the HTTP endpoint remains deferred to T-08.
  - Interpreted the T-07 bilateral validation as `funding_type = 'BILATERAL'` and no active `pooled_funding_contracts` row, matching the current AGRESSO schema and avoiding tagging existing pooled-funding projects as contributors.
  - Added a minimal AGRESSO contract OpenSearch API/DTO so the service can trigger a contract-document reindex after the audit update.
  - Used explicit `NotFoundException` for missing contracts and `BadRequestException` for contracts that are not valid bilateral tag targets.
- **Issues encountered:**
  - Scoped ESLint reported formatting-only issues; fixed manually without running the repo `lint` script because it uses `--fix` across the project.
- **Verification result:**
  - `npm test -- agresso-contract.service.spec.ts agresso-contract.repository.spec.ts --runInBand` passed: 2 suites, 57 tests.
  - Scoped ESLint on all T-07 changed TypeScript files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 277 suites, 1512 tests.

### T-08 — Endpoint: `PATCH /api/v1/agresso/contracts/:code/pool-funding-tag`

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.controller.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.controller.spec.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/dto/pool-funding-tag.dto.ts`
  - `server/researchindicators/test/agresso-contract.e2e-spec.ts`
  - `server/researchindicators/test/app.e2e-spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Added `PATCH /api/v1/agresso/contracts/:code/pool-funding-tag` with method-level `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` and `RolesGuard` so existing AGRESSO read endpoints keep their current access behavior.
  - Added `PoolFundingTagDto` with `@IsBoolean()` validation and Swagger `@ApiBody` metadata.
  - Added a focused endpoint e2e test using a small isolated Nest test module rather than full `AppModule`, avoiding real database and external auth dependencies while covering happy path, 401, 403, and 400 payload validation.
  - Updated the existing `app.e2e-spec.ts` import/assertion after full e2e exposed stale test assumptions: `supertest` must be default-imported under the e2e ts-jest config, and `/` returns the current ARI envelope rather than `Hello World!`.
- **Issues encountered:**
  - Focused e2e initially failed to compile for the same `supertest` namespace-import issue that already existed in `app.e2e-spec.ts`; fixed with default imports.
  - `npm run test:e2e -- --runInBand` passed all assertions but did not exit because the existing full `AppModule` e2e setup leaves open handles, likely from imported cron/broker app-level resources. This is unrelated to the T-08 isolated endpoint e2e and should be handled as a separate test-infrastructure cleanup task.
- **Verification result:**
  - `npm test -- agresso-contract.controller.spec.ts agresso-contract.service.spec.ts --runInBand` passed: 2 suites, 32 tests.
  - `npm run test:e2e -- agresso-contract.e2e-spec.ts --runInBand` passed: 1 suite, 4 tests.
  - Scoped ESLint on all T-08 TypeScript files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 277 suites, 1516 tests.
  - `npm run test:e2e -- --runInBand` passed assertions for 2 suites / 5 tests but was not used as a completion gate because of the pre-existing full `AppModule` open-handle hang described above.

### T-09 — `GET /api/v1/agresso/contracts` extension: filter by tag

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.controller.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.controller.spec.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/dto/agresso-contract.dto.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/dto/mapper-agresso-contract.dto.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts`
  - `server/researchindicators/src/domain/entities/agresso-contract/agresso-contract.service.spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Added the `pool-funding-contributor=true|false` query parameter to both AGRESSO contract listing controller paths and documented it in Swagger.
  - Used an optional boolean parsing wrapper around the existing `QueryParseBool` so an omitted query parameter remains `undefined` instead of being interpreted as `false`.
  - Applied repository filters with strict boolean AND semantics using `ac.is_pool_funding_contributor = 1` or `0`, and preserved combination with existing filters.
  - Included `is_pool_funding_contributor` in AGRESSO contract mapping/query output so consumers can see the tag in list responses.
- **Issues encountered:**
  - Direct use of `QueryParseBool` would convert missing query values to `false`, which would unintentionally filter default list calls. The wrapper keeps missing values unset while still reusing the existing parser for provided values.
- **Verification result:**
  - `npm test -- agresso-contract.controller.spec.ts agresso-contract.service.spec.ts agresso-contract.repository.spec.ts --runInBand` passed: 3 suites, 75 tests.
  - Scoped ESLint on all T-09 TypeScript files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 277 suites, 1521 tests.

### T-10 — Endpoint: `GET /api/v1/results/:result-code/pool-funding-alignment`

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/dto/bilateral-skeleton.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-alignment.repository.ts`
  - `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-alignment.repository.spec.ts`
  - `server/researchindicators/src/domain/entities/results/repositories/result.repository.ts`
  - `server/researchindicators/src/domain/entities/results/repositories/result.repository.spec.ts`
  - `server/researchindicators/src/domain/routes/main.routes.ts`
  - `server/researchindicators/src/domain/routes/main.routes.spec.ts`
  - `server/researchindicators/test/bilateral.e2e-spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Registered the bilateral read endpoint as a results sub-resource: `/api/v1/results/:resultCode/pool-funding-alignment`, using the existing `RESULT_CODE` route token and `GetResultVersion` / `ResultsUtil` flow.
  - Implemented `BilateralService.getAlignment` as a read-only operation that combines result context, primary-contract pool-funding eligibility, active alignment, selected SP rows, and PRMS sync state.
  - Preserved the design response field `eligible` and also returned `has_pool_funding_alignment_eligible` from the requirements text so STAR can consume the section flag without another request.
  - Resolved selected SP names through `clarisa_levers.short_name`, falling back to the stored `lever_code` when CLARISA has no active row.
  - Hid saved alignment details when the primary contract is not tagged as a Pool Funding Contributor, matching the section-visibility rule.
- **Issues encountered:**
  - Scoped ESLint surfaced formatting-only issues in the touched files and a few nearby existing formatting issues in `result.repository.ts`; fixed manually without running the repo `lint` script because it uses `--fix` across the project.
- **Verification result:**
  - `npm test -- bilateral.service.spec.ts bilateral.controller.spec.ts result-pool-funding-alignment.repository.spec.ts result.repository.spec.ts main.routes.spec.ts --runInBand` passed: 5 suites, 52 tests.
  - `npm run test:e2e -- bilateral.e2e-spec.ts --runInBand` passed: 1 suite, 3 tests.
  - Scoped ESLint on all T-10 TypeScript files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 278 suites, 1534 tests.

### T-11 — Endpoint: `PATCH /api/v1/results/:result-code/pool-funding-alignment`

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/dto/bilateral-skeleton.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-alignment.repository.ts`
  - `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-alignment.repository.spec.ts`
  - `server/researchindicators/src/domain/entities/results/repositories/result.repository.ts`
  - `server/researchindicators/src/domain/entities/results/repositories/result.repository.spec.ts`
  - `server/researchindicators/src/domain/entities/result-review-history/entities/result-review-history.entity.ts`
  - `server/researchindicators/src/domain/entities/result-review-history/repositories/result-review-history.repository.ts`
  - `server/researchindicators/test/bilateral.e2e-spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Added the update endpoint on the same results sub-resource path with `RolesGuard` plus `ResultOwnerGuard`; contributors must own the result, while center and system admins keep the owner bypass from T-04.
  - Implemented `BilateralService.updateAlignment` as a TypeORM transaction that verifies eligibility, blocks edits after PRMS sync, soft-deletes active alignment/SP rows, inserts the replacement alignment and selected SP rows, and writes `result_review_history` with `POOL_FUNDING_ALIGNMENT_CHANGED`.
  - Required at least one nonblank `lever_codes` value when `has_contribution` is `true`; `has_contribution: false` clears the selected SPs.
  - Followed `D-snapshot-policy`: alignment edits do not create snapshots directly, even when the status is `BILATERAL_APPROVED`; snapshots remain tied to status transitions.
- **Issues encountered:**
  - Focused e2e initially failed to compile because the isolated test module used the real `ResultOwnerGuard` but did not provide `ResultUsersService`. Fixed by registering a mocked `ResultUsersService` so the e2e uses the real guard path without importing the full app graph.
  - Scoped ESLint reported formatting-only issues and one unused test import; fixed manually without running the repo `lint` script because it uses `--fix` across the project.
- **Verification result:**
  - `npm test -- bilateral.service.spec.ts bilateral.controller.spec.ts result-pool-funding-alignment.repository.spec.ts result.repository.spec.ts main.routes.spec.ts --runInBand` passed: 5 suites, 59 tests.
  - `npm run test:e2e -- bilateral.e2e-spec.ts --runInBand` passed: 1 suite, 7 tests.
  - Scoped ESLint on all T-11 TypeScript files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 278 suites, 1541 tests.

### T-12 — Socket.IO event: `result.pool-funding-alignment.changed`

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.spec.ts`
  - `server/researchindicators/src/domain/tools/socket/server.gateway.ts`
  - `server/researchindicators/src/domain/tools/socket/server.gateway.spec.ts`
  - `server/researchindicators/src/domain/tools/socket/README.md`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Added `ServerGateway.emitPoolFundingAlignmentChanged(...)` with the documented event name `result.pool-funding-alignment.changed` and payload `{ result_code, by_user_id, at }`.
  - Emitted the event only after `BilateralService.updateAlignment` completes the transaction and refreshes the returned alignment, so failed validation or persistence paths do not notify clients.
  - Documented the event payload in `domain/tools/socket/README.md`, matching the SDD §9.2 event taxonomy.
- **Issues encountered:**
  - The first focused unit run exposed a TypeScript cast issue in the service spec mock for `ServerGateway`; fixed by casting through `unknown` because the mock intentionally implements only the method used by `BilateralService`.
  - Scoped ESLint reported formatting-only issues in the new service spec assertions; fixed manually without running the repo `lint` script because it uses `--fix` across the project.
- **Verification result:**
  - `npm test -- bilateral.service.spec.ts server.gateway.spec.ts --runInBand` passed: 2 suites, 14 tests.
  - `npm run test:e2e -- bilateral.e2e-spec.ts --runInBand` passed: 1 suite, 7 tests.
  - Scoped ESLint on all T-12 TypeScript files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 279 suites, 1542 tests.

### T-15 — Endpoint: `GET /api/v1/results/:result-code/pool-funding-alignment/indicators`

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/dto/bilateral-skeleton.dto.ts`
  - `server/researchindicators/test/bilateral.e2e-spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Implemented `GET /api/v1/results/:resultCode/pool-funding-alignment/indicators` with the final response shape grouped by selected SPs.
  - Accepted `search` and `indicator-type` query parameters and passed them to the service contract, but treated them as no-ops until the local SP ToC catalog table/sync from T-31 exists.
  - Returned selected SP groups with empty `indicators` arrays as the explicit pre-T-31 behavior, rather than incorrectly reusing ARI result-type `indicators` as ToC catalog rows.
  - Returned an empty array when the alignment has no contribution / no selected SPs.
- **Issues encountered:**
  - The T-15 spec expects a local ToC indicator catalog keyed by `lever_code + indicator_code`, but the current schema only has ARI result-type `indicators` and the result mapping table; the user selected the empty-group pre-catalog behavior.
  - The first 50-concurrent focused e2e check failed with `ECONNRESET` because parallel `supertest(app.getHttpServer())` calls against a non-listening in-memory Nest server race connection setup. The isolated e2e app now listens on an ephemeral port before issuing parallel requests.
- **Verification result:**
  - `npm test -- bilateral.service.spec.ts bilateral.controller.spec.ts --runInBand` passed: 2 suites, 24 tests.
  - `npm run test:e2e -- bilateral.e2e-spec.ts --runInBand` passed: 1 suite, 9 tests, including the 50-request p95 check under 300 ms.
  - Scoped ESLint on all T-15 TypeScript files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 279 suites, 1546 tests.

### T-16 — Type-specific indicator handlers

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.module.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.module.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/dto/bilateral-skeleton.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/bilateral-indicator-type-handler.interface.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/capacity-sharing.handler.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/capacity-sharing.handler.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/innovation-development.handler.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/innovation-development.handler.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/knowledge-product.handler.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/knowledge-product.handler.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/noop.handler.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/noop.handler.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/policy-change.handler.ts`
  - `server/researchindicators/src/domain/entities/bilateral/handlers/policy-change.handler.spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Added five handlers: capacity sharing, knowledge product, policy change, innovation development, and no-op for other output/outcome. Innovation use remains skipped per D5.
  - Registered the handlers in `BilateralModule` alongside the existing result-type modules they delegate to.
  - Preserved backend-compatible field names from D12, including `has_unkown_using` and `readinness_level_id`.
  - Kept handlers thin: they validate required fields, ensure the existing ARI result-type row exists through the relevant service `create`, delegate update to the existing service, and return the mapping FK field/id for T-17.
  - Knowledge product support is intentionally partial for Phase 2 and maps available fields into the current `ResultKnowledgeProductService.update` contract.
- **Issues encountered:**
  - Existing result-type update methods generally open their own transactions, while the T-17 mapping workflow will also need transactional behavior. T-16 therefore keeps delegation minimal and leaves full transaction orchestration to T-17.
  - Scoped ESLint reported formatting-only issues in the new handler files/specs; fixed manually without running the repo `lint` script because it uses `--fix` across the project.
- **Verification result:**
  - `npm test -- capacity-sharing.handler.spec.ts knowledge-product.handler.spec.ts policy-change.handler.spec.ts innovation-development.handler.spec.ts noop.handler.spec.ts bilateral.module.spec.ts --runInBand` passed: 6 suites, 16 tests.
  - Scoped ESLint on all bilateral TypeScript files passed.
  - `npm run build` passed.
   - Full `npm test -- --runInBand` passed: 284 suites, 1560 tests.

### T-17 — Endpoints: contribution `POST` / `PATCH` / `DELETE`

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/dto/bilateral-skeleton.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-indicator-mapping.repository.ts`
  - `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-indicator-mapping.repository.spec.ts`
  - `server/researchindicators/test/bilateral.e2e-spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Added contribution create, update, and delete endpoints under `/api/v1/results/:resultCode/pool-funding-alignment/indicators/:indicatorCode/contribution`, protected by `RolesGuard` and the real `ResultOwnerGuard` path in focused e2e.
  - Required `?lever-code=...` on contribution mutations because the current route does not include the selected SP and the local SP ToC catalog from T-31 does not exist yet.
  - Validated that the requested lever is part of the active alignment before persisting the mapping.
  - Implemented `BilateralService.upsertContribution` and `deleteContribution` so upsert soft-deletes the previous active mapping, stores the handler-produced result-type FK, and writes `result_review_history` with `INDICATOR_MAPPING_CHANGED`.
  - Preserved post-sync immutability by returning 409 when `is_synced_to_prms` is true.
- **Issues encountered:**
  - The current schema has no local ToC indicator catalog keyed by `lever_code + indicator_code`; endpoint validation therefore uses the active alignment plus the caller-supplied `lever-code` until T-31 introduces the catalog.
  - Focused e2e continues to use an isolated Nest app and mocked dependencies to avoid the pre-existing full `AppModule` open-handle hang.
- **Verification result:**
  - `npm test -- bilateral.service.spec.ts bilateral.controller.spec.ts result-pool-funding-indicator-mapping.repository.spec.ts --runInBand` passed: 3 suites, 35 tests.
  - `npm run test:e2e -- bilateral.e2e-spec.ts --runInBand` passed.
  - Scoped ESLint on T-17 changed TypeScript files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 285 suites, 1571 tests.

### T-18 — Stale-flag logic on catalog drift

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-indicator-mapping.repository.ts`
  - `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-indicator-mapping.repository.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral/repositories/result-pool-funding-indicator-mapping.repository.integration.spec.ts`
  - `server/researchindicators/test/bilateral.e2e-spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Implemented the stale-flag primitive without creating the future SP ToC catalog from T-31.
  - Added `BilateralService.markIndicatorMappingsStale(leverCode, indicatorCode, user?)` for T-31 to call when a synced catalog indicator becomes inactive.
  - Added repository methods to mark active non-stale mappings stale and to read active stale mappings by result and selected levers.
  - Updated `listIndicators` so selected SP groups include existing stale mapped indicators with `is_active: false`, `is_mapped: true`, and `is_stale: true` even before the local ToC catalog exists.
  - Kept `search` and `indicator_type` filtering for stale mapped rows so the endpoint behavior remains compatible with T-15.
- **Issues encountered:**
  - The configured TEST datasource variables exist through `.env`, but the database connection timed out from this workspace (`connect ETIMEDOUT`).
  - Added the TEST datasource integration spec as opt-in via `ARI_RUN_DB_INTEGRATION=true` so CI or a connected local environment can execute it without blocking normal unit runs.
- **Verification result:**
  - `npm test -- bilateral.service.spec.ts result-pool-funding-indicator-mapping.repository.spec.ts result-pool-funding-indicator-mapping.repository.integration.spec.ts --runInBand` passed: 2 suites / 30 tests, 1 opt-in DB integration suite skipped.
  - `npm run test:e2e -- bilateral.e2e-spec.ts --runInBand` passed: 1 suite / 14 tests.
  - Scoped ESLint on T-18 changed TypeScript files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 285 suites / 1579 tests, 1 opt-in DB integration suite skipped.

### T-20 — Phase 2 e2e + coverage pass

- **Status:** completed
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/test/bilateral.e2e-spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Treated T-20 as a Phase 2 backend quality gate, not new product behavior.
  - Expanded the isolated bilateral e2e suite rather than importing full `AppModule`, preserving the existing strategy that avoids cron/broker open handles.
  - Added e2e coverage for stale indicator read exposure, all current contribution handler types (`capacity_sharing`, `knowledge_product`, `policy_change`, `innovation_development`, and `NOOP`), contribution update/delete, owner denial, validation failure, PRMS-sync conflict, and missing mapping delete.
  - Verified bilateral package coverage directly from `coverage/coverage-final.json` after `npm run test:cov`.
- **Issues encountered:**
  - Scoped ESLint caught formatting in the new parameterized e2e test; fixed manually without running the repo `lint` script because it uses `--fix` across the project.
  - Full `npm run test:e2e -- --runInBand` remains excluded as a completion gate because the existing `test/app.e2e-spec.ts` imports full `AppModule`, which leaves open handles unrelated to Phase 2 bilateral behavior.
- **Verification result:**
  - `npm run test:e2e -- bilateral.e2e-spec.ts --runInBand` passed: 1 suite / 21 tests.
  - Scoped ESLint on bilateral source files and `test/bilateral.e2e-spec.ts` passed.
  - `npm run build` passed.
  - `npm run test:cov -- --runInBand` passed global coverage thresholds: 285 suites / 1579 tests, 1 opt-in DB integration suite skipped.
  - Bilateral package coverage from `coverage/coverage-final.json`: statements 95.32%, functions 93.10%, branches 73.83%.
  - Full `npm test -- --runInBand` passed: 285 suites / 1579 tests, 1 opt-in DB integration suite skipped.

### T-24 — Push module skeleton

- **Status:** completed — skeleton only
- **Date:** 2026-05-19
- **Files changed:**
  - `server/researchindicators/src/domain/tools/bilateral-push/bilateral-push.constants.ts`
  - `server/researchindicators/src/domain/tools/bilateral-push/bilateral-push.module.ts`
  - `server/researchindicators/src/domain/tools/bilateral-push/bilateral-push.module.spec.ts`
  - `server/researchindicators/src/domain/tools/bilateral-push/bilateral-push.service.ts`
  - `server/researchindicators/src/domain/tools/bilateral-push/bilateral-push.service.spec.ts`
  - `server/researchindicators/src/domain/tools/bilateral-push/bilateral-push.connection.ts`
  - `server/researchindicators/src/domain/tools/bilateral-push/bilateral-push.connection.spec.ts`
  - `server/researchindicators/src/domain/tools/bilateral-push/bilateral-push.consumer.ts`
  - `server/researchindicators/src/domain/tools/bilateral-push/bilateral-push.consumer.spec.ts`
  - `server/researchindicators/src/domain/tools/bilateral-push/dto/bilateral-push.dto.ts`
  - `server/researchindicators/src/app-microservice.module.ts`
  - `server/researchindicators/src/app-microservice.module.spec.ts`
  - `docs/specs/bilateral-module/tasks.md`
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Implemented T-24 as a safe skeleton despite T-21/T-23 remaining unresolved, per user approval.
  - Added `BilateralPushModule` under `domain/tools/bilateral-push/` with service, connection, queue consumer, DTOs, constants, and module metadata tests.
  - Registered the module in `AppMicroserviceModule` so the RMQ microservice can discover `bilateral.push.requested` handlers.
  - Used `@EventPattern('bilateral.push.requested')` for the queue consumer because T-27 will enqueue fire-and-forget push requests.
  - Left `BilateralPushConnection.send(...)` as `NotImplementedException` until T-21/T-23 close PRMS auth/error contracts.
  - Left `BilateralPushService.execute(...)` as `NotImplementedException` until T-26 implements mapper, idempotency, sync log writes, retry classification, and result locking.
  - Honored `ARI_BILATERAL_PUSH_ENABLED`: disabled pushes return a skipped response without invoking deferred execution.
- **Issues encountered:**
  - Existing broker emit helper serializes messages to JSON strings, while Nest RMQ handlers may also receive object payloads. The consumer accepts both and rejects invalid JSON with `BadRequestException`.
  - Focused service test emits a warning for the disabled feature flag path; this is expected behavior.
- **Verification result:**
  - `npm test -- bilateral-push.module.spec.ts bilateral-push.consumer.spec.ts bilateral-push.service.spec.ts bilateral-push.connection.spec.ts app-microservice.module.spec.ts --runInBand` passed: 5 suites / 10 tests.
  - Scoped ESLint on T-24 files passed.
  - `npm run build` passed.
  - Full `npm test -- --runInBand` passed: 290 suites / 1589 tests, 1 opt-in DB integration suite skipped.

### T-25 — `ResultToPrmsMapper` + payload-shape tests

- **Status:** paused / blocked by missing external contract
- **Date:** 2026-05-19
- **Files changed:**
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Assessed the available local PRMS context before implementing any mapper code.
  - Found that the local docs describe the high-level DTO concepts and compatibility rules, but the field-level PRMS payload contract referenced by the task (`bilateral-result-summaries.en.md`) is not present in this repository.
  - Paused T-25 rather than inventing outbound PRMS fields or snapshot expectations.
  - User selected the safe path: wait for the missing PRMS field-level payload contract/schema before implementing `ResultToPrmsMapper`.
- **Issues encountered:**
  - T-25 depends on the exact `RootResultsDto` / bilateral result summary shape and cannot be completed from the summary docs alone without creating integration contract risk.
  - T-26, T-27, T-28, T-33, and T-34 remain blocked by T-25 and the unresolved T-21/T-23 PRMS auth/error/retry decisions.
- **Verification result:**
  - No code was changed and no tests were run for T-25.
  - Blocker recorded here so downstream Phase 3 implementation remains gated until the PRMS field-level contract is supplied.

### Next-task triage — T-31 SP ToC sync module

- **Status:** assessed; implementation not started
- **Date:** 2026-05-19
- **Files changed:**
  - `docs/specs/bilateral-module/execution.md`
- **Decisions made:**
  - Reviewed the Phase 3 dependency graph after T-25 was paused. T-26 through T-28 remain blocked by PRMS decisions, and T-29 remains blocked by the unresolved AGRESSO/W3 mapping key from T-22.
  - Identified T-31 as the next potentially backend-safe task because D3 is recorded as CLARISA-sourced, lever-only Phase 1 in the bilateral design.
  - Confirmed the existing T-15/T-17/T-18 behavior deliberately left a local SP ToC catalog gap for T-31: indicator listing returns selected SP groups with empty arrays, contribution mutations rely on `?lever-code=...`, and stale mapping primitives already exist.
  - Confirmed existing CLARISA code has levers but no CLARISA indicator entity, so T-31 will need a local SP ToC catalog table/cache and a typed upstream snapshot contract rather than reusing ARI's generic `indicators` table.
- **Issues encountered:**
  - The authoritative SP ToC upstream row shape is still not present in code. A safe T-31 implementation should define a local DTO/cache contract based only on confirmed CLARISA/ToC fields, or pause if the upstream payload is unavailable.
  - Existing cron patterns are uneven: `TipCron` and `SyncProcessLogCron` are registered, while existing `clarisa.cron.ts` and `agresso.cron.ts` are not registered in `CronModule`. T-31 should avoid copying unregistered cron patterns.
- **Verification result:**
  - No code was changed and no tests were run for T-31.
  - Exploration result: if the SP ToC source payload is confirmed, implement `domain/tools/sp-toc-sync/` plus a local bilateral catalog entity/repository, then wire `BilateralService.listIndicators` and contribution validation to that catalog.

## 3. Summary When All Tasks Are Complete

Pending. Phase 0 is complete, Phase 1 backend tasks T-07 through T-12 are complete, and Phase 2 backend tasks T-15 through T-18 plus T-20 are complete. T-24 Phase 3 skeleton is complete. T-25 is paused until the PRMS field-level payload contract is provided. T-13, T-14, and T-19 are STAR frontend coordination tasks and remain omitted for this repo. T-21, T-22, and T-23 are still external decision blockers before real Phase 3 PRMS integrations can run. T-31 is the next backend-safe candidate only if the SP ToC upstream payload shape is confirmed.
