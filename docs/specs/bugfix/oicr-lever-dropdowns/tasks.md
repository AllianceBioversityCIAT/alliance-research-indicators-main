# Tasks — bugfix / oicr-lever-dropdowns

- **Module:** client (shared component)
- **Spec id:** 2026-08-oicr-lever-dropdowns
- **Status:** not-started
- **Owner:** <name / squad>
- **Linked requirements:** ./requirements.md
- **Linked design:** ./design.md
- **Depth:** Lite (Bug Mode)
- **Last updated:** 2026-08-13

---

## 1. Task numbering

Single task `T-01`. The mandatory regression test (Bug Mode) is part of `T-01`.

---

## 2. Dependency graph

- `T-01` → (verification gate: full client suite)

---

## 3. Task list

### T-01 — Backport nested-path write fix + regression suite for `MultiselectComponent`

- **Requirements covered:** R-OLD-001 (AC.1–5), R-OLD-002 (AC.1–2), NFR-OLD-001
- **Design references:** DD-1, DD-2, DD-3
- **Files touched (intended):**
  - `client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.ts` — add `private writeAtPath(current, path, value)`; route `clear()` and `setValue()` writes through it.
  - `client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.html` — change line 1 read to `@let list = this.selectedOptions();`.
  - `client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.spec.ts` — append the `describe('Nested signal path write-through (bugfix regression)')` block with R-MNP-001…R-MNP-005.
- **Description:** Cherry-pick the `dev` multiselect hunks (and only those). The fix restores read/write symmetry: the read side already uses `getNestedProperty` via the existing `selectedOptions` computed; the write side gains an immutable spine-clone `writeAtPath`. Do **not** pull adjacent `dev`-only divergence (api.service, dashboard, document-overview) — cherry-pick by file path and review the diff.
- **Implementation notes:**
  - `writeAtPath` returns a new root reference at every level (immutability for signals); single-segment path is the flat case (`rest.length === 0`).
  - Missing/null intermediate segment → create `{}` (mirror `setNestedPropertyWithReduce`'s `acc[key] ??= {}`), never mutate in place.
  - Do not change `create-oicr-form.component.html` dotted `signalOptionValue` — the contract is correct per DD-3.
- **Tests (Bug Mode — regression, red before / green after):**
  - Run `npm test -- --silent -t "Nested signal path write-through"` on current (un-fixed) `main`: R-MNP-001 AC.1, R-MNP-003, R-MNP-005 SHALL fail (red) proving the test can see the bug — e.g. R-MNP-001 asserts no top-level key contains `.`, which `main`'s flat write violates.
  - After the fix: R-MNP-001…005 SHALL pass (green).
- **Verification:**
  - `npm test -- --silent -t "Nested signal path write-through"` — green.
  - `npm test -- --silent` — **full** client suite green (KZ-003 blast-radius check; shared component renders on many routes).
  - `npm run lint -- --quiet` — clean (note: this script carries `--fix` and mutates files; re-check `git status` after).
  - HITL visual check: in a running Create OICR modal step 2, selecting a lever renders chips/state and persists — jsdom cannot measure rendering, so this is the substitute gate for the visual defect class (requirements §5).
- **Disqualifiers (no-pass clause):** the suite is not evidence if the targeted regression run did not first show red on un-fixed `main` — if you never observed the failure, the test cannot prove the fix. The full-suite run is not evidence if it reports green but excluded any `<app-multiselect>`-consuming spec or any `create-oicr-form` effect spec — exclusion collapses the blast-radius check into a non-check. Report an inconclusive result instead of a pass.
- **Input that would make the check fail:** an implementation that normalizes both sides before comparing so the dotted-key creation is hidden; or a `writeAtPath` that mutates the previous root in place (raises a non-prevent in Angular signals or silently zeroes out sibling keys) — caught by R-MNP-001/003 + the new-root-reference assertion in R-MNP-004.
- **Done:**
  - [ ] Regression run red on un-fixed `main`, green after the fix.
  - [ ] Full client suite green; `create-oicr-form` effect specs unchanged-green.
  - [ ] Lint clean.
  - [ ] HITL visual check of the Create OICR modal step 2 passed.
- **Dependencies:** none
- **Estimated effort:** S
- **Skills:** `angular-developer`, `systematic-debugging`
- **Status:** implemented (unverified — see Execution Note)
- **Execution Note (accepted-risk waiver, user mandate 2026-08-13):** the environment had **no `node_modules`** (client/server/root) during execution, so the mandatory Bug-Mode **red-before** observation and the full-suite **green-after** gate could not be run. Per explicit user mandate ("Apply fix blind, you verify later"), the fix was applied **without observing red first**. This incurs the exact risk Bug Mode's red clause exists to prevent: a regression test that does not actually fail on the broken code provides no evidence the fix is what makes it pass. The user accepts this gap; verification is deferred to a session with the stack installed. The waiver is **routine-progress-only** — it does not extend to the still-open HITL visual gate, which remains mandatory.

---

## Verification to run (deferred — user-owned)

In a session with `client/research-indicators/node_modules` installed, in order, capturing **verbatim output as evidence**:

1. **RED (proves the test sees the bug):** on the un-fixed `main` commit (git stash the fix, keep the spec), run
   `npx jest --config jest.config.ts src/app/shared/components/custom-fields/multiselect/multiselect.component.spec.ts -t "Nested signal path write-through"` — expect R-MNP-001 AC.1, R-MNP-003, R-MNP-005, R-MNP-006 to FAIL. If they pass on un-fixed code, the regression suite is not evidence — stop and report.
2. **GREEN (proves the fix):** restore the fix, re-run the same command — expect all R-MNP-001…006 to PASS.
3. **Blast radius (KZ-003, shared component on many routes):** `npm test -- --silent` — full client suite green; spot-check `create-oicr-form.component.spec.ts` effect specs unchanged-green.
4. **Lint:** `npm run lint -- --quiet` (⚠️ carries `--fix` → mutates files; re-check `git status` after and discard unintended auto-fixes outside `multiselect/`).
5. **HITL visual gate (mandatory — no automated substitute):** in a running Create OICR modal step 2, selecting a Primary Lever and a Contributing Lever renders chips/state, persists into the body, and cross-excludes between the two dropdowns. This is the substitute gate for the visual defect class — jsdom cannot measure rendering.

---

## 5. Execution conventions

- PR from branch `bug-fix-oicr-form` targeted per repo flow; single PR (estimate ≪ 400 LOC).
- PR title: `fix(multiselect): write dotted signalOptionValue as nested path so OICR lever selections persist`.

---

## 8. Done definition

- [ ] T-01 done.
- [ ] R-OLD-001 / R-OLD-002 / NFR-OLD-001 ACs all checked.
- [ ] Bounded to root cause — no unrelated cleanup folded in (Bug Mode scope rule).
- [ ] HITL visual gap (requirements §5) passed.