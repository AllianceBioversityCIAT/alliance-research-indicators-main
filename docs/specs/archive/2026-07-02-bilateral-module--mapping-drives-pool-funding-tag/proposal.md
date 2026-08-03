# Proposal — Bilateral mapping drives the "Contributing to Pool Funding" tag

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `bilateral-module/mapping-drives-pool-funding-tag` |
| Proposal file | `docs/specs/bilateral-module/mapping-drives-pool-funding-tag/proposal.md` |
| Status | Draft — pending approval |
| Author | Claude (pair) |
| Requested by | PO |
| Date | 2026-07-01 |
| Related specs | `docs/specs/archive/2026-06-17-bilateral-module` (pending-items, mapping CRUD), `docs/specs/archive/2026-06-17-bilateral-module--toc-mapping-v2` |
| Related memory | Error-envelope (`errors` vs `description`); bilateral mapping is indicator-level only |

## 2. Intent

When a Center Admin maps a bilateral AGRESSO contract to a CLARISA project in
`bilateral_project_mapping`, that contract MUST surface the **"Contributing to
Pool Funding"** badge everywhere the platform reports the flag — without a
separate manual tagging step.

## 3. Problem / Current Behavior

The badge is driven **only** by the column `agresso_contracts.is_pool_funding_contributor`:

- It is set exclusively via `AgressoContractService.setPoolFundingTag()`
  (controller `PATCH /api/v1/agresso/contracts/:code/pool-funding-tag`, the
  "AGRESSO Pool Funding Tag" admin page).
- `find-contracts` reads the raw column: `agresso-contract.repository.ts`
  projects `ac.is_pool_funding_contributor`, orders by it (`:343`) and filters by
  it (`:392-393`).
- `result.repository.ts:205` reads `COALESCE(ac.is_pool_funding_contributor, FALSE)`.
- **Neither path derives the flag from `bilateral_project_mapping`.**

Consequence (verified this session against local): **D504** has an active mapping
(`id 11 → CLARISA 22`) but shows **no badge**. A511 / D527 / D335 show the badge
only because they were tagged manually via the PATCH endpoint. The mapping and the
badge are two disconnected concepts, so a mapped bilateral project silently lacks
its pool-funding identity in the Projects table.

## 4. Proposed Outcome

A contract is reported as a pool-funding contributor when **either**:

1. it is manually tagged (`is_pool_funding_contributor = 1`), **or**
2. it has at least one **active** row in `bilateral_project_mapping`
   (`is_active = 1`) for its `agreement_id`.

Effective flag = `manual_tag OR EXISTS(active bilateral mapping)`.

This is computed at **read time**, so existing mappings (e.g. D504) light up the
badge automatically on deploy, and deactivating the last active mapping turns the
derived badge off (unless a manual tag remains).

## 5. Scope

- **Backend read paths only.** Derive the effective flag in:
  - `agresso-contract.repository.ts` — the `find-contracts` query: projection,
    the pool-funding **filter** (`pool-funding-contributor=true`), and ordering.
  - `result.repository.ts` — the `is_pool_funding_contributor` projection (`:205`).
- Apply to **both** the Projects table **and** results-level consumers (PO decision: both).
- Tests: repository unit/integration coverage for the three verification cases
  (§12), plus regression on the existing manual-tag behavior.

## 6. Non-Goals

- No change to the STAR client — it already reads `is_pool_funding_contributor`
  from the response.
- No change to the mapping CRUD contract or the `setPoolFundingTag` endpoint
  surface (see §9 for one guard-rail note).
- No new column, no data backfill, no write-time propagation (Option A rejected).
- No change to bilateral mapping granularity (remains indicator-level; this is
  purely about the contract-level pool-funding flag).
- No re-index trigger design for OpenSearch beyond noting it (§11).

## 7. Affected Users, Systems, And Specs

- **Users:** Center Admins and STAR consumers viewing the Projects table and
  results views.
- **Systems:** ARI server read layer (agresso-contract + results repositories).
  MySQL query only; `bilateral_project_mapping` already indexed
  (`idx_bpm_agreement`, `uk_bpm_active_agreement`).
- **Specs:** extends the archived bilateral-module mapping spec; this becomes the
  active spec for the mapping→tag coupling.

## 8. Requirement Delta Preview

### ADDED Requirements

- The effective pool-funding flag returned by `find-contracts` and by
  results-level queries MUST be `true` when an active `bilateral_project_mapping`
  exists for the contract, regardless of the manual column value.
- The Projects "Contributing to Pool Funding" **filter** MUST include
  contracts whose flag is derived from an active mapping.

### MODIFIED Requirements

- `is_pool_funding_contributor` in API responses changes from "raw column value"
  to "effective (derived OR manual) value".
- Ordering by pool-funding SHOULD reflect the effective value.

### REMOVED Requirements

- None. Manual tagging remains fully supported (it is one of the two OR inputs).

## 9. Approach Options

### Option A — Write-time propagation
On mapping create/activate, set `is_pool_funding_contributor = 1` on the contract
inside the same transaction; on deactivating the last active mapping, revert.

- ➖ Requires a data **backfill** UPDATE for existing mappings (D504).
- ➖ Revert logic must detect "last active mapping" and must not clobber a genuine
  manual tag — needs provenance tracking (which flag was manual vs derived).
- ➖ Two write paths (mapping service + tag service) can race on the same column.
- ➕ Reads stay trivial (single column).

### Option B — Read-time derivation (RECOMMENDED)
Expose the flag as `is_pool_funding_contributor OR EXISTS(active mapping)` via a
correlated `EXISTS` subquery on `bilateral_project_mapping` (`is_active = 1`,
joined by `agresso_agreement_id = ac.agreement_id`) in both repositories.

- ➕ **Retroactive by construction** — no backfill; D504 lights up on deploy.
- ➕ Single source of truth; deactivating the mapping removes the derived badge
  automatically.
- ➕ No write coupling, no race, no provenance column.
- ➖ Slightly more complex read SQL (one EXISTS per query); must be applied in
  every place that emits the flag (identified: 2 repositories, 3 usages).
- ➖ OpenSearch documents (if they index the raw column) would not reflect the
  derived value until reindex — see §11.

## 10. Recommended Approach

**Option B (read-time derivation)** with **PO decisions locked in**:

1. **Precedence — mapping wins (pure OR).** A contract with an active mapping
   ALWAYS reports the badge; a manual override to `false` is ineffective while an
   active mapping exists. No tri-state, no suppress column.
2. **Scope — Projects + results.** Derive in both `agresso-contract.repository.ts`
   and `result.repository.ts`.
3. **Retroactivity — automatic.** Existing mappings enable the badge at deploy
   with zero data migration.

Effective expression (illustrative):

```sql
(
  COALESCE(ac.is_pool_funding_contributor, 0) = 1
  OR EXISTS (
    SELECT 1 FROM bilateral_project_mapping bpm
    WHERE bpm.agresso_agreement_id = ac.agreement_id
      AND bpm.is_active = 1
  )
) AS is_pool_funding_contributor
```

The same predicate must back the **filter** and **ordering**, not just the
projected value, so "filter by Contributing to Pool Funding" stays consistent
with the badge.

## 11. Risks, Dependencies, And Open Questions

- **Filter/ordering parity:** the derived predicate must replace the raw-column
  references at `agresso-contract.repository.ts:343` (order) and `:392-393`
  (filter), or the badge and the filter will disagree.
- **OpenSearch drift:** if `agresso_contracts` documents index the raw
  `is_pool_funding_contributor`, OpenSearch-backed views won't reflect derived
  values. Decide whether OpenSearch is in scope; if so, add a reindex/derive step
  (out of this proposal's default scope). **Open question.**
- **`setPoolFundingTag` UX guard-rail (optional):** since manual `false` is a
  no-op when a mapping exists, consider returning an informative response so the
  admin UI can indicate "overridden by active bilateral mapping". Non-blocking;
  client change is out of scope.
- **Performance:** correlated `EXISTS` on an indexed `agresso_agreement_id` is
  cheap; validate the query plan on the paginated Projects query.
- **Query duplication:** the predicate lives in ≥2 raw SQL strings — risk of
  future divergence. Consider a shared SQL fragment/const.

## 12. Success Criteria

1. **D504** (active mapping, never manually tagged) shows the badge in the
   Projects table and in results-level responses after deploy — no data change.
2. Deactivating D504's **only** active mapping removes the badge (no manual tag
   remains).
3. A contract with a **manual tag and no mapping** keeps the badge.
4. Filtering the Projects table by "Contributing to Pool Funding" returns
   mapping-derived contracts as well as manually-tagged ones.
5. STAR client works unchanged.
6. Repository tests cover cases 1–4; existing manual-tag tests still pass;
   `npm test` / `npm run lint` / `npm run build` green.

## 13. Next Step

```text
/sdd-specify bilateral-module/mapping-drives-pool-funding-tag
```
