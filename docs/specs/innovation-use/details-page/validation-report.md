# Validation Report — Results (Innovation Use) / Details Page (STAR)

> ## ⚠️ Verdict: **WARN** — the FAIL is lifted; archive-ready on two named acceptances
>
> **All five blocking findings of the previous FAIL are closed, on evidence an independent auditor reproduced rather than accepted.** The two code findings — `F-1` light-theme AA, `A-2` the unfocusable delete control — were verified in the **working tree**, not in the diff, with all nine published ratios recomputed in sRGB/WCAG 2.1 to two decimals. The three documentation findings were re-audited adversarially: `F-2`'s underlying fact was traced across every commit that touched the file, and the budget arithmetic **reproduces to the line** — 20 rows, all three column sums, and the reconciliation against `tasks.md` §6.
>
> **What holds this at WARN is not the work — it is who checked it.** The `R4`/`R5` remediation was Leader-authored; the audit found **8 real defects** in it; the Leader fixed all 8; **no third party has audited those fixes.** That gap is stated, not hidden, and it is the user's to accept or to close with one more pass.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/innovation-use/details-page` · id `2026-08-innovation-use-details-page` |
| Date | **2026-08-26** — re-issue, supersedes the FAIL of the same date |
| Verdict | **WARN** — no FAIL remains |
| Branch | `AC-1679-Create-the-innovation-use-section`, tree clean |
| Scope | **Delta re-validation, by explicit user decision.** Phases 1–3 re-run in full. Phases 4–6 audited **on the delta only** — the five findings and the two remediation commits. The 21 requirements were **not** re-audited from scratch; the two prior independent `opus` auditors' unchanged verdicts carry forward, untested by this cycle |
| Tier / independence | **T3.** Phases 1–3: Leader, command-driven, objective. Phases 4–6: **one independent auditor**, fresh context, read-only, seeded from `.agents/reviewer.md`, briefed to **falsify** rather than confirm. ⚠️ **The auditor's own 8 findings were remediated by the Leader and are unaudited** — §11 |
| ⚠️ Environment deviation | This session ran with cwd **outside the monorepo root**, so the `.claude/agents/akili-*` model wrappers and the `akili-tasks-gate.sh` PreToolUse hook **did not load**. The documented fallback was used (general-purpose subagent + persona file + explicit model override). `author ≠ auditor` therefore held by **instruction**, not by configuration — the same degradation recorded at `T-14` |

## 2. Summary

| Phase | Result | Basis |
| --- | --- | --- |
| 1 · Task completion | **PASS** | 14/14 `done`; **120 criteria, zero open** |
| 2 · File existence | **PASS** | All 13 files of `design.md` §2.1 present |
| 3 · Build integrity | **PASS** | Suite, coverage, lint and build green — §5 |
| 4 · Requirement coverage | **PASS** (delta) | `R-IUP-017` AC.3 and `R-IUP-018` AC.1/AC.2 verified closed in the working tree |
| 5 · Quality | **WARN** | `A-2` closed; `A-3`…`A-10`, `T-1`…`T-6` carried forward |
| 6 · Design conformance | **WARN** | `F-2`/`F-3`/`F-4` closed; 8 audit findings raised **and remediated**; `F-16` document status still stale |

**0 FAIL · 8 findings raised and closed this cycle · 14 WARN carried forward · ~30 advisory.**

## 3. Task Completion — PASS

| Check | Result |
| --- | --- |
| Tasks `done` | **14 / 14** |
| Done criteria | **120 `[x]` · 0 open · 0 `[~]`** |
| `T-13` | **Closed 11/11** after the `R1`/`R2`/`R3` remediation. Its `c7`/`c9` discharges — retracted by the previous validation — were **re-earned against the remediated surface**, not re-asserted |

⚠️ **`tasks.md` §9 *Done definition* is 0 of 11 ticked**, including *"Budget reconciled against `design.md` §12"*, which `R4` closed and ticked at `c10` without ticking here. Archive-gate work, not a blocker.

## 4. File Existence — PASS

All 13 paths in `design.md` §2.1 exist: the page, its three child components, the three contract-layer files, and `quantification-item` at `shared/components/`.

> **One false alarm, checked rather than assumed.** The pre-move directory `pages/…/oicr-details/components/quantification-item/` still exists on disk. It is **empty and untracked** — git does not version empty directories, so the three `git mv` renames were clean and the build never sees it. Local filesystem residue, not drift.

## 5. Build Integrity — PASS

Measured by the Leader in a quiet tree, no worker active, serialized.

| Check | Result |
| --- | --- |
| `npm test -- --silent` (full, unfiltered) | **316 suites / 6741 tests passed** |
| Coverage | **98.19 / 96.30 / 97.76 / 98.49** vs floors 40 / 20 / 45 / 30 |
| `npm run lint -- --quiet` | `All files pass linting.` · post-run `git status` **clean** — the script carries `--fix`, so this is the load-bearing half |
| `npm run build` | **exit 0 · 0 ERROR-level lines** · initial **1.33 MB raw / 274.88 kB transfer** vs the 2 MB warning |

**Every figure reproduces the recorded baseline exactly, and the code is provably unchanged since it was recorded:** `git log abbf7a53..HEAD -- 'client/'` is **empty**. Remaining build warnings (`NG8102`, `NG8112`, component-style budgets, two non-ESM modules) are pre-existing and on unrelated components.

## 6. Requirement Coverage — PASS (delta)

Only the two requirements that failed were re-audited. Coverage of the other 19 carries forward from the prior report's clause-level count — 97 ACs and 45 clauses, reproduced there by an independent count.

| Requirement | Was | Now | Evidence derived by the auditor |
| --- | --- | --- | --- |
| `R-IUP-017` AC.3 — *"no unreadable contrast"* | **FAIL** | **PASS** | Nine roles swapped to passing tokens, verified in the working tree. Recomputed from `colors.scss`: grey-800/grey-100 **7.4352** · lb400/white **6.8332** · lb400/grey-100 **6.3513** · lb500/grey-200 **7.4320** · grey-800/grey-200 **6.6800** · white/lb400 **6.8332** — every published figure correct to 2 dp |
| `R-IUP-018` AC.1/AC.2 — keyboard reach + accessible name | **FAIL** | **PASS** | `quantification-item.component.html:6-9` is a native `<button type="button" [attr.aria-label]>`. Dropping `keydown.enter` **widens** reach — a native button fires on Enter *and* Space. Three new `it` blocks assert `BUTTON`, `tabIndex !== -1` and a non-empty English name |

⚠️ **`AR-2` is unchanged and must not be read as closed.** No test proves a *rendered* colour, focus ring, or AT announcement — jsdom applies no stylesheet. `R3`'s 16 assertions pin **which class won**, not which colour painted. The rendered tier rests on human frames, which the auditor could not access.

## 7. Linting & Code Quality — WARN

Lint clean. `A-2` closed (§6). The following carry forward unchanged.

| ID | Finding |
| --- | --- |
| **A-3** | `saveData()` returns **silently** for `loadFailed()` / `loading()` / `hasDuplicateActorType()` while Save stays rendered and enabled. Click Save in the error state → no PATCH, no toast, no feedback. `disableSave` already exists on `NavigationButtonsComponent` and is unbound |
| **A-4** | A **catalog** GET failure renders as a clean empty form — `GetInnovationUseLevelsService.main()` never checks `successfulRequest`, so a non-2xx yields `list.set([])`: zero stepper buttons, a **false** required message, **and `showJustification()` flips to `false`, hiding a saved justification at level ≥ 6** — with no toast. `DD-11`'s error surface covers the details GET only |
| **A-5** | No pending state for the page shell. `cache.loadingCurrentResult` is **written by two components and read by none** (dead signal). Pre-data paint shows two red errors on a record nobody has loaded yet — reachable on **every** page open |
| **A-6** | Three different column-split breakpoints across three sibling cards in one container: actor `lg:` (1024), quantification `xl:` (1280), organization never. Both cannot be calibrated |
| **A-7** | Stepper has no responsive strategy — ten fixed `!w-8` buttons + nine connectors ≥ 24px ≈ **356–536px** minimum inside an ancestor with `overflow-x: hidden`. Reachable by arithmetic from the spec's own stated interior width |
| **A-8** | Stepper selection is conveyed by **background colour alone** — no `aria-pressed` / `aria-current` / radiogroup. A screen-reader user cannot tell which level is selected (WCAG 1.4.1 / 4.1.2) |
| **A-9** | Level definitions are tooltip-only for unselected levels and PrimeNG's `tooltipEvent` defaults to `'hover'` — **no focus listener** (`primeng-tooltip.mjs:270-286`). Keyboard and touch users cannot compare definitions before choosing |
| **A-10** | `escape="false"` routes interpolated CLARISA `name`/`definition` to `tooltipText.innerHTML`, **bypassing `DomSanitizer`**. *Reachability: could not construct* — the catalog is migration-seeded and read-only. Latent sink |
| **T-1** | **The `VersionWatcherService` double is `{ onVersionChange: jest.fn() }` in all four describe blocks and the captured callback is never invoked.** The component's own initial load path is **never exercised** — every test calls `getData()` by hand. Delete the constructor call and the suite stays green while the page never loads. `KZ-001`'s exact shape, and it structurally hides `A-5` |
| **T-2/T-3** | The levels-service spec asserts `set` **call sequences** on `jest.fn()` stubs that store nothing (`list()` always returns `[]`), and **no fixture carries `successfulRequest` at all** — so the shape `ToPromiseService` returns on an HTTP error is not representable. The suite *encodes* `A-4`'s silent-empty outcome as correct |
| **T-6** | `PV-T13-2`'s `lg:grid-cols-2` has **no regression pin**, though the stepper spec carries exactly that pattern for `fs-[14]`. A silent revert to `md:` is undetectable |

### 4R advisory — recorded, non-gating

~30 findings carried, each with a reachability verdict. Highest-value:

- **`app-input` emits duplicate cross-wired DOM ids** (`id="username"` / `inputId="minmax-buttons"` hardcoded — six elements share one id on the c13 fixture, so every `label[for]` resolves to another field's control). **Reachable deterministically, platform-wide.**
- **`.dark-mode` is never applied**, so PrimeNG Aura always renders light chrome — making `design.md` §7.1's claim false.
- **`RB-8`'s two user-visible product defects** — indicator-1 Home progress shows 75% where truth is 86%; *"7/7 sections completed"* beside a disabled Submit. Still no ticket.
- **Back/Next saves then navigates whether the PATCH succeeded or failed**; the constructed loss is every edit in the session.
- **`quantification-item.component.html:3`** eyebrow at **2.9115:1** — the same role and number `R1` fixed next door, with **every OICR details page** in the blast radius. Now tracked as an AA defect at `RB-5`, not as hex debt.
- **`R3` pins the class axis, not the token axis** — a redefinition of `--ac-grey-800` still goes green.

**`AR-2` should be narrowed.** It is on file as *"visual and a11y correctness rest on human observation"* — but `F-1` and `A-2` were both computable without a browser, and `T-14` c12 had already **built** the instrument. It was pointed at four text roles and never at the other nine. `F-1` is what fell through the excess.

## 8. Design Conformance — WARN

`DD-1`…`DD-17` conform, with `DD-17` now satisfied **as a design rule** as well as in the amendment blocks — the token it forbids is gone from the section's templates. `DD-12`'s line-number citations persist (judgment `I-3`); `DD-16` matches its amended text.

`F-2`, `F-3` and `F-4` are closed. **The audit of that closure raised 8 findings, all upheld at source by the Leader and all remediated** — full table in `execution.md` → *Independent audit of `R4`/`R5`*.

**The eight share one shape, and naming it is the most transferable output of this cycle:**

> **A correction is not applied until it is applied at every site it falsifies — including the sites the correction itself creates.** A correction that *narrows* a scope must state what it drops; a correction that *strikes* a claim must re-examine every figure that claim was carrying.

That is `KZ-005` sharpened, and it matters because **the commit that closed `F-3`/`F-4` reproduced the very defect they were raised about** — most seriously at `N-1`, where narrowing `OQ-IUP-8` to *"`.description` and nothing else"* orphaned **`.section-title` at 2.378:1**, a role `F-1`'s own ratio table had named, rendering four times in this section, owned by nothing for one commit.

### Budget — reconciled once, in `execution.md` → `T-13` `c10`, its single home

| | Budget (§12, amended) | Actual | Delta |
| --- | --- | --- | --- |
| LOC | ~3,400 written / ~4,800 re-baseline | **6,133** | **+80.4% / +27.8%** |
| Review rounds | ~31 | **23** | **74% consumed — under** |

*(6,328 / 24 including `RB-9`'s user-authorized non-task stylesheet.)* All three columns sum to their own totals; the derivation column reconciles with `tasks.md` §6 at **3,732**.

⚠️ **The LOC tripwire is breached, recorded, and deliberately not re-escalated** — the user has ruled on this same overrun three times, and `T-14`'s ruling is explicit that only a *fresh per-task* breach escalates. Cause re-confirmed by the per-commit split rather than asserted: the pivots and their follow-up total **215 lines, 3.5% of the run**, each closing a defect the gates had already shipped.

### Carried forward — figure and document drift

| ID | Finding |
| --- | --- |
| **F-5…F-9 · WARN** | `tasks.md:27` still asserts the pre-amendment **39 clauses / 85 ACs** against §5/§9's 45/97 · `design.md:29` says **1** reversion challenge where §11 has **2** · `design.md:649` scopes to `R-IUP-001…019` where 21 exist · **`requirements.md` `R-IUP-001` and `D-IUP-5` still assert a claim `RB-8(c)` records as false** (`optional: true` affects the counter only, not submit gating — `submission.service.ts:34-37`) |
| **F-10…F-17 · advisory** | `T-13` c8 ticked with the entire Amendment-01 surface never in frame (user ruling, disclosed) · `OQ-IUP-4` missing from `requirements.md` §11 and `RB-9` cites a non-existent §14 · §11's Amendment-01 rows are not a table · a `results-center.service.ts` allowlist edit sits outside §2.1's inventory · three figures fail re-derivation (`form-header` 13 not 13+shell; `DD-16`'s "12 siblings" is 11; `responsive-size.scss` 193 not 195) · **all three docs still read `draft` / `in-progress` and `Last updated: 2026-08-20`** |

## 9. Test Evidence Summary

No `test-report.md` exists (`/akili-test` was never run as a separate phase); coverage was verified directly.

| | |
| --- | --- |
| Suites / tests | **316 / 6741**, full and unfiltered — no `-t`, no path, no pattern |
| Gate falsifier | A targeted `innovation-use` run collects **6 of 316 suites** and is recorded **inconclusive, not a pass** — the gate tests itself |
| `R-IUP-019` non-regression | `git diff --exit-code` clean on all three Innovation **Dev** paths |
| Not proven | Rendered colour, focus rings, AT announcements. Stated, not papered over |

**The good half, stated because it is the exception in this repo:** `T-08`'s payload tests wire `buildPayload()` to the actual PATCH argument; the id/level trap is asserted on **rendered stepper text**; the `DD-16` defect is reproduced against a **real `provideRouter` tree**, because the flat route mock is named as what let it through. `KZ-001` is **substantially discharged**.

**The gap:** `T-1`/`T-2`/`T-3`. The initial-load path, the catalog-failure path and the resolved-state assertions are the three places the doubles do not represent production — and **`A-4` and `A-5` both live there.**

## 10. Agent Guide / Constitution Impact — WARN

`execution.md` carries **no `## Constitution Impact` section**, and it owes one: `DD-3` promoted `quantification-item` into `shared/components/` — a **shared public surface** the client child guide does not mention. CodeGraph re-index also pending (10 new/moved client files). Both owed to `/akili-archive`'s Constitution & Graph Sync.

## 11. Remediation

| ID | Item | Severity | Status |
| --- | --- | --- | --- |
| `R1`, `R2`, `R3` | Light-theme AA · delete control · contrast instrument 4 → 16 roles | **FAIL** | ✅ **Closed** — `abbf7a53`, independently reviewed, verified in the working tree |
| `R5` / `F-2` | `OQ-IUP-8` scope statement factually false | **FAIL** | ✅ **Closed** — `b1dc2f23` + the `N-1`/`N-2` repair |
| `R4` / `F-3`, `F-4` | c10 self-inconsistent · no post-amendment total | **FAIL** | ✅ **Closed** — `b1dc2f23` + the `N-3`…`N-8` repair |
| `N-1`…`N-8` | Audit findings **on the remediation itself** | 1 High · 4 Med · 3 Low | ✅ **Remediated — ⚠️ by the Leader, unaudited** |
| `R6` | `F-5`…`F-9`'s stale counts and the known-false `RB-8(c)` claim | WARN | **Open** — doc |
| `R7` | Bind `[disableSave]`; check `successfulRequest` in the levels service; gate the pre-data validation blocks | WARN | **Open** — ~15 lines |
| `R8` | Invoke the `VersionWatcherService` callback in at least one test | WARN | **Open** — ~10 lines |
| `R9` | Re-run the a11y pass after `R2` on a fresh frame set | WARN | **Open** — human |
| `R10` | Own or explicitly accept `app-input`'s duplicate DOM ids and `RB-8`'s two product defects | advisory | **Open** — own spec |

**Two residuals owed to the user as decisions, not sweeps:**

1. **`RB-5` / `quantification-item.component.html:3`** — `#8D9299` on `#F4F7F9` = **2.9115:1**, a live light-theme AA failure. One-word fix (`var(--ac-grey-800)` → 7.44:1) that also reduces hex debt — **but it changes every OICR details page.**
2. **`OQ-IUP-8`** — `custom-fields.scss`'s shared roles: `.description` **4.20:1** and `.section-title` **2.378:1** (4 sites in this section). Deferred by design to its own spec, because an app-wide stylesheet edit must not ride this spec's gate.

## 12. Archive Readiness Recommendation

**Archive-ready once the user accepts two things**, both stated plainly rather than buried:

| # | Acceptance |
| --- | --- |
| 1 | **The remediation of the 8 audit findings has no independent review.** The auditor found them; the Leader fixed them. Accept it, or spend one more audit pass on the fixes |
| 2 | **Two live light-theme AA defects ship** — `RB-5`'s 2.9115:1 and `OQ-IUP-8`'s 2.378:1. Both deliberately deferred, both now tracked as accessibility defects rather than as styling debt, neither owned by a ticket |

`/akili-archive` additionally owes the **`## Constitution Impact`** note, a **CodeGraph re-index**, the document-status refresh (`F-16`), `§9`'s Done definition, and the **Kaizen** step — where **`KZ-001` rises to recurrence 5** and the `KZ-005` variant named in §8 is recorded.

```text
/akili-archive docs/specs/innovation-use/details-page
```

---

*AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). MIT.*
