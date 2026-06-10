# Execution Log — Bilateral module / ToC Mapping v2

> Canonical audit trail of the JCSPECS Leader → Implementer → Reviewer loop for spec `2026-06-toc-mapping-v2`. Appended per task attempt; never rewritten.

---

## 1. Document control

| Field | Value |
| --- | --- |
| Spec id | 2026-06-toc-mapping-v2 |
| Spec path | `docs/specs/bilateral-module/toc-mapping-v2/` |
| Branch | `AC-1594-bilateral-module-v2` |
| Started | 2026-06-09 |
| Personas | `.agents/leader.md` / `.agents/implementer.md` / `.agents/reviewer.md` |

---

## 2. Task execution history

### T-01 — TocIntegrationService: lambda-toc client with cache + resilience — **PASS** (attempt 1/3)

- **Date:** 2026-06-09
- **Requirements covered:** R-BIL-090 (sourcing), NFR-BIL-090, NFR-BIL-091, NFR-BIL-092
- **Attempts:** 1 (Implementer → Reviewer PASS, no rework)

**Attempt 1 — Implementer:**

- Files created:
  - `server/researchindicators/src/domain/tools/toc-integration/toc-integration.module.ts`
  - `server/researchindicators/src/domain/tools/toc-integration/toc-integration.service.ts`
  - `server/researchindicators/src/domain/tools/toc-integration/dto/toc-integration.types.ts`
  - `server/researchindicators/src/domain/tools/toc-integration/toc-integration.service.spec.ts` (12 tests)
- Files modified:
  - `server/researchindicators/src/domain/shared/utils/env.utils.ts` (`ENV.TOC_INTEGRATION_HOST`, mirrors `PRMS_TOC_HOST` pattern)
  - `server/researchindicators/.env.example` (`ARI_TOC_INTEGRATION_HOST=https://lambda-toc.clarisa.cgiar.org`)
- Verification (from `server/researchindicators/`): `npm run lint` clean; `npm test -- toc-integration` 12/12; full `npm test` 281 suites / 1602 tests pass; `npm run build` clean (Nest tsc + admin Vite).
- Notes: `Map` cache keyed `${sp}:${level}` TTL 5 min; warm-stale serve with `LoggerUtil` warn (`sp`, `level`, `status`); cold-cache `LoggerUtil` error + 503; `{"response":[]}` cached as valid empty; `getTocResultsForSps` returns `Map<'${sp}:${level}', TocResult[]>`; deliberate parity with `prms-toc`: `assertHost()` inside try so missing host on warm cache serves stale. `@sdd-spec` traceability comments in all four files.

**Attempt 1 — Reviewer verdict:**

> STATUS: PASS — The staged T-01 diff fully conforms to tasks.md T-01, R-BIL-090/NFR-BIL-090..092, and design §3.1/§6.2 (singleton tool module, correct URL, verbatim upstream types incl. `unit_messurament`, 5-min keyed cache, warm-stale/cold-503 resilience with LoggerUtil, fan-out helper, env plumbing, full acceptance test coverage); lint and 12/12 tests re-verified, no migrations touched, no bilateral wiring (no scope creep). Cosmetic note: target type named `TocIndicatorTarget` vs design §3.1's `TocTarget` — structure identical, non-blocking.

**Decisions / issues encountered:**

- **Repo-hygiene finding (not Implementer's):** running `npm run lint` (`eslint --fix`) re-formats three pre-existing prettier-dirty files committed earlier outside this spec: `src/db/migrations/1779190000010-createClarisaScienceProgramsAndSeed.ts` (formatting-only), `src/domain/entities/results/results.service.ts`, `src/domain/tools/clarisa/entities/clarisa-science-programs/clarisa-science-programs.controller.ts`. The Leader reverted these from the T-01 diff to keep scope clean and to avoid touching a merged migration (formatting-only or not). **Follow-up:** land them as a separate `chore(format)` commit, or every future lint run keeps re-dirtying the tree. Owner: Juanca.
- Naming deviation `TocIndicatorTarget` (code) vs `TocTarget` (design §3.1) accepted by Reviewer as cosmetic; design §3.1 updated? → No; recorded here instead to avoid doc churn. Treat `TocIndicatorTarget` as canonical.

**Final verification:** lint clean, 12/12 task tests, full suite green, build clean. Reviewer re-ran lint + scoped tests independently.

---

### T-02 — Level rules util + version constant + sole-consumer verification — **PASS** (attempt 1/3)

- **Date:** 2026-06-09
- **Requirements covered:** R-BIL-091, R-BIL-097 (constant), risk RB-2 closure
- **Attempts:** 1 (Implementer → Reviewer PASS, no rework)

**Attempt 1 — Implementer:**

- Files created:
  - `server/researchindicators/src/domain/entities/bilateral/utils/toc-level-rules.util.ts` — `MAPPABLE_LIVE_VERSION = 2026` (D-V2-7), `TocResultTypeKey` union, `resolveResultTypeKey` (exhaustive `Record<IndicatorsEnum, TocResultTypeKey>`: 1→capacity_sharing, 2→innovation_dev, 3→knowledge_product, 4→policy_change, 5→oicr, 6→innovation_use; null/unknown→'unknown'), `allowedLevelsFor` (rule table per R-BIL-091; returns fresh arrays — callers cannot mutate the source of truth).
  - `…/utils/toc-level-rules.util.spec.ts` — 12 tests (all rule rows, mapped + other enum members, unknown/null ids, 2026 constant, immutability).
- Verification: `npm test -- toc-level-rules` 12/12; lint exit 0 (quirk files restored); build exit 0.
- Sole-consumer evidence (RB-2): recorded in `tasks.md` §7 — server references confined to the bilateral module; client references confined to STAR FE surfaces covered by the client's toc-mapping-v2 spec. T-03 in-place reshape cleared.

**Attempt 1 — Reviewer verdict:**

> STATUS: PASS — Pure util exactly matches the R-BIL-091 rule table and D-V2-3/D-V2-7; exhaustive enum mapping gives compile-time drift protection; 12/12 tests re-verified independently; no scope creep, no migrations.

**Decisions / issues encountered:**

- Pre-existing artifact found: `src/domain/entities/bilateral/dto/bilateral-hlos-indicators.response.dto 2.ts` — a committed Finder-duplicate of the hlos DTO. **Follow-up: delete in T-03** (same file family being rewritten).
- Pre-existing `tsc --noEmit` typings error in `test/app.e2e-spec.ts` (supertest typings; excluded from `tsconfig.build.json`) — verified to pre-exist without this diff; backlog note, out of spec scope.

**Final verification:** scoped tests 12/12, lint clean, build clean; Reviewer re-ran independently.


---

### T-03 — Reshape `GET …/hlos-indicators` to the frozen FE envelope — **PASS** (attempt 1/3)

- **Date:** 2026-06-10
- **Requirements covered:** R-BIL-090, R-BIL-091, R-BIL-097 (read flag)
- **Attempts:** 1 (Implementer → Reviewer PASS, no rework)

**Attempt 1 — Implementer:**

- Files modified:
  - `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts` — `getHlosIndicatorsForResult` rewritten per design §6.1 (rules util → `version_locked` per D-V2-7 → unchanged SP chain → `getTocResultsForSps` fan-out → wire mapping); new private mappers `toWireTocResult`/`toWireTocIndicator`; `TocIntegrationService` injected; `PrmsTocService`/`ClarisaCgiarEntitiesService` left compilable-but-unused (T-10 gate); `deriveSciencePrograms` untouched; `@sdd-spec` T-03 traceability.
  - `…/dto/bilateral-hlos-indicators.response.dto.ts` — full rewrite to the frozen §5 envelope (plain-interface style matching siblings; `@ApiProperty` classes deferred to T-04 per tasks.md).
  - `…/bilateral.module.ts` — imports `TocIntegrationModule` (PrmsTocModule retained until T-10).
  - `…/bilateral.controller.ts` — stale doc comment + `@ApiOperation` summary refreshed (referenced the dead `pairs`/`aow_status` shape; T-04 overlap accepted).
  - `src/domain/entities/results/repositories/result.repository.ts` — **out-of-list minimal addition:** `r.indicator_id` added to the `findPoolFundingAlignmentContext` SELECT + `indicator_id?: number | null` on `PoolFundingAlignmentContext`; required by design §6.1 step 2 (context did not previously return the result-type linkage; design §3.2 corrected — see decisions).
  - `…/bilateral.service.getHlosIndicatorsForResult.spec.ts` — rewritten (6 tests): 404; unmapped full-envelope equality + zero upstream calls; stale-project ref; mapped happy path (deep equality incl. empty-level retention AC.5, no `pairs`/`aow_status`/`targets`); `allowed_levels: []` zero-upstream; `version_locked: true`. Exhaustive AC matrix lands in T-04.
  - 4 sibling bilateral service specs + `bilateral.controller.spec.ts` — `TocIntegrationService` stub provider (new constructor dep) / stale mock reshaped.
- Files deleted:
  - `…/dto/bilateral-hlos-indicators.response.dto 2.ts` — committed Finder-duplicate (recorded T-02 follow-up).
- Verification (from `server/researchindicators/`): `npm run lint` exit 0 (quirk files restored); scoped `jest src/domain/entities/bilateral` 9 suites / 79 tests pass; full `npm test` 282 suites / 1611 tests pass; `npm run build` exit 0.

**Attempt 1 — Reviewer verdict:**

> STATUS: PASS — T-03 implements the frozen design-§5 envelope exactly (field names, AC.2/AC.3/AC.5 behaviors, zero-upstream short-circuits, version_locked per D-V2-7), keeps PrmsTocService compilable-but-unused, touches no migrations or auth/routing, and all verification evidence reproduces (lint 0; 9/79 bilateral tests; build 0). All six flagged deviations are justified minimal accommodations; one non-blocking follow-up — correct design §3.2's claim that findPoolFundingAlignmentContext "already returns" the result-type linkage, and relay the null→'' coercion note to FE with D-V2-5.

**Decisions / issues encountered:**

- **`indicator_id` context addition adjudicated as justified, not scope creep** (Reviewer): design §6.1 step 2 mandates deriving `result_type` from the context's indicator type; the addition is the minimal additive change (one SELECT column + optional interface field, no second query). Design §3.2 wording corrected by the Leader in this commit.
- **Null coercion on the wire:** upstream `description`/`unit_messurament`/`type_value` are nullable; the frozen shape declares non-null `string` — nulls coerced to `''`. **Follow-up: relay to STAR FE alongside the D-V2-5 read-back relay.** Owner: Juanca.
- `aow_code` forced `null` at `EOI` level regardless of upstream value (per §5 contract).
- Manual smoke vs live testing env deferred to the T-04/FE-demo window (covered meanwhile by deep-equality fixtures mirroring handoff §2).

**Final verification:** lint clean, 79/79 scoped bilateral tests, full suite 282/1611 green, build clean. Reviewer independently re-ran lint, scoped bilateral + toc-integration + repository tests (43 additional), and build.

---

### T-04 — Read-path tests + Swagger (FE demo gate) — **PASS** (attempt 1/3)

- **Date:** 2026-06-10
- **Requirements covered:** R-BIL-090 AC.1–AC.5, R-BIL-091 AC.1–AC.2, NFR-BIL-091; closes risk RB-3 (read path FE-demo ready)
- **Attempts:** 1 (Implementer → Reviewer PASS, no rework)

**Attempt 1 — Implementer:**

- Files modified (all under `server/researchindicators/src/domain/entities/bilateral/`):
  - `bilateral.service.getHlosIndicatorsForResult.spec.ts` — 6 → 8 tests; full AC matrix: handoff §2→§4 parity test (toc_result_id 5187 / indicator 5972 / 11-entry 2020–2030 `targets[]` → single `('10', 2026)`; sibling 5973 without 2026 entry → `(null, 2026)`; deep `toEqual` proves `targets[]`/`unit_messurament`/`type_name` never reach the wire — AC.3); multi-SP × multi-level Policy Change (SP01+SP03 × OUTCOME+EOI; per-SP/per-level entries in rule order; EOI forces `aow_code: null`; empty (SP03, OUTCOME) keeps its level entry — AC.1/AC.5, R-BIL-091 AC.1); AC.2 absence assertions completed; Knowledge Product zero-upstream (R-BIL-091 AC.2); AC.4 + `version_locked` covered. NFR-BIL-091: exactly one `getTocResultsForSps(['SP01','SP03'], ['OUTCOME','EOI'])` batched call asserted.
  - `bilateral.controller.spec.ts` — delegation (exact args, single call, `ResponseUtils.format` wrapper, `data` identity) + new Swagger-metadata describe asserting the real `DECORATORS.API_RESPONSE` / `DECORATORS.API_MODEL_PROPERTIES_ARRAY` keys: typed 200 + 404 + 503 on the hlos handler; response classes declare exactly the 7 frozen top-level fields, none of the legacy keys; nested classes annotated to the indicator leaf. Permission/role tests intact.
  - `dto/bilateral-hlos-indicators.response.dto.ts` — interfaces → `@ApiProperty` classes in place (wire-neutral: no class-transformer decorators; service builds plain literals, classes used type-position only; examples mirror handoff §4). Added `BilateralTocProjectRef`.
  - `bilateral.controller.ts` — `@ApiResponse` 200 (typed `BilateralHlosIndicatorsResponse`) / 404 / 503 on the hlos handler; controller-level `@ApiTags`/`@ApiBearerAuth` verified, not duplicated.
- Verification (from `server/researchindicators/`): `npm run lint` green (quirk files restored); scoped 2 suites / 24 tests; full `npm test` 282 suites / 1616 tests pass; `npm run build` green; `npm run test:cov` global 80.02% stmts / 70.66% branches / 80.77% funcs / 79.79% lines (floor 60%).
- Swagger verification level: programmatic (build + Reflect-metadata assertions on the exact keys SwaggerModule consumes). Human eyeball of `/swagger` advisable alongside the 2026-06-11 demo.

**Attempt 1 — Reviewer verdict:**

> STATUS: PASS — T-04 fully covers R-BIL-090 AC.1–AC.5 and R-BIL-091 AC.1–AC.2 with passing, handoff-parity tests, converts the response DTO to `@ApiProperty` classes wire-neutrally, and wires the frozen §5 envelope into Swagger with meaningful metadata assertions; lint/tests/coverage (80/70.7/80.8/79.8 ≥ 60%) and type-check all re-verified green. The 404/503 `@ApiResponse` decorators are an accepted spec-conformant addition (design §5 lists those errors); minor non-blocking note: `toc-integration.service.spec.ts` (T-01 scope) verifies fan-out call count/cache but has no explicit mock-ordering parallel-dispatch assertion — parallelism is structural via `Promise.all`.

**Decisions / issues encountered:**

- **First `@ApiResponse` usage in the repo** (no other handler uses it): adjudicated spec-conformant — design §5 lists 404/503 as the endpoint's error surface and requirements §9 mandates Swagger on every touched handler. Precedent now set for the module.
- Per-method spec file extended (`bilateral.service.getHlosIndicatorsForResult.spec.ts`) rather than `bilateral.service.spec.ts` named in tasks.md — repo convention is per-method spec files; tasks.md naming predates the split.
- Pre-existing committed Finder-duplicates `bilateral.service.spec 2.ts` / `bilateral.service.getScienceProgramsForResult.spec 2.ts` remain on the branch (out of T-03/T-04 scope; jest does not pick them up). **Follow-up: delete in a hygiene commit.** Owner: Juanca.
- NFR-BIL-091 parallel-dispatch mock-ordering assertion absent from T-01's spec (parallelism structural via `Promise.all`) — noted, non-blocking; optional T-08/T-09 hardening.

**Final verification:** lint clean, 24/24 scoped, full suite 282/1616 green, build clean, coverage floor holds. Reviewer independently re-ran lint, scoped tests, `test:cov`, and `tsc --noEmit`; RB-3 closed in `tasks.md` §7.

---

### T-05 — Migration + entity + repository for `result_pool_funding_toc_alignment` — **PASS** (attempt 1/3)

- **Date:** 2026-06-10
- **Requirements covered:** R-BIL-092 (schema), R-BIL-095 (snapshot columns), data reqs §8
- **Attempts:** 1 (Implementer → Reviewer PASS, no rework)

**Attempt 1 — Implementer:**

- Files created:
  - `server/researchindicators/src/db/migrations/1779190000015-createResultPoolFundingTocAlignment.ts` — design §4 verbatim (all columns incl. `unit_messurament` snapshot, D-V2-4); audit block byte-identical to sibling `1779190000006`; STORED GENERATED `active_result_sp` varchar(71) (`IF(is_active=1, CONCAT(result_id,':',sp_code), NULL)`); UNIQUE `idx_rpfta_active_result_sp` + `idx_rpfta_result`; real FK `fk_rpfta_result` → `results.result_id`; utf8mb4_unicode_520_ci; clean `down()` (drop FK + table).
  - `…/bilateral/entities/result-pool-funding-toc-alignment.entity.ts` — extends `AuditableEntity`, 1:1 with the migration; generated column intentionally unmapped (sibling D-PI-9 pattern); no `@OpenSearchProperty`.
  - `…/bilateral/repositories/result-pool-funding-toc-alignment.repository.ts` — `findActiveByResultId` (active, `sp_code ASC`), `upsertForSp(input, actorUserId, manager?)` (in-place update or insert; never a second active row; ToC/snapshot columns null on "No"), `deactivateForSps(resultId, spCodes, actorUserId, manager?)` (soft-deactivate + audit fields; empty-list fast path). Optional `EntityManager` pass-through ready for T-06's single transaction (§6.3).
  - `…/repositories/result-pool-funding-toc-alignment.repository.spec.ts` — 8 tests (find filter/order, upsert insert/update-in-place, "No" nulls, manager routing, deactivate audit + short-circuit).
- Files modified:
  - `…/bilateral/bilateral.module.ts` — entity in `TypeOrmModule.forFeature`, repository provided + exported. (Datasource is glob-based — no orm.config change.)
- Live DB verification (dev `192.168.20.210`): `migration:show` → sole pending; `migration:dev:execute` applied; `SHOW CREATE TABLE` confirmed columns/indexes/FK/collation; unique-index proof: second active insert for (1450, ZZT05) → `ER_DUP_ENTRY` on `idx_rpfta_active_result_sp`, inactive duplicate allowed (partial-unique semantics); test rows cleaned; `migration:revert` clean; re-applied and **left applied for T-06**.
- Verification: lint green (quirk files restored); full `npm test` 283 suites / 1624 tests pass; build green.

**Attempt 1 — Reviewer verdict:**

> STATUS: PASS — T-05 implements design §4 verbatim (columns, partial-unique generated column, indexes, collation, clean down()), the entity/repository mirror sibling patterns with a §6.3-compatible EntityManager pass-through, append-only integrity holds, and lint/scoped tests/full suite (283/1624)/build were all independently re-verified green. All four implementer deviations are adjudicated acceptable — the real FK in fact mirrors what sibling migrations do; recommend correcting design.md's "FK-by-value" wording during T-09 doc sync (non-blocking).

**Decisions / issues encountered:**

- **Real FK constraint adjudicated correct:** design §4's "FK-by-value (mirror sibling tables)" was internally contradictory — siblings (`fk_rpfa_result`, `fk_rpfim_result`) all declare real FKs. Design §4 wording corrected by the Leader in this commit (not deferred to T-09).
- Generated column declared `varchar(71)` (bigint 20 + ':' + 50) — CONCAT generated columns need an explicit type; pattern otherwise identical to `1779190000014`.
- No `@ManyToOne` relation to `Result` — would touch `result.entity.ts`, out of scope; integrity enforced at DB layer.
- Pre-existing flake in `star-results-metadata-workbook.handler.spec.ts` (failed once on a full run, passes in isolation and on re-run) — unrelated to this diff; backlog note.

**Final verification:** lint clean, 8/8 scoped, full suite 283/1624 green, build clean, migration applied on dev DB. Reviewer independently re-ran lint, scoped + full suite, build, and verified the flake in isolation (20/20).

---

### T-06 — Write path: DTO + validation + per-SP upsert + cascade + version gate — **PASS** (attempt 1/3)

- **Date:** 2026-06-10
- **Requirements covered:** R-BIL-092, R-BIL-093, R-BIL-094, R-BIL-095 (persist side), R-BIL-097
- **Attempts:** 1 (Implementer → Reviewer PASS, no rework)

**Attempt 1 — Implementer:**

- Files modified (under `server/researchindicators/src/domain/entities/bilateral/`):
  - `dto/update-pool-funding-alignment.dto.ts` — `TocAlignmentInputDto` + optional `toc_alignments` (`@ValidateNested({each:true})`/`@Type`; conditional required-when-Yes is service-side per the per-alignment error contract).
  - `bilateral.service.ts` — `ResultPoolFundingTocAlignmentRepository` injected; private `validateTocAlignments` (409 gate → structural → catalog validation → ready upsert inputs; runs **before** the transaction so 400/409/503 persist nothing); shared `resolveLiveTargetValue()` extracted (read + write snapshot target logic cannot drift); transaction extended: per-entry `upsertForSp(..., manager)` then `deactivateForSps` cascade; `payload_after.toc_alignments` summary only when submitted; existing gates/`_sp` recreate/socket payload untouched (D-V2-6).
  - `bilateral.controller.ts` — PATCH Swagger only: `@ApiOperation`/`@ApiBody` + `@ApiResponse` 400/404/409/503 (T-04 precedent); routes/guards/roles zero-diff.
  - 5 sibling service spec files — new repository provider stub only (stale-mock fix; zero assertion changes).
  - NEW `bilateral.service.updateAlignment.tocAlignments.spec.ts` — 5 smoke tests: legacy-body regression (no gate/catalog/upsert), version-gate 409, happy-path upsert with exact snapshot payload, atomic 400 with two collected errors, legacy-body cascade.
- Verification: lint green (quirk files restored); scoped 11 suites / 97 tests; full `npm test` 284 suites / 1629 tests pass; build green.

**Attempt 1 — Reviewer verdict:**

> STATUS: PASS — T-06 conforms to design §5/§6.3 and R-BIL-092…095/097 — gate and six-code atomic validation run pre-transaction via the shared level-rules util and cached catalog client, per-SP upsert/cascade execute inside the single transaction with snapshots from the validated catalog, and legacy bodies regress byte-identically (all pre-existing suites pass with provider-stub-only diffs). Adjudicated items (legacy-body cascade per R-BIL-093 wording, payload_after ToC summary in lieu of a nonexistent note field, 503-before-400 on cold cache) all resolve in the implementer's favor; lint/scoped jest (11/97)/full jest (284/1629)/build all green.

**Decisions / issues encountered:**

- **Cascade runs on EVERY PATCH including legacy bodies** (Reviewer-adjudicated): R-BIL-093 conditions the cascade on effective `sp_codes`, not `toc_alignments` presence; the no-dangling rationale requires it. Corollary: `has_contribution: false` ⇒ effective `sp_codes` `[]` ⇒ all active ToC rows deactivated. Version gate stays `toc_alignments`-only (R-BIL-097 AC.3).
- **Review-history "note"**: `ResultReviewHistory` has no free-text note column; design §6.3 step 6 fulfilled as a `toc_alignments` summary in `payload_after`, emitted only when submitted (legacy payloads byte-identical).
- **503-before-400 on cold cache**: catalog validation also runs when structural errors exist (all-errors-at-once per D-V2-8), so a cold cache surfaces 503 before the otherwise-guaranteed 400. Accepted per design §6.3 step 2c.
- **FE relay notes (with D-V2-5):** 400 shape `errors: { description: 'Invalid ToC alignments', toc_alignments: [{ sp_code, field, error }] }`; 409 shape `errors: { description: '…', code: 'toc_mapping_version_locked' }` — FE should key off `errors.code`; `missing_required_fields` emits one entry per missing field (level/toc_result_id/indicator_id), not one per SP. Owner: Juanca.

**Final verification:** lint clean, scoped 11/97, full suite 284/1629 green, build clean. Reviewer independently re-ran lint, scoped + full suite, and build; verified guards/routes zero-diff and legacy byte-identity.

---

### T-07 — Read-back: extend `AlignmentResponse` with `toc_alignments[]` + `version_locked` — **PASS** (attempt 1/3)

- **Date:** 2026-06-10
- **Requirements covered:** R-BIL-096 AC.1–AC.2, R-BIL-095 AC.1 (snapshot-sourced reads)
- **Attempts:** 1 (Implementer → Reviewer PASS, no rework)

**Attempt 1 — Implementer:**

- Files modified (under `server/researchindicators/src/domain/entities/bilateral/`):
  - `bilateral.service.ts` — `getAlignment` fetches active rows via `tocAlignmentRepository.findActiveByResultId` inside the existing `Promise.all`; private mapper `toTocAlignmentReadback` (wire rename `unit_messurament`→`unit_of_measurement`; decimal `quantitative_contribution` coerced string→number with null/zero guard); `version_locked` via the same `Number(report_year_id) !== MAPPABLE_LIVE_VERSION` comparison as the hlos read (byte-identical, D-V2-7); `toc_alignments` follows the existing `visibleAlignment` eligibility gate (`[]` when ineligible).
  - `dto/update-pool-funding-alignment.dto.ts` — `TocAlignmentReadbackResponse` interface (11 frozen fields) + both fields added to `AlignmentResponse` (interface style per the file family).
  - `bilateral.service.spec.ts` + `bilateral.service.updateAlignment.tocAlignments.spec.ts` — new tests: Yes+No rows mapped exactly (rename + `'3.50'`→3.5 coercion), empty → `[]`, `version_locked` true/false (string `'2026'` pins the Number coercion), ineligible state still carries both fields, drift test (R-BIL-095 AC.1: snapshots returned, `getTocResults`/`getTocResultsForSps` never called), PATCH≡GET mechanism test (`toBe` on a `getAlignment` spy sentinel).
  - `bilateral.controller.ts` — untouched (no typed alignment `@ApiResponse` exists to go stale; zero diff verified).
- Verification: lint green (quirk files restored); scoped bilateral 11 suites / 102 tests; full `npm test` 284 suites / 1634 tests pass; build green.

**Attempt 1 — Reviewer verdict:**

> STATUS: PASS — T-07 delivers the frozen §5 read-back exactly — 11-field snapshot-sourced `toc_alignments[]` with the wire rename and decimal coercion, `version_locked` via the same D-V2-7 comparison as the hlos read, and PATCH ≡ GET pinned by mechanism — with zero upstream involvement and all verification green (lint 0, 102/102 bilateral, 1634/1634 full, build 0). Non-blocking: record the D-V2-5 FE relay note when logging this task.

**Decisions / issues encountered:**

- **Eligibility gating adjudicated conformant:** `toc_alignments` is `[]` for ineligible results, mirroring how `visibleAlignment` already blanks `has_contribution`/`selected_levers`; exposing rows the rest of the payload hides would be the inconsistent reading of R-BIL-096.
- **PATCH ≡ GET by construction:** `updateAlignment`'s sole success return is `await this.getAlignment(...)` — single mapping path, no parallel code to drift.
- **FE relay note (D-V2-5) recorded as RB-4 in `tasks.md` §7** — extended read-back shape + `[]`-when-ineligible + decimal-as-number + the T-06 error payloads + the T-03 null→`''` coercion, with wire examples in this log (T-06 §5 / T-07 report). **Pending send to STAR FE.** Owner: Juanca.

**Final verification:** lint clean, scoped 102/102, full suite 284/1634 green, build clean. Reviewer independently re-ran lint, scoped + full suite, and build.

---

### T-08 — Write-path + read-back tests (full AC matrix) — **PASS** (attempt 1/3)

- **Date:** 2026-06-10
- **Requirements covered:** R-BIL-092…097 (every AC), NFR-BIL-090 (validation-path 503)
- **Attempts:** 1 (Implementer → Reviewer PASS, no rework)

**Attempt 1 — Implementer (test-only; zero production diffs):**

- Files modified (+645 lines, 24 new tests):
  - `bilateral.service.updateAlignment.tocAlignments.spec.ts` — 6 → 23+ tests; nested `T-08 — full write matrix` describe with handoff-§2-parity fixtures (toc_result 5187 / indicator 5972 / `unit_messurament: 'Number'` / ("10","2026"); indicator 6001 for re-submit). Covers per-SP independence (second PATCH writes ONLY SP01, nothing ever for SP03), "No" persistence, update-in-place pass-through, cascade + fresh re-add (no auto-revive), all six per-alignment error codes individually via an `expectAtomic400` helper (asserts transaction/upsert/deactivate uncalled every time), `missing_required_fields` one-entry-per-field pin, legacy `unknown_sp_codes` regression, 2026 write success (incl. driver string coercion), save→drift→read sequence through the real `getAlignment` (snapshots survive upstream `{"response":[]}`, zero upstream calls), cold-cache 503 with transaction never entered.
  - `bilateral.controller.spec.ts` — 16 → 23; **real `RolesGuard` + real `Reflector`** executed against the PATCH handler's `@Roles` metadata: denied TESTER/GLOBAL/empty-roles/no-user (no GUEST exists in `SecRolesEnum`), allowed CONTRIBUTOR/CENTER_ADMIN/SYSTEM_ADMIN (R-BIL-092 AC.4).
  - `result-pool-funding-toc-alignment.repository.spec.ts` — 8 → 9; AC.3 update-in-place with different indicator + new snapshots, `create`/`save` never called.
- Verification: lint green (quirk files restored); scoped bilateral 11 suites / 128 tests; full `npm test` 284 suites / 1660 tests pass; coverage 80.18/71.53/80.90 (floor 60; bilateral.controller 100%, bilateral.service 92.5%, toc-alignment repository 100%); build green.

**Attempt 1 — Reviewer verdict:**

> STATUS: PASS — T-08 is a clean test-only change set (3 spec files, +645 lines, 0 production diffs) in which every AC of R-BIL-092…097 plus NFR-BIL-090's validation-path 503 is covered by a substantive, atomicity-asserting test — including real RolesGuard execution, all six per-alignment error codes, and a real-getAlignment save→drift→read sequence. Lint, scoped suites, full npm test (284/1660), coverage (80.18/71.53/80.90 vs 60 floor), and build are all green; both implementer ambiguity adjudications are sound and design-sanctioned.

**Decisions / issues encountered:**

- **"Verified at DB level" (R-BIL-092 AC.1) expressed at unit altitude** — adjudicated design-sanctioned: design §11 mandates unit mocking ("extend bilateral e2e if present; else covered by service-level specs" — no bilateral e2e exists) and `src/CLAUDE.md` §9 forbids MySQL in unit tests. Composition used: service asserts no write of any kind for the untouched SP; repository spec pins update-in-place keyed to the active row.
- **Denied-role set**: no GUEST in `SecRolesEnum`; TESTER/GLOBAL/empty-roles/no-user used as the denied cases for the "e.g. GUEST" requirement.

**Final verification:** lint clean, scoped 128/128, full suite 284/1660 green, coverage gate passes, build clean. Reviewer independently re-ran all of it and spot-read every AC-mapped test body for substance.

---

### T-09 — Spec-doc sync + archive disposition — **PASS** (attempt 1/3)

- **Date:** 2026-06-10
- **Requirements covered:** R-BIL-098 (preparation), proposal §5.8
- **Attempts:** 1 (Implementer → Reviewer PASS, no rework)

**Attempt 1 — Implementer (documentation-only; 9 files, all `docs/specs/bilateral-module/**`):**

- Parent `design.md` (§3.6 row-scoped banner on the HLOs/indicators row), parent `tasks.md` (T-31 note; §14/§15 supersession markers; new dated §15 re-price entry recording the new envelope, OQ-V2-9 resolution, D-V2-1..8, gated T-10 cleanup), `frontend-handoff.md` (§4.7 banner + 2026-06-10 §12 changelog row), `frontend-data-model.md` (top-of-file banner enumerating superseded sections + §8 row), `pending-items/requirements.md` (R-BIL-077 archive banner + endpoint-inventory marker), `pending-items/design.md` (§6.2/§7.3 banners + §7.4 chain note — `ClarisaCgiarEntitiesService` explicitly stays live), `pending-items/tasks.md` (T-15.12 archive banner + required lineage note), `pending-items/rollout-checklist.md` (env check → `ARI_TOC_INTEGRATION_HOST`; smoke `jq` → new envelope keys — the one substantive replacement, verified against shipped code), `indicator-mapping/backend-response-to-fe.md` (§3 OQ-IM-2 banner — AOW gone from the wire; type-handler material untouched).
- Deliberately untouched: all `execution.md` audit logs; dated proposals; `toc-mapping-v2/` itself; constitutional docs (independent grep: zero hits for the old read surface).

**Attempt 1 — Reviewer verdict:**

> STATUS: PASS — T-09's doc-only change set fully satisfies its acceptance criterion — no parent doc presents the retired (SP, AOW)-pair read as current behavior; all banners are dated 2026-06-10, link correctly to `toc-mapping-v2/`, correctly state the PRMS code retirement is gated on T-10, and the rollout-checklist's new env-var/envelope assertions match the shipped code exactly. Scope discipline is clean (9 files, all in `docs/specs/bilateral-module/`, no code, no execution logs, constitutional docs untouched).

**Decisions / issues encountered:**

- Parent `requirements.md` was in the intended-file list but contains no old-read surface (R-BIL-020 is implementation-agnostic) — nothing to supersede; left untouched.
- Reviewer non-blocking observation: `pending-items/design.md` §1/§2 intro summaries still mention PrmsTocService proxying without an inline marker — within AC tolerance (no envelope keys; body sections bannered; dated doc).

**Final verification:** Reviewer independently re-ran the acceptance grep across the module (excluding the active spec + execution logs), literally resolved banner link paths, and verified the rollout-checklist edits against `env.utils.ts`/`.env.example`/the T-03 DTO.

---

## 3. Summary — T-01…T-09 complete (2026-06-10)

All non-gated tasks of spec `2026-06-toc-mapping-v2` are **done**, each on Reviewer PASS attempt 1/3:

| Task | Commit | Outcome |
| --- | --- | --- |
| T-01 lambda-toc client | `92001d43` | PASS 1/3 |
| T-02 level rules util + 2026 constant | `0217a320` | PASS 1/3 |
| T-03 hlos read reshape (frozen envelope) | `b590cee4` | PASS 1/3 |
| T-04 read AC matrix + Swagger (FE demo gate) | `b0cce611` | PASS 1/3 |
| T-05 toc-alignment table/entity/repository | `a13d7875` | PASS 1/3 |
| T-06 toc_alignments write path | `9a6a3449` | PASS 1/3 |
| T-07 alignment read-back extension | `44c42f69` | PASS 1/3 |
| T-08 full write/read-back AC matrix | `539e27bc` | PASS 1/3 |
| T-09 spec-doc sync + archive disposition | (this commit) | PASS 1/3 |

Final state: 284 suites / 1660 tests green; coverage 80.2/71.5/80.9/80.0 (floor 60); build + lint clean; migration `1779190000015` applied on the dev DB. **T-10 (delete the PRMS pair path) remains GATED** on a recorded cutover-verified note per R-BIL-098 AC.2.

**Open follow-ups (owner Juanca):** RB-4 FE relay (read-back + error contracts — pending send); `chore(format)` commit for the three prettier-dirty quirk files; hygiene deletion of `bilateral.service.spec 2.ts` / `bilateral.service.getScienceProgramsForResult.spec 2.ts`; human `/swagger` + testing-env smoke alongside the 2026-06-11 FE demo; pre-existing `test/app.e2e-spec.ts` supertest typings + `star-results-metadata-workbook` flake (backlog).
