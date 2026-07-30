# Proposal — Chunk B: Indicator-metadata charts + server-side status aggregation

> Child of [`../analytics-expansion/proposal.md`](../analytics-expansion/proposal.md) (umbrella). Shared context — problem inventory, decomposition, decisions **D-1…D-7** — lives there and is **not restated here**.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/indicator-metadata-charts/` |
| Type | **Change** |
| Approval Mode | `gated` |
| Created | 2026-07-29 |
| Umbrella | `docs/specs/project-dashboard/analytics-expansion/` |
| Depends on | **Chunk A** (`project-dashboard/full-payload-show-more`) — needs the payload contract + the card expansion affordance |
| Parallel-safe | **no** vs A and C1 · **yes** vs Chunk D (no shared files) |
| Governing decisions | D-4 (titles), D-6 (status server-side), D-7 (hide empty charts) |
| Surfaces | **Server + Client** |
| Ticket coverage | This is the headline business ask of the source ticket |

## 2. Intent

Give each result indicator its own charts on the Project Dashboard, sourced from the metadata already captured in the reporting forms, and move the *Results by status* count to the server so the dashboard stops downloading 10 000 results to count them.

## 3. Problem / Current Behavior

Umbrella **P-4** and **P-5**. In short: every source column is already persisted and every lookup table already exists, but nothing aggregates them per contract — so a project lead can see *how many* Innovation Development results exist, and nothing about their nature, type or readiness. Separately, *Results by status* is computed in the browser from a `limit: 10_000` fetch.

## 4. Proposed Outcome

`reports/full` returns ~10 new aggregation sections plus `results_by_status`, and the dashboard renders one card per section — each inheriting Chunk A's in-place expansion, each hidden when its owning indicator has no results on the project (D-7).

## 5. Scope

### 5.1 Server — new aggregations on `reports/full`

All scoped to results whose **primary contract** is `contract-id`, reusing the join the existing top-N reports already use. Field mapping **verified against the live form templates**, not inferred:

| Section | Source | Group by | Lookup |
| --- | --- | --- | --- |
| Innovation nature | `result_innovation_dev` | `innovation_nature_id` | innovation natures |
| Innovation type | `result_innovation_dev` | `innovation_type_id` | innovation types |
| Current readiness | `result_innovation_dev` | `innovation_readiness_id` | readiness levels |
| Maturity of change reported | `result_oicr` | `maturity_level_id` | `maturity_level` |
| Policy Type | `result_policy_change` | `policy_type_id` | `policy_types` |
| Stage in Policy Process | `result_policy_change` | `policy_stage_id` | `policy_stages` |
| Training or engagement to report | `result_capacity_sharing` | `session_format_id` | `session_formats` (`1` = Individual) |
| Training or engagement | `result_capacity_sharing` | `session_type_id` | `session_types` |
| Gender | `result_capacity_sharing` | **combined** — Individual: `gender_id` → `genders`. Group: `SUM(session_participants_male)`, `SUM(session_participants_female)`, `SUM(session_participants_non_binary)` | see B-OQ1 |
| Degree | `result_capacity_sharing` | `degree_id`, filtered to `session_type_id` = Training **AND** `session_length_id = 2` (Long-term) | `degrees` |
| Results by status | `results` + `result_status` | `result_status_id` → `{ result_status_id, name, count }`, **counts only** (D-6) | — |

| # | Item |
| --- | --- |
| B-1 | New DTOs + extension of `ContractFullReportsDto` (`dto/reports-full.dto.ts`), each section `{ id, name, count }[]` for a uniform client mapping. |
| B-2 | Repository aggregations in `agresso-contract.repository.ts` (already 1 200+ lines — the child spec decides whether these live in a separate repository/helper to avoid growing one class further). |
| B-3 | Service + controller pass-through; Swagger `@ApiProperty` on every new DTO field (root guide §4.1). |
| B-4 | `results_by_status` per D-6, including how the status colour is resolved — either carried in the aggregation or read from the existing client status cache (**B-OQ2**). |
| B-5 | Sibling `*.spec.ts` for every new aggregation; the 60 % Jest floor must hold. |

### 5.2 Client

| # | Item |
| --- | --- |
| B-6 | Extend the `ContractFullReports` interface from Chunk A with the new sections. |
| B-7 | ~10 new `app-project-dashboard-card` instances with D-4 titles, reusing existing `layout()` variants — no new chart component. |
| B-8 | Per-indicator visibility (D-7), driven by the existing `indicatorsWithResults()` computed. |
| B-9 | Delete `loadProjectResultsByStatus` and `buildStatusChartItems`; *Results by status* renders from the payload. |
| B-10 | Grid layout for ~17 cards (see B-R1) — grouping under per-indicator sections is the likely answer, decided against the mockup. |
| B-11 | Component specs incl. the Degree double-filter and the combined Gender maths. |

## 6. Non-Goals

- Click-to-filter on the new cards — Chunk C1 covers the three already-filterable dimensions; the new metadata dimensions need **C2** (they have no `ResultFilter` support). This chunk ships the cards **inert**.
- Backfilling metadata for TIP/PRMS/AICCRA imports (umbrella non-goal; D-7 hides the resulting empty cards).
- New CLARISA vocabularies — every chart groups on an existing lookup table.
- Charts for indicators not named in the ticket (e.g. Innovation Use, Knowledge Product).

## 7. Affected Users, Systems, And Specs

| Area | Detail |
| --- | --- |
| Server | `agresso-contract.repository.ts`, `agresso-contract.service.ts`, `agresso-contract.controller.ts`, `dto/reports-full.dto.ts` + new DTOs, sibling specs |
| Client | `project-dashboard.component.{ts,html,spec.ts}`, `contract-full-reports.interface.ts`, `get-full-contract-reports.service.ts` |
| Read-only deps | `result_innovation_dev`, `result_oicr`, `result_policy_change`, `result_capacity_sharing`, `session_formats`, `session_types`, `session_lengths`, `degrees`, `genders`, `maturity_level`, `policy_types`, `policy_stages` |
| Migrations | **none** — read-only aggregation over existing tables |
| Docs | `docs/ux-ui/design.md` chart inventory; `docs/trd/trd.md` extended `reports/full` contract |

## 8. Visual Reference

- **Source:** none — **blocking for B-10**.
- **Location:** `docs/specs/project-dashboard/indicator-metadata-charts/mockup/`.
- **Notes:** Going from 7 to ~17 cards is the single largest UX risk in the umbrella. The mockup must resolve grouping, ordering, and how a card looks when its indicator is present but a specific field is unanswered (distinct from D-7's hidden case).

## 9. Requirement Delta Preview

### ADDED
- 10 aggregation sections + `results_by_status` on `reports/full`.
- ~10 dashboard cards.
- Per-indicator card visibility (D-7).

### MODIFIED
- `ContractFullReportsDto` / `ContractFullReports` gain sections.
- *Results by status* re-sources from the server.
- Dashboard grid layout (B-10).

### REMOVED
- `loadProjectResultsByStatus`, `buildStatusChartItems`, and the `limit: 10_000` `GET_Results` call.

## 10. Approach Options

| | **Option 1 — One `Promise.all` extension of `getFullContractReports`** (recommended) | **Option 2 — Separate `reports/metadata` endpoint** |
| --- | --- | --- |
| Requests | Stays at 1 | 2 |
| Fits the requester's intent | Yes — "un servicio que engloba todos los datos" | No |
| Payload size | Grows (umbrella R-1) | Splits the risk |
| Query cost | ~11 more parallel queries in one request — latency = slowest query | Spread across two requests |
| Cache/measure | One thing to measure | Two |

**Recommended: Option 1**, matching the requester's explicit intent and Chunk A's contract. Guard it by measuring the aggregate query time in B-5; if one aggregation dominates, optimise the query rather than splitting the endpoint.

## 11. Risks, Dependencies, And Open Questions

| ID | Item |
| --- | --- |
| **B-R1** | Umbrella **R-4** (grid overload), owned here. ~17 cards, any of which can expand (D-2). Blocked on the mockup. |
| **B-R2** | **Query fan-out.** `getFullContractReports` already runs 6 parallel queries; this adds ~11. Total request latency becomes the slowest of 17 queries against `results` joined to the contract. Must be measured on the largest real contract — pairs with Chunk A's A-9 payload measurement. |
| **B-R3** | **The combined Gender chart mixes units.** Individual training contributes **one person per record** (`gender_id`); group training contributes **participant totals** (summed integers). A single distribution is arithmetically valid but semantically mixed. Must be labelled on the card. See B-OQ1. |
| **B-R4** | **Degree filter is a conjunction and easy to get wrong.** `session_type_id` = Training **AND** `session_length_id = 2`. The form only reveals Degree when long-term is selected (`isLongTermSelected()` checks `session_length_id === 2`), so stale `degree_id` values may exist on records later switched away from long-term — the client clears it (`capacity-sharing.component.ts:87-90`), but historical rows may not be clean. The aggregation must filter on the two conditions, **not** on `degree_id IS NOT NULL`. |
| **B-R5** | Hardcoded lookup ids (`session_format_id = 1` = Individual, `session_length_id = 2` = Long-term) are magic numbers already present in client code. Prefer resolving by lookup `name` or a named constant; record the choice. |
| **B-R6** | Umbrella **R-3** — empty charts on import-heavy projects; mitigated by D-7. |
| **B-R7** | Server coverage floor (60 %) across ~11 new aggregations. |
| **B-D1** | **Hard dependency on Chunk A** for the interface and the expansion affordance. |
| **B-D2** | Needs confirmation that all 12 lookup tables are populated in every environment. |
| **B-OQ1** | Umbrella **OQ-7**: combined Gender = one summed distribution (default) or two series? Resolve in design, with B-R3's labelling either way. |
| **B-OQ2** | Where does the status colour come from once results are no longer downloaded — the aggregation, or the client status cache? Default: **client cache**, keeping the payload lean. |
| **B-OQ3** | Should a chart render when the indicator has results but the field is unanswered on all of them (all-null)? Default: **hide**, consistent with D-7. |

## 12. Success Criteria

Umbrella SC-3, SC-3b, SC-4, SC-7, SC-8 apply. Chunk-specific:

| ID | Criterion |
| --- | --- |
| B-SC1 | All 10 charts render correct counts against a seeded fixture covering every lookup value plus nulls. |
| B-SC2 | The Degree chart counts **only** records with `session_type` = Training **and** `session_length` = Long-term — proven by a fixture containing an Engagement record and a Short-term record that both carry a `degree_id` and must be excluded (B-R4). |
| B-SC3 | The Gender chart's total equals individual `gender_id` counts + summed group participant totals, per the B-OQ1 decision. |
| B-SC4 | No dashboard request uses `limit: 10_000`; *Results by status* matches the previous client-side counts for a fixture project. |
| B-SC5 | Cards for indicators with zero results on the project are absent from the DOM (D-7). |
| B-SC6 | `reports/full` p95 latency measured and recorded on the largest available contract (B-R2). |
| B-SC7 | Server coverage ≥ 60 %; `npm test` + `npm run lint` pass in both packages. |

## 13. Next Step

Runs after Chunk A. Can run **in parallel with Chunk D** (no shared files).

```text
/akili-specify project-dashboard/indicator-metadata-charts
```

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
