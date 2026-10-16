# Archive Summary — Innovation Dev card details (readiness, description, geo scope)

**Outcome: shipped and QA-approved.** T-01…T-09 all closed on Reviewer PASS. The two `[~]` tasks were human-verification tasks, closed on QA's sign-off of the whole Innovation Use section rather than by an agent.

## Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/innovation-use/dev-card-details` |
| Archive path | `docs/specs/archive/2026-09-11-innovation-use--dev-card-details` |
| Archive date | 2026-09-11 |
| Parent | `docs/specs/innovation-use/family.md` — child **#5** |
| Branch | `AC-1679-Create-the-innovation-use-section` (spec branch) |
| Final status | **Done** — shipped, QA-approved 2026-09-11 |

## What shipped

Three read-only fields added to the Innovation Dev card that child 4 delivered: **readiness, description, geo scope**. Origin was a reviewer comment on Innovation Use, not a defect.

Split by lane: **server T-01…T-05** (shared read with `is_active` in the `ON` clause, wiring into the section read, target-set bounding, the targeted endpoint + DTO + Swagger, and a guard that the shared link reader was untouched); **client T-06…T-09** (widened interface + per-part readiness formatter, card restructured to prose, WCAG AA on the three new text elements, selection-time enrichment with id guard and retry).

## Requirements delivered

T-01 through T-09 each closed on an `akili-reviewer` PASS with the Leader re-measuring every gate.

| Gate | Final measurement |
| --- | --- |
| Client suite | **317 suites / 6951 tests** |
| Build | `npm run build` exit **0** |
| Lint | `All files pass linting.` |

## What was owed at archive, and how it closed

| Task | State | Closed by |
| --- | --- | --- |
| **T-10** `[~]` | Human visual check in both themes — deferred by user decision behind the `RB-7` QA restyle. 10 of the 12 open checkboxes were T-10's | **QA sign-off** of the whole Innovation Use section, user ruling 2026-09-11 |
| **T-04** `[~]` | Two verification-tier criteria owed | Same ruling |

**Stated plainly:** no agent produced T-10's evidence. It closed because QA exercised the shipped UI and approved it, which is the same class of evidence T-10 asked for, obtained by a different route.

## Accepted follow-ups

Two findings from the sibling spec's review remain true and are **not** fixed here — both need a change to a component half the platform uses:

1. **`[statusBackground]` is an input `app-custom-tag` declares but never reads.** It applies only `color` and `border-color`, so the badge renders **transparent** rather than filled like the OICR pattern. Fixing it means touching a shared component.
2. **The wrapper's `rs-gap-[16]` became `gap-2`** — 16px to 8px, and off the responsive scale.

Six advisories from the final review round are recorded in `execution.md` and were deliberately **not** minted into tasks, per the advisory rule. The most substantive: `enrichmentSuccessForId` is never cleared on a selection change — correct today because the `else` reset covers it, but reset-dependent rather than structurally impossible.

## Historical note

Three errors of one species occurred in this run — a 400-character grep that could not see a `const`, a false universal about dark greys, and a partial-read assertion — **all three asserting from a partial read instead of checking the source.** Two worker justifications were also recorded as false-but-harmless and corrected in the record only, including a claim that omitting `useResultInterceptor` would make the server *"likely"* reject the request; both halves were false, the flag was kept for a different and correct reason.
