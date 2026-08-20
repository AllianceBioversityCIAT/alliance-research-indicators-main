# Tasks — Bugfix / AICCRA result statuses

- **Module:** results
- **Spec id:** 2026-08-aiccra-result-statuses
- **Status:** completed
- **Linked requirements:** ./requirements.md
- **Linked design:** ./design.md
- **Last updated:** 2026-08-19

---

## 1. Dependency graph

T-01 (enum) → T-02 (migration, uses enum ids) → T-03 (regression spec)

---

## 2. Task list

### T-01 — Add AICCRA members to ResultStatusEnum

- **Requirements covered:** R-ARS-001
- **Files:** `server/researchindicators/src/domain/entities/result-status/enum/result-status.enum.ts`
- **Done check:** members 22, 26, 27, 28 present; no Editing-in-AICCRA member
- **Status:** done

### T-02 — Append compensating migration

- **Requirements covered:** R-ARS-002, R-ARS-003, R-ARS-004
- **Files:** `server/researchindicators/src/db/migrations/1787181821481-deactivateAiccraEditingAndInsertMissingStatuses.ts`
- **Notes:** `UPDATE` 21 `is_active=0`; `INSERT` 26–28; do not modify `1767821369314-*.ts`
- **Status:** done

### T-03 — Bug Mode regression

- **Requirements covered:** R-ARS-002 AC.2, R-ARS-004
- **Files:** `server/researchindicators/src/db/migration-specs/insert-aiccra-result-statuses.spec.ts`
- **Notes:** fail if up() deletes 21; fail if merged seed lost AICCRA inserts
- **Status:** done
