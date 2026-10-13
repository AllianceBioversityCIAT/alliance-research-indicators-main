# Design — Changes / Control Lists: global lists read by key

- **Module:** control-lists — server `domain/entities/control-lists/` + client Center admin page
- **Spec id:** 2026-10-control-lists-global-scope
- **Status:** draft
- **Owner:** Hector F. Tobón (requester)
- **Linked requirements:** [`./requirements.md`](requirements.md)
- **Linked TRD:** [`docs/trd/trd.md`](../../../trd/trd.md) — backend module layout, response envelope
- **Modifies:** archived Control Lists design ([`design.md`](../../archive/2026-10-08-institutional-performance--control-lists/design.md)); its decisions are cited as `D-CTL-n`
- **Visual reference:** artboard *1 · Control Lists*, updated 2026-10-13 (selector removed, key shown alone, duplicate-key check) — https://claude.ai/artifact/EPtLbFVhaEQb3Vgq7kuyRP · [`../../institutional-performance/mockup/ControlledLists.dc.html`](../../institutional-performance/mockup/ControlledLists.dc.html)
- **Exploration:** direct `grep` counts (§13) + one reversion-challenge scout (§12.1)
- **Last updated:** 2026-10-13

---

## 1. Goals & non-goals

**Goals**
1. Remove the portfolio from the schema, the API and the page (R-CLG-001, 005, 007).
2. Make category names and list keys unique module-wide, in the database (R-CLG-002, 003).
3. A consumer contract by key only (R-CLG-004).
4. Rewritten migrations with the same seeded ids (R-CLG-006).
5. Value-level *Applies to* portfolios and a portfolio filter on the consumer read (R-CLG-009).

**Non-goals** — portfolio on categories or lists; changes to values, codes, ids, in-use protection, roles or the `DataTable`; changes to any other module.

---

## 2. Architecture

The module's shape does not change: controller → request-scoped service → three repositories; singleton registry and lookup service exported for consumers. What changes is that **categories and lists no longer touch `PortfoliosModule`**; it is used only to validate a value's *Applies to* portfolios and the A13 filter (R-CLG-009).

```mermaid
flowchart LR
  PG[ControlListsPage\nno selector] --> API[ApiService]
  API -->|/api/control-lists/*\nno portfolioId| CT[ControlListsController]
  CT --> SV[ControlListsService]
  SV --> RP[3 repositories]
  SV -. only to validate Applies to .-> PS[PortfoliosService]
  C2[consumers\ne.g. org-structure] -->|assertValueInList(valueId, key)| LK[ControlListValueLookupService]
```

### 2.1 Composition — what each file loses or gains

**Server** — `server/researchindicators/src/`

| Path | Change |
| --- | --- |
| `db/migrations/1790900000000-createControlListCategories.ts` | Rewritten: no `portfolio_id` column, FK or index; `uq_control_list_categories_name (name)`; seed inserts ids 1–2 directly (no join on `portfolios`) |
| `db/migrations/1790900000001-createControlLists.ts` | Rewritten: no `portfolio_id`; `uq_control_lists_key (list_key)`; seed inserts ids 1–6 by category id |
| `db/migrations/1790900000003-createControlListValuePortfolios.ts` | **New:** link table value ↔ portfolio (§3); no seed rows (every seeded value applies to all) |
| `db/migrations/1790900000002-createControlListValues.ts` | Only the seed's lookups that went through the portfolio are simplified; table, ids 1–23 and indexes unchanged |
| `domain/entities/control-lists/entities/control-list-category.entity.ts`, `control-list.entity.ts` | Drop the `portfolio_id` column and relation; unique index metadata follows the migration |
| `…/dto/create-control-list-category.dto.ts`, `update-control-list-category.dto.ts` | Drop `portfolioId` |
| `…/dto/get-categories-query.dto.ts` | Becomes an **empty** query DTO, kept on purpose so `forbidNonWhitelisted` rejects a stale `portfolioId` (D-CLG-3) |
| `…/dto/get-list-values-by-key-query.dto.ts` | `portfolioId` becomes an **optional filter** (R-CLG-009); keep `activeOnly` |
| `…/dto/create-control-list.dto.ts` | Swagger text: key unique module-wide (remove the D-CTL-2 wording) |
| `…/control-lists.types.ts` | Drop `portfolioId` from response shapes; delete `PortfolioCategoriesSummary` |
| `…/control-lists.service.ts` | Drop `getPortfoliosSummary` and the cross-portfolio checks (D-CTL-13); keep the portfolio existence check for `portfolioIds` and the A13 filter; value create/update replace the *Applies to* links inside the same transaction; A9 and A13 return `appliesTo: number[]`; duplicate checks become module-wide; errno 1062 mapping kept (D-CTL-11) |
| `…/control-list-value-lookup.service.ts` | `assertValueInList(valueId, listKey)`; the portfolio comparison and its 400 branch removed |
| `…/control-lists.controller.ts` | Remove A2; remove `portfolioId` from A1, A13 Swagger/params; `@Roles(SYSTEM_ADMIN, TECHNICAL_SUPPORT)` on A1, A3–A12 (was `CENTER_ADMIN, SYSTEM_ADMIN`); A13 still without `@Roles` |
| `…/control-lists.module.ts` | Keeps importing `PortfoliosModule`, now **only** to validate `portfolioIds` (value writes) and the A13 filter |
| `…/entities/control-list-value-portfolio.entity.ts` + repository | New link entity |
| `…/dto/create-control-list-value.dto.ts`, `update-control-list-value.dto.ts` | Gain optional `portfolioIds: number[]` (unique, existing portfolios; `[]` = all) |
| sibling `*.spec.ts` + `control-lists.global-exceptions.spec.ts` | Updated; new cases for `portfolioId` → 400 and module-wide duplicates |
| `test/control-lists-isolation.integration-spec.ts` | **Deleted** (its subject no longer exists — R-CLG-007) |
| `test/control-lists-{categories,lists,values,usage}.integration-spec.ts` | Drop portfolio fixtures; add duplicate-insert and fresh-schema id/count checks |
| `docs/specs/kaizen/institutional-performance--control-lists.md` (:106, :136) | Consumer-guide text updated to `assertValueInList(valueId, listKey)` and `by-key/:listKey/values`; a dated note says the portfolio was removed by this change (§12.1) |

**Client** — `client/research-indicators/src/app/`

| Path | Change |
| --- | --- |
| `pages/…/center-admin/control-lists/control-lists.component.ts` | Remove portfolio signals (`portfolios`, `portfolioSummaries`, `selectedPortfolioId`), `portfolioOptions`, `selectPortfolio`, `resolveDefaultPortfolioId`, the portfolio calls in `load()`; payloads lose `portfolioId` |
| `…/control-lists.component.html` | Remove the `p-select`; the list header shows `Key: <key>`; values table gains an **Applies to** column and a *Show values for* filter; value modal gains an **Applies to** multi-select (empty = *All portfolios*) |
| `…/control-lists.component.spec.ts` | Remove default-portfolio / not-configured cases; add "no selector rendered", "no `P<n> ·` text", "portfolios requested only for the Applies to field", Applies-to column, filter and modal field |
| `shared/interfaces/control-lists.interface.ts` | Drop `portfolioId` fields and `ControlListPortfolioSummary` |
| `shared/services/api.service.ts` | `GET_ControlListCategories()` without argument; delete `GET_ControlListPortfolioSummaries` |
| `testing/mock-services.mock.ts` (if it mocks these) | Follow the signatures |
| `shared/components/alliance-sidebar/alliance-sidebar.component.ts` (+spec) | Remove the `children` (Control Lists) from *Portfolio Management*; add **Control Lists** → `/administration/configuration/control-lists` after *Prompt Manager* in the *System admin* group. The nested-children support (D-CTL-9) stays for Strategy Framework |
| `app.routes.ts` | Route path `administration/configuration/control-lists` with `canMatch: [appConfigurationGuard]` (same as Environment variables / Prompt Manager); the old `administration/center-admin/control-lists` route is removed |

### 2.2 Reuse
Everything else in the module is reused unchanged: usage registry, in-use protection, code proposal, natural compare, `DataTable`, modal, toasts.

---

## 3. Data model

| Table | Before | After |
| --- | --- | --- |
| `control_list_categories` | `portfolio_id` FK · `uq (portfolio_id, name)` · `idx (portfolio_id)` | no portfolio · `uq_control_list_categories_name (name)` |
| `control_lists` | `portfolio_id` FK · `uq (portfolio_id, list_key)` | no portfolio · `uq_control_lists_key (list_key)` · `idx_control_lists_category` kept |
| `control_list_value_portfolios` (**new**) | — | `value_id` FK → `control_list_values.id` **CASCADE** · `portfolio_id` FK → `portfolios.id` RESTRICT · PK `(value_id, portfolio_id)` · `idx_control_list_value_portfolios_portfolio (portfolio_id)`. No audit columns: the value's own audit fields record who changed it |
| `control_list_values` | unchanged | unchanged |

- Collation `utf8mb4_unicode_ci` stays declared, so both unique indexes are case-insensitive (P-4 of the archive).
- Seed: same explicit ids (categories 1–2, lists 1–6, values 1–23), same `AUTO_INCREMENT` resets, still `INSERT … WHERE NOT EXISTS` so a re-run adds nothing. With no portfolio to resolve, the seed has no lookup that can silently match zero rows (the old year-based lookup could).
- `down`: each migration drops its own table; order values → lists → categories.

### 3.1 Local database procedure (R-CLG-006)
1. Export any hand-made control-list rows you want to keep.
2. Revert the three migrations (`npm run migration:revert` three times, from `server/researchindicators`), confirming each reverted name.
3. Run migrations again (`npm run migration:execute`).
4. Check: `SHOW COLUMNS FROM control_list_categories LIKE 'portfolio_id'` and the same for `control_lists` return nothing; counts 2 / 6 / 23; `migration:show` read with ANSI codes stripped (K-014).

---

## 4. API surface

Base `/api/control-lists`. Roles, guards, interceptors and Swagger tags unchanged.

| # | Method + path | Before | After |
| --- | --- | --- | --- |
| A1 | `GET /categories` | `?portfolioId=` required | no parameters; `portfolioId` → 400 |
| A2 | `GET /portfolios/summary` | per-portfolio counts | **removed** → 404 |
| A3 | `POST /categories` | body had `portfolioId` | `{ name, description? }`; `portfolioId` → 400; duplicate name (module-wide) → 409 |
| A4 | `PATCH /categories/:id` | — | duplicate name module-wide → 409 |
| A5 | `DELETE /categories/:id` | — | unchanged |
| A6 | `POST /lists` | portfolio copied from category | duplicate key module-wide → 409 |
| A7 | `PATCH /lists/:id` | category of another portfolio → 400 | any category allowed; `listKey` still → 400 |
| A8 | `DELETE /lists/:id` | — | unchanged |
| A9 | `GET /lists/:id/values` | — | each value gains `appliesTo: number[]` (`[]` = all) |
| A10, A11 | `POST /lists/:id/values`, `PATCH /values/:id` | — | optional `portfolioIds: number[]`; unknown portfolio → 400 naming `portfolioIds`; omitted on update = unchanged |
| A12 | `DELETE /values/:id` | — | unchanged (links cascade) |
| A13 | `GET /by-key/:listKey/values` | `?portfolioId=` (required, selected the list) `&activeOnly=` | `?portfolioId=` **optional filter** — values with no links + values linked to it; without it, all values; each value carries `appliesTo`; unknown key → 404; unknown portfolio → 404 |

Response shapes lose `portfolioId`. No consumer exists yet, so the contract change has no caller to migrate besides the page.

---

## 5. Workflows & business rules (delta to archived §5)

1. **Portfolio integrity (archived rule 1) — removed.** No existence check, no copy, no cross-portfolio 400.
2. **Uniqueness (rule 2)** — the same pre-check + errno 1062 → `ConflictException`, now on `name` and `list_key` module-wide.
3. **Membership (rule 10)** — `assertValueInList(valueId, listKey)`: 404 unknown value or list; 400 naming the expected key when `list.list_key ≠ listKey`. Still no `is_active` check. Still a singleton (P-10 of the archive).
4. **Applies to (R-CLG-009)** — value create/update replace the value's links in one transaction with the value write; `[]` clears them (= all). The A13 filter is one query: values with no link **or** a link to the requested portfolio — the `OR` grouped in parentheses together with `activeOnly`, so operator precedence cannot widen it (KZ-017 precedent: `A OR B AND C`). The membership check ignores links, like it ignores `is_active`.
5. Rules 3–9 (immutable key, code proposal, in-use, delete rules, audit, transactions, side effects) unchanged.

---

## 6. Frontend — STAR client

- **Header:** title, description ("Alliance-wide vocabularies… read by its key"), **+ New category**. No selector.
- **Load:** one call (A1) on init; error and empty states as before.
- **List header:** `Key: <key>` instead of `Reference: P<id> · <key>`.
- **Values table:** new column **Applies to** (*All* or portfolio names) and a *Show values for: All portfolios / <portfolio>* filter that applies the A13 rule client-side; export includes the column.
- **Value modal:** **Applies to** multi-select of portfolios (loaded once from the existing portfolios endpoint); placeholder *All portfolios*.
- **List modal:** key hint "Unique across all lists… consumers read the list by this key"; a 409 on `listKey` shows inline under the field.
- Everything else (navigator, values table, modal, confirm, tokens) unchanged — mockup artboard 1 matches.

---

## 7. Integration impact
None outside the module. `organizational-structure` (no code yet) will call `assertValueInList(valueId, 'org.level')`; its design is updated after this spec ships (§11).

## 8. Security & authorization
**Changed (R-CLG-008):** `@Roles(SYSTEM_ADMIN, TECHNICAL_SUPPORT)` on A1, A3–A12 — the same pair as `app-config.controller.ts:156`; `SYSTEM_ADMIN` still bypasses in `RolesGuard`. Center Admin is no longer granted (supersedes D-CTL-7 and F-1 for this module). A13 stays open to authenticated users. Client: `appConfigurationGuard`, which admits Admin and Technical Support (`roles.service.ts:44-48`).

## 9. Observability
Log lines drop the portfolio field. No new logs.

## 10. Testing strategy

| Layer | Tests |
| --- | --- |
| Server unit | *Applies to*: create/update/clear links, unknown portfolio → 400, filter rule on A13 (incl. `activeOnly` combination); `portfolioId` in A1 query and A3 body → 400 (validation pipe exercised, not mocked); duplicate name/key across what used to be different portfolios → 409; errno 1062 path → 409; lookup pass / other list 400 / unknown 404; A2 route absent from the controller's route inventory |
| Global exceptions | Envelope of the new 400 and 409 through real `GlobalExceptions` |
| Integration (local DB) | *Value for one portfolio only* fixture asserted on real SQL results (P1 vs P2 vs no filter); deleting a restricted value removes its links; fresh schema: ids and counts; re-run adds 0; no `portfolio_id` column; duplicate insert → 409 via the DB index; existing suites minus portfolio fixtures |
| Client unit | No selector; no `P<n> ·` text; portfolios requested once, only for Applies to (spy on `ApiService`); Applies-to column, Show-values-for filter (same rule as A13) and modal field; 409 on key shown inline; existing state tests |
| Leftover sweep | `grep -rniE "portfolio"` over the paths in requirements §10 → only listed, intentional hits |
| Build | `npm run build` (server), `ng build` (client) |
| Manual (HITL) | Local DB procedure §3.1 executed; page against artboard 1 |

## 11. Rollout
- Branch `institutional-kpis`, unpushed. Nothing deployed, so there is no Dev/Prod data step.
- The requester runs §3.1 on the local DB.
- After this spec passes: update `organizational-structure` (Q-1 closed, D-ORG-3 dropped, R-ORG-011 and P-2 simplified), then resume it at its design gate.
- Backout: `git revert` of this spec's commits + §3.1 again.

## 12. Design decisions log

| # | Date | Decision | Rationale | Rejected |
| --- | --- | --- | --- | --- |
| D-CLG-1 | 2026-10-13 | Drop `portfolio_id` from categories and lists entirely (not nullable) | Requester: every list read by key. Portfolio applicability moved to values (D-CLG-9) | Nullable tag; optional list scope (proposal §10) |
| D-CLG-2 | 2026-10-13 | Rewrite the three unmerged migrations | Requester Q-1; never shared or deployed; avoids a create-then-alter pair | New ALTER migration |
| D-CLG-3 | 2026-10-13 | Keep an empty query DTO on A1 so a stale `portfolioId` returns 400 (A13 now accepts `portfolioId` as a filter — D-CLG-9) | Without a DTO, an unknown query param is ignored silently and a stale caller would think it was filtering | Deleting the DTO |
| D-CLG-4 | 2026-10-13 | Remove A2 (→ 404) instead of keeping it returning counts | Its only purpose was the *(not configured)* label | Repurposing it |
| D-CLG-5 | 2026-10-13 | Delete the isolation integration suite | Its subject no longer exists; keeping it would assert nothing (KZ-017) | Rewriting it as a no-op |
| D-CLG-9 | 2026-10-13 | Portfolio applicability lives on **values** (many-to-many, empty = all), with an optional filter on the by-key read | Requester: lists stay global and read by key, but it must be possible to know which values apply to a portfolio. Many-to-many lets one value serve several periods; empty = all keeps the seed and most values free of links | Portfolio on the list (forces duplicate lists per period); one portfolio per value (a value shared by two periods would be duplicated) |
| D-CLG-10 | 2026-10-13 | Restricting a value never invalidates stored records; the membership check ignores portfolios | Same precedent as deactivation (R-CTL-004): offering is the form's job, history must stay saveable | Rejecting saves of restricted values |
| D-CLG-7 | 2026-10-13 | Menu item under *System admin*; route under `administration/configuration/` with `appConfigurationGuard` | Requester: lists are not portfolio data, so they sit with the other system-wide settings; reusing the group's guard keeps menu visibility and route access identical | Keeping it under Center admin outside Portfolio Management |
| D-CLG-8 | 2026-10-13 | Access = Admin + Technical Support (Center Admin removed) | Requester choice among three options (2026-10-13); matches who already sees the System admin group | Admin only (needs a new guard); Center Admin + Admin (Center Admin cannot see the group) |
| D-CLG-6 | 2026-10-13 | Supersedes D-CTL-2 (per-portfolio keys), D-CTL-8 (seed by years), D-CTL-10 (not configured), D-CTL-13 (cross-portfolio 400); amends D-CTL-15 (membership check without portfolio) | Requester decision 2026-10-13 | — |

### 12.1 Reversion challenge (Step 2.3)

Triggered: D-CLG-1, 4, 5, 6 remove delivered behavior. Question asked to one reviewer (Explore scout, 2026-10-13): *"What does removing the portfolio from Control Lists break?"*

| Finding | Verdict | Where it is handled |
| --- | --- | --- |
| All 5 integration suites write `portfolio_id` in raw SQL or send `portfolioId`; the isolation suite also inserts the same key in two portfolios | Real; already in scope | §2.1 (isolation deleted, the other four rewritten) — T-01 |
| A3 body and the client `ControlListCategoryCreatePayload` still carry `portfolioId` | Real; already in scope | §2.1, §4 A3 — T-01, T-02 |
| Client `ControlList.portfolioId`, `ControlListCategory.portfolioId`, summary type and doc comments in `control-lists.interface.ts` | Real; already in scope | §2.1 client — T-02 |
| Editing the migrations breaks a DB that already ran them | Real; accepted by the requester (Q-1) | §3.1 local procedure — T-03 |
| Existing duplicates across portfolios would block the new unique indexes | **Does not apply**: the revert drops the tables and the rewritten seed has no duplicates (scratch rows from the isolation suite are dropped too) | §3.1 |
| Portfolio delete relying on the RESTRICT FK | **No breakage**: portfolios are soft-deleted (`portfolios.service.ts:137-140`), the FK never fired through the app, no test asserts it | — |
| `PortfoliosModule` stranded | No: still imported by `entities.module.ts:209` and three other modules | — |
| Kaizen entry `docs/specs/kaizen/institutional-performance--control-lists.md:106,136` describes the old consumer contract | Real; **new** | §2.1 docs row added — T-01 |
| `organizational-structure/design.md:87,194,326,347` (D-ORG-3, P-2, `assertValueInListKey`) | Real; planned | §11 follow-up |
| Zero findings | — | `assertValueInList` callers, summary callers, by-key client callers, cypress/e2e, `/admin` SSR, swagger tests, PRD/TRD/UX docs, `ControlListCacheService` (unrelated CLARISA cache) |
| Not reachable by the search | — | Live/staging DBs (none have these tables — fact 3.7), external API consumers (none: endpoint never deployed), `.codegraph`, `dist` |

**Outcome:** no breakage the design did not already cover, except the kaizen consumer-guide text, now added.

## 13. Premise Ledger

| # | Claim | Citation (as run) | If false |
| --- | --- | --- | --- |
| P-1 | Portfolio references in scope: server module 17 files, 5 integration specs, 3 migrations; client page 3 files + interface | `grep -rnic "portfolio"` over those paths, 2026-10-13 (counts per file recorded in the session) | Scope of T-01/T-02 understated |
| P-2 | `ControlListsModule` imports `PortfoliosModule`; the service injects `PortfoliosService` (`:49`), checks existence (`:541-544`) and builds summaries (`:87`) | `grep -n Portfolio control-lists.module.ts control-lists.service.ts` | — |
| P-3 | No portfolio module code references control lists | `grep -rn ControlList src/domain/entities/portfolios` → 0 | A portfolio flow depends on the FK — see §12.1 |
| P-4 | Client API: `GET_ControlListCategories(portfolioId)` `:247`, `GET_ControlListPortfolioSummaries` `:252` | `grep -n ControlList api.service.ts` | — |
| P-5 | Migrations unpushed and unmerged | `git status -sb` → `ahead 78`; `git branch -r --contains 847cda8d` → none | D-CLG-2 not allowed — High |

## 14. Budget (tripwire for `/akili-execute`)

| Measure | Estimate |
| --- | --- |
| Tasks | 3: T-01 server (migrations + module + roles + tests), T-02 client (page + API + sidebar + route + tests), T-03 HITL (local DB procedure + menu/role check with a Center Admin and a Technical Support user + mockup check) |
| LOC changed (incl. tests) | ~2,500 changed lines (≈ −900 / +1,600): removal of list-level portfolio, menu/role move (~150), and value *Applies to* (~850: migration, entity, DTOs, service, A13 filter, modal field, table column, tests) |
| Review rounds | ≤ 2 per task; ≤ 6 total |

Matches **Standard**. One PR (server + client together), because the API contract and the page change in lock-step.

## 15. Open questions
None.

## 16. References
- `./proposal.md`, `./requirements.md`
- Archived Control Lists design §3–§5, §12
- `../../institutional-performance/family.md` F-2, F-3 (amended 2026-10-13)
