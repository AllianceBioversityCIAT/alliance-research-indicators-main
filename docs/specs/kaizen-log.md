# Kaizen Log

Continuous-improvement record across AKILI-SPECS specs. Newest entry first.

> **Two ID series, both live.** `K-00n` and `KZ-00n` were assigned independently on parallel branches before they met here. They are **not** renumbered: every citation already in the guides, specs and commit messages resolves as written, and renumbering would silently break that trail to buy nothing. New lessons continue whichever series their spec line already uses.

---

## Active Lessons

| ID | Lesson | Severity | Target | Recurrence | Status |
| --- | --- | --- | --- | --- | --- |
| **K-004** | **A gate must be proven able to FAIL before it is trusted** — and the sharpest form is not "never run red" but **"no input in the suite CAN make it red."** A guard written correctly against `all` survived mutation to `slice` because every fixture set `all === slice`: correct code, decorative gate | **High** | Methodology | **5 gates** | Proposed (upstream) |
| **K-007** | **A fixer is not a gate, and a delegated worker still needs the fixer.** Banning `npm run lint` as a gate (K-001) does not justify banning `prettier --write`: it produces a file and measures nothing, so it cannot contaminate evidence. Forbidding it while requiring formatted output removes the tool that solves the problem, then fails the worker for the problem | **High** | Product + Methodology | 1 (**3 failures in one run**) | **Institutionalized** (root `CLAUDE.md` §4.3) |
| **K-008** | **Writing a coverage table does not make it exhaustive.** A clause-level traceability table authored specifically to stop requirement clauses shipping unowned still missed one, because the same pass authored both the requirements and the table — nothing independent checked that every clause appears | **Medium** | Methodology | 1 | Proposed (upstream) |
| **K-005** | Config values the code uses as **discriminators** (branch selectors), not just destinations, must never be collapsed onto one value "to simplify" | **High** | Product | 2 (same edit) | Proposed |
| **K-002** | A tier can be certified "green" while being type-checked by nothing at all; test-runner green ≠ compiles | **High** | Product | 1 | **Institutionalized** (client `CLAUDE.md`) — **needs a factual correction, see 2026-08-13 C2 entry** |
| **K-003** | Correction-closure sweeps must grep the **literal superseded string**, then re-grep to confirm — semantic greps miss their own target | **High** | Methodology | **6** (3 in C1, 3 in C2) | Proposed (upstream) |
| **KZ-001** | A test double that doesn't render or evaluate what it stands in for produces a green suite over broken behavior. Verify the double's fidelity, not just the assertion | **High** | Product | 4 | Proposed |
| **KZ-002** | Enumerating scope by feature folder misses shared components rendered on the same route. Enumerate by *what renders*, not by *where the feature lives* | **High** | Product | 3 | Proposed |
| **KZ-003** | Changing a component that many screens render requires a full-suite run. Targeted suites confirm the brief was followed, not that the blast radius is clean | Medium | Product | 1 | Proposed |
| **KZ-004** | Executing Bug Mode without the stack's verification prerequisites installed forces a red-before/green-after waiver the methodology can't recover post-fix. Pre-flight the test command's prerequisites before the fix lands | Medium | Product + Methodology | 1 | Proposed |

> **K-001 and KZ-001 are the same failure seen from two tiers** — a verification artifact that cannot report the thing it stands for. K-004 and KZ-003 likewise both say a green result only covers what its author modeled. Worth collapsing when either series is next revised; kept distinct here so no existing citation breaks.

---

## Entries

### 2026-08-14 — `bilateral/clarisa-project-automapping` (S1)

**Outcome:** 6 of 7 tasks delivered with independent Reviewer PASS; T-06 HALTed after 6 attempts. 2173 tests passing. The D8 reading — the stage's actual deliverable — was taken against DEV over VPN. Orchestrated through Orca with `agy`/gemini-3.7-flash-high as Implementer and Claude Opus as Reviewer, giving an `author ≠ auditor` split that crosses **providers**, not just tiers.

#### Measure

| Signal | Value |
| --- | --- |
| Orca dispatches | 18 |
| Task-attempts failing first pass | **7 of 11** |
| Reviewer FAIL verdicts | 4 |
| HALTs | 1 (T-06) · Pivots 0 · PRODUCT_BUGs 0 |
| Budget tripwire | **1 — fired, escalated, user ruled the estimate wrong** (~680 → ~3000 LOC) |
| Judgment-day severe findings | 5 (all applied) |
| Leader errors recorded | 3 |

#### Learn

**K-004 → recurrence 5, with its sharpest form yet.** T-04's availability guard was written *correctly* against the full feed. No reviewer reading the code would have objected. But every fixture set `all === slice`, so mutating the guard to the slice left **all 11 tests green** — the gate protecting this spec's headline behavior (R-CPA-005) could not fail for the reason it existed. The distinction worth institutionalizing: "was this gate ever seen red?" is weaker than **"can any input in this suite make it red?"** The finding came from mutation, not from reading.

**K-007 — the fixer/gate conflation (NEW, and self-inflicted).** The Leader's briefs banned all measurement commands to honor the concurrency rule, sweeping `prettier --write` in with `npm test`. But a formatter *produces a file*; it measures nothing and cannot contaminate parallel evidence. The result: workers were denied the tool that fixes formatting and then rejected for unfixed formatting — **three of this run's failures**. K-001's real content is *fixing and verifying must be separate acts*, and it was applied one notch too broadly.

**K-008 — a coverage table is not self-exhaustive (NEW).** `tasks.md` §3 carried a clause-level table written specifically so that no requirement clause could ship unowned. It still missed R-CPA-005's `description` sentence, which reached the working tree uncovered until T-04's Reviewer flagged it as a cross-task carry-forward. Root cause: the same authoring pass produced the requirements *and* the table, so nothing independent verified that every clause appeared in it.

#### Standardize

| Lesson | Action |
| --- | --- |
| K-007 | **Applied** — root `CLAUDE.md` §4.3 now states *worker may fix, Leader verifies, no single command may do both* |
| K-004 | Upstream to AKILI (Methodology) — recurrence raised to 5 |
| K-008 | Upstream to AKILI (Methodology) — no local edit |
| — | **Factual sweep applied:** three registry claims in root `CLAUDE.md` were false. `agy` **is** installed (the line said it was not, which would have ruled the host out unexamined); `glm-5.2` exists (registry said 5.1); OpenCode is installed but blocked by **account balance**, not configuration |

**A false correction avoided.** The CodeGraph line was suspected stale too — `.codegraph/` holds only `config.json`. It was **tested rather than corrected**: `codegraph_explore` resolved 48 symbols including the service created that same day, with blast radius. The claim is accurate. Correcting it would have introduced the very defect this sweep exists to remove.

#### Record — what the run proved about the method

The three most valuable findings all came from review asking *"what would make this red?"* rather than from any test: a decorative gate, an unauthorized third query parameter published by Swagger, and a documented DTO field the endpoint could never return. All three were **contract- or evidence-level defects sitting on top of correct code** — precisely the class a passing suite cannot surface.



### 2026-08-13 — post-archive findings, `bilateral/primary-contributing-sp`

Two defects found in local verification **after** the spec was archived. Both were reachable from the archived spec's own stated gaps; neither was caught by any gate.

**K-006 — an artifact no gate executes is an artifact nobody has verified.** Migration `1784500000000` (from C1, `toc-optional-mapping`) shipped with `[SPEC:bilateral/…]` inside a **SQL comment**. `orm.config.ts:59` sets `extra.namedPlaceholders: true`, so mysql2 rewrites queries through `named-placeholders`, which skips quoted strings but has **no notion of SQL comments** — the colon is consumed as a bind parameter and, with no params argument, the call throws before MySQL parses it. The migration was **unrunnable from the day it was written** and passed every gate the repo has: valid TypeScript, lint-clean, type-clean, reviewed, committed. The merge to `dev` would have failed in CI/CD. It surfaced only when the migration was finally executed.

*Root cause:* every gate in the repo inspects migrations as **text**; none executes one. The one property that matters — does it run — was unmeasured.
*Evidence:* two `migration:dev:execute` failures, 2026-08-13; `named-placeholders/index.js:6`.

**The corollary, learned the expensive way.** A static scanner was written to substitute for the missing dynamic gate, and it was wrong **three times**: it first assumed quoted strings were the hazard (they are the safe place); then it reimplemented the tokenizer and missed that a bare **`?`** binds too — passing the very migration that then failed for real, *after* being "verified able to fail" against a fixture built from the same wrong model; then, corrected to call the real tokenizer, it flagged **230** hazards in migrations proven to run, because it never inspected whether the call site passes a params array (`1781879906673-AddNewEnvCl.ts` uses `?` legitimately). Withdrawn.

*Lesson:* a K-004 failure demo only proves the gate catches **what its author already modeled**. When a gate's correctness depends on reimplementing a dependency's parser *and* its call-site contract, the honest gate is to run the thing. **K-004 recurrence → 4.**
*Standardized:* server `CLAUDE.md` §7 — the rule, plus the statement that running migrations is its only sound gate.
*Target:* **Product.**

**D-6 materialized — the cross-tier gap the spec declared and left open.** `requirements.md` listed *"D-6 (cross-tier drift — partial)"* among items "uncovered by construction". R-BIL-128 AC.1 narrowed the client to one ToC block (the Primary's), but `pool_funding_alignment_validation` still demanded a ToC row for **every** active SP — so with 2+ SPs the green check was unreachable, since the UI offers no way to answer for a Contributing SP. The function is named in **none** of the spec's seven documents.

*Lesson, folded into K-003's family rather than numbered separately:* a spec that renames or re-scopes a concept must grep for that concept **outside its own tier** — here, one grep for the validating function would have found it.
*Fixed:* `1786679227000`, with a legacy fallback (no backfill per R-BIL-126). Blast radius measured against the live function over all 23 Dev alignments answered "Yes": recomputed-current reproduces `live_fn` on 23/23, proposed differs on exactly 1 — the intended flip.

---

### 2026-08-13 — `bilateral/primary-contributing-sp` (C2)

**Outcome:** 16 tasks, 7 commits, all requirements delivered. **0 HALTs.** `/akili-test` and `/akili-validate` **not run** — absence explicitly accepted at the archive gate. T-02 archived `[~]` with one item dischargeable only by a deploy.

#### Measure

| Signal | Value |
| --- | --- |
| Reviewer FAIL verdicts | **3** (T-08, T-13, T-16) |
| Rework attempts consumed | **2 of a possible 48** — T-08 ×1, T-16 ×2 |
| HALTs / FATAL_FAILs | **0** |
| Pivot Records | **2**, both user-approved, both for defects in the *approved spec* |
| Budget breaches | **2** — T-13 894 vs ~180 (4.75×); T-16 739 vs ~400. **Both escalated and accepted, neither absorbed silently** |
| Validation verdict | **not run** (accepted risk) |
| Leader errors caught by review or by the user | **6** |

**Notable:** the rework rate collapsed versus C1 (2 attempts across 16 tasks, vs C1's 6 FAILs across 10). The controls that produced that are named under *What went right*.

#### Learn

**K-004 — a gate must be proven able to FAIL before it is trusted.** This spec found that **three** mandated gates in this repo could not go red for the reason they were mandated:

| Gate | Why it could not fail |
| --- | --- |
| `npm run lint` | it is `eslint --fix` — it makes the thing it checks true (**this is K-001**) |
| `npm run build`, for spec files | `tsconfig.build.json` excludes `**/*spec.ts` — it type-checks **zero** of them |
| `npx tsc -p tsconfig.spec.json --noEmit` | two pre-existing `TS1005` **syntax** errors aborted the parse, suppressing semantic diagnostics across ~1300 files: it reported **3** errors where **945** existed |

*Root cause:* gates are adopted **by name**, and nobody runs the one experiment that would expose a hollow one — break the thing on purpose and confirm the gate goes red.
*Evidence:* `archive-summary.md` → "Three mandated gates"; T-08 and T-14 review findings. Gate 3 repaired by T-16.
*Target:* **Methodology** — K-001 is one member of this family, not the family itself. Recommend upstreaming as a rule: *a verification command may not be cited as evidence until it has been observed failing.*

**K-005 — configuration values that act as discriminators must not be collapsed.** Rewriting the client's local `environment.ts`, the Leader set `mainApiUrl`, `textMiningUrl`, `documentOverviewUrl`, `fileManagerUrl` and `saveErrorsUrl` all to `http://localhost:3000/api/` "to simplify local". The code does not treat them as destinations — it **branches on them**:

- `jwt.interceptor.ts:52` does `req.body as FormData` + `.set()` for any URL matching `textMiningUrl`. On a GET, `body` is `null` → **every API call threw before leaving the browser**. 33 console errors, zero requests reaching the server, an empty screen.
- `api.service.ts:989` POSTs every client error to `saveErrorsUrl` as its base → each error POSTed to `/api/`, 404'd, and surfaced as a toast **which then reported itself**.

*Root cause:* values read as "just URLs" were in fact branch selectors; in production they are genuinely different hosts, which is what kept the branches disjoint.
*Evidence:* `client/.../environment.ts` comments; `jwt.interceptor.ts:52`; `api.service.ts:989`.
*Target:* **Product**.

**K-003 recurrence raised to 6.** Three more confident negatives asserted without the grep that would settle them: T-08's Seam 1 premise (`user` "feeds eligibility" — the parameter is `_user`, never read), T-13's *"no migration in this repository creates `results`"* (one grep disproves it), and a T-16 comment declaring a gap open **in the same diff that closed it**. Every one caught by an independent reader, never by the author.

#### Standardize

| Lesson | Proposed minimal edit | Status |
| --- | --- | --- |
| K-004 | Root `CLAUDE.md` §4.3 — a verification command may not be cited as evidence until it has been observed **failing** | *(see Step 4.3 menu)* |
| K-005 | `client/research-indicators/src/CLAUDE.md` — record that several `environment` URLs are branch selectors, not just destinations | *(see Step 4.3 menu)* |
| K-002 | **Factual correction:** the client CLAUDE.md block is now stale on three counts — the test count (6,239 → 6,267), *"`npm run build` is the only client type gate"* (false since T-16 repaired `tsc -p tsconfig.spec.json`, baseline **945**), and *"gitignored with no committed template"* (false — `environment.example.ts` is committed) | *(see Step 4.3 menu)* |
| K-003 | No local edit — Methodology, for upstreaming | Recorded |

#### What went right, worth preserving

- **Executed sabotage replaced claimed verification, and it paid immediately.** Where a report said *"verified by inspection"*, the next Reviewer executed it — and twice the inspection had been optimistic. The decisive catch of the run came from **deleting a line and watching 108/108 stay green**: `isDirty()`'s Primary clause, whose absence makes a Primary-only edit unsaveable. It would have shipped under a fully green suite.
- **Falsifying a premise beats satisfying it.** T-13's brief was written against a `TEST` datasource that turned out to be unreachable; the pre-check caught it *before* the Implementer spawned, and the task ran against an isolated container of the **same engine version** instead.
- **The trap gate was not the obvious test.** "Second active `PRIMARY` rejected" stays green under the `CONCAT` trap; the real gate is "N active `CONTRIBUTING` accepted". Assumed gates and proven gates are different things — the same lesson as K-004, from the other end.
- **Budget breaches were escalated, not absorbed.** Both times the estimate was ruled the defective artifact, with reasoning, on the record.

---

### 2026-08-13 — `bilateral/toc-optional-mapping`

**Outcome:** 10 tasks, 13 commits, all requirements covered. `/akili-test` PASS. `/akili-validate` **FAIL** (evidence trail, not code). Not archived clean — gaps explicitly accepted.

#### Measure

| Signal | Value |
| --- | --- |
| Reviewer FAIL verdicts | 6 |
| Pivot Records | **2** — both for defects in the *approved spec*, not the implementation |
| HALTs / FATAL_FAILs | 0 |
| Rework attempts consumed | 0 of 3 on 8 tasks; 1 of 3 on T-06 and T-10 |
| Validation verdict | FAIL — 8 must-close items |
| **Budget breach** | **1,719 insertions vs ~530 estimated (3.2×)**; review rounds ≥14 vs 10. **`design.md` §9 required escalation; none was raised** |
| Leader errors caught by the panel | **3** (D8 false strike; two failed closure sweeps) |

**Notable:** the two Pivots and all three Leader errors were caught by *independent review*, not by the Leader. The review panel was the load-bearing control in this run.

#### Learn

**K-001 — `npm run lint` is `eslint --fix`, so it cannot verify.** Every "lint clean" report across ~10 tasks was an artifact: the command rewrote the working tree and exited 0, while the **committed branch failed Prettier** from T-04 onward. Undetected for the entire run; found only by independent validation feeding `HEAD` content through `eslint --stdin`.
*Root cause:* a verification gate whose action mutates the artifact it checks.
*Evidence:* `validation-report.md` F-2; remediation commit `2de57099`.
*Target:* **Product**.

**K-002 — the client tier was certified green without any type-check.** Client Jest runs `isolatedModules: true` (no type-checking) and the flat ESLint config ignores `*.spec.ts`. So **6,239 passing tests coexisted with a client build that fails `TS2345`**. The spec *recorded both facts itself* (T-07 advisory A-1; T-10's lint caveat) and stopped one inference short of the conclusion they force. `build` appears in no verification matrix.
*Root cause:* suite-green treated as compile-green; no gate distinguished them.
*Evidence:* `validation-report.md` FAIL-2.
*Target:* **Product**.

**K-003 — correction-closure sweeps failed three times in one spec.** After each Pivot the sweep reported *"every surviving instance corrected"*; each time instances survived (six after the first, three after the second, one after the third). One survivor, `execution.md:352`, **directly contradicted the corrected record 75 lines below it in the same file**.
*Root cause:* semantic/pattern greps miss the literal target — one reviewer's own filter excluded lines containing "false", which is the word inside *"returning `false`"*. Compounded by reporting closure without re-grepping.
*Evidence:* T-06 audit findings; `validation-report.md` F-1.
*Target:* **Methodology** — AKILI's *Correction Closure* rule says grep the superseded **value**; the lesson is grep the **literal string** and **re-grep to confirm**. Recommend upstreaming.

#### Standardize

| Lesson | Proposed minimal edit | Status |
| --- | --- | --- |
| K-001 | `server/researchindicators/src/CLAUDE.md` §11 — note `npm run lint` is `eslint --fix` and **cannot** verify; use `npx eslint` (no `--fix`) as the gate | **Awaiting approval** |
| K-002 | `client/research-indicators/src/CLAUDE.md` — record that tests are neither linted nor type-checked (`isolatedModules: true`, ESLint ignores `*.spec.ts`), so `npm run build` is the only client type gate | **Awaiting approval** |
| K-003 | No local edit — Methodology lesson for upstreaming to the AKILI repo | Recorded |

#### What went right, worth preserving

- **`author ≠ auditor` was the load-bearing control.** Every substantive defect — two undischargeable ACs, duplicate-coverage-as-new-proof, and all three Leader errors — was found by an independent reviewer.
- **The two structural discharges are a reusable pattern:** unchanged-artifact argument + falsifiable lapse condition + a binding prohibition on naming tests as though they proved the discharged half. Independently re-derived and upheld at validation.
- **Pivots cost zero rework attempts**, as designed. Both spec defects were caught before burning the 3-attempt ceiling.

---

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
