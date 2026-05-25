# Proposal — Bilateral module pending items (v2: CLARISA-source SPs + admin-owned project mapping)

## 1. Document control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral-module/pending-items/` |
| Status | DRAFT v2 (2026-05-25) — consolidated; awaiting approval before re-running `/sdd-specify` |
| Author | ARI backend team |
| Parent spec | [`../requirements.md`](../requirements.md) · [`../design.md`](../design.md) · [`../tasks.md`](../tasks.md) · [`../frontend-handoff.md`](../frontend-handoff.md) |
| Constitutional baseline | [`../../../prd.md`](../../../prd.md) · [`../../../system-design/design.md`](../../../system-design/design.md) · [`../../../detailed-design/detailed-design.md`](../../../detailed-design/detailed-design.md) |
| Version | v2 (2026-05-25). See [§14 Changelog](#14-changelog) for v1→v2 evolution. v1 was approved 2026-05-23 (commit `c6709e67`). |

---

## 2. Intent

Capture in one reviewable place everything still pending for the bilateral module so the team can prioritize, owner-assign, and either fold each item into the existing `tasks.md` or trigger `/sdd-specify` for a fresh wave of full SDD docs.

The v2 wave re-anchors the architecture on three corrections that emerged after v1 was approved:

1. **SP-per-project linkage lives in CLARISA `/api/projects`, not in our DB.** Each CLARISA project carries a `project_mappings_array[]` listing its allocated SPs with `smo_code`, `status`, `allocation`, and full SP metadata. The static `clarisa_science_programs` catalog seeded by migration `1779190000010` is reclassified as **display-only fallback** (icons / colors / names).
2. **HLOs and indicators live in PRMS ToC.** Given a set of SP codes, a PRMS ToC endpoint returns the HLOs/indicators for those SPs. ARI proxies that call; no local cache of HLOs.
3. **The join from STAR/AGRESSO to CLARISA project is owned by ARI** through a new admin-maintained table. CLARISA does not expose AGRESSO `agreement_id` as a join key, so we own the mapping ourselves through a new admin SSR module (`/admin/bilateral-project-mappings`). First cut is manual; the schema is forward-compatible with AI-assisted suggestions later.

Inherited from v1 and still in scope: Phase 1.5 SP-catalog hardening cleanups (catalog validation, source-based read-only gate, column rename, operational rollout); Phase 3–6 task statuses are re-priced in `tasks.md` against current state.

---

## 3. Problem / current behavior

The 2026-05-23 SP catalog wave (commit `5d48b27b`) seeded a static `clarisa_science_programs` table with all 13 SPs and made the STAR picker source it directly. That assumes "any SP is valid for any bilateral project", which the FE mockup contradicts:

> "Select the Science Program(s) this is related to" — the dropdown should show only SPs **linked to this bilateral project**, not all 13.

CLARISA evidence (probed 2026-05-25, `/api/projects`):

```json
{
  "id": 1,
  "short_name": "T-PJ-003262-An innovative approach to agribusiness training...",
  "source_of_funding": "Bilateral",
  "lead_institution_object": { "id": 45, "acronym": "IITA" },
  "project_mappings_array": [
    {
      "id": 43, "project_id": 1, "program_id": 275,
      "allocation": 25, "status": "Confirmed",
      "global_unit_object": {
        "smo_code": "SP09", "name": "Scaling for Impact",
        "cgiar_entity_type_object": { "code": 23, "name": "Scaling programs" },
        "portfolio_object": { "acronym": "P25" }
      }
    },
    {
      "allocation": 75, "status": "Confirmed",
      "global_unit_object": { "smo_code": "SP10", "name": "Gender Equality and Inclusion", "..." }
    }
  ]
}
```

So today's gaps:

1. STAR's SP picker shows all 13 SPs from our local catalog → should show only the SPs CLARISA links to this result's bilateral project (filtered to `status="Confirmed"` and `portfolio.acronym = "P25"`).
2. The HLO/indicator picker has no data source wired (T-31 was planned as a local cache) → should call a PRMS ToC endpoint passing the chosen SPs.
3. PATCH alignment validation in R-BIL-070 hits the wrong list (full 13 instead of per-project subset).
4. The link between a STAR result and a CLARISA project is undefined in our current code: the result has an AGRESSO contract (`agreement_id`, e.g. `D527`) — but CLARISA `/api/projects` does not expose AGRESSO contract IDs. **Resolution:** ARI owns the join via a new admin-maintained `bilateral_project_mapping` table.
5. No operator surface exists to maintain that mapping. We need a new admin SSR page (`/admin/bilateral-project-mappings`) — list / search / create / edit / deactivate. AI-assisted suggestions are a future enhancement, NOT in the first cut.
6. `tasks.md` was written before any of this and does not have entries for items below.
7. `design.md` does not yet capture the two live read sources (CLARISA + PRMS ToC), the admin-owned mapping table, or the source-based read-only gate.
8. `frontend-handoff.md` §4.6 (commit `c19efe1a`) tells the FE the static catalog is live but several follow-on backend changes must land before the picker can be fully trusted.

---

## 4. Proposed outcome

- A new persistent table `bilateral_project_mapping` stores the join AGRESSO `agreement_id` ↔ CLARISA `project.id`. The mapping is admin-owned, supports `source = MANUAL | AI_SUGGESTED | AI_AUTO` and `is_active` history.
- A new admin SSR page at `/admin/bilateral-project-mappings` lets operators list, search, create, edit, and deactivate mappings. Bulk import (CSV) and AI suggestions are out of scope for the first cut.
- A new ARI endpoint surfaces, for a given STAR result, the SPs CLARISA associates with its mapped bilateral project. The STAR picker reads from this endpoint.
- A new ARI endpoint accepts a list of SP codes and returns the HLOs/indicators PRMS ToC exposes for them. The STAR "Map HLOs and/or indicators" panel reads from this endpoint.
- PATCH alignment validation switches from "code exists in local catalog" to "code is in the SP list returned by the per-project endpoint for this result".
- When a result's AGRESSO contract has no active mapping, the SP picker endpoint returns 200 with `{ science_programs: [], mapping_status: "unmapped" }`, so the FE can show a "Contact admin to link this contract" affordance instead of an empty dropdown.
- The local `clarisa_science_programs` table is preserved as **display-only fallback** (icons / colors / human-readable names).
- The periodic two-upstream sync (v1 R-BIL-072) is dropped. v1 T-15.5 deleted.

---

## 5. Scope

In scope:

- **New table `bilateral_project_mapping`** — owns the AGRESSO `agreement_id` ↔ CLARISA `project.id` join.
- **New admin SSR module `/admin/bilateral-project-mappings`** — list, search, create, edit, deactivate; uses existing admin layout, sidebar entry, RBAC (`CENTER_ADMIN`, `SYSTEM_ADMIN`).
- New backend service `BilateralProjectMappingService` with full CRUD + history.
- New backend controller `BilateralProjectMappingController` for the admin REST surface (`/api/admin/bilateral-project-mappings`).
- New ARI endpoint `GET /api/v1/results/:resultCode/bilateral/science-programs` — returns the SPs CLARISA links to the result's mapped bilateral project, enriched from the local catalog for display fields.
- New ARI endpoint `GET /api/v1/results/:resultCode/bilateral/hlos-indicators?sp_codes=SP01,SP06` — returns the HLOs/indicators PRMS ToC exposes for the chosen SPs.
- New ARI tool service `src/domain/tools/clarisa/projects/clarisa-projects.service.ts` — thin client over CLARISA `/api/projects` with a short-TTL in-memory cache.
- New ARI tool service `src/domain/tools/prms-toc/prms-toc.service.ts` — thin client over the PRMS ToC HLO endpoint.
- Phase 1.5 hardening inherited from v1: `sp_codes` catalog-aware validation, source-based read-only gate, column rename `lever_code → sp_code`, operational rollout of migrations, sibling `*.spec.ts` coverage, parent-doc updates.
- Update `selected_science_programs[]` enrichment to source codes from CLARISA and display fields (icon_key/color/category) from the local catalog.
- Update `frontend-handoff.md` with the new endpoints + the `mapping_status: "unmapped"` UX path + admin module pointer.
- Re-pricing of Phase 3+ tasks (T-21..T-38) and surfacing current external blockers.

Out of scope (first cut — captured as future enhancements):

- **AI-assisted mapping suggestions** — separate follow-up spec; column `source` on the mapping table is forward-compatible with `AI_SUGGESTED` / `AI_AUTO` values so we don't paint ourselves into a corner.
- **Bulk CSV import** of historical mappings — separate follow-up; UI will support one-by-one entry first.
- Removing or repurposing the existing `clarisa_science_programs` table — kept as the display catalog.
- Removing migrations already landed (`1779190000010`); harmless under the new model.
- Caching strategy beyond a basic 5-min in-memory cache.
- Phase 3+ work (push, W3 sync) — untouched.
- Implementing any of the inventory items below — this is a scoping proposal; `/sdd-specify` produces the executable plan.

---

## 6. Non-goals

- Replicating CLARISA's project↔SP table or PRMS's ToC HLO catalogs in our DB (only the **join layer** AGRESSO↔CLARISA-project is ours; the SP and HLO catalogs stay upstream).
- Replacing existing alignment / mapping endpoints — only the SP / HLO data sources change.
- Building admin tooling to edit project↔SP linkages — CLARISA is canonical for that.
- Building AI suggestions in this wave (forward-compatible schema only).
- Re-writing the original `tasks.md` Phase 0–2 entries — those are landed and authoritative.
- Changing the SDD methodology — this is an additional sub-spec, not a new template.

---

## 7. Affected users, systems, and specs

| Affected | How |
| --- | --- |
| ARI backend team | Owns the Phase 1.5 + v2 implementation. |
| STAR frontend | Switches the SP picker source from `/api/tools/clarisa/science-programs` (deprecated) to the new `/api/v1/results/:resultCode/bilateral/science-programs`. Switches the HLO/indicator picker to the new `/api/v1/results/:resultCode/bilateral/hlos-indicators`. Must handle `mapping_status: "unmapped"` empty state. |
| ARI admin SSR panel (`src/admin/`) | New page `/admin/bilateral-project-mappings` with React 19 list/edit components, new sidebar entry, new `AdminService` methods. Follows `src/admin/README-REACT.md` patterns. |
| Bilateral operators (new persona) | Use the admin page to manually link AGRESSO contracts → CLARISA bilateral projects. Operators need `CENTER_ADMIN` or `SYSTEM_ADMIN` role. |
| PRMS team | Confirms the ToC HLO endpoint URL + auth + payload (OQ-RV-2). |
| CLARISA team | (No upstream join field needed — closed by our own mapping table.) |
| PRMS team (Phase 3) | Blocks T-21, T-23 (decisions on push auth and US5 acceptance criteria). |
| System Office (Phase 4) | Blocks T-22 (W3 Registry source decision). |
| `docs/specs/bilateral-module/pending-items/requirements.md` | Regenerated; R-BIL-070 modified; R-BIL-072 deleted; R-BIL-074 narrowed; new R-BIL-076..080 added. |
| `docs/specs/bilateral-module/pending-items/design.md` | Regenerated; new §3 entity (`bilateral_project_mapping`), §5 workflows (mapping lookup + proxy flows), §6 admin SSR, §7 integrations (CLARISA + PRMS ToC live read sources). New decisions D-PI-7..D-PI-10. |
| `docs/specs/bilateral-module/pending-items/tasks.md` | Regenerated; T-15.4 narrowed; T-15.5 deleted; new T-15.10..15. T-15.16 captured as deferred (AI assist). |
| `docs/specs/bilateral-module/design.md` | Will receive new §3.6 (CLARISA-source SPs + admin mapping) and §3.7 (source-based read-only) once landed. |
| `docs/specs/bilateral-module/frontend-handoff.md` | §4.6 will be amended once R-BIL-076..080 land. |

---

## 8. Requirement delta preview

### ADDED requirements

- **R-BIL-076** — `GET /api/v1/results/:resultCode/bilateral/science-programs` returns the SPs CLARISA associates with the result's mapped bilateral project. Source: `clarisa.projects[].project_mappings_array[]` filtered to `status="Confirmed"` AND `portfolio_object.acronym = active portfolio` (default `"P25"`, env-driven). Response enriched from `clarisa_science_programs` for `icon_key` / `color` / `category`. Each entry carries `allocation` (%). When no active mapping exists for the result's AGRESSO contract, response is `200` with `{ science_programs: [], mapping_status: "unmapped" }`.
- **R-BIL-077** — `GET /api/v1/results/:resultCode/bilateral/hlos-indicators?sp_codes=...` returns the HLOs and indicators PRMS ToC exposes for the given SP codes. Each entry groups under its SP. Endpoint, auth, and shape per OQ-RV-2.
- **R-BIL-078** — ARI owns the AGRESSO contract ↔ CLARISA project join through a persistent table `bilateral_project_mapping`. Resolution of a STAR result to its CLARISA project flows: `result → agresso_contract.agreement_id → bilateral_project_mapping → clarisa.projects.id`. The latest active mapping (`is_active=true`) wins when more than one historical row exists for a contract.
- **R-BIL-079** — New persistent table `bilateral_project_mapping`. Columns: `id` (PK), `agresso_agreement_id` (FK-by-value to `agresso_contract.agreement_id`), `clarisa_project_id` (INT, the upstream CLARISA `project.id`), `clarisa_project_short_name` (VARCHAR, denormalized for display + auditability), `source` (ENUM: `MANUAL` | `AI_SUGGESTED` | `AI_AUTO`, default `MANUAL`), `confidence_score` (FLOAT nullable, populated only when `source != MANUAL`), `notes` (TEXT nullable), `is_active` (BOOLEAN), full `AuditableEntity` audit fields. Indexes: `idx_bpm_agreement` on `agresso_agreement_id`, `idx_bpm_clarisa_project` on `clarisa_project_id`, partial-unique on `(agresso_agreement_id) WHERE is_active = true`.
- **R-BIL-080** — New admin SSR page `/admin/bilateral-project-mappings` + REST surface `/api/admin/bilateral-project-mappings` for list (paginated, search by AGRESSO ID or project short_name, filter by `is_active` + `source`), create, edit, deactivate. Access: `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)`. CLARISA project picker on the create/edit form is populated from cached CLARISA `/api/projects` (CLARISA-projects tool service from R-BIL-076). AGRESSO contract picker is populated from existing `AgressoContractService` filtered to `funding_type IN ('BLR','BILATERAL')`. All writes audited via `AuditableEntity`. Deactivate is soft (set `is_active=false`, preserve row for audit).

### MODIFIED requirements

- **R-BIL-070** — validation source changes from `clarisa_science_programs` (active rows) to **the SP list returned by R-BIL-076 for the same result**. Error payload structure unchanged (`{ unknown_sp_codes: string[] }`).
- **R-BIL-074** — narrowed: keep `icon_key` (still useful for FE display); **drop `reporting_enabled` and `prms_id` columns** — neither upstream owns those concepts under the new model.
- **R-BIL-015 / R-BIL-034** (parent spec) — extended to include the source-based read-only gate (currently only covers post-PRMS-sync state). (R-BIL-071 in this spec covers it.)
- **parent `tasks.md` T-31** — re-scoped from "SP catalog sync" to "indicators-per-SP sync" (catalog metadata is no longer ours; HLOs come live from PRMS ToC under R-BIL-077).

### REMOVED requirements

- **R-BIL-072** (v1) — periodic two-upstream sync of the SP catalog. Deleted. CLARISA and PRMS ToC become live read sources; no local sync.

### Tasks delta (vs the 2026-05-24 trio)

| Task | Action | Notes |
| --- | --- | --- |
| T-15.5 | **DROP** | periodic sync no longer needed. |
| T-15.4 | **NARROW** | add only `icon_key` (drop `reporting_enabled`, `prms_id`). |
| T-15.1 | **MODIFY** | validation source becomes R-BIL-076 result instead of `ClarisaScienceProgramsService.findAll()`. |
| T-15.8 | **MODIFY** | doc updates include deprecation note on `/api/tools/clarisa/science-programs` direct consumption + admin module pointer. |
| **T-15.10** | **ADD** | `src/domain/tools/clarisa/projects/clarisa-projects.service.ts` — thin client + 5-min in-memory cache; methods `listBilateralProjectsWithMappings()`, `findProjectById(id)`. |
| **T-15.11** | **ADD** | controller + service for `GET /api/v1/results/:resultCode/bilateral/science-programs` (consumes mapping table + CLARISA projects service). |
| **T-15.12** | **ADD** | `src/domain/tools/prms-toc/prms-toc.service.ts` + controller + service for `GET /api/v1/results/:resultCode/bilateral/hlos-indicators`. **BLOCKED on OQ-RV-2.** |
| **T-15.13** | **ADD** | Migration `<timestamp>-createBilateralProjectMapping.ts` + entity `BilateralProjectMapping` extending `AuditableEntity`. |
| **T-15.14** | **ADD** | `BilateralProjectMappingService` (CRUD + history) + `BilateralProjectMappingController` (admin REST surface) + DTOs + repository. Role-gated to `CENTER_ADMIN` / `SYSTEM_ADMIN`. Includes lookup helper `findActiveByAgreementId(agreement_id)` consumed by T-15.11. |
| **T-15.15** | **ADD** | Admin SSR page `/admin/bilateral-project-mappings` (React 19 list + edit components per `src/admin/README-REACT.md`) + matching `AdminController` handler + new sidebar entry + new `AdminService` method. |
| **T-15.16** | **DEFERRED** | AI-assisted mapping suggestions; captured for backlog only. Not in scope for first cut. |

---

## 9. Approach options

### Option A — Pure CLARISA + PRMS proxy (no local cache)

Pros: simplest. Both sources canonical; no consistency risk. No cron, no extra columns.
Cons: every picker open hits CLARISA + PRMS. Latency depends on upstreams. Outage → picker empty.

### Option B — CLARISA + PRMS proxy with short-TTL in-memory cache (Recommended)

Pros: both sources canonical; pick latency fast on warm cache; tolerates short upstream hiccups. Local `clarisa_science_programs` covers display-field enrichment.
Cons: cache invalidation TTL-based (acceptable — project↔SP changes are rare).

### Option C — Keep the periodic sync model (Option from v1)

Pros: catalog always available offline; deterministic.
Cons: wrong source of truth; drift the moment CLARISA reallocates an SP or PRMS rewires a ToC link.

---

## 10. Recommended approach

**Option B.** Smallest safe path that:

1. Puts CLARISA + PRMS ToC in their rightful places as canonical.
2. Keeps user experience snappy (5-min in-memory cache per upstream).
3. Preserves work already shipped (local catalog stays useful for icons/colors/names).
4. Drops the most invalidated piece (cron sync) without scrapping landed migrations.

Implementation:
- `ClarisaProjectsService.listBilateralProjectsWithMappings()` — caches the filtered, mapping-projected output of `/api/projects` for 300 s. On upstream error with warm cache, serve cache + log; with cold cache, 503.
- `PrmsTocService.listHlosByScienceProgram(sp_codes)` — same TTL pattern, keyed by sorted comma-joined SP code tuple.
- `BilateralProjectMappingService.findActiveByAgreementId(agreement_id)` — single DB query, no cache (admin writes need immediate visibility).

---

## 11. Risks, dependencies, and open questions

| # | Item | Notes |
| --- | --- | --- |
| ~~OQ-RV-1~~ | ~~Canonical join key STAR result → CLARISA project~~ | **CLOSED 2026-05-25** — resolved by introducing the admin-owned `bilateral_project_mapping` table (R-BIL-079 / R-BIL-080). |
| **OQ-RV-2** | Confirm the PRMS ToC endpoint that takes SP codes and returns HLOs / indicators. URL, auth, payload, supported filters (portfolio, status). | Owner: PRMS team. Due: 2026-06-05. **BLOCKER for R-BIL-077 / T-15.12.** |
| **OQ-RV-3** | When a STAR result is funded by multiple AGRESSO contracts each mapped to a different CLARISA project, do we UNION or INTERSECT the SP sets for the picker? | Owner: MEL PO + STAR FE. Due: 2026-06-15. |
| **OQ-RV-4** | Should the picker show only SPs whose `status === "Confirmed"`, or also `Pending` / `Draft`? | Owner: MEL PO. Due: 2026-06-15. |
| **OQ-RV-5** | Should the picker filter on the active portfolio (`P25`)? If a project has mappings to multiple portfolios (P22 + P25), do we show only the current one? | Owner: MEL PO. Due: 2026-06-15. |
| **OQ-RV-6** | Does CLARISA `/api/projects` require additional filters for performance once we hit production (today returns 299 records in ~1 MB; tolerable but worth confirming)? | Owner: CLARISA team. Due: 2026-06-30. |
| **OQ-RV-7** | Admin UX: should bulk CSV import be Phase 1 or Phase 2? With 200+ bilateral contracts, one-by-one mapping is operator-painful — but a CSV importer is its own task and pushes T-15.15 over a one-day budget. | Owner: MEL PO + ops. Due: 2026-06-15. |
| **OQ-RV-8** | AI assistance scoping: which LLM / embedding service for suggestions? Operator workflow — "suggest top-N", auto-apply with confidence threshold, or pure suggestion? | Owner: ARI backend lead + PO. Due: 2026-07-15 (T-15.16 is deferred). |
| **OQ-RV-9** | When deactivating a mapping, what happens to STAR results that already have `selected_science_programs` persisted from that mapping? Leave alone / re-validate on next read / flag as `is_stale`? | Owner: MEL PO + ARI backend. Due: 2026-06-15. |
| Risk | CLARISA latency on picker open. | Mitigation: 5-min in-memory cache; circuit-breaker after 3 failures. |
| Risk | PRMS ToC endpoint not yet documented. | Block T-15.12 until OQ-RV-2 closes. Document explicit `503` response with retry hint until then. |
| Risk | Operator burden of manual mapping at launch (200+ bilateral contracts). | Mitigation: launch with the mapping page; track admin workload weekly; if friction is high, accelerate T-15.16 (AI assist) or follow-on CSV import into a Phase 1.6 wave. |
| Risk | Local fallback catalog drifts vs CLARISA. | Acceptable: it's display-only. Codes are CLARISA-canonical. |
| Risk | Phase 3+ blockers (T-21, T-22, T-23) are external; no internal action will unblock them. | Track in this proposal; escalate via PO; do not start dependent work until they close. |

---

## 12. Success criteria

- This proposal is approved by the bilateral module PO.
- PRMS team confirms OQ-RV-2; MEL PO closes OQ-RV-3..5 + OQ-RV-7 + OQ-RV-9. OQ-RV-8 (AI scoping) MAY remain open; T-15.16 is deferred and not on this wave's critical path.
- `/sdd-specify bilateral-module/pending-items` is re-run; the resulting `requirements.md` / `design.md` / `tasks.md` reflect this v2 proposal (R-BIL-072 removed, R-BIL-076..080 added, T-15.5 dropped, T-15.10..15 added, T-15.16 captured-but-deferred).
- STAR FE handoff doc updated to consume the new endpoints and stops calling `/api/tools/clarisa/science-programs` directly (kept available but deprecated). FE handles `mapping_status: "unmapped"` empty state.
- Admin SSR page renders the mapping list/edit and a `CENTER_ADMIN` can create + deactivate a mapping end-to-end in dev environment.
- Every item in §8 has an owner and a status in the resulting `tasks.md`.

---

## 13. Next step

```text
/sdd-specify bilateral-module/pending-items
```

Re-run after this v2 is approved. With OQ-RV-1 closed (admin-owned join table), only T-15.12 (PRMS ToC endpoint, R-BIL-077) stays BLOCKED on OQ-RV-2 (PRMS team). The rest of the tasks (T-15.10..15) are READY in the regenerated `tasks.md` as soon as PO approves.

Sensible PR sequencing:

1. **T-15.13** (mapping table + entity) — unblocks everything downstream; small migration.
2. **T-15.10** (CLARISA projects tool) + **T-15.14** (mapping admin service+controller) — can land in parallel.
3. **T-15.15** (admin SSR page) — needs T-15.14.
4. **T-15.11** (per-result SP endpoint) — needs T-15.10 + T-15.14.
5. **T-15.12** (PRMS ToC endpoint) — when OQ-RV-2 closes.
6. **T-15.16** (AI assist) — deferred backlog.

---

## 14. Changelog

| Date | Version | Change | Commit |
| --- | --- | --- | --- |
| 2026-05-23 | v1 | Initial inventory proposal: A1–A7 Phase 1.5 hardening + B1–B4 architectural deltas + C/D/E/F Phase 3+ re-pricing. Approached SP linkage as a static seed in `clarisa_science_programs` with R-BIL-072 periodic sync (CLARISA owns name/category, PRMS owns color/reporting_enabled/prms_id). Approved by PO. | `c6709e67` (proposal) → `a9a0b7c7` (R/D/T trio) |
| 2026-05-25 | v2 | Three architectural corrections folded in: (1) SP-per-project linkage owned by CLARISA `/api/projects.project_mappings_array[]`, not by us; (2) HLOs/indicators owned by PRMS ToC, proxied live; (3) AGRESSO contract ↔ CLARISA project join owned by ARI via a new admin-maintained `bilateral_project_mapping` table — manual first cut, schema forward-compatible with AI suggestions. Deltas: R-BIL-072 removed; R-BIL-074 narrowed (drop `reporting_enabled` + `prms_id`); R-BIL-076..080 added; T-15.5 dropped; T-15.10..15 added; T-15.16 deferred. OQ-RV-1 (upstream join field) closed by introducing our own table. Local `clarisa_science_programs` reclassified as display-only fallback. | (this commit) |

When the resulting `requirements.md` / `design.md` / `tasks.md` are regenerated by `/sdd-specify`, they supersede the 2026-05-24 trio. The `5d48b27b` SP catalog wave migration stays — the table is now a display fallback, not a picker source.
