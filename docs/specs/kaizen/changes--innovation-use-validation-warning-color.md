# Kaizen Entry — changes/innovation-use-validation-warning-color

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/innovation-use-validation-warning-color` |
| Date | 2026-09-02 |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Branch Context | **spec branch** — not the default branch, **and** no `Default Branch:` pin exists in the root guides (either condition alone defers) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | **4** (3 planned + T-04 from a Pivot) | `tasks.md` |
| Reviewer FAIL rework attempts | **0** — five rounds, five first-attempt PASSes | `execution.md` — all task entries |
| HALTs / FATAL_FAILs | **0** | `execution.md` |
| **Pivots** | **2** | `execution.md` — `## Pivot Record: T-03`, `## Pivot Record: T-02 / T-03` |
| PRODUCT_BUGs | **1 shipped into the working tree, caught pre-merge by a human gate** (`D-8`: two borders never rendered) | `execution.md` — *AC.10 — human visual check: FAILED* |
| Judgment-day severe findings | n/a — not run | — |
| Validation FAIL / WARN | n/a — `/akili-validate` not run, **absence explicitly accepted by the user** | `archive-summary.md` §6 |
| Test report | n/a — `/akili-test` not run, **absence explicitly accepted**; `author ≠ tester` recorded as an accepted gap | `archive-summary.md` §5 |
| `/akili-quick` escalation | **1** — failed the triviality gate on *new design token* + *scope* (13 sites / 4 templates + a shared stylesheet) | `proposal.md` §1 |
| **Budget tripwire** | **FIRED and escalated.** 3 tasks / ~40 LOC / 1 round → **4 tasks / +300 LOC / 1 round per task**. Accepted by the user | `execution.md` — *Budget Tripwire: fired at T-03* |
| Drift attributable to this spec | None outstanding. Two spec-internal falsifications (`DD-4`, `AR-1`/`DD-5`) corrected in-spec across 8+4 sites | `execution.md` — both Pivot Records |
| ADVISORY findings | 13 across 5 Reviewer rounds; none gated, none converted to tasks | `execution.md` — per-task `ADVISORY` tables |

**MUDA hunted:** two *planning* wastes (the Pivots — both traceable to verifications narrower than their
claims), one *defect* waste that reached the working tree (`D-8`), one *estimation* waste (the budget
priced its own acceptance criteria at zero). **Zero rework waste** — the rework loop never fired once.

**Jidoka, observed:** the human gate stopped the line. `AC.10` failed and the run halted for a Pivot
rather than proceeding on seven green automated gates.

## Lessons

- **KZ-changes--innovation-use-validation-warning-color-1 — A Tailwind utility can never colour a PrimeNG element's border; PrimeNG's CSS is unlayered and beats `@layer utilities` unconditionally.** (Product, **High**)
  - **Root cause (5W1H).** *What:* `border-[var(--ac-warning-1)]` at `actor:34`/`:52` was generated,
    correctly placed on the painting element, and **inert**. *Why:* PrimeNG injects
    `.p-select { border: 1px solid … }` (`primeng-select.mjs:28`) and `.p-inputtext` (`primeng-inputtext.mjs:17`)
    **unlayered** — `app.config.ts:29–36` calls `providePrimeNG` without `theme.options.cssLayer`, which
    defaults to `false` — while Tailwind v4 emits every utility inside `@layer utilities`, and per the CSS
    Cascade Layers spec unlayered author CSS beats layered unconditionally, regardless of specificity or
    order. *How not caught:* every gate asserted over markup strings; jsdom loads neither stylesheet and
    implements no cascade layers. *Who could see it:* only a person looking at the screen.
  - **Evidence:** `execution.md` — `## Pivot Record: T-02 / T-03` (root cause independently re-verified by
    the Leader after the scout reported it); `design.md` `DD-10` (supersedes the falsified `DD-4`);
    `requirements.md` §6 defect class `D-8`.
  - **Why it matters beyond this spec:** the pre-change `--ac-red-1` was equally inert, so **the red border
    the spec history believed in had never rendered either.** The same defect is latent anywhere in the app
    that puts a Tailwind `border-*` on a PrimeNG element.
  - **Standardization:** → **P1**

- **KZ-changes--innovation-use-validation-warning-color-2 — A spec's budget priced its own acceptance criteria at zero, because it was derived from the design decisions log instead of the task's AC list.** (Methodology, Medium)
  - **Root cause.** `design.md` §8 costed *"1 updated assertion + ~25 lines for the `DD-9` R3 role"* — it
    enumerated the **design decisions** and assumed the work equalled them. `tasks.md` T-03 then demanded
    eleven more assertions **by name** (AC.2–AC.7 plus the two-background AC.8), three of which need their
    own fixture arrangement, and every one traceable to an `AND IT MUST` / `BUT it must NOT` clause the
    coverage table assigns to that task. Both documents were written in the same `/akili-specify` pass, so
    the decision log looked complete while the AC list was where the work actually lived. T-01 and T-02 hit
    their budget lines **exactly**; the entire 5× overrun sat in the two files whose ACs were never priced.
  - **Evidence:** `execution.md` — *Budget Tripwire: fired at T-03*, line-item reconciliation table
    (expected ~37 vs actual 205 at that point); `design.md` §8; `tasks.md` §3 coverage table.
  - **Target is Methodology, not Product:** the budget rule lives in `/akili-specify` Step 2.4, and
    `docs/specs/general-setup/design.md` has **no budget section at all** (verified — its headings run §0–§14
    with no Budget). There is no local template line to edit, so this is recorded for upstreaming.
  - **Standardization:** → **P2** (upstream only, no local edit)

- **KZ-changes--innovation-use-validation-warning-color-3 — An evidence rule that names only the observer's *words* can disqualify a human check whose *attached artifact* discharges it.** (Product + Methodology — dual, Medium)
  - **Root cause.** `docs/specs/general-setup/task.md:119` requires quoting *"what the observation actually
    covered"*, and this spec's own disqualifier rejects a report that the page *"looks right"*. At `AC.8` the
    user's words were *"ahora si se ve bien"* — **literally the disqualified phrasing** — attached to a
    screenshot that answered six separate criteria, including two the observer was never asked about (a
    single vs. double outline, and the valid-state branch rendering no border at all). Applied literally the
    rule rejects the strongest evidence in the whole spec; applied loosely it lets a bare "looks right"
    through. The rule is written for a channel (a sentence) rather than for the evidence.
  - **Evidence:** `execution.md` — *AC.8 — DISCHARGED. The second frame arrived, and it proved more than it
    was asked to*; and the preceding *AC.10* section, where the same phrasing problem was first recorded.
  - **Why dual:** the fix names nothing project-specific — no stack, domain, or local convention — so the
    same gap exists in the template for every project built with AKILI.
  - **Standardization:** → **P3** (local template edit **and** upstream)

## Noted, not a lesson

- **A backward correction sweep matching a bare spec ID is ~100% false positives.** Grepping
  `AR-1`/`DD-5`/`OQ-3`/`RB-1` across `docs/` returned **82 hits, none referencing this spec** — `docs/prd.md`
  has its own `OQ-3`, `bugfix/innovation-use-draft-save` its own `DD-5`, `docs/specs/innovation-use/OPEN-ITEMS.md`
  its own `AR-1`/`RB-1`. A naive sweep could bury a real dependency or invite an edit to another spec's
  decision row. Below the lesson bar because it cost no rework this cycle — the sweep was done correctly.
  Feeds the recurrence check against `K-003`/`KZ-005`. *(Evidence: `execution.md` — `RB-5` correction closure.)*
- **An Implementer's evidence can be sound in conclusion and wrong in argument.** T-04's `K-004` falsifier
  claimed to prove per-site discrimination; it did not — the other site was inactive in that render state.
  The conclusion (the assertions do discriminate) was correct for a different reason the Reviewer had to
  supply. Not a lesson because the gate caught it exactly as designed; recorded as the concrete case
  against ever collapsing the Reviewer for efficiency. *(Evidence: `execution.md` — T-04, *The Reviewer
  corrected the Implementer's own reasoning*.)*
- **`@akili-spec` code comments cite a spec path that archiving invalidates — and the repo already carries
  stale ones.** This spec's own comments cite the *slug* (`changes/innovation-use-validation-warning-color`),
  which survives the move. But the four Innovation use templates carry pre-existing comments reading
  `@akili-spec docs/specs/innovation-use/details-page` — a **full path that has been archived** since
  2026-08-26 and now resolves to nothing. Below the lesson bar because it cost nothing this cycle and the
  predecessor spec, not this one, introduced it; recorded because it is the code-side half of `KZ-013`
  (*archiving silently breaks every document that cites the path*), which was standardized against `docs/`
  only. A convention decision is owed: `@akili-spec` should carry the **slug**, never `docs/specs/...`.
  *(Evidence: `innovation-use-actor-item.component.html:1`, `…level-stepper.component.html:1`,
  `…organization-item.component.html:1`.)*
- **`docs/specs/innovation-use/OPEN-ITEMS.md` does not know about `RB-5`.** The innovation-use surface's
  open-items register carries no row for a live, ungateable accessibility deviation on that surface. Adding
  it was outside this spec's approved scope.

## Pending Items

> **Branch Context is a spec branch, so every item below is recorded, not written.** No shared file was
> touched: no guide, template, persona, design doc, TRD, or the `## Active Lessons` digest. They await the
> apply phase on the default branch. Steps 3.2 (guide sync) and 3.4 (TRD/ADR) produced **no** items — see
> the note after P4.

### P1

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | `client/research-indicators/src/CLAUDE.md` (append to the *Colors & spacing* bullet, `:136`) |
| Edit | `- **Never colour a PrimeNG element's border with a Tailwind utility** (`border-[var(--ac-*)]`): PrimeNG injects its `.p-select`/`.p-inputtext` border rules **unlayered**, Tailwind v4 emits utilities inside `@layer utilities`, and unlayered author CSS wins unconditionally — the class is generated, correctly placed, and inert. Use an `[style]` object binding (`[style]="cond ? { border: '2px solid var(--ac-warning-1)' } : {}"`), which Angular applies as a real inline style. For a *descendant* paint node PrimeNG does not expose, use component SCSS with `::ng-deep` + `!important` (see `custom-fields/radio-button/radio-button.component.scss`).` |
| Severity | **High** |
| Rationale for this home | The bullet at `:135` already says *"wrapped PrimeNG inputs … not raw PrimeNG controls"* — this lesson sharpens an adjacent, existing rule rather than introducing a new topic. The root guide's generic token line (`CLAUDE.md:145`) stays correct as a default; the PrimeNG exception is client-specific and belongs in the child guide. |
| Status | `pending` |

### P2

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | **Methodology — upstream only.** `/akili-specify` Step 2.4 (the budget tripwire). No local target exists: `docs/specs/general-setup/design.md` has no budget section (headings §0–§14, verified). |
| Edit | Price the budget from the task file's **acceptance-criteria list**, not from the design decisions log. Each AC that demands a new assertion, fixture, or guard is a line item; an AC priced at zero is the overrun. |
| Severity | Medium |
| Status | `pending` (upstream recommendation — no local edit is owed) |

### P3

| Field | Value |
|---|---|
| Kind | `standardization` |
| Target | `docs/specs/general-setup/task.md` (append to the human-observation clause, `:119`) — **and** upstream to the same clause in the AKILI methodology repo |
| Edit | `The rule binds the **evidence**, not the channel: when an observation arrives with an artifact (a screenshot, a recording, a log), the artifact is what discharges the criterion and may be read against clauses the observer was never asked about — a disqualifying phrase like "it looks right" does not sink an attached artifact that answers the clause. State which it was.` |
| Severity | Medium |
| Status | `pending` |

### P4

| Field | Value |
|---|---|
| Kind | `digest-update` |
| Target | **`KZ-017`** (lineage `staging`) — *"A verification must declare what it CANNOT reach. A check narrower than its claim returns a confident green."* |
| Edit | Raise severity to **Critical**; add `changes/innovation-use-validation-warning-color` as a source spec; recurrence **+2**, and add this note: *"Recurred twice in one spec, the second time **inside its own correction**. `DD-4` verified that a Tailwind class would be **generated** and claimed it would **render** — the defect shipped. Correcting `DD-4`, the Leader wrote — **citing `KZ-017` by name in the same edit** — that `element.style.border` is readable in jsdom; `cssstyle@2.3.0` drops the whole shorthand for a `var()` colour, and that claim propagated to four sites including the decision text the user approved. **Naming the lesson did not prevent it.** The sharpened form: the failure is asserting a mechanism's *observability* without running the observation."* |
| Severity | **Critical** (raised from High) |
| Status | `pending` |

> **Steps 3.2 and 3.4 produced no items, and the reason is recorded so the absence is not read as an
> oversight.** *Guide sync:* `execution.md` carries no `## Constitution Impact` block and the spec created,
> moved, or reshaped **no module** — it changed 13 lines of production code inside one existing feature
> folder, so no child guide is owed and no `## Module Guides` index entry changes. *Factual-claims sweep
> (runs on any branch — the gate moves the write, not the detection):* the root `CLAUDE.md` / `AGENTS.md`
> were swept for assertions this cycle falsified and **none was found**. The nearest candidate,
> `CLAUDE.md:145` / `AGENTS.md:145` (*"token utility classes … or `var(--ac-*)` — no hex literals"*), is not
> false — it is **incomplete for PrimeNG elements**, which is a client-specific narrowing and is therefore
> carried by **P1** against the child guide rather than duplicated as a `factual-sweep` item. *TRD & ADR:*
> the two Pivots overturned **spec** decisions (`DD-4`, `DD-5`'s rationale), not a TRD architecture decision
> — `docs/trd/trd.md` holds no ADR on styling, Tailwind, or PrimeNG (`ADR-9` is the nearest and concerns
> IdPs), so no superseding ADR is owed.

## Methodology lessons for upstreaming

| Lesson | Upstream target |
|---|---|
| **KZ-…-2** | `/akili-specify` Step 2.4 — price the budget from the AC list, not the decisions log |
| **KZ-…-3** | `docs/specs/general-setup/task.md` §*A task is NOT done until* — the human-observation clause binds the evidence, not the channel (dual: the local edit is **P3**) |
| **P4's sharpened `KZ-017`** | The recurrence is itself a methodology signal: a lesson cited by name in the edit that violates it is not a discipline failure but a **mechanism** failure. AKILI may need a check that fires on *"claims a mechanism is observable"*, the way `K-004` fires on *"claims a gate can fail"*. |
