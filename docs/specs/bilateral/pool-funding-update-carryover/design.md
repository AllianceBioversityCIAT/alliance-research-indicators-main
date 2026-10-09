# Design — Bilateral / Pool Funding carry-over on "Update result"

## 0. Document Control & Budget

| Field | Value |
| --- | --- |
| Spec id | 2026-10-pool-funding-update-carryover |
| Depth | Standard (narrow) — re-checked against this design (§0 budget): matches |
| Linked requirements | ./requirements.md |
| Baseline commit | `d59c5d6db` |
| Gate log | Phase 2 — auto-approved (pre-approved mode), 2026-10-08; judgment-day per owner instruction (./judgment.md) |
| Execution note | Owner, 2026-10-08: Cursor has no tokens — Claude implements directly; Reviewer stays an independent subagent (author ≠ auditor) |

**Budget (tripwire for `/akili-execute`):** 3 tasks (2 build + 1 HITL) · ~500 LOC (≈140 prod, ≈360 tests) · ~4 review rounds.

## 1. Executive Summary

`GreenChecksService.newReportingCycle` gains one step: inside a new transaction that also applies the status/year change, it looks up the active snapshot for `(result_official_code, selected year)`; when one exists it calls a new repository method `GreenCheckRepository.carryOverPoolFunding(manager, liveResultId, snapshotResultId, userId)` that deactivates the live alignment/SP/ToC rows, replaces the live indicator mappings (D-9), and inserts copies of the snapshot's active rows. The history write (`saveHistory`) moves after that transaction. No schema, endpoint, or client change.

## 2. Architecture Overview

```
PATCH results/green-checks/new-reporting-cycle/:code/year/:Y
  GreenChecksController.newReportingCycle                (unchanged)
    GreenChecksService.newReportingCycle
      1. find live Approved row (unchanged guard → 400)
      2. dataSource.transaction(manager =>
           update live: report_year_id = Y, status = DRAFT     (moved inside)
           snapshot = active is_snapshot row for (code, Y), newest result_id
           if snapshot → greenCheckRepository.carryOverPoolFunding(manager, live, snapshot, user))
      3. saveHistory(live, Approved → Draft)                  (moved after step 2)
```

## 3. Extended Directory Structure

| File | Change |
| --- | --- |
| `server/.../green-checks/green-checks.service.ts` | `newReportingCycle` restructured as above |
| `server/.../green-checks/repository/green-checks.repository.ts` | new `carryOverPoolFunding` |
| `server/.../green-checks/green-checks.service.spec.ts` | new/updated cases |
| `server/.../green-checks/repository/green-checks.repository.spec.ts` | statement-order/params cases |
| `server/researchindicators/test/fixtures/pool-funding-update-carryover.fixture-spec.ts` | new real-MySQL fixture |

## 4. Data Model

No change. Tables touched (columns from the entities, identical to the `SP_versioning` copy lists — P-4):

| Table | Copied columns | Parent key on the copy |
| --- | --- | --- |
| `result_pool_funding_alignment` | `has_contribution` | `result_id = live` |
| `result_pool_funding_alignment_sp` | `sp_code`, `sp_role` | `alignment_id = new live alignment id` |
| `result_pool_funding_toc_alignment` | `sp_code, aligns_with_toc, level, toc_result_id, indicator_id, quantitative_contribution, toc_result_title, indicator_description, unit_messurament, target_value, target_year` | `result_id = live` |
| `result_pool_funding_indicator_mapping` | `lever_code, indicator_code, indicator_type, other_contribution_narrative, is_stale` + 4 section links remapped (D-3) | `result_id = live` |

Generated columns (`active_result_id` etc.) are never written.

## 5. API Design

No contract change (NFR-PUC-003). Errors: a carry-over failure rolls back and surfaces through `GlobalExceptions` as today's 500 envelope.

## 6. Backend Module Design

**`carryOverPoolFunding(manager, liveResultId, snapshotResultId, userId)`** — raw SQL through the passed `EntityManager`, in this order:

1. Deactivate live `_alignment_sp` rows whose alignment belongs to the live result and is active.
2. Deactivate live active `_alignment` and `_toc_alignment` rows (`is_active = false`, `deleted_at = NOW()`, `updated_by = userId`). **Hard-delete every live `_indicator_mapping` row, active and inactive** (D-9).
3. Insert one alignment copied from the snapshot's active alignment (newest id if more than one). Then re-select the live result's active alignment id (`result_id = live AND is_active = TRUE`) — no reliance on the driver's `insertId` shape (JD F-5/J-3); if none, skip step 4.
4. Insert copies of the snapshot alignment's active `_sp` rows pointing at the new alignment id.
5. Insert copies of the snapshot's active ToC rows.
6. Insert copies of the snapshot's active indicator mappings with remapped links (D-3).

Every statement is parameterized (`?`), filtered by `is_active = TRUE` on the source, and sets `created_by`/`updated_by = userId`, `created_at`/`updated_at = NOW()`, `is_active = TRUE`, `deleted_at = NULL` (D-4).

**`newReportingCycle`**: keeps the existing Approved guard; moves `repoResult.update` into `dataSource.transaction`; snapshot lookup inside the transaction via `manager.getRepository(Result).findOne({ where: { result_official_code, report_year_id: Y, is_snapshot: true, is_active: true }, order: { result_id: 'DESC' } })`; `saveHistory` runs after the commit, with the history object built from the status read **before** the update (`from = APPROVED`, JD F-7).

## 7. Frontend / UX

None. The version selector already clears caches and reloads the live result after a successful PATCH (`version-selector.component.ts:205-229`), so the Pool Funding page fetches the carried data on open.

## 8. Shared Contracts

None.

## 9. Design Decisions

| # | Decision | Rationale / rejected alternative |
| --- | --- | --- |
| D-1 | Carry over in the service + repository (TypeORM `EntityManager`), not in a new stored procedure | Matches `bilateral.service` write style; testable with the fixture harness; no migration (NFR-PUC-002). Rejected: new SP — needs a migration and a manual Prod apply step (K-015) |
| D-2 | **Replace**: deactivate live active alignment/SP/ToC rows before inserting (mappings: D-9) | `uq_rpfa_active_result` allows one active alignment per result (P-5) — inserting without deactivating throws 1062 when the live still has one. The approved version is the authoritative state for that year, and on re-approval it is overwritten anyway (P-3). Soft-delete only — nothing is hard-deleted, the live `results` row is never touched beyond status/year |
| D-3 | Indicator-mapping section links: non-null → live `result_id`, null → null | The four FKs reference `result_*(result_id)` (P-6); the live result owns its own section rows. Copying the snapshot's value verbatim could point the live mapping at another result (`SP_versioning` copies them unchanged — P-4, out of scope) |
| D-4 | Copies get fresh audit (acting user, `NOW()`) | Project convention: mutations populate audit from `request.user` (NFR-PUC-001). Rejected: preserving source audit like `SP_versioning` — that is a versioning copy, this is a user action |
| D-5 | Copy regardless of eligibility | Owner: visibility on live follows the normal rules; data is stored and shown only when the rules allow (R-PUC-004). Copying only when eligible would lose the data if the contract becomes eligible later |
| D-6 | Status/year + carry-over in one transaction; `saveHistory` after commit | R-PUC-003. `saveHistory` opens its own transaction and also sets the status (P-7); calling it after means a carry-over failure leaves no history row. Residual: if `saveHistory` itself fails after commit, the live is Draft without its history row — the same non-atomicity exists today between those two writes; not widened |
| D-7 | Snapshot choice: active snapshot for `(code, Y)`, newest `result_id` | `SP_versioning` refuses a second active snapshot for the same year (P-3), so normally exactly one exists; ordering makes the pick deterministic if data is irregular |
| D-9 | **Replace** the live indicator mappings: hard-delete all live `_indicator_mapping` rows (active + inactive), then insert the snapshot copies | `uq_rpfim_result_indicator_active` is a plain UNIQUE on `(result_id, lever_code, indicator_code, is_active)` (P-10): two inactive rows with the same key collide (1062). Soft-deactivating leaves an inactive twin next to the copied active row, which `SP_versioning` then collides with at re-approval (JD round 2, R2-1 — the round-1 partial purge left exactly that). Replacing leaves the invariant *live mappings = exactly the snapshot's active rows, zero inactive*, so neither a later Update nor `SP_versioning` can collide. Safe: no FK references the mapping `id` (`grep -rn "REFERENCES\|mapping_id" src/db` → only the table's own outbound FKs, JD R2-3/R2-4); the snapshot still holds the approved copy. Cost: the live result's soft-deleted mapping history (narratives) is discarded — accepted. Scope: only this table; alignment/SP/ToC keep soft-delete because their uniques are generated-column partials (P-10). The `results` row is never touched beyond status/year. Rejected: a migration turning the index into a generated-column partial unique (like `1779190000014` did for the alignment) — fixes every path but needs a schema change and a manual Prod apply (K-015); kept as O-3 for the owner (narrow-blast-radius preference) |
| D-8 | Year with no snapshot → no Pool Funding change | Owner's rule is literal ("if the selected year has a version"). Open question O-1 records the alternative |

**Step 2.3 reversion challenge:** no DD removes or disables shipped behavior (D-2 replaces live rows only inside the newly-added carry-over branch; S-3 keeps today's path byte-identical). Skipped as not triggered.

## 10. Risks & Open Questions

| # | Item |
| --- | --- |
| O-1 | Selecting a **new** year (no version yet) keeps today's behavior: the live Pool Funding stays empty because `SP_versioning` moved it. If the owner wants the *latest* version's data in that case, it is a one-line change of the lookup (D-8) — not done without confirmation |
| O-2 | R-PRY-007 (`display_only`) also applies to a **live** result that has a PRMS code or was synced, not only to versions (P-8). After carry-over, such a non-eligible live result shows the section read-only. The owner described display-only as "only in versions" — unchanged here, flagged for the owner |
| O-3 | Latent, pre-existing: the normal mapping save (`bilateral.service.ts` `upsertContribution`, deactivate-then-insert) and `SP_versioning` hit the same plain unique index once an inactive twin exists (P-10). This spec only protects the carry-over cycle; a generated-column index migration would fix all paths — owner decision |
| R-1 | Results already updated before this ships keep an empty live section (no backfill) |

## 11. Premise Ledger

Count: 12 verified · 0 `UNVERIFIED`.
Blast-radius triggers: `live-path` (names the Update result action) — P-1; `consumer` (changes `newReportingCycle` behavior; writes rows other readers consume) — P-9, P-11. `shared-state`: none apply — no shared service/state is changed; the new repository method has no other caller.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | The "Update result" button reaches `GreenChecksService.newReportingCycle` | live-path | `version-selector.component.html:42` `(click)="updateResult()"` → `version-selector.component.ts:205` `api.PATCH_ReportingCycle` → `api.service.ts:1077-1079` `results/green-checks/new-reporting-cycle/${code}/year/${year}` → `green-checks.controller.ts:99-109` → `green-checks.service.ts:592` | `d59c5d6db` | Change lands on an unreached path (High) | — |
| P-2 | `newReportingCycle` never creates/deletes the live row; it sets year + DRAFT and history | existence | `green-checks.service.ts:592-650` (findOne, `saveHistory`, `repoResult.update`) | `d59c5d6db` | D-6 ordering changes (Low) | — |
| P-3 | `SP_versioning` rejects a second active snapshot per year, and approval deletes the existing year snapshot first | data-env | migration `1791468452856…:42` (`SIGNAL SQLSTATE '45001'`); `green-checks.repository.ts:301-316` and `result-status-workflow.repository.ts:160-176` (`SP_delete_result_version` before `SP_versioning`) | `d59c5d6db` | D-7 needs a different pick rule (Low) | — |
| P-4 | `SP_versioning` copies the four tables with exactly the §4 column lists and deactivates the live rows only when an alignment existed; links copied unchanged | location | migration `1791468452856…:820-904` | `d59c5d6db` | §4 column list wrong (High) | — |
| P-5 | At most one active alignment per result is enforced by a unique index | data-env | `1779190000014-fixResultPoolFundingAlignmentPartialUnique.ts:36` `ADD UNIQUE INDEX uq_rpfa_active_result (active_result_id)` | `d59c5d6db` | D-2 deactivation not strictly needed (Low) | — |
| P-6 | Mapping section links are FKs to `result_*(result_id)` | data-env | `1779190000008-createResultPoolFundingIndicatorMapping.ts:39-48` | `d59c5d6db` | D-3 remap wrong (High) | — |
| P-7 | `saveHistory` runs its own transaction and also updates the result status | location | `green-checks.service.ts:411-416` | `d59c5d6db` | D-6 rollback guarantee changes (Low) | — |
| P-8 | `display_only = !eligible && (is_snapshot \|\| is_synced_to_prms \|\| prms_result_code != null)` applies to live rows too | other | `bilateral.service.ts:655-660` (`displayOnly = !eligible && (is_snapshot \|\| isSyncedToPrms \|\| prms_result_code != null)`, no live/snapshot filter) | `d59c5d6db` | O-2 moot (Low) | — |
| P-9 | Consumers of `newReportingCycle` / the endpoint: only the version selector and these specs | consumer | `grep -rln "newReportingCycle\|new-reporting-cycle\|PATCH_ReportingCycle" server client --include="*.ts"` (excl. node_modules) → `green-checks.service.ts`, `green-checks.controller.ts`, `green-checks.service.spec.ts`, `green-checks.controller.spec.ts`, `impersonation-audit.interceptor.spec.ts`, `api.service.ts`, `api.service.spec.ts`, `version-selector.component.ts`, `version-selector.component.spec.ts` | `d59c5d6db` | Unlisted consumer breaks (Low — contract unchanged) | — |
| P-10 | Unique indexes on the 4 tables: alignment and ToC and `_sp` use generated-column partial uniques; the indicator mapping uses a **plain** UNIQUE including `is_active` | data-env | `src/db/baseline/baseline.sql:3690` (`idx_rpfas_active_primary`), `:3723` (`uq_rpfim_result_indicator_active (result_id,lever_code,indicator_code,is_active)`), `:3768` (`idx_rpfta_active_result_sp`); `1779190000008…:28`; `grep -rn uq_rpfim src/db` → no later migration alters it | `d59c5d6db` | D-9 unnecessary (Low) | — |
| P-11 | Other readers of live Pool Funding rows do not act on a Draft live result: PRMS sync requires Approved; the PRMS webhook diff baselines on snapshots only | consumer | `grep -rln "result_pool_funding\|ResultPoolFunding" src/domain --include="*.ts"` (excl. specs, `entities/bilateral/`) → prms-sync aggregate repo, `prms-webhook/pool-funding-mapping-{diff,apply}.service.ts`, entity relations; `sync-gate.ts:131-138` (status ≠ Approved → blocked); `pool-funding-mapping-diff.service.ts:56-63` (`is_snapshot = TRUE`) | `d59c5d6db` | Carried rows leak to PRMS while Draft (High) | — |
| P-12 | `SP_versioning` never updates or deletes a section table (it copies capacity sharing, innovation dev and policy change; `result_knowledge_products` is not copied), so the live section rows survive approval and the snapshot mapping's links already hold the live id — the D-3 remap is the identity in the realistic case and the FK holds | data-env | migration `1791468452856…`: the only UPDATEs in the procedure are the four Pool Funding ones (`:887-900`); `grep -n "knowledge_product"` → only the mapping column lines (`871, 879, 1996, 2004`); no `DELETE` in the procedure — re-verified by both round-2 judges | `d59c5d6db` | D-3 insert fails with 1452 (High) | — |

