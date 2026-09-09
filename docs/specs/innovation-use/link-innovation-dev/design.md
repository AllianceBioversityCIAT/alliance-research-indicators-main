# Design — Innovation Use / Link to a reported Innovation Development output

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/link-innovation-dev/` |
| Requirements | [`requirements.md`](requirements.md) — `R-IUL-001` … `R-IUL-012`, `NFR-IUL-001` … `NFR-IUL-004` |
| **Draft** | **2** — supersedes draft 1 after Judgment Day round 1. See [`judgment.md`](judgment.md) for the frozen ledger (13 corrections, 1 rejected finding) |
| Depth | Standard + Full-depth Rollout/Rollback (§11) |
| Approval Mode | pre-approved — Phase 2 gate **auto-approved (pre-approved mode)**, 2026-09-09 |
| Design agent | Inline (no subagent). Review delegated: 2 blind judges, Fable + Sonnet |
| **Amendment 01** | **2026-09-09**, post-Phase-3, from a user-supplied mock ([`mockup/`](mockup/)). Own section card; platform-prefixed label; a labelled "View innovation detail" action instead of a whole-card link; no remove control. **Client-only, plus one added read field.** Revises §4.1, §6.1, §6.3, §6.4, DD-6, DD-7; adds DD-11 |
| Created / revised | 2026-09-09 |

---

## 1. Executive Summary

One FK's worth of behavior wrapped in two irreversible migrations, one of which rewrites the stored
function that gates submission.

Draft 1's load-bearing decision was to **avoid** the shared `LinkResultsService.create` helper on the
grounds that its clearing semantics were unknowable. **That was wrong and is reversed here** (C8):
`typeorm@0.3.20` renders an empty `In` as the literal `0=1`, so the helper's deactivation `where`
resolves to `NOT(0=1)` — always true — and the helper already does exactly what this section needs,
transaction-manager included. The design is simpler for it.

The remaining sharp edges are all in the envelope, not the logic: a module cycle (§5.3), a
`DROP`-then-`CREATE` that can leave no function at all (§11.4), and a `down()` that is quietly
destructive (§11.2).

---

## 2. Architecture Overview

### 2.1 Composition

```
PATCH /api/v1/result-innovation-use/:code
  └─ ResultInnovationUseController.update
       └─ ResultInnovationUseService.update
            ├─ [pre-BEGIN] step 2  existence check                (unchanged)
            ├─ [pre-BEGIN] step 3  effective level / explanation  (unchanged, DD-14)
            ├─ [pre-BEGIN] step 4  duplicate-actor rule           (unchanged)
            ├─ [pre-BEGIN] step 4c NEW: validate link target ──► ResultsService.filterResultByIndicators
            └─ transaction(manager)                                  (via forwardRef — §5.3)
                 ├─ steps 6-10  detail / actors / orgs / measures (unchanged)
                 └─ step 9b     NEW: link write ─────────────────► LinkResultsService.create(..., manager)

GET /api/v1/result-innovation-use/:code
  └─ ResultInnovationUseService.findOne
       └─ NEW: LinkResultsService.findAndDetails(resultId, INNOVATION_USE_LINKED_DEV)
```

### 2.2 Reuse

| Reused as-is | Why |
| --- | --- |
| `link_results` table + entity | Every column already exists. **No schema change** |
| **`LinkResultsService.create`** | Verified (C8) to upsert the target, deactivate every other row for `(result_id, role)`, and accept an `EntityManager`. Exactly this section's semantics |
| `LinkResultsService.findAndDetails` | Already filters `lr.is_active` and loads `other_result` with `indicator` + `result_status` |
| `ResultsService.filterResultByIndicators` | Filters ids by indicator **and** `is_active` in one call (R-IUL-006) |
| `GetInnoDevOutputService` | Already queries `indicator-codes: [2]`; already registered as `innoDevOutput` |
| `app-select` | Used as the **picker only** (§6.2). No shared-component change (KZ-002) |
| `valid_text()` SQL helper | Already used throughout `innovation_use_validation` |

| **Not** reused | Why |
| --- | --- |
| `BaseDeleteService.delete` | `protected`, and writes through `this.mainRepo` — escapes the transaction |
| `LinkResultsService.saveLinkResults` | Built for the many-row role-4 flow and **inverts** the indicator filter (`not = true`) |
| `app-select`'s `hideSelected=false` card | **C12** — its `selectedOption()` resolves from the options list, so a soft-deleted target silently vanishes. §6.3 renders the card from the GET payload instead |

---

## 3. Data Model

### 3.1 Changes

**No schema change.** One enum member, one catalog row, one function rewrite.

| Object | Change | Where |
| --- | --- | --- |
| `LinkResultRolesEnum` | **new member `INNOVATION_USE_LINKED_DEV = 5`** | `link-result-roles/enum/link-result-roles.enum.ts` |
| `link_result_roles` | `INSERT (INNOVATION_USE_LINKED_DEV, 'Innovation Use Linked Dev')` | **Migration A** |
| `innovation_use_validation` | `DROP` + `CREATE` with rule 16 | **Migration B** |

> **C3 / R-IUL-010 — binding.** Both migrations **MUST** import `LinkResultRolesEnum` and interpolate
> `${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}`. A bare `5` in the SQL fails the requirement's
> acceptance criterion. Precedent: `1730993015550-insertLinkResultRole.ts:2,7`, and 75 other
> migrations that import from `../../domain`.

### 3.2 The link row and its cardinality

| Column | Value |
| --- | --- |
| `result_id` | the Innovation Use result |
| `other_result_id` | the Innovation Dev result |
| `link_result_role_id` | `INNOVATION_USE_LINKED_DEV` |
| `is_active` | `TRUE` for the current link; `FALSE` for superseded ones — soft delete, never `DELETE` |

**How `create` achieves at most one active row** (C6, C8 — traced against
`base-service.ts:115-203` and `array.util.ts:16-79`):

| Input | Behavior |
| --- | --- |
| `[{ other_result_id: B }]`, nothing stored | `persistId = []` → `Not(In([]))` → `NOT(0=1)` → deactivates all role-5 rows (none) → inserts `B` |
| `[{ other_result_id: B }]`, `A` stored active | `existData` does not match `A` → `persistId = []` → deactivates **all** role-5 rows including `A` → inserts `B`. One active row |
| `[{ other_result_id: A }]`, `A` stored **inactive** | `existData` matches `A` → `updateArray` sets `is_active: true` and preserves its PK → the **same row is reactivated**, not duplicated. Answers B8's "clear A, select B, re-select A" edge |
| `[]` | `dataToSaveArray = []` → deactivates all role-5 rows → saves nothing |

**Accepted risk — the concurrent-PATCH race (A8).** Two simultaneous saves with different targets
can each deactivate what they can see and each insert, committing two active rows: there is no unique
index on `(result_id, link_result_role_id, is_active)` — `link_results` carries only the PK and its
FKs (`1730900555793:22,:40`). **Not mitigated in this spec.** Rationale: adding a partial unique index
is not expressible in MySQL, adding a full one would break the soft-delete history the table depends
on, and the exposure is one user double-submitting one section. Rule 16 uses `EXISTS` (DD-5), so even
a doubled row leaves the green check correct and the UI showing one link. Recorded so it is a known
edge, not a surprise.

### 3.3 Rule 16

Appended as one conjunct to the function's `RETURN`:

> `EXISTS` over `link_results lr` joined to `results r2 ON r2.result_id = lr.other_result_id`, where
> `lr.result_id = result_code` **AND** `lr.link_result_role_id = 5` **AND** `lr.is_active = TRUE`
> **AND** `r2.is_active = TRUE` **AND** `r2.indicator_id = 2`.

| # | Property | Source |
| --- | --- | --- |
| 1 | `is_active = TRUE` on **both** `lr` and `r2` | DD-0 of `1787280000000` — soft-deleted rows otherwise make the check permanently wrong |
| 2 | Every OR/AND term individually parenthesized | KZ-017 — `A OR B AND C` has passed as `(A OR B) AND C` in this repo |
| 3 | Rules 2–15 copied **byte-identically**, not retyped | R-IUL-009's `AND IT MUST NOT weaken, reorder or drop` |
| 4 | `down()` restores `1787280000000`'s body verbatim | Its own `down()` is the precedent; a bare `DROP` leaves no function |

`EXISTS`, not `COUNT(*) = 1`: the function gates submission, and a SQL cardinality assertion would
turn an application-layer invariant violation into a red check the user cannot clear.

---

## 4. API Surface

### 4.1 Wire contract — normative (C4)

> **These names are the contract between the server lane (Claude) and the client lane (Antigravity),
> which execute on different hosts.** They are fixed here, not left to either implementer.

| Key | Direction | Type | Meaning |
| --- | --- | --- | --- |
| `innovation_dev_result_id` | `PATCH` body **and** `GET` response | `number \| null` | The linked result's id. Drives the picker |
| `linked_innovation_dev` | `GET` response only | `object \| null` | `{ result_id, result_official_code, title, platform_code }`. Drives the card. **`platform_code` added by Amendment 01** — the `STAR 284 - …` format needs it, and `link_results.other_result` already carries it (`map-link-other-result-to-result.ts:48,52`) |

The scalar and the object are both returned because they serve different consumers: the scalar
hydrates `app-select`'s value, the object renders the card **without** depending on the options list
(C12). The client never sends `linked_innovation_dev`; `whitelist: true` on the controller's
`ValidationPipe` drops it if it ever does.

### 4.2 `PATCH /api/v1/result-innovation-use/:code`

| Aspect | Detail |
| --- | --- |
| Validation | `@IsOptional()` + `@IsInt()`, explicit `null` permitted (optional at transport — R-IUL-003 makes it required at *submit*, not at save) |
| Semantic check | Service-side, pre-`BEGIN` — it needs a DB read |
| `400` | Target is not an active indicator-2 result (R-IUL-006) |
| Swagger | `@ApiProperty({ required: false, nullable: true, type: Number })` |

`forbidNonWhitelisted` stays **off** — the controller deliberately omits it; unchanged here.

### 4.3 `GET /api/v1/result-innovation-use/:code`

Both keys present-and-`null` when unlinked, never absent (R-IUL-007).

---

## 5. Backend Module Design

### 5.1 The write path

**Step 4c — validate, before `BEGIN`.** Runs only when `innovation_dev_result_id` is present and
non-null. Calls `filterResultByIndicators([id], [IndicatorsEnum.INNOVATION_DEV], false)`; an empty
return → `BadRequestException`. Sits with the other pre-`BEGIN` validators so "a failure persists
nothing" is a property of *ordering*, not of rollback correctness — the argument the file already
makes for steps 2–4.

**Step 9b — write, inside the transaction.** Three-way on the key, mirroring DD-14's `!== undefined`
discipline:

| Key state | Action |
| --- | --- |
| **omitted** (`undefined`) | **do not call `create` at all** — the stored link survives with its `link_result_id` intact (R-IUL-008) |
| **explicit `null`** | `create(resultId, [], 'other_result_id', INNOVATION_USE_LINKED_DEV, manager)` → deactivates all |
| **an id** | `create(resultId, [{ other_result_id: id }], 'other_result_id', INNOVATION_USE_LINKED_DEV, manager)` |

The `manager` argument is what keeps the write inside the transaction (DD-10). **Omitting it is the
defect** — `upsertByCompositeKeys`'s writes escape the transaction in OICR for exactly this reason.

### 5.2 The read path

`findOne` gains a fourth entry in its existing `Promise.all`, calling
`findAndDetails(resultId, INNOVATION_USE_LINKED_DEV)`. It already filters `lr.is_active` and loads the
`other_result` relation. Take the first row; project to the two keys of §4.1; both `null` when none.

> **Deliberate:** `findAndDetails` applies **no** `is_active` filter to `other_result`, so a
> soft-deleted target still comes back. That is what lets the UI show the now-invalid link instead of
> silently dropping it (C12). Rule 16 independently returns `FALSE` for it, so the green check and the
> UI agree.
>
> `findAndDetails` also calls `getPrincipalContractByResultsIds` — work this section does not need but
> does not misuse. Left as-is; the row count here is 0 or 1.

### 5.3 Module and DI wiring — **corrected (C7)**

Draft 1 claimed this risk was "discharged because `ResultInnovationDevModule` already does exactly
this". **It does not.** `ResultInnovationDevService` never injects `ResultsService`; it reaches it
only transitively through `LinkResultsService`. The real situation:

| Fact | Evidence |
| --- | --- |
| `ResultInnovationUseService` injects no `ResultsService` today | its constructor takes `DataSource, CurrentUserUtil, ResultActorsService, ResultInstitutionTypesService, ResultQuantificationsService, UpdateDataUtil` |
| `ResultsModule` **imports** `ResultInnovationUseModule` | `results.module.ts:31, :77` |
| `ResultsModule` exports `ResultsService` | `results.module.ts:99` |

So importing `ResultsModule` here closes a cycle. **Resolution:**

1. `ResultInnovationUseModule` imports `LinkResultsModule` (no cycle — it exports only `LinkResultsService`)
2. `ResultInnovationUseModule` imports `forwardRef(() => ResultsModule)`
3. `ResultInnovationUseService` injects `@Inject(forwardRef(() => ResultsService))`

Precedent for exactly this edge: `link-results.service.ts` and `result-oicr.service.ts`.

> **Fallback if the cycle still fails to resolve at boot:** query the `Result` repository directly
> through the `DataSource` this service already holds, filtering `result_id`, `indicator_id = 2`,
> `is_active = true`. It costs the service-layer indirection but removes the module edge entirely.
> Named here so the implementer does not have to invent it under a red boot.

---

## 6. Frontend Component Architecture

### 6.1 Placement — **own card (Amendment 01)**

Draft 1 said the card uses `grid grid-cols-12`. **It does not** — `grep -c grid` on
`innovation-use-details.component.html` returns **0** (C1). That pattern lives in
`policy-change.component.html`, a different file. **No grid is introduced.**

**Amendment 01 supersedes draft 2's "append to the end of the details card".** The field gets its
**own sibling card**, between *INNOVATION USE DETAILS* and *ACTORS* (R-IUL-013):

```
INNOVATION USE DETAILS   ── question, guidance callout, level stepper,
                            definition box, "Click here" definitions link   (unchanged)
RELATED INNOVATION DEVELOPMENT   ◄── NEW CARD
ACTORS
ORGANIZATIONS
OTHER QUANTITATIVE MEASURES
```

Shell copied verbatim from its siblings — the class string is identical on all four existing cards:

`rounded-[13px] rs-p-[30] rs-mb-[25] border border-[var(--ac-grey-200)] bg-[var(--ac-white-1)]`

with `<h2 class="section-title">RELATED INNOVATION DEVELOPMENT</h2>`. Nothing is moved out of the
details card; this is a sibling, not a relocation.

### 6.2 The picker

`app-select`, configured from the page — **no shared-component change**:

| Input | Value |
| --- | --- |
| `serviceName` | `innoDevOutput` |
| `optionValue` | `{ body: 'innovation_dev_result_id', option: 'result_id' }` |
| `optionLabel` | a computed `<platform_code> <result_official_code> - <title>` label (Amendment 01). Applied via the `#item` content-projection template so the dropdown list and the collapsed value match the card exactly — the same technique `innovation-details.component.html:390-394` already uses |
| `isRequired` | `true` |
| `hideSelected` | **`true`** (the default) — the card is rendered by the page, not by the select (C12) |
| `disabled` | see §6.5 |

`SelectComponent.isInvalid()` already emits the amber border and the exact string *"This field is
required"*, and the label already renders the red asterisk from `isRequired` — so R-IUL-003 is met by
configuration.

> **C15, honestly stated:** that amber is the hex literal `#E69F00` (`select.component.html:20,113`),
> not a `var(--ac-*)` token. NFR-IUL-003's no-hex rule binds **new** code; reusing the shared control
> inherits a pre-existing literal. Recorded as inherited, not introduced, and not fixed here — editing
> `SelectComponent` would trigger a full-suite run across every route (KZ-002).

### 6.3 The card — page-owned (C12, C13; **revised by Amendment 01**)

Rendered by the page template from `linked_innovation_dev` in the GET payload, immediately beneath the
picker inside the new card. Not `app-select`'s `#rows`, and not derived from the options list.

Layout per the mock: a single row, title on the left, action on the right, on the section's subtle
grey surface with a light border.

| Property | Value |
| --- | --- |
| Content | `<platform_code> <result_official_code> - <title>` — e.g. `STAR 284 - Rice bean-adzuki bean …`. **Not** zero-padded; draft 2's 3-digit rule came from the Links-to-Result section and the mock contradicts it |
| Action | a right-aligned **`View innovation detail ↗`** anchor styled as a secondary button |
| Target | `href="/result/<result_official_code>/general-information"`, `target="_blank"`, `rel="noopener"` |
| **AT discoverability** | a visually-hidden *"(opens in a new tab)"* inside the anchor's accessible name (C13) |
| Remove | **none** — see §6.4 |
| Styling | tokens only for new rules — `.abc-*` / `.atc-*` / `var(--ac-*)` |

**The anchor is the whole interactive surface** (Amendment 01). Draft 2 made the entire card a link;
the mock puts a labelled button on the right instead. That is also the better accessible name — *"View
innovation detail"* says what activation does, where a card-wide link announces the whole title.

Because the card reads the **payload**, a **soft-deleted** target still renders — with the picker
showing no match and rule 16 returning `FALSE`. The user sees what is wrong and can fix it, instead of
facing a red check with a blank field (C12).

### 6.4 Clearing — **no UI control (Amendment 01)**

Draft 1 claimed `SelectComponent`'s internal `body` "only re-syncs on `currentResultIsLoading()`" and
carried a fallback to add `@Input() showClear`. **The premise was inverted** (C9): the effect reads
`this.signal()` inside its own body (`select.component.ts:95,106`), so those reads are tracked and it
does re-run.

That correction stands, but **the mock exposes no remove control at all**, and the field is required —
so the only supported change is picking another option. Therefore:

- **No remove button is built.** Draft 2's in-card remove control is withdrawn.
- **No shared-component change**, and no `showClear` fallback is owed.
- The **server** still honours an explicit `null` as a clear (R-IUL-008). That path simply has no
  client caller from this surface; it stays specified and tested server-side so the contract is not
  silently narrowed.

### 6.5 The `disabled` condition (C5)

Draft 1 cited `policy-change.component.html` as the "disable when empty" precedent. It is not one —
that file hardcodes `[disabled]="true"` unconditionally. Specified concretely instead:

- The page injects `GetInnoDevOutputService` directly and reads its `list()` and `loading()` signals
  (`optionsSig` is internal to `SelectComponent` and not reachable from outside).
- `disabled` is true when `!submission.isEditableStatus()`, **or** when `!loading() && list().length === 0`.
- **The `!loading()` guard is required**: `list` starts `[]` with `loading = true`, so omitting it
  shows the "no results" state on every single section entry.
- Empty-list tooltip: *"There are no reported Innovation Development outputs to link."*

### 6.6 Options freshness (C2 — NFR-IUL-001's `MUST`)

`GetInnoDevOutputService` is `providedIn: 'root'` and fetches once in its constructor. **It is not
stale in practice**, because `SelectComponent.ngOnInit → initializeService → loadData` calls
`service.main()` on **every mount of the control** (`select.component.ts:117-145`). Entering the
Innovation Use section mounts the control and therefore re-fetches.

**Policy, stated as NFR-IUL-001 requires:** freshness is guaranteed at section entry by the control's
own mount lifecycle; no page-level refresh call is added. A result created while the user is already
sitting on this section will not appear until they leave and return — **accepted**, and it is the same
behavior every other `app-select` in STAR has.

### 6.7 `null` vs `undefined` in the payload (C14)

Two **opposing** disciplines coexist in this feature, and picking the wrong one silently breaks
R-IUL-008:

| Precedent | Discipline | Why |
| --- | --- | --- |
| `innovation-use-details.component.ts:489-492` | `?? undefined` — *never* send a present `null` | That field must not be clearable below level 6 |
| `get-innovation-use-details.interface.ts` (`InnovationUseOrganization.institution_id`) | explicit `null` — never `undefined` | `undefined` is dropped by `JSON.stringify`, leaving a stale server value |

**This field follows the second.** `buildPayload()` emits `undefined` when untouched, the id when
selected, and an **explicit `null`** when cleared. Copying the `?? undefined` pattern from the same
file would make clearing a silent no-op.

---

## 7. Security & Authorization

Unchanged: JWT + `ResultStatusGuard`, no `@Roles(...)` (DD-5 of the details-API chunk). Per OQ-2 the
field imposes **no** ownership filter, so no access decision rides on it.

---

## 8. Observability

New rejections log through the existing `CgiarLogger` with `result_id` and a rule identifier **only**
— never the payload. Note the level: a thrown `BadRequestException` is handled by `GlobalExceptions`,
whose only log call is `_error`, so it lands at `ERROR` platform-wide regardless of the `warn` call.
Pre-existing; not corrected here.

---

## 9. Testing Strategy

| Layer | Covers | Cannot cover |
| --- | --- | --- |
| Server unit | D-3, D-4, D-5, D-6 | **Any SQL semantics** — a mocked `QueryRunner` records text and never evaluates it |
| Migration structural spec | Shape only: one function named, `up()` DROP-then-CREATE, `down()` restorative, enum interpolated | **Rule 16's behavior.** Must say so in-file |
| **Real-MySQL fixture spec** | **D-1** — rule 16 true/false against real rows | — |
| Client component spec | D-8 (rendered `href`/`target`/accessible name), D-9, the required state's DOM | **D-7** — jsdom measures no layout and evaluates no contrast |
| Human visual check | D-7, dark theme | — |

**Falsification — every gate observed red before it is cited (K-004):**

| Gate | The input that makes it FAIL |
| --- | --- |
| Rule-16 fixture | Run against the **pre-migration** function — must go red before Migration B exists |
| Target validation | An indicator-4 id; separately a soft-deleted indicator-2 id |
| Cardinality | Save `A`, save `B`, assert exactly one active row; then clear, re-select `A`, assert the **same** `link_result_id` was reactivated (§3.2) |
| Omitted vs null | **Two separate specs.** One spec covering both cannot distinguish them |
| Card link | Assert the rendered `<a href>`, `target` **and accessible name** in the DOM. A spec asserting a handler was called passes with the anchor absent (KZ-001) |
| Enum in SQL | Structural spec asserts the emitted SQL contains the enum's value **and** that the migration file imports `LinkResultRolesEnum` — a bare `5` must fail it |
| Clear propagation | Write `null` into the page signal, `detectChanges`, assert `isInvalid()` — arranges the **transition**, not the end state (KZ-015) |

**Disqualifier — when a reading is worthless:** a suite run while a delegated worker is active is not
evidence; two concurrent full-suite runs have produced phantom failures in this repo twice. Workers
verify their own scope; the Leader re-measures the full suite after each worker reports.

---

## 10. Design Decisions

| ID | Decision | Rationale | Rejected |
| --- | --- | --- | --- |
| **DD-1** | Scalar `number \| null`, not an array | Single-cardinality becomes a type property. An `@ArrayMaxSize(1)` is the class of guard KZ-001 records failing green 13 times | Array + validator |
| **DD-2** | **REVERSED (C8). Reuse `LinkResultsService.create`** | Draft 1 avoided it on a fabricated unknown. Verified: `typeorm@0.3.20` renders empty `In` as `0=1`, so `Not(In([]))` is always true and the helper deactivates correctly in all three cases (§3.2). It is manager-aware already | A bespoke manager-aware method — more code, no benefit |
| **DD-3** | Validate the target **before** `BEGIN` | Makes "a failure persists nothing" a property of ordering, not of rollback correctness | Validate inside, rely on rollback |
| **DD-4** | Three-way on `undefined` / `null` / id, never `??` | `??` cannot distinguish an omitted key from an explicit `null` — DD-14's recorded bypass in this very service | `??` with a stored fallback |
| **DD-5** | Rule 16 uses `EXISTS`, not `COUNT(*) = 1` | A SQL cardinality assertion would turn an invariant violation into a red check the user cannot clear | `COUNT(*) = 1` |
| **DD-6** | **Revised (C12 + Amendment 01).** `app-select` is the picker only; the **page** renders the card from the GET payload, with a labelled `View innovation detail` anchor rather than a card-wide link | The component's `selectedOption()` resolves from the options list, so a soft-deleted target would make the card vanish while rule 16 went red — the DD-0 "nothing on screen to fix" failure. The labelled action also gives a better accessible name than a card-wide link | `hideSelected=false` + `#rows`; whole-card link |
| **DD-7** | **Withdrawn (Amendment 01).** No remove control is built | The mock exposes none and the field is required — changing the selection is the only supported edit. C9's correction (the reset *would* have propagated) stands and is simply no longer needed | A remove button; `@Input() showClear` |
| **DD-8** | No backfill; rule 16 applies retroactively | Direct user ruling (OQ-1) | A cut-off clause |
| **DD-9** | **New (C7).** `forwardRef` on both the module import and the service injection | `ResultsModule` already imports `ResultInnovationUseModule`, so this edge closes a cycle. Precedent: `link-results.service.ts`, `result-oicr.service.ts` | Naive import (boot failure); direct repository access (kept as the §5.3 fallback) |
| **DD-10** | **New (C10).** Migration B is verified against a scratch schema before it is applied anywhere shared | A failed `CREATE` after a successful `DROP` leaves **no function at all** — worse than a closed gate | Applying straight to Dev |
| **DD-11** | **New (Amendment 01).** The required asterisk sits on the **section title** — `RELATED INNOVATION DEVELOPMENT *` — because the mock gives the control no field label to carry one | The user's ruling was explicit that the field is required with the section's usual affordances; the mock (a *filled* state) shows no label. The amber border and "This field is required" still come from `isInvalid()` when empty. **Cosmetic and reversible — flagged for overrule at T-12's visual check** rather than blocking on a question | An invented field label above the control; dropping the asterisk |

---

## 11. Rollout & Rollback

### 11.1 Ordering

| Step | Action | Who |
| --- | --- | --- |
| 1 | Merge code + both migrations | CI |
| 2 | **Apply Migration A** (role-5 seed) | **User, against the real DB** |
| 3 | **Apply Migration B** (rule 16) | **User, against the real DB** |
| 4 | Verify saves work and the green check behaves | User + Leader |

**If step 2 is skipped while the code is live, every save of the section fails on the
`link_result_role_id` foreign key.** The pipeline deploys code and never applies migrations (K-015); a
merged migration has sat unapplied for four days and several deploys in this repo before.

Pending state: `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts` —
**strip ANSI before counting `[ ]`**, and check the raw output for an error first. A `grep '^\[ \]'`
over that output has reported a confident zero while a migration was pending (K-014). `migration:show`
is **not** an npm script; the passthrough above is the only form.

### 11.2 Rollback — Migration A's `down()` is **destructive** (C11)

The FK `link_results.link_result_role_id → link_result_roles` (`1730900555793:40`) blocks deleting the
role-5 catalog row **regardless of `is_active`** — a soft-deleted row still references it.

So "run `down()` after the role-5 rows are gone" means a **hard `DELETE` of production rows**. That is
irreversible and destroys audit history.

**Procedure, and it is a human decision — never an agent's:**

1. `SELECT COUNT(*) FROM link_results WHERE link_result_role_id = 5;` — including inactive rows.
2. If non-zero, **stop.** Reverting Migration A requires destroying those rows. Reverting Migration B
   alone already re-opens submission and is almost always the correct, non-destructive remedy.
3. Only if the count is zero is `down()` safe to run.

### 11.3 Rollback — Migration B

`down()` restores `1787280000000`'s body **verbatim**, re-opening submission for unlinked results.
Non-destructive; this is the rollback that should actually be used.

### 11.4 Mid-`up()` failure in Migration B (C10)

MySQL DDL **implicitly commits**, so `up()`'s `DROP FUNCTION` is committed before the `CREATE` runs.
If the ~200-line `CREATE` then fails — a syntax slip, a permission issue — the function is **absent
entirely**. Every caller errors outright rather than degrading to a closed gate. TypeORM's migration
transaction cannot roll a DDL statement back.

**Mitigation (DD-10) and recovery:**

1. **Before** applying anywhere shared, run Migration B against the disposable TEST scratch schema
   built from `src/db/baseline/` and confirm the function exists and returns sensibly.
2. If `up()` fails on a shared DB, the database is left with no `innovation_use_validation`.
   **Recovery is to immediately apply the `CREATE FUNCTION` body from `down()`** (the previous
   function), restoring the pre-change behavior, then diagnose offline.
3. The runbook handed to the applier must carry that `down()` body as copy-pasteable SQL, so recovery
   does not depend on having the repo open.

### 11.5 Blast radius

Every existing Innovation Use result becomes green-check `FALSE` until linked. **Intended**
(DD-8 / OQ-1). Before step 3 the applier should know the count:
`SELECT COUNT(*) FROM results WHERE indicator_id = 6 AND is_active = TRUE;`

---

## 12. Budget (tripwire)

| Metric | Expected | Δ vs draft 1 |
| --- | --- | --- |
| **Tasks** | **12** — 7 server (Claude), 5 client (Antigravity) | — |
| **LOC** | **~1,250** — ~450 Migration B alone (`up()` restates the full body + rule 16; `down()` restates the prior body), ~180 other server, ~250 client, ~370 tests | **−150** (DD-2's reversal removed the bespoke write method) |
| **Review rounds** | **~20** | — |

**On the round count.** This family's chunk 2 was budgeted 6–8 at specify time and actually took
**≥ 26**; chunk 1 was low by a similar factor. 20 is set against that measured history, not against
how simple the feature reads. `/akili-execute` escalates on exceeding these rather than continuing
silently.

**Depth re-check:** Standard was right — 12 tasks is well above Lite, and the only Full-depth sections
genuinely needed (Rollout, Rollback) are carried in §11 rather than promoting the whole document.

---

## 13. Open Questions

| # | Question | Owner |
| --- | --- | --- |
| **OQ-4** | Final copy for the label, the description line and the role-5 name | User — cosmetic; defaults stand |
| **OQ-5** | Should the linked result appear in the Innovation Use report/export view? | User — out of scope unless yes |
| ~~OQ-6~~ | ~~`BaseServiceSimple` latent defect~~ | **WITHDRAWN (C8).** There is no defect; the premise was a check I never ran |

---

## 14. References

- `server/.../result-innovation-use/result-innovation-use.service.ts` — steps 2–12, DD-14
- `server/.../shared/global-dto/base-service.ts:115-203` — `BaseServiceSimple.create` (DD-2)
- `server/.../shared/utils/array.util.ts:16-79` — `updateArray`, `filterPersistKey`
- `server/researchindicators/node_modules/typeorm/query-builder/QueryBuilder.js:738-741` — empty-`In` → `0=1` (C8)
- `server/.../entities/results/results.module.ts:31,77,99` — the cycle (C7)
- `server/.../db/migrations/1787280000000-updateInnovationUseValidation.ts` — the function Migration B rewrites
- `server/.../db/migrations/1730993015550-insertLinkResultRole.ts:2,7` — enum interpolation precedent (C3)
- `server/.../db/migrations/1730900555793-addedPolicyChangeDataModel.ts:40` — the FK behind C11
- `client/.../custom-fields/select/select.component.ts:87-145` — the tracked effect (C9), mount re-fetch (C2)
- `client/.../innovation-use-details/innovation-use-details.component.html` — no grid (C1)
- `client/.../innovation-use-details/innovation-use-details.component.ts:489-492` — the `?? undefined` counter-precedent (C14)
- [`judgment.md`](judgment.md) — the frozen review ledger
