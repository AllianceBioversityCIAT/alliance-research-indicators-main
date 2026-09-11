# Archive Summary — Innovation Use drafts must save while incomplete

## 1. Document Control

| Field | Value |
| --- | --- |
| **Original spec path** | `docs/specs/bugfix/innovation-use-draft-save/` |
| **Archive path** | `docs/specs/archive/2026-09-09-bugfix--innovation-use-draft-save/` |
| **Archive date** | 2026-09-09 |
| **Depth / Type** | **Lite · Bug Mode** (regression test mandatory) |
| **Approval Mode** | gated |
| **Owner** | D. Casañas |
| **Branch** | `AC-1679-Create-the-innovation-use-section` |
| **Executed** | 2026-08-21 |
| **Validated** | 2026-09-09 — [`validation-report.md`](./validation-report.md) |
| **Kaizen entry** | [`docs/specs/kaizen/bugfix--innovation-use-draft-save.md`](../../kaizen/bugfix--innovation-use-draft-save.md) |
| **Parent family** | [`docs/specs/innovation-use/family.md`](../../innovation-use/family.md) — **not a family chunk**; recorded there as `FR-8` |

---

## 2. Final Status

**DELIVERED AND DEPLOYED.** Validation verdict **ARCHIVE-READY** — 0 FAIL, 3 WARN, all accepted or cross-spec.

| Dimension | Result |
| --- | --- |
| Tasks | **3 / 3** `[x]`, Reviewer PASS each |
| Review rounds | **6** — exactly at the re-baselined tripwire ceiling |
| HALT / FATAL_FAIL | 0 |
| Validation | 0 FAIL · 3 WARN |
| Deployed | ✅ both tiers on `origin/dev`, in testing |
| QA | ✅ two QAs approved the whole Innovation Use module (2026-09-09) |

**The bug:** clicking **Save** on Innovation Use details did nothing when the resolved use level was `>= 6` and `Justification` was blank — no request, no feedback. The rule was enforced at save time on both tiers; it belongs at submit time, where the green check already enforces it.

**The fix made the draft save without relaxing what completing the section requires.**

---

## 3. Requirements Delivered

| ID | Requirement | Verdict |
| --- | --- | --- |
| `R-IUD-001` | A draft saves regardless of justification completeness | ✅ **PASS** |
| `R-IUD-002` | Completeness stays required to submit | ⚠️ **PASS with WARN-1** — rejection proven; the dispatch wiring is unasserted |
| `R-IUD-003` | The required message renders exactly once | ✅ **PASS** — counted `1 / 1 / 0` |
| `NFR-IUD-001` | No new deps, no migration, no shared-component edit | ✅ verified mechanically |
| `NFR-IUD-002` | Coverage floors held | ✅ both full suites green |
| `NFR-IUD-003` | Both tiers ship in one PR | ✅ coupling never violated |

---

## 4. Files Changed Summary

From `execution.md`.

| Tier | Change |
| --- | --- |
| **Server** | `validateLevelExplanation` and its single call site **deleted** from `ResultInnovationUseService`; 8 unit tests inverted; boundary fixture redesigned; Bug-Mode regression fixture added |
| **Client** | `!justificationMissing()` dropped from the save gate in `innovation-use-details.component.ts`; the page-owned required message gated to the **whitespace-only** subset so it is disjoint from `app-textarea`'s own |
| **Docs** | `details-page` pivoted (`R-IUP-006` / T-09); superseding record written beside archived chunk 2; `family.md` follow-up row; `pr-description.md` |
| **Deliberately untouched** | `TextareaComponent` · `innovation_use_validation` · every migration · `buildPayload` |

---

## 5. Test Evidence Summary

**Bug Mode satisfied.** The red-before / green-after was observed: restoring `validateLevelExplanation` reddens the regression fixture (`D2`'s falsifier).

Re-executed independently at validation on 2026-09-09 against a freshly bootstrapped disposable MySQL 8.0 scratch schema:

| Suite | Result |
| --- | --- |
| All server fixtures | ✅ **18 suites / 122 tests / 0 failed** |
| `innovation-use-level-boundary.fixture-spec.ts` — this spec's regression | ✅ green — the level-6 blank-justification draft **saves**, and the **real** `completenessValidation` still rejects it |
| Client suite | ✅ 317 suites / 6894 tests |
| Server suite | ✅ 356 suites / 2744 tests |
| Both builds + both lint gates | ✅ clean |

**`KZ-001`'s trap was checked for and found absent:** all eight inverted unit tests assert the **positive** outcome — a request is issued, values persist, the message renders — never merely the absence of a throw.

---

## 6. Validation Summary

Four ACs were mechanically re-verifiable and **all four were re-run at validation and passed**:

| Check | Result |
| --- | --- |
| `validateLevelExplanation` gone from live code | ✅ 5 hits, **all comments** (4 JSDoc + 1 `//` recording the deletion) |
| No migration added | ✅ 0 files under `db/migrations/` |
| `innovation_use_validation` byte-identical | ✅ its migration has **exactly 1 commit** in its whole history |
| `TextareaComponent` byte-identical | ✅ 0 matches on any `textarea` path |

---

## 7. Accepted Warnings & Follow-Ups

None blocks the archive. All are recorded with owners.

| ID | Item | Disposition |
| --- | --- | --- |
| **WARN-1 / `D2`** | `R-IUD-002` AC.3 — `completenessValidation`'s rejection is proven against real MySQL, but **no test asserts that `result_status_workflow` row 30 dispatches it**. The fixture calls the method directly, not through the dispatcher; row 30 appears only in prose comments (`:37`, `:322`) | **Deferred by user ruling.** Tracked in `OPEN-ITEMS.md` §3.1 as the *highest-value item owed* |
| **`D1`** | Remove `_effectiveExplanation` (dead since T-01) plus three stale rationale paragraphs | **Deferred by user ruling** — dead code, no behavioural risk |
| **WARN-2** | No `test-report.md`; coverage derived directly at validation | **Accepted** by user ruling 2026-09-09 |
| **WARN-3** | `AGENTS.md` has drifted from root `CLAUDE.md` (missing `K-004`/`KZ-014`, `K-016`, `KZ-017`; superseded `K-015`/`K-014` text) | **Inherited, not this spec's.** Recorded as a pending item for the default-branch apply phase |
| — | Platform finding: `completenessValidation` is `enabled: false` on `DRAFT → SUBMITTED` for **every** indicator, so first submission is server-side ungated | **Filed, unowned** (`proposal.md` §15) — product / security |

> **Why `WARN-1` deserves attention after this archive.** With the save-time guard deleted and `DRAFT → SUBMITTED` ungated platform-wide, **row 30 is the only server-side completeness gate on this flow** — and nothing asserts it fires. A config change or a dispatcher regression removes the last gate with every test still green.

---

## 8. Historical Notes

### The requirements document falsified its own prescription

`R-IUD-003`'s Details bullet originally ordered the shared `app-textarea` message **suppressed**. That prescription was falsified by the spec's own gates: suppression makes deleting the page-owned block kill the blank *and* whitespace cases together, while `tasks.md` T-02's mandatory falsifying input requires **only** the whitespace case to fail. Two binding gates contradicted the prose.

Two things make this the most instructive event in the spec:

1. **All six ACs held.** A pure conformance audit would have shipped the wrong design with a green report. The drift was caught by the Reviewer's **4R risk lens**, not by the AC gate.
2. The bullet was **over-specified from the start** — `design.md` §3.3 had already delegated the mechanism to the Implementer.

The final implementation makes the two messages **disjoint by construction** (the untrimmed shared component owns raw-empty; the page block owns whitespace-only), so `1 / 1 / 0` is structural rather than incidental — a stronger design than the one the requirements first asked for. The document now carries the correction, the reasoning, and an explicit *"Do not fix this back toward suppression"* warning.

→ Kaizen **`KZ-018`**.

### A citation defect introduced while remediating a citation defect

T-03 attempt 2 FAILed because a `DD-14` citation **added while fixing a citation defect** named a document that does not define `DD-14`. Recurrence of `KZ-007` (`staging` lineage).

### The review loop reversing itself

At T-03 attempt 2 the Reviewer **corrected its own attempt-1 citation** (`:167-181` → `:177-181`; the earlier range included comment prose) and ruled in the Implementer's favour. Separately, `design.md` §3.1 was found factually wrong and the Implementer's contradicting comment right. Both are the loop working as intended, recorded so the trail is legible.

### Correction Closure, run as a falsifier first

T-03's forward sweep was run **before** any amendment and returned 37 hits across 6 files, matching the pre-recorded baseline exactly — confirming the grep was sound before it was trusted. The Reviewer then re-swept on a **third axis it was not given** and found no survivor asserting the deleted guard.

### Budget

The tripwire **fired, was escalated, and was re-baselined by user ruling**, prioritising a stable test deployment. `D1` and `D2` were deferred in the same ruling. Recorded as a deliberate priority call so `/akili-resume` reads them as owed work, not as a gap nobody noticed.

### `KZ-013` backward sweep, run before the move

**Zero markdown links point into this spec folder** — every external citation is by name in prose. Two shared files carry meaning that goes stale (`OPEN-ITEMS.md:63` holds a now-pointless `/akili-execute` command; its §3.1 heading sits under *"Active specs"*), plus `family.md`'s `FR-8` row. All three are outside the spec-branch writable set and are recorded as pending items rather than edited here. **No reference is broken by this archive.**
