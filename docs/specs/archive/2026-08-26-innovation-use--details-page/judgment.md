# Judgment Day — Findings Ledger

> Blind dual review of `design.md`, run at `/akili-specify` Phase 2 Step 2.5 on the user's explicit selection of the **Review Design** option.
> Persisted here so `/akili-archive`'s Kaizen *Measure* step can read it as evidence.

---

## Transaction

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/details-page/` |
| Target (immutable for round 1) | `design.md` as of 2026-08-20, after the KZ-005 single-home correction of the DD-2 spec-line figure |
| Mode | `judgment_day` — replaces ordinary 4R for this target; 4R is **not** also run |
| Round | **1 of at most 2** — both verdicts received; awaiting the user's decision on round-one correction |
| Judges | 2, blind, parallel, read-only (tools hard-limited to `Read`/`Grep`/`Glob` — neither *could* edit the target) |
| Author model | Opus 5 (this session) |
| Judge models | **Judge A: Fable 5 · Judge B: Sonnet 5** — both ≠ author, satisfying *author ≠ auditor*. Two **different** models chosen deliberately over two identical ones: for a document audit the failure modes worth catching are diverse (arithmetic drift vs. contract drift vs. over-claimed verification), and identical models tend to share blind spots. Recorded because the model registry maps T3 Auditor to `opus`, which is the author's own model here — the registry's *author ≠ auditor* rule wins over its tier row |
| Refuter | **not launched** — two-judge agreement is the corroboration mechanism (Hard Rules) |
| Judge A verdict | 3 severe · 5 warning · 2 suggestion · 70 tool uses |
| Judge B verdict | 4 severe · 1 warning · 0 suggestion · 66 tool uses |
| Live source in scope | **Yes** — and both judges used it. Every load-bearing code claim in the target was independently re-derived from `client/research-indicators/`, `server/researchindicators/`, and `node_modules/primeng@19.0.6` |
| Status | **merged; correction not yet authorized** |

### Criteria given to both judges (identical)

1. Contrast **every** count, total, quantity and figure the target asserts against the prose of every other in-scope document **and against the source**. Two documents agreeing is not corroboration.
2. Requirement coverage — every `R-IUP-###` / `NFR-IUP-###`, including each scenario's `BUT it must NOT` and `AND IT MUST` clause.
3. Upstream contract fidelity against chunk 2's frozen `design.md` §4.
4. Internal consistency across the target's own sections.
5. Constitutional conformance — root `CLAUDE.md`, the client child guide's C-1…C-6, `docs/ux-ui/design.md` §7.1, TRD §8.x.
6. Kaizen Active Lessons KZ-001…KZ-008 — including compliance *claimed* but not held.
7. Unfalsifiable or self-confirming checks; presence assertions passed off as behavioral proof.
8. Claims of verification the target did not earn.

---

## What survived falsification

Recorded because a review's negative results are evidence too, and because these were the claims most worth attacking.

| Claim | Outcome |
| --- | --- |
| **DD-4 / §6.3 — the PrimeNG fraction analysis** | **Held under both judges.** Each independently re-read `primeng-inputnumber.mjs` in the installed `primeng@19.0.6` and confirmed every cited mechanism: `allowMinusSign()` = `min == null \|\| min < 0`; the typed-decimal drop at `decimalCharIndex === -1 && this.maxFractionDigits` (and that `0` is falsy there, so the "typed `2.5` yields `25`" consequence is correct); `onPaste → parseValue → insert → insertText`; `validateValue` clamping; `maximumFractionDigits: this.maxFractionDigits ?? undefined` resolving to `Intl`'s default of 3 |
| **§4 — upstream contract fidelity** | **Zero drift**, per both judges independently. All three endpoints, all four view shapes (including the never-sent `total` / `innovation_use_level`), and all ten `400` rows match chunk 2's frozen §4 |
| **DD-2's `1,665` across three files** | Re-derived exactly by both judges (638 / 635 / 392) |
| **§2.3 blast radius** | Both judges re-derived it: `app-input` rendered by exactly **16** template files (list verbatim correct), **7** `type="number"` call sites, `quantification-item` rendered **twice** in `oicr-details.component.html`, and exactly two live consumers of `currentResultIndicatorSectionPath()` |
| **`requirements.md` §6.1 — the five `innovation_use_validation` conjuncts** | Verified against the migration SQL by both |
| **§6.3 catalog facts** | `id = level + 1`, ten rows, no `additional_guidance` column — verified by both |
| **DD-2's coupling evidence** | Verified: hardcoded `actors` / `institution_types` keys, `GetInnovationDetails` typing, the `allowSignalWrites` length-mutating effect, and `quantification-item`'s clean input/output API |
| **Constitutional conformance** | No violation found by either judge. Token table matches `ux-ui` §7.1 field-for-field; `angular.json` budgets match R-IUP-018 AC.4 exactly |
| **§10.3 falsifiability** | 6 of 7 rows genuinely falsifiable per both judges. One misattributes its detector (see `I-1`) |

---

## Findings — merged

Disposition follows the skill's Decision Gates. Severity is recorded **as each judge filed it**; where they differ, the split is shown rather than averaged.

### Confirmed by both judges → eligible for round-one correction

| ID | Substance | Judge A | Judge B | Disposition |
| --- | --- | --- | --- | --- |
| **C-1** | **The Document Control file counts are wrong and mis-derived.** "Existing client files modified: **8**" reaches 8 only by bundling `input.component.ts (+ .html)` as one file while unbundling the structurally identical OICR pair as two; a literal count of the document's own §2.1 *Modified* table yields **9**. The derivation cites "§4.2 and §5", but §4.2 is a field table and §5 is component contracts — the enumeration actually lives in **§2.1**. Both judges further establish that pre-existing spec files are miscounted: A notes §10.2 mandates edits to **seven** more existing files the modified count omits; B verified by glob that at least **three** of the nine files counted as *new spec* files (`result-sidebar.component.spec.ts`, `cache.service.spec.ts`, `api.service.spec.ts`) **already exist in the tree**, and are labelled `(updated)` in the target's own §10.2. A also notes `src/styles/colors.scss` (§5.7 / DD-7 / OQ-IUP-4) is a conditional edit site outside the count, and that `oicr-details.component.html` contains **no import path** — the selector is unchanged by the move, so only the `.ts` import moves | F-1 **SEVERE** | F-1 + F-2 **SEVERE** | **CONFIRMED SEVERE** |
| **C-2** | **`ClarisaActorTypesEnum` does not exist in the client tree.** §5.4 cites it as the source of `5`. Both judges grepped `client/research-indicators/src` and found **zero** matches; the enum exists only at `server/.../clarisa-actor-types/enum/clarisa-actor-types.enum.ts`, and the reference card hardcodes `=== 5`. B adds that `requirements.md` assumption **A4**'s "verified in both trees" overstates what is true — only the *value* is shared, not the symbol | F-9 SUGGESTION | F-3 **SEVERE** | **CONFIRMED — severity split.** Fact independently corroborated twice; B rates it severe |
| **C-3** | **Rollout contradicts the task list and an AC.** §13's *Follow-up owed* row (b) defers the `docs/ux-ui/design.md` §8.1 + §12 registration, grouping it with two genuinely out-of-scope items — while `requirements.md` **R-IUP-017 AC.4** requires registration "**in the same change**" and the target's own **`T-12`** budgets it inside this spec. A deliverable cannot be both an in-spec task and post-rollout debt | F-7 WARNING | F-4 **SEVERE** | **CONFIRMED — severity split.** B rates it severe; an executor following the Rollout table would silently breach AC.4 |

### Suspect — one judge only. Per the gates, **not auto-fixed**

| ID | Substance | Filed by | Note |
| --- | --- | --- | --- |
| **S-1** | **§5.6's byte-for-byte claim is false.** It says `fieldsRequired = true` reproduces "all three fields `[isRequired]="true"` `[validateEmpty]="true"`". In `quantification-item.component.html`, Number and Unit carry both, but **Comments** is an `app-textarea` with `[isRequired]="true"` and **no** `[validateEmpty]`. An implementer building the default as written would change OICR's rendered validation on Comments, at both call sites | Judge A F-2 **SEVERE** | The orchestrator independently read this file earlier in the session and **the code matches Judge A**. Recorded as suspect per protocol, with that corroboration noted |
| **S-2** | **R-IUP-008 AC.2/AC.4 are uncovered for `quantification_number`.** R-IUP-008's Details name `organization_count` **and `quantification_number`** as fields that must reject fractions. §5.4 routes `maxFractionDigits` into the actor counts and §5.5 into `organization_count`, but **§5.6 gives the promoted component exactly one new input (`fieldsRequired`) and is silent on fractions** — while the server DTO enforces `@IsInt() @Min(0)` on `quantification_number`. So a pasted `2.5` in a quantification Number reaches the body and produces a chunk-2 `400`: the precise defect class §4.3 claims to close by construction | Judge A F-3 **SEVERE** | Verifiable by reading the target. **This is a design gap, not a documentation slip** — closing it changes the promoted component's API, so it is a design decision, not an edit |
| **S-3** | **R-IUP-011 AC.6 has no named check.** AC.6 requires the client-computed total to equal the server's returned `total` after a save. §10.2 and §10.3 only validate the client formula against itself. Proposal risk **R-3** asked for exactly this assertion | Judge B F-5 WARNING | If client and server formulas ever diverge, no check in the strategy catches it |

### Info — recorded, not fixed in this lineage

| ID | Substance | Filed by |
| --- | --- | --- |
| **I-1** | §10.3's `fieldsRequired` row credits a detector that cannot detect: `quantification-item.component.spec.ts` has **zero** assertions on `isRequired` / `validateEmpty` / asterisks, so flipping the default fails nothing today. Falsifiability rests entirely on §10.2's *new* assertion being written — which the row should say | A F-4 WARNING |
| **I-2** | Two of §4.3's ten section pointers resolve to the wrong sections: single-mode rendering is §5.4 / §6.5 step 2 (not §6.2), and the stepper's emit-only-a-catalog-id property is §5.3 / §5.2 (not §6.1) | A F-5 WARNING |
| **I-3** | **DD-12 asserts a discipline the document does not keep.** §2.3 cites `result-sidebar (:78)` and `submission.service (:36)` — line numbers — and `result-sidebar.component.ts` is in this spec's own Modified set, the exact condition under which the FP-50 rule DD-12 invokes forbids line citations | A F-6 WARNING |
| **I-4** | **DD-7's fence has a hole.** DD-7 argues at length that "matching an existing violation is not consistency", then promotes `quantification-item.component.html` — which is hex-saturated (`bg-[#F4F7F9]`, `border-[#E8EBED]`, `text-[#8D9299]`, `text-[#CF0808]`) — into `shared/`, with no decision record, accepted-risk note, or OQ. The "zero hex in **new files**" wording quietly excludes the one existing file the spec elevates to shared status. Reachability: certain, by design | A F-8 WARNING |
| **I-5** | Section numbering diverges from `docs/specs/general-setup/design.md` (§5/§6 swapped, §7 and §12 inserted, Rollout at §13, a §16 added). **Chunk 2's archived design deviates identically**, so this is an established family divergence, not a new one — but cross-spec anchors like "§11" mean different things in the template and in this family | A F-10 SUGGESTION |
| **I-6** | R-IUP-016 **AC.5** (`VISUAL_ONLY_GREEN_CHECKS`) is unaddressed by the design but **vacuous**: the constant exists only server-side, the client has no equivalent, and the client gate ANDs every emitted key unconditionally. Nothing for a client spec to do | A, criterion 2 |

### Contradictions between judges

**None of substance.** The two severity splits (`C-2`, `C-3`) are disagreements about how much a corroborated fact matters, not about the fact. No finding was affirmed by one judge and denied by the other, so the *escalate for human decision* gate is not triggered on that ground.

---

## Counts

| Category | Count |
| --- | --- |
| Confirmed by both judges | **3** (`C-1`, `C-2`, `C-3`) — all eligible for correction; one filed severe by both, two severity-split |
| Suspect (single judge) | **3** (`S-1`, `S-2`, `S-3`) — 2 filed severe, 1 warning |
| Contradictions | **0** |
| Info | **6** (`I-1`…`I-6`) |
| Raw findings filed | Judge A 10 · Judge B 5 → **15**, merging to 12 distinct substantive rows |

---

## Round-one correction — AUTHORIZED AND APPLIED

**Authorized by the user** at the Step 2.5 gate: fix `C-1`, `C-2`, `C-3`, `S-1`, `S-2`. `S-3` and `I-1`…`I-6` were explicitly left as info by the same decision. `S-2`'s mechanism was chosen by the user: **a second additive input on the promoted component**, over hardcoding `0` inside it (which would also have closed OICR's identical latent exposure, but by changing another page's behavior) and over recording it as an accepted risk.

**Fix actor:** the orchestrator, inline. The skill's *bounded fix actor* was not spawned as a subagent — the work was sixteen exact string edits against a ledger the orchestrator already holds, where a subagent adds a context hop without adding judgment. The Hard Rule this must not violate is *only the parent merges/persists findings and launches re-judgment*, which is preserved: the re-judgment below is delegated and blind.

### Correction work units

| Finding | Edits | What changed |
| --- | --- | --- |
| **C-1** | 2 | Document Control's two count rows **deleted and replaced by no number at all**, pointing at §2.1 + §10.2 as the single derivation site — KZ-005's standardized remedy is *fewer sites, not better sweeps*. §2.1's OICR row corrected: **one** file changes (`oicr-details.component.ts`, import path), not two — the `.html` is untouched because the selector is unchanged and OICR passes neither new input |
| **C-2** | 3 | `design.md` §5.4 now states `5` is a **client-side literal, not an import**, that the enum is server-only, and instructs the Implementer explicitly **not** to attempt the import. Backward sweep into `requirements.md`: **A4** rewritten (the *value* is shared, the *symbol* is not) and R-IUP-010's Details de-referenced from the enum |
| **C-3** | 1 | §13's *Follow-up owed* row no longer lists the `ux-ui` §8.1 + §12 registration, and now states affirmatively that it is **in-spec**, owned by `T-12`, per R-IUP-017 AC.4's "in the same change" |
| **S-1** | 1 | §5.6 now records OICR's rendering as **field-asymmetric** — Number and Unit carry `[isRequired]` + `[validateEmpty]`; **Comments carries `[isRequired]` only** — and requires the `true` branch to reproduce that asymmetry field-by-field |
| **S-2** | 9 | `maxFractionDigits?: number` added to the promoted component and swept forward to every site describing its surface or the fraction guard: Executive Summary finding 3, §2.3, §4.3 row 1 (now names all three count families explicitly), §5.6, §7, §10.2, §10.3, DD-3, and `T-03` in the task preview |

**Total: 16 edits across `design.md` and `requirements.md`.**

### Scope note — one info row closed incidentally

**`I-1` is now closed**, though it was not authorized. `S-2`'s sweep required rewriting the exact §10.3 row `I-1` faulted, and leaving a knowingly-false detector claim inside a table being edited for another reason would have been worse than the unauthorized scope. The row now states plainly that OICR's existing spec **cannot** detect a flipped `fieldsRequired` default, and that falsifiability here is *created by writing the new assertion, not inherited*. Recorded rather than absorbed silently.

`I-2`…`I-6` and `S-3` remain **open by the user's explicit scope decision**, not by oversight. They carry forward as candidates for `/akili-validate` or the archive sweep.

### Disposition rules applied

| Condition | Action |
| --- | --- |
| **Both** judges confirm a SEVERE finding | Ask the user first, then fix under a bounded fix round |
| **One** judge reports it | Record as `suspect`. **Do not auto-fix** |
| Judges **contradict** | Escalate for an explicit human decision |
| WARNING / SUGGESTION | Remains `info`; not fixed in this lineage |
| Anything unresolved after round 2 | Escalate and stop |

---

## Scoped re-judgment (round 2) — both judges, blind, over the frozen ledger + fix delta

| Finding | Judge A (Fable) | Judge B (Sonnet) |
| --- | --- | --- |
| `C-1` | **PARTIALLY CLOSED** | CLOSED |
| `C-2` | CLOSED | CLOSED |
| `C-3` | CLOSED | CLOSED |
| `S-1` | CLOSED | CLOSED |
| `S-2` | **PARTIALLY CLOSED** | CLOSED |
| Fix-caused | `R2-1` WARNING | `R2-1` WARNING |
| Tally | 3 closed · 2 partial · 1 fix-caused | 5 closed · 1 fix-caused |

**The judges disagreed on closure completeness, and the stricter one was right.**

| ID | Substance | Confirmed by |
| --- | --- | --- |
| **R2-1** | **The round-1 sweep for `S-2` missed sites.** Four sites still carried superseded claims: Executive Summary finding 2 ("with **one** additive input"), the Executive Summary closing paragraph ("the **two** OICR files whose import path moves" — surviving `C-1`'s fix), §5.6's lead-in ("gains **one** input:", sitting two lines above its own two-row table), and **`DD-3`'s Decision column** ("with an additive `fieldsRequired` input") **contradicting its own Rationale column**, which round 1 had updated to "Two default-preserving inputs" | **Both.** Judge B found the two "one input" sites; **Judge A additionally found the Executive Summary OICR residue and the DD-3 self-contradiction**, and on that basis scored `C-1` and `S-2` as only partially closed |

**Why the disagreement matters more than the finding.** Judge B applied the closure test *at the sites the finding named*; Judge A applied it *to the whole document*. That is exactly the distinction the Correction Closure rule draws — a correction is applied not when the cited site is fixed but when the superseded value is gone from everywhere it lived. **Running two different models rather than two of the same is what surfaced it**; two instances of one model would likely have shared the miss. Recorded as evidence for the model-diversity choice in the Transaction table.

Judge A also independently verified the ledger's claim that **`I-1` was closed** by the round-1 sweep, by inventorying `quantification-item.component.spec.ts`'s actual `describe`/`it` blocks (zero matches for `isRequired` / `validateEmpty` / `maxFractionDigits` / asterisk). The claim held.

### Fix round 2 — final bounded round

**Framing, stated explicitly:** these four edits **complete `C-1` and `S-2`**; they are not the adoption of a new warning-severity finding. `R2-1` is warning severity, and warnings remain info under the gate — but `C-1` and `S-2` are the *authorized severe findings*, and both were scored partial **because of this residue**. Finishing an authorized correction is in scope; taking on new scope would not be. Both readings produce the same four edits, so this is a framing note rather than a judgment call — but the framing is what keeps the gate honest.

| Site | Amendment |
| --- | --- |
| Executive Summary finding 2 | "one additive input" → **"two additive, default-preserving inputs"** |
| Executive Summary closing paragraph | "the two OICR files whose import path moves" → **"the single OICR file"**, naming `oicr-details.component.ts` and stating its template is untouched |
| §5.6 lead-in | "gains one input:" → **"gains two inputs, both default-preserving:"** |
| `DD-3` Decision column | now names **both** inputs, aligning it with its own Rationale column |

**4 edits. Cumulative correction work units across both rounds: 20 edits across `design.md` and `requirements.md`.**

---

## Independent final verification

Delegated, read-only, on a model ≠ author. **Delegated rather than self-certified on empirical grounds: the orchestrator's own sweeps failed twice in this lineage** — once to a `grep -v judgment.md` filter that suppressed the very lines it was checking (a check that could not fail), and once to the nine-site sweep `R2-1` caught. Self-verification was the demonstrated weak link.

| Question | Result |
| --- | --- |
| `C-1` fully closed? | **FULLY CLOSED** — exhaustive grep found zero remaining live-claim undercounts; §2.1's surviving "two OICR files" is the historical correction annotation, correctly framed |
| `S-2` fully closed? | **FULLY CLOSED** — nine sites independently corroborate "two inputs, both default-preserving" |
| New defects from fix round 2? | **NONE.** The four amended sites are consistent with §2.1, §5.6's table, §7, §10.2, §10.3, `T-03`, and DD-3's Rationale |
| Internal consistency? | **CONSISTENT.** Every live site agrees at exactly two promoted-component inputs and exactly one changed OICR file. `requirements.md`'s three related hits make no input- or file-count claim and do not conflict |
| Source corroboration | Both `<app-quantification-item>` call sites in `oicr-details.component.html` pass only `[quantification]`, `[quantNumber]`, `[disabled]`, `(update)`, `(delete)` — neither new input, selector unchanged. "Its template is untouched" holds |

**`FINAL VERIFICATION: PASS`**

---

## Terminal receipt

| Field | Value |
| --- | --- |
| Target | `docs/specs/innovation-use/details-page/design.md` |
| Mode | `judgment_day` (4R not also run) |
| Lineage consumed | **2 of 2 fix rounds · 1 of 2 scoped re-judgments · 1 independent final verification.** Not reset, not extended |
| Round 1 | 3 confirmed (both judges) · 3 suspect (single judge) · **0 contradictions** · 6 info · 15 raw findings → 12 distinct rows |
| Authorized and fixed | `C-1`, `C-2`, `C-3`, `S-1`, `S-2` — by explicit user decision at the Step 2.5 gate, with the `S-2` mechanism chosen by the user |
| Round 2 | 1 fix-caused finding (`R2-1`, WARNING, confirmed by both) → final bounded fix round → **PASS** |
| Correction work units | **20 edits across 2 files** (16 in round 1, 4 in round 2) |
| Closed incidentally | `I-1` — unauthorized but unavoidable, since the `S-2` sweep rewrote the exact row it faulted. Verified closed by Judge A |
| **Open by explicit user decision, not oversight** | `S-3` (R-IUP-011 AC.6 has no named check) · `I-2` (two wrong §4.3 section pointers) · `I-3` (DD-12 asserts a citation discipline §2.3 breaks) · `I-4` (DD-7's fence excludes the hex-saturated file promoted into `shared/`) · `I-5` (section numbering diverges from the general-setup template — an established family divergence) · `I-6` (R-IUP-016 AC.5 unaddressed but vacuous). **Carry these into `/akili-validate` or the archive sweep** |
| Survived falsification | DD-4's full PrimeNG analysis · zero upstream contract drift · DD-2's `1,665` · the 16-file blast radius · the catalog facts · the five stored-function conjuncts · constitutional conformance · 6 of 7 falsifying inputs |
| Skill resolution | `judgment-day` (this review) · `brainstorming` (Phase 1) · `angular-developer` (Phase 2) · `ui-ux-pro-max` deliberately declined per `design.md` DD-13 |
| Artifacts | this ledger · `design.md` · `requirements.md` |

# JUDGMENT: APPROVED ✅

Approved with six findings **knowingly open** and enumerated above. Approval covers the target's factual and internal correctness as audited — it does **not** discharge `requirements.md` §9's human-gated defect classes (**D7** visual, **D8** accessibility), which no document review can close and which remain owed at the Phase-3 HITL pause and again before archive.
