# Requirements — Bilateral / Pooled Funding Contribution Monitor

- **Module:** bilateral (new server read module + new STAR client page)
- **Spec id:** 2026-10-pooled-funding-monitor
- **Status:** approved
- **Owner:** Daniela Pino (d.zuniga@cgiar.org) / ARI
- **Depth:** Standard (new read-only feature; includes an access rule, no migration)
- **Linked PRD section:** [`docs/prd.md`](../../../../prd.md) §4.1 (G1, G4), §3.5 (PRMS as downstream consumer)
- **Linked tickets:** AC-1676 (family)
- **Family:** [`../family.md`](../family.md) — **child 7**, depends on `sync-engine` and `decision-webhook`
- **Proposal:** [`./proposal.md`](./proposal.md) — approved 2026-10-08, decisions D-1…D-5
- **Visual source of truth:** [`./mockup/`](./mockup/) — the mockup governs layout, copy, filters, chips and ordering, except where §1 removes an element
- **Last updated:** 2026-10-08

---

## 0. Executive summary

A new, **read-only** STAR page, *Pooled Funding Contribution Monitor*, under **Administration → Principal Investigator**. It shows, for one PI or for the whole portfolio, how results from Pool-funding-contributing projects move through **STAR status → Pool funding mapping → PRMS**.

- **Tabs:** *Portfolio coverage* (pipeline, Science Program coverage, monthly sync activity) and *Results queue* (filters, quick-view chips, collapsible project groups).
- **Only interaction that leaves the page:** **View**, which opens the result.
- **Server:** every state is computed on the server from existing data. No schema change.

## 1. Context

**Why now.** Sync state can only be seen one result at a time in the result sidebar. PIs and portfolio managers have no cross-project view of what is ready, synced, rejected or out of scope. The owner supplied a finished mockup and asked for it to be built "exactly as the mockup", as a monitoring page.

**Affected surface (by what renders on the route — KZ-002):**
- The platform shell sidebar, which gains a nav item in the *Principal Investigator* group.
- The new page and its two tabs.
- The result page reached through **View**.

**Explicitly NOT changing:**

| Untouched | Why |
|---|---|
| The PRMS SYNC button, sync gate, sync engine, decision webhook, sidebar card and history modal | D-5: this page has no sync action |
| Child 4 `pi-sync-panel` | D-1: separate module; neither replaces the other |
| Any table schema | Read-only spec; no migration |

**Mockup elements removed by the owner (D-5):**
- *Sync to PRMS*, *Re-sync*, *Push STAR vN*, *Request approval*, *Complete mapping*.
- The header *Sync now* button and the "PRMS sync: today 09:30" label.
- The detail drawer (Overview / STAR↔PRMS diff / Activity).

Elements already hidden in the mockup and not built: the *Theory of Change* tab, the *Sync log* tab and the year filter.

## 2. Glossary

| Term | Meaning in this spec |
|---|---|
| **Monitored result** | A result counted by this page (R-PFM-003). |
| **Contributing project** | An AGRESSO contract that is an effective pool-funding contributor (tag flag OR active bilateral project mapping). |
| **PI scope** | *Only my results as PI*: monitored results whose **primary** contract has the viewer as project lead or active PI delegate. |
| **Portfolio scope** | *Whole portfolio*: all monitored results. |
| **STAR status label** | One of *Draft, Submitted, Under review, Approved, Returned*, derived from the result status (D-3). |
| **Mapping state** | One of *Not started, Incomplete, Complete, No SP contribution*, derived from the result's Pool funding alignment. |
| **PRMS status** | One of *Not sent, Pending Review, Approved, Rejected*. |
| **Out of scope** | Mapping state = *No SP contribution*. The PI declared no Science Program contribution, so the result is never reported to PRMS. |
| **Ready to sync** | STAR label *Approved* **and** mapping *Complete* **and** PRMS *Not sent*. |
| **Needs attention** | Not out of scope **and** PRMS *Not sent*. |

## 3. Stakeholders / personas

| Persona | Need | Access |
|---|---|---|
| Principal Investigator / PI delegate | See their own projects' results and what blocks them | Yes |
| Center Admin, System Admin, MEL Regional Expert, Technical Support | Portfolio-wide monitoring | Yes |
| User whose **only** role is Contributor (3) | — | **No** (D-2) |

---

## 4. Functional requirements

### R-PFM-001 — Page access and navigation

The system SHALL expose the page to every authenticated user **except** users whose only role is Contributor. The page is reachable from **Administration → Principal Investigator → Pooled Funding Contribution Monitor**.

#### Scenario: Allowed viewer
- GIVEN a logged-in user holding any role other than *Contributor only* (e.g. Center Admin, or Contributor + System Admin)
- WHEN they open the platform sidebar
- THEN *Pooled Funding Contribution Monitor* appears in the *Principal Investigator* group, next to *My PI Delegates*
- AND IT MUST appear even when the viewer cannot see *My PI Delegates*. Today that whole group is hidden behind the PI-delegate access check (`alliance-sidebar.component.html:46-71`, `canSeePiDelegates()`). The group therefore renders when **either** item is visible, and *My PI Delegates* keeps its own rule unchanged.
- AND clicking it renders the page in the running app (the route resolves; no `NG04002`) — KZ-017

#### Scenario: Contributor-only user
- GIVEN a user whose only role is Contributor (3)
- WHEN the sidebar renders
- THEN the nav item is NOT shown
- AND navigating directly to the page URL redirects away instead of rendering it
- AND every monitor API endpoint answers **403** in the `ServerResponseDto` envelope
- BUT it must NOT rely on the client alone: the server SHALL refuse independently of the UI

#### Scenario: Unauthenticated
- GIVEN no valid token
- WHEN any monitor endpoint is called
- THEN it answers 401, like every protected endpoint

---

### R-PFM-002 — Scope toggle

The page SHALL offer a segmented toggle with **Only my results as PI** (default) and **Whole portfolio**. Every viewer allowed by R-PFM-001 may use both scopes (D-2).

#### Scenario: Default PI scope
- GIVEN an allowed viewer who is PI (project lead) or active delegate on at least one contributing project
- WHEN the page opens
- THEN *Only my results as PI* is selected
- AND every number, chart, chip, group and row counts only results whose **primary** contract is one of those projects

#### Scenario: Switching scope
- WHEN the viewer selects *Whole portfolio*
- THEN every card, chart, chip count, group and row recomputes over all monitored results
- AND the selected filters and the active tab are kept
- AND IT MUST be one consistent dataset: the KPI cards, pipeline totals and chip counts of one scope never mix with the other

#### Scenario: Viewer with no PI projects
- GIVEN an allowed viewer (e.g. a Center Admin) who is PI of no contributing project
- WHEN *Only my results as PI* is selected
- THEN the page shows an explicit empty state ("You are not PI of any project contributing to Pool funding") with a control that switches to *Whole portfolio*
- BUT it must NOT show the portfolio data silently under the PI label

---

### R-PFM-003 — Monitored result set

A result SHALL be monitored iff **all** of the following hold:
1. It is the **current** (non-snapshot), active, non-deleted version **and its platform is STAR**. Results imported from TIP or AICCRA are excluded, because only STAR results are synced to PRMS.
2. Its **primary** contract is a contributing project.
3. Its type is one of the five PRMS result types: Knowledge Product, Innovation Development, Innovation Use, Capacity Sharing for Development, Policy Change.

#### Scenario: OICR excluded
- GIVEN an OICR whose primary contract is a contributing project
- THEN it appears in no count, chart, chip or row

#### Scenario: Results from other platforms
- GIVEN a TIP or AICCRA result (e.g. status *Completed in TIP*) whose primary contract is a contributing project
- THEN it is not monitored. Measured on the local DB, 2026-10-08: 750 of the 906 candidate rows were TIP/AICCRA; including them would swamp the page with results that can never reach PRMS.

#### Scenario: Non-primary contract
- GIVEN a result linked to a contributing project only as a **non-primary** contract
- THEN it is not monitored

#### Scenario: Snapshot rows
- GIVEN a result with older snapshot versions
- THEN it is counted exactly once, using its current version
- AND IT MUST not be double-counted across versions or years

---

### R-PFM-004 — Derived per-result states

The server SHALL return, for every monitored result, the states below. The client SHALL render them and SHALL NOT re-derive them.

| State | Rule |
|---|---|
| STAR status label | Draft ← status 1 Editing or 4 Draft · Submitted ← 2 · Under review ← 3 · Approved ← 6 · Returned ← 5 or 7 (D-3). Any other status is shown by its own STAR status name. |
| PI line | *Approved* → "Approved {dd Mon yyyy}", using the date the result last entered status 6 (D-4). *Submitted* → "Awaiting PI sign-off". *Draft* → "Not yet submitted in STAR". *Under review* → "In review". *Returned* → "Returned for revision". |
| Mapping state | *No SP contribution*: alignment declares no contribution. *Not started*: no alignment recorded. *Complete*: the pool-funding-alignment completeness check passes. *Incomplete*: alignment exists but the check fails. |
| Mapping note | Complete → "Pool funding split recorded" · Incomplete → "Projects or budget shares still missing" · Not started → "Starts after PI approval" · No SP contribution → "PI declared no Science Program contribution · out of PRMS scope" |
| Primary / contributing SPs | From the alignment: the PRIMARY SP (code + name) and the CONTRIBUTING SP names. |
| PRMS status | *Not sent* if never accepted by PRMS. Otherwise the latest PRMS history status: Pending Review, Approved or Rejected. |
| PRMS hint (tooltip) | Rejected → PRMS justification if present · Not sent → "Not synced to PRMS yet" · else "PRMS: {status}" |
| Updated | Last modification timestamp of the result, formatted "dd Mon, HH:mm" |

#### Scenario: Approved result with complete mapping, never sent
- GIVEN status 6, alignment complete, never accepted by PRMS
- THEN STAR = *Approved*, PI line = "Approved {date}", mapping = *Complete*, PRMS = *Not sent*, and the result counts as *Ready to sync* and *Needs attention*

#### Scenario: Out of scope
- GIVEN an alignment declaring no Science Program contribution
- THEN mapping = *No SP contribution* and the SP line reads "Not reported to PRMS"
- AND the result counts as neither *Needs attention* nor *Ready to sync*

#### Scenario: Rejected in PRMS
- GIVEN a result whose latest PRMS history status is REJECTED
- THEN PRMS = *Rejected* and the tooltip shows the PRMS justification when one exists

---

### R-PFM-005 — KPI cards

The header SHALL show four cards for the active scope. Copy and accent colors follow the mockup.

| Card | Value | Sub-line |
|---|---|---|
| Projects contributing to Pool funding | Distinct contributing projects with ≥ 1 monitored result | PI scope: "where you are PI" · Portfolio: "of {N} in portfolio", N = all contributing projects |
| Results eligible for Pool funding mapping | Monitored results | "can be mapped and synced" |
| Need attention | Results that need attention | "draft, pending mapping or pending sync" |
| Synced with PRMS | Results with PRMS ≠ *Not sent* | "of {M} in PRMS scope", M = monitored results not out of scope |

#### Scenario: Cards agree with the queue
- GIVEN any scope and no filters
- THEN *Need attention* equals the count on the *Need attention* chip
- AND *Synced with PRMS* equals the sum of the *Approved*, *Pending review* and *Rejected* pipeline stages

---

### R-PFM-006 — Portfolio coverage: Result pipeline

The *Portfolio coverage* tab SHALL show one stacked bar with seven stages in three groups.

| Group | Stage | Rule |
|---|---|---|
| In STAR | Mapping not started | not sent, in scope, and mapping *Not started* — or mapping *Complete* but STAR ≠ *Approved* (DD-PFM-6) |
| In STAR | Mapping incomplete | not sent, in scope, mapping *Incomplete* |
| In STAR | Ready to sync | Ready to sync |
| In PRMS | Pending review in PRMS | PRMS *Pending Review* |
| In PRMS | Approved in PRMS | PRMS *Approved* |
| In PRMS | Rejected in PRMS | PRMS *Rejected* |
| Out of scope | No SP contribution | not sent and out of scope |

Assignment precedence: (1) PRMS status ≠ *Not sent* → its In-PRMS stage; (2) out of scope; (3) the In-STAR rules.

Each stage shows its value, its share (%), its label, its group and its note (mockup copy). The header shows:
- the total and the count in PRMS scope;
- in STAR, not synced yet (+ share);
- in PRMS (+ share);
- out of scope (+ share).

#### Scenario: Partition is exact
- THEN every stage count equals the count of results matching its rule
- AND IT MUST make stages that are mutually exclusive and sum exactly to the total. Results whose mapping is *Complete* but which are neither Approved in STAR nor in PRMS are counted under *Mapping not started* (design DD-PFM-6).
- BUT a stage with value 0 must NOT render a zero-width segment that steals keyboard focus

---

### R-PFM-007 — Coverage by Science Program

The tab SHALL show one row per **primary** Science Program present in the scope, labelled "{code} — {name}". Each row has a bar with the total and the synced part, and the text "{synced} / {total}". Rows are ordered by SP code.

- Sub-title and legend copy switch with scope: PI = "Your results mapped to each program…", "Synced to PRMS / Not synced"; Portfolio = "Projects mapped to each program…", "Syncing to PRMS / Not syncing".
- *Synced* = PRMS ≠ *Not sent*.
- Out-of-scope results and results without a primary SP are excluded.

#### Scenario: Bars are proportional
- THEN the widest total bar belongs to the program with the highest total
- AND each synced part is the share synced / total of its own row

---

### R-PFM-008 — Sync activity

The tab SHALL show "Results synced per month" for the **last six calendar months including the current one**. Each month counts monitored results whose sync to PRMS was **accepted** in that month. A footer line gives the total for the current year.

#### Scenario: Month without syncs
- GIVEN a month with no accepted syncs
- THEN its bar renders at zero height with its month label still visible

---

### R-PFM-009 — Results queue filters

The *Results queue* tab SHALL offer four filters plus **Reset**. Options come from data, not hard-coded lists, except the Status list.

| Filter | Options | Matches when |
|---|---|---|
| Project contributing to Pool funding | "All projects" + projects present in the scope | primary contract = project |
| Science Program | "All Science Programs" + SPs grouped under *Science programs*, *Scaling programs*, *Accelerators*, *Other projects*, labelled "{code} — {name}" | the SP is the result's primary **or** a contributing SP |
| Status | All statuses · Ready to sync · Pool funding mapping pending · Synced to PRMS · Awaiting PI approval · Under review in STAR · Draft | Ready to sync → Glossary §2 · mapping pending → STAR *Approved* and mapping ≠ *Complete* · Synced → PRMS ≠ *Not sent* · Awaiting PI → STAR *Submitted* · Under review → STAR *Under review* · Draft → STAR *Draft* |
| Result type | All types + the 5 PRMS types | result type |

#### Scenario: Filters combine with AND
- WHEN two filters are set
- THEN only results matching both are listed

#### Scenario: Reset
- WHEN Reset is pressed
- THEN all four filters return to "All …" and the quick-view chip returns to *All results*

#### Scenario: Changing a filter clears the chip
- GIVEN a selected chip
- WHEN any filter changes
- THEN the chip returns to *All results* (mockup behavior)

---

### R-PFM-010 — Quick-view chips

The tab SHALL show chips with live counts. Counts are computed **over the filtered set**. Selecting a chip narrows the listed results.

| Chip | Matches |
|---|---|
| All results | everything |
| Need attention | Needs attention |
| Mapping incomplete | STAR *Approved*, not out of scope, mapping ≠ *Complete* |
| Ready to sync | STAR *Approved*, mapping *Complete*, PRMS *Not sent* |
| Awaiting PI | STAR ≠ *Approved* |
| Rejected by PRMS | PRMS *Rejected* |
| Synced with PRMS | PRMS *Pending Review* or *Approved* |

#### Scenario: Chip counts follow filters
- GIVEN the Status filter = *Draft*
- THEN *All results* shows the Draft count, and every other chip counts only within it

#### Scenario: Single selection
- WHEN a chip is selected
- THEN it is the only active chip, rendered selected (color **and** a non-color cue), and groups or rows without matches disappear

---

### R-PFM-011 — Project groups

Results SHALL be listed inside collapsible groups, one per primary contract, **collapsed by default**.

**Group header:**
- project code, project name, "Lead PI: {name} · {donor}", and "{n} result(s)";
- a stacked bar of PRMS states: approved / pending / rejected / out of scope / not synced;
- a flag: "{k} need(s) attention" (warning style) or "All clear" (success style).

**Ordering:**
- Groups are sorted by attention count (descending), then by project code (ascending).
- Group counts reflect the active filters **and** chip.

#### Scenario: Expand and collapse
- WHEN the header is activated by click, Enter or Space
- THEN the group toggles, the caret changes, and `aria-expanded` reflects the state
- AND other groups keep their own state

#### Scenario: Lazy rows
- WHEN a group is expanded for the first time
- THEN its rows load (with a loading state if they are fetched) and show without blocking other groups

---

### R-PFM-012 — Result rows

Each row SHALL show the columns below. Rows inside a group are ordered: needs attention → out of scope → PRMS Pending Review → PRMS Approved → others.

| Column | Content |
|---|---|
| Result | title (link), result code, type |
| STAR status | colored badge + PI line |
| Pool funding mapping | colored badge + SP line: "{SP code} {SP name} (primary) · {contributing}". Empty when mapping is *Not started*; "Not reported to PRMS" when out of scope. |
| PRMS status | pill; "—" when *Not sent*; tooltip = PRMS hint |
| Updated | "dd Mon, HH:mm" |
| Action | **View** |

---

### R-PFM-013 — View navigates to the result

**View** and the result title SHALL navigate to that result's page in STAR (current version). They are the **only** actions in the queue (D-5).

#### Scenario: View
- WHEN the user activates View or the title on a row
- THEN the browser navigates to the result page `result/{platform}-{official code}`, using the **same link rule as the Results Center** (an Approved result with snapshot years opens its latest snapshot year via `?version=`)
- AND the link resolves in the running app (KZ-017)
- BUT it must NOT open a drawer, modal or side panel
- AND View is shown on **every** row, including out-of-scope and mapping-incomplete rows

---

### R-PFM-014 — Removed mockup elements stay absent

The page SHALL NOT render:
- *Sync to PRMS*, *Re-sync*, *Push STAR vN*, *Request approval*, *Complete mapping*;
- *Sync now* and the "PRMS sync: today …" label;
- the detail drawer, the *Theory of Change* tab, the *Sync log* tab and the year filter.

#### Scenario: No mutation reachable
- THEN the page issues only GET requests
- AND IT MUST contain no element that triggers a sync or any write

---

### R-PFM-015 — Footer

Under the groups the tab SHALL show a count line, plus a legend of the PRMS bar colors (*Approved in PRMS, Pending review, Rejected, Not synced*). Count line copy:
- PI scope: "Showing {n} results across {g} projects where you are PI".
- Portfolio scope: "Showing {n} results across {g} projects · {total} flagged portfolio-wide".

---

### R-PFM-016 — Loading, empty and error states

| State | Behavior |
|---|---|
| Loading | Skeletons in the place of cards, charts and groups; the scope toggle and tabs stay usable |
| Empty (filters) | "No results match these filters" + Reset |
| Empty (PI scope) | R-PFM-002 empty state |
| Error | Inline message per failed section + **Retry**; other sections that loaded stay visible |

#### Scenario: One section fails
- GIVEN the summary request fails and the queue request succeeds
- THEN the coverage tab shows the error with Retry, and the queue still works

---

## 5. Non-functional requirements

| ID | Category | Target | How verified |
|---|---|---|---|
| NFR-PFM-001 | security | Scope is enforced **server-side**: the PI scope is computed from the authenticated user, never from a client-supplied user id. Contributor-only users get 403. | e2e: allowed role, contributor-only (403), unauthenticated (401), PI scope isolation between two seeded PIs |
| NFR-PFM-002 | performance | Summary and group-list endpoints answer in p95 ≤ 2 s; expanding a group answers in p95 ≤ 1 s, for the whole portfolio on the local DB (≈4k results) | Timed runs: 5 runs on local DB, report median + spread. If spread > 50 % of median, the number is not evidence. |
| NFR-PFM-003 | maintainability / styling | Templates use **Tailwind utility classes**. No new `.scss` file is created. No hex literal in component code; colors come from `var(--ac-*)` tokens (new tokens allowed in the existing global token file) | grep on the diff for `.scss` additions and `#[0-9a-fA-F]{3,6}` in new component files |
| NFR-PFM-004 | a11y | WCAG AA contrast for badges, pills and chips in light and dark. Status never conveyed by color alone. Toggle, tabs, chips and group headers are keyboard-operable with visible focus. | axe on the rendered page + manual dark-mode check (see §6) |
| NFR-PFM-005 | responsiveness | Layout as mockup at ≥ 1280 px. At 1024 px cards wrap and the table scrolls horizontally inside its card, never the page. | Manual check at the HITL pause |
| NFR-PFM-006 | consistency | Every count on the page for a scope is derived from the same server computation (no client recomputation of states) | Unit test on the derivation + DOM assertion of counts (KZ-001) |

## 6. Defect classes and their gates

| Defect class this spec can produce | Gate that catches it |
|---|---|
| Wrong derivation (status, mapping, PRMS, ready/attention) | Server unit tests per rule **with fixtures varied per row** (KZ-004) + an e2e comparing endpoint counts to an independent SQL query on seeded data |
| Scope leak (PI sees another PI's results; contributor-only gets data) | Server e2e with two PIs + contributor-only user (NFR-PFM-001) |
| Counts correct in the API, wrong on screen | Client tests asserting rendered DOM text of cards and chips (**KZ-001**: assert in the DOM, not on calls) |
| Module/route not reachable (compiles but 404 / `NG04002`) | Server e2e boot hitting the real URL; client: open the nav link in the running app at the HITL pause (**KZ-017**: unit specs mock the router and cannot see this) |
| SQL operator precedence / generated-SQL mistakes | Assert on query **results** against seeded data, never on the mocked query-builder call sequence (KZ-017) |
| Visual drift from mockup, dark-mode contrast, token misuse | **No automated gate.** Substitute: side-by-side human review against `mockup/pooled-funding-contribution-monitor.html` at the HITL pause (optionally a T6 multimodal screenshot review), plus the NFR-PFM-003 grep |
| Performance regression on portfolio scope | NFR-PFM-002 timed runs; accepted risk on Prod volume (local only, R-4) |

## 7. Data requirements

No schema change, no migration, no OpenSearch field. Reads only (sources detailed in `design.md`): results, result contracts, AGRESSO contracts + PI delegates, pool-funding alignment (+ SP rows), PRMS sync log and history, CLARISA science programs, result status and its transition history.

## 8. API surface delta

New read-only endpoints under one new module. Shapes are defined in `design.md` §4. All endpoints:
- return `ServerResponseDto`;
- are guarded per R-PFM-001;
- carry Swagger annotations (`@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiQuery`).

They mount **unversioned** at `/api/...` unless a handler declares `@Version` (root guide §4.1). Machine tokens: not supported (user-scoped data).

## 9. Assumptions, dependencies, risks

| ID | Item |
|---|---|
| A-1 | **VERIFIED on the local DB, 2026-10-08.** `result_status` ids 1 Editing, 2 Submitted, 3 Accepted, 4 Draft, 5 Pending Revision, 6 Approved, 7 Not approved match D-3. STAR-platform monitored results on that DB use only ids 2, 4, 5, 6, 7. |
| A-2b | **Local data has no PRMS activity:** `result_prms_sync_log` is empty, 0 results are synced, and `result_prms_sync_history` **does not exist** because migration `1790086170692` (plus `1791213000000` and `1791214000000`) is pending on the local DB. Applying it is a human decision. PRMS states must be exercised through seeded test fixtures, not local data. |
| A-2 | "Approved by the PI" = status 6 (D-4). |
| DEP-1 | `decision-webhook` (child 5): until deliveries exist, synced results show *Pending Review* — expected, not a bug. |
| RISK-1 | Real counts differ from the mockup's demo numbers. Reviewers must compare **behavior**, not values. |
| RISK-2 | Portfolio aggregates could be slow on Prod volume; only the local DB can be measured (R-4). |

## 10. Open questions

| ID | Question | Owner | Due |
|---|---|---|---|
| OQ-6 | Hide page + nav when `POOL_FUNDING_SECTION_ENABLED` is off? Proposed default: **yes** | Daniela Pino | design approval |
| OQ-7 | Reporting year scope for counts. Proposed default: **all years, no year filter** (the mockup hides the filter) | Daniela Pino | design approval |
| OQ-8 | SP grouping and donor source — resolved by the design from code/DB | design | design |

## 11. Requirement ID index

| ID | Title |
|---|---|
| R-PFM-001 | Page access and navigation |
| R-PFM-002 | Scope toggle |
| R-PFM-003 | Monitored result set |
| R-PFM-004 | Derived per-result states |
| R-PFM-005 | KPI cards |
| R-PFM-006 | Result pipeline |
| R-PFM-007 | Coverage by Science Program |
| R-PFM-008 | Sync activity |
| R-PFM-009 | Results queue filters |
| R-PFM-010 | Quick-view chips |
| R-PFM-011 | Project groups |
| R-PFM-012 | Result rows |
| R-PFM-013 | View navigates to the result |
| R-PFM-014 | Removed mockup elements stay absent |
| R-PFM-015 | Footer |
| R-PFM-016 | Loading, empty and error states |
| NFR-PFM-001…006 | Security, performance, styling, a11y, responsiveness, consistency |

## 12. Sign-off

- [ ] Engineering lead — TBD
- [ ] MEL / product owner — Daniela Pino
- [ ] Security review (access rule) — TBD
