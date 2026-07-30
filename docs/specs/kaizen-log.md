# Kaizen Log

Continuous-improvement record across AKILI-SPECS specs. One entry per archived spec.

---

## Active Lessons

| ID     | Lesson                                                                                                                                                                                                                          | Severity | Recurrence | Target  | Status                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ------- | ------------------------------------------- |
| KZ-001 | A test double that doesn't render or evaluate what it stands in for produces a green suite over broken behavior. Verify the double's fidelity, not just the assertion.                                                          | **High** | **5**      | Product | proposed                                    |
| KZ-002 | Enumerating scope by feature folder misses shared components rendered on the same route. Enumerate by _what renders_, not by _where the feature lives_.                                                                         | **High** | 3          | Product | proposed                                    |
| KZ-003 | Changing a component that many screens render requires a full-suite run. Targeted suites confirm the brief was followed, not that the blast radius is clean.                                                                    | Medium   | **2**      | Product | proposed                                    |
| KZ-004 | An "evidence that does NOT count" clause must name a **falsifiability** check and be verified to exist in this repo's toolchain. A named safety net that doesn't apply is worse than none — everyone believes they are covered. | **High** | 1          | Product | **Applied** — `general-setup/task.md` §3    |
| KZ-005 | When a host renders N instances of one component, gate **each instance's** bindings. A seam asserted once at mechanism level leaves N−1 instances undefended.                                                                   | **High** | 1          | Product | **Applied** — `general-setup/task.md` §3    |
| KZ-006 | Close layout/geometry decisions by **measuring in a real browser**, reproducing the known failure first as a control. CSS reasoning that survives blind review is still not evidence.                                           | **High** | 1          | Product | **Applied** — `general-setup/design.md` §10 |

---

## Entries

### 2026-07-30 — `project-dashboard/full-payload-show-more`

**Metrics**

| Signal                        | Value                                                                                           | Source                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------- |
| Tasks executed                | 8 (+ T-09 added by owner approval, deferred)                                                    | `tasks.md`                    |
| Reviewer FAIL rework attempts | **3** (T-03 ×1, T-06-revised ×1, T-07 ×1) vs **2** budgeted                                     | `execution.md`                |
| HALTs / FATAL_FAILs           | 0                                                                                               | `execution.md`                |
| Pivots                        | **1** (DD-13 → DD-14)                                                                           | `execution.md` — Pivot Record |
| PRODUCT_BUGs                  | n/a — `/akili-test` not run; each task authored its own gates (validation ruled this justified) | —                             |
| Judgment-day findings         | 3 rounds, terminal receipt `ESCALATED ⚠️`                                                       | `judgment.md`                 |
| Validation FAIL / WARN        | **2 / 8** — both FAILs fixed same day; 6 WARNs fixed, 2 accepted (owner-owned)                  | `validation-report.md`        |
| Environment failures          | 5+ Implementer spawns lost to API 529; run parked once                                          | `execution.md`                |
| Changed LOC                   | ≈1,470 vs ≈1,600 budgeted                                                                       | `execution.md`                |

**The through-line: in this spec a green suite was repeatedly the _shape_ of the defect.** Three separate times work passed every automated gate while being wrong — two assertions that could not fail (T-07), two "Show more" toggles deletable with the repo green (A-07.6), and two layout mechanisms that survived review and died to measurement (DD-13, DD-14 attempt 1). Every one was caught by `author ≠ auditor` plus mutation or measurement, never by reading.

**Lessons**

- **KZ-004 — A stated safety net that does not exist is worse than none.** (Product, High) → **Applied**
  - Root cause: `tasks.md` T-07 named `strictTemplates` as the discriminator proving the card stub could not silently swallow an unknown binding. That check **does not apply to spec files in this repo at all** — `eslint.config.js` ignores `**/*.spec.ts` and `jest.config.ts` passes `isolatedModules: true` (transpile-only), so no `.spec.ts` is ever type-checked. The clause was authored on an assumption about the toolchain that nobody verified, and it read as coverage for three tasks.
  - Why it bites harder than a missing check: everyone downstream believed the gate was there. It was found only because an Implementer _tested the claim_ rather than citing it.
  - Evidence: `execution.md` — E-07.2, T-07 attempt 1.
  - Standardization: `docs/specs/general-setup/task.md` §3 — the evidence clause must name a falsifiability check and be verified to exist. → **Applied 2026-07-30 (owner-approved)**

- **KZ-005 — A seam asserted once leaves N−1 instances undefended.** (Product, High) → **Applied**
  - Root cause: T-07's acceptance required correct inputs to reach _"each of the four cards"_ but only that the output seam be _"round-trip asserted"_ — once, at mechanism level. The asymmetry was invisible in review because the mechanism genuinely was proven. Consequence: `(expandToggled)` could be deleted from **Primary Levers** and **Main contact person**, and `(retry)` from Primary Levers, with the entire repo green — **two toggles could have shipped dead in the one PR a user notices.**
  - Found only because the T-07 review ran 16 mutants; 3 survived. Not findable by reading.
  - Evidence: `execution.md` — A-07.6, T-08; `validation-report.md` (4/4 mutants now red).
  - Standardization: `docs/specs/general-setup/task.md` §3 — per-instance gating. → **Applied 2026-07-30 (owner-approved)**

- **KZ-006 — Layout containment is measured, not argued.** (Product, High) → **Applied**
  - Root cause: DD-13 (conditionally switching the ranked grid to `align-items: start`) passed **three rounds of blind dual review** and was wrong — `align-items` governs how a shorter item sits in a track, never how the track is _sized_, so every downstream link kept growing. Its replacement's first attempt (a static `max-height`) also read as correct and measured **+52px / +13px**. A headless Chrome was available on the machine the whole time and went unused until after the pivot.
  - The generalizable part: **a control matters more than the result.** A probe that cannot reproduce the known failure cannot be trusted when it reports success — which is exactly how GATE-2's first closure passed while being unsound.
  - Evidence: `execution.md` — Pivot Record (DD-13 → DD-14), A-06r.5; `design.md` §6.3.2.
  - Standardization: `docs/specs/general-setup/design.md` §10. → **Applied 2026-07-30 (owner-approved)**

**Recurrences raised (not duplicated)**

- **KZ-001 → recurrence 5.** Recurred in T-07: the dashboard card stub had to gain `visibleLimit`/`expandToggled` or every input assertion would have compared against the stub's own defaults.
- **KZ-003 → recurrence 2.** Held correctly this time — T-08's deletion sweep ran the full suite (304/6234) and the blast radius was clean. First time this lesson was _followed_ rather than learned.

**Methodology observations (no local edit — candidates for upstreaming to AKILI)**

- **Advisory triage has no severity ladder.** A-06ii.3 (a citation in production code pointing at a file that never existed) was raised **three times** across T-06, T-08 and validation before being fixed, each time deprioritized as cosmetic. It was not: it was the sole evidence backing a comment that exists to stop someone deleting load-bearing code. `/akili-execute` §2.4 correctly stops advisories from _growing scope_, but offers no mechanism for one that must simply be _done_.
- **Two reviewers running mutation probes cannot share a working tree.** The `xhigh` effort dial prescribes 2–4 parallel lens Reviewers; here they would have raced on the same files. Ran sequentially instead (E-07.6). The mode table should acknowledge tree-mutating review.
- **A Reviewer mutating the tree it audits is a real hazard.** One popped a labelled stash mid-audit and recovered; it disclosed the incident unprompted. Worth a standing rule: probes restore with `git checkout HEAD -- <path>`, never `git stash`.

### 2026-07-28 — `results-center/external-results-readonly-view`

**Outcome:** delivered, validated PASS (0 FAIL, 4 WARN). 16 of 17 tasks done; T-11's browser-only ACs remain open on an environment blocker.

#### Measure

| Signal                                             | Count                                |
| -------------------------------------------------- | ------------------------------------ |
| Reviewer FAIL / rework cycles                      | 8                                    |
| HALTs (3-attempt ceiling reached)                  | 1 (T-04, recovered on a 4th attempt) |
| Pivot records                                      | 0                                    |
| Judgment Day SEVERE findings (pre-code)            | 3                                    |
| Scope gaps discovered mid-execution                | 2 (T-10 → R-RC-013, T-11 → R-RC-014) |
| Requirements added after approval                  | 3 (R-RC-012, R-RC-013, R-RC-014)     |
| `PRODUCT_BUG` findings                             | 0                                    |
| Validation                                         | PASS / 0 FAIL / 4 WARN               |
| Regression introduced and repaired within the spec | 1 (T-05 → T-16, 219 tests)           |

Not a clean run. Notably, **all three requirements added after approval came from evidence produced by the process itself** — a design review, a verification task, and a failed sweep — not from changing minds.

#### Learn

**KZ-001 — Test doubles that don't render what they stand in for. (High, recurrence 4, Product)**

Four distinct instances in one spec:

- `execution.md` → T-03: `isEditableStatus` is a `computed()`; under plain `jest.fn()` mocks it has no signal dependencies, so it caches after the first read. A loop reading it 15 times on one instance made **14 of 15 assertions vacuous**. Caught only by mutation testing.
- `execution.md` → T-14: the AC.4 tests asserted on `routerMock.navigate`, but the component never injects `Router` and `RouterLink` navigates via `navigateByUrl` — absent from the mock. No test in the file called `detectChanges()`.
- `execution.md` → T-15: `StubSelectComponent` had `template: ''`, so projected `#rows` content never instantiated. A gap survived **two** rework rounds behind it.
- `test-report.md` → §2 gap 3: the **entire** `results-center-table` suite runs under `overrideComponent({ template: '' })`; no test exercised the real `[routerLink]`.

_Root cause:_ the fidelity of the test double to the real component was never itself checked. In each case the assertion was reasonable; the substrate it ran on could not express the behavior under test.

**KZ-002 — Feature-scoped enumeration misses the shared shell. (High, recurrence 3, Product)**

- `execution.md` → `## T-11 Result: FAILED`: the spec enumerated 12 tabs + `result-sidebar` + `form-header` and missed `section-header`, `submission-history-item`, and the shared `oicr-form-fields` — 5 ungated controls, including **Delete Result available to any admin on a federated record**.
- Within T-15 the enumeration then grew 4 → 6 → 8 controls plus a projected icon across three attempts.
- `execution.md` → `## Scope Gap: T-10`: `my-latest-results` was fenced out on a technically-true but irrelevant basis.

_Root cause:_ scope was drawn by directory (`pages/result/pages/*`), while the user-visible surface is drawn by route — `platform.component.html` renders a shared header above every page, and shared `custom-fields/*` components render inside every tab.

**KZ-003 — Shared-component changes need a full-suite run. (Medium, recurrence 1, Product)**

`execution.md` → `## T-16`: T-05 added a `cache.isExternalResult()` call to `FormHeaderComponent`, which all 12 tabs render. That batch was verified with 7 targeted suites and reported green; **219 tests across 5 suites** were broken and went unnoticed until a later full run.

_Root cause:_ verification scope was set by the brief's file list rather than by the changed component's blast radius. Compounding factor worth recording: that batch was also the one whose adversarial Reviewers were lost to a session limit, so Leader verification confirmed _the brief had been followed_ — it could not surface that the brief itself was too narrow.

#### Standardize

Three minimal edits proposed; **pending user approval** (see the archive report's approval menu). No edit outside this log has been applied.

| Lesson | Proposed edit                                                                                                                                                                                                                                                            | Home                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| KZ-001 | Add to _Tests inside `src/`_: "When a spec stubs a child component, assert the stub renders/evaluates what the real one does (projected content, host bindings) — or use the real component. A stub with `template: ''` cannot prove anything about projected controls." | `client/research-indicators/src/CLAUDE.md` |
| KZ-002 | Add to the requirements template's scope guidance: "Enumerate the affected surface by _what renders on the route_, not by the feature folder — include the shared shell and shared field components."                                                                    | `docs/specs/general-setup/requirements.md` |
| KZ-003 | Add to _Tests inside `src/`_: "If a change touches a component rendered by many screens, run the full suite before reporting — targeted suites cannot see the blast radius."                                                                                             | `client/research-indicators/src/CLAUDE.md` |

**Methodology observation (no local edit; candidate for upstreaming to AKILI):** when the adversarial Reviewer step is lost (session limit, tooling failure), Leader self-verification is a weaker substitute in a specific and predictable way — it checks that the brief was satisfied, not whether the brief was sufficient. KZ-002 and KZ-003 both materialized in the one batch that ran without a Reviewer. A methodology-level guard ("if the Reviewer step cannot run, mark the batch and re-review before merge") would have caught both earlier.

#### What worked, and is worth keeping

- **Judgment Day before any code** paid for itself: it caught a factually wrong premise in the proposal and converted a deferred "optional" item into a blocking requirement that protected the spec's own headline feature.
- **Mutation testing as the standard of proof** for any doubted test. Every gap listed in KZ-001 was closed with a red-then-green demonstration, and reviewers were asked to reproduce them independently.
- **Asking reviewers to verify their own prior assertions** rather than carry them forward — during T-15 this caused the Reviewer to reverse an earlier remediation of its own that turned out to be wrong.
