# Execution — Policy Change / Innovation links

## 1. Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/policy-change-innovation-links/` |
| Run | `run_072b366721e5` (Orca) |
| Branch | `AC-1754-Activate-the-Innovation-development-and-innovation-use-selector-in-policy-change` · baseline `506a34704` |
| Leader | Claude Opus 5.5 (this session) |
| Implementer | Grok `grok-4.7-high` via Cursor (Orca `/orchestration`) — standing split: Grok implements, Claude reviews |
| Reviewer | Claude `akili-reviewer` wrapper (fresh context, different weights from the Implementer) |
| Approval mode | spec says `interactive`; owner standing direction (2026-10-06) — continue task to task, stop only on FATAL_FAIL / HALT / Pivot / tripwire. T-03 still stops for the human visual check, and nothing from T-03 is committed before it |
| Budget (tripwire) | 3 tasks · ~70 production + ~200 test LOC · 4 review rounds (design §11) |
| Parallelism | T-01 (server) ∥ T-02 (client); workers run scoped tests only, the Leader runs each full suite after both report (root `CLAUDE.md` §4.3) |

## 2. Task Execution History

### T-01 — Server: reject a link of the wrong result type → **PASS**

| Field | Value |
| --- | --- |
| Date | 2026-10-20 |
| Final status | PASS (attempt 1 of 3) |
| Orca task / dispatch | `task_2f405e8000ee` / `ctx_ef007a4ccede` |
| Implementer | Cursor · `grok-4.7-high`, effort medium, skills `nestjs-expert`, `error-handling-patterns`, `tdd` (Leader added `tdd`: a guard with exact red/green falsifiers) |
| Reviewer | Claude `akili-reviewer` (fresh context, lens checklist) — **PASS** |
| Requirements covered | R-PCIL-005 (both fields, `400`, nothing written, `null`/absent accepted); R-PCIL-004 "Clear one" BUT clause (server half) |

**Files changed (2):**
- `server/researchindicators/src/domain/entities/result-policy-change/result-policy-change.service.ts` — new private `assertInnovationLinkTypes`, awaited in `update()` before `dataSource.transaction`
- `server/researchindicators/src/domain/entities/result-policy-change/result-policy-change.service.spec.ts` — 7 new tests

The controller was not changed: it declares no `@ApiResponse` (confirmed by the Reviewer).

**P-6 outcome:** the only non-creation write that touches `results.indicator_id` is versioning. `INSERT INTO results` copies `r.indicator_id` onto a new row, so the value is unchanged. Creation is `ResultsService.create` `save({indicator_id})`. `SET indicator_id` in `pool-funding-mapping-apply.service.ts:93` targets `result_pool_funding_toc_alignment`, not `results`. P-6 holds, so DD-3 stands. **Scope note (KZ-017, from the Reviewer):** the grep cannot see a TypeORM `save()` or `update()` on an existing `Result` entity object. P-6 is backed by two independent reads, but no exhaustive proof exists.

**Implementer verification (as reported):**
- `npm test -- --silent result-policy-change` → PASS, 2 suites, 20 tests (controller spec included)
- `npx eslint src/domain/entities/result-policy-change` → exit 0
- `npm run build` → exit 0
- Red, against pre-change `update()`, at `service.spec.ts:267`: `expect(received).rejects.toThrow()` / `Received promise resolved instead of rejected` / `Resolved to value: undefined`
- Falsifier (a), type check deleted, both wrong-type tests at `:272` and `:288`: `Received promise resolved instead of rejected` / `Resolved to value: undefined`
- Falsifier (b), `is_active: true` added, DD-3 test at `:381`: `expect(received).resolves.toBeUndefined()` / `Received promise rejected instead of resolved` / `Rejected to value: [BadRequestException: innovation_development is not an existing Innovation Development result]`
- Both mutations were reverted.

**Evidence re-run (Leader inline, non-author, after both workers had reported): VERIFIED.**
- scoped: `Tests: 20 passed, 20 total`
- `npx eslint` → exit 0
- `npm run build` → exit 0
- full `npm test -- --silent` (from `server/researchindicators/`) → `Test Suites: 428 passed, 428 total` · `Tests: 4179 passed, 4179 total`

**Reviewer summary:**
- The check runs before the transaction, reads `result_id` and `indicator_id` through `dataSource`, and does not filter by `is_active` or status.
- `BadRequestException` names the field.
- The "transaction not called" assertions hold only because of the check (`armTransaction()` arms a working callback), so the disqualifier does not apply.
- Test (6) asserts the exact payload `[{ other_result_id: 20 }]`.
- The DD-3 mock can genuinely diverge.
- `bigNumberStrings: false` (`orm.config.ts`) makes the numeric `Map` lookup match today.

**ADVISORY (4R, non-gating):**
1. RELIABILITY — the check uses `!= null`, but `innoSave` uses truthiness. So `{innovation_development: 0}` now gets `400` where it used to be silently dropped. This is consistent with R-PCIL-005. The STAR client sends `null`.
2. RESILIENCE — `Map.get(item.id)` compares ids strictly. A string id (`"22"`) in a hand-built body, or `bigNumberStrings` flipping to true, would `400` every valid save. Suggestion: normalise with `String()`, as `result-actors.service.ts:378-389` does.
3. READABILITY — the test (7) `mockImplementation` on `mockResultFind` survives `clearAllMocks`. It is harmless today; `mockResolvedValueOnce` or `mockReset` would stop the leak.

**Decisions made:**
- The error message wording is the Implementer's: `innovation_development is not an existing Innovation Development result` / `innovation_use is not an existing Innovation Use result`. The design requires that the message names the field, not a fixed string.
- Brief narrowing: the worker ran scoped tests only, because T-02 ran in parallel. The Leader ran the full suite (root `CLAUDE.md` §4.3).

**Issues encountered:** two spawn failures. The Cursor CLI was logged out, and the worker sat at a browser login (`dispatch_input` failed, dispatches `ctx_2d5d53350f00`, `ctx_7e8d1553dbd1`). The user completed the login, and the Leader re-dispatched into the live terminal (`worker-start --terminal`).

- `runtime events: spawn failure ×2 → rung 1 (retry; user login)`
- `spawns: implementer(grok) not reported by host, ended complete; reviewer(claude) 14 calls, 67053 tokens, ended complete`
