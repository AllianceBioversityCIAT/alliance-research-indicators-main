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
