# Design — Bilateral / Mapping filtered export

- **Module:** bilateral (server `reports` + `bilateral-project-mapping`; client `administration/center-admin/bilateral-mapping`)
- **Spec id:** 2026-11-mapping-filtered-export
- **Status:** draft
- **Depth:** Full
- **Approval Mode:** gated
- **Requirements:** [`requirements.md`](./requirements.md)
- **Architecturally significant:** no. Two nullable columns and one route on an existing module change no topology, so `software-architect` and `diagram-design` were not loaded.
- **Last updated:** 2026-11-05

---

## Executive Summary

The export is a new route on `ReportsController`. A dedicated workbook handler in `reports` composes the sheet. The rows come from `BilateralProjectMappingService` (Mapped and Inactive) or `AutomapperService` (Pending).

`list()` and the export share one filter method. Two nullable columns store the last status change, written only on a real transition. The server names the file, because only the server knows the reporting year it used.

---

## 1. Goals & non-goals

**Goals:** R-MFE-001 to R-MFE-011.

**Non-goals:** see `proposal.md` §6. In addition, no logo on the sheet (DD-9), no move of `downloadBlob` to `shared/` (DD-10), no correction of the stale `status_justification` column comment, and no change to how the `/admin` panel authenticates (P-14).

---

## 2. Architecture

### 2.1 Composition

| Step | Component | Responsibility | Requirement |
| --- | --- | --- | --- |
| 1 | Client button | Sends the on-screen filters, shows loading and errors | R-MFE-009 |
| 2 | `ReportsController` | New route, role declaration, query validation, attachment | R-MFE-001 |
| 3 | `ReportsGenerationService` | New method returning `{ buffer, fileName }`. `buildWorkbookXlsxBuffer` is untouched | R-MFE-001 |
| 4 | `BilateralMappingWorkbookHandler` (new) | Chooses the row source, composes columns, cells, notice and file name. Injects only the mapping module's services | R-MFE-002 to 005, 011 |
| 5a | `BilateralProjectMappingService` | New public method returning the export result below | R-MFE-002, 004, 006, 011 |
| 5b | `AutomapperService` | New public method returning the same export result for Pending. It loads the cohort once through row 6 and passes it to the classification; Pending allocations come from that same cohort | R-MFE-003, 011 |
| 6 | `ClarisaProjectsService` | Science Programs for a project, one rule shared with the picker. New public `loadBilateralCohort(phase, limitMs?)` returning `{ projects, available }`, the one bounded cohort load (§5). Called from 5a and 5b only | R-MFE-004, 011 |
| 7 | `ExcelWorkbookBuilder` | Unchanged | — |

**Export result**, one shape from 5a and 5b: the reporting year resolved once for the operation, the rows with their Science Programs, and `clarisaAvailable`. The year is returned even with zero rows, so the file name needs no row (R-MFE-005 AC.3). It also carries `clarisaCohortEmpty`, true when CLARISA answered with an empty cohort. The handler shows the notice when `clarisaAvailable` is false or `clarisaCohortEmpty` is true, never because zero rows matched the filters (amended 2026-11-17, T-04 attempt 1, owner-approved).

`ReportsModule` imports `BilateralProjectMappingModule` only. `ClarisaProjectsService` is not exported from it, and the handler does not need it (P-11).

### 2.2 Reuse

| Reused | Source |
| --- | --- |
| Workbook building, notice row, row limit | `ExcelWorkbookBuilder`, `bannerNotice` (`excel-workbook.types.ts`) |
| Attachment response | `pi-delegates.controller.ts:74-99` |
| Blob download | `downloadBlob` (`pi-delegates-export.util.ts:21`) |
| Role metadata test | `bilateral-project-mapping.controller.spec.ts:60` |
| Sheet colors | The `STAR_RAW_*` constants used by `pi-delegates-export.service.ts:209-247` |

---

## 3. Data model

`bilateral_project_mapping` gains:

| Column | Type | Null | Meaning |
| --- | --- | --- | --- |
| `status_changed_by` | bigint | yes | `sec_users.sec_user_id` of the last status change. No FK, like `updated_by` |
| `status_changed_at` | timestamp | yes | Date of the last status change |

**Migration:**

- Up adds both columns, then backfills `status_changed_at` from `deleted_at` where the row is inactive and `deleted_at` is set.
- **The backfill must pin `updated_at` to itself.** The column has `ON UPDATE CURRENT_TIMESTAMP` (`baseline.sql:1078`), so a plain UPDATE would rewrite Last Updated on every inactive row (P-6).
- Down drops both columns.
- Append-only: the migration is new, and `1793389030636` is untouched.

History rows are not touched: no history is kept (R-MFE-007 AC.3).

---

## 4. API surface

### GET /api/reports/bilateralMapping/xlsx

| Item | Value |
| --- | --- |
| Handler | New method on `ReportsController` |
| Roles | `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` on the method |
| Query | `search`, `status`, `source`, picked from the list DTO. The method declares `ValidationPipe` with `whitelist` and `transform`, because no global pipe exists (P-25) |
| Success | 200, `.xlsx` attachment, `filename="Bilateral_Mapping_<year>_<yyyymmdd>.xlsx"` |
| Errors | 400 invalid query · 403 no role · 503 CLARISA error or timeout on Pending with no feed for the year cached · 422 automapper guard on Pending |
| Swagger | `@ApiTags('Reports')` inherited; `@ApiOperation` and one `@ApiQuery` per param |

`:resultCode/pdf` cannot capture this route: `RESULT_CODE` accepts digits only (`results.util.ts:157`).

### List and detail responses (additive)

`status_changed_by` and `status_changed_at` come from the entity, so every response that returns a mapping gains them, mutations included. `status_changed_by_name` comes from the shared query, so the list and the export have it and the other responses do not.

### CORS

`main.ts:23` adds `Content-Disposition` to `exposedHeaders`, so that the client can read the server's file name (DD-5).

---

## 5. Workflows & business rules

### Row source

| `status` | Source | Includes |
| --- | --- | --- |
| absent or `all` | Service, shared filters | Mapped and Inactive |
| `mapped` | Service, shared filters | Active rows |
| `inactive` | Service, shared filters | Inactive rows |
| `pending` | `AutomapperService` | to-create, ambiguous, unresolved, in that order |
| any other value | Service, no status filter | Same as `list()` today (P-3) |

`status` compares in lower case, as `list()` does. `source` is ignored for `pending`, as on screen (P-2).

### Cell rules

| Column | Mapped / Inactive | Pending |
| --- | --- | --- |
| Agreement ID (AGRESSO) | `agresso_agreement_id` | `derivedContractId`, blank when absent or empty |
| Agresso project name | `agresso_description` | Blank, as on screen |
| CLARISA Project (Bilateral) | First non-blank of full name, short name, `Project <id>`. Blank strings count as absent (`bilateral-project-mapping.service.ts:134`) | Same, from the candidate |
| Science Program allocations | `SP01 (40%); SP02 (60%)`. A non-numeric allocation prints the code alone. Looked up by project id, like the name on screen | Same, by project id |
| Source | Screen label: Manual, Derived, AI Suggested, AI Auto | Unmapped |
| Status | Mapped or Inactive, from `is_active` | Pending |
| Reporting year | Row value | Year from the preview |
| Status change justification | `status_justification`, the last recorded text (requirements §9, deviation 3) | Blank |
| Notes | `notes` | Blank |
| Status changed by | Non-blank parts of first and last name, blank when none | Blank |
| Status change date | `status_changed_at`, date cell | Blank |
| Last Updated | `updated_at`, date cell | Blank |

The source labels live in the handler. The client's `sourceLabel()` stays as it is. Parity is covered by a test on the same five values.

### Status audit

`activate()` and `deactivate()` write user and date only inside their transition branch, after the idempotent branch. `deactivate()` uses one instant for `deleted_at` and `status_changed_at`. `update()` and the automapper refresh do not write them.

`deactivate()` on an already Inactive row can rewrite the justification with no audit change. The Edit modal cannot reach this branch, because it only sends a real change. It stays as it is.

The audit is written in the service, so every authorized caller of the endpoints is covered. The `/admin` panel targets them but sends no `Authorization` header (P-14), which is out of scope.

### CLARISA notice

`ClarisaProjectsService.loadBilateralCohort(phase, limitMs?)` wraps `listBilateralProjects` and reports `{ projects, available }`. It is the only cohort load for `list()`, the 5a export and the 5b export. It catches every error, not only the 503, so a malformed feed (a non-array 200) also counts as a failure, on Pending as well as on the other statuses (`list()`'s bare `catch` already does). `list()` calls it with no limit and ignores `available`, so its behavior holds (P-21). An empty cohort reports `available: true`; its notice comes from the zero cohort count, which 5a and 5b return as `clarisaCohortEmpty` (§2.1), not from the flag and not from the number of rows exported.

The export passes a 10-second limit, because the CLARISA client has no timeout (P-22). The limit covers only this CLARISA load. Reporting-year resolution and the automapper's database classification run outside it, so a slow database is never reported as a CLARISA failure. When the limit fires and the cache holds a feed for the same phase, that stale feed is returned with `available: true`, the same rule the service applies to an upstream error (P-8). Only a timeout with no same-phase cache reports `available: false`.

The abandoned call is left to settle, but its payload is discarded, so a late response never overwrites a newer cache entry. The cache is warmed by `list()`, which has no limit and runs before the export on the same screen (amended 2026-11-17, T-02). Calls are not deduplicated, so each retry during a CLARISA hang opens one more pending request. That is accepted: the button blocks repeats in one tab, and the export is a low-volume admin action.

Pending refactors `resolve()` into a cohort-taking step that `resolve()` itself calls, so the preview keeps its behavior and the export classifies the cohort it already loaded. The NFR-CAM-001 guard runs on that cohort unchanged.

| Situation | Result |
| --- | --- |
| Fresh or stale cache for the year, including a stale cache when the refresh errors or exceeds the limit | Normal file, no notice. Stale data is served by design (P-8) |
| All, Mapped or Inactive; error or timeout | File with notice. Allocations blank, project name falls to the short name, then `Project <id>` |
| All, Mapped or Inactive; empty cohort | File with notice |
| Project absent from a healthy cohort | Blank allocations, no notice |
| Pending; error or timeout, no feed for the year cached | Error, no file (R-MFE-003 AC.3). With a cached feed, Pending uses it like the first row |
| Pending; automapper guard | 422, no file |
| Pending; empty cohort | File with headers and notice |

The sheet subtitle lists the applied filters and states that dates are in UTC.

---

## 6. Frontend impact

The Admin SSR panel has no UI change. Its list and its PATCH responses carry the additive fields, which it does not use.

### STAR client

| Element | Decision |
| --- | --- |
| Button | `p-button` with `label="Export to Excel"`, outlined like Auto-map, left of Auto-map, `data-testid="header-export-btn"` |
| Loading | `exporting` signal drives `[loading]` and `[disabled]`; the handler returns early when set |
| Filters | Read from the signals at press time. `all` is omitted, as in `load()` |
| Request | New `ApiService.GET_BilateralMappingXlsx`, wrapped by `BilateralMappingService` with its `MappingMutationResult` contract, which already carries `message` |
| `to-promise.service.ts` | New `getBlobResponse`, because `getBlob` drops headers (`to-promise.service.ts:189`) |
| Failure | One toast, from the component. `httpErrorInterceptor` gains a URL exemption for this route, like `isPrmsSyncError` (P-23). The service parses the Blob error body as the server envelope and shows `errors`: a string as is, an array joined. `description` is never shown, because it holds the exception class name (P-26). A fixed message is the fallback when the body is not JSON or `errors` is empty |
| Empty blob | Treated as a failure |
| File name | From `Content-Disposition`. Fallback when unreadable: `Bilateral_Mapping_<reportingYear()>_<yyyymmdd>.xlsx` in UTC, dropping the year only when it is null |
| "?" icon | Focusable element with `pi pi-question-circle` inside the Inactive badge's cell, `aria-label`, `pTooltip`, `tooltipEvent="both"` |
| Tooltip text | Plain text from a component method, with only the values that exist. PrimeNG's `escape` default stays on, so user text is not rendered as HTML |
| Interface | `BilateralProjectMapping` gains the three optional fields |

Tokens only, no hex literals (NFR-MFE-003).

---

## 7. Integration impact

| System | Impact |
| --- | --- |
| CLARISA | No new calls beyond the cached feed. Five-minute TTL (`clarisa-projects.service.ts:48`), K-016 |
| PRMS, OpenSearch, sockets | None |

---

## 8. Security & authorization

- The role declaration sits on the handler. The class has none, and `RolesGuard` allows a handler with no roles (P-1).
- The tooltip and Excel expose names of users. The audience is the same two roles for Excel. For the tooltip, the list endpoint already carries the same role restriction (`bilateral-project-mapping.controller.ts:117`).
- The search stays bound as a parameter.

---

## 9. Observability

`LoggerUtil` logs one line per export: status filter, row count, whether the CLARISA notice fired. No user data.

---

## 10. Testing strategy

| Defect | Test seam |
| --- | --- |
| Role | Real metadata on the handler, and the real `RolesGuard` with a user without the role |
| Filter regression | The generated SQL through a real query builder, with no connection needed where possible |
| Parity | One fixture through `list()` and through the export path, compared as sets: only the paged query adds a primary-key tie-break |
| Pending parity | One fixture against the client's rules |
| CLARISA | Failing, never-resolving, malformed (non-array 200) and empty stubs through the real workbook, on Pending and on the other statuses. A never-resolving stub with a same-phase stale cache gives `available: true` and no notice |
| Pending cohort | `listBilateralProjects` called once per Pending export, and the preview's `resolve()` output unchanged for the same stub |
| Filter transition | Component test: change the filter, then export (KZ-015) |
| Toasts | Interceptor test on the route, and a component test counting toasts. The toast text is `errors` from a real Blob body built in the server's envelope shape (string and array), never `description` |
| DI | Boot once in the wiring task; mocks cannot show a missing module |
| Route | One e2e case, as the server guide asks for a new public route |
| Audit | Service tests for each transition and each non-transition |
| Workbook | Parse the real buffer. The header row is 4, or 5 with a notice |
| Backfill | Run on a scratch schema, comparing `updated_at` before and after |
| Filename | Controller test on the disposition; `Content-Disposition` readable only proven at the HITL |

The migration harness is broken at `CreatePiDelegates1787600000000`, so up and down are run by hand (requirements §8).

---

## 11. Rollout

**Order rule:** the columns exist before code that reads them runs. Every entity read of the table selects them, including `findActiveByAgreementId` on the result-side path, so the failure reaches beyond this feature (P-24).

**Dev cannot meet the rule exactly.** The image does not migrate at start (`migrationsRun: false`, `orm.config.ts:52`; the Dockerfile `CMD` is `node dist/main.js`). The pipeline runs `migration:execute` inside the container after it is up (root `CLAUDE.md` §4.3, Jenkins #72). Between start and the end of the migration, entity reads of the table fail with `ER_BAD_FIELD_ERROR`. That window is accepted on Dev (DD-16): the migration is two `ADD COLUMN` statements on a small table, and Dev is a shared test environment.

1. Merge to `dev`, code and migration together. The pipeline applies the migration, with the window above (`docs/infrastructure.md` §6.4; hand-applying is forbidden there).
2. The local stack reads the Dev schema, so this branch's code fails locally until step 1 lands.
3. Owner HITL on Dev.
4. Every other environment meets the order rule by running the migration before the deploy. That was not measured outside Dev.

**Rollback:** revert the code first, then run the migration's down. No data other than the two columns is lost.

---

## 12. Design decisions log

| ID | Decision | Alternatives rejected | Requirement |
| --- | --- | --- | --- |
| DD-1 | Route on `ReportsController` | On the bilateral controller: owner asked to keep reports together | R-MFE-001 |
| DD-2 | Own handler, not in `ReportHandlerRegistry` | Widening `ReportWorkbookHandler`: `FullFiltersReportDto` and its merge are results-specific (`reports-generation.service.ts:16-25`) | R-MFE-001 |
| DD-3 | `list()` and export share one private query builder, including the user join, and one cohort load, `ClarisaProjectsService.loadBilateralCohort`, that reports availability | Copying the filters: they would drift. KZ-001 and KZ-017 (`staging` lineage) set the SQL-level gate | R-MFE-002, 006, 011 |
| DD-4 | Pending is a new `AutomapperService` method that loads the cohort once through `loadBilateralCohort` under the 10-second limit, then reuses the classification of `resolve()` and `classify()` outside it | Calling the controller's private preview; a new service: not needed, since the handler only branches | R-MFE-003 |
| DD-5 | Server names the file, client reads `Content-Disposition`, with the fallback in §6 when the header is unreadable | Client name from `reportingYear()`: null until the coverage strip loads (`bilateral-mapping.component.ts:334`), which fails R-MFE-005 AC.2. Disabling the button until then: a coverage failure would block the export | R-MFE-005 |
| DD-6 | New columns, written on real transitions | Deriving from `updated_by`: rejected in `proposal.md` | R-MFE-007 |
| DD-7 | The Science Programs rule moves from the picker controller into a `ClarisaProjectsService` method used by both | Copying it: the filter depends on `ENV.BILATERAL_ACCEPTED_SP_STATUSES` and would drift | R-MFE-004 |
| DD-8 | The user name joins `sec_users` by table name, as `capdev-bulk-notification.repository.ts:293` does | Importing the users module: heavier and not needed | R-MFE-004, 010 |
| DD-9 | Sheet has banner, subtitle with filters, and no logo | Fetching the logo as PI Delegates does: a private method there, plus one more network failure. Owner sees it at the HITL | R-MFE-004 |
| DD-10 | Import `downloadBlob` from its current file | Moving it to `shared/`: touches two unrelated consumers | R-MFE-009 |
| DD-11 | An empty cohort also fires the notice | Only on exception: a wrong CLARISA host returns an empty list with no error (`clarisa-projects.service.ts:95`) | R-MFE-011 |
| DD-12 | 10-second limit in the export path only | A connection-wide timeout: reaches every CLARISA flow outside this spec | R-MFE-011 |
| DD-13 | UTC for the file name and date cells, stated on the sheet | Browser zone: the server cannot know it. Bogotá: the audience is global. Precedent `reports.controller.ts:224` is UTC | R-MFE-005 |
| DD-14 | Last Updated stays `updated_at` | Mapping it to the status date: two columns would repeat one value and hide later edits | R-MFE-004 |
| DD-15 | Keep the last recorded justification on reactivated rows | Clearing it on activate: loses a reason the ticket says must stay consultable | R-MFE-004 |
| DD-16 | Accept the start-to-migration window on Dev | Applying the migration by hand before merge: forbidden on Dev. Making the reads tolerate missing columns: code that exists only for one deploy | R-MFE-007 |

**Reversion challenge (Step 2.3):** none needed. No decision removes, disables or inverts delivered behavior. DD-7 and DD-3 extract code with no behavior change.

---

## 13. Premise Ledger

**Count:** 24 verified (P-18 volume half only), 2 `UNVERIFIED` (2 High). P-17 and P-18 settled at execute time, 2026-11-17. Verified at `350998fa`.

**Blast-radius triggers:** `live-path` (a user action is named), `shared-state` (`list()`, the CLARISA rule, the status transition), `consumer` (a response shape and stored fields change).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | `ReportsController` declares no class-level roles, and the guard allows a handler with none | existence | `reports.controller.ts:39`; `roles.guard.ts:18` | 350998fa | DD-1 security note changes, Low | — |
| P-2 | The client's Pending branch reads only `search`, and ignores `source` | location | `bilateral-mapping.service.ts:31-50` | 350998fa | R-MFE-003 scenario changes, Low | — |
| P-3 | `list()` ignores an unknown `status` | location | `bilateral-project-mapping.service.ts:94-105` | 350998fa | Row source table changes, Low | — |
| P-4 | Only `activate()` and `deactivate()` flip `is_active` on existing rows. `:405` and `automapper.service.ts:503` are inserts | shared-state | `grep -nE -e "is_active\s*[:=]" -e "deleted_at\s*[:=]"` (plain `grep`, not `git grep`) over `bilateral-project-mapping/*.ts`, excluding specs, plus `repositories/`, `utils/` and `dto/`: writes at service `:265`, `:310`, `:405`, automapper `:503`; repository refresh omits `is_active` (`automapper.service.ts:274-286`) | 350998fa | R-MFE-007 needs more write sites, High | — |
| P-5 | No code outside the module writes the table | shared-state | `git grep -nE -e "BilateralProjectMappingRepository" -e "getRepository\(BilateralProjectMapping\)" -e "\.bilateralProjectMapping" -e "bpmRepo" -- server/researchindicators/src ':!*.spec.ts'`: outside the module, `admin.service.ts:18` and `bilateral.service.ts:211`, both reads | 350998fa | R-MFE-007 changes, High | — |
| P-6 | `updated_at` has `ON UPDATE CURRENT_TIMESTAMP` | data-env | `baseline.sql:1078` | 350998fa | Backfill rule in §3 drops, Low | — |
| P-7 | `getCachedAll` raises on a cold cache and upstream error | location | `clarisa-projects.service.ts:241-257`: `ServiceUnavailableException` at `:255` | 350998fa | The notice can never fire; §5 changes, High | — |
| P-8 | A stale cache for the same year is served with no error | location | `clarisa-projects.service.ts:242-248` | 350998fa | The notice rule changes, Low | — |
| P-9 | `getBlob` returns only the Blob, and only `X-Impersonation-Error` is exposed | existence | `to-promise.service.ts:189`; `main.ts:23` | 350998fa | DD-5 simplifies, Low | — |
| P-10 | The sheet builder supports a notice row and moves the header to row 5 | existence | `excel-workbook.types.ts` `bannerNotice`; `excel-workbook.builder.ts:197-200` | 350998fa | R-MFE-011 needs builder work, Low | — |
| P-11 | `ReportsModule` is imported only by `EntitiesModule` and the routes, the mapping module does not import it, and the mapping module exports its services but not `ClarisaProjectsModule` | existence | `git grep -nE -e "ReportsModule" -e "BilateralProjectMappingModule" -- server/researchindicators/src ':!*.spec.ts'`; imports and exports at `bilateral-project-mapping.module.ts:34-57` | 350998fa | DD-1 needs `forwardRef`, or the handler's injection changes, Low | — |
| P-12 | PrimeNG 19.0.6 supports `tooltipEvent` `both` and has an `escape` option | data-env | `node_modules/primeng/tooltip/tooltip.d.ts:23`, `:48` | 350998fa | The icon's interaction changes, Low | — |
| P-13 | **Live path, export:** page button → `BilateralMappingService` → `ApiService` → `TP` → `/api/reports/*` (`main.routes.ts:425`) → `ReportsController` → handler. Status branch at the handler | live-path | `api.service.ts:388` for the `reports/` prefix; `main.routes.ts:425-426` | 350998fa | Route path changes, Low | — |
| P-14 | **Live path, audit:** Edit modal Save → confirmation → `service.activate/deactivate` → `PATCH /:id/(de)activate` → service. The `/admin` panel targets the same URLs but sends no `Authorization` header, and `JwtMiddleware` requires one, so the live panel path is not assumed | live-path | `bilateral-mapping.component.ts:645-648`; `bilateral-mapping.service.ts:111`; `BilateralProjectMappings.tsx:280-288`, `:314-321`; `git grep -nE -e 'window\.fetch' -e 'Authorization' -e 'Bearer' -- server/researchindicators/src/admin`: 0 hits; `jwr.middleware.ts:79-82` | 350998fa | Audit misses a path, High | — |
| P-15 | **Readers of the shared state:** `list()` is called by `bilateral-project-mapping.controller.ts:129` and `admin.service.ts:18`. The CLARISA picker rule lives at `clarisa-projects.controller.ts:104-117`; `hasSciencePrograms` also has `bilateral-mapping-coverage.service.ts:417` and `bilateral.service.ts:525`, `:596` as independent readers, untouched by DD-7 | shared-state | `git grep -nE -e "[pP]rojectMappingService\.list\(" -e "this\.service\.list\(query\)" -- server/researchindicators/src server/researchindicators/test`; `git grep -nE -e "hasSciencePrograms\(" -e "\.project_mappings_array" -- server/researchindicators/src ':!*.spec.ts'` | 350998fa | T-02 scope grows, Low | — |
| P-16 | **Consumers:** additive response fields reach `bilateral-mapping.service.ts:78` and the admin SSR list; no raw `SELECT *` reader exists | consumer | `git grep -nE -e "GET_BilateralProjectMappings" -e "bilateralMapping(Service)?\.list\(" -e "service\.list\(" -- client/research-indicators/src/app/shared/services client/research-indicators/src/app/pages/platform/pages/administration ':!*.spec.ts'`: 3 hits; `git grep -nE -e "bpm\.\*" -e "FROM bilateral_project_mapping" -e "INTO bilateral_project_mapping" -- server/researchindicators/src ':!*.spec.ts' ':!server/researchindicators/src/db/baseline/*'`: 1 hit, `pool-funding.util.ts:26`, an EXISTS. Also read by `bilateral-mapping.service.ts:93` and `BilateralProjectMappings.tsx:134` | 350998fa | T-01 and T-03 consumers grow, Low | — |
| P-17 | Every currently Inactive row has `deleted_at` set | data-env | Read-only `SELECT is_active, deleted_at IS NULL, COUNT(*) FROM bilateral_project_mapping GROUP BY 1,2` on `ARI_MYSQL_*` (shared test DB), 2026-11-17: `is_active 0, deleted_null 0, n 1`; `is_active 1, deleted_null 1, n 197`. No Inactive row lacks `deleted_at` | 674c0fa0 | Those rows stay with a blank date; backfill note changes, Low | T-01, first step; owner runs or supplies the count |
| P-18 | The Dev list is small enough for one in-memory workbook within 15 s, including a cold CLARISA fetch | data-env | Volume half verified: read-only `SELECT reporting_year, COUNT(*) … GROUP BY reporting_year` on `ARI_MYSQL_*`, 2026-11-17: `2026 → 198`. The 15 s timing half stays for H-1 | 674c0fa0 | Streaming or an async export; NFR-MFE-001 and the task plan change, **High** | T-03, first step; measured again at the HITL |
| P-19 | The Dev proxy passes `Content-Disposition` to the browser once CORS exposes it | data-env | `UNVERIFIED — confirm at source before relying on it`. No proxy config in the repo; `client/research-indicators/nginx.conf` has no `/api` location | — | The fallback name applies, and DD-5 reopens, **High** | H-1 (T-05 HITL rows), owner |
| P-20 | Rows stay index-aligned with `getRawAndEntities` without paging, because each join has at most one match | existence | `agresso-contract.entity.ts:14` primary `agreement_id`; `baseline.sql:4481` `sec_users` primary key | 350998fa | DD-3 and DD-8 change, High | — |
| P-21 | `list()` swallows every CLARISA error in a bare `catch` | location | `bilateral-project-mapping.service.ts:126-140` | 350998fa | The availability contract changes, High | — |
| P-22 | The CLARISA call has no timeout | existence | `git grep -nE -e "timeout" -e "axios\.defaults" -e "HttpModule\.register" -- server/researchindicators/src/domain/tools/clarisa ':!*.spec.ts'`: 0 hits; `node_modules/axios/lib/defaults/index.js:132` `timeout: 0` | 350998fa | DD-12 drops, Low | — |
| P-23 | The error interceptor toasts every status but 401 and 409, with URL exemptions | location | `http-error.interceptor.ts:113-143` | 350998fa | The toast design changes, Low | — |
| P-24 | Merging to `dev` applies the migration | data-env | `UNVERIFIED — confirm at source before relying on it`. Only secondary sources: root `CLAUDE.md` §4.3 and `docs/infrastructure.md` §6.4. No pipeline definition in the repo | — | Dev reads of the table break after the deploy, **High** | H-1, owner reads the deploy console |
| P-25 | No global validation pipe exists | existence | `git grep -nE -e "APP_PIPE" -e "useGlobalPipes" -- server/researchindicators/src/main.ts server/researchindicators/src/app.module.ts`: 0 hits | 350998fa | The method pipe drops, Low | — |
| P-26 | In the error envelope `description` is the exception class name, and the readable text is in `errors`, a string or an array | location | `server/researchindicators/src/domain/shared/error-management/global.exception.ts:31-45`; the client already avoids `description` at `bilateral-mapping.service.ts:199-205` | 350998fa | The failure toast reads another field, Low | — |

---

## 14. Budget

| Measure | Estimate |
| --- | --- |
| Tasks | 6 |
| LOC | ~1,050 (~450 production, ~600 tests) — **re-baselined 2026-11-17 after T-03:** ~3,350 (~850 production, ~2,500 tests) |
| Review rounds | 8 — **re-baselined 2026-11-17:** 12 |

The re-baseline was owner-approved at the budget tripwire after T-03. The overrun is the mandated §8 and §10 gates (parity grid, cohort, K-019 fixtures) plus an under-counted handler and client. `execution.md` → "Budget tripwire — after T-03" has the details.

Full depth matches, on risk rather than size.

---

## 15. Open questions

None blocking. Open rows with High impact: P-18, P-19, P-24.

---

## 16. References

- `docs/specs/bilateral/mapping-status-in-edit-modal/`
- `docs/specs/reports/excel-layout-server-side/`
- AC-1797 §3, §4
