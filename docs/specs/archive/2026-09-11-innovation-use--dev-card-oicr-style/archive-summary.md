# Archive Summary — Innovation Dev card in the OICR selected-card style

**Outcome: shipped and QA-approved.** All nine items QA asked for are on the branch. T-05 was deferred by user decision at the deployment cut and stays deferred — it is test-only.

## Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/innovation-use/dev-card-oicr-style` |
| Archive path | `docs/specs/archive/2026-09-11-innovation-use--dev-card-oicr-style` |
| Archive date | 2026-09-11 |
| Parent | `docs/specs/innovation-use/family.md` — **child #6, row added retroactively at archive** (see below) |
| Branch | `AC-1679-Create-the-innovation-use-section` (spec branch) |
| Final status | **Done** — shipped, QA-approved 2026-09-11 |

## What shipped

| Piece | Commit |
| --- | --- |
| status + year carried onto the card | `f89ad74e` |
| OICR restructure · anchor as the 4th pair · vacuous assertions repaired | `6d7c52ef` · `92362d51` |
| ⊗ clear + enrichment-flag reset + `aria-label` + real button coverage | `6d6429b4` |
| See more / See less | `d0d6a9f4` |
| ⊗ sized to the approved 18px `pi-times-circle` | `8ec7115d` *(`/akili-quick`)* |

T-01…T-04 done and deployed. **T-05 deliberately not done.**

## T-05 — deferred, with the cost stated rather than glossed

T-05 rewrites `dev-card-details` T-08's contrast assertions onto the adopted roles. **It changes nothing a user sees.** What deferring it costs: **no test currently pins the metadata row's colour tokens**, so a future colour change there would redden nothing. That is test debt, not deployment risk — which is why it did not block the deployment cut and does not block this archive.

## Manifest irregularity, recorded not hidden

This spec **had no row in `docs/specs/innovation-use/family.md`**, whose header declares the child list a *closed set*: *"no child folder may be created without a prior row here."* The folder was created without one. The row was added retroactively at archive time as child **#6**, marked `done`.

**This is a real process deviation, not a bookkeeping slip.** It is recorded here because the manifest is the authority for `Depends on` / `Parallel-safe`, and a child that never appeared in it was never subject to that ordering check.

## Accepted follow-ups

Two findings that need a shared-component change and are owed to `dev-card-details` T-10's human check — both restated in that spec's archive summary:

1. **`[statusBackground]` is an input `app-custom-tag` declares but never reads** — the badge renders transparent, not filled like the OICR pattern.
2. **`rs-gap-[16]` became `gap-2`** — 16px to 8px, off the responsive scale.
