# Let Innovation Use drafts save while incomplete

Clicking **Save** on the Innovation Use details section did nothing — no request, no toast, no error — whenever the resolved use level was `>= 6` and Justification was blank. The rule belongs at submit, where the green check already enforces it and where every other STAR section already puts it. This PR moves it there by deleting a redundant save-time guard, on both tiers.

## Deployment coupling — read this before merging

**Ship both tiers together, or ship neither. Never ship one alone.**

| Half shipped alone | Result |
| --- | --- |
| Client only | The save gate drops, the `PATCH` fires, and the server still throws `400` — a **visible error** where today there is a silent no-op. Strictly worse than the bug being fixed. |
| Server only | Nothing perceptible changes — the client still refuses to send. |

Per `docs/infrastructure.md`, the **server deploys first**. That makes the intermediate window (server changed, client not yet) the **harmless half** — the client still won't send, so no user sees different behavior until the client half lands too. If a deploy has to pause mid-way for any reason, pausing after the server half is safe; pausing after the client half (were that ever the order) would not be.

No migration, no feature flag, no data backfill. Backout is a plain revert — rows already saved with a blank justification stay valid (the column is nullable, the green check is already `false` for them).

## What to review first

**The server deletion and the `valid_text` reasoning** — that is the part most likely to draw *"you removed a validation"* as an objection, and it deserves the closest look:

- `result-innovation-use.service.ts` — `validateLevelExplanation` (the save-time throw) and its one call site are deleted. Nothing else in the service changes control flow.
- **The rule is not gone, only relocated to where it already lived**: `innovation_use_validation`'s `IF(useLevel >= 6, explanationValid, TRUE)` conjunct — unchanged by this PR — already gates the section's green check, and the green check already gates Submit. The deleted method was a second, earlier copy of the same rule, in the wrong place.
- **Whitespace-only justifications now reach the column.** This is intentional, not a regression: `valid_text` strips whitespace before measuring, so the green check reads a whitespace-only value as absent exactly like it reads `NULL` or `''`. Trimming it before save would have introduced a real bug instead (see below).
- **Why deletion, not relocation to a submit-time check:** submission does not flow through `ResultInnovationUseService` — it goes through the status-workflow's green-check dispatch. There is no submit call site to move the guard to.

## What else changed, and why it's safe

| Area | Change | Why it doesn't reduce enforcement |
| --- | --- | --- |
| Client save gate | Dropped `!justificationMissing()` from the `if` guarding the `PATCH` | The other four conditions (editable status, load succeeded, not already saving, no duplicate actor type) are untouched |
| `buildPayload` | **Byte-identical, deliberately not touched** | Trimming here would send no key on a cleared justification, and the server's *key-present ? payload : stored* merge rule would then silently preserve the old value — a real data-loss bug this PR does not introduce |
| Duplicate required message | Two messages (`app-textarea`'s own, plus a page-owned block) made **disjoint** instead of one being suppressed | `app-textarea`'s untrimmed check owns raw-empty; the page-owned block was narrowed to own only whitespace-only. Exactly one message renders in every case; the shared `TextareaComponent` is untouched |

## Not in this PR

- **Turning on server-side completeness enforcement for a first submission.** `completenessValidation` is `enabled: false` on `DRAFT → SUBMITTED` for **every** indicator, not just this one — a platform-wide, pre-existing arrangement. Filed as its own finding (`docs/specs/innovation-use/family.md` `FR-9`), not actioned here: enabling it would need a decision covering all six indicators and a write to the shared, non-disposable dev database.
- Two small server cleanup items, deferred by explicit user ruling to prioritize this deploy: an unused variable (`_effectiveExplanation`) plus stale comments, and a test-only assertion that a workflow config row stays `enabled: true` (`docs/specs/innovation-use/family.md` `FR-8`). Neither affects runtime behavior.

## Verification

| Check | Result |
| --- | --- |
| `server/researchindicators` — `npm test -- --silent` | 336 suites / 2296 tests passed |
| `server/researchindicators` — `npm run lint -- --quiet` | clean |
| `client/research-indicators` — `npm test -- --silent` | 312 suites / 6515 tests passed (coverage 99.22 / 97.94 / 98.81 / 99.5) |
| `client/research-indicators` — `npm run lint -- --quiet` | clean |
| Server regression fixture | Red on current code (`400` via the deleted guard), green after deletion |
| Migrations | None added; `innovation_use_validation` and the migration folder are byte-identical |

## Checklist

- [x] A blank or whitespace-only justification at resolved level ≥ 6 now saves; the green check stays `false` until real text is saved
- [x] `REVISED → SUBMITTED` still rejects an incomplete result
- [x] Exactly one required message renders in every case (blank / whitespace / filled)
- [x] `buildPayload` and `TextareaComponent` are byte-identical
- [x] Both full suites green, both lints clean, no migration
- [ ] Both tiers deploy together (deployment step, not a code check)
