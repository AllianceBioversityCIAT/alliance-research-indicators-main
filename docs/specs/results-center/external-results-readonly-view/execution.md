# Execution Log — Results Center / External Results Readonly View

- **Module:** results-center (client feature)
- **Spec id:** 2026-07-external-results-readonly-view
- **Linked requirements:** ./requirements.md
- **Linked design:** ./design.md
- **Linked tasks:** ./tasks.md
- **Linked judgment:** ./judgment.md
- **Leader model:** Opus 5 (this session)
- **Status field convention note:** this spec's `tasks.md` uses the general-setup task template's textual `Status: todo | in-progress | done | blocked` convention rather than `[ ]`/`[~]`/`[x]` checkboxes. This log follows that same convention for consistency — `todo` → `in-progress` (loop running) → `done` (Reviewer PASS) / `blocked` (HALT or Pivot).
- **Created:** 2026-07-27

---

## Task Execution History

### T-01 — Extend `findMetadataResult()` + `MetadataResultDto` with 4 fields

- **Status:** done (PASS on attempt 1)
- **Date:** 2026-07-27
- **Requirements covered:** R-RC-011
- **Skills used:** `nestjs-expert`, `api-design-principles` (as listed in tasks.md — no deviation)
- **Effort dial:** medium

**Attempt 1**
- **Files changed:**
  - `server/researchindicators/src/domain/entities/results/results.service.ts` — widened `findMetadataResult()`'s `select` object (~:782-791) and return object (~:825-833) with `platform_code`, `public_link`, `external_link`, `updated_at`.
  - `server/researchindicators/src/domain/entities/results/dto/metadata-result.dto.ts` — added the 4 fields as optional `@ApiProperty({ required: false })`.
  - `server/researchindicators/src/domain/entities/results/results.service.spec.ts` — extended the existing select-assertion and added 2 new tests (STAR fixture, TIP fixture).
- **Implementer verification:** `npm run lint` clean; `npx jest results.service.spec --silent` → 2 suites, 96/96 passed; `npm run build` (`nest build && npm run build:admin`) succeeded.
- **Reviewer verdict:** `PASS`. Independently re-verified (not just trusted the diff): confirmed `platform_code`/`external_link`/`public_link` are real pre-existing `Result` columns (`result.entity.ts:177-219`) and `updated_at` is a genuine `AuditableEntity` `@UpdateDateColumn` **without** `select: false` (unlike `created_by`/`updated_by`/`deleted_at` on the same base class) — resolving design.md §5's open implementation question in the Implementer's favor. Confirmed no migration was created, confirmed scope containment (3 files, +130/−0, no other endpoint touched, `results.controller.ts` untouched so envelope/auth/routing unaffected), confirmed the DTO's only other consumer (`result-pdf-report.mapper.ts`) destructures named fields only so cannot leak the new fields. Reproduced lint/typecheck/targeted-suite (96/96) and additionally ran the **full** suite independently: 320 suites, 2031/2031 tests, coverage 83.38% (well above the 60% floor).
- **Advisory (non-blocking):** the pre-existing `'should return metadata for a result'` test uses `toEqual` on a fixture that omits the 4 new fields — passes because Jest treats `undefined` properties as absent, not a defect, just a slightly less strict assertion than it visually reads. No action required.

**Final verification result:** PASS — 2031/2031 tests, lint clean, build clean, coverage 83.38%.
**Decisions made:** none beyond the spec — implementation matched design.md §3-§5 exactly.
**Issues encountered:** none.

---

### T-02 — `isExternalResult` signal + `GetMetadata` interface fields

- **Status:** done (PASS on attempt 1)
- **Date:** 2026-07-27
- **Requirements covered:** R-RC-002, R-RC-011 (client side)
- **Skills used:** `angular-developer` (as listed — no deviation)
- **Effort dial:** medium

**Attempt 1**
- **Files changed:**
  - `client/research-indicators/src/app/shared/services/cache/cache.service.ts` — added `isExternalResult` computed, character-for-character matching design.md §6.1.
  - `client/research-indicators/src/app/shared/services/cache/cache.service.spec.ts` — added truth-table test (STAR, numeric/empty, TIP, PRMS, AICCRA).
  - `client/research-indicators/src/app/shared/interfaces/get-metadata.interface.ts` — added 4 optional fields mirroring T-01's server DTO.
- **Implementer verification:** lint clean; `cache.service.spec` 4 suites/95 tests passed; `tsc --noEmit` showed pre-existing, unrelated errors only (confirmed via git stash before/after comparison).
- **Reviewer verdict:** `PASS`. Independently confirmed `CacheService` has zero constructor/injections before or after — the new signal is provably dependency-free (satisfies R-RC-002 AC.2 by construction, not just by claim). Confirmed the 4 interface fields are collision-free and match the T-01 server DTO field-for-field. Confirmed via grep that `isExternalResult` has no consumers yet (`SubmissionService` correctly left untouched for T-03) and no component/UI/routing appeared in the diff.
- **Advisory (non-blocking):** (1) Implementer's tsc pre-existing-error count was off by one (7 vs reported 6) — immaterial, all in unrelated files. (2) `npm run lint` doesn't actually lint `.spec.ts` files (outside eslint config scope) — the "all files pass" claim is true but doesn't cover the new test file specifically; no issue found in it regardless. (3) Forward note for T-05: client `updated_at` is typed `string` (correct, per design.md §6.6 — server's `Date` serializes to JSON as string), so whoever builds the header should pipe it through the existing date-format pipe rather than assume a `Date` instance.

**Final verification result:** PASS — 95/95 tests, lint clean, no new tsc errors.
**Decisions made:** none beyond the spec.
**Issues encountered:** none.

---

### T-06 — `ResultSidebarComponent`: hide status-changing actions externally

- **Status:** done (PASS on attempt 1)
- **Date:** 2026-07-27
- **Requirements covered:** R-RC-007
- **Skills used:** `angular-developer`
- **Effort dial:** medium

**Attempt 1**
- **Files changed:** `result-sidebar.component.html` (single `!cache.isExternalResult()` added to the shared outer wrapper, corrected per Judgment Day F-5), `result-sidebar.component.ts` (`showOicrStatusDropdown()` guarded), `result-sidebar.component.spec.ts` (8 new tests).
- **Implementer verification:** lint clean; 95/95 tests; only pre-existing unrelated tsc errors.
- **Reviewer verdict:** `PASS`. Independently read the full `:74-122` span to confirm the wrapper genuinely contains Review/Submit-Unsubmit/Approve together and there is no fourth render site (repo-wide grep). Confirmed zero diff on the "sections completed" counter (D-5 honored). Reproduced 95/95 passing.
- **Advisory (non-blocking):** Implementer's test-count/tsc-error breakdown in its report was slightly inaccurate (87+8 not 85+10; 3 pre-existing tsc errors not ~7) — totals match, no action needed.

**Final verification result:** PASS — 95/95 tests, lint clean.

---

### T-13 — Server: submit-status endpoint rejects transitions for external results

- **Status:** done (PASS on attempt 1)
- **Date:** 2026-07-27
- **Requirements covered:** R-RC-012
- **Skills used:** `nestjs-expert`, `error-handling-patterns`
- **Effort dial:** medium

**Attempt 1**
- **Files changed:** `result-status-workflow.service.ts` (new `_assertStarSourceWritable` guard called before the transaction), `result-status-workflow.controller.ts` (Swagger doc), `result-status-workflow.service.spec.ts` (2 new tests).
- **Implementer verification:** lint clean; 89/89 tests across the module; build clean.
- **Reviewer verdict:** `PASS`. Independently confirmed the guard runs 54 lines before `Result.update()` (not just "before" in name), confirmed `platform_code` is genuinely default-selected on the preceding `findOne` (no narrowing `select` — contrasted against a sibling method in the same file that DOES narrow-select, to show the Implementer picked the right method), and confirmed the new error string cannot collide with the locked PRMS bilateral string by reading the client's exact-match consumer (`pool-funding-alignment.component.ts:604`). Coverage on the new guard lines confirmed exercised both branches.
- **Advisory (non-blocking):** literal `'STAR'` could use `ReportingPlatformEnum.STAR` instead (consistent either way, matches existing sibling-gate precedent); pre-existing lack of `@Roles`/`ResultStatusGuard` on this controller noted as out-of-scope, not introduced by this task.

**Final verification result:** PASS — 89/89 tests, lint clean, build clean.

---

### T-03 — `isEditableStatus()` delegates to `isExternalResult`

- **Status:** done (PASS on attempt 2 — HALT avoided, rework worked)
- **Date:** 2026-07-27
- **Requirements covered:** R-RC-002
- **Skills used:** `angular-developer`
- **Effort dial:** medium (attempt 1) → high (attempt 2, per rework-bump rule)

**Attempt 1**
- **Files changed:** `submission.service.ts` (delegation refactor), `submission.service.spec.ts` (new regression test, loop-based).
- **Implementer verification:** lint clean; 56/56 tests passed; tsc showed only known pre-existing errors.
- **Reviewer verdict:** `FAIL`.
  - **Discovered Issue:** the new regression test called `service.isEditableStatus()` 15 times on ONE `SubmissionService` instance across nested nested loops. `isEditableStatus` is an Angular `computed()`; under this test's plain-`jest.fn()` mocks (not real signals), it has zero signal dependencies and caches after its first read. Only iteration 1 (TIP/status_id 4) was a real assertion — the other 14 compared against the same cached value. Proven by mutation: a broken mock treating PRMS/AICCRA as non-external still passed the test unchanged.
  - **Violated Rule:** requirements.md R-RC-002 AC.1 (the test is supposed to be evidence of no-regression across the full TIP/PRMS/AICCRA × 5-status matrix; it provided none beyond one case).
  - **Remediation Suggestion:** give each `[platformCode, statusId]` pair its own fresh service instance — `it.each` (preferred, since `beforeEach` already reconfigures `TestBed` per test) or manual `TestBed.resetTestingModule()` per iteration.
  - Reviewer explicitly noted: **no change needed to `submission.service.ts`** — the production refactor itself was already correct.
- **Leader action:** logged FAIL, bumped effort medium → high, spawned Implementer again with the Reviewer's full unedited feedback (Structured Feedback rule) plus a root-cause explanation of Angular `computed()` caching under non-signal mocks.

**Attempt 2**
- **Files changed:** `submission.service.spec.ts` only (rewrote the new test as `it.each` over the 15 pairs; each case now gets `beforeEach`'s fresh `TestBed.inject(SubmissionService)`; added `expect(cacheMock.isExternalResult).toHaveBeenCalled()` per case). `submission.service.ts` untouched, per Reviewer's attempt-1 note.
- **Implementer verification:** lint clean; baseline 70/70 passed; **self-administered mutation test** — mocked `isExternalResult` to treat only `'TIP'` as external, reran, got exactly 10/15 targeted failures (all PRMS/AICCRA cases), reverted, reran to confirm 70/70 green again. Reported both runs as evidence (not just a green pass), per the Leader's explicit ask.
- **Reviewer verdict:** `PASS`. Independently reproduced the exact same mutation test (10/15 failures, TIP passing / PRMS+AICCRA failing) — confirmed this specific failure pattern is only achievable with genuine per-case computed re-evaluation, not inferred from the Implementer's claim. Additionally ran a **second, self-devised mutation** (reverting the production delegation back to the old, behavior-equivalent inline check) and confirmed all 15 cases now fail on the NEW `toHaveBeenCalled()` assertion specifically — proving the test locks the *delegation itself*, not just the boolean outcome. Verified the TestBed-freshness assumption from `setup-jest.ts`/`beforeEach` wiring directly rather than trusting the code comment.
- **Advisory (non-blocking):** `cacheMock.getCurrentPlatformCode` has no `beforeEach` default, so an un-stubbed case would read `isExternalResult` as `true` from `undefined` — a latent trip-wire for future tests, not a defect here (no such case exists). A dead string-token DI registration (`'CacheService'`) predates this diff, out of scope.

**Final verification result:** PASS on attempt 2 — 70/70 tests, lint clean, mutation-tested by both the Implementer and independently by the Reviewer (two separate mutations).
**Decisions made:** none beyond the spec; the rework stayed scoped exactly to the Reviewer's remediation suggestion.
**Issues encountered:** Angular `computed()` caching under mocked (non-signal) test doubles — a subtle, generally-applicable gotcha worth remembering for any future test that asserts a `computed()` across changing mock state within one `it()`.

---

(further entries appended below, one per task, in execution order)
