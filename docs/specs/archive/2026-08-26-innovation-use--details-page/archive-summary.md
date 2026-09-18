# Archive Summary — Results (Innovation Use) / Details Page (STAR)

> **Delivered.** The Innovation Use details section ships: a 0–9 use-level stepper with definitions, repeatable actors with disaggregated counts and a derived total, repeatable organizations, other quantitative measures, conditional level justification, and the reachability wiring that lets a user create an indicator-6 result and open it. **Client tier only — zero server files, zero migrations.**
>
> **Archived at WARN, not PASS, and the reason is on the record:** the last remediation was Leader-authored and its fixes were never independently audited. The user accepted that gap explicitly. Two live light-theme AA defects also ship, deliberately deferred and now tracked as accessibility defects rather than styling debt.

---

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/innovation-use/details-page` · id `2026-08-innovation-use-details-page` |
| Family | Child **3 of 3** of [`docs/specs/innovation-use/family.md`](../../innovation-use/family.md) — the visible deliverable of the chain |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Approval Mode | **gated** — the continue/pause gate stopped for the user after every task |
| Archive date | **2026-08-26** |
| Final status | ✅ **Complete — archived at WARN, 0 FAIL**, on two explicit user acceptances (§9) |

## 2. Original Spec Path

`docs/specs/innovation-use/details-page/` → `docs/specs/archive/2026-08-26-innovation-use--details-page/`

## 3. Final Status

| | |
|---|---|
| Tasks | **14 / 14 `done`** (13 + `T-14` by Amendment 01) · **120 / 120** criteria discharged |
| Validation | **WARN — 0 FAIL.** All five blocking findings closed; re-issued 2026-08-26 |
| Suite | **316 suites / 6741 tests** green · coverage **98.19 / 96.30 / 97.76 / 98.49** vs floors 40 / 20 / 45 / 30 |
| Build | exit 0 · 0 errors · **1.33 MB raw / 274.88 kB transfer** vs a 2 MB warning |
| Lint | `All files pass linting.` with a clean tree after — the load-bearing half, since the script carries `--fix` |
| Budget | **6,133 LOC / 23 of ~31 review rounds** vs ~3,400 written / ~4,800 re-baselined — **+80.4% / +27.8%**. Tripwire breached, ruled on by the user **three times**, not re-escalated |

## 4. Requirements Delivered

**21 requirements · 97 acceptance criteria · 45 scenario clauses**, owned at clause granularity by a named task criterion — machine-verified in range, with requirement-ID presence explicitly **not** accepted as closure.

| Group | Delivered |
|---|---|
| `R-IUP-001`…`005` | Section reachability, contract layer, use-level catalog ordered by `level` (never by `id` — `id = level + 1`), green-check wiring |
| `R-IUP-006`…`012` | Actors (type, OTHER name, aggregate/disaggregated mode switch, derived total), organizations (known/unknown, type + sub-type), quantifications, `0`-is-valid semantics |
| `R-IUP-013`…`016` | Load, save, re-read, cross-row validation, save guards, the four UI states |
| `R-IUP-017`, `018` | STAR visual language both themes · accessibility and budget |
| `R-IUP-019` | **Non-regression on Innovation *Development*** — held byte-identically; `git diff --exit-code` clean on all three paths |
| `R-IUP-020`, `021` | **Amendment 01** — level-selector guidance copy, use-level calculator + definitions links, evidence callout with in-app navigation |

## 5. Files Changed Summary

| Kind | Files |
|---|---|
| **New — page** | `innovation-use-details.component.{ts,html}` + three child components (`level-stepper`, `actor-item`, `organization-item`) |
| **New — contract** | `get-innovation-use-details.interface.ts`, `get-innovation-use-levels.interface.ts`, `get-innovation-use-levels.service.ts` |
| **Promoted** | `quantification-item/` → `shared/components/` via three true `git mv` renames (`DD-3`) — **a new shared public surface**, see §9 |
| **New — styles** | `src/styles/responsive-size.scss` (~4,089 selectors) — created because `RB-9` established the `.rs-*` / `.fs-*` families **had no implementation anywhere in the app** while four constitutional documents mandated them |
| **Modified** | `app.routes.ts` · `result-sidebar.component.ts` · `cache.service.ts` · `get-green-checks.interface.ts` · `api.service.ts` · `input.component.{ts,html}` · `indicators.service.ts` (allowlist) · `oicr-details.component.ts` (import path only) |
| **Not touched** | `actor-item`, `organization-item`, `innovation-details.component.*` — `DD-2` leaves all three byte-identical |

## 6. Test Evidence Summary

**No `test-report.md` exists** — `/akili-test` was never run as a separate phase, and `/akili-validate` verified coverage directly. Recorded as an accepted absence, not an oversight.

| | |
|---|---|
| Gate falsifier | A targeted `innovation-use` run collects **6 of 316 suites** and is recorded **inconclusive, not a pass** — the gate proved itself |
| Strong evidence | `T-08`'s payload tests wire `buildPayload()` to the actual PATCH argument; the `id ≠ level` trap is asserted on **rendered stepper text**; the `DD-16` defect is reproduced against a real `provideRouter` tree, because the flat route mock is named as what let it through |
| **Not proven** | Rendered colour, focus rings, AT announcements. jsdom applies no stylesheet; `R3`'s 16 assertions pin **which class won**, not which colour painted. `AR-2` stays open |

## 7. Validation Summary

Two full cycles.

| Cycle | Verdict | Outcome |
|---|---|---|
| **1** — two independent `opus` auditors, fresh context | ⛔ **FAIL** | 5 blocking (`F-1` light-theme AA · `A-2` unfocusable delete control · `F-2` a factually false scope statement · `F-3`/`F-4` budget) · 14 WARN · ~30 advisory. **`T-13` reopened**: its `c7`/`c9` discharges were retracted because both had been credited to human observations that **structurally could not see** the defects found |
| **2** — delta re-validation, one independent auditor briefed to falsify | ⚠️ **WARN** | All five closed. The auditor **reproduced rather than accepted**: nine contrast ratios recomputed in sRGB/WCAG 2.1, `F-2`'s underlying fact traced across every commit that touched the file, the budget re-derived from the branch — 20 rows and three column sums, all exact. It then returned **8 findings against the remediation itself**, all upheld and all closed |

**The most valuable thing this spec produced is that retraction.** A criterion was ticked, un-ticked on the grounds that the evidence could not have seen the defect, and then re-earned against the remediated surface. That is the methodology working as designed rather than as documented.

## 8. Accepted Warnings & Follow-Ups

| ID | Item | Owner |
|---|---|---|
| `R6`…`R10` | Stale counts and the known-false `RB-8(c)` claim · bind `[disableSave]` · check `successfulRequest` in the levels service · invoke the `VersionWatcherService` callback in a test · re-run the a11y pass · own or accept `app-input`'s duplicate DOM ids | Open — follow-up |
| `RB-5` | `quantification-item.component.html:3` at **2.9115:1** — a live light-theme AA failure. One-word fix, **but it changes every OICR details page** | User decision |
| `OQ-IUP-8` | `custom-fields.scss` shared roles: `.description` **4.20:1**, `.section-title` **2.378:1** (4 sites here) | **Its own spec** |
| `RB-8` | Two user-visible product defects: indicator-1 Home progress shows **75%** where truth is **86%**; *"7/7 sections completed"* beside a disabled Submit | No ticket yet |
| `RB-6` / `FR-7` | **[AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718)** is **not** closed by this spec | AC-1718 |
| `RB-1`, `RB-3`, `RB-4`, `RB-7` | `OQ-IUP-4` · `AR-1` no client test reaches a live API · `AR-2` no automated visual/a11y gate · judgment `I-2`/`I-3`/`I-5` | Accepted |

**Reported out of scope, unowned, and worth a ticket** — none is this spec's, all were found by it:

- **`pool-funding-alignment.component.ts:379-384`** carries the identical `paramMap.get('id')` defect at the same route depth and fails **silently**: dead primary branch, a numeric-only fallback that strips platform prefixes (`TIP-1234` → `'1234'`), misclassified non-STAR results, a prefix dropped from a redirect. Its own spec is green over it by the same `KZ-001` mechanism. Best scoped as *"audit every `route.snapshot.paramMap.get('id')` under `pages/platform/pages/result/pages/`"* — exactly two call sites today.
- **`result.component.scss:3`** — `grid-template-columns: 322px 1fr` with **no `@media` in the file**: an unconditional 322 px sidebar that cramps **every** result page at narrow viewports.
- **`src/index.html:13`** loads Tailwind v4 from **unpkg.com at runtime** with no local fallback — the app's entire visual layer has an undocumented CDN dependency. Owed to `docs/infrastructure.md`.
- **`app-input` emits duplicate cross-wired DOM ids** — six elements share one id on a single fixture, so `label[for]` resolves to another field's control. **Reachable deterministically, platform-wide.**

### The two acceptances this archive rests on

| # | Accepted by the user, 2026-08-26 |
|---|---|
| 1 | **The remediation of the 8 audit findings has no independent review.** The auditor found them; the Leader fixed them; nobody audited the fixes. The gap is real and this archive does not close it |
| 2 | **Two live light-theme AA defects ship**, both deferred on purpose, both now carried with ratios and sites as accessibility defects. **Neither has a ticket, and archiving does not create one** |

## 9. Historical Notes

**Four Pivot Records, and each one is a case of the spec being wrong rather than the code:**

| Pivot | What it found |
|---|---|
| `T-10` | `c4` contradicted its own authorizing design |
| `T-13` | **The create-result entry point was closed all along** — `indicators.service.ts:34`'s hardcoded allowlist `[1, 2, 4, 5]` dropped indicator 6 from the dropdown, independently of the server's `is_active`. Five documents had asserted the opposite, tracing to one root error: `proposal.md` audited the **server's** `IndicatorsService` and the dropdown uses the **client's same-named class.** Two tiers, one class name, wrong tier audited. `OQ-IUP-2` had called this *"a deployment fact, not answerable from the repo"* — it was answerable from the repo, and it blocked the entire human gate |
| `R-IUP-006` / `T-09` | The save-time justification guard was deleted underneath this spec by a parallel bugfix |
| `DD-16` | The copied "contract" carried an id source invalid at this component's depth — `/result/null/evidence`. **Shipped through a green suite and a Reviewer PASS**, and caught by a human clicking the link |

**`RB-9` deserves its own line.** Mid-execution it emerged that the `.rs-*` / `.fs-*` utility families **did not exist anywhere in the application** — no file defined them, `angular.json` built five stylesheets and none was theirs — while **four constitutional documents mandated them** and one routed token edits to a nonexistent path. No worker erred; every task had followed the spec correctly. Sixty of the 64 app-wide usages were this spec's own new files, rendering with inert padding, margins and gaps. Resolved by user ruling as option (a): create the stylesheet, +8.69 kB transfer, no budget warning.

**Budget, reconciled once.** `execution.md` → `T-13` `c10` is the single home and carries the deriving command per commit. The cause is spec-tier density, not scope creep: the eight tasks recording a tier split account for **≥ 3,408 spec lines against §12's ~1,500 estimate**, while the ~1,700 implementation line tracked. **The figure to correct in a future §12 is the spec estimate.**

**The lesson this spec earned**, recorded in `docs/specs/kaizen/innovation-use--details-page.md`:

> **A correction is not applied until it is applied at every site it falsifies — including the sites the correction itself creates.** A correction that *narrows* a scope must state what it drops and name the new owner; one that *strikes* a claim must re-examine every figure that claim was carrying.

It is self-demonstrating: the commit that closed the budget findings reproduced the defect it was closing, and the review-round value it published had been **carried forward from the very table it claimed not to carry forward from.**
