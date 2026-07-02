# Design — Bilateral / Mapping drives the Pool Funding tag

- **Module:** agresso (bilateral)
- **Spec id:** 2026-07-mapping-drives-pool-funding-tag
- **Status:** draft
- **Owner:** PO (bilateral squad)
- **Linked requirements:** ./requirements.md
- **Linked detailed design:** ../../../detailed-design/detailed-design.md (persistence, read layer)
- **Last updated:** 2026-07-01

---

## 1. Goals & non-goals

**Goals**
- Report `is_pool_funding_contributor` as the **effective** value
  `manual_tag OR EXISTS(active bilateral mapping)` in the Projects table read path
  (R-BIL-100), its filter (R-BIL-101) and its ordering (R-BIL-102).
- Report the same effective value in the results-level read path (R-BIL-103).
- Keep the derivation **read-time** so mapping create/deactivate flips the badge
  with no write coupling and no backfill (R-BIL-104), with active mapping winning
  over a manual `false` (R-BIL-105).

**Non-goals**
- No schema change, migration, or backfill.
- No change to the STAR client or the frontend `isBilateral()` bug.
- No OpenSearch changes (OQ-1 resolved: **out of scope**; find-contracts is SQL-backed).
- No change to the mapping CRUD or `setPoolFundingTag` endpoint surface.

---

## 2. Architecture

The change is confined to the **read layer** — two TypeORM repositories that build
raw SQL. No controller, service, DTO, entity, route, or guard changes.

```
GET /api/agresso/contracts/find-contracts
  AgressoContractController.findContracts
    → AgressoContractService.findContracts            (unchanged)
      → AgressoContractRepository.getContracts / findAllContracts   ← EDIT (SQL)

results read path
  → ResultRepository (result.repository.ts, pool-funding projection :205)          ← EDIT (SQL)

shared helper (new)
  → src/domain/shared/utils/pool-funding.util.ts        ← NEW: effective-flag SQL fragment
```

### 2.1 Composition

- `src/domain/shared/utils/pool-funding.util.ts` — **NEW.** Exports
  `effectivePoolFundingContributorSql(contractAlias: string): string` returning the
  reusable predicate. Single source of truth for the OR/EXISTS expression (mitigates
  the duplication risk). Placed in `shared/` because ≥2 modules consume it
  (agresso-contract + results) per `src/CLAUDE.md §3.3`.
- `src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts`
  — **EDIT.** Use the helper for (a) the projected value, (b) the
  `poolFundingContributorFilter` (`:391-394`), (c) the order fieldMap entry (`:343`).
- `src/domain/entities/results/repositories/result.repository.ts` — **EDIT.** Replace
  the `COALESCE(ac.is_pool_funding_contributor, FALSE)` projection (`:205`) with the helper.

### 2.2 Reuse

- Reuses the existing `bilateral_project_mapping` table and its index
  `idx_bpm_agreement` (on `agresso_agreement_id`) plus `uk_bpm_active_agreement`.
- Reuses the raw-SQL query builders already in both repositories; no new query engine.
- No new guard/pipe/interceptor.

---

## 3. Data model

**No data model changes.** Read-only use of:
- `agresso_contracts.is_pool_funding_contributor` (bool; migration
  `1779190000001-addPoolFundingContributorTagToAgressoContract.ts`; index
  `idx_agresso_contract_pool_funding`).
- `bilateral_project_mapping` (`agresso_agreement_id`, `is_active`; indexes
  `idx_bpm_agreement`, `uk_bpm_active_agreement`).

**OpenSearch:** `is_pool_funding_contributor` remains an `@OpenSearchProperty`
(`agresso-contract.entity.ts:136-139`) holding the raw column. Not touched
(out of scope). Documented drift risk in §7.

---

## 4. API surface

**No endpoint added or changed.** Semantics of an existing field change:

### GET /api/agresso/contracts/find-contracts
- **Controller:** `agresso-contract.controller.ts:304` (`@Get('find-contracts')`).
- **Roles/Guards:** unchanged.
- **Query params:** unchanged (`pool-funding-contributor`, `contract-code`, etc.).
- **Response data shape:** unchanged shape; `data.data[].is_pool_funding_contributor`
  now carries the **effective** boolean.
- **Swagger:** update the `@ApiQuery`/operation description for `pool-funding-contributor`
  to note "includes contracts with an active bilateral mapping".
- **Errors:** unchanged.
- **Notes:** not a breaking wire-shape change (same field, same type) — no version bump.

### results read path
- Field-semantics change only; no route/DTO change.

### PATCH /api/v1/agresso/contracts/:code/pool-funding-tag
- **Unchanged surface.** Behavior note (R-BIL-105): a manual `false` does not lower the
  reported value while an active mapping exists.

---

## 5. Workflows & business rules

**Effective predicate (single definition, `pool-funding.util.ts`):**

```ts
export const effectivePoolFundingContributorSql = (ac: string): string => `(
  COALESCE(${ac}.is_pool_funding_contributor, 0) = 1
  OR EXISTS (
    SELECT 1 FROM bilateral_project_mapping bpm
    WHERE bpm.agresso_agreement_id = ${ac}.agreement_id
      AND bpm.is_active = 1
  )
)`;
```

**find-contracts (`agresso-contract.repository.ts`):**
1. **Projection** — replace the raw `ac.is_pool_funding_contributor` select with
   `${effectivePoolFundingContributorSql('ac')} AS is_pool_funding_contributor`
   (in the main query; the count query does not project it).
2. **Filter** (`:391-394`) — replace with
   `AND ${effectivePoolFundingContributorSql('ac')} = ${filter.is_pool_funding_contributor ? 1 : 0}`.
   Applied to **both** the count query and the main query (they share the fragment).
3. **Ordering** (`fieldMap`, `:343`) — set
   `[OrderFieldsEnum.POOL_FUNDING_CONTRIBUTOR]: effectivePoolFundingContributorSql('ac')`
   so ordering uses the effective expression.

**results (`result.repository.ts:205`):**
4. Replace `COALESCE(ac.is_pool_funding_contributor, FALSE) AS is_pool_funding_contributor`
   with `${effectivePoolFundingContributorSql('ac')} AS is_pool_funding_contributor`.
   Confirm the contract alias in that query is `ac`; if it differs, pass the correct
   alias to the helper.

**Rules / boundaries**
- No transaction, no audit write, no side effect (pure read).
- The `EXISTS` correlates on the indexed `agresso_agreement_id`; `uk_bpm_active_agreement`
  guarantees at most one active row, so it is a presence check.
- No `LEFT JOIN` used (avoids row multiplication / `GROUP BY` interactions in the
  existing aggregate-heavy query); `EXISTS` is chosen for that reason (D-1).

---

## 6. Frontend (Admin SSR panel) impact

None. No `/admin` page added or changed. STAR (sibling repo) needs no change (it reads
the field already); no `client/` edits from this spec.

---

## 7. Integration impact

- **OpenSearch:** no files touched. **Risk:** the `agresso_contracts` OpenSearch document
  keeps the raw `is_pool_funding_contributor`. Any consumer filtering/reading the flag
  from OpenSearch (not SQL) will not see mapping-derived values. Verified in scope of this
  spec that `find-contracts` is SQL-backed (`service.findContracts` →
  `repository.findAllContracts`), so the Projects table is unaffected. Follow-up (not in
  this spec): recompute the indexed value on mapping create/deactivate via
  `uploadSingleToOpenSearch`.
- No CLARISA / AGRESSO / TIP / ROAR / RabbitMQ / Socket.IO / DynamoDB changes.

---

## 8. Security & authorization

- No change. find-contracts and the results read path keep their existing auth. No new
  secrets, no machine-token surface change, no PII/donor-restricted data added.

---

## 9. Observability

- No new log lines required (pure read). Optionally, no `sync_process_log` rows.
- If desired, add an `EXPLAIN`-based check in the perf test (see §10) rather than runtime logging.

---

## 10. Testing strategy

- **Unit (repository):** `agresso-contract.repository.spec.ts` — assert the built SQL
  contains the effective predicate for projection, filter (true/false), and ordering;
  cover R-BIL-100 AC.1–AC.4 and R-BIL-101 AC.1–AC.3 via query-string assertions and/or
  the `TEST` datasource.
- **Unit (results):** add/extend a `result.repository` spec to assert the projection uses
  the helper (R-BIL-103).
- **Helper:** `pool-funding.util.spec.ts` — snapshot the SQL for a given alias.
- **Integration (TEST datasource):** seed a contract + active mapping (tag 0), assert
  effective `true`; deactivate mapping, assert `false` (R-BIL-104); tag 1 + no mapping,
  assert `true` (R-BIL-105).
- **Regression:** existing manual-tag find-contracts tests must stay green.
- **Perf (NFR-BIL-100):** `EXPLAIN` the find-contracts main + count query; confirm the
  subquery hits `idx_bpm_agreement`.
- Coverage: keep global 60% threshold.

---

## 11. Rollout

- **Migration order:** none (no schema change). Code-only deploy.
- **Feature flag:** not required; the change is backward-compatible in wire shape. (If the
  squad wants a kill-switch, an env flag gating the helper vs. the raw column could wrap
  the predicate — optional, not default.)
- **Backout:** revert the code change (git); no data to unwind. Existing manual tags remain
  intact because the column is never written by this feature.
- **Comms:** notify the STAR team that mapped contracts now surface the badge automatically
  (behavioral, no client change needed); notify MEL/PO.

---

## 12. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D-pf-1 | 2026-07-01 | Use correlated `EXISTS`, not `LEFT JOIN` | The find-contracts query is aggregate-heavy (`GROUP BY ac.agreement_id`); a join to mappings risks row multiplication. `EXISTS` is a clean boolean and index-friendly. |
| D-pf-2 | 2026-07-01 | Read-time derivation (Option B), not write-time (Option A) | Retroactive with zero backfill; single source of truth; no write race; deactivation auto-clears the badge. |
| D-pf-3 | 2026-07-01 | Pure OR — active mapping wins over manual `false` (R-BIL-105) | PO decision; avoids tri-state/suppress column and hidden override state. |
| D-pf-4 | 2026-07-01 | Shared SQL fragment in `shared/utils/pool-funding.util.ts` | Predicate is used by ≥2 repositories; centralizing prevents divergence. |
| D-pf-5 | 2026-07-01 | OpenSearch out of scope | find-contracts is SQL-backed; no production read path confirmed to serve the flag from OpenSearch (OQ-1 resolved by PO). |

---

## 13. Open questions

- None blocking. (OQ-1 from requirements resolved: OpenSearch out of scope per PO,
  2026-07-01 → moved to D-pf-5.)

---

## 14. References

- `requirements.md` (this spec).
- `agresso-contract.repository.ts` (`:343` order, `:391-394` filter, projection).
- `result.repository.ts` (`:205` projection).
- `bilateral-project-mapping.entity.ts` / migration `1779190000011-createBilateralProjectMapping.ts`.
- Archived bilateral-module spec (mapping CRUD, R-BIL-076…R-BIL-092).
