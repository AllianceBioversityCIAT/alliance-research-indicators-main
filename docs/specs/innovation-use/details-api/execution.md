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

**Review-round tally:** **11 of ~24 consumed** (T-01 ×2, T-02 ×1, T-03 ×3, T-04 ×1, T-05 ×1, T-06 ×3) at 6 of 13 tasks. T-05 additionally cost two Reviewer spawns that died on `529 Overloaded` without returning a verdict — wall-clock, not rounds. Budget re-baselined 2026-08-19 by user ruling — see § *Budget Escalation* and its resolution.

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

### T-06 — attempt 1: **FAIL** (2 of 3 lenses), and a blocking spec gap

- **Date:** 2026-08-19 · **Review round:** 9 of ~24 · **Effort:** `xhigh` · **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd`, `systematic-debugging` (task defaults, unchanged)
- **Lens A (conformance): PASS** — all seventeen Done criteria met, `design.md` §5.1 steps 2–12 each implemented in position, both `errors` payload strings byte-identical to §4's table (em-dash included), greps for FK comparison / name lookup / `GreenChecksRepository` all zero.
- **Lens B (test fidelity): FAIL** — three issues.
- **Lens C (transactional integrity): FAIL** — one blocking issue requiring a spec ruling.

The production code is largely right. Ordering (DD-3), manager threading (DD-10) and role-scoped reconciliation were independently confirmed correct by two lenses. What failed is a **validation-scope gap** and **three tests that cannot fail**.

#### Lens C issue — the API can be made to persist a state R-IUA-006 forbids

Validation reads the **payload alone**; step 6 performs a **partial merge** (TypeORM skips `undefined` — verified at source, `UpdateQueryBuilder.js:292-298`). Given a stored row at catalog `id 7` (level 6) with a valid justification:

```
PATCH {"innovation_use_level_explanation": null}
```

`resolveInnovationUseLevel(undefined)` → `undefined` → the rule never fires → the UPDATE nulls the explanation and leaves `level_id = 7` untouched. **Level 6 with no justification, accepted with `200`.** The same holds for `{"innovation_use_level_explanation": ""}` — the exact input R-IUA-006 AC.4 exists to reject.

R-IUA-006's user story: *"**So that** the requirement cannot be bypassed by calling the API directly."* This is that bypass.

**Neither T-09 (F-A) nor T-11 (F-C) would catch it** — every fixture drives an explicit level id; none sends a partial payload against a pre-existing level.

**The asymmetry underneath it.** `?? []` on all three collections means an *omitted* `actors` key **deactivates every Innovation Use actor row**, while an omitted `innovation_use_level_id` **preserves** the stored level. `PATCH {"organizations":[…]}` clears all actors and quantifications while preserving level and explanation — two opposite readings of "absent" inside one method, where §5.1 steps 6–9 treat them symmetrically. **The `undefined`/`null` contract for PATCH is written nowhere in the spec.** That is the gap.

#### Lens B issues — three tests that cannot fail

1. **The post-commit ordering is claimed but not verified.** The `transaction` double resolves its callback inline and never models `COMMIT`, so the ordering assertion compares the re-read against when `transaction()` was *called*, not when it *resolved*. Surviving mutation (M12): move the re-read **inside** the callback — every assertion still passes, yet `findOne` uses `this.mainRepo`, not `manager`, so against real MySQL it would read **pre-commit state on a separate connection**. The in-file comment claims the test proves "never inside the callback, never before it"; it proves only the second half. KZ-001 exactly — a double that does not evaluate what it stands in for, plus a comment that reads as verification.
2. **M4 is misrecorded, so N4's exclusive falsifier was never run.** "Duplicate check ignores custom name" collapses both `OTHER` rows onto one key and therefore still **rejects** them — N4 stays green. M3 and M4 as written are the same mutation reported with two contradictory outcomes. The mutation that actually reds N4 (exempt `OTHER` from the dedup set entirely) was not run; N4's green rests on an incidental `transaction` assertion shared with M2.
3. **N6 is vacuous.** Its payload has exactly **one** actor row, so every payload-scoped dedup rule — correct or broken — accepts it. The defect AC.5 exists to exclude (dedup against *persisted* rows) passes this test, because the persisted fixture is `[]`. No mutation in M1–M11 reds it.

**Sweep coverage correction: 9 of 11 mutations produced real test evidence, not 11 of 11.** M5 and M8 turned red by **compile error** — ill-formed mutations, not test evidence. Lens B independently confirmed both properties *are* asserted elsewhere (three tests pin `manager` by identity against the injected `fakeManager`; the re-read is pinned on values the DTO cannot produce), and showed the mechanism works where the type system is silent via M6, where `upsertByCompositeKeys`'s `manager` is genuinely optional. No finding on those properties — but the sweep count must not be inflated.

#### Lens B's settlements on the two questions the Leader raised

- **T-05's shared mocks were reshaped but not weakened.** `getRepository` now dispatches by entity; every T-05 path still resolves to `mainRepo`, and no T-05 assertion referenced it. The `audit` double was **strengthened** — it now discriminates `NEW` from not-`NEW`, partially fixing the flag T-05's Reviewer raised. Verified against `package.json`: no `resetMocks`/`clearMocks`, so declaration-site implementations survive `clearAllMocks()`.
- **The disclosed test-isolation fix is correctly diagnosed and holds.** `clearAllMocks()` calls `mockClear()`, which does not drain a `mockResolvedValueOnce` queue; only `mockReset()` does. **No prior test passed for the wrong reason** — all 26 queued values are consumed by their own test, and a leak would *override* a later default and produce a loud red, not a silent green. T-05's file contained no `...Once()` at all. *Residual:* the fix covers 2 of the 5 mocks that receive `...Once()` values.

#### Advisories converging from two lenses

- **`level` is a `bigint`, which the MySQL driver returns as a *string*** (Lens A). `level < 6` is safe today — relational operators coerce — but the helper's signature claims `number`, and a refactor to `level === 6` or `Number.isInteger(level)` would break against the real database while every mocked test stayed green. `Number(level)` at the resolver boundary removes the trap.
- **The `is_active: true` filter on the validation resolver diverges from the read** — flagged by Lens A **and** Lens C independently. Added to close T-01's soft-deleted-row hazard: right instinct, wrong site. A soft-deleted catalog row now yields `undefined`, so the justification rule **silently does not fire** (fail-open), while `findOne`'s relation join applies no such filter and would still report that level on the GET. The two halves disagree about the same row. Lens C notes this also makes T-05's docblock overstated — a relation join *does* return a soft-deleted catalog row; what it avoids is the `findAll(where)` default-drop, a different hazard.
- **An unresolvable `innovation_use_level_id` surfaces as a `500` carrying raw SQL** (Lens C). The FK constraint stops it and the transaction rolls back — no dangling FK — but `GlobalExceptions` has no `QueryFailedError` branch, so TypeORM's message (query text + constraint name) reaches the client in `errors`. §4's error table has no row for this.
- **TOCTOU between the step-2 existence check and `BEGIN`** (Lens C). Recorded, not actioned — §5.1 prescribes exactly this ordering.
- **A Lens C advisory was checked and dismissed by the Leader:** it reported malformed `//` comments in T-03's committed `result-actors.service.ts`. The lines are well-formed and `npx tsc --noEmit` exits 0. Misread; no action.

**Status: attempt 2 blocked on a user ruling** — the two safe fixes for the Lens C issue trade against different acceptance-criteria text, and the Implementer cannot choose correctly without it.

---

### T-06 — FINAL: `ResultInnovationUseService` write transaction + cross-field validation

- **Final status:** `[x]` **DONE 2026-08-19** — PASS on **attempt 3 of 3**. The ceiling was reached, not breached.
- **Attempts run:** 3 · **Review rounds consumed:** 3 (rounds 9–11 of ~24)
- **Requirements covered:** R-IUA-003 (all ACs + both scenarios) · R-IUA-005 (all ACs + scenario) · R-IUA-006 (all ACs + scenario, AC.5 **as narrowed by DD-14**) · R-IUA-008 AC.1, AC.2, AC.5 · R-IUA-012 AC.2
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd`, `systematic-debugging` (attempts 1–2); narrowed to `nestjs-expert`, `tdd` for attempt 3, whose scope was two test assertions · **Effort:** `xhigh` throughout

#### Attempt 2 — PASS on production, FAIL on two tests

Lens 1 (conformance + integrity) **PASSED** the production change outright, tracing every DD-14 case including the ones it must not break, and verifying at source that the FK is `RESTRICT` so the new `400` guard cannot fire on a stored id.

Lens 2 (test fidelity) **FAILED** it on two issues:

1. **Attempt 1's Issue 3 survived.** The AC.5 self-duplicate test still shipped a one-row payload against an empty persisted-actor fixture, so a dedup rule consulting *persisted* rows would still pass it. The remediation reported for it had addressed the **DD-14** gap instead — a different requirement.
2. **A more faithful double silently weakened an untouched test.** Attempt 1's `audit` mock collapsed `SetAuditEnum.BOTH` to `{ updated_by: 1 }`, so a `create` regression to `audit(BOTH)` failed T-05's `objectContaining({ result_id: 42, created_by: 1 })`. Attempt 2's **correct** three-branch switch returns both keys, satisfying that matcher — so the mutation began shipping green. The double improved; the test got weaker.

> **This is the inverse of the usual KZ-001 failure and it generalises: any `objectContaining` assertion implicitly relying on a lossy double loses its teeth the moment the double improves.** Carried to `/akili-archive`'s Kaizen step.

#### A Leader error, caught by review

Lens 1 flagged that `design.md` §5.1 steps 3–4 and `tasks.md` T-06's implementation note both wrote the merge as **`payload ?? stored`** — while the Implementer had been told, correctly, to use `!== undefined` *because `??` reopens the bypass*. The Leader wrote a shorthand into the amendment that contradicted the ruling the amendment existed to record.

> *"Taken literally that is the operator DD-14's own worked example proves wrong — a maintainer 'correcting' the code to match the pseudocode would silently restore the bypass."*

Corrected at **four** sites, including inside DD-14's own binding text, and swept: `grep` for `payload ?? stored` and its variants returns zero. The wording is now `key present ? payload : stored`, with the reason stated inline. **`design.md` §4's error table also gained a row** for the new `400 innovation_use_level_id: unknown innovation use level`, which was client-visible and unlisted — T-07's controller work needs it.

#### Attempt 3 — two one-line test fixes

1. The AC.5 test now seeds `mockResultActors.find` with `[{ result_actors_id: 11, actor_type_id: 3 }]`, the same type as its single-row payload.
2. The `create` test gained `expect(mockCurrentUser.audit).toHaveBeenCalledWith(SetAuditEnum.NEW)`.

Plus two advisory fold-ins: the test misleadingly named *"coerces a bigint level … to a real number"* renamed to what it actually proves, with the M15-is-undefended note moved from the transient report **into an in-file comment**; and the `audit` double's comment corrected where it claimed branch-for-branch fidelity its `default:` arm does not have.

> **The attempt-3 process stalled on a harness watchdog** after making its edits, mid-verification (`"tsc clean. Now eslint"`). Per the runtime-failure rule this is **not a work FAIL and did not consume the attempt.** The Leader verified the tree inline: no mutation left applied, the payload-only `seenIdentities` intact, both fixes landed, and **331 suites / 2214 tests / `tsc` clean / `eslint` clean**. The missing piece was the M16/M17 mutation evidence, which was put to the **Reviewer** to determine statically rather than spending a fresh Implementer round — the same technique a sibling lens had already used successfully on this file.

#### Reviewer verdict — attempt 3 — `STATUS: PASS`

**M16 (fold persisted rows into `seenIdentities`) — KILLED** on the AC.5 test's **own** `.resolves.toBeDefined()` assertion (`:380`), not an incidental shared one. The correct payload-only validator still passes; the mutant collides `TYPE:3` against itself and throws.

> **The subtle part, and why the fix is robust:** the fixture is seeded with **`mockResolvedValue`, not `mockResolvedValueOnce`**. A `...Once` seed would have been consumed by the mutant's own pre-validation call, leaving `findOne` with `[]` and making the kill **order-dependent**. It is not.

**M17 (`create` calls `audit(BOTH)`) — KILLED** at `:214`. `NEW === 0`, `BOTH === 2`, `create` invokes `audit` exactly once, and `clearAllMocks()` clears history — so nothing else can satisfy the matcher. The pin also kills a bare no-argument `audit()`. Meanwhile `:207-209`'s `objectContaining` stays green, which is precisely the leak attempt 2 opened.

**Count verified honest:** exactly 30 `it(` blocks, zero `xit`/`skip`/`only`/`todo`; both fixes strictly additive; the rename changes a title only. **Nothing was dropped to make a number work.**

#### Final verification

`npm test -- --silent` → **331 suites, 2214/2214** · `npx tsc --noEmit` clean · `npx eslint --no-fix` clean — **all re-run independently by the Leader**, not relayed.

#### Declared limits, restated so they are not mistaken for proven

Mocked repositories throughout. This proves the **call sequence and the constructed predicates**, not that MySQL rolled back. R-IUA-003 AC.3's soft-delete behaviour and the level rule against real seeded catalog rows are **T-09 (F-A)** and **T-11 (F-C)**, and are not discharged here.

#### Forward pointers created by T-06

| → Task | Pointer |
| --- | --- |
| **T-09 (F-A), T-11 (F-C)** | **DD-14 changes fixture expectations.** Any fixture seeding a stored level ≥ 6 with a blank or absent justification and then issuing a **partial** PATCH will now correctly receive `400`. Fixtures must either seed a justification alongside a stored level ≥ 6, or assert the `400` |
| **Rollout / `design.md` §13** | The same applies to **real rows**: any existing indicator-6 result at level ≥ 6 with a blank justification becomes uneditable through this endpoint until one is supplied. That is DD-14's intended consequence, not a regression — but it is a deployment note, not a testing surprise |
| T-07 | `design.md` §4's error table now carries the `400 innovation_use_level_id: unknown innovation use level` row. The controller's Swagger and any client contract reader need it |
| T-13 | `Number(row.level)` maps a `NULL` catalog level onto `0` — a **real point** on the 0–9 scale — so "unresolvable" and "level 0" are no longer distinguishable in that return value. Inert today (one consumer, both take the same early return; every seeded row has an explicit level). `row.level == null ? undefined : Number(row.level)` would restore the distinction |
| Kaizen (archive) | Two lessons: **(a)** improving a test double can weaken tests that leaned on its lossiness; **(b)** a mutation that fails to **compile** is not test evidence — it proves the mutation was ill-formed. Both surfaced here for the first time |

**Budget status:** 6 of 13 tasks complete. **11 of ~24 review rounds consumed.**

---
### T-07 — Controller, module, route registration, `ValidationPipe`, Swagger

- **Status at the time of this entry:** `[~]` **PIVOT** — blocked on a spec defect, not on implementation quality. The rework loop was stopped by the Pivot Protocol with **2 of 3 attempts unspent**, because the defect reaches into a task already closed `[x]` and its fix crosses task boundaries.
- **Date:** 2026-08-19
- **Implementer attempts run:** 1 (of a possible 3)
- **Requirements in scope:** R-IUA-013 (all ACs), R-IUA-002 AC.1 (envelope half) + AC.7, R-IUA-003 AC.5, R-IUA-004 AC.1–AC.8 behaviorally
- **Skills assigned:** `nestjs-expert`, `api-design-principles` (task defaults, unchanged) · **Effort:** `medium`
- **Review mode:** parallel lens Reviewers (2) — conformance/wiring and test-fidelity. Chosen over the single-Reviewer lens checklist that `medium` effort would default to, because T-07 carries the only committed gate in this spec for R-IUA-004 AC.1–AC.8. This is the same up-front-rigour choice that turned T-03's three rounds into T-04's and T-05's one.

#### Attempt 1

**Files changed** (5 files, +657 lines, additive except one route file):

| File | State |
| --- | --- |
| `src/domain/entities/result-innovation-use/result-innovation-use.controller.ts` | new (73) |
| `…/result-innovation-use.module.ts` | new (18) |
| `…/result-innovation-use.controller.spec.ts` | new (537) |
| `src/domain/routes/main.routes.spec.ts` | new (29) — **not in T-07's *Files touched* list**; see the scope ruling below |
| `src/domain/routes/main.routes.ts` | modified — one import + one four-line route node |

**Implementer verification**

- `npm test -- --silent` from `server/researchindicators` → **333 suites passed, 2255 tests passed, 1 snapshot**. Arithmetic independently reconstructed by the test-fidelity Reviewer: 331 → 333 suites is exactly two new spec files; 2214 + 41 = 2255, where 41 = 40 `it` cases in the controller spec (13 wiring + 27 pipe) + 1 in the route spec. Consistent.
- `npx eslint --no-fix` on all new/touched files → 0 errors. `--fix` was run once on its own new files only, then re-verified clean and the suite re-run green.
- Mutation sweep run **up front**, before reporting, per the brief: 7 mutations, each restored. All 7 behaved as predicted, including the falsifying input the task names (remove `@UsePipes` → the behavioral pipe spec stays green, the handler-decorator assertion fails).
- The sweep also **found a genuine gap and closed it**: deleting the `innovation-use` route node left the entire suite green, because no route node in this repo was covered by any spec. The Implementer wrote `main.routes.spec.ts` in response.

**Implementer `Not Done / Assumptions`** (recorded verbatim, per the Step 2.3.0 rule):

> - Added `server/researchindicators/src/domain/routes/main.routes.spec.ts`, not in the task's "Files touched" list, because the mutation sweep proved the route-registration criterion (AC.5) had no automated gate at all in this repo. This is additive-only and scoped to exactly the one node this task adds.
> - `ResultInnovationUseModule` imports `ResultActorsModule`, `ResultInstitutionTypesModule`, `ResultQuantificationsModule` (the providers the already-existing `ResultInnovationUseService` actually injects). It does not import `ClarisaInnovationUseLevelsModule` since the service resolves the catalog via `dataSource.getRepository(ClarisaInnovationUseLevel)` directly, not via an injected service — no DI dependency on that module exists.
> - Swagger completeness (full `/swagger` render check) is out of scope per `design.md` — deferred to T-13's human check, as stated in the task.

**Reviewer verdicts — both lenses `STATUS: FAIL`.**

##### Lens A — conformance / wiring: `STATUS: FAIL`

Eight of ten Done criteria carried **no finding** and were verified at source: envelope via `ResponseUtils.format` with `HttpStatus.OK` reaching both the envelope `status` and the wire status through `ResponseInterceptor`; `ResultStatusGuard` on PATCH only with the real guard asserting `400` not `403`; `@GetResultVersion()` as the real decorator with default `ParamOrQueryEnum.PARAM`, byte-identical to the reference controller; pipe options exactly `{ whitelist: true, transform: true }` with `forbidNonWhitelisted` deliberately absent; Swagger complete on both own-declared handlers with **DD-13's inheritance exemption neither invoked nor needed**; zero `@Roles`; zero `console.*`; and the route node correctly nested inside `ResultsChildren` under `results`, with shadowing ruled out in both directions against the digit-constrained `${RESULT_CODE}/pool-funding-alignment` sibling.

Its two FAIL issues are recorded in the Pivot Record below (Issue 1) and as the spec correction (Issue 2).

##### Lens B — test fidelity: `STATUS: FAIL`

The central question this lens was spawned to answer — *is the pipe spec behavioral or theatrical?* — resolved **behavioral, genuinely**. The spec constructs the real `ValidationPipe`, calls `.transform(payload, { type: 'body', metatype: CreateResultInnovationUseDto })` against the **real imported DTO class**, and reads real class-validator messages off `err.getResponse().message`, matching field-path fragments rather than hand-transcribed wording. KZ-001 is satisfied: the double is the subject.

It also supplied the analysis the Implementer's sweep could not, having mutated only wiring: judging each assertion against its corresponding **DTO rule** being broken. All rules are locked except one — `IsExclusiveOfActorMode('disaggregated')` is declared on all four disaggregated counts but exercised on only `women_youth_count`.

Three FAIL issues, all in-scope and all cheap:

1. **The `@GetResultVersion()` presence assertion on the PATCH handler is a tautology.** `@ApiBody` writes into the *same* `DECORATORS.API_PARAMETERS` array (verified in `@nestjs/swagger/dist/decorators/api-body.decorator.js:21` → `helpers.js:84-91`), so deleting `@GetResultVersion()` from `update` leaves one entry and `length > 0` still holds. The spec's own comment claims the opposite. The sweep mutated only `findOne`, which carries no `@ApiBody`, so it could not detect this. **Remediation:** assert the specific parameters the decorator contributes — the `in: 'path'` entry plus the two `in: 'query'` entries from `versioning.decorator.ts:13-40` — on **both** handlers, and correct the false comment. The `findOne` assertion is falsifiable today only by accident and becomes a tautology the moment anyone adds an `@ApiQuery` to the GET.
2. **R-IUA-004 AC.3 is proven for one of four fields.** AC.3 is universally quantified over the four disaggregated counts; removing the decorator from the other three leaves the suite green. Since T-07 is by design the only committed gate for R-IUA-004, 75% of AC.3 is untested here and untested anywhere. **Remediation:** `it.each` over the `disaggregatedFields` array already declared in the spec. Three assertions, no new fixtures. **KZ-002 verbatim — one field is a convenient proxy for the real thing.**
3. **Scenario 2's clause `AND errors names the conflict between the mode flag and the disaggregated field` has no covering assertion** — the current match on the field path would also be satisfied by a `@Min(0)` message. **Remediation:** additionally assert some message names `sex_age_disaggregation_not_apply`.

Plus one item Lens B explicitly referred to the Leader for adjudication, recorded as **DD-15** below: **R-IUA-002 AC.7 (`401`) is claimed by T-07 and delivered by nothing.**

##### Scope ruling — `main.routes.spec.ts` is IN SCOPE (both lenses concur, independently)

T-07's Done criteria include *"The module is registered under `results` as `innovation-use` (AC.5)"*, and before this file that criterion had **no assertion any mutation could falsify**. Lens A quoted T-07's own *Verification & its limits* — *"Both are required, and the task must state why: the pipe spec proves the **rules** work; only the decorator assertion proves the **handler runs them**"* — and ruled that *Files touched* is a plan, not a prohibition, while the Done criteria are the contract. Lens B independently reached the same conclusion and additionally verified the file has teeth: the search is confined to `resultsNode.children`, so a node at the wrong nesting level would not satisfy it, and `.module` identity is asserted.

**Both lenses also agree it is insufficient**, and that matters more than the scope question: asserting the shape of the `route` array is a stand-in for "the endpoint exists" that never evaluates what it stands in for. It is KZ-001 in the very file written to close a KZ-001-shaped gap, and it is why Issue 1 below survived a green suite.

---

## Pivot Record: T-07

### The blocker

**Two route-registered modules added by this spec are absent from the application's module graph. Four endpoints that the suite reports as delivered return `404` in production.**

`RouterModule.register()` does not import or instantiate the modules it names. Verified at source in `@nestjs/core/router/router-module.js`: it returns a module exposing the routes as a `ROUTES` provider, stamps `MODULE_PATH` metadata onto each module constructor, and then looks the module up in `modulesContainer` — **returning silently when it is not found**. No boot error. No warning. A route node is a path *prefix*; module instantiation is a separate, mandatory registration.

**Instance 1 — T-07 (found by Lens A, confirmed independently by the Leader).** `ResultInnovationUseModule` appears at exactly three sites repo-wide: the import and node in `main.routes.ts`, and the new route spec. It is **absent from `entities.module.ts`**, whose ~100-module `imports` array is where every other route-registered entity module lives — including `ResultInnovationDevModule` (lines 47 and 149), the exemplar this task was told to mirror. `app.module.ts` imports `EntitiesModule`, never individual entity modules.

**Instance 2 — T-01, already closed `[x]` (found by the Leader's KZ-005 two-direction sweep, not by any Reviewer).** The forward sweep for the corrected term returned **zero** mentions of `entities.module` or `EntitiesModule` anywhere in the spec folder — the omission was total, not local to T-07. Testing whether the same omission had already bitten a closed task:

```
ClarisaActorTypesModule        (working sibling)  → clarisa.module.ts:17, :42  +  clarisa.routes.ts:15, :87
ClarisaInnovationUseLevelsModule (T-01)           → clarisa.routes.ts:12, :75  only
```

`ClarisaInnovationUseLevelsModule` is **absent from `clarisa.module.ts`**. `GET /api/v1/tools/clarisa/innovation-use-levels` returns `404`.

### Why this is a Pivot and not a rework

The defect's root cause is in the approved design, not in either Implementer's work. `design.md` §2.1's composition table enumerates the **route** files (`main.routes.ts`, `clarisa.routes.ts`) and omits the **module-graph** files (`entities.module.ts`, `clarisa.module.ts`) entirely. Neither Implementer had a file to touch; neither Reviewer had a criterion to check. Both did what the spec said.

Three consequences put this outside a rework loop:

1. **It invalidates a `[x]`.** T-01's Done criterion 1 and R-IUA-010 AC.1 both assert that `GET …/innovation-use-levels` returns ten rows. It returns `404`. T-01's PASS rests on evidence — mocked-provider unit specs and a `findByName` grep — that could not have detected this. Under AKILI a `[x]` whose stated outcome is false is the one state the methodology cannot tolerate, and correcting it is not T-07's to do.
2. **The fix crosses task boundaries**, into a file no task in this spec lists.
3. **T-08 would have masked it.** T-08's *Files touched* includes `results.module.ts (modified — import ResultInnovationUseModule)`, which would make the Innovation Use endpoints start working as a side effect of an unrelated task — with no explicit registration where a maintainer would look, and with T-01's catalog endpoint still broken. Had the loop simply continued, the defect would have half-healed itself and become invisible.

**This is a fourth instance of `tasks.md` §0's stated shape — a green run over broken work — and the first one §0 does not name.** Traps 1–3 cover an inert `ValidationPipe`, the `id ≠ level` off-by-one, and uncollected fixtures. This is trap 4: *a route node is not a registration.* The three named traps were each caught by the machinery built to catch them; this one was caught only because a doc-drift sweep was run on an unrelated finding.

### Alternatives considered

| Option | Assessment |
| --- | --- |
| **A. Fix both instances inside T-07's attempt 2** | Fastest, and the smallest diff. **Rejected as the Leader's unilateral call:** it edits a file no task lists and silently repairs a task closed `[x]`, leaving T-01's status unfalsifiable — the exact failure mode AKILI's write-evidence-before-checkbox rule exists to prevent. Viable *with* the user's approval, which is what this record asks for. |
| **B. Reopen T-01, fix each instance in its owning task** | Most faithful to traceability: T-01 reopens `[~]` and closes on its own evidence; T-07's attempt 2 covers only its own instance. Costs one extra review round on T-01. **Recommended.** |
| **C. Mint a new task for module-graph registration** | **Rejected on rule.** A task not in the approved `tasks.md` is scope the user never approved. The work belongs to two existing tasks that each under-delivered against their own ACs; a new task would launder that into new scope. |
| **D. Defer to T-13's full gate** | **Rejected.** T-13 is the cleanup and human-Swagger task. Deferring leaves two `[x]`/`[~]` tasks asserting live endpoints that 404, and T-08 would mask half of it first. |

### Revised technical direction (drafted, pending approval)

1. **`design.md` §2.1** — add the two module-graph rows and correct the stale catalog-import claim. Both edits applied below; the composition table was the defect's origin and is the only place a future reader would look.
2. **`design.md` §11** — record **DD-15** (module-graph registration is a distinct step from route registration) and **DD-16** (the R-IUA-002 AC.7 adjudication).
3. **`tasks.md` §0** — add **trap 4**, so the next worker in this spec family inherits the lesson the way traps 1–3 were inherited.
4. **`tasks.md` T-01** — reopen `[~]`; add `clarisa.module.ts` to *Files touched* and one falsifiable Done criterion.
5. **`tasks.md` T-07** — add `entities.module.ts` and `main.routes.spec.ts` to *Files touched*; add the AC.7 criterion per DD-16; retain the three Lens B remediations for attempt 2.
6. **No ADR is overturned.** No TRD architecture decision is engaged — this is a Nest composition mechanic, not an architectural choice.

### DD-16 — the R-IUA-002 AC.7 adjudication (Leader, referred by Lens B)

AC.7 (`401` on an unauthenticated read) is assigned to T-07 by both the task's *Requirements covered* line and §3's traceability matrix, but T-07's Done criteria contain no line for it and the delivered spec asserts nothing. `design.md` §10.1 rules the fixture tier out of auth entirely (*"Cannot prove … Nothing about HTTP, auth, or Swagger"*), so no downstream task inherits it. Left alone it becomes a claimed-but-undelivered AC — invisible once accepted.

**Ruling: discharge it at T-07 with the mechanism, and record the residual honestly.** The `401` is produced by `JwtMiddleware` applying to the route, and the falsifiable unit-tier fact is that the new route is **not** in `AppModule`'s `exclude` list. That is a sound assertion, not a proxy for one. It does not prove a live `401`, which needs an HTTP seam this spec's unit tier does not have — so the residual is stated rather than closed. Option (b) that Lens B offered — reassigning AC.7 to T-13 — was rejected because T-13 is a human Swagger check, and routing an auth criterion into a human eyeball gate is weaker than the assertion available here.

### Budget status at the Pivot

**12 of ~24 review rounds consumed** (T-01 ×2, T-02 ×1, T-03 ×3, T-04 ×1, T-05 ×1, T-06 ×3, T-07 ×1) at 6 of 13 tasks complete. Option B adds one round to T-01 and one to T-07, landing at ~14 of ~24 with 7 tasks remaining. **Not a tripwire breach**, but the margin is thinner than the task count suggests and is recorded here so the next gate reads it accurately.

### Correction Closure — T-07 Pivot (two-direction sweep, KZ-005)

The spec edits in the *Revised technical direction* above were applied and then closed with the sweep KZ-005 mandates on **every** axis, not only the one that last failed.

**Applied edits (6 files' worth, 4 documents):**

| Document | Edit |
| --- | --- |
| `design.md` §2.1 | Added the `entities.module.ts` and `clarisa.module.ts` rows; corrected the stale *"+ the catalog module"* import claim on the `result-innovation-use.module.ts` row |
| `design.md` Document Control | Modified-file count `4` → **6** |
| `design.md` §11 | **DD-15** (a route node is not a registration) and **DD-16** (the AC.7 adjudication) |
| `design.md` §15 | Revision-log entry |
| `requirements.md` R-IUA-013 AC.5 | **Corrected** — see the backward-direction finding below |
| `tasks.md` §0 | **Trap 4** added; header changed from "Three traps" to "Four traps" |
| `tasks.md` T-01 | Reopened `[~]`; `clarisa.module.ts` added to *Files touched*; one falsifiable Done criterion added; Scope wording corrected; a second falsifying input added to *Verification & its limits* |
| `tasks.md` T-07 | Status `[~]`; `entities.module.ts` and `main.routes.spec.ts` added to *Files touched*; five Done criteria added (module-graph registration, AC.7 per DD-16, and Lens B's three remediations) |
| `tasks.md` header | Task-status line and round tally (11 → 12) |

**Forward direction — the superseded value at sites the analysis did not cite.** Grep for *"the catalog module"* returned two hits: `design.md` §2.1 (the cited site, corrected) and one uncited hit in `requirements.md`. Grep for *"Three traps"* returned zero after the §0 edit. Grep for the route-only registration phrasing returned an uncited hit in **`tasks.md` T-01's Scope** (*"Register at `innovation-use-levels` in `clarisaRoutes`"*) — corrected, because that sentence is the instruction T-01's Implementer actually followed.

**Backward direction — documents that cite the corrected sections and may now assert a falsehood.** This is where the sweep earned its cost. The uncited `requirements.md` hit was **R-IUA-013 AC.5 itself**:

> *"AC.5 — The module is registered in `main.routes.ts` under `results` as `innovation-use`, and the catalog module under `tools/clarisa` as `innovation-use-levels`."*

**That AC's original wording is the proximate cause of the defect, not merely a casualty of it.** It named route-file registration as the whole of the criterion, so both modules satisfied AC.5 *literally* while every one of their four endpoints returned `404` — and a Reviewer auditing against AC.5 as written would have been correct to PASS. Correcting §2.1 and the two task blocks while leaving AC.5 intact would have fixed the two instances and left the generator in place for the next module. AC.5 now requires the module-graph registration explicitly, names the assertion (`Reflect.getMetadata('imports', <GraphModule>)`), and states that neither a route node nor a route-array assertion discharges it.

**New-value re-grep** (the axis KZ-005 adds after the first three): `DD-15` resolves in all four documents, `DD-16` in three, `trap 4` in three, `Reflect.getMetadata` in four. No dangling reference.

### Working-tree state at the Pivot

**Attempt 1's code is retained, uncommitted, not rolled back.** The Step 4 automatic-rollback rule binds a **HALT** — three failed attempts on the same finding — and this is a Pivot with two attempts unspent. Eight of ten Done criteria verified clean at source, and the pipe spec is behavioral, which is the expensive half of this task. Discarding it would re-spend that for nothing. Files present in the tree: the controller, module, controller spec, `main.routes.spec.ts`, and the one-node `main.routes.ts` change.

**What attempt 2 owes, once the pivot is approved:** the `entities.module.ts` registration plus its falsifiable assertion, the AC.7 exclude-list assertion, and Lens B's three test-fidelity fixes (`@GetResultVersion()` parameter-level assertion on both handlers, AC.3 across all four disaggregated fields, and the `sex_age_disaggregation_not_apply` message assertion). T-01 owes one line in `clarisa.module.ts` plus one assertion.

### Pivot Resolution — T-07 / T-01 (user ruling, 2026-08-19)

**Ruled: Option B — reopen T-01 and fix each instance in its owning task.** T-01's `[~]` reopen (already drafted in `tasks.md`) stands as approved rather than provisional. T-07's attempt 2 covers only its own `entities.module.ts` instance plus Lens B's three test-fidelity remediations; T-01 closes on its own evidence with its own review round.

The rejected alternative worth recording: Option A (fix both inside T-07's attempt 2) was the smaller diff and the faster path, and it was declined for the reason that makes Option B cost an extra round — a closed task repaired inside a different task's commit leaves no falsifiable record that the repair happened, which is the same traceability hole the write-evidence-before-checkbox rule exists to prevent. The extra round buys T-01 an audit trail of its own.

**Execution order: serial, T-01 then T-07 — not parallel.** The two tasks are genuinely independent by file set (`clarisa.module.ts` vs `entities.module.ts`, disjoint spec files) and would otherwise qualify for the 2-wide parallel path. They are held serial by a hard project constraint: root `CLAUDE.md` §4.3 *Concurrency* — *"Cross-package parallelism (one server task + one client task) is safe; two tasks in the same package are not."* Both are `server/researchindicators` tasks, and both gate on `npm test`; two concurrent full-suite runs in one package compete for `node_modules`, lockfiles and build output, and the guide's stated consequence is not a slow measurement but a **wrong** one.

**Effort:** both tasks start one level above their task default (`medium` → `high`), per the registry's *Effort dial* re-baseline rule — a `[~]` resume and a post-Pivot retry both arrive under-specified relative to their original brief.

### T-01 — Innovation Use level catalog module *(resumed after the T-07 Pivot)*

- **Status at the time of this entry:** **`[x]` DONE** — PASS on attempt 1 of this resumed round (T-01's third review round overall). Reopened `[~]` earlier today by the T-07 Pivot; closed here on its own evidence, per the user's Option B ruling.
- **Date:** 2026-08-19
- **Implementer attempts run:** 1 (of a possible 3)
- **Requirements in scope for this round:** R-IUA-013 AC.5 (as corrected 2026-08-19), and the `404` cause behind R-IUA-010 AC.1
- **Skills assigned:** `nestjs-expert` · **Effort:** `high` (one level above the task default, per the post-Pivot / `[~]`-resume rule)
- **Review mode:** single Reviewer, lens checklist. `high` does not trigger the parallel-lens path, and the scope was two files / +127 lines.

#### Attempt 1

**Files changed** (2 files, +127 lines):

| File | State |
| --- | --- |
| `src/domain/tools/clarisa/clarisa.module.ts` | modified — one import line + one `imports` array entry, placed in the innovation-family cluster beside `ClarisaInnovationTypesModule`, mirroring the working exemplar `ClarisaActorTypesModule` |
| `src/domain/tools/clarisa/clarisa.module.spec.ts` | new (125) |

**The assertion.** Two tests: a **direct membership** assertion over `Reflect.getMetadata('imports', ClarisaModule)` — the criterion's literal wording and the gate — plus a **transitive reachability DFS** from `AppModule` resolving three entry shapes (bare class, `DynamicModule` `{module}`, `ForwardReference` `{forwardRef}`), cycle-guarded. The `forwardRef` shape is real in this graph (`ResultOicrModule` ↔ `ResultsModule`), not defensive padding.

**Implementer verification**

- `npm test -- --silent` from `server/researchindicators` → **334 suites / 2257 tests**, all passing (baseline 333 / 2255, which already included T-07's in-flight attempt-1 files).
- `npx eslint --no-fix` on both files → clean, after one prettier fix applied **by hand** rather than via `--fix`.
- Mutation sweep run up front, all files restored:

| Mutation | Expected | Observed |
| --- | --- | --- |
| Remove the entry from `clarisa.module.ts`'s `imports` | both tests red | **both red** — membership `toContain` fails; reachability returns `false` |
| Remove `ClarisaModule` from `AppModule`'s imports only | reachability red | **stayed green** — redundant real paths via `ConnectionsModule` (`connections.module.ts:9`) and `BilateralModule` (`bilateral.module.ts:49`) |
| Sever all three edges, restore all | reachability red, membership unaffected | **reachability red, membership green** |

The Leader independently confirmed `git diff HEAD` is empty for `app.module.ts`, `connections.module.ts` and `bilateral.module.ts`, and that T-07's in-flight files were not disturbed.

**Implementer `Not Done / Assumptions`** (recorded verbatim, per the Step 2.3.0 rule):

> None outstanding for this scope. One judgment call worth flagging: the second prescribed mutation (single `AppModule`-edge removal) didn't fail as the brief anticipated, because of legitimate graph redundancy — I escalated to a full severance to actually demonstrate the walk's fidelity rather than reporting the weaker mutation as if it had passed, and stated why in the sweep table above.

**Reviewer verdict: `STATUS: PASS`.**

All seven Done criteria carry a completeness line. Criteria 2–5 were discharged in the earlier round and were **named, not re-audited** (KZ-007 requires zero-finding units be listed, not re-proven); the Reviewer confirmed each artifact still stands undisturbed at source — the `order: { level: 'ASC' }` clause at `clarisa-innovation-use-levels.service.ts:53`, the Swagger decorators, and zero `findByName` sites.

Three findings from this round are worth carrying forward:

1. **The negative path was verified structurally, not just by the sweep.** A repo-wide grep shows the leaf has **exactly one incoming graph edge** (`clarisa.module.ts:43`), so removing it *must* drive `isReachable` to `false` — mutation 1's result is a necessary consequence, not a lucky observation. The cycle guard cannot swallow the target (`visited.add` happens at pop time and the target comparison is the next statement), an unresolvable entry shape is skipped rather than treated as a match, and there is no `try`/`catch`, so a thrown error reddens the test rather than being caught as `false`.
2. **Mutation 2's green was the *correct* answer, not a fidelity gap** — and this correction matters more than the sweep row it replaces. Nest instantiates any module reachable by *any* path, so with `ClarisaModule` still reachable through `ConnectionsModule`/`BilateralModule` the endpoint really would still serve `200`. A red test there would have meant the walk **mis-models production**. The escalation to a three-edge severance is the sound way to reach the negative path.
3. **The reachability test adds nothing to the falsifiability of T-01's own edge.** Because the leaf has a single incoming edge, mutation 1 reddens both tests — they are not independent for the defect T-01 owns. What reachability adds is coverage of the one-level-up class (a `ClarisaModule` fully de-registered), which the triple redundancy makes unlikely. Marginal but real, and correctly ordered: membership is the gate and the file's first `it()`.

**Placement:** the brief's "no precedent" was wrong and the Reviewer corrected it — three pre-existing `*.module.spec.ts` files sit beside their modules, one in this same tree (`clarisa-sdg-targets.module.spec.ts`). Only the graph-*walk* technique is new; the location and name follow `server/researchindicators/src/CLAUDE.md` §3/§9 exactly.

**Collection confirmed at source** (trap 3): `package.json:129-130` sets `rootDir: "src"` and `testRegex: ".*\\.spec\\.ts$"`; the file matches. The delta was reconstructed rather than assumed — exactly one `describe` and two `it` blocks → +1 suite / +2 tests, matching 333→334 / 2255→2257, with no third test hidden in a loop or `it.each`.

**Import-time safety confirmed at source.** The spec never calls `NestFactory`, `Test.createTestingModule` or `.compile()`; it only reads static `@Module()` metadata. `app.module.ts:41-42` calls `getDataSource(CORE, false)`, whose `shouldProcess: false` branch returns plain options and constructs nothing. The module-scope `new DataSource(...)` at `orm.config.ts:71-73` builds only the driver — a socket opens in `initialize()`, which nothing here calls.

#### Declared limits, restated so they are not mistaken for proven

- **No live `200`.** The assertion proves the module is instantiated, not that the route responds. `design.md` §10.1 rules the fixture tier out of HTTP entirely, so **no downstream task inherits this** — it is a stated residual, not a deferral.
- **Nest DI resolution is untested.** Nothing here compiles the module, so a missing or mis-provided `ClarisaInnovationUseLevelsService` would still surface only at boot. The sibling `clarisa-sdg-targets.module.spec.ts` *does* `.compile()` — a stronger, precedented tier this file deliberately forgoes, correctly, since compiling the leaf in isolation would not prove graph membership. The two are complementary, not substitutes.
- **`RouterModule`'s own behavior is unasserted.** The DD-15 mechanic rests on a source reading of `router-module.js`, not on a test.
- **The path prefix is unasserted in this round** — that `innovation-use-levels` composes under `tools/clarisa` rests on `clarisa.routes.ts` and its parent node, evidence from the earlier round.
- **Ten *seeded* rows** is a DB-tier fact, owed to **T-11 (F-D)**.
- **Ordering unchanged:** the `level` `0…9` guarantee rests on the unit spec's `order`-clause assertion, not a behavioral check — `id = level + 1` makes primary-key order coincidentally correct on the current seed, so an end-to-end sequence assertion cannot falsify a missing clause. See T-11's F-D.
- **Coverage was not re-measured.** `collectCoverageFrom` is `**/*.(t|j)s`, so every file is already in the denominator and the wide import can only nudge coverage up — but this is a claim not made rather than a claim verified.

#### `ADVISORY` findings (4R lens — recorded, non-gating, and they do not become tasks)

| Lens | Finding | Disposition |
| --- | --- | --- |
| Reliability | `isReachable` has **no in-file negative control**, so its ability to return `false` is evidenced only by a transient mutation sweep that lives in no file. One line would pin it permanently: `expect(isReachable(ClarisaInnovationUseLevelsModule, AppModule)).toBe(false)` — stable, since the leaf declares no `imports`. **This is KZ-001 applied to the verifier itself** | **Recorded and it dies here.** Not actioned, not minted as a task, and T-01 was not widened to absorb it — the advisory rule binds even when the advisory is good, and this one is good. Carried to `/akili-archive` as Kaizen input, which is the legitimate route by which it may earn a proposal |
| Resilience | This is the **only** spec under `src/` importing `AppModule`. Any import-time side effect added anywhere in the ~100-module graph will fail here, under a title about one CLARISA catalog list | Recorded. Proportionate for now; if a second graph spec appears, hoist the walk into a shared helper with one graph-wide spec |
| Readability | The file's header comment names the mechanism, the rejected stand-in, and why importing `AppModule` is safe | Recorded — keep verbatim if the helper is ever hoisted |
| Risk | Near zero. Two lines of module composition; no runtime behavior change beyond making a previously dead controller reachable; no auth, migration or data surface touched | Recorded |

**Final verification:** `npm test -- --silent` → **334 suites / 2257 tests** green · `npx eslint --no-fix` clean on both files · `git diff HEAD` empty on all three mutation targets.

**Forward pointers created by this round**

| → Task | Pointer |
| --- | --- |
| **T-07 (attempt 2)** | The `entities.module.ts` instance of DD-15 is still open. Note the asymmetry the Reviewer surfaced: `ResultInnovationUseModule` will have **one** incoming edge, so a membership assertion over `Reflect.getMetadata('imports', EntitiesModule)` is fully falsifiable on its own — a reachability walk is optional there, not load-bearing as it was here |
| **T-08** | Its planned `results.module.ts` import of `ResultInnovationUseModule` would add a **second** edge. Once T-07's `entities.module.ts` registration lands, T-08 must not be read as the thing that makes the endpoints work |
| **T-11 (F-D)** | Ten *seeded* rows and the behavioral `0…9` order remain owed here, and F-D is already declared unfalsifiable on the current seed |
| **T-13** | Human `/swagger` check still owns confirming the catalog `GET` renders under `Clarisa` with the bearer lock **and** that its missing `@ApiOperation` is the DD-13 exemption rather than a defect |
| Kaizen (archive) | Three candidates: **(a)** a verifier needs its own negative control — KZ-001 applied one level up, from the advisory above; **(b)** a mutation that stays green can be the *correct* answer when the graph has redundant paths, so "mutation stayed green ⇒ missing test" is a heuristic, not a law; **(c)** a Leader brief asserting "no precedent exists" should be grep-checked before it reaches a worker — this one was wrong and the Reviewer caught it |

**Budget status:** 6 of 13 tasks complete (T-01 restored to `[x]`; T-07 remains `[~]`). **13 of ~24 review rounds consumed** (T-01 ×3, T-02 ×1, T-03 ×3, T-04 ×1, T-05 ×1, T-06 ×3, T-07 ×1).

#### Attempt 2 — PASS

- **Status at the time of this entry:** **`[x]` DONE** — PASS on attempt 2 of 3, both lens Reviewers concurring.
- **Effort:** `high` (bumped from `medium` per the rework rule — a fix that failed is usually under-thinking)
- **Review mode:** parallel lens Reviewers (2), same split as attempt 1. Justified on the same ground plus a new one: T-07 still carries the only committed gate for R-IUA-004 AC.1–AC.8, and attempt 1 had proved that one review round could pass a `404` through.

**Files changed** (7 files touched; 2 lines of production code, the rest specs):

| File | State |
| --- | --- |
| `src/domain/entities/entities.module.ts` | modified — one import (`:48`) + one `imports` array entry (`:151`), beside `ResultInnovationDevModule`. **This is the entire production fix for DD-15.** |
| `src/domain/entities/entities.module.spec.ts` | new (43) — membership assertion over `Reflect.getMetadata('imports', EntitiesModule)` |
| `src/app.module.spec.ts` | new (49) — DD-16's AC.7 exclude-list assertion |
| `…/result-innovation-use.controller.spec.ts` | modified 537 → 600 — the three Lens B remediations |
| `…/result-innovation-use.controller.ts` · `…/result-innovation-use.module.ts` · `main.routes.ts` · `main.routes.spec.ts` | **unchanged from attempt 1** — line counts match this log's attempt-1 record exactly, corroborating the byte-identical claim |

**Implementer verification, then re-run independently by the Leader**

- `npm test -- --silent` → **336 suites / 2262 tests / 1 snapshot**, all passing (baseline 334 / 2257 after T-01's commit).
- `npx tsc --noEmit` → **clean** (Leader-run; this is the first real type check of the controller and module, closing the T-02 Risk advisory that `npm test` was weak evidence of compilation for files nothing imported).
- `npx eslint --no-fix` over all seven files → exit 0, zero output; `git status` re-checked after, no lint mutation.
- **16-mutation two-axis sweep**, each applied → confirmed red → restored, restoration verified byte-identical via `diff -q` against backups. This is the correction of attempt 1's structural evidence gap: that sweep broke only decorators and wiring, so it proved the wiring had teeth and said nothing about the pipe spec.

| Axis | Mutations | Result |
| --- | --- | --- |
| Wiring (7) | remove the `entities.module.ts` entry · remove `@GetResultVersion()` from `update` · from `findOne` · remove `@UsePipes` · remove `@UseGuards` · remove the route node · add the route to the exclude list | all red. The `update` case is the exact tautology attempt 1 missed: only `@ApiBody`'s `in: 'body'` entry remained |
| DTO rules (9) | `IsExclusiveOfActorMode('disaggregated')` removed from **each of the four fields individually** · `('aggregate')` from `actors_count` · `@Min(0)`→`@Min(-1)` · `@IsInt()`→`@IsNumber()` · `@Matches(/\S/)`→`/.*/` · `whitelist` false | all red. None stayed green; **none failed to compile** (T-06's lesson — an uncompilable mutation is not evidence) |

**Implementer `Not Done / Assumptions`** (recorded verbatim, per the Step 2.3.0 rule):

> None. All six scope items are implemented, the full two-axis mutation sweep is complete with every mutation independently confirmed red and restored, and the full suite is green at 336/2262.

**Reviewer verdicts — both lenses `STATUS: PASS`.** All fifteen Done criteria discharged, each walked against an artifact; both lenses state explicitly that none is met only nominally.

##### The findings worth keeping

1. **The edge-count asymmetry held, and in T-07's favour.** Lens A grepped every site referencing `ResultInnovationUseModule` and confirmed **exactly one incoming graph edge** (`entities.module.ts:151`) — the route node is not an edge (that is DD-15's whole point) and neither is the import statement. So deleting that line *necessarily* reddens the membership assertion: the sweep's red is a structural consequence, not an observation. The Leader's instruction not to build a reachability walk here was therefore correct, and this is the clean **inverse of T-01**, where `ClarisaModule` has three redundant incoming edges and membership alone would have been the weaker assertion. One mechanic, two opposite correct answers, decided by edge count.
2. **The tautology is closed for a checkable reason.** `@GetResultVersion()` contributes exactly three entries — `in: 'path'` (`resultCode`) plus two `in: 'query'` (`reportingPlatforms`, `reportYear`), confirmed in the installed `@nestjs/swagger` decorator sources. `expectVersioningParams` names all three, and on `update` the `@ApiBody` entry is *separately* asserted as `in: 'body'`, so `arrayContaining` cannot be satisfied by `@ApiBody` alone. Metadata is defined per-method on `descriptor.value`, so the two handlers' assertions are genuinely independent. **The previously-false comment was corrected and both lenses verified every factual claim in the new one at source** — a corrected assertion under a still-wrong comment would have been a trap for the next reader, which is why the comment was part of the remediation rather than cosmetic.
3. **AC.3's four cases fail for the right reason, provably.** Case 2's payload seeds `5` — valid for `@IsInt` and `@Min(0)` — so the exclusivity constraint is the only rule that can fire, and `expectRejectedNaming` additionally demands the fragment `sex_age_disaggregation_not_apply`, which **only** `IsActorCountModeExclusiveConstraint.defaultMessage` can emit. The wrong-reason substitution Lens B flagged at attempt 1 is structurally excluded, not merely unobserved.
4. **The reported 2-vs-1 mutation asymmetry has exactly the offered cause.** Lens B checked every other site touching `women_youth_count` — Case 1's negative/fractional cases fail on `@Min`/`@IsInt` with the flag `false`, Case 6 supplies no counts, Case 9 supplies it with the flag `false` where the rule correctly passes — and found precisely two cases depend on that one decorator. No alternative cause.
5. **The `whitelist` mutation's scope, stated precisely.** Case 9 binds the option on the pipe *the spec constructs*; it is structurally blind to the controller's `@UsePipes` options, exactly as the file's own comment says. The controller's options are bound separately by the `PIPES_METADATA` assertion reading Nest's real `validatorOptions` / `isTransformEnabled`. Both halves exist; nothing is left ungated.
6. **Arithmetic reconstructed by hand, independently, by both lenses.** Controller spec: 13 wiring + 30 pipe = 43 cases, versus attempt 1's 13 + 27 = 40 → **+3**, exactly Case 2 expanding 1 → 4 under `it.each`. Two new suites contribute +2 suites / +2 tests. 334 + 2 = 336; 2257 + 3 + 2 = 2262. Every `it.each` expanded by its array length; no test hidden in a loop, none double-counted.
7. **AC.7's second half is true but unasserted, and Lens A checked it rather than assuming.** AC.7 needs *not excluded* **and** *actually in scope*; `app.module.ts:106-109` calls `.forRoutes({ path: '*', method: RequestMethod.ALL })`, so `JwtMiddleware` genuinely covers the route. The spec asserts only the first half — sound but incomplete, and the criterion asks for no more. Recorded as advisory below rather than silently treated as covered.
8. **A brief error corrected, again.** The Leader's brief said a `*.module.spec.ts` precedent existed (three files). Lens A found **four**, including `app.controller.spec.ts` / `app.service.spec.ts` siblings validating `app.module.spec.ts`'s placement. Second consecutive round in which a Leader "precedent" claim was wrong in the worker's favour — see the Kaizen pointer.

#### Declared limits, restated so they are not mistaken for proven

2,262 green tests are **not** behavioral coverage of this section. Every repository in this tier is mocked (`design.md` §10.1: *"Cannot prove … Anything about actual persistence"*), and this diff adds **no HTTP seam at all**.

- **The `404` symptom is now gated by a `@Module()` metadata read, not by a booted app answering `200`.** That is exactly what the corrected R-IUA-013 AC.5 asks for, and it is still **one abstraction short of the symptom** — worth stating plainly, since this task's whole Pivot was caused by an abstraction one step short of a symptom.
- **Not proven:** that Nest invokes the `@UsePipes` pipe at request time. `PIPES_METADATA` proves the decorator is attached with the right options; the pipe spec proves the rules work on a pipe the test built.
- **AC.7's residual, as DD-16 requires it be stated:** the exclude-list assertion proves the *mechanism* producing the `401`, **not a live `401`**. No tier in this spec proves that — §10.1 rules the fixture tier out of auth entirely. The file records this itself.
- **Owed to T-09 (F-A):** R-IUA-003 AC.1 (with T-06), AC.3, AC.6 audit columns, AC.7's `AND IT MUST NOT hard-delete B`, scenario 2; the persistence half of R-IUA-002 AC.1–AC.6 and R-IUA-007 AC.1/AC.3. KZ-006's one end-to-end criterion for this spec lands there, not here.
- **Owed to T-10 (F-B):** role isolation — R-IUA-003's `BUT NOT deactivate any row whose actor_role_id is not INNOVATION_USE`, R-IUA-007 AC.4.
- **Owed to T-11 (F-C/F-D):** R-IUA-006's `id 6` vs `id 7` discriminating pair (trap 2), and R-IUA-010's order clause — with §10.5's standing caveat that **F-D cannot falsify a missing order clause**.
- **Owed to T-12 (F-E):** R-IUA-001, R-IUA-011, R-IUA-012.
- **Owed to T-13:** R-IUA-013 AC.3 in full (the human `/swagger` check is the only gate for `@ApiProperty` ×25 and both handlers' Swagger surface), AC.7, NFR-IUA-001, and `npm run test:cov` ≥ 60%. Coverage was not measured this attempt; T-07's criteria do not ask for it, and the added production code is two lines plus a fully-exercised controller, so no regression is plausible.

#### `ADVISORY` findings (4R lens — recorded, non-gating, and they do not become tasks)

| # | Lens | Finding | Disposition |
| --- | --- | --- | --- |
| A-1 | Reliability | **Aggregate mode is never proven *usable*.** All eleven payloads containing `actors_count` expect a rejection, so mutating the constraint's aggregate branch to `return false` — making `actors_count` unsuppliable entirely — leaves the whole suite green. **This is the one surviving mutant on the DTO axis**, and it is asymmetric: the disaggregated branch's accept direction *is* bound by Case 9. One line closes it (`{actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 7}` must resolve with `actors_count === 7`). No Done criterion demands it — criterion 5's "two accept cases" are T-02's, delivered as Cases 6 and 7 | **Recorded; dies here.** Not actioned, T-07 not widened. Carried to `/akili-archive` as the strongest Kaizen candidate of this round |
| A-2 | **Risk (auth-adjacent)** | **`app.module.spec.ts`'s comment overclaims regression protection.** *"A future change that widened the exclude list to cover the Innovation Use route would be caught by this assertion"* is **false** for any wildcard entry (`results/(.*)`, `*`) covering the route without the literal substring `innovation-use`. Both lenses found it independently. A maintainer adding such an entry would see the test pass and could read the comment as having vetted an auth bypass. DD-16 authorizes only the today-true claim, and all seven current excludes were checked against the route — none matches, so the assertion is correct today | **Recorded; dies here — but escalated to the user at the gate rather than buried**, because Lens B explicitly referred it to the Leader and the invited failure is an auth bypass a green test appears to have vetted. It is *not* a spec gap (nothing is wrong today, and the risk is future), so the Pivot path does not apply and T-07 is not widened. Recommended as a follow-up outside this spec |
| A-3 | Reliability | `capturedExcludes` is **assigned, not accumulated** (`app.module.spec.ts:31`). A second `apply().exclude().forRoutes()` chain would overwrite the first, and an Innovation Use exclusion in the earlier chain would pass unnoticed — a *silent* pass, unlike the loud `TypeError` the double's other divergences produce. `push(...routes)` closes it | Recorded |
| A-4 | Reliability | The index case does not assert the **innocent** row is unnamed. Scenario 2's `one valid row is not rejected because a sibling row is invalid` would still hold under a constraint that flagged row 0 too, since the assertion only checks presence. Structural risk is low (the constraint reads `args.object`, its own row) but one negative assertion — no message contains `actors.0` — would make it a fact rather than an inference | Recorded |
| A-5 | Readability | (a) The pipe suite jumps `Case 7` → `Case 9` with no note that Case 8 is T-02's `@ApiProperty` criterion, exempt to T-13. (b) `fail(...)` at two sites is unreachable and undefined under jest-circus; if ever reached it surfaces as `ReferenceError` rather than the intended message. Inherited pattern | Recorded |
| A-6 | Readability | The `@Roles` grep is anchored `/^\s*@Roles\(/m`, tighter than the criterion's "zero `@Roles` occurrences" — it would miss an inline `@UseGuards(RolesGuard) @Roles(...)`. Cannot be introduced without touching the import block | Recorded |
| A-7 | Resilience | `app.module.spec.ts` is the **second** spec under `src/` importing `AppModule` — **the exact trigger condition T-01's own advisory named** (*"if a second graph spec appears, hoist the walk into a shared helper"*). Two unrelated titles now break on any import-time side effect added anywhere in the ~100-module graph | Recorded. The predicted trigger has fired; belongs to `/akili-archive` Kaizen, not to T-07 |
| A-8 | Readability | `main.routes.spec.ts`'s header still reads `T-07 (R-IUA-013 AC.5)` unqualified, while post-correction AC.5 has two halves and that file covers only the route-file one. The insufficiency is recorded in `tasks.md` and in `entities.module.spec.ts`'s docstring, but not in the file a maintainer opens first | Recorded |
| A-9 | Readability | `app.module.spec.ts:23` transcribes an exclude as `reports/:resultCode/pdf`; the real value is `reports/:resultCode(\d+)/pdf`. Cosmetic | Recorded |

**Final verification:** `npm test -- --silent` → **336 suites / 2262 tests** green · `npx tsc --noEmit` clean · `npx eslint --no-fix` clean on all seven files — **all three re-run independently by the Leader**, not relayed.

**Forward pointers created by T-07**

| → Task | Pointer |
| --- | --- |
| **T-08** | Its *Files touched* includes `results.module.ts (modified — import ResultInnovationUseModule)`. **That import is REQUIRED — it is a DI edge, not a redundant registration.** *(Corrected 2026-08-19 at T-08's dispatch: the Leader had first recorded it as possibly droppable now that `entities.module.ts` carries the registration, and grep-checked the claim before briefing. `ResultsService` injects `_resultInnovationDevService` and `results.module.ts` imports `ResultInnovationDevModule` for exactly that reason; T-08 adds `_resultInnovationUseService` to the same constructor, so `ResultsModule` must import the module that exports it. Dropping it yields `Nest can't resolve dependencies of the ResultsService` at boot — invisible to mocked-provider specs, the same invisibility class as DD-15.)* **Consequence for `entities.module.spec.ts`, stated precisely:** the import does not alter `EntitiesModule`'s `imports` array, so the membership assertion remains exactly as falsifiable — deleting `entities.module.ts:151` still reddens it. What narrows is its *meaning*: with a second instantiation path via `ResultsModule`, that deletion would no longer break the endpoint, so the assertion becomes a **convention check rather than a proxy for reachability**. Keep it; do not upgrade it to a reachability walk, and do not let T-08 be read as the thing that makes the endpoints work |
| **T-09 (F-A)** | The first tier that can prove the endpoints actually serve `200`. Everything above is metadata-level. Its harness is also KZ-006's one end-to-end criterion for this spec |
| **T-13** | Human `/swagger` check owns R-IUA-013 AC.3 entirely — both own-declared handlers' `@ApiOperation`/`@ApiBody` **and** `@ApiProperty` ×25 — plus the DD-13 exemption confirmation on the catalog `GET`. Note the corollary: `total`-stripping is proven, but the Swagger contract a client reads is ungated until a human looks |
| **Kaizen (archive)** | Four candidates: **(a)** advisory A-1, the surviving aggregate-mode mutant — a rejection-only test set never proves the accept direction; **(b)** the same mechanic can demand opposite assertions in two tasks, decided by graph edge count (T-01 needed reachability, T-07 needed membership) — so "use the stronger assertion" is not a general rule; **(c)** **two consecutive rounds in which a Leader brief asserted "precedent"/"no precedent" wrongly** and the Reviewer corrected it — brief claims about repo state should be grep-checked before dispatch; **(d)** a false comment accompanying a correct assertion is a defect worth gating on (attempt 1) but a merely overclaiming one may not be (A-2) — the line between them is whether the claim is false *today* |

**Budget status:** **7 of 13 tasks complete.** **14 of ~24 review rounds consumed** (T-01 ×3, T-02 ×1, T-03 ×3, T-04 ×1, T-05 ×1, T-06 ×3, T-07 ×2). Six tasks remain against ~10 rounds — the tasks left (T-09's harness, four fixture tasks, T-13's full gate) are the DB-dependent ones this spec has not yet exercised, so the remaining margin is thinner than 6-vs-10 suggests. Flagged at the gate, not deferred.

## Constitution Impact: T-01 / T-07 (DD-15)

**Module created / reshaped.** T-07 created `domain/entities/result-innovation-use/` as a full entity module with a new public HTTP surface (`GET`/`PATCH /api/v1/results/innovation-use/:resultCode`), and T-01 created `domain/tools/clarisa/entities/clarisa-innovation-use-levels/`. Neither moves an existing module boundary and neither needs a child guide of its own — both sit inside trees already covered by [`server/researchindicators/src/CLAUDE.md`](../../../server/researchindicators/src/CLAUDE.md). The root guide's `## Module Guides` index needs no new entry.

**A child guide became actively misleading, and was fixed in this task's commit rather than deferred to `/akili-archive`.** This is the Step 3.5 exception, not a routine sync, and the grounds are specific: the guide's own *how to add a module* instructions named only the route file, which is the precise wording that produced DD-15 twice in one spec.

| Site | Before | After |
| --- | --- | --- |
| Decision tree item 1 | *"Register routes in `domain/routes/main.routes.ts`."* | Names the route node **and** the `entities.module.ts` entry — "both, never just the route node" |
| Step 4 *Route registration* | *"if it is a new sub-resource path, add a node under `domain/routes/main.routes.ts`"* | Retitled *"two steps, and the second is the one people miss"*, with a block quote giving the `RouterModule` mechanic, the `404` consequence, why mocked-provider specs and route-array assertions cannot catch it, the falsifiable `Reflect.getMetadata` assertion, both worked exemplars, and the DD-15 citation |
| Directory tree comment | `# RouterModule registration tree` | `# RouterModule path-prefix tree (NOT module instantiation — see §4)` — the old comment actively reinforced the wrong mental model |

**Applied to both `CLAUDE.md` and its near-mirror `AGENTS.md`.** The two files carried the three lines identically. Fixing only `CLAUDE.md` would have been **KZ-005's file-set axis verbatim** — correcting the phrasing while leaving the file set unbounded — and `AGENTS.md` is what the non-Claude hosts read, so the defect would have survived for exactly the agents least likely to have this spec's history in context. Swept after: `grep` for the superseded phrasing across all `*.md` returns **zero**; the new guidance resolves in both guides.

**Why this did not wait for archive.** Deferring would have left the repo's own instructions telling the next agent to ship a `404`, with two live examples in the tree proving the instruction is followed literally. A guide that misleads is a defect with a blast radius larger than the spec that found it. It is also a documentation edit, so the Leader's no-production-code rule is not engaged.

**Pending for `/akili-archive`:**

- **CodeGraph re-index** — two new modules, two modified module-graph files, seven new spec files across T-01 and T-07.
- **TRD check** — whether `docs/trd/trd.md` §4.1/§6.1 (module layout, backend architecture) should carry the DD-15 mechanic as a platform-level convention rather than only in the child guides. **No ADR is overturned** — this is a Nest composition mechanic, not an architectural decision, so no superseding ADR is owed.
- **The four Kaizen candidates** recorded against T-01 and T-07, of which the strongest is advisory A-1 (a rejection-only test set never proves the accept direction) and the most process-relevant is the two consecutive rounds in which a Leader brief asserted repo "precedent" wrongly.

### T-08 — Result-creation path: detail row + IP Rights row

- **Status at the time of this entry:** **`[x]` DONE** — **PASS on attempt 1, zero rework**; 1 review round (2 parallel lens Reviewers, both PASS).
- **Date:** 2026-08-19
- **Implementer attempts run:** 1 (of a possible 3)
- **Requirements in scope:** R-IUA-001 (all ACs + scenario), R-IUA-011 (all ACs + scenario), R-IUA-012 AC.4
- **Skills assigned:** `nestjs-expert`, `tdd` (task defaults, unchanged) · **Effort:** `max`, set by the task itself — *"two lines that change a method shared by all six indicators"*
- **Review mode:** parallel lens Reviewers (2), which `max` effort mandates. Split: conformance/regression-blast-radius, and test fidelity.

#### Attempt 1

**Files changed** (3 files; **2 lines of behavioural production code**):

| File | State |
| --- | --- |
| `src/domain/entities/results/results.service.ts` | modified +6 — the `INNOVATION_USE` `switch` case and the `ipAvailables` member (the two behavioural additions), plus the `ResultInnovationUseService` import and its constructor parameter (mechanical DI wiring) |
| `src/domain/entities/results/results.module.ts` | modified +2 — import + `imports` entry, after `ResultInnovationDevModule`. **A required DI edge, not bookkeeping** |
| `src/domain/entities/results/results.service.spec.ts` | modified +124, additions only |

**Implementer verification, then re-run independently by the Leader**

- `npm test -- --silent` **full suite, never targeted** (KZ-003 — this method serves every indicator) → **336 suites / 2264 tests / 1 snapshot**. Baseline 336 / 2262; **+2 tests, +0 suite files.**
- `npx tsc --noEmit` → clean. `npx eslint --no-fix` on all three files → clean; `npm run lint` never run.
- **TDD evidence:** the indicator-6 test was written and failed red (`Expected number of calls: 1, Received: 0`) **before** the production edit, green after. The five pre-existing branches were extended additively rather than driven red→green, since they already passed at `HEAD` — the correct application of `tdd` to a task whose risk is regression, not new logic.

**Mutation sweep** (each restored, byte-diff verified):

| Mutation | Observed |
| --- | --- |
| Remove the `INNOVATION_USE` case | red |
| **Remove its `break` (fall-through)** | **red**, via the `KNOWLEDGE_PRODUCT` mock's `not.toHaveBeenCalled()` at `results.service.spec.ts:1459` |
| Remove the `ipAvailables` member | red — the task's own named falsifying input |
| Pass no `manager` | red |
| Add `innovation_use` to `VISUAL_ONLY_GREEN_CHECKS` | red (verified by mutating `find-green-checks.dto.ts` and running its existing spec, then restoring) |
| Hardcoded user id instead of `CurrentUserUtil` | **reported "not applicable within scope"** rather than fabricated — adjudicated below and upheld |
| **Remove the `results.module.ts` import** | **stayed GREEN**, reported honestly with the catching tier named and no fabricated test |

**Implementer `Not Done / Assumptions`** (recorded verbatim, per the Step 2.3.0 rule):

> - None outstanding for this task's scope. One judgment call worth flagging: I placed the new `INNOVATION_USE` case between `OICR` and `KNOWLEDGE_PRODUCT` in the switch (rather than appending it last before `default`), specifically so the fall-through mutation would have an observable side effect to catch — if placed last, removing its `break` would fall into a no-op `default:` and the brief's required fall-through mutation would never redden anything, which the brief explicitly said would mean "AC.4's proof is nominal." This ordering choice is additive (no existing case's body or position relative to each other changed; only the insertion point shifted line numbers below it), and is why the fall-through mutation above shows a genuine red.
> - The `docs/specs/innovation-use/details-api/execution.md` file shows as modified in `git status` — I did not touch it; it already carried a Leader-applied correction to the T-08 forward-pointer text (the one this brief quotes verbatim) before I started. Left untouched.

**Reviewer verdicts — both lenses `STATUS: PASS`.** All nine Done criteria met.

##### The findings worth keeping

1. **Two independent forensic proofs that no pre-existing assertion was weakened** — the risk the Leader named as the highest-value possible finding, since AC.4 is the criterion `max` effort exists for.
   - **Lens B reconciled the line budget exactly.** All 124 insertions accounted for: 1 import + 1 mock declaration + 4 factory + 4 provider + 5 `not.toHaveBeenCalled()` lines + 109 for the two new tests = **124**. Every insertion is pure addition, so **zero insertions remain available for a rewritten line** — a modified assertion would have consumed one and left the budget short. It then inventoried the assertion sets to exclude deletions: all five pre-existing tests are symmetric, with a single *uniform* omission (`mockResultKnowledgeProductService`) which is exactly the acknowledged pre-existing gap. A deletion would show as asymmetry; there is none.
   - **Lens A found a negative control.** The OICR test still asserts `expect.any(Object)` for the manager at `:1344`, while both new tests assert the concrete `mockEntityManager`. Anyone editing those five bodies would almost certainly have normalised that inconsistency; its survival is positive evidence they were untouched — stronger than a line count, and arrived at independently.
2. **The `KNOWLEDGE_PRODUCT` coverage gap was real, and closing it is a genuine strengthening.** Both lenses confirmed `mockResultKnowledgeProductService` occurred at exactly three sites before this edit — declaration, factory, provider — and **zero assertions**. AC.4 was therefore *unprovable* for that branch at `HEAD`. The new test pins `toHaveBeenCalledWith(result_id, mockEntityManager)` — the manager object, not a matcher — plus six zero-call assertions.
3. **The fall-through mutation genuinely binds, and it is well-formed evidence.** Lens B traced it: case order is `1, 4, 2, 5, 6, 3, default`; deleting the new `break` reaches `_resultKnowledgeProductService.create`, failing the assertion at `:1459`. And on T-06's lesson that an uncompilable mutation proves nothing — `tsconfig.json:19` sets `"noFallthroughCasesInSwitch": false`, so the break-less switch **compiles**. Leader-confirmed at source. Lint would flag it; `npm test` does not run lint.
4. **An unclaimed bonus.** The new zero-call line on the OICR test makes **OICR's** `break` falsifiable too — previously it had no fall-through guard at all, because nothing asserted the `KNOWLEDGE_PRODUCT` mock.
5. **Two blast-radius risks the diff cannot show, both provably absent (Lens A).** Inserting a constructor parameter at index 12 of 40 would silently shift 27 arguments for any positional caller — `new ResultsService(` occurs nowhere in `src`, and DI is type-based throughout. And no module cycle: `ResultInnovationUseModule` imports only three leaf modules with no `imports` of their own, so there is no path back to `ResultsModule`. **No `forwardRef` was needed and none was added** — the escalation clause had nothing to fire on.
6. **The "second instantiation path" concern is settled by precedent, and the Leader had it backwards at the previous gate.** `ResultInnovationDevModule` is *already* registered in **both** `entities.module.ts:150` and `results.module.ts:76`, and `ResultIpRightsModule` in both — each with a controller. T-08 reproduces, one line below its precedent, a double-edge pattern already in production. No duplicate controller registration, no route conflict.
7. **Mock isolation is order-independent (Lens B).** Reset is triple-layered: the top-level `beforeEach` reconstructs the mock as a fresh object and recompiles the `TestingModule`; `afterEach` calls `jest.clearAllMocks()`; the `createResultType scenarios` `beforeEach` calls it again. `clearAllMocks` clears history but not implementations, so the parent's `transaction.mockImplementation` survives. No shared un-reset mock, no latent order flake — the failure mode the Leader asked about specifically.
8. **T-07's advisory A-1 does not recur.** Lens B checked the IP Rights rule in both directions across all six indicators and found the **accept** direction asserted for 1, 2 and 6 — not a rejection-only set. The residual is that 1 and 2 assert *called-with* rather than `times(1)`; structurally safe, since there is one call site under a boolean guard.

##### Adjudications

- **Criterion 8 — "exactly two added logical lines": MET, and the wording was defective.** The diff is +6 physical. Lens A ruled that the task's own *Scope*, its *Files touched* entry for `results.module.ts`, and `design.md` §5.7 **each presuppose the DI wiring** — injection is impossible without the import and the parameter — so enforcing the count literally would penalise the work for obeying the document. Same class as the corrections at T-04 (R-IUA-007 AC.4), T-05 (R-IUA-002 AC.1) and T-07 (AC.5). **Corrected in `tasks.md` with Lens A's exact replacement wording**, and swept: the superseded phrasing returns zero hits.
- **Switch placement: sound engineering, not contortion.** Behaviour-neutral by language semantics (every case `break`s, so position cannot affect dispatch — there is no cost to weigh against the benefit); no convention to break, since the order was already `1, 4, 2, 5, 3`; and the alternative is actively worse — appended last, `default: break;` absorbs the fall-through, so the new `break` would be **dead today and untestable**, becoming a live defect the day someone adds a seventh case after it. The residual is that the rationale lives in this log rather than at the call site.
- **Criterion 6 (audit fields): genuinely discharged upstream, nothing owed here.** The new case calls `create(resultId, manager)` — **no user-id parameter exists in T-08's surface**, so there is nothing to hardcode and no mutation to fabricate. Both lenses verified the hand-off rather than accepting it: `result-innovation-use.service.spec.ts:207-214` asserts `objectContaining({ result_id: 42, created_by: 1 })` **and** `expect(mockCurrentUser.audit).toHaveBeenCalledWith(SetAuditEnum.NEW)`. Lens B identified why the second line is what makes it bind — hardcoding `created_by: 1` in place of the `audit(NEW)` spread would still satisfy the `objectContaining` check but leaves `audit` uncalled, so it reddens. Reporting the mutation inapplicable and naming where the coverage lives was correct, and preferable to inventing one.
- **`ip_rights` in `VISUAL_ONLY_GREEN_CHECKS`: pre-existing gap, out of scope.** The criterion's stated method is a `grep` and the grep is clean (`find-green-checks.dto.ts:5-7` holds only `'pool_funding_alignment'`). The one assertion file involved is **chunk-1-owned** and asserts `innovation_use`'s absence but not `ip_rights`'s. The Implementer flagged it rather than silently widening scope — the correct call.
- **The honest green is a real gap, NOT a tier limit — recorded explicitly so it cannot later be framed as one.** Lens B answered the Leader's question directly: **yes, a unit-tier assertion was available** — `expect(Reflect.getMetadata('imports', ResultsModule)).toContain(ResultInnovationUseModule)`, the exact pattern this spec introduced at T-01 and T-07, needing no DI boot. So "stayed green" is a gap at this tier. It is **not** a spec violation: no T-08 criterion requires it, and R-IUA-013 AC.5 names `entities.module.ts`, discharged at T-07 and verified intact. Severity is also lower than DD-15's — removing this import fails **loudly at boot** (`Nest can't resolve dependencies of the ResultsService`), not silently as a `404`. **T-08 correctly did not let the `results.module.ts` import stand in for the `entities.module.ts` registration**, exactly as T-07's criterion warned.

#### Spec corrections applied at this review

| Document | Correction |
| --- | --- |
| `tasks.md` T-08 *Requirements covered* | Claimed **R-IUA-012 AC.3**, which §3's matrix assigns to **T-12** (verified at source, `tasks.md:680`) and which no T-08 Done criterion carries; T-12 already owns it in its own header and done criteria. Narrowed to **AC.4**. **Third instance of this class** in this spec |
| `tasks.md` T-08 Done criterion 8 | Rewritten per Lens A's exact wording — see the adjudication above |

#### Declared limits, restated so they are not mistaken for proven

Every child service is a `jest.fn()` — **KZ-001's exact double**. Proven: the *calls* are made, once, with the transaction's manager. **Not proven:** that a `result_innovation_use` or `result_ip_rights` row lands, that `is_active = TRUE`, that `created_by` reaches MySQL, that `completness` becomes reachable, or that the section `PATCH` no longer `404`s.

- **Owed to T-12 (F-E):** R-IUA-001 AC.1/AC.2 behaviourally, R-IUA-011 AC.1/AC.4/AC.5 + its scenario's key-set clause, R-IUA-012 AC.1/AC.3.
- **Owed to T-09 (F-A):** R-IUA-001's scenario clause *"a subsequent PATCH succeeds rather than 404"* — named in T-08's own *Verification & its limits*.
- **Owed to T-13:** `npm run test:cov` ≥ 60%, not measured this attempt; two production lines make a regression implausible.

#### `ADVISORY` findings (4R lens — recorded, non-gating, and they do not become tasks)

| # | Lens | Finding | Disposition |
| --- | --- | --- | --- |
| B-1 | **Risk (doc drift introduced by this task)** | `entities.module.spec.ts:25-31`'s docstring now states something **false**: *"`ResultInnovationUseModule` has exactly one incoming graph edge — this assertion."* `results.module.ts:77` is a second edge. **The gate is intact** — the assertion still reddens if the `entities.module.ts` entry is deleted, because it tests direct membership — but the *operational* stake the docstring documents is gone: with two edges, deleting that entry would no longer `404` the endpoints | **Recorded; dies here.** Notably **the drift was caused by the Leader's own instruction** not to touch that file, not by Implementer error — the alternative would have been widening T-08 into T-07's deliverable. Escalated to the user at the gate rather than buried, since a false comment is the class of defect that FAILed T-07 attempt 1. Distinguishable from that case: T-07's comment was false *when written*; this one was true when written and made false by a later approved change — ordinary doc drift |
| B-2 | Reliability | The `results.module.ts` DI edge has **no assertion, and one was available at this tier** (see the adjudication above). A gap, not a tier limit | **Recorded; dies here.** The natural home is **T-09**, which is the first task in this spec that boots real Nest modules — carried as a forward pointer, *not* as an added criterion |
| A-1 | Reliability | The 6×6 negative matrix is one column short: the five pre-existing branch tests gained an `INNOVATION_USE` zero-call line but carry no `KNOWLEDGE_PRODUCT` one. **The single line that matters is present** (`:1459`, the one catching the fall-through), so the gate is sound | Recorded |
| A-2 | Reliability | Criterion 5's "exactly one" for indicators 1 and 2 is `toHaveBeenCalledWith` without `toHaveBeenCalledTimes(1)`. Tightening was correctly avoided as an AC.4 violation; the guarantee rests on a single call site under a boolean guard plus T-12's row-level proof | Recorded |
| A-3 | Readability | The switch-placement rationale is invisible at the call site. A maintainer tidying `createResultType` into numeric order would move the case last and silently retire the `break` coverage. One comment line would preserve it — **deliberately not requested as rework**, since it would enlarge a diff whose smallness is part of its value | Recorded |
| A-4 / B-3 | Risk | `ip_rights`'s absence from `VISUAL_ONLY_GREEN_CHECKS` has no dedicated assertion while `innovation_use`'s does, and R-IUA-011's scenario forbids both. Pre-existing, chunk-1-owned | Recorded |
| B-4 | **Reliability (currently unowned at every tier)** | **Nothing proves `ResultInnovationUseService.create` *honors* the manager it receives.** T-08 proves the manager is passed; T-05's create test calls `service.create(42)` with no manager; and F-E would not expose the difference, since a row written outside the transaction still lands. The code is correct (`result-innovation-use.service.ts:64` uses `selectManager`), but the property is **unasserted at every tier** | **Recorded — the most interesting finding of this round**, because it is invisible to the whole verification strategy rather than to one task. Not actioned: it is out of T-08's scope and no criterion carries it. Carried to `/akili-archive` as Kaizen input, and as a forward pointer to T-09 |

**Final verification:** `npm test -- --silent` → **336 suites / 2264 tests** green · `npx tsc --noEmit` clean · `npx eslint --no-fix` clean — **all re-run independently by the Leader**. `tsconfig.json:19` `noFallthroughCasesInSwitch: false` confirmed at source.

**Forward pointers created by T-08**

| → Task | Pointer |
| --- | --- |
| **T-09 (F-A)** | **Two items, both cheap where T-09 is already going.** (a) T-09 is the first task in this spec that boots real Nest modules; a single `Test.createTestingModule({ imports: [AppModule] }).compile()` smoke suite would permanently close the **DI-invisibility class** — the same class as DD-15, one level down — which is currently why removing the `results.module.ts` import stays green. (b) R-IUA-001's scenario clause *"a subsequent PATCH succeeds rather than 404"* is owed here |
| **T-09 / T-12** | **Advisory B-4:** that `create` *honors* its `manager` is unasserted at every tier, and F-E cannot expose it (a row written outside the transaction still lands). If any tier can bind it cheaply, this is where |
| **T-12 (F-E)** | Owns R-IUA-012 **AC.3** (the header claim removed from T-08 today), plus R-IUA-001 AC.1/AC.2 behaviourally and R-IUA-011 AC.1/AC.4/AC.5 |
| **T-13** | Candidates for its cleanup pass, none of which are added criteria: the `ip_rights` `VISUAL_ONLY_GREEN_CHECKS` assertion, the two `times(1)` tightenings, the `entities.module.spec.ts` docstring drift (B-1), and the switch-placement comment (A-3) |
| Kaizen (archive) | Three candidates: **(a)** advisory B-4 — a property invisible to *every* tier of a verification strategy, which no per-task review can surface; **(b)** insertion-budget reconciliation as a technique for proving a spec was extended and not rewritten, when the reviewer has no `git diff`; **(c)** a Leader instruction not to touch a file can itself create doc drift (B-1) — the narrow-scope instruction and the no-stale-docs rule can conflict, and the conflict should be named at brief time rather than discovered at review |

**Budget status:** **8 of 13 tasks complete.** **15 of ~24 review rounds consumed** (T-01 ×3, T-02 ×1, T-03 ×3, T-04 ×1, T-05 ×1, T-06 ×3, T-07 ×2, T-08 ×1). Five tasks remain against ~9 rounds — and **all five are the DB-dependent ones this spec has never exercised**: T-09's Nest fixture harness (never built in this repo), T-10/T-11/T-12's fixtures against the scratch schema, and T-13's full gate. Everything closed so far has been mocked unit work at ~1.9 rounds/task. The remaining margin is thinner than 5-vs-9 suggests, and the next task is the one that finds out.

### T-09 — Nest fixture harness + **F-A** section round trip

- **Status at the time of this entry:** **`[x]` DONE** — PASS on **attempt 3 of 3**; 3 review rounds. The mechanism worked on attempt 1; all three rounds were spent on *coverage*, not on the harness.
- **Date:** 2026-08-19
- **Implementer attempts run:** 3 (of 3 — the ceiling was reached and not exceeded)
- **Requirements in scope:** R-IUA-002 scenario (behavioural) · R-IUA-003 AC.1, AC.3, AC.6, AC.7 + scenario 2 · R-IUA-007 AC.1, AC.3 · R-IUA-008 AC.1, AC.2 · NFR-IUA-002
- **Skills assigned:** `nestjs-expert`, `systematic-debugging` · **Effort:** `xhigh` → `max` (attempts 2 and 3, per the rework rule)
- **Review mode:** parallel lens Reviewers (2) for attempts 1 and 2; **single Reviewer for attempt 3, a recorded deviation** from `max`'s parallel-lens default — the surface was one file / +20 lines with two narrow questions, and the *Delegation Ceiling* favours one subagent there.

#### Leader environment pre-check (before any spawn)

This is the first task in the spec that writes to a database, so Step 2.2's environment pre-check ran first rather than inside the Implementer.

| Check | Result |
| --- | --- |
| **F-01 safety gate** (`docs/infrastructure.md`: *"A `TEST`-named variable is not evidence of a disposable target"* — on at least one machine `ARI_TEST_MYSQL_*` resolved to the same remote RDS as `ARI_MYSQL_*`) | **PASSED.** Resolved **hosts** compared, not variable names: shared dev DB `192.168.20.210`; TEST `127.0.0.1:3307`, a distinct loopback-bound disposable container. Had they matched, `migration:test:bootstrap` would have loaded a schema over a shared database — a human decision, never the Leader's |
| `docker info` | UP |
| Container | `research_indicators_server_test_mysql` created; MySQL readiness confirmed with `mysqladmin ping --wait=40` (`mysqld is alive`) rather than a blind sleep |
| **`migration:test:bootstrap` run ONCE, by the Leader** | 215 tables, 356 migrations applied. Non-idempotent (FP-49) — a second run yields `ER_TABLE_EXISTS_ERROR`, a stated **disqualifier**, so every brief instructed the Implementer *not* to re-run it |
| `clarisa_innovation_use_levels` | 10 rows, migration-seeded |

**Four facts established by the pre-check that would otherwise each have cost an attempt**, all passed into the brief:

1. **`indicators` is EMPTY (0 rows) while `results.indicator_id` → `indicators` is a real FK** — the single most likely first failure. Also the full child-table FK graph (`clarisa_actor_types`, `clarisa_institutions`, `clarisa_institution_types` ×2, `quantification_roles`, `report_years`, `clarisa_geo_scope`).
2. `actor_roles` and `institution_type_roles` each contained **only id 2** ("innovation-use") — exactly this section's discriminator; `global-setup.ts` adds id 1 via `INSERT IGNORE`.
3. **The task's claim that no fixture in this repo had ever built this mechanism is TRUE** — grep for `createTestingModule` / `TypeOrmModule.forRoot` / `@nestjs/testing` across `test/fixtures/` returned nothing; all seven existing fixtures use the raw `mysql2` driver. **Grep-checked rather than asserted**, after three consecutive rounds in which a Leader brief's claim about repo state had to be corrected by a Reviewer.
4. Bands `900_000`–`900_600` taken, so `900_700` was next — supplied as corroboration only, with FP-45's "read the sibling headers yourself" left binding, because a band collision had already caused a FAIL in this spec family.

#### Attempt 1 — both lenses `STATUS: FAIL`

**Files created:** `test/fixtures/innovation-use/nest-harness.ts` (189) · `…/innovation-use-section-round-trip.fixture-spec.ts` (543). `npm run test:fixtures` → 10 suites / 33 tests.

**The mechanism was ruled real, unhedged, by both lenses — and that is the finding that mattered most, because §10.1 rules the unit tier out of persistence entirely and T-10/T-11/T-12's behavioural proofs all sit at this tier.** Verified at source: the harness overrides **exactly two** providers (`CurrentUserUtil`, `ResultsUtil`), both genuinely necessary since both are request-scoped and `moduleRef.get()` cannot resolve them otherwise; `ResultInnovationUseService`, the three child services and `UpdateDataUtil` are all the **real** classes through Nest DI, pinned by `toBeInstanceOf`. **No raw-SQL fallback crept in** — SQL appears only in seeding, teardown and read-back assertions, which is the legitimate use; raw SQL substituting for the *save* would have been the prohibited fallback in disguise. And the harness structurally **cannot fabricate its own schema**: `orm.config.ts` sets `synchronize: false, migrationsRun: false`, so an empty schema fails loudly on `ER_NO_SUCH_TABLE` rather than passing silently — the disqualifier is cleared structurally, not merely by a green run.

**The FAIL, found independently by both lenses:** Done criterion 4 claims `R-IUA-003 AC.3 + scenario 2`, **`R-IUA-007 AC.3`** and **`R-IUA-008 AC.2`**, and the fixture exercised only the first. It removed **actor B** and nothing else — the organization was resent by id, the quantification resent unchanged. Those are *different algorithms*: organizations reconcile through `ResultInstitutionTypesService.deactivateExistingRecords`; quantifications through `BaseServiceSimple.upsertByCompositeKeys`, which **reactivates** a matching soft-deleted row rather than inserting. Removing an actor proves nothing about either.

**Why that was a gate and not an advisory:** nothing downstream catches it. T-04 defers AC.3 to a fixture; T-10's criteria cover only Innovation Use *actor* rows and Innovation *Dev* rows; and T-10's F-B saves **empty arrays**, taking `upsertByCompositeKeys`'s early-return branch — a different statement entirely. `tasks.md` §3's matrix makes **T-09 the sole owner of R-IUA-008 AC.2**; T-06's header claims it but carries no Done criterion and defers explicitly. So both ACs had **no behavioural gate anywhere in the spec** while T-09's header claimed them — the exact failure DD-16 was minted to prevent.

#### Attempt 2 — split verdict, Leader adjudicated the FAIL as in-scope

Fixture 543 → 691 (+147): two organizations, two quantifications, selective removal of one of each (**not** empty-array, which would take T-10's branch), both halves asserted, plus collection-length assertions on all three collections at both save points.

**Lens 1 (falsifiability): PASS.** The soft-delete assertions genuinely have teeth against a **hard delete** — both read-backs select the dropped row by primary key with **no `is_active` predicate** and gate on `toBeDefined()` before touching a field. It constructed the clean falsifying mutation itself (swap `In(idsToDeactivate)`'s `update` for a `delete`) and confirmed `expect(quant2Row).toBeDefined()` becomes the sole failure. **7 of 8 new assertion halves independently falsifiable**, and the `toBeDefined()` halves pass under the deactivate-removal mutations, so they are not riding along behind the length checks.

**Lens 2 (conformance/regression): FAIL**, on a second and narrower gap — **the organization *update-by-id* audit branch was asserted nowhere in the repository.** `result-institution-types.service.ts:240` spreads `...audit(SetAuditEnum.UPDATE)` inside `buildUpdateData`'s else-branch; the fixture asserted org1's post-save id, type, count and `is_active` but not its audit columns. Lens 2 checked every other tier before calling it: the unit spec mocks `audit` as a fixed return value and contains **no** assertion naming `created_by`, `updated_by` or a `SetAuditEnum` argument; T-04's criteria never mention audit; no sibling fixture reaches the path. **Net effect: deleting that line left the entire suite green.**

**Leader adjudication — in scope, attempt consumed.** Grounded in criterion 5's own corrected text (*"`updated_by` equals it on every row a subsequent save updates by id"*, with both tables named for the NEW branch, establishing table granularity) and in R-IUA-003 AC.6, which §3's matrix assigns T-03/T-09 — T-03 covers actors only, so the organizations half of "updated rows" is T-09's alone. Structurally the same shape as attempt 1's FAIL one level down: the *actor* UPDATE branch standing in for the *organization* UPDATE branch, in a different service and a different helper.

#### Attempt 3 — `STATUS: PASS`

Fixture 691 → 711 (+20). The required org1 update-by-id audit assertion, plus the optional loop reshape of `it` #2's org/quant audit queries (pre-blessed by Lens 2 as *"free to fold in"*), closing org2's and quant2's `created_by`.

**The falsification is the evidence, and the contrast is the point:** deleting `...audit(SetAuditEnum.UPDATE)` from `result-institution-types.service.ts:240` now fails **exactly one test** — `expect(Number(org1Audit.updated_by)).toBe(actingUserId)`, `Expected: 900720, Received: 0` — where before attempt 3 it left the whole suite green. Restored byte-identically; `git diff HEAD -- src/` empty.

The Reviewer verified the failure mode is the one the assertion would actually produce, rather than accepting it: `buildUpdateData`'s else-branch object carries no `created_by`, so that column survives from the `SetAuditEnum.NEW` insert, and with `:240` deleted `updated_by` stays NULL → `Number(null) === 0`. It also confirmed **no accidental green-case coercion** — `Number(900720)` is the only value satisfying the assertion; NULL→0, undefined→NaN and 0 all fail against a non-zero sentinel.

**The reshape strictly widened coverage rather than narrowing it.** The four-way audit discrimination survives intact and independently located — actors and institution-types first insert (`created_by` set, `updated_by` NULL, `SetAuditEnum.NEW`); quantifications first insert (**both** columns, `SetAuditEnum.BOTH`); by-id update (both, actors and org1); untouched actor B (`updated_by` still NULL) — plus the detail row. No assertion was deleted: each reshaped query kept its two per-row expectations and now applies them to **both** rows. Vacuity is closed by `expect(orgAudits.length).toBe(2)` / `expect(quantAudits.length).toBe(2)` **before** the loop, so a missing row fails on the length rather than the loop iterating zero times — the classic vacuous-pass shape, checked for and absent.

#### Spec corrections applied across this task

| Document | Correction |
| --- | --- |
| `design.md` §10.4 + `tasks.md` T-09 implementation note | **The harness sketch could not boot as written.** `ResultInnovationUseService` requires `UpdateDataUtil`, which nothing in `ResultInnovationUseModule`'s subtree provides; only the `@Global()` `GlobalUtilsModule` does, and it is imported once at `AppModule`'s root. The Implementer added it on attempt 1 and was **right** — importing the same global module production relies on makes the harness's DI graph *closer* to production, not a workaround. Ruled a **design-document defect, not grounds for the escalation clause**, which governs an unfixable boot |
| `tasks.md` T-09 Done criterion 5 | Rewritten. The original (*"`created_by` / `updated_by` on written rows equal the stubbed acting user"*) asserts something the code never claims for a first insert — a fresh `result_actors`/`result_institution_types` row carries `updated_by = NULL` because the insert audits `NEW`. Now states the branch structure, and notes both columns are `select: false` on `AuditableEntity` so they can only be read by raw SQL |
| `design.md` §10.3 F-A row | *"add / edit / remove of **each** collection"* narrowed. It was unachievable as written for quantifications: R-IUA-008 makes all three fields the **composite reconciliation key**, so editing any one is definitionally remove-plus-add, and the correct analogue is the unchanged resend F-A does assert. The row now also states the audit obligation at **branch** granularity — insert branch *and* update-by-id branch of each collection — which is exactly the distinction attempt 2's FAIL turned on |

#### A correction to attempt 2's own reported reasoning

Attempt 2 explained its failed third mutation as *"`buildNewData`'s natural-key lookup re-finds and reattaches the same id"*. **That is wrong, and Lens 1 corrected it at source: `processInstitution` branches on the *incoming DTO's* field, not on the built payload, so `buildNewData` is never reached by that mutation.** The real cause of `Field 'result_id' doesn't have a default value` is that **neither `buildUpdateData` branch sets `result_id`**. Recorded so the next reader does not inherit a wrong model of `processInstitution`.

The organization "id unchanged" residual was ruled **benign and structural**: `buildUpdateData` copies the DTO's id verbatim and a delete-and-reinsert cannot silently succeed there, so nothing well-formed can break the assertion while staying green. Accepted rather than engineered around.

#### Declared limits, restated so they are not mistaken for proven

- Nothing about HTTP, auth, the `ServerResponseDto` envelope, `ResultStatusGuard`, Swagger, or the `ValidationPipe` — this fixture calls the service directly, so **no DTO validation runs at all**.
- **`R-IUA-003 AC.7 ("advances") holds only at SECOND granularity in production.** TypeORM's `UpdateQueryBuilder` appends `@UpdateDateColumn` as bare `CURRENT_TIMESTAMP` against a `timestamp(6)` column (upstream `todo`, verified at source). Two saves inside one wall-clock second leave `results.updated_at` unchanged, and the first save after an insert can move it **backwards**. The fixture's 1.1s delay is the correct way to test the requirement — deterministic, since `floor(T+1.1) > floor(T)` for all `T` — but **the residual is a real product-observable property no gate now covers.**
- **Owed to T-10 (F-B):** R-IUA-009 AC.1–AC.4 + scenario (no Innovation Dev row is seeded here), R-IUA-007 AC.4, R-IUA-008 AC.3.
- **Owed to T-11 (F-C/F-D):** R-IUA-006 AC.1–AC.4 behaviourally — this fixture saves catalog `id 7` *with* a valid explanation, so it cannot discriminate the `id 6`/`id 7` pair. R-IUA-010 AC.3, declared weak by construction.
- **Owed to T-12 (F-E):** R-IUA-001 AC.1/AC.2 behaviourally, R-IUA-011 AC.1/AC.4/AC.5 + key-set clause, R-IUA-012 AC.1/AC.3.
- **Owed to T-13:** NFR-IUA-001, NFR-IUA-003 coverage, the human `/swagger` check, the C-4 sweep, and the mandatory **double** consecutive fixture run.
- **Two properties still unowned at every tier** *(named, not deferred — no task carries either)*: **(a) DD-14's partial-PATCH contract behaviourally** — both DTOs here send all five keys, so neither arm of `key present ? payload : stored` is exercised, and `!== undefined` vs `??` remains gated only by mocked unit specs; **(b) that `create` honors the `manager` it receives** (T-08 advisory B-4) — `it` #1 calls `create(resultId)` with no manager, so `selectManager`'s manager arm is unasserted. Lens B noted this tier **could** have bound (b) in ~6 lines via a deliberately rolled-back transaction; it was not a T-09 criterion, so it did not gate.

#### `ADVISORY` findings (recorded, non-gating, and they do not become tasks)

| Lens | Finding | Disposition |
| --- | --- | --- |
| **Risk — production code, confirmed at source by two independent Reviewers** | **`buildUpdateData` returns a caller-supplied `result_institution_type_id` with no `result_id` and no ownership check anywhere in `customSaveInnovationUse`/`processInstitution`.** A payload carrying **another result's** row id updates that foreign row in place — role, institution type, `organization_count`, `is_active: true`, `updated_by` — while its `result_id` still points elsewhere. **Shared with `customSaveInnovationDev`, so it is a pre-existing platform defect, not one this spec introduced.** Note it is the *absence* of `result_id` that also prevents any organization mutation from failing cleanly | **Recorded; dies here.** R-IUA-009 **AC.3** already covers it (*"saving the section on result A does not touch any row belonging to result B"*) and **T-10 owns it** — but T-10's Scope as written seeds two results and saves only **empty arrays**, which never reaches this branch. **Carried as a forward pointer to T-10**, and escalated to the user at the gate |
| Resilience | `afterAll` runs 9–11 **unguarded** `DELETE`s before `harness.close()`; +147 lines added two more. One throw mid-teardown leaks the Nest-managed connection *and* orphans the private `reporting_platforms` row. The sibling `innovation-dev-lifecycle-routines-unchanged.fixture-spec.ts` already has a `tryStep` helper for exactly this; moving `close()` into a `finally` is one line | Recorded. One degree worse than attempt 1, same in kind. Natural home is T-13's cleanup |
| Reliability | The DD-9 resolved `innovation_use_level` scalar is never asserted. This is the one fixture that could prove the family's signature `id = level + 1` trap on the **read** side against the real migration-seeded catalog (T-11 proves only the write side). One line | Recorded |
| Readability / KZ-005 | The header's reserved-value sweep is complete on the band axis but omits `sp-versioning-objective-blocks`'s year **2094**. The chosen 2109 collides with nothing, so documentation gap, not defect — but the next author reading the header *as the registry* inherits an incomplete list, which is FP-45's failure mode restated | Recorded |
| Readability | The two 1.1s waits and their TypeORM rationale are the clearest explanation of that trap anywhere in the repo. Worth lifting into the harness before T-10 copy-pastes it a third time | Recorded |
| Risk | The fixture depends on intra-file `it` ordering (ids captured in #2, consumed in #3), guarded correctly — the precondition assertions redden rather than pass vacuously. Worth keeping as the documented pattern for T-10/T-11/T-12 | Recorded |

**Final verification:** `npm run test:fixtures` → **10 suites / 33 tests all passing** · `git diff HEAD -- server/researchindicators/src/` **empty** · container up and bootstrapped **once** — all re-run independently by the Leader at each attempt, not relayed.

**Forward pointers created by T-09**

| → Task | Pointer |
| --- | --- |
| **T-10 (F-B)** | **Three items.** (a) **The A-6 defect above** — R-IUA-009 AC.3 is T-10's, and T-10's Scope as written (two results, **empty-array** saves) does not reach the id-present branch. Add the case explicitly: seed result 2 with an Innovation Use organization row and submit its `result_institution_type_id` inside result 1's payload. (b) T-10's empty-array saves take `upsertByCompositeKeys`'s early-return branch — a **different statement** from the `In(idsToDeactivate)` branch T-09 now gates; do not read one as covering the other. (c) The 1.1s second-boundary guard will be needed again if T-10 asserts timestamps — lift it rather than copy it |
| **T-11 (F-C)** | F-A saves catalog `id 7` **with** a valid explanation, so it exercises the accept side only and **cannot** discriminate the `id 6`/`id 7` pair. That discrimination is entirely T-11's, and it is the family's signature trap |
| **T-12 (F-E)** | **A blocker to resolve before starting, not during.** `indicators` is **EMPTY** on the scratch schema while `results.indicator_id` is a real FK. F-A sidesteps it legitimately (nullable; no path it exercises reads it), but F-E **must** create an `indicator_id = 6` result through `ResultsService`. That needs `indicators` id 6 seeded — a **cross-file shared catalog row of exactly the class `global-setup.ts` owns**, so decide ownership (global-setup vs per-file) up front rather than discovering it as an `ER_NO_REFERENCED_ROW` mid-task. Also the natural owner for T-08's advisory B-4, since F-E drives `createResultType` inside its real transaction |
| **T-13** | Candidates for the cleanup pass, none of them added criteria: the `afterAll` `tryStep`/`finally` guarding, the DD-9 read-side level assertion, the header's missing year 2094, and lifting the 1.1s helper |
| Kaizen (archive) | Four candidates: **(a)** a Leader environment pre-check that resolves FK-graph facts up front converted the most failure-prone task in the spec into three coverage rounds with **zero** environment failures — the pre-check is the highest-leverage Leader action found so far; **(b)** *the mechanism working is not the mechanism proving anything* — all three T-09 rounds were coverage, none was the harness; **(c)** a Reviewer correcting the *Implementer's stated cause* for its own failed mutation (the `buildNewData` misattribution) is a distinct review value beyond pass/fail; **(d)** an assertion can be *structurally unfalsifiable and still correct* (the org id residual) — "unfalsified" and "weak" are not synonyms, and conflating them would have spent the last attempt on nothing |

**Budget status:** **9 of 13 tasks complete.** **18 of ~24 review rounds consumed** (T-01 ×3, T-02 ×1, T-03 ×3, T-04 ×1, T-05 ×1, T-06 ×3, T-07 ×2, T-08 ×1, T-09 ×3). Four tasks remain against ~6 rounds. **The harness risk — the single largest unknown in this spec — is now retired**, and T-10/T-11/T-12 all reuse it, which is the strongest reason to expect the remaining tasks to cost less per task than T-09 did. Against that: T-12 carries the `indicators` blocker above, and T-13 is a full-gate task with a human check. Reported at the gate, not deferred.

### T-10 — **F-B** role isolation

- **Status at the time of this entry:** `[~]` **PIVOT** — blocked on a **confirmed product defect**, not on implementation quality. The fixture is complete and correct; **2 of its 7 tests fail because the code does not have the property R-IUA-009 AC.3 asserts.** The rework loop was stopped with 2 of 3 attempts unspent, because no attempt can make this green without changing production code that no task in this spec authorizes.
- **Date:** 2026-08-19
- **Implementer attempts run:** 1
- **Requirements in scope:** R-IUA-009 (all ACs + scenario) · R-IUA-007 AC.4 · R-IUA-008 AC.3
- **Skills assigned:** `nestjs-expert`, `systematic-debugging` · **Effort:** `xhigh`
- **File created:** `test/fixtures/innovation-use/innovation-use-role-isolation.fixture-spec.ts` (710 lines), band `900_800`, year `2110`, platform `T10IUFB`
- **Suite:** `npm run test:fixtures` → **11 suites / 40 tests; 2 failed, 38 passed.** All ten sibling suites still pass unchanged.

#### What the fixture proved — role isolation HOLDS

**Every role-discriminator assertion passed, including the falsification the spec calls its most important.** This is the reassuring half and it is worth stating first: the three deactivate predicates do scope by role, and MySQL leaves Innovation Dev alone.

| Falsifying mutation | Observed |
| --- | --- |
| Remove `actor_role_id` from `result-actors.service.ts`'s `customSaveInnovationUse` deactivate predicate | **red** — Innovation Dev actor rows flipped inactive, as predicted |
| Remove `institution_type_role_id` from `result-institution-types.service.ts`'s `deactivateExistingRecords` | **red** — Dev organization rows flipped; actor and quantification checks stayed green |
| Remove role scoping from the quantification deactivate path | **red** — role-1/role-2 quantification rows flipped; actor and organization checks stayed green |

All restored; `git diff HEAD -- src/` **empty**, Leader-verified. R-IUA-009's scenario clause `BUT it must NOT rely on "a result has one indicator" as the reason it is safe` is discharged: the fixture seeds a result carrying **both** indicators' rows in all three shared tables, a state that assumption forbids, and the role scoping is still correct.

**Zero-finding line (KZ-007, all three tables named):** `result_actors` — Dev row byte-identical after both saves. `result_institution_types` — Dev row byte-identical after both saves. `result_quantifications` — roles 1 and 2 byte-identical after both saves. **No differences in any of the three on the role axis.**

#### The blocker — R-IUA-009 AC.3 is false of the code, confirmed against real MySQL

The second save submits **result 2's row ids inside result 1's payload**. Result 1's save then overwrote result 2's rows. Leader-verified by direct run, values quoted from the failure output:

```
result 2's result_actors row
-   "actor_type_id": 900853,      -   "actors_count": 900882,
+   "actor_type_id": 900854,      +   "actors_count": 900883,
```

`result_id` still points at **result 2**. The same happened to `result_institution_types` (`institution_type_id` and `organization_count` overwritten). So a caller saving the Innovation Use section on result 1 can silently rewrite another result's rows — role, type, count, `is_active: true`, `updated_by` — by supplying their primary keys.

**Root cause, confirmed at source by two independent Reviewers during T-09 and now empirically:** `result-actors.service.ts`'s `result_actors_id`-present branch and `result-institution-types.service.ts`'s `buildUpdateData` (**both** branches) build their save payload from a **caller-supplied primary key with no `result_id` and no ownership check anywhere** in `customSaveInnovationUse` / `processInstitution`.

**`result_quantifications` is structurally immune** and the contrast is instructive: `upsertByCompositeKeys` never reads a caller-supplied `id`. It matches only on `(quantification_number, unit, description)` **scoped to the calling `result_id`**, so the attack payload's `id` is ignored and the submission lands as a new row for result 1. The generic base-service algorithm is safe; the two hand-written ones are not.

**Scope of the defect — wider than this spec:** both id-present branches are **shared with `customSaveInnovationDev`**, which is live in production today. This is **pre-existing platform behaviour that this spec did not introduce** — chunk 1 and the Innovation Dev section have the same exposure. This task's contribution is that it is now *proven* rather than inferred.

**Why this is a Pivot and not a rework.** The three remaining attempts cannot close it. Making the suite green requires either (a) changing shared production code that no task in this spec authorizes and whose blast radius includes Innovation Dev, or (b) weakening an assertion that is correctly asserting an approved AC. The Implementer was explicitly instructed not to do (b) and did not — it reported and stopped, which is the correct behaviour and the reason the finding exists at all.

#### Options put to the user

| Option | Assessment |
| --- | --- |
| **A. Fix the ownership check in this spec** | Add `result_id` scoping to both id-present branches so a submitted row id is only honoured when it belongs to the calling result. Closes a real vulnerability and makes T-10 green by making AC.3 true. **Costs:** touches shared code used by `customSaveInnovationDev`, so it needs its own review round and a regression argument for the Innovation Dev section; and it is production work outside T-10's stated *Files touched*. **Recommended if the vulnerability is to be closed now.** |
| **B. Quarantine the two assertions, keep the finding** | Mark them as expected-failing with the defect recorded inline and in `execution.md`, so the suite returns to green and T-11/T-12 proceed unblocked. **Honest only if the marker is unmistakable** — a skipped test is a known-bug marker, not coverage. Preserves the evidence without claiming the property holds. **Recommended if the fix should be a separate, properly-scoped change.** |
| **C. Narrow R-IUA-009 AC.3** | Reduce the AC to what the code actually guarantees (role isolation, which is proven) and record the cross-result exposure as an explicit out-of-scope defect with a follow-up proposal. **Rejected as a default:** it retires a true requirement to match a defect, and the next reader sees an AC that was met rather than a vulnerability that was deferred. Viable only as a deliberate, recorded decision. |
| **D. Fix it as its own spec** | Cleanest boundary — the defect is platform-wide, not Innovation-Use-specific, so a dedicated change with its own requirements and regression proof for both sections is arguably where it belongs. Leaves this spec blocked on B in the meantime. |

**No ADR is overturned.** This is a missing authorization check, not an architecture decision.

#### The suite is committed red, deliberately

`design.md` §10.6 establishes the fixture suite as a **local Docker gate, not CI**, so a red fixture blocks no pipeline. Committing it preserves 710 lines of correct work plus the evidence, and the red state is the *accurate* state of the world: the code has this defect. T-11 and T-12 can still distinguish these two known failures from new ones. **Left uncommitted, the finding would be the easiest thing in this spec to lose.**

#### Environment finding — worth tracking, not this task's to fix

`quantification_roles` ids **1 and 2** (`actual_count`, `extrapolate_estimates`) were **absent** from the scratch schema despite being migration-seeded, with only id 3 present and `AUTO_INCREMENT=4`. The Implementer self-healed with an idempotent `INSERT IGNORE`, following `global-setup.ts`'s own precedent for `actor_roles`/`institution_type_roles` id 1, and never tore them down. **This is the third instance of the same class**: the committed baseline captured DDL but not seed rows — see `indicators` (empty, blocking T-12) and `global-setup.ts`'s own FP-16 note. Recommend `/akili-archive` route it to the baseline snapshot's owner rather than accreting per-file `INSERT IGNORE` patches.

#### Declared limits

Nothing about HTTP, auth, the envelope, or the `ValidationPipe` — the fixture calls the service directly. The 1.1s second-boundary guard was **not** needed, correctly: these assertions are "no change occurred", not "a value advanced", so there is no truncated-precision race. *(Incidentally, the failure output confirms T-09's TypeORM finding independently: `updated_at` went `…01.632Z` → `…01.000Z`, second-truncated.)* Save #1 exercises `upsertByCompositeKeys`'s **early-return** branch; save #2 exercises its **create-new** branch — neither is the `In(idsToDeactivate)` branch T-09 gated, per T-09's forward pointer (b).

**Budget status:** 9 of 13 tasks complete, **T-10 `[~]`**. **19 of ~24 review rounds consumed** — this task consumed one round as a Pivot without a Reviewer spawn, since the blocker is a product defect the Implementer proved, not a conformance question a Reviewer adjudicates.

### T-11 — **F-C** level boundary + **F-D** catalog order

- **Status at the time of this entry:** **`[x]` DONE** — PASS on **attempt 2 of 3**; 2 review rounds. **Both fixtures were behaviourally correct on attempt 1**; the FAIL was a factually impossible claim in a durable comment, whose root cause was the spec.
- **Date:** 2026-08-19
- **Implementer attempts run:** 2
- **Requirements in scope:** R-IUA-006 AC.1–AC.4 + scenario (behavioural) · R-IUA-010 AC.3
- **Skills assigned:** `nestjs-expert`, `systematic-debugging` · **Effort:** `xhigh` → `high` (attempt 2 was a one-paragraph comment fix)
- **Review mode:** parallel lens Reviewers (2) for attempt 1; **single Reviewer for attempt 2, a recorded deviation** — the change was one doc-comment paragraph and both substantive lenses had already passed everything else.

#### Files delivered

| File | Lines | Nature |
| --- | --- | --- |
| `test/fixtures/innovation-use/innovation-use-level-boundary.fixture-spec.ts` | 248 | new (F-C) |
| `test/fixtures/innovation-use/innovation-use-catalog-order.fixture-spec.ts` | 77 | new (F-D) |
| `test/fixtures/innovation-use/nest-harness.ts` | 189 → 249 (**+60 / −0**) | extended — `createClarisaInnovationUseLevelsHarness`, because `ClarisaInnovationUseLevelsService` is exported only by the CLARISA control-list module and is **unreachable** from `ResultInnovationUseModule`'s subtree |

**Suite: 13 suites / 44 tests — 2 failed, 42 passed.** The 2 failures are **T-10's** committed product-defect failures; the count was 2 before this task and 2 after, verified at every step.

#### The harness extension — the risk that did not materialise

`nest-harness.ts` now has **three** consumers (F-A, F-B, F-C), so a shared-file edit was the blast-radius concern (KZ-003). Lens A verified it is additive in **behaviour**, not merely in line count: `createInnovationUseHarness` unchanged (same three imports, same two overrides, same `.compile()` → `.init()`); **`StubCurrentUserUtil` reused unchanged**, its `audit()` switch still replicating the real `CurrentUserUtil` verbatim — so F-A's and F-B's audit assertions are untouched; no shared state, each entry point building and closing its own `TestingModule` and `DataSource`. It also confirmed the extension was **necessary** rather than convenient, and that the single override is not a silent no-op (`CurrentUserUtil` does reach the graph via `GlobalUtilsModule`, and the catalog controller takes no `ResultsUtil`).

#### What F-C proves, and why the pair is one test body

Leader-verified in the scratch catalog before dispatch: 10 rows, `id = level + 1`, **`id 6` → level 5**, **`id 7` → level 6**. *(Also `id 3` and `id 4` are both named "Partners" — adjacent levels sharing a name, which is why T-01 forbade name-based lookup.)*

Half A (`id 6`, no explanation) must **accept** and is deliberately **not** wrapped in try/catch, so an inversion aborts the whole body as a **single** red. Half B (`id 7`, no explanation) must **reject**, and its assertion constrains the message to name `innovation_use_level_explanation` — so it cannot pass for the wrong reason. Lens B confirmed the only other reachable pre-`BEGIN` `400` (`unknown innovation use level`) cannot fire for `id 7` and does not contain that substring. Half B additionally asserts `innovation_use_level_id IS NULL` afterwards, an unclaimed extra discharge of §5.1's validate-before-`BEGIN` ordering.

**FP-48's inversion was honoured** — the subtlest instruction in the task. Validation fixtures need **literal domain values**, not sentinels, because several predicates compare against `TRUE`/`1` and a sentinel of `2`–`6` in a boolean-ish column silently takes the false branch. Lens B swept for it and found none: level ids are the literal catalog ids, explanations are the literal `undefined` / `'   '` / `''`, and the only sentinel-shaped values (`900_900`, `2111`, `T11IULB`) are **identifiers nothing predicates on**.

#### The FAIL — a falsifier stated as impossible fact, and the spec was the cause

Attempt 1's header read: *"`id 7` (level 6) no longer needs one and the reject assertion fails. **Both halves go red together, which is the point.**"*

**That is arithmetically impossible.** Substituting the FK for the resolved level gives `6 >= 6 → throw` (half A reddens — correct) and `7 >= 6 → still throws` (half B **stays green**). A single monotone threshold on a monotone key moves the boundary one direction only.

**Both lenses found it independently**, and Lens B named the consequence that makes it a gate rather than a wording nit: the header tells a maintainer that **half B** is falsified by the FK defect. It is not. A reader trusting it could delete half A as "redundant with half B" — removing **the only assertion in the repo that catches trap 2**.

**Chain of custody, recorded because it is the interesting part.** `requirements.md` R-IUA-006's scenario stated it **correctly** from specify time (*"a rule comparing the FK passes the second case and fails the first"*). `tasks.md` T-11's *Verification & its limits* and `design.md` §10.3's F-C row both drifted to *"the pair inverts / both assertions fail"*. **The Leader then repeated the drifted claim verbatim in the dispatch brief without checking the arithmetic**, and the Implementer wrote it into the fixture header as observed fact. Four documents deep, in the one task whose entire subject is an off-by-one. The Implementer's own *report* was accurate — it described one red result — so only the durable comment carried the falsehood.

**Corrections applied, with the two-direction sweep (KZ-005):**

| Document | Correction |
| --- | --- |
| `tasks.md` T-11 *Verification & its limits* | Rewritten to Lens A's exact wording: the accept half reddens, the reject half stays green because `7 >= 6` still throws, that asymmetry is *why* both halves share one body, and half B guards the opposite mutation class (rule dropped, or threshold `> 6`/`>= 7`) |
| `design.md` §10.3 F-C row | *"the pair inverts"* → *"the accept half (`id 6`/level 5) inverts; the reject half stays green"* |
| `innovation-use-level-boundary.fixture-spec.ts` header | Attempt 2's one-paragraph rewrite, verified factually correct against the code and consistent with both corrected documents |
| `tasks.md` T-11, again | **The correction's own claim was itself over-broad and was scoped at attempt 2's review**: "both halves cannot redden" holds for the **threshold class**, but a mutation *inverting the comparison direction* (`level < 6 → throw`) would redden both. Recorded because an over-broad claim introduced by the fix for an over-broad claim is worth naming |

The sweep also surfaced a structurally similar statement in **T-12**'s *Verification* (*"omit the `ipAvailables` edit → … both assertions fail"*). That one is **plausibly correct** — no IP Rights row and `completness` is causally downstream, so both genuinely can fail — but it will be verified rather than assumed when T-12 runs.

#### F-D — green, and green proves nothing

F-D is **green** and that is explicitly **not** evidence that ordering is guaranteed. The Implementer ran the mutation and reported the result honestly: **deleting T-01's `findAll()` `order: { level: 'ASC' }` override leaves F-D green**, because `id = level + 1` makes primary-key order coincidentally correct on the current seed. Both lenses verified the claim at source — `ControlListBaseService.findAll()` is the override minus the `order` key — and confirmed the honesty statement is **accurate and complete**, including that T-01's unit gate is *itself* only a presence assertion over a mocked `find(...)`. **So no tier behaviourally guarantees catalog ordering**, and both gates are presence assertions. F-D is kept as a **seed-shape tripwire**: Lens B noted its keep-reason is discharged by the `idValues` assertion rather than the `levelValues` one, so a future re-seed breaking the coincidence reddens it whether the production code is right or wrong — forcing a human to re-read the file, which is the honest value on offer rather than a correctness gate.

#### Falsification table (attempt 1; attempt 2 required none)

| Mutation | Expected | Observed |
| --- | --- | --- |
| `resolveInnovationUseLevel` returns the FK instead of `Number(row.level)` | accept half reddens; whole `it` goes red as one | **confirmed** — the whitespace/empty tests stayed green (different code path) |
| `validateLevelExplanation`'s guard narrowed to `undefined \|\| null` | AC.3/AC.4 go red | **confirmed** — both `it`s failed; halves A/B unaffected, so the two are independently load-bearing |
| T-01's `findAll()` `order` override deleted | **F-D stays GREEN** | **confirmed** — the direct evidence for the declared-weakness statement |

`git diff HEAD -- server/researchindicators/src/` **empty** after all three, Leader-verified.

#### Declared limits

Both fixtures call the service/provider directly — nothing about HTTP, auth, the `ServerResponseDto` envelope, `ResultStatusGuard`, Swagger, or the per-handler `ValidationPipe` (trap 1 / DD-8). **DD-14 is neither gated nor contradicted**: halves A/B omit the explanation key so DD-14's stored-value fallback resolves to the same `null` the payload branch would supply, making the rejection invariant to the `!== undefined` vs `??` distinction; AC.3/AC.4 send the key present, so both branches are traversed incidentally. **R-IUA-006 AC.5 remains T-06's** (mocked), and the behavioural proof of DD-14 remains **unowned at every tier** — unchanged from T-09. Owed to **T-12**: R-IUA-001 AC.1/AC.2, R-IUA-011 AC.1/AC.4/AC.5 + scenario, R-IUA-012 AC.1/AC.3. Owed to **T-13**: R-IUA-010 AC.1/AC.2/AC.5 at `/swagger` by a human, C-4 cleanup, NFR-IUA-001 at 50 actor rows, NFR-IUA-003 coverage, and the full double-run gate.

#### `ADVISORY` findings (recorded, non-gating, and they do not become tasks)

| Lens | Finding | Disposition |
| --- | --- | --- |
| Reliability | AC.3/AC.4 assert only `rejects.toThrow(BadRequestException)`, where half B thirty lines up additionally constrains the message. Sound today because no other reachable `400` can fire for `id 7` — but nothing pins that | **Recorded; explicitly NOT actioned.** Attempt 2's brief forbade folding it in — an advisory never widens an approved task, and doing so would have turned a one-paragraph fix into a re-review of passed work |
| Reliability | **F-D's `Number(row.level)` coercion** — `Number(null) === 0`, exactly `expected[0]`, so a re-seed nulling the level-0 row's `level` would pass vacuously. It also makes F-D accept a string `'5'` where F-C's `toBe(5)` asserts a real number: **the two fixtures disagree about the driver contract, and F-D is the weaker one.** An *undeclared* KZ-001 instance | **Recorded; not actioned.** The strongest advisory of this round |
| Resilience | A tab or `' '` explanation would pin `trim()` semantics against a plausible narrower reimplementation (`replace(/ /g,'')`); three spaces cannot distinguish that. *(Lens B confirmed there is no regex — the check is `explanation.trim().length === 0`, so all whitespace classes take the identical branch today)* | Recorded |
| Reliability | F-C's `afterAll` runs unguarded `DELETE`s before `harness.close()` — the same pattern already recorded at T-09 and routed to T-13 | Recorded |
| Risk | `resolveInnovationUseLevel`'s doc-comment claims `level` arrives as a **string** because it is `bigint`, but `orm.config.ts` sets `bigNumberStrings: false`, so mysql2 returns a JS **number**. The assertion is correct today; the comment is not — and if that flag is ever flipped, F-C's `toBe(5)` is what catches it. Pre-existing, not introduced here | Recorded — T-13 note |
| Readability | F-D passes `901_000` as its acting-user id, outside any declared band, while its header says it reserves none. Harmless (`findAll()` persists nothing) but an undeclared magic number in an otherwise scrupulous header | Recorded |

**Final verification:** `npm run test:fixtures` → **13 suites / 44 tests, 2 failed (T-10's), 42 passed** · `git diff HEAD -- src/` **empty** — both re-run independently by the Leader at each attempt.

**Forward pointers created by T-11**

| → Task | Pointer |
| --- | --- |
| **T-12** | **Verify, do not assume, its *Verification* line** *"omit the `ipAvailables` edit → … both assertions fail"*. It is plausibly correct (the IP Rights row and `completness` are causally chained, unlike a monotone threshold) — but the identical phrasing was arithmetically false at T-11, so check it before writing it into a durable comment. Also: `indicators` is still **EMPTY** with a real FK on `results.indicator_id`, and T-12 must create an `indicator_id = 6` result — the seed-ownership question is still open |
| **T-13** | Cleanup candidates, none of them added criteria: the `afterAll` `finally` guarding (now in three fixtures), F-D's `Number()` coercion, AC.3/AC.4's message constraints, `resolveInnovationUseLevel`'s wrong doc-comment about the driver contract, and F-D's undeclared `901_000`. Also **R-IUA-010 AC.4's ordering has no behavioural gate at any tier** — the human `/swagger` check is the last opportunity to look at it |
| Kaizen (archive) | Two candidates: **(a)** a false claim can propagate **four documents deep** — requirements → tasks → design → Leader brief → delivered comment — while the one document that had it right sits untouched; the two-direction sweep is what finds it, and grepping the *corrected* phrase is what surfaces the drifted siblings. **(b)** The fix for an over-broad claim was itself over-broad (the "both halves cannot redden" scoping), which suggests correction wording deserves the same falsifiability check as the code it describes |

**Budget status:** **11 of 13 tasks complete** (T-10 `[~]`). **21 of ~24 review rounds consumed** (T-01 ×3, T-02 ×1, T-03 ×3, T-04 ×1, T-05 ×1, T-06 ×3, T-07 ×2, T-08 ×1, T-09 ×3, T-10 ×1, T-11 ×2). **Two tasks remain against ~3 rounds, and T-13 is a full-gate task carrying a human `/swagger` check that cannot be automated.** This is the tightest the margin has been and is reported as such at the gate, not absorbed.

### T-12 — **F-E** result creation + green-check reachability

- **Status at the time of this entry:** **`[x]` DONE** — **PASS on attempt 1, zero rework**; 1 review round (2 parallel lens Reviewers, both PASS).
- **Date:** 2026-08-19
- **Implementer attempts run:** 1
- **Requirements in scope:** R-IUA-001 AC.1, AC.2 (behavioural) · R-IUA-011 AC.1, AC.4, AC.5 + scenario · R-IUA-012 AC.1, AC.3
- **Skills assigned:** `nestjs-expert`, `systematic-debugging` · **Effort:** `xhigh`
- **File created:** `test/fixtures/innovation-use/innovation-use-result-creation.fixture-spec.ts` (**718 lines**), band `901_000`, year `2112`, platform `T12IURC`
- **Suite:** 13/44 → **14 suites / 48 tests — 2 failed, 46 passed.** The 2 are **T-10's** committed product-defect failures; count unchanged, verified before and after.

#### Leader environment research that shaped the task (before dispatch)

Three findings, none of them in the spec, each of which would have cost an attempt:

1. **There is no `green_checks` table.** Green checks are computed by **stored SQL functions** — `SELECT intellectual_property_validation(?)` and siblings. A query for `%green%` tables returns nothing, so an Implementer discovering this mid-task would first conclude the schema was broken. Chunk 1's `green-check-ip-rights.fixture-spec.ts` was pointed at as the working exemplar.
2. **Seeding an indicator is a two-level FK chain, both levels empty:** `indicators` (0 rows) needs a NOT-NULL `indicator_type_id` → `indicator_types` (0 rows).
3. **Chunk 1 had already documented the tension and taken a shortcut that would not transfer** — it left `indicator_id` NULL because *its* function never branches on it. T-12's criterion is a claim about how the key set **varies by indicator**, so the shortcut had to be re-examined rather than inherited. Both routes were given with the deciding test (read `green-checks.repository.ts` at source) and the decision required in the report.

**On the seed-ownership question the user left open, the Leader took the established pattern rather than stalling:** idempotent `INSERT IGNORE`, never torn down, exactly as T-10 did for `quantification_roles` 1–2 and as `global-setup.ts` itself does for the role tables. `global-setup.ts` untouched.

#### The doubles — legitimate, and the Reviewer supplied a reusable test rather than a verdict

`ResultsService` has ~36 constructor dependencies reaching live RabbitMQ, CLARISA, Agresso and OpenSearch. Full Nest DI was impractical; raw inserts would have left the two mandated `createResultType` mutations biting nothing. The Implementer used `Object.create(ResultsService.prototype)` populated with only the two collaborators the indicator-6 path reads (`_resultInnovationUseService`, `_resultIpRightsService`), both **real, DB-backed** instances from a genuine `TestingModule`, so the unmodified method body executes verbatim. Same technique for a `GreenChecksService` partial calling the real `findByResultId`.

**Lens A ruled it legitimate by mechanism, not by report**, and the decisive facts are worth keeping:

- **`ResultsService`'s constructor body is EMPTY** (38 parameter properties, `) {}`). There is no initialisation to lose by bypassing it.
- `createResultType` reads **exactly two** members of `this` on the indicator-6 path; `ipAvailables` is a function-local `const`, not a field. The ~36 absent members are **unreachable for this input**, not merely unused.
- The failure mode of a future edit is **loud**: `this._x.create(...)` on `undefined` throws `TypeError` and reddens. No branch on that path can silently no-op.
- `findByResultId` reads only `this.greenCheckRepository`; that constructor's body builds only submission-history repositories the method never touches, so `undefined as never` is honest rather than lucky.

**The reusable rule, recorded because it is the transferable part and not the trick:** a constructor-bypassing partial is legitimate exactly when three conditions are **checked at source** — (a) the constructor performs no initialisation the target method depends on; (b) the set of `this` members the method reads on the exercised input is enumerable, finite, and every one populated with a **real** instance; (c) an omission fails loudly rather than no-opping. When any cannot be shown, the partial degrades into KZ-001's stand-in.

#### `completness` both ways, and why the `true` half is not vacuous

This was the Leader's central worry: reaching `completness: true` needs **five other validation functions** to pass, none Innovation-Use-specific, and two were satisfied by **built-in bypasses** (`geo_scope_id IN (1,50)`, `is_partner_not_applicable`). A `true` reached by bypasses without the Innovation Use term ever being consulted would satisfy the assertion while proving nothing — the exact "the gate is gone" failure the task names.

**Lens B closed it at source.** The composite is a **JS fold** (`green-checks.service.ts:62-69`: `completness = completness && greenChecks[key]` over every returned key, skipping only the single-entry `VISUAL_ONLY_GREEN_CHECKS`) — **not** a SQL function. So the stored-function bypasses satisfy only their own terms and cannot short-circuit the AND, and both are legitimate production "section complete" states rather than test-only escapes. `innovation_use_validation` sits unconditionally in the `SELECT` list for indicator 6 (`green-checks.repository.ts:97-98`). Therefore a true fold **entails** the Innovation Use term was consulted.

**And there is a positive counter-witness**: the third scenario holds the other seven terms true with `innovation_use` false and observes `completness` false. Dependence is demonstrated in both directions, not argued.

**AC.5's precondition is non-vacuous by construction rather than by enumeration:** the only mutation between the two checkpoints is the IP Rights save, and none of the five other validations reads `result_ip_rights`, so the after-checkpoint's `true` retroactively proves all five were already true at the before-checkpoint. Pairing both halves in one `it` is what makes that inference available — T-11's F-C discipline, correctly reused.

#### A mandated falsification did not bite, and the Implementer fixed the test rather than the claim

Adding `innovation_use` to `VISUAL_ONLY_GREEN_CHECKS` left the first `completness: false` checkpoint green. **Diagnosis verified correct by both lenses:** at that checkpoint the false state is produced by `ip_rights` being incomplete — which **AC.5's own wording requires** ("complete everything *except* IP Rights") — so dropping `innovation_use` from the AND changes nothing there. The Implementer added a third scenario (all complete **except** `innovation_use`, with `ip_rights` complete) so the mutation has a biting assertion, and both lenses confirmed it reddens.

**Ruled in scope**, and the reasoning matters: T-12's *Requirements covered* claims R-IUA-011's scenario, which contains `BUT it must NOT make ip_rights non-blocking by adding innovation_use or ip_rights to VISUAL_ONLY_GREEN_CHECKS`. At `HEAD` that clause was gated **only by T-08's `grep`** — a presence check, the KZ-001 shape. The new scenario converts it into a behavioural gate, so it serves a clause the task already claimed rather than inventing scope.

**This is the second spec-stated falsification in this spec that did not hold as written** (after T-11's arithmetically impossible one) — and unlike T-11, it was caught by the Implementer and closed by strengthening the test. It also **closes T-11's open sweep question**: T-12's *other* mandated falsification (drop `INNOVATION_USE` from `ipAvailables`) **does** hold, reddening both the row-count assertion and the after-checkpoint while the before-checkpoint stays green.

#### Route (a) was not merely better — route (b) was impossible

The Implementer seeded real `indicators` rows 2 and 6 because `calculateGreenChecks` switches on `results.indicator_id`. **Lens A found independent corroboration the report did not mention:** `general_information_validation` carries `AND r.indicator_id IS NOT NULL` in its `WHERE`, so a NULL-indicator result **can never reach `completness: true` at all.** Route (a) was load-bearing twice over.

The indicator-2 control is a **real** `indicator_id = 2` row, compared as an **exact 9-key set** via `Object.keys(...).sort()` + `toEqual` — the object-level analogue of a whole-row `SELECT *`, so §0's hand-enumeration disqualifier does not bite, and a new key on either indicator reddens.

#### Seeding footprint — the split is right, and one race was checked and does not exist

Never torn down (`INSERT IGNORE`): `indicator_types`, `indicators` 2 and 6, `contract_roles` 1, `lever_roles` 1, `evidence_roles` 1, `user_roles` 1, `clarisa_geo_scope` 1, `intellectual_property_owner` 1, `portfolios` id 1. Fixture-private and torn down: `clarisa_actor_types`, `clarisa_levers`, `clarisa_sdgs`, `alliance_user_staff`, `agresso_contracts`, its own platform and report year.

**The classification criterion is verifiable and Lens A verified it:** `alignment_validation` contains `rl.lever_role_id = CASE WHEN portfolio_id = 1 THEN 1 WHEN portfolio_id = 2 THEN 3 ELSE NULL END` — the portfolio's **literal id must be 1 or 2**, so `portfolios` id 1 genuinely could not have been a private band id. The other never-torn-down ids are likewise hardcoded in function bodies.

**Blast radius swept on every axis (KZ-003/KZ-005):** across all sibling fixtures, **zero** assertions on `alignment` / `geo_location` / `partners` / `evidences` / `completness`; the only sibling reading a green check asserts `ip_rights === 0` alone; no sibling sets a non-NULL `results.indicator_id`, so seeding `indicators` 2/6 cannot move any sibling's output — including F-B's whole-row "no difference" diffs. Nothing `global-setup.ts` owns is touched.

**A race that would have been a first-run-only flake was checked and ruled out:** `sp-versioning-objective-blocks.fixture-spec.ts` inserts a `portfolios` row with `AUTO_INCREMENT` and deletes it **by insertId**. Had that row ever landed on id 1, this file's `INSERT IGNORE (id = 1)` would silently no-op and then lose its portfolio to a sibling's teardown. `baseline.sql` sets `portfolios AUTO_INCREMENT=4`, so the sibling can never contend for id 1. Per-file `INSERT IGNORE` is safe here because this file is the **sole writer** of every row it seeds — which is precisely the condition `global-setup.ts` exists to guarantee where it is not.

#### Leader-run lint verification (post-PASS)

Lens B predicted prettier drift. Confirmed: `npx eslint --no-fix` reported **10 prettier errors**, and `.husky/pre-commit` is empty (established at T-02), so they would have committed silently. Resolved with the repo's own autofix **scoped to the single file** (`npx eslint --fix <path>`), never the package-wide script, which carries `--fix` and mutates broadly.

**Proved semantically inert rather than asserted:** prettier both reflowed and **added trailing commas** when hoisting array brackets, so a whitespace-only comparison was not sufficient. A normalisation stripping whitespace **and** trailing commas before `]`/`)`/`}` shows the two versions **identical**. `git status` confirmed **no collateral**; the fixture suite re-ran at 14/48 with the same 2 T-10 failures, and the unit suite at **336 suites / 2264 tests** green.

#### Declared limits, restated so they are not mistaken for proven

- No HTTP tier at all — no controller, guard, envelope, versioning or Swagger surface. Coverage says nothing here: `completness: true` rests on eight stored functions, which no coverage number reflects (ADR-11).
- **R-IUA-012 AC.1's observed save is IP Rights, not Innovation Use.** The `innovation_use` key's own false→true transition is driven by raw SQL and never asserted as a pair. AC.1's wording is unqualified ("a section save") and the pull-not-push property (DD-7) is fully exhibited, so this is a recorded limit rather than a violation — and F-A already gates the Innovation Use round trip.
- **Two properties are now PERMANENTLY unowned at every tier, and T-13's criteria do not cover either:**
  - **DD-14's partial-PATCH contract** — F-E never calls `ResultInnovationUseService.update`; the level is set by raw SQL.
  - **That `create` honors the `manager` it receives** (T-08 advisory B-4) — `createResultType(id, indicator)` is called with **two** arguments, so `manager` is `undefined` and `selectManager` resolves to the repository. The transaction path is never entered. **This retires T-05's forward pointer that F-E was the natural owner: it structurally cannot be**, and T-08's advisory was right to say so.
- **R-IUA-011's scenario clause `AND the submit transition is permitted` is asserted nowhere and no task owns it.** Structurally implied — `function-handler.service.ts` runs the byte-identical fold over the identical object, so `completness: true` entails that gate passes — and the remainder is roles/workflow, outside this spec (DD-5). **Named, not charged.**
- Only indicator 2 is exercised as a control; indicators 1/3/4/5 rest on the single `switch` at source plus T-08's unit matrix. That is exactly what criterion 5 asks for.

#### `ADVISORY` findings (recorded, non-gating, and they do not become tasks)

| Lens | Finding | Disposition |
| --- | --- | --- |
| **Risk** | The never-torn-down `portfolios` id 1 spanning **2000–2200** permanently makes `get_portfolio_id_by_result` (`ORDER BY p.id LIMIT 1`) resolve to id 1 for **every** fixture report year in the shared scratch schema. Nothing is affected today, but a future fixture asserting portfolio-2 alignment (`lever_role_id = 3`) or "no portfolio resolves" would silently get portfolio 1 | **Recorded.** Belongs to the **baseline-snapshot escalation T-10 opened**, not to another per-file patch |
| Reliability | `afterAll` runs **17 unguarded `DELETE`s** before `harness.close()`. A `beforeAll` throw after boot but before the ids are assigned binds `undefined` and leaks the Nest connection. **Fourth fixture with this shape.** Mitigating factor recorded: every private seed here is existence-checked before a plain `INSERT`, so a leaked row does **not** redden a second run — this file is not exposed to the orphaned-platform regression T-13(a) exists to prevent | Recorded; T-13 candidate |
| Reliability | `ResultsService` has one class-field initializer (`logger`), `undefined` on the partial. The header's guarantee is phrased over *constructor dependencies* only; naming the **field** axis too would tell the next maintainer that a `this.logger.debug(...)` added inside the `INNOVATION_USE` case is also in scope — it throws loudly, which is the right failure mode | Recorded |
| Reliability | Test 3 completes the section by raw SQL while the **real** `ResultInnovationUseService` is already in hand. Routing it through `update()` would make criterion 8 true of the Innovation Use section itself, not only IP Rights. F-A already gates that round trip, so strictly optional | Recorded |
| Readability | `StubResultsUtilWithIndicator` duplicates the shared harness's stub with one getter changed. Keeping it local was the correct blast-radius call (three sibling suites consume the shared harness) and the header says so; a shared factory is T-13 cleanup material | Recorded |
| Readability | `901_000_000_000_000 + Date.now()` yields codes beginning `902_787…`, so the declared "901_000 band" is a **label, not a prefix** — inherited verbatim from all seven siblings and collision-free at this scale. Recorded so nobody "fixes" it into a real collision | Recorded |
| Readability | MySQL returns `1`/`0`, so `completness` is numeric; `toBeTruthy`/`toBeFalsy` is the **correct** choice against the requirement's literal "`completness: true`" — the coercion is deliberate, not laxity | Recorded |

**Final verification:** `npm run test:fixtures` → **14 suites / 48 tests, 2 failed (T-10's), 46 passed** · `npm test -- --silent` → **336 suites / 2264 tests** green · `npx eslint --no-fix` clean after the scoped autofix · `git diff HEAD -- src/` **empty** — all re-run independently by the Leader.

#### BUDGET ESCALATION — the fixture tier is ~2.8× its §12 allowance

`design.md` §12 allotted **harness ~120 + F-A…F-E ~800 ≈ 920 LOC** for the fixture tier. Actual: harness **249** + F-A **543** + F-B **710** + F-C **248** + F-D **77** + F-E **718** = **2,545 LOC**, i.e. **~2.8×**.

**Lens A assessed the overrun as intrinsic, not padding**, and checked each link: `completness: true` is the AND of five non-Innovation-Use validations, and on this scratch schema each needed reference data the committed baseline captured as **DDL only** — `general_information_validation` needs a non-NULL `indicator_id` **and** a role-1 `result_users` row; `alignment_validation` has **no bypass** and needs a portfolio whose literal id is 1, a role-1 contract, a role-1 lever and an SDG; `evidences_validation` one more pair. Only `geo_location` and `partners` were free. `beforeAll`/`afterAll` alone are ~278 lines of F-E. Non-intrinsic additions total roughly **45 lines** — the third scenario and its test — and those buy a mandated falsification.

**This is an estimate defect in §12, not delivery padding.** The per-task estimates were written before anyone knew the scratch schema carried no seed data for five unrelated validation functions. Reported to the user at the gate rather than absorbed.

**Forward pointers created by T-12**

| → Task | Pointer |
| --- | --- |
| **T-13** | **Its criterion "`test:fixtures` run twice in a row — both green" will collide with T-10's deliberately committed red, exactly as T-12's criterion 9 did.** Carve this out at **dispatch**, not at review. Cleanup candidates (none of them added criteria): the `afterAll` `tryStep`/`finally` guarding (now **four** fixtures), the shared `StubResultsUtil` factory, F-D's `Number()` coercion, AC.3/AC.4's message constraints, and `resolveInnovationUseLevel`'s wrong doc-comment about the driver contract |
| **T-13 / user** | **Two permanently unowned properties** — DD-14's partial-PATCH contract behaviourally, and that `create` honors its `manager`. Neither is in T-13's criteria. Adopting them is a decision, not a cleanup |
| Baseline-snapshot owner | **Fifth and sixth instances** of DDL-without-seed: `indicators`, `indicator_types` (this task), after `quantification_roles` 1–2 (T-10) and `global-setup.ts`'s own four. Plus the `portfolios` id 1 range above. The per-file `INSERT IGNORE` patches are accreting across four fixtures |
| Kaizen (archive) | Three candidates: **(a)** the **three-condition test for a constructor-bypassing partial** (empty-constructor / enumerable-real-collaborators / loud-failure) — a reusable rule extracted from a one-off technique; **(b)** a spec-mandated falsification can be *unfalsifiable against a spec-correct design*, and the right response is to add a scenario that bites, not to restate the claim — second occurrence, first time caught by the Implementer; **(c)** a Leader environment pre-check that reads **stored function bodies** (`SHOW CREATE FUNCTION`) found a five-function seed chain no document mentioned — the pre-check keeps paying, and its scope should include stored routines, not just tables and FKs |

**Budget status:** **12 of 13 tasks complete** (T-10 `[~]`). **22 of ~24 review rounds consumed.** One task remains (T-13) and **the LOC axis has breached at ~2.8× on the fixture tier** — see the escalation above.

## Pivot Record: T-10 — RULING (option B, quarantine)

**Ruled 2026-08-19 by the Leader, on the user's third consecutive instruction to continue after the four options had been presented in full.** Recorded explicitly because the T-10 entry above lists the options as *put to the user* and a Reviewer correctly flagged that no ruling was written down — a citation that half-resolves is a bookkeeping defect, and this closes it.

**The ruling: option B — quarantine the two failing assertions, preserving the finding.** Chosen because it is the **only** option that is simultaneously reversible, unblocking, and non-committal about the product fix:

- It **touches no production code**, so it commits nothing about a defect whose blast radius includes `customSaveInnovationDev` and therefore the live Innovation Dev section.
- It **retires no requirement.** R-IUA-009 AC.3 stands; the record states in as many words that the *code* does not meet it. That is the whole distinction between option B and option C, and it is why C was declined rather than deferred.
- It **unblocks T-13**, whose gate requires two consecutive green fixture runs — impossible against a deliberately red suite.
- It is **reversible in one token**: fixing the ownership check turns the quarantined tests **red**, which is the signal to delete the marker.

**Options A (fix the ownership check inside this spec) and D (fix it as its own properly-scoped change, with its own Innovation Dev regression proof) remain open and are unaffected by this ruling.** Option C (narrow AC.3) was **declined**, not deferred: it would retire a true requirement to match a defect, leaving the next reader an AC that reads as met rather than a vulnerability that was deferred.

**Why `it.failing` rather than `it.skip`.** A skipped test forgets; a failing-by-contract test remembers. `it.failing` keeps both assertions **executing**, reports green only *because* they fail as documented, and turns **red the moment the defect is fixed** — converting the quarantine from a silent omission into a live marker that demands its own removal. This was the Leader's refinement to option B as originally framed, and it is what makes the option honest rather than a papering-over.

### T-10 — attempt 2, `STATUS: PASS`

- **Status:** **`[x]` DONE** — the *task* is complete; **the product defect it found is not fixed and is not claimed to be.**
- **Date:** 2026-08-19 · **Attempts:** 2 of 3 · **Review rounds:** 2 (attempt 1 = the Pivot; attempt 2 = this quarantine)
- **Effort:** `xhigh` → `high` · **Review mode:** single Reviewer, recorded deviation (a two-token conversion plus comments)

**The change, verified by the Leader before review:** a semantic diff against the committed `12d059b9` — normalising whitespace, comments and trailing commas — shows the **only** difference is `it(` → `it.failing(` on the two target tests. `expect(` count unchanged at **18**. Exactly **2** `it.failing` calls (4 further mentions are in comments). Zero `it.skip`/`xit`/`.only`/`.todo` anywhere under `test/`. `git diff HEAD -- src/` **empty**; one file touched. **Two consecutive `npm run test:fixtures` runs: both 14 suites / 48 tests, 0 failed** — T-13's double-run gate now has a genuine clean baseline.

**The Reviewer verified every mechanism claim in the new comments at source rather than accepting them** — `result-actors.service.ts:210-223` + the `save` at `:262` (caller PK, no `result_id`, no ownership check, with a byte-shape sibling at `:97-112` that *is* `customSaveInnovationDev`), `result-institution-types.service.ts:202-207` → `buildUpdateData` (both branches return the caller PK, while `deactivateExistingRecords:332-345` *does* carry the role key), and `base-service.ts:388-417` where the create branch builds its record from `resultKey: resultId` + role + composite keys and **never copies `item.id`**. Every claim accurate, none overstated. It also confirmed the comments **do not overreach**: AC.3 is named as the unmet AC, and AC.1/AC.2 and the scenario — which do hold — are not impugned.

**The role-isolation half is byte-for-byte intact**, which matters because it is the spec's highest-severity gate: save #1 retains all four criteria in order (three Innovation Use deactivations, four byte-identical Dev/other-role rows, three legitimately-passing result-2 checks), the four plain `it`s in the save-#2 block are unchanged, and the test count is still 7 — consistent with "2 of its 7 tests fail". Nothing added or removed.

#### What is true of the product after T-10 (stated plainly, because a green suite no longer says it)

| Property | Status |
| --- | --- |
| **Role isolation** — Innovation Use reconciliation never touches an Innovation Dev row, in any of the three shared tables | **PROVEN.** All three role-key falsifications went red as predicted; every Dev row byte-identical across both saves, by whole-row `SELECT *` diff (ADR-11), against a result deliberately holding **both** indicators' rows — the state R-IUA-009's scenario forbids relying on |
| **R-IUA-007 AC.4 / R-IUA-008 AC.3** (Dev organizations and role-1/role-2 quantifications untouched) | **PROVEN** |
| **R-IUA-009 AC.3** — saving result A does not touch a row belonging to result B | **NOT MET BY THE PRODUCT.** Quarantined via `it.failing`, documented at three sites in the fixture, and open pending the user's A/D decision |
| `result_quantifications` cross-result exposure | **STRUCTURALLY IMMUNE** — `upsertByCompositeKeys` ignores a caller-supplied id |

#### `ADVISORY` findings (recorded, non-gating)

| Lens | Finding | Disposition |
| --- | --- | --- |
| Reliability | **`it.failing` passes on ANY failure**, so an unrelated error — `fetchRowByPk`'s `toHaveLength(1)` on a vanished row, or a DB fault — would be absorbed as "expected". Inherent to the mechanism, and still preferable to encoding the corrupted values as *expected*, which would make the defect look intended | Recorded. Belongs in the eventual fix ticket, not here |
| **Risk** | **`npm run test:fixtures` now reports 48/48 green with nothing at suite level signalling that a known product defect is quarantined.** The marker is documentation-only by design, so `tasks.md` T-10's status line and this entry are the **only** surfaces carrying it — both must stay accurate for the quarantine to remain visible | **Acted on:** T-10's status line now **leads** with the unmet AC, and the spec header carries the open defect. This is the reason the `[x]` is qualified rather than bare |
| Readability | The inline citation `execution.md → T-10 + Pivot Record` half-resolved: no `Pivot Record: T-10` heading existed and no ruling was recorded | **Acted on** — this section is that heading and that ruling |

#### Leader process finding — worth its own line

The Implementer found **40 pre-existing prettier errors** on the file the Leader had committed at `12d059b9`. `.husky/pre-commit` is empty (established at T-02), so they committed silently. **This is the third occurrence of the same class** — after T-02's two and T-12's ten — and in each case it was caught by a Reviewer's prediction or an Implementer's incidental run, never by the Leader's own routine. **A read-only `npx eslint --no-fix` on the touched paths belongs in the Leader's pre-commit sequence**, not in the set of things noticed when someone else looks. Carried to `/akili-archive` as a methodology item, not a code one.

**Budget status:** **13 of 13 tasks have been attempted; 12 complete, T-10 `[x]` with a documented open product defect.** **23 of ~24 review rounds consumed.** T-13 is now eligible and is the last task — it will consume the 24th round, leaving **zero** headroom for rework. The LOC axis has already breached at ~2.8× on the fixture tier (see T-12's escalation).

### T-13 — C-4 cleanup, full gate, human Swagger check

- **Status at the time of this entry:** `[~]` — **PASS on attempt 1, zero rework, with ONE criterion outstanding by design.** Nine of ten Done criteria are met; **criterion 6, the human `/swagger` check, awaits the user's own observation and cannot be discharged by any agent.** Per Step 2.3.0 — *"a task with an outstanding gap never reaches `[x]`, even on a Reviewer `PASS`"* — T-13 stays `[~]`.
- **Date:** 2026-08-19 · **Attempts:** 1 · **Review rounds:** 1 (single Reviewer, lens-checklist — `high` effort's default, no deviation)
- **Requirements in scope:** R-IUA-013 AC.3, AC.7 · NFR-IUA-001 · NFR-IUA-003 · resolves **OQ-IUA-2**
- **Files changed (3, all under `test/fixtures/`):** `sp-versioning-objective-blocks.fixture-spec.ts` (one removal) · `innovation-use/innovation-use-validation.fixture-spec.ts` (one removal) · `innovation-use/innovation-use-section-round-trip.fixture-spec.ts` (extended with the NFR assertion)

#### (a) The C-4 cleanup — 2 removed, 10 kept, and the classification is conclusive

**The trap this criterion exists for:** chunk 1's Kaizen logged `platformSeeded` / `innovationDevRoleSeeded` as *"structurally always false"*, and **that finding is over-broad**. A guard is dead only where the row it protects is one of `global-setup.ts`'s four unconditional seeds; a guard protecting a **private** platform code is **live**, because it gates that file's `afterAll` `DELETE` and those inserts are plain `INSERT`, not `INSERT IGNORE`. Remove one and the **next** run collides on a duplicate key — so the wrong cleanup yields a suite that is green once and red the second time. That is why criterion 4 mandates two consecutive runs, and it is DD-12/§11.1's whole subject: the reversion challenge was run on exactly this cleanup and found a concrete breakage.

| Verdict | Count | Sites |
| --- | --- | --- |
| **DEAD — removed** | 2 | `sp-versioning-objective-blocks` (`reporting_platforms 'STAR'`) · `innovation-use-validation` (`actor_roles` id 1) |
| **LIVE — kept** | 10 | every guard protecting a private platform code: `T09IUFA`, `T10IUFB`, `T11IULB`, `T12IURC`, `T12IUV`, `T12RT1`, `T12F10`, `T12F12B`, `T13IULC`, `T13IUDR` |
| No occurrence | 3 | `smoke`, `innovation-dev-validation-unchanged`, `innovation-use-catalog-order` |

**14 files enumerated by grep over the whole tree (KZ-002), matching the 14 collected suites** — not from `design.md` §11.1's illustrative list, which is the failure mode this criterion names. A per-file line exists for every file **including the three with zero occurrences** (KZ-007).

**The Reviewer confirmed both DEAD verdicts at source rather than by inspection**: `global-setup.ts:50-52` and `:56-58` are **unconditional** `INSERT IGNORE`s inside Jest's `globalSetup`, which runs once before any worker; both are root catalog rows with no outgoing FK (FP-46's own carve-out, so the `IGNORE` cannot silently no-op them into absence); and **no fixture anywhere deletes either row** — zero `DELETE … 'STAR'`, zero `DELETE FROM actor_roles` in the tree. Each removed `if (!existing)` was therefore structurally unreachable.

**It also ran the KZ-005 axis check I had not asked for:** the only other fixture inserting into `actor_roles`/`institution_type_roles` uses deliberately **private** role ids, not id 1 — so no differently-named guard hides a fifth dead site.

**On conclusiveness, stated honestly:** the double green alone is only probabilistic (it exercises the collision only for platforms actually seeded in run 1). Combined with the static facts that neither removal touched a private code and all ten private guards are byte-present, the Reviewer ruled it **conclusive**.

**The judgment call — removing the whole check-then-insert block, not just the boolean — was ruled IN SCOPE** on three independent grounds: `global-setup.ts`'s docstring states *"No fixture file may create or tear down any of these four rows from here on"*, so a surviving SELECT+INSERT of an owned row violates the very contract the removal closes; that docstring records the **teardown** halves as already removed in chunk 1, leaving the boolean's only consumer the diagnostic `void` §11.1 itself notes, so once the boolean goes the block has no consumer at all; and chunk-1 C-4 named *"dead branches"* — the branch **is** the block. Both removals replaced the code with an in-place comment **naming the guarded row**, so KZ-005's quote-the-row discipline held at the code site, not only in a commit message.

#### (b) NFR-IUA-001 — exactly 5 queries, and it corrects this log

Extended **F-A** (`innovation-use-section-round-trip`), which already boots the harness and reads the section, so no second harness boot was needed. Seeds 50 `result_actors` rows by raw SQL, swaps a counting TypeORM `Logger` onto the DataSource for the duration of one `findOne`, restores it in `finally`.

**Observed: 5 queries. And that corrects `execution.md`'s own T-05 entry, which estimated 4 by inspection.** `mainRepo.findOne({ relations: { innovation_use_level: true } })` costs **2**, not 1 — the Reviewer verified the mechanism at source in `typeorm`: `EntityManager.js:604-609` sets `take: 1` unconditionally, and `SelectQueryBuilder.js:1960-1961` takes the two-query id-picking path exactly when `(skip || take) && joinAttributes.length > 0`, which the relation satisfies. So: a `SELECT DISTINCT … LIMIT 1` id-picking subquery, then the joined `SELECT … WHERE id IN (?)`, plus 3 child reads = **5**.

**The zero margin is the honest state, not a defect — and the reason is better than "it passes".** `requirements.md` NFR-IUA-001 **itself enumerates five items** ("detail row, actors, organizations, quantifications, catalog join"), so 5 is the number the requirement was dimensioned for. **T-05's "4 round trips … the join is *not* a fifth query" was right about the JOIN and wrong about the id-picking subquery.** An estimate made by reading code sat in this log for eleven tasks until something finally counted it.

**Measurement soundness, verified rather than assumed:** `MysqlQueryRunner.js:151` resolves `logger` as a property lookup on the DataSource at call time, so the swap is observed; `harness.dataSource` is the single `moduleRef.get(DataSource)` instance that the service and every child repository bind to. No under-count vector survives — no second connection, no query cache, no concurrent in-file work inside the awaited call, and sibling fixtures run in separate workers with their own DataSource. An anti-vacuity guard (`toBeGreaterThan(0)`) is present.

**"No per-row pattern" is genuinely proven, and the row count is right:** **52** active rows (50 seeded + A and C; B was deactivated in the prior `it` and is excluded by `find`'s `is_active: true`), with `actors.length >= 50` asserted in the same test — so a per-row read would have driven the count past 50 and blown the bound. Bounded honestly: it proves no per-row pattern **on the actors collection**, which is exactly what NFR-IUA-001's "how verified" asks. Raw-SQL seeding is legitimate because the measurement is of the **read** path; routing 50 rows through `customSaveInnovationUse` would add write-path queries to the measured window and prove nothing extra.

#### (c) Criterion 6 — OUTSTANDING, correctly refused, and it is the user's

**The Implementer refused to perform or simulate the human `/swagger` check, and that refusal was the right call.** The Reviewer confirmed no substitute exists anywhere in the diff — no decorator assertion, no `Reflect.getMetadata` stand-in, no grep — satisfying the task's own rule that it *"must be reported as a human observation, never as a command result"* and KZ-001. **R-IUA-013 AC.3 is `unmet-pending-human`, not met.**

Two riders already on the record that the human observation must carry:
- **Confirm the literal URL.** `main.ts` enables URI versioning with **no `defaultVersion`**, so no version segment is emitted (recorded earlier in this log at the T-01 discussion).
- **Confirm the DD-13 / D-IUA-10 exemption as an exemption, not a defect** — the catalog `GET` is the one *inherited, unmodified* `BaseController` handler and correctly carries **no** `@ApiOperation`. Plus `@ApiProperty` ×25 across the DTOs.

#### Gates

| Gate | Result |
| --- | --- |
| `npm run test:fixtures` ×2, same container | **14 suites / 49 tests, 0 failed — both runs.** Exactly +1 against T-10's 48 baseline: the one new `it` and nothing else |
| `npm test -- --silent` | **336 suites / 2264 tests** green |
| `npm run test:cov` | **89.69 / 75.61 / 85.13 / 89.14** — all ≥ the 60% floor |
| `npm run lint -- --quiet` | clean; **`git status` re-checked after** (the script carries `--fix`) — **no mutation** |
| `git status` | only the 3 intended files; `git diff HEAD -- src/` **empty** |

**Coverage is reported as what it is:** per NFR-IUA-003's disqualifier and `design.md` §10.5, **it is not evidence for DC-2, DC-3, DC-5 or DC-7** — SQL sits outside Jest coverage (ADR-11) and the fixture suite is a separate Jest project not counted in it.

#### A cross-check worth keeping — the quarantine proved itself

`it.failing` **fails when its body passes.** So "0 failed" on both runs *positively proves* T-10's two quarantined assertions **still fail** — i.e. the `R-IUA-009 AC.3` defect is still open and the marker is still load-bearing. A green suite is normally silent about a quarantine; this inversion makes it speak. The Reviewer also confirmed the file was untouched, its `'T10IUFB'` guard correctly classified LIVE, exactly 2 `it.failing` calls, and zero `.skip`/`xit`/`.only`/`.todo` anywhere under `test/`.

#### The advisory queue stayed out — verified structurally

Reviewers across T-09…T-12 recorded cleanup candidates and repeatedly suggested T-13 as their home. **None became work**, and the Reviewer confirmed it structurally rather than on assertion: the `afterAll` sequences are still unguarded awaits in both named fixtures, `innovation-use-catalog-order` (F-D's `Number()` coercion, the undeclared `901_000`) is untouched, `nest-harness.ts` (the duplicated `StubResultsUtil`) is untouched, and the message-breadth and `resolveInnovationUseLevel` doc-comment items live in `src/`, whose diff is empty. **An advisory never becomes work — held.**

#### Corrections to this log

- **A Leader arithmetic slip:** the T-13 dispatch brief said "`innovation-use-validation` … + the other **10** LIVE files", implying 11. There are exactly **10** live-guard files **including** `innovation-use-validation` (nine besides it). Substance unaffected; corrected here.
- **`execution.md`'s T-05 query estimate (4) is superseded by the measured 5** — see (b).
- **OQ-IUA-2 is substantively resolved** (2 removed with the guarded row named, 10 kept), but `requirements.md`'s open-question row is **still unstruck**, unlike OQ-IUA-1 which carries the `~~…~~ RESOLVED` treatment. Bookkeeping for `/akili-archive` on a document this diff correctly did not touch.

#### `ADVISORY` findings (recorded, non-gating, and they do not become tasks)

| Lens | Finding | Disposition |
| --- | --- | --- |
| **Readability — the one worth an edit** | **`innovation-use-validation.fixture-spec.ts:30-38` is now FALSE and contradicts two comments this same diff added.** The header still says the `beforeAll` *"still check-then-inserts id 1 itself, idempotently"* and *"Left as-is: this correction's authorized scope is this comment, not that code"* — while `:188-194` correctly says the file *"no longer creates it itself"*. **Two comments in one file asserting opposite facts about the same six removed lines.** No criterion covers it, no behaviour depends on it, and the operative comments are the correct ones | **Recorded, not actioned.** Ruled non-gating by the Reviewer. Flagged to the user as a recommended two-sentence deletion — and noted because a stale header contradicting the code is precisely what cost a round at T-11 |
| Readability | Both new comment blocks cite **"T-13" with no spec slug**, and **chunk 1 has its own T-13 that touched these exact two files.** A reader cannot tell which. FP-50's citation discipline applies | Recorded |
| Risk | **NFR-IUA-001 sits exactly at its ceiling.** One added relation on the detail `findOne`, or a fourth child read, breaks it. Honest state rather than a defect — the requirement enumerates five round trips itself — but **the fixture is now the tripwire**, so keep the `toBeLessThanOrEqual(5)` bound rather than relaxing it | Recorded |
| Reliability | The `≤ 5` bound proves no per-row pattern **for the actors collection only**; organizations and quantifications stay at one row each and are not scaled. That is what NFR-IUA-001 asks; recorded so a later reader does not over-read it | Recorded |

**Budget status:** **12 of 13 tasks `[x]`; T-13 `[~]` with one human criterion outstanding.** **24 of ~24 review rounds consumed — exactly on the re-baselined budget, with zero rework spent on T-13.** The LOC axis remains breached at ~2.8× on the fixture tier (T-12's escalation, unchanged and intrinsic).

