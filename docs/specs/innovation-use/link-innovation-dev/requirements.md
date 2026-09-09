# Requirements — Innovation Use / Link to a reported Innovation Development output

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/link-innovation-dev/` |
| Parent Spec | `docs/specs/innovation-use/` — child row **#4** |
| Type | **Change** |
| Depth | **Standard**, with the Full-depth **Rollout** and **Rollback** sections carried in `design.md` — mandatory here because the work ships two append-only migrations, one of which rewrites a stored function that gates submission. The *logic* is modest; the *irreversibility* is not, and depth follows the irreversibility. |
| Approval Mode | **pre-approved** (d.casanas@cgiar.org, 2026-09-09) |
| Module prefix | `IUL` (Innovation Use — Link). Verified unused across `docs/` on 2026-09-09. |
| Source | [`proposal.md`](proposal.md), approved 2026-09-09 with OQ-1/2/3 answered |
| Phase 1 gate | **auto-approved (pre-approved mode)** — 2026-09-09 |
| **Amendment 01** | **2026-09-09** — user supplied a mock after Phase 3. The field becomes **its own card** titled *RELATED INNOVATION DEVELOPMENT*, placed **below the level-stepper card**; the display format gains the platform prefix; and the selected result carries a labelled **"View innovation detail ↗"** button instead of being a whole-card link. Affects R-IUL-004, R-IUL-007, R-IUL-012 and the new R-IUL-013. **Server contract unchanged except for one added read field.** Mock: [`mockup/`](mockup/) |
| Created | 2026-09-09 |

---

## 1. Executive Summary

An Innovation Use result must name the innovation it reports on. This spec adds **one required,
single-valued link** from an Innovation Use result (indicator 6) to an already-reported **Innovation
Development** result (indicator 2), stored in the existing `link_results` table under a **new** role
(`5`), surfaced as the last field of the *INNOVATION USE DETAILS* card, and enforced by the section's
green check.

**Three user rulings bind this spec** (2026-09-09) and are requirements, not assumptions:

| Ruling | Requirement |
| --- | --- |
| *"todos los inno dev"* | No ownership, contract or center filter on the options list — R-IUL-002 |
| *"todos los que estén activos"* | `is_active = TRUE` is the **only** row predicate; `result_status_id` is never filtered — R-IUL-002, R-IUL-009 |
| *"yo las ejecutaré contra la db real"* | No grandfathering: rule 16 applies uniformly to every existing result — R-IUL-009, R-IUL-011 |

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Innovation Dev** | A result with `indicator_id = 2` (`IndicatorsEnum.INNOVATION_DEV`) |
| **Innovation Use** | A result with `indicator_id = 6` (`IndicatorsEnum.INNOVATION_USE`) |
| **The link** | One `link_results` row: `result_id` = the Innovation Use result, `other_result_id` = the Innovation Dev result, `link_result_role_id = 5` |
| **Role 5** | New `link_result_roles` row, `INNOVATION_USE_LINKED_DEV` |
| **Green check** | The MySQL function `innovation_use_validation(result_code)`, which gates submission of the section |
| **Rule 16** | The new conjunct this spec appends to that function |
| **Official code** | `results.result_official_code` — a `bigint`, e.g. `284`. **Amendment 01:** displayed prefixed by `results.platform_code` (a **nullable** `varchar(50)`) as `STAR 284`, falling back to the bare number when the prefix is `NULL` (KZ-012). **Not** zero-padded — the 3-digit rule of the Links-to-Result section does not apply here |

---

## 3. System Context & Scope

### In scope

| Tier | Surface |
| --- | --- |
| Database | `link_result_roles` (1 seed row), `innovation_use_validation` (rewritten) |
| Server | `result-innovation-use` module (DTO, service, controller, module), `LinkResultRolesEnum` |
| Client | `innovation-use-details` page + its contract interface; reuse of `GetInnoDevOutputService` |

### Out of scope

- Reverse navigation (Innovation Dev → the Uses citing it).
- Many-to-many links; the Links-to-Result section (role 4); `innovation_dev_validation`.
- Enabling `policy-change.component.html`'s two disabled selects.
- Any ownership/contract restriction — **explicitly ruled out** by OQ-2.

---

## 4. Stakeholders / Personas

| Persona (PRD §3) | Interest |
| --- | --- |
| **Result reporter** | Must find, select and verify the right Innovation Dev without leaving the form |
| **Center admin / reviewer** | Needs the link present before a result can be submitted |
| **Data consumer (reporting)** | Gains a traceable Use → Dev edge |

---

## 5. Defect classes this spec can produce, and the gate for each

> Written before the verification commands were chosen, per the command's rule. A gate that cannot
> see the defect class is not a gate.

| # | Defect class | Gate | Can the gate actually see it? |
| --- | --- | --- | --- |
| **D-1** | Stored-function logic error — SQL precedence, `NULL` handling, a missing `is_active` | **Real-MySQL fixture spec** (the repo's `test/fixtures/innovation-use/` harness) | **Yes — and ONLY this.** A mocked `QueryRunner` records SQL *text* and never evaluates it (KZ-001). A structural migration spec asserts shape only and **must say so in-file** |
| **D-2** | Migration not applied → FK violation, `500` on every save | `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts`, **ANSI-stripped before counting** (K-014) | Partially. **No CI gate exists** — the pipeline deploys code and never applies migrations (K-015). Recorded as an **accepted risk**, mitigated by R-IUL-011's sequencing criterion and a human applier |
| **D-3** | The link write escapes the section transaction → half-saved section | Service spec asserting the `manager` is threaded through; e2e | Yes |
| **D-4** | A non-Innovation-Dev, or inactive, target is accepted | Service spec with a falsifying id (an indicator-4 result, and a soft-deleted indicator-2 result) | Yes |
| **D-5** | Cardinality drift — two rows persisted for one section | Type-level (scalar DTO field) + a service spec asserting exactly one active row | Yes |
| **D-6** | Clearing semantics inverted — an omitted key wipes the link, or an explicit `null` fails to | Service spec on **both** paths separately | Yes. This is the DD-14 trap already documented in `result-innovation-use.service.ts` |
| **D-7** | **Visual** — asterisk/amber-border/spacing wrong, card layout broken, the new section card mismatched against its siblings, dark theme unreadable | jsdom component spec asserts **class and DOM presence only** | **No.** jsdom cannot measure layout or evaluate contrast. **Substituted:** a human visual check against the running app at the Phase-3 HITL pause, plus a screenshot in the task's evidence. Recorded as a named gap, not covered by `npm test` |
| **D-8** | Navigation opens the wrong result, or in the same tab | Component spec asserting the **rendered** `<a href>` and `target` | Yes — provided it asserts the DOM, never a handler call (KZ-001) |
| **D-9** | Stale options list — a result created after page load is invisible | Component/service spec on the refresh path | Yes |
| **D-10** | Retroactive green-check break surprises reporters | **Not a code defect.** Accepted by user ruling (OQ-1); the applier owns timing and comms | N/A — recorded, not gated |

---

## 6. Functional requirements

### R-IUL-001 — A single link to one Innovation Development result

- **As a** result reporter
- **I want** to name the one Innovation Development output my Innovation Use report is about
- **So that** the use is traceable to the innovation it describes

The Innovation Use section **SHALL** expose exactly one link to one Innovation Dev result. The
section's contract **MUST** be single-valued; multiplicity **MUST NOT** be representable.

#### Scenario: One result is linked

- GIVEN an Innovation Use result with no link
- WHEN the reporter selects one Innovation Dev result and saves
- THEN exactly one active `link_results` row exists for that result under role 5
- AND the section returns that link on the next read
- BUT it must NOT create a second active row for role 5 under any input
- AND IT MUST leave rows of every other `link_result_role_id` for that result untouched

#### Scenario: Replacing the link

- GIVEN a saved link to Innovation Dev result `A`
- WHEN the reporter selects Innovation Dev result `B` and saves
- THEN exactly one active row remains, pointing at `B`
- AND the row for `A` is deactivated (`is_active = FALSE`), never hard-deleted
- AND IT MUST reactivate the existing row, preserving its `link_result_id`, if `A` is later
  re-selected — never insert a duplicate

> **Bounded, by design (`design.md` §3.2).** The single-active-row guarantee holds for **sequential**
> saves. It is **not** enforced against two concurrent `PATCH`es of the same section: `link_results`
> carries no unique index on `(result_id, link_result_role_id, is_active)`, MySQL cannot express a
> partial one, and a full one would break the soft-delete history the table depends on. Rule 16 uses
> `EXISTS`, so a doubled row still yields a correct green check and a single link in the UI. Recorded
> as an accepted limitation rather than an unmet requirement — raised by Judgment Day (A8).

---

### R-IUL-002 — Options list scope

The dropdown **SHALL** offer every **active** result whose `indicator_id = 2`, and nothing else.

#### Scenario: Only Innovation Dev, all of them

- GIVEN the reporter opens the dropdown
- THEN every listed option is an active result with `indicator_id = 2`
- AND options are **not** filtered by reporting project, contract, center, or creating user
- AND options are **not** filtered by `result_status_id` — a draft is selectable
- BUT it must NOT list results of any other indicator
- AND IT MUST NOT list a result whose `is_active` is false

> **Rulings encoded:** OQ-2 (*"todos los inno dev"*) and OQ-3 (*"todos los que estén activos"*).
> `is_active` is the sole predicate.

---

### R-IUL-003 — The field is required, using the section's existing invalid affordances

The field **SHALL** be marked required and **MUST** reuse the affordances already used elsewhere in
this section — a red asterisk on the label, an amber invalid border, and the message
*"This field is required"* — rather than introducing a new invalid style.

#### Scenario: Empty and required

- GIVEN an Innovation Use result with no link
- WHEN the section renders
- THEN the label carries a red asterisk
- AND the control carries the amber invalid border
- AND the message "This field is required" is visible
- BUT it must NOT block typing, saving a draft, or navigating away — the section saves partial work
- AND IT MUST use the same amber token and message string as the level stepper and the actor cards,
  not a new one

> **Draft-save is preserved deliberately.** `docs/specs/bugfix/innovation-use-draft-save` established
> that completeness in this section is enforced **at submit, through the green check** — never at
> save. R-IUL-003 marks the field required *visually and for submission*; it does not add a save-time
> rejection. R-IUL-009 is where "required" becomes binding.

---

### R-IUL-004 — The selected result renders as a card with a "View innovation detail" action

*(Amended 01 — supersedes the whole-card-link form.)*

The selection **SHALL** render beneath the control as a card showing the linked result's
**platform-prefixed code and title**, with a labelled action that opens that result in a separate
browser tab.

#### Scenario: Selected card

- GIVEN Innovation Dev result `284` on platform `STAR`, titled "Rice bean-adzuki bean multitrait near infrared reflectance spectroscopy prediction model", is linked
- WHEN the section renders
- THEN a card below the control reads `STAR 284 - Rice bean-adzuki bean multitrait near infrared reflectance spectroscopy prediction model`
- AND the same `<code> - <title>` format is used for the dropdown's own options and its collapsed value, so the two never disagree
- AND IT MUST fall back to the bare `result_official_code` when `platform_code` is `NULL` — the two are separate columns and the prefix is nullable (KZ-012)
- BUT it must NOT render the literal `null`, `undefined`, or a hard-coded `STAR` when the prefix is absent
- AND the card carries a right-aligned action labelled **"View innovation detail"** with an external-link affordance
- AND that action targets `/result/<official-code>/general-information` and opens in a **new** browser tab
- BUT it must NOT navigate the current tab, losing unsaved section data
- AND IT MUST be a real anchor — keyboard-reachable and activatable — carrying `rel="noopener"`, never a `click` handler on a non-interactive element
- AND IT MUST announce that it opens a new tab to assistive technology

#### Scenario: Changing the selection

- GIVEN a linked result is displayed
- WHEN the reporter picks a different Innovation Dev result from the dropdown
- THEN the card re-renders for the new result
- AND IT MUST NOT leave the previous result in the payload on the next save

> **No remove control (Amendment 01).** The mock exposes none, and the field is required — the only
> supported way to change it is to pick another option. The **server** still honours an explicit
> `null` as a clear (R-IUL-008); this requirement only says the **UI does not offer one**, so
> R-IUL-008's client half is not exercised by this surface.

---

### R-IUL-005 — The link persists in `link_results` under role 5

The link **SHALL** be written to `link_results` with `link_result_role_id = 5`, inside the same
transaction as the rest of the Innovation Use save.

#### Scenario: Atomic with the section

- GIVEN a save that includes both the link and an invalid actor row
- WHEN the request is processed
- THEN the whole request fails
- AND no `link_results` row is written
- BUT it must NOT leave the link written while the actors rolled back
- AND IT MUST thread the transaction's `manager` into the link write, never call the repository
  outside it

---

### R-IUL-006 — The server validates the link target

The server **SHALL** reject a link whose target is not an active Innovation Dev result, with `400`,
before any write occurs.

#### Scenario: Wrong indicator

- GIVEN a payload naming a result whose `indicator_id` is not 2
- WHEN the section is saved
- THEN the request fails with `400`
- AND nothing at all is persisted — not the link, not the level, not the actors
- BUT it must NOT report success with the link silently dropped
- AND IT MUST perform this validation **before** the transaction begins, so "nothing persisted" is a
  property of ordering rather than of rollback correctness

#### Scenario: Inactive target

- GIVEN a payload naming a soft-deleted (`is_active = FALSE`) indicator-2 result
- WHEN the section is saved
- THEN the request fails with `400`

#### Scenario: Self-reference

- GIVEN a payload naming the Innovation Use result itself
- WHEN the section is saved
- THEN the request fails with `400`
- AND IT MUST fail for the indicator reason alone — an indicator-6 result is never a valid target,
  so no separate self-reference rule is needed

---

### R-IUL-007 — The link is returned on read

`GET` on the section **SHALL** return the linked result with enough detail to render R-IUL-004's
card without a second request: its `result_id`, `result_official_code`, `title` and — **added by
Amendment 01** — its `platform_code`, without which the `STAR 284 - …` format cannot be produced.

#### Scenario: Read-back

- GIVEN a saved link
- WHEN the section is read
- THEN the response carries the linked result's id, official code, title and platform code
- AND when no link exists the field is present and null, never absent
- BUT it must NOT return a deactivated link row
- AND IT MUST NOT throw when the section has no link — an unlinked section reads normally

---

### R-IUL-008 — Omitted-key and explicit-null semantics

An **omitted** key **SHALL** preserve the stored link. An **explicit null** **SHALL** clear it.

#### Scenario: Omitted key preserves

- GIVEN a saved link to result `A`
- WHEN a `PATCH` omits the link key entirely
- THEN the link to `A` survives unchanged
- AND IT MUST survive with the same `link_result_id`, not be deleted and re-created

#### Scenario: Explicit null clears

- GIVEN a saved link to result `A`
- WHEN a `PATCH` sends the link key with value `null`
- THEN the row for `A` is deactivated
- AND no active role-5 row remains
- BUT it must NOT be confused with the omitted case — `undefined` and `null` MUST take different
  paths

> This is the exact trap DD-14 documents in `result-innovation-use.service.ts`: `??` cannot
> distinguish an omitted key from an explicit `null`. Use `!== undefined`.

---

### R-IUL-009 — The green check requires the link

`innovation_use_validation` **SHALL** return `FALSE` while the section has no valid link.

#### Scenario: Rule 16

- GIVEN an Innovation Use result that is otherwise complete
- WHEN it has no active role-5 `link_results` row
- THEN `innovation_use_validation` returns `FALSE`
- AND when a valid link is added it returns `TRUE`
- BUT it must NOT be satisfied by a deactivated row, nor by a row of another role, nor by a row whose
  target is inactive or not indicator 2
- AND IT MUST NOT weaken, reorder or drop any of rules 2–15 already in that function
- AND IT MUST NOT touch `innovation_dev_validation`

#### Scenario: No grandfathering

- GIVEN Innovation Use results that existed before this change
- WHEN the migration is applied
- THEN those results are also gated by rule 16
- AND IT MUST NOT carry a created-before cut-off clause of any kind

> **User ruling (OQ-1), recorded as a requirement.** The retroactive effect is intended: every
> pre-existing Innovation Use result goes green-check `FALSE` until linked. Timing and communication
> belong to the human who applies the migration.

---

### R-IUL-010 — Role 5 exists in the catalog

`link_result_roles` **SHALL** contain a row with id `5` before any code writes it.

#### Scenario: Seed

- GIVEN the migration is applied
- THEN `link_result_roles` has a row with `link_result_role_id = 5`
- AND its `down()` removes only that row
- BUT it must NOT alter or renumber roles 1–4
- AND IT MUST reuse `LinkResultRolesEnum` for the literal, never a bare `5` in the SQL

---

### R-IUL-011 — Release sequencing

The catalog seed **SHALL** be applied before the server code that writes role 5 is reachable in that
environment.

#### Scenario: Ordering

- GIVEN the server code is deployed to an environment
- WHEN the role-5 seed has not been applied there
- THEN saving the section would violate the `link_result_role_id` foreign key
- AND IT MUST therefore be verified — by the applier, per environment — that both migrations are
  applied before reporters reach the field
- BUT the verification must NOT read a raw `migration:show` count: that output carries ANSI escapes,
  which made `grep '^\[ \]'` report a confident zero while a migration was pending (K-014). Strip
  ANSI, and check the raw output for an error before counting

---

### R-IUL-012 — UI states of the control

The control **SHALL** present a defined state for loading, empty, populated and error.

#### Scenario: Four states

- GIVEN the section is loading
- THEN the control renders the section's existing skeleton, not an empty dropdown
- AND when the options list is empty the control is disabled with an explanatory tooltip
- AND IT MUST NOT show that empty state while the options request is still in flight — the list
  starts empty with `loading = true`, so a check that ignores loading fires on every section entry
- AND when a link is set the card of R-IUL-004 is shown
- AND when the options request fails the section's existing error surface is used
- BUT it must NOT render an enabled, empty dropdown that looks selectable but is not

---

### R-IUL-013 — The field occupies its own section card *(Amendment 01)*

The field **SHALL** live in its own titled card, **RELATED INNOVATION DEVELOPMENT**, positioned
immediately **after** the *INNOVATION USE DETAILS* card and **before** *ACTORS*.

#### Scenario: Placement

- GIVEN the Innovation Use page renders
- THEN a card titled `RELATED INNOVATION DEVELOPMENT` appears between *INNOVATION USE DETAILS* and *ACTORS*
- AND it uses the same card shell as the sibling sections — same radius, padding, border, background and bottom spacing
- AND its title uses the same `section-title` treatment as `ACTORS` and `ORGANIZATIONS`
- BUT it must NOT be nested inside the *INNOVATION USE DETAILS* card
- BUT it must NOT introduce a grid; the page uses a flat block flow
- AND IT MUST keep the level stepper, its definition box and the "Click here" definitions link inside the *INNOVATION USE DETAILS* card, above it — the new card is a sibling, not a relocation of any existing content

> **Supersedes the placement ruling of 2026-09-09** (*"Al final de INNOVATION USE DETAILS"*). The
> mock is the later and more specific instruction, and it shows a separate card.

---

## 7. Non-functional requirements

### NFR-IUL-001 — Options list responsiveness

- The dropdown **SHOULD** be interactive within the section's existing load budget.
- `GetInnoDevOutputService` fetches once at construction with `limit: 10_000`. The design **MUST**
  state whether the list is refreshed on section entry, and **MUST NOT** leave a result created
  after app start permanently invisible (D-9).
- **Disqualifier:** a timing figure taken while a delegated worker is active is not evidence — it
  competes for `node_modules`, ports and build output, and the result is wrong, not merely slow.
  Measure only in the window after a worker reports.

### NFR-IUL-002 — Accessibility

- The card link **MUST** be keyboard-reachable and operable, carry `rel="noopener"`, and its
  new-tab behavior **MUST** be discoverable to assistive technology.
- The required state **MUST** be conveyed by more than color alone — the asterisk and the text
  message both carry it.
- **Gap, declared:** jsdom cannot evaluate contrast or focus visibility. Those are checked by a human
  against the running app (D-7).

### NFR-IUL-003 — Design tokens and dark theme

- No hex literals. Token utilities (`.abc-*`, `.atc-*`, `.rs-*`, `.fs-*`) or `var(--ac-*)` only.
- The card **MUST** be legible in both light and dark PrimeNG Aura themes.
- **Known carry-over:** the Innovation Use module's QA sign-off (2026-09-09) covered light theme
  only; dark theme was not part of that pass. This requirement does not inherit that gap — it is
  checked here.

### NFR-IUL-004 — Test floors

- Server: Jest global coverage floor **60%** holds.
- Client: statements 40 / branches 20 / lines 45 / functions 30 hold.
- Verification is `npm test -- --silent` per package; failures print complete and verbatim.

---

## 8. Data requirements

| Item | Detail |
| --- | --- |
| New rows | `link_result_roles`: one row, id `5` |
| New columns | **None** — `link_results` already has every column needed |
| Rewritten object | `innovation_use_validation` (function), via `DROP` + `CREATE` |
| Backfill | **None.** Existing results are intentionally left unlinked and therefore green-check `FALSE` (R-IUL-009) |
| Soft delete | Replacing or clearing a link deactivates the old row; no hard delete |

---

## 9. API surface delta

| Endpoint | Change |
| --- | --- |
| `GET /api/v1/result-innovation-use/:code` | Response gains the linked-result field (R-IUL-007) |
| `PATCH /api/v1/result-innovation-use/:code` | Body accepts the link field; `400` on an invalid target (R-IUL-006) |

No new endpoint. No new controller. Swagger decorators are updated in place.

---

## 10. Cross-system impact

| System | Impact |
| --- | --- |
| Green check / submission | **Direct** — every Innovation Use result is re-gated (R-IUL-009) |
| Links-to-Result section (role 4) | None; role-partitioned |
| Innovation Dev section (role 2) | None; different `result_id` **and** different role |
| Report / export views | Several join `link_results` on role 4 only. **Unaffected** — but see OQ-5 |
| OpenSearch | No new searchable column |

---

## 11. Assumptions, dependencies, risks

| # | Item |
| --- | --- |
| A-1 | Family children 1–3 are archived/done; nothing blocks this chunk |
| A-2 | ~~Assumption~~ — **VERIFIED 2026-09-09, no longer an assumption.** `LinkResultsService.create` deactivates non-matching rows for the same `(result_id, role)`: passing one row upserts it and clears any other, passing `[]` clears all, and re-passing a previously cleared target **reactivates the same row** rather than duplicating it. Traced through `base-service.ts:115-203` + `array.util.ts:16-79`, with the empty-`IN` step settled at `node_modules/typeorm/query-builder/QueryBuilder.js:738-741` (`0=1`, so `Not(In([]))` is always true). |
| D-1 | A human with DB access applies both migrations (user, per OQ-1) |
| R-1 | K-015 — the pipeline does not apply migrations. See R-IUL-011 |
| R-2 | The stored function has already been rewritten once (`1787280000000`); `down()` must restore that body verbatim, not drop |
| R-3 | Retroactive green-check break — **accepted** by user ruling, not mitigated |
| R-4 | `app-select` is shared across many routes (KZ-002). Prefer page-local changes; if the shared component must change, the task requires a **full** client suite run |

---

## 12. Open questions

| # | Question | Status |
| --- | --- | --- |
| OQ-1 | Grandfathering? | **Closed** — no grandfathering; user applies migrations |
| OQ-2 | Ownership/contract filter? | **Closed** — all Innovation Dev results |
| OQ-3 | Draft results selectable? | **Closed** — all active ones, status not filtered |
| **OQ-4** | Exact copy for label, description and the role-5 name | **Open, cosmetic.** Default: label *"Link to a reported Innovation Development output"* (reusing `policy-change`'s string verbatim); role name `'Innovation Use Linked Dev'` |
| **OQ-5** | Should the linked result appear in the Innovation Use report/export view? | **Open.** Out of scope unless answered yes |

---

## 13. Requirement ID index

| ID | Title | Tier |
| --- | --- | --- |
| R-IUL-001 | A single link to one Innovation Development result | Server + Client |
| R-IUL-002 | Options list scope | Client |
| R-IUL-003 | The field is required, using existing invalid affordances | Client |
| R-IUL-004 | Selected result renders as a clickable `official-code - title` card | Client |
| R-IUL-005 | The link persists in `link_results` under role 5 | Server |
| R-IUL-006 | The server validates the link target | Server |
| R-IUL-007 | The link is returned on read | Server + Client |
| R-IUL-008 | Omitted-key and explicit-null semantics | Server |
| R-IUL-009 | The green check requires the link | Database |
| R-IUL-010 | Role 5 exists in the catalog | Database |
| R-IUL-011 | Release sequencing | Ops |
| R-IUL-012 | UI states of the control | Client |
| R-IUL-013 | The field occupies its own section card *(Amendment 01)* | Client |
| NFR-IUL-001 | Options list responsiveness | Client |
| NFR-IUL-002 | Accessibility | Client |
| NFR-IUL-003 | Design tokens and dark theme | Client |
| NFR-IUL-004 | Test floors | Both |

---

## 14. Sign-off

| Gate | State |
| --- | --- |
| Phase 1 (requirements) | **auto-approved (pre-approved mode)**, 2026-09-09. Amended 2026-09-09 after Judgment Day: A-2 verified, R-IUL-012's falsified precedent removed |
| Phase 2 (design) | **approved** — draft 2, after Judgment Day round 1 (see [`judgment.md`](judgment.md)) |
| Phase 3 (tasks) | pending |
