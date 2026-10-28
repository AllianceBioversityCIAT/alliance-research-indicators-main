# Proposal — Annualize the Bilateral Project Mapping by the PRMS Reporting Year

## Document Control

| Field | Value |
| --- | --- |
| Spec Path | `bilateral/annualized-project-mapping` |
| Proposal Path | `docs/specs/bilateral/annualized-project-mapping/proposal.md` |
| Slug | `annualized-project-mapping` — derived from the free-text argument (*"el módulo de bilateral project mapping actualmente no está anualizado…"*); placed under the existing `bilateral/` module folder |
| Type | **Change** (includes one defect — §Problem P-7 — folded in at the owner's request, 2026-10-28) |
| Deliverable | software |
| Approval Mode | `gated` |
| Depends on | none |
| Parallel-safe | **no** — touches `bilateral_project_mapping` schema, the shared pool-funding predicate and the PRMS sync aggregate |
| Related | `archive/2026-08-18-bilateral--clarisa-phase-config-variable` (introduced `ARI_CLARISA_PROJECTS_PHASE`) · `archive/2026-10-08-bilateral--pool-funding-reporting-year` (introduced `ReportingYearResolver` over `ARI_PRMS_SYNC`) · `archive/2026-08-20-bilateral--clarisa-automapper-s2` (R-CAM-005 supersede) · `bugfix/superseded-mapping-traceability` (open proposal on the same rows) · AC-1797 (activation/inactivation moves to the edit modal with mandatory justification) |
| Revision | r4 2026-10-28 — OQ-1…OQ-4 answered; P-7 added; single variable `ARI_PRMS_SYNC` confirmed; OQ-A/OQ-B answered (upsert rule, activation is user-only); OQ-C (option 1) and OQ-D (MANUAL untouched) answered — no open questions |
| Date | 2026-10-28 |

---

## Intent

One mapping set **per PRMS reporting year**. "Year" here is never the calendar year: it is the value of the app_config key **`ARI_PRMS_SYNC`**, the year a result must belong to in order to be pushed to PRMS. No user ever picks a year. When an admin changes that variable, the Bilateral Mapping module shows that year at once and every later sync writes that year's rows. Earlier years' rows stay as history.

## The year variables — what each one is

Read-only on Dev, 2026-10-28: `SELECT key, simple_value, is_active, updated_at FROM app_config WHERE key IN ('ARI_PRMS_SYNC','ARI_CLARISA_PROJECTS_PHASE')`

| Key | What it controls today | Dev value | Read by |
| --- | --- | --- | --- |
| **`ARI_PRMS_SYNC`** | The **PRMS reporting year**. The push gate refuses a result whose `results.report_year_id` differs: *"Result year X is not the reporting year Y"* | `2026` (saved 2026-10-16) | `ReportingYearResolver` (no cache, falls back to 2026) — `shared/utils/reporting-year.resolver.ts`; gate in `result-prms-sync/eligibility/sync-gate.ts:80-127` |
| **`ARI_CLARISA_PROJECTS_PHASE`** | Which **CLARISA project phase** counts as eligible for mapping (the "phase 2026" on the screen) | `2026` (saved 2026-08-20) | `MappingPhaseResolver` (5-min cache, then ENV `ARI_CLARISA_PROJECTS_PHASE`, then 2026) — `tools/clarisa/projects/mapping-phase.resolver.ts`; year selector in the Configuration Variables modal (`edit-environment-variable-modal.component.ts:21`) |

They are **two different variables that hold the same value today**. The CLARISA download already uses `ARI_PRMS_SYNC` (`clarisa-projects.service.ts:235-247`, `?phase=<reporting year>`), while the eligibility filter uses `ARI_CLARISA_PROJECTS_PHASE` (`:86-93`). If someone changes one and not the other, the eligible list comes back **empty**. **Owner decision (2026-10-28): unify on `ARI_PRMS_SYNC`.** That is a deliberate collapse of two discriminators (**K-005**, staging lineage). It is justified because they must never differ, and today's split is exactly what allows the empty list. **Owner rationale (2026-10-28):** the two dates point to one thing. CLARISA must supply the projects PRMS accepts for that year, and a result can only be pushed to PRMS for that specific year. If they differ, PRMS returns an error. One year, one variable.

## Problem / Current Behavior

| # | Today | Evidence |
| --- | --- | --- |
| P-1 | A mapping row has **no year**: there is one active row per AGRESSO agreement, full stop. | `bilateral-project-mapping.entity.ts`; unique `uk_bpm_active_agreement` on generated `active_agreement_id`, `db/migrations/1779190000011-createBilateralProjectMapping.ts:33-36` |
| P-2 | Auto-map for a new phase **deactivates the previous year's row** when the CLARISA project id differs (supersede), and the dialog says so. | `automapper.service.ts` `apply()` supersede branch; `automapper-dialog.component.html:375` |
| P-3 | The **green "contributes to pool funding" tag** in contract listings is computed from "has an active mapping row", with no year. | `shared/utils/pool-funding.util.ts` (`effectivePoolFundingContributorSql`), used by `agresso-contract.repository.ts`, `result.repository.ts`, `result-prms-sync-log.repository.ts`, `pi-delegates.repository.ts` and the SQL validation function (`db/migrations/1786679227000-…`); PRMS payload join `result-prms-sync-aggregate.repository.ts:209-211` |
| P-4 | Two year variables drive one feed (see table above). | as above |
| P-5 | A caller **can choose** the year: `phase` in the body of `POST auto-map/preview|apply` and in the query of `GET coverage` / `GET coverage-report`; the client forwards it. | `automapper.controller.ts:61,103,132,186-193`; `bilateral-project-mapping.controller.ts:84-100`; `client/.../bilateral-mapping.service.ts:31-172` |
| P-6 | The screen shows no year; the header says a hard-coded "Phase 2026". | screenshot; `bilateral-mapping.component.html:26,30` |
| **P-7** | **Re-mapping a deactivated contract creates a second row.** Auto-map's classification only looks at **active** rows, so a contract whose row is inactive falls in `toCreate` and gets a brand-new row. The table then lists both the old inactive row and the new active one for the same contract. | `automapper.service.ts` `classifyAgainstExisting()` — `.andWhere('bpm.is_active = :isActive', { isActive: true })`, then `if (!existing) toCreate.push(…)`. Dev today: 197 active DERIVED + **1 inactive** (`A1697`, the one in the screenshot, counted as the 1 *Pending*). The next Apply would duplicate it. *Established from the code path and Dev counts; not reproduced by running Apply, which writes to the shared DB.* |

## Proposed Outcome

1. Each mapping row carries a `reporting_year`. The current year is always `ReportingYearResolver.resolve()` (`ARI_PRMS_SYNC`).
2. **Every endpoint reads only the current year's rows**: list, coverage, coverage-report, preview, apply and manual create. The same goes for the green contributor tag in every contract/result listing and for the PRMS payload. This matches the push gate, which only lets current-year results through.
3. Changing `ARI_PRMS_SYNC` takes effect **on the next request**, with no 5-minute lag: the resolver has no cache, and the CLARISA feed cache is keyed by year (**K-016** satisfied). The module simply shows the new year; nothing runs by itself. The next sync the admin triggers writes rows for that year.
4. Rows from earlier years are **never touched** by a sync — the upsert rule below only looks at the current year.
5. No endpoint accepts a year/phase. No year selector anywhere.
6. The table gains a **Year** column; the header shows the year returned by the server.
7. **One variable for everything: `ARI_PRMS_SYNC`** (owner confirmation, 2026-10-28: *"unificar una de esas y usarlo para todo"*). `ARI_CLARISA_PROJECTS_PHASE` stops being read anywhere:
   - `MappingPhaseResolver`, its ENV fallback (`env.utils.ts`) and its enum entry are removed;
   - its `app_config` row (seeded by `db/migrations/1786738949211-seedClarisaMappingPhase.ts`) is **deactivated (`is_active = 0`) by a new migration, not deleted**, so the step is reversible on the shared DB;
   - the CLARISA-phase year selector in the Configuration Variables modal (`edit-environment-variable-modal.component.ts:21,63,72`) is removed. `ARI_PRMS_SYNC` stays edited the way it is today (see OQ-C).
8. **One row per contract per year — the sync is an upsert, and activation belongs to the user** (owner, 2026-10-28: *"si no existe se crea activo, si existe se actualiza… la activación y desactivación debe ser solo por parte del usuario"*):

   | Current-year row for the contract | Auto-map / manual create does |
   | --- | --- |
   | none | **create it, active** |
   | exists, active | **update** its CLARISA fields (`clarisa_project_id`, short name, `clarisa_external_code`); stays active |
   | exists, **inactive** | **update** its CLARISA fields; **stays inactive** — however many times the sync runs |

   - "Update" applies to **DERIVED** rows only. A **MANUAL** row is never modified by Auto-map; a different derived project is reported as *divergent* (R-CAM-003, OQ-D).
   - `is_active` changes **only** through the user's edit modal (AC-1797, with justification). No sync ever activates or deactivates.
   - This **replaces supersede** (deactivate + create a second row, R-CAM-005) inside a year: a changed CLARISA project id updates the same row. That is what makes duplicates impossible, and it lets uniqueness be a plain `UNIQUE (agresso_agreement_id, reporting_year)`, active or not.
   - The same rule applies to manual create (OQ-B): creating a mapping for a contract that already has a row this year updates that row rather than inserting one.
9. Existing rows are backfilled to **2026**.

## Scope

| Area | Detail |
| --- | --- |
| Schema | migration: add `reporting_year` (backfill 2026), replace `uk_bpm_active_agreement` (and its generated column) with `UNIQUE (agresso_agreement_id, reporting_year)`; pre-check on Dev that no contract has two rows for 2026 (one inactive `A1697` today, no duplicates) |
| Server — mapping module | automapper resolve/classify/apply/coverage, CRUD + list, coverage-report: year from the resolver; `phase` input removed; classification also considers the current year's inactive rows (P-7) |
| Server — CLARISA | eligibility filter uses the resolver's year; `MappingPhaseResolver` deleted; ENV fallback documented as removed in `.env.example` |
| Server — readers | year predicate added to `effectivePoolFundingContributorSql`, the PRMS aggregate join and every other `bilateral_project_mapping` join; validation function re-created in a **new** migration |
| Client | Year column; `phase` arguments removed from `bilateral-mapping.service.ts`; header and automapper dialog read the year from the server; remove the `ARI_CLARISA_PROJECTS_PHASE` selector branch in the env-variable modal |
| Tests | sibling specs for each touched unit; year-switch scenario; re-map-after-deactivate scenario (P-7) |

## Non-Goals

- Browsing past years in the UI; history stays in the DB only.
- Changing how `ARI_PRMS_SYNC` itself is edited or validated.
- Auto-running a sync when the variable changes (owner, 2026-10-28: "automatic" means the module reflects the new year, not a triggered run).
- The legacy `agresso_contracts.is_pool_funding_contributor` flag, which stays year-agnostic.
- Explaining existing inactive rows — that remains `bugfix/superseded-mapping-traceability`, which this change shrinks.

## Affected Users, Systems, And Specs

| Who / What | Impact |
| --- | --- |
| Center admins (Bilateral Mapping) | Year column, current-year view, and no more duplicate rows on re-map |
| Contract/result listings | green contributor tag reflects the current reporting year's mapping |
| PRMS push | registry code taken from the current-year mapping, which is the same year the gate allows |
| Configuration Variables modal | loses the `ARI_CLARISA_PROJECTS_PHASE` selector |
| Specs | supersedes `clarisa-phase-config-variable` intent; **replaces** R-CAM-005 supersede with the per-year upsert; amends R-CAM-002/003 classification (inactive rows considered, `is_active` never written by automation) |

## Visual Reference

- Source: screenshot supplied by the owner (current Bilateral Mapping screen, Dev).
- Location: pasted in the propose request; not stored in the repo.
- Notes: one added **Year** column beside *Last Updated*; dynamic year in the header. No mockup needed.

## Requirement Delta Preview

### ADDED
- `reporting_year` on every mapping row; new rows get the current reporting year.
- A Year column in the admin table.
- Per-year upsert: no row → create active; existing row (active or inactive) → update CLARISA fields, `is_active` untouched (P-7).

### MODIFIED
- All mapping endpoints and all contributor-tag/PRMS readers are scoped to `ARI_PRMS_SYNC`.
- CLARISA eligibility uses `ARI_PRMS_SYNC`, the same value as the fetch.
- Auto-map preview shows an extra bucket: **inactive — updated, left inactive**, so the admin sees why those contracts did not turn green.
- Coverage: a contract an admin deactivated is reported as **inactive**, not as **pending** (otherwise it stays "pending" forever).

### REMOVED
- `phase` in `auto-map/preview|apply` bodies and `coverage|coverage-report` queries.
- `ARI_CLARISA_PROJECTS_PHASE`, its ENV fallback, `MappingPhaseResolver`, and its admin selector.

## Approach Options

| Option | How | Trade-off |
| --- | --- | --- |
| **A. Year column on the existing table** *(recommended)* | add `reporting_year`, re-key uniqueness to (agreement, year), add one year predicate per reader | one table, one schema migration; history is just other years' rows; nothing has to remember to snapshot |
| B. Yearly snapshot table | copy active rows to a history table when the year changes | a config save has no hook to trigger the copy, so a missed copy loses a year; two tables to read |
| C. Never deactivate across phases | skip supersede when phases differ | two active rows per contract break the unique index, readers become ambiguous, and there is no year to show |

**For P-7 (within option A):**

| Option | Behavior when an inactive current-year row exists for the contract | Trade-off |
| --- | --- | --- |
| A1. Reactivate the same row | set it active again | undoes an admin's justified deactivation — **rejected** |
| A2. Skip it | leave the row untouched | stale CLARISA fields on a row the admin may reactivate later |
| **A3. Upsert, never touch `is_active`** *(owner decision)* | update CLARISA fields, keep the state | no duplicates, data current, deactivation respected |

## Recommended Approach

**Option A for annualization.** Year comes from the resolver that already drives the CLARISA download and the push gate, so unifying the variables removes P-4 rather than adding a third year source.

**For P-7, A3** (owner decision): a per-year upsert where only the user toggles activation.

## Risks, Dependencies, And Open Questions

| ID | Item |
| --- | --- |
| ~~OQ-A~~ | **Resolved 2026-10-28** — A3: update, never reactivate. |
| **OQ-C** | *UI only — unification itself is decided.* The retired key's modal had an editable dropdown of CLARISA phases with project counts (`edit-environment-variable-modal.component.html:63-85`). Recommendation: keep `ARI_PRMS_SYNC` a plain value and show the readiness warning on the Bilateral Mapping screen (*"Reporting year 2027 · CLARISA has N eligible projects"*, see R-4). Alternative: an informational count line under the field in the modal. **Resolved 2026-10-28 — option 1:** plain value in the modal; warning on the Bilateral Mapping screen only. |
| ~~OQ-B~~ | **Resolved 2026-10-28** — yes, manual create follows the same upsert rule. |
| ~~OQ-D~~ | **Resolved 2026-10-28 — MANUAL rows are never touched by Auto-map** (R-CAM-003 kept: reported as *divergent*; the upsert rule's "update" applies to DERIVED rows only). Original question: **MANUAL rows under Auto-map.** Today automation never modifies a MANUAL row (R-CAM-003: reported as *divergent*). Does "si existe se actualiza" also overwrite a MANUAL row's CLARISA project when Auto-map derives a different one? Recommended **no** — keep MANUAL rows report-only, update only DERIVED ones. |
| R-1 | Migration on the shared Dev DB (backfill + index swap). Merged to `dev`, the Jenkins deploy applies it (root `CLAUDE.md` §4.3). |
| R-2 | The validation function embeds the predicate in SQL: re-create it in a new migration, and assert the year predicate in the generated SQL, not on a mocked builder (**KZ-001**, **KZ-017**). |
| R-3 | Removing `phase` from request DTOs breaks the contract for any non-STAR caller; the client is the only one found. |
| R-4 | On the day `ARI_PRMS_SYNC` moves to 2027, every contract shows **no green tag** and coverage reads 0 mapped, until an admin runs Auto-map (and re-enters MANUAL rows, which Auto-map never creates). This is the expected consequence of "current year only". The UI should say *"no mappings yet for 2027 — run Auto-map"* so it doesn't look broken (**K-016**). |
| R-5 | Overlaps AC-1797 (same screen, same deactivate path): sequence the two branches to avoid conflicts. |

## Success Criteria

1. After the backfill, with `ARI_PRMS_SYNC = 2026`, the table shows the current 198 rows with Year 2026 and coverage still reads 197 / 198.
2. Set `ARI_PRMS_SYNC = 2027`: the next page load shows 2027 and empty coverage, with no 5-minute wait. Run Auto-map: 2027 rows are created and **all 2026 rows are unchanged**.
3. With 2027 current, the green tag in contract listings reflects 2027 mappings only.
4. Deactivate a mapping, then run Auto-map three times: the table shows **one** row for that contract, still **inactive**, with current CLARISA fields; it turns active only when the admin activates it in the edit modal.
6. A contract whose CLARISA project id changes within the same year keeps **one** row, updated in place.
5. No mapping endpoint accepts a year/phase, and `ARI_CLARISA_PROJECTS_PHASE` is no longer read anywhere (`grep` over `server/` and `client/` returns only the removal migration/docs).

## Next Step

```text
/akili-specify bilateral/annualized-project-mapping
```
