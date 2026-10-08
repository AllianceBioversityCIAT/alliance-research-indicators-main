# Kaizen Entry — institutional-performance/control-lists

## Document Control

| Field | Value |
|---|---|
| Spec Path | `institutional-performance/control-lists` |
| Date | 2026-10-08 |
| Branch | institutional-kpis (spec branch: no `Default Branch:` pin, and the branch is not `main`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 planned (T-01…T-05) + 2 change requests (CR-1, CR-2) + 1 validation remediation run | tasks.md; execution.md |
| Reviewer FAIL rework attempts | 5: T-01 a1 (both lenses), T-02 a1 (reliability), T-03 a1 (both), CR-2 a1 (stale text), Run 9 a1 (client/server code-proposal divergence) | execution.md — Runs 5, 6, 7, CR-2, Run 9 |
| HALTs / FATAL_FAILs | 0 / 0. Runs 1–3 paused on environment blockers (scratch schema), cleared without a code change | execution.md — Runs 1–3 |
| Pivots | 1 re-plan: 10 horizontal tasks → 5 vertical slices (D-CTL-16) | execution.md — Run 4; design.md §12 |
| PRODUCT_BUGs | n/a: no `test-report.md` (`/akili-test` not run) | — |
| Judgment-day severe findings | Round 1: J-1, J-2 fixed. Round 2: 0 severe | judgment.md; design.md §12 |
| Validation FAIL / WARN | Attempt 1: 1 / 16. After remediation: 0 FAIL, accepted WARNs | validation-report.md §2, §13 |
| HITL | T-05 Dev run waived by the requester (local check only) | execution.md — T-05 |
| Drift attributable | none reported (no audit report covers this spec) | docs/specs/audits/ |

## Lessons

- **KZ-institutional-performance--control-lists-1 — A rule mirrored in two packages drifts whenever only one package's worker is briefed.** (Product + Methodology, Medium)
  - **Root cause:** design D-CTL-17 duplicates the code-proposal rule in the server (`proposeNextCode`) and the client (`deriveNextProposedCode`). Its only guard is a "keep in lockstep" comment. Each time the rule changed, the brief named only one side.
    - T-03 attempt 1 failed because the client guessed the prefix and diverged from the server.
    - Validation remediation fixed the server's case-insensitive scan (A-2) and briefed the client worker on other items only. The Reviewer then caught a reachable 409 in the client.
  - **Evidence:** design.md §12 D-CTL-17 rationale ("T-03 attempt-1 FAIL, both lenses"); execution.md Run 9, Reviewer attempt 1; validation-report.md §7 A-2.
  - **Standardization:** → P1. Upstream: the same rule belongs in AKILI's task template (cross-package briefs).

- **KZ-institutional-performance--control-lists-2 — Restoring a mutation probe with `git checkout -- <file>` also discards the spec's uncommitted work.** (Product, Medium)
  - **Root cause:** K-004 tells agents to "break the thing on purpose once", but no guide says how to undo it. During CR-2 the Leader re-added the `is_system` guard to `control-lists.service.ts`, then "restored" it with `git checkout --`. That reverted the file to HEAD and erased the uncommitted CR-2 server change. It was recovered only because a backup copy had happened to be taken first. Every later brief in this spec had to repeat "restore from a copy, never `git checkout`" by hand.
  - **Evidence:** this session's CR-2 mutation step (execution.md — CR-2, "Reds observed: server"); the remediation briefs in execution.md Run 9 ("each restored from a backup copy, never `git checkout`").
  - **Standardization:** → P2.

## Noted, not a lesson

- **KZ-013 held:** a backward grep before the move found only `@akili-spec institutional-performance/control-lists` IDs in code comments (identifiers, not links), the `family.md` manifest row (updated in this archive) and `organizational-structure/proposal.md` "Depends on" (a spec ID, not a path). Nothing breaks.
- **LOC budget tripwire exceeded without a re-baseline** (estimate ~2,250; actual ~13,500, mostly tests; T-01 alone ~2,770). Same family as `bugfix--sp-versioning-link-results` KZ-L1 (budget not computed against the spec's NFRs and test burden). Second sighting; promote if it recurs.
- **T-05 HITL waived after local testing:** the substitute gates for jsdom-unreachable properties (resize persistence, flyout, visual fidelity) went unobserved on Dev. A product decision by the requester, recorded as follow-ups F-1…F-3 — not a process defect yet.
- **A9 isolation test had no mutation red:** `/lists/:id/values` takes no portfolio. Correctly excluded from the R-CTL-001 evidence (KZ-017 scope declaration held).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (verification fields section) |
| Edit | *"Mirrored rule: when a rule is implemented in both packages (server + client), the task and every worker brief that changes either side MUST name the mirror file and require a test on both sides that fails before the change."* |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | root `CLAUDE.md` §4.3, the K-004 bullet (append one sentence) |
| Edit | *"Undo a deliberate break by restoring a copy taken before it (`cp f f.bak` … `cp f.bak f`), never `git checkout -- <file>`: that also reverts the spec's uncommitted work in the same file."* |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | **KZ-008** (`staging` lineage: "A derived map labelled 'verified' will be trusted while wrong") |
| Edit | Recurrence +1. Source `institutional-performance/control-lists`: execution.md Run 8 listed "R-CTL-001 end to end" under *Requirements covered*, and tasks.md mapped the BUT clause to "T-04 (end to end)". No test read two portfolios. `/akili-validate` found it, and it was the spec's only FAIL. Add to the lesson: *a "Requirements covered" line must cite the test that proves each clause it names.* |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | **KZ-005** (`innovation-use` lineage: correction sweep must bound its search space on every axis) |
| Edit | Recurrence +1 on the **file-set** axis. CR-2 changed one rule, and the sweep covered `requirements.md` R-CTL-003 and `design.md`. Reviewer attempt 1 still found 4 stale sites, and validation found 5 more (`requirements.md:255`, `tasks.md:127`, `proposal.md` ×3). `proposal.md` was outside every sweep. Source `institutional-performance/control-lists`. |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | **KZ-008** (`innovation-use` lineage: "an advisory that names a reachable state is an unfiled defect") |
| Edit | Recurrence +1. Two reachable defects sat in the advisory register for days and were filed only by `/akili-validate`: Run 6's empty `codePrefix` stored through the API, and Run 7's case-sensitive code proposal that made the next proposal 409. Source `institutional-performance/control-lists`, validation-report.md §7 A-1/A-2. |
| Severity | High |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `server/researchindicators/src/CLAUDE.md` §8 (or a new short subsection after §5) |
| Edit | *"**Control lists consumers** (`domain/entities/control-lists/`): import `ControlListsModule`; register your in-use provider once from a singleton `onModuleInit` (`register()` does not deduplicate); add an FK `ON DELETE RESTRICT` to `control_list_values.id`; call `ControlListValueLookupService.assertValueInList(valueId, portfolioId, listKey)` before every write that stores a value id (no composite FK exists). Read values via `GET /api/control-lists/by-key/:listKey/values?portfolioId=`."* |
| Severity | High (child 2 depends on it) |
| Status | pending |

### P7

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `client/research-indicators/src/CLAUDE.md` — *Adding code — where it goes* table |
| Edit | *"\| A new data table (sort, page, resize, search, export) \| reuse `shared/components/data-table/` (F-7 standard, natural sort, lazy `exceljs` export) — do not build a new `p-table` wrapper \|"* |
| Severity | Medium |
| Status | pending |

### P8

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §8.1 *Data display* bullet, and §2.1 IA tree under *Portfolio Management* |
| Edit | §8.1: append `data-table` (`DataTableComponent` — F-7 table standard: natural sort, resizable columns, 10/25/50/100 rows, search, `.xlsx` export of filtered + sorted rows). §2.1: add `└── Control Lists` nested under `Portfolio Management` (route `/administration/center-admin/control-lists`); add the same row to §4 Screen Inventory. |
| Severity | Medium |
| Status | pending |

### P9

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/trd/trd.md` §4.1 server modules, §4.2 client modules, §5 data model |
| Edit | §4.1: `entities/control-lists/` — portfolio-scoped categories → lists → values; exports `ControlListUsageRegistry` + `ControlListValueLookupService` for consumers. §4.2: `shared/components/data-table/` (F-7). §5: tables `control_list_categories`, `control_lists`, `control_list_values` (utf8mb4_unicode_ci unique indexes; physical delete; seeded ids 1–2 / 1–6 / 1–23). |
| Severity | Medium |
| Status | pending |

**Factual-claims sweep of the root `CLAUDE.md`:** ran; no assertion was falsified by this cycle (no module list, count, or stage claim in the root guide covers these surfaces). No `factual-sweep` item.
**TRD & ADR:** no TRD architecture decision was overturned (the module is additive). No `trd-adr` item.
