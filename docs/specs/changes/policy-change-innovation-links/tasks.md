# Tasks — Policy Change / Innovation links

> **Answer first:** three tasks. T-01 is the server guard. T-02 is the client list service. T-03 wires the pickers and ends with a human visual check. T-01 runs in parallel with T-02 → T-03, since they are in different packages.

- **Module:** results (policy change)
- **Spec id:** `changes/policy-change-innovation-links`
- **Status:** not-started
- **Owner:** d.casanas@cgiar.org
- **Linked requirements:** ./requirements.md
- **Linked design:** ./design.md
- **Last updated:** 2026-10-20

## 1. Numbering

`T-NN`. Each maps to `R-PCIL-*`.

## 2. Dependency graph

- T-01 (server) — independent
- T-02 (client service) → T-03 (client component)
- Parallel-safe for editing: T-01 ∥ T-02. **Full-suite runs are not parallel-safe** (root guide §4.3): the Leader re-runs each suite after the worker reports.

## 3. Task list

### T-01 — Server: reject a link of the wrong result type

- **Status:** [x] done
- **Size:** S
- **Requirements covered:** R-PCIL-005 (both fields, `400`, nothing written, `null`/absent accepted); R-PCIL-004 "Clear one" BUT clause (server half)
- **Design refs:** §4, §5.3, DD-3, DD-5, P-2, P-6
- **Files touched (intended):**
  - `server/researchindicators/src/domain/entities/result-policy-change/result-policy-change.service.ts`
  - `server/researchindicators/src/domain/entities/result-policy-change/result-policy-change.service.spec.ts`
  - `server/researchindicators/src/domain/entities/result-policy-change/result-policy-change.controller.ts` (Swagger `@ApiResponse` 400 only, if the controller declares responses)
- **First step — settle P-6:** grep every write to `indicator_id` on `results` (`grep -rn "indicator_id" server/researchindicators/src --include=*.ts`, then read each write site). Record the outcome in Done. If any non-creation write exists, stop and raise a Pivot: DD-3 rests on P-6.
- **Scope:**
  - Before `dataSource.transaction`, load `result_id, indicator_id` for the non-null ids through `this.dataSource.getRepository(Result)`. Do not inject `ResultsService` (DD-5). Do not filter by `is_active` or status (DD-3).
  - Throw `BadRequestException` when `innovation_development` is missing or not `IndicatorsEnum.INNOVATION_DEV`, or when `innovation_use` is missing or not `IndicatorsEnum.INNOVATION_USE`. The message names the field.
- **Tests:**
  - `innovation_use` = id of an indicator-2 result → rejects with `BadRequestException`; `dataSource.transaction` **not called**.
  - `innovation_development` = id of an indicator-6 result → rejects, same assertion.
  - Unknown id → rejects.
  - Both `null` / absent → resolves; no results lookup issued.
  - Valid pair → resolves; `linkResultsService.create` receives both ids.
  - Only `innovation_development` set (clear Innovation Use) → `create` receives **exactly** that one id.
  - Target with `is_active = false` or status 7, correct indicator → **resolves** (DD-3).
- **Falsifier:** (a) delete the type check → the two wrong-type tests go red on the `rejects` assertion. (b) Add an `is_active: true` filter → the DD-3 test goes red. Run both against the post-change code and quote the observed red in `execution.md`. A red from a mock-setup error does not count.
- **Red run:** the wrong-type test, run against the pre-change `update()`, must fail on the `rejects.toThrow(BadRequestException)` assertion.
- **Disqualifier:** if the `transaction`-not-called assertion passes only because the mock throws earlier for an unrelated reason, the test is not evidence.
- **Consumers:** `result-policy-change.controller.spec.ts` (mocks `update`, so no change expected); no other TypeScript caller of `update()` (P-5).
- **Review:** `checklist` — small guard; the falsifiers carry the proof.
- **Verification:** from `server/researchindicators/`: `npm test -- --silent result-policy-change`, then the full `npm test -- --silent`, `npx eslint src/domain/entities/result-policy-change`, `npm run build`.
- **Done:**
  - [x] P-6 outcome recorded (writes found: none — versioning copies the value; see execution.md)
  - [x] All 7 tests green; falsifiers (a) and (b) observed red and quoted
  - [x] Full server suite green; eslint (bare) clean; build exit 0
- **Skills:** `nestjs-expert`, `error-handling-patterns`

### T-02 — Client: Policy-Change-only list service for linkable results

- **Status:** [ ] todo
- **Size:** S
- **Requirements covered:** R-PCIL-001 "MUST request indicator `2` only", "MUST leave out 7/8"; R-PCIL-002 same for `6`; R-PCIL-001 "BUT must NOT show other types" (request half — the server filter is existing, P-4); R-PCIL-003 loading/error inputs; R-PCIL-003 "BUT not affected by the other list" (state is kept per indicator); NFR-PCIL-001
- **Design refs:** §2.1, §5.2, DD-1, DD-2, P-3, P-4, P-7, P-8
- **Files touched (intended):**
  - `client/research-indicators/src/app/shared/services/control-list/get-policy-change-linkable-results.service.ts` (new) + `.spec.ts`
  - `client/research-indicators/src/app/shared/services/service-locator.service.ts` (+ its spec)
  - `client/research-indicators/src/app/shared/interfaces/services.interface.ts` (`'policyChangeLinkableResults'`)
  - `client/research-indicators/src/app/shared/interfaces/result/result.interface.ts` (`result_status_id?: number`)
- **Scope:** follow the `getList` / `getLoading` map pattern of `get-lever-strategic-outcomes.service.ts`, keyed by indicator id. Add `getError(id)`. `main(id)` calls `api.GET_Results({'indicator-codes': [id]})` and keeps rows whose `result_status_id` is not 7 or 8 (constants named, not bare numbers). On `!successfulRequest` or a throw, set error and leave the list empty. `isOpenSearch()` returns `false`.
- **Must NOT:** edit `GetInnoDevOutputService` or `GetInnoUseOutputService` (DD-1).
- **Tests:**
  - `main(2)` calls `GET_Results` with `{'indicator-codes': [2]}` exactly; `main(6)` with `[6]`.
  - The fixture has the same indicator in statuses **4, 6, 7, 8, 14**. The list keeps 4, 6 and 14 and drops 7 and 8.
  - Error response → `getError(2)()` true, list empty, `getError(6)()` untouched.
  - `getList(2)` and `getList(6)` are distinct signals.
  - Service locator resolves `'policyChangeLinkableResults'` to this service.
- **Falsifier:** (a) drop the status filter → the 7/8 test goes red. (b) Exclude only 7 → red on 8. (c) Hard-code `[2]` → the `main(6)` test goes red. The fixture must hold kept and dropped statuses together, or (a) cannot diverge. Observe and quote each red.
- **Red run:** status test against a filter-less draft fails on the list-content assertion, not on setup.
- **Disqualifier:** a spec that asserts `filter` was called, rather than the resulting list, proves nothing about which rows survive.
- **Consumers:** `service-locator.service.spec.ts`, which pins the locator's switch. `grep -rn "ControlListServices" client/research-indicators/src` lists the union's readers; add none beyond the locator.
- **Review:** `checklist`
- **Verification:** from `client/research-indicators/`: `npx jest get-policy-change-linkable-results service-locator --silent`, `npm run lint -- --quiet`, `npm run build`.
- **Done:**
  - [ ] Tests green; three falsifiers observed red and quoted
  - [ ] `npm run build` exit 0; lint clean
- **Skills:** `angular-developer`

### T-03 — Client: enable and wire the two pickers

- **Status:** [ ] todo
- **Size:** S
- **Depends on:** T-02
- **Requirements covered:** R-PCIL-001 code+title label and search; R-PCIL-002 same; R-PCIL-003 every row of design §5.1 (loading, error, empty, enabled, read-only); R-PCIL-003 "Read-only result" scenario; R-PCIL-004 "Round trip" (client binding of `innovation_development` / `innovation_use`); NFR-PCIL-002
- **Design refs:** §2.1, §2.2, §5.1, §6, DD-4, P-1, P-8
- **Files touched (intended):**
  - `client/research-indicators/src/app/pages/platform/pages/result/pages/policy-change/policy-change.component.{html,ts,spec.ts}`
- **Scope:**
  - Both `app-select` use `serviceName="policyChangeLinkableResults"` with `[serviceParams]` `2` / `6`. Keep `optionValue` bodies `innovation_development` / `innovation_use`.
  - Add `customFilterBy="result_official_code,title,platform_code"`. The selected-item and item templates use `formatInnovationDevLabel` (DD-4).
  - Add one computed per picker for `disabled`, per design §5.1, using `submission.isEditableStatus()` and that indicator's loading, error and list.
  - Add one computed tooltip per picker: the empty-state text, or `''`. Show the inline error block per picker (the sibling's markup and tokens).
  - Remove the `&nbsp;` run from the Innovation Use label and the static tooltips.
- **Tests (component, rendered DOM — KZ-015: arrange the transition, i.e. load → resolve):**
  - One test per §5.1 row and per picker, reading the rendered `p-select` disabled state (not the computed alone).
  - Innovation Use error state leaves the Innovation Development picker enabled.
  - Empty list → tooltip text bound; error → error text rendered.
- **Falsifier:** (a) restore `[disabled]="true"` → the "enabled" row tests go red. (b) Point both pickers at indicator `2` → the per-picker request test goes red. (c) Drop `isEditableStatus()` from the computed → the read-only row goes red. Observe and quote each red.
- **Red run:** the "enabled" test, against the current template, fails on the disabled assertion.
- **Disqualifier:** a test that checks the `disabled` **input value** on the component instance and never the rendered element proves the binding, not the effect. Use the element.
- **Consumers:** `policy-change.component.spec.ts` (22 `it`); `grep -rn "Link to a reported" client/research-indicators/src client/research-indicators/tests` → only the template (P-1).
- **Review:** `full` — UI states, plus a human check this harness cannot do.
- **Verification:** `npx jest policy-change --silent`; full `npm test -- --silent` (re-run by the Leader; failed suites with zero failed tests are runner flakes, so re-run once); `npm run lint -- --quiet`; `npm run build`.
- **Human check (HITL — no automated gate):** in the running app, light and dark themes:
  - Both columns are aligned.
  - Each list shows only its type, with no Not approved or Deleted results.
  - Pick both, save, reload → values kept.
  - Clear one, save → only that one cleared.
  - A submitted result → both pickers read-only.
  - **No commit before this check passes** (user rule).
- **Done:**
  - [ ] All §5.1 rows covered for both pickers; three falsifiers observed red and quoted
  - [ ] Full client suite green; build exit 0; lint clean
  - [ ] Human check passed and recorded in `execution.md`
- **Skills:** `angular-developer`, `ui-ux-pro-max`

## 4. Coverage closure (clause level)

| Requirement clause | Task |
| --- | --- |
| R-001 only Inno Dev listed / request `2` / exclude 7,8 | T-02 |
| R-001 code+title, search by both | T-03 |
| R-001 BUT not other types | T-02 (request); server filter existing (P-4) |
| R-002 (all clauses, indicator `6`) | T-02, T-03 |
| R-003 table rows: loading, error, empty, enabled, read-only | T-02 (signals), T-03 (rendered) |
| R-003 BUT Inno Dev not affected by Inno Use state | T-02 (separate signals), T-03 (rendered test) |
| R-003 Read-only scenario | T-03 |
| R-004 Round trip | T-03 (binding + human), T-01 (valid pair) |
| R-004 Clear one — BUT Dev link kept | T-01 (payload test), T-03 (human) |
| R-005 400 + nothing saved | T-01 |
| R-005 MUST accept null/absent | T-01 |
| NFR-001 no new endpoint | T-02 |
| NFR-002 tokens, `&nbsp;` removed, aligned | T-03 (+ human) |

## 5. Risks & blockers

| # | Item | Owner |
| --- | --- | --- |
| RB-1 | P-6 refuted → DD-3 revisited | T-01 first step |
| RB-2 | Design §13 known limitation (saved link to a now-excluded target shows the placeholder) | Accepted; revisit if QA reports it |

## 6. Done definition

All three tasks have a Reviewer PASS, the full suites of both packages were re-measured by the Leader, and the human check passed.
