# Execution Log — TIP Integration / Knowledge-product projects and pool funding

## Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/tip-kp-project-pool-funding` (AC-1761) |
| Leader | Claude Opus 5.5 (session) |
| Implementer | Grok `grok-4.7-high` via Cursor CLI (Orca `/orchestration`, run `run_cbfe222f3b67`) — standing split: Grok implements, Claude reviews |
| Reviewer | Claude `akili-reviewer` wrapper (fresh context, different weights from the Implementer) |
| Mode | Spec says `interactive`; owner standing rule overrides for routine progress: continue task to task, stop only on HALT / FATAL_FAIL / pivot / budget tripwire |
| Budget | 4 tasks · ~560 LOC · 7 review rounds (design §1) |
| Started | 2026-10-20 |

## Task Execution History

### T-01 — DTOs and pure `mapTipProjects` mapper — PASS

- **Date:** 2026-10-20 · **Attempts:** 1 · **Effort:** medium · **Skills:** `nestjs-expert`, `tdd` (task defaults)
- **Implementer:** Grok `grok-4.7-high` via Cursor — Orca `task_5d43648d90c3` / `ctx_5546122c7286`
- **Attempt 1:**
  - **Files changed:**
    - `server/researchindicators/src/domain/tools/tip-integration/dto/response-year-tip.dto.ts` — `TipTocMappingDto`; `TipProjectDto` optional `is_primary`, `is_contributing_to_pool_funding`, `toc_mapping`; `TipMappedResult`.
    - `server/researchindicators/src/domain/tools/tip-integration/mapper/tip-projects.mapper.ts` (new) — `mapTipProjects(project, knownAgreementIds, tipId, logger)`, §7.2 rules 1–6.
    - `server/researchindicators/src/domain/tools/tip-integration/mapper/tip-projects.mapper.spec.ts` (new).
  - **Initial red (stub returning empty result):** 11 failed, 2 passed (`[]`/`null` match the stub); failed on `expect(result.contracts).toEqual([...])`, not on import.
  - **Falsifier, rule 2 ("every flagged project stays primary"):** `npx jest …tip-projects.mapper.spec.ts -t "keeps exactly one primary"` → `Expected length: 1 / Received length: 2 / Received array: [{"contract_id": "A171", "is_primary": true}, {"contract_id": "A132", "is_primary": true}]` at `expect(result.contracts.filter((item) => item.is_primary)).toHaveLength(1)`. Reverted.
  - **Falsifier, rule 3 ("first item", not first known):** `-t "promotes the first known"` → `"contract_id": "A171", - "is_primary": true, + "is_primary": false` at `expect(result.contracts).toEqual([`. Reverted.
  - **Build falsifier (`toc_result_indicator_id?: number`):** `npx tsc --noEmit -p tsconfig.build.json` → exit 0 (excludes `**/*spec.ts` — cannot reach the fixture, KZ-017); `npx tsc --noEmit -p tsconfig.json` → exit 1, `tip-projects.mapper.spec.ts(17,3): error TS2322: Type 'string' is not assignable to type 'number'.` (+2 more). Reverted. **The type gate for this field is `tsc -p tsconfig.json`, not `npm run build`.**
  - **Implementer verification:** mapper jest 2 suites / 17 tests; `tip-integration` jest 5 suites / 59 tests; `npx eslint src/domain/tools/tip-integration` 0; `npm run build` 0.
  - **Evidence re-run (Leader-inline, from `server/researchindicators`):** VERIFIED — `npx jest src/domain/tools/tip-integration --silent` 5/5 suites, 59/59; `npx eslint src/domain/tools/tip-integration` 0; `npx tsc --noEmit -p tsconfig.json` 0; `npm run build` 0.
  - **Reviewer (`akili-reviewer`, Claude Opus):** PASS — all six §7.2 rules in order, all 11 listed fixtures present with per-project flag/known-ness variation (Disqualifier not triggered), only the three scoped files touched. Judged: the R-TIP-002 "no project known → warn names the TIP id" clause is met by the per-contract §12 skip lines (each starts `TIP <id>:`); the unknown flagged primary's two warns are conformant with rules 2+4 and NFR-TIP-002.
- **Not Done / Assumptions (Implementer, verbatim, translated from Spanish; no owed item, no blocker):**
  - `mapTipProjects(project, knownAgreementIds, tipId, logger)` takes `tipId` and a logger `{ warn(message: string): void }` (compatible with Nest `Logger.warn`). §7.2 does not list the id, but both §12 lines name it. Warnings are not returned in the object.
  - An unknown flagged primary emits both lines: `flagged primary … unknown` (rule 2) and `agreement … contract skipped` (rule 4).
  - `[]` and `null` emit no warn; §12 has no third template. "No project known" is covered by the skip warns, which name the TIP id and the agreement.
  - Empty `agreement_id` means `null` or `''`; a whitespace-only id is not dropped.
  - `toc_internal_id` typed `string` (glossary gives no type).
  - The fixture UUID completes the requirements' truncated prefix: `f3706ba2-4c3e-4f1a-9b2d-0e1f2a3b4c5d`.
- **ADVISORY (4R, non-gating):**
  - Empty/`null` `project[]` → no contract and no warn (today's behavior). Leader reading recorded: R-TIP-002's "no project is known" covers projects that exist but are all unknown; T-03 must not add a second warn.
  - Whitespace-only `agreement_id` is not dropped by rule 1; it ends in a noisy skip warn. Harmless.
  - The `filter(is_primary).toHaveLength(1)` check duplicates the full `toEqual`; kept as the falsifier target.
  - Cite `tsc -p tsconfig.json` (not `npm run build`) as the type-gate evidence — done above.
- **spawns:** implementer (Grok/Cursor) not reported by host, ended complete; reviewer 10 calls, 61374 tokens, ended complete.
- **Requirements covered:** R-TIP-001 (mapper half), R-TIP-002 (drop + warn; unknown primary), R-TIP-005 (four null conditions), NFR-TIP-002 (two contract warns).
- **Decisions made:** `tipId` added as a mapper parameter (needed by §12 texts) — within the task's "takes a logger" latitude. Approval gate: auto-continue (owner standing rule).
- **Final verification:** VERIFIED (above).
