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
| T-02 `app-input` DD-10 token sweep | `[ ]` | |
| T-03 `quantification-item` 5 inputs | `[ ]` | `unitRequiredMode` added by pivot |
| T-04 actor disaggregated counts + total msg | `[ ]` | |
| T-05 actor aggregate path | `[ ]` | |
| T-06 actor custom name trimmed | `[ ]` | |
| T-07 org known path + DD-9 precedence | `[ ]` | |
| T-08 org unknown type + count | `[ ]` | |
| T-09 org sub-type conditional + null | `[ ]` | |
| T-10 org DD-12 toggle clearing | `[ ]` | |
| T-11 details drop message + stop seeding | `[ ]` | |
| T-12 details measure wiring | `[ ]` | `[unitRequiredMode]="'filled'"` added by pivot |
| T-13 details DD-8 save gate + toast | `[ ]` | |
| T-14 sub-type catalog equivalence | `[ ]` | |
| T-15 doc sweep DD-11 | `[x]` | PASS attempt 2 of 3. Forward pointer filed → T-16 |
| T-16 CLIENT GATES suite + tsc + browser | `[ ]` | |
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
