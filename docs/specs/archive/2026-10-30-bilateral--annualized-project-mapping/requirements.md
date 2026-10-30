# Requirements — Bilateral / Annualized Project Mapping

- **Module:** bilateral (server `bilateral-project-mapping`, `tools/clarisa/projects`, pool-funding readers; client `center-admin/bilateral-mapping`)
- **Spec id:** 2026-10-annualized-project-mapping
- **Status:** approved (Phase 1 gate, 2026-10-28 — Continue + OQ-1 option a)
- **Owner:** David Casañas
- **Type:** Change · **Deliverable:** software · **Depth:** Full (schema migration, API contract removal, shared SQL predicate)
- **Approval Mode:** `gated` (inherited from `proposal.md`)
- **Linked PRD section:** `docs/prd.md` — bilateral / pool-funding contribution
- **Linked tickets:** none supplied (owner, 2026-10-28)
- **Extends:** `archive/2026-08-20-bilateral--clarisa-automapper-s2` (R-CAM-002/003/004/005) · `archive/2026-10-08-bilateral--pool-funding-reporting-year` (R-PRY-001 `ReportingYearResolver`)
- **Supersedes:** `archive/2026-08-18-bilateral--clarisa-phase-config-variable` (R-CPC-*: `ARI_CLARISA_PROJECTS_PHASE` as a year source)
- **Last updated:** 2026-10-28

---

## Executive Summary

The bilateral mapping becomes **one set per PRMS reporting year**. The year is always `ARI_PRMS_SYNC`; nobody picks it.

| # | What changes |
| --- | --- |
| 1 | Every mapping row records its `reporting_year`. Each contract has one row per year. |
| 2 | Every endpoint and every green contributor tag reads **only the current year's** rows. |
| 3 | A sync only ever writes the current year, so earlier years are never touched. |
| 4 | A sync is an **upsert**: no row → create active; existing row → update it, never change `is_active`. MANUAL rows are never touched by Auto-map. |
| 5 | `ARI_CLARISA_PROJECTS_PHASE` is retired. One variable (`ARI_PRMS_SYNC`) drives CLARISA, mapping and PRMS. |
| 6 | No endpoint accepts a year. The table gains a Year column; the header and a readiness note show the current year. |

## Glossary

| Term | Meaning |
| --- | --- |
| **Reporting year** | The value of `app_config` key `ARI_PRMS_SYNC`, read by `ReportingYearResolver`. It is **not** the calendar year. |
| **Current year** | The reporting year at the moment a request is served. |
| **Mapping row** | A `bilateral_project_mapping` row joining an AGRESSO agreement to a CLARISA project. |
| **DERIVED / MANUAL** | `source` of a row: created by Auto-map / created by a person. |
| **Automation-owned** | any `source` other than `MANUAL` (`DERIVED`, `AI_SUGGESTED`, `AI_AUTO`). |
| **Contributor tag** | The green "contributes to pool funding" badge driven by `effectivePoolFundingContributorSql`. |
| **Upsert rule** | R-APM-005: create when absent, update when present, `is_active` never written by a sync. |

## 1. Context

**What and why.** Today a mapping row has no year (`bilateral-project-mapping.entity.ts`; unique `uk_bpm_active_agreement` in `db/migrations/1779190000011-createBilateralProjectMapping.ts:33-36`). An Auto-map for a new phase **deactivates the prior row** when the CLARISA id differs (`automapper.service.ts` `apply()` supersede; dialog copy at `automapper-dialog.component.html:375`). Every reader looks only at `is_active = 1` (16 code lines among the 35 hits of the design's P-10 sweep; see §7). Moving to the next reporting year therefore erases the evidence that a contract contributed in the prior year.

Two variables carry the same year. The CLARISA fetch uses `ARI_PRMS_SYNC` (`clarisa-projects.service.ts:235-247`), while the eligibility filter uses `ARI_CLARISA_PROJECTS_PHASE` (`:86-93` via `mapping-phase.resolver.ts`, 5-min TTL). PRMS only accepts the year `ARI_PRMS_SYNC` holds (`result-prms-sync/eligibility/sync-gate.ts:80-127`). On Dev both keys hold `2026` (read-only query, 2026-10-28).

There is also a defect. Auto-map's classification reads **active rows only** (`automapper.service.ts` `classifyAgainstExisting`, `.andWhere('bpm.is_active = :isActive', { isActive: true })`), so a deactivated contract is re-created as a second row. Dev holds 197 active DERIVED rows and 1 inactive (`A1697`). This is established from the code path, not reproduced, because Apply writes to the shared DB.

**Who asked.** The owner, 2026-10-28, with decisions on OQ-1…4 and OQ-A…D in `proposal.md` r4.

**Not changing.** How `ARI_PRMS_SYNC` is edited; the legacy `agresso_contracts.is_pool_funding_contributor` flag; CLARISA matching logic (`normalizeExternalCode`, eligibility predicates other than the year); the PRMS push gate.

**Affected surface — by what renders on `/platform/…/center-admin/bilateral-mapping` (KZ-002):**
- the page header (help text, "Phase 2026");
- `bilateral-mapping-coverage`;
- the filter bar (Search / Status / Source);
- the mapping `p-table` (columns, status tag, row actions);
- `automapper-dialog` (preview buckets, phase line);
- the create/edit mapping modal;
- the shared Configuration Variables modal (`edit-environment-variable-modal`), which renders the retired key's selector;
- outside the STAR route, the server's `/admin` SSR page `admin/client/pages/BilateralProjectMappings.tsx`, which creates, deactivates and lists mappings on its own (judgment J-3).

---

## 3. Functional Requirements

### R-APM-001 — Mapping rows carry a reporting year

- **As a** center admin **I want** each mapping to belong to one reporting year **so that** a year's mappings survive the next year.

**Details:**
- Behavior: every row stores `reporting_year`. A row written by any path (Auto-map, manual create) takes the **current year**. Existing rows are backfilled to `2026`.
- Uniqueness: at most **one row per (`agresso_agreement_id`, `reporting_year`)**, whether active or inactive.

**Acceptance criteria:**
- [ ] AC.1 — After the migration, `SELECT COUNT(*) FROM bilateral_project_mapping WHERE reporting_year IS NULL` = 0, and every pre-existing row reads `2026`.
- [ ] AC.2 — Inserting a second row for the same agreement and year fails at the DB.
- [ ] AC.3 — The same agreement can hold one row for 2026 and one for 2027.

#### Scenario: backfill
- GIVEN 198 rows exist with no year (197 active, 1 inactive, Dev 2026-10-28)
- WHEN the migration runs
- THEN all 198 rows read `reporting_year = 2026` and their `is_active`, ids and audit fields are unchanged
- BUT it must NOT lose any row: where an agreement holds more than one row (leftovers of the old supersede), the active one — or else the most recently updated — stays, and the others move to `bilateral_project_mapping_history` (owner J-4 → a; Dev today: 0 such rows)
- AND IT MUST abort, without a partial index swap, only if an agreement holds more than one **active** row

### R-APM-002 — One year variable: `ARI_PRMS_SYNC`

- **As a** system admin **I want** one year to drive CLARISA, mapping and PRMS **so that** they can never disagree (owner, 2026-10-28: *"si una de esas no es igual PRMS mandará error"*).

**Details:**
- Behavior: the CLARISA download, the CLARISA eligibility filter, every mapping endpoint and every mapping reader use the year from `ReportingYearResolver`.
- `ARI_CLARISA_PROJECTS_PHASE` is read nowhere. This covers its app_config row, its ENV fallback and its 5-min cached resolver.
- Its app_config row is **deactivated** (`is_active = 0`), not deleted.

**Acceptance criteria:**
- [ ] AC.1 — With `ARI_PRMS_SYNC = 2026` and the old key's row set to any other year, the eligible cohort and coverage are those of 2026.
- [ ] AC.2 — A repository-wide search for `ARI_CLARISA_PROJECTS_PHASE` over `server/` and `client/` source returns only migrations, docs, and the enum member kept `@deprecated` for merged migration `1786738949211` (owner J-2 → a), which is read nowhere.
- [ ] AC.3 — After the migration the old key's row exists with `is_active = 0`.

#### Scenario: year change takes effect on the next request
- GIVEN `ARI_PRMS_SYNC = 2026` and the mapping screen is open
- WHEN an admin saves `ARI_PRMS_SYNC = 2027` and the screen is reloaded
- THEN coverage, list and preview are computed for 2027
- BUT it must NOT require waiting for a TTL or a restart (K-016)
- AND IT MUST NOT serve a CLARISA feed cached for 2026 as 2027's

### R-APM-003 — No caller-chosen year

- **As a** product owner **I want** the year never to be selectable **so that** a mapping can only be made for the year PRMS accepts.

**Details:**
- Removed inputs: `phase` in the body of `POST …/auto-map/preview` and `POST …/auto-map/apply`; `phase` in the query of `GET …/coverage` and `GET …/coverage-report`. Swagger drops them.
- Behavior: the year is never taken from the request. A `phase` in a POST body is rejected (`400`, the handlers' existing `forbidNonWhitelisted` pipe). A `phase` query on a GET is stripped and ignored.

**Acceptance criteria:**
- [ ] AC.1 — `POST auto-map/preview` with `{ "phase": 2025 }` → `400`, nothing classified. With `{}` it returns the 2026 preview while `ARI_PRMS_SYNC = 2026`.
- [ ] AC.2 — `GET coverage?phase=2025` returns 2026 figures.
- [ ] AC.3 — The client sends no `phase` on any mapping call.

### R-APM-004 — Every read is scoped to the current year

- **As a** user of contract and result listings **I want** the contributor tag to reflect this reporting year **so that** it shows the state PRMS will receive (owner, 2026-10-28).

**Details:**
- Scope: list (`GET /bilateral-project-mappings`), get-by-id, coverage, coverage-report, preview, apply, manual create/update/deactivate, the contributor tag (`effectivePoolFundingContributorSql` and its call sites in `agresso-contract`, `result`, `result-prms-sync-log` and `pi-delegates` repositories), the SP-chain lookup, the PRMS aggregate join, the pi-delegates reads, and the DB validation function. Each reads only rows whose `reporting_year` = current year.
- The legacy `is_pool_funding_contributor` flag OR-branch is unchanged.

**Acceptance criteria:**
- [ ] AC.1 — Contract X has an active 2026 row and no 2027 row. With `ARI_PRMS_SYNC = 2027`, X shows **no** green tag (unless its legacy flag is set). With `2026`, it shows the tag.
- [ ] AC.2 — The list endpoint with no filters returns only current-year rows. Every returned row exposes `reporting_year`.
- [ ] AC.3 — The PRMS payload for a current-year result takes the registry code from the current-year mapping.
- [ ] AC.4 — The year predicate is present in the **generated SQL** of each reader, not only in a mocked call sequence (KZ-001, KZ-017).

#### Scenario: prior-year rows are invisible, not gone
- GIVEN 2026 rows exist and `ARI_PRMS_SYNC = 2027` with no 2027 rows yet
- WHEN the admin opens the mapping screen
- THEN the table is empty and coverage reads `mapped 0`
- BUT it must NOT alter, deactivate or delete any 2026 row
- AND IT MUST show that 2026 rows are still in the DB when the year is set back to 2026

### R-APM-005 — Sync is an upsert; activation belongs to the user

- **As a** center admin **I want** re-running Auto-map to update rows and respect what I deactivated **so that** no duplicates appear and my decision stands (owner, 2026-10-28).

**Details — per contract, against the current year's row:**

| Current-year row | Source of the row | Auto-map does | `is_active` after |
| --- | --- | --- | --- |
| none | — | **create** a DERIVED row | `true` |
| exists, **active**, same project | any | nothing (*alreadyMapped*) | unchanged |
| exists, active, different project | automation-owned | **update** the row's CLARISA fields in place (project id, short name, external code); report *toUpdate* | unchanged |
| exists, active, different project | MANUAL | nothing; report *divergent* (R-CAM-003 kept) | unchanged |
| exists, inactive, same project | any | nothing; report *inactive* | `false` |
| exists, inactive, different project | automation-owned | update CLARISA fields; report *inactive* (refreshed) | `false` |
| exists, inactive, different project | MANUAL | nothing; report *divergent* | `false` |

- The deactivate-and-create supersede (R-CAM-005) is **removed**. No sync path writes `is_active` or `deleted_at`.
- Rows of other years are never read or written by a sync.

**Acceptance criteria:**
- [ ] AC.1 — Deactivate contract X's row, then run Apply 3 times: exactly **one** current-year row for X, `is_active = false`.
- [ ] AC.2 — An automation-owned row whose CLARISA project id changes keeps its `id`. Its `clarisa_project_id` is updated and the row count is unchanged.
- [ ] AC.3 — A MANUAL row is byte-identical after any number of Apply runs.
- [ ] AC.4 — Apply is idempotent: a second run on unchanged CLARISA data writes nothing (R-CAM-002 kept).
- [ ] AC.5 — Each candidate lands in exactly one preview bucket: `toCreate`, `alreadyMapped`, `toUpdate`, `divergent`, `inactive` (plus the existing `ambiguous` / `unresolved`). The `supersede` bucket is gone, and the existing `feedFetchedAt` / `counts` envelope is kept (design §5).

#### Scenario: the A1697 case
- GIVEN `A1697` has one inactive DERIVED 2026 row
- WHEN Auto-map Apply runs for 2026
- THEN `A1697` still has exactly one 2026 row, inactive
- BUT it must NOT create a second row
- AND IT MUST list `A1697` under *inactive* in the preview

### R-APM-006 — Manual create follows the upsert rule

- **As a** center admin **I want** "New mapping" on a contract that already has a row this year to update that row **so that** I never produce a duplicate (owner OQ-B).

**Details:**
- No current-year row for the agreement → create it, active.
- A current-year row exists (active or inactive) → update it with the submitted CLARISA project. `is_active` is unchanged. The response says it was an update.
- Today's `409 Conflict` for an active row (`bilateral-project-mapping.service.ts` `create()`) is replaced by this behavior.
- A person's change of project (create-upsert or `PATCH :id`) on an automation-owned row makes it `MANUAL`, so later Auto-map runs leave it alone (R-APM-005 *divergent*). It also refreshes `clarisa_external_code` from the CLARISA feed, or sets it to `null` (judgment I-1).
- [ ] AC.4 — After a person changes the project of a DERIVED row, the row reads `source = MANUAL`, and the next Apply reports it *divergent* without rewriting it.

**Acceptance criteria:**
- [ ] AC.1 — `POST /bilateral-project-mappings` for an agreement with an inactive 2026 row returns success. The same `id` comes back, `is_active = false`, with the new project.
- [ ] AC.2 — A second POST for the same agreement and year never increases the row count.
- [ ] AC.3 — The response distinguishes *created* vs *updated*.
- [ ] AC.5 — *(amended 2026-10-29, owner decision at the T-06 gate)* Every human write stores `source = MANUAL`: a create on the absent branch, a create on the present branch, and every `PATCH :id`, whether or not the project changes. A submitted `source` is ignored. So a person can never leave a row that Auto-map treats as automation-owned (R-APM-005 / design §6.3).

### R-APM-007 — Admin screen shows the year

- **As a** center admin **I want** to see which reporting year I'm working in **so that** I know what the table and coverage refer to.

**Details:**
- The table gains a **Year** column (`reporting_year`), sortable.
- The header and help text show the current year from the server; the hard-coded "Phase 2026" (`bilateral-mapping.component.html:26,30`) goes away.
- The automapper dialog's phase line shows the server's year.
- The dialog's copy about deactivating previous phases (`:375`) is replaced to match R-APM-005.

**Acceptance criteria:**
- [ ] AC.1 — With `ARI_PRMS_SYNC = 2027`, the header and dialog read 2027 and the column shows 2027 for every row.
- [ ] AC.2 — No template contains a literal year.

### R-APM-008 — Readiness note on the mapping screen

- **As a** center admin **I want** to be told when the current year has no CLARISA projects or no mappings **so that** an empty screen after a year change does not look broken (proposal R-4, OQ-C option 1, K-016).

**Details — the coverage block shows one of these:**

| State | Message intent |
| --- | --- |
| loading | the existing loading state |
| CLARISA error | the existing error state |
| `reachable = 0` | "CLARISA has no eligible projects for {year} yet" |
| `reachable > 0`, `mapped = 0` | "No mappings for {year} yet — run Auto-map" |
| `reachable > 0`, `mapped > 0` | the normal coverage, labelled with {year} |

**Acceptance criteria:**
- [ ] AC.1 — Each state renders its message (component test per state).
- [ ] AC.2 — The `ARI_PRMS_SYNC` modal field stays a plain value, with no CLARISA dropdown.

### R-APM-009 — Inactive is not pending

- **As a** center admin **I want** contracts I deactivated to count as inactive **so that** coverage does not report them as work to do forever.

**Details:**
- Coverage reports `mapped`, `pending`, `inactive`, `reachable`, where `mapped + pending + inactive = reachable`. This deliberately amends R-CAM-004's "never a fourth figure" (automapper-s2 DD-6).
- An eligible project whose current-year row is inactive counts as `inactive`.

**Acceptance criteria:**
- [ ] AC.1 — Dev-like fixture: 198 reachable, 197 active, 1 inactive → `197 / 0 / 1 / 198`.
- [ ] AC.2 — The coverage card shows the inactive figure.

### R-APM-010 — Remove the retired key's UI

- **Details:** the CLARISA-phase selector branch in `edit-environment-variable-modal` (`CLARISA_PHASE_CONFIG_KEY`, `:21,63,72`) and its phase-list fetch are removed. The server's phase-list endpoint is removed if the selector is its only consumer (see design consumer sweep).
- **AC.1** — Opening `ARI_PRMS_SYNC` in the modal shows a plain input. No other key is affected.

### R-APM-011 — Reactivate a mapping (OQ-1 → option a)

- **As a** center admin **I want** to activate an inactive mapping again **so that** the upsert rule (R-APM-005/006), which never reactivates, does not leave a row inactive forever.

**Details:**
- New endpoint `PATCH /api/bilateral-project-mappings/:id/activate`. It mirrors today's `PATCH :id/deactivate`: same roles and guards, and it is idempotent.
- Behavior: sets `is_active = true` and clears `deleted_at`. Audit fields come from `request.user`.
- It only acts on a **current-year** row. A row of another year → `404`, so it is invisible like every other prior-year row (R-APM-004).
- Client: an **Activate** action on inactive rows, where the deactivate action sits on active rows today, with a confirmation. The `/admin` SSR page gets the same action, replacing its "Inactive — re-create instead" copy (judgment J-3).
- This is the minimal mirror. The justification flow and the move into the edit modal stay with AC-1797, which can later absorb or replace this action.

**Acceptance criteria:**
- [ ] AC.1 — `PATCH :id/activate` on an inactive current-year row → `200`, `data.is_active = true`. The row count is unchanged.
- [ ] AC.2 — On an already-active row → `200`, no write (idempotent).
- [ ] AC.3 — On a prior-year row → `404`.
- [ ] AC.4 — A role denied for deactivate is denied here too (allowed and denied role cases).
- [ ] AC.5 — After activation, the next Auto-map Apply classifies the row normally (*alreadyMapped* or *toUpdate*) and the contract shows the green tag.

#### Scenario: deactivate → sync → activate
- GIVEN contract X's 2026 row was deactivated by an admin
- WHEN Apply runs twice and then the admin clicks Activate
- THEN X has one 2026 row, active, with the CLARISA fields from the latest Apply
- BUT it must NOT be reactivated by either Apply run
- AND IT MUST be reactivated only by the explicit action

---

## 4. Non-Functional Requirements

### NFR-APM-001 — Migration safety
- **Category:** reliability
- **Target:** the schema migration is reversible (`down` restores the old unique key and drops the column) and runs inside one transaction where MySQL DDL allows. It pre-checks for collisions before swapping the index. No merged migration is edited. The validation function is re-created in a **new** migration.
- **How verified:** run `up`/`down`/`up` against the disposable TEST scratch schema (`db/baseline/`); never against shared Dev out of band.

### NFR-APM-002 — No year cache
- **Category:** reliability
- **Target:** a change to `ARI_PRMS_SYNC` is visible on the next request (0 s window). The CLARISA feed cache stays keyed by year.
- **How verified:** unit test that flips the resolver value between two calls.

### NFR-APM-003 — Reader query cost
- **Category:** performance
- **Target:** the added year predicate is served by an index on (`agresso_agreement_id`, `reporting_year`). The contract list's p95 does not regress by more than 10 %.
- **How verified:** `EXPLAIN` on the contract-list query shows index use. **Gap:** no load benchmark exists; recorded as an accepted risk.

---

## 5. Data Requirements

| Entity | Change |
| --- | --- |
| `bilateral-project-mapping.entity.ts` | add `reporting_year` `int NOT NULL`, indexed with `agresso_agreement_id` |
| migration `<ts>-annualizeBilateralProjectMapping` | survey (logged), create `bilateral_project_mapping_history` and move superseded duplicates there, add column, backfill 2026, drop `uk_bpm_active_agreement` + generated `active_agreement_id`, add `UNIQUE (agresso_agreement_id, reporting_year)` |
| migration `<ts>-scopePoolFundingValidationToReportingYear` | re-create the validation function with the year predicate |
| migration `<ts>-retireClarisaProjectsPhaseKey` | set `is_active = 0` on the `app_config` row whose key is `ARI_CLARISA_PROJECTS_PHASE`; the reserved column name `key` is backticked in the SQL |

No OpenSearch fields. The backfill year is a constant (2026). It assumes every existing row was made for the 2026 cycle. That holds on Dev (all 198 rows created 2026-09-16). Elsewhere it is `UNVERIFIED — confirm at source before relying on it`: design P-7 records that the migration logs a survey the owner reads on each first deploy.

## 6. API Surface Delta

| Endpoint | Change |
| --- | --- |
| `POST /api/bilateral-project-mappings/auto-map/preview` | body `phase` removed; response buckets per R-APM-005 AC.5; response carries `reporting_year` |
| `POST /api/bilateral-project-mappings/auto-map/apply` | body `phase` removed; envelope unchanged (`feedFetchedAt`, `counts`, `ambiguous[]`, `unresolved[]`); `counts` gains `updated` and `inactive` and loses `superseded`; top level gains `reporting_year` (design §5) |
| `GET /api/bilateral-project-mappings/coverage` | query `phase` removed; `data` gains `inactive` and `reporting_year` |
| `GET /api/bilateral-project-mappings/coverage-report` | query `phase` removed |
| `GET /api/bilateral-project-mappings` | current-year rows only; each row has `reporting_year` |
| `POST /api/bilateral-project-mappings` | upsert per R-APM-006; `data` signals created/updated |
| `PATCH /api/bilateral-project-mappings/:id/activate` | **new**, mirror of `:id/deactivate` (R-APM-011) |
| `PATCH /api/bilateral-project-mappings/:id/deactivate` | current-year rows only (`404` otherwise) |

Route prefixes are as mounted today (unversioned `/api/...`; root guide §4.1). They are to be confirmed against the route table in design. Roles are unchanged.

## 7. Cross-System Impact

- **CLARISA:** `clarisa-projects.service.ts` and `mapping-phase.resolver.ts` (removed), plus the phase-list endpoint in `clarisa-projects.controller.ts`.
- **PRMS:** `result-prms-sync-aggregate.repository.ts:209`, `result-prms-sync-log.repository.ts:165`.
- **Readers:** the design's P-10 sweep returns 35 lines: 16 code, 1 Swagger string and 18 comments. Design §6.2 lists the code lines. They include `agresso-contract.repository.ts:347,399,532`, `bilateral.service.ts:211`, `pi-delegates.repository.ts:117,538`, `result.repository.ts:215`, `result-prms-sync-log.repository.ts:165`, `result-prms-sync-aggregate.repository.ts:209` and `pool-funding.util.ts:19`, plus the mapping module itself. The sweep cannot see two more readers: the mapping service's injected repository, and the DB function (called from `green-checks.repository.ts:71`, `result-prms-sync-log.repository.ts:163`).
- **`/admin` SSR:** `admin/services/admin.service.ts` (list) and `admin/client/pages/BilateralProjectMappings.tsx` (its own create/deactivate fetches) — gains Activate and a Year column (R-APM-011).
- **STAR client:** `bilateral-mapping.service.ts`, `api.service.ts:912+`, the bilateral-mapping page components, `edit-environment-variable-modal`.
- **Socket.IO:** none.

## 8. Defect Classes → Gates

| Defect class | Gate | Blind spot |
| --- | --- | --- |
| A reader still unscoped by year | the 16 code lines of design §6.2, the injected repository methods and the DB function, **plus** assertions on generated SQL (not on QB mocks) | the grep cannot see injected-repository calls or SQL functions; covered by the explicit list in design §6.2 |
| Migration SQL contains `?` or `:word` (namedPlaceholders) | unit test on the exported fragment + migration rehearsal on the TEST schema | the `migration:scan` script does not exist, so it is not a gate |
| SQL year fragment wrong for a whitespace or invalid value | integration spec on a TEMPORARY `app_config` (design §6.1) | needs `PID_MYSQL_*`; when unavailable it is a recorded gap, not a pass |
| Duplicate rows under re-sync | DB unique key + automapper service test with an inactive-row fixture | — |
| Sync writes `is_active` | test: Apply over inactive fixture, assert `is_active` and `deleted_at` unchanged | — |
| Migration collision / partial state | `up`/`down`/`up` on the TEST scratch schema | Dev data shape: the pre-check query also runs read-only on Dev before merge |
| Stale year after config change | resolver-flip unit test | — |
| Type contract drift (DTO/client interface) | `npm run build` (server) + `tsc -p tsconfig.app.json` (client) | spec files excluded from build (K-004) — client `tsconfig.spec.json` too |
| UI shows a hard-coded year or a missing column | component tests + grep for a literal `20\d\d` in the templates | **layout**: human check at the HITL pause |
| `ARI_CLARISA_PROJECTS_PHASE` still read | repo-wide grep (R-APM-002 AC.2) | — |

## 9. Assumptions, Dependencies, Risks

| ID | Item | Mitigation |
| --- | --- | --- |
| A-1 | AC-1797 (activation/deactivation in the edit modal, with justification) **has no implementation on this branch yet**: `git log main..HEAD` is empty, and the server has `PATCH :id/deactivate` but **no activate endpoint**. | resolved by R-APM-011 (OQ-1 → a) |
| R-1 | On a year change every contract loses its tag until Auto-map runs; MANUAL rows must be re-entered | R-APM-008 note |
| R-2 | Removing `phase` breaks non-STAR callers | consumer sweep in design; none known |
| R-3 | Dev migration is applied by the Jenkins deploy on merge to `dev` | run on the scratch schema first |
| R-4 | Branch overlap with AC-1797 (same screen, same service) | sequence the branches |

## 10. Open Questions

| ID | Question | Owner | By |
| --- | --- | --- | --- |
| ~~OQ-1~~ | **Resolved 2026-10-28 — option (a):** this spec adds a minimal activate endpoint and button (R-APM-011). | David Casañas | done |

## Requirement ID Index

| ID | Title |
| --- | --- |
| R-APM-001 | Mapping rows carry a reporting year |
| R-APM-002 | One year variable: `ARI_PRMS_SYNC` |
| R-APM-003 | No caller-chosen year |
| R-APM-004 | Every read is scoped to the current year |
| R-APM-005 | Sync is an upsert; activation belongs to the user |
| R-APM-006 | Manual create follows the upsert rule |
| R-APM-007 | Admin screen shows the year |
| R-APM-008 | Readiness note on the mapping screen |
| R-APM-009 | Inactive is not pending |
| R-APM-010 | Remove the retired key's UI |
| R-APM-011 | Reactivate a mapping |
| NFR-APM-001 | Migration safety |
| NFR-APM-002 | No year cache |
| NFR-APM-003 | Reader query cost |

## Sign-off

- [ ] Engineering lead — David Casañas
- [ ] MEL / product owner — <name>
