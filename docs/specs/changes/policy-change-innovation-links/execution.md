# Execution — Policy Change / Innovation links

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/policy-change-innovation-links/` |
| Run | `run_072b366721e5` (Orca) |
| Branch | `AC-1754-Activate-the-Innovation-development-and-innovation-use-selector-in-policy-change` · baseline `506a34704` |
| Leader | Claude Opus 5.5 (this session) |
| Implementer | Grok `grok-4.7-high` via Cursor (Orca `/orchestration`) — standing split: Grok implements, Claude reviews |
| Reviewer | Claude `akili-reviewer` wrapper (fresh context, different weights from the Implementer) |
| Approval mode | spec says `interactive`; owner standing direction (2026-10-06) — continue task to task, stop only on FATAL_FAIL / HALT / Pivot / tripwire. T-03 still stops for the human visual check, and nothing from T-03 is committed before it |
| Budget (tripwire) | 3 tasks · ~70 production + ~200 test LOC · 4 review rounds (design §11) |
| Parallelism | T-01 (server) ∥ T-02 (client); workers run scoped tests only, the Leader runs each full suite after both report (root `CLAUDE.md` §4.3) |

## 2. Task Execution History

### T-01 — Server: reject a link of the wrong result type → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-20 |
| Final status | PASS (attempt 1 of 3) |
| Orca task / dispatch | `task_2f405e8000ee` / `ctx_ef007a4ccede` |
| Implementer | Cursor · `grok-4.7-high`, effort medium, skills `nestjs-expert`, `error-handling-patterns`, `tdd` (Leader added `tdd`: a guard with exact red/green falsifiers) |
| Reviewer | Claude `akili-reviewer` (fresh context, lens checklist) — **PASS** |
| Requirements covered | R-PCIL-005 (both fields, `400`, nothing written, `null`/absent accepted); R-PCIL-004 "Clear one" BUT clause (server half) |

**Files changed (2):**
- `server/researchindicators/src/domain/entities/result-policy-change/result-policy-change.service.ts` — new private `assertInnovationLinkTypes`, awaited in `update()` before `dataSource.transaction`
- `server/researchindicators/src/domain/entities/result-policy-change/result-policy-change.service.spec.ts` — 7 new tests

The controller was not changed: it declares no `@ApiResponse` (confirmed by the Reviewer).

**P-6 outcome:** the only non-creation write that touches `results.indicator_id` is versioning. `INSERT INTO results` copies `r.indicator_id` onto a new row, so the value is unchanged. Creation is `ResultsService.create` `save({indicator_id})`. `SET indicator_id` in `pool-funding-mapping-apply.service.ts:93` targets `result_pool_funding_toc_alignment`, not `results`. P-6 holds, so DD-3 stands. **Scope note (KZ-017, from the Reviewer):** the grep cannot see a TypeORM `save()` or `update()` on an existing `Result` entity object. P-6 is backed by two independent reads, but no exhaustive proof exists.

**Implementer verification (as reported):**
- `npm test -- --silent result-policy-change` → PASS, 2 suites, 20 tests (controller spec included)
- `npx eslint src/domain/entities/result-policy-change` → exit 0
- `npm run build` → exit 0
- Red, against pre-change `update()`, at `service.spec.ts:267`: `expect(received).rejects.toThrow()` / `Received promise resolved instead of rejected` / `Resolved to value: undefined`
- Falsifier (a), type check deleted, both wrong-type tests at `:272` and `:288`: `Received promise resolved instead of rejected` / `Resolved to value: undefined`
- Falsifier (b), `is_active: true` added, DD-3 test at `:381`: `expect(received).resolves.toBeUndefined()` / `Received promise rejected instead of resolved` / `Rejected to value: [BadRequestException: innovation_development is not an existing Innovation Development result]`
- Both mutations were reverted.

**Evidence re-run (Leader inline, non-author, after both workers had reported): VERIFIED.**
- scoped: `Tests: 20 passed, 20 total`
- `npx eslint` → exit 0
- `npm run build` → exit 0
- full `npm test -- --silent` (from `server/researchindicators/`) → `Test Suites: 428 passed, 428 total` · `Tests: 4179 passed, 4179 total`

**Reviewer summary:**
- The check runs before the transaction, reads `result_id` and `indicator_id` through `dataSource`, and does not filter by `is_active` or status.
- `BadRequestException` names the field.
- The "transaction not called" assertions hold only because of the check (`armTransaction()` arms a working callback), so the disqualifier does not apply.
- Test (6) asserts the exact payload `[{ other_result_id: 20 }]`.
- The DD-3 mock can genuinely diverge.
- `bigNumberStrings: false` (`orm.config.ts`) makes the numeric `Map` lookup match today.

**ADVISORY (4R, non-gating):**
1. RELIABILITY — the check uses `!= null`, but `innoSave` uses truthiness. So `{innovation_development: 0}` now gets `400` where it used to be silently dropped. This is consistent with R-PCIL-005. The STAR client sends `null`.
2. RESILIENCE — `Map.get(item.id)` compares ids strictly. A string id (`"22"`) in a hand-built body, or `bigNumberStrings` flipping to true, would `400` every valid save. Suggestion: normalise with `String()`, as `result-actors.service.ts:378-389` does.
3. READABILITY — the test (7) `mockImplementation` on `mockResultFind` survives `clearAllMocks`. It is harmless today; `mockResolvedValueOnce` or `mockReset` would stop the leak.

**Decisions made:**
- The error message wording is the Implementer's: `innovation_development is not an existing Innovation Development result` / `innovation_use is not an existing Innovation Use result`. The design requires that the message names the field, not a fixed string.
- Brief narrowing: the worker ran scoped tests only, because T-02 ran in parallel. The Leader ran the full suite (root `CLAUDE.md` §4.3).

**Issues encountered:** two spawn failures. The Cursor CLI was logged out, and the worker sat at a browser login (`dispatch_input` failed, dispatches `ctx_2d5d53350f00`, `ctx_7e8d1553dbd1`). The user completed the login, and the Leader re-dispatched into the live terminal (`worker-start --terminal`).

- `runtime events: spawn failure ×2 → rung 1 (retry; user login)`
- `spawns: implementer(grok) not reported by host, ended complete; reviewer(claude) 14 calls, 67053 tokens, ended complete`

### T-02 — Client: Policy-Change-only list service for linkable results → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-20 |
| Final status | PASS (attempt 2 of 3) |
| Orca task / dispatch | attempt 1 `task_87a63e071bc9` / `ctx_f99b28c6e120`; attempt 2 `task_c5dff8e7ba1c` / `ctx_4dc7ecad86a4` (same worker terminal, kept alive through the FAIL) |
| Implementer | Cursor · `grok-4.7-high`, effort medium → high on rework, skills `angular-developer`, `tdd` (Leader added `tdd`: the filter is a business rule with a falsifier matrix) |
| Reviewer | Claude `akili-reviewer` — attempt 1 **FAIL** (evidence gap), attempt 2 **PASS** (fresh context) |
| Requirements covered | R-PCIL-001 (request indicator `2` only, leave out 7/8, request half of "BUT not other types"); R-PCIL-002 (same for `6`); R-PCIL-003 loading/error inputs and "BUT not affected by the other list"; NFR-PCIL-001 |

**Files changed (6):**
- `client/research-indicators/src/app/shared/services/control-list/get-policy-change-linkable-results.service.ts` (new)
- `client/research-indicators/src/app/shared/services/control-list/get-policy-change-linkable-results.service.spec.ts` (new)
- `client/research-indicators/src/app/shared/services/service-locator.service.ts` and `service-locator.service.spec.ts`
- `client/research-indicators/src/app/shared/interfaces/services.interface.ts` — adds `'policyChangeLinkableResults'`
- `client/research-indicators/src/app/shared/interfaces/result/result.interface.ts` — adds `result_status_id?: number`

#### Attempt 1

**Implementer verification (as reported):**
- `npx jest get-policy-change-linkable-results service-locator --silent` → 89/89 passed. The run exits 1 only on the global coverage floors, because the run is narrow. With `--coverage=false` it exits 0.
- `npm run lint -- --quiet` → "All files pass linting".
- `npm run build` → exit 0.

**Red run and falsifiers, all at the status test `spec.ts:49` `toEqual` unless noted, each reverted:**
- **Red run** (filter-less draft): fails with the extra rows `result_status_id 7` (`result_id 107`) and `8` (`result_id 108`).
- **Falsifier (a)**, filter dropped: same red, extra 7 and 8.
- **Falsifier (b)**, only 7 excluded: same assertion, extra `result_status_id 8` only.
- **Falsifier (c)**, `[2]` hard-coded: the `main(6)` test fails with `Expected indicator-codes [6], Received [2]`.

**Reviewer: FAIL (verbatim):**
1. **Discovered Issue:** the verification evidence contains no spec type-check. The new `get-policy-change-linkable-results.service.spec.ts` and the edited `service-locator.service.spec.ts` were run only through jest, lint and build, and none of those type-checks spec code. Jest uses isolatedModules, ESLint ignores `*.spec.ts`, and `tsconfig.app.json` covers only `main.ts`.
   * **Violated Rule:** client/research-indicators/src/CLAUDE.md, "Test code is neither linted nor type-checked (K-002)": "This gate is not optional and nothing else substitutes for it"; the bar is no new errors in the files you touched. Also .agents/reviewer.md §5 (verification must have actually run).
   * **Remediation Suggestion:** from `client/research-indicators/`, run `npx tsc -p tsconfig.spec.json --noEmit 2>&1 | grep -E 'get-policy-change-linkable-results|service-locator.service.spec'`. Compare the normalized set (positions stripped, sorted) against the pre-change baseline. The new file must have zero errors, and the set for service-locator.service.spec.ts must be unchanged.

**ADVISORY on attempt 1 (non-gating):**
- RELIABILITY: two overlapping `main(id)` calls for the same indicator interact. app-select calls `initializeService()` from both `ngOnChanges` and `ngOnInit`, so every mount fires `main(id)` twice. The first call's `finally` turns loading off while the second is still in flight. Both calls send the same query, so the final state is consistent. Every per-param app-select service already behaves this way.
- RISK, feeds T-03: `selectedOption` (`select.component.ts:82`, template line 122) reads the global `service.list()`, which this service never fills. So the selected-row block under the picker never renders. T-03 must check in the running app that the current value still shows when the picker is disabled (§5.1 read-only row).
- RESILIENCE, feeds T-03: `main` and `getList` take a `number` with no coercion. T-03 must bind the literal numbers `2` and `6`, never strings.
- READABILITY: the global `error`, `list` and `loading` signals exist only for app-select's fallback and `selectedOption`. A one-line comment would explain why.

**Evidence re-run, attempt 1:** not run. The Reviewer FAIL came first, and the re-run was folded into attempt 2.

#### Attempt 2

Effort was raised to high. The FAIL report went to the same worker verbatim, with the attempt history. **No code changed:** the diff is byte-identical to attempt 1 (Leader `cmp`, ignoring index lines).

**Implementer verification (as reported):**
- `npx tsc -p tsconfig.spec.json --noEmit` ran on the current tree and on a throwaway detached worktree at HEAD `87f64af58` (the baseline; the worktree was removed afterward). Both exit 2 with **945** `error TS` lines.
- The position-stripped, sorted grep for the touched files is empty on both sides, and the locator sets are identical.
- Falsifier, reverted afterward: adding `const t02GateFalsifier: number = 'not-a-number'` made tsc report `src/app/shared/services/control-list/get-policy-change-linkable-results.service.spec.ts(6,7): error TS2322: Type 'string' is not assignable to type 'number'.`, and the total went 945 → 946.
- jest 89/89; lint clean.

**Evidence re-run (Leader inline, non-author): VERIFIED.**
- `npx tsc -p tsconfig.spec.json --noEmit` → exit 2, 945 total, **0** lines matching the touched files.
- `npx jest get-policy-change-linkable-results service-locator --silent --coverage=false` → 2 suites, 89 tests passed.
- `npm run lint -- --quiet` → "All files pass linting".
- `npm run build` → exit 0.
- Full `npm test -- --silent` (from `client/research-indicators/`):
  - run 1 → `Test Suites: 1 failed, 344 passed` · `Tests: 8001 passed`, 0 failed. The failed suite was a jest worker `SIGSEGV` in the unrelated `result.component.spec.ts`; run alone it passes 18/18. This is the known runner flake (`workerIdleMemoryLimit` mitigation still absent).
  - run 2 → `Test Suites: 345 passed, 345 total` · `Tests: 8019 passed, 8019 total`.

**Reviewer: PASS.** The attempt-1 FAIL is resolved, and the K-002 bar is met at its source (`client/.../src/CLAUDE.md` lines 268–289):
- the normalized sets match;
- both totals are equal (945), so there was no parse abort;
- the falsifier proves the gate sees the new file.

Code conformance re-checked against Scope, Tests, Disqualifier, §5.2, DD-1, DD-2, P-7 and P-8. ADVISORY: none.

**Decisions made:** brief narrowing, as in T-01: the worker ran scoped tests only, and the Leader ran the full suite.

**Issues encountered:**
- The worker's first evidence omitted a gate the client guide makes mandatory (K-002), which cost one rework attempt.

**Run accounting:**
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer(grok) attempt 1 not reported by host, ended complete; reviewer(claude) 9 calls, 54355 tokens, ended fail; implementer(grok) attempt 2 not reported by host, ended complete; reviewer(claude) not reported by host, ended complete`
- **Budget:** 3 of 4 review rounds used after T-02, with T-03 still to go. A T-03 rework would exceed the design §11 tripwire.

### T-03 — Client: enable and wire the two pickers → **Reviewer PASS · HITL pending (not committed)**

| Field | Value |
| --- | --- |
| Date | 2026-10-20 |
| Final status | Reviewer PASS (attempt 1 of 3). The task stays `[~]` until the human check passes, and it is **not committed** before then (user rule) |
| Orca task / dispatch | `task_04256fc07d0c` / `ctx_c3fdc677b057`. The worker is retained until the human check closes the task |
| Implementer | Cursor · `grok-4.7-high`, effort medium, skills `angular-developer`, `ui-ux-pro-max` |
| Reviewer | Claude `akili-reviewer` (fresh context, lens checklist, full conformance) — **PASS** |
| Requirements covered | R-PCIL-001 and R-PCIL-002 (code + title label and search); R-PCIL-003, every §5.1 row for both pickers, plus "Read-only result" and "BUT not affected by the other list"; R-PCIL-004 "Round trip" (client binding); NFR-PCIL-002 (tokens; `&nbsp;` removed) |

**Files changed (3):** `client/research-indicators/src/app/pages/platform/pages/result/pages/policy-change/policy-change.component.{html,ts,spec.ts}`

**What changed:**
- Both pickers use `serviceName="policyChangeLinkableResults"` with `[serviceParams]="2"` and `[serviceParams]="6"`, as number literals.
- `customFilterBy="result_official_code,title,platform_code"`.
- Both templates use `formatInnovationDevLabel`, imported from `innovation-use-details.component.ts` (DD-4, not moved).
- Each picker has a `disabled` computed in §5.1 order: loading, then error, then empty, then `!isEditableStatus()`. Each also has a computed empty-state tooltip.
- Inline error blocks copy the sibling's markup and tokens.
- The `&nbsp;` run and the static tooltips are removed.

**Implementer verification (as reported; full report at `/tmp/t03-policy-change-report.md`):**
- `npx jest policy-change --silent --coverage=false` → 2 suites, 43 tests. The component spec has 36: the 22 existing plus 14 new.
- K-002: `npx tsc -p tsconfig.spec.json --noEmit` — the policy-change set is identical to a throwaway worktree at HEAD `12ac4d7b6`: 2× the pre-existing `TS2559 … 'GetPolicyChange'`. 945 total on both sides.
- K-004 red proof (reverted): `policy-change.component.spec.ts(401,9): error TS2322: Type 'string' is not assignable to type 'number'.`
- lint → "All files pass linting."; build → exit 0.

**Red run and falsifiers (each reverted):**
- **Red run**, pre-change template: both enabled tests `Expected: false / Received: true` on `expect(isRenderedDisabled(...)).toBe(false)`.
- **Falsifier (a)**, `[disabled]="true"`: enabled rows at `:621` and `:630`, `Expected: false / Received: true`.
- **Falsifier (b)**, both pickers `[serviceParams]="2"`: `expect(requested).toContain(6)` → `Expected value: 6 / Received array: [2, 2, 2, 2]`.
- **Falsifier (c)**, `isEditableStatus()` returning false: read-only rows at `:644` and `:659`, `Expected: true / Received: false`.

**Evidence re-run (Leader inline, non-author): VERIFIED.**
- jest policy-change → 2 suites, 43 tests passed.
- `tsc` → 945 total. The policy-change set equals the pre-T-03 baseline log, position-stripped (2× TS2559).
- lint → exit 0. build → exit 0.
- Full `npm test -- --silent`: three runs.
  - Run 1: `1 failed, 344 passed`, 0 failed tests. SIGSEGV in `bulk-upload-config.interface.spec.ts`; alone it passes 7/7.
  - Run 2: `2 failed, 343 passed`, 0 failed tests. SIGSEGV in `get-os-subnational.service.spec.ts` and `project-utils.service.spec.ts`; together alone they pass 48/48.
  - Run 3: `Test Suites: 345 passed, 345 total` · `Tests: 8033 passed, 8033 total`.
  - The crashing suite changes every run. This is the runner flake documented while the `workerIdleMemoryLimit` mitigation is absent from `jest.config.ts`.

**Reviewer summary (PASS):**
- 10 row tests (§5.1 × 2 pickers) read the rendered combobox `aria-disabled`. PrimeNG binds it to `disabled` only, never to `loading`, and the settled rows also check `p-disabled`. They use the real `SelectComponent`, not a stub (KZ-001).
- The fixture gates `GET_Results` per indicator and resolves after render (KZ-015).
- The "Innovation Use error leaves Innovation Development enabled" test exists and reads the rendered element.
- The spec diff is add-only. None of the 22 existing tests is weakened.
- Tooltip and error wording matches R-PCIL-003 and the sibling picker.

**ADVISORY (4R, non-gating):**
1. RELIABILITY — reachable, outside T-03's scope:
   - `SelectComponent` calls `initializeService()` from both `ngOnChanges` and `ngOnInit`, so `main()` runs twice per picker (falsifier (b) shows `[2,2,2,2]`).
   - The T-02 service clears `error` only when a call starts, never on success.
   - If one of the two duplicate requests fails and the other succeeds, the picker stays disabled with "could not be loaded" although the list loaded. Derived by reading the code; not run.
   - Fix candidates: `error.set(false)` on success, or share the in-flight promise per indicator. **Recorded only; raised to the user at the T-03 gate.**
2. READABILITY — the error block sits above the select in one `col-span-6`, so a single-picker error vertically offsets the two columns. Added to the HITL alignment check.
3. TEST (KZ-015, partial) — the read-only tests set `body` before the first render. The real-page order (the list resolves, then `GET_PolicyChange` fills `body`) is not covered, and is left to the HITL round trip and reload. The "enabled" tests look for the error text inside `p-select`; this is cosmetic.
4. READABILITY — `formatInnovationDevLabel` comes from another page module. DD-4 allows it; move it to `shared/utils/` if anyone objects.
5. The Implementer's `selectedOption` finding is confirmed harmless: `hideSelected` defaults to `true`, so the block that reads the global list never renders, and the saved value shows through PrimeNG's lookup in the per-indicator list.

**Not Done / Assumptions (verbatim from the Implementer):** "Column alignment after removing the `&nbsp;` hack was not checked in the browser; that HITL pass is the Leader's. `formatInnovationDevLabel` was imported from the sibling page module, not moved to `shared/utils/`." The first sentence is the human check this task already owns. The second is DD-4-permitted, so nothing is owed by the Implementer.

**Human check (HITL):** pending.

**Run accounting:**
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer(grok) not reported by host, ended complete; reviewer(claude) not reported by host, ended complete`
- **Budget:** 4 of 4 review rounds used, which is exactly the tripwire. Tasks 3 of 3. No overrun.

#### T-03 — HITL follow-up 1 (user design ruling) → **Reviewer PASS · HITL pending**

**User ruling (2026-10-20, at the visual check):** *"el code del resultado debería estar en negrilla y debería estar el estatus del resultado con el tag que hay en la app"*. The owner asked for this scope directly. Recorded as an execute-time spec edit to `design.md` §6 ("Amended 2026-10-20 — user ruling at T-03 HITL").

**Decisions made:**
- `design.md` §6 amended. The first version told the list service to send `'result-status': true`.
- **KZ-007 correction, same day.** That premise came from the v1 repository, where the flag gates the status join. `ApiService.GET_Results` calls `v2/results` and serializes only array values, so the boolean never reached the wire. v2 always selects `rs.name AS status_name` (`result.repository.ts:908`), and `mapV2ResultListItemToResult` maps it to `result_status.name`. The Implementer found this. The Leader verified it at the source and corrected §6 to "no request change".
- **Budget:** this follow-up adds review round 5, one over the design §11 tripwire of 4. It proceeded because it is owner-requested scope, raised to the owner in chat at dispatch.

**Dispatches:**
- `task_3d8cdde11ec8` / `ctx_bde0e98da686` — bold code + tag + the inert flag.
- `task_574b168ac607` / `ctx_de12b7e62e84` — flag removed.
- Both ran on the same retained T-03 worker.

**Files (vs HEAD `12ac4d7b6`, final):**
- `policy-change.component.{html,ts,spec.ts}`
- `get-policy-change-linkable-results.service.spec.ts` — assertion form only
- `get-policy-change-linkable-results.service.ts` and `result.interface.ts` have no diff: the flag was added and then removed.

**What changed:** each option row in both pickers shows:
- the code via `formatInnovationDevCode` inside `font-bold`;
- then the title;
- then `<app-custom-tag [tiny]="true">`, bound to `result_status`, the same pattern as `project-results-table.component.html:38`.

The closed value has no tag. `customFilterBy` is unchanged.

**Implementer verification (as reported; `/tmp/t03-bold-status-report.md`, `/tmp/t03-status-flag-correction.md`):**
- jest → 2 suites, 44 tests.
- tsc → 945 = HEAD, and the touched-file set is unchanged. Probe red: `policy-change.component.spec.ts(684,11): error TS2322`.
- lint and build → green.
- **Falsifier** (tag removed from both `#item` templates): `expect(tag).not.toBeNull()` / `Received: null` at `:705`, reverted.
- The test fixture shapes rows with `mapV2ResultListItemToResult`.

**Evidence re-run (Leader inline, non-author): VERIFIED.**
- jest policy-change + service → 2 suites, 44 tests.
- tsc → 945 total; the policy-change set is the 2× pre-existing TS2559.
- lint → exit 0. build → exit 0.
- Full `npm test -- --silent`:
  - run 1 → `2 failed, 343 passed`, 0 failed tests. The runner flake hit `result-information-modal.component.spec.ts` and `get-institutions.service.spec.ts`.
  - run 2 → `Test Suites: 345 passed, 345 total` · `Tests: 8034 passed, 8034 total`.

**Reviewer: PASS.**
- Conformance to `design.md` §6 as amended, including the KZ-007 correction.
- The row test uses the real page shape (the mapper, then the real service, then the real `itemTemplate` and `CustomTagComponent`) and asserts on rendered DOM text.
- `font-bold` is a utility class; there are no hex values.
- The §5.1 tests are intact.

**ADVISORY (non-gating):**
1. The "no tag on the closed value" check runs with nothing selected, so it cannot catch a tag added to `#selectedItemTemplate`. The read-only tests could assert `app-custom-tag` is null.
2. The service-spec rewrite `mock.calls[0][0] toEqual` is slightly weaker than `toHaveBeenCalledWith`. It does not check extra arguments or the call count. Restoring the original, or using `expect(mock.calls).toEqual([[…]])`, would be stronger.
3. The two `#item` templates are duplicated; acceptable at two uses.

**Run accounting:**
- `spawns: implementer(grok) ×2 not reported by host, ended complete; reviewer(claude) not reported by host, ended complete`
- `runtime events: none`

#### T-03 — Human check (HITL) → **PASSED**

The owner checked it in the running app after follow-up 1 and confirmed: *"ya quedó, haz commit"* (2026-10-20). T-03 closes as **PASS** (Reviewer PASS ×2, human check passed). The retained worker is released after the commit.

## 3. Summary

| Task | Result | Attempts | Implementer | Commit |
| --- | --- | --- | --- | --- |
| T-01 Server wrong-type guard (`400`) | PASS | 1 | Grok | `87f64af58` |
| T-02 Client linkable-results service | PASS | 2 (attempt 1 FAIL: K-002 spec type-check evidence missing) | Grok | `12ac4d7b6` |
| T-03 Enable and wire the pickers + HITL design follow-up | PASS + human check | 1 (+1 owner-requested follow-up) | Grok | this commit |

**Budget, design §11:**
- Tasks: 3 of 3.
- Review rounds: 5 against the expected 4. The overrun is the owner-requested HITL design follow-up and was raised to the owner at dispatch.

**Full suites, Leader-measured.** The commands are the citation; the figures are not restated elsewhere.
- Server, `npm test -- --silent`: green after T-01.
- Client, `npm test -- --silent`: green after T-03 follow-up 1. Every client measurement needed a re-run because of the jest worker SIGSEGV flake, which hit a different unrelated suite each time with 0 failed tests. The `workerIdleMemoryLimit` mitigation is still absent from `jest.config.ts`.

**Open items (recorded, not actioned — advisories never become tasks):**
- Duplicate `main()` and the stale error flag (T-03 Reviewer advisory 1). app-select fires `main(id)` twice per mount. The T-02 service clears `error` only at call start, so one failed duplicate plus one successful duplicate leaves the picker disabled with "could not be loaded". It was raised to the owner and needs an owner decision.
- T-01 advisories:
  - the `String()` id normalisation;
  - the `0`-vs-truthiness edge;
  - the test mock leak.
- T-03 follow-up advisories:
  - a "no tag on the closed value" assertion in the read-only tests;
  - the strength of the service-spec assertion.
- Design §13 known limitation: a saved link whose target later became status 7 or 8 shows the placeholder.

### T-04 — Client: one in-flight request per indicator; clear the error on success → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-20 |
| Origin | T-03 Reviewer advisory 1. The owner approved it as new scope (*"sí, arréglalo"*), and the Leader added it to `tasks.md` before dispatch |
| Final status | PASS (attempt 2 of 3) |
| Orca task / dispatch | attempt 1 `task_7af1c028d36d` / `ctx_2b4bbc0dcef6`; attempt 2 `task_c188a79c3a34` / `ctx_b8848047b81c` (same worker) |
| Implementer | Cursor · `grok-4.7-high`, effort medium → high on rework, skills `angular-developer`, `tdd` |
| Reviewer | Claude `akili-reviewer` — attempt 1 **FAIL** (test comment), attempt 2 **PASS** |
| Requirements covered | R-PCIL-003, the design §5.1 error row: the error state reflects the latest load |

**Files changed (2):** `client/research-indicators/src/app/shared/services/control-list/get-policy-change-linkable-results.service.{ts,spec.ts}`

**What changed:**
- `main(id)` returns the in-flight promise for that indicator when one exists.
- `finally` removes only its own map entry.
- The body moved to a private `load()`.
- `errorSig.set(false)` was added on success.
- The clear at call start is kept, so §5.1 shows no message while loading.

#### Attempt 1

**Implementer verification (as reported):**
- jest → 2 suites, 48 tests.
- **Falsifier (a)**, no dedupe: `Expected number of calls: 1, Received number of calls: 2`.
- **Falsifier (b)**, no reset on success: `Expected: false, Received: true` on `getError(2)`.
- tsc → 945 = HEAD `5c4e6fa13`, 0 in the service. Probe TS2322 945 → 946, reverted.
- lint and build → green.

**Evidence re-run (Leader inline): VERIFIED.**
- jest → 2 suites, 48 tests.
- tsc → 945 total, 0 in the touched files.
- lint → 0. build → 0.
- Full `npm test -- --silent`:
  - run 1 → `2 failed, 343 passed`, 0 failed tests (runner flake: `all-modals.component.spec.ts`, `roartheme.spec.ts`).
  - run 2 → `Test Suites: 345 passed, 345 total` · `Tests: 8038 passed, 8038 total`.

**Reviewer FAIL (verbatim):**
1. **Discovered Issue:** the comment in `get-policy-change-linkable-results.service.spec.ts` (test 2, before `service.getError(2).set(true)`) reads "A superseded duplicate sets error after this call cleared it at start." That describes the race that existed before T-04. The dedupe in this same diff makes it impossible, so the committed comment claims a product path that doesn't exist. A reader will take the falsifier (b) failure as proof of reachable behaviour when it only proves a synthetic state.
   * **Violated Rule:** CLAUDE.md §4.3, K-004/KZ-014: "If the red has not been *seen*, it may not be asserted — not in a code comment…"
   * **Remediation Suggestion:** reword the comment as "Forced state: not reachable via main() once requests are deduped and the error is cleared at start. This isolates the success-path reset (defense in depth) so its removal is detectable." Record the same note next to falsifier (b) in `execution.md`. Keep the code and test logic as they are.

**ADVISORY (attempt 1):**
- Do not stage `.codegraph/.gitignore` with this task (honoured).
- Tests 3 and 4 also passed before the change. They are **regression guards** for the in-flight map, not proof of new behaviour.
- **Spec gap:** T-04 Test 2 as written in `tasks.md` cannot tell whether the reset-on-success is present, because the clear at call start masks it.

#### Attempt 2

Only the test-2 title and comment changed. The product code and the test logic are identical to attempt 1.
- **New title:** "clears a forced error and fills the list when a later main(2) succeeds after a failure"
- **New comment:** "Forced state: not reachable via main() once requests are deduped and the error is cleared at start. This isolates the success-path reset (defense in depth) so its removal is detectable."

**Implementer verification (as reported):**
- jest → 2 suites, 48 tests.
- **Falsifier (b)** re-run: `Expected: false, Received: true` on `getError(2)`, spec line 138, reverted.
- tsc → 0 lines for the touched file. lint → 0.

**Note beside falsifier (b), required by the FAIL:** the red proves that the success-path reset exists, using a **forced** state. With dedupe and the clear at call start, that state is not reachable through `main()`. The reset is defense in depth. The bug the owner asked to fix is closed by the **dedupe**, and falsifier (a) proves that.

**Evidence re-run (Leader inline): VERIFIED.**
- jest → 2 suites, 48 tests.
- tsc → 0 lines for the touched file.
- lint → exit 0.
- The full suite carries over from attempt 1, since the product code is byte-identical.

**Reviewer: PASS.** The FAIL is resolved. The comment and title now match the code, and the forced state has a real job: it unmasks the reset. Scope, Must NOT, and Tests 1–4 conform.

**Run accounting:**
- `runtime events: none`. `checkpoints: 0`.
- `spawns: implementer(grok) ×2 not reported by host, ended complete; reviewer(claude) 12 calls, 53166 tokens, ended fail; reviewer(claude) not reported by host, ended complete`
- **Budget:** review rounds now total 7 against the expected 4. The overrun is the owner-requested design follow-up plus this owner-approved T-04.
