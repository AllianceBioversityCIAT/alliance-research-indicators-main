# Kaizen Entry — innovation-use/excel-export

## Document Control

| Field | Value |
|---|---|
| Spec Path | `innovation-use/excel-export` (AC-1681) |
| Date | 2026-10-06 |
| Branch | AC-1681-Include-the-Innovation-use-data-in-the-excel-export (Branch Context: **spec** — current ≠ `main`, the default resolved from `origin/HEAD`; no `Default Branch:` / `Integration Branch:` pins) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 7 (T-01…T-07; T-05 `[~]`, human gates open) | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-01 ×1 — NULL catalog level; T-02 ×1 — 7 issues from 2 lens reviewers) | execution.md — T-01 Attempt 1; T-02 Attempt 1 |
| HALTs / FATAL_FAILs | 0 / 0 | execution.md |
| Pivots | 2 Pivot Records (T-02 DD-4/NFR-IUX-001; QA feedback → T-06) + 2 amendments (NFR-IUX-002 scoping; linked-dev hyperlink → T-07) | execution.md — `## Pivot Record: T-02`, `## Pivot Record: QA feedback`, `## Spec amendment (2026-10-06)` |
| Stopped measurement probes | 1 (index probe cancelled by the user mid-run) | execution.md — Pivot Record: T-02 |
| PRODUCT_BUGs | n/a — `/akili-test` not run (accepted) | archive-summary.md |
| Judgment-day severe findings | 2 SEVERE (JD-1, and one more in round 1) | judgment.md |
| Validation FAIL / WARN | n/a — `/akili-validate` not run (accepted) | archive-summary.md |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 1 environmental, caught at HITL: `Cannot merge already merged cells` on the shared Dev DB (premise P-11 false on Dev) — not in a skipped task | execution.md — T-07 "Dev finding (2026-10-06)" |

## Lessons

- **KZ-innovation-use--excel-export-1 — A performance gate was set stricter than anything the project already holds, then measured where it cannot be settled.** (Product + Methodology, High)
  - Root cause (5W1H): at specify time the Leader wrote NFR-IUX-001 as "each lateral read by its `result_id` index **and** Phase 2 ≤ 20% slower". No existing `report_*` view is held to either bar, and the user's ask was only "priorizar la optimización". Both properties are cost-based. On a disposable schema with ~70 rows per role, MySQL picked role and `PRIMARY` indexes, and timing rose 75 → 126 ms. The gate went red on a design that was correct. The result was a Pivot, a cancelled index probe, an NFR amendment, and the user's "no tengo ni idea por qué se te está complicando tanto".
  - Evidence: execution.md — `## Pivot Record: T-02` (DD-4 STOP RULE, +68% timing, user decision "Aceptar y enmendar"); requirements.md NFR-IUX-001 "Amended 2026-10-06".
  - Standardization: → P1 (local), P2 (upstream)

- **KZ-innovation-use--excel-export-2 — An open question with a due gate passed its gate unasked, and the answer arrived after the build as rework.** (Product + Methodology, Medium)
  - Root cause (5W1H): requirements.md §10 OQ-1 ("confirm header labels and line formats with the product owner") was due "before T-01 closes". Nothing in the execute loop checks OQ due gates at task boundaries, so OQ-1 rode along to T-05 as a rollout item. QA then removed 3 of the 9 exported cells and re-ordered one, and asked for a hyperlink. That produced T-06 and T-07: 2 new migrations (the applied ones could not be edited), ~1,990 extra diff lines and 2 more review rounds.
  - Evidence: requirements.md §10 OQ-1 (Due: "before T-01 closes"); execution.md — `## Pivot Record: QA feedback (2026-10-06) → T-06` and `## Spec amendment (2026-10-06): linked dev as a hyperlink → T-07`.
  - Standardization: → P3 (local), P4 (upstream)

## Noted, not a lesson

- The Dev-only Innovation Development layout (`INNOVATION DETAILS 61–87`, OICR `88–101`) overlapped our 75–80 band. Premise P-11 was UNVERIFIED (Dev `ETIMEDOUT`) and correctly carried as gate G5; the failure surfaced at HITL before any deploy. Also: `ExcelWorkbookBuilder.renderPreamble` throws on overlapping groups instead of failing with a named cause — a resilience gap in shared code, below the lesson bar for this spec.
- The Leader released a 91%-context worker after a FAIL, contrary to the user's "keep the worker until PASS" rule. Corrected in user memory, not repeated.
- The Cursor CLI queued a mid-turn "STOP" follow-up instead of steering, and needed an Enter to take effect (orchestration transport quirk).
- Scratch could not reach HEAD again (errno 3780, P-13) — recurrence of the known harness defect (OPEN-ITEMS FU-2).
- The T-07 red run was observed by remove-then-restore, not pins-first (deviation recorded). T-04 falsifier (d)'s prediction "jest stays green" was false, because ts-jest type-checks.
- 5 fixture suites fail in Nest bootstrap on this branch (`ResultPolicyChangeModule`) — pre-existing (FU-3).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` (NFR section) |
| Edit | A performance NFR must cite its bar's source — a precedent the project already holds, or the user's explicit ask. Measured on a disposable schema, it gates only **plan structure** (merge, per-row correlation, no duplicates); access paths and timing are recorded readings, never gates. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | `/akili-specify` NFR guidance: require each performance target to cite its source (project precedent or user ask), and forbid cost-based properties (index choice, latency %) as gates when the only measurement surface is a disposable/seeded schema — record them as readings and hand real-volume checks to a rollout gate. (KZ-innovation-use--excel-export-1) |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` (append, Primary Instructions › Traceability) |
| Edit | At every task's continue gate, list the requirements' open questions whose due gate names that task; an OQ due "before T-n closes" is asked before T-n is marked `[x]`, never carried to rollout. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | `/akili-execute` Step 5 (continue gate): add an OQ due-gate check — open questions in `requirements.md` whose `Due` names the closing task must be asked at that gate, under any approval mode. (KZ-innovation-use--excel-export-2) |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/specs/innovation-use/OPEN-ITEMS.md` §3.3 |
| Edit | Repoint `[`excel-export/execution.md`](excel-export/execution.md)` → `[`archive/2026-10-06-innovation-use--excel-export/execution.md`](../archive/2026-10-06-innovation-use--excel-export/execution.md)`. Extend G5: "Dev-only Innovation Development rows (`INNOVATION DETAILS 61–87`, OICR `88–101`) overlap the 75–80 band (`Cannot merge already merged cells`); its removal must revert those layout rows." Update the heading line "T-01…T-04 … (unpushed)" → "T-01…T-04, T-06, T-07 … (pushed)". |
| Severity | Medium |
| Status | pending |
