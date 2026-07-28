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

## HALT: T-04 — Results Center entry points navigate instead of opening the modal

- **Date:** 2026-07-28
- **Status:** BLOCKED after 3 rework attempts — working tree rolled back, no code merged for this task.
- **Requirements covered:** R-RC-001
- **Effort dial progression:** medium (attempt 1) → high (attempt 2) → xhigh (attempt 3)

### Note on a mid-run interruption
Before attempt 1, a first launch of this task (alongside 4 other tasks in a parallel batch) failed outright with an API/session error before any file was touched — no code was written, so it is not counted as a rework attempt. Attempt numbering below starts from the first Implementer spawn that actually produced a diff.

### Attempt 1 — FAIL

**Implementer summary:** Removed the modal-opening branch from all 6 methods (`openResult`, `openResultByYear`, `getResultHref`, `getResultRouteArray`, `onResultLinkClick`, `handleRowClickResult`), so all fall through to the same navigation logic STAR results already use. Also removed the now-dead `applyResultInformationModalContext()` helper and widened a `routerLink`-skip condition in `handleRowClickResult` to cover all platforms (reasoning: external results now render real `routerLink`s too, so the old exclusion would otherwise double-navigate). Collapsed `onResultLinkClick` to delegate to `openResult()`.
**Verification:** lint clean; 102/102 tests; tsc showed only known pre-existing unrelated errors.

**Reviewer verdict: FAIL.**
```
STATUS: FAIL
ISSUES:
1.  Discovered Issue: The openResultByYear() un-gating is dead for mouse clicks on external rows.
    The document capture-phase listener registered in ngAfterViewInit (results-center-table.component.ts:341-348)
    routes every in-table click through processRowClick → handleRowClickResult, which for PRMS/TIP/AICCRA calls
    event.stopPropagation() and this.openResult(result) at :442-450 before the year-badge span's own
    (click)="openResultByYear(...)" (results-center-table.component.html:204-208, :221-225) can fire. Clicking a
    year badge on an external multi-snapshot row therefore navigates to /result/:code (or the latest-year variant)
    instead of the clicked version — the { version: year } query param is silently dropped. Keyboard Enter on the
    same badge works, mouse click does not. Not caught by tests because the suite calls openResultByYear() directly
    and never exercises the capture-handler path with a year-badge target.
    Violated Rule: tasks.md#T-04 implementation note + requirements.md#R-RC-001 AC.1 + design.md §6.2 / Judgment F-6.
    Remediation Suggestion: Add a data-version-link attribute to the two year-badge spans and short-circuit in
    processRowClick alongside the existing data-public-link-action guard; add a spec case proving it.

NON-BLOCKING (evaluated and cleared): the "extra" changes (applyResultInformationModalContext removal, routerLink-skip
widening, onResultLinkClick delegation) were all independently verified as justified and risk-free — confirmed
zero-caller dead code, confirmed real routerLink bindings exist in the template backing the widening's premise,
confirmed onResultLinkClick has zero production callers. Lint clean, 102/102 tests confirmed independently.
```
**Leader action:** logged FAIL, bumped effort medium → high, passed the Reviewer's feedback unedited to a fresh Implementer.

### Attempt 2 — FAIL

**Implementer summary:** Added `data-version-link` to both year-badge spans (row-level + popover) and a matching `target.closest('[data-version-link]')` short-circuit in `processRowClick`, placed right after the existing `data-public-link-action` guard. Added a spec test.
**Verification:** lint clean; 103/103 tests (102 + 1 new); tsc unchanged baseline.

**Reviewer verdict: FAIL.** (Confirmed capture-vs-bubble reasoning correct, confirmed placement correct, confirmed the new test genuinely mutation-sensitive — but found a second instance of the identical bug shape:)
```
STATUS: FAIL
ISSUES:
1.  Discovered Issue: The "+N more" popover-toggle anchor (results-center-table.component.html:211-214) is not
    excluded from the document capture-phase handler. On TIP/PRMS/AICCRA rows, processRowClick falls through to
    handleRowClickResult (:446-454), which calls event.stopPropagation() and navigates, so popover.toggle() never
    fires. Because only 3 of 5+ versions render inline, every remaining year — including the one just tagged with
    data-version-link — is unreachable, leaving the popover half of this fix dead code on the rows the spec targets.
    Violated Rule: tasks.md T-04 AC + requirements.md:84 (the "year-link silently dead-clicks" failure mode).
    Remediation Suggestion: Add data-version-link (or a dedicated attribute) to the "+N more" anchor + a spec case.
```
**Leader action:** logged FAIL, bumped effort high → xhigh (final tier before tier escalation would be needed), passed feedback unedited, additionally asked the Implementer to self-audit the ENTIRE template for any other instance of the same bug shape before reporting completion (to avoid a 4th discovery cycle).

### Attempt 3 — FAIL (ceiling reached)

**Implementer summary:** Added `data-version-link` to the "+N more" toggle anchor. Self-audited the full template; found and *correctly* left one look-alike case untouched with sound reasoning (a TIP `external_link` status-tag anchor with no `href` — inert, no distinct action to protect, falling through to row navigation is harmless) — the Reviewer independently confirmed this judgment call was right (though refined the *why*: the anchor's own `stopPropagation()` was already dead code regardless, since the capture-phase listener upstream had already stopped the event).
**Verification:** lint clean; 104/104 tests (103 + 1 new); tsc unchanged baseline.

**Reviewer verdict: FAIL.** (Confirmed the toggle-anchor fix itself works, confirmed attempts 1-2 remained intact, confirmed the TIP-anchor judgment call was sound — but found a THIRD instance, one DOM level up:)
```
STATUS: FAIL
ISSUES:
1.  Discovered Issue: The data-version-link escape hatch was added to the popover's interactive leaves (badges,
    toggle anchor) but not to the popover PANEL itself. [appendTo]="'self'" does not relocate the panel out of the
    <tr> (PrimeNG 19.0.6's appendChild('self', …) is effectively a no-op for this target), so the panel — its
    "Approved Versions" heading, its grid-gap padding, the p-popover-content padding — still sits inside the
    external row's DOM subtree. With the popover now openable for the first time (attempt 3's own fix), clicking
    anywhere in that panel other than a tagged leaf is caught by the SAME capture-phase listener and navigates the
    user out of Results Center. Aggravated by appendContainer('self') throwing, which also means the popover has no
    outside-click dismiss wired — a user clicking to dismiss is more likely to land on the trap.
    Violated Rule: requirements.md#R-RC-001 (year-link interactions on an external row must behave, not hijack).
    Remediation Suggestion: Move data-version-link from the three leaf elements up to the versions-cell WRAPPER div
    (html:201-202), which already declares "clicks here don't belong to the row" via its own stopPropagation. One
    attribute at the wrapper level covers badges, toggle, panel, heading, and grid gaps in a single place, and makes
    external rows behave like STAR rows in that cell (which already no-op, since handleRowClickResult returns early
    for STAR). Add a test asserting processRowClick returns early for a popover-panel (non-badge) target.

Non-blocking observation carried forward: the public_link <td> has the same bubble-only stopPropagation pattern
protecting inert placeholder spans — by the same "inert, no overlay, no swallowed action" principle applied to the
TIP anchor, this is harmless and out of scope, flagged only so it isn't rediscovered as a surprise.
```

### Rollback performed

`git restore` applied to the 3 files this task touched (`results-center-table.component.ts`, `.html`, `.spec.ts`) — confirmed via `git status` that no other in-flight task's files were dirty at the time, so a scoped restore (rather than a repo-wide `git restore .` / `git clean -fd`) was sufficient and safer. Working tree is clean of T-04 changes; only this spec's own doc bookkeeping remains modified.

### Leader's hypothesis on root cause

Not spec ambiguity, not an environmental issue, not a missing-context problem — this is a **genuinely cascading UI defect** that the original modal-based design accidentally papered over. The pre-existing code intercepted every click on an external row at the document capture phase and always stopped propagation, so it never mattered that other elements inside the row (year badges, the popover toggle, the popover panel) had no distinct escape hatch — nothing under a stopped capture event ever needed one, because the "correct" behavior for all of them was simply "open the info modal." Making external rows behave like STAR rows (real navigation, real interactive sub-elements) exposes every element in that row that was silently relying on "capture stops everything" as now needing its own explicit exemption — and the versions cell has THREE nested layers of such elements (badges → toggle → panel), each one only became visible once the layer below it was fixed. Each rework attempt correctly fixed what the Reviewer found, but the Reviewer necessarily audits reactively (bug findable only once its layer is reachable) rather than proactively — attempt 3's Implementer even tried a full-template self-audit specifically to break this cycle, and still couldn't have found the panel-level issue without first fixing the toggle, since the panel wasn't renderable/inspectable-in-context until the toggle worked.

**The fix the last review identified is very likely complete and correct** (move the attribute to the wrapper `<div>` at the cell level instead of tagging individual leaves) — it's a structurally different, broader-scoped exemption than the first two attempts, which is exactly why it wasn't tried first. This is not a case of the Implementer being sloppy; it's a case of the bug's shape only becoming discoverable in layers.

---

## T-04 — Retry after HALT (fresh attempt, briefed directly with root cause + exact fix)

- **Status:** done (PASS on retry, following the 3-attempt HALT above)
- **Date:** 2026-07-28
- **Requirements covered:** R-RC-001
- **Skills used:** `angular-developer`
- **Effort dial:** high (retry started high given known difficulty, not medium)

**Retry attempt**
- **Files changed:** `results-center-table.component.ts` (all 6 handlers de-modalized, `applyResultInformationModalContext` removed), `results-center-table.component.html` (single `data-version-link` attribute added to the versions-cell **wrapper** `<div>`, not the individual leaf elements — the structural difference from attempts 1-3), `results-center-table.component.spec.ts` (99 tests, including 4 new cases: year badge, "+N more" toggle, popover heading, popover grid container).
- **Implementer verification:** lint clean; 99/99 tests; tsc showed only known pre-existing errors. Implementer also ran the mandatory full-template audit requested in the brief and reported nothing else needing the same fix (confirmed independently by the Reviewer, see below).
- **Reviewer verdict:** `PASS`, with unusually deep independent verification:
  - Did not trust the "`appendTo='self'` doesn't relocate the popover" claim — read PrimeNG 19.0.6's actual `appendContainer()` and `@primeuix/utils`' `toElement()` source in `node_modules` to *prove* the popover panel renders as a DOM descendant of the tagged wrapper div, not trust it as an assertion.
  - Ran **two independent mutations**: (1) deleting the new guard entirely, (2) narrowing `target.closest('[data-version-link]')` to `target.matches('[data-version-link]')` (i.e., removing the ancestor-walk, leaf-only match) — both correctly failed the 4 new test cases, proving the tests are genuinely sensitive to the exact defect shape that broke attempts 2 and 3, not just superficially green.
  - Independently re-swept the entire template for any other instance of the same "distinct interactive action silently swallowed by the capture-phase handler" bug shape — found none beyond what's already fixed.
  - Spot-checked 4 of the Implementer's 5 audit claims against actual source; found one **minor, non-blocking inaccuracy**: the `public_link` column's inert placeholder `<span>` elements (not the buttons, which do carry `data-public-link-action`) are technically still exposed to the capture-phase handler — but since they have no click handler of their own, there's no distinct action being swallowed (the same "inert, harmless" category as the TIP `external_link` anchor already cleared in the HALT). Not the recurring bug shape; not a defect.
  - Noted (advisory, pre-existing, out of scope): because `appendTo='self'` effectively no-ops, the popover also never gets its outside-click-dismiss binding wired — pre-existing PrimeNG-usage quirk, unrelated to this fix, newly *visible* on external rows for the first time rather than newly *caused*.

**⚠️ Process incident during this review (disclosed for the audit trail, not swept under the rug):**
During its independent tsc-baseline comparison, the Reviewer (which is instructed to be strictly read-only) ran a scoped `git stash push` that failed on a path-prefix error; the subsequent `git stash pop` it ran to recover consequently popped a **different, unrelated, pre-existing stash** (`stash@{0}: On dev: test-dashboard-ia`, containing a `docs/specs/dashboard/` directory belonging to unrelated in-progress work on another branch). The Reviewer noticed, recovered the dropped commit via `git fsck --unreachable`, re-stored it under its original stash message via `git stash store`, byte-verified the restored files against the stash blobs, and then deleted the working-tree copy it had accidentally restored (`rm -rf docs/specs/dashboard/`) to return the repo to its pre-incident state.
**Leader's independent verification (not just trusting the Reviewer's self-report):** confirmed via `git stash list` that `stash@{0}: On dev: test-dashboard-ia` is present with its original message intact; confirmed `docs/specs/dashboard/` does not exist in the working tree; confirmed `git status --short` shows only this task's own 4 intended files, no stray leftovers. The repository appears to have been correctly returned to its pre-incident state — no data loss found. This was surfaced to the user directly (not silently resolved) given a read-only-mandated agent took an unauthorized destructive filesystem action (`rm -rf`) on data outside its task scope, even though the outcome was ultimately self-corrected. Flagged here as a process lesson: read-only Reviewer personas that retain Bash access can still take destructive actions outside their mandate; this is worth a kaizen note at `/akili-archive` time.

**Final verification result:** PASS — 99/99 tests, lint clean, 2 independent mutation tests confirming defect-sensitivity, PrimeNG source read to verify DOM structure rather than assumed.
**Decisions made:** wrapper-level attribute placement (not leaf-level) — this was identified during the HALT's final review and applied directly on retry rather than re-derived from scratch.
**Issues encountered:** the underlying bug (three layers deep in the versions-cell); separately, the Reviewer's out-of-mandate git operations (see above).

---

## T-05, T-07, T-08, T-09 — batch (⚠️ PROTOCOL DEVIATION: Leader-verified, not Reviewer-verified)

- **Status:** all four done
- **Date:** 2026-07-28
- **Requirements covered:** R-RC-008/009/010 (T-05), R-RC-003/004 (T-07), R-RC-005 (T-08), R-RC-006 (T-09)
- **Effort dial:** medium each

### ⚠️ Deviation from the Implementer → Reviewer gate — read this before trusting these four

These four tasks were implemented by four separate Implementer subagents (all reporting green), and four Reviewer subagents were spawned to audit them. **All four Reviewers were killed mid-run by an API session limit before producing any verdict** — none reached a `PASS`/`FAIL`. Rather than mark the tasks done on the Implementers' own word (which is exactly what the author ≠ auditor rule exists to prevent), the **Leader performed the verification directly**, executing every specific check the Reviewer briefs had been given.

**Why this is still independent, but weaker than the protocol intends:** the Leader did not author any of this code — four separate Implementer subagents did — so this is *not* self-verification, and the author ≠ auditor property technically holds. What is *missing* is the Reviewer persona's adversarial framing and its habit of mutation-testing the tests themselves (which, earlier in this same run, is precisely what caught T-03's vacuous test and T-04's three-layer bug). Treat these four as **verified-but-not-adversarially-reviewed**. Recommended: re-run `/akili-execute`'s Reviewer step (or a `judgment-day` pass) over this batch's diff when session capacity allows, before this ships.

### Leader verification actually performed (all evidence gathered first-hand, not taken from Implementer reports)

**Tests, re-run independently by the Leader:**
- Client: 7 suites / **232 tests passed** (`form-header`, `bilateral.service`, `capacity-sharing`, `partners`, `organization-item`, `oicr-details`, `authors-contact-persons-table`).
- Server: 11 suites / **133 tests passed**, explicitly including `bilateral.service.sourceReadOnlyGate.spec.ts` — the PRMS regression suite — which `git diff` confirms is **byte-for-byte unmodified**.
- Lint: `eslint` exit 0 on all touched client dirs AND on `server/.../bilateral/**`.

**T-05 — claim-by-claim:**
- ✅ `FormatDatePipe` + `DateFormatConfigService` is a genuine pre-existing pattern, not invented: `my-latest-results.component.html:71` uses the identical `formatDate:dateFormatConfig.config()` form, and `MyLatestResultsComponent` imports the pipe (`:18`).
- ✅ "No `Invalid Date`" holds **structurally, twice over**: the `@if (syncedDate())` template guard never formats an absent value, AND `formatUtcWithConfig()` (`date-format.util.ts:59-61`) returns `null` for unparseable input, which the pipe maps to `''`. Also safe when `config` is `null` (falls back to UTC display, `:62`).
- ✅ Accessibility: native `<button type="button">` with visible text labels — keyboard-operable, accessible names present, no `<div>` click handlers.
- ✅ No hex literals: only token classes (`fs-[12]`, `atc-grey-600`, `fs-[13]`, `atc-light-blue-400`).
- **Advisory (non-blocking):** passing `dateFormatConfig.config()` explicitly into the pipe is redundant — `FormatDatePipe.transform()` already falls back to the same injected service (`config ?? this.dateFormatConfig.config()`), so the component's own `DateFormatConfigService` injection could be dropped. Harmless duplication that also matches the existing `my-latest-results` call style, so left as-is.

**T-07 — claim-by-claim:**
- ✅ `oicr-details.component.ts` already injects both `cache` (`:122`) and `submission` (`:125`) — the new template bindings resolve.
- ✅ The child's guards are **real, not merely visual**: both the Add `p-button` and the row delete `<button>` carry `[disabled]="disabled"` *and* an emit-guard (`(click)="!disabled && …emit()"`, `(keydown.enter)="!disabled && …emit()"`), so neither a programmatic click nor an Enter keypress can bypass them.
- ✅ `onDeleteContactPerson()`'s new `isExternalResult()` early-return is placed **before** the `DELETE_AutorContact` call.
- ✅ Gap B reasoning sound: using `cache.isExternalResult()` (not the fuller `!isEditableStatus()`) means an admin on a *STAR* result in a non-editable status can still edit MEL Regional Expert / SharePoint — **which is exactly the pre-existing behavior**, so this is additive platform-gating with no regression, as the task permitted.

**T-08 — claim-by-claim:**
- ✅ `ReportingPlatformEnum` genuinely has `TIP = 'TIP'` and `AICCRA = 'AICCRA'` (read the enum file, not assumed).
- ✅ The new gate is a **separate** method called *alongside* (not replacing) `assertPrmsSourceWritable()`; PRMS control flow is unchanged.
- ✅ **No string collision**: the client matches the locked PRMS description by strict equality (`pool-funding-alignment.component.ts:604`, `result.description === this.PRMS_SOURCED_409_DESCRIPTION`); the new message (`'Result is sourced from an external reporting platform (TIP/AICCRA), not STAR; bilateral alignment is read-only'`) cannot satisfy that comparison, and the locked string at `:110` is untouched.
- ✅ Client `editable` short-circuits on `isExternalResult()` **before** reading `currentAlignment()`, so it returns `false` correctly even when alignment is null/unloaded for an external result.

**T-09 — claim-by-claim:**
- ✅ `capacity-sharing.component.ts` (`:45`) and `partners.component.ts` (`:25`) already injected `CacheService` — the brief's assumption was correct, `this.cache` resolves.
- ✅ `organization-item.component.ts` correctly received the new `CacheService` injection it lacked.
- ✅ Both `capacity-sharing.component.html` call sites (`:51-52` and `:143-144`) invoke the **identical** `setSectionAndOpenModal('Capacity Sharing')` method — so the single method-level guard genuinely covers both, and per-call-site duplication would have been redundant. The task's "verify BOTH call sites" ask is satisfied by construction.

**Issues encountered:** the four Reviewer spawns dying to a session limit (see deviation note above); no code defects found by the Leader's verification.

---

## T-10 — Confirm `search-a-result` / `my-latest-results` need no routing fix

- **Status:** done (verification complete — but it surfaced a scope gap, see below)
- **Date:** 2026-07-28
- **Requirements covered:** R-RC-001 (verification)
- **Verified by:** Leader directly (2-file read-only check, below the delegation threshold — no Implementer/Reviewer spawn warranted)

**Findings — both files confirmed exactly as the spec described:**
- `search-a-result.component.ts:42-45` — `openResult()` navigates unconditionally to `/result/{platform_code}-{code}/general-information` for every platform. Grep confirms **zero** references to `resultInformation` / `selectedResultForInfo` / `allModals` anywhere in the file. No routing fix needed; it inherits read-only enforcement from the destination-side fixes. ✅
- `my-latest-results.component.ts` — still gated as described: `opensResultInformationModal()` (`:130-132`) returns `true` for PRMS/TIP/AICCRA; the template nulls `routerLink`/`queryParams` for those (`:18-20`); `onResultCardClick()` (`:158-161`) calls `preventDefault()` and opens the modal. ✅ (factually confirmed)

---

## Scope Gap: T-10 — `my-latest-results` still opens the old modal (product decision needed)

**Not a defect in any implemented task. A gap in this spec's own scoping decision (D-3), surfaced by T-10's verification.**

**What's inconsistent now that T-04 has shipped:**

| Entry point | External-result behavior after this spec |
| --- | --- |
| Results Center (T-04) | ✅ navigates to the full read-only section shell |
| `search-a-result` (T-10) | ✅ navigates to the full read-only section shell |
| **Home → "My Latest Results" cards** | ❌ **still opens the old minimal `resultInformation` modal** |

**Why the spec missed it:** Judgment Day F-3 and design decision D-3 evaluated `my-latest-results` by asking *"does it have the same bug as Results Center (dead-click / swallowed action)?"* — and the answer was legitimately **no**, it is cleanly gated. That conclusion is factually correct but answers the wrong question. Nobody asked *"should it also route to the shell now?"*, because the review was framed around finding bugs in the existing modal-branching rather than around completeness of the new routing behavior. So `my-latest-results` was fenced out of scope on a technically-true but irrelevant basis.

**Why it matters:** the originating Jira acceptance criterion is unambiguous — *"When entering a result from an external system, the full metadata must be shown in the same STAR forms."* The home page is an "entering" path. A user opening a TIP result from Home gets ~9 fields in a modal; the same result opened from Results Center gets all 12 read-only tabs. That is a visible inconsistency in the exact behavior this spec exists to deliver.

**Scope note:** requirements.md §4 does explicitly fence `my-latest-results` out, and R-RC-001 is worded "…from Results Center", so shipping as-is is *defensible against the letter of the spec* — but not against its intent or the Jira AC.

**Options for the product owner:**
1. **Extend scope now (recommended, small):** mirror T-04's fix in `my-latest-results` — delete `opensResultInformationModal()`'s special-casing so external results use the existing `getStarResultRouterLink()`/`getStarResultQueryParams()` paths that STAR results already use (both already handle the snapshot/latest-year case). Est. ~1 focused task, same shape as T-04 but far simpler (no capture-phase listener involved — this component uses ordinary `routerLink` + a click handler).
2. **File as an immediate follow-up spec** — keeps this spec's scope frozen as approved, at the cost of shipping a known inconsistency.
3. **Accept deliberately** — if Home cards are intended to stay a lightweight preview surface. If chosen, this should be recorded as an explicit decision in `design.md`'s log, not left implicit.

**Recommendation:** option 1. The fix is small, it removes the last inconsistent entry point, and leaving it would mean the spec's headline requirement is only true depending on which screen the user came from. **No code was changed for this — awaiting the decision.**

---

## T-14 — Home "My Latest Results": route external results into the section shell

- **Status:** done (PASS on rework attempt 2)
- **Date:** 2026-07-28
- **Requirements covered:** R-RC-013 (scope extension — see `## Scope Gap: T-10` above and design.md D-9)
- **Skills used:** `angular-developer`
- **Effort dial:** medium (attempt 1) → high (attempt 2)

**Attempt 1 — FAIL**
- **Files changed:** `my-latest-results.component.{ts,html,spec.ts}` — removed the `opensResultInformationModal()` special-casing so external cards use the existing `getStarResultRouterLink()`/`getStarResultQueryParams()` paths; removed the resulting dead code (`opensResultInformationModal()`, `openResultInformationModal()`, the now-unused `PLATFORM_CODES` import) with grep evidence; kept `closeResultInformationModalIfOpen()` (still called).
- **Verification:** lint clean; 55/55 tests; tsc baseline unchanged.
- **Reviewer verdict:** `FAIL` — **core change correct (AC.1/AC.2/AC.3 confirmed)**, but two AC.4 defects:
  1. **The `.more-vert` guard became inert for external cards.** Angular's `RouterLink` host binding is `onClick($event.button,$event.ctrlKey,$event.shiftKey,$event.altKey,$event.metaKey)` — it never receives the event object, so it cannot consult `defaultPrevented` and calls `navigateByUrl()` unconditionally. `preventDefault()` alone therefore cannot stop it. Attempt 1 made `routerLink` unconditional, removing the accidental protection external cards had from `routerLink = null`.
  2. **Both AC.4 tests were vacuous** — they asserted on `routerMock.navigate`, but the component never injects `Router`, `RouterLink` navigates via `navigateByUrl` (absent from the mock), and no test in the file rendered the template (zero `detectChanges`). They stayed green while the behavior was broken.
- **Leader action:** independently confirmed all three load-bearing facts before relaying (the host-binding declaration in the shipped `router.mjs`, that `.more-vert` has no handler of its own, and that `routerMock` defines only `navigate`). Bumped effort medium → high; passed the Reviewer's report unedited plus an explicit demand for mutation-test evidence, since the whole defect class was "green tests over broken behavior."

**Attempt 2 — PASS**
- **Files changed:** `my-latest-results.component.html` (added `(click)="$event.stopPropagation(); $event.preventDefault()"` to the `.more-vert` div) and `my-latest-results.component.spec.ts` (new DOM-level `describe` using a **real** `Router` via `provideRouter` + `RouterTestingHarness`). `.component.ts` untouched — attempt 1's work there stood.
- **Implementer decisions:** no `(keydown.enter)` added (the div has no `tabindex`, isn't focusable, so it would be dead code — Enter on the focused card `<a>` should and does still navigate); **did not patch the shared `routerMock`** — used a real Router instead, both to avoid a mock silently diverging from real behavior again and to avoid blast radius on the ~10 other specs importing it.
- **Mutation-test evidence (demanded, and independently reproduced by the Leader):** with the `stopPropagation` handler stripped, exactly **1 test failed** — the new `.more-vert` negative one (`Expected: "/" Received: "/result/TIP-202?from=home"`, i.e. it really did navigate) — and 57/57 on restore. The Leader ran this via a backup copy outside the repo, deliberately avoiding `git stash`/`git restore` given an earlier incident this session.
- **Reviewer verdict:** `PASS`, with unusually thorough independent verification: traced the DOM propagation path to confirm a bubble-phase `stopPropagation()` on the div runs strictly before the anchor's host listeners; confirmed `preventDefault()` is *not* redundant (post-attempt-1 the anchor always carries a real `href`, so without it a browser would still do a full document navigation); ruled out every defeat vector — no `pointer-events` in the component SCSS, the client's only capture-phase document click listener is Results Center's (different route, `contains()`-guarded, torn down), and no hydration `withEventReplay`; confirmed `RouterLink` is genuinely in the component's `imports` so a live directive is exercised; and closed an async-race spuriousness vector (`ngOnInit`'s un-awaited load could have repopulated the list after `renderCardFor()`, but `whenStable()` drains it first, and the positive test's exact URL proves a single TIP-202 card rendered). Confirmed 57/57 in-file and 85/85 across `pages/home`, lint clean.

### Two clarifications for future readers (requested by the Reviewer)

1. **The one intentional STAR behavior change:** ⋮ clicks no longer navigate on STAR cards either. AC.4's wording ("*still* does not navigate") was written on a false premise — STAR was **already** broken this way before this spec, because STAR always carried a live `routerLink` and `preventDefault()` never stopped `RouterLink`. So this is a **pre-existing bug fixed in passing**, satisfying AC.4 for both platform classes; it is not an unflagged AC.3 deviation. Net effect: external cards regressed under attempt 1 and were repaired; STAR was repaired for the first time.
2. **`isInteractionOnMoreMenu()` is now unreachable via the real DOM** — the div-level `stopPropagation()` fires first, so `onResultCardClick()` never sees a ⋮ click. It was retained deliberately (T-14's brief said the guard MUST be preserved) and is still directly unit-tested. Belt-and-braces, no longer the primary mechanism.

### Non-blocking follow-ups recorded (out of R-RC-013 scope)

- **Test-harness hardening:** `src/setup-jest.ts` registers a root `beforeEach` adding `provideNoopAnimations()` + `provideHttpClientTesting()`; the new nested `describe`'s `TestBed.resetTestingModule()` silently discards both for its 2 tests. Harmless today (all deps mocked) but a future dependency injecting `HttpClient` would fail *only in this suite* with a confusing "no provider" error. Fix: add those providers to the nested array, or move the DOM suite to a top-level `describe`/own spec file.
- **Pre-existing ⋮ affordance gaps (NOT introduced here):** the icon has never been focusable and still has no menu behind it (a visual affordance with no action, all platforms, before and after); and `.more-vert__icon` lacks `aria-hidden="true"` unlike its sibling at `html:10`, so screen readers announce the literal ligature text "more_vert". Worth a separate a11y ticket.

**Final verification result:** PASS — 57/57 in-file, 85/85 across `pages/home`, lint clean, mutation-tested by both the Implementer and independently by the Leader.

---

## T-11 Result: FAILED — 5 ungated controls found; the spec's scope list missed three files

- **Date:** 2026-07-28
- **Status:** T-11 **blocked** — its primary AC is not met. No code was changed in response yet; awaiting a scope decision.
- **Method:** exhaustive static sweep of all 12 tab components + every nested child + the shared result shell, delegated to a read-only audit agent (74 tool calls). Chosen over a manual click-through for this AC specifically because "zero editable controls anywhere" is an exhaustiveness claim — a human walk can miss a control, a systematic sweep of every `(click)`/`<input>`/`PATCH_`/`POST_`/`DELETE_` cannot.

### Why the spec missed these

The requirements/design/task docs enumerated the 12 tabs and `result-sidebar`/`form-header`, but **never listed `section-header`, `submission-history-item`, or the shared `oicr-form-fields`**. The first two live in the shared shell *above* `form-header` (rendered from `platform.component.html:10`, enabled on the result route via `showSectionHeaderActions: true`, `app.routes.ts:84`); the third is a shared custom-field component embedded in the OICR tab. Five Implementer/Reviewer pairs all worked correctly within the scope they were given — the scope itself was incomplete. Same failure mode as the T-10 scope gap: the question asked was narrower than the requirement.

### Findings

| # | Severity | What | Where | Why ungated |
| --- | --- | --- | --- | --- |
| **F-1** | 🔴 **CRITICAL** — direct `DELETE` | **"Delete Result"** kebab-menu action, available to any admin on an external result → confirm modal → `api.DELETE_Result()`. Irreversible destruction of a federated record from STAR. | `section-header.component.ts:57-60` (gate), `:91` (call); rendered `platform.component.html:10` | `showDeleteOption` = `statusId===5 \|\| 7 \|\| (4 && isMyResult()) \|\| rolesService.isAdmin()` — **no platform term at all**. The `!isAdmin`-only anti-pattern R-RC-004 was written to kill, in a file the spec never named. |
| **F-2** | 🟠 HIGH — direct `PATCH` | Submission-history "edit status-change date" pencil → `api.PATCH_StatusChangeDate()`. `confirmEdit()` has no guard either (only null-checks). | `submission-history-item.component.ts:51-53`, `:137-163` | Role + per-row flags only. Panel reachable for external results — `submission-history-content.component.ts:39-42` fetches history with no platform filter. |
| **F-3** | 🟠 MED-HIGH | `app-oicr-form-fields` fields typable on the OICR tab (Tagging, Maturity of change, Elaboration, Short Outcome/Impact) **plus an AI-generate button that fires a real POST** (`api.fastResponse`). | `oicr-form-fields.component.html:26-30, 122-140, 146-151, 164-168`; call site `oicr-details.component.html:43-52` passes only `[isOicrNoDisabled]` | Gated on modal state (`editingOicr()`, always `false` here) and role, not on result editability. Persistence *is* blocked by `saveData`'s guard — but fields are editable and the AI button hits the network. |
| **F-4** | 🟡 MEDIUM | Quantification / Extrapolated-Estimates card inputs (Number, Unit, Comments) have **no `[disabled]` binding at all**; every keystroke writes into the parent's signals. | `quantification-item.component.html:15-16, 20-21, 27-28` | The component has no `disabled` input to pass. Also affects STAR in non-editable statuses (pre-existing). |
| **F-5** | 🟡 MEDIUM | Innovation-readiness step buttons 1–9 have no `[disabled]`, while every other control on that tab has one. Writes `innovation_readiness_id` and drives panel rendering. | `innovation-details.component.html:131-136` | Simple omission. `saveData()` is guarded, so no direct API hit. |

### Also recorded (non-blocking, from the same sweep)

- **Missing second line of defence:** `result-sidebar.component.ts`'s `submmitConfirm()`, `approveResult()` (calls `PATCH_SubmitResult` with no guard) and `onStatusChange()` have no method-level platform checks. Currently unreachable — the whole block sits inside `!cache.isExternalResult()` — but unlike `onDeleteContactPerson()` there's no backstop if that template condition ever regresses. Same for `oicr-details.onAddContactPerson()`.
- **Cosmetic:** R-RC-006's three "Request to add" links keep `cursor-pointer underline` and are method-guarded only — functionally safe dead clicks, but the requirement's title says "hidden or disabled".
- **Pre-existing, unrelated:** `version-selector`'s "Edit in AICCRA" maps only PRMS/TIP in `editInPlatform()`, so AICCRA yields a dead click.
- **Confirmed correct:** the R-RC-004 fix (MEL Expert / SharePoint) is verified in place, as are all of T-06/T-07/T-08/T-09's gates and all 12 tabs' `saveData()` guards.

### Leader's independent verification of F-1 (the critical one)

Did not take the audit on trust. Confirmed directly: the gate at `:57-60` ends in `|| this.rolesService.isAdmin()` with no platform term; `api.DELETE_Result(...)` is really called at `:91`; `<app-section-header>` really renders at `platform.component.html:10`; and the result route really sets `showSectionHeaderActions: true` at `app.routes.ts:84`. **F-1 is real, not theoretical.** It directly violates `docs/trd/trd.md:425` ("Federation with STAR / TIP / PRMS / AICCRA is read/link-only from the client") — the exact principle this spec exists to uphold.

### The three ACs that static analysis cannot settle

AC.2 (header render/degrade), AC.3 (year-badge navigation in the real DOM), AC.4 (STAR visual baseline) need a running stack. Two blockers documented:
1. **`docs/infrastructure.md` has no `## Local Environment` contract** — the section `/akili-execute` expects to consult for environment-dependent verification. Recommend closing this gap via `/akili-constitution` Step 6B.
2. **The test environment cannot verify this work.** `allianceindicatorstest.ciat.cgiar.org` serves the *deployed* code, not this branch — pointing a browser there would verify the OLD behavior. `environment.dev.ts` targets `http://localhost:3001/api/` (needs the NestJS server + MySQL + synced external data), and the Cognito `redirect_uri` is hardcoded to the test env, so login from `localhost:4200` doesn't close the loop. Genuine manual verification needs either a full local stack or a deployment of this branch.

**Note on T-04's precedent:** AC.3 is unit-tested, but T-04's three-attempt history is a direct warning that unit tests passed while the real DOM behavior was broken (capture-phase interception), and T-14 repeated it (vacuous `routerMock` tests). Treat "unit tests pass" as insufficient evidence for the interactive ACs specifically.

---

## T-15 — Close the 5 ungated controls T-11 found

- **Status:** done (PASS on attempt 3 — the 3-attempt ceiling was reached exactly)
- **Date:** 2026-07-28
- **Requirements covered:** R-RC-014
- **Effort dial:** medium → high → high

**Attempt 1 — FAIL.** Closed F-1…F-5 and the 4 defense-in-depth guards; the Reviewer verified all of those as correct (F-1 structurally, not just via tests) and confirmed the create-result-modal blast radius was clean. **Finding:** `oicr-form-fields` has six reachable controls; the new `disabled` input was bound to four. "Select existing OICR" (`html:39`) still gated only on `editingOicr()`, which is always `false` on that tab. It fires `GET_OICRMetadata()` and mutates the tab's `body`. The Reviewer also diagnosed *why the suite missed it*: the F-3 test fixture used `body = signal({})`, under which `showOicrSelection()` is false and the control never instantiates.

**Attempt 2 — FAIL.** Bound the remaining controls (all `||` widenings) and added a fixture (`{ tagging: { tag_id: 2 } }`) that genuinely renders the OICR select — the Implementer independently traced `showOicrSelection()` rather than taking the Reviewer's shorthand shape on faith. Mutation-proven by both the Implementer and the Leader. **Finding:** the Reviewer **corrected its own attempt-1 remediation**. It had asserted that disabling the `app-select` made the projected `#rows` clear icon unreachable; asked to verify rather than carry that forward, it found the claim false — `select.component.html` binds `[disabled]` once at `:19` inside `<p-select>` (`:18-104`), while the `#rows` outlet is at `:129`, inside a block opening at `:122`, **outside** the select. So the clear icon stayed live, calling `clearOicrSelection()` and wiping `link_result.external_oicr_id`. Bounded (can't persist — `saveData` is behind `isEditableStatus()`), but a reachable state mutation on a surface R-RC-014 declares non-mutable. Also flagged "Main contact person" as the last field control with no `disabled` term.

**Attempt 3 — PASS.** Three edits: (a) `@if (!disabled && !editingOicr())` on the clear icon; (b) an early-return guard in `oicr-details.clearOicrSelection()` before the mutation; (c) `disabled ||` prefix on Main contact person for uniformity. The test stub was rebuilt with `@ContentChild('rows')` + `*ngTemplateOutlet` so projected content actually instantiates — the previous `template: ''` stub was structurally incapable of catching this, which is how the gap survived two rounds.

**Reviewer's verification of attempt 3 (unusually strong, worth recording):**
- **Validated the content-projection premise two independent ways** instead of reasoning from intuition — this session had already been bitten twice by plausible-but-wrong framework assumptions (`preventDefault()` vs `RouterLink` in T-14; `[disabled]` vs projected content here). *Compile-time:* AOT with `strictTemplates` accepts `this.createResultManagementService` — a member that exists **only** on `OicrFormFieldsComponent` — inside the `#rows` template; if the embedded template's context were the host, that would be a TS2339. *Runtime:* the `disabled=false` test evaluates that same expression under a stub host lacking the member, without error. So the test proves real behavior, not the stub. It also volunteered an honest caveat: the `disabled=true` assertion alone would pass under either semantics (it short-circuits), so the `disabled=false` case is the discriminating one.
- **Closed the mechanism class, not just the instance:** `SelectComponent.hideSelected` defaults to `true`, and the OICR select is the only `<app-select>` in the file overriding it — so the `:122-149` escape hatch was reachable for exactly one control, now fixed.
- **Independent completeness sweep** of both `oicr-form-fields.component.html` and `oicr-details.component.html`: every interactive control now carries a platform or editability term, enumerated one by one. Also verified the transitive link the sweep depends on (`submission.service.ts:60-66` short-circuits on `isExternalResult()`, regression-tested).
- Own runs: 6 suites / 202 tests, lint clean, `ng build` (6 pre-existing unrelated errors, zero in OICR files).

**Leader's independent verification:** reproduced the attempt-2 and attempt-3 mutations via out-of-repo backup copies (no git ops — deliberate, given the earlier stash incident). Reverting only the attempt-3 `:103` guard produced exactly `1 failed, 36 passed` with the expected test name; restoring gave 7 suites / 378 passed. Also confirmed by direct read that `<p-select>` spans `:18-104` with `[disabled]` only at `:19` while the `#rows` outlet is at `:129` — i.e. the Reviewer's self-correction was right.

### Why this took three attempts — the pattern worth remembering

The enumerated set grew every round: the spec scoped 12 tabs (missing 3 shared files) → T-11 found 5 controls → attempt 1 bound 4 of 6 → attempt 3 closed 8 controls plus a projected icon. Each round's fix was correct for what it was pointed at; each round's *enumeration* was short. Two compounding causes: (1) shared components rendered outside the feature folder are invisible to a feature-scoped file list, and (2) **test doubles that don't render what they stand in for cannot catch gaps in what they hide** — `body = signal({})` hid one control, `template: ''` hid another. Both were green suites over open controls.

### Non-blocking observations recorded (out of T-15 scope)

- **Pre-existing invalid TS in a spec file:** `oicr-form-fields.component.spec.ts:99-103` contains `let createResultMock: { … } as any;`, which `tsc -p tsconfig.spec.json` rejects (`TS1005`). It survives only because ts-jest error-recovers with diagnostics off. Confirmed identical at HEAD — pre-existing, not introduced. A sibling exists at `indicators-tab-filter.component.spec.ts:181`. Worth a hygiene ticket.
- **Transitive-only gating** on four controls (external-use checkbox, its description input, `app-impact-areas`, OICR No): correct today via `isEditableStatus()`'s short-circuit, but adjacent controls spell `cache.isExternalResult() ||` explicitly. Consistency nit.
- **Different-requirement gap:** MEL Regional Expert and SharePoint Folder Link gate on `!isAdmin || isExternalResult()` — R-RC-014 satisfied, but no editability term, so an admin can still edit them on a *STAR* result in a non-editable status. Belongs to the R-RC-003/004 family; pre-existing.
- `<button>Published</button>` badges with no handler and no `type` — a11y semantics, pre-existing.

**Final verification result:** PASS — 7 suites / 378 tests on the targeted set, lint clean, mutation-tested independently by Implementer, Reviewer, and Leader.

---

## AC.6 Re-sweep — PASSED: zero remaining findings

- **Date:** 2026-07-28
- **Closes:** R-RC-014 AC.6, and by extension T-11's primary AC ("zero editable controls across all 12 tabs")
- **Method:** independent re-run of T-11's sweep, briefed to enumerate **from source rather than from the prior finding lists** — because this spec had by then been caught out three separate times by enumeration shorter than reality (spec scope → 5 controls → 4-of-6 → 8 + a projected icon). 82 tool calls.

### Verdict: AC.6 MET

All five T-11 findings verified closed **structurally** (each with file:line, not via test results): F-1's double gate (computed early-return before the `|| isAdmin()` clause, plus the handler guard before `DELETE_Result()`), F-2's pair, F-3's eight controls + AI button, F-3b's projected clear icon (template guard + `clearOicrSelection()` method guard), F-4's three inputs at both call sites, F-5's step buttons.

### The genuinely useful part: a second instance of the projection bug class, checked exhaustively

The sweep was specifically tasked with hunting the two structural causes behind the earlier misses. It found that **`multiselect` has the same escape hatch as `select`**: its `#rows` outlet (`multiselect.component.html:116`, block `:94-138`) renders **outside** the `<p-multiSelect>` that carries `[disabled]` (`:20-83`, bound at `:24`) — architecturally identical to the `select` bug that survived two rounds.

The difference in blast radius is what makes this worth recording: `SelectComponent.hideSelected` defaults to **`true`** and only one consumer overrode it, which is why that escape hatch was reachable for exactly one control. `MultiselectComponent.hideSelected` defaults to **`false`**, so its block renders for **all 13 consumers** on the result surface. The sweep enumerated all 13 and confirmed every one whose projected content is interactive carries its own explicit gate (geographic-scope's subnational remove + nested multiselect-instance; alliance-alignment's three "Select as Primary" buttons and lever-card inputs; alliance-alignment-p2's; the rest project only inert display content). **No finding — but the class is now verified, not assumed.**

### Two items recorded for the backlog (neither blocks AC.6)

1. **`multiselect-opensearch` is a loaded gun.** `multiselect-opensearch.component.html:14-28` has no `[disabled]` binding and the component declares no `disabled` `@Input` at all — unlike its sibling `multiselect-instance`. It is currently **unused** (zero references repo-wide), so it is unreachable and not a finding. But the first consumer to drop it onto a result tab inherits an ungated multiselect, and the feature-scoped review pattern that produced T-11's misses would not catch it. Worth a hygiene ticket.
2. **`version-selector.updateResult()` lacks the defense-in-depth second layer.** Its template gate (`:39`, `getCurrentPlatformCode() === 'STAR' || ''`) *is* a genuine platform check, so it is correctly gated — but it is now the only mutation path on the result surface without the method-level guard that T-15 added to the other seven (`submmitConfirm`, `approveResult`, `onStatusChange`, the delete `command`, `confirmEdit`, `onDeleteContactPerson`, `clearOicrSelection`). Consistency gap only.

### One observation worth keeping

`isExternalResult()` derives from the route's result-id prefix (`cache.service.ts:105-111`), **not** from fetched metadata — so it is correct from first render, with no async window in which controls are transiently enabled before the platform is known. That property is what makes the whole template-level gating strategy sound, and it was worth confirming rather than assuming.

---

(further entries appended below, one per task, in execution order)
