# Proposal — Link an Innovation Use result to a reported Innovation Development output

> **One line:** add a **required, single-select** dropdown at the end of the *INNOVATION USE DETAILS*
> card that links the current Innovation Use result to one existing **Innovation Development**
> result, persisted in `link_results` under a **new** role, rendered as a clickable
> `official-code - title` card, and enforced by the section's green check.

---

## Document Control

| Field | Value |
| --- | --- |
| Slug | `link-innovation-dev` — **derived** from the free-text `/akili-propose` argument ("agregar un campo extra … un drop down para seleccionar un innovation dev existente"). The argument was a paragraph, never a path. |
| Spec path | `docs/specs/innovation-use/link-innovation-dev/` |
| Parent Spec | `docs/specs/innovation-use/` (family manifest — **child row #4 written 2026-09-09**) |
| Type | **Change** |
| Approval Mode | **pre-approved** (d.casanas@cgiar.org, 2026-09-09) — explicit end-to-end mandate: *"vas a crear la propuesta, especificaciones, tareas y le delegarás la ejecución de las tareas y cuando él termine una tarea tú lo validas y así hasta terminar toda la propuesta."* Exception gates (HALT, Pivot, `PRODUCT_BUG`, destructive/irreversible actions, **migration application on the shared DB** — the user runs those personally) still stop for a human. |
| Depends on | none (family children 1–3 are archived/done) |
| Parallel-safe | **no** — touches `result_innovation_use` write path + the `innovation_use_validation` function that child 1 authored |
| Source of intent | User instruction + three UI screenshots pasted in the `/akili-propose` invocation (2026-09-09). No Jira, no Figma. |
| Branch in flight | `AC-1679-Create-the-innovation-use-section` |
| Created | 2026-09-09 |

---

## Intent

A reported **Innovation Use** describes the use of *some innovation*. Today the section never names
which one. This change makes that link explicit and mandatory: one Innovation Use result points at
exactly one already-reported **Innovation Development** result.

---

## Problem / Current Behavior

| # | Today | Consequence |
| --- | --- | --- |
| 1 | `result_innovation_use` stores level, actors, organizations and quantifications — **no reference to the innovation being used** | An Innovation Use report is orphaned from the Innovation Dev output it reports on; no traceability, no roll-up |
| 2 | `link_results` already carries every other result-to-result relationship (roles 1–4) | The mechanism exists and is unused by this section |
| 3 | The Innovation Use page's last field is the level justification / evidence callout | No place to record or read the linked innovation |
| 4 | `policy-change.component.html:33-47` renders the analogous "Link to a reported Innovation Development output" `app-select`, but **`[disabled]="true"`** | Precedent for the control and its copy exists; it was never wired |

**Verified against source, 2026-09-09** — `result-innovation-use.service.ts` (`findOne` :443-488,
`update` :140-260), `link-result.entity.ts`, `link-results.service.ts`,
`link-result-roles.enum.ts`, `1787280000000-updateInnovationUseValidation.ts`,
`innovation-use-details.component.html` (302 lines), `select.component.{ts,html}`,
`get-innovation-dev-output.service.ts`.

---

## Proposed Outcome

A reporter on the Innovation Use section:

1. Sees a **required** field at the **end** of the *INNOVATION USE DETAILS* card labelled
   *"Link to a reported Innovation Development output"*, with the red asterisk, the amber invalid
   border and the "This field is required" message the rest of the section already uses.
2. Opens it and sees **only Innovation Development results** (indicator 2), searchable.
3. Selects **exactly one** — the control is single-select by construction, not by validation.
4. Sees the selection rendered below the field as a card in the partners style, showing
   **`official-code - title`** (e.g. `042 - Drought-tolerant bean variety …`).
5. **Clicks that card** and the linked result opens in **another browser tab** at
   `/result/<official-code>/general-information`.
6. Saves; the row lands in `link_results` and is returned on the next `GET`.
7. Cannot pass the section's **green check** until the link is set.

---

## Scope

### Server — implemented by **Claude, in-session** (user ruling: *"todo lo del back tú lo haces"*)

| # | Item |
| --- | --- |
| S-1 | `LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV = 5` |
| S-2 | **Migration A** — seed `link_result_roles (5, 'Innovation Use Linked Dev')`. Append-only. |
| S-3 | **Migration B** — `DROP`/`CREATE` `innovation_use_validation` adding **rule 16**: an active `link_results` row with `result_id = result_code`, `link_result_role_id = 5`, whose `other_result_id` is an active result with `indicator_id = 2`. `down()` restores `1787280000000`'s body verbatim. |
| S-4 | `CreateResultInnovationUseDto` — new optional-at-transport, required-at-green-check field (shape per §Approach) |
| S-5 | `ResultInnovationUseService.update` — validate the target's indicator **before `BEGIN`**, persist inside the existing transaction via `LinkResultsService.create(..., manager)` (DD-10: writes must not escape the transaction) |
| S-6 | `ResultInnovationUseService.findOne` — return the linked result via `LinkResultsService.findAndDetails(resultId, 5)` |
| S-7 | `ResultInnovationUseModule` imports `LinkResultsModule` (**circular-DI watch**: `LinkResultsService` already `forwardRef`s `ResultsService`) |
| S-8 | Swagger decorators; sibling `*.spec.ts` for service, controller, DTO and the migration's structural spec |
| S-9 | A **real-MySQL fixture spec** for rule 16 (KZ-001: a mocked `QueryRunner` records SQL text and can never evaluate it) |

### Client — delegated to **Antigravity** via `/orchestration` (user ruling: *"todo lo del front delegado a antigravity"*)

| # | Item |
| --- | --- |
| C-1 | `GetInnovationUseDetails` interface — new field |
| C-2 | Reuse the existing `GetInnoDevOutputService` (`indicator-codes: [2]`, already registered in the service locator as `innoDevOutput`) |
| C-3 | `app-select` at the **end** of the *INNOVATION USE DETAILS* card: `isRequired`, `hideSelected=false`, `#rows` template rendering the `official-code - title` card |
| C-4 | Clickable card → new tab at `/result/<official-code>/general-information` |
| C-5 | `buildPayload()` / `saveData()` wiring in `innovation-use-details.component.ts` |
| C-6 | Co-located `*.spec.ts` for the new rendering, the required state and the payload shape |

### Cross-cutting

| # | Item |
| --- | --- |
| X-1 | `family.md` gains child row **#4** (see below) |
| X-2 | `docs/ux-ui/design.md` decisions log + `docs/trd/trd.md` §2.4 note for the new link role |

---

## Non-Goals

- Reverse navigation (from an Innovation Dev result, listing the Innovation Uses that cite it).
- Many-to-many. **Exactly one** linked Innovation Dev per Innovation Use result.
- Touching the standalone **Links to Result** section (role 4) or its modal.
- Enabling `policy-change.component.html`'s two `[disabled]="true"` selects. Same copy, different
  spec.
- Any change to `innovation_dev_validation` (`actor_role_id = 1`).
- Cross-contract or ownership restriction on which Innovation Dev results may be picked — **ruled out** by OQ-2 (*all* Innovation Dev results are selectable).

---

## Affected Users, Systems, And Specs

| Area | Artifact |
| --- | --- |
| Users | STAR reporters and Center admins on indicator 6 |
| Server | `result-innovation-use/{service,controller,module,dto}`, `link-results`, `link-result-roles`, 2 new migrations |
| Client | `innovation-use-details` page, `get-innovation-use-details.interface.ts`, `GetInnoDevOutputService` |
| Shared client component | `app-select` — **only if** a clear/remove affordance is needed (`showClear` is hard-coded `false` at `select.component.html:31`). See R-5. |
| Database | `link_result_roles` (1 seed row), `innovation_use_validation` (rewritten) |
| Specs | `docs/specs/innovation-use/family.md`, archived children 1–3 (reference only) |

---

## Visual Reference

- **Source:** User-supplied screenshots of existing production UI (3 images, pasted 2026-09-09). No Figma, no generated mockup.
- **Location:** not persisted as files; each maps 1:1 onto a component already in this repo, which is the stronger reference:

| Image | Shows | Live analogue in repo |
| --- | --- | --- |
| #38 | "Link to a reported Innovation Use" collapsed dropdown | `policy-change.component.html:41-47` (`app-select`, disabled) |
| #39 | Partners multiselect with label, description, and the selected-item card below | `policy-change.component.html:24-31` (`app-multiselect` + `#rows`) |
| #41 | The selected-item card in isolation, with the red remove ⊗ | `app-partner-selected-item` |

- **Notes:** the target differs from #39/#41 in three ways the user stated explicitly — **single**
  select, card content is **`official-code - title`** (not institution acronym / type / flag), and
  the card is **clickable**, opening the result in another page. A generated mockup was **not**
  produced: every visual primitive already exists in-tree and the deltas are enumerated above. Say
  the word if you want one anyway.

---

## Requirement Delta Preview

### ADDED

- **A-1** The Innovation Use section exposes a single-valued link to one Innovation Development result.
- **A-2** The dropdown lists only active results with `indicator_id = 2`.
- **A-3** The selected result renders as `official-code - title` in a card beneath the control.
- **A-4** That card is a link; activating it opens `/result/<official-code>/general-information` in a new tab.
- **A-5** The field is **required**: red asterisk, amber invalid border, "This field is required".
- **A-6** `innovation_use_validation` returns `FALSE` while the link is absent (green check).
- **A-7** The server rejects (`400`) a link whose target is not an active Innovation Development result.
- **A-8** New `link_result_roles` row `5`.

### MODIFIED

- **M-1** `GET`/`PATCH` `result-innovation-use` payloads gain the field.
- **M-2** `innovation_use_validation` body — rule 16 appended (Migration B).
- **M-3** The *INNOVATION USE DETAILS* card gains a trailing field.

### REMOVED

- None.

---

## Approach Options

| | **A — Scalar field on the Innovation Use DTO** *(recommended)* | **B — Array mirroring `innovation-dev`'s `knowledge_sharing_form.link_to_result`** | **C — Reuse the standalone `PATCH /link-results` endpoint** |
| --- | --- | --- | --- |
| DTO shape | `innovation_dev_result_id?: number \| null` | `link_to_result?: LinkResult[]` + a max-1 validator | untouched |
| Cardinality of one | A **type property** — unrepresentable to send two | A runtime validator that can be forgotten, and *is* forgettable: `LinkResultsService.create` happily writes N rows | Not expressible at all — role 4 is many |
| Saves with the rest of the section | Yes, one atomic `PATCH` inside the existing transaction | Yes | **No** — a second request, so the section can be half-saved |
| Mirrors an existing pattern | Partly (`policy_change`'s `innovation_development` select uses exactly this scalar shape) | Yes, verbatim | Yes |
| Green-check coupling | Clean — rule 16 reads `link_results` regardless of transport shape | Same | Same |
| Cost | Lowest | +1 validator, +its falsification test | Rework of the Links-to-Result modal to filter by indicator |

**A wins on the property that matters here:** the user's constraint is *"solo se deberá poder
seleccionar un solo resultado no varios"*. In A that is enforced by the type system at the API
boundary. In B it is enforced by a `class-validator` rule — the same class of guard that KZ-001
records failing green thirteen times in this repo. `link_results` stays many-row underneath; only
the section's contract is single-valued.

---

## Recommended Approach

**Option A**, with a **new** link role (`5`), the field **required**, placed at the **end** of the
*INNOVATION USE DETAILS* card — all three per the user's rulings of 2026-09-09.

Execution is **split by risk**, per the user's explicit instruction:

| Half | Executor | Why |
| --- | --- | --- |
| Server (S-1 … S-9) | **Claude, in this session** | *"los ajustes del back no puedes delegarlos a antigravity por ser ajustes delicados debes implementarlos tú"* — two append-only migrations, a stored function that gates submission, and a transaction boundary |
| Client (C-1 … C-6) | **Antigravity**, dispatched via `/orchestration` | *"todo lo del front delegado a antigravity"* |
| Review of every task | **Claude** | *"cuando él termine una tarea tú lo validas"* |

> **Orca ⇄ Antigravity known false negative (user-reported, recorded here so no future reader
> mis-reads it as a failure):** `worker-start` marks the dispatch `failed` after ~8 s with
> `agent_prompt_stalled` because Orca does not recognize Antigravity's TUI. **The worker is in fact
> running.** Do not re-dispatch on that signal; verify by reading the terminal. This is consistent
> with root `CLAUDE.md`'s note that `worker-start --agent gemini` is `agent_unconfigured` on this
> install and that the `terminal create` + `orchestration dispatch --inject` path is the one that
> preserves provenance. It does **not** repeal the rule that *a delegated worker that does not
> deliver is not a worker that found nothing* — a genuinely silent worker is still a runtime
> failure; only this specific 8-second `agent_prompt_stalled` is the false negative.

---

## Risks, Dependencies, And Open Questions

### Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| **R-1** | **K-015 — the CI/CD pipeline deploys code but does NOT apply migrations.** Both migrations must be applied by a human, on a shared non-disposable Dev DB and later on Prod. | **Critical** | Sequence the release: apply Migration A **before** the server code that writes role 5 ships, or every save 500s on the `link_result_role_id` FK. Check pending state with `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts` — and per **K-014**, strip ANSI before counting `[ ]`, and check for an error in the raw output before trusting a zero. **Owner settled (OQ-1): the user runs both migrations against the real DB. Claude never touches it.** |
| **R-2** | Migration B rewrites a stored function whose body has **already been rewritten once** (`1787280000000`). A `down()` that merely drops leaves no function at all. | **High** | `down()` restores `1787280000000`'s body byte-for-byte, exactly as that migration restores its own predecessor's. |
| **R-3** | **Making the field required is retroactive.** Every Innovation Use result already reported — in any status — goes green-check `FALSE` the moment Migration B lands, with a newly-required field the reporter never saw. | **High** | **Resolved 2026-09-09 (OQ-1): no grandfathering.** Rule 16 applies uniformly to every result; the user applies both migrations against the real DB personally and owns the timing and the comms. `/akili-specify` carries this as a requirement — rule 16 gets **no** cut-off-date clause. |
| **R-4** | **KZ-001 / KZ-017** — a mocked `QueryRunner` records SQL text and never executes it; SQL operator precedence (`A OR B AND C`) has passed as `(A OR B) AND C` in this repo before. | **High** | Rule 16 gets a real-MySQL fixture spec (S-9) and every OR/AND term is individually parenthesized, exactly as `1787280000000` mandates for itself. Structural specs assert shape only and must say so. |
| **R-5** | **KZ-002** — `app-select` is a shared component rendered on many routes. If a clear/remove affordance requires touching it (`showClear` is hard-coded `false`), the blast radius is every select in STAR. | Medium | **Resolved in `design.md` draft 2 (C9/C12): no shared-component change is needed.** `app-select` is used as the picker only and the card is page-owned. ~~`SelectComponent`'s internal `body` signal only re-syncs on `currentResultIsLoading()`~~ — **this was false**: the effect reads `this.signal()` inside its body (`select.component.ts:95,106`), so the read is tracked and a page-level clear does propagate. |
| **R-6** | `GetInnoDevOutputService` is a **root singleton that fetches once in its constructor** with `limit: 10_000`. A result created after page load is invisible; a large corpus is a heavy single payload. | Medium | Design decides: re-`main()` on section entry, or switch to the open-search filter path (`isOpenSearch()`), which `app-select` already supports. |
| **R-7** | Circular DI. **Severity raised Low → High by Judgment Day (C7).** | **High** | ~~Mirror `ResultInnovationDevModule`, which already imports `LinkResultsModule` and works.~~ **That mitigation was false** — `ResultInnovationDevService` never injects `ResultsService`, only reaching it transitively via `LinkResultsService`. The real edge: `ResultsModule` already imports `ResultInnovationUseModule` (`results.module.ts:31,77`), so pulling in `ResultsService` closes a cycle. `design.md` §5.3 specifies `forwardRef` on both the module import and the injection, with a direct-repository fallback. |
| **R-8** | **KZ-004 / concurrency** — the split execution means an Antigravity client worker and Claude server work could overlap. | Medium | Cross-package parallelism is safe **for editing** only. Never run a full suite while a worker is active; the Leader re-measures both suites after each worker reports. |
| **R-9** | The card's click target must not swallow the dropdown's own interaction, and must be keyboard-reachable. | Low | Real `<a target="_blank" rel="noopener">`, not a `click` handler on a `div`. |

### Dependencies

- Family children 1–3 are **archived / done**; nothing blocks this chunk.
- A human with DB access, for R-1.

### Open Questions

| # | Question | Answer (user, 2026-09-09) |
| --- | --- | --- |
| **OQ-1** | Does the retroactive green-check break (R-3) get grandfathering, or communication? | **Answered — no grandfathering.** *"cuando tengas las migraciones yo las ejecutaré contra la db real."* Rule 16 applies to every result uniformly; the user applies both migrations personally and owns timing/comms. Migration B is unblocked. |
| **OQ-2** | May a reporter link an Innovation Dev result from any contract/center, or only their own? | **Answered — all of them.** *"todos los inno dev."* No contract, center or ownership filter; `only-own-results=false` stays as-is. |
| **OQ-3** | Are draft-status results selectable, or only submitted/approved? | **Answered — every active one.** *"todos los que estén activos."* The predicate is `is_active = TRUE` alone; `result_status_id` is **not** filtered, on either the options query or rule 16. |
| **OQ-4** | Exact copy for the label, description and the `link_result_roles` row-5 name | **Open (cosmetic).** Default stands: label *"Link to a reported Innovation Development output"* (reusing `policy-change`'s existing string verbatim), role name `'Innovation Use Linked Dev'`. |
| **OQ-5** | Does the Innovation Use report/export view need the linked result as a column? | **Open.** Out of scope unless answered yes. |

---

## Success Criteria

| # | Criterion | How it is proven |
| --- | --- | --- |
| SC-1 | The field renders at the end of *INNOVATION USE DETAILS* with asterisk, amber invalid border and "This field is required" | Component spec + a real screenshot of the running app |
| SC-2 | The dropdown lists only `indicator_id = 2` results | Service spec asserting the request's `indicators` param, plus a run against Dev |
| SC-3 | Exactly one may be selected | Type-level: the DTO field is a scalar. Plus a server spec proving a two-element payload is rejected or impossible to express |
| SC-4 | The card shows `official-code - title` and opens the result in a new tab | Component spec asserting the rendered `<a href>` and `target` — **asserted on the rendered DOM, never on a handler call** (KZ-001) |
| SC-5 | Saving persists one `link_results` row with role 5, inside the section's transaction | Service spec + e2e |
| SC-6 | A non-Innovation-Dev target is rejected `400`, and nothing is persisted | Service spec — validation runs before `BEGIN` |
| SC-7 | `innovation_use_validation` returns `FALSE` without the link and `TRUE` with it | **Real-MySQL fixture spec**, observed red before rule 16 exists (K-004) |
| SC-8 | Both suites green; client coverage floors and server's 60% floor held | `npm test -- --silent` in each package, run by the Leader after every worker reports |

---

## Family manifest edit — **done**

`family.md`'s child list is a closed set. Row **#4** was written on approval (2026-09-09):

```markdown
| 4 | Link to a reported Innovation Development output | [`link-innovation-dev/`](link-innovation-dev/) | none (children 1–3 archived/done) | no | pending |
```

The folder pre-existed only to carry this proposal; with the row in place, `/akili-specify` may write
`requirements.md`, `design.md` and `tasks.md`.

---

## Next Step

```text
/akili-specify docs/specs/innovation-use/link-innovation-dev
```

Standard depth. OQ-1/2/3 are **answered** and bind as requirements: no grandfathering in rule 16,
no ownership/contract filter on the options query, and `is_active = TRUE` as the **only** row
predicate on both sides (status is never filtered). The spec must also (a) split `tasks.md` into a
**server lane (Claude)** and a **client lane (Antigravity)** with the dependency edge server→client
made explicit, and (b) carry R-1's release sequencing as an acceptance criterion, not a footnote.
