# Kaizen Entry — changes/project-dashboard-redesign

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-dashboard-redesign` |
| Date | 2026-08-22 |
| Branch | bilateral-visual-improvements |
| Archive Run | 1 |
| Approval Mode | gated |
| Branch Context | **spec branch** (`bilateral-visual-improvements` ≠ `origin/main`) — pending items only; digest untouched |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 12 | tasks.md |
| Reviewer FAIL rework attempts | **2** (T-05×1, T-10×1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a — `/akili-test` / `test-report.md` absent | — |
| Judgment-day severe findings | **4** (S1–S4), all fixed at specify; re-judgment waived | judgment.md |
| Validation FAIL / WARN | n/a — `validation-report.md` absent; HITL accepted at archive | user override |
| `/akili-quick` escalations | 0 | quick-log.md |
| Drift attributable | ux-ui §11 DarkMode / `.dark-mode` vs `data-theme` (D-PD-14) | design.md D-PD-14 |

## Lessons

- **KZ-changes--project-dashboard-redesign-1 — Envelope false is TP-resolved, not HttpClient-rejected.** (Product, Medium)
  - Root cause: T-05's red-input was written as if `req.error()` hit `catch {}`. `ToPromiseService.TP` maps success to `successfulRequest: true` and `catchError`s HTTP errors into a **resolved** `{ successfulRequest: false }` — the `catch` block is unreachable in production, and flushing `successfulRequest: false` on HTTP 200 is overwritten to `true`.
  - Evidence: execution.md — T-05 Attempt 1 Reviewer FAIL + Attempt 2 Implementer note on `to-promise.service.ts:21-35`.
  - Standardization: → P1

## Noted, not a lesson

- T-10 FAIL: retry buttons missing `!min-h-[44px] !min-w-[44px]` — one-line WCAG 2.5.5 miss, below a new-ID bar.
- HITL never landed (Swagger, 401 curl, Dev A1676, D6 screenshots). Same family as KZ-014 (already Applied); not a third ID.
- Judgment S1 path-vs-query contradiction was closed in the specify fix-only round — no execute rework.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `client/research-indicators/src/CLAUDE.md` (mirror `AGENTS.md`) |
| Edit | Under HTTP conventions, add: `ToPromiseService.TP` always **resolves**. Envelope `successfulRequest: false` arrives via TP `catchError`, not `HttpClient` rejection. Red-input that `req.error()` into a service `catch {}` does not prove the production branch. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-014` |
| Edit | Recurrence +1: T-05 Attempt 1 labeled “(red input)” on a path that did not exercise `successfulRequest === false` as the task stated. Source spec `changes/project-dashboard-redesign`. Severity stays High. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/ux-ui/design.md` §11 / shipped-dark-mode row |
| Edit | Replace “`DarkModeService` adds `.dark-mode` to `<body>`” with the mechanism-of-record: theme is `data-theme` on `:root`; `DarkModeService` signal exists but has **no** production toggle call sites (D-PD-14, 2026-08-21). PrimeNG `darkModeSelector` / `.dark-mode` mismatch stays an open platform item, not dashboard scope. |
| Severity | Medium |
| Status | pending |
