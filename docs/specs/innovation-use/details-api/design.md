# Design — Results (Innovation Use) / Details API

- **Module:** results (`innovation-use`)
- **Spec id:** 2026-08-innovation-use-details-api
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked TRD sections:** [`docs/trd/trd.md`](../../../trd/trd.md) §4.1, §5.2, §6.1–6.2, §7.1, §12, §2.4 (ADR-2, ADR-4, **ADR-11**, ADR-12)
- **Parent spec:** [`../family.md`](../family.md) — chunk 2 of 3
- **Depth:** Full
- **Last updated:** 2026-08-20

---

## Document Control

| Field | Value |
| --- | --- |
| Type | Change |
| Approval Mode | gated |
| Migrations shipped | **zero** (DD-4) |
| New Nest modules | 2 — `ResultInnovationUseModule`, `ClarisaInnovationUseLevelsModule` |
| Existing files modified | **8** *(corrected 2026-08-20 at `/akili-validate`: the cell said **6** while already enumerating **seven**, and the tree has **eight** — `results.module.ts` is modified for T-08's DI edge and appeared in neither the count nor §2.1. Third correction of this one figure: 4 → 6 → 8, each time by a different reader. A count nobody can restate correctly twice is a symptom that it should be derived, not asserted)* — `results.service.ts`, `main.routes.ts`, `clarisa.routes.ts`, `result-actors.service.ts` + `result-institution-types.service.ts` (additive methods), **the two module-graph files `entities.module.ts` + `clarisa.module.ts`, and `results.module.ts`** (T-08's DI edge) *(count corrected 2026-08-19, T-07 Pivot — the two module-graph files were missing from §2.1, which is the defect DD-15 records)* |
| Budget | see §12 — **13 tasks · ~2,400 LOC · ~24 review rounds** *(re-baselined from 6–8 at execution time, 2026-08-19, user ruling — see §12)* |
| Reversion challenge run | 1 (DD-12, the C-4 cleanup) — **found a concrete breakage; design narrowed** (§11.1) |

---

## Executive Summary

Mirror `result-innovation-dev` — same route depth, same `@Get`/`@Patch` pair on `RESULT_CODE`, same single-transaction save, same role-discriminated reuse of the three shared child tables. Add a control-list module for the 0–9 catalog. Add two lines to `ResultsService.createResultType`.

Three things this design does **not** copy from the reference module, each because copying would be wrong:

| Reference does | This design does | Why |
| --- | --- | --- |
| No `@UsePipes(ValidationPipe)` | **Adds it, deliberately without `forbidNonWhitelisted`** | There is no global pipe (DD-8). Without `@UsePipes` every `class-validator` decorator is inert. Without dropping `forbidNonWhitelisted`, a client-sent `total` would 400 instead of being ignored |
| Counts nothing — Innovation Dev's actor data is four booleans | Writes five `int` columns under a two-mode invariant | The two indicators genuinely differ (family FR-1) |
| Filters `result_actors` by role on write but the *stored function* does not filter at all | Filters by role **everywhere**, read and write | Family DD-4: correctness must not rest on "a result has one indicator" |

The riskiest surface is not the new module — it is the three **deactivate** predicates inside the write transaction. Each one, if it drops its role key, silently wipes Innovation Dev data. That is why §10's gate is a real MySQL, not a mocked repository.

---

## 1. Goals & Non-Goals

**Goals**

| # | Goal | Requirements |
| --- | --- | --- |
| G1 | One load call and one save call for the whole section | R-IUA-002, R-IUA-003 |
| G2 | Server-enforced rules that the client cannot bypass | R-IUA-004, R-IUA-005, R-IUA-006, R-IUA-007, R-IUA-008 |
| G3 | Writes that are provably invisible to Innovation Dev | R-IUA-009 |
| G4 | An indicator-6 result that can be created, completed and submitted | R-IUA-001, R-IUA-011, R-IUA-012 |
| G5 | A catalog the client can render by scale point without knowing the id encoding | R-IUA-010 |

**Non-goals**

- Any schema change, any migration (DD-4).
- Any `client/` change.
- Refactoring `result-innovation-dev`, `ControlListBaseService`, or `BaseServiceSimple`. Their quirks are worked **around**, documented, and left in place.
- Fixing the repo-wide absence of a global `ValidationPipe` (DD-8) — named, scoped to this module only.
- Adding a `@Roles` model to result sections (DD-5).
- AI formalization for indicator 6.

---

## 2. Architecture

```
                    PATCH/GET /api/v1/results/innovation-use/:resultCode
                                        │
                        ┌───────────────▼────────────────┐
                        │ ResultInnovationUseController  │  SetUpInterceptor
                        │  @GetResultVersion()           │  ResultStatusGuard (PATCH)
                        │  @UsePipes(ValidationPipe)     │  ← DD-8
                        └───────────────┬────────────────┘
                                        │
                        ┌───────────────▼────────────────┐
                        │ ResultInnovationUseService     │
                        │  ONE dataSource.transaction    │
                        └──┬─────────┬─────────┬──────┬──┘
                           │         │         │      │
        ┌──────────────────▼──┐ ┌────▼──────┐ ┌▼──────────────┐ ┌▼──────────────┐
        │ ResultActorsService │ │ResultInst-│ │ResultQuantif- │ │UpdateDataUtil │
        │ customSaveInnovat-  │ │itutionType│ │icationsService│ │ (last updated)│
        │ ionUse()   role=2   │ │ Service   │ │ upsertBy      │ └───────────────┘
        └─────────────────────┘ │  role=2   │ │ CompositeKeys │
                                └───────────┘ │  role=3       │
                                              └───────────────┘

  GET /api/v1/tools/clarisa/innovation-use-levels
        └── ClarisaInnovationUseLevelsController (extends BaseController)
              └── ClarisaInnovationUseLevelsService (extends ControlListBaseService)
                    └── overrides findAll() to add ORDER BY level   ← DD-6
```

**Green checks are absent from this diagram on purpose.** They are computed on read by `GreenChecksService.findByResultId`, which chunk 1 already wired for indicator 6. This chunk calls nothing there (DD-7 / R-IUA-012).

### 2.1 Composition

| Path | Responsibility | New? |
| --- | --- | --- |
| `domain/entities/result-innovation-use/result-innovation-use.controller.ts` | HTTP edge — `@Get`/`@Patch` on `RESULT_CODE` | new |
| `domain/entities/result-innovation-use/result-innovation-use.service.ts` | Read assembly, write transaction, cross-field validation, total derivation | new |
| `domain/entities/result-innovation-use/result-innovation-use.module.ts` | Nest module; imports the three child modules. **No catalog-module import:** T-06 reaches the catalog via `dataSource.getRepository(ClarisaInnovationUseLevel)` (the entity is loaded by `orm.config.ts`'s entity glob, not by a Nest provider), so no DI edge exists and an import would be dead — corrected 2026-08-19 at T-07's review | new |
| `domain/entities/result-innovation-use/dto/create-result-innovation-use.dto.ts` | Section DTO + nested actor / organization / quantification DTOs | new |
| `domain/entities/result-innovation-use/dto/update-result-innovation-use.dto.ts` | `PartialType(...)`, mirroring the reference module | new |
| `domain/entities/result-innovation-use/entities/result-innovation-use.entity.ts` | — | **exists** (chunk 1) |
| `domain/tools/clarisa/entities/clarisa-innovation-use-levels/clarisa-innovation-use-levels.{service,controller,module}.ts` | Catalog control list | new |
| `domain/routes/main.routes.ts` | `+ { path: 'innovation-use', module: ResultInnovationUseModule }` in `ResultsChildren` | modified |
| `domain/entities/entities.module.ts` | `+ ResultInnovationUseModule` in `imports` — **mandatory and distinct from the route node** (DD-15) | modified |
| `domain/entities/results/results.module.ts` | `+ ResultInnovationUseModule` in `imports` — a **DI edge**, because T-08 makes `ResultsService` inject `ResultInnovationUseService`. Distinct in purpose from the `entities.module.ts` row above: that one instantiates the module, this one resolves a dependency *(row added 2026-08-20 at `/akili-validate` — omitted from this table even after DD-15 re-audited it for exactly this class of omission)* | modified |
| `domain/tools/clarisa/routes/clarisa.routes.ts` | `+ { path: 'innovation-use-levels', module: ClarisaInnovationUseLevelsModule }` | modified |
| `domain/tools/clarisa/clarisa.module.ts` | `+ ClarisaInnovationUseLevelsModule` in `imports` — **mandatory and distinct from the route node** (DD-15) | modified |
| `domain/entities/result-actors/result-actors.service.ts` | `+ customSaveInnovationUse()` | modified, additive |
| `domain/entities/result-institution-types/result-institution-types.service.ts` | `+ customSaveInnovationUse()` | modified, additive |
| `domain/entities/results/results.service.ts` | `+ case INNOVATION_USE` in `createResultType`; `+ INNOVATION_USE` in `ipAvailables` | modified, additive |
| `test/fixtures/innovation-use/*.fixture-spec.ts` | F-A … F-E | new |

**No file under `domain/shared/` is added or changed.** Nothing here is reusable by a second module yet (server guide §3 rule 3).

### 2.2 Reuse

| Consumed | From | Notes |
| --- | --- | --- |
| `ResultsUtil` + `RESULT_CODE` + `@GetResultVersion()` | `shared/utils`, `shared/decorators` | Identical wiring to the reference controller |
| `ResultStatusGuard` | `shared/guards` | PATCH only. Note it **bypasses for `SYSTEM_ADMIN` / `TECHNICAL_SUPPORT` / `CENTER_ADMIN`** and otherwise allows only DRAFT / REVISED / SCIENCE_EDITION / KM_CURATION |
| `CurrentUserUtil.audit(SetAuditEnum.*)` | `shared/utils` | Every write |
| `ResponseUtils.format` | `shared/utils` | Every handler |
| `UpdateDataUtil.updateLastUpdatedDate` | `shared/utils` | End of the write transaction, **inside** it |
| `ResultQuantificationsService.upsertByCompositeKeys` | `result-quantifications` | The OICR pattern, with the `manager` argument OICR omits (DD-10) |
| `BaseController` / `ControlListBaseService` | `shared/global-dto` | Catalog, with one override (DD-6) |
| `ClarisaActorTypesEnum.OTHER = 5` | clarisa tool | Identity rule for duplicate detection |
| `selectManager`, `setNull`, `isEmpty` | `shared/utils` | As the reference service uses them |

`ResultQuantificationsService.upsertQuantificationsByRole` exists with **zero callers**. This design uses `upsertByCompositeKeys` instead, because that is the method OICR proved in production against the same table and the same composite key. The unused method is left alone — deleting it is out of scope (DD-11).

---

## 3. Data Model

**No changes.** Every column is chunk 1's. Recorded here only as the contract this design binds to:

| Table | Columns this chunk touches | Discriminator |
| --- | --- | --- |
| `result_innovation_use` | `result_id` (PK+FK), `innovation_use_level_id`, `innovation_use_level_explanation`, audit | — (one row per result) |
| `clarisa_innovation_use_levels` | `id`, `level`, `name`, `definition` | read-only. **`id = level + 1`** |
| `result_actors` | `actor_type_id`, `actor_type_custom_name`, `sex_age_disaggregation_not_apply`, `women_youth_count`, `women_not_youth_count`, `men_youth_count`, `men_not_youth_count`, `actors_count` | `actor_role_id = 2` |
| `result_institution_types` | `institution_id`, `institution_type_id`, `sub_institution_type_id`, `institution_type_custom_name`, `is_organization_known`, `organization_count` | `institution_type_role_id = 2` |
| `result_quantifications` | `quantification_number`, `unit`, `description` | `quantification_role_id = 3` |

The four legacy booleans on `result_actors` (`women_youth`, `women_not_youth`, `men_youth`, `men_not_youth`) are **never read and never written** by this chunk. Innovation Dev owns them.

No `@OpenSearchProperty` decoration is added — family D-8, and ADR-6's amendment (the results index reflects off `ResultOpensearchDto`, not the entity, so entity decoration ships dead).

---

## 4. API Surface

### GET `/api/v1/results/innovation-use/:resultCode`

- **Controller:** `result-innovation-use.controller.ts`
- **Roles:** none (DD-5) · **Guards:** JWT (global middleware) · **Interceptors:** `SetUpInterceptor`
- **Path tokens:** `RESULT_CODE` = `:resultCode(\d+)`, resolved by `@GetResultVersion()`
- **Response `data`:**

```
{
  innovation_use_level_id: number | null,
  innovation_use_level: number | null,          // the resolved scale point — DD-9
  innovation_use_level_explanation: string | null,
  actors: Array<{
    result_actors_id, actor_type_id, actor_type_custom_name,
    sex_age_disaggregation_not_apply,
    women_youth_count, women_not_youth_count, men_youth_count, men_not_youth_count,
    actors_count,
    total: number | null                        // DERIVED — never stored, never accepted
  }>,
  organizations: Array<{
    result_institution_type_id, institution_id, institution_type_id,
    sub_institution_type_id, institution_type_custom_name,
    is_organization_known, organization_count
  }>,
  quantifications: Array<{ id, quantification_number, unit, description }>
}
```

- **Swagger:** `@ApiTags('Results Innovation Use')`, `@ApiBearerAuth`, `@ApiOperation`
- **Errors:** `401` unauthenticated · `404` result not found (raised by `ResultsUtil.setup`)

### PATCH `/api/v1/results/innovation-use/:resultCode`

- **Guards:** JWT, `ResultStatusGuard` · **Pipes:** `@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))` — **`forbidNonWhitelisted` deliberately omitted** (DD-8)
- **Body DTO:** `CreateResultInnovationUseDto`
- **Response `data`:** identical shape to the GET, re-read post-commit
- **Swagger:** the three above **plus `@ApiBody({ type: CreateResultInnovationUseDto })`**
- **Errors:**

| Status | Cause | `errors` payload |
| --- | --- | --- |
| `400` | class-validator failure (negative/fractional count, mode conflict, missing `actor_type_id`) | class-validator's array, with nested index paths |
| `400` | duplicate actor type | `['actor_type_id: duplicate actor type in payload — <type>']` |
| `400` | missing justification at `level >= 6` | `['innovation_use_level_explanation: required when the innovation use level is 6 or above']` |
| `400` | `innovation_use_level_id` resolves to no catalog row | `['innovation_use_level_id: unknown innovation use level']` — added T-06 attempt 2. Raised **before `BEGIN`** (DD-3); without it an unknown id reached the FK constraint and surfaced as a `500` carrying TypeORM's raw SQL and constraint name, since `GlobalExceptions` has no `QueryFailedError` branch |
| `400` | a submitted `result_actors_id` or `result_institution_type_id` does not belong to a row already scoped to BOTH the calling `result_id` AND `actor_role_id`/`institution_type_role_id = INNOVATION_USE` (wrong result, wrong role, or unknown) | `['result_actors_id: unknown or unauthorized actor row — <id>']` or `['result_institution_type_id: unknown or unauthorized organization row — <id>']` — added 2026-08-20, `validation-report.md` FAIL-1. Raised inside `customSaveInnovationUse` on each shared child service, **before that method's own writes**, but **inside `BEGIN`** rather than before it: unlike the rules above, this one needs a DB read scoped by the calling result and role, and the two child services only ever receive an already-open transaction `manager` — moving the check earlier would require the orchestrating service to duplicate it before dispatching to the child services, out of scope for this fix. A thrown exception here still rolls back everything already written in steps 6+ (DD-3's "a failure persists nothing" holds as a property of the whole transaction, not of statement order alone). Without this check, a caller-supplied primary key reached `tempRepo.save(...)` unchecked and could silently rewrite another result's Innovation Use row (cross-result) or this same result's own Innovation Dev row (cross-role) — see R-IUA-009 |
| `400` | **two organization rows, or two actor rows, submitting the same primary key** | `['result_actors_id: same id submitted by more than one row — <id>']` or `['result_institution_type_id: same id submitted by more than one row — <id>']` — added 2026-08-20 (Reviewer advisory, fixture-gated in `innovation-use-edit-plus-add-id-collision.fixture-spec.ts`). Deliberately a **different message** from the unauthorized-id row above: both ids may be genuinely owned, so this is not an authorization failure but an unsatisfiable request — there is no correct merge for "one row asked to become two different things". Raised inside `assertInnovationUseOwnership`, against the RAW payload, before the DB round-trip. *(**Row added 2026-08-20 at `/akili-validate`, FAIL-4.** The behaviour shipped, was unit-proven and fixture-proven, and appeared in no contract table and no AC — and six sites, two of them shipped `src/` doc comments, cited "§15" for the distinct-message rule, which §15 never stated. This is the row those citations should point at.)* |
| `400` | **an organization row that identifies no organization** — neither `institution_type_id` nor `is_organization_known` + `institution_id` | `['organizations.<i>.institution_type_id: an organization row must identify its organization — supply institution_type_id, or is_organization_known together with institution_id']` — added 2026-08-20, `validation-report.md` **FAIL-1**, R-IUA-007 AC.6. Raised in `ResultInnovationUseService.validateOrganizationsAreIdentified`, **before `BEGIN`** (so unlike the two rows above it needs no rollback). Without it the row reached `constructWhereClause`, whose three `if` branches are all false for such a payload, degenerating the predicate to `{ result_id, institution_type_role_id }` — an arbitrary sibling row's PK was adopted and overwritten with nulls while the rest of the section was deactivated, on a `200` |
| `400` | `ResultStatusGuard` rejection | the guard's fixed status-list message |
| `404` | no `result_innovation_use` row | `Result with ID <id> not found` |

> **Why `400` and not `403` for the guard:** `ResultStatusGuard` throws `BadRequestException`, not `ForbiddenException`. `requirements.md` R-IUA-003 AC.5 says "returns `403`" — **that AC is corrected here to `400`**, matching the guard's actual behavior. Changing the guard would alter every result-mutation endpoint in the platform and is out of scope. Swept into `requirements.md` in the same edit (see §15).

### GET `/api/v1/tools/clarisa/innovation-use-levels`

- **Controller:** `clarisa-innovation-use-levels.controller.ts` extending `BaseController`
- **Swagger:** `@ApiTags('Clarisa')`, `@ApiBearerAuth` — **no `@ApiOperation`**: the handler is inherited unchanged from `BaseController`, and `@ApiOperation` is a method decorator that throws when applied at class level, so adding it would require a `find()` override this module's Scope forbids (DD-13)
- **Response `data`:** `ClarisaInnovationUseLevel[]`, **ordered by `level` ASC** (DD-6)
- **Errors:** `401`

---

## 5. Workflows & Business Rules

### 5.1 The write transaction — exact order

Order is load-bearing. Validation runs before any write **for the payload-shape and cross-field rules (steps 3–4)**, so R-IUA-003 AC.2 ("a failure persists nothing") holds for those **by ordering**. **The ownership check (steps 7a/8a) is the one exception and holds by rollback** — see **DD-3**'s recorded exception. *(Corrected 2026-08-20: this sentence previously read "Validation runs **entirely before** any write … without relying on rollback", which the FAIL-1 remediation made **false** — the ownership gate runs after step 6 has executed inside the transaction. Two other sections asserted the correct thing while this one did not; the sweep is what found it.)*

```
1  ValidationPipe            per-field + per-row rules (DD-8)
2  service: load detail row  404 if absent
3  service: resolve level    effective_level_id = KEY PRESENT ? payload.level_id : stored.level_id   (DD-14)
                             — NOT `??`: an explicit null is a *present* key and must clear,
                                not fall through to the stored value
                             JOIN clarisa_innovation_use_levels ON id = :effective_level_id → level
4  service: validate         a) level >= 6 ⇒ effective explanation non-blank, where
                                effective_explanation = KEY PRESENT ? payload.explanation
                                                                    : stored.explanation   (R-IUA-006, DD-14)
                             b) no duplicate actor identity              (R-IUA-005)
   ── any failure above throws BadRequestException. Nothing has been written. ──
5  BEGIN TRANSACTION
6    UPDATE result_innovation_use  SET level_id, explanation, audit(UPDATE)
7    ResultActorsService.customSaveInnovationUse(resultId, actors, manager)
7a     └─ assertInnovationUseOwnership  FIRST statement, before any write here.
                                        Every payload result_actors_id must name a row
                                        already scoped to (result_id = this result,
                                        actor_role_id = INNOVATION_USE). Anything else
                                        → 400, whole transaction rolled back.
                                        Holds by ROLLBACK, not ordering — DD-3's one
                                        recorded exception.
8    ResultInstitutionTypesService.customSaveInnovationUse(resultId, orgs, manager)
8a     └─ assertInnovationUseOwnership  same rule on result_institution_type_id against
                                        (result_id, institution_type_role_id = INNOVATION_USE)
9    ResultQuantificationsService.upsertByCompositeKeys(
         resultId, quantifications,
         ['quantification_number','unit','description'],
         QuantificationRolesEnum.INNOVATION_USE, manager)
10   UpdateDataUtil.updateLastUpdatedDate(resultId, manager)
11 COMMIT
12 re-read via the same assembly the GET uses → response data
```

Steps 7–9 each carry their role discriminator in **every** predicate — the `find`, the `save`, and above all the deactivating `update`. ⚠️ **This sentence is FALSE and is retained only because two successive corrections of it are recorded below** *(second correction 2026-08-20)*. Two of the three predicates it names do not have the property: the id-present `save` is PK-keyed with the role **assigned** (pre-validated instead, see the annotation below), and **step 9's** `upsertByCompositeKeys` deactivation is `update({ [primaryKey]: In(idsToDeactivate) }, …)` — no role column, not a PK save. **Step 9 is safe, but the safety lives in the `find` that produced `idsToDeactivate`** (scoped `(result_id, role)`), not in the `update`'s own predicate — so deleting the role key from *that read* widens the deactivation with no local sign of it here. The accurate one-line statement: *every deactivate predicate is either role-scoped itself, or keyed on primary keys that a role-and-result-scoped read or guard produced first.*

> **This sentence was FALSE for the `save` until 2026-08-20, and that was the defect.** The id-present branch of steps 7 and 8 built a PK-keyed `save` that carried **no `result_id`** and **assigned** the role rather than filtering by it — so it named no discriminator in that predicate at all. The sentence asserted exactly the property the code violated, sat in the section that enumerates the write order, and survived 24 review rounds. **It is still NOT true of the `save`, and my earlier correction of this paragraph wrongly said it was.** *(Corrected again 2026-08-20, second pass.)* Steps 7a/8a are a **precondition check**, not a predicate: the id-present `save` remains a PK-keyed `UPDATE` in which the role is **assigned**, not filtered. What the remediation restored is **rejection before write**, via a role-and-result-scoped authorization read — a different and arguably stronger mechanism, but not the one this sentence describes. **The accurate statement is:** every *deactivate* predicate names the role column; the *id-present save*'s predicate is the primary key, pre-validated against `(result_id, role)` before it executes. **That I asserted "true now" while fixing this exact error class is the fourth occurrence of it in this spec, and the first one I authored — the pattern is that the number gets corrected and the sentence does not.** *Recorded because a design document asserting a property the code does not have is the most expensive kind of error in this methodology: every reader downstream, human and agent, treats it as verified.*

### 5.2 Actor reconciliation — `customSaveInnovationUse`

Mirrors `ResultActorsService.customSaveInnovationDev` with three changes and one thing kept identical. *(Citation converted from `result-actors.service.ts:88-152` to an anchor, 2026-08-20: that method now begins at 91, moved by this spec's own edits to the same file — precisely the failure mode `src/CLAUDE.md` §9's amended **FP-50** describes.)*

| Aspect | Innovation Dev (reference) | Innovation Use (this design) |
| --- | --- | --- |
| Role | `ActorRolesEnum.INNOVATION_DEV` | `ActorRolesEnum.INNOVATION_USE` **in every read and deactivate predicate**; on the id-present `save` the role is *assigned*, and the caller's PK is pre-validated against `(result_id, role)` instead *(corrected 2026-08-20 — said "in every predicate", which the save does not do)* |
| Data columns | four booleans | five `int` counts |
| `OTHER` handling | `actor_type_custom_name` kept only when `actor_type_id == OTHER` | **identical** — kept verbatim |
| Deactivate step | `update({ result_id, is_active: true, actor_role_id: INNOVATION_DEV }, { is_active: false })` then `save` | same shape, role 2 |

**Mode normalisation on write.** Validation has already rejected a row populating both modes, so the service writes the non-selected side as explicit `NULL`:

| `sex_age_disaggregation_not_apply` | Written | Nulled |
| --- | --- | --- |
| `TRUE` | `actors_count` | the four `*_count` |
| `FALSE` / `NULL` | the four `*_count` | `actors_count` |

This matters on **edit**: a user who switches a saved row from disaggregated to aggregate must not leave four stale counts behind for `innovation_use_validation` to read.

**Why bespoke rather than `BaseServiceSimple.create()`.** `create()` reconciles on one `generalCompareKey` and copies only the columns listed in `otherAttributes`. Innovation Use rows have two identity shapes (`actor_type_id`, or `OTHER` + custom name) and five payload columns whose nulling depends on a sixth. Innovation Dev needed a bespoke method for the smaller version of exactly this problem. Following it is the low-surprise choice.

### 5.3 Organization reconciliation — `customSaveInnovationUse`

Mirrors `ResultInstitutionTypesService.customSaveInnovationDev` and its five private helpers *(citation converted from `result-institution-types.service.ts:115-135` to an anchor, 2026-08-20 — rotted the same way)*, role 2, plus `organization_count` carried through `buildUpdateData` / `buildDataTemplate`. `removeDuplicates`' key strategy (`other_` / `sub_` / `type_` / `institution_`) is reused unchanged.

### 5.4 Quantification reconciliation

`upsertByCompositeKeys` already deactivates by `{ result_id, quantification_role_id }` and reactivates a matching soft-deleted row rather than inserting a duplicate. Role 3 is passed as `dataRole`. **The `manager` argument is passed** — OICR omits it, so OICR's quantification writes sit outside its transaction. That is a pre-existing inconsistency this chunk does not inherit and does not fix (DD-10).

### 5.5 Total derivation

Read-side only, per row:

```
sex_age_disaggregation_not_apply === true
    → total = actors_count
otherwise
    → total = sum of the four *_count, treating NULL as absent;
      if all four are NULL → total = null   (not 0 — the user has entered nothing)
```

`total` is stripped from the DTO. `whitelist: true` on the pipe removes any client-sent `total` before the service sees it — which is precisely why `forbidNonWhitelisted` must stay off (DD-8).

### 5.6 Catalog ordering

`ControlListBaseService.findAll()` issues no `order` clause. `ClarisaInnovationUseLevelsService` **overrides `findAll()`** to add `order: { level: 'ASC' }`. It exposes no `findByName`-based lookup, and no code in this chunk resolves a level by name (R-IUA-010 AC.6) — catalog names repeat in pairs across adjacent levels.

### 5.7 Result creation

```ts
// results.service.ts — createResultType(), additive
case IndicatorsEnum.INNOVATION_USE:
  await this._resultInnovationUseService.create(resultId, manager);
  break;

const ipAvailables = [
  IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
  IndicatorsEnum.INNOVATION_DEV,
  IndicatorsEnum.INNOVATION_USE,   // ← R-IUA-011
];
```

`ResultInnovationUseService.create(resultId, manager?)` mirrors the reference `create()` exactly — a `save` of `{ result_id, audit(NEW) }` through `selectManager`.

This adds `ResultInnovationUseModule` to `ResultsModule`'s imports. `ResultInnovationDevModule` is already imported there, so the pattern and the circular-import risk profile are known.

---

## 6. Frontend Impact

**None.** No admin SSR page. No `client/` change — chunk 3 owns that, and this spec never edits it.

---

## 7. Integration Impact

**None.** No CLARISA call (the catalog is the locally seeded table — family D-1). No OpenSearch, Socket.IO, RabbitMQ, DynamoDB, AGRESSO, TIP. No new env var. No cron.

---

## 8. Security & Authorization

| Question | Answer |
| --- | --- |
| Who can call these? | Any authenticated principal. No `@Roles` (DD-5) |
| Write restriction | `ResultStatusGuard`: bypass for `SYSTEM_ADMIN` / `TECHNICAL_SUPPORT` / `CENTER_ADMIN`; otherwise the result must be DRAFT, REVISED, SCIENCE_EDITION or KM_CURATION |
| Machine tokens | Reach these routes exactly as they reach every other `/api` route. No `app_secrets` or `app_secret_host_list` change |
| New secrets | None |
| PII | Actor **counts**, not identities. No named persons. No new PII class |
| Exclude list | Unchanged — no route is added to `AppModule`'s JWT exclusions |

**`whitelist: true` is a security-relevant choice, not only ergonomic.** It strips unmapped properties, so a crafted body cannot reach `save()` with a column the DTO does not declare — including `is_active`, `result_id` or the audit columns.

---

## 9. Observability

- `CgiarLogger` instance on the service, matching `ResultInnovationDevService`.
- `warn` on a rejected save, with `result_id` and the rule that fired — never the payload (it carries no secrets, but logging bodies is not this repo's pattern).
- No new `sync_process_log` row type (nothing scheduled).
- ⚠️ **CORRECTED 2026-08-20.** This bullet read: *"`ResponseInterceptor` already logs by status; a `400` lands at `warn` with no extra work."* **That is false for a *thrown* 4xx**, which is every rejection this section produces. Verified at source: `ResponseInterceptor.logBasedOnStatus` runs inside `next.handle().pipe(map(...))` and the interceptor has **zero `catchError`** — so a thrown `BadRequestException` never reaches it. It is handled by `GlobalExceptions`, which calls `_logger._error(...)` **unconditionally, regardless of status** (`global.exception.ts:34`).
  **So a thrown `400` lands at `ERROR`, not `warn`** — and that is true platform-wide, not only here: every client-error rejection in this codebase is logged at the level operational failures live at. Signal is not lost, which is why §9's `warn` requirement is additive rather than redundant, but the *reason* §9 gave for treating the interceptor as sufficient background coverage was wrong.
  **Why this bullet mattered more than a typo:** it was the third leg of the reasoning that scoped the two `assertInnovationUseOwnership` rejections out of this section's logger. That decision **still stands** — its first two legs (a logger belongs on *this* section's service, and the mirror never wraps a child call to re-log) are independently sufficient. But a decision partly resting on a false premise deserves the premise corrected rather than quietly relied on again.
  ~~**Carried for cleanup:** the false claim was mirrored verbatim into a code comment when FAIL-2 landed.~~ ✅ **ALREADY DONE — item withdrawn 2026-08-20** at the second `/akili-validate`. The comment on `ResultInnovationUseService.logger` now carries *this* correction ("a thrown `BadRequestException` never reaches `ResponseInterceptor`…"), not the false claim. The cleanup item was pointing at text that already said the opposite of what the item described — a stale *to-do*, the same defect class one level up.
- **No metric or dashboard is added.** Stated so the absence is a decision, not an omission.

---

## 10. Testing Strategy

### 10.1 Two tiers, and what each cannot prove

| Tier | Command | Proves | **Cannot** prove |
| --- | --- | --- | --- |
| Unit | `npm test -- --silent` | Wiring, guards, DTO rules through a real `ValidationPipe`, total derivation, catalog order clause | Anything about actual persistence — every repository is mocked |
| Fixture | `npm run test:fixtures` | Reconciliation, role isolation, the level boundary, the creation path, audit columns — against a real MySQL | Nothing about HTTP, auth, or Swagger |

Neither tier covers Swagger completeness. That gate is a **human check** (§10.4).

### 10.2 Unit specs

| File | Must cover |
| --- | --- |
| `result-innovation-use.controller.spec.ts` | Both handlers return the envelope; PATCH carries `ResultStatusGuard`; an allowed **and** a denied status case |
| `result-innovation-use.service.spec.ts` | Read assembly; the four validation rules; **total derivation in both modes and the all-NULL case**; mode normalisation nulls the other side |
| `result-actors.service.spec.ts` (extend) | `customSaveInnovationUse` passes role 2 in the deactivate predicate; count columns written; `OTHER` custom-name rule |
| `result-institution-types.service.spec.ts` (extend) | Same, plus `organization_count` |
| `clarisa-innovation-use-levels.service.spec.ts` | `findAll` issues `order: { level: 'ASC' }` |
| `results.service.spec.ts` (extend) | `createResultType` creates the detail row for 6 and not for 1–5; `ipAvailables` includes 6 |

**The DTO rules must be tested behaviorally, not by decorator presence.** Instantiate `new ValidationPipe({ whitelist: true, transform: true })` and run a payload through `pipe.transform(payload, { type: 'body', metatype: CreateResultInnovationUseDto })`. Asserting that `@Min(0)` appears on a field proves the decorator exists; it does **not** prove the handler runs a pipe, and with no global pipe in this repo that is the exact failure mode (DD-8).

### 10.3 Fixtures

New directory members under `test/fixtures/innovation-use/`. **Bands 900_000 … 900_600 are taken** (server guide FP-45 — read each sibling's header, do not trust this list).

| # | File | Proves | Falsifying input |
| --- | --- | --- | --- |
| **F-A** | `innovation-use-section-round-trip.fixture-spec.ts` | Full save → read equality; **add** and **remove** of each collection; **edit** of each collection that *has* a non-key column; audit columns on both the insert and the update-by-id branch of each collection | Drop the deactivate step → the removed row is still active |

> **"edit of each collection" narrowed 2026-08-19 at T-09's review.** It was unachievable as written for quantifications: `requirements.md` R-IUA-008 makes all three fields (`quantification_number`, `unit`, `description`) the **composite reconciliation key**, so editing any one of them is definitionally remove-plus-add, not an update — the correct analogue is the unchanged resend, which F-A asserts. Actors and organizations do carry non-key columns and are editable in the ordinary sense. The row now also states the **audit** obligation at branch granularity, because a single collection's insert branch and update-by-id branch are separate code paths in separate helpers, and asserting one does not gate the other — the defect found at T-09 attempt 2, where `result-institution-types.service.ts`'s `SetAuditEnum.UPDATE` spread had no coverage at any tier.
| **F-B** | `innovation-use-role-isolation.fixture-spec.ts` | One result seeded with **both** Innovation Dev and Innovation Use rows in all three tables; save Innovation Use with empty arrays; every Innovation Dev row byte-identical | Omit `actor_role_id` from the deactivate predicate → Innovation Dev rows flip to inactive |
| **F-C** | `innovation-use-level-boundary.fixture-spec.ts` | Discriminating pair: catalog `id 6` (level 5) without explanation **accepts**; `id 7` (level 6) without explanation **rejects** | Compare the FK instead of `level` → **the accept half (`id 6` / level 5) inverts; the reject half stays green** *(corrected 2026-08-19 at T-11's review — "the pair inverts" implied both halves redden, which is arithmetically impossible; see `tasks.md` T-11)* |
| **F-D** | `innovation-use-catalog-order.fixture-spec.ts` | The catalog service returns `level` `0…9` in order | **Weak by construction** — see §10.5 |
| **F-E** | `innovation-use-result-creation.fixture-spec.ts` | Creating an indicator-6 result writes both a `result_innovation_use` and a `result_ip_rights` row; green checks then expose `innovation_use` and a reachable `completness` | Omit the `ipAvailables` edit → no IP Rights row |

**Comparison method for F-B.** `SELECT *` both sides and diff whole rows; never a hand-enumerated column list. ADR-11 names hand-enumeration as the exact failure the lifecycle routines themselves embody. Reference implementation: `innovation-dev-lifecycle-routines-unchanged.fixture-spec.ts`'s `fetchFullRow`.

**Seeding discipline (FP-48).** F-A and F-B are *copy/isolation* fixtures → **maximally distinct sentinel values** per column, so a positional transposition shows up. F-C is a *validation* fixture → **literal domain values**, because `innovation_use_validation`'s predicates compare against `TRUE` (i.e. `1`) and a sentinel of `2`–`6` silently takes the false branch and passes for the wrong reason.

### 10.4 The harness question — RB-4, and how it is bounded

F-A, F-B and F-C must exercise the **service**, not raw SQL, or they prove nothing about the reconciliation code. No fixture in this repo has ever instantiated a Nest provider.

**Design:** a shared helper, `test/fixtures/innovation-use/nest-harness.ts`, building

```
Test.createTestingModule({ imports: [TypeOrmModule.forRoot(testDataSourceOptions), GlobalUtilsModule, ResultInnovationUseModule] })
    .overrideProvider(CurrentUserUtil).useValue(stub with user_id + audit())
    .overrideProvider(ResultsUtil).useValue(stub with resultId)
    .compile()
```

> **`GlobalUtilsModule` is required, not optional — the original sketch omitted it and could not boot** *(corrected 2026-08-19 at T-09's review)*. It is `@Global()` and imported once at `AppModule`'s root, which is the only reason `CurrentUserUtil`, `ResultsUtil` and `UpdateDataUtil` resolve inside any feature module. `ResultInnovationUseService`'s constructor requires `UpdateDataUtil`, and nothing in `ResultInnovationUseModule`'s own subtree provides it. A harness omitting it is not smaller, it is broken — and importing the same global module production relies on makes the harness's DI graph *closer* to production, not a workaround. This was a **design-document defect, not grounds for the escalation clause**, which governs an unfixable boot.

`CurrentUserUtil` is `Scope.REQUEST` and injects `REQUEST`; `overrideProvider` is the standard Nest answer, and the class additionally exposes `setSystemUser()` as a second escape hatch.

**KZ-006 applies.** The harness task's done-criteria must include **one end-to-end criterion** — the harness resolves the real service and completes one real save — not a set of per-piece checks that each pass while the harness cannot boot.

**Escalation clause, not a silent downgrade.** If the module graph cannot be booted against the TEST datasource, the Implementer **stops and escalates**. It must not fall back to raw-SQL fixtures, which would leave DC-2 and DC-3 ungated while reporting green. F-D and F-E do not depend on the harness (F-D is service-only; F-E can drive `ResultsService` or assert the two rows directly), so a harness failure does not block the whole fixture set.

### 10.5 What a green run does not prove

1. **F-D cannot falsify a missing order clause.** Because `id = level + 1`, default PK ordering is coincidentally correct on the current seed. F-D would pass with `findAll()` unoverridden. The unit spec asserting the `order` clause is the only real gate, and it is a *presence* assertion — it proves the clause is written, not that ordering survives a re-seed. Both are specified; **both are declared insufficient alone**, and the gap is recorded rather than papered over.
2. **Coverage says nothing about SQL** (ADR-11). `innovation_use_validation` is untouched here, but F-E reads its output — and a green 60% is not evidence for any of DC-2/3/5/7.
3. **The fixture suite is not run by CI.** It needs a Docker container. It is a local gate a human must run and report, exactly as chunk 1 did.

### 10.6 Disqualifiers

- Collected-test count of **0** is a failure, not a pass (`*.fixture-spec.ts` naming trap).
- A run against an unbootstrapped or half-migrated scratch schema is **inconclusive**. `migration:test:bootstrap` is not idempotent (FP-49); recovery is `compose:test:down` → `up` → `bootstrap`.
- `npm run lint` carries `--fix` and **mutates files**. Re-check `git status` after; never report it as a read-only check.

---

## 11. Design Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| **DD-1** | Mirror `result-innovation-dev`'s module shape, route depth and `@Get`/`@Patch` pair | The client's section-save pattern works unchanged; the reference is the only working analogue. *(Rejected: granular sub-resource CRUD — proposal Option B — which produces partial-save states that directly contradict R-IUA-003 AC.2.)* |
| **DD-2** | One transaction for the whole section | Green checks read on demand; a torn section would be observable as a wrong completeness boolean |
| **DD-3** | Validate **before** `BEGIN`, not inside it | Makes "a failure persists nothing" a property of the order of operations rather than of rollback correctness. **⚠️ ONE RECORDED EXCEPTION, added 2026-08-20:** the **ownership check** (`assertInnovationUseOwnership`, the FAIL-1 remediation) runs **inside** the transaction, as the first statement of each `customSaveInnovationUse`, so R-IUA-003 AC.2 holds for *that* rule **by rollback** rather than by ordering. *Reviewed and ruled the better option:* hoisting it into `update()`'s pre-`BEGIN` block would move an **authorization** rule out of the method that performs the write it guards, and duplicate both the role constant and the child table's repository access in the orchestrator — a tighter coupling than the one DD-3 avoids. The compensating properties are that it is the **first statement** of each child method (before any write that method performs), for step **7a** the only prior statement is step 6's idempotent scalar `UPDATE` on this result's own detail row; for step **8a**, step 7's full actor reconciliation has also executed — a deactivating `UPDATE` across every active Innovation Use actor row plus N inserts/updates *(corrected 2026-08-20, second pass: the original claimed step 6 was "the only statement already executed", which is false for 8a. Rollback covers both, so the decision stands — but the only quantitative claim in this amendment was wrong)*, and a throw propagates out of `dataSource.transaction` to roll the whole thing back. **Recorded as an amendment rather than left as a sentence in §4's error table**, because a decision contradicted by two other sections of its own document is drift, not nuance |
| **DD-4** | Ship **zero** migrations | Chunk 1's schema is complete for this contract. A discovered need is an escalation — it would change the rollout story and re-open the shared-DB risk (family FR-3) |
| **DD-5** | No `@Roles(...)` on any of the three endpoints | Verified 2026-08-19: **no result-section controller in this repo uses `@Roles`**. Section access is JWT + `ResultStatusGuard`. `proposal.md` item 7 contradicts itself ("`@Roles` … matching the Innovation Dev section"); matching the reference means none. Adding roles would make Innovation Use the only section with a rule the client does not mirror — an AC-Role-Correctness hazard, not a hardening |
| **DD-6** | Override `findAll()` on the catalog service to add `order: { level: 'ASC' }` | `ControlListBaseService.findAll()` has no order clause. Seeding `id = level + 1` makes PK order *coincidentally* right — which is exactly why relying on it is unsafe (chunk 1 §4) |
| **DD-7** | The write path calls nothing in `GreenChecksRepository` | `findByResultId` recalculates on every read. Adding a push would double the work and create a second, divergent source of the same boolean. **Corrects `proposal.md` item 6 and R-4** |
| **DD-8** | Add `@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))` on PATCH — **without `forbidNonWhitelisted`** | There is **no global `ValidationPipe`** in this repo; it is applied per handler (`impact-outcomes`, `bilateral-project-mapping`, `clarisa-levers`). Without it every `class-validator` decorator on the DTO is inert — a spec could add `@Min(0)` and ship a silent no-op. And `forbidNonWhitelisted: true`, the option the other three controllers use, would **reject** a body carrying `total`, contradicting R-IUA-004 AC.5 which requires it be *ignored*. `whitelist` alone strips it |
| **DD-9** | The read returns `innovation_use_level` (the resolved scale point) alongside `innovation_use_level_id` | Resolves **OQ-IUA-1**. The reference returns the id only, but the family's most dangerous trap is `id ≠ level`; returning the resolved level costs one already-needed join and removes the off-by-one from the client boundary entirely. The full catalog object is *not* returned — chunk 3 already loads the catalog for the stepper |
| **DD-10** | Pass `manager` to `upsertByCompositeKeys` | OICR omits it, leaving its quantification writes outside its transaction. Not inherited, not fixed here |
| **DD-11** | Leave `upsertQuantificationsByRole` (zero callers) in place | Deleting dead code in a shared service is out of scope and would widen the blast radius of an API chunk |
| **DD-12** | C-4 cleanup is scoped to the sites that are **structurally** dead — not to every occurrence of the identifier | See §11.1. The follow-up as logged is over-broad |
| **DD-14** | **The PATCH contract: an omitted key preserves a scalar but clears a collection — and validation runs against the *effective post-write row*, not the payload** | TypeORM's `UpdateQueryBuilder` skips `undefined` properties (`UpdateQueryBuilder.js:292-298`), so an omitted scalar leaves its column untouched, while `?? []` on the three collections makes an omitted collection deactivate every row for that role. Those are opposite readings of "absent" and the spec had written down neither. Left unreconciled they combine into a **bypass**: validating the payload alone lets `PATCH {"innovation_use_level_explanation": null}` against a stored catalog `id 7` (level 6) null the justification and return `200` — the exact state R-IUA-006 exists to prevent, reached by "calling the API directly" as its user story warns. **Ruled 2026-08-19 at execution time (T-06 attempt 1 review, Lens C):** keep `omitted = preserve` for scalars, and resolve both the level and the explanation as **`key present ? payload : stored`** — in code, `payload.field !== undefined ? payload.field : stored.field` — **before** the rule runs. **The operator is not `??`.** `??` treats an explicit `null` as absent, so it would fall back to the stored explanation while step 6 still writes the `NULL` — reopening the very bypass this decision closes. `!== undefined` is the only operator that models the post-write row, because TypeORM skips exactly and only `undefined`. The stored row is already in hand from §5.1 step 2, so this costs nothing. *(Rejected: coercing the scalars with `?? null` so an omitted key clears them, restoring symmetry with the collections — it leaves R-IUA-006 AC.5 literally intact but makes a genuinely partial PATCH destructive for the scalars, a behaviour change chunk 3's client would have to be told about before shipping.)* Consequence recorded honestly: **R-IUA-006 AC.5 is narrowed** to apply only when no level is stored either | 
| **DD-13** | Exempt `@ApiOperation` on handlers **inherited unchanged from `BaseController`** — no override on the catalog controller | `@ApiOperation` is built by `createMethodDecorator`, which dereferences `descriptor.value` unconditionally; applied at class level Nest supplies no descriptor and it throws at class-definition time. The original instruction ("`@ApiOperation` goes on the subclass, not on an override") named a placement that does not exist — a Pivot at T-01 attempt 1's review. Ruled at execution time, 2026-08-19 (`requirements.md` **D-IUA-10**). *(Rejected: authorize a `find()` override re-declaring `@Get()` to hang the annotation — the only `super.find()` in the whole `src` tree, breaking a pattern held by all 19 sibling `BaseController` subclasses, for one Swagger summary line. Also rejected: add `@ApiOperation` support to `BaseController` itself — out of scope for an API chunk, and widens the blast radius to 19 controllers.)* The exemption binds only to handlers a subclass inherits without overriding; T-07's own-declared `GET`/`PATCH` keep `@ApiOperation` and `@ApiBody` fully required |
| **DD-15** | **A route node is not a registration. Every new module must ALSO be added to the module-graph file that instantiates it** — `entities.module.ts` for entity modules, `clarisa.module.ts` for clarisa control lists | `RouterModule.register()` does not import or instantiate the modules it names. Verified at source in `@nestjs/core/router/router-module.js`: it exposes the routes as a `ROUTES` provider, stamps `MODULE_PATH` metadata onto each module constructor, then looks the module up in `modulesContainer` and **returns silently when it is not found**. No boot error, no warning — the controller is simply never registered with the HTTP adapter and every handler on it returns `404`. **Ruled 2026-08-19 at execution time (T-07 attempt 1 review, Lens A, confirmed by the Leader).** §2.1's composition table had enumerated the two route files and omitted the two module-graph files entirely, so neither Implementer had a file to touch and neither Reviewer had a criterion to check: **both** `ResultInnovationUseModule` (T-07) and `ClarisaInnovationUseLevelsModule` (T-01, already closed `[x]`) shipped with a route node and no registration, and all four endpoints returned `404` while 2,255 tests passed. Mocked-provider unit specs cannot detect it; neither can a spec asserting the shape of the `route` array, which is a stand-in that never evaluates what it stands in for (KZ-001). The falsifiable assertion is over `Reflect.getMetadata('imports', <GraphModule>)`. *(Rejected: relying on T-08's planned `results.module.ts` import to supply `ResultInnovationUseModule` — it would make the endpoints start working as a side effect of an unrelated task, with no explicit registration where a maintainer would look, and would leave T-01's catalog endpoint broken. Also rejected: minting a new task for module-graph registration — the work belongs to two existing tasks that under-delivered against their own ACs.)* Recorded as **trap 4** in `tasks.md` §0 |
| **DD-16** | **R-IUA-002 AC.7 (`401`) is discharged at T-07 by asserting the route is absent from `AppModule`'s `JwtMiddleware` `exclude` list** — with the residual stated, not closed | AC.7 was assigned to T-07 by both its *Requirements covered* line and §3's traceability matrix, but T-07's Done criteria carried no line for it and the delivered spec asserted nothing; §10.1 rules the fixture tier out of auth entirely (*"Cannot prove … Nothing about HTTP, auth, or Swagger"*), so no downstream task inherited it. Left alone it becomes a claimed-but-undelivered AC — invisible once accepted. **Ruled 2026-08-19 at execution time (T-07 attempt 1 review, referred to the Leader by Lens B).** The `401` is produced by `JwtMiddleware` applying to the route, and the exclude-list absence is the actual mechanism — a sound assertion, not a proxy for one. It does **not** prove a live `401`, which needs an HTTP seam this spec's unit tier does not have; that residual is recorded rather than hidden. *(Rejected: reassigning AC.7 to T-13 — T-13 is a human `/swagger` check, and routing an auth criterion into an eyeball gate is weaker than the assertion available here.)* |

### 11.1 Reversion challenge (Step 2.3) — DD-12

**DD-12 is the only decision here that removes something the codebase already ships**, so it is the only one that triggers the challenge. One reviewer, one question: *what does removing this break?*

**It found a concrete breakage, and the design is narrower as a result.**

The chunk-1 Kaizen logged **C-4** as: *"`platformSeeded` / `innovationDevRoleSeeded` in the fixture harness are structurally always `false` (dead branches)."* Read literally, that says remove every occurrence. Verified against the files on 2026-08-19:

| Site | Guards | Verdict |
| --- | --- | --- |
| `sp-versioning-objective-blocks.fixture-spec.ts` — `platformSeeded` | the **`'STAR'`** row, which `global-setup.ts` now seeds | **dead** — already `void`-ed as a diagnostic |
| `innovation-use-validation.fixture-spec.ts` — `innovationDevRoleSeeded` | `actor_roles` id 1, which `global-setup.ts` now seeds | **dead** — already `void`-ed |
| `innovation-use-validation.fixture-spec.ts` — `platformSeeded` | its **private** `'T12IUV'` platform | **LIVE** — gates the `afterAll` `DELETE` |
| `innovation-use-detail-round-trip.fixture-spec.ts` — `platformSeeded` | private `'T12RT1'` | **LIVE** |
| `green-check-ip-rights.fixture-spec.ts` — `platformSeeded` | private `'T12F10'` | **LIVE** |
| Remaining occurrences | — | **must be enumerated by the task, not copied from this table** |

Removing a **live** one drops the `afterAll` teardown, orphaning a private `reporting_platforms` row; the next run's plain `INSERT` (these are not `INSERT IGNORE` — that idempotence lives only in `global-setup.ts`) then hits a duplicate key. The cleanup would turn a green suite red on its second run.

**Design consequence:** the C-4 task removes only sites it has proven dead by naming the row each one guards and showing that `global-setup.ts` seeds it. Sites guarding a private platform code stay. The task must report a **per-file line including files with zero removals** (KZ-007), and quote the guarded row for each removal rather than citing "C-4" (KZ-005).

This challenge cost one pass and avoided a rework round on a red fixture suite.

---

## 12. Budget (Step 2.4)

The Phase 0 depth guess was **Full**, made before this design existed. Checked against it:

| Signal | Estimate | Basis |
| --- | --- | --- |
| **Tasks** | **13** | 2 modules, 2 shared-service methods, 1 creation-path edit, 5 fixtures + 1 harness, 1 cleanup, 1 gate |
| **LOC** | **~2,400** (±20%) | DTOs ~180 · IU service + spec ~530 · controller + spec ~210 · actors method + spec ~200 · orgs method + spec ~180 · catalog module + spec ~120 · creation edits + spec ~90 · harness ~120 · F-A…F-E ~800 · cleanup ~−30 |
| **Review rounds** | ~~6–8~~ → **~24** | *Original specify-time estimate 6–8, with this reasoning: "Chunk 1 budgeted 4–5 and burned **13** (2.6×). This is 13 tasks with three High risks; 4–5 would repeat that mis-estimate."* **Re-baselined to ~24 at execution time (2026-08-19, user ruling)** after 6 rounds were consumed by 3 of 13 tasks. The correction applied at specify time was itself ~3× low — the second consecutive chunk in this family to under-estimate rounds by roughly a third. Review depth was **not** reduced: the rounds were buying real defects (a permanently-failing green check found twice on two code paths, a test that could not fail, three defect-bearing mutations surviving a green 2169-test suite). Cutting review to meet a number that has been wrong twice would optimise the metric against the goal. See `execution.md` § *Budget Escalation* |

**Verdict: the estimate matches Full.** No depth change. It is far above `/akili-quick` territory and far above Lite or Standard — a Standard spec would put the creation-path edit and the role-isolation fixture behind the same gate as the DTOs.

**These three numbers are a tripwire, not a cap.** `/akili-execute` compares actuals against them; exceeding any one means the Leader **stops and escalates to the user** rather than continuing. Exceeding a budget is information.

**PR strategy — four PRs.** ~2,400 LOC is six times the ~400 LOC single-PR threshold.

| PR | Contents | Reviewable on its own? |
| --- | --- | --- |
| **PR 1** | Catalog module + routes + spec (DD-6) | Yes — self-contained read-only endpoint |
| **PR 2** | DTOs + `customSaveInnovationUse` on both shared services + their specs | Yes — additive methods with no caller yet |
| **PR 3** | IU service + controller + module + routes + creation-path edits + specs | Depends on PR 1 and PR 2 |
| **PR 4** | Harness + F-A … F-E + C-4 cleanup | Depends on PR 3 |

Each PR description follows `cognitive-doc-design` review-empathy: what to read first, what is out of scope, links to the previous and next PR. **PR 3 carries the two edits to `results.service.ts`** — call them out at the top of that description; they are the only lines in the whole chunk that change behavior for indicators other than 6 (they do not, but that is the claim a reviewer must check).

---

## 13. Rollout

| Question | Answer |
| --- | --- |
| Migration order | **N/A** — no migration. Chunk 1's six must already be applied to any target |
| Feature flag | **None.** The endpoints are additive and unreachable until chunk 3 calls them |
| Deploy order | Server only. Chunk 3 cannot deploy before this |
| Backout | Pure code rollback. No schema state to unwind |
| **Behavior change on deploy** | **One, and it is not additive:** `ipAvailables` gaining indicator 6 means every **newly created** indicator-6 result gets a `result_ip_rights` row. Existing indicator-6 results created before this deploy will **not** have one and stay unsubmittable |
| Backfill | **Deliberately not specified here.** Whether any indicator-6 result exists in the shared dev or production database is a question for the target environment, not a code question (family FR-5 asks the same thing about reachability). If any exist, a one-off backfill is a **follow-up spec**, not a silent migration in this chunk (DD-4) |
| Comms | STAR team (chunk 3 unblocked, contract frozen); MEL if any indicator-6 result already exists |

---

## 14. References

- [`./requirements.md`](./requirements.md) · [`./proposal.md`](./proposal.md) · [`../family.md`](../family.md)
- Chunk 1 archive: [`../../archive/2026-08-19-innovation-use--data-model-and-catalog/`](../../archive/2026-08-19-innovation-use--data-model-and-catalog/) — `design.md` §3 (data model), §6.4 (validation logic), `routine-transcript.md`
- TRD [`docs/trd/trd.md`](../../../trd/trd.md) §2.4 ADR-11 (stored-routine completeness), ADR-12 (non-replayable history), §6.2, §12
- Server guide [`server/researchindicators/src/CLAUDE.md`](../../../../server/researchindicators/src/CLAUDE.md) §4 (endpoint recipe), §9 (FP-45 bands, FP-48 seeding, FP-49 bootstrap, FP-50 citations), §11 (harness commands)
- Reference implementations: `result-innovation-dev/`, `result-oicr.service.ts:234-249` (quantifications), `clarisa-innovation-readiness-levels/` (control list), `impact-outcomes.controller.ts:56-62` (ValidationPipe pattern)

**Kaizen lessons applied:** KZ-002 (§11.1 — enumerate the C-4 sites by what they guard, not by the identifier) · KZ-005 (§11.1 — quote the guarded row per removal) · KZ-006 (§10.4 — the harness needs one end-to-end criterion) · KZ-007 (§11.1 — per-file completeness line including zero-removal files)

---

## 15. Revision Log

| Date | Change |
| --- | --- |
| 2026-08-20 | **FAIL-1 remediation + DD-3 amended.** `/akili-validate` found the T-10 authorization defect had a **second, un-gated variant** — same-result cross-role, needing no knowledge of another result and therefore likelier than the quarantined one — which falsified **R-IUA-009 AC.1/AC.2/AC.4 and R-IUA-007 AC.4**, all four recorded as PROVEN. User ruled **option A**. `assertInnovationUseOwnership` added to both `customSaveInnovationUse` paths, scoped by `(result_id, role)`; §4 gained two error rows; the two `it.failing` quarantine markers **inverted to passing**. **DD-3 gained its first recorded exception** (the gate runs inside the transaction and holds by rollback — reviewed and ruled better than hoisting an authorization rule into the orchestrator), §5.1's preamble was corrected from a now-false "without relying on rollback", and steps **7a/8a** were added because the gate was live in code before it was listed in the step order. **`customSaveInnovationDev` deliberately retains the defect** — a different surface with unspecified ACs and live data; the platform exposure is now **asymmetric** and needs its own ticket |
| 2026-08-19 | Created. Reversion challenge run on DD-12 → design narrowed (§11.1). **`requirements.md` R-IUA-003 AC.5 corrected `403` → `400`** to match `ResultStatusGuard`'s actual `BadRequestException`; swept forward across both documents in the same edit |
| 2026-08-19 | **DD-14 added** — the PATCH `undefined`/`null` contract, previously unwritten. T-06 attempt 1's review (Lens C) found that payload-only validation plus partial-merge writes let an accepted request persist a level ≥ 6 row with no justification. User ruled: validate the **effective post-write row**. §5.1 steps 3–4 amended; **`requirements.md` R-IUA-006 AC.5 narrowed** to apply only when no level is stored either; swept across both documents in the same edit |
| 2026-08-19 | T-01 attempt 1 Pivot resolved (T-01 attempt 2): `@ApiOperation` exempted on handlers inherited unchanged from `BaseController` — no override on the catalog controller (**DD-13**). §4's catalog entry corrected; `requirements.md` R-IUA-013 AC.3 and §5.3, and `tasks.md` T-01's Implementation notes and T-13's done criterion, amended to match; swept forward across all three documents in the same edit |
| 2026-08-19 | **T-07 attempt 1 Pivot — DD-15 and DD-16 added.** Both lens Reviewers FAILed; Lens A found `ResultInnovationUseModule` absent from `entities.module.ts`, and the Leader's KZ-005 two-direction sweep found the **same defect already shipped in T-01** (`ClarisaInnovationUseLevelsModule` absent from `clarisa.module.ts`), which was closed `[x]` with four endpoints returning `404`. Root cause was in this document: **§2.1's composition table enumerated the two route files and omitted the two module-graph files**, so no Implementer had a file to touch and no Reviewer had a criterion to check. §2.1 gained both rows and its stale catalog-import claim was corrected; **`requirements.md` R-IUA-013 AC.5 was corrected** — its original wording named only the route files and is what the defect came through; `tasks.md` gained **trap 4**, T-01 was **reopened `[~]`**, and T-07's *Files touched* and Done criteria were amended. **DD-16** rules R-IUA-002 AC.7 (`401`) discharged at T-07 by the `JwtMiddleware` exclude-list assertion, with the residual stated. Swept two-directionally across all four documents in the same edit |
| 2026-08-20 | **FAIL-1 remediation (`validation-report.md`).** §4's PATCH error table gained a new `400` row: a caller-supplied `result_actors_id` / `result_institution_type_id` is honoured only when it names a row already scoped to BOTH the calling `result_id` AND the calling role — otherwise the whole save is rejected, never silently ignored or overwritten. Implemented as a new `assertInnovationUseOwnership` method on each of `ResultActorsService` and `ResultInstitutionTypesService`, called only from their `customSaveInnovationUse`, deliberately **not** touching the helpers `buildUpdateData`/`processInstitution` shared with `customSaveInnovationDev`. Closes both the cross-result variant (T-10's `it.failing` quarantine, now un-quarantined and passing) and the cross-role variant (found un-gated at `/akili-validate`, now covered by a new fixture case). `customSaveInnovationDev` is unmodified and its existing specs pass unmodified — see this task's report for the regression evidence |
| 2026-08-20 | **PRODUCT DEFECT fixed — PK collision between the id-present and id-less branches (re-validation, Auditor B).** An ordinary edit-plus-add payload (change one row's type, add a new row of the old type) had the id-less row's identity lookup match the row being edited — still holding the old type, nothing written yet — and **adopt its primary key**, so `save()` issued two PK-keyed UPDATEs against one row. **Reproduced against real MySQL before any fix was written:** the added row was **never created**, and the survivor was a **column-level hybrid matching neither payload row**. Silent corruption on a `200`. Neither existing gate could catch it — `validateNoDuplicateActorTypes` keys on identity (distinct), and `assertInnovationUseOwnership` passes because the id is genuinely owned, so **the authorization work was never implicated.** **User ruling: fix both halves here, organizations without touching the shared helpers.** Actors — `constructWhereClauseInnovationUse` (private, Use-only) gained `excludeIds` and `Not(In(excludeIds))`, guarded by `excludeIds.length > 0` so an all-id-less payload never gets a `Not(In([]))` predicate that would match nothing and silently turn every save into an insert. Organizations — new private `reconcileAdoptedPrimaryKey` converts an adopted PK back into a genuine insert **after** `processInstitution` and **before** `save()`; the six shared helpers are untouched (**0 deletions** in both services). Reviewer PASS confirmed the reconcile is *exactly*, not approximately, equivalent to a real insert. **§5.3's "five private helpers" description is amended by this row** — the Use path now also runs the Use-only reconcile pass. A follow-on Reviewer advisory found the same corruption reachable through a **third** door (two id-present rows sharing one PK, which the `[...new Set(...)]` message-dedup had hidden from the guard); closed by a `400` in the same round |
