# Proposal — Chunk A: Full-payload migration + Show-more + title alignment

> Child of [`../analytics-expansion/proposal.md`](../analytics-expansion/proposal.md) (umbrella). Shared context — problem inventory P-1…P-9, decomposition rationale, RICE, and decisions **D-1…D-7** — lives there and is **not restated here**. This document is the slice boundary.

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/full-payload-show-more/` |
| Type | **Change** |
| Approval Mode | `gated` |
| Created | 2026-07-29 |
| Umbrella | `docs/specs/project-dashboard/analytics-expansion/` |
| Depends on | **none** — first chunk, unblocks B and C1 |
| Parallel-safe | **no** — owns `project-dashboard.component.*`, `project-dashboard-card.component.*`, `geo-scope-card.component.*`, `api.service.ts` |
| Governing decisions | D-1 (geocoding limiter), D-2 (in-place expansion), D-3 (top 5), D-4 (titles) |
| Surfaces | **Client only** — no server change |

## 2. Intent

Make the dashboard load its analytics from the single `reports/full` payload that already exists on the server, and let every ranked chart reveal its complete list in place — establishing the two contracts (payload shape, expansion affordance) that Chunks B and C1 build on.

## 3. Problem / Current Behavior

See umbrella P-1, P-2, P-3, P-6. In one line: `GET /api/v1/agresso/contracts/reports/full` ships and returns everything unbounded, **no client code calls it**, the dashboard instead fires 6 requests capped at 4 rows, and nothing past rank 4 is reachable by any user.

## 4. Proposed Outcome

- The dashboard issues **2** requests on load: `reports/full` + `agresso/contracts/:id/results/count`.
- Each of the four ranked cards shows **5** rows and a **"Show more"** control; activating it expands the card **in place** to the full ranked list, scrolling internally, with **"Show less"** to collapse. No dialog, no navigation, no extra request.
- The geographic-scope card expands its country/sub-national **list** the same way; its **map keeps the top-5 / top-3 sub-list** (D-1).
- Chart titles read per the D-4 table.

## 5. Scope

| # | Item |
| --- | --- |
| A-1 | `ContractFullReports` client interface mirroring `ContractFullReportsDto` (`reports-full.dto.ts`) — sections `top_primary_levers`, `top_contributors`, `top_main_contact_persons`, `staff`, `top_partners`, `geo_scope.{geo_scope_summary,top_regions,top_countries}`. |
| A-2 | `GET_FullContractReports(contractId)` in `api.service.ts` + spec (URL encoding of `contract-id`, per the existing `GET_Top*` test pattern). |
| A-3 | `GetFullContractReportsService` — one signal-based service exposing `loading`, `loadError`, and a per-section accessor, replacing the five per-report services as the **dashboard's** data source. |
| A-4 | `project-dashboard.component.ts`: single `main(contractId)` call; the existing `contributorItems` / `mainContactPersonItems` / `partnerItems` / `leverItems` computeds re-source from the full payload and keep their current mapping + sort; top-5 slicing applied for the collapsed view (D-3). |
| A-5 | `ProjectDashboardCardComponent`: internal `expanded` signal, `fullItems` vs `visibleItems`, "Show more"/"Show less" toggle with `aria-expanded` + accessible name including the chart title, `max-height` + `overflow-y: auto` on the expanded list, applied across all five `layout()` branches in `project-dashboard-card.component.html` (`columns`, `rows-partners`, `rows-stacked-lever`, `rows-stacked`, default). Expansion resets on contract change. |
| A-6 | `GeoScopeCardComponent`: new `mapCountries` computed (top 5 countries by count, top 3 sub-nationals each) feeding `[countries]` at `geo-scope-card.component.html:7` — per D-1, placed here and **not** in `geo-scope-map.component.ts` so Chunk D stays parallel-safe. Card lists expand to the full set. |
| A-7 | Titles renamed per D-4 (7 rows). |
| A-8 | Retire the five dashboard services + five `api.service` methods + their specs. |
| A-9 | Payload-size measurement against the largest real contract (umbrella R-1) — a finding recorded in the spec's design doc, gating whether a server ceiling is needed. |
| A-10 | Specs for A-3, A-5, A-6 and the retitling assertion (umbrella SC-4). |

## 6. Non-Goals

- Any server change — `reports/full` is consumed as-is (a size ceiling, if A-9 proves one is needed, becomes its own change).
- New charts (Chunk B) · click-to-filter (Chunk C1) · Leaflet (Chunk D).
- Moving *Results by status* server-side — that is **D-6, assigned to Chunk B**. This chunk leaves `loadProjectResultsByStatus` untouched, so the dashboard still makes its 10 000-row call until B lands. Stated explicitly because it means SC-1's "2 requests" is really "2 analytics requests + the status call" until Chunk B.
- Removing the `reports/top-*` server endpoints (umbrella OQ-8).

## 7. Affected Users, Systems, And Specs

| Area | Detail |
| --- | --- |
| Users | Project leads / program staff on `platform/project-detail/:id/project-dashboard` |
| Modified | `project-dashboard.component.{ts,html,spec.ts}`, `project-dashboard-card.component.{ts,html,spec.ts}`, `geo-scope-card.component.{ts,html,spec.ts}`, `api.service.{ts,spec.ts}`, `shared/interfaces/project-dashboard.interface.ts`, new `shared/interfaces/contract-full-reports.interface.ts`, new `shared/services/get-full-contract-reports.service.ts` |
| Deleted | `get-top-contributors-contracts.service.ts`, `get-top-main-contact-persons.service.ts`, `get-top-partners.service.ts`, `get-top-primary-levers.service.ts`, `get-geo-scope.service.ts` + specs |
| Untouched | `geo-scope-map.component.*` (Chunk D owns it) — **this is a hard boundary, not a preference** |
| Docs | `docs/ux-ui/design.md` — expanded-card pattern + renamed titles; `docs/trd/trd.md` — `reports/full` as the dashboard's analytics contract |

## 8. Visual Reference

- **Source:** none yet — **needed before implementation** (umbrella §9).
- **Location:** to be generated at `docs/specs/project-dashboard/full-payload-show-more/mockup/`.
- **Notes:** Must cover **collapsed and expanded** states of a ranked card inside the `lg:grid-cols-2` / `lg:items-stretch` grid, and the geographic card expanded with its map unchanged. This is the layout contract Chunk B inherits for ~10 more cards, so getting it wrong here multiplies.

## 9. Requirement Delta Preview

### ADDED
- Client consumption of `reports/full`; `GET_FullContractReports`; `GetFullContractReportsService`.
- "Show more"/"Show less" in-place expansion on all ranked cards (D-2).
- `mapCountries` geocoding limiter (D-1).

### MODIFIED
- Dashboard analytics requests: 6 → 1 (+ the untouched status call, see §6).
- Ranked cards show **5** rows, not 4 (D-3) — visible change.
- Top-N slicing moves server-side `limit` → client-side.
- 7 chart titles (D-4).

### REMOVED
- Five dashboard data services + five `api.service` methods (server endpoints retained).

## 10. Approach Options

| | **Option 1 — Expansion inside `ProjectDashboardCardComponent`** (recommended) | **Option 2 — Expansion in `project-dashboard.component`** |
| --- | --- | --- |
| Where state lives | One `expanded` signal per card instance, encapsulated | 4+ signals in the parent, passed down as inputs |
| Chunk B cost | New cards inherit expansion **free** | Every new card needs a new parent signal + wiring |
| Testability | One component spec covers all five layouts | Parent spec grows with each card |
| Risk | Must handle all five `layout()` branches in one template | Layout branches handled per call site — more duplication |

**Recommended: Option 1.** Chunk B adds ~10 cards to this same component; putting the affordance in the card means B writes zero expansion code. The cost — covering five template branches once — is paid a single time here.

## 11. Risks, Dependencies, And Open Questions

| ID | Item |
| --- | --- |
| **A-R1** | Inherits umbrella **R-1** (unbounded payload) and owns its measurement (A-9). D-2 makes it sharper: expanded rows render inside the dashboard's change-detection tree. Mitigated by the internal scroll (SC-2b) and `OnPush`, which the component already uses. |
| **A-R2** | The five `layout()` branches have divergent markup (fixed `itemHeightPx`, stacked bars, icon slots). A single expansion mechanism must not break `rows-partners`' bar-width maths (`partnerBarWidthPercent` is relative to `maxCount()`, which **changes when the list expands** — the bars will rescale on expand unless `maxCount` is pinned to the full list). **This is the subtlest defect risk in the chunk** and needs an explicit acceptance criterion. |
| **A-R3** | `mainContactPersonItems` keys its `id` off the formatted name (`project-dashboard.component.ts:161`). Across a full unbounded list, two people with the same display name collide in `@for … track`. Needs a stable key from the payload's `user_id`. |
| **A-R4** | Retiring five services may break unrelated consumers. Verified: only the dashboard injects them (component `providers`), but the child spec must re-confirm before deletion. |
| **A-D1** | Depends on nothing. **Blocks** Chunk B (payload contract + card affordance) and Chunk C1 (which makes these same rows clickable). |
| **A-OQ1** | Does the expanded list keep the rank badge numbering past 5 (6, 7, 8…)? Default: **yes** — the AC requires ranking order to be preserved, and hiding ranks past 5 would look like a bug. |

## 12. Success Criteria

Umbrella SC-1, SC-2, SC-2b, SC-4, SC-5b, SC-7, SC-8 apply. Chunk-specific:

| ID | Criterion |
| --- | --- |
| A-SC1 | Exactly **one** `reports/full` request per contract change; the four `reports/top-*` and `reports/geo-scope` URLs appear in **no** network call from the dashboard. |
| A-SC2 | Collapsed = 5 rows; expanded = every row from the payload, same order, ranks continuing past 5; collapse restores 5. Zero network calls on toggle. |
| A-SC3 | Per A-R2: bar proportions in the `rows-partners` and `rows-stacked-lever` layouts are computed against the **full** list, so expanding does not rescale the visible bars. |
| A-SC4 | Per A-R3: two contacts sharing a display name both render, no `@for` track collision. |
| A-SC5 | Geocoding calls ≤ 20 on load; expanding the geographic card adds **zero** and leaves plotted map points identical. |
| A-SC6 | `npm test` + `npm run lint` pass; client coverage floors held. |

## 13. Next Step

```text
/akili-specify project-dashboard/full-payload-show-more
```

Generate the mockup (§8) during specification, before implementation.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
