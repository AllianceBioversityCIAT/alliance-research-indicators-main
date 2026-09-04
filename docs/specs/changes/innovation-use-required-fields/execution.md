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
| T-04 actor disaggregated counts + total msg | `[ ]` | forward pointer filed (scope the cohort spy) |
| T-05 actor aggregate path | `[ ]` | |
| T-06 actor custom name trimmed | `[ ]` | |
| T-07 org known path + DD-9 precedence | `[ ]` | |
| T-08 org unknown type + count | `[ ]` | |
| T-09 org sub-type conditional + null | `[ ]` | |
| T-10 org DD-12 toggle clearing | `[ ]` | |
| T-11 details drop message + stop seeding | `[ ]` | |
| T-12 details measure wiring | `[ ]` | pivot input + **forward pointer: must REWRITE c10, restores build** |
| T-13 details DD-8 save gate + toast | `[ ]` | |
| T-14 sub-type catalog equivalence | `[ ]` | |
| T-15 doc sweep DD-11 | `[x]` | PASS attempt 2 of 3. Forward pointer filed → T-16 |
| T-16 CLIENT GATES suite + tsc + browser | `[ ]` | **3 forward pointers filed** — owns every visual claim |
| T-17 RSK-2 population sizing | `[ ]` | |
| T-18 migration + migration spec | `[ ]` | |
| T-19 executed truth table | `[ ]` | |
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

> **FORWARD POINTER → T-04 (Leader-owned; must be copied into T-04's brief).** Scope the prototype-wide `border` setter spy at `innovation-use-details.component.spec.ts:2542-2545` to the specific element. Since T-02, `'2px solid var(--ac-warning-1)'` has a second emitter in that fixture (`app-input` `:30` via `quantification-item`), and the spy's `toContainEqual` can no longer prove the assertion belongs to the actor-type `p-select`. T-04 already owns the actor card's `p-select` border assertions, so this falls inside its existing scope — it is a precision fix to an assertion T-04 must rely on, not new scope.

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
