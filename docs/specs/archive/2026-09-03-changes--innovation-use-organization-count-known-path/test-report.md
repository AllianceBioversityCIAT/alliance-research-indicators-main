# Test Report — Changes / Organization count belongs to the unknown-organization path only

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/innovation-use-organization-count-known-path` |
| Depth | **Lite** |
| Run date | 2026-09-03 |
| Leader | Claude Opus 5 (T1), this session |
| Testers spawned | **0 — run inline** |
| Overall status | **PASS** |

**Deployment Rule outcome.** Lite depth, one suite → the Leader authored inline. Spawning a Tester would have cost more than the work saved. Equally decisive: `/akili-execute` had already produced red→green coverage for both requirements, and this command's token discipline says to **cite, not rewrite** author coverage — duplicated suites are MUDA paid on every future run. This phase therefore spent its whole budget on the **delta**: what the author's loop did not prove.

---

## 2. Suite partition

| Suite | Decision | Why |
| --- | --- | --- |
| Backend unit | **None** | 0 files under `server/` (`NFR-IUC-001`, measured). A scope fact, not a gap. |
| **Frontend unit** | **The only suite** | The entire change is two client components. |
| Integration | None | No API contract change; the server accepts the field on both paths exactly as before. |
| E2E | None | No critical user journey changed. |

---

## 3. What this phase added, and why

`/akili-validate`'s independent audit found **two genuine coverage gaps** that three per-task Reviewer passes had not caught. Both are closed here.

### F-2 — the `How many?` placeholder was closed by nothing

`R-IUC-001` Sc.2 requires the moved field to *"still carry `[min]="0"`, `[maxFractionDigits]="0"` and the `How many?` placeholder"*, and `tasks.md` had that box ticked. But a grep of the whole spec returned **zero** matches for `placeholder` — the clause was asserted by no test. A regression deleting `placeholder="How many?"` from the moved block would have shipped green.

Added to `c1`'s unknown-path case:
```ts
const countInput = appInputLabelled('Organization count')!;
expect(countInput.placeholder).toBe('How many?');
expect(countInput.isRequired).toBe(false);
```
The second line also closes Sc.2's `BUT it must NOT` (*"must not become required"*), which was likewise only inferred.

### F-3 — an accepted coverage regression, restored

`execution.md` decision **E-1** recorded that removing `c8`'s known-path `forEach` *"drops the file's only coverage of the count field's `[disabled]` binding"*, and accepted it as spec-authored. That was correct at the time — but the field still renders on the unknown path, where `c8`'s sibling asserts only the two selects and Specify-other. Deleting `[disabled]="disabled"` from the moved block would have shipped green.

Added to `c8`'s unknown-path case — the path that still owns the field:
```ts
const countDe = appInputs().find(de => (de.componentInstance as InputComponent).label === 'Organization count')!;
expect(inputNumberInside(countDe).disabled).toBe(true);
```

`tasks.md` T-01 had said *"do not touch the c8 unknown-path sibling"*. That instruction was written before the hole was known; **adding** an assertion does not disturb what it was protecting. E-1 is now **resolved**, not carried forward as an open item.

---

## 4. K-004 — both new assertions observed RED before being trusted

**The first red proof was contaminated and is reported as such.** A `sed` anchored on `$` rewrote *every* line ending in `[disabled]="disabled"`, not just the count input's — so the `c8` **known**-path case also failed, for a binding this spec never touches. A test stops at its first failing assertion, so that run could not distinguish "my new assertion fired" from "I broke a select". **Discarded and re-run narrowly.** A red that fires for the wrong reason is not evidence.

| # | Falsifying input (applied one at a time) | Result |
| --- | --- | --- |
| **F-2** | Remove `placeholder="How many?"` from the moved block, nothing else | **1 failed / 26 passed.** `● c1 … unknown path renders the organization-type select …` → `Expected: "How many?" / Received: ""` |
| **F-3** | Change `[disabled]="disabled"` → `[disabled]="false"` on the count input **only** | **1 failed / 26 passed.** `● c8 … unknown path: disables organization-type, sub-type and Specify other` → `Expected: true / Received: false` |

Both reds are **discriminating**: exactly one test fails each time, and in F-3's case the `c8` **known**-path test correctly stays green — the field is not rendered there, so it must not react. A guard that reddened uniformly would not have proven anything.

Template restored after each; full suite re-run green.

---

## 5. Coverage & traceability

Author coverage is **cited, not re-authored** — every row below marked *(execute)* was written and independently reviewed during `/akili-execute`, with its own observed red.

| Requirement | Scenario / clause | Test file : line | Origin | Result |
| --- | --- | --- | --- | --- |
| `R-IUC-001` | Sc.1 THEN — no count input in DOM | `…organization-item.component.spec.ts:185` | execute | **PASS** |
| `R-IUC-001` | Sc.1 AND — select / preview / callout still render | `:179`, `:475`, `:417` | pre-existing | **PASS** |
| `R-IUC-001` | Sc.1 BUT NOT — other cards untouched | actor spec unmodified + full suite green | execute | **PASS** |
| `R-IUC-001` | Sc.1 AND IT MUST — hide with `institution_id` unset | `:199–:203` | execute | **PASS** |
| `R-IUC-001` | Sc.2 THEN — input present on unknown path | `:214`, `:222` | execute | **PASS** |
| `R-IUC-001` | Sc.2 AND — `[min]` / `[maxFractionDigits]` intact | `:332–:340` (`c6`, behavioural via paste) | pre-existing | **PASS** |
| `R-IUC-001` | Sc.2 AND — **`How many?` placeholder intact** | `:194` | **this phase (F-2)** | **PASS** |
| `R-IUC-001` | Sc.2 BUT NOT — **not required** / no asterisk / label unchanged | `:195` + `:281` | **this phase (F-2)** + pre-existing | **PASS** |
| `R-IUC-001` | Sc.3 THEN + AND — live toggle both ways | `:210–:223` | execute | **PASS** |
| `R-IUC-001` | Sc.3 AND IT MUST — KZ-015 transition arrangement | `:211–:216` (renders, then toggles) | execute | **PASS** |
| `R-IUC-002` | Sc.1 THEN — `null` on known path | `…details.component.spec.ts:750`, `:730` | execute | **PASS** |
| `R-IUC-002` | Sc.1 AND — `institution_id` still sent | `:751` | execute | **PASS** |
| `R-IUC-002` | Sc.1 BUT NOT — no nulling on the unknown path | `:764`, `:780` | execute | **PASS** |
| `R-IUC-002` | Sc.1 AND IT MUST — row inclusion unchanged | *no test measures a before/after row set* | — | **PASS (reasoned)** — see §6 |
| `R-IUC-002` | Sc.2 THEN + AND — unknown path round-trips | `:764`, `:765` | execute | **PASS** |
| `NFR-IUC-001` | Server tier untouched | `git diff --name-only` → 11 paths, 0 `server/` | Leader | **PASS** |
| `NFR-IUC-002` | Numeric hygiene survives | `c6` (`:322–:356`) unmodified and green | pre-existing | **PASS** |
| `NFR-IUC-002` | **`[disabled]` binding on the surviving field** | `:449` | **this phase (F-3)** | **PASS** |

---

## 6. Accepted gaps

| # | Gap | Why accepted |
| --- | --- | --- |
| **G-1** | `R-IUC-002` Sc.1's `AND IT MUST leave row inclusion unchanged` is **reasoned, not measured** — no test compares a before/after row set. | The predicate is *provably* untouched: `organizationIdentitySatisfied` (`innovation-use-details.component.ts:516–518`) and the filter (`:471`) are absent from the diff, and the unmodified `c2` drop block still exercises them. Independently confirmed by two Reviewers at source. Writing a before/after harness would assert a property the diff cannot reach. |
| **G-2** | **`D-7` (card layout / vertical rhythm) has no automated gate.** | jsdom cannot evaluate layout and no test in this repo asserts spacing. Declared as a substitute from `requirements.md` §6 onward, **never counted as coverage**, and closed by the user's browser check on both paths (two screenshots, 2026-09-03). |
| **G-3** | No test drives the `p-checkbox` through its rendered element, so deleting `(onChange)="onKnownToggle($event.checked)"` would ship green. | **Pre-existing and repo-wide** — zero `triggerEventHandler('onChange'` occurrences under `client/research-indicators/src`. Outside this spec's change surface; closing it here would be unapproved scope. Carried out of the spec as an open item, not silently dropped. |
| **G-4** | No E2E or integration test exercises a real HTTP request. | No API contract change. `NFR-IUC-001` rests on the `design.md` §6.1 analysis plus the measured diff. Consistent with Lite depth and with both comparable change-class specs in the archive. |

---

## 7. Commands and results

| Command | Result |
| --- | --- |
| `npm run build` | **exit 0**, 0 `ERROR` lines |
| `npx eslint <production files>` | **exit 0** |
| `npx jest --testPathPattern innovation-use-organization-item` | 27/27 |
| `npm test -- --silent` (full client suite) | **317 suites / 6798 tests passed** |

**Scope limits (KZ-017).** `npx eslint` does not lint `*.spec.ts` in this repo, so every test edit rests on jest alone. `npm test` does **not** type-check (`isolatedModules: true` in `jest.config.ts`) — `npm run build` is the only type gate, and it was run. The server suite was **not** run because no server file changed: a declared non-measurement, not a green.

---

## 8. Remediation

**None outstanding.** Both gaps this phase was convened to close (F-2, F-3) are closed with assertions whose reds were observed in isolation. G-1 through G-4 are accepted with reasons above.
