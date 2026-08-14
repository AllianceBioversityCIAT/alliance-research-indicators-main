# Proposal — Chunk A2: Geographic scope card — full payload, Leaflet-safe bounding, and expansion

> Split out of [`../full-payload-show-more/`](../full-payload-show-more/requirements.md) (Chunk A) on 2026-07-29, **after two rounds of blind dual review concentrated their severe finding and most warnings on this one surface**. Child of the umbrella [`../analytics-expansion/proposal.md`](../analytics-expansion/proposal.md).

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/project-dashboard/geo-scope-expansion/` |
| Type | **Change** |
| Approval Mode | `gated` |
| Created | 2026-07-29 |
| Origin | Scope reduction of Chunk A, authorised by the requester after judgment-day round 2 |
| Depends on | **Chunk A** (`project-dashboard/full-payload-show-more`) — needs `GetFullContractReportsService`, the `ContractFullReports` interface, and the card's `visibleLimit`/`expandToggled` contract |
| Parallel-safe | **no** vs Chunk A and Chunk D (Chunk D rewrites `geo-scope-map.component.*`) |
| Governing decisions inherited | umbrella **D-1** (geocoding limiter), **D-2** (in-place expansion), **D-3** (top 5), **D-4** (titles) |
| Surfaces | **Client only** |
| Requirement IDs | This spec numbers its own requirements **`R-GEO-###` / `NFR-GEO-###`**. Chunk A's `R-PDB-006` and `NFR-PDB-002` are **retired there and not reused here** — reusing a `PDB` id in a different spec folder would make traceability ambiguous. Their *content* is carried by A2-1…A2-10 and A2-SC1…SC11 |

## 2. Why this is its own spec

Chunk A's review history is the argument. Across two rounds of independent dual review, **every severe finding and the majority of warnings landed on the geographic card**, never on the four ranked cards. The reason is structural, not incidental:

| Property | The four ranked cards | The geographic card |
| --- | --- | --- |
| Card variant | `variant="card"` — has chrome, can host its own toggle | **`variant="list"` × 3** — no chrome, no wrapper element at all |
| Cost per rendered row | zero | **one Mapbox geocoding request per sub-national** |
| Data shape | one flat section each | nested countries → sub-nationals, consumed in **two different shapes** by the map and the lists |
| Pre-existing truncation | none | **`.slice(0, 3)` per country and a global `.slice(0, 6)`**, serving the map and the display list simultaneously |
| Data service | four, all deleted by A | its own, plus a summary and a regions list |
| Downstream conflict | none | **Chunk D rewrites the map component** |

Patching this inside Chunk A consumed the review budget without converging: each fix round closed findings and created new ones on this same surface (an ~800-row flatten, a toggle implemented twice with no a11y gate, a predicate with no owner).

**The cut is clean because Chunk A leaves this card completely untouched.** Chunk A's card change is purely additive — `visibleLimit` defaults to `null`, i.e. today's behaviour — so the three geographic lists render exactly as they do now until this spec lands (Chunk A DD-12, asserted by its R-PDB-002 AC.5). Until then the card keeps `GetGeoScopeService` and its server-side `limit=5`.

## 3. Problem / Current Behavior

| # | Current behavior | Where |
| --- | --- | --- |
| P-1 | The card fetches `reports/geo-scope` with `limit = 5` through its own `GetGeoScopeService` — one request that Chunk A's single-payload migration does not eliminate | `get-geo-scope.service.ts`, `api.service.ts` |
| P-2 | `topCountries()` applies **`.slice(0, 3)`** to `top_sub_nationals` per country; `topSubNationals()` then applies a global **`.slice(0, 6)`**. Today's sub-national list is a top-6 drawn from an already-truncated pool | `geo-scope-card.component.ts:57-106` |
| P-3 | `topCountries()` serves **both** the map (`[countries]="service.topCountries()"`) and the display lists, in two incompatible shapes — the map consumes raw snake_case `GeoScopeCountry`, the lists consume camelCase `GeoScopeCountrySummary` | `geo-scope-card.component.html:7`, `geo-scope-map.util.ts` |
| P-4 | `topRegions()` performs **no sort** — a bare `.map()` over the service signal, so "top regions" is server order, not descending count | `geo-scope-card.component.ts:84-90` |
| P-5 | `topRegions()` keys its `id` on `region_name` — the display label — although `RegionByContractCountDto` exposes `region_id` | same |
| P-6 | `topSubNationalItems()` projects only `{id, label, count}`, **discarding `countryName`** — two identically named sub-nationals in different countries are indistinguishable | `:100-106` |
| P-7 | The three lists have **no expansion**, and `variant="list"` has no chrome in which the card could render a toggle | `project-dashboard-card.component.html:1-3` |
| P-8 | Sub-nationals **never** resolve from the static centroid table, so each one always costs a geocoding request; countries with a centroid cost zero | `geo-scope-map.util.ts:32-51,70` — verified by both judges |
| P-9 | The card title is "Top geographic scope" — the fifth D-4 rename, left behind by Chunk A | `geo-scope-card.component.html:1` |

## 4. Proposed Outcome

- The card reads from the **already-loaded** `reports/full` payload; `reports/geo-scope` and `GetGeoScopeService` are retired. On the basis fixed in Chunk A's NFR-PDB-001, the dashboard's load effect drops from **4 requests to 3** — reaching the umbrella's target of 2 only once Chunk B retires the `limit: 10_000` status fetch.
- The map receives a **bounded** sub-list — top 5 countries, top 3 sub-nationals each (umbrella **D-1**) — in the raw shape it actually consumes, built independently of the display lists.
- The three lists gain in-place expansion with host-owned toggles, correct ordering, stable keys, and country disambiguation.
- Geocoding stays at **≤ 20 requests per load** regardless of payload size, and **zero** on expand.
- The card is titled **Geographic Scope**.

## 5. Scope

| # | Item | Closes |
| --- | --- | --- |
| A2-1 | Re-source the card from `GetFullContractReportsService`: replace the `GetGeoScopeService` injection (`:22`) and rewrite its six dependents (`isEmpty`, `summaryMetrics`, `topRegions`, `topCountries`, `topSubNationals`, `topSubNationalItems`) plus four template bindings (`:3-4,7`) | P-1 |
| A2-2 | Delete `GetGeoScopeService`, `GET_GeoScope` and their specs | P-1 |
| A2-3 | **`mapCountries`** — a new computed over the **raw** payload producing snake_case `GeoScopeCountry[]`, top 5 countries by count × top 3 sub-nationals, independent of the display path | P-3, D-1 |
| A2-4 | Remove `.slice(0, 3)` and `.slice(0, 6)` from the display path — **and decide the flatten bound** (A2-OQ1). Removing both without a bound yields ~800 rows on a 40 × 20 payload | P-2 |
| A2-5 | Sort `topRegions()` descending; key it on `region_id`; carry `countryName` into `topSubNationalItems()` | P-4, P-5, P-6 |
| A2-6 | Expansion for the three lists: host-owned state (Chunk A's `visibleLimit`/`expandToggled` contract), one toggle per list (umbrella OQ-1 default) | P-7 |
| A2-7 | **Extract the toggle as a shared artifact** — a component or directive — so the host-rendered toggles cannot diverge from the card's, and the a11y contract (`aria-expanded`, accessible name including the list heading, keyboard) is enforced in one place | NFR |
| A2-8 | Bound the expanded lists' height. `variant="list"` has **no wrapper element**, so one must be introduced | NFR |
| A2-9 | Title → **Geographic Scope** | P-9 |
| A2-10 | Specs: card spec rewrite (259 lines, currently provides the deleted service **and stubs the ranked card**), geocoding call-count assertions, bounding, ordering, keys | — |

## 6. Non-Goals

- **The map library.** Chunk D replaces `mapbox-gl` with Leaflet. This spec must not edit `geo-scope-map.component.*` — it changes only what is *passed in*. That keeps both specs viable independently; see A2-R1.
- The geocoding service itself (`MapboxGeocodingService`, `environment.mapboxGeocodingUrl`) — untouched, per umbrella **D-5**.
- `geo-scope-map.util.ts` and the `GeoScopeCountry` / `GeocodedLocation` interfaces.
- Region/country/sub-national **drill-down** filters — Chunk C2.
- New geographic charts — none requested.

## 7. Affected Users, Systems, And Specs

| Area | Detail |
| --- | --- |
| Users | Project leads / MEL analysts on the project dashboard |
| Modified | `geo-scope-card.component.{ts,html,spec.ts}`, `api.service.{ts,spec.ts}`, `project-dashboard-card.component.*` (toggle extraction only), possibly `project-dashboard.component.html` (provider reach) |
| Deleted | `get-geo-scope.service.ts` + spec, `GET_GeoScope` |
| **Must not touch** | `geo-scope-map.component.*` (Chunk D), `geo-scope-map.util.ts`, `MapboxGeocodingService` |
| Docs | `docs/ux-ui/design.md` — geographic card behaviour + the expanded-list pattern |

## 8. Visual Reference

- **Source:** none. Inherits Chunk A's **GATE-2** obligation and extends it: the mockup must cover a `variant="list"` list expanded **beside the fixed-height map**, which is the geometry Chunk A's mockup does not exercise.
- **Location:** `docs/specs/project-dashboard/geo-scope-expansion/mockup/`.

## 9. Requirement Delta Preview

### ADDED
- `mapCountries` bounding (D-1); expansion for three lists; a shared toggle artifact with the a11y contract; a bounded wrapper for `variant="list"`; `countryName` on sub-national rows.

### MODIFIED
- Data source: `reports/geo-scope` → the already-loaded `reports/full` payload.
- `topRegions()` gains a sort and a payload-derived key.
- Sub-national display depth: no longer capped at 3-per-country / 6-global (bounded per A2-OQ1).
- Title → **Geographic Scope**.

### REMOVED
- `GetGeoScopeService`, `GET_GeoScope`, their specs, and the two display-path slices.

## 10. Approach Options

| | **Option 1 — Migrate + bound + expand in one spec** (recommended) | **Option 2 — Migrate only; expansion later** | **Option 3 — Wait for Chunk D, then do both** |
| --- | --- | --- | --- |
| Shape | A2-1…A2-10 as one cycle | Two cycles: data source now, UX later | Leaflet first, this after |
| Coupling | Self-contained; the map is a bounded input either way | The limiter (D-1) is **mandatory** the moment the data source changes — so the "small" option still carries the riskiest part | Serialises two independent workstreams |
| Risk | Contained: one surface, one review | Splits a coupled pair across two reviews for no gain | Delays value; Chunk D's rewrite is easier to verify against a *stable* input contract |
| Verdict | ✅ | The seam is in the wrong place | Backwards |

**Recommended: Option 1.** The geocoding limiter and the data-source migration are inseparable — re-sourcing the card to the unbounded payload without D-1 fires hundreds of geocoding requests. Once they ship together, expansion is a small addition on the same files.

**On ordering versus Chunk D:** this spec changes only what is *passed to* the map; Chunk D changes only how the map *renders*. Running this one **first** gives Chunk D a stable, already-bounded input contract to port against — the sequence that makes the Leaflet port easier to verify.

## 11. Risks, Dependencies, And Open Questions

| ID | Risk | Mitigation |
| --- | --- | --- |
| **A2-R1** | **Collision with Chunk D.** Both specs touch the geographic feature. | Hard file boundary: this spec never edits `geo-scope-map.component.*`; Chunk D never edits `geo-scope-card.component.*`. Land this first so Chunk D ports against a bounded input. |
| **A2-R2** | **Geocoding cost is the whole reason for D-1.** Sub-nationals always cost a request (P-8), so an unbounded map input scales linearly with payload size. | `mapCountries` is not a function of expansion state, so expanding a list can never re-plot or re-geocode. Asserted by a call-count spec: **≤ 20 per load, 0 on expand** (the ceiling formerly written as Chunk A's `NFR-PDB-002`; it becomes this spec's own NFR when requirements are drafted). |
| **A2-R3** | ~~**The flatten is a cross-product**~~ — **largely defused by measurement.** The ~800-row figure came from a hypothetical 40 countries × 20 sub-nationals fixture. **Real data (measured 2026-07-29, see below) shows ≤ 30 distinct countries and 0 sub-national rows across the 25 contracts with the most results.** The cross-product concern is arithmetically sound but has no basis in current data. | Keep `countryName` on every row (A2-5) so the list is readable at any length, and let A2-OQ1 default to no artificial cap. **Do not build a top-N bound for a problem the data does not have** — but re-verify the sub-national figure, since it is the least validated number in the measurement. |
| **A2-R4** | Removing the caps also changes the **collapsed** top-5 contents — a country's 4th-to-20th sub-national can displace another country's 3rd. A user-visible change beyond expansion. | Disclose in the comms line alongside the title rename. |
| **A2-R5** | **KZ-001 recurrence.** `geo-scope-card.component.spec.ts:8-26` **stubs `ProjectDashboardCardComponent`**. With expansion living at the host↔card seam, a stubbed card makes "the lists reach full length" assertable only against computed arrays, never rendered rows. | Test the seam from both sides, as Chunk A does: host spec asserts state/limit propagation with the stub; a real-template assertion covers rendering. Do not let the stub stand in for the card. |
| **A2-R6** | **DC-8 (rendered layout) has no automated gate**, and this is its worst case: a 40+ row list expanding beside a fixed-height map inside a stretched grid column. | Named human check, scripted against the *correct* adjacency: the geographic card sits **below** the nested 2-column grid, in the left column of the outer `lg:grid-cols-[3fr_1fr] lg:items-stretch`, so the sibling it stretches is the right-hand *Results by indicator / by status* column. |
| **A2-R7** | `variant="list"` has no wrapper element, so bounding requires introducing one — a change to a template Chunk A also edits. | Sequence after Chunk A; the two edits do not overlap in intent (A adds the toggle to the `card` variant; this adds a wrapper to the `list` variant). |

### Measured cardinalities (2026-07-29) — inherited from Chunk A's GATE-1

Read-only queries against the local backend's database, replicating the repository's own primary-contract join, over the **25 contracts with the most results**:

| Section | Worst case | Note |
| --- | --- | --- |
| Distinct countries | **30** | Exact |
| Distinct sub-nationals | **0 across the whole sample** | ⚠️ **The least validated figure in the measurement.** It sits oddly beside the reference project's sub-national *summary* count (which counts results by geo scope, not distinct sub-nationals). **Re-verify as the first action of this spec** — the whole shape of A2-4 / A2-OQ1 depends on it |
| Whole `reports/full` body | ~36 KB uncompressed / ~7 KB gzipped | Driven by partners (137), not geography |

**Consequences:** the "~800-row flatten" that dominated round-2 review is not a property of the data. **GATE-1 is closed and no server ceiling is needed**, so the concern that `geo_scope` — the only nested section — would force one does not materialise. Method: `design.md` §13.1 of Chunk A.

**Dependencies:** Chunk A (contract + service). GATE-1 **closed**; the sub-national figure above is this spec's own first verification step.

| ID | Open question | Owner | Proposed default |
| --- | --- | --- | --- |
| **A2-OQ1** | How far does the sub-national list expand? Every sub-national of every country, or the sub-nationals of the top-N countries? | d.casanas | **Much less consequential than feared — see the measurement below.** Default: no artificial cap; show every sub-national of every country, **with `countryName` on every row** so the flattened list stays readable. Revisit only if real data grows |
| **A2-OQ2** | One toggle for the three lists, or one per list? | d.casanas | **One per list** (umbrella OQ-1) — three independent rankings of different lengths |
| **A2-OQ3** | Does the map's plotted set changing count as a change needing product sign-off? Today `[countries]` binds the server's first five; `mapCountries` is the top five **by count** | d.casanas | **Yes** — list it in the comms line |

## 12. Success Criteria

| ID | Criterion |
| --- | --- |
| A2-SC1 | The dashboard issues **no** `reports/geo-scope` request; the geographic card renders from the `reports/full` payload. |
| A2-SC2 | **≤ 20** geocoding requests per load with a 40-country × 20-sub-national fixture, and **0** on expand — spied `MapboxGeocodingService`. |
| A2-SC3 | Expanding a list leaves the plotted map points **identical**. |
| A2-SC4 | Each of the three lists expands to the bound agreed in A2-OQ1, in descending count order, and collapses back to 5. |
| A2-SC5 | A list with ≤ 5 entries renders **no** toggle. |
| A2-SC6 | Every sub-national row shows its country; two identically named sub-nationals are distinguishable. |
| A2-SC7 | `topRegions` is descending and keyed on `region_id`. |
| A2-SC8 | The toggle is a shared artifact: `aria-expanded`, keyboard operable, accessible name including its list heading — asserted for the host-rendered toggles, not only the card's. |
| A2-SC9 | The card title is **Geographic Scope**; the three `<h3>` sub-list headings are unchanged. |
| A2-SC10 | Human check per A2-R6 passes against the correct adjacency. |
| A2-SC11 | `npm test` + `npm run lint` pass; client coverage floors held; **full-suite** run for the deletion (KZ-003). |

## 13. Next Step

Runs **after Chunk A** and **before Chunk D**.

```text
/akili-specify project-dashboard/geo-scope-expansion
```

Resolve **A2-OQ1** during specification — it sets a row count that A2-SC4 asserts.

---

## Authorship

AKILI-SPECS methodology by **Juan Carlos Cadavid** — [jcadavid.com](https://jcadavid.com). Licensed under the MIT License.
