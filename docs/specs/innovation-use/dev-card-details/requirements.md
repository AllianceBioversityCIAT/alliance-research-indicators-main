# Requirements — Innovation Use / Innovation Dev card details

> **The answer first:** the linked-Innovation-Development card gains three read-only facts about the
> linked result — readiness level, description, geographic scope — read from columns that already
> exist. The card stops reading as a property list: the description is **unlabelled** body text under
> the title, and the two short fields share one labelled row beneath it.

---

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/dev-card-details/` |
| Parent Spec | `docs/specs/innovation-use/` — family child row **#5** |
| Type | **Change** |
| Depth | **Standard (lean)** — see the depth note below |
| Approval Mode | **gated** (inherited from `proposal.md`) |
| Module slug | `IUC` — Innovation **U**se **C**ard (siblings used `IUA` API, `IUP` page, `IUL` link) |
| Proposal | [`proposal.md`](proposal.md) — approved 2026-09-10 |
| Extends | `R-IUL-007` from family child #4, [`archive/2026-09-09-innovation-use--link-innovation-dev/`](../../archive/2026-09-09-innovation-use--link-innovation-dev/) |
| Depends on | none — children 1–4 `done` + archived |
| Branch in flight | `AC-1679-Create-the-innovation-use-section` |
| Created | 2026-09-10 |

> **Depth diverges from the proposal.** `proposal.md` recommended **Lite**. Lite's documented style is
> *"1 strictly focused task"*, and this work cannot be one task: the server lane and the client lane
> have **different verification harnesses** (server Jest over `src` vs. client Jest + jsdom over the
> rendered DOM) plus one property no harness can reach (layout, §4 `NFR-IUC-003`). Collapsing them into one
> task would put a client DOM assertion behind a server gate. **Standard, written lean** — full
> scenarios and clauses, no architectural boilerplate for a change that adds no architecture.

---

## 1. Context

The **RELATED INNOVATION DEVELOPMENT** card (delivered by child #4) shows only
`STAR 19707 - Climate Information Services Dissemination System Sanchez`. A reviewer of the module
asked for more:

> *"In terms of additional details to show in the card, I would say for sure the readiness level and
> the innovation short description; potentially, it would also be useful to include the geographic
> scope."*

Today a reporter must click **View innovation detail ↗** — a new tab — to learn anything about the
innovation they just linked. All three requested values already exist in the database; none are on
the wire.

**Explicitly NOT changing:** the link/save path, the picker's option list and its contract, the
requirement that the link is single-valued and mandatory, the anchor's URL format, and
`LinkResultsService.findAndDetails` (see `R-IUC-005`). No migration — every column exists.

PRD alignment: `docs/prd.md` — Innovation Use reporting. This spec adds no new user story; it
completes the card's information density.

---

## 2. Requirement numbering

`R-IUC-<NNN>` functional, `NFR-IUC-<NNN>` non-functional. Numbered in dependency order: the wire
contract first, then the render, then the constraints.

---

## 3. Functional requirements

### R-IUC-001 — The read response carries the linked result's readiness level

- **As an** Innovation Use reporter
- **I want** the linked innovation's readiness level available without a second request
- **So that** I can confirm I linked the right innovation at the right maturity

**Details:**

- Inputs: none — this is a read-side addition to `GET /api/results/innovation-use/:resultCode`
- Behavior: when a link exists, resolve the **linked** result's
  `result_innovation_dev.innovation_readiness_id` through
  `clarisa_innovation_readiness_levels` and return both its `level` (ordinal) and its `name`
- Outputs: `data.linked_innovation_dev.innovation_readiness` — `{ id, level, name }` or `null`
- Errors: none new. A linked result with no `result_innovation_dev` row, or with a null
  `innovation_readiness_id`, is a normal read that returns `null` for this key
- Permissions: unchanged, and **stated correctly** — the `@Get` handler carries **no `@Roles(...)`**
  and **no `ResultStatusGuard`**; the controller's own header says so verbatim (*"No `@Roles(...)`
  (DD-5): section access is JWT + `ResultStatusGuard` only"*), and `ResultStatusGuard` is on the
  `@Patch` only. Read access is gated by `JwtMiddleware` plus `@GetResultVersion()`. This spec adds
  no authorization and removes none — see `R-IUC-008`

**Acceptance criteria:**

- [ ] AC.1 — With a link to a result whose readiness is level 7, the response `data` carries
  `linked_innovation_dev.innovation_readiness` with that `level` and its CLARISA `name`
- [ ] AC.2 — With a link to a result whose `innovation_readiness_id` is NULL, the key is **present
  and `null`**, never absent
- [ ] AC.3 — With no link at all, `linked_innovation_dev` is `null` as today and the endpoint does
  not throw
- [ ] AC.4 — The readiness is read from the **linked** result, not from the Innovation Use result
  being viewed
- [ ] AC.5 — The response remains a `ServerResponseDto` envelope; `status` and `description` are
  unchanged from the current read

#### Scenario: Readiness present

- GIVEN an Innovation Use result linked to an Innovation Development result at readiness level 7
- WHEN the section is read
- THEN `linked_innovation_dev.innovation_readiness` carries `level: 7` and the CLARISA level name
- AND the four pre-existing sub-keys (`result_id`, `result_official_code`, `title`, `platform_code`)
  are byte-identical to what they were before this spec
- BUT it must NOT read the readiness of the Innovation Use result itself
- AND IT MUST return the key present-and-`null` — never omitted — when the linked result has no
  readiness recorded

---

### R-IUC-002 — The read response carries the linked result's description and geographic scope

- **As an** Innovation Use reporter
- **I want** to read what the linked innovation *is*, and where it applies
- **So that** I can verify the link without leaving the page

**Details:**

- Behavior: return the **linked** result's `results.description` verbatim, and the name of its
  `results.geo_scope_id` resolved through `clarisa_geo_scope`
- Outputs: `data.linked_innovation_dev.description` — `string | null`;
  `data.linked_innovation_dev.geo_scope` — `{ code, name } | null`
- The description is the field labelled *"Describe the result"* on General Information
  (`results.description`, max 400 chars) — **not** `result_innovation_dev.short_title`, which is a
  10-word title

**Acceptance criteria:**

- [ ] AC.1 — `description` returns the linked result's `results.description` text unmodified — not
  truncated, not trimmed to a word count, not HTML-escaped beyond the envelope's own serialization
- [ ] AC.2 — `geo_scope` returns the CLARISA scope name for the linked result's `geo_scope_id`
- [ ] AC.3 — Either key is **present and `null`** when its source column is NULL
- [ ] AC.4 — Both are read from the **linked** result, never from the Innovation Use result
- [ ] AC.5 — A `geo_scope_id` of `50` (`THIS_IS_YET_TO_BE_DETERMINED`) returns that scope's CLARISA
  name like any other — it is a real value, not a sentinel to suppress

#### Scenario: Description and scope present

- GIVEN a link to a result with a description and `geo_scope_id = 2` (Regional)
- WHEN the section is read
- THEN `description` carries the full text and `geo_scope.name` reads `Regional`
- BUT it must NOT truncate or reformat the description on the server — presentation is the client's
  concern (`R-IUC-004`)
- AND IT MUST NOT substitute an empty string for a NULL description: absent and empty are
  different facts

---

### R-IUC-003 — The card renders the three facts as prose, not a property list

- **As an** Innovation Use reporter
- **I want** the card to read like a summary of the innovation
- **So that** scanning it is faster than reading a table of labels

**Details** (user ruling 2026-09-10, binding):

| Element | Treatment |
| --- | --- |
| Title + anchor | Unchanged, on the first row |
| Description | **No label.** Body text directly beneath the title |
| Readiness level | Labelled `Readiness level:` |
| Geographic scope | Labelled `Geographic scope:` |
| The two labelled fields | **One row**, side by side, separated by whitespace |

Target shape:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  STAR 19707 - Climate Information Services Dissemination …   [View innovation ↗] │
│                                                                                  │
│  A digital advisory service that delivers localized seasonal forecasts to        │
│  smallholder farmers through SMS and community radio…                            │
│                                                                                  │
│  Readiness level: Level 7 - …          Geographic scope: Regional                 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**

- [ ] AC.1 — The description renders with **no label element** naming it
- [ ] AC.2 — `Readiness level:` and `Geographic scope:` render on the same row at desktop width
- [ ] AC.3 — Readiness renders as `Level <n> - <name>`, joining ordinal and name
- [ ] AC.4 — A `null` field renders **nothing** — no label, no empty value, no `null`, no `Level null`
- [ ] AC.5 — With all three `null`, the card renders exactly as it does today: title + anchor, and no
  empty rows or stray whitespace-only containers
- [ ] AC.6 — The existing title text and the **View innovation detail ↗** anchor keep their current
  text, href format and accessible name
- [ ] AC.7 — The readiness parts are guarded **individually**, not as one object: both
  `clarisa_innovation_readiness_levels.level` and `.name` are nullable, so an object-level guard alone
  renders `Level null - <name>` or a bare `Readiness level:` — strings this requirement forbids by
  name. With `level` null and `name` present, render the name alone; with both null, render nothing

#### Scenario: All three present

- GIVEN a link whose result has a readiness, a description and a geographic scope
- WHEN the card renders
- THEN the description appears as unlabelled text beneath the title
- AND `Readiness level:` and `Geographic scope:` appear together on a row beneath the description
- BUT it must NOT render a `Description:` label, nor any element whose text names the description field
- AND IT MUST keep the anchor's existing href format (`<platform_code>-<result_official_code>`,
  per child #4 Amendment 04) — this spec changes no URL

#### Scenario: Partially null

- GIVEN a link whose result has a readiness level but no description and no geographic scope
- WHEN the card renders
- THEN only the readiness row appears beneath the title
- AND no empty container, separator or label is left where the other two would have been
- BUT it must NOT render the string `null`, `undefined`, `Level null` or a bare `Readiness level:`
- AND IT MUST leave the labelled row's layout valid with one of its two fields absent — the
  remaining field is not centred, stretched or re-flowed into the description's place

---

### R-IUC-004 — A long description does not let the card grow without bound

- **As an** Innovation Use reporter
- **I want** the card to stay a summary
- **So that** a 400-character description does not push the rest of the page down

**Details:**

- `results.description` accepts up to 400 characters. Rendered in full at narrow widths this is
  several lines
- Behavior: the description is **clamped to 3 lines** with an ellipsis; the full text remains
  reachable via the existing **View innovation detail ↗** anchor
- The clamp is a **presentation** concern only — `R-IUC-002` AC.1 forbids truncating on the server

**Acceptance criteria:**

- [ ] AC.1 — The rendered description element carries a 3-line clamp
- [ ] AC.2 — The **full**, unclamped text is present in the DOM (clamping is visual, so the text stays
  available to assistive technology and to copy-paste)
- [ ] AC.3 — A short description is unaffected — no reserved empty lines, no forced height

#### Scenario: Maximum-length description

- GIVEN a linked result with a 400-character description
- WHEN the card renders
- THEN the description occupies at most 3 lines and the card's height stays bounded
- BUT it must NOT truncate the text in the DOM — only visually
- AND IT MUST NOT clamp by a character count, which would cut mid-word and vary with font metrics

---

### R-IUC-005 — No collateral change to shared link reads

- **As a** maintainer of the Policy Change module and of `GET /api/link-results/details/:resultCode`
- **I want** my responses unchanged
- **So that** an Innovation Use feature does not alter contracts I depend on

**Details:**

`LinkResultsService.findAndDetails` has **three** callers:

| Caller | Exposure |
| --- | --- |
| `ResultPolicyChangeService.findOne` | Policy Change details response |
| `LinkResultsController.findAndDetails` | **Generic authenticated endpoint** — `@ApiBearerAuth()`, absent from every `JwtMiddleware.exclude()` entry. *Not* anonymous; revisions 1–2 said "public" and that is withdrawn (`judgment.md` G3) |
| `ResultInnovationUseService.findOne` | This module |

Adding relations there would widen two responses nobody asked to change, one of them externally
visible. Child #4 declared this function out of scope for the same reason.

**Acceptance criteria:**

- [ ] AC.1 — `findAndDetails` returns the same relation set as before this spec
  (`{ indicator, result_status }` on `other_result`)
- [ ] AC.2 — The Policy Change details response is unchanged
- [ ] AC.3 — The `link-results` controller response is unchanged
- [ ] AC.4 — The new data is fetched by a read path **owned by Innovation Use**

#### Scenario: Shared reader untouched

- GIVEN the Policy Change module reading its links
- WHEN this spec is implemented
- THEN its response carries exactly the fields it carried before
- BUT it must NOT gain `innovation_readiness`, `description` or `geo_scope` on its linked results
- AND IT MUST NOT gain new relations, new queries or new latency from this spec

---

### R-IUC-006 — The existing contract is preserved exactly

- **As the** already-shipped STAR client
- **I want** the four existing `linked_innovation_dev` sub-keys untouched
- **So that** no coordinated release is required

**Details:**

`R-IUL-007` (child #4) fixed the shape as `result_id`, `result_official_code`, `title`,
`platform_code`, with `title` and `platform_code` explicitly coerced `undefined → null` so
`JSON.stringify` cannot drop them. This spec is **purely additive**.

**Acceptance criteria:**

- [ ] AC.1 — All four sub-keys keep their names, types and null-coercion semantics
- [ ] AC.2 — `linked_innovation_dev` is still `null` — not an object of nulls — when no link exists
- [ ] AC.3 — A client reading only the original four keys behaves identically
- [ ] AC.4 — The three new keys follow the same present-and-`null` rule (`R-IUL-007`'s own invariant)

#### Scenario: Old reader, new server

- GIVEN a client built before this spec
- WHEN it reads a section whose link has all three new fields populated
- THEN it renders exactly as it did before, ignoring the new keys
- BUT it must NOT encounter a renamed, retyped or removed key
- AND IT MUST NOT encounter `linked_innovation_dev` as an object when there is no link

---

### R-IUC-007 — The card shows the same three facts at selection time as after saving

- **As an** Innovation Use reporter
- **I want** the card to look the same the moment I pick an innovation as it does after I save
- **So that** I can verify the link *before* committing it, which is the point of showing the details

**Details** (user ruling 2026-09-10, binding — supersedes the earlier *"card only"* reading):

The card is populated **locally, from the chosen picker option**, at selection time — the client
constructs `linked_innovation_dev` in `onInnovationDevSelected` with four keys. The picker's option
list is an explicit non-goal, so it cannot carry the three new facts. Without this requirement the
card would show title + anchor at selection and gain the three fields only after a save, which
defeats *"verify the link without leaving the page"*.

Therefore a **targeted read** resolves the three facts for one result id on selection.

**Why the client cannot resolve them itself** (verified 2026-09-10, and the reason this is a server
requirement rather than a client one):

| Fact | Available client-side at selection? |
| --- | --- |
| `description` | **Yes** — `findResultsFilters` already selects `r.description` |
| `geo_scope_id` | **Yes** — already selected. But the **name** cannot be resolved safely: `GetGeoFocusService` is a **hardcoded client-side list missing code `3` (`MULTI_NATIONAL`)**, so such a result would render no scope. It is also a parallel taxonomy, which the client convention forbids — controlled vocabularies come from CLARISA |
| readiness | **No** — `innovation_readiness_id` lives on `result_innovation_dev`, not on `results`, and is not in the list payload |

**Acceptance criteria:**

- [ ] AC.1 — Selecting an option renders the three fields without a page reload and without saving
- [ ] AC.2 — The card's rendered content is **identical** at selection and after a save + re-read, for
  the same linked result
- [ ] AC.3 — The scope **name** comes from CLARISA via the server, never from a client-side list
- [ ] AC.4 — While the targeted read is in flight the card shows title + anchor and no partial or
  placeholder field values
- [ ] AC.5 — If the targeted read fails, the card still renders title + anchor and the link remains
  selectable and saveable — the three fields are **enrichment, never a gate on saving**
- [ ] AC.6 — Changing the selection replaces all three fields; none survive from the previous choice
- [ ] **AC.7 — A superseded in-flight response is discarded, not merged.** Selecting A then B while
  A's read is still in flight must never render A's values under B's title and anchor, whatever order
  the two responses settle in. The merge is conditional on the resolved id still being the selected
  one (`DC-15`)
- [ ] **AC.8 — A failed enrichment is recoverable without a save.** Re-selecting the same result after
  a failure re-attempts the read. The existing same-id early return must not turn one failure into a
  dead end for the rest of the session (`judgment.md` N-6)

#### Scenario: Select, then save

- GIVEN a reporter opens the picker and chooses an Innovation Development result
- WHEN the selection is made
- THEN the card renders the description, readiness level and geographic scope for that result
- AND after saving and re-reading the section the card renders exactly the same three values
- BUT it must NOT block, disable or delay the save while the targeted read is in flight
- AND IT MUST NOT leave a previous selection's readiness, description or scope visible after the
  selection changes
- AND IT MUST NOT resolve the geographic scope name from any client-side list

#### Scenario: Targeted read fails

- GIVEN the targeted read returns an error or times out
- WHEN the card renders
- THEN the card shows title + anchor exactly as it does today
- BUT it must NOT surface a blocking error dialog, nor mark the section invalid
- AND IT MUST leave the link savable — a failed enrichment read never prevents reporting
- AND IT MUST stay recoverable: re-selecting the same result re-attempts the read

#### Scenario: Responses settle out of order

- GIVEN a reporter selects result `A`, then selects result `B` before `A`'s read has resolved
- WHEN `A`'s response settles **after** `B` has become the selection
- THEN `A`'s response is discarded and the card shows only `B`'s values, or none while `B` resolves
- BUT it must NOT render `A`'s readiness, description or scope under `B`'s title and anchor —
  a mis-render across two innovations is worse than showing nothing
- AND IT MUST hold whichever order the two responses settle in, including `B` before `A`

---

### R-IUC-008 — The targeted read carries the same authorization posture as the section read

- **As a** platform maintainer
- **I want** the new read to expose nothing the section read does not already expose
- **So that** adding a convenience endpoint does not widen access

**Details:**

The three facts belong to an Innovation **Development** result, and child #4's `R-IUL-002` already
establishes that **any active** Innovation Dev result is linkable by anyone, with no ownership,
contract or center filter — the section read already returns that foreign result's `title` and
`result_official_code` on the same basis. The targeted read therefore adds **no new class of
exposure**, but it must not become a broader one either.

> ⚠️ **Revision 3 correction (`judgment.md` N-1).** Revisions 1–2 asserted the endpoint was *"guarded
> no more loosely than the section read"* and left the claim ungated: the five original acceptance
> criteria constrained the response shape, input arity, method, middleware and Swagger — **and nothing
> constrained the target set**, so the requirement written to prevent widening could not detect it.
> The section read's target is pinned by `SetUpInterceptor` → `ResultsUtil.setup()`, which hard-filters
> **`platform_code`**, **`is_active = true`** and **`is_snapshot = false`**; `GET /api/results` also
> hard-filters `is_active = TRUE AND is_snapshot = FALSE`. Unbounded, this endpoint would make
> soft-deleted and snapshot results' free text readable — **which no existing endpoint permits**.
> `AC.6`–`AC.9` below are the target-set constraint that was missing.

**Acceptance criteria:**

- [ ] AC.1 — The route sits behind `JwtMiddleware` — it is **not** added to the exclusion list
- [ ] AC.2 — It declares `@ApiTags`, `@ApiBearerAuth` and `@ApiOperation`, per the server convention
  for every new endpoint
- [ ] AC.3 — It returns **only** the three facts plus the result id — no audit fields, no user ids, no
  other section data
- [ ] AC.4 — It accepts a result id and nothing else; no filter, no free-text, no pagination
- [ ] AC.5 — It is a `GET` with no side effect: no write, no audit row, no status transition
- [ ] **AC.6 — The target set is bounded to `indicator_id = 2` (Innovation Development).** A result of
  any other indicator returns the same shape as an unknown id — it does not leak a different
  category's free text
- [ ] **AC.7 — The target set is bounded to `is_active = TRUE`.** A soft-deleted result is
  indistinguishable from an unknown id
- [ ] **AC.8 — The target set is bounded to `is_snapshot = FALSE`.** A snapshot row's free text is
  never returned
- [ ] **AC.9 — Out-of-bounds and unknown ids are indistinguishable.** All four cases (unknown,
  wrong indicator, inactive, snapshot) return the identical response, with no field, status code,
  timing or message that separates *"does not exist"* from *"exists but you may not read it"* — an
  endpoint that distinguishes them is an existence oracle over the results table

#### Scenario: Unauthenticated call

- GIVEN a request with no bearer token
- WHEN the targeted read is called
- THEN `JwtMiddleware` rejects it before the handler runs
- BUT it must NOT be added to any middleware exclusion list
- AND IT MUST NOT return partial data on an auth failure

#### Scenario: Out-of-bounds target

- GIVEN an authenticated caller and the id of a result that is soft-deleted, a snapshot, or of an
  indicator other than 2
- WHEN the targeted read is called with that id
- THEN the response is byte-identical to the response for an id that does not exist at all
- BUT it must NOT return that result's `description`, `geo_scope` or readiness
- AND IT MUST NOT distinguish the four out-of-bounds cases from one another, nor from an unknown id,
  by status code, message, field presence or timing

---

## 4. Non-functional requirements

### NFR-IUC-001 — The added read costs at most one bounded query

- **Category:** performance
- **Target:** at most **one** additional query per section read, independent of the number of actors,
  organizations or quantifications. The link is 0-or-1 rows by design (`R-IUL-007`), so this is not
  an N+1.
- **How verified:** the **emitted SQL** (`getQuery()`), in the `test:fixtures` tier — plus a unit
  assertion that the new fetch is invoked at most once per read.
- **Disqualifier — rewritten in revision 3 (`judgment.md` N-3), because the previous wording
  cancelled itself.** It read: *"if the implementation uses TypeORM `relations` rather than an
  explicit join, assert the generated SQL instead."* `design.md` DD-3 then adopted a `QueryBuilder`,
  which **is** an explicit join — so the disqualifier stopped firing and the governing verification
  reverted to the very mocked-repo call-count assertion it was written to forbid. The rule now holds
  **unconditionally**: *a query-count assertion over a mocked repository proves the call count, not
  the emitted SQL, and is not evidence for this NFR **or** for `DC-14` — whatever query API the
  implementation chooses.* Assert the SQL (`KZ-001`, `KZ-017`).

### NFR-IUC-002 — The new labels hold WCAG AA in both themes

- **Category:** a11y
- **Target:** ≥ **4.5:1** for `Readiness level:` / `Geographic scope:` labels **and** the description
  text, against their actual rendered background, in **light and dark**.
- **How verified:** the `contrastRatio` token-value assertion already established by
  `NFR-IUL-003` in `innovation-use-details.component.spec.ts` — computed from the `colors.scss` hex
  values for both `:root` and `[data-theme='dark']`.
- **Why this is stated and not inherited:** family child #3 archived with **two live light-theme AA
  defects**, one an eyebrow label at **2.9115:1** and one `.section-title` at **2.378:1** — both
  exactly the "small grey label beside a value" pattern these two labels reach for. Inheriting the
  module's light-only QA sign-off is what let those ship.
- **Disqualifier:** a contrast number computed against `--ac-white-1` when the element actually sits
  on `--ac-grey-100` (the card's own fill) is a green reading of the wrong pair. Name the background
  token the element is really on.

### NFR-IUC-003 — Layout is verified by a human, because no harness here can see it

- **Category:** a11y / dx
- **Target:** the rendered card matches `R-IUC-003`'s shape — description unlabelled beneath the
  title, the two labelled fields sharing one row, no orphaned containers when fields are null.
- **How verified:** **a human visual check at a HITL pause.** There is no automated gate.
- **Why — two independent reasons, both verified 2026-09-10:**
  1. The client suite runs in **jsdom**, which does not lay out. It cannot tell whether two elements
     render on the same row, whether a clamp actually clamps, or whether removing a null field left a
     visible gap.
  2. **The utility classes do not exist in the test environment at all.** There is no Tailwind in this
     build — no `tailwindcss` dependency, no `tailwind.config.*` — the utilities come from a **runtime
     CDN script** (`src/index.html`: `unpkg.com/@tailwindcss/browser@4.1.6`). Under jsdom that script
     never runs, so `line-clamp-3`, `flex-wrap` and `gap` are inert strings in a `class` attribute.
  A class-presence assertion therefore proves **presence, not effect** — and here it cannot be
  otherwise, because there is no stylesheet to have an effect.
- **What the automated checks cover instead:** that the elements exist, carry the right text, and
  carry the right classes. **They cannot conclude the layout is correct.** Recorded as an accepted,
  substituted gap — not an unacknowledged one (`KZ-017`).

---

## 5. Data requirements

**No migration. No schema change. No new index. No new OpenSearch field.** Every column read already
exists and was verified in place on 2026-09-10:

| Value | Column | Entity file |
| --- | --- | --- |
| Readiness id | `result_innovation_dev.innovation_readiness_id` | `ResultInnovationDev.innovation_readiness_id` |
| Readiness level + name | `clarisa_innovation_readiness_levels.level` / `.name` | `ClarisaInnovationReadinessLevel.level` / `.name` — **both `nullable: true`** |
| Description | `results.description` | `Result.description` |
| Geo scope id | `results.geo_scope_id` | `Result.geo_scope_id` |
| Geo scope name | `clarisa_geo_scope.name` | `ClarisaGeoScope.name` |

The `innovationReadiness` relation already exists on `ResultInnovationDev`, and `geo_scope` on
`Result`. Neither needs to be declared. *(Citations are by symbol, not line — revisions 1–2 carried
drifted line numbers here; `judgment.md` G2.)*

---

## 6. API surface delta

| Endpoint | Change |
| --- | --- |
| `GET /api/results/innovation-use/:resultCode` | `data.linked_innovation_dev` gains `innovation_readiness`, `description`, `geo_scope`. **Additive** — the four existing sub-keys are unchanged (`R-IUC-006`) |
| **NEW** — a targeted read returning the three card facts for one Innovation Dev result id | Required by `R-IUC-007`; authorization posture fixed by `R-IUC-008`. Exact path is a design decision |

**One new endpoint** (it was not in the original scope — it is the consequence of `R-IUC-007`'s user
ruling). No new controller: it belongs on the existing `result-innovation-use` controller, which
already carries `@ApiTags` and `@ApiBearerAuth`.

> **There is no `/v1` on these routes** — corrected 2026-09-10 (`judgment.md` N-5). `main.ts` enables
> URI versioning with **no `defaultVersion`**, and `ResultInnovationUseController` declares no
> `@Version`, so the module sits at `api/results/innovation-use` (parent `path: 'results'` +
> `path: 'innovation-use'` in `main.routes.ts`). The already-shipped client settles it:
> `api.service.ts` builds `` `results/innovation-use/${resultCode}` ``. Revisions 1 and 2 of every
> document in this folder said `/api/v1/result-innovation-use/…`, which was wrong on three counts.
> **No version bump either way** — the delta is additive and non-breaking.

> **Swagger — a gap this spec states rather than papers over.** There is **no response DTO** for
> `GET /api/results/innovation-use/:resultCode` today: the handler returns a bare object literal and
> declares no `@ApiOkResponse`, so **none** of the payload — including the four pre-existing
> `linked_innovation_dev` sub-keys — is documented in Swagger. This spec does **not** retrofit one
> (that is a whole-payload job for the section, out of scope here), so the three new sub-keys inherit
> the same undocumented status. The **new** endpoint, being new, MUST declare its response shape per
> the server convention (`R-IUC-008` AC.2). Recorded as `OQ-4`.

**Unchanged and explicitly out of scope:** `PATCH /api/results/innovation-use/:resultCode`,
`GET /api/link-results/details/:resultCode`, `GET /api/results?indicator-codes=2` (the picker's source).

---

## 7. Cross-system impact

- **CLARISA:** read-only, through two already-imported catalogs
  (`clarisa_innovation_readiness_levels`, `clarisa_geo_scope`). No new sync, no new import, no new
  controlled vocabulary — per the client convention, the scope and readiness names come from CLARISA
  rather than being restated.
- **OpenSearch / DynamoDB / RabbitMQ / Socket.IO / AGRESSO / TIP / ROAR:** untouched.
- **STAR client:** in scope for this same spec (this is a monorepo spec covering both packages, as
  children #3 and #4 were). Files: `get-innovation-use-details.interface.ts`,
  `innovation-use-details.component.html`, and their co-located specs.

---

## 8. Defect classes and their gates

Mandated by `/akili-specify` Phase 1: name what this spec can get wrong, then name the command that
catches each one. **A gate blind to the dominant defect class is not a gate.**

| # | Defect class | Gate | Falsifying input (must be observed red) |
| --- | --- | --- | --- |
| **DC-1** | Reads the value from the **Innovation Use** result instead of the **linked** result | Server unit test with two distinct results, each with a *different* readiness/description/scope | Point the read at the section's own `resultId` → the assertion reddens |
| **DC-2** | Wrong column (e.g. `short_title` instead of `description`) | Server unit test asserting the exact text of a fixture whose `short_title` and `description` differ | Swap to `short_title` → reddens |
| **DC-3** | Existing four sub-keys regressed (renamed, retyped, null-coercion lost) | Server unit test asserting the **full** shape including the original four, and `linked_innovation_dev === null` when unlinked | Rename `platform_code` or drop the `?? null` → reddens |
| **DC-4** | Collateral widening of `findAndDetails` | Test asserting its relation set, plus the existing Policy Change suite | Add a relation to `findAndDetails` → reddens |
| **DC-5** | Null rendered as `null` / `Level null` / a bare label | Client DOM test with each field null, and all three null | Drop an `@if` guard → reddens |
| **DC-6** | The description gets a label, or the card becomes a property list | Client DOM test asserting **no** element names the description | Add a `Description:` label → reddens |
| **DC-7** | New labels fail WCAG AA in either theme | `contrastRatio` assertion per `NFR-IUC-002`, both themes, against the **card's own** background token | Point a label at a grey-on-grey pair → reddens |
| **DC-8** | **Layout wrong** — fields stacked instead of one row, clamp is a no-op, orphaned gap where a null field was | ⚠️ **NO AUTOMATED GATE.** jsdom does not lay out, and the utility stylesheet is not present under it either | — |
| **DC-9** | The utility stylesheet fails to load (CDN outage / SRI mismatch), so the clamp, the flex row and the wrap silently vanish | ⚠️ **NO AUTOMATED GATE, and none is owed** — pre-existing, platform-wide, accepted as `R-5`. Listed here so the class is numbered in the table rather than only in prose | — *(ungated by decision, not by oversight)* |
| **DC-10** | Selection and saved states disagree — the card shows different content before and after a save | Client DOM test asserting the same three values in both states from the same source data | Populate only one of the two paths → reddens |
| **DC-11** | A failed targeted read blocks saving, or surfaces a blocking error | Client test: make the targeted read reject, assert the card still renders and the save path is untouched | Make the failure set an error gate → reddens |
| **DC-12** | Stale enrichment — the previous selection's values survive a **synchronous** change of selection | Client test selecting A then B, asserting none of A's values remain | Drop the reset on selection change → reddens. ⚠️ **This gate covers only the synchronous clear.** The asynchronous case is `DC-15`, and revisions 1–2 conflated them (`judgment.md` N-4) |
| **DC-13** | The new endpoint returns more than the three facts, or drops out of `JwtMiddleware` | Server test asserting the exact key set of the response; plus a check the route is absent from the exclusion list | Add a field, or add the route to the exclusion list → reddens |
| **DC-14** | **The read drops the parent row** — with the detail row absent or inactive, `description` and `geo_scope` are lost too, though neither depends on that row | Assert the **emitted SQL** (`getQuery()`): the `is_active` predicate appears in the `ON` clause and **not** in `WHERE`. Plus a behavioural read against a target with no detail row, asserting both other fields still return | **Move the predicate from `ON` to `WHERE` → both gates redden.** This is round 1's `S3` verbatim; it had no defect class until revision 3 (`judgment.md` N-3) |
| **DC-15** | Out-of-order enrichment — a superseded response merges onto the current selection | Client test: resolve A's read **after** B is selected, assert none of A's values appear | Drop the id guard on the merge → reddens. **A test whose stub resolves in order cannot falsify this** (`judgment.md` N-4) |
| **DC-16** | The targeted read returns free text for an out-of-bounds target (wrong indicator, inactive, snapshot) | Server test per out-of-bounds case, asserting the response equals the unknown-id response | Remove any one of the three predicates → reddens |

**DC-8 is this spec's dominant defect class and it has no automated gate.** Substituted by a
**mandatory human visual check at a HITL pause** (`NFR-IUC-003`), which is exactly how child #4's
Amendment 07 was found — by a human eye during its visual task, not by any suite. A class-presence
assertion for the clamp proves presence, not effect, and must record that limit rather than stand in
for it.

**DC-9 — the utility stylesheet is a runtime CDN dependency.** Every layout class this spec adds is
generated in the browser by `unpkg.com/@tailwindcss/browser@4.1.6` (`src/index.html`), under SRI. A
CDN outage or SRI mismatch silently removes the clamp, the flex row and the wrap — DC-8's failure
shape with an external trigger. **Pre-existing and platform-wide, not introduced here**; recorded as
an accepted risk (`R-5`) because this spec must not be the place that changes the app's styling
delivery.

---

## 9. Assumptions, dependencies, risks

| ID | Item | Mitigation |
| --- | --- | --- |
| A-1 | The reviewer wants readiness as **ordinal + name** (`Level 7 - …`), not one or the other | `OQ-1`. Cheap to change — one template expression |
| A-2 | The description means `results.description`, settled against the code (labels + max lengths), not guessed | Recorded in `proposal.md`; `DC-2` gates it |
| R-1 | The three fields mirror **another result**, so they are as fresh as the request and can differ from what the Innovation Dev page showed a minute ago | Accepted. Read on every page load; nothing is cached. Stated so no one later reads it as a snapshot |
| R-2 | A **soft-deleted** linked result still renders — `findAndDetails` filters `is_active` on the link row but not on `other_result` | **Deliberate**, inherited from child #4 which made it so on purpose. Do **not** "fix" it here |
| R-3 | Child #3 shipped two AA defects of exactly this shape | `NFR-IUC-002` + `DC-7` |
| R-4 | The description has no DOM label, so a fixture may end up asserting by text position | `OQ-2` — a stable hook decided in `design.md` |
| D-1 | No unapplied migration blocks this | Verified: child #4's two migrations were applied 2026-09-09 (`325 of 325, 0 pending`) |
| R-5 | **The utility stylesheet is a runtime CDN script**, not a build artifact — no `tailwindcss` dependency, no `tailwind.config.*`; `src/index.html` loads `unpkg.com/@tailwindcss/browser@4.1.6` under SRI. A CDN outage silently removes the clamp, the flex row and the wrap | **Pre-existing and platform-wide; accepted, not introduced here.** This spec must not be the place that changes the app's styling delivery. Recorded as `DC-9` so no reviewer is told "the clamp is a CSS class" without knowing where that CSS comes from |
| R-6 | `GetGeoFocusService` is a **hardcoded client-side list missing code `3` (`MULTI_NATIONAL`)** and is a parallel taxonomy the client convention forbids | Do **not** use it to resolve the scope name (`R-IUC-007` AC.3 forbids it). Fixing it is a **separate** spec — out of scope here, recorded as `OQ-5` |
| R-7 | The client `Result` interface types `geo_scope_id: null` (a literal, not `number \| null`) though the server sends a number | Pre-existing typing inaccuracy. Widen it only if `R-IUC-007`'s implementation actually reads that field; otherwise leave it and note it |
| K-1 | `KZ-001` (recurrence **13**), `KZ-015`, `KZ-017` — `staging` lineage (the log carries an unreconciled cross-lineage ID collision, so the lineage is named) | `KZ-001` → all card assertions on the rendered DOM; `KZ-015` → fixtures arrange the *transition* into the linked state, not the end state; `KZ-017` → §8 `DC-8` and `NFR-IUC-003` declare what the harness cannot reach |

---

## 10. Open questions

| ID | Question | Owner | Target |
| --- | --- | --- | --- |
| **OQ-1** | Readiness as `Level 7 - <name>`, or just the name, or just the ordinal? | Product owner / reviewer | Before T-04 (client render). Assumed **both**; one-expression change |
| **OQ-2** | What stable hook identifies the unlabelled description in tests — a `data-testid` or a scoped structural selector? | `design.md` | Phase 2 |
| **OQ-3** | Geographic scope was **"potentially"** in the reviewer's comment, not "for sure". Confirm it ships in this spec | Product owner | Before T-02. If dropped: one relation and one field less, no restructuring |
| **OQ-4** | The section read documents **no** response shape in Swagger today (no response DTO, no `@ApiOkResponse`). Retrofit one for the whole payload as a follow-up spec? | Engineering lead | After this spec. Out of scope here |
| **OQ-5** | `GetGeoFocusService` hardcodes the geo-scope catalog and **omits code `3`**. Repoint it at CLARISA as a follow-up? | Engineering lead | After this spec. It is a shared service; changing it here would be scope creep |

---

## 11. Requirement ID index

| ID | Title | Lane | Tasks |
| --- | --- | --- | --- |
| `R-IUC-001` | Readiness on the read response | server | *assigned in `tasks.md`* |
| `R-IUC-002` | Description + geo scope on the read response | server | *idem* |
| `R-IUC-003` | Card renders as prose, not a property list | client | *idem* |
| `R-IUC-004` | Long description does not grow the card without bound | client | *idem* |
| `R-IUC-005` | No collateral change to shared link reads | server | *idem* |
| `R-IUC-006` | Existing contract preserved exactly | server | *idem* |
| `R-IUC-007` | Selection-time parity with the saved state | server + client | *idem* |
| `R-IUC-008` | Targeted read's authorization posture **and bounded target set** | server | *idem* |
| `NFR-IUC-001` | One bounded extra query | server | *idem* |
| `NFR-IUC-002` | New labels hold AA in both themes | client | *idem* |
| `NFR-IUC-003` | Layout verified by a human — no harness can see it | client | *idem* |

---

## 12. Sign-off

- [ ] Engineering lead — <name>
- [ ] MEL / product owner — <name> *(owns `OQ-1`, `OQ-3`)*
- [ ] **Security review — REQUIRED** — <name>
  > **Revision 3 (`judgment.md` N-2).** Revisions 1–2 read *"not required: read-only, no auth change,
  > **no new endpoint**, no secret"* — a line carried over unedited while §6 of the same file gained
  > the headline *"One new endpoint"*. The waiver's stated ground was contradicted three sections
  > earlier in its own document, and the reviewer it waived is precisely the one who would have caught
  > `N-1`. **The waiver is revoked.** This spec adds a new read endpoint over another result's free
  > text; `R-IUC-008` AC.6–AC.9 are what the reviewer signs off on.
- [ ] DevOps — **not required**: no migration, no infra, no environment change
