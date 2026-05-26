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
- **Commit:** (filled in at commit time)

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
