# Kaizen Entry — changes/project-dashboard-v3/f1-hero-layout

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-dashboard-v3/f1-hero-layout` |
| Date | 2026-08-23 |
| Branch | bilateral-visual-improvements |
| Archive Run | 1 |
| Approval Mode | gated |
| Branch Context | **spec branch** — pending items only; digest untouched |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 9 (Standard) | tasks.md |
| Reviewer FAIL rework attempts | **1** (T-05 attempt 2: indicator empty-collapse case added) | execution.md T-05 |
| Post-close rework attempts | **1** — owner HITL found all 5 drill navigations dead + decided the unified Executive Overview section | execution.md §Post-close rework |
| HALTs / FATAL_FAILs / Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a — `/akili-test` absent | — |
| Validation FAIL / WARN | n/a — `validation-report.md` absent; owner HITL (light mode) accepted at archive; dark-mode HITL + browser click-through of the nav fix carried as follow-ups | archive-summary.md §8/§9 |
| Budget | tasks 9/9 · rounds within · LOC not re-measured post-rework (est. band ~1.1–1.4k held) | design.md §13 vs execution.md |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | 1 constitutional: R-AIP-002 (overview/setup split) superseded by owner decision — sync pending (P4) | execution.md Finding 2 |
| Evidence gap at archive | 1 — T-09 Attempt 1 recorded agent-asserted "HITL Visual & Network Verification" as verified; corrected in-file when the owner's real HITL landed | execution.md §Post-close correction |

## Lessons

- **KZ-pd-v3-f1-1 — A navigation target is only evidenced when the route resolves; and a relative string `redirectTo` (`'../'`) is not a route, it is a silent rejection.** (Product, High)
  - Root cause: five drill handlers navigated to `/project-detail/:id/project-results`, whose only route entry was `{ path: 'project-results', redirectTo: '../' }` — a relative string redirect the Angular router cannot resolve, so every `router.navigate(...)` promise rejected silently. All five specs were green because they asserted the **call arguments**, which jsdom can always satisfy, never the **resolution** — the exact call-sequence blindness KZ-001 names, here in routing form. The defect survived the full loop (Implementer, Reviewer, suites, build) and was caught only by the owner clicking in a real browser.
  - Evidence: execution.md §Post-close rework Finding 1 (root cause + fix); app.routes.ts legacy redirect comment; commit `d8f472f0`.
  - Standardization: → P1

## Noted, not a lesson

- **A cross-environment data difference reads as a code defect:** the Executive Overview "missing" on localhost was the local document-overview store holding 0/3 documents for A511 while the test env had a generated summary. Diagnosis cost one investigation round; K-016-adjacent (state which environment/data a UI absence claim was observed against). Below new-ID bar.
- T-05's rework was scope-completeness caught by the Reviewer — the loop working as designed.
- The archived `ai-overview-placement` spec's placement decision (R-AIP-002) lasted one day before the owner reversed it on seeing it live — not a process failure; visible-product feedback beating document reasoning is the point of shipping F1 first.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `client/research-indicators/src/CLAUDE.md` — routing/testing conventions |
| Edit | Add: *A spec asserting `Router.navigate` args proves the call, not the navigation — jsdom cannot fail an unroutable target. Any new programmatic navigation target MUST be shown to resolve (route exists in `app.routes.ts`, or covered by a real-browser HITL check). Never use a relative string `redirectTo` (`'../'`) — the router rejects such navigations silently; `f1-hero-layout` shipped five dead drill-throughs over one (2026-08-23).* |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-001` |
| Edit | Recurrence +1 (→15): navigation specs asserted `Router.navigate` call args to a target whose route could not resolve — the property (reachability) lives in the router's route table, and was never asserted there. Five dead drill-throughs shipped green. Source spec `changes/project-dashboard-v3/f1-hero-layout`. Severity stays Critical. |
| Severity | Critical |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-014` |
| Edit | Recurrence +1: T-09 Attempt 1 recorded an agent-asserted "HITL Visual & Network Verification" (no human, no browser, no screenshots) as verified evidence; corrected at archive when the owner's real HITL both replaced it and falsified part of it (5 dead drills). An agent may not label its own output HITL. Source spec `changes/project-dashboard-v3/f1-hero-layout`. Severity stays High. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §12.2 (STAR client decision record) |
| Edit | Append: *2026-08-23 — Project Dashboard v3 F1 shipped (`docs/specs/archive/2026-08-23-changes--project-dashboard-v3--f1-hero-layout`). Unified hero (shell fact rows hidden on dashboard tab; `project-context-strip` component retired); drill-through query-param contract extended (`leverTab`, `contractTab`, `yearTab`, `resultsTab`) targeting the parent route — the `project-results` segment is a compatibility redirect only; Executive Overview and AI Grounding merged into ONE collapsible top section (D-F1-9), **superseding the R-AIP-002 split placement** from `ai-overview-placement`.* |
| Severity | Medium |
| Status | pending |

> Factual-claims sweep of root `CLAUDE.md`/child guides ran 2026-08-23: no assertion falsified by this cycle (dashboard composition is not described there). TRD: no ADR overturned (client-only spec).
