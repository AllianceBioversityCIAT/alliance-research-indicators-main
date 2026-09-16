# Validation Report — Innovation Use drafts must save while incomplete

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/innovation-use-draft-save/` |
| Depth / Type | **Lite · Bug Mode** (regression test mandatory) |
| Validated | 2026-09-09 |
| Validator | Claude Opus 5 (T3 Auditor) |
| Author ≠ auditor | **Satisfied** — T-01/T-02/T-03 were implemented by `akili-implementer` (T2 · sonnet) and reviewed by `akili-reviewer` (T3 · opus, read-only). This validator wrote no code in this spec. |
| Evidence base | `execution.md` per-task entries · independent verification of all four falsifiable ACs (§5) · fixture execution against real MySQL (§9) |
| `test-report.md` | **Absent.** Coverage derived directly per the user's ruling 2026-09-09 (`WARN-2`). |
| Sibling spec | Validated in parallel — see [`../../changes/innovation-use-required-fields/validation-report.md`](../../changes/innovation-use-required-fields/validation-report.md) |

---

## 2. Summary

**Verdict: ARCHIVE-READY, with two accepted deferrals carried forward.**

All three tasks are complete with Reviewer PASS. Every acceptance criterion that can be verified mechanically was **re-verified independently here and passed** — the deleted guard, the absent migration, the byte-identical shared component, the untouched original migration. The bug is fixed on both tiers, the fix is deployed, and two QAs approved it.

One requirement is **partially** evidenced: `R-IUD-002` AC.3's *rejection logic* is proven against real MySQL, but the *workflow wiring* that makes it fire is asserted by no test. That is `D2`, already deferred by user ruling and already flagged in `OPEN-ITEMS.md` as the highest-value item owed.

| Dimension | Result |
| --- | --- |
| Task completion | **PASS** — 3 / 3 `[x]`, Reviewer PASS each |
| File existence | **PASS** |
| Build integrity | **PASS** — both packages green, both lint gates clean |
| Requirement coverage | **PASS** with 1 WARN — 3/3 requirements, 14 of 15 ACs fully evidenced |
| Code quality / 4R | **PASS** with 1 advisory |
| Design conformance | **PASS** — including a self-correcting requirements amendment (§8.2) |
| Test evidence | **PASS** — Bug-Mode red-before/green-after observed |
| Guide / constitution | **WARN** — inherited `AGENTS.md` drift, not this spec's |

---

## 3. Task Completion

| Task | Status | Reviewer | Rounds |
| --- | --- | --- | --- |
| T-01 — Server: delete the save-time guard, invert its tests, redesign the boundary fixture | `[x]` done | **PASS** attempt 1 | 1 |
| T-02 — Client: drop the save gate condition and the duplicate message | `[x]` done | **PASS** attempt 2 of 3 | 2 |
| T-03 — Amend the affected specs and close the verification gate | `[x]` done | **PASS** attempt 3 of 3 | 3 |

**Total review rounds: 6** — exactly at the re-baselined tripwire ceiling, not beyond it.

**On the unflipped criteria checkboxes.** All 22 `- [ ] c*` lines in `tasks.md` remain unchecked while each task's `Status` field reads `[x] done`. This is **the spec's own declared convention**, stated explicitly at `execution.md:425`, not drift — and it matches the sibling spec, where the per-task status lives in a status board rather than in the criteria list.

It is worth naming as advisory `ADV-1` anyway: a reader cannot distinguish *"criterion verified"* from *"criterion untouched"* without opening `execution.md`, and the committed `akili-tasks-gate.sh` hook keys on `[x]` counts in `tasks.md`, so the convention makes that hook inert for this spec's criteria. Not a conformance failure.

---

## 4. File Existence

| Surface | Change | State |
| --- | --- | --- |
| Server | `validateLevelExplanation` + its call site **deleted** from `ResultInnovationUseService` | ✅ verified absent (§5) |
| Client | `!justificationMissing()` removed from the save gate; page-owned message gated to the whitespace-only subset | ✅ present |
| Tests | 8 inverted unit tests; boundary fixture redesigned; Bug-Mode regression fixture added | ✅ present |
| Docs | `details-page` pivoted; superseding record for archived chunk 2; `family.md` follow-up row; `pr-description.md` | ✅ present |
| **Not touched** | `TextareaComponent`, `innovation_use_validation`, any migration | ✅ verified untouched (§5) |

---

## 5. Independent Verification of the Falsifiable ACs

This spec's ACs are unusually machine-checkable. All four were re-run here rather than taken from the log.

| Check | AC / class | Command | Result |
| --- | --- | --- | --- |
| The guard is gone | T-01 c5 · root cause | `grep -rn validateLevelExplanation server/ --include=*.ts` | ✅ **5 hits, all comments** — 4 JSDoc in fixtures, 1 `//` at `result-innovation-use.service.ts:197` recording that T-01 deleted it. **Zero in live code.** |
| No migration added | `R-IUD-002` AC.4 · `NFR-IUD-001` | changed-file set over this spec's commits | ✅ **0** files under `db/migrations/` |
| `innovation_use_validation` byte-identical | `R-IUD-002` AC.4 | `git log` on `1787078283929-createInnovationUseValidation.ts` | ✅ **exactly 1 commit** in its whole history — created once, never edited |
| `TextareaComponent` byte-identical | `R-IUD-003` AC.6 · class `D6` | changed-file set over this spec's commits | ✅ **0** matches on any `textarea` path |

### Build gates, measured 2026-09-09 in a quiet tree

| Gate | Result |
| --- | --- |
| Client suite `npm test -- --silent` | ✅ **317 suites / 6894 tests / 0 failed** |
| Server suite `npm test -- --silent` | ✅ **356 suites / 2744 tests / 0 failed** |
| Client build `ng build --configuration development` | ✅ clean, `strictTemplates` valid |
| Server build `npm run build` | ✅ `nest build` + `vite build` clean |
| Lint, both packages | ✅ exit 0 — bare `npx eslint`, **never** `npm run lint` (`K-001`) |
| Fixtures, real MySQL `npm run test:fixtures` | ✅ **18 suites / 122 tests / 0 failed** |

### What these gates cannot reach (`KZ-017`)

- `npm test` uses `rootDir: src` on both sides. **`test:e2e` and `test:integration` were not run.**
- The fixtures run against the **disposable scratch schema**, never the shared Dev database. They prove SQL behaviour, not deployed state.
- **`NFR-IUD-002`'s coverage floors were not re-measured per-package here** — both suites pass, and Jest enforces the floors on a full run, so a floor breach would have failed the run. That is indirect but sound; a targeted run would not have been.

---

## 6. Requirement Coverage

| Requirement | Verdict | Evidence |
| --- | --- | --- |
| **`R-IUD-001`** — a draft saves regardless of justification completeness | **PASS** | Bug-Mode fixture `innovation-use-level-boundary` c1: level-6 draft with blank justification **saves**. AC.5's `buildPayload` byte-identity held (T-02 c6). AC.3's "no `400` on any input" follows from the guard's deletion, verified above. |
| **`R-IUD-002`** — completeness stays required to submit | **WARN-1** | AC.1/AC.2 proven: the fixture calls the **real** `completenessValidation` against real MySQL and it rejects. AC.4 verified above. **AC.3's wiring half is unevidenced** — see below. |
| **`R-IUD-003`** — the required message renders exactly once | **PASS** | Message count **1 / 1 / 0** across blank / whitespace / real text, as a jsdom **node count** — which the spec correctly argues jsdom evaluates soundly, so no human substitute is owed. AC.6 verified above. |
| `NFR-IUD-001` no new deps / migration / shared edits | **PASS** | All three verified mechanically in §5 |
| `NFR-IUD-002` coverage floors | **PASS** | Both full suites green (see the caveat in §5) |
| `NFR-IUD-003` both tiers ship in one PR | **PASS** | Both tiers are on `origin/dev` and deployed together; the coupling rule (*"client-only turns a silent no-op into a visible 400"*) was never violated |

### Defect classes D1–D7

All seven gates exist and six were observed able to fail during execution. **`D2`'s falsifier — restore `validateLevelExplanation` → the fixture reddens — is the Bug-Mode red-before/green-after and was observed**, which is the single most important piece of evidence in a Bug-Mode spec and is recorded at `execution.md` §*"Bug Mode — red before, green after (c1)"*.

`D4` (inverted tests became tautologies) deserves note: all eight inverted unit tests assert the **positive** outcome — a request is issued, values persist, the message renders — never merely the absence of a throw. `KZ-001`'s trap was checked for and found absent.

---

## 7. Findings

### WARN-1 — `R-IUD-002` AC.3: the rejection is proven, the dispatch wiring is not

AC.3 reads: *"On the `REVISED → SUBMITTED` transition the server still rejects an incomplete result (`completenessValidation` is `enabled: true` on row id 30)."*

Verified independently here — the two halves have very different evidence:

| Half | Evidence |
| --- | --- |
| `completenessValidation` **rejects** an incomplete result | ✅ **Strong.** The boundary fixture invokes the real method against the real scratch schema, with no mocks for anything its body reads. |
| `result_status_workflow` **row id 30 dispatches it** for indicator 6 | ❌ **None.** Row 30 appears in that fixture only in **prose comments** (`:37`, `:322`). The fixture deliberately calls the method **directly rather than through the workflow dispatcher**, and says so. `enabled: true` on row 30 is asserted by reading a migration, not by a test. |

So a configuration change to row 30 — or a dispatcher regression — would silently remove the last gate on this transition, and every test would stay green.

**This is `D2`, already deferred by user ruling** and already recorded in `docs/specs/innovation-use/OPEN-ITEMS.md` §3.1 as *"Deferred by user ruling · ADVISORY R1 · highest-value item owed."* It is therefore a WARN with accepted remediation, not a FAIL.

**Why it is worth more than its WARN suggests.** The sibling platform finding (`proposal.md` §15) is that `completenessValidation` is `enabled: false` on `DRAFT → SUBMITTED` for **every** indicator, so first submission is ungated platform-wide and only the STAR client's green-check gating prevents it. That makes row 30 — the `REVISED → SUBMITTED` gate — the **only** server-side completeness enforcement in this flow. An unasserted single point of enforcement is a worse gap than the same gap on a redundant one.

**Remediation:** one fixture asserting that the indicator-6 `REVISED → SUBMITTED` transition dispatches `completenessValidation` through the real dispatcher. Small, and it closes the highest-value item this spec left owed.

### WARN-2 — no `test-report.md`

Same as the sibling spec: `/akili-test` never produced one, so coverage was derived directly. It worked, but no durable requirement-to-test matrix exists.

### WARN-3 — inherited: `AGENTS.md` has drifted from root `CLAUDE.md`

Not this spec's doing. Recorded in full in the sibling report; repeated here only so an archive of this spec does not lose it. `AGENTS.md` is missing **K-004/KZ-014**, **K-016** and **KZ-017**, and carries superseded **K-015**/**K-014** text.

### Carried forward, not this spec's to close

| Item | Owner | Note |
| --- | --- | --- |
| **`D1`** — remove `_effectiveExplanation` (dead since T-01) plus three stale rationale paragraphs | Deferred by user ruling | Dead code, no behavioural risk. Cheap whenever someone next opens that file. |
| `details-page` **T-13** human gates `c7`/`c8`/`c9` (light-theme visual ×2 viewports, two screenshots, keyboard pass) | The archived sibling, `[~]` | **`details-page` was archived with T-13 incomplete.** Worth surfacing at archive time: a chunk marked archived in `family.md` still owes four human gates (`OPEN-ITEMS.md` §3.2 `H1`–`H4`). |
| Platform finding — `completenessValidation` `enabled: false` on `DRAFT → SUBMITTED` for every indicator | Product / security | Filed by `proposal.md` §15. Directly aggravates `WARN-1`. |

---

## 8. Code Quality & Design Conformance

### 8.1 Advisory (4R — non-gating)

| ID | Lens | Finding |
| --- | --- | --- |
| `ADV-1` | Readability | The `- [ ] c*` criteria convention (§3) makes `tasks.md` checkboxes carry no signal and renders the committed `akili-tasks-gate.sh` hook inert for them. Declared convention, so not a defect — but a future spec choosing between conventions should know this one costs the hook. |

### 8.2 Design conformance — and a requirements document that corrected itself

**PASS**, with one item worth recording as a positive rather than a finding.

`requirements.md` `R-IUD-003`'s Details bullet originally prescribed *suppressing* the shared `app-textarea` message. That prescription was **falsified by the spec's own gates**: suppression makes deleting the page-owned block kill the blank *and* whitespace cases together, while T-02's mandatory falsifying input requires only the whitespace case to fail. The document now carries the correction, the reasoning, and an explicit *"Do not fix this back toward suppression"* warning.

Two things make this notable at validation time:

1. The drift was caught by the **Reviewer's 4R risk lens, not by the conformance gate** — all six ACs held. A pure AC audit would have shipped the wrong design with a green report.
2. The final implementation makes the two messages **disjoint by construction** (untrimmed component owns raw-empty; page block owns whitespace-only), so `1 / 1 / 0` is structural rather than incidental. That is a stronger design than the one the requirements first asked for.

| Check | Result |
| --- | --- |
| Cross-document figure check | **PASS** — no contradicted count found between proposal, requirements and design |
| Proposal intent / non-goals | **PASS** — option A as approved; every out-of-scope item in §4 stayed out |
| Correction Closure (`KZ-005`, both directions) | **PASS** — 37-hit / 6-file baseline established **before** amending, reconciled exactly after; the Reviewer independently re-swept on a third axis it was not given and found no survivor |
| Archive byte-integrity | **PASS** — the archived chunk-2 file untouched; supersession recorded in a new note beside it |
| `execution.md` append-only | **PASS** — historical entries kept, a new Pivot Record appended instead of rewriting |

---

## 9. Test Evidence Summary

Re-executed 2026-09-09 against a freshly bootstrapped disposable MySQL 8.0 scratch schema.

| Suite | Result |
| --- | --- |
| All fixtures | ✅ **18 suites / 122 tests / 0 failed** |
| `innovation-use-level-boundary.fixture-spec.ts` — this spec's Bug-Mode regression | ✅ green, including c1/c2 in one case: the level-6 blank-justification draft **saves**, and the **real** `completenessValidation` still rejects it |
| `innovation-use-section-round-trip.fixture-spec.ts` | ✅ green |
| Client `innovation-use-details.component.spec.ts` | ✅ green — carries the `1 / 1 / 0` message-count assertions |

**Bug Mode satisfied.** The red-before/green-after was observed during execution (`D2`'s falsifier: restore the guard → the fixture reddens), which is the mandatory evidence for a Bug-Mode spec and the reason this report can call `R-IUD-001` proven rather than plausible.

---

## 10. Agent Guide / Constitution Impact

| Item | State |
| --- | --- |
| `## Constitution Impact` notes | None — no module boundary or public surface moved |
| Child guides | Present, not stale for this spec's surfaces |
| `docs/ux-ui/design.md` / `details-page` amendments owed by T-03 | ✅ delivered and swept both directions |
| `AGENTS.md` vs `CLAUDE.md` | ⚠️ inherited drift — `WARN-3` |
| CodeGraph | Re-index at archive |

---

## 11. Remediation

| # | Item | Type | Owner | Blocks archive |
| --- | --- | --- | --- | --- |
| 1 | `D2` / `WARN-1` — one fixture asserting row 30 dispatches `completenessValidation` on indicator-6 `REVISED → SUBMITTED` | Test | D. Casañas | **No** — deferred by user ruling; carry as a follow-up |
| 2 | `D1` — delete `_effectiveExplanation` + three stale rationale paragraphs | Cleanup | D. Casañas | No |
| 3 | Sync `AGENTS.md` with `CLAUDE.md` | Doc correction | `/akili-archive` | No |
| 4 | Surface that `details-page` was archived owing four human gates (`H1`–`H4`) | Doc correction | `/akili-archive` | No |
| 5 | Escalate the platform finding (first submission ungated for every indicator) | Product / security | Filed, unowned | No |

**Nothing on this list blocks the archive.** Items 1 and 2 are user-accepted deferrals with recorded reasoning; 3–5 are cross-spec hygiene that `/akili-archive` and product own.

---

## 12. Archive Readiness Recommendation

**READY.**

| Criterion | Met |
| --- | --- |
| All required tasks `[x]` | ✅ 3 / 3, Reviewer PASS each |
| No unresolved FAIL | ✅ none |
| WARN accepted or has follow-up | ✅ `WARN-1` deferred by user ruling and already tracked in `OPEN-ITEMS.md`; `WARN-2`/`WARN-3` are cross-spec |
| Tests cover key requirements and scenarios | ✅ Bug-Mode red-before/green-after observed; `1 / 1 / 0` counted |
| Drift reflected in the docs | ✅ — including a requirements bullet the spec falsified and corrected against itself |
| User reviewed the validation summary | ⏳ this document |

This spec is in better shape than its sibling for one structural reason: **its defect classes were all mechanically checkable**, so nothing was left resting on human observation. Every AC that could be re-verified independently was, and all four passed.

The one thing to carry forward is `WARN-1`, and it is worth carrying deliberately rather than closing the spec over: after this fix, row 30 is the **only** server-side completeness gate on that transition, and no test asserts it fires.

```text
/akili-archive bugfix/innovation-use-draft-save
```
