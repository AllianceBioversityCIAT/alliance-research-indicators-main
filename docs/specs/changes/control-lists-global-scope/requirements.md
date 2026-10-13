# Requirements — Changes / Control Lists: global lists read by key

- **Module:** control-lists (institutional-performance) — server + client
- **Spec id:** 2026-10-control-lists-global-scope
- **Status:** approved (2026-10-13)
- **Depth:** **Standard** — changes an existing module's data model, API contract and page; rewrites three unmerged migrations. No new module, no integration, no deployed data
- **Owner:** Hector F. Tobón (requester) · PISA4 / Strategy Refresh
- **Extends / modifies:** `institutional-performance/control-lists` — archived at [`../../archive/2026-10-08-institutional-performance--control-lists/`](../../archive/2026-10-08-institutional-performance--control-lists/). Its requirements are cited as `R-CTL-nnn`; the archive is not edited
- **Family rules:** `../../institutional-performance/family.md` F-4 … F-9 apply; **F-1, F-2 and F-3 as amended 2026-10-13** (control lists are global, live under *System admin* and are used by the System admin roles)
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — Center Admin tools
- **Linked tickets:** PARI-258; epic AC-1773 — ticket for this change `<TO CONFIRM>`
- **Proposal:** [`proposal.md`](proposal.md) — approved 2026-10-13 (Q-1 rewrite migrations, Q-2 accepted); later requester decisions (menu, roles, value applicability) are folded into its body and revision log (d)–(f)
- **Approval Mode:** `gated`
- **Last updated:** 2026-10-13 (requester: values can be restricted to portfolios — R-CLG-009; menu moved to *System admin*, access = System admin roles — R-CLG-008)

---

## 1. Executive summary

Control lists stop belonging to a portfolio. **Every category and list is global, and every list is read by its key alone.** Keys and category names become unique across the module. The page loses its portfolio selector. The three Control Lists migrations are rewritten, so categories and lists never had a portfolio; a fourth migration adds the value ↔ portfolio link table. **Portfolios now live on values:** a value applies to all portfolios unless restricted, and the by-key read can filter by portfolio (R-CLG-009). The page moves to the **System admin** menu and is used by the **System admin roles** (Admin and Technical Support) instead of Center Admin (R-CLG-008). Value codes, permanent ids (1–23), ordering, in-use protection and the table standard do not change.

**Portfolios live on the values, not on the lists** (requester, 2026-10-13): a value applies to every portfolio unless an admin restricts it to one or more portfolios, and a consumer can ask for the values that apply to a given portfolio (R-CLG-009). How a screen uses that filter is decided in the screen's own spec.

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Key** | A list's immutable identifier (e.g. `org.level`). After this change: unique across all lists, and the only thing a consumer needs to read a list |
| **Reference** | What the UI shows to identify a list. Before: `P<id> · <key>`. After: the key alone |
| **Global** | Not tied to any portfolio. After this change every category and list is global |
| **Applies to** | The portfolios a value applies to. Empty = all portfolios. A value restricted to P2 is offered only for P2 when a consumer filters by portfolio |
| **Consumer** | A module that reads a list by key and stores value ids (first: `organizational-structure`) |
| **Admin** | For this module: Admin (role 1) or Technical Support (role 7) — R-CLG-008 (family F-1 exception) |

## 3. System context & scope

| # | Current behavior | Evidence |
| --- | --- | --- |
| C-1 | Categories and lists carry `portfolio_id NOT NULL` with an FK to `portfolios`; uniqueness is `(portfolio_id, name)` and `(portfolio_id, list_key)`. | `server/…/db/migrations/1790900000000-createControlListCategories.ts:31,36,42`; `1790900000001-createControlLists.ts:34,42,48` |
| C-2 | Admin reads and writes take a `portfolioId`; A2 returns per-portfolio summaries that drive *(not configured)*. | archived design §4 (A1–A13), D-CTL-10 |
| C-3 | The consumer read and the membership check take a portfolio. | archived design §4 A13, §5 rule 10; `control-list-value-lookup.service.ts:39-78` |
| C-4 | The page has a portfolio selector and shows `P<id> · <key>`. | archived R-CTL-003, R-CTL-008 |
| C-5 | The seed resolves Portfolio 2 by years and inserts 2 categories, 6 lists, 23 values with fixed ids. | archived design §3 *Seed*; R-CTL-010 |
| C-6 | The three migrations were never pushed, merged or run outside the requester's local DB. | proposal fact 3.7 |

**Affected surface (what renders on the route — KZ-002):** Control Lists page header (selector), category › list navigator, list header (reference), category/list/value modal, blocked-delete dialog, shared `DataTable` (unchanged, used by the values table), **the shared sidebar** (item moves from *Center admin › Portfolio Management* to *System admin*), the route and its guard.

**Not changing:** values CRUD and code proposal (R-CTL-004), in-use protection and registry (R-CTL-005), table standard (R-CTL-009), any table outside the module. **Roles (R-CTL-007) do change** — R-CLG-008.

## 4. Stakeholders / personas

| Persona | Role here |
| --- | --- |
| Admin / Technical Support | Maintain lists without choosing a portfolio; set which portfolios a value applies to |
| Center Admin | Loses access to this page (R-CLG-008); still benefits as a form user through the consumer read |
| Consuming modules | Read by key; `organizational-structure` is the first (paused until this is done) |
| Requester | Approves the seeded result and the mockup update |

---

## 5. Functional requirements

### R-CLG-001 — Control lists are global (modifies R-CTL-001)

- **As an** Admin **I want** lists that apply to the whole Alliance **so that** each vocabulary is defined once.

**Details**
- Before: every read and write was filtered by a portfolio. After: no category or list belongs to a portfolio. The only portfolio data left in the module is a value's optional **Applies to** set (R-CLG-009).
- A request that still sends `portfolioId` to the categories read or to a category/list create or update (A1 query; A3, A4, A6, A7 bodies) fails with `400`. Deletes and reads by id (A5, A8, A9) take no query DTO, so a stray parameter there is ignored. The only portfolio inputs accepted are a value's `portfolioIds` (A10, A11) and the consumer filter on the by-key read (A13).

#### Scenario: One set of lists for everyone
- GIVEN the seeded categories and lists exist
- WHEN an Admin reads the categories
- THEN all categories with all their lists are returned (`200`)
- BUT it must NOT require or accept a portfolio

#### Scenario: Stale caller
- GIVEN a client still sends `?portfolioId=2` to the categories read, or `portfolioId` in a category create body
- WHEN the request arrives
- THEN it fails with `400`
- AND IT MUST NOT create or change any row

**Acceptance criteria**
- [ ] AC.1 — Categories and lists have no `portfolio_id` column, FK or index.
- [ ] AC.2 — `portfolioId` on A1, A3, A4, A6 or A7 → `400`.

### R-CLG-002 — Category names unique across the module (modifies R-CTL-002)

**Details**
- Before: unique per portfolio. After: a category name (1–150 chars, case-insensitive) is unique across all categories. Every other R-CTL-002 rule holds (delete only when empty, `409` naming the lists).

#### Scenario: Duplicate name in any letter case
- GIVEN category *Key Performance Indicators (KPIs)* exists
- WHEN an Admin creates *key performance indicators (kpis)*
- THEN the request fails with `409` naming `name`
- AND IT MUST be enforced by a database unique index, not only by the service

**Acceptance criteria**
- [ ] AC.1 — Duplicate name (any case) → `409`; a concurrent duplicate insert is caught by the DB index and still returns `409`.

### R-CLG-003 — List keys unique across the module; the key is the reference (modifies R-CTL-003)

**Details**
- Before: a key was unique per portfolio and could repeat across portfolios; the UI showed `P<id> · <key>`. After: a key is unique across all lists, and the UI shows the key alone wherever a list is identified.
- Unchanged: key pattern `^[a-z0-9_.]{2,100}$`, immutable after creation (`400` on update), any list deletable once empty (CR-2), *Used by*, moving a list between categories (now any category).
- **Removed:** the scenario *Same key in two portfolios*.

#### Scenario: Duplicate key
- GIVEN list `kpi.direction` exists
- WHEN an Admin creates a list with key `kpi.direction`
- THEN the request fails with `409` naming `listKey`
- BUT it must NOT create the list
- AND IT MUST be enforced by a database unique index

#### Scenario: Reference shown
- GIVEN list `org.level`
- WHEN the Admin selects it
- THEN the list header shows `org.level`
- BUT it must NOT show a `P<id> ·` prefix anywhere on the page

#### Scenario: Move to any category
- GIVEN categories *KPIs* and *Organizational structure*
- WHEN an Admin moves `kpi.type` to *Organizational structure*
- THEN it is moved (`200`)

**Acceptance criteria**
- [ ] AC.1 — Duplicate key → `409`; key update → `400` (unchanged).
- [ ] AC.2 — No `P<id> ·` text remains in the page.

### R-CLG-004 — Consumer contract by key only (modifies R-CTL-006)

- **As a** STAR module **I want** to read and validate a list by its key **so that** I do not need a portfolio I may not have.

**Details**
- Consumer read: `activeOnly` (default true) and the optional `portfolioId` filter (R-CLG-009) are the only parameters besides the key. Ordering unchanged (display order, then natural code). Unknown key → `404`.
- Membership check: takes a value id and a key. It returns the value when it belongs to that list, fails with `400` naming the expected key when it belongs to another list, and fails with `404` for an unknown id. It still does not check *active* (R-CTL-004 *Deactivate*).
- Consumers keep storing only the value id with a plain FK (D-CTL-15 unchanged).

#### Scenario: Read by key
- GIVEN `org.level` holds L1…L4 with display order 1…4
- WHEN a consumer reads `org.level`
- THEN L1, L2, L3, L4 are returned in that order (`200`)
- AND IT MUST NOT need a portfolio

#### Scenario: Value from another list
- GIVEN value `DIR-01` belongs to `kpi.direction`
- WHEN a consumer validates it against `kpi.unit_of_measure`
- THEN the check fails with `400` naming `kpi.unit_of_measure`
- BUT it must NOT pass because both lists were once in the same portfolio

**Acceptance criteria**
- [ ] AC.1 — Consumer read: `200` ordered values; unknown key `404`; the optional `portfolioId` filter follows R-CLG-009.
- [ ] AC.2 — Membership check: pass / `400` other list / `404` unknown id.

### R-CLG-005 — Page without a portfolio (modifies R-CTL-008)

**Details**
- Before: header with a portfolio selector, *(not configured)* label, empty state per portfolio. After: the page loads all categories directly; there is no selector and no *(not configured)*.
- Unchanged: navigator, list header actions (*Edit list*, *Delete list*), modal with **Cancel** / **Save**, confirm dialog, and the four UI states: loading (progress bar), empty (no categories → *+ New category*; no lists; no values), error (inline, retry), success (toast).
- Menu placement and access: R-CLG-008.

#### Scenario: Opening the page
- GIVEN an Admin
- WHEN they open Control Lists
- THEN the categories and lists load without choosing anything
- BUT it must NOT show a portfolio selector or *(not configured)*

#### Scenario: Empty module
- GIVEN every category was deleted
- WHEN the page opens
- THEN it shows the empty state with *+ New category*

**Acceptance criteria**
- [ ] AC.1 — Each of the four UI states still renders.
- [ ] AC.2 — The page has no portfolio selector; portfolios are loaded only to fill the value's *Applies to* field (R-CLG-009).

### R-CLG-006 — Rewritten migrations and seed (modifies R-CTL-010)

**Details**
- The three existing migrations are rewritten in place (proposal Q-1): same names and order, no portfolio column/FK/index, unique indexes on category name and list key, case-insensitive collation kept. A **fourth** migration (`…003`) creates the value ↔ portfolio link table (R-CLG-009).
- The seed inserts the same rows as today, with the same explicit ids, without looking up a portfolio: 2 categories (ids 1–2), 6 lists (ids 1–6), 23 values (ids 1–23, `org.level` = 20–23). It stays idempotent.
- `down` of each migration still drops only its own table; reverse order: link table → values → lists → categories.
- **Database procedure** (design §3.1): any DB that ran the old versions reverts them **by name** until the categories migration is reverted (not by a fixed count, since `…003` may or may not have run) and runs them again with the source config. It runs on the TEST DB before the server integration gate; on the requester's app DB only if it is local, never on the shared Dev DB. Hand-made local rows are lost unless exported first.

#### Scenario: Fresh run
- GIVEN a schema without the control-list tables
- WHEN the four migrations run
- THEN categories 1–2, lists 1–6 and values 1–23 exist with their seeded keys and codes, and the link table exists empty
- AND IT MUST leave no `portfolio_id` column in categories or lists

#### Scenario: Run twice
- GIVEN the migrations ran
- WHEN the seed statements run again against the migrated schema
- THEN no row is added (0 affected rows)

#### Scenario: Old local schema
- GIVEN a local DB that ran the old migrations
- WHEN the developer follows the documented revert-and-rerun step
- THEN the schema matches the fresh run
- BUT a DB that skips the revert keeps the old schema, which the task's schema check must detect

**Acceptance criteria**
- [ ] AC.1 — Seeded ids and keys as above after the procedure; a second run of the seed statements affects 0 rows. Checks are on the seeded id ranges, not on table totals (other rows may exist).
- [ ] AC.2 — `SHOW COLUMNS … LIKE 'portfolio_id'` returns nothing for categories and lists; the link table exists; both unique indexes exist with `Non_unique = 0`.

### R-CLG-007 — Removed behavior

- **Removed:** the portfolio-summaries endpoint (A2); the *(not configured)* label and default-portfolio logic (D-CTL-10); per-portfolio uniqueness (D-CTL-2); the cross-portfolio checks (D-CTL-13, R-CTL-001 *isolation*); the two-portfolio isolation integration suite.
- Any call to the removed endpoint returns `404`.
- No consumer exists yet, so no migration of consumer data is needed.

#### Scenario: Removed endpoint
- GIVEN the new build
- WHEN a client calls the portfolio-summaries endpoint
- THEN it gets `404`

**Acceptance criteria**
- [ ] AC.1 — The endpoint, its client method and its tests are gone; no other code references them.

### R-CLG-008 — Menu under System admin; access by System admin roles (modifies R-CTL-007, R-CTL-008)

- **As the** organization **we want** Control Lists next to the other system-wide settings **so that** the menu reflects that the lists no longer belong to a portfolio (requester, 2026-10-13).

**Details**
- Before: *Center admin › Portfolio Management › Control Lists*, used by Center Admin and System Admin. After: an item **Control Lists** in the **System admin** group, after *Prompt Manager*, used by the **System admin roles: Admin (role 1) and Technical Support (role 7)** — the same roles that see that group today. **Center Admin loses access** (requester decision, 2026-10-13).
- Client: the route moves under the System admin area and uses the System admin guard; the item is removed from the Portfolio Management group.
- Server: every admin read and write (A1, A3–A12) requires Admin or Technical Support. The consumer read (A13) stays open to any authenticated user, because forms used by other users read it.
- Existing items of both groups keep their order, labels and links.

#### Scenario: Menu placement
- GIVEN an Admin
- WHEN they expand *System admin*
- THEN *Control Lists* appears after *Prompt Manager*
- BUT it must NOT appear under *Center admin › Portfolio Management* any more
- AND IT MUST NOT change the order, label or link of any other item

#### Scenario: Technical Support allowed
- GIVEN a user with the Technical Support role
- WHEN they create a value
- THEN it succeeds (`201`)

#### Scenario: Center Admin denied
- GIVEN a user whose only admin role is Center Admin
- WHEN they open the Control Lists route or call any admin endpoint
- THEN the route redirects them away and the API returns `403`
- BUT it must NOT change any data

#### Scenario: Consumer read stays open
- GIVEN a Contributor
- WHEN a form reads `org.level` by key
- THEN it gets the values (`200`)

**Acceptance criteria**
- [ ] AC.1 — Admin and Technical Support → success on writes; Center Admin and Contributor → `403`.
- [ ] AC.2 — The item renders under *System admin* in the expanded and the collapsed sidebar, and nowhere else.
- [ ] AC.3 — The old route `/administration/center-admin/control-lists` no longer matches.

### R-CLG-009 — Values can be restricted to portfolios (new)

- **As an** Admin **I want** to say which portfolios a value applies to **so that** forms in each portfolio offer only the values that make sense there, while the list stays one list with one key (requester, 2026-10-13).

**Details**
- Each value has an **Applies to** set of portfolios. **Empty = applies to all portfolios** (the default, and the state of every seeded value).
- Admin: the value form gets an **Applies to** multi-select of portfolios, shown as a checkbox group (none ticked = *All portfolios*); the values table gets an **Applies to** column (*All* or the portfolio names) and a filter *Show values for: All / <portfolio>* that uses the same rule as the consumer read.
- Consumer read by key: with `portfolioId`, it returns the values that apply to all portfolios **plus** those restricted to that portfolio; without it, it returns every value, each with its *Applies to* set (`appliesTo`: active portfolio ids; `appliesToAll`: no restriction at all). `activeOnly` combines with it. An unknown or inactive portfolio → `404`.
- Writes accept only existing, active, non-repeated portfolio ids; anything else (including `null`) → `400` naming `portfolioIds`. On update, omitting `portfolioIds` keeps the current set, `[]` makes the value apply to all, a list replaces the set. Saving a value and its set is all-or-nothing.
- **Soft-deleted portfolios:** portfolios are deactivated, not deleted, so a value may still be linked to one. Such links are hidden on read; a value whose only links point to inactive portfolios is offered nowhere and shown as *No active portfolio* (it is not "all").
- Restricting a value does not touch records that already store it: like deactivation, it only changes what is **offered** for new selections. The membership check (R-CLG-004) does not look at portfolios.
- The in-use rule, codes, ordering and permanent ids are unchanged. Deleting a value removes its *Applies to* links with it.

#### Scenario: Value for one portfolio only
- GIVEN `kpi.direction` has *Increase* (all), *Decrease* (all) and *Maintain within range* restricted to Portfolio 2
- WHEN a consumer reads `kpi.direction` with `portfolioId=2`
- THEN all three values are returned
- WHEN it reads with `portfolioId=1`
- THEN only *Increase* and *Decrease* are returned
- BUT it must NOT return *Maintain within range* for Portfolio 1

#### Scenario: No filter
- GIVEN the same list
- WHEN a consumer reads `kpi.direction` without `portfolioId`
- THEN all three values are returned, each with its *Applies to* set (`[]` for all, `[2]` for the restricted one)

#### Scenario: Restricting a value already in use
- GIVEN *Maintain within range* is stored by records in Portfolio 1
- WHEN an Admin restricts it to Portfolio 2
- THEN the change is saved (`200`)
- AND IT MUST keep those records valid; the value is only no longer offered for Portfolio 1

#### Scenario: Unknown portfolio
- WHEN a write sends `portfolioIds: [99]` or a read sends `portfolioId=99` and portfolio 99 does not exist
- THEN the request fails with `404` (read) or `400` naming `portfolioIds` (write)

#### Scenario: Portfolio deactivated after linking
- GIVEN *Maintain within range* is restricted to Portfolio 2 only, and Portfolio 2 is then deactivated
- WHEN an Admin opens `kpi.direction`
- THEN the value shows *No active portfolio*
- AND IT MUST NOT be returned by a filtered read for any portfolio, nor shown as applying to all

#### Scenario: Partial save impossible
- GIVEN an update changes a value's name and its *Applies to* set
- WHEN storing the new set fails
- THEN the name change is not saved either

**Acceptance criteria**
- [ ] AC.1 — The filtered read returns *all-portfolio* values + values linked to the requested portfolio, and nothing else.
- [ ] AC.2 — The value form and table show and edit *Applies to*; empty means all.
- [ ] AC.3 — Seeded values apply to all portfolios.
- [ ] AC.4 — `null`, repeated, unknown or inactive ids → `400`; omitted keeps the set; `[]` clears it.
- [ ] AC.5 — A forced failure while storing the set leaves the value unchanged.

---

## 6. Non-functional requirements

| ID | Category | Target | How verified |
| --- | --- | --- | --- |
| NFR-CLG-001 | reliability | Key and category-name uniqueness enforced by DB unique indexes | migration review + integration duplicate insert |
| NFR-CLG-002 | regression | Unchanged requirements R-CTL-004, 005, 007, 009 keep passing | full server and client suites + integration suites |
| NFR-CLG-003 | dx | Swagger reflects the removed parameter and endpoint | code review |
| Inherited | — | Archived NFR-CTL-001…005 and root `CLAUDE.md` §4.1 | existing gates |

## 7. Data requirements

- `control_list_categories`: remove `portfolio_id` (column, FK, both indexes); add unique index on `name`.
- `control_lists`: remove `portfolio_id` (column, FK, unique and index); unique index on `list_key`.
- Categories, lists and values: rewritten in `1790900000000…002`.
- **New** `control_list_value_portfolios` (value id, portfolio id): primary key on the pair; FK to the value `ON DELETE CASCADE`; FK to `portfolios` `ON DELETE RESTRICT` (portfolios are soft-deleted, so it never fires through the app). Created by a new migration `1790900000003`.
- `control_list_values`: unchanged.
- No OpenSearch fields.

## 8. API surface delta

Base `/api/control-lists` (unversioned). Every portfolio parameter removed from A1, A3, A6, A7; A2 removed. A9–A11 gain the value's `portfolioIds`; A13 gains an optional `portfolioId` filter (R-CLG-009). Exact shapes in `design.md`.

## 9. Cross-system impact

None outside STAR. Inside STAR: `organizational-structure` design simplifies (its Q-1 / D-ORG-3 / R-ORG-011) once this ships; it has no code yet.

## 10. Defect classes and their gates

| Defect class | Gate |
| --- | --- |
| **Leftover portfolio reference** (code, DTO, test, client call, template text) — excluding the intended *Applies to* code | `grep -rniE "portfolio" ` over `src/domain/entities/control-lists`, `test/control-lists-*`, the three migrations and the client page + `api.service` control-list methods + `control-lists.interface.ts` → only intentional hits, each listed in the task. Scope declared (KZ-017): it cannot see other modules, which do not use control lists |
| **`portfolioId` still accepted on categories/lists** | Unit tests: query and body with `portfolioId` → `400` on A1, A3, A4, A6, A7 |
| **Portfolio filter wrong** (restricted value leaks to another portfolio, or all-portfolio values missing) | Unit + integration test with the *Value for one portfolio only* fixture; the filter is asserted on the SQL result from the DB, not on a mocked query builder (KZ-001, KZ-017) |
| **Applies-to links orphaned** | Integration test: delete a restricted value → its links are gone |
| **Uniqueness only in code** | Raw SQL duplicate `INSERT` of a key and of a category name → errno 1062; `SHOW INDEX` → `Non_unique = 0`; unit test with the pre-check stubbed to pass → errno 1062 mapped to `409`. An HTTP duplicate proves only the pre-check. K-004: gate shown red once against a copy without the index |
| **Seed ids or counts changed / seed not idempotent** | New seed suite: the exported seed functions are called again on the migrated TEST schema → 0 affected rows; seeded ids and keys asserted by id range |
| **Value and links saved partially** | Integration test forcing the link insert to fail → value row unchanged |
| **Soft-deleted portfolio shown as "all" or still filterable** | Integration test: deactivate a linked portfolio → A9 hides it, `appliesToAll = false`, A13 for it → `404` |
| **DB silently keeps old schema** (same migration names; or `migration:execute` running a stale `dist`) | Design §3.1 checks after revert-by-name and rerun with the source config: no `portfolio_id`, link table present, unique indexes present; `migration:show` read with ANSI codes stripped (K-014) |
| **Membership check wrong** | Unit tests: pass / other list / unknown id |
| **Regression in unchanged behavior** | Full server `npm test`, `test:integration` control-lists suites, full client `npm test` — compared with the archive baseline (3 known server failures) |
| **Compile errors hidden by the runner** | `npm run build` (server), `ng build` (client) |
| **Wrong roles** (Center Admin still allowed, Technical Support denied) | Controller unit test: roles metadata on A1, A3–A12 equals `[SYSTEM_ADMIN, TECHNICAL_SUPPORT]`, absent on A13; client guard test with a **real** `RolesService` for role lists `[1]`, `[7]`, `[9]` |
| **Old route still reachable** | `app.routes.spec.ts`: old path absent; `grep -rn "center-admin/control-lists"` over client `src` → 0 |
| **Menu regression** (item in both places, other items reordered) | `alliance-sidebar` spec: item only under *System admin*, existing items' order unchanged in both groups; collapsed flyout checked too |
| **Page still shows a selector or `P<n> ·`** | Client unit test on the rendered page; manual check at the HITL pause |
| **Mockup drift** | No automated check. Substitute: human side-by-side against artboard 1 (updated in this spec) at the HITL pause |

## 11. Assumptions, dependencies, risks

| Item | Note |
| --- | --- |
| Assumption | Only the requester's local DB ran the old migrations (requester, 2026-10-13) |
| Dependency | Delivered Control Lists code on `institutional-kpis` |
| Risk | A DB that does not revert keeps the old schema without error. Mitigation: R-CLG-006 schema check |
| Risk | Hand-made local rows lost on revert. Mitigation: export first (documented step) |
| Risk | A screen forgets to pass `portfolioId` and offers restricted values everywhere. Mitigation: each consumer spec states which portfolio it filters by; the unfiltered read returns *Applies to* so the gap is visible |

## 12. Open questions

None. Q-1 and Q-2 decided in the proposal.

## 13. Requirement ID index

| ID | Title | Modifies |
| --- | --- | --- |
| R-CLG-001 | Control lists are global | R-CTL-001 |
| R-CLG-002 | Category names unique across the module | R-CTL-002 |
| R-CLG-003 | List keys unique; the key is the reference | R-CTL-003 |
| R-CLG-004 | Consumer contract by key only | R-CTL-006 |
| R-CLG-005 | Page without a portfolio | R-CTL-008 |
| R-CLG-006 | Rewritten migrations and seed | R-CTL-010 |
| R-CLG-007 | Removed behavior | R-CTL-001, D-CTL-2, D-CTL-10, D-CTL-13 |
| R-CLG-009 | Values can be restricted to portfolios | new |
| R-CLG-008 | Menu under System admin; access by System admin roles | R-CTL-007, R-CTL-008, D-CTL-7, D-CTL-9 (placement) |
| NFR-CLG-001…003 | Reliability, regression, dx | — |

## 14. Sign-off

- [ ] Engineering lead — _TBD_
- [ ] Product owner — Hector F. Tobón
