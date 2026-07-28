# Validation Report — Results Center / External Results Readonly View

## Verdict: **PASS with 4 WARNs — archive-ready once the WARNs are accepted or actioned**

No FAIL findings. No unresolved `PRODUCT_BUG`. Every functional requirement (R-RC-001…R-RC-014) and NFR-RC-001 is implemented with code and test evidence. The four WARNs are: one incomplete task by design (T-11's environment-dependent ACs), one local build blocker provably unrelated to this spec, and two documentation-sync items that belong to `/akili-archive`'s Constitution Sync step.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `results-center/external-results-readonly-view` |
| Phase | `/akili-validate` |
| Date | 2026-07-28 |
| Auditor tier | T3 — **author ≠ auditor satisfied**: implementation ran on `sonnet` (the `akili-implementer` wrapper); this audit runs on `opus` |
| Inputs used | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `judgment.md`, `test-report.md` |
| Coverage evidence | Reused `test-report.md`'s requirement-to-test matrix (cross-checked, not re-derived) |

---

## 2. Summary

| Check | Result |
| --- | --- |
| Task completion | **WARN** — 16/17 done; T-11 partially complete by design |
| File existence vs design | **PASS** |
| Build integrity — server | **PASS** (build + 321 suites / 2047 tests + lint) |
| Build integrity — client tests/lint | **PASS** (307 suites / 6316 tests + lint) |
| Build integrity — client compile | **WARN** — fails on this machine, cause proven unrelated (§5) |
| Requirement coverage | **PASS** — 14/14 functional + NFR-RC-001 |
| Negative constraints / strict validations | **PASS** — explicitly tested |
| Quality & 4R | **PASS** with advisory notes |
| Design conformance | **PASS** |
| Constitution / doc sync | **WARN ×2** — see §10 |

---

## 3. Task Completion

| Task | Status | Evidence |
| --- | --- | --- |
| T-01…T-10, T-12…T-16 | **PASS** | All `done` with execution notes and Reviewer verdicts in `execution.md` |
| **T-11** | **WARN** | `partially complete`. Its **primary** AC (zero editable controls across all 12 tabs) is MET and independently re-verified by the AC.6 re-sweep. Three interactive ACs remain, blocked on a running stack — not on effort or unknowns. |

**Rework history is fully recorded, not hidden:** T-04 HALTed after 3 attempts (rolled back, re-attempted successfully on a 4th with the root cause identified); T-15 needed 3 attempts; T-03 and T-14 needed 2 each. Every FAIL report and mutation-test result is in `execution.md`. This is healthy audit trail, not drift.

---

## 4. File Existence

Every file named in `design.md` §2.1 exists and was modified as described. Two additions beyond the original composition list, both correctly documented as scope extensions rather than silent drift:

| Added | Recorded in |
| --- | --- |
| `my-latest-results.component.*` (R-RC-013) | design.md D-9 (supersedes D-3), requirements.md R-RC-013 |
| `section-header.*`, `submission-history-item.*`, `oicr-form-fields.*`, `quantification-item.*`, `innovation-details.html` (R-RC-014) | requirements.md R-RC-014, `execution.md` → `## T-11 Result: FAILED` |

No file in the design's list was left untouched without explanation; no undocumented file was changed.

---

## 5. Build Integrity

| Command | Package | Result |
| --- | --- | --- |
| `npm run build` | server | **PASS** — `nest build` + admin Vite bundle clean |
| `npx jest` | server | **PASS** — 321 suites / 2047 tests |
| `npx eslint` | server | **PASS** |
| `npx jest` | client | **PASS** — 307 suites / 6316 tests |
| `npm run lint` | client | **PASS** |
| `npm run build` (prod) | client | **WARN — fails, cause proven unrelated** |
| `ng build --configuration development` | client | **WARN — same cause** |

### The client build failure, investigated rather than assumed

Both client builds fail with 7 `TS2339` errors on `environment.documentOverviewUrl` / `environment.keyProjectOverview`. Throughout implementation these were reported as "pre-existing"; validation required proving that rather than accepting it. Four checks:

1. **`environment.ts` and `environment.dev.ts` are gitignored** (`client/research-indicators/.gitignore:41`) — only `.gitkeep` is tracked. They are per-developer local files.
2. **Neither local env file defines the two properties** (`grep -c` → 0 in both).
3. **This spec's commits never touched any erroring file** — verified by replaying every `[SPEC:results-center/external-results-readonly-view]` commit's file list: zero matches for `environment*`, `jwt.interceptor`, `document-overview.service`, `file-manager.service`, `project-dashboard*`.
4. **The code requiring those properties came from the branch's other work** (the AC-1672 dashboard-charts effort sharing this branch), which does appear in the branch diff.

**Conclusion:** a local environment-config gap on this machine, independent of this spec. Not a FAIL against this spec, but it does mean **the production build could not be exercised here** — recorded as WARN rather than silently passed.

**Remediation:** add `documentOverviewUrl` and `keyProjectOverview` to the local (gitignored) env files, or obtain the current template from whoever owns the AC-1672 work. CI presumably injects them.

---

## 6. Requirement Coverage

Cross-checked `test-report.md`'s matrix against `requirements.md`. No requirement lacks a mapped task, code evidence, and test evidence.

| Requirement | Task(s) | Code | Test | Result |
| --- | --- | --- | --- | --- |
| R-RC-001 | T-04 | 6 handlers in `results-center-table` | AC.1–AC.3 + Scenario `BUT`/`AND IT MUST` | **PASS** |
| R-RC-002 | T-02, T-03 | `cache.isExternalResult`, `isEditableStatus` delegation | truth table + 15-case `it.each` | **PASS** |
| R-RC-003 | T-07 | authors/contact `disabled` + method guard | AC.1–AC.3 + Scenario | **PASS** |
| R-RC-004 | T-07 | MEL / SharePoint bindings | AC.1–AC.2 | **PASS** |
| R-RC-005 | T-08 | client `editable` + server TIP/AICCRA gate | AC.1–AC.4, PRMS regression untouched | **PASS** |
| R-RC-006 | T-09 | 3 request links | AC.1–AC.2 | **PASS** |
| R-RC-007 | T-06 | sidebar wrapper + dropdown | AC.1–AC.2 + Scenario | **PASS** |
| R-RC-008 | T-05 | synced date | AC.1–AC.3 incl. degradation | **PASS** |
| R-RC-009 | T-05 | public link | AC.1–AC.3 incl. no-dead-button | **PASS** |
| R-RC-010 | T-05 | platform deep link | AC.1–AC.2 | **PASS** |
| R-RC-011 | T-01 | metadata endpoint + DTO | AC.1–AC.3 (AC.2 newly covered) | **PASS** |
| R-RC-012 | T-13 | `changeStatus` guard | AC.1–AC.3 (AC.3 newly covered) | **PASS** |
| R-RC-013 | T-14 | Home cards | AC.1–AC.4 | **PASS** |
| R-RC-014 | T-15 | 5 controls + projected icon + 4 method guards | AC.1–AC.5; **AC.6 satisfied by the independent re-sweep**, not a unit test | **PASS** |
| NFR-RC-001 | T-08, T-12, T-13 | all three server guards | rejection-before-DB proven for each | **PASS** |
| NFR-RC-002 | — | no new eager-load introduced | code review only, per the NFR's own "how verified" | **PASS (as specified)** |
| NFR-RC-003 | T-05 | native buttons, token classes | structural only | **WARN** — see §12 gap 2 |

**Negative constraints and strict validations** (`BUT it must NOT` / `AND IT MUST`) are explicitly tested, not inferred: the modal must-not-open assertion appears across all six Results Center entry points; the query-param preservation clause has its own test; `DELETE_Result` and `PATCH_StatusChangeDate` are proven unreachable **even when their handlers are invoked programmatically**, which is stronger than the ACs literally demand.

---

## 7. Linting & Code Quality — PASS

Lint clean in both packages. Conventions honored: standalone components, signals for cross-cutting state, `ApiService`-mediated HTTP, token classes with no new hex literals, `ServerResponseDto` envelope preserved (errors flow through `GlobalExceptions`), append-only migrations respected (none needed — the four exposed columns already existed).

### 4R advisory findings (not spec violations — informational)

| Lens | Finding |
| --- | --- |
| **Reliability** | `version-selector.updateResult()` is the only mutation path on the result surface without a method-level second layer. Its template gate *is* a real platform check, so it is correctly gated — but it is now the odd one out among eight. |
| **Risk** | `multiselect-opensearch` declares no `disabled` input at all and has no `[disabled]` binding. Currently **unused** (zero references), so unreachable — but its first consumer on a result tab inherits an ungated control, and a feature-scoped review would not catch it. |
| **Readability** | Four controls (external-use checkbox + description, `app-impact-areas`, OICR No) gate transitively via `isEditableStatus()`; adjacent controls spell `cache.isExternalResult() ||` explicitly. Correct, inconsistent. |
| **Resilience** | The nested `describe` in `my-latest-results.component.spec.ts` calls `TestBed.resetTestingModule()`, silently discarding `setup-jest.ts`'s global `provideHttpClientTesting`/`provideNoopAnimations` for those 2 tests. Harmless today; a future `HttpClient` dependency would fail only in that suite. |
| **Risk** (pre-existing) | `oicr-form-fields.component.spec.ts:99-103` contains invalid TS (`let x: {…} as any;`) that `tsc -p tsconfig.spec.json` rejects; survives via ts-jest error recovery. Identical at HEAD — not introduced here. |
| **Risk** (pre-existing) | AICCRA is absent from the client result-interceptor's platform alternation, so an AICCRA author/contact DELETE yields **400 instead of 409**. The mutation is blocked either way, so NFR-RC-001's objective holds; the status code is wrong. |

All six are carried forward from `execution.md` rather than left to die in the audit trail. None blocks archive.

---

## 8. Design Conformance — PASS

Implementation matches `design.md`, and every deviation is documented as a decision rather than silent drift:

| Decision | Outcome |
| --- | --- |
| D-1 (use `updated_at` as sync date) | Held, and **strengthened**: its one confirmed corruption path was closed by R-RC-012 instead of being carried as an open risk |
| D-2 (defer server hardening) | **Revised twice, correctly** — ended with all three gaps closed |
| D-3 (don't fix alternate entry points) | **Superseded by D-9** for `my-latest-results` after T-10 exposed the flawed premise |
| D-4 (keep the modal component) | Held — `ResultInformationModalComponent` retained, only its Results Center triggers removed; other consumers verified unaffected |
| D-5 (leave the progress counter) | Held |
| D-6 (`isExternalResult` on `CacheService`) | Held — confirmed no circular dependency, behavior-preserving |
| D-7, D-8, D-9 | Added mid-flight, each with rationale |

**Proposal alignment:** the delivered behavior matches the approved intent and the originating Jira AC. Scope grew twice (R-RC-013, R-RC-014), both times through an explicit product decision recorded in the spec — not by drift. Non-goals held: no change to TIP/PRMS/AICCRA ingestion, no migration, no redesign of the STAR forms.

**Visual Reference:** the proposal's reference was screenshots, and image #3 was an *existing* STAR screen rather than a mockup to build. Nothing new was designed, so there is no mockup to audit against.

---

## 9. Test Evidence Summary

From `test-report.md` (3 suites, 3 Testers in parallel, all **PASS**; totals independently re-run by the Leader):

- Client 307 suites / 6316 tests; server 321 suites / 2047 tests.
- **No `PRODUCT_BUG`.** No FAIL. No flaky test recorded.
- Four coverage gaps found and closed during `/akili-test`, each mutation-verified: R-RC-011 AC.2 (zero prior coverage), R-RC-012 AC.3 (type-only assertion), R-RC-001 AC.1 title-link (whole suite ran under `template: ''`), and `clearOicrSelection()`'s method guard.
- Four gaps accepted and recorded rather than faked — carried into §12.

---

## 10. Agent Guide / Constitution Impact — WARN ×2

`execution.md` contains **no** `## Constitution Impact` blocks. Assessed independently: none was strictly required — the spec created no module, moved no boundary, and its only public-surface change (the metadata DTO) is additive. So the absence is defensible.

However, two constitutional documents are now **stale because of this spec**:

| # | Doc | Drift | Severity |
| --- | --- | --- | --- |
| 1 | `docs/ux-ui/design.md:153` | States: *"Click row → `result/:id` (own platform) **or external deep link (other platform)**"*. That is exactly the behavior this spec removed — external results now open `/result/:id` like STAR. The doc describes the pre-spec world. | **WARN** |
| 2 | `docs/ux-ui/design.md` decisions log | Has dated entries for comparable UX changes (2026-05-23, 2026-05-27) but **nothing** for this spec, despite a user-visible presentation change (modal → full read-only shell) plus three new header affordances. | **WARN** |

Per root `CLAUDE.md` §5 — *"prefer fixing the document and recording a decision… do NOT silently let docs and code drift"* — both should be corrected. Both are in scope for `/akili-archive`'s **Constitution & Graph Sync** step, so they are flagged as pending work there rather than fixed here.

**CodeGraph:** `.codegraph/` exists and now indexes pre-spec state across ~25 changed files. A re-index should be recommended at archive.

---

## 11. Remediation

**No FAIL findings — nothing blocks archive.** Ordered by value:

| # | Action | Owner | When |
| --- | --- | --- | --- |
| 1 | Update `docs/ux-ui/design.md:153` and add a decisions-log entry | archive step | `/akili-archive` |
| 2 | Re-index CodeGraph | dev/env | after archive |
| 3 | Complete T-11's three interactive ACs on a running stack | QA/dev | before release |
| 4 | Add the two missing properties to the local env files so the client build runs here | dev | any time |
| 5 | File tickets for the four advisory items in §7 | backlog | any time |
| 6 | Add a `## Local Environment` contract to `docs/infrastructure.md` (`/akili-constitution` Step 6B) | backlog | any time |

---

## 12. Archive Readiness Recommendation

### **READY TO ARCHIVE**, conditional on the user accepting these WARNs:

| # | WARN | Recommendation |
| --- | --- | --- |
| 1 | **T-11's three interactive ACs unverified** — header render/degradation, year-badge navigation in the real DOM, STAR visual baseline. T-04 and T-14 are direct evidence that green unit tests are insufficient here: both had passing suites over broken DOM behavior. | **Accept as tracked follow-up**, not as done. Genuinely blocked on environment, not effort. |
| 2 | **NFR-RC-003 a11y is structural only** — jsdom cannot prove focus order, AT announcement, or real contrast. | Accept; fold into the same manual pass as #1. |
| 3 | **Client build unverifiable here** — proven unrelated to this spec (§5). | Accept; fix the local env config. |
| 4 | **Two UX/UI doc drifts** (§10). | **Action at archive** rather than accept — the fix belongs to the Constitution Sync step and is small. |

Ready when you are:

```text
/akili-archive results-center/external-results-readonly-view
```
