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

---

### T-03 — Amend the affected specs and close the verification gate

| Field | Value |
| --- | --- |
| **Skills loaded** | `cognitive-doc-design` |
| **Scope** | Documentation only — no production or test code touched |
| **Requirements covered** | NFR-IUD-003, closure for R-IUD-001/002/003 |

#### c1 — Correction Closure, both directions, both axes (KZ-005/KZ-007)

**Falsifying input satisfied first:** the forward grep for `Save blocked|save-block|blocked` across `docs/specs/innovation-use/` was run **before** any amendment and returned 37 hits across 6 files — matching the pre-recorded baseline exactly, confirming the grep is sound.

**Per-file forward-sweep table — every file in the directory, zero-finding files included (KZ-007):**

| File | Hits (phrasing grep) | Related to the deleted save-time guard | Action |
| --- | --- | --- | --- |
| `details-page/tasks.md` | 11 | 3 (`:428`, `:438`, `:605`) | **Amended** (all 3) |
| `details-page/execution.md` | 14 | 2 (`:835`, `:1192` — historical) | **Kept, append-only.** Execution logs are point-in-time history and are not rewritten (the same convention this spec's own T-02 entry and `details-page`'s T-10 Pivot both state explicitly: *"the whole spec folder except `execution.md`, which is append-only history and must not be rewritten"*). A **new** Pivot Record was appended instead, pointing here |
| `details-page/requirements.md` | 5 | 0 (all 5 are unrelated: general Submit/green-check gating, the allowlist Pivot's `A2`/`OQ-IUP-2`) | **None needed** on these 5. (A 6th, related site — `:186` — exists but was **not caught by this phrasing grep at all**; see the second-axis sweep below) |
| `details-page/design.md` | 4 | 1 (`:380`) | **Amended.** (A 2nd related site, `:205`, also missed by this grep — see below) |
| `details-page/proposal.md` | 2 | 0 (both are general Submit-gating language, unaffected) | **None needed** |
| `family.md` | 1 | 0 (chunk-1 "unblocked" status, unrelated) | **None needed** |
| `OPEN-ITEMS.md` | 0 | — | **Zero-finding, confirmed** (not silently skipped) |
| `details-page/judgment.md` | 0 | — | **Zero-finding, confirmed** |

**Second-axis sweep — required because the first axis under-counted (KZ-005's own escalation: bound every axis, not just the one that last failed).** Re-grepped on the token `R-IUP-006` / `level >= 6` / `400` / `guard before save`, independent of the word "blocked": found **two more related sites the phrasing grep could not see**, because neither contains the word "blocked":

| File | Site | Phrasing that hid it | Action |
| --- | --- | --- | --- |
| `details-page/requirements.md` | `:186` (§6.2, "400 responses" table) | *"Mirror the rule (R-IUP-006)"* | **Amended** |
| `details-page/design.md` | `:205` (§4.3, "400 map" table) | *"page-level guard before save"* | **Amended** |

**Backward direction** — grepped for referrers to `R-IUP-006` / `T-09` / the traceability row across the same files: no additional referrer asserts the superseded behavior beyond the 7 sites above (the two `execution.md` historical entries are the only other referrers, and they are correctly left as append-only history).

**Net: 7 live sites amended** (`requirements.md` ×2, `design.md` ×2, `tasks.md` ×3), not the 5 the citing task named — the 2 extra (`requirements.md:186`, `design.md:205`) were found only by the second axis. Recorded in `details-page/execution.md` → *Pivot Record: R-IUP-006 / T-09* for durability.

#### c2 — Superseding record, archive untouched

New sibling file `docs/specs/archive/2026-08-20-innovation-use--details-api/save-time-justification-superseded.md`, mirroring the `bugfix/sp-versioning-roles-id/devops-note.md` precedent (a note added to an archive folder after archiving, archived documents left byte-identical). Back-linked from `tasks.md` scope item 2.

**Beyond the two ACs the citing task named (AC.3/AC.4): `R-IUA-006` AC.1 asserts the identical rejection mechanism and is equally superseded** — verified independently against the requirement text rather than trusted from the citation, given this spec's 3-for-3 record of cited-site under-counts.

**Correction (Reviewer FAIL, rework attempt 2):** the line above originally claimed the superseding note's per-AC table "covers all six (AC.1/AC.3/AC.4 superseded; AC.2/AC.5/AC.6 unaffected)." That was wrong on AC.5. AC.5 has two clauses (`requirements.md:392`): the first ("no level stored anywhere → accepted, rule never fires") is genuinely unaffected, but the second ("when a level *is* stored, the rule evaluates the effective post-write row so an omitted level can't bypass the justification requirement") is the DD-14 save-time evaluation rule — and the rule it fed was deleted by T-01, so there is no bypass left to close. Classifying the whole AC as "Unaffected" answered the first clause and was silent on the second, which is the same under-counting-by-one defect this entry called out for AC.1 one paragraph above; the note's own re-read (this note's closing paragraph) should have re-swept all six ACs at that resolution, not just confirmed a count of six rows present. **Corrected classification: AC.5 is Partially superseded** — first clause unaffected, second clause (and the **DD-14** decision it encodes) superseded by the same T-01 deletion — **DD-14 partially, not wholly**: its *explanation* resolution is now dead code (`_effectiveExplanation`, `result-innovation-use.service.ts:177-181`, zero readers), while its *level* resolution (`effectiveLevelId`, `:163-166`) stays live at `:189` for the unrelated unknown-catalog-id `400`, step 6's partial merge (what actually preserves a stored justification) unchanged. The note's AC.5 row, its summary paragraph, and this entry are now consistent; see `save-time-justification-superseded.md` for the full amended row and the re-run per-AC completeness sweep.

`git diff --exit-code` on the archived `requirements.md`: **clean** (verified below).

#### c3 — `family.md`

Two rows added to **Cross-cutting Risks** (`FR-8`, `FR-9`) — **not** the Children table, which is byte-identical (verified: the diff's single hunk starts after line 97, `git diff -U0` shows no hunk touching lines 40-48).

- **FR-8** — this bugfix's own deferred follow-up (D1 dead-code cleanup, D2/`ADVISORY R1` test hardening), owned by the bugfix spec itself, not minted as a family chunk.
- **FR-9** — the platform finding (see c-scope item 4 below), given a durable owner.

#### Scope item 4 — the platform finding's home, reasoned

**`OPEN-ITEMS.md` §5 row P1 does not, by itself, discharge this.** That file states its own limits: *"a convenience index, not an authority... re-derive rather than trust this file after any work lands."* Its cited "home" for P1 is `bugfix/innovation-use-draft-save/proposal.md` §15 — this spec's **own** proposal document. Once this spec archives, that "home" is itself a point-in-time record with no ongoing owner watching it; an index row pointing at a bugfix's own proposal is not the same as a finding filed with a party positioned to act on it.

**Action taken:** added `family.md` **FR-9** (above) — the family manifest is the durable, authoritative document for this concern (it already carries the platform, cross-cutting exposure `FR-7`/AC-1718 in the identical shape: found during a chunk, needs its own decision, not owned by the finder). `OPEN-ITEMS.md` P1 and `proposal.md` §15 remain valid pointers *into* the reasoning; `FR-9` is now the durable filing.

**Not created:** a Jira ticket (unlike `FR-7`'s `AC-1718`). Filing a formal ticket wasn't asked for and would be scope the user hasn't authorized; `FR-9` is the documentation-only equivalent this task's constraints permit.

#### R4 — caught, reported, **not fixed** (per explicit instruction)

`server/researchindicators/test/fixtures/innovation-use/innovation-use-section-round-trip.fixture-spec.ts:992-994` still reads:

```
// The stored justification survived the omission — proving "omitted
// key preserves the scalar" reached the VALIDATOR too, not only the
// final UPDATE statement.
```

**Confirmed still present, unchanged, at the cited lines.** This is false since T-01's deletion — there is no validator left to reach. It is bundled with **D1** (`family.md` FR-8, `OPEN-ITEMS.md` §3.1) under the user's deferral ruling. **Not edited here**: the constraint for this task is documentation-only, and this specific file is test code the user has already ruled to defer, not something T-03 is authorized to touch.

#### c5 — PR description

Written to [`./pr-description.md`](./pr-description.md).

#### c6 — `details-page` T-09 c5

Hardened in place (`details-page/tasks.md:438`) — see c1 above and the Pivot Record.

#### c4 — Verification, quiet window, no delegated agent active

| Check | Result |
| --- | --- |
| `server/researchindicators`: `npm test -- --silent`, full unfiltered | **336 suites / 2296 tests passed** — identical to T-01's closure figure |
| `server/researchindicators`: `npm run lint -- --quiet` | clean, no output |
| `git status --short server/researchindicators/` after lint | clean — no mutation |
| `client/research-indicators`: `npm test -- --silent`, full unfiltered | **312 suites / 6515 tests passed**, coverage 99.22/97.94/98.81/99.5 — identical to T-02's closure figure |
| `client/research-indicators`: `npm run lint -- --quiet` | `All files pass linting.` |
| `git status --short client/research-indicators/` after lint | clean — no mutation |
| `git diff --exit-code` on the archived `requirements.md` | clean |

No other agent was active during this run (session-exclusive, per the Leader's pre-check).

#### Files changed by T-03

| File | Rationale |
| --- | --- |
| `docs/specs/innovation-use/details-page/requirements.md` | R-IUP-006 Details/AC.2 annotated; §6.2 400-table row corrected (2nd-axis catch) |
| `docs/specs/innovation-use/details-page/design.md` | §6.6 row (`:380`) and §4.3 400-map row (`:205`, 2nd-axis catch) corrected |
| `docs/specs/innovation-use/details-page/tasks.md` | T-09 scope note (`:428`), c5 (`:438`), traceability row (`:605`) corrected |
| `docs/specs/innovation-use/details-page/execution.md` | New `Pivot Record: R-IUP-006 / T-09` appended; no existing entry rewritten |
| `docs/specs/innovation-use/family.md` | `FR-8` (bugfix follow-up), `FR-9` (platform finding, durable home) added to Cross-cutting Risks; Children table untouched |
| `docs/specs/archive/2026-08-20-innovation-use--details-api/save-time-justification-superseded.md` | New sibling note (archive precedent), archived `requirements.md` left byte-identical |
| `docs/specs/bugfix/innovation-use-draft-save/tasks.md` | Back-link to the superseding note added under scope item 2 |
| `docs/specs/bugfix/innovation-use-draft-save/pr-description.md` | New — c5 deliverable |

#### Not Done / Assumptions

- **R4 and D1 are reported, not fixed** — explicit instruction; deferred by prior user ruling.
- **`tasks.md` T-03's own Status checkbox and its six `- [ ] c*` criteria lines are left unflipped** by this entry, matching this spec's own convention observed on T-01/T-02 (their criteria checklists remain `- [ ] c*` in `tasks.md` even though each task's Status line reads `[x] done`) — the Status flip is recorded by whoever runs the Reviewer pass this task's own process expects, not assumed here.
- No code, test, or migration file was touched, per this task's constraint.

---

#### Leader attempt history — T-03 closed on attempt 3 of 3

| Field | Value |
| --- | --- |
| **Status** | ✅ **PASS** — Reviewer `STATUS: PASS` on attempt 3 |
| **Date** | 2026-08-21 |
| **Attempts** | **3 of 3** (the ceiling; a fourth would have HALTed) |
| **Review rounds** | **3** for this task — **6 cumulative** for the spec, exactly at the re-baselined tripwire ceiling, not beyond it |
| **Effort** | attempt 1 `high` → attempt 2 **`xhigh`** → attempt 3 **`xhigh` held** |
| **Triad** | Implementer `akili-implementer` (T2 · sonnet) → Reviewer `akili-reviewer` (T3 · opus, read-only). Same Reviewer across all three rounds — it audited its own FAILs being closed, and reversed itself once |

**Effort adjudication, recorded because it departs from the default.** The rework rule bumps effort one level per retry, which from `xhigh` is `max`. The tier↔effort rule forbids `max` on a T2 model — the prescribed escalation is the *tier*, not the dial. Attempt 3's remediation was one sentence in one row with a fully-specified fix, i.e. under-*specified* work was never the failure mode; escalating to T1 for a one-row citation edit would have been disproportionate. **`xhigh` held, tier unchanged.**

##### Attempt 1 — Reviewer `STATUS: FAIL`, one issue

All four scope items delivered, both suites green, sweep sound. The Reviewer re-ran the forward sweep on a **third axis** it was not given (`400`, `justification`, `mandatory`, the `blocking` inflection, plus a backward `R-IUP-006`/`R-IUA-006`/`validateLevelExplanation` sweep across all of `docs/`) and found **no survivor asserting the deleted guard** — the 37-hit/6-file baseline reconciled exactly with the amendments. It also verified **c6 against the shipped client component**, not merely against spec text, confirming the amended `details-page` T-09 c5 is true of what ships rather than a false-for-false swap.

**FAIL:** the supersession note classified `R-IUA-006` **AC.5** as *"Unaffected — no change to the level-merge logic."* AC.5 has two clauses; the second (*effective-post-write-row evaluation, closing the omitted-level bypass*) is superseded by the same T-01 deletion, and the stated reason answered the **persistence merge** — a different mechanism than the clause asserts. Gate-worthy because the note is the **permanent** record for a byte-frozen archive: it is where a future reader learns which parts of `R-IUA-006` still bind.

##### Attempt 2 — Reviewer `STATUS: FAIL`, one issue

AC.5 corrected to **Partially superseded**, clauses split. The Reviewer confirmed the fix at source and **reversed its own attempt-1 citation**: the dead resolution is `:177-181`, not the `:167-181` it had cited — `:167-176` is comment prose. Ruled in the Implementer's favor. It also adjudicated the Implementer's disclosed fourth edit (the note's summary paragraph, which asserted a count the fix invalidated) as **FORCED, in-scope** — not widening.

**FAIL:** the DD-14 citation added *while remediating a citation defect* named a document that does not define DD-14. `bugfix/.../design.md`'s table is **DD-1 … DD-6**; DD-14 lives in the note's **own folder** (`archive/.../details-api/design.md:469`), and a **different, live DD-14** (dark-mode deferral, `details-page/design.md:509`) is cited twice by this spec — so the pointer resolved to nothing, or to the wrong decision. Secondary: DD-14 resolves **two** values, and only the explanation one is dead.

**Leader verification before relaying:** all four factual claims re-checked at source and confirmed. A Reviewer that had just mis-cited a line range was not taken on trust.

##### Attempt 3 — Reviewer `STATUS: PASS`

One file, one row. DD-14 cited at its real home (`./design.md` `:469`, with §5.1's `:232`/`:238`), the bugfix `design.md` §3.1 demoted to a labelled **evidence** pointer, and the claim scoped: DD-14 **partially** superseded, its two resolutions diverged.

The Reviewer verified **7/7 anchors independently** rather than trusting the Implementer's FP-50 table — and settled the substance by grep: `_effectiveExplanation` has **zero** readers (genuinely dead); `effectiveLevelId` has **exactly one**, at `:189`, feeding the unknown-catalog-id `400` that no `R-IUA-006` AC asserts. It confirmed positively that no standing advisory had been silently actioned (`_effectiveExplanation` still present, so deferred item **D1** was not quietly performed).

> **Reviewer summary:** *"Scope item 2's deliverable is now a supersession record a future reader of `R-IUA-006` can navigate from and trust."*

##### The pattern this task exhibited, worth carrying to Kaizen

**Each remediation introduced the next defect in the sentence it added** — attempt 1's fix carried a wrong-mechanism reason; attempt 2's fix carried a wrong citation *while fixing a citation defect*. Both were caught only because the Reviewer read the amended artifact **whole** rather than as a delta. This is KZ-005's shape one level up: not "the sweep under-counted" but **"the correction is itself an unswept new site."** The final round's brief made reading-whole an explicit instruction, and that is what closed it.

##### `ADVISORY` (4R) across all three rounds — recorded, and all six die here

Per `/akili-execute` §2.4 an advisory never gates, never consumes an attempt, and **never mints or widens a task**. All six were withheld from every Implementer brief by explicit instruction, and attempt 3 confirmed none was actioned.

| ID | Round | Lens | Finding | Reachability |
| --- | --- | --- | --- | --- |
| **A1** | 1 | Readability | `details-page/tasks.md:416` — the T-09 heading still reads *"level-6 justification gate, save blocking"*. **Invisible to both sweep axes** (`blocking` ≠ `blocked`; no second-axis token). Not filed as a violation: c1's grep is literally scoped to `Save blocked`/`save-block`/`blocked`, and the heading stays true compositionally — T-09 genuinely still owns duplicate-actor save blocking (DD-5) | Reachable — any reader scanning task titles hits it before the corrected body |
| **A2** | 1 | Risk | `OPEN-ITEMS.md` is stale in two untouched places: `:43` still shows T-03 `[ ] not started`, and `:79` row **P1** still names `proposal.md §15` as the platform finding's only home — the fragile pointer that `family.md` **FR-9** was created to replace | Reachable — §1 is titled *"Where to start after a session reset"*, the first document a resumed session reads |
| **A3** | 1 | Reliability | `family.md` **FR-9** and `pr-description.md` say enforcement must be enabled across *"all six"* indicators, while the cited evidence enumerates **five** rows across indicators 1, 2, 3, 4, 6. Consistent with the repo's established "six indicators" phrasing, but the count and the row list do not line up on the page — and FR-9 is the durable filing a product/security decision will be scoped from | Documentation only |
| **A4** | 2 | Readability / Risk | The note cites `result-innovation-use.service.ts:177-181` — lines that deferred item **D1** will delete. A knowably-rotting citation inside a permanent archival note. Mitigated: `_effectiveExplanation` appears in the same sentence, so the symbol survives the range | No runtime state named |
| **A5** | 2 | Readability | `tasks.md:108`'s back-link says the note *"also covers AC.1"* and is silent on AC.5 — not false (it defers to the note's per-AC table), but it repeats the shape of the under-count this rework existed to fix | Documentation only |
| **A6** | 3 | Readability | The row's closing sentence calls DD-14's other half — *"an omitted key preserves a scalar but clears a collection"* — *"the same step-6 partial merge"*. Only the **scalar** half is step 6 (`:216-222`); the **collection** half is the `?? []` arguments at steps 7–9 (`:227`, `:234`, `:241`). The supersession verdict it delivers (**unchanged, not superseded**) is correct for *both* halves, so nothing false about binding is asserted — a two-mechanism compound compressed under one mechanism name | Names no runtime state; not reachable by any input |

**A6's sibling, actioned rather than deferred — and why that is not advisory-widening.** The Reviewer's second attempt-3 advisory named this entry's own `c2` paragraph as coarser than the note it points at (*"the DD-14 decision it encodes ... superseded"*, without the partial/whole distinction). That line is **Leader-owned audit trail, not spec or product scope**, and it was still being authored when the finding arrived. Writing one's own entry accurately is bookkeeping, not scope growth — leaving a knowingly-coarse statement in the permanent record would contradict the entire purpose of T-03. **Corrected in place above**; the six advisories in the table remain untouched.

##### Verification at close

| Check | Result |
| --- | --- |
| Server `npm test -- --silent`, full unfiltered | **336 suites / 2296 tests passed** (attempt 1; docs-only edits since) |
| Client `npm test -- --silent`, full unfiltered | **312 suites / 6515 tests passed**, coverage 99.22 / 97.94 / 98.81 / 99.5 |
| Both lints `-- --quiet` | clean; `git status` re-inspected after each (the script carries `--fix`) — no mutation |
| `git diff --exit-code` archived `requirements.md` | **clean, exit 0** — re-verified by the Leader after every attempt (**c2**) |
| Files outside `docs/specs/` | **none** — Leader-verified after every attempt. No code, test, or migration file touched by T-03 |
| Suites re-run on attempts 2–3 | **Deliberately not.** Markdown under `docs/` is outside Jest's `rootDir: "src"` and eslint's target — the Reviewer confirmed this independently. Re-measuring while a worker was active would have produced a *wrong* result, not a slow one (root `CLAUDE.md` §4.3) |

**Requirements covered:** NFR-IUD-003 · closure for R-IUD-001, R-IUD-002, R-IUD-003.

**Budget at close:** **295 net LOC** against the re-baselined ~300 — T-03 added documentation only, no production or test LOC. **6 review rounds** against a ceiling of 6. Both axes inside budget; neither has slack left.
