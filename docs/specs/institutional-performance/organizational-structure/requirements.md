# Requirements — Institutional Performance / Organizational Structure

- **Module:** institutional-performance — server + client
- **Spec id:** 2026-10-organizational-structure
- **Status:** draft
- **Depth:** **Full** — new module with temporal (per-year) data, an append-only log, cross-module contracts (control lists in, future consumers out), migrations + seed. A wrong year resolution corrupts every later report silently
- **Owner:** Hector F. Tobón (requester) · PISA4 / Strategy Refresh
- **Parent spec:** [`../family.md`](../family.md) — child 2 of 5. Shared rules **F-1, F-3 … F-9** apply and are cited, not restated. **F-2 does not apply** (family exception, 2026-10-08)
- **Depends on:** `institutional-performance/control-lists` — `done`, archived at [`../../archive/2026-10-08-institutional-performance--control-lists/`](../../archive/2026-10-08-institutional-performance--control-lists/)
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) — Center Admin tools
- **Linked tickets:** [PARI-258](https://cgiarmel.atlassian.net/browse/PARI-258)
- **Proposal:** [`proposal.md`](proposal.md) — approved 2026-10-08 with Q-1…Q-4 as recommended; this spec stays aligned with it
- **Approval Mode:** `gated`
- **Last updated:** 2026-10-08 (requester: director linked to the Agresso staff table — R-ORG-016)

---

## 1. Executive summary

Admins get a new page, *Center admin › Portfolio Management › Organizational Structure*. It holds **one Alliance structure that belongs to no portfolio**, in four levels: L1 Division › L2 Department › L3 Office (optional) › L4 Unit.

| Concept | Rule |
| --- | --- |
| Identity | Every entry has a **permanent ID** that never changes. Anything linked to an entry stores that ID (F-9) |
| Time | Entries are **versioned per year**. A version applies from a year onward. An entry gets a new version only in a year where it changes; the tree is never copied |
| History | Nothing that was ever in effect is physically erased. Inactivated and deleted entries still appear in every earlier year |
| Log | Every write is recorded in an append-only change log with the real date and time |
| Consumers | Other modules link to an entry by ID and ask for its name, level and parent **for a given year** |

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Entry** | One node of the structure (a division, department, office or unit), identified by its permanent ID |
| **Version** | The values of an entry (name, acronym, level, parent, director) for a range of years `[from, to)`. `to` empty = still current |
| **Year view** | The structure as it was in a given year: for every entry, the version whose range contains that year |
| **Applies from year** | The year a save takes effect from. It decides whether the save edits a version in place, creates a new one, or back-dates |
| **Back-date** | A save whose *Applies from year* is earlier than the current year. It changes reports for past years |
| **Inactivate** | End an entry from a year, optionally naming a successor. Can be reversed |
| **Delete** | End an entry from a year permanently. It stays in the database and in earlier year views |
| **Successor** | The entry that takes over an inactivated entry (used for merges) |
| **Change log** | Append-only record of every write: who, when (timestamp), what, the year it applies from, old → new values |
| **Director** | The responsible person, chosen from the Alliance staff table synced from Agresso (`alliance_user_staff`) and stored by staff ID (`carnet`). Name and email are read from that table, never typed |
| **Associated information** | Records in other modules that store an entry's ID and are registered with this module (none at ship time) |
| **Admin** | A user who passes F-1: Center Admin or System Admin |

## 3. System context & scope

| # | Current behavior | Evidence |
| --- | --- | --- |
| C-1 | The structure exists only in a PDF and a sheet with no IDs and no dates. | proposal fact 3.1 |
| C-2 | The org chart changes often: renames, moves, creations, removals. | proposal fact 3.2 |
| C-3 | The `org.level` control list (L1 Division, L2 Department, L3 Office, L4 Unit; value ids 20–23) exists, belongs to Portfolio 2, and has no consumer yet. | `server/…/db/migrations/1790900000001-createControlLists.ts:94`; `1790900000002-createControlListValues.ts:142-148`; control-lists archive §9 F-4 |
| C-4 | Control Lists ships the nested *Portfolio Management* menu group, the shared `DataTable` (F-7) and the consumer contract (usage registry, `assertValueInList`). | control-lists archive §5 (R-CTL-005, 006, 008, 009) |
| C-5 | Center admin pages are guarded by `centerAdminGuard`; server admin handlers use `@Roles` + `RolesGuard`, and `SYSTEM_ADMIN` bypasses. | control-lists requirements C-3, C-4 |

**Affected surface (what renders on the route):** the shared sidebar (one new nested child), the new page, the shared `DataTable`, the shared modal host (one new modal name), the control-lists usage registry (one new consumer).

**In scope:** entries, per-year versions, back-dating, year views, inactivate/reactivate with successor, logical delete, change log, read contract for consumers, the `org.level` consumer wiring carried over from Control Lists (F-4 of its archive), the page, seed data.

**Not changing:** existing Center admin items and pages; Control Lists behavior (only a consumer is registered); existing tables; any portfolio data.

## 4. Stakeholders / personas

| Persona | Role here |
| --- | --- |
| Center Admin | Maintains the structure |
| System Admin | Same rights, plus the role-check bypass |
| PISA4 / Strategy team | Decides the structure (via the admin) |
| Future consumers | `strategy-framework` (owner units), `institutional-indicators` (KPIs per unit), the mapping module (results → units). They store entry IDs and read the year view |

---

## 5. Functional requirements

### R-ORG-001 — One global structure

- **As an** Admin **I want** one structure for the whole Alliance **so that** it does not depend on which portfolio or strategy is current.

**Details**
- Behavior: no entry, version or log row belongs to a portfolio. No endpoint of this module takes a portfolio parameter. The page has no portfolio selector.

#### Scenario: No portfolio anywhere
- GIVEN Portfolio 1 and Portfolio 2 exist
- WHEN an Admin opens Organizational Structure
- THEN the same structure is shown whatever portfolio is current
- BUT it must NOT show a portfolio selector
- AND IT MUST reject (`400`) any write that sends a `portfolioId` field

**Acceptance criteria**
- [ ] AC.1 — No table of this module has a `portfolio_id` column; no endpoint declares a portfolio parameter.
- [ ] AC.2 — A write body containing `portfolioId` → `400`.

### R-ORG-002 — Permanent ID and editable code

- **As an** Admin **I want** each entry to keep one ID forever and carry a readable code **so that** links never break and people can still refer to entries by code (F-6, F-9).

**Details**
- The **permanent ID** is assigned by the system, shown read-only in the table and the form, and never accepted in a write body.
- The **code** is proposed as `ORG-###` (next free number, zero-padded to 3), editable, 1–30 characters, and unique across **all** entries, including inactive and deleted ones, compared case-insensitively. A code is never reused for a different entry, except after a physical delete (R-ORG-008).
- The code is not versioned: renaming the code changes it for every year. It does not encode the parent, so a move never renumbers.

#### Scenario: Code proposed and unique
- GIVEN entries `ORG-001` … `ORG-117` exist and `ORG-050` is deleted
- WHEN an Admin opens the create form
- THEN the code field is pre-filled with `ORG-118`
- AND IT MUST reject `org-050` with `409` naming `code`, because a deleted entry still owns it

#### Scenario: ID is read-only
- GIVEN an entry with ID 42
- WHEN an update is sent with `id: 43` in the body
- THEN the request fails with `400`
- BUT it must NOT change the stored ID

**Acceptance criteria**
- [ ] AC.1 — Create → `201` with a system ID; the proposed code is `ORG-<max+1>`.
- [ ] AC.2 — Duplicate code (any case, any entry status) → `409`; `id` in a write body → `400`.

### R-ORG-003 — Levels and hierarchy rules

- **As an** Admin **I want** the system to enforce the level rules **so that** the tree always has a valid shape.

**Details**
- Level comes from the `org.level` control list (Q-1): the entry stores the list value's permanent ID. Before every write that stores a level, the value is checked to belong to `org.level` (control-lists `assertValueInList`).
- Parent rules, per version: **L1** has no parent · **L2** under an L1 · **L3** under an L2 · **L4** under an L3 or an L2 (Office optional).
- A parent must be **active in every year the child's version covers**.
- No cycles: an entry can never be its own ancestor in any year.
- Level is identified by the value's **permanent ID** (the four seeded `org.level` values, ids 20–23 — control-lists D-CTL-14), never by its name, code or display order, all of which an admin can edit. A level value outside those four is rejected (`400`) because the hierarchy rules do not cover it.

#### Scenario: Wrong parent level
- GIVEN Department `ORG-010` (L2)
- WHEN an Admin saves a Division (L1) with parent `ORG-010`
- THEN the request fails with `400` naming `parent`
- AND IT MUST NOT store the version

#### Scenario: Unit directly under a department
- GIVEN Department `ORG-010` (L2)
- WHEN an Admin saves a Unit (L4) with parent `ORG-010`
- THEN it is saved (`201`)

#### Scenario: Parent not active in the covered years
- GIVEN Department `ORG-010` is inactive from 2028
- WHEN an Admin moves a unit under `ORG-010` applying from 2029
- THEN the request fails with `400` naming the years in which the parent is not active

#### Scenario: Cycle
- GIVEN `ORG-020` is under `ORG-010`
- WHEN an Admin sets `ORG-010`'s parent to `ORG-020` from any year
- THEN the request fails with `400`
- AND IT MUST check every year from *Applies from year* onward, including later scheduled versions

#### Scenario: Value from the wrong list
- GIVEN value id 7 belongs to `kpi.direction`
- WHEN a write sends level id 7
- THEN the request fails with `400` naming `level`

**Acceptance criteria**
- [ ] AC.1 — Each parent rule has an allowed and a rejected case.
- [ ] AC.2 — Cycles and inactive parents are rejected for every covered year.

### R-ORG-004 — Versions per year

- **As an** Admin **I want** changes to apply from a year **so that** each year has one clear structure and reports for a year stay stable.

**Details**
- An entry has **at most one version per year**. Versions are contiguous: an entry has no gap between its first year and its end year.
- **A version is created only when that entry changes.** If nothing changes for several years, the entry keeps one open-ended version. Other entries are never touched by a change to one entry.
- Every save carries **Applies from year** (default: the current year). Let *Y* be that year:
  - a version of the entry **starts in *Y*** → that version is updated in place (this is how typos are fixed);
  - otherwise the version that covers *Y* is **split at *Y***: the old values keep `[start, Y)` and the new values get `[Y, old end)`;
  - **later versions:** each changed field is also changed in every later version **only where that later version still holds the value being replaced**. A value changed on purpose in a later version is kept.
- *Y* must be within the entry's life: not before its first year, and not on or after the year it ends (if inactivated or deleted).
- *Y* earlier than the current year is a back-date (R-ORG-005).
- Fields that are versioned: name, acronym, level, parent, director (R-ORG-016). Code is not versioned (R-ORG-002).

#### Scenario: Three years without change
- GIVEN entry `ORG-057` was created in 2026 and never edited
- WHEN the year views for 2026, 2027 and 2028 are read
- THEN all three return the same version of `ORG-057`
- AND IT MUST be stored as one version row `[2026, open)`

#### Scenario: Move from next year
- GIVEN `ORG-057` is under Department A since 2026 and today is in 2026
- WHEN an Admin moves it to Department C, applying from 2027
- THEN `ORG-057` has two versions: `[2026, 2027)` under A and `[2027, open)` under C
- AND the year view for 2026 shows it under A, and 2027 under C
- BUT it must NOT create a version for any other entry

#### Scenario: Typo fix in the current version's year
- GIVEN `ORG-057`'s current version starts in 2026 and today is in 2026
- WHEN an Admin fixes its name, applying from 2026
- THEN the version is updated in place and no version is added
- AND IT MUST record the old and new name in the change log

#### Scenario: A later deliberate change is kept
- GIVEN `ORG-057` is named *Data Science* in `[2026, 2028)` and *Data & AI* in `[2028, open)`
- WHEN an Admin changes the director, applying from 2026
- THEN the new director appears in both versions
- WHEN an Admin instead fixes the name to *Data Sciences*, applying from 2026
- THEN only `[2026, 2028)` changes
- BUT it must NOT overwrite *Data & AI*

**Acceptance criteria**
- [ ] AC.1 — The database rejects two versions of one entry starting in the same year (unique index).
- [ ] AC.2 — After any sequence of saves, an entry's versions are contiguous, non-overlapping and ordered (service invariant, tested).
- [ ] AC.3 — A save on one entry changes no row of any other entry.

### R-ORG-005 — Back-dating

- **As an** Admin **I want** to record a change that should have applied earlier **so that** past years show the real structure.

**Details**
- A save with *Applies from year* earlier than the current year is a back-date. The form offers it only when **Back-date** is ticked (off by default), and shows a warning that reports for those years will be recalculated. The server rejects a back-dated save that does not carry the explicit back-date flag (`400`).
- A back-date follows the same rules as R-ORG-004 (split, in place, later versions).
- Creating an entry with a first year earlier than the current year is also a back-date.

#### Scenario: Back-date without the flag
- GIVEN today is in 2027
- WHEN an Admin saves a change applying from 2026 without the back-date flag
- THEN the request fails with `400`
- AND IT MUST NOT change any version

#### Scenario: Back-date with the flag
- GIVEN today is in 2027 and `ORG-057` was under A in 2026
- WHEN an Admin moves it to C applying from 2026 with the flag
- THEN the 2026 and 2027 year views show it under C
- AND the change log records the back-date with both the year it applies from and the timestamp it was entered

**Acceptance criteria**
- [ ] AC.1 — Back-date without flag → `400`; with flag → saved and logged with `backdated = true`.
- [ ] AC.2 — The UI shows the warning before saving a back-date.

### R-ORG-006 — Year view

- **As an** Admin **I want** to see the structure of any year **so that** I can answer *which units were active then* and check what reports use.

**Details**
- Inputs: a year (default: the current year).
- Behavior: returns every entry that has a version covering that year, with that version's values, including entries that were **inactivated or deleted in a later year**. Entries not yet created, or already ended, in that year are excluded unless *Show inactive / deleted* is on; with it on they appear with their status and the year it took effect.
- Entries with a version that starts after the viewed year are badged *Change scheduled in <year>*.
- Selectable years: from the earliest version year to the latest year that has a version start, at least the current year.

#### Scenario: Deleted later, visible before
- GIVEN unit `ORG-090` was deleted from 2027
- WHEN an Admin views 2026
- THEN `ORG-090` appears with its 2026 name, parent and director
- WHEN the Admin views 2027
- THEN `ORG-090` is not shown
- AND IT MUST appear with status *Deleted (from 2027)* when *Show inactive / deleted* is on

#### Scenario: Which units were active one year ago
- GIVEN today is in 2027
- WHEN an Admin views 2026 and filters the table to level L4
- THEN the table lists exactly the units whose version covers 2026

**Acceptance criteria**
- [ ] AC.1 — The year view for year *N* equals, for each entry, the version with `from ≤ N < to` (or `to` empty).
- [ ] AC.2 — An entry ended in year *E* appears in every view for a year before *E* and in none from *E* (unless *Show inactive / deleted*).
- [ ] AC.3 — Scheduled changes are badged.

### R-ORG-007 — Inactivate, successor and reactivate

- **As an** Admin **I want** to end an entry from a year, optionally naming who takes over **so that** merges and closures keep past data intact.

**Details**
- Inputs: the year it ends from (default: the current year; earlier = back-date, R-ORG-005), an optional successor, which must be an active entry of the same level in that year.
- Behavior: the entry's last version ends at that year; the entry is marked inactive from that year. Its records are not rewritten; consumers can follow the successor (R-ORG-010).
- Blocked (F-5) while the entry has **children active in that year or later**; the message names them and offers to move or inactivate them first.
- Reactivate: from a year (≥ the year it ended), creating a new version with its last values; the successor link is cleared.

#### Scenario: Merge
- GIVEN units `ORG-060` and `ORG-061`, both under the same department
- WHEN an Admin inactivates `ORG-061` from 2027 with successor `ORG-060`
- THEN the 2027 view omits `ORG-061` and the 2026 view still shows it
- AND reading `ORG-061` returns successor `ORG-060`

#### Scenario: Active children block
- GIVEN Department `ORG-010` has two units active in 2027
- WHEN an Admin inactivates `ORG-010` from 2027
- THEN the request fails with `409` naming the two units
- BUT it must NOT change any version

**Acceptance criteria**
- [ ] AC.1 — Inactivate → `200`; blocked → `409` naming the children.
- [ ] AC.2 — Reactivate creates one new version from the chosen year.
- [ ] AC.3 — A successor of another level, or not active that year → `400`.

### R-ORG-008 — Delete

- **As an** Admin **I want** to remove an entry created by mistake or no longer needed **so that** the current structure stays clean without losing history.

**Details**
- **Physical delete** only when the entry **did not exist before the current year** (its first version starts in the current year or later) **and** it has no associated information and no children. This covers an entry created by mistake this year. The entry, its versions and its code disappear; the change log keeps the delete record. No earlier year view is affected, because the entry was never in one.
- **Any other delete is logical:** the entry ends from a year (default: the current year; it must be later than the entry's first year) and is marked *Deleted*. It cannot be reactivated. It stays in the database and in every earlier year view.
- Blocked (F-5) while it has children active in that year or later, or associated information. The dialog names the blocker and offers *Inactivate* or moving the children instead.
- The dialog states that the entry will stay visible in earlier years.

#### Scenario: Logical delete
- GIVEN unit `ORG-090` has existed since 2026, with no children or linked records
- WHEN an Admin deletes it from 2027
- THEN it is marked *Deleted (from 2027)* (`200`)
- AND IT MUST still appear in the 2026 view

#### Scenario: Physical delete of an entry created this year
- GIVEN today is in 2026 and `ORG-118` was created applying from 2026 (or later), with nothing linked
- WHEN an Admin deletes it
- THEN its rows are removed and code `ORG-118` becomes free
- AND the change log keeps a delete record with its last values

#### Scenario: Linked records block
- GIVEN a registered consumer reports 5 records linked to `ORG-057`
- WHEN an Admin deletes `ORG-057`
- THEN the request fails with `409` stating the count and proposing *Inactivate*

**Acceptance criteria**
- [ ] AC.1 — No path deletes a row of an entry whose first version starts before the current year.
- [ ] AC.2 — Delete with children or associated information → `409`.
- [ ] AC.3 — A deleted entry cannot be reactivated or edited (`409`).

### R-ORG-009 — Change log

- **As an** Admin or auditor **I want** every change recorded **so that** I can see who changed what and when, even inside a year.

**Details**
- Every write — create, in-place edit, new version, back-date, inactivate, reactivate, delete (logical or physical) — appends one log entry with: entry ID, action, user, timestamp, *Applies from year*, back-date flag, and old → new values of each changed field.
- The log is **append-only**: there is no endpoint to edit or delete it, and it survives a physical delete of its entry.
- The form's **History** tab shows the entry's versions (one row per year range) and its log, newest first.

#### Scenario: Log survives everything
- GIVEN `ORG-118` was created and then physically deleted
- WHEN an Admin reads the change log filtered by its ID
- THEN both the create and the delete records are returned

**Acceptance criteria**
- [ ] AC.1 — Every write action produces exactly one log entry with the listed fields.
- [ ] AC.2 — No route updates or deletes log entries.

### R-ORG-010 — Read contract for consumers

- **As a** STAR module **I want** to resolve an entry for a year **so that** I can store only its ID and still show and roll up correctly (F-9).

**Details**
- A consumer stores the entry's permanent ID and nothing else from it.
- The module exposes (to other server modules, and as an authenticated read endpoint):
  - **resolve(ids, year)** → for each ID, the version covering that year (name, acronym, level, parent ID, director staff ID with name and email) and its status that year;
  - **ancestors(id, year)** → the chain up to L1 as of that year (for roll-ups by department or division);
  - **successor chain(id)** → successors in order (for an optional *include predecessors* view, Q-4);
  - **existence check(id)** → for consumers to validate before storing an ID.
- Consumers register with this module (as Control Lists does) to report how many of their records use each entry; the count drives *Linked data* and the delete/inactivate block (R-ORG-007, R-ORG-008).
- **A consumer resolves an entry with the structure of its record's year** (Q-2: the record's reporting year; each consumer spec names the exact field).

#### Scenario: KPI history continues through a move
- GIVEN `ORG-057` has KPI values for 2026–2030 and moved from Department A to C from 2029
- WHEN a consumer lists the values of `ORG-057`
- THEN all five years come back as one series under ID 57
- AND rolling up by department puts 2026–2028 under A and 2029–2030 under C
- BUT it must NOT require rewriting any stored value

**Acceptance criteria**
- [ ] AC.1 — `resolve` and `ancestors` return the version for the requested year, including ended entries for years before their end.
- [ ] AC.2 — A test consumer registered in the test suite drives *Linked data* and the delete block.

### R-ORG-011 — Control-list consumer wiring (carried over from Control Lists)

- **As the** Control Lists module **I want** this module to register as the first `org.level` consumer **so that** a level value in use cannot be deleted and *Used by* shows it.

**Details** (control-lists archive §9, F-4):
- register the consumer once, from a singleton at module start (the registry does not deduplicate);
- add a database FK from the stored level to the control-list value with `ON DELETE RESTRICT`;
- call `assertValueInList` before every write that stores a level;
- a value delete blocked by that FK returns `409`, not `500` (map the FK error on the Control Lists delete path).
- The `org.level` list is read **regardless of portfolio** (Q-1): this module uses the value's permanent ID and the list it belongs to, not a portfolio.

#### Scenario: Level in use
- GIVEN 94 entries use level value `L4 Unit`
- WHEN an Admin deletes `L4 Unit` in Control Lists
- THEN the request fails with `409` stating the count and proposing deactivation
- AND the `org.level` list shows *Used by: Organizational Structure › Level*

**Acceptance criteria**
- [ ] AC.1 — In-use count for each `org.level` value = number of versions using it.
- [ ] AC.2 — A raw FK violation on value delete surfaces as `409`.

### R-ORG-012 — Access control

- **As the** organization **we want** only Admins to change the structure (F-1).

**Details**
- Client: the page is reachable only through `centerAdminGuard`.
- Server: every write and every admin read requires `CENTER_ADMIN` or `SYSTEM_ADMIN`. The consumer reads (R-ORG-010) are open to any authenticated user, because forms and reports used by other users read them.

#### Scenario: Denied role
- GIVEN a user with only the Contributor role
- WHEN they call any write endpoint
- THEN the request fails with `403`
- BUT it must NOT change any data or append to the log

**Acceptance criteria**
- [ ] AC.1 — Contributor → `403` on every write; Center Admin and System Admin → success.
- [ ] AC.2 — A user without center-admin access does not see the menu item and cannot open the route.

### R-ORG-013 — Page layout and navigation

- **As an** Admin **I want** a page that shows the structure as a tree and as a table for a chosen year **so that** I can maintain it and check it quickly.

**Details**
- Menu: *Organizational Structure* appears in the nested *Portfolio Management* group, after *Control Lists* (F-3). Existing items do not change.
- Header: title, description, **Structure year** selector, **+ New entry**, view toggle **Tree / Table**, filter *Show inactive / deleted*.
- **Tree:** divisions › departments › offices › units, expand/collapse on container rows, the entry's code, name, acronym, director, status and *scheduled* badge.
- **Table:** R-ORG-014.
- **Form** (modal or side panel): Code*, Level*, Name*, Acronym, Parent*, Responsible director (staff search, R-ORG-016; its email shown read-only), **Applies from year***, **Back-date** checkbox with its warning. Actions: only **Cancel**, **Save** and, in edit mode, **Delete** (F-4); *Inactivate* / *Reactivate* sit next to Delete. Tabs: **Details**, **History** (R-ORG-009), **Linked data** (counts per registered consumer, or *No linked data yet*).
- Parent picker offers only entries of an allowed level that are active in *Applies from year*.
- UI states: **loading** (progress bar), **empty** (no entries: call to action *+ New entry*; no entries in the chosen year: message naming the year), **error** (inline message, retry), **success** (toast after each save, inactivate, reactivate or delete).

#### Scenario: Menu placement
- GIVEN an Admin expands *Center admin*
- THEN *Organizational Structure* appears indented under *Portfolio Management*, after *Control Lists*
- BUT it must NOT change the order, label or link of any existing item

#### Scenario: Empty module
- GIVEN no entries exist
- WHEN the page opens
- THEN it shows the empty state with *+ New entry*
- AND IT MUST allow creating the first L1 entry

**Acceptance criteria**
- [ ] AC.1 — The nested item renders in the expanded and the collapsed sidebar.
- [ ] AC.2 — Each of the four UI states renders, in both views.
- [ ] AC.3 — Changing the year reloads both views for that year.

### R-ORG-014 — Table standard (F-7)

- **As an** Admin **I want** the table view to behave like every new table **so that** I can sort, size, page and export it.

**Details**
- Reuse the shared `DataTable` from Control Lists: rows per page 10/25/50/100, resizable columns, sort with indicator, **default sort by code ascending, natural order** (`ORG-2` before `ORG-10`), search over code, name, acronym and director, **Export .xlsx** of the filtered and sorted rows for the chosen year. The file name includes the year.
- Columns: ID · Code · Level · Name · Acronym · Parent (code + name, as of the year) · Director · Status · Since (year of the version shown).

#### Scenario: Export of a past year
- GIVEN the year selector is on 2026 and the search is `data`
- WHEN the Admin exports
- THEN the `.xlsx` holds exactly the matching rows of the 2026 view, in screen order, and its name contains `2026`

**Acceptance criteria**
- [ ] AC.1 — Default order is natural by code.
- [ ] AC.2 — Export rows equal the filtered and sorted rows of the chosen year.

### R-ORG-015 — Seed data

- **As the** requester **I want** the page to open with the current structure **so that** a colleague can review it (F-8).

**Details**
- 3 divisions · 19 departments/regions · 1 office · 94 units from Master Monitoring Framework sheet *04. ORG structure*; DT = Technology Integration; the three units with no parent in the sheet are placed under the parent they appear with. Every entry has one version `[2026, open)`. Seeded entries carry fixed IDs, so they are the same in every environment.
- Directors are matched to `alliance_user_staff` by email, else by exact first + last name. With no single match the director stays empty and the entry is listed in a seed report for the requester to complete.
- The seed is idempotent and logged as one *seed* entry per entry in the change log.
- The module also works with no entries (R-ORG-013 *Empty module*).

#### Scenario: Seed runs twice
- GIVEN the seed already ran
- WHEN it runs again
- THEN no entry, version or log row is added

**Acceptance criteria**
- [ ] AC.1 — After migration: 117 entries (3 / 19 / 1 / 94 by level), 117 versions, all from 2026.

### R-ORG-016 — Responsible director from Agresso staff

- **As an** Admin **I want** to pick the director from the Alliance staff list **so that** the director is a real person whose name and email stay current, and is not typed by hand (requester, 2026-10-08).

**Details**
- The director is chosen from `alliance_user_staff`, the staff table that the existing Agresso staff sync fills. The version stores the staff ID (`carnet`) only. Name and email are read from the staff table whenever the entry is shown or exported.
- The field is optional. It is versioned like the other fields (R-ORG-004), so a change of director applies from a year and earlier years keep the earlier director.
- The picker searches staff by name or email (at least 2 characters) and offers only staff whose status is active. A version that already stores a staff member who later became inactive keeps that director and shows it with an *Inactive staff* mark.
- A write with an unknown staff ID fails with `400` naming `director`. Write bodies accept only the staff ID; a name or email for the director is rejected (`400`).

#### Scenario: Pick a director
- GIVEN staff member *Ana Pérez* (`carnet` A1234, active) exists
- WHEN an Admin searches `pére` and picks her for `ORG-057`, applying from 2026
- THEN the version stores `A1234`
- AND the form shows her email read-only

#### Scenario: Director leaves later
- GIVEN `ORG-057`'s 2026 version has director `A1234`, and her staff status later becomes inactive
- WHEN an Admin views 2026
- THEN `ORG-057` still shows *Ana Pérez* with the *Inactive staff* mark
- BUT the picker must NOT offer her for a new selection

#### Scenario: Unknown staff ID
- GIVEN no staff member has `carnet` Z9999
- WHEN a write sends director `Z9999`
- THEN the request fails with `400` naming `director`

**Acceptance criteria**
- [ ] AC.1 — The version stores only the staff ID; name and email come from the staff table.
- [ ] AC.2 — Unknown staff ID → `400`; director name or email in the body → `400`.
- [ ] AC.3 — Past versions keep their director after the staff row changes.

---

## 6. Non-functional requirements

| ID | Category | Target | How verified |
| --- | --- | --- | --- |
| NFR-ORG-001 | performance | Year view of ≤ 500 entries: p95 ≤ 300 ms on Dev; `resolve` of 100 IDs ≤ 100 ms | integration timing, 3 runs; inconclusive if runs vary more than 30 % |
| NFR-ORG-002 | integrity | One version per entry per year enforced by a DB unique index; no overlaps or gaps, enforced by the service inside one transaction per save | migration review + integration duplicate insert + invariant test after random save sequences |
| NFR-ORG-003 | integrity | Change log append-only: no update/delete route; the entry ID in the log has no FK cascade | controller route inventory test + physical-delete integration test |
| NFR-ORG-004 | security | Every write declares `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)`; no write reachable by machine tokens | unit tests per handler (allowed + denied) |
| NFR-ORG-005 | a11y | Tree is keyboard-navigable (arrow keys expand/collapse); icon buttons have `aria-label`; sort headers expose `aria-sort`; modals trap focus | component tests + manual keyboard pass at HITL |
| NFR-ORG-006 | dx | Swagger on every endpoint | code review |
| Inherited | — | `ServerResponseDto`, `AuditableEntity`, `GlobalExceptions`, unversioned `/api/...` routes (root `CLAUDE.md` §4.1) | existing gates |

## 7. Data requirements

- New tables (no `portfolio_id`): entries (permanent ID, code, status, status-from year, successor), versions (entry, from year, to year, name, acronym, level value ID, parent entry ID, director staff ID), change log (append-only).
- Unique indexes: entry code; version `(entry, from year)`.
- FKs: version → entry; version parent → entry; version level → control-list value (`ON DELETE RESTRICT`, R-ORG-011); version director → `alliance_user_staff.carnet` (`ON DELETE RESTRICT`, R-ORG-016); entry successor → entry.
- Migrations are append-only; the seed ships in a migration with fixed IDs.
- No OpenSearch fields.

## 8. API surface delta

Resource base `/api/organizational-structure` (unversioned). Admin CRUD and lifecycle actions (create, save version, inactivate, reactivate, delete), year view, entry detail with versions and log, code proposal; consumer reads (resolve, ancestors, successors). Exact routes in `design.md`.

## 9. Cross-system impact

Agresso, indirectly: the director reads the staff table that the existing Agresso staff sync fills (`domain/tools/agresso/staff/`); no change to the sync. Inside STAR: registers a consumer with Control Lists and maps one FK error there (R-ORG-011); sidebar, routes, new page.

## 10. Defect classes and their gates

| Defect class | Gate |
| --- | --- |
| **Wrong year resolution** (off-by-one on `[from, to)`, open-ended `to`) | Service unit tests on boundary years (`from`, `to − 1`, `to`, open) + integration year-view test on seeded and edited data |
| **Version overlap, gap or duplicate year** after a sequence of saves | DB unique index + invariant check run after every save in a table-driven unit test of save sequences (split, in place, back-date, inactivate, reactivate) |
| **Later deliberate change overwritten** by an earlier save | Unit test: *A later deliberate change is kept* scenario |
| **Another entry touched** by a save | Integration test: row checksum of all other entries unchanged |
| **Cycle / invalid parent level / inactive parent** accepted | Unit tests per rule, including a cycle that only appears in a later scheduled version |
| **History lost on delete or inactivate** | Integration test: deleted/inactivated entry present in earlier year views; row still in DB |
| **Change log mutable or incomplete** | Route inventory test (no update/delete); one log row per action, asserted per action |
| **Authorization leak** | Unit tests per handler: allowed and denied roles |
| **Level from the wrong list / level value deleted while used** | Unit test with `assertValueInList` failing; integration test: value delete → `409` via FK mapping |
| **Director not a staff member / name typed by hand** | Unit test: unknown `carnet` → `400`; DTO rejects name/email fields |
| **Director of a past version lost when staff data changes** | Integration test: change the staff row's status; past versions still resolve the same staff ID with current name/email |
| **Consumer contract wrong** (resolve/ancestors) | Unit + integration tests with a registered test consumer |
| **Seed counts wrong or not idempotent** | Migration run twice on the local development database; counts 117 / 117 / 3-19-1-94 |
| **Natural sort / export content** | Reused `DataTable` tests + one page test with `ORG-2`/`ORG-10` and export of a filtered year |
| **Type/compile errors hidden by the runner** | `npm run build` (server), `ng build` (client) |
| **Sidebar regression** | Existing `alliance-sidebar` suite + new assertion on order |
| **Tree rendering, expand/collapse, column resize** (rendered geometry) | **No automated check in jsdom.** Substitute: manual check in a real browser at the HITL pause |
| **Visual fidelity to the mockup** | **No automated check.** Substitute: human side-by-side review against `../mockup/OrgStructure.dc.html` at the HITL pause, accounting for the drift listed in the proposal §8 |
| **Seed content matches the source sheet** (names, parents) | **No automated check against the sheet.** Substitute: requester review of the seeded tree at the HITL pause. Accepted risk otherwise; all seeded values are editable |

## 11. Assumptions, dependencies, risks

| Item | Note |
| --- | --- |
| Dependency | Control Lists (`org.level`, registry, `assertValueInList`, `DataTable`, nested menu) — done |
| Assumption | "Current year" is the server's calendar year (UTC) |
| Assumption | Agresso staff rows are updated by the staff sync but never deleted (`base-control-list-save.ts:39-41` saves/upserts; `agresso-staff-tools.service.ts:34-46`), so a stored director ID keeps resolving. The FK (R-ORG-016) is the backstop if that ever changes |
| Risk | Director names in the source sheet may not match staff records. Mitigation: the seed matches by email or exact name, leaves the director empty when there is no single match, and lists the unmatched ones for the requester (R-ORG-015) |
| Risk | Mid-year reorganisations appear only from the year chosen (accepted by the requester, proposal §12) |
| Risk | A consumer forgets to register → an entry with linked records becomes deletable. Mitigation: consumers also add an FK to the entry ID; each consumer spec cites R-ORG-010 |
| Risk | Back-dates change published totals. Mitigation: explicit flag, warning, log |
| Risk | Q-1: `org.level` belongs to Portfolio 2. If Portfolio 2's list is deleted or replaced, levels break. Mitigation: FK RESTRICT on the value; global lists later (F-2) |

## 12. Open questions

None blocking. Q-1…Q-4 were accepted as recommended (proposal §12, 2026-10-08). Q-2 leaves the exact year field to each consumer spec.

## 13. Requirement ID index

| ID | Title |
| --- | --- |
| R-ORG-001 | One global structure |
| R-ORG-002 | Permanent ID and editable code |
| R-ORG-003 | Levels and hierarchy rules |
| R-ORG-004 | Versions per year |
| R-ORG-005 | Back-dating |
| R-ORG-006 | Year view |
| R-ORG-007 | Inactivate, successor and reactivate |
| R-ORG-008 | Delete |
| R-ORG-009 | Change log |
| R-ORG-010 | Read contract for consumers |
| R-ORG-011 | Control-list consumer wiring |
| R-ORG-012 | Access control |
| R-ORG-013 | Page layout and navigation |
| R-ORG-014 | Table standard (F-7) |
| R-ORG-015 | Seed data |
| R-ORG-016 | Responsible director from Agresso staff |
| NFR-ORG-001…006 | Performance, integrity ×2, security, a11y, dx |

## 14. Sign-off

- [ ] Engineering lead — _TBD_
- [ ] Product owner — Hector F. Tobón
- [ ] Security review (roles on new endpoints) — _TBD_
