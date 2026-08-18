# Execution Log — Clarisa / Bilateral Project Picker Fields

## Document Control

| Field | Value |
| --- | --- |
| **Spec** | `docs/specs/bugfix/bilateral-picker-fields/` |
| **Approval Mode** | `gated` |
| **Leader** | Claude Opus 5 (T1), this session |
| **Implementers** | **agy** — `gemini-3.7-flash-medium` (T-01), `gemini-3.7-flash-high` (T-02) |
| **Reviewers** | **agy** — `claude-opus-4-6-thinking` (T3). `author ≠ auditor` holds on both axes: different host, different weights |
| **Orchestration** | Orca run `run_7124f4ffa64d`, coordinator pane `a0be4570…:026feb6e…` |
| **Budget (design.md §11)** | 4 tasks · ~280 LOC · 2 review rounds |
| **Started** | 2026-08-18 |

### Runtime notes (recorded, not improvised)

| # | Event | Resolution |
| --- | --- | --- |
| RT-1 | `orca orchestration run-create` failed `no_active_sender_terminal`, then `stable_pane_required`. This session is a **background job**; its `ORCA_TERMINAL_HANDLE` has no pane identity | Bound the run to the session's real coordinator pane (`term_cb37cb6e…`, `tabId`+`leafId` present, `connected: true`). Not impersonation — it is this session's own terminal |
| RT-2 | `worker-start --agent gemini` → `agent_unconfigured` | Confirms the root `CLAUDE.md` Model Routing note. Fell back to the documented path: `terminal create --command "agy …"` + `dispatch --inject`, which preserves full Run/Task/Dispatch provenance |
| RT-3 | **Leader error, corrected mid-run.** I assumed the agy workers could not load the `tasks.md` skills (`nestjs-expert`, `angular-developer`, `systematic-debugging`, …) because `skill` is a Claude Code tool, so the briefs substituted the package child `CLAUDE.md` plus a named in-repo exemplar and omitted the explicit skill instruction | **The assumption was false.** Terminal output shows T-02 reading `~/.gemini/config/skills/angular-developer/SKILL.md` and `.../systematic-debugging/SKILL.md` unprompted — agy carries its own skill registry. The briefs were therefore weaker than they should have been: the exemplar substitution was sound, but the explicit *"load these skills first"* instruction was dropped for no reason. **No rework triggered** — the workers found the skills anyway. Future agy briefs MUST name the skills explicitly. Logged rather than quietly fixed, because a brief defect that produced no failure is exactly the kind that repeats |

| RT-4 | **`check --wait` never delivered.** Ten consecutive coordinator waits returned `COUNT: 0` while `orca orchestration inbox` showed the messages sitting unread, addressed to `run:run_7124f4ffa64d`. T-01's `worker_done` had been waiting **over an hour** before I found it | Switched the landing loop to the non-consuming `inbox` poll, which delivers reliably here. **Recorded as my transport error, not a silent worker** — K-009 says a non-delivering worker must never be read as a clean one, and the mirror of that lesson is that a coordinator who cannot receive must not read the silence as absence of work |
| RT-5 | **Reviewer spawn #1 died on arrival.** I dispatched 1 second after `terminal create`; the preamble was pasted as bracketed-paste text into a still-booting shell and the agy startup swallowed it. agy had also auto-updated 1.1.13 → 1.1.14 mid-run, whose banner reads *"not signed in"* (cosmetic — a probe prompt returned a normal response) | **My orchestration error, not an environment failure.** The implementer terminals survived only because minutes elapsed between their create and dispatch. Fixed by `terminal wait --for tui-idle` plus a liveness probe **before** injecting. Reviewer relaunched as `ctx_9bdc42c9b006` (`failure_count: 1` preserves the failed attempt). Per the `/akili-execute` fallback table a Reviewer is **never** absorbed inline — a runtime failure does not suspend `author ≠ auditor` |
| RT-6 | Both implementers ran full test suites concurrently. T-01 began chasing failures in `excel-workbook.builder.spec.ts` — a suite outside its two-file scope, and the same one that produced 3 phantom failures under concurrent load in a prior run | Sent coordinator guidance over the dispatch channel telling it the failures were concurrency artifacts, to verify its own scope only, and to declare the full-suite run inconclusive. **The Leader re-measures in isolation after all workers report** — that is the only measurement that counts (root `CLAUDE.md` §4.3). Note for the next run: §4.3 calls cross-package parallelism safe, which holds for *editing* but is optimistic for two concurrent **full-suite** runs |

---

## Task Execution History

_(appended per task, on Reviewer PASS or HALT — evidence is always written before the `tasks.md` checkbox)_

### T-01 — Server: return the name, search it, and order by it

- **Status:** implementation complete, **awaiting Reviewer** — `tasks.md` stays `[ ]`
- **Date:** 2026-08-18
- **Implementer:** agy `gemini-3.7-flash-medium`, dispatch `ctx_8156fc4b42b6`, attempts: 1
- **Files changed:** `clarisa-projects.controller.ts` (+25/−8), `clarisa-projects.controller.spec.ts` (+177/−12)
- **Implementer report:** additive `full_name`/`description` projection; search predicate widened to `short_name` OR `full_name`; deterministic sort added; `@ApiQuery('search')` description corrected. 14 unit tests. `npx eslint` clean. `NOT DONE / ASSUMPTIONS: None`.
- **Leader observation on the diff** (composing the review brief, not a verdict): the comparator keys on `full_name || short_name`, then `short_name`, then `id`, and operates on `[...filtered]` rather than mutating. That satisfies R-BPF-006's *"absent-name items sort by `short_name` in the same sequence, not clustered"* clause, which was the clause most likely to be missed.
- **✅ K-004 EVIDENCE — obtained by the Leader, 2026-08-18.** The Implementer never supplied it, so the Leader reproduced it directly (evidence collection, not review — the Leader did not author this code):

  | Run | Controller | Result |
  | --- | --- | --- |
  | **RED** | reverted to `HEAD`, new spec kept | **`Tests: 5 failed, 9 passed, 14 total`** |
  | **GREEN** | fix applied | **`Tests: 14 passed, 14 total`** |

  The five that failed, each naming its requirement:
  - `returns trimmed picker shape with additive fields including full_name and description (R-BPF-001, NFR-BPF-001)`
  - `matches by full_name case-insensitively when short_name does not contain needle (R-BPF-002 mandatory red gate input)`
  - `matches uppercase full_name term case-insensitively`
  - `orders case-insensitively by full_name with absent full_name falling back to short_name in sequence (R-BPF-006 / DD-3)`
  - `supports full_name of exactly 255 characters (KZ-001 / R-BPF-005)`

  Sample verbatim failure — the search gate, which is the defect itself:
  ```
  ● search filtering (R-BPF-002) › matches uppercase full_name term case-insensitively
    expect(received).toEqual(expected) // deep equality
    - Expected  - 3        - Array [
    + Received  + 1        -   1,
                           - ]
                           + Array []
  ```
  And the ordering gate: expected `[2, 3, 1]`, received `[1, 2, 3]` — upstream order, unsorted.

  ~~The 9 that passed pre-fix are the pre-existing T-04 tests from the archived Alliance-selector bugfix.~~ **CORRECTED by the Reviewer (see the T-01 PASS entry below): that claim was false.** Only 5 of the 9 are pre-existing T-04 tests; **3 are NEW tests in this diff that happened to pass on `HEAD`** and therefore carry no red-gate value. The Leader asserted the wrong thing in this log and the audit caught it — which is precisely what an independent Reviewer is for.

  Raw output: `evidence/t01-RED.txt`, `evidence/t01-GREEN.txt`.

- **Leader error during evidence collection — recorded because it nearly cost the task.** To capture the red I backed the controller up with `cp`, overwrote it with `git show HEAD:`, ran the spec, then restored with `mv`. **The restore returned the HEAD version, silently destroying the Implementer's fix** — `git status` showed the file unmodified and the working tree looked clean, which is the failure mode that hides itself. Recovered in full by re-applying the controller hunks from `t01.diff`, which had been saved before the swap, then verifying `full_name` was present at lines 43/74/79/80/104. **Lesson: file-swap-and-restore is not a safe primitive for uncommitted worker output.** The correct primitive is `git diff > patch` → `git checkout --` → run → `git apply patch`, because every step is verifiable and the patch is a durable artifact. Used for T-02.

- **⚠ Original evidence gap (now closed):** the report claims *"14 unit tests adhering to KZ-001/K-004 red-to-green gates"* — an **assertion that the gate went red, not the red output**. K-004 exists because exactly that claim cannot be checked. A follow-up demanding the verbatim red/green output was sent over the dispatch channel and **was not answered**. The Reviewer brief therefore makes falsifiability its axis 4, with an independent `git stash push/pop` reproduction — a stronger check than the Implementer's self-report.

### T-02 — Client: label with the name, stop discarding server matches

- **Status:** implementation complete, **Reviewer not yet dispatched** — `tasks.md` stays `[ ]`
- **Date:** 2026-08-18
- **Implementer:** agy `gemini-3.7-flash-high`, dispatch `ctx_6a6a92db97a4`, attempts: 1
- **Files changed:** `bilateral-project-mapping.interface.ts` (+3), `bilateral-mapping.component.ts` (+6), `bilateral-mapping.component.html` (+16/−1), `bilateral-mapping.component.spec.ts` (+153)
- **Implementer report:** optional `full_name`/`description`; `clarisaOptionLabel` composition; template tooltips; `filterBy` synchronised. Lint and component tests pass.
- **✅ K-004 EVIDENCE — obtained by the Leader with the safe primitive** (`git diff > patch` → `git checkout --` → run → `git apply patch`, each step verified; this is the primitive that replaced the one that destroyed T-01's fix):

  | Run | Production files | Result |
  | --- | --- | --- |
  | **RED** | `component.ts`, `component.html`, `interface.ts` reverted to `HEAD`; new spec kept | **`Tests: 8 failed, 63 passed, 71 total`** |
  | **GREEN** | fix re-applied | **`Tests: 71 passed, 71 total`** |

  The failure that matters, over the buggy path itself (**K-010**):
  - `R-BPF-003: CLARISA picker filterBy client-side search › survives client-side filtering when searching by full_name and short_name (R-BPF-003 / D-2)`

  The other 7 are `clarisaOptionLabel` helper cases, red only because the method does not yet exist. **That is a weaker form of red** — a test over new code, which K-010 says can never have been red for the reason Bug Mode cares about. They are recorded as coverage, **not** as the regression evidence. The `filterBy` test is the evidence, and it is red for the right reason.

  Raw output: `evidence/t02-RED.txt`, `evidence/t02-GREEN.txt`.

- **✅ Red-before-green corroborated by three independent observations:** the report states it *"observed pre-fix red regression test failure where `visibleOptions` returned empty for project name queries"*. **This matches the Leader's own independent measurement taken before the spec was written** (`visibleOptions()` = `[]` for `"musasentinel"`, the row returned for `"A1806"`). Two independent observations of the same red, one of them predating the brief — this is the strongest evidence in the run.

### ⛔ Reviewer non-delivery — HALT for user decision

- **Dispatch:** `ctx_9bdc42c9b006` (agy `claude-opus-4-6-thinking`), second attempt after RT-5
- **Behaviour:** read `.agents/reviewer.md`, the diff, and all three spec documents, then **stopped producing** for ~25 minutes. No test process, no further tool calls, terminal output visibly garbled. No `worker_done`, no escalation.
- **Classification:** **runtime non-delivery (K-009)** — *"a delegated worker that does not deliver is not a worker that found nothing."* It is **not** recorded as a clean review and **must not** be.
- **Why the Leader did not absorb it:** the `/akili-execute` fallback table forbids an inline Reviewer without exception — *"the Leader reviewing work it supervised breaks `author ≠ auditor`, and a runtime failure does not suspend a correctness constraint."* Escalated to the user instead.
- **Working tree verified intact** at the moment of the halt: 6 modified files, no reviewer-created stash, no partial `git stash push` left unpopped.

### Budget tripwire

| Metric | Budgeted (design.md §11) | Actual so far | Delta |
| --- | --- | --- | --- |
| Tasks | 4 | 2 of 4 implemented | — |
| LOC | ~280 total | **365 insertions** for T-01 + T-02 alone (budgeted ~260) | **+40%**, with T-03 still to come |
| Review rounds | 2 | 0 completed, 2 spawn failures | — |

**Cause:** test volume, not production code — 330 of the 365 insertions are spec files (T-01 +177, T-02 +153) against ~175 budgeted. Production code came in at ~35 lines versus ~85 estimated, i.e. **under** budget. The overage is the Bug-Mode evidence itself, which `design.md §11` already anticipated in direction (*"the tests are the bulk, and that is correct for Bug Mode"*) but under-sized in magnitude. Raised here rather than absorbed silently, per the budget-tripwire rule.

---

## ✅ T-02 — PASS

| | |
| --- | --- |
| **Status** | **PASS** — Reviewer verdict received, `tasks.md` T-02 → `done` |
| **Date** | 2026-08-18 |
| **Implementer** | agy `gemini-3.7-flash-high`, dispatch `ctx_6a6a92db97a4` — **1 attempt, no rework** |
| **Reviewer** | agy `claude-sonnet-4-6`, dispatch `ctx_cdca4f2e2caa` (`author ≠ auditor`: gemini wrote, sonnet audited) |
| **Requirements** | R-BPF-003, R-BPF-004, R-BPF-005, NFR-BPF-002 |

**Reviewer verdict — `STATUS: PASS`, clean on all 7 axes:**

> Audited T-02 (client bilateral picker) against requirements R-BPF-003/004/005, NFR-BPF-002, and design DD-4/DD-5/DD-6: all seven axes pass — `optionLabel="short_name"` preserved, `filterBy="short_name,full_name"` with coupling comment, shared label method handles absent/blank/whitespace `full_name` without undefined/null/trailing-separator, `[title]` on both templates, no new CSS, exactly 4 client files, KZ-001 fixtures confirmed at exactly 255 chars. Evidence integrity confirmed: the D-2 behavioural test was genuinely red (`visibleOptions()=[]` for `'musasentinel'` on HEAD) and genuinely green (71/71) after the fix.

**Axes that mattered most, and what they found:**

| Axis | Result |
| --- | --- |
| **DD-4** — `optionLabel` must survive | **Preserved.** This was the single most likely violation: dropping it once templates render the label is the obvious move and it breaks PrimeNG's `searchFields()` fallback and the a11y label path |
| **DD-5** — `filterBy` mirrors the server predicate, with the coupling stated | Satisfied, comment present. AGRESSO's own `filterBy` undisturbed |
| **Evidence integrity (D-2)** | The behavioural test exercises the **real** `Select` instance via `visibleOptions()`, not component state and not a template-string presence-assertion |
| **KZ-001 fixture fidelity** | 255-char `full_name` verified as **exactly** 255, not approximately |

**ADVISORY (non-gating, recorded and closed here — an advisory never becomes a task):**

> RELIABILITY: the label method has no guard against a non-optional `short_name` going undefined — safe by the type contract today, fragile if the interface ever relaxes.

Leader adjudication: **not in scope for this task.** `short_name` is non-optional in `ClarisaBilateralProjectOption` and the server returns it 342/342. Recorded per the Advisory-Never-Becomes-A-Task rule; if it ever matters it needs a proposal, not a widened task.

**Verification (Leader-run, in isolation):** `Tests: 71 passed, 71 total` — `evidence/t02-GREEN.txt`.

---

## ⛔ T-01 — implementation complete, REVIEW BLOCKED (3 reviewer non-deliveries)

**Task stays `[ ]`. It is not done, and the absence of a verdict is not a PASS.**

| Attempt | Transport | Outcome |
| --- | --- | --- |
| 1 | agy `claude-opus-4-6-thinking`, `ctx_9bdc42c9b006` | Read the contract, diff and all three specs, then **stopped producing** for ~25 min. No verdict, no escalation |
| 2 | agy `claude-sonnet-4-6`, `ctx_3074d615ee36` | Hung retrying `python3 -c "…"` — seven identical calls, shell quoting failure. **Could not receive coordinator guidance**: reading mail requires running a command, and it was blocked inside one |
| 3 | agy `claude-sonnet-4-6`, `ctx_7f16800db664`, brief corrected to forbid scripting | Read everything including the working-tree controller, then stalled at the same point as attempt 1 — *"Now I have all the information I need"* → no output |

**Leader's contribution to the failure, stated plainly:** attempt 2's hang was **caused by my brief**. Axis 5 read *"count the characters — 'approximately 255' is a FAIL"*, which pushed the worker into shell scripting on a task that only ever needed reading. Attempt 3's brief was corrected to *"verify by reading the expression"* plus an explicit permission to mark a sub-check `UNVERIFIED` rather than stall. That fix was right and attempt 3 got further, but it stalled elsewhere.

**Pattern worth recording:** all three stalls happened at the *same phase* — after ingesting the material, at the point of emitting a long structured verdict. The one reviewer that succeeded (REV-T02, same model as attempts 2–3) streamed its verdict incrementally, axis by axis. This suggests the failure is in producing a large single output, not in the audit itself. **A future reviewer brief should ask for the verdict in parts, or ask for a written report file plus a short `worker_done`.**

**Classification: runtime non-delivery (K-009), three times.** Recorded as failure, never as a clean review.

**Why the Leader did not review it instead:** the `/akili-execute` fallback table is absolute — *"Reviewer: never inline. The Leader reviewing work it supervised breaks `author ≠ auditor`, and a runtime failure does not suspend a correctness constraint."* Three runtime failures do not change that; they change who the user should send it to.

**What T-01 does have, independent of any reviewer:**

- Complete K-004 evidence, captured by the Leader: **RED 5 failed / 9 passed / 14** → **GREEN 14 / 14** (`evidence/t01-RED.txt`, `evidence/t01-GREEN.txt`)
- The five failures each name their requirement, and the search failure is the defect itself (`Array []` where `[1]` was expected)
- Scope confirmed by `git status`: exactly the two intended files

**What T-01 does NOT have:** an independent audit of clause coverage, additivity, determinism, or fixture fidelity. **That is exactly what a Reviewer exists to provide, and it is missing.**

---

## ✅ T-01 — PASS (reviewer attempt 4)

| | |
| --- | --- |
| **Status** | **PASS** — `tasks.md` T-01 → `done` |
| **Date** | 2026-08-18 |
| **Implementer** | agy `gemini-3.7-flash-medium`, `ctx_8156fc4b42b6` — **1 attempt, no rework** |
| **Reviewer** | agy `claude-sonnet-4-6`, `ctx_fd4fba05c5f5` — **attempt 4 of 4** |
| **Full report** | `evidence/t01-review.md` (224 lines, seven axes) |
| **Requirements** | R-BPF-001, R-BPF-002, R-BPF-006, NFR-BPF-001, NFR-BPF-003 |

**What finally made the reviewer work — the fix was in the brief, not the model.** Attempts 1–3 all froze at the same phase: after ingesting the material, at the moment of emitting one long verdict. Attempt 4 was told to **append each axis to a report file as it finished it** and then send a three-sentence `worker_done` pointing at the file. Seven small writes instead of one large emission. It completed all seven axes.

Second-order benefit that decided the outcome: **the verdict became durable independent of the message.** `STATUS: PASS` was on disk in `evidence/t01-review.md` before any `worker_done` arrived — so the K-009 failure mode (a verdict that exists but never lands) stopped being able to lose the work.

**Verdict — `STATUS: PASS`:**

> All 13 T-01 clauses are satisfied across R-BPF-001, R-BPF-002 and R-BPF-006. The diff is additive (NFR-BPF-001), adds no upstream call (NFR-BPF-003), touches exactly the two specified files, sorts a copy with a total-order comparator, and uses fixtures pinned to measured evidence spellings (KZ-001). Five of five RED failures are genuine regression gates that went green with the fix.

**Checks worth naming:**

| Axis | Finding |
| --- | --- |
| 1 — clause coverage | All 13. The hard one — *"absent-name items sort by `short_name` in the same sequence, not clustered"* — is satisfied by keying on `full_name \|\| short_name`, so `B-A1080` sorts as `b-a1080` between `fertilize…` and `wto-…` rather than at an end |
| 5 — fixture fidelity | The 255-char fixture is `'WTO-Phase 1: MusaSentinel - ' + 'X'.repeat(255 - 28)`. The reviewer counted the prefix character by character to confirm 28, making the length **provable from the source text** rather than asserted |
| 7 — determinism | Sorts `[...filtered]` (no mutation); total order via `full_name` → `short_name` → `id`; `null` and `undefined` both fall through the `\|\|` chain |

**ADVISORY 1 (non-gating) — three new tests passed in RED, so they never served as gates:**

| Test | Why it was already green |
| --- | --- |
| `does NOT match on description` | `description` was never in the old predicate |
| `tolerates absent full_name without throwing` | the old predicate never accessed `full_name` |
| `produces stable and deterministic order` | an unsorted list is trivially stable across two calls |

**This advisory corrected a false statement the Leader had written into this log** — that all 9 pre-fix passers were pre-existing T-04 tests. Only 5 were. Corrected above. The fix itself is unaffected: the five genuine red gates cover R-BPF-001, R-BPF-002 and R-BPF-006, and each went green.

**ADVISORY 2 (non-gating) — `localeCompare` without an explicit locale.** Deterministic for the ASCII fixture strings, but could order non-ASCII names differently across Node versions or OS locales.

Leader note: **this is more pointed than the reviewer could know.** The live-feed measurement behind this spec contains exactly such names — e.g. `FRANCE – FFEM Promover Oportunidades Sostenibles en la Cadena…`, carrying an en-dash and Spanish accents. So the condition is not hypothetical for this dataset.

It is still **not** in scope for T-01: no requirement mandates a locale, and per the Advisory-Never-Becomes-A-Task rule an advisory is recorded and dies there — it may not mint a task or widen one. If it is to be fixed it needs a proposal, where it gets a requirement, a design decision and a budget line like any other work.

**Verification (Leader-run, in isolation):** RED `5 failed, 9 passed, 14 total` → GREEN `14 passed, 14 total`.

---

## ⏸ T-03 — reworked after a FAIL, re-review BLOCKED on quota

| | |
| --- | --- |
| **Status** | **`blocked`** — implementation reworked and self-verified, **re-review not obtained**. Not `done` |
| **Date** | 2026-08-18 |
| **Implementer** | agy `gemini-3.7-flash-medium`, `ctx_4b2d18d5ad2d` — **2 attempts** (1 FAIL + 1 rework) |
| **Reviewer** | agy `claude-sonnet-4-6` — attempt 1 delivered a **FAIL**; the re-review died on an agy quota limit |

### Attempt 1 — Reviewer `STATUS: FAIL`

The five-line output contract worked where the seven-axis report had not, and it caught a real defect:

> **Q1 SCOPE:** yes — diff touches only `BilateralProjectMappings.tsx`.
> **Q2 SNAPSHOT:** no — `clarisa_project_short_name` writes at `:215`/`:220` are untouched.
> **Q3 LABEL SAFETY:** no — undefined/null/empty-string/whitespace-only all fall through the `?.trim()` falsy branch and render `p.short_name` cleanly; no leak.
> **Q4 THE REMOVAL: OUT-OF-SCOPE** — T-03 says *"add the name to that label"*; it authorizes adding `full_name` **alongside** the existing `[p.id]` prefix, not removing the id; the id drop is unrequested and **silently changes visible data**.
> **STATUS: FAIL**

The Implementer had replaced `[{p.id}] {p.short_name}` with `${p.short_name} — ${p.full_name}`, **deleting** the visible id. The Leader had noticed the removal while composing the brief and deliberately passed it to the Reviewer as an adjudication question rather than ruling on it — author ≠ auditor applies to scope judgments too, not only to code.

### Attempt 2 — rework

Label is now purely additive to the original:

```jsx
[{p.id}] {p.short_name}
{p.full_name?.trim() ? ` — ${p.full_name}` : ''}
```

`[123] A1806 — WTO-Phase 1: MusaSentinel` with a name; `[123] A1806` without one. The falsy guard, the optional interface fields, the untouched snapshot writes and the single-file scope are all unchanged.

**Leader verification, re-run with nothing else active** (the first run overlapped a worker's `nest build`, so it was discarded and repeated — a measurement taken under concurrent load is not slow, it is wrong):

```
npx eslint src/admin/client/pages/BilateralProjectMappings.tsx   → clean
npm run build                                                    → ✓ built in 2.02s, 47 modules
```

### ⛔ Why T-03 is not `done`

`agy` returned **`Individual quota reached … Resets in 3h44m59s`** mid-audit. Environmental blocker, not a FAIL.

The rework has the Implementer's self-report and the Leader's isolated build/lint — but **no independent audit of the rework**. That matters more than usual here: attempt 1's defect was a *scope* violation that compiled and linted perfectly. Build-green says nothing about whether a change is authorized, which is precisely what the Reviewer caught the first time.

Per the `/akili-execute` fallback table the Leader does **not** absorb this review. Options are the user's: wait for the quota reset, route to a different transport, review the six-line diff directly, or record an explicit waiver.

**Not committed.** Same rule applied to T-01: no verdict, no checkbox, no commit.

### T-03 — closed under an explicit WAIVER (not a PASS)

**The user directed the Leader to inspect the diff and close, after the agy quota blocked the re-review.** That is the third option in the `/akili-execute` runtime-failure fallback table — *"an explicit recorded waiver"* — and it is the user's call to take. The Leader raised the independence objection twice before proceeding.

**This is recorded as `WAIVED`, never as `PASS`.** A Leader inspection of work the Leader supervised is not an independent audit, and labelling it one would corrupt the only record anyone will read later.

**The named blind spot:** the checks a Leader would run are the same list the Leader wrote into the brief. Whatever I failed to think of specifying, I also fail to check for. An independent reviewer's value is precisely the checks nobody asked for — and attempt 1 proves that is not theoretical here: its defect was a **scope** violation that compiled and linted perfectly, invisible to every automated gate.

To partially compensate, the inspection deliberately targeted items **absent from the brief**:

| Check (not in the brief) | Finding |
| --- | --- |
| Does the label change leave a sibling render inconsistent? | Line 380 still renders `{row.clarisa_project_short_name ?? '—'}` — the **mappings table remains code-or-dash**. Confirmed as the already-declared **OQ-2** gap, not a new inconsistency introduced here |
| Is `description` actually consumed? | **No — dead weight.** The only `.description` in the file (line 516) belongs to the *AGRESSO contract*, not the CLARISA project. `ClarisaProjectPickerItem.description` is declared and never read. Per-spec (the brief asked for both fields, mirroring the server projection and the STAR interface, which also declares it unused) but worth naming |
| Is the option still selectable? | `key={p.id} value={p.id}` unchanged — selection unaffected |
| **JSX whitespace across the line break** | Resolved by reading the sibling. The AGRESSO picker at 514-517 needs an explicit `{' '}` because its JSX *text* ends in `—` and the newline strips the trailing space. The CLARISA label needs no `{' '}` because its space lives **inside the template literal** (` — ${…}`), which is expression content, not JSX text. Renders `[123] A1806 — Name`, single space. Two different idioms for the same job in one file — minor consistency advisory |

**Diff verified as purely additive:** three lines. `full_name?` + `description?` on the interface; one appended conditional on the label. The `[{p.id}]` prefix is restored, so the change adds the name beside the id rather than replacing it — which is exactly what attempt 1's FAIL demanded.

**Leader verification, re-measured with nothing else running:** `npx eslint` clean · `npm run build` ✓ 47 modules, 2.02s.

**Residual, unchanged and NOT covered by this waiver:** the rendering itself. This page has **zero tests**; build-green proves compilation only. Whether the label reads correctly, and whether a 255-character name overflows the `<select>`, is **T-04's** job and remains open. The waiver covers the code read, not the pixels.

**Status:** T-03 → `done (waived)`.

---

## 🔄 Pivot Record: R-BPF-004 — the label design rests on a feed measurement that is no longer true

**Raised by the user from the running UI, 2026-08-18, after T-01…T-03 landed.** Screenshot shows every option rendering its name twice:

```
BMGF-Adaptation Atlas: Refinement and Transition — BMGF-Adaptation Atlas: Refinement and Transition
CANADA-MEDA-The Adaptation and Valorization … _ AVENIR — CANADA-MEDA-The Adaptation and Valorization … _ AVENIR
```

### What changed underneath the spec

Both CLARISA hosts re-measured at the moment of the report:

| | Earlier this session | **Now** |
| --- | --- | --- |
| Upstream rows (test) | 1365 | **299** |
| Bilateral + Alliance | 367 | **25** |
| **phase 2026** | **342** | **0** |
| `short_name == full_name` | 25 of 367 | **25 of 25 — 100%** |
| `external_code` populated | yes | **0 of 25** |

**CLARISA test now returns exactly what production returns.** The 342 phase-2026 rows the whole spec was measured against are gone.

### Why the implementation is not at fault

`R-BPF-004` specified two cases and the implementation, both reviewers and the T-03 waiver all handled them correctly:

- `full_name` present → `<short_name> — <full_name>`
- `full_name` absent/blank → `<short_name>`

**It never specified the case `full_name === short_name`,** because at the time it was written that case was 0 of 342 in the phase-filtered feed. It is now 25 of 25. The code does exactly what the requirement says; **the requirement is what is wrong.**

This is the KZ-001 family seen at the requirements tier rather than the fixture tier: a design pinned to a measurement, and the measurement moved.

### Second, larger finding — flagged, not in scope here

**`phase 2026` is now 0 rows on both hosts.** The archived Alliance-selector bugfix defaults the picker's phase to `2026` via `app_config`. Any environment applying that default now gets an **empty picker**. The user's screenshot shows 25 options, so their environment is not applying it — worth establishing why, because the two facts cannot both be intended.

### The design problem, stated honestly

The user's ask is *"código del proyecto y el título"* — the same shape the AGRESSO picker beside it already achieves (`S284 — CICERO (RCN) - System adaptation…`).

**CLARISA currently has no code to show.** `external_code` — the field S1 identified as the real project code and the key S2's auto-mapper joins on — is null on all 25 rows and is blocked on PRMS. `short_name` is not a code here; it is the title. The only stable identifier present is the numeric `id`.

### Options (user decision required — nothing implemented)

| | Option | Result today | Result once PRMS restores codes |
| --- | --- | --- | --- |
| **A** | **De-duplicate**: if `full_name` equals `short_name` (normalised), render it once | `Fertilize Right Colombia` | `A1806 — Fertilize Right Colombia` |
| **B** | **A + id prefix**, matching the admin panel's existing idiom | `[4] Fertilize Right Colombia` | `[4] A1806 — Fertilize Right Colombia` |
| **C** | **Prefer `external_code` as the code**, falling back to `short_name`, plus de-dupe | `Fertilize Right Colombia` | `B-A1080 — Fertilize Right Colombia` |

**Leader recommendation: A + C together, B optional.** De-duplication is required under every option and is the actual defect. Preferring `external_code` is what makes the label a *code + title* the day PRMS lands, without a second change — and it aligns the picker with the field S2 will key on. The `id` prefix is a product call: it guarantees an identifier today at the cost of showing an internal number to users.

**Status:** spec amendment pending user approval. No code changed.

---

## ✅ T-05 — PASS (1 rework)

| | |
| --- | --- |
| **Implementer** | agy `gemini-3.7-flash-medium`, `ctx_e7b26d5f4b6e` — **1 attempt, no rework** |
| **Files** | `clarisa-projects.controller.ts` (+8/−4), spec (+67/−1) |
| **Requirements** | R-BPF-001 (amended), R-BPF-002 (amended), NFR-BPF-001, DD-9 |

**K-004 evidence — Leader-captured with the safe primitive, not taken on the Implementer's word:**

| Run | Controller | Result |
| --- | --- | --- |
| **RED** | reverted to `HEAD` (i.e. post-T-01), new spec kept | **`Tests: 3 failed, 14 passed, 17 total`** |
| **GREEN** | fix applied | **`Tests: 17 passed, 17 total`** |

The three failures, each naming its requirement:
- `returns trimmed picker shape with additive fields including full_name, description, and external_code (R-BPF-001, NFR-BPF-001)`
- `matches by external_code case-insensitively when short_name does not contain needle (R-BPF-002 mandatory red gate input / DD-9)`
- `matches uppercase external_code term case-insensitively`

**Improvement over T-01 worth recording: all three new tests failed in RED.** T-01 shipped three new tests that passed on `HEAD` and therefore never served as gates — the Reviewer caught that and it became an advisory. T-05 has no such tests. The pattern held because the brief named the exact failing input in advance (`external_code: 'B-A1080'` searched as `b-a1080`), which makes a non-falsifiable test obvious while it is being written rather than after.

**Full server suite, re-measured in isolation with nothing else running:**

```
Test Suites: 326 passed, 326 total
Tests:       2261 passed, 2261 total
Time:        147 s
```

**This retroactively settles the T-01 concurrency question.** T-01 began chasing failures in `excel-workbook.builder.spec.ts` while T-02's client jest ran concurrently; the Leader told it over the dispatch channel to treat them as artifacts and verify its own scope only. The full suite is green — **the coordinator's call was right, and the failures were the concurrency artifact root `CLAUDE.md` §4.3 describes.**

### Reviewer attempt 1 — `STATUS: FAIL`, and it was right

Reviewer: agy `gemini-3.1-pro-high`, `ctx_7413d9e81166`.

> **Q4 EVIDENCE INTEGRITY:** yes — a NEW test PASSED in the RED run: *"tolerates absent or null `external_code` without throwing and matches `short_name` or `full_name` (R-BPF-002)"*. **STATUS: FAIL**

Everything else passed: scope, additivity, the predicate with optional chaining, no new upstream call, sort comparator untouched.

**The defect:** that test passed against the unmodified controller because the old predicate never touched `external_code` at all, so an absent `external_code` could never throw. It proved the *old* code was safe, not that the new optional-chaining is — the exact weak-red pattern T-01 shipped three of.

### Leader adjudication — the FAIL was upheld, not downgraded

T-01's reviewer classified the identical defect class as a **non-gating advisory** and the task passed. Two arguments for doing the same here, and why neither won:

1. *"The fix is correct anyway."* True, and irrelevant. Downgrading a FAIL because the remediation is inconvenient is precisely what erodes a gate until it stops catching anything.
2. *"Precedent within this spec treats it as advisory."* Also true — but T-05's brief **named this exact pattern in advance**, citing T-01's three tests by name. The Implementer was on notice and produced one anyway.

`requirements.md` §6 D-6 already defines the remedy: a test that passes on `HEAD` is **disqualified as evidence**. The correction cost one assertion. Reworked rather than waived.

**Recorded inconsistency, for the Kaizen pass:** the same defect class drew an *advisory* in T-01 and a *FAIL* in T-05, from two different reviewers. Both readings are defensible under the current wording — which means **the wording is what needs fixing**, not either reviewer.

### Rework — evidence re-captured independently by the Leader

| Run | Result |
| --- | --- |
| **RED** (controller at `HEAD`, reworked spec) | **`Tests: 4 failed, 13 passed, 17 total`** — up from 3 |
| **GREEN** | **`Tests: 17 passed, 17 total`** · `npx eslint` clean |

The fourth failure is the previously-passing test, now genuinely red:
`tolerates absent or null external_code without throwing and matches short_name or full_name (R-BPF-002)`

The Implementer strengthened the assertion rather than deleting the test — the fixture now carries one project with a null `external_code` and one with a populated `external_code` matching the term, asserting **both** that nothing throws **and** that the populated row is returned. Against the old predicate that returns `[]`.

### Reviewer attempt 2 — `STATUS: PASS`

> Q1 previously-passing test now among the RED failures — **yes**
> Q2 all four `external_code` tests now genuine gates, none passing on `HEAD` — **yes**
> Q3 anything changed beyond that one test — **no**

**⚠ Independence caveat, recorded rather than buried:** `claude-sonnet-4-6` hit its agy quota (`Resets in 2h54m`) mid-dispatch, so this review ran on **`gemini-3.1-pro-high`** against a `gemini-3.7-flash-medium` Implementer. `author ≠ auditor` holds — different model — but **same family, so the independence is weaker** than the cross-family separation T-01 and T-02 got. Noted so nobody later reads this PASS as equivalent to theirs.

Raw output: `evidence/t05-RED.txt`, `evidence/t05-GREEN.txt`.

---

## ✅ T-06 — PASS

| | |
| --- | --- |
| **Implementer** | agy `gemini-3.7-flash-high`, `ctx_c0957ef9d82d` — **1 attempt, no rework** |
| **Files** | interface (+1), `component.ts` (+8/−1), `component.html` (+1/−1), spec (+141/−5) |
| **Requirements** | R-BPF-003 (amended), R-BPF-004 (amended — both new scenarios) |

**The label rule as shipped:**

```
code  = external_code?.trim() || short_name?.trim() || ''
title = full_name?.trim() || ''
!title            -> code
!code             -> title
code === title    -> title        (case-folded — THE FIX)
else              -> `${code} — ${title}`
```

**K-004 evidence — Leader-captured independently, not taken on the Implementer's word:**

| Run | Result |
| --- | --- |
| **RED** (production files at `HEAD`, new spec kept) | **`Tests: 7 failed, 70 passed, 77 total`** |
| **GREEN** | **`Tests: 77 passed, 77 total`** · `npm run lint -- --quiet` → *All files pass linting* |

**All seven failures are new tests — none passed on `HEAD`.** This is the third task in a row where the brief named the exact failing input in advance, and the first client task with zero weak-red tests. The failing set:

- `returns the title once when short_name equals full_name (R-BPF-004 de-duplication)` ← **the user's reported defect, reproduced as a unit assertion**
- `de-duplicates case-insensitively and ignores surrounding whitespace`
- `de-duplicates when external_code equals full_name`
- `prefers external_code over short_name as the code`
- `falls back to short_name when external_code is whitespace-only or empty`
- `renders external_code alone when full_name is absent or empty`
- `survives client-side filtering when searching by full_name, short_name, and external_code (R-BPF-003 / D-2)`

**Full client suite, run in isolation — and an honest finding:**

```
Test Suites: 1 failed, 307 passed, 308 total
Tests:       3 failed, 6390 passed, 6393 total
```

The three failures are in `ToPromiseService` (`getEnv` / `getBlob` — which API URL is selected from `isAuth`). **They are PRE-EXISTING, not caused by T-06.** Verified by stashing every T-06 change and re-running that suite alone: the same three fail on a clean tree. Almost certainly local environment configuration — the reporter had `.env` and `environment.ts` open when they filed the picker defect.

Recorded rather than left as an unexplained *"3 failed"*, and **out of scope for this spec** — it belongs to whoever owns the client environment config. Reporting a green suite here without this note would have been the lie; blaming T-06 for it would have been the other one.

**DD-4 spot-check by the Leader** (composing the review brief, not a verdict): `optionLabel="short_name"` is still present on the CLARISA picker, and the AGRESSO picker's own `filterBy="agreement_id,description"` is undisturbed.

Raw output: `evidence/t06-RED.txt`, `evidence/t06-GREEN.txt`.

### T-06 Reviewer verdict — `STATUS: PASS`

Reviewer: agy `gemini-3.1-pro-high`, `ctx_19b6bb89c702`. Clean on all six axes:

> **Q1 DD-10** de-duplication — yes, `clarisaOptionLabel` uses `code.toLowerCase() === title.toLowerCase()`
> **Q2 DD-9** code source — yes, `external_code` falls back to `short_name` if absent or whitespace-only
> **Q3 DD-4 (the trap)** — yes, `optionLabel="short_name"` is still present
> **Q4 DD-5** coupling — yes, `filterBy` exactly matches the server predicate, AGRESSO untouched, coupling comment remains
> **Q5** evidence integrity — yes, all seven tests failed on `HEAD`; **zero new tests passed on `HEAD`**
> **Q6** scope + no leak — yes, only 4 client files; no input renders `undefined`/`null`/dangling separators

**⚠ Same independence caveat as T-05:** `claude-sonnet-4-6` hit its agy quota again (`Resets in 2h23m`), so this ran on `gemini-3.1-pro-high` against a `gemini-3.7-flash-high` Implementer. Different model, **same family — weaker independence** than the cross-family separation T-01 and T-02 received. Recorded so nobody later reads this PASS as equivalent.

**Q5 is the one worth dwelling on.** T-01 shipped three tests that passed on `HEAD`, T-05 shipped one, and both became findings. T-06 shipped **zero**. The variable was not the model — it was the brief, which named the exact failing inputs in advance (`{ short_name: 'Fertilize Right Colombia', full_name: 'Fertilize Right Colombia' }` renders twice today). Naming the red before the test is written makes a non-falsifiable assertion obvious while it is being authored rather than after a reviewer finds it.

---

## ⏸ T-07 — implementation complete, review NOT obtained

| | |
| --- | --- |
| **Status** | **`blocked`** — code written and self-verified, **no reviewer verdict**. Not `done`, not committed |
| **Implementer** | agy `gemini-3.7-flash-medium`, `ctx_26e689d22f0f` — 1 attempt |
| **Reviewer** | agy `gemini-3.1-pro-high`, `ctx_d638dd15cc18` — **non-delivery**. Read the diff, grepped the STAR reference for parity, read `tasks.md`, then stopped producing. No verdict, no escalation |

**What was written** (12 lines, one file):

```ts
function clarisaOptionLabel(p: ClarisaProjectPickerItem): string {
  const code  = p.external_code?.trim() || p.short_name?.trim() || '';
  const title = p.full_name?.trim() || '';
  if (!title) return code;
  if (!code)  return title;
  if (code.toLowerCase() === title.toLowerCase()) return title;
  return `${code} — ${title}`;
}
```
rendered as `[{p.id}] {clarisaOptionLabel(p)}`.

**Leader verification, run in isolation** — `npx eslint` clean · `npm run build` ✓ 744 ms.

**Leader spot-checks** (composing the brief, *not* a verdict): the helper is logically identical to the STAR client's reviewed `clarisaOptionLabel`; the `[{p.id}]` prefix is retained — the thing an earlier reviewer FAILed this same file for removing; and `git diff` confirms the `clarisa_project_short_name` snapshot writes are untouched.

**Why it is still not `done`:** none of that is an audit. T-03 on this same file proved the point — its defect was a **scope** violation that compiled and linted perfectly, and only an independent reviewer caught it. Build-green cannot substitute for a verdict, and the `/akili-execute` fallback table forbids the Leader absorbing a Reviewer role regardless of runtime failure.

**Reviewer transport, tallied across this run:** 11 reviewer dispatches, **5 non-deliveries**, all stalling at the same phase — after ingesting the material, at the moment of emitting the verdict. Two mitigations worked and are worth keeping: an **incremental report file** (T-01 attempt 4) and a **hard N-short-lines output contract** (T-03, T-05, T-06). Both reduce the size of any single emission. Neither is reliable enough to depend on without a fallback.

**Options for the user:** re-dispatch once `claude-sonnet-4-6`'s quota returns (it delivered cleanly for T-02), review the 12-line diff directly, or record an explicit waiver as T-03 did.

### ⚠ Correction — T-07's code WAS committed, contrary to the note above and to its own commit message

`b233e340` states *"Code stays uncommitted"* and the Leader staged only `docs/specs/bugfix/bilateral-picker-fields`. **The commit nevertheless contains `BilateralProjectMappings.tsx` (+12/−2), and it is pushed.**

`git log -S "function clarisaOptionLabel"` puts the helper's introduction in `b233e340`. `.husky/pre-commit` is empty, so no hook swept it in, and the mechanism was **not determined** — recorded as unknown rather than guessed at.

**What this does and does not change:**

- It does **not** confer a verdict. T-07 stays **`blocked`**: written, self-verified, **not independently audited**. A commit is not a review, and the rule that produced this record — no verdict, no `[x]` — is unaffected by where the bytes happen to live.
- It does mean the branch now carries one unreviewed change. It is 12 lines, in an admin page with no tests, whose logic the Leader spot-checked as identical to the reviewed STAR helper — but *"the Leader checked it"* is precisely the claim T-03 proved insufficient on this same file.
- Reverting was considered and rejected: the code is correct as far as it has been verified, this is a feature branch, and a revert-then-recommit cycle would add churn without adding the audit that is actually missing. **The gap is the review, not the commit.**

Recorded here because a spec whose audit trail says *"uncommitted"* while the code sits in `origin` is exactly the kind of quiet falsehood this log exists to prevent.

### ✅ T-07 — PASS (second review attempt; the first was void)

**Reviewer attempt 1 returned `STATUS: FAIL` — and the FAIL was invalid.** Its Q1 read *"admin uses a ternary instead of four branches and returns code instead of title on case-insensitive match."*

That describes the **T-03** version of the label (`{p.full_name?.trim() ? … : ''}` — a ternary), not T-07's. The reviewer had audited stale code.

**Cause: two compounding Leader errors, not a reviewer defect.**

1. **The artifact was empty.** `t07.diff` was **0 bytes**. It was generated and handed to the reviewer without ever being checked. With nothing in the diff, the reviewer fell back to whatever it could read and described the pre-T-07 state.
2. **The reviewer was declared stalled while it was still working.** T-07 was parked as a "fifth non-delivery" on that basis. It then delivered. The earlier tally of reviewer non-deliveries is inflated by this one and the parking note was written on a false premise.

**The correction, and the rule that came out of it:** the artifact was regenerated from `git show b233e340 -- <path>` and **validated before dispatch** — `test -s` plus a `grep` for the symbol under audit. An empty or stale artifact does not produce a null review; it produces a **confident review of the wrong thing**, which is far worse than no review, because it arrives wearing a verdict.

**Reviewer attempt 2 — `STATUS: PASS`,** with both files read directly rather than trusting the diff:

> Q1 parity with the reviewed STAR helper — **yes** · Q2 `[{p.id}]` prefix retained — **yes** · Q3 snapshot writes unmodified — **yes** · Q4 scope + optional interface field — **yes** · Q5 any `undefined`/`null`/dangling-separator leak — **no**

**Independence caveat, same as T-05 and T-06:** ran on `gemini-3.1-pro-high` against a `gemini-3.7-flash-medium` Implementer — different model, same family, weaker than the cross-family separation T-01 and T-02 received.

**Verification (Leader, in isolation):** `npx eslint` clean · `npm run build` ✓ 744 ms. Rendering remains T-04's job — this page has no tests and the spec declares that gap.
