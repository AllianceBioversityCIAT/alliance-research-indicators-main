# Requirements — Bilateral / CLARISA project auto-mapping — **S1: Coverage Measurement**

- **Module:** bilateral (server: `domain/tools/clarisa/projects` + `domain/entities/bilateral-project-mapping`)
- **Spec id:** `2026-08-clarisa-project-automapping` (stage **S1**)
- **Status:** draft
- **Owner:** ARI squad — J. Cadavid
- **Linked PRD section:** `docs/prd.md` — bilateral contract↔project alignment
- **Linked tickets:** AC-1676
- **Last updated:** 2026-08-14
- **Extends:** `docs/specs/archive/2026-06-17-bilateral-module*` (D-PI-8, D-PI-9, D-PI-11)
- **Depends on:** `docs/specs/bilateral/mapping-adjustments/` (delivered, archived)
- **Source proposal:** [`./proposal.md`](./proposal.md) — §12 recommends Option A in two stages; **this spec is S1 only.**

---

## Executive Summary

**What this delivers:** a read-only **coverage report** that answers the one question the auto-mapper's design depends on and nobody can answer today — *of STAR's live bilateral AGRESSO contracts, what fraction resolve to a CLARISA Alliance-2026 project, and by which rule?*

**What it deliberately does not deliver:** any mapping. S1 writes **nothing** — no rows, no schema, no migration. The matcher, the provenance columns and the admin review queue are **S2**, and S2's requirements are written after this report exists, against a distribution somebody has actually seen.

**Why staged.** The proposal's §4.3 measurement showed `external_code` mismatches are a *systematic centre prefix* (`B-`/`C-`), not fuzzy text — which demotes `full_name` matching from co-primary strategy to residue fallback. That reframing is worth acting on, but the size of the residue is unmeasured: the DEV MySQL was unreachable during analysis, so no STAR-side contract was ever compared. Designing a matcher against an unmeasured distribution is the exact failure **Kaizen K-004** names — a gate that cannot fail.

**The single most important behavior in this spec** is R-CPA-005: the report must **refuse to publish percentages** when the upstream contract is absent (production today), rather than reporting `0%` resolved. Those two outcomes look identical in a number and mean opposite things.

---

## Glossary

| Term | Meaning |
| --- | --- |
| **Upstream contract** | The 13 fields CLARISA `/api/projects` publishes only in `clarisatest-back` today (`external_code`, `phase`, `source_center_acronym`, …). Absent in production as of 2026-08-14. |
| **`external_code`** | CLARISA's copy of the AGRESSO code, centre-prefixed (`C-A132`, `B-A1080`) or bare (`A1463`). |
| **Normalized code** | `external_code` with a leading known centre prefix (`B-`, `C-`) stripped. |
| **Alliance 2026 slice** | CLARISA projects where `source_center_acronym ∈ {CIAT, BIOVERSITY}` **and** `phase = <configured phase>`. 380 rows on 2026-08-14. |
| **STAR bilateral contract** | A row in `agresso_contracts` whose `funding_type` upper-cases to `BLR` or `BILATERAL` (the existing definition at `agresso-contract.service.ts:165-177`). |
| **Resolution tier** | How a contract was matched: `EXACT_CODE`, `NORMALIZED_CODE`, `FULL_NAME`, `UNRESOLVED`, `AMBIGUOUS`. |
| **S1 / S2** | Stage 1 (this spec — measure) / Stage 2 (matcher, provenance, review queue — not yet specified). |

---

## 1. Context

`bilateral_project_mapping` is maintained by hand because the entity's own comment records that *"no upstream join field exists per D-PI-8"*. CLARISA has since published `external_code` — the AGRESSO code STAR already keys on — so **D-PI-8's premise is dead** and the schema's unused `source: AI_SUGGESTED | AI_AUTO` and `confidence_score` seams become reachable.

Before building the matcher, S1 measures what the join key actually resolves. It also converts two open scope questions from the proposal into **reported dimensions** instead of guesses:

- **OQ-2** — only 5 of 380 Alliance projects carry a non-empty `project_mappings_array`. S1 reports the has-mappings split rather than filtering on it.
- **OQ-5** — the briefed filter would pull in 38 `window3` projects alongside 342 `bilateral` ones. S1 reports the funding-source split rather than deciding it.

**Explicitly not changing:** the existing manual mapping UI, `listBilateralProjects()`'s behavior, the `bilateral_project_mapping` table, and the pool-funding tag.

---

## 2. Requirement numbering

`R-CPA-<NNN>` — **CPA** = CLARISA Project Auto-mapping. A distinct prefix from the archived `R-BIL-0xx` series so no citation collides.

---

## 3. Functional requirements

### R-CPA-001 — Consume the upstream CLARISA project contract without breaking on its absence

- **As a** STAR backend integrating CLARISA
- **I want** the `ClarisaProject` shape to carry the new upstream fields as strictly optional
- **So that** the same build runs against test (fields present) and production (fields absent) without a crash or a silent wrong answer

**Details:**
- Inputs: `GET {ARI_CLARISA_HOST}api/projects` payload.
- Behavior:
  - Extend the `ClarisaProject` TypeScript interface at `domain/tools/clarisa/projects/dto/clarisa-project.types.ts` with the upstream fields this spec consumes: `external_code`, `phase`, `source_center_acronym`. Every one is optional (`?`) and nullable.
  - No runtime validation is added that rejects a payload missing them.
  - Existing consumers (`listBilateralProjects`, `findProjectById`) keep their current behavior byte-for-byte.
- Outputs: none directly — this is a type/contract requirement observed through R-CPA-004/005.
- Errors: unchanged. Upstream failure still yields the existing warm-cache / `503` behavior.
- Permissions: n/a.

**Acceptance criteria:**
- [ ] AC.1 — A payload containing **only** the pre-existing 12 fields deserializes and every consumer returns the same result as before the change.
- [ ] AC.2 — A payload containing the upstream fields exposes `external_code`, `phase`, `source_center_acronym` on the parsed object.
- [ ] AC.3 — `listBilateralProjects()` returns an identical set for an identical fixture before and after this change (proved by a test that fixes the expected ids).

**Out of scope:** the other 10 upstream fields (`external_source`, `source_status`, `last_synced_at`, …). Add on first need — the file's own header rule.

---

### R-CPA-002 — Select the Alliance 2026 slice by normalized criteria

- **As a** coverage report
- **I want** the CLARISA population under measurement defined by centre and phase, with the phase configurable
- **So that** the denominator is explicit and next year's phase is a config change, not a code change

**Details:**
- Behavior:
  - Slice = projects where `source_center_acronym` **normalized** (trimmed, upper-cased) ∈ `{CIAT, BIOVERSITY}` **AND** `phase` equals the configured phase.
  - The phase comes from an env var (default `2026`); it is **not** a literal in the matching code (proposal R-6).
  - `phase` is compared numerically after coercion, so `2026` and `"2026"` both match.
  - `source_of_funding` is **NOT** a filter in S1. It is a reported dimension (R-CPA-004), because deciding it is OQ-5 and this spec exists to inform that decision, not pre-empt it.
  - `project_mappings_array` emptiness is **NOT** a filter in S1, for the same reason (OQ-2).
- Errors: if the configured phase yields an empty slice, that is a valid measurement, reported as such — not an exception.
- Permissions: n/a.

**Acceptance criteria:**
- [ ] AC.1 — Given a fixture with mixed-case `ciat` / `Bioversity` / `CIAT `, all three are included.
- [ ] AC.2 — Given a fixture with `phase` values `2026` (number), `"2026"` (string) and `2025`, exactly the first two are included.
- [ ] AC.3 — Given a project from a non-Alliance centre, it is excluded regardless of phase.
- [ ] AC.4 — Changing the configured phase to `2025` changes the slice without any code edit.

#### Scenario: Funding source must not silently filter

- GIVEN the Alliance 2026 slice contains 342 `bilateral` and 38 `window3` projects
- WHEN the slice is computed
- THEN all 380 are in the measured population
- AND the report states the `bilateral` / `window3` split separately
- BUT it must NOT drop the `window3` projects from the denominator
- AND IT MUST normalize the funding-source string (case + trim) before grouping, per **Kaizen K-005** — the feed carries `bilateral`, `Bilateral`, `window3`, `Window 3`, `BILATERAL - RESTRICTED`

---

### R-CPA-003 — Normalize `external_code` reversibly and prove it is injective

- **As a** coverage report
- **I want** `external_code` stripped of a known centre prefix by an explicit, stated rule
- **So that** a match can be explained and a collision is detected rather than assumed away

**Details:**
- Behavior:
  - Normalization = trim, upper-case, then strip a **leading known centre prefix** from the closed set `{B-, C-}`. Nothing else is stripped.
  - The rule is applied at most once (`C-C-A1` → `C-A1`, not `A1`).
  - A code with no known prefix passes through unchanged.
  - The report computes, over the measured slice, whether normalization is **injective** — i.e. whether two distinct projects normalize onto the same code.
- Outputs: normalized code + the rule applied (`NONE` | `STRIP_CENTRE_PREFIX`) per project.
- Permissions: n/a.

**Acceptance criteria:**
- [ ] AC.1 — `C-A132` → `A132` with rule `STRIP_CENTRE_PREFIX`; `B-A1080` → `A1080`; `A1463` → `A1463` with rule `NONE`.
- [ ] AC.2 — Lower-case and padded input (` c-a132 `) normalizes identically to `C-A132`.
- [ ] AC.3 — A prefix outside the closed set (`X-A132`) is left intact.
- [ ] AC.4 — The report emits a collision count and, when non-zero, the colliding codes.

#### Scenario: Normalization must not merge two projects

- GIVEN two CLARISA projects whose `external_code` values are `C-A500` and `A500`
- WHEN the slice is normalized
- THEN both normalize to `A500`
- AND the report records a collision for `A500` naming both project ids
- BUT it must NOT report either project as a confident resolution for a contract keyed `A500`
- AND IT MUST classify any contract matching a collided code as `AMBIGUOUS`, never as `NORMALIZED_CODE`

> Measured 2026-08-14: zero collisions across the 380-row slice. The requirement exists because the population grows and the proposal closed OQ-3 *on today's data only*.

---

### R-CPA-004 — Publish a coverage report classifying every STAR bilateral contract

- **As a** tech lead deciding S2's matching strategy
- **I want** every live bilateral AGRESSO contract classified into a resolution tier with counts and examples
- **So that** the matcher is designed against a real distribution instead of an assumption

**Details:**
- Inputs: no request body. Optional query `phase` override; optional `limit-samples` (default 10).
- Behavior — for each active `agresso_contracts` row where `funding_type` upper-cases to `BLR` or `BILATERAL`:
  1. `EXACT_CODE` — `agreement_id` equals a slice project's raw `external_code`.
  2. `NORMALIZED_CODE` — `agreement_id` equals a slice project's **normalized** code (and that code has no collision).
  3. `FULL_NAME` — no code match, but `agreement_id`'s contract `short_title`/`description` normalizes-equal to a slice project's `full_name`.
  4. `AMBIGUOUS` — matched a collided normalized code, or matched more than one project in the same tier.
  5. `UNRESOLVED` — none of the above.
  - Tiers are evaluated **in order**; the first hit wins and is recorded as the rule applied.
- Outputs — `ServerResponseDto` with `data`:
  - `environment`: the CLARISA host measured, and `upstream_contract_available: boolean`.
  - `measured_at`, `phase_used`.
  - `clarisa`: slice size, plus splits by `source_center_acronym`, normalized `source_of_funding`, `has_project_mappings`, `description` populated, `external_code` populated, and `alliance_selector_agreement` — how far this spec's `source_center_acronym ∈ {CIAT, BIOVERSITY}` slice agrees with the selector the existing picker uses (`lead_institution_object.acronym === 'ABC'`). See `design.md` DD-10.
  - `agresso`: total bilateral contracts considered.
  - `resolution`: count **and percentage** per tier, with the denominator stated next to each percentage.
  - `normalization`: collision count + colliding codes.
  - `samples`: up to `limit-samples` examples per tier.
- Errors: `503` when CLARISA is unreachable with a cold cache (existing behavior). `400` on an invalid `phase`.
- Permissions: `@Roles(CENTER_ADMIN, SYSTEM_ADMIN)` + `RolesGuard`.

**Acceptance criteria:**
- [ ] AC.1 — Given a fixture of 4 projects and 4 contracts engineered to hit each of `EXACT_CODE`, `NORMALIZED_CODE`, `FULL_NAME`, `UNRESOLVED`, the report returns exactly 1 in each tier.
- [ ] AC.2 — Every reported percentage is accompanied by its numerator and denominator in the payload.
- [ ] AC.3 — The tier counts sum exactly to the AGRESSO bilateral total; no contract is uncounted or double-counted.
- [ ] AC.4 — The report is returned inside `ServerResponseDto` (`{ data, status, description, errors, timestamp, path }`).
- [ ] AC.5 — Both the `bilateral`/`window3` split and the has-mappings split appear, so OQ-5 and OQ-2 are answerable from the payload alone.
- [ ] AC.6 — `alliance_selector_agreement` reports, for the fetched payload, the count in both selectors, in this spec's selector only, and in the legacy `acronym === 'ABC'` selector only — so S2 can choose between them from data (`design.md` DD-10).

#### Scenario: A contract must land in exactly one tier

- GIVEN a contract `A132` and a slice containing project `X` with `external_code: 'A132'` and project `Y` with `external_code: 'C-A132'`
- WHEN the report classifies it
- THEN it is `EXACT_CODE` against project `X`, because exact is evaluated first
- AND the rule applied is recorded as `EXACT_CODE`
- BUT it must NOT also appear in the `NORMALIZED_CODE` count
- AND IT MUST make the sum of all tier counts equal the total bilateral contract count

---

### R-CPA-005 — Refuse to publish coverage when the upstream contract is absent

- **As a** reader of this report
- **I want** an unmeasurable environment to be reported as unmeasurable
- **So that** "production has no `external_code`" is never mistaken for "0% of contracts resolve"

**Details:**
- Behavior:
  - Before classifying, the report checks whether **any** project in the fetched payload carries a non-null `external_code`.
  - If none does, `upstream_contract_available` is `false`; `resolution`, `agresso`, `normalization` and `samples` are **all null — not zeroed**; and `description` states the contract is unavailable in the measured environment.
  - The `clarisa` block (slice size and splits) IS still emitted — that part was genuinely measurable.
  - The HTTP status is still `200` — the *measurement* succeeded; its subject was absent.
- Outputs: `data.upstream_contract_available = false`, `data.resolution = null`, plus the CLARISA host that was measured.

**Acceptance criteria:**
- [ ] AC.1 — Given a payload where every project lacks `external_code`, `resolution` is absent/null and no percentage appears anywhere in the payload.
- [ ] AC.2 — Given the same payload, `upstream_contract_available` is `false` and `environment` names the host measured.
- [ ] AC.3 — Given a payload where at least one project carries `external_code`, `upstream_contract_available` is `true` and percentages appear.
- [ ] AC.4 — Given a payload where every project lacks `external_code`, `agresso.bilateral_contract_total`, `normalization` and `samples` are **null**, not `0` / `[]`. A zero here is indistinguishable from "this deployment has no bilateral contracts" — the same confusion this requirement exists to prevent, one field over.
- [ ] AC.5 — Given the same payload, the `clarisa` block is still populated, so the caller can see the request itself succeeded.

#### Scenario: Production must not read as a measured zero

- GIVEN the report runs against `api.clarisa.cgiar.org` where the upstream fields do not exist
- WHEN the report is produced
- THEN `upstream_contract_available` is `false`
- AND the description says the upstream contract is not published in this environment
- BUT it must NOT emit `0%`, `0` resolved, or any tier percentage
- AND IT MUST still report the slice size it did observe, so the caller can see the request succeeded

---

### R-CPA-006 — Expose the report on an admin-only endpoint

- **As a** centre admin / system admin
- **I want** to trigger the report over HTTP
- **So that** the number is reproducible on demand rather than living in a one-off script

**Details:**
- `GET /api/bilateral-project-mappings/coverage-report`
- `@ApiTags('Bilateral / Admin')`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiQuery` per param — all required.
- `@Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)` under the controller's existing `RolesGuard`.
- Response wrapped via `ResponseUtils.format(...)`.

**Acceptance criteria:**
- [ ] AC.1 — A `SYSTEM_ADMIN` caller receives `200` with the report payload.
- [ ] AC.2 — A `CENTER_ADMIN` caller receives `200`.
- [ ] AC.3 — A caller with neither role receives `403` in the standard error envelope.
- [ ] AC.4 — The endpoint appears in `/swagger` under `Bilateral / Admin` with the bearer-auth lock.

---

### R-CPA-007 — Change no persisted state and no existing behavior

- **As a** maintainer
- **I want** S1 to be provably inert
- **So that** it can ship ahead of the CLARISA production promotion (proposal R-1) with no rollback plan beyond reverting code

**Details:**
- Behavior:
  - No migration is added. No table is created or altered.
  - No `bilateral_project_mapping` row is written, updated, or deactivated.
  - No `MANUAL` mapping is read for decisioning, altered, or flagged.
  - The AGRESSO read is a `SELECT`; the CLARISA read goes through the existing cached service.

**Acceptance criteria:**
- [ ] AC.1 — `git diff --stat` for the delivered branch shows **zero** files under `src/db/migrations/`.
- [ ] AC.2 — The coverage service's repository dependency exposes no write path; a test asserts `save`/`update`/`delete` are never invoked during a report run.
- [ ] AC.3 — The full existing `bilateral-project-mapping` and `clarisa-projects` spec suites pass unchanged.
- [ ] AC.4 — **The existing controller stays a singleton.** Two successive requests are served by the same `BilateralMappingCoverageService` instance. Pulling in a request-scoped provider (e.g. `AgressoContractRepository` → `CurrentUserUtil`) would re-scope the whole module including the shipped CRUD endpoints — a behavior change to existing endpoints that no functional test would reveal. See `design.md` DD-11 and defect class D11.

#### Scenario: The report is read-only

- GIVEN the coverage endpoint is called
- WHEN the report completes
- THEN the row count and contents of `bilateral_project_mapping` are identical before and after
- BUT it must NOT create any `AI_SUGGESTED` row — that is S2
- AND IT MUST NOT write a `sync_process_logs` row either, since no sync occurred

---

## 4. Non-functional requirements

### NFR-CPA-001 — Reproducibility of the published number

- **Category:** observability / dx
- **Target:** two runs against the same upstream payload produce byte-identical `resolution` counts. Every percentage in the payload carries its numerator and denominator. The payload names the CLARISA host and the phase used.
- **How verified:** unit test running the report twice over one fixture and deep-equalling the `resolution` block.

### NFR-CPA-002 — Authorization parity with the module

- **Category:** security
- **Target:** identical role gating to the existing bilateral mapping admin surface; no widening of the JWT `exclude` list.
- **How verified:** allowed + denied controller tests (server guide §9 requires both).

### NFR-CPA-003 — Bounded cost

- **Category:** performance
- **Target:** the classification is an in-memory join over ≤ ~2k projects × ≤ ~5k contracts using pre-built maps, not nested scans. p95 ≤ 3 s on a warm CLARISA cache.
- **How verified:** code review of the join structure (maps keyed by code) + a test asserting the AGRESSO repository is queried **once** per report.

### NFR-CPA-004 — The report explains itself

- **Category:** observability
- **Target:** the payload is self-describing enough that a reader six months later can tell which environment, which phase, and which normalization rule produced each number without reading the code.
- **How verified:** review at the HITL pause against the payload shape in `design.md` §4.

---

## 5. Data requirements

**No data model changes.** No entity is created or altered; no migration is generated; no index is added; no OpenSearch field is decorated. This is stated explicitly per the template rule, and is itself a requirement (R-CPA-007).

Read-only touch points:
- `agresso_contracts` — `agreement_id`, `funding_type`, `short_title`, `description`, `is_active`.
- CLARISA `/api/projects` — via the existing `ClarisaProjectsService` cache.

New configuration:

| Key | Default | Source of truth |
| --- | --- | --- |
| `ARI_CLARISA_PROJECTS_PHASE` | `2026` | `.env` / deployment env — closes proposal R-6 |

---

## 6. API surface delta

| Method + URL | Roles | Guards | Query DTO | Response `data` |
| --- | --- | --- | --- | --- |
| `GET /api/bilateral-project-mappings/coverage-report` | `CENTER_ADMIN`, `SYSTEM_ADMIN` | `RolesGuard` | `dto/coverage-report.query.dto.ts` (`phase?`, `limit-samples?`) | `CoverageReportDto` — see `design.md` §4 |

**The path carries no version segment.** `main.ts:53-56` enables URI versioning **without a `defaultVersion`**, and this controller declares no `@Version`, so unversioned controllers register directly under `/api`. This is additive; no version bump exists to make. Swagger annotations required. Machine-token (`client_id/client_secret`) access is **not** granted — this is a human diagnostic surface.

**Declaration order is load-bearing:** the handler MUST be declared above the controller's existing `@Get(':id')`, or Nest routes `coverage-report` into `findById`'s `ParseIntPipe` and the endpoint returns `400` permanently. See `design.md` DD-12 and defect class D10.

---

## 7. Cross-system impact

| System | Impact |
| --- | --- |
| **CLARISA** | `domain/tools/clarisa/projects/` — DTO gains 3 optional fields; service gains an Alliance-slice read method. New env var for phase. No new upstream call pattern; reuses the existing 5-minute TTL cache. |
| **AGRESSO** | Read-only `SELECT` over `agresso_contracts`. No sync change, no cron change. |
| **OpenSearch / DynamoDB / RabbitMQ / Socket.IO** | Untouched. |
| **STAR client** | Untouched. S1 has no UI. The review queue is S2 and still has no approved visual reference (proposal §9). |

---

## 8. Defect classes this spec can produce, and the gate for each

Per the `/akili-specify` gate rule: name the defects first, then the command. A gate blind to this spec's dominant defect class is not a gate.

| # | Defect class | Gate | What would make it FAIL |
| --- | --- | --- | --- |
| **D1** | **False coverage number** — tiers double-count, miss contracts, or use the wrong denominator | `npm test -- --silent` — fixture with hand-counted expected values per tier + a sum-equals-total assertion (R-CPA-004 AC.3) | A fixture contract that matches two tiers; the sum assertion goes red |
| **D2** | **Environment blindness** — reporting `0%` where the field does not exist | `npm test -- --silent` — the R-CPA-005 AC.1 test asserts **no percentage appears** in a no-`external_code` payload | Removing the availability check makes the test red immediately |
| **D3** | **Over-strip / collision** — normalization merges two projects | `npm test -- --silent` — R-CPA-003 AC.1–AC.4, incl. the `C-A500` + `A500` collision fixture | A greedy `replace(/^[A-Z]-/, '')` turns `X-A132` into `A132`; AC.3 reddens |
| **D4** | **Unnormalized discriminator (K-005)** — case-sensitive compare drops `Bioversity` / `Bilateral` | `npm test -- --silent` — R-CPA-002 AC.1 mixed-case fixture | A `===` compare against `'CIAT'` drops the lower-case row; count assertion reddens |
| **D5** | **Regression in the existing picker** — changing the CLARISA service breaks manual mapping | `npm test -- --silent` over the **pre-existing** `clarisa-projects.service.spec.ts` + `bilateral-project-mapping.*.spec.ts`, plus R-CPA-001 AC.3 | Altering `listBilateralProjects`' filter reddens the existing suite |
| **D6** | **Authorization gap** — the report is reachable without an admin role | `npm test -- --silent` over the **new `coverage-report.http.spec.ts`** — a bootstrapped Nest app driven by supertest, asserting `200` for each admin role and `403` for none | Dropping `@Roles` reddens the `403` case. ⚠️ **The existing controller unit spec cannot serve as this gate**: `bilateral-project-mapping.controller.spec.ts:54-63` asserts the guard is *present* (`g === RolesGuard`), which stays green if `@Roles` is deleted. A presence assertion is not a behavioral proof |
| **D7** | **Lint/format drift** | `npx eslint <changed paths>` — **bare, no `--fix`** (Kaizen **K-001**: `npm run lint` mutates and cannot verify) | Any style violation in the diff |
| **D10** | **Endpoint unreachable by route shadowing** — `@Get('coverage-report')` declared after the existing `@Get(':id')` is captured by `ParseIntPipe` and returns `400` forever | `npm test -- --silent` over `coverage-report.http.spec.ts`, which **replicates `setGlobalPrefix('api')` + `enableVersioning`** and asserts a real `200` on the real path | Moving the handler below `@Get(':id')` turns the assertion into `400`. **No controller unit spec can catch this** — those call handler methods directly and never route |
| **D11** | **Silent DI-scope change** — pulling in a request-scoped provider makes the existing mapping controller request-scoped, breaking R-CPA-007 while every functional test stays green | `npm test -- --silent` — `coverage-report.http.spec.ts` calls the endpoint twice and asserts the **same service instance** served both requests | Injecting `AgressoContractRepository` (which injects request-scoped `CurrentUserUtil`) yields two distinct instances and reddens the assertion. See `design.md` DD-11 |

### Classes with **no** automated gate — declared, not hidden

| # | Class | Why no command catches it | Substitute |
| --- | --- | --- | --- |
| **D8** | **The number is internally correct but not true of production reality.** Every test above runs on fixtures. The real figure depends on live DEV MySQL (unreachable during analysis, proposal OQ-1) and on CLARISA test data that is itself sparse (5/380 with mappings, OQ-2). | No unit test can assert a fact about data it does not have. Running against a real environment is not reproducible in CI. | **Human check at the HITL pause after implementation:** run the endpoint against DEV and read the payload with the user. **This is the entire point of S1** — the report is the instrument, the reading is the deliverable, and the reading is a human step. |
| **D9** | **The measured environment's data is unrepresentative** — the coverage number is right about test and wrong about production, because production is a different (older, 299-row) dataset. | Unmeasurable until CLARISA promotes the contract (proposal **R-1**, external dependency). | **Accepted risk.** R-CPA-005 makes the condition *visible* rather than silent, and the report carries its host, so a later re-run is directly comparable. S2 must not be designed on a test-only reading without saying so. |

**Consequence for S2:** if the HITL reading (D8) cannot be obtained — DEV still unreachable, or the slice still yields ~5 usable rows — then S2 remains unspecified. Shipping a matcher on an unread instrument would reproduce exactly the K-004 pattern this staging exists to avoid.

---

## 9. Assumptions, dependencies, risks

| ID | Item | Mitigation |
| --- | --- | --- |
| **R-1** | CLARISA production does not publish the upstream fields. **Blocker for S2 release, not for S1** — S1 is inert and safe to ship. | R-CPA-005 makes the absence explicit; needs a promotion date from the CLARISA team. |
| **R-2** | The code must tolerate both payload shapes. | R-CPA-001: all new fields optional; AC.1 fixes the fields-absent case. |
| **R-5** | `source_of_funding` is mixed-case across the full feed (K-005). | R-CPA-002 normalizes before grouping; AC covered by D4. |
| **R-6** | `phase = 2026` would rot next year. | `ARI_CLARISA_PROJECTS_PHASE`, R-CPA-002 AC.4. |
| **A-1** | *Assumption:* STAR's bilateral contract definition is `funding_type ∈ {BLR, BILATERAL}` — lifted from the existing `isBilateralTagTarget` at `agresso-contract.service.ts:170-174`, not invented here. | If wrong, the denominator is wrong; the report states the definition it used. |
| **A-2** | *Assumption:* the `{B-, C-}` prefix set is closed. Measured exact over 380 rows, zero counter-examples (proposal §4.3). | R-CPA-003 AC.3 keeps unknown prefixes intact rather than stripping them, so a new centre degrades to `UNRESOLVED` (visible) rather than to a wrong match (silent). |
| **D-PI-8** | This spec's premise **supersedes** decision D-PI-8 ("no upstream join field exists"). | Recorded as a superseding decision in `design.md` §12; the archive sync flips D-PI-8 to `superseded`. Not rewritten in place. |

---

## 10. Open questions

**Status 2026-08-14: the D8 reading was taken over VPN against DEV.** See [`./evidence/D8-reading-2026-08-14.md`](./evidence/D8-reading-2026-08-14.md) and the two committed payloads. Four of six questions are now answered by measurement.

| ID | Question | Owner | Status |
| --- | --- | --- | --- |
| **OQ-1** | What fraction of STAR bilateral contracts resolve by normalized `external_code`? | Squad | ✅ **ANSWERED.** **336 / 1543 contracts (21.8 %)** — which is **88.4 % of the reachable ceiling**, since only 380 CLARISA Alliance-2026 projects exist to match against. Normalization did 9.5× the work of exact matching (304 vs 32). **`FULL_NAME` resolved zero** |
| **OQ-2** | Is "has SPs" the right population filter, given 5/380? | Product + squad | ✅ **ANSWERED — no.** `has_project_mappings` = **5 of 380**. Filtering on it would target 5 projects and discard 375 that match fine. DD-2's report-don't-filter decision is vindicated |
| **OQ-4** | What wins when an automatic proposal contradicts a `MANUAL` mapping? | Product | Open — **deferred to S2.** S1 writes nothing, so it cannot arise |
| **OQ-5** | Are the 38 `window3` projects in scope? | Product | Population **confirmed by measurement**: 342 `bilateral` / 38 `window3`. Still a product decision, but now made against a number rather than a guess |
| **OQ-6** | Does the `description` display feature survive the reading? | Product | ✅ **Fill rate measured: 74 / 380 = 19.5 %.** A UI built around it renders empty for 4 of every 5 projects. Display decision stays S2's |
| **OQ-7** | Should DD-9's picker defect be fixed before S2? | **User** | **Open — and the reading made it more urgent.** The two Alliance selectors are **disjoint**: 380 in this spec's selector only, 0 in both, 0 in legacy-only (test); 32 in legacy-only (prod). The legacy picker is not dropping lower-case rows — it is selecting a different population entirely |
| **R-1** | Has CLARISA promoted the upstream contract to production? | CLARISA team | ❌ **No.** The production reading confirms it: 299 projects, none carrying `external_code`. **S2 cannot release until this changes** |

---

## 11. Requirement ID index

| ID | Title | Tasks |
| --- | --- | --- |
| R-CPA-001 | Consume the upstream contract without breaking on its absence | T-01 |
| R-CPA-002 | Select the Alliance 2026 slice by normalized criteria | T-02 |
| R-CPA-003 | Normalize `external_code` reversibly and prove it injective | T-03 |
| R-CPA-004 | Publish a coverage report classifying every bilateral contract | T-04, T-05 |
| R-CPA-005 | Refuse to publish coverage when the upstream contract is absent | T-04 |
| R-CPA-006 | Expose the report on an admin-only endpoint | T-05, **T-06** |
| R-CPA-007 | Change no persisted state and no existing behavior | **T-06**, T-07 |
| NFR-CPA-001 | Reproducibility of the published number | T-04 |
| NFR-CPA-002 | Authorization parity | **T-06** |
| NFR-CPA-003 | Bounded cost | T-04 |
| NFR-CPA-004 | The report explains itself | T-07 |

Clause-level ownership (every scenario and every `BUT` / `AND IT MUST`) is mapped in [`./tasks.md`](./tasks.md) §Coverage closure — requirement-ID presence alone is not closure.

---

## 12. Sign-off

- [ ] Engineering lead — J. Cadavid
- [ ] MEL / product owner — *(needed for OQ-2 / OQ-5 after the reading)*
- [ ] Security review — not required (no new auth path, no new secret, no `exclude` widening)
- [ ] DevOps — one new env var (`ARI_CLARISA_PROJECTS_PHASE`), needs adding to the deployment env

---

## Document Control

| Field | Value |
| --- | --- |
| Depth | **Standard** — re-checked against the finished design at `design.md` §Budget; the proposal's pre-design guess of *Lite* was low (see design §15) |
| Approval Mode | **pre-approved** — granted in the `/akili-specify` invocation ("YOLO hasta que hagas las tasks"); routine gates auto-pass and are logged, escalations still stop |
| Phase 1 gate | **auto-approved (pre-approved mode)** — 2026-08-14 |
| Judgment-day | **1 round, applied.** 5 severe / 4 warning / 2 suggestion, all fixed. Findings D10 and D11 and R-CPA-005 AC.4–AC.5 originate there. See [`./judgment.md`](./judgment.md) |
| Stage | **S1 of 2.** S2 is not specified and must not be started before the D8 reading exists |
