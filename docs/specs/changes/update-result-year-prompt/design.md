# Design — Results / "Update result" asks for the viewed version's year first

## 0. Document Control & Budget

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/update-result-year-prompt` |
| Requirements | `requirements.md` (R-URP-001..004, S-1..S-11, NFR-URP-001..003) |
| Baseline commit | `162348264` |
| Depth | Standard (narrow), re-checked at Step 2.4: still fits |
| Gate log | Phase 2: judgment-day round 1 (2026-10-09). The judges confirmed 8 findings; all were fixed in this revision (see `judgment.md`). Round 2 (scoped re-judgment): all 13 rows resolved; N-1 to N-3 folded in. Terminal: APPROVED |

**Budget (tripwire for `/akili-execute`).** Task IDs are provisional until `tasks.md` exists.

| Metric | Expected |
| --- | --- |
| Tasks | 4. T-01 is the server field, T-02 is the shared alert plus the pipe, T-03 is the version selector, T-04 is the HITL check |
| LOC | About 380, of which about 240 are tests |
| Review rounds | 5: one per code task (3), plus 2 spare |

## 1. Executive Summary

The work is almost entirely client-side, with one additive server field.

- **Version selector.** `version-selector.component.ts` picks the offered year and decides between the year prompt and the year picker. It builds both as `GlobalAlert` configs.
- **Shared global alert.** It gains three **opt-in** options: an info card, an exclusion list for the selector (applied through a pure pipe, so the options array stays stable), and a "swap to" alert that Cancel switches to **in place**.
- **Server.** `findResultVersions` adds `updated_at` to its `select`.

The update request and its success and error handling move, unchanged, into one private method that both paths call.

## 2. Architecture Overview

```
Update result click
  └─ VersionSelectorComponent.updateResult()
       ├─ if updating() → return                       (S-11)
       ├─ updating.set(true); await yearsService.main(); updating.set(false)
       ├─ offered = selected chip ?? max-year version  (S-10)
       ├─ offered && yearsService.list().some(y => y.report_year === offered.report_year_id) ?
       │      no ──► actions.showGlobalAlert(pickerAlert([]))                  (today, S-3)
       │      yes
       └─► actions.showGlobalAlert(promptAlert(offered, cancelSwapsTo = pickerAlert([Y])))
              ├─ "Yes, update Y" (confirm) ─► submitReportingCycle("Y") ; closeAlert(i)
              ├─ "No, choose another year" ─► GlobalAlertComponent.onCancel(alert, i)
              │        └─ actions.replaceGlobalAlert(i, pickerAlert([Y]))   (same index, no clearService)
              │              └─ picker: Confirm ─► submitReportingCycle(selected) ; closeAlert(i)
              │                         Cancel / × ─► closeAlert(i)
              └─ × ─► closeAlert(i)   (no request)
```

## 3. Extended Directory Structure

```
client/research-indicators/src/app/
├── shared/interfaces/global-alert.interface.ts               (M) + infoCard, selectorExcludeValues, cancelSwapsTo
├── shared/interfaces/get-transform-result-code.interface.ts   (M) + updated_at?: string | null
├── shared/pipes/exclude-years.pipe.{ts,spec.ts}               (N) pure pipe
├── shared/services/actions.service.{ts,spec.ts}               (M) + replaceGlobalAlert(index, alert)
├── shared/components/global-alert/global-alert.component.{ts,html,spec.ts} (M)
└── pages/platform/pages/result/components/version-selector/
    └── version-selector.component.{ts,spec.ts}                (M)
server/researchindicators/src/domain/entities/results/
└── results.service.{ts,spec.ts}                               (M) select + updated_at
```

## 4. Data Model

There is no schema change. `results.updated_at` already exists on `AuditableEntity` and is **nullable** (P-12). For a snapshot it holds the live row's `updated_at` at the time of versioning, because `SP_versioning` copies `r.updated_at` (P-6).

## 5. API Design

`GET results/versions/:code` adds `updated_at` (ISO datetime or `null`) to each item in `live[]` and `versions[]`. The change is additive (R-URP-004, NFR-URP-002).

The client interface `GetVersions` types `live`/`versions` as single objects, not arrays (P-13). That mismatch predates this spec. Do **not** change it here.

## 6. Backend Module Design

`ResultsService.findResultVersions` adds `updated_at: true` to the shared `select` constant (P-4). Nothing else changes.

## 7. Frontend / UX Component Architecture

### 7.1 Shared alert: opt-in options (R-URP-001, R-URP-003, NFR-URP-003)

| Option | Effect when set | When absent |
| --- | --- | --- |
| `infoCard: { badge, caption }` | Renders a bordered card below the detail: a chip with `badge` (background `var(--ac-green-500)`, white text) and `caption` as muted text. Uses tokens only; no hex literals (CLAUDE.md "Colors & spacing") | Nothing is rendered |
| `selectorExcludeValues: number[]` | The `p-select` binding changes from `[options]="this.service?.list()"` (P-10) to `[options]="this.service?.list() \| excludeYears: alert.selectorExcludeValues"` | The pipe returns its input reference unchanged, so options are identical to today (S-8) |
| `cancelSwapsTo: GlobalAlert` | Cancel calls `onCancel(alert, $index)`, which runs `cancelCallback.event` if set, then: clears the auto-hide timeout for that index, calls `actions.replaceGlobalAlert(index, alert.cancelSwapsTo)`, resets `body` (`selectValue`, `commentValue`) and `showReportedWarning`, and does **not** call `closeAlert` | `onCancel` runs the event, then `closeAlert(index)`, as today |

- **`excludeYears` pipe.** It is standalone and `pure: true`, and it is added to `GlobalAlertComponent.imports`; the strictTemplates build catches an omission.
- **Spec mocks.** The `ActionsService` mock in `global-alert.component.spec.ts` gains `replaceGlobalAlert`, or the spec uses the real service; JD-12.
  - **Input:** `(list: GetYear[] | undefined, exclude?: number[])`.
  - **No exclusion:** it returns `list` itself when `exclude` is empty or absent.
  - **Exclusion:** it returns `list.filter(y => !exclude.includes(y.report_year))`.
  - **Why a pure pipe:** it recomputes only when the `list()` reference or the `exclude` reference changes, so `p-select` gets a stable array across change-detection passes.
  - `onSelectChange` keeps reading the unfiltered `optionsList`, which is a superset, so its lookup still works.
- **`replaceGlobalAlert(index, alert)`.** This is `globalAlertsStatus.update(prev => prev.map((a, i) => i === index ? alert : a))`.
  - It does **not** call `clearService`. The version selector has just refreshed `GetYearsByCodeService` (§7.2), so the list is current, and this avoids a second request and an empty-list flash.
  - The same overlay DOM node is kept because the template uses `track $index` and binds no enter animation (P-8, P-11).
- **The × icon is unchanged.** It still calls `closeAlert` and never swaps (S-7). The picker reached by a swap has no `cancelSwapsTo`, so its Cancel closes.
- **Single-use configs.** `alertList` mutates every alert it maps: icon, color, buttonColor, and the default cancel label (P-11). `pickerAlert(...)` is therefore built fresh on every click, and a swapped-in object is never reused.

### 7.2 Version selector

- **New injection and state:** `GetYearsByCodeService` (root singleton, P-7) and `updating = signal(false)`.
- **`updateResult()` (async):**
  1. If `updating()` is true, return (S-11). Otherwise set `updating` to true, run `await yearsService.main()` inside `try/finally`, and reset `updating` in the `finally`.
     - `main()` never throws, because `ToPromiseService` resolves `{ successfulRequest: false }` on error (P-9b).
     - On error or a non-array response, `main()` leaves `list` as `[]` (`Array.isArray` guard, P-7).
  2. Compute `offered` **after** the await:
     - the version in `approvedVersions()` whose `result_id === selectedResultId()`;
     - otherwise, the version with the highest `report_year_id` (S-10, D-3);
     - otherwise none.
  3. If there is no `offered`, or `yearsService.list()` has no item with `report_year === offered.report_year_id`, call `showPicker([])` (S-3).
  4. Otherwise call `showPrompt(offered)`.
- **`showPrompt(v)` builds:**

  | Field | Value |
  | --- | --- |
  | `severity` | `'confirm'` |
  | `summary` | `'CONFIRM UPDATING'` |
  | `detail` | Latest: `Do you want to update the most recent version of this result (Y)?`. Older: `Do you want to update the Y version of this result?` |
  | `infoCard.badge` | `'Y VERSION'` |
  | `infoCard.caption` | `'Latest reporting version'` or `'Reporting version'`, followed by ` · last updated {d MMM y}` only when the date is valid (see below) |
  | `cancelCallback` | `{ label: 'No, choose another year' }` |
  | `cancelSwapsTo` | `pickerAlert([Y])` |
  | `confirmCallback` | `{ label: 'Yes, update Y', event: () => submitReportingCycle(String(Y)) }` |
  | `buttonColor` | `'var(--ac-light-blue-400)'` — the token for the picker's `#035BA9`. `getIcon('confirm')` has no `buttonColor` (P-15), so omitting it would leave Yes on the PrimeNG default colour |

  - **"Latest":** `Y === max(report_year_id)` over `approvedVersions()`.
  - **Valid date:** `updated_at` is a non-empty string **and** `!isNaN(new Date(updated_at).getTime())`. This guard rejects `null`, which would otherwise parse to the 1970 epoch (S-4). Formatted with `formatDate(updated_at, 'd MMM y', 'en-US')`.
- **`pickerAlert(exclude)`.** Today's config, with `selectorExcludeValues: exclude` added. It keeps today's `buttonColor` value unchanged, so the existing picker's look stays identical.
- **`showPicker(exclude)`.** Calls `actions.showGlobalAlert(pickerAlert(exclude))`, which refreshes the list through `clearService` exactly as today.
- **`submitReportingCycle(year)`.** Today's confirm body, moved unchanged (S-5).

## 8. Shared Contracts or Package Extensions

| Contract | Change |
| --- | --- |
| `GlobalAlert` | +3 optional fields |
| `TransformResultCodeResponse` | +`updated_at?: string \| null` |
| `ActionsService` | +`replaceGlobalAlert` |
| New pipe | `ExcludeYearsPipe` |

All changes are additive.

## 9. Design Decisions

| ID | Decision | Rejected alternative | Req |
| --- | --- | --- | --- |
| D-1 | Extend the shared global alert with opt-in options and reuse it for both steps. The client guide says modals go through `all-modals`; this flow already lives in the global alert, the in-place swap needs one host, and the owner accepted reusing it at the Phase 1 gate | A new `all-modals` modal: it would duplicate the picker (warning, "Already reported") and force a close/open between steps | R-URP-001/003, NFR-URP-003 |
| D-2 | "No" swaps the entry in place through `onCancel`, `cancelSwapsTo` and `replaceGlobalAlert` | Close then `showGlobalAlert`, which the owner rejected (flicker) | S-6 |
| D-3 | The offered year is the selected chip; with none selected, it is the max `report_year_id`. "Latest" means the max | `versions[0]`, rejected because `find` has no `ORDER BY` (P-4) and nothing is selected on first load (P-14) | S-1, S-2, S-10 |
| D-4 | The prompt appears only when the offered year is in the allowed years | Always prompt, rejected because the server would accept a year the picker never offers | S-3 |
| D-5 | No overwrite warning on "Yes", following the owner's mockup. **Open:** the owner was asked on 2026-10-09 and has not answered yet; the HITL check (T-04) confirms it | The picker's warning text | S-1 |
| D-6 | Add `updated_at` to the versions response | Drop the date | R-URP-004 |
| D-7 | Exclude through a pure pipe on the `p-select` binding | Filtering the singleton `list` (leaks to other pickers, S-8); a template method or computed per change detection (new array each pass, unstable `p-select`) | S-6, S-8 |
| D-8 | Refresh the years once through `GetYearsByCodeService.main()`, and skip `clearService` on swap | A direct `api.GET_Years` plus `clearService` on swap: two requests and an empty-list flash | S-6 |
| D-9 | An in-flight guard on `updateResult()` | None today; the new await widens the double-click window | S-11 |

**Reversion challenge (Step 2.3).** On the first click, `updateResult()` no longer opens the picker when a prompt applies. Five existing tests in `version-selector.component.spec.ts` call `updateResult()` and read `showGlobalAlert`'s first argument or its `confirmCallback`:

- `:135`
- `:294`
- `:312`
- `:324`
- `:341`

The `ApiService` mock there has no years source, and `updateResult()` becomes async. T-03 owns all five tests:

- It mocks `GetYearsByCodeService`.
- It awaits `updateResult()`.
- It moves the `:294` "empty string when `data.selected` is undefined" case onto the picker path (S-3 fallback, or `cancelSwapsTo.confirmCallback`), because the prompt's "Yes" ignores `data.selected`.

No other surface opens this picker (P-2).

## 10. Risks & Open Questions

| # | Item |
| --- | --- |
| RK-1 | **Options rely on the last alert.** `alertList` sets `this.service` from the **last alert in the list**; an alert without `serviceName` sets it to `undefined` (P-11). A picker therefore shows its options only while it is the last alert. This is a pre-existing behavior, and the swap does not change it (the swap keeps one entry). Not fixed here |
| RK-2 | **Requests per click.** One years request per click; the swap adds no request (D-8). The S-3 fallback picker refetches through `clearService`, as today |
| RK-3 | **Repeated `main()` calls.** The service's constructor runs `main()` when the version selector is first created. If the user clicks before that request returns, the two responses race and the last write wins. Both use the current result id, so the data is the same. Harmless |
| O-1 | **Overwrite warning on "Yes" (D-5).** Waiting for the owner |

## 11. Premise Ledger

Count: 16 verified (P-1..P-15 plus P-9b), 0 `UNVERIFIED`.
Blast-radius triggers:
- `live-path` (user action: Update result): P-1, P-14.
- `shared-state` (shared global alert, `ActionsService.globalAlertsStatus`, `GetYearsByCodeService` singleton): P-7, P-8, P-9, P-11.
- `consumer` (`GET results/versions` shape, `GlobalAlert` and `TransformResultCodeResponse` interfaces, `p-select` options binding): P-2, P-5, P-10.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | The **Update result** click reaches `VersionSelectorComponent.updateResult()`. The button renders when `!hasLiveVersion` (no live row, or live status 6) and the platform is STAR or empty | live-path | `version-selector.component.html` `<span (click)="updateResult()"` inside `@if (!hasLiveVersion && (cache.getCurrentPlatformCode() === 'STAR' …))`; `hasLiveVersion` getter (`version-selector.component.ts:185`) | `162348264` | The change lands in the wrong place (**High**) | — |
| P-2 | No other code opens the `getYearsByCode` picker | consumer | `grep -rn "getYearsByCode" client/research-indicators/src/app` (non-spec) returns `version-selector.component.ts:199`, `service-locator.service.ts:243`, `services.interface.ts:43` | `162348264` | Other pickers would need the exclusion (Low) | — |
| P-3 | Allowed years are the active years from current−5 to current+2, each carrying `has_reported` | data-env | `report-year.service.ts` `getReportYear`; `report-year.repository.ts` `getAllReportYears` | `162348264` | D-4 eligibility changes (Low) | — |
| P-4 | `findResultVersions` selects 4 fields, has no `order`, and both `find` calls share one `select` | existence | `results.service.ts:760-792` | `162348264` | D-3 / D-6 change (Low) | — |
| P-5 | Consumers of `GET results/versions`: `version-selector.component.ts` `loadVersions`, `submit-result-content.component.ts:369`, and their specs, plus `api.service.spec.ts:1036`. None does an exact-shape `toEqual` that an added field breaks; the server spec's `toEqual` is on the mocked return | consumer | `grep -rn "GET_Versions\|results/versions" client/research-indicators/src server/researchindicators/src server/researchindicators/test` | `162348264` | An additive field breaks a test (Low) | — |
| P-6 | For a snapshot, `updated_at` is copied from the live row by `SP_versioning` | data-env | `1791468452856-UpdateSPVersionDeletePRMSPhase.ts` results INSERT: column `updated_at` at line 49, SELECT `r.updated_at` at line 71 | `162348264` | The caption means something else (Low) | — |
| P-7 | `showGlobalAlert` calls `clearService`, which empties `list` and re-runs `main()`. `GetYearsByCodeService` is a root singleton whose `main()` sets `list` to the response data only when it is an array, otherwise `[]` | shared-state | `actions.service.ts:182-187`; `service-locator.service.ts:99-109`; `get-years-by-code.service.ts` `@Injectable({ providedIn: 'root' })`, `main()` `Array.isArray(response?.data)` | `162348264` | D-8 shows a stale or empty list (Low) | — |
| P-8 | The global alert renders `@for (alert of this.alertList(); track $index)`. Cancel is `cancelCallback?.event?.(); closeAlert($index)` (`:91`); × is `closeAlert($index)`; `closeAlert` resets `body` but not `showReportedWarning` | shared-state | `global-alert.component.html:1`, `:91`; `global-alert.component.ts` `closeAlert` | `162348264` | The swap re-creates the node, or "No" also closes (**High**) | — |
| P-9 | `globalAlertsStatus` is written only by `showGlobalAlert` (append) and `hideGlobalAlert` (filter). Its only reader is `GlobalAlertComponent.alertList`, mounted once in `app.component.html` | shared-state | `grep -rn "globalAlertsStatus" client/research-indicators/src/app` (non-spec) returns `actions.service.ts:34,186,190`, `global-alert.component.ts:56`; `grep -rln "app-global-alert"` returns `app.component.html` | `162348264` | Another writer races the swap (Low) | — |
| P-9b | `ToPromiseService` never rejects: errors resolve to `{ ...error, successfulRequest: false }` | data-env | `to-promise.service.ts` `catchError(error => [{ ...error, successfulRequest: false, … }])` | `162348264` | `main()` could throw and leave `updating` stuck; the `try/finally` covers it either way (Low) | — |
| P-10 | `p-select` options bind directly to `this.service?.list()`. `optionsList` is used only by `onSelectChange` | consumer | `global-alert.component.html:27` `[options]="this.service?.list()"`; `global-alert.component.ts:69`, `:170` | `162348264` | Filtering `optionsList` would change nothing visible (**High**) | — |
| P-11 | `alertList` mutates each alert (icon, color, buttonColor, default cancel label) and sets `this.service` from each mapped alert in turn, so the last alert wins and an alert without `serviceName` sets it to `undefined`. The `alertAnimation` trigger is declared but not bound in the template | shared-state | `global-alert.component.ts:55-79`; `grep -n "@alertAnimation" global-alert.component.html` returns 0 hits | `162348264` | Reused configs carry stale fields; a bound animation would flash on swap (Low) | — |
| P-12 | `updated_at` is nullable | data-env | `auditable.entity.ts:19-24` (`nullable: true`) | `162348264` | The null guard is unnecessary (Low) | — |
| P-13 | `GetVersions` types `live`/`versions` as single objects; the client normalises with `getVersionsArray` | existence | `get-versions.interface.ts:4-5`; `version-selector.component.ts` `getVersionsArray` | `162348264` | — (recorded so T-03 leaves it alone) (Low) | — |
| P-14 | With a live row in status 6 and no `?version=`, `handleVersionSelection` selects nothing on first load. `applyCachedVersions` later selects `versionsList()[0]`, whose order is unspecified | live-path | `version-selector.component.ts:140-165` (branches need `status !== 6` or `!liveData`), `:106-115` | `162348264` | D-3's fallback is unnecessary (Low) | — |
| P-15 | `getIcon('confirm')` returns `{ icon: 'pi pi-pencil', color: '#509C55' }` with no `buttonColor`, so an alert without `buttonColor` renders its confirm button with an undefined background | data-env | `global-alert.component.ts` `getIcon`, `case 'confirm'`; html confirm `p-button` `[style]` `backgroundColor: alert.buttonColor` | `162348264` | The Yes button colour is wrong (Low) | — |
