# Design — Project Dashboard / Indicator-metadata charts

- **Module:** project-dashboard (client) + agresso (server reports)
- **Spec id:** 2026-07-indicator-metadata-charts
- **Status:** draft — **revision 4**, post Judgment Day (terminal: **ESCALATED**) + user-authorised post-lineage fixes
- **Owner:** d.casanas@cgiar.org
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Judgment ledger:** [`./judgment.md`](./judgment.md)
- **Linked TRD:** [`../../../trd/trd.md`](../../../trd/trd.md) §§ PERF-5 (line 128), API surface (line 299)
- **Visual reference:** [`./mockup/index.html`](./mockup/index.html)
- **Last updated:** 2026-07-30

> **Revision 4 applies the round-3 findings.** Judgment Day terminated **ESCALATED** at revision 3 with one confirmed SEVERE outstanding (DD-8 still carried a rule that §6.2 prohibits). Revision 4 closes it plus three warnings, **authorised by the user after the review lineage was exhausted — these edits therefore carry no judgment warrant** (`judgment.md`, Post-terminal record). Earlier: revision 3 superseded revision 2 on DD-11 and DD-2; revision 2 superseded revision 1 on four architecture decisions. Two blind judges independently falsified DD-1's arithmetic, DD-4's premise, §7.2's component semantics, and the OICR table name. Every corrected claim in this revision was re-verified against the source by the author, not accepted on the judges' word. See §16 for the change record.

---

## 1. Executive Summary

**The binding constraint is the MySQL connection pool, and the design's job is to add ten aggregations without touching it.**

The pool is un-configured, so mysql2's default `connectionLimit = 10` applies. `reports/full` already runs **8** concurrent queries — five report methods issuing one each, plus `getGeoScopeReport`'s own nested `Promise.all` of three (`agresso-contract.repository.ts:739-743`). Revision 1 claimed 6, and a plan built on that number would have landed at 12, over the limit.

This design keeps the peak **unchanged at 8**, by combining two decisions:

1. **Consolidate the 10 aggregations into 2 queries** — one per query family, not one per fact table (§6.1, DD-1).
2. **Compose them sequentially, after the existing batch** (§3, DD-11). Peak concurrency is therefore `max(8, 2) = 8` — exactly today's, so **no connection-pool change is required and this spec adds no infrastructure prerequisite**.

The rejected alternative was composing all 10 in one `Promise.all`, which peaks at 10 against a pool of 10 — one dashboard request monopolising every connection, with every other in-flight request queueing behind it. That would have forced an explicit `poolSize` change to a shared infra file, with the DevOps sign-off and env wiring that implies.

**The trade is pool safety for latency, and the latency is not a rounding error.** Sequential composition makes the cost *additive* rather than overlapped:

> `T_total = T_existing_batch + T_metadata_batch` — where the parallel design would have paid only `max(...)`.

> **SUPERSEDED 2026-07-30 by the T-08 Pivot (owner-approved).** This paragraph originally read that NFR-IMC-001's **1.5×** bound required `T_metadata ≤ 0.5 × T_existing`, and that a breach would invalidate DD-11 and force `Promise.all` + `poolSize`. **The 1.5× relative bound has been retired** — it proved unmeasurable outside a deployment-representative environment (a `SELECT 1` costs p95 **155.5 ms** over VPN, more than the entire 8-query pre-change batch at 43.67 ms), and it was **not satisfied even by the fallback the design named for it** (parallel composition yields 2.12×, still over 1.5×). See `requirements.md` NFR-IMC-001 for the three-part replacement and `execution.md` § *Pivot Record: T-08* for the full analysis.

**DD-11 is retained and was never invalidated** — only left unverified, which is a different thing. It remains what holds peak concurrency at today's 8 and removes this spec's infrastructure prerequisite. **Measured 2026-07-30 (contract A1578, 521 primary results, over VPN):** composed p95 **174.5 ms** against the absolute 3 s bound — met with roughly 17× margin — and the metadata batch's own contribution **92.7 ms**, `max(Q1, Q2)` and never the sum, against the new 250 ms added-latency ceiling.

**What remains genuinely open is the environment-independent bar**, NFR-IMC-001(c): each query's **server-side** execution time, isolated from network cost. That is the only part that says something about the SQL rather than about the link, it is **unmeasured**, and design §11's ordering still gates client work on it — because if the aggregations themselves turn out slow, the remedy is work on the queries, not a change of composition.

| | Baseline today | Rev 1 (wrong) | **This design** |
| --- | --- | --- | --- |
| Queries issued | 8 | 6 claimed | **10** |
| **Peak concurrency** | **8** | 12 actual | **8** |
| Pool change needed | — | yes | **no** |

Second decision worth reading before the detail: revision 1 asserted the new cards would not engage the card's expansion machinery. **The opposite is true** — `visibleLimit === null` *is* the expanded state. The cards now join the expansion contract deliberately (§7.2, DD-10), which has an honest accessibility consequence recorded in §14.

---

## 2. Goals & Non-goals

**Goals**
1. Serve 10 metadata aggregations from `reports/full` without exceeding the connection pool (R-IMC-001…006, NFR-IMC-001).
2. Keep the payload strictly additive so Chunk A's consumers are untouched (R-IMC-007).
3. Render 10 cards in 4 indicator bands with correct visibility and empty states (R-IMC-008…010).
4. Make the Degree conjunction and the Gender combination unit-testable without a database (DC-2, DC-3).

**Non-goals** — `results_by_status` migration (B-F1); drill-down; geographic card; Leaflet; new CLARISA vocabularies; **explicit connection-pool sizing** (still a real improvement, but DD-11 removes this spec's need for it — see §14 R-4).

---

## 3. Architecture

```
GET /api/v1/agresso/contracts/reports/full?contract-id=X
  │
  ├─ AgressoContractController  (handler unchanged; + @ApiOkResponse — see §5)
  └─ AgressoContractService.getFullContractReports()      ← EXISTING pass-through, now composes
        │
        │   STEP 1 — await (existing, unchanged)
        ├─ AgressoContractRepository.getFullContractReports()        8 concurrent  (body UNCHANGED)
        │     └─ returns ContractBaseReportsDto                      ← signature change only
        │
        │   STEP 2 — await AFTER step 1 resolves (DD-11: sequential, not Promise.all)
        └─ IndicatorMetadataReportsRepository.getIndicatorMetadata()  2 concurrent  (NEW)
              ├─ Q1 simple-indicator union   → 6 sections
              └─ Q2 capacity-sharing union   → 4 sections (7 branches)
        │
        └─ merge → ContractFullReportsDto (7 existing + 10 new)

   Peak concurrency = max(8, 2) = 8 — unchanged from today.
```

**The two steps must be awaited in sequence, not raced.** This is load-bearing, not stylistic: a `Promise.all` here peaks at 10 against a pool of 10 and reintroduces the constraint the design exists to avoid (DD-11).

**Correction from revision 1:** the service method is **not new**. `agresso-contract.service.ts:208-210` already exists as a one-line pass-through and **will be edited** to compose. Revision 1's "NEW composition seam" was wrong.

### 3.1 Composition — files

| Path | Change | Responsibility |
| --- | --- | --- |
| `server/.../agresso-contract/repositories/indicator-metadata-reports.repository.ts` | **new** | Q1 + Q2, row→section grouping. |
| `server/.../agresso-contract/dto/reports-indicator-metadata.dto.ts` | **new** | `MetadataCountDto` + the 10 section fields. |
| `server/.../agresso-contract/dto/reports-full.dto.ts` | **modified** | Split into `ContractBaseReportsDto` (7) + `ContractFullReportsDto extends` it (+10). See DD-3. |
| `server/.../agresso-contract/repositories/agresso-contract.repository.ts` | **modified — signature only** | Return type `ContractBaseReportsDto`. Body untouched. |
| `server/.../agresso-contract/agresso-contract.service.ts` | **modified** | Compose both repositories. |
| `server/.../agresso-contract/agresso-contract.controller.ts` | **modified** | `@ApiOkResponse({ type: ContractFullReportsDto })` (W-6). |
| `server/.../session-types/enum/session-type.enum.ts` | **new** | `SessionTypeEnum { TRAINING = 1, ENGAGEMENT = 2 }`, doc-comment citing the seed migration. |
| `server/.../agresso-contract/utils/gender-distribution.util.ts` | **new** | Pure merge of individual counts + group sums, keyed on `gender_id`. |
| `client/.../shared/interfaces/contract-full-reports.interface.ts` | **modified** | +10 sections (S-1). |
| `client/.../app/testing/contract-full-reports.mock.ts` | **modified** | Canonical fixture extension (S-1). |
| `client/.../project-dashboard/indicator-metadata-bands.mapper.ts` | **new** | Pure payload → band-model mapper. |
| `client/.../project-dashboard/indicator-metadata-band.component.{ts,html,spec.ts}` | **new** | Band chrome. |
| `client/.../project-dashboard/project-dashboard.component.{ts,html}` | **modified** | Host: band rendering + expansion state. |

**No new enum files for format/length.** `SessionFormatEnum` (`session-formats/enums/session-format.enum.ts`) and `SessionLengthEnum` (`session-lengths/enum/session-lengths.enum.ts`) **already exist** and are imported. Revision 1 would have created duplicates — see DD-4.

### 3.2 Reuse

| Reused | Where from |
| --- | --- |
| `buildPrimaryContractResultsSubquery()` | `agresso-contract.repository.ts:642`. **Wrapped in a CTE** so the contract id binds once — the repository's own precedent at `:766-769`. |
| `SessionFormatEnum`, `SessionLengthEnum`, `DegreesEnum` | Existing enums; `DegreesEnum` supplies the doc-comment convention. |
| `ProjectDashboardCardComponent` + its expansion contract | Existing card, existing `layout()` variants, existing `visibleLimit`/`expandToggled` protocol. |
| `indicatorsWithResults()` | `project-dashboard.component.ts:121`. |
| Enum-as-lookup-id precedent | `InstitutionRolesEnum.PARTNERS` (`:976`), `UserRolesEnum.MAIN_CONTACT` (`:1121`). |

---

## 4. Data Model

**No data model changes. No migration.**

Verified source map is **`requirements.md` §4.1**. **Four** table names are irregular relative to their folder — `gender`, `policy_stage`, `maturity_levels`, and **`result_oicrs`** (plural; revision 1 said `result_oicr` and would have failed with `ER_NO_SUCH_TABLE`). The §4.1 table was re-derived from `@Entity()` decorators in this revision rather than trusted from the previous pass.

**Lookup ids are fixed by seed migration `1727119632564-InsertDataControl.ts`** (append-only, therefore authoritative): session_formats 1=Individual/2=Group · session_types 1=Training/2=Engagement · session_lengths 1=Short-term/2=Long-term · gender 1=Male/2=Female/3=Non-binary · degrees 1=PhD/2=MSc/3=BSc/4=Other. This is stronger evidence than the client templates revision 1 cited, and it discharges most of `requirements.md` A-1.

---

## 5. API Design

### GET /api/v1/agresso/contracts/reports/full

- **Change:** additive only — 10 new array fields. **No version bump.**
- **Roles / guards / errors:** unchanged.
- **Swagger:** `@ApiProperty` on every new DTO field **is not sufficient**. The handler (`agresso-contract.controller.ts:156-176`) carries no `@ApiOkResponse`/`@ApiResponse`/`@ApiExtraModels`, so `ContractFullReportsDto` is referenced by no schema and is **not emitted into the OpenAPI document at all today**. Adding `@ApiProperty` to an unreferenced class changes nothing on the rendered page. The handler therefore also gains `@ApiOkResponse({ type: ContractFullReportsDto })` (W-6, R-IMC-012 AC.1).

Every new section is `MetadataCountDto[]` — `{ id: number; name: string; count: number }` — **always present, empty rather than null or absent**, ordered `count DESC, id ASC`. That ordering is applied **in SQL for the nine directly-aggregated sections** (§6.1) and **re-applied in the util for `gender_distribution`** (§6.2), whose final counts are produced after SQL by addition and so cannot inherit the SQL order.

| Field | Requirement |
| --- | --- |
| `innovation_nature`, `innovation_type`, `innovation_readiness` | R-IMC-001 |
| `oicr_maturity` | R-IMC-002 |
| `policy_type`, `policy_stage` | R-IMC-003 |
| `session_format`, `session_type` | R-IMC-004 |
| `gender_distribution` | R-IMC-005 |
| `degree` | R-IMC-006 |

---

## 6. Backend Module Design

### 6.1 Two queries, thirteen branches, ten sections (DD-1, revised)

Each query opens with a **CTE** wrapping `buildPrimaryContractResultsSubquery()`, so the contract id is bound **once per query** rather than once per branch. Branches then inner-join the CTE. This is the repository's own existing pattern (`:766-769`) and it removes the positional-parameter hazard W-2 identified, where an off-by-one would bind a contract id into a `session_type_id` comparison and **silently return zero rows**.

| Query | Fact tables | Branches | Sections |
| --- | --- | --- | --- |
| **Q1** simple-indicator union | `result_innovation_dev`, `result_oicrs`, `result_policy_change` | 6 | nature, type, readiness, maturity, policy_type, policy_stage |
| **Q2** capacity-sharing union | `result_capacity_sharing` | 7 | session_format, session_type, gender_distribution, degree |

Q1 unions across three fact tables. That is sound: each branch is independently scoped through the CTE, each fact table is **1:1 with `results`** (`result_id` is the PK on each, so `COUNT(*)` after the DISTINCT join cannot double-count), and every branch emits the same four columns.

**Uniform branch shape:** `(section VARCHAR, id BIGINT, name TEXT, count BIGINT)`. The `section` discriminator leads so the repository can bucket rows contiguously.

**Ordering is applied once, to the union as a whole** — `ORDER BY section, count DESC, id ASC`. Revision 1 specified per-branch ordering, which in MySQL is either a syntax error or, in the parenthesised form, not guaranteed to survive the union (W-3). R-IMC-001's AC makes ordering a hard criterion, so this must not be left to the optimizer.

**Common to every branch:** inner-join the CTE; filter the fact row `is_active = TRUE` (valid — all four fact entities extend `AuditableEntity`); inner-join the lookup, which also excludes NULL metadata ids and satisfies R-IMC-001 AC.2 without a separate predicate.

### 6.2 Gender — three literal branches, merged on `gender_id` (DD-2, revised)

Group participation is three fixed **columns**, not rows, so it cannot be grouped like the others. Q2 emits it as **three explicit branches**, one per column, each carrying the gender's **seeded id as a literal** (1/2/3) — resolving W-1's column-shape mismatch, because every branch now has the uniform four-column shape.

- `gender_individual` — count of individual records (`session_format_id = SessionFormatEnum.INDIVIDUAL`) grouped by `gender_id`, joined to `gender`.
- `gender_group` — three branches: `('gender_group', 1, 'Male', COALESCE(SUM(session_participants_male),0))`, and likewise Female→2, Non-binary→3.

A pure util then merges the two shapes into `gender_distribution` **keyed on `gender_id`**, not on normalised names. Revision 1 proposed name normalisation; keying on the id is strictly more robust (S-3) because the seed migration fixes 1/2/3 permanently, whereas a `gender.name` label edit would silently break a name match. Zero-total categories are dropped (R-IMC-005 AC.3).

The arithmetic DC-3 targets therefore lives in a pure function with no DataSource, asserted with plain fixtures.

**The merge is a symmetric sum over the union of ids — neither side is subordinate to the other.**

Because each group branch carries **both its id and its name as literals**, a group row is already complete: there is nothing to look up and no "unmatched" state. The util adds the two shapes per `gender_id`, and an id present on **only one side is carried through unchanged**. A project reporting only group trainings therefore yields the three group categories with their summed counts, and a project reporting only individual trainings yields whatever genders those records carry.

> **Do not reintroduce a "skip the group row if it matches no individual row" rule.** An earlier revision of this section contained one; it was defective. The util is pure and has no access to the `gender` table (§10), so the only thing it could match a group id against is the `gender_individual` result — which is empty for a group-only project. That rule would have returned an **empty Gender chart for every group-only project despite real reported participants**, and §10 would have locked the bug in with a test asserting it.

**Unmatched categories pass through** (DD-8). If `gender` holds ids beyond 1–3, individual records carrying them still appear. Silently dropping reported data is worse than an unexpected category, and the zero-total rule keeps extras invisible unless real.

**The util re-sorts the merged result** `count DESC, id ASC` after summing and dropping zero totals. This is required, not incidental: `gender_distribution` is the one section whose final counts are produced *after* SQL, and addition changes the ranking — SQL emitting Female(5) before Male(1) is wrong once a group branch adds 20 to Male. The union-level `ORDER BY` in §6.1 cannot cover this section.

### 6.3 Degree — the conjunction (R-IMC-006, revised)

Q2's degree branch filters on `session_type_id = SessionTypeEnum.TRAINING` **AND** `session_length_id = SessionLengthEnum.LONG_TERM`, joined to `degrees`. It must **not** filter on `degree_id IS NOT NULL`: the form clears the field via `clearDegreeIdIfNotLongTerm` (`capacity-sharing.component.ts:85-93`), but historical rows switched away from long-term may retain a stale value.

**Revision 1 resolved Training by lookup name. That is dropped.** The premise — "no id is asserted anywhere" — was false; seed migration `1727119632564` line 9 asserts `session_types (1,'Training')`. Name matching would have been *more* fragile: `session_types.name` is `TEXT`, and a label edit would silently empty the Degree chart with no error, whereas a wrong id is caught by the fixture.

### 6.4 Enums (DD-4, revised)

| Value | Treatment |
| --- | --- |
| `session_format_id` | **Import existing** `SessionFormatEnum { INDIVIDUAL = 1, GROUP = 2 }` |
| `session_length_id` | **Import existing** `SessionLengthEnum { SHORT_TERM = 1, LONG_TERM = 2 }` |
| `session_type_id` | **Create** `SessionTypeEnum { TRAINING = 1, ENGAGEMENT = 2 }` in `session-types/enum/`, doc-comment citing migration `1727119632564`, following `DegreesEnum`'s convention |
| `gender_id` | Literals 1/2/3 in the group branches, justified by the same migration |

Revision 1's "enum verification against live lookup rows" task is **removed** — the append-only seed migration already is that verification for these five tables. What remains genuinely unverified is only the CLARISA-synced lookups (§14).

---

## 7. Frontend / UX Component Architecture

### 7.1 Band model, not ten templates (DD-5, unchanged)

A pure mapper builds a band model — bands, each with an indicator, a result count, and its cards — rendered by a loop. Against KZ-005 this is stronger than 10 hand-written instances: "each card bound to its own section" becomes cheap assertions on plain data, the binding path is verified per entry, and a card added later inherits the gate. Per-card variation (Gender provenance note, Degree filter pill) rides as optional model fields.

### 7.2 The cards join the expansion contract — revision 1 had this backwards (F-4)

Revision 1 claimed leaving `visibleLimit` unbound meant "today's behaviour, expansion machinery not engaged". **`visibleLimit === null` is precisely the expanded state:**

- `canExpand = items().length > COLLAPSED_ITEM_LIMIT` (5) — **depends only on item count, not on `visibleLimit`**
- `expandedOverlay = visibleLimit() === null && canExpand()`
- `layoutItems = visibleLimit() === null ? items().slice(0,5) : visibleItems()`
- `toggleLabel = visibleLimit() === null ? 'Show less' : 'Show more'`
- template `:65` — `@if (canExpand() && variant() === 'card')` renders the toggle

Unbound, any card with >5 categories would render an out-of-flow overlay, an `invisible` duplicate beneath it, and a stuck **"Show less"** button wired to an output the host never handles.

**Note the judges' suggested fix is insufficient.** Binding a large numeric limit (`999`) does suppress `expandedOverlay`, but `canExpand()` is computed from item count alone, so **the toggle still renders** — now labelled "Show more" — and still emits `expandToggled` into a host that ignores it. A dead button is a smaller defect than a broken overlay, but it is still a defect.

**Decision: the metadata cards participate in the expansion contract exactly as Chunk A's ranked cards do.** The host owns an expanded-set signal keyed by chart, binds `visibleLimit` (collapsed → `COLLAPSED_ITEM_LIMIT`, expanded → `null`), and handles `expandToggled`. Cards with ≤5 categories never show a toggle because `canExpand()` is false — so the seeded-lookup charts (gender 3, degrees 4, policy_stage 3, formats/types 2) are unaffected either way, and only the CLARISA-synced charts that genuinely exceed 5 get a working, tested "Show more".

This reuses proven machinery instead of fighting it, and requires **no change to the card** (DD-6 holds). Its accessibility consequence is real and recorded in §14 R-5 rather than denied.

### 7.3 Components

| Component | Role |
| --- | --- |
| `IndicatorMetadataBandComponent` (new) | Band chrome — dot, title, count chip, collapse toggle, responsive grid. Presentational; state owned by the host. |
| `ProjectDashboardCardComponent` (existing, **unmodified**) | Each card, now with `visibleLimit` + `expandToggled` bound (§7.2). |
| `ProjectDashboardComponent` (host) | Owns band-collapse state **and** per-card expansion state, both as signals, mirroring Chunk A's `expanded` set. |

### 7.4 Layout — settled by measurement (KZ-006)

Measured in real headless Chrome. **Widths actually measured: 500 px (the headless harness floor), 768 px, 1440 px** — 0 px horizontal overflow at each. Revision 1 implied the NFR's widths had been measured; **390 px has not been, and remains outstanding** (W-5), discharged by the measurement task in §10.

| Decision | Value |
| --- | --- |
| Grid | `repeat(auto-fill, minmax(300px, 1fr))` — **`auto-fill`, not `auto-fit`**: `auto-fit` stretches a single-card band (OICR) to full width |
| 4-card band | `minmax(400px, 1fr)` → 2×2, avoiding a 3+1 orphan row |
| Card sizing | `align-items: start` — stretch produced large voids in low-cardinality cards |
| Mobile | one column below 720 px; the two-class band selector must be named in the media query or it out-specifies it |
| Chart layout | `columns` for ≤ 4 categories, `rows` for 5+ or long labels |

Band order follows descending result count; card order within a band follows `requirements.md` §4.1.

### 7.5 States

Loading, error and retry inherit from `ProjectDashboardCardComponent` — no new pattern (R-IMC-011 AC.4, `docs/ux-ui/design.md` OG-6). The **unanswered-field** empty state (R-IMC-010) uses the card's existing `empty`/`emptyMessage` inputs.

**Wording constraint (W-7).** Band visibility derives from `indicatorsWithResults()`, which reads `project().indicators.count_results` with **no primary/non-primary distinction**; the aggregations scope to `is_primary = TRUE`. The two populations differ, so a project whose results are all linked non-primary would show a visible band over empty sections. The empty-state copy therefore **must not assert why** the section is empty — it states that no data is recorded for the field on this project, not that "N results left it unanswered". A spec case covers "indicator has results, all non-primary".

### 7.6 Design tokens

From the live component tree: navy `#112F5C`, slate `#4c5158`, grey `#777C83`, border `#e8ebed`, chip `#E8F0F7`/`#345B8F`, accent `#1689CA`; Barlow. Bars from `projectDashboardBarColor()`. Per the client guide, component code uses token utilities / CSS variables — these hexes record *which* tokens, they are not literals to paste.

**Dot colour is per-indicator, not the fixed accent (T-12 rework, ISSUE 1).** `#1689CA`/`--ac-light-blue-300` above is one entry harvested from the live tree, not a statement that the dot is a fixed colour — the mockup (`mockup/index.html:180/234/300/336`) draws four different dot colours from the same ramp `projectDashboardBarColor()` produces for the ranked-list dot the section above already uses (`project-dashboard.component.html:253`). `IndicatorMetadataBandComponent` therefore takes a fifth primitive input, `color = input<string>('')`, bound by the host from `indicatorSummaries()`'s `color` field (the same field `indicator-metadata-bands.mapper.ts`'s `IndicatorMetadataBandModel.color` already carries, per T-11). `.imb-dot` binds `[style.background-color]="color() || null"`; the SCSS `--ac-light-blue-300` stays as the fallback for an unbound/empty value only.

**Chip token pair replaced — WCAG 2.1 AA (T-12 rework, ISSUE 2).** `--ac-primary-blue-100` (`#b0c4dd`) was tried as the "nearest token in the same family" for the chip background and is **wrong**: it is a mid-tone, not a tint of `#E8F0F7`, and paired with `--ac-primary-blue-300` foreground it computes to **3.88:1 light / 1.55:1 dark** — both fail the 4.5:1 AA threshold for the chip's 12px/700 text (not "large text"). A new, purpose-built token pair is added to `src/styles/colors.scss`:

| Theme | Background | Foreground | Computed ratio | AA (4.5:1) |
| --- | --- | --- | --- | --- |
| Light | `--ac-chip-blue-bg` `#e8f0f7` | `--ac-chip-blue-fg` `#345b8f` | **6.00:1** | pass |
| Dark (`[data-theme='dark']`) | `--ac-chip-blue-bg` `#253448` | `--ac-chip-blue-fg` `#b0c4dd` | **7.09:1** | pass |

Ratios computed via the standard WCAG relative-luminance formula, not asserted. `.imb-chip` binds `color: var(--ac-chip-blue-fg)` / `background-color: var(--ac-chip-blue-bg)`. This is a client-guide-prescribed new-token addition (`client/research-indicators/src/CLAUDE.md` § "Adding code"), recorded here and in `client/research-indicators/README.md`; it does **not** touch the constitutional `docs/ux-ui/design.md` §7 token registry — that fold-in is owned by **T-17**.

**Mobile breakpoint corrected (T-12 rework, folded in on reopen).** §7.4's "one column below 720px" is now written as the media query `(width < 720px)`, not `(width <= 719px)` — the latter silently excludes fractional widths between 719 and 720px. Both forms are lint-clean; `<` matches the requirement's wording literally.

---

## 8. Security & Authorization

No change. Read-only, same handler, same roles and guards. Gender data is emitted **only as aggregate totals**, never per participant.

---

## 9. Observability

Q1 and Q2 are timed and logged via `LoggerUtil` at debug with section group and row count, so NFR-IMC-001's measurement has a source and a slow aggregation is attributable to a specific query.

---

## 10. Testing Strategy

| Layer | Coverage |
| --- | --- |
| Repository specs | Q1 and Q2: per-section grouping, NULL exclusion, primary-contract scoping, union-level ordering, and **correct parameter binding** (a fixture with distinct data in every branch — W-2's off-by-one returns zero rows silently). |
| Gender util specs | Pure fixtures — individual + group merge keyed on `gender_id`; NULL→0; zero-total dropped; no double-count; an id present on only one side carried through unchanged; **a group-only fixture (zero individual rows) still yields all three categories with their summed counts**; and the merged result is **sorted `count DESC, id ASC`** with a fixture where summing reorders the SQL ranking. |
| Degree fixture | Must contain an **Engagement** row **and** a **Short-term** row that both carry `degree_id` and must be excluded. A fixture without both proves nothing (DC-2). |
| Mapper specs | Per-section assertions — the KZ-005 gate (DC-5). |
| Card-expansion specs | For a metadata card fed **>5 categories**: toggle renders, `aria-expanded` correct, `expandToggled` handled by the host, overlay behaves. For **≤5**: no toggle renders (F-4). |
| Band component specs | Collapse, `aria-expanded`, accessible name includes the indicator (NFR-IMC-002). |
| Host specs | Visibility: present / absent / all-null / **all-non-primary** (DC-6, W-7). |
| Contract specs | Existing `GetFullContractReportsService` and dashboard specs pass with fixture extension only (R-IMC-007 AC.3). |
| Coverage | Server ≥ 60 %; client floors 40/20/45/30. Neither regresses (**NFR-IMC-004**, W-8). |
| Full client suite | KZ-003 — all `project-dashboard-card` hosts stay green (NFR-IMC-005). |
| Layout | **Real headless Chrome at 390 / 768 / 1440, reproducing a known-overflow control first.** 390 px is new evidence, not a re-run (W-5). |
| Perf | Timed before/after. **Inconclusive is a valid, reportable outcome** (DC-9). |

**Not covered by any command:** DC-8 (visual quality) — substituted by the human check at the approval pause plus a T6 multimodal screenshot review, and recorded as an accepted risk in `requirements.md` §9.

---

## 11. Rollout

- **No infrastructure prerequisite.** DD-11's sequential composition holds peak concurrency at today's 8, so no connection-pool change is needed to ship this spec. (Setting `poolSize` explicitly remains a genuine improvement for the server as a whole — carried as §14 R-4, owned elsewhere.)
- **Order:** server (additive payload is inert until read) → client. No flag needed.
- **Measure NFR-IMC-001 early** — and it **still gates client work**, for a different reason than revision 4 gave. *(Superseded text: "a breach of the 1.5× bound invalidates sequential composition and forces `Promise.all` + an explicit `poolSize` change."* That bound was **retired by the T-08 Pivot**, and DD-11 stands.) **What remains gated is NFR-IMC-001(c)** — each query's **server-side** execution time, isolated from network cost, which is **unmeasured**. Parts (a) 3 s absolute and (b) the 250 ms added-latency ceiling are both **met** (174.5 ms and 92.7 ms, 2026-07-30). If (c) shows the aggregations themselves are slow, the remedy is **work on the queries**, not a change of composition — and discovering that after the client is built is still the expensive path.
- **Migrations:** none.
- **Backout:** revert either package independently; the server revert is safe because no consumer depends on the new fields, the client revert because extra payload fields are ignored.
- **Docs (R-IMC-012):** owning tasks for **(a)** `trd.md:299` ("six sections" → 16 sections / 17 fields), **(b)** `trd.md:128` PERF-5's note on the new query profile (AC.3, restated — see §15), **(c)** `docs/ux-ui/design.md` chart inventory + decisions log, and **(d)** the `@ApiOkResponse` Swagger change. All four are owned; none is left to drift.
- **Comms:** MEL/product for the new charts; no partner-facing contract change.

---

## 12. Design Decisions Log

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| **DD-1** *(rev 4)* | 2026-07-30 | Consolidate into **2** queries (per query family), CTE-bound. | Baseline is 8, not 6 (`:739-743` nested `Promise.all`). Under DD-11's sequential composition, ten un-consolidated queries would peak at `max(8,10) = 10` — **at the pool ceiling**; two keeps step 2 at 2, so the peak stays at the existing 8. (An earlier revision said "would have peaked at 18" — that is 8+10 raced, arithmetic from the parallel model DD-11 rejects.) |
| **DD-11** *(rev 4; **status settled 2026-07-30**)* | 2026-07-30 | Compose the two repositories **sequentially**, not with `Promise.all`. **"The two repositories" means the two *steps*** — step 2's own Q1 ‖ Q2 concurrency is required, not merely tolerated (see the row below). | Peak becomes `max(8,2) = 8` — today's value — so no `poolSize` change, no shared-infra edit, no DevOps sign-off. **Rejected alternative:** racing both peaks at 10/10, monopolising the pool and forcing an infrastructure prerequisite. Peak concurrency, not total query count, is the quantity that matters. **No longer contingent:** revision 4 made acceptance conditional on the 1.5× measurement; the **T-08 Pivot retired that bound** as unmeasurable over VPN and unsatisfiable even by this decision's own named fallback (2.12×). **DD-11 stands, unverified only as to NFR-IMC-001(c), the server-side execution bar.** |
| **DD-12** *(new, 2026-07-30 — T-08 Pivot)* | 2026-07-30 | **Step 2 runs `Promise.all([Q1, Q2])`.** Q1 ‖ Q2 is load-bearing to DD-11's arithmetic, not a liberty. | §3's diagram annotates step 2 **"2 concurrent"**; DD-1 says *"two keeps step 2 at 2"*; DD-11's own arithmetic is `max(8, 2)`; `tasks.md` § T-06's Description says *"(step 2, 2 concurrent)"*. Sequentialising step 2 would make it `max(8,1)` and turn the cost model's `T_metadata` from `max(Q1,Q2)` into `Q1 + Q2`, **raising the bar any latency measurement must clear.** Recorded as its own decision because an earlier doc-comment asserted the opposite and would have led a future reader to "fix" it — and because the assertion guarding it (`callOrder`) provably **cannot** detect that change, which is why T-07 owes a dedicated gate. |
| **DD-2** *(rev 3)* | 2026-07-30 | Gender: three literal group branches; merge in a pure util **keyed on `gender_id`**, as a **symmetric sum over the union of ids**, re-sorted after summing. | Fixes the union column-shape mismatch; ids 1/2/3 are fixed permanently by the seed migration. Symmetry matters: any rule subordinating group rows to individual rows empties the chart for group-only projects. Re-sorting is required because addition reorders the SQL ranking. |
| **DD-3** *(rev 2)* | 2026-07-30 | Split `ContractBaseReportsDto` (7) / `ContractFullReportsDto extends` it (+10); repository returns the base type — a **signature-only** edit. | "Byte-for-byte unchanged" was unachievable: 10 new required fields break the 7-property return literal (`TS2739`). The six existing sections stay structurally protected; the **merge step is test-gated**, not structurally guaranteed. |
| **DD-4** *(rev 2)* | 2026-07-30 | Import the **existing** `SessionFormatEnum`/`SessionLengthEnum`; add `SessionTypeEnum`; drop name resolution for Training. | Both enums already exist — rev 1 would have created duplicates. Seed migration `1727119632564` asserts every id, so Training-by-name avoided a guess that was not a guess, and `TEXT` matching is the more fragile option. |
| **DD-5** | 2026-07-30 | Data-driven band model from a pure mapper. | Satisfies KZ-005 with per-entry data assertions; the gate survives new cards. |
| **DD-6** | 2026-07-30 | Do **not** modify `ProjectDashboardCardComponent`. | Multi-host; editing triggers KZ-003's blast radius. Still holds under the revised §7.2, which uses the card's existing contract rather than changing it. |
| **DD-7** | 2026-07-30 | `auto-fill`, `align-items: start`, 2×2 for 4-card bands. | Measured in real Chrome at 500/768/1440 (KZ-006). |
| **DD-8** *(rev 4)* | 2026-07-30 | Unmatched gender categories **pass through from either side**. The merge is a symmetric sum over the union of `gender_id`s (**DD-2**, §6.2) — **no rule may subordinate group rows to individual rows**. | Dropping reported data silently is worse; the zero-total rule keeps extras invisible unless real. **An earlier revision of this row also said "unmatched group id skipped + logged"; that rule was defective** — it empties the Gender chart for any group-only project — and is prohibited by §6.2. |
| **DD-9** | 2026-07-30 | Band collapse state in-memory, not persisted. | Mirrors Chunk A's host-local `expanded` signal. |
| **DD-10** *(new, rev 2)* | 2026-07-30 | Metadata cards **join** the expansion contract (host-owned `visibleLimit` + `expandToggled`). | `visibleLimit === null` is the expanded state. Binding a large number is insufficient — `canExpand()` reads item count alone, so the toggle would still render into a host that ignores it. Reusing the proven contract is cheaper than suppressing it. |

### Step 2.3 — Reversion challenge

**Not triggered.** No decision removes, disables or inverts delivered behaviour. DD-3's DTO split and DD-10's expansion binding both *extend* existing contracts; `getFullContractReports`'s body and `ProjectDashboardCardComponent` are unedited.

---

## 13. Budget (Step 2.4 — `/akili-execute` tripwire)

Revised after judgment: the Swagger task, three documentation tasks, the two client files missing from rev 1's inventory, and the heavier test surface were all unaccounted for (S-1, S-2, W-4).

| Metric | Rev 1 | Rev 2 | **Rev 3** |
| --- | --- | --- | --- |
| **Tasks** | 14 | 17 | **16** (T-00 removed by DD-11) |
| **LOC** | ~1,350 | ~1,600 | **~1,580** (server ~490, client ~420, tests ~670) |
| **Review rounds** | 2–3 | 2–3 | **2–3** |

A tripwire, not a cap: if execution exceeds these, the Leader stops and escalates. Still consistent with **Standard** depth. At ~1,580 LOC the work needs a multi-PR split — see [`./tasks.md`](./tasks.md) §6 (four chained PRs).

> **Declared delta, 2026-07-30.** The list as written is **17 tasks · ~1,600 LOC**. The single cause is **T-15**, created by the owner's OQ-6 decision (*pull T-09 in*), which post-dates this budget. Recorded in `tasks.md` §9 so the tripwire compares against a number that already includes that decision instead of firing on an overrun authorised before execution began.

---

## 14. Open Questions & Carried Risks

| ID | Status |
| --- | --- |
| ~~OQ-1~~ | ✅ Closed — DD-4 (existing enums + seeded ids) |
| ~~OQ-2~~ | ✅ Closed — **DD-2 + DD-8**: the merge is a symmetric sum over the union of ids, and unmatched categories pass through from either side. `gender` is seeded with exactly 1/2/3, so pass-through is defensive |
| ~~OQ-3~~ | ✅ **Closed 2026-07-30 by T-01**, from live rows: readiness → `CONCAT(level,'. ',name)` (`id` is 11–20, so **`id ≠ level`**); maturity → `full_name` (`name` is only `"Level 1"`). **A third case this question had missed:** `policy_stage.name` is only `"Stage 1"` → that chart uses `description`. **Also unrecorded until now: the join column is not uniformly `id`** — `clarisa_innovation_types` joins on **`code`**, the seven seeded lookups on `<table>_id`, and `gender.id` does not exist. `requirements.md` §4.1 now carries the executed join map; **§6.1's "§4.1 is the single source" pointer therefore still holds.** |
| ~~OQ-4~~ | ✅ Closed — DD-9 |
| ~~OQ-6~~ | ✅ **Closed 2026-07-30 — owner decision: pull T-09 in and close it.** Became [`./tasks.md`](./tasks.md) **§ T-15**, so NFR-IMC-002's original target stands rather than being renegotiated. **This creates a narrow, owner-authorised exception to DD-6** (T-15 modifies `ProjectDashboardCardComponent`): attribute-only on the overlay, no geometry change, and **KZ-003's full-suite requirement applies** — recorded as `tasks.md` RB-5. Second cost: one extra keyboard tab stop per expanded card. |
| ~~OQ-5~~ | ✅ **Answered 2026-07-30 by T-01:** readiness **10 rows**, types **4**, characteristics **4** — **exactly one card of ten exceeds 5 categories** (Current Readiness). §7.2 / DD-10 and DC-13 therefore describe a real surface, not a hypothetical one. **Implement the contract unconditionally anyway** (§7.2 requires it regardless): the row count of a sync-populated table is not a contract. |

| ID | Risk |
| --- | --- |
| **R-4** *(rev 3 — no longer this spec's problem)* | The pool is un-configured, so mysql2's default of 10 applies server-wide, and `reports/full` already sits at 8 of it **today, before this spec**. DD-11 means this spec does not make that worse. Setting `poolSize` explicitly is still worth doing — **recommended as its own change**, not a prerequisite here. Verified effective if pursued: TypeORM maps `options.poolSize → connectionLimit` and the existing `extra` block does not shadow it. |
| **R-5** *(rev 2 — reversed)* | Revision 1 claimed this spec would not touch T-09's keyboard gap. **That was wrong.** Under DD-10, any metadata card with >5 categories engages the same overlay whose scroll container is T-09. So this spec **extends T-09's surface** from four ranked cards to those plus the high-cardinality metadata cards. `requirements.md` NFR-IMC-002's "MUST NOT widen that gap" is **no longer satisfiable as written** — it must either be renegotiated, or T-09 must be pulled into this spec. **Recommendation: pull T-09 in** (~10 LOC: make the scroll container focusable and labelled) and close a known debt while working in exactly that code. Flagged for the user, not decided unilaterally. |
| **R-6** *(new)* | Q1 unions three fact tables. If any ceases to be 1:1 with `results`, `COUNT(*)` would double-count. All four are 1:1 today (`result_id` is PK on each), verified. |

---

## 15. Requirement Amendments Proposed By This Revision

These change `requirements.md` and are listed here so the edit is explicit rather than silent:

| Requirement | Amendment | Cause |
| --- | --- | --- |
| §2, §8 R-1 | "6 → 16" becomes "8 → 10" | F-1 |
| §4.1 row 4 | `result_oicr` → **`result_oicrs`**; irregular list → four names | F-2 |
| §8 A-2 | Drop "not in a seed migration" — migration `1727119632564` asserts every id | F-3 |
| §8 A-1 | Narrow to the CLARISA-synced lookups only | F-3 |
| NFR-IMC-002 | "MUST NOT widen the T-09 gap" is unsatisfiable under DD-10 — renegotiate or pull T-09 in | F-4 / R-5 |
| NFR-IMC-003 | Note 390 px is not yet measured | W-5 |
| R-IMC-012 AC.3 | **Mis-specified.** PERF-5 counts *client HTTP requests* (4), which this spec does not change. Restate as: PERF-5 gains a note that `reports/full` issues **10 SQL queries in two sequential batches, peak concurrency 8** | W-4 |
| §2 risk profile, §8 R-1 | Restate around **peak concurrency 8, unchanged** — not "10 against a pool of 10". No pool prerequisite | N-5 / DD-11 |
| §9 DC-6 | Extend the gate text with the **all-non-primary** case that design §10 already assigns to it | N-6 |
| R-IMC-005 **AC.6** | New — neither training type is subordinate; a group-only project still reports a full distribution | N-1 |
| R-IMC-005 **AC.7** | New — the section is ordered **after** summing, since summing can reorder the ranking | N-2 |
| R-IMC-005 scenario | New — *Group-only project* | N-1 |
| §9 DC-3 | Extended — requires a **group-only** fixture, because a defective merge passes the mixed fixture and fails only that one | N-1 |
| NFR-IMC-001 | Add the early-measurement condition and the additive-latency cost model; record that a breach invalidates DD-11 | R3-1 |
| §8 R-1 | Restate the cost as additive latency, not "one extra round trip" | R3-1 |

---

## 16. Change Record

| Finding | Judges | Resolution |
| --- | --- | --- |
| F-1 pool baseline 8, total 12 | both | DD-1 revised: 2 queries + T-00 prerequisite |
| F-2 `result_oicrs` | both | §4 + §6.1 + requirements §4.1 corrected; four irregulars |
| F-3 DD-4 false premise | both | DD-4 rewritten; existing enums imported; Training by id |
| F-4 `visibleLimit` inverted | both | §7.2 rewritten; new DD-10; R-5 reversed |
| F-5 DTO build break | one (verified by author) | DD-3 revised: base/full DTO split |
| W-1 union shape + branch count | both | §6.2 three literal branches; counts reconciled (13 branches, 10 sections) |
| W-2 repeated binding | both | CTE + single bind (§6.1) |
| W-3 union ORDER BY | both | union-level ordering (§6.1) |
| W-4 R-IMC-012 | both | owning tasks (§11); AC.3 renegotiated (§15) |
| W-5 390 px | both | §7.4 states measured widths; 390 outstanding |
| W-6 Swagger | one | `@ApiOkResponse` added (§3.1, §5) |
| W-7 visibility scoping | one | empty-state wording constraint + spec case (§7.5) |
| W-8 coverage | one | added to §10 |
| S-1…S-4 | — | file inventory (§3.1), test LOC (§13), `gender_id` keying (§6.2), DD-3 wording |

### Round 2 (scoped re-judgment) — 13 of 17 ledger items resolved; these were the remainder

| Finding | Judges | Resolution |
| --- | --- | --- |
| N-1 gender merge erased group-only data | one (author-verified) | §6.2 rewritten as a **symmetric sum over the union of ids**; the defective skip-and-warn clause deleted and a standing warning left in its place; §10's spec inverted to assert the group-only case |
| N-2 `gender_distribution` unordered | one | Util re-sorts after summing (§6.2); §5 qualified; §10 asserts it |
| N-3 `proposal.md` stale and contradicting | both | Supersession banner + B-2/B-R5 struck (§17) |
| N-4 T-00 scope growth unreflected | one | **Dissolved** — DD-11 removes T-00 entirely |
| N-5 composition unstated | both | **DD-11** — sequential, explicit, with the rejected alternative recorded |
| N-6 traceability gaps | one | OQ-6 added to §14; DC-6 gate extended; `tasks.md` → `task.md` — **that last rename was reverted 2026-07-30 and the file is `tasks.md`.** The round-2 fix followed `general-setup/task.md`'s own filename, but `/akili-execute` Step 0 reads `tasks.md` and delivered Chunk A shipped `tasks.md`; a spec named `task.md` would not be found by the executor. Recorded rather than silently overwritten |

### Round 3 (final re-judgment) — terminal ESCALATED; these were applied afterwards, unjudged

| Finding | Judges | Resolution |
| --- | --- | --- |
| **SEVERE** — DD-8 still carried "unmatched group id skipped + logged", the rule §6.2 prohibits; the ledger falsely claimed it deleted | both | DD-8 rewritten as a symmetric pass-through cross-referencing DD-2, with the defective rule named as prohibited so it cannot be reinstated by a future reader. Inbound pointers at §6.2, §14 OQ-2 and `requirements.md` OQ-2 re-pointed. Ledger entry corrected |
| R3-1 — DD-11's latency understated ("one extra round trip… comfortably inside 1.5×") | both | §1 gains the additive cost model `T_total = T_existing + T_metadata` and the derived requirement `T_metadata ≤ 0.5 × T_existing`, marked unverified; DD-11 made contingent on measurement; fallback named (`Promise.all` + `poolSize`); NFR-IMC-001 and R-1 restated; early-measurement note added to §11 |
| R3-2 — DD-1's "would have peaked at 18" is parallel arithmetic | both | Restated as `max(8,10) = 10` under DD-11, with the old figure explained as superseded |
| R3-3 — §15 under-reported its own round-2 edits | one | Six missing amendment rows added (AC.6, AC.7, the Group-only scenario, DC-3, NFR-IMC-001, R-1) |
| R3-4 — cosmetic residue | one | Budget prose no longer names T-00; §16 retitled; §17 describes the ledger accurately |

---

## 17. References

- `judgment.md` — the full three-round Judgment Day ledger (terminal state: **ESCALATED**).
- `requirements.md` §4.1 — verified table/column/label map.
- `mockup/index.html` — measured layout reference.
- Seed migration `1727119632564-InsertDataControl.ts` — authoritative lookup ids.
- Chunk A: `docs/specs/archive/2026-07-30-project-dashboard--full-payload-show-more/`.
- Kaizen: KZ-003, KZ-005, KZ-006.
