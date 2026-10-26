# Validation Report — Results / OICR Word Template 2026 (filled download)

> **Verdict: NOT ARCHIVE-READY — 1 FAIL, 8 clauses BLOCKED on the T-08 HITL check on Dev, 3 WARN (spec wording).**
> The build is clean in both packages and 40 of 49 clauses PASS.
> - **FAIL:** a 2025 (Portfolio 1) download that hits an HTTP error shows **two** toasts. R-OWT-008 and R-OWT-013 require one.
> - **BLOCKED:** the 8 clauses can only be observed on the deployed Dev server.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/results/oicr-word-template-2026/` (amended by Pivot PV-1, 2026-10-26) |
| Validated at | `ff90c1d4` (branch `AC-1793-US2-Update-the-word-template-with-OICR-data`, 17 commits ahead of `origin`, none pushed) |
| Date | 2026-10-26 |
| Auditor | Claude Opus. Build integrity was run by the Leader inline; the clause audit was done by a fresh `akili-reviewer` context. The implementation is Cursor Grok, so author ≠ auditor holds on both model and context |
| Inputs | `requirements.md`, `design.md`, `tasks.md`, `execution.md` (no `proposal.md`, no `test-report.md`) |

## 2. Summary

| Area | Result |
|---|---|
| Tasks | 9 of 10 `[x]` with Reviewer PASS. T-08 is `[~]`: docs PASS, HITL on Dev open |
| Build integrity | **PASS**, both packages |
| Requirement coverage | 40 PASS · **1 FAIL** · 8 BLOCKED (HITL) · 1 WARN (out of 49 clause rows) |
| Design conformance | Code matches design §16 (PV-1). **3 WARN**: spec rows not amended by PV-1 |
| Coverage floors | Server 90.54 % statements (floor 60 %). Client `npm test` exits 0 with its thresholds enforced |
| Archive readiness | **No.** See §12 |

## 3. Task Completion

| Task | Status | Evidence in `execution.md` | Result |
|---|---|---|---|
| T-01 engine | `[x]` | PASS attempt 1, falsifiers (a)–(g) quoted | PASS |
| T-02 data + mapper | `[x]` | PASS attempt 1, 3 falsifiers quoted | PASS |
| T-03 endpoint | `[x]` | PASS attempt 1, 3 falsifiers; Swagger seen on the local server | PASS |
| T-04 client download | `[x]` | PASS attempt 1 | PASS |
| T-05 visibility (P2) | `[x]` | PASS attempt 1; rule amended by T-10 | PASS |
| T-06 route + page | `[x]` | PASS attempt 1 | PASS |
| T-07 retire WASM | `[x]` | PASS attempt 1; reversed by T-09 (PV-1) | PASS |
| T-08 docs + HITL | `[~]` | Docs PASS (grep 3 → 0). The 7 Dev observations are not yet quoted | **WARN (open)** |
| T-09 legacy restore + routing | `[x]` | PASS attempt 1; restore diff contains only `TEMPLATE_URL` | PASS |
| T-10 visibility P1+P2 + page | `[x]` | PASS attempt 1 | PASS |

## 4. File Existence

**PASS.** Every new, modified and restored file in design §2.1, §2.2 and §16 is present.
- **Server:** `word-template/*`, the dto, the `__fixtures__` docx, the repository, controller, module, app-config, `.env.example` and the `download_url` change.
- **Client:** `download-blob.util.ts` and `oicr-legacy-download.service.ts` (+ spec).
- **Restored:** `go/wasm.service.ts` (+ spec), `public/go/*`, `get-oicr-details.interface.ts`, `GET_OICRDetails` and the `angular.json` script entry.
- **Environment example:** `environment.example.ts` has `filesStorageUrl` and no `oicrTemplateName`.

## 5. Build Integrity

All commands were run by the Leader on 2026-10-26, with no worker active.

| Check | Command | Result |
|---|---|---|
| Server tests | `npm test -- --silent` | `Test Suites: 444 passed` · `Tests: 4354 passed`, exit 0 |
| Server coverage | `npm run test:cov -- --silent` | exit 0. All files: 90.54 % statements / 76.39 % branches. `word-template/` 92.91 % (engine 92.34, mapper 95.65, service 92.95) |
| Server build | `npm run build` | exit 0 |
| Server lint | `npx eslint src/domain/entities/result-oicr src/domain/shared/utils/app-config.util.ts src/domain/entities/result-status-workflow/repositories` | exit 0 |
| Direct deps | `npm ls jszip @xmldom/xmldom` | `├── @xmldom/xmldom@0.8.10`, `├── jszip@3.10.1` |
| Client tests | `npm test -- --silent` | `Test Suites: 347 passed` · `Tests: 8093 passed`, exit 0 |
| Client build | `npm run build` | exit 0 |
| Client lint | `npm run lint -- --quiet` | `All files pass linting.` |
| Client spec types | `npx tsc -p tsconfig.spec.json --noEmit` | 945 errors, the same pre-existing baseline recorded before every task. None are new |

**What this cannot reach (KZ-017):**
- Word itself, so a repair prompt or broken "+"/dropdowns would not show.
- The Cognito round trip.
- The browser's network requests.
- Timing on Dev.
- S3 egress from Dev.

Those are T-08 HITL items.

## 6. Requirement Coverage

The full clause table is in the auditor's report. Only non-PASS rows are listed here.

| Clause | Owner | Result | Why |
|---|---|---|---|
| R-OWT-008 · "one error toast" (Portfolio 1 path) | T-09 | **FAIL** | See below |
| R-OWT-013 · "On failure the button SHALL show one error toast with the legacy error text" | T-09 | **FAIL** | Same defect |
| R-OWT-005 · filled text not grey | T-01, T-08 | WARN | The XML check covers 12 of the filled controls; the visual check is HITL |
| R-OWT-001 · unauthenticated → 401 (live) | T-08 | BLOCKED | Seen only on the local server (`:3001` → 401) |
| R-OWT-004 · each row keeps a working "+" and dropdown | T-08 | BLOCKED | Word |
| R-OWT-008 / R-OWT-009 · 2025 download, live | T-08 | BLOCKED | Covered by unit tests; the live run is HITL |
| R-OWT-009 · return to the same code after login | T-08 | BLOCKED | Cognito |
| R-OWT-011 · `main.wasm` / S3 not requested (network) | T-08 | BLOCKED | DevTools |
| R-OWT-013 · document identical to the pre-spec 2025 one | T-08 | BLOCKED | Word |
| NFR-OWT-001 · ≤ 5 s | T-08 | BLOCKED | Timed request |

**The FAIL.** `TP.get` resolves an HTTP error instead of rejecting (`to-promise.service.ts:164-166`).
- `OicrLegacyDownloadService.getOicrDetails` (`oicr-legacy-download.service.ts:82-93`) runs **outside** the `try` of `generateAndDownload`. On a failed `GET_OICRDetails` (an inactive result → 400, a 5xx), the global `httpErrorInterceptor` shows toast #1.
- `response.data.other_projects` then throws a `TypeError`. That error propagates through `OicrDownloadService.download` (portfolio 1 branch) to the button, which shows toast #2: `Cannot read properties of undefined (reading 'other_projects')`.
- A failed 2025 template fetch behaves the same way, giving `Error downloading template: [object Object]`.
- The unit test missed it because "a legacy failure shows exactly one toast" fakes `{ success: false }` and registers no interceptors. That gap was already recorded as a T-04 advisory.

Leader check: the `TP.get` and `getOicrDetails` lines above were read directly (2026-10-26).

## 7. Linting & Code Quality

Lint is clean in both packages. **Advisory findings** below are not spec violations; they are carried forward from `execution.md` or are the auditor's own.

| # | Lens | Finding |
|---|---|---|
| A-1 | Reliability | xmldom ignores non-fatal parse errors, so a corrupted template could parse wrong (T-01) |
| A-2 | Risk | `cloneItems` does not refresh ids on comment or perm ranges inside an item (T-01) |
| A-3 | Reliability | The repository spec asserts `is_active` once per query, not once per joined table (T-02) |
| A-4 | Risk | No `country_role_id = 2` filter on countries. Live data is all role 2: 113 rows, 69 results (T-02) |
| A-5 | Resilience | An OICR with no active `result_oicrs` row produces a document of placeholders (T-02 / T-03) |
| A-6 | Reliability | A 200 response that is not a zip gives a generic, unlogged 500 (T-03) |
| A-7 | Reliability | Some 2025 error texts are technical ("Error inesperado", "[object Object]"). The FAIL fix covers this |
| A-8 | Risk | `wasm_exec.js` is loaded on every page again. Accepted by PV-1 |
| A-9 | Readability | Stale comments and headings: `oicr-header.component.spec.ts:336-337`; the `ux-ui/design.md` "Public / Unauthenticated" heading |
| A-10 | Reliability | `returnUrl` behaviour is not pinned by a test (T-06); the T-10 metadata-rejection mock uses a shape `TP` never returns |

## 8. Design Conformance

The code matches design §16 (PV-1):
- one routing point;
- P1 and P2 shown, unknown hidden;
- the legacy template pinned to the 2025 file;
- no WASM preload from the button;
- the server still returns 400 for P1;
- `download_url` in path form.

Spec rows that PV-1 did not amend:

| # | Where | Drift | Result |
|---|---|---|---|
| D-1 | design §1 Goals (`:41-42`) | "Button for 2026 only"; "One generation path: the client stops building documents" — neither struck | WARN |
| D-2 | design §2.2 rows for the util (`:104`) and the service (`:101`) | Still "hidden unless … 2" and `download(code)`; neither is in §16's superseded list | WARN |
| D-3 | design §2 mermaid; §10 HITL row; tasks.md header date; T-06's "BUT for a 2025 link" coverage; RB-1 still "open" | Not updated for PV-1 / P-22 | WARN |

Cross-document figures:
- 13 targets, 9 leaves, 66 revisions (7 types) and 11/8 legacy controls agree across all documents.
- Two mismatches:
  - The HITL count: tasks.md says "seven", while the `execution.md` T-08 list enumerates 8.
  - Design §14 says "4 server" tasks; there are 3.

## 9. Test Evidence Summary

There is no `test-report.md`. Evidence comes from the per-task falsifiers in `execution.md`, each observed red on its assertion and then reverted:
- T-01: 7;
- T-02: 3;
- T-03: 3;
- T-04: 2;
- T-05: 1;
- T-06: 2;
- T-07: 1;
- T-09: 3;
- T-10: 2.

Manual evidence so far:
- the owner's local downloads ("si se descargo bien…", "lo veo perfecto ambos agnos");
- Swagger, the anonymous 401 and the R-OWT-007 500, all seen on the local server.

None of these discharges a Dev HITL clause (KZ-002).

## 10. Agent Guide / Constitution Impact

No `## Constitution Impact` block was written: no module boundary moved. Two gaps for `/akili-archive`:
- The baseline docs are updated (T-08 docs), but the server child guide does not mention the `word-template/` submodule or the `ARI_OICR_TEMPLATE_URL` env var.
- CodeGraph needs a re-index.

Result: WARN, pending archive sync.

## 11. Remediation

| # | Severity | Action | Owner |
|---|---|---|---|
| R-1 | **FAIL** | Make a Portfolio 1 failure show exactly one readable toast:<br>• add URL-scoped interceptor exclusions for `oicr/details` (its only reader is the legacy path, P-17) and for `templates/2025_OICR_Template.docx`, beside `isOicrWordTemplateError`;<br>• in `OicrDownloadService`'s Portfolio 1 branch, map any thrown error to a fixed user message;<br>• add a button test with `httpErrorInterceptor` registered that asserts one toast for a failed `oicr/details`.<br>The legacy service itself is unchanged. | Execution: a new fix task (reopen `/akili-execute`) |
| R-2 | BLOCKED | Deploy, then run the 7 T-08 observations on Dev and quote each one | Owner |
| R-3 | WARN | Spec wording: strike or amend design §1 goals, the §2.2 util and service rows, the mermaid, the §10 HITL row; tasks.md header date, T-06 coverage, RB-1 status, the HITL count, and design §14 "4 server" | Leader (spec edit, with correction closure) |
| R-4 | WARN | Server child guide: `word-template/` and `ARI_OICR_TEMPLATE_URL`; CodeGraph re-index | `/akili-archive` |

## 12. Archive Readiness Recommendation

**Not ready.** Archive after:
1. R-1 is fixed with a Reviewer PASS;
2. R-2 is quoted on Dev, which closes T-08;
3. R-3 is applied.

R-4 is handled by the archive step itself. Then re-run `/akili-validate results/oicr-word-template-2026`.
