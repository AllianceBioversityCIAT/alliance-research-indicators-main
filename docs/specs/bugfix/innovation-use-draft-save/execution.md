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
