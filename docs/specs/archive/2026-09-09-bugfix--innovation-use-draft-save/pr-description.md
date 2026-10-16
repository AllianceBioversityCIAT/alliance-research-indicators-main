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
| `server/researchindicators` — `npm test -- --silent` | **374 suites / 3158 tests passed** |
| `server/researchindicators` — `npm run build` (what CI runs) | **exit 0** |
| `client/research-indicators` — `npm test -- --silent` | **317 suites / 6975 tests passed** (coverage 98.08 / 95.83 / 97.67 / 98.4) |
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

---

## Branch integration — read before reviewing the diff size

This branch was brought up to date twice before this PR. **Both suites were re-run after each merge**; the figures above are from the final integrated tree, not from before.

| Merge | Conflicts | How they were resolved |
| --- | --- | --- |
| `staging` -> `AC-1679` | 3 | All by **union** — nothing from either side was discarded. `package.json` (each side added different scripts in the same place), `docs/infrastructure.md` (two complementary blocks + two Open-Items lists merged without duplicating the topics both listed), `docs/specs/kaizen-log.md` (see below) |
| `dev` -> `AC-1679-to-dev` | 1 | `package.json` again, and `dev`'s side was **empty** — it simply lacks 5 scripts this branch has. Ours kept. Every source file automerged |

**The PR is opened from `AC-1679-to-dev`, not from `AC-1679`.** That is deliberate: resolving the conflict through GitHub's web editor would have merged `dev` into `AC-1679`, and `dev` is a terminal branch. The integration branch absorbs `dev` so the feature branch stays clean; it is disposable once this PR closes.

### `kaizen-log.md` was deliberately NOT reconciled

The two lines of work evolved that registry in parallel and **assigned the same IDs to different lessons** — `KZ-002`, `KZ-007` and `KZ-008` do not mean the same thing on each side (`KZ-001` is the same lesson, and `staging`'s version is the more evolved one: recurrence 13 vs 4). Merging by ID would have made every existing `KZ-00x` citation in the other lineage's specs point at the wrong lesson. Both tables are kept, separated by lineage, with a visible warning. **Reconciliation needs a human decision and is not part of this PR.**

## Pre-existing defects surfaced by the merges — none introduced here, none fixed here

| # | Finding | Evidence it is pre-existing |
| --- | --- | --- |
| 1 | **`dev`'s tree does not pass its own lint** — 181 Prettier errors, all auto-fixable, in 9 files that come from `dev`. The Prettier/ESLint config is **identical** on both branches, so these were committed unformatted | On `AC-1679` after the `staging` merge, `lint --fix` produced **zero** mutations. The errors appear only after merging `dev`. **CI runs `npm run build`, not lint, and the build passes** |
| 2 | **`migration:scan` is a dead script** — `package.json` points at `./scripts/scan-migration-placeholders.js`, deleted on 2026-08-13 by `2c50e1f1` (which did not remove the npm entry). Exits non-zero. Nothing invokes it; neither CI workflow calls it | Already filed three times in `staging`'s own docs — `kaizen-log.md:213` records it as *"Not fixed; needs an owner."* Same for `migration:show`, which the guides reference but which is not an npm script |
| 3 | **A Jest worker leak appeared in the server suite** (`worker process has failed to exit gracefully`) — a test that does not clear a timer | Compared run-to-run: absent before the `dev` merge, present after. All 3158 tests still pass, exit 0 |

**Deliberately not fixed in this PR.** Item 1 would add ~185 lines of pure formatting churn unrelated to the bugfix, would collide with anyone else editing those files, and would mean **editing an already-merged migration** — which the append-only rule forbids. Items 2 and 3 belong to `dev`/`staging` and already have (or need) their own owner.
