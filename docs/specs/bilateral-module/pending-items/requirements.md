# Requirements — Bilateral / Pending items (Phase 1.5 + architectural deltas + Phase 3+ re-pricing)

- **Module:** bilateral
- **Spec id:** 2026-05-bilateral-pending-items
- **Status:** draft
- **Owner:** ARI backend team
- **Linked PRD section:** [`../../../prd.md`](../../../prd.md) — bilateral / pool-funding scope
- **Linked tickets:** AC-1594
- **Last updated:** 2026-05-23
- **Extends:** [`../requirements.md`](../requirements.md) (R-BIL-001..069). Adds R-BIL-070..R-BIL-075 + NFR-BIL-070..072, and MODIFIES R-BIL-015 / R-BIL-034 (read-only gate).
- **Input proposal:** [`./proposal.md`](./proposal.md) (approved 2026-05-23, commit `c6709e67`).

---

## 1. Context

The bilateral module landed in three waves (Phase 0–2 backend, AGRESSO tag, alignment + indicator mapping). After integrating the FE picker against the new mockup (which requires Science Programs, not Levers), a 2026-05-23 SP catalog wave shipped: a singleton `clarisa_science_programs` catalog seeded by migration `1779190000010`, an SP-aware `selected_science_programs[]` alignment response, and an `sp_codes` input on PATCH.

That wave surfaced follow-ons that the original `tasks.md` did not anticipate: (i) catalog input validation, (ii) a source-based read-only gate (PRMS-sourced results must be read-only in STAR), (iii) periodic sync of the catalog from a two-upstream model (CLARISA for `code` / `name` / `category`, PRMS Reporting for `color` / `reporting_enabled` / `prms_id`), (iv) sibling `*.spec.ts` coverage that was deferred during the wave, and (v) operational deployment of the seed migration to non-local environments.

This spec captures those follow-ons and re-prices the still-pending Phase 3–6 tasks against current state. It does NOT re-open Phase 0–2 requirements (R-BIL-001..069) — those remain authoritative.

Not changing: existing alignment / mapping / contribution endpoints, AGRESSO tag endpoint, Phase 3 push design, Phase 4 W3 sync design, original `tasks.md` Phase 0–2 entries.

---

## 2. Requirement numbering

Continues the parent spec's `R-BIL-<NNN>` sequence starting at 070. NFRs use `NFR-BIL-<NNN>` starting at 070.

---

## 3. Functional requirements

### R-BIL-070 — Validate `sp_codes` against the SP catalog on PATCH alignment

- **As a** STAR bilateral contributor
- **I want** the backend to reject unknown Science Program codes on PATCH alignment
- **So that** typos and stale FE bundles do not silently persist invalid pool-funding alignments

**Details:**
- Inputs: `UpdatePoolFundingAlignmentDto.sp_codes: string[]` (preferred) or `.lever_codes: string[]` (deprecated back-compat) on `PATCH /api/v1/results/:resultCode/pool-funding-alignment`.
- Behavior:
  - Normalize input (trim, dedupe, drop blanks).
  - When `has_contribution === true` and the resulting list is non-empty, look up every code against the active `clarisa_science_programs` rows (`is_active = true`).
  - If any code is not in the catalog, throw `BadRequestException` with `errors` payload `{ unknown_sp_codes: string[] }`.
  - When `has_contribution === false`, do not validate codes (they are dropped per existing R-BIL-014 behavior).
- Outputs: unchanged on success (existing `AlignmentResponse`).
- Errors: `400` (validation), `409` (existing PRMS-synced or new source-based read-only — see R-BIL-071), `403` (existing ownership / role).
- Permissions: same matrix as R-BIL-013 / R-BIL-014 — Creator / PI / contact, `CENTER_ADMIN`, `SYSTEM_ADMIN`.

**Acceptance criteria:**
- [ ] AC.1 — `PATCH` with `sp_codes: ["SP01","SP99"]` returns `400`, `description = "Unknown Science Program codes"`, `errors = { unknown_sp_codes: ["SP99"] }`.
- [ ] AC.2 — `PATCH` with `sp_codes: ["SP01","SP06"]` (both seeded) returns `200` and persists exactly those two rows in `result_pool_funding_alignment_sp`.
- [ ] AC.3 — `PATCH` with `has_contribution: false` and unknown `sp_codes` returns `200` (validation skipped) and clears the alignment selection.
- [ ] AC.4 — Validation hits the catalog at most once per request (no N+1 lookups).

**Out of scope:**
- Validating against PRMS `reporting_enabled` flag — covered separately when R-BIL-074 + R-BIL-072 land.

---

### R-BIL-071 — Source-based read-only gate (PRMS-sourced results are read-only on bilateral surfaces)

- **As a** STAR bilateral contributor viewing a PRMS-sourced result
- **I want** the bilateral alignment + mapping endpoints to return read-only and reject mutations
- **So that** PRMS remains the source of truth for results it owns, and STAR never accidentally overwrites mapped metadata

**Details:**
- Inputs: existing alignment + mapping endpoints, all verbs.
- Behavior:
  - Read endpoints (`GET .../pool-funding-alignment`, `GET .../indicators`) — set `is_read_only = true` and `is_synced_to_prms` unchanged when `result.platform_code === 'PRMS'`.
  - Write endpoints (`PATCH .../pool-funding-alignment`, contribution POST/PATCH/DELETE) — return `409 Conflict` with `description = "Result is PRMS-sourced; bilateral alignment is read-only in STAR"` when `result.platform_code === 'PRMS'`.
  - When `result.platform_code === 'STAR'`, behavior is unchanged from R-BIL-014 / R-BIL-030..035.
  - The existing `is_synced_to_prms`-based read-only path (R-BIL-015 / R-BIL-034) continues to fire for STAR-sourced results that were pushed to PRMS.
- Outputs: existing `AlignmentResponse.is_read_only` carries the union of both gates.
- Errors: `409` with the new description text on writes; reads unchanged.
- Permissions: gate runs before role/ownership checks so a `SYSTEM_ADMIN` also receives `409` on PRMS-sourced results (the constraint is architectural, not authorization-driven).

**Acceptance criteria:**
- [ ] AC.1 — `GET` on a PRMS-sourced result returns `is_read_only: true` regardless of `is_synced_to_prms`.
- [ ] AC.2 — `PATCH` on a PRMS-sourced result returns `409` with the new description, even for `SYSTEM_ADMIN`.
- [ ] AC.3 — `PATCH` on a STAR-sourced result that is also PRMS-synced continues to return `409` with the existing R-BIL-015 description (no regression).
- [ ] AC.4 — `PATCH` on a STAR-sourced, non-synced result returns `200` (no false positive).

**Out of scope:**
- Re-architecting the bilateral surface to operate against PRMS via a separate read-only adapter — that is a future-spec item.

---

### R-BIL-072 — Periodic two-upstream sync of `clarisa_science_programs`

- **As a** platform operator
- **I want** the SP catalog to refresh automatically from CLARISA and PRMS Reporting on a schedule
- **So that** SP rebrands, new SPs, color changes, and reporting-cycle toggles propagate without a code release

**Details:**
- Upstream split:
  - **CLARISA `/api/cgiar-entities`** owns: existence, `official_code`, `name`, `category`. Filter to `cgiarEntityTypeDTO.name IN ('Science programs','Scaling programs','Accelerators')` AND `official_code REGEXP '^SP[0-9]{2}$'`. Dedupe by code (latest `year` wins). Trim `name`.
  - **PRMS Reporting `/api/results/admin-panel/phases/:phaseId/reporting-initiatives`** enriches existing rows with: `color`, `reporting_enabled` (R-BIL-074), `prms_id` (R-BIL-074). The active `phaseId` is configured via env (`ARI_PRMS_REPORTING_PHASE_ID`, default `6` for the 2025 cycle).
  - Conflict policy: CLARISA wins on existence; PRMS columns are NEVER written by the CLARISA sync, and CLARISA-owned columns are NEVER written by the PRMS sync.
- Behavior:
  - One cron in `tools/cron-jobs/clarisa.cron.ts` (CLARISA leg) and one in `tools/cron-jobs/prms-reporting.cron.ts` (PRMS leg). Schedule: daily at 03:00 UTC (CLARISA), daily at 03:15 UTC (PRMS) — gives the catalog time to settle before downstream consumers wake.
  - Each leg writes a `sync_process_log` row (`process = 'clarisa.science-programs'` / `'prms-reporting.science-programs'`).
  - Both legs are gated behind a single feature flag `ARI_BILATERAL_SP_SYNC_ENABLED` (default `false`).
  - On startup, when the table is empty AND the flag is on, run both legs immediately (one-shot bootstrap).
- Outputs: catalog rows upserted; sync log rows; no API contract change.
- Errors: each leg is independent; one leg failing does not block the other. Errors logged via `LoggerUtil` and surfaced in `sync_process_log.status`.
- Permissions: cron context only; no HTTP surface.

**Acceptance criteria:**
- [ ] AC.1 — With `ARI_BILATERAL_SP_SYNC_ENABLED=true`, after the CLARISA leg runs, all 13 SP codes are present and CLARISA-owned columns match the upstream (post-filter, post-dedupe, post-trim).
- [ ] AC.2 — After the PRMS leg runs, `color` / `reporting_enabled` / `prms_id` columns on existing rows reflect PRMS values; unmatched codes (e.g. SGP-02 in PRMS) are ignored.
- [ ] AC.3 — A CLARISA fetch failure (network / non-2xx) is logged and recorded in `sync_process_log` with `status = 'failed'`, but does NOT delete or invalidate existing rows.
- [ ] AC.4 — With `ARI_BILATERAL_SP_SYNC_ENABLED=false`, neither cron fires and no `sync_process_log` row is created.
- [ ] AC.5 — Running the PRMS leg before the CLARISA leg on an empty table results in zero rows updated (PRMS only enriches existing rows; it does not create them).

**Out of scope:**
- Synchronising **indicators per SP** (that is T-31, separately tracked).
- Multi-phase support — only the active reporting phase is read.

---

### R-BIL-073 — Rename `result_pool_funding_alignment_sp.lever_code` → `sp_code`

- **As a** future maintainer of the bilateral module
- **I want** the column name to reflect its actual content (SP codes, not Lever codes)
- **So that** schema queries and joins are not misled by a legacy name

**Details:**
- Inputs: none (schema-only change).
- Behavior:
  - New migration `<timestamp>-renameLeverCodeToSpCodeOnAlignmentSp.ts` runs `ALTER TABLE result_pool_funding_alignment_sp CHANGE COLUMN lever_code sp_code VARCHAR(50) NOT NULL`.
  - Entity `ResultPoolFundingAlignmentSp` column rename + property rename.
  - Repository, service references updated.
  - Index renamed: `idx_result_pool_funding_alignment_sp_lever` → `idx_result_pool_funding_alignment_sp_sp`.
  - DOWN migration restores the old name (data preserved either way).
- Outputs: existing API contract unchanged (response shape still uses `code` field on `selected_science_programs[]`; legacy `selected_levers[].lever_code` still populated from the renamed column).
- Errors: none expected.
- Permissions: n/a.

**Acceptance criteria:**
- [ ] AC.1 — Migration applies forward without data loss (rows preserved).
- [ ] AC.2 — Migration reverts cleanly via `npm run migration:revert`.
- [ ] AC.3 — `GET .../pool-funding-alignment` still returns populated `selected_levers[]` and `selected_science_programs[]` after the migration (no regression).
- [ ] AC.4 — `grep -r "lever_code" src/domain/entities/bilateral/` returns no production-code matches (only DTO comment + deprecated DTO field name remain).

**Out of scope:**
- Renaming the deprecated `UpdatePoolFundingAlignmentDto.lever_codes` field — kept as-is for FE back-compat.

---

### R-BIL-074 — Extend `clarisa_science_programs` with `reporting_enabled`, `prms_id`, `icon_key`

- **As a** STAR FE engineer rendering the SP picker
- **I want** the catalog response to carry PRMS reporting state, PRMS ID, and an icon key
- **So that** the FE can grey out non-reporting SPs, the future push mapper has a stable FK, and the FE bundles icons by a canonical key

**Details:**
- Inputs: none (catalog schema + read API change).
- Behavior:
  - New migration adds three nullable columns: `reporting_enabled BOOLEAN NULL`, `prms_id INT NULL UNIQUE`, `icon_key VARCHAR(64) NULL`.
  - Seed (in the same migration) populates `icon_key = official_code` for the 13 seeded rows; leaves `reporting_enabled` and `prms_id` NULL pending the first PRMS sync (R-BIL-072).
  - `ClarisaScienceProgram` entity adds the three properties.
  - `GET /api/tools/clarisa/science-programs[/<:code>]` response shape adds the three fields.
  - `selected_science_programs[]` on `AlignmentResponse` adds optional `reporting_enabled` and `icon_key` fields (does NOT expose `prms_id` — internal only).
- Outputs: new fields on existing JSON responses.
- Errors: none.
- Permissions: unchanged.

**Acceptance criteria:**
- [ ] AC.1 — Migration applies forward; the 13 seeded rows have `icon_key = official_code`, `reporting_enabled = NULL`, `prms_id = NULL`.
- [ ] AC.2 — After R-BIL-072 PRMS sync runs, the 13 rows have non-null `reporting_enabled` and `prms_id`.
- [ ] AC.3 — `GET /api/tools/clarisa/science-programs` response carries the new fields with correct null-handling.
- [ ] AC.4 — `selected_science_programs[]` on alignment GET carries `reporting_enabled` and `icon_key` but NOT `prms_id`.

**Out of scope:**
- Using `reporting_enabled` to gate validation in R-BIL-070 (deferred to future spec; current validation accepts any active catalog row).

---

### R-BIL-075 — Operational rollout of the SP catalog seed migration

- **As a** platform operator
- **I want** migration `1779190000010` (and the new migrations from this spec) applied to dev, staging, and production
- **So that** the SP catalog endpoint stops returning 500 in any environment

**Details:**
- Inputs: existing migration pipeline (`npm run migration:execute` against the deployed `dist/`).
- Behavior:
  - Migrations land on dev first, then staging, then production, in order: `1779190000010` (seed) → `<R-BIL-073 rename>` → `<R-BIL-074 columns + icon_key seed>`.
  - Operator confirms `GET /api/tools/clarisa/science-programs` returns 200 with 13 rows on each environment.
- Outputs: deployment artefacts (no code change).
- Errors: standard migration revert path if a migration fails on a target env (`npm run migration:revert`).
- Permissions: ops-only.

**Acceptance criteria:**
- [ ] AC.1 — All three migrations applied on dev; smoke-test `GET /api/tools/clarisa/science-programs` returns 200 + 13 rows.
- [ ] AC.2 — Same on staging.
- [ ] AC.3 — Same on production.
- [ ] AC.4 — A `result.pool-funding-alignment.changed` socket emission on each env produces no errors (sanity check that the bilateral DI graph still resolves post-rename).

**Out of scope:**
- Production rollout of the live periodic sync (R-BIL-072) — handled with its own operational gate `ARI_BILATERAL_SP_SYNC_ENABLED`.

---

## 4. Non-functional requirements

### NFR-BIL-070 — Spec coverage for bilateral + SP modules

- **Category:** dx / quality
- **Target:** sibling `*.spec.ts` files exist for `BilateralService`, `BilateralController`, `ClarisaScienceProgramsService`, `ClarisaScienceProgramsController`; project coverage stays ≥ 60% per `src/CLAUDE.md` §9.
- **How verified:** `npm run test:cov` in CI; coverage badge on PR.

### NFR-BIL-071 — Doc updates aligned with code

- **Category:** dx
- **Target:** `bilateral-module/design.md` carries §3.6 (two-upstream sync) + §3.7 (source-based read-only); `bilateral-module/frontend-handoff.md` §4.6 updated with R-BIL-070 validation behavior + R-BIL-071 read-only gate + R-BIL-074 new fields; `bilateral-module/tasks.md` lists the T-15.N task IDs from this spec.
- **How verified:** PR review checklist.

### NFR-BIL-072 — Rollout to dev / staging / production

- **Category:** reliability
- **Target:** zero `500` errors on `/api/tools/clarisa/science-programs` post-rollout; migration apply-time < 5 s on production.
- **How verified:** synthetic monitor + migration runtime logs.

---

## 5. Data requirements

| Change | Entity | Migration |
| --- | --- | --- |
| Rename `lever_code` → `sp_code` on `result_pool_funding_alignment_sp` | `bilateral/entities/result-pool-funding-alignment-sp.entity.ts` | `<timestamp>-renameLeverCodeToSpCodeOnAlignmentSp.ts` |
| Add `reporting_enabled`, `prms_id`, `icon_key` to `clarisa_science_programs`; seed `icon_key = official_code` | `clarisa/entities/clarisa-science-programs/entities/clarisa-science-program.entity.ts` | `<timestamp>-extendScienceProgramCatalogColumns.ts` |
| New `sync_process_log` row types `clarisa.science-programs` and `prms-reporting.science-programs` | n/a (log table is generic) | n/a |

No OpenSearch decorations on new columns (the SP catalog is not indexed).

---

## 6. API surface delta

| Verb | Path | Change |
| --- | --- | --- |
| `PATCH` | `/api/v1/results/:resultCode/pool-funding-alignment` | Adds catalog-validation 400; adds source-based 409. Body shape unchanged. |
| `GET` | `/api/v1/results/:resultCode/pool-funding-alignment` | Adds `reporting_enabled` + `icon_key` to each `selected_science_programs[]` entry. `is_read_only` becomes a union of synced-to-PRMS and source-PRMS. |
| `GET` | `/api/tools/clarisa/science-programs[/<code>]` | Adds `reporting_enabled`, `prms_id`, `icon_key` to response. |
| `POST/PATCH/DELETE` | `/api/v1/results/:resultCode/pool-funding-alignment/indicators/:indicatorCode/contribution` | Adds source-based 409 (R-BIL-071). |

No new endpoints. No version bump (additive changes only).

---

## 7. Cross-system impact

- **CLARISA** — new periodic fetch from `/api/cgiar-entities` (read-only consumer; no write-back). Filter logic documented in R-BIL-072.
- **PRMS Reporting** — new periodic fetch from `/api/results/admin-panel/phases/:phaseId/reporting-initiatives` (read-only consumer; no auth credentials needed beyond existing PRMS integration).
- **Socket.IO** — no new events.
- **STAR (`client/`)** — coordination only: FE must (i) handle new 400 / 409 codes from validation + source gate, (ii) render the new `reporting_enabled` + `icon_key` fields when present. Tracked in STAR-side `T-13` / `T-14` updates; no ARI change required.

---

## 8. Assumptions, dependencies, risks

| Item | Notes |
| --- | --- |
| **Assumption** | PRMS Reporting `/api/results/admin-panel/phases/:phaseId/reporting-initiatives` is reachable from ARI's deployed VPC. (Verified in session probes 2026-05-23.) |
| **Assumption** | The `:phaseId` is stable enough that hard-coding `6` (with env override) for the 2025 cycle is acceptable until the next cycle. |
| **Dependency** | R-BIL-070 depends on the catalog being present in the target env → ordering: R-BIL-075 (rollout) must land before R-BIL-070 is enabled. |
| **Dependency** | R-BIL-072 depends on R-BIL-074 (the `reporting_enabled` / `prms_id` columns must exist before the PRMS leg can write them). |
| **Risk** | If CLARISA renames or removes an SP code that has alignment rows pointing to it, R-BIL-070 validation will start failing on previously-valid mappings. **Mitigation:** catalog rows are never hard-deleted by R-BIL-072 (use `is_active = false`); validation should accept any code present in the table regardless of active flag. |
| **Risk** | PRMS may rotate the reporting phase ID mid-cycle. **Mitigation:** env-driven, no code change; document in runbook. |

---

## 9. Open questions

| # | Question | Owner | Due |
| --- | --- | --- | --- |
| OQ-PI-1 | Should `reporting_enabled = false` SPs be hidden from the picker entirely or just greyed out? | STAR FE + MEL PO | 2026-06-15 |
| OQ-PI-2 | Should R-BIL-070 hard-reject codes whose catalog row is `is_active = false` (drift case)? | ARI backend | 2026-06-15 |
| OQ-PI-3 | Is daily 03:00/03:15 UTC the right sync cadence, or do we need a manual trigger endpoint for ops? | ops | 2026-06-30 |

---

## 10. Sign-off

- [ ] Engineering lead — TBA
- [ ] MEL / product owner — TBA
- [ ] Security review (not required — no new auth surfaces)
- [ ] DevOps (required for R-BIL-075 rollout) — TBA
