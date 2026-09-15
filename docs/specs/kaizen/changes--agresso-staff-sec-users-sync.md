# Kaizen Entry — changes/agresso-staff-sec-users-sync

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/agresso-staff-sec-users-sync` |
| Date | 2026-09-15 |
| Branch | `new-spec-auto-sync-sec-users` |
| Branch Context | **spec branch** (default is `main`) — every proposal below is **recorded, not written** |
| Archive Run | 1 |
| Approval Mode | gated → pre-approved from T-08 |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 9 (8 `[x]`, T-09 `[~]`) | `tasks.md` |
| Reviewer FAIL rework attempts | **2** — T-01 attempt 2 (tinyint→boolean), T-05 attempt 2 (presence-not-order assertion) | `execution.md` |
| HALTs / FATAL_FAILs | **0** | `execution.md` |
| Pivots | **0** | `execution.md` |
| PRODUCT_BUGs | n/a — `/akili-test` never ran | no `test-report.md` |
| Judgment-day severe findings | inherited: 2 lineages, 5 rounds, terminal APPROVED-with-caveat (pre-execution) | `judgment.md` |
| Validation FAIL / WARN | **0 FAIL** / warnings accepted | `validation-report.md` |
| Budget | re-baselined mid-execution ~1,580 → ~3,000 LOC, user-approved at the T-03 gate | `design.md` §14 |
| Execution hosts | Claude (T-01/T-02) → Codex (T-03…T-05) → Claude (T-05 rework…T-09); Antigravity audited throughout | `execution.md` |

**MUDA hunted:** two rework attempts (defect waste), one wasted Codex dispatch on an invalid model slug (setup waste), two false-positive monitor firings (coordination waste), and one silently-failed fixture seed that cost eight misattributed test failures (rework waste).

**Jidoka observed:** the line stopped every time it should have. T-01 and T-05 were failed by the independent auditor and reworked rather than waved through; T-09's own falsification stopped and widened the gate instead of citing a green run.

## Lessons

- **KZ-changes--agresso-staff-sec-users-sync-1 — A defence-in-depth guard is untestable through its own caller, so "two guards" silently becomes one guard plus dead text.** (Product, **High**)
  - Root cause: `design.md` §5.4 deliberately pins `AND role_id = 3` in SQL *and* filters to role 3 in memory, explicitly because the in-memory guard was once removed by the correction meant to harden it. But every test drove the service, and the in-memory filter shadows the SQL one — so removing the SQL predicate left **13/13 green**. The redundant guard had no gate at all, which is exactly the state the redundancy was bought to prevent.
  - Evidence: `execution.md` — T-09, *"⚠️ The SQL guards did not discriminate on their own"*. Closed by two tests calling the repository directly; the same mutation then reddened 3 tests.
  - Standardization: → P1

- **KZ-changes--agresso-staff-sec-users-sync-2 — A monitor's stop condition must be measured against the live buffer before it is trusted, because the injected brief echoes the token it waits for.** (Product + Methodology, **Medium**)
  - Root cause: polling an Antigravity terminal for `STATUS:` fired immediately — the brief's own *verdict format* section contains three `STATUS:` lines, echoed into the buffer. A later monitor assumed a baseline of 2 without measuring and fired again. `terminal wait --for tui-idle` also proved unusable: it is satisfied **mid-work**, not only at turn end.
  - Evidence: `execution.md` — T-03 process notes; two false firings recorded during T-05 and T-07 dispatch.
  - Standardization: → P2

- **KZ-changes--agresso-staff-sec-users-sync-3 — `INSERT IGNORE` must be followed by a verification read, or a fixture seed fails silently and surfaces as an unrelated error three tables away.** (Product, **Medium**)
  - Root cause: the child guide's **FP-46** already warns that `INSERT IGNORE` downgrades FK/`NOT NULL` failures to warnings — but it frames that as *an accepted limitation not to fix*, not as *an obligation to verify*. The T-09 seed omitted `sec_roles.focus_id` (`NOT NULL`, FK to a third table), the error was swallowed, and **eight tests** later failed with a bare FK error naming `sec_user_roles`.
  - Evidence: `execution.md` — T-09, finding 1.
  - Standardization: → P3

## Noted, not a lesson

- **The `/akili-execute` review brief is what surfaced T-05's defect.** Codex's K-004 evidence was visibly thinner than T-03's and T-04's (which each listed four mutations with verbatim reds); the Leader flagged that in the brief and told the auditor to judge falsifiability *independently of what the implementer reported*. A brief that merely relayed the implementer's claim would have passed it. Below the lesson bar because it is the methodology working as designed — but it is the recurrence feed if brief-quality ever becomes a pattern.
- **Committing two tasks in one commit while a review was still in flight** breached evidence-before-checkbox. `PASS` made it moot. Recorded in `execution.md`; watch for recurrence in unattended runs.
- **`design.md` §14's budget was wrong in the test dimension, not the implementation dimension.** Implementation landed *under* estimate (580 vs ~740 for T-01…T-03); the whole overrun was test LOC against a line that assumed a conventional unit tier. Below the bar as a lesson because the spec's own "Honest caveat" predicted it.

## Pending Items

> **Spec branch — nothing below was written.** All items await the apply phase on `main`.

### P1

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | `docs/specs/general-setup/design.md` |
| Edit | When a design mandates the **same** invariant in two layers (belt-and-braces), it MUST also name how the redundant layer is falsified **independently of the primary** — a guard only reachable through the layer that shadows it has no gate. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | root `CLAUDE.md` — the Antigravity row in `## Model Routing` |
| Edit | Polling an `agy` terminal: **measure the stop token's baseline count in the live buffer first** — the injected brief echoes it. `terminal wait --for tui-idle` is satisfied *mid-work*, not at turn end, and is not a completion signal. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | `server/researchindicators/src/CLAUDE.md` — FP-46 |
| Edit | Extend FP-46: every `INSERT IGNORE` seed MUST be followed by a verification read that throws a named error when the seed did not take. The swallowed failure surfaces later as an unrelated FK error, potentially tables away from its cause. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | `digest-update` |
| Target | **`KZ-001`** (lineage `staging`) |
| Edit | Recurrence **13 → 16**. Three further instances, all in Leader-authored tests and all caught by the independent auditor rather than the author: an `app_secrets` grep over a mocked `manager.query` that never sees repository SQL (T-06); an *"asserts BOTH matched sets"* test whose fixture left `reactivate` empty (T-07); and a defence-in-depth SQL guard reachable only through the layer that shadows it (T-09). Severity stays **Critical**. Pattern worth naming: **an author's fixture naturally exercises the path the author's code takes**, which is why `author ≠ auditor` catches this class and self-review does not. |
| Severity | Critical |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | `factual-sweep` |
| Target | root `CLAUDE.md` — §4.3 CodeGraph bullet |
| Edit | The CodeGraph bullet asserts the index is live at the repo root and covers both packages. **This session could not exercise it:** the MCP server failed to start with `ENOENT: Executable not found in $PATH: codegraph`, so every worker explored by file and grep. The bullet's own instruction to *"re-verify this line before trusting it"* held — record the binary's absence as the current state rather than leaving the claim unqualified. |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | `guide-sync` |
| Target | `server/researchindicators/src/CLAUDE.md` — §9 Tests |
| Edit | Record the fixture band this spec reserves, alongside the existing `result_official_code` registry: `test/fixtures/agresso-staff-reconciler.fixture-spec.ts` owns the email domain `@t09-agresso.test` and the carnet prefix `T09`, writing `sec_users` / `sec_user_roles` / `app_secrets` — tables no other fixture touches. |
| Severity | Low |
| Status | pending |

> **No `trd-adr` item.** No design decision in this spec overturned an architecture decision recorded in `docs/trd/trd.md`; the spec composes existing patterns (raw-SQL repository per DD-4, one transaction per DD-5) rather than reversing any.

## Methodology upstream (no local edit owed)

**KZ-…-2** is dual-target. Its local half is P2; its methodology half is a gap in the AKILI orchestration guidance itself: *a coordinator waiting on a delegated agent's output must derive its stop condition from a measured baseline, because the dispatch mechanism echoes the brief into the same channel it monitors.* Recommend upstreaming to the AKILI methodology repository — nothing in it is specific to this project, this stack, or Antigravity beyond the example.
