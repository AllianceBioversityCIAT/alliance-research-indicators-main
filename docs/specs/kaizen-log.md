# Kaizen Log

Continuous-improvement record across AKILI-SPECS specs. Newest entry first.

> **Two ID series, both live.** `K-00n` and `KZ-00n` were assigned independently on parallel branches before they met here. They are **not** renumbered: every citation already in the guides, specs and commit messages resolves as written, and renumbering would silently break that trail to buy nothing. New lessons continue whichever series their spec line already uses.

---

## Active Lessons

> **Pruned 2026-08-18** at the `bilateral/clarisa-phase-config-variable` archive, as the previous
> note instructed. Eight institutionalized/applied lessons were **retired** (their rule now lives in
> a guide or template and remains in force): `K-001`, `K-002`, `K-006`, `K-009` **(un-retired 2026-08-19 — see the note below; the retirement itself was correct at the time)**, `K-010`, `KZ-004`,
> `KZ-005`, `KZ-006`. Methodology lessons awaiting upstream moved to their own list below, since they
> bind the AKILI repo rather than this project. The digest is back to the **10-row cap**.

| ID | Lesson | Severity | Recurrence | Target | Status |
| --- | --- | --- | --- | --- | --- |
| **K-005** | Config values the code uses as **discriminators** (branch selectors), not just destinations, must never be collapsed onto one value "to simplify" | **High** | 2 (same edit) | Product | Proposed |
| **KZ-001** | A test double **or a cohort assertion** that doesn't evaluate what it stands in for produces a green suite over broken behavior. Verify the gate still *discriminates*, not just that it passes | **High** | **6** (+1: widening a predicate made a fidelity cohort 198-of-198, so the count would also pass against a predicate returning `true` unconditionally) | Product | Proposed |
| **KZ-002** | Enumerating scope by feature folder misses shared components rendered on the same route. Enumerate by *what renders*, not by *where the feature lives* | **High** | 3 | Product | Proposed |
| **KZ-007** | A **correction record** is the highest-risk artifact class in a spec, not bookkeeping. It reads as settled fact, is rarely re-verified, and propagates. Verify a correction against its source before writing it | **High** | **2** (+1: a Leader correction record was itself corrected before reaching this log) | Product | Proposed |
| **KZ-008** | A derived map labelled "verified" will be trusted while wrong. Record **what was executed** to verify each row, or do not call it verified | **High** | 1 | Product | Proposed |
| **K-019** | **A refactor declared behaviour-preserving needs an explicit old-vs-new comparison over a fixed input set as its pass condition.** The existing suite was written for the old behaviour's *known* inputs and is structurally blind to a change in what the code **accepts** — it reports green while the acceptance set moves | Medium | 1 | Product + Methodology | **Applied** — `general-setup/task.md` §5 (+ upstream owed) |
| **K-020** | **A targeted client `jest` run trips the project-wide coverage floors and exits `1` with every test passing.** Under red-before/green-after that makes "green after" unreachable. Use `--coverage=false` on targeted runs | Medium | 1 | Product | **Applied** — `client/.../src/CLAUDE.md` |
| **KZ-012** | **The `numeric ⟺ STAR` invariant is assumed in three layers and validated in none**, and `platform_code` is `nullable: true` — a NULL renders bare-numeric and is classified STAR. Answer with `SELECT platform_code, COUNT(*) FROM result GROUP BY platform_code;` | Medium | 1 | Product | **Open — carries OQ-1 out of `archive/`** |
| **K-018** | **The authoritative site list for an expectation-realignment task is the failing suite, not a grep.** Grep enumerates *mentions*; only the run enumerates *breakages*. A grep-built list names already-green sites, misses genuinely red ones, and can skip a whole file — all three happened in one spec | Medium | 1 | Product + Methodology | **Applied** — `general-setup/task.md` §5 (+ upstream owed) |
| **KZ-011** | **A multi-clause table cell can be retired in half.** When one clause is retired on new evidence, its siblings inherit the retirement silently and the worker is blamed for the omission. One clause per row | Medium | 1 | Product + Methodology | **Applied** — `general-setup/task.md` §3 (+ upstream owed) |

### Queued for upstream (Methodology — no local edit owed)

| ID | Lesson |
| --- | --- |
| **K-003** | Correction-closure sweeps must grep the **literal superseded string**, then re-grep to confirm. *(Same family as K-014 — collapse when either is next revised.)* |
| **K-004** | A gate must be proven able to FAIL before it is trusted; a falsifier authored from the design's own frame tends to name a mutation the design already excludes |
| **K-008** | Writing a coverage table does not make it exhaustive — the same pass authored the requirements and the table |
| **K-011** | An empty or stale artifact does not produce a null review; it produces a confident review of the wrong thing |
| **K-012** | Name the concrete failing input in the brief — K-004 alone does not make a Bug-Mode test falsifiable |
| **K-013** | A requirement derived from a live measurement needs the date and the invalidating condition |
| **K-016** | An NFR that accepts user-visible latency without a paired requirement for how the UI signals it creates a trap: the user cannot distinguish "not yet" from "broken". **Local Product edit APPLIED 2026-08-19 (root `CLAUDE.md` §4.3) after a second occurrence — the template upstream is still owed, and the recurrence is the argument for it.** |

> **Retired 2026-08-18 (institutionalized and still in force):** `K-001`, `K-002`, `K-006`,
> `K-010` (guides), `KZ-004`, `KZ-005`, `KZ-006` (templates). They no longer need a digest slot.
>
> **Retired 2026-08-19 (third sweep, to admit K-019, K-020 and KZ-012):** `K-016` (applied to
> root `CLAUDE.md` §4.3; no TTL-cached config touched this cycle, rule stands) · `K-009` (applied to
> `.agents/reviewer.md`; **both workers delivered on every one of the four dispatches this session**,
> rule held) · `KZ-010` (held — the verification command was pre-flighted before the fix existed and
> the pre-flight is what found K-020; its client-specific form now lives in the child guide).
>
> **Retired 2026-08-19 (second sweep, to admit K-018 and KZ-011):** `K-014` (applied to root
> `CLAUDE.md` §4.3 and **observed holding this run** — totals checked before counting, no
> truncated discovery search) · `K-017` (applied to `general-setup/requirements.md` §4; this
> cycle produced no runtime artifact needing packaging, rule stands).
>
> **Retired 2026-08-19** to hold the 10-row cap while admitting K-016, K-017 and the returning K-009:
> `K-015` (applied to root `CLAUDE.md` §4.3; no migrations in this cycle, rule stands) · `KZ-003`
> (applied — §4.3 now carries the narrowed full-suite/parallelism rule, followed throughout this run) ·
> `KZ-009` (its discipline now lives in `docs/specs/general-setup/task.md`'s mandatory *"what disqualifies
> this evidence"* clause, exercised on every task this cycle).
>
> **`K-009` was un-retired the same day.** Its rule was institutionalized and *held* — three non-deliveries
> were all correctly recorded as runtime failures — but the cycle produced a **mechanism** (a verdict
> emitted as plain text instead of via `SendMessage`) and a **structural finding** (the reviewer wrapper has
> no `Write`, so the known mitigation cannot apply to it). Institutionalizing a rule retires the *rule*,
> not the *failure mode*.

---

## Entries

### 2026-08-19 — bugfix/pool-funding-source-gate

**Metrics**

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 | tasks.md |
| Reviewer FAIL rework attempts | **1** (T-01) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | `/akili-test` not run (accepted) |
| Validation FAIL / WARN | — | `/akili-validate` not run (accepted) |
| Advisories recorded | 5 | execution.md |
| Budget: LOC | **≈ 90 budgeted → 238 actual** | design.md §14 |
| Budget: review rounds | **1 → 2** | design.md §14 |

**MUDA identified:** one rework round, caused by a refactor stepping outside "refactor only". The LOC
overrun is **not** waste — production landed on budget (~51 vs ~37) and the excess is test code, most
of it the coverage the FAIL correctly demanded.

**Lessons**

- **K-019 — The safety net could not see the property that moved.** (Product + Methodology, Medium)
  - Root cause: the DD-4 interceptor refactor was authorised to move the *derivation* into a shared
    util; it also replaced the URL matcher, widening its acceptance set (`/result/FOO-123` null→STAR,
    `/result/tip-123` null→TIP, case-sensitivity lost). Its designated safety net,
    `result.interceptor.spec.ts`, enumerates `PLATFORM_CODES` and is therefore **structurally
    incapable** of exercising an unrecognized or differently-cased prefix — 29/29 green certified
    nothing about the two cases that changed.
  - Evidence: execution.md — T-01 attempt 1, Reviewer FAIL; design.md §14 predicted this leak by
    name ("most likely the interceptor refactor growing").
  - The fix that worked, and why it is the lesson: the Leader made an **old-vs-new comparison over
    nine URLs at zero divergences** the pass condition. It paid twice — the remediation's own first
    draft skipped STAR in the prefix loop and introduced a *new* divergence on `/result/STAR-31288`,
    which no unit suite would have surfaced.
  - Standardization: one line in `docs/specs/general-setup/task.md` §5.
    → **Applied 2026-08-19 (user-approved)**. Upstream to AKILI owed.

- **K-020 — The verification command lies about its own result.** (Product, Medium)
  - Root cause: the client's coverage floors are **project-wide**, so a targeted single-file run
    trips them and exits `1` with every test passing. Measured before any fix existed:
    `npx jest …/bilateral.service.spec.ts --silent` → exit 1 on 63/63 green; with `--coverage=false`
    → exit 0. Under Bug Mode's red-before/green-after protocol this makes "green after" unreachable,
    and an agent reading the exit code would report a healthy suite as red.
  - Evidence: execution.md — Leader pre-flight. The child guide documented the floors but not this
    consequence.
  - Standardization: one line in `client/research-indicators/src/CLAUDE.md`.
    → **Applied 2026-08-19 (user-approved)**.

- **KZ-012 — An invariant three layers depend on, and none validates.** (Product, Medium, **OPEN**)
  - `numeric ⟺ STAR` is assumed by `result.interceptor.ts`, by the new `platform-code.util.ts`, and
    by the server's digits-only `RESULT_CODE` route. Nothing checks it. The database stores
    `result_official_code` as a **number** and `platform_code` as a separate `varchar(50)` that is
    **`nullable: true`** — the prefix is composed for display, never stored. A row with NULL or empty
    `platform_code` therefore renders bare-numeric and is classified STAR.
  - Evidence: `result.entity.ts:177-182`; archived spec `requirements.md` §8 OQ-1.
  - **Recorded here deliberately so it survives the archive.** It was that spec's OQ-1, merge-blocking
    for production, and burying it in `archive/` is how an open question stops being asked.
  - Answer it with: `SELECT platform_code, COUNT(*) FROM result GROUP BY platform_code;` — any NULL
    or `''` with a non-zero count falsifies the invariant.
  - Bounded: if false, behaviour for such a result equals today's, so the archived fix does not
    worsen it. No local edit proposed — this is an open finding, not a rule.

**Jidoka held.** The Reviewer stopped the line on a change with **nil user impact** — the server maps
absent / `'STAR'` / unknown all to STAR — and explicitly offered a recorded waiver. The Leader upheld
the FAIL instead: an unauthorised, untested behaviour change in an interceptor on every HTTP request,
where the next code shape added to the router would inherit a classification nobody chose.

**The Step 2.3 reversion challenge earned its keep before any code existed.** It found that
`BilateralService` is root-scoped, `currentAlignment` has no reset on navigation, and the failing 404
was *load-bearing* — both the bug and the only thing clearing stale state. A guard that merely skipped
would have passed AC.1 and AC.2, shipped, and shown the pool-funding tab on a TIP result.


### 2026-08-19 — bugfix/w3-bilateral-funding-filter

**Metrics**

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | **2** (T-01 x1, T-02 x1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | `/akili-test` not run (accepted) |
| Validation FAIL / WARN | — | `/akili-validate` not run (accepted) |
| Advisories recorded | 8 (4 per task) | execution.md |
| Budget: review rounds | **1 budgeted → 4 actual** | design.md §14 |

**MUDA identified:** 2 rework rounds — 100% of this run's defects — and a 300% overrun on the
review-round budget. **Neither FAIL was an implementation error.** Both were *stale prose around
correct assertions*, and both trace to an inaccurate site list in `tasks.md`, i.e. to planning
waste, not execution waste.

**Lessons**

- **K-018 — The site list was built by grep instead of by running the suite.** (Product + Methodology, Medium)
  - Root cause: T-02's site table was assembled by grepping for the *value* being changed
    (`Window 3`) across the spec files. Grep enumerates *mentions*; only the run enumerates
    *breakages*. The list was wrong in three directions at once: 3 of 6 named sites were already
    green (their `window3Project` fixtures were never Alliance-affiliated, so `isAllianceProject`
    excluded them regardless of funding), 1 genuinely-red site was never named, and a second
    affected file was missed entirely. The measurement that would have produced the correct list
    — apply the one-line change, run the suite, read the failures — was available and free at
    specify time.
  - Evidence: execution.md — T-02 attempt 1, "Two corrections to the spec's blast-radius
    analysis"; tasks.md — Site-list correction (Leader decision L-1).
  - Gemba note, from the Reviewer: *"a keyword sweep verifies presence of the keyword, not
    absence of the defect."*
  - Standardization: one line in `docs/specs/general-setup/task.md` §5, beside the K-012
    named-input rule. → **Applied 2026-08-19 (user-approved)**. Upstream to AKILI owed.

- **KZ-011 — A multi-clause table cell was retired in half.** (Product + Methodology, Medium)
  - Root cause: `tasks.md` T-02 bundled two independently-justified clauses in one cell — an id
    change and a title re-statement. The Leader retired the first on new evidence; the
    Implementer reasonably read the whole row as retired. The second clause stood on its own
    reasoning (the *predicate* is no longer `=== "Bilateral"`, true regardless of fixture shape).
  - Evidence: execution.md — T-02, Leader decision L-4; Reviewer FAIL citing `tasks.md:105`,
    "second clause of that row".
  - Standardization: one line in `docs/specs/general-setup/task.md` §3.
    → **Applied 2026-08-19 (user-approved)**. Upstream to AKILI owed.

- **KZ-001 — recurrence 5 → 6.** No new lesson opened; the root cause is already in the digest.
  - This occurrence: widening the predicate made the stub fidelity gate's eligible cohort
    **198 of 198** fixture rows, so `expect(eligible).toHaveLength(198)` would *also* pass against
    an `isBilateralFunding` that returned `true` unconditionally. Nothing went red — the gate
    simply stopped discriminating. Defect class D-2 (over-widening) now has **no guard at the
    fidelity layer**; it rests entirely on the `SRV`/blank/`NON-BILATERAL` negatives in
    `project-selector.util.spec.ts`, which are now load-bearing for the whole spec.
  - Evidence: execution.md — T-02, ADVISORY (RISK). Digest row broadened to name cohort
    assertions, not only test doubles.

**Jidoka held.** The Reviewer stopped the line on both FAILs rather than waving through prose that
contradicted the assertions beneath it, and the 3-attempt ceiling was never approached. Two
worker behaviors worth preserving: the Implementer **refused to edit three tests the work order
named**, having verified in isolation that they were already correct; and a flaky unrelated suite
timeout was **re-run in isolation and confirmed unrelated rather than chased**.


### 2026-08-19 — `bilateral/clarisa-fixture-stub`

**Metrics.** 8 tasks (7 `[x]`, **1 `[~]` — T-08 waived by the user**) · **4 Reviewer FAILs / 4 rework
attempts** (T-04, T-05, T-06, T-07 — each PASSed on attempt 2) · **0 HALTs · 0 Pivots · 0 FATAL_FAILs** ·
**3 runtime incidents** (K-009 non-delivery ×3; **2 quota deaths** mid-task) · **7 Leader errors recorded
(LE-1…LE-7)** · 5 advisory blocks · **4 spec amendments during execution** (D-8, DD-9, DD-10, DD-11) ·
budget **~800 → ~3,000 LOC (3.7×)** after one re-baseline · final suite **329 / 2,351 green**, e2e **7/7
self-terminating** (from a killed 18m40s hang) · no `test-report.md` / `validation-report.md` (absence
accepted at archive).

**The headline is not the passes.** Three of the four FAILs were defects that had **passed every automated
check available to them**. `author ≠ auditor` caught the **Leader** twice, which is the position the
Delegation Ceiling names as unguarded.

**K-016 — SECOND OCCURRENCE, and the first filing's disposition is the root cause.** The picker showed
*"No results found"* while the phase selector simultaneously showed `2026 (170)`. Nothing was broken: the
`MappingPhaseResolver` had cached `targetPhase=2025` at ~12:39:29, the user saved `2026` at 12:40:23, and
the 5-minute TTL served the stale value until ~12:44:29 — 170 projects appeared at 12:45:25. The `phases`
endpoint stayed correct throughout because it deliberately omits `matchesPhase` (enumerating phases from a
phase-filtered cohort would be circular), so **one endpoint said 170, the other said 0, and both were
right**. *Root cause of the recurrence: the first filing was classified **Methodology-only, no local edit
owed**, so nothing in the product changed and it caught the next person, on the next spec in the same
family, within 24 hours.* A lesson with no local edit is a lesson that will fire again. *Evidence:
`archive/2026-08-19-bilateral--clarisa-fixture-stub/execution.md` → T-08, K-016 timeline table.*
**Severity High · target reclassified Methodology → Product.**

**K-017 — A runtime artifact that must exist in the build output needs its own packaging defect class.**
T-05 shipped a router resolving its fixture as `join(__dirname, 'fixtures', …)`. The app runs from `dist`;
`nest-cli.json`'s single `assets` entry covered only `reports/`; `tsc` emits only *imported* JSON; the
Dockerfile production stage copies `dist` and **no `src`**. With the flag on it would have returned ENOENT
→ JSON 500 → `BadRequestException` — *reading as a CLARISA outage*, the exact misdirection R-2 existed to
prevent. **All 20 of its tests passed**, because both jest configs run ts-jest over `src`, where
`__dirname` resolves into the source tree. *Root cause: the spec's own defect-class table (DC-1…DC-11)
enumerated visual and staleness blind spots but never a **packaging** one, so no gate existed for the
class — and the harness could not have evaluated it.* Fixed by DD-10 with a gate proven red-then-green
(`npm run build && ls dist/…`). *Evidence: same `execution.md` → T-05 attempt 1 FAIL, Issue 1.*
**Severity High · Product + Methodology.**

**K-009 — un-retired at recurrence 6, because the mechanism is finally named.** Three non-deliveries in
one spec: `rev-T01-2` (idle, no verdict), `impl-T06-mount` (idle twice), `rev-T06-mount` (idle, no
verdict). The rule from the previous cycle held — every one was recorded as a runtime failure, never read
as a clean result — but one worker **diagnosed its own cause**: *"my earlier output went to plain text
instead of SendMessage."* That converts K-009 from "workers forget to report" into a specific, addressable
failure. Compounded structurally: the `akili-reviewer` wrapper grants `Read, Grep, Glob` and **no
`Write`**, so the mitigation the log credits as working — a durable incremental report file — is
**unavailable to the role most prone to the failure**, and two of the three losses were Reviewers.
Empirically, putting *"your verdict must be sent with SendMessage; that send is the deliverable"* at the
**top** of the brief worked: every subsequent Reviewer delivered unpoked. *Evidence: same `execution.md` →
RI-1, RI-3, LE-1, LE-5.* **Severity High · Product.**

**Also worth recording (not lessons).**
- **The third consecutive test-volume budget miss** — the standing "Watch" from two cycles ago now has its
  third occurrence and by its own rule promotes to a lesson. Deliberately **not** taken as a fourth lesson
  slot (cap is 3); carried forward. Note the cause **split** this cycle: T-01 was 4.8× on *implementation*
  because the spec's rigor mandates — K-014 guards, K-004 falsifier seams, disqualifier logic — are
  themselves code that a "what does this task do" estimate never prices.
- **The removal condition was written as *presence* when it needed *completeness*.** It reads *"when
  CLARISA publishes `external_code` and phase-2026 data"* — satisfied within 24 h (0/299 → 78/377) — yet
  live CLARISA yields **50** eligible against the stub's **170**, with `has_science_programs` **0/50**. A
  literal reading would delete a stub still carrying 120 projects. **A Leader authoring error**, recorded
  in the archive summary rather than smoothed over.
- **K-013 fired inside 24 hours** and was *detectable only because* the dates and invalidating conditions
  were recorded. The discipline paid for itself on its first outing.
- **A falsifier fitted to the net.** T-04 attempt 1's mutation introduced its "extra divergence" through
  the single invariant its net already checked — a new facet of K-004 on a **test**-shaped net rather than
  a design-shaped one. Attempt 2 re-pointed it at a field no D-row covers.

### 2026-08-18 — `bilateral/clarisa-phase-config-variable`

**Metrics.** 4 tasks (1 dropped by pivot) · 2 Reviewer FAIL rework attempts (T-04 ×2) · 0 HALTs · 0 FATAL_FAILs · **1 Pivot** · 10 advisories · budget **exceeded +90% LOC** (~720 vs ~380) · no `test-report.md` / `validation-report.md` (absence explicitly accepted at archive).

**K-014 — A filtered view of a command's output is not the output.** Three instances in one spec, one of which cost the whole spec its premise. During `/akili-propose`, a prior-art search ran `grep -rln "app_config" src/db/migrations/ | tail -6` against **nine** matches; the silent cap dropped exactly the migration that already implemented this spec's intent, and every downstream artifact inherited the false premise until an Implementer's blast-radius check caught it. Twice more the same day: `grep '^\[ \]'` over `migration:show` read "zero pending" because the output carries ANSI escapes before the bracket — nearly reporting an unapplied migration as applied — and a `grep -i error` matched a migration *name* and condemned clean output as unreliable. *Root cause: reading a filter's output as ground truth without confirming the filter could see what it was looking for.* Same family as K-003, different facet: K-003 is searching for the wrong string; this is a **lossy view that looks complete**. *Evidence: `execution.md` → Pivot Record: T-01, "Root cause of the specification error".* **Severity High · Product + Methodology · Applied to root `CLAUDE.md` §4.3.**

**K-015 — CI/CD deploys code but does not apply migrations, and the constitution said otherwise.** Root `CLAUDE.md` claimed *"Remote releases are 100% automated via CI/CD pipelines"*. Migration `8431dc4b` (2026-08-14) sat merged in `origin/dev` **and** `origin/staging` for four days across several deploys without being applied. Measured rather than inferred: a baseline before deploy `d9b402e6` and a post-measurement after it showed **zero delta** (306 applied / 1 pending, unchanged). It had to be applied manually, under explicit user authorization, against the shared Dev database. *Root cause: the constitution declared a deployment guarantee the pipeline does not implement for migrations, so one can go unapplied indefinitely with nothing surfacing it.* **Severity High · Product · Applied to root `CLAUDE.md` §4.3.** Follow-up owed with DevOps: is this by design, who triggers it, and are other environments carrying unapplied migrations?

**K-016 — An NFR that accepts user-visible latency without requiring a UI signal creates a trap.** `NFR-CPC-001` accepted the resolver's 5-minute TTL. The first real user saved `2025`, tested immediately, saw nothing, changed the value again — restarting the TTL — and reported *"no devuelve nada en ninguna phase"*. Nothing was broken; the UI simply gave no way to distinguish "not yet" from "not working", and re-trying made it permanent. *Root cause: latency NFRs are written as system tolerances, and the requirements template never prompts for the user-visible consequence.* *Evidence: `execution.md` → T-03 HITL, the TTL advisory.* **Severity Medium · Methodology — no local edit; upstream to the AKILI requirements template.**

**Also worth recording (not lessons).** The mandated **reversion challenge** earned its keep: it found that removing the free-text field would block pre-setting a year CLARISA has not yet published, producing `DD-3` (an editable select) — a design change no review stage would otherwise have surfaced. And **advisory R2 was checked at the HITL pause and did not materialise**, which is the outcome an acknowledged blind spot is supposed to have.

---


### 2026-08-18 — `bugfix/bilateral-picker-fields`

**Metrics.** 7 tasks · 12 reviewer dispatches · **4 reviewer non-deliveries** · 3 Reviewer FAILs (2 valid + 1 void) · 2 Implementer reworks · **1 Pivot** · 0 HALTs · 0 PRODUCT_BUGs · budget 4 tasks/~280 LOC → actual 7 tasks/~615 LOC (the Pivot accounts for the delta) · 4 recorded Leader errors.

**K-011 — An empty or stale artifact does not produce a null review; it produces a confident review of the wrong thing.** `t07.diff` was handed to a reviewer at **0 bytes**. The reviewer did not report "nothing to audit" — it returned `STATUS: FAIL` describing a ternary and three branches, which was the *previous* task's code. A missing artifact fails **silently and with a verdict attached**, which is strictly worse than no review, because a FAIL is acted on. Compounded by a second error: that same reviewer had earlier been declared *stalled* and its task parked, while it was still working and later delivered. *Evidence: `archive/2026-08-18-bugfix--bilateral-picker-fields/execution.md` → "T-07 — PASS (second review attempt; the first was void)".* **Severity High · Target Methodology.**

**K-012 — Naming the concrete failing input in the brief is what makes a Bug-Mode test falsifiable; K-004 alone does not.** Three tasks on the same spec, same methodology, same K-004 citation: T-01 shipped **3** new tests that passed on `HEAD`, T-05 shipped **1**, T-06 shipped **0**. The variable was not the model or the effort — T-06's brief stated the input verbatim (`{ short_name: 'Fertilize Right Colombia', full_name: 'Fertilize Right Colombia' }` renders twice today). K-004 asks for red-before-green *after* the test exists; naming the input makes a non-falsifiable assertion obvious *while it is being written*. Corollary observed: the identical defect class drew an **advisory** from T-01's reviewer and a **FAIL** from T-05's — both defensible under the current wording, so the wording is what needs fixing. *Evidence: same `execution.md`, T-01/T-05/T-06 entries.* **Severity High · Target Methodology.**

**K-013 — A requirement derived from a live measurement needs the measurement's date and the condition that invalidates it.** R-BPF-004 specified two label cases and omitted `full_name == short_name` because that case was **0 of 342** when the spec was written. Mid-implementation the CLARISA feed reset and it became **25 of 25**; the shipped label rendered every project name twice and the user found it in the running UI. The spec recorded the measurement but not its volatility, so nothing prompted a re-check before the requirement was implemented. *Evidence: same `execution.md` → "Pivot Record: R-BPF-004".* **Severity High · Target Methodology.**

**K-009 recurrence (4 → 5).** Reviewer non-delivery recurred four times, always at the same phase — after ingesting the material, at the moment of emitting the verdict. **Two mitigations worked and are now known:** an *incremental report file* (which also makes the verdict durable independent of the message — T-01's `STATUS: PASS` was on disk before any `worker_done` arrived) and a *hard N-short-lines output contract*. Neither is reliable enough to use without a fallback.

**Standardization applied (user-approved).**
- Root `CLAUDE.md` §4.3 — the cross-package-parallelism claim **narrowed**: safe for editing, **not** for two concurrent full-suite runs. Two workers running `npm test` in different packages reproduced the 2026-08-14 phantom-failure artifact and cost a worker an hour.
- Root `CLAUDE.md` Model Routing — recorded that **agy quota is per-model, not per-account**, and that `author ≠ auditor` degrades to same-family separation when the Claude tier exhausts.
- `docs/specs/general-setup/task.md` §5 — Bug-Mode tasks must name the concrete input that makes the gate red (K-012).
- `.agents/leader.md` — validate any artifact before dispatch (K-011).

---

### 2026-08-14 — `bugfix/bilateral-alliance-selector`

**Outcome:** 6 of 6 tasks delivered, **zero Reviewer FAIL verdicts**, one rework (an unused import). The bilateral picker went from returning **1** eligible project in CLARISA production to **25**, verified by running the shipped predicates against the live feed. Orchestrated through Orca with `agy`/gemini-3.7-flash as Implementer and `agy`/claude-opus-4-6-thinking as Reviewer — `author ≠ auditor` across both model and provider.

#### Measure

| Signal | Value |
| --- | --- |
| Orca dispatches | 8 (all delivered) |
| Reviewer FAIL verdicts | **0** |
| Rework attempts | 1 (lint: unused import) |
| HALTs / Pivots / FATAL_FAILs | **0** |
| Severe judgment-day findings on the design | **6** (2 would have broken build or boot) |
| Budget miss | **4.4× on test volume**; implementation estimate accurate |
| Delegation transport failures | **3** (Claude subagents idled without delivering) |
| Leader errors caught and recorded | 3 |

#### Learn

**K-009 — A delegated worker that does not deliver is not a worker that found nothing.** Three Claude subagents (two judgment-day judges, one Reviewer) were spawned, ran, went idle, and never delivered a report; a direct message did not wake one of them. The same brief on another transport returned **6 severe defects** on the same target. Counting the silence as a clean verdict would have discarded every one of them, invisibly. *Evidence: `execution.md` → Runtime incident; `judgment.md` → Judge independence.* **Target: Product + Methodology. Severity: High.**

**K-010 — Bug-Mode red-before-green evidence belongs to the task that changes the buggy code path.** The decomposition assigned it to T-01, which *creates a new util* — whose tests are green from the moment it compiles and could never have been red. The Implementer then reported having observed the red, and the claim was false: `grep` showed its suite never referenced the service. Moving the criterion to T-03 produced the real observation (1 → 25). *Evidence: `execution.md` → T-01 scope correction.* **Target: Methodology. Severity: Medium.**

**K-004 (+1, now 6 occurrences) — new facet: a falsifier authored from the same frame as the design tends to name a mutation the design already excludes.** `design.md` §11 cited K-004 — *a gate must be proven able to fail* — and in the same table wrote "swap `startsWith` for `includes` ⇒ Window-3 rows appear". No Window-3 value contains the substring `BILATERAL`, so that mutation leaves the suite green. Both judges caught it independently. **Citing a lesson is not applying it.** *Evidence: `judgment.md` → F-6.* **Target: Methodology. Severity: High.**

#### Watch (not yet a lesson)

**Budget missed in the same direction for the second consecutive spec.** Implementation was estimated at 195 LOC and came in at 232; tests were estimated at 255 and came in at 1117 — **4.4×**. Root cause is structural: a requirement for *exhaustive fixtures* (eleven measured funding spellings × both Alliance encodings × phase states, with asserted counts) multiplies test volume in a way a per-task LOC guess does not anticipate. A third occurrence promotes this to a lesson.

#### Standardize

| Lesson | Edit | Status |
| --- | --- | --- |
| K-009 | Root `CLAUDE.md` §4.3 — new bullet: a non-delivering worker is a runtime failure, never a clean result | **Applied** (user-approved) |
| K-010 | `docs/specs/general-setup/task.md` §5 — where the Bug-Mode regression test belongs | **Applied** (user-approved) |
| K-004 | No local edit (Methodology) — upstream to the AKILI repo | Proposed |
| *(factual sweep)* | Root `CLAUDE.md` Model Routing — `agy --effort` accepts only `low\|medium\|high`; exact Claude slug; `worker-start --agent gemini` disabled on this install | **Applied** (user-approved) |

#### Leader errors recorded rather than smoothed over

1. `--effort xhigh` passed to agy for two tasks; agy accepts only up to `high`. The stated effort was never applied.
2. A coverage run measured **concurrently** with two other jobs produced 3 phantom failures in an untouched module — the same §4.3 concurrency rule the Leader enforced on every worker in the run. Re-measured in isolation: 2251/2251 green.
3. A T-06 criterion expected 380 from the test feed; 342 is correct, because 380 is the coverage slice while the picker also excludes Window-3 per OQ-A.

---

### 2026-08-14 — `bilateral/clarisa-project-automapping` (S1)

**Outcome:** 6 of 7 tasks delivered with independent Reviewer PASS; T-06 HALTed after 6 attempts. 2173 tests passing. The D8 reading — the stage's actual deliverable — was taken against DEV over VPN. Orchestrated through Orca with `agy`/gemini-3.7-flash-high as Implementer and Claude Opus as Reviewer, giving an `author ≠ auditor` split that crosses **providers**, not just tiers.

#### Measure

| Signal | Value |
| --- | --- |
| Orca dispatches | 18 |
| Task-attempts failing first pass | **7 of 11** |
| Reviewer FAIL verdicts | 4 |
| HALTs | 1 (T-06) · Pivots 0 · PRODUCT_BUGs 0 |
| Budget tripwire | **1 — fired, escalated, user ruled the estimate wrong** (~680 → ~3000 LOC) |
| Judgment-day severe findings | 5 (all applied) |
| Leader errors recorded | 3 |

#### Learn

**K-004 → recurrence 5, with its sharpest form yet.** T-04's availability guard was written *correctly* against the full feed. No reviewer reading the code would have objected. But every fixture set `all === slice`, so mutating the guard to the slice left **all 11 tests green** — the gate protecting this spec's headline behavior (R-CPA-005) could not fail for the reason it existed. The distinction worth institutionalizing: "was this gate ever seen red?" is weaker than **"can any input in this suite make it red?"** The finding came from mutation, not from reading.

**K-007 — the fixer/gate conflation (NEW, and self-inflicted).** The Leader's briefs banned all measurement commands to honor the concurrency rule, sweeping `prettier --write` in with `npm test`. But a formatter *produces a file*; it measures nothing and cannot contaminate parallel evidence. The result: workers were denied the tool that fixes formatting and then rejected for unfixed formatting — **three of this run's failures**. K-001's real content is *fixing and verifying must be separate acts*, and it was applied one notch too broadly.

**K-008 — a coverage table is not self-exhaustive (NEW).** `tasks.md` §3 carried a clause-level table written specifically so that no requirement clause could ship unowned. It still missed R-CPA-005's `description` sentence, which reached the working tree uncovered until T-04's Reviewer flagged it as a cross-task carry-forward. Root cause: the same authoring pass produced the requirements *and* the table, so nothing independent verified that every clause appeared in it.

#### Standardize

| Lesson | Action |
| --- | --- |
| K-007 | **Applied** — root `CLAUDE.md` §4.3 now states *worker may fix, Leader verifies, no single command may do both* |
| K-004 | Upstream to AKILI (Methodology) — recurrence raised to 5 |
| K-008 | Upstream to AKILI (Methodology) — no local edit |
| — | **Factual sweep applied:** three registry claims in root `CLAUDE.md` were false. `agy` **is** installed (the line said it was not, which would have ruled the host out unexamined); `glm-5.2` exists (registry said 5.1); OpenCode is installed but blocked by **account balance**, not configuration |

**A false correction avoided.** The CodeGraph line was suspected stale too — `.codegraph/` holds only `config.json`. It was **tested rather than corrected**: `codegraph_explore` resolved 48 symbols including the service created that same day, with blast radius. The claim is accurate. Correcting it would have introduced the very defect this sweep exists to remove.

#### Record — what the run proved about the method

The three most valuable findings all came from review asking *"what would make this red?"* rather than from any test: a decorative gate, an unauthorized third query parameter published by Swagger, and a documented DTO field the endpoint could never return. All three were **contract- or evidence-level defects sitting on top of correct code** — precisely the class a passing suite cannot surface.



### 2026-08-13 — post-archive findings, `bilateral/primary-contributing-sp`

Two defects found in local verification **after** the spec was archived. Both were reachable from the archived spec's own stated gaps; neither was caught by any gate.

**K-006 — an artifact no gate executes is an artifact nobody has verified.** Migration `1784500000000` (from C1, `toc-optional-mapping`) shipped with `[SPEC:bilateral/…]` inside a **SQL comment**. `orm.config.ts:59` sets `extra.namedPlaceholders: true`, so mysql2 rewrites queries through `named-placeholders`, which skips quoted strings but has **no notion of SQL comments** — the colon is consumed as a bind parameter and, with no params argument, the call throws before MySQL parses it. The migration was **unrunnable from the day it was written** and passed every gate the repo has: valid TypeScript, lint-clean, type-clean, reviewed, committed. The merge to `dev` would have failed in CI/CD. It surfaced only when the migration was finally executed.

*Root cause:* every gate in the repo inspects migrations as **text**; none executes one. The one property that matters — does it run — was unmeasured.
*Evidence:* two `migration:dev:execute` failures, 2026-08-13; `named-placeholders/index.js:6`.

**The corollary, learned the expensive way.** A static scanner was written to substitute for the missing dynamic gate, and it was wrong **three times**: it first assumed quoted strings were the hazard (they are the safe place); then it reimplemented the tokenizer and missed that a bare **`?`** binds too — passing the very migration that then failed for real, *after* being "verified able to fail" against a fixture built from the same wrong model; then, corrected to call the real tokenizer, it flagged **230** hazards in migrations proven to run, because it never inspected whether the call site passes a params array (`1781879906673-AddNewEnvCl.ts` uses `?` legitimately). Withdrawn.

*Lesson:* a K-004 failure demo only proves the gate catches **what its author already modeled**. When a gate's correctness depends on reimplementing a dependency's parser *and* its call-site contract, the honest gate is to run the thing. **K-004 recurrence → 4.**
*Standardized:* server `CLAUDE.md` §7 — the rule, plus the statement that running migrations is its only sound gate.
*Target:* **Product.**

**D-6 materialized — the cross-tier gap the spec declared and left open.** `requirements.md` listed *"D-6 (cross-tier drift — partial)"* among items "uncovered by construction". R-BIL-128 AC.1 narrowed the client to one ToC block (the Primary's), but `pool_funding_alignment_validation` still demanded a ToC row for **every** active SP — so with 2+ SPs the green check was unreachable, since the UI offers no way to answer for a Contributing SP. The function is named in **none** of the spec's seven documents.

*Lesson, folded into K-003's family rather than numbered separately:* a spec that renames or re-scopes a concept must grep for that concept **outside its own tier** — here, one grep for the validating function would have found it.
*Fixed:* `1786679227000`, with a legacy fallback (no backfill per R-BIL-126). Blast radius measured against the live function over all 23 Dev alignments answered "Yes": recomputed-current reproduces `live_fn` on 23/23, proposed differs on exactly 1 — the intended flip.

---

### 2026-08-13 — `bilateral/primary-contributing-sp` (C2)

**Outcome:** 16 tasks, 7 commits, all requirements delivered. **0 HALTs.** `/akili-test` and `/akili-validate` **not run** — absence explicitly accepted at the archive gate. T-02 archived `[~]` with one item dischargeable only by a deploy.

#### Measure

| Signal | Value |
| --- | --- |
| Reviewer FAIL verdicts | **3** (T-08, T-13, T-16) |
| Rework attempts consumed | **2 of a possible 48** — T-08 ×1, T-16 ×2 |
| HALTs / FATAL_FAILs | **0** |
| Pivot Records | **2**, both user-approved, both for defects in the *approved spec* |
| Budget breaches | **2** — T-13 894 vs ~180 (4.75×); T-16 739 vs ~400. **Both escalated and accepted, neither absorbed silently** |
| Validation verdict | **not run** (accepted risk) |
| Leader errors caught by review or by the user | **6** |

**Notable:** the rework rate collapsed versus C1 (2 attempts across 16 tasks, vs C1's 6 FAILs across 10). The controls that produced that are named under *What went right*.

#### Learn

**K-004 — a gate must be proven able to FAIL before it is trusted.** This spec found that **three** mandated gates in this repo could not go red for the reason they were mandated:

| Gate | Why it could not fail |
| --- | --- |
| `npm run lint` | it is `eslint --fix` — it makes the thing it checks true (**this is K-001**) |
| `npm run build`, for spec files | `tsconfig.build.json` excludes `**/*spec.ts` — it type-checks **zero** of them |
| `npx tsc -p tsconfig.spec.json --noEmit` | two pre-existing `TS1005` **syntax** errors aborted the parse, suppressing semantic diagnostics across ~1300 files: it reported **3** errors where **945** existed |

*Root cause:* gates are adopted **by name**, and nobody runs the one experiment that would expose a hollow one — break the thing on purpose and confirm the gate goes red.
*Evidence:* `archive-summary.md` → "Three mandated gates"; T-08 and T-14 review findings. Gate 3 repaired by T-16.
*Target:* **Methodology** — K-001 is one member of this family, not the family itself. Recommend upstreaming as a rule: *a verification command may not be cited as evidence until it has been observed failing.*

**K-005 — configuration values that act as discriminators must not be collapsed.** Rewriting the client's local `environment.ts`, the Leader set `mainApiUrl`, `textMiningUrl`, `documentOverviewUrl`, `fileManagerUrl` and `saveErrorsUrl` all to `http://localhost:3000/api/` "to simplify local". The code does not treat them as destinations — it **branches on them**:

- `jwt.interceptor.ts:52` does `req.body as FormData` + `.set()` for any URL matching `textMiningUrl`. On a GET, `body` is `null` → **every API call threw before leaving the browser**. 33 console errors, zero requests reaching the server, an empty screen.
- `api.service.ts:989` POSTs every client error to `saveErrorsUrl` as its base → each error POSTed to `/api/`, 404'd, and surfaced as a toast **which then reported itself**.

*Root cause:* values read as "just URLs" were in fact branch selectors; in production they are genuinely different hosts, which is what kept the branches disjoint.
*Evidence:* `client/.../environment.ts` comments; `jwt.interceptor.ts:52`; `api.service.ts:989`.
*Target:* **Product**.

**K-003 recurrence raised to 6.** Three more confident negatives asserted without the grep that would settle them: T-08's Seam 1 premise (`user` "feeds eligibility" — the parameter is `_user`, never read), T-13's *"no migration in this repository creates `results`"* (one grep disproves it), and a T-16 comment declaring a gap open **in the same diff that closed it**. Every one caught by an independent reader, never by the author.

#### Standardize

| Lesson | Proposed minimal edit | Status |
| --- | --- | --- |
| K-004 | Root `CLAUDE.md` §4.3 — a verification command may not be cited as evidence until it has been observed **failing** | *(see Step 4.3 menu)* |
| K-005 | `client/research-indicators/src/CLAUDE.md` — record that several `environment` URLs are branch selectors, not just destinations | *(see Step 4.3 menu)* |
| K-002 | **Factual correction:** the client CLAUDE.md block is now stale on three counts — the test count (6,239 → 6,267), *"`npm run build` is the only client type gate"* (false since T-16 repaired `tsc -p tsconfig.spec.json`, baseline **945**), and *"gitignored with no committed template"* (false — `environment.example.ts` is committed) | *(see Step 4.3 menu)* |
| K-003 | No local edit — Methodology, for upstreaming | Recorded |

#### What went right, worth preserving

- **Executed sabotage replaced claimed verification, and it paid immediately.** Where a report said *"verified by inspection"*, the next Reviewer executed it — and twice the inspection had been optimistic. The decisive catch of the run came from **deleting a line and watching 108/108 stay green**: `isDirty()`'s Primary clause, whose absence makes a Primary-only edit unsaveable. It would have shipped under a fully green suite.
- **Falsifying a premise beats satisfying it.** T-13's brief was written against a `TEST` datasource that turned out to be unreachable; the pre-check caught it *before* the Implementer spawned, and the task ran against an isolated container of the **same engine version** instead.
- **The trap gate was not the obvious test.** "Second active `PRIMARY` rejected" stays green under the `CONCAT` trap; the real gate is "N active `CONTRIBUTING` accepted". Assumed gates and proven gates are different things — the same lesson as K-004, from the other end.
- **Budget breaches were escalated, not absorbed.** Both times the estimate was ruled the defective artifact, with reasoning, on the record.

---

### 2026-08-13 — `bilateral/toc-optional-mapping`

**Outcome:** 10 tasks, 13 commits, all requirements covered. `/akili-test` PASS. `/akili-validate` **FAIL** (evidence trail, not code). Not archived clean — gaps explicitly accepted.

#### Measure

| Signal | Value |
| --- | --- |
| Reviewer FAIL verdicts | 6 |
| Pivot Records | **2** — both for defects in the *approved spec*, not the implementation |
| HALTs / FATAL_FAILs | 0 |
| Rework attempts consumed | 0 of 3 on 8 tasks; 1 of 3 on T-06 and T-10 |
| Validation verdict | FAIL — 8 must-close items |
| **Budget breach** | **1,719 insertions vs ~530 estimated (3.2×)**; review rounds ≥14 vs 10. **`design.md` §9 required escalation; none was raised** |
| Leader errors caught by the panel | **3** (D8 false strike; two failed closure sweeps) |

**Notable:** the two Pivots and all three Leader errors were caught by *independent review*, not by the Leader. The review panel was the load-bearing control in this run.

#### Learn

**K-001 — `npm run lint` is `eslint --fix`, so it cannot verify.** Every "lint clean" report across ~10 tasks was an artifact: the command rewrote the working tree and exited 0, while the **committed branch failed Prettier** from T-04 onward. Undetected for the entire run; found only by independent validation feeding `HEAD` content through `eslint --stdin`.
*Root cause:* a verification gate whose action mutates the artifact it checks.
*Evidence:* `validation-report.md` F-2; remediation commit `2de57099`.
*Target:* **Product**.

**K-002 — the client tier was certified green without any type-check.** Client Jest runs `isolatedModules: true` (no type-checking) and the flat ESLint config ignores `*.spec.ts`. So **6,239 passing tests coexisted with a client build that fails `TS2345`**. The spec *recorded both facts itself* (T-07 advisory A-1; T-10's lint caveat) and stopped one inference short of the conclusion they force. `build` appears in no verification matrix.
*Root cause:* suite-green treated as compile-green; no gate distinguished them.
*Evidence:* `validation-report.md` FAIL-2.
*Target:* **Product**.

**K-003 — correction-closure sweeps failed three times in one spec.** After each Pivot the sweep reported *"every surviving instance corrected"*; each time instances survived (six after the first, three after the second, one after the third). One survivor, `execution.md:352`, **directly contradicted the corrected record 75 lines below it in the same file**.
*Root cause:* semantic/pattern greps miss the literal target — one reviewer's own filter excluded lines containing "false", which is the word inside *"returning `false`"*. Compounded by reporting closure without re-grepping.
*Evidence:* T-06 audit findings; `validation-report.md` F-1.
*Target:* **Methodology** — AKILI's *Correction Closure* rule says grep the superseded **value**; the lesson is grep the **literal string** and **re-grep to confirm**. Recommend upstreaming.

#### Standardize

| Lesson | Proposed minimal edit | Status |
| --- | --- | --- |
| K-001 | `server/researchindicators/src/CLAUDE.md` §11 — note `npm run lint` is `eslint --fix` and **cannot** verify; use `npx eslint` (no `--fix`) as the gate | **Awaiting approval** |
| K-002 | `client/research-indicators/src/CLAUDE.md` — record that tests are neither linted nor type-checked (`isolatedModules: true`, ESLint ignores `*.spec.ts`), so `npm run build` is the only client type gate | **Awaiting approval** |
| K-003 | No local edit — Methodology lesson for upstreaming to the AKILI repo | Recorded |

#### What went right, worth preserving

- **`author ≠ auditor` was the load-bearing control.** Every substantive defect — two undischargeable ACs, duplicate-coverage-as-new-proof, and all three Leader errors — was found by an independent reviewer.
- **The two structural discharges are a reusable pattern:** unchanged-artifact argument + falsifiable lapse condition + a binding prohibition on naming tests as though they proved the discharged half. Independently re-derived and upheld at validation.
- **Pivots cost zero rework attempts**, as designed. Both spec defects were caught before burning the 3-attempt ceiling.

---

### 2026-08-13 — `bugfix/oicr-lever-dropdowns`

**Outcome:** delivered, tester-validated (user-confirmed). Bug Mode red-before observation waived under explicit user mandate — repo had no `node_modules` during execution; functional tester validated afterward.

#### Measure

| Signal | Count | Source |
| --- | --- | --- |
| Tasks executed | 1 (T-01) | tasks.md |
| Reviewer FAIL / rework cycles | 0 (in-session) | n/a — informal execute | 
| HALTs / FATAL_FAILs | 0 | n/a |
| Pivot records | 0 | n/a |
| PRODUCT_BUGs | 0 | n/a |
| Judgment Day severe findings | 0 | n/a |
| Verification-gate waivers | 1 (red-before skipped — no node_modules) | tasks.md Execution Note |
| Validation FAIL / WARN | 0 / 2 (absent formal reports, user-validated) | archive-summary.md W-1/W-2 |

#### Lessons

- **KZ-004 — Bug Mode ran without the stack's verification prerequisites installed.** (Product + Methodology, Medium)
  - Root cause: the worktree had no `node_modules` when `/akili-execute` ran, so the mandatory Bug-Mode red-before observation and the full-suite green-after gate could not be run. The fix was applied blind under explicit user mandate; the red-before evidence is non-recoverable post-fix.
  - Evidence: `tasks.md` Execution Note (waiver under user mandate 2026-08-13); `archive-summary.md` W-1.
  - Standardization (Product): add one line to `AGENTS.md` Working Conventions — *"Before any verification gate (`npm test` / `npm run lint`), confirm `node_modules` is installed in the target package; a worktree without deps forces a Bug-Mode red-before/green-after waiver."* → **Deferred (Medium severity, no High — apply on next spec or on user approval).**
  - Standardization (Methodology): propose upstream that `/akili-execute` (and `/akili-specify`'s testing strategy) pre-flight-check the verification command's prerequisites and surface the gap **before** the fix lands, so the red observation is never skipped post-hoc. → **Recorded for upstreaming to the AKILI methodology repository.**

### 2026-07-28 — `results-center/external-results-readonly-view`

**Outcome:** delivered, validated PASS (0 FAIL, 4 WARN). 16 of 17 tasks done; T-11's browser-only ACs remain open on an environment blocker.

#### Measure

| Signal | Count |
| --- | --- |
| Reviewer FAIL / rework cycles | 8 |
| HALTs (3-attempt ceiling reached) | 1 (T-04, recovered on a 4th attempt) |
| Pivot records | 0 |
| Judgment Day SEVERE findings (pre-code) | 3 |
| Scope gaps discovered mid-execution | 2 (T-10 → R-RC-013, T-11 → R-RC-014) |
| Requirements added after approval | 3 (R-RC-012, R-RC-013, R-RC-014) |
| `PRODUCT_BUG` findings | 0 |
| Validation | PASS / 0 FAIL / 4 WARN |
| Regression introduced and repaired within the spec | 1 (T-05 → T-16, 219 tests) |

Not a clean run. Notably, **all three requirements added after approval came from evidence produced by the process itself** — a design review, a verification task, and a failed sweep — not from changing minds.

#### Learn

**KZ-001 — Test doubles that don't render what they stand in for. (High, recurrence 4, Product)**

Four distinct instances in one spec:
- `execution.md` → T-03: `isEditableStatus` is a `computed()`; under plain `jest.fn()` mocks it has no signal dependencies, so it caches after the first read. A loop reading it 15 times on one instance made **14 of 15 assertions vacuous**. Caught only by mutation testing.
- `execution.md` → T-14: the AC.4 tests asserted on `routerMock.navigate`, but the component never injects `Router` and `RouterLink` navigates via `navigateByUrl` — absent from the mock. No test in the file called `detectChanges()`.
- `execution.md` → T-15: `StubSelectComponent` had `template: ''`, so projected `#rows` content never instantiated. A gap survived **two** rework rounds behind it.
- `test-report.md` → §2 gap 3: the **entire** `results-center-table` suite runs under `overrideComponent({ template: '' })`; no test exercised the real `[routerLink]`.

*Root cause:* the fidelity of the test double to the real component was never itself checked. In each case the assertion was reasonable; the substrate it ran on could not express the behavior under test.

**KZ-002 — Feature-scoped enumeration misses the shared shell. (High, recurrence 3, Product)**

- `execution.md` → `## T-11 Result: FAILED`: the spec enumerated 12 tabs + `result-sidebar` + `form-header` and missed `section-header`, `submission-history-item`, and the shared `oicr-form-fields` — 5 ungated controls, including **Delete Result available to any admin on a federated record**.
- Within T-15 the enumeration then grew 4 → 6 → 8 controls plus a projected icon across three attempts.
- `execution.md` → `## Scope Gap: T-10`: `my-latest-results` was fenced out on a technically-true but irrelevant basis.

*Root cause:* scope was drawn by directory (`pages/result/pages/*`), while the user-visible surface is drawn by route — `platform.component.html` renders a shared header above every page, and shared `custom-fields/*` components render inside every tab.

**KZ-003 — Shared-component changes need a full-suite run. (Medium, recurrence 1, Product)**

`execution.md` → `## T-16`: T-05 added a `cache.isExternalResult()` call to `FormHeaderComponent`, which all 12 tabs render. That batch was verified with 7 targeted suites and reported green; **219 tests across 5 suites** were broken and went unnoticed until a later full run.

*Root cause:* verification scope was set by the brief's file list rather than by the changed component's blast radius. Compounding factor worth recording: that batch was also the one whose adversarial Reviewers were lost to a session limit, so Leader verification confirmed *the brief had been followed* — it could not surface that the brief itself was too narrow.

#### Standardize

Three minimal edits proposed; **pending user approval** (see the archive report's approval menu). No edit outside this log has been applied.

| Lesson | Proposed edit | Home |
| --- | --- | --- |
| KZ-001 | Add to *Tests inside `src/`*: "When a spec stubs a child component, assert the stub renders/evaluates what the real one does (projected content, host bindings) — or use the real component. A stub with `template: ''` cannot prove anything about projected controls." | `client/research-indicators/src/CLAUDE.md` |
| KZ-002 | Add to the requirements template's scope guidance: "Enumerate the affected surface by *what renders on the route*, not by the feature folder — include the shared shell and shared field components." | `docs/specs/general-setup/requirements.md` |
| KZ-003 | Add to *Tests inside `src/`*: "If a change touches a component rendered by many screens, run the full suite before reporting — targeted suites cannot see the blast radius." | `client/research-indicators/src/CLAUDE.md` |

**Methodology observation (no local edit; candidate for upstreaming to AKILI):** when the adversarial Reviewer step is lost (session limit, tooling failure), Leader self-verification is a weaker substitute in a specific and predictable way — it checks that the brief was satisfied, not whether the brief was sufficient. KZ-002 and KZ-003 both materialized in the one batch that ran without a Reviewer. A methodology-level guard ("if the Reviewer step cannot run, mark the batch and re-review before merge") would have caught both earlier.

#### What worked, and is worth keeping

- **Judgment Day before any code** paid for itself: it caught a factually wrong premise in the proposal and converted a deferred "optional" item into a blocking requirement that protected the spec's own headline feature.
- **Mutation testing as the standard of proof** for any doubted test. Every gap listed in KZ-001 was closed with a red-then-green demonstration, and reviewers were asked to reproduce them independently.
- **Asking reviewers to verify their own prior assertions** rather than carry them forward — during T-15 this caused the Reviewer to reverse an earlier remediation of its own that turned out to be wrong.
