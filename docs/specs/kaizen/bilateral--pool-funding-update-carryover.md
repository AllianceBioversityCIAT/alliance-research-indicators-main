# Kaizen Entry — bilateral/pool-funding-update-carryover

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/pool-funding-update-carryover` |
| Date | 2026-10-08 |
| Branch | pull-prms-result (spec branch: no `Default Branch:` / `Integration Branch:` pin; `main` is the resolved default) |
| Archive Run | 1 |
| Approval Mode | pre-approved (owner: "judgment once, a second only if needed, then continue automatically") |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (2 build + 1 HITL) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-02: audit columns unasserted, `has_contribution` seed not distinguishing) | execution.md — T-02 |
| HALTs / FATAL_FAILs | 0 / 0 | execution.md |
| Pivots | 0 (1 execute-time premise amendment, P-5, Low) | execution.md — T-02 |
| PRODUCT_BUGs | n/a (no `/akili-test`) | — |
| Judgment-day severe findings | 2 confirmed (round 1 plain-unique mapping index; round 2 fix-caused) → ESCALATED, continued under owner pre-authorization | judgment.md |
| Validation FAIL / WARN | 0 / WARN (3 accepted gaps, 4 doc drifts fixed) | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 1 (T-03, HITL, no code) | execution.md |
| Escaped defects | 0 | — |
| Budget tripwire | exceeded: ~500 LOC → +793/−40; 3 verdicts vs ~4 rounds | design.md §0; execution.md Summary |
| Runtime events | 0 | execution.md |

## Lessons

- **KZ-bilateral--pool-funding-update-carryover-1 — Premises about database constraints were cited to migrations, not to the schema the code runs against.** (Product, High)
  - **Root cause.** Design P-5 cited migration `1779190000014` for a unique active-alignment index. The Dev-sourced `baseline.sql` (2026-08-14) has no such index although the migration is in its ledger. The same design did not list the indexes of the other three tables at all, so the plain UNIQUE `uq_rpfim_result_indicator_active` (which includes `is_active`) was found only by judgment-day.
  - **Effect.** Two judgment rounds were spent on the mapping index (one fix introduced a new severe defect), and falsifier f4 could not produce its predicted 1062.
  - **Evidence.** judgment.md JD-1, R2-1; execution.md T-02 "Decisions — execute-time spec edit" (P-5); design.md §11 P-5, P-10.
  - **Standardization:** → P1.
- **KZ-bilateral--pool-funding-update-carryover-2 — Budget estimates under-count real-MySQL fixtures.** (Product + Methodology, Medium)
  - **Root cause.** The design budget estimated tests as ~2× production code; the fixture alone was ~420 lines (seed helpers, two real versioning cycles, audit assertions).
  - **Effect.** Third spec in a row whose overrun is dominated by tests (`pool-funding-feature-toggles`, `pool-funding-reporting-year`, this one) — the promotion threshold the previous entry set.
  - **Evidence.** design.md §0 budget; execution.md Summary; `docs/specs/kaizen/bilateral--pool-funding-reporting-year.md` "LOC estimate vs tests".
  - **Standardization:** → P2 (local), P3 (upstream).

## Noted, not a lesson

- **Fix-caused defect in judgment round 2.** The round-1 fix was reasoned against the failing sequence the judges cited, not the full state space (active + inactive twin). One occurrence; the two-judge protocol caught it.
- **Scratch harness drift (KZ-004 recurrence).** `migration:test:bootstrap` fails on `1787600000000-createPiDelegates` (errno 3780) because `baseline.sql` still has `agresso_contracts` in utf8mb3 while commit `027bc60f7` pinned `pi_delegates` to utf8mb4. Worked around inside the container only. → P4.
- **HITL coverage.** The owner's approval did not name a non-eligible result, so S-7 closed as an accepted gap (KZ-002 class).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `server/researchindicators/src/CLAUDE.md` §7 Persistence rules |
| Edit | Add: "A claim about a DB constraint or index cites the schema the code runs against — `SHOW CREATE TABLE` on the scratch DB or `src/db/baseline/baseline.sql` — never the migration alone; the Dev-sourced baseline lacks `uq_rpfa_active_result` although `1779190000014` is in its ledger. A design that deactivates-then-inserts lists every unique index of every table it writes." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` — budget section |
| Edit | Add: "When a task's gate is a real-database fixture, budget that fixture separately at ~300–450 LOC (seed helpers, teardown, cycle cases); tests have dominated the overrun on three consecutive specs." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | upstream |
| Target | AKILI methodology — `/akili-specify` Step 2.4 (Size Against the Design) |
| Edit | Size test LOC by gate type (mocked unit vs real-DB fixture), not as a multiple of production LOC. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `docs/specs/kaizen-log.md` Active Lessons — KZ-004 |
| Edit | Recurrence +1 (2026-10-08, `bilateral/pool-funding-update-carryover` T-02): the scratch harness bootstrap fails on a stale `baseline.sql` (pi_delegates errno 3780). Product follow-up: refresh `src/db/baseline/baseline.sql`. |
| Severity | High |
| Status | pending |
