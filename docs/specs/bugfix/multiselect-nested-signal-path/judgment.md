# Judgment Day — bugfix / multiselect-nested-signal-path

- **Target:** `design.md` (draft), with `requirements.md` + `proposal.md` as supporting context
- **Mode:** `judgment_day` — blind dual review, two read-only judges, identical scope
- **Round:** 1 of max 2
- **Date:** 2026-08-03
- **Skill resolution:** `systematic-debugging` (diagnosis), `angular-developer` (client conventions)
- **Independence caveat:** both judges ran on the **same model tier that authored the design**. Independence here is **context blindness, not model diversity** — the registry pins T3 Auditor to `opus` and the session model is Opus. The author≠auditor rule is half-satisfied. Weigh confirmations accordingly.

---

## Verdict counts

| Class | Count |
| --- | --- |
| **Confirmed severe** (both judges) | **2** |
| **Confirmed non-severe** (both judges) | 2 |
| **Suspect** (one judge) | 4 |
| **Contradictions** | 0 |
| **Info / suggestion** | 2 |

---

## Confirmed — SEVERE (both judges)

### C-1 — The nested call-site inventory is wrong: **8, not 5**

| | |
| --- | --- |
| Judge A | J-2 (WARNING) |
| Judge B | J-1 (SEVERE) |
| Orchestrator verification | ✅ **Independently re-run.** `grep` for both binding forms returns **8** |

The enumeration in `proposal.md`, `requirements.md` §7 A-1, and `design.md` §8 was produced by searching only the attribute form `signalOptionValue="a.b"`. It misses the property-binding form:

```
create-oicr-form.component.html:331  [signalOptionValue]="'step_three.regions'"
create-oicr-form.component.html:344  [signalOptionValue]="'step_three.countries'"
create-oicr-form.component.html:404  [signalOptionValue]="'step_three.countries'"
```

**Impact.** The fix mechanism still repairs these (it lives in the shared component), so this is not a fix defect. It is a **scope defect**: the mandatory D-5 human browser check was drawn around CapSharing only, and Judge A shows OICR create step 3 is a second *blocking* surface — `isCompleteStepThree` (`create-oicr-form.component.ts:423-424`) can never be satisfied for `geo_scope_id > 1` under the same root cause. The three missed sites are the highest-complexity nested consumers in the repo.

**Root of the error:** enumerating by one syntactic form instead of by the binding's semantics — a variant of **KZ-002** (enumerate by what renders, not by where it looks).

### C-2 — The fix activates dormant code, and no declared gate covers it

| | |
| --- | --- |
| Judge A | J-2 (WARNING) — "the sub-national rows … only become reachable once `step_three.countries` is actually populated … is verified by nothing, automated or human" |
| Judge B | J-2 (SEVERE) — names a concrete render-time `TypeError` |
| Orchestrator verification | ⚠️ **Class confirmed by both. The specific TypeError mechanism is Judge-B-only and NOT yet verified.** |

Today `setValue` never lands in `step_three.countries`, so the OICR sub-national cascade is unreachable. After the fix it goes live for the first time. Judge B's mechanism: `setValue` builds items as plain clones (`multiselect.component.ts:394-398`) that do not carry `result_countries_sub_nationals_signal`, while the `#rows` template calls it as a function without a guard (`create-oicr-form.component.html:360, 361, 380`); the signal is only attached later by the effect at `create-oicr-form.component.ts:470-477`.

**Impact.** A bugfix advertised as "no other method changes" could ship a render-time crash in the OICR creation modal with every declared gate green. `requirements.md` §6 presents itself as the **complete** class→gate mapping and does not contain this class: *the fix makes previously-dead code reachable.*

**This is the finding that matters most.** Both severe findings share one underlying mistake: the blast radius was scoped as "one shared component, well understood" when it in fact includes **code that has never executed**.

---

## Confirmed — non-severe (both judges) — remain `info` per contract

### C-3 — DD-1's stated rationale is factually false (both judges, WARNING)

Judge A J-3 + Judge B J-3, same evidence. DD-1 justifies the clone-the-spine approach as removing "a latent hazard … in-place mutation would corrupt the baseline silently." But two sibling writers in the same component **already** mutate in place: `removeOption` (`:426`) and the `onChange` effect (`:193`), both via `setNestedPropertyWithReduce`, which writes `acc[key]` with no cloning (`utils.service.ts:31-38`).

The hazard is **not removed** — at best reduced for two of four writers.

Both judges independently affirm the **decision** is still correct (Judge B: "still my preference for the flat-path reference-identity reason DD-4 gives"), and both **verified rather than refuted** the `pool-funding-alignment` `isDirty` claim. What is wrong is the *recorded reasoning*, which would tell the next author the component is immutable-by-construction. It is not.

### C-4 — DD-3's test setup is under-specified and will throw (both judges)

Judge B J-4 (WARNING) + Judge A J-5b (SUGGESTION). The file's top-level `beforeEach` already instantiates the TestBed (`multiselect.component.spec.ts:68`), so a nested `describe` calling `configureTestingModule` without `TestBed.resetTestingModule()` throws *"Cannot configure the test module when the test module has already been instantiated"*. The correct in-file precedent is the SSR block at `:1512-1531`, which also re-supplies all five other doubles.

Consequence: the red-before-green step produces a **setup error instead of a meaningful red** — indistinguishable from a real failure, and it burns the single review round the budget allocates.

---

## Suspect — one judge only. Recorded, NOT auto-fixed

| ID | Judge | Finding | Orchestrator note |
| --- | --- | --- | --- |
| **S-1** | A J-1 | `multiselect.component.html:1` — `@let list = this.signal()[this.signalOptionValue];` is a **literal-key read** in the component's own template, consumed at `:96`. The design's claim "every read uses `getNestedProperty`" is false. | ✅ **Independently verified TRUE.** Promoted out of suspect on evidence, not on judge count. User harm is cosmetic (skeleton branch only), but the same defect class survives *in the file the spec claims to fix* |
| **S-2** | A J-4 | The helper's behavior when an intermediate segment is absent/null/non-object is unspecified; today's code never touches `current.group`, the rejected helper creates it via `acc[key] ??= {}`. Two spec-conformant implementations could differ invisibly | Real gap. Matters at OICR where `step_three` is service-initialized but the picker can render before autofill settles |
| **S-3** | B J-5 | `removeOption` becomes reachable at nested sites for the first time and performs a **re-entrant `selectEvent.emit` inside `signal.update()`** (`:424-428`) — a clobbering shape already documented in-repo at `pool-funding-alignment.component.ts:336-341` | Judge A independently confirms `removeOption` is *path*-correct; B's concern is *reachability*, not addressing. Not contradictory |
| **S-4** | A J-5a | `setValue` sets `body` unconditionally at `:382`, so any `body().value` assertion **not** preceded by `TestBed.flushEffects()` passes green on today's broken code | Real false-green path. The flush currently lives only in requirements prose |

---

## Info / suggestion

- **B J-6** — §7.1 should state two unasserted invariants: single-segment paths must reduce to exactly `{ ...current, [key]: value }`; and `nextState` must be reassigned or `selectEvent` emits `undefined`.
- **B J-7** — `MultiselectInstanceComponent.setValue` (`:93-107`) already writes through `setNestedPropertyWithReduce`, so excluding the sibling component is safe **on the merits**, not merely by scoping.

---

## Contradictions

**None.** The judges agree on every point of fact they both examined. Notably both independently *verified* DD-1's `pool-funding-alignment` claim rather than refuting it, and both agree `removeOption` is path-correct.

---

## Round 1 correction — applied 2026-08-03

**User decision: "Fix only"** — corrections applied, **no scoped re-judgment run**. Rounds consumed: **1 of 2**. One fix round and two re-judgments remain available.

| ID | Class | Disposition |
| --- | --- | --- |
| C-1 | Confirmed severe | ✅ **Fixed** — count corrected to 8 in `proposal.md`, `requirements.md` §7 A-1, `design.md` §8. D-5 browser check extended with a mandatory OICR step-3 script |
| C-2 | Confirmed severe | ✅ **Fixed** — new defect class **D-6** in requirements §6; new `design.md` §2.1 "What becomes reachable"; new **DD-5**; new task T-04; risk R-4 |
| C-3 | Confirmed (warning) | ✅ **Fixed** — DD-1's false rationale struck and replaced. Contract leaves warnings as `info`; corrected anyway because the recorded claim was **factually false** and would mislead the next author |
| C-4 | Confirmed (warning) | ✅ **Fixed** — DD-3 now mandates `resetTestingModule()`, re-supplying five doubles, and names the in-file precedent at `:1512-1531` |
| S-1 | Suspect → **verified true** | ✅ **Fixed** — promoted on independent verification, not judge count. New R-MNP-006; template added to scope and directory listing |
| S-2 | Suspect | ✅ **Fixed** — new R-MNP-005 with two scenarios; helper invariants I-3/I-4 in §7.1 |
| S-3 | Suspect | ⚠️ **Recorded, not fixed** — uncorroborated. Carried as requirements R-3 / design R-5, to be verified during T-04. Correctly *not* auto-fixed per contract |
| S-4 | Suspect | ✅ **Fixed** — `TestBed.flushEffects()` made explicit in R-MNP-002 AC.1 with the false-green explanation |
| B J-6 | Info | ✅ Absorbed as helper invariants I-1 / I-2 |
| B J-7 | Info | ✅ Absorbed into §7.2 |

**Budget re-baselined** in `design.md` §10: 3 → 5 tasks, ~70 → ~110 LOC. Growth traced entirely to findings, not scope creep. Depth re-checked: **still Lite**.

---

## Terminal state

**`APPROVED ✅` — with two declared, unclosed exposures.**

Approval here means *the documents no longer contain a known error*, not *the design is proven safe*. Two things are explicitly not closed:

1. **D-6 has no automated gate.** The only thing standing between this fix and a possible render-time crash in the OICR create modal is task T-04 and a human browser check. If either is skipped, the spec ships with its most dangerous class unverified.
2. **S-3 is uncorroborated and unverified.** One judge flagged `removeOption` re-entrancy; the other found the method path-correct and did not raise it. It is carried, not resolved.

**Independence caveat stands:** both judges ran on the author's model tier. A defect visible only to a different model generation would have survived this review unseen. No re-judgment was run on the corrections, so the fixes themselves are **unreviewed**.
