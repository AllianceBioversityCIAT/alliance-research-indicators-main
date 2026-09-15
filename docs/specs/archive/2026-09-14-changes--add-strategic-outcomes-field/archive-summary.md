# Archive Summary — Alliance Alignment / Strategic (Impact) Outcomes for Innovation Use

## Outcome: DELIVERED — validated PASS, deployed and confirmed live on Testing/Dev

## 1. Document Control

| Field | Value |
| --- | --- |
| Original spec path | `docs/specs/changes/add-strategic-outcomes-field` |
| Archive date | 2026-09-14 |
| Archived by branch | `AC-1753-Include-the-Strategics-Outcomes-in-alliance-allignment` (spec branch — default is `main`) |
| Final status | Done — 5/5 tasks, validation PASS, migration confirmed live on Testing/Dev |
| Linked ticket | AC-1753 |

## 2. Original Spec Path

`docs/specs/changes/add-strategic-outcomes-field/`

## 3. Archive Date

2026-09-14

## 4. Final Status

**DELIVERED.** All 5 tasks (T-01…T-05) done; `validation-report.md` verdict **PASS — archive-ready** (independent audit, different model than the Implementer); code merged `AC-1753 → staging → dev`, deployed via CI/CD; user confirmed on 2026-09-14 that migration `1788972162238-includeInnovationUseImpactOutcomes` is applied and enforcing on the Testing/Dev database. Prod (`main`) promotion remains a separate, human-decided step, explicitly out of this spec's scope.

## 5. Requirements Delivered

| ID | Title | Status |
| --- | --- | --- |
| R-ALN-001 | Client shows and saves Impact Outcomes for Innovation Use | ✅ Delivered (PASS, 2 low-risk WARN gaps — see §9) |
| R-ALN-002 | Server persists and returns Impact Outcomes for Innovation Use | ✅ Delivered (PASS) |
| R-ALN-003 | Impact Outcomes is actually mandatory for Policy Change and Innovation Use (`alignment_validation`) | ✅ Delivered (PASS) — enforcement confirmed live on Testing/Dev |

## 6. Files Changed Summary

From `execution.md`:

| File | Change |
| --- | --- |
| `client/.../alliance-alignment-p2.component.ts` | `shouldShowImpactOutcomes()` widened to `[4,5,6].includes(Number(indicatorId))` |
| `client/.../alliance-alignment.component.ts` | Added `isInnovationUseIndicator` signal; OR'd into the `includeImpactOutcomes` save gate |
| `client/.../alliance-alignment-p2.component.spec.ts` | +1 test case (indicator 6 visibility) |
| `client/.../alliance-alignment.component.spec.ts` | +2 test cases (indicator 6 load+save round-trip; indicator 2 negative) |
| `server/.../portfolio-2-alignment.handler.ts` | Both `find()`/`save()` allow-lists widened to include `INNOVATION_USE`; `save()`'s `.map()` call guarded with `?? []` |
| `server/.../portfolio-2-alignment.handler.spec.ts` | +3 test cases (save persistence, save negative/missing-key, find inclusion) |
| `server/db/migrations/1788972162238-includeInnovationUseImpactOutcomes.ts` | New migration — `alignment_validation`'s Portfolio-2 branch widened from `= 5` to `in (4, 5, 6)`, one line, verbatim otherwise |

5 sites total (2 client, 2 server, 1 migration) — no 6th site found by either execution-time review or the independent validation audit.

## 7. Test Evidence Summary

| Evidence | Result |
| --- | --- |
| Client full suite (final validation run) | 322/322 suites, 7214/7214 tests PASS |
| Server full suite (final validation run) | 364/366 suites, 3113/3116 tests — 2 pre-existing failures unrelated to this spec (Windows-checkout artifacts in other features' specs) |
| T-04 manual DB verification | 8-case fixture matrix against a disposable copy of production data; attempt 1 FAIL (2 fixtures gave false signal) → attempt 2 PASS (full remediation, all 8 cases independently confirmed discriminating) |
| T-05 pre-flight measurement | 27 of 28 existing Portfolio-2 Policy Change/Innovation Use results would flip complete→incomplete; explicit GO recorded 2026-09-09 |
| `test-report.md` | Not produced — testing folded into the `/akili-execute` Implementer/Reviewer loop rather than a separate `/akili-test` pass; accepted, noted in `validation-report.md` Document Control |

## 8. Validation Summary

`validation-report.md` verdict: **PASS — archive-ready.** Independent audit (different model than the Implementer) re-verified every requirement clause against current code, independently re-diffed the migration line-by-line against its base, and traced one factual drift (a stale "newest migration" claim in `execution.md`, since 3 unrelated migrations landed later) to a confirmed-benign runtime outcome rather than filing it as an open question.

## 9. Accepted Warnings / Follow-Ups

None of the following blocked archiving; accepted as-is (no dedicated follow-up task opened — low enough risk that a future touch to these files is the natural remediation point):

| # | Finding | Risk |
| --- | --- | --- |
| WARN-1 | No test asserting `shouldShowImpactOutcomes()` returns `false` for indicator 2 (only indicator 1 tested) | Near-zero — `[4,5,6].includes(2)` is structurally false |
| WARN-2 | No test asserting "Contribution to SDG" stays visible for indicator 6 on the render path (only covered indirectly on the save path) | Near-zero |
| F-1 | `execution.md` T-03's "correctly the newest migration" claim is now stale (later unrelated migrations merged in) | None — traced independently; TypeORM's revert path uses insertion order, not timestamp, so the documented backout still works |
| F-2 | `judgment.md` S-5's coercion-consistency fix (`Number(...)`) was applied only to the new `isInnovationUseIndicator` signal, not retroactively to `isOicrIndicator`/`isPolicyChangeIndicator` | No reachable defect found by the auditor; optional harmonization noted for a future change where AC.4's "byte-for-byte unchanged" constraint no longer binds |
| — | `requirements.md`'s own AC checkboxes (`[ ]`) were never ticked, though satisfied and evidenced elsewhere | Doc hygiene only |

## 10. Historical Notes

- **Depth escalated from Lite to Standard** during `/akili-specify` once a 5th site surfaced: the actual mandatory-field enforcement lives in a MySQL stored function, not just display gates (requirements.md §1's "Correction from the initial proposal").
- **`judgment.md` design review returned FAIL** (9+6 findings across two blind judges); the user explicitly chose "Continue" (accept as-is) rather than a fix-and-re-judge round. Several corroborated findings (C-1..C-4) were folded into `tasks.md`'s task notes and verification steps instead of reopening the design — this is why `tasks.md` carries unusually detailed implementation warnings (disambiguation traps, named-placeholder traps, fixture prerequisites).
- **T-04 required a rework round** (FAIL → PASS) — the only task in this spec that did. Both FAIL and the full remediation are preserved verbatim in `execution.md`.
- **Docker was not available at the start of the execution session** — T-04 was BLOCKED, escalated to the user, and resumed only once Docker was confirmed installed and running. This blocker and its resolution are preserved in `execution.md` as a real environment-gap precedent, not a spec defect.
- **The user later requested a persistent (non-disposable) local Docker MySQL setup** for repeated manual testing outside the AKILI session — this post-execution infrastructure work (container setup, `sql_mode`/charset parity with production, backend `.env` wiring) is conversational history only, not part of this spec's deliverable, and is not reflected in `tasks.md`/`execution.md`.
- **Post-execution rollout** (merge to `staging` → `dev`, deploy, and the user's live confirmation on Testing/Dev) happened in a later session on a different branch (`dev`) and is recorded in `execution.md` §3 Summary as the closing entry.
