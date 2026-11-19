# Execution Log — PRMS / Pending-review lock

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/prms-pending-review-lock` |
| Branch | `fix/prevent-prms-resubmission-during-active-review` |
| Started | 2026-11-19 |
| Approval mode | `gated` in the spec. The run follows the owner's standing rule: execute task to task, and stop only on `FATAL_FAIL`, HALT, Pivot or budget tripwire. The client tasks (T-04, T-05) are not committed before the owner sees them working |
| Routing | Implementer: Grok (`grok-4.7-*`) through Orca `worker-start --agent cursor`. Reviewer: a fresh Claude `akili-reviewer` (Opus). The Leader is Claude Opus 5.5. `author ≠ auditor` holds on both axes |
| Budget (design §12) | 5 tasks · about 300 production LOC + 550 test LOC · about 7 review rounds |

## 2. Task Execution History

### T-01 — Pure rule, history reader, and SQL fixture → **PASS**

- **Date:** 2026-11-19
- **Final status:** PASS, on attempt 1.
- **Requirements covered:** R-PRL-001. Scenarios S-1…S-6, S-26, S-27, and the "no rows" half of S-4.
- **Skills / effort:** `nestjs-expert` and `tdd`, as the task lists. Effort `high` instead of the default `medium`, because this is the core rule and its SQL semantics.
- **Attempts:** 1.

#### Attempt 1

- **Worker:** Orca dispatch `ctx_47897486477c` (task `task_d6556a8099ce`), Cursor · `grok-4.7-high`.
- **Files changed:**
  - new `server/researchindicators/src/domain/entities/result-prms-sync/eligibility/prms-push-status.ts` and its `.spec.ts`
  - new `server/researchindicators/src/domain/entities/result-prms-sync/prms-push-status.reader.ts` and its `.spec.ts`
  - `server/researchindicators/src/domain/entities/result-prms-sync/result-prms-sync.module.ts` (provider)
  - new `server/researchindicators/test/fixtures/prms-push-status.fixture-spec.ts`, band `901000`–`901009`
- **Implementer verification:**
  - `npm test -- --silent prms-push-status` → 2 suites, 9 tests passed.
  - `npm run test:fixtures -- prms-push-status` → 7 passed.
  - `npx eslint <6 files>` → exit 0.
  - `npm run build` → exit 0.
- **Falsifiers.** Each was observed red, quoted by the Implementer, and reverted:
  - **(a)** The stable sort was replaced with a `localeCompare` on `occurredAt`. The 698 case went red: expected `"status": "pending_review"` with `"resubmittable": false`, received `"status": "rejected"` with `"resubmittable": true` for `"year": 2026`. S-27 also turned `rejected`.
  - **(b)** The `phase_year` projection was changed to `h.result_year`. S-26 went red: expected `"status": "never_pushed"`, received `"status": "rejected"` for `"year": 2027`.
  - **(c)** `raw_headers IS NOT NULL` was dropped from `imported`. The push row went red: `Expected: 0`, `Received: null`.
  - **(d)** The `CAST` was dropped. The string-year case went red: `Expected: 2026`, `Received: "2026"`.
- **Consumers sweep:** `git grep -n "PrmsPushStatusReader\|derivePrmsPushStatus" -- server` returned 0 hits before the task and 2 after, both in `result-prms-sync.module.ts`. The new files were untracked at that point, so git grep did not see them.
- **What the checks cannot reach (KZ-017, Implementer):**
  - The reader spec reads the text of `PUSH_EVENTS_SQL` but never runs `read()`.
  - The fixture cannot exercise falsifier (a), because the reader passes no timestamps. Only the rule unit test catches it.
  - `npm run build` excludes spec files and the fixture.
- **Evidence re-run (non-author, Leader inline) → `VERIFIED`.** The Leader rebuilt the TEST container (see *Issues encountered*) and created the history table from the migrations' own SQL. Results:
  - unit 9/9 passed;
  - fixture 7/7 passed;
  - smoke 1/1 passed;
  - eslint exit 0;
  - build exit 0.

  These match the Implementer's report.
- **Reviewer verdict:** `STATUS: PASS` from a fresh Claude `akili-reviewer` in checklist mode. Summary: the rule, the reader SQL, the fixture and the provider registration match T-01 and design §5.1.1–5.1.7. All four falsifiers were observed red. Issues: none.
- **runtime events:** none.
- **spawns:**
  - Implementer: about 70 calls (the worker's own count), tokens not reported by the host. It ended complete. 70 calls is past the persona's 60-call checkpoint bound, and the worker did not report a checkpoint. This is recorded as information only.
  - Reviewer: calls and tokens not reported by the host. It ended complete.

#### ADVISORY (4R, from the final Reviewer verdict; never gates)

1. **Readability / spec drift.** `PrmsPushEvent.decision` is typed `string | null`, while design §5.1.1 says `'APPROVE' | 'REJECT' | null`. The task's "unknown verb" unit test needs the wider type, and the reader still emits only APPROVE/REJECT. This was resolved by the spec edit recorded under *Decisions made*.
2. **Reliability (falsifier gap).** No test exercises the `correlation_outcome = 'CORRELATED'` predicate. If it were dropped, no test would go red. A `NO_REFERENCE` REJECT row seeded in a spare band slot (901005/7/8) would close the gap. The task does not require that row, so it is recorded here and not turned into work (Advisory Never Becomes A Task).
3. **Readability.** `statusOf` maps any non-APPROVE decision to `rejected`. That is correct only because `decides()` filters first. An explicit `=== 'REJECT'` would be more robust.
4. **Risk / KZ-017.** The reader spec checks the SQL text only. Falsifier (a) is caught only by the rule unit test. This is covered as designed by DD-2.

#### Decisions made

- **Execute-time spec edit:** `design.md` §5.1.1, amended 2026-11-19. The rule's input type `decision` is widened to `string | null` and the reader still emits only `'APPROVE' | 'REJECT' | null`. This aligns the design with the T-01 "unknown verb" test. It does not change what R-PRL-001 means. It is carried as a named conformance check in the T-02 Reviewer brief.
- The Leader kept the TEST container rebuilt from scratch rather than the worker's partially migrated one.

#### Issues encountered

- **The TEST scratch bootstrap is broken, and that predates this spec (open item).**
  - On a fresh container, `npm run migration:test:bootstrap` fails at `CreatePiDelegates1787600000000` with `Referencing column 'project_id' and referenced column 'agreement_id' in foreign key constraint 'FK_pi_delegates_project_id' are incompatible.` (errno 3780).
  - Every later migration therefore never runs on the scratch schema, `1790086170692-createPrmsWebhookDeliveryTable` included.
  - The worker had also run `migration:test:execute` on the old container, which failed part-way (`clarisa_innovation_use_levels already exists`). It then created the table by hand.
  - The Leader discarded that container (`compose:test:down` → `up` → `migration:test:bootstrap`, which failed as above). It then created `result_prms_sync_history` from the exact `up()` SQL of 1790086170692, 1792673320363 (`platform_code` column + index) and 1792681023849 (collation). The fixture evidence rests on that copy.
  - The bootstrap defect needs its own fix and is out of scope here.
- **Implementer over the call bound:** see *spawns* above.

#### Running totals (Budget Tripwire)

- Tasks: 1 of 5.
- LOC: `git diff --stat` at commit (see the commit). Production is about 190 lines (rule + reader + module). Tests are about 520 lines (rule spec + reader spec + fixture). That is within budget for now, but the tests already consume most of the 550-line estimate.
- Review rounds: 1 of about 7.

### T-02 — Gate entry `prms_resubmittable` and the typed refusal → **PASS**

- **Date:** 2026-11-19
- **Final status:** PASS, on attempt 1.
- **Requirements covered:**
  - R-PRL-002 (S-7…S-10);
  - NFR-PRL-003 on the server: a held key gets 409 whatever the caller, and a read error gets 500 with no PRMS call.
- **Skills / effort:** `nestjs-expert`, `error-handling-patterns` and `tdd`, as the task lists. Effort `high`, because the task touches the authorization and push path for every role and TIP (override f).
- **Attempts:** 1.

#### Attempt 1

- **Worker:** Orca dispatch `ctx_b1d455df6e40` (task `task_8f4d1999dc6e`), Cursor · `grok-4.7-high`. It was kept open until the PASS.
- **Files changed:**
  - `server/researchindicators/src/domain/entities/result-prms-sync/eligibility/sync-gate.ts` and its spec
  - `.../result-prms-sync/repositories/result-prms-sync-log.repository.ts` and its spec
  - `.../result-prms-sync/result-prms-sync.service.ts` and its spec (`PrmsSyncNoRowRefusalException` added; `throwHttp` removed)
  - `.../result-prms-sync/result-prms-sync.controller.ts` and its spec
  - `.../result-prms-sync/dto/prms-sync.dto.ts`
  - `server/researchindicators/src/domain/tools/tip-integration/tip-integration.service.spec.ts`
  - `server/researchindicators/test/result-prms-sync-claim-concurrency.integration-spec.ts`, `test/tip-prms-push.integration-spec.ts` and `test/prms-platform-identity.integration-spec.ts` (the new constructor argument only)
- **Red-first runs on the code before the change.** All quoted by the Implementer:
  - The service "held → 409" test received `"claimCalls": 1, "entryId": null, "normalizerCalls": 1, "status": null`. It expected `0` / `prms_resubmittable` / `0` / `409`. The same shape came back for `SYSTEM_ADMIN` and for `TIP_SYNC`.
  - Gate position: `Expected: 3` / `Received: -1`.
  - Pending and Approved: `decision.allowed` `Expected: false` / `Received: true`.
  - Controller, `not_already_synced`: `Expected: "not_already_synced"` / `Received: undefined`.
  - Controller, held year: `Expected: 409` / `Received: 200`.
  - The service "history unread" test was already green before the change, so it is not TDD evidence. The repository spec's reader-throw test, together with falsifier (b), carries the fail-closed proof instead.
- **Implementer verification:**
  - `npm test -- --silent result-prms-sync tip-integration` → 17 suites, 366 tests passed.
  - eslint on 13 files → exit 0.
  - `npm run build` → exit 0.
  - `knowledge-product.builder.spec` (consumer) → 5 passed.
- **Falsifiers.** Each was applied after the green run, observed red, and reverted:
  - **(b)** A `try/catch` that returns `undefined`: `Received promise resolved instead of rejected`.
  - **(a)** The entry removed: `"normalizerCalls": 1, "entryId": null`.
  - **(c)** A plain `ConflictException`: `Expected: "prms_resubmittable"` / `Received: null`.
- **Consumers sweep:** every hit was re-run inside the 366 tests, and `knowledge-product.builder.spec` separately. `tip-integration.service.ts` does not match the grep. A new TIP spec asserts that a gate `PrmsSyncNoRowRefusalException` counts as `NOT_SENT=1`, `REFUSED_BY_STAR=0` (P-7).
- **Evidence re-run (non-author, Leader inline) → `VERIFIED`:**
  - unit 17 suites / 366 tests passed;
  - eslint exit 0;
  - build exit 0.
- **Integration check, also Leader inline.** `npm run test:integration -- result-prms-sync-claim-concurrency tip-prms-push prms-platform-identity` passed 2 suites (15 tests).
  - The claim-concurrency suite fails 2 tests with `QueryFailedError: Unknown column 'result_id' in 'where clause'`.
  - The **same failure occurs on the code from before T-02** (the T-02 changes stashed, then restored).
  - So it comes from the stale TEST scratch schema (the T-01 open item), not from this task. Those two tests give no evidence either way until the bootstrap is fixed.
- **Reviewer verdict:** `STATUS: PASS` from a fresh Claude `akili-reviewer` in checklist mode. Summary:
  - The entry, the fail-closed snapshot, the typed exception and the `gate_entry_id` mapping inside the envelope all match §4 POST, §5.2, DD-3 and DD-9.
  - The disqualifier is met: the tests assert the entry id, not only the status.
  - The named check on the `design.md#5.1` item 1 amendment passes, because T-02 consumes only the derived status.
  - Issues: none.
- **Override (d) finding from the Reviewer, recorded as a decision below.** With `throwHttp` removed, every no-row gate refusal throws the typed exception:
  - the 404 `result_exists` refusal now also carries `gate_entry_id`;
  - the 503 `feature_enabled` refusal now carries `noRowRefusalData` in `data`, which it did not before.

  The change is additive. The Reviewer found no client effect, because the sidebar parses `failure_reason` only when it contains `{`. TIP still counts these refusals as `NOT_SENT`.
- **runtime events:** none.
- **spawns:**
  - Implementer: about 72 calls (the worker's own count), tokens not reported by the host. It ended complete. That is again past the 60-call checkpoint bound with no checkpoint reported; information only.
  - Reviewer: 15 tool uses and about 114k tokens, as the host reported. It ended complete.

#### ADVISORY (4R, from the final Reviewer verdict; never gates)

1. **Reliability.** No test pins the 503 `feature_enabled` response, which now includes `data`. A controller case through the real service would cover it.
2. **Readability.** `gate.entryId ?? ''` hides a state that cannot happen. Typing the exception's `entryId`, and the DTO's `gate_entry_id`, as the `SyncGateEntryId` union would make it impossible by type.
3. **Risk.** When `report_year_id` is null, the reader is called with year 0 and returns `never_pushed`. The Reviewer could not build a case where this lets a held year through. Separately, the existing `reporting_year` entry also lets a null year pass, and that predates this spec.
4. **Integration evidence.** The two claim-concurrency tests give no evidence until the TEST schema is rebuilt (see the T-01 open item).

#### Decisions made

- **Execute-time spec edit: `design.md` §4 POST, amended 2026-11-19.** It records that every no-row gate refusal carries its `gate_entry_id`, and that the 503 gains `data`. Statuses and descriptions do not change. This does not change what R-PRL-002 means. It is carried as a named conformance check in the T-03 Reviewer brief.
- **Execute-time spec edit: `tasks.md` T-02 Tests, amended 2026-11-19.** The text named `recordInsideLock`, which the log repository does not have. It now names `claimAttempt` and `insertRefusedByStar`, which is what the Implementer asserted.
- `throwHttp` was removed once its only call site moved to the typed exception. This stays inside the task's declared file (`result-prms-sync.service.ts`, "the `throwHttp` call site").

#### Not Done / Assumptions (Implementer, verbatim in substance)

- There is no `recordInsideLock` method. "Attempt count unchanged" is asserted as `claimAttempt` and `insertRefusedByStar` not being called.
- A row with a null `report_year_id` still calls the reader, with year 0.
- The integration specs were edited but not run by the Implementer. The Leader ran them, with the results above.

No owed item and no blocker, so no continuation is needed.

#### Running totals (Budget Tripwire)

- Tasks: 2 of 5.
- LOC (from `git diff --stat`): T-01 was 662 code lines; T-02 is 649 inserted and 40 deleted across 13 files.
- Combined, the test lines are already above the 550 estimate, while production stays within about 300.
  - Production so far: about 163 (T-01) plus 101 (T-02), about 264 in all.
  - Tests so far: about 514 (T-01) plus 548 (T-02), about 1,062 in all.
- Review rounds: 2 of about 7.
- **Tripwire fired: test LOC is about 1,050 against an estimate of about 550.** See the stop record below.

## Budget tripwire stop — after T-02 (2026-11-19)

- **Budget (design §12):** about 300 production LOC plus about 550 test LOC, 5 tasks, about 7 review rounds.
- **Actual after 2 of 5 tasks:** about 264 production LOC (on track) and **about 1,062 test LOC, about 1.9× the test estimate** with three tasks still to run. Review rounds: 2, both PASS on the first attempt.
- **Cause:** each server task's tests run well over the per-task share.
  - T-01's fixture is 399 lines, because it seeds every S-6/S-26/S-27 row the task mandates.
  - T-02 rewrote existing `ConflictException` assertions and added SYSTEM_ADMIN, TIP_SYNC, Swagger and controller real-service cases (548 test lines).
  - The design estimated tests at about 550 for all five tasks together.
- **Projection:** T-03 (S) plus the two client component tasks (T-04 and T-05 are each M, with deferred-timing tests) are likely to add about 600–900 more test lines. That would put the spec at about 1,700–2,000 test LOC, against an estimate of 550.
- **Status:** the run is stopped for the owner at this gate, per `/akili-execute` §2.4: "No mandate widens pre-approval: an owner brief that says 'never stop' or 'treat every gate as approved' pre-approves routine gates only. The exceptions in `/akili-propose` Step 1 *Approval Mode* (HALT, Pivot, budget tripwire, `FATAL_FAIL`, `PRODUCT_BUG`, destructive actions) still stop." This stop is not logged `auto-approved`.
- **Owner decision (2026-11-19):** continue, with lean tests.
  - The test budget is raised, so the tripwire no longer stops the run for test LOC alone. A new overrun on production LOC or review rounds would still stop it.
  - From T-03 on, each Implementer brief says: cover each scenario the task lists once, and add no duplicate-shape cases beyond the task's list.

### T-03 — `GET …/prms-sync` gains `pushYear` and `push_status` → **PASS**

- **Date:** 2026-11-19
- **Final status:** PASS, on attempt 1.
- **Requirements covered:** R-PRL-003 (S-11, S-12), and the "no version" half of S-4.
- **Skills / effort:** `nestjs-expert` and `api-design-principles`, as the task lists. Effort `medium`.
- **Brief:** lean tests, per the owner's decision after T-02.
- **Attempts:** 1.

#### Attempt 1

- **Worker:** Orca dispatch `ctx_66f8d269418f` (task `task_9be0f115c517`), Cursor · `grok-4.7-medium`.
- **Files changed:**
  - `server/researchindicators/src/domain/entities/result-prms-sync/result-prms-sync.controller.ts` and its spec
  - `.../result-prms-sync/result-prms-sync-status.reader.ts` and its spec
  - `.../result-prms-sync/dto/prms-sync.dto.ts`
  - `server/researchindicators/test/prms-platform-identity.integration-spec.ts` (constructor only)
- **Red-first runs on the code before the change:**
  - S-11: `Expected: 2025 Received: undefined`.
  - 400 for `abc` and for `1800`: `Expected: 400 Received: 200`.
- **Implementer verification:**
  - `npm test -- --silent result-prms-sync` → 11 suites, 228 tests passed.
  - The seven unit specs from the `getStatus` consumer grep → 315 tests passed.
  - eslint → exit 0.
  - build → exit 0.
- **Falsifier:** the code was changed to ignore `pushYear` (`year: reportYear ?? 0`). S-11 went red with `Expected: 2025 Received: 2026`. Reverted.
- **Consumers:**
  - The client grep found `api.service.ts:1114` (POST_PrmsSync), `api.service.ts:1119` (GET_PrmsSyncHistory) and `http-error.interceptor.ts:114`. None of them calls GET status, which confirms P-5.
- **Evidence re-run (non-author, Leader inline) → `VERIFIED`:**
  - unit: 11 suites, 228 tests passed;
  - `npm run test:integration -- prms-platform-identity`: 8 of 8 passed;
  - eslint: exit 0;
  - build: exit 0.
- **Reviewer verdict:** `STATUS: PASS` from a fresh Claude `akili-reviewer` in checklist mode. Summary:
  - `pushYear` is parsed inside the existing `try`. It must be an integer from 1901 to 2155; otherwise the response is a 400 in the standard envelope.
  - The year used is `pushYear ?? report_year_id`. The platform comes from the resolved row, with NULL treated as STAR.
  - Guards and roles are unchanged. A failed history read still returns 500 through the existing catch.
  - Both named checks hold: the `design.md#4` POST amendment did not regress, and the `design.md#5.1` item 1 amendment is consistent.
  - Treating a blank `pushYear` as absent is acceptable under §4 GET.
  - Issues: none.
- **runtime events:** none.
- **spawns:**
  - Implementer: about 55 calls (the worker's own count), tokens not reported by the host. It ended complete.
  - Reviewer: not reported by the host. It ended complete.

#### ADVISORY (4R, from the final Reviewer verdict; never gates)

1. **Reliability.** When `report_year_id` is NULL and `pushYear` is absent, the response carries `push_status.year: 0` with `never_pushed`. The gate behaves the same way. Whether `results.report_year_id` can be NULL in the live schema was not checked. If it can, the client would show year 0.
2. **Readability.** There are now five module-local copies of `platformCodeOf`, and they differ slightly. They should be consolidated into one helper in a later cleanup.
3. **Risk (KZ-017).** Swagger is checked through decorator metadata only. The 400 tests call the controller directly, which is enough because the 400 comes from the handler's own `ResponseUtils.format`. The Done item "Swagger shows `pushYear` and `push_status`" stays at metadata level until someone opens `/swagger` on a running app.

#### Running totals (Budget Tripwire)

- Tasks: 3 of 5.
- T-03 alone: 99 production lines and 241 test lines.
- Cumulative: about 363 production lines, against an estimate of about 300. That is about 21% over, which is within the normal margin for an estimate. About 1,303 test lines, with the test budget already raised by the owner.
- Review rounds: 3 of about 7.
- **Tripwire fired again, on production LOC.** About 363 production lines against an estimate of about 300. The owner's decision after T-02 raised only the test budget, so this overrun stops the run for the owner, per `/akili-execute` §2.4. This stop is not logged `auto-approved`.
  - **Cause:** T-02 (about 101 lines) and T-03 (about 99 lines) each needed more DTO, Swagger and parsing code than the per-task share. T-03 also widened `RESULT_STATUS_SQL` and added `parsePushYear`.
  - **Projection:** T-04 and T-05 are client tasks: an API method, an interface, the version-selector flow, and the sidebar state and tooltip. They will likely add about 150–250 production lines, for a total of about 510–610.
- **Owner decision (2026-11-19, after T-03):** continue to T-04 and T-05.
  - The production budget is raised as well.
  - Client code is not committed until the owner has seen it working on Dev (T-05 HITL).

### T-04 — Version selector: status check, warning, busy state → **PASS; owner HITL approved**

- **Date:** 2026-11-19
- **Final status:** PASS, on attempt 1. The code is left **uncommitted** until the owner sees it working, together with T-05 (task Done item, and the owner's standing rule).
- **Requirements covered:** R-PRL-004 (S-11, S-13…S-20), NFR-PRL-001, NFR-PRL-002 (busy state, reuse of the alert), and NFR-PRL-004 (the client half: it consumes `push_status` only).
- **Skills / effort:** `angular-developer`, `ui-ux-pro-max` and `tdd`, as the task lists. Effort `high`, because this is the live update path and the S-20 race needs deferred timing.
- **Brief:** lean tests.
- **Attempts:** 1.

#### Attempt 1

- **Worker:** Orca dispatch `ctx_31ade71448d6` (task `task_c7d02c797d72`), Cursor · `grok-4.7-high`.
- **Files changed:**
  - new `client/research-indicators/src/app/shared/interfaces/prms-push-status.interface.ts`
  - `client/research-indicators/src/app/shared/services/api.service.ts` and its spec
  - `client/research-indicators/src/app/pages/platform/pages/result/components/version-selector/version-selector.component.{ts,html}` and its spec
- **Red-first runs on the code before the change:**
  - S-13: expected `getCalls 1, patchCalls 0, severity warning, summary "PRMS review in progress"`; received `getCalls 0, patchCalls 1, severity success, summary "RESULT UPDATED"`.
  - S-20: expected `ariaBusy "true", getCalls 1, patchCalls 0`; received `ariaBusy null, getCalls 0, patchCalls 1`.
- **Implementer verification:**
  - `npm test -- --silent version-selector api.service` → 351 passed, but the command exits 1 on the global coverage threshold. That is expected for a targeted run (client guide, K-020). With `--coverage=false` it exits 0 with 351 passed.
  - lint → exit 0.
  - `tsc -p tsconfig.app.json` → 0 errors.
  - `tsc -p tsconfig.spec.json` → the known baseline of 946 lines. None are in the touched version-selector or interface files. The hits in `api.service.spec.ts` (lines 70–71, 2286, 2301) were already there.
- **Falsifiers.** Each was applied after the green run and reverted:
  - **(a)** The `checkingPrms` guard was removed. S-20 went red with `Expected: 1 / Received: 2` GET calls.
  - **(b)** The URL `version` was sent instead of the chosen year. S-14 went red with `Expected: 1, "2025" / Received: 1, "2026"`.
- **Consumers:**
  - `submitReportingCycle`, `showPrompt`, `pickerAlert` and `updateResult` appear only in the version-selector.
  - `GET_PrmsPushStatus` appears in the API service, the version selector and their specs.
- **Evidence re-run (non-author, Leader inline) → `VERIFIED`:**
  - 3 suites and 351 tests passed (`--coverage=false`);
  - lint: exit 0;
  - app tsc: exit 0;
  - spec tsc: no errors in `version-selector` or `prms-push-status` files.
- **Reviewer verdict:** `STATUS: PASS` from a fresh Claude `akili-reviewer` in checklist mode. Summary:
  - Both confirms take one path, `checkThenSubmit`, which uses the chosen year (never `version`).
  - The `checkingPrms` guard is cleared in `finally`.
  - S-20 runs with genuinely deferred timing.
  - The warning severity, titles and actions match S-13 and S-15. The fail-open path works.
  - The API call goes through ApiService with `noCache` and `useResultInterceptor`.
  - The busy-state ARIA uses token classes, and the task adds no new hex value.
  - NFR-PRL-004 holds: no `event_source`/`decision` reads. The fixtures arrange the transition (KZ-015).
  - Both named checks hold, because the client depends on nothing the amendments changed.
  - Issues: none.
- **runtime events:** none.
- **spawns:**
  - Implementer: about 70 calls (the worker's own count), tokens not reported by the host. It ended complete.
  - Reviewer: not reported by the host. It ended complete.

#### ADVISORY (4R, from the final Reviewer verdict; never gates)

1. **Hex color.** `#409acd` already existed on the *Update result* span and was only moved into the new ternary. It is not new, but it sits in an edited line. It could be swapped for the matching `--ac-*` token in a follow-up.
2. **Accessibility (reachable, pre-existing).** The *Update result* `<span>` has no `tabindex` or `role="button"`, so keyboard users cannot focus it, and its `aria-disabled`/`aria-busy` never reach assistive technology. This predates the task. It is raised for the owner at the HITL keyboard step (T-05 HITL step 4). Advisory Never Becomes A Task applies: the owner decides.
3. **Reliability.** The fail-open branch for `successfulRequest: false` has no test; S-19 covers only the thrown rejection. This is acceptable under the lean-test decision.
4. **Resilience.** An empty year would send a GET with no `pushYear`. It is not reachable, because the picker has `selectorRequired: true`.
5. **What jsdom cannot see:** the muted look, the spinner, the focus trap and Esc. These belong to the HITL check.

#### Decisions made

- **Warning body copy.** The Implementer composed it from the requirements wording, because design §5.3 quotes only the titles.
  - Pending: "The {year} version of this result was sent to PRMS and is pending review. PRMS will not receive the changes, nor accept a new push, until it rejects the current one."
  - Approved: "PRMS already approved the {year} version of this result and will not accept the updated one."

  It follows S-13 and S-15 closely. The owner sees it at the HITL.

#### Running totals (Budget Tripwire)

- Tasks: 4 of 5. Production and test budgets were raised by the owner.
- Review rounds: 4 of about 7.

### T-05 — Sidebar: PRMS SYNC disabled while held → **PASS; owner HITL approved**

- **Date:** 2026-11-19
- **Status:** code PASS on attempt 1. The task stays open (not `[x]`) until the owner runs the HITL on Dev and approves visually. The client code for T-04 and T-05 is **uncommitted** until then.
- **Requirements covered by code:** R-PRL-005 (S-21…S-25), NFR-PRL-002 (tooltip on a disabled button, still to be confirmed at HITL), NFR-PRL-004 (client half).
- **Skills / effort:** `angular-developer` and `ui-ux-pro-max`, as the task lists. Effort `high`.
- **Brief:** lean tests.
- **Attempts:** 1.

#### Attempt 1

- **Worker:** Orca dispatch `ctx_3d34e2ed9cc6` (task `task_48c46263928b`), Cursor · `grok-4.7-high`.
- **Files changed:** `client/research-indicators/src/app/shared/components/result-sidebar/result-sidebar.component.{ts,html}` and its spec.
- **Red-first runs on the code before the change:**
  - S-21: `Expected true Received false`. The button was still enabled.
  - S-25: received the generic copy `"This result was not synchronized.<br>Please try again. If the problem continues, contact support."` instead of the escaped description.
- **Implementer verification:**
  - `npm test -- --silent --coverage=false result-sidebar` → 187 passed.
  - lint → passed.
  - app tsc → 0 errors.
  - spec tsc → the error set for `result-sidebar.component.spec.ts` is the same as at HEAD (20 errors already there, none new).
- **Falsifiers.** Each was applied after the green run and reverted:
  - **(a)** The held branch was moved before `canSyncPrms()`. The not-approved case went red with `Received: PRMS is reviewing this version...`.
  - **(b)** The reset on version change was dropped. The stale-value test kept the 2024 `pending_review`.
- **Consumers:** `result-sidebar.component.{ts,html,spec.ts}`, plus a comment in `alliance-alignment.component.ts:504`. The only spec is the sidebar spec, which was re-run.
- **Evidence re-run (non-author, Leader inline) → `VERIFIED`:**
  - sidebar: 187 passed;
  - lint: exit 0;
  - app tsc: exit 0.
- **Full client suite**, run because the sidebar renders on many screens (KZ-003):
  - Runs 1 and 2, with the changes: 379 of 380 suites passed. `truncated-text-tooltip.directive.spec.ts` reported `Test suite failed to run`, with 0 failed tests.
  - Run 3, with the changes: 380 of 380 suites, 8935 tests passed.
  - Clean tree (client changes stashed): 380 of 380.
  - That suite passes on its own both with and without the changes.

  This is the documented flaky-runner signature: a failed suite with zero failed tests. It is not attributed to this task.
- **Reviewer verdict:** `STATUS: PASS` from a fresh Claude `akili-reviewer` in checklist mode. Summary:
  - The tooltip order matches §5.4 item 4 exactly.
  - The button is disabled, and `onPrmsSync` returns early, while loading or held.
  - The fetch has its own generation counter and resets to `null` before it waits.
  - A failed read leaves the button as it is today.
  - The status is re-fetched after a success and after the `prms_resubmittable` 409 only.
  - The 409 is matched on `gate_entry_id` alone, so other gate refusals that carry an id keep today's copy (named check on the `design.md#4` amendment). The description is escaped, and a test proves it.
  - No new `event_source`/`decision` reads (NFR-PRL-004).
  - Precedence is tested on the not-approved case, and the tests change the version after the first render (KZ-015).
  - Issues: none.
- **runtime events:** none.
- **spawns:**
  - Implementer: the worker reports staying under 60 calls (no exact count); tokens not reported by the host. It ended complete.
  - Reviewer: not reported by the host. It ended complete.

#### ADVISORY (4R, from the final Reviewer verdict; never gates)

1. **Accessibility (NFR-PRL-002).** The held reason is a tooltip on a native `disabled` button. Such a button cannot take keyboard focus, and some browsers fire no hover events on it. The existing "already synced" and "will become available" tooltips share the same pattern, so this is not new to T-05. The owner should try Tab as well as hover at HITL step 1.
2. **Readability.** Hex literals that were already there (`#035BA9`, `#E8EBED`, `#8D9299`) sit on the edited `[ngClass]` lines.
3. **Readability.** `isPrmsResubmittableGate` also falls back to a top-level `data.gate_entry_id`. That is harmless, and a short comment or dropping it would make it clearer.
4. **Reliability (tests only).** The shared `beforeEach` gained `await fixture.whenStable()` and `createUrlTree`/`serializeUrl` on the router mock. This affects all 187 sidebar tests, which still pass. It is broader than T-05 needs.
5. **Readability (tests only).** S-22 and S-24 use a version year that differs from `push_status.year`. This is cosmetic.

#### Decisions made

- **Tooltip copy**, taken from S-21 and S-22:
  - Pending: "PRMS is reviewing this version and it can be sent again only if PRMS rejects it."
  - Approved: "PRMS already approved this version."
- `gate_entry_id` is read from `errorDetail.data`, falling back to `data`.

#### Running totals (Budget Tripwire)

- Tasks: 5 of 5 with code PASS; T-05 HITL is pending.
- The T-04 and T-05 client code adds 166 production lines and 439 test lines. Both budgets were raised by the owner.
- Review rounds: 5 of about 7.

#### HITL on Dev (owner, 2026-11-19) → **APPROVED**

The owner ran this branch's server and client natively against the shared Dev DB, on result **698**.

- **Step 1, observed (screenshot).** PRMS SYNC is disabled in the sidebar.
- **Step 2, observed (screenshot).** *Update result* → *Yes, update 2026* shows the warning *PRMS REVIEW IN PROGRESS*: "The 2026 version of this result was sent to PRMS and is pending review. PRMS will not receive the changes, nor accept a new push, until it rejects the current one." The actions are *Cancel* and *Update anyway*.
- **An apparent defect, triaged as data, not code.** The sidebar card showed **REJECTED** for "PRMS sync #2" while the warning said pending. The owner wrote: "el resultado que probe esta rejected ... pero sale el mensaje". A read-only check on Dev showed the following:
  - `result_prms_sync_history` rows 339, 344 and 345, and `result_prms_sync_log` rows 44, 52 and 53.
  - Push #2 (log 53, `ACCEPTED`, HTTP 200, 19:42Z) came **after** the PRMS reject (history 344, 19:09Z). So PRMS really holds 698/2026 as pending, and the warning was correct.
  - The card was wrong because STAR push rows 339, 342 and 345 stored `occurred_at` 5 hours behind `created_at`, and the card orders by `COALESCE(decided_at, occurred_at)` (`prms-sync-history.reader.ts:107`).
  - The owner confirmed the cause: "ese fue un problema que tuve por que mi local tenia zona horaria diferente". They corrected the Dev data themselves and re-tested.
  - The rule in this spec orders by `id` and is not affected by timestamps.
- **Owner verdict after the re-test:** "si quedo al pelo".
- **Steps 3 and 4 (picker year, keyboard), observed by the owner.** Asked separately, the owner confirmed: "sí probé los pasos 3 y 4". The HITL box is ticked on that statement.
- **Step 5** was not run. It was optional, at the owner's choice.
- **Copy:** the warning and tooltip wording chosen by the workers was accepted as shown.
