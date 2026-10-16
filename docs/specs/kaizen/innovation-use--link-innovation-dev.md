# Kaizen Entry — innovation-use/link-innovation-dev

## Document Control

| Field | Value |
|---|---|
| Spec Path | `innovation-use/link-innovation-dev` → archived at `docs/specs/archive/2026-09-09-innovation-use--link-innovation-dev/` |
| Date | 2026-09-09 |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Branch Context | **spec branch** — default resolved as `main` via `origin/HEAD` (no `Default Branch:` pin in the root guide; both `main` and `master` exist locally, so the pin's absence was resolved by step 3, not step 4) |
| Archive Run | 1 |
| Approval Mode | pre-approved |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | **14** | `tasks.md` |
| Reviewer rounds recorded | 8 PASS / several FAIL rounds across T-01, T-02, T-05, T-09, T-10 | `execution.md` |
| **HALTs** | **2** — T-09 (attempt 3 of 3), T-10 (attempt 3 of 3, `tsc` delta +3) | `execution.md` — `## ⛔ HALT` blocks |
| FATAL_FAILs | 0 | `execution.md` |
| **Pivot Records** | **2** — T-03 (Migration B retroactively broke two committed fixtures) and T-09 (R-IUL-012's error clause) | `execution.md` — `## ⛔ Pivot Record` blocks |
| **Amendments** | **7** — and **five corrected the spec's own text, not the code** | `tasks.md` / `requirements.md` / `design.md` Document Control |
| Judgment Day findings | **16** corrections: **6 SEVERE**, 9 WARNING, 1 REJECTED | `judgment.md` |
| Falsifiers observed red | **~30** across the run | `execution.md` per task |
| PRODUCT_BUGs | no `test-report.md` — but **5 product defects** were caught in review/visual check (see below) | `execution.md` |
| Validation FAIL / WARN | — no `validation-report.md`; absence accepted by the user | `archive-summary.md` §6 |
| Drift attributable | root `CLAUDE.md`'s Antigravity model list, stale in **three** directions | T-13 |

**The 5 product defects, all reachable, none caught by a gate:** the widened `loadFailed` silent-data-loss path (T-09 attempt 3); the platform-blind anchor URL misrouting every non-STAR target (T-10 attempt 1); the card disappearing instead of re-rendering on a selection change (T-10 attempt 2); the anchor at **1.46:1** in dark theme, i.e. invisible (T-10 final review); and the missing placeholder (Amendment 07, found by the user's eye).

## Lessons

- **KZ-innovation-use--link-innovation-dev-1 — A requirement that references an "existing" mechanism the design never specifies will be implemented literally, and the implementer will be blamed for it.** (**Product + Methodology**, **High**)
  - **Root cause (5W1H).** R-IUL-012 required a four-state control but specified the error state only as *"the section's existing error surface is used"* — and `design.md` specified **no error surface at all** (a grep for *"error surface"*, *"error state"* and *"loadFailed"* across draft 2 returned **zero** matches). The only concrete referent in the codebase was the page-level `loadFailed()` gate. Three consecutive attempts failed on that one clause; the third implemented the phrase literally and thereby made a dropdown's HTTP failure unmount the whole section, turn *Save* into a silent no-op and let *Next* discard unsaved edits — violating R-IUL-003 in the same document.
  - **Why it is a text defect and not an implementer defect.** The attempt-2 Reviewer found the same blast radius and ruled it **out of bounds**: *"This is what R-IUL-012:379 literally prescribes, so it is not a violation."* The Leader then hardened that ruling into attempt 3's brief. The attempt-3 Reviewer then FAILed the work **for complying with its own instruction**. Two reviewers read the spec correctly and reached opposite verdicts, because the spec supported both readings.
  - **Evidence.** `execution.md` — `## ⛔ Pivot Record: T-09`; the `:1100` advisory; Amendment 03. The identical shape recurred twice more in the neighbouring task: T-10's href line (`/result/<code>/…` after defining `<code>` as a space-joined display string) and its leftover *"remove path … then clear"* wording for a control **DD-7 had withdrawn**.
  - **Standardization:** → **P1**

- **KZ-innovation-use--link-innovation-dev-2 — Over-declaring a verification gap is as wrong as under-declaring it, and the check is whether a guide already rules on that property class.** (Product, **Medium**)
  - **Root cause.** T-05's mandated falsifier did not fire, the Leader diagnosed *why* correctly (`overrideModule` intercepts by token identity before Nest's scanner reaches the plain-vs-`forwardRef` ordering problem), and then **generalised that one technique's blindness into "unreachable"**. It was not: `server/researchindicators/src/CLAUDE.md` §4 already prescribes reading `@Module()` metadata for exactly this class of property, with a working instance at `entities.module.spec.ts:48` whose own docstring says it *"does not boot Nest's DI container"*. Three metadata gates were later added and **all three observed red**.
  - **Cost.** Two review rounds on a **7-line** change; five of the six issues across both rounds were corrections to the Leader's prose rather than to code that never moved. A replacement gate then asserted the `imports` **array** order — non-causal, since TypeScript emits `require()` in **statement** order — and stayed green through a statement-only reorder that reversed the real order.
  - **This is the mirror of KZ-017.** That lesson says a verification must declare what it cannot reach; this one says the declaration itself needs a falsifier — *"unreachable"* is a claim, and an unchecked claim about the absence of a technique is how a project stops using a technique it already documented.
  - **Evidence.** `execution.md` — T-05 review rounds 1 and 2; Amendments 05 and 06.
  - **Standardization:** → **P2**

## Noted, not a lesson

- **T-12's human visual check produced the only defect no gate could see** (the missing placeholder — valid TypeScript, renders without error, breaks no assertion, looks correct in a diff). It was also the task most at risk of being written off as *"blocked"*. Below the lesson bar because *"do the visual check"* is already the task's whole purpose — but it feeds the recurrence check if a later spec skips one.
- **The Leader read `curl :4200 → HTTP 200` as evidence that this project's front was running.** It was a **different** project's `ng serve`, started the previous day. The port answered and the application was inferred. Same family as K-014; recorded because it was self-caught only when the user asked directly.
- **The model registry has now been wrong twice, in both directions** — a model listed that no longer existed, and one omitted that did. Related to **K-013** (a requirement derived from a live measurement needs its invalidating condition), but about a registry rather than a requirement.
- **`gemini-3.1-pro` has `-high` and `-low` but no `-medium`**, so the *"effort is baked into the slug"* pattern has a hole exactly where a T1/T3 task reaches for the middle.
- **`design.md` §5.1 cited DD-10 for manager-threading when DD-10 is about Migration B's scratch schema — and no DD covers manager-threading at all.** Corrected to DD-2. Sub-threshold alone, but it is the third wrong decision-ID citation found in this spec.

## Pending Items

> **Spec branch — nothing below was written.** Each item awaits the apply phase on `main`.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` |
| Edit | Add to the requirements-authoring rules: **"A clause that references an *existing* mechanism (`the section's existing error surface`, `the usual affordances`, `the same pattern as X`) MUST name it by file and section, or `design.md` MUST specify it. An unresolved reference is implemented literally — three failures and one HALT in `innovation-use/link-innovation-dev` traced to one such phrase."** |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | root `CLAUDE.md` §4.3 (beside KZ-017) |
| Edit | Add: **"And a declared gap needs a falsifier of its own. Before recording a verification as *unreachable*, check whether a child guide already rules on that property class — `server/researchindicators/src/CLAUDE.md` §4's metadata assertion was prescribed, with a working instance, while T-05 declared the same property unreachable and spent two review rounds on the declaration."** |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | **KZ-008** (*"An advisory that names a reachable state is not an advisory — it is an unfiled defect"*) |
| Edit | Raise severity and add `innovation-use/link-innovation-dev` as a source, with the recurrence note: **"Recurred 2026-09-09, one step worse than the lesson describes — the unowned advisory was not merely dropped, it was converted into a positive INSTRUCTION in the next task's brief, and the following review then FAILed the work for obeying it. When a reviewer must reason *'the spec literally requires the harmful thing, so it is not a violation'*, that conclusion is itself Pivot evidence."** |
| Severity | High (raised) |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` — the Antigravity row of the CLI-invocation table |
| Edit | **Already written by this spec's T-13 as approved task scope**, not deferred: the model list was stale in three directions (3.8-flash missing, 3.5-flash phantom, `gemini-3.1-pro` having no `-medium`) and now carries the 14 measured slugs plus *"re-probe before planning a dispatch"*. **Recorded here only so the apply pass does not re-propose it.** ⚠️ Note the tension: the archive's branch gate would have deferred this write, but `tasks.md` T-13 mandated it as spec scope and it was approved through the specify gates. |
| Severity | Low |
| Status | applied (2026-09-09, by T-13) |

### P5

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` §2.4 |
| Edit | **Already written by this spec's T-13 as approved task scope** — **ADR-13**, recording that a result-to-result link's cardinality is a property of the writer rather than of a constraint, why no unique index is used, and that `EXISTS` (not `COUNT(*) = 1`) keeps a doubled row from becoming a red check the user cannot clear. **No ADR was superseded**, so no status flip is owed. Recorded so the apply pass does not allocate a second number. |
| Severity | Low |
| Status | applied (2026-09-09, by T-13) |

### P6

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/trd/trd.md` §2.4 (ADR-13), `docs/ux-ui/design.md` §12.2 (the 2026-09-09 entry), root `CLAUDE.md` (the Antigravity row) |
| Edit | Repoint the three citations of `docs/specs/innovation-use/link-innovation-dev` to `docs/specs/archive/2026-09-09-innovation-use--link-innovation-dev` — the folder moved at archive time and those pointers are now dead (**KZ-013**). ⚠️ **Deliberately NOT extended to the 13 code files** carrying `// @akili-spec docs/specs/innovation-use/link-innovation-dev`: the established practice in this repo is to leave them as point-in-time records — chunk 3 was archived 2026-08-26 and **29 code files still cite its pre-archive path while zero cite the archive path**. Repointing them would churn a clean tree for no lookup benefit. |
| Severity | Medium |
| Status | pending — *the three targets are shared files and this is a spec branch* |

### P7

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | **KZ-013** (*"Archiving a spec silently breaks every document that cites its path… Grep the spec path across `docs/` before the move"*) |
| Edit | Add `innovation-use/link-innovation-dev` as a source and raise the recurrence count, with the note: **"Recurred 2026-09-09, and the recurrence was found in the PREVIOUS archive's residue rather than in this one. `innovation-use/details-page` was archived 2026-08-26 with this lesson marked *Applied — 6 dead references repointed*, yet FIVE active documents still cite its dead path: `docs/ux-ui/design.md`, `docs/specs/innovation-use/family.md`, and three entry files under `docs/specs/kaizen/`. The lesson's own sweep scope — *across `docs/`* — did not hold, because the sweep ran before `docs/specs/kaizen/` existed as a directory and nothing re-ran it. A one-time sweep does not institutionalize a rule; the sweep needs to be part of the move, not a step beside it."** |
| Severity | Medium (raised — second occurrence, and the first was recorded as Applied) |
| Status | pending |

## Methodology upstream

**KZ-…-1 is dual** and its upstream half is the more valuable one: the failure needs nothing project-specific to reproduce. Any AKILI spec can write *"reuse the existing X"* in a requirement while its design never defines X, and the implementer will pick the only referent in the codebase. **Recommend upstreaming P1's rule to the AKILI methodology repository's `general-setup/requirements.md` template**, so it binds every project rather than this one.
