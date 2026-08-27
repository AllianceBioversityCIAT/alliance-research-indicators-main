# Execution log — Results / Measure `Number` accepts signed decimals

## Document Control

| Field | Value |
| --- | --- |
| Spec | `docs/specs/changes/measure-number-signed-decimal/` |
| Branch | `AC-1679-Create-the-innovation-use-section` |
| Depth | `Full` |
| Budget (tripwire) | 12 tasks · ≈ 1,560 LOC · ≈ 24 review rounds · 2 PRs |
| Log created | 2026-08-27 |

---

## Task Execution History

### T-01 — Execute the blocking pre-flight and record its verbatim output

- **Status:** ⚠️ **MEASUREMENT RECORDED — Reviewer gate still owed. Task remains `[ ]`.**
- **Date:** 2026-08-27
- **Implementer attempts:** 0 — executed **inline by the Leader**. `T-01` touches no source file and its work is two read-only `SELECT`s, which `.agents/leader.md` → *Delegation Thresholds* classes as a punctual verification, not delegable work.
- **Requirements covered:** `NFR-MSD-002`; gates `R-MSD-011` AC.7
- **Authorization:** explicit user ruling at the `/akili-execute` gate, 2026-08-27 — recorded in `NEXT-SESSION.md`. Read-only, no writes.

#### Target, verified by resolved host — not by variable name

`docs/infrastructure.md` warns that a `TEST`-named variable is not evidence of a disposable target (finding **F-01**). Checked before connecting:

```
target  : <redacted host>:3306   db=alliancereportingdb     <- shared Dev
scratch : 127.0.0.1:3307                                    <- disposable
=> different targets. F-01 check PASSES on this machine.
```

#### Query 1 — magnitude (verbatim)

```sql
SELECT COUNT(*) AS total, MIN(quantification_number) AS min_v, MAX(quantification_number) AS max_v,
       MAX(LENGTH(TRIM(LEADING '-' FROM quantification_number))) AS max_len
FROM result_quantifications;
```

```json
[ { "total": 80, "min_v": 0, "max_v": 87654, "max_len": 5 } ]
```

#### Query 2 — negatives by role (verbatim)

```sql
SELECT quantification_role_id, COUNT(*) AS negatives FROM result_quantifications
WHERE quantification_number < 0 GROUP BY quantification_role_id;
```

```
(no rows)
```

#### Context queries — not required by the AC, run because they were free

```sql
SELECT quantification_role_id, COUNT(*) AS rows_in_role, SUM(quantification_number IS NULL) AS nulls
FROM result_quantifications GROUP BY quantification_role_id ORDER BY quantification_role_id;
```

```json
[ { "quantification_role_id": 1, "rows_in_role": 42, "nulls": "0" },
  { "quantification_role_id": 2, "rows_in_role": 37, "nulls": "0" },
  { "quantification_role_id": 3, "rows_in_role": 1,  "nulls": "0" } ]
```

```sql
SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='result_quantifications'
  AND COLUMN_NAME='quantification_number';
```

```json
[ { "COLUMN_TYPE": "bigint", "IS_NULLABLE": "YES" } ]
```

#### Stop conditions — both evaluated

| Condition | Threshold | Observed | Result |
| --- | --- | --- | --- |
| **STOP 1** — role-3 row outside `DD-14`'s scale-4 bound | \|v\| > 549,755,813,887 | max \|v\| across **all** roles = **87,654** | ✅ **not triggered** |
| **STOP 2** — negative row on role 1 or 2 (`RK-14`) | any row | **zero rows** | ✅ **not triggered** |

**The change proceeds.** Neither halt fires.

#### What this measurement settles

| Claim | Before | Now |
| --- | --- | --- |
| **`U-9`** — does any role-3 row exceed the bound? | unknown from the repo | **No.** Role 3 holds exactly **1** row |
| **`U-2`** — `ALGORITHM=COPY` rebuild cost | *"the live row count is unknown"*; `design.md` called it an operational event | **80 rows total.** The `T-05` rebuild is effectively instant. **`RK-4`'s operational concern is materially reduced** — the lock window is negligible at this size |
| **`M-02` / `RK-14`** — is the column signed? | read from `baseline.sql:3789` | **Confirmed against the live database:** `bigint`, `IS_NULLABLE: YES`. Signed and nullable. The sign-axis tightening is real, and its live blast radius in Dev is **zero rows** |

#### ⚠️ What this measurement does NOT settle — declared, per KZ-017

1. **This is Dev (`alliancereportingdb`) only.** Prod is a separate target that was not queried. **Both queries must be re-run against Prod at rollout**, and `NFR-MSD-002`'s stop conditions bind there independently. "No negatives exist" is false as stated; "no negatives exist in Dev on 2026-08-27" is what was measured.
2. **Zero NULLs exist in any role.** So no live row exercises `DD-2`'s `null → null` contract or `R-MSD-011` AC.6's null-skip. Those remain **fixture-only** guarantees — an important gap, because a production-shaped null has never traversed this path.
3. **Row counts are a snapshot**, not a lock. A row added between this measurement and `T-05`'s migration is outside what was checked.

#### Why this entry does not close the task

`T-01`'s work is done and its evidence is above. **The task stays `[ ]` because no Reviewer has audited it**, and the run that produced it was executed from the wrong working directory (`-management`), where the `akili-*` wrappers and `.claude/hooks/akili-tasks-gate.sh` are not loaded. Flipping the checkbox here would be the Leader self-certifying its own measurement with the machine check absent — precisely the write `.agents/leader.md` names as *"the one claim in the pipeline no Reviewer audits."*

**Owed before `[x]`:** an independent Reviewer audit of this entry against `T-01`'s acceptance criteria and its stated disqualifier, run from `alliance-research-indicators-main`.

> **Note for whoever runs that gate — the hook is coarser than it looks.** `akili-tasks-gate.sh` greps `execution.md` for the literal string `PASS`; once *any* verdict exists in this file it stops discriminating between tasks. This entry therefore deliberately avoids writing that token as a verdict. Treat the hook as a guard against an empty log, not as per-task evidence checking.
