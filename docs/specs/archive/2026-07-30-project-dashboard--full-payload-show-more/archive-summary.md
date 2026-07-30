# Archive Summary — Project Dashboard / Full-payload migration + Show-more + title alignment

> **Delivered and archived with one requirement's acceptance still open.** All 8 tasks carry a Reviewer PASS, the full client suite is green at 304/6234 with ~99% coverage, and the constitutional docs are synced. **NFR-PDB-004 is reported UNVERIFIED, never passed** — its only gate is a human check the owner has not run. Two further items are owner-owned. This is a traceable open state, not a hidden gap.

## 1. Document Control

| Field | Value |
| --- | --- |
| **Original spec path** | `docs/specs/project-dashboard/full-payload-show-more/` |
| **Archive path** | `docs/specs/archive/2026-07-30-project-dashboard--full-payload-show-more/` |
| **Archive date** | 2026-07-30 |
| **Spec id** | 2026-07-full-payload-show-more |
| **Module** | project-dashboard (STAR client) |
| **Owner** | d.casanas@cgiar.org |
| **Branch** | `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator` |
| **Ticket** | AC-1672 |
| **Final status** | ✅ **Delivered** · ⚠️ **NFR-PDB-004 acceptance UNVERIFIED** |

## 2. Final Status

| Gate | Result |
| --- | --- |
| Tasks T-01 … T-08 | ✅ all Reviewer PASS |
| T-09 (keyboard-operable overlay) | ⬜ **owner-deferred**, not required for this PR chain |
| Full client suite (with coverage) | ✅ **304 suites / 6,234 tests**, coverage **99.34 / 98.24 / 99.16 / 99.57** vs floors 40/20/45/30 |
| `npm run build` · `npm run lint` | ✅ clean |
| `npm run s-lint` | ⚠️ 352 pre-existing errors, **provably unchanged** — criterion unmet as literally written, owner decision open |
| Validation | 🟡 **CONDITIONAL PASS** — 2 FAIL (both fixed) / 8 WARN (6 fixed, 2 owner-owned) |
| **NFR-PDB-004** | ⚠️ **UNVERIFIED** — mechanism measured, acceptance not run |

## 3. Requirements Delivered

| ID | Requirement | Status |
| --- | --- | --- |
| R-PDB-001 | Single-source payload — one `reports/full` per contract | ✅ AC.1-AC.5 |
| R-PDB-002 | Collapsed view shows the top 5 | ✅ AC.1-AC.5 |
| R-PDB-003 | In-place expansion via a "Show more" toggle | ✅ AC.1, AC.3-AC.7 · 🟡 **AC.2 unticked** — "zero network on expand" is true by construction but asserted nowhere (validation V-9) |
| R-PDB-004 | Encoding invariant across expand/collapse | ✅ all |
| R-PDB-005 | Payload-derived identity keys, homonyms distinct | ✅ all |
| ~~R-PDB-006~~ | *Moved to `../geo-scope-expansion/`* | — |
| R-PDB-007 | Four chart titles renamed | ✅ all — **confirmed on the real screen** |
| R-PDB-008 | Retire the four superseded services | ✅ AC.1-AC.5 |
| NFR-PDB-001 | Request reduction **7 → 4** | ✅ |
| NFR-PDB-003 | Toggle accessibility | ✅ · known gap: the scroll container is not keyboard-operable (**T-09**) |
| **NFR-PDB-004** | Layout containment | ⚠️ **mechanism measured, acceptance UNVERIFIED** |
| NFR-PDB-005 | Test and lint floors | ✅ (see `s-lint` caveat) |

**32 of 37 acceptance criteria ticked.** Five deliberately open: R-PDB-003 AC.2 (unasserted) and the four human sign-off gates.

## 4. Files Changed Summary

| Area | Change |
| --- | --- |
| **New** | `contract-full-reports.interface.ts`, `get-full-contract-reports.service.ts` (+ spec), `contract-full-reports.mock.ts` |
| **Modified** | `api.service.ts` (+ spec), `project-dashboard.component.{ts,html,spec.ts}`, `project-dashboard-card.component.{ts,html,spec.ts}`, `project-dashboard.interface.ts` |
| **Deleted** | 4 `get-top-*.service.ts` + their 4 specs — **468 LOC**, matching the spec's measured estimate exactly |
| **Constitutional** | `docs/ux-ui/design.md` §8.1/§10.1/§12.2 · `docs/trd/trd.md` §3.2 (`PERF-5`)/§6.3 |
| **Total** | ≈1,470 changed LOC vs ≈1,600 budgeted |

**PR chain (4):** T-01 · T-02+T-03+T-04 · **T-05+T-06+T-07 (the first PR a user notices)** · T-08.

## 5. Test Evidence Summary

**No `test-report.md`** — `/akili-test` was deliberately not run, and validation ruled the omission justified: every task authored its own gates and each was **proven by mutation**, a higher bar than a green suite.

| Suite | Evidence |
| --- | --- |
| `project-dashboard-card.component.spec.ts` | 27/27 — real template, no stub |
| `project-dashboard.component.spec.ts` | 848 → ~1,124 lines; host↔card seam gated per card |
| `get-full-contract-reports.service.spec.ts` | `HttpTestingController` — URL + `contract-id` encoding |
| Full suite | 304 / 6,234 green, coverage ~99% |

**Mutation evidence — the load-bearing part.** Across the run, independent Reviewers ran and killed: **16 mutants** (T-07), **8** (T-08 per-card bindings), **9** (validation). Notably, `(expandToggled)` deleted from each of the four cards now reddens 4/4 — it did not before A-07.6.

**Geometry, measured in real Chrome, not argued:** DD-14 reads **zero delta on all four links, both directions**, across six-to-seven viewports; the `max-height` control reproduces the real component's **+52px / +13px** failures to the pixel. Raw runs committed under `./evidence/`.

## 6. Validation Summary

🟡 **CONDITIONAL PASS.** The auditor re-derived rather than trusted: reproduced the suite and coverage exactly, ran 9 of its own mutants, and re-measured DD-14 across six viewports.

Six of seven Leader judgment calls upheld. The seventh was incomplete — `tasks.md`'s header and its T-06 entry still claimed the mockup modelled DD-13 and the docs were unsynced, both closed hours earlier. **Two internal contradictions in one file, fixed same day.**

## 7. Accepted Warnings & Follow-Ups

**Owner-owned, open at archive:**

| # | Item |
| --- | --- |
| 1 | **The six-step human check** (`requirements.md` §7). Reference artefact corrected and measurement-verified, so it is **unblocked**. Partially evidenced by owner screenshots of contract A1578 (steps 1 and 3 observed). **NFR-PDB-004 stays UNVERIFIED.** |
| 2 | **`s-lint` decision** — accept "introduces no *new* errors" or drop the criterion. 352 pre-existing errors across 44 unrelated `.scss` files. |
| 3 | **Product-owner acknowledgement** of the four visible changes. |

**Carried forward:**

| # | Item |
| --- | --- |
| **T-09** | The DD-14 overlay is not keyboard-operable — **5,903px of content in a 228px box** unreachable by keyboard. WCAG 2.1.1. Honestly declared in `docs/ux-ui/design.md` §10.1. |
| A-07.2 | `institution_id: null` from the endpoint would yield duplicate `@for` keys (NG0955). The SQL prevents it; **nothing enforces that at the client boundary**. |
| A-08.2 | Five now-dead declarations in `project-dashboard.interface.ts` — deliberately left (outside R-PDB-008's enumeration *and* T-08's fence). Natural home: `../geo-scope-expansion/`. |
| A-08.4 | **Spec files have no static dead-code gate in this repo** — eslint ignores `**/*.spec.ts`, Jest is transpile-only. "Lint clean" is never evidence about spec imports. |
| A-HC.1 | The expanded list has no visible scroll affordance (macOS hides scrollbars). Same surface as T-09. |
| V-7 | `docs/infrastructure.md` has no `## Local Environment` contract → `/akili-constitution` Step 6B. |
| RB-3 | `project-detail.component.ts` route staleness — a split-brain page reachable in production today. Pre-existing, deliberately untouched. |

## 8. Historical Notes

**The pivot.** DD-13 — conditionally switching the ranked grid to `align-items: start` — passed **three rounds of blind dual review** and was wrong: `align-items` governs how a shorter item sits inside a track, never how the track is *sized*. Its replacement's first attempt (a static `max-height`) also read as correct and measured **+52px**. **DD-14 freezes the geometry** instead: an in-flow 5-row render defines the box, an out-of-flow overlay carries the full list and contributes nothing to sizing. Viewport-independent — the structural reason it cannot fail the way `46vh` did.

**GATE-2 was closed twice.** The first closure rested on a mockup that could not model the defect it settled — the artefact used to close the gate, derive DD-13 and serve as the human check's reference **reproduced the blind spot it existed to catch**. Re-closed 2026-07-30 on measurement.

**Budget exceeded and escalated, not absorbed.** 3 rework rounds vs 2; 9 tasks vs 8. The run **halted at the tripwire and waited for the owner** rather than continuing. Round 3 is what found A-07.6.

**Environment.** Five Implementer spawns were lost to sustained API 529s, parking the run for a day; T-06 ran on `opus` under a recorded routing waiver, mitigated by disclosing it to the Reviewer, which built its own probe.

**Kaizen:** lessons **KZ-004, KZ-005, KZ-006** recorded and applied to the `general-setup` templates; **KZ-001** raised to recurrence 5; **KZ-003** held for the first time.
