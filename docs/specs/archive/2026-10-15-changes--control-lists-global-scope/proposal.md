# Proposal — Control Lists: global lists read by key, values applicable per portfolio

> **Answer first:** control lists stop belonging to a portfolio. Every category and list is global, and **every list is read by its key** (`org.level`, `kpi.direction`); the key becomes unique across the module. **Portfolios move to the values:** a value applies to all portfolios unless an admin restricts it to one or more, and a consumer can ask for the values that apply to a portfolio. The page moves to **System admin** and is used by Admin and Technical Support. The seeded data keeps its ids. Organizational Structure no longer needs its portfolio workaround (its Q-1 / D-ORG-3).

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/changes/control-lists-global-scope` |
| **Slug** | `control-lists-global-scope` — derived from the requester's description (2026-10-13) |
| **Type** | **Change** |
| **Approval Mode** | `gated` |
| **Status** | **approved** 2026-10-13 by the requester — Q-1: rewrite the unmerged migrations; Q-2: accepted; body updated with the later requester decisions (d)–(f) (see §15) |
| **Last updated** | 2026-10-13 |
| **Branch** | `institutional-kpis` (Control Lists is on this branch, 78 commits ahead of `origin`, not merged to `dev` or `main`) |
| **Changes** | Delivered spec `institutional-performance/control-lists` (archived: [`../../archive/2026-10-08-institutional-performance--control-lists/`](../../archive/2026-10-08-institutional-performance--control-lists/)). The archive is not edited; this spec records the delta |
| **Depends on** | `institutional-performance/control-lists` — `done` |
| **Blocks** | `institutional-performance/organizational-structure` — paused at design approval (commit `7dd94071`); its Q-1 / D-ORG-3 / R-ORG-011 are rewritten once this is done |
| **Parallel-safe** | no (same module, same tables, same page) |
| **Family** | Not a child of `institutional-performance/family.md` (closed set). It amends shared rules **F-1, F-2, F-3** of that family |
| **JPD / Jira** | PARI-258; Control Lists epic AC-1773 — a ticket for this change is `<TO CONFIRM>` |

## 2. Intent

Define each vocabulary once for the whole Alliance and read it by its key, while still knowing which values apply in each portfolio. Control Lists becomes a system-wide setting.

## 3. Problem / Current Behavior

| # | Fact | Evidence |
| --- | --- | --- |
| 3.1 | Categories and lists require a portfolio (`portfolio_id NOT NULL`, FK to `portfolios`). Uniqueness is per portfolio, so the same key may exist once per portfolio. | `server/…/db/migrations/1790900000000-createControlListCategories.ts:31,36,42`; `1790900000001-createControlLists.ts:34,42,48`; archived D-CTL-2 |
| 3.2 | Every admin read and the page itself are filtered by a selected portfolio; a portfolio with no categories shows *(not configured)*. | archived R-CTL-001, R-CTL-008; D-CTL-10 |
| 3.3 | The consumer read and the membership check need a portfolio: `GET /by-key/:listKey/values?portfolioId=` and `assertValueInList(valueId, portfolioId, listKey)`. | archived design §4 A13, §5 rule 10; `control-list-value-lookup.service.ts:39-78` |
| 3.4 | All 6 seeded lists (5 KPI lists + `org.level`) and both categories live in Portfolio 2. | `1790900000001-createControlLists.ts:94`; archived R-CTL-010 |
| 3.5 | Organizational Structure is global (decided 2026-10-08), so it had to add a portfolio-agnostic lookup (D-ORG-3) to read `org.level`. | `organizational-structure/design.md` D-ORG-3, P-2 |
| 3.6 | The requester wants every list read by its key, and to know which values apply depending on the portfolio. | requester, 2026-10-13 |
| 3.7 | The Control Lists migrations exist only on this branch and in local databases; they have not been deployed to Dev or Prod. | `git status -sb` → `ahead 78`; `git branch -r --contains 847cda8d` → none |
| 3.8 | The page sits under *Center admin › Portfolio Management* and is used by Center Admin and System Admin. | archived R-CTL-007, R-CTL-008 |

## 4. Proposed Outcome

| Given | When | Then |
| --- | --- | --- |
| An Admin or Technical Support user | opens *System admin › Control Lists* | all categories and lists are shown; there is no portfolio selector |
| A Center Admin | looks for Control Lists | it is not in their menu and the route and API deny them |
| An admin creates a list | with key `kpi.data_source` | it is created; its reference is just the key |
| A list `kpi.direction` exists | an admin creates another `kpi.direction` | rejected (`409`): keys are unique across the module |
| A value *Maintain within range* | an admin restricts it to Portfolio 2 | a read of `kpi.direction` for Portfolio 1 does not offer it; for Portfolio 2 it does; without a portfolio, all values come back with their *Applies to* set |
| A consumer validates a stored value | `assertValueInList(valueId, 'org.level')` | it passes for a value of that list, fails (`400`) for another list's value, and fails (`404`) for an unknown id |
| A request sends `portfolioId` to the categories read or a category/list write | — | rejected (`400`) |

## 5. Scope

| Aspect | Change |
| --- | --- |
| Categories | No portfolio; name unique (case-insensitive) across all categories |
| Lists | No portfolio; **key unique across all lists**; key still immutable |
| Values | Codes, ids, ordering and in-use protection unchanged; **new optional *Applies to* set of portfolios** (none = all) |
| Consumer contract | `GET /by-key/:listKey/values?activeOnly=&portfolioId=` (`portfolioId` optional filter); `assertValueInList(valueId, listKey)` |
| Admin API | Portfolio removed from categories and lists; portfolio-summaries endpoint (A2) removed; value writes accept `portfolioIds` |
| Page & menu | Selector and *(not configured)* removed; key shown alone; *Applies to* column, filter and form field; item under **System admin**; access Admin + Technical Support |
| Migrations | **The three existing migrations are rewritten in place** (Q-1) without `portfolio_id`; **one new migration** creates the value ↔ portfolio link table. Each DB that ran the old versions reverts them and runs them again |
| Tests | Isolation suite removed; key-uniqueness, seed, filter, transaction and role tests added |

## 6. Non-Goals
- Portfolio on categories or lists; overriding a list per portfolio.
- Copying lists; changing value codes, permanent ids, ordering or the in-use protection.
- Any change to tables outside this module.

## 7. Affected Users, Systems, And Specs
| Area | Impact |
| --- | --- |
| Server | `control-lists` module: entities (+1 link entity), service rules, DTOs, controller (A2 removed, roles changed), lookup service signature; three rewritten migrations + one new; unit and integration suites |
| Client | Control Lists page (moves to the System admin area), `api.service`, interfaces, sidebar, routes, specs |
| Specs | `organizational-structure`: Q-1 resolved, D-ORG-3 dropped, R-ORG-011 simplified, menu placement. `institutional-performance/family.md` F-1, F-2, F-3 amended. Future `institutional-indicators` reads KPI lists by key, filtered by portfolio |
| Users | Admin and Technical Support gain/keep access; **Center Admin loses access** (requester, 2026-10-13) |

## 8. Visual Reference
- **Source:** generated mockup (claude.ai Design canvas), artboard **1 · Control Lists (System admin, global)** — https://claude.ai/artifact/EPtLbFVhaEQb3Vgq7kuyRP (`../../institutional-performance/mockup/ControlledLists.dc.html`). Updated 2026-10-13: no selector, key alone, *Applies to* column/filter/field, sidebar with the item under *System admin* (all five artboards).

## 9. Requirement Delta Preview

**MODIFIED**
- **R-CTL-001** → global categories and lists; `portfolioId` rejected on category/list endpoints.
- **R-CTL-002** Categories: name unique across the module.
- **R-CTL-003** Lists: key unique across the module; the reference shown is the key.
- **R-CTL-006** Consumer read by key with an optional portfolio filter; `assertValueInList(valueId, listKey)`.
- **R-CTL-007** Roles: Admin + Technical Support (Center Admin removed).
- **R-CTL-008** Page without a portfolio selector; menu under *System admin*.
- **R-CTL-010** Seed outside any portfolio (same 2 categories, 6 lists, 23 values, same ids).

**ADDED**
- Value *Applies to* portfolios and the filtered read.
- A link-table migration.

**REMOVED**
- A2 *portfolio summaries*; D-CTL-10 *(not configured)*; D-CTL-2 "same key once per portfolio"; the two-portfolio isolation tests.

## 10. Approach Options

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Global categories and lists; portfolio applicability on values (many-to-many, none = all)** | One list per key; consumers filter by portfolio when they need it; a value can serve several periods | One link table and a filtered query |
| B. Portfolio on the list (optional scope) | Simple for whole-list differences | Same key cannot be shared; forces duplicate lists per period — first draft, superseded |
| C. Keep a nullable `portfolio_id` tag on lists, ignored by reads | No new table | A field nobody reads drifts; does not answer "which values apply" |

## 11. Recommended Approach

**Option A.** One key, one list, and the per-portfolio question answered at value level. **Migration strategy (Q-1):** rewrite the three unmerged migrations and add one for the link table.

## 12. Risks, Dependencies, And Open Questions

| Risk | Mitigation |
| --- | --- |
| A DB that ran the old migrations keeps the old schema (same names) | Revert by name, rerun with the source config, schema checks (design §3.1, K-014) |
| Reverting drops hand-made local rows | Export first (documented step) |
| A consumer forgets the portfolio filter and offers restricted values everywhere | Each consumer spec states its filter; the unfiltered read returns *Applies to* |
| Portfolios are soft-deleted, so links to them persist | Hidden on read; "no active portfolio" is distinct from "all" |
| Center Admins lose access | Requester decision; Admin / Technical Support maintain the lists |
| KZ-017 — gates narrower than the claim | Filter asserted on real SQL; uniqueness by raw insert; seed re-run by exported statements |
| KZ-002 — affected surface by folder | Enumerated by what renders: page, navigator, header, modal, `DataTable`, **sidebar**, route, guard |

| # | Open question | Decision |
| --- | --- | --- |
| **Q-1** | New migration, or rewrite the three unmerged migrations? | **Rewrite** (requester, 2026-10-13) — not shared or run by other team members; the link table gets its own new migration |
| **Q-2** | What if data meets duplicates across portfolios? | **Accepted:** stop and list them; with Q-1 the tables are recreated from the seed, which has none |

## 13. Success Criteria
- Every list is read by its key; categories and lists carry no portfolio.
- Two lists never share a key; two categories never share a name.
- A filtered read returns exactly the values that apply to all portfolios plus those restricted to that portfolio.
- After the procedure, the 2 categories, 6 lists and 23 values exist with the same ids, and categories/lists have no `portfolio_id` column.
- Only Admin and Technical Support reach the page and its admin API.
- Organizational Structure validates `org.level` with `assertValueInList(valueId, 'org.level')`.

## 14. Next Step
```text
/akili-specify changes/control-lists-global-scope
```

## 15. Revision Log
| Date | Change | Source |
| --- | --- | --- |
| 2026-10-13 (a) | First draft: global by default with optional portfolio scope | requester |
| 2026-10-13 (b) | All lists read by key; portfolio removed from Control Lists | requester |
| 2026-10-13 (c) | Q-1: rewrite the three unmerged migrations; Q-2 accepted; proposal **approved**; `family.md` F-2/F-3 amended | requester |
| 2026-10-13 (d) | Menu moves to *System admin*; access = Admin + Technical Support (Center Admin removed) | requester |
| 2026-10-13 (e) | Values gain an optional *Applies to* set of portfolios (none = all) and the by-key read an optional portfolio filter. Lists and categories stay global | requester |
| 2026-10-13 (f) | Body rewritten to match (d) and (e) — Judgment Day round 1, J-8 | Judgment Day |
