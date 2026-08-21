# Execution — project-detail / Project Dashboard Redesign

- **Spec id:** 2026-08-project-dashboard-redesign
- **Status:** in-progress
- **Owner:** j.cadavid@cgiar.org
- **Linked requirements:** ./requirements.md
- **Linked design:** ./design.md
- **Linked tasks:** ./tasks.md
- **Approval Mode:** gated (inherited from proposal)
- **Started:** 2026-08-21

---

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/project-dashboard-redesign` |
| Approval mode | `gated` (inherited from proposal; each task pauses for user approval) |
| Model note | Leader running on `opencode-go/glm-5.2` (T2 Coder per the registry). T1 OpenCode slug `<CONFIRM SLUG>` is unconfirmed. `author ≠ auditor` degrades to same-model separation — the OpenCode `task` tool exposes no per-spawn model selector, so Implementer and Reviewer run on the same default model. The constraint is recorded, not waived. |
| CodeGraph | `.codegraph/` absent in this checkout — workers explore by file. |
| Started | 2026-08-21 |

---

## Task Execution History

### T-01 — Server: results-summary aggregation in the repository

- **Final status:** PASS on attempt 1
- **Date:** 2026-08-21
- **Requirements covered:** R-PD-001 (Details, Scenario incl. both `AND IT MUST` clauses, `BUT` clause, AC.2)
- **Design decisions applied:** D-PD-1 (seventh sibling), D-PD-12 (primary-only semantics)

#### Attempt 1 — Implementer

- **Files changed:**
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.ts` (+101, -3)
  - `server/researchindicators/src/domain/entities/agresso-contract/repositories/agresso-contract.repository.spec.ts` (+126)
  - `server/researchindicators/src/domain/entities/agresso-contract/dto/contract-results-summary-report.dto.ts` (NEW — 3 DTO classes)

- **What was implemented:**
  - `getResultsSummaryReport(contractId)` method running three grouped queries over the shared `buildPrimaryContractResultsSubquery()`:
    1. By-status: `LEFT JOIN result_status` with `COALESCE(rs.name, 'No status')` for explicit null bucket (judgment SU2)
    2. By-year: `GROUP BY r.report_year_id` directly, no join (judgment W8), null-year bucket preserved
    3. Partner-institutions: `COUNT(DISTINCT institution_id)` over partner-role `result_institutions` links
  - `total` derived from `by_status.reduce()` so bucket-sum = total
  - `buildPrimaryContractResultsSubquery()` extended with `includeStatusId` / `includeReportYearId` boolean options (judgment call — preserves shared predicates per D-PD-12)
  - 4 new spec tests: empty-contract-id → 400, SQL-text + bound-params assertion, NULL-bucket + bucket-sum invariant, unknown-contract empty buckets

- **Implementer verification:**
  - Command: `npm test -- --silent` from `server/researchindicators/`
  - Result: **2418/2418 passed** (second run; first run had phantom timeout in `star-results-metadata-workbook.handler.spec.ts` — unrelated module, cleared by isolated re-run: 20/20 green in 44ms + second full-suite green)
  - Lint: `npx eslint` on 3 touched files — clean
  - Red input (KZ-014): Changed `LEFT JOIN` to `INNER JOIN`, assertion `expect(statusSql).toContain('LEFT JOIN')` FAILED as expected. Reverted; green.

- **Implementer `Not Done / Assumptions` (carried verbatim):**
  - Inconclusive first full-suite run (phantom timeout in unrelated module) — declared per KZ-017 inconclusive third outcome; cleared by isolated re-run + second full run
  - KZ-017 gap: unit tests assert generated SQL text but cannot prove SQL semantic correctness against real MySQL — deferred to T-02 Dev cross-check
  - Judgment call: extended `buildPrimaryContractResultsSubquery()` with two new boolean options rather than writing a separate subquery — preserves shared predicates per D-PD-12

#### Reviewer verdict — Attempt 1

- **STATUS: PASS**
- **Summary:** The implementation faithfully realizes R-PD-001's Details, both `AND IT MUST` clauses, the `BUT` clause, AC.2 (NULL buckets preserved, bucket-sum invariant tested with both NULL rows present), and D-PD-12 (shared primary-contract subquery reused across all three queries). Server conventions hold (DTOs decorated, no migration, parameterized raw SQL via `this.query`), and the KZ-017 SQL-semantics gap is correctly bounded to T-02. The `total`-from-`by_status`-only derivation is sound by SQL construction but would benefit from a defensive `by_year`-sum check (advisory, not gating).
- **ADVISORY (non-gating, recorded):**
  1. RELIABILITY/RESILIENCE: `total` is derived from `by_status` only; `by_year`≡`total` holds by SQL construction (identical result_id set in both subqueries) but is not enforced in code — a future predicate change to one subquery would silently break AC.2. Suggest asserting `sum(by_year) === total` or deriving `total` from an independent `COUNT(*)` over the base subquery.
  2. READABILITY: `GROUP BY contract_results.result_status_id, rs.name` is redundant (`rs.name` is functionally dependent on `result_status_id` via the LEFT JOIN); grouping by `result_status_id` alone is equivalent and marginally clearer.

#### Final verification result

- Server suite: 2418/2418 green (`npm test -- --silent` from `server/researchindicators/`)
- Lint: clean on 3 touched files (`npx eslint`, no `--fix`)
- Red input: discriminating (LEFT JOIN → INNER JOIN fails the assertion)


