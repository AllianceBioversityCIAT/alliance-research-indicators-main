# Design — Bilateral module / ToC Mapping v2 (lambda-toc integration)

> **SDD spec.** Follows [`docs/specs/general-setup/design.md`](../../general-setup/design.md).
> Inputs: [`./requirements.md`](./requirements.md), [`./proposal.md`](./proposal.md), client handoff `alliance-research-indicators-client/docs/specs/bilateral-module/toc-mapping-v2/backend-handoff.md`, [`../pending-items/design.md`](../pending-items/design.md), [`../../../detailed-design/detailed-design.md`](../../../detailed-design/detailed-design.md).
> Companion documents: [`./requirements.md`](./requirements.md), [`./tasks.md`](./tasks.md).

---

## 1. Document control

| Field | Value |
| --- | --- |
| Spec id | 2026-06-toc-mapping-v2 |
| Module | bilateral-module |
| Status | Draft — pending approval |
| Phase | Phase 2 of the SDD methodology (design) |
| Owner | Eng: Juanca |
| Linked requirements | [`./requirements.md`](./requirements.md) (R-BIL-090…098, NFR-BIL-090…092) |
| Linked detailed design | [`../../../detailed-design/detailed-design.md`](../../../detailed-design/detailed-design.md) (modules, envelope, migrations) |
| Last updated | 2026-06-09 |
| Approvers | [ ] Eng lead · [ ] PO · [ ] STAR FE |

---

## 2. Goals & non-goals

**Goals** (each maps to requirements):

1. New lambda-toc client with cache/resilience parity to `PrmsTocService` (R-BIL-090, NFR-BIL-090/091/092).
2. In-place reshape of the `hlos-indicators` read to the frozen FE envelope (R-BIL-090, R-BIL-091).
3. Per-SP alignment persistence with snapshots and independent upsert (R-BIL-092/093/095/096).
4. Single server-side `result_type → allowed_levels` rule used by read and write (R-BIL-091, R-BIL-094).
5. Hardcoded 2026 version gate (R-BIL-097).

**Non-goals:** resolution-chain changes; indicator-type filtering; versioning proper; PRMS push; admin panel; STAR client changes; touching `result_pool_funding_indicator_mapping`/handlers.

---

## 3. Architecture

```
BilateralController (existing)
  ├─ GET  …/hlos-indicators ──▶ BilateralService.getHlosIndicatorsForResult  (reshaped)
  │                               ├─ resultRepository.findPoolFundingAlignmentContext   (unchanged)
  │                               ├─ BilateralProjectMappingService / ClarisaProjectsService (unchanged chain)
  │                               ├─ TocLevelRulesUtil  ◀── NEW (result_type → allowed_levels)
  │                               └─ TocIntegrationService.getTocResultsForSps  ◀── NEW (lambda-toc)
  ├─ GET  …/pool-funding-alignment ──▶ getAlignment + tocAlignmentRepository (extended read-back)
  └─ PATCH …/pool-funding-alignment ──▶ updateAlignment (extended: toc_alignments[] upsert + gate)
                                          └─ ResultPoolFundingTocAlignmentRepository ◀── NEW
```

The AOW fan-out path (`ClarisaCgiarEntitiesService.getAreasOfWorkBySp` → `PrmsTocService.getTocResultsForPairs`) is bypassed by the reshape and physically removed post-cutover (R-BIL-098).

### 3.1 Composition (new files)

- `src/domain/tools/toc-integration/toc-integration.module.ts` — tool module (HttpModule import, singleton service export).
- `src/domain/tools/toc-integration/toc-integration.service.ts` — lambda-toc client: per-(SP, level) GET, cache, resilience, fan-out helper.
- `src/domain/tools/toc-integration/dto/toc-integration.types.ts` — upstream payload types (`TocLevel`, `TocResult`, `TocIndicator`, `TocTarget`) mirroring handoff §2 verbatim (incl. `unit_messurament`).
- `src/domain/tools/toc-integration/toc-integration.service.spec.ts` — unit spec.
- `src/domain/entities/bilateral/entities/result-pool-funding-toc-alignment.entity.ts` — new entity (§4).
- `src/domain/entities/bilateral/repositories/result-pool-funding-toc-alignment.repository.ts` — upsert/find/deactivate queries.
- `src/domain/entities/bilateral/utils/toc-level-rules.util.ts` — pure constant + functions: `resolveResultTypeKey(indicatorId): TocResultTypeKey`, `allowedLevelsFor(key): TocLevel[]`, `MAPPABLE_LIVE_VERSION = 2026`.
- `src/db/migrations/<timestamp>-createResultPoolFundingTocAlignment.ts` — append-only migration.

Modified files:

- `src/domain/entities/bilateral/bilateral.service.ts` — read reshape + write extension + gate.
- `src/domain/entities/bilateral/bilateral.module.ts` — import `TocIntegrationModule`, register new entity/repository.
- `src/domain/entities/bilateral/dto/bilateral-hlos-indicators.response.dto.ts` — rewritten to the frozen envelope.
- `src/domain/entities/bilateral/dto/update-pool-funding-alignment.dto.ts` — `toc_alignments[]` nested DTO.
- `src/domain/entities/bilateral/repositories/result-pool-funding-alignment.repository.ts` — read-back join only if needed (prefer separate repository call).
- `src/domain/entities/bilateral/bilateral.controller.ts` — Swagger annotations updated (shapes only; routes/guards unchanged).
- `src/domain/shared/utils/env.utils.ts` (or equivalent env target) — `ARI_TOC_INTEGRATION_HOST`.

### 3.2 Reuse

`LoggerUtil`, `GlobalExceptions` envelope errors, `RolesGuard` + `ResultOwnerGuard` (unchanged), `AuditableEntity`, the generated-column partial-unique pattern (migration `1779190000014`), `findPoolFundingAlignmentContext` (already returns `report_year_id` and the result-type linkage context), existing socket event `POOL_FUNDING_ALIGNMENT_CHANGED` (payload unchanged — D-V2-6). `PrmsTocService` is reused as the *pattern* reference only; no shared code.

---

## 4. Data model

### `result_pool_funding_toc_alignment` (new)

Entity: `src/domain/entities/bilateral/entities/result-pool-funding-toc-alignment.entity.ts`, class `ResultPoolFundingTocAlignment`, extends `AuditableEntity`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK auto | |
| `result_id` | bigint, not null | FK-by-value to `results.result_id` (mirror sibling tables) |
| `sp_code` | varchar(50), not null | e.g. `SP01` |
| `aligns_with_toc` | tinyint(1), not null | the per-SP Yes/No |
| `level` | varchar(10), null | `OUTPUT` / `OUTCOME` / `EOI`; null when "No" |
| `toc_result_id` | int, null | upstream numeric id |
| `indicator_id` | int, null | upstream numeric id |
| `quantitative_contribution` | decimal(18,2), null | nullable until OQ-V2-2/3 settle edge cases |
| `toc_result_title` | text, null | snapshot |
| `indicator_description` | text, null | snapshot |
| `unit_messurament` | varchar(100), null | snapshot, upstream spelling stored verbatim (D-V2-4) |
| `target_value` | varchar(50), null | snapshot (upstream is string) |
| `target_year` | int, null | snapshot, 2026 for now |
| audit fields | | `created_at/by`, `updated_at/by`, `is_active`, `deleted_at` |
| `active_result_sp` | generated stored, null | `IF(is_active = 1, CONCAT(result_id, ':', sp_code), NULL)` |

Indexes: `idx_rpfta_active_result_sp` UNIQUE on `active_result_sp` (one active row per (result, SP); flipping OQ-V2-3 to N-per-SP = drop this index, nothing else). `idx_rpfta_result` on `result_id`.

No OpenSearch decoration. Migration `<timestamp>-createResultPoolFundingTocAlignment.ts`, append-only, clean `down()`. No backfill (no legacy rows).

No changes to any existing table.

---

## 5. API surface

### GET /api/v1/results/:resultCode/pool-funding-alignment/hlos-indicators — reshaped (R-BIL-090/091/097)

- **Controller:** `bilateral.controller.ts` (route, guards, `@GetResultVersion()` unchanged)
- **Response `data` shape** (frozen — byte-compatible with handoff §4):

```ts
{
  result_code: string;
  mapping_status: 'mapped' | 'unmapped';
  clarisa_project: { id: number; short_name: string } | null;
  result_type: 'capacity_sharing' | 'innovation_dev' | 'policy_change' | string; // canonical key
  allowed_levels: ('OUTPUT' | 'OUTCOME' | 'EOI')[];
  version_locked: boolean;                       // report_year_id !== 2026
  catalogs: Array<{
    sp_code: string;
    levels: Array<{
      level: 'OUTPUT' | 'OUTCOME' | 'EOI';
      toc_results: Array<{
        toc_result_id: number;
        title: string;
        description: string;
        aow_code: string | null;                  // wp_short_name; null for EOI
        indicators: Array<{
          indicator_id: number;
          indicator_description: string;
          unit_of_measurement: string;            // renamed from unit_messurament
          type_value: string;                     // unfiltered passthrough (OQ-V2-2)
          target_value: string | null;            // resolved for target_year
          target_year: number;                    // 2026
        }>;
      }>;
    }>;
  }>;
}
```

- **Errors:** 404 result not found; 503 cold-cache upstream failure. Empty catalogs are 200s.
- **Swagger:** response DTO classes re-annotated (`@ApiProperty`); operation summary updated.
- **Breaking change, same version:** sole consumer is the unshipped STAR FE (D-V2-2); verified by task T-02.

### PATCH /api/v1/results/:resultCode/pool-funding-alignment — extended (R-BIL-092/093/094/097)

- **Body DTO:** `update-pool-funding-alignment.dto.ts` gains:

```ts
toc_alignments?: TocAlignmentInputDto[];   // optional; omitted = leave rows untouched

class TocAlignmentInputDto {
  sp_code: string;                          // @IsString @MaxLength(50)
  aligns_with_toc: boolean;                 // @IsBoolean
  level?: 'OUTPUT' | 'OUTCOME' | 'EOI';     // @IsIn, required when aligns_with_toc
  toc_result_id?: number;                   // @IsInt, required when aligns_with_toc
  indicator_id?: number;                    // @IsInt, required when aligns_with_toc
  quantitative_contribution?: number | null; // @IsNumber @IsOptional
}
```

- **Errors:**
  - 400 `errors.unknown_sp_codes: string[]` — unchanged legacy contract.
  - 400 `errors.toc_alignments: [{ sp_code, field, error }]` — per-alignment: `unknown_toc_result_id`, `unknown_indicator_id`, `level_not_allowed`, `sp_not_selected`, `missing_required_fields`, `duplicate_sp_code`.
  - 409 existing PRMS-sourced / synced conflicts — unchanged.
  - 409 `errors.code: 'toc_mapping_version_locked'` — gate (only when `toc_alignments` present).
  - 503 — cold-cache catalog failure during validation; nothing persisted.
- **Response `data`:** extended `AlignmentResponse` (next endpoint) so PATCH response ≡ GET (R-BIL-096 AC.2).

### GET /api/v1/results/:resultCode/pool-funding-alignment — extended read-back (R-BIL-096)

`AlignmentResponse` gains two fields (additive, snapshot-sourced — never live):

```ts
version_locked: boolean;
toc_alignments: Array<{
  sp_code: string;
  aligns_with_toc: boolean;
  level: 'OUTPUT' | 'OUTCOME' | 'EOI' | null;
  toc_result_id: number | null;
  indicator_id: number | null;
  quantitative_contribution: number | null;
  toc_result_title: string | null;
  indicator_description: string | null;
  unit_of_measurement: string | null;        // from snapshot column unit_messurament
  target_value: string | null;
  target_year: number | null;
}>;
```

This freezes the "final shape owned by backend spec" left open in handoff §4 — relay to FE (D-V2-5).

---

## 6. Workflows & business rules

### 6.1 Catalog read (R-BIL-090)

1. Resolve context (`findPoolFundingAlignmentContext`) — 404 if absent.
2. Compute `result_type` key + `allowed_levels` via `TocLevelRulesUtil` from the result's indicator type (`results.indicator_id` ∈ `IndicatorsEnum`: 1→`capacity_sharing`, 2→`innovation_dev`, 4→`policy_change`, else canonical key with `[]`).
3. `version_locked = context.report_year_id !== MAPPABLE_LIVE_VERSION (2026)`.
4. If unmapped or `allowed_levels` empty → return envelope with `catalogs: []`, **zero upstream calls**.
5. Else fan out `TocIntegrationService.getTocResultsForSps(spCodes, allowedLevels)` (≤ SPs × levels parallel calls; per-call cache).
6. Map upstream → wire shape: `wp_short_name`→`aow_code`; `unit_messurament`→`unit_of_measurement`; `targets[]` → entry with `target_date == '2026'` → `(target_value, 2026)`, else `(null, 2026)`; pass `type_value` through unfiltered.

### 6.2 TocIntegrationService (NFR-BIL-090/091/092)

- `getTocResults(sp, level)` — `GET {ARI_TOC_INTEGRATION_HOST}/api/toc-integration/toc/results/category/{level}/initiative/{sp}`.
- Cache `Map<'${sp}:${level}', { data, fetchedAt }>`, TTL 5 min, singleton scope (same constraint as D-PI-12).
- Failure: warm entry → serve stale + `LoggerUtil.warn({ sp, level, status })`; cold → `ServiceUnavailableException`.
- `{"response":[]}` → cache and return empty (valid catalog). **Never** infer level validity from emptiness — levels come only from `TocLevelRulesUtil`.
- Missing env host → `ServiceUnavailableException` (mirror `PrmsTocService`).

### 6.3 Alignment write (R-BIL-092/093/094/097)

Single transaction (`Repository.manager.transaction`), steps:

1. Existing gates unchanged: result exists; not PRMS-sourced (409); `is_pool_funding_contributor` (400); not synced (409); `sp_codes` normalization + `unknown_sp_codes` (400).
2. If `toc_alignments` present:
   a. Gate: `report_year_id !== 2026` → 409 `toc_mapping_version_locked`.
   b. Structural validation: duplicates, `sp_not_selected`, `missing_required_fields` → collect per-alignment errors.
   c. Catalog validation per "Yes" entry: `level ∈ allowed_levels`; `(toc_result_id, indicator_id)` exists in the cached `(sp, level)` catalog → `level_not_allowed` / `unknown_toc_result_id` / `unknown_indicator_id`. Catalog read through the same cached service; cold-cache failure → 503, abort before any write.
   d. Any collected error → 400 with all per-alignment errors; nothing persisted.
3. Persist `sp_codes` exactly as today (deactivate-and-recreate `_sp` rows — untouched behavior).
4. Per `toc_alignments` entry, **independent upsert** on `(result_id, sp_code)`: update the active row in place or insert; never touch rows for SPs absent from `toc_alignments`. Snapshots copied from the validated catalog entry on "Yes"; ToC/snapshot columns nulled on "No".
5. Cascade: deactivate active ToC rows whose `sp_code` ∉ effective `sp_codes` (R-BIL-093).
6. Side effects unchanged: audit fields, `ResultReviewHistory` entry (note text mentions ToC alignment change), socket `POOL_FUNDING_ALIGNMENT_CHANGED` (payload unchanged — D-V2-6).
7. Response: re-read alignment detail (extended `AlignmentResponse`).

Rollback: transaction aborts atomically on any step failure; no compensation needed.

---

## 7. Frontend impact

No admin SSR change. STAR FE consumes the frozen contract from its own spec (`alliance-research-indicators-client/docs/specs/bilateral-module/toc-mapping-v2/`); the §5 read-back shape must be relayed to the FE (D-V2-5). No `client/` changes from this spec.

---

## 8. Integration impact

| System | Impact |
| --- | --- |
| lambda-toc (new) | `domain/tools/toc-integration/`; env `ARI_TOC_INTEGRATION_HOST` (no default — missing ⇒ 503; already set in `.env`; add to `.env.example`). No auth headers. DNS caveat: hostname needed 8.8.8.8 on a local resolver (2026-06-09) — flag to infra before testing deploy. |
| PRMS public framework | Untouched until cutover; then `domain/tools/prms-toc/` deleted + `ARI_PRMS_TOC_HOST` removed (R-BIL-098). |
| CLARISA | Projects/SP chain unchanged. `getAreasOfWorkBySp` leaves this flow at cleanup; service retained. |
| Socket.IO | Existing event only; no new contracts. |
| Cron / RabbitMQ / DynamoDB / OpenSearch | None. |

---

## 9. Security & authorization

- Roles/guards on all three endpoints unchanged (read: authenticated; PATCH: `CONTRIBUTOR`/`CENTER_ADMIN`/`SYSTEM_ADMIN` + `ResultOwnerGuard`; `SYSTEM_ADMIN` bypass per platform rule).
- Machine token: no new exposure; endpoints keep current visibility.
- lambda-toc is called **server-side only**; its no-auth nature is not re-exposed (our endpoints stay behind JWT). If upstream adds auth later, `TocIntegrationService` is the single place to add headers (R-1).
- No PII; catalog and alignment data are programmatic/organizational.

---

## 10. Observability

- `LoggerUtil.warn` on stale-serve: `{ sp, level, upstreamStatus }`; `LoggerUtil.error` before cold-cache 503.
- 4xx/5xx log levels via `ResponseInterceptor` (inherited).
- No new `sync_process_log` types, metrics, or tracing.

---

## 11. Testing strategy

- **Unit:** `toc-integration.service.spec.ts` (cache TTL with fake timers, warm/cold failure, empty-payload caching, fan-out call count/parallelism, missing env); `toc-level-rules.util.spec.ts` (rule table, unknown types); `bilateral.service.spec.ts` updated (reshaped read incl. mapped/unmapped/empty/`allowed_levels: []`/`version_locked`; write: per-SP independence, "No" rows, cascade, every 400 error code, 409 gate, snapshot persistence, legacy-body passthrough); `bilateral.controller.spec.ts` updated (Swagger/permission paths).
- **Read-back drift test:** save → mock upstream empty → GET still returns snapshots (R-BIL-095 AC.1).
- **E2E:** extend bilateral e2e if present; else covered by service-level specs (global 60% threshold holds).
- **Mock strategy:** lambda-toc mocked at `HttpService` level with handoff §2 fixture payloads (same fixtures the FE uses, to keep contract parity).
- Migration applies forward and reverts cleanly (`npm run migration:revert`).

---

## 12. Rollout

1. **Order:** migration deploys with the code PR that uses it (table is new; no coordination hazard).
2. **Flag:** none — the reshape is the cutover; rollback is `git revert` + `migration:revert` (no data loss risk while FE is fixture-bound).
3. **Cutover verification (gates R-BIL-098 cleanup):** FE integration passes against testing; warm/cold cache behavior observed in logs; then the cleanup PR removes `prms-toc/`.
4. **Comms:** STAR FE (read-back shape §5, D-V2-5); infra (DNS caveat); BA via Juanca (OQ statuses).
5. **Deadline:** read path (T-01…T-04) is the critical path for the 2026-06-11 testing demo.

---

## 13. Design decisions log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D-V2-1 | 2026-06-09 | New tool module `toc-integration` + new table `result_pool_funding_toc_alignment` (proposal Option A; settles OQ-V2-9) | Per-SP independent upsert falls out of the schema; old flow stays runnable until cutover; OQ-V2-3 flip = one index change. |
| D-V2-2 | 2026-06-09 | Reshape `hlos-indicators` in place, same `/v1` | Sole consumer is the unshipped STAR FE; a parallel endpoint would double the surface for nothing. Verified before landing (T-02). |
| D-V2-3 | 2026-06-09 | `allowed_levels` computed only in `TocLevelRulesUtil`, used by both read and write | Single source of truth (R-BIL-091 AC.3); FE never re-derives. |
| D-V2-4 | 2026-06-09 | Snapshot column stores upstream spelling `unit_messurament`; wire exposes `unit_of_measurement` | Handoff mandates verbatim mirror of upstream; rename is a wire-layer concern. |
| D-V2-5 | 2026-06-09 | Read-back `toc_alignments[]` shape frozen in §5 (flat, snapshot-sourced, `version_locked` beside it) | Handoff delegates final write/read-back shape to backend; freezing it here unblocks FE fixtures. |
| D-V2-6 | 2026-06-09 | `POOL_FUNDING_ALIGNMENT_CHANGED` payload unchanged | FE refetches on the event; embedding ToC data would duplicate the GET contract. |
| D-V2-7 | 2026-06-09 | Version gate anchors on `results.report_year_id` (`report_years.report_year`, literal year) vs `MAPPABLE_LIVE_VERSION = 2026` constant | Field already returned by `findPoolFundingAlignmentContext`; no new query. Constant, not env var — the handoff says *hardcode*. |
| D-V2-8 | 2026-06-09 | Validation failures are atomic (whole PATCH 400s; no partial persist) | Per-SP independence governs *saved* state, not partial acceptance of an invalid request; FE gets all errors at once. |

---

## 14. Open questions

Carried from requirements §12 (OQ-V2-2/3/5/6) — owners and gating unchanged; none block this design.

---

## 15. References

- Client handoff: `alliance-research-indicators-client/docs/specs/bilateral-module/toc-mapping-v2/backend-handoff.md`
- Pattern sources: `src/domain/tools/prms-toc/prms-toc.service.ts` (cache/resilience), `src/db/migrations/1779190000014-fixResultPoolFundingAlignmentPartialUnique.ts` (partial-unique generated column)
- Parent specs: [`../pending-items/design.md`](../pending-items/design.md) (D-PI-9, D-PI-11, D-PI-12), [`../design.md`](../design.md)
