# Requirements — Project Dashboard / Indicator-metadata charts

- **Module:** project-dashboard (client) + agresso (server reports)
- **Spec id:** 2026-07-indicator-metadata-charts
- **Status:** ✅ **implemented and validated 2026-07-31** — all 47 ACs and all 5 NFRs verified ([`./validation-report.md`](./validation-report.md)); §9 **DC-8's owner visual check and §12's sign-offs remain open**
- **Owner:** d.casanas@cgiar.org
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — Results analytics / project oversight
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Linked tickets:** user story pasted 2026-07-30 (Jira id TBC)
- **Depth:** **Standard**
- **Extends:** `docs/specs/archive/2026-07-30-project-dashboard--full-payload-show-more/` (Chunk A — delivered)
- **Last updated:** 2026-07-30

---

## 1. Context

The Project Detail dashboard shows *how many* results each indicator has, but nothing about **what those results contain**. Every metadata field the reporting forms capture — innovation nature, OICR maturity, policy stage, training gender — is persisted and unqueried.

This spec adds **10 read-only aggregations** to the existing `GET /api/v1/agresso/contracts/reports/full` contract and renders them as **10 new charts** grouped into per-indicator bands on the dashboard.

**Explicitly not changing:** the four ranked charts delivered by Chunk A, the geographic card (Chunk A2 owns it), the *Results by status* client-side fetch (deferred — see §8 B-F1), and any write path. **No migration.** No new CLARISA vocabulary.

---

## 2. Executive Summary

| | |
| --- | --- |
| **Problem** | Project leads see result *counts* per indicator and nothing about result *content*. |
| **Change** | 10 new aggregation sections on `reports/full`; a new **Indicator metadata** dashboard section with 4 collapsible per-indicator bands. |
| **Surfaces** | Server (`agresso-contract` reports) + Client (`project-dashboard`). |
| **Risk profile** | Additive and read-only. `reports/full` already runs **8** concurrent queries against an un-configured pool (mysql2 default 10); the design adds 2 more but composes them **sequentially**, so **peak concurrency stays at 8 — unchanged from today, and no pool change is required**. The dominant remaining risk is **visual/layout defects**, which have no automated gate (§9). |
| **Depth rationale** | *Standard*, not *Full*: cross-cutting and API-touching, but no migration, no auth change, no data mutation, and a trivial backout (revert both packages). |

---

## 3. Glossary

| Term | Meaning |
| --- | --- |
| **Band** | A collapsible group of cards belonging to one indicator in the *Indicator metadata* section. |
| **Section** (payload) | One named array on the `reports/full` response, e.g. `innovation_nature`. |
| **Primary contract result** | A result whose `result_contracts` row for this contract has `is_primary = TRUE`; the scoping rule all existing report queries already use. |
| **Individual / Group training** | `session_format_id` = 1 / 2 respectively — confirmed hardcoded in `capacity-sharing.component.html:42,86`. |
| **Long-term training** | `session_length_id` = 2 — "3 months and more". |
| **Unanswered field** | The indicator has results on this project, but the field is `NULL` on every one of them. Distinct from *indicator absent*. |

---

## 4. System Context & Scope

### 4.1 Verified source map

Every table name below was re-derived from its `@Entity(...)` decorator in the post-judgment pass. **Four are irregular relative to their folder and are the most likely source of a silent SQL defect:** `gender` (singular), `policy_stage` (singular), `maturity_levels` (plural), and **`result_oicrs`** (plural — the folder is `result-oicr`).

> An earlier revision of this table named the OICR fact table `result_oicr` while asserting the map was complete. It was wrong, and no `result_oicr` table exists. Re-derive from decorators rather than trusting this table if you have any doubt — a "verified" map that is wrong is worse than none.

> **Amended 2026-07-30 by T-01, which executed all ten joins against the real schema.** Two things this table previously got wrong or omitted:
>
> 1. **It never recorded the join column, and the join column is not uniform.** Three conventions coexist: **`id`** (`clarisa_innovation_characteristics`, `clarisa_innovation_readiness_levels`, `maturity_levels`), **`code`** (`clarisa_innovation_types` — the only one, and unguessable), and **`<table>_id`** (the remaining seven). Because the first three charts in this table's own order join on `id`, writing them top-down establishes `.id` as the pattern and then breaks on charts 5–10. `gender.id` does not exist — `ER_BAD_FIELD_ERROR` is how this was found. **This is the third time this "verified" map has been incomplete** (revision 1: `result_oicr`; revision 4: label columns; now the join column).
> 2. **Three label columns needed a live row to settle, not two.** OQ-3 asked about readiness and maturity. `policy_stage` had the same defect and nobody had asked: its `name` is literally `"Stage 1"` / `"Stage 2"` / `"Stage 3"`, so the specified `name` would have shipped a chart labelled *Stage 1 / Stage 2 / Stage 3*.
>
> Every value below is now an **executed fact** — see `execution.md` § T-01 for the row counts each join returned. **`is_active = TRUE` is still required on the fact row**; the join alone does not scope it.

| # | Chart | Fact column | Lookup table | **Join column** | Label column (verified) | Cats |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Innovation Nature | `result_innovation_dev.innovation_nature_id` | `clarisa_innovation_characteristics` | `id` | `name` | 4 |
| 2 | Innovation Type | `result_innovation_dev.innovation_type_id` | `clarisa_innovation_types` | **`code`** ⚠ | `name` | 4 |
| 3 | Current Readiness | `result_innovation_dev.innovation_readiness_id` | `clarisa_innovation_readiness_levels` | `id` | **`CONCAT(level,'. ',name)`** — `level` is `0…9`, `name` is the phase, and **`id` is 11–20, so `id ≠ level`** | **10** |
| 4 | OICR Maturity | **`result_oicrs`**`.maturity_level_id` | `maturity_levels` | `id` | **`full_name`** — `name` is only `"Level 1"`. (`description` = same text without the prefix, available if `full_name` proves too long) | 3 |
| 5 | Policy Type | `result_policy_change.policy_type_id` | `policy_types` | `policy_type_id` | `name` | 3 |
| 6 | Stage in Policy Process | `result_policy_change.policy_stage_id` | **`policy_stage`** | `policy_stage_id` | **`description`** ⚠ — `name` is only `"Stage 1"` | 3 |
| 7 | Training or engagement to report | `result_capacity_sharing.session_format_id` | `session_formats` | `session_format_id` | `name` | 2 |
| 8 | Training vs. Engagement | `result_capacity_sharing.session_type_id` | `session_types` | `session_type_id` | `name` | 2 |
| 9 | Gender | combined — see R-IMC-005 | **`gender`** | **`gender_id`** — **not `id`; that column does not exist** | `name` | 3 |
| 10 | Degree | `result_capacity_sharing.degree_id` (filtered) | `degrees` | `degree_id` | `name` | 4 |

**Cardinality closes OQ-5:** exactly **one** chart (#3 Current Readiness, 10 categories) exceeds the 5-category threshold, so it is the single card that engages the expansion contract (design §7.2 / DD-10) and the real subject of **DC-13**'s boundary test. Implement the contract unconditionally regardless — the row count of a sync-populated table is not a contract.

### 4.2 Scoping rule (inherited, unchanged)

All 10 aggregations MUST scope to primary-contract results using the **single shared scoping predicate**, which filters `is_primary`, `is_active` (both sides) and `is_snapshot = FALSE`. **No aggregation may invent its own scoping join, and no second copy of the predicate may exist.**

> **Amended 2026-07-30 (RB-10).** This clause originally named `AgressoContractRepository.buildPrimaryContractResultsSubquery()` at `agresso-contract.repository.ts:642-659` — but that method is **`private`**, and `IndicatorMetadataReportsRepository` is a separate class, not a subclass, so the MUST was **literally unsatisfiable as written**. Both T-03 and T-04 independently duplicated the SQL and escalated rather than hiding it. The owner authorised extraction, so the predicate now lives in one place:
>
> - **Source of truth:** `server/researchindicators/src/domain/entities/agresso-contract/utils/primary-contract-results.util.ts` → `buildPrimaryContractResultsScopeSql(options?)`
> - **In-class entry point:** `AgressoContractRepository.buildPrimaryContractResultsSubquery()` remains as a one-line delegate, so its eight pre-existing call sites are untouched and the refactor's blast radius on the six pre-existing sections is provably zero.
> - **Gate:** `primary-contract-results.util.spec.ts` asserts each filter individually, the single-`?` property, and that the two `includeGeoScope` paths differ **only** in the selected columns. Mutation-verified: dropping `is_snapshot` reddens the predicate case; making one option path diverge reddens two.
>
> The correction is recorded here rather than left implicit because a citation pointing at a one-line delegate would send the next reader to the wrong place — the same silent-drift failure this clause exists to prevent.

### 4.3 In scope / out of scope

| In | Out |
| --- | --- |
| 10 aggregation sections on `reports/full` | Any new endpoint |
| New *Indicator metadata* dashboard section, 4 bands, 10 cards | Changes to the 4 Chunk A ranked cards |
| Band visibility + card empty states | Click-to-filter / drill-down (Chunk C1/C2) |
| Extending the shared fixture + specs | `results_by_status` migration (B-F1) |
| Swagger + TRD/UX doc updates | Geographic card (Chunk A2), Leaflet (Chunk D) |

---

## 5. Stakeholders / Personas

| Persona | Interest |
| --- | --- |
| **Project lead** (primary) | Understand the composition of their project's results without opening each one. |
| **MEL analyst** | Trace each chart back to the exact reporting-form field it aggregates. |
| **Existing `reports/full` consumers** | Must be unaffected — the change is purely additive. |

---

## 6. Functional Requirements

> **All 47 acceptance criteria below were checked on 2026-07-31 at `/akili-validate`,** each against code and a gate rather than against a task's own claim. The per-AC trace — requirement → task → file:line → gating spec — is [`./validation-report.md`](./validation-report.md) §6, including the separate table that walks every `AND IT MUST` / `BUT it must NOT` clause individually. **Two things this does *not* assert:** the §12 sign-offs remain the owner's to give, and **DC-8's visual check is not an AC** — it is §9's owner-owned gate and is still outstanding, which is why `tasks.md` §8 does not close on these boxes alone.

### R-IMC-001 — Innovation Development metadata aggregations

- **As a** project lead
- **I want** the nature, type and readiness of my project's innovation results aggregated
- **So that** I can see what kind of innovations the project produces

**Details**
- Inputs: `contract-id` query param (existing).
- Behavior: three sections — `innovation_nature`, `innovation_type`, `innovation_readiness` — each `{ id, name, count }[]`, grouped over primary-contract results joined to `result_innovation_dev`, ordered `count DESC, id ASC`.
- Outputs: added to the `ContractFullReportsDto` payload; envelope unchanged (`ServerResponseDto`).
- Errors: inherits existing `400` on missing `contract-id`.
- Permissions: unchanged from `reports/full`.

**Acceptance criteria**
- [x] AC.1 — Given a contract with innovation results spanning 3 natures, the `innovation_nature` section returns 3 entries whose counts sum to the number of results carrying a non-null `innovation_nature_id`.
- [x] AC.2 — Rows with a `NULL` metadata id are excluded from that section and do not produce a null-named entry.
- [x] AC.3 — Each entry's `name` matches the lookup row's label column, not the id.
- [x] AC.4 — Results whose contract link is non-primary are excluded.

#### Scenario: Nature distribution

- GIVEN a contract with 5 innovation-development results as primary
- AND 2 are "Technological", 2 are "Capacity development", 1 has a NULL nature
- WHEN `GET reports/full?contract-id=<id>` is called
- THEN `innovation_nature` contains exactly 2 entries with counts 2 and 2
- AND IT MUST order them `count DESC, id ASC`
- BUT it must NOT emit an entry for the NULL-nature result

---

### R-IMC-002 — OICR maturity aggregation

- **As a** project lead **I want** OICR results grouped by maturity level **So that** I can see how mature the reported changes are.

**Details** — one section `oicr_maturity` from **`result_oicrs`**`.maturity_level_id` joined to `maturity_levels`.

**Acceptance criteria**
- [x] AC.1 — Counts equal the number of primary-contract OICR results per maturity level.
- [x] AC.2 — NULL `maturity_level_id` rows are excluded.
- [x] AC.3 — The section is an empty array (not `null`, not absent) when the project has no OICR results.

---

### R-IMC-003 — Policy Change aggregations

- **As a** project lead **I want** policy results grouped by type and by stage **So that** I can see where the project's policy work sits.

**Details** — sections `policy_type` and `policy_stage`, joining `policy_types` and **`policy_stage`** respectively.

**Acceptance criteria**
- [x] AC.1 — Both sections count primary-contract `result_policy_change` rows.
- [x] AC.2 — NULL ids excluded from their section independently — a result with a type but no stage counts in `policy_type` only.
- [x] AC.3 — The `policy_stage` join targets the singular table name and the query executes without error against a real schema.

#### Scenario: Partially-filled policy result

- GIVEN a policy-change result with `policy_type_id` set and `policy_stage_id` NULL
- WHEN the payload is built
- THEN `policy_type` counts it
- AND IT MUST NOT count it in `policy_stage`
- BUT it must NOT cause the `policy_stage` section to be omitted

---

### R-IMC-004 — Capacity Sharing format and type aggregations

- **As a** project lead **I want** capacity-sharing results grouped by session format and session type **So that** I can see the training mix.

**Details** — sections `session_format` (label *"Training or engagement to report"*, values Individual/Group) and `session_type` (label *"Training vs. Engagement"*, values Training/Engagement).

**Acceptance criteria**
- [x] AC.1 — `session_format` counts group by `session_format_id`; `session_type` by `session_type_id`.
- [x] AC.2 — The two sections are independent; a record contributes one count to each.
- [x] AC.3 — Labels come from the lookup tables, so the counter-intuitive field naming is preserved rather than "corrected".

---

### R-IMC-005 — Combined Gender distribution

- **As a** project lead
- **I want** one gender distribution covering both individual and group trainings
- **So that** I can see total reach by gender

**Details**
- One section `gender_distribution`, `{ id, name, count }[]`.
- **Individual** trainings (`session_format_id = 1`) contribute **one count per record**, grouped by `gender_id` → `gender.name`.
- **Group** trainings (`session_format_id = 2`) contribute **summed participants**: `SUM(session_participants_male | _female | _non_binary)`.
- The two contributions are **added per gender category**.
- The card MUST display a provenance note stating both sources are included (mixed units — see §9 DC-8 and proposal B-R3).

**Acceptance criteria**
- [x] AC.1 — For a fixture with 3 individual Male records and one group record carrying `session_participants_male = 10`, the Male count is **13**.
- [x] AC.2 — Group participant columns that are `NULL` are treated as `0`, not as a missing category.
- [x] AC.3 — A gender category with a zero total is omitted from the section.
- [x] AC.4 — Individual records are never double-counted via the group columns, and vice versa.
- [x] AC.5 — The rendered card shows the provenance note.
- [x] AC.6 — **Neither training type is subordinate to the other.** A project whose capacity-sharing results are **all group format** (zero individual records) still reports the full gender distribution from the group totals; likewise a project with only individual records reports from those alone.
- [x] AC.7 — The section is ordered `count DESC, id ASC` **after** the two contributions are summed — summing can reorder the ranking, so an order inherited from the query is not sufficient.

#### Scenario: Group-only project

- GIVEN a project whose capacity-sharing results are all group format
- AND one records `session_participants_male = 10`, `session_participants_female = 4`
- WHEN the payload is built
- THEN `gender_distribution` reports Male = 10 and Female = 4
- AND IT MUST report them even though the project has zero individual-training records
- BUT it must NOT return an empty section

#### Scenario: Mixed individual and group contribution

- GIVEN 3 individual capacity-sharing results with gender "Male"
- AND 1 group result with `session_participants_male = 10`, `_female = 4`, `_non_binary = NULL`
- WHEN the payload is built
- THEN `gender_distribution` reports Male = 13 and Female = 4
- AND IT MUST treat the NULL non-binary column as 0
- BUT it must NOT emit a "Non-binary" entry whose total is 0

---

### R-IMC-006 — Degree distribution, restricted to long-term training

- **As a** project lead
- **I want** the degree distribution for long-term trainings only
- **So that** the number reflects degree-bearing training and nothing else

**Details**
- Section `degree`, grouped by `degree_id` → `degrees.name`.
- Included **only** when `session_type_id` = Training **AND** `session_length_id` = Long-term (3 months and more).
- The filter MUST be the two-condition conjunction. Filtering on `degree_id IS NOT NULL` alone is **incorrect**: the form only reveals Degree for long-term training and clears it via `clearDegreeIdIfNotLongTerm` (`capacity-sharing.component.ts:85-93`), but historical rows switched away from long-term may retain a stale `degree_id`.

**Acceptance criteria**
- [x] AC.1 — A record with `session_type` = Engagement carrying a `degree_id` is **excluded**.
- [x] AC.2 — A record with `session_type` = Training, `session_length` = Short-term, carrying a `degree_id`, is **excluded**.
- [x] AC.3 — A record with Training + Long-term and a `degree_id` is **included**.
- [x] AC.4 — The card surfaces its filter scope so the number is not read as "all degrees".

#### Scenario: Stale degree on a short-term record

- GIVEN a capacity-sharing result with `session_type` = Training, `session_length` = Short-term, `degree_id` = "MSc"
- AND a second result with Training + Long-term, `degree_id` = "MSc"
- WHEN the payload is built
- THEN the `degree` section reports MSc = 1
- AND IT MUST apply both conditions as a conjunction
- BUT it must NOT report MSc = 2

---

### R-IMC-007 — Additive payload contract

- **As an** existing `reports/full` consumer **I want** the payload to grow without breaking **So that** the Chunk A charts keep working.

**Acceptance criteria**
- [x] AC.1 — All 7 pre-existing fields (`contract_id`, `top_partners`, `top_primary_levers`, `top_main_contact_persons`, `top_contributors`, `staff`, `geo_scope`) are unchanged in name, shape and content.
- [x] AC.2 — Every new section is always present as an array — empty rather than absent or `null`.
- [x] AC.3 — Every existing project-dashboard and `GetFullContractReportsService` spec passes unmodified except for fixture extension.
- [x] AC.4 — No URI version bump is required (non-breaking, additive).

---

### R-IMC-008 — Indicator metadata section with per-indicator bands

- **As a** project lead **I want** the new charts grouped by indicator **So that** 17 cards stay navigable.

**Details**
- A new *Indicator metadata* section renders below *Result analytics*.
- One **band** per indicator: Innovation Development (3 cards), Capacity Sharing (4), Policy Change (2), OICR (1).
- Bands are ordered by descending result count; cards within a band follow the order in §4.1.
- Bands are collapsible, default open.

**Acceptance criteria**
- [x] AC.1 — All 10 cards render with the titles in §4.1.
- [x] AC.2 — Each card is bound to its **own** payload section — verified per instance, not once at mechanism level (KZ-005).
- [x] AC.3 — Band order follows descending result count.
- [x] AC.4 — Collapsing a band hides its cards and updates `aria-expanded`.
- [x] AC.5 — The four Chunk A ranked cards and the geographic card are untouched.

#### Scenario: Ten cards, ten distinct bindings

- GIVEN a payload where all 10 sections carry distinct, non-empty data
- WHEN the dashboard renders
- THEN each of the 10 cards displays the data of its own section
- AND IT MUST be asserted separately for each of the 10 instances
- BUT it must NOT be considered covered by a single test of the card component in isolation

---

### R-IMC-009 — Band visibility follows indicator presence

- **As a** project lead **I want** bands for indicators I do not report to be absent **So that** I do not scroll past empty charts.

**Acceptance criteria**
- [x] AC.1 — An indicator with zero results on the project contributes **no band and no cards** to the DOM.
- [x] AC.2 — Visibility is driven by the existing `indicatorsWithResults()` computed (`project-dashboard.component.ts:121`), not a new parallel source.
- [x] AC.3 — A project with no results for any of the four indicators renders no *Indicator metadata* section heading at all.

#### Scenario: Project with no OICR work

- GIVEN a project with innovation results but zero OICR results
- WHEN the dashboard renders
- THEN no OICR band appears in the DOM
- AND IT MUST NOT render an OICR band in a collapsed or empty state
- BUT it must NOT hide the Innovation Development band

---

### R-IMC-010 — Unanswered-field empty state

- **As a** project lead **I want** to tell "nobody filled this in" apart from "this doesn't apply" **So that** I know whether to chase reporting.

**Details** — when the indicator **has** results but the field is NULL on all of them, the card renders with an explanatory empty state. This is distinct from R-IMC-009's hidden case.

**Acceptance criteria**
- [x] AC.1 — The card renders with an empty-state message naming the indicator's result count.
- [x] AC.2 — The card is **not** hidden.
- [x] AC.3 — The message is visually distinct from the error state.

---

### R-IMC-011 — Loading, error and retry states

- **As a** project lead **I want** the new cards to behave like the existing ones during load and failure **So that** the page is coherent.

**Acceptance criteria**
- [x] AC.1 — While `reports/full` is in flight, all 10 cards show the existing loading state.
- [x] AC.2 — On failure all 10 show the existing error state with a working retry.
- [x] AC.3 — Retry re-fetches once and repopulates every band.
- [x] AC.4 — No new loading/error pattern is introduced (`docs/ux-ui/design.md` OG-6).

---

### R-IMC-012 — Documentation currency

**Acceptance criteria**
- [x] AC.1 — Every new DTO field carries `@ApiProperty` **and the handler carries `@ApiOkResponse({ type: ContractFullReportsDto })`**, so the schema actually appears at `/swagger`. `@ApiProperty` alone is insufficient: the handler references no response type today, so the DTO is emitted into the OpenAPI document not at all.
- [x] AC.2 — `docs/trd/trd.md:299` is updated — `reports/full` returns 17 fields (16 sections + `contract_id`), not six sections.
- [x] AC.3 — **Restated.** PERF-5 (`docs/trd/trd.md:128`) counts *client HTTP requests* (4), which this spec does not change — the original wording ("reflects the new query count") was unsatisfiable. Instead, PERF-5 gains a note that `reports/full` issues **10 SQL queries in two sequential batches, with peak concurrency of 8** against a pool whose default limit is 10.
- [x] AC.4 — `docs/ux-ui/design.md` chart inventory and decisions log record the band pattern.

---

## 7. Non-Functional Requirements

### NFR-IMC-001 — `reports/full` latency under query fan-out

> **AMENDED 2026-07-30 by the T-08 Pivot, owner-approved.** The original target was *"p95 ≤ **1.5×** the pre-change p95; absolute p95 ≤ 3 s"*. **The relative bound is retired.** Two findings forced it, and both are recorded in `execution.md` § *Pivot Record: T-08*:
>
> 1. **It is not measurable outside a deployment-representative environment.** Measured over VPN, a `SELECT 1` — zero query work — costs **p95 155.5 ms**, more than the entire 8-query pre-change batch (43.67 ms), with a 6× range across samples. The composed path makes **two sequential round-trip windows** where the pre-change path makes one, so "2 RTT vs 1 RTT" over a variable link produces a 2–4× ratio that carries almost no information about the aggregations. Per **DC-9**, the noise exceeded the effect.
> 2. **The bound is not satisfied even by the remedy the design named for it.** DD-11's stated fallback — `Promise.all` racing both steps, plus an explicit `poolSize` change — yields `max(43.67, 92.71) = 92.71 ms` → **2.12×**, still over 1.5×. A condition that its own prescribed remedy cannot meet is a mis-calibrated condition, not a failing implementation. **1.5× of a 43.67 ms baseline leaves a 21.8 ms budget** — less than one round trip on this link, and on the order of one even on a fast one. A relative bound is a sound instrument against a slow baseline; against a 44 ms baseline it mostly counts round trips, which is a structural consequence of adding any query at all.
>
> **DD-11 (sequential composition) is retained.** It was never invalidated — it was left unverified, which is a different thing, and it remains the decision that keeps peak concurrency at today's 8 and removes this spec's infrastructure prerequisite.
>
> **The thresholds below are the Leader's calibration against observed data, with headroom — they are overridable by the owner, not derived from first principles.**

- **Category:** performance
- **Target — three parts, replacing the single relative bound:**
  - **(a) Absolute user-facing bound — the primary gate.** p95 of `GET reports/full` **≤ 3 s** on the largest available contract. *Unchanged from the original.* **Measured 2026-07-30: 174.5 ms over VPN (contract A1578, 521 primary results) — met with roughly 17× margin.**
  - **(b) Added-latency ceiling.** The metadata batch's own contribution — `max(Q1, Q2)`, **never `Q1 + Q2`**, since step 2 is a `Promise.all` — **≤ 250 ms** at p95. **Measured 2026-07-30: 92.7 ms over VPN — met.** VPN is a *pessimistic* proxy for production, where the server is co-located with the database, so this is a worst case rather than an optimistic one.
  - **(c) Environment-independent quality bar — the meaningful engineering check.** Each of Q1 and Q2's **server-side execution time** ≤ **50 ms** at p95, isolated from network cost (subtract the same session's `SELECT 1` baseline, or read the timing server-side). **NOT YET MEASURED — carried as outstanding.** This is the part that actually says something about the SQL rather than about the link, and it is the one a co-located re-measurement should settle.
- **How verified:** timed runs of the pre-change repository method (whose body is untouched, so both arms run in one process) against the composed service method. **Warm-ups discarded, ≥20 samples per arm, arms interleaved** — blocked runs let a transient network hiccup bias one arm systematically. **Report min / median / p95 / max / spread per arm**, never p95 alone.
- **`inconclusive` remains a valid and useful outcome** (§9 DC-9). **A new requirement learned from T-08: characterise the environment's noise floor before trusting any ratio or margin.** T-08's harness was otherwise sound — interleaved, warmed up, 25 samples, two contracts, `T_metadata` captured two independent ways — and still reached a wrong verdict, because it measured the arms' variance without measuring the link's. A `SELECT 1` probe costs one line and would have caught it.
- **Why this NFR is still measured early.** Part (c) is unverified, and if a co-located measurement shows the aggregations themselves are slow, that is a genuine design problem — the fallback would then be real work on the queries, not a composition change. Discovering it after the client is built remains the expensive path, so **T-10 … T-16 stay gated on (c)** per design §11.

### NFR-IMC-002 — Accessibility of the new controls
- **Category:** a11y (PRD C-4, WCAG 2.1 AA)
- **Target:** each band toggle is a real `<button>`, Tab-reachable, `Enter`/`Space` operable, exposes `aria-expanded`, and its accessible name includes the band's indicator so 4 toggles are distinguishable.
- **How verified:** component specs per band + the human check in §9.
- **T-09 — renegotiated after judgment, then RESOLVED by closing the gap.** This screen carries known gap **T-09** (the expanded-list scroll container is not keyboard-operable). An earlier revision asserted this spec "MUST NOT widen that gap" on the belief that the new cards would not engage the expansion overlay. **That belief was wrong** — `visibleLimit === null` *is* the expanded state, and under design DD-10 any metadata card with more than 5 categories engages the same overlay. This spec therefore **extends T-09's surface** from four ranked cards to those plus the high-cardinality metadata cards, and the original target was not satisfiable as written.
- **OQ-6 resolution (owner decision, 2026-07-30): pull T-09 in and close it.** The extended surface is *not* accepted as a carried gap — the gap is closed instead, so **this NFR's original target stands as written rather than being renegotiated**. The work is [`./tasks.md`](./tasks.md) **§ T-15** (make the expanded scroll container focusable and labelled, ~20 LOC including specs). Two consequences are recorded rather than glossed: T-15 modifies `ProjectDashboardCardComponent`, which design **DD-6** says not to touch — a narrow, owner-authorised, attribute-only exception that triggers **KZ-003**'s full-suite requirement (`tasks.md` RB-5); and it adds one keyboard tab stop per expanded card, which is the price of the fix.

### NFR-IMC-003 — Responsive containment
- **Category:** a11y / layout
- **Target:** zero horizontal overflow at 390 / 768 / 1440 px; bands collapse to one column below 720 px.
- **How verified:** **measurement in real headless Chrome, reproducing a known-overflow control first** (KZ-006). CSS review does not satisfy this.
- **Evidence status:** the mockup was measured at **500 px (the headless harness floor), 768 px and 1440 px** — 0 px overflow at each. **390 px has not been measured** and is the narrowest, most overflow-prone width this NFR names. It is outstanding evidence, not a re-run, and must be produced before this NFR can be called met.

### NFR-IMC-004 — Test coverage
- **Category:** dx
- **Target:** server ≥ 60 % global (unchanged); client floors unchanged (stmts 40 / branches 20 / lines 45 / funcs 30). Neither regresses.
- **How verified:** `npm run test:cov` (server), `npm run test:coverage` (client).

### NFR-IMC-005 — Blast-radius verification
- **Category:** reliability
- **Target:** `project-dashboard-card` is rendered by several hosts; changes to it or its host require a **full** client suite run, not a targeted one (KZ-003).
- **How verified:** full `npm test` in the client package.

---

## 8. Assumptions, Dependencies, Risks

| ID | Item | Mitigation |
| --- | --- | --- |
| **A-1** | **Narrowed.** Five lookups (`session_formats`, `session_types`, `session_lengths`, `gender`, `degrees`) are seeded by append-only migration `1727119632564-InsertDataControl.ts`, so they need no confirmation. Only the **CLARISA-synced** lookups (`clarisa_innovation_*`) plus `maturity_levels`, `policy_types`, `policy_stage` remain unverified. | Confirm those before execute. |
| **A-2** | **Corrected.** `session_format_id` 1 = Individual / 2 = Group; `session_length_id` 1 = Short-term / 2 = Long-term; `session_type_id` 1 = Training / 2 = Engagement — **all asserted in seed migration `1727119632564`**, and `SessionFormatEnum` / `SessionLengthEnum` already exist in the source tree. An earlier revision claimed these appeared only in client code and not in a migration; that was false. | Import the existing enums; add `SessionTypeEnum` — design DD-4. |
| **D-1** | Chunk A (`full-payload-show-more`). | ✅ Delivered, archived 2026-07-30 (`7f6aa178`). |
| **D-2** | Conflicts with Chunk C1 (shares `project-dashboard.component.*`). | Do not run concurrently. |
| **R-1** | **Corrected twice.** The baseline is **8** concurrent queries, not 6 — `getGeoScopeReport` runs a nested `Promise.all` of 3 (`agresso-contract.repository.ts:739-743`). The design consolidates the 10 aggregations into 2 queries **and composes them sequentially** (DD-11), so **peak concurrency remains 8** and no connection-pool change is needed. Total queries issued rises 8 → 10; peak does not move. **The cost is additive latency, not a round trip:** `T_total = T_existing + T_metadata`, where `T_metadata` is `max(Q1, Q2)` (step 2 is a `Promise.all` — **DD-12**), never the sum. **Resolved 2026-07-30 by the T-08 Pivot:** the *"1.5× bound requires `T_metadata ≤ 0.5 × T_existing`"* framing is **retired** — that bound was unmeasurable over VPN and unsatisfied even by its own named fallback (2.12×). **Measured:** composed p95 **174.5 ms** (absolute bound 3 s — met, ~17× margin), metadata batch **92.7 ms** (ceiling 250 ms — met). **DD-11 stands**; what remains open is NFR-IMC-001**(c)**, the server-side execution bar, which is unmeasured and still gates client work. | NFR-IMC-001 (a)(b) met, (c) open + DC-9. |
| **R-2** | Irregular table names (`gender`, `policy_stage`). | §4.1 is the single source; DC-4. |
| **R-3** | 10 card instances — one mis-bound instance passes a mechanism-level test. | KZ-005 per-instance gating, R-IMC-008 AC.2. |
| **B-F1** | Deferred: `results_by_status` server-side migration. TRD PERF-5 already anticipates it ("**2** once a follow-up chunk retires the status fetch"). | Own spec, later. |

---

## 9. Defect Classes And Their Gates

**The gate must be able to see the defect.** Classes DC-7 and DC-8 have **no automated check** and are substituted explicitly; DC-9 can produce a number that means nothing and therefore carries a no-pass clause.

| ID | Defect class | Gate |
| --- | --- | --- |
| DC-1 | Wrong aggregation SQL (join / group / scope) | `npm test` — server specs over seeded fixtures |
| DC-2 | Degree filter not a two-condition conjunction | Dedicated fixture with an Engagement row **and** a Short-term row that both carry `degree_id` (R-IMC-006) |
| DC-3 | Gender combination arithmetic wrong — **including the asymmetric case where group-only data is dropped** | Dedicated fixtures: one mixing individual records and group sums (R-IMC-005 AC.1), and one **group-only** (zero individual records) that must still yield the summed counts for every category with a non-zero total, zero-total categories dropped per AC.3 (wording corrected 2026-07-31 — see `execution.md` § *Owner escalation*). A merge that subordinates group rows to individual rows passes the first fixture and fails the second |
| DC-4 | Wrong lookup table or label column | Runtime SQL error is caught by e2e; a **wrong-but-valid** label mapping is not — covered by the human check below |
| DC-5 | One of 10 card instances mis-bound | Per-instance assertions (KZ-005). A single component-level test does **not** cover this |
| DC-6 | Band visibility inverted, or an empty state that misreports **why** it is empty | Component specs for present / absent / all-null / **all-non-primary**. The last case matters because band visibility and section content are scoped differently (design §7.5): a project whose results are all linked non-primary yields a visible band over empty sections, and copy that asserts "N results left this unanswered" would be false |
| DC-7 | Layout regression, horizontal overflow | **No jest gate.** Substitute: real-browser measurement at 3 widths, known failure reproduced first as control (KZ-006, NFR-IMC-003) |
| DC-8 | Visual quality — spacing, contrast, truncation, band order, colour ramp | **No automated gate.** `axe` cannot judge contrast over rendered output and no checker distinguishes plausible-but-wrong labelling. Substitute: **human check at the HITL pause** + a **T6 Multimodal** visual review of screenshots |
| DC-9 | Perf regression from fan-out | Timed runs (NFR-IMC-001). **No-pass clause:** if three runs vary by more than the effect being measured, the number is **not evidence** — report the spread and mark the check *inconclusive*. An inconclusive result MUST NOT be recorded as a pass |
| DC-10 | Swagger drift | ~~Manual `/swagger` inspection~~ → **CI-gated since 2026-07-31** (owner-authorised). `agresso-contract.swagger.spec.ts` builds the OpenAPI document and asserts two document-level facts: the `reports/full` 200 carries a `$ref`, and **no `$ref` in the document dangles**. Deliberately does **not** assert field names — that would duplicate the DTO and become churn on every additive change; the field contract is a **compile** error already via `ContractFullReportsDto implements IndicatorMetadataSectionsDto`. **Mutation-verified:** removing `@ApiOkResponse` reddens it. Manual inspection remains available but is no longer the only gate |
| DC-11 | Existing consumers broken | Full client + server suites, unmodified specs (R-IMC-007 AC.3, KZ-003) |
| DC-12 | **Union parameter mis-binding — silent zero rows.** With the aggregations unioned into multi-branch queries, a misplaced positional parameter binds a contract id into a lookup-id comparison and returns **zero rows instead of erroring**. | Design DD-1 removes the hazard structurally (CTE binds the contract id once). Gate: a fixture carrying **distinct non-empty data in every branch** — a fixture where any branch is legitimately empty cannot distinguish "no data" from "mis-bound" |
| DC-13 | **Expansion overlay engaged unintentionally** on a card with > 5 categories (stray toggle, out-of-flow overlay, widened T-09 surface). | Component spec asserting toggle presence/absence at the 5-category boundary in **both** directions (design §7.2). Not caught by the mockup, which caps every list at 5 |

**DC-8 — resolved as an owner-owned check, 2026-07-31.** It still has no mechanical gate, and none is possible: `axe` cannot evaluate contrast over rendered output and no checker distinguishes plausible-but-wrong labelling from correct labelling. **The owner has committed to testing this personally once development is complete.** That converts the previous "accepted risk" into an **assigned check with a named owner and a defined trigger** — which is materially better than a risk nobody owns, and is the strongest available substitute for a defect class that cannot be automated.

Two consequences worth stating plainly:
- **The spec is not done when the tasks are done.** DC-8's check happens *after* T-10 … T-17 land, so `tasks.md` §8's done-definition cannot close on task completion alone. It is recorded there as an owner item.
- **This is the substitute, not a formality.** DC-8 is this spec's **dominant** defect class — spacing, contrast, truncation, band order, colour ramp — and every one of those is invisible to the 323 test suites that guard everything else. A T6 multimodal screenshot review remains available as a secondary aid if wanted, but the owner's own inspection is now the gate of record.

---

## 10. Open Questions

| ID | Question | Owner | Due |
| --- | --- | --- | --- |
| ~~OQ-1~~ | ✅ Closed — design DD-4. The enums already exist and the ids are seeded. | — | — |
| ~~OQ-2~~ | ✅ Closed — design **DD-2 + DD-8**: symmetric sum over the union of ids; unmatched categories pass through from either side. `gender` is seeded with exactly Male/Female/Non-binary, so pass-through is defensive. | — | — |
| ~~OQ-3~~ | ✅ **Closed 2026-07-30 by T-01** against live rows. Readiness → `CONCAT(level,'. ',name)`; maturity → `full_name`. **A third case was found that this question had missed:** `policy_stage.name` is only `"Stage 1"`, so that chart uses `description`. See §4.1 and `execution.md` § T-01. | design | ✅ closed |
| ~~OQ-4~~ | ✅ Closed — design DD-9, in-memory. | — | — |
| ~~OQ-5~~ | ✅ **Answered 2026-07-30 by T-01:** readiness **10 rows** (> 5 — engages the expansion contract), types **4**, characteristics **4**. **Exactly one card of ten** engages it, which is what makes design §7.2 / DD-10 and DC-13 load-bearing rather than theoretical — and confirms the OQ-6 pull-in was aimed at a real surface. | eng | ✅ closed |
| ~~OQ-6~~ | ✅ **Closed 2026-07-30 — owner decision: pull T-09 in and close it.** Became [`./tasks.md`](./tasks.md) **§ T-15**; NFR-IMC-002's original target therefore stands rather than being renegotiated. Its two costs (the narrow DD-6 exception, one extra tab stop per expanded card) are recorded in NFR-IMC-002 and `tasks.md` RB-5. | product + eng lead | ✅ closed |

---

## 11. Requirement ID Index

| ID | Title | Surface |
| --- | --- | --- |
| R-IMC-001 | Innovation Development aggregations | Server |
| R-IMC-002 | OICR maturity aggregation | Server |
| R-IMC-003 | Policy Change aggregations | Server |
| R-IMC-004 | Capacity Sharing format + type | Server |
| R-IMC-005 | Combined Gender distribution | Server + Client |
| R-IMC-006 | Degree, long-term training only | Server + Client |
| R-IMC-007 | Additive payload contract | Server |
| R-IMC-008 | Indicator metadata bands | Client |
| R-IMC-009 | Band visibility (D-7) | Client |
| R-IMC-010 | Unanswered-field empty state | Client |
| R-IMC-011 | Loading / error / retry | Client |
| R-IMC-012 | Documentation currency | Docs |
| NFR-IMC-001 | Latency under fan-out | Server |
| NFR-IMC-002 | Accessibility | Client |
| NFR-IMC-003 | Responsive containment | Client |
| NFR-IMC-004 | Coverage | Both |
| NFR-IMC-005 | Blast-radius verification | Client |

---

## 12. Sign-off

- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name>
- [ ] Security review — **n/a** (read-only, no auth change)
- [ ] DevOps — **n/a** (no infra change)
