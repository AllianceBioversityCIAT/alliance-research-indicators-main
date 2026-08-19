# Requirements — Results (Innovation Use) / Details API

- **Module:** results (`innovation-use`)
- **Spec id:** 2026-08-innovation-use-details-api
- **Status:** draft
- **Owner:** David Felipe Casañas Hernández
- **Linked PRD section:** [`docs/prd.md`](../../../prd.md) §5.1 Server responsibilities · AC-API-Surface · AC-Results-Lifecycle · AC-Role-Correctness · AC-Testing
- **Linked TRD sections:** [`docs/trd/trd.md`](../../../trd/trd.md) §4.1 (entity-module layout), §5.2 (Result aggregate), §6.1–6.2 (envelope + server conventions), §7.1 (result lifecycle), §12 (testing), §2.4 ADR-2 / ADR-4 / **ADR-11**
- **Linked proposal:** [`./proposal.md`](./proposal.md)
- **Parent spec:** [`../family.md`](../family.md) — **chunk 2 of 3**
- **Depends on:** [`docs/specs/archive/2026-08-19-innovation-use--data-model-and-catalog/`](../../archive/2026-08-19-innovation-use--data-model-and-catalog/) — **satisfied**, status `done` in the family manifest
- **Linked tickets:** AC-1679 (branch `AC-1679-Create-the-innovation-use-section`)
- **Depth:** **Full** — new public API surface, an edit to the shared result-creation path, and transactional reconciliation of three nested collections
- **Last updated:** 2026-08-19

---

## Document Control

| Field | Value |
| --- | --- |
| Type | Change |
| Approval Mode | **gated** (inherited from `proposal.md` and `family.md`) |
| Depends on | chunk 1 — **done** (2026-08-19). Tables, catalog rows, discriminators, and `innovation_use_validation` all exist on this branch |
| Blocks | [`innovation-use/details-page`](../details-page/) (chunk 3) |
| Tier | server (`server/researchindicators`) only. **No `client/` change.** |
| Visual reference | None of its own. The PRMS screenshot cited in `proposal.md` is a *field* reference; it is not a UI mock for this chunk |
| Rulings taken at specify time | 4 (see §9 Resolved decisions) — OQ-F1 out, OQ-F2 out, creation gap **in**, duplicate actors **service-level** |

---

## Executive Summary

**What:** one REST module, `result-innovation-use`, that reads and writes the entire Innovation Use details section in a single call each way, plus a control-list endpoint for the 0–9 use-level scale.

**Why now:** chunk 1 shipped the schema, the catalog and the `innovation_use_validation` stored function. Nothing can reach any of it — there is no module, no route, and no server-side rule enforcement. Chunk 3 cannot start against an unspecified contract.

**The finding that reshaped this chunk.** `ResultsService.createResultType()` (`results.service.ts:526-558`) has no `case IndicatorsEnum.INNOVATION_USE:`, and its `ipAvailables` array excludes indicator 6. Chunk 1 nonetheless added indicator 6 to the green-check `ip_rights` conjunction. The composite effect **on `main` today**:

| Step | What happens now | Consequence |
| --- | --- | --- |
| Create a result with `indicator_id = 6` | No `result_innovation_use` row is written | An Innovation-Dev-shaped `update()` would `404` on first save |
| Same creation | No `result_ip_rights` row is written | `intellectual_property_validation` returns `FALSE` — permanently |
| `GET /green-checks/:resultCode` | `ip_rights` is `false`, and it is **not** in `VISUAL_ONLY_GREEN_CHECKS` | `completness` can never become `true`; the result **can never be submitted** |

This is not a new defect this chunk introduces — it is an existing gap chunk 1's green-check wiring made reachable. **User ruling 2026-08-19: close both halves here** (R-IUA-001, R-IUA-011). It is two additive edits in one file and it is the difference between a section that saves and a section that is unusable.

**Shape of the contract:** one `GET` + one `PATCH` on `results/innovation-use/:resultCode`, mirroring `result-innovation-dev` exactly, so the client's existing per-section save pattern works unchanged. `Total Actors` is derived on read and never bound from the request.

---

## 1. Context

The Innovation Use reporting page (chunk 3) needs one load call and one save call for a section containing: a 0–9 use level, a conditional justification, repeatable Actors with sex/age counts, repeatable Organizations with counts, and repeatable Other quantitative measures.

`result-innovation-dev` is the working analogue and the shape this chunk mirrors — same route depth, same `@Patch(RESULT_CODE)` / `@Get(RESULT_CODE)` pair, same single-transaction save, same role-discriminated reuse of `result_actors` and `result_institution_types`.

**Not changing:** the shared General Information / Alliance Alignment / Partners / Geographic Scope / Evidence / IP Rights section endpoints; the green-check computation model; the `innovation_use_validation` function chunk 1 froze; anything under `client/`.

---

## 2. Requirement numbering

Requirements are `R-IUA-<NNN>` — **`IUA` = Innovation Use API**, deliberately distinct from chunk 1's `R-IU-<NNN>`. The two chunks are reviewed and archived separately and their ID spaces must not collide; a bare `R-IU-013` would be ambiguous about which document owns it.

Non-functional requirements are `NFR-IUA-<NNN>`.

---

## 3. Glossary

| Term | Meaning here |
| --- | --- |
| **Section** | One tab of the result form. Innovation Use details is one section, saved atomically |
| **Use level** | A point on the 0–9 Innovation Use scale. Lives in `clarisa_innovation_use_levels.level` |
| **Level id** | `clarisa_innovation_use_levels.id`. **`id = level + 1`** (family D-1). Never the scale point |
| **Discriminator** | The role FK that partitions a shared child table by indicator: `actor_role_id`, `institution_type_role_id`, `quantification_role_id`, each `= 2 / 2 / 3` for Innovation Use |
| **Disaggregated mode** | An actor row where `sex_age_disaggregation_not_apply` is `FALSE`/`NULL`; the four `*_count` columns carry the data |
| **Aggregate mode** | An actor row where `sex_age_disaggregation_not_apply = TRUE`; `actors_count` carries the single "How many" (family D-4) |
| **Derived total** | `Total Actors`. Sum of the four counts in disaggregated mode, `actors_count` in aggregate mode. **Never stored, never accepted** |
| **Green check** | A per-section completeness boolean. Computed **on read** by `GreenChecksRepository.calculateGreenChecks`, not pushed on write |
| **Fixture** | A `*.fixture-spec.ts` file run by `npm run test:fixtures` against the disposable scratch MySQL. The only harness in this repo that touches a real database |

---

## 4. System Context & Scope

### 4.1 What exists today (verified against the working tree, 2026-08-19)

| Artifact | State | Evidence |
| --- | --- | --- |
| `result_innovation_use` table + entity | **exists** | `domain/entities/result-innovation-use/entities/result-innovation-use.entity.ts` |
| `clarisa_innovation_use_levels` table + entity + 10 seeded rows | **exists** | `domain/tools/clarisa/entities/clarisa-innovation-use-levels/entities/clarisa-innovation-use-level.entity.ts`; migration `1787066437593` |
| 5 count columns on `result_actors`, 1 on `result_institution_types` | **exists** | `result-actor.entity.ts`; `result-institution-type.entity.ts:76-81` |
| `ActorRolesEnum.INNOVATION_USE = 2`, `InstitutionTypeRoleEnum.INNOVATION_USE = 2`, `QuantificationRolesEnum.INNOVATION_USE = 3` | **exists** | the three `enum/*.enum.ts` files |
| `innovation_use_validation` stored function + green-check wiring | **exists** | `green-checks.repository.ts` — `case IndicatorsEnum.INNOVATION_USE` and the `ip_rights` array both include indicator 6 |
| `result-innovation-use` **module / controller / service / DTOs** | **ABSENT** | only `entities/` and `entity-metadata.spec.ts` exist in that folder |
| Route registration for `innovation-use` | **ABSENT** | `main.routes.ts` `ResultsChildren` has `innovation-dev`, not `innovation-use` |
| Catalog controller/service/module for use levels | **ABSENT** | `clarisa-innovation-use-levels/` contains `entities/` only |
| `case INNOVATION_USE` in `createResultType` | **ABSENT** | `results.service.ts:531-548` |
| `INNOVATION_USE` in `ipAvailables` | **ABSENT** | `results.service.ts:550-553` |
| `ResultQuantificationsService.upsertQuantificationsByRole` | exists, **zero callers** | grep over `src`, excluding specs |

### 4.2 In scope

1. New module `domain/entities/result-innovation-use/` — controller, service, DTOs, module — and its `main.routes.ts` registration.
2. `GET` returning the whole section, with `Total Actors` derived.
3. `PATCH` persisting the whole section in one transaction, reconciling three nested collections scoped by their Innovation Use discriminators.
4. Control-list controller + service + module for the use-level catalog, ordered by `level`.
5. Server-side validation: non-negative integers, actor-mode exclusivity, duplicate actor types, conditional explanation at `level >= 6`.
6. Two additive edits to `ResultsService.createResultType` (detail row + IP Rights row for indicator 6).
7. Unit specs for controller + service; a DB-backed round-trip fixture.

### 4.3 Out of scope

- Any schema change. Chunk 1's six migrations are the schema; **this chunk ships no migration** (§9 D-IUA-4).
- Any `client/` change → chunk 3.
- Investment / co-investment endpoints → family non-goal.
- The "linked or bundled with another CGIAR result?" field → **ruled out** (family OQ-F1, §9 D-IUA-1).
- "This is yet to be determined" tri-state controls → **ruled out** (family OQ-F2, §9 D-IUA-2).
- Changes to `innovation_use_validation`, to the four lifecycle routines, or to `intellectual_property_validation`.
- OpenSearch indexing of Innovation Use detail fields → family **D-8**, a stated non-goal.
- AI formalization (`processedAiInfo`) for indicator 6.

---

## 5. Verification Strategy — Defect Classes and Their Gates

**Name the defect classes first, then pick the gate.** A gate that cannot see this spec's dominant defect is not a gate.

### 5.1 The blind spot, stated plainly

This chunk's dominant defect class is **wrong persistence under a real database**: a reconciliation that orphans rows, touches another indicator's rows, or writes a column the entity maps but the DB rejects. `npm test` cannot see any of it — every server unit spec mocks its TypeORM repository with `jest.fn()` factories (TRD §12, *Server patterns*), so a reconciliation that is completely wrong still passes.

The second blind spot is inherited: **SQL logic sits outside the Jest coverage figure** (ADR-11). A green 60% says nothing about whether the section actually turns green.

`npm run test:e2e` does **not** substitute. `test/app.e2e-spec.ts` boots the full `AppModule` — which requires a reachable database and a JWT — and asserts one unauthenticated route. There is no authenticated e2e path in this repo today, so specifying one as this chunk's gate would specify a gate that has never run.

### 5.2 Defect class → gate mapping

| # | Defect class this spec can produce | Gate | Can it fail? |
| --- | --- | --- | --- |
| DC-1 | Controller/service wiring wrong — missing guard, wrong DTO, wrong envelope | `npm test -- --silent` (sibling specs) | Yes — remove `@UseGuards(ResultStatusGuard)` and the guard spec fails |
| DC-2 | **Reconciliation orphans or duplicates a nested row** | **F-A round-trip fixture** (`npm run test:fixtures`) | Yes — drop the deactivate step and the "removed row is gone" assertion fails |
| DC-3 | **Reconciliation touches Innovation *Dev* rows on the same or another result** | **F-B isolation fixture** | Yes — omit the `actor_role_id` predicate and the Innovation Dev row count changes |
| DC-4 | `Total Actors` accepted from the client, or computed for the wrong mode | Unit spec on the derivation helper + F-A assertion | Yes — bind `total` from the DTO and the "client-supplied total ignored" case fails |
| DC-5 | Level rule written against the FK (`id`) instead of `level` — the family off-by-one trap | **F-C level-boundary fixture**, level 5 (id 6) vs level 6 (id 7) | Yes — compare `innovation_use_level_id >= 6` and the level-5 case rejects |
| DC-6 | Catalog returned in PK order that only *coincidentally* matches scale order | Unit spec asserting an explicit `ORDER BY level` in the query, **plus** F-D asserting the returned sequence is `0..9` | Yes — remove the `order` clause; F-D still passes today by coincidence, which is why the unit spec on the clause is also required (see §5.3) |
| DC-7 | Indicator-6 result still unsubmittable — creation edits missing or partial | **F-E creation fixture**: create an indicator-6 result through `ResultsService`, assert both child rows exist | Yes — omit the `ipAvailables` edit and the IP Rights row is absent |
| DC-8 | Swagger decorators missing | Reviewer checklist + `npm run lint -- --quiet` | **Partially — see §5.3** |
| DC-9 | Audit fields not populated from `request.user` | F-A asserts `created_by` / `updated_by` on written rows | Yes — drop the `audit()` spread and the assertion fails |
| DC-10 | **Every DTO validation rule silently inert.** There is **no global `ValidationPipe`** in this repo — it is applied per handler, and the reference `result-innovation-dev` controller applies none. `@IsInt()` / `@Min(0)` on a DTO reached by a pipe-less handler is a no-op that ships green | A unit spec that runs a payload through a real `new ValidationPipe(...).transform(...)`, **not** an assertion that the decorator exists (`design.md` DD-8) | Yes — remove `@UsePipes` from the handler and the behavioral spec fails; a decorator-presence assertion would still pass |

### 5.3 Classes with no automated gate — named, not hidden

| Class | Why no command catches it | Substitute |
| --- | --- | --- |
| **DC-8 Swagger completeness** | Nothing in this repo asserts that a handler carries `@ApiOperation` / `@ApiBody`. ESLint has no such rule, and `/swagger` renders a handler with zero decorators without error. **The existing `result-innovation-dev` controller itself carries neither `@ApiOperation` nor `@ApiBody`** — the convention is documented but unenforced | **Human check at the HITL gate**: open `/swagger`, confirm the section `GET`/`PATCH` each show tag, summary, body schema (`PATCH` only) and the bearer lock; confirm the catalog handler shows tag and bearer lock but carries **no** summary — exempted, inherited unchanged from `BaseController` (§9 D-IUA-10). Recorded as a task done-criterion with an explicit "cannot be proven by a command" note, and the exemption confirmed rather than flagged as a defect |
| **DC-6 second half** | An `ORDER BY level` assertion in a unit spec is a *presence* assertion about the query, not a proof of ordering; and F-D's sequence check passes today even with no order clause, because `id = level + 1` makes PK order coincidentally correct | Both are specified together and **both are declared insufficient alone**. The task must record that F-D cannot falsify a missing order clause on the current seed data, and that the unit spec is the only thing standing between the code and a silent regression if the catalog is ever re-seeded |
| **Concurrent duplicate actor types** | Ruled service-level only (§9 D-IUA-3); no constraint exists, so no test can prove the race is closed | **Accepted risk**, recorded here. Mitigation is structural, not tested: every write for one result goes through one transactional endpoint |

### 5.4 Two disqualifiers, stated up front

1. **A fixture that reports zero collected tests is a failure, not a pass.** `test/jest-fixtures.json` collects **only** `*.fixture-spec.ts`. A file named `*.spec.ts` under `test/fixtures/` is collected by neither `npm test` (whose `rootDir` is `src`) nor `npm run test:fixtures`. Every fixture task must print the collected-test count, and a count of `0` disqualifies the run.
2. **A fixture run against an unbootstrapped scratch schema is not evidence.** `migration:test:bootstrap` is **not idempotent** (server guide FP-49). A run whose `beforeAll` silently found no tables, or one that errored `ER_TABLE_EXISTS_ERROR` mid-way, produces a result that means nothing. Report the container state alongside the result, or report the run as inconclusive.

---

## 6. Stakeholders / Personas

| Persona (PRD §3) | Interest |
| --- | --- |
| **Result Contributor / Researcher** | Primary. US-RC-1, US-RC-2, R-2 (save partial progress), R-5 (see status). Cannot report an Innovation Use result at all until this ships |
| **MEL Regional Expert** | Reads and controlled-edits the section through the same endpoints; depends on server-side validation being the real gate |
| **STAR client (chunk 3)** | Sole consumer of the contract. Every field name and nesting level here becomes a client interface |
| **System Admin / Developer** | Owns the Swagger surface and the `/green-checks` behavior this chunk feeds |

---

## 7. Functional Requirements

### R-IUA-001 — Every Innovation Use result has a detail row from creation

- **As a** Result Contributor
- **I want** the Innovation Use section to be saveable the moment my result exists
- **So that** my first save does not fail on a missing record

**Details**

- Inputs: none directly — this is a behavior of `POST /api/v1/results` when `indicator_id = 6`.
- Behavior: `ResultsService.createResultType()` SHALL create a `result_innovation_use` row for indicator 6, additively, in the same `switch` and the same transaction as the five existing indicators.
- Outputs: no contract change to the create response.
- Permissions: unchanged.

**Acceptance criteria**

- [ ] AC.1 — After creating a result with `indicator_id = 6`, exactly one `result_innovation_use` row exists with that `result_id` and `is_active = TRUE`.
- [ ] AC.2 — The row's `created_by` matches the acting user.
- [ ] AC.3 — Creating a result with any of `indicator_id` 1–5 writes **no** `result_innovation_use` row.
- [ ] AC.4 — The row count for the five pre-existing indicators' own detail tables is unchanged by this edit.

#### Scenario: A new Innovation Use result is immediately writable

- GIVEN a contributor creates a result with `indicator_id = 6`
- WHEN the creation transaction commits
- THEN a `result_innovation_use` row exists keyed by that `result_id`
- AND a subsequent `PATCH` to the section succeeds rather than returning `404`
- BUT it must NOT create a row for any other indicator
- AND IT MUST populate the audit columns from `request.user`, never with a hardcoded id

---

### R-IUA-002 — Read the full Innovation Use section

- **As a** Result Contributor
- **I want** one call that returns everything the Innovation Use tab renders
- **So that** the page loads in a single round trip

**Details**

- Inputs: `GET /api/v1/results/innovation-use/:resultCode`, optional `version` query handled by `@GetResultVersion()` exactly as Innovation Dev does.
- Behavior: returns use level id, explanation, actors (each with its counts, its mode flag and a **derived** `total`), organizations, and other quantitative measures. Child collections are filtered by their Innovation Use discriminator and `is_active = TRUE`.
- Outputs: `ServerResponseDto` with `status 200`, `description` naming the section, `data` = the section DTO.
- Errors: `404` when the result does not exist; `401` unauthenticated.
- Permissions: authenticated; **no `@Roles`** (§9 D-IUA-5).

**Acceptance criteria**

- [ ] AC.1 — The response is a `ServerResponseDto` with `status: 200` and the section object under `data`.
- [ ] AC.2 — `actors` contains only rows with `actor_role_id = ActorRolesEnum.INNOVATION_USE`.
- [ ] AC.3 — `organizations` contains only rows with `institution_type_role_id = InstitutionTypeRoleEnum.INNOVATION_USE`.
- [ ] AC.4 — `quantifications` contains only rows with `quantification_role_id = QuantificationRolesEnum.INNOVATION_USE`.
- [ ] AC.5 — Each actor row carries a `total` field the server computed.
- [ ] AC.6 — A result with a detail row but no children returns empty arrays, not `null`, and does not error.
- [ ] AC.7 — An unauthenticated request returns `401` through `GlobalExceptions` in the same envelope.

#### Scenario: The section round-trips identically

- GIVEN an Innovation Use result whose section was saved with a level, an explanation, two actors, one organization and one quantitative measure
- WHEN the client issues the read
- THEN every field returned equals what was written
- AND each actor's `total` equals the sum of its four counts in disaggregated mode, or its `actors_count` in aggregate mode
- BUT it must NOT return any `result_actors`, `result_institution_types` or `result_quantifications` row belonging to another role discriminator
- AND IT MUST return `[]` rather than `null` for a collection with no rows

---

### R-IUA-003 — Write the full Innovation Use section atomically

- **As a** Result Contributor
- **I want** the whole section saved or none of it
- **So that** completeness is never computed against a half-written section

**Details**

- Inputs: `PATCH /api/v1/results/innovation-use/:resultCode`, body = the section DTO.
- Behavior: one `dataSource.transaction`. Updates the scalar columns on `result_innovation_use`, then reconciles the three child collections (create / update / soft-delete) within their discriminators, then calls `UpdateDataUtil.updateLastUpdatedDate`.
- Outputs: `ServerResponseDto` `status 200`, `data` = the re-read section, identical in shape to R-IUA-002's.
- Errors: `400` validation (with `errors` naming the offending field), `400` from `ResultStatusGuard` (it throws `BadRequestException`, **not** `ForbiddenException` — verified 2026-08-19 at `shared/guards/result-status.guard.ts`; see `design.md` §4), `404` when no detail row exists.
- Permissions: authenticated + `ResultStatusGuard`; no `@Roles`.

**Acceptance criteria**

- [ ] AC.1 — A full save persists level, explanation, actors, organizations and quantitative measures, and a subsequent read returns them identically.
- [ ] AC.2 — A save that fails validation on any nested row persists **nothing** — no partial write survives.
- [ ] AC.3 — Removing a repeatable row from the payload soft-deletes exactly that row (`is_active = FALSE`) and leaves its siblings active.
- [ ] AC.4 — The response `data` reflects the post-save state, not the request body.
- [ ] AC.5 — A save on a result whose status forbids editing is rejected by `ResultStatusGuard` with `400` and changes nothing. *(Corrected 2026-08-19 from `403`: the guard throws `BadRequestException`. Changing the guard would alter every result-mutation endpoint in the platform and is out of scope — `design.md` §4.)*
- [ ] AC.6 — Audit columns are written from `request.user` on both inserted and updated rows.
- [ ] AC.7 — `results.last_updated_date` (via `UpdateDataUtil`) advances on a successful save.

#### Scenario: A partial failure leaves nothing behind

- GIVEN a payload with a valid level and two actor rows, the second carrying a negative count
- WHEN the client saves
- THEN the response is `400` with `errors` naming the offending count field
- AND the level is unchanged in the database
- AND neither actor row was written
- BUT it must NOT leave the first actor row persisted while rejecting the second
- AND IT MUST report the rejection through `GlobalExceptions` in the standard envelope, never as a raw `Error`

#### Scenario: Removing a row removes exactly that row

- GIVEN a saved section with three actor rows, A, B and C
- WHEN the client saves the same section with only A and C
- THEN B is `is_active = FALSE`
- AND A and C remain `is_active = TRUE` with their ids preserved
- BUT it must NOT deactivate any `result_actors` row whose `actor_role_id` is not `INNOVATION_USE`
- AND IT MUST NOT hard-delete B

---

### R-IUA-004 — Actor counts: non-negative integers, exclusive modes, derived total

- **As a** MEL Regional Expert
- **I want** actor counts the server itself validates
- **So that** an impossible number cannot be reported and later defended

**Details**

- Inputs: per actor row — `actor_type_id`, optional `actor_type_custom_name`, `sex_age_disaggregation_not_apply`, the four `*_count` fields, `actors_count`.
- Behavior: every supplied count MUST be an integer `>= 0`. The two modes are mutually exclusive per row. `total` is computed on read and ignored on write.
- Errors: `400` naming the field.

**Acceptance criteria**

- [ ] AC.1 — A negative value in any count field is rejected `400`, and `errors` names that field.
- [ ] AC.2 — A fractional value in any count field is rejected `400`.
- [ ] AC.3 — A row with `sex_age_disaggregation_not_apply = TRUE` that also supplies any of the four disaggregated counts is rejected `400`.
- [ ] AC.4 — A row with `sex_age_disaggregation_not_apply` `FALSE`/absent that supplies `actors_count` is rejected `400`.
- [ ] AC.5 — A `total` present in the request body is ignored; the persisted row has no stored total and the read recomputes it.
- [ ] AC.6 — `actor_type_id` is required on every actor row; a row without one is rejected `400`.
- [ ] AC.7 — `actor_type_id = OTHER` with a blank or whitespace-only `actor_type_custom_name` is rejected `400`.
- [ ] AC.8 — A row in disaggregated mode with all four counts absent is **accepted** by the API (draft-save, R-2) — it is `innovation_use_validation` that keeps the section from turning green, not the endpoint.

#### Scenario: A client-supplied total is not trusted

- GIVEN a payload whose actor row carries counts `2, 3, 4, 1` and `total: 999`
- WHEN the section is saved and re-read
- THEN the returned `total` is `10`
- AND no column stores `999`
- BUT it must NOT reject the request merely because `total` was present — the field is ignored, not an error
- AND IT MUST recompute `total` on every read rather than caching it

#### Scenario: The two modes cannot both be populated

- GIVEN an actor row with `sex_age_disaggregation_not_apply = TRUE` and `women_youth_count = 5`
- WHEN the client saves
- THEN the response is `400`
- AND `errors` names the conflict between the mode flag and the disaggregated field
- BUT it must NOT silently null one side and accept the other
- AND IT MUST apply the check per row, so one valid row is not rejected because a sibling row is invalid in this way — the *transaction* fails, but the message identifies the offending row

---

### R-IUA-005 — Duplicate actor types within a result are rejected

- **As a** Result Contributor
- **I want** to be told when I add the same actor type twice
- **So that** my counts are not split across two rows that later disagree

**Details**

- Behavior: within one save, two actor rows resolving to the same actor type are rejected. For `actor_type_id = OTHER`, identity is `(OTHER, actor_type_custom_name)` — two `OTHER` rows with different custom names are **not** duplicates.
- Enforcement: service-level, inside the transaction, before any write (§9 D-IUA-3).
- Errors: `400` naming `actor_type_id`.

**Acceptance criteria**

- [ ] AC.1 — A payload with two actor rows sharing an `actor_type_id` (non-OTHER) is rejected `400`.
- [ ] AC.2 — A payload with two `OTHER` rows carrying **different** custom names is accepted.
- [ ] AC.3 — A payload with two `OTHER` rows carrying the **same** custom name is rejected `400`.
- [ ] AC.4 — The rejection happens before any row is written; the database is unchanged.
- [ ] AC.5 — A previously-saved actor row of type X, re-sent once in a later save, is **not** a duplicate of itself.

#### Scenario: The same type twice is refused

- GIVEN a payload with two actor rows both of type `Farmers`
- WHEN the client saves
- THEN the response is `400` and `errors` names `actor_type_id`
- BUT it must NOT deactivate the result's existing actor rows before failing
- AND IT MUST treat two `OTHER` rows with distinct custom names as distinct, not as a duplicate

---

### R-IUA-006 — Conditional level justification at level ≥ 6

- **As a** MEL Regional Expert
- **I want** the justification enforced by the server at the right scale point
- **So that** the requirement cannot be bypassed by calling the API directly

**Details**

- Behavior: when the selected level's **`level`** value (joined through the catalog, never the FK) is `>= 6`, `innovation_use_level_explanation` MUST be present and non-blank. Below 6 it is optional.
- **The trap:** `id = level + 1`. A rule written `innovation_use_level_id >= 6` demands the justification a full level early (family D-1).
- Errors: `400` naming `innovation_use_level_explanation`.

**Acceptance criteria**

- [ ] AC.1 — A payload selecting **level 6** (catalog `id = 7`) with no explanation is rejected `400`.
- [ ] AC.2 — A payload selecting **level 5** (catalog `id = 6`) with no explanation is **accepted**.
- [ ] AC.3 — A payload selecting level ≥ 6 with a whitespace-only explanation is rejected `400`.
- [ ] AC.4 — A payload selecting level ≥ 6 with an empty-string explanation is rejected `400`.
- [ ] AC.5 — A payload with no level at all is accepted (draft-save) **when the stored row also carries no level**; the explanation rule does not fire. When a level **is** already stored, the rule is evaluated against the **effective post-write row** — the merge of payload over stored state — so an omitted level cannot be used to bypass the justification requirement. *(Narrowed 2026-08-19 by user ruling at T-06's review; see `design.md` **DD-14**. The original unqualified wording permitted `PATCH {"innovation_use_level_explanation": null}` against a stored level 6 to succeed, which the requirement's own user story forbids.)*
- [ ] AC.6 — The rule resolves the level by joining the catalog on `id`, never by comparing the FK, and never by name.

#### Scenario: The off-by-one boundary holds

- GIVEN two otherwise-identical payloads, one selecting catalog `id = 6` and one selecting catalog `id = 7`, neither carrying an explanation
- WHEN each is saved
- THEN the `id = 6` payload (level 5) succeeds
- AND the `id = 7` payload (level 6) is rejected `400`
- BUT it must NOT resolve the level by `name` — catalog names repeat in pairs across adjacent levels
- AND IT MUST fail the pair discriminatingly: a rule comparing the FK passes the second case and fails the first, which is the exact inversion this scenario exists to catch

---

### R-IUA-007 — Organizations carry a count

- **As a** Result Contributor
- **I want** to record how many organizations of each type
- **So that** the section reflects reach, not just presence

**Details**

- Behavior: organization rows reuse `result_institution_types` under `institution_type_role_id = INNOVATION_USE`, adding `organization_count`. Reconciliation mirrors R-IUA-003.
- Errors: `400` for a negative or fractional `organization_count`.

**Acceptance criteria**

- [ ] AC.1 — An organization row saves with its `organization_count` and reads back identically.
- [ ] AC.2 — A negative or fractional `organization_count` is rejected `400`.
- [ ] AC.3 — Removing an organization row soft-deletes exactly that row.
- [ ] AC.4 — No `result_institution_types` row with `institution_type_role_id = INNOVATION_DEV` is read, written or deactivated by this endpoint.
- [ ] AC.5 — `organization_count` is optional — a row without one saves (draft-save).

---

### R-IUA-008 — Other quantitative measures

- **As a** Result Contributor
- **I want** free-form quantitative measures with a unit
- **So that** I can report what the fixed fields do not cover

**Details**

- Behavior: reuses `result_quantifications` under `quantification_role_id = INNOVATION_USE (3)`. `unit` is **free text** — no catalog (family D-2). Reconciliation by composite key `(quantification_number, unit, description)`, the pattern `result-oicr.service.ts` already uses.

**Acceptance criteria**

- [ ] AC.1 — A measure saves with `quantification_number`, `unit` and optional `description`, and reads back identically.
- [ ] AC.2 — Removing a measure soft-deletes exactly that row.
- [ ] AC.3 — No `result_quantifications` row with role `ACTUAL_COUNT` or `EXTRAPOLATE_ESTIMATES` is read, written or deactivated by this endpoint.
- [ ] AC.4 — `unit` is accepted as free text and is **not** validated against any controlled list.
- [ ] AC.5 — A negative `quantification_number` is rejected `400`.

---

### R-IUA-009 — Reconciliation never crosses a role discriminator

- **As a** MEL Regional Expert
- **I want** Innovation Use writes to be invisible to Innovation Dev data
- **So that** shipping one indicator cannot corrupt another

**Details**

- Behavior: every read, every `save`, and — critically — every **deactivate** query on `result_actors`, `result_institution_types` and `result_quantifications` MUST carry its role predicate.
- This is the spec's highest-severity risk (proposal R-1). `ResultActorsService.customSaveInnovationDev` deactivates by `{ result_id, is_active, actor_role_id }`; the Innovation Use equivalent must not drop that third key.

**Acceptance criteria**

- [ ] AC.1 — Saving the Innovation Use section on a result that also carries Innovation Dev actor rows leaves every Innovation Dev row's `is_active`, ids and column values unchanged.
- [ ] AC.2 — The same holds for `result_institution_types` and `result_quantifications`.
- [ ] AC.3 — Saving the section on result A does not touch any row belonging to result B.
- [ ] AC.4 — Every deactivate/update predicate in the write path names the role column.

#### Scenario: Innovation Dev is untouched

- GIVEN a result carrying both Innovation Dev actor rows and Innovation Use actor rows
- WHEN the Innovation Use section is saved with an empty `actors` array
- THEN every Innovation Use actor row is `is_active = FALSE`
- AND every Innovation Dev actor row is byte-for-byte unchanged, `is_active` included
- BUT it must NOT rely on "a result has one indicator" as the reason it is safe — the predicate is the reason
- AND IT MUST be proven by a fixture that seeds both roles on one result, not by a unit spec over a mocked repository

---

### R-IUA-010 — Use-level catalog endpoint

- **As the** STAR client
- **I want** the ten use levels with their scale point and definition, in scale order
- **So that** I can render the stepper without knowing the id encoding

**Details**

- Inputs: `GET /api/v1/tools/clarisa/innovation-use-levels`.
- Behavior: returns the ten active rows with `id`, `level`, `name`, `definition`, ordered **explicitly by `level` ascending**.
- **Two inherited traps:** `ControlListBaseService.findAll()` issues **no `order` clause**, and `findByName` is a `LIKE %name%` match over names that repeat in pairs.

**Acceptance criteria**

- [ ] AC.1 — The response is a `ServerResponseDto` with ten rows under `data`.
- [ ] AC.2 — Each row carries `id`, `level`, `name` and `definition`.
- [ ] AC.3 — Rows are returned with `level` ascending `0 … 9`.
- [ ] AC.4 — The ordering comes from an explicit `order` clause in the query, **not** from default PK ordering.
- [ ] AC.5 — The endpoint appears under the `Clarisa` Swagger tag with the bearer lock.
- [ ] AC.6 — No code path in this chunk resolves a use level by `name`.

#### Scenario: Scale order does not rest on a coincidence

- GIVEN the seeded catalog where `id = level + 1`
- WHEN the catalog endpoint is called
- THEN levels are returned `0` through `9` in order
- BUT it must NOT achieve that order by inheriting default primary-key ordering — which is correct today only by coincidence of the seed
- AND IT MUST carry an explicit order clause that a code reader can point at, because no test over the current seed can distinguish the two

---

### R-IUA-011 — An Innovation Use result can actually be submitted

- **As a** Result Contributor
- **I want** a complete Innovation Use result to pass the submit gate
- **So that** the section I filled in is not blocked by a row nobody created

**Details**

- Behavior: `ResultsService.createResultType()`'s `ipAvailables` array SHALL include `IndicatorsEnum.INNOVATION_USE`, so a `result_ip_rights` row is created for indicator 6 exactly as it is for indicators 1 and 2.
- Rationale: chunk 1 added indicator 6 to the green-check `ip_rights` conjunction (`green-checks.repository.ts`), and `ip_rights` is not in `VISUAL_ONLY_GREEN_CHECKS`. Without the row, `intellectual_property_validation` returns `FALSE` forever.
- **This is a behavior change to a shared method.** Its blast radius is the `ipAvailables` array only; the two existing members are untouched.

**Acceptance criteria**

- [ ] AC.1 — Creating a result with `indicator_id = 6` writes exactly one active `result_ip_rights` row.
- [ ] AC.2 — Creating a result with indicators 3, 4 or 5 still writes **no** `result_ip_rights` row.
- [ ] AC.3 — Creating a result with indicators 1 or 2 still writes exactly one, unchanged.
- [ ] AC.4 — For an indicator-6 result with every section complete **including** IP Rights, `GET /api/v1/results/green-checks/:resultCode` returns `completness: true`.
- [ ] AC.5 — For an indicator-6 result with every section complete **except** IP Rights, `completness` is `false` — the gate still works, it is simply now reachable.

#### Scenario: The submit gate becomes passable

- GIVEN a newly created indicator-6 result
- WHEN the contributor completes every section including IP Rights and Innovation Use details
- THEN the green-check response reports `completness: true`
- AND the submit transition is permitted
- BUT it must NOT make `ip_rights` non-blocking by adding `innovation_use` or `ip_rights` to `VISUAL_ONLY_GREEN_CHECKS` — that would make the section silently optional
- AND IT MUST leave the green-check key set for every other indicator identical

---

### R-IUA-012 — Green checks reflect the saved section without a push

- **As the** STAR client
- **I want** the section status to be current right after I save
- **So that** the sidebar does not lie to me

**Details**

- **Correction to the proposal.** `proposal.md` scope item 6 and risk R-4 assume the save must trigger a green-check recalculation. It must not — and Innovation Dev does not. `GreenChecksService.findByResultId` calls `calculateGreenChecks` on **every** read; the model is pull, not push. The save's only obligation is to have committed before the client re-reads.

**Acceptance criteria**

- [ ] AC.1 — A `GET /api/v1/results/green-checks/:resultCode` issued after a successful section save reflects the saved data.
- [ ] AC.2 — This chunk adds **no** call to `calculateGreenChecks` from the write path.
- [ ] AC.3 — The `innovation_use` key appears in the green-check response for indicator-6 results and for no other indicator.
- [ ] AC.4 — `innovation_use` is absent from `VISUAL_ONLY_GREEN_CHECKS`.

---

### R-IUA-013 — Repo conventions on every new surface

- **As a** System Admin / Developer
- **I want** the new endpoints indistinguishable from the rest of the API
- **So that** consumers and tooling need no special cases

**Acceptance criteria**

- [ ] AC.1 — Every response passes through `ResponseInterceptor`; controllers return `ResponseUtils.format({...})`.
- [ ] AC.2 — Every error is a Nest HTTP exception, never a raw `Error`.
- [ ] AC.3 — Every new handler declares `@ApiTags` and `@ApiBearerAuth`. Every **own-declared** handler (the section `GET` and `PATCH`) additionally declares `@ApiOperation`, and `@ApiBody` where it takes a body. **Exempted:** the catalog `GET`, inherited unchanged from `BaseController` — `@ApiOperation` is built by `createMethodDecorator`, a method decorator that throws when applied at class level, so decorating an unmodified inherited handler would require an override the module's own Scope forbids (§9 D-IUA-10, `design.md` DD-13). Verified by human inspection of `/swagger` (§5.3), which must confirm the exemption rather than flag it as a defect.
- [ ] AC.4 — The write handler carries `@UseGuards(ResultStatusGuard)` and `@GetResultVersion()`; the read handler carries `@GetResultVersion()`.
- [ ] AC.5 — The module is registered in `main.routes.ts` under `results` as `innovation-use`, and the catalog module under `tools/clarisa` as `innovation-use-levels`.
- [ ] AC.6 — Logging uses `LoggerUtil` / `CgiarLogger`; no `console.*` is introduced.
- [ ] AC.7 — All new entities and writes populate `AuditableEntity` fields from `request.user`.

---

## 8. Non-Functional Requirements

Inherited defaults (envelope, versioning, audit, `GlobalExceptions`) are not restated. Only deltas below.

### NFR-IUA-001 — Read cost is bounded

- **Category:** performance
- **Target:** the section read issues at most **five** database round trips (detail row, actors, organizations, quantifications, catalog join), with no per-row query.
- **How verified:** code review of the service `findOne`; a fixture that seeds 50 actor rows and asserts the read completes without a per-row query pattern.

### NFR-IUA-002 — DB-backed proof is a first-class gate

- **Category:** dx / reliability
- **Target:** the reconciliation and isolation behavior (DC-2, DC-3, DC-5, DC-7) is proven against a real MySQL via `npm run test:fixtures`, not against mocked repositories.
- **How verified:** the fixture files exist, are named `*.fixture-spec.ts`, are collected (non-zero test count), and pass from a freshly bootstrapped scratch container.

### NFR-IUA-003 — Coverage floor is not regressed

- **Category:** dx
- **Target:** server Jest coverage stays ≥ **60%** on all four axes.
- **How verified:** `npm run test:cov`. **Disqualifier:** this figure says nothing about SQL or about the fixture suite (ADR-11); a green 60% must never be reported as evidence for DC-2, DC-3, DC-5 or DC-7.

---

## 9. Data Requirements

**No schema change.** Every column and row this chunk reads or writes was shipped by chunk 1. Entities touched, all read-only in the structural sense:

| Entity | Path | Used for |
| --- | --- | --- |
| `ResultInnovationUse` | `entities/result-innovation-use/entities/result-innovation-use.entity.ts` | detail scalars |
| `ClarisaInnovationUseLevel` | `tools/clarisa/entities/clarisa-innovation-use-levels/entities/…` | catalog + level resolution |
| `ResultActor` | `entities/result-actors/entities/result-actor.entity.ts` | the five count columns, role 2 |
| `ResultInstitutionType` | `entities/result-institution-types/entities/…` | `organization_count`, role 2 |
| `ResultQuantification` | `entities/result-quantifications/entities/…` | role 3 |
| `Result` | `entities/results/entities/result.entity.ts` | already has the `result_innovation_use` inverse relation |

**No new OpenSearch decoration** — family D-8 makes indicator-specific detail fields a non-goal, and ADR-6's amendment records that the results index reflects off `ResultOpensearchDto`, not the entity, so entity decoration would ship dead.

**No migration.** If implementation discovers one is genuinely required, that is an **escalation**, not a task — it changes the chunk's risk profile and its rollout story (§9 D-IUA-4).

---

## 10. API Surface Delta

| Method + URL | Guards | Body DTO | Response `data` |
| --- | --- | --- | --- |
| `GET /api/v1/results/innovation-use/:resultCode` | JWT, `@GetResultVersion()` | — | section DTO |
| `PATCH /api/v1/results/innovation-use/:resultCode` | JWT, `ResultStatusGuard`, `@GetResultVersion()` | `CreateResultInnovationUseDto` | section DTO (post-save) |
| `GET /api/v1/tools/clarisa/innovation-use-levels` | JWT | — | `ClarisaInnovationUseLevel[]`, ordered by `level` |

No `@Roles(...)` on any of the three (§9 D-IUA-5). No `/v2`. Machine tokens reach these endpoints exactly as they reach every other `/api` route; no `app_secret_host_list` change.

---

## 11. Cross-System Impact

| System | Impact |
| --- | --- |
| **CLARISA** | None at the transport level. The use-level catalog is served from the locally seeded table (family D-1) — CLARISA's own endpoint omits `level` and `definition`, so a live sync would erase both |
| **OpenSearch** | None (family D-8) |
| **Socket.IO / RabbitMQ / DynamoDB / AGRESSO / TIP** | None |
| **Green checks** | Consumed, not changed. This chunk adds no call into `GreenChecksRepository` |
| **STAR client** | The three contracts above become chunk 3's interfaces. **Never modified from this spec** |

---

## 12. Assumptions, Dependencies, Risks

**Assumptions**

- A result carries exactly one indicator, so a result with Innovation Use rows has no Innovation Dev rows *in practice*. **This chunk does not rely on it** — R-IUA-009 requires the role predicate regardless.
- Chunk 1's migrations are on this branch and applied to any environment this chunk is tested against.

**Dependencies**

| # | Dependency | State |
| --- | --- | --- |
| D-1 | `innovation-use/data-model-and-catalog` | **done** |
| D-2 | The disposable scratch MySQL harness (`compose:test:up` → `migration:test:bootstrap` → `test:fixtures`) | exists, proven by chunk 1's nine fixture suites |
| D-3 | CLARISA actor types and institution types | already synced |

**Risks**

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| RB-1 | Reconciliation orphans, duplicates, or crosses a role discriminator | **High** | R-IUA-009 + the F-B isolation fixture. Every deactivate predicate names its role column |
| RB-2 | The level rule is written against the FK — the family off-by-one | **High** | R-IUA-006 AC.6 + the F-C discriminating pair (level 5 accepts / level 6 rejects) |
| RB-3 | The creation-path edits (R-IUA-001, R-IUA-011) touch a method shared by all six indicators | **High** | Both are additive — one `switch` case, one array member. AC.3/AC.4 on each requirement assert the other five indicators are unchanged, and the full server suite runs |
| RB-4 | The round-trip fixture needs a Nest `TestingModule` against the TEST datasource — **no fixture in this repo has ever instantiated a Nest provider** | Medium | `CurrentUserUtil` is `Scope.REQUEST` and can be overridden with `overrideProvider`. KZ-006 applies: the fixture task needs one end-to-end criterion, not per-piece checks. If the module wiring proves infeasible, **escalate** — do not silently downgrade to raw SQL, which would not exercise the service |
| RB-5 | Swagger completeness has no automated gate, and the reference module itself violates the convention | Medium | Human check at the HITL gate (§5.3), recorded as a task done-criterion |
| RB-6 | Fixture naming trap — a `*.spec.ts` under `test/fixtures/` is collected by nothing and reports a silent pass | Medium | §5.4 disqualifier 1: every fixture run reports its collected-test count; `0` is a failure |
| RB-7 | `result_official_code` band collision between fixture files | Low | Server guide FP-45: read every sibling fixture header and take the next unused band. Seven are in use as of 2026-08-19 |
| RB-8 | KZ-004 — a verification gate waived for a missing prerequisite | Low | Pre-flight `node_modules` and the scratch container before the first gate |

---

## 13. Open Questions

| ID | Question | Owner | Blocks |
| --- | --- | --- | --- |
| ~~OQ-IUA-1~~ | ~~Should the section read return the joined catalog row alongside `innovation_use_level_id`?~~ **RESOLVED 2026-08-19 → `design.md` DD-9:** return `innovation_use_level_id` **plus the resolved `level` scalar**, not the full catalog object. The join is already needed for R-IUA-006, so the level costs nothing extra, and it removes the family's `id ≠ level` trap from the client boundary entirely | — | — |
| OQ-IUA-2 | Carried from chunk 1's Kaizen — **C-4**: `platformSeeded` / `innovationDevRoleSeeded` in the fixture harness are structurally always `false` (dead branches). The 2026-08-19 user ruling logged this as a follow-up **for this chunk**, which will be in those files. Remove them, or leave them? | David | a fixture task's scope |

### Resolved decisions (2026-08-19, user rulings at specify time)

| # | Decision | Supersedes |
| --- | --- | --- |
| **D-IUA-1** | The "Is this innovation linked or bundled with another CGIAR-reported result?" field is **out of scope**. The story's field list does not contain it, and family D-3 makes the story govern over the PRMS screenshot | family **OQ-F1**, proposal **OQ-1** |
| **D-IUA-2** | The "This is yet to be determined" controls are **out of scope**. Fields stay plain nullable; `null` already means "not answered yet" and draft-save (R-2) supports it. A tri-state would need new columns and would change the validation function chunk 1 froze | family **OQ-F2**, proposal **OQ-2** |
| **D-IUA-3** | Duplicate actor types are prevented at **service level only**. No unique constraint, no seventh migration. The residual race is an **accepted risk** (§5.3) — every write for one result goes through one transactional endpoint | proposal **OQ-3**, **R-2** |
| **D-IUA-4** | This chunk ships **no migration**. Chunk 1's schema is complete for this contract. A discovered need for one is an escalation | proposal scope "Out: Schema → chunk 1" |
| **D-IUA-5** | The three endpoints carry **no `@Roles(...)`**. Verified 2026-08-19: **no result-section controller in this repo uses `@Roles`** — section access is governed by JWT plus `ResultStatusGuard`. `proposal.md` scope item 7 says "`@Roles(...)` + `ResultStatusGuard` wiring matching the Innovation Dev section"; matching Innovation Dev means no `@Roles`, and the two halves of that sentence contradict each other. Adding roles here would make Innovation Use the only section with an access rule the client does not mirror | proposal scope item **7** |
| **D-IUA-6** | Green checks are **pull, not push**. The save triggers no recalculation, because `findByResultId` recalculates on every read | proposal scope item **6**, **R-4** |
| **D-IUA-7** | The creation gap is closed **here, both halves** — `createResultType` case and `ipAvailables` membership | new finding, no prior position |
| **D-IUA-8** | The write handler carries `@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))`, **without `forbidNonWhitelisted`**. There is no global pipe in this repo, so the DTO rules would otherwise be inert (DC-10); and `forbidNonWhitelisted` would *reject* a client-sent `total`, contradicting R-IUA-004 AC.5 which requires it be **ignored** | new finding → `design.md` **DD-8** |
| **D-IUA-9** | The read returns the resolved `innovation_use_level` scalar alongside the id | resolves **OQ-IUA-1** → `design.md` **DD-9** |

### Resolved decisions (execution-time ruling)

The row below was **not** made at specify time. It resolves a Pivot raised during T-01 attempt 1's review — the specify-time AC.3 text (§7 R-IUA-013 AC.3, since rewritten in place; the original wording survives verbatim only in `execution.md` § *Pivot Record: T-01*) turned out to be self-contradictory: it demanded `@ApiOperation` on a handler the same task's Scope inherits unchanged from `BaseController`, and the decorator throws when applied at class level. The user ruled on it at execution time.

| # | Decision | Supersedes |
| --- | --- | --- |
| **D-IUA-10** | `@ApiOperation` is exempted on handlers **inherited unchanged from `BaseController`**. The decorator is built by `createMethodDecorator`, which dereferences `descriptor.value` unconditionally; applied at class level Nest supplies no descriptor and it throws at class-definition time — the original AC.3 named a placement that does not exist. The exemption is narrow and binds only to handlers a subclass inherits without overriding: the catalog `GET` (T-01) carries no `@ApiOperation`, but any **own-declared** handler — the section `GET`/`PATCH` (T-07) — keeps `@ApiOperation` and `@ApiBody` fully required. Ruled **2026-08-19 at execution time** (T-01 attempt 2, Pivot Record in `execution.md`), not at specify time. DD-5 is the governing precedent: it already refused `@Roles(...)` because "matching the reference means none," and R-IUA-013's own stated intent — the new endpoints "indistinguishable from the rest of the API" — makes matching the 19 undecorated `BaseController` siblings the conforming outcome, not a gap | R-IUA-013 AC.3 (original, unqualified text) · T-01 attempt 1's `find()` override, which re-declared `@Get()` solely to hang the annotation · `proposal.md` § *Proposed Outcome* ("every endpoint carries `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, and per-param Swagger decorators") and § *Success Criteria* ("Swagger documents every new endpoint with the four required decorators") — both left unedited as point-in-time record, superseded here exactly as D-IUA-5 and D-IUA-6 supersede proposal scope items 7 and 6 |

---

## 14. Requirement ID Index

| ID | Title | Scenarios | Gate |
| --- | --- | --- | --- |
| R-IUA-001 | Detail row exists from creation | 1 | F-E + unit |
| R-IUA-002 | Read the full section | 1 | F-A + unit |
| R-IUA-003 | Write the section atomically | 2 | F-A + unit |
| R-IUA-004 | Actor counts, modes, derived total | 2 | unit + F-A |
| R-IUA-005 | Duplicate actor types rejected | 1 | unit |
| R-IUA-006 | Conditional justification at level ≥ 6 | 1 | **F-C** + unit |
| R-IUA-007 | Organizations carry a count | — | F-A + unit |
| R-IUA-008 | Other quantitative measures | — | F-A + unit |
| R-IUA-009 | Reconciliation never crosses a role | 1 | **F-B** |
| R-IUA-010 | Use-level catalog endpoint | 1 | unit + **F-D** |
| R-IUA-011 | Result can actually be submitted | 1 | **F-E** + unit |
| R-IUA-012 | Green checks reflect the save (pull) | — | F-E + unit |
| R-IUA-013 | Repo conventions on every surface | — | unit + **human `/swagger` check** |
| NFR-IUA-001 | Read cost bounded | — | review + fixture |
| NFR-IUA-002 | DB-backed proof is a gate | — | `test:fixtures` |
| NFR-IUA-003 | Coverage floor held | — | `test:cov` |

**13 functional + 3 non-functional. 11 scenarios. 5 fixtures (F-A … F-E).**

---

## 15. Sign-off

- [ ] Engineering lead — David Felipe Casañas Hernández
- [ ] MEL / product owner — *pending*
- [ ] Security review — **not required**: no auth path, secret, or exclude-list change
- [ ] DevOps — **not required**: no migration, no env var, no infra change
