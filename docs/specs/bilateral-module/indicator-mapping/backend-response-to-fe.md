# Backend response — Bilateral Module / Indicator Mapping (OQ-IM-1, -2, -3 + bonuses)

> **Audience**: STAR FE team, BA, PO.
> **In reply to**: STAR FE `docs/specs/bilateral-module/indicator-mapping/open-questions-for-ba.md` §6 (FE-side audit + recommendations, dated 2026-05-26).
> **Authored by**: ARI backend agent.
> **Branch audited**: `AC-1594-bilateral-module-v2` (head: commit `87e74e80` as of 2026-05-26 — one commit ahead of the FE's audit window since this incorporates the just-landed `result_pool_funding_alignment` partial-unique fix, T-15.17).
> **Status**: response drafted; **action required from PO/BA on OQ-IM-1 and OQ-IM-2 before implementation can start.**

---

## TL;DR

| OQ / Item | Backend response | Why | Pre-condition |
|---|---|---|---|
| **OQ-IM-1** — contribution body shape (Path A) | **Deferred — needs PO sign-off** | Path A overturns R-BIL-031 (the spec explicitly mandates the 5 polymorphic types per D5/D12). | PO must explicitly retire R-BIL-031 + D5 + D12 (or amend them). |
| **OQ-IM-2** — AOW data source (Path A) | **Deferred — needs BA sign-off + ingestion source decision** *(🗄️ superseded 2026-06-10 — AOW dropped from the read; see §3 banner)* | AOW is not in the current backend spec at all. New entity + FK + ingestion pipeline. | BA confirms (a) AOW is a real taxonomy level, (b) where rows come from (CLARISA / PRMS / manual seed), and (c) indicator↔AOW cardinality (1:1 or many-to-many). |
| **OQ-IM-3** — `GET .../contribution?lever-code=` route (Path A) | **Accepted — implementable now** | Purely additive. No schema change. Doesn't conflict with any approved requirement. | Final body shape depends on OQ-IM-1's outcome — if OQ-IM-1 lands first, the GET returns the simplified `{ reason_code, quantitative_contribution_value? }`. If not, the GET returns the current polymorphic body. Either way the route can ship. |
| **Bonus — `is_quantitative` on `indicator`** | **Accepted — implementable now** | One nullable column on a catalog table. Additive. | None — but the column source-of-truth needs BA confirmation if the catalog is ever auto-synced from PRMS/CLARISA (otherwise it stays a manually-seeded value). |
| **Bonus — `disabled_reason` on panel response** | **Accepted — implementable now** | Server-computed string; surfaced on the existing response shape. | BA / FE align on the reason taxonomy (the strings the panel renders verbatim). |
| **Bonus — `is_stale` on panel response** | **Already shipped** | The audit was slightly stale: `IndicatorPanelIndicatorResponse.is_stale: boolean` is present at `dto/list-indicators-query.dto.ts:29`. No work needed. | — |

**Bottom line**: backend can ship **OQ-IM-3 + 2 of the 3 bonuses (excluding the already-shipped is_stale)** in ~1–2 days as soon as the FE wants them. **OQ-IM-1 and OQ-IM-2 are blocked on product decisions**, not on engineering capacity.

---

## 1. Validation of the §6 audit

Cross-checked every §6 finding against the current `AC-1594-bilateral-module-v2` branch (one commit ahead of the FE's audit window). The audit holds with one minor positive discrepancy:

| FE §6 claim | v2 state | Discrepancy |
|---|---|---|
| 5 polymorphic handlers + open `ContributionDto` | ✅ Unchanged | — |
| AOW grep → zero matches in `src/domain/` | ✅ Unchanged (still zero) | — |
| `GET .../contribution?lever-code=` route absent | ✅ Unchanged | — |
| `is_quantitative` not on indicator entity | ✅ Unchanged | — |
| `disabled_reason` not on panel response DTO | ✅ Unchanged | — |
| `is_stale` not on `IndicatorPanelIndicatorResponse` | **`is_stale` IS at `dto/list-indicators-query.dto.ts:29`** | Likely landed in a wave between the FE snapshot date and 2026-05-26. Removes one bonus item. |

All citation file/line references in §6 still resolve correctly. The FE's audit is high-quality — backend recommends adopting the same approach when the STAR FE team next does a cross-repo grounding pass.

---

## 2. OQ-IM-1 — Contribution body shape — backend response

### Backend position: DEFERRED pending PO sign-off

Path A (the FE recommendation) overturns three approved spec items:

| Approved item | Where | What Path A would change |
|---|---|---|
| **R-BIL-031** "Capture type-specific contribution payload" | [`../requirements.md` §6.4](../requirements.md#64-us4--map-results-to-indicators-with-contribution-rules-ac-1440) lines 320–330 | Replaces the per-type required-fields contract with a single `{ reason_code, quantitative_contribution_value? }` shape. |
| **D5** (add `result_innovation_use`?) | [`../requirements.md` D-decision log] | Becomes moot if the per-type tables aren't being written to. |
| **D12** (preserve backend-compatible typos `has_unkown_using`, `readinness_level_id`, etc.) | [`../requirements.md` D-decision log] | Becomes moot — the typos exist because the per-type payloads carry them. |

R-BIL-031 was authored as a PO requirement. Backend cannot retire it without an explicit PO decision. Going ahead and deleting the 5 handlers + per-type tables on the FE's recommendation alone would:

- Break the audit trail back to the original PO requirement (which Jira tickets AC-1440 + the existing `bilateral.e2e-spec.ts` fixtures still reference).
- Lose the per-type tables (`result_capacity_sharing`, `result_knowledge_product`, etc.) which other parts of the platform may consume (search; OpenSearch decorators on those entities; the future PRMS push payload in R-BIL-041 which the spec says will reuse them).

### What backend needs from PO/BA

A clear written decision on one of:

- **Path A (the FE rec) is correct** → PO retires R-BIL-031 + D5 + D12 in writing. Backend then:
  1. Adds migration: `ALTER TABLE result_pool_funding_indicator_mapping ADD COLUMN reason_code VARCHAR(50) NOT NULL DEFAULT 'unspecified', ADD COLUMN quantitative_contribution_value DECIMAL(18,4) NULL`.
  2. Simplifies `ContributionDto` to `{ reason_code, quantitative_contribution_value? }`.
  3. Deprecates the 5 polymorphic handlers (marks them `@deprecated` first, removes in a follow-up wave after the FE migrates).
  4. Updates `R-BIL-031` → `RESOLVED — Path A — superseded by mockup-driven simplification` with the PO sign-off date.
  5. New requirements R-BIL-031A (`reason_code` validation) + R-BIL-031B (`quantitative_contribution_value` conditional on `is_quantitative`).
  6. Estimate: **M (~2 days)** once the green light is given.

- **Path B / C / D is correct** (per the FE's options table) → PO documents the chosen path. Backend implements accordingly; no schema change is needed for B/D unless extension fields are added.

- **Keep the status quo** (R-BIL-031 stands) → BA + FE realign the mockups with the 5-type model. Backend has no work to do; FE re-plans T-BIL-IM-01 around the polymorphic shape.

**Backend recommendation**: Path A is the cleanest *if* PO is willing to retire R-BIL-031. The 5-type model is heavy and untested in the indicator-mapping flow as it stands; the mockups show what users will actually see. But this is a PO judgment call, not an engineering call.

### Sub-decision OQ-IM-4 (reason taxonomy source)

If Path A is approved, OQ-IM-4 (where the "Why is this being reported?" dropdown values come from) becomes blocking — backend can't validate `reason_code` without a defined taxonomy. The FE doc marks OQ-IM-4 as "non-gating but BA should weigh in." Backend reclassifies it as **gating-once-Path-A-is-chosen**: validation needs a finite set of values. Provisional default: a static enum in `MappingSourceEnum` style (e.g. `direct_contribution | aligned_with | reference_only | other`). Confirm with BA.

---

## 3. OQ-IM-2 — AOW data source — backend response

> **🗄️ Archived — superseded (2026-06-10).** The AOW question this section deliberates is moot: AOW is gone from the ToC read entirely. After the interim answer (T-15.12 / D-PI-14: AOW from the `cgiar-entities` catalog feeding a PRMS `(SP, AOW)`-pair fan-out), `GET .../hlos-indicators` was reshaped to the lambda-toc **level-based catalog read** (`allowed_levels` + `catalogs[]` per `(SP, level)` — no AOW on the wire). See [`../toc-mapping-v2/`](../toc-mapping-v2/). No `area_of_work` entity will be built. This section is kept for lineage only; the rest of this doc (OQ-IM-1, OQ-IM-3, bonuses, type handlers) is unaffected.

### Backend position: DEFERRED pending BA sign-off

Path A (extend response with AOW nesting) is the right engineering call — confirmed. But the **content** of the change depends on three BA inputs the backend doesn't have:

| Question | Why backend can't answer | What backend needs |
|---|---|---|
| Is AOW a real CGIAR ToC taxonomy level? | Audit confirms zero references in this codebase, in CLARISA's existing tool wrappers (`src/domain/tools/clarisa/`), or in any current data model. The FE infers it from mockups; backend can't validate that against existing data. | BA confirms AOW is a stable taxonomy + provides one or two example AOW codes + their parent SP. |
| Where do AOW rows come from? | The decision shapes the implementation: CLARISA sync = new CLARISA tool wrapper; PRMS pull = part of T-15.12 (PRMS ToC) which is itself blocked on OQ-RV-2; manual seed = migration with seed data; admin-maintained = new admin SSR page. | BA picks one source. If CLARISA, backend needs the upstream endpoint URL + payload shape. If PRMS, backend has to wait for OQ-RV-2 to close. If manual seed, BA provides the initial seed list. |
| Cardinality: indicator ↔ AOW = 1:1 or many-to-many? | Mockups appear to show 1:1 (each indicator nests under exactly one AOW), but the canonical CGIAR ToC model may differ. Implementation diverges sharply: 1:1 = FK on `indicator`, many-to-many = junction table. | BA confirms which model PRMS uses. |

### What backend needs from PO/BA

A written decision with values for all three questions above. Once supplied, backend ships:

1. Migration: new table `area_of_work` (`aow_code: VARCHAR PK`, `aow_name: VARCHAR`, `lever_code: VARCHAR FK → clarisa_levers.short_name`, `is_active: BOOLEAN`).
2. Migration: `aow_code` FK on `indicator` (or new junction table if many-to-many).
3. Seed migration OR sync service wrapper, depending on source.
4. Service change: `listIndicators` groups by `(lever_code, aow_code)`.
5. DTO change: `IndicatorGroupResponse.areas_of_work[]` nested shape.
6. New requirement R-BIL-022A: "Group indicators by SP → AOW → HLO."
7. Estimate: **M–L (~3–5 days)** once the green light + ingestion source are confirmed.

**Backend recommendation**: confirm with the PRMS team / CLARISA contact whether AOW exists in their data model first. If it does, source from upstream. If not, this is a STAR-internal taxonomy and needs PO's owner assigned for ongoing maintenance.

---

## 4. OQ-IM-3 — GET contribution endpoint — backend response

### Backend position: ACCEPTED — implementable now

Path A (add `GET /pool-funding-alignment/indicators/:indicatorCode/contribution?lever-code=...`) is approved as-is. Scope:

| Change | File / location |
|---|---|
| Controller handler | `src/domain/entities/bilateral/bilateral.controller.ts` — new `@Get('indicators/:indicatorCode/contribution')`, same auth pattern as the existing POST handler (no `RolesGuard`/`ResultOwnerGuard` — it's a read; ROAR JWT only) |
| Service method | `src/domain/entities/bilateral/bilateral.service.ts` — `getContribution(resultId, indicatorCode, leverCode)` using the existing `ResultPoolFundingIndicatorMappingRepository.findActiveMappingByResultLeverIndicator` (already implemented) |
| Response DTO | `src/domain/entities/bilateral/dto/upsert-indicator-mapping.dto.ts` — new `ContributionResponse` (shape matches whatever OQ-IM-1 decides; for now, denormalize the current per-type payload from the joined per-type table) |
| Sibling spec | `bilateral.controller.spec.ts` + `bilateral.service.spec.ts` — one happy path + 404-on-missing |
| Swagger | `@ApiTags('Bilateral')` + `@ApiOperation` + `@ApiParam` + `@ApiQuery` |

**Pre-condition**: the response body shape depends on OQ-IM-1's outcome.

- If OQ-IM-1 lands first (Path A), the GET returns the simplified `{ reason_code, quantitative_contribution_value? }`.
- If OQ-IM-1 is still open when backend ships OQ-IM-3, the GET returns the current polymorphic body (denormalized from the per-type table). The FE will need to handle the same shape inversion it already handles on POST/PATCH.
- If OQ-IM-1 lands later, the GET shape is updated in the same PR that ships the contribution simplification — no extra coordination needed.

**Estimate: S (~½ day)**. Can land today on `AC-1594-bilateral-module-v2` if the FE wants it ahead of OQ-IM-1 resolution.

---

## 5. Bonus items — backend response

### 5.1 `is_quantitative: boolean` on `indicator` entity — ACCEPTED

| Change | File / location |
|---|---|
| Migration | New `1779190000015-addIsQuantitativeToIndicator.ts` — `ALTER TABLE indicator ADD COLUMN is_quantitative TINYINT(1) NOT NULL DEFAULT 0`. Seed value: backfill from BA's list of which indicator codes are quantitative (the FE doc references mockup `32472:129409`; backend needs the source-of-truth list). |
| Entity | `src/domain/entities/indicators/entities/indicator.entity.ts` — add `@Column('boolean', { default: false }) is_quantitative!: boolean` + `@OpenSearchProperty({ type: 'boolean' })`. |
| Panel response DTO | `IndicatorPanelIndicatorResponse` — add `is_quantitative: boolean`. |
| Sibling spec | Update the existing `listIndicators` test in `bilateral.service.spec.ts` to cover the field. |

**Pre-condition**: BA provides the seed list (which `indicator_code` values are `is_quantitative=true`). Otherwise the default is `false` for everything and the FE conditional dropdown never renders.

**Estimate: S (~½ day)** once the seed list is available. Can land bundled with OQ-IM-3.

### 5.2 `disabled_reason: string | null` on panel response — ACCEPTED

| Change | File / location |
|---|---|
| Panel response DTO | `IndicatorPanelIndicatorResponse` — add `disabled_reason: string | null`. |
| Service logic | `BilateralService.listIndicators` — compute `disabled_reason` per indicator. Initial rules (confirm with BA): `null` when not disabled; `"Indicator is no longer active in the catalog"` when `is_active=false`; `"Already mapped to a sibling result version"` when there's an active mapping on a different version. |
| Sibling spec | One scenario per rule. |

**Pre-condition**: BA / FE align on the exact reason strings the panel renders verbatim (per the FE doc OQ-IM-9). Backend proposes the two rules above as defaults; BA can extend or rewrite.

**Estimate: S (~½ day)** once the reason taxonomy is confirmed. Can land bundled with OQ-IM-3 + `is_quantitative`.

### 5.3 `is_stale` on panel response — ALREADY SHIPPED

The FE audit was stale on this one — `is_stale` is at `dto/list-indicators-query.dto.ts:29` and `BilateralService.listIndicators` populates it from the active stale-mapping query. No work needed; FE can start consuming it immediately.

---

## 6. Sequencing the work

Recommended order, given the dependency graph:

1. **Today** — PO/BA reads this response. Picks Path A (or other) on OQ-IM-1. Picks Path A + answers the 3 sub-questions on OQ-IM-2. Confirms `is_quantitative` seed list + `disabled_reason` taxonomy for the bonuses.
2. **Day 0–1** — Backend ships the **safe bundle**: OQ-IM-3 (GET contribution) + `is_quantitative` migration + `disabled_reason` computation. ~1 day total. Single PR. Doesn't touch any disputed surface.
3. **Day 1–3** — IF Path A on OQ-IM-1 is approved: backend ships the migration + simplified `ContributionDto` + handler deprecation. Updates the OQ-IM-3 GET shape in the same PR (zero coordination cost since both touch the same DTO file). FE can resume T-BIL-IM-01 the morning backend opens the PR — they don't need to wait for merge.
4. **Day 3–7** — IF Path A on OQ-IM-2 + AOW source is confirmed: backend ships the `area_of_work` entity + nested response + seed (or sync, depending on source). FE resumes T-BIL-IM-05 (modal sidebar).
5. **Throughout** — sub-spec audit trail captured under `docs/specs/bilateral-module/indicator-mapping/` paralleling the FE's structure (this file is the first entry; `requirements.md` / `design.md` / `tasks.md` / `execution.md` follow once PO signs off).

If steps 3 and 4 are blocked beyond a week, FE can ship US3/US4 against the **current polymorphic shape** (suboptimal but unblocking), and the simplification is moved to a Phase 2 follow-up.

---

## 7. What we're NOT doing yet, and why

For audit clarity:

- **Not retiring the 5 polymorphic handlers.** R-BIL-031 still stands until PO retires it explicitly.
- **Not adding the `area_of_work` entity.** AOW source unconfirmed; jumping ahead risks a second migration to re-shape the table once BA picks a source.
- **Not updating `frontend-handoff.md` §7 yet.** The "5 type-specific payloads" section in the backend's own handoff is still the truth-of-today. It updates when (and if) OQ-IM-1 Path A lands.
- **Not opening the new `indicator-mapping/` sub-spec's `requirements.md` / `design.md` / `tasks.md`.** Those are generated by `/sdd-specify` from an approved proposal. The proposal here is *this document* — the response. Once PO signs off, the next move is `/sdd-propose indicator-mapping/contribution-simplification` (for OQ-IM-1) and/or `/sdd-propose indicator-mapping/area-of-work-model` (for OQ-IM-2), then `/sdd-specify` each.

---

## 8. References

- FE doc this responds to: `STAR-FE-REPO/docs/specs/bilateral-module/indicator-mapping/open-questions-for-ba.md` (read 2026-05-26).
- Backend spec items cited:
  - [`../requirements.md` R-BIL-020..035](../requirements.md) — US3 / US4 requirement block.
  - [`../requirements.md` R-BIL-031](../requirements.md#r-bil-031--capture-type-specific-contribution-payload) — the requirement OQ-IM-1 Path A overturns.
  - [`../requirements.md` D5 + D12](../requirements.md) — decisions OQ-IM-1 Path A makes moot.
  - [`../frontend-handoff.md` §4.4 + §4.5 + §7](../frontend-handoff.md) — the sections the FE audited.
- Backend code cited:
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.controller.ts` — handler registration.
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts` — `getContributionHandler` dispatch.
  - `server/researchindicators/src/domain/entities/bilateral/dto/upsert-indicator-mapping.dto.ts` — `ContributionDto` shape.
  - `server/researchindicators/src/domain/entities/bilateral/dto/list-indicators-query.dto.ts` — `IndicatorPanelIndicatorResponse` (where the audit's `is_stale` discrepancy is).
  - `server/researchindicators/src/domain/entities/bilateral/entities/result-pool-funding-indicator-mapping.entity.ts` — the entity OQ-IM-1 Path A would extend.
  - `server/researchindicators/src/domain/entities/bilateral/handlers/*.handler.ts` — the 5 handlers OQ-IM-1 Path A would deprecate.

---

## 9. How to respond to this response

PO + BA, please reply by editing this file directly (one block per OQ) or by replying via the AC-1594 / AC-1439 / AC-1440 thread. Backend folds the answers into the next sub-spec PR.

Template for the reply blocks:

```markdown
### OQ-IM-1 — DECISION: Path A approved / Path B / Path C / Path D / Status quo
Rationale: <one or two sentences>
Signed off: <name> · <date>

### OQ-IM-2 — DECISION: Path A approved
AOW source: CLARISA / PRMS / manual seed / admin-maintained
Cardinality: indicator↔AOW = 1:1 / many-to-many
Seed list (if manual): <link or paste>
Signed off: <name> · <date>

### OQ-IM-3 — DECISION: approved
Body shape coupling: ship now with current polymorphic shape / wait for OQ-IM-1 resolution / either is fine
Signed off: <name> · <date>

### Bonuses — DECISION: approved
is_quantitative seed list: <link or paste>
disabled_reason taxonomy: <link or paste, or "use backend defaults">
Signed off: <name> · <date>
```

Backend is on `AC-1594-bilateral-module-v2` and can pick up the safe bundle (OQ-IM-3 + 2 bonuses) within one working day of these answers landing.
