# Design — Changes / Control Lists: global lists read by key, values applicable per portfolio

- **Module:** control-lists — server `domain/entities/control-lists/` + client System admin page
- **Spec id:** 2026-10-control-lists-global-scope
- **Status:** approved (2026-10-13) — Judgment Day ESCALATED, R3-1/R3-2 corrected by requester decision (`judgment.md` §10)
- **Owner:** Hector F. Tobón (requester)
- **Linked requirements:** [`./requirements.md`](requirements.md)
- **Linked TRD:** [`docs/trd/trd.md`](../../../trd/trd.md) — backend module layout, response envelope
- **Modifies:** archived Control Lists design ([`design.md`](../../archive/2026-10-08-institutional-performance--control-lists/design.md)); its decisions are cited as `D-CTL-n`
- **Visual reference:** artboard *1 · Control Lists (System admin, global)*, updated 2026-10-13 — https://claude.ai/artifact/EPtLbFVhaEQb3Vgq7kuyRP · [`../../institutional-performance/mockup/ControlledLists.dc.html`](../../institutional-performance/mockup/ControlledLists.dc.html)
- **Exploration:** direct `grep`/reads (§13), one reversion-challenge scout (§12.1), Judgment Day round 1 (two judges, `judgment.md`)
- **Last updated:** 2026-10-13 (JD round 1: J-1…J-14, S-1…S-7; round 2: R2-1…R2-5; requester-approved after escalation: R3-1, R3-2)

---

## 1. Goals & non-goals

**Goals**
1. Remove the portfolio from categories and lists, in the schema, the API and the page (R-CLG-001, 005, 007).
2. Make category names and list keys unique module-wide, in the database (R-CLG-002, 003).
3. A consumer contract by key (R-CLG-004), with an optional portfolio filter on values (R-CLG-009).
4. Rewritten migrations with the same seeded ids, plus one new link-table migration (R-CLG-006).
5. Value-level *Applies to* portfolios (R-CLG-009).
6. Menu under *System admin*, access by Admin + Technical Support (R-CLG-008).

**Non-goals** — portfolio on categories or lists; changes to value codes, ids, ordering, in-use protection or the `DataTable`; changes to any other module.

---

## 2. Architecture

Controller → request-scoped service → repositories; singleton registry and lookup service exported for consumers (unchanged). **Categories and lists no longer touch portfolios.** Portfolios are read only to validate a value's *Applies to* set and the A13 filter. Value writes that change links run in a `DataSource` transaction (§5.4).

```mermaid
flowchart LR
  SB[alliance-sidebar\nSystem admin item] --> RT[route administration/configuration/control-lists\ncanMatch appConfigurationGuard]
  RT --> PG[ControlListsPage\nno selector]
  PG --> API[ApiService]
  API -->|/api/control-lists/*| CT[ControlListsController\nRoles SYSTEM_ADMIN, TECHNICAL_SUPPORT]
  CT --> SV[ControlListsService]
  SV --> RP[4 repositories]
  SV -->|transaction on value + links| DS[(DataSource)]
  SV -. validate Applies to / A13 filter .-> PF[(portfolios, active only)]
  C2[consumers] -->|assertValueInList(valueId, key)| LK[ControlListValueLookupService]
```

### 2.1 Composition — what each file loses or gains

**Server** — `server/researchindicators/src/`

| Path | Change |
| --- | --- |
| `db/seeds/control-lists.seed.ts` | **New**, outside the migrations glob (D-CLG-11): exports `seedControlListCategories(runner)` (ids 1–2), `seedControlLists(runner)` (ids 1–6), `seedControlListValues(runner)` (ids 1–23), each `INSERT … SELECT … FROM DUAL WHERE NOT EXISTS` followed by its `AUTO_INCREMENT` reset (a no-op on re-run) |
| `db/migrations/1790900000000-createControlListCategories.ts` | Rewritten: no `portfolio_id` column, FK or index; `uq_control_list_categories_name (name)`; `up()` creates the table and calls `seedControlListCategories`. **The file exports only its migration class** |
| `db/migrations/1790900000001-createControlLists.ts` | Rewritten: no `portfolio_id`; `uq_control_lists_key (list_key)`; `up()` calls `seedControlLists` (lists by explicit category id). Exports only its class |
| `db/migrations/1790900000002-createControlListValues.ts` | Table and indexes unchanged; `up()` calls `seedControlListValues`, whose join to `control_lists` checks `l.id` **and** `l.list_key` (as today). Exports only its class |
| `db/migrations/1790900000003-createControlListValuePortfolios.ts` | **New:** link table (§3). No seed rows (every seeded value applies to all). `down` drops it |
| `domain/entities/control-lists/entities/control-list-category.entity.ts`, `control-list.entity.ts` | Remove the `portfolio_id` column property (the entities declare no relation or index metadata, so nothing else to remove) |
| `…/entities/control-list-value-portfolio.entity.ts` + `repositories/control-list-value-portfolio.repository.ts` | **New** link entity (composite PK `value_id` + `portfolio_id`). Not an `AuditableEntity` — D-CLG-12 |
| `…/dto/create-control-list-category.dto.ts`, `update-control-list-category.dto.ts` | Drop `portfolioId` |
| `…/dto/get-categories-query.dto.ts` | Becomes an **empty** query DTO, kept on purpose so `forbidNonWhitelisted` rejects a stale `portfolioId` (D-CLG-3). An empty DTO with no params passes, because Nest's `ValidationPipe` defaults `forbidUnknownValues` to `false` (`@nestjs/common` 10.4.19 `validation.pipe.js:25`) — pinned by a positive test (§10) |
| `…/dto/get-list-values-by-key-query.dto.ts` | `portfolioId` becomes **optional** (`@IsOptional @Type(() => Number) @IsInt @Min(1)`); keep `activeOnly` |
| `…/dto/create-control-list-value.dto.ts` | Add optional `portfolioIds?: number[]` with `@ValidateIf(o => o.portfolioIds !== undefined)` **and no `@IsOptional`** (on one class class-validator ANDs conditional validators, so `@IsOptional` would let `null` through), then `@IsArray @ArrayUnique @IsInt({each}) @Min(1,{each})`, `@ApiPropertyOptional({ type: [Number] })` |
| `…/dto/update-control-list-value.dto.ts` | Add `'portfolioIds'` to the explicit `PickType([...])` list (`:12-19`), otherwise `forbidNonWhitelisted` rejects it on A11. **Also re-declare `@ValidateIf((d) => d.portfolioIds !== undefined) portfolioIds?: number[]` in the class**: `PartialType` re-applies `@IsOptional` to every picked key, which would let `null` through; an own `@ValidateIf` replaces it, exactly as `code`, `value`, `displayOrder` and `isActive` already do (`:21-62`) — R3-1 |
| `…/dto/create-control-list.dto.ts` | Swagger text: key unique module-wide (remove the D-CTL-2 wording) |
| `…/control-lists.types.ts` | Drop `portfolioId` from category/list shapes; delete `PortfolioCategoriesSummary`; `ControlListValueResponse` gains `appliesTo: number[]` and `appliesToAll: boolean` (§4) |
| `…/control-lists.service.ts` | Remove `getPortfoliosSummary`, `assertPortfolioExists` (404) and the cross-portfolio checks (D-CTL-13). Inject `DataSource` and the link repository. New private `assertPortfolioIdsValid(ids)` → **400** naming `portfolioIds` (batch lookup of **active** portfolios); new `assertFilterPortfolio(id)` → **404** for A13 (S-5). Duplicate checks module-wide; errno 1062 mapping kept (D-CTL-11). `mapValue` attaches `appliesTo`/`appliesToAll` for A9, A10, A11 and A13 |
| `…/control-list-value-lookup.service.ts` | `assertValueInList(valueId, listKey)`; the portfolio comparison and its 400 branch removed |
| `…/control-lists.controller.ts` | Remove A2. A1: drop the `portfolioId` `@ApiQuery`. A13: `@ApiQuery({ name: 'portfolioId', required: false })`, summary text "by system key, optionally filtered by portfolio", service call `(listKey, activeOnly, portfolioId?)`. `@Roles(SYSTEM_ADMIN, TECHNICAL_SUPPORT)` on A1, A3–A12 (was `CENTER_ADMIN, SYSTEM_ADMIN`); A13 without `@Roles`. Update the class header comment that says Technical Support is "deliberately NOT granted" (`:40-44`) |
| `…/control-lists.module.ts` | Stop importing `PortfoliosModule` and injecting `PortfoliosService`; register the `Portfolio` entity repository read-only via `TypeOrmModule.forFeature` (or a raw query) for the active-portfolio lookups (D-CLG-13) |
| sibling `*.spec.ts` + `control-lists.global-exceptions.spec.ts` | Updated; cases in §10 |
| `test/control-lists-isolation.integration-spec.ts` | **Deleted** (its subject no longer exists — R-CLG-007) |
| `test/control-lists-{categories,lists,values,usage}.integration-spec.ts` | Drop portfolio fixtures and `portfolioId` params; drop the hand-wired `PortfoliosService`/`PortfoliosRepository`/`PortfolioUtil` providers; rename "unknown key in the portfolio"; add the §10 integration cases |
| `test/control-lists-seed.integration-spec.ts` | **New:** seed idempotency and seeded-id checks (§10, J-1) |
| `package.json` (jest `collectCoverageFrom`) | Add `!**/db/seeds/**`, as `db/migrations` already is: the seed module is exercised only by the integration suite, which the unit coverage run does not include — R3-2 |
| `docs/specs/kaizen/institutional-performance--control-lists.md` (:106, :136) | Consumer-guide text updated to `assertValueInList(valueId, listKey)` and `by-key/:listKey/values?portfolioId=`(optional); dated note that this change removed the list-level portfolio |

**Client** — `client/research-indicators/src/app/`

| Path | Change |
| --- | --- |
| `pages/…/center-admin/control-lists/` → **moved** to `pages/…/administration/configuration/control-lists/` | Folder follows the route (System admin pages live under `configuration/`) |
| `…/control-lists.component.ts` | Remove `portfolioSummaries`, `selectedPortfolioId`, `portfolioOptions`, `selectPortfolio`, `resolveDefaultPortfolioId`, `refreshPortfolioSummaries` (`:502, :564, :574-576`) and the A2 call in `load()`; keep `portfolios` (active list) for *Applies to*; add `pfFilter` signal and the filter rule (same as A13); payloads lose `portfolioId`, value payloads gain `portfolioIds` |
| `…/control-lists.component.html` | Remove the `p-select`; list header `Key: <key>`; values table **Applies to** column and *Show values for* `p-select`; value modal **Applies to** checkbox group (empty = *All portfolios*) |
| `…/control-lists.component.spec.ts` | Remove default-portfolio / not-configured cases; add §10 client cases |
| `shared/interfaces/control-lists.interface.ts` | Drop `portfolioId` fields, `ControlListPortfolioSummary` and portfolio doc comments; `ControlListValue` gains `appliesTo: number[]`, `appliesToAll: boolean`; value create/update payloads gain `portfolioIds?: number[]` |
| `shared/services/api.service.ts` | `GET_ControlListCategories()` without argument; delete `GET_ControlListPortfolioSummaries` |
| `testing/mock-services.mock.ts` (if it mocks these) | Follow the signatures |
| `shared/components/alliance-sidebar/alliance-sidebar.component.ts` | Remove `children` from *Portfolio Management*; add **Control Lists** → `/administration/configuration/control-lists` after *Prompt Manager* in *System admin*. The nested-children rendering (D-CTL-9) stays, dormant until Strategy Framework uses it (S-3) |
| `…/alliance-sidebar.component.spec.ts` | Control Lists assertions moved to *System admin*; the nested-render tests (`:301-366`) rewritten with a synthetic nested group so the dormant rendering stays covered (S-3) |
| `app.routes.ts` | Path `administration/configuration/control-lists`, `canMatch: [appConfigurationGuard]`; the old `administration/center-admin/control-lists` route removed |
| `app.routes.spec.ts` (`:88-122`) | Rewritten: new path + `appConfigurationGuard`; old path absent (R-CLG-008 AC.3) |
| `shared/guards/app-configuration.guard.spec.ts` / `roles.service.spec.ts` | Role cases with a **real** `RolesService`: role lists `[1]` and `[7]` admitted, `[9]` with focus 1 denied (J-10) |

### 2.2 Reuse
Usage registry, in-use protection, code proposal, natural compare, `DataTable`, modal, toasts — unchanged. `appConfigurationGuard` and `canAccessAppConfiguration` reused as-is.

---

## 3. Data model

| Table | Before | After |
| --- | --- | --- |
| `control_list_categories` | `portfolio_id` FK · `uq (portfolio_id, name)` · `idx (portfolio_id)` | no portfolio · `uq_control_list_categories_name (name)` |
| `control_lists` | `portfolio_id` FK · `uq (portfolio_id, list_key)` | no portfolio · `uq_control_lists_key (list_key)` · `idx_control_lists_category` kept |
| `control_list_values` | — | unchanged |
| `control_list_value_portfolios` (**new**) | — | `value_id` bigint FK → `control_list_values.id` **ON DELETE CASCADE** · `portfolio_id` bigint FK → `portfolios.id` RESTRICT · PK `(value_id, portfolio_id)` · `idx_control_list_value_portfolios_portfolio (portfolio_id)`. No audit columns (D-CLG-12) |

- Collation `utf8mb4_unicode_ci` stays declared, so both unique indexes are case-insensitive (archive P-4).
- **Seed:** same explicit ids (categories 1–2, lists 1–6, values 1–23), same `AUTO_INCREMENT` resets, `INSERT … SELECT … FROM DUAL WHERE NOT EXISTS`. The values seed still joins `control_lists` by id and key, so it **can** silently insert nothing if a list is missing — the seed test (§10) asserts the seeded ids, which catches that.
- **Migration order:** `…000` → `…001` → `…002` → `…003`. **`down` order:** `…003` (link table) → `…002` → `…001` → `…000`; each drops only its own table.
- **Soft-deleted portfolios (J-9):** portfolios are soft-deleted (`portfolios.service.ts:139-141`), so the RESTRICT FK never fires and links to an inactive portfolio stay in the table. Rules (D-CLG-14): reads return only **active** portfolio ids in `appliesTo`, plus `appliesToAll = (no link rows at all)`; a value whose only links point to inactive portfolios is therefore `appliesToAll = false, appliesTo = []` (offered nowhere, shown as *No active portfolio*). Writes accept only active portfolio ids (400 otherwise); an update **with** `portfolioIds` replaces all links (inactive ones dropped); an update **without** it keeps them.

### 3.1 Database procedure (R-CLG-006) — runs before T-01's integration gate (J-5)

The migrations change content under the same names, so any DB that ran the old versions must revert them. Two databases are involved:

| DB | Env | Commands (from `server/researchindicators`) |
| --- | --- | --- |
| **TEST** — the one the integration suites use | `ARI_TEST_MYSQL_*` (`orm.test.config.ts`) | `npm run migration:test:revert` until `1790900000000-createControlListCategories` has been reverted (run `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.test.config.ts` after each, ANSI codes stripped — K-014), then `npm run migration:test:execute` |
| **Requester's app DB** (`ARI_MYSQL_*`) | `orm.config.ts` | **Only if `ARI_MYSQL_HOST` is local.** If it points at the shared Dev DB, stop: Dev never ran these migrations (proposal fact 3.7) and will get them through the pipeline after merge (root `CLAUDE.md` §4.3). Local: `npm run migration:revert` until `…000` is reverted, then `npm run migration:dev:execute` (`src` config — **not** `migration:execute`, which runs the stale `dist` build) |

**Requester's setup (checked 2026-10-13 in `server/researchindicators/.env`, host/name only):** `ARI_MYSQL_*` and `ARI_TEST_MYSQL_*` both point at the same local DB (`127.0.0.1`, `stardb`), so the procedure runs **once** and covers both rows of the table above; the shared Dev DB is not involved.

Steps: (1) export any hand-made control-list rows to keep; (2) revert as above — the number of reverts depends on whether `…003` already ran, so revert **by name, not by count**; (3) execute; (4) check: `SHOW COLUMNS FROM control_list_categories LIKE 'portfolio_id'` and the same for `control_lists` → empty; `SHOW TABLES LIKE 'control_list_value_portfolios'` → 1 row; `SHOW INDEX … WHERE Key_name IN ('uq_control_list_categories_name','uq_control_lists_key')` → `Non_unique = 0`; seeded ids present (`id <= 2`, `id <= 6`, `id <= 23`).

---

## 4. API surface

Base `/api/control-lists`. Guards, interceptors and Swagger tags unchanged; **roles change per §8** (S-1).

| # | Method + path | Before | After |
| --- | --- | --- | --- |
| A1 | `GET /categories` | `?portfolioId=` required | no parameters; `portfolioId` → 400 |
| A2 | `GET /portfolios/summary` | per-portfolio counts | **removed** → 404 |
| A3 | `POST /categories` | body had `portfolioId` | `{ name, description? }`; `portfolioId` → 400; duplicate name (module-wide) → 409 |
| A4 | `PATCH /categories/:id` | — | `portfolioId` → 400; duplicate name module-wide → 409 |
| A5 | `DELETE /categories/:id` | — | unchanged (no query DTO: stray params ignored — J-12) |
| A6 | `POST /lists` | portfolio copied from category | `portfolioId` → 400; duplicate key module-wide → 409 |
| A7 | `PATCH /lists/:id` | category of another portfolio → 400 | any category allowed; `listKey` or `portfolioId` → 400 |
| A8 | `DELETE /lists/:id` | — | unchanged |
| A9 | `GET /lists/:id/values` | — | each value gains `appliesTo: number[]` (active portfolio ids) and `appliesToAll: boolean` |
| A10 | `POST /lists/:id/values` | — | optional `portfolioIds: number[]` (omitted or `[]` = all); unknown/inactive/duplicate id or `null` → 400 naming `portfolioIds`; response includes `appliesTo`, `appliesToAll` |
| A11 | `PATCH /values/:id` | — | optional `portfolioIds`: omitted = unchanged, `[]` = all, list = replace; same 400 rules; response includes `appliesTo`, `appliesToAll` |
| A12 | `DELETE /values/:id` | — | unchanged (links cascade) |
| A13 | `GET /by-key/:listKey/values` | `?portfolioId=` required (selected the list) `&activeOnly=` | `?portfolioId=` **optional filter**: values with no links + values linked to that portfolio; without it, all values; each value carries `appliesTo`/`appliesToAll`; unknown key → 404; unknown or inactive portfolio → 404 |

Link ids are coerced with `Number()` before they leave the service (MySQL BIGINT may arrive as strings — archive lookup-service note). No consumer exists yet, so the contract change has no caller to migrate besides the page.

---

## 5. Workflows & business rules (delta to archived §5)

1. **Portfolio integrity (archived rule 1) — removed** for categories and lists.
2. **Uniqueness (rule 2)** — same pre-check + errno 1062 → `ConflictException`, now on `name` and `list_key` module-wide.
3. **Membership (rule 10)** — `assertValueInList(valueId, listKey)`: 404 unknown value or list; 400 naming the expected key when `list.list_key ≠ listKey`. Ignores `is_active` and *Applies to* (D-CLG-10). Still a singleton.
4. **Applies to — writes (R-CLG-009, J-2).** A10/A11 run `dataSource.transaction(manager => …)`: validate `portfolioIds` (active, unique) → save the value through `manager.getRepository(ControlListValue)` → if `portfolioIds` was sent, delete the value's link rows and insert the new ones through `manager.getRepository(ControlListValuePortfolio)`. The errno-1062 mapping wraps the whole transaction call, so a duplicate code/value still maps to the named 409 and nothing is committed. A failure on any step rolls back the value change too. **This retires archived rule 8 ("no multi-row transaction is needed") for value writes only**; other writes still touch one row.
5. **Applies to — reads.** A9 loads links for the listed values in one query and keeps only active portfolios. A13 with `portfolioId` is one `QueryBuilder` query: `value.list_id = :list AND (<activeOnly clause>) AND (NOT EXISTS link OR EXISTS link with portfolio_id = :pid)` — the portfolio condition built with `Brackets`, so the `OR` can never widen the `AND` (KZ-017 precedent).
6. Rules 3–9 of the archive otherwise unchanged (immutable key, code proposal, in-use, delete rules, audit, side effects).

---

## 6. Frontend — STAR client

- **Header:** title, description ("Alliance-wide vocabularies… read by its key"), **+ New category**. No selector.
- **Load:** on init, A1 (categories) and `GET_Portfolios` (active portfolios, for *Applies to*) in parallel. If the portfolios call fails, the page still works: the *Applies to* column shows ids, the filter and the modal field are disabled with an inline note (S-4). Error/empty states otherwise as before.
- **List header:** `Key: <key>`.
- **Values table:** column **Applies to** — *All* (`appliesToAll`), portfolio short names, or *No active portfolio*; filter *Show values for: All portfolios / <portfolio>* applying the A13 rule client-side; export includes the column.
- **Value modal:** **Applies to** multi-select rendered as a checkbox group of active portfolios; none ticked = all; hint explains that records already using the value stay valid.
- **List modal:** key hint "Unique across all lists… consumers read the list by this key"; a 409 on `listKey` shows inline.
- Mockup artboard 1 matches.

---

## 7. Integration impact
None outside the module. `organizational-structure` (no code yet) will call `assertValueInList(valueId, 'org.level')`; its design is updated after this spec ships (§11).

## 8. Security & authorization
**Changed (R-CLG-008):** `@Roles(SYSTEM_ADMIN, TECHNICAL_SUPPORT)` on A1, A3–A12 — the same pair as `app-config.controller.ts:156`; `SYSTEM_ADMIN` still bypasses in `RolesGuard`. Center Admin is no longer granted (supersedes D-CTL-7 and family F-1 for this module). A13 stays open to authenticated users. Client: `appConfigurationGuard` (`canAccessAppConfiguration`, `roles.service.ts:44-48`: role 1 or 7).

## 9. Observability
Log lines drop the portfolio field from category/list writes; value writes log the new `portfolioIds` set.

## 10. Testing strategy

| Layer | Tests | Fails when (falsifier) |
| --- | --- | --- |
| Server unit — validation | Real `ValidationPipe({whitelist, forbidNonWhitelisted, transform})`: A1 with **no** params → passes (200 path); `portfolioId` → 400 on A1 query, A3/A4/A6/A7 bodies; `portfolioIds: null`, `[1,1]`, `["a"]`, `[0]` → 400 on A10 **and** A11; `portfolioIds` omitted and `[]` accepted on both | `'portfolioIds'` missing from the `PickType` list; `@IsOptional` added to the create DTO (`null` passes on A10); the update DTO without its own `@ValidateIf` (`null` passes on A11); an empty A1 DTO that rejects everything |
| Server unit — service | *Applies to* create/replace/clear/omitted-unchanged; inactive or unknown id → **400** (not 404); A13 filter rule incl. `activeOnly`; duplicate name/key → 409 via pre-check **and**, with the pre-check stubbed to pass, via a simulated errno 1062; lookup pass / other list 400 / unknown 404 | Reusing the old 404 check; mapping only on the pre-check path |
| Server unit — controller | Envelope per handler; roles metadata `[SYSTEM_ADMIN, TECHNICAL_SUPPORT]` on A1, A3–A12, absent on A13; route inventory has no A2 | A handler keeps `CENTER_ADMIN` |
| Global exceptions | Envelope of the new 400s and 409 through real `GlobalExceptions` | — |
| Integration (TEST DB, after §3.1) | **Filter on real SQL:** *Value for one portfolio only* fixture — `portfolioId=1`, `=2`, none, and `activeOnly` combinations; **atomicity:** force the link insert to fail (FK to a non-existent portfolio id inserted through the transaction with validation bypassed) → the value row is unchanged; deleting a restricted value removes its links; **soft-deleted portfolio:** set a linked portfolio `is_active = 0` → A9 omits it, A13 for it → 404 | Unbracketed `OR`; non-transactional writes |
| Integration — uniqueness | Raw SQL duplicate `INSERT` of a category name and a list key → errno 1062 (`ER_DUP_ENTRY`); `SHOW INDEX` → `Non_unique = 0`. K-004: proven red once by running the raw insert against a scratch copy without the index | Unique index missing (an HTTP duplicate only proves the service pre-check) |
| Integration — seed (J-1) | `control-lists-seed.integration-spec.ts`: on the migrated TEST schema, import the `seed…` functions from `src/db/seeds/control-lists.seed.ts` and call them again → 0 affected rows; ids 1–2, 1–6, 1–23 exist with their expected keys/codes; counts asserted **on seeded id ranges**. The other control-list suites create their own rows (ids above the seeded ranges) and never update or delete seeded rows — stated in each suite header, checked in review | A seed that inserts duplicates on re-run; a seed whose join silently matches nothing |
| Migration loading (K-006) | After the migration/seed refactor: `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.test.config.ts` lists the four control-list migrations by name with no loader error (ANSI stripped, K-014) | An exported non-class function left in `src/db/migrations/**` (TypeORM treats every exported function as a migration and rejects its name) |
| Client unit | No selector; no `P<n> ·` text; A2 never called; portfolios requested once; *Applies to* column for all / restricted / no-active cases; filter rule equals A13 rule on a shared fixture; modal sends `portfolioIds` (`[]` when none ticked); portfolios-call failure disables the field; 409 on key inline | — |
| Client unit — routing/roles | `app.routes.spec.ts`: new path + `appConfigurationGuard`, old path absent; guard with a real `RolesService`: `[1]`, `[7]` admitted, `[9]` (focus 1) denied; sidebar: item only under *System admin*, other items' order unchanged in both groups and in the collapsed flyout; nested rendering still covered with a synthetic group | Old route left in place; boolean-mock guard tests |
| Leftover sweep | `grep -rniE "portfolio"` over the server module, migrations `…000-…002`, integration specs, client page folder, `control-lists.interface.ts`, `api.service.ts` control-list methods → only *Applies to* / filter hits; `grep -rn "center-admin/control-lists"` over client `src` → 0 | — |
| Build | `npm run build` (server), `ng build` (client) | — |
| Manual (HITL, T-03) | Center Admin user: no menu item, route redirects; Technical Support user: full access; page against artboard 1 | — |

**What these gates cannot reach (KZ-017):** the integration harness does not mount `GlobalExceptions` (the dedicated unit spec covers the envelope); no test exercises the shared Dev DB (by design); rendered layout of the new column is checked only at the HITL pause.

## 11. Rollout
- Branch `institutional-kpis`, unpushed. Nothing deployed.
- §3.1 on the TEST DB before T-01's integration gate; on the requester's app DB only if it is local.
- After this spec passes: update `organizational-structure` (Q-1 closed, D-ORG-3 dropped, R-ORG-011 and P-2 simplified), then resume it at its design gate.
- Backout: `git revert` of this spec's commits + §3.1 again.

## 12. Design decisions log

| # | Date | Decision | Rationale | Rejected |
| --- | --- | --- | --- | --- |
| D-CLG-1 | 2026-10-13 | Drop `portfolio_id` from categories and lists entirely (not nullable) | Requester: every list read by key. Portfolio applicability moved to values (D-CLG-9) | Nullable tag; optional list scope (proposal §10) |
| D-CLG-2 | 2026-10-13 | Rewrite the three unmerged migrations; add `…003` for the link table | Requester Q-1; never shared or deployed. One table per migration | ALTER migrations |
| D-CLG-3 | 2026-10-13 | Keep an empty query DTO on A1 so a stale `portfolioId` returns 400 | Without a DTO an unknown query param is silently ignored | Deleting the DTO |
| D-CLG-4 | 2026-10-13 | Remove A2 (→ 404) | Its only purpose was the *(not configured)* label | Repurposing it |
| D-CLG-5 | 2026-10-13 | Delete the isolation integration suite | Its subject no longer exists (KZ-017) | Rewriting it as a no-op |
| D-CLG-6 | 2026-10-13 | Supersedes D-CTL-2, D-CTL-7, D-CTL-8, D-CTL-10, D-CTL-13; amends D-CTL-15 (no portfolio) and archived §5 rule 8 (transactions, value writes only) | Requester decisions 2026-10-13 | — |
| D-CLG-7 | 2026-10-13 | Menu item under *System admin*; route under `administration/configuration/` with `appConfigurationGuard`; page folder moves with it | Lists are system-wide settings; reusing the group's guard keeps menu visibility and route access identical | Keeping it under Center admin |
| D-CLG-8 | 2026-10-13 | Access = Admin + Technical Support (Center Admin removed) | Requester choice among three options | Admin only; Center Admin + Admin |
| D-CLG-9 | 2026-10-13 | Portfolio applicability lives on **values** (many-to-many, no links = all), with an optional filter on the by-key read | Requester: lists global and read by key, but which values apply to a portfolio must be knowable. Many-to-many lets one value serve several periods | Portfolio on the list; one portfolio per value |
| D-CLG-10 | 2026-10-13 | Restricting a value never invalidates stored records; the membership check ignores portfolios | Same precedent as deactivation (R-CTL-004) | Rejecting saves of restricted values |
| D-CLG-11 | 2026-10-13 | Seed SQL lives in `src/db/seeds/control-lists.seed.ts`; migrations import and call it; the seed suite calls it again. **Migration files export only their class** | Proves idempotency without re-running a migration (J-1). The seeds must sit outside `migrations/**/*{.ts,.js}` (`orm.config.ts:55`): TypeORM's loader takes every exported function there as a migration and rejects names without a 13-digit timestamp (JD round 2, A2-1/B2-1) | Exported functions inside migration files (breaks every `migration:*` command); `static` methods (harder to import from tests); asserting idempotency by reasoning only |
| D-CLG-12 | 2026-10-13 | The link entity does **not** extend `AuditableEntity`; every link change goes through a value write, which sets the value's `updated_by`/`updated_at` (a links-only A11 still saves the value row inside the transaction to stamp the audit fields) | A pure join table with audit columns duplicates the parent's audit; root `CLAUDE.md` §4.1 is met through the parent (S-2) | Audited link rows |
| D-CLG-13 | 2026-10-13 | Read portfolios directly (entity repository / query, active only) instead of importing `PortfoliosModule` | Only an existence/active check is needed; `PortfoliosService.findOne` throws 404, which is wrong for writes (S-5) | Reusing `PortfoliosService` |
| D-CLG-14 | 2026-10-13 | Links to soft-deleted portfolios are kept but hidden on read; `appliesToAll` distinguishes "no links" from "no active links"; writes accept active ids only | Portfolios are soft-deleted, so the FK cannot protect the link; hiding keeps the UI consistent with `GET_Portfolios` (J-9) | Pruning links on portfolio delete (touches the portfolios module) |

### 12.1 Reversion challenge (Step 2.3)

Triggered: D-CLG-1, 4, 5, 6 remove delivered behavior. Question asked to one reviewer (Explore scout, 2026-10-13): *"What does removing the portfolio from Control Lists break?"*

| Finding | Verdict | Where it is handled |
| --- | --- | --- |
| All 5 integration suites write `portfolio_id` in raw SQL or send `portfolioId`; the isolation suite also inserts the same key in two portfolios | Real; in scope | §2.1 (isolation deleted, the other four rewritten) |
| A3 body and the client `ControlListCategoryCreatePayload` still carry `portfolioId` | Real; in scope | §2.1, §4 |
| Client `ControlList.portfolioId`, `ControlListCategory.portfolioId`, summary type and doc comments | Real; in scope | §2.1 client |
| Editing the migrations breaks a DB that already ran them | Real; accepted (Q-1) | §3.1 |
| Existing duplicates across portfolios would block the new unique indexes | Does not apply: the revert drops the tables | §3.1 |
| Portfolio delete relying on the RESTRICT FK | No breakage: soft delete (`portfolios.service.ts:139-141`) | — (but see D-CLG-14 for the new link table) |
| `PortfoliosModule` stranded | No: still imported by `entities.module.ts:209` and **four** other modules (clarisa-levers, impact-outcomes, results, strategic-objectives) | — |
| Kaizen consumer-guide text (`docs/specs/kaizen/institutional-performance--control-lists.md:106,136`) | Real | §2.1 |
| `organizational-structure/design.md:87,194,326,347` | Real; planned | §11 |
| Zero findings | — | `assertValueInList` callers, summary callers, by-key client callers, cypress/e2e, `/admin` SSR, swagger tests, PRD/TRD/UX docs, `ControlListCacheService` |

## 13. Premise Ledger

| # | Claim | Citation (as run) | If false |
| --- | --- | --- | --- |
| P-1 | Portfolio references in scope: server module 17 files, 5 integration specs, 3 migrations; client page 3 files + interface | `grep -rnic "portfolio"` over those paths, 2026-10-13 | Scope understated |
| P-2 | The service injects `PortfoliosService` (`:49`), checks existence with a 404 (`:541-546`) and builds summaries (`:87`) | `grep -n Portfolio control-lists.service.ts`; judge B | — |
| P-3 | No portfolio module code references control lists | `grep -rn ControlList src/domain/entities/portfolios` → 0 | — |
| P-4 | Client API: `GET_ControlListCategories(portfolioId)` `:247`, `GET_ControlListPortfolioSummaries` `:252` | `grep -n ControlList api.service.ts` | — |
| P-5 | Migrations unpushed and unmerged | `git status -sb` → `ahead 78`; `git branch -r --contains 847cda8d` → none | D-CLG-2 not allowed — High |
| P-6 | `migration:execute` runs `dist`; `migration:dev:execute` and `migration:test:*` run `src` | `package.json:34-40` | §3.1 commands wrong |
| P-7 | `UpdateControlListValueDto` is a `PickType` over an explicit field list | `update-control-list-value.dto.ts:12-19` (both judges) | DTO row unnecessary |
| P-8 | Repositories are bound to their own entity manager; the service has no transaction today | `control-list-value.repository.ts:6-9`; judges A and B | §5.4 mechanism differs |
| P-9 | Migrations are loaded by the glob `migrations/**/*{.ts,.js}`; every exported function there is treated as a migration | `orm.config.ts:55`; TypeORM `DirectoryExportedClassesLoader.js:18-21`, `MigrationExecutor.js:415-419` (both JD round-2 judges) | D-CLG-11 placement unnecessary — Low |
| P-10 | Nest `ValidationPipe` defaults `forbidUnknownValues` to `false` | `node_modules/@nestjs/common/pipes/validation.pipe.js:25` (v10.4.19), read 2026-10-13 | Empty A1 DTO would reject every request — High; pinned by the positive test |

## 14. Budget (tripwire for `/akili-execute`)

| Measure | Estimate |
| --- | --- |
| Tasks | 4 (vertical slices, as D-CTL-16): **T-00 HITL** — revert the old migrations on the local DB **before** the files are rewritten (§3.1 steps 1–2); **T-01** slice 1 — global lists, key reads, menu and roles (server + screen; reruns the migrations, §3.1 steps 3–4); **T-02** slice 2 — values applicable per portfolio (server + screen, migration `…003`); **T-03 HITL** — role/menu check with a Center Admin and a Technical Support user + mockup |
| LOC changed (incl. tests) | ~2,950 changed lines (≈ −900 / +2,050): list-level portfolio removal, menu/role move (~200), *Applies to* (~900), seed module + seed suite + loader check (~200), transaction + atomicity test (~150) |
| Review rounds | ≤ 2 per task; ≤ 6 total |

Matches **Standard**. One PR per slice (T-01, T-02), each with server + client because the API contract and the page change in lock-step; both slices may also ship as one PR.

## 15. Open questions
None.

## 16. References
- `./proposal.md`, `./requirements.md`, `./judgment.md`
- Archived Control Lists design §3–§5, §12
- `../../institutional-performance/family.md` F-1, F-2, F-3 (amended 2026-10-13)
