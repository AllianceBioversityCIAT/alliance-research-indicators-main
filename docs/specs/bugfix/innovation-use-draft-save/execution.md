# Execution Log — Innovation Use drafts must save while incomplete

- **Spec path:** `docs/specs/bugfix/innovation-use-draft-save`
- **Linked:** [`./requirements.md`](./requirements.md) · [`./design.md`](./design.md) · [`./tasks.md`](./tasks.md) · [`./proposal.md`](./proposal.md)
- **Tier:** **both** — `server/researchindicators` and `client/research-indicators`

---

## Document Control

| Field | Value |
| --- | --- |
| Type / Depth | **Bug** · **Lite / Bug Mode** (regression test mandatory, red before / green after) |
| Approval Mode | **gated** — the continue/pause gate stops for the user after every task |
| Rework ceiling | 3 attempts per task |
| Triad | Leader (T1 · opus) → Implementer (`akili-implementer` · T2 · sonnet) → Reviewer (`akili-reviewer` · T3 · opus, read-only). `author ≠ auditor` holds on both model and context |
| Budget authority | [`design.md`](./design.md) §7 — **3 tasks · ~180 LOC · ~4 review rounds** |
| Budget tripwire | Above ~250 LOC or beyond 6 review rounds → stop and escalate. §7 names the likely cause in advance: **if T-01 exceeds two review rounds, stop and re-scope the fixture rather than pressing on** |
| Concurrency | **T-01 and T-02 ran in parallel** — different packages, and T-02's tests mock HTTP so they do not wait on the server. Root `CLAUDE.md` §4.3 permits one server + one client task concurrently. **No measurement command was run while either worker was active** |
| Advisory policy | `ADVISORY` findings are recorded here and **die here**. They never gate, never consume an attempt, and never mint or widen a task (`/akili-execute` §2.4) |
| Deployment coupling | **One PR, both tiers.** Client-only turns a silent no-op into a visible `400`; server-only changes nothing perceivable. Never ship half |

### Inherited context — why this spec exists

Reported live by the product owner on 2026-08-21 during `docs/specs/innovation-use/details-page` **T-13**'s human gate: at resolved use level ≥ 6 with a blank Justification, **Save did nothing** — no `PATCH`, no toast, no feedback.

Root cause confirmed on both tiers (`proposal.md` §9). The client was **correctly mirroring** a server rule; the rule was simply enforced at save time rather than at submit time.

**`OQ-1` was resolved from the repo before any task was written** (`proposal.md` §15) — the same lesson as `OQ-IUP-2`, which the sibling spec had declared *"not answerable from the repo"* and which turned out to be one line of client code. Its answer changed the reading of the fix: `completenessValidation` is `enabled: false` on `DRAFT → SUBMITTED` for **every** indicator, so `validateLevelExplanation` was the platform's **only** bespoke server-side completeness guard. Deleting it makes Innovation Use *consistent* rather than newly exposed.

### Leader pre-checks, run before delegating

Per `/akili-execute` §2.1's environment-dependent-verification rule, and because **KZ-004** (High, 2 recurrences) is exactly about entering Bug Mode without the verification prerequisites in place:

| Check | Result |
| --- | --- |
| Docker daemon | **active** |
| Fixture harness | `test:fixtures`, `test/jest-fixtures.json`, `docker-compose.test.yml`, `scripts/load-baseline.js`, `orm.test.config.ts`, `src/db/baseline` — **all present**; chunk 2 ran this tier green twice (15 suites / 71 tests) |
| **Disposability of the TEST target** | **`ARI_TEST_MYSQL_HOST` = `127.0.0.1:3307`** (local scratch container) vs **`ARI_MYSQL_HOST` = `192.168.20.210`** (shared dev DB) — **different hosts.** Finding **F-01** (`bugfix/sp-versioning-roles-id`) records a machine where the `TEST` variables resolved to the *same* remote RDS, which would have made `baseline:test:load` destructive against the shared database. Verified by **resolved host and port, never the variable name**, exactly as `docs/infrastructure.md` requires |
| Scratch container state | **not running** — the T-01 brief instructed the Implementer to bring it up, with the contract's two traps named: `migration:test:bootstrap` order is not optional, and the fixture runner is **silently name-gated** to `*.fixture-spec.ts` (a plain `*.spec.ts` is collected by neither runner — a zero-tests-collected pass that looks green) |
| Working tree | clean at spec HEAD |

**No waiver is available for the red-before-green run**, and the briefs said so: the prerequisites are present, so a missing red run would be a blocker to report, never a step to skip.

---

## Task Execution History

*(Entries appended per task, after a Reviewer PASS and before the `tasks.md` checkbox flips — that order is load-bearing: a `[x]` with no attempt history is a traceability hole that looks like a finished task.)*

### T-02 — Client: drop the save gate condition and the duplicate message

| Field | Value |
| --- | --- |
| **Status** | 🔄 **attempt 1 FAIL → attempt 2 in flight** |
| **Date** | 2026-08-21 |
| **Effort** | attempt 1 `medium` → attempt 2 **`high`** (rework rule: a fix that failed is usually under-thinking) |

#### Attempt 1 — Reviewer `STATUS: FAIL`, one issue, seven of eight criteria discharged

**Files changed:** `innovation-use-details.component.{ts,html,spec.ts}` — `+132 / −44`.

**The Implementer rejected the Leader's suggested mechanism, and was right to.** The brief proposed suppressing `app-textarea`'s own required message via a call-site `[isRequired]="false"`-style binding. The Implementer **built that first, then discarded it**, reporting that it fails T-02's own mandatory falsifying input: unconditional suppression makes deleting the page-owned block kill the blank **and** whitespace cases together, whereas the criterion requires **only** the whitespace case to fail.

Delivered instead:

```ts
justificationWhitespaceOnly = computed<boolean>(() =>
  this.justificationMissing() && !!this.body().innovation_use_level_explanation);
```

`justificationMissing()` trims, so it is `true` for blank, `''` **and** whitespace. AND-ing a non-empty raw value removes the blank/`''` overlap, leaving only whitespace-only — the one case `app-textarea`'s untrimmed check cannot see. **The two sources become mutually exclusive by construction**, with the shared component's bindings untouched.

**The Reviewer verified that truth table independently, from the implementations rather than from the diff's comments about them** — including `null` and tab/newline-only strings, which no test covers:

| raw value | page block | `app-textarea` | total |
| --- | --- | --- | --- |
| `undefined` · `null` · `''` | 0 | 1 | **1** |
| `'   '` · `'\t\n'` | 1 | 0 | **1** |
| `'text'` | 0 | 0 | **0** |

It also confirmed `!!s` and `length === 0` are exact complements over the string domain, so the exclusivity is structural, not coincidental; and that c3's scoping helper genuinely captures **both** sources (`.closest('app-textarea').parentElement` is `div.rs-mt-[20]`, which holds the component **and** the page block as a sibling) — so the 1/1/0 counts measure what they claim.

**Verification (attempt 1):** full unfiltered `npm test -- --silent` → **312 suites / 6515 tests** (baseline 312/6511; +4 = c3's three plus c4's one). Lint clean, `git status` after lint clean. `TextareaComponent` and `buildPayload` byte-identical. Both falsifying inputs run and reverted, including the required asymmetry (page block deleted → whitespace case red, blank case green).

#### The FAIL — verbatim substance

**c5 / R-IUD-003 AC.5 — "the red asterisk still renders at level ≥ 6" — is asserted nowhere in the repository.**

The only candidate, `innovation-use-details.component.spec.ts:251`, **claims the asterisk in its title** (*"is present with an asterisk and the required message…"*) while its assertions are only `toContain('Justification')` and `toContain('This field is required')`. Neither proves the `<span class="text-red-500">*</span>` node rendered. `TextareaComponent`'s own spec touches `isRequired` in five places but never renders or queries the asterisk. The three new c3 tests filter on the exact text `This field is required`, so they cannot see it.

The nearest support is an **inference** — the required message can only appear inside `app-textarea` when `isRequired` is truthy, which is also the asterisk's render condition — but that is a proxy through another component's internal template, *"precisely the class of evidence this spec rejects elsewhere"*: `tasks.md` c3's own disqualifier says **count rendered nodes, not class strings**, and this very spec file's earlier T-11 rework replaced a `.text-red-500` query with an asterisk **text-node** search for exactly this reason.

**And the regression is one step from the Leader's original brief:** `[isRequired]="false"` — the suppression mechanism I suggested — silently removes the asterisk, and nothing in the repository would have caught it. The Implementer's report declared *"No gaps."*

**Remediation:** one assertion, no production change. Scoped to the `By.directive(TextareaComponent)` element — **never page-wide**, because the level stepper's own label renders a bare `*` and would make a page-wide query pass vacuously.

#### `ADVISORY` (4R) — recorded, and each dies here

| Lens | Finding |
| --- | --- |
| **Reliability** | The truth table holds for `null` and `'\t\n'`, but **neither is tested** — c3 covers only `undefined` and `'   '`. **`null` is reachable, not hypothetical:** `getData()` spreads the wire object straight into `body()` while the interface declares `string \| undefined`, and the component's own comment records that the server's `findOne` can return `?? null`. Behaviour on that path is **correct**, so this is coverage debt, not a defect — **KZ-008 does not convert it**, because the reachability verdict came back clean. Cheapest close would be an `it.each` table over all six inputs |
| **Risk** | *(acted on — see below)* `requirements.md` §6 R-IUD-003 *Details* described the **opposite** decomposition from what shipped |
| **Readability** | The rationale is recorded three times at near-identical length (9-line HTML comment, 15-line computed doc, test comment) for four lines of markup and one line of TS. The HTML copy is the most rot-prone — it describes another component's internals across a boundary |
| **Reliability (evidence precision)** | Attempt 1's coverage figures cannot be attributed: `npm test -- --silent` does **not** collect coverage, so the numbers came from an unnamed separate run. c9 is satisfied on any reading, but attempt 2's brief now requires naming the command |

**Advisory policy held:** none of these gated, none consumed an attempt, and **none was allowed to widen T-02 or mint a task.** Attempt 2's brief explicitly forbids adding the `null` / `'\t\n'` cases, precisely because they arrived as an advisory.

#### Leader action on the Risk advisory — a spec correction, not a task

The Risk finding is **not** an advisory in substance: `requirements.md` §6 R-IUD-003 *Details* prescribed *"the page-owned block … covers blank and whitespace. The shared component's message must be suppressed"* — the **opposite** of what shipped, and **falsified by this spec's own gates** (`tasks.md` T-02's falsifying input and §8 **D5** both describe the disjoint shape). The bullet was **over-specified from the start**: `design.md` §3.3 had already delegated the mechanism to the Implementer.

Corrected by the Leader under the Pivot Protocol's authority to modify the spec — **not** by widening T-03, which the advisory rule forbids.

**Correction Closure sweep, both directions — and it caught three sites the cited-site list missed:**

| Direction | Result |
| --- | --- |
| **Forward** (`suppress`, `the one to keep`, `covers blank and whitespace`) | **4 live sites, not 1**: `requirements.md` §6 (cited), plus **`design.md` §3.3**, **`design.md` DD-2**, **`tasks.md` T-02 scope item 2**, and **`proposal.md` §5** — the origin. All corrected |
| **Backward** (referrers to R-IUD-003 / DD-2 / §3.3) | Two referrers left asserting *"the **surviving** message"*, which implies one source was removed when both survive as complements. **`design.md` DD-4** and **`tasks.md` :70** tightened |

**This is KZ-005's third recurrence in this session alone** — the cited-site list named one site out of four, again. The lesson's own escalation applies: the durable fix is fewer sites asserting the same thing, not better sweeps.

#### Attempt 2 — Reviewer `STATUS: PASS`

**Delta: +8 lines, spec file only.** One assertion added inside the **existing** `c6` test, no new `it` block, no production byte moved:

```ts
const hasAsteriskTextNode = Array.from((textareaEl.nativeElement as HTMLElement).querySelectorAll('span')).some(
  span => (span.textContent || '').trim() === '*'
);
expect(hasAsteriskTextNode).toBe(true);
```

Scoped to `By.directive(TextareaComponent)` and searching for a **text node**, not a `.text-red-500` class — the idiom this same file's earlier T-11 rework already established for exactly this reason.

**The falsification deserves its own note, because the Implementer refused an ambiguous red.** Flipping `[isRequired]="false"` made the *pre-existing* assertion at `:271` fail **first**, since `app-textarea`'s own message disappears too. Rather than bank that as evidence, the Implementer blanked `:271` in a throwaway copy and re-ran to confirm **the new assertion fails on its own** (`Expected: true, Received: false`), then restored the file byte-for-byte and reverted the binding. **The Reviewer confirmed the cause in source** rather than accepting the account: `textarea.component.ts:77-83`'s `isInvalid` short-circuits on `if (!this.isRequired) return false`, which is exactly why `:271` reddened, while the asterisk is gated by a **separate** template branch (`@if (isRequired)` at `textarea.component.html:6`) — so the isolated red travelled its own path.

#### What the Reviewer established independently

| Question | Finding |
| --- | --- |
| Is the asterisk really a `span` trimming to `*`? | **Yes** — `textarea.component.html:6-7`, `<span class="text-red-500">*</span>` under `@if (isRequired)` nested in `@if (label)`. Not a `::before`, not merged into the label's `{{ label }}` interpolation (that sits in the parent `<label>`) |
| Could the assertion pass vacuously? | **No.** It enumerated **every** `span` in the `app-textarea` subtree — the asterisk, `helperText` (unbound), the two required-message spans, "Maximum reached", and `app-word-counter`'s three — and **none other trims to `*`**. The level stepper's own bare `*` (`innovation-use-details.component.html:15`) and the page-owned block (`:33-47`) are both **siblings** of the host, outside the queried subtree |
| Did attempt 1 regress? | **No** — verified by direct read: the gate is still `isEditableStatus() && !loadFailed() && !loading() && !hasDuplicateActorType()` with no `justificationMissing()` term; `justificationWhitespaceOnly` unchanged; `buildPayload` still `?? undefined` with no trim; `[isRequired]="true"` restored; `TextareaComponent` retains its original untrimmed `isInvalid()` |
| Were the forbidden widenings introduced? | **No** — no `it.each` anywhere, c3 still three discrete `it` blocks with the node-counting helper intact, no `null` or `'\t\n'` case added |

#### An advisory that was itself wrong — corrected, not carried

Attempt 1's `ADVISORY (evidence precision)` claimed *"`npm test -- --silent` does not collect coverage — the numbers came from a separate run whose scope is not stated."* **The Implementer pushed back and was right.** `client/research-indicators/jest.config.ts:7` sets `collectCoverage: true` project-wide with thresholds at `:17-24`, so the single invocation **does** emit the coverage table and the figures were attributable all along. **Verified independently by the Leader, then by the Reviewer.** The Leader's attempt-2 brief had repeated the false claim; recorded here so the error dies with this entry rather than propagating.

*A worker correcting the Reviewer, with evidence, is the loop working — not a deviation.*

#### `ADVISORY` from attempt 2 — recorded, dies here

| Lens | Finding |
| --- | --- |
| **Risk** | The assertion proves the marker **node**, not its **redness** — unavoidable in jsdom without a Tailwind class-string check, which this file already disqualified for good reason. Noted only because the shared component styles the marker with Tailwind `text-red-500` while the page's own messages use `var(--ac-red-1)`. **That token inconsistency pre-dates this spec, DD-2 forbids touching it here, and it belongs in a shared-component follow-up — not in T-02** |

#### Final verification (attempt 2)

| Check | Result |
| --- | --- |
| `npm test -- --silent`, full and unfiltered | **312 suites / 6515 tests passed** — identical to attempt 1, as expected: assertions were added to an existing `it`, not a new one |
| Coverage (same invocation) | 99.22 / 97.94 / 98.81 / 99.5 vs floors 40 / 20 / 45 / 30 |
| `npm run lint -- --quiet` | `All files pass linting.` `git status` after: no lint mutations |
| `git diff --exit-code` on `TextareaComponent` | **clean** (c7 / R-IUD-003 AC.6 / DD-2) |
| `Not Done / Assumptions` | **none declared** |

#### T-02 closure

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** |
| **Attempts** | **2** · **review rounds: 2** |
| **Requirements covered** | R-IUD-001 (AC.1, AC.2, AC.4, AC.5) · R-IUD-003 (all 6) |
| **LOC** | **+140 / −44 = 96 net** across 3 files |
| **Budget note** | `design.md` §7 budgeted **~180 net for all three tasks**. T-02 alone is **96**, and T-01 has not landed yet. Tracked, not absorbed — the tripwire is 250 net or 6 review rounds; 2 rounds are spent. **Reconciled at T-03; escalated to the user at the gate if T-01 breaches it** |

### T-01 — Server: delete the save-time guard, invert its tests, redesign the boundary fixture

| Field | Value |
| --- | --- |
| **Final status** | ✅ **PASS** — first attempt, one review round |
| **Date** | 2026-08-21 |
| **Effort / skills** | `high` · `nestjs-expert` |
| **LOC** | **+535 / −336 = 199 net** across **5** files (production ≈ −30) |
| **Requirements covered** | R-IUD-001 (AC.3) · R-IUD-002 (AC.1, AC.3, AC.4) |

#### The change

`validateLevelExplanation` (`:307-326`) and its call (`:183`) deleted. Two things preserved deliberately, and the Reviewer verified both:

- **`resolveInnovationUseLevel` is still called, with its return value discarded** — for its *other* effect: a level id resolving to no catalog row still throws `400` before `BEGIN`. Confirmed live at `:298-309`, with three tests holding it (`:699`, `:1190`, `:635`), none regressed.
- **Every validator still runs pre-`BEGIN`**, so DD-3's "a failure persists nothing" holds by ordering.

#### Bug Mode — red before, green after (c1)

**RED**, unfixed code: `2 failed, 2 total` — `BadRequestException` at `validateLevelExplanation (:322)` via `update (:183)`. **GREEN** after deletion: `2 passed`.

**Falsifier 1:** restored method + call → **both** c1/c2 and c3 failed together, confirming c2 is not a false pass. **Falsifier 2:** stubbed `innovation_use_validation` to `RETURN TRUE;` via reversible DDL on the scratch container → both failed at `expect(Number(greenCheckRow.innovation_use)).toBe(0)` (`Expected: 0, Received: 1`). Real function body restored, green again.

#### The Reviewer went beyond the falsifier — and this is the strongest evidence in the spec

Falsifier 2 proves the assertion *reads* the real function. It does **not** prove **which conjunct** is false. The Reviewer settled that separately against `1787078283929-createInnovationUseValidation.ts:133-137`: with level id 7 seeded (`commonFields` TRUE, `useLevel` 6), one actor at `actor_type_id = 900_910` (≠ 5, so `tempActors = tempFullActors = 1`), `sex_age_disaggregation_not_apply = TRUE, actors_count = 3` (so `tempModeConsistent = 1`), and `ActorRolesEnum.INNOVATION_USE = 2` matching the routine's `ra.actor_role_id = 2` — **every conjunct is TRUE except `explanationValid`.** So `toBe(0)` fails **if and only if** the justification rule stops holding. That is the strongest form c2/c3 could take.

**And the chain is real end to end, no double anywhere on the assertion's path:** real `ResultInnovationUseService` from a real Nest `TestingModule` over the TEST datasource → hand-constructed `StatusWorkflowFunctionHandlerService` with argument positions verified against `function-handler.service.ts:31-40` → real `GreenCheckRepository` over the real `DataSource` → `innovation_use_validation` as raw SQL. Only `CurrentUserUtil` / `ResultsUtil` are overridden, for `REQUEST` scope, and neither is on this path. **KZ-001 satisfied at the tier that matters.**

#### KZ-001 across the eight inverted unit tests — and the trap that was absent

All eight assert positive outcomes; **no bare `not.toThrow()` anywhere.** The Reviewer identified what would have made them hollow and confirmed it is not the case: the `transaction` double at `:175-184` **really invokes its callback** (`await cb(fakeManager)`), so the `managerUpdate` and child-service assertions are live, and `fakeManager` is a single stable instance so manager-threading assertions are falsifiable rather than self-satisfying. `resolves.toBeDefined()` alone would be near-tautological — every one of the eight pairs it with at least one positive state assertion, and each discriminates against the pre-fix code, which threw.

#### Declared scope excess — adjudicated FORCED, all six. The defect is in the task text

The task named **five** unit-test line numbers and one fixture. The Implementer inverted **three more unit tests** and **three tests in a fifth file** (`innovation-use-section-round-trip.fixture-spec.ts`), disclosed all of it under `Not Done / Assumptions`, and argued c6 was unreachable otherwise.

The Reviewer reconstructed what each of the six asserted **pre-deletion** against the pre-fix control flow, and confirmed every one was asserting the level-≥6 rejection **and nothing else**:

| Site | Pre-fix assertion |
| --- | --- |
| unit `:545` DISCRIMINATING PAIR Half B (`level_id: 7`, stored explanation `null`) | 400, level-≥6 rule |
| unit `:767` / `:796` DD-14 explicit `null` / `''` (stored level 7) | 400, same rule |
| round-trip `:889` / `:919` / `:937` (`null` / `''` / `'   '`, key present, stored level 6) | 400, same rule re-firing against the cleared value |

**Not scope creep — the cited-site list under-counted.** `tasks.md` T-01 scope item 2 named five lines and missed three same-file sites plus an entire file. **This is the third recorded instance in this spec of a cited-site list under-counting** — and T-01's own falsifying input warns of exactly this. The lesson is mine, not the worker's.

#### Item 2 — `design.md` §3.1 is factually WRONG, and the Implementer's comment is right

My §3.1 claimed the `:168-171` resolution *"is what makes the never-typed case preserve the stored value."* **It is not.** The write at `:216-222` uses the **raw DTO value**, never `_effectiveExplanation`:

```ts
innovation_use_level_explanation:
  createResultInnovationUseDto?.innovation_use_level_explanation,
```

The preserving mechanism is **step 6's partial merge** — an omitted key is `undefined`, which TypeORM's `UpdateQueryBuilder` omits from the `SET` list. `:168-171` **never reached the write**; it existed solely to feed the validator. The service's own DD-14 comment at `:212-215` already said so.

**Three documents carry the same error** and are corrected below: `design.md` §3.1, `design.md` §6's reversion-challenge row, and `tasks.md` §3's `R-IUD-001 sc.1` coverage row.

**But the clause is NOT unevidenced, so no coverage gate is open.** `innovation-use-section-round-trip.fixture-spec.ts:955` PATCHes with the explanation key **omitted** while changing an unrelated actor count, against real MySQL, and reads the column back by **raw SQL** (`:1008-1014`) asserting byte-identity with the sentinel. Unchanged by T-01, and green. The unit tier could not prove it — a mock can only show `undefined` was passed, not that TypeORM skipped it — and the boundary fixture's `toBeNull()` proves nothing about preservation, since nothing was stored. **The fix is a citation correction, not new work.**

#### Nothing under-enforces (item 7)

Duplicate-actor (`:199`, pre-`BEGIN`, four tests), organizations-identified (`:206`, the FAIL-1 data-destruction path, eleven tests untouched), unknown-catalog-id, the `404` existence check (`:145-154`, still first), and ownership / adopted-PK reconcile / `idsAlreadyClaimed` (all outside the diff) — **all intact.** The Leader independently re-ran c5's grep: 5 hits, all comments.

#### Verification

| Check | Result |
| --- | --- |
| Fixture suite | **15 suites / 70 tests passed** |
| `npm test -- --silent`, full unfiltered | **336 suites / 2296 tests passed** |
| Coverage (`test:cov`) | global 89.75 / 75.76 / 85.22 / 89.21 (floor 60); the service itself **100 / 91.83 / 100 / 100** |
| Lint | found one real issue (unused `BadRequestException` import in the redesigned fixture), fixed; clean on re-run. `git status` after: only the 5 files |
| `git diff --exit-code src/db/migrations/` | **clean** (c7) |
| Container | brought up, `migration:test:bootstrap`, used, **torn down** |

**Environment note worth carrying forward:** the first `compose:test:up` recreated a container that retained partially-migrated state through Docker Compose's anonymous-volume carryover, failing `migration:test:execute` for reasons unrelated to this task. Resolved by a genuine teardown before bringing up fresh. **It cost real time and will recur** — the next task touching fixtures should tear down first, not up first.

#### `ADVISORY` (4R) — recorded; R1 escalated to the user, the rest die here

| ID | Lens | Finding |
| --- | --- | --- |
| **R1** | **Risk — reachability: constructible** | **Nothing in the repo asserts that `result_status_workflow` row id 30 dispatches `completenessValidation` with `enabled: true`.** The fixture calls the dispatched function directly (accepted — `ResultOicrModule`'s circular graph makes the alternative disproportionate), so the substitution does not cover the **wiring**. A future migration flipping row 30 to `enabled: false` would leave **every test in this spec green** while removing the last server-side completeness enforcement for this section — `DRAFT → SUBMITTED` is already `false` platform-wide. Cheap close: a raw `SELECT` of row 30's config asserting the function name and `enabled: true`. **The Reviewer names this the single highest-value addition.** Escalated to the user rather than actioned — the advisory rule forbids widening a task from an advisory, and the budget tripwire is already open |
| **R2** | Readability | Three rationale paragraphs on `resolveInnovationUseLevel` (`:263-264`, `:269-271`, `:278-284`) still assert a rule that no longer exists — the next maintainer will hunt for a threshold check that is gone |
| **R3** | Reliability — constructible | The three inverted round-trip tests deactivate the section's actors/organization/quantification (`result-actors.service.ts:298-306` deactivates unconditionally, and `actors ?? []` means an omitted key still triggers it) and restore **only** the justification. `:955` repairs the collections by re-sending ids that `assertInnovationUseOwnership` (`:371-377`) accepts **without an `is_active` filter**. Green for a real reason, but the comment's restore claim is incomplete. Insert any read-only assertion between `:937` and `:955`, or drop `:955`'s re-send, and the collections are silently empty |
| **R4** | Readability | `innovation-use-section-round-trip.fixture-spec.ts:992-994` still says the omitted key *"reached the VALIDATOR too"*. There is no validator reading the explanation any more — **plainly false once the dead code goes.** It sits in a file this task edited, so it is exactly what T-03's Correction Closure must catch |
| **R5** | Readability | `innovation-use-level-boundary.fixture-spec.ts:58-59` says "the **four** constructor parameters" then lists five; `:212`'s seed description still names the retired F-C; `:730`'s inverted test is the thinnest of the eight |

#### Reviewer directive, not a gate — pending the user's budget ruling

The Reviewer directs that **`_effectiveExplanation` be removed**: unambiguously dead, and per item 2 the lines it occupies were protected for a reason that **was never true**. It is lint- and build-clean (`eslint.config.mjs:51-57` sets `varsIgnorePattern: '^_'`), but *"it passes lint is not a reason to keep an 11-line comment whose entire job is to explain why dead code exists."*

**Order matters and is recorded:** deleting it today would violate `tasks.md` T-01 scope item 1 **as written**. So — amend scope item 1 + `design.md` §3.1/§6 **first** (done below), *then* delete `:167-181` in one follow-up edit together with R2's and R4's stale paragraphs.

**Not actioned in this entry.** It is a production change, the budget tripwire is open and unanswered, and bundling it with R1 is the user's call.

---

## Budget tripwire — fired, escalated, re-baselined by user ruling

**2026-08-21.** Actuals hit **295 net** (T-01 199 + T-02 96) against `design.md` §7's **~180**, breaching the 250 tripwire by 45. Escalated to the user with the delta and the cause **before starting T-03**, per `/akili-execute` §2.4. **Ruling: re-baseline to ~300, record the cause, continue.**

**Cause: spec-tier density, not scope creep.** Production landed at ≈ −30 net — exactly the estimate. The whole overrun is test authoring (384 lines in the boundary fixture, 288 in the unit spec, 123 in the fifth file). Same diagnosis the sibling spec recorded across eight tasks; third occurrence in this project.

**What the tripwire itself got wrong:** it predicted the right cause but watched the wrong axis. Review rounds came in **under** budget (3 of ~4); **LOC** breached. Recorded in `design.md` §7 so the next estimate binds the trigger to the axis the estimate is weakest on.

### Deferred by user ruling — priority is a stable test deployment today

The user's instruction: *reach a point today where this can be deployed to test and be stable; the deploy is to show progress, and iteration continues afterward.*

Under that priority, the two items T-01's review left open are **deferred, not dropped** — and **neither affects runtime behaviour**:

1. **Remove `_effectiveExplanation`** plus the three stale rationale paragraphs and the false comment at `innovation-use-section-round-trip.fixture-spec.ts:992-994`. Deleting an unused variable and fixing comments. `tasks.md` T-01 scope item 1 is already amended to permit it, so no further spec change is needed when it is picked up.
2. **`ADVISORY R1`** — assert that `result_status_workflow` row id 30 dispatches `completenessValidation` with `enabled: true`. **Test-only**, closing a future exposure rather than a present defect. **The highest-value item owed**, and the only unasserted premise in R-IUD-002's chain.

**Recorded as a deliberate priority call, with the reasoning, so `/akili-resume` reads it as owed work rather than as a gap nobody noticed.** The advisory rule was not bent: R1 was never allowed to widen T-01 — it was escalated to the user, who ruled on it.

### Deploy readiness at this point — what is and is not settled

**Code:** T-01 and T-02 are `[x]` with Reviewer PASS. Both tiers are committed on `AC-1679-Create-the-innovation-use-section`, **7 commits unpushed, nothing deployed.** Full suites green on both sides (server 336/2296, client 312/6515), both lints clean, no migration in this spec.

**Deployment coupling stands and is the one hard rule:** ship **both tiers or neither**. Server-only changes nothing perceivable; **client-only turns today's silent no-op into a visible `400`** — strictly worse than the bug being fixed.

**Still open, and none of it is this spec's:**

| Item | Owner |
| --- | --- |
| `details-page` **T-13** human gate — c1 partially exercised by the reporter (a result was created and saved); **c7 / c8 / c9 still owed** (light-theme visual ×2 viewports, two screenshots, keyboard pass) | The sibling spec, `[~]` |
| Migration state in the **target test environment**, including the archived bugfix's `devops-note.md` — two `SP_versioning` repairs to run **together, in order, with Engineering-lead approval** against the shared non-disposable DB | DevOps / Engineering lead |
| Platform finding: `completenessValidation` is `enabled: false` on `DRAFT → SUBMITTED` for **every** indicator, so any API client can submit an incomplete result on first submission; only the STAR client's green-check gating prevents it | Product / security, filed by `proposal.md` §15 |
