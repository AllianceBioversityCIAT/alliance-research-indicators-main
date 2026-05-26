# Execution log — Bilateral / Pending items (v2)

- **Module:** bilateral
- **Spec id:** 2026-05-bilateral-pending-items
- **Linked spec:** [`./requirements.md`](./requirements.md) · [`./design.md`](./design.md) · [`./tasks.md`](./tasks.md)
- **Branch:** `AC-1594-bilateral-module-v2`
- **Started:** 2026-05-25

---

## Task execution history

### [x] T-15.13 — Migration + entity for `bilateral_project_mapping`

- **Date:** 2026-05-25
- **Requirements covered:** R-BIL-079
- **Files added:**
  - `server/researchindicators/src/db/migrations/1779190000011-createBilateralProjectMapping.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/entities/bilateral-project-mapping.entity.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/enum/mapping-source.enum.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/repositories/bilateral-project-mapping.repository.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.module.ts`
- **Decisions made:**
  - Implemented D-PI-9 (MySQL partial-unique) via a STORED GENERATED column `active_agreement_id = IF(is_active = 1, agresso_agreement_id, NULL)` plus a UNIQUE index `uk_bpm_active_agreement` on that column. The generated column is intentionally NOT mapped on the TypeORM entity (TypeORM would otherwise try to write to it).
  - `BilateralProjectMappingModule` is minimal at this task — only registers the entity + repository. The service + controller arrive in T-15.14. Module is NOT yet imported into `AppModule`, so no DI graph change to verify yet.
  - `AuditableEntity` already provides `created_at / created_by / updated_at / updated_by / is_active / deleted_at`, so the entity defines only the bilateral-specific columns.
- **Issues encountered:** none.
- **Verification:**
  - `npx tsc --noEmit -p tsconfig.build.json` → clean.
  - `npm run migration:dev:execute` → applied as `CreateBilateralProjectMapping1779190000011`.
  - `SHOW INDEXES FROM bilateral_project_mapping` confirms `uk_bpm_active_agreement` (UNIQUE), `idx_bpm_agreement`, `idx_bpm_clarisa_project`, plus PRIMARY.
  - **Partial-unique exercise** (manual MySQL session):
    1. Insert active row for `agresso_agreement_id='T-15.13-TEST'` → ✓
    2. Insert second active row for same id → `ERROR 1062 Duplicate entry 'T-15.13-TEST' for key 'uk_bpm_active_agreement'` ✓
    3. Deactivate first row (`is_active=0`) → `active_agreement_id` becomes NULL ✓
    4. Insert replacement active row for same id → ✓ (final state: one inactive `id=1`, one active `id=3`, both preserved)
  - `npm run migration:revert` → table dropped cleanly.
  - `npm run migration:dev:execute` re-apply → ✓ (idempotent).
  - `npx eslint --fix` on new files → clean.
- **Status:** [x] completed
- **Commit:** `8b59a099`

---

### [x] T-15.14 — `BilateralProjectMappingService` + controller + DTOs

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-080 (REST surface) + R-BIL-078 (lookup helper)
- **Files added:**
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.service.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.controller.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.controller.spec.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/dto/create-bilateral-project-mapping.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/dto/update-bilateral-project-mapping.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/dto/list-bilateral-project-mappings.query.dto.ts`
- **Files modified:**
  - `server/researchindicators/src/domain/entities/bilateral-project-mapping/bilateral-project-mapping.module.ts` (registers controller + service)
  - `server/researchindicators/src/domain/entities/entities.module.ts` (imports + exports `BilateralProjectMappingModule`)
  - `server/researchindicators/src/domain/routes/main.routes.ts` (registers the new sub-resource at `/api/bilateral-project-mappings`)
- **Decisions made:**
  - Service is singleton-scoped (per parent design.md §3.4 Constraint A and design D-PI-8); receives the `User` from controller via `@Req()`, not from `CurrentUserUtil`.
  - `create` runs inside `dataSource.transaction` with `setLock('pessimistic_write')` on the active-row lookup → 409 ConflictException is deterministic; the DB-level partial-unique (D-PI-9) remains as the safety net.
  - `update` intentionally does NOT allow changing `agresso_agreement_id` — operators deactivate and re-create instead (preserves audit history).
  - `deactivate` is idempotent: calling it on an already-inactive row returns the row without re-writing.
  - Controller does NOT use `SetUpInterceptor` (would require `ResultsUtil`, which is REQUEST-scoped and unnecessary here — admin endpoints have no `:resultCode` token).
- **Issues encountered → Pivot Record #1.**
- **Verification:**
  - Typecheck: `npx tsc --noEmit -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/domain/entities/bilateral-project-mapping` → **21/21 passing** (service: 13 covering R-BIL-078 lookup + R-BIL-080 create/409/update/deactivate/list with filters; controller: 8 covering role-gate metadata + handler delegation + 201/200 envelopes).
  - Lint: `npx eslint --fix` → clean.
  - Boot: Nest application successfully started; all 5 routes registered at `/api/bilateral-project-mappings[/...]`.
  - **End-to-end smoke** via `Authorization: bypass` (SYSTEM_ADMIN injected):
    1. `/api/v2/results` → 200 (DI gate green).
    2. `POST /api/bilateral-project-mappings` → 201 with audit fields populated.
    3. Duplicate `POST` same `agresso_agreement_id` → 409 with `"Active mapping already exists for this contract"`.
    4. `GET` with search → returns the row + paginated `meta`.
    5. `PATCH /:id/deactivate` → 200, `is_active:false`, `deleted_at` set, `notes` recorded.
    6. `POST` again after deactivate → 201 (partial-unique slot freed).
    7. DB cleanup.
- **Status:** [x] completed
- **Commit:** `b7bdc237`

---

### [x] T-15.10 — `ClarisaProjectsService` tool + 5-min cache

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-076 (data source) + NFR-BIL-073 (upstream resilience)
- **Files added:**
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.module.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.service.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/clarisa-projects.service.spec.ts`
  - `server/researchindicators/src/domain/tools/clarisa/projects/dto/clarisa-project.types.ts`
- **Decisions made:**
  - Reused the existing `Clarisa` connection class (`src/domain/tools/clarisa/clarisa.connection.ts`) — it already handles the CLARISA Bearer-token flow via `auth/login`. My probe earlier used Basic auth (which CLARISA also accepts), but Bearer matches the rest of the codebase; no need to introduce a second auth path.
  - Service is singleton-scoped (per parent design.md §3.4 Constraint A and design D-PI-7) — no `CurrentUserUtil` / `ResultsUtil`. The picker hot path can call this freely without re-introducing the empty-shell DI cycle.
  - Cache: in-memory `{data, fetchedAt}`, TTL 5 min, no event invalidation (per D-PI-12). Project↔SP changes are rare; admin refresh endpoint is a future enhancement.
  - Resilience (per NFR-BIL-073): warm-cache-serve-on-error keeps the picker working during short CLARISA hiccups; cold-cache → `ServiceUnavailableException` so the response envelope is a clean 503 instead of leaking an upstream stack trace.
  - Added `resetCacheForTests()` test seam — lets specs reset cache between cases without waiting 5 minutes. Marked non-public in the JSDoc.
  - Stubbed the internal `connection` field directly in the service spec (rather than mocking the entire `HttpService` axios chain). Cleaner test, focuses assertions on caching + resilience.
- **Issues encountered:** none.
- **Verification:**
  - Typecheck `tsc -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/domain/tools/clarisa/projects` → **7/7 passing** (bilateral filter, cache hit, findProjectById happy / not-found / NaN-id short-circuit, warm-cache-serve-on-error, cold-503).
  - Lint: `npx eslint --fix` → clean.
  - Live wiring not exercised here (module isn't imported into any consumer yet). Will be exercised end-to-end in T-15.11 (per-result SP endpoint) and T-15.15 (admin SSR project picker).
- **Status:** [x] completed
- **Commit:** `f9f6f851`

---

### [x] T-15.11 — `GET .../pool-funding-alignment/science-programs` endpoint + service

- **Date:** 2026-05-26
- **Requirements covered:** R-BIL-076 (per-result SP endpoint) + R-BIL-078 (result→project resolution)
- **Files added:**
  - `server/researchindicators/src/domain/entities/bilateral/dto/bilateral-science-programs.response.dto.ts`
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.getScienceProgramsForResult.spec.ts` (focused-scope spec; full bilateral.service spec lands in T-15.6)
- **Files modified:**
  - `server/researchindicators/src/domain/entities/results/repositories/result.repository.ts` — extended `PoolFundingAlignmentContext` with `agresso_agreement_id` and `platform_code`; extended the SQL to project both. `platform_code` is added now so T-15.2 can reuse the same context lookup.
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts` — new method `getScienceProgramsForResult(resultId, resultCode)` chains result → agreement_id → `BilateralProjectMappingService.findActiveByAgreementId` → `ClarisaProjectsService.findProjectById` → filter (Confirmed + activePortfolio) → enrich from local catalog. Sorted by code.
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.ts` — new `@Get('science-programs')` under existing controller (lands at `/api/v1/results/:resultCode/pool-funding-alignment/science-programs`).
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.module.ts` — imports `ClarisaProjectsModule` + `BilateralProjectMappingModule`.
  - `server/researchindicators/src/domain/shared/utils/env.utils.ts` — new `ENV.BILATERAL_ACTIVE_PORTFOLIO` getter (default `"P25"`, env-driven via `ARI_BILATERAL_ACTIVE_PORTFOLIO`).
- **Decisions made:**
  - "Unmapped" covers three cases: (a) result has no AGRESSO contract, (b) no active row in `bilateral_project_mapping`, (c) mapping points at a project CLARISA no longer exposes. All return 200 with `mapping_status: "unmapped"` + empty `science_programs`. Case (c) also surfaces the snapshot `clarisa_project` so ops can spot drift.
  - Active-portfolio filter is env-driven, not hard-coded. Default `"P25"` matches the current 2025–2030 portfolio. When the next portfolio rolls out, ops flips one env var, no code change.
  - `icon_key` is sourced from the local catalog `clarisa_science_programs.icon_key`, which doesn't exist yet (T-15.4 ships it). For now the field is always `null`; T-15.4 just adds the column + seeds it. The response shape is stable either way.
  - Sorted `science_programs[]` by code (`SP01 → SP13`) so the FE picker is deterministic regardless of CLARISA's mapping array order.
- **Issues encountered → Pivot Record #2.**
- **Verification:**
  - Typecheck `tsc -p tsconfig.build.json` → clean.
  - Unit: `npx jest src/domain/entities/bilateral/bilateral.service.getScienceProgramsForResult` → **8/8 passing** (404, unmapped-no-contract, unmapped-no-row, unmapped-stale-project, mapped-happy, non-Confirmed filter, multi-portfolio filter, deterministic sort).
  - Lint clean.
  - Nest boot: route registered at `/api/v1/results/:resultCode(\d+)/pool-funding-alignment/science-programs` (version 1). DI gate `/api/v2/results` → 200.
  - **Live end-to-end smoke against CSICAP (result 19792, AGRESSO contract D527):**
    1. Pre-mapping → `mapping_status: "unmapped"`, empty list, 200 ✓
    2. Created mapping `D527 → CLARISA project 1` (T-PJ-003262, IITA, Nigeria) via `POST /api/bilateral-project-mappings` → 201
    3. Re-fetch → `mapping_status: "mapped"`, `clarisa_project.short_name` populated from CLARISA, `science_programs: [SP09 25%, SP10 75%]` with colors enriched from local catalog (#ec4899, #8b5cf6). EXACTLY what CLARISA defines for that project. ✓
    4. Mapping row cleaned up.
- **Status:** [x] completed
- **Commit:** `92e2fd52`

---

## Pivot Record #2 — Endpoint URL path uses existing controller namespace

- **Task affected:** T-15.11 (also retroactively updates R-BIL-076 + R-BIL-077 + design.md §6.1–6.2 + architecture mermaid + frontend-handoff §4.6–4.7)
- **Date:** 2026-05-26
- **Discovery:** Design.md §6.1 idealized the endpoint URL as `/api/v1/results/:resultCode/bilateral/science-programs`. The existing `BilateralController` is mounted in `main.routes.ts` at `${RESULT_CODE}/pool-funding-alignment`, so adding a `@Get('science-programs')` handler lands at `/api/v1/results/:resultCode/pool-funding-alignment/science-programs`. Moving to a `/bilateral/...` namespace would require either (a) splitting the controller into two and mounting them at different routes, or (b) a major route refactor of existing endpoints (`pool-funding-alignment`, `pool-funding-alignment/indicators`).
- **Alternatives considered:**
  1. **Refactor: split the controller in two**, mount the new one at `bilateral/`. Pros: matches the idealized URL. Cons: doubles surface area; existing `pool-funding-alignment` controller stays; new `bilateral/` controller would have to re-import `ResultsUtil` for the same `:resultCode` token. Net negative.
  2. **Accept existing namespace** (`pool-funding-alignment/`). Pros: zero refactor; sibling to existing `pool-funding-alignment/indicators` which is also a picker source; consistent URL design. Cons: spec deviation.
- **Decision:** Option 2. The URL design intent in design.md was idealized without checking the existing controller path. The implementation should match the existing convention — `pool-funding-alignment/science-programs` reads naturally alongside `pool-funding-alignment/indicators` (both are picker sources for the same alignment workflow). Same applies to the future T-15.12 (`pool-funding-alignment/hlos-indicators`).
- **Spec impact:**
  - `requirements.md` — R-BIL-076 + R-BIL-077 paths updated.
  - `design.md` — §6.1 + §6.2 + architecture mermaid updated.
  - `tasks.md` — T-15.11 + T-15.12 path updated.
  - `frontend-handoff.md` — pending T-15.8 doc update will reflect the new path; STAR FE consumes `/api/v1/results/:resultCode/pool-funding-alignment/science-programs` (and similarly for HLOs in T-15.12).
- **Verification after pivot:** Live smoke against CSICAP green at the new path (see T-15.11 verification above).

---

## Pivot Record #1 — Admin REST surface URL path

- **Task affected:** T-15.14 (also retroactively updates R-BIL-080 + design.md §6.3–6.6 + architecture mermaid)
- **Date:** 2026-05-26
- **Discovery:** During the T-15.14 end-to-end smoke, the role-gated endpoints at `/api/admin/bilateral-project-mappings` returned `403 Forbidden` for every request — even with the local-dev SYSTEM_ADMIN bypass. Root cause: NestJS's `JwtMiddleware` exclude pattern `/admin(.*)` (in `src/app.module.ts`) is evaluated against the URL stripped of the global `/api/` prefix, so it matched the new admin REST endpoints AND the existing SSR admin pages. The bypass middleware never ran on our routes → `request.user` was undefined → `RolesGuard` returned 403.
- **Alternatives considered:**
  1. **Narrow the JWT exclude pattern** to explicitly list the SSR routes (`/admin`, `/admin/dashboard`, `/admin/users`, `/admin/settings`). Pros: keeps URL as spec'd. Cons: changes the security boundary; must audit every other `/api/admin/*` consumer.
  2. **Move the REST surface to `/api/bilateral-project-mappings`** (drop the `/admin` segment). Pros: lowest risk, no security boundary changes, role guard provides the actual gating. Cons: spec deviation (R-BIL-080 + design §6.3–6.6 + architecture mermaid).
- **Decision (operator-approved 2026-05-26):** Option 2. URL design is incidental to admin-only semantics; the role guard enforces the actual gating.
- **Spec impact:**
  - `requirements.md` — R-BIL-080 path updated + Pivot Record #1 note added.
  - `design.md` — §6.3–6.6 endpoint definitions, §3 architecture mermaid, §10.3–10.4 workflows all moved to `/api/bilateral-project-mappings`.
  - `tasks.md` — T-15.14 file-list entry updated; spec stays consistent.
  - `frontend-handoff.md` — pending T-15.8 doc update will reflect the new path (admin SSR page in T-15.15 will consume `/api/bilateral-project-mappings`, not `/api/admin/...`).
- **Verification after pivot:** All 6 smoke steps green at the new path (see T-15.14 verification above).

---

## Summary

Pending — spec in execution; see `tasks.md` for live task statuses.
