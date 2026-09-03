# Validation Report — Organization count belongs to the unknown-organization path only

## Verdict: **PASS — archive-ready**

The behaviour is correct and the clause coverage is real. The independent auditor tried to break it and could not. **Every finding was a document defect, not a behaviour defect** — four WARNs, all now closed, plus two coverage gaps closed with tests whose reds were observed.

| | |
| --- | --- |
| Spec path | `docs/specs/changes/innovation-use-organization-count-known-path` |
| Depth | **Lite** |
| Validation date | 2026-09-03 |
| Findings at audit | 4 WARN · 6 ADVISORY · **0 FAIL** |
| Findings open now | **0 WARN · 0 FAIL** · 4 advisory (no action needed) · 1 carried open item |
| Recommendation | **Archive** |

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Validator | Claude Opus 5 (T1/T3), this session — **compiled the report and ran the measurements** |
| Independent auditor | `akili-reviewer` wrapper (T3, read-only) — **performed the substantive audit** |
| Implementer | `akili-implementer` wrapper (T2) |
| Documents audited | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `test-report.md` |

### ⚠️ Independence limitation — declared, not glossed

**The validator authored `requirements.md`, `design.md` and `tasks.md`.** Auditing them alone would have been self-verification. The substantive audit was therefore delegated to an independent read-only reviewer on a different model, with an explicit brief to be adversarial about **the spec documents themselves**, not only the code.

That delegation earned its cost: **all four WARNs came from the auditor, and at least two are textbook same-author blind spots** — a requirement-index row pointing at a task that never existed, and a KZ-013 sweep whose conclusion the validator had already written down as sound. Three per-task Reviewer passes had not caught either.

The validator independently re-verified every finding at source before acting. One auditor figure was found **understated in the validator's favour** and is corrected below (F-6).

---

## 2. Summary of findings

| # | Result | Finding | State |
| --- | --- | --- | --- |
| **F-1** | WARN → **CLOSED** | `requirements.md` §8 mapped two NFRs to a **`T-04` that never existed**, and disagreed with `tasks.md` §4 on `R-IUC-001` | Index corrected to T-01/T-02/T-03 with a dated note |
| **F-2** | WARN → **CLOSED** | The `How many?` placeholder clause was **asserted by no test**, yet its box was ticked | Assertion added; red observed in isolation |
| **F-3** | WARN → **CLOSED** | An accepted coverage regression (`[disabled]` on the surviving field) lived only inside a frozen decision table | Assertion added on the path that owns the field; red observed |
| **F-4** | WARN → **CLOSED** | The archive's **live** `DD-4` still asserted "both paths" for `[min]="0"` — the KZ-013 sweep examined only the frozen `execution.md` and missed it | `⚠️ AMENDED` clause added, with the miss recorded as the lesson |
| **F-5** | WARN → **CLOSED** | `execution.md` claimed "~90 LOC — **met exactly**", which was asserted, never measured | Real `git diff --shortstat` published; verdict restated honestly |
| **F-6** | WARN → **CLOSED** | "13 paths" published **with no list**, and the count was **wrong** | Real figure is **11**; full list pasted into `execution.md` |
| F-7…F-10 | ADVISORY | Figure-label collisions and understatements; no action needed | Recorded |

---

## 3. Task completion

| Task | Status | Evidence |
| --- | --- | --- |
| T-01 — render only on the unknown path | **[x]** | Reviewer PASS, 1 attempt, `b7eafa25`; K-004 red quoted |
| T-02 — emit no count for a known-path row | **[x]** | Reviewer PASS, 1 attempt, `93568e1c`; **three** reds quoted |
| T-03 — archive amendment + sweep | **[x]** | Reviewer PASS, 1 attempt, `3ecb3672`; `D-7` closed by the user, `96e74916` |

**0 rework attempts · 0 HALTs · 0 pivots · 0 `FATAL_FAIL`.** Every task passed its independent review on the first attempt.

---

## 4. Build integrity

| Check | Result |
| --- | --- |
| `npm run build` | **exit 0**, 0 `ERROR` lines |
| `npx eslint <production files>` | **exit 0** |
| `npm test -- --silent` | **317 suites / 6798 tests passed** |
| Server suite | **Not run** — 0 server files changed. A declared non-measurement, not a green. |

---

## 5. Requirement coverage

Audited at **clause granularity against the code**, not against `tasks.md` §4's own table. Full matrix in [`test-report.md`](./test-report.md) §5.

**Every scenario and every `BUT it must NOT` / `AND IT MUST` clause of `R-IUC-001`, `R-IUC-002`, `NFR-IUC-001` and `NFR-IUC-002` is closed by an assertion the auditor read at `file:line`** — with two exceptions, both accounted for:

- `R-IUC-002` Sc.1's row-inclusion clause is **reasoned, not measured**, and soundly so: the predicate is provably absent from the diff.
- `D-7` (layout) has **no automated gate by design** and was closed by the user's browser check.

The auditor's verdict on the coverage table: *"I did not trust `tasks.md` §4 … Everything else in the closure table survives an adversarial read."* One clause — F-2's placeholder — was genuinely uncovered and is now closed.

---

## 6. Design conformance

`DD-1` … `DD-6` all **PASS**, each verified at source. **No silent deviation found.**

One structural check worth recording, because it is the failure mode nobody would have noticed: the auditor independently confirmed that destroying the `app-input` on the known branch **cannot mutate `body`** — `InputComponent` has no `ngOnInit`, no `ngOnDestroy` and no constructor, and writes only from `setValue`. So `touched` (a `JSON.stringify` diff) and `showNotIdentifiedMessage` behave identically before and after. `design.md` §6.1 asserted this; it holds.

### Non-goals — all held

Actor card · measure card · shared `app-input` · `onKnownToggle` · `organizationIdentitySatisfied` · the server tier · Innovation Dev's organization card · `docs/ux-ui/design.md`. Each verified absent from the diff or unchanged at source.

### Proposal alignment

Delivered row for row against `proposal.md`'s Proposed Outcome table. **Criterion 8's mid-run correction was audited specifically for goalpost-moving and ruled legitimate**: the original wording would have required rewriting an archived execution log, which the cited precedent explicitly does not do.

---

## 7. Cross-document figure check

| Figure | Verdict |
| --- | --- |
| Line citations `:464` `:474` `:185` `:413` `:526` `:92` | **PASS — all exact** |
| "11 defect classes" | **PASS — exact** (`requirements.md` §6 defines D-1…D-11; `execution.md` §3 closes 11) |
| "+5 tests (6793 → 6798)" | **PASS** — exactly 5 new `it()` blocks counted, matching "2 in T-01, 3 in T-02" |
| "27 hits / 17 files" (KZ-013) | **PASS** — reproduces at 29/18 today; the delta is `execution.md`'s own new self-references. Correctly dated. |
| "3 production lines" vs "~13 production LOC" | **Advisory** — 3 *edits* vs 13 *lines*; both defensible, labels collide |
| **"13 paths"** | **WAS WRONG → corrected to 11.** Inflated by duplicates: the command concatenated the committed range *and* the working tree, counting two files twice. |
| **"~90 LOC met exactly"** | **WAS WRONG → corrected.** Production met (14 vs ~13); the test half overshot (~88 vs ~65). |

---

## 8. Linting & code quality — 4R advisory sweep

**Constitutional compliance: PASS on every rule** — standalone components, no hex literals, token utilities (`rs-mt-[12]` travelled with the moved block), signals for state, no `HttpClient` in components, no NgRx, strict TS. No new design token; nothing to register in `docs/ux-ui/design.md`.

| Lens | Finding |
| --- | --- |
| **Readability** | Good. Reworked assertions carry spec-citing comments. Two pre-existing advisories stand, fine to leave. |
| **Reliability** | One **pre-existing** weakness named, inside a block `NFR-IUC-002` forbids editing: `spec.ts:334`'s `?? 0` makes that assertion pass even if a paste sets nothing at all, so it cannot distinguish "`[min]` blocked it" from "the paste was inert". The `2.5` half does discriminate. **Not introduced here; not actionable within this spec's fence.** |
| **Resilience / Risk** | No new failure mode. No auth, no network, no migration. Backout is one revert. The auditor could not construct any residual data harm — `OQ-1` dissolved it, corroborated at source. |

---

## 9. Carried open item

**One, and it is carried deliberately rather than dropped:**

> No spec in the client package drives a PrimeNG checkbox through its rendered element — **zero** `triggerEventHandler('onChange'` occurrences under `client/research-indicators/src`. Deleting `(onChange)="onKnownToggle($event.checked)"` from a template would ship green.

Pre-existing, repo-wide, outside this spec's change surface. Correctly classified as ADVISORY rather than a spec violation throughout the run, and **never converted into a task** — a task the user did not approve is not scope. It survives in `execution.md` §3's open-items list. **`/akili-archive` should index it where it stays visible after this folder is frozen**; if it is to be fixed, it earns its own proposal.

---

## 10. Agent guide / constitution impact

**None.** `execution.md` carries no `## Constitution Impact` block: no module was created or reshaped, no boundary moved, no public surface changed. No child guide is stale. CodeGraph re-index is pending as usual and is `/akili-archive`'s step.

---

## 11. Test evidence summary

A separate `/akili-test` phase was run **after** this audit and is recorded in [`test-report.md`](./test-report.md). Its ruling on the previously-missing report: **a legitimate Lite outcome**, evidenced — neither comparable change-class spec in the archive has one, nor does the far larger parent chunk.

The substantive point the auditor made about it is worth preserving: what a separate test phase would have bought is `author ≠ tester`, and that was **mitigated differently but adequately** — a T3 Reviewer audited each task independently, and every gate this spec claimed had a red was observed red before the green, with verbatim output. `D-3`'s red is documented as *discriminating* (3 of 4 assertions reddened; the unknown-path case correctly stayed green), which is exactly the anti-uniform-failure evidence K-004 asks for.

---

## 12. Remediation

**All six actionable findings closed. Nothing outstanding.**

| # | Action taken |
| --- | --- |
| F-1 | `requirements.md` §8 index corrected; forward sweep confirms no `T-04` survives outside the note recording the error |
| F-2 | Placeholder + not-required assertions added; **red observed in isolation** (`Expected: "How many?" / Received: ""`) |
| F-3 | `[disabled]` assertion added on the path that owns the field; **red observed in isolation**; E-1 resolved rather than carried |
| F-4 | `⚠️ AMENDED` clause on the archive's `DD-4`; forward sweep for other live "both paths" claims returns clean |
| F-5 | Real `git diff --shortstat` published; "met exactly" restated per-row honestly |
| F-6 | Count corrected 13 → **11**, full path list pasted into `execution.md` |

**A note on the F-2/F-3 red proof.** The first attempt was **contaminated** — a `sed` anchored on `$` rewrote every line ending in `[disabled]="disabled"`, so a test failed for a binding this spec never touches. It was **discarded and re-run narrowly**, one falsifying input at a time. Both reds are now discriminating: exactly one test fails each time, and F-3's known-path sibling correctly stays green. Recorded because a red that fires for the wrong reason is not evidence, and the near-miss is the lesson.

---

## 13. Archive readiness

✅ All tasks `[x]` · ✅ 0 FAIL · ✅ 0 open WARN · ✅ key requirements and clauses covered · ✅ drift reflected in the docs · ✅ user reviewed the visual gate

```
/akili-archive docs/specs/changes/innovation-use-organization-count-known-path
```
