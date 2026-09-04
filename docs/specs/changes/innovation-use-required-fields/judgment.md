# Judgment Day — findings ledger (frozen)

- **Target:** `design.md` @ Phase 2 draft, 2026-09-04
- **Mode:** blind dual review, two read-only judges, identical scope, no cross-visibility
- **Rounds:** 2 fix rounds + 1 scoped re-judgment (a second re-judgment was available and not spent)
- **Terminal state:** **ESCALATED** — see the receipt at the end

## Independence — declared limitation

The design author and **both** judges ran on the same model (Opus). The separation achieved is
**fresh context + read-only tools**, not model separation. `author ≠ auditor` holds on the context
axis only. Recorded here rather than left implied.

## Totals

| | Judge A | Judge B | Merged |
| --- | --- | --- | --- |
| Severe | 7 | 4 | **3 confirmed by both; 3 more severe-on-one-side; 2 suspect-severe** |
| Warning | 9 | 12 | **10 confirmed** |
| Suggestion | 3 | 2 | **2 confirmed, 4 suspect** |
| Contradictions between judges | — | — | **0** |

---

## CONFIRMED — both judges, independently

| ID | Sev | Finding | Evidence |
| --- | --- | --- | --- |
| **C-1** | **SEVERE** | **`DD-5`'s sub-type predicate is wrong.** The client does not ask "does `parent_code = type` have rows". `getInstitutionTypesByDepthLevel` filters `{ is_active: true, parent_code: IsNull(), code: typeId }` then takes level 2 — i.e. *"the type is a **root** type AND has children"*, strictly narrower than the SQL clause §3 already committed. | `clarisa-institution-types.service.ts:55-78`, `array.util.ts:131-151` |
| **C-2** | **SEVERE** | **Whitespace asymmetry on `unit` (and `actor_type_custom_name`).** `valid_text` strips whitespace (`LENGTH(TRIM(REGEXP_REPLACE(text,'\s+','')))>0`), so `'   '` is invalid in SQL. Neither the current client check nor `DD-1`'s new `'filled'` mode trims. Both rules were marked "already in parity". | `1758054920860-CorrectValidTextFunction.ts:16-20` vs `input.component.ts:184`, `innovation-use-actor-item.component.ts:95` |
| **C-3** | **SEVERE** | **The `DC-5` gate is blind to `DC-5`.** OICR's spec stubs the measure card with an empty-template `FakeQuantificationItemComponent`, so the full client suite **cannot** observe OICR's measure card at all. `quantification-item.component.spec.ts` already records this as a known gap in-tree. The only real coverage is the `fieldsRequired` block that `DD-4` deletes. | `oicr-details.component.spec.ts:872-880`, `quantification-item.component.spec.ts:246-250` |
| **C-4** | SEVERE (A) / WARN (B) | **`DD-7`'s reversion challenge missed the test that actually asserts the seed.** It is `describe('c2 — empty state')`, which mocks `actors: []`, awaits `getData()`, and asserts `actorCards.length === 1`. The two lines `DD-7` *does* cite are off by one and bypass `getData()` entirely. A third message assertion (~`:1766`) is also unenumerated. | `innovation-use-details.component.spec.ts:143-160`, `:347`, `:354` |
| **C-5** | SEVERE (B) / WARN (A) | **The rule table omits the level/justification rule entirely**, yet `DD-6` orders a full rewrite driven by that table, and `R-IUR-012` makes preserving it an `AND IT MUST` with a byte-identical AC. Neither §10 nor §12 has a row for it. A rewrite that drops `commonFields` / `explanationValid` passes every stated check. | `1787078283929:87-101`, `:133-137` vs `requirements.md:402` |
| **C-6** | SEVERE (A) / WARN (B) | **Nullable mode discriminators break the equality-branch rewrite.** `sex_age_disaggregation_not_apply` and `is_organization_known` are both `nullable: true`. In MySQL `NULL = FALSE` is `NULL`, so a NULL-mode row matches neither branch and is vacuously valid. The **current** function is NULL-safe by construction (`IF(... = TRUE, aggregate, disaggregated)`); `DD-6` replaces that with equality predicates. B could not construct a client path to a NULL (defaults are `false`), so reachability is legacy/direct-write only. | `result-actor.entity.ts:39-43`, `result-institution-type.entity.ts:57-62`, `1787078283929:122-125` |
| **C-7** | WARNING | **`DD-8` enumerates one of two data-destruction sites.** Beyond the row-drop filter, `buildActorPayload` nulls the four counts on mode toggle and `buildOrganizationPayload` nulls `organization_count` / type / sub-type / custom name whenever `is_organization_known` is true. Reachable: type four counts → tick the checkbox → save → counts written as `null`, no warning, no undo. `DD-8`'s gate never fires because the row's identity **is** satisfied. `G-5` is claimed on the incomplete enumeration. | `innovation-use-details.component.ts:494-498`, `:521-532` |
| **C-8** | WARNING | **"17 untouched templates" is wrong — it is 15.** 18 templates use `app-input`; this design changes the call sites in **three** of them (both innovation-use cards + `quantification-item`), all listed in its own §2.1. The figure is repeated in `design.md` §1/`DD-1`, `requirements.md` AC.2, and `RSK-4` — two documents agreeing on one wrong number copied forward. | glob count, `design.md` §2.1 |
| **C-9** | WARNING | **`OQ-5` is stale and marked blocking.** `R-IUR-014` already exists in full — heading, two scenarios, six ACs, indexed, and mitigated as `RSK-5`. The design says it "must be added before Phase 3". | `requirements.md:435-470`, `:533`, `:567` |
| **C-10** | WARNING | **"three `SUM(...)` aggregates" is two.** `tempActors` and `tempModeConsistent` are the SUMs; `tempFullActors` is a `COUNT`, and the third conjunct is the rule-13 row-count guard, not an aggregate comparison. | `1787078283929:103`, `:110-118`, `:120-131`, `:135-137` |
| **C-11** | WARNING | **Stale `sub_institution_type_id` is unowned.** `R-IUR-008`'s `BUT it must NOT` clause and AC.3 appear in no design decision and no §10 row. Rule 8's SQL never joins the sub-type back to `parent_code = institution_type_id`, so an orphaned sub-type satisfies `IS NOT NULL`. The client clears to `undefined`, which JSON drops, so the key never reaches the server. | `innovation-use-organization-item.component.ts:140-148`, `innovation-use-details.component.ts:529` |
| **C-12** | WARNING | **`R-IUR-006`'s "never two messages" is discharged by `DD-2`, which does not cover it.** `DD-2` governs only the actor card's cross-field sum. The real conflict is with `showNotIdentifiedMessage` (`touched() && !identitySatisfied`), which also competes with `R-IUR-007` on the unknown path — a case §10 never mentions. And because it is gated on `touched()`, an untouched row shows **zero** messages, so AC.3's "never zero" half is live too. | `innovation-use-organization-item.component.ts:186-188`, `.html:167-169` |
| **C-13** | WARNING | **§10's claim to read back "every" `AND IT MUST` / `BUT it must NOT` clause is false.** ~22 such clauses exist; at least 7 are absent, including both of `R-IUR-014`'s — that requirement has no row at all. Two present rows are nominal (`R-IUR-005` answered with a SQL decision; `R-IUR-006` per C-12). | `requirements.md:110`, `:138`, `:193`, `:306`, `:351`, `:402`, `:454-455` |
| **C-14** | WARN (B) / SUGG (A) | **`app-input` renders hard-coded hex, not the token.** `#E69F00` at `input.component.html:30`, `:55`, `:65`, `:71`, with `text-sm` rather than `fs-[14]`. §7 assigns five of the eleven rules to `app-input` while §7 also claims "no new tokens" and `G-3` promises "the established amber treatment". The root guide makes a hex literal in a component a FAIL. *(Same code fact both judges read; A drew the narrower conclusion that `DD-3`'s "not readable in jsdom" is overstated for this binding, since it carries no `var()`.)* | `input.component.html:30`, `:55`, `:65`, `:71` |
| **C-15** | SUGGESTION | **The `317 suites / 6798 tests` figure is unverified by both judges** (read-only role + the concurrency rule). Judge B independently confirmed **317 spec files** by glob but not the test total. The client guide records a dated 6,267 and warns against gating on a moving total. | `client/.../src/CLAUDE.md` |

---

## SUSPECT — one judge only (no auto-fix per protocol)

Two carry a severity that warranted an orchestrator check. **Both were independently verified as
factually correct** before this ledger was written — recorded as suspect by protocol, not by doubt.

| ID | Sev | Finding | Orchestrator verification |
| --- | --- | --- | --- |
| **S-1** | **SEVERE** (A) | **§3's row scoping omits `is_active = TRUE`.** The function being replaced filters `is_active` on every query, and organization/measure rows are **soft-deleted**. A violation count scoped only by `result_id` + role counts every row the user ever deleted — the green check goes permanently `false` with nothing on screen, because the row is not rendered and cannot be fixed. | **VERIFIED.** `is_active` appears 10× in the current function; `result-quantifications.service.ts:150,:214` and `result-institution-types.service.ts:565` all set `{ is_active: false }`. |
| **S-2** | **SEVERE** (A) | **`DD-8` says the blocked-save toast reuses "the same `ActionsService` channel the duplicate-actor block already uses". That channel does not exist** — when `hasDuplicateActorType()` is true the whole save body is skipped and execution falls to `if (page) this.navigateTo(page)`. Implemented literally, `DD-8` ships a second **silent** save-block: silent data loss traded for silent save refusal. `R-IUR-014` AC.5 is also written against a message that does not exist. | **VERIFIED.** `innovation-use-details.component.ts:584` guards the body; the only `showToast` calls are `:335`, `:588`, `:600`. No duplicate-block toast. |
| S-3 | WARN (B) | **Rule 1's SQL half is vacuous and cannot be made otherwise.** `actor_type_id` is `NOT NULL`, which the create migration's own header records as why no such clause exists. Combined with the row drop + `R-IUR-011`, a typeless actor row is simply absent. A truth-table row generated from rule 1 can never redden for the reason it exists (`K-004`). | not re-checked |
| S-4 | WARN (B) | **No harness is named for the "executed truth table on real MySQL".** The repo's only route is the fixture suite (`test:fixtures`, `*.fixture-spec.ts` only — a plain `*.spec.ts` is collected by neither runner and passes with zero tests), with a reserved code band, a non-idempotent bootstrap, and a DDL prohibition. An `innovation-use-validation.fixture-spec.ts` already exists on band `900_100`. The ~570 test LOC budget does not fit this plus the catalog enumeration plus rewriting a ~2,500-line spec. | not re-checked |
| S-5 | WARN (A) | Removing `fieldsRequired` is claimed self-gating by template compile error, but `quantification-item.component.spec.ts:130`/`:134` reference it as a **TypeScript property**. Specs are not type-checked by `ng build`, ESLint ignores them, and `ts-jest` runs `isolatedModules`. Only `tsc -p tsconfig.spec.json --noEmit` catches it — absent from §12. | not re-checked |
| S-6 | WARN (A) | `NFR-IUR-003` says "a user may save an incomplete draft exactly as today"; `DD-8` deliberately blocks a class of those saves. §6 cites the surviving half ("API untouched") as proof of the whole. The narrowing is recorded against `R-IUD-001` but never against `NFR-IUR-003`. | not re-checked |
| S-7 | SUGG (B) | Three call sites, not two: `oicr-details.component.html:60` **and** `:81`. A regression check written for one OICR block leaves the other unexercised. Also `docs/specs/innovation-use/family.md:113` still calls `innovation_use_validation` "frozen" — a live manifest this change falsifies (`KZ-013`). | not re-checked |
| S-8 | SUGG (B) | `isInvalid()`'s falsy test is **gated by `isRequired`**, which none of the five count fields passes today — so the `0` bug is *latent at these sites*, not active. Also `validateEmpty && !value` is unreachable whenever `isRequired` is true, so `quantification-item`'s two `[validateEmpty]` bindings are dead; `DD-4` says nothing about them. | not re-checked |
| S-9 | SUGG (A) | §11's "two PRs (§12)" points at the Verification Strategy table, which defines no PR boundary. | not re-checked |

---

## Assessment

The design's **structure** survived: no judge challenged the conditional-validation rule, the
opt-in shared-component strategy, `DD-3`'s cascade mandate, the depth raise, or the decision not to
split the spec. `DD-8`'s core insight was corroborated and then **extended** (C-7) rather than
overturned.

What failed is the design's **factual layer** — and it failed in the one place the methodology warns
about hardest: five findings (C-1, C-2, C-5, C-6, S-1) are cases where the design asserted parity
between two surfaces that are not in parity, which is exactly `DC-3`, the defect class the design
named as dominant and then reproduced in its own rule table.

Three counts were simply wrong (C-8, C-10, S-7), and §10 — the read-back that exists to be the last
line of defense — over-reported its own coverage (C-13).

---

# Round 2 — scoped re-judgment (frozen)

Both judges saw only the frozen ledger above plus the revision-2 fix delta. Scope: (A) is each
ledger finding genuinely closed, (B) did the correction itself introduce defects.

## Ledger closure — both judges agree exactly

| Outcome | Count | IDs |
| --- | --- | --- |
| **CLOSED** | **21** | C-1…C-6, C-8…C-13, C-15, S-1…S-5, S-7, S-8, S-9 |
| **PARTIAL** | **3** | C-7, C-14, S-6 |
| NOT CLOSED | 0 | — |
| REGRESSED | 0 | — |

The three PARTIALs are identical across both judges and each is explained by a fix-caused defect
below: C-7 by `N-1`/`N-4`, C-14 by `N-2`/`N-3`, S-6 by the narrowing not being mirrored into
`requirements.md`.

## Fix-caused defects

| ID | Sev | Confirmed | Finding | Resolved in revision 3 |
| --- | --- | --- | --- | --- |
| **N-1** | **SEVERE** | **both** | `DD-8`'s flagship site-2 scenario is **not constructible**. The actor card's `onModeChange()` clears the leaving mode's fields (`innovation-use-actor-item.component.ts:111-125`, wired at `.html:71`), so by save time nothing is left to destroy. Only the **organization** card leaves the other path intact. The mandated gate could never redden for actor rows — `K-004`, committed inside the correction record. | ✅ Two-card table; the reachable cases are both on the organization card; actors explicitly excluded from the site-2 gate. |
| **N-2** | **SEVERE** | **both** | `DD-3` and `DD-10` **cancel each other.** `DD-3` bought an automated assertion from the *literal* hex being readable in jsdom; `DD-10` converts that literal to `var()`, which `cssstyle@2.3.0` drops. The only automatable evidence for the spec's dominant visual defect class would have vanished. | ✅ Both decisions kept. The assertion moves to the **setter spy** already used in-tree (`innovation-use-actor-item.component.spec.ts:291`, `:298`), which is value-agnostic and captures `var()`. Also sidesteps the unmeasured `!important`-inside-shorthand question (`A-N7`). |
| **N-3** | WARNING | **both** | A **fifth** hex exists at `input.component.html:49`, unenumerated — and it is a Tailwind `border-*` utility on a PrimeNG control, i.e. inert by `DD-3`. A decision claiming to *remove* a deviation left one in place. | ✅ Enumerated; **deleted** rather than converted, since it has never painted. |
| **N-4** (B) | WARNING | one | `buildOrganizationPayload` also nulls the other direction — `institution_id` when the row goes unknown (`:527`). Reachable in one session. | ✅ Added as the second reachable site-2 scenario. |
| **N-5** (B) / N-9 (A) | WARNING | **both** | `DD-9` removes `showNotIdentifiedMessage` without enumerating that `innovation-use-organization-item.component.spec.ts:302-316` asserts it, and without any requirement authorizing removal over suppression. **The `C-4` failure mode, repeated by the fix that closed `C-12`.** | ✅ Blast-radius table added; `OQ-6` raised to **blocking**. |
| **N-6** | WARNING | **both** | The `DC-8` gate row is wrong on both halves: the `tsc` gate *has* been run here (repaired 2026-08-13; 938 errors measured 2026-08-27), and a clean run is unachievable — the target file carries 5 pre-existing `TS2552`. | ✅ Restated as a **normalized before/after error-set diff**; "expect zero" removed. |
| **N-7** (B) / N-8 (A) | WARN/SUGG | **both** | `is_active` binds to the **parent** type only; children arrive through an unconditioned relation, so an inactive child still renders the select. A literal SQL mirror would re-create `DC-3` inside `DD-5`. | ✅ Binding side stated explicitly. |
| **N-8** (B) | SUGGESTION | one | `text-sm` → `fs-[14]` is **not** zero-delta: `.fs-[14]` sets font-size only; `text-sm` also sets line-height. Affects all 18 consumers. | ✅ Claim corrected; made an explicit implementer decision + browser check. |
| **N-9** (B) | SUGGESTION | one | "two template call sites" — only **one** template binds `fieldsRequired`. | ✅ Corrected. |
| **N-10** (B) | SUGGESTION | one | `DC-2b`, `DC-8` and `A-F19` were dangling identifiers — the taxonomy owner is `requirements.md` §4. | ✅ `DC-2b`/`DC-8` registered in `requirements.md` §4; the `A-F19` reference dropped. |
| **N-11** (B) | SUGGESTION | one | Rule 2's client owner is the **actor card**, not `app-input`, so §3.3's decision never reaches it and no AC covered it. | ✅ Stated in `DD-1`/§3.3; `R-IUR-010` AC.7 added. |
| **A-N4** | WARNING | one | `OQ-5`'s closure citations had already rotted two lines — the citing and cited files shared an edit window. | ✅ Line citations replaced with stable section/ID references. |

## Terminal receipt

| Field | Value |
| --- | --- |
| Target | `design.md` |
| Rounds used | **2 fix rounds, 1 scoped re-judgment** *(a second re-judgment was available and not spent)* |
| Round 1 | 15 confirmed (3 severe both-judge, 3 severe one-side), 9 suspect, 0 contradictions |
| Round 2 | 21 closed · 3 partial · 0 not closed · 0 regressed · 12 fix-caused defects (2 severe, both confirmed) |
| Judge agreement | **Exact** on closure; 0 contradictions across both rounds |
| Independence | Author and all four judges ran on the same model. Separation = fresh context + read-only tools, **not** model separation |
| Final document | **revision 3** |

## **JUDGMENT: ESCALATED ⚠️**

**Not because the design is broken — because revision 3 has not been independently reviewed.**

Every round-1 finding is closed or explained, and every round-2 fix-caused defect is resolved. But
the revision-3 delta is exactly the kind of artifact both rounds proved most dangerous: a
**correction record**, which reads as settled fact and is rarely re-verified. Round 2 existed to
catch fix-caused defects and found **twelve**, two of them severe. Self-certifying the next delta as
`APPROVED` would assert precisely the property this review twice disproved.

**Residual carried to the user:**

1. **`OQ-6` is blocking** — remove `showNotIdentifiedMessage`, or suppress it? Removal retires a
   shipped affordance and an archived AC, and no requirement authorizes it.
2. **`OQ-4` is blocking** — who applies the migration, and when (`K-015`).
3. The `text-sm` → `fs-[14]` line-height decision (`N-8`) is left to the implementer with a browser check.
4. The revision-3 delta is unjudged. A third opinion before `/akili-execute` is available and was not spent.

---

# Round 3 — final scoped re-judgment (budget exhausted)

Scope: are the round-2 fix-caused defects closed, are the three PARTIALs closed, and did revision 3
introduce new defects. Both judges were also asked for an explicit readiness verdict.

## ⚠️ The judges CONTRADICTED each other

| | Judge A | Judge B |
| --- | --- | --- |
| New severe | **0** | **3** |
| Closure | 13 closed, 2 partial | 10 closed, 3 partial |
| Readiness | No — blocker: `R-IUR-014` has no site-2 scenario/AC | No — blocker: `DD-8` site-2 traps the user |

Per the protocol a contradiction escalates to a human. But the disagreement rested on **one
checkable fact**, so the orchestrator verified it directly rather than handing over a coin-flip.

## Orchestrator adjudication — Judge B is correct on all three

| Check | Command / evidence | Result |
| --- | --- | --- |
| Does `p-inputNumber` declare `style` as an `@Input`? | `primeng-inputnumber.mjs:1677` | **Yes** — `style: "style"` in the `inputs` map |
| Does it ever apply it? | `grep -c styleMap` → **0**; `grep -o "this\.style[^C]"` → **zero matches**; host bindings are `ɵɵattribute`×2 + `ɵɵclassMap` | **No — never applied** |
| Does `onKnownToggle` clear the inactive path? | `innovation-use-organization-item.component.ts:130-133`, comment: *"Neither path clears the other's fields"* | **No** |
| Is the inactive path reachable in the UI? | `@if (body().is_organization_known)` at `.html:36`, `@else` at `:79`; no `[showClear]` on any select | **No — not rendered, not clearable** |

**Judge A's `N-2: CLOSED` was wrong.** It reasoned that `cssstyle`'s `setProperty` delegates to the
accessor, so the spy generalizes. True in isolation, but irrelevant: the value never reaches the DOM
at all, because Angular shadows the binding into the directive input that PrimeNG then ignores. A
answered *"can the spy observe a DOM write?"* and never asked *"is there a DOM write?"* — `KZ-017`,
in the round whose job was catching exactly that.

## Verified-and-UNFIXED severe findings

| ID | Finding | Status |
| --- | --- | --- |
| **P-1** | `DD-3`'s setter-spy gate cannot fire for rules 3, 5, 9, 10 — the `[style]` binding it observes is never applied | **OPEN** — fix budget exhausted |
| **P-2** | `DD-10` orders `input.component.html:49` deleted on a false premise; it is plausibly the **only** mechanism painting the amber border on every number field, app-wide. `.p-inputnumber` has no competing border rule, so the inertness argument does not transfer. **Requires a browser measurement no judge, and no test in this repo, can supply.** | **OPEN** |
| **P-3** | `DD-8`'s "either direction" site-2 gate creates a permanently unsaveable organization row whose only escape is deletion | **OPEN** |

## Confirmed by both judges (non-severe, unfixed)

- **`C-7` is still half-open** (A): `R-IUR-014` has **no scenario and no AC for site 2** — `:453-475` are all site-1. The gate this whole revision exists to make constructible would decompose into no task and no falsifier. *One-clause fix.*
- **`P-5`** — `DC-2b` / `DC-8` registered in `requirements.md` §4 but absent from the §11 requirement→class index.
- **`P-7`** — `R-IUR-010` AC.7 (an **actor**-card rule) is filed under the **measures** requirement; A adds that it also collides with `R-IUR-003` AC.1's asterisk sweep and silently answers the still-open `OQ-2`.
- **`P-6`** — §6 and §10 point at each other for the `NFR-IUR-003` narrowing; the substance is in `requirements.md`, and §10 still has no row for it.
- **`P-8`** — the §11 budget was not re-baselined for revision 3.

## Terminal receipt

| Field | Value |
| --- | --- |
| Rounds used | **2 fix rounds, 2 scoped re-judgments — budget fully exhausted** |
| Round 1 | 15 confirmed · 9 suspect · 0 contradictions |
| Round 2 | 21 closed · 3 partial · 12 fix-caused (2 severe, both confirmed) |
| Round 3 | 13/10 closed · 2/3 partial · **judges contradicted** · 3 severe, orchestrator-verified |
| Readiness | **Both judges: NO**, for different blocking reasons |
| Final document | revision 3 + a DO-NOT-IMPLEMENT block on `DD-3`, `DD-10`, `DD-8` site-2 |

## **JUDGMENT: ESCALATED ⚠️ — terminal**

Three severe defects are **verified and unfixed**. The document carries a prominent
DO-NOT-IMPLEMENT block so `/akili-execute` cannot act on them unknowingly, but the spec is **not**
ready for task decomposition.

**What this review actually bought.** Across three rounds it found a stored-function rewrite that
would have silently dropped the level and justification rules; a green check that would have gone
permanently false on every soft-deleted row; a save gate that could not fire; a gate that trapped
the user; and an ordered deletion that would have removed a live visual affordance app-wide. None
was reachable by any automated gate in this repo.

**The recurring lesson, three rounds running:** every severe finding was an **inertness or parity
claim asserted from the design's own frame without checking the mechanism** — `DC-3` and `KZ-017`,
the two classes this design named as dominant and then reproduced in each of its own revisions,
including inside the corrections written to close them.

**Blocking before `/akili-execute`:** `P-1`, `P-2`, `P-3`, `C-7`'s open half, `OQ-4`, `OQ-6`.
`P-2` needs a **browser measurement**, not another review round.

---

# Post-judgment — user evidence, 2026-09-04

Two changes arrived from the user after the review budget closed. Neither is a self-correction round;
both are new external input, which legitimately reopens a frozen target.

## `P-2` and `P-1` — CLOSED by browser evidence

The user supplied a screenshot of **Capacity sharing → `Total participants?`** — an `app-input` with
`type="number"` and `[isRequired]="true"` (`capacity-sharing.component.html:92-94`) — **rendering the
amber border**. This is the browser measurement the round-3 receipt named as the one thing no judge
and no test in this repo could supply.

| Step | Evidence | Verdict |
| --- | --- | --- |
| The number branch has two border candidates | `input.component.html:49` (Tailwind class) and `:55` (`[style]`) | — |
| `:55` is never applied | `p-inputNumber` declares `style` as `@Input` (`primeng-inputnumber.mjs:1677`); `0` `styleMap`, `0` `this.style`; host bindings `attribute`×2 + `classMap` | **no-op** |
| No global CSS paints invalid inputs amber | `grep` over `src/styles/*.scss` → only token definitions | — |
| The border **does** paint | the user's screenshot | — |
| **⇒ `:49` is the live mechanism** | | **`P-2` confirmed; revision 3 was backwards** |

**Consequence.** `DD-10` ordered `:49` deleted. That would have removed the **only** amber border on
every `type="number"` field in the application — `DC-1`, caused by the decision written to prevent
`DC-1`. `DD-10` is **inverted**: `:49` is converted to the token, and the dead `:55` is deleted.

`P-1` closes with it: the assertion gate is now **per control** — setter spy for
`p-select`/`p-inputtext`, **class assertion** for `p-inputNumber`, whose `[style]` never reaches the
DOM.

**Judge B was right on both, against Judge A, and against the author.** The distinguishing question
was not *"can the spy observe a DOM write?"* but *"is there a DOM write?"* — `KZ-017` again, now
settled by measurement instead of argument.

## Requirement change — measure `Number` must be `≠ 0`, not `> 0`

User ruling: the measures `Number` is a **signed decimal** (per archived
`changes/measure-number-signed-decimal`), so a **negative measure is legitimate** and the rule is
`≠ 0` — never `> 0`.

| | Before | After |
| --- | --- | --- |
| `R-IUR-010` AC.4 | `0` ⇒ **valid** ("no positivity rule; the user did not ask for one") | `0` ⇒ **invalid**; `-5` ⇒ **valid** |
| Rule 10 SQL | `IS NOT NULL` | `IS NOT NULL AND <> 0` |
| `requiredMode` | `'off' \| 'filled' \| 'positive'` | **+ `'nonzero'`** — required message, or `Must be different from 0` |

`'nonzero'` is deliberately distinct from `'positive'`: rules 5 and 9 (actor and organization counts)
stay `> 0`, because a count of people or organizations cannot be negative. Only rule 10 is `≠ 0`.

## Status after user evidence

| Item | State |
| --- | --- |
| `P-1`, `P-2` | ✅ closed |
| **`P-3`** | ⚠️ **open** — `DD-8`'s site-2 gate traps the user; needs redesign, most likely by clearing the inactive path on toggle exactly as the actor card already does |
| `C-7` open half | ⚠️ open — `R-IUR-014` still has no site-2 scenario or AC |
| `OQ-4`, `OQ-6` | ⚠️ open — user decisions |
| `P-5`, `P-6`, `P-7`, `P-8` | open, non-blocking bookkeeping |

**Terminal state remains ESCALATED** — but the blocking set is down from six items to four, and the
one that needed a measurement no longer does.
