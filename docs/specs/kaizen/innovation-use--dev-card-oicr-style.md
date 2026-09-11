# Kaizen Entry — `innovation-use/dev-card-oicr-style`

| Field | Value |
| --- | --- |
| Spec | archived → `docs/specs/archive/2026-09-11-innovation-use--dev-card-oicr-style` |
| Date | 2026-09-11 |
| Branch | `AC-1679-…` — **spec branch** |

## Metrics

| Signal | Count |
| --- | --- |
| Tasks | T-01…T-04 done and deployed; **T-05 deferred** by user decision at the deployment cut |
| QA items delivered | 9 / 9 |
| Commits | `f89ad74e`, `6d7c52ef`, `92362d51`, `6d6429b4`, `d0d6a9f4`, `8ec7115d` |
| Manifest state | **no `family.md` row existed** — added retroactively at archive |

## Lessons

### KZ-L1 — A manifest that declares itself a closed set needs an enforcement point, or it is a comment

- **Root cause.** `docs/specs/innovation-use/family.md` states *"no child folder may be created without a prior row here."* This spec's folder was created with no row and ran to completion — through specify, execute, review and deployment — without anything noticing. The rule was written as a constraint but implemented as prose, so the one moment it could bind (folder creation) had no check.
- **What it actually cost.** The manifest is the declared authority for `Depends on` and `Parallel-safe`. A child absent from it was never subject to that ordering check — here harmlessly, because the spec was sequential anyway.
- **Evidence.** `family.md` header vs the folder's existence; caught by `/akili-resume`'s Step 0 drift check on 2026-09-11, **not** by any gate during the spec's own run.
- **Severity.** Medium. **Target:** Methodology.
- **Proposed standardization (`.agents/leader.md`):** *"Before the first task of a spec inside a family folder, verify the spec has a `family.md` row. A closed-set manifest with no creation-time check is a comment."*

## Noted, not a lesson

- **Deferring T-05 was the right call and its cost was stated, not glossed.** Test-only, changes nothing a user sees; the recorded cost is that no test pins the metadata row's colour tokens. That is the shape a deferral record should have.
- **`/akili-resume`'s drift check earned its keep** — it found in one scan what a full spec run had missed.

## Pending Items

| # | Kind | Target | Content | Severity | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | `standardization` | `.agents/leader.md` | *"Before the first task of a spec inside a family folder, verify the spec has a `family.md` row. A closed-set manifest with no creation-time check is a comment, not a constraint."* | Medium | `pending` |
| 2 | `product-followup` | `dev-card-details` T-05 scope | No test pins the Innovation Dev card metadata row's colour tokens; a future colour change there reddens nothing | Low | `pending` |
