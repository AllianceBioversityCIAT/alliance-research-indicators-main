# PR bodies — Bilateral / Optional & partial Theory-of-Change mapping

Prepared 2026-08-13. Spec: [`docs/specs/bilateral/toc-optional-mapping`](./). Ticket: [AC-1676](https://cgiarmel.atlassian.net/browse/AC-1676).

> **⚠ Branch-structure note.** `tasks.md` §5 plans two PRs split by tier. The ten commits are **interleaved on one branch** (`1554431f`, client T-02, precedes `dfd2624a`, server T-01), so the split cannot be done by commit range — it needs cherry-picking onto two branches.
>
> §5 splits for **review size** (~530 LOC against a ~400 threshold), not safety. Its safety rule is *"PR 2 alone would send payloads the deployed server still rejects"* — and a **single PR makes that impossible**, because both tiers land together. So Option B below is safe; it is only harder to review.
>
> Both bodies are provided. Pick one.

---

## Option A — two PRs (as `tasks.md` §5 plans; requires cherry-picking)

### PR 1 — server: accept partial ToC

**Commits:** `dfd2624a` · `6c4a00e5` · `bb1776ed` · `c0e82497` · `aba8a48c`

#### What this does

Lets a contributor record *"this result maps to the ToC at this High-Level Output"* before an indicator is known. Today the mapping is all-or-nothing.

The required floor for `aligns_with_toc: true` drops from **level + toc_result_id + indicator_id** to **level + toc_result_id**. Anything supplied is still validated.

#### Review these first, in this order

1. **`bilateral.service.ts` — `validateTocAlignments`** (`6c4a00e5`). The floor change and the conditional catalog checks. `unknown_toc_result_id` still fires on a bad HLO; `unknown_indicator_id` is evaluated only when an indicator was actually supplied.
2. **`bilateral.service.ts` — the snapshot return map** (`bb1776ed`). The null set for a partial row. Note `target_year` is null, not `MAPPABLE_LIVE_VERSION` — it must not claim a year for a target nobody chose (judgment **F-9**).

Everything else supports those two.

#### Deploys inert

This PR widens what the API accepts while no client sends a partial payload. Behavior only changes once PR 2 ships.

#### Out of scope

All client behavior. The SP selection model, the version gate, `is_read_only` semantics, the per-SP ToC table shape, pool-funding tag derivation, and the ToC catalog source are untouched.

#### Two things worth knowing

- **`aba8a48c` adds a migration that changes only a SQL comment.** The function lives in merged migration `1782950000000`, so append-only rules forbid editing it in place. `up()`'s executable SQL is byte-identical to the original and `down()` restores it exactly — both re-derived by script, including a check that comment-stripping discarded no executable text.
- **R-BIL-118 AC.2 is discharged structurally, not by test** — the DB partial-unique constraint cannot be reached from a unit test, and this spec changes no DDL. Signed off, with a lapse condition recorded in `requirements.md`.

**Next:** PR 2 (client). **Deploy order is PR 1 → PR 2, never reversed.**

---

### PR 2 — client: send partial ToC + docs

**Commits:** `1554431f` · `31453bfa` · `0a8f4d41` · `f2284b76` · `f256e6e1`
**Requires PR 1 merged and deployed.**

#### What this does

Fixes the actual user-visible bug, which is worse than "partial data isn't saved".

`writeDtoFromDrafts` silently dropped an incomplete "Yes" from the request body. The PATCH then succeeded, the UI reported success, and **nothing was persisted**. The branch's own comment called it *"defensive only"* — and it was, right up until the save gate was relaxed, at which point it would have become live data loss. That is why the gate and the writer had to change in one commit.

#### Review these first, in this order

1. **`bilateral.service.ts` — `writeDtoFromDrafts`** (`0a8f4d41`). The silent-drop fix. Every answered draft is now emitted, with absent optional fields omitted rather than the whole entry discarded. The only remaining skip is an *unanswered* draft, paired with a blocked save and a required marker.
2. **`pool-funding-alignment.component.ts` — `isDraftSaveable`** (same commit). Unanswered still blocks save; that half of the gate is deliberately kept.

Tests assert the **emitted DTO contents**, not the save button's state. A button-state test would have passed against the broken code.

#### Out of scope

All server validation (PR 1). Layout, spacing and contrast — see the open item below.

#### ⚠ Open before merge

- **The D7 visual check has not been performed.** jsdom cannot measure layout, size, or contrast, so no automated gate in this spec can see whether the reworded question and the partial row *look* right. Jira mockup `image-20260723-145821.png` was never obtained. Per `requirements.md` §8.1 this needs to be **performed, or accepted as a risk with sign-off** — it must not be silently closed.
- **The client coverage figure is machine-local.** `src/environments/environment.ts` is gitignored with no committed template, so the green client run is not reproducible from a clean checkout (**RB-7**).

**Previous:** PR 1 (server).

---

## Option B — single PR (safe; larger to review)

**Title:** `feat(bilateral): allow partial Theory-of-Change mapping`

Body: use PR 1's *What this does* and PR 2's *What this does* in sequence, then the combined review order — `validateTocAlignments` → the snapshot return map → `writeDtoFromDrafts` → `isDraftSaveable` — followed by PR 2's **Open before merge** section verbatim.

State explicitly: *"This ships both tiers together. `tasks.md` §5 planned a tier split for review size; the commits are interleaved on one branch, and shipping together removes the ordering hazard the split was designed to manage."*

---

## Verification (both options)

| | Result | Floor |
| --- | --- | --- |
| Server | 320 suites / 2058 tests · 83.48% stmts · 74.90% branches · 84.49% funcs | 60% |
| Client | 307 suites / 6239 tests · 99.60% lines · 98.27% branches | 40/20/45/30 |

Two client suites time out under concurrent load (`sdg-management.component.spec.ts`); they pass 14/14 in 1.11 s in isolation. **Expect the same on a constrained CI runner — do not read a red `sdg-management` as a regression without an uncontended re-run.**

## Follow-ups this work surfaced (not fixed here)

1. **Server 400s that render nowhere.** Errors on `level`, `toc_result_id`, `level_not_allowed`, `unknown_toc_result_id` and `unknown_indicator_id` are silently swallowed on *reachable* saves — the block renders only `aligns_with_toc` and `quantitative_contribution` errors. Pre-existing, and the same class of silent failure this PR fixes elsewhere. **Worth its own ticket.**
2. **`VISUAL_ONLY_GREEN_CHECKS` is honored server-side only.** The client re-includes the key via `every(Boolean)` in `cache.service.ts` and `submission.service.ts`, so a visual-only check can disable Submit. Pre-existing; documented in `docs/ux-ui/design.md` §12.2 and in the new migration's comment.
3. **Test code is neither linted nor type-checked** — ESLint ignores `*.spec.ts` and Jest runs `isolatedModules: true`.
4. **~137 stale `docs/specs/bilateral-module/` references** remain tree-wide (OQ-C1-5).
