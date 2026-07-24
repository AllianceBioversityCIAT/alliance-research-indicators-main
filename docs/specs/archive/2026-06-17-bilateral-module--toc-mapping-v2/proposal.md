# Proposal — ToC Mapping v2 (lambda-toc integration)

> Backend mirror of the client handoff [`alliance-research-indicators-client/docs/specs/bilateral-module/toc-mapping-v2/backend-handoff.md`](../../../../../alliance-research-indicators-client/docs/specs/bilateral-module/toc-mapping-v2/backend-handoff.md) (2026-06-09). Replaces the (SP, AOW)-pair PRMS ToC read flow with a level-based catalog sourced from the `lambda-toc` service, reshapes the `hlos-indicators` read endpoint to the frozen FE wire contract, and extends the alignment write side with per-SP ToC alignments.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral-module/toc-mapping-v2/` |
| Created | 2026-06-09 |
| Status | Proposed — awaiting approval |
| Branch | `AC-1594-bilateral-module-v2` |
| Source | Client handoff `toc-mapping-v2/backend-handoff.md` (FE wire contract frozen there, §4–5) |
| Env var | `ARI_TOC_INTEGRATION_HOST=https://lambda-toc.clarisa.cgiar.org` — already set in `server/researchindicators/.env` (2026-06-09) |
| Deadline pressure | FE targets a working demo in testing for Fabio by **Wednesday 2026-06-11**; client builds against Jest fixtures of the frozen contract meanwhile |
| Supersedes | The (SP, AOW)-pair ToC read of `docs/specs/bilateral-module/pending-items/` (T-15.12 lineage) and the ToC-read material in `docs/specs/bilateral-module/indicator-mapping/` |

---

## 2. Intent

Let a STAR result contributor align each Science Program (SP) on a bilateral result to a specific ToC result + indicator from the new `lambda-toc` catalog — browsing by **level** (`OUTPUT` / `OUTCOME` / `EOI`) instead of by (SP, AOW) pair — and persist one independent alignment per SP, with a quantitative contribution and display snapshots that survive upstream catalog drift.

## 3. Problem / Current Behavior

The current ToC read flow (`GET /api/v1/results/:resultCode/pool-funding-alignment/hlos-indicators`, `bilateral.service.ts:205-371`) was built against the old PRMS public results framework:

1. **Source**: `PrmsTocService` (`domain/tools/prms-toc/prms-toc.service.ts`) calls `ARI_PRMS_TOC_HOST` once per (SP, AOW) pair, where AOWs come from `ClarisaCgiarEntitiesService.getAreasOfWorkBySp`. The PRMS team has moved this flow to `lambda-toc`, which is keyed by **(SP, level)** — the AOW dimension is gone from the request path (AOW survives only as a display attribute, `wp_short_name`).
2. **Shape**: the response envelope is `pairs[]` + `aow_status` + `no_aow_mappings`, with `outcomes[]`/`outputs[]` per pair. The agreed UX (2026-05-28, see memory: bilateral mapping is indicator-level only) browses per SP per level, picks one ToC result + indicator, and enters a quantitative contribution — the pair envelope cannot express that.
3. **Write side**: `PATCH /api/v1/results/:resultCode/pool-funding-alignment` persists only `has_contribution` + `sp_codes[]` (`result_pool_funding_alignment` / `_sp` tables). There is nowhere to store *which* ToC result/indicator each SP aligns to, and the current write deactivates-and-recreates all `_sp` rows wholesale — it cannot honor "saving SP01 never mutates SP03".
4. **Rules live nowhere**: there is no server-side `result_type → allowed_levels` rule (Capacity Sharing/Innovation Dev → `OUTPUT`; Policy Change → `OUTCOME`, `EOI`), and no version gate restricting mapping to live version 2026.

## 4. Proposed Outcome

After this change:

- **Read**: `GET …/hlos-indicators` returns the frozen FE envelope (handoff §4): `result_code`, `mapping_status`, `clarisa_project`, `result_type` (canonical backend-owned enum key), `allowed_levels[]`, `version_locked`, and `catalogs[]` — one entry per SP, one `levels[]` entry per allowed level, each with `toc_results[]` (id, title, description, `aow_code` from `wp_short_name`) and `indicators[]` (id, description, `unit_of_measurement` — renamed from upstream's `unit_messurament` — `type_value`, and a single `(target_value, target_year)` resolved for 2026). The 11-year `targets[]` array never reaches the FE. No indicator-type filtering yet (OQ-V2-2): ship `type_value` through unfiltered.
- **Catalog source**: a new `TocIntegrationService` calls `GET {ARI_TOC_INTEGRATION_HOST}/api/toc-integration/toc/results/category/{LEVEL}/initiative/{SP}`, with the same resilience pattern as `PrmsTocService`: in-memory 5-min TTL cache keyed `${sp}:${level}`, warm cache served on upstream failure (warn log), cold cache → 503, `{"response":[]}` treated as a valid cacheable empty catalog. Fan-out helper for `sps × levels` (typically ≤ 2 × 2 parallel calls).
- **Rule**: the server computes `allowed_levels` from the result's type — Capacity Sharing for Development → `[OUTPUT]`, Innovation Development → `[OUTPUT]`, Policy Change → `[OUTCOME, EOI]`, anything else → `[]` (FE hides the ToC block; pending OQ-V2-5) — and embeds it in the read response so the FE never re-derives it.
- **Write**: the existing `PATCH …/pool-funding-alignment` body gains `toc_alignments[]` (handoff §4 write envelope): per SP, `aligns_with_toc`, `level`, `toc_result_id`, `indicator_id`, `quantitative_contribution`. One alignment row per `(result, sp_code)`, independently upserted; removing an SP from `sp_codes` cascades its alignment row to inactive. Rows denormalize display snapshots (`toc_result_title`, `indicator_description`, `unit_messurament`, `target_value`, `target_year`) as the catalog-drift / 2027-versioning hedge. Validation: existing `unknown_sp_codes` 400 contract preserved; new per-alignment 400s (`sp_code` + field) for unknown `toc_result_id`/`indicator_id` or disallowed `level`; existing 409s preserved.
- **Version gate**: live version hardcoded to **2026**; create/edit on results with live version ≠ 2026 → 409 with error code `toc_mapping_version_locked`; read response carries `version_locked: true` so the FE renders the locked state.
- **Cutover**: `PrmsTocService` / `ARI_PRMS_TOC_HOST` and `getAreasOfWorkBySp` usage in this flow stay untouched until cutover is verified in testing, then are removed in a cleanup task.

## 5. Scope

1. New `domain/tools/toc-integration/` module: `TocIntegrationService` + types + spec, env wiring for `ARI_TOC_INTEGRATION_HOST`.
2. Reshape `BilateralService.getHlosIndicatorsForResult` + `bilateral-hlos-indicators.response.dto.ts` to the §4 frozen envelope (in place — no parallel endpoint; STAR client is the only consumer and the module is unshipped).
3. `result_type → allowed_levels` rule (single server-side source of truth) + `result_type` canonical enum key in the read response.
4. Persistence for per-SP ToC alignments (new table — see §10) + append-only migration.
5. Extend `UpdatePoolFundingAlignmentDto` + `BilateralService.updateAlignment` with `toc_alignments[]`, per-SP independent upsert, cascade-to-inactive, validation errors, review-history logging, socket event payload update if shape changes.
6. Version gate (hardcoded 2026) on the write path + `version_locked` on the read path.
7. Tests: sibling specs for the new service, reshaped read, extended write, rule, and gate (≥ 60% coverage threshold).
8. Spec-doc hygiene: archive the ToC-read material in `indicator-mapping/` and the AOW-pair sections of `pending-items/` (handoff §6); update parent `bilateral-module` docs.
9. Cleanup task (post-cutover, separately gated): delete `PrmsTocService`, `ARI_PRMS_TOC_HOST`, and the AOW fan-out path.

## 6. Non-Goals

- Versioning proper (2027 rollover) — pending the Enrico conversation; the snapshot columns are the only hedge shipped now.
- Indicator-type filtering (OQ-V2-2) — ship unfiltered with `type_value` passthrough; flipping the filter on is a later, FE-side or trivial backend change.
- Level rules for result types beyond Capacity Sharing / Innovation Dev / Policy Change (OQ-V2-5) — they get `allowed_levels: []` until the BA rules.
- Any change to the resolution chain (result → AGRESSO contract → `bilateral_project_mapping` → CLARISA project → SP codes) or the portfolio filter `ARI_BILATERAL_ACTIVE_PORTFOLIO` (default `P25`) — it survives as-is.
- HLO-level (result-level-only) mapping — settled 2026-05-28: mapping is indicator-level; HLO grouping is display-only.
- The admin mapping panel, PRMS-sourced result handling, and the indicator-mapping handler machinery (`result_pool_funding_indicator_mapping` + type handlers) — untouched.
- `client/` — the FE builds against the frozen contract in its own repo.

## 7. Affected Users, Systems, And Specs

| Kind | Item | Impact |
| --- | --- | --- |
| Users | STAR result contributors (Contributor/Center Admin/Sys Admin roles) | New per-SP ToC alignment flow |
| Code | `src/domain/entities/bilateral/` (controller, service, DTOs, repositories) | Read reshape, write extension, rule, gate |
| Code | `src/domain/tools/toc-integration/` (new) | New upstream client |
| Code | `src/domain/tools/prms-toc/` | Frozen, then deleted post-cutover |
| Code | `src/domain/tools/clarisa/cgiar-entities/` | `getAreasOfWorkBySp` loses its only ToC-flow consumer (service itself stays) |
| DB | New alignment-detail table + migration; existing tables untouched | Append-only |
| Upstream | `lambda-toc.clarisa.cgiar.org` (no auth observed, CloudFront-fronted) | New runtime dependency |
| Specs | `docs/specs/bilateral-module/{requirements,design,tasks}.md` | Updated by `/sdd-specify` |
| Specs | `docs/specs/bilateral-module/indicator-mapping/`, `pending-items/` | ToC-read / AOW-pair sections archived (handoff §6) |

## 8. Requirement Delta Preview

### ADDED Requirements

- `TocIntegrationService` sourcing the ToC catalog from `ARI_TOC_INTEGRATION_HOST` by (SP, level), with cache/resilience parity to the retiring service.
- Server-computed `allowed_levels` per result type, embedded in the read response.
- `result_type` canonical enum key in the read response.
- Per-SP ToC alignment persistence: one row per `(result, sp_code)` with `level`, `toc_result_id`, `indicator_id`, `quantitative_contribution`, and denormalized display snapshots.
- `toc_alignments[]` in the PATCH body with per-alignment validation errors.
- Version gate: 409 `toc_mapping_version_locked` for live version ≠ 2026; `version_locked` flag on read.
- Backend resolution of `targets[]` → single `(target_value, target_year)` for 2026.

### MODIFIED Requirements

- `GET …/hlos-indicators` response envelope: `pairs[]`-based → `catalogs[]`-based (frozen FE contract). Same route, reshaped in place.
- `PATCH …/pool-funding-alignment`: body extended; `sp_codes` removal now cascades the SP's ToC alignment row to inactive.
- Upstream field `unit_messurament` is exposed to the FE as `unit_of_measurement` (stored verbatim in snapshots).

### REMOVED Requirements

- AOW enumeration in the ToC read flow (`getAreasOfWorkBySp` fan-out).
- `pairs[]`, `aow_status`, `no_aow_mappings` envelope machinery.
- `PrmsTocService` / `ARI_PRMS_TOC_HOST` for this flow (post-cutover cleanup task).

## 9. Approach Options

### A. New service + new alignment-detail table (recommended)

New `TocIntegrationService` alongside the old one; new table (e.g. `result_pool_funding_toc_alignment`) keyed `(result_id, sp_code)` with partial-unique active row (the established generated-column pattern from migrations `…0014`).

- ✅ Per-SP independent upsert falls out naturally; the deactivate-and-recreate behavior of `_sp` rows stays untouched.
- ✅ "N alignments per SP" (if OQ-V2-3 flips) is a unique-index change, not a schema redesign.
- ✅ Old flow stays runnable until cutover is verified; rollback = route flip.
- ⚠️ One more table + one more upstream client module (deleted later only for the client).

### B. Extend `result_pool_funding_alignment_sp` with ToC columns

Add `level`, `toc_result_id`, `indicator_id`, contribution + snapshot columns to the existing `_sp` table.

- ✅ No new table; alignment and ToC choice live on the same row.
- ❌ The write path recreates all `_sp` rows on every PATCH — honoring "saving SP01 never mutates SP03" requires rewriting that whole path and its history semantics, touching shipped T-15.x behavior.
- ❌ Cardinality margin (OQ-V2-3) is awkward: N alignments per SP would mean N `_sp` rows per SP, breaking the "selected SPs" semantics.

### C. Retrofit `PrmsTocService` to the new upstream

Point the existing service at `ARI_TOC_INTEGRATION_HOST` and reshape its types.

- ✅ Least new code.
- ❌ Different request key (`sp:level` vs `sp-aow`), different payload, different 404/empty semantics — a retrofit is a rewrite wearing the old name, and it forfeits the safe-cutover window the handoff explicitly asks to keep.

## 10. Recommended Approach

**Option A.** It is the smallest path that satisfies all four fixed invariants from the handoff (§3.4): per-SP independence, cardinality margin, snapshot denormalization, and cascade-on-SP-removal — while leaving every shipped T-15.x behavior and the old service untouched until cutover is verified. This settles **OQ-V2-9 (backend decision): new table.**

Sequencing: catalog service → read reshape (unblocks FE integration, the Wednesday demo path) → persistence + write extension → version gate → tests/docs → post-cutover cleanup.

## 11. Risks, Dependencies, And Open Questions

**Risks / dependencies**

- `lambda-toc` has **no auth** observed and is CloudFront-fronted — confirm this is intentional and stable for server-to-server use.
- DNS: the hostname failed to resolve on a local resolver on 2026-06-09 (needed 8.8.8.8). Flag to infra if the server environment uses a custom resolver — this would surface as cold-cache 503s.
- Empty `{"response":[]}` is ambiguous between "bad level" and "no data" (no 404 on unknown levels) — level validity must come from the server-side rule, never inferred from responses.
- Reshaping the endpoint in place is safe **only** while the STAR client is the sole consumer and the module is unshipped — re-verify before landing.
- Timeline: FE demo target Wednesday 2026-06-11 puts the catalog service + read reshape on the critical path.

**Open questions (answers route back through Juanca)**

| ID | Question | Blocking? |
| --- | --- | --- |
| OQ-V2-1 | Confirm `OUTPUT`/`OUTCOME`/`EOI` are canonical, stable category values across SPs | No (verified empirically on SP01) |
| OQ-V2-2 | Indicator-type filter: strict / include `custom` / none | Final behavior yes; build no (ship unfiltered + `type_value`) |
| OQ-V2-3 | Exactly one (level, ToC result, indicator) per SP? | Yes for table-design margin (Option A absorbs a flip) |
| OQ-V2-5 | Level rules / visibility for result types beyond the three known | Yes, for those types only (`allowed_levels: []` meanwhile) |
| OQ-V2-6 | Target year = live-version year (2026)? Mockup copy says 2025 | No (assume 2026) |
| OQ-V2-9 | Persistence: new table vs reshape | **Settled by this proposal: new table (Option A)** |

## 12. Success Criteria

1. `GET …/hlos-indicators` returns the frozen §4 envelope byte-compatible with the FE's Jest fixtures, for mapped, unmapped, empty-catalog, `allowed_levels: []`, and `version_locked` results.
2. Catalog reads survive upstream outage with a warm cache (warn log) and return 503 only on cold cache; `{"response":[]}` is served and cached as a valid empty catalog.
3. PATCH with `toc_alignments[]` upserts per SP independently — saving SP01 leaves SP03's row untouched (verified by test); removing an SP from `sp_codes` deactivates its alignment row.
4. Unknown `toc_result_id`/`indicator_id` or disallowed `level` → 400 with `sp_code`-scoped errors; `unknown_sp_codes` contract unchanged; live version ≠ 2026 → 409 `toc_mapping_version_locked`.
5. Saved alignments render from snapshots even when the upstream catalog no longer contains the chosen ToC result.
6. `npm test`, `npm run lint`, `npm run build` pass from `server/researchindicators/`; coverage threshold holds.
7. Old PRMS flow untouched and removable in an isolated cleanup commit post-cutover.

## 13. Next Step

```text
/sdd-specify bilateral-module/toc-mapping-v2
```
