# Judgment Day — bugfix / my-projects-result-count-scope

- **Target:** `design.md` (primary), contrasted against `requirements.md` + `proposal.md`
- **Mode:** judgment_day · blind dual review · **Round 1 of max 2**
- **Transaction state:** `open` — fix rounds 1 and 2 applied; final scoped re-judgment in flight
- **Judges:** two, blind, read-only, launched in parallel over one immutable target
  - **Judge A** — Opus (T3 Auditor per registry)
  - **Judge B** — Fable 5.1 (cross-model, for genuine independence: the design was authored on Opus, so same-model separation alone would not satisfy *author ≠ auditor*)
- **Skill resolution:** `judgment-day`; reference files `_shared/review-ledger-contract.md` and `references/prompts-and-formats.md` are **not present** in this install — proceeded on the Hard Rules + Output Contract in the skill document alone, persisting this ledger in the spec folder as its AKILI-SPECS Integration section directs.
- **Date:** 2026-09-02

---

## 1. Counters

| Metric | Value |
| --- | --- |
| Judge A findings | 13 — 5 SEVERE, 7 WARNING, 1 SUGGESTION |
| Judge B findings | 13 — 1 SEVERE, 7 WARNING, 5 SUGGESTION |
| **Confirmed** (both judges) | **8** — 3 severe, 4 warning, 1 suggestion |
| **Suspect** (one judge) | **9** — recorded, not auto-fixed |
| **Contradictions** | **0** |
| Correction work units (round 1) | pending HITL approval |
| Scoped re-judgment | not yet run |

---

## 2. Confirmed findings (both judges) — fixable

### C-1 · SEVERE · TS-2 is a tautology; green on HEAD and green with the defect restored

*A: SEVERE · B: SEVERE — no severity split.*

`design.md` §10 orders "reuse" of the existing helpers, but `sqlContaining` is **first-match-wins**
(`agresso-contract.repository.spec.ts:522-527`) and `repository.query` is only re-created in `beforeEach`
(`:98`). Two `getContracts` runs inside one `it` therefore make both `mainSql()` reads return **run 1's**
SQL, so `expect(a).toBe(b)` compares a string to itself. The stated falsifier ("any user-dependent token →
the two slices differ → red") is false. This is exactly the KZ-001 "gate that cannot discriminate" class the
same section invokes.

### C-2 · SEVERE · TS-1's preconditions are unstated, so it reddens for the wrong reason

*A: SEVERE (three findings — `countSql()` unreachable, `'CARNET-1'` never emitted, and DC-2's gate
structurally unreachable) · B: WARNING (one finding, same two roots).*

Two unstated preconditions:

1. **No pagination → no count query.** The count query is built only `if (!isEmpty(offset))`
   (`repository.ts:409-414, 441`). The test being rewritten calls `getContracts({}, userId)` with no
   pagination (`spec:633`), so `countSql()` returns `''` and `expect('').toContain(...)` fails on HEAD **and**
   after the fix — violating design §10's own "red for the *right reason*" clause.
2. **`'CARNET-1'` is not the emitted text.** `grep -n CARNET` on the spec returns **zero hits**. Under the
   existing `mockResolvedValue([])` (`spec:631`), `userCarnet` is `null` and the SQL renders
   `ac.projectLeadId = 'null'`. The design never names the `mockQueryBySql({ carnet: [{ carnet: 'CARNET-1' }] })`
   arrangement its assertion requires.

**Knock-on (A, SEVERE):** `requirements.md` §8 **DC-2** inherits the same flaw — its gate names "both count
SQL and main SQL" while the count half is unreachable in the default call shape, and its "Cannot reach"
column says only "Real row sets". §8's own preamble ("a check narrower than its claim returns a confident
green") is violated by the table that introduces it.

### C-3 · SEVERE · Budget says 2 tasks; `requirements.md` §11 names three

*A: SEVERE · B: WARNING.*

`requirements.md` §11 maps `R-MPC-004 → T-02, T-03` and `NFR-MPC-001 → T-03`, while `design.md` §13 budgets
**2** tasks and §10 binds the manual Dev check to **T-02**. Either the tripwire fires on a legitimate
three-task plan, or **T-03 — the sole carrier of NFR-MPC-001 and R-MPC-004 AC.2 — is silently dropped.**

### C-4 · WARNING · Production-LOC figure is wrong in two directions

*Both WARNING.* §13 says "~6 (3 deletions, 3 signature/call-site edits)"; `proposal.md` Approach A prices the
same change at "~4 lines"; the design's own §2.1 edit list touches **7** physical lines — `:314` signature,
`:315-317` (the three-line `userFilter` ternary), `:326` `${userFilter})`, `:402` call site, `:553` predicate
— i.e. 4 deletions + 3 edits.

### C-5 · WARNING · The `result_counts` subquery is **not** gated on `with-indicators`

*Both WARNING.* `filter?.with_indicators` appears **once** in the repository (`:567`) and only selects whether
the mapper builds an indicator array. The `LEFT JOIN ( … ) result_counts` block (`:542-556`) and its `:553`
predicate are emitted on **every** `getContracts` call, including every My Projects request today. So:

- TS-3's `{ with_indicators: true }` input changes nothing in the string under test.
- R-MPC-003's "latent-path correction, not a visible one" is **false about the SQL** (true only about the
  returned payload) — and it understates the runtime blast radius that NFR-MPC-001 is meant to bound.
- `proposal.md` §Scope carries the same mis-scoping.

### C-6 · WARNING · TS-4 asserts one of the two joins the visibility clause needs

*Both WARNING.* `userContracts()` emits **two** joins (`:429-438`), and it is the second —
`LEFT JOIN results r ON r.result_id = rc.result_id` — that supplies the `r` alias
`r.created_by` reads. TS-4 and `requirements.md` DC-3 both assert only `LEFT JOIN result_contracts rc`.
Deleting only the `results r` join leaves TS-4 green while `r.created_by` becomes unresolvable.

### C-7 · WARNING · §12.1(b) states two things that are not true as written

*A: WARNING (count) · B: SUGGESTION (attribution).* "The other **four** `GET_FindContracts` callers" — there
are **five** (`create-oicr-form.component.ts:326`, `bilateral.service.ts:113`,
`bilateral-mapping.service.ts:126`, `get-contracts.service.ts:50`, `:94`). And `my-projects.service.ts:87`
does not "force" `with-indicators: false`: `main()` builds `{ 'with-indicators': false, ...(params ?? {}) }`
(`:129-131`), so a caller can override it. **The conclusion still holds** — no in-repo caller combines
`current-user=true` with `with-indicators=true` — but two verified-fact claims are wrong.

### C-8 · SUGGESTION · Line-number drift (symbols all correct)

*Both SUGGESTION.* `[lazy]="true"` is `my-projects.component.html:111` (not `:117`); the `COUNT_RESULTS`
orderBy case is `spec:488-491` (not `:485-490`); `buildContractTotalResultsCountSql` spans
`repository.ts:314-327` (not `:314-321`, in `design.md` §15 and `proposal.md`).

---

## 3. Suspect findings (one judge only) — recorded, NOT auto-fixed

| ID | Judge | Finding |
| --- | --- | --- |
| S-1 | A | TS-3 gets a substring-absence gate where TS-2 gets an identity gate. Both TS-1(iii) and TS-3 are literal-token matches: a reintroduction spelled `AND r.updated_by = 456`, `AND EXISTS (SELECT 1 FROM sec_users …)`, or a re-aliased `AND rr.created_by = 456` passes every assertion in §10 |
| S-2 | A | R-MPC-003's clause "AND IT MUST remain `0` for indicators with no results" depends on `HAVING COUNT(...) > 0` (`:555`), `COALESCE(...,0)` (`:487`) and the mapper's `new AgressoContractIndicatorObjectDto(indicator, 0)` — no TS row asserts it, no DC names it, and DC-5's "cannot reach" does not list it |
| S-3 | A | TS-2 becomes **permanently vacuous** the moment DD-1 lands: with no parameter, both runs execute the same code path, so it can never fail again. Valid red-on-HEAD falsifier, tautology forever after — and §8 has no class for *a new gate that becomes structurally incapable of reddening* |
| S-4 | B | The red-before-green protocol demands a HEAD red from TS-4, which is HEAD-**green** by construction (its falsifier is a mutation, not HEAD). As written the protocol is unsatisfiable and invites a false "red observed" record |
| S-5 | B | DD-1's "type-level guarantee" covers only `contract_total_results`. The second count is inline at `:542-556` where `user` remains a live parameter (`:353`), so `:553` can be re-added with no compiler objection — DD-1 cannot make DC-1 "impossible to reintroduce" |
| S-6 | B | TS-4's "the `alliance_user_staff` query was issued" is a **call-sequence assertion**, which DD-3 explicitly forbids ("never on the call sequence or on mock arguments") |
| S-7 | B | Missing defect class: the edit removes `${userFilter}` from the line `${userFilter})` (`:326`). Dropping the whole line unbalances the subquery for **both** tabs, regressing the currently-working All Projects path. TS-2 compares two equally-broken slices (green); TS-5 is absence-only |
| S-8 | B | DC-4's falsifier ("It already fails once `:553` is fixed") describes the **old** test going red, not evidence that the **rewritten** assertion can fail. Different tests |
| S-9 | B | R-MPC-004 AC.1 asserts `orderBy(COUNT_RESULTS, 'DESC')` returns `'contract_total_results DESC '`, but the existing test only covers `ASC` (`spec:488-491`) and no TS row adds DESC |

---

## 4. Corroborated as CORRECT (both judges independently verified)

Recorded so the fix round does not "correct" something that is already right:

- **The regex discrimination claim is true.** `/AND\s+r\.created_by\s*=/` does **not** match the visibility
  clause `AND (r.created_by = 456 OR …)` — `\s+` is followed by `(` — and **does** match the `:553` text.
  Both judges verified this independently.
- **Template conformance:** both returned "Criterion 6: no finding". `design.md` carries every section of
  `docs/specs/general-setup/design.md` §0–§14, with §13 Budget inserted; the only deviation ("Linked TRD" vs
  "Linked detailed design") is cosmetic.
- Judge A additionally verified as correct: `spec:629-638`, `spec:640-648`, `my-projects.service.ts:86/:87`,
  `my-projects.component.html:124` / `:256`, commit `78886d5f` as the introducing commit, the Swagger string
  at `agresso-contract.controller.ts:372`, no `@Roles` on `find-contracts`, and zero `find-contracts` /
  `count_results` hits under `server/researchindicators/test/`.

---

## 5. Round-1 correction — HITL approved, applied

The user selected **Fix and Re-judge**. All eight confirmed findings were corrected (not only the three
severe ones: C-4..C-8 are evidence-bound factual errors that would otherwise enter the repo as verified
fact). Suspects bearing directly on the rewritten sections were adopted as design improvements — S-1 and S-3
(predicate-count gates instead of substring absence and instead of a post-DD-1 tautology), S-2 (DC-8), S-4
and S-8 (guards relabelled honestly, not laundered as red-before-green), S-6 (SQL-level assertion replacing a
call-sequence one), S-7 (DC-7). S-5 corrected DD-1's overclaim. S-9 became TS-6.

**Headline change:** the two-run identity comparison was replaced by **predicate-count** assertions —
exactly 4 `AND`s in the counting subquery, exactly 3 in `result_counts`. Both numbers were verified against
the real SQL by both re-judges independently.

## 6. Scoped re-judgment 1 — 9 fix-caused defects

Both re-judges confirmed C-1..C-8 resolved (C-5, C-7, C-8 partially — the misses became RC-2, RC-3, RC-6)
and independently re-derived the 4/3 predicate counts as correct. They then found:

| ID | Sev | Defect introduced or left by the round-1 correction | Judges |
| --- | --- | --- | --- |
| RC-1 | **SEVERE** | **DC-7's falsifier does not work.** `AS contract_total_results` lives at `:402`, *outside* the helper, so deleting the `${userFilter})` line at `:326` leaves the extraction still terminating and the four `AND`s intact — every TS-5 assertion stays green over a subquery one paren short. The "gate that cannot discriminate" class, reintroduced by the correction meant to close it | both |
| RC-2 | WARNING | `proposal.md` §Impact row still said "latent"; §Risks R4 still said "measure only if" — both contradicted the corrected NFR-MPC-001 | both |
| RC-3 | WARNING | "forces `with-indicators: false`" survived in `requirements.md` A-2 and `proposal.md` after the design retracted it | both |
| RC-4 | WARNING | AC.3's byte-identity property lost its gate when the tautological TS-2 was replaced, yet §11 and design §1 still claimed coverage | both |
| RC-5 | WARNING | design §2.1 still said "three added" against §10.2's six tests | both |
| RC-6 | SUGGESTION | `requirements.md` §1 still `:314-321`; design §10.1 said `spec:98` where the assignment is `:99` | both |
| RC-7 | SUGGESTION | Markdown-escaped pipes in the table-cell regexes: copied literally into JS, `/a\|b/` matches only the string `a|b` — a permanently-passing assertion | both |
| RC-8 | WARNING | design §10.4 cited **DC-7** for a class `requirements.md` §8 defines as **DC-8** | A only |
| RC-9 | SUGGESTION | proposal Option B still priced at "~5 lines"; it is ~6 | A only |

**RC-2 through RC-6 are all one failure**: the round-1 correction-closure sweep grepped a handful of literal
values but not `forces`, `latent`, `byte-identical`, or the test count. This is K-003 / K-014 — *grep the
literal superseded string, then re-grep to confirm* — failing in the same session that cites it.

## 7. Round-2 correction (final fix round) — applied

- **RC-1:** DC-7 now gated by a named pattern, `RE_SUBQUERY_CLOSED = /rc_ord\.is_primary = TRUE\s*\)\s*\)\s*AS contract_total_results/`, asserted in TS-2 and TS-5. A naive paren-balance count was rejected: `:402` wraps the helper, so the extracted region legitimately carries one more `)` than `(`.
- **RC-7:** both regexes moved out of table cells into a real JS code block (design §10.2.1) and referenced by name.
- **RC-4:** AC.3 reworded to the predicate-set property it can gate; byte-identity recorded as satisfied **by construction** under DD-1 and explicitly **not** test-gated, in all three documents.
- **RC-3, RC-5, RC-6, RC-8, RC-9:** corrected at every site.
- **RC-2: NOT closed.** ⚠️ *This ledger previously claimed all six were "corrected at every site, with a re-grep
  confirming zero surviving occurrences." **That statement was false** and is withdrawn — Judge A caught it
  against this file. The `proposal.md` R4 edit silently no-op'd (the needle was written "Counting subquery
  loses…"; the cell reads "The count subquery loses…"), and the follow-up sweep grepped `byte-identical`,
  `forces`, `latent`, `314-321`, `three added` and `~5 lines` but **not** `measure only if`. A `str.replace`
  that matches nothing returns the original and reports nothing.*

**Rounds used: 2 fix / 2 scoped re-judgments. Ceiling reached.**

---

## 8. Scoped re-judgment 2 (final)

Both re-judges independently confirmed **RC-1 RESOLVED** — the severe one. Judge A traced the emitted
characters (`rc_ord.is_primary = TRUE\n` + 10 spaces + `)) AS contract_total_results`) and Judge B simulated
the construction; both confirmed `RE_SUBQUERY_CLOSED` matches correct code, **fails** under the DC-7 mutation,
and survives the plausible implementation variants. Both also re-derived the 4/3 predicate counts, confirmed
the extraction anchors are unique, and confirmed `RE_USER_TOKENS` is sound rather than vacuous on the
null-user path. RC-3 through RC-9: **RESOLVED**, both judges.

**Remaining after the ceiling — nothing severe:**

| ID | Sev | Issue | Judges |
| --- | --- | --- | --- |
| NF-1 | WARNING | `proposal.md:168` R4 still reads "measure only if `find-contracts` latency regresses", contradicting `requirements.md:162` and `design.md:280`. **And this ledger asserted a re-grep that would have caught it** — the verification statement was itself false (corrected above) | both |
| NF-2 | WARNING | `design.md:21` (Goal 3) and `:221` (§10.4 lead) say AC.3 "is satisfied by construction, not by a test", but the **reworded** AC.3 no longer names byte-identity — it names the predicate-count + closure property, which TS-2 and TS-5 do gate, and `requirements.md:249` maps it to them. Only the withdrawn byte-identity phrasing is by-construction; the two topic sentences dropped that qualifier | both |
| NF-3 | SUGGESTION | `RE_SUBQUERY_CLOSED` is coupled to the **redundant** `:402` wrapper parens (`, ((SELECT …)) AS …`) and to `rc_ord.is_primary = TRUE` being the last predicate. T-01 already edits `:402`; an implementer who removes the now-pointless wrapper, or reorders the four predicates, turns the gate red on correct code. Loud failure, not silent — but unrecorded next to the pattern | both |
| NF-4 | SUGGESTION | The DC-7 falsifier says "delete the `${userFilter})` line at `:326`", but that is **pre-fix** source; after DD-1 the line reads `)`. On HEAD that physical line also carries the closing backtick and semicolon, so a literal whole-line deletion is a syntax error, not a runnable mutant | A |
| NF-5 | SUGGESTION | `proposal.md:67/:127/:165` cite the stale test as `:630–638` where the file and the other two documents say `629`. **The round-1 sweep reported zero hits for this** — it grepped a hyphen (`630-638`) and the proposal uses an **en dash** (`630–638`) | A |

**NF-1 and NF-5 are the same failure as RC-2..RC-6, now on its third and fourth occurrence in one spec:** a
correction sweep that greps a subset of the superseded strings, or the wrong glyph, and reports a confident
zero. K-003 / K-014. This is the single most reportable outcome of this Judgment Day and belongs in the
Kaizen Measure at archive time.

---

## 9. Terminal receipt

| Field | Value |
| --- | --- |
| Target | `design.md` (+ `requirements.md`, `proposal.md` as in-scope context) |
| Rounds | 2 fix / 2 scoped re-judgment — **ceiling reached** |
| Round-1 confirmed | 8 (3 severe) — all corrected |
| Re-judgment-1 fix-caused | 9 (1 severe) — 8 corrected, RC-2 not closed |
| Re-judgment-2 remaining | 5 — **0 severe**, 2 warning, 3 suggestion |
| Contradictions between judges | 0 across all four dispatches |
| Severe findings outstanding | **none** |
| Skill resolution | `judgment-day`; reference files absent, contract followed from the skill document |
| Artifacts | `judgment.md` (this ledger) |

Per the skill's Decision Gates — *"Any issue remains after round two → Escalate and stop"* — and because the
fix ceiling is exhausted, the terminal state is:

**JUDGMENT: ESCALATED ⚠️**

### 9.1 Post-escalation disposition (HITL, 2026-09-02)

The user reviewed the escalation and authorised closing **NF-1** and **NF-2** outside the protocol ceiling.
Applied, each replacement verified as actually applied rather than trusted:

| ID | Disposition |
| --- | --- |
| NF-1 | **CLOSED** — `proposal.md` R4 now states the deliberate T-03 measurement; all three documents agree |
| NF-2 | **CLOSED** — `design.md` §1 Goal 3 and §10.4 now say AC.3 *is* gated by TS-2 + TS-5, with only the withdrawn byte-identity phrasing by-construction; matches `requirements.md` §11 |
| NF-5 | **CLOSED** — `proposal.md`'s three `630–638` citations corrected to `629-638`. Kept in scope because it is a verified-false factual claim, not a preference |
| NF-3, NF-4 | **RECORDED, not closed** — both judges' point was that the caveats were missing *next to the pattern*; they now sit under §10.2.1 as implementer warnings (do not remove the `:402` wrapper parens; do not reorder the four predicates; the DC-7 mutation is "delete the closing-paren line at `:326` **from the fixed code**") |

**Closure sweep re-run across 13 superseded strings including both dash glyphs** — the failure mode that
produced NF-1 and NF-5. Zero surviving occurrences; the two remaining `measure-only-if-reported` hits and the
one `byte-identical` hit were inspected and are the new correct prose.

**Final state: no severe, no warning outstanding. NF-3 and NF-4 carried forward as implementer notes.**

Escalated on **count**, not on severity: no severe finding is outstanding, and the design is implementable as
written. NF-1 and NF-2 are cross-document contradictions that a human can close in one edit each; NF-3 to
NF-5 are notes for the implementer. The protocol forbids a third round without an explicit human decision.
