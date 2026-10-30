# Kaizen Entry — bilateral/annualized-project-mapping

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/annualized-project-mapping` (AC-1797) |
| Date | 2026-10-30 |
| Branch | AC-1797-Move-bilateral-mapping-activation-inactivation-to-the-edit-modal-with-mandatory-justification-and-allow-exporting-the-filtered-list (Branch Context: **spec**. There are no `Default Branch:` / `Integration Branch:` pins, and the current branch ≠ `main`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 11 (T-01…T-10 + T-06b) | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-03 ×1, T-04 ×1) | execution.md, T-03 / T-04 attempt 1 |
| HALTs / FATAL_FAILs | 0 / 0 | execution.md |
| Pivots | 0. There is 1 owner amendment (R-APM-006 AC.5, every human write is MANUAL → T-06b) | execution.md, `## Spec amendment: T-06 gate` |
| Budget tripwire | Fired after T-05: ~1,500 LOC → +3,601/−1,275 at T-08; review rounds 16 vs ~14. The owner accepted it (2026-10-29) | execution.md, `## Budget Tripwire: after T-05` |
| PRODUCT_BUGs | n/a: `/akili-test` was not run (per-task falsifiers stand in) | validation-report.md §9 |
| Judgment-day severe findings | none open (judgment APPROVED) | judgment.md |
| Validation FAIL / WARN | 0 / 4 | validation-report.md §11 |
| Tasks closed under `REVIEW_WAIVED` / `REVIEW_SKIPPED` | 0 / 0 | execution.md |
| Escaped defects | 1, caught at the merge into `dev` before deploy: dev's pooled-funding monitor guard test (`not.toContain('2026')`) went red because the shared `effectivePoolFundingContributorSql` now embeds `currentReportingYearSql` (fallback literal 2026). Test-only fix in the merge commit `f1618fbe` | merge-fix, 2026-10-29 |

## Lessons

No new lesson. The one recurring root cause is routed to the existing row as **P1** (digest-update).

## Noted, not a lesson

- **Merge-time interaction (escaped defect above).** A guard test on a parallel branch asserted the absence of a literal year in SQL. That SQL composes a shared fragment, and this spec changed the fragment. It was invisible on both branches alone and visible only in the merged tree. The full suites on the merged tree caught it, which is the existing rule ("the Leader re-measures the full suite"). It sits below the lesson bar.
- **Owner override of the visual-approval hold.** The owner said "haz commit" before the visual check. The T-07/T-09 checks were then done on Dev after the deploy ("ya se paso a test y se prodo y todo bien"). This is not a process defect. The override was recorded in execution.md.
- **Recorded harness gaps that recurred.**
  - Scratch `migration:test:bootstrap` is red at `CreatePiDelegates1787600000000` (errno 3780).
  - The `bilateral-primary-contributing-sp` integration harness lacks `clarisa_levers`.
  - The client `tsc -p tsconfig.spec.json` baseline still has 945 errors.
  - All three pre-exist and are known.
- **Open product question (validation W-2).** When every contract is deactivated, the readiness strip says "run Auto-map", but Auto-map never reactivates a row.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `docs/specs/kaizen/bilateral--pool-funding-update-carryover.md` → KZ-bilateral--pool-funding-update-carryover-2 ("Budget estimates under-count real-MySQL fixtures") |
| Edit | Recurrence, the 4th consecutive bilateral spec. design §12 estimated "server ~700, migrations ~400" and did not size the test share. The spec's own falsifiability rules (executed SQL, generated-SQL assertion per reader, one fixture per bucket row) put T-03 at +536 and T-05 at +934, mostly specs. Raise the severity to High. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` §4.3, K-016 line |
| Edit | Stale: "`MappingPhaseResolver` and `ClarisaProjectsService` each cache for **5 minutes**". `MappingPhaseResolver` no longer exists in `src` (grep 0, 2026-10-30): the year now comes from `ReportingYearResolver` / `currentReportingYearSql` with no cache (NFR-APM-002). Replace it with: "`ClarisaProjectsService` caches the CLARISA feed for **5 minutes** (keyed by reporting year), and an `ARI_CLARISA_HOST` switch is invisible until the TTL lapses or the process restarts. (A second occurrence came from the since-removed `MappingPhaseResolver`.)" |
| Severity | Medium |
| Status | pending |
