# Execution log — bugfix / multiselect-nested-signal-path

## Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `bugfix/multiselect-nested-signal-path` |
| **Spec id** | 2026-08-multiselect-nested-signal-path |
| **Package** | client — `client/research-indicators` |
| **Module** | `shared/components/custom-fields/multiselect` |
| **Depth** | Lite + Bug Mode |
| **Approval Mode** | `gated` — the continue/pause gate stops for the user after every task |
| **Branch** | `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator` |
| **Budget (design.md §10)** | 5 tasks / ~110 LOC (~20 production, ~90 test) / 1 review round |
| **Leader model** | `opus` (T1) |
| **Implementer model** | `sonnet` (T2) — via `.claude/agents/akili-implementer.md` |
| **Reviewer model** | `opus` (T3) — via `.claude/agents/akili-reviewer.md`; author ≠ auditor holds on both model and tool axes |
| **Started** | 2026-08-03 |
| **Last updated** | 2026-08-03 |

### Pre-flight notes

- No environment/stack pre-check required for T-01…T-03: they are Jest unit-layer work with no database, server, or live socket dependency. T-05's manual browser scripts do need a running client (`npm start`, port 4200) and are gated on the user, per `docs/infrastructure.md` → `## Local Environment`.
- Working tree at start: clean apart from this untracked spec folder.
- `docs/specs/kaizen-log.md` Active Lessons relevant to this spec — KZ-001 (double fidelity), KZ-003 (full-suite blast radius), KZ-004 (falsifiability clauses must be real), KZ-006 (measure in a real browser with a control) — are passed into the worker briefs as copied rows.

---

## Task Execution History

<!-- entries appended below, newest last -->

### T-01 — Regression test for nested paths (must be RED)

- **Status:** **PASS** on attempt 2 (2 Implementer attempts, 2 Reviewer rounds)
- **Date:** 2026-08-03
- **Requirements covered:** R-MNP-001, R-MNP-002, R-MNP-003, R-MNP-004, R-MNP-005, NFR-MNP-001
- **Skills assigned:** `angular-developer`, `tdd` — matches the task's list, no deviation
- **Effort:** attempt 1 `high` (above the T2 `medium` default: the task carries two documented false-green traps and one TestBed setup trap), attempt 2 `xhigh` (rework rule)
- **Inverted verification contract:** RED is this task's success condition — production code is not fixed until T-02. Both attempts were briefed that a green run is a failed task.

#### Attempt 1 — Reviewer FAIL

- **Files changed:** `client/research-indicators/src/app/shared/components/custom-fields/multiselect/multiselect.component.spec.ts` — append-only, 110 lines, one new `describe` block named `Nested signal path write-through (bugfix regression)`. No existing case modified.
- **Verification:** `cd client/research-indicators && npx jest --coverage=false -t "Nested signal path write-through"` → **RED, 4 failed / 3 passed**, all real assertion diffs, no `"Cannot configure the test module…"` setup error.

  | Case | Requirement | Decisive line |
  | --- | --- | --- |
  | 1 | R-MNP-001 AC.1 | `Object.keys(...).some(...)).toBe(false)` → `Expected: false / Received: true` |
  | 2 | R-MNP-001 AC.2 | `selectedOptions().length).toBe(2)` → `Expected: 2 / Received: 0` |
  | 4 | R-MNP-002 AC.1 | `body().value).toEqual([1, 2])` → `Expected: [1, 2] / Received: null` (after `TestBed.flushEffects()`) |
  | 5 | R-MNP-003 | `group.trainee_organization_representative).toEqual([])` → `Expected: Array [] / Received: Array [{id:1},{id:2}]` |

- **Implementer `Not Done / Assumptions` (verbatim):** *"Case 3 (R-MNP-001 AC.3) is green today for a reason not pre-listed in the brief's 'may legitimately pass' set (which named only 6 and 7). I judged this a legitimate green rather than a flawed test — the assertion is exactly what the requirement's scenario specifies (sibling survives), and it is mock-independent; it simply happens that this particular sub-claim isn't yet under threat from the bug. I did not alter it to force a red, since doing so would mean asserting something the requirement doesn't ask for."*

- **Reviewer verdict: `STATUS: FAIL`** — one issue.

  **Discovered Issue.** Case 7 asserts only `not.toThrow()` for both halves while claiming coverage of R-MNP-005 AC.1/2. It never asserts the write landed. Three different helpers pass it: one that creates `group` and writes the leaf (correct), one that detects a missing/`null` segment and silently bails, and one that creates `group` but writes the leaf to the wrong key. It is the block's only case that is green today **and** cannot go red against any non-throwing fix — the one true "cannot fail" case, and the only unguarded home of invariant I-3.

  **Violated Rule.** `requirements.md` §4 R-MNP-005 — the scenario requires the intermediate segment be *created* as a plain object *and the leaf hold the item*; AC.1 is "write **succeeds**, no throw", AC.2 is "treated as absent and **created**, no throw". Also `design.md` §7.1 invariant **I-3**, named as a T-01 design reference. R-MNP-005's own stated purpose — that two spec-conformant helpers could otherwise differ invisibly to every listed gate — is defeated by a no-throw-only assertion. Secondarily `requirements.md` §6 D-4.

  **Remediation.** Add a leaf assertion after each `not.toThrow()`, via direct object access rather than `selectedOptions()` (the case reassigns `realComponent.signal` mid-test and a computed does not reliably re-track a reassigned non-signal property). Assert `.length`, not item shape.

- **Reviewer PASS findings on the rest of the diff** (recorded so attempt 2 does not re-litigate them):
  - Real `UtilsService` genuinely in play. The bare class token is supplied at `:1558`; `UtilsService` is `providedIn: 'root'` with zero constructor deps. `mockUtilsService` is bound only in the outer `beforeEach` (`:63`) and is discarded by `resetTestingModule()` at `:1550`. **Proof beyond the provider list:** case 6's flat-path `selectedOptions().length === 2` is *impossible* under the mock, which returns `[]` unconditionally. NFR-MNP-001 / DD-3 / D-4 satisfied.
  - Setup mechanics per the DD-3 table: reset in both hooks (`:1550`, `:1568`), all five doubles re-supplied, shape matches the SSR precedent at `:1512-1531`. No missing double that would later surface as a flake — `ngOnInit` is never called, so `optionsSig` stays `signal([])`, which is what makes `setValue`'s `merged[attr] ??= id` produce the `{id: 1}` items `syncBodyWithSignal` maps.
  - R-MNP-002 AC.1 flush placement correct and genuinely red today: the buggy write leaves the nested path `[]`, so `syncBodyWithSignal`'s else-branch (`multiselect.component.ts:242-247`) nulls a non-null `body`. Judgment Day S-4 satisfied.
  - Scope clean: one file, append-only, no production file touched, nothing folded in.

- **Leader adjudication of the case-3 question.** Upheld with the Reviewer: a green case 3 is not a D-4 defect. Case 3 discriminates against any fix that violates invariant I-4 by replacing `group` wholesale instead of cloning it — a plausible mistake. It is green today only because the bug never reaches `current.group`. `tasks.md` T-01 sets the RED requirement at **block** level, not per case, and the case table prescribes this exact assertion. Forward-looking guards that can fail against a wrong fix belong in the block. The Implementer surfacing it in `Not Done / Assumptions` rather than silently folding it into "cases 6 and 7" was the correct call. Case 7 is the opposite shape — green today and unable to fail against anything — which is what makes the FAIL correct and the case-3 green acceptable.

- **`ADVISORY` (4R lens findings — advisory only, no rework, no new tasks):**
  1. *Reliability.* R-MNP-004 AC.4 / invariant I-1 ("exactly `{ ...current, [key]: value }`") is operationalized in case 6 only as a top-level key-set check. That catches a spurious added key but not a changed leaf identity or shape. The real gate for AC.4 stays the pre-existing flat assertions at `multiselect.component.spec.ts:427-431` and `:508`, which run only under T-05's full suite. Acceptable — but case 6 should not be read as fully pinning I-1. Minor: `.sort()` on a one-element key array is a no-op.
  2. *Reliability.* Invariant I-2 (`setValue` must **reassign** `nextState` from the helper, else the `queueMicrotask` at `multiselect.component.ts:405` emits `undefined` to every `(selectEvent)` subscriber) has no assertion in this block and no entry in T-01's case table — correctly outside T-01's scope, but it also has no automated gate in T-02's done criteria. A `selectEvent` spy assertion would close it cheaply. **Leader note:** recorded as advisory and deliberately **not** minted into a new task (advisories never grow an approved spec). I-2 remains covered by T-02's `git diff` done-criterion and by T-05's full suite; if the user wants it gated automatically, that is a spec reopening, not an in-flight widening.
  3. *Risk / budget.* `design.md` §10 allocates ~110 LOC total (~20 production, ~90 test). T-01 alone adds 110 test lines, so with T-02's ~20 production lines the spec lands ~20% over. Flagged to the Leader as the §10 tripwire — see the Budget note below.
  4. *Readability.* The file's outer `beforeEach` still builds the mocked TestBed and injects a throwaway `component` before every case in this block, since Jest runs outer hooks first. Wasted work only, and it matches the SSR precedent. No change requested.

- **Budget tripwire (design.md §10) — Leader assessment.** Test LOC came in at 110 against ~90 allocated; projected spec total ~130 against ~110. The overrun is entirely in the **verification surface**, which is the same axis §10 itself says grew during Judgment Day, and the production allocation (~20 LOC) is untouched. The attempt-2 remediation adds 2 lines. Not treated as a stop-and-escalate event mid-loop; surfaced to the user at the task's approval gate so the overrun is an explicit decision rather than a drift.

#### Attempt 2 — Reviewer PASS

- **Files changed:** same single file. Case 7 only; two assertions added. Diff went 110 → **112 insertions**, confirmed by `git diff --stat` as still a pure append with no other case altered.
- **Change (verbatim):** after each of case 7's two `not.toThrow()` calls, added
  `expect(realComponent.signal().group.trainee_organization_representative.length).toBe(1);`
  No TypeScript cast was needed — `@Input() signal: WritableSignal<any>` (`multiselect.component.ts:67`) types the leaf access as `any`, so it compiles under `strict` + `noPropertyAccessFromIndexSignature`.
- **Verification:** `npx jest --coverage=false -t "Nested signal path write-through"` from `client/research-indicators` → **RED, 5 failed / 2 passed** (up from 4 / 3).

  ```
  ✕ R-MNP-001 AC.1
  ✕ R-MNP-001 AC.2
  ✓ R-MNP-001 AC.3
  ✕ R-MNP-002 AC.1
  ✕ R-MNP-003
  ✓ R-MNP-004 AC.1/2/4
  ✕ R-MNP-005 AC.1/2   ← case 7, now red
  ```

  Case 7's decisive line:
  ```
  ● MultiselectComponent › Nested signal path write-through (bugfix regression) › R-MNP-005 AC.1/2 — missing or null intermediate segment does not throw

    TypeError: Cannot read properties of undefined (reading 'trainee_organization_representative')

      1650 |       expect(realComponent.signal().group.trainee_organization_representative.length).toBe(1);
  ```

- **Implementer `Not Done / Assumptions`:** none.

- **Reviewer verdict: `STATUS: PASS`.** Summary (verbatim): *"The two added assertions close invariant I-3 — case 7 can now fail against a non-throwing fix that declines to create the segment or populate the leaf — and the block is legitimately red (5 failed / 2 passed) with real assertion diffs in four cases, the real UtilsService, and correct DD-3 reset mechanics. The case-7 TypeError arises inside the assertion on state the SUT just wrote, not from TestBed setup, and both halves go green under a conformant clone-then-assign helper, so T-02 is unblocked."*

  Substantive findings behind the PASS:
  - **The remediation is load-bearing.** Three distinct non-conformant-but-non-throwing helpers now fail case 7: one that bails on a missing segment (`if (!acc[key]) return current;`), one that creates `group` but writes the leaf under a dotted name, and one that creates the segment with an empty array. R-MNP-005's fourth clause ("must NOT overwrite an existing non-empty object") is guarded separately by case 3 via I-4, so the requirement is covered in aggregate.
  - **The `TypeError` is legitimate red, not barred evidence.** T-01's barred-evidence clause names exactly one thing — a `"Cannot configure the test module…"` setup error — and its stated purpose (DD-3 / Judgment Day C-4) is *distinguishability*. This `TypeError` is raised inside the assertion expression, after the SUT ran, on the precise state `setValue` should have written, and it pins the line: it **is** the defect's signature. Setup soundness is independently proven inside the same block, since cases 3 and 6 pass — impossible if `configureTestingModule` had thrown, and case 6 in particular is impossible if the `UtilsService` mock had leaked. Four conventional assertion diffs also appear at block level.
  - **Case 7 goes green under a conformant T-02 helper** — traced for both halves against I-3 and `setNestedPropertyWithReduce`'s `acc[key] ??= {}` convention (`utils.service.ts:31-38`). `{}` → segment created as `{}`, leaf `[{id:1}]`; `{ group: null }` → `null` is nullish so the segment is created either way (`{...null} === {}`). `prevItems` resolves to `[]` without throwing because `getNestedProperty` uses `acc?.[key]`. **T-02 is not blocked.**
  - `.length === 1` is exact, not incidental: the block never sets `serviceName` or calls `ngOnInit`, so `optionsSig` stays empty, `findOptionForItem` returns `undefined`, and `merged[attr] ??= id` supplies `{ id: 1 }`.
  - Prior Reviewer's PASS on the real `UtilsService`, DD-3 setup mechanics, case-4 flush placement, cases 1–6, and scope: independently **confirmed**, not merely inherited. Client conventions clean (signals only, no NgRx, no hex literals, co-located spec). Test-only additions cannot regress the coverage floors.

- **`ADVISORY` (attempt 2 — advisory only; recorded, never gating, never minted into a task):**
  1. *Readability.* Case 7 bundles R-MNP-005 AC.1 and AC.2 in one `it`, so the first failure short-circuits the second and **AC.2's null-segment red is never observed today**. The Reviewer traced the null half and confirmed it is red *in principle* (on current code `{ group: null }` leaves `signal().group` at `null`, so the same access throws), and post-fix it executes as a live perpetual guard. Splitting into two `it`s would give each AC independent, independently diagnostic red evidence.
  2. *Reliability.* `expect(signal().group.trainee_organization_representative.length).toBe(1)` throws rather than diffing. `expect(signal().group?.trainee_organization_representative).toHaveLength(1)` asserts the same thing and fails with an assertion diff, matching the done criterion's wording rather than only its intent.
  3. *Risk.* **Invariant I-2 has no guard anywhere in this block** — a T-02 helper invoked as `this.signal.update(c => this.write(c, …))` without reassigning the local `nextState` leaves the signal correct while the `queueMicrotask` at `multiselect.component.ts:405` emits `undefined` to every `(selectEvent)` subscriber. Every case in this block would still pass.
  4. *Risk.* Budget: 112 test LOC against §10's ~90; T-02's ~20 production lines put the spec over the stated ~110 total. Leader's call under §10, not an Implementer defect.

- **Leader disposition of advisory 3 (I-2).** Recorded, **not** converted into a task or a widening of T-01 — advisories never grow an approved spec. No new coverage is being added for it. I-2 is already inside T-02's approved scope: `tasks.md` T-02 lists it in its invariants table and `design.md` §7.1 states it. It will therefore be enforced through T-02's Implementer brief and the T-02 Reviewer's conformance audit, plus T-02's own `git diff` done-criterion and T-05's full suite. If the user wants I-2 pinned by an automated assertion, that is a spec reopening — surfaced at the approval gate rather than decided here.
- **Leader disposition of advisories 1, 2, 4.** No action. Advisories 1 and 2 are diagnostic-quality improvements to a case that already satisfies its gate; reopening a PASSed task for them would spend the budgeted review round on polish. Advisory 4 is handled in the Budget tripwire note above.

- **Final verification (T-01 done criteria):**
  - [x] The block runs against the **real** `UtilsService` — bare class token at `:1558`, no `UtilsService` mock inside the block; behaviorally corroborated by case 6, which is impossible under the mock
  - [x] `npx jest --coverage=false -t "Nested signal path write-through"` is **RED** on unmodified production code — 5 failed / 2 passed
  - [x] Case 4 asserts **after** `TestBed.flushEffects()`, and the Reviewer traced that the flush is what makes it falsifiable
  - [x] Failure output shows real assertion diffs (cases 1, 2, 4, 5), **not** a TestBed setup error; case 7's `TypeError` originates inside the assertion, adjudicated as legitimate
  - [ ] Manual mutation-kill (revert the single `setValue` write line, confirm red, restore) — **deferred to T-02 by design**: it can only run once the fix has turned the block green. Carried forward as an explicit T-02 obligation.
- **Requirements covered by this task:** R-MNP-001 (AC.1/2/3), R-MNP-002 (AC.1), R-MNP-003, R-MNP-004 (AC.1/2/4), R-MNP-005 (AC.1/2), NFR-MNP-001.
- **Issues encountered:** one Reviewer FAIL (case 7 unfalsifiable), fixed in a 2-line remediation. No spec ambiguity, no pivot, no environment blocker.
- **Commit:** `[SPEC:bugfix/multiselect-nested-signal-path] test(multiselect): nested-path regression block, real UtilsService (RED)`
