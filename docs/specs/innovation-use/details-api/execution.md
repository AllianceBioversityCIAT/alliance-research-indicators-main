# Execution Log — Results (Innovation Use) / Details API

- **Module:** results (`innovation-use`)
- **Spec id:** 2026-08-innovation-use-details-api
- **Spec path:** `docs/specs/innovation-use/details-api/`
- **Parent spec:** [`../family.md`](../family.md) — chunk 2 of 3
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked design:** [`./design.md`](./design.md)
- **Linked tasks:** [`./tasks.md`](./tasks.md)

---

## Document Control

| Field | Value |
| --- | --- |
| Approval Mode | **gated** (from `proposal.md` Document Control) — every continue/pause gate stops for the user |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Package | `server/researchindicators` (server-only chunk) |
| Budget (`design.md` §12) | 13 tasks · ~2,400 LOC · **~24 review rounds** (re-baselined from 6–8, 2026-08-19, user ruling — see § *Budget Escalation*) |
| Rework ceiling | 3 attempts per task |
| Leader model tier | T1 · Implementer T2 · Reviewer T3 (`author ≠ auditor` enforced by the `.claude/agents/akili-*` wrappers) |
| Log opened | 2026-08-19 |

**Review-round tally:** **8 of ~24 consumed** (T-01 ×2, T-02 ×1, T-03 ×3, T-04 ×1, T-05 ×1) at 5 of 13 tasks. T-05 additionally cost two Reviewer spawns that died on `529 Overloaded` without returning a verdict — wall-clock, not rounds. Budget re-baselined 2026-08-19 by user ruling — see § *Budget Escalation* and its resolution.

---

## Task Execution History

### T-01 — Innovation Use level catalog module

- **Status at the time of this entry:** `[~]` **PIVOT** — blocked on a spec defect, not on implementation quality. **Superseded — see § *T-01 — FINAL* below: the Pivot was ruled on and T-01 closed `[x]` on attempt 2.** This line is left as written rather than rewritten, because the log is append-only history; the pointer is the correction.
- **Date:** 2026-08-19
- **Implementer attempts run:** 1 (of a possible 3; the loop was stopped by the Pivot Protocol, not by the ceiling)
- **Requirements in scope:** R-IUA-010 (AC.1–AC.6 + scenario), R-IUA-013 AC.1, AC.5
- **Skills assigned:** `nestjs-expert`, `api-design-principles` (task defaults, unchanged) · **Effort:** `medium`

#### Attempt 1

**Files changed** (6 files, +236 lines, all additive):

| File | State |
| --- | --- |
| `src/domain/tools/clarisa/entities/clarisa-innovation-use-levels/clarisa-innovation-use-levels.service.ts` | new |
| `…/clarisa-innovation-use-levels.controller.ts` | new |
| `…/clarisa-innovation-use-levels.module.ts` | new |
| `…/clarisa-innovation-use-levels.service.spec.ts` | new |
| `…/clarisa-innovation-use-levels.controller.spec.ts` | new |
| `src/domain/tools/clarisa/routes/clarisa.routes.ts` | modified — one import + one route node |

**Implementer verification**

- `npm test -- --silent` from `server/researchindicators` → **330 suites passed, 2161 tests passed** (full suite, not targeted).
- Scoped: `npx jest src/domain/tools/clarisa/entities/clarisa-innovation-use-levels --silent` → 2 suites, 6 tests, green.
- **Falsification performed:** the `order: { level: 'ASC' }` line was temporarily deleted from the service; both order-asserting specs failed with a diff showing the missing `order` key; the file was restored and the suite re-confirmed green. This is the falsifying input the task names.
- `grep -n "findByName\|findByNames"` over both new source files → no output, exit code 1 (zero hits).
- `npm run lint` deliberately **not** run — the script carries `--fix` and mutates files; T-01's stated gate is `npm test` only.

**Implementer `Not Done / Assumptions`** (recorded verbatim, per the Step 2.3.0 rule):

> One judgment call, made deliberately and reasoned through: the task's implementation note ("`BaseController`'s handlers are inherited, so `@ApiOperation` goes on the subclass, not on an override") together with `design.md` §4's explicit API-surface entry for this endpoint led me to add an `@ApiOperation` summary on the controller. Because Nest's route metadata (`@Get()`) is attached to the concrete function object rather than resolved through the prototype chain once a same-named method is redefined, overriding `find()` to add `@ApiOperation` required re-declaring `@Get()` on the override too — otherwise the route silently stops being registered. […] This is the only place where my code differs from the exemplar's literal shape.

No scope was left incomplete. The entry is a declared deviation, not an omission.

**Reviewer verdict: `STATUS: FAIL`** — one issue.

> **1. Discovered Issue:** The controller overrides the inherited `find()` handler and re-declares `@Get()` on it, purely to hang `@ApiOperation` on the subclass. This is a **second** override beyond the one the task authorizes, and it is the exact placement the task's Implementation notes prohibit. It is also unprecedented: it is the only `super.find()` in the entire `src` tree, and none of the 19 sibling `BaseController` subclasses does this. No T-01 Done criterion requires `@ApiOperation` — criterion 4 asks only for the tag and the bearer lock, and R-IUA-013 AC.3 is deferred to T-13's human check — so the annotation buys nothing at this gate while costing a repo-wide pattern break.
>
> **Violated Rule:** `tasks.md` § T-01 **Scope** — *"Mirror `clarisa-innovation-readiness-levels/` exactly … with **one override**: `findAll()` adds `order: { level: 'ASC' }` (DD-6)."* And same section, **Implementation notes** — *"`BaseController`'s handlers are inherited, so `@ApiOperation` goes on the subclass, **not on an override**."* Mirrored in `design.md` § `GET /api/v1/tools/clarisa/innovation-use-levels`.
>
> **Remediation Suggestion:** Delete the `find()` override and the `@ApiOperation` import/decorator, leaving the exact exemplar shape. The controller spec needs no change. **Leader decision, not Implementer:** if the `@ApiOperation` summary is wanted, the spec must be amended first, because the instruction as written is unachievable — `ApiOperation` is a `createMethodDecorator` and throws when applied to a class.

**Reviewer per-criterion verdicts — all six T-01 done criteria, including those with no finding** (KZ-007 completeness line):

| # | Criterion | Verdict |
| --- | --- | --- |
| 1 | Ten rows in a `ServerResponseDto` with `id`, `level`, `name`, `definition` (AC.1, AC.2) | SATISFIED — entity exposes all four columns; envelope preserved through `super.find()` |
| 2 | `level` ascending `0…9` (AC.3) | SATISFIED — `order` is DB-side |
| 3 | Explicit `order` clause asserted against the mocked repo's options object (AC.4 + scenario) | SATISFIED — asserted twice; signature byte-for-byte the base's, LSP-safe |
| 4 | `Clarisa` Swagger tag + bearer lock (AC.5) | SATISFIED — independent of the FAIL; the criterion names only tag and lock |
| 5 | Zero `findByName` / `findByNames` call sites (AC.6) | SATISFIED — independently re-grepped, zero hits. `super(…, 'name')` is the base's `findByNameKey` config, verbatim from the exemplar; it configures but never calls the lookup |
| 6 | `npm test -- --silent` green | SATISFIED — 330 suites / 2161 tests from the correct package root |

DD-4 (zero migrations) — **held**, nothing under `src/db/migrations/`.

**`ADVISORY` findings (4R lens — recorded, non-gating, and they do not become tasks):**

- **Reliability** — nothing in the suite guards the route registration the override depends on. The controller spec calls `controller.find()` directly, so deleting `@Get()` leaves every test green while the endpoint 404s. If the override survives, it must ship `expect(Reflect.getMetadata(PATH_METADATA, …prototype.find)).toBeDefined()`.
- **Risk** — the override permanently decouples this handler from `BaseController.find`'s method-level metadata. Nothing is lost today, but a future handler-level decorator on the base (a guard, `@ApiQuery`, `@Version`) would reach 19 controllers and silently skip this one.
- **Readability** — the override's code comment reframes the spec's prohibition ("an override, not an edit to the shared `BaseController`") rather than acknowledging it; editing the base was never the alternative on offer.
- **Reliability (forward pointer → T-05 / T-06)** — `findAll(relations, where)` drops the `is_active: true` default whenever a caller supplies `where`, faithfully inherited from `clarisa-base-service.ts:54-61`. **T-06's level resolution must pass `is_active` explicitly if it ever calls `findAll` with a `where`, or it will read soft-deleted catalog rows.**
- **Risk (forward pointer → T-05 / T-06)** — `findByName` / `findByNames` remain public on the service and the module exports it. R-IUA-010 AC.6 holds today, but the LIKE-based lookup stays reachable. **To be restated in the T-05 and T-06 briefs.**
- **Readability** — `tasks.md` T-01 criterion 1 and `design.md` §4 name the URL as `/api/v1/tools/clarisa/…`, but `main.ts` enables URI versioning without `defaultVersion` and neither the routes tree nor `BaseController` adds a version segment. Platform-wide property, not a T-01 defect; **confirm the literal path during T-13's human `/swagger` check.**
- **Readability** — the controller spec's `(ResponseUtils.format as jest.Mock) = mockFormat` reassignment is repo convention, copied from the exemplar, and does not leak across suites (per-file module registry + `jest.clearAllMocks()`). No change warranted.

---

## Pivot Record: T-01

**Trigger.** The Reviewer's FAIL is well-founded against the spec as written, but the spec as written cannot be satisfied. Both branches of T-01's Implementation note are closed:

- Placing `@ApiOperation` **on an override** is what the note forbids.
- Placing `@ApiOperation` **on the subclass (class level)**, which the note directs, throws at class-definition time.

**Evidence (verified inline by the Leader, at source, not taken from either worker's report).**
`@nestjs/swagger` builds `ApiOperation` via `createMethodDecorator` (`node_modules/@nestjs/swagger/dist/decorators/api-operation.decorator.js:10-12`), and `createMethodDecorator` dereferences `descriptor.value` unconditionally:

```js
function createMethodDecorator(metakey, metadata, { overrideExisting } = { overrideExisting: true }) {
    return (target, key, descriptor) => {
        if (typeof metadata === 'object') {
            const prevValue = Reflect.getMetadata(metakey, descriptor.value);
```

At class level Nest passes no `descriptor`, so the expression is `undefined.value` — a `TypeError` at class-definition time, not a silent no-op.

The Implementer's supporting claim was also verified by the Reviewer at source and holds: `@nestjs/core@10.4.15`'s `PathsExplorer.exploreMethodMetadata` (`node_modules/@nestjs/core/router/paths-explorer.js:26-30`) reads `PATH_METADATA` off the concrete function object, so a `find()` override without a re-declared `@Get()` silently unregisters the route.

**The contradiction this exposes is not confined to T-01.** Two approved clauses now conflict:

| Clause | Says |
| --- | --- |
| `tasks.md` § T-01 Implementation notes · `design.md` § §4 catalog entry | `@ApiOperation` goes on the subclass, **not on an override** — *impossible* |
| `requirements.md` R-IUA-013 AC.3 · `tasks.md` § T-13 done criterion | *"`/swagger` shows **all three new handlers**, each with tag, `@ApiOperation` summary, bearer lock"* — the catalog GET is one of the three |

So simply deleting the annotation (the Reviewer's primary remediation) closes T-01 but **guarantees a T-13 failure** on R-IUA-013 AC.3. The defect must be resolved at the spec level whichever way it goes.

**Alternatives.**

| Option | Change | Cost |
| --- | --- | --- |
| **1 — Authorize the override** | Correct T-01's Implementation note + `design.md` §4; add a DD recording that `@ApiOperation` on an inherited `BaseController` handler requires a `find()` override re-declaring `@Get()`. Add the `PATH_METADATA` assertion the Reviewer's Reliability advisory requires | ~15 LOC; breaks a 19-controller pattern for one controller; carries the Risk-lens divergence permanently |
| **2 — Exempt inherited base handlers** *(Leader's recommendation)* | Delete the override and the `@ApiOperation` — T-01 becomes the exact mirror the Scope demands. Amend R-IUA-013 AC.3 and T-13's criterion to exempt handlers inherited from `BaseController`, on the ground that all 20 such controllers are equally undecorated | The catalog endpoint shows no summary in `/swagger` — a real but minor DX loss on a control-list endpoint identical to its 19 siblings |
| **3 — Fix it at the base** | Add `@ApiOperation` support to `BaseController` itself | Rejected: out of scope for an API chunk, and widens the blast radius to 19 controllers |

**Leader's recommendation: Option 2**, on the spec's own reasoning rather than on convenience:

1. T-01's Scope is emphatic — *"Mirror … **exactly** … with **one override**"*. A second override is a direct contradiction of the task's central instruction.
2. **DD-5 is the governing precedent.** The spec already refused `@Roles(...)` on these endpoints because *"matching the reference means none"* and adding them *"would make Innovation Use the only section with a rule the client does not mirror"*. `@ApiOperation` on an overridden base handler is the identical shape of deviation.
3. **R-IUA-013's own stated intent decides it.** The requirement exists so *"the new endpoints [are] indistinguishable from the rest of the API"*. Matching the 19 undecorated siblings **is** the conforming outcome; the override is what would make this endpoint distinguishable.
4. The Reviewer's Risk-lens finding — a future handler-level decorator on `BaseController.find` silently skipping this one controller — is a durable maintenance hazard bought for one Swagger summary line.

**Scope of the amendment under Option 2** — narrow, and it must not over-reach. The exemption covers **only** handlers inherited from `BaseController`. T-07's controller declares its own `@Get`/`@Patch` handlers, so `@ApiOperation` there is straightforward and stays fully required; T-13's human check would then verify two decorated handlers plus one exempted inherited handler, with the exemption named.

**Correction closure required once the ruling lands** (two-direction sweep, per `/akili-specify` → *Correction Closure* and KZ-005): grep the whole spec folder forward for every phrasing of *"all three new handlers"* / *"every new handler"* / `@ApiOperation`, and grep backward for documents citing R-IUA-013 AC.3 or T-01's Implementation note. The superseded claim survives in phrasings the pivot analysis did not cite.

**Working tree left intact.** No rollback was applied: this is a Pivot, not a 3-attempt HALT, and both live options are reachable from the current tree with a small edit (Option 1 adds an assertion; Option 2 deletes ~12 lines). The tree state is 6 files, +236, as tabulated above.

**Status:** awaiting the user's ruling. Execution of T-01 does not resume until it lands.

---

## Pivot Resolution: T-01 — user ruling, 2026-08-19

**Ruling: Option 2 — exempt handlers inherited unchanged from `BaseController`.** The catalog `GET` carries no `@ApiOperation`; T-01 becomes the exact mirror its Scope demands. The exemption is narrow and binds **only** to handlers a subclass inherits without overriding — T-07's own-declared `GET`/`PATCH` keep `@ApiOperation` and `@ApiBody` fully required.

Recorded in the spec as `design.md` **DD-13** and `requirements.md` **D-IUA-10** (§13, under a new *Resolved decisions (execution-time ruling)* heading kept deliberately separate from the specify-time table, so the provenance of the ruling is not backdated).

---

### T-01 — Innovation Use level catalog module *(continued)*

#### Attempt 2 — implements the ruling

**Skills:** `nestjs-expert`, `cognitive-doc-design` · **Effort:** `high` (bumped one level from `medium`).

> **Leader deviation from the task's skill list, recorded per the Delegation Discipline rule:** dropped `api-design-principles` — the API-design question was settled by the user's ruling, so it bought nothing on this attempt. Added `cognitive-doc-design` — half of attempt 2 edits persistent spec documents. The effort bump follows the rework rule, though noting the cause honestly: attempt 1 did not under-think, it followed an unachievable instruction. The bump is justified by attempt 2 being strictly harder (a multi-document correction sweep on top of the code fix), not by attempt 1's quality.

**Part A — code fix.** `clarisa-innovation-use-levels.controller.ts`: removed the `find()` override, its `@Get()`, its `@ApiOperation`, the comment block, and the now-unused `Get` / `ApiOperation` imports. Result is the exemplar shape. No other source file touched — the service, module, both unit specs, and `clarisa.routes.ts` are byte-identical to attempt 1, which the Reviewer had already verdicted SATISFIED.

**Part B — spec amendment (8 sites, 7 assigned + 1 the sweep found).**

| # | File · section | Change |
| --- | --- | --- |
| 1 | `requirements.md` § R-IUA-013 AC.3 | Split: `@ApiTags`/`@ApiBearerAuth` on every handler; `@ApiOperation`/`@ApiBody` on **own-declared** handlers only; catalog `GET` named as the exemption with its ground stated inline |
| 2 | `requirements.md` § 13 | New *Resolved decisions (execution-time ruling)* subsection carrying **D-IUA-10** |
| 3 | `tasks.md` § T-01 Implementation notes | Unachievable instruction replaced with the correct one plus the reason, so a future reader does not re-derive the override |
| 4 | `tasks.md` § T-13 done criteria | Human-check line now separates the two own-declared handlers from the exempted inherited one, and tells the checker to **confirm** the exemption rather than flag it |
| 5 | `design.md` § 4 catalog `GET` entry | Swagger line corrected |
| 6 | `design.md` § 11 | **DD-13** added, with both rejected alternatives recorded |
| 7 | `design.md` § 15 Revision Log | One entry |
| 8 | `requirements.md` § 5.3 DC-8 row | **Found by the sweep's backward direction, not by the assignment** — it restated AC.3's human-check content and had gone stale identically |

Site 8 is the sweep earning its cost: an assignment-driven edit set would have shipped a stale DC-8 row asserting the superseded claim.

**Part C — two-direction correction sweep (KZ-005, KZ-007).** File set bound explicitly to every `.md` under `docs/specs/innovation-use/`. Forward direction swept the *claim* across phrasings (`ApiOperation`, `on the subclass`, `not on an override`, `inherited handler`, `three new handlers`, `every new handler`, `new surface`, `Swagger`, `R-IUA-013`); backward direction checked every site citing R-IUA-013 AC.3, T-01's Implementation notes, or design.md §4; new terms introduced by the correction (`DD-13`, `D-IUA-10`, "inherited unchanged") re-grepped for orphaned use. Per-file completeness tables were produced by the Implementer and **independently reproduced by the Reviewer**, including files with zero findings.

**Implementer verification:** `npm test -- --silent` from `server/researchindicators/`:

```
Test Suites: 330 passed, 330 total
Tests:       2161 passed, 2161 total
Snapshots:   1 passed, 1 total
Time:        20.52 s
```

The controller spec passed **unchanged** — it calls `controller.find()` directly, so it exercises the inherited handler as well as the override it replaced.

**Implementer `Not Done / Assumptions` (verbatim):**

> - **T-01's `Status:` line** (tasks.md line 71, currently *"BLOCKED — PIVOT... Awaiting the user's ruling"*) was **not** updated. The Leader's 7-item Part B list didn't include it, and task-status bookkeeping is normally the Leader's to close out post-review — flagging rather than assuming.
> - `proposal.md` was reviewed but not edited (see Part C note) — judgment call that its general "every endpoint" phrasing is pre-spec aspiration, not an outright-false claim, per the stated bar for editing that file.
> - Everything else in scope (A, B, C) is complete.

**Leader adjudication of both items.** Neither is outstanding task scope. Item 1 is the Leader's own bookkeeping, closed by this entry and the `tasks.md` write that follows it. Item 2 was referred to the Reviewer for adjudication and resolved below.

#### Reviewer verdict — `STATUS: PASS`

> The controller is now an exact structural mirror of the readiness-levels exemplar with the `find()` override fully removed, and all six T-01 done criteria verify at source — criteria 1 and 4 are strictly stronger than in attempt 1 because the envelope and the class-level Swagger metadata now reach the handler through the same inherited path as 19 shipping siblings rather than a hand-rolled re-declaration. The spec amendment implements the ruling faithfully, the exemption does not leak into T-07's obligations, T-13's human instruction is unambiguous, and my independent two-direction sweep of all six spec-family documents found zero surviving statements of the superseded claim and zero orphaned uses of the new terms.

**Per-criterion verdicts — all six, including those with no finding (KZ-007):**

| # | Criterion | Verdict |
| --- | --- | --- |
| 1 | Ten rows in a `ServerResponseDto` with `id`, `level`, `name`, `definition` (AC.1, AC.2) | SATISFIED — **improved by the revert**; `find()` now inherited verbatim, envelope structurally identical to 19 siblings rather than re-derived |
| 2 | `level` ascending `0…9` (AC.3) | SATISFIED, with the spec's declared weakness intact (F-D cannot falsify — `design.md` §10.5) |
| 3 | Explicit `order` clause asserted against the mocked repo's options object (AC.4 + scenario) | SATISFIED — asserted in **both** branches; the custom-`where` branch is stronger than the criterion requires |
| 4 | `Clarisa` tag + bearer lock (AC.5) | SATISFIED — **the criterion the revert most improves**; class-level decorators are class-legal and route discovery now walks the same prototype path as the shipping exemplar, so this is proven by pattern-identity instead of needing its own metadata proof |
| 5 | Zero `findByName` / `findByNames` call sites (AC.6) | SATISFIED — independently re-grepped, zero matches |
| 6 | `npm test -- --silent` green | SATISFIED — 330/330 suites, 2161/2161 tests, correct package root, lean invocation |

**Independent corroboration by the Reviewer** (not taken from the Implementer): `extends BaseController` matches **20** files including the new one → the "19 siblings" count in DD-13 / D-IUA-10 is exact. The `@ApiOperation` occurrences that do exist in the clarisa tree (`clarisa-levers`, `clarisa.controller`, `clarisa-projects`, `clarisa-science-programs`) are all on **own-declared** handlers, corroborating the ruling's own/inherited split. `grep 'super\.find'` over the clarisa tree returns nothing — the override is fully gone, not partially reverted.

**Exemption-leak check (Part B soundness):** `design.md` §4's section `GET`/`PATCH` entries untouched; `tasks.md` T-07 still requires `@ApiOperation` on both handlers and `@ApiBody` on the PATCH; AC.3 states the own-declared obligation *before* the exemption. Three independent statements of the boundary, mutually consistent.

**`ADVISORY` findings (4R lens — recorded, non-gating, and they do not become tasks):**

| Lens | Finding | Disposition |
| --- | --- | --- |
| Readability | `requirements.md` §13's preamble said *"the specify-time AC.3 text **below**"*, but AC.3 is in §7 (above §13) and its original wording no longer exists in that file | **Fixed by the Leader** — a factual error introduced by this change set, so correcting it completes the task rather than widening it. Now points to §7 and to `execution.md`'s Pivot Record as the only verbatim copy |
| Readability | `design.md:359` routes the Swagger-completeness gate to *"a human check (§10.4)"*, but §10.4 is "The harness question — RB-4" and says nothing about Swagger | **Pre-existing, not introduced here → recorded, not fixed.** Widening the task to absorb it is exactly what the advisory rule forbids. **Forward pointer: carry into T-13's brief** — it will bite the human checker there |
| Risk | Attempt 1's hazard — a future handler-level decorator on `BaseController.find` silently skipping the one overriding subclass — is now **structurally eliminated** rather than mitigated, because no override exists | **Logged closed.** Supersedes the Risk advisory recorded against attempt 1 |
| Readability | `tasks.md:338` gives T-07 "R-IUA-013 (**all ACs**)" while §3's matrix assigns "AC.3 T-13 (human)" — slightly more visible now that AC.3 has two distinguishable halves | **Pre-existing → recorded, not fixed. Forward pointer: carry into T-07's brief** (T-07 owns the own-declared half; T-13 verifies both) |

**Reviewer adjudication of `proposal.md` (Leader-referred item 4) — accepted.** Recommendation: leave `proposal.md` unedited and extend D-IUA-10's `Supersedes` cell instead. Grounds, verified by the Leader at source before accepting: the family already has a settled mechanism used twice — D-IUA-5 supersedes *"proposal scope item **7**"* and D-IUA-6 supersedes *"proposal scope item **6**, **R-4**"*, in both cases **without editing `proposal.md`**. Editing it here would make this the only supersession handled differently from its two nearest neighbours. The Reviewer also noted that `proposal.md`'s success-criteria list contains at least one other equally-superseded line (*"Green checks refresh within the save response"*, overturned by D-IUA-6), so editing only the Swagger line would itself be a partial sweep — the precise KZ-005 shape. **Leader applied the recommended fix:** D-IUA-10's `Supersedes` cell now names both proposal passages by section and quoted phrase.

#### Leader-applied closure edits (2026-08-19)

Two spec-document edits made inline by the Leader, both within the Pivot's correction closure rather than new scope, and both post-dating the Reviewer PASS:

1. `requirements.md` §13 preamble — corrected the misdirected "below" pointer (advisory 1 above).
2. `requirements.md` D-IUA-10 `Supersedes` cell — added the two `proposal.md` passages (the Reviewer's adjudication of item 4).

Neither touches source code or any acceptance criterion; both are confined to text this change set authored. Recorded here so the diff is traceable to a decision rather than appearing as an unattributed edit.

---

### T-01 — FINAL

- **Final status:** `[x]` **DONE 2026-08-19** — PASS on attempt 2 of a possible 3.
- **Attempts run:** 2 (attempt 1 FAIL → Pivot → user ruling → attempt 2 PASS). The FAIL was against a spec defect, not a quality defect.
- **Requirements covered:** R-IUA-010 AC.1–AC.6 + its scenario · R-IUA-013 AC.1, AC.5
- **Final verification:** `npm test -- --silent` from `server/researchindicators/` → 330/330 suites, 2161/2161 tests.
- **Decisions made:** DD-13 / D-IUA-10 (the `@ApiOperation` exemption, user-ruled).
- **Issues encountered:** one spec defect (an unachievable instruction, self-contradictory with R-IUA-013 AC.3), resolved by Pivot rather than absorbed by rework.
- **Declared limits, restated so they are not mistaken for proven** *(T-01's "Verification & its limits")*: the `level`-ordering guarantee rests on a **code-level assertion, not a behavioral one**. Because `id = level + 1` on the current seed, PK order is coincidentally correct and **no end-to-end assertion available today can falsify a missing `order` clause**. T-11's F-D is declared weak for the same reason and would pass with the override deleted. The real gate is the unit spec on the `order` clause — itself only a presence assertion. Neither F-D green nor this PASS is evidence that ordering is guaranteed against a future re-seed.

**Forward pointers created by T-01 — these are carried by the brief that consumes them, not by having been written here:**

| → Task | Pointer |
| --- | --- |
| T-05, T-06 | `findAll(relations, where)` drops the `is_active: true` default whenever a caller supplies `where` (inherited from `clarisa-base-service.ts:54-61`). **T-06's level resolution must pass `is_active` explicitly if it calls `findAll` with a `where`, or it will read soft-deleted catalog rows.** |
| T-05, T-06 | `findByName` / `findByNames` remain public on the catalog service and the module exports it. R-IUA-010 AC.6 holds today, but the `LIKE %name%` lookup stays reachable — restate the prohibition in both briefs. |
| T-07 | `tasks.md:338` gives T-07 "R-IUA-013 (all ACs)" while §3's matrix assigns AC.3 to T-13. T-07 owns the **own-declared** half of AC.3 (`@ApiOperation` on both handlers, `@ApiBody` on the PATCH); T-13 verifies both halves. |
| T-13 | `design.md:359` misroutes the Swagger-completeness gate to §10.4, which is about the fixture harness (RB-4) and says nothing about Swagger. The real substitute lives in `requirements.md` §5.3 and T-13's own criterion. |
| T-13 | Confirm the literal URL path during the `/swagger` human check: `tasks.md` and `design.md` §4 both write `/api/v1/tools/clarisa/…`, but `main.ts` enables URI versioning **without** `defaultVersion` and neither the routes tree nor `BaseController` adds a version segment. Platform-wide property, not a T-01 defect. |

**Budget status:** 1 of 13 tasks complete. **2 of 6–8 review rounds consumed** (both on T-01). Within budget, but the first task spent two rounds on a spec defect — worth watching, not yet an escalation.

---

## Constitution Impact: T-01

- **Module created:** `ClarisaInnovationUseLevelsModule` under `src/domain/tools/clarisa/entities/` — a routine addition inside an existing package, following the pattern of 19 sibling control-list modules. No module boundary moved.
- **Public surface change:** one new endpoint, `GET /tools/clarisa/innovation-use-levels`, registered in `clarisaRoutes`. `design.md` §4 and `requirements.md` §10 already document it; no constitutional doc is left misleading by it.
- **Child guide:** none needed. `server/researchindicators/src/CLAUDE.md` already describes the control-list module pattern generically; this module adds no convention it does not cover, and the root guide's `## Module Guides` index needs no new entry.
- **CodeGraph re-index: PENDING.** Five new source files are not in the index. Consumed by `/akili-archive` (Constitution & Graph Sync). Not urgent mid-spec — the graph's staleness rule already tells later tasks that the working tree wins for files this spec has touched.
- **Code traceability:** `// @akili-spec` markers were **not** added. The one non-obvious addition — the `findAll()` order override — already carries a block comment citing T-01, R-IUA-010 AC.3/AC.4, DD-6 and §5.6 by name, which discharges the intent of the traceability rule more usefully than a bare path marker. Recorded as a deliberate Leader judgment, not an omission.

---

### T-02 — Section DTOs

- **Final status:** `[x]` **DONE 2026-08-19** — PASS on attempt 1.
- **Date:** 2026-08-19
- **Implementer attempts run:** 1
- **Requirements covered:** R-IUA-004 AC.1–AC.4, AC.6–AC.8 · R-IUA-007 AC.2, AC.5 · R-IUA-008 AC.4, AC.5 · R-IUA-013 AC.3 (partial — feeds the human check)
- **Skills assigned:** `nestjs-expert`, `api-design-principles`, `error-handling-patterns` (task defaults, unchanged) · **Effort:** `medium`

#### Attempt 1

**Files changed** (2 files, +232 lines, both new):

| File | State |
| --- | --- |
| `src/domain/entities/result-innovation-use/dto/create-result-innovation-use.dto.ts` | new — 5 classes + 1 custom constraint |
| `…/dto/update-result-innovation-use.dto.ts` | new — `PartialType`, mirroring the reference |

**No `.spec.ts` was written, and that is the instruction, not an omission.** T-02's *Verification & its limits* forbids one: a decorator-presence assertion would prove the decorator exists and nothing about whether any rule executes, because this repo has no global `ValidationPipe` (trap 1 / DD-8). The behavioral gate is T-07. KZ-001 was copied into the brief as the governing lesson, since a presence-assertion spec is exactly "a test double that doesn't evaluate what it stands in for."

**Implementer verification.** `npm test -- --silent` from `server/researchindicators/` → 330/330 suites, 2161/2161 tests — a compile and regression gate only, reported as such rather than as proof of the DTO rules.

In place of a committed spec, the Implementer ran a **throwaway** `ValidationPipe({ whitelist: true, transform: true })` over `pipe.transform(payload, { type: 'body', metatype: CreateResultInnovationUseDto })` and reported observed messages, deleting the scratch file before reporting. Observations (local check, **not** committed evidence):

| Criterion | Observed |
| --- | --- |
| AC.1 negative | `"actors.0.actors_count must not be less than 0"` |
| AC.2 fractional | `"actors.0.actors_count must be an integer number"`; same for `organization_count`, `quantification_number` |
| AC.3 mode conflict | `"actors.0.women_youth_count: sex_age_disaggregation_not_apply is true, so a disaggregated count must not be supplied"` |
| AC.4 aggregate without flag | `"actors.0.actors_count: sex_age_disaggregation_not_apply is not true, so actors_count must not be supplied"` |
| AC.6 / AC.7 | missing `actor_type_id` rejected; OTHER + whitespace-only and OTHER + empty both rejected; OTHER + real name accepted |
| AC.8 / R-IUA-007 AC.5 | disaggregated with all four counts absent — accepted; `organization_count` absent — accepted |
| **AC.5 `total`** | `total: 999` **accepted**, and absent from the transformed object — stripped, not rejected, exactly as the scenario's `BUT it must NOT reject the request merely because total was present` requires |
| Row identification | two-row payload, row 0 valid: only `"actors.1.women_youth_count: …"` reported |

**Implementer `Not Done / Assumptions`** (verbatim): three declared judgment calls — no `@IsBoolean()` on `sex_age_disaggregation_not_apply`; `unit`/`quantification_number` left independently optional; and `innovation_use_level_id` / `innovation_use_level_explanation` added at the top level though absent from the task's stated field list. All three were referred to the Reviewer and adjudicated below. None is outstanding scope.

#### Reviewer verdict — `STATUS: PASS`

The Reviewer read the installed **class-validator source** (`node_modules/class-validator/cjs/…`) rather than reasoning from memory, because this diff's correctness is purely a question of decorator composition. The three findings that decide the task:

- `ValidationExecutor.js:126-135` — conditional metadata is evaluated first and returns **before any validator on that property runs**. So `@IsOptional()` does suppress `IsExclusiveOfActorMode` — **but only when the count is absent, which is exactly when there is nothing to conflict with.** The gating is correct, not a hole.
- `ValidationExecutor.js:66-67, 84-90` — `whitelist` runs before the property loop and strips only keys with **zero** metadata. `total` (undeclared) is stripped; `sex_age_disaggregation_not_apply` and `actor_type_custom_name` are **retained** even when their validators are skipped — which is load-bearing, because the constraint reads the mode flag off `args.object` and the service still receives the custom name.
- `Matches.js:10-12` — `matches()` is `typeof value === 'string' && …`, returning `false` for a non-string rather than throwing. So OTHER with a numeric custom name yields `400`, not `500`.

**Per-criterion verdicts — all eight, including those with no finding (KZ-007):**

| # | Criterion | Verdict |
| --- | --- | --- |
| 1 | Negative/fractional rejected across the five counts + `organization_count` + `quantification_number` | PASS — all seven carry `@IsInt() @Min(0)`; Nest's default `exceptionFactory` flattens to `actors.0.actors_count`, satisfying AC.1's "`errors` names that field" |
| 2 | `not_apply = true` + any disaggregated count → rejected | PASS (AC.3) |
| 3 | `not_apply` false/absent + `actors_count` → rejected | PASS for **all three** shapes — `false`, `null`, absent. `actors_count: 0` is also rejected, correctly: AC.4 keys on *supplied*, not on truthiness |
| 4 | Row missing `actor_type_id` → rejected | PASS — no `@IsOptional()`, so `@IsNotEmpty()` fires on `undefined`/`null` (AC.6) |
| 5 | `actor_type_id = 5` + whitespace-only custom name → rejected | PASS — `ClarisaActorTypesEnum.OTHER = 5` confirmed; `/\S/` fails on `"   "`, `""`, and `undefined` (AC.7) |
| 6 | Disaggregated, all four counts absent → accepted | PASS (AC.8 draft-save) |
| 7 | `organization_count` absent → accepted | PASS (R-IUA-007 AC.5) |
| 8 | Every field carries `@ApiProperty` | PASS — all **25** properties across the five classes; only `actor_type_id` omits `required: false`, matching its `@IsNotEmpty()` |

**Additional checks the Reviewer ran unprompted or on request:**

- **Field-name fidelity vs `design.md` §3** — every property checked against the entities on disk (`result-actor.entity.ts`, `result-institution-type.entity.ts`, `result-quantification.entity.ts`, `result-innovation-use.entity.ts`). **No misspellings**, and the four legacy booleans on `result_actors` are correctly absent. This matters because a misspelled DTO field silently drops data at save time and nothing in this task would catch it.
- **`PartialType` source** — from `@nestjs/swagger`, matching the exemplar. The `@nestjs/mapped-types` variant would inherit validation metadata but drop the `@ApiProperty` schema, breaking Swagger rendering.
- **T-06 leakage** — none. No whole-array duplicate rule, no `level >= 6` rule.

**Adjudication of the three judgment calls:**

1. **No `@IsBoolean()` on the mode flag — sound conclusion, over-stated rationale, in scope.** The Implementer's general claim (that `@IsOptional()` would skip the whole property group) is true of class-validator but **cannot bite here**, because no exclusivity decorator sits on the flag — they sit on the five counts. `@IsBoolean() @IsOptional()` would have cost nothing and defeated nothing. No AC requires it, so it does not gate. Carried forward as an advisory.
2. **`unit` / `quantification_number` independently optional — sound and in scope.** T-02 owns only the negative/fractional rejection; R-IUA-008 AC.1's round-trip belongs to T-05/T-09. Correctly avoids validating `unit` against any list (AC.4: free text, no catalog).
3. **Top-level level fields — required, not widening.** `design.md` §4 names `CreateResultInnovationUseDto` as the PATCH Body DTO and §5.1 step 6 is `UPDATE result_innovation_use SET level_id, explanation`. Under `whitelist: true` an undeclared property is deleted before the service sees it, so **omitting these two would have made the level silently unsettable.** Keeping them at plain optional type checks is also right — the `level >= 6` rule is a catalog-join rule (§5.1 step 4a), explicitly T-06's, and writing an FK-based `>= 6` here would have walked into trap 2.

**`ADVISORY` findings (4R lens — recorded, non-gating, and they do not become tasks):**

| Lens | Finding | Disposition |
| --- | --- | --- |
| Reliability | `sex_age_disaggregation_not_apply` has no `@IsBoolean()`. `1` or `"true"` passes, and the constraint's `=== true` classifies it as *disaggregated* — so `{ sex_age_disaggregation_not_apply: 1, women_youth_count: 5 }` is accepted, then reaches T-03, where a **truthiness-based** mode check would null the four counts the client just sent | **Forward pointer → T-03:** the mode check must compare `=== true`, never truthiness. Recorded; the DTO is not changed, as no AC requires it |
| Reliability | `actor_type_custom_name` has no `@IsString()`. Safe today, but when `actor_type_id !== OTHER` the `@ValidateIf` skip lets any type reach the service | **Forward pointer → T-03:** harmless only because T-03 is specified to null it for non-OTHER rows. T-03 must not relax that |
| Readability | The constraint's `if (value === undefined \|\| value === null) return true;` guard is unreachable while every count carries `@IsOptional()` | Recorded. Keep as defensive code |
| Risk | `npm test` is weak evidence of *compilation* here — nothing imports these files yet, so ts-jest never transformed them. First real type check arrives with T-07 or `npm run build` | Recorded — the honest limit of this task's green run |
| Risk | `actor_type_id: 0` satisfies `@IsNotEmpty()` + `@IsNumber()` and would surface as an FK violation (`500`) rather than a `400`. No AC requires `@Min(1)` | **Forward pointer → T-03 / T-06** |
| Risk (lint) | Inferred, not measured (the Reviewer is read-only): the diff looked un-prettier-formatted, and `.husky/pre-commit` is **empty**, so nothing would auto-fix at commit | **Confirmed and resolved by the Leader — see below** |

#### Leader-run lint verification (post-PASS)

The lint advisory was the one finding that concerned code about to be committed, so it was checked rather than deferred. Evidence:

```
$ npx eslint --no-fix src/domain/entities/result-innovation-use/dto/
  43:35  error  Insert `⏎·····`  prettier/prettier
  89:13  error  Delete `⏎·····`  prettier/prettier
✖ 2 problems (2 errors, 0 warnings)
```

`.husky/pre-commit` confirmed **empty** — the Reviewer's inference was correct on both halves, and the errors would have been committed silently.

Resolved by running the repo's own autofix **scoped to the two files** (`npx eslint --fix src/…/dto/`), not the package-wide `npm run lint` script. Because this mutated an artifact the Reviewer had already PASSed, the change was proved semantically inert rather than asserted to be:

```diff
-    const disaggregationNotApply = row.sex_age_disaggregation_not_apply === true;
+    const disaggregationNotApply =
+      row.sex_age_disaggregation_not_apply === true;
-    message:
-      'actor_type_custom_name is required when actor_type_id is OTHER',
+    message: 'actor_type_custom_name is required when actor_type_id is OTHER',
```

Two line-wrap changes, identical token sequences. `npx eslint --no-fix` then reported clean, `npm test -- --silent` re-run green at 330/330 suites / 2161/2161 tests, and `git status` confirmed **no collateral mutation** — `--fix` touched only the two intended files.

> **Why this was not treated as advisory scope-creep.** The rule that an advisory never becomes a task stops advisories from *growing the spec*. This did not add scope: it confirmed that the task's own deliverable failed the repo's lint gate, which `CLAUDE.md` §4.3 makes non-negotiable. `tasks.md` §4 schedules lint at T-13, so deferring would have been defensible — but it would have handed T-13 a `--fix` mutation on code nobody was reviewing any more. Running a formatter is tool output, not authorship, so the Leader's no-production-code rule is not engaged.

**Final verification:** `npm test -- --silent` → 330/330 suites, 2161/2161 tests · `npx eslint --no-fix` on the two files → clean · `git status` → only the two intended files.

**Declared limits, restated so they are not mistaken for proven:** this task's green run proves **nothing** about the DTO rules. Nothing committed executes them, and nothing even imports these files yet. The pipe observations above are a Leader-directed local check, deliberately uncommitted. **R-IUA-004 AC.1–AC.8 are discharged at T-07**, by the behavioral pipe spec, and not before.

**Forward pointers created by T-02:**

| → Task | Pointer |
| --- | --- |
| T-03 | Mode check must be `=== true`, **never truthiness** — the DTO permits `1` / `"true"` through the untyped flag, and a truthy check would null counts the client actually sent |
| T-03 | `actor_type_custom_name` may arrive as a non-string when `actor_type_id !== OTHER`. T-03 is specified to null it for non-OTHER rows; that behavior is now load-bearing, not incidental |
| T-03, T-06 | `actor_type_id: 0` passes DTO validation and would surface as an FK violation (`500`) rather than a `400` |
| T-07 | T-07's behavioral pipe spec is the **first and only** committed gate for R-IUA-004 AC.1–AC.8. The eight rows in the observation table above are the cases it must cover |

**Budget status:** 2 of 13 tasks complete. **3 of 6–8 review rounds consumed.** See the tripwire note below.

---

## Budget Tripwire — watch, not yet an escalation (2026-08-19)

| Metric | Budget (`design.md` §12) | Actual after T-02 | Trajectory |
| --- | --- | --- | --- |
| Tasks | 13 | 2 done | on track |
| LOC | ~2,400 (±20%) | ~468 | on track |
| **Review rounds** | **6–8** | **3** | **at 13 tasks this trends to ~19** |

Rounds are the metric at risk. Two of the three went to T-01, and both were spent on a **spec defect** rather than on implementation quality — a cost that does not obviously recur. But the budget assumed roughly one round for every two tasks, and the eleven remaining tasks include three rated `xhigh` and one `max`, plus a fixture harness the repo has never built (RB-4).

**Not escalated yet** — the tripwire fires on *exceeding* the budget, and 3 of 6–8 is inside it. Recorded here so the overrun, if it comes, is visible in advance rather than discovered at T-13. Raised with the user at the T-02 gate.

---

### T-02 — follow-up fix: `PropertyDecorator` parameter typing (2026-08-19)

**Raised by the user**, not by the loop — their IDE reported `TS2322` on `IsExclusiveOfActorMode` after T-02 was committed (`8a02411d`).

**This is the T-02 Risk advisory materialising.** The Reviewer had written: *"`npm test -- --silent` is weak evidence of compilation for these two files — nothing imports them yet, so ts-jest never transformed them. The first real type check arrives with T-07's controller or `npm run build`."* An editor type-checks the file directly and does not wait for an importer, so the user's toolchain reached the file before this spec's own gates did.

**Leader diagnosis (verified by command, not inferred):**

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` (repo config) | **exit 0** — the build was never broken |
| `npx tsc --noEmit --listFiles \| grep -c create-result-innovation-use.dto.ts` | **1** — tsc did examine the file; the green result is not a green run over an unexamined target |
| `npx tsc --noEmit --strictFunctionTypes` | **reproduces the user's `TS2322` exactly**, at line 62 |

Root cause: `tsconfig.json` sets no `strict`, so `strictFunctionTypes` is off and parameter bivariance makes the narrowing legal. `PropertyDecorator` is `(target, propertyKey: string | symbol) => void`; the factory declared `propertyName: string`. Unsound, and latent — it would break the day anyone enables `strict`.

**Repo-convention finding — the reason this was not treated as a T-02 defect.** The codebase's only other custom validator, `src/domain/shared/validators/is-safe-stored-content.validator.ts`, uses the **identical** pattern in **both** its factories (`IsSafeStoredContent`, `IsSafeStoredJson`). T-02 did not invent the narrowing; it converged on the established precedent. The user's editor flags those two sites as well.

**Scope decision.** Fixed **only** this spec's file. The two pre-existing occurrences sit in a shared validator outside this spec, and folding them in would have turned a user-flagged one-line correction into an unreviewed refactor of shared code — the shape the advisory rule exists to prevent. Raised with the user as their separate call; **not** minted as a task in `tasks.md`.

**The change** (type-level only, zero runtime effect):

```diff
-  return (object: object, propertyName: string) => {
+  return (object: object, propertyName: string | symbol) => {
     registerDecorator({
       name: 'isActorCountModeExclusive',
       target: object.constructor,
-      propertyName,
+      propertyName: propertyName as string,
```

`registerDecorator`'s own declaration (`node_modules/class-validator/types/register-decorator.d.ts`) types `propertyName: string`, so widening the lambda parameter alone does not compile — a conversion at the call site is required, not optional. The Implementer chose `as string` over `String(propertyName)` deliberately: the assertion is purely type-level, whereas `String()` would coerce a genuine symbol to `"Symbol(foo)"` at runtime — a behavior change, however unlikely to fire. Given the constraint "if your change alters what any payload validates to, it is wrong," the zero-runtime option was the correct one.

**Verification — the falsifying check is the second row, not the first.** Passing the default build proves nothing here, because it already passed *before* the fix:

| # | Command | Result |
| --- | --- | --- |
| 1 | `npx tsc --noEmit` | exit 0 — no build regression |
| 2 | `npx tsc --noEmit --strictFunctionTypes \| grep create-result-innovation-use` | **no output** — the command that reproduced the user's error is now silent for this file |
| 3 | `npm test -- --silent` | 330/330 suites, 2161/2161 tests |
| 4 | `npx eslint --no-fix src/…/dto/` | clean |
| 5 | `git status` | one file modified; `is-safe-stored-content.validator.ts` confirmed untouched |

All five re-run independently by the Leader after the Implementer reported.

**No Reviewer round was spent, and that is recorded rather than glossed.** The `author ≠ auditor` gate is never collapsed for efficiency on a *task*; this is a post-task, type-only correction whose pass/fail is fully determined by the compiler, and the Leader confirmed it by re-running the falsifying command rather than by re-reasoning about the author's diff. Checking a command's output on work one did not write is Leader-inline verification, not self-audit. The review-round tally is therefore unchanged at **3**.

**T-02's status is unchanged at `[x]`.** Its eight Done criteria were behavioural and none is affected by a parameter type; R-IUA-004 AC.1–AC.8 remain discharged at **T-07**, as before.

**Forward pointer created:**

| → Task | Pointer |
| --- | --- |
| T-13 | The repo's `tsconfig.json` sets no `strict`, so `npm test` and `npm run lint` do **not** catch unsound typing that a stricter editor does. T-13's full gate should include `npx tsc --noEmit` explicitly — it is not implied by the suite, and for files nothing imports yet the suite does not type-check them at all |
| *(out of spec)* | `is-safe-stored-content.validator.ts` carries the same `PropertyDecorator` narrowing twice. Pre-existing, user's decision, deliberately not actioned here |

---

### T-03 — `ResultActorsService.customSaveInnovationUse`

- **Final status:** `[x]` **DONE 2026-08-19** — PASS on **attempt 3 of 3**. The rework ceiling was reached but not breached.
- **Date:** 2026-08-19
- **Implementer attempts run:** 3 · **Review rounds consumed:** 3
- **Requirements covered:** R-IUA-009 AC.1, AC.4 (actors) · R-IUA-003 AC.3, AC.6 (actors) · R-IUA-004 write-side normalisation
- **Skills assigned:** `nestjs-expert`, `tdd` (task defaults, unchanged) · **Effort:** `xhigh` throughout — see the effort note under attempt 3

**Leader disambiguation issued before attempt 1.** `tasks.md` T-03 says *"Reuse its `constructWhereClause` shape, role-swapped"*, which admits two readings: parameterise the shared private helper, or add a sibling. The Done criteria settle it — `customSaveInnovationDev` must be **byte-identical to HEAD**, and parameterising would change its call site. Ruled: **add a sibling helper**. T-04 receives the opposite instruction for its own file, where the spec explicitly asks for parameterisation; the briefs were written to keep the two approaches from cross-contaminating.

---

#### Attempt 1 — FAIL (test fidelity)

Production code written as a role-swapped mirror of `customSaveInnovationDev`, plus `resolveInnovationUseCounts` and `constructWhereClauseInnovationUse`. 8 new tests. Suite 2161 → 2169.

**Reviewed by three parallel lens Reviewers** (the `xhigh` + data-loss-surface path in `/akili-execute`'s review-lens table):

| Lens | Verdict |
| --- | --- |
| A — correctness / spec conformance | **PASS** — all six Done criteria met |
| B — test fidelity (KZ-001) | **FAIL** — three issues |
| C — data integrity / blast radius | **PASS** — five questions answered, all cleared |

**Lens C's verification is worth recording because it was done at the source rather than from memory.** It read TypeORM 0.3.20's `SubjectChangedColumnsComputer.js:49-51` —

```js
// we don't perform operation over undefined properties (but we DO need null properties!)
if (entityValue === undefined) return;
```

— confirming that an explicit `null` in a partial entity **does** emit `SET col = NULL`, so the mode normalisation genuinely erases stale counts on edit. It also verified `save([])` is a provable no-op (`EntityPersistExecutor.js:120-122` returns early), that the new cross-module DTO import is **type-elided** at emit and cycle-free with exact mirror-image precedent (`result-innovation-dev.service.ts:38` imports `CreateResultActorDto` the other way), and that no `forwardRef` is warranted — so **T-08's circular-import escalation clause should not fire for this import.**

**Lens B FAIL — three issues, all citing Done criteria:**

1. `expect(tempRepo).not.toHaveProperty('delete')` is **vacuous** — `tempRepo` is the object literal `{ findOne, update, save }` the test itself built ten lines earlier. True for every possible state of the production code, and it encodes a *false* claim about the double's fidelity, since a real `Repository<ResultActor>` does carry `delete`.
2. Mode normalisation, the `OTHER` rule and the flag were asserted **only on the update path**; the insert path was pinned on three keys. Named surviving mutation: delete the `...counts` spread from the insert branch and **the whole suite stays green** while every newly created actor row persists with no counts.
3. **No test asserted `is_active: true` on any saved row.** The method's shape is deactivate-everything-then-save; without that key every row stays `is_active = false` and a populated save silently blanks the section.

Lens B also established that attempt 1's single falsification demo turned **test 1 red and only test 1** — tests 3–8 never inspect the predicate. One demonstration had been presented as evidence for eight tests.

**Leader adjudication of the two PASS lenses' advisories.** Lens A and Lens C **independently converged** on an unflagged defect: the mode *flag* was written raw on the update path while the counts derived from `=== true`. Lens C traced it to ground in chunk 1's own migration (`1787078283929-createInnovationUseValidation.ts:122-124`) — a client editing a previously-aggregate row while omitting the flag persists `TRUE` alongside `actors_count = NULL`, and `innovation_use_validation` returns FALSE **permanently**. Both lenses classified it advisory, correctly, since no AC names the flag column. **Ruled into attempt 2's scope anyway**, on the ground that a rework attempt was already open on Lens B's grounds, the fix is one line inside the method T-03 owns, and `design.md` §5.2's *stated purpose* governs it. Recorded explicitly because it departs from both reviewers' own classification: **had Lens B passed, this would have become a forward pointer to T-06, not a rework trigger.**

---

#### Attempt 2 — FAIL (one new issue) · **the Leader's brief was the defect**

All three Lens B issues **closed and independently confirmed**. Suite 2169 → 2173. A required 8-mutation sweep (M1–M8) replaced attempt 1's single demo; every mutation turned the intended test red.

**It failed on a new issue, and the cause was the Leader's instruction, not the Implementer's work.** The attempt-2 brief asserted *"The insert path is already correct (`setNull` at 228-230)"* and constrained the change to one line. That assertion was made without verification and was wrong. The Implementer followed it exactly **and flagged the residual in its `Not Done / Assumptions`** — noting that a truthy non-boolean on insert produces the same class of drift. Per Step 2.3.0 a `Not Done` entry means the task is not complete; the Leader read it and dispatched the review regardless. **That is a Leader error, recorded as one.**

The Reviewer then dismantled the safety argument properly: JS `=== true` and MySQL `= TRUE` are **different predicates over the same value**. They agree on `undefined`/`null`/`false`/`true` and diverge on every truthy non-boolean. The path was reachable end-to-end:

- `InnovationUseActorDto.sex_age_disaggregation_not_apply` has `@IsOptional()` and **no `@IsBoolean()`**, so `1` passes the pipe untransformed;
- `IsActorCountModeExclusiveConstraint` also uses `=== true`, so `1` **plus** four disaggregated counts is a *valid* payload;
- insert path: counts written disaggregated, `setNull(1)` → `1` → persisted as `TRUE`;
- `innovation_use_validation` takes the aggregate branch, finds `actors_count IS NULL` → **FALSE permanently**.

The same defect class the update-path fix closed, left live on its sibling.

---

#### Attempt 3 — PASS

**Effort held at `xhigh`, not bumped — recorded because it departs from the rework rule.** That rule bumps on the premise that a failed fix means under-thinking. That premise was false here: the Implementer executed the brief correctly and flagged what the brief excluded. Bumping would have treated a Leader error as a worker error. The brief was corrected instead. (The tier rule also forbids `max` on a T2 tier, so the alternative would have been a tier escalation — unwarranted for a fully-specified remediation.)

**Leader ruling: take the Reviewer's *preferred* fix, not its minimal one.** The minimal fix was a one-line mirror. Instead, `isAggregate` is derived **once per row** and consumed by both the flag write and `resolveInnovationUseCounts` on both branches:

```ts
const isAggregate = institution?.sex_age_disaggregation_not_apply === true;
const counts = this.resolveInnovationUseCounts(institution, isAggregate);
// … both branches write `sex_age_disaggregation_not_apply: isAggregate`
```

Rationale: three independent `=== true` occurrences is precisely how this defect arose twice. One derived value makes flag/count disagreement **structurally impossible** rather than a rule three call sites must each remember. That closes the class, not the instance.

Three fold-ins, each strengthening a criterion T-03 already claims: the hard-delete test now passes **one row** so the per-row loop actually executes (with `data: []` it had been passing **vacuously**); the reactivation test now asserts `is_active: true` — the property that makes reactivation *reactivation*; and a comment at the derivation explains the divergence from the byte-identical sibling.

**Mutation sweep extended to M1–M12.** Every mutation turned at least one test red; none left the suite green.

**Final verification:** `npm test -- --silent` → 330/330 suites, **2174**/2174 · `npx tsc --noEmit` clean · `npx eslint --no-fix src/domain/entities/result-actors/` clean · service file **zero deletions** vs HEAD (Leader-verified).

**Byte-identity of the four fenced methods** — by brace-depth extraction against `git show HEAD:...`: `customSaveInnovationDev` (2492 chars), `saveInnovationDev` (970), `formatData` (298), `constructWhereClause` (550) — **all BYTE-IDENTICAL**.

> **A verification instruction the Leader got wrong, and the worker corrected.** The attempt-2 brief asked for single-line scope to be proved via `git diff --unified=0 | grep '^-'`. The Implementer reported that this check **cannot fail** here, because `customSaveInnovationUse` does not exist at HEAD at all — the whole method is uncommitted, so there are no `-` lines regardless of what changed. It substituted a direct method-body byte comparison. The Reviewer independently confirmed the substitution is sound and that the grep addresses a process check, not a spec criterion. A check that cannot fail is not evidence, and the worker caught it before the Leader did.

#### Reviewer verdict — attempt 3 — `STATUS: PASS`

All six Done criteria **MET**. Two findings worth preserving:

- **The sibling-safety claim was verified two independent ways.** The comment asserts `customSaveInnovationDev` is safe writing the flag raw *because it never derives per-mode counts from that flag*. Confirmed: (1) it writes its four booleans unconditionally, with no mode branch, so no count is derived from the flag; and (2) the consumer agrees — the live `innovation_dev_validation` body (`1758125999162-AdaptInnovationDevValidationToManyToolFunctions.ts`) contains **zero** occurrences of `sex_age_disaggregation_not_apply`, `men_youth`, `women_youth` or `actors_count`. It never reads the flag at all. **The desync class does not exist for Innovation Dev.**
- **`customSaveInnovationUse` is the only writer of role-2 `result_actors` rows** anywhere under `src/domain/entities` — so no second write site can reintroduce the disagreement.

**Adjudication of the two caveats the Implementer disclosed rather than buried:**

| Caveat | Reviewer's ruling |
| --- | --- |
| M1–M8 were **reconstructed, not replayed** (no attempt-2 transcript available), so byte-identity with the original set cannot be certified | **Evidentiary purpose discharged.** A sweep's job is to prove the tests are falsifiable; any set that perturbs the properties under test and turns them red does that. Non-vacuity is independently readable off the assertions — each compares *literal* expectations against recorded `save`/`update`/`findOne` arguments, so none can pass vacuously. **No property left unproven.** The residual loss is bookkeeping: the sweep is not reproducible from the record |
| M2 and M12 are **blunt** — 13 failures each, mostly incidental `TypeError` | **Fold-in 2's purpose genuinely achieved.** The hard-delete test owns the *only* double in the file defining `delete`/`remove`/`softDelete`, so under M12 it fails on its own assertion (`expect(del).not.toHaveBeenCalled()`) while the other 12 throw. And this is exactly what fold-in 2 bought: with the previous `data: []` the loop never ran, `del` was never called, and the test would have passed **vacuously** while the mutation was caught only by incidental `TypeError`s |

**`ADVISORY` findings (recorded, non-gating, and they do not become tasks):**

| Lens | Finding | Disposition |
| --- | --- | --- |
| Readability | The new comment cites `customSaveInnovationDev:110-111` — a **same-file line citation**, the anti-pattern `server/researchindicators/src/CLAUDE.md` §9 **FP-50** records. Accurate today and the cited method is frozen by Done criterion 5 for the rest of this spec, so it will not drift here | Recorded. Not fixed — advisory, and the drift risk it warns about is absent for this spec's duration |
| Risk (methodology) | The mutation sweep is **not replayable from the record** — which is what forced attempt 3's reconstruction. Recording the mutation diffs, or a script applying them, would make the next rework loop's sweep a re-run rather than a re-invention | **Carried to `/akili-archive`'s Kaizen step.** This is a methodology gap, not a code defect |
| Reliability | M2's bluntness is a symptom of the file's doubles being minimal. Promoting the hard-delete test's fuller double to a shared factory would make future hard-delete mutations fail on assertions rather than `TypeError`s | **Forward pointer → T-04**, which faces the same file shape |
| Risk (from attempt 1, Lens A + Lens C, both) | `result_actors_id` is trusted **without an ownership check**: a payload naming another result's or another role's row updates it in place, keeping its `result_id` but having `actor_role_id` rewritten to `INNOVATION_USE` and its counts overwritten. Literally reachable violation of R-IUA-009 AC.3 via a malformed client | **Leader-ruled out of scope for T-03** and deliberately not fixed — byte-identical in `customSaveInnovationDev` **in production today**, `tasks.md` T-03 mandates mirroring that reference, and `design.md` §5.2 prescribes the shape with no ownership leg. Closing it here would diverge from the reference the task requires. **Forward pointer → T-06**, whose pre-write pass already loads rows for R-IUA-005. **Raised to the user as a pre-existing production finding** |

**Declared limits, restated so they are not mistaken for proven:** the repository is mocked throughout, so all of the above proves the **predicate objects are constructed** — not that MySQL leaves Innovation Dev rows alone. R-IUA-009's scenario is explicit: `AND IT MUST be proven by a fixture that seeds both roles on one result, not by a unit spec over a mocked repository`. **The behavioural proof is T-10 (F-B), and it is not discharged here.**

**Forward pointers created by T-03:**

| → Task | Pointer |
| --- | --- |
| T-06 | `result_actors_id` ownership check — the pre-write validation pass already loads rows for the duplicate-actor rule (R-IUA-005) and is the natural home for validating `(result_actors_id → result_id, actor_role_id)`. **Awaiting a user decision; do not assume it is in scope** |
| T-04 | Same file shape, same minimal-double problem. Consider a shared repository-double factory that defines `delete`/`remove`/`softDelete`, so hard-delete mutations fail on assertions rather than `TypeError`s |
| T-04 | T-04 **is** instructed to parameterise its shared private helpers — the opposite of T-03's ruling. Its done criterion requires the pre-existing Innovation Dev specs to pass **unmodified**; that is the regression gate |
| T-10 (F-B) | This task's role-isolation guarantee is entirely unproven behaviourally. F-B is the gate, and `requirements.md` R-IUA-009's scenario names the falsifying input: remove `actor_role_id` from the deactivate predicate and Innovation Dev rows must flip inactive |
| T-10 / T-09 | A fixture that always re-sends `sex_age_disaggregation_not_apply` will **not** exercise the flag-desync class this task fixed. Include an edit that omits the flag on a previously-aggregate row |

**Budget status:** 3 of 13 tasks complete. **6 of 6–8 review rounds consumed.** Escalated to the user at this gate — see below.

---

## Budget Escalation — 2026-08-19, after T-03

Raised under `/akili-execute`'s **Budget Tripwire**: *"When actual execution exceeds it, stop and escalate to the user with the delta and the cause — do not continue on the assumption that finishing is what was wanted."*

### Actuals against `design.md` §12

| Metric | Budget | Actual (3 of 13 tasks) | Consumed |
| --- | --- | --- | --- |
| Tasks | 13 | 3 | 23% |
| LOC | ~2,400 (±20%) | ~1,016 | 42% |
| **Review rounds** | **6–8** | **6** | **75–100%** |

LOC is tracking **ahead** of plan (42% of the budget for 23% of the tasks) — but that is not a warning here: T-01–T-03 are three of the four smallest production tasks, and the LOC estimate loaded ~800 lines into the five fixtures (T-09–T-12) that have not started. Rounds are the metric in trouble.

### Where the six rounds went, by cause

| Task | Rounds | Cause |
| --- | --- | --- |
| T-01 | 2 | **Spec defect** — an instruction that was technically unachievable (`@ApiOperation` at class level), resolved by user ruling as DD-13 / D-IUA-10. Not an implementation failure |
| T-02 | 1 | Clean pass |
| T-03 | 3 | One genuine test-fidelity FAIL (vacuous assertion; three defect-bearing mutations surviving a green suite) **+ one round caused by a defective Leader brief** that wrongly asserted the insert path was already correct |

**Two of the six rounds were spent on defects in the specification and the orchestration, not in the code.** That distinction matters for the projection: those two are not evidence that the *implementation* work is running hot.

### Projection

Ten tasks remain, and they are **harder on average** than the three completed. T-04 is a near-twin of T-03 and should run faster now that its patterns and forward pointers are established. But T-06 (L, `xhigh`, the transactional write path carrying the off-by-one trap), T-09 (L, `xhigh`, a Nest-in-fixture harness **no fixture in this repo has ever built** — RB-4), and T-10/T-11/T-12 (all `xhigh` fixtures against a live scratch MySQL) are the spec's declared risk concentration.

Realistic range: **15–22 further rounds, for a total of 21–28** against a budget of 6–8. Roughly **3×**.

### The pattern worth naming

`design.md` §12 set 6–8 rounds with this reasoning, recorded at specify time:

> Chunk 1 budgeted 4–5 and burned **13** (2.6×). This is 13 tasks with three High risks; 4–5 would repeat that mis-estimate.

So the estimate was **already corrected upward** for exactly this failure, and is still tracking ~3× low. **This is the second consecutive chunk in this family whose review-round budget was set about a third of what it needed.** That is a methodology signal, not a chunk-2 accident, and it is carried to `/akili-archive`'s Kaizen step rather than absorbed here.

### What the rounds bought

Recorded so the cost is judged against the return rather than in isolation. The review process has so far caught:

- an instruction that could not be implemented at all, before it consumed three attempts;
- a **permanently-failing green check** — twice, on two different code paths, each traced to the exact SQL in chunk 1's migration that would have read the inconsistent row;
- a test asserting a property of its own fixture, which could not fail under any production change;
- three defect-bearing mutations surviving a fully green 2169-test suite, one of which would have silently blanked the section on every save;
- a Leader verification instruction (`grep '^-'`) that could not fail, caught by the worker.

Every one of those is a defect this spec's §5 verification strategy exists to catch, and none would have been caught by the suite alone.

**Status: awaiting the user's ruling. Execution is paused at the T-03 gate.**

---

### Budget Escalation — resolved 2026-08-19 (user ruling)

**Ruling: re-baseline the review-round budget to ~24 and continue. Review depth is unchanged.**

The user declined the two options that would have bought rounds back by reducing scrutiny (lighter review on low-risk tasks; deferring the fixture suite to a follow-up spec). The reasoning recorded at the gate: the rounds have been buying defects the suite alone did not catch, so cutting review to meet a number that has now been wrong twice running would optimise the metric against the goal it exists to serve.

**Amended sites (5 live + this log's Document Control header):**

| File | Site |
| --- | --- |
| `design.md` | Document Control budget row · §12 *Budget* table row, with the original estimate and its reasoning preserved struck-through rather than deleted |
| `tasks.md` | §0 *Budget tripwire* · §7 *Done definition* · header Status line |
| `family.md` | chunk 2 row |
| `execution.md` | Document Control header only — the per-task *Budget status* lines and the § *Budget Escalation* tables are point-in-time history and were deliberately **not** rewritten |

**Correction closure — two-direction sweep run (KZ-005).** Forward: every surviving occurrence of `6–8` across `docs/specs/innovation-use/**` was inspected and is either explicitly framed as the superseded value (*"re-baselined from 6–8"*) or is append-only history in this log. Backward: every occurrence of the new value `~24` carries its provenance; no orphan. The new term the correction introduced (`re-baselin*`) was re-grepped and resolves consistently in all four documents. One false positive excluded: `requirements.md:94` matches `6-8` inside the line citation `result-institution-type.entity.ts:76-81`.

**Carried to `/akili-archive`'s Kaizen step**, as a methodology signal rather than a chunk-2 accident: *two consecutive chunks in this family set their review-round budget at roughly a third of the actual, and the second did so **after** explicitly correcting for the first.* A per-chunk estimate that is corrected upward and still lands 3× low suggests the estimator is missing a structural cost, not being unlucky — candidate causes worth testing at the retrospective: rework rounds triggered by spec defects rather than code defects (2 of the 6 here), and parallel lens reviews being counted as one round when they cost three.

---

### T-04 — `ResultInstitutionTypesService.customSaveInnovationUse`

- **Final status:** `[x]` **DONE 2026-08-19** — **PASS on attempt 1, zero rework.**
- **Date:** 2026-08-19
- **Implementer attempts run:** 1 · **Review rounds consumed:** 1 (2 parallel lens Reviewers, both PASS)
- **Requirements covered:** R-IUA-007 AC.1, AC.3, AC.5 · R-IUA-009 AC.2, AC.4 (organizations)
- **Skills assigned:** `nestjs-expert`, `tdd` (task defaults, unchanged) · **Effort:** `xhigh`

#### The change

`customSaveInnovationUse` added, and the five shared private helpers **parameterised** by `InstitutionTypeRoleEnum` rather than duplicated — the opposite of T-03's ruling, and deliberately so. T-03 had to add a sibling because its done criteria froze `customSaveInnovationDev` byte-identical; **T-04 has no byte-identity criterion**, and its gate is behavioural instead: *every pre-existing Innovation Dev spec must pass **unmodified***. Both briefs named the other's ruling explicitly so the two approaches could not cross-contaminate.

`organization_count` is threaded through a single new helper:

```ts
private resolveOrganizationCount(institution, role) {
  return role === InstitutionTypeRoleEnum.INNOVATION_USE
    ? { organization_count: setNull((institution as InnovationUseOrganizationDto)?.organization_count) }
    : {};
}
```

**The `{}` return is the design decision worth preserving.** For a non-Use role the key is **structurally absent** from the returned object — not set to `undefined`. Lens A judged this materially stronger, not merely stylistic: `'organization_count' in row === false` means no TypeORM code path can reach the column for a Dev row, so correctness does not depend on the library's undefined-skipping behaviour (the very implementation detail T-03 had to go read at `SubjectChangedColumnsComputer.js:49-51`).

#### What the mutation sweep being front-loaded bought

T-03 spent an entire review round discovering its tests could not fail. T-04's brief therefore **required the mutation sweep in attempt 1** rather than demanding it after a FAIL. Result: **PASS on attempt 1, one round instead of three.**

The Implementer ran M1–M9 and reported one that did not work:

> **M9 — first attempt turned nothing red.** The simulated delete was gated on `result_institution_type_id` being truthy, and the hard-delete test uses an insert-path row with no id, so the guard never fired. Reported rather than passed off; corrected to call `delete` unconditionally, which **did** turn the "soft-deletes only" test red.

Lens B confirmed the disclosure is accurate at source and that disclosing it "rather than banking the green is the behavior this lens exists to reward."

#### Verification

`npm test -- --silent` → 330/330 suites, **2184**/2184 (2174 after T-03; +10 = 8 Use cases + 2 Dev-leak checks) · `npx tsc --noEmit` clean · `npx eslint --no-fix …/result-institution-types/` — 3 prettier errors found and **fixed by hand without `--fix`**, then re-verified clean along with the suite and tsc.

**Leader-verified independently:**

| Check | Result |
| --- | --- |
| Spec file deletions | Exactly **one** line: `-import { DataSource } from 'typeorm';` (replaced to add `IsNull`). **No pre-existing assertion deleted or modified** |
| Hardcoded `INNOVATION_DEV` count | HEAD **10** → working **5**, all five at *call sites* (3 in `saveInnovationDev`'s untouched `create()` route, 2 newly explicit in `customSaveInnovationDev`). **Zero remain inside any private helper.** 10 − 7 replaced + 2 new call-site passes = 5 — arithmetic confirms Lens A's "seven replacements, none missed, none added" |

#### Reviewer verdicts — 2 parallel lenses, both `STATUS: PASS`

**Lens A (conformance + Innovation Dev regression).** Traced `customSaveInnovationDev` end to end with `role = INNOVATION_DEV` against every parameterised helper: **no produced object differs in any key — value or presence.** Spreading `{}` adds no key and does not perturb `Object.keys` order. It independently re-grepped the blast radius and confirmed every private helper is file-local, with `result-innovation-dev.service.ts:296` the sole external caller of the changed class and its signature unchanged. It also verified both union members declare **every** property the helpers dereference — material because `tsconfig.json` sets `strictNullChecks: false` and would not flag a missing one.

> **Lens A stated its own tooling limit rather than papering over it:** its wrapper is read-only, so it could not run `git show HEAD:`, and it named which claims rested on the Leader-supplied diff. `dist/` turned out to be post-change and therefore not an independent baseline — it said so. The Leader closed that gap with the hardcoded-literal count above.

**Lens B (test fidelity + mutation-sweep audit).** All ten new tests carry a named production mutation that reds them; **none is vacuous**; none asserts a literal the test authored itself. All nine reported mutation counts verified structurally credible, **with no incidental `TypeError` reds** — every method the mutations touch is defined on the shared `buildTempRepo` double.

> **Lens B verified the decisive matcher semantics at source instead of assuming them.** The Dev-leak check needs to distinguish an *absent* key from one *present but `undefined`* — `{}` versus `{ organization_count: undefined }` — since only the first is a genuine non-leak. At `node_modules/@jest/expect-utils/build/utils.js:82-84`, `endPropIsDefined = !isPrimitive(object) && prop in object`, and `prop in object` is true for a key present with `undefined`. So `not.toHaveProperty` **fails** in both cases: it is the strongest available matcher and the correct one. It also confirmed `INNOVATION_DEV = 1 ≠ INNOVATION_USE = 2`, without which every role assertion would have been silently vacuous.

**Lens B's summary judgement on the process change:** *"Did front-loading the sweep work? Yes, and measurably. All three T-03 anti-patterns are corrected."* — faithful doubles, hard-delete assertions reading call state rather than a fixture literal, `is_active: true` pinned on both write paths, `organization_count` pinned on both plus absence on the Dev path, and one test pinning `save`'s array length.

#### `ADVISORY` findings (recorded, non-gating, and they do not become tasks)

| Lens | Finding | Disposition |
| --- | --- | --- |
| **B — ADV-1, highest value** | The **`existData` reactivation branch is never exercised** — every test stubs `findOne` to `null`. Deleting `if (existData) dataTemp['result_institution_type_id'] = …` leaves the suite **green**, while in production a resent, previously-deactivated row would **insert a duplicate instead of reactivating**. The one defect-bearing mutation the sweep did not attempt, and the closest structural analogue to T-03's failure | **Forward pointer → T-09.** Not reworked: both lenses PASSed, and opening an attempt to absorb an advisory is precisely what the advisory rule forbids. **T-09's F-A does not currently name an organization reactivation case** — see the pointer table |
| A — Risk | The update path trusts a client-supplied `result_institution_type_id` with **no check that the row belongs to this result or this role**. A payload naming an Innovation Dev row's id would save it with `institution_type_role_id: INNOVATION_USE` and blank its type columns | **Forward pointer → T-06.** Same shape as T-03's actors finding; inherited verbatim from the Dev reference, newly reachable now that two roles share the table. Lens A notes **T-10 as specified will not catch it** (F-B saves with empty arrays) |
| A — Reliability | `removeDuplicates` leaves `key` **`undefined`** for a row with no `OTHER` type, no sub-type, no type id and falsy `is_organization_known` — all such rows collapse into one map entry. `constructWhereClause` for such a row reduces to `{ result_id, institution_type_role_id }`, so `findOne` binds it to an **arbitrary existing** Use row and stamps that row's id onto it, overwriting an unrelated organization. Pre-existing and unchanged — but **newly reachable**, because every field of `InnovationUseOrganizationDto` is optional by design (R-IUA-007 AC.5 draft-save), making `{ organization_count: 5 }` a valid payload row | **Forward pointer → T-06 and T-09** |
| B — ADV-2 | The hard-delete guard covers the **insert path only**; a delete planted in `buildUpdateData`'s branch would ship green. Per §3's matrix the hard-delete clause is owned by T-03/T-09, so this test is a bonus | Recorded |
| B — ADV-3 | Test 3's second assertion reads the `save` double's **echo**, not a read-back — it proves nothing the preceding matcher did not. R-IUA-007 AC.1's round-trip is T-09/T-10's | Recorded |
| B — ADV-4/5/6 | Two `is_organization_known: true` branches do not pin `institution_type_role_id`; only one test pins `save`'s array length; `buildTempRepo` omits `softRemove`/`createQueryBuilder` | Recorded, minor |
| B — ADV-7 | **Addressed to the Leader, not the code.** `tasks.md` T-04's header claimed R-IUA-007 **AC.4**, but §3's matrix assigns AC.4 to **T-10 alone** | **Fixed by the Leader — see below** |

#### Leader-applied spec correction (ADV-7)

The matrix was right and the task header was over-claiming: R-IUA-007 AC.4 (*"No `result_institution_types` row with `institution_type_role_id = INNOVATION_DEV` is read, written or deactivated by this endpoint"*) is a **behavioural** role-isolation claim, and R-IUA-009's scenario states it `MUST be proven by a fixture …, not by a unit spec over a mocked repository`. T-04's unmodified-Dev-specs criterion is a *regression gate contributing to* AC.4, not a discharge of it.

`tasks.md` T-04's *Requirements covered* line and its fifth done criterion now both defer AC.4 to T-10 explicitly. Swept: lines 480 and 504 (T-10) and 664 (matrix) already agreed; the task header was the sole outlier and is now consistent.

#### Declared limits, restated so they are not mistaken for proven

Mocked repositories throughout. This proves the predicate objects, saved-row shapes and where-clauses are **constructed** correctly — **not** that MySQL leaves Innovation Dev rows alone. R-IUA-007 AC.4 and R-IUA-009's scenario are discharged by **T-10 (F-B)**, and R-IUA-007 AC.1's round-trip by **T-09 (F-A)**. Neither is discharged here.

#### Forward pointers created by T-04

| → Task | Pointer |
| --- | --- |
| **T-09 (F-A)** | **Add an organization *reactivation* case**: seed an organization row, deactivate it, re-send the same identity, and assert the **id is reused** rather than a duplicate inserted. F-A's current criteria name an *actor* edit-and-resave but no organization reactivation, so ADV-1's gap survives T-09 as written |
| T-06 | Validate that any client-supplied child id (`result_institution_type_id`, and `result_actors_id` per T-03) belongs to `(result_id, role)` before the write. **Two tasks have now independently surfaced this**; still awaiting the user's decision on whether it is in scope |
| T-06 | Reject identity-less organization rows — a row with no type, sub-type, custom name or known institution has an `undefined` dedup key and an unconstrained where-clause |
| T-05 / T-06 | `resolveOrganizationCount`'s doc comment is a good precedent: it explains the `{}`-vs-`undefined` reasoning so the next reader need not re-derive it |

**Budget status:** 4 of 13 tasks complete. **7 of ~24 review rounds consumed** — on the re-baselined budget, and T-04 came in at one round against T-03's three.

---

### T-05 — implementation complete, **review blocked by a harness runtime failure** (2026-08-19)

**Not a work FAIL.** Two consecutive Reviewer spawns terminated with `API Error: 529 Overloaded` before returning any verdict — a server-side capacity error, not a judgement on the diff. `/akili-execute`'s *Runtime-failure fallback* prescribes: retry once, then degrade by role. The retry is spent.

**The Leader did not review inline, and will not.** The fallback table is explicit for this role:

> **Reviewer** — **Never inline.** The Leader reviewing work it supervised breaks `author ≠ auditor`, and a runtime failure does not suspend a correctness constraint. Offer the user: a different model (`/model`), a cross-host dispatch (per the registry), or an explicit recorded waiver.

**State is safe and recoverable.** T-05's two files are written, the full suite is green (331 suites / 2196 tests), `tsc` and eslint are clean — but the task is **not** marked `[x]`, nothing is committed, and no evidence of completion has been recorded. This is the evidence-before-checkbox ordering doing its job: an interrupted run leaves work that can be re-reviewed, never a `[x]` nobody can justify.

**Cross-host dispatch is unavailable on this machine.** The model-routing registry records Antigravity (`agy`) as *documented but not installed as of 2026-08-03*, so the T6/cross-host escape hatch cannot be exercised here. Recorded so the option is not re-proposed.

**Escalated to the user.** Options presented: wait and retry (recommended — 529 is transient and costs only wall-clock); run the Reviewer on a different model, noting that the registry's T3 fallback is the Implementer's own tier and would collapse the model axis of `author ≠ auditor` while preserving the fresh-context axis; or an explicitly recorded waiver.

**Pending work if review resumes:** the brief asked the Reviewer to rule on three specific things — whether spreading the full `ResultActor` entity violates `design.md` §4's documented field list, whether `actors_count ?? null` preserves a legitimate zero, and whether **R-IUA-002 AC.1 is a spec bookkeeping error** (the criterion names a `ServerResponseDto` envelope that only T-07's controller can produce, while §3's matrix assigns AC.1–AC.6 to T-05). That third one is the same class of defect corrected at T-04 for R-IUA-007 AC.4.

---

### T-05 — `ResultInnovationUseService`: `create`, read assembly, total derivation

- **Final status:** `[x]` **DONE 2026-08-19** — **PASS on attempt 1, zero rework.**
- **Date:** 2026-08-19
- **Implementer attempts run:** 1 · **Review rounds consumed:** 1
- **Requirements covered:** R-IUA-002 AC.2–AC.6 + scenario (AC.1 **partially** — see the bookkeeping correction) · R-IUA-004 AC.5 · R-IUA-001 (the `create` helper) · R-IUA-008 AC.1, AC.3, AC.4
- **Skills assigned:** `nestjs-expert`, `tdd` (task defaults, unchanged) · **Effort:** `medium`

> **Review dispatch cost three spawns, but only one review round.** Two consecutive Reviewer spawns died on `API Error: 529 Overloaded` before returning any verdict — a harness capacity failure, not a judgement. Per `/akili-execute`'s *Runtime-failure fallback*, the Leader retried once, then **escalated to the user rather than reviewing inline**: the fallback table forbids the Leader auditing work it supervised, because that breaks `author ≠ auditor` and a server error does not suspend a correctness constraint. **User ruling: wait and retry.** The third spawn returned a full T3 verdict with independence intact on both axes — no model degradation, no waiver. A spawn that returns no verdict costs wall-clock, not a review round; the tally reflects **one**.

#### The change (2 new files)

`create(resultId, manager?)` mirrors `ResultInnovationDevService.create` exactly. `findOne(resultId)` loads the detail row with a catalog relation join, fetches the three child collections **in parallel** through their own services with the role argument, and attaches a derived `total` per actor row. `update()` — the write transaction — is **T-06's** and is deliberately absent (`grep "update("` → zero occurrences).

**Total derivation (`design.md` §5.5), the task's named trap:**

```ts
if (actor?.sex_age_disaggregation_not_apply === true) return actor?.actors_count ?? null;
const counts = [women_youth_count, women_not_youth_count, men_youth_count, men_not_youth_count];
if (counts.every(c => c === null || c === undefined)) return null;   // ← NOT 0
return counts.reduce((sum, c) => sum + (c ?? 0), 0);
```

The `allAbsent` guard sits **before** the reduce. Without it the obvious `reduce((a,b) => a + (b ?? 0), 0)` returns `0`, which would claim the user entered a total of nought when they entered nothing — and `innovation_use_validation` reads that difference. The mode is compared with `=== true`, never truthiness, so read-side classification matches the write-side rule T-03 established.

**DD-9 resolved by relation join, not service call.** The Implementer used `relations: { innovation_use_level: true }` off the detail row and exposed only `detail?.innovation_use_level?.level`. It explicitly avoided `ClarisaInnovationUseLevelsService.findAll(relations, where)` because **T-01's forward pointer** established that the inherited base drops its `is_active: true` default the moment a caller supplies a `where` — that path can read soft-deleted catalog rows. The Reviewer verified the rationale comment is factually true against `clarisa-base-service.ts:50-67`. **A forward pointer carried by a brief did its job.**

#### Verification

`npm test -- --silent` → **331** suites, **2196**/2196 tests (330/2184 after T-04 — exactly +1 suite and +12 tests, matching the new file) · `npx tsc --noEmit` clean · `npx eslint --no-fix` clean, zero findings, no hand-fix needed · `git status` → only the two intended files · `grep findByName|findByNames` → zero (R-IUA-010 AC.6).

**Mutation sweep M1–M8, front-loaded per standing practice since T-04.** Every mutation turned **exactly one** predicted test red; none left the suite green: all-NULL→`0`; drop actors role arg; drop organizations role arg; wrong quantifications role; `null` instead of `[]`; `=== true`→truthy; aggregate sums the four instead of using `actors_count`; whole catalog object instead of the scalar.

#### Reviewer verdict — `STATUS: PASS`

All eight done criteria adjudicated by name. Findings verified at source rather than asserted:

- **`actors_count ?? null` preserves a legitimate `0`** — `0 ?? null → 0`; `||` would have collapsed it.
- **A partial disaggregated set is correct** — `allAbsent` short-circuits only when all four are absent, so `?? 0` inside the reduce can never manufacture a total out of nothing. `[2, null, null, 1]` → `3`.
- **NFR-IUA-001: 4 round trips, under the target of 5** — one `findOne` with a LEFT JOIN (the join is *not* a fifth query), plus three child `find`s. `relations` is not passed to any child, and the `.map` is pure in-memory — **nothing per-row**. T-13's 50-row assertion should hold.
- **`selectManager(manager, …)` returns `manager.getRepository(entity)` when a manager is present** (`orm.util.ts:4-13`) — so **T-08 can call `create(resultId, manager)` inside the creation transaction**, as its own criteria require.
- **DD-9 relation key matches the entity's declared relation** (`result-innovation-use.entity.ts:59-68`), and the DD-9 test is genuinely discriminating: its fixture sets `id: 7, level: 6`, so returning the id *or* the whole object both fail.
- **Test fidelity (KZ-001): no recurrence.** All 12 tests can fail and each asserts production behaviour rather than a literal it authored. The M1–M8 claims are structurally credible against the assertions as written.
- **Spreading full entities is not a contract violation.** The reference `findOne` (`result-innovation-dev.service.ts:466-496`) returns its child collections as the raw arrays the child services hand back, audit columns and `is_active` included; there is no serialization layer, and `design.md` §4 contains no exclusivity clause. Consistent with the exemplar → advisory, not a gate.

**Reviewer ruling on the missing-`NotFoundException` question — and it caught something forward-looking.** Correctly out of scope, because T-06's criteria explicitly claim it and `design.md` §4 attributes the GET's `404` to `ResultsUtil.setup` (the `SetUpInterceptor`), not to `findOne`. More importantly: **adding a throw to `findOne` would break T-06**, which must re-read through this same method post-commit at §5.1 step 12. The defensive `?.` / `?? null` guards are strictly safer than the reference, which dereferences unguarded at `:480`.

#### Leader-applied spec correction — R-IUA-002 AC.1

The Implementer declined to fabricate a controller-level test to force a done criterion green, and flagged it instead. The Reviewer ruled it **a spec bookkeeping error, not missing work** — the same class corrected at T-04 for R-IUA-007 AC.4 — and gave exact wording. Grounds: AC.1's envelope half is produced by `ResponseUtils.format` in a controller that T-05's *Files touched* list does not include and that **T-07** owns; T-07 already carries the discharging criterion; and §3's matrix already lists R-IUA-002's owning tasks as *T-05, T-07, T-09* — only the AC-column split was wrong.

Corrected at three sites, swept both directions:

| Site | Change |
| --- | --- |
| §3 matrix, R-IUA-002 row | `AC.1–AC.6 T-05` → **`AC.1 T-05 (section object) + T-07 (envelope)` · AC.2–AC.6 T-05** |
| T-05 done criterion 1 | Now names the section object as the deliverable and states the envelope is structurally T-07's, with the instruction not to create a controller to force it green |
| T-07 done criterion 1 | Now names the **envelope half of R-IUA-002 AC.1** alongside R-IUA-013 AC.1, so joint ownership is visible from both sides |

#### `ADVISORY` findings (recorded, non-gating, and they do not become tasks)

| Lens | Finding | Disposition |
| --- | --- | --- |
| Reliability | **Two zero-preserving paths are correct in code but uncovered by tests** — aggregate with `actors_count: 0` (would regress to `null` if `??` ever became `||`), and disaggregated `[0,0,0,0]` (must be `0`, not `null`). These are the exact mirror of the all-NULL trap the criteria *do* cover | **Forward pointer → T-09 (F-A)**, which exercises real rows |
| Reliability | `create`'s test asserts the audit spread happened but not **which** `SetAuditEnum` was passed — the mock returns `{ created_by: 1 }` for any argument, so `SetAuditEnum.UPDATE` would still pass | **Forward pointer → T-08 / T-12** |
| Reliability | **No test passes a `manager` into `create`**, so the `selectManager` branch T-08 depends on is untested here — and T-08 asserts only that `create` is *called* with the manager, not that it *uses* it. Code is verbatim from the reference, so a coverage gap rather than a suspected defect | **Forward pointer → T-08 and T-12 (F-E)** — neither task currently closes it |
| Reliability | The `?? []` collection guards are **unreachable** — both child methods return `mainRepo.find(...)`, which yields `[]`. The Implementer disclosed this as "verified inert by mutation M5", which is the right disclosure | Recorded |
| Resilience | `Promise.all` raises peak pool usage per read from 1 to 3 — immaterial at default pool sizes; error semantics are safe. Transaction affinity is *improved*: `findOne` accepts no `manager`, so T-06's step-12 re-read is **structurally forced** outside the transaction, which is where §5.1 puts it | Recorded — a happy accident worth keeping |
| Readability | The wire payload is a **superset** of `design.md` §4 — audit columns, `is_active` and the role discriminator ship on every row. Pre-existing platform pattern, not drift. If chunk 3 ever wants the documented shape to be the literal shape, that is a design decision, **not a quiet fix in T-06** | Recorded |

#### Declared limits, restated so they are not mistaken for proven

Mocked repositories. This proves the assembly shape, the role arguments and the derivation — **not** that the section round-trips against MySQL. R-IUA-002's scenario and R-IUA-008 AC.1 are discharged by **T-09 (F-A)**. R-IUA-002 AC.7 (`401`) is **T-07's**.

#### Forward pointers created by T-05

| → Task | Pointer |
| --- | --- |
| **T-06** | **Do not add a `NotFoundException` to `findOne`.** T-06 re-reads through it post-commit (§5.1 step 12); a throw there would break the re-read. T-06's own `404` belongs on the write path, before `BEGIN` |
| T-08 / T-12 | `create`'s `selectManager(manager)` branch is untested on both sides — T-05 never passes a manager, T-08 asserts only that `create` is *called* with one. **F-E is the natural place to prove the row actually lands inside the creation transaction** |
| T-09 (F-A) | Cover the two zero-preserving derivation paths: aggregate `actors_count: 0`, and disaggregated `[0,0,0,0]` → `0` not `null` |
| T-13 | NFR-IUA-001 measured at **4 queries** for one result with no per-row pattern — the ≤5 target holds by construction, but T-13 must confirm it at 50 actor rows |

**Budget status:** 5 of 13 tasks complete. **8 of ~24 review rounds consumed.**

---
