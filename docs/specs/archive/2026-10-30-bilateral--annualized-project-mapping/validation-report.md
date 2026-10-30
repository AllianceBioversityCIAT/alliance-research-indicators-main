# Validation Report — Bilateral / Annualized Project Mapping

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/bilateral/annualized-project-mapping` (2026-10-annualized-project-mapping) |
| Branch / HEAD | `AC-1797-…` @ `13cb6bc5` (merged into `dev` as `f1618fbe`, pushed and deployed by the owner) |
| Validated | 2026-10-30 |
| Auditor | Claude Opus 5.5 (T3). The implementer was Grok 4.7 (Cursor). Author ≠ auditor holds |
| Inputs | requirements, design, tasks, execution (all 11 entries), judgment; no `test-report.md` (`/akili-test` was not run, and per-task falsifier evidence stands in) |

## 2. Summary

**Verdict: PASS with 4 WARN. Ready to archive.**

| Area | Result |
| --- | --- |
| Tasks | 11/11 PASS (Reviewer PASS on each); the owner's checks for T-07/T-09 are now attested |
| Build / lint / types | PASS (server build 0, eslint 0 on 42 changed files, client `tsc` app 0, client lint clean) |
| Tests | PASS (server 441 suites / 4,278 tests; client 347 / 8,115) |
| Requirement coverage | 11 R + 3 NFR, every clause has an owner and evidence. 0 FAIL |
| Owner acceptance | "ya se paso a test y se prodo y todo bien" (2026-10-30, after the deploy to Dev) |
| WARN | W-1 general owner attestation · W-2 open product question · W-3 client `tsc` spec baseline · W-4 recorded test gaps |

## 3. Task Completion

| Task | Status | Evidence |
| --- | --- | --- |
| T-01 migration annualize | PASS | `up`/`down`/`up` on TEST scratch, falsifiers quoted |
| T-02 year source | PASS | 8 integration cases on scratch; RB-2 closed by probe |
| T-03 readers + DB function | PASS (att. 2) | generated-SQL assertions, EXPLAIN quoted |
| T-04 CLARISA unification | PASS (att. 2) | AC.2 grep, retire migration rehearsed |
| T-05 automapper buckets | PASS | every R-APM-005 row + A1697 fixture `197/0/1/198` |
| T-06 mapping service | PASS | upsert, retry, activate, real `RolesGuard` 403 |
| T-06b MANUAL on human write | PASS | 3 cases, falsifier red |
| T-07 `/admin` SSR | PASS | build, copy grep 0; **owner check: attested 2026-10-30 (W-1)** |
| T-08 client contract | PASS | both falsifiers; tsc app 0 |
| T-09 client UI | PASS | falsifiers, literal-year grep 0; **owner check: attested 2026-10-30 (W-1)** |
| T-10 env-modal selector | PASS | grep 0, tsc app 0 |

## 4. File Existence

| Expected | Found |
| --- | --- |
| Migrations `1792200000000`, `1792300000000`, `1793221840500` | ✅ all three in `src/db/migrations` |
| `bilateral-project-mapping-history.entity.ts` | ✅ |
| `uk_bpm_agreement_year` on the entity | ✅ `bilateral-project-mapping.entity.ts:24` |
| `PATCH :id/activate` with `@ApiOperation` + `ValidationPipe` | ✅ `bilateral-project-mapping.controller.ts:175` (roles at class level) |
| Client `GET_ClarisaProjectPhases` / `ClarisaProjectPhase*` removed | ✅ grep 0 |
| `ARI_CLARISA_PROJECTS_PHASE` runtime reads | ✅ none (enum member only, kept for old migrations) |

## 5. Build Integrity

Run on the branch HEAD, 2026-10-30, with no worker active.

| Gate | Result |
| --- | --- |
| server `npm run build` | exit 0 |
| server `npm test -- --silent` | 441 suites / 4,278 tests passed |
| server `npx eslint` (42 changed `.ts/.tsx`) | exit 0 |
| client `tsc -p tsconfig.app.json` | exit 0 |
| client `npm run lint -- --quiet` | All files pass linting |
| client `npm test -- --silent` | 347 suites / 8,115 tests passed |
| merged `dev` tree (2026-10-29, `f1618fbe`) | server 468 / 5,027 · client 377 / 8,884 · all green |

## 6. Requirement Coverage

Clause-level ownership is in `tasks.md` §4. No orphan clause was found.

| Req | Result | Evidence (task) |
| --- | --- | --- |
| R-APM-001 year on rows, backfill, archive, abort rule | PASS | T-01 |
| R-APM-002 one year variable (`ARI_PRMS_SYNC`), no TTL, no other-year feed | PASS | T-02, T-04; spot check: `listProjectsForCoverage` uses `resolveListingYear()` |
| R-APM-003 no caller-chosen year | PASS | T-05 (400/strip), T-04, T-08 |
| R-APM-004 reads scoped to current year | PASS | T-03, T-05, T-06 (W-4: AC.3 evidence is SQL-level) |
| R-APM-005 upsert, activation belongs to user, A1697 | PASS | T-05 |
| R-APM-006 manual create upserts; AC.5 MANUAL | PASS | T-06, T-06b, T-07, T-09 |
| R-APM-007 year shown, no literal years | PASS | T-09 (grep 0), T-07 |
| R-APM-008 readiness note (5 states), plain modal | PASS | T-09, T-10 (W-2) |
| R-APM-009 inactive is not pending | PASS | T-05 fixture, T-09 card |
| R-APM-010 retired key UI removed | PASS | T-10, T-04 |
| R-APM-011 reactivate, never by Apply | PASS | T-05 + T-06 sequence test, T-07, T-09 |
| NFR-APM-001 migration safety | PASS | rehearsed `up`/`down`/`up` on TEST |
| NFR-APM-002 no year cache | PASS | T-02 |
| NFR-APM-003 query cost | PASS | index + EXPLAIN; load benchmark is an accepted gap |

All negative constraints (`BUT must NOT`) have a falsifier observed red in `execution.md`.

## 7. Linting & Code Quality

The gates are green (§5). The **advisory** 4R items below are carried forward from `execution.md`. None of them is a spec violation:

| # | Lens | Item |
| --- | --- | --- |
| A-1 | risk | Migration `up`/`down` cannot be re-run after a partial failure (DDL auto-commit); recovery is manual |
| A-2 | reliability | The stored `pool_funding_alignment_validation` year scope is checked as text only, with no per-year execution |
| A-3 | resilience | `externalCodeFor` (a possible CLARISA fetch) runs inside the `pessimistic_write` transaction, which widens the lock window |
| A-4 | reliability | The retire migration's `down` sets `is_active = 1` unconditionally |
| A-5 | readability | The CLARISA option is still named `phase`, and `coverage-report` still returns `phase_used` (its value is the resolver year) |
| A-6 | readability | `POST_AutomapperPreview/Apply` take `body: object = {}`; `Record<string, never>` would fail a future `{ phase }` at compile time |
| A-7 | resilience | Two concurrent Apply runs on a `toCreate` agreement surface a raw 1062 (pre-existing) |
| A-8 | readability | `sql-errors.const.ts:18` 1062 message typo ("his record already exists"), pre-existing |

## 8. Design Conformance

- **Matches the design:** the five buckets (§6.3), upsert plus activate (§6.5), the single year source (DD-10), and the SSR/STAR changes (§7).
- **Documented amendments:**
  - R-APM-006 AC.5 / §6.5: every human write stores MANUAL (owner, 2026-10-29; T-06b).
  - Budget overrun accepted by the owner (§12, 2026-10-29). LOC reached ≈ +3.6k against ~1.5k, and review rounds reached 16 against ~14.
- **Cross-document figures:** the R-APM-009 fixture `197 / 0 / 1 / 198` is consistent across requirements, tasks and the T-05 evidence. No contradicting figure was found.
- **Proposal intent** (one year, annual rows, user-owned activation): met.

## 9. Test Evidence Summary

- **Evidence model:** per task, the red was observed at HEAD, then the falsifier was observed red and reverted, quoted in `execution.md`. No `test-report.md` exists.
- **SQL:** integration cases ran on the TEST scratch container (T-02, T-03).
- **Manual/visual:** the owner tested on Dev after the deploy and reported "todo bien".
- **Recorded gaps (W-4):**
  - The `test/bilateral-primary-contributing-sp` integration harness is red at HEAD as well, so this spec did not introduce it.
  - No executed per-year check of the DB function.
  - Lock predicate and single-retry count not pinned.
  - R-APM-004 AC.3 is checked at SQL-string level only.

## 10. Agent Guide / Constitution Impact

- `execution.md` has no `## Constitution Impact` section.
- One item for `/akili-archive`:
  - **Change:** the root `CLAUDE.md` K-016 line names `MappingPhaseResolver` as a 5-minute TTL cache.
  - **Why it is stale:** this spec removes the year cache (NFR-APM-002), so the year no longer comes from it.
  - **Action:** re-check the name and update or annotate the line during the Constitution & Graph Sync.

## 11. Remediation

| # | Level | Item | Recommendation |
| --- | --- | --- | --- |
| W-1 | WARN | The owner's acceptance is a general statement, not per Done item (year switch, Auto-map ×3, Activate, Year column) | Accept as the owner's sign-off; it is recorded verbatim |
| W-2 | WARN | Open product question: when every contract is deactivated, the strip says "run Auto-map", but Auto-map never reactivates | Follow-up copy/state change; not a spec violation (R-APM-008 literal) |
| W-3 | WARN | Client `tsc -p tsconfig.spec.json` has 945 errors, identical to the pre-spec HEAD | Repo-wide baseline debt; out of scope |
| W-4 | WARN | Test gaps in §9 | Optional follow-up hardening |

**FAIL items: 0.**

## 12. Archive Readiness Recommendation

**Ready to archive.**
- All tasks have a Reviewer PASS.
- The owner tested on Dev and accepted.
- There is no FAIL.
- The four WARN items are accepted or are follow-ups.

Next: `/akili-archive bilateral/annualized-project-mapping`.
