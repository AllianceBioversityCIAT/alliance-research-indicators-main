# Tasks — Innovation Use / Link to a reported Innovation Development output

## Document Control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/innovation-use/link-innovation-dev/` |
| Requirements | [`requirements.md`](requirements.md) |
| Design | [`design.md`](design.md) **draft 2** |
| Review ledger | [`judgment.md`](judgment.md) |
| Approval Mode | pre-approved — Phase 3 gate **auto-approved (pre-approved mode)**, 2026-09-09 |
| Task count | **14** (budget said 12; +1 for the doc-sync task that had no home, +1 for Amendment 02's fixture repair — see §6) |
| **Amendment 01** | **2026-09-09** — user mock ([`mockup/`](mockup/)). Rescopes **T-08, T-09, T-10, T-11**; adds no task. Own section card, platform-prefixed label, `View innovation detail` action, no remove control. **Server lane T-01…T-07 unaffected** apart from `platform_code` in T-07's projection |
| **Amendment 02** | **2026-09-09**, mid-execution, **user-approved**. Three verification-text corrections + one new task, all from defects found *while executing*: T-08's verify line emitted into `out-tsc` and disarmed T-12's gate; T-03's falsifier clause was unsatisfiable as written; §7's *"Server suite green"* could not see the fixture suite where T-03 lives. Adds **T-14** to repair the two sibling fixture files Migration B retroactively broke. **No requirement and no design decision changes** — this corrects verification text and closes an unowned consequence |
| **Amendment 03** | **2026-09-09**, mid-execution, **user-approved Pivot** after T-09 HALTed at attempt 3 of 3. Root cause was a **spec gap, not three bad implementations**: R-IUL-012 required an error state and `design.md` draft 2 specified no error surface for it, so the only referent was the page-level `loadFailed()` gate — and the literal reading is a reachable silent-data-loss path. Rewrites **R-IUL-012's error clause**, adds **`design.md` §6.8 + DD-12**, and **rescopes T-09** (clauses, falsifiers, Cannot-prove, Done) against the corrected text. **T-09's attempt budget is restored to 3** — see §5 R-6. Adds no task; no other task changes |
| **Amendment 04** | **2026-09-09**, mid-execution, **user-approved** after T-10 attempt 2. Ruling: *"deben poder todos tanto PRMS/TIP/AICCRA y STAR entonces si todos deben tener PLATFORMCODE-CODE"*. The anchor's URL becomes the **hyphenated** `<platform_code>-<result_official_code>` for every platform, not the bare code. Cause: R-IUL-002 forbids a platform filter, so a PRMS/TIP/AICCRA Innovation Dev result is selectable, and a bare `/result/284` resolves to **STAR** via the numeric ⟺ STAR invariant — the card showed `PRMS 284` beside a link that opened STAR-284. **Display format is unchanged** (space-joined, per the mock); only the URL changes. **No server or payload change** — STAR's own result page renders non-STAR results and surfaces their external link |
| **Amendment 05** | **2026-09-09**, mid-execution, **Leader-adjudicated on measurement** (no requirement or design change). T-05's verification — *"The app boots — a Nest testing-module compile covering this module graph"* — and its falsifier are **structurally unreachable in this codebase**, for reasons that pre-date the task: `npm run test:e2e` (the only spec that imports the real `AppModule`) dies with `RangeError: Maximum call stack size exceeded` **on a clean tree**, and a local `nest start` stalls on `connect ETIMEDOUT` against the remote Dev MySQL before reaching the module. Rewrites **T-05's Verify / FALSIFIER / Cannot-prove / Done** to state what is actually reachable and to declare the residue (KZ-017), instead of marking an unreachable check green. The cycle premise itself stays confirmed — statically, by direct citation |
| **Amendment 06** | **2026-09-09**, mid-execution, **Leader-adjudicated after the T-05 review FAILed Amendment 05 on scope**. Three corrections, all measured: **(1)** the falsifier is **NOT unreachable** — the repo's own child guide (`server/researchindicators/src/CLAUDE.md` §4) prescribes reading `@Module()`/`SELF_DECLARED_DEPS_METADATA` directly, which distinguishes a `forwardRef` wrapper from a plain reference with no boot at all; three such gates now exist and **all three were observed red**. **(2)** The `ResultPolicyChangeModule … index [0] is undefined` error is **introduced by T-05**, not pre-existing — proven by reverting the three tracked files to `HEAD` and re-probing (a *different* error appears). **(3)** §5.3/DD-9's precedent citation is half wrong: `link-results` is not this edge at all. No requirement changes |
| **Amendment 07** | **2026-09-09**, **user-requested during T-12's visual check** — the first finding to come from a human eye rather than a gate, which is exactly what T-12 exists for. The picker had **no placeholder**, so an unselected control read as blank. Adds `placeholder="Select the innovation development"`, following this codebase's established convention (*"Select the actor type"*, *"Select the organization type"*, *"Select the year"*). One attribute + one test asserting it on the **rendered** `p-select`, with an observed-red falsifier. No requirement or design decision changes |
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
  └──► T-03 ──► T-14 fixture repair  (Amendment 02)
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
| Status | `[x]` |
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
**pre-Migration-B** function. Every **negative** rule-16 case — every case expecting `FALSE` — must go
**red**. A suite that is green before the migration exists is testing nothing.

> **Amendment 02 corrects this clause, which was unsatisfiable as first written** (*"Every rule-16
> case must go red"*, while this task's own case list enumerates `valid link → TRUE`). Appending an
> `AND` conjunct is **monotone**: it can only turn a `TRUE` into a `FALSE`, never the reverse. So the
> positive case is *structurally incapable* of reddening against a strictly weaker predecessor, and the
> rules-2–15 discrimination case reddens on a top-level `AND`→`OR` slip rather than on the migration's
> absence. Both exemptions are **stated here rather than pretended**, per §3's own preamble. Measured
> 2026-09-09: 6 of 8 cases red pre-migration, which is the full set the clause can demand.
**Disqualifier.** If the scratch schema is not provably empty at start (table count 0 → migrated),
the run is not evidence — report the state instead of the result.
**Done.** All cases green post-migration, **every negative rule-16 case** observed red pre-migration
(the positive case and the rules-2–15 case are exempt for the structural reasons stated in the
FALSIFIER above — Amendment 02), both runs recorded.

---

### T-04 — DTO field + Swagger

| | |
| --- | --- |
| Status | `[x]` |
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
| Status | `[x]` |
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

**Verify** *(rewritten by Amendment 05 — measured, not aspirational)*. `npm test -- --silent` ·
`npx eslint <touched files>` (bare, never `npm run lint` — K-001) · a Nest testing-module compile that
instantiates the **real** `ResultInnovationUseModule` and `ResultInnovationUseService`, including both
`forwardRef` sites, against stood-in siblings.

**FALSIFIER — REACHABLE, and three of them are observed red** *(rewritten by Amendment 06; the
previous text declared this unreachable and was **wrong** — see the correction note below)*.

The original phrasing (*"drop the `forwardRef` → the **compile** must fail"*) does not fire, and the
diagnosis of why is correct: `overrideModule` intercepts by **token identity** before Nest's scanner
reaches the plain-vs-`forwardRef` ordering problem, and a `useValue` provider swap resolves a
constructor parameter identically either way. Re-tested against a stand-in recreating the genuine
bidirectional edge — still green both ways.

**But `compile()` is not the only technique, and the repo already prescribed the right one.**
`server/researchindicators/src/CLAUDE.md` §4 rules on exactly this class of property — *"Mocked-provider
unit specs cannot catch this… The falsifiable assertion is over the module graph:
`Reflect.getMetadata('imports', …)`"* — with `entities.module.spec.ts:48` as the working instance,
whose own docstring notes it *"does not boot Nest's DI container"*. Reading the metadata **as written**
distinguishes `{ forwardRef: fn }` from a plain class reference. Three gates now do so, and each was
**observed red** on 2026-09-09:

| Mutation | Reddens |
| --- | --- |
| `forwardRef(() => ResultsModule)` → plain `ResultsModule` | *DD-9 module axis: ResultsModule is imported forwardRef-wrapped, never plainly* |
| `@Inject(forwardRef(() => ResultsService))` deleted | *DD-9 service axis: the ResultsService param is @Inject(forwardRef(...))-declared* |
| `ResultsModule` moved after `ResultInnovationUseModule` in `entities.module.ts` | *entities.module.ts imports ResultsModule before ResultInnovationUseModule (boot-order invariant)* |

**What the metadata gates do NOT cover** (KZ-017, stated so the next reader inherits the caveat): they
lock the wrapper against removal and the boot order against reversal. They do **not** prove the app
boots — see Cannot-prove.

**Measured proof the service-axis wrapper is load-bearing, not defensive syntax.**
`results.service.ts` imports `ResultInnovationUseService` while this service imports `ResultsService`,
a genuine circular import. In the **production require order** (`entities.module.ts:4` before `:48`),
`design:paramtypes` for this constructor emits **`undefined` at index 6** — the `_resultsService` slot.
Entered from this module instead, the same slot emits `[Function ResultsService]`, so the erasure is
**order-dependent** and is therefore documented rather than asserted. `ResultsService`'s own 39
paramtypes carry **no** `undefined`, so its plain `ResultInnovationUseService` injection at
`results.service.ts:152` still resolves — which is why DD-9's one-sided form is sufficient.

> ### ✅ **BOOT PROVEN — 2026-09-09, the residue below is DISCHARGED**
>
> The user brought the full stack up. Measured against the **running** process:
> - `node dist/main` on **:3001**, started **19:26:28**, built **19:26:27** — both **after** the last
>   edit to T-05's files (**19:07:57**), via `npm run start:dev`, which compiles from `src`.
> - Both `forwardRef` axes are present **in the running build**, not just in source:
>   `dist/…/result-innovation-use.module.js:31` → `forwardRef(() => results_module_1.ResultsModule)`;
>   `dist/…/result-innovation-use.service.js:176` → `__param(6, Inject(forwardRef(() => results_service_1.ResultsService)))`
>   — **index 6**, exactly the slot measured as erased by the circular import.
> - `GET /swagger` → **200**. `GET /api/v1/result-innovation-use/1` → **401**, not 404, so the module
>   is in the graph and `JwtMiddleware` is gating it (per the child guide, an unregistered module
>   returns 404 on every handler).
>
> **So the app boots with DD-9's wiring in place, and T-05's Done criterion is met by real evidence
> rather than by declaration.** The paragraphs below are kept as the record of what was unavailable
> *before* the stack was up — they remain accurate about the test harness, and R-7 still stands.

**What was unreachable while the stack was down** *(Leader-measured 2026-09-09, retained as record)*:
- `npm run test:e2e` is the only spec that imports the real `AppModule`. It dies with
  `RangeError: Maximum call stack size exceeded` in Nest's `InstanceWrapper.cloneStaticInstance` /
  `getInstanceByContextId`. **Verified pre-existing** by stashing this task's diff and re-running on a
  clean tree — identical crash. A request-scoped provider (`CurrentUserUtil`) interacting with this
  graph's circular modules; nothing to do with T-05.
- A local `nest start` initializes 20 modules and then stalls on TypeORM's `connect ETIMEDOUT` against
  the **remote** Dev MySQL, **before** reaching `ResultInnovationUseModule`. `migrationsRun: false`
  and `synchronize: false` were confirmed first, so the attempt could not alter the shared schema.
- Compiling `ResultInnovationUseModule` with **no** overrides fails on a *different* defect:
  `Nest cannot create the ResultPolicyChangeModule instance. The module at index [0] … is undefined`.
  ⚠️ **This one is INTRODUCED BY T-05 — see §5 R-8.** Amendment 05 recorded it as *"pre-existing"* on
  the worker's report; Amendment 06 retracts that, measured by file-revert. Consequence that survives:
  entering this graph anywhere but `AppModule` still fails, so any future module-compile spec here
  needs stand-ins.

**What IS proven, and it is what the design decision actually rests on.** The cycle exists by direct
citation, verified at source and independent of any boot test: `results.module.ts:31` imports
`ResultInnovationUseModule`, `:77` lists it in `imports`, `:99` exports `ResultsService`. `forwardRef`
on **both** axes is DD-9's prescription.

**Precedent — corrected by Amendment 06.** This paragraph previously read *"precedented **twice** in
this very codebase for this exact edge (`link-results.service.ts:18-23`, `result-oicr.service.ts`)"*,
and that citation is **half wrong**: `results.module.ts` never imports `LinkResultsModule` and
`results.service.ts` never injects `LinkResultsService`, so `link-results`'s `forwardRef` resolves no
cycle — it precedents the **syntax**, not the edge. Only **`result-oicr`** precedents this edge, and it
is **symmetric** on all four sites (`results.module.ts:80` ⟷ `result-oicr.module.ts:30`;
`results.service.ts:154` ⟷ `result-oicr.service.ts:75`). T-05's form is one-sided and that is
sufficient **as measured** — `ResultsService`'s 39 emitted paramtypes carry no `undefined` in the
production require order — at the cost of depending on that order, which is why **R-8** exists and is
asserted.

The real boot is verified where this repo has always verified it — **the user's own Dev deploy** — a
human-gated step, not an agent's.

**Fallback (design §5.3) — NOT taken, and the precondition is not met.** Its trigger is *"if the cycle
resists resolution"*. **Nothing resisted:** the graph compiles, the suite is green, and the falsifier
is **reachable and green on the metadata gates**. *(Amendment 06 corrected this paragraph's reason,
which previously argued from *"an unreachable falsifier is not a red boot"* — the conclusion held, the
stated reason did not.)* Swapping to a raw `DataSource` query would trade a precedented pattern for an
unprecedented one on no evidence.

**Done** *(rewritten by Amendment 05, corrected by Amendment 06)*. Module + service wired per DD-9 on
both axes; suite and lint green; the real-module compile passes; **three metadata falsifiers observed
red** (both DD-9 axes plus R-8's boot order); and the residue that genuinely remains — the app boot
itself — declared rather than implied. Amendment 05's *"a green check that cannot fail must say so"* no
longer describes this task: three of them can now fail, and have.

---

### T-06 — Service write path: step 4c validation + step 9b link write

| | |
| --- | --- |
| Status | `[x]` |
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
rides on `create`'s own already-tested behavior.

*(Citation corrected 2026-09-09 after the T-06 review: this line also said **"plus T-03's harness"**,
and that half does not resolve — **T-03 covers rule 16 only.** What DOES hold is the first half, and
it was verified at source: `shared/utils/array.util.spec.ts` (*"should merge backend into client by
comparison key"*) asserts `is_active === true && id === 1`, i.e. **PK-preserving reactivation is
genuinely tested** at the mechanism. What no task owns is the **end-to-end DB** proof — see §5
**R-9**.)*
**Done.** Every row above asserted; both falsifiers observed red.

---

### T-07 — Service read path: `findOne`

| | |
| --- | --- |
| Status | `[x]` |
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

**Verify.** `npx tsc -p tsconfig.spec.json --noEmit` (**not** `npm run lint` — it carries `--fix`)

> **`--noEmit` is load-bearing, added by Amendment 02.** `tsconfig.spec.json` sets
> `"outDir": "./out-tsc/spec"`, and `jest.config.ts`'s `testPathIgnorePatterns` covers
> `node_modules/` and `dist/` but **not `out-tsc`**. Without `--noEmit` this command emits a compiled
> `.js` twin of every spec, which jest then discovers and runs outside the Angular preset. Measured
> 2026-09-09: **157 phantom failed suites / 3971 phantom failed tests**, and the arithmetic closes it
> — 317 real specs + 318 compiled twins = the 635 total jest reported. **One task's gate silently
> disarmed T-12's.** If a run ever emits anyway, `rm -rf out-tsc` before measuring.
**FALSIFIER.** Assign a `string` to `innovation_dev_result_id` in a scratch spec → `tsc` must error.
**Watch (K-004, measured in this repo):** a *syntax* error aborts the `tsc` parse and can hide
hundreds of type errors behind a report of three. Confirm the file parsed.
**Done.** Both keys typed; falsifier observed.

---

### T-09 — The picker  ⟨Antigravity⟩

| | |
| --- | --- |
| Status | `[x]` |
| Size | M |
| Depends on | T-08 |
| Requirements | R-IUL-002, R-IUL-003 (all clauses), R-IUL-012 (all four states), **R-IUL-013** |
| Design | §6.1, §6.2, §6.5, **§6.8 (Amendment 03)**, §6.6, DD-11, **DD-12 (Amendment 03)** |
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

**The error state — rescoped by Amendment 03, and this is the clause three attempts died on.**
Implement `design.md` **§6.8** exactly. `GetInnoDevOutputService` gains `error = signal(false)`, set
from the **envelope** (`if (!response?.successfulRequest)`), never from a `try/catch` — a rejection
never arrives, and §6.8's callout carries the measured proof. The error renders **inside this card**,
reusing the section's error affordance, and is wired to **nothing outside it**.

> **Do NOT compose it into `loadFailed()`.** DD-12 rejects that explicitly. It unmounts the whole
> section, makes *Save* a silent no-op and lets *Next* discard unsaved edits (R-IUL-003 violation).
> Attempt 3 did exactly this **because its brief instructed it to** — the instruction was wrong, and
> Amendment 03 is that correction. Leave the control **mounted** in the error branch: §6.6's mount
> lifecycle is the only retry path, so unmounting makes the error sticky for the session.

**Clauses:** card between the right siblings (R-IUL-013) · nothing moved out of the details card ·
red asterisk · amber border · "This field is required" · **must NOT** block draft save or navigation ·
**must NOT** show the empty state while `loading()` is true · **must NOT** nest inside the details card ·
**error surfaces inside the card** · **error MUST NOT reach `loadFailed()`, `saveData()`'s guard or the
navigation buttons** · **error MUST NOT show the empty-list tooltip** · **control stays mounted in the
error state** · the Empty state's condition carries `&& !error()` so the two states cannot collapse.

**Verify.** `npm test -- --silent` · `npx tsc -p tsconfig.spec.json --noEmit` (baseline **934**, delta
must be **0**; `--noEmit` is mandatory per Amendment 02) · `npx prettier --check` on every touched file.
**FALSIFIER.** Drop the `!loading()` guard → the "no empty state during load" spec must go red.
Remove `isRequired` → the asterisk/message specs must go red.
`#item` → `#itemX` → the populated-label spec must go red.
`if (!response?.successfulRequest)` → `if (false)` → the error-state spec must go red. **This one is
mandatory**: it is the exact falsifier attempt 2 could not survive, and its red is what distinguishes
a real envelope check from KZ-001's mock-driven green.
Drop the `&& !error()` term from the Empty condition → the "error is not the empty state" spec must go red.
**A save-path falsifier is required too**: assert that with `error()` true a draft save still issues its
PATCH and the section stays mounted. Composing the error into `loadFailed()` must turn that spec red —
that is what makes DD-12 enforced by a test rather than by a comment.
**Cannot prove.** Spacing, alignment, contrast, dark theme — jsdom measures no layout. Those are
**T-12's human check**, recorded here as a declared gap, not silently assumed. R-IUL-002's
`is_active` / `result_status_id` predicates are **server-side** properties of `GET /v2/results` and no
client test can reach them; assert only that the request carries `indicator-codes: [2]` with no
user/center/contract filter, and treat the rest as declared out of reach *(Amendment 03, closing the
gap the attempt-3 audit found in §4)*.
**Done.** Control renders in all four states, each with its own assertion; the error state is proven
card-scoped by the save-path falsifier; falsifiers observed red.

---

### T-10 — The page-owned card  ⟨Antigravity⟩

| | |
| --- | --- |
| Status | `[x]` |
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
The anchor carries `href="/result/<platform_code>-<result_official_code>/general-information"` —
the **HYPHENATED** code, e.g. `/result/STAR-284/general-information`, for **every** platform
(`STAR-`, `PRMS-`, `TIP-`, `AICCRA-`), per `design.md` §6.3's Target row and **DD-13**. Fall back to
the **bare** `result_official_code` **only** when `platform_code` is `NULL`.
**Display and URL are different strings and must not be conflated:** the label is space-joined
(`STAR 284 - title`, per the mock) and the URL is hyphen-joined (`STAR-284`). A space cannot appear
in a URL path segment, and `platformFromResultCodeOrNull`
(`src/app/shared/utils/platform-code.util.ts`) resolves a platform by the **hyphenated** prefix only.
Precedent: `select-linked-results-modal.component.ts:112-130`.
*(This line has now been corrected twice. It first read `/result/<code>/...` — the space-joined
display form — which T-10 attempt 1 implemented literally and FAILed for. It then read "the bare
`result_official_code`", which matched `design.md` but silently misrouted every non-STAR result;
**Amendment 04** is the user's ruling that all four platforms must work.)*
Plus `target="_blank"`, `rel="noopener"`, and a visually-hidden *"(opens in a new tab)"* in its
accessible name.

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
**FALSIFIER (href form) — added 2026-09-09 after attempt 1.** Assert the href for a result **with a
non-null `platform_code`** equals `/result/STAR-284/general-information` exactly — **hyphenated**
*(updated by Amendment 04; it previously asserted the bare `/result/284/…`)*. Add a second case
asserting a **PRMS** result yields `/result/PRMS-284/general-information`, since a bare code would
resolve that to STAR and open the wrong result. Neither mandated
falsifier above could reach the malformed-URL defect (KZ-017): the label falsifier supplies
`platform_code: null`, which is the case that happens to work, and deleting the anchor cannot detect a
*wrong* href. Build the href from `result_official_code` and this spec must go red when it is built
from the space-joined display code instead.
For the **selection-change** path, arrange the **transition** (render with a link, then select a
*different* result through the real `app-select`, then `detectChanges`), never the end state — a
fixture that sets the input before the first `detectChanges` tests a state the product never reaches
(KZ-015), and one that calls the handler directly leaves the `(selectEvent)` binding untested.
*(Corrected 2026-09-09 after attempt 2: this line said "the **remove** path … then **clear**",
leftover draft-2 wording for a path **DD-7 withdrew**. Read literally it prescribes clearing the
card, which is what attempt 2 implemented — and R-IUL-004 Scenario 2 requires the card to
**re-render for the new result**, not disappear. Third paraphrase-drift defect in this spec.)*
**Done.** Card renders from payload in the mock's layout; a soft-deleted target still renders; falsifiers observed.

---

### T-11 — Payload wiring  ⟨Antigravity⟩

| | |
| --- | --- |
| Status | `[x]` |
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
| Status | `[~]` — suite half PASSES (317/317, 6920/6920, all four floors held). Visual half needs the user, and is blocked twice over: **STAR's client is not served anywhere** (the `:4200` front measured earlier belongs to a different project, `Personal/variacion-y-cambio` — Leader error, corrected in `execution.md`) and `environment.dev.ts` points Cognito's redirect at the **deployed** test host, so a locally-served front cannot complete auth. Separately, the migration-dependent items need Migration A applied (B-1's FK, confirmed). **Most likely home: the deployed Dev/test environment after merge + migrations.** |
| Size | M |
| Depends on | T-09, T-10, T-11 |
| Requirements | NFR-IUL-002, NFR-IUL-003, NFR-IUL-004, **D-7** |
| Design | §9 |
| Skills | `ui-ux-pro-max` |

**Scope.** Full client suite; coverage floors (statements 40 / branches 20 / lines 45 / functions 30);
and the **human visual check that no automated gate in this repo can perform**.

**Visual checklist — against the running app, screenshotted:** field position at the end of the card ·
**the picker's error state (Amendment 03 / §6.8): with the options request forced to fail, the error
renders inside the RELATED card, the rest of the section stays visible and editable, a draft save
still succeeds, the empty-list tooltip is absent, and leaving + re-entering the section clears it** ·
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
| Status | `[x]` — all four edits present; item (c) deliberately synced row #4 to `implemented — NOT done` rather than `done`, because `done` would be false while T-12 is `[~]` and both migrations are unapplied. Deviation recorded in `execution.md` and in a note under `family.md`'s table |
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

### T-14 — Repair the two sibling fixture files rule 16 retroactively broke  *(Amendment 02)*

| | |
| --- | --- |
| Status | `[x]` |
| Size | M |
| Depends on | T-02, T-03 |
| Requirements | R-IUL-009 (Scenario: No grandfathering) — **regression protection**, not new behavior |
| Design | §3.3, §11.5 |
| Skills | `nestjs-expert`, `systematic-debugging` |

**Why this task exists.** Migration B's retroactive effect is **intended** (R-IUL-009 Scenario 2,
OQ-1, DD-8) — but it also invalidated two **already-committed** fixture files that encode the
pre-rule-16 expectations as assertions. Measured by the Leader 2026-09-09, in the quiet window:

```
$ npx jest --config ./test/jest-fixtures.json test/fixtures/innovation-use --silent
Test Suites: 2 failed, 15 passed, 17 total
Tests:       17 failed, 110 passed, 127 total
```

| File | Failures |
| --- | --- |
| `test/fixtures/innovation-use/innovation-use-validation.fixture-spec.ts` | 15 |
| `test/fixtures/innovation-use/innovation-use-result-creation.fixture-spec.ts` | 2 |

The spec reasoned about production data throughout (§11.5 even tells the applier to count affected
rows) and never about the fixtures. **No existing task owns this**, which is why it is a task rather
than an advisory.

**Scope.** Restore both files to green **by restoring their test isolation**, not by relaxing their
assertions.

> **This is a correctness fix, not bookkeeping — and the distinction decides how you implement it.**
> A test for rule 2 needs a base result that satisfies *every other rule*, so the rule under test is
> the only variable. Adding rule 16 invalidated those bases. The repair is therefore to **seed a valid
> active role-5 link in the bases that must stay green**, which makes each case measure what its title
> says again. **Never** flip a `TRUE` expectation to `FALSE` merely to make a suite pass — a case that
> genuinely tests a link-less result *should* now expect `FALSE`, but that is a different decision per
> case and must be reasoned, not swept.

**Leader-measured facts that size this** (verified 2026-09-09, not estimated):

| Fact | Value |
| --- | --- |
| TRUE-expecting assertions in the validation file (`grep -c 'toBe(1)\|=== 1\|toBe(true)'`) | **15** — matches its 15 failures 1:1 |
| Same, in the result-creation file | **0** — its 2 failures use different assertion phrasing; **read them, do not assume the shape** |
| Either file writes `link_results`? (`grep -c 'link_results'`) | **0** and **0** — every base lacks a role-5 link *by construction* |
| Shared seed helpers all cases funnel through | `seedResult()` (`:148`), `seedDetail()` (`:160`) |

**So the validation file is one helper, not 15 edits.** Seeding the role-5 link inside the shared
helper (or a small `seedLinkedDev()` it calls) repairs all 15 at once. The result-creation file's 2 are
separate and must be read individually.

**Verify.** `npm run test:fixtures` — **the whole fixture suite**, not just the two files, because the
scratch schema is shared and `maxWorkers: 1` means a repair can perturb a sibling.
**FALSIFIER.** Remove the seeded role-5 link from the repaired base → the repaired cases must go
**red** again. That is what proves the repair restored *isolation* rather than merely silencing a
failure. Report which cases reddened.
**Cannot prove.** That no *other* uncommitted or future fixture depends on the pre-rule-16 behavior.
The suite is the whole population today, but `npm test` will never surface a regression here (§7).
**Disqualifier.** A run taken while any delegated worker is active is not evidence — the fixture suite
holds a real MySQL connection to the shared scratch schema.
**Done.** `npm run test:fixtures` green; the falsifier observed red; every case that legitimately now
expects `FALSE` documented in-file with the reason.

---

## 4. Requirement → task closure

> Closure is at **scenario and clause** granularity, not requirement ID. A gap may **not** be
> discharged by citing a different requirement.

| Requirement | Scenarios / clauses | Owned by |
| --- | --- | --- |
| R-IUL-001 | One result linked; Replacing; reactivation clause; other-roles clause | T-06, T-11 |
| R-IUL-002 | Only Innovation Dev, all of them; both `BUT`/`MUST NOT` clauses | T-09 |
| R-IUL-003 | Empty and required; the draft-save `BUT`; the same-token `AND IT MUST` | T-09 (+ T-12 visual) |
| R-IUL-004 | Selected card; **Changing the selection (the card re-renders for the new result — not merely cleared)**; Amendment 04's four URL clauses; both `BUT`/`MUST` clauses | T-10 |
| R-IUL-005 | Atomic with the section; the manager clause | T-06 |
| R-IUL-006 | Wrong indicator; Inactive target; Self-reference; the pre-`BEGIN` clause | T-06 |
| R-IUL-007 | Read-back; all four clauses | T-07 |
| R-IUL-008 | Omitted preserves; Explicit null clears; the "different paths" `BUT` | T-06 (server), T-11 (client) |
| R-IUL-009 | Rule 16; No grandfathering; all `MUST NOT` clauses | T-02 (shape), **T-03 (behavior)**, **T-14 (regression protection of rules 2–15 after the retroactive break)** |
| R-IUL-010 | Seed; the enum-not-literal clause | T-01 |
| R-IUL-011 | Ordering; the ANSI `BUT` clause | §5 runbook + T-01 |
| R-IUL-012 | All four states; the enabled-but-empty `BUT`; **Amendment 03's four error clauses — card-scoped, distinct from empty, never blocking save/navigation, control stays mounted** | T-09 |
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
| **R-9** | **§9's "Cardinality" falsification row is owned by NO task, and this is a recorded accepted gap rather than a minted one** *(found by the T-06 review, 2026-09-09)*. `design.md` §9:502 requires: *save `A`, save `B`, assert exactly one active row; then clear, re-select `A`, assert the **same** `link_result_id` was reactivated*. That is a **database** property and every T-06 test is mocked. T-06's Cannot-prove cited T-03's fixture harness for it; T-03 covers **rule 16 only**, so the citation did not resolve. **Why it is accepted rather than turned into a task:** an advisory may not mint scope in this spec, and the exposure is bounded on both sides — the *mechanism* is tested (`array.util.spec.ts` asserts PK-preserving reactivation, `is_active === true && id === 1`), the role-scoping half holds by construction (`base-service.ts` builds `updateWhere` with `{ [this.roleKey]: dataRole }` and `LinkResultsService` passes `'link_result_role_id'`), and rule 16 uses `EXISTS` (DD-5), so **even a doubled row leaves the green check correct and the UI showing one link**. What remains unproven is only that the two composed factors behave as expected against real MySQL. **A fixture task closing it is the user's call** — it would be a sibling of T-03 in the `test:fixtures` suite, and per FP-45 it would need its own `result_official_code` band | User decision — recorded, not scheduled |
| **R-10** | **§3.2's concurrent-PATCH race (A8) is now REACHABLE through T-06's code**, so its acceptance should be read as **live rather than prospective** *(T-06 review, 2026-09-09)*. Reaching sequence: two overlapping PATCHes of the same result with different targets; each `create` computes `persistId` from what it can see, each deactivates, each inserts, committing **two active role-5 rows** — there is no unique index on `(result_id, link_result_role_id, is_active)`, and `link_results` carries only its PK and FKs. Already accepted in `requirements.md` R-IUL-001's bounded-by-design note and `design.md` §3.2, with the rationale that a partial unique index is not expressible in MySQL, a full one would break the soft-delete history, and the exposure is one user double-submitting one section. Rule 16's `EXISTS` keeps the green check correct | Accepted (unchanged); recorded as live |
| **R-7** | **Nothing in this repo verifies that the server boots** *(found at T-05, 2026-09-09)*. `npm run test:e2e` — the only spec importing the real `AppModule` and calling `app.init()` — crashes with `RangeError: Maximum call stack size exceeded` in `InstanceWrapper.cloneStaticInstance`. **Genuinely pre-existing — re-verified by FILE-REVERT, not by stash.** *(Amendment 06: the original
claim said "stash-verified", and that citation had to be withdrawn — a `git stash push -u` earlier in
this task **silently failed** to stash, because a `git add -N` entry was present, so a probe ran
against an unchanged tree while appearing to test a clean one. Re-measured by backing up the four
touched files, `git checkout HEAD --` on the three tracked ones, parking the untracked one outside the
repo, and confirming `forwardRef` count = 0 before running: the `RangeError` reproduces. A gate that
can silently no-op is not a gate — K-004.)* **Outside this spec's scope**; recorded so it is owned somewhere rather than rediscovered | Kaizen / backlog — **not** this spec |
| **R-8** | **T-05 introduced a boot-order dependency, and this row is a correction** *(2026-09-09, Amendment 06)*. Amendment 05 recorded `Nest cannot create the ResultPolicyChangeModule instance. The module at index [0] … is undefined` as *"pre-existing"* on the worker's report. **It is not** — measured by reverting T-05's three tracked files to `HEAD` and re-running the same no-override probe, which throws a **different** error entirely (`ResultInstitutionTypesService … DataSource at index [0]`, just the probe's missing stub). T-05's new `LinkResultsModule` import creates the entry point: `result-innovation-use.module` → `link-results.module` → `results.module` → `result-policy-change.module` → back to `link-results.module` **in flight**, so its `imports[0]` resolves `undefined`. **Production is unaffected because `entities.module.ts` imports `results.module` at `:4` and `result-innovation-use.module` at `:48`** — the safe order. That ordering was incidental before T-05 and is a **boot invariant** after it. It is asserted in
`entities.module.spec.ts` — **on the import-STATEMENT order, which is the causal list**, not on the
`imports` array. *(Amendment 06: the first version of this gate asserted the array and was **blind**.
TypeScript emits every `require()` in statement order, all before the `@Module({...})` literal is
constructed, so the array cannot influence require order. Measured: moving only the import statement
reverses the real order and the array-order gate stayed **4/4 green** — its apparent falsifier had been
firing on the non-causal half of the mutation. The statement-order gate reddens on exactly that
statement-only mutation, observed 2026-09-09.)* **Consequence to remember:** entering this module graph anywhere but `AppModule` still fails, so any future module-compile spec here needs stand-ins | Recorded; the invariant is asserted, the graph fragility is Kaizen/backlog |
| **R-6** | **T-09's attempt budget is restored to 3 by Amendment 03**, and this is a deliberate exception to the 3-attempt ceiling, recorded rather than quietly taken. Grounds: attempt 3's blocking FAIL was for behavior its **own brief instructed** — the attempt-2 Reviewer had ruled the page-level routing *"not a violation… R-IUL-012:379 literally prescribes it"* and routed it as a design-level advisory, and the Leader then hardened that into the brief (`execution.md:1100`). Three attempts were spent guessing at a clause the spec never specified. The ceiling exists to stop repeated attempts at the *same* misunderstanding; here the misunderstanding was **in the text**, and the text is now fixed. **The restored budget is contingent on the corrected text** — a FAIL against §6.8/DD-12 as now written is an ordinary FAIL and the ceiling binds normally | Leader (user-approved 2026-09-09) |

---

## 6. Budget reconciliation

| Metric | Budget (design §12) | Planned | Δ |
| --- | --- | --- | --- |
| Tasks | 12 | **14** | **+2** — T-13 had no home until Judgment Day (A11) found it; **T-14 added by Amendment 02**, user-approved 2026-09-09, for a consequence of Migration B that no task owned and that §7's original gate could not detect. Both recorded rather than absorbed |
| LOC | ~1,250 | ~1,250 | — |
| Review rounds | ~20 | ~20 | — |

`/akili-execute` trips on the **design** numbers. The +1 is declared here so the first tick is not
mistaken for a runaway.

---

## 7. Done definition

- [ ] All **14** tasks `[x]`, each with its Reviewer PASS recorded in `execution.md` **before** the box
      is flipped — the committed `PreToolUse` hook blocks the write otherwise, and a block is not a bug
- [ ] Server **unit** suite green, 60% floor held — `npm test -- --silent`
- [ ] Server **fixture** suite green — `npm run test:fixtures`

> **Amendment 02 split that gate because it could not see its own subject.** `npm test` sets
> `rootDir: "src"` (`package.json:131`), and every fixture lives under `test/fixtures/` matching
> `.fixture-spec.ts$` — collected **only** by `npm run test:fixtures`. So *"Server suite green"*
> verified by `npm test` was **structurally incapable of observing the breakage this spec's own
> Migration B causes**, and would have reported 358/358 green all the way to archive while the fixture
> suite sat red at 17/127. That is KZ-017 at the level of the spec rather than a task. **T-03 — the
> only proof of rule 16 — lives in the suite the old gate could not reach**, which is what made the
> omission load-bearing rather than cosmetic.
- [ ] Client suite green, all four floors held
- [ ] T-03's fixture observed **red pre-migration** and green post-migration
- [ ] Every falsifier in §3 observed red at least once
- [ ] T-12's screenshots attached for light **and** dark
- [ ] Both migrations applied by the user, per §11.1's order
