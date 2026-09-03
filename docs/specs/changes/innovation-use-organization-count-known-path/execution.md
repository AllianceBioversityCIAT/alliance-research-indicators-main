# Execution Log — Changes / Organization count belongs to the unknown-organization path only

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/innovation-use-organization-count-known-path` |
| Spec id | 2026-09-innovation-use-organization-count-known-path |
| Depth | **Lite** |
| Approval Mode | **gated** — every task gate pauses for the user |
| Budget (tripwire) | 3 tasks · ~90 LOC · 1 review round (`design.md` §11) |
| Leader | Claude Opus 5 (T1), this session |
| Implementer | `akili-implementer` wrapper (T2) |
| Reviewer | `akili-reviewer` wrapper (T3, read-only) — `author ≠ auditor` enforced by wrapper model binding |
| Run started | 2026-09-03 |

### Preconditions

| # | Gate | State |
| --- | --- | --- |
| **OQ-1** | Live row count for `is_organization_known = 1 AND organization_count IS NOT NULL AND is_active = 1`. | ✅ **RESOLVED 2026-09-03 by user decision — gate lifted, T-02 unblocked.** See the `OQ-1 resolution` block below. |

### OQ-1 resolution

**RESOLVED 2026-09-03 by the user — no query needed, and the gate is lifted.** Innovation Use is still in development; the `organization_count` values captured so far are **not consumed by anything**, and any rows a filter would return are **test data that can be deleted**. `R-1` therefore collapses: nulling them costs nothing real, no MEL comms are owed, and no backfill is needed.

Two scope facts confirmed at source while closing this, both reinforcing the decision:
- **The change cannot reach Innovation Dev.** `ResultInstitutionTypesService.resolveOrganizationCount` returns `{}` for any role other than `INNOVATION_USE`, so `organization_count` is **never set on a Dev row at all** — the server was built defensively for exactly this. The user flagged the Innovation-Use-only scope explicitly; it holds structurally, not by convention.
- The proposed `OQ-1` query never filtered by `institution_type_role_id`, yet was already Innovation-Use-scoped **by construction** (a non-null `organization_count` can only be a Use row) — correct by accident rather than by design. Recorded so a future reader does not copy the unfiltered shape onto a column where it would not hold.

---

## 2. Task Execution History

<!-- Entries appended below, one per task, newest last. -->

### T-01 — Render the count field only on the unknown path

| Field | Value |
| --- | --- |
| **Status** | **PASS** |
| Date | 2026-09-03 |
| Requirements covered | `R-IUC-001` (Sc.1–Sc.3, AC.1–AC.4) |
| Defect classes owned | `D-1`, `D-2`, `D-5`, `D-11` |
| Implementer attempts | **1** (PASS on first attempt) |
| Reviewer verdict | **PASS** + `ADVISORY` block |
| Effort | medium |
| Skills assigned | `angular-developer`, `ui-ux-pro-max` |

#### Attempt 1 — Implementer

**Files changed (2):**
- `client/…/innovation-use-organization-item/innovation-use-organization-item.component.html` — the `organization_count` `app-input` block (with its `rs-mt-[12]` wrapper) **moved** into the end of the `@else` branch, after the `Specify other` conditional. No second negated `@if` (`DD-3`). Branch condition unchanged (`DD-1`). `showNotIdentifiedMessage` outlet left outside both branches.
- `…/innovation-use-organization-item.component.spec.ts` — both Lens B "Fix 3" guards reworked, never deleted (`DD-4`): the `:183` pinning assertion inverted to assert absence; `c8`'s known-path case changed to `expect(inputs.length).toBe(0)`, its now-vacuous `forEach` removed and its title corrected to stop naming `count`. `c8`'s unknown-path sibling untouched. Two tests added — AC.3 (`is_organization_known: true` with `institution_id` unset) and the `D-5` live-toggle transition.

**Verification — K-004 red observed BEFORE the green.** Template reverted with a narrow `git stash push -- <html>`; four tests reddened, verbatim:

```
  ✕ known path renders the organization select and no unknown-path controls (67 ms)
  ✕ known path with institution_id still unset also hides the count field (60 ms)
  ✕ toggling "Is the organization known?" on a rendered fixture hides then restores the count field (67 ms)
  ✕ known path: hides remove, disables checkbox, organization select and the request-partner button (24 ms)

  ● known path renders the organization select and no unknown-path controls
    expect(received).toBeFalsy()
    Received: {"MAX_SAFE_INTEGER": 18, ... "label": "Organization count", ...}

  ● c8 … known path: …
    expect(received).toBe(expected) // Object.is equality
    Expected: 0
    Received: 1

Test Suites: 1 failed, 1 total
Tests:       4 failed, 23 passed, 27 total
```

Fix restored, then green:

```
npx jest --testPathPattern innovation-use --coverage=false
Test Suites: 6 passed, 6 total
Tests:       239 passed, 239 total
Time:        3.962 s
```

```
npx eslint <two touched paths>  → EXIT 0 (0 errors; 1 warning: spec.ts "File ignored because no matching configuration was supplied")
```

**Reviewer verdict — PASS.** Confirmed at the source, not from the report: the `@else` opens at line 79 and closes at line 165 with the count wrapper at 154–164, and **no** second negated `@if` exists in the file; the only `institution_id` condition (line 76) gates the partner preview and predates this spec; `onKnownToggle`, `body` and `identitySatisfied` are absent from the diff and still carry their invariants. Positive finding worth keeping: on the unknown path the rendered node order is **byte-identical** to before (controls → count wrapper → message), so `design.md` §5.1's "vertical rhythm unchanged" claim is structurally true rather than merely asserted.

Reviewer's ruling on the `KZ-015` question the Leader raised explicitly: calling `component.onKnownToggle(true)` **does** satisfy KZ-015 and **does** own `D-5` — KZ-015's failure mode is arranging the end state before the first `detectChanges()`, and this test renders on the unknown path, asserts presence, and only then changes state; `onKnownToggle` is what the template's `(onChange)` actually calls, so the transition under test is the real one.

#### Decisions made

| # | Decision | By |
| --- | --- | --- |
| E-1 | The `c8` `forEach` removal drops the file's only coverage of the count field's `[disabled]` binding. Accepted: `tasks.md` T-01 ordered **both** halves (remove the no-op; do not touch the unknown-path sibling). Spec-authored consequence, not implementer drift. | Reviewer, Leader concurring |
| E-2 | The checkbox-binding gap (below) is `ADVISORY`, not `FAIL` — it is pre-existing template code outside T-01's change surface, and no defect this diff could introduce is hidden by it. Failing it would manufacture rework for a gap the diff did not create. | Reviewer, Leader concurring |

#### `ADVISORY` findings (recorded; never gate, never become tasks)

| Lens | Finding |
| --- | --- |
| **Reliability** | The transition test does not traverse the `(onChange)="onKnownToggle($event.checked)"` binding — and **no spec in the entire client package** drives a PrimeNG checkbox through its rendered element (no `triggerEventHandler('onChange', …)`, no click, no dispatched change event anywhere under `client/research-indicators/src`). Deleting the binding would leave the suite green. One line would close it: `fixture.debugElement.query(By.directive(Checkbox)).triggerEventHandler('onChange', { checked: true })`. **Reachability constructed by inspection, NOT executed** — the Reviewer is read-only. Out of scope for this spec; if it is to be fixed, it earns its own proposal. |
| **Readability** | The `c8` known-path title now under-describes the body — it asserts count *absence* but names only disabled controls. |
| **Readability** | The new AC.3 test duplicates c1's arrangement (`institution_id` already defaults to `undefined`); `c8`'s `institution_id: 501` case carries the genuinely discriminating half. |
| **Risk / KZ-017** | The Implementer's declared scope limits named the eslint and jsdom-layout gaps but **omitted** the checkbox-binding gap above. Recorded here so the next reader does not over-read the green. |

#### Scope limits of this task's verification (KZ-017)

- `npx eslint` does not lint `*.spec.ts` in this repo (pre-existing flat-config gap) — the spec edits rest on jest alone.
- jsdom cannot evaluate layout: this task proves **tree membership only**, not the card's visual rhythm. That is `D-7`, owned by T-03's human browser check.
- The full client suite, `npm run build`, and the no-server-diff check were **not** run here — T-02/T-03 scope by design.
- Per the ADVISORY above: the green does not cover the checkbox → handler edge.

#### Budget

1 of 3 tasks · 2 files · +47/−19 · 1 review round. Within `design.md` §11. No tripwire.

---

### T-02 — Emit no organization count for a known-path row

| Field | Value |
| --- | --- |
| **Status** | **PASS** |
| Date | 2026-09-03 |
| Requirements covered | `R-IUC-002` Sc.1–Sc.2, `AC.1`–`AC.3` (`AC.4` → T-03) |
| Defect classes owned | `D-3`, `D-4`, `D-10` |
| Implementer attempts | **1** (PASS on first attempt) |
| Reviewer verdict | **PASS** + `ADVISORY` |
| Effort | medium |
| Skills assigned | `angular-developer` |

#### Attempt 1 — Implementer

**Production: two lines, both in `innovation-use-details.component.ts`.**

```diff
-  organization_count?: number;                                  // :92  (DD-6)
+  organization_count?: number | null;
-      organization_count: row.organization_count,               // :526 (DD-2)
+      organization_count: known ? null : row.organization_count,
```

**Tests:** one assertion added inside the existing `T-08 buildPayload() — Issue 1 fix` block (its four original assertions and its pre-`BEGIN` 400 comment left intact), plus a new `T-02 buildPayload() — R-IUC-002` describe with three cases — known path with a real `institution_id`, unknown path verbatim, and the mixed single-build case (`AC.3`).

**Verification — baseline first, then both mandated reds, then green.**

Baseline `npm run build` on untouched HEAD: `EXIT:0`, 0 `ERROR` lines. *(The disqualifier check: without it, a pre-existing red could have been misread as this task's red.)*

**Red (i) — `D-10`,** ternary applied without the `DD-6` widening. The compiler named **both** lines at once:

```
✘ [ERROR] TS2322: Type 'number | null | undefined' is not assignable to type 'number | undefined'.
    innovation-use-details.component.ts:526:6
      526 │       organization_count: known ? null : row.organization_count,
  The expected type comes from property 'organization_count' which is declared here
    innovation-use-details.component.ts:92:2
      92 │   organization_count?: number;
```
`npm run build` exit 1. This is the reversion challenge's finding 1 reproduced as an executed failure rather than an argument.

**Red (ii) — `D-3`,** widening kept, ternary reverted. Exactly **3** of the 4 new assertions reddened (`Received: 12` where `null` was expected); the unknown-path case correctly stayed green, since reverting the ternary does not change that branch's output — the gate discriminates rather than failing uniformly:
```
Test Suites: 1 failed, 5 passed, 6 total
Tests:       3 failed, 239 passed, 242 total
```

**Final green:** `npm run build` `EXIT:0` / 0 ERROR · `npx jest --testPathPattern innovation-use` 6 suites / **242 passed** · `npx eslint` 0 errors on the `.ts`, 0 errors + the documented "File ignored" warning on the `.spec.ts`.

#### Leader-run addendum — `D-4` red, closing the ADVISORY

The Reviewer noted `D-4` had a named falsifying input in `requirements.md` §6 but had never been **run** red — not a spec violation (§6's *"must be observed red"* binds `D-1` and `D-3` only), but an unproven gate. The Leader closed it inline after the Reviewer reported, with no worker active:

```
organization_count: known ? row.organization_count : null,   # condition inverted

● … › sends an unknown-path row's organization_count verbatim, with institution_id null
    Expected: 12
    Received: null

Tests:       4 failed, 238 passed, 242 total
```

The failure is the **discriminating** one — `Expected: 12 / Received: null` on the unknown-path case, not collateral noise. Restored and re-run: `242 passed, 242 total`. All three of `D-3`, `D-4`, `D-10` now have an observed red.

**Reviewer verdict — PASS.** Verified at source, not from the report:
- `DD-6`'s widening is one character class, matching the four siblings at `:87–90` exactly. **Blast radius zero:** `InnovationUseOrganizationPayload` is module-local (not exported); repo-wide grep returns 5 hits, all in this file; `InnovationUsePayload` has no importer and is consumed only at `:585` by `PATCH_InnovationUseDetails`. Nothing in the client reads `.organization_count` off a payload object except the new tests. No consumer must now handle a `null` it could not previously receive.
- The untouchables are provably untouched: `organizationIdentitySatisfied` (`:516–518`) is byte-for-byte the OR predicate and never references the count; the row filter at `:471` is unchanged; `onKnownToggle` lives in a file this diff does not open.
- `DD-2`'s evidentiary anchor survives: the restore test still asserts `body().organization_count === 7`, unmodified. **Its line number moved `:436` → `:464` because T-01 edited that file above it** — the body is untouched; the design's line citation is simply stale.
- `buildPayload()` is the real production path (`saveData()` `:585`), not a test-only helper, so the `KZ-001` assertions land on generated output.

#### Decisions made

| # | Decision | By |
| --- | --- | --- |
| E-3 | The added assertion does **not** contradict the `T-08` block's pre-`BEGIN` 400 comment. The comment reasons about what is *stored* after the server rejects the request; the assertion is about what is *sent*. The comment's claim that row 55 keeps its original `organization_count` stays true precisely because the write never happens. | Reviewer, Leader concurring |
| E-4 | `undefined`-on-the-unknown-path (a never-filled count) is **not** a defect and not a change. The unknown branch is byte-identical to before the edit, so nothing on that path is introduced or newly reachable. Traced end to end: `JSON.stringify` drops the key → `@IsOptional()` skips it → `setNull(isEmpty(x) ? null : x)` writes `NULL` for `null` and `undefined` alike, while `isEmpty(0) === false` keeps a real `0`. The residual `null`/`undefined` inconsistency is the file's established pattern (the `T-08` block already pins `institution_id` as `toBeUndefined()` on its owning branch), not a deviation from it. | Reviewer, Leader concurring |
| E-5 | Sc.1's `AND IT MUST leave row inclusion unchanged` and `AC.4` are **deferred to T-03**, per `tasks.md` §4's coverage table. Incidentally exercised here (the `T-08` block's `length === 1` shares an `it()` with the new assertion), but T-03 is the formal owner. | Leader |

#### `ADVISORY` findings (recorded; never gate, never become tasks)

| Lens | Finding |
| --- | --- |
| **Reliability** | `D-4` was mandated-but-unobserved. **Closed by the Leader addendum above** — this advisory is resolved, not carried. |
| **Readability** | The mixed-payload test destructures `const [known, unknown] = …organizations` without first asserting `length === 2`. It still reddens if a row is dropped, but as a `TypeError` rather than a legible diff. `AC.4` is T-03's regardless. |

#### Scope limits of this task's verification (KZ-017)

- The build **type-checks**; it does not prove the emitted JSON reaches the server correctly. No E2E or integration test here exercises a real request — `NFR-IUC-001` rests on the design analysis in `design.md` §6.1, not on a run.
- `npx eslint` does not lint `*.spec.ts` — the test edits rest on jest alone.
- **The Reviewer had no shell** (read-only tools) and could not re-execute the build, jest, or `git diff`. It could not confirm the shown diff was the *complete* uncommitted diff; it verified instead that every symbol the spec forbids touching is currently in its documented pre-change form. Recorded rather than glossed.
- The full client suite, the no-server-diff check, and the human visual check are T-03's.

#### Budget

2 of 3 tasks · cumulative 4 files · +102/−21 · 1 review round each, 0 rework. Within `design.md` §11 (~90 LOC expected). No tripwire.
