# Proposal — Control Lists: global lists read by key

> **Answer first:** control lists stop belonging to a portfolio. Every category and list is global, and **every list is read by its key alone** (`org.level`, `kpi.direction`). The key becomes unique across the whole module. Whether a screen needs a different vocabulary per portfolio is decided **screen by screen, when that screen is specified**, not built into Control Lists now. The seeded data keeps its ids. Organizational Structure no longer needs its portfolio workaround (its Q-1 / D-ORG-3).

## 1. Document Control

| Field | Value |
| --- | --- |
| **Spec path** | `docs/specs/changes/control-lists-global-scope` |
| **Slug** | `control-lists-global-scope` — derived from the requester's description (2026-10-13) |
| **Type** | **Change** |
| **Approval Mode** | `gated` |
| **Status** | **approved** 2026-10-13 by the requester — Q-1: rewrite the unmerged migrations; Q-2: accepted (see §15) |
| **Last updated** | 2026-10-13 |
| **Branch** | `institutional-kpis` (Control Lists is on this branch, 78 commits ahead of `origin`, not merged to `dev` or `main`) |
| **Changes** | Delivered spec `institutional-performance/control-lists` (archived: [`../../archive/2026-10-08-institutional-performance--control-lists/`](../../archive/2026-10-08-institutional-performance--control-lists/)). The archive is not edited; this spec records the delta |
| **Depends on** | `institutional-performance/control-lists` — `done` |
| **Blocks** | `institutional-performance/organizational-structure` — paused at design approval (commit `7dd94071`); its Q-1 / D-ORG-3 / R-ORG-011 are rewritten once this is approved |
| **Parallel-safe** | no (same module, same tables, same page) |
| **Family** | Not a child of `institutional-performance/family.md` (closed set). It amends shared rule **F-2** of that family |
| **JPD / Jira** | PARI-258; Control Lists epic AC-1773 — a ticket for this change is `<TO CONFIRM>` |

## 2. Intent

Define each vocabulary once for the whole Alliance and read it by its key. Portfolio-specific vocabularies are not modeled now: when a screen needs one, its own spec decides how (for example, by using a different list key), with the requirement in hand.

## 3. Problem / Current Behavior

| # | Fact | Evidence |
| --- | --- | --- |
| 3.1 | Categories and lists require a portfolio (`portfolio_id NOT NULL`, FK to `portfolios`). Uniqueness is per portfolio, so the same key may exist once per portfolio. | `server/…/db/migrations/1790900000000-createControlListCategories.ts:31,36,42`; `1790900000001-createControlLists.ts:34,42,48`; archived D-CTL-2 |
| 3.2 | Every admin read and the page itself are filtered by a selected portfolio; a portfolio with no categories shows *(not configured)*. | archived R-CTL-001, R-CTL-008; D-CTL-10 |
| 3.3 | The consumer read and the membership check need a portfolio: `GET /by-key/:listKey/values?portfolioId=` and `assertValueInList(valueId, portfolioId, listKey)`. | archived design §4 A13, §5 rule 10; `control-list-value-lookup.service.ts:39-78` |
| 3.4 | All 6 seeded lists (5 KPI lists + `org.level`) and both categories live in Portfolio 2. | `1790900000001-createControlLists.ts:94`; archived R-CTL-010 |
| 3.5 | Organizational Structure is global (decided 2026-10-08), so it had to add a portfolio-agnostic lookup (D-ORG-3) to read `org.level`. | `organizational-structure/design.md` D-ORG-3, P-2 |
| 3.6 | The requester wants every list read by its key; portfolio conditions will be added per screen when a screen needs them. | requester, 2026-10-13 |
| 3.7 | The Control Lists migrations exist only on this branch and in local databases; they have not been deployed to Dev or Prod. | `git status -sb` → `ahead 78`; `git branch -r --contains 847cda8d` → none |

## 4. Proposed Outcome

| Given | When | Then |
| --- | --- | --- |
| The admin opens Control Lists | — | all categories and lists are shown; there is no portfolio selector |
| An admin creates a list | with key `kpi.data_source` | it is created; its reference is just the key |
| A list `kpi.direction` exists | an admin creates another `kpi.direction` | rejected (`409`): keys are unique across the module |
| A category *KPIs* exists | an admin creates *kpis* | rejected (`409`): category names are unique across the module, any letter case |
| A consumer reads `org.level` | by key | it gets the list's values, with no portfolio parameter |
| A consumer validates a stored value | `assertValueInList(valueId, 'org.level')` | it passes for a value of that list, fails (`400`) for another list's value, and fails (`404`) for an unknown id |
| A request still sends `portfolioId` | to any Control Lists endpoint | rejected (`400`), so no caller keeps assuming a portfolio filter that no longer exists |
| A screen later needs a portfolio-specific vocabulary | — | its own spec decides the mechanism; Control Lists is not changed in advance |

## 5. Scope

| Aspect | Change |
| --- | --- |
| Categories | No portfolio; name unique (case-insensitive) across all categories |
| Lists | No portfolio; **key unique across all lists**; key still immutable after creation |
| Values | Unchanged (ids, codes, in-use protection) |
| Consumer contract | `GET /by-key/:listKey/values?activeOnly=` (no `portfolioId`); `assertValueInList(valueId, listKey)` |
| Admin API | Portfolio parameter removed from every read and write; the portfolio-summaries endpoint (A2) removed |
| Page | Portfolio selector and *(not configured)* removed; the list header shows the key instead of `P<id> · <key>` |
| Migrations | **The three existing Control Lists migrations (`1790900000000…002`) are rewritten in place** (Q-1): no `portfolio_id` column, FK or index; unique indexes on category name and list key; the seed inserts the same 2 categories, 6 lists and 23 values with the same ids, without resolving a portfolio. Allowed because they were never merged, pushed, shared or run outside the requester's local DB (fact 3.7). Each local DB that ran them reverts the three (values → lists → categories) and runs them again |
| Tests | The two-portfolio isolation suite is removed and replaced by key-uniqueness tests; specs that pass `portfolioId` are updated |

## 6. Non-Goals
- Any portfolio-specific list mechanism now (scoped lists, overrides, filters). It is added per screen, when needed, in that screen's spec.
- Copying lists; changing values, codes, permanent ids or the in-use protection.
- Any change to tables outside this module.

## 7. Affected Users, Systems, And Specs
| Area | Impact |
| --- | --- |
| Server | `control-lists` module: 2 entities, service rules, DTOs, controller (A1–A13, A2 removed), lookup service signature; one new migration; unit + integration suites |
| Client | Control Lists page (selector removed, header reference), `api.service` signatures, interfaces, specs |
| Specs | `organizational-structure`: Q-1 resolved, D-ORG-3 dropped, R-ORG-011 simplified. `institutional-performance/family.md` F-2 amended (HITL manifest edit). Future `institutional-indicators` reads KPI lists by key |
| Users | Center Admin / System Admin (same roles, F-1) |

## 8. Visual Reference
- **Source:** generated mockup (claude.ai Design canvas), artboard **1 · Control Lists** — https://claude.ai/artifact/EPtLbFVhaEQb3Vgq7kuyRP (`../../institutional-performance/mockup/ControlledLists.dc.html`).
- **Drift:** the artboard shows the portfolio selector and `P2 · <key>`. To update during `/akili-specify`: remove the selector, show the key alone.

## 9. Requirement Delta Preview

**MODIFIED**
- **R-CTL-001** *Portfolio-scoped control lists* → *Global control lists*: no read or write takes a portfolio; a `portfolioId` field is rejected.
- **R-CTL-002** Categories: name unique across the module.
- **R-CTL-003** Lists: key unique across the module; the reference shown is the key; the scenario *Same key in two portfolios* is removed.
- **R-CTL-006** Consumer read by key only; `assertValueInList(valueId, listKey)`.
- **R-CTL-008** Page without a portfolio selector or *(not configured)*.
- **R-CTL-010** Seed lives outside any portfolio (same 2 categories, 6 lists, 23 values, same ids).

**ADDED**
- Nothing. The existing migrations are rewritten (Q-1); no new migration.

**REMOVED**
- A2 *portfolio summaries* endpoint; D-CTL-10 *(not configured)*; D-CTL-2's "same key once per portfolio"; the two-portfolio isolation tests.

## 10. Approach Options

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Remove the portfolio from categories and lists; key unique module-wide** | Matches the requester's rule exactly; simplest reads; nothing ambiguous; portfolio needs are solved per screen with the real requirement | A future per-portfolio need needs its own small change (accepted by the requester) |
| B. Keep an optional `portfolio_id` on lists as a tag, ignored by reads | Data ready "just in case" | A field nobody reads or validates drifts and misleads; the requester asked to decide per screen |
| C. Global by default + optional portfolio scope (this proposal's first draft) | Portfolio lists available now | Reads need key + portfolio for scoped lists; more rules and tests for a need no screen has yet — superseded by the requester on 2026-10-13 |

## 11. Recommended Approach

**Option A.** It is the requester's rule and the smallest model: one key, one list. **Migration strategy (requester, Q-1):** rewrite the three unmerged migrations, so the schema history never shows a portfolio that was never deployed. This is not an exception to the append-only rule: that rule protects merged migrations, and these are not merged.

## 12. Risks, Dependencies, And Open Questions

| Risk | Mitigation |
| --- | --- |
| A local DB that ran the old migrations keeps the old schema; reverting drops its control-list tables, so **rows created by hand in that local DB are lost** | Revert, rerun and re-seed are a documented step of the migration task; anyone who needs hand-made local rows exports them first. Only the requester's local DB is known to have run them |
| The rewritten migrations diverge from what a local DB recorded as run (same names, new content) | TypeORM tracks by name, so a DB that is not reverted silently keeps the old schema. The task's verification runs `migration:show` and a schema check (`SHOW COLUMNS … LIKE 'portfolio_id'` → empty) on the local DB, per K-014 |
| Callers still send `portfolioId` | DTO whitelisting rejects it (`400`); client and tests updated in the same change |
| Organizational Structure design assumes the workaround | Paused; its design is updated right after this proposal is approved (no code written yet) |
| KZ-017 — the old isolation suite becomes meaningless | Removed with an explicit note; key-uniqueness tests replace it and state what they cannot reach (they do not mount `GlobalExceptions`; the `.global-exceptions.spec.ts` covers the envelope) |
| KZ-002 — affected surface enumerated by folder | Enumerate by what renders on the route: page, navigator, list header, modal, shared `DataTable`; sidebar untouched |

| # | Open question | Recommendation |
| --- | --- | --- |
| **Q-1** | New migration, or rewrite the three unmerged migrations? | **Decided: rewrite** (requester, 2026-10-13) — not shared or run by other team members |
| **Q-2** | What if data meets duplicates across portfolios? | **Accepted:** stop and list them, never merge automatically. With Q-1 the tables are recreated from the seed, which has no duplicates, so this only applies if hand-made local rows are re-entered |

## 13. Success Criteria
- Every list is read by key alone; no Control Lists endpoint or service method takes a portfolio.
- Two lists can never share a key; two categories can never share a name.
- After reverting and rerunning the rewritten migrations, the 2 categories, 6 lists and 23 values exist with the same ids and the tables have no `portfolio_id` column.
- Organizational Structure validates `org.level` with `assertValueInList(valueId, 'org.level')`.

## 14. Next Step
```text
/akili-specify changes/control-lists-global-scope
```

## 15. Revision Log
| Date | Change | Source |
| --- | --- | --- |
| 2026-10-13 (a) | First draft: global by default with optional portfolio scope | requester |
| 2026-10-13 (b) | All lists read by key; portfolio removed from Control Lists; portfolio conditions decided per screen when needed. Former Q-1 (category scope) and Q-3 (scope change) no longer apply | requester |
| 2026-10-13 (c) | Q-1: rewrite the three unmerged migrations instead of adding one; Q-2 accepted; proposal **approved**; `family.md` F-2/F-3 amended | requester |
