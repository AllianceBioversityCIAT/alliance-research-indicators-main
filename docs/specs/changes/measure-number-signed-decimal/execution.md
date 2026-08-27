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

- **Status:** ⚠️ **MEASUREMENT + FALSIFIER RECORDED — Reviewer gate still owed. Task remains open.**
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

#### Falsifier proof — K-004 / KZ-014 (executed 2026-08-27, after the measurement)

`T-01`'s **Input that would make this check FAIL** clause states: *"seed a negative role-1 row and a role-3 row at `549,755,813,888` in a scratch copy and re-run — both stop conditions must fire. **If neither fires, the queries are not evidence.**"* That clause was not discharged by the measurement run. It is discharged here.

- **Executed by:** delegated Implementer (`akili-implementer`, T2), effort `high`. Evidence generation only — zero source files, zero spec edits.
- **Target:** the disposable scratch DB **only**. Resolved and confirmed distinct before any write (finding `F-01` — a `TEST`-named variable is not evidence of a disposable target):

```
ARI_MYSQL_HOST=<redacted host>           (shared Dev — NOT touched, no writes)
ARI_TEST_MYSQL_HOST=127.0.0.1:3307       (scratch — used exclusively)
```

- **Bootstrap:** `npm run compose:test:up`. `result_quantifications` already present from a prior bootstrap; `DESCRIBE` confirmed the column is still `bigint YES` — this spec's migration was deliberately **not** applied, so the proof runs against today's column type.

**Seed.** The scratch schema's FK constraints (`quantification_role_id → quantification_roles.id`, `result_id → results.result_id`) were not satisfiable for role 1 or for any result row, so two supporting rows were added and later removed alongside the seed:

```sql
INSERT INTO quantification_roles (id, name) VALUES (1, 't01_falsifier_role1');
INSERT INTO results (result_official_code, result_status_id) VALUES (999999901, NULL);

INSERT INTO result_quantifications (result_id, quantification_role_id, quantification_number, unit, description)
VALUES (33549, 1, -5, 't01-falsifier-unit', 't01-falsifier-role1-negative');
INSERT INTO result_quantifications (result_id, quantification_role_id, quantification_number, unit, description)
VALUES (33549, 3, 549755813888, 't01-falsifier-unit', 't01-falsifier-role3-overbound');
```

**Query 1 re-run on the seeded scratch schema (verbatim):**

```
COUNT(*)	MIN(quantification_number)	MAX(quantification_number)	MAX(LENGTH(TRIM(LEADING '-' FROM quantification_number)))
2	-5	549755813888	12
```

**Query 2 re-run on the seeded scratch schema (verbatim):**

```
quantification_role_id	COUNT(*)
1	1
```

| Condition | Fired? | What fires it |
| --- | --- | --- |
| **STOP 1** — role-3 row outside `DD-14`'s scale-4 bound | ✅ **YES** | `MAX = 549755813888` > `549,755,813,887`. Role 3 held the only such row, so the global max is unambiguously the seeded value |
| **STOP 2** — negative role-1/role-2 row (`RK-14`) | ✅ **YES** | `quantification_role_id = 1`, count `1` — the seeded `-5` |

**Both stop conditions fire on disqualifying input.** The queries discriminate; the Dev measurement's two clean results above are therefore evidence and not a green that could never have gone red.

**Cleanup:** both seeded `result_quantifications` rows (ids 91, 92), the supporting `results` row (33549) and the supporting `quantification_roles` row (id 1) were deleted. Post-delete state verified: `result_quantifications` 0 rows, `results` 0 rows, `quantification_roles` 1 row (`id=3, innovation_use`) — the scratch DB's prior baseline. Container left running.

**Cannot reach (`KZ-017`), as reported:**

1. The proof shows only that the two queries **can** fire on disqualifying input. It says nothing about Dev or Prod data — that is the separately recorded measurement above, and Prod remains unmeasured.
2. It does not exercise the queries against the future `DECIMAL(24,4)` column; the scratch column is still `bigint`, by instruction.
3. Single-session sequential insert/query/delete — no concurrent-write race is covered.

#### Reviewer gate — `T-01` — Reviewer: **PASS**

- **Reviewer:** `akili-reviewer` (T3, `opus`, read-only `Read`/`Grep`/`Glob`), effort `high`. **Attempt 1 — PASS on first attempt.** `author ≠ auditor` held on both axes: the measurement was Leader-produced, the falsifier Implementer-produced (T2 `sonnet`), and neither audited itself.
- **Verdict:** `STATUS: PASS`
- **Summary (verbatim):** *"Both specified queries were executed against the Dev target with outputs pasted in non-derived form, both stop conditions are evaluated soundly (STOP 1 by a strictly-stronger global bound, STOP 2 from a genuinely empty result set), acceptance item 4's row count and `ALGORITHM=COPY` implication are recorded for T-05, and the falsifier seeds exactly the two inputs `tasks.md:82` names and shows both conditions firing on scratch without contaminating the measurement's authority."*

**The four adjudications worth keeping** — each was a way this entry could have been a confident green, and each was checked rather than assumed:

| # | Question | Ruling |
| --- | --- | --- |
| 1 | Query 1 has **no role filter**, but STOP 1's threshold is **role-scoped**. Is the global-`MAX` → role-3 inference a `KZ-017` scope substitution? | **No — it is the inverse.** `KZ-017` fails a check *narrower* than its claim; this one is *wider*. `min_v = 0` **and** `max_v = 87654` bound every non-NULL row, so any subset including role 3 inherits the bound. The inference needs both figures and both are on the page, so a reader can verify rather than trust. The verdict stands on query 1 alone, independent of the optional context queries |
| 2 | Query 2's `GROUP BY` returns no row for a role with zero negatives — was a per-role zero inferred from a **missing group**? | **No.** Query 2 returned **no rows at all** over a predicate unfiltered by role, which covers roles 1 and 2 by containment. Corroborated a second time by `min_v = 0` |
| 3 | Do the two extra FK-supporting rows compromise the falsifier? | **No.** They live in `quantification_roles` and `results`; both queries read only `result_quantifications`, and `COUNT(*) = 2` proves no measured row was added. The synthetic role's *name* never enters the predicate — query 2 groups on the numeric `quantification_role_id` |
| 4 | Does either half borrow the other's authority (the `tasks.md` disqualifier: a scratch query passed off as a measurement)? | **No — and the two halves mutually corroborate the split.** The falsifier records the scratch baseline as `result_quantifications` **0 rows** with `quantification_roles` holding only `id=3`; a measurement showing 80 rows across roles 1, 2 and 3 therefore **structurally cannot** have come from the scratch schema. That discharges the disqualifier independently of the redacted host |

Also confirmed by the audit: the queries in the entry are the queries `tasks.md` T-01 and `NFR-MSD-002` specify (differing only by column aliases); the pasted figures reconcile internally (42 + 37 + 1 = 80 = `total`; `max_len 5` ↔ `87654`; `max_len 12` ↔ `549755813888` with `TRIM LEADING '-'` applied to `-5`); `DD-14`'s threshold arithmetic holds (`2^(53−14) − 1 = 549,755,813,887`, and the seeded `549,755,813,888 = 2^39` is exactly bound + 1); and declining to apply this spec's migration before the falsifier was correct rather than a shortcut, because rollout step 2 (`design.md:485-487`) runs the pre-flight *before* migration 1, so `bigint` is the column state the queries must discriminate on.

#### `ADVISORY` — recorded, never gating

Per `/akili-execute` §2.4 these findings are recorded here and **die here**: they do not count toward the rework ceiling, and *"Advisory Never Becomes A Task"* — none of them may mint a task in this spec or widen an existing one. Anything below that genuinely cannot wait is a **spec gap** for the user to rule on, not scope to absorb.

| Lens | Finding |
| --- | --- |
| **Reliability** | Query 1 can bound magnitude but **cannot attribute** an over-bound value to a role. Harmless here (global max under bound ⇒ role 3 under bound) but it **inverts at rollout**: if the Prod re-run returns a `MAX` above `549,755,813,887`, query 1 alone cannot separate a genuine `RK-4` halt from an over-bound role-1/2 row, and a role-scoped follow-up (`SELECT quantification_role_id, MAX(ABS(quantification_number)) … GROUP BY 1`) is needed before the halt/proceed ruling |
| **Risk** | *"the lock window is negligible at this size"* is true of the **copy phase only**. `ALGORITHM=COPY` also needs an exclusive **metadata lock**, whose acquisition time depends on concurrent long-running transactions, not on 80 rows. The row count should reach T-05/DevOps as *"copy time negligible; MDL wait independent of size"*, not as a blanket all-clear on a shared database |
| **Readability** | The stop-conditions and *"what this settles"* tables state their verdicts unscoped, with the Dev-only qualifier arriving in the block after them. Tables get quoted out of context |
| **Resilience** | `design.md` §17 still reads `U-2` *"Not measured — the live row count is unknown from the repo"* (`:617`) and `U-9` *"Unknown from the repo"* (`:626`). T-01's intended-files list correctly excludes `design.md`, and T-12's file list does not cover §17 either — so this now-answered pair is an **unowned doc debt**. Recorded as such; not folded into T-12, because that would be an advisory widening an approved task |
| **Resilience** | The falsifier restored the scratch schema by row deletion, which does **not** restore `AUTO_INCREMENT` counters or the `migrations` table. T-05/T-07/T-08 should run `npm run migration:test:bootstrap` rather than trust the container's current state |
| **Risk (process)** | Writing `PASS` into this file **disarms `akili-tasks-gate.sh` for T-02…T-12**, exactly as the note below warns. Mitigation adopted: every task's verdict carries an explicit `— Reviewer: PASS` header so a human keeps the per-task discrimination the hook has lost |
| **Observation** | The pasted `COLUMN_TYPE: "bigint"` has **no display width**, which in MySQL 8 generally indicates ≥ 8.0.19 — bearing on `OQ-D5` (still narrowed to 8.0.4 … 8.0.16) and on `T-06`'s version-portability claim. Free evidence, but an inference: confirm with `SELECT VERSION()` at the Dev/Prod re-run rather than acting on it |

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| Measurement executed inline | Leader | Two read-only `SELECT`s = a punctual verification per *Delegation Thresholds*; no source file touched |
| Falsifier **delegated** | `akili-implementer` (T2 `sonnet`), effort `high` | Multi-step environment work (container, FK-satisfying seed, cleanup) that would have polluted Leader context — and delegating kept the falsifier's author distinct from the measurement's |
| Skills assigned | **none** | `tasks.md` T-01 specifies *"none (DBA/DevOps coordination)"*; the work is SQL against a scratch container, so `nestjs-expert`/`tdd` would not have applied. No deviation from the task's list |
| Effort | `high` on both dispatches | A gate whose whole purpose is to discriminate; the review's job was to catch a green that could never have gone red |

#### Task closed

`T-01` is `[x]`. Both stop conditions were evaluated on live Dev data and **neither fired**; both were then **shown able to fire** on seeded input. **The change proceeds to `T-02`.**

The prior session left this task deliberately open, and its reasoning is preserved: the measurement alone was the Leader self-certifying its own work with the machine check absent, and the K-004 falsifier clause was undischarged. Both conditions are now met.

#### Historical note — why the previous session left this task open

The measurement run above was executed from the wrong working directory (`-management`), where the `akili-*` wrappers and `.claude/hooks/akili-tasks-gate.sh` are not loaded, and flipping the checkbox there would have been the Leader self-certifying its own measurement with the machine check absent — precisely the write `.agents/leader.md` names as *"the one claim in the pipeline no Reviewer audits."* The session was restarted from `alliance-research-indicators-main` for exactly that reason, and both owed items — the falsifier and the independent audit — are discharged above.

> **Note for whoever runs that gate — the hook is coarser than it looks.** `akili-tasks-gate.sh` greps `execution.md` for the literal string `PASS`; once *any* verdict exists in this file it stops discriminating between tasks. This entry therefore deliberately avoids writing that token as a verdict. Treat the hook as a guard against an empty log, not as per-task evidence checking.
