# Validation Report — PRMS Sync / Platform identity for TIP results

**Verdict: PASS with 4 WARN — ready to archive.** All 10 tasks are done with Reviewer PASS and a non-author evidence re-run. Every requirement scenario is owned by a task and backed by unit, real-MySQL, or owner HITL evidence. No FAIL. The WARNs are accepted drift or evidence gaps, each with a named owner (mostly `/akili-archive`).

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/tip-prms-phase-2/prms-platform-identity` (AC-1761 phase 2, family child 1) |
| Validated | 2026-10-22 |
| Validator | Claude Opus 5.5 (session Leader; did not author code — implementation was Grok `grok-4.7-high`, so author ≠ auditor holds on the model axis) |
| Inputs | `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `judgment.md`; no `proposal.md`, no `test-report.md` (`/akili-test` was not run — coverage comes from `execution.md` evidence) |
| Branch head at validation | `fe82c53b` + this report's commit |

## 2. Summary

| Area | Result | Note |
| --- | --- | --- |
| Task completion | PASS | 10/10 `[x]`, each with a PASS entry in `execution.md` |
| File existence | PASS | 48 code files changed, all inside task scopes |
| Build integrity | PASS | server unit 434/434 suites, 4290/4290; tsc, build, eslint 0; client lint and build 0 |
| Requirement coverage | PASS (1 WARN) | every scenario owned; R-PPI-006 "no save" covered by the owner's general HITL statement only |
| Design conformance | PASS (2 WARN) | three owner-approved pivots recorded; TRD collation line stale; budget overrun recorded |
| Constitution impact | WARN | server child guides updated in T-09; TRD §DB still says `unicode_520` |

## 3. Task Completion

| Task | Status | Attempts | Closing record |
| --- | --- | --- | --- |
| T-01 `prmsRef` / `parsePrmsRef` + builder | PASS | 1 (+1 continuation) | Reviewer PASS |
| T-02 Migration + entity columns | PASS | restart, 2 | Reviewer PASS (attempt 2, after the Dev-dump `updated_at` finding) |
| T-03 Sync log repo + status reader | PASS | 2 | Reviewer PASS (attempt 2, NULL-pushed-platform fix) |
| T-04 History writes + reader | PASS | 1 | Reviewer PASS |
| T-05 Correlator + mapping diff/apply | PASS | 1 | Reviewer PASS |
| T-06 Client: Pool Funding for TIP | PASS | 1 | Reviewer PASS |
| T-08 Sync tables → `utf8mb4_0900_ai_ci` | PASS | 1 | Reviewer PASS |
| T-09 ORM connection → `utf8mb4_0900_ai_ci` | PASS | 1 | Reviewer PASS |
| T-10 Knowledge Product ToC level `OUTPUT` | PASS | 1 | Reviewer PASS + owner HITL |
| T-07 Integration spec + full gates + HITL | PASS | 1 (+1 continuation) | Reviewer PASS + owner HITL |

No `REVIEW_SKIPPED` or `REVIEW_WAIVED` records. Every task has a non-author evidence re-run recorded as `VERIFIED`.

## 4. File Existence

| Design site | Expected | Found |
| --- | --- | --- |
| §7.1 reference + builder + aggregate loader | new `reference/prms-external-reference.ts`; builder; aggregate repo | ✅ |
| §5 migration + entities | new migration + `src/db/migration-specs/` spec; two entities | ✅ `1792673320363` |
| §5 *Collation* | separate migration | ✅ `1792681023849` |
| §5 *Collation* (connection) | `orm.config.ts` + pinning spec | ✅ |
| §7.2 / §7.5 log repo + status reader | edited | ✅ |
| §7.3 delivery repo/service, sync service, history reader | edited | ✅ |
| §7.4 correlator, mapping diff/apply | edited | ✅ |
| §8 client `platform-code.util.ts`, `api.service.ts`, specs | edited | ✅ |
| §8 KP ToC level | `toc-level-rules.util.ts` + specs | ✅ |
| §13 integration spec | `test/prms-platform-identity.integration-spec.ts` | ✅ |

No committed (merged) migration was edited. No file outside the task scopes, except two server guide lines (T-09 Constitution Impact) and one annotation in the parent spec (R-TIP-004).

## 5. Build Integrity

Run 2026-10-22 on the validated tree:

| Command | Result |
| --- | --- |
| server `npm test -- --silent` | `Test Suites: 434 passed` · `Tests: 4290 passed` |
| server `npx tsc --noEmit -p tsconfig.json` | 0 |
| server `npx eslint` over every touched dir, both migrations, migration-specs, the integration spec | 0 (bare eslint, not `npm run lint` — K-001) |
| server `npm run build` | 0 |
| client `npm run lint -- --quiet` | `All files pass linting.` |
| client `npm run build` | 0 |

Taken from `execution.md`, not re-run here: client unit 344/344, 8017/8017 (T-07); integration spec 8/8 on a fresh Dev-dump container (T-07, T-09). **What these cannot reach (KZ-017):** `npm test` never runs `test:integration`. Full `migration:test:bootstrap` is still blocked by pre-existing RB-3 (`CreatePiDelegates1787600000000`), so migrations were proven on a restored Dev dump through `migration:test:execute` / `revert` and targeted scripts.

## 6. Requirement Coverage

| Requirement | Scenario / clause | Task | Evidence | Result |
| --- | --- | --- | --- | --- |
| R-PPI-001 | Existing rows — log platform; non-STAR reference rewritten; history STAR rules | T-02 | synthetic seed + Dev dump: log `627/STAR`, TIP-only → `TIP-123/TIP` | PASS |
| R-PPI-001 | BUT never-matched history → no platform | T-02 | seed: STAR non-numeric → NULL, PRMS uncorrelated → NULL | PASS |
| R-PPI-001 | AND IT MUST be reversible without losing other data | T-02, T-08 | Dev dump `CHECKSUM MATCH: true` incl. `updated_at`; TIP row `updated_at` fixed through up/down | PASS |
| R-PPI-001 | New push row — log / history | T-03 / T-04 | SQL text + bound params; TIP writes `TIP` / `TIP-123` (log), `TIP` / `123` (history) | PASS |
| R-PPI-002 | Same code/year — status + attempt number | T-03, T-07 | integration: TIP status empty, TIP next attempt 1; falsifier red on MySQL (`attempt_number: 9`) | PASS |
| R-PPI-002 | Same code/year — history | T-04, T-07 | integration: TIP history `[]`, `sync_count` 0 | PASS |
| R-PPI-002 | Same code/year — mapping diff/apply | T-05, T-07 | unit (TIP vs STAR snapshot); integration NULL-platform snapshot from STAR history | PASS |
| R-PPI-002 | BUT STAR unchanged | T-03, T-04, T-07 | STAR old-vs-new bound values; integration STAR rows unchanged; full suites green | PASS |
| R-PPI-003 | Reference by platform — TIP prefixed; BUT STAR bare | T-01 | round-trip over every enum value; builder STAR `'123'`, TIP `'TIP-123'` | PASS (PRMS acceptance P-18 → child 3) |
| R-PPI-004 | TIP decision → TIP; STAR unchanged | T-05, T-07 | integration correlates `TIP-917200` → TIP row, bare → STAR row | PASS |
| R-PPI-004 | Bare reference → STAR; AND IT MUST NOT match TIP | T-01, T-05 | parser rejects `STAR-123`, `tip-123`, leading zeros; correlator binds `STAR` | PASS |
| R-PPI-004 | Unknown prefix → uncorrelated | T-01, T-04, T-05 | `XYZ-123` → UNKNOWN_REFERENCE, stored raw, NULL platform | PASS |
| R-PPI-005 | TIP push settles → TIP live row; STAR untouched | T-03, T-07 | live copy `COALESCE(pushed.platform_code,'STAR')`; integration: TIP push leaves STAR live row untouched | PASS |
| R-PPI-006 | TIP with alignment → shown, read-only | T-06, T-10, T-07 | unit (request + sidebar); owner HITL: "ya veo toda la data de tip esta perfecta" | PASS |
| R-PPI-006 | BUT must NOT be editable, no save | T-06, T-07 | unit `editable()` false for external results; owner "todo ya lo probe" — not quoted per check | **WARN** (KZ-002) |
| R-PPI-006 | TIP without alignment → hidden; other platforms unchanged | T-06 | unit: AICCRA/PRMS zero requests | PASS |
| NFR-PPI-001 | STAR regression | T-03, T-04, T-07 | full server + client suites; STAR byte-identity asserts | PASS |
| NFR-PPI-002 | Migration safety (up + down on fresh container) | T-02, T-08 | fresh Dev-dump containers, CLI runner execute/revert; bootstrap route replaced (RB-3) | PASS (route documented) |

## 7. Linting & Code Quality

Lint and type gates are clean (§5). **4R advisory** (carried from `execution.md`; none is a spec violation):

| Lens | Finding | Where |
| --- | --- | --- |
| Readability | `platformCodeOf` duplicated (T-03 + T-04 ×2); one home next to `prmsRef` | result-prms-sync |
| Readability | `automapper.service.ts:405` / `.spec.ts:398` comments give the old connection collation as the reason | bilateral-project-mapping |
| Reliability | integration "next attempt = 1" checks the claim's own MAX query, not `LAST_ATTEMPT_SQL`; STAR side of R-PPI-004 checked on a seeded row | integration spec |
| Reliability | `bilateral.service.spec.ts:2323-2325` uses `mockResolvedValue` where the sibling uses `…Once` | T-10 spec |
| Resilience | `Array.isArray(found) ? found : []` in the T-02 pre-check reads a non-array result as "no collision" | migration `1792673320363` |
| Risk | 12 legacy-collation tables (`unicode_520` / `unicode_ci`) are a latent 1267 trap for future `CAST`/`CONVERT` comparisons; now documented in `src/CLAUDE.md` §7 | db |
| Risk | STAR Knowledge Products can now save an `OUTPUT` ToC alignment (owner-accepted side effect) | bilateral |

## 8. Design Conformance

| Item | Result | Note |
| --- | --- | --- |
| §5 data model, migration order, down, collision | PASS | step-0 read-only pre-check; down restores references; owner wording 2026-10-22 |
| §5 *Collation* (tables + connection) | PASS | added by an owner-approved pivot (Pivot Record T-07) |
| §7.1–§7.6 readers/writers/correlator | PASS | §7.1 "code 0" correction and §7.2 COALESCE amendment recorded |
| §7.3 unmatched `TIP-999` | PASS | owner option A, code matches |
| §8 KP ToC level | PASS | T-10; parent R-TIP-004 STAR clause annotated as superseded |
| Budget (design §1) | **WARN** | 7 → 10 tasks, 11 → 12 review rounds, ≈850 → ≈2,900 lines; every addition owner-approved; actuals now written next to the budget line |
| Cross-document figures | PASS | design §1 and `tasks.md` header both carry the actuals; family table names no count |
| Execution pointers | WARN (minor) | early `execution.md` lines call the KP note "§10"; it lives in §8 (`tasks.md` fixed, log left append-only with a correction line) |

## 9. Test Evidence Summary

| Suite | Result | Source |
| --- | --- | --- |
| Server unit (full) | 434/434 suites, 4290/4290 | this validation |
| Client unit (full) | 344/344, 8017/8017 | T-07 (after one known runner-flake re-run) |
| Integration `prms-platform-identity` | 8/8 on a fresh Dev-dump container; falsifier red on MySQL | T-07, T-09 |
| Migrations on Dev data | `CHECKSUM MATCH: true`; up/down/up identical | T-02, T-08 |
| Owner HITL (test environment) | "ya esta en test todo ya lo probe y ya veo toda la data de tip esta perfecta" | T-07, T-10 |

## 10. Agent Guide / Constitution Impact

| Impact | Status | Owner |
| --- | --- | --- |
| `server/researchindicators/src/CLAUDE.md` §7 + `src/AGENTS.md` — connection collation | ✅ updated in T-09 | — |
| `docs/trd/trd.md:216` and `:515` still say MySQL `utf8mb4_unicode_520_ci` | **WARN** | `/akili-archive` TRD sync |
| No new module or boundary; no CodeGraph-relevant structure change | — | re-index at archive as routine |

## 11. Remediation

| # | Finding | Severity | Action | Owner |
| --- | --- | --- | --- | --- |
| R1 | TRD states the old MySQL collation | WARN | update both TRD lines to the connection collation + the legacy-table note | `/akili-archive` |
| R2 | R-PPI-006 "no save" not quoted per check | WARN | accepted: owner's "todo ya lo probe" stands; record as accepted | owner (accepted) |
| R3 | Budget overrun | WARN | accepted: all additions owner-approved; actuals recorded | — |
| R4 | `execution.md` "§10" pointers | WARN (minor) | none — append-only log; `tasks.md` corrected | — |
| A1–A7 | 4R advisories (§7) | advisory | candidates for a future proposal; not tasks in this spec | owner, optional |

## 12. Archive Readiness Recommendation

**Ready to archive.** All tasks `[x]`, no FAIL, WARNs accepted or owned by the archive's TRD sync.

```text
/akili-archive changes/tip-prms-phase-2/prms-platform-identity
```
