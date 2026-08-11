# Kaizen Log

Continuous-improvement record for this project, updated automatically by
`/akili-archive` (Kaizen Retrospective, powered by the `kaizen` skill).
Other AKILI commands read only the `## Active Lessons` table below —
keep it at 10 rows or fewer.

---

## Active Lessons

| ID | Lesson | Source Spec | Severity | Target | Standardized In | Status |
| --- | --- | --- | --- | --- | --- | --- |
| KZ-004 | A fixture whose N units are built from identical defaults cannot distinguish per-unit scoping from a batch-wide bug. Vary at least one discriminating field per unit. | results/capdev-bulk-upload-notification | **High** | Product + Methodology | `docs/specs/general-setup/task.md` §5 | **Applied** |
| KZ-005 | A rule that lives only in a test is a requirement gap, not coverage. Escalate it as an open decision; never let the test stand as the rule. | results/capdev-bulk-upload-notification | **High** | Product + Methodology | `docs/specs/general-setup/requirements.md` §3 | **Applied** |
| KZ-006 | Sweep the claim, not the citation. A correction's grep pattern must come from the claim being corrected (`/v1`), not the citation that surfaced it (`api/v1`). | results/capdev-bulk-upload-notification | Medium | Product + Methodology | `docs/specs/general-setup/requirements.md` §3 | **Applied** |
| KZ-001 | A test double that doesn't render or evaluate what it stands in for produces a green suite over broken behavior. Verify the double's fidelity, not just the assertion. | results-center/external-results-readonly-view | **High** (recurrence 4) | Product | `client/research-indicators/src/CLAUDE.md` | **Applied 2026-08-11** |
| KZ-002 | Enumerating scope by feature folder misses shared components rendered on the same route. Enumerate by *what renders*, not by *where the feature lives*. | results-center/external-results-readonly-view | **High** (recurrence 3) | Product | `docs/specs/general-setup/requirements.md` §1 | **Applied 2026-08-11** |
| KZ-003 | Changing a component that many screens render requires a full-suite run. Targeted suites confirm the brief was followed, not that the blast radius is clean. | results-center/external-results-readonly-view | Medium | Product | `client/research-indicators/src/CLAUDE.md` | **Applied 2026-08-11** |

> **KZ-001 and KZ-004 are the same family, deliberately kept separate.** KZ-001 is about a **double's fidelity** — the substrate cannot express the behavior. KZ-004 is about a **fixture's discriminating power** — the substrate is fine, but the data cannot tell a correct implementation from a broken one. Both end in an assertion that could not have failed. **If a third variant appears, merge them into one lesson: *prove the test can fail*.**

---

## Entries

### 2026-08-11 — `results/capdev-bulk-upload-notification`

**Outcome:** delivered, validated `PASS` (0 FAIL, 7 WARN, 8 advisories). 12/12 tasks, every one on a Reviewer PASS at attempt 1. Ships dark — merged with the kill switch seeded `false`.

#### Measure

| Signal | Value | Source |
| --- | --- | --- |
| Tasks executed | 12 | `tasks.md` |
| Reviewer FAIL rework attempts | **0** | `execution.md` — every task records "attempt 1" |
| HALTs / FATAL_FAILs | **0** | `execution.md` |
| Pivots | **0** | `execution.md` — no `## Pivot Record` block |
| `PRODUCT_BUG` findings | **0** | `test-report.md` §2 |
| Judgment-day findings (pre-code) | 5 confirmed SEVERE + 5 verified single-judge, all corrected before any code | `judgment.md` |
| **Spec-owner decisions & corrections** | **30** (`OD-1…3`, `D-T01-a` … `D-T12-b`) | `execution.md`, `requirements.md`, `design.md` |
| Tasks reopened after a PASS | **2** (T-04, T-07 — both by OD-2) | `execution.md` → OD-2 resolution |
| Ungated ACs found by the test audit | **6**, one shared root cause | `test-report.md` §2 |
| Validation FAIL / WARN | **0 / 7** (4 fixed during the phase) | `validation-report.md` |
| Budget tripwire firings | **2** (~1,450 → ~4,600 → ~5,600; final code **6,215**) | `design.md` §14.1, §14.2 |
| Drift attributable to this spec | 0 new; the spec **fixed** pre-existing constitution drift (`/v1`) | `validation-report.md` §11 |

**Not a clean run — but the waste was in a place worth naming.** Zero rework, zero pivots, zero product bugs, and **30 recorded corrections to the spec's own documents**. The defects in this spec were in the *specification*, not the implementation. The process caught them in the right order (Judgment Day → Reviewers → test audit → validation); what it could not do was prevent them from existing.

#### Learn

**KZ-004 — A fixture built from identical defaults cannot prove per-unit scoping. (High, Product + Methodology)**

- *Root cause:* multi-group `dispatch()` fixtures were built from `makeMetricsRow(id)` with identical defaults (`trainings_count: 5`) and identical PI/RA fixtures. Group A and group B were indistinguishable, so per-group scoping had **no observable consequence** and a batch-wide regression rendered output identical to the correct one. The tests were not wrong; the fixture could not express the difference they asserted.
- *Evidence:* `test-report.md` §2 — six ACs ungated by this one cause (R-CBU-002 AC.2 and its cross-project scenario, R-CBU-003's scenario, R-CBU-005 AC.3, R-CBU-006 AC.6, R-CBU-011 AC.1). Fixed with one fixture carrying genuinely distinct groups — 5/2/7 trainings, distinct PIs, distinct RAs.
- *The sharpest detail:* **the project already knew this rule.** T-05's `Disqualifies` clause states it exactly, for the repository layer: *"a grouping test built on a fixture where every contract has exactly one result cannot distinguish a correct `GROUP BY` from a missing one."* It was never generalized to the service layer, where the same shape recurred six times.
- *Standardization:* one line in `docs/specs/general-setup/task.md` §5, promoting the `Disqualifies` clause from this project's local practice into the template. → **Applied 2026-08-11 (user-approved)**

**KZ-005 — A rule that lives only in a test is a requirement gap. (High, Product + Methodology)**

- *Root cause:* T-07 implemented a real behavioral rule — suppress any women's share that rounds to zero — recorded **only** at `capdev-metrics.formatter.spec.ts:115`. The T-07 Reviewer correctly refused to treat a test as a requirement, and correctly declined to fail it (the literal requirement would have forced a worse render into production). The gap sat between those two correct judgments with no owner until the spec owner adjudicated it as OD-2.
- *Evidence:* `execution.md` → *OD-2 resolution*; `design.md` §14.2 — *"rework forced by a defect in the requirements"*, 95 lines reopening **T-04 and T-07 after both had PASSed**.
- *Why High rather than Medium:* it is the only defect in this spec that invalidated a Reviewer PASS, and the behavior it protected is consequential — left as implemented, a training with 4 women out of 1,240 participants would have been reported as though no women attended, an error direction that *flatters* the data for a gender-sensitive reporting organisation.
- *Standardization:* one line in `docs/specs/general-setup/requirements.md` §3 rules. → **Applied 2026-08-11 (user-approved)**

**KZ-006 — Sweep the claim, not the citation. (Medium, Product + Methodology)**

- *Root cause:* a correction's closure sweep derives its grep pattern from the **citation that surfaced the defect** rather than from the **claim being corrected**. D-T11-b swept `grep -rn "api/v1"` and reported both directions closed; `design.md:190` said only `/v1` and survived — eleven lines below the note declaring that route nonexistent.
- *Evidence:* `execution.md:1030` (the sweep as run); `validation-report.md` §8 WARN-2. **Three independent instances in one spec:** the `/v1` bullet, the `4 grouped reads` figure (survived in DD-2 and DD-3 after §6.1 was corrected), and the coverage mapping (`requirements.md` §13 stale *and* `tasks.md` §6 itself incomplete on two rows).
- *Standardization:* one line in `docs/specs/general-setup/requirements.md` §3 rules. → **Applied 2026-08-11 (user-approved)**

#### Standardize

Six edits applied on user approval — the three new lessons above, **plus the three from the 2026-07-28 archive that had been left `proposed` and never applied**:

| Lesson | Home | State |
| --- | --- | --- |
| KZ-004 | `docs/specs/general-setup/task.md` §5 | Applied |
| KZ-005, KZ-006 | `docs/specs/general-setup/requirements.md` §3 | Applied |
| KZ-002 | `docs/specs/general-setup/requirements.md` §1 | Applied (backlog) |
| KZ-001, KZ-003 | `client/research-indicators/src/CLAUDE.md` — *Tests inside `src/`* | Applied (backlog) |

**Process observation worth keeping:** three High/Medium lessons sat at `proposed` for one full spec cycle. A Kaizen loop that measures and records but never standardizes is measurement theatre — and KZ-004 arriving as the fourth recurrence of KZ-001's family is what that costs. **Recommendation: `/akili-archive` should treat a non-empty `proposed` backlog as a Measure signal in its own right.** *(Methodology — candidate for upstreaming.)*

**Methodology lessons for upstreaming to the AKILI repository:** KZ-004, KZ-005 and KZ-006 are all dual-target — none names a stack, domain or local convention. The local edits are applied; all three describe gaps in the AKILI templates themselves, and KZ-006 specifically describes a gap in the **Correction Closure** rule shared by `/akili-specify` and `/akili-validate`.

#### What worked, and is worth keeping

- **Judgment Day before any code** removed 10 findings — including `sec_template` vs a `templates` table that does not exist, which would have produced a migration that fails at runtime.
- **`Disqualifies` clauses on every task.** An inconclusive verification was a legitimate, reportable outcome rather than a pass because the command exited `0`. This is the practice that generalized into KZ-004.
- **Two pure modules** holding every rule the D1/D2 defect classes can break — both reached 100% statement coverage with plain-object fixtures, no DB, no broker, no template.
- **Byte-equality between the on-disk template and the migration literal**, enforced by a spec — the KZ-001 control that made every downstream rendering assertion trustworthy.
- **The advisory-never-becomes-a-task rule held under budget pressure.** T-07's upper-clamp advisory and T-11's masked-open-handle advisory were both recorded and left unimplemented rather than quietly folded into adjacent tasks.
- **Mutation as the standard of proof**, twice: the test audit proved each of the six gaps red-then-green, and T-08's cross-file `%` invariant was demonstrated red-then-reverted rather than asserted.

---

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

Three minimal edits proposed. **Deferred at the time; all three applied 2026-08-11 during the `results/capdev-bulk-upload-notification` archive.**

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
