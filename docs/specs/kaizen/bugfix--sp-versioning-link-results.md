# Kaizen Entry — `bugfix/sp-versioning-link-results`

| Field | Value |
| --- | --- |
| Spec | `docs/specs/bugfix/sp-versioning-link-results` (archived `docs/specs/archive/2026-09-11-bugfix--sp-versioning-link-results`) |
| Date | 2026-09-11 |
| Branch | `AC-1679-Create-the-innovation-use-section` — **spec branch**, so nothing outside this file was written |
| Depth / Mode | Lite / Bug |

## Metrics

| Signal | Count | Note |
| --- | --- | --- |
| Tasks | 2 | both `[x]` |
| Reviewer FAIL rework attempts | **0** | T-02 passed on attempt 1; T-01's second round was an approved *amendment*, not a defect rework |
| HALTs / FATAL_FAILs | **0** | |
| Pivot Records | **0** | the spec was right about the code, start to finish |
| PRODUCT_BUG findings | **0** | |
| Validation FAIL / WARN | n/a | no `/akili-validate` pass — absence accepted by the user |
| Budget tripwire | **breached (LOC)** | 2,069 actual vs ~1,080 budgeted |
| Falsifiers observed red | **5** | 4 by the Implementer, 1 by the Leader |
| Advisories recorded | 5 | none gating, none minted into tasks |

Not a clean run: the budget breach and one evidence-attribution defect are both real signals.

## Lessons

### KZ-L1 — A budget must be computed against the spec's own NFRs, not against the change's mental model

- **Root cause.** `design.md`'s Budget row priced the verbatim procedure re-declaration **once** (~1,020 of ~1,080 LOC) while **NFR-SPL-001, on the same page**, requires `down()` to restore the body verbatim — forcing the re-declaration **twice**. The budget was written from how the change is *conceived* ("add one block") rather than from what the requirements *oblige*. The delivered file is 2,069 lines; the genuinely new logic is 13, exactly as budgeted.
- **Why it matters beyond arithmetic.** The tripwire exists to catch scope creep while a run is still recoverable. A budget that under-counts its own mandated output makes the tripwire fire on a conforming implementation — which trains the next Leader to wave it through, and that is the failure mode that costs something.
- **Evidence.** `design.md` §Budget vs §NFR-SPL-001 (same document). Both lens reviewers independently reached the same characterisation. Escalated to the user *before* the Implementer was spawned, not after.
- **Severity.** Medium. **Target:** Product + Methodology.
- **Proposed standardization (1 line, `docs/specs/general-setup/design.md` Budget section):** *"Compute the LOC estimate against the NFRs this spec imposes — an NFR requiring a verbatim restore, a mirrored fixture, or a second declaration multiplies the output the change conceptually implies."*

## Noted, not a lesson

- **The `down()` transcription hazard was anticipated and mitigated correctly.** DD-4 named transcription as the dominant defect class and mandated a mechanical build; the Implementer scripted it and the trap (carrying the old `down()` body instead of the old `up()`) never materialised. A design decision doing exactly its job is not a lesson — it is the record of a good call, and worth leaving visible.
- **FP-49 was cited, checked, and held.** The Implementer deviated from a literal brief command on the strength of a documented prior finding; the Leader verified the citation instead of accepting it. The guide entry paid for itself. Working as intended.
- **Two confident zeros were caught before becoming facts** (368-vs-326 migrations; `migration:show`'s ETIMEDOUT with zero counters). Both were caught by rules already in force (K-014), not by new insight.

## Pending Items

> Recorded on a spec branch. None of these has been applied; all await the apply phase on the default branch.

| # | Kind | Target | Content | Severity | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | `standardization` | `docs/specs/general-setup/design.md` (Budget section) | *"Compute the LOC estimate against the NFRs this spec imposes — an NFR requiring a verbatim restore, a mirrored fixture, or a second declaration multiplies the output the change conceptually implies."* | Medium | `pending` |
| 2 | `digest-update` | `docs/specs/kaizen-log.md` → **KZ-014** (`staging` lineage) | Recurrence **+1**. New shape: *a falsifier probe was run, observed red, and reported as discharging a forward pointer that named a **different** mutation.* The red was real; the attribution was not. Add to the lesson: **"check the probe's identity against the pointer's text, not just that something reddened."** Evidence: `execution.md` T-02 §*Correction to the record*; `sp-versioning-link-results.fixture-spec.ts:300-309` | High | `pending` |
| 3 | `digest-update` | `docs/specs/kaizen-log.md` → **KZ-007** (`staging` lineage) | Recurrence **+1**. A worker's *self-reported correction* ("the forward pointer predicted the wrong case") was itself wrong and would have written a false claim about the spec text into the permanent record. Reinforces the existing lesson: a correction record is the highest-risk artifact class — **verify a correction against its source before writing it**, including a correction a worker volunteers about itself | High | `pending` |
| 4 | `guide-sync` | `server/researchindicators/src/CLAUDE.md` + `src/AGENTS.md` (§ fixture-harness findings, after FP-51) | *"**Migration counts do not match file counts.** `src/db/baseline/baseline.sql` seeds the `migrations` table with 42 historical rows whose files predate the baseline cut, so a bootstrapped scratch schema reports ~42 more applied migrations than there are `.ts` files (measured 2026-09-11: 326 files, 368 rows, **0 unapplied**). The figure that matters is *files present but unapplied*, never the totals."* | Low | `pending` |

**Methodology upstreaming:** item 1 (budget-vs-NFR) and item 2's new shape are both candidates for the AKILI methodology repo, not just this project.

**Not raised as a pending item, deliberately:** `design.md`'s own Budget row is now known to be wrong (~1,080 → ~2,070). Correcting a spec that is being archived this minute would edit history rather than the template that produced it; item 1 fixes the source. The wrong figure stays in the archive with `archive-summary.md` explaining it, which is the honest record.
