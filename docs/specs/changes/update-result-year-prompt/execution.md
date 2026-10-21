# Execution Log — Results / "Update result" asks for the viewed version's year first

## Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/update-result-year-prompt` |
| Leader | Claude Opus 5.5 (session) |
| Implementer | `akili-implementer` wrapper (Sonnet) |
| Reviewer | `akili-reviewer` wrapper (Opus) — author ≠ auditor |
| Mode | Owner standing rule: continue task to task, stop only on HALT / FATAL_FAIL / pivot / budget tripwire |
| Started | 2026-10-09 |

## Task Execution History

### T-01 — `findResultVersions` returns `updated_at` — PASS

- **Date:** 2026-10-09 · **Attempts:** 1
- **Attempt 1:**
  - **Files changed:**
    - `server/researchindicators/src/domain/entities/results/results.service.ts`: `updated_at: true` in the shared select.
    - `results.service.spec.ts`: new test asserting the exact select on both `find` calls.
  - **Red run (Implementer, against the unmodified service):** `expect(received).toEqual(expected) … - "updated_at": true` → 1 failed.
  - **Implementer verification:** results service and controller specs, 178 passed; `npx eslint` exit 0; `tsc --noEmit` exit 0.
  - **Evidence re-run (Leader, from `server/researchindicators`):** VERIFIED.
    - Same 2 suites → 178/178.
    - `npx eslint` → 0.
    - `npx tsc --noEmit -p tsconfig.json` → 0.
    - Full suite `npm test -- --silent` → 424 suites, 4097/4097.
  - **Reviewer:** PASS. The change matches S-9, D-6 and P-4/P-12. The exact `toEqual` also covers "nothing removed or renamed".
  - **Runtime events:** none.
- **Spawns:**
  - Implementer: 9 calls, 82,643 tokens, ended complete.
  - Reviewer: 7 calls, 46,064 tokens, ended complete.
- **Override (b) applied:** the change alters a response shape, so a Reviewer was owed despite `Review: checklist`.
- **Not Done / Assumptions (verbatim):** "Mocked repo proves the `select` argument only, not DB output — accepted disqualifier (P-12)." This is assumption-only, so no continuation was needed.
- **Requirements covered:** R-URP-004 / S-9, NFR-URP-002.
- **Final verification:** green.

### T-02 — Shared global alert: `infoCard`, `excludeYears` pipe, in-place swap — PASS

- **Date:** 2026-10-09 · **Attempts:** 2
- **Attempt 1:**
  - **Files changed:** all under `client/research-indicators/src/app/shared/`:
    - `interfaces/global-alert.interface.ts`
    - `pipes/exclude-years.pipe.ts` (new) and `pipes/exclude-years.pipe.spec.ts` (new)
    - `services/actions.service.ts` and `services/actions.service.spec.ts`
    - `components/global-alert/global-alert.component.{ts,html,spec.ts}`
  - **Falsifiers (Implementer), each observed red, then reverted:**
    - f1 (`closeAlert` after the swap) → g2 red: `hideGlobalAlert … Expected number of calls: 0, Received: 1`.
    - f2 (the pipe always returns a copy) → p2 and g6 red on `toBe` ("serializes to the same string"); p3 red as well.
    - f3 (append instead of replace) → a1 red: `Expected: 1, Received: 2`.
    - f4 (template without the pipe) → g3 red, with 2026 listed.
  - **Deviation:** the task predicted that f3 would also turn g2 red. It did not, because g2 uses a mock `replaceGlobalAlert` (allowed by JD-12). a1 is the gate that observed f3 red.
  - **Implementer verification:**
    - 3 suites / 117 tests passed.
    - Build green; lint clean.
    - The spec `tsc` normalized error set is the same before and after (16 errors).
  - **Evidence re-run (Leader):** VERIFIED, 117/117.
  - **Reviewer:** FAIL. Verbatim: "The `infoCard` is not drawn as a card … Violated Rule: design.md §7.1 'Renders a bordered card below the detail' … Remediation: bordered card from tokens, chip and caption in a row, keep class names." Advisories: caption `--ac-grey-600` measured about 3.1:1; dark-theme chip; duplicated timeout clearing.
- **Attempt 2** (effort raised to high; same worker, resumed by message):
  - **Files changed:** `global-alert.component.html` (the card markup) and `global-alert.component.scss` (the `.info-card` block, tokens only).
  - **Design of the fix:**
    - The caption uses `--ac-grey-800`, which measures 8.0:1 on white and 7.4:1 on `--ac-grey-100`.
    - The chip uses `--ac-white-1` on `--ac-green-500`, which measures about 4.6:1.
  - **Falsifiers:** not re-run. The logic is unchanged and only the markup and SCSS changed, so the attempt-1 reds stand.
  - **Implementer verification:** 117/117; build exit 0; lint clean; spec `tsc` error set unchanged.
  - **Evidence re-run (Leader):** VERIFIED.
    - The 3 suites → 117/117.
    - `npm run lint -- --quiet` → clean.
    - Full client suite → 342 suites, 7904/7904.
    - `npm run build` → "Application bundle generation complete".
  - **Reviewer:** PASS. The attempt-1 issue is resolved, every token exists in light and dark, and nothing regressed.
  - **ADVISORY (recorded only, no action):**
    - jsdom cannot prove the visual result, so it goes to T-04.
    - In dark theme the modal box is hard-coded `white` (a pre-existing problem in `global-alert.component.scss:20`), so the card renders as a dark block inside a white modal. This is for T-04 or the dark-theme backlog.
    - The chip contrast of 4.6:1 is barely AA. Do not lighten it.
    - g2 runs against a mock under f3; this is already recorded.
  - **Runtime events:** none.
- **Spawns:**
  - Implementer attempt 1: 17 calls, 96,043 tokens, ended partial (Not Done: the f3/g2 deviation and red-first ordering, which are assumptions only).
  - Implementer attempt 2: 4 calls, 103,252 tokens, ended partial (optional g2 with the real service skipped, an advisory-grade item).
  - Reviewer attempt 1: 12 calls, 70,910 tokens, ended fail.
  - Reviewer attempt 2: 7 calls, 54,819 tokens, ended complete.
- **Not Done / Assumptions (verbatim, attempt 2):** "Optional g2 with the real `ActionsService`: skipped … g2 stays green under f3, a1 is what catches it." There is no owed item (it was advisory-grade), so no continuation was needed.
- **Decisions:**
  - The caption token is `--ac-grey-800` (contrast, CLAUDE.md C-4).
  - No commit is made before the owner's visual approval at T-04 (memory: no-commit-before-visual-approval).
- **Requirements covered:**
  - R-URP-001: rendering of the `infoCard`.
  - R-URP-003: S-6 swap, S-6 exclusion, S-7, S-8.
  - NFR-URP-001.
  - NFR-URP-003.
- **Final verification:** green.

### T-03 — Version selector: prompt flow — PASS

- **Date:** 2026-10-09 · **Attempts:** 1
- **Attempt 1:**
  - **Files changed:**
    - `shared/interfaces/get-transform-result-code.interface.ts`: adds `updated_at?: string | null`.
    - `version-selector.component.ts`: async `updateResult` with the `updating` guard; `showPrompt`, `pickerAlert`, `showPicker` and `submitReportingCycle` (the latter moved verbatim); an `@akili-spec` tag.
    - `version-selector.component.spec.ts`: the 5 reversion tests rewritten; v1–v9 added.
  - **Falsifiers (Implementer), each observed red, then reverted:**
    - f1 → v3 red: "Expected 2026 VERSION, Received 2024 VERSION".
    - f2 → v6 red on `null`: "Received … last updated 31 Dec 1969".
    - f3 → v9 red: `years.main` expected 1 call, received 2.
    - f4 → v8 red: the `selectorExcludeValues` `toEqual` failed.
    - f5 → v2 red: "Received … most recent version of this result (2024)?".
  - **Implementer verification:**
    - Targeted specs: 159 passed.
    - Build green; lint clean.
    - Spec `tsc` normalized error set identical. Not proven able to go red (advisory).
  - **Evidence re-run (Leader):** VERIFIED.
    - Targeted specs: 159/159.
    - `npm run lint -- --quiet`: "All files pass linting."
    - Full client suite: 342 suites, 7918/7918.
    - `npm run build`: complete.
  - **Reviewer:** PASS. The diff matches T-03, §7.2 copy, D-3/4/5/8/9 and all 5 reversion tests. It uses T-02's options as designed.
  - **ADVISORY (recorded only):**
    - The v1/v7 date expectations depend on the host timezone. They are safe for timezones up to UTC+11.
    - v7 asserts only one of the four cache clears.
    - The spec `tsc` gate was not proven able to go red (K-004).
    - Whether the overlay blocks a second "Update result" click while the modal is open is unverified; check it at T-04.
    - The max-year scan is duplicated.
    - D-5 / O-1 is still open.
  - **Runtime events:** none.
- **Spawns:**
  - Implementer: 17 calls, 100,688 tokens, ended partial (assumptions only).
  - Reviewer: 13 calls, 73,204 tokens, ended complete.
- **Not Done / Assumptions (verbatim summary):**
  - The tests use `updated_at '2026-03-15T12:00:00.000Z'` and expect "15 Mar 2026".
  - v7 checks the cache clear through a spy on `cache.lastResultId.set(null)`.
  - The K-004 break-on-purpose check on the spec `tsc` gate was not run.
  - There is no owed item, so no continuation is needed.
- **Decisions:** no commit before the owner's visual approval at T-04.
- **Requirements covered:**
  - R-URP-001: S-1, S-2, S-3, S-4, S-10, S-11.
  - R-URP-002: S-5.
  - R-URP-003: S-6 (picker excludes Y; confirm path).
- **Final verification:** green.
- **Budget check (tripwire):** EXCEEDED on LOC. `git diff --stat` shows +513 / −54 (client +491/−54 across 12 files; server +22), against an expected ~380.
  - Cause: tests. The 5 rewritten tests plus v1–v9 in T-03 and g1–g7 in T-02 are most of the delta.
  - Review rounds were within budget: 4 Reviewer verdicts against 5.
  - Escalated to the owner at the T-04 stop.

### T-04 — Owner check on Dev (HITL) — PASS

- **Date:** 2026-10-09
- **Owner verdict (verbatim):** "lo veo super haz commit"
- **O-1 / D-5 (overwrite warning on "Yes"):** the owner was asked three times and did not request the warning, then approved the flow as shown. It ships without the warning, as in the mockup. Revisit only if the owner raises it.
- **Budget tripwire:** reported at this stop (+513 / −54 against ~380 LOC; the cause is tests). The owner approved the commit with it known.
- **Review:** `skip-eligible`, a human check with no code.

## REVIEW_SKIPPED: T-04

| Field | Content |
| --- | --- |
| predicate evidence | No code change. The task is the owner's visual check, and the verdict is quoted above |
| overrides checked | (a)–(g): none apply. There is no diff, no contract, no derived evidence and no rework |
| evidence re-run | The Leader re-ran the full client suite (7918/7918), the full server suite (4097/4097) and the client build before the stop |
| models | n/a (human) |

## Summary

- **Tasks closed:** all 4 PASS. T-02 needed 1 rework, for the card layout.
- **Verification:**
  - Full suites green: client 7918, server 4097.
  - Builds green.
  - Each code task observed its falsifiers red.
- **Open items carried to validation:**
  - The dark-theme modal background is hard-coded white. This predates the spec.
  - The date tests depend on the host timezone (safe up to UTC+11).
  - The spec `tsc` gate was not proven able to go red.
