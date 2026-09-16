# Kaizen Entry — changes/measure-number-signed-decimal

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/measure-number-signed-decimal` |
| Date | 2026-09-01 |
| Branch | `AC-1679-Create-the-innovation-use-section` (**spec branch** — default is `main`; every item below is recorded, not written) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 12 / 12 | `tasks.md` |
| Reviewer FAIL rework attempts | **5** — `T-03` ×2, `T-10` ×1, `T-12` ×2 | `execution.md` |
| HALTs / FATAL_FAILs | **0** | `execution.md` |
| Pivots | **0** | `execution.md` (no `## Pivot Record`) |
| Runtime failures (harness, not work) | 3 — incl. one attempt killed mid-task by a session limit | `execution.md` |
| PRODUCT_BUGs | n/a — no `test-report.md` (`/akili-test` never ran; evidence is the 13 per-task Reviewer gates) | — |
| Judgment-day severe findings | **92 findings / 4 rounds / 8 blind judges**, terminal state `ESCALATED` (accepted, not approved) | `judgment.md` |
| Validation FAIL / WARN | n/a — no `validation-report.md`; validation was continuous, not terminal | — |
| Spec-text errors found by *running* the checks | **4** — an in-range falsifier literal, a guessed errno (`1264` vs actual `1292`), a LIFO backout that cannot reach the target state, and a falsifier stated backwards | `execution.md` |
| Requirement-routing defects | **2** — ACs assigned to tasks structurally unable to discharge them | `execution.md` (`T-10`, `T-11`) |

**MUDA read.** Zero pivots and zero HALTs on a spec this size is a strong planning result. All five
rework attempts were **defect waste in the verification layer**, not in the design: no decision was
reversed, and the one task that failed twice (`T-12`) wrote no production code at all — it was pure
bookkeeping. **Jidoka held**: every FAIL stopped the line before a checkbox flipped.

## Lessons

- **KZ-changes--measure-number-signed-decimal-1 — "Run it until it reports clean twice" invites two
  identical re-runs of a pure function, which proves determinism and not convergence.** (Product +
  Methodology, **High**)
  - **Root cause (5W1H).** *What:* `T-12` offered "ran the sweep twice back-to-back with no edits
    between runs, identical results" as its fixed-point evidence. *Why it passed self-review:* `grep`
    over an unchanged tree **is** a pure function, so the second run is guaranteed to agree — the
    claim is a tautology that cannot fail. *Why the instruction invited it:* the disqualifier said
    *"a single clean sweep pass is not evidence — the fixed point is"*, which is true but does not say
    **what must happen between the passes**. The precedent it cited was *repair-induced* breakage
    (round 4's anchor repair broke 21 of 25 anchors in the pass that was fixing them), and only a
    pass that **brackets the repair** can detect that. *Proof it was not convergence:* the Reviewer
    found live survivors in a **single** pass.
  - **Evidence:** `execution.md` → `### T-12` → attempt 1 (Reviewer `STATUS: FAIL`, issue 1) and the
    attempt-2 rebuild, which was itself **not** one clean pass — it surfaced
    `archive/design.md:293` after the first repair round and `archive/tasks.md:196`/`:350` a round
    later. `tasks.md:361` (the disqualifier's wording).
  - **Why this is not `KZ-001`:** `KZ-001` is about a *check* that does not evaluate what it stands
    for. This is one level up — the **evidence protocol** for iterating a check cannot distinguish
    determinism from convergence. Fixing the check would not have fixed this.
  - **Standardization:** → P1 (local) + P2 (upstream).

## Noted, not a lesson

- **A pasted command that cannot produce its own output.** `grep -v "A|B|C"` in BRE matches the
  literal string, so the exclusion filter was a no-op and the `8 → 7` figure printed beneath it could
  not have come from that command. Below the bar **only** because the project guide already carries
  `K-004` (a gate must be observed failing) and `K-014` (a filtered view of output is not the
  output) — this is a textbook instance, not a new cause. Feeds the recurrence check: if a third
  instance appears, the pair should be promoted to *"paste the command, then prove the filter fires."*
- **Leader prose errors: 6 in one run**, every one caught by a worker or Reviewer opening the file
  (stale anchors `:463-465` vs `:483-485`; a mandated falsifier that could not fire; an incomplete AC
  reassignment; a briefing that mandated DDL against a shared scratch schema; a briefing that omitted
  the only gate which type-checks spec code). Not a lesson because the harness **caught all six** —
  the delegation gate is doing exactly its job. Worth watching as a rate.
- **`test:e2e` and `test:integration` have never been part of any gate.** `npm test` uses
  `rootDir: "src"`. Both were run at archive time and both fail for proven-unrelated reasons. Not a
  lesson for this spec; a standing project observation.
- Two `T-08` gaps the user chose to leave open (role-2 column executed nowhere; the fixture's inlined
  SQL pinned to the migration's by nothing) — accepted scope decisions, not defects.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | root `CLAUDE.md` §4.3 |
| Edit | **A fixed point must bracket the repair (KZ-…-1).** Re-running a command against an unchanged tree proves determinism, not convergence — `grep` is a pure function, so pass 2 is guaranteed to agree. Discharge a fixed point as: pass N enumerates → repair → **pass N+1 runs after the last edit** → the N→N+1 delta is reconciled line by line. "Twice with no edits between" is a tautology, not evidence. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | **AKILI methodology repo** (upstream — Methodology half of the dual lesson) |
| Edit | Wherever a command or template says "re-run until it reports clean twice", state what must occur **between** the passes: the last repair. A sweep instruction that does not name the bracketing edit will be satisfied by two identical re-runs. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-001` |
| Severity | High (raised) |
| Edit | Add `changes/measure-number-signed-decimal` as a source spec and note the recurrence: a **grep pattern** keyed on two literals co-occurring on one line was structurally blind to every survivor that named the field without naming the requirement — the same root cause as a test double that does not evaluate what it stands for, in a verification rather than a test. Also: a seeded-survivor test using an **exact copy** of the superseded sentence, placed in the file already being edited, proves only that `grep` matches a literal. |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-002` |
| Severity | High (raised) |
| Edit | Add `changes/measure-number-signed-decimal` as a source spec. Recurrence: the backward sweep enumerated 13 citing files and cleared them with **one blanket sentence**; the archived `design.md` was inside those 13 and needed a change. Enumerating by a convenient proxy again missed exactly what the proxy excluded. |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `server/researchindicators/src/CLAUDE.md:183` and `client/research-indicators/src/CLAUDE.md:219` |
| Edit | Both cite `docs/specs/changes/measure-number-signed-decimal` as the origin of `FP-51` and of the client `tsc -p tsconfig.spec.json` gate rule. That path no longer exists after this archive. Repoint both to `docs/specs/archive/2026-09-01-changes--measure-number-signed-decimal/`. **Scope note:** code `@akili-spec` markers are deliberately **excluded** — 35 of them still cite the already-archived `docs/specs/innovation-use/details-page` and zero cite its archive path, so the established convention is that a marker is a provenance identifier, not a navigable path. A **guide** is read for navigation, which is why these two differ. |
| Severity | Medium |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | root `CLAUDE.md` — the CodeGraph bullet in §4.3 |
| Edit | The bullet ends *"Re-verify this line before trusting it — it has drifted twice."* This spec added ~3,118 lines across 28 code files, including two new utilities and two new fixture suites, so the index is stale by construction. Recommend a re-index and restamp the date the bullet cites. |
| Severity | Low |
| Status | pending |
