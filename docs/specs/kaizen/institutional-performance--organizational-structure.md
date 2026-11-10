# Kaizen Entry — institutional-performance/organizational-structure

## Document Control

| Field | Value |
| --- | --- |
| Spec Path | `institutional-performance/organizational-structure` |
| Date | 2026-11-10 |
| Branch | institutional-kpis (spec branch: the default branch is `main` via `origin/HEAD`; no `Default Branch:` / `Integration Branch:` pin in the root guide) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
| --- | --- | --- |
| Tasks executed | 15 (T-01…T-15; 6 planned at approval) | tasks.md |
| Reviewer FAIL rework attempts | 9 `STATUS: FAIL` verdicts. Attempt 2 was needed on T-01, T-02, T-03, T-04, T-05, T-07, T-11 and T-12 | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (delegates versioned per year, D-ORG-24 → T-12) | execution.md — ## Pivot Record (2026-10-22) |
| PRODUCT_BUGs | n/a (no `test-report.md`; `/akili-test` not run as a phase) | — |
| Judgment-day severe findings | none recorded | — |
| Validation FAIL / WARN | first pass 1 / 8 (+ 7 figure drifts) → final 0 / 0 | validation-report.md §2, §14 |
| Tasks closed under `REVIEW_WAIVED` / `REVIEW_SKIPPED` | 0 / 0 | execution.md |
| Escaped defects (§3) | 1. NFR-ORG-004 machine-token writes, found at `/akili-validate` in code delivered by T-01…T-04 (none under `REVIEW_SKIPPED`) | validation-report.md §6 |
| Post-closure edits without a task | 3 seed edits after T-05's PASS (2026-10-28, 2026-11-06, 2026-11-09) | execution.md; validation-report.md R-4 |

## Lessons

- **KZ-institutional-performance--organizational-structure-1 — A design premise about EXISTING auth code was asserted, never checked, and it hid an unowned security clause.** (Product, High)
  - Root cause: design §8 stated "Machine tokens get no admin role, so writes are unreachable by them". Nobody read `jwr.middleware.ts` / `AppSecretsService.validation`, which give a machine token its responsible user's roles. Because the premise made the clause look free, `tasks.md` §3 closed NFR-ORG-004 by ID ("T-01…T-04"), so no task owned "no write reachable by machine tokens" and no test existed.
  - Evidence: validation-report.md §6 (NFR-ORG-004 FAIL); design.md §8 (premise, corrected 2026-11-09 as D-ORG-27); execution.md — T-13.
  - Standardization: → P1 (root guide auth rule); recurrence of K-008 → P2.
- **KZ-institutional-performance--organizational-structure-2 — Changes to a closed task's artifact were made as ad-hoc edits, outside any task.** (Product + Methodology, Medium)
  - Root cause: requester data requests after T-05 closed (the 83 directors, ORG-047's email, the two-person cells) were applied straight to the seed of migration `…004`, three times. No task owned them, so no Reviewer audited them and the docs still said "11 directors from the mockup". Validation then raised R-4 and figure drift D-1, and T-14 had to be opened retroactively.
  - Evidence: execution.md — "Seed directors from the requester's org-structure sheet (2026-10-28)", "Local re-seed with all directors (2026-11-06)"; validation-report.md §6 (R-ORG-015 WARN), §8 (D-1); tasks.md — T-14 "Added … to own the seed edits made after T-05".
  - Standardization: → P3 (template), P4 (upstream).

## Noted, not a lesson

- **A falsifier that silently did nothing (T-15, T14-a):** the `sed` meant to delete the I-6 clause matched no line, so the "falsifier" run passed. It was caught because the run was green when red was expected, and it was redone by line number. This is the K-004 / KZ-014 family and the rule held. Recurrence feed: a falsifier must assert that its mutation landed (`grep -c` before and after) before its result is read.
- **A red-first run that wrote to the shared local DB (T-14):** the idempotence test called the seed function outside a transaction and inserted a row on a database without `…006`. It was fixed by wrapping the test in a rolled-back transaction (reviewer advisory). Below the bar; a DB-touching assertion in an integration suite defaults to a rolled-back transaction.
- **T-06 closed on one blanket statement:** the task's own disqualifier (the role not named) was flagged at validation and closed by re-asking per item. The rule held, one phase late.
- **Slow toolchain on this machine:** ts-node boots and `migration:dev:execute` took over 5 minutes, and one AppModule ts-node boot timed out at 400 s. A compiled `dist` boot took 1 s. Friction only.
- **`npm run migration:scan`** points to a missing script (pre-existing; archive-summary.md F-7).

## Pending Items

### P1

| Field | Value |
| --- | --- |
| Kind | standardization |
| Target | `CLAUDE.md` (root) §4.1, the **Auth** bullet |
| Edit | Append: "A machine token inherits the roles of its app secret's `responsible_user_id`, so `RolesGuard` cannot tell an integration from that person. A write only a person may make also needs `HumanCredentialGuard` (`domain/shared/guards/human-credential.guard.ts`, 403 on `req.credential === 'machine'`)." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
| --- | --- |
| Kind | digest-update |
| Target | K-008 (Queued for upstream: "Writing a coverage table does not make it exhaustive") |
| Edit | Add `institutional-performance/organizational-structure` as a source: `tasks.md` §3 closed NFR-ORG-004 by ID while its machine-token clause had no owner. It was found only by `/akili-validate`'s clause-level audit. Recurrence +1; severity High (it was the spec's only FAIL). |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
| --- | --- |
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` §6 Execution conventions |
| Edit | Add: "A change to an artifact of a task already marked done (seed data, a migration, a contract), even an informal requester request, opens a new task row with its own Reviewer, and in the same task corrects every spec sentence that states the old value." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
| --- | --- |
| Kind | upstream |
| Target | methodology |
| Edit | `/akili-execute`: after a task is `done`, a change to its artifacts must enter as a new task with review (closed-task reopening rule); otherwise the post-closure edits skip the Reviewer and the spec drifts silently until `/akili-validate`. |
| Severity | Medium |
| Status | pending |

### G1

| Field | Value |
| --- | --- |
| Kind | guide-sync |
| Target | `server/researchindicators/src/CLAUDE.md` §5 Auth, roles, and status, after the `RolesGuard` bullet |
| Edit | "- `HumanCredentialGuard` (`domain/shared/guards/human-credential.guard.ts`) answers 403 when `req.credential === 'machine'`. A machine token carries its responsible user's roles, so put this guard on writes only a person may make (first used on Organizational Structure B9–B13, D-ORG-27)." |
| Severity | High |
| Status | pending |

### G2

| Field | Value |
| --- | --- |
| Kind | guide-sync |
| Target | `server/researchindicators/src/CLAUDE.md` §2 Source map (`guards/{roles,result-status}.guard.ts`) and §7 Persistence rules |
| Edit | Source map: `guards/{roles,result-status,human-credential}.guard.ts`. §7 add: "- Helpers in `src/db/helpers/` imported by migrations (e.g. `staff-carnet-column.ts`) are frozen with those migrations: change them only by adding a new helper." |
| Severity | Low |
| Status | pending |

### G3

| Field | Value |
| --- | --- |
| Kind | guide-sync |
| Target | `client/research-indicators/src/CLAUDE.md` Folder layout, under `administration/center-admin/` |
| Edit | Add `│               ├── organizational-structure/` beside `capacity-bulk-upload/` and `sdg-management/` (page + `components/{org-tree,org-unit-panel,org-unit-form,org-lifecycle-dialog}`, `utils/org-tree.util.ts`). |
| Severity | Low |
| Status | pending |

### F1

| Field | Value |
| --- | --- |
| Kind | factual-sweep |
| Target | `docs/trd/trd.md` §4.1 Server modules / §4.2 Client modules |
| Edit | Add the `organizational-structure` server module (global 4-level structure; versioned per year; exports `OrgStructureReadService` and `OrgUnitUsageRegistry` to consumers) and the Center Admin *Organizational Structure* page. Root-guide sweep: no root `CLAUDE.md` sentence was falsified by this cycle. |
| Severity | Low |
| Status | pending |

### A1

| Field | Value |
| --- | --- |
| Kind | trd-adr |
| Target | `docs/trd/trd.md` §2.4 Key architectural decisions; supersedes none |
| Edit | "Person-only writes: a machine (app-secret) credential inherits its responsible user's roles, so role checks alone do not exclude integrations. Endpoints whose writes must come from a signed-in person add `HumanCredentialGuard` (403 on `req.credential === 'machine'`). Reads stay open to integrations. Source: organizational-structure D-ORG-27 / T-13." (ADR number allocated at apply time.) |
| Severity | Medium |
| Status | pending |
