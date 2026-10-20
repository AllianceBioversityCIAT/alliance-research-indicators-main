# Design — Policy Change / Innovation links

> **Answer first:** no schema and no endpoint change. On the client, a new Policy-Change-only list service feeds both pickers from `GET /api/results`, one list per indicator, and drops Not approved (7) and Deleted (8) results. The template binds each picker's `disabled` state to that service instead of `true`. On the server, `update()` gains a pre-transaction check that each link points at a result of the right indicator, with `400` otherwise.

## 0. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/policy-change-innovation-links/` |
| Requirements | `requirements.md` (R-PCIL-001…005, NFR-PCIL-001…002) |
| Depth | **Lite** (re-checked in §11) |
| Verified at | `3ee449e41` |
| User rulings (Phase 1) | OQ-1: list any status **except Not approved (7) and Deleted (8)**. OQ-2: wrong type → **`400`** |

## 1. Goals & non-goals

| Goals | Non-goals |
| --- | --- |
| Enable both pickers with per-type, per-status lists (R-PCIL-001…003) | Make either link required, or touch the green check |
| Keep save / reload / clear working (R-PCIL-004) — already true, locked with a test | Change the Innovation Use → Innovation Dev picker (`innovation-use-details`) |
| Reject a wrong-type link on the server (R-PCIL-005) | New endpoint, new query param, migration |

## 2. Architecture

### 2.1 Composition

| Layer | Piece | Change |
| --- | --- | --- |
| Client | `shared/services/control-list/get-policy-change-linkable-results.service.ts` | **New.** Parameterized by indicator id (`2` / `6`), on the `getList` / `getLoading` pattern of `get-lever-strategic-outcomes.service.ts`, plus `getError`. Calls `ApiService.GET_Results({'indicator-codes': [id]})`, removes rows whose `result_status_id` is 7 or 8 |
| Client | `service-locator.service.ts`, `services.interface.ts` | Register it as `policyChangeLinkableResults` |
| Client | `result.interface.ts` | Add optional `result_status_id?: number` — the endpoint already projects it |
| Client | `policy-change.component.{ts,html}` | Pickers use the new service with `[serviceParams]`, computed `disabled`, empty-state tooltip and inline error; code + title labels; remove the `&nbsp;` padding |
| Server | `result-policy-change.service.ts` `update()` | Pre-transaction type check → `BadRequestException` |

### 2.2 Reuse

- **Results-center endpoint** (`GET /api/results`, `indicators=` filter) — unchanged (NFR-PCIL-001).
- **Label format**: reuse `formatInnovationDevLabel` exported from `innovation-use-details.component.ts` (`platform_code`-`result_official_code` - `title`); it only reads those three fields, so it fits Innovation Use rows too. If importing a page module into another page is unwelcome at review, move the function to `shared/utils/` with its existing callers (DD-4).
- **Item templates and `customFilterBy="result_official_code,title,platform_code"`**: copied from the sibling picker, `innovation-use-details.component.html` (`#innoDevSelect`).

## 3. Data model

No change. Links stay in `link_results`, `link_result_role_id = 1` (`POLICY_CHANGE`).

## 4. API surface

`PATCH` Policy Change section (existing): new **`400`** when `innovation_development` is not an existing result with `indicator_id = 2`, or `innovation_use` is not one with `indicator_id = 6`. `null`/absent still accepted. Response shape unchanged.

## 5. Workflows & business rules

### 5.1 Picker state (R-PCIL-003)

Every state of the inputs, with its outcome:

| editable | loading | error | options | `disabled` | message |
| --- | --- | --- | --- | --- | --- |
| any | true | — | — | true | none |
| any | false | true | — | true | inline error |
| any | false | false | 0 | true | empty-state tooltip |
| true | false | false | ≥ 1 | **false** | none |
| false | false | false | ≥ 1 | true | none (value still shown) |

Each picker computes this from **its own** indicator's signals — the two never share a state (R-PCIL-003 "BUT").

### 5.2 Status exclusion (OQ-1)

Excluded: `result_status_id ∈ {7, 8}`. Applied in the new service after the response, because `GET /api/results` has only an inclusion filter (`status-codes` → `IN (…)`); passing every other status would silently drop any status added later.

### 5.3 Server type check (R-PCIL-005)

1. Collect the non-null ids from `innovation_development` and `innovation_use`.
2. **Before the transaction**, load those results' `result_id, indicator_id` (no `is_active` / status filter — see DD-3).
3. If an id is missing, or its indicator is not the one the field requires → `BadRequestException` naming the field. Nothing is written.
4. Otherwise continue with today's transaction unchanged.

## 6. Frontend impact

STAR client only; no admin SSR change. Layout keeps the two `col-span-6` columns. Messages copy the sibling picker's wording and tokens (`var(--ac-red-1)`, `var(--ac-grey-800)`, `fs-[14]`).

## 7. Integration impact

None. Nothing outside `result-policy-change.service.ts` reads `link_results` role `POLICY_CHANGE` in TypeScript (P-5).

## 8. Security & authorization

Unchanged: the section endpoint keeps its JWT + `ResultStatusGuard`. The new `400` leaks only "wrong type", never the target's details.

## 9. Observability

None new. The `400` goes through `GlobalExceptions` like any other.

## 10. Testing strategy

| What | Where | Falsifier |
| --- | --- | --- |
| Status exclusion and per-indicator request | new service spec | include status 7 → spec red |
| Disabled matrix §5.1, one row per test, reading the **rendered** `p-select` disabled state | `policy-change.component.spec.ts` | revert to `[disabled]="true"` → enabled-row test red |
| Wrong-type `400`, nothing written | `result-policy-change.service.spec.ts` | remove the check → test red |
| Clear one link keeps the other | `result-policy-change.service.spec.ts` (assert payload to `linkResultsService.create`) | push both ids unconditionally → red |
| Template types | `npm run build` (client, `strictTemplates`) | bind a wrong-typed input → red |
| Column alignment, both themes | human, at the HITL pause | — |

## 11. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
| --- | --- |
| Tasks | **3** |
| LOC | **~70 production + ~200 test** |
| Review rounds | **4** (one per task, plus one rework margin) |

Lite holds: three small tasks, no schema, one guard.

## 12. Design decisions log

| # | Decision | Why | Rejected alternative |
| --- | --- | --- | --- |
| DD-1 | New Policy-Change-only list service instead of editing `GetInnoDevOutputService` | That service also feeds the required Innovation Use → Innovation Dev picker (P-3). Excluding statuses there changes a QA-approved screen nobody asked to change | Filter inside the shared service (wider blast radius) |
| DD-2 | Status exclusion on the client, after the response | The endpoint has no exclusion filter; an inclusion list goes stale when a status is added (P-4) | New `exclude-status-codes` query param (server change for a list concern) |
| DD-3 | Server checks type only, not status or `is_active` | The client resends the saved link on every save. A link made before its target became Not approved or Deleted would turn every later save into a `400`. Indicator never changes after creation, so a type check cannot go stale (P-6) | Also reject status 7/8 targets |
| DD-4 | Reuse `formatInnovationDevLabel` | Same label format as the shipped sibling; one formatter | A second copy in policy-change |
| DD-5 | Query results through `dataSource` in the check, not by injecting `ResultsService` | `ResultPolicyChangeModule` already has a boot-order fragility with `results.module` (archive `innovation-use--link-innovation-dev` R-8); a new import adds risk for no gain | Inject `ResultsService.filterResultByIndicators` |

**Step 2.3 reversion challenge:** no DD removes delivered behavior. Removing `[disabled]="true"` reverses a placeholder, not a feature, and no test pins it (P-1).

## 13. Known limitation (accepted unless the user objects)

A link saved **before** its target became Not approved or Deleted stays stored and is resent on save, but that target is not in the picker list, so the picker shows the placeholder. The data is not lost; it is just not shown. Fixing it means injecting the current target into the options. It is left out because it is rare.

## 14. Premise Ledger

**Count:** 7 verified, 1 `UNVERIFIED` (Impact: 0 High, 1 Low).
**Blast-radius triggers:** `live-path` fires (the user action "pick and save"). `shared-state` fires (`GetInnoDevOutputService` is shared). `consumer` fires for the service-locator union and the `Result` interface. The `PATCH` response shape and the stored fields are unchanged.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 | Both pickers are hard-disabled and nothing tests that | existence | `policy-change.component.html:90,103` `[disabled]="true"`; `grep -rn "Link to a reported" client/research-indicators/src server/researchindicators/test` → only the template | `3ee449e41` | T-03 has a spec to update — Low | — |
| P-2 | Save, read and clear already work server-side | existence | `result-policy-change.service.ts` `update()` → `linkResultsService.create(…, POLICY_CHANGE)`; `findPolicyChange()` splits by `other_result.indicator_id`; `base-service.ts` `create()` sets `is_active=false` on role rows with an id not in the payload | `3ee449e41` | Back-end persistence task needed; scope grows — High | — |
| P-3 | `GetInnoDevOutputService` is shared with the Innovation Use page | shared-state | `grep -rn "innoDevOutput\|GetInnoDevOutputService" client/research-indicators/src` (non-spec): `innovation-use-details.component.ts:28,195` (inject, `list()`, `loading()`, `error()`), `.html:181` (`serviceName`); `policy-change.component.html:94`; `service-locator.service.ts:214`. `GetInnoUseOutputService` → only `policy-change.component.html:106` + `service-locator.service.ts:216` | `3ee449e41` | DD-1 unnecessary — Low | — |
| P-4 | `GET /api/results` filters status by inclusion only, and projects `result_status_id` on every row | data-env | `result.repository.ts` — `AND r.result_status_id IN (…)` under `haveStatusCodes`; `SELECT … r.result_status_id`; also `AND r.is_active = TRUE AND r.is_snapshot = FALSE` | `3ee449e41` | DD-2 changes — Low | — |
| P-5 | Nothing else in TypeScript reads `link_results` role `POLICY_CHANGE` | consumer | `grep -rn "LinkResultRolesEnum.POLICY_CHANGE" server/researchindicators/src server/researchindicators/test` (non-spec) → `result-policy-change.service.ts:114,154` and its seed migration only. SQL readers by number (`link_result_role_id = 1`) were not separated from other tables' `role_id = 1` | `3ee449e41` | None, since no stored shape changes — Low | — |
| P-6 | A result's `indicator_id` never changes after creation | data-env | `UNVERIFIED — confirm at source before relying on it` | — | DD-3's "cannot go stale" is wrong; a re-typed target would 400 on resave — Low | T-01 first step: grep for any write to `indicator_id` on `results` outside creation |
| P-7 | "Not approved" is status 7 and "Deleted" is status 8 | data-env | `1767821369314-insertAndUpdateNewStatus.ts:76,87` (`// Not approved (ID: 7)`); `result-status.enum.ts` `DELETED = 8`; client `results-center-url.vocabulary.ts:80` `['not-approved', 7]` | `3ee449e41` | Wrong statuses excluded — High (caught by the T-02 spec only if the spec uses the right ids) | — |
| P-8 | `app-select` takes per-param lists via `getList/getLoading(serviceParams)` | location | `select.component.ts` `bindServiceSignals()` and `loadData()` → `service.main(serviceParams)` | `3ee449e41` | T-02 shape changes — Low | — |

## 15. References

- Sibling picker: `docs/specs/archive/2026-09-09-innovation-use--link-innovation-dev/`
- Narrow-blast-radius preference (user memory) → DD-1
