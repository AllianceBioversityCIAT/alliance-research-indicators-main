# Kaizen Entry — `bugfix/innovation-use-draft-save`

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bugfix/innovation-use-draft-save/` (archived → `docs/specs/archive/2026-09-09-bugfix--innovation-use-draft-save/`) |
| Retrospective date | 2026-09-09 |
| Run | First — no prior entry file for this spec |
| Branch Context | **Spec branch** (`AC-1679-Create-the-innovation-use-section`; no `Default Branch:` pin in either root guide, which resolves to spec branch) |
| Consequence | No shared file was written. Every standardization and sync edit is queued below under `## Pending Items` for the default-branch apply phase. |

> **ID series.** This spec's line uses the `KZ` series. `KZ-018`/`KZ-019` were chosen because they are free in **both** lineages — the log's own unreconciled `staging` ⟷ `innovation-use` collision (its warning at `kaizen-log.md:19`) already makes `KZ-002`/`KZ-007`/`KZ-008` ambiguous, and continuing the `innovation-use` count at `KZ-009` would have collided with `staging`'s retired `KZ-009`. **When citing these, no lineage qualifier is needed — they are unique across both.**

---

## Metrics

| Signal | Value |
| --- | --- |
| Tasks | 3 (T-01 server · T-02 client · T-03 docs) |
| Tasks complete with Reviewer PASS | **3 / 3** |
| Reviewer FAIL rework attempts | **3** — T-02 attempt 1; T-03 attempts 1 and 2 |
| Review rounds | **6** (T-01: 1 · T-02: 2 · T-03: 3) — exactly at the re-baselined ceiling, not beyond |
| HALT / FATAL_FAIL | **0** |
| `## Pivot Record` blocks | **0** in this spec |
| PRODUCT_BUG findings | **0** |
| Validation | **0 FAIL · 3 WARN** |
| Budget tripwire | **Fired → escalated → re-baselined by user ruling** (priority: a stable test deployment) |
| Items deferred by user ruling | **2** (`D1` dead code · `D2` dispatch-wiring test) |
| `/akili-quick` escalations into this spec | 0 |
| Code drift attributable to this spec | **0** |
| Document drift attributable to this spec | **1** — a requirements bullet the spec falsified against its own gates and corrected in place |

**Not a clean run** — three rework attempts and a fired budget tripwire. Two lessons distilled; one root cause routed to an existing digest row instead of a duplicate lesson.

---

## Lessons

### `KZ-018` — Requirements prose that prescribes a mechanism the design already delegated is a binding contradiction no AC can detect

| Field | Value |
| --- | --- |
| **Severity** | **High** |
| **Recurrence** | 1 |
| **Target** | Product + Methodology |
| **Status** | pending (spec branch) |

**Root cause.** `requirements.md` `R-IUD-003`'s Details bullet prescribed *how* to achieve one required message — *"the shared component's message must be suppressed for this field only"* — when `design.md` §3.3 had **already delegated the mechanism to the Implementer**. The requirement's job was the observable outcome (exactly one message across blank / whitespace / filled); by naming a mechanism it created a third, contradictory authority.

**What the contradiction cost.** Suppression makes deleting the page-owned block kill the blank *and* whitespace cases together — but `tasks.md` T-02's mandatory falsifying input requires **only** the whitespace case to fail, and §8 `D5` says the same. **Two binding gates contradicted the prose.**

**Why this is the lesson and not a footnote: all six ACs held.** A pure conformance audit would have shipped the wrong design with a green report. The drift surfaced only through the Reviewer's **4R risk lens**, which is advisory and non-gating — i.e. the mechanism that caught it was the one that is *allowed to be skipped*.

**Evidence.**
- `requirements.md` → `R-IUD-003` Details, the ⛔ correction block (*"That prescription is falsified by this spec's own gates … over-specified from the start"*)
- `execution.md` → *"Leader action on the Risk advisory — a spec correction, not a task"*
- `execution.md` → *"An advisory that was itself wrong — corrected, not carried"* (the same review round)

**Not a duplicate.** The retired `KZ-016` governs the opposite direction — a *design* that fails to cross-check requirements' `AND IT MUST` / `BUT it must NOT` clauses. Nothing in either lineage covers requirements over-specifying a mechanism.

---

### `KZ-019` — Proving a guard's logic is not proving the guard is reached

| Field | Value |
| --- | --- |
| **Severity** | **High** |
| **Recurrence** | 1 |
| **Target** | Product + Methodology |
| **Status** | pending (spec branch) |

**Root cause.** `R-IUD-002` AC.3 asserts two things — that `completenessValidation` **rejects** an incomplete result, and that `result_status_workflow` **row 30 dispatches it** for indicator 6. The fixture proves the first to an unusually high standard (the real method, real MySQL, no mocks for anything its body reads) and the second **not at all**: it invokes the method **directly rather than through the dispatcher**, and row 30 appears in the file only inside prose comments. `enabled: true` on row 30 is evidenced by *reading a migration*.

**Why the severity is High rather than Medium.** After this spec deleted the save-time guard, and given the filed platform finding that `completenessValidation` is `enabled: false` on `DRAFT → SUBMITTED` for **every** indicator, **row 30 is the only server-side completeness gate on this flow.** A config change or a dispatcher regression removes the last gate with every test green. An unasserted *single* point of enforcement is worse than the same gap on a redundant one.

**Relationship to `KZ-001` — deliberately recorded rather than collapsed.** `KZ-001` (Critical, recurrence 13) bans asserting a property on the **call sequence** instead of on the generated output. This is its **mirror**: the output is asserted, and the call sequence that reaches it never is. The failure modes are adjacent but the root causes differ — `KZ-001` is a *fidelity* problem in an artifact that exists; this is an *absence*. Kept separate so neither loses its rule; a future digest pass may reasonably collapse them, and this note is the argument either way.

**Evidence.**
- `test/fixtures/innovation-use/innovation-use-level-boundary.fixture-spec.ts` → `:35`, `:37`, `:41` (the header's own explanation of why the method is called directly), `:322`
- `validation-report.md` → `WARN-1`, with the two halves tabulated by evidence strength
- `docs/specs/innovation-use/OPEN-ITEMS.md` §3.1 → `D2`, *"Deferred by user ruling · ADVISORY R1 · highest-value item owed"*

---

## Noted, not a lesson

| # | Observation | Why it stops here |
| --- | --- | --- |
| 1 | The Reviewer **reversed its own attempt-1 citation** (`:167-181` → `:177-181`; the wider range included comment prose) and ruled in the Implementer's favour. Separately, `design.md` §3.1 was found factually wrong and the Implementer's contradicting comment right. | The loop working as designed. Recorded for legibility, not correction. |
| 2 | Six declared scope-excess items, **all six adjudicated FORCED** — `execution.md` records the conclusion as *"the defect is in the task text"*. | Single occurrence, already reasoned at source. Worth watching: if a second spec's scope excess is again ruled entirely forced, the root cause is task decomposition and it becomes a lesson. |
| 3 | T-03's Correction Closure ran its **forward grep before any amendment** (37 hits / 6 files, matching the pre-recorded baseline), proving the grep sound before trusting it — then the Reviewer re-swept on a **third axis it was not given**. | `K-004` and `KZ-005` observed **holding**. Positive evidence, no edit owed. |
| 4 | `npm run migration:test:bootstrap` is not idempotent: a second run against an already-bootstrapped scratch schema fails with `Table … already exists`. **The validator initially mis-read this as a baseline/migration drift defect and was wrong.** | Tooling ergonomics, not a spec defect. Recorded in `validation-report.md` `ADV-3` of the sibling spec, where the misdiagnosis happened. |
| 5 | The `- [ ] c*` criteria convention leaves every criteria checkbox unflipped while task `Status` reads `[x] done`, which makes the committed `akili-tasks-gate.sh` hook inert for them. | **Declared convention** (`execution.md:425`), consistent across both innovation-use specs. Not drift. Named so a future spec choosing a convention knows this one costs the hook. |

---

## Pending Items

All items below are queued for the **default-branch apply phase**. Nothing in this list was written by this archive run.

| # | Kind | Target | Severity | Content |
| --- | --- | --- | --- | --- |
| 1 | `standardization` | `docs/specs/general-setup/requirements.md` | High | For `KZ-018`. Add to the Details-bullet guidance: *"A Details bullet states the observable outcome, never the mechanism. If `design.md` delegates a mechanism to the Implementer, requirements MUST NOT name one — a prescribed mechanism becomes a third authority that AC conformance cannot detect contradicting the tasks' falsifiers."* |
| 2 | `standardization` | `.agents/tester.md` | High | For `KZ-019`. Append: *"When a rule's enforcement depends on configuration that selects it (a workflow row, a feature flag, a registry entry), at least one test MUST reach the rule through the real selector. Asserting the rule's own logic proves it works, not that anything invokes it."* |
| 3 | `digest-update` | `docs/specs/kaizen-log.md` → `## Active Lessons`, **`KZ-007` (`staging` lineage)** | High → raise | Recurrence **2 → 3**. New instance: T-03 attempt 2 FAILed because a `DD-14` citation **added while remediating a citation defect** named a document that does not define `DD-14` — `bugfix/.../design.md`'s table is `DD-1…DD-6`, the real `DD-14` lives in the note's own folder, and a *different, live* `DD-14` (dark-mode deferral) is cited twice by the same spec, so the pointer resolved to nothing or to the wrong decision. Evidence: `execution.md` → T-03 *"Attempt 2 — Reviewer STATUS: FAIL, one issue"*. |
| 4 | `factual-sweep` | `AGENTS.md` | **High** | `AGENTS.md` has drifted from root `CLAUDE.md` and is missing **`K-004`/`KZ-014`**, **`K-016`** and **`KZ-017`** entirely, while carrying **superseded `K-015` and `K-014`** text. Both are constitutional baseline. An agent loading `AGENTS.md` operates without three Kaizen rules — including `KZ-017`, which the sibling spec leans on in five places. **Fix:** re-sync `AGENTS.md` from `CLAUDE.md`, or state explicitly which sections intentionally differ. |
| 5 | `factual-sweep` | root `CLAUDE.md` §4.3 (`K-015`) | Medium | **Disputed claim, not a known-wrong one.** `CLAUDE.md` records *"the pipeline deploys code only — it does NOT apply database migrations (K-015, measured 2026-08-18)"*. On 2026-09-09 the owner stated the opposite: pending migrations are applied at deploy. Neither was verifiable during validation (Dev unreachable, `ETIMEDOUT`, no VPN). **This item is to settle it, not to assert a replacement** — every future spec's deployment reasoning depends on which is true, and `NFR-IUR-001`-style requirements are written against it. |
| 6 | `guide-sync` | `docs/specs/innovation-use/OPEN-ITEMS.md` | Low | Two sites go stale in meaning (not in linkage) once this spec is archived: `:63` holds `/akili-execute bugfix/innovation-use-draft-save`, a command for a spec no longer at that path; and §3.1's heading sits under *"## 3. Active specs — unfinished tasks"* while the spec is archived. **Its content — `D1` and `D2` still owed — remains accurate and findable, which is the part that matters;** only the framing needs a line. |
| 7 | `guide-sync` | `docs/specs/innovation-use/family.md` → `FR-8` | Low | The `FR-8` row describes this spec's two deferred items and stays factually true. Add that the spec is archived, with the archive path, so a reader of the manifest can reach the trail. **Not covered by Step 3 item 5's exemption** — `FR-8` is a risk/follow-up row, not a `Children`-table `Status` row, so it was deliberately left unwritten rather than edited under a borderline reading of the write constraint. |

### Not owed

| Sync item | Finding |
| --- | --- |
| `guide-sync` — child `CLAUDE.md`/`AGENTS.md` per impacted module | **None owed.** `execution.md` carries no `## Constitution Impact` block, and the diff reshaped no module and moved no public surface. |
| `trd-adr` | **None owed.** `ADR-11` (*"section completeness is computed by MySQL stored routines"*, naming `innovation_use_validation`) was **reinforced, not overturned** — this spec deleted the duplicate application-layer guard and left the stored function as the sole owner. No supersession, so no ADR number was allocated from this branch. |
| `KZ-013` backward sweep | **Run before the move: zero markdown links point into the spec folder.** Every external citation is by name in prose. No reference is broken by this archive. Items 6 and 7 are meaning drift, not linkage. |

---

## Methodology lessons for upstream

Both lessons carry a **Methodology** target and are owed to the AKILI methodology repository, independently of the local edits queued above:

- **`KZ-018`** — the requirements template should forbid a Details bullet from prescribing a mechanism the design delegates. The generalisable point is that AKILI's own gate structure (ACs) is blind to a contradiction between requirements prose and task falsifiers; only the advisory 4R lens sees it, and it is skippable.
- **`KZ-019`** — the tester persona should require one test through the real selector whenever configuration decides that a rule applies. This is the mirror of `KZ-001` and the methodology currently states only `KZ-001`'s half.
