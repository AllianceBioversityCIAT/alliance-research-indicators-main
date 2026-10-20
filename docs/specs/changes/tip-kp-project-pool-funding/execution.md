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

### T-02 — `BilateralService.importAlignmentFromTip` and TIP display-only — in progress (attempt 1 FAIL)

- **Date:** 2026-10-20 · **Effort:** high (gate-free write to shared tables) · **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns` (task defaults) · **Review mode:** parallel lens reviewers ×2 (data-loss surface)
- **Implementer:** Grok `grok-4.7-high` via Cursor — Orca `task_791c5d5d7442` / `ctx_576af5bc2b27`
- **Attempt 1:**
  - **Files changed:** `server/researchindicators/src/domain/entities/bilateral/bilateral.service.ts` (new `importAlignmentFromTip` + helpers, inserted before `persistAlignment`; `buildAlignment` `displayOnly` TIP term); `bilateral.service.importAlignmentFromTip.spec.ts` (new); `bilateral.service.spec.ts` (additions only: display-only ×3, STAR-KP `level_not_allowed`).
  - **Falsifiers (Implementer, verbatim excerpts):** 2.1 `getTocResultsForSps` → `Expected: "OUTCOME" / Received: null` at `expect(toc.level).toBe('OUTCOME')`; 2.2 catch returns `[]` → `Expected: 4711 / Received: null` at `expect(toc.indicator_id).toBe(4711)`; 2.3 equality `===` → `Expected number of calls: 0 / Received number of calls: 1` at `expect(persistAlignment).not.toHaveBeenCalled()`; 2.4 no TIP guard → `Expected: false / Received: true` at `expect(out.display_only).toBe(false)`. All reverted.
  - **Implementer verification:** bilateral jest 22 suites / 393; eslint 0; build 0; `tsc -p tsconfig.json` 0; protected bodies unchanged (`git diff -U0` hunks listed; `toc-level-rules.util.ts` `--exit-code` 0).
  - **Evidence re-run (Leader-inline):** VERIFIED — bilateral jest 22/22 suites, 393/393; eslint 0; `tsc --noEmit -p tsconfig.json` 0; `npm run build` 0; `git diff --exit-code toc-level-rules.util.ts` 0.
  - **Reviewer 1 (conformance + reliability + readability):** PASS — tests and Disqualifier met (4711 unique; `persistAlignment` asserted on full args); §7.4 step 3 equality covers all 10 written columns; R-TIP-004 both halves evidenced (TIP PATCH half = existing `updateAlignment — TIP/AICCRA source gate (R-RC-005)` `it.each` in `bilateral.service.spec.ts`, unchanged); display-only term matches §6; protected bodies untouched; memo correct.
  - **Reviewer 2 (resilience + risk / data integrity):** **FAIL** — verbatim:

    > 1. **Discovered Issue:** "Failed" only counts when no level found the ToC result at all (`failedWithoutMatch = !hits.length && anyLevelFailed`). If an earlier level fails and a later level matches, the method takes the later level's answer, even when the stored row was resolved under the level that failed. Steps that reach it (*Reachable*): Stored row: `SP01 / 7033 / level OUTPUT / indicator 4711 / households / '15.5' / 2026`. On the next sync, OUTPUT throws. OUTCOME also lists `7033`, but none of its indicators has TIP's UUID. Result: `hits=[OUTCOME]`, `indicators=[]`, so the upsert carries `level 'OUTCOME'` and nulls for `indicator_id`, `unit_messurament`, `target_value` and `target_year`. That is not equal to the stored row, so `persistAlignment` overwrites a resolved row with nulls. Even when OUTCOME's indicator does match, the level flips to OUTCOME during the outage and back once OUTPUT recovers, which rewrites the alignment twice.
    > **Violated Rule:** `design.md` §7.4 step 1: "when the **level that would decide** failed and the active ToC row has the same `toc_result_id`, the upsert keeps that row's `level`, `indicator_id`, `unit_messurament`, `target_value`, `target_year`". Also `requirements.md` R-TIP-003, clause "…SHALL be kept, never overwritten with nulls" and scenario *Catalog down on a later sync* BUT. With first match winning in OUTPUT→OUTCOME→EOI order, a failed level that comes before the first hit is a level that would decide.
    > **Remediation Suggestion:** In `lookupTipCatalog`, compute "undecided" as: some level before `hits[0].level` in `TIP_TOC_LEVELS` failed, or there are no hits and any level failed. Return that flag in place of `failedWithoutMatch`, and use the kept row only when it is true. The existing fresh-row test "OUTPUT throws but OUTCOME holds" stays green, because there is no kept row. Add a test: a resolved OUTPUT/4711 row, OUTPUT throws, OUTCOME holds 7033 with no matching UUID. Expect 4711/OUTPUT kept, or `persistAlignment` not called. Run the falsifier: put the old `!hits.length` condition back and watch the new test go red.

  - **Leader adjudication:** lens FAIL is in scope (cites §7.4 step 1 + R-TIP-003 BUT) → attempt consumed. Rework goes to the same retained worker (owner rule: worker lives until PASS).
- **ADVISORY (both reviewers, recorded, non-gating — not sent as work):** failed catalog levels are never logged (suggest one warn per failed memo key); `tipKeptCatalogRow` matches `toc_result_id` without `sp_code` (spec allows it); reads outside the transaction (same as PRMS; single nightly run); `science_program_id ?? ''` unguarded (T-01 rule 6 blocks it); string `toc_result_id` would miss under `===` (T-04 checks real payload); `target_contribution: ' '` → `Number(' ')` = 0 (design §5 gap, not drift); `Math.round(1.005*100)` float rounding vs column rounding (self-consistent); test gaps (throwing level re-fetch, repeated indicator UUID, KP test identical to first); readability (inline type vs `PoolFundingAlignmentDetail`; compares `mapping.target_contribution` not `upsert.quantitative_contribution`).
- **spawns:** implementer (Grok/Cursor) not reported by host, ended complete; reviewer-1 26 calls, 111788 tokens, ended complete; reviewer-2 19 calls, 110196 tokens, ended fail.
- **Attempt 2 (rework, same worker — Orca `task_e77bb48e649b` / `ctx_c35d55ef59f9`):**
  - **Files changed:** `bilateral.service.ts` (`failedWithoutMatch` → `tipCatalogUndecided`: a level before the first hit failed, or no hit and any level failed), `bilateral.service.importAlignmentFromTip.spec.ts` (+ test "later level lists the id").
  - **New falsifier (Implementer):** attempt-1 condition restored → `Expected: "OUTPUT" / Received: "OUTCOME"` at `expect(toc.level).toBe('OUTPUT')`. Reverted. Attempt-1 falsifiers not re-run (sites untouched).
  - **Evidence re-run (Leader-inline):** VERIFIED — bilateral jest 22/22 suites, 394/394; eslint 0; `tsc -p tsconfig.json` 0; build 0; `toc-level-rules.util.ts` unchanged.
  - **Reviewer (rework, conformance + data integrity):** **FAIL** — attempt-1 defect fixed and every ordering correct; new gap, verbatim:

    > 1. **Discovered Issue:** A kept row whose catalog columns are null still overrides a real match. Reachable, traced through the code:
    >    - Sync 1 runs with every level down on a fresh row. It writes `toc_result_id 7033` with `level`, `indicator_id` and `target_year` all null (the "Catalog unavailable" scenario).
    >    - Sync 2: OUTPUT throws, and OUTCOME lists 7033 with TIP's UUID → 4711.
    >    - `undecided` is true, so `tipKeptCatalogRow` returns the all-null row and `buildTipTocUpsert` builds an all-null upsert.
    >    - `tipAlignmentUnchanged` then finds it equal to the stored row and returns without writing. The OUTCOME/4711 match is lost.
    > 
    >    It heals on the next sync where every level answers. Until then the row stays incomplete, and a flaky OUTPUT level can keep it that way.
    >    - **Violated Rule:** `requirements.md` R-TIP-003, line 164: "a failure on one level SHALL NOT discard a match found on another". The keep rule (line 165, design §7.4 step 1) exists so resolved values are "kept, never overwritten with nulls". Keeping nulls in place of a found match turns that purpose upside down.
    >    - **Remediation Suggestion:** Use the kept row only when it carries catalog data, e.g. in `importAlignmentFromTip`: `kept = lookup.undecided && candidate?.level != null ? candidate : null`. When the kept row is unresolved, fall back to `lookup` (null on no-hit, the later-level match on a hit). Add a test: stored row `{toc_result_id 7033, level null, indicator_id null}`, OUTPUT throws, OUTCOME lists 7033 with the UUID → `persistAlignment` called with `level 'OUTCOME'`, `indicator_id 4711`. Falsifier: remove the `level != null` condition → the test goes red (persist not called).

  - **Leader adjudication:** in scope, not a spec tension — the remediation satisfies both R-TIP-003 l.164 and §7.4 step 1 (the keep rule protects *resolved* values). Attempt consumed; attempt 3 is the last.
  - **ADVISORY:** miss `warn` on the kept path is a real miss on an answering level (NFR-TIP-002 conformant) but may mislead ops; untested orderings (OUTPUT miss + OUTCOME throws + EOI hit; OUTPUT hit + OUTCOME throws); `tipKeptCatalogRow` not matched by `sp_code`.
  - **spawns:** implementer (Grok/Cursor) not reported by host, ended complete; reviewer 5 calls, 66841 tokens, ended fail.
- **Attempt 3 (final rework, same worker — Orca `task_7a9e9d786f28` / `ctx_c9db00a94348`):**
  - **Files changed:** `bilateral.service.ts` (`kept = lookup.undecided && candidate?.level != null ? candidate : null`), `bilateral.service.importAlignmentFromTip.spec.ts` (+ test "an unresolved stored row does not hide a later-level match").
  - **Falsifier (Implementer):** `&& candidate?.level != null` removed → `npx jest …importAlignmentFromTip.spec.ts -t "unresolved stored row"` → `Expected number of calls: 1 / Received number of calls: 0` at `expect(persistAlignment).toHaveBeenCalledTimes(1)`. Reverted. Re-check cases (kept resolved row; fresh row; all-throw resolved; all-throw fresh) covered by named tests, green.
  - **Evidence re-run (Leader-inline):** VERIFIED — bilateral jest 22/22 suites, 395/395; eslint 0; `tsc -p tsconfig.json` 0; build 0; `toc-level-rules.util.ts` unchanged.
  - **Reviewer (rework, conformance + data integrity):** **PASS** — remediation exactly as asked; new test proves it; every earlier ordering traced and intact; rest of T-02 conforms (field table on full args, 4711 unique, memo, D-10, R-TIP-004/006, protected bodies untouched). Judged "stored level with null indicator is still kept" conformant: a non-null `level` is a resolved state (R-TIP-003 l.155/l.165, §7.4 step 1).
  - **ADVISORY:** no test for first-level hit + later failure (decided); kept columns may go stale if TIP changes the indicator UUID for the same `toc_result_id` while the deciding level is down — follows R-TIP-003 l.165 to the letter, **spec wording gap recorded for the owner**; same-level refresh skipped while an earlier level is down (conforms to §7.4); `science_program_id ?? ''` fallback unused; R-TIP-004 TIP `PATCH` half rests on the existing `updateAlignment — TIP/AICCRA source gate (R-RC-005)` test.
  - **spawns:** implementer (Grok/Cursor) not reported by host, ended complete; reviewer 7 calls, 69058 tokens, ended complete.
- **Final status:** PASS on attempt 3 · **Requirements covered:** R-TIP-003, R-TIP-004, R-TIP-006, NFR-TIP-001, NFR-TIP-002 (catalog-miss warn).
- **Decisions made:** parallel lens review on attempt 1 (data-loss surface, effort high); attempts 2–3 single conformance+integrity reviewer (rework override e). Rework kept in the same retained worker (owner rule).
- **Final verification:** VERIFIED (attempt 3 re-run above).

## Budget tripwire — after T-02 (2026-10-20)

| Measure | Budget (design §1) | Actual after T-01 + T-02 | Remaining work |
| --- | --- | --- | --- |
| Tasks | 4 | 2 done | T-03, T-04 |
| LOC | ~560 (≈200 prod / 360 tests) | **1455** (430 prod / 1025 tests) — `git diff --numstat eb87561b4 HEAD -- server/` | T-03 adds more |
| Review rounds | 7 | 5 (T-01 ×1; T-02 ×4: 2 parallel lens + 2 rework) | T-03 ≥1 |

**Cause:** T-02 is ~3× its estimate — the per-level catalog lookup with failed≠miss, the kept-row rule (two rework rounds tightened it: earlier failed level; unresolved stored row), the normalised equality skip, and a test suite that asserts full `persistAlignment` args per the Disqualifier. LOC exceeded → stop and escalate per `/akili-execute` §2.4. Execution paused before T-03, awaiting the owner.
