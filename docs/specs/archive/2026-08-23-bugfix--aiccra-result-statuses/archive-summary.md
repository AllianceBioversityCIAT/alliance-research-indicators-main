# Archive Summary — Bugfix / AICCRA result statuses (`aiccra-result-statuses`)

**Outcome:** shipped in code. `ResultStatusEnum` gained AICCRA members (22, 26, 27, 28), a compensating **append-only** migration deactivates status 21 (Editing) and inserts 26–28, and a Bug-Mode regression spec fences both the deactivation and the seed. **Whether the migration has been applied to any database is NOT verified — see §9 (K-015).**

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/aiccra-result-statuses` |
| Type | Bugfix (server) |
| Completed | 2026-08-19 |
| Archived by | Claude (Fable 5) · 2026-08-23 · **spec branch** — pending items only |

## 2. Original Spec Path
`docs/specs/bugfix/aiccra-result-statuses/` → `docs/specs/archive/2026-08-23-bugfix--aiccra-result-statuses/`

## 3. Archive Date
2026-08-23

## 4. Final Status

| Gate | Result |
|---|---|
| Tasks | T-01/T-02/T-03 done (statuses recorded in tasks.md; **no separate `execution.md`** — evidence style predates the log convention, accepted) |
| `test-report.md` / `validation-report.md` | absent — **accepted** |
| Unresolved FAIL | none on record |

## 5. Requirements Delivered

| Requirement | Evidence |
|---|---|
| R-ARS-001 enum members 22/26/27/28, no Editing-in-AICCRA | `result-status.enum.ts` (T-01) |
| R-ARS-002/003/004 compensating migration, merged migrations untouched | `1787181821481-deactivateAiccraEditingAndInsertMissingStatuses.ts` (T-02); append-only rule respected |
| R-ARS-002 AC.2 / R-ARS-004 regression fence | `migration-specs/insert-aiccra-result-statuses.spec.ts` (T-03: fails if up() deletes 21 or the seed loses AICCRA inserts) |

## 6. Files Changed Summary
Commits `3ac25a39` (proposal), `e4260295` (enum + migration + spec), `eede621c` (prettier) — all `[SPEC:…]`-tagged. Server-only; artifacts verified present in the tree at archive.

## 7. Test Evidence Summary
Regression spec exists and is in the jest tree; no recorded run output in the spec (accepted — the suite runs with the server package's `npm test`).

## 8. Validation Summary
None recorded; accepted at archive.

## 9. Accepted Warnings Or Follow-Ups

| Item | Disposition |
|---|---|
| **K-015 — migration application state UNVERIFIED** | `npm run typeorm migration:show` was attempted against Dev at archive (2026-08-23) and **timed out with zero output** — per K-014 no pending/applied claim is made. **Follow-up (open): before relying on statuses 26–28 in Dev or Prod, run** `npm run typeorm migration:show -- -d ./src/db/config/mysql/orm.config.ts` **from `server/researchindicators/` and apply the migration as a human-decided step if pending.** Archiving records the code as done, not the schema change as live |
| No execution.md / reviewer verdicts | Accepted; evidence embedded in tasks.md, artifacts re-verified in-tree at archive |

## 10. Historical Notes
Proposal explicitly framed as "restart without rewriting merged migrations" (`3ac25a39`) — the append-only compensating pattern this repo's K-015/§4.1 rules mandate. Precedent migration `8431dc4b` sat unapplied 4 days across several deploys; hence §9's insistence.
