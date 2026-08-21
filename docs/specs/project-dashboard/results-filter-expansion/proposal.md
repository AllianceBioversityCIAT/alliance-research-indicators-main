# Proposal — Chunk C2: Results filter expansion (new drill-down dimensions)

> Child of [`../analytics-expansion/proposal.md`](../analytics-expansion/proposal.md) (umbrella). Shared context — problem inventory, decomposition, decisions **D-1…D-7** — lives there and is **not restated here**.
>
> ⚠️ **This is a Results Center change, not a dashboard change.** It is scoped out of the dashboard work deliberately, so its real cost is visible rather than buried in a dashboard ticket. It is the only chunk marked **Could**.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/results-filter-expansion/` |
| Type | **Change** |
| Approval Mode | `gated` |
| Created | 2026-07-29 |
| Umbrella | `docs/specs/project-dashboard/analytics-expansion/` |
| Depends on | **Chunk C1** (`project-dashboard/chart-drilldown`) — reuses its navigation + seeding mechanism |
| Parallel-safe | **no** — changes a shared filter contract used by the whole Results Center |
| MoSCoW / RICE | **Could** / **8** — lowest of the five |
| Surfaces | **Server + Client**, and the blast radius is the Results Center, not the dashboard |
| Status | **Deferred by design.** Do not start until C1 has proven the drill-down UX in front of users. |

## 2. Intent

Extend the results filter with the dimensions the dashboard's remaining charts represent, so that *every* chart item can drill into a filtered Results table — not just indicator, status and lever.

## 3. Problem / Current Behavior

Umbrella **P-9**. `ResultFilter` (`result.interface.ts:50-61`) supports only `indicator-codes`, `create-user-codes`, `lever-codes`, `indicator-codes-tabs`, `indicator-codes-filter`, `status-codes`, `contract-codes`, `platform-code`, `result-codes`, `years`.

After Chunk C1, three chart dimensions are clickable and the rest are not — umbrella **C1-R2**: users click the inert cards and read the feature as broken. That inconsistency is the actual problem this chunk solves; the filters are the means.

Dimensions with **no** filter today:

| Dimension | Chart | Underlying join |
| --- | --- | --- |
| Partner institution | Results Partners | `result_institutions` |
| Main contact person | Main contact person | `result_users` (contact role) |
| Contributing project | Contributing projects | `result_contracts` (non-primary) |
| Country / region / sub-national | Geographic Scope | `result_countries`, `result_regions`, `result_countries_sub_nationals` |
| Innovation nature / type / readiness | Chunk B | `result_innovation_dev` |
| OICR maturity | Chunk B | `result_oicr` |
| Policy type / stage | Chunk B | `result_policy_change` |
| Session format / type / degree / gender | Chunk B | `result_capacity_sharing` |

That is **up to 15 new filter dimensions** — hence the effort estimate and the deferral.

## 4. Proposed Outcome

Every dashboard chart item is clickable and drills into a correctly filtered Results table, with the filter visible as a removable chip and available in the Results Center's own filter UI — not only as a drill-down side effect.

## 5. Scope

Per dimension taken on:

| # | Item |
| --- | --- |
| C2-1 | New query param on `GET /api/v1/results` (+ v2), with `@ApiQuery` (root guide §4.1). |
| C2-2 | Repository join + `WHERE` clause, composable with every existing filter. |
| C2-3 | New `ResultFilter` field + `TableFilters` entry + `appliedFilters` plumbing. |
| C2-4 | Results Center filter UI control (the filter is only honest if a user can set and clear it there, not just arrive with it). |
| C2-5 | Chip display text via `getFilterDisplayText` + `removeFilter` support. |
| C2-6 | Chart wiring on the dashboard, reusing C1's mechanism. |
| C2-7 | Server + client specs per dimension. |

**Phasing is expected, not optional.** Recommended slices, highest value first:

| Slice | Dimensions | Rationale |
| --- | --- | --- |
| C2-a | Partner institution, Main contact person, Contributing project | The three inert cards that exist **today** — closes C1-R2 for the current dashboard |
| C2-b | Geography (country / region / sub-national) | Higher complexity: three related tables + a scope hierarchy |
| C2-c | Chunk B metadata dimensions | Only worth it once B is in production and usage shows which are wanted |

## 6. Non-Goals

- Changing existing filter semantics or the `ServerResponseDto` envelope.
- A generic/dynamic filter engine — each dimension is an explicit, typed param (root guide: no ad-hoc contracts).
- Cross-project filtering.
- Saved/shareable filter presets.

## 7. Affected Users, Systems, And Specs

| Area | Detail |
| --- | --- |
| Users | **All** Results Center users, not only Project Detail visitors — this is why it is separated |
| Server | `results` module controller/service/repository, results filter DTOs, Swagger |
| Client | `result.interface.ts`, `results-center.service.ts`, `results-center-table.component.*`, filter toolbar components, `project-dashboard.component.*` |
| Ownership | Needs **Results Center sign-off** — a shared contract changes |
| Docs | `docs/trd/trd.md` API contract; `docs/ux-ui/design.md` filter inventory |

## 8. Visual Reference

- **Source:** none.
- **Location:** `docs/specs/project-dashboard/results-filter-expansion/mockup/` if the filter toolbar changes shape.
- **Notes:** Adding up to 15 controls to the Results Center filter toolbar is its own UX problem, independent of the dashboard. Sizing it is part of this spec, and is a further reason it does not belong inside a dashboard ticket.

## 9. Requirement Delta Preview

### ADDED
- Up to 15 query params on `GET /api/v1/results`, with joins.
- Matching `ResultFilter` / `TableFilters` fields, filter UI controls, and chips.
- Clickable drill-down on the remaining dashboard charts.

### MODIFIED
- The results query gains joins — **performance-sensitive**, see C2-R1.
- The Results Center filter toolbar grows.

### REMOVED
- Nothing.

## 10. Approach Options

| | **Option 1 — All dimensions in one spec** | **Option 2 — Phased C2-a → C2-b → C2-c** (recommended) | **Option 3 — Don't build it; remove the inconsistency instead** |
| --- | --- | --- | --- |
| Effort | ~12 dev-days, one long-lived branch | 3 smaller shippable slices | ~0.5 day |
| Risk to Results Center | High — 15 joins land at once | Contained per slice | None |
| Closes C1-R2 | Yes, eventually | **Yes, at slice C2-a** | Yes, differently — by making no card look clickable |
| Feedback | None until the end | After each slice | Immediate |

**Recommended: Option 2**, starting with **C2-a**, which closes the inconsistency for the cards that exist today at roughly a quarter of the cost.

**Option 3 deserves a real hearing.** If drill-down on partners/contacts/geography turns out not to be wanted, the honest fix for C1-R2 is to stop at C1's three dimensions and make the rest visibly non-interactive — which C1-SC4 already requires. That is a legitimate outcome of this proposal, not a failure. Decide it with usage data after C1 ships, not now.

## 11. Risks, Dependencies, And Open Questions

| ID | Item |
| --- | --- |
| **C2-R1** | **Query performance.** The results query is the platform's hottest read. Adding joins over `result_institutions`, `result_users`, `result_countries*` risks regressing the Results Center for everyone. Each slice needs an `EXPLAIN` and a p95 measurement before merge. **This is the reason for deferral, more than the effort.** |
| **C2-R2** | **Shared-contract blast radius.** `ResultFilter` is consumed across the Results Center, the dashboard, and the embedded Pending-revision table. A change here can break surfaces this spec does not touch. |
| **C2-R3** | **Filter combinatorics.** 15 new dimensions × existing filters is untestable exhaustively. Test each new filter alone plus in combination with `contract-codes` and `status-codes` (the two always present in the dashboard flow). |
| **C2-R4** | **Semantics of multi-valued dimensions.** A result can have many partner institutions. Does filtering by one mean "has this partner" (`EXISTS`) or "has only this partner"? `EXISTS` is intended; getting it wrong silently under-counts. |
| **C2-R5** | Metadata dimensions (C2-c) are absent on TIP/PRMS/AICCRA imports, so those filters will appear to "lose" results. Needs a UI note. |
| **C2-D1** | Depends on **C1**. Needs Results Center ownership sign-off. |
| **C2-OQ1** | Is drill-down on these dimensions actually wanted, or is C1's three enough? **Answer with usage data after C1 ships** — this gates whether C2 runs at all. |
| **C2-OQ2** | Should the geography filter be one param with a scope discriminator, or three separate params? |
| **C2-OQ3** | Do the new filters appear in the Results Center toolbar for **all** users, or only via dashboard drill-down? Default: **all** — a filter a user cannot set themselves is a hidden feature. |

## 12. Success Criteria

Per slice:

| ID | Criterion |
| --- | --- |
| C2-SC1 | Each new filter returns exactly the expected result set, verified server-side against a seeded fixture. |
| C2-SC2 | Per C2-R4: multi-valued dimensions use `EXISTS` semantics — a result with partners {X, Y} appears when filtering by X. |
| C2-SC3 | Each new filter composes correctly with `contract-codes` and `status-codes`. |
| C2-SC4 | Per C2-R1: `GET /api/v1/results` p95 does not regress measurably versus the pre-slice baseline; `EXPLAIN` recorded in the spec. |
| C2-SC5 | Each new filter is settable **and** clearable from the Results Center toolbar, and renders a removable chip. |
| C2-SC6 | Every previously inert dashboard chart in the slice is clickable and lands correctly filtered. |
| C2-SC7 | `npm test` + `npm run lint` pass in both packages; server coverage ≥ 60 %. |

## 13. Next Step

**Do not specify yet.** Revisit after Chunk C1 is in production and C2-OQ1 can be answered with evidence. When it is:

```text
/akili-specify project-dashboard/results-filter-expansion
```

Scope the first cycle to **slice C2-a only**.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
