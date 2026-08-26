# Validation Report — Results (Innovation Use) / Details Page (STAR)

> ## ⛔ Verdict: **FAIL** — not archive-ready
>
> **Two blocking findings, both reachable in the light theme today, both inside obligations this spec accepted, and both in the one region its verification design had no instrument pointed at.** Everything else is sound: traceability is genuinely clause-level (97 ACs and 45 clauses reproduced exactly by an independent count), 15 of 21 requirements pass outright, and `R-IUP-019`'s non-regression holds byte-identically.
>
> **Remediation is small and local: ~9 token swaps in 4 template files, and one `<div>` → `<button>`.** No new token, no shared stylesheet edit, no design decision to reopen — `DD-17` already ruled which tokens to use and published the measured ratios.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/innovation-use/details-page` · id `2026-08-innovation-use-details-page` |
| Date | 2026-08-26 |
| Verdict | **FAIL** |
| Tier / independence | **T3 · two independent auditors on `opus`, fresh context, neither implemented any part of this spec.** Every Implementer ran on `sonnet`, so `author ≠ auditor` holds on both model and context. The Leader ran only the objective command-driven phases and spot-verified the two FAILs; it did **not** audit work it supervised |
| Phases | 1 Task completion · 2 File existence · 3 Build integrity — **Leader, command-driven**. 4 Requirement coverage · 5 Quality · 6 Design conformance — **delegated** |
| Runtime failure | The Phase 4/6 auditor's first turn died on an API error (host slept mid-response). Recorded as a **non-delivery**, resumed rather than re-spawned; the Leader did **not** substitute itself, per `/akili-execute`'s rule that the auditor role is never filled inline |

## 2. Summary

| Phase | Result |
| --- | --- |
| 1 · Task completion | **WARN** — 13/14 `done`; `T-13` **reopened by this validation** |
| 2 · File existence | **PASS** |
| 3 · Build integrity | **PASS** |
| 4 · Requirement coverage | **FAIL** — `R-IUP-017` AC.3 |
| 5 · Quality | **FAIL** — `R-IUP-018` AC.1/AC.2 |
| 6 · Design conformance | **FAIL** — `DD-17` unapplied outside the amendment; 4 budget/count defects |

**2 FAIL · 14 WARN · ~30 advisory.**

## 3. Task Completion — WARN

14 tasks, one `execution.md` entry each, 55 recorded `PASS` markers. **`T-13` was `done` and is now `[~]` again:** its `c7` and `c9` discharges are **retracted** by this validation, because both were credited to human observations that structurally could not see the defects found below.

| Criterion | Was | Now | Why |
| --- | --- | --- | --- |
| `c7` | `[x]` | `[ ]` | Closed for *"no unreadable contrast"* on *"todo se ve bien"*. **2.91:1 grey-on-light-grey is exactly what a human eye passes over** — the criterion's own text warns that *"'the page renders' does not discharge 'contrast ≥ 4.5:1'"* |
| `c9` | `[x]` | `[ ]` | Closed on a Tab pass and *"lo veo todo en inglés"*. **A `<div>` with no `tabindex` is skipped by the Tab loop**, so the loop completes and the ring shows on every control that *does* focus; and a control with **no** accessible name is trivially "in English". Neither observation is evidence for its clause |

**The root cause is a Leader process defect, not a reporting one** — `KZ-002` recurrence 6, third occurrence in this run, all three the Leader's. The durable fix: **before crediting an observation, state what the check structurally cannot see, and check whether the clause lives there.**

## 4. File Existence — PASS

Every file in `design.md` §2.1's tree exists; `quantification-item` is present at `src/app/shared/components/quantification-item` with three true `git mv` renames.

## 5. Build Integrity — PASS

Measured by the Leader in a quiet tree with no worker active.

| Check | Result |
| --- | --- |
| `npm run lint -- --quiet` | `All files pass linting.` · post-run `git status` **clean** (the script carries `--fix`, so this is the load-bearing half) |
| `npm test -- --silent` (full, unfiltered) | **316 suites / 6724 tests passed** |
| Coverage | **98.19 / 96.30 / 97.76 / 98.49** vs floors 40 / 20 / 45 / 30 |
| `npm run build` | exit 0 · **0 errors** · initial **1.33 MB raw / 274.92 kB transfer** vs the 2 MB warning · no initial-bundle budget warning · all warnings pre-existing on unrelated components |

## 6. Requirement Coverage — FAIL

**Traceability itself is sound, and this is worth stating first.** An independent count reproduced **97 ACs**, **45 clauses**, **21** requirements, **22** scenarios and the per-requirement AC distribution **exactly**; §5's 45 rows map 1:1 onto the 44 clause lines with `R-IUP-006`'s documented split, and that split is substantive rather than bookkeeping (the render half is `onLevelSelected()`, the serialize half is `buildPayload()` — either row would otherwise have discharged the other). **No scenario-level orphan; no gap cleared by citing a different requirement.**

| Verdict | Requirements |
| --- | --- |
| **PASS** (15) | R-IUP-001…010, 012…016, 019, 021 |
| **WARN** (5) | **R-IUP-011** (AC.6 rests on jsdom against a fixture — `AR-1`) · **R-IUP-018** · **R-IUP-020** (AC.6 partial) · plus doc-level warns below |
| **FAIL** (1) | **R-IUP-017** — AC.3 |

### F-1 · FAIL · `R-IUP-017` AC.3 — light-theme AA fails in this spec's own files

AC.3 binds **the section**, not the amendment: *"Both light and dark themes render **the section** legibly, with no unreadable contrast."* `DD-14` keeps light-mode AA *"fully gated"* (PRD **C-4**).

| Pair | Ratio | Sites |
| --- | --- | --- |
| `--ac-grey-600 #8d9299` on `--ac-grey-100 #f4f7f9` | **2.91:1** | ACTORS callout `…component.html:129`; actor eyebrow `…actor-item.component.html:11`; organization eyebrow `…organization-item.component.html:11` |
| `--ac-light-blue-300 #1689ca` on `--ac-white-1` | **3.84:1** | three `Add other …` buttons; stepper digits |
| `--ac-light-blue-300` on `--ac-grey-200` | **3.21:1** | organization callout link |
| `--ac-grey-700 #777c83` on `--ac-grey-200` | **3.51:1** | organization callout body |
| *(wider surface, §5.7 binding classes)* | `.description` **4.20:1**, `.section-title` **2.38:1** | second auditor, 9 roles total |

**Computed independently three times** — both auditors and the Leader, in sRGB/WCAG 2.1, each reproducing `DD-17`'s own published 7.44:1 / 6.35:1 as a method check.

**The finding is a scope fence, not a measurement error.** `innovation-use-details.component.html:19` carries the comment *"Mirrors the ACTORS callout's shape **but NOT its color: `--ac-grey-600` measures 2.91:1 and fails AA**."* **Line 129 of the same file is that ACTORS callout, still using `--ac-grey-600`.** The spec measured the right number, wrote it down, fixed the two blocks the amendment owned, and left the block it compared itself against untouched 110 lines away.

**Remediation — no new token, no shared stylesheet, no design decision reopened.** Apply `DD-17`'s own ruling beyond the amendment: `--ac-grey-800` (7.44:1) for body and eyebrow text, `--ac-light-blue-400` (6.35:1) for links and Add-button labels, `--ac-light-blue-500` (8.27:1) where the surface is `--ac-grey-200`. Re-derive the stepper's selected fill. Then extend `T-14` c12's pure-function contrast block from four text roles to every role in the section — **the instrument already exists and was pointed at a quarter of the surface.**

### F-2 · FAIL · `OQ-IUP-8`'s scope statement is factually wrong

`OQ-IUP-8` defers this defect because *"fixing `.description` edits a **shared stylesheet** consumed app-wide"*, and states it paints *"the `ACTORS` guidance text"*. **The ACTORS text uses no `.description`** — it is a local Tailwind utility on a line this spec authored, fixable in one word with **zero** blast radius. The deferral's cost argument does not reach it, and that error is what made F-1 look out of scope. Five further failing sites appear in no open question at all.

**Remediation:** narrow `OQ-IUP-8` to `custom-fields.scss`'s `.description` rule — its true, genuinely app-wide subject — and open an in-spec item for the local utilities.

## 7. Linting & Code Quality — FAIL

Lint clean. One blocking finding.

### A-2 · FAIL · `R-IUP-018` AC.1/AC.2 — an unfocusable, unnamed delete control

`shared/components/quantification-item/quantification-item.component.html:6`:

```html
<div class="cursor-pointer text-[#CF0808]" (click)="onDelete()" (keydown.enter)="onDelete()">
```

No `role`, no `tabindex`, no `aria-label`. **Without `tabindex` the element never receives focus, so `(keydown.enter)` is dead code** — mouse-only, announcing nothing. The sibling actor card does it correctly with `<button type="button" [attr.aria-label]="'Remove actor ' + actorNumber">`. `T-11` fixed this exact class on the actor card; **the promoted shared card was outside that sweep's file set.** The fact was known — `innovation-use-details.component.spec.ts:472-474` records in a comment that the icon has no `aria-label` and works around it instead of reporting it.

**Remediation:** native `<button type="button" [attr.aria-label]="'Remove ' + headerLabel + ' ' + quantNumber">`, matching the two new cards. Add a positive test asserting the control is focusable and named. Note this file is shared with OICR — the blast radius is `oicr-details`, which is a11y-improved by the same change.

### WARN — quality

| ID | Finding |
| --- | --- |
| **A-3** | `saveData()` returns **silently** for `loadFailed()` / `loading()` / `hasDuplicateActorType()` while Save stays rendered and enabled. Click Save in the error state → no PATCH, no toast, no feedback. `disableSave` already exists on `NavigationButtonsComponent` and is unbound |
| **A-4** | A **catalog** GET failure renders as a clean empty form — `GetInnovationUseLevelsService.main()` never checks `successfulRequest`, so a non-2xx yields `list.set([])`: zero stepper buttons, a **false** required message, **and `showJustification()` flips to `false`, hiding a saved justification at level ≥ 6** — with no toast. `DD-11`'s error surface covers the details GET only |
| **A-5** | No pending state for the page shell. `cache.loadingCurrentResult` is **written by two components and read by none** (dead signal). Pre-data paint therefore shows two red errors on a record nobody has loaded yet — reachable on **every** page open |
| **A-6** | Three different column-split breakpoints across three sibling cards in one container: actor `lg:` (1024), quantification `xl:` (1280), organization never. Both cannot be calibrated |
| **A-7** | Stepper has no responsive strategy — ten fixed `!w-8` buttons + nine connectors ≥ 24px ≈ **356–536px** minimum inside an ancestor with `overflow-x: hidden`. Reachable by arithmetic from the spec's own stated interior width |
| **A-8** | Stepper selection is conveyed by **background colour alone** — no `aria-pressed` / `aria-current` / radiogroup. A screen-reader user cannot tell which level is selected (WCAG 1.4.1 / 4.1.2) |
| **A-9** | Level definitions are tooltip-only for unselected levels and PrimeNG's `tooltipEvent` defaults to `'hover'` — **no focus listener** (verified in `primeng-tooltip.mjs:270-286`). Keyboard and touch users cannot compare definitions before choosing |
| **A-10** | `escape="false"` routes interpolated CLARISA `name`/`definition` to `tooltipText.innerHTML`, **bypassing `DomSanitizer`**. *Reachability: could not construct* — the catalog is migration-seeded and read-only. Latent sink |
| **T-1** | **The `VersionWatcherService` double is `{ onVersionChange: jest.fn() }` in all four describe blocks and the captured callback is never invoked.** The component's **own initial load path is never exercised** — every test calls `getData()` by hand. Delete the constructor call and the suite stays green while the page never loads. `KZ-001`'s exact shape, in the one place nobody looked; it also structurally hides A-5 |
| **T-2/T-3** | The levels-service spec asserts `set` **call sequences** on `jest.fn()` stubs that store nothing (`list()` always returns `[]`), and **no fixture carries `successfulRequest` at all** — so the shape `ToPromiseService` actually returns on an HTTP error is not representable. The suite therefore *encodes* A-4's silent-empty outcome as correct |
| **T-6** | `PV-T13-2`'s `lg:grid-cols-2` has **no regression pin**, though the stepper spec carries exactly that pattern for `fs-[14]`. A silent revert to `md:` is undetectable |

### 4R advisory (recorded, non-gating)

~30 findings carried, each with a reachability verdict. Highest-value: **`app-input` emits duplicate cross-wired DOM ids** (`id="username"` / `inputId="minmax-buttons"` hardcoded — six elements share one id on the c13 fixture, so every `label[for]` resolves to another field's control; **reachable deterministically**, platform-wide); **`.dark-mode` is never applied** so PrimeNG Aura always renders light chrome, making `design.md` §7.1's claim false; **`RB-8`'s two user-visible product defects** (indicator-1 Home progress shows 75% where truth is 86%; *"7/7 sections completed"* beside a disabled Submit) still have no ticket; **Back/Next saves then navigates whether the PATCH succeeded or failed**, and the constructed loss is every edit in the session.

**`AR-2` should be narrowed.** It is on file as *"visual and a11y correctness rest on human observation"* — but **F-1 and A-2 are both computable without a browser**, and `T-14` c12 already **built** the instrument. It was pointed at four text roles and never at the other nine. AR-2 is broader than it needs to be, and F-1 is what fell through the excess.

## 8. Design Conformance — FAIL

`DD-1`…`DD-17` conform **except**:

| DD | Issue |
| --- | --- |
| **DD-17** | ✅ for the two amendment blocks — all six published ratios reproduced exactly. ❌ **as a design rule** — the token it forbids remains at 7–9 sites in the same page (F-1) |
| **DD-12** | Line-number citations persist in `design.md` §2.3 (`:78`, `:36`). Already open as judgment `I-3`; both still resolve, so no rot yet |
| **DD-16** | ✅ **matches its amended text** — `goToEvidence()` reads `cache.currentResultId()`, never `paramMap`, never a truncating accessor. The `/result/null/evidence` defect is closed and the platform-coded id survives verbatim |

### Budget and figure defects

| ID | Finding |
| --- | --- |
| **F-3 · FAIL** | `T-13` c10's reconciliation table is **arithmetically inconsistent with itself**: row 1 says T-01…T-09 = **2,802**, the ledger and `tasks.md` §6 both say **3,202** (off by exactly T-08's 400 line); and its **Total 3,510** is not the sum of its own column (2,802+190+80+40+0 = **3,112**) |
| **F-4 · FAIL** | **The amended budget was never reconciled and c10 is ticked.** c10's table predates `T-14` (08-21 vs 08-26) and stops at `T-13`. **No document carries a post-amendment total** — it is **5,621** LOC (5,816 with RB-9) and **21** of ~31 rounds |
| **F-5…F-9 · WARN** | `tasks.md:27` still asserts the pre-amendment **39 clauses / 85 ACs** against §5/§9's 45/97 — the same sweep that fixed the adjacent task count 13→14 missed this cell · `design.md:29` says **1** reversion challenge where §11 has **2** · `design.md:649` scopes to **R-IUP-001…019** where 21 exist · the ledger's Running-total cell is a **palimpsest** with four mutually exclusive vintages in one cell · **`requirements.md` R-IUP-001 and `D-IUP-5` still assert a claim `RB-8(c)` records as false** (`optional: true` affects the counter only, not submit gating — verified in `submission.service.ts:34-37`) |
| **F-10…F-17 · advisory** | `T-13` c8 ticked with the entire Amendment-01 surface never in frame (user ruling, disclosed) · `OQ-IUP-4` missing from `requirements.md` §11 and `RB-9` cites a non-existent §14 · §11's Amendment-01 rows are **not a table** (two stray blank lines) · a `results-center.service.ts` allowlist edit sits outside §2.1's inventory · three figures fail re-derivation (`form-header` 13 not 13+shell; DD-16's "12 siblings" is 11; `responsive-size.scss` 193 not 195) · `NFR-IUP-003/004` evidence cites superseded numbers · all three docs still read `draft`/`in-progress` and `Last updated: 2026-08-20` |

## 9. Test Evidence Summary

No `test-report.md` exists (`/akili-test` was not run as a separate phase); coverage was verified directly.

**The good half, stated because it is the exception in this repo:** `T-08`'s payload tests wire `buildPayload()` to the actual PATCH argument; the id/level trap is asserted on **rendered stepper text**; the `DD-16` defect is reproduced against a **real `provideRouter` tree** because the flat route mock is named as what let it through; falsifiers discriminate; several blocks state what they cannot prove instead of claiming it. `KZ-001` is **substantially discharged**.

**The gap:** `T-1`/`T-2`/`T-3` above. The initial-load path, the catalog-failure path and the resolved-state assertions are the three places the doubles do not represent production — and **A-4 and A-5 both live there.**

## 10. Agent Guide / Constitution Impact

No `## Constitution Impact` block in `execution.md`. `DD-3` promoted `quantification-item` into `shared/components/` — a change to a shared public surface that the client child guide does not mention. **WARN**, pending `/akili-archive`'s Constitution & Graph Sync. CodeGraph re-index also pending (10 new/moved client files).

## 11. Remediation

| # | Action | Sev | Cost |
| --- | --- | --- | --- |
| **R1** | Swap the failing tokens to `DD-17`'s own pair across the 4 template files (`--ac-grey-800` body/eyebrow, `--ac-light-blue-400` link/Add, `--ac-light-blue-500` on `grey-200`) | **FAIL** | ~9 one-word edits |
| **R2** | `quantification-item` delete → native `<button [attr.aria-label]>`; add a focusable-and-named test | **FAIL** | ~6 lines + 1 test |
| **R3** | Extend `T-14` c12's contrast block to **every** text role in the section | **FAIL**-closing | ~40 lines of spec |
| **R4** | Re-run `T-13` c10 including `T-14`; fix its two arithmetic errors; record one post-amendment total | **FAIL** | doc |
| **R5** | Narrow `OQ-IUP-8` to `.description`; open an in-spec item for the local utilities | **FAIL** | doc |
| **R6** | Fix F-5…F-9's stale counts and the known-false `RB-8(c)` claim; prefer pointers over restated figures (`KZ-005`) | WARN | doc |
| **R7** | Bind `[disableSave]`; check `successfulRequest` in the levels service; gate the pre-data validation blocks | WARN | ~15 lines |
| **R8** | Invoke the `VersionWatcherService` callback in at least one test | WARN | ~10 lines |
| **R9** | Capture the two owed **card 1** frames at 1440 and 768; re-run the a11y pass after R2 | WARN | human |
| **R10** | Advisories: own or explicitly accept `app-input`'s duplicate DOM ids and `RB-8`'s two product defects — both are platform-wide and outside this spec | advisory | own spec |

## 12. Archive Readiness

**⛔ NOT ready.** `R1`–`R5` must close first; `T-13` must be re-discharged **against a check that can see what its predecessor could not**.

**`R1`–`R3` are ~15 lines of production code and one spec block.** The design decision is already made, the ratios are already published, and the instrument is already built.

Then: `/akili-archive docs/specs/innovation-use/details-page`

---

*AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). MIT.*
