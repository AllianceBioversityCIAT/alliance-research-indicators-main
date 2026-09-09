# Tasks — Innovation Use / Link to a reported Innovation Development output

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/link-innovation-dev/` |
| Requirements | [`requirements.md`](requirements.md) |
| Design | [`design.md`](design.md) **draft 2** |
| Review ledger | [`judgment.md`](judgment.md) |
| Approval Mode | pre-approved — Phase 3 gate **auto-approved (pre-approved mode)**, 2026-09-09 |
| Task count | **13** (budget said 12; +1 for the doc-sync task that had no home — see §6) |
| **Amendment 01** | **2026-09-09** — user mock ([`mockup/`](mockup/)). Rescopes **T-08, T-09, T-10, T-11**; adds no task. Own section card, platform-prefixed label, `View innovation detail` action, no remove control. **Server lane T-01…T-07 unaffected** apart from `platform_code` in T-07's projection |
| Created | 2026-09-09 |

---

## 1. Execution lanes — binding

> **User ruling, 2026-09-09:** *"los ajustes del back no puedes delegarlos a antigravity por ser
> ajustes delicados debes implementarlos tú; todo lo del front delegado a antigravity."*

| Lane | Tasks | Executor | Reviewer |
| --- | --- | --- | --- |
| **Server** | T-01 … T-07 | **Claude, in-session.** Not delegable | Claude (self-review + the falsification table below) |
| **Client** | T-08 … T-12 | **Antigravity** via `/orchestration` | **Claude**, after each task |
| **Docs** | T-13 | Claude | — |

**The two lanes are parallel-safe for *editing*** (different packages). They are **not** parallel-safe
for *measuring*: never run a full suite while a delegated worker is active — two concurrent full-suite
runs have produced phantom failures in this repo twice. Workers verify their own scope; the Leader
re-measures after each worker reports.

> **Orca ⇄ Antigravity, known false negative (user-reported).** `worker-start` marks the dispatch
> `failed` after ~8 s with `agent_prompt_stalled` because Orca does not recognize Antigravity's TUI.
> **The worker is running.** Do not re-dispatch on that signal; read the terminal instead. This does
> **not** repeal the rule that a silent worker is a runtime failure — only this specific 8-second
> signal is the false negative.
>
> Dispatch path: `terminal create --command "agy …"` then `orchestration dispatch --inject`
> (`worker-start --agent gemini` is `agent_unconfigured` on this install). Model for the client lane:
> `gemini-3.8-flash-high` — **note the registry in root `CLAUDE.md` lists only 3.7/3.6/3.5;
> `agy models` returned 3.8 on 2026-09-09. Registry drift, flagged in T-13.**

---

## 2. Dependency graph

```
SERVER LANE (Claude)                          CLIENT LANE (Antigravity)
─────────────────────                         ─────────────────────────
T-01 enum + Migration A                       T-08 contract interface
  ├──► T-02 Migration B ──► T-03 fixture        └──► T-09 picker
  ├──► T-04 DTO                                      T-10 card
  └──► T-05 DI wiring                                T-11 payload
         └──► T-06 write path                          └──► T-12 suite + visual
         └──► T-07 read path
                                    ▼
                              T-13 doc sync
```

**The client lane does not wait on the server lane.** `design.md` §4.1 freezes the wire contract
(`innovation_dev_result_id`, `linked_innovation_dev`) normatively, so both lanes build against it
independently. That is the whole reason §4.1 exists.

Hard edges: `T-01 → T-02` (Migration B must be ordered after A **and** needs the enum member);
`T-02 → T-03` (the fixture must first be observed red against the pre-migration function).

---

## 3. Task list

> **Every task below carries a `FALSIFIER` — the concrete input that makes its check report FAIL.**
> A check nobody has seen fail is not evidence, however green it reports (K-004 / KZ-014). Where a
> check *cannot* fail for the property claimed, the task says so instead of pretending.

---

### T-01 — `LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV` + Migration A (catalog seed)

| | |
| --- | --- |
| Status | `[x]` |
| Size | S |
| Depends on | — |
| Requirements | R-IUL-010 (all clauses), R-IUL-011 |
| Design | §3.1, DD-3 |
| Skills | `nestjs-expert` |

**Scope.** Add the enum member `= 5`. Add Migration A inserting one `link_result_roles` row, its
`down()` deleting only that row. Add the sibling structural migration spec.

**The clause that fails this task if missed:** R-IUL-010's *"IT MUST reuse `LinkResultRolesEnum` for
the literal, never a bare `5` in the SQL"*. Import the enum and interpolate it, per
`1730993015550-insertLinkResultRole.ts:2,7`.

**Verify.** `npx eslint <changed paths>` (bare `eslint` — `npm run lint` carries `--fix` and mutates,
so it cannot gate, K-001) · `npm test -- --silent`
**FALSIFIER.** Replace the interpolation with a literal `5` → the structural spec must go red. Also:
delete the `down()` body → the spec's "down is non-empty and restorative" assertion must go red.
**Cannot prove.** That the row actually lands in a database. A structural spec asserts SQL *text*.
**Done.** Enum member exists; migration + spec committed; both falsifiers observed red.

---

### T-02 — Migration B: rule 16 in `innovation_use_validation`

| | |
| --- | --- |
| Status | `[x]` |
| Size | **L** |
| Depends on | T-01 |
| Requirements | R-IUL-009 (both scenarios + all `BUT`/`AND IT MUST` clauses) |
| Design | §3.3, §11.3, §11.4, DD-5, DD-10 |
| Skills | `nestjs-expert`, `systematic-debugging` |

**Scope.** `DROP` + `CREATE` `innovation_use_validation` with rule 16 appended. `down()` restores
`1787280000000`'s body **byte-for-byte**. Structural spec alongside.

**The four binding properties** (design §3.3): both `is_active` filters; every OR/AND term
individually parenthesized; rules 2–15 **copied**, never retyped; `down()` restorative not a bare
drop. Plus: **never name `innovation_dev_validation`** in either direction.

**Verify.** `npm test -- --silent` · structural spec asserts exactly one function named, `up()` is
DROP-then-CREATE, `down()` non-empty.
**FALSIFIER.** Point the structural spec's function-name assertion at `innovation_dev_validation` →
must go red. Empty the `down()` → must go red.
**Cannot prove.** *Rule 16's behavior, or that rules 2–15 survived.* A mocked `QueryRunner` records
text and never evaluates it (KZ-001). **This task's spec MUST say so in-file.** T-03 is the only
proof.
**Done.** Migration + structural spec committed; the byte-identity of rules 2–15 verified by diff
against `1787280000000`, not by eye.

---

### T-03 — Real-MySQL fixture spec for rule 16

| | |
| --- | --- |
| Status | `[ ]` |
| Size | M |
| Depends on | T-02 |
| Requirements | R-IUL-009 (both scenarios), D-1 |
| Design | §9 |
| Skills | `nestjs-expert`, `tdd` |

**Scope.** A fixture spec in the repo's `test/fixtures/innovation-use/` harness, against the
disposable TEST scratch schema. Cases: no link → `FALSE`; valid link → `TRUE`; **deactivated** link
row → `FALSE`; link to an **inactive** target → `FALSE`; link to a **non-indicator-2** target →
`FALSE`; a role-4 row only → `FALSE`. Plus one case proving rules 2–15 still discriminate (an
otherwise-invalid actor row with a valid link → `FALSE`).

**Verify.** The fixture suite, run from a **provably empty** scratch schema.
**FALSIFIER — and this one is mandatory before the task may be cited:** run this spec against the
**pre-Migration-B** function. Every rule-16 case must go **red**. A suite that is green before the
migration exists is testing nothing.
**Disqualifier.** If the scratch schema is not provably empty at start (table count 0 → migrated),
the run is not evidence — report the state instead of the result.
**Done.** All cases green post-migration, all rule-16 cases observed red pre-migration, both runs
recorded.

---

### T-04 — DTO field + Swagger

| | |
| --- | --- |
| Status | `[ ]` |
| Size | S |
| Depends on | T-01 |
| Requirements | R-IUL-001, R-IUL-006, R-IUL-008 |
| Design | §4.1, §4.2, DD-1 |
| Skills | `nestjs-expert`, `api-design-principles` |

**Scope.** `innovation_dev_result_id?: number | null` on `CreateResultInnovationUseDto`, per §4.1
**verbatim** — this name is the cross-host contract. `@IsOptional()` + `@IsInt()` admitting explicit
`null`; `@ApiProperty({ required: false, nullable: true, type: Number })`.

**Verify.** `npm test -- --silent` · DTO spec: a payload with the key absent, `null`, a valid int, and
a non-int each validate/reject as specified.
**FALSIFIER.** Send `"abc"` → must reject. Send `null` → must **pass** (a spec that rejects `null`
has encoded the wrong contract and breaks R-IUL-008).
**Note.** `forbidNonWhitelisted` stays off — do not add it.
**Done.** Field + decorators + spec committed; the `null`-passes case explicitly asserted.

---

### T-05 — Module & DI wiring (`forwardRef`)

| | |
| --- | --- |
| Status | `[ ]` |
| Size | S |
| Depends on | T-01 |
| Requirements | R-IUL-006 (enabling) |
| Design | §5.3, DD-9 |
| Skills | `nestjs-expert`, `systematic-debugging` |

**Scope.** `ResultInnovationUseModule` imports `LinkResultsModule` and `forwardRef(() => ResultsModule)`.
`ResultInnovationUseService` injects `@Inject(forwardRef(() => ResultsService))` and
`LinkResultsService`.

**Why this is its own task:** `ResultsModule` already imports `ResultInnovationUseModule`
(`results.module.ts:31,77`), so this edge closes a cycle. Judgment Day raised it from Low to severe
(C7) precisely because the proposal's stated mitigation was false.

**Verify.** The app boots — a Nest testing-module compile covering this module graph, plus
`npm test -- --silent`.
**FALSIFIER.** Drop the `forwardRef` → the compile must fail with an unresolved-dependency error. If
it *doesn't* fail, the cycle premise is wrong and §5.3 needs revisiting before proceeding.
**Fallback (design §5.3), if the cycle resists:** query the `Result` repository directly through the
`DataSource` this service already holds. Take it only after the falsifier above has been run.
**Done.** Boot proven; falsifier observed.

---

### T-06 — Service write path: step 4c validation + step 9b link write

| | |
| --- | --- |
| Status | `[ ]` |
| Size | **L** |
| Depends on | T-04, T-05 |
| Requirements | R-IUL-001 (both scenarios), R-IUL-005, R-IUL-006 (all three scenarios), R-IUL-008 (both scenarios) |
| Design | §5.1, §3.2, DD-2, DD-3, DD-4 |
| Skills | `nestjs-expert`, `tdd`, `error-handling-patterns` |

**Scope.** Step 4c: pre-`BEGIN` `filterResultByIndicators([id], [INNOVATION_DEV], false)` → `400` on
empty. Step 9b inside the transaction: the three-way on `undefined` / `null` / id, each routed to
`LinkResultsService.create(..., manager)` per §5.1.

**Clauses that must each own an assertion:**

| Clause | Assertion |
| --- | --- |
| R-IUL-005 `AND IT MUST thread the manager` | the `create` call receives the transaction's `manager`, not `undefined` |
| R-IUL-006 `AND IT MUST validate before BEGIN` | on a bad target, `dataSource.transaction` is **never entered** |
| R-IUL-006 `BUT must NOT report success with the link dropped` | bad target → `400`, not `200` |
| R-IUL-008 omitted | `create` is **not called at all** |
| R-IUL-008 explicit `null` | `create` called with `[]` |
| R-IUL-001 reactivation | clear `A`, re-select `A` → same `link_result_id` |
| R-IUL-001 other roles untouched | a role-4 row for the same result survives |

**Verify.** `npm test -- --silent`
**FALSIFIER.** Move the validation inside the transaction → the "never entered" spec must go red.
Replace the three-way with `??` → the omitted-vs-null pair must go red (one of them will pass either
way, which is exactly why they are **two separate specs**).
**Cannot prove.** That the DB actually holds one row — these are mocked. The reactivation and
single-row properties are asserted on the **call arguments** to `create`; their *database* truth
rides on `create`'s own already-tested behavior plus T-03's harness.
**Done.** Every row above asserted; both falsifiers observed red.

---

### T-07 — Service read path: `findOne`

| | |
| --- | --- |
| Status | `[ ]` |
| Size | S |
| Depends on | T-04, T-05 |
| Requirements | R-IUL-007 (all clauses) |
| Design | §5.2, §4.1, §4.3 |
| Skills | `nestjs-expert` |

**Scope.** Fourth entry in the existing `Promise.all`, calling
`findAndDetails(resultId, INNOVATION_USE_LINKED_DEV)`. Project to **both** §4.1 keys.

**Clauses:** present-and-`null` when unlinked (never absent) · must **not** return a deactivated link
row · must **not** throw when unlinked · **must** still return a link whose *target* is soft-deleted
(design §5.2 — this is what makes C12's visible-invalid-state possible).

**Verify.** `npm test -- --silent`
**FALSIFIER.** Return `undefined` instead of `null` for the unlinked case → the "present, never
absent" spec must go red. Filter out soft-deleted targets → the C12 spec must go red.
**Done.** Both keys returned; four clauses asserted; falsifiers observed.

---

### T-08 — Client contract interface  ⟨Antigravity⟩

| | |
| --- | --- |
| Status | `[x]` |
| Size | S |
| Depends on | — (§4.1 is frozen) |
| Requirements | R-IUL-007 |
| Design | §4.1 |
| Skills | `angular-developer` |

**Scope.** Add `innovation_dev_result_id: number \| null \| undefined` and
`linked_innovation_dev: { result_id; result_official_code; title; platform_code } | null | undefined`
to `GetInnovationUseDetails`. **`platform_code` is Amendment 01** — the `STAR 284 - …` label needs it.

**The widened types are deliberate** — mirror the reasoning already written on
`InnovationUseOrganization.institution_id`: `undefined` is dropped by `JSON.stringify`, so the
cleared state must be able to carry an explicit `null`.

**Verify.** `npx tsc -p tsconfig.spec.json` (**not** `npm run lint` — it carries `--fix`)
**FALSIFIER.** Assign a `string` to `innovation_dev_result_id` in a scratch spec → `tsc` must error.
**Watch (K-004, measured in this repo):** a *syntax* error aborts the `tsc` parse and can hide
hundreds of type errors behind a report of three. Confirm the file parsed.
**Done.** Both keys typed; falsifier observed.

---

### T-09 — The picker  ⟨Antigravity⟩

| | |
| --- | --- |
| Status | `[ ]` |
| Size | M |
| Depends on | T-08 |
| Requirements | R-IUL-002, R-IUL-003 (all clauses), R-IUL-012 (all four states), **R-IUL-013** |
| Design | §6.1, §6.2, §6.5, §6.6, DD-11 |
| Skills | `angular-developer`, `ui-ux-pro-max` |

**Scope (Amendment 01).** Create a **new sibling card** titled `RELATED INNOVATION DEVELOPMENT`,
placed **between the *INNOVATION USE DETAILS* card and *ACTORS*** — not inside the details card.

Copy the shell class string **verbatim** from the four existing cards:
`rounded-[13px] rs-p-[30] rs-mb-[25] border border-[var(--ac-grey-200)] bg-[var(--ac-white-1)]`, with
`<h2 class="section-title">`. Per DD-11 the title carries the required asterisk.

> **There is no grid in this file.** `grep -c grid` returns **0**. Do not introduce one, and do not
> copy `policy-change.component.html`'s `grid grid-cols-12` — different file (C1).

`app-select` inside that card. `hideSelected` stays **`true`** — the card is T-10's. Option label is a
computed `<platform_code> <result_official_code> - <title>`, applied through the `#item` template so
the list and the collapsed value match T-10's card exactly (precedent:
`innovation-details.component.html:390-394`). `disabled` per design §6.5:
`!submission.isEditableStatus() || (!loading() && list().length === 0)`.

**Clauses:** card between the right siblings (R-IUL-013) · nothing moved out of the details card ·
red asterisk · amber border · "This field is required" · **must NOT** block draft save or navigation ·
**must NOT** show the empty state while `loading()` is true · **must NOT** nest inside the details card.

**Verify.** `npm test -- --silent`
**FALSIFIER.** Drop the `!loading()` guard → the "no empty state during load" spec must go red.
Remove `isRequired` → the asterisk/message specs must go red.
**Cannot prove.** Spacing, alignment, contrast, dark theme — jsdom measures no layout. Those are
**T-12's human check**, recorded here as a declared gap, not silently assumed.
**Done.** Control renders in all four states; falsifiers observed.

---

### T-10 — The page-owned card  ⟨Antigravity⟩

| | |
| --- | --- |
| Status | `[ ]` |
| Size | M |
| Depends on | T-08 |
| Requirements | R-IUL-004 (both scenarios), NFR-IUL-002, NFR-IUL-003 |
| Design | §6.3, §6.4, DD-6, DD-7 |
| Skills | `angular-developer`, `ui-ux-pro-max` |

**Scope (Amendment 01).** Render the card **from `linked_innovation_dev` in the payload** — not from
the options list, and not via `app-select`'s `#rows` (C12: a soft-deleted target would silently
vanish).

One row: `<code> - <title>` on the left, a right-aligned **`View innovation detail ↗`** anchor styled
as a secondary button on the right. **Not zero-padded** — draft 2's 3-digit rule came from
Links-to-Result and the mock contradicts it.

`<code>` composes **two** columns: `` `${platform_code} ${result_official_code}` `` → `STAR 284`.
`platform_code` is **nullable** (KZ-012), so fall back to the bare number. Never print `null 284`,
and never hard-code `STAR` as a default.
The anchor carries `href="/result/<code>/general-information"`, `target="_blank"`, `rel="noopener"`,
and a visually-hidden *"(opens in a new tab)"* in its accessible name.

**No remove button** — the mock exposes none and the field is required (design §6.4). Do not build
one, and do not add `showClear` to the shared select.

**Clauses:** **must NOT** navigate the current tab · **must** be keyboard-operable · **must NOT**
leave the previous result in the payload after the selection changes · **must NOT** be a `click`
handler on a non-interactive element.

**Verify.** `npm test -- --silent`
**FALSIFIER (label).** Render with `platform_code: null` → the card must read `284 - …`, never
`null 284 - …` and never `STAR 284 - …`. A spec that only ever supplies a non-null platform cannot
fail for this and is not evidence of the fallback.
**FALSIFIER (link).** Assert on the **rendered DOM** — `<a>`'s `href`, `target`, and accessible name. A spec
that asserts a click *handler* was called passes with the anchor entirely absent (KZ-001). Delete the
anchor → the spec must go red.
For the remove path, arrange the **transition** (render with a link, then clear, then
`detectChanges`), never the end state — a fixture that sets the cleared input before the first
`detectChanges` tests a state the product never reaches (KZ-015).
**Done.** Card renders from payload in the mock's layout; a soft-deleted target still renders; falsifiers observed.

---

### T-11 — Payload wiring  ⟨Antigravity⟩

| | |
| --- | --- |
| Status | `[ ]` |
| Size | S |
| Depends on | T-09, T-10 |
| Requirements | R-IUL-008 (both scenarios), R-IUL-001 |
| Design | §6.5, §6.7 |
| Skills | `angular-developer`, `tdd` |

**Scope.** `buildPayload()` emits `undefined` untouched · the id when selected · an **explicit
`null`** when cleared.

> **Amendment 01:** the UI exposes no clear, so the `null` branch has no caller from this surface
> today. **Build and test it anyway** — the server contract (R-IUL-008) accepts it, and narrowing the
> client silently is how the two drift apart.

> **§6.7 — do not pattern-match the neighbour.** `innovation-use-details.component.ts:489-492` uses
> `?? undefined` deliberately, for a field that must *never* be clearable. Copying it here makes
> clearing a silent no-op. This field follows `InnovationUseOrganization`'s explicit-`null`
> discipline instead.

**Verify.** `npm test -- --silent`, asserting on `JSON.stringify(payload)` — not on the object.
**FALSIFIER.** Swap in `?? undefined` → the cleared-state spec must go red. **Asserting on the object
instead of its serialization would let that swap pass**, because the difference only appears after
`JSON.stringify` drops the key.
**Done.** Three states asserted against the serialized body; falsifier observed.

---

### T-12 — Client suite + human visual check  ⟨Antigravity builds, Claude verifies⟩

| | |
| --- | --- |
| Status | `[ ]` |
| Size | M |
| Depends on | T-09, T-10, T-11 |
| Requirements | NFR-IUL-002, NFR-IUL-003, NFR-IUL-004, **D-7** |
| Design | §9 |
| Skills | `ui-ux-pro-max` |

**Scope.** Full client suite; coverage floors (statements 40 / branches 20 / lines 45 / functions 30);
and the **human visual check that no automated gate in this repo can perform**.

**Visual checklist — against the running app, screenshotted:** field position at the end of the card ·
vertical rhythm vs the blocks above · asterisk + amber border + message · card layout with a long
title · new tab actually opens the right result · keyboard focus visible on the anchor and the remove
button · **light *and* dark theme** (the module's 2026-09-09 QA sign-off covered light only —
this requirement does not inherit that gap).

**Verify.** `npm test -- --silent` **run by the Leader, in the window after the worker reports.**
**Disqualifier.** A suite run concurrently with an active worker is **not evidence** — it competes for
`node_modules`, ports and build output, and the result is wrong, not merely slow. If runs disagree,
report the spread and re-measure in isolation.
**Cannot prove.** Nothing here is claimed beyond what a human eye confirmed; the screenshots are the
evidence, not the suite.
**Done.** Suite green, floors held, screenshots attached for both themes.

---

### T-13 — Documentation sync

| | |
| --- | --- |
| Status | `[ ]` |
| Size | S |
| Depends on | T-07, T-12 |
| Requirements | — (traceability hygiene) |
| Design | proposal §Scope X-2 |
| Skills | `cognitive-doc-design` |

**Scope.** (a) `docs/trd/trd.md` §2.4 — an ADR-style note for link role 5 and rule 16. (b)
`docs/ux-ui/design.md` decisions log — the field, its required state, the new-tab card. (c)
`family.md` row #4 → `done`. (d) **Flag the model-registry drift**: root `CLAUDE.md` lists
`gemini-3.7/3.6/3.5-flash`; `agy models` returned `gemini-3.8-flash-{high,medium,low}` on 2026-09-09.

**Why it exists as a task:** Judgment Day (A11) found these had no home. An unowned doc-sync item is
one that does not happen.

**Verify.** Grep each target for the new entry.
**FALSIFIER.** None meaningful — this is a **presence assertion**, and it proves presence, not
correctness. Stated rather than dressed up as a behavioral gate.
**Done.** All four edits present.

---

## 4. Requirement → task closure

> Closure is at **scenario and clause** granularity, not requirement ID. A gap may **not** be
> discharged by citing a different requirement.

| Requirement | Scenarios / clauses | Owned by |
| --- | --- | --- |
| R-IUL-001 | One result linked; Replacing; reactivation clause; other-roles clause | T-06, T-11 |
| R-IUL-002 | Only Innovation Dev, all of them; both `BUT`/`MUST NOT` clauses | T-09 |
| R-IUL-003 | Empty and required; the draft-save `BUT`; the same-token `AND IT MUST` | T-09 (+ T-12 visual) |
| R-IUL-004 | Selected card; Removing; both `BUT`/`MUST` clauses | T-10 |
| R-IUL-005 | Atomic with the section; the manager clause | T-06 |
| R-IUL-006 | Wrong indicator; Inactive target; Self-reference; the pre-`BEGIN` clause | T-06 |
| R-IUL-007 | Read-back; all four clauses | T-07 |
| R-IUL-008 | Omitted preserves; Explicit null clears; the "different paths" `BUT` | T-06 (server), T-11 (client) |
| R-IUL-009 | Rule 16; No grandfathering; all `MUST NOT` clauses | T-02 (shape), **T-03 (behavior)** |
| R-IUL-010 | Seed; the enum-not-literal clause | T-01 |
| R-IUL-011 | Ordering; the ANSI `BUT` clause | §5 runbook + T-01 |
| R-IUL-012 | All four states; the enabled-but-empty `BUT` | T-09 |
| NFR-IUL-001 | Refresh policy | design §6.6 (stated) + T-09 |
| NFR-IUL-002 | Keyboard; `rel=noopener`; **AT discoverability** | T-10, T-12 |
| NFR-IUL-003 | Tokens; dark theme | T-10, T-12 |
| NFR-IUL-004 | Both floors | T-06/T-07 (server), T-12 (client) |

**No orphans.** The two clauses with no automated owner — R-IUL-003's visual conformance and
NFR-IUL-003's dark theme — are routed to T-12's human check and declared as gaps in §5, not counted
as covered.

---

## 5. Risks & blockers

| # | Risk | Owner |
| --- | --- | --- |
| **B-1** | **Migrations are applied by hand by the user** (OQ-1). Until Migration A lands in an environment, every save there 500s on the FK | User. Blocks step 4 of §11.1, not the code |
| **B-2** | Migration B mid-`up()` failure leaves **no function at all** (design §11.4). Verify against the scratch schema first; keep `down()`'s body as copy-pasteable recovery SQL | Claude (T-02), user (apply) |
| **B-3** | Migration A's `down()` is **destructive** — the FK forces a hard delete of `link_results` rows (design §11.2). Never run by an agent | User only |
| **B-4** | Concurrent-PATCH race → two active rows. **Accepted**, not mitigated (design §3.2) | Recorded |
| **B-5** | If T-05's cycle resists `forwardRef`, fall back to direct repository access — only after running T-05's falsifier | Claude |
| **B-6** | The Orca `agent_prompt_stalled` false negative may mask a *genuine* worker failure. A silent worker is still a runtime failure; verify by reading the terminal, not by trusting either signal | Claude |

---

## 6. Budget reconciliation

| Metric | Budget (design §12) | Planned | Δ |
| --- | --- | --- | --- |
| Tasks | 12 | **13** | **+1** — T-13 had no home until Judgment Day (A11) found it. Recorded rather than absorbed |
| LOC | ~1,250 | ~1,250 | — |
| Review rounds | ~20 | ~20 | — |

`/akili-execute` trips on the **design** numbers. The +1 is declared here so the first tick is not
mistaken for a runaway.

---

## 7. Done definition

- [ ] All 13 tasks `[x]`, each with its Reviewer PASS recorded in `execution.md` **before** the box is
      flipped — the committed `PreToolUse` hook blocks the write otherwise, and a block is not a bug
- [ ] Server suite green, 60% floor held
- [ ] Client suite green, all four floors held
- [ ] T-03's fixture observed **red pre-migration** and green post-migration
- [ ] Every falsifier in §3 observed red at least once
- [ ] T-12's screenshots attached for light **and** dark
- [ ] Both migrations applied by the user, per §11.1's order
