# Archive Summary — Institutional Performance / Control Lists

**Outcome:** delivered and validated, **PASS with accepted WARNs**. Admins manage portfolio-scoped categories → lists → values under *Center admin › Portfolio Management › Control Lists*. Other modules read a list by key and plug into the in-use protection without editing this module.

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec id | 2026-09-control-lists (child 1 of `institutional-performance/family.md`) |
| Owner | Hector F. Tobón (requester) |
| Branch | `institutional-kpis`, not merged to `dev` or `main` at archive time |
| Last code commit | `2d0ee24c` (validation remediation) |
| Jira | epic AC-1773; T-01…T-05 = AC-1780…AC-1784; PARI-258 |

## 2. Original Spec Path

`docs/specs/institutional-performance/control-lists/`

## 3. Archive Date

2026-10-08

## 4. Final Status

| Phase | Result |
| --- | --- |
| Tasks | T-01…T-04 done with Reviewer PASS; T-05 (HITL) done by **requester waiver** (local check); CR-1 and CR-2 done |
| Validation | Attempt 1 FAIL (missing two-portfolio isolation test) → remediated → **PASS with accepted WARNs** (`validation-report.md` §13) |
| `test-report.md` | Not produced; `/akili-test` was not run. Validation verified coverage clause by clause against the code |

## 5. Requirements Delivered

| Req | Delivered |
| --- | --- |
| R-CTL-001 | Every read and write is scoped by portfolio. The default portfolio is chosen by year. Unconfigured portfolios stay selectable |
| R-CTL-002 | Categories CRUD. A non-empty category delete → 409 naming the lists |
| R-CTL-003 | Lists with an immutable key, the reference `P<id> · <key>`, *Used by*, and moving a list within the same portfolio. **CR-2:** any list deletes once it has no values |
| R-CTL-004 | Values CRUD with case-insensitive uniqueness, a proposed code `<PREFIX>-<nn>` / `L<n>`, a read-only permanent ID, and deactivation |
| R-CTL-005 | The in-use registry, the 409 "deactivate instead", and the FK RESTRICT backstop |
| R-CTL-006 | Consumer read A13 by `(portfolio, key)` and `ControlListValueLookupService.assertValueInList` |
| R-CTL-007 | `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` on A1–A12; A13 is open to any authenticated user; the route uses `centerAdminGuard` |
| R-CTL-008 | Nested *Portfolio Management* menu group (expanded + flyout), the page, the modal and the four UI states |
| R-CTL-009 | Shared `DataTable` (F-7): natural sort, resizable columns, 10/25/50/100 rows, search, lazy `exceljs` export |
| R-CTL-010 | Seed for Portfolio 2: 2 categories / 6 lists / 23 values, with explicit ids; the seed is idempotent |

## 6. Files Changed Summary

| Area | Files |
| --- | --- |
| Server module | `src/domain/entities/control-lists/`: module, controller, service, usage registry, value-lookup service, natural-compare util, types, 3 entities, 3 repositories, 8 DTOs, and their specs (incl. `control-lists.global-exceptions.spec.ts`) |
| Server DB | `src/db/migrations/1790900000000/1/2-createControlList{Categories,s,Values}.ts` |
| Server wiring | `main.routes.ts`, `entities.module.ts` |
| Server integration | `test/control-lists-{categories,lists,values,usage,isolation}.integration-spec.ts` |
| Client page | `pages/platform/pages/administration/center-admin/control-lists/` |
| Client shared | `shared/components/data-table/`, `shared/utils/{natural-compare,xlsx-export}.util.ts`, `shared/interfaces/{control-lists,administration-nav}.interface.ts`, `alliance-sidebar`, `api.service.ts`, `modal.types.ts`, `all-modals.service.ts`, `app.routes.ts`, `angular.json` |
| Size | ~7,400 server and ~6,100 client insertions. The estimate was ~2,250; most of the excess is tests (`design.md` §14) |

## 7. Test Evidence Summary

| Gate (final, 2026-10-07) | Result |
| --- | --- |
| Server full `npm test` | 4,160 pass. 3 failures, the same pre-existing ones since T-01 (innovation-use ×2, capdev-bulk) |
| Server control-lists unit | 14 suites, 189 tests |
| Server integration (local DB) | 5 suites, 39 tests, including cross-portfolio isolation |
| Server `tsc --noEmit` / eslint (changed files) | 0 / 0. The server `npm run build` last ran (exit 0) at T-04 |
| Client full `npm test` | 345 suites, 7,941 tests |
| Client lint / spec `tsc` / `ng build` | clean / 945 (pre-existing baseline) / exit 0, Initial 1.35 MB |

Each task observed its reds before its fix (`execution.md`, per run).

## 8. Validation Summary

- **Attempt 1:** 1 FAIL (R-CTL-001 BUT clause + AC.2 had no two-portfolio test, although Run 8 claimed "end to end") and 16 WARN.
- **Remediation (Run 9):**
  - the isolation spec;
  - Center Admin and System Admin each create a value;
  - fixes for an empty or untrimmed code prefix and a case-insensitive code proposal (server **and** client);
  - A4 returns its lists;
  - `assertValueInList` compares portfolio ids with `Number()`;
  - 3 spec type errors fixed;
  - the doc sweep.
- **Reviewer:** PASS on attempt 2.

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Owner |
| --- | --- | --- |
| F-1 | T-05 on **Dev**: steps 1–7 (flyout, resize persistence, export, read-only ID, in-use confirm, mockup fidelity, keyboard pass) and NFR-CTL-001 p95 timing | Requester |
| F-2 | **P-13:** confirm the Prod pipeline (Jenkins `roar-monorepo-main`) applies migrations like Dev, before merging to `main` | Requester |
| F-3 | Post-deploy Dev check: `control_lists WHERE is_system=1` = 6 and values = 23 | Requester |
| F-4 | **Carried to child 2 `organizational-structure`:** register the consumer once from a singleton `onModuleInit`; add the FK `ON DELETE RESTRICT` to `control_list_values.id`; call `assertValueInList` before every write that stores a value id; map errno 1451 → 409 in A12; `register()` does not deduplicate | Child 2 spec |
| F-5 | Low-risk advisories still open (`execution.md` Runs 5–9): N+1 counts in A1, navigator not collapsible, `bg-white`, `alliance-sidebar` SCSS over its 4 kB warning budget, double toast on non-409 errors, `selectPortfolio` response race | Backlog |
| F-6 | The user list "Otra" (id 15) disappeared during T-04. Tests were cleared; the cause is undetermined | Requester |

## 10. Historical Notes

- **Re-cut:** the plan was re-cut from 10 horizontal tasks to 5 vertical slices on 2026-10-01 (D-CTL-16). Each slice shipped its table, server and screen.
- **Change requests:**
  - CR-1 (2026-10-05): Code prefix shown read-only on list edit.
  - CR-2 (2026-10-07): the "system list cannot be deleted" rule was removed (D-CTL-18); `is_system` stays in the schema with no behavioral effect.
- **Requester decisions that shaped the model:**
  - no composite FK (D-CTL-15);
  - the value's own PK is its permanent reference (D-CTL-14);
  - list keys carry no portfolio or year segment (D-CTL-2).
- **Judgment Day:** round 1 fixed J-1 and J-2 and approved J-3 and J-4; round 2 APPROVED with 0 severe findings; J-9…J-11 were applied.
