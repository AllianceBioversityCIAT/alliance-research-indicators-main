# Proposal (REVISION) — CLARISA projects as the source of truth for SP linkage; PRMS ToC for HLOs; admin-owned AGRESSO↔CLARISA project mapping

## 1. Document control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral-module/pending-items/` |
| Status | DRAFT v2 (2026-05-25) — adds admin-owned mapping module; awaiting approval before re-running `/sdd-specify` |
| Author | ARI backend team (drafted 2026-05-25; revised 2026-05-25 same day per PO clarification) |
| Type | **Revision** of the previously approved [`./proposal.md`](./proposal.md) (approved 2026-05-23, commit `c6709e67`). |
| Supersedes (in part) | [`./requirements.md`](./requirements.md) R-BIL-070 (rule source), R-BIL-072 (sync model), R-BIL-074 (column purpose); [`./tasks.md`](./tasks.md) T-15.4 (partial), T-15.5 (drop). |
| Leaves intact | R-BIL-071 (source-based read-only), R-BIL-073 (column rename), R-BIL-075 (rollout); T-15.1 (re-pointed source), T-15.2, T-15.3, T-15.6, T-15.7, T-15.8, T-15.9. |
| Parent spec | [`../requirements.md`](../requirements.md) · [`../design.md`](../design.md) · [`../tasks.md`](../tasks.md) · [`../frontend-handoff.md`](../frontend-handoff.md) |

---

## 2. Intent

Re-anchor the bilateral SP picker on **CLARISA `/api/projects` as the live source of truth for SP-per-project linkage**, and the HLO/indicator panel on **PRMS ToC** for indicator lookup given a set of SPs. The local `clarisa_science_programs` catalog (commit `5d48b27b`) stays, but is reclassified as **display-only fallback** — used to enrich SP codes with icons / colors / names when CLARISA omits a field.

To bridge the missing join between AGRESSO contracts (what STAR owns) and CLARISA projects (what owns the SP linkage), **introduce a new admin-owned mapping module under `/admin/bilateral-project-mappings`** that stores manual matches in our DB. First cut is purely manual (admin picks contract → CLARISA project); a later phase MAY add AI-assisted suggestions to streamline operator workload.

This is triggered by a 2026-05-25 correction: CLARISA — not PRMS Reporting — owns the project↔SP linkage. The probe of `https://api.clarisa.cgiar.org/api/projects` (299 records) confirms that every project carries a `project_mappings_array[]` listing its allocated SPs with `smo_code`, `status`, `allocation`, and full SP metadata. Same-day PO clarification confirmed CLARISA does NOT expose AGRESSO `agreement_id` as a join key — we own the mapping ourselves through the admin module.

---

## 3. Problem / current behavior

The 2026-05-23 SP catalog wave (commit `5d48b27b`) seeded a static `clarisa_science_programs` table with all 13 SPs and made the STAR picker source it directly. That assumes "any SP is valid for any bilateral project", which the FE mockup contradicts:

> "Select the Science Program(s) this is related to" — the dropdown should show only SPs **linked to this bilateral project**, not all 13.

CLARISA evidence (probed 2026-05-25, `/api/projects`):

```json
{
  "id": 1,
  "short_name": "T-PJ-003262-An innovative approach to agribusiness training and start-up for Nigerias young people...",
  "source_of_funding": "Bilateral",
  "organization_code": 45,
  "lead_institution_object": { "id": 45, "name": "IITA", "acronym": "IITA", "..." },
  "project_mappings_array": [
    {
      "id": 43, "project_id": 1, "program_id": 275,
      "allocation": 25, "status": "Confirmed",
      "global_unit_object": {
        "id": 275, "smo_code": "SP09", "name": "Scaling for Impact",
        "year": 2025, "level": 1, "global_unit_type_id": 23,
        "cgiar_entity_type_object": { "code": 23, "name": "Scaling programs", "prefix": "SCP" },
        "portfolio_object": { "id": 3, "acronym": "P25" }
      }
    },
    {
      "id": 44, "project_id": 1, "program_id": 276,
      "allocation": 75, "status": "Confirmed",
      "global_unit_object": {
        "smo_code": "SP10", "name": "Gender Equality and Inclusion",
        "cgiar_entity_type_object": { "code": 24, "name": "Accelerators" },
        "portfolio_object": { "acronym": "P25" }
      }
    }
  ]
}
```

So today's gap, restated:

1. STAR's SP picker shows all 13 SPs from our local catalog → should show only `project_mappings_array[].global_unit_object.smo_code` where `status === "Confirmed"` and `portfolio_object.acronym === "P25"` (current portfolio).
2. The HLO/indicator picker has no data source wired → should call a PRMS ToC endpoint passing the chosen SP codes (URL TBC with PRMS team).
3. PATCH alignment validation in R-BIL-070 hits the wrong list (full 13 instead of per-project subset).
4. The link between a STAR result and a CLARISA project is undefined in our current code: the result has an AGRESSO contract (`agreement_id`, e.g. `D527`) — but CLARISA `/api/projects` does not expose AGRESSO contract IDs in its top-level fields. **Resolution (per PO 2026-05-25):** ARI owns the join via a new admin-maintained `bilateral_project_mapping` table. No upstream join field is required.
5. There is no operator surface today to maintain that mapping. We need a new admin SSR page (`/admin/bilateral-project-mappings`) — list / search / create / edit / deactivate. AI-assisted suggestions are a future enhancement, NOT in the first cut.

---

## 4. Proposed outcome

- A new persistent table `bilateral_project_mapping` stores the join AGRESSO `agreement_id` ↔ CLARISA `project.id`. The mapping is admin-owned, supports `source = MANUAL | AI_SUGGESTED | AI_AUTO` and `is_active` history.
- A new admin SSR page at `/admin/bilateral-project-mappings` lets operators list, search, create, edit, and deactivate mappings. Bulk import (CSV) and AI suggestions are out of scope for the first cut.
- A new ARI endpoint surfaces, for a given STAR result, the SPs CLARISA associates with its mapped bilateral project. The STAR picker reads from this endpoint.
- A new ARI endpoint accepts a list of SP codes and returns the HLOs/indicators PRMS ToC exposes for them. The STAR "Map HLOs and/or indicators" panel reads from this endpoint.
- PATCH alignment validation switches from "code exists in local catalog" to "code is in the SP list returned by the per-project endpoint for this result".
- When a result's AGRESSO contract has no active mapping, the SP picker endpoint returns 200 with an empty `science_programs[]` and `mapping_status: "unmapped"`, so the FE can show a "Contact admin to link this contract to a bilateral project" affordance instead of an empty dropdown.
- The local `clarisa_science_programs` table is preserved as **display-only fallback** (icons / colors / human-readable names).
- The periodic two-upstream sync (R-BIL-072) is dropped. T-15.5 deleted.

---

## 5. Scope

In scope:

- **New table `bilateral_project_mapping`** — owns the AGRESSO `agreement_id` ↔ CLARISA `project.id` join (see §8 data model).
- **New admin SSR module `/admin/bilateral-project-mappings`** — list, search, create, edit, deactivate; uses existing admin layout, sidebar entry, RBAC (`CENTER_ADMIN`, `SYSTEM_ADMIN`).
- New backend service `BilateralProjectMappingService` with full CRUD + history.
- New backend controller `BilateralProjectMappingController` for the admin REST surface (`/api/admin/bilateral-project-mappings`).
- New ARI endpoint `GET /api/v1/results/:resultCode/bilateral/science-programs` — returns the SPs CLARISA links to the result's mapped bilateral project, enriched from the local catalog for display fields.
- New ARI endpoint `GET /api/v1/results/:resultCode/bilateral/hlos-indicators?sp_codes=SP01,SP06` — returns the HLOs/indicators PRMS ToC exposes for the chosen SPs.
- New ARI tool service `src/domain/tools/clarisa/projects/clarisa-projects.service.ts` — thin client over CLARISA `/api/projects` with a short-TTL in-memory cache.
- New ARI tool service `src/domain/tools/prms-toc/prms-toc.service.ts` — thin client over the PRMS ToC HLO endpoint.
- Modify R-BIL-070 to validate `sp_codes` against the per-project SP list (not the global catalog).
- Update `selected_science_programs[]` enrichment to source codes from CLARISA and display fields (icon_key/color/category) from the local catalog.
- Update `frontend-handoff.md` with the new endpoints + the `mapping_status: "unmapped"` UX path.

Out of scope (first cut — captured as future enhancements):

- **AI-assisted mapping suggestions** — separate follow-up spec; column `source` on the mapping table is forward-compatible with `AI_SUGGESTED` / `AI_AUTO` values so we don't paint ourselves into a corner.
- **Bulk CSV import** of historical mappings — separate follow-up; UI will support one-by-one entry first.
- Removing or repurposing the existing `clarisa_science_programs` table — kept as the display catalog.
- Removing migrations already landed (`1779190000010`); harmless under the new model.
- Caching strategy beyond a basic 5-min in-memory cache.
- Phase 3+ work (push, W3 sync) — untouched.

---

## 6. Non-goals

- Replicating CLARISA's project↔SP table or PRMS's ToC HLO catalogs in our DB (only the **join layer** AGRESSO↔CLARISA-project is ours; the SP and HLO catalogs stay upstream).
- Replacing existing alignment / mapping endpoints — only the SP / HLO data sources change.
- Building admin tooling to edit project↔SP linkages — CLARISA is canonical for that.
- Building AI suggestions in this wave (forward-compatible schema only).

---

## 7. Affected users, systems, and specs

| Affected | How |
| --- | --- |
| STAR frontend | Switches the SP picker source from `/api/tools/clarisa/science-programs` (deprecated) to the new `/api/v1/results/:resultCode/bilateral/science-programs`. Switches the HLO/indicator picker to the new `/api/v1/results/:resultCode/bilateral/hlos-indicators`. Must handle `mapping_status: "unmapped"` empty state. |
| ARI backend | Implements two new proxy endpoints + two thin tool services (CLARISA projects, PRMS ToC) + new `bilateral_project_mapping` table + admin CRUD service/controller. Drops the cron sync from T-15.5. |
| ARI admin SSR panel (`src/admin/`) | New page `/admin/bilateral-project-mappings` with React 19 list/edit components, new sidebar entry, new `AdminService` methods. Follows `src/admin/README-REACT.md` patterns. |
| Bilateral operators (new persona) | Use the admin page to manually link AGRESSO contracts → CLARISA bilateral projects. Operators need `CENTER_ADMIN` or `SYSTEM_ADMIN` role. |
| CLARISA team | (OQ-RV-1 now closed by introducing our own join table; no upstream change required.) |
| PRMS team | Confirms the ToC HLO endpoint URL + auth + payload (OQ-RV-2). |
| `docs/specs/bilateral-module/pending-items/requirements.md` | R-BIL-070 modified; R-BIL-072 deleted; R-BIL-074 narrowed; new R-BIL-076..080 added. |
| `docs/specs/bilateral-module/pending-items/design.md` | §3 (data model) — `clarisa_science_programs` reclassified as display-fallback; new `bilateral_project_mapping` table introduced. §5 (workflows) — replace sync legs with proxy flows + mapping lookup. §6 (admin SSR) — new admin page. §7 (integrations) — CLARISA + PRMS ToC live read sources. New decisions D-PI-7..D-PI-10. |
| `docs/specs/bilateral-module/pending-items/tasks.md` | T-15.4 narrowed. T-15.5 deleted. New T-15.10..15 (CLARISA proxy, per-result SPs endpoint, PRMS ToC endpoint, mapping table migration, mapping admin service+controller, admin SSR page). T-15.16 deferred (AI suggestions, captured for backlog). |
| `docs/specs/bilateral-module/frontend-handoff.md` | §4.6 rewrite to point at new endpoints + `mapping_status` semantics; deprecation note on direct `/api/tools/clarisa/science-programs` consumption. |

---

## 8. Requirement delta preview

### ADDED requirements

- **R-BIL-076** — `GET /api/v1/results/:resultCode/bilateral/science-programs` returns the SPs CLARISA associates with the result's mapped bilateral project. Source: `clarisa.projects[].project_mappings_array[]` filtered to `status="Confirmed"` AND `portfolio_object.acronym = active portfolio` (default `"P25"`, env-driven). Response enriched from `clarisa_science_programs` for `icon_key` / `color` / `category`. Each entry carries `allocation` (%). When no active mapping exists for the result's AGRESSO contract, response is `200` with `{ science_programs: [], mapping_status: "unmapped" }`.
- **R-BIL-077** — `GET /api/v1/results/:resultCode/bilateral/hlos-indicators?sp_codes=...` returns the HLOs and indicators PRMS ToC exposes for the given SP codes. Each entry groups under its SP. Endpoint, auth, and shape per OQ-RV-2.
- **R-BIL-078** — ARI owns the AGRESSO contract ↔ CLARISA project join through a persistent table `bilateral_project_mapping`. Resolution of a STAR result to its CLARISA project flows: `result → agresso_contract.agreement_id → bilateral_project_mapping → clarisa.projects.id`. The latest active mapping (`is_active=true`) wins when more than one historical row exists for a contract.
- **R-BIL-079** — New persistent table `bilateral_project_mapping` (data model in §3 of the resulting design.md). Columns: `id` (PK), `agresso_agreement_id` (FK-by-value to `agresso_contract.agreement_id`), `clarisa_project_id` (INT, the upstream CLARISA `project.id`), `clarisa_project_short_name` (VARCHAR, denormalized for display + auditability), `source` (ENUM: `MANUAL` | `AI_SUGGESTED` | `AI_AUTO`, default `MANUAL`), `confidence_score` (FLOAT nullable, populated only when `source != MANUAL`), `notes` (TEXT nullable), `is_active` (BOOLEAN), full `AuditableEntity` audit fields. Indexes: `idx_bpm_agreement` on `agresso_agreement_id`, `idx_bpm_clarisa_project` on `clarisa_project_id`, partial-unique on `(agresso_agreement_id) WHERE is_active = true`.
- **R-BIL-080** — New admin SSR page `/admin/bilateral-project-mappings` + REST surface `/api/admin/bilateral-project-mappings` for list (paginated, search by AGRESSO ID or project short_name, filter by `is_active` + `source`), create, edit, deactivate. Access: `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)`. CLARISA project picker on the create/edit form is populated from cached CLARISA `/api/projects` (CLARISA-projects tool service from R-BIL-076). AGRESSO contract picker is populated from existing `AgressoContractService` filtered to `funding_type IN ('BLR','BILATERAL')`. All writes audited via `AuditableEntity`. Deactivate is soft (set `is_active=false`, preserve row for audit).

### MODIFIED requirements

- **R-BIL-070** — validation source changes from `clarisa_science_programs` (active rows) to **the SP list returned by R-BIL-076 for the same result**. Error payload structure unchanged (`{ unknown_sp_codes: string[] }`).
- **R-BIL-074** — narrowed: keep `icon_key` (still useful for FE display); **drop `reporting_enabled` and `prms_id` columns** — neither upstream owns those concepts under the new model.

### REMOVED requirements

- **R-BIL-072** — periodic two-upstream sync of the SP catalog. Deleted. CLARISA and PRMS ToC become live read sources; no local sync.

### Tasks delta

- **DROP T-15.5** (periodic sync).
- **NARROW T-15.4** to add only `icon_key` (drop `reporting_enabled`, `prms_id`).
- **MODIFY T-15.1** — re-point validation source to R-BIL-076 result instead of `ClarisaScienceProgramsService.findAll()`.
- **MODIFY T-15.8** — doc updates include the deprecation note on `/api/tools/clarisa/science-programs` direct consumption + the admin module pointer.
- **ADD T-15.10** — `src/domain/tools/clarisa/projects/clarisa-projects.service.ts` — thin client + 5-min in-memory cache; method `listBilateralProjectsWithMappings()`, `findProjectById(id)`.
- **ADD T-15.11** — controller + service for `GET /api/v1/results/:resultCode/bilateral/science-programs` (consumes mapping table + CLARISA projects service).
- **ADD T-15.12** — `src/domain/tools/prms-toc/prms-toc.service.ts` + controller + service for `GET /api/v1/results/:resultCode/bilateral/hlos-indicators`.
- **ADD T-15.13** — Migration `<timestamp>-createBilateralProjectMapping.ts` for the new join table (R-BIL-079) + entity `BilateralProjectMapping` extending `AuditableEntity`.
- **ADD T-15.14** — `BilateralProjectMappingService` (CRUD + history) + `BilateralProjectMappingController` (admin REST surface) + DTOs + repository. Role-gated to `CENTER_ADMIN` / `SYSTEM_ADMIN`. Includes lookup helper `findActiveByAgreementId(agreement_id)` consumed by T-15.11.
- **ADD T-15.15** — Admin SSR page `/admin/bilateral-project-mappings` (React 19 list + edit components per `src/admin/README-REACT.md`) + matching `AdminController` handler + new sidebar entry + new `AdminService` method.
- **ADD T-15.16** (DEFERRED, captured for backlog) — AI-assisted mapping suggestions: button on the admin edit form calls an LLM/embedding service to propose candidate CLARISA projects given AGRESSO contract metadata; operator confirms or rejects; on confirm, row is created with `source = AI_SUGGESTED` and `confidence_score` populated. Not in scope for first cut.

---

## 9. Approach options

### Option A — Pure CLARISA + PRMS proxy (no local cache)

Pros: simplest. Both sources canonical; no consistency risk. No cron, no extra columns.
Cons: every picker open hits CLARISA + PRMS. Latency depends on upstreams. Outage → picker empty.

### Option B — CLARISA + PRMS proxy with short-TTL in-memory cache (Recommended)

Pros: both sources canonical; pick latency fast on warm cache; tolerates short upstream hiccups. Local `clarisa_science_programs` covers display-field enrichment.
Cons: cache invalidation TTL-based (acceptable — project↔SP changes are rare).

### Option C — Keep the periodic sync model (Option from previous proposal)

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

---

## 11. Risks, dependencies, and open questions

| # | Item | Notes |
| --- | --- | --- |
| ~~OQ-RV-1~~ | ~~Canonical join key STAR result → CLARISA project~~ | **CLOSED 2026-05-25** — resolved by introducing the `bilateral_project_mapping` admin table (R-BIL-079 / R-BIL-080). |
| **OQ-RV-2** | Confirm the PRMS ToC endpoint that takes SP codes and returns HLOs / indicators. URL, auth, payload, supported filters (portfolio, status). | Owner: PRMS team. Due: 2026-06-05. **BLOCKER for R-BIL-077 / T-15.12.** |
| **OQ-RV-3** | When a STAR result is funded by multiple AGRESSO contracts each mapped to a different CLARISA project, do we UNION or INTERSECT the SP sets for the picker? | Owner: MEL PO + STAR FE. Due: 2026-06-15. |
| **OQ-RV-4** | Should the picker show only SPs whose `status === "Confirmed"`, or also `Pending` / `Draft`? | Owner: MEL PO. Due: 2026-06-15. |
| **OQ-RV-5** | Should the picker filter on the active portfolio (`P25`)? If a project has mappings to multiple portfolios (P22 + P25), do we show only the current one? | Owner: MEL PO. Due: 2026-06-15. |
| **OQ-RV-6** | Does CLARISA `/api/projects` require additional filters for performance once we hit production (today returns 299 records in ~1 MB; tolerable but worth confirming)? | Owner: CLARISA team. Due: 2026-06-30. |
| **OQ-RV-7** | Admin UX: should bulk CSV import be Phase 1 or Phase 2? With 200+ bilateral contracts, one-by-one mapping is operator-painful — but a CSV importer is its own task and pushes T-15.15 over a one-day budget. | Owner: MEL PO + ops. Due: 2026-06-15. |
| **OQ-RV-8** | AI assistance scoping: which LLM / embedding service do we use for suggestions? (Anthropic / OpenAI / on-prem.) What's the operator workflow — "suggest top-N", auto-apply with confidence threshold, or pure suggestion? | Owner: ARI backend lead + PO. Due: 2026-07-15 (T-15.16 is deferred). |
| **OQ-RV-9** | When deactivating a mapping, what happens to STAR results that already have `selected_science_programs` persisted from that mapping? Do we (a) leave them alone (codes were CLARISA-canonical at the time), (b) re-validate on next read, or (c) flag them as `is_stale`? | Owner: MEL PO + ARI backend. Due: 2026-06-15. |
| Risk | CLARISA latency on picker open. | Mitigation: 5-min in-memory cache; circuit-breaker after 3 failures. |
| Risk | PRMS ToC endpoint not yet documented. | Block T-15.12 until OQ-RV-2 closes. Document explicit `503` response with retry hint until then. |
| Risk | Operator burden of manual mapping at launch (200+ bilateral contracts). | Mitigation: launch with the mapping page; track admin workload weekly; if friction is high, accelerate T-15.16 (AI assist) or T-15.15+ (CSV import) into a Phase 1.6 wave. |
| Risk | Local fallback catalog drifts vs CLARISA. | Acceptable: it's display-only. Codes are CLARISA-canonical. |

---

## 12. Success criteria

- This revision is approved by the bilateral module PO.
- PRMS team confirms OQ-RV-2; MEL PO closes OQ-RV-3..5 + OQ-RV-7 + OQ-RV-9. OQ-RV-8 (AI scoping) MAY remain open; T-15.16 is deferred and not on this wave's critical path.
- `/sdd-specify bilateral-module/pending-items` is re-run; the resulting `requirements.md` / `design.md` / `tasks.md` reflect this revision (R-BIL-072 removed, R-BIL-076..080 added, T-15.5 dropped, T-15.10..15 added, T-15.16 captured-but-deferred).
- STAR FE handoff doc updated to consume the new endpoints and stops calling `/api/tools/clarisa/science-programs` directly (kept available but deprecated). FE handles `mapping_status: "unmapped"` empty state.
- Admin SSR page renders the mapping list/edit and a `CENTER_ADMIN` can create + deactivate a mapping end-to-end in dev environment.

---

## 13. Next step

```text
/sdd-specify bilateral-module/pending-items
```

Re-run after this revision is approved. With OQ-RV-1 now closed (admin-owned join table), only T-15.12 (PRMS ToC endpoint, R-BIL-077) stays BLOCKED on OQ-RV-2. The rest of the new tasks (T-15.10..15) are READY in the regenerated `tasks.md` as soon as PO approves the revision.

Sensible PR sequencing:
1. **T-15.13** (mapping table + entity) — unblocks everything downstream; small migration.
2. **T-15.10** (CLARISA projects tool) + **T-15.14** (mapping admin service+controller) — can land in parallel.
3. **T-15.15** (admin SSR page) — needs T-15.14.
4. **T-15.11** (per-result SP endpoint) — needs T-15.10 + T-15.14.
5. **T-15.12** (PRMS ToC endpoint) — when OQ-RV-2 closes.
6. **T-15.16** (AI assist) — deferred backlog.

Both this revision and the original [`./proposal.md`](./proposal.md) serve as canonical input; the resulting spec files supersede the 2026-05-24 trio.
