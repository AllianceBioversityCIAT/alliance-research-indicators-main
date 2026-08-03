# T-16 evidence — provenance and integrity

**Task:** T-16 — Responsive measurement at 390 px, full client suite, coverage
**Requirements:** NFR-IMC-003, NFR-IMC-004, NFR-IMC-005 · gates DC-7, DC-11
**Measured:** 2026-07-31, 15:21–15:36 local

## Read this before citing any number here

These artifacts were produced on 2026-07-31 and archived to this directory at
15:35. **They were then lost** — a VPN disconnect broke the session, the working
tree was reverted, and the untracked evidence files went with it, leaving the two
subdirectories empty.

They were **recovered on 2026-07-31 ~16:25** from the originating session's
scratchpad (`…/b3f1b50d-…/scratchpad/t16/`), which the revert did not touch. The
files are byte-identical copies of the originals; nothing was re-run and nothing
was regenerated.

**One thing did not survive** — see *What is missing* below. It is named there
rather than glossed, because this spec's recurring failure mode (`tasks.md` RB-1)
is a record asserting more than its source supports.

## What was measured

The subject is **the real Angular components**, built by the real client build,
rendered in **real headless Chrome** and driven over CDP — not the `mockup/`
replica. This is what the amended T-16 charter requires: the charter's original
wording would have permitted measuring a static hand-built replica and reporting
NFR-IMC-003 met on numbers that describe HTML nobody ships.

`t16-raw/measurements.json` holds **11 scenarios**:

| Key | What it establishes |
| --- | --- |
| `measure_390` / `measure_768` / `measure_1440` | NFR-IMC-003 at the three named widths, sidebar in its **default collapsed** state (`padLeft=64`) |
| `measure_1440_sidebar_expanded` | The other reachable sidebar state (`padLeft=250`) — the tighter constraint on DD-7's 2×2 claim |
| `measure_719` / `measure_720` | One-column collapse across T-12's `(width < 720px)` boundary |
| `breakpoint_isolated_719` / `breakpoint_isolated_720` | The same boundary at `padLeft=0`, isolating the **media query** from coincidental width scarcity |
| `control_forced_390` / `control_cleared_390` | The **KZ-006 control** — a forced `grid-template-columns: 900px` overflow, proving the harness detects a failure, then cleared |
| `scroll_probe` | T-15's unobserved acceptance box — a **trusted** `Page Down` via `Input.dispatchKeyEvent`, reading `scrollTop` before/after |

The control matters: a run reporting `0` without first reproducing a real failure
has not shown it can detect one.

## What is missing

**The Angular harness component source is lost.** `src/harness-t16/` and the
`main.ts` bootstrap swap were deliberately reverted at the end of T-16 (the task
is specified to leave **no source changes**), and the only copy — the one archived
here — went with the files above. It is **not** in the scratchpad and was **never
committed**, so it is not recoverable from git either.

What remains is enough to rebuild it, and the reconstruction contract is
determined by **one** surviving artifact:

- `t16-harness-source/driver.mjs` — pins every hook the harness must expose:
  the DOM ids `#t16-wide-band`, `#t16-single-band`, `#t16-scroll-probe`, the
  `.imb-grid` / `.app-page-wrapper` selectors, and the `?padLeft=<n>` query
  parameter that models the fixed `alliance-sidebar`'s left inset.

> **Correction, 2026-07-31 — this section previously claimed two artifacts.**
> It named `t16-raw/normal-*.html` as *"the rendered DOM of the harness at each
> width"*. **That was false.** All five `normal-*.html` / `control-*.html` files
> are byte-identical (MD5 `62bb1458…`) copies of the **un-rendered** `index.html`
> shell: `<app-root></app-root>` is empty, and none contains `_ngcontent`,
> `.imb-grid` or `#t16-wide-band`. They were `--dump-dom` captures taken at
> 15:22–15:23, **while the harness bootstrap was still failing** with NG05104
> (a component-selector mismatch), which is why they are identical and empty.
> The successful CDP run came after the fix, at 15:26+, and produced
> `measurements.json` — not these files.
>
> The error was the Leader's, caught by T-16's Reviewer, and it is the exact
> pattern `tasks.md` RB-1 names: **a record asserting more than its source
> supports.** It is corrected here rather than quietly edited away, because this
> spec's lineage produced that defect four times across three judgment rounds
> and the count is only useful if it stays honest.
>
> **No audited conclusion rested on it.** `evidence/t16-report.md` never cited
> these files, and the Reviewer corroborated harness fidelity by a different
> route: the computed track sizes in `measurements.json` reproduce the shipped
> SCSS to the pixel across six scenarios and both track minimums
> (`minmax(300px,1fr)` / `minmax(400px,1fr)` / 16 px gap / the two-selector
> `(width < 720px)` override) — which a hand-built replica would not do by
> accident. That, not the HTML dumps, is what establishes the measured subject
> was the real components.

**One further imprecision, same review.** This file describes `?padLeft=64` as
the app's default sidebar inset. The shipped sidebar is `w-[65px]`
(`alliance-sidebar.component.html:3`), so the harness models it **1 px narrow**.
Every conclusion was re-derived at 65 px and none flips: 1299.19 → 1298.19 still
fits `3×400+32 = 1232`; 615.19 → 614.19 is still under the 616 px needed for two
300 px tracks; 390 px still reads 0 overflow. Recorded because the number is
stated as exact and it is not.

`t16-harness-source/main.ts.orig` is the pristine `main.ts`, kept so the restore
is auditable.

**Consequence, stated plainly:** the recorded measurements stand — they are the
driver's own output, unedited. But **re-running T-16 from scratch requires
rebuilding the harness component first.** Do not describe this evidence as
turnkey-reproducible.

## Log truncation — declared, not silent

Three logs are **extracts, not the full output**. Each carries a header saying so
and states its original size:

| File | Original | Kept |
| --- | --- | --- |
| `client-test.summary.log` | 17.7 MB / 249,731 lines | command, `All files` row, coverage summary, suite totals |
| `client-coverage.summary.log` | 17.7 MB | same |
| `server-coverage.summary.log` | 330 KB | same |

The full logs are not archived — 35 MB of per-test PASS lines does not belong in
the repository. Everything a reader needs to check the claims is in the extract;
nothing contradicting it was dropped.

## A note on the client coverage figure

The client run reports **99.33 % statements** against floors of 40/20/45/30. That
gap is large enough to look like a scoped run, so it was checked:
`client/research-indicators/jest.config.ts:8` sets
`collectCoverageFrom: ['./src/app/**/*.ts', './src/app/**/*.html', …]`, so
coverage is collected **across the whole app**, not only across files a test
happens to import. The figure is app-wide, and it is measured against the same
globs the thresholds at `jest.config.ts:17` apply to. It is not inflated by scope.

## Inventory

```
t16-harness-source/
  driver.mjs        CDP driver — the measurement program (annotated)
  debug.mjs         bootstrap-failure diagnostic used to find NG05104
  main.ts.orig      pristine main.ts, pre-harness-swap

t16-raw/
  measurements.json           FINAL dataset — 11 scenarios (copy of result5.json)
  result.json … result5.json  the five driver iterations, in order
  normal-390/768/1440.html    NOT rendered DOM — five byte-identical copies of
  control-390/768.html        the empty index.html shell, captured while the
                              harness bootstrap was failing (NG05104). Retained
                              as the diagnostic trail only. See the correction
                              in "What is missing" above.
  shot-390.png                screenshot at 390 px
  build-final.log             the client build that produced the measured bundle
  chrome-cdp.log              chrome-headless-shell startup
  harness-http-server.log     static server for the built harness
  *.summary.log               the three truncated suite/coverage extracts
```

`result.json` … `result4.json` are the superseded driver iterations, retained
because both the instrumentation and the harness's fidelity changed across them
(verified against the files, not recalled):

| Run | Scenarios | What it added |
| --- | --- | --- |
| `result.json` | 8 | first complete run; **no `pageWrapper` instrumentation** |
| `result2.json` | 8 | adds the `.app-page-wrapper` overflow probe — which **caught a real 33 px overflow at 390 px** |
| `result3.json` | 8 | same probes, after the fix: that 33 px came from the scroll-probe div's own hardcoded `width: 400px`, i.e. **a harness defect, not a component defect** |
| `result4.json` | 9 | adds `measure_1440_sidebar_expanded` |
| `result5.json` | 11 | adds `breakpoint_isolated_719` / `_720` |

**`measurements.json` (= `result5.json`) is the one to cite.**

The run-2 → run-3 delta is worth keeping visible: at 390 px the **document**
overflow read `0` in both runs while the page wrapper read `33` and then `0`.
A document-level-only assertion would have reported a clean pass through a real
33 px overflow. That is the same blind spot the KZ-006 control exposes from the
other direction — in `control_forced_390` the forced 900 px column produces
`wideGrid: 598 px` and `pageWrapper: 594 px` of overflow while the **document**
still reads `0`. Whatever T-16's write-up asserts, it must assert it at the
level the numbers were taken at.

## Status

**T-16 is closed — Reviewer PASS on attempt 1, 2026-07-31.** All four acceptance
boxes plus T-15's ⊕ added box are earned; the server "not regressed" half is
recorded as a stated precision limitation rather than rounded up. The audit trail
is `execution.md` § T-16; the findings report is `t16-report.md` in this
directory.

Two findings T-16 surfaced are **open and belong to T-17**: DD-7's unscoped
"2×2 for 4-card bands" is contradicted at both 1440 px and 768 px in the app's
default sidebar state, and the `(width < 720px)` collapse is mechanism-proven
only on the single-card band.
