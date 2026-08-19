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
| Budget (`design.md` §12) | 13 tasks · ~2,400 LOC · 6–8 review rounds |
| Rework ceiling | 3 attempts per task |
| Leader model tier | T1 · Implementer T2 · Reviewer T3 (`author ≠ auditor` enforced by the `.claude/agents/akili-*` wrappers) |
| Log opened | 2026-08-19 |

**Review-round tally:** 3 of 6–8 consumed (T-01 attempts 1–2, T-02 attempt 1). See § *Budget Tripwire*.

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
