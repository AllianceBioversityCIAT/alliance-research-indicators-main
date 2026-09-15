# Validation Report — Agresso Staff / Provision and restore platform accounts

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/agresso-staff-sec-users-sync` |
| Package | `server/researchindicators` |
| Mode | Final Conformance Audit (`/akili-validate`) |
| Date | 2026-09-15 |

## 2. Summary

**Verdict: READY WITH ACCEPTED WARNINGS**

The implementation is functionally complete, achieving the intended provisioning, backfilling, and reactivation logic without introducing deactivation capabilities (which are rightfully split into their own spec). All DB assertions are verified against real infrastructure. However, a few documentation discrepancies, the un-run `/akili-test` test report, and T-09's literal completion claims leave minor gaps that are recognized, documented, and accepted.

## 3. Task Completion

9 tasks were specified. 
* 8 tasks are marked `[x]` with execution evidence in `execution.md`. 
* **T-09 is `[~]` (substantially complete)**. This is an honest and accurate assessment by the Leader: not all 30 gates in `requirements.md` §10 have a dedicated database fixture, some are covered at the unit tier with observed reds, and the statement count is asserted as bounded (`< 50` and `< 10` delta) rather than an exact integer. The execution log provides full transparency on this, making the `[~]` state a verified truth rather than an understatement or overstatement.

## 4. File Existence

All files explicitly named in `design.md` §2.1 and `tasks.md` were verified to exist:
* `src/domain/tools/agresso/staff/sec-user-reconciler.repository.ts` and `.spec.ts`
* `src/domain/tools/agresso/staff/sec-user-reconciler.service.ts` and `.spec.ts`
* `src/domain/tools/agresso/staff/dto/sec-user-reconciliation-summary.dto.ts`
* `src/domain/tools/agresso/staff/agresso-staff-tools.controller.ts` and `.spec.ts`
* `src/domain/tools/agresso/staff/agresso-staff-tools.service.ts` (and `.spec.ts`)
* `src/domain/tools/agresso/staff/agresso-staff-tools.module.ts`
* `test/fixtures/agresso-staff-reconciler.fixture-spec.ts`

## 5. Build Integrity

All integrity checks pass:
* **`npm test -- --silent`**: PASS. 369 suites, 3186 tests.
* **`npx eslint src/domain/tools/agresso/staff`**: PASS. Exit 0, clean.
* **`npx tsc --noEmit -p tsconfig.json`**: PASS. Exit 0.
* **`npx jest --config ./test/jest-fixtures.json test/fixtures/agresso-staff-reconciler.fixture-spec.ts`**: PASS. 1 suite, 15 tests.

**Test failures verification**: 
Running `test:fixtures` without `--testPathIgnorePatterns "agresso-staff-reconciler"` yields exactly 45 failed tests across 5 suites. 
Running it with `--testPathIgnorePatterns "agresso-staff-reconciler"` yields exactly the same 45 failed tests across 5 suites. 
*Conclusion*: The 45 failing tests are entirely pre-existing baseline failures (within `test/fixtures/innovation-use/`) and the agresso fixture tests introduce zero new failures.

## 6. Requirement Coverage

Coverage is confirmed at the scenario and clause level:
* **R-AGS-001**: Matched rows are routed properly. Exact matching used. The un-matched row scenario is verified (leaves byte-identical rows). 
* **R-AGS-002**: Carnet is backfilled only when empty. Names are truncated at 60 characters without failing the run. Stored carnets override payload mismatches, and `status_id`/`is_active`/`email` are preserved.
* **R-AGS-003**: New accounts receive `is_active = TRUE`, `status_id = 1`. Unusable emails and long carnets are skipped and logged. The payload collision rule (first arrival wins) is verified and tested.
* **R-AGS-004**: `CONTRIBUTOR` role granted. F-3 assertions for both carnet set equality AND row count equality are present and tested. Savepoint implementation proven to rollback correctly on concurrent inserts without aborting the batch.
* **R-AGS-006**: Trigger restricted to `SYSTEM_ADMIN` via `RolesGuard`.
* **R-AGS-007**: Reactivates existing `is_active = 0` accounts with `sec_user_id` preserved. Flips exactly one inactive `role_id = 3` to active, and strictly ignores all other roles (`role_id = 1` stays untouched).
* **NFR-AGS-001/002/003**: Idempotence verified. Statement counts bounded `O(⌈n / CHUNK⌉)` and tracked. Logging summary metrics output as specified.

## 7. Linting & Code Quality

No violations. The following ADVISORY findings were carried forward from `execution.md`:
* **ADVISORY (RISK)**: The repository extends `Repository<SecUser>` where `SecUser` is a DTO, not an `@Entity()`. Metadata-backed TypeORM methods (`find`, `save`, etc.) will throw `EntityMetadataNotFoundError` at runtime. Verified safe for `.query()`.
* **ADVISORY (RELIABILITY)**: `assertNumericIds` throws a raw `Error` instead of a Nest exception, interpolating rejected values verbatim. It is on a fire-and-forget path but risks logging untrusted input.
* **ADVISORY (RELIABILITY)**: `truncateName` relies on a string and could throw a `TypeError` if corrupt data bypasses T-02 validation. 
* **ADVISORY (RELIABILITY)**: Unparseable `last_login_at` timestamps could yield `NaN`, defeating `< 0` array-order logic in `compareCandidates`. 
* **ADVISORY (RELIABILITY)**: Missing null-guard on `member.resourceId.length` could cause `TypeError` aborts in `reconcile`.

## 8. Design Conformance

Overall implementation respects the architecture, including the split from the deactivation flow.

**Documentation corrections deliberately NOT applied:**
1. **§2.1/§2.2 "accumulate the saved rows"**: Implementation accumulates RAW payload instead. Accepted.
2. **§5.2 step numbering**: Contains literal duplicate rows (3,4,5,6,7 vs 3,4). Prose says "Step 4 dominates step 5", `tasks.md` says "step 7". Accepted as a merge artifact.
3. **§2.1/§5.2/§12 DD-14**: Three sites describe a carnet-based collapse comparator, which conflicts with `OQ-D5`'s "first-arrival" ruling. Accepted as stale text.
4. **§8**: Promises `created_by` / `updated_by` audit columns, but they are architecturally unreachable via a singleton repository (since `CurrentUserUtil` is request-scoped). Implementation rightfully omitted them.
5. **§9**: The reporting table omits `createsDiscarded` and `rolesGrantedOnReactivation` which were added to satisfy `NFR-AGS-003`.

**Cross-Document Figure Checks**:
* `requirements.md` §10 asserts 30 gates.
* `design.md` §14 asserted 1,580 LOC, re-baselined to ~3,000 LOC.
* `tasks.md` asserts 9 tasks. 
* *Findings*: `design.md` §14 LOC re-baselining was recorded honestly and the actual LOC landed appropriately (~2,200 LOC impl+spec).

## 9. Test Evidence Summary

* `/akili-test` was **NOT** run. No `test-report.md` exists. This is recorded as an explicit gap.
* Verification evidence relies entirely on `npm test` unit tests and T-09's single fixture file (`agresso-staff-reconciler.fixture-spec.ts`).

## 10. Agent Guide / Constitution Impact

* **OQ-8 / RSK-9**: Closed by construction via `?status=active`. Verified that the parameter was added to the SHARED builder `private query()`, so both pagination and the page loop are synchronized.
* **Budget**: `design.md` §14's mid-execution re-baseline to ~3,000 LOC is correctly reflected. 
* **Cross-spec hazard**: `changes/agresso-staff-deactivation/proposal.md` explicitly lists a hazard regarding the `?status=active` fetch filter, changing the meaning of "absent" members for deactivation from "not on the list" to "not active in Agresso". This creates severe risks for `EX-1` and `C-1`/`C-2`/`C-3`.

## 11. Remediation

* Run `/akili-archive` to sweep the five documentation corrections mentioned in section 8 out of `design.md`. 
* Correct `design.md` §8 to state explicitly that audit columns remain NULL for this sync.

## 12. Archive Readiness Recommendation

**READY WITH ACCEPTED WARNINGS**

The codebase meets requirements, build integrity, and testing obligations (excepting the `/akili-test` run). T-09's `[~]` status and the five documentation corrections are accepted as known follow-ups, and the fact that `/akili-test` never ran is explicitly acknowledged.
