# Superseding note — the save-time justification rejection is removed

**For:** future readers of this archived spec and its `R-IUA-006`
**From:** `bugfix/innovation-use-draft-save` (2026-08-21)

## What this note is, and is not

This archive folder is a point-in-time record — `requirements.md` (and every other file here) stays byte-identical to what was approved and delivered on 2026-08-20. This note does **not** edit it. It records that a later spec superseded part of what `R-IUA-006` asserts, and says exactly which part.

## What changed

`bugfix/innovation-use-draft-save` (approved 2026-08-21, option A, both server and client tiers, Reviewer PASS on both) deleted `result-innovation-use.service.ts`'s `validateLevelExplanation` guard and its single call site — the mechanism `R-IUA-006`'s rejection ACs assert. Full change, reasoning, and evidence: that spec's `requirements.md` (R-IUD-001, R-IUD-002), `design.md` §3.1/§4/§6, and `execution.md` → *T-01* (red-before-green fixture run verbatim, inverted unit tests, coverage).

**Why:** the rule was enforced at save time, when it belongs at submit time — where `innovation_use_validation`'s `explanationValid` conjunct already gates the section's green check and, through it, the Submit button. Relocating the check (rather than deleting it) was considered and rejected as unbuildable: submission does not flow through `ResultInnovationUseService` at all (`bugfix/innovation-use-draft-save/design.md` §4).

## `R-IUA-006`, AC by AC — superseded vs. still true

| AC | Original assertion | Status now |
| --- | --- | --- |
| AC.1 | A payload selecting level 6 (catalog `id = 7`) with no explanation is rejected `400` | **Superseded.** No longer rejected — the draft saves |
| AC.2 | A payload selecting level 5 (catalog `id = 6`) with no explanation is accepted | **Unaffected** — always true, independent of the deleted guard |
| AC.3 | A payload selecting level ≥ 6 with a whitespace-only explanation is rejected `400` | **Superseded.** No longer rejected — it saves, whitespace stored verbatim |
| AC.4 | A payload selecting level ≥ 6 with an empty-string explanation is rejected `400` | **Superseded.** No longer rejected — it saves |
| AC.5 | Omitted-level draft-save merge rule (evaluated against the effective post-write row) | **Partially superseded.** First clause — no level stored anywhere, draft-save accepted, rule never fires — **unaffected**; nothing about "no level stored" depended on the deleted guard. Second clause — when a level *is* already stored, the rule is evaluated against the effective post-write row so an omitted level cannot bypass the justification requirement — **superseded**: the rule that clause fed (the level ≥ 6 justification guard) was deleted, so nothing is evaluated at save any more and there is no bypass left to close. Step 6's partial merge — the mechanism that actually preserves a stored justification when the field is never typed into — is unchanged. **DD-14** (`./design.md` DD-14 — this folder's own decisions table at `:469`; the resolution rule itself is §5.1 steps 3–4, `:232`/`:238`) is only **partially** superseded by the same deletion, not wholly — its two resolutions now diverge. The **explanation** resolution (`payload !== undefined ? payload : stored`, `result-innovation-use.service.ts:177-181`) survives only as dead code — renamed `_effectiveExplanation`, never read by anything after T-01 removed its only consumer; evidence for why it went dead: `bugfix/innovation-use-draft-save/design.md` §3.1's corrected paragraph. The **level** resolution (`effectiveLevelId`, `:163-166`) remains live, still consumed by `resolveInnovationUseLevel` (`:189`) to reject an unknown catalog id with `400` — a check unrelated to R-IUA-006 that DD-14 also happens to gate. DD-14's other half — an omitted key preserves a scalar but clears a collection — is the same step-6 partial merge already credited above as unchanged, not superseded |
| AC.6 | The rule resolves the level by joining the catalog on `id`, never the FK or by name | **Unaffected** — the surviving rule (now enforced only at the green-check/submit boundary) still joins on `id`, unchanged |

The *Scenario: The off-by-one boundary holds* (the `id = 6` / `id = 7` discriminating pair) is superseded on its `id = 7` half in the same way as AC.1 — it no longer rejects, it saves with the green check `false`.

**Beyond the two ACs the bugfix's own task named (AC.3/AC.4): AC.1 asserts the identical rejection mechanism and is equally superseded, and AC.5's second clause is superseded by the same deletion though its first clause is not.** Citing only two would have under-counted by one, and classifying AC.5 as wholly "Unaffected" (this note's own prior wording) under-counted by one more — its second clause answers a different mechanism (DD-14's save-time evaluation rule, now gone) than the level-merge logic the original wording named. Verified independently against the requirement text rather than trusted from the citation — this session's `bugfix/innovation-use-draft-save` has had a cited-site list under-count three separate times (`KZ-005`; see `docs/specs/innovation-use/OPEN-ITEMS.md` §6), so the full AC set was re-read here, twice now, rather than only the two named.

## What still enforces the underlying rule

`innovation_use_validation`'s `explanationValid = valid_text(innovation_use_level_explanation)` conjunct (`1787078283929-createInnovationUseValidation.ts:134`) is **unchanged** and still gates the section's green check and, through it, the Submit button — on the `REVISED → SUBMITTED` transition (`result_status_workflow` row id 30, `completenessValidation` `enabled: true`).

On a **first** submission (`DRAFT → SUBMITTED`, row id 25) `completenessValidation` is `enabled: false` — for **every** indicator, not just this one. That is a pre-existing, platform-wide fact, unrelated to this change beyond having been discovered while diagnosing it. Filed, not fixed, at `bugfix/innovation-use-draft-save/proposal.md` §15 and indexed at `docs/specs/innovation-use/OPEN-ITEMS.md` §5 row **P1**, and carried as a named risk in `docs/specs/innovation-use/family.md` § Cross-cutting Risks.

## Where to read the full change

`docs/specs/bugfix/innovation-use-draft-save/` — `requirements.md` (R-IUD-001, R-IUD-002), `design.md` §3.1 / §4 / §6, `tasks.md` T-01, `execution.md` → *T-01*.
