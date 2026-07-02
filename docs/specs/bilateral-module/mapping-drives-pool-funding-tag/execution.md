# Execution Log — Bilateral / Mapping drives the Pool Funding tag

## 1. Document Control

- **Spec id:** 2026-07-mapping-drives-pool-funding-tag
- **Spec path:** docs/specs/bilateral-module/mapping-drives-pool-funding-tag
- **Branch:** AC-1594-bilateral-module-v2 (baseline HEAD at start: `ff4b7e78`)
- **Process:** JCSPECS Leader → Implementer → Reviewer triad (`.agents/`)
- **Created:** 2026-07-01
- **Last updated:** 2026-07-01

---

## 2. Task Execution History

### T-01 — Shared helper: effective pool-funding SQL fragment — ✅ PASS (attempt 1 of 3)

- **Date:** 2026-07-01
- **Requirements covered:** R-BIL-100, R-BIL-105 (foundation)
- **Implementer attempts:** 1

#### Attempt 1

- **Files changed (new):**
  - `server/researchindicators/src/domain/shared/utils/pool-funding.util.ts`
  - `server/researchindicators/src/domain/shared/utils/pool-funding.util.spec.ts`
- **Implementer verification (from `server/researchindicators`):**
  - `npx eslint` on both new files → exit 0 (clean).
  - New spec → 2 tests pass, 1 inline snapshot pass (exact predicate for alias `'ac'` + parameterization with alias `'contract'`).
  - Full `src/domain/shared/utils` suite → 22 suites / 131 tests pass.
- **Reviewer verdict:** `STATUS: PASS` — "T-01 conforms exactly to tasks.md T-01 and design.md §5: the helper returns the specified OR/EXISTS predicate as a pure, alias-parameterized string builder in the two new `shared/utils/` files only (correct placement per D-pf-4 / src/CLAUDE.md §3.3); snapshot + parameterization tests present; no migrations, endpoints, or unrelated tracked code touched." Reviewer independently re-ran the spec (2 tests + 1 snapshot pass) and eslint (exit 0), and confirmed the referenced schema (`bilateral_project_mapping` migration 1779190000011 with `idx_bpm_agreement`, `agresso_contracts.agreement_id` / `is_pool_funding_contributor`) exists in-repo.

#### Decisions made

- Helper implemented exactly as the design.md §5 code block (multi-line template literal); the snapshot pins that exact shape.
- Doc comment added stating the alias must be a trusted literal (never request input), per T-01 implementation note.
- `// @sdd-spec bilateral-module/mapping-drives-pool-funding-tag` traceability comment added to the util file.

#### Issues encountered (environmental, not task defects)

1. **Pre-existing repo-wide lint error (unrelated to this spec):**
   `src/domain/entities/bilateral/bilateral.service.ts:205` — `'activePortfolio' is assigned a value but never used` (`@typescript-eslint/no-unused-vars`). Leader verified via `git show HEAD` that the unused variable is committed at baseline HEAD `ff4b7e78` (science-program filtering work). It pre-dates T-01, is outside this spec's scope, and currently makes repo-wide `npm run lint` exit non-zero. Follow-up owner: bilateral squad (fix = use it in `deriveSciencePrograms`-adjacent logic or prefix `_`).
2. **`npm run lint` side effects:** the script runs `eslint --fix`, which auto-reformats two unrelated tracked files (`agresso-contract.repository.ts:343`, `bilateral.service.ts` — formatting only, no semantic change). These are lint artifacts, not Implementer edits; left out of the T-01 commit.

- **Final verification result:** PASS — task-scope lint clean, new spec green, shared-utils suite green, Reviewer PASS on first attempt.

---

### T-02 — find-contracts: derive projection, filter, and ordering — ✅ PASS (attempt 1 of 3)

- **Date:** 2026-07-01
- **Requirements covered:** R-BIL-100, R-BIL-101, R-BIL-102, R-BIL-105
- **Implementer attempts:** 1

#### Attempt 1

- **Files changed:**
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts` — import of `effectivePoolFundingContributorSql` + three edits inside `getContracts`: (a) inner-subquery projection (`:497`) now `${helper('ac')} AS is_pool_funding_contributor` (outer select alias untouched); (b) `poolFundingContributorFilter` (`:394-397`) now `AND ${helper('ac')} = 0|1`, feeding both count (`:441`) and main (`:520`) queries; (c) order fieldMap entry (`:344-345`) now the helper. `@sdd-spec` traceability marker added at the filter builder.
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` — one `orderBy` assertion updated from the old raw column to `` `${effectivePoolFundingContributorSql('ac')} ASC ` `` (no coverage removed).
- **Implementer verification (from `server/researchindicators`):**
  - `npx eslint` on both touched files → exit 0.
  - `npx jest src/domain/entities/agresso-contract src/domain/shared/utils/pool-funding.util.spec.ts` → 5 suites / 100 tests pass.
  - Full `npm test` → 291 suites / 1780 tests pass (pre-existing Jest worker teardown warning only).
- **Reviewer verdict:** `STATUS: PASS` — all three edits use the T-01 helper with the projected alias preserved (R-BIL-100), the single filter const derives both count and main queries with the boolean→0|1 mapping kept (R-BIL-101), ordering uses the helper (R-BIL-102), pure OR with correlated EXISTS and no LEFT JOIN / DISTINCT change (R-BIL-105, D-pf-1). Reviewer independently re-ran eslint (exit 0) and the agresso-contract suite (4 suites / 98 tests pass), verified the controller→service→repository chain, and confirmed the diff contains exactly the described edits.

#### Decisions made

- Live-DB behavioral ACs (D504 etc.) are validated by the SQL construction here and get runtime assertions in T-04 (per design §10).
- Spec assertion for ordering now pins the helper output instead of hardcoding the predicate — stays in sync with the single source of truth.

#### Issues encountered / discoveries

1. **Doc erratum (fixed 2026-07-01):** design.md §2/§7 and requirements.md §7 labeled the find-contracts chain as `service.findContracts → repository.findAllContracts`. The real chain is `AgressoContractController.findContracts` (`@Get('find-contracts')`, `:304`) → `service.findAgressoContracts` → `repository.getContracts`. The `service.findContracts → repository.findAllContracts` chain backs the ROOT `GET /api/agresso/contracts` endpoint instead. Docs corrected (constitution rule: fix the wrong doc, don't drift). The task's edit sites (`:343`, `:392-394`, projection) were correct for the real find-contracts path.
2. **Scope gap escalated (OQ-2 / RB-4):** the root `GET /api/agresso/contracts` endpoint (`findAllContracts`) also exposes an `is_pool_funding_contributor` filter (`:107-108`) and returns `ac.*` — both still raw-column semantics. R-BIL-100/101 literally target `find-contracts` only, so this was NOT changed; escalated to PO as requirements.md OQ-2 (bring in scope vs. document raw-by-design).
3. Pre-existing `bilateral.service.ts:205` lint error unchanged (RB-5); `bilateral.service.ts` was not touched.

- **Final verification result:** PASS — file-scoped lint clean, module suite green, full suite 291/1780 green, Reviewer PASS on first attempt.

---

### T-03 — results read path: derive the projection — ✅ PASS (attempt 1 of 3)

- **Date:** 2026-07-01
- **Requirements covered:** R-BIL-103
- **Implementer attempts:** 1

#### Attempt 1

- **Files changed:**
  - `server/researchindicators/src/domain/entities/results/repositories/result.repository.ts` — helper import (`:18`) + single projection edit in `findPoolFundingAlignmentContext` (`:205-207`): `COALESCE(ac.is_pool_funding_contributor, FALSE)` → `${effectivePoolFundingContributorSql('ac')} AS is_pool_funding_contributor`, with an `-- @sdd-spec` SQL line comment as traceability marker. `?` binding, JOINs, and the `PoolFundingAlignmentContext` interface untouched.
- **Implementer verification (from `server/researchindicators`):**
  - `npx eslint` on the file → clean.
  - `npx jest result.repository.spec.ts pool-funding.util.spec.ts` → 2 suites / 47 tests pass.
  - Full `npm test` → 291 suites / 1780 tests pass.
- **Reviewer verdict:** `STATUS: PASS` — exact application of design.md §5 step 4; alias `ac` correct (RB-1 closed); projected alias preserved; embedded `-- ` comment is valid, newline-terminated MySQL syntax that cannot swallow the next line; LEFT JOIN null-contract case evaluates to 0, identical to the old `COALESCE(..., FALSE)`. Reviewer independently re-ran eslint (clean) and both suites (47 tests + 1 snapshot pass).

#### Decisions made

- RB-1 (alias uncertainty) resolved during Leader pre-check and confirmed by Reviewer: alias is `ac`.
- `result.repository.spec.ts` exists but does not cover `findPoolFundingAlignmentContext`; no assertion pinned the old SQL, so no test edits. Method-level/runtime coverage lands in T-05 (per dependency graph T-03 → T-05).

#### Issues encountered

- None. `bilateral.service.ts` untouched (RB-5 unchanged).

- **Final verification result:** PASS — lint clean, suites green, Reviewer PASS on first attempt.

---

### T-05 — Tests: results parity + mapping lifecycle — ✅ PASS (attempt 1 of 3)

- **Date:** 2026-07-01
- **Requirements covered:** R-BIL-103, R-BIL-104, R-BIL-105
- **Implementer attempts:** 1 (ran in parallel with T-04; different files, no conflicts)

#### Attempt 1

- **Files changed:**
  - `server/researchindicators/src/domain/entities/results/repositories/result.repository.spec.ts` — helper import + new `describe('findPoolFundingAlignmentContext')` with 6 tests: effective projection & old-COALESCE-gone (R-BIL-103 AC.1); `?` param binding; first-row / null return contract; string-identical parity with find-contracts via the shared helper import (R-BIL-103 AC.2); pure-OR branch semantics — manual-tag branch, active-mapping branch gated on `bpm.is_active = 1`, OR with no suppress path (R-BIL-104 AC.1/AC.2, R-BIL-105 AC.1/AC.2). Load-bearing assertions derive from the imported helper, never hardcoded.
- **Implementer verification:** file-scoped eslint clean; `npx jest result.repository.spec.ts pool-funding.util.spec.ts` → 53/53 pass; full `npm run test:cov` → 291 suites / 1790 tests green, global coverage stmts 81.91% / branches 74.12% / funcs 83.5% / lines 81.8% (≥ 60% gate).
- **Reviewer verdict:** `STATUS: PASS` — tests-only diff; appends after the existing suite reusing the established `querySpy` pattern with no existing test modified; requirement coverage confirmed; parity assertion is a valid unit-level guarantee because both repositories embed the same helper output. Reviewer independently re-ran eslint (clean) and jest (53/53). Non-blocking note: the branch-semantics test intentionally pins predicate substrings as a semantic guard (a helper change removing `is_active` gating or the pure OR would rightly fail).

#### Decisions made

- **TEST-datasource integration cases skipped ("where practical" clause):** `ARI_TEST_MYSQL_*` points to a remote host unreachable from this environment (port 3306 connection failed); `src/CLAUDE.md §9` forbids MySQL in pure unit tests. Runtime lifecycle check (D504 create→true / deactivate→false) is explicitly deferred to **T-06 manual verification** — T-06 must execute it before spec close-out.

#### Issues encountered

- None. Concurrent T-04 work caused no cross-file interference (full-suite run green with both changesets present).

- **Final verification result:** PASS — Reviewer PASS on first attempt.

---

### T-04 — Tests: Projects table projection + filter + ordering — ✅ PASS (attempt 1 of 3)

- **Date:** 2026-07-01
- **Requirements covered:** R-BIL-100, R-BIL-101, R-BIL-102
- **Implementer attempts:** 1 (ran in parallel with T-05; different files, no conflicts)

#### Attempt 1

- **Files changed:**
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` — `// R-BIL-102 AC.1` annotation on the pre-existing pinned orderBy case + 4 new `getContracts` tests: effective projection with exactly-once predicate count and a raw-projection regex guard (R-BIL-100 AC.1–AC.4); filter true asserted on BOTH count and main queries with old-raw-filter absence (R-BIL-101 AC.1); filter false same (`= 0`, R-BIL-101 AC.3); filter absent → predicate never used as WHERE filter. All assertions compare against the imported helper output.
- **Implementer verification:** file-scoped eslint clean; `npx jest src/domain/entities/agresso-contract` → 102 tests pass; full `npm run test:cov` → 291 suites / 1790 tests green, coverage 81.91% stmts / 81.8% lines (touched files: repository 95.16% stmts, helper 100%). Fail-safe verified out-of-band: simulated raw-column restoration breaks both guards.
- **Reviewer verdict:** `STATUS: PASS` — call signatures match the real `getContracts(filter?, user?, orderFields?, direction?, pagination?, query?)`; requirement coverage confirmed; the restoration regex genuinely trips on the raw line and does not false-match the helper's `COALESCE(...)` or the outer `paginated_contracts.` line; R-BIL-101 AC.2 inherently covered by the effective-predicate `= 1` comparison at SQL-construction level; no existing test weakened; tests-only diff. Reviewer independently re-ran eslint (clean) and jest (102 pass).

#### Decisions made

- Same TEST-datasource deferral as T-05 (remote host unreachable; `src/CLAUDE.md §9`): pure query-string coverage; end-to-end value check falls to T-06 manual verification.

#### Issues encountered

- None.

- **Final verification result:** PASS — Reviewer PASS on first attempt.

---

## 3. Summary

- T-01 ✅ … T-05 ✅ complete (all on first attempt). Only **T-06** remains: Swagger description update, `EXPLAIN` index check, and manual verification (D504 badge on/off) against a running instance — T-06 also absorbs the runtime lifecycle checks deferred from T-04/T-05.
- Open items awaiting PO/user: OQ-2 (root endpoint raw-column filter, deferred by user 2026-07-01), RB-5 (pre-existing lint error outside spec).
