# Archive Summary — Bilateral / Annualized Project Mapping

## 1. Document Control

| Field | Value |
|---|---|
| Spec id | 2026-10-annualized-project-mapping |
| Branch | AC-1797-… (merged to `dev` as `f1618fbe`, pushed and deployed by the owner) |
| Owner | David Casañas |
| Kaizen entry | `docs/specs/kaizen/bilateral--annualized-project-mapping.md` |

## 2. Original Spec Path

`docs/specs/bilateral/annualized-project-mapping/`

## 3. Archive Date

2026-10-30

## 4. Final Status

**DONE.**
- Validation: PASS with 4 WARN, 0 FAIL (`f8d1f993`).
- Owner acceptance on Dev after the deploy: "ya se paso a test y se prodo y todo bien".

## 5. Requirements Delivered

| Req | Delivered |
|---|---|
| R-APM-001 | Mapping rows carry `reporting_year`. Unique key is (agreement, year). Superseded duplicates are archived to the history table |
| R-APM-002 | One year variable, `ARI_PRMS_SYNC`, via `ReportingYearResolver` / `currentReportingYearSql`. `ARI_CLARISA_PROJECTS_PHASE` is retired |
| R-APM-003 | No caller-chosen `phase` on coverage, preview, apply or CLARISA listing |
| R-APM-004 | Every reader, the PRMS payload and `pool_funding_alignment_validation` are scoped to the current year |
| R-APM-005 | Automapper has five disjoint buckets and updates in place. It never reactivates a row |
| R-APM-006 | Manual create upserts and returns `outcome`. Every human write stores MANUAL (amended AC.5) |
| R-APM-007 | The year is shown in STAR and SSR, with no literal years in templates |
| R-APM-008 | Readiness note with 5 states. The env modal is a plain field |
| R-APM-009 | Inactive is not pending (fixture `197/0/1/198`) |
| R-APM-010 | The CLARISA-phase selector and endpoint are removed |
| R-APM-011 | `PATCH :id/activate`, with Activate actions in STAR and `/admin` |
| NFR-APM-001..003 | Reversible, rehearsed migrations; no year cache; index + EXPLAIN |

## 6. Files Changed Summary

| Area | Files |
|---|---|
| Migrations | `1792200000000-annualizeBilateralProjectMapping`, `1792300000000-scopePoolFundingValidationToReportingYear`, `1793221840500-retireClarisaProjectsPhaseKey` |
| Server | `bilateral-project-mapping` (entity, history entity, service, controller, automapper, DTOs), `shared/utils/reporting-year.resolver`, `tools/clarisa/projects`, pool-funding readers |
| SSR | `src/admin/client/pages/BilateralProjectMappings.tsx` |
| Client | `api.service.ts`, `bilateral-mapping.service.ts`, interfaces + fixture, `bilateral-mapping` page / coverage / automapper dialog, env-variable modal |
| Size | ≈ +3.6k / −1.3k LOC. The budget overrun was accepted by the owner |

Commits on AC-1797:
- T-01…T-06b, committed per task;
- `24d52826` (T-07);
- `37bcdd6a` (T-08–T-10);
- `13cb6bc5`, `f8d1f993` (docs).

## 7. Test Evidence Summary

- **Per-task evidence:** red at HEAD, falsifier red then reverted, quoted in `execution.md`. There is no `test-report.md` (accepted).
- **SQL integration:** ran on the TEST scratch container.
- **Branch HEAD (2026-10-30):** server 441 / 4,278, client 347 / 8,115, all green.
- **Merged `dev` tree:** server 468 / 5,027, client 377 / 8,884, all green.

## 8. Validation Summary

PASS with 4 WARN (`validation-report.md`): 11/11 tasks PASS, every requirement clause covered, 0 FAIL.

## 9. Accepted Warnings Or Follow-Ups

| # | Item |
|---|---|
| W-1 | The owner's acceptance is general, not per Done item. Accepted as sign-off |
| W-2 | **Product follow-up:** when every contract is deactivated, the strip says "run Auto-map", but Auto-map never reactivates |
| W-3 | Client `tsc` spec baseline has 945 errors (pre-existing) |
| W-4 | Test hardening: per-year execution of the DB function; lock predicate and single-retry count; R-APM-004 AC.3 beyond SQL-string level |
| RB-1 | Rows outside Dev may not belong to the 2026 cycle. Read the migration survey on each first deploy |

## 10. Historical Notes

- **Supersedes** `archive/2026-08-18-bilateral--clarisa-phase-config-variable`.
- **Extends** `2026-08-20-bilateral--clarisa-automapper-s2` and `2026-10-08-bilateral--pool-funding-reporting-year`.
- **Merge into `dev`:**
  - 5 spec conflicts, resolved by union.
  - 5 dev tests deleted, because they tested the retired phase API.
  - The pooled-funding monitor guard test was adapted to ignore the shared year fragment.
- **Deploy hazard:** old code inserts without `reporting_year`, so the migrations and the code must deploy together. The Dev pipeline applies migrations on deploy.

## 11. Diagrams

There is no `diagrams/` folder. The dependency graph is inline in `tasks.md` §1. No baseline diagram slot was made stale.
