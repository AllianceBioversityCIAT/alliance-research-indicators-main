# Design — Bugfix / AICCRA result statuses

- **Module:** results
- **Spec id:** 2026-08-aiccra-result-statuses
- **Status:** in-review
- **Linked requirements:** ./requirements.md
- **Linked detailed design:** ../../../trd/trd.md (persistence: append-only migrations)
- **Last updated:** 2026-08-19

---

## 1. Goals & non-goals

- **Goals:** R-ARS-001…004 — enum + one new migration; deactivate 21; insert 26–28.
- **Non-goals:** edit merged migrations; `DELETE` 21; workflow/UI.

---

## 2. Architecture

Catalog-only. No new HTTP surface. `ResponseInterceptor` / guards unchanged.

### 2.1 Composition

- `src/domain/entities/result-status/enum/result-status.enum.ts` — add 22, 26, 27, 28.
- `src/db/migrations/1787181821481-deactivateAiccraEditingAndInsertMissingStatuses.ts` — compensating `up`/`down`.
- `src/db/migration-specs/insert-aiccra-result-statuses.spec.ts` — Bug Mode regression (outside the TypeORM migrations glob).

### 2.2 Seams (Bug Mode)

1. `ResultStatusEnum` / `ResultStatusNameEnum` public members.
2. New migration `up`/`down` SQL (queryRunner calls).
3. Source of `1767821369314-insertAndUpdateNewStatus.ts` still contains the original AICCRA inserts.

---

## 3. Data model

Table `result_status` (existing). No entity column changes.

| ID | Name | `is_active` after `up` |
| --- | --- | --- |
| 21 | Editing in AICCRA | 0 |
| 22 | Submitted in AICCRA | unchanged (1) |
| 26 | Completed in AICCRA | 1 (insert) |
| 27 | Extended in AICCRA | 1 (insert) |
| 28 | On Going in AICCRA | 1 (insert) |

23–25 remain bilateral.

---

## 4. API surface

No endpoint changes. Status lists that filter `is_active = true` will hide 21 automatically.

---

## 5. Error handling

N/A (seed migration). Insert of 26–28 assumes those ids are free.

---

## 6. Testing

- Unit: migration `up` issues `UPDATE … is_active = 0` for 21, never `DELETE` 21, inserts 26–28.
- Unit: merged seed file still contains `'Editing in AICCRA'` and `'Submitted in AICCRA'`.
- Enum members equal the IDs above.
