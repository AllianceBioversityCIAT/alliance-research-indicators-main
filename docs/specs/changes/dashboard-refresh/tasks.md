# Tasks — Changes / Project-dashboard refresh
- **Budget:** 2 tasks · ≈120 LOC · 1 review round each. Commands from `client/research-indicators/`; targeted jest with `--coverage=false` (K-020).

### T-01 — Invalidate dashboard caches on route leave
- **Req:** R-DRF-001 (scenario + BUT/AND IT MUST) · **Design:** DD-1
- **Files:** `get-contract-dashboard.service.{ts,spec.ts}`, `get-contract-insights.service.{ts,spec.ts}` (add `invalidate(contractId?)` mirroring `get-project-detail.service.ts`), `project-detail.component.{ts,spec.ts}` (`ngOnDestroy` calls the three invalidations; CLARISA's already exists).
- **Tests (K-004 red first):** service spec: load X → invalidate(X) → load X issues a 2nd HTTP call (red if invalidate is a no-op); load Y untouched by invalidate(X). Component spec: destroy → the three `invalidate` spies called with the contract id (red if a call is missing). KZ-015: arrange loaded state, then destroy.
- **Done:** targeted jest green after reds; `npm run build`; spec-tsc = 938; bare eslint. **Disqualifier:** a spy-only assert on the component without the service-level HTTP re-issue test proves nothing (KZ-001).
- Skills: `angular-developer`, `tdd` · Effort: medium · Deps: none · **Status:** todo

### T-02 — Refresh button + `refreshAll()`
- **Req:** R-DRF-002 (scenario + BUT/AND IT MUST), NFR-DRF-001 · **Design:** DD-2..4
- **Files:** `project-dashboard.component.{ts,html,spec.ts}` only.
- **Tests (K-004 red first):** click → 4 loads called with force/invalidate (red if one dropped); `disabled`+`aria-busy` true during in-flight promise, false after `allSettled` (arrange a pending promise, resolve, assert transition — KZ-015); `generateExecutiveOverview` spy NOT called; button absent/disabled while `getProjectDetailService.loading()`; `document.activeElement` remains the button after refresh.
- **Done:** targeted jest green; `npm run build`; spec-tsc = 938; eslint; hex grep on html clean. Owner visual glance on D514 (declared jsdom gap).
- Skills: `angular-developer`, `ui-ux-pro-max`, `tdd` · Effort: medium · Deps: T-01 · **Status:** todo
