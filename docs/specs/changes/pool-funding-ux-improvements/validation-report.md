# Validation Report — Pool Funding Alignment / UX/UI Enhancements

> **Verdict: PASS WITH WARNINGS — NOT archive-ready yet.**
> 0 FAIL · 12 WARN · 1 BLOCKED · 11 PASS.
> All three tasks shipped, and the code in the working tree today still delivers them. Two things stop archiving: the build-integrity gates have not been run in this session (**BLOCKED**, the Leader runs them), and one keyboard defect needs a falsifier run (**W-02**: pressing Enter or Space on "Make Primary" probably deselects the SP). Static analysis strongly suggests W-02 is real, but under K-004 a red that nobody has seen cannot be called a FAIL.

---

## 1. Document Control

| Property | Value |
| --- | --- |
| Spec path | `docs/specs/changes/pool-funding-ux-improvements` |
| Implementation commit | `c5b04bfa` (2026-08-20), an ancestor of `HEAD` on `institutional-kpis` |
| Validated against | the working tree on 2026-11-13, **not** the commit snapshot |
| Auditor | T3 Auditor, Claude Opus 5.5. Author ≠ auditor: the implementation was produced on Antigravity, per `execution.md` |
| Inputs read | root `CLAUDE.md`, `client/research-indicators/src/CLAUDE.md`, `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`. There is no `test-report.md`, so coverage was verified directly against the code and the co-located specs |
| Session constraints | No build, test, lint or type-check commands were run, because two sibling validations share this checkout (root `CLAUDE.md` §4.3 concurrency rule). Evidence comes from Read, Grep and git only |

## 2. Summary

| Area | Result | One-line reason |
| --- | --- | --- |
| Task completion | PASS | T-PFU-01, 02 and 03 each have a Reviewer PASS in `execution.md` |
| File existence | PASS | Every intended file exists. `sp-toc-alignment-block.component.scss` was listed but never touched (harmless) |
| Build integrity | **BLOCKED** | Not run in this session; pending the Leader's gate run (§5) |
| Requirement coverage | WARN | 7 of 12 rows PASS and 5 WARN. Gaps: keyboard behaviour, CLS, a single-SP state race |
| Code quality / 4R | WARN | Cross-spec drift against R-BIL-127 AC.4, dead code, and Tailwind `slate-*` used instead of `--ac-*` tokens |
| Design conformance | WARN | The design gate is unverified (no detector, no running app). Out-of-scope PNG assets. LOC tripwire exceeded |
| Constitution impact | WARN | `docs/ux-ui/design.md` was never updated for this UX change |
| Post-close drift | PASS (notes) | 19 later commits touched the page. None removed the delivered behaviour; 2 superseded copy or styling (§8.2) |

## 3. Task Completion

| Task | `tasks.md` | `execution.md` evidence | Result |
| --- | --- | --- | --- |
| T-PFU-01: single-SP auto-select and card | `[x]` ×5, status done | Attempt 1 FAIL (a hex literal and a missing `tabindex`); attempt 2 PASS, 118/118 | PASS |
| T-PFU-02: multi-SP cards, inline Primary, Pending removal | `[x]` ×5, status done | Attempt 1 PASS, 124/124 | PASS |
| T-PFU-03: ToC skeletons and regression | `[x]` ×4, status done | Attempt 1 FAIL (`aria-busy`, banner style); attempt 2 PASS, 200/200 | PASS |

Doc hygiene (part of W-12): the `tasks.md` header still reads `Status: not-started`, and `requirements.md` and `design.md` read `in-review`, although `execution.md` says `completed`.

## 4. File Existence

| File (design §2.1 / tasks) | Exists | Touched by `c5b04bfa` |
| --- | --- | --- |
| `.../pool-funding-alignment/pool-funding-alignment.component.ts` | yes | +115 / −15 |
| `.../pool-funding-alignment.component.html` | yes | +97 / −115 |
| `.../pool-funding-alignment.component.scss` | yes | +1 (a blank line only) |
| `.../pool-funding-alignment.component.spec.ts` | yes | +226 / −40 |
| `.../sp-toc-alignment-block/sp-toc-alignment-block.component.ts` | yes | +2 / −1 (`SkeletonModule`) |
| `.../sp-toc-alignment-block.component.html` | yes | +18 / −3 |
| `.../sp-toc-alignment-block.component.scss` | yes | **not touched** (listed in T-PFU-03) |
| `.../sp-toc-alignment-block.component.spec.ts` | yes | +8 / −4 |
| `client/research-indicators/public/sps/SP01..SP13.png` | yes | **not in any task or design**: 13 icons grew from about 0.8 KB to about 27 KB each (W-09) |

## 5. Build Integrity

**Result: BLOCKED — pending the Leader's gate run.** By instruction, nothing was executed in this session.

Recommended gates. Run them from `client/research-indicators/` in the window after every delegated agent has reported, never concurrently:

| # | Command | What it proves | What it cannot reach (KZ-017) |
| --- | --- | --- | --- |
| G-1 | `npx jest src/app/pages/platform/pages/result/pages/pool-funding-alignment --coverage=false --silent` | The 3 spec files in the feature folder (main, block, and util) pass | Does not type-check (`isolatedModules`); does not exercise real keyboard activation |
| G-2 | `npx tsc -p tsconfig.spec.json --noEmit 2>&1 \| grep -E 'pool-funding-alignment'` | Type errors in the two spec files. Compare the count against `git stash` (before) per child guide line 276; do **not** gate on the global total | Production templates |
| G-3 | `npm run build` | App and `strictTemplates` type-check of both templates | Spec files |
| G-4 | `npx eslint src/app/pages/platform/pages/result/pages/pool-funding-alignment` | Lint without `--fix` (K-001) | `*.spec.ts` (ignored by the flat config) |
| G-5 *(falsifier for W-02)* | Add a temporary test that selects SP01 and SP02, focuses `[data-testid="pf-alignment-set-primary-SP02"]`, dispatches `new KeyboardEvent('keydown', {key:'Enter', bubbles:true})`, and asserts `isSelectedSp('SP02') === true` | Whether the card's `(keydown.enter)` swallows the button's activation | jsdom does not synthesize the click that follows a keydown, so a manual browser check is still needed |

## 6. Requirement Coverage

| Req / scenario / clause | Code evidence (working tree) | Test evidence | Result |
| --- | --- | --- | --- |
| **R-PFU-001 S1.1**: auto-select, auto-Primary, ToC draft on "Yes" | `pool-funding-alignment.component.ts:595-619` | `spec.ts:2648-2661` | PASS |
| S1.1: card shows icon, code, %, name, Primary badge | `html:250-273` | `spec.ts:2663-2681` | PASS |
| S1.1 **BUT** no dropdown | `app-multiselect` no longer imported (`ts:66-76`) | `spec.ts:2683-2691` | PASS |
| S1.1 **AND** no separate radio question | `pf-alignment-primary-section` removed | `spec.ts:2693-2701` | PASS |
| S1.1 **AND IT MUST** transition to the ToC block | `primarySelectedSp` drives the block (`html:522-537`); the catalog is fetched on init (`ts:566`) | **No test** asserts the block after single-SP "Yes" | **WARN (W-01)** |
| S1.2: "No" clears the selection, Primary and drafts | `ts:620-630` | `spec.ts:2703-2712` | PASS |
| **R-PFU-002 S2.1**: card grid for all SPs | `html:275-348` | `spec.ts:2722-2737` (presence only; icon, % and title not asserted on multi cards) | PASS |
| S2.2: a single pick becomes Primary | `ts:695-708` (`primary_sp_code ?? spCode`) | `spec.ts:2739-2747` | PASS |
| S2.3: one-click Make Primary, badges switch | `html:335-343`, `ts:715-719` | `spec.ts:2771-2789` (method call) | PASS for mouse |
| S2.3 **AND** the ToC block switches | via `onPrimaryChange` → `primarySelectedSp` | `spec.ts:823-834` (R-BIL-128 AC.4) | PASS |
| S2.3 keyboard path for Make Primary | The button sits **inside** a `role="checkbox"` card whose `(keydown.enter)` and `(keydown.space)` call `toggleSp` (`html:294-296`). `setPrimarySp` stops only the **click** (`ts:716`), so a keydown on the button bubbles up and deselects the SP | none | **WARN (W-02)**, likely defect; falsifier G-5 |
| S2.3 **BUT** no separate radio section | removed | `spec.ts:2804-2818` | PASS |
| **R-PFU-003 S3.1**: no Pending badge | No `Pending` or `mapping_status` left in either template (grep: 0 hits) | `spec.ts:2281-2304`, `2804-2818` | PASS. Dead constant `PENDING_SP_TAG` remains at `ts:178` (advisory) |
| **R-PFU-004 S4.1**: skeletons, banner, `aria-busy` | Block `sp-toc-alignment-block.component.html:95-118`; parent-level `html:413-433` (added later by `bb8b587f`) | block `spec.ts:1171-1181`; parent `spec.ts:1937` | PASS (copy now says "PRMS", superseded; see §8.2) |
| S4.1 **BUT** no broken hanging dropdown | the level select is absent while loading | block `spec.ts:1180` | PASS |
| S4.2: no layout shift (CLS < 0.05) | skeleton heights match the controls (42/42/70 px) | **none**: jsdom cannot measure CLS, and no manual record exists | **WARN (W-03)** |
| S4.3: `role="alert"` and Retry | block `html:119-136`; parent `html:434-448` | block `spec.ts:1183-1191` | PASS |
| **NFR-PFU-001** a11y | `tabindex`, `role` and `aria-checked` present | Attributes asserted (`spec.ts:2734-2736`), but **no keydown test anywhere** (grep `keydown` in `spec.ts`: 0 hits), `aria-checked="true"` never asserted, contrast not verified, and a button is nested inside `role="checkbox"` (axe `nested-interactive`) | **WARN (W-04)** |
| **NFR-PFU-002** clicks and CLS | single-SP needs 1 click (S1.1) | method-level only; CLS unmeasured | **WARN (W-05)**, CLS part |
| **NFR-PFU-003** contract | Payload shape unchanged; `onContributionChange` and `toggleSp` write the same `AlignmentFormData` fields | existing save and payload suites in `spec.ts` (pending G-1) | PASS (subject to G-1) |

**Single-SP state race (part of W-01).** `isSingleSp()` requires `mappingStatus() === 'mapped'` (`ts:268`), but the Yes/No radios are enabled while the SPs are still loading (`html:128`). If the user answers "Yes" before the SPs resolve, auto-selection is skipped. Once the SPs arrive, the card renders from `sciencePrograms()[0]` with a hard-coded **Primary** badge (`html:268-272`), not from `formData()`. The card then says "Primary" while `selected_sps` is empty, Save stays disabled, and `spRequiredMessage` asks the user to "Select at least one Science Program" with no control available to do so. The workaround is No → Yes. The same mismatch occurs when a saved alignment holds a selection that differs from today's single mapped SP. No effect reconciles the two.

## 7. Linting & Code Quality

Linting: **BLOCKED** (G-4 not run). The rows below come from static review only.

| ID | Lens | Finding | Evidence | Result |
| --- | --- | --- | --- | --- |
| W-06 | Reliability (cross-spec) | Deselecting the Primary card now **auto-promotes** `remaining[0]`, even when 2 or more SPs remain. Archived spec `bilateral/primary-contributing-sp` R-BIL-127 AC.4 says deselecting the Primary **clears** it. The AC.4 tests (`spec.ts:1003-1023`, `1035+`) still pass, but they drive `onSpSelectionChange()`, which **no template calls any more**, so they verify a path the UI cannot reach (KZ-017). The destructive-removal path still clears (`ts:815`), so the two deselect paths now disagree. The tasks.md note sanctioned promotion only for the "exactly 1 remains" case | `ts:676-679`, `ts:731-741` | **WARN** |
| W-07 | Design tokens | Tailwind palette classes (`bg-slate-50`, `bg-slate-200/80`, `text-slate-700`, `border-slate-300`) were introduced instead of `--ac-*` tokens, so they do not follow dark mode. No hex literal was introduced. Pre-existing `bg-[#fcfcfc]` (`html:5`, from `c0645b58`, 2026-07-22) is out of scope and already logged in `docs/ux-ui/design.md:566` | `html:286`, `html:331` (blame `c5b04bfa`) | **WARN** |
| A-1 | Readability (advisory) | Dead code left behind: `PENDING_SP_TAG` (`ts:178`), `PRIMARY_ROLE_LABEL` and `CONTRIBUTING_ROLE_LABEL` (the badges hard-code the text), `onSpSelectionChange()` (no template caller) | grep counts | advisory |
| A-2 | Readability (advisory) | A nested ternary whose two branches are identical: `remaining.length === 1 ? remaining[0]… : (remaining.length > 0 ? remaining[0]… : null)` | `ts:678` | advisory |
| A-3 | a11y (advisory) | The single-SP card is `tabindex="0"` with `role="region"`: a focus stop with no action | `html:251-254` | advisory |
| A-4 | Risk (advisory) | `toggleSp` does not check `versionLocked()`, while `primaryControlDisabled` does. Behaviour is unchanged from the old multiselect, but now combined with the auto-promotion in W-06 | `ts:666` | advisory |
| — | Unresolved ADVISORY entries in `execution.md` | none recorded | — | — |

## 8. Design Conformance

### 8.1 Against `design.md`

| Item | Result | Note |
| --- | --- | --- |
| §3.1 `onContributionChange` | PASS | Matches, except that it uses `sp.code` for `official_code` (the picker DTO has no `official_code`) |
| §4.1 single-SP card (DD-1) | PASS | Badge copy is "Primary", not "Primary Program" (cosmetic) |
| §4.2 multi-SP states (DD-2) | WARN (W-07) | The contributing state uses `bg-slate-50`, where the design specifies `bg-[var(--ac-primary-blue-50)]/30` |
| §4.3 skeletons (DD-4) | PASS | The design itself prescribes hex (`#F4F7F9`, `#074B86`), which the code **correctly** replaced with tokens. Spec doc defect, part of W-12 |
| §7 budget: 3 tasks, ~220 LOC, tripwire > 350 LOC | **WARN (W-10)** | Actual: about 232 production LOC added plus about 234 test LOC, roughly 466 in total. That exceeds the tasks.md tripwire (`> 350 LOC triggers escalation`) and no escalation was recorded |
| Scope: high-res SP icons | **WARN (W-09)** | 13 PNGs (+~340 KB of public assets) shipped under the commit title "high-res icons" with no requirement, task or design entry |
| Design review gate (impeccable detector, first-visit fold check) | **WARN (W-08), unverified** | No running app and no detector in this session. `Unevaluated (engine not run)` |

**Cross-document figure check.** The `execution.md` test counts are consistent with each other: 124 (main) + 76 (block) = 200. Design §7 and tasks §4 both say "~220 LOC", which is one figure copied forward; the diff contradicts it (W-10). Requirements S4.1's example copy ("…indicators for SP06 from CLARISA…") differs from design DD-4 ("…catalog from CLARISA…"). The code follows DD-4, and the requirement is phrased "e.g.", so this is not a finding.

### 8.2 Post-close drift (19 commits after `c5b04bfa` touched the folder)

| Commit | Effect on delivered behaviour | Classification |
| --- | --- | --- |
| `bb8b587f` quick/pool-funding-catalog-skeleton | Added parent-level ToC skeletons (`html:413-433`), which strengthens R-PFU-004 | note (extends) |
| `fe848272` quick/pool-funding-loading-copy | Banner copy changed from "CLARISA" to "PRMS" in both templates and the block spec | **superseded** by a later spec, note |
| `ce666ff0` quick/pool-funding-sps-skeleton | SP-list skeleton (`html:215-227`) | note (extends) |
| `7a4bbca2` bilateral/pool-funding-reporting-year | Card `cursor-not-allowed` / `aria-disabled`, plus a display-only branch that bypasses the cards | note (compatible) |
| `24ec58e2`, `b14e3d65`, `871c86e1`, `0b93cb82`, `7dd52445`, others | Orphan cards, required messages, versioning, help modal | no regression to R-PFU-* found |
| `onContributionChange` and `toggleSp` | still authored by `c5b04bfa` (blame `ts:670-690`: 21/21 lines) | intact |

No later commit removed or regressed the R-PFU behaviour.

## 9. Test Evidence Summary

| Source | Status |
| --- | --- |
| `test-report.md` | **absent** (no `/akili-test` run). Coverage was re-derived directly (§6) |
| `execution.md` runs | 118 → 124 → 200/200 green on 2026-08-20. Stale: the main spec file has since grown to 3,458 lines |
| Re-run in this session | **not run** (session constraint). G-1 is needed |
| Gaps | No keydown or interaction tests (W-02, W-04); no CLS evidence (W-03); no test for the ToC block after single-SP "Yes" (W-01); R-BIL-127 AC.4 tests exercise an unreachable path (W-06) |

## 10. Agent Guide / Constitution Impact

| Item | Result |
| --- | --- |
| `## Constitution Impact` in `execution.md` | absent |
| `docs/ux-ui/design.md` | **WARN (W-11)**. Its decisions log has no entry for multiselect → cards, removal of the Primary radio, or removal of the Pending tag. Line 564 still describes "the Primary radio group" under version lock, a control that no longer exists; the trap it describes now behaves differently because of W-06. This is pending work for `/akili-archive` (Constitution & Graph Sync) |
| Child `CLAUDE.md` | no module boundary moved, so no change needed |

## 11. Remediation

| ID | Severity | Action | Owner path |
| --- | --- | --- | --- |
| W-02 | **High** (likely a defect) | Run falsifier G-5 and a manual browser check. If it goes red: add `(keydown.enter)` and `(keydown.space)` handlers with `$event.stopPropagation()` on the Make Primary button, or move the button outside the `role="checkbox"` element (this also fixes axe `nested-interactive`). Add keydown tests for the card and the button | fix (`/akili-quick` or a bugfix spec) |
| W-06 | High | Decide between "auto-promote" and "clear" for deselecting the Primary. Make `toggleSp` and the destructive path agree. Re-point the R-BIL-127 AC.4 tests at `toggleSp`, or amend R-BIL-127 AC.4 and record the decision | spec decision, then a fix |
| W-01 | Medium | Render the single-SP card from `formData()` (or seed the selection by effect once the SPs resolve), and add a test that the ToC block renders after single-SP "Yes" | fix |
| W-04 / W-05 / W-03 | Medium | Add keyboard tests asserting `aria-checked` toggles. Record a manual CLS or contrast check, or accept CLS as unverified | tests and a manual record |
| W-07 | Low | Replace the `slate-*` classes with `--ac-grey-*` tokens | fix |
| W-08 | Low | Run the design gate (impeccable detector) on a running app, plus a first-visit fold check | `/akili-audit design` |
| W-09 / W-10 | Low | Record the PNG scope addition and the LOC overrun in `execution.md`, or accept them | doc |
| W-11 | Low | Add a `docs/ux-ui/design.md` decisions-log entry and correct line 564 | `/akili-archive` |
| W-12 | Low | Fix the header statuses, replace the `file:///Users/jcadavid/...` absolute links in the spec docs with relative ones, and remove the hex values from design §4.3 | doc |
| BLOCKED | — | Run gates G-1 to G-4 | Leader |

## 12. Archive Readiness Recommendation

**Not archive-ready.** Re-validate, or record acceptance, after:

1. G-1 to G-4 are run and green (the BLOCKED item is cleared).
2. W-02 has been run through G-5. If it goes red, it becomes a FAIL and must be fixed before archiving.
3. W-06 is either decided and fixed, or recorded as an accepted decision.

The remaining WARNs can be accepted or carried as follow-ups. Once those three conditions are met:

```text
/akili-archive changes/pool-funding-ux-improvements
```
