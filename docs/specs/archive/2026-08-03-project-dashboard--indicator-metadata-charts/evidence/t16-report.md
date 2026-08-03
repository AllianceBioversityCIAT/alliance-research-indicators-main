# T-16 report — 390 px measurement, full suite, coverage

**Task:** `tasks.md` § T-16 · **Requirements:** NFR-IMC-003, NFR-IMC-004, NFR-IMC-005 · gates DC-7, DC-11
**Report date:** 2026-07-31 · **Author:** Implementer (this session) · **Source data:** `evidence/t16-raw/measurements.json` (= `result5.json`, 11 scenarios), plus fresh suite/coverage runs executed today against the same source tree
**No source changes.** This file is the only diff.

## Verdict — one line per box

| Box | Verdict | Why (one line — full evidence below) |
| --- | --- | --- |
| 0 px horizontal overflow at 390/768/1440, control alongside | **Earned** | 0 px at document, page-wrapper *and* grid level at all three widths; KZ-006 control (`control_forced_390`) reproduces 598 px / 594 px overflow at grid/wrapper level while document level stays 0 — the control proves the harness can see a failure the document metric would miss |
| One-column collapse below 720 px | **Earned** | 1 track measured at 719 px on both bands, in both sidebar states; the media-query mechanism itself is demonstrated only on the single band (see Q1) |
| Full client suite green; full server suite green | **Earned** | Fresh run today: client 306/306 suites, 6292/6292 tests; server 324/324 suites, 2069/2069 tests — both exit 0, both match the archived 15:35 run exactly |
| Coverage vs floors, vs pre-change | **Earned (client, exact match) / earned with a stated precision gap (server)** | Client 99.33/98.03/99.14/99.56 vs floor 40/20/45/30, identical to T-15's recorded pre-change baseline. Server 84.16/74.62/84.67/84.22 vs floor 60%, above the one pre-change figure execution.md records (83.32%, stmts only, one task older) — not regressed, but not a byte-precise 4-dimension delta |
| ⊕ T-15 added: `scroll_probe` (trusted Page Down) | ~~**Earned**~~ **→ RETRACTED 2026-07-31. Earned for an equivalent container, NOT for the shipped overlay.** See the correction under §D | `scrollTopBefore: 0` → `scrollTopAfter: 120`, `dispatched: true`, `focused: true`, `stillActive: true` — **but measured on a harness fixture, not on the shipped element** |

No box is scored a rounded-up pass where the underlying number does not support it — see the coverage caveat above and in §B.

---

## Q1 — Does "one column below 720 px" hold, and is the media query the mechanism?

**Preliminary read confirmed, not refuted.** Reading `singleGridComputedColumns` (not card x-positions — the single band has one card, so its position is uninformative about track count):

| Key (padLeft) | `singleGridComputedColumns` | Tracks | `wideGridComputedColumns` | Tracks |
| --- | --- | --- | --- | --- |
| `breakpoint_isolated_719` (0) | `675.047px` | 1 | `675.047px` | 1 |
| `breakpoint_isolated_720` (0) | `330px 330px` | **2** | `676px` | 1 |
| `measure_719` (64, app default) | `614.25px` | 1 | `614.25px` | 1 |
| `measure_720` (64, app default) | `615.188px` | 1 | `615.188px` | 1 |

**Single band, isolated pair:** container width barely moves (675.047px → 676px, ~1 px), yet the column count flips from 1 to 2 exactly at the 719→720 boundary. The only thing that changed is which side of `@media (width < 720px)` the width falls on. This is the media query causing the collapse, isolated from width scarcity — the strongest evidence available in the dataset.

**Wide band, isolated pair:** `wideGridComputedColumns` is `675.047px` (1 track) at 719 **and** `676px` (1 track) at 720 — no change across the boundary. `minmax(400px, 1fr)` needs roughly 800 px+gap to fit two tracks; a ~676 px container cannot fit two regardless of which side of the media query it is on. **This pair demonstrates nothing about the media query for the wide band at this container width** — it is width scarcity, not the mechanism, and the isolation experiment cannot distinguish "media query fired" from "media query irrelevant here" for this band.

**At the app's real default sidebar state** (`measure_719`/`measure_720`, padLeft=64), both bands stay at 1 track across the boundary too, for the same width-scarcity reason (container ≈614–615 px, too narrow for `minmax(300px,1fr)` to fit 2 tracks once gap is accounted for) — consistent with, not contradicting, the isolated finding.

**Conclusion:** the acceptance box ("one-column collapse below 720 px measured") is earned — one column is observed at/under 720 px in every scenario tested, for both bands. But the *causal* claim that the media query is the mechanism is proven only for the single-card band. For the wide (4-card) band, the isolation pair at a ~676 px container cannot show the mechanism at all — it is masked by width scarcity — and this must not be reported as "media query confirmed on both bands."

---

## Q2 — Does the 4-card band meet DD-7's 2×2 claim at 1440 px?

**Preliminary read confirmed — and it is a real design-vs-reality gap, surfaced here, not fixed.**

| Key | Sidebar state | `wideGridComputedColumns` | Layout | `wideCardRects` (x, y) |
| --- | --- | --- | --- | --- |
| `measure_1440` | **collapsed — the app's default** | `422.391px 422.391px 422.406px` | **3 columns**, 4th card wraps | (102.4,77) (540.8,77) (979.2,77) row 1 · (102.4,374.75) row 2 |
| `measure_1440_sidebar_expanded` | expanded (the other reachable state) | `553.25px 553.25px` | **2×2, genuinely** | (283.75,77)(853,77) row 1 · (283.75,373)(853,373) row 2 |

The default-state container (`wideGridRect.width = 1299.19px`) is wide enough for `minmax(400px,1fr)` to fit **three** 400px+ tracks (3×400=1200 ≤ 1299), producing exactly the **3+1 orphan row** DD-7 says the design exists to avoid. Only when the sidebar is manually expanded (`wideGridRect.width = 1122.5px`, too narrow for a third 400px track: 3×400=1200 > 1122.5) does the grid actually collapse to 2 columns and produce 2×2.

**This is design-vs-reality drift on `design.md` DD-7 ("2×2 for 4-card bands... Measured in real Chrome at 500/768/1440").** At 1440 px, in the state most users will see by default, the 4-card band is **3+1, not 2×2**. 2×2 is real but only reachable via the non-default sidebar state. This is not this task's to fix — no CSS was touched — and it is reported here, prominently, per the charter's instruction, for `design.md`/DD-7 to be corrected by whoever owns that document next (T-17 or a follow-up).

---

## A. Fresh suite runs — today's observation, not a citation of the archive

Both suites were re-run fresh in this session (not cited from the 15:35 archive), per KZ-003 (full suites, never targeted) and the charter's instruction to convert this from an archival claim into a this-run observation.

| Suite | Command | Result (this run) | Result (archived 15:35) | Match |
| --- | --- | --- | --- | --- |
| Client tests | `cd client/research-indicators && npm test` | 306/306 suites, 6292/6292 tests, 15.425s | 306/306, 6292/6292 | ✅ identical |
| Client coverage | `cd client/research-indicators && npm run test:coverage` | 306/306, 6292/6292, 14.52s | 306/306, 6292/6292 | ✅ identical |
| Server coverage | `cd server/researchindicators && npm run test:cov` | 324/324 suites, 2069/2069 tests, 1 snapshot, 24.33s | 324/324, 2069/2069, 1 snapshot | ✅ identical |

All three exit 0. No regression, no flake, no drift — expected, since T-16 makes no source change and only `docs/` moved since the 15:35 archive run (per the charter's own framing).

---

## B. Coverage against floors AND against pre-change values

**Floors** (verified directly, not assumed): server ≥60% global — `CLAUDE.md` §4.1 / `requirements.md` NFR-IMC-004. Client 40/20/45/30 — read at `client/research-indicators/jest.config.ts:17-23` this session (`statements: 40, branches: 20, lines: 45, functions: 30`).

**The 99.33% client figure is app-wide, confirmed independently.** `jest.config.ts:8`: `collectCoverageFrom: ['./src/app/**/*.ts', './src/app/**/*.html', '!./src/app/**/*routing.ts', '!./src/app/**/*module.ts']` — the same glob the thresholds at line 17 apply to. Not a scoped run flattering the number.

### Client — exact pre-change baseline found and matched

`execution.md:605` (T-15, Reviewer's full-suite run, the task immediately before T-16): **306 suites / 6,292 tests, coverage 99.33 / 98.03 / 99.14 / 99.56.**

This run: **306/6292, 99.33/98.03/99.14/99.56** — byte-identical to the pre-change baseline. No source changed between T-15 and this task, so this is the expected, verified result: floors held (99.33 ≥ 40, 98.03 ≥ 20, 99.14 ≥ 45, 99.56 ≥ 30) and **not regressed** (identical, not merely non-worse).

### Server — baseline found, but with a precision gap, stated rather than absorbed

`execution.md:546` (T-07, final attempt 2): **"NFR-IMC-004 held (coverage 83.32% global vs the 60% floor)."** This is the most recent server coverage figure recorded in `execution.md` before T-16.

**Caveat, stated plainly:** this figure is one task older than the true immediate-predecessor state. Between T-07 and T-16, T-09 added `agresso-contract.swagger.spec.ts` (2 new tests, confirmed via `execution.md:906`), which is why the suite grew from T-07's **323 suites / 2,067 tests** (`execution.md:554`) to today's **324 suites / 2,069 tests** — a +1/+2 delta consistent with exactly that one file. No coverage percentage for the post-T-09 state was ever recorded in `execution.md`, and T-07's 83.32% is reported as a single "global" number with no branch/function/line breakdown to compare against.

This run: **84.16% statements / 74.62% branches / 84.67% functions / 84.22% lines**, all above the 60% floor with wide margin.

**Comparison, honestly bounded:** 84.16% (this run, statements) vs 83.32% (T-07, statements, one task earlier) — coverage **increased**, consistent with the new swagger spec adding covered assertions over previously-exercised production code. This supports "not regressed" but is a **one-dimension, one-task-removed** comparison, not the exact-baseline, four-dimension match available on the client side. Branches/functions/lines have no earlier recorded server baseline in `execution.md` to diff against at all.

**Verdict for this half of the box: earned for "held against floors" (unambiguous, large margin on all four dimensions); earned-with-caveat for "not regressed" (directionally supported, not exactly reproducible to the precision the client side allows).**

---

## C. 0 px horizontal overflow — read at the level it was measured

Per the charter's subtlety: `control_forced_390` shows the KZ-006 control failing at the **grid/page-wrapper level** while the **document level** stays 0 — so a document-only assertion would be insufficient. This report states all three levels for every scenario.

| Key | Document (`overflowX`) | Page-wrapper (`pageWrapperOverflowX`) | Wide grid (`wideGridOverflowX`) |
| --- | --- | --- | --- |
| `measure_390` | 0 | 0 | 0 |
| `measure_768` | 0 | 0 | 0 |
| `measure_1440` | 0 | 0 | 0 |
| `control_forced_390` (forced `grid-template-columns: 900px`) | **0** | **594** | **598** |
| `control_cleared_390` | 0 | 0 | 0 |

**The control genuinely reproduces a known failure, and it does so where a document-level-only check would miss it entirely.** `control_forced_390.documentScrollWidth` (390) equals `documentClientWidth` (390) — `overflowX: 0` — even while the page-wrapper carries 594 px and the grid carries 598 px of real overflow (`pageWrapperScrollWidth: 904` vs `pageWrapperClientWidth: 310`; `wideGridScrollWidth: 900` vs `wideGridClientWidth: 302`). `control_cleared_390` returns every level to 0, confirming the harness detects both the broken and the healthy state, not just one direction.

**Conclusion:** 0 px overflow is earned at 390/768/1440 px, verified at three levels (document, page-wrapper, grid) simultaneously — a stronger claim than the document-level-only assertion the charter warns against, and the control demonstrates exactly why the stronger claim was necessary.

---

## D. `scroll_probe` — T-15's added box

`measurements.json → scroll_probe`: `found: true`, `focused: true`, `scrollTopBefore: 0`, `scrollTopAfter: 120` (container `scrollHeight: 285`, `clientHeight: 138`), `dispatched: true` (trusted `Input.dispatchKeyEvent` Page Down, not a synthetic DOM event), `stillActive: true` (focus retained post-scroll). ~~This converts T-15's previously-unobserved "scrollable by keyboard alone" box (jsdom cannot scroll) into an actually-observed one, in a real browser, closing the gap `execution.md:637-639` named.~~

> **⚠ CORRECTION 2026-07-31 — the struck sentence above was wrong, and this
> section's verdict is retracted to a narrower one.**
>
> **The measured element was not the shipped overlay.** `driver.mjs:209` targets
> `document.querySelector('#t16-scroll-probe [tabindex="0"]')` — a harness-owned
> id, distinct from `#t16-wide-band` / `#t16-single-band`. The recorded
> `ariaLabel` is `"Scroll probe (T-16 fixture)"`, which the shipped binding
> `[attr.aria-label]="title()"` (`project-dashboard-card.component.html:71-72`)
> cannot produce. `evidence/README.md` independently calls the same element a
> harness artifact, attributing an earlier 33 px overflow to *"the scroll-probe
> div's **own hardcoded** `width: 400px` — a harness defect, not a component
> defect."*
>
> **What these numbers support:** a `tabindex="0"` / `overflow-y:auto` container
> of this shape scrolls under a trusted `Page Down` in real Chrome.
> **What they do not support:** that the shipped overlay was observed scrolling.
>
> **Restated:** the shipped overlay's **focusability** is observed (T-15's specs,
> real template, `document.activeElement`) and its **attribute shape** is verified
> in the template. Its **scroll behaviour remains inferred** from native browser
> semantics — the state this ⊕ item existed to move past, and did not. The
> behaviour is almost certainly correct; the *observation* was not made.
>
> Found by T-17's Reviewer, one task later. Annotated in place rather than
> rewritten, matching the precedent set in `evidence/README.md`. Full record:
> `execution.md` § T-16 → *"CORRECTION to this entry"*.

---

## Methodology note — why this is not a re-run of the harness

Per `evidence/README.md`, the harness component source (`src/harness-t16/`, the `main.ts` bootstrap swap) is permanently lost — deliberately reverted at the end of T-16's original execution (no-source-changes requirement) and never committed. The archived `measurements.json` is the driver's own byte-identical output, recovered from a scratchpad the VPN-triggered revert did not touch. This report cites that dataset directly and does not attempt to rebuild or re-execute the harness, per this task's explicit instruction. What *was* re-run fresh in this session is the client and server test/coverage suites (§A), because those require no harness and are cheap to re-verify.

---

## Not Done / Assumptions

- **Did not rebuild or re-run the Angular measurement harness.** Out of scope per the charter (`src/harness-t16/` is permanently lost and rebuilding it is explicitly not this task's job). All 390/768/1440/719/720/control/scroll-probe numbers are cited from the recovered `evidence/t16-raw/measurements.json`, not regenerated.
- **Server coverage "not regressed" is directionally, not precisely, verified.** The only server coverage baseline recorded in `execution.md` (83.32%, T-07) is one task older than the true immediate-predecessor state (it predates T-09's swagger-spec addition) and carries only a single "global" figure with no branch/function/line breakdown. This run's 84.16/74.62/84.67/84.22 is higher on the one comparable dimension, supporting "not regressed," but a byte-precise four-dimension pre/post delta — the kind available for the client — does not exist in `execution.md` for the server. Reported as a stated limitation, not rounded up to a clean match.
- **Q1's media-query causation is proven only for the single band**, not the wide band, at the container widths in this dataset. Reported explicitly in §Q1 rather than generalized to "the media query governs both bands."
- **DD-7's 2×2 claim does not hold in the app's default sidebar state at 1440 px** (it is 3+1; 2×2 is real only with the sidebar expanded). This is a `design.md` DD-7 drift, surfaced here per instruction. **No CSS was changed and none should be** — this is not this task's defect to fix; it is a documentation/design correctness issue for a later task (candidate: T-17, or a dedicated follow-up) to resolve.
- **No source files were touched.** `git status` shows only this new file (`evidence/t16-report.md`) against a clean working tree; `npm run lint` in the client package is clean.
- Coverage and suite figures in §A/§B are this session's fresh runs, executed today, not copied from the archived 15:35 logs — they are cited in §A only for the identical-match comparison the charter requested.
