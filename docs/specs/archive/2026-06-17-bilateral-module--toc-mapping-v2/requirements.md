# Requirements — Bilateral module / ToC Mapping v2 (lambda-toc integration)

> **SDD spec.** Follows [`docs/specs/general-setup/requirements.md`](../../general-setup/requirements.md).
> Inputs: [`./proposal.md`](./proposal.md) (approved 2026-06-09), client handoff `alliance-research-indicators-client/docs/specs/bilateral-module/toc-mapping-v2/backend-handoff.md`, [`../requirements.md`](../requirements.md), [`../pending-items/requirements.md`](../pending-items/requirements.md).
> Companion documents: [`./design.md`](./design.md), [`./tasks.md`](./tasks.md).

---

## 1. Document control

| Field | Value |
| --- | --- |
| Spec id | 2026-06-toc-mapping-v2 |
| Module | bilateral-module |
| Status | Draft — pending approval |
| Phase | Phase 1 of the SDD methodology (requirements) |
| Owner | Eng: Juanca. PO/BA: TBC (OQ answers route through Juanca). |
| Linked branch | `AC-1594-bilateral-module-v2` |
| Linked PRD section | [`../../../prd.md`](../../../prd.md) — bilateral / pool-funding scope |
| Extends | [`../pending-items/requirements.md`](../pending-items/requirements.md) (R-BIL-070…080 band) |
| Supersedes | The (SP, AOW)-pair ToC read of R-BIL-077 lineage; ToC-read sections of [`../indicator-mapping/`](../indicator-mapping/) |
| Requirement band | R-BIL-090 … R-BIL-098, NFR-BIL-090 … NFR-BIL-092 |
| Last updated | 2026-06-09 |
| Approvers | [ ] PO · [ ] Eng lead · [ ] BA |

---

## 2. Context

The PRMS team retired the (SP, AOW)-pair public results framework feed in favor of **lambda-toc**, keyed by **(Science Program, level)** where level ∈ `OUTPUT` / `OUTCOME` / `EOI`. The agreed UX (2026-05-28; mapping is **indicator-level only**, HLO grouping is display-only) has the contributor answer, **per SP on the alignment**: "does this result align with this SP's ToC?" and, if yes, pick one ToC result + one indicator at an allowed level and enter a quantitative contribution.

This spec reshapes the existing ToC read endpoint to the **frozen FE wire contract** (handoff §4 — the STAR client builds Jest fixtures against it), adds per-SP alignment persistence with display snapshots, a server-owned `result_type → allowed_levels` rule, and a hardcoded live-version 2026 gate. The resolution chain (result → AGRESSO contract → `bilateral_project_mapping` → CLARISA project → SP codes, portfolio `ARI_BILATERAL_ACTIVE_PORTFOLIO` default `P25`) does **not** change. The STAR client is the endpoint's only consumer and the module is unshipped, so the reshape happens in place — no `/v2` route.

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| lambda-toc | Upstream catalog service at `ARI_TOC_INTEGRATION_HOST` (`https://lambda-toc.clarisa.cgiar.org`), no auth observed, CloudFront-fronted. |
| Level | Catalog category: `OUTPUT` (High-Level Output), `OUTCOME` (Intermediate Outcome), `EOI` (2030 Outcome). |
| ToC result | One node in an SP's Theory of Change at a level (`toc_result_id`, numeric, stable). |
| Indicator | A measurable indicator under a ToC result (`indicator_id`, numeric, stable). |
| ToC alignment | The per-(result, SP) saved answer: aligns yes/no + chosen level/ToC result/indicator + quantitative contribution. |
| Snapshot | Denormalized display fields copied from the catalog at save time so saved alignments survive upstream drift. |
| Live version | The result's active reporting version year; hardcoded mappable year = **2026**. |

---

## 4. System context & scope

**In scope:** the `GET …/hlos-indicators` read reshape; `toc_alignments[]` on the PATCH write; read-back of saved alignments; new persistence table; `result_type → allowed_levels` rule; version gate; retirement of the AOW-pair machinery after cutover.

**Out of scope (unchanged):** resolution chain and portfolio filter; `bilateral_project_mapping` admin flows; indicator-mapping handler machinery (`result_pool_funding_indicator_mapping` + type handlers); PRMS push; versioning proper (2027 rollover); indicator-type filtering (OQ-V2-2 — ship unfiltered with `type_value` passthrough); STAR client code.

---

## 5. Stakeholders / personas

| Persona | Interest |
| --- | --- |
| Principal Investigator / Contributor (STAR) | Answers the per-SP alignment question and picks ToC result + indicator. |
| STAR frontend (machine consumer) | Builds against the frozen §4 wire contract; demo target 2026-06-11. |
| BA / PRMS team | Owns OQ-V2-2/3/5 answers; consumes saved alignments downstream. |
| ARI backend squad | Owns the rule, gate, persistence, and cutover. |

---

## 6. Functional requirements

### R-BIL-090 — Level-based ToC catalog read (frozen FE envelope)

- **As a** STAR frontend
- **I want** `GET /api/v1/results/:resultCode/pool-funding-alignment/hlos-indicators` to return per-SP, per-allowed-level ToC catalogs
- **So that** the contributor can browse and pick a ToC result + indicator without the FE calling lambda-toc or re-deriving rules

**Details:**
- Inputs: `:resultCode` path token. No query params.
- Behavior:
  - Resolve SPs via the unchanged chain; SP set = SPs available on the project (FE filters by selected SPs).
  - For each SP × each allowed level (R-BIL-091), source the catalog from lambda-toc (`/api/toc-integration/toc/results/category/{LEVEL}/initiative/{SP}`).
  - Map upstream fields: `wp_short_name` → `aow_code` (null for `EOI`); `unit_messurament` → `unit_of_measurement`; resolve `targets[]` → single `(target_value, target_year)` for year **2026** (`target_value: null` when no 2026 target exists); pass `type_value` through unfiltered.
- Outputs (`ServerResponseDto.data`): `{ result_code, mapping_status: 'mapped'|'unmapped', clarisa_project: {id, short_name}|null, result_type, allowed_levels[], version_locked, catalogs: [{ sp_code, levels: [{ level, toc_results: [{ toc_result_id, title, description, aow_code, indicators: [{ indicator_id, indicator_description, unit_of_measurement, type_value, target_value, target_year }] }] }] }] }` — byte-compatible with handoff §4.
- Errors: 404 unknown result; 503 cold-cache upstream failure (NFR-BIL-090).
- Permissions: same as today (authenticated; read).

**Acceptance criteria:**
- [ ] AC.1 — Mapped result with SP01+SP03 returns one `catalogs[]` entry per SP, each with one `levels[]` entry per allowed level, populated from lambda-toc.
- [ ] AC.2 — Response contains **no** `pairs`, `aow_status`, or `no_aow_mappings` keys.
- [ ] AC.3 — An indicator with an upstream 2026 target returns that single `(target_value, target_year: 2026)`; the 11-year `targets[]` array never appears.
- [ ] AC.4 — Unmapped result (no contract / no mapping row / no SPs in active portfolio) returns `mapping_status: 'unmapped'`, `catalogs: []`.
- [ ] AC.5 — Upstream `{"response":[]}` for an (SP, level) yields `toc_results: []` for that level with HTTP 200 (valid empty catalog, not an error).

#### Scenario: mapped Capacity Sharing result

- GIVEN result STAR-5238 is a pool-funding contributor mapped to a CLARISA project with confirmed SP01 in portfolio P25
- AND the result type is Capacity Sharing for Development
- WHEN the FE calls `GET …/hlos-indicators`
- THEN `allowed_levels` is `["OUTPUT"]` and `catalogs[0]` is `{ sp_code: "SP01", levels: [{ level: "OUTPUT", toc_results: [...] }] }`

### R-BIL-091 — Server-owned `result_type` → `allowed_levels` rule

- **As a** STAR frontend
- **I want** the backend to compute and embed `result_type` (canonical enum key) and `allowed_levels[]`
- **So that** the level rule has a single source of truth and the FE never re-derives it

**Details:**
- Behavior (rule table, server-side only):

  | Result type | `result_type` key | `allowed_levels` |
  | --- | --- | --- |
  | Capacity Sharing for Development | `capacity_sharing` | `["OUTPUT"]` |
  | Innovation Development | `innovation_dev` | `["OUTPUT"]` |
  | Policy Change | `policy_change` | `["OUTCOME", "EOI"]` |
  | anything else (pending OQ-V2-5) | canonical key of the type | `[]` |

- Outputs: `result_type` + `allowed_levels` on the R-BIL-090 envelope. `allowed_levels: []` ⇒ `catalogs: []` (no upstream calls made) and the FE hides the ToC block.
- Errors: none new.

**Acceptance criteria:**
- [ ] AC.1 — A Policy Change result returns `allowed_levels: ["OUTCOME","EOI"]` and catalogs for exactly those two levels.
- [ ] AC.2 — A Knowledge Product result returns `allowed_levels: []` and `catalogs: []`, and no lambda-toc call is made for it.
- [ ] AC.3 — The same rule rejects disallowed levels on write (R-BIL-094 AC.2) — read and write cannot diverge.

### R-BIL-092 — Per-SP ToC alignment write

- **As a** Contributor
- **I want** `PATCH /api/v1/results/:resultCode/pool-funding-alignment` to accept `toc_alignments[]`
- **So that** each SP's ToC answer is saved independently

**Details:**
- Inputs (extends existing body — `has_contribution`, `sp_codes[]`, `justification?` unchanged):
  ```jsonc
  "toc_alignments": [
    { "sp_code": "SP01", "aligns_with_toc": true, "level": "OUTPUT", "toc_result_id": 5187, "indicator_id": 5972, "quantitative_contribution": 3 },
    { "sp_code": "SP03", "aligns_with_toc": false }
  ]
  ```
- Behavior:
  - At most **one active alignment row per (result, sp_code)** (cardinality per OQ-V2-3; schema leaves N-per-SP one index change away).
  - Upsert is **independent per `sp_code`**: writing SP01's alignment SHALL NOT modify SP03's row (no deactivate-all-recreate).
  - `aligns_with_toc: false` persists the explicit "No" (row with null ToC refs).
  - `quantitative_contribution` is numeric, nullable.
  - `toc_alignments` is optional; omitting it leaves existing alignment rows untouched.
  - On save with `aligns_with_toc: true`, persist display snapshots (R-BIL-095).
  - Existing side effects preserved: audit fields, `ResultReviewHistory` entry, `POOL_FUNDING_ALIGNMENT_CHANGED` socket event.
- Outputs: updated alignment detail (R-BIL-096 shape).
- Errors: R-BIL-094; existing 409s (PRMS-sourced, synced) and 400s unchanged.
- Permissions: unchanged — `@Roles(CONTRIBUTOR, CENTER_ADMIN, SYSTEM_ADMIN)` + `ResultOwnerGuard`.

**Acceptance criteria:**
- [ ] AC.1 — PATCH with alignments for SP01 and SP03, then PATCH changing only SP01: SP03's row keeps its `id`, `updated_at`, and payload (verified at DB level).
- [ ] AC.2 — `{ sp_code, aligns_with_toc: false }` persists an active row with null `level`/`toc_result_id`/`indicator_id` and is read back as the explicit "No".
- [ ] AC.3 — Re-submitting the same SP with a different indicator updates that SP's single active row (no duplicate active rows per (result, sp_code)).
- [ ] AC.4 — A denied role (e.g. GUEST) receives 403 via the envelope; an allowed role succeeds.

#### Scenario: per-SP independence

- GIVEN STAR-5238 has saved alignments for SP01 (Yes, indicator 5972, contribution 3) and SP03 (No)
- WHEN the contributor PATCHes `toc_alignments: [{ sp_code: "SP01", aligns_with_toc: true, level: "OUTPUT", toc_result_id: 5187, indicator_id: 6001, quantitative_contribution: 5 }]`
- THEN SP01's row now references indicator 6001 with contribution 5
- AND SP03's row is byte-identical to before the request

### R-BIL-093 — SP removal cascades its ToC alignment

- **As a** Contributor
- **I want** removing an SP from `sp_codes` to deactivate that SP's ToC alignment
- **So that** alignments never dangle on unselected SPs

**Details:**
- Behavior: when a PATCH's effective `sp_codes` no longer contains an SP that has an active ToC alignment row, that row is soft-deactivated (`is_active = false`) in the same transaction. Re-adding the SP later starts fresh (no auto-revive).
- Errors: a `toc_alignments[]` entry whose `sp_code` is not in the effective `sp_codes` → 400 (R-BIL-094).

**Acceptance criteria:**
- [ ] AC.1 — PATCH dropping SP03 from `sp_codes` deactivates SP03's alignment row; subsequent reads omit it.
- [ ] AC.2 — Re-adding SP03 then reading returns SP03 with no saved alignment (fresh state).

### R-BIL-094 — Write validation with per-alignment errors

- **As a** STAR frontend
- **I want** 400s that pinpoint the failing `sp_code` and field
- **So that** the FE can render inline per-SP errors

**Details:**
- Behavior / errors (HTTP 400, `errors` payload in the envelope):
  - `unknown_sp_codes: [...]` — existing contract, unchanged.
  - Per-alignment errors carrying `{ sp_code, field, error }` for: unknown `toc_result_id` or `indicator_id` (not in the (SP, level) catalog), `level` not in the result's `allowed_levels`, `sp_code` not in effective `sp_codes`, `aligns_with_toc: true` missing `level`/`toc_result_id`/`indicator_id`, duplicate `sp_code` entries in `toc_alignments[]`.
  - Validation reads the catalog through the same cached service — a cold-cache upstream failure during validation → 503, nothing persisted.
- Outputs: nothing persisted on any 400/503 (request is atomic).

**Acceptance criteria:**
- [ ] AC.1 — Unknown `indicator_id` for SP01 → 400 whose `errors` identifies `sp_code: "SP01"` and the field; valid SP03 entry in the same request is NOT persisted.
- [ ] AC.2 — `level: "OUTCOME"` on a Capacity Sharing result → 400 (disallowed level), same per-alignment shape.
- [ ] AC.3 — Body with unknown SP code still returns the legacy `errors.unknown_sp_codes` array.

### R-BIL-095 — Display snapshots survive catalog drift

- **As a** BA / Contributor
- **I want** saved alignments to render from data captured at save time
- **So that** a saved mapping remains legible if lambda-toc content changes or disappears (2027-versioning hedge)

**Details:**
- Behavior: on save with `aligns_with_toc: true`, copy from the catalog into the row: `toc_result_title`, `indicator_description`, `unit_messurament` (verbatim upstream spelling stored; exposed as `unit_of_measurement`), `target_value`, `target_year`. Read-back (R-BIL-096) serves these from the row, never live from upstream.

**Acceptance criteria:**
- [ ] AC.1 — After saving, reading the alignment with the upstream catalog mocked to return `{"response":[]}` still returns the saved titles/values.
- [ ] AC.2 — Snapshot columns are populated for "Yes" rows and null for "No" rows.

### R-BIL-096 — Read-back of saved ToC alignments

- **As a** STAR frontend
- **I want** the alignment detail (`GET /api/v1/results/:resultCode/pool-funding-alignment` and the PATCH response) to include saved `toc_alignments[]`
- **So that** the form re-opens in its saved state without consulting the catalog

**Details:**
- Outputs: existing alignment detail extended with `toc_alignments: [{ sp_code, aligns_with_toc, level, toc_result_id, indicator_id, quantitative_contribution, toc_result_title, indicator_description, unit_of_measurement, target_value, target_year }]` (active rows only; snapshot-sourced). Exact placement/naming is backend-owned (handoff: "final shape owned by backend spec") — frozen in `design.md` §4.
- Errors: none new.

**Acceptance criteria:**
- [ ] AC.1 — GET after the R-BIL-092 scenario returns both SP01 ("Yes" + snapshots) and SP03 ("No").
- [ ] AC.2 — PATCH response body equals a subsequent GET (same envelope `data` shape).

### R-BIL-097 — Version gate (live version 2026)

- **As a** PO
- **I want** ToC mapping locked to live version 2026
- **So that** out-of-version results cannot create alignments before versioning proper lands

**Details:**
- Behavior: mappable live version is **hardcoded to 2026**. Write requests carrying `toc_alignments[]` for a result whose live version ≠ 2026 → HTTP 409 with error code `toc_mapping_version_locked`. The read envelope carries `version_locked: boolean` (true ⇒ FE renders the locked state; catalogs still returned).
- Errors: 409 `{ errors: { code: 'toc_mapping_version_locked' } }` (exact payload frozen in design §4).

**Acceptance criteria:**
- [ ] AC.1 — Result on live version 2026: `version_locked: false`; PATCH with `toc_alignments[]` succeeds.
- [ ] AC.2 — Result on a different live version: read returns `version_locked: true`; PATCH with `toc_alignments[]` → 409 with code `toc_mapping_version_locked`.
- [ ] AC.3 — PATCH **without** `toc_alignments[]` (legacy body) is NOT blocked by the gate.

### R-BIL-098 — Retirement of the AOW-pair read path (post-cutover)

- **As a** maintainer
- **I want** the PRMS pair-based machinery removed once cutover is verified
- **So that** there is one ToC source and no dead code

**Details:**
- Behavior: until cutover is verified in testing, `PrmsTocService`, `ARI_PRMS_TOC_HOST`, and `ClarisaCgiarEntitiesService.getAreasOfWorkBySp` remain untouched (rollback window). After verification: delete `domain/tools/prms-toc/`, drop the env var from `.env.example`/env utils, and remove the AOW fan-out from `BilateralService`. `getAreasOfWorkBySp` itself stays (other consumers may exist) — only its use in this flow goes.
- Migration note: no DB change; pure code removal in an isolated commit.

**Acceptance criteria:**
- [ ] AC.1 — After cleanup, no source file references `ARI_PRMS_TOC_HOST` or `PrmsTocService`; build, lint, and tests pass.
- [ ] AC.2 — Cleanup lands as its own PR, gated on a recorded cutover-verified note in `tasks.md`.

---

## 7. Non-functional requirements

### NFR-BIL-090 — Catalog resilience (mirror of NFR-BIL-073)

- **Category:** reliability
- **Target:** in-memory cache TTL 5 min keyed `${sp}:${level}`; upstream failure with warm cache ⇒ serve stale + warn log; cold cache ⇒ 503 through `GlobalExceptions`; `{"response":[]}` is a valid, cacheable empty catalog (HTTP 200) — never inferred as an invalid level.
- **How verified:** unit tests on the service (fake timers for TTL; mocked upstream failure warm/cold; empty-payload caching).

### NFR-BIL-091 — Catalog fan-out latency

- **Target:** upstream calls per read ≤ |SPs| × |allowed levels| (typically ≤ 4), issued in parallel; warm-cache read performs zero upstream calls.
- **How verified:** unit test asserting call count and parallel dispatch (mock call ordering).

### NFR-BIL-092 — Observability

- **Target:** `LoggerUtil` warn on stale-serve (fields: `sp`, `level`, upstream status), error on cold-cache 503; no new `sync_process_log` types.
- **How verified:** unit test asserting logger invocations; code review.

Inherited defaults (envelope, `/api/v1` versioning, `AuditableEntity` audit, `GlobalExceptions`) apply without restatement.

---

## 8. Data requirements

- **New entity:** `src/domain/entities/bilateral/entities/result-pool-funding-toc-alignment.entity.ts` — table `result_pool_funding_toc_alignment` (new table per proposal Option A / OQ-V2-9 settled). Columns: `id` PK; `result_id` (bigint, FK-by-value to `results`); `sp_code` (varchar 50); `aligns_with_toc` (boolean); `level` (varchar 10, nullable); `toc_result_id` (int, nullable); `indicator_id` (int, nullable); `quantitative_contribution` (decimal, nullable); snapshots `toc_result_title` (text), `indicator_description` (text), `unit_messurament` (varchar 100), `target_value` (varchar 50), `target_year` (int) — all nullable; `AuditableEntity` fields.
- **Partial-unique:** one active row per (result, SP) via generated column (`active_result_sp` pattern from migration `1779190000014`), unique index `idx_rpfta_active_result_sp`.
- **Migration:** one append-only migration `<timestamp>-createResultPoolFundingTocAlignment.ts`. No backfill (feature is unshipped; no legacy rows to convert).
- **OpenSearch:** no decoration — alignment rows are not searchable content.
- **Existing tables untouched** (`result_pool_funding_alignment`, `_sp`, `_indicator_mapping`, `bilateral_project_mapping`).

---

## 9. API surface delta

| Method + URL | Change | Roles / guards | DTO / response |
| --- | --- | --- | --- |
| `GET /api/v1/results/:resultCode/pool-funding-alignment/hlos-indicators` | **Breaking reshape in place** (allowed: sole consumer is unshipped STAR FE) — `pairs[]` → frozen §4 envelope | unchanged | response DTO rewritten (`bilateral-hlos-indicators.response.dto.ts`) |
| `PATCH /api/v1/results/:resultCode/pool-funding-alignment` | Body extended with optional `toc_alignments[]`; new 400 per-alignment errors; new 409 `toc_mapping_version_locked` | unchanged (`CONTRIBUTOR`, `CENTER_ADMIN`, `SYSTEM_ADMIN`; `ResultOwnerGuard`) | `update-pool-funding-alignment.dto.ts` extended |
| `GET /api/v1/results/:resultCode/pool-funding-alignment` | Response extended with `toc_alignments[]` (additive) | unchanged | repository/DTO extended |

Swagger annotations required on every touched handler. No machine-token visibility change.

---

## 10. Cross-system impact

- **lambda-toc (new upstream):** `domain/tools/toc-integration/` (new tool module); env `ARI_TOC_INTEGRATION_HOST` (already set in `.env`). No auth; flag DNS-resolver caveat to infra.
- **PRMS public framework:** consumer retired post-cutover (R-BIL-098).
- **CLARISA:** unchanged usage (projects, science programs); `getAreasOfWorkBySp` leaves this flow only.
- **Socket.IO:** existing `POOL_FUNDING_ALIGNMENT_CHANGED` event retained; payload unchanged unless design finds it carries the old shape — then frozen in design §7.
- **STAR (`client/`):** matching spec `alliance-research-indicators-client/docs/specs/bilateral-module/toc-mapping-v2/`; never modified from here.

---

## 11. Assumptions, dependencies, risks

| # | Type | Item | Mitigation |
| --- | --- | --- | --- |
| A-1 | Assumption | `OUTPUT`/`OUTCOME`/`EOI` are canonical and stable across SPs (OQ-V2-1, verified empirically on SP01) | Rule table is one constant; cheap to amend. |
| A-2 | Assumption | Target year = 2026 (OQ-V2-6; mockup copy says 2025) | Single constant; snapshot stores `target_year` so historical rows are self-describing. |
| A-3 | Assumption | The result's live version year is derivable server-side (existing version/reporting fields) | Confirmed in design §5; if absent, gate falls back to a config constant + risk note. |
| D-1 | Dependency | lambda-toc availability in server environments (DNS caveat 2026-06-09) | Warm-cache resilience; raise with infra before testing deploy. |
| D-2 | Dependency | FE fixture parity — contract frozen at handoff §4 | Any deviation requires a relayed contract change, not silent drift. |
| R-1 | Risk | No-auth upstream could change (auth added later) | Isolate HTTP concerns in `TocIntegrationService`; one place to add headers. |
| R-2 | Risk | In-place reshape breaks an unknown consumer | Verified sole-consumer claim before landing (grep + Swagger consumers check) — recorded in tasks. |

---

## 12. Open questions

| ID | Question | Owner | Target | Blocking? |
| --- | --- | --- | --- | --- |
| OQ-V2-2 | Indicator-type filter: strict / include `custom` / none | BA via Juanca | pre-GA | Final behavior only — build ships unfiltered + `type_value`. |
| OQ-V2-3 | Exactly one (level, ToC result, indicator) per SP? | BA via Juanca | pre-GA | Schema margin handled (index change flips cardinality). |
| OQ-V2-5 | Level rules / visibility for other result types | BA via Juanca | pre-GA | Those types get `allowed_levels: []` meanwhile. |
| OQ-V2-6 | Target year 2026 vs mockup's 2025 | BA via Juanca | pre-build | Assumed 2026 (A-2). |

Resolved here: **OQ-V2-9** → new table (proposal Option A). **OQ-V2-1** → assumed canonical (A-1).

---

## 13. Requirement ID index

| ID | Title |
| --- | --- |
| R-BIL-090 | Level-based ToC catalog read (frozen FE envelope) |
| R-BIL-091 | Server-owned `result_type` → `allowed_levels` rule |
| R-BIL-092 | Per-SP ToC alignment write |
| R-BIL-093 | SP removal cascades its ToC alignment |
| R-BIL-094 | Write validation with per-alignment errors |
| R-BIL-095 | Display snapshots survive catalog drift |
| R-BIL-096 | Read-back of saved ToC alignments |
| R-BIL-097 | Version gate (live version 2026) |
| R-BIL-098 | Retirement of the AOW-pair read path (post-cutover) |
| NFR-BIL-090 | Catalog resilience |
| NFR-BIL-091 | Catalog fan-out latency |
| NFR-BIL-092 | Observability |

---

## 14. Sign-off

- [ ] Engineering lead — TBC
- [ ] MEL / product owner — TBC
- [ ] BA (OQ owner) — TBC
