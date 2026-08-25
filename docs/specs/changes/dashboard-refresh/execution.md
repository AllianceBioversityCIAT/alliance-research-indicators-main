# Execution Log — docs/specs/changes/dashboard-refresh

## Document Control
- Lite · owner-approved 2026-08-25 · Leader Claude (Fable 5) · Implementer akili-implementer (sonnet) · Reviewer akili-reviewer (opus)

## Task Execution History

## T-01 — Invalidate dashboard caches on route leave — attempt 1 (2026-08-25)
- **Implementer (impl-t01, sonnet, medium):** `invalidate(contractId?)` added to dashboard + insights services (single-slot adaptation: clears only when the loaded id matches or no id given); `project-detail.component.ts` `ngOnDestroy` invalidates dashboard, insights AND CLARISA (CLARISA's method pre-existed with **no call site anywhere** — a documented prior reviewer finding at `get-clarisa-project.service.ts:28-30`; this task closes it). Reds verbatim: `TypeError: service.invalidate is not a function` (×2 services), component `Expected: "mock-id" / Number of calls: 0`. 79/79 green; spec-tsc 942; eslint clean. 121+/0-.
- **Reviewer (opus): STATUS: PASS (conditional on the build gate, Leader-run).** Verified re-issue at the HTTP layer (`expectOne` after flush, `expectNone` for the other-id clause); `data()` correctly NOT cleared (codebase convention: consumers compare `loadedContractId()` before trusting `data()`); 14 consumer files all inside the project-detail subtree — no longer-lived reader; tab switches don't destroy the parent.
- **Advisories (recorded):** (a) **for T-02:** CLARISA's pre-existing `invalidate` only deletes the memo entry and leaves `loadedContractId`/`data` intact → during `refreshAll()` a convention-following consumer keeps trusting the pre-refresh payload for the in-flight window — decide the in-flight contract in T-02 (Leader ruling: same-contract stale-until-replaced is the intended refresh UX; no clearing, no skeleton); (b) `update()` no-ops when `loadedContractId` is null — ordering matters once T-02 adds Refresh + "Try again"; (c) tasks.md tsc baseline updated 938→942 in T-01/T-02.
- **Gate outstanding:** `npm run build` — deferred until no worker is active in the package (§4.3); commit follows the build.

> **Batch gates (Leader, in isolation, 2026-08-25, both workers idle):** `npm test -- --silent` → 323 suites, **6,934/6,934** green (+39 vs 6,895 pre-batch); `npm run lint -- --quiet` → all files pass; `npm run build` → complete (only the 3 pre-existing warnings; `project-dashboard` chunk 1.22 MB / 311.59 kB). Note: the first two build attempts failed ONLY on Google-Fonts inlining because the Leader shell sandbox blocks Node fetches — compiler step had zero TS/NG errors both times; re-run outside the sandbox succeeded. Not a code signal.
- **T-01 final: PASS** — build gate discharged by the batch build above; committed by pathspec (services + project-detail component + specs).
