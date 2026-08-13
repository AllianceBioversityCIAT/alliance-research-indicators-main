# Kaizen Log

Continuous-improvement record for this project, updated automatically by
`/akili-archive` (Kaizen Retrospective, powered by the `kaizen` skill).
Other AKILI commands read only the `## Active Lessons` table below —
keep it at 10 rows or fewer.

---

## Active Lessons

| ID     | Lesson                                                                                                                                                                                                                                                           | Severity | Recurrence | Target  | Status                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ------- | ------------------------------------------- |
| KZ-001 | A test double that doesn't render or evaluate what it stands in for produces a green suite over broken behavior. Verify the double's fidelity, not just the assertion.                                                                                           | **High** | 4          | Product | proposed                                    |
| KZ-002 | Enumerating scope by feature folder misses shared components rendered on the same route. Enumerate by _what renders_, not by _where the feature lives_.                                                                                                          | **High** | 3          | Product | proposed                                    |
| KZ-003 | Changing a component that many screens render requires a full-suite run. Targeted suites confirm the brief was followed, not that the blast radius is clean.                                                                                                     | Medium   | 1          | Product | proposed                                    |
| KZ-004 | An "evidence that does NOT count" clause must name a **falsifiability** check and be verified to exist in this repo's toolchain. A named safety net that doesn't apply is worse than none — everyone believes they are covered.                                  | **High** | 1          | Product | **Applied** — `general-setup/task.md` §3    |
| KZ-005 | When a host renders N instances of one component, gate **each instance's** bindings. A seam asserted once at mechanism level leaves N−1 instances undefended.                                                                                                    | **High** | 1          | Product | **Applied** — `general-setup/task.md` §3    |
| KZ-006 | Close layout/geometry decisions by **measuring in a real browser**, reproducing the known failure first as a control. CSS reasoning that survives blind review is still not evidence.                                                                            | **High** | **2**      | Product | **Applied** — `general-setup/design.md` §10 |
| KZ-007 | A **correction record** is the highest-risk artifact class in a spec, not bookkeeping. It reads as settled fact, is rarely re-verified, and propagates. Verify a correction against its source before writing it — with the same rigour as the work it corrects. | **High** | 1          | Product | proposed                                    |
| KZ-008 | A derived map labelled "verified" will be trusted while wrong. Record **what was executed** to verify each row, or do not call it verified.                                                                                                                      | **High** | 1          | Product | proposed                                    |
| KZ-009 | Before trusting any measured ratio or margin, **measure the instrument's noise floor**. A rigorous harness — interleaved, warmed up, n≥25 — can still measure the wrong quantity.                                                                                | **High** | 1          | Product | proposed                                    |

---

## Entries

### 2026-08-03 — `project-dashboard/indicator-metadata-charts`

**Outcome:** delivered, validation **PASS / 0 FAIL / 9 WARN**. 17/17 tasks. Archived with one open DC-8 finding (Degree chart empty) carried to its own spec.

#### Measure

| Signal                                           | Value                                                                                                                                                                                     | Source                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Tasks executed                                   | 17 (16 budgeted + T-15 from the owner's OQ-6 decision, declared)                                                                                                                          | `tasks.md` §9                    |
| Reviewer FAIL rework attempts                    | **4** (T-07 ×1, T-12 ×1, **T-17 ×2**) vs **2–3** budgeted — **breached, declared**                                                                                                        | `execution.md`                   |
| HALTs / FATAL_FAILs                              | 0                                                                                                                                                                                         | `execution.md`                   |
| Pivots                                           | **1** — `Pivot Record: T-08`, NFR-IMC-001's 1.5× bound retired                                                                                                                            | `execution.md`                   |
| PRODUCT_BUGs                                     | 0                                                                                                                                                                                         | —                                |
| Judgment-day findings                            | 3 rounds, terminal `ESCALATED ⚠️`, **1 confirmed SEVERE live at termination** (DD-8)                                                                                                      | `judgment.md`                    |
| Validation FAIL / WARN                           | **0 / 9** — 4 remediated at validate, 5 carried                                                                                                                                           | `validation-report.md`           |
| Environment failures                             | VPN down blocking T-08 twice · worktree created from an unrelated old `main` (RB-9) · two parallel Implementers colliding on one git tree (RB-8) · **credential leak, contained** (RB-11) | `tasks.md` §7                    |
| Post-ship defects found by the owner's DC-8 pass | **1** — Degree chart shows no data                                                                                                                                                        | `degree-chart-empty/proposal.md` |

**The through-line: every serious failure in this spec was a _document_ asserting more than its source supported — and the technical work was sound throughout.** No HALT, no PRODUCT_BUG, no failed gate. The four rework rounds were spent almost entirely on correction records, not on code. Meanwhile three claims that had survived review died to measurement, and a "verified" map was found incomplete for the third time.

#### Learn

**KZ-007 — A correction record is the highest-risk artifact class, and gets the least scrutiny. (Product, High, new)**

- _Root cause:_ a correction reads as **settled fact** — it is written _because_ something was wrong, so the reader assumes the wrongness has been examined. That framing suppresses the verification the correction itself needs, and corrections propagate faster than the errors they fix because downstream documents cite them.
- _Occurrences in this one spec:_ T-14's _"HARD PREREQUISITE"_ — the Leader amplified an unverified claim from T-10's review into **two documents**, and it was false (a one-minute `grep` refuted it); `evidence/README.md` describing five **un-rendered** shells as _"the rendered DOM of the harness"_; the archived geometry probe cited as evidence for a change it **structurally cannot observe** (205 self-contained lines, no `src=`, no import — its zero delta was analytically guaranteed before the edit and would have held had the geometry been deleted outright); and **both** of T-17's FAILs, one of which stated a falsehood _inside the paragraph incrementing this very counter_.
- _Evidence:_ `tasks.md` RB-1 · `execution.md` § T-14, § T-16, § T-17 → Rework history.
- _What worked and should be kept:_ the spec **quoted the retracted text beside each correction** instead of overwriting it. That convention is the only reason the trail is auditable, and it is what let validation catch four more stale claims at the end.
- _Proposed standardization:_ `docs/specs/general-setup/task.md` §3 — "A correction record must cite the source it verified against, not the document it corrects. Verify before writing; a doc claim traceable only to another doc claim is unverified." **Deferred — needs owner approval.**

**KZ-008 — "Verified" without recorded execution is a trap. (Product, High, new)**

- _Root cause:_ `requirements.md` §4.1 presented itself as a verified source map three times and was incomplete all three: revision 1 invented a `result_oicr` table that does not exist; revision 4 got the label columns wrong; **T-01 then found the join column is not uniformly `id`** — `clarisa_innovation_types` joins on `code`, and **`gender.id` does not exist at all** (found by `ER_BAD_FIELD_ERROR`, not by review). Each revision was derived from decorators and _called_ verified; none recorded what had actually been run.
- _Why it bit:_ the first three charts in the table's own order join on `id`, so writing them top-down establishes `.id` as the pattern and then breaks on charts 5–10. A wrong map is worse than no map — it stops people looking.
- _The fix that worked:_ T-01 **executed all ten joins** and recorded the row count each returned. §4.1 now carries an executed Join-column column, and T-03/T-04 were still told to re-derive on contact.
- _Evidence:_ `requirements.md` §4.1 (its own three-revision confession) · `execution.md` § T-01 · `tasks.md` §10.
- _Proposed standardization:_ `docs/specs/general-setup/requirements.md` — "A source map may be labelled _verified_ only if each row records the evidence that verified it (executed query, decorator + line, migration). Otherwise label it _derived_." **Deferred.**

**KZ-009 — Measure the instrument before trusting the measurement. (Product, High, new — extends KZ-006)**

- _Root cause:_ T-08's harness was **exemplary** — interleaved arms, warm-ups discarded, 25 samples, two contracts, `T_metadata` captured two independent ways — and it still returned a wrong verdict (`breach`, ratio 3.997×). It measured the **arms'** variance without measuring the **link's**. Over VPN a `SELECT 1` — zero query work — costs p95 **155.5 ms**, more than the entire 8-query pre-change batch at 43.67 ms, with a 6× range. The composed path makes two sequential round-trip windows where the old one makes one, so the ratio was counting round trips, not query cost.
- _How it was caught and closed:_ the Leader overrode `breach` → `inconclusive` under DC-9, then re-measured server-side with `SHOW PROFILES` (instrument floor 0.29 ms). **The cross-check that made it credible:** the new numbers **scale with data volume** (18.69/19.45 ms on 521 results vs 12.80/14.15 ms on 242), where the VPN wall-clock was flat (174.54 vs 173.92) — a flat number across a 2× data change was measuring the link.
- _Second, separable finding:_ the 1.5× bound was **unsatisfiable even by the fallback the design named for it** (parallel composition → 2.12×). A condition its own prescribed remedy cannot meet is mis-calibrated, not failed. 1.5× of a 43.67 ms baseline leaves a 21.8 ms budget — less than one round trip.
- _Relation to KZ-006:_ KZ-006 says _reproduce the known failure as a control_. This is the adjacent gap — a control proves the harness can **detect**; a noise floor proves it is measuring the **right quantity**. Both are needed. A `SELECT 1` probe costs one line.
- _Evidence:_ `execution.md` § _Pivot Record: T-08_, § T-08 (c) · `requirements.md` NFR-IMC-001.
- _Proposed standardization:_ `docs/specs/general-setup/design.md` §10 — one line beside KZ-006: "Before trusting a ratio or margin, characterise the environment's noise floor. Report the spread, never p95 alone." **Deferred.**

#### Standardize

**All three edits deferred — no file outside this log was touched.** The owner archived under time pressure to switch branches, so the approval menu was not run. Every High-severity lesson here would normally recommend _Apply all_; the proposed edits are recorded verbatim above and are 1–2 lines each.

#### Recurrences raised (not duplicated)

- **KZ-003 → recurrence 3.** Followed correctly. T-15 edited the multi-host `ProjectDashboardCardComponent` and the **full** client suite ran (306/6292) — by the Reviewer independently, not only the Implementer. Second consecutive spec where this lesson was applied rather than learned.
- **KZ-006 → recurrence 2, and it paid twice.** T-16's three-level overflow measurement with a reproduced control; and DD-7's unqualified "2×2" claim — which had a KZ-006 warrant from the mockup — was falsified against the **running app** at both 1440 px and 768 px. A measurement of a replica is not a measurement of the thing.
- **KZ-005 → held.** The data-driven band mapper turned "each card bound to its own section" into 10 cheap per-entry assertions, and a card added later inherits the gate.
- **KZ-001 → a near-miss worth recording.** T-14's brief claimed an incomplete mock would make ten assertions _"bind to `undefined` and pass vacuously"_ — the classic KZ-001 shape. **It was false**: the host reads `payload()` directly and no production code touches the accessors. The lesson was correctly recalled and incorrectly applied. Pattern-matching a known lesson is not the same as verifying it holds here — which is KZ-007 from the other direction.

#### Methodology observations (no local edit — candidates for upstreaming to AKILI)

- **Rework budgets should count correction rounds separately from implementation rounds.** This spec's overrun (4 vs 2–3) was _entirely_ meta-work about its own defect tracking; the feature passed. A single budget hides which one is failing, and the two have different remedies.
- **A "no source changes, produce an evidence artifact" charter can produce a vacuous result unless it names the measurement _subject_.** T-16 inherited a defective gate from an archived spec and would, on the plain reading, have measured a static mockup and reported the NFR met on numbers describing hand-built HTML. It was caught **before dispatch** only because T-15's review had just exposed the identical hole in the geometry probe. Charters should name the subject, not just the deliverable.
- **A spec's done-definition should distinguish agent-closable from owner-closable items.** DC-8 and the product-owner acknowledgement sat unclosable in `tasks.md` §8 for two days looking like incomplete work. When DC-8 finally ran it **found a real defect in ~1 minute** that 630 suites had missed — the item was valuable, its placement made it look like a blocker for the wrong reason.

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

### 2026-08-13 — `results-center/url-filters`

**Outcome:** delivered, archived. 13/13 tasks. The defect that mattered most was found by a human, after every automated gate had passed.

#### Measure

| Signal                                                   | Value                                                                                                      | Source                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Tasks executed                                           | **13** (12 planned + T-13 added post-validation)                                                           | `tasks.md`                     |
| Reviewer FAIL rework attempts                            | **3** — T-08, T-11, T-12, one round each (budget 3)                                                        | `execution.md`                 |
| HALTs / FATAL_FAILs                                      | **0**                                                                                                      | `execution.md`                 |
| Pivots                                                   | **1** — T-11 → D-URL-17                                                                                    | `execution.md` §9              |
| PRODUCT_BUGs                                             | n/a — TEST phase skipped by user decision                                                                  | —                              |
| Judgment-day severe findings                             | Round 1: **4 confirmed severe + 4 suspects**. Round 2: **4 regressions introduced by round 1's own fixes** | `judgment.md`, `design.md` §12 |
| Validation FAIL / WARN                                   | **1 / 5** — the FAIL found _after_ the report first returned PASS                                          | `validation-report.md`         |
| **Defects found by manual product use, post-validation** | **1 (F-1)**                                                                                                | `execution.md` §12             |
| Budget re-baselines                                      | **3 formal + 1 unrecorded projection miss**; final 5,810 vs ~4,600 (**+26%**)                              | `design.md` §13                |
| Live production defects surfaced, out of scope           | **2** — both routed to their own specs                                                                     | `execution.md` advisories      |

**Not a clean run, and the interesting waste was not rework.** Three rework rounds out of thirteen tasks is healthy. The MUDA here was **verification that could not see the product**: an enormous, genuinely rigorous test mass validating the system against its own description.

#### Learn

**KZ-007 — Exercise the running product _before_ the validation verdict, not after. (High, Product + Methodology)**

- _Root cause (5W1H)._ The sidebar's Indicator multiselect (`indicator-codes-filter`) had **no URL parameter at all** — it filtered the table, rendered a chip, and vanished on reload. It survived **6,479 passing tests, mutation testing across four shared consumers, two independent reviewer lenses, and a full `/akili-validate` audit**, then fell in minutes to the product owner opening the page. _Why did every gate miss it?_ Each verified the implementation against the spec's enumeration — "six parameters", six tests, one per parameter. **No automated gate can falsify the enumeration itself.** The `/akili-validate` pass checked a traceability table against itself, which is the same defect class as the tests it audits.
- _Evidence:_ `execution.md` §12; `validation-report.md` §6 → F-1 (verdict revised after being proven wrong); the AC.1 test named `'applies, changes and clears the indicator **tab** filter'` discharging an AC whose text says _sidebar_.
- _The sharpest detail:_ D6's manual check was written into `requirements.md` §8 as a **substitute control for an acknowledged coverage gap** — and scheduled as the last item before archive. It turned out to be the only gate that could see the product, and it ran after the verdict it should have informed.
- _Standardization:_ one line in `docs/specs/general-setup/task.md` §8. → **Applied 2026-08-13 (user-approved)**
- _Upstream:_ `/akili-validate` declares archive-readiness without ever requiring the feature be exercised. Recommend a manual-pass gate in the command itself.

**KZ-002 — widened, recurrence 4. (High, Product)**

- _Root cause:_ the same enumeration failure one level down. KZ-002 already said _enumerate by what renders, not by where the feature lives_ — applied to **components on a route**. Here both indicator filters live in **one component**: a tab strip (`indicator-codes-tabs`) and a sidebar multiselect (`indicator-codes-filter`), two controls on two wire keys, treated as one filter throughout requirements, design and tests.
- _Evidence:_ `design.md` §7.2's R2-3 blockquote — correct about the read path, never followed through to the write path; `requirements.md` R-RCU-001 "Six parameters".
- _Standardization:_ widened the existing rule at `docs/specs/general-setup/requirements.md` §1 rather than adding a new lesson. → **Applied 2026-08-13 (user-approved)**

**KZ-008 — A re-baseline must correct the _basis_, not just the total. (Medium, Methodology)**

- _Root cause:_ this spec's LOC budget moved ~1000 → ~3200 → ~4600 → **5,810 actual**, every time because a corrected _total_ was built on an uncorrected _per-item_ estimate. Re-baseline #1 carried a per-task average drawn from a three-task sample dominated by two pure-unit tasks. Re-baseline #2 diagnosed exactly that — and then **repeated it inside its own note**, projecting ~5,100 on a T-12 estimate of ~200 that landed at 607.
- _Evidence:_ `design.md` §13 → both re-baseline records + the final-measured note; `execution.md` §8, §11.
- _Note:_ the two budget dimensions that measure **scope** — task count (12) and review rounds (3) — never moved in any revision. Only the estimate did, four times. That is an estimation-process defect, not scope creep.
- _Standardization:_ **none local** — the `general-setup` templates carry no budget section, and adding one exceeds the 1–3 line rule. Recorded for upstream to the AKILI methodology repo.

#### Standardize

| Lesson | Edit                                                                                        | Status                |
| ------ | ------------------------------------------------------------------------------------------- | --------------------- |
| KZ-007 | `docs/specs/general-setup/task.md` §8 — manual product pass precedes the validation verdict | ✅ Applied            |
| KZ-002 | `docs/specs/general-setup/requirements.md` §1 — enumeration reaches inside a component      | ✅ Applied (widened)  |
| KZ-008 | —                                                                                           | Recorded for upstream |

> **KZ-001 incremented to recurrence 5** without a new lesson: T-06's overridden-template harness returned a false green that only T-11's real-render harness could expose — _found by the very task written to end the pattern_. The KZ-001/KZ-004 merge trigger is **not** fired: F-1 is an enumeration failure (KZ-002's family), not a test that could not fail.

### 2026-08-11 — `results/capdev-bulk-upload-notification`

**Outcome:** delivered, validated `PASS` (0 FAIL, 7 WARN, 8 advisories). 12/12 tasks, every one on a Reviewer PASS at attempt 1. Ships dark — merged with the kill switch seeded `false`.

#### Measure

| Signal                                 | Value                                                                       | Source                                          |
| -------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| Tasks executed                         | 12                                                                          | `tasks.md`                                      |
| Reviewer FAIL rework attempts          | **0**                                                                       | `execution.md` — every task records "attempt 1" |
| HALTs / FATAL_FAILs                    | **0**                                                                       | `execution.md`                                  |
| Pivots                                 | **0**                                                                       | `execution.md` — no `## Pivot Record` block     |
| `PRODUCT_BUG` findings                 | **0**                                                                       | `test-report.md` §2                             |
| Judgment-day findings (pre-code)       | 5 confirmed SEVERE + 5 verified single-judge, all corrected before any code | `judgment.md`                                   |
| **Spec-owner decisions & corrections** | **30** (`OD-1…3`, `D-T01-a` … `D-T12-b`)                                    | `execution.md`, `requirements.md`, `design.md`  |
| Tasks reopened after a PASS            | **2** (T-04, T-07 — both by OD-2)                                           | `execution.md` → OD-2 resolution                |
| Ungated ACs found by the test audit    | **6**, one shared root cause                                                | `test-report.md` §2                             |
| Validation FAIL / WARN                 | **0 / 7** (4 fixed during the phase)                                        | `validation-report.md`                          |
| Budget tripwire firings                | **2** (~1,450 → ~4,600 → ~5,600; final code **6,215**)                      | `design.md` §14.1, §14.2                        |
| Drift attributable to this spec        | 0 new; the spec **fixed** pre-existing constitution drift (`/v1`)           | `validation-report.md` §11                      |

**Not a clean run — but the waste was in a place worth naming.** Zero rework, zero pivots, zero product bugs, and **30 recorded corrections to the spec's own documents**. The defects in this spec were in the _specification_, not the implementation. The process caught them in the right order (Judgment Day → Reviewers → test audit → validation); what it could not do was prevent them from existing.

#### Learn

**KZ-004 — A fixture built from identical defaults cannot prove per-unit scoping. (High, Product + Methodology)**

- _Root cause:_ multi-group `dispatch()` fixtures were built from `makeMetricsRow(id)` with identical defaults (`trainings_count: 5`) and identical PI/RA fixtures. Group A and group B were indistinguishable, so per-group scoping had **no observable consequence** and a batch-wide regression rendered output identical to the correct one. The tests were not wrong; the fixture could not express the difference they asserted.
- _Evidence:_ `test-report.md` §2 — six ACs ungated by this one cause (R-CBU-002 AC.2 and its cross-project scenario, R-CBU-003's scenario, R-CBU-005 AC.3, R-CBU-006 AC.6, R-CBU-011 AC.1). Fixed with one fixture carrying genuinely distinct groups — 5/2/7 trainings, distinct PIs, distinct RAs.
- _The sharpest detail:_ **the project already knew this rule.** T-05's `Disqualifies` clause states it exactly, for the repository layer: _"a grouping test built on a fixture where every contract has exactly one result cannot distinguish a correct `GROUP BY` from a missing one."_ It was never generalized to the service layer, where the same shape recurred six times.
- _Standardization:_ one line in `docs/specs/general-setup/task.md` §5, promoting the `Disqualifies` clause from this project's local practice into the template. → **Applied 2026-08-11 (user-approved)**

**KZ-005 — A rule that lives only in a test is a requirement gap. (High, Product + Methodology)**

- _Root cause:_ T-07 implemented a real behavioral rule — suppress any women's share that rounds to zero — recorded **only** at `capdev-metrics.formatter.spec.ts:115`. The T-07 Reviewer correctly refused to treat a test as a requirement, and correctly declined to fail it (the literal requirement would have forced a worse render into production). The gap sat between those two correct judgments with no owner until the spec owner adjudicated it as OD-2.
- _Evidence:_ `execution.md` → _OD-2 resolution_; `design.md` §14.2 — _"rework forced by a defect in the requirements"_, 95 lines reopening **T-04 and T-07 after both had PASSed**.
- _Why High rather than Medium:_ it is the only defect in this spec that invalidated a Reviewer PASS, and the behavior it protected is consequential — left as implemented, a training with 4 women out of 1,240 participants would have been reported as though no women attended, an error direction that _flatters_ the data for a gender-sensitive reporting organisation.
- _Standardization:_ one line in `docs/specs/general-setup/requirements.md` §3 rules. → **Applied 2026-08-11 (user-approved)**

**KZ-006 — Sweep the claim, not the citation. (Medium, Product + Methodology)**

- _Root cause:_ a correction's closure sweep derives its grep pattern from the **citation that surfaced the defect** rather than from the **claim being corrected**. D-T11-b swept `grep -rn "api/v1"` and reported both directions closed; `design.md:190` said only `/v1` and survived — eleven lines below the note declaring that route nonexistent.
- _Evidence:_ `execution.md:1030` (the sweep as run); `validation-report.md` §8 WARN-2. **Three independent instances in one spec:** the `/v1` bullet, the `4 grouped reads` figure (survived in DD-2 and DD-3 after §6.1 was corrected), and the coverage mapping (`requirements.md` §13 stale _and_ `tasks.md` §6 itself incomplete on two rows).
- _Standardization:_ one line in `docs/specs/general-setup/requirements.md` §3 rules. → **Applied 2026-08-11 (user-approved)**

#### Standardize

Six edits applied on user approval — the three new lessons above, **plus the three from the 2026-07-28 archive that had been left `proposed` and never applied**:

| Lesson         | Home                                                               | State             |
| -------------- | ------------------------------------------------------------------ | ----------------- |
| KZ-004         | `docs/specs/general-setup/task.md` §5                              | Applied           |
| KZ-005, KZ-006 | `docs/specs/general-setup/requirements.md` §3                      | Applied           |
| KZ-002         | `docs/specs/general-setup/requirements.md` §1                      | Applied (backlog) |
| KZ-001, KZ-003 | `client/research-indicators/src/CLAUDE.md` — _Tests inside `src/`_ | Applied (backlog) |

**Process observation worth keeping:** three High/Medium lessons sat at `proposed` for one full spec cycle. A Kaizen loop that measures and records but never standardizes is measurement theatre — and KZ-004 arriving as the fourth recurrence of KZ-001's family is what that costs. **Recommendation: `/akili-archive` should treat a non-empty `proposed` backlog as a Measure signal in its own right.** _(Methodology — candidate for upstreaming.)_

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

Three minimal edits proposed. **Deferred at the time; all three applied 2026-08-11 during the `results/capdev-bulk-upload-notification` archive.**

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
