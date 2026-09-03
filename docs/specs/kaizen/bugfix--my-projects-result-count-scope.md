# Kaizen Entry — bugfix/my-projects-result-count-scope

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/my-projects-result-count-scope` |
| Date | 2026-09-02 |
| Branch | `FIX-My-contracts-2026` |
| Branch Context | **spec branch** — default is `main`, resolved via `origin/HEAD` (no `Default Branch:` pin in the root guides) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (2 done, 1 waived) | `tasks.md` |
| Reviewer FAIL rework attempts | **0** — PASS on attempt 1 | `execution.md` — T-01 |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` |
| PRODUCT_BUGs | n/a — no `test-report.md` (Bug Mode ships tests with the fix) | — |
| Judgment-day severe findings | round-1 **8 confirmed (3 severe)** · re-judge-1 **9 fix-caused (1 severe)** · re-judge-2 **5 remaining (0 severe)** · terminal ESCALATED **on count** | `judgment.md` §9 |
| Validation FAIL / WARN | **0 / 6** (all 6 pre-declared) | `validation-report.md` |
| `/akili-quick` escalations into this spec | none | `docs/specs/quick/quick-log.md` |
| Drift attributable to this spec | **none** — 0 hits for `count_results` / `contract_total_results` / `find-contracts` | `docs/specs/drift-report.md` |
| **MUDA — extra round trips beyond the plan** | **2** — one post-PASS correction round the Leader initiated, plus one re-dispatch when that round's report was false | `execution.md` — Post-PASS scope correction |

**Jidoka held.** The line stopped at the right moments: the tests were kept red on `HEAD` before any
production edit, the budget tripwire fired and escalated rather than absorbing the overage, and the false
correction report was caught and re-dispatched instead of being accepted.

**Note on the zero.** Zero Reviewer rework is the headline metric, but it does not mean a frictionless run:
the two extra round trips above were both *downstream of a Leader decision*, not of the Implementer's work.
Counting only Reviewer FAILs would have recorded this as a clean run, which it was not.

## Lessons

- **KZ-bugfix--my-projects-result-count-scope-1 — A traceability comment placed inside generated output becomes part of the product.** (Product + Methodology, **Medium**)
  - **Root cause:** `/akili-execute` Step 3.4 mandates `// @akili-spec <spec-path>` references "in critical or complex codebase additions" and says nothing about *where the addition ends up*. The Leader's brief named the `result_counts` subquery as the anchor — which sits **inside a SQL template literal** — so the comment was emitted to MySQL on every `find-contracts` request. Three consequences no gate could see: a `namedPlaceholders` fault waiting on any future `?` or `:word` in the prose (`orm.config.ts` sets `namedPlaceholders: true`, and the unit suite mocks `query()`); `--` being newline-terminated, so any future whitespace normalization truncates the query there; and documentation prose coupled to a live test gate — TS-5's whole-string `not.toMatch(RE_USER_TOKENS)` went red because the first wording contained the literal `created_by`.
  - **Evidence:** `execution.md` — *Post-PASS scope correction* and *Issues encountered*; `validation-report.md` §7 (Risk lens) and §8 (disclosed drift).
  - **Cost:** 1 false test red + 2 correction round trips + 3 advisories, all from a one-line placement choice.
  - **Smallest rule that would have prevented it:** traceability references go in code, never inside a string that is sent to another system.
  - **Standardization:** → **P1** (local), and upstream to `/akili-execute` Step 3.4.

- **KZ-bugfix--my-projects-result-count-scope-2 — A task gated behind a deployment cannot own an acceptance criterion that requires pre-deployment state.** (Product + Methodology, **Medium**)
  - **Root cause:** `tasks.md` T-02 carries `Dependencies: T-01 deployed to Dev`, and its step 4 requires comparing `metadata.total` "against a pre-deploy capture". The dependency **destroys the criterion's own precondition**: by the moment the task became eligible to run, the state it had to measure no longer existed. Nothing in the task flagged the ordering trap, and the disqualifier list warned only about the *quality* of a baseline ("a different environment or a different page size"), never about failing to take one in time. R-MPC-002 AC.3 is now permanently unverifiable for this deployment — the fix is almost certainly correct on that axis (the visibility mechanism is byte-identical), but "almost certainly" is what the criterion existed to replace.
  - **Evidence:** `tasks.md` T-02 (`Dependencies` + step 4 + done-check box 2); `execution.md` — *T-02 Step 4 — row-set baseline: NOT VERIFIABLE, declared gap*.
  - **Smallest rule that would have prevented it:** a criterion needing before/after state names its capture as a **precondition of the task it depends on**, not as a step of the task that follows it.
  - **Standardization:** → **P2** (local), and upstream to the same template rule.

## Noted, not a lesson

- **Test LOC overage — 171 against a ~110 budget.** Worked exactly as designed: the Implementer disclosed rather than absorbed it, the tripwire fired, the Leader escalated, the user accepted at the gate. No lesson; a mechanism functioning.
- **The Leader asserted "10 insertions" where git reports 9.** Caught by an auditor that had *no git access* and derived 9 by reading the file. Sub-threshold on its own; feeds the recurrence check for **KZ-008** ("a derived map labelled verified will be trusted while wrong") — the figure was written from memory of the diff rather than from `--numstat`.
- **T-02 substituted the search box for the prescribed `contract-code` filter** without recording the substitution. Defensible on the merits (the same mechanism on both tabs is arguably the better parity test) but it is the root cause of the B-6 finding. Folded into `execution.md` as E-8.
- **KZ-013's backward sweep ran and caught 9 dead pointers** — the nine `@akili-spec` comments in the two changed source files. Recorded as **P6**, not a lesson: KZ-013 already exists, is marked `Applied`, and *held* this cycle — the sweep it mandates is what found them. That is the lesson working, not recurring.
- **The CodeGraph guide line is accurate at the main checkout and misleading from a worktree** — this entire spec ran in a worktree with no index of its own, while a 201 MB index lives at the main checkout. Recorded as **P5** (`factual-sweep`) rather than a lesson, since the root cause is a stale sentence, not a process defect. Note the root guide already warns that this exact line "has drifted twice"; the probe it recommends is what surfaced this.

## Pending Items

Every item below is **recorded, not written** — Branch Context is a spec branch, so no shared file was touched.
They await the apply phase on `main`.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `server/researchindicators/src/CLAUDE.md` |
| Edit | `@akili-spec` traceability references belong in TypeScript comments, **never inside a SQL template literal** — a `--` comment there is transmitted to MySQL on every request, is newline-terminated (so any later whitespace normalization truncates the query), and couples documentation prose to any test that scans the whole generated string. Anchor the reference above the statement that builds the SQL, not inside it. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` |
| Edit | When an acceptance criterion compares state **before and after** a change, the capture of the "before" is a precondition of the task that *causes* the change — never a step of the task that verifies it. A verification task gated behind a deployment cannot own a criterion the deployment destroys. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-007` |
| Edit | Add this spec as a source and raise recurrence to **3**: an Implementer reported two instructed changes complete when neither had landed — it had added a comment without the paired delete and reverted no whitespace — and **its own pasted diff contradicted the claim in the same report**. Its stated root cause: it checked the diff hunk visually and "misread 'no `+`/`-` on adjacent context lines' as proof". Caught only by grepping the artifact instead of reading the report. |
| Severity | High (raised from High — recurrence, not severity) |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-017` |
| Edit | Add this spec as a source with **two** new instances, both surviving 2 judgment rounds across 4 dispatches *and* a Reviewer PASS before an independent auditor found them: (1) `/\bAND\b/g` is case-sensitive while `requirements.md` DC-1b promises the gate reddens "however spelled" — and lowercase SQL already exists five lines away in the same method; (2) the DC-6 sort-order closure was argued from `contract_total_results DESC` while the emitted clause was `ORDER BY _query_relevance DESC, contract_total_results DESC`, so the argument reasoned about a key that was not the primary one and holds only by a relevance tie the record never established. |
| Severity | High (raised from High — recurrence) |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` — the CodeGraph bullet in §4.3 |
| Edit | Add: a **git worktree has no `.codegraph/` of its own** — the index lives only at the main checkout (probed 2026-09-02: 201 MB `codegraph.db` there, absent in the worktree this spec was built in). From a worktree, pass the main checkout path as `projectPath`, or accept that `codegraph_*` lookups are unavailable and explore by file. |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `agresso-contract.repository.ts` (2 refs) and `agresso-contract.repository.spec.ts` (7 refs) |
| Edit | Repoint the nine `@akili-spec docs/specs/bugfix/my-projects-result-count-scope` comments to `docs/specs/archive/2026-09-02-bugfix--my-projects-result-count-scope`. The archive move made all nine dead pointers — the exact failure **KZ-013** names, found by running its mandated backward sweep. Comment-only change; no logic, no test impact. |
| Severity | Low |
| Status | pending — **offered to the user at the archive report**; a one-command `sed` closes it |

### Not owed

| Step 3 item | Result |
|---|---|
| `guide-sync` | **None owed.** No module created or reshaped, no boundary moved, no public surface renamed — field names unchanged, only the value widens. `execution.md` carries no `## Constitution Impact` block, correctly |
| `trd-adr` | **None owed.** No `## Pivot Record` in this spec, and no `design.md` decision overturned a recorded ADR |
| `family.md` | **Not applicable.** Not a parent (no `family.md`) and not a child (no `Parent Spec:` row); no manifest anywhere lists this spec |

## Upstream to the AKILI methodology repository

Both lessons are **dual** — each fixes this project and names nothing project-specific:

| Lesson | Upstream target |
|---|---|
| KZ-…-1 | `/akili-execute` Step 3.4 — the traceability-comment mandate needs "never inside generated output (SQL, templates, anything sent to another system)" |
| KZ-…-2 | `docs/specs/general-setup/task.md` — the before/after-capture ordering rule, as written in P2 |
