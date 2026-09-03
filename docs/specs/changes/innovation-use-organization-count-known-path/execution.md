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
| **OQ-1** | Live row count for `is_organization_known = 1 AND organization_count IS NOT NULL AND is_active = 1` — a human-run read against the shared DB (`tasks.md` §1). | **OPEN.** User elected 2026-09-03 to run **T-01 first** (template only — touches no persistence and no payload) while obtaining the number. **T-02 MUST NOT start until OQ-1 is answered.** |

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
