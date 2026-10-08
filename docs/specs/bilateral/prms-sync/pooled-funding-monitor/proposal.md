# Proposal — Pooled Funding Contribution Monitor

> **Answer first:** a new, **read-only** page, *Pooled Funding Contribution Monitor*, listed under the **Principal Investigator** nav group. It has two tabs (**Portfolio coverage**, **Results queue**) and two scopes (**Only my results as PI**, **Whole portfolio**). Every number, status and filter shown in the mockup is computed by the server from existing STAR data. The only row action is **View**, which navigates to the result. Build it as one new server read module plus one standalone Angular page styled with Tailwind utilities.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bilateral/prms-sync/pooled-funding-monitor` |
| Parent spec | `bilateral/prms-sync` — **child 7**, added to [`../family.md`](../family.md) §2 on 2026-10-08 (HITL: owner chose "new child" over re-scoping child 4) |
| Slug | `pooled-funding-monitor` — derived from free-text argument ("Pool Funding Contribution Monitor") |
| Type | **Change** (new feature) |
| Approval Mode | pre-approved (Daniela Pino, 2026-10-08 — "continue y sigue con la opción recomendada y para a preguntarme a menos que sea totalmente necesario o surja un error"). Routine gates auto-pass and are logged as `auto-approved (pre-approved mode)`; HALT, Pivot, budget tripwire, FATAL_FAIL, PRODUCT_BUG, destructive actions and RB-1 (local migrations) still stop for the owner |
| Status | **Approved 2026-10-08** (owner) — decisions D-1…D-5 in §12 |
| Requested by | Daniela Pino (d.zuniga@cgiar.org) |
| Date | 2026-10-08 |
| Baseline commit | `f93bde88` (branch `plc-monitor`) |
| Packages | `server/researchindicators` + `client/research-indicators` |
| Depends on | `prms-sync/sync-engine` (sync state on `results`), `prms-sync/decision-webhook` (`result_prms_sync_history` PRMS verdicts) |
| Parallel-safe | **no** — touches the client package, like children 2–4 and 6 |
| Requirement source | The owner's free-text brief (2026-10-08) and the Jira-style statement pasted with it. **The mockup is the source of truth** wherever the two disagree (owner's words). |

## 2. Intent

PIs and portfolio managers need a single place to see how Pool-funding-contributing results move through **STAR → Pool funding mapping → PRMS**. They should be able to tell which results are ready, synced, pending, rejected or out of scope, broken down by project and by Science Program. The page is **for monitoring**: the owner stated it is "mostly to visualize data and statuses".

## 3. Problem / Current Behavior

| Today | Where |
|---|---|
| PRMS sync state can only be seen **one result at a time**: the PRMS SYNC button plus the sync card and history modal in the result sidebar. | `result-sidebar.component.ts:135-238`, `shared/components/prms-sync-card/` |
| No view lists results by **pipeline stage** across projects, for one PI or for the whole portfolio. | — |
| The planned project-level panel (child 4, `pi-sync-panel`) is a `project-detail` section limited to one project; it explicitly lists a cross-project dashboard as a non-goal. The mockup requires that cross-project dashboard. | [`../pi-sync-panel/proposal.md`](../pi-sync-panel/proposal.md) §6 |
| All the source data already exists: sync flags on `results`, PRMS verdicts in `result_prms_sync_history`, alignment tables, the effective pool-funding-contributor predicate, and PI identity (`queryPrincipalInvestigator`). Nothing aggregates it. | see §7 |

## 4. Proposed Outcome

A new page (route TBD at specify, e.g. `/pooled-funding-monitor`) whose layout, filters, chips, ordering and copy follow the mockup. The only exceptions are the ones listed in §6.

**Header:** title, subtitle, and a segmented scope toggle (**Only my results as PI** is the default, **Whole portfolio** is the other option). Below it, four KPI cards: *Projects contributing to Pool funding*, *Results eligible for Pool funding mapping*, *Need attention*, *Synced with PRMS*.

**Tab 1 — Portfolio coverage**
- **Result pipeline.** One stacked bar over seven stages in three groups:
  - **In STAR:** *Mapping not started*, *Mapping incomplete*, *Ready to sync*.
  - **In PRMS:** *Pending review*, *Approved*, *Rejected*.
  - **Out of scope:** *No SP contribution*.
  - Totals shown: in scope, not synced, in PRMS, out of scope.
- **Coverage by Science Program.** One bar per primary SP showing synced / total.
- **Sync activity.** Results synced per month over the last 6 months.

**Tab 2 — Results queue**
- **Filters:**
  - Project contributing to Pool funding.
  - Science Program, grouped into *Science programs*, *Scaling programs*, *Accelerators* and *Other projects*.
  - Status (7 options, "All statuses" included).
  - Result type: the 5 PRMS types; OICRs are excluded.
  - **Reset**.
- **Quick-view chips with live counts:** *All results*, *Need attention*, *Mapping incomplete*, *Ready to sync*, *Awaiting PI*, *Rejected by PRMS*, *Synced with PRMS*.
- **Collapsible project groups.**
  - Header: code, name, Lead PI, donor, result count, a stacked PRMS-status bar, and an *N need attention* or *All clear* flag.
  - Groups are sorted by attention count (descending), then by code.
- **Rows inside a group:**
  - Columns: result title + code + type; STAR status + PI line; Pool funding mapping + SP line; PRMS status pill with a tooltip; Updated; **View**.
  - Rows are ordered: need-attention, then out-of-scope, then pending, then approved, then the rest.
- **Footer:** count line and legend.

**Scope semantics**

| Scope | Results included |
|---|---|
| Only my results as PI | Results whose primary contract is pool-funding-contributing **and** for which the viewer is PI (project lead **or** an active `pi_delegates` row) — the same `queryPrincipalInvestigator` rule used by My Projects |
| Whole portfolio | All results whose primary contract is pool-funding-contributing (`effectivePoolFundingContributorSql`). Available to every viewer who can open the page (D-2). |

**Derived states.** The server derives every state; the client derives nothing:

| Mockup concept | Proposed source (confirm against local DB at specify) |
|---|---|
| STAR status (*Draft, Submitted, Under review, Approved, Returned*) | `results.result_status_id` → mapping table (**D-3**). The *Approved* gate is `status_id = 6`, the same as the sync gate |
| PI line (*Approved 18 Jul 2026*, *Awaiting PI sign-off*, *Not yet submitted in STAR*) | Status label plus the date of the status transition from workflow history (**D-4**) |
| Pool funding mapping: *No SP contribution* | `result_pool_funding_alignment.has_contribution = false` → out of PRMS scope |
| Mapping: *Not started* | No alignment row |
| Mapping: *Complete* | Green check `pool_funding_alignment` is true |
| Mapping: *Incomplete* | Alignment row exists but the green check is false |
| Primary / contributing SP | `result_pool_funding_alignment_sp.sp_role` `PRIMARY` / `CONTRIBUTING` + `clarisa_science_programs` |
| PRMS status: *Not sent / Pending Review / Approved / Rejected* | `results.is_synced_to_prms` + latest `result_prms_sync_history.status` (`PENDING_REVIEW`/`APPROVED`/`REJECTED`) |
| *Ready to sync* | Approved **and** mapping Complete **and** not sent (mirrors the server `SYNC_GATE_ENTRIES`, not a client re-implementation) |
| *Need attention* | Not out of scope **and** not sent |
| Synced per month | `result_prms_sync_log` rows with outcome `ACCEPTED`, grouped by month |

## 5. Scope

| In | Detail |
|---|---|
| Server | A new read-only module (e.g. `domain/entities/pooled-funding-monitor/`) exposing: (1) a **summary** endpoint (KPI cards, pipeline, SP coverage, monthly activity) per scope; (2) a **project-groups** endpoint (filtered + chip counts + group headers); (3) a **group-results** endpoint, fetched when a group is expanded so the whole-portfolio view never ships thousands of rows at once (final shape at design). Includes Swagger (`@ApiTags/@ApiBearerAuth/@ApiOperation/@ApiQuery`), sibling `*.spec.ts`, and registration in **both** `main.routes.ts` and `entities.module.ts` (**KZ-017**). |
| Client | A standalone lazy page plus child components; HTTP through `ApiService`; signals for state; a nav item under the *Principal Investigator* group next to *My PI Delegates*; **View** navigates to `result/:code/...`; result title link goes to the same place. |
| Styling | **Tailwind utility classes in templates, no new `.scss` files** (owner requirement; Tailwind v4 is already loaded at runtime from `index.html`). Colors come from `var(--ac-*)` tokens through arbitrary values (e.g. `bg-[var(--ac-…)]`). The mockup's hex palette is mapped to tokens; it is not copied in. |
| Tests | Server unit + e2e for the derivations and scope guard; client unit for filters/chips/grouping/navigation. Counts are asserted **on the endpoint and in the rendered DOM** (**KZ-001**). |

## 6. Non-Goals

| Excluded mockup element | Why |
|---|---|
| **Sync to PRMS / Re-sync / Push STAR vN** row and drawer buttons | Owner, 2026-10-08: *"solo view, no más acciones"* (D-5). |
| **Request approval**, **Complete mapping**, header **Sync now** + "PRMS sync: today 09:30" | Owner: no actions besides View. |
| **Detail drawer** (Overview eligibility checks, STAR↔PRMS diff, Activity) | Owner: View redirects to the result instead. The version-diff data does not exist in STAR today. |
| *Theory of Change mapping* and *Sync log* tabs | Already hidden in the mockup (`isToc: false`, `isLog: false`). |
| Year filter | Exists in the mockup state but is not rendered. |
| Any change to the sync engine, gate, webhook or sidebar | Owner: "the sync to PRMS was developed before … we must not develop any of that". |
| Child 4 (`pi-sync-panel`) | Untouched — this is a separate, new module (D-1). |

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| PIs and PI delegates | New visibility (primary persona) |
| All roles except contributor-only | Can open the page and both scopes (D-2) |
| `results`, `result_contracts`, `agresso_contracts`, `pi_delegates`, `result_pool_funding_alignment(_sp)`, green checks, `result_prms_sync_history`, `result_prms_sync_log`, `clarisa_science_programs` | Read only — **no migrations expected** |
| `gloabl-queries.const.ts` (`queryPrincipalInvestigator`), `pool-funding.util.ts` (`effectivePoolFundingContributorSql`), `eligibility/sync-gate.ts` | Reused, not modified |
| Client nav / `app.routes.ts` | New route + menu item (verify the link resolves in the running app — **KZ-017**) |
| Specs | `prms-sync/family.md` (row 7 added), `pi-sync-panel` (independent, untouched — D-1), `center-admin-resync` (its status column overlaps the whole-portfolio view), `pool-funding-feature-toggles` (should the page honor `POOL_FUNDING_SECTION_ENABLED`? → OQ-6) |

## 8. Visual Reference

- **Source:** Self-contained HTML mockup (Claude Design), shared by the owner. Design link: `https://claude.ai/design/p/ff4b6685-749a-46a1-a9fa-230ad8268f87?file=NEW+copy.dc.html`
- **Location:**
  - [`mockup/pooled-funding-contribution-monitor.html`](mockup/pooled-funding-contribution-monitor.html) — the original bundle; open it in a browser.
  - [`mockup/mockup-logic.extracted.js`](mockup/mockup-logic.extracted.js) — unpacked component logic: demo data, every derivation, filter and chip rule, and the sort orders.
  - [`mockup/mockup-visible-text.extracted.txt`](mockup/mockup-visible-text.extracted.txt) — all the copy.
- **Notes:** covers both tabs, both scopes, filters, chips, project groups and the drawer (drawer excluded, §6). The mockup's numbers are **demo values scaled to agree with each other**. The real page shows real counts, so a card can legitimately differ from the mockup.

## 9. Requirement Delta Preview

### ADDED Requirements
- A read-only Pooled Funding Contribution Monitor page with two tabs, two scopes, KPI cards, pipeline, SP coverage and monthly activity.
- A Results queue with 4 filters, 7 quick-view chips with counts, and collapsible project groups whose rows link to the result.
- Server read endpoints that derive the STAR, mapping and PRMS states and scope them by PI identity.

### MODIFIED Requirements
- Navigation: the *Principal Investigator* group gains a *Pooled Funding Contribution Monitor* item.

### REMOVED Requirements
- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Dedicated read module + standalone page (recommended)** | A new server module with summary, group and group-results endpoints; all derivation in SQL/service. A new Angular standalone page. | One source of truth for states. Scales to the whole portfolio through lazy group loading. Leaves existing modules untouched. Costs one new module. |
| B — Client composes existing endpoints | Results Center list plus a per-result `GET …/prms-sync` | N+1 calls; state derivation duplicated on the client (drift risk named in child 4); a portfolio of 1,000+ results is unusable. |
| C — Extend the Results Center endpoint with PRMS/mapping fields | Reuse `results-center` plumbing | Couples a monitoring view to the main list contract; the KPI and pipeline aggregates still need new endpoints. |

## 11. Recommended Approach

**Option A.** It is the smallest *safe* path: it writes nothing, adds no migration, and reuses the existing PI and pool-funding predicates and the sync-gate vocabulary. State derivation sits where the data lives. Expanding groups lazily keeps the whole-portfolio scope fast without changing the mockup's interaction, because rows only appear when a group is opened. On the client, follow the `results-center` and `my-pi-delegates` page patterns, with Tailwind in templates and tokens for color.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| **D-1** (was OQ-1) | **CLOSED 2026-10-08 (owner).** This module is **entirely new** and replaces or overwrites nothing. Child 4 `pi-sync-panel` is **not retired** and stays as written. This page lives at **Administration → Principal Investigator → Pooled Funding Contribution Monitor**. |
| **D-2** (was OQ-2) | **CLOSED 2026-10-08 (owner).** **Every authenticated user can open the page, except users whose only role is `CONTRIBUTOR` (3).** Whoever can open it can use both scopes (*Only my results as PI* and *Whole portfolio*). The server enforces the rule; the nav item is hidden for contributor-only users. |
| **D-3** (was OQ-3) | **CLOSED 2026-10-08 — recommendation accepted.** Draft = 1 Editing / 4 Draft · Submitted = 2 · Under review = 3 Accepted · Approved = 6 · Returned = 5 Revised / 7 Rejected. Verify against the local DB at specify; ids outside these are excluded or shown by their own name (design decides). |
| **D-4** (was OQ-4) | **CLOSED 2026-10-08 — recommendation accepted.** "Approved by the PI" = status **6 Approved**. The approval date comes from the status-transition history. |
| **D-5** (was OQ-5) | **CLOSED 2026-10-08 (owner).** **View is the only action.** Sync to PRMS is not shown in this page. |
| **OQ-6** | Should the page and its nav item be hidden when `POOL_FUNDING_SECTION_ENABLED` is off? |
| **OQ-7** | Whole-portfolio counts are scoped to **which reporting cycle/year**? The mockup says "2026 cycle", but the year filter is hidden. |
| **OQ-8** | Is the SP grouping (*Science programs / Scaling programs / Accelerators / Other projects*) available in `clarisa_science_programs`, or does it need a static map? Is the project **donor** shown in the group header a field on `agresso_contracts`? |
| R-1 | **Color tokens.** The mockup hard-codes hex values. The client guide forbids hex in components. Some new `--ac-*` status tokens may be needed in the existing global token file (an edit to existing styles, not a new SCSS file). Light/dark parity must hold. |
| R-2 | **Data dependency.** PRMS *Approved/Rejected* only appear once `decision-webhook` deliveries exist (child 5 rollout is blocked on Dev/TEST). Until then, synced results show *Pending review*. |
| R-3 | **Performance.** Whole-portfolio aggregates over ~4k results with several joins; the design must state the query plan and indexes (`idx_results_synced_to_prms` exists). |
| R-4 | **Local DB only.** The owner authorized read-only inspection of the **local** DB to confirm derivations; never the shared Dev DB or Prod. |
| Kaizen | **KZ-017** (the route and module must be reachable in the running app, not just compile). **KZ-001** (assert counts on the endpoint **and** the DOM, not on the call sequence). **KZ-002** (enumerate what renders on the route, including the shared nav). |

## 13. Success Criteria

- For seeded local data, every KPI card, pipeline stage, SP bar, chip count and project-group bar equals the ground truth computed by an independent SQL query. This is asserted on the endpoint response **and** on the rendered DOM.
- A PI sees only results from projects where they are lead or delegate under *Only my results as PI*; a viewer who is PI of nothing sees an empty state there. A contributor-only user cannot open the page: the server refuses and the nav item is hidden (D-2).
- Every filter, the Reset button and every chip produce the same row sets as the mockup's rules (`mockup-logic.extracted.js`), applied to real data.
- **View** and the title link open the correct result page. There are no other row actions.
- Templates use Tailwind utilities and tokens, with no new `.scss` file and no hex literals. The page passes AA contrast in light and dark.

## 14. Next Step

OQ-1…OQ-5 are closed (D-1…D-5). OQ-6…OQ-8 are settled during specify:

```text
/akili-specify bilateral/prms-sync/pooled-funding-monitor
```
