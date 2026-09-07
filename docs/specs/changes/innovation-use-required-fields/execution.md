# Execution log — Innovation Use / Required-field semantics and green check

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/changes/innovation-use-required-fields/` |
| Spec id | `2026-09-innovation-use-required-fields` |
| Approval Mode | **gated** — the continue/pause gate stops for the user after every task |
| Linked requirements | [`./requirements.md`](./requirements.md) |
| Linked design | [`./design.md`](./design.md) — revision 6 |
| Linked tasks | [`./tasks.md`](./tasks.md) — 20 tasks |
| Findings ledger | [`./judgment.md`](./judgment.md) |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Owner | D. Casañas |
| Execution started | 2026-09-04 |
| Rework ceiling | 3 attempts per task |

### 1.1 Budget state carried in from `/akili-specify`

`design.md` §11 budgeted **18 tasks / ~1,600 LOC / ~24 review rounds**. `tasks.md` §1.1 declared a
**+2 task breach** up front (20 tasks; `T-14` sub-type catalog equivalence and `T-16` the client gate
task, each with its stated reason for not folding into a sibling), re-baselined LOC to **~1,650**,
and left review rounds at ~24. Recorded in `tasks.md` §6 as **`RB-8`**.

**This breach is pre-declared and user-approved at the specify gate — it is not a live tripwire.**
The Step 2.4 tripwire in this run measures against the re-baselined figures: **20 tasks / ~1,650 LOC
/ ~24 review rounds**. A further overrun escalates.

### 1.2 Status board

`tasks.md` §4 carries no per-task checkbox — its `Status` field is document-level. This board is the
per-task status the methodology requires, and it is the one `tasks.md` mirrors.

Legend: `[ ]` pending · `[~]` started / incomplete / blocked · `[x]` complete with Reviewer PASS.

| Task | Status | Notes |
| --- | --- | --- |
| T-01 `app-input` requiredMode + precedence | `[x]` | PASS attempt 1. Spec gap escalated — see Pivot Record |
| T-02 `app-input` DD-10 token sweep | `[x]` | PASS attempt 1. Visual claims INCONCLUSIVE → T-16 gate 3 |
| T-03 `quantification-item` 5 inputs | `[x]` | PASS attempt 1. Branch RED until T-12 (measured) |
| T-04 actor disaggregated counts + total msg | `[x]` | PASS attempt 3 of 3. Pointers → T-16, T-19 |
| T-05 actor aggregate path | `[x]` | PASS attempt 1. Pointer → T-06 (comment aside) |
| T-06 actor custom name trimmed | `[x]` | PASS attempt 1. T-05 pointer applied. See stash incident |
| T-07 org known path + DD-9 precedence | `[x]` | PASS attempt 1. 5 pointers filed → T-08 |
| T-08 org unknown type + count | `[x]` | **PASS attempt 4 of 4** (ceiling lifted by one on user ruling; HALT at attempt 3 recorded and resolved). 3 pointers filed → T-09/T-10, 1 → T-16 |
| T-09 org sub-type conditional + null | `[x]` | **PASS attempt 2 of 3.** DD-5b silent-persistence bug fixed at source. 3 advisories filed → T-10, 1 → `/akili-quick` |
| T-10 org DD-12 toggle clearing | `[ ]` | |
| T-11 details drop message + stop seeding | `[x]` | PASS attempt 1. 3 pointers filed → T-12 |
| T-12 details measure wiring | `[x]` | PASS attempt 3 of 3. **Restored the build.** All 4 pointers discharged |
| T-13 details DD-8 save gate + toast | `[ ]` | |
| T-14 sub-type catalog equivalence | `[ ]` | |
| T-15 doc sweep DD-11 | `[x]` | PASS attempt 2 of 3. Forward pointer filed → T-16 |
| T-16 CLIENT GATES suite + tsc + browser | `[ ]` | **3 forward pointers filed** — owns every visual claim |
| T-17 RSK-2 population sizing | `[ ]` | |
| T-18 migration + migration spec | `[ ]` | |
| T-19 executed truth table | `[ ]` | **forward pointer: client predicate NARROWER than SQL (AC.6)** |
| T-20 HUMAN apply the migration | `[ ]` | owner: D. Casañas (`OQ-4`) |

---

## 2. Task Execution History

*(appended per task, in the order tasks close)*

---

### T-01 — `app-input`: opt-in `requiredMode`, with precedence

| Field | Value |
| --- | --- |
| **Final status** | **PASS** (Reviewer, attempt 1) — with a **spec gap escalated separately**, see `## Pivot Record: DD-4 / R-IUR-010` below |
| Date | 2026-09-04 |
| Implementer attempts | **1** |
| Effort assigned | `high` (task said `M`; raised because `DD-1`'s precedence paragraph explicitly warns the naive additive implementation re-creates `DC-2` inside the fix) |
| Skills assigned | `angular-developer`, `systematic-debugging`, **`tdd`** |
| Skill deviation | **`tdd` added** beyond the task's list. Rationale: the task's Falsifying-input field is already a red-test list (4 modes × boundaries), so red→green earns its cost here rather than being overhead. Recorded per `.agents/leader.md` → *Delegation Discipline*. |

**Files changed**

| File | Change |
| --- | --- |
| `client/.../custom-fields/input/input.component.ts` | `@Input() requiredMode` union defaulting `'off'`; `isFilled()` (trims strings, keeps numeric `0` filled); `evaluateRequiredMode()`; precedence early-return wired into **both** `isInvalid()` and `inputValid()` |
| `client/.../custom-fields/input/input.component.html` | asterisk condition → `isRequired \|\| requiredMode !== 'off'`; one prettier-only paren removal on the `[style]` ternary |
| `client/.../custom-fields/input/input.component.spec.ts` | +211 lines: mode×boundary truth table driven through the `signal` input, a separate `isInvalid()`-through-`body()` block, and a real-template rendered-asterisk suite |

**RED evidence (observed before implementing — `K-004` / `KZ-014`)**

11 assertions failed against `HEAD` production code with the tests-only diff in place, including all three of the task's reddenable falsifying inputs: precedence (`isRequired=true` + `requiredMode="filled"` holding `0`), whitespace-only under `'filled'`, and both boundary messages. `Test Suites: 1 failed, 2 passed` · `Tests: 11 failed, 105 passed, 116 total`.

**`-5`-under-`nonzero` was NOT observed red and was not claimed as such.** The Implementer disclosed that the old fallback is `{valid: true}` with `isRequired` defaulting to `false`, so no red was available for that case. The Reviewer ruled the disclosure compliant with `KZ-014` and recorded the consequence: the two `-5` tests discriminate `≠ 0` from `> 0`, not new-code from `HEAD`.

**Verification**

- `npx eslint <.ts> <.spec.ts>` → clean on the `.ts` ("File ignored" warning only on the spec).
- `npm test -- --silent -- input.component.spec` → **116/116 pass, command exits 1.** Not a test failure: a targeted run trips project-wide coverage floors. **Leader independently confirmed** this is documented at `client/research-indicators/src/CLAUDE.md:152` as **`K-020`** with its own measurement, so the nonzero exit is a known false negative.
- Clean read: `npx jest input.component.spec --coverage=false --silent` → 3 suites, **116/116**, exit 0.
- Implementer-initiated extra gate: `npx tsc -p tsconfig.spec.json --noEmit`, normalized to the two touched files, before vs. after → **0 / 0**. Measured by swapping `HEAD` copies in rather than `git stash` (other unrelated in-flight edits existed in the tree), then restoring and re-running to confirm the restore was exact.

**Reviewer verdict — `STATUS: PASS`**

> The diff implements `DD-1` and `DD-2` exactly — the union, the `'off'` default, the three messages, the trimmed-string/filled-zero asymmetry, the asterisk condition, and the precedence bypass in **both** computeds — with observed pre-implementation reds for every falsifying input that could produce one, and no `T-02` leakage.

Rulings on the six audit questions the Leader named:

1. **Early return broader than `DD-1` names** (the Implementer's own volunteered deviation — `inputValid()` skips `maxWords`/`maxLength`/`pattern`, not only the emptiness branches): **within `DD-1`'s "owns the verdict outright" language, and unreachable.** Measured, not assumed — `quantification-item.component.html` binds none of the three, a grep across the whole `innovation-use-details/components` tree returns one hit that is the word "pattern" inside an HTML comment, and neither T-03 nor T-12 adds a length or pattern constraint. → advisory.
2. **`isFilled()` change for non-string non-null values:** `.length === 0` was load-bearing only for a synthetic truthy `{length: 0}`, which the pre-existing suite covers at `:76-80` under `'off'` (still green). `InputValueType` is `string | number | null`; unreachable through any mode call site. → no defect.
3. **`'off'` regression guard:** correct and discriminating — matches `DD-1`'s "untouched", the *Rejected — fixing `!value` globally* note, Non-goals, and the still-open `OQ-3`.
4. **Disqualifier satisfied, not evaded.** The forbidden loop is value-in-via-`setValue()` / verdict-out-via-`inputValid()`; this diff drives `inputValid()` through the `getNestedProperty(signal())` seam and `isInvalid()` through `body()` in a separate block. Mocking `UtilsService`'s accessor is not `KZ-001` tautology because the gate was **observed red** with the mock already in place. Caveat recorded as advisory: with the mock returning a constant, the `component.signal` assignments are decorative and the extraction chain is unproven.
5. **`R-IUR-010`'s whitespace-`Unit` clause: mechanism discharged, requirement NOT.** → escalated as a spec gap, below.
6. **Scope:** no T-02 leakage. `#E69F00` left intact on the very line touched, dead `[style]` not deleted, `text-sm` untouched. The paren removal is semantically null (`||` binds tighter than `?:` in Angular's parser as in JS).

**`ADVISORY` (4R lens — recorded, non-gating, and per the Advisory rules these do not become tasks in this spec)**

- *Reliability* — narrow the early return, or comment the exclusion: `app-input` has 18 consumers, and a future author writing `requiredMode="filled" [maxLength]="80"` gets a silently inert length limit with no test to catch it. Unreachable today; discoverability is the ask.
- *Readability* — `component.signal` assignments in the `inputValid()` cases are decorative under a constant mock; `mockImplementation((obj, key) => obj?.[key])` would make the arrangement load-bearing at one line's cost.
- *Reliability* — the `-5` cases discriminate by argument, not observation. Suggested: whoever runs T-12 mutates the `nonzero` branch to `> 0` **once**, observes the red, and records it — the only observation that turns `DD-2`'s central user ruling into measured evidence.
- *Reliability* — `requiredMode` is a plain field read inside `computed()`, which tracks signals, not fields. Not reachable in this spec (all bindings are literals; path switches destroy/recreate via `@if`), and it is the pre-existing pattern for `isRequired`, so no new exposure. Recorded so a future dynamic binding is not written in ignorance.
- *Readability, positive* — the `@akili-spec` provenance comments, the note on why the two computeds read different sources, and the `type: 'number'` harness rationale are above the repo bar; keep them.

**Requirements covered (as delivered)** — `R-IUR-004` S1 + `AND IT MUST` · `R-IUR-005` AC.2/AC.3 · `R-IUR-009` S1 + `AND IT MUST` · `R-IUR-010`'s reject-`0` / accept-negatives clauses · `R-IUR-013` AC.2 (by inspection only; the full-suite proof is T-16's).
**NOT covered despite being listed on the task** — `R-IUR-010`'s reject-whitespace-only-`Unit` clause. See the Pivot Record.

**Cannot prove (`KZ-017`, carried from both worker and auditor)** — paint (`DC-1`, T-16 gate 3); the 15 untouched templates (inspection only, T-16 gate 1 owns it); package-wide coverage floors (uninformative from a targeted run, `K-020`); consumer specs were not executed against this diff. The Reviewer re-executed **nothing** — it holds `Read`/`Grep`/`Glob` only, and every command result above is the Implementer's, cross-checked against the working tree and the committed guides.

**Runtime failure recorded (not a work FAIL).** The first Reviewer dispatch for this task terminated on an API rate limit (`session limit`, HTTP 429) after beginning its source reads and before emitting any `STATUS:` line. Per `.agents/leader.md` and the root guide's non-delivery rule, absence of a verdict was recorded as a runtime failure rather than read as a clean result; the agent was resumed once with its context intact and its priority rulings named, and it then delivered the verdict above. **No inline Leader review was performed** — `author ≠ auditor` is not suspended by a runtime failure.

---

## Pivot Record: T-01 — `DD-4` cannot satisfy `R-IUR-010` AC.6 (client half unowned)

**Raised by:** T-01's Reviewer, filed deliberately outside its `ADVISORY` block as a blocking note.
**Verified independently by the Leader against source before this record was written (`KZ-007`).**
**Status: RESOLVED 2026-09-04 by user ruling — see the resolution block below.**

### The blocker

`R-IUR-010` mandates the trimmed `Unit` test twice, in binding language:

> **S1 `AND IT MUST`** — *"reject a **whitespace-only** `Unit`. The server's `valid_text` strips whitespace before measuring length, so `'   '` is invalid in SQL; the client does not trim anywhere today. Client and server MUST apply the same trimmed test, or a row renders complete, saves, and is unsubmittable with no message (`DC-3`)."* *(Added at Judgment Day round 1, finding `C-2`.)*
>
> **AC.6** — *"Whitespace-only `Unit` ⇒ amber treatment; green check `false`. Falsifying input: `'   '`."*

**`DD-4` has no input that can deliver it.** Its table is exactly four rows — `numberRequired`,
`unitRequired`, `commentsRequired`, `numberRequiredMode` — and only the *number* field gets a mode.
`unitRequired: true` lands on `app-input`'s legacy `isRequired`, whose branch is
`!value || value.length === 0`. `'   '` is truthy with `length === 3`, so it evaluates **valid**.
T-01 built the trimming mechanism (`isFilled()` trims strings) and proved it red-then-green, but
**nothing routes `Unit` into it.**

### Evidence (Leader-measured, this session)

| Check | Raw result |
| --- | --- |
| `grep -rn "unitRequiredMode\|unitMode" docs/specs/changes/innovation-use-required-fields/` | **exit 1, zero hits** — no unit mode exists anywhere in the spec: not in `design.md`, `requirements.md`, `tasks.md`, `proposal.md`, or `judgment.md` |
| `design.md` §`DD-4` table | four rows; `numberRequiredMode` is the only mode, "passed straight through to `app-input`'s `requiredMode`" |
| `tasks.md:154` (T-03) | *"Pass **`numberRequiredMode`** straight through"* — number only |
| `tasks.md:317` (T-12) | binds `[numberRequired] [unitRequired] [commentsRequired] [numberRequiredMode]` — `unitRequired` is a boolean, so mode stays `'off'` |
| `tasks.md:314` (T-12 coverage) | claims `R-IUR-010` **AC.1–AC.4** — does **not** claim AC.6 |
| `tasks.md:527` (§5 closure table) | credits *"S1 `AND IT MUST` reject whitespace-only `Unit` · AC.6"* to **T-01** + T-19 |
| `tasks.md:111` (T-01 coverage) | lists *"reject whitespace-only `Unit`"* among T-01's covered requirements |

**The client half of AC.6 therefore has no owner in the approved task set.** T-19 covers the SQL
half only. §5's closure table — the artifact whose stated purpose is that *"ID-level presence is not
closure"* and *"a gap is never discharged by citing a different requirement"* — credits the clause to
a task whose file scope (`input.component.{ts,html,spec.ts}`) structurally cannot discharge it.

### Reachability — confirmed, not theoretical

Type `'   '` into a measure `Unit`: the client renders no amber and saves the row; SQL's `valid_text`
rejects it, so the green check returns `false` with **nothing on screen explaining why**. That is
`DC-2b` + `DC-3` together — precisely the failure pair Judgment Day finding `C-2` was raised to close,
re-created inside the spec written to close it.

### Why this is a Pivot and not a rework

T-01 conformed to its design on every point its files govern and earned a Reviewer PASS. The defect
is in **`DD-4`'s input set**, one decision upstream — an approved design that cannot satisfy an
approved acceptance criterion. Consuming T-01 rework attempts against it would be spending the
ceiling on a task that is not wrong. Per `/akili-execute`'s Pivot Protocol and `.agents/leader.md` §5,
the loop stops and the user rules.

### Proposed amendment (NOT applied — awaiting approval)

Symmetric with the `numberRequiredMode` precedent already in `DD-4`, so it introduces no new pattern:

1. **`design.md` `DD-4`** — add a fifth row: `unitRequiredMode` · default `'off'` · Innovation Use passes **`'filled'`**. Note that OICR keeps `'off'` and its byte-for-byte falsy behavior.
2. **`tasks.md` T-03** — add `unitRequiredMode` to the inputs added, passed through to `app-input`'s `requiredMode`. Falsifying input: `'   '` in `Unit` must redden; OICR's default (no inputs passed) must stay untrimmed.
3. **`tasks.md` T-12** — bind `[unitRequiredMode]="'filled'"`. Falsifying input: `'   '` must redden with the required message.
4. **`tasks.md` §5 line 527** — reassign the clause from **T-01** to **T-03 + T-12 + T-19**, since T-01 cannot own it.
5. **Correction closure, both directions** (`/akili-specify` → *Correction Closure*, `KZ-005`): forward-grep the superseded claim in every phrasing (not only the literal string) — `DD-4`'s "four inputs", the "four per-field inputs" framing in T-03's title and §2.1, and any LOC/budget note counting four; then backward-grep every document that cites `DD-4` or `tasks.md:527`, since those now assert a falsehood. Re-grep for `unitRequiredMode` itself after the edit, per `KZ-005`'s second direction.

**Budget impact:** no new task. T-03 and T-12 both grow slightly; LOC stays within the re-baselined
~1,650. Review rounds +1 to +2 for the two amended tasks.

**Alternative considered and rejected by the Leader as a recommendation:** ship without the trimmed
`Unit` test and carry AC.6 as a known gap. Rejected because `R-IUR-010` states the clause in `MUST`
language, `DC-3` is the exact defect class the requirement was added to close, and the failure is
silent — the user sees a complete-looking row that cannot be submitted. This is the user's call, not
the Leader's, and it is offered here only so the choice is visible.

---

### T-15 — Documentation sweep (`DD-11`)

| Field | Value |
| --- | --- |
| **Final status** | **PASS** (Reviewer, attempt 2 of 3) |
| Date | 2026-09-04 |
| Implementer attempts | **2** |
| Effort assigned | attempt 1 `low` → attempt 2 **`medium`** (bumped one level per the rework rule — a failed fix is usually under-thinking) |
| Skills assigned | `cognitive-doc-design` (task's own list, unchanged) |

**Files changed** — `docs/ux-ui/design.md` (`:441`, `:560`, plus a new dated entry at the bottom of §12.2) · `docs/specs/innovation-use/family.md` (`:113`). No path under `docs/specs/archive/` touched.

#### Attempt 1 — Reviewer `STATUS: FAIL`, 2 issues

All three ordered edits landed, and the Reviewer explicitly upheld the `:560` supersede mechanics, the `R-IUR-006`…`R-IUR-009` citation choice, the `family.md` correction, and the judgment to leave `family.md:36` alone. It failed on two:

1. **`:441` was internally self-contradicting.** The edit replaced the *"Every field on this card is optional"* sentence but left the earlier clause in the **same line** reading *"OTHER name, **an optional count**"* — so the line declared the count optional, then required, then that everything else was optional. The stale claim `DD-11` exists to remove survived in a second clause, landing on the one field rule 9 governs. *Violated:* `DD-11` row 1 + §3.1 rule 9.
2. **The new decision entry asserted a falsehood.** It closed with *"The 2026-08-21 entry above is left unedited"* — false, since the same diff adds a `SUPERSEDED` marker to that entry's `:560` sub-bullet. *Violated:* `KZ-007` (a correction record read as settled fact, rarely re-verified, written directly beside the edit contradicting it) + the cited convention at `design.md:512`.

#### Attempt 2 — Reviewer `STATUS: PASS`

Both remediations taken as written: `an optional count` → `and a count`, and the false sentence replaced with *"The 2026-08-21 entry's decision and rationale prose are preserved verbatim; only a SUPERSEDED marker pointing here was added…"*, with the rot-prone in-prose `line 512` citation dropped in favour of quoting the convention text itself.

**Verification**

| Check | Pre-edit | Post-edit |
| --- | --- | --- |
| `grep -n "an optional count" docs/ux-ui/design.md` | match at `:441`, exit 0 | no match, **exit 1** |
| `grep -n "left unedited" docs/ux-ui/design.md` | match at `:563`, exit 0 | no match, **exit 1** |
| `grep -n "Every field on this card is optional" …` (attempt 1) | match at `:441`, exit 0 | no match, exit 1 |
| `grep -n "would change the frozen" family.md` (attempt 1) | match at `:113`, exit 0 | no match, exit 1 |

Raw output read for errors before counting, no truncation (`K-014`). **Both post-edit greps re-measured independently by the Leader**, not taken on the Implementer's word.

**Reviewer's source verification (attempt 2)**

- `:441` maps 1:1 onto §3.1 rules 6–9 — *neither broader nor narrower* — and the cited `R-IUR-006`…`R-IUR-009` map 1:1 to those rules. It further confirmed at `innovation-use-organization-item.component.html:154-164` that `Organization count` renders only inside the unknown-path `@else`, so the path-scoping is correct.
- Issue 2's replacement sentence is **exactly** true: within the 2026-08-21 entry the diff touches only `:560`, only inside the spec-ID parenthetical; the bolded decision statement and every word after `*Rationale:*` are byte-identical; `:558`/`:559`/`:561` are untouched context. Nothing overclaimed, nothing concealed.
- The quoted convention is verbatim at `design.md:512`, and the new entry is appended last in §12.2, so the convention it cites is also obeyed.
- `family.md:36`'s "frozen" refers to the inter-chunk **API contract**, not `innovation_use_validation` — leaving it unedited was correct.
- The surviving *"every field here is optional — no asterisks"* strings live only at `docs/specs/archive/2026-08-26-innovation-use--details-page/{design,tasks}.md` (explicitly out of scope) and in this spec's own quotations of the stale text. **No paraphrase of either failed claim survives in a live document.**

**`ADVISORY` (non-gating)**

- *Risk* — **doc claims lead the code inside PR 1.** `innovation-use-details.component.ts:353` still seeds `[new InnovationUseActor()]`, so the new entry's present-tense *"The client no longer creates a blank actor row"* is not yet true of the working tree; `:441`'s required-field description likewise precedes T-07…T-09. This is **authorized** — `tasks.md:86` makes T-15 independent and runnable at any point in PR 1, and `tasks.md:97` bundles T-01…T-16 into one PR whose definition of done requires all of them — and it is categorically unlike attempt 1's defect, which no later task could have made true.
- *Readability, pre-existing and out of scope* — §12.2 carries a verbatim duplicated 2026-07-28 entry at `:554`/`:556`, and the 2026-07-28 entries sit below the 2026-08-12/13 ones, against the section's own bottom-append convention. Neither introduced nor worsened by this diff.

> **FORWARD POINTER → T-16 (Leader-owned; must be copied into T-16's brief).** Fold a re-read of two doc claims into T-16's gate: `docs/ux-ui/design.md:441` (per-path required fields) and the 2026-09-04 §12.2 entry (*"no longer creates a blank actor row"*). Both are true only once T-07…T-09 and T-11 have landed. If T-11 is dropped or descoped, these become **false statements of fact on a live blueprint**. Raised by T-15's Reviewer as a recommendation for the Leader, explicitly not for the Implementer.

**Requirements covered** — `R-IUR-002` **AC.4**, in full.

**Cannot prove (`KZ-017`)** — nothing about code behavior, paint, or rendered appearance; documentation-only, and the diff makes no visual claim (no tokens or CSS touched, so the design-token and budget lenses are structurally inapplicable). The Reviewer holds `Read`/`Grep`/`Glob` and **no shell**, so it could not independently observe the pre-edit red for either grep — it corroborated that half from the diff's own `-` lines plus the Implementer's and Leader's measurements, and instead verified the stronger property for issue closure (no literal or paraphrased survival in any live document). `family.md`'s *"no longer frozen"* is verified against `design.md` §5's stated migration plan, **not** against a migration file — T-18 is unwritten and T-20 has not run; the claim holds under a governance reading, and is PR-2-pending under a shipped-code reading.

**Runtime failure recorded (not a work FAIL).** The attempt-2 Reviewer dispatch terminated on an API rate limit (`session limit`, HTTP 429) before emitting any `STATUS:` line. Recorded as a runtime failure per the non-delivery rule rather than read as a clean result; the agent was resumed once with its context intact and its priority ruling named, and then delivered the verdict above. No inline Leader review was performed.

### Pivot Record: T-01 — RESOLVED 2026-09-04 (user ruling: amend `DD-4`, T-03, T-12)

**Ruling:** the user selected the amendment option at the T-01 gate. Applied in full; nothing deferred.

| # | Edit | Site |
| --- | --- | --- |
| 1 | `DD-4` table gains a fifth row — `unitRequiredMode` · default `'off'` · Innovation Use passes **`'filled'`** — plus a rationale paragraph recording why the four-input table could not satisfy AC.6, why `'filled'` (not `'positive'`/`'nonzero'`) is the correct mode for a free-text field, and that OICR receives `'off'` for both modes | `design.md` `DD-4` |
| 2 | T-03: title, `Design` line, `Description` (both modes passed through), and `Verify` (assert **both** modes default to `'off'` so OICR stays untrimmed, `R-IUR-010` AC.5) | `tasks.md` T-03 |
| 3 | T-12: title, `Design` line, `Description` (`[unitRequiredMode]="'filled'"`), `Requirements covered` (AC.6 + S1's clause added), and a **falsifying input** — `Unit = '   '` must redden, and dropping the binding must turn it green again, which is the observation that proves it load-bearing (`K-004`) | `tasks.md` T-12 |
| 4 | §5 closure table line 527 reassigned: `R-IUR-010` S1 whitespace clause + AC.6 from **T-01** → **T-03 + T-12** + T-19, with the reason inline | `tasks.md` §5 |
| 5 | §10 cross-check row for *"whitespace-only `Unit` rejected"* corrected — it cited only §3.3 + `DD-1` (the trimming **mechanism**) with no routing, which is how the phantom coverage passed the Phase 3 gate | `design.md` §10 |

**Correction closure — both directions (`KZ-005`), with the miss recorded**

*Forward* (the superseded claim in every phrasing, not only the literal string): five live sites carried a four-input count — `DD-4`'s heading, `tasks.md` §2's mermaid node, T-03's title, T-12's title, and **`design.md` §2.1's composition row**. All five corrected to five.

**§2.1 was missed by the first forward grep** and found only on the second pass. The first sweep searched `four inputs`, `four per-field`, `four new inputs`, `into four`, `4 inputs`; §2.1 reads **`4 per-field inputs`** — a phrasing none of those patterns matched. This is `KZ-005` demonstrating itself inside the very sweep written to honour it: *sweep the claim, not the string.* The closing sweep used the pattern `(four|4) (per-field|new |live )?inputs?` case-insensitively across all four spec documents and returns **exit 1, zero hits**.

*Backward* (documents citing `DD-4` or the reassigned §5 line): `design.md:239` (`DD-4` removes the dead `[validateEmpty]` bindings) and `design.md:249` (`DD-2`'s `numberRequiredMode` reference) re-read and confirmed **still true** — neither asserts an input count. `design.md:51` and `judgment.md:31`/`:61` are point-in-time correction and finding records about a *different* correction (`numberAllowsZero` → `numberRequiredMode`) and are correctly left unchanged, per the same convention that leaves `docs/specs/archive/` alone.

*Second direction* (`KZ-005`'s re-grep for the value the correction itself introduces): `unitRequiredMode` now appears at 4 sites in `design.md`, 5 in `tasks.md`, 7 in `execution.md` — no orphan reference, no site naming it without defining or consuming it.

**Requirements impact:** none. `R-IUR-010` S1 and AC.6 are unchanged — they were always correct; the design was incomplete relative to them. `requirements.md` was not edited, which is the right outcome: this pivot corrected a design and a decomposition, not an intent.

**Budget impact:** **no new task** — the task count stays at 20, still the `RB-8` re-baselined figure. T-03 and T-12 each grow by roughly one input and one test case; LOC stays inside the re-baselined ~1,650. Review rounds +1 to +2 across the two amended tasks. **No tripwire escalation owed.**

**No ADR affected** — `DD-4` is a spec-local design decision, not a TRD architecture decision, so no superseding `ADR-NNN` is owed to `/akili-archive`'s constitution sync.

---

### T-02 — `app-input`: tokenize the five live literals, delete the dead `[style]`

| Field | Value |
| --- | --- |
| **Final status** | **PASS** (Reviewer, attempt 1) — **token compliance passes; VISUAL claims recorded INCONCLUSIVE** pending T-16 gate 3, per this task's own Disqualifier |
| Date | 2026-09-04 |
| Implementer attempts | **1** |
| Effort assigned | `medium` (task said `S`; raised for the `P-2` inversion trap, two near-identical `[style]` lines where confusing them is destructive, and a decision requiring reasoning) |
| Skills assigned | `ui-ux-pro-max`, `angular-developer` (task's own list, unchanged) |

**Files changed** — `input.component.html` (6 sites) · `input.component.spec.ts` (+225 lines, 1 import)

| Site | Branch | Before → After |
| --- | --- | --- |
| `:30` | `pInputText` (text) — **LIVE** | `[style]` `#E69F00` → `var(--ac-warning-1)` — **converted, kept** |
| `:49` | `p-inputNumber` — **LIVE** | class `border-[#E69F00]` → `border-[var(--ac-warning-1)]` — **converted, kept** |
| `:55` | `p-inputNumber` — **DEAD** (`P-1`) | **deleted entirely** |
| `:59` | helper text | `text-[#8D9299]` → `text-[var(--ac-grey-600)]` |
| `:65` / `:71` | amber messages | `text-[#E69F00] text-sm` → `text-[var(--ac-warning-1)] fs-[14] leading-[1.25rem]` |

**Zero hex literals remain in the file** (Leader-measured: `grep -c 'E69F00'` → 0, `grep -c '8D9299'` → 0).

**The `P-2` inversion held.** `:30` and `:55` were both amber-border `[style]` bindings and near-identical; converting the wrong one removes the only amber border from every text field in the application, and revisions 3–4 of the design ordered exactly that mistake. The Implementer read each enclosing `@if`/`@else if` before touching either and quoted both branches back; the Reviewer re-verified against the current file. Matches `DD-10`'s corrected "two lines swap fates" table.

**The `text-sm` decision (`N-8`) — option (b), explicitly recorded**

`fs-[14]` **paired with `leading-[1.25rem]`**. The Implementer justified it from the shipped exemplar rather than preference: the actor and organization cards already use `fs-[14]` for required-message text, and `requirements.md:163` names `fs-[14]` by name. Recorded three ways in-tree (block comment, `describe` title, `it` title) and asserted both positively (`toContain('leading-[1.25rem]')`) and negatively (`not.toContain('text-sm')`).

Equivalence verified rather than asserted — the Leader confirmed `.fs-[14]` emits a plain `font-size: 14px` (`responsive-size.scss:18`, no fluid scale), and the Reviewer closed the two seams the Leader had flagged as open:

- **No root font-size override exists** — repo-wide grep for `^\s*html\s*[,{]`, `html, body`, `font-size: 62.5%` → **0 matches**, no `tailwind.config.*`, no `@theme` block. So the 16px default holds and `0.875rem === 14px`.
- **The `md:` `!important` concern does not materialize** — `responsive-size.scss:112` generates `.md\:fs-\[14\]` as a **separate class name**; the diff authors only `fs-[14]`, so nothing fires in the `(orientation: landscape) and (height <= 768px)` block.
- One mechanism change neither the Leader nor the Implementer named, found by the Reviewer: Tailwind v4.1.6 emits `text-sm`'s line-height as the **unitless ratio** `calc(1.25 / 0.875)` (inherits as a factor) whereas `leading-[1.25rem]` is an absolute length. The only descendant with its own font-size is the `!text-base` icon, unaffected either way. Identical in every case constructible → advisory, not a defect.

**Verification**

- `npx eslint <.html> <.spec.ts>` → 0 errors on the `.html`; one expected "File ignored" warning on the spec.
- `npx jest input.component.spec --coverage=false --silent` → **123/123**, 3 suites.
- `npm test -- --silent -- input.component.spec` → 123/123 pass, **exit 1** on project-wide coverage floors — the documented `K-020` false negative (`client/research-indicators/src/CLAUDE.md:152`), independently confirmed by the Leader.
- `npx tsc -p tsconfig.spec.json --noEmit` filtered to the two touched files → **0 lines**.
- **RED observed** (`K-004`): `:30`'s token reverted to `#E69F00` produced `Expected value: ["2px solid var(--ac-warning-1)"] / Received array: [["2px solid #E69F00"]]` — the spy fires once with the real value and the matcher rejects the wrong one, so the gate **discriminates by value**, not merely by presence.
- **LEADER FULL-SUITE RE-MEASURE**, run in the worker-idle window per `.agents/leader.md` (no worker active, no concurrent full-suite run): `npm test -- --silent` from `client/research-indicators/` → **317 suites passed, 6823 tests passed, 0 failed, exit 0**. Coverage: statements 98.21%, branches 96.33%, functions 97.82%, lines 98.5%. **No consumer regression** across the template's 18 consumers from T-01 or T-02. This is evidence toward `R-IUR-013` AC.2 but does **not** discharge T-16 gate 1, which owns the formal gate and must run after every client change has landed.

**The cascade rule — the finding no test can produce**

`DD-3` / `R-IUR-003` S1's `AND IT MUST NOT`: **CLEAN** on the Reviewer's reading. The `pInputText` element carries only `text-[14px]` (pre-existing), `[class]="inputValid().class"` (which emits `ng-invalid ng-dirty` only — `input.component.ts:199`, never a `border-*`), and the `[style]` object. No `border-*` utility reached it; `p-select` does not appear in this template at all. The single `border-*` utility in the diff sits on `p-inputNumber`, the documented exception (`requirements.md:174`, `design.md:272`). The Implementer explicitly declined to manufacture a test appearing to cover this and stated it rests on review — **the `KZ-014`-compliant behavior**, since no red is available (`DC-1`).

**Assertion placement (`KZ-001`)** — both new mechanisms land on generated DOM output, not on a call sequence. The Reviewer established that Angular's `DefaultDomRenderer2.setStyle` writes non-dash-case props as `el.style[prop] = value`, so the `CSSStyleDeclaration.prototype.border` **setter spy** intercepts the element's own style write. `element.style.border` is **never read** (grep returns one hit, inside a comment) — correct, because `cssstyle@2.3.0` drops a shorthand carrying `var()` and would read back empty whether the binding were right or broken. `:49` is asserted on the rendered class string off the `InputNumber` host.

**Scope** — T-01's two `describe` blocks survive intact, as do all pre-existing suites. Every sibling custom-field still carries its own hex (`select`, `multiselect`, `radio-button`, `textarea`, `calendar-input`) — correctly left to their own tasks. No T-03/T-12 leakage. The new `ActionsService` import/mock is a **justified necessity**, verified at source: `save-on-writing.directive.ts:9` does `inject(ActionsService)`, the directive applies only on the `type === 'text'` branch, and `ActionsService`'s constructor calls `validateToken()` — so `:30` could not be rendered at all without it, and every pre-existing suite in this file avoided `type: 'text'` for exactly that reason.

**Dark-theme `--ac-grey-600` delta — the one behavioural change this task introduces**

Leader-measured and Reviewer-confirmed independently: `--ac-grey-600` is `#8d9299` in `:root` (`colors.scss:33`) but **`#949494`** in `[data-theme='dark']` (`colors.scss:148`, block opens `:122`). `--ac-warning-1` is `#e69f00` in both (`:48`, `:156`), so the four amber conversions are genuinely zero-delta in both themes; **the grey is zero-delta in light only.**

`design.md` asserted *"Both colour changes are zero-delta by registry"* — **false as written**, and corrected in this commit (`DD-10`) rather than left standing, per `KZ-007` and the root guide's ban on letting docs and code drift. The earlier citation pair `:33` / `:108` never named the dark block; `:108` is the `$colors` SCSS map entry, which only generates class names. That omission is how the light-only claim came to read as universal.

**Ships as ordered, no spec amendment needed** (Reviewer ruling, Leader concurring): `DD-10` names `--ac-grey-600` unambiguously, a hardcoded hex cannot respond to `data-theme` at all so tokenizing is the point of `G-3`, `#949494` is strictly better contrast on the dark surface, and root `CLAUDE.md` §4.2 mandates relying on tokens over branching on `isDarkMode()`. Reachability confirmed: `DarkModeService` sets `data-theme` on `document.documentElement`, and the payload is every `app-input` with `helperText` — `innovation-details.component.html:31`, `oicr-form-fields.component.html:20`, `submit-result-content.component.html:58`, `evidence.component.html:10`.

**`ADVISORY` (4R lens — recorded, non-gating; per the Advisory rules none of these becomes a task in this spec)**

1. *Risk / Readability* — the dark-theme grey delta lands in the only theme T-16 gate 3 does not inspect (gate 3 is scoped *light theme*). Recorded above and in `DD-10`; **whether gate 3 gains a dark-theme helper-text look is escalated to the user at this gate**, not widened silently.
2. *Reliability* — T-02 makes `'2px solid var(--ac-warning-1)'` reachable from a **second** emitter inside `innovation-use-details.component`'s fixture (`app-input`'s `:30`, via `quantification-item`). The prototype-wide cohort spy at `innovation-use-details.component.spec.ts:2542-2545` uses `toContainEqual`, so its power to discriminate the actor-type `p-select` binding is now weaker than its name claims (`KZ-001`). Reviewer verdict: **plausibly reachable, could not construct or execute it** (read-only, no `Bash`). The two `not.toHaveBeenCalled()` assertions at `innovation-use-actor-item.component.spec.ts:350`/`:386` are **not** at risk — this diff changes the setter's argument, never whether it is called. → **forward pointer filed to T-04**, below.
3. *Readability* — `:59`'s helper row now mixes idioms (`text-[14px]`) against the two rows below it (`fs-[14] leading-[1.25rem]`). Outside T-02's ordered scope (`DD-10` ordered only `text-sm` converted). The identical `text-[#E69F00] text-sm` pair at `radio-button.component.html:33` should reuse T-02's line-height decision verbatim whenever a task tokenizes it.
4. *Readability* — the negative `:30` test asserts only the spy's absence, so it would also pass if the input never rendered; one `expect(query(By.css('input[pInputText]'))).toBeTruthy()` makes it non-vacuous. Its title says "clears on fill" but it constructs the valid state rather than transitioning into it (`KZ-015`) — **not a gate here**, because `tasks.md:506` assigns "S1 amber appears and clears" to T-01 (logic) and T-02 owns only the token.
5. *Risk* — `fs-[14]` is px where `text-sm` was rem, so message text no longer scales with a user's browser default font size. **Not a deviation** — `requirements.md:163` mandates `fs-[14]` by name and `docs/ux-ui/design.md:376` sanctions `.fs-[n]` as the per-element override — but it is the one a11y-adjacent consequence of `G-3` worth having on the record.

> **FORWARD POINTER → ~~T-04~~ → T-12 — RE-ROUTED 2026-09-04 at the T-04 dispatch gate.** Scope the prototype-wide `border` setter spy at `innovation-use-details.component.spec.ts:2542-2545` to the specific element.
>
> **Why re-routed (Leader, verified at source before rewriting this record — `KZ-007`):** T-02's Reviewer suggested T-04 take this, reasoning that T-04 owns the actor card's `p-select` border assertions. But the spy in question lives in **`innovation-use-details.component.spec.ts`**, which is **not** in T-04's `Files` list (T-04 owns `innovation-use-actor-item/*` only). Assigning it to T-04 would have widened an approved task's file scope to absorb an advisory — exactly what the Advisory rules forbid.
>
> **T-12 is the correct owner on both counts.** It owns that spec file, *and* it is the task that **creates** the collision: `app-input` defaults to `type='text'` (`input.component.ts:32`), so `quantification-item`'s `Unit` field renders the `pInputText` branch whose `[style]` border T-02 tokenized — and T-12's `[unitRequiredMode]="'filled'"` binding is what first makes an empty `Unit` invalid, firing that second emitter of `'2px solid var(--ac-warning-1)'` inside this fixture. Before T-12 the string has one emitter there; after T-12 it has two, and `toContainEqual` can no longer attribute the write to the actor-type `p-select`.
>
> **Not applicable to the actor card's own spec.** Within `innovation-use-actor-item.component.spec.ts` the `[style]` emitters are both card-owned — the `p-select` (`.html:35`) and the "Specify other" `pInputText` (`.html:54`) — and the four counts are `type="number"`, which after T-02 carry the **class** mechanism and emit no style border at all. The in-tree exemplar at `:291`/`:298` is therefore still sound today, but only because a fresh `InnovationUseActor()` leaves `actor_type_id` unset, so the `@if` at `.html:50` never renders the second emitter. **Any new test that sets `actor_type_id` to OTHER makes `toContainEqual` ambiguous in this file too** — carried into T-04's and T-06's briefs as a caution. Since T-02, `'2px solid var(--ac-warning-1)'` has a second emitter in that fixture (`app-input` `:30` via `quantification-item`), and the spy's `toContainEqual` can no longer prove the assertion belongs to the actor-type `p-select`. T-04 already owns the actor card's `p-select` border assertions, so this falls inside its existing scope — it is a precision fix to an assertion T-04 must rely on, not new scope.

> **FORWARD POINTER → T-16 (Leader-owned; cumulative, now three items).** Gate 3 must name **in words** (`KZ-002`): (a) the amber border on a **text** field (`:30`, `[style]` mechanism), (b) the amber border on a **number** field (`:49`, class mechanism), (c) the message rows' line-height after the `fs-[14] leading-[1.25rem]` swap. Plus the two T-15 doc claims already filed. Gate 3 is the **only** owner of every visual claim in T-01 and T-02.

**Requirements covered** — `R-IUR-003` AC.1–AC.3 (`app-input` half) and S1's `BUT`/`AND IT MUST NOT` pair · `NFR-IUR-002`. **All at token-compliance level only.**

**Cannot prove (`KZ-017`)** — **paint.** No check here observes a painted border or a computed line-height; jsdom computes no layout. `border-[var(--ac-warning-1)]` and `text-[var(--ac-grey-600)]` rely on Tailwind v4's arbitrary-value type inference defaulting to *colour* for an un-inferable `var()`; the Leader corroborated the idiom is established (91 `border-[var(--…)]`, 141 `text-[var(--…)]`, 139 `leading-[…]` occurrences in shipped templates) but **corroboration is not observation**. Additionally the Reviewer flagged that `index.html:9` loads `colors.css` from an **external S3 bucket** which, if it redefines `--ac-*`, means the effective runtime values are not the committed SCSS ones — neither agent could fetch it. That cuts *in favour* of this diff (a hardcoded hex bypasses the override entirely), but the Q4 numbers are from committed SCSS only. Per this task's Disqualifier, **its visual claims are INCONCLUSIVE, never passing, until T-16 gate 3 runs.**

### T-16 gate 3b added — user ruling at the T-02 execution gate, 2026-09-04

**Ruling:** widen T-16 gate 3 by one item rather than shipping the dark-theme delta on recorded reasoning alone.

`tasks.md` T-16 now carries **gate 3b** — one dark-theme look at an `app-input` carrying `helperText` — with its reason inline, plus gate 3's field list made explicit (text-field border, number-field border, message line-height, and the two T-15 doc claims). §7's Definition of Done gained the matching checkbox.

**Why this is recorded as a user decision and not a Leader edit.** The Advisory rules forbid a Leader minting work from an advisory or widening an approved task to absorb one — advisories are the least-vetted findings in a run and that path grows scope fastest from the weakest evidence. This addition came from T-02's `ADVISORY 1`, so the Leader escalated it at the gate instead of applying it. The user chose to add it. The alternative offered and declined was leaving gate 3 light-theme-only and relying on `DD-10`'s recorded reasoning; a third option (reopening the whole visual-coverage question via the Pivot Protocol) was also offered and declined as disproportionate.

**Budget impact:** none — no new task, no LOC. Gate 3 is a human observation the user already performs; this adds one look while they are already in a browser.

---

### T-03 — `quantification-item`: replace `fieldsRequired` with five per-field inputs

| Field | Value |
| --- | --- |
| **Final status** | **PASS** (Reviewer, attempt 1). Leaves the branch **intentionally red** until T-12 — see *Collateral state* below |
| Date | 2026-09-04 |
| Implementer attempts | **1** |
| Effort assigned | `high` (task said `M`; raised because `DC-5` makes a silent OICR regression the failure mode, the only instrument able to prove AC.5 is the very suite being rewritten, and `DC-8` means stale spec references survive `ts-jest` silently) |
| Skills assigned | `angular-developer`, `ui-ux-pro-max`, **`tdd`** |
| Skill deviation | **`tdd` added** — not to drive red-green, but for its **anti-pattern** guidance (implementation-coupled, tautological, blind-double tests). This task's Disqualifier is a textbook blind-double trap and the spec rewrite is where that guidance pays. Recorded per `.agents/leader.md` → *Delegation Discipline*. |

**Files changed** — `quantification-item.component.ts` (+5 inputs, −1) · `.html` (3 `@if` conditions + 2 bindings) · `.spec.ts` (describe block rewritten wholesale)

| Site | Before → After |
| --- | --- |
| `.html:16→17` Number | `@if (fieldsRequired)` → `@if (numberRequired)`; `[isRequired]="numberRequired" [requiredMode]="numberRequiredMode"`, `[validateEmpty]` **removed** |
| `.html:22→23` Unit | `@if (fieldsRequired)` → `@if (unitRequired)`; `[isRequired]="unitRequired" [requiredMode]="unitRequiredMode"`, `[validateEmpty]` **removed** |
| `.html:30→31` Comments | `@if (fieldsRequired)` → `@if (commentsRequired)`; `[isRequired]="commentsRequired"` on `app-textarea` (**no** `requiredMode` — that input exists only on `app-input`, per `DD-4`) |
| `.ts` | `fieldsRequired` removed; `numberRequired`/`unitRequired`/`commentsRequired` = `true`, `numberRequiredMode`/`unitRequiredMode` = `'off'` |

**Two structural facts the Leader verified and briefed, absent from the task file**

1. **The card owns all three asterisks.** They are rendered by the card's own `<h2 class="label">…@if (…) {*}</h2>`, not by `app-input` — because no call site passes `[label]` and `app-input`'s asterisk sits inside `@if (label)`. So T-01's asterisk change is inert here, converting the card's three conditions is what discharges AC.1, and adding a `[label]` binding would render **two** asterisks per field. Reviewer confirmed no `[label]` was introduced and that both children gate their own asterisk behind `@if (label)`; also that `By.css('h2.label span')` is structurally safe because the children emit `<label class="label">`, never an `h2`.
2. **`Comments` is an `app-textarea`, not an `app-input`** — so `commentsRequired` is boolean-only with no mode to pass. Correct by design (`DD-4`), not an omission. Briefed explicitly so no mode input would be invented on `app-textarea`.

**Verification**

- `npx eslint` on the `.ts` and `.html` → clean, no output.
- `npx jest quantification-item.component.spec --coverage=false --silent` → **48/48 PASS**.
- `npm test -- --silent -- quantification-item.component.spec` → 48/48 pass, **exit 1** on coverage floors (`statements 5.26%`) — the documented `K-020` false negative, independently confirmed by the Leader at `client/research-indicators/src/CLAUDE.md:152`.
- `npx jest oicr-details.component.spec --coverage=false --silent` → **56/56 PASS**, reported and recorded as a *"did not break OICR outright"* sanity check and **explicitly not** as AC.5 evidence.
- `npx tsc -p tsconfig.spec.json --noEmit`, normalized and restricted to `quantification-item.component`, true-before (`HEAD` files) vs. true-after → **identical sets**, both exactly the 5 pre-existing `TS2552: Cannot find name 'SimpleChanges'`. No new errors.

**AC.5 evidence — the hard part of this task**

`R-IUR-010` AC.5 cannot be proven from OICR's own suite: `oicr-details.component.spec.ts:872-880` stubs the card with an empty-template `FakeQuantificationItemComponent`, so a green OICR run is compatible with all three asterisks having vanished (`KZ-001`, and this feature has already paid for it once — `C-3`/`S-7`). The proof therefore lives in `quantification-item.component.spec.ts`, against the **real** component in its **default, no-inputs-passed** configuration.

**The Reviewer independently confirmed that configuration is byte-for-byte the OICR call-site shape**, reading the source rather than accepting the claim: `oicr-details.component.html:60-62` binds only `[quantification]`, `[quantNumber]`, `[disabled]`, `(update)`, `(delete)`; `:81-84` adds only `[headerLabel]`. Neither passes any of the five required-related inputs, nor `[label]`, nor `[min]`/`[max]`/`[maxFractionDigits]`/`[placeholder]`. It found a **second, independent witness**: the stub's own declared input list (`quantification`, `quantNumber`, `headerLabel`, `disabled` + two outputs) corroborates what the real template binds.

**Mutation evidence (the task's falsifying input):** `commentsRequired`'s default flipped to `false` → **6 failures**, including `Expected: 3, Received: 2` on the three-messages test; reverted; 48/48 green again. The Reviewer checked the failure **count** for internal consistency against the code and derived exactly 6 (defaults, forwarding, three-asterisks, three-messages, and the two sibling per-field tests dropping 2→1, while the `commentsRequired=false` test itself keeps passing since it expects 2 either way) — arithmetic a fabricated or mis-scoped count would not match.

**Mode-forwarding discrimination — record this precisely (`KZ-014`)**

The two mode-forwarding tests set a **non-default** value (`numberRequiredMode='nonzero'`, `unitRequiredMode='filled'`) and assert the child received it plus that the sibling stayed `'off'`. Since `app-input`'s own default is `'off'` (`input.component.ts:50`), they **discriminate a deleted or cross-wired `[requiredMode]` binding by construction** — deletion drops the child to `'off'` and reddens the assertion; cross-wiring reddens the paired sibling assertion.

**This red is reasoned structurally, NOT observed.** It must never be recorded as observed RED. The Implementer's own report *understated* its evidence here, claiming these tests "cannot produce a self-contained red from a source mutation without re-editing"; the Leader challenged that reading and the Reviewer ruled the challenge correct. An implementer being too hard on itself is not a defect, but the record must be accurate either way (`KZ-007`). The complementary mutation class — changing the defaults — is covered by the separate defaults test, so the mode inputs are pinned on both axes.

**Record correction (`KZ-007`)** — the Implementer labelled its `3 failed / 39 passed` baseline run *"before touching anything."* **That label is impossible and is corrected here.** Those three tests were green in the Leader's post-T-02 full-suite run (6823/6823, exit 0), which included this spec file; they can only redden **after** the `.ts`/`.html` edit. The run is valid and its blast-radius finding stands — the correct label is **after the source edit, before the spec rewrite**, which is also what the in-code comment at `.spec.ts:108-110` says. Caught by the Reviewer, confirmed by the Leader against its own prior measurement.

**Coverage question — ruled: no loss, a strict upgrade.** The old suite had one test asserting `fieldsRequired = false` dropped **all three** asterisks (`length === 0`); the rewrite replaces it with three independent per-field tests (`length === 2` each). Neither `DD-4` nor `R-IUR-010` names an all-three-off case and no call site produces one (`DD-4` gives OICR `true/true/true` and Innovation Use `true/true/false`). The old assertion was a **cohort assertion** that could not attribute any asterisk to any flag — `KZ-001`'s exact failure mode — whereas each new test pins one flag *and* asserts the sibling child's `isRequired` is untouched. Raised by the Leader as a possible regression; ruled an upgrade over an unreachable configuration.

**`R-IUR-013` AC.1 — OICR byte-identical, traced not assumed.** Every new input defaults to `true`/`true`/`true`/`'off'`/`'off'`. The Reviewer traced `inputValid()` after T-01 per value class (`null`, `''`, `0`, `'   '`, non-empty): with `requiredMode === 'off'`, `:222` `isRequired && (!value || value.length === 0)` returns the required message first, and `:225`'s `validateEmpty && !value` is only reachable when `value` is truthy — at which point `!value` is false. So the branch is **unreachable while `isRequired` is `true`** (OICR, both fields) and inert while false; removing the bindings changes nothing OICR sees. `isInvalid()` never reads `validateEmpty` at all. `validateEmpty` itself is untouched on `app-input`, as `DD-1`/`S-8` require.

**Consumer enumeration by what renders (`KZ-002`)** — repo-wide, unfiltered: `app-quantification-item` has exactly **three** call sites (`oicr-details.component.html:60`, `:81`, `innovation-use-details.component.html:222`). Only the third binds `fieldsRequired`. No fourth consumer, no `.ts`-side reference outside the rewritten spec.

### Collateral state — the branch is intentionally RED until T-12 lands

The Reviewer predicted two collateral reds structurally, having no execution tools. **The Leader measured both.** Neither is a T-03 defect; both are the spec's own T-03→T-12 sequencing, which `tasks.md` §2 orders, §3 bundles into one PR gated only at T-16, and `design.md`'s `S-5` paragraph anticipates.

| Predicted | Leader measurement |
| --- | --- |
| `innovation-use-details.component.spec.ts` c10 reddens — the measures card now falls back to `true` defaults while `:227` still binds the removed input | **CONFIRMED.** `npx jest innovation-use-details.component.spec --coverage=false --silent` → **1 failed / 150 passed**, failing at exactly the predicted line `:383` `expect(hasAsteriskTextNode(quantificationsCard)).toBe(false)` — `Expected: false, Received: true` |
| `npm run build` red with NG8002, so T-16's gates are unreachable until T-12 | **CONFIRMED.** `✘ [ERROR] NG8002: Can't bind to 'fieldsRequired' since it isn't a known property of 'app-quantification-item'. Error occurs in the template of component InnovationUseDetailsComponent.` · `Application bundle generation failed. [5.428 seconds]` · build exit **1**. *(`K-014` note: the grep pipeline reported exit 0 while the build itself exited 1 — the raw output is the signal, not the pipeline's status.)* |

`innovation-use-details.component.html:227` (`[fieldsRequired]="false"`) was left deliberately, flagged by the Implementer in its `Not Done`, and ruled the correct intermediate state by the Reviewer: T-12's Files line explicitly owns that template **and** its spec, so repairing it inside T-03 would be scope leakage.

> **FORWARD POINTER → T-12 (Leader-owned; must be copied into T-12's brief).** T-12 must **rewrite** the c10 assertion at `innovation-use-details.component.spec.ts:357`–`:384`, not merely restore it to green. `R-IUR-010` AC.1 **deliberately reverses** what that test asserts — measures now *do* carry asterisks on `Number` and `Unit`, and `Comments` does not. A T-12 that makes the suite green by re-satisfying the old expectation has re-implemented the behaviour the requirement removes. Also: `npm run build` and the full client suite are **both red in this window** and only T-12 restores them, so neither red may be read as a new defect before T-12 lands.

**`ADVISORY` (4R — recorded, non-gating; none becomes a task in this spec)**

1. *Reliability* — the three per-field tests assert the asterisk **count** (`2`), not which label lost its asterisk, so a hypothetical Number↔Unit swap of the two `@if` conditions would keep every count intact and pass. **Not reachable in this diff** (Reviewer read the template; wiring is correct per field) — test-strength, not a defect. Cheap hardening: key on the `h2.label` whose `textContent` starts with `Number`/`Unit`/`Comments`.
2. *Reliability* — the card's asterisk conditions are the bare booleans, so a consumer passing `numberRequired=false` **with** `numberRequiredMode='nonzero'` would get a required field with **no** asterisk, diverging from `DD-1`'s `isRequired || requiredMode !== 'off'` rule. **Could not construct such a call site** from anything current or spec-mandated (`DD-4` pairs every non-`'off'` mode with `required=true`). Closing it would read `@if (numberRequired || numberRequiredMode !== 'off')` — but that is a **`DD-4` change, not an implementation liberty**, so it is left alone.
3. *Risk / token compliance* — `.html:17`/`:23`/`:31` were rewritten this task and still carry `text-[#CF0808]`. **No new hex is introduced** (the literal is preserved verbatim) and `R-IUR-003`/`DD-10`/T-02 scope tokenization to `app-input` only, which is why this is advisory rather than a FAIL under the root guide's hex rule. Whether it belongs in a later sweep is a Leader/user decision, deliberately not taken here.
4. *Readability* — the `'off' | 'filled' | 'positive' | 'nonzero'` union is now duplicated in `quantification-item.component.ts` and `input.component.ts`. `app-input` exports no type alias; exporting `export type RequiredMode = …` would make a future fifth mode a one-line change instead of a three-site sweep.

**Requirements covered** — `R-IUR-010` AC.1, AC.3, **AC.5** (both OICR call sites) · S1's `BUT it must NOT change the OICR measure card` · `R-IUR-013` AC.1.

**Cannot prove (`KZ-017`)** — **paint** (`DC-7`): presence of the asterisk and message nodes is not visual verification; T-16 gate 3 owns it. The `tsc` set diff was **restricted to `quantification-item.component`** and structurally cannot see a new error elsewhere; the Reviewer closed that gap by grep instead (the only surviving `fieldsRequired` references outside the rewritten spec are a *comment* at `innovation-use-details.component.spec.ts:378` and the *template* binding at `:227`, and `tsconfig.spec.json` type-checks neither — the binding is caught by `ng build`, which the Leader has now measured as red). The **Reviewer executed nothing** — read-only wrapper, so every red it named was structural reasoning, explicitly not observation; the Leader measured both of its predictions and they held.

---

### T-04 — Actor card, disaggregated path: four required counts and one total message

**PASS on attempt 3 of 3.** Attempt 1 FAILED (no discriminating test for the guard); attempt 2 FAILED (a `KZ-014` red-claim in a comment) while discharging attempt 1's issue and correctly disproving an authorized advisory; attempt 3 PASSED.

| Field | Value |
| --- | --- |
| Date | 2026-09-04 |
| Effort assigned | attempt 1 `high` (task said `M`) |
| Skills assigned | `angular-developer`, `ui-ux-pro-max`, **`tdd`** (Leader addition — the three falsifying inputs form a cross-field truth table where red-first pays) |

**Leader pre-dispatch findings briefed to the Implementer (absent from the task file)**

1. **The collision is sharper than `tasks.md` states.** `total()` (`.ts:59-68`) sums only *present* counts, so `total() === 0` is true for **both** `0/0/0/0` (→ one total message, zero required) **and** a single `0` with three absent (→ three required, no total). Opposite UI from the same value. The guard must be `allFilled && total() === 0`, gated to the disaggregated path since `total()` returns `actors_count` in aggregate mode.
2. **This card is the inverse of `quantification-item` on asterisks.** The four counts *do* pass `[label]`, so `app-input` renders its own asterisk once `requiredMode` is set. A card-side asterisk would double it — the opposite of T-03, where no `[label]` is passed and the card owns them.
3. **Border mechanism splits per control.** The counts are `type="number"`, so after T-02 their border is a Tailwind class and the setter spy **cannot fire** for them (`P-1`); the spy is valid only for the `p-select`. Also pointed at the Angular style **memoization** trap (`innovation-use-details.component.spec.ts:2530-2546`): a spy installed after the state is rendered records zero calls, which reads as "not bound" but means "not changed."

**Forward-pointer re-routing (Leader, at this dispatch gate)** — T-02's Reviewer had suggested T-04 scope the weakened cohort spy at `innovation-use-details.component.spec.ts:2542`. **Re-routed to T-12**: that spy is outside T-04's `Files` list, and assigning it here would have widened an approved task to absorb an advisory. T-12 owns the file *and* creates the collision. Full reasoning recorded at the T-02 entry's forward-pointer block.

#### Attempt 1 — Reviewer `STATUS: FAIL`, 1 issue

**The implementation was correct. The test that proves it does not exist.**

`showTotalNotPositive` = `!aggregate && allFilled && total() === 0` is right on every reachable input. But **deleting the `allFilled &&` conjunct leaves all 33 tests green** while the forbidden state renders. The Reviewer enumerated every fixture in the file under that mutation:

| Fixture | `total()` | Total msg with `allFilled` removed | Test result |
| --- | --- | --- | --- |
| `0/5/0/0` (T-04 #1) | `5` | none | green |
| `0/0/0/0` (T-04 #2) | `0` | 1 (expected) | green |
| `3/–/–/–` (T-04 #3) | `3` | none | green |
| all four absent (#4, c4) | `null` | none | green |
| aggregate (#5) | n/a | none | green |
| c10 #1 — `setValue(0)`, three absent | `0` | **1, alongside 3 required messages** | green — c10 asserts only `emitted.women_youth_count` and `totalText()` |

**No fixture sets exactly one count to `0` with the other three absent** — the only input that separates the two readings of `total() === 0`. It is trivially reachable (add a row, type `0` in `Women youth`, tab away), and under the mutation it renders **one total message plus three required messages**: `DD-2`'s explicitly forbidden state.

**The root cause is a documented inversion.** The work order's third falsifying input reads *"One filled, three empty — three required messages, no total message."* The Implementer instantiated it with `3` and recorded the reason at `.spec.ts:631` as *"with a non-zero value, so `total()` is also non-zero — isolating this case from the total-positivity rule entirely."* **That is exactly backwards:** the coupling it removed was the only thing making "no total message" a measurement rather than a tautology. The T-04 block's own header comment asserts the correct condition — *"must therefore be 'all four filled AND total() === 0', never total() alone"* — but no `it()` in the block tests it.

**Consequently none of the three reported reds is evidence for the guard.** `0/0/0/0 → Expected: 1, Received: 0` and the asterisk red fire because the `@if` block and the `[requiredMode]` binding did not exist at baseline; `three empty → Expected: 3, Received: 0` fires because `requiredMode` did not exist. **All three stay green with the guard deleted.**

*Violated:* `design.md` `DD-2` (*"One message, never five"*) · `requirements.md` `R-IUR-004` S1's `AND IT MUST` (`0` satisfies "filled") combined with S3 (*"WHEN only `Women youth` is filled THEN the other three fields each render the amber treatment"*) — with `0` a legal fill value, `0/–/–/–` **is** an instance of S3 and it is the untested one · **`KZ-001`** (a cohort assertion that doesn't evaluate what it stands in for) · **`KZ-014`** (a red that would pass with the defect reintroduced is not evidence).

*Remediation ordered:* add one `it()` with `women_youth_count: 0` and three absent, asserting 3 required messages and 0 total messages; keep the existing `3/–/–/–` case; correct the `:631` comment. Prove red first by deleting `allFilled &&`. **No production change required.**

**Reviewer rulings on the other seven named questions (all clean)**

- **Guard correctness:** could not falsify on any reachable input. `5/-5/0/0` → message renders, which is correct (sum is not `> 0`). `null`/`undefined`/`0` handled identically to `app-input`'s `isFilled()` on the reachable domain.
- **`requiredMode` without `isRequired`:** conforms to `DD-1`'s precedence paragraph (*"the only field where both are legitimately live is a `'off'`-mode field"*). Asterisk renders via `@if (isRequired || requiredMode !== 'off')` with `[label]` present.
- **`c9` rescoping:** **(a) in scope** — broke as a direct, unavoidable consequence of T-04, the file is in scope, and both original assertions are preserved. **(b) advisory, not a defect** — the selector is fragile (the new total-message div does carry `rs-mt-[4]`, as the Leader flagged) but the collision is benign for c9's two assertions, since the total message's text matches neither. Risk is confined to a future *count* assertion built on that cohort.
- **Message assertions discriminate per source;** `.actor-total-required-message` is a legitimate test seam with in-tree precedent (`.actor-total`, used the same way by c3/c5/c6).
- **Border mechanism:** both choices correct per `DD-3`'s per-control row. **The finding no test can produce: none** — the diff adds no `border-*` utility anywhere; the only new styling is token-only on a plain `div` PrimeNG does not style.
- **RED disclosure:** `KZ-014`-compliant. Of the two volunteered vacuous cases, `0/5/0/0` **does** discriminate now (mutating to `'positive'` reddens the border assertion — though the *message* half alone would not, since `'positive'` emits different text); the aggregate-gating case **does not** — template placement plus the absent counts doubly protect it, so it would take two simultaneous mutations. Advisory.
- **Copy faithful,** no user decision needed: `requirements.md:206` asks only for *"a distinct message stating the total must be greater than zero"*, and being deliberately **not** identical to `app-input`'s `'positive'` string is correct — S2's point is that the user can tell the two causes apart.
- **Scope confirmed** at file level by repo-wide grep: `requiredMode` in only three components, `actor-total-required-message` in only the two actor-item files, aggregate `@else` and `otherNameMissing` untouched, `[min]="0"` preserved on all five counts.

**`ADVISORY` from attempt 1 (recorded, non-gating)**

1. *Reliability* — `showTotalNotPositive` uses `total() === 0` where §3.1 rule 4 and the migration are `SUM(...) > 0`. **A negative sum is invalid server-side and silent client-side** — the `DC-3` shape, and `R-IUR-004` AC.6 demands client/server identity. **Not reachable through the product** (`[min]="0"` reaches `p-inputNumber`'s clamp, c11 pins pasted `-1`, and the write DTO carries `@IsInt() @Min(0)` on all four counts); only a direct DB write or legacy row reaches it, the column being signed `int`. `total()! <= 0` closes it permanently for one token. **Whoever implements the AC.6 parity task must be told the client predicate is currently narrower than the SQL** — carried to T-19.
2. *Reliability* — strengthen the aggregate-gating test so it *can* fail: set `sex_age_disaggregation_not_apply: true` **and** all four counts to `0` alongside `actors_count: 0`.
3. *Readability* — harden c9's selector against the `rs-mt-[4]` collision (`&& !cn.includes('actor-total-required-message')`).
4. *Readability* — `showTotalNotPositive` re-derives emptiness that `InputComponent.isFilled()` now owns publicly; documented in the JSDoc, but the two definitions must be kept in step by hand.

**Reviewer could not reach** — no `git` access, so the scope ruling rests on full file reads plus repo-wide greps and cannot see an unrelated edit introducing none of those tokens. It re-ran **no** command. Paint unproven (`DC-7`/`DC-1`, T-16); **the new total message's colour and `fs-[14]` are asserted nowhere in this diff** — token-identical to the covered `#requiredMessage` template, but that is inference, so the human browser check should include this message. Server-side parity (`R-IUR-004` AC.6) not audited beyond establishing the SQL predicate.

#### Attempt 2 — Reviewer `STATUS: FAIL`, 1 issue (a `KZ-014` violation in a comment)

Attempt 2 **discharged attempt 1's FAIL**: it added the collision test (`women_youth_count: 0`, three absent) and **observed the red genuinely** — mutation `return allFilled && this.total() === 0` → `return this.total() === 0` produced `Expected: 0, Received: 1` on `totalMessages().length`; conjunct restored byte-for-byte; 34/34 green. Attempt 3's Reviewer independently re-derived that red from source by call-graph necessity and confirmed it is attributable to the `allFilled` conjunct **specifically**.

**It also disproved an advisory the Leader had authorized — correctly.** Told to apply `ADVISORY 2` (strengthen the aggregate-gating test so it can fail), it applied the prescribed mutation and the test **stayed green**. Instead of trying other mutations until one reddened, it found the cause: `innovation-use-actor-item.component.html:77` gates the **entire** disaggregated subtree — the four counts *and* the `showTotalNotPositive` `@if` at `:140-145` — behind `@if (!body().sex_age_disaggregation_not_apply)`, closed by the `@else` at `:146`. In aggregate mode Angular never instantiates that subtree, so the getter is never evaluated from the DOM. **The prior Reviewer's advisory was simply wrong**, and attempt 2 refused to fabricate the red (`K-004`/`KZ-014`).

> **This is the review layer being wrong, not the implementation** — the direction this methodology is weakest at catching, because a mistaken advisory arrives wearing the same authority as a sound one. Recorded deliberately.

**The FAIL:** attempt 2 nonetheless left an in-code comment asserting the opposite of what it had measured — *"so the message renders and this test reddens"* — a red it had explicitly watched **not** happen. `KZ-014` names this case verbatim: *"If the red has not been seen, it may not be asserted — **not in a comment** …"*. Attempt 2's Reviewer strengthened the finding by checking the **converse** mutation too: removing the *template* gate alone also leaves the test green, because the getter's early return still returns `false`. **The test has no single-mutation discriminating power at all** — precisely what the comment told the next maintainer it did have. *Violated:* `KZ-014`, compounded by `KZ-001` and `KZ-017`. *Remediation:* no production change; replace the comment with supplied wording stating the measured truth and the structural limit.

#### Attempt 3 — Reviewer `STATUS: PASS`

Single comment block replaced with the supplied wording, verbatim. One `Edit` call. Verified by the Leader before dispatch of the confirmation pass: `grep -c "this test reddens"` → **0**; both markers of the supplied text present; `.html` **+11** and `.ts` **+33**, byte-identical to attempts 1–2; guard intact at `.ts:126`; the only two remaining occurrences of "redden" both state the negative. `npx eslint` clean; **34/34**, count unchanged.

The confirmation pass verified every structural claim in the replacement comment against source — the `.html:77-146` nesting, the four counts at `:93-138`, the total-message `@if` at `:140-145`, `total()` returning `actors_count` on the aggregate path (`.ts:74-76`), and that `showTotalNotPositive` has **exactly one call site** in the whole client tree with no test invoking it directly. That last fact makes the two mutation claims **structurally necessary rather than merely reported** — a stronger check than re-execution. It also re-confirmed no drift in the input-4 test, the input-3 comment, `c9`, the helpers, or the `.actor-total-required-message` class, and that advisories 1, 3 and 4 all remain unapplied.

**Two documentation amendments assigned to the Leader by the auditor, applied in this commit**

The confirmation pass was told to verify the supplied wording rather than trust it — precisely because it came from the review chain and `KZ-007` makes a correction the highest-risk artifact class. It found one factual error **inside that supplied wording**:

| Site | Was | Now | Why |
| --- | --- | --- | --- |
| `.spec.ts:675` | `// R-IUR-001 S2 gate:` | `// R-IUR-004 S2 gate:` | `R-IUR-001` S2 is *"one started row invalidates its section"* (`requirements.md:108-114`) — nothing about the aggregate path. The clause this test gates is **`R-IUR-004` S2**, *"All four zeros fail the positivity rule, not the fill rule"* (`:200-207`), scoped to the disaggregated path by R-IUR-004's preamble (`:189`). The block's own header already cited `R-IUR-004 S1/S2/S3` correctly — a single-digit typo in the review chain's own text |
| `.spec.ts:573` | `.ts:59-68` | `.ts:66-81` | Pre-existing staleness, audited clean twice. `total()`'s doc block is `:66-71` and the computed `:72-81`; `:59-68` mostly covers the `body` signal's doc. Leader-verified against source before amending |

**Why the Leader amended these rather than opening attempt 4** (recorded for the audit trail, since it touches the no-code rule): both are comment-only factual citations with **zero behavioural surface**, the auditor identified them and explicitly assigned them to the Leader as *"a required one-token amendment rather than a blocking issue"*, and the rework loop had already returned `PASS`. The auditor's stated reasoning, which the Leader accepts: they are not the attempt-2 defect class (no claim about evidence or test strength, so `KZ-014`/`K-004` are satisfied), not an implementation-conformance violation, they **originate in the review chain rather than the Implementer's judgment**, and on attempt 3 of 3 a FAIL would have rolled back verified-correct production code over one character. `npx jest` re-run after the amendment: **34/34**, unchanged.

**Requirements covered** — `R-IUR-004` **in full**: S1 + its `AND IT MUST` (`0` is a value), **S2 + its `BUT it must NOT report the four fields as empty`**, S3, AC.1–AC.5 · `R-IUR-001` S2.

**Cannot prove (`KZ-017`)** — **paint** (`DC-7`/`DC-1`, T-16 gate 3): jsdom observes no rendered border, and `hostEl.className` proves only that the utility is on the host. **The new total message's colour and `fs-[14]` are asserted nowhere in this diff** — token-identical to the already-covered `#requiredMessage` template, but that is inference, not measurement, so **T-16 gate 3 must include this message**. The aggregate-gating test has **no single-mutation discriminating power** and now says so in-file. Neither Reviewer executed any command (read-only wrappers); the `34/34`, eslint and mutation reds are the Implementer's, with the Leader re-measuring the final state and the confirmation pass deriving the mutation outcomes structurally.

> **FORWARD POINTER → T-19 (Leader-owned; must be copied into T-19's brief).** **The client predicate is currently NARROWER than the SQL.** `showTotalNotPositive` tests `total() === 0`, while §3.1 rule 4 and the migration are `SUM(...) > 0` — so a **negative** sum is invalid server-side and **silent** client-side, the `DC-3` shape. `R-IUR-004` **AC.6** demands client/server identity, and T-19 owns that parity proof: it must **not** be told the two surfaces already agree. Reachability: attempt 1's Reviewer could not construct a product path (`[min]="0"` reaches `p-inputNumber`'s clamp, a pasted `-1` is pinned by existing test c11, and the write DTO carries `@IsInt() @Min(0)` on all four counts), so only a direct DB write or a legacy row reaches it — the column is signed `int`. Not reachable, therefore not gated here; `total()! <= 0` would close it for one token if T-19's parity work wants it.

> **FORWARD POINTER → T-16 (cumulative, now four items).** Gate 3 must name in words: (a) the amber border on a **text** field (`app-input :30`, `[style]`), (b) the amber border on a **number** field (`app-input :49`, class), (c) the message rows' line-height after the `fs-[14] leading-[1.25rem]` swap, (d) **T-04's new total-positivity message** (colour and `fs-[14]` asserted nowhere automatically). Plus gate 3b's dark-theme helper-text look and the two T-15 doc claims.

**`ADVISORY` carried forward, unapplied (recorded, non-gating, none becomes a task in this spec)** — 1: `total() <= 0` (see the T-19 pointer). 3: harden `c9`'s `rs-mt-[4]` selector against the collision it now shares with the total message. 4: `showTotalNotPositive` re-derives emptiness that `InputComponent.isFilled()` now owns publicly; the two definitions must be kept in step by hand.

---

### T-05 — Actor card, aggregate path: `How many` required and positive

| Field | Value |
| --- | --- |
| **Final status** | **PASS** (Reviewer, attempt 1) |
| Date | 2026-09-07 |
| Implementer attempts | **1** |
| Effort assigned | `medium` (task said `S`) |
| Skills assigned | `angular-developer`, **`tdd`** |

**Effort and skill reasoning, recorded because it departs from the reflex.** T-04 in this same file needed three attempts, so the instinct was to raise effort. The Leader did the opposite: held `medium` and instead made a **process demand** — *for every assertion, name a concrete mutation that reddens it, run it, observe the red; where none exists, say so and label it regression-protection rather than evidence.* T-04's failures were not under-thinking (its production code was right on attempt 1); they were imprecision about what each assertion could detect. `tdd` was added over the task's list for its **anti-pattern** guidance, not to drive implementation order. **The approach worked: PASS on attempt 1.**

**Production change — one binding**

`.html` +2 total: `[requiredMode]="'positive'"` on the aggregate `actors_count` `app-input`, plus one `@akili-spec` marker. **`.ts` byte-identical** (`git diff --quiet` clean, Leader-verified). `.spec.ts` +126.

No other code was needed, and the brief said so up front: `'positive'` already distinguishes the two messages inside `app-input` (`evaluateRequiredMode`, T-01) — `This field is required` when not filled, `Must be greater than 0` when filled and `≤ 0` — and the field passes `[label]`, so `app-input` renders its own asterisk. No card-side asterisk (would double it, the trap T-04 avoided); no `[isRequired]` alongside `requiredMode` (`DD-1` precedence).

**Stale citation corrected at dispatch** — the work order cites `onModeChange()` at `:111-125`; T-04 shifted it to **`.ts:143-156`**. Third rotted citation in this spec (`A-N4`); the Implementer was told to re-check any it relied on.

**Per-assertion mutation table — the deliverable the Leader required**

| Assertion | Mutation | Observed |
| --- | --- | --- |
| AC.2 empty ⇒ required message | remove the binding | **RED** |
| AC.3 `0` ⇒ positivity, not required | remove the binding | **RED** |
| AC.3 **mode-pinning** | swap `'positive'` → `'filled'` | **RED** — *Implementer's own initiative, beyond the brief.* Proves the test pins the **right mode**, not merely that some mode is active |
| AC.1 exactly one asterisk | remove the binding | **RED** (count 0, expected 1) |
| AC.1 no card-side double | duplicate the asterisk as a **sibling** of `<app-input>` | **NOT reddened** — measured; comment corrected to say so rather than claim a red |
| AC.5 transition | remove the binding | **RED** |
| AC.4 `1` ⇒ valid | remove the binding | **NOT reddened** — labelled regression-protection, not evidence |

**The Reviewer verified the table arithmetically**, not just plausibly: binding-removal should redden exactly AC.1/AC.2/AC.3/AC.5 (4) and leave AC.4 green — reported 4; the `'filled'` swap should redden only AC.3 and AC.5's post-toggle `0` check, since `'filled'` still emits the required message when empty and still renders the asterisk — reported exactly those 2. It called this *"the `KZ-014` discipline T-04 lacked."*

**Reviewer rulings on the six named questions**

1. **AC.5 satisfies the Disqualifier / `KZ-015` — yes.** `beforeEach` does not call `detectChanges()`, so the first call in each test runs `ngOnInit`; AC.5 therefore constructs in **disaggregated** mode, and that state is not synthetic — `InnovationUseActor` declares `sex_age_disaggregation_not_apply = false` and `actors_count = undefined`, so "four empty counts, four live messages" is literally what a newly added row reaches. It asserts that live, mutates through the **production handler** `onModeChange(true)` (the same method the template binds at `.html:71`), then asserts from the DOM.
2. **The Leader's split reading — "confirmed, not corrected."** `KZ-015` is scoped to **AC.5 only** by the Disqualifier's own words. AC.1–AC.4 are steady-state claims about one field at one value, and constructing in aggregate mode *is* the state under test — a saved aggregate row loads exactly that way, which existing test c5 already relies on. *"Failing them under `KZ-015` would be over-application. I did not."* **This was raised pre-emptively because the risk after T-04's three rounds was a reviewer applying that lesson too broadly and failing correct work.**
3. **The `body.update()` seam in AC.5's tail — sound, not tautological.** T-01's Disqualifier forbade value-in-via-the-component's-own-setter → verdict-out-via-its-own-getter. Neither half applies: the value enters the **card's** `body` signal, the same object graph `app-input` reads through `[signal]` and the same state `setValue()` produces via `setNestedPropertyWithReduceSignal`; the verdict comes out of **rendered DOM**. The subject under audit sits between them, and removing the binding reddens this exact assertion.
4. **Both `KZ-017` disclosures verified accurate at source.** AC.4: with the binding gone, `inputValid()` falls through every branch and returns valid at `1` — indistinguishable from `'positive'` evaluating `1` as valid. AC.1: `howMany` is the `app-input`'s own `DebugElement`, so a sibling `<span>` is not a descendant and cannot redden the count; and the `@else` branch contains only the wrapper `div`, the comment and `<app-input>` — **so the non-doubling guarantee genuinely is structural**, as claimed.
5. **`R-IUR-005` S1's `BUT` — the c1 citation holds and is stronger than claimed.** `appInputs()` is `By.directive(InputComponent)` over the whole fixture and c1's aggregate test asserts `length === 1`, so the four counts are **not instantiated** — hence no `isInvalid()`/`inputValid()` computeds exist to evaluate. That is *"not evaluated", not merely "not visible"*. The Reviewer also checked the one place a client leak could hide: in `innovation-use-details.component.ts` the four counts appear only in save normalization (nulled when aggregate), never in a validity computation. **No un-owned client gap.** Remaining: the SQL half (T-19).
6. **`[min]="0"` is correct — do not change it.** `DD-1`'s `'positive'` row and `R-IUR-005` S1 both require that `0` be **enterable and then flagged**. `[min]="1"` would make the `0` state unreachable and AC.3 untestable in the UI — it would contradict the requirement rather than implement it. Explicitly ruled so no future task "fixes" it.
7. **Scope clean** — `onModeChange`, `showTotalNotPositive`, `otherNameMissing`, `total()` and the four counts all in their T-04 state. **No T-06 leakage:** `otherNameMissing` is still the untrimmed `!this.body().actor_type_custom_name` and no asterisk was added to `Specify other` (T-06 AC.3 preserved). T-04's three carried-forward advisories all still **unapplied**.

**Verification** — `npx eslint` 0 errors (1 expected "File ignored" on the spec) · `npx tsc -p tsconfig.spec.json --noEmit` filtered to this spec: **0 lines before and after** · `npx jest innovation-use-actor-item.component.spec --coverage=false --silent` → **39/39** (34 baseline + 5 new) · `npm test -- --silent -- …` → 39/39 pass, exit 1 on project-wide coverage floors (`K-020`) · `npx prettier --write` → no changes · all mutations reverted, final state is the one binding.

**`ADVISORY` (4R — recorded, non-gating)**

1. *Readability* — the AC.1 comment's aside says *"unlike the actor-type/**other-name** fields above it that do carry their own label+asterisk markup."* Right about `Actor type` (`.html:25`); **wrong about `Specify other`** (`.html:51-60`), which has neither its own label nor an asterisk and relies on `placeholder`, with T-06 AC.3 forbidding one. The load-bearing halves of the disclosure are accurate — only this aside is imprecise. → **forward pointer to T-06**, below.
2. *Reliability* — AC.5 exercises the **on** direction only, which is the direction the work order's falsifying input names. The reverse (aggregate → disaggregated with `How many` holding a message) is covered indirectly: c2 proves `actors_count` is cleared in the emitted row and c1 proves the branch is destroyed, so no stale positivity message is structurally possible. Recorded, not requested.
3. *Reliability* — the no-stale-message claim covers the four **field** messages; the card-level total message is proven absent in aggregate mode only **statically** (T-04). Structurally it cannot survive the toggle (its `@if` lives inside the destroyed branch *and* the getter early-returns `false`). Completeness note, not a behavioural gap.

> **FORWARD POINTER → T-06 (Leader-owned; must be copied into T-06's brief).** While you are in `innovation-use-actor-item.component.spec.ts`, narrow one imprecise comment aside in the T-05 AC.1 block: it currently claims the *"actor-type/other-name fields above it … carry their own label+asterisk markup"*, but **`Specify other` carries neither** — it relies on `placeholder="Specify other"`, and **T-06 AC.3 forbids adding an asterisk to it** (`OQ-2` is open and must not be closed by implementation). Narrow it to *"unlike the `Actor type` field above it"*. This is a **comment-only** correction to a factual aside, deliberately routed here rather than done by the Leader because T-06 is the next task to touch this file — it is **not** a licence to change any T-05 assertion or binding.

**Requirements covered** — `R-IUR-005` **in full**: S1 + its `BUT it must NOT evaluate the four disaggregated counts while this path is active`, AC.1–AC.5 including AC.5's no-stale-message-across-a-toggle.

**Cannot prove (`KZ-017`)** — **paint** (T-16 gate 3). **The SQL half**: `R-IUR-005` AC.2/AC.3's green-check clauses are T-19's; `innovation_use_validation` is untouched here. The forbidden sibling-asterisk mutation (disclosed in-file). The Reviewer executed **nothing** — read-only wrapper, no `Bash`: it verified the supplied diff **verbatim against the working-tree files** and re-derived every mutation outcome analytically from `input.component.ts` and both templates; the `.ts` byte-identity it confirmed by **content**, with the Leader supplying the `git diff --quiet` measurement. `npm run build` remains unusable as a gate on this file until T-12 clears the `NG8002` from T-03.

---

### T-06 — Actor card: `Specify other` must be non-blank (trimmed)

| Field | Value |
| --- | --- |
| **Final status** | **PASS** (Reviewer, attempt 1) |
| Date | 2026-09-07 |
| Implementer attempts | **1** |
| Effort assigned | `medium` (task said `S`) |
| Skills assigned | `angular-developer`, **`tdd`** |

**Production change — one expression** (`.ts` +8/-1: the change plus a JSDoc block; **`.html` zero diff**; `.spec.ts` +67/-2)

```diff
-    return this.body().actor_type_id === this.otherActorTypeId && !this.body().actor_type_custom_name;
+    return this.body().actor_type_id === this.otherActorTypeId && !this.body().actor_type_custom_name?.trim();
```

**Leader dispatch findings.** Fourth **stale citation** corrected: the work order cites `otherNameMissing` at `:95`; T-04/T-05 shifted it to `.ts:107-109` (`A-N4`). The exemplar was named from the same feature — `justificationMissing` (`innovation-use-details.component.ts:220`, `!value?.trim()`) — rather than leaving the shape to invention.

**A misreading headed off.** The work order's line *"`justificationWhitespaceOnly()` exists solely because ... Do not build the second instance"* reads like an instruction to reuse a helper. It is not: that computed **surfaces** a client/server divergence so the page can render a distinct whitespace message. T-06 **prevents** the divergence at source, and `R-IUR-016` has **no** AC asking for a distinct whitespace-vs-empty message. The brief therefore forbade an `otherNameWhitespaceOnly` analogue explicitly. The Reviewer confirmed none was built, and added the structural reason it *cannot* recur here: the getter driving the message and the getter driving validity are **the same symbol**, so the asymmetry that forced the first instance (`app-textarea`'s untrimmed internal check) has no analogue for a card-owned `pInputText`.

**Server parity — proved by subset argument, the Reviewer's own initiative**

S1's `AND IT MUST match the server's valid_text` was not merely asserted. SQL is invalid iff every character matches ICU `\s`; JS is invalid iff every character is in `String.prototype.trim`'s set. **ICU `\s` is a strict subset of the JS trim set** (JS additionally strips U+000B, U+FEFF, U+2028 and U+2029), therefore **server-invalid implies client-invalid for every string** — the only direction `DC-3` cares about. The `TRIM()` wrapper in `valid_text` is redundant once `REGEXP_REPLACE(text,'\s+','')` has run, and `'  a  '` is valid under both.

The residual asymmetry runs the **safe** way: U+000B (VT) and U+FEFF (BOM) are stripped by JS but not matched by ICU `\s`, so the **client is stricter** — a lone-BOM paste shows the required message while the server would accept it. Reachable by paste only, not by typing, and it **cannot** produce the failure mode this requirement exists to close (a client-valid row the green check silently rejects).

**Verification** — `npx eslint` clean · `npx jest innovation-use-actor-item.component.spec --coverage=false --silent` → **42/42** (39 + 3 new) · `npm test -- --silent -- ...` → 42/42, exit 1 on project-wide coverage floors (`K-020`) · `npx tsc -p tsconfig.spec.json --noEmit` → 0 errors before and after · `npx prettier --write` reformatted one spec line, jest re-run 42/42.

**RED evidence, with its citation caveat stated (`KZ-014` honesty)**

```
* ... > a whitespace-only custom name is invalid, matching the server's trimmed valid_text
    Expected: true
    Received: false
  > 398 |       expect(component.otherNameMissing).toBe(true);
```
`1 failed, 41 passed` — AC.2/AC.3 green on `HEAD` as expected.

**Caveat, raised by the Reviewer as `ADVISORY 3` and recorded rather than papered over:** the transcript cites line `398` while the committed assertion sits at `:410`, because the capture predates the final comment blocks. **The red itself is independently certain from the diff** — the removed line is `!this.body().actor_type_custom_name`, and `!'   '` is `false`, so the assertion *must* fail on `HEAD` — and the `1 failed / 41 passed` totals reconcile with the committed 42-test file. The Leader did **not** re-run the mutation to refresh the citation: that would mean mutating and reverting production code, which is Implementer work, and the analytic certainty plus reconciling totals already discharge the claim. The stale line number is disclosed here so no future reader treats the quotation as line-reproducible.

**Reviewer rulings**

- **Expression correct and complete.** Truth table by inspection: `undefined`/`null` short-circuit to `undefined` then invalid; `''` invalid; `'   '` trims to `''` invalid; non-blank valid. **No path lets a missing value read as valid** — that would require `?.` to yield something truthy, which it cannot.
- **AC.3 honored.** `OQ-2` confirmed still open in `design.md` §13 ("Blocking? no"); nothing in the diff answers it; the decisive evidence is `.html`'s zero diff. The `span.label` assertion is a real but **partial** guard — see advisory 2.
- **Disqualifier satisfied.** The input is whitespace, not `''`. And the getter assertion is **not** the only one: AC.1 also asserts the rendered card-level message (also `false` pre-change, so it too discriminates) and **AC.2 asserts the negative in the fixture where all four count messages *are* rendered** — that pairing, not a DOM-only rewrite, is what satisfies `KZ-001`.
- **Message scoping sound for these fixtures.** `app-input`'s own message uses `mt-1`, never `rs-mt-[4]`, so the four count messages fall outside the cohort; T-04's total message shares the class but is excluded by text *and* by `showTotalNotPositive` being false on a fresh actor.
- **Scope clean** — the four count bindings, `showTotalNotPositive` (still `=== 0`), `total()`, `onModeChange`, `onActorTypeChange`, `onCustomNameChange` and the aggregate binding all byte-identical to their T-04/T-05 state. No T-07 leakage. **T-04's three advisories not applied, and not *partially* applied either** — the new helper duplicates c9's filter rather than hardening it, which is correct for a non-gating advisory.
- **T-05 forward pointer applied and now accurate.** The aside is narrowed to *"the `Actor type` field above it"*; verified against markup — `Actor type` carries a `span.label` with a `text-red-500` asterisk, while `Specify other` has no label or asterisk at all. **The pre-narrowing phrase was false about half its subject.** No T-05 assertion, fixture or `expect` changed.

**`ADVISORY` (4R — recorded, non-gating)**

1. *Reliability* — `cardLevelRequiredMessageShown()` cannot distinguish the **actor-type** slot's message from the **Specify other** slot's; both render the identical `#requiredMessage` template with the identical class. Correct here only because both fixtures set `actor_type_id: 5`, making `actorTypeMissing` false. A future edit blanking the fixture's actor type would make AC.1 pass **for the wrong reason**. Tighter: assert the cohort length is exactly `1`, or scope to the `div` immediately following `input[placeholder="Specify other"]`.
2. *Reliability / Readability* — `expect(cardOwnLabelTexts).toEqual(['Actor type*', 'Total'])` couples an `OQ-2` guard to the **text and order** of two unrelated labels: a cosmetic rename (`Total` to `Total actors`) reddens it with no asterisk change, while **an asterisk added as a bare sibling `span.text-red-500` with no `span.label` wrapper would leave it green.** Consider `length).toBe(2)` plus an assertion that the Specify-other group contains no `span.text-red-500`.
3. *Evidence hygiene* — the red's line citation, handled above.

**Requirements covered** — `R-IUR-016` **in full**: S1 + its `BUT it must NOT be implemented through requiredMode` + its `AND IT MUST match the server's valid_text`; AC.1, AC.2, AC.3.

**Cannot prove (`KZ-017`)** — **server parity is argued, not measured**: the subset proof is over the ICU `\s` and ECMAScript trim *specifications*, not a MySQL execution, and MySQL's actual `\s` under a non-ICU build or a different collation was not probed — `valid_text` remains **T-19's** gate. **No visual claim** (no asterisk renders); the amber border that `otherNameMissing` also drives is asserted nowhere in this task. **Ingress path:** both fixtures arrive via `ngOnInit`, not via a live `onCustomNameChange('   ')` typing transition — `KZ-015` is satisfied because a saved row *can* hold whitespace (the server stores it and only marks it invalid) and both paths converge on `body()`, but the typed transition itself is unexercised. The Reviewer executed **nothing** (read-only wrapper); every behavioural conclusion is derived from committed source.

---

## Incident: `git stash pop` applied an unrelated "DO NOT APPLY" stash (T-06 verification, 2026-09-07)

**Recorded as a process incident, not a code defect. Fully recovered; nothing lost.**

**What happened.** T-06's Implementer reached for `git stash` to take a before/after `tsc` measurement. It mis-ordered the `-m` flag (`git stash push -- <files> -m "..."`), the stash **failed**, and a follow-up `git stash pop` then applied **`stash@{0}`** — an unrelated stash from branch `AC-1672` whose own message reads *"REJECTED T-06 DD-14 attempt-1 ... **DO NOT APPLY**"*. It conflicted across three unrelated `project-dashboard*` files. The Implementer reset them with `git checkout HEAD --`, verified recovery, and **disclosed the whole sequence unprompted** in its report.

**Leader independent verification** (not taken on the worker's word):

| Check | Result |
| --- | --- |
| `stash@{0}` still present | **Yes** — git preserves a stash on a conflicted pop, so the DO-NOT-APPLY entry is intact at position 0 |
| Working tree | **Only** the two T-06 files |
| Conflict markers | **0 files**, `grep -rqE` exit **1** |
| Untracked files | **0** |
| `project-dashboard*` vs `HEAD` | clean |
| `HEAD` | unmoved at T-05's commit |

**A `K-014` slip in the Leader's own first check, recorded.** The initial conflict-marker probe read `$?` after a `grep ... | head` pipeline, which reports **`head`'s** status, not `grep`'s — a confident `exit 0` that measured nothing. Re-measured without the pipe (`grep -rlE ... | wc -l` gave `0`, plus `grep -rqE` exit `1`). The answer did not change, but the first measurement was not evidence. This is `K-014` reproducing itself inside the verification of an incident.

**Standing decision, applied to every remaining Implementer brief in this spec:** **agents must not use `git stash` in this checkout.** The tree carries **18** stashes, one explicitly marked DO NOT APPLY at position `0`, so a mis-ordered flag followed by a pop is a live hazard — and it survived here only because the pop happened to conflict. T-01's Implementer had already avoided stash for the identical measurement and *said why* ("there are other in-flight, unrelated modifications in this working tree"), so the safe technique was already demonstrated in this run. The instruction from here: **copy files into the scratchpad and swap them back**, never stash. Also flagged to the user, whose call it is whether to clear or rename `stash@{0}` — a stash whose safety depends on a human reading its message is a hazard to any agent.

**Kaizen candidate** for `/akili-archive`: a repo-level guard (guide line or hook) against `git stash` in an agent session, on the strength of this near-miss plus the two independent worker behaviours (one avoided it with a stated reason, one did not).

---

### T-11 — Details page: drop the "at least one actor" message and the seeded blank row (reversion, `DD-7`)

| Field | Value |
| --- | --- |
| **Final status** | **PASS** (Reviewer, attempt 1) |
| Date | 2026-09-07 |
| Implementer attempts | **1** |
| Effort assigned | `medium` (task said `M`) |
| Skills assigned | `angular-developer`, **`tdd`** |

**Ordering decision.** T-07 was next by document order; the Leader took **T-11** instead because T-12 follows it and **restores the build**, which has been red since T-03 four tasks earlier. Running that long without the full-suite or `npm run build` gates available was the larger risk. Both tasks were unblocked and approved, so this was a routine ordering call, not a scope change.

**Production changes** (`.ts` 9 changed lines, `.html` 10, `.spec.ts` 40 — Leader-measured)

```diff
-      actors: Array.isArray(data.actors) && data.actors.length > 0 ? data.actors : [new InnovationUseActor()],
+      actors: Array.isArray(data.actors) ? data.actors : [],
```

and the entire `@if (body().actors.length === 0) { ... At least one actor is required ... }` block deleted from `.html`, replaced by a comment recording the reversion.

**A coupling the work order does not state, found at dispatch.** The message was gated on `body().actors.length === 0`, which the seed made **nearly unreachable** — only a user deleting the last row could reach it. Removing the seed alone would therefore have made every empty result open with an amber error **on first paint**, which is precisely what `R-IUR-001` S1's `AND IT MUST` (*valid on first paint, no user action*) forbids and what `DD-7`'s reversion exists to fix. The two halves are coupled, so the brief required the **whole `@if` block** to go, not just the string.

**`K-018` held twice over — and the task's own list was still wrong**

The work order names likely casualties *and* warns that revision 1 of this spec got that list wrong (it missed `c2` and cited a blank line and an arrangement). **After that correction the list was still incomplete.** Deriving from the run produced **4** failures (3 new + the known baseline), and the fourth was on no list:

| Casualty | On the work order's list? | Disposition |
| --- | --- | --- |
| `c2 — empty state` (`actorCards.length === 1`) | yes | **rewritten** to assert the empty state positively |
| `c10` first test (message when empty) | yes | **inverted** to `not.toContain` |
| `T-09 c6` (message rather than error state) | yes | **inverted**, keeping its `hasDuplicateActorType()` / `loadFailed()` / no-error-surface assertions |
| **`c1 — loading state`** (skeletons in the actor card) | **NO — missed by both revisions** | **fixed** by arranging a one-actor mock |

**Every casualty was rewritten, none deleted** — deleting a failing test to green a suite destroys the coverage its requirement depends on.

**The `c1` ruling — the judgment call of this task, and the Reviewer went further than the Leader had**

`c1` had been relying on the **seed** to produce an actor card for its skeletons to render inside. The Implementer fixed it by arranging a one-actor mock, arguing the test's intent is the skeleton mechanism rather than the empty-state behaviour `c2` owns. The Leader flagged this for an explicit ruling rather than assuming.

**Ruled correct, not a mask — with a stronger reason than either had given:** the original green depended on a **post-response** artifact. `body` is initialised `signal(new GetInnovationUseDetails())` (`.ts:144`) whose `actors` is already `[]`, and the seed only ran *after* the response landed — so **during the real in-flight window there was never a card to skeletonise, before or after this change**. The skeletons are not this template's at all; they come from the shared field components (`input.component.html:18-19`, `@if (currentResultIsLoading())`). An empty result with no level selected and no rows legitimately contains zero fields. Nothing about default load is lost, making the dependency explicit is an improvement, and the arrangement (`await getData()` → `set(true)` → `detectChanges()`) is a real transition per `KZ-015`, matching the idiom `c2`/`c3` already use.

**Reviewer rulings on the other six questions**

- **Seed removal complete.** The `Array.isArray` guard is preserved so `null`/`undefined`/non-array still normalise to `[]`; the class default is already `[]`, so no path yields a non-array and `body`'s non-optional `actors: InnovationUseActor[]` still holds. **No consumer needs ≥ 1 row** — every `actors` use is `forEach` (`:253`, duplicate detection, empty-safe), `map`/`filter` (`:371`, `:381`) or `buildPayload`'s `filter` (`:471`). **No indexing anywhere.**
- **The message renders in no state.** A case-insensitive sweep of the whole client `src` returns exactly **six** hits: four spec assertions, one `it` title, and the `.html:154` comment — **zero renderable occurrences**.
- **The comment's retained string is safe, and the risk direction is stated.** `Node.textContent` concatenates **Text**-node descendants only, and a `Comment` is not a `Text` node — so the four `not.toContain` assertions cannot see it *even if* Angular emitted it, and Angular's compiler does not emit authored comments in the first place. **No false pass is constructible;** the only failure mode would be a future switch to `innerHTML`/`outerHTML`, which yields a false **FAIL**. Advisory 2 covers the real (non-test) cost.
- **`c2` satisfies the Disqualifier** — it goes through the production `getData()` path and asserts zero cards for all three collections **plus** positive presence of the guidance callout (`.html:138`) and the `Add other actor` button (`.html:175`), rather than resting on an unused-line tautology. The observed RED (`Expected: 0, Received: 1`) discriminates on exactly the deleted line.
- **No coverage lost by the inversions.** `R-IUR-002` **AC.2** stays with `c3` (populated `200`) and **AC.3** with the relative `before + 1` assertion at `:555-560` — *which is why neither broke*. `c10`'s pair now brackets both states of `actors`.
- **`addActor()` untouched** at `.ts:376-378`, outside every hunk, and `new InnovationUseActor()` now has exactly **one** occurrence in the file. The ≥ 1-actor path returns `data.actors` verbatim, so a populated response renders identically (`R-IUR-002` S1's `BUT`).
- **T-12's territory intact.** `[fieldsRequired]="false"` is present at **`.html:223`** (was `:227`; the html hunk nets −4 lines above it, **which reconciles exactly**), and `c10`'s asterisk test survives verbatim at `.spec.ts:404-408` as the single known-red. `R-IUR-002` AC.4's doc update is **T-15's** (`tasks.md:506`), correctly absent here. No save-gate, toast or organization-card change.

**Verification** — `npx eslint` clean · `npx jest innovation-use-details.component.spec --coverage=false --silent` → **1 failed, 150 passed, 151 total**, **exactly the pre-T-11 baseline, independently re-measured by the Leader**; the single failure is c10's asterisk test, T-12's, untouched · `npm test -- --silent -- ...` → exit 1 from project-wide coverage floors (`K-020`), same tally · observed RED for the empty-state assertion taken by **copying files to the scratchpad and swapping back — explicitly not `git stash`**, per the standing prohibition from T-06's incident, which held.

**Diff hygiene worth noting:** `prettier` reformatted unrelated blocks, so the Implementer restored each file from `git show HEAD:` and reapplied only the intended edits rather than committing incidental churn.

**`ADVISORY` (4R — recorded, non-gating)**

1. *Reliability / `KZ-001`* — **`c1`'s second test is now vacuous.** *"renders no skeleton when currentResultIsLoading() is false"* (`.spec.ts:138-145`) did **not** receive the one-actor arrangement its sibling did, so the default empty load renders zero field components and `expect(skeletons.length).toBe(0)` holds **regardless of the flag**. Reviewer's reachability check: the only defect class it can no longer catch is "a field component renders its skeleton unconditionally", that branch is currently correct (`input.component.html:18`) and is directly owned by `input.component.spec.ts` — so **nothing live is masked**. Symmetric fix is the same one-actor mock. → **forward pointer to T-12.**
2. *Readability* — the replacement comment at `.html:154` repeats the literal `At least one actor is required`, so a client-wide grep still hits the `.html`. Harmless to the tests (see above) but **a future auditor can misread it as a surviving render**. "the actors-required message" carries the same information without the false hit. → **forward pointer to T-12.**
3. *Readability* — `c10`'s first test and `T-09 c6`'s second now share an arrangement and a negative; `c10`'s is the pure duplicate (the other adds three distinct assertions), while `c2`'s reaches the negative through the real load path. Not worth a change; if one is ever pruned, prune `c10`'s.

> **FORWARD POINTER → T-12 (Leader-owned; must be copied into T-12's brief).** Three items, all in `innovation-use-details.component.{html,spec.ts}`, which T-12 already owns:
> 1. **Rewrite, do not restore, `c10`'s asterisk test** (`.spec.ts:404-408`, `hasAsteriskTextNode(quantificationsCard)).toBe(false)`) — `R-IUR-010` AC.1 **deliberately reverses** it: measures now *do* carry asterisks on `Number` and `Unit`, and `Comments` does not. A T-12 that greens it by re-satisfying the old expectation has re-implemented the behaviour the requirement removes. **This is also the task that restores the build** (`NG8002` on `[fieldsRequired]`, now at `.html:223`) and the full suite.
> 2. **Give `c1`'s second test the same one-actor mock its sibling got** (advisory 1) — it is currently vacuous. Nothing live is masked, so this is hygiene, not a defect.
> 3. **Reword the `.html:154` comment** to drop the literal message string (advisory 2), so a client-wide grep stops producing a false hit.
> Also still standing: **scope the prototype-wide `border` setter spy** at `.spec.ts` ~`:2542` to the specific element — T-12 both owns that file and *creates* the second-emitter collision by binding `[unitRequiredMode]="'filled'"` (re-routed here from T-04 at the T-04 dispatch gate; full reasoning at the T-02 entry).

**Requirements covered** — `R-IUR-002` in full (S1 + both clauses, AC.1–AC.3) · `R-IUR-011` AC.1 + S1's `BUT it must NOT remove the per-row actor rules` · `R-IUR-001` S1's `BUT` and `AND IT MUST`, and S2's `BUT`.

**Cannot prove (`KZ-017`)** — the **SQL half** of `R-IUR-011` (AC.2/AC.3/AC.4 → T-18/T-19). **Paint** — jsdom renders nothing, so the empty state's actual appearance is T-16 gate 3. **Template type-checking** — the branch still fails `NG8002` on `[fieldsRequired]` (T-12's), though the Reviewer confirmed the deleted block was the template's only *other* `actors` reference, so nothing dangles. The **`tsc` normalized set diff** is T-16 gate 2's, not this task's. The Reviewer executed **nothing** (read-only wrapper): it re-derived the after-state from the working tree and read `c1`, `c2`, `c10` and `T-09 c6` in full, but **cannot rule out an unreported edit elsewhere in the ~2,900-line spec file** — the Leader's `git diff --stat` (40 changed spec lines) bounds that gap.

**A Leader slip, recorded:** the dispatch brief referred to the component directory in an abbreviated form the Reviewer had to correct — the real path is `pages/platform/pages/result/pages/innovation-use-details/`. No work was misdirected, but exact paths belong in briefs, since a worker cannot tell an abbreviation from an error.

---

### T-12 — Details page: wire the measure card's five new inputs

| Field | Value |
| --- | --- |
| **Final status** | **PASS** (Reviewer, attempt 3 of 3) |
| Date | 2026-09-07 |
| Implementer attempts | **3** — and **the product code was correct on attempt 1. Both failures were false claims in a code comment, and both texts were supplied to the Implementer rather than authored by it.** |
| Effort assigned | `medium` on all three attempts — **deliberately never bumped**; see below |
| Skills assigned | `angular-developer`, **`tdd`** |

**This is the task that restored the build.** Red since T-03 (`NG8002` on the dead `[fieldsRequired]` binding), green from attempt 1 onward.

**Production change** — `.html:223-227`, five bindings replacing `[fieldsRequired]="false"`:

```html
[numberRequired]="true"  [unitRequired]="true"  [commentsRequired]="false"
[numberRequiredMode]="'nonzero'"  [unitRequiredMode]="'filled'"
```

`[min]`/`[max]`/`[maxFractionDigits]`/`[placeholder]` untouched. **`.ts` never touched** (T-13's).

**Leader pre-dispatch check that mattered:** `QUANTIFICATION_NUMBER_MIN = -QUANTIFICATION_NUMBER_MAX` (`.ts:41-42`), so `-5` is genuinely enterable and AC.4 is reachable in the UI. The brief said explicitly **not** to "tighten" `min` to `0` — that would look like a safety improvement while contradicting the signed-decimal decision and making the requirement unverifiable. The mirror of T-05's `[min]="0"` ruling, in the opposite direction.

**The Disqualifier did the real work.** The strongest evidence is not the green suite: dropping **only** `[unitRequiredMode]` produced **two** failures — the resolved-mode assertion (`Expected: "filled" Received: "off"`) **and** the whitespace-`Unit` test — then 156/156 on restore. Without the resolved-input assertions, forgetting that one binding would have failed **nothing**: the child would silently take its `'off'` default, whitespace `Unit` would stay valid, and the exact defect the pivot was raised to close would walk back in.

**All four forward pointers discharged** (the largest carry-forward set in the run):

| Pointer | Outcome |
| --- | --- |
| Rewrite `c10`, don't restore | Rewritten per field — `Number`/`Unit` carry `*`, `Comments` does not. The `organizationsCard` half left strictly alone for T-07/T-08 (Leader-verified: appears in the diff **only as a context line**, never on a `+`/`-`) |
| Scope the prototype border spy | Rescoped to the `p-select`'s own `style` object, **preserving the valid→invalid toggle** that defeats Angular's per-property style memoization |
| Un-vacuum `c1`'s second test | Given its sibling's one-actor mock |
| Reword `.html:154`'s comment | Literal message string dropped; that grep now returns **0** |

**Verification** — `npm run build` → **`Application bundle generation complete`, exit 0, no `NG8002`** · `innovation-use-details.component.spec` → **156/156** (from 1 failed / 150 passed) · **Leader full-suite gate → 317 suites, 6848 tests, exit 0**, coverage 98.2 / 96.3 / 97.82 / 98.5 · `eslint` clean · `tsc -p tsconfig.spec.json` 0 errors before and after. Reds taken by **scratchpad file-swap, never `git stash`** — the standing prohibition held on every attempt.

---

#### The failure chain — recorded in full, because two of the three failures were the Leader's

| Step | Actor | What happened |
| --- | --- | --- |
| 1 | **Leader** | The dispatch brief asserted **as fact**: *"Your `[unitRequiredMode]="'filled'"` binding creates a second emitter of that identical string **inside this same fixture**."* The general mechanism was verified; **whether that `describe` renders a measure card was not.** It does not — its `beforeEach` loads `quantifications: []` |
| 2 | Implementer | Transcribed the Leader's stated reason into a code comment — the correct instinct, and how a false premise in a brief becomes a false claim in the repo |
| 3 | Reviewer (attempt 1) | **Caught it correctly** — then its prescribed remediation introduced a **new** false claim: that the emission comes from `[unitRequired]` and `[unitRequiredMode]` *"jointly — the boolean covers empty, the mode adds whitespace-only"* |
| 4 | **Leader** | **Relayed that remediation as authorized without checking it against `DD-1`** — despite having briefed T-01's precedence rule personally. Also passed through its line citation `:2515-2527`, after reading a `sed` range that only *looked* consistent because position was inferred from output ordering instead of counted |
| 5 | Implementer | Transcribed it faithfully again |
| 6 | Reviewer (attempt 2) | Caught both, citing T-01's **own in-code comment** |

**Why the joint attribution was false.** `inputValid()` returns `evaluateRequiredMode(value)` the instant `requiredMode !== 'off'`, so the legacy `isRequired` branch is **structurally unreachable** under an active mode — and `isFilled()` trims, so `'filled'` **alone** covers empty *and* whitespace-only. `[unitRequired]` contributes nothing to the `[style]` write; it drives only asterisks. T-01's in-code comment states this in capitals: *"When active, requiredMode **OWNS THE VERDICT OUTRIGHT** and bypasses the legacy isRequired / validateEmpty emptiness branches below."* **The remediation contradicted `DD-1`, the first decision in this spec.**

**The line citation, settled by measurement** when the two Reviewers disagreed: `beforeEach(async` is at **`:2524`**, `quantifications: []` at **`:2533`**; `:2515` is a colour constant and `:2527` is the `mockResolvedValue(` opening line. Reviewer 2 was right; the citation inherited from Reviewer 1 was wrong on both endpoints and did not contain the value it claimed.

**`KZ-007` demonstrated in both directions.** A correction is the highest-risk artifact class *because it reads as settled fact*. Here a Reviewer's correction was wrong, and the Leader's relay of it was unchecked — the same failure mode at two different layers. The counter-measure that finally worked was cheap: attempt 3's brief ordered the Implementer to **verify the replacement wording against source, including re-counting the Leader's line numbers, and to report any discrepancy.** It did, independently, and they matched. **That instruction costs one paragraph and is now standing practice for every remediation in this spec.**

**Effort held at `medium` for all three attempts, against the standing rework rule.** The rule bumps effort because a failed fix is usually under-thinking; that premise did not hold once here. The implementation was right on attempt 1, and each later failure was a false premise handed down. Raising the dial would have bought nothing; the risk was **transcribing a third false claim**, so the briefs spent their weight on verification instead. Recorded as a deliberate deviation.

#### Reviewer rulings (attempt 3)

Every claim in the corrected comment re-verified at source, **not accepted on the prior Reviewer's authority**: the `inputValid()` early return; `isFilled()` returning `false` for both `''` and `'   '`; `input.component.ts:47-49`'s wording exact and its range exact; `quantifications: []` at `:2533` inside the governing `beforeEach` at `:2524` (and the nested `describe` at `:2656` declares no `beforeEach` of its own, so `:2533` governs); `[style]` at `input.component.html:30` driven solely by `inputValid()`; `Unit` confirmed the `pInputText` branch (no `[type]` passed, default `'text'`).

**Proportionality ruling on the one disclosed nuance — reading (ii), advisory, not FAIL.** The Implementer volunteered that the comment names two asterisk sites for `[unitRequired]`, of which `input.component.html:6` is structurally inert for this call site (no `[label]` is passed — established in T-03). The Leader put this to the Reviewer as an explicit proportionality question, with both sides stated and **no steer**, because at attempt 3 of 3 a FAIL triggers HALT and an automatic rollback of verified-correct product code. Its three reasons: the statement is **true of the code it cites** (a maintainer following the pointer lands on real code doing what the sentence says — what is unreachable is the enclosing `@if (label)` for *this* call site, a property of the call site rather than a misdescription of `:6`); the sentence's **load-bearing** assertion is independently verified true and is what the rescope rests on; and it is **categorically unlike** the two failures that consumed attempts 1 and 2, which asserted a nonexistent fixture and a mechanism contradicting `DD-1` — *"This one sends them to the right causal model with one over-inclusive pointer."*

**`ADVISORY` (recorded, non-gating)** — the `input.component.html:6` citation is **doubly** over-inclusive: `isRequired` does participate in that condition, but the enclosing `@if (label)` never opens for this call site, **and even if it did, the `|| requiredMode !== 'off'` disjunct would render the asterisk regardless of `unitRequired`.** A future touch of this comment can drop the pointer or mark it *"(component-level, inert at this call site)"*. Also noted outside the change under review: the phrase *"this describe's own `beforeEach`"* is strictly the **parent** describe's — inherited wording, correct in effect.

Also carried from attempt 1's audit: **`R-IUR-010` AC.2's amber half is a composition, not a direct T-12 proof.** It composes from T-01's `input.component.spec.ts` evidence (`isInvalid()` honours each mode; the `border-[var(--ac-warning-1)]` class renders iff `isInvalid()`) plus this task's proof that `'nonzero'`/`'filled'` actually arrive. Legitimate, and `DD-3` is not in T-12's design scope — recorded as a composition so no later reader mistakes it for a single measured claim.

**Requirements covered** — `R-IUR-010` AC.1–AC.4 (client half) incl. AC.4's corrected boundary · **AC.6 + S1's `AND IT MUST` reject a whitespace-only `Unit`** (reassigned from T-01 by the 2026-09-04 pivot) · `R-IUR-010` S1.

**Cannot prove (`KZ-017`)** — **OICR's unchanged behaviour** (T-03 owns AC.5, against the real component; both OICR call sites keep the child's `true`/`'off'`/`'off'` defaults). **The SQL/green-check half** of `R-IUR-010` (T-18/T-19). **Paint** — jsdom measures no colour or layout; T-16 gate 3 remains the only evidence for `R-IUR-003`. The `-5` test is **regression-protection, not evidence** — a bare valid-no-message verdict cannot distinguish "`'nonzero'` ran and passed" from "no mode ran"; its discriminating power comes from the `0` case plus the resolved-mode assertion, and it is labelled so in-code. No Reviewer executed anything (read-only wrappers); every gate figure is the Leader's measurement.

---

### T-07 — Organization card, known path: institution required, with message precedence

| Field | Value |
| --- | --- |
| **Final status** | **PASS** (Reviewer, attempt 1) |
| Date | 2026-09-07 |
| Implementer attempts | **1** |
| Effort assigned | `medium` (task said `M`) |
| Skills assigned | `angular-developer`, `ui-ux-pro-max`, **`tdd`** |

**Production changes** (`.ts` 20 changed lines, `.html` 18, `.spec.ts` 121)

| # | Change |
| --- | --- |
| AC.1 | Red `*` added to the known-path `Organization` label, **unconditional on that path** |
| AC.2 | `[style]="institutionMissing ? { border: '2px solid var(--ac-warning-1)' } : {}"` **added** to the known-path `p-select` — Leader-verified it had **no `[style]` at all** before |
| new | `#institutionRequiredMessage` template with its own `.organization-required-message` class hook, rendered by a bare `@if (institutionMissing)` — **not gated on `touched()`** |
| `DD-9` | `institutionMissing = is_organization_known && !identitySatisfied`; `showNotIdentifiedMessage` gains `&& !this.institutionMissing` |

**Verification** — `npx eslint` clean · `innovation-use-organization-item.component.spec` **34/34** · `npm run build` green · `tsc` scoped before/after: **identical single pre-existing `TS2741`** · **Leader full-suite gate: 317 suites, 6855 tests, exit 0** · reds taken **without `git stash`**.

**Observed RED** — `AC.3 falsifying input: an UNTOUCHED known-path row with no institution shows EXACTLY ONE message — Expected: 1, Received: 0`, plus four more new tests red for the same absence. The Reviewer confirmed attribution: before this change the card's **only** message was `showNotIdentifiedMessage`, gated on `touched()`, so an untouched loaded row rendered exactly zero.

---

#### The misattribution the Leader caught before dispatch — confirmed on three independent grounds

T-07's `Verify` line ordered `:302-316` rewritten. `DD-9`'s own blast-radius table attributes that break to **`R-IUR-007`** — **T-08**. The test arranges `is_organization_known: false`, the **unknown** path, which T-07 does not touch. The brief told the Implementer to leave it alone and to **stop and report if it broke**, because breaking would mean the clause was too broad — and a clause reaching the unknown path renders **zero** messages there (no field-level message exists until T-08), violating AC.3's *"never zero"* half.

**The Reviewer confirmed the reading three ways:**

1. `design.md:514` attributes it in words — *"**Under `R-IUR-007`** that row now shows a required message on `Organization type`"*. `tasks.md:234` inherited the note **without** the attribution.
2. **The clause structurally cannot reach the unknown path** — `is_organization_known` is the *leading* conjunct and a non-optional `boolean` defaulting to `false`, so `showNotIdentifiedMessage` is byte-equivalent to its pre-change behaviour there.
3. **Line arithmetic reconciles exactly.** The two spec hunks add `+5` and `+106` = `+111`; the untouched test now sits at **`:413-427`**, and `413 − 111 = 302`, `427 − 111 = 316`. **This proves the test left alone is the one the citation named.**

**Fifth misplaced/rotted citation in this spec** (`A-N4` family). **`tasks.md` corrected in this commit** per root `CLAUDE.md` (*fix the document that is wrong*): the instruction is **moved from T-07's `Verify` to T-08's**, each with the reason recorded inline.

The Implementer also wrote an **un-suppression guard** test asserting the row-level message *still* renders on the unknown path — the positive control for exactly this hazard, and it discriminates (`rowLevel` 1, `fieldLevel` 0).

#### A standing instruction of the Leader's, corrected by the Reviewer

The brief said **never** use `jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set')`, generalising from T-12's rescope. **That ban was too absolute, and `DD-3` itself contradicts it:** `design.md:271` names the prototype spy verbatim as *the* automated assertion for `p-select`.

The distinction the Reviewer drew, which is the correct rule: **T-12's hazard was a false PASS on a *positive* `toContainEqual`** when a second emitter of the identical string existed in the same fixture. **A second emitter can only turn `not.toContainEqual` red, never green** — so prototype-wide is the **strictly safe** direction for a *negative* assertion, and element-scoping a negative is actually *weaker* (something else could write the amber and the test would still pass). The Implementer used element-scoped for its positive assertion and prototype-wide for its negative — **correct on both counts.**

It further noted the prototype spy is the **only** instrument that can observe the **first** style write on a newly created element, because an element-scoped spy needs the element to exist beforehand. **Recorded as corrected guidance for every remaining brief in this spec:** scope by attribution need — element-scoped when claiming a *specific* element wrote a value, prototype-wide for card-wide negatives and first-render writes.

#### The work order's `Cannot prove` describes a FUTURE state — corrected

T-07's `Cannot prove` says to record the suppressed branch as unreachable-so-untestable. **That is not true today.** The Reviewer established it still renders on the **unknown** path and **two** tests exercise it (`:391-401`, `:413-427`). `DD-9`'s *"unreachable in practice"* becomes true only once **T-08** extends the clause. **Recorded as the known untested-but-retained path effective T-08**, not now — the honest version of the instruction.

#### Reviewer rulings (all ten questions clean)

- **`DD-9` precedence, both table rows** satisfied. Note which test does the work: on an *untouched* row `touched()` is already `false`, so suppression there is a **no-op** and proves nothing about the new clause — the only test that genuinely exercises it is the touched one. `identitySatisfied` is genuinely reused, never re-derived.
- **Disqualifier satisfied** — two disjoint hooks, and **both proven to discriminate in both directions inside the same describe** (`fieldLevel` 1 and 0; `rowLevel` 1 and 0), so neither is a vacuous cohort.
- **`c4` rewrite necessary, no coverage lost** — AC.1 makes *"zero asterisks in every state"* false; the unknown-path half is retained verbatim including its `OTHER + sub-type` arrangement.
- **`c5` verified from source — passes on merit, not by accident.** Its fixture is the unknown path (`new InnovationUseOrganization()` sets `is_organization_known = false`), and it still asserts something live: the touched-gate on the only path where the row-level message can still render until T-08. *(The Leader raised this because a green suite cannot distinguish "still correct" from "passing by accident".)*
- **AC.1 unconditional is the right reading** — AC.1 keys on *"when the known path is active"*, `R-IUR-003` says *"field name immediately followed by a red `*`"*, and the in-tree reference card renders it unconditionally.
- **Copy verified** at `requirements.md:163` and against the sibling actor card's identical string.
- **`OQ-6` intact** — `ng-template` byte-identical, render site unchanged, getter retained; reversal is deleting one clause on one line.
- **Scope clean** — T-08/T-09/T-10/T-13 all provably absent (type select carries no asterisk and no `[style]`; sub-type block untouched; `onInstitutionTypeChange` still sends `undefined`; `onKnownToggle` still flag-only; no save gate or toast).
- **Prettier ruling: acceptable.** `.husky/pre-commit` is **empty** and eslint ignores `*.spec.ts`, so nothing gates spec formatting; at `printWidth: 150` a `--write` would have reflowed unrelated blocks — the churn T-11 had to undo by hand.
- **Token compliance** — no hex; `[style]` object binding on `p-select` per `DD-3`, no Tailwind `border-*`.

#### `ADVISORY` (4R — recorded, non-gating; routed to T-08 where it owns the file)

1. *Reliability / `KZ-015`* — **reachable, and it is the common case.** The touched arrangement calls `onInstitutionChange(undefined)`, but the select has **no `[showClear]`**, so **the UI cannot produce that transition**. The production-reachable route into *touched + known + empty* is `onKnownToggle(true)` on an unfilled row — a user ticking the checkbox — and that call already exists in the file for another assertion. Moving the message/border assertions there would test the transition the product performs **and** cover the create-with-amber first write.
2. *Readability* — retitle the AC.2 negative to *"never writes the amber border anywhere in the card"*, matching its card-wide spy.
3. *Reliability* — `c4`'s known-path title claims the asterisk is *"on the Organization label"*, but `length === 1` plus *"first `span.label` contains 'Organization'"* does not establish **containment**; an asterisk on the wrong element still passes. `label.query(By.css('.text-red-500'))` closes it.
4. *Risk* — **neither border spy is restored in a `finally`.** A failing assertion leaves `CSSStyleDeclaration.prototype.border` mocked and **swallowing every write for the rest of the file**, turning one red into a cascade during the exact run where diagnosis matters. `try/finally` or `afterEach(() => jest.restoreAllMocks())`.
5. *Readability* — the leading `is_organization_known` conjunct is redundant for both **template** uses (both sit inside `@if (body().is_organization_known)`) and load-bearing **only** for the suppression clause. A future "simplification" dropping it would silently widen suppression onto the unknown path. The in-code comment says so.
6. *Readability* — the reference card in `innovation-details` uses the same getter name and mechanism with a hex `#E69F00`; this card uses the token. The two have now diverged, **in this card's favour**.

> **FORWARD POINTER → T-08 (Leader-owned; must be copied into T-08's brief).**
> 1. **Rewrite the test now at `:413-427`** (formerly `:302-316`) — instruction moved into T-08's `Verify` line in this commit. Adding a field-level required message to `Organization type` suppresses the row-level message on the unknown path, which that test asserts.
> 2. **Two stale in-code claims travel with it.** Its comment asserts *"only in this `@if` branch is 'unknown path, no identity yet' true, so exactly one `material-symbols-rounded` warning icon exists in the DOM here"* — false the moment T-08 lands. And it uses **`query` (first match), not `queryAll`**, so it will **silently begin matching T-08's new icon** instead of the row-level one while staying green: `KZ-014` and `KZ-001` together — a claim that stops being true and an assertion that stops measuring what it names.
> 3. **`c5`'s first test** stays true under T-08 (it matches the row-level copy only) but should be **re-read at that gate rather than assumed**.
> 4. **Advisories 1–4 above** are hygiene in the file T-08 owns: the `KZ-015` reachable-transition fix, the negative-spy retitle, `c4`'s containment assertion, and the **spy-restore-in-`finally`** risk. Authorise as a bundle only if T-08's own scope stays intact.
> 5. **When T-08 lands, the suppressed branch becomes genuinely unreachable** — record it as the known untested-but-retained path at that point, per `DD-9`'s honest caveat.

**Requirements covered** — `R-IUR-006` **in full**: S1 + its `BUT it must NOT render two competing messages`; AC.1, AC.2 (client half), AC.3, AC.4.

**Cannot prove (`KZ-017`)** — **paint**: a captured `.style.border` setter call is not a painted border; T-16 gate 3 is the only evidence, **and this card's amber border is not yet on gate 3's named list** → carried to T-16. **AC.2's amber on the *first render* of an already-invalid select is a composition, not a direct measurement** — the same shape recorded for T-12: `institutionMissing === true` on an untouched loaded row, plus `[style]` emitting the amber whenever it is true; **no test observes a first-render write**, and advisory 1 would close it directly. **AC.2's green-check half and rule 6's SQL** — T-13/T-18/T-19. The Reviewer executed **nothing** (read-only wrapper) and could not run `git diff`, so it cannot rule out an unreported edit elsewhere in the 684-line spec file; it read `.ts` and `.html` in full plus most of the spec and enumerated all 14 top-level `describe`s — the Leader's `git diff --stat` (20/18/121) bounds that gap.

---

### T-08 — Organization card, unknown path: type required, count required and positive

| Field | Value |
| --- | --- |
| **Status** | **`[~]` IN FLIGHT — code complete and verified green; Reviewer verdict PENDING at session end.** Not committed as done; **not** marked `[x]`. |
| Date | 2026-09-07 |
| Implementer attempts | **2** (attempt 1 never reviewed — it went straight to rework when the Leader's full-suite gate went red) |
| Effort assigned | `medium` on both attempts — deliberately never bumped; the rework cause was a Leader omission, not under-thinking |
| Skills assigned | `angular-developer`, `ui-ux-pro-max`, **`tdd`** |

**Production changes** (org card `.ts` 25 changed lines, `.html` 19, `.spec.ts` 173; `innovation-use-details.component.spec.ts` +20/−3)

- `Organization type`: unconditional red `*`; `[style]="organizationTypeMissing ? …"` amber border (`DD-3`, it had **none** before); new `#organizationTypeRequiredMessage` template with its own `.organization-type-required-message` hook.
- `Organization count`: `[requiredMode]="'positive'"`, nothing else. No `[isRequired]` (`DD-1` precedence), no card-side asterisk (it passes `[label]`, so `app-input` renders its own — the actor-card pattern), `[min]="0"` unchanged so `0` stays enterable and *then* flagged.
- New `organizationTypeMissing` getter; `showNotIdentifiedMessage` extended to `touched() && !identitySatisfied && !institutionMissing && !organizationTypeMissing`.

**`DD-9`'s "honest caveat" has now arrived, on schedule.** With both paths covered, `institutionMissing || organizationTypeMissing` is exactly equivalent to `!identitySatisfied`, so `showNotIdentifiedMessage` is **unconditionally `false`** — dead-but-reversible code. All three `OQ-6` artifacts survive (getter, `ng-template #notIdentifiedMessage`, render site); reversal is deleting clauses. **This is the gate at which the branch became genuinely unreachable** — the state T-07's `Cannot prove` described as a future condition.

**Verification, all Leader-re-measured**

| Gate | Result |
| --- | --- |
| org-card spec | **36/36** (baseline 34/34) |
| `innovation-use-details.component.spec` | **156/156** (restored from red) |
| **Full client suite** | **317 suites, 6857 tests, 0 failed** |
| `npm run build` | green |
| `eslint` | clean |
| `tsc -p tsconfig.spec.json` scoped | identical single pre-existing `TS2741` |

**Observed RED for both falsifying inputs** — taken by swapping in `git show HEAD:` originals, **never `git stash`**. `Organization count = 0` rendered **no message at all** pre-fix (`Received string: " Organization count "`), confirming there was no required/positivity distinction before `requiredMode`; the type field-level message count was `0` instead of `1`.

#### The rework, and why it was the Leader's fault

**Attempt 1 passed every gate inside its own file scope** — 36/36, build green, `eslint` clean, `tsc` no new errors — **and the branch was still broken.** The Leader's full-suite gate returned `1 failed / 6856 passed`, in a *different* file: `c10` in `innovation-use-details.component.spec.ts`, whose `organizationsCard` half asserted **no** asterisk on that card. T-08's `Organization type` asterisk falsifies it.

**The casualty was predicted, documented in three places, and still missed.** T-12's Implementer wrote the deferral *into the code* four lines above the assertion — `// ORGANIZATIONS is not this task's scope (T-07/T-08 own it)`. T-12's Reviewer endorsed it. The Leader recorded it in this file. **And then wrote T-08's brief with five forward pointers and omitted that one.** `/akili-execute` names the failure exactly: *"a pointer filed three tasks ago is not carried by having been filed — the brief carries it or nobody does."*

**Two structural lessons, recorded because they change how the Leader should work:**

1. **A test comment naming a future owner is documentation, not a mechanism.** It informs whoever reads *that* file — but the task that will break it never reads that file; that is precisely why the work was deferred. Only the brief carries a cross-file casualty.
2. **`execution.md` is where such pointers get recorded, and it is not what the Leader re-reads when composing a brief.** The Leader reads the target task's own entry and the pointers filed *under its heading*. A pointer filed under **T-12's** entry, naming T-08, does not surface when T-08 is opened. **Standing correction: grep `execution.md` for the target task's ID before composing its brief**, rather than relying on pointers filed under its own heading.

**Scope was widened by exactly one file** (`innovation-use-details.component.spec.ts`, `c10`'s `organizationsCard` assertion only), justified because T-08 *causes* the break, T-12 designated T-07/T-08 as owner, and no later task claimed it. **`tasks.md`'s T-08 `Files` line was corrected** to record that ownership with its reason.

**The `c10` fix** replaced a whole-card `hasAsteriskTextNode(organizationsCard)).toBe(false)` with per-field assertions (`orgLabels.length === 2`; `Organization type` and `Organization count` each carrying `*`) and replaced the stale *"behaviour has not changed"* comment. `Sub-type` is genuinely not rendered in that fixture (`subTypeOptions()` stays empty while `institution_type_id` is `undefined`).

**Two pre-existing tests rewritten that were on no pointer list** — the Implementer flagged both itself: `c4`'s second test (asserted zero asterisks on the unknown path; AC.1 falsifies it) and **T-07's un-suppression guard**, which asserted the row-level message renders on the unknown path. That guard was written by T-07 *specifically as a tripwire for this moment* — **it fired as designed.** A test written by one task to catch the next task's landing, working exactly as intended.

**Leader-found, pending the Reviewer's ruling:** `hasAsteriskTextNode` at `innovation-use-details.component.spec.ts:415` is now **defined but never used** — its only consumer was the assertion just replaced, and the measures half uses per-field queries. eslint ignores `*.spec.ts` (`K-002`), so nothing flags it. Dead code introduced by this change; referred for a FAIL-or-advisory ruling.

> **⚠ TO FINISH T-08 IN THE NEXT SESSION — start here. The verdict arrived: attempt 2 FAILED on two specified issues, and attempt 3 of 3 remains.**
> The remediation is fully specified in the attempt-2 block above; **no production code changes**, tests and comments only:
> 1. **Add the missing border assertion** (issue 1) — an unknown-path prototype-wide setter spy installed **before** the first `detectChanges()`, plus its negative after `onInstitutionTypeChange(10)`, and **prove it discriminates by temporarily deleting `.html:116`** (`K-004`). This is the one that matters: today deleting that line leaves every suite green.
> 2. **Fix the three stale `c10` titles/comments** (issue 2) — `:393`'s title, `:391-392`'s last sentence, `:370`'s header. No assertion changes. Take the dead `hasAsteriskTextNode` helper and its orphaned comment (`:411-415`) in the same edit.
> 3. Optionally the three other advisories (the `organizationTypeMissing` comment's overstatement, `c6`'s titles, `c9`'s caveat) — all comment-only.
> 4. Then re-dispatch the Reviewer, append the verdict, flip the board to `[x]`, and commit. **Do not mark `[x]` without a PASS** — `akili-tasks-gate.sh` enforces it.
> **Hold effort at `medium`.** Issue 1 is a genuine worker gap; issue 2 is the same class the Leader's own ten questions failed to ask about. Neither is under-thinking.

**Requirements covered (pending verdict)** — `R-IUR-007` in full (S1, AC.1–AC.3) · `R-IUR-009` AC.1–AC.3 + S1's `AND IT MUST`.

**Cannot prove (`KZ-017`)** — **paint** (T-16 gate 3), and **this card's amber borders are not yet on gate 3's named list** → carried to T-16. **The SQL halves** of `R-IUR-007` AC.2 and `R-IUR-009` AC.4 → T-19.

---

## SESSION HANDOFF — 2026-09-07

> **⚠ SUPERSEDED 2026-09-07 by `## HALT: T-08` at the end of this file.** This block was written
> while T-08's attempt-2 verdict was still pending and instructs the reader to run *"attempt 3 of
> 3"*. **Attempt 3 has since run and FAILED** — the rework ceiling is reached and T-08 is HALTED
> pending a user ruling. Everything below remains accurate as a point-in-time record and as the
> standing-decisions list; **its T-08 next-step instructions are spent.** Read the HALT block for
> current state (`KZ-013` — a live document may not keep asserting a superseded next step).

**Entry point for the next session: `/akili-resume`**, then read this file's §1.2 status board and the T-08 block above.

### Where the spec stands

**10 of 20 tasks complete and committed. T-08 is `[~]` in flight (code green, verdict pending).**

| Done `[x]` | In flight `[~]` | Remaining `[ ]` |
| --- | --- | --- |
| T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-11, T-12, T-15 | **T-08** | T-09, T-10, T-13, T-14, T-16 *(client gates)*, T-17, T-18, T-19, T-20 *(human)* |

**Branch health: GREEN.** Full client suite **317 suites / 6857 tests / 0 failed**; `npm run build` green. Both were red from T-03 until T-12 restored them — do not let that recur unnoticed: **the Leader must re-measure the full suite after every worker reports.** That gate, and nothing else, caught T-08's cross-file casualty.

**11 commits this session**, all `[SPEC:changes/innovation-use-required-fields]`. **Nothing has been pushed** — pushing is the user's call.

### What comes next, in order

- **T-09** (org sub-type conditional + explicit `null` on type change) — deps T-08. Its brief must carry: the `undefined`-is-dropped-by-`JSON.stringify` trap (`DD-5b`), the narrower-than-it-looks client predicate (`is_active` + root + has-children, **not** `EXISTS(parent_code = type)`), and that a mocked sub-types service **cannot** observe the `is_active` or root filters — equivalence is **T-14's**, and T-09 must not claim it.
- **T-10** (`DD-12` toggle clearing, both directions) — deps T-09. **Do not** add a save gate over the inactive path; `P-3` withdrew that and it produced a row that could neither be saved nor repaired.
- **T-13** (save gate + first blocked-save toast) — deps T-10, T-12. **There is no existing toast channel to reuse** (`S-2`); the duplicate-actor-type block is **silent today** and T-13 must cover it or it ships a second silent block.
- **T-14** (sub-type catalog equivalence, by enumeration) — deps T-09. A run against a **mocked** service is **inconclusive, never a pass**.
- **T-16** (client gates) — deps T-02, T-06, T-13, T-14, T-15. **Carries five accumulated items** (below).
- **T-17 → T-20** (server: `SELECT`-only sizing, migration, executed truth table, human apply) — PR 2.

### T-16's accumulated list — every visual claim in this spec lands here

Gate 3 must name **in words** (`KZ-002`): (a) amber border on a **text** field (`app-input :30`, `[style]`); (b) amber border on a **number** field (`app-input :49`, class); (c) message-row line-height after the `fs-[14] leading-[1.25rem]` swap; (d) **T-04's total-positivity message** (colour and `fs-[14]` asserted nowhere automatically); (e) **the amber border on a `p-select` — organization card, BOTH paths** (T-07 known, T-08 unknown). **(e) is confirmed missing from gate 3 and is the run's only NO-PAINT-OWNER gap:** `DC-1` is explicitly substituted by gate 3 (`tasks.md:563`), jsdom cannot paint, and T-08's Reviewer found the unknown-path border has no *automated* owner either (attempt-2 issue 1). Add it when T-16 is briefed; plus **gate 3b**'s dark-theme helper-text look and the two **T-15** doc claims re-read once T-07…T-11 have landed.

T-01, T-02, T-07 and T-08 all recorded their visual claims as **`inconclusive`, never passing**, pending gate 3.

### Standing decisions accumulated this session — carry these into every brief

1. **Never `git stash` in this checkout.** A T-06 worker's mis-ordered `-m` flag led to `git stash pop` applying `stash@{0}` — an unrelated stash from another branch whose own message reads **"DO NOT APPLY"** — conflicting three unrelated files. **18 stashes** live here. Copy to the scratchpad and swap back. *(Kaizen candidate: a repo-level guard.)*
2. **Border-spy scoping, by attribution need** — the earlier blanket ban was wrong and `DD-3` contradicts it. **Element-scoped** when claiming a *specific* element wrote a value (a second emitter causes a false **PASS** on a positive `toContainEqual`). **Prototype-wide** is stricter for a card-wide *negative* (a second emitter can only turn it **red**) and is the **only** instrument that can observe a **first** style write on a newly created element.
3. **Angular memoizes** the last-applied style value per property — a spy installed after the state settled records **zero calls**. Install before the transition.
4. **Re-measure every line citation before dispatch.** Citations in this spec have rotted or been misplaced in **six of eleven** tasks (`A-N4` family), including two that would have caused wrong work: T-07's `:302-316` (belonged to T-08) and T-08's `.html:36`/`:79` path boundaries.
5. **Grep `execution.md` for the target task's ID before composing its brief** — pointers filed under *another* task's heading do not surface otherwise. This is the T-08 lesson.
6. **Demand a reddening mutation per assertion**, and require the ones with none to be labelled regression-protection in-code. This converted T-05 to a first-attempt PASS after T-04 took three.
7. **Hold effort rather than bumping it** when a rework's cause was a false premise supplied to the worker rather than the worker's own thinking. Applied on T-04, T-12 and T-08.
8. **`prettier --write` is inadvisable in this spec's files** — it reflows unrelated blocks at `printWidth: 150`, and nothing in the repo gates spec formatting (`.husky/pre-commit` empty, eslint ignores `*.spec.ts`). T-11 and T-12 both had to undo that churn by hand.

### Open items not owned by any remaining task

- **`OQ-2`** (does `Specify other` get a red `*`) and **`OQ-3`** (the 15 untouched `app-input` templates' falsy-`0` audit) remain **open** and must not be closed by implementation — `tasks.md` §7's Definition of Done requires them carried forward as recorded open questions.
- **`RB-1`** (MEL / product-owner sign-off) is required **before PR 2 merges** — `T-17`'s population sizing feeds it.
- **Budget:** 20 tasks / ~1,650 LOC / ~24 review rounds (`RB-8` re-baseline). Review rounds are running **above** estimate — T-04 (3 attempts), T-12 (3), T-08 (2) — but the task count and LOC are on plan. **No tripwire escalation is owed**; flagged so the next session can judge.

#### T-08 attempt 2 — Reviewer `STATUS: FAIL`, 2 issues *(verdict arrived after the handoff block was written; recorded here, attempt 3 of 3 remains)*

**Issue 1 — the amber border on `Organization type` is implemented and asserted NOWHERE.** `.html:116` writes `[style]="organizationTypeMissing ? { border: '2px solid var(--ac-warning-1)' } : {}"`, but the only two `border` setter spies in the file (`:411`, `:426`) both belong to **T-07's known-path** select. **Deleting line 116 outright leaves the org-card suite 36/36 green and the full suite green.** That is the exact `D-8`/`DC-1` class the `[style]` mechanism was mandated to prevent — a border that is generated, correctly placed, and provably unmeasured.

*Violated:* `R-IUR-007` S1 + AC.2 (*"renders the amber treatment"*), with "amber treatment" defined at `R-IUR-003` as *"2px solid `var(--ac-warning-1)` border on the control"*; `DD-3`'s table row prescribing the **setter spy** for `p-select`; `tasks.md` §7, which names **T-08** as an enforcement point for the no-Tailwind-utility rule; and `.agents/reviewer.md` §5 (*a presence-assertion is not a behavioural proof*). T-08 claims `R-IUR-007` **in full** and defers only the **SQL** half to T-19 — the client half is in scope.

*Remediation (specified):* one test in the `R-IUR-007 (T-08)` describe, mirroring `:407-421` — unknown-path fixture, `jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set')` installed **before** the first `detectChanges()` (the type select's write happens on that first pass), `try/finally` restore, assert `toContainEqual(['2px solid var(--ac-warning-1)'])`. Then the negative after `onInstitutionTypeChange(10)`. **Prove it discriminates by temporarily deleting `.html:116` — the positive must redden** (`K-004`).

**Issue 2 — the `c10` rewrite fixed the body and left three titles/comments asserting the opposite.** `innovation-use-details.component.spec.ts:393`'s title still reads *"renders no asterisk on the Organizations card"* while the body now asserts **two**; `:391-392` still reads *"The organizationsCard half is untouched — it still belongs to T-07/T-08, which have not yet added required fields to that card"*, four lines above the new comment correctly saying *"it is not unchanged"*; and the describe header at `:370` still says *"cards 3 and 4 carry no asterisk"*. **A red on this test prints a name that points the next maintainer in exactly the wrong direction.** Same defect shape T-08's own `Verify` line ordered fixed in the sibling file — and which the Implementer *did* fix there.

*Violated:* `CLAUDE.md` §4.3 `K-004`/`KZ-014` (*not in a code comment*); `tasks.md` T-08's `Verify` applied consistently to the file added to its scope; `.agents/reviewer.md` §2 (preserved comments must remain **true**).

*Remediation:* retitle `:393`, delete the last sentence of `:391-392`, correct `:370`. **No assertion changes.**

**A gap in the Leader's own brief:** ten named audit questions were asked, and **none of them asked whether the new border was asserted** — only whether it was *added* per `DD-3`. The Reviewer found issue 1 unprompted. Recorded because it is the same shape as the T-08 pointer omission: the Leader verified the presence of a change and not the existence of its proof.

**Everything else PASSED, ruled explicitly** — rules 7 & 9 conformance (`[requiredMode]` the only new binding; no `[isRequired]`, so `c1`'s `expect(countInput.isRequired).toBe(false)` keeps it that way; `[min]="0"` unchanged so `0` is enterable then flagged); AC.3 structural; **the suppression extension and unreachability confirmed** — `institutionMissing || organizationTypeMissing` **is** exactly `!identitySatisfied`, the two conjuncts partitioning on `is_organization_known`, and it holds under a `null`/`undefined` mode because `identitySatisfied`'s ternary routes falsy to the type branch, matching the template's `@else`; the Disqualifier satisfied (`selectByAria` resolves a real component instance via `By.directive(Select)`, so falsy means **not in the DOM**); the `:413-427` rewrite done with both stale claims fixed and its new `icons.length === 1` claim **true and discriminating**; all four hygiene items present and accurate, with the `KZ-015` reasoning verified by hand (the type select's write happens *before* the spy is installed, so the captured value in that window can only be the newly-created org select's); the `c10` per-field rewrite verified from source with **`orgLabels.length === 2` ruled a strengthening** — it is what makes the *"and nothing else does"* clause true, and it is the tripwire that will correctly redden when T-09 adds the `Sub-type` asterisk; both un-pointered casualties rewritten not deleted; scope clean against T-09/T-10/T-13/T-14.

**`ADVISORY`** — (a) the dead `hasAsteriskTextNode` helper at `:415` is **ruled advisory, not FAIL** (no rule mandates removal, no assertion weakened) but should go in the same edit as issue 2, with its now-orphaned explanatory comment. (b) `organizationTypeMissing`'s comment overstates: dropping the leading conjunct changes **no observable behaviour today** because `!institutionMissing` co-suppresses on the known path, and **no test can redden for it** — an unwitnessed counterfactual (`KZ-014` territory). The accurate, still-valuable claim is that the conjunct is what makes `OQ-6`'s **per-path** reversibility real. (c) `c6`'s *"0 accepted"* titles now read ambiguously against `R-IUR-009`; the assertions are correct and needed (`0` must be **stored**, not dropped, which is what makes AC.2 verifiable) — one clause distinguishing *enterable and stored* from *valid* would prevent a misreading. (d) `c9`'s page-wide `not.toContain('This field is required')` survives T-08 **only** because its fixture is `organizations: []`; pre-existing, but T-08 widens the set of rows that would falsify it.

> **⚠ PAINT OWNER GAP — Leader-owned, and the most important item to carry.** **Neither T-07's nor T-08's `p-select` amber border appears on T-16 gate 3's named field list.** Gate 3 currently names the `app-input` text-field border, the number-field border, the message line-height, gate 3b's dark-theme helper text, and T-04's total-positivity message. With `DC-1` explicitly substituted by gate 3 (`tasks.md:563`) and jsdom unable to paint, **these two borders currently have no paint owner at all** — and issue 1 shows one of them has no *automated* owner either. **Add "the amber border on a `p-select` (organization card, both paths)" to gate 3's field list** when T-16 is briefed.

---

#### T-08 attempt 3 of 3 — Reviewer `STATUS: FAIL`, 3 issues → **HALT** (rework ceiling reached)

| Field | Value |
| --- | --- |
| Date | 2026-09-07 |
| Effort assigned | `medium` on all three attempts — **deliberately never bumped**; ruling recorded before dispatch (see the attempt-2 handoff note). Attempt 3's causes confirm it: none of the three findings is under-thinking |
| Skills | `angular-developer` (task list, unmodified) |
| Scope | **tests and comments only, no production code** — attempt 2's implementation passed and was left untouched |
| Files changed | `innovation-use-organization-item.component.spec.ts` (+65/−4) · `innovation-use-details.component.spec.ts` (+11/−11). **No production file in the diff** |

**What attempt 3 closed, and it did close it.** Attempt-2 Issue 1 — an amber border implemented at
`.html:116` and asserted **nowhere**, the exact `D-8`/`DC-1` shape the `[style]` mechanism exists to
prevent — is **genuinely closed** by a mutation-proven positive. The red was observed, verbatim:

```
● … › AC.2: an unfilled unknown-path row writes the amber border somewhere in the card on construction
    expect(received).toContainEqual(expected) // deep equality
    Expected value: ["2px solid var(--ac-warning-1)"]
    Received array: []
Tests:       1 failed, 37 passed, 38 total
```

with `.html:116` deleted, green after restoring it. Restored by scratchpad copy, **never `git stash`**
(standing decision 1). Leader-verified independently: `git diff --exit-code` on the `.html` exits `0`.
Attempt-2 Issue 2's three stale `c10` strings are **all correctly fixed**, and advisory (a) removed
the right `hasAsteriskTextNode` while leaving the differently-scoped live one at `:312` intact.

**Verification.**

| Check | Result |
| --- | --- |
| `npm test -- --silent -- innovation-use-organization-item.component.spec` | 38/38 passed |
| `npm test -- --silent -- innovation-use-details.component.spec` | 156/156 passed |
| **Full client suite, Leader-re-measured in a quiet tree** (`npm test -- --silent`) | **317 suites / 6859 tests / 0 failed**, exit 0 · coverage 98.2 / 96.3 / 97.82 / 98.5. **+2 against the 6857 baseline — exactly the two new tests.** The cross-file gate that caught T-08's casualty last session is clean |
| `npx tsc -p tsconfig.spec.json --noEmit`, normalized-diffed vs `git show HEAD:…` | error set identical before/after (one pre-existing unrelated `TS2741`) — no new type errors |
| `npx eslint` | **Cannot reach this diff** (`KZ-017`) — both files are `*.spec.ts`, which eslint ignores here (`K-002`). Declared, not cited as clean |

**Reviewer `STATUS: FAIL` — 3 issues, all in the in-code claim layer.**

1. **The negative test's fixture is the wrong type, and the comment justifying it asserts a fact the
   file falsifies six lines up.** `:365` claims `onInstitutionTypeChange(10)` is *"a type that is
   neither OTHER (78) nor sub-typed, already used this way … (e.g. the `c2` describe above)"*. **Type
   10 is the sub-typed fixture:** `SUB_TYPES_BY_TYPE` at `:28-33` gives it two rows under the comment
   *"Type 10 resolves rows; type 20 resolves zero rows"*, and `c2`'s first test (`:236-244`) asserts
   *"type 10 resolves two rows → the sub-type select is rendered"* — the inverse of the claim.
   **Not merely false prose: it selects the wrong fixture.** `onInstitutionTypeChange` sets
   `sub_institution_type_id: undefined` (`.ts:144`), so the type-10 arrangement renders a sub-type
   select with an empty required value **inside the spy window** — and **T-09, `Deps: T-08`, adds the
   amber `[style]` to exactly that control** (`design.md:662`). This card-wide
   `not.toContainEqual([amber])` then goes **red in T-09 for a reason unrelated to its subject**, with
   a comment pointing the diagnosis away from the cause. *Reachable and deterministic.* `type 20`
   reaches the same `organizationTypeMissing === false` state with no sub-type select at all.
   *Violated:* `K-004`/`KZ-014` (*not in a code comment*); `.agents/reviewer.md` §2.
2. **The negative test cannot distinguish "the border cleared" from "the border never cleared".**
   Its spy opens **after** the settle, and Angular's `updateStylingMap` writes only when
   `oldValue !== newValue` — the memoization the diff's own comment states at `:338`. Under an
   unconditional-`[style]` mutation the value is unchanged across the transition, **nothing is
   written, and `not.toContainEqual([amber])` passes**. The Implementer disclosed this honestly — but
   the disclosure lives in a **transient report** while the surviving artifacts (the title *"stops
   writing the amber border"*, filed as *"AC.2 negative"*, and a mechanism argument that never records
   that no write would occur if the border stayed either) read as proof of a clearing that nothing
   proves. The correct pattern is already in-tree at `innovation-use-details.component.spec.ts:501-507`,
   which puts the limitation **in the title**.
   *Violated:* `.agents/reviewer.md` §5 (*an explicitly recorded gap — never a pass*; here the gap is
   recorded in the report and **contradicted** in the file); `DC-7`; `K-004`/`KZ-014`.
3. **Two in-code cross-references now point at the wrong place, one at content this edit deleted.**
   (i) `:333-334` cites the exemplar at *"`:407-421` / `:425-434`"* — attempt-2 coordinates. **The 55
   lines this same diff inserts above them moved the exemplar to `:462-476` / `:480-490`**; `:407-421`
   now holds the `R-IUR-006` describe header. *The comment was invalidated by the very edit that wrote
   it.* (ii) `innovation-use-details.component.spec.ts:309-310` still points at *"`c10`'s REWORK at
   `:361-366`"* — **advisory (a) deleted that block**, and `:361-366` now holds this diff's new
   advisory-(d) comment. *Violated:* `.agents/reviewer.md` §2; `KZ-014`.

**Reviewer's own note for adjudication:** *"all three issues sit in the test-comment/title/fixture
layer. The production implementation is correct and untouched … Combined remediation for Issues 1–3
is roughly six lines across two files."*

**`ADVISORY` (recorded, never gating, and never a new task):**
- **Reliability — the "clears when filled" direction on `Organization type` is measured by nothing at
  all, message included.** `@if (organizationTypeMissing)` at `.html:138` can be replaced with
  `@if (true)` and **every assertion in the file stays green** (`:319`/`:511`/`:555` all assert `1`
  with the type missing; `:327`'s `0` comes from the container being absent on the known path, not
  from the guard). Live silent-pass path today. Filed advisory because `R-IUR-003` S1's clearing
  clause is assigned to **T-01+T-02+T-16** at `tasks.md:507`, not to T-08 — one line inside the
  existing describe would close it and would also satisfy Issue 2's remediation (c).
- **Readability — carried advisory (b) still has no owner.** The `organizationTypeMissing`
  doc-comment at `.ts:199-202` overstates ("dropping it would silently widen suppression onto the
  known path") with no observable consequence, since `institutionMissing` already suppresses there.
  Correctly skipped here as a production-file edit. **T-09 and T-10 both touch this file** and either
  can fold it in — routed as a pointer, not minted as a task.
- **Readability — the new advisory-(d) comment conflates the asterisk with the message** in its first
  clause; it is the required *message*, not the asterisk, that would falsify
  `not.toContain('This field is required')`. Second half is correct. Cosmetic.

**Requirements status per the Reviewer's independent read** — `R-IUR-007` S1 border ✓ (`:351`),
message ✓ (`:319`, `:511-522`), asterisk ✓; AC.1 ✓; AC.2 client half ✓; AC.3 ✓ by container absence.
`R-IUR-009` AC.1 ✓, AC.2 ✓, AC.3 ✓ (via `input.component.spec.ts:765` + behavioural wiring at
`:388-402`), S1's `AND IT MUST` ✓. **Legitimately deferred:** paint → T-16 gate 3; the SQL halves of
`R-IUR-007` AC.2 / `R-IUR-009` AC.4 → T-19. **Genuinely unmeasured, not deferred:** the *clearing*
direction (advisory 1 above).

**`Not Done / Assumptions` from the Implementer, carried verbatim as scope still owed:** advisory (b)
not done (production file, out of this attempt's scope); the AC.2 negative is regression-protection,
not independently-proven-discriminating; full suite deliberately left to the Leader; `npx eslint`
cannot reach the diff.

---

## HALT: T-08 — rework ceiling reached (3 of 3 attempts FAILED)

**Status: `[~]`. The working tree was NOT rolled back — see the ruling below.**

### Attempt history

| Attempt | Effort | Outcome |
| --- | --- | --- |
| 1 | `medium` | FAIL — known/unknown path boundary and message precedence |
| 2 | `medium` | FAIL — 2 issues: the amber border implemented and **asserted nowhere**; three `c10` titles/comments asserting the reverse of their own bodies |
| 3 | `medium` | FAIL — 3 issues: wrong fixture + a self-falsified justification comment; a negative test that cannot fail; two cross-references broken by this same edit |

### Automatic Rollback — deliberately NOT executed, and why

`/akili-execute` Step 4 orders `git restore . && git clean -fd` on HALT. **The Leader declined to run
it and is escalating instead.** That step exists so a HALT does not leave broken code for the user to
clean up. The premise does not hold here, and acting on it would cause the harm it exists to prevent:

- the tree is **green** — 317 suites / 6859 tests / 0 failed, no new type errors;
- the diff contains **no production code**;
- it **closes attempt-2's substantive defect** — the unmeasured amber border, proven by an observed
  red. Rolling back **reinstates a binding that nothing measures**, which is strictly worse than the
  current state and is the precise defect class this spec is being run to eliminate;
- all three surviving findings are ~6 lines of comment/title/fixture text.

A rollback is destructive and hard to reverse; the user decides it, not the Leader.

### Leader's root-cause hypothesis

**All three attempts failed on the same class, and it is not the worker.** Every finding across
attempts 2 and 3 lives in the **in-code claim layer** — comments, titles, and the fixture choices
those comments justify — never in production logic, which passed on attempt 2 and was never
re-touched. Three generators, all structural:

1. **Prose in this spec carries evidential weight** (`K-004`/`KZ-014`: a red not seen may not be
   asserted *in a code comment*), so every comment is an assertion held to a test's standard — while
   **nothing in the loop verifies prose except the Reviewer**, at the end, one attempt at a time.
2. **A test-file edit invalidates the coordinates and referents the same edit writes.** Issue 3(i) is
   self-invalidating on write (55 inserted lines moved the exemplar the new comment cites); 3(ii) is a
   pointer orphaned by a sibling deletion in the same diff. Line-numbered in-file citations cannot
   survive their own insertion. **The durable fix is to cite tests by title, not by line** — this is
   the `A-N4` family again, now firing *within* a single edit rather than across sessions.
3. **The honest disclosure went to the transient report instead of the surviving artifact** (Issue 2).
   The Implementer labelled the non-discriminating negative correctly *in its report*, which no future
   reader sees, while the file's title claims the opposite. The process demand said "say so and label
   it regression-protection" — it did not say **where**, and the in-tree exemplar at
   `details.component.spec.ts:501-507` puts it in the title.

**A share of this is the Leader's own brief, recorded for the same reason attempt 2's was.** My brief
ordered *"sweep the whole `c10` block"* — and the worker did, correctly, finding zero further stale
claims **inside `c10`**. Issue 3(ii) and the `c6` breakage sit **outside** `c10`. The sweep region I
specified was narrower than the claim I asked the worker to make: **`KZ-017`, and this instance is
mine.** The instruction should have been *"every comment in both touched files, and every in-file
citation your own insertion moves."*

### What is genuinely blocked, and what is not

**Not blocked:** the production implementation, `R-IUR-007` and `R-IUR-009`'s client halves (the
Reviewer verified both discharged), and the branch (green).

**Blocked:** T-08's `[x]`, and therefore T-09 and T-10 by dependency. **Issue 1 carries a
deterministic downstream cost:** left as committed, the type-10 fixture makes T-09 turn this test red
for an unrelated reason, with a comment that misdirects the diagnosis. That is the one finding that
does not keep.

### User ruling on the HALT — rework ceiling lifted by one (2026-09-07)

**Ruling:** run a **4th attempt** with the Leader's brief corrected. Chosen from four options presented
at the HALT gate (4th attempt · Leader-inline fix then review · fix only finding 1 and accept 2–3 ·
park T-08). The ceiling is a methodology guardrail, not a law of the run; **lifting it is the user's
call and it was made explicitly.** Recorded here because an attempt beyond the ceiling would otherwise
read as the loop having quietly ignored its own limit.

**The rollback stays declined** — the option to revert was on the table and was not taken. The tree
remains green with attempt 3's committed work in place.

**What the corrected brief changes, and why each change traces to a measured cause:**

| Correction | Cause it addresses |
| --- | --- |
| **Sweep every comment and title in BOTH files end to end**, with a per-file completeness line including zeros | Attempt 3's brief said *"sweep the whole `c10` block"*; findings 3(ii) and the `c6` breakage sit outside `c10`. **`KZ-017`, Leader-owned** |
| **No comment may carry a `:NNN` citation to a location in its own file** — cite tests by title; grep for survivors after the edit and report the count | Issue 3(i) was invalidated by the same insertion that wrote it. Third firing of the `A-N4` family in this spec; line citations cannot survive their own edit |
| **Issue 2 remediation ordered (a) → (b) → (c), stop at the first one PROVEN**, with the Reviewer's `removeStyle` mechanism explicitly labelled a claim the worker must observe rather than repeat | `KZ-014`/`KZ-007`: the Reviewer's remediation contains an unobserved mechanism assertion. Relaying it as fact would be the same defect one layer up |
| **Scope fence: the advisory's `.organization-type-required-message` length-`0` assertion is FORBIDDEN** | `tasks.md:507` assigns `R-IUR-003` S1's clearing clause to T-01+T-02+T-16, not T-08. An advisory may not grow this task |
| **Read `SUB_TYPES_BY_TYPE` yourself; take neither the Leader's nor the Reviewer's word for which type is sub-typed** | Issue 1 was a false claim *about the file* made without re-reading the file. The brief must not reproduce that shape |
| Effort **`medium` → `high`** | First bump in this task. The held-`medium` ruling was correct for attempts 1–3 (causes were false premises and brief gaps); attempt 3 added a genuine carefulness component, and this is a post-ceiling attempt |

---

#### T-08 attempt 4 — Reviewer `STATUS: PASS` ✅ **task complete**

| Field | Value |
| --- | --- |
| Date | 2026-09-07 |
| Effort assigned | `high` (bumped from the held `medium`; first bump in this task — post-ceiling attempt with a genuine carefulness component) |
| Skills | `angular-developer` |
| Scope | tests and comments only — **no production code**, Leader-verified |
| Files changed | `innovation-use-organization-item.component.spec.ts` (+37/−10) · `innovation-use-details.component.spec.ts` (+10/−6) |
| Attempts consumed | **4** (ceiling of 3 lifted by one on explicit user ruling — see the ruling record above) |

**What closed each attempt-3 issue.**

- **Issue 1 (wrong fixture + self-falsified comment)** — fixture switched `onInstitutionTypeChange(10)` → `(20)` after the worker read `SUB_TYPES_BY_TYPE` itself rather than trusting the Leader's or the Reviewer's account of it. The comment now states the fixture facts accurately. **Reviewer verified at the source:** `SUB_TYPES_BY_TYPE` (`:28-34`) maps `10` → two rows, `20` → `[]`; `INSTITUTION_TYPES:24` and `OTHER_INSTITUTION_TYPE_ID = 78` (`.ts:36`) make `20` neither OTHER nor sub-typed; `c2`'s first test (`:236`) says what the comment claims; and the T-09 forward claim holds — `design.md:662` gives `organization-item` three `p-select` borders and `tasks.md:520` assigns rule 8 to T-09.
- **Issue 2 (a negative test that could not fail)** — landed remediation **(a)**: `not.toContainEqual(['2px solid var(--ac-warning-1)'])` → `toContainEqual([''])`, asserting the **clearing** write positively. Red observed with `.html:116` forced unconditionally amber:

```
● … › AC.2 negative: filling the organization type clears the amber-border write
    expect(received).toContainEqual(expected) // deep equality
    Expected value: [""]
    Received array: []
      404 |         expect(borderSetSpy.mock.calls).toContainEqual(['']);
Tests: 1 failed, 37 passed, 38 total
```

  reverted after, green 38/38. **Attribution is clean, and the Reviewer established this rather than assuming it** — it enumerated every `border` writer on the unknown path: `.html:116` is the only `[style]`-bound border; the sub-type select (`.html:144-171`) and `Specify other` (`.html:175-183`) carry none and do not render at type `20`; and the `Organization count` `app-input` **cannot** contribute because `input.component.html:30`'s `[style]` border sits on the `type === 'text'` branch while this field is `[type]="'number'"`, which uses the class at `:49`. So the prototype-wide spy has exactly one possible source here.
- **Issue 3 (two broken cross-references)** — both repointed to drift-proof forms: the exemplar is now cited by **describe title** (verified present verbatim at `:433`, its two AC.2 tests at `:487`/`:505`, genuinely below the citing comment), and the details-spec parenthetical is now self-contained with one accurate cross-file pointer (`innovation-use-details.component.html:15` does render `<span class="text-red-500">*</span>`). **Same-file `:NNN` citation survivors: 0 in both files**, independently re-grepped by the Reviewer. It also found the worker's self-inflicted drift was **worse than reported**: the prior `:2533` pointer was *already* wrong before this attempt (the `beforeEach` is at `:2546`).

**Verification.**

| Check | Result |
| --- | --- |
| `npm test -- --silent -- innovation-use-organization-item.component.spec` | 38/38 passed |
| `npm test -- --silent -- innovation-use-details.component.spec` | 156/156 passed |
| Reddening mutation for remediation (a) | **Red observed, verbatim above**; reverted, green after |
| **Full client suite, Leader-re-measured in a quiet tree** | **317 suites / 6859 tests / 0 failed**, exit 0 · coverage 98.2 / 96.3 / 97.82 / 98.5 |
| `git diff --exit-code` on `…organization-item.component.html` | **exit 0** — mutation fully reverted, no production file in the diff (Leader-verified) |
| `K-020` citation the worker used to dismiss a targeted run's exit code | **Real** — `client/research-indicators/src/CLAUDE.md:152`. Leader-verified rather than accepted |
| `npx eslint` | **Cannot reach this diff** (`KZ-017`) — both files are `*.spec.ts`, ignored here (`K-002`) |
| `npx tsc -p tsconfig.spec.json` normalized set-diff | **Not run for this attempt.** Safe (a numeric literal and a string literal), and the gate is **T-16 gate 2**, still outstanding for the spec |

**Requirements covered — Reviewer-verified discharged, not merely claimed.** `R-IUR-007` AC.1 (`c4`'s two-asterisk unknown-path test with label containment, `:295-305`), AC.2's client half (amber positive `:354` + message count `:319`/`:546`/`:580`), AC.3 (container-absence falsifier `:313` + `c4`'s one-asterisk known-path test). `R-IUR-009` AC.1–AC.3 (`c4` + the empty-vs-`0` message test `:414`) and S1's `AND IT MUST`. **Deferred, correctly:** paint → **T-16 gate 3**; the SQL halves of `R-IUR-007` AC.2 and `R-IUR-009` AC.4 → **T-19** (`tasks.md:253`).

**Leader adjudication of the Implementer's `Not Done / Assumptions` (Step 2.3 item 0 — a task with outstanding scope never reaches `[x]`, even on a PASS).** Four items were declared; **none is T-08 scope still owed**:
1. *Did not exhaustively read the ~2080 out-of-scope lines of the details spec beyond a keyword grep.* — **Not a gap.** `tasks.md:247` scopes T-08's touch of that file to *"`c10`'s `organizationsCard` assertion only"*; the worker read ~1050 lines end to end, which is **above** assigned scope. The Reviewer ruled on this independently (Q5) and confirmed the unread region is `R-MSD-*`/contrast material that T-07/T-08/T-12 do not falsify.
2. *Left pre-existing out-of-scope citations untouched.* — Correct; see the carried item below.
3. *Added no message-absence assertion.* — The **Leader's own fence**, honored. Not a gap.
4. *Did not commit.* — The Leader's job, done below.

**`ADVISORY` — recorded, never gating, and explicitly NOT minted as tasks:**
1. **The fixture-correction comment over-claims its consequence.** It says type 10 *"would redden this test once T-09 lands"*; the Reviewer **constructed that sequence (type 10 + T-09 landed) and it passes** — an extra amber write cannot falsify `toContainEqual([''])`, because the type select still writes `''` either way. The fixture change remains correct (type 20 removes a confound any future amber-negative strengthening would trip on); only the strength of the claim is wrong. Suggested wording is in the verdict. **Same comment-accuracy family that consumed attempts 2–4 — routed as a pointer to T-09/T-10, both of which touch this file, not reopened here.**
2. The negative test's title omits the card-wide caveat its positive sibling carries. Harmless — attribution is clean per Q2 — but asymmetric.
3. The negative proves *a* border cleared, not that the *amber* one did. The Reviewer **could not construct a reachable defect** satisfying `['']` while breaking AC.2 with the positive also running. `toEqual([['']])` would close it belt-and-braces.
4. Pre-existing stale **cross-file** citations survive in the details spec at `:2615-2627` (`justificationError()` `:114` → now `.ts:283`; `unaddressedSaveErrors()` `:249` → `:296`; `saveErrors.set` `:599` → `:583`/`:600`). Out of T-08's scope. Reviewer suggests an `/akili-quick` line-number purge over that file rather than rework here — **a suggestion for the user, not a task in this spec.**
5. `innovation-use-details.component.spec.ts:2733` is ~135 chars against the block's ~120 wrap. No gate catches it (prettier does not reflow comments; eslint ignores `*.spec.ts`).

**Carried forward, with owners:** advisory (b) from attempt 3 (the `organizationTypeMissing` doc-comment overstatement in production code) → **T-09/T-10**; advisories 1–3 above → **T-09/T-10**; the `tsc` set-diff → **T-16 gate 2**; **the amber border on a `p-select`, organization card, BOTH paths → T-16 gate 3's named field list** (still the run's `NO-PAINT-OWNER` gap, and still not on that list).

---

### T-09 attempt 1 — Reviewer `STATUS: FAIL`, 2 issues (both citation-layer)

| Field | Value |
| --- | --- |
| Date | 2026-09-07 |
| Effort assigned | `high` (task said `M`; raised for a silent-persistence defect and a tight round budget) |
| Skills | `angular-developer`, `systematic-debugging` |

**Substance PASSED, verified at the source by the Reviewer, and none of it is reopened by the rework:**
`R-IUR-008` S1, S2, the `BUT` clause and AC.1–AC.3 discharged on the client · `DD-9` precedence claim
verified (two field-level messages **cannot** co-render: a non-empty `subTypeOptions()` implies a
truthy `institution_type_id`, which forces `organizationTypeMissing` and `showNotIdentifiedMessage`
false) · both new mock claims true, each checked in the file that makes it · unconditional asterisk
ruled **conformant** (`R-IUR-003` AC.1 is unconditional; only border and message are state-driven) ·
clearing on every type change ruled conformant (PrimeNG's `onOptionSelect` is guarded by
`if (!this.isSelected(option))`, so re-picking the same type emits no `onChange` — no over-clearing
path exists) · both `regression-protection` labels ruled correct · border-spy attribution established,
not assumed. **All three of the Leader's scope rulings confirmed correct**, including the decision not
to modify `innovation-use-details.component.ts` (`:530` already forwards the value and its payload
type already declared `number | null`).

**The `0`-falsy question the Leader raised — investigated and ruled acceptable, with reasoning.**
`subTypeMissing` tests `!this.body().sub_institution_type_id`. The Reviewer **could not construct a
reachable defect**: `code` is a CLARISA `bigint` `@PrimaryColumn` so `0` is representable, but no
fixture, seed or baseline holds `code: 0` and no client path produces one. The spec's `0`-is-a-value
requirements are scoped to **user-entered quantities** (`R-IUR-004`, `R-IUR-009`), never catalog ids,
and the identical falsy test already ships **three times** for the same catalog — `institutionMissing`,
`organizationTypeMissing`, and innovation-**dev**'s own `subTypeMissing`. Changing it here alone would
*create* the inconsistency. **Routed to T-14's enumeration (does a code-0 type exist?) and T-19's
truth table** — the surfaces that can actually answer it.

**FAIL issue 1 — this diff rotted three cross-file citations and did not repair them.** The 11-line
`#subTypeRequiredMessage` insertion pushed the `Organization type` `[style]` binding from
`.html:116` → `.html:127`, falsifying three comments in the spec file the same diff edits. **Leader
re-verified each:** `.html:116` is now `      }`, a closing brace, and the binding is at `:127`. Two
of the three name **the mutation that produced an observed red** — evidence prose gone false. Fourth
firing of the `A-N4` family in this spec.

**FAIL issue 2 — the new HTML comment re-seeded two same-file `:NNN` citations** (`.html:9-12`,
`:20-23`), against a standing rule this spec closed at T-08 attempt 4 on *"0 survivors"*.

#### Leader error, recorded because the generator is mine and not the worker's

My attempt-1 brief said: *"no comment may carry a `:NNN` reference to a location inside its own file.
**Cross-file citations are allowed but verify each one.**"* The worker complied exactly — it verified
`.html:116`, which was **true when it read it** — and then its own insertion moved it. **The rule drew
the boundary in the wrong place.** The hazard is not the file boundary; it is the citing and cited
files sharing an **edit window**, and in this spec the component, its template and its spec are always
edited together.

**Worse, and this is the part worth keeping: the repo had already made this exact correction, and I
authored a weaker rule instead of reading it.** `server/researchindicators/src/CLAUDE.md:189`
carries **FP-50**, whose own text records the amendment: *"cite by anchor, not by line number,
whenever the cited file could move (added 2026-08-19; ~~'a cross-file line citation is fine'~~
**AMENDED 2026-08-20**)"* — the struck clause is, almost verbatim, the permission I granted. FP-50
even states it is *"a measurement, not a style preference: six of the originating spec's seven
inaccurate citations were same-file line numbers invalidated by the very edit that introduced them."*

**Corrected rule now in force for the rest of this spec:** *cite by name — symbol, test title,
template name, or a quoted code fragment — **never** by line number, for any file this spec touches.*

**Two Kaizen candidates, not actioned here:**
1. **FP-50 lives only in the `server/` child guide** while the rule is package-neutral documentation
   hygiene — and every one of its four firings in this spec has been in **client** files. It belongs
   in root `CLAUDE.md` §4.3.
2. **The Leader's `:NNN` sweep has been narrower than its claim twice.** T-08 attempt 4 closed on
   "0 same-file survivors in **both files**" — the two **spec** files; the `.html` was never swept,
   and it holds a pre-existing same-file citation (T-08's `#organizationTypeRequiredMessage` comment,
   *"mirrors T-07's own rationale at :9-12"*) that the Leader found only now. `KZ-017`, third
   instance, Leader-owned each time. **Attempt 2's sweep is specified over all five touched files.**

**Effort held at `high`, not bumped.** Issue 1's generator is the Leader's rule; issue 2 is a
mechanical miss of an instruction that *was* given. Neither is under-thinking, and bumping the dial to
replace five strings with names buys nothing. Attempt 2's brief carries the corrected rule instead —
plus the fourth, pre-existing `.html` instance, folded in with its reason stated, because the standing
rule governs the file already under edit and leaving one behind guarantees a fifth firing.

**Advisories recorded (not gating, not minted as tasks):** the AC.2 test's two structurally-guarded
assertions want their `regression-protection` status in the **surviving artifact** rather than the
transient report (T-08's generator 3 — **the Leader's process demand never said *where*; fixed for
T-10 onward rather than charged to this worker**) · the `0` case → T-14/T-19 · the attempt-4 fixture
comment's stale consequence clause → T-10 · the T-11 comment in the interface file citing
`innovation-use-details.component.ts:80-85` for a payload type now at `:95-100`, rotted by T-12 →
candidate for an `/akili-quick` line-number purge, not rework here.

---

## User ruling — comment/citation inaccuracy is ADVISORY, not FAIL (2026-09-07)

**In force from T-09 attempt 2 onward, for the remainder of this spec.** Recorded as a Document
Control-level change to how the Reviewer gate is applied, because it alters what consumes the rework
budget — not a per-task decision.

### The measurement that prompted it

The user asked why the review loop was failing so often and what it was costing. The honest tally:

| Metric | Value |
| --- | --- |
| Subagent tokens, this session, 6 completed runs | **1,015,321** |
| Review rounds consumed | **20 of ~24** budgeted, with 9 tasks remaining |
| Rounds spent on **production-logic** defects | **0** |
| Rounds spent on the **in-code claim layer** (comments, titles, citations, fixture justifications) | **all of them** |

Production logic passed on first presentation every time it was submitted: T-08's from attempt 2
onward (attempts 3 and 4 changed **no** production line), T-09's on attempt 1. Of the six runs, two
delivered the substantive value — T-08's mutation-proven border assertion (a binding that was
implemented and measured by nothing) and T-09's `JSON.stringify` fix (a silent data-survival bug).
The other four went to prose.

### Why the loop generated this

1. **This spec elevated comments to evidence.** `K-004`/`KZ-014` forbids asserting an unobserved red
   *"not in a code comment"* — correct as a guard against fabricated evidence, but its consequence is
   that each of ~100+ comment blocks per file becomes an auditable assertion held to a test's
   standard, with nothing verifying prose except the Reviewer, at the end, one attempt at a time.
2. **Line-number citations self-invalidate.** Four firings of the `A-N4` family, one *inside the
   edit that wrote it*.
3. **Three of the failures were generated by the Leader's briefs**, not the workers': the `c10`-only
   sweep scope (T-08 attempt 3), ten audit questions that never asked whether the border was
   *asserted* (T-08 attempt 2), and a citation rule authored from scratch that reinstated a
   permission `FP-50` had already retracted (T-09 attempt 1).

### The ruling

**A comment, title or citation inaccuracy is `ADVISORY`, never `FAIL` — with one carve-out: prose
that misstates the EVIDENCE for a requirement remains gate-worthy.** Naming a mutation that was not
performed, or claiming a proof that does not exist, still FAILs. Ordinary descriptive drift does not.

Unchanged and still FAIL-eligible: production logic, requirement conformance, design-decision
violations, a non-discriminating assertion presented as evidence (`KZ-001`), and an unobserved red
that is claimed (`K-004`/`KZ-014`).

**Counterfactual, stated so the trade is explicit:** under this policy **T-08 attempt 3 and T-09
attempt 1 would both have been `PASS`** — a saving of two rework rounds and roughly 400k tokens,
against the cost that some descriptive prose in these files stays imprecise. The recorded mitigation
is an `/akili-quick` line-number purge over the two spec files at the end, which the Reviewer had
already recommended independently for the 14 unaudited citations in
`innovation-use-details.component.spec.ts`.

**Also now in force (Leader correction, superseding the attempt-1 brief):** *cite by name — symbol,
test title, template name, or a quoted code fragment — **never** by line number, for any file this
spec touches.* This is `FP-50` as amended on 2026-08-20, applied rather than re-derived.

---

#### T-09 attempt 2 — Reviewer `STATUS: PASS` ✅ **task complete**

| Field | Value |
| --- | --- |
| Date | 2026-09-07 |
| Effort | `high` on both attempts — **deliberately never bumped**; attempt 1's issue 1 was generated by the Leader's own citation rule, issue 2 was a mechanical miss. Neither was under-thinking |
| Attempts | **2** (of 3) · **first task reviewed under the ADVISORY policy** |
| Files changed | `innovation-use-organization-item.component.{ts,html,spec.ts}` · `innovation-use-details.component.spec.ts` · `get-innovation-use-details.interface.ts` |

**What T-09 delivers.** `sub_institution_type_id` is required exactly when the sub-type select renders
— gated on the template's own `subTypeOptions().length > 0`, never on a re-derived
`is_active`/root/depth-2 predicate (`DD-5`) — with the asterisk, the `[style]` amber border (`DD-3`)
and a `.organization-subtype-required-message` hook. And the `DD-5b` half: `onInstitutionTypeChange`
now writes an explicit **`null`** instead of `undefined`, which `JSON.stringify` **dropped entirely**,
so the key never reached the server and a previously stored sub-type survived under a type that no
longer has one — invisible on screen and in the payload. Type widened to `number | null | undefined`
to make that assignment legal.

**Verification (Leader-measured in a quiet tree unless noted).**

| Check | Result |
| --- | --- |
| Full client suite | **317 suites / 6864 tests / 0 failed**, exit 0 · coverage 98.2 / 96.3 / 97.88 / 98.51. **+5 on the 6859 baseline — exactly the 5 tests added**; byte-identical across attempts 1 and 2, which is itself the proof attempt 2 was comment-only |
| `npm run build` | **exit 0**, bundle emitted |
| Targeted suites | 42/42 org-item · 157/157 details — unchanged between attempts |
| `npx tsc -p tsconfig.spec.json` set-diff | one pre-existing `TS2741`, verified identical against `git show HEAD:…`; details spec zero before and after |
| `npx eslint` | clean on the production `.ts`/`.html`; **declared unable to reach `*.spec.ts`** (`K-002`), not cited as clean |
| Line-citation sweep, org-item files | **zero** surviving `.html:NNN` or same-file `` `:NNN `` (Leader-verified independently); all four `<ng-template #…>` anchors exist, so both new name anchors resolve |
| Reddening mutations | every new assertion mutated and its red observed; the one-line `null` revert reddens **both** spec files — the sufficiency proof for fixing at the source only |

**Reviewer's substantive findings from attempt 1, all verified at the source and none reopened:**
`R-IUR-008` S1, S2, the `BUT` clause and AC.1–AC.3 discharged · `DD-9` precedence intact and **two
field-level messages provably cannot co-render** (a non-empty `subTypeOptions()` implies a truthy
`institution_type_id`, forcing `organizationTypeMissing` and `showNotIdentifiedMessage` false) · both
mock claims true, each checked in the file that makes it · unconditional asterisk **conformant**
(`R-IUR-003` AC.1 is unconditional; only border and message are state-driven) · clearing on every type
change conformant, because PrimeNG guards `onOptionSelect` with `if (!this.isSelected(option))`, so
re-picking a type emits no `onChange` — **no over-clearing path exists** · both `regression-protection`
labels correct · **all three Leader scope rulings confirmed**, including not modifying
`innovation-use-details.component.ts` (it already forwards the value and its payload type already
declared `number | null`).

**The `0`-falsy question the Leader raised — ruled acceptable, not deferred.** `subTypeMissing` tests
`!this.body().sub_institution_type_id`. The Reviewer **could not construct a reachable defect**: `code`
is a CLARISA `bigint` `@PrimaryColumn` so `0` is representable, but no fixture, seed or baseline holds
one and no client path produces one; this spec's `0`-is-a-value rules are scoped to **user-entered
quantities** (`R-IUR-004`, `R-IUR-009`), never catalog ids; and the identical falsy test already ships
**three times** for the same catalog, including innovation-**dev**'s own `subTypeMissing`. Changing it
here alone would *create* the inconsistency. **Routed to T-14's enumeration and T-19's truth table.**

**Blast radius of the interface widening — checked by the Leader and again by the Reviewer:**
`sub_institution_type_id` is declared **separately** in `get-innovation-details.interface.ts`
(innovation-**dev**, already `number | null`), so the widening cannot reach that feature. No other
consumer client-wide.

**`Cannot prove` (`KZ-017`)** — catalog-wide agreement between the client predicate and SQL → **T-14**
(a mocked sub-types service cannot observe the `is_active` or root filters, and the in-code
Disqualifier block says so explicitly) · paint → **T-16 gate 3** · AC.4 → T-14/T-19. **The attempt-2
Reviewer declared its own limit:** holding no `Bash`, it read the working tree rather than the delta,
and rested its comment-only finding on the surviving production logic matching attempt 1's confirmed
state plus the unchanged suite figures.

**`ADVISORY` (recorded, non-gating, not minted as tasks):**
1. `innovation-use-organization-item.component.ts` carries a cross-**component** line citation into
   `innovation-details/components/organization-item` (lines 92/173/189). The Implementer's per-file
   sweep reported "0 citations" for that file — **true as scoped** (it matches neither the `.html:NNN`
   nor the same-file pattern) but the same rot family. → **T-10**.
2. `spec.ts` cites `primeng-select.mjs line 721` — a third-party line that drifts on any PrimeNG bump.
   Pre-existing, out of scope.
3. **A correction to this log's own earlier record:** the attempt-4 fixture comment's *"would redden
   this test once T-09 lands"* was recorded here as flatly stale. The attempt-2 Reviewer reads it as a
   **counterfactual about type 10**, not a claim about the code as written with type 20 — so its
   staleness is **milder than this log stated**. Both readings are advisory; recording the narrower one
   rather than leaving the harsher claim standing (`KZ-007` — a correction record is the highest-risk
   artifact class). → **T-10**.
4. The 14 unaudited line citations in `innovation-use-details.component.spec.ts` and the extra one in
   the interface file → the recommended **`/akili-quick` line-number purge**, not rework here.

**Policy note.** This is the first task closed under the ADVISORY ruling. It did not change this
verdict — attempt 2 would have passed either way — but it is what kept attempt 2 **narrow-scope**
(three questions, not a re-audit) at **67k tokens against ~160k for a full round**.
