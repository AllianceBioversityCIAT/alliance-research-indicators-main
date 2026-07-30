# Proposal — Chunk B: Indicator-metadata charts

> ## ⚠️ SUPERSEDED IN PART — read `design.md` (revision 3) and `requirements.md` first
>
> This file is a **point-in-time record of the propose phase**. Judgment Day rounds 1 and 2 falsified several
> statements below. It is kept for provenance, not for execution. Where it disagrees with `design.md` or
> `requirements.md`, **those are authoritative**.
>
> | Superseded here | Correct position |
> | --- | --- |
> | §3 P-2 — "`getFullContractReports` runs **exactly 6 queries**" | **8** — `getGeoScopeReport` issues 3 in a nested `Promise.all` (`agresso-contract.repository.ts:739-743`) |
> | §10 / B-R2 — "6 → 16 parallel queries" | **8 → 10 issued, peak concurrency 8** — 2 consolidated queries composed sequentially (design DD-1 + DD-11) |
> | §5.1 / §7 — table `result_oicr` | **`result_oicrs`** (plural). No `result_oicr` table exists |
> | **B-2** — "10 aggregations added to `getFullContractReports`'s `Promise.all`" | **Rejected.** 2 queries in a *new* repository, composed in the service; the existing method's body is unchanged (design DD-1, DD-3, DD-11) |
> | **B-R5** — "Prefer resolving by lookup **name**" | **Rejected.** Ids are asserted by append-only seed migration `1727119632564-InsertDataControl.ts`; `SessionFormatEnum`/`SessionLengthEnum` already exist. Name matching on a `TEXT` column is the *more* fragile option (design DD-4) |
> | B-OQ1 / B-OQ3 / B-R1 | Closed — see `design.md` §14 |

> Child of [`../analytics-expansion/proposal.md`](../analytics-expansion/proposal.md) (umbrella). Shared context — problem inventory, decomposition, decisions **D-1…D-7** — lives there and is **not restated here**.
>
> **Revised 2026-07-30** after the requester re-scoped the chunk to the user story's acceptance criteria only. Three previously-open questions are now closed and the blocking mockup exists. See §14 for what changed.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/indicator-metadata-charts/` |
| Slug | `indicator-metadata-charts` — pre-existing; the 2026-07-30 free-text argument ("creación de nuevos charts para la pantalla del dashboard de los proyectos") resolves to this same chunk, so **no new folder was created** |
| Type | **Change** (feature — no defect reported) |
| Approval Mode | `gated` — no end-to-end mandate given |
| Created | 2026-07-29 · **Revised 2026-07-30** |
| Requester | d.casanas@cgiar.org |
| Source | User-story acceptance criteria pasted by the requester (2026-07-30), superseding the looser 2026-07-29 framing |
| Umbrella | `docs/specs/project-dashboard/analytics-expansion/` |
| Depends on | **Chunk A** (`full-payload-show-more`) — ✅ **delivered and archived 2026-07-30** (commit `7f6aa178`). Dependency is **cleared**. |
| Parallel-safe | **no** vs C1 (shares `project-dashboard.component.*`) · **yes** vs Chunk D and Chunk A2 |
| Governing decisions | D-4 (titles from form fields), D-7 (hide empty indicators) |
| Surfaces | **Server + Client** |
| Kaizen | **KZ-006** applied — the layout decision closed on real-browser measurement, not review opinion (§8) |
| Status | **Ready for `/akili-specify`** — no blocking open questions remain |

## 2. Intent

Give each result indicator its own charts on the Project Dashboard, sourced from metadata the reporting forms already capture, exactly as the user story's acceptance criteria specify — **10 new charts across 4 indicators**, and nothing else.

## 3. Problem / Current Behavior

Umbrella **P-5**, re-verified against the code on 2026-07-30:

| Fact | Evidence |
| --- | --- |
| Every source column is already persisted | `result_capacity_sharing` carries all 9 needed columns (`session_format_id`, `session_type_id`, `session_length_id`, `degree_id`, `gender_id`, `session_participants_male/female/non_binary`) |
| Every lookup table already exists | 13 entity folders confirmed: `degrees`, `genders`, `maturity-level`, `policy-stages`, `policy-types`, `session-formats`, `session-lengths`, `session-types`, `result-innovation-dev`, … |
| Nothing aggregates any of it per contract | `getFullContractReports` runs exactly 6 queries (`agresso-contract.repository.ts:1165-1201`) — levers, contributors, contacts, staff, partners, geo scope |

So a project lead can see *how many* Innovation Development results exist, and nothing about their nature, type or readiness. **No migration is needed** — this is pure read-only aggregation over data that is already there.

## 4. Proposed Outcome

`reports/full` returns **10 new aggregation sections**, and the dashboard renders a new **Indicator metadata** section below *Result analytics*, organised as one collapsible band per indicator.

## 5. Scope

### 5.1 The 10 charts (verbatim from the acceptance criteria)

Field mapping **verified against the live form template** (`capacity-sharing.component.html`), not inferred — the AC's labels are the form's labels:

| # | Indicator | Chart | Source column | Form label (verbatim) |
| --- | --- | --- | --- | --- |
| 1 | Innovation Dev | Innovation Nature | `result_innovation_dev.innovation_nature_id` | Innovation Nature |
| 2 | Innovation Dev | Innovation Type | `result_innovation_dev.innovation_type_id` | Innovation Type |
| 3 | Innovation Dev | Current Readiness | `result_innovation_dev.innovation_readiness_id` | Current Readiness |
| 4 | OICR | OICR Maturity | `result_oicr.maturity_level_id` | Maturity of change reported |
| 5 | Policy Change | Policy Type | `result_policy_change.policy_type_id` | Policy Type |
| 6 | Policy Change | Stage in Policy Process | `result_policy_change.policy_stage_id` | Stage in Policy Process |
| 7 | Capacity Sharing | Training or engagement to report | `session_format_id` | **"Training or engagement to report"** → Individual / Group |
| 8 | Capacity Sharing | Training vs. Engagement | `session_type_id` | **"Is this a training or a engagement?"** → Training / Engagement |
| 9 | Capacity Sharing | Gender | combined — see §5.2 | "Gender" (individual) + "Male/Female/Non-binary participants?" (group) |
| 10 | Capacity Sharing | Degree | `degree_id`, double-filtered — see §5.3 | "Degree" |

> **Naming note worth carrying into the spec:** chart 7's form label says *"Training or engagement"* but its values are **Individual / Group**, while chart 8's label asks the training-vs-engagement question. The labels are genuinely counter-intuitive in the product; the AC reproduces them faithfully, so the spec must too (D-4). Do not "fix" them silently.

### 5.2 Gender — combined distribution (decision **D-B1**, closed 2026-07-30)

Per the AC's *"Show the total distribution by gender across both training types"*: **one** distribution of Male / Female / Non-binary, summing

- **Individual** trainings (`session_format_id = 1`): one person per record, from `gender_id`; and
- **Group** trainings (`session_format_id = 2`): `SUM(session_participants_male | _female | _non_binary)`.

The card carries a provenance footnote stating both sources are included — the mitigation for **B-R3**'s mixed-unit concern, since one record contributes 1 and another contributes 40.

### 5.3 Degree — two-condition filter

Include a record **only** when `session_type_id` = Training **AND** `session_length_id` = Long-term (3 months and more). Distribution over PhD / MSc / BSc / Other. **Never** filter on `degree_id IS NOT NULL` — see **B-R4**.

### 5.4 Server

| # | Item |
| --- | --- |
| B-1 | New DTOs + extension of `ContractFullReportsDto` (`dto/reports-full.dto.ts`), each section `{ id, name, count }[]` for uniform client mapping. |
| B-2 | 10 aggregations added to `getFullContractReports`'s `Promise.all`. `agresso-contract.repository.ts` is already 1 200+ lines — the spec decides whether these live in a separate repository/helper rather than growing one class further. |
| B-3 | Service + controller pass-through; Swagger `@ApiProperty` on every new DTO field (root guide §4.1). |
| B-4 | Sibling `*.spec.ts` for every aggregation; the 60 % Jest floor must hold. |

### 5.5 Client

| # | Item |
| --- | --- |
| B-5 | Extend the `ContractFullReports` interface (`contract-full-reports.interface.ts:94`) with the 10 sections. |
| B-6 | 10 new `app-project-dashboard-card` instances reusing existing `layout()` variants — **no new chart component**. |
| B-7 | New **Indicator metadata** section with one collapsible band per indicator (§8 mockup, M-1…M-4). |
| B-8 | Per-indicator visibility (D-7) driven by the existing `indicatorsWithResults()` computed (`project-dashboard.component.ts:121`). |
| B-9 | Extend `contract-full-reports.mock.ts` — the canonical fixture, never hand-rolled per test (client guide). |
| B-10 | Component specs incl. the Degree double-filter and the combined Gender maths. |

## 6. Non-Goals

- **`results_by_status` server-side migration — deferred** (requester decision, 2026-07-30). The `limit: 10_000` `GET_Results` call and `buildStatusChartItems` stay exactly as they are. This was previously bundled here as D-6; it is a real performance win but is **not in the user story**, so it moves to its own small spec. Recorded as **B-F1** in §11.
- Click-to-filter on the new cards — the new dimensions have no `ResultFilter` support, so they ship **inert**. Chunk C2 territory.
- Backfilling metadata for TIP/PRMS/AICCRA imports (umbrella non-goal; D-7 hides the resulting empty bands).
- New CLARISA vocabularies — every chart groups on an existing lookup table.
- Charts for indicators the AC does not name (Innovation Use, Knowledge Product, Other Outcome).

## 7. Affected Users, Systems, And Specs

| Area | Detail |
| --- | --- |
| Server | `agresso-contract.repository.ts`, `.service.ts`, `.controller.ts`, `dto/reports-full.dto.ts` + new DTOs, sibling specs |
| Client | `project-dashboard.component.{ts,html,spec.ts}`, `contract-full-reports.interface.ts`, `app/testing/contract-full-reports.mock.ts` |
| Read-only deps | `result_innovation_dev`, `result_oicr`, `result_policy_change`, `result_capacity_sharing` + 9 lookup tables |
| Migrations | **none** — read-only aggregation |
| Docs | `docs/ux-ui/design.md` chart inventory; `docs/trd/trd.md` `reports/full` contract |

## 8. Visual Reference

- **Source:** Generated mockup (self-contained HTML — Stitch MCP unavailable in this session, documented fallback used).
- **Location:** [`mockup/index.html`](mockup/index.html)
- **Covers:** all 10 cards, 4 indicator bands, the D-7 hidden-indicator case, the B-OQ3 unanswered-field case, and both risk annotations. Uses the product's real tokens (`#112F5C`, `#4c5158`, `#777C83`, `#e8ebed`, Barlow) and the real `projectDashboardBarColor()` ramp.

**Measured, not eyeballed** (KZ-006 — a layout decision must close on real-browser measurement):

| Viewport | Horizontal overflow | 4-card band columns |
| --- | --- | --- |
| 500 px (headless floor) | **0 px** | 1 × 434 px |
| 768 px | **0 px** | 1 × 682 px |
| 1440 px | **0 px** | 2 × 608 px |

Two defects were found *by* that measurement pass and fixed in the mockup: `auto-fit` stretched a lone card to full width (OICR), and a 4-card band orphaned its 4th card into a 3+1 row. A third — the D-7 explainer contradicting the bands actually rendered — was a content error caught on visual review.

### Decisions the mockup locks in

| ID | Decision |
| --- | --- |
| **M-1** | Bands, not one flat grid. 10 cards appended to the existing grid would give 17 undifferentiated tiles; one band per indicator keeps each chart beside the indicator it describes and gives D-7 a natural unit to hide. |
| **M-2** | Band order follows result volume (descending); card order within a band follows the AC's order. |
| **M-3** | Chart layout by cardinality — `columns` for ≤ 4 categories, `rows` for 5+ or long labels. Both are existing `layout()` variants. A 4-card band uses a 2×2 grid. |
| **M-4** | Bands are collapsible, defaulting to open. |
| **M-5** | Gender card carries a provenance footnote (B-R3). |
| **M-6** | Degree card carries a filter pill making the Training + Long-term scope visible (B-R4). |

## 9. Requirement Delta Preview

### ADDED
- 10 aggregation sections on `reports/full`.
- A new **Indicator metadata** dashboard section with 4 collapsible indicator bands and 10 cards.
- Per-indicator band visibility (D-7) and a per-card unanswered-field empty state.

### MODIFIED
- `ContractFullReportsDto` / `ContractFullReports` gain 10 sections.
- `contract-full-reports.mock.ts` gains the new sections.

### REMOVED
- Nothing. (`results_by_status` removal is deferred with B-F1.)

## 10. Approach Options

| | **Option 1 — extend `getFullContractReports`** (recommended) | **Option 2 — separate `reports/metadata` endpoint** |
| --- | --- | --- |
| Requests | Stays at 1 | 2 |
| Fits requester's intent | Yes — "un servicio que engloba todos los datos" | No |
| Query cost | 6 → 16 parallel queries; latency = slowest query | Spread across two requests |
| Payload | Grows (umbrella R-1) | Splits the risk |

**Recommended: Option 1**, matching the requester's explicit intent and Chunk A's established contract. Guard it by measuring aggregate query time (B-SC5); if one aggregation dominates, optimise that query rather than splitting the endpoint.

## 11. Risks, Dependencies, And Open Questions

| ID | Item | State |
| --- | --- | --- |
| **B-R2** | **Query fan-out.** 6 → 16 parallel queries in one request. Total latency becomes the slowest of 16 against `results` joined to the contract. Must be measured on the largest real contract. | Open — mitigate via B-SC5 |
| **B-R3** | **Gender mixes units.** Individual = 1 person/record; Group = summed totals. Arithmetically valid, semantically mixed. | Mitigated by M-5 footnote |
| **B-R4** | **Degree filter is a conjunction.** The form only reveals Degree when long-term is selected, so stale `degree_id` values may survive on records later switched away — the client clears it (`clearDegreeIdIfNotLongTerm`, `capacity-sharing.component.ts:85-93`) but historical rows may not be clean. | Mitigated by B-SC2 fixture |
| **B-R5** | **Magic lookup ids are real.** `session_format_id === 1` (Individual) and `=== 2` (Group) are hardcoded in `capacity-sharing.component.html:42,86`; `session_length_id === 2` = Long-term. Prefer resolving by lookup name or a named constant; record the choice. | Open — decide in design |
| **B-R6** | Empty bands on import-heavy projects. | Mitigated by D-7 |
| **B-R7** | Server coverage floor (60 %) across 10 new aggregations. | Open |
| **B-D1** | Dependency on Chunk A. | ✅ **Cleared** — archived 2026-07-30 |
| **B-D2** | All 9 lookup tables populated in every environment. | Open — confirm before execute |
| **B-F1** | **Follow-up:** `results_by_status` server-side migration, deferred out of this chunk. Needs its own proposal; carries the old B-OQ2 (status colour from payload or client cache — default: client cache). | Deferred by requester |
| ~~B-OQ1~~ | Gender combined or split? | ✅ **Closed** — combined, per AC (D-B1, §5.2) |
| ~~B-OQ3~~ | Chart when the indicator has results but the field is all-null? | ✅ **Closed** — render with an explanatory empty state, distinct from D-7's hidden case (mockup) |
| ~~B-R1~~ | Grid overload at ~17 cards. | ✅ **Closed** — M-1…M-4, measured at 3 viewports |

## 12. Success Criteria

Umbrella SC-3, SC-7, SC-8 apply. Chunk-specific:

| ID | Criterion |
| --- | --- |
| B-SC1 | All 10 charts render correct counts against a seeded fixture covering every lookup value plus nulls. |
| B-SC2 | The Degree chart counts **only** Training + Long-term records — proven by a fixture containing an Engagement record **and** a Short-term record that both carry a `degree_id` and must be excluded (B-R4). |
| B-SC3 | The Gender chart total equals individual `gender_id` counts **plus** summed group participant totals (D-B1). |
| B-SC4 | Bands for indicators with zero results on the project are absent from the DOM (D-7); a card whose field is unanswered on all results renders the empty state instead (B-OQ3). |
| B-SC5 | `reports/full` p95 latency measured and recorded on the largest available contract, before and after (B-R2). |
| B-SC6 | Server coverage ≥ 60 %; `npm test` + `npm run lint` pass in both packages. |
| B-SC7 | No horizontal overflow at 390 / 768 / 1440 px, verified by measurement in a real browser (KZ-006). |

## 13. Next Step

Chunk A is delivered, so this chunk is unblocked and can start immediately. It can run in parallel with Chunk D and Chunk A2.

```text
/akili-specify project-dashboard/indicator-metadata-charts
```

## 14. What Changed On 2026-07-30

| Change | Why |
| --- | --- |
| Scope narrowed to the 10 AC charts | Requester: *"solo me quiero centrar en la creación de los nuevos chars como se indica en la US"* |
| `results_by_status` migration removed → **B-F1** | Not in the user story; deferred to its own spec |
| B-OQ1 closed → combined Gender | AC: *"Show the total distribution by gender across both training types"* |
| B-OQ3 closed → empty state | Resolved by the mockup |
| B-R1 closed → band layout | Mockup built and measured at 3 viewports |
| B-D1 cleared | Chunk A archived (commit `7f6aa178`) |
| Field mapping re-verified | Checked against `capacity-sharing.component.html`, entity columns, and lookup-entity folders |

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
