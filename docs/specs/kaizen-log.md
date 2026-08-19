# Kaizen Log

Continuous-improvement record across AKILI-SPECS specs. One entry per archived spec.

---

## Active Lessons

| ID | Lesson | Severity | Recurrence | Target | Status |
| --- | --- | --- | --- | --- | --- |
| KZ-001 | A test double that doesn't render or evaluate what it stands in for produces a green suite over broken behavior. Verify the double's fidelity, not just the assertion. | **High** | 4 | Product | proposed |
| KZ-002 | Enumerating scope by a convenient proxy misses what the proxy stands in for. Enumerate by **the real thing**. **Recurred 2026-08-18** (live schema table list derived from source code: 3 of 64). **Recurred 2026-08-19** at the orchestration layer — the Leader's own finalize write marked a spec-wide *"every AC is checked"* item `[x]` while all 59 checkboxes were unflipped; "the tasks are done" was substituted for "the checkboxes are checked". | **High** | 5 | Product + Methodology | **applied** → `.agents/leader.md` §Bounding a worker's search space (2026-08-19, user-approved): grep-falsify any aggregate before flipping it. Methodology upstream pending |
| KZ-003 | Changing a component that many screens render requires a full-suite run. Targeted suites confirm the brief was followed, not that the blast radius is clean. | Medium | 1 | Product | proposed |
| KZ-004 | Executing Bug Mode without the stack's verification prerequisites installed forces a red-before/green-after waiver the methodology can't recover post-fix. Pre-flight the test command's prerequisites before the fix lands. **Recurred 2026-08-18** (`bugfix/sp-versioning-roles-id` T-01): the named verification script did not exist and the "TEST" datasource was unreachable from any script. | **High** | 2 | Product + Methodology | proposed |
| **KZ-005** | A correction sweep must bound its search space on **every axis** — phrasing, token, **file set**, and exemption criterion — not only the axis that last failed; and must re-grep any *new* value the correction introduces. **Recurred 4× in `innovation-use/data-model-and-catalog` alone** (phrasing → token → file set → exemption-by-citation). **Root cause of the recurrence identified 2026-08-19: the lesson had been standardized into `.agents/leader.md` only, while every recurrence occurred in a *worker* executing a Leader-mandated sweep.** A lesson applied to the orchestrator does not reach the agent that performs the action. | **High** | 5 | Product + Methodology | **applied** → `.agents/leader.md` (2026-08-18) **+ `.agents/implementer.md` §Correction sweeps (2026-08-19, user-approved) — the edit that closes the role gap.** Methodology upstream pending |
| **KZ-006** | A task delivering a harness, fixture, or verification mechanism needs **one end-to-end criterion**. Every per-piece check can pass while the mechanism cannot run at all. | **High** | 1 | Product + Methodology | **applied** → `docs/specs/general-setup/task.md` §*A task is NOT done until* (2026-08-18, user-approved). Methodology upstream pending |
| **KZ-007** | A brief that is locally correct in every bullet can still leave the worker's search space unbounded on the next axis down. Require a **per-unit completeness line that includes units with zero findings**, and require every claimed exemption to **quote the clause granting it**. | **High** | 1 | Product + Methodology | **applied** → `.agents/leader.md` §Bounding a worker's search space (2026-08-19, user-approved). Methodology upstream pending |

---

## Entries

### 2026-08-19 — innovation-use/data-model-and-catalog

**Metrics**

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 13 (T-03 extracted to its own spec) | `tasks.md` |
| Reviewer FAIL rework attempts | **6** — T-12 ×2, T-13 ×2, T-14 ×2 | `execution.md` |
| Escalations resolved by user ruling | 2 (T-12, T-13) | `execution.md` |
| HALTs / FATAL_FAILs / Pivots | **0** | `execution.md` |
| Judgment-day findings | **44** across 3 rounds, all ESCALATED, lineage exhausted | `design.md` §0 |
| Validation FAIL / WARN | **0 / 7** | `validation-report.md` |
| Review rounds vs budget | **13 vs 4–5 — 2.6×**, authorized, never silent | `design.md` §12, `execution.md` |

**MUDA identified:** the review-round overrun is almost entirely *defect waste* concentrated in three tasks, and all six rework attempts trace to two root causes already in this log. **Jidoka held throughout** — every FAIL stopped the line, no defect was waived, and the one attempt that ran out of road (T-14 attempt 3) passed rather than HALTing.

**Lessons**

- **KZ-005 — recurrence 4→5, and the recurrence itself is the finding.** (Product + Methodology, High)
  - Root cause: the lesson was standardized into `.agents/leader.md`, but **every one of the four recurrences happened inside a worker** carrying out a Leader-mandated sweep. The orchestrator knew the rule; the agent doing the work never saw it.
  - Evidence: `execution.md` — T-14 attempts 1–3; the Leader adjudication table under *attempt 2*.
  - Standardization: append §Correction sweeps to `.agents/implementer.md`. → **Applied 2026-08-19 (user-approved)**

- **KZ-002 — recurrence 4→5, new layer: the orchestrator's own finalize write.** (Product + Methodology, High)
  - Root cause: the Leader marked a spec-wide *"every AC is checked"* done-definition item `[x]` while all 59 checkboxes were unflipped — substituting the proxy ("the tasks are done") for the real thing. **The finalize write is the only claim in the pipeline no Reviewer audits.**
  - Evidence: commit `1753e786` (defect), `d1e57ead` (retraction), `39dd8f6c` (discharged on evidence); `execution.md` — *Leader self-correction*.
  - Standardization: grep-falsify clause in `.agents/leader.md`. → **Applied 2026-08-19 (user-approved)**

- **KZ-007 — a locally-correct brief can still leave the search space unbounded.** (Product + Methodology, High)
  - Root cause: three consecutive Leader briefs were correct in every bullet yet each bounded only the axis that had last failed — phrasing, then token, then file set — so the defect moved down one level each time. The countermeasure that finally worked was structural: a per-unit completeness line **including units with zero findings**, plus a requirement that exemptions quote their governing clause.
  - Evidence: `execution.md` — *Leader accountability* notes in T-14 attempts 1 and 2; the method section of attempt 3.
  - Standardization: append §Bounding a worker's search space to `.agents/leader.md`. → **Applied 2026-08-19 (user-approved)**

**Carried follow-up:** **C-4** — `platformSeeded` / `innovationDevRoleSeeded` in the fixture harness are structurally always `false` (dead branches). User ruling 2026-08-19: **log as follow-up for chunk 2**, which will be in those files and can verify the removal in context.


### 2026-08-18 — `bugfix/sp-versioning-roles-id`

**Outcome:** delivered and validated; **archived 2026-08-18 to `docs/specs/archive/2026-08-18-bugfix--sp-versioning-roles-id/` with three readiness gates unmet, on explicit user instruction** (T-03 `[~]`, both §7 sign-off rows open, branch unmerged; W-4 unowned). This retrospective ran *ahead* of the move, when `/akili-archive` was first blocked at that gate — Steps 3 and 4 do not depend on the merge, and the Constitution Sync had found a constitutional document stating a falsehood. **The fix has not run against the shared dev database**; the archive records a closed spec, not a shipped repair.

**What shipped:** two append-only migrations repairing `SP_versioning` (MySQL 1054, `roles_id` dropped from under it) and its mandatory companion `SP_delete_result_version` (MySQL 1451, activated *by* the first repair — RB-5), plus the repo's first disposable-MySQL harness and a committed schema-only baseline snapshot.

#### Measure

| Signal | Count | Source |
| --- | --- | --- |
| Tasks executed | 5 (T-01, T-01b, T-02, T-02b, T-03) | tasks.md |
| Reviewer FAIL / rework cycles | 1 (T-03 attempt 1 — 4 findings across 2 lenses) | execution.md → T-03 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| **Pivot records** | **3** (T-01, T-01b, T-02) | execution.md → `## Pivot Record` ×3 |
| PRODUCT_BUGs | 0 (no `/akili-test` phase — accepted, no application code changed) | validation-report.md → Test Evidence |
| Judgment Day severe findings | 0 in-spec; **the spec itself exists because of one** — chunk 1's round-3 transcription found `SP_versioning` non-executable in `main` | innovation-use/data-model-and-catalog/judgment.md |
| Validation FAIL / WARN | **2 / 11** → 2 closed, 10 closed, 1 open (W-4) | validation-report.md → Remediation Status |
| Constitution drift attributable | 6 sites (2 high) | execution.md → `## Constitution Impact` |
| Runtime (non-work) failures | 1 — Reviewer spawn died on API 529, retried; the "dead" spawn later completed | execution.md → T-03 attempt 2 addendum |
| Budget variance | tasks 5/5 · LOC ≈3,065 vs ~2,750 (**+11%**) · review rounds **5 vs 3–4** | execution.md → Document Control |

#### Learn

- **KZ-005 — A correction sweep enumerated the strings it had edited, not the claim it had changed.** (Product + Methodology, **High**)
  - **Root cause.** The T-02 Pivot's forward sweep and the B-12 advisory remediation both searched for the *literal values they had just changed*. Neither searched for every place the underlying **idea** was restated. The pivot turned a one-migration spec into a two-migration spec; "one migration" was never a string anyone grepped for, so it survived in four places — including **both Executive Summaries and a Document Control row**, the first text a merge approver reads. A reader stopping there is told to ship one migration, which the spec's own **RB-5** classifies as converting a total failure into **partial data loss**.
  - **Evidence.** `validation-report.md` → F-1 (four sites) and F-2 (`tasks.md:155` still "37 child deletes" after advisory B-12 was recorded ✅ FIXED naming only two of its three sites); `execution.md:490-492` asserts the forward sweep "All located and updated".
  - **Confirming datum.** When the remediation finally grepped for the *concept* rather than the strings, it found **six further sites nobody had named**, including a **third** stale figure (`~2,110`) that had propagated into a neighbouring spec in five places and that neither the auditor nor the Leader knew existed — they were both grepping for `~2,050`.
  - **Standardization:** added a bullet to `.agents/leader.md`'s Spec Drift / Pivot Protocol section — sweep the *claim* in every phrasing, then re-grep for any new value the correction introduces. → **Applied 2026-08-18 (user-approved)**
  - **Methodology upstream:** `/akili-specify`'s **Correction Closure** step says to grep "the superseded **value**". That word is the gap — it prescribes a string search for a conceptual problem. Recommend upstreaming to the AKILI repo.

- **KZ-006 — A harness passed every per-piece check while being unable to run at all.** (Product + Methodology, **High**)
  - **Root cause.** T-01's done-definition decomposed the harness into pieces and verified each: the module resolved to `dataSourceTarget.TEST` (proven by a falsifying sentinel), a smoke fixture passed with the container up and failed with it down, the untouched files were confirmed untouched. Every criterion passed. The harness still could not produce a schema, because **no criterion exercised the whole mechanism end to end** — and the reason it couldn't was outside every piece: 10 migrations write to `sec_template` and none of the 303 creates it (MySQL 1146). That took **two pivots** (T-01, then T-01b) to surface and resolve, and retired one done-criterion as never-achievable.
  - **Evidence.** `execution.md` → `## Pivot Record: T-01` and `## Pivot Record: T-01b`; `tasks.md:60` (criterion retired as never achievable, RB-1d); the Leader's own candidate lesson at `execution.md:148`.
  - **Distinct from KZ-004**, which is about pre-flighting a verification command's prerequisites. This one is about the **shape of a done-definition**: per-piece completeness is not mechanism completeness.
  - **Standardization:** added a bullet to `docs/specs/general-setup/task.md`'s *A task is NOT done until* list — a task delivering a harness/fixture/verification mechanism must carry one end-to-end criterion. → **Applied 2026-08-18 (user-approved)**
  - **Methodology upstream:** the same gap exists in the AKILI task template. Recommend upstreaming.

- **Recurrences (no new lesson — root cause already active):**
  - **KZ-002 → recurrence 4.** Deriving the live database's table list from source code found **3 of 64** (95% miss); caught only because the Implementer flagged its own result as unverified rather than asserting completeness. Same root cause as the original — a convenient proxy substituted for the real thing, one layer down. Evidence: `execution.md:242`, `src/db/baseline/README.md:41`.
  - **KZ-004 → recurrence 2, severity raised Medium → High.** T-01 found the design's named verification script (`migration:run`) did not exist, and the `TEST` datasource target was unreachable from any npm script. Evidence: `execution.md:105`, `:146`.

#### What went right, and is worth imitating

Recorded because a retrospective that only lists defects teaches half the lesson:

- **Every pivot stopped the line rather than working around the blocker** — *jidoka*. Each `## Pivot Record` names its trigger, argues why it is not rework, sizes the blast radius, presents costed alternatives, waits for a user ruling, then lists amendments and runs a sweep. The validation auditor called the records "exemplary"; what failed was the sweeps, not the protocol.
- **Load-bearing claims were re-derived rather than adjudicated on report** — the Leader independently verified the `sec_*` grep, the datasource route, the dump composition, the body diff, the RESTRICT-FK chain and the statement counts. That is the only reason the validation could audit the figures at all.
- **Workers overruled their briefs, correctly, three times:** the Implementer corrected the auditor's "all three documents" overstatement; it declined the auditor's "five of six" tick count because the sixth would assert T-03 was done while it is `[~]`; and a Reviewer verified `RB-B2`'s status independently after being told it was settled. All three would have been silent errors under deference.
- **`author ≠ auditor` was defended under pressure.** When a Reviewer spawn died on an API 529, the inline fallback was refused on the grounds that an infrastructure failure does not suspend a correctness constraint. When the "dead" spawn later completed, the two PASS verdicts were recorded as **asymmetric** — the second had seen a tree already containing the first's record — rather than presented as two clean confirmations.


### 2026-08-13 — `bugfix/oicr-lever-dropdowns`

**Outcome:** delivered, tester-validated (user-confirmed). Bug Mode red-before observation waived under explicit user mandate — repo had no `node_modules` during execution; functional tester validated afterward.

#### Measure

| Signal | Count | Source |
| --- | --- | --- |
| Tasks executed | 1 (T-01) | tasks.md |
| Reviewer FAIL / rework cycles | 0 (in-session) | n/a — informal execute | 
| HALTs / FATAL_FAILs | 0 | n/a |
| Pivot records | 0 | n/a |
| PRODUCT_BUGs | 0 | n/a |
| Judgment Day severe findings | 0 | n/a |
| Verification-gate waivers | 1 (red-before skipped — no node_modules) | tasks.md Execution Note |
| Validation FAIL / WARN | 0 / 2 (absent formal reports, user-validated) | archive-summary.md W-1/W-2 |

#### Lessons

- **KZ-004 — Bug Mode ran without the stack's verification prerequisites installed.** (Product + Methodology, Medium)
  - Root cause: the worktree had no `node_modules` when `/akili-execute` ran, so the mandatory Bug-Mode red-before observation and the full-suite green-after gate could not be run. The fix was applied blind under explicit user mandate; the red-before evidence is non-recoverable post-fix.
  - Evidence: `tasks.md` Execution Note (waiver under user mandate 2026-08-13); `archive-summary.md` W-1.
  - Standardization (Product): add one line to `AGENTS.md` Working Conventions — *"Before any verification gate (`npm test` / `npm run lint`), confirm `node_modules` is installed in the target package; a worktree without deps forces a Bug-Mode red-before/green-after waiver."* → **Deferred (Medium severity, no High — apply on next spec or on user approval).**
  - Standardization (Methodology): propose upstream that `/akili-execute` (and `/akili-specify`'s testing strategy) pre-flight-check the verification command's prerequisites and surface the gap **before** the fix lands, so the red observation is never skipped post-hoc. → **Recorded for upstreaming to the AKILI methodology repository.**

### 2026-07-28 — `results-center/external-results-readonly-view`

**Outcome:** delivered, validated PASS (0 FAIL, 4 WARN). 16 of 17 tasks done; T-11's browser-only ACs remain open on an environment blocker.

#### Measure

| Signal | Count |
| --- | --- |
| Reviewer FAIL / rework cycles | 8 |
| HALTs (3-attempt ceiling reached) | 1 (T-04, recovered on a 4th attempt) |
| Pivot records | 0 |
| Judgment Day SEVERE findings (pre-code) | 3 |
| Scope gaps discovered mid-execution | 2 (T-10 → R-RC-013, T-11 → R-RC-014) |
| Requirements added after approval | 3 (R-RC-012, R-RC-013, R-RC-014) |
| `PRODUCT_BUG` findings | 0 |
| Validation | PASS / 0 FAIL / 4 WARN |
| Regression introduced and repaired within the spec | 1 (T-05 → T-16, 219 tests) |

Not a clean run. Notably, **all three requirements added after approval came from evidence produced by the process itself** — a design review, a verification task, and a failed sweep — not from changing minds.

#### Learn

**KZ-001 — Test doubles that don't render what they stand in for. (High, recurrence 4, Product)**

Four distinct instances in one spec:
- `execution.md` → T-03: `isEditableStatus` is a `computed()`; under plain `jest.fn()` mocks it has no signal dependencies, so it caches after the first read. A loop reading it 15 times on one instance made **14 of 15 assertions vacuous**. Caught only by mutation testing.
- `execution.md` → T-14: the AC.4 tests asserted on `routerMock.navigate`, but the component never injects `Router` and `RouterLink` navigates via `navigateByUrl` — absent from the mock. No test in the file called `detectChanges()`.
- `execution.md` → T-15: `StubSelectComponent` had `template: ''`, so projected `#rows` content never instantiated. A gap survived **two** rework rounds behind it.
- `test-report.md` → §2 gap 3: the **entire** `results-center-table` suite runs under `overrideComponent({ template: '' })`; no test exercised the real `[routerLink]`.

*Root cause:* the fidelity of the test double to the real component was never itself checked. In each case the assertion was reasonable; the substrate it ran on could not express the behavior under test.

**KZ-002 — Feature-scoped enumeration misses the shared shell. (High, recurrence 3, Product)**

- `execution.md` → `## T-11 Result: FAILED`: the spec enumerated 12 tabs + `result-sidebar` + `form-header` and missed `section-header`, `submission-history-item`, and the shared `oicr-form-fields` — 5 ungated controls, including **Delete Result available to any admin on a federated record**.
- Within T-15 the enumeration then grew 4 → 6 → 8 controls plus a projected icon across three attempts.
- `execution.md` → `## Scope Gap: T-10`: `my-latest-results` was fenced out on a technically-true but irrelevant basis.

*Root cause:* scope was drawn by directory (`pages/result/pages/*`), while the user-visible surface is drawn by route — `platform.component.html` renders a shared header above every page, and shared `custom-fields/*` components render inside every tab.

**KZ-003 — Shared-component changes need a full-suite run. (Medium, recurrence 1, Product)**

`execution.md` → `## T-16`: T-05 added a `cache.isExternalResult()` call to `FormHeaderComponent`, which all 12 tabs render. That batch was verified with 7 targeted suites and reported green; **219 tests across 5 suites** were broken and went unnoticed until a later full run.

*Root cause:* verification scope was set by the brief's file list rather than by the changed component's blast radius. Compounding factor worth recording: that batch was also the one whose adversarial Reviewers were lost to a session limit, so Leader verification confirmed *the brief had been followed* — it could not surface that the brief itself was too narrow.

#### Standardize

Three minimal edits proposed; **pending user approval** (see the archive report's approval menu). No edit outside this log has been applied.

| Lesson | Proposed edit | Home |
| --- | --- | --- |
| KZ-001 | Add to *Tests inside `src/`*: "When a spec stubs a child component, assert the stub renders/evaluates what the real one does (projected content, host bindings) — or use the real component. A stub with `template: ''` cannot prove anything about projected controls." | `client/research-indicators/src/CLAUDE.md` |
| KZ-002 | Add to the requirements template's scope guidance: "Enumerate the affected surface by *what renders on the route*, not by the feature folder — include the shared shell and shared field components." | `docs/specs/general-setup/requirements.md` |
| KZ-003 | Add to *Tests inside `src/`*: "If a change touches a component rendered by many screens, run the full suite before reporting — targeted suites cannot see the blast radius." | `client/research-indicators/src/CLAUDE.md` |

**Methodology observation (no local edit; candidate for upstreaming to AKILI):** when the adversarial Reviewer step is lost (session limit, tooling failure), Leader self-verification is a weaker substitute in a specific and predictable way — it checks that the brief was satisfied, not whether the brief was sufficient. KZ-002 and KZ-003 both materialized in the one batch that ran without a Reviewer. A methodology-level guard ("if the Reviewer step cannot run, mark the batch and re-review before merge") would have caught both earlier.

#### What worked, and is worth keeping

- **Judgment Day before any code** paid for itself: it caught a factually wrong premise in the proposal and converted a deferred "optional" item into a blocking requirement that protected the spec's own headline feature.
- **Mutation testing as the standard of proof** for any doubted test. Every gap listed in KZ-001 was closed with a red-then-green demonstration, and reviewers were asked to reproduce them independently.
- **Asking reviewers to verify their own prior assertions** rather than carry them forward — during T-15 this caused the Reviewer to reverse an earlier remediation of its own that turned out to be wrong.
