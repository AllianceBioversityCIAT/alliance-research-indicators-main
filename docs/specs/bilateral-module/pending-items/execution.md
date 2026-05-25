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

## Summary

Pending — spec in execution; see `tasks.md` for live task statuses.
