# Client lane report — sync-status-panel T-05, T-04, T-06, T-07, T-08

Commit: `283d9365` `feat(result-sidebar): show the PRMS sync status card and history`
Branch: `AC-1675-Syncronization-of-bilateral-status-in-PRMS`. Not pushed.

## What shipped

- Shared formatter `formatSyncStatus` / `deriveHeadline` (`prms-sync-status.util.ts`), used by both the card and the modal.
- `GET_PrmsSyncHistory` → `results/${resultCode}/prms-sync/history` (no version segment).
- `app-prms-sync-card` and `app-prms-sync-history-modal` (`p-dialog`). No "See what changed" control.
- Sidebar: card when `events.length > 0`; legacy `PRMS code #…` when events are empty and `prmsResultCode()` is set; nothing when both are absent; spinner while the deferred request is in flight; nothing (and no error text) when the request fails. The PRMS SYNC button is untouched. Opening the modal does not issue a second GET.

Host for the deep link is `environment.prmsUrl`. The button is omitted when `prms_result_code` or `prms_phase_id` is null; the `PRMS ID:` line stays when the code is present.

New component html/scss: `grep -oE '#[0-9A-Fa-f]{3,6}'` returned no matches. `npm run lint -- --quiet` clean. `ng serve` (port 4201) compiled the result chunk with no errors in these files.

## Falsifiers observed red, then reverted

| Mutation | Result |
|---|---|
| T-05a `status ?? decision` | stray STAR decision expected Pending Review, received Approved |
| T-05b collapse branch 3 | expected `Mapping re-synced`, received `Mapping re-synced after rejection` |
| T-04 `v1/results/...` | URL assertion failed |
| T-06a drop `?phase=` | href `.../452` ≠ `.../452?phase=6` |
| T-06b suppress on code only | null phase rendered the Open button |
| T-06c raw `{{ event.status }}` | DOM contained `PENDING_REVIEW` |
| T-07a unconditional comment | expected 1 comment block, received more |
| T-07b reverse sort | first headline was no longer `PRMS approved the mapping` |
| T-07c add See what changed | absence assertion failed |
| T-08a delete legacy branch | `sidebar-prms-result-code` was null |
| T-08b collapse loading | loading testid was null while the deferred observable was in flight |

## Legacy spec clusters

`result-sidebar.component.spec.ts` lines around 344/356/364 and 2429/2437 stayed green without edits. Empty history plus a code still renders the same `PRMS code #…` line, so the failing run did not name them. New fixtures cover card / legacy / neither / failed / loading.

## Suite

`npm test -- --silent` (default workers) exited 1 three times, each time a different unrelated suite (`get-anticipated-users`, `portfolio-2-alignment.mapper`, `lever-sdg-target`) with `SIGSEGV` / worker killed. No assertion failures. `--runInBand` OOM'd at ~4 GB (Node 24).

`npm test -- --silent --maxWorkers=2`: **Test Suites: 328 passed, 328 total. Tests: 7397 passed, 7397 total.**

`npx tsc -p tsconfig.spec.json --noEmit` reported no errors in the new spec files. Pre-existing errors in `result-sidebar.component.spec.ts` and `api.service.spec.ts` are outside the new tests.

## Not done (T-09)

No authenticated click-through. This checkout's `environment.ts` has `production: true` and no `localAuthBypass`, so the app redirects to Cognito. The process on port 4200 is a different checkout (`Documents/CIAT/...`), not this worktree. Approved-by-PRMS and Returned-by-PRMS were not compared to the mockups in light and dark. A failed history read hides the legacy line (design §7.2); that is what the sidebar shows until `GET .../prms-sync/history` succeeds. The server handler `@Get('history')` is already on this branch.
