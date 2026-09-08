# Validation Report — Bilateral / Optional & partial Theory-of-Change mapping

## Verdict: **FAIL — not archive-ready**

The **engineering is sound**. What blocks archive is the **evidence trail** and **two verification gaps** — not the shipped code. Eight items must close; none is large.

---

## Document Control

- **Spec:** `docs/specs/bilateral/toc-optional-mapping` · **Branch:** `JuankCadavid/AC-1676` · **Base:** `8b6a6df0`
- **Date:** 2026-08-13 · **Validated at:** `224a6264` (+2 remediation commits since)
- **Validator:** independent auditor (Claude Opus, T3) — **deliberately not the Leader**, which orchestrated the run and made two errors during it that only the review panel caught
- **Coverage evidence:** reused from `test-report.md` (STATUS: PASS) and cross-checked, not re-derived

---

## Summary

| Check | Result |
| --- | --- |
| 1. Task completion | ❌ **FAIL** |
| 2. Requirement coverage (scenario + clause granularity) | ✅ PASS (2 evidence WARNs) |
| 3. The two structural discharges | ✅ **PASS — strongest work in the run** |
| 4. Cross-document figure check | ⚠️ WARN |
| 5. Design conformance / drift | ⚠️ **WARN — one new user-facing defect** |
| 6. Constitutional `docs/ux-ui/design.md` §12.2 entries | ✅ PASS |
| 7. Unresolved advisories | ✅ PASS — none is a disguised violation |
| 8. Archive readiness | ❌ **NOT READY** |

### Build Integrity

| Command | Result |
| --- | --- |
| Server `npm run build` | ✅ PASS |
| Server `npm run lint` | ⚠️ **Unfalsifiable — it is `eslint --fix`** (see F-2; now fixed and committed) |
| Client `npm run lint` | ✅ PASS (covers production files only — config ignores `*.spec.ts`) |
| **Client `npm run build`** | ❌ **FAIL — `TS2345`** |
| `npm run test:e2e` | ⛔ **BLOCKED** — needs live MySQL (`this.mysql.createPool is not a function`) |

---

## The findings that matter

### FAIL-1 — Three `[x]` tasks cited a document that never mentioned them

`execution.md`'s Task Execution History ended at **T-06**. T-07, T-08 and T-09 were marked `[x] done` with detailed Reviewer-PASS claims ending *"See `./execution.md`"* — including **T-07, the silent-data-loss fix that is this spec's headline change**. The durable evidence did not exist; the claims lived only in the status lines citing it.

**REMEDIATED** — full entries for all three written, carrying each Reviewer's independent findings and advisories.

### FAIL-2 — The client tier was certified green without ever being type-checked

The client build fails `TS2345`: the gitignored, agent-authored `environment.ts` sets `hotjarId: 'test'` (string) where `Hotjar.init()` takes a number. `hotjar.service.ts` is **untouched by this spec**, and `environment.dev.ts` carries the identical defect.

The artifact is not the finding. **This spec ran no type-check on the client at all**, then certified that tier green:

- Server got `tsc --noEmit` (twice, via T-05's Reviewer).
- Client got Jest under `isolatedModules: true` — **no type-checking** — and an ESLint config that **ignores `*.spec.ts`**.

The spec **recorded both facts itself** (T-07 advisory A-1; T-10's lint caveat) and stopped one inference short of the conclusion they force. `build` appears nowhere in `requirements.md` §8.2 or T-10's done-check.

The spec convicts itself in its own words — §8.2: *"An inconclusive result must be reported as inconclusive — never collapsed into a pass because the command exited 0."* **6,239 green tests over a tree that cannot compile is exactly that failure mode.**

Aggravating: the **only checked box in T-10** is `[x] FINAL COVERAGE GATE RUN AND GREEN`, resting on client figures produced by the very file that breaks the build — while **RB-7, still `open` in the same document, says "T-10 must not certify the client coverage gate without resolving this."**

### WARN-3 — A new user-facing, a11y-affecting defect, reported nowhere

`sp-toc-alignment-block.component.html:212` and `:314` render the required asterisk, and `:241` / `:324` set `aria-required="true"` — **unconditionally** — on the **Indicator** and **Contribution** fields, the two this spec makes optional.

A contributor stopping at the Level + HLO floor sees two starred fields and a screen reader announces both as required, while the save gate and the server both accept without them. This falsifies `design.md` §1 finding 2 (*"the template already renders every partial state correctly"*) and **D-C1-6** on the required-marker dimension.

**No AC names it. D7 is the gate that would have caught it** — the strongest available argument that D7 is not a formality.

### F-2 — `npm run lint` cannot serve as a verification gate

`npm run lint` is `eslint --fix`. It **rewrites and exits 0**. Feeding the committed `HEAD` content through `eslint --stdin` returned two `prettier/prettier` errors at `bilateral.service.ts:1060-1061`, introduced by **T-04** — the task whose Implementer died before reporting. Every "lint clean" report in this run passed because the working tree already carried the auto-fix as an uncommitted diff.

**REMEDIATED** — committed as `2de57099`. *Method finding: a self-fixing command cannot verify, because it makes the thing it checks true as a side effect of checking it.*

### F-1 — The correction-closure sweep failed a third time

`execution.md` claimed the forward sweep covered *"every surviving instance"*. Three survive:

| Site | Surviving text |
| --- | --- |
| **`design.md:355` (OQ-C1-6)** | *"contradicted by migration `1782950000000`"* — the premise the Pivot proved **false**, still asserted in the primary design document |
| `judgment.md:45` | *"satisfied by accident, and untested"* — verbatim the sentence declared false on both counts |
| `judgment.md:47` | *"Migration `1782950000000` contradicts that."* |

`judgment.md` is arguably a point-in-time ledger, but `proposal.md` **was** amended by the same sweep, so the folder's own convention is to amend. `design.md:355` has no such defence.

---

## What passed, and deserves saying

- **The two structural discharges are the strongest work in the run.** Both premises hold under adversarial checking; lapse conditions are falsifiable and keyed to named artifacts; and **no test is named as though it proved either** — the exact defect that failed T-01's and T-06's first attempts **did not recur**.
- **Requirement coverage is real at clause granularity.** The validator cross-checked `tasks.md` §3 against `requirements.md` itself and opened the cited tests. **No scenario-level orphan.**
- **Every executable figure reproduced exactly** — 320/2058, 307/6239, coverage within 0.06%, and the migration's byte-identity re-derived independently including a check for *inline* `--` that could hide SQL.
- **The Leader's own D8 self-correction is accurate at source** — every citation verified.
- **§12.2 held append-only, and better than instructed:** `tasks.md` T-10 says *"replace"*, which would have violated §12's own append-only rule; the implementation appended instead.

---

## Remediation

### Must close before archive

| # | Item | Owner |
| --- | --- | --- |
| 1 | ~~Write T-07/T-08/T-09 execution entries~~ | ✅ **DONE** |
| 2 | Commit `environment.example.ts` with number-typed placeholders; add `build` (both tiers) **and** `tsc -p tsconfig.spec.json --noEmit` to §8.2. **Until then the client tier's evidence is inconclusive by §8.2, and T-10's `[x]` coverage gate must be un-checked.** Note `ng build` uses `tsconfig.app.json` (`files: [src/main.ts]`), so a green build still would **not** cover the A-1 stub — two distinct gates, both missing | **User** (repo-level) |
| 3 | ~~Commit the server lint fix~~; stop reporting `npm run lint` as verification | ✅ **DONE** (`2de57099`) |
| 4 | **Fix or record the required-asterisk / `aria-required` drift** — user-visible and a11y-affecting. **Belongs in PR 2, not after** | Needs a task |
| 5 | **D7** — perform it, or record the accepted risk with sign-off per §8.1 | **User** |
| 6 | Correct `design.md:355`; annotate `judgment.md:45,47` as superseded | Leader |
| 7 | Close or waive the **T-04 confirming audit** `execution.md` itself asked for *"before PR 1 ships"* | **User** |
| 8 | Fix the `:1080` *"byte-identical"* claim (it is overlapping, not identical); correct T-10's §12.2 *"replace"* → *"append"*; correct the e2e root cause on record | Leader |

### Carry as recorded risks (not blockers)

RB-2 · OQ-C1-5 (**152** stale `bilateral-module` refs — the "~137" was approximate, not fabricated) · `task_T03_diff.txt` · the four follow-ups in `pr-bodies.md`.

### For Kaizen, not remediation

**The budget tripwire was breached without escalation.** Actual ~1,715 insertions (~492 production) against ~530 (~130) — **3.2× / 3.8×**; review rounds ≥14 against 10. `design.md` §9 required escalation, and none was raised. Much is defensible (the 200-line migration is forced by append-only recreation), but the spec set the tripwire and never tripped it. **The estimate was wrong, not the work.**

---

## Archive Readiness

**NOT READY.** Once items 2, 4, 5, 6, 7 and 8 close, this archives cleanly.
