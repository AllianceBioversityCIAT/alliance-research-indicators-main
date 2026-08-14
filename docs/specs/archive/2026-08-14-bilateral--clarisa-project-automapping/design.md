# Design — Bilateral / CLARISA project auto-mapping — **S1: Coverage Measurement**

- **Module:** bilateral (`domain/tools/clarisa/projects` + `domain/entities/bilateral-project-mapping`)
- **Spec id:** `2026-08-clarisa-project-automapping` (stage **S1**)
- **Status:** draft — **judgment-day round 1 applied** (see [`./judgment.md`](./judgment.md))
- **Owner:** ARI squad — J. Cadavid
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Linked TRD:** `docs/trd/trd.md` — integrations, API contracts, observability
- **Last updated:** 2026-08-14

---

## Executive Summary

S1 adds **one read-only endpoint** and the pure functions it needs. It is a measuring instrument, not a feature:

```
GET /api/bilateral-project-mappings/coverage-report      ← no /v1: see DD-12
   → ClarisaProjectsService.listProjectsForCoverage(phase)  → { all, slice }
   → DataSource query over agresso_contracts                  [read only, singleton — DD-11]
   → normalizeExternalCode()                                  [pure]
   → classify into 5 tiers                                    [pure, in-memory maps]
   → CoverageReportDto                                        [ServerResponseDto envelope]
```

**Three decisions carry the design:**

1. **S1 persists nothing** (DD-1) — no migration, no row, no cron. It ships safely ahead of CLARISA's production promotion.
2. **Funding source and has-mappings are *reported dimensions*, not filters** (DD-2) — this converts proposal OQ-2 and OQ-5 from blocking guesses into numbers on a page.
3. **Absence of the upstream contract is reported as absence, never as zero** (DD-3) — the one behavior that decides whether this report is trustworthy in production.

**Two more were forced by judgment-day** and are load-bearing: the AGRESSO read must not travel through `AgressoContractRepository` (DD-11 — it would cascade `Scope.REQUEST` into a module that declares itself singleton-only, silently violating this spec's own R-CPA-007), and the new handler must be declared **above** the existing `@Get(':id')` or it is permanently shadowed (DD-12).

---

## 1. Goals & non-goals

**Goals**

- Produce a reproducible, self-describing coverage number (R-CPA-004, NFR-CPA-001).
- Make an unmeasurable environment legible as unmeasurable (R-CPA-005).
- Answer OQ-2 and OQ-5 from data rather than from opinion (R-CPA-002, R-CPA-004).
- Stay inert: zero persisted state, zero behavior change, **including zero DI-scope change** (R-CPA-007).

**Non-goals**

- Writing any mapping, `AI_SUGGESTED` or otherwise — **S2**.
- The admin review queue and its (still non-existent) visual reference — **S2**.
- Surfacing `description` in STAR — **S2**, gated on the 19% fill-rate reading.
- Fixing the pre-existing case-sensitivity defect in `listBilateralProjects()` — see **DD-9**, deliberately out of scope.

---

## 2. Architecture

```
HTTP  GET /api/bilateral-project-mappings/coverage-report
  │      (global prefix 'api'; URI versioning enabled but NO defaultVersion,
  │       and this controller declares no @Version → no /v1 segment. DD-12)
  │
  ├─ RolesGuard  @Roles(CENTER_ADMIN, SYSTEM_ADMIN)          [existing, controller-level]
  │
  └─ BilateralMappingCoverageService                          [NEW — singleton]
       ├─ ClarisaProjectsService.listProjectsForCoverage(phase) [NEW method]
       │     └─ returns { all, slice } — `all` feeds the availability guard
       │        and alliance_selector_agreement; `slice` feeds classification
       │        (existing private getCachedAll(), 5-min TTL, unchanged)
       ├─ DataSource.getRepository(AgressoContract)            [DD-11 — NOT AgressoContractRepository]
       │     └─ SELECT agreement_id, funding_type, short_title, description
       │        FROM agresso_contracts
       │        WHERE is_active = 1
       │          AND UPPER(funding_type) IN ('BLR','BILATERAL')
       └─ external-code.util.ts  normalizeExternalCode()       [NEW pure util, module-local]
             │
             └─→ CoverageReportDto ─→ ResponseUtils.format ─→ ServerResponseDto
```

**Boundary with `shared/`:** none crossed. The normalization util is module-local (server guide §3 rule 3 — `shared/` needs two consumers). It moves in S2 *if* the matcher and the report both consume it.

**Boundary with the transport rule:** the report never calls axios. It reuses `ClarisaProjectsService`, which owns the CLARISA transport (server guide §8).

### 2.1 Composition

| Path | Responsibility | New/Changed |
| --- | --- | --- |
| `tools/clarisa/projects/dto/clarisa-project.types.ts` | `ClarisaProject` gains `external_code?`, `phase?`, `source_center_acronym?` — all optional, all nullable | Changed |
| `tools/clarisa/projects/clarisa-projects.service.ts` | New `listProjectsForCoverage(phase)` → `{ all, slice }`. **Existing `listBilateralProjects` / `findProjectById` untouched** | Changed |
| `entities/bilateral-project-mapping/utils/external-code.util.ts` | `normalizeExternalCode(raw)` → `{ normalized, rule }`; pure, no DI | **New** |
| `entities/bilateral-project-mapping/utils/external-code.util.spec.ts` | Normalization + collision unit tests | **New** |
| `entities/bilateral-project-mapping/bilateral-mapping-coverage.service.ts` | Slice + contracts → `CoverageReportDto`. Injects `ClarisaProjectsService` + `DataSource` only (DD-11) | **New** |
| `entities/bilateral-project-mapping/bilateral-mapping-coverage.service.spec.ts` | Tier, sum invariant, determinism, absence guard, single-query, no-write | **New** |
| `entities/bilateral-project-mapping/dto/coverage-report.dto.ts` | Response shape + `@ApiProperty` (the largest single artifact — see §15) | **New** |
| `entities/bilateral-project-mapping/dto/coverage-report.query.dto.ts` | `phase?`, `limit-samples?` with `class-validator` | **New** |
| `entities/bilateral-project-mapping/bilateral-project-mapping.controller.ts` | One `@Get('coverage-report')` handler — **declared above the existing `@Get(':id')`** (DD-12) | Changed |
| `entities/bilateral-project-mapping/bilateral-project-mapping.module.ts` | Provide the coverage service; import `ClarisaProjectsModule`. **No `AgressoContractModule` import** (DD-11) | Changed |
| `entities/bilateral-project-mapping/entities/bilateral-project-mapping.entity.ts` | **Header comment only** — replace the D-PI-8 "no upstream join field exists" claim with a pointer to DD-8's supersession. No column change (DD-8) | Changed |
| `entities/bilateral-project-mapping/coverage-report.http.spec.ts` | **Bootstrapped `TestingModule` + supertest** — proves route resolution and the 403 envelope, neither of which a controller unit spec can reach (DD-12) | **New** |

No change to `domain/routes/main.routes.ts` — the handler hangs off the already-registered controller.

### 2.2 Reuse

Consumed as-is: `RolesGuard`, `@Roles`, `ResponseUtils.format`, `ResponseInterceptor`, `GlobalExceptions`, `LoggerUtil`, `ClarisaProjectsService` (cache + resilience), `DataSource` (already injected by `BilateralProjectMappingService`).

**Configuration is read from `process.env` directly** — `ARI_CLARISA_PROJECTS_PHASE` and `ARI_CLARISA_HOST` (the latter only to report which host was measured). This mirrors `clarisa.connection.ts:10`, which reads `env.ARI_CLARISA_HOST` the same way. *There is no `EnvUtil` in this repository* — the DB-backed `AppConfig` / `EnvAppConfigUtil` read `app_config` rows, not process env, and neither is appropriate for a deployment-level integer. (Judgment-day **B-1**.)

**Deliberately not reused:**

- **`AgressoContractRepository`** — see **DD-11**. It injects `CurrentUserUtil`, which is `Scope.REQUEST`; consuming it would make this module's providers and controller request-scoped.
- **`isBilateralTagTarget()`** (`agresso-contract.service.ts:165`) is `private` and additionally excludes contracts with an active pooled-funding contract. The report needs the funding-type test alone. Rather than widen a private method or duplicate a subtly different rule, the query encodes `funding_type ∈ {BLR, BILATERAL}` and the report **states that definition in its payload** (requirements A-1). Extraction deferred to S2, where the matcher needs the same predicate.

---

## 3. Data model

**No entity schema changes.** No table, column, index, migration, or OpenSearch decoration. Enforced as R-CPA-007 AC.1.

One **comment-only** edit: `bilateral-project-mapping.entity.ts` still asserts *"no upstream join field exists per D-PI-8"* (lines 8-9), which DD-8 supersedes. Changing a comment alters no schema and generates no migration. (Judgment-day **B-6**.)

Read-only touch points:

| Source | Fields read |
| --- | --- |
| `agresso_contracts` | `agreement_id`, `funding_type`, `short_title`, `description`, `is_active` |
| CLARISA `/api/projects` (cached) | `id`, `external_code`, `phase`, `source_center_acronym`, `source_of_funding`, `full_name`, `description`, `project_mappings_array`, `lead_institution_object.acronym` |

**Configuration**

| Key | Default | Notes |
| --- | --- | --- |
| `ARI_CLARISA_PROJECTS_PHASE` | `2026` | Closes proposal R-6. Read per request from `process.env`, coerced to a number; non-numeric → `400`, never a silent `NaN` filter |
| `ARI_CLARISA_HOST` | *(existing)* | Reported as `environment.clarisa_host`; not newly introduced |

---

## 4. API surface

### `GET /api/bilateral-project-mappings/coverage-report`

> **No `/v1` segment.** `main.ts:53-56` sets the global prefix `api` and enables URI versioning **without a `defaultVersion`**, and this controller declares no `@Version` — so unversioned controllers register with no version segment. The existing controller comment documents the same path. (Judgment-day **B-4**.)

- **Controller:** `bilateral-project-mapping.controller.ts` — handler declared **before** `@Get(':id')` (DD-12)
- **Roles:** `@Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)` — inherited from the controller decorator
- **Guards:** `RolesGuard` (controller-level, existing)
- **Query params:** `phase?` (int, overrides the configured phase), `limit-samples?` (int 1–50, default 10)
- **Body DTO:** none
- **Response `data` shape** (`CoverageReportDto`, conceptual):

| Block | Contents | On the absence path (`upstream_contract_available: false`) |
| --- | --- | --- |
| `environment` | `clarisa_host`, `upstream_contract_available` | **present** |
| `measured_at`, `phase_used` | ISO timestamp; the phase applied | **present** |
| `definitions` | The bilateral-contract predicate and the normalization rule set, in words — so the reader need not open the code (NFR-CPA-004) | **present** |
| `clarisa` | `slice_size`; splits by `source_center_acronym`, normalized `source_of_funding`, `has_project_mappings`, `description_populated`, `external_code_populated`; `alliance_selector_agreement` (DD-10) | **present** — this is the part that *was* measurable |
| `agresso` | `bilateral_contract_total` | **`null`** |
| `resolution` | Per tier (`EXACT_CODE`, `NORMALIZED_CODE`, `FULL_NAME`, `AMBIGUOUS`, `UNRESOLVED`): `count`, `percentage`, `numerator`, `denominator` | **`null`** |
| `normalization` | `collision_count`, `collisions[]` | **`null`** |
| `samples` | ≤ `limit-samples` `{ agreement_id, clarisa_project_id, matched_on }` per tier | **`null`** |

> Every block whose value would be a **meaningless zero** is `null`, not `0`. `bilateral_contract_total: 0` is indistinguishable from "this deployment has no bilateral contracts" — the exact confusion DD-3 exists to prevent, one field over. (Judgment-day **B-7**.)

- **Swagger:** `@ApiTags('Bilateral / Admin')`, `@ApiBearerAuth()`, `@ApiOperation`, `@ApiQuery` × 2 — all required
- **Errors:** `400` invalid `phase`/`limit-samples`; `403` insufficient role; `503` CLARISA unreachable with a cold cache (existing behavior, unchanged)
- **Notes:** additive; no version bump because there are no versions. Machine-token access is **not** granted.

---

## 5. Workflows & business rules

1. **Resolve phase** — query `phase` if present, else `process.env.ARI_CLARISA_PROJECTS_PHASE`, else `2026`. Coerce to number; reject non-numeric with `400`.
2. **Fetch** — `ClarisaProjectsService.listProjectsForCoverage(phase)` returns **both** `all` (the full cached payload) and `slice` (projects whose `source_center_acronym`, trimmed and upper-cased, ∈ `{CIAT, BIOVERSITY}` and whose `phase` coerces to the resolved phase). Both are needed: the guard in step 3 and `alliance_selector_agreement` in step 7 read `all`; classification reads `slice`. (Judgment-day **B-2**.)
3. **Availability guard (R-CPA-005)** — if **no** project in `all` carries a non-null `external_code`, set `upstream_contract_available = false`, null `agresso` / `resolution` / `normalization` / `samples`, emit the `clarisa` block that *was* measurable, and return. **Steps 4–6 do not run.** The check is against `all`, not `slice`: an empty slice with a populated feed is a different fact from an unpublished contract, and the report must never conflate them.
4. **Build the code indexes** — two `Map<string, projectId[]>` over `slice`: one keyed by raw `external_code`, one by `normalizeExternalCode(...)`. Any normalized key mapping to >1 project is recorded as a collision and marked ambiguous.
5. **Fetch contracts** — one query via `DataSource` (DD-11) over `agresso_contracts` where `is_active = 1` and `UPPER(funding_type) IN ('BLR','BILATERAL')`. Exactly one query per report (NFR-CPA-003).
6. **Classify, first hit wins** — per contract, in order: `EXACT_CODE` → `NORMALIZED_CODE` → `FULL_NAME` → else `UNRESOLVED`. A hit against a collided key, or a tier producing >1 project, yields `AMBIGUOUS` instead.
7. **Aggregate** — counts; percentages each carrying numerator + denominator; `alliance_selector_agreement` computed over `all` (in both selectors / this spec's only / legacy `acronym === 'ABC'` only); per-tier samples capped at `limit-samples`.
8. **Assert the invariant** — the five tier counts must sum to `bilateral_contract_total`. Asserted in code (throwing `500` on violation — a report that miscounts is worse than no report) and separately in test (R-CPA-004 AC.3).

**Side effects:** none. No `sync_process_logs` row (nothing synced — R-CPA-007), no OpenSearch reindex, no socket emit, no RabbitMQ message. **Transactions:** none; a single read. **Rollback:** revert the code.

---

## 6. Frontend impact

**None.** No admin SSR page, no STAR client change. The report is consumed via Swagger / HTTP by an admin during the HITL reading (requirements D8). The review-queue UI is S2 and still carries the unresolved visual-reference gap flagged in proposal §9 — S2 must generate a mockup rather than repeat `primary-contributing-sp`'s AC.6 outcome.

---

## 7. Integration impact

| System | Files | Change |
| --- | --- | --- |
| **CLARISA** | `tools/clarisa/projects/{dto/clarisa-project.types.ts, clarisa-projects.service.ts}` | 3 optional DTO fields; 1 new read method returning `{ all, slice }`. **No new upstream call pattern** — same endpoint, same 5-min TTL cache, same warm-cache-on-error resilience. New env var `ARI_CLARISA_PROJECTS_PHASE`. |
| **AGRESSO** | *(none)* | **No AGRESSO file is modified.** The read goes through `DataSource` from inside this module (DD-11), so neither `AgressoContractRepository` nor `AgressoContractModule` is touched or imported. |
| **Cron** | — | **No cron job.** S1 is pull-on-demand; scheduling an ingest belongs to S2 and would imply persistence S1 does not have. |
| Everything else | — | Untouched. |

---

## 8. Security & authorization

- **Who can call it:** `CENTER_ADMIN`, `SYSTEM_ADMIN` (the latter also bypasses via `RolesGuard`'s existing rule). Same gating as the module's other admin handlers (NFR-CPA-002).
- **Machine token:** not granted. No `app_secrets` / `app_secret_host_list` row added.
- **JWT `exclude` list:** untouched.
- **New secrets:** none. `ARI_CLARISA_PROJECTS_PHASE` is a plain integer.
- **PII / donor-restricted data:** the payload carries contract ids, project ids and project names — the same class the existing mapping list already returns to the same roles. Samples are capped and carry no financial figures. No new exposure.

---

## 9. Observability

- One `LoggerUtil` line per report at `log` level: phase used, slice size, contract count, tier counts, collision count, `upstream_contract_available`. The reading stays recoverable from logs even if the response is lost.
- One `warn` line when `upstream_contract_available` is `false`, naming the CLARISA host — an accidental production run is visible in logs, not only in the payload.
- **No `sync_process_logs` row** — that table records syncs; none occurred (R-CPA-007).
- No new metric or dashboard. S1 is invoked by hand, a handful of times.

---

## 10. Testing strategy

| Suite | Covers | Notes |
| --- | --- | --- |
| `external-code.util.spec.ts` | R-CPA-003 AC.1–AC.4 | Pure; table-driven incl. `X-A132` non-strip and the `C-A500`/`A500` collision |
| `clarisa-projects.service.spec.ts` (extend) | R-CPA-001, R-CPA-002 | **Must include a fields-absent fixture** and a fixed-id regression assertion for `listBilateralProjects()` |
| `bilateral-mapping-coverage.service.spec.ts` | R-CPA-004, R-CPA-005, NFR-CPA-001, NFR-CPA-003 | Tier fixture, sum invariant, double-run determinism, absence guard (asserting `agresso`/`normalization`/`samples` are null too), single-query assertion, no-write assertion |
| **`coverage-report.http.spec.ts`** | **R-CPA-006 AC.1–AC.4, defect classes D6 + D10** | **New and load-bearing.** Bootstraps a `TestingModule` → `createNestApplication()`, **replicating `setGlobalPrefix('api')` and `enableVersioning({type: URI})` from `main.ts`**, then drives it with supertest. Doubles for `ClarisaProjectsService` and `DataSource`; no MySQL, no live CLARISA |

**Why the fourth suite exists.** The plan originally had no gate that exercises the HTTP path at all, and two likely failures were invisible to every gate it did have:

| Failure | Why unit specs miss it |
| --- | --- |
| **Route shadowing** — `@Get('coverage-report')` declared after `@Get(':id')` is never reached; `ParseIntPipe` rejects `'coverage-report'` and the endpoint returns **400 forever** | A controller unit spec calls `controller.coverageReport()` directly. Nest never routes. The suite stays green while the endpoint is unreachable |
| **403 envelope (R-CPA-006 AC.3)** | The existing spec asserts guard *presence* (`bilateral-project-mapping.controller.spec.ts:54-63` checks `g === RolesGuard`). Deleting `@Roles` would not redden it — a presence assertion, not a behavioral proof |

Both would have been discovered by the D8 human reading — i.e. by the deliverable failing. This is a **Kaizen K-004** shape: gates that cannot go red for the reason they were mandated. The new suite can: declare the handler after `@Get(':id')` and its route test returns 400 instead of 200.

**Mocking:** `ClarisaProjectsService` and the AGRESSO read are `jest.fn()` doubles. **Kaizen KZ-001 applies** — doubles must return payloads that actually differ in the property under test; an AGRESSO double returning the same three contracts everywhere cannot demonstrate the sum invariant. Fixtures are per-case, not shared.

Coverage: global 60% threshold unchanged.

**Classic e2e (`test/jest-e2e.json`):** still none. The bootstrapped suite above covers the routing and guard behavior without requiring MySQL.

---

## 11. Rollout

- **Migration order:** n/a — no migration.
- **Feature flag:** none. An admin-only read endpoint that writes nothing does not warrant one.
- **Backout:** revert the commit. No state to unwind.
- **Deploy dependency:** `ARI_CLARISA_PROJECTS_PHASE` in the target env, or the default `2026` applies. DevOps sign-off item.
- **Comms:** the CLARISA team needs a promotion date for the upstream fields (proposal R-1) before S2. S1 needs nothing from them.

---

## 12. Design decisions log

| # | Date | Decision | Rationale | Challenged? |
| --- | --- | --- | --- | --- |
| **DD-1** | 2026-08-14 | **S1 persists nothing** | Inert and independently shippable ahead of CLARISA's production promotion (R-1). Backout is `git revert`. Removes the class of "the measurement changed what it measured" | n/a |
| **DD-2** | 2026-08-14 | `source_of_funding` and `has_project_mappings` are **reported dimensions, not filters** | Converts OQ-2 and OQ-5 into readable numbers. Filtering on them would bake in the decision S1 exists to inform | n/a |
| **DD-3** | 2026-08-14 | **Absence of the upstream contract nulls `resolution`** (and `agresso`, `normalization`, `samples`) rather than reporting zeros | `0% resolved` and `the field does not exist here` are indistinguishable as numbers and opposite as facts. Production is the second case today | n/a |
| **DD-4** | 2026-08-14 | Normalization strips only a **closed** `{B-, C-}` set, once | A greedy `^[A-Z]-` would strip non-centre prefixes, turning a visible `UNRESOLVED` into a silent wrong match. Measured exact over 380 rows, zero counter-examples. A new centre degrades loudly | n/a |
| **DD-5** | 2026-08-14 | Phase from `ARI_CLARISA_PROJECTS_PHASE` | Closes R-6 at near-zero cost | n/a |
| **DD-6** | 2026-08-14 | Fixed tier order, first hit wins, counts **must sum** to the contract total | Without the invariant a contract is counted twice and the headline percentage is quietly inflated — defect class D1. Asserted in code and test | n/a |
| **DD-7** | 2026-08-14 | Normalization util stays **module-local** | Server guide §3 rule 3: `shared/` needs two consumers. It gets its second in S2 | n/a |
| **DD-8** | 2026-08-14 | **Supersedes D-PI-8**; D-PI-8 is *not* rewritten in place. The entity header comment is corrected to point at this supersession | The premise is factually dead — CLARISA publishes `external_code`. The archive contract requires superseding, not editing, an accepted decision | n/a |
| **DD-9** | 2026-08-14 | **Do not fix** the pre-existing case-sensitivity defect in `listBilateralProjects()` in S1 | See §12.1 | **Yes — §12.1** |
| **DD-10** | 2026-08-14 | Publish `alliance_selector_agreement` — how far `source_center_acronym ∈ {CIAT, BIOVERSITY}` agrees with the legacy `lead_institution_object.acronym === 'ABC'` selector | Two different mechanisms for "is this an Alliance project"; S2 must pick one. Measuring the disagreement now is cheap and unanswerable later without re-running the report. Requires the full payload — see DD-14 | n/a |
| **DD-11** | 2026-08-14 | **Read AGRESSO through `DataSource`, not `AgressoContractRepository`** | `AgressoContractRepository` injects `CurrentUserUtil`, which is `@Injectable({scope: Scope.REQUEST})`. Injecting it would cascade REQUEST scope through the coverage service to `BilateralProjectMappingController`, which is a singleton today — **changing how the existing CRUD endpoints instantiate**, inside a spec whose headline promise is "changes no existing behavior". The module header states this invariant explicitly. `DataSource` is already injected by `BilateralProjectMappingService` and is a singleton. *(Judgment-day B-5 — the highest-value finding of the round: the spec would have been self-falsifying, with no planned test able to show it.)* | n/a — forced by review |
| **DD-12** | 2026-08-14 | The `@Get('coverage-report')` handler is declared **above** `@Get(':id')`, and a bootstrapped HTTP spec proves the route resolves | Nest matches in declaration order. Appended at the end, `GET .../coverage-report` is captured by `findById`'s `ParseIntPipe` and returns **400 forever** — invisible to every unit spec, since those call methods directly. *(Judgment-day B-3.)* | n/a — forced by review |
| **DD-13** | 2026-08-14 | Config is read from **`process.env` directly**, not via a util | There is **no `EnvUtil`** in this repository; `AppConfig` / `EnvAppConfigUtil` read `app_config` DB rows, not process env, and neither fits a deployment-level integer. `clarisa.connection.ts:10` already reads `env.ARI_CLARISA_HOST` this way. *(Judgment-day B-1.)* | n/a — forced by review |
| **DD-14** | 2026-08-14 | `listProjectsForCoverage(phase)` returns **`{ all, slice, phaseUsed }`** — see the amendment note below | `getCachedAll()` is `private`, and the two public reads are both filtered — so the availability guard (R-CPA-005, the spec's most important behavior) and `alliance_selector_agreement` had **no reachable data source**. The legacy-selector-only population is by definition outside the CIAT/BIOVERSITY slice. *(Judgment-day B-2.)* | n/a — forced by review |

> **DD-14 amendment — 2026-08-14, during execution (Leader decision, recorded not silent).**
> Originally `{ all, slice }`. Widened to include **`phaseUsed`** (the resolved numeric phase) after T-02's Reviewer observed that §4 requires `phase_used` in the payload and NFR-CPA-004 makes it load-bearing — but the method resolved the phase internally and returned no way to learn it. T-04 would therefore have had to **re-read `process.env` and re-implement the same precedence rule**, putting two copies of one rule in two files where they can drift.
>
> The Reviewer flagged this as *"a spec question, not an implementer's call"*, which is the correct read: widening an approved design decision is the Leader's call, and it is recorded here rather than left in a worker brief. Marginal cost was one field on a method already being changed for the NaN fix. **The user may overrule this amendment.**

### 12.1 Reversion challenge — DD-9

**The finding.** `clarisa-projects.service.ts:46` filters `p.source_of_funding === 'Bilateral'` — case-sensitive, capital `B` — and `:47` additionally requires `lead_institution_object?.acronym === 'ABC'`. The proposal's §4.4 measurement of the full feed counts `bilateral` (892, lower-case) against `Bilateral` (197). **The existing admin project picker is already dropping the large majority of bilateral projects**, and has been. This is a live instance of Kaizen **K-005** (an unnormalized string used as a discriminator).

**The decision under challenge:** leave it alone in S1.

| | Answer |
| --- | --- |
| Does S1's correctness depend on it? | **No.** R-CPA-002 defines its own normalized slice and never calls `listBilateralProjects()`. |
| Does leaving it make the report wrong? | **No** — it makes the report *more* valuable: `alliance_selector_agreement` (DD-10) quantifies exactly what the current picker misses, turning an inference into a measurement. |
| Does fixing it break anything? | **Yes, plausibly.** It would enlarge the option set of a live admin picker with no test pinning the intended population and no product decision that the lower-case rows *should* be offered (that is OQ-5's neighbourhood). A behavior change to a shipped UI, inside a spec whose headline promise is R-CPA-007, is exactly the quiet blast radius Kaizen **KZ-002/KZ-003** describe. |
| **How large is the change?** | **Measured, and larger than first stated.** Across the full feed a case-insensitive fix takes the picker's candidate pool from 197 to 1089 (**≈5.5×**). Within the Alliance-2026 slice the proposal counts 342 `bilateral` and **zero** `Bilateral` rows — so for the population this spec cares about the picker currently offers **0 of 342**, and the multiplier is unbounded. The ABC-filtered figure is unmeasured. *(An earlier draft said "~4×", which was the ratio of added rows to current rows, not the multiplier — judgment-day **B-8**.)* |
| Cost of deferring? | One extra spec touch in S2, where the population question is decided anyway and a test can pin the answer. |

**Outcome: DD-9 stands — do not fix in S1.** The defect is recorded, surfaced in the handoff, and carried into S2 as a named item. **Escalation to the user (OQ-7):** this is a pre-existing production defect found during design, and the corrected figures make it look worse than the first estimate. The user may reasonably want it fixed sooner than S2, as a separate `/akili-quick` or bugfix spec. That is their call, not this spec's.

---

## 13. Open questions

| ID | Question | Owner | Due |
| --- | --- | --- | --- |
| **OQ-1** | The coverage fraction itself | Squad | Answered by running this endpoint against DEV (requirements D8) |
| **OQ-2 / OQ-5** | Population scope (has-mappings; `window3`) | Product | After the reading — deliberately not decided here (DD-2) |
| **OQ-7** | Should DD-9's picker defect be fixed before S2, given the corrected 0-of-342 figure? | **User** | **Escalated at the design gate** |

Resolved into §12: OQ-3 (collisions — closed by measurement, now re-asserted per run by DD-4/R-CPA-003); OQ-6 partially (fill rate is reported; the display decision stays S2).

---

## 14. References

- [`./proposal.md`](./proposal.md) — measured evidence, §4.1–§4.4
- [`./judgment.md`](./judgment.md) — judgment-day round 1 ledger
- [`./evidence/probe-clarisa-projects.py`](./evidence/probe-clarisa-projects.py) — regenerates every figure in the proposal
- `docs/specs/archive/2026-06-17-bilateral-module*` — D-PI-8 (superseded by DD-8), D-PI-9, D-PI-11
- `docs/specs/kaizen-log.md` — K-001, K-004, K-005, KZ-001, KZ-002/003
- `server/researchindicators/src/CLAUDE.md` §3, §4, §8, §9, §11

---

## 15. Budget (Step 2.4 — re-checked, then re-raised after judgment-day)

| Metric | Draft-1 | Post-judgment | **Corrected during execution** |
| --- | --- | --- | --- |
| **Tasks** | 6 | 7 | **7** (unchanged) |
| **LOC** | ~550 | ~680 (≈400 prod / ≈280 test) | **~3000** (≈1300 prod / ≈1700 test) |
| **Review rounds** | 2 | 2 | **≥6** |

> **Budget tripwire fired 2026-08-14 and was escalated to the user, who reviewed the delta and ruled that the *estimate* was wrong, not the code.** Corrected figures above.
>
> **Why the original estimate could not hold.** §4 of this document specifies a response payload of **seven blocks** — `environment`, `measured_at`/`phase_used`, `definitions`, `clarisa` (five split dimensions plus `alliance_selector_agreement`'s three populations), `agresso`, `resolution` (five tiers × four fields), `normalization`, and per-tier `samples`. T-04 alone came to 573 production lines against an estimate of 220. A payload of that shape does not fit in 220 lines, and no implementation discipline would have made it.
>
> §15's own tripwire note *"the most likely overrun source is `coverage-report.dto.ts`"* named the right artifact and understated the magnitude by roughly 3×.
>
> **What the tripwire did right:** it fired, it stopped the run, and the decision to continue was the user's rather than the Leader's assumption. That is the mechanism working — exceeding a budget is information, and the cost of a mis-sized spec is only recoverable while it is still running.
>
> **Test-to-production ratio held steady at ≈1.3–2× across all four measured tasks**, so the overage is proportional across both halves rather than concentrated in test bloat.

**What moved it.** The production estimate was light on `CoverageReportDto` alone — seven blocks, five tiers × four fields, each nested class carrying `@ApiProperty`, realistically 120–180 LOC before any logic (judgment-day **B-11**). And DD-12 added a seventh task: the bootstrapped HTTP spec that is the only gate able to catch route shadowing and the 403 envelope.

**Depth re-check.** The proposal recommended **Lite**, guessed before the design existed. The finished design resolves to 7 tasks across two modules, a service with a stated invariant, a pure util with a collision rule, a new endpoint, an HTTP-level spec, and a superseded ADR. **Depth corrected to Standard**, recorded here and in `requirements.md` Document Control.

This budget is a **tripwire, not a cap**. `/akili-execute` escalates rather than silently continuing. The most likely overrun source is now **`coverage-report.dto.ts`** — name it in the escalation if it trips.

---

## 16. Judgment-day record

| Field | Value |
| --- | --- |
| Rounds run | **1** (user-requested) |
| Verdict | **APPROVED ✅** — see [`./judgment.md`](./judgment.md) |
| Findings | severe **5** · warning **4** · suggestion **2** — **all 11 applied** |
| Protocol deviation | One of the two judges did not deliver findings. Every severe finding was **independently re-verified against the repository** before any fix. Recorded in `judgment.md`, not smoothed over |
| Not done | The **corrected** design has not been re-judged. One round was the instruction |
| Design changes forced by review | DD-11, DD-12, DD-13, DD-14 — four decisions that did not exist in draft-1 |

---

## Document Control

| Field | Value |
| --- | --- |
| Depth | **Standard** (corrected from the proposal's pre-design *Lite*, §15) |
| Approval Mode | **pre-approved** — routine gates auto-pass and are logged |
| Phase 2 gate | **auto-approved (pre-approved mode)** — 2026-08-14 |
| Judgment-day | **run, 1 round** — §16 |
| Reversion challenge | **run** — DD-9, outcome in §12.1 (decision stands; escalated as OQ-7) |
