# Archive Summary — Project Dashboard / Indicator-metadata charts

> **Delivered and archived with one open finding carried forward.** 10 aggregation sections on `reports/full` and a 4-band, 10-card *Indicator metadata* section on the Project Dashboard. 17/17 tasks, validation **PASS / 0 FAIL**, both suites green.
>
> **The DC-8 owner visual pass ran on 2026-08-03 and found one thing: the Degree chart shows no data.** It is written up as its own defect report — [`docs/specs/project-dashboard/degree-chart-empty/`](../../project-dashboard/degree-chart-empty/proposal.md) — and is **not** diagnosed. Archiving anyway is the owner's decision, dated and recorded here rather than implied by the move.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec id | `2026-07-indicator-metadata-charts` |
| Original path | `docs/specs/project-dashboard/indicator-metadata-charts/` |
| Archive path | `docs/specs/archive/2026-08-03-project-dashboard--indicator-metadata-charts/` |
| Archive date | **2026-08-03** |
| Owner | d.casanas@cgiar.org |
| Branch | `AC-1672-Add-New-Dashboard-Charts-Based-on-Project-Indicator` |
| Umbrella | `docs/specs/project-dashboard/analytics-expansion/` — this is **Chunk B** |
| Depends on | Chunk A `full-payload-show-more` — archived 2026-07-30 (`7f6aa178`) |
| Documents retained | `proposal.md`, `requirements.md`, `design.md` (rev 4), `tasks.md`, `execution.md`, `judgment.md`, `validation-report.md`, `evidence/`, `mockup/` |

## 2. Final Status

| | |
| --- | --- |
| Tasks | **17 / 17 done**, each with a dated Reviewer PASS in `execution.md` |
| Validation | **PASS** — 0 FAIL · 9 WARN (4 remediated at `/akili-validate`, 5 carried) |
| Server suite | 324 suites / 2069 tests · coverage 84.21 / 74.62 / 84.76 / 84.27 (floor 60) |
| Client suite | 306 suites / 6292 tests · coverage 99.33 / 98.03 / 99.14 / 99.56 (floors 40/20/45/30) |
| Judgment Day | 3 rounds, terminal receipt **`ESCALATED ⚠️`** — revision 4 carries **no judgment warrant** |
| Budget | 17 tasks / ~1,600 LOC as declared · **rework rounds 4 vs 2–3 — breached and declared** |
| DC-8 visual check | **Run 2026-08-03. One finding: Degree chart empty.** See §9 |
| Product-owner acknowledgement | **Not recorded** |

## 3. Requirements Delivered

| ID | Delivered |
| --- | --- |
| R-IMC-001 | Innovation nature / type / readiness aggregations |
| R-IMC-002 | OICR maturity aggregation |
| R-IMC-003 | Policy type / stage aggregations |
| R-IMC-004 | Capacity-sharing session format / type |
| R-IMC-005 | Combined Gender distribution — symmetric sum over individual records + group participant totals |
| R-IMC-006 | Degree, restricted to Training **AND** Long-term — ⚠️ **see §9** |
| R-IMC-007 | Additive payload contract, 7 pre-existing fields untouched |
| R-IMC-008 | *Indicator metadata* section, 4 bands, 10 cards, per-instance bindings |
| R-IMC-009 | Band visibility follows `indicatorsWithResults()` |
| R-IMC-010 | Unanswered-field empty state, distinct from the hidden case |
| R-IMC-011 | Loading / error / retry inherited, no new pattern |
| R-IMC-012 | Swagger + TRD ×2 + UX/UI design record |
| NFR-IMC-001 | Latency — all three amended bounds met (174.5 ms · 92.7 ms · 19.45 ms) |
| NFR-IMC-002 | Accessibility — band toggles + the DD-14 overlay gap closed |
| NFR-IMC-003 | 0 px overflow at 390 / 768 / 1440 px, control reproduced |
| NFR-IMC-004 | Coverage floors held both packages |
| NFR-IMC-005 | Blast radius — full client suite after the multi-host card edit |

**All 47 acceptance criteria checked**, traced requirement → file:line → gate in `validation-report.md` §6.

## 4. Files Changed Summary

| Package | New | Modified |
| --- | --- | --- |
| Server | `indicator-metadata-reports.repository.ts` (+spec) · `reports-indicator-metadata.dto.ts` · `gender-distribution.util.ts` (+spec) · `primary-contract-results.util.ts` (+spec) · `session-type.enum.ts` · `agresso-contract.swagger.spec.ts` | `reports-full.dto.ts` · `agresso-contract.repository.ts` (signature only) · `.service.ts` · `.controller.ts` · `.module.ts` |
| Client | `indicator-metadata-bands.mapper.ts` (+spec) · `indicator-metadata-band.component.{ts,html,scss,spec.ts}` | `contract-full-reports.interface.ts` · `contract-full-reports.mock.ts` · `get-full-contract-reports.service.ts` · `project-dashboard.component.{ts,html,spec.ts}` · `project-dashboard-card.component.{html,spec.ts}` · `styles/colors.scss` |
| Docs | `validation-report.md` · this file | `docs/trd/trd.md` (×2) · `docs/ux-ui/design.md` (§7.1, §8.1, §10.1, §12.2) |

**No migration. No schema change. No auth change.** Backout is a revert of either package independently.

Two files exist beyond design §3.1, both authorised: `primary-contract-results.util.ts` (RB-10 — the scoping predicate was `private` and therefore unreachable as §4.2 required) and `agresso-contract.swagger.spec.ts` (DC-10 promoted from a manual gate to CI).

## 5. Test Evidence Summary

No `/akili-test` run — each task authored and shipped its own gates, which validation ruled justified. There is therefore **no `test-report.md`**; evidence lives in `execution.md` and `evidence/t16-report.md`.

| Gate | Notable because |
| --- | --- |
| `gender-distribution.util.spec.ts` | **Group-only fixture**, mutation-killed both directions. T-01 measured what it protects: group format carries 6,057 M / 31,436 F against individual's 99 records — the merge rule the design prohibited would have discarded ~37,000 reported participants |
| `indicator-metadata-reports.repository.spec.ts` | Branch-position-**pinned** SQL assertions. A plain `toContain` passes under a cross-wire (both literals still exist in the text); pinning is what makes it red |
| `agresso-contract.swagger.spec.ts` | Asserts the 200 carries a `$ref` and **no `$ref` in the document dangles** — deliberately not the field names, which would be churn |
| `project-dashboard.component.spec.ts` | 10 per-instance bindings (KZ-005), 4 visibility cases incl. all-non-primary, DC-13 at **both** directions of the 5-category boundary |
| `evidence/t16-report.md` | 0 px overflow at three widths measured at **three levels**; the KZ-006 control reproduces 594/598 px *while the document metric reads 0* |

**0 PRODUCT_BUGs, 0 HALTs, 0 FATAL_FAILs.**

## 6. Validation Summary

`validation-report.md`, 2026-07-31 — **PASS, 0 FAIL**. Every gate re-run independently rather than reusing recorded numbers. Four documentation WARNs were remediated in that session: the `--ac-chip-blue-*` fold-in to the UX/UI token registry (a hand-off `design.md` §7.6 assigned to T-17 that T-17's charter never carried), `tasks.md`'s stale header, the 47 unticked ACs, and two stale RB rows.

## 7. Accepted Warnings

| # | Carried |
| --- | --- |
| W-1 | Rework budget breached, 4 vs 2–3 — declared, with the cause isolated to correction-record meta-work rather than the feature |
| W-2 | Server coverage "not regressed" is **directional**, not byte-precise (≤0.09 pp unexplained delta on identical source) |
| W-9 | `MetadataCountDto.name!: string` over-promises against three genuinely nullable label columns — and this spec published that schema for the first time |
| W-10 | `indicator-metadata-band.component.scss:114` still carries the 2×2 claim DD-7 retracted. Owner declined the layout change |
| W-11 | T-15's *"scrollable by keyboard alone"* was never observed on the shipped overlay — focusability is proven, scrolling inferred. Disclosed precisely in `evidence/t16-report.md` and `docs/ux-ui/design.md` §10.1 |

## 8. Follow-Ups

| Item | Home |
| --- | --- |
| **Degree chart shows no data** — the DC-8 finding | [`docs/specs/project-dashboard/degree-chart-empty/`](../../project-dashboard/degree-chart-empty/proposal.md) |
| `results_by_status` server-side migration (B-F1) | Own spec, deferred by the requester |
| Click-to-filter on the new cards | Chunk C2 |
| Geographic card / Leaflet | Chunk A2 / Chunk D |
| No `## Local Environment` contract in `docs/infrastructure.md` (RB-2) | `/akili-constitution` Step 6B |
| Explicit `poolSize` (R-4) | Its own change — DD-11 removed this spec's need for it |

## 9. Historical Notes

**The DC-8 pass, recorded exactly.** `requirements.md` §9 named DC-8 — visual quality: spacing, contrast, truncation, band order, colour ramp — as this spec's **dominant** defect class and the one with no possible mechanical gate, with the owner as gate of record. It ran on **2026-08-03** and surfaced **one finding: the Degree chart shows no data**. Two things are true and both belong in the record: the check **earned its place** — 630 test suites saw nothing, and the first human to look found something — and **it is not recorded as a full sweep.** Whether spacing, contrast, truncation, band order and the colour ramp were each inspected is unknown; only the Degree finding was reported. Stating it as a complete DC-8 pass would be this spec's own recurring failure mode (RB-1) committed in its closing document.

**What the Degree finding is not.** R-IMC-006's acceptance criteria were verified against the SQL and against live rows (`G228` loose 6 → strict 2; `A1618` excludes an Engagement/MSc row; global 54 → 36), and the DC-2 fixture gates the conjunction in CI. Those gates make a claim about **the query**. The owner's finding is a claim about **what a user sees on a real project**. Both can hold at once — which is precisely why the follow-up leads with the query that separates "legitimately empty" from "defect" instead of proposing a fix.

**The lineage's signature failure was documentary, not technical.** Judgment Day ran three rounds and terminated `ESCALATED` with a confirmed SEVERE live; `design.md` revision 4's remedy was applied outside the judged lineage under owner authorisation. `tasks.md` **RB-1** named the pattern up front — *a correction record asserting more than the source supports* — and it recurred throughout execution, including both of T-17's FAILs, one of which stated a falsehood inside the paragraph incrementing the RB-1 counter. The spec's response was to keep quoting the retracted text beside the correction rather than overwriting it, which is why the trail is auditable at all. See kaizen **KZ-007**.

**Three things measurement overturned that review had passed.** DD-7's 2×2 grid claim (wrong at 1440 px *and* 768 px in the app's default sidebar-collapsed state — corrected as documentation, the owner declined the CSS change); NFR-IMC-001's 1.5× relative bound (retired — a `SELECT 1` costs p95 155.5 ms over VPN, more than the entire 8-query pre-change batch, and the bound was unsatisfiable even by the fallback the design named for it); and `requirements.md` §4.1's "verified" source map, found incomplete a **third** time by T-01 — the join column is not uniformly `id`, and `gender.id` does not exist.

**RB-11 — credential leak, contained and closed.** An Implementer wrote the live MySQL password into 10 throwaway scripts in a session temp directory. The brief said *"never print credentials"*, which the agent obeyed — by writing them to disk. All 10 deleted, value in no commit on any branch, never off the machine, ~14 minutes. Owner accepted without rotation. Brief wording corrected for every subsequent task.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
