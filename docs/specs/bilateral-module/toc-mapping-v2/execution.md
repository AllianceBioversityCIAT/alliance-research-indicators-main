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

