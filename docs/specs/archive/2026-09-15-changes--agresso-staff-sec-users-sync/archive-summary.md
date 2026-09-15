# Archive Summary — Agresso Staff / Provision and restore platform accounts

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/agresso-staff-sec-users-sync` |
| Archive date | 2026-09-15 |
| Final status | **Delivered — READY WITH ACCEPTED WARNINGS** |
| Branch | `new-spec-auto-sync-sec-users` (spec branch — constitution sync deferred) |
| Validation | [`./validation-report.md`](./validation-report.md) — 0 FAIL |
| Kaizen entry | `docs/specs/kaizen/changes--agresso-staff-sec-users-sync.md` |

## 2. What shipped

The Agresso staff sync now **owns the provisioning of platform accounts**. Every synced staff member is reconciled against `sec_users` and routed to exactly one outcome — **created**, **refreshed**, or **reactivated** — and the endpoint that triggers it is restricted to `SYSTEM_ADMIN`.

**Nothing here can take access away.** The pass inserts rows, fills empty fields and turns accounts on. Deactivation moved out to the sibling spec before implementation began.

## 3. Requirements delivered

| ID | Title | Status |
|---|---|---|
| R-AGS-001 | Reconcile every synced member against `sec_users` (email only) | ✅ |
| R-AGS-002 | Refresh an active account; carnet filled in, never overwritten | ✅ |
| R-AGS-003 | A staff member with no account gets one | ✅ |
| R-AGS-004 | A created account receives `CONTRIBUTOR` | ✅ |
| ~~R-AGS-005~~ | **MOVED** → `changes/agresso-staff-deactivation` | — |
| R-AGS-006 | Only a system admin can trigger the sync | ✅ |
| R-AGS-007 | A returning staff member's account is reactivated | ✅ |
| NFR-AGS-001/002/003 | Idempotence · `O(⌈n / CHUNK⌉)` · per-run summary | ✅ |

## 4. Files changed

| Area | Files |
|---|---|
| New | `sec-user-reconciler.repository.ts` + spec · `sec-user-reconciler.service.ts` + spec · `dto/sec-user-reconciliation-summary.dto.ts` · `agresso-staff-tools.module.spec.ts` · `test/fixtures/agresso-staff-reconciler.fixture-spec.ts` |
| Modified | `agresso-staff-tools.{controller,service,module}.ts` and their specs |
| No DDL, no migration | Precondition 1 held throughout |

**~2,200 LOC** implementation + tests, against a budget re-baselined mid-execution from ~1,580 to ~3,000 (user-approved at the T-03 gate).

## 5. Test evidence

| Tier | Result |
|---|---|
| Unit (`npm test`) | **369 suites / 3,186 tests** |
| Fixture (real MySQL 8.0) | **15/15** — the only tier that can evidence any §3/§5 claim |
| Lint (`npx eslint`, bare) | clean, 0 warnings |
| Type-check (`tsc --noEmit`) | clean |

⚠️ **`/akili-test` never ran** — there is no `test-report.md`. Accepted, and recorded in the validation report.

## 6. Validation

**READY WITH ACCEPTED WARNINGS**, audited by Antigravity `gemini-3.1-pro-high` (not the Leader — `author ≠ auditor`, since the Leader implemented T-05's rework through T-09 after Codex exhausted its quota). **Zero FAIL findings.** The auditor independently re-measured the two claims it was told not to take on trust.

## 7. Accepted warnings and follow-ups

| # | Item | Owner |
|---|---|---|
| 1 | **T-09 left `[~]`** — not all 30 `requirements.md` §10 gates have a database fixture; the statement count is asserted bounded, not exact. Verified as an honest assessment | follow-up |
| 2 | `/akili-test` never ran | follow-up |
| 3 | **Five `design.md` corrections** (§2.1/§2.2, §5.2, DD-14 stale stratum, §8, §9) | kaizen pending items |
| 4 | Coverage not re-measured against the 60% floor | follow-up |
| 5 | **5 pre-existing failing fixture suites** in `innovation-use` — measured identical with and without this spec | another spec |
| 6 | ⚠️ **T-08 is breaking for non-admin callers**, and the endpoint is fire-and-forget so such a caller breaks **silently**. Ask whoever operates the sync before deploying | human |
| 7 | 5 unresolved 4R advisories carried from `execution.md` | follow-up |

## 8. Historical notes

- **The spec was split before implementation.** Judgment Day measured every severe finding in the destructive half (`R-AGS-005`) and none in the additive half; the destructive half moved out with its full ledger.
- **Three execution architectures in one run.** Claude subagents (T-01/T-02) → Codex via Orca (T-03…T-05) → the Leader itself (T-05 rework…T-09) after Codex hit 94% quota. Antigravity audited every task throughout, so `author ≠ auditor` held across **model families** the whole way.
- **`OQ-8` resolved post-implementation and dissolved rather than answered.** `status` holds only `{'N', NULL}` — it could never have gated anything. Closed upstream instead by Agresso's `?status=active`, which **closes `RSK-9` by construction**.
- **The `?status=active` filter hands a hazard to the sibling spec**, recorded in its `proposal.md` with a user ruling: absence from the payload no longer means "not on the staff list".
- **Two Reviewer FAILs, zero HALTs, zero pivots.** Both FAILs were defects the author could not see in their own work — a type that lied about runtime values, and an assertion that proved presence where the requirement was about order.
