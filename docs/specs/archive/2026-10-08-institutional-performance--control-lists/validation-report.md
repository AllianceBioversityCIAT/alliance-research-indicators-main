# Validation Report — Control Lists

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/institutional-performance/control-lists` |
| Validated at | `db954beb` (branch `institutional-kpis`), 2026-10-07 |
| Auditor | Claude Opus (T3) + one read-only Opus auditor for coverage. Implementers were Sonnet, so author ≠ auditor holds |
| Inputs | `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `judgment.md`, `proposal.md`, `../family.md`, code, the gate runs below |
| `test-report.md` | Not present: `/akili-test` was not run. Coverage was verified directly against the code and specs |

## 2. Summary

**Verdict (attempt 1): FAIL — 1 blocking finding.** Closed by the remediation run; see §13 for the re-validation verdict (**PASS with accepted WARNs**).

| Result | Count | Notes |
| --- | --- | --- |
| PASS | most clauses | CRUD, key immutability, uniqueness, in-use protection, consumer read, membership check, roles, menu, table standard, seed |
| WARN | 16 | 7 come from the T-05 waiver (manual evidence never captured on Dev). The rest are partial tests, stale docs, 3 new spec type errors, and reachable advisories |
| FAIL | 1 | R-CTL-001: the two-portfolio isolation gate does not exist |
| BLOCKED | 0 | — |

The code is sound: every read filters by `portfolio_id`, and every gate this spec owns is green. The failure is **missing evidence for a required gate**, plus an `execution.md` claim ("R-CTL-001 end to end", Run 8) that no test backs.

## 3. Task Completion

| Task | Status | Evidence | Result |
| --- | --- | --- | --- |
| T-01 Categories | done | Run 5, Reviewer PASS | PASS |
| T-02 Lists | done | Run 6, Reviewer PASS | PASS |
| T-03 Values | done | Run 7, Reviewer PASS | PASS |
| T-04 Usage + consumer read | done | Run 8, Reviewer PASS; server build exit 0 | PASS (but see R-1: Run 8 over-claims R-CTL-001) |
| CR-1 Code prefix on edit | done | Reviewer PASS | PASS |
| CR-2 Any empty list deletable | done | Reviewer PASS (attempt 2) | PASS |
| T-05 HITL | done by **requester waiver** (local check, no per-step quotes) | `execution.md` T-05 | WARN: done criterion 1 unchecked; §5 "T-05 before `/akili-validate`" not met |

## 4. File Existence

**PASS.** Every path in design §2.1 exists on both packages. Migrations are `1790900000000/1/2-createControlList{Categories,s,Values}.ts`.

Files that exist but design §2.1 does not list:

| File | Explained in |
| --- | --- |
| `control-list-value-lookup.service.ts` | design §5 rule 10 (amended at T-04). Not in the §2.1 table, and the module row still says it exports "the service and the registry" only |
| `control-list-natural-compare.util.ts` (server) | `execution.md` Run 8 only |
| `control-lists.types.ts`, `control-lists.global-exceptions.spec.ts` | `execution.md` Run 5 only |
| `test/control-lists-{categories,lists,values,usage}.integration-spec.ts` | `tasks.md`. Design §10 names `test:integration` only generically |
| `app.routes.spec.ts`, `angular.json` `allowedCommonJsDependencies` | J-9; Run 7 |

Design §2.1 says `api.service.ts` gets methods for every endpoint in §4, but the client has no A13 method. The page does not need one.

## 5. Build Integrity

All runs below are from this validation, executed serially with no agent active. The user's dev servers were running on ports 3001 and 4200, so `tsc --noEmit` stood in for the server `npm run build`, which deletes `dist/`. The last server build (exit 0) is from T-04 Run 8, before CR-2.

| Gate | Result | Notes |
| --- | --- | --- |
| Server `npm test` (full) | 431/433 suites, 4,154/4,157 tests | 3 failures, all pre-existing (innovation-use metadata ×2, capdev-bulk HTML); the same 3 since T-01 → PASS |
| Server `tsc -p tsconfig.build.json --noEmit` | exit 0 | PASS |
| Server integration `control-lists` | 4 suites, 34 tests, green | PASS |
| Server eslint (46 committed LF blobs) | 0 failing | PASS. On the working tree it reports 220 `␍` errors, all CRLF line endings under `core.autocrlf` (known) |
| Client `npm test` (full) | 345/345 suites, 7,938/7,938 tests | PASS |
| Client `ng lint` | clean | PASS |
| Client `ng build` | exit 0; Initial total 1.35 MB (< 2 MB warning) | PASS. `alliance-sidebar.component.scss` exceeds the 4 kB warning budget (6.87 kB). It was already over before this spec, and this spec grew its source from 6,846 to 8,021 bytes → WARN |
| Client `tsc -p tsconfig.spec.json` | 948 errors (exit 2) | 945 pre-existing. **3 introduced by this spec**: `alliance-sidebar.component.spec.ts:339,353` (TS2352 casts) and `data-table.component.spec.ts:239` (TS2339). This gate was never recorded in any run → WARN |
| Environment boot smoke | not run | The user's own servers were up; nothing was booted in their place |

## 6. Requirement Coverage

Coverage was checked at scenario and clause level. The rows below are the ones that are not a clean PASS. Every other scenario, `BUT` / `AND IT MUST` clause and AC passed, with a named test.

| Req › clause | Evidence | Result |
| --- | --- | --- |
| **R-CTL-001** *Isolated* "BUT it must NOT return any category, list or value of another portfolio" | All 4 integration specs use Portfolio 2 only (verified by grep). No two-portfolio read exists. Requirements §10 and design §10 both mandate this gate | **FAIL** |
| **R-CTL-001 AC.2** "value created under P2 cannot be read under P1" | No test | **FAIL** (same gap) |
| R-CTL-001 *Isolated* THEN / AC.1 | Unit test of the mocked query shape only (`service.spec:202`) | WARN |
| R-CTL-001 "a write without a portfolio → 400" | DTO validators only, untested | WARN |
| R-CTL-002 Outputs "list count" | A3/A4 return `lists: []`, so a PATCH on a category with lists shows an empty array. Reachable | WARN |
| R-CTL-003 *Same key in two portfolios* | Mocked `null` lookup (`service.spec:742`). The header check covers `P2 · …` only | WARN |
| R-CTL-007 *Allowed roles* "each creates a **value**" | Integration creates a *category* as Center Admin and System Admin. No System Admin value create | WARN |
| R-CTL-008 navigator "Categories (collapsible)" (design §6.2) | Not implemented (T-02 advisory) | WARN |
| R-CTL-009 *Export* "in that order" + "list name in the file name" | Filter and all-pages are tested, and order is tested separately in the util. No combined test; the file name is untested | WARN |
| **Manual items (T-05 waived)**: R-CTL-008 AC.1 flyout in a real browser; R-CTL-009 AC.2 resize persists; NFR-CTL-001 p95 on Dev; NFR-CTL-004 keyboard + focus trap; visual fidelity to the mockup; R-CTL-010 Dev count 6/23 | Requester checked locally; no per-step observations | WARN (×6) |

Fully PASS: R-CTL-002 (scenarios, ACs), R-CTL-003 (key fixed, duplicate key, list-with-values, lifecycle incl. CR-2, *Used by*), R-CTL-004 (all, incl. read-only ID), R-CTL-005 (all, incl. the FK backstop), R-CTL-006 (all), R-CTL-007 *Denied role* + AC.2 + A13 open, R-CTL-008 *Menu placement* / *Empty list* / AC.2, R-CTL-009 natural sort / hidden rows / AC.1 / `aria-sort`, R-CTL-010 locally, NFR-CTL-002/003/005.

## 7. Linting & Code Quality

- **Hex literals:** 0 in the page and `data-table` files. `bg-white` remains (not a token).
- **Swagger:** all 13 handlers have `@ApiOperation`; the class has `@ApiTags` and `@ApiBearerAuth`; per-param docs are complete.

**4R advisory findings** (not spec violations). These are reachable today and worth fixing:

| # | Lens | Finding |
| --- | --- | --- |
| A-1 | reliability | `POST /lists {codePrefix: ""}` stores `''`, because `?? derive` does not catch an empty string. Later proposals become `-01` |
| A-2 | reliability | The code-proposal regex is case-sensitive while the unique index is not. An API-saved `dir-04` makes the next proposal return 409 |
| A-3 | resilience | A category-delete pre-check ignores inactive lists while the FK counts them → 500. A1452/1451 races → 500. A12 does not map 1451 → 409 (carried to child 2) |
| A-4 | readability/UX | A double toast on non-409 errors; an invalid key pattern leaves Save disabled with no message |
| A-5 | reliability | `selectPortfolio` has an out-of-order response race; `valuesLoading` can stick after a portfolio switch |
| A-6 | risk | The user list "Otra" (id 15) disappeared during T-04. Tests were cleared; the cause is undetermined and no follow-up is recorded |

The remaining unresolved advisories from Runs 5–8 are low-risk and listed in `execution.md`: N+1 counts in A1, a strict bigint `!==` in `assertValueInList`, no `register()` dedup (carried to child 2), sheet name hard-coded, whitespace-only names, and others.

## 8. Design Conformance

**WARN.** The implementation matches design §3–§9 and decisions D-CTL-1…18. The drift is in the documents:

| Where | Drift |
| --- | --- |
| `requirements.md:255` (R-CTL-008) | "*Delete list* for custom lists only" is stale after CR-2 |
| `tasks.md:127` | Same text in the T-02 screen scope, with no superseded marker |
| `proposal.md:40, :48, :102` | Still say a system list "cannot be deleted" |
| `tasks.md:211` | Says `ControlListsService.assertValueInList`; the code has it on `ControlListValueLookupService` |
| `design.md:56` + §2.1 | Module exports and the file table omit the lookup service, the server natural-compare util and the types file |
| `design.md:247`, `tasks.md:319` | "J-9…J-11 pending the user", but `judgment.md:83` shows them applied |
| `design.md` §12 | D-CTL-18 is listed before D-CTL-17 |
| `design.md` §5 rule 2 | "catches 1062 around every insert/update", but `updateList` has no catch. Unreachable today (A7 changes no unique column) |
| Headers | `requirements.md`, `design.md` and `tasks.md` still say *draft* / *not-started*, last updated 2026-10-01. `execution.md:12` status is from Run 4. `family.md:35` child 1 is still `pending` |
| §14 budget | LOC estimate ~2,250; T-01 alone was ~2,770 lines. The tripwire was exceeded with no re-baseline recorded |

**Cross-document figures:** seed 2/6/23, explicit ids, 13 endpoints, 5 KPI lists / 4 levels, page sizes, field lengths (150/500/30/100/10), the key pattern and 3 migrations are consistent across requirements, design, tasks, execution and code.

**Proposal / visual reference:** behavior matches the proposal's intent, except its system-list text (above). Fidelity to the mockup was not observed (T-05 waived).

## 9. Test Evidence Summary

| Suite | Owner | Status |
| --- | --- | --- |
| Server unit (14 control-lists suites, 183 tests) | T-01…T-04, CR-2 | Green; reds observed per task (`execution.md`) |
| Server integration (4 suites, 34 tests, local DB) | T-01…T-04, CR-2 | Green; **no two-portfolio case** |
| Client unit (page 60, data-table, utils, sidebar, routes) | T-01…T-04, CR-1, CR-2 | Green; reds observed per task |
| Manual HITL | T-05 | Waived; local only |

## 10. Agent Guide / Constitution Impact

`execution.md` has no `## Constitution Impact` section. This spec created a new server module and a shared client component (`data-table`, the reusable F-7 pattern), and neither the child guides (`server/.../src/CLAUDE.md`, `client/.../src/CLAUDE.md`) nor the TRD mention them → **WARN**, pending for `/akili-archive` (Constitution & Graph Sync).

## 11. Remediation

| # | Priority | Action | Closes |
| --- | --- | --- | --- |
| R-1 | **Must** | Add an integration test with two portfolios. Create scratch rows in a second portfolio, read A1 / A9 / A13 for each, and assert no cross rows. Then correct the Run 8 "R-CTL-001 end to end" claim | FAIL R-CTL-001 BUT + AC.2 |
| R-2 | Should | Fix the 3 spec type errors this spec introduced (sidebar spec :339, :353; data-table spec :239), and confirm `tsc -p tsconfig.spec.json` drops from 948 back to the 945 baseline | Build WARN |
| R-3 | Should | Sweep stale docs: everything in §8, plus status headers and `family.md` child 1 | Design WARN |
| R-4 | Should | Fix A-1 (empty `codePrefix`) and A-2 (case-insensitive proposal) with tests; decide whether A3/A4 should return the real `lists` | 2 reachable bugs + R-CTL-002 output WARN |
| R-5 | Could | Fill the test gaps: System Admin creates a value; export order + file name; same key in two real portfolios (can share R-1's fixture) | Coverage WARNs |
| R-6 | Rollout | Before merging to `main`: run T-05 steps 1–7 on Dev, settle P-13 (Jenkins `roar-monorepo-main` console), and check the Dev seed count 6/23 | Manual WARNs |
| R-7 | Archive | Add `## Constitution Impact` and sync the guides/TRD for the new module and the `data-table` pattern | §10 WARN |

## 12. Archive Readiness Recommendation

**Not ready.** R-1 is the only blocker. After R-1, and ideally R-2 to R-4, re-run the gates and this validation; with only accepted WARNs left (the T-05 rollout items owned by the requester), run:

```text
/akili-archive docs/specs/institutional-performance/control-lists
```

## 13. Re-validation (2026-10-07, after remediation — `execution.md` Run 9)

**Verdict: PASS with accepted WARNs. Archive-ready.**

| # | Status | Evidence |
| --- | --- | --- |
| R-1 | Closed | `test/control-lists-isolation.integration-spec.ts`: two portfolios, same key, A1 and A13 isolated (red observed by mutation). The Run 8 / `tasks.md` claims are annotated |
| R-2 | Closed | Spec tsc back to 945 (baseline) |
| R-3 | Closed | Doc sweep: R-CTL-008, T-02 screen scope, proposal, T-04 lookup service, §2.1, A4 row, §5 rules 2 and 4, D-CTL order, §14 actual LOC, headers, `family.md` |
| R-4 | Closed | A-1 (empty and untrimmed prefix), A-2 (case-insensitive proposal, server **and** client), A4 returns real `lists` |
| R-5 | Closed | System Admin and Center Admin create a value (201); export order + filter + file name |
| R-6 | **Open — accepted** | T-05 rollout items, owner requester: Dev steps 1–7, P-13 (Prod migrations), Dev seed count 6/23 |
| R-7 | Partly | `## Constitution Impact` added; guide and TRD sync is owed to `/akili-archive` |

Final gates: server 4,160 pass + 3 pre-existing failures; integration 39/39; `tsc` 0; eslint 0. Client 7,941/7,941; lint clean; spec tsc 945; `ng build` 0. Reviewer PASS (attempt 2).

Still WARN (accepted, low risk):
- the manual items waived at T-05;
- the remaining `execution.md` advisories (N+1 counts in A1, no `register()` dedup and no 1451 → 409 mapping carried to child 2, and others);
- the `alliance-sidebar` SCSS budget warning.
