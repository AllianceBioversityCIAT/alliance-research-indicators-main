# Kaizen Entry — changes/dashboard-narrative-pass

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/dashboard-narrative-pass` |
| Date | 2026-08-24 |
| Branch | bilateral-visual-improvements |
| Archive Run | 1 |
| Approval Mode | gated (owner fast-mode chain directive at launch; exceptions + HITL stopped) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 7/7 (+1 HITL-finding remediation inside T-07) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-06 ×1 — stale line citations + single-mechanism wording) | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| HITL findings | 1 (heatmap label contrast) — remediated + reviewed + closed in-run | execution.md T-07 |
| Runtime failures | 2 session-limit interruptions (T-05) — parked/resumed, 0 attempts lost | execution.md T-05 |
| Budget vs actual | tasks 7/7 (=) · review rounds 1 vs 2 (under) · LOC ≈ +2,900 vs 1,150–1,650 (~2×, test-heavy) | design.md §13 · execution.md §3 |
| /akili-quick escalation | Yes — origin was a /akili-quick that failed the triviality gate and escalated correctly | proposal.md |

## Lessons

- **KZ-changes--dashboard-narrative-pass-1 — An exemplar pointer must be checked against the new spec's own binding rules before it is named.** (Product + Methodology, Medium)
  - Root cause: the Leader's exemplar-briefing practice names the most-similar existing file without auditing it against the NEW spec's gates. T-07's fix brief named F4's `contrastingLabelColor()` as the exemplar — which itself returns `var()` literals, i.e. copying it verbatim would have FAILED the brief's own "zero `var(--` in options" gate. The Implementer caught it and deviated; a weaker worker would have shipped the exemplar's defect and burned a rework round on an instruction conflict the brief created.
  - Evidence: execution.md — T-07 remediation entry ("exemplar deviation adjudicated CORRECT: the exemplar is the one that's wrong vs D-DN-5"); dn-t05's report FIX item 3.
  - Standardization: → P1 (local persona edit) + upstream recommendation to the AKILI repo (`/akili-execute` §2.2 exemplar bullet has the same gap — nothing project-specific in the lesson).

## Noted, not a lesson

- **LOC calibration recurrence** — handled as P2 (digest-update), not a duplicate lesson: F4's lesson 2 (prod+test split) under-corrected; even the split estimate ran ~2× low here.
- Park/resume on session limit held for the **second** time (zero attempt loss both times) — the winding-down protocol is proving itself; nothing to change.
- The in-run HITL-finding loop (gate → finding → bounded fix → review → close, same day) worked exactly as the defect-class table intended — pattern worth keeping visible, no rule change needed.
- Concurrent-worker file churn made line-number citations stale within minutes (T-06 FAIL cause) — the fix (stable DOM anchors, never line numbers, in constitution-grade docs) is embedded in T-06's PASS; if a third spec repeats the stale-citation failure, that becomes a template lesson.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` (Delegation Discipline — exemplar-file briefing bullet; append-only) |
| Edit | Add: "Before naming an exemplar, check it against the NEW spec's own binding rules (design decisions, gates); name any known divergence in the brief — an exemplar that violates the task's gate is an instruction conflict the worker must not have to resolve alone (measured 2026-08-24, dashboard-narrative-pass T-07: the named exemplar violated D-DN-5)." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-changes--project-dashboard-v3--f4-advanced-insights-2 |
| Severity | Medium (recurrence +1) |
| Edit | Add source spec `changes/dashboard-narrative-pass` (LOC ≈ 2× even against a split estimate: +2,900 vs 1,150–1,650). Recurrence note: calibrate budgets against the MEASURED actuals of the last two specs (F4: +4,100 vs 1,300–1,700; DN: +2,900 vs 1,150–1,650 — both ≈2-2.5×), not intuition; the split alone does not fix the multiplier. |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `client/research-indicators/src/CLAUDE.md` (Conventions → Charts bullet) |
| Edit | Append one line: "Non-echarts data surfaces are limited to the declared idioms in `docs/ux-ui/design.md` §8 (chart idiom registry — composition strip); everything else renders through `viz-chart` (`layout=\"viz-bar\"` for rankings). Colors fed into echarts options must be RESOLVED token values, never `var(--…)` strings (D-DN-5, dashboard-narrative-pass)." |
| Severity | Medium |
| Status | pending |
