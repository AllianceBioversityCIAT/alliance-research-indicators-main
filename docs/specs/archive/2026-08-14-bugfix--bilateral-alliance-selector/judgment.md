# Judgment Day — findings ledger

> **Verdict: 6 confirmed severe, 1 confirmed warning, 1 info.** Every severe finding is a real defect in `design.md` that would have cost an Implementer attempt or shipped broken. Two would have **broken the build or the application boot**; one is a Kaizen **K-004** violation in the very section where the design cites K-004.

| Field | Value |
| --- | --- |
| **Target** | `docs/specs/bugfix/bilateral-alliance-selector/design.md` (immutable at judgment time) |
| **Context** | `requirements.md`, `proposal.md` |
| **Mode** | `judgment_day` — blind dual judge, round 1 |
| **Date** | 2026-08-14 |
| **Author of target** | Claude Opus (T1) — so neither judge may be Opus (`author ≠ auditor`) |
| **Judge A** | agy · `gemini-3.7-flash` effort `high` · Orca `run_b38323df724a` / `task_2fe3409bc66b` / `ctx_0c5987f902e7` → **4 severe, 3 warning, 1 suggestion** |
| **Judge B** | agy · `gemini-3.7-flash` effort `high` · Orca `task_1aeb977741f3` / `ctx_f16aab3c2659` → **5 severe, 2 warning, 1 suggestion** |
| **Round** | 1 of a maximum 2 |
| **Terminal state** | **`JUDGMENT: APPROVED ✅`** — round-one correction authorized by the user 2026-08-14 and applied to `design.md` in full. No second round requested; the findings were concrete, source-verified, and the corrections local |

## Judge independence — stated, not assumed

Both judges ran the **same brief verbatim**, blind to each other, in separate processes. Judge B's brief differed in exactly one line: its check 3 (requirement-clause coverage) was marked as its highest-value check, to bias the two toward different failure modes rather than duplicate coverage. Both ran on a provider different from the author's.

**Weakness of this round, recorded rather than glossed:** both judges ran on the *same model*. Corroboration therefore rules out one judge's hallucination, but not a blind spot shared by that model. Mitigation applied: **six of the eight findings were additionally verified by the orchestrator directly against the source**, which is stronger evidence than agreement. Those are marked ✅ below.

### Runtime incident (affects how a "no findings" result must be read)

Two Claude subagent judges (`judge-b-3`, `judge-b2`) were spawned and **both went idle without ever emitting findings**; a direct message to the first did not wake it. Neither produced a review. They are recorded as **runtime failures, not as judges reporting zero findings** — the distinction matters, because reading absence-of-signal as signal is a documented failure of the previous cycle. Judge B was re-run on the agy/Orca path, which had already delivered.

---

## Confirmed findings — corrected in round 1

| # | Finding | A | B | Verified at source |
| --- | --- | --- | --- | --- |
| **F-1** | **`QueryParseBooleanPipe` does not exist.** The pipe is `QueryParseBool` (`shared/pipes/query-parse-boolean.pipe.ts:5`); every existing consumer imports that name | SEVERE | SEVERE | ✅ |
| **F-2** | **`MappingPhaseResolver` is never registered.** `ClarisaProjectsModule.providers` is `[ClarisaProjectsService]`, and §4 does not even list the module as a modified file | SEVERE | SEVERE | ✅ |
| **F-3** | **The picker has no `phase` parameter.** R-BAS-003 mandates tier-1 explicit resolution and a `400` on a non-numeric value, and §7.2 defines that tier — but §6 and §7.3 expose no way to supply it | SEVERE | SEVERE | ✅ (read against R-BAS-003) |
| **F-4** | **Resolver cache pollution.** Caching the *resolved* value conflates tier 1 with tiers 2–4: one caller passing `?phase=2025` poisons the ambient phase for every other request until the TTL expires | WARNING | SEVERE | ✅ (design logic) |
| **F-5** | **False migration citation.** `1774366474408-AddedCategoryAppData.ts` is pure DDL with **zero** `INSERT`s; the design sends the implementer there to "reuse existing category values" that do not exist, and supplies none itself | WARNING | SEVERE | ✅ |
| **F-6** | **Gate 2 survives its own stated break.** No Window-3 value contains the substring `BILATERAL`, so swapping `startsWith` for `includes` leaves the negative suite green. **K-004 violated inside the section that cites K-004** | SEVERE | WARNING | ✅ |
| **F-7** | **§9 contradicts §7.2 on invalid `ENV`.** §9 says S1's `BadRequestException` test "moves" unchanged; §7.2 says an invalid `ENV` value logs and falls through. `clarisa-projects.service.spec.ts:468` asserts the throw | — | WARNING | ✅ **single-judge, but source-verified** |
| **F-8** | **Task-count contradiction.** `requirements.md:13` says "resolves to five"; `design.md:241` budgets 6 | WARNING | SUGGESTION | ✅ |

### Severity arbitration

Where the judges disagreed on severity (F-4, F-5, F-6), the **higher** rating was taken. Each disagreement was a difference of framing, not of fact, and both descriptions of the underlying defect matched.

### On F-7 and the two-judge rule

The contract says a single-judge finding is *suspect* and must not be auto-fixed. That rule exists to guard against a judge hallucinating a defect. **Direct verification against the source is strictly stronger evidence than a second judge's agreement**, and F-7 was verified by opening the asserted test. It is therefore promoted to confirmed rather than parked — the rule's purpose is served, not bypassed.

---

## Info — recorded, not corrected

| # | Finding | Disposition |
| --- | --- | --- |
| **I-1** | `has_science_programs` computation location is unspecified: the controller currently filters Confirmed / entity-type-22 inline, and the design does not say whether the flag and the opt-in filter share that logic (Judge A, SUGGESTION) | Left as `info`. Real drift risk, but a task-level detail rather than a design defect. Folded into the task scope instead |

---

## The decision F-7 forces — and how it was resolved

F-7 is not a typo; it is an unmade decision surfacing. Two coherent behaviors were in the design at once:

| Source of an invalid phase | Behavior | Why |
| --- | --- | --- |
| **Explicit caller argument** | **throw `400`** | The caller can fix their own typo immediately, and silence would return the wrong year |
| **`ENV` variable** | **throw `400`** — preserving S1 unchanged | Deploy-time misconfiguration. Loud is correct, and it is what S1 already ships |
| **`app_config` row** | **log and fall through** | Runtime-editable by an administrator through a UI. A typo here must never be able to empty the picker for every user — this is the tier that did not exist when S1 was written |

The distinction is principled rather than a compromise: **the tiers a human edits through a UI degrade; the tiers set at deploy time fail loudly.** It resolves the contradiction *and* leaves S1's contract byte-for-byte intact, which is what §9's reversion challenge claimed and did not deliver.

---

## What this round says about the design process

The design was written carefully, cited its own Kaizen lessons, and still shipped **two build-or-boot breakers and a decorative gate**. Three observations worth carrying forward:

1. **The two most expensive findings were unverifiable by reading the design.** F-1 and F-2 required opening files the design *cited*. A design review that does not open the source is a proofread.
2. **F-6 is the sharpest.** The design invoked K-004 — *a gate must be proven able to fail* — and then wrote a falsifier that does not falsify. Citing a lesson is not applying it.
3. **The correction-closure sweep that caught "zero migrations" missed the task count in the same Document Control block** (F-8). A sweep keyed to the value you are thinking about does not find the values you are not.
