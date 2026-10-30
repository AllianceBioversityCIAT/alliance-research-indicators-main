# Execution Log — Bilateral / Mapping status in the Edit modal

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `bilateral/mapping-status-in-edit-modal` (AC-1797) |
| Branch | `AC-1797-Move-bilateral-mapping-activation-inactivation-to-the-edit-modal-with-mandatory-justification-and-allow-exporting-the-filtered-list` |
| Leader | Claude Code, `claude-opus-5-5` (T1) |
| Implementer | Cursor CLI · `grok-4.7-*` (T2), dispatched through Orca orchestration, run `run_ffa1aa946f0a`. Standing owner routing: "Grok implements, Claude reviews" |
| Reviewer | `akili-reviewer` wrapper (Claude `opus`, T3, read-only) |
| Approval mode | Spec says `interactive`. The owner's standing direction is to keep going task to task and stop only on `FATAL_FAIL`, HALT, Pivot or the budget tripwire. The T-03 HITL (P-8, P-9, visual) and the commit of UI changes still wait for the owner's eyes |
| Budget (design §12) | 4 tasks · ~450 LOC · 5 review rounds |
| Persona drift check | `akili doctor --agents`: all personas `UNMARKED` ("no marker of any kind found"). Project-customized files; `--fix` not run, to avoid overwriting the customizations. Reported to the owner |
| Environment | No running stack needed: every verification is unit/supertest (jest), lint and build |

## 2. Task Execution History

### T-01 — Server: deactivate requires a trimmed justification; idempotent calls write supplied notes — PASS (attempt 1)

- **Date:** 2026-10-30 · **Final status:** PASS
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd` (task defaults) · **Effort:** `grok-4.7-high` (write contract + idempotency rule, well specified)
- **Orca:** task `task_682ceb026bae`, dispatch `ctx_204da335146d` (terminal `term_bd85b6b9-…`), ran in parallel with T-02 (cross-package); retained through review, released after PASS
- **Attempts:** 1
- **Files changed:** `server/researchindicators/src/domain/entities/bilateral-project-mapping/{bilateral-project-mapping.controller.ts, bilateral-project-mapping.service.ts, bilateral-project-mapping.controller.spec.ts, bilateral-project-mapping.service.spec.ts}` (+175 / −10)
- **Step 1, P-11 settled (supertest through the real deactivate `ValidationPipe`, before the service was touched):** `{}` → 400, service not called, payload names `notes`; `{ notes: "   " }` → 400, service not called, payload names `notes`; `{ notes: " x " }` → 200, service called with `"x"`; 501 characters → 400. The combined `@Transform` trim + `@IsString` + `@IsNotEmpty` + `@MaxLength(500)` behaves as design P-11 claims; no decorator adjustment was needed. **P-11 is now verified.**
- **Red run (pre-change code, assertion level):** AC.1 `{}` and `"   "` → `Expected: 400 / Received: 200`; AC.6 (fixture notes `"old note"`) → `Expected number of calls: 1 / Received number of calls: 0`; activate analog → `Received number of calls: 0`.
- **Falsifiers (post-change, observed red, reverted):** (a) `@IsNotEmpty` removed → whitespace case `Expected: 400 / Received: 200`; (b) `@Transform` removed → `Received: 5, {…}, " Contract closed "`; (c) early `return row` restored → AC.6 `Received number of calls: 0`.
- **Implementer verification:** `npx jest src/domain/entities/bilateral-project-mapping --coverage=false` → 8 suites / 172 tests passed (includes `automapper.service.spec.ts`) · `npx eslint src/domain/entities/bilateral-project-mapping` exit 0 · `npm run build` exit 0.
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** same three commands from `server/researchindicators/` → `Test Suites: 8 passed, 8 total` / `Tests: 172 passed, 172 total` · `ESLINT_EXIT:0` · `BUILD_EXIT:0`.
- **Reviewer:** `akili-reviewer`/opus — **`STATUS: PASS`**. "The diff conforms to all of it": DTO decorators as scoped, `@ApiBody required: true`, activate DTO unchanged (DD-5); idempotent branches write `notes` + `updated_by` without touching `is_active`/`deleted_at`, early return unchanged without notes (DD-8); AC.1/AC.3 assert 400 + service not called + payload names `notes` (disqualifier met); AC.6 fixture starts at `"old note"` (disqualifier met). It flagged one Leader bookkeeping item — the P-11 record in this file — which is the "Step 1" line above.
- **ADVISORY (not gating):**
  - RISK: activate on an already-active row with `{ notes: "   " }` or `{ notes: "" }` now overwrites the note and returns 200 (DD-8 as specified; activate notes are not trimmed or capped — pre-existing). A client that sends blank edited notes on activate could blank the stored note.
  - RELIABILITY: the supertest app does not register `GlobalExceptions`, so the asserted 400 body is Nest's default message array, not the production `ServerResponseDto` envelope. Known gap; AC.1/AC.3 still hold.
  - READABILITY: the DTO is inline in the controller, following the existing `BilateralProjectMappingNotesDto` precedent; the server guide prefers `dto/<feature>.dto.ts`.
- **Forward pointer → T-03:** the RISK advisory touches T-03's activate call. Design §7.3 already says `plan.notes` is `undefined` for activate when notes were not edited; the T-03 brief carries this advisory so the worker keeps that rule. No scope added.
- **spawns:** Implementer Cursor/grok-4.7-high: not reported by host, ended complete · Reviewer akili-reviewer/opus 11 calls, 64 206 tokens, ended complete
- **Requirements covered:** R-MSE-005 AC.1–AC.6, R-MSE-003 "Justification overwrites notes" (server half)
- **Decisions made:** none beyond the spec.
- **Issues encountered:** the brief named `src/domain/tools/automapper` for the consumer suite; the consumer actually lives in the same folder (`bilateral-project-mapping/automapper.service.spec.ts`) and ran inside the folder command.
- **Budget running totals:** tasks 1 / 4 · LOC 185 / ~450 · review rounds 1 / 5 — within budget.
- **Gate:** auto-approved (owner's standing direction: continue until FATAL_FAIL / HALT / Pivot / tripwire).

### T-02 — Client: API and service forward the justification / notes — PASS (attempt 1)

- **Date:** 2026-10-30 · **Final status:** PASS
- **Skills:** `angular-developer` (task default) · **Effort:** `grok-4.7-medium` (two signature changes, well specified)
- **Orca:** task `task_8455204771a1`, dispatch `ctx_6d3f24608ff3` (terminal `term_1dcc2349-…`), parallel with T-01 (cross-package). `worker-start` returned `state: failed, stage: dispatch_input`: the prompt was pasted but not submitted, and the dispatch capability was revoked. The Leader submitted the pasted prompt (Enter) and told the worker to skip lifecycle commands and write its report to `/tmp/T-02-report.md`.
- **runtime events:** spawn failure (dispatch input not submitted, capability revoked) ×1 → rung 1 (same worker resumed by terminal input; report delivered by file)
- **Attempts:** 1
- **Files changed:** `client/research-indicators/src/app/shared/services/{api.service.ts, bilateral-mapping.service.ts, bilateral-mapping.service.spec.ts}`; compile-keeping only: `…/bilateral-mapping/bilateral-mapping.component.ts:518` (`deactivate(row.id, row.notes ?? '')`) and the matching assertion in `bilateral-mapping.component.spec.ts:1230` (+66 / −14)
- **Red run (pre-change code):** `Expected: 11, {"notes": "x"} / Received: 11` (deactivate); activate-with-notes `Expected: 11, {"notes": "n"} / Received: 11`; deactivate URL assertion `Expected { notes: "x" } / Received {}`.
- **Falsifiers (post-change, observed red, reverted):** `body ?? {}` → `body` makes the empty-body activate test show `- {}` / `+ undefined`; deactivate body dropped → `- {"notes": "x"}` / `+ {}`.
- **Implementer verification:** service spec 29 passed · component folder 3 suites / 125 passed · `npm run lint -- --quiet` exit 0 · `npm run build` exit 0 · spec tsc set for `bilateral-mapping.service.spec`: empty before, empty after (project total 945 → 945).
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** from `client/research-indicators/`: `npx jest src/app/shared/services/bilateral-mapping.service.spec.ts src/app/pages/platform/pages/administration/center-admin/bilateral-mapping --coverage=false` → `Test Suites: 4 passed, 4 total` / `Tests: 154 passed, 154 total` · `LINT_EXIT:0` · `BUILD_EXIT:0` · tsc spec grep count → 0.
- **Reviewer:** `akili-reviewer`/opus — **`STATUS: PASS`**. "The diff matches design §8 and the R-MSE-004/R-MSE-005 request bodies exactly"; J-7 test points all covered; HTTP still only through `ApiService`; the temporary call site makes no behavior claim and is conformant. ISSUES: none.
- **ADVISORY (not gating):**
  - RISK (interim only): until T-03 lands, the row Deactivate action sends `{ notes: '' }` for a row without notes (server 400 after T-01), or resends the old notes as the justification. T-03 removes the row action and this call site; the T-03 Reviewer should confirm `row.notes ?? ''` is gone.
  - RELIABILITY: `activate(id, '')` sends `{ notes: '' }` (correct per §8). T-03's "notes if edited" must pass `undefined`, not `''`, when notes were not edited.
  - READABILITY: the activate comment now cites R-MSE-005 AC.5 in place of R-APM-011; the supersession is recorded by T-04.
- **Forward pointers → T-03:** (1) remove `row.notes ?? ''` with the row action; (2) activate passes `undefined` when notes were not edited (joins the T-01 RISK pointer).
- **Assumptions (worker, verbatim):** "`row.notes` is `string | null | undefined`, so the temporary deactivate call uses `row.notes ?? ''` so `npm run build` type-checks. T-03 replaces this call site. No behavior claim rides on the empty-string fallback."
- **spawns:** Implementer Cursor/grok-4.7-medium: not reported by host, ended complete · Reviewer akili-reviewer/opus 5 calls, 42 877 tokens, ended complete
- **Requirements covered:** R-MSE-004 (request bodies), R-MSE-005 AC.5 (client keeps `{}` on activate)
- **Decisions made:** none beyond the spec.
- **Budget running totals:** tasks 2 / 4 · LOC 265 / ~450 · review rounds 2 / 5 — within budget.
- **Gate:** auto-approved (owner's standing direction).

### T-03 — Client: Status control, justification, second confirmation, one row action — code PASS (attempt 1); HITL pending; budget tripwire

- **Date:** 2026-10-30 · **Final status:** code `PASS`; task stays open (`[~]`) — the HITL done criterion is owed to the owner, and the budget tripwire fired (below)
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `tdd` (task defaults) · **Effort:** `grok-4.7-xhigh` (UI state machine with double-submit and close-path guards)
- **Orca:** task `task_6fde05c56f06`, dispatch `ctx_7acf30be5325` (terminal `term_603737fb-…`); retained (HITL may need rework)
- **Attempts:** 1
- **Files changed:** `client/research-indicators/src/app/pages/platform/pages/administration/center-admin/bilateral-mapping/{bilateral-mapping.component.ts, .html, .spec.ts}` (+714 / −440; about half is Prettier reflow, per Reviewer B)
- **Red run (pre-change component, assertion level):** new describe 11 failed / 2 passed. Quotes: deactivate-btn `Expected: 0 / Received: 1`; status toggle `expect(input).not.toBeNull() / Received: null`; ariaLabel `Expected: "Mapping status: Inactive" / Received: undefined`; visibleChange gate `Expected: "function" / Received: "undefined"`; project round trip `Expected substring: "USAID" / Received string: "ACIAR"`. Already green before (not cited as reds): Pending/UNMAPPED renders only + Map; notes-only edit → one update, no confirmation.
- **Falsifiers (post-change, observed red, reverted):** (a) onSave guard reduced to `saving()` → `showGlobalAlert` `Expected number of calls: 1 / Received number of calls: 2`; (b) onDialogVisibleChange always closes → `dialogOpen()` `Expected: true / Received: false`; (c) applyStatusChange reads `justification()` → `Expected: 10, "Contract closed" / Received: 10, "changed after save"`; (d) row-action block restored → deactivate-btn `Expected: 0 / Received: 1`.
- **Implementer verification:** folder jest `--coverage=false` → 3 suites / 126 passed · `npm run lint -- --quiet` "All files pass linting." · `npm run build` exit 0 · spec tsc set for component.spec identical before/after (one pre-existing `TS2749` on `Select`).
- **Evidence re-run (Leader inline, non-author) — VERIFIED:** from `client/research-indicators/`: folder jest → `Test Suites: 3 passed, 3 total` / `Tests: 126 passed, 126 total` · `LINT_EXIT:0` · `BUILD_EXIT:0` · tsc set: the single pre-existing `TS2749` line · **full client suite** `npm test -- --silent` → `Test Suites: 347 passed, 347 total` / `Tests: 8118 passed, 8118 total`.
- **Execute-time spec edit:** `design.md` §9 DD-7, 2026-10-30 — wording aligned with §7.3 (hide path gated in `onDialogVisibleChange`/`closeDialog`, `focusTrap` off while pending, `closeOnEscape` not toggled; judgment R2-3). Reason: the worker flagged the stale `closeOnEscape` wording. Meaning unchanged. Carried as a named check to both Reviewers; carry once more to the T-04 Reviewer.
- **Reviewer (parallel lens mode — effort `xhigh`):**
  - A, `akili-reviewer`/opus, lens RELIABILITY: **`STATUS: PASS`**. State machine matches §7.1–§7.4 and amended DD-7; every open path resets via `resetStatusDraft`; stash/restore honours the `undefined` sentinel; `confirmPending`/`saving` clear on Confirm, Cancel, success and failure; no other path can leave `confirmPending` stuck; tests respect KZ-015 and invoke the real callbacks. Forward pointers (1) and (2) hold.
  - B, `akili-reviewer`/opus, lens RISK: **`STATUS: PASS`**. No request before Confirm or after Cancel; no double request (alert closes in the same click handler); no project sent with a status change; justification trimmed at Save; notes on activate only when they differ from the snapshot; §7.3 strings exact; Clarity names kept; a11y attributes and tokens conform.
- **ADVISORY (not gating):**
  - RISK/RELIABILITY (both reviewers): clearing Notes (or whitespace-only) then activating sends `activate(id, '')`, which wipes the stored notes (DD-8). Intended by R-MSE-003 ("an edited value is saved"), but the Activate confirmation does not say notes will be cleared.
  - RISK: the activate tests do not assert the `bilateral.mapping.activated` Clarity event or `load`/`loadCoverage`; only deactivate does.
  - RELIABILITY: R2-4 refocus-Save probably no-ops — `focusSaveButton()` runs in a microtask before change detection re-enables Save (inferred, not run). Check in the HITL keyboard pass.
  - RESILIENCE: `onSave`'s create/update branch has no try/finally; a future rejection would leave `saving` stuck and the dialog unclosable under the new gate. Not reachable today (`ToPromiseService` maps errors to `successfulRequest: false`).
  - READABILITY: about half the diff is unrelated Prettier reflow.
- **Not Done / Assumptions (worker, verbatim):**
  - "R-MSE-002's active-row scenario says a status change alone enables Save. R-MSE-003 and design §7.2 keep Save disabled while the justification is empty or whitespace. Implemented §7.2. 'Toggling alone enables Save' is the Inactive → Active case (no justification). Active → Inactive enables Save only after a non-blank justification, with no project change."
  - "Design DD-7 still mentions `closeOnEscape` (judgment R2-3, wording only). Not edited: scope is the three component files. The dialog does not bind `closeOnEscape`; hide is gated in `onDialogVisibleChange` and `closeDialog`." → resolved by the Leader's DD-7 edit above.
  - No owed item → not a continuation.
- **Spec tension (Pivot-lightest, to the owner at this gate):** `requirements.md` R-MSE-002 scenario "Edit an active mapping" ("AND IT MUST make Save enabled when only the Status control is changed") vs R-MSE-003 / design §7.2 (Save disabled while the justification is blank). Both Reviewers: code correct under §7.2. Proposed one-line amendment to R-MSE-002 — owner decision pending.
- **spawns:** Implementer Cursor/grok-4.7-xhigh: not reported by host, ended complete · Reviewer A akili-reviewer/opus 18 calls, 112 693 tokens, ended complete · Reviewer B akili-reviewer/opus 17 calls, 107 894 tokens, ended complete
- **Requirements covered:** R-MSE-001, R-MSE-002, R-MSE-003 (client), R-MSE-004, NFR-MSE-001 (automatable half), NFR-MSE-002
- **Budget running totals:** tasks 3 / 4 · LOC 1 419 / ~450 (insertions + deletions, same metric as T-01/T-02; T-03 alone 1 154) · review rounds 4 / 5 (T-03 counted as two verdicts) — **BUDGET TRIPWIRE: LOC ≈ 3.2× the design §12 estimate.** Cause: the component spec was largely rewritten (+585 lines churn) and Prettier reflowed the touched files; the design estimated ~150 component + ~170 specs. Escalated to the owner; not logged auto-approved.
- **HITL owed (owner, running app):** confirmation above the modal (P-8); Tab reaches Confirm/Cancel and Escape does not close the modal while pending (P-9, R2-2); toggle in light and dark; header X disappearing while pending acceptable (R2-5); refocus of Save after Cancel (advisory).
- **Owner decisions at the T-03 gate (2026-10-30, AskUserQuestion):**
  - Spec tension → "Enmendar R-MSE-002". `requirements.md` R-MSE-002 Behavior bullet and scenario "Edit an active mapping" amended: Save enables immediately for Inactive → Active, and for Active → Inactive once a justification is typed (R-MSE-003). Code unchanged; meaning of R-MSE-003/§7.2 unchanged.
  - Budget tripwire → "Aceptar y continuar". Overrun accepted by the owner; cause recorded above. Not auto-approved.

### T-03 — HITL (owner, running app, 2026-10-30) → rework; Amendment A-2

Owner observed, verbatim (translated from Spanish): "when it is inactive and I activate it, the CLARISA field is disabled; when it is active and I inactivate it, it is normal that field is disabled". "The justification should be below the activation toggle." "Don't replace the notes — notes may be used for other things; the justification is only for the status." Screenshots also show an inactive mapping opening with an **empty** CLARISA picker (clear-X visible, so a value is set but its option is missing).

Classification: not a code FAIL against the spec (the picker lock on activation and the notes overwrite were specified, DD-3/DD-4) — an owner-driven **spec change**. Attempt counter for T-03 unchanged; rework goes to the same retained worker.

Owner decisions (AskUserQuestion, 2026-10-30):
- Justification storage → **new column** `status_justification` (last value, overwritten) — R-MSE-006, DD-9.
- CLARISA on activation → **editable, same request** (`activate` accepts `clarisa_project_id`) — R-MSE-007, DD-10.
- Justification on activation → **inactivate only** (unchanged).

Leader defaults (owner may overrule): deactivate wire key renamed `notes` → `justification` (plus optional `notes`); activate does not clear `status_justification` (DD-11); `/admin` SSR page updated to the new key.

New task T-05 (server) added; T-03 rework scope items 7–10 added; T-04 scope updated. Budget: already over (accepted at the T-03 gate); A-2 adds a migration and a server task — tripwire re-noted, not re-asked, since the owner initiated the scope.

Rollout note: the new column needs its migration applied to the DB the owner's local server uses before the next HITL — a human step.

Dispatch (A-2): T-05 → task `task_9fb68b9ea8b8`, dispatch `ctx_da77851db7ba`, fresh Grok (`grok-4.7-high`, cursor). T-03 rework → task `task_a560609e79e3`, dispatch `ctx_bb42b3c98721`, same terminal `term_603737fb-…` as T-03 (effort bumped to xhigh). Parallel, cross-package (editing only).

## T-05 — Server: `status_justification` column; deactivate `{ justification, notes? }`; activate accepts a project (A-2)

- **Implementer:** Grok `grok-4.7-high` (cursor, Orca task `task_9fb68b9ea8b8`, dispatch `ctx_da77851db7ba`), attempt 1. Report `/tmp/T-05-report.md`.
- **Red run (worker):** assertion-level reds observed after signatures compiled, e.g. R-MSE-006 `Expected: "old note" Received: "Contract closed"`; reactivate onto B `Expected: 2 Received: 1`; old `{ notes: "x" }` body `Expected: 400 Received: 200`.
- **Falsifiers (worker):** (a) justification also written to notes → `Expected: "old note" Received: "Contract closed"`; (b) activate ignores `clarisa_project_id` → `Expected: 2 Received: 1`. Both reverted.
- **Worker verification:** bilateral folder jest `8 suites / 180 tests passed`; eslint on 7 files exit 0; `npm run build` exit 0.
- **Evidence re-run (Leader, non-author): VERIFIED** — full server suite `npm test -- --silent` → `Test Suites: 441 passed, 441 total` / `Tests: 4295 passed, 4295 total`.
- **Reviewer:** `akili-reviewer` (opus), full → **`STATUS: PASS`**. Justification never lands in notes (both paths); `applyClarisaProjectChange` is a verbatim extraction of update()'s block; migration additive/reversible and matches the entity; DTO + Swagger + SSR correct; service-level optional `justification` acceptable (sole caller's DTO requires it).
- **Recorded gaps (Leader action):**
  - Migration `1793389030636-addStatusJustificationToBilateralProjectMapping.ts` **not executed** (K-006). To run on the disposable TEST harness (`compose:test:up`, `migration:test:bootstrap`, `migration:test:revert`) before archive; applying to the shared Dev DB is the owner's step.
  - R-MSE-007 parenthetical claimed the short-name snapshot is refreshed; `update()` copies it only when supplied. Spec text corrected (Leader, option a) — reactivating onto B keeps A's short name, same as `PATCH :id` today. Product follow-up if the owner wants the snapshot refreshed from CLARISA.
- **Advisories:** deactivate blank `notes` saves `''`; activate `notes` uncapped (pre-existing); helper docstring vs activate's `source` behavior; no controller test for invalid `clarisa_project_id` on activate.
- **Spec drift cleaned (Leader, from both reviews):** requirements R-MSE-003/004/005/007 lines, design §3/§7.3/§7.4/§8, tasks T-03 bullets now carry A-2 wording.
- **Verdict:** PASS → T-05 done.

### T-03 rework attempt 1 (A-2) — Reviewer FAIL

- Worker report `/tmp/T-03-rework-report.md`: empty-picker root cause — `GET tools/clarisa/projects/bilateral` returns only the current-phase cohort; an inactive row's project is often absent, so p-select has the id but no option (`primeng-select.mjs` assigns `selectedOption` only when the index ≠ -1). Fix seeds the row's project into options. Targeted jest 161/161; lint, build, spec tsc set identical.
- **Evidence re-run (Leader): VERIFIED** — full client suite 8121/8121 tests; 1 untouched suite (`get-project-status.service.spec.ts`) killed by runner SIGSEGV twice, passes 3/3 alone (runner, not product).
- **Reviewer** (`akili-reviewer`, opus, full): **`STATUS: FAIL`** — 1 issue: `bilateral-mapping.component.spec.ts:1459-1460,1487` still asserts the pre-A-2 notes overwrite with a tautological readback of the mock (violates R-MSE-006). Component/services clean, no regression of the original T-03 guards.
- **Attempt 2** dispatched to the same worker (task `task_d0d8d3485c32`), effort xhigh (ceiling, no bump), plus advisories A (seed not duplicated / not stale across opens, with falsifier) and B (seeded label carries `external_code`).

### T-03 rework attempt 2 (A-2) — Reviewer PASS; HITL pending

- Worker report `/tmp/T-03-rework2-report.md`: tautological notes assertion removed; mocks carry `status_justification`; new cohort-switch test (falsifier: accumulate options → `Expected: false Received: true`); seeded option carries `external_code` (red: `Expected substring: "B-A1697 — Orphan bilateral" Received: "ORPHAN — Orphan bilateral"`). Targeted jest 162/162, lint clean, build exit 0.
- **Evidence re-run (Leader): VERIFIED** — full client suite `Test Suites: 347 passed, 347 total` / `Tests: 8125 passed, 8125 total`; spec type-check filtered to bilateral files → only the pre-existing `TS2749` on `Select` (unchanged set).
- **Reviewer** (same `akili-reviewer`, scoped re-review): **`STATUS: PASS`**.
- **Migration check (T-05 gap, K-006):** the full disposable-harness chain (`compose:test:down/up`, `migration:test:bootstrap`) fails at an unrelated older migration — `CreatePiDelegates1787600000000`: "Referencing column 'project_id' and referenced column 'agreement_id' … are incompatible" (baseline drift, pre-existing, out of scope). Instead, the migration's exact `up` and `down` SQL were executed by hand on the scratch `bilateral_project_mapping` table: up → `status_justification text YES NULL`; down → column gone. SQL verified executable and reversible; the TypeORM runner path itself was not exercised.
- T-03 code is PASS; the done criterion **HITL** stays open until the owner re-tests A-2 in the running app. Client changes stay uncommitted (no commit before visual approval). Worker `ctx_bb42b3c98721` / terminal `term_603737fb-…` retained.

### T-03 — second HITL (owner, 2026-10-30) → Amendment A-3

Owner observed (translated): A-2 behaves as asked, but "it being required when inactivating doesn't mean I can't add a justification when activating — the field only shows when I inactivate"; and on the inactivate confirmation (green pencil, `confirm`): "fine if you're updating something, but if the action is inactivate it should be a warning, amber". Spec change, not a code FAIL. Recorded as R-MSE-008, DD-12, DD-13; new task T-06 (server); T-03 scope item 11. Leader choice: `secondary` severity (amber triangle), because `warning`'s icon is a clock (`pi-history`); the owner may overrule.

## T-06 — Server: activate accepts an optional justification (A-3)

- **Implementer:** Grok `grok-4.7-medium` (cursor, task `task_342f9c4c0864`, dispatch `ctx_3fbf02f2e686`), attempt 1. Report `/tmp/T-06-report.md`.
- **Red run (worker):** `-t "R-MSE-008"` → 5 failed / 1 passed; transition `Expected: "Contract renewed" Received: "Contract closed"`; idempotent `Expected number of calls: 1 Received: 0`; 501 → message did not name justification (`property justification should not exist`). The blank-unchanged test was green before (disclosed; it discriminates only once a write exists).
- **Falsifier:** both assignments removed → `Expected: "Contract renewed" Received: "Contract closed"`; restored, folder 186/186.
- **Worker verification:** bilateral folder 8 suites / 186 tests; eslint exit 0; build exit 0.
- **Evidence re-run (Leader): VERIFIED** — full server suite `Test Suites: 441 passed, 441 total` / `Tests: 4301 passed, 4301 total`.
- **Reviewer** (`akili-reviewer`, opus, full): **`STATUS: PASS`**. Advisory: no test pins that a blank justification on an already-active row skips the save (code does skip it).
- **Verdict:** PASS → T-06 done.

### T-03 rework (A-3) — Reviewer PASS; third HITL pending

- Worker report `/tmp/T-03-rework3-report.md`: reds — field null on activation; service body `{}`; severity `Expected: "secondary" Received: "confirm"`. Falsifiers (a) `@if (isInactivating())` → field null; (b) severity back to `confirm` → red. Targeted 167/167, lint clean, build exit 0, touched-spec tsc set unchanged (only pre-existing `TS2749`).
- **Evidence re-run (Leader): VERIFIED** — full client suite `Tests: 8129 passed, 8129 total`; untouched `banner.component.spec.ts` failed at runner level only, passes 1/1 alone. `git status` confirms the shared global-alert component is untouched.
- **Reviewer** (`akili-reviewer`, scoped): **`STATUS: PASS`**. Advisory applied by the Leader: NFR-MSE-001 narrowed (`aria-required` only when inactivating). Other advisory: one test uses `.not.toBe('true')` where `toBeNull()` is exact (non-blocking).
- Client still uncommitted pending the owner's third HITL; worker retained.

### T-03 — third HITL (owner, 2026-10-30) → A-3b; open defect report

Owner (translated): "I activated it with the comment 'test' but now when I edit it the comment doesn't show; it stays hidden and only appears when I flip the toggle." Owner typed 'test' in **both** Notes and Justification. Read-only query of the shared DB: row 192 (S287, 2026) `notes='test'`, `status_justification=NULL` — **the activate justification was not stored**. Client plan/service/API verified by reading to send `{ justification }`; the activate route has `forbidNonWhitelisted`, so a pre-T-06 server would have returned 400, not 200. Cause **not yet determined** — owner asked for the Network payload/response of a fresh activate and to confirm the server runs this worktree after `4a1e8d26`. Open.

Owner decision (AskUserQuestion): show the stored justification **read-only** on open → A-3b bullet in R-MSE-008.

- Rework 4 (same worker, task `task_0f96ae100f8f`): read-only "Last justification:" line under the toggle when `status_justification` is non-blank; red `Received: null` before; falsifier (gate on `statusChanged()`) red. Targeted 170/170, lint clean, build exit 0, tsc set unchanged.
- **Evidence re-run (Leader): VERIFIED** — full client suite `Test Suites: 347 passed, 347 total` / `Tests: 8133 passed, 8133 total`.
- **Reviewer** (`akili-reviewer`, checklist): **`STATUS: PASS`**. Advisory: the no-stale-value reset is proven by code reading only (no cross-open test).

### T-03 — fourth HITL (owner, 2026-10-30) → visual rework 5

Owner (translated): "the data is there, but the style/design makes it get lost" (read-only last justification flush against the editable field's label). The S287 null-justification report is treated as closed: a later save stored "just a test" correctly, consistent with a server that had not been restarted after T-06 (not proven; reopen with a request payload if it recurs).
- Rework 5 (same worker, task `task_20561be45263`): panel reusing `bil-sp-preview` (tokens `--ac-grey-100/200`), `pi-history` icon `aria-hidden`, label + pre-wrapped text; Status block `gap-5`. Template only. Targeted 170/170, lint clean, build exit 0 (no style-budget hit).
- **Evidence re-run (Leader): VERIFIED** — full client suite `Test Suites: 347 passed, 347 total` / `Tests: 8133 passed, 8133 total`.
- **Reviewer** (`akili-reviewer`, checklist): **`STATUS: PASS`**. Light/dark rendering left to the owner's HITL.

### T-03 — owner HITL approval (2026-10-30)

Owner, verbatim: "me agrada haz commit" ("I like it, commit"), after reviewing the A-2/A-3/A-3b behaviour and the last-justification panel in the running app (native client + server, shared Dev DB with the `status_justification` migration applied by the owner). Not separately confirmed: dark-theme rendering of the panel, Save refocus after Cancel.

- **Verdict:** code PASS (Reviewer, all reworks) + owner HITL approval → T-03 done. Worker released.
- Open product question (not blocking): changing the CLARISA project on edit/activate keeps the previous project's short-name snapshot (pre-existing `update()` behaviour).
