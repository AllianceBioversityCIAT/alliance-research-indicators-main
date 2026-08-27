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

---

### T-02 — Entity: `DECIMAL(24,4)` column + two-way null-safe transformer

- **Status:** ✅ **PASS on attempt 2** (`T-02` — Reviewer: **PASS**). Code complete and audited; acceptance items 1–3 formally **transferred to `T-07`** as owed scope — see the forward pointer below.
- **Date:** 2026-08-27
- **Implementer attempts:** 2 (`akili-implementer`, T2 `sonnet`, effort `xhigh` on both)
- **Requirements covered:** `R-MSD-003` (incl. scenario *An untouched measure row does not break the save*, `:256`, `:257`), `R-MSD-009`, `R-MSD-013`
- **Design references:** `DD-1`, `DD-2`, §5.3, §5.4, §5.5

#### Files changed

| File | Change |
| --- | --- |
| `server/.../result-quantifications/entities/result-quantification.entity.ts` | `quantification_number`: `bigint` → `decimal(24,4) NULL`; new exported `quantificationNumberTransformer`; TS field widened to `number \| null` |
| `server/.../result-innovation-use/result-innovation-use.service.ts` | the `:287-292` doc comment **only** (`K-24`) — no logic touched, confirmed by comment-only hunk |
| `server/.../result-quantifications/entities/result-quantification.entity.spec.ts` | **new** — 9 unit tests over the transformer |

#### The transformer

```ts
export const quantificationNumberTransformer: ValueTransformer = {
  to: (value?: number | null): number | null =>
    value === null || value === undefined ? null : value,
  from: (value?: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};
```

Both null guards are load-bearing rather than defensive, and this was verified against the **installed** TypeORM rather than from recollection: `MysqlDriver.js:466-470` applies `transformTo` **before** its own null check, and `:510-514` routes `null`/`undefined` straight **into** `transformFrom`. So both directions genuinely see `null`, and a naive `Number(v)` on either side would turn an absent measure into `0` — breaking `quantificationRowAbsent` (`innovation-use-details.component.ts:490`, which treats `0` as **present**).

#### Verification

| Check | Result |
| --- | --- |
| `npm test -- --silent` (server, **full** suite per `KZ-003`) | **354 suites / 2681 tests passed** — reported by the Implementer and **independently re-measured by the Leader** in a quiet tree after the worker finished (18.8 s, exit 0). Re-run green after attempt 2 |
| `npx eslint <changed files>` (the **bare** gate — `npm run lint` carries `--fix` and cannot fail, `K-001`) | clean, exit 0 |
| `npm run build` | `nest build` + `vite build`, exit 0 |

#### Falsifier mutations — **unit-tier**, and what each one actually reddens

`tasks.md` T-02 names three mutations. All three were run and observed red, then restored. **The scope caveat is part of the evidence, per `KZ-017`** — the task's named symptoms live *above* this seam, and a unit test over two exported functions can only reach one of them:

| Mutation | Observed | Does it exercise the symptom the task names? |
| --- | --- | --- |
| `from` coercion deleted (identity passthrough) | 4 tests red; round-trip got `"10.0000"` where `'10'` was expected | **Partly.** It reddens on the string that *would* break the key — but the named symptom, *"the untouched-row test must `400`"*, is an HTTP-tier effect this seam cannot produce. **Owed to `T-07`** |
| `to` null guard deleted | 3 tests red; `to(null)` → `0` | **Partly.** Named symptom is *"the composite key must change on resave"*, which requires the real `upsertByCompositeKeys`. **Owed to `T-07`** |
| `from` returns `0` for null | 3 tests red; `from(null)` → `0`, `from(undefined)` → `NaN` | **Yes — this one genuinely discriminates at this tier.** It is the `quantificationRowAbsent` reddening the task names |

Recorded because the alternative — *"all three falsifier mutations observed red"* — reads as the task's own gate having been met, when deleting either function reddens the suite as a call-time `TypeError` rather than for the reason the falsifier was written. Raised by the conformance Reviewer as a `KZ-017` FAIL and accepted.

#### Acceptance items — three of four are transferred, not discharged

**This task's disqualifier and the dependency graph are in tension, and the resolution is recorded rather than assumed.** `tasks.md` T-02 says *"Mocked-repo tests are allowed as fast feedback but may not close this task; T-07's fixture is the gate"* — yet `T-07` depends on `T-02` through `T-03`/`T-04`/`T-05`. Read literally, neither task can close first. **Leader ruling:** T-02 closes on the code, the doc-comment correction and honest unit-tier feedback; items 1–3 transfer to `T-07` as **owed scope via forward pointer** — the mechanism `/akili-execute` §2.2 defines for exactly this, and which only works if the later brief carries it.

| # | Item | State |
| --- | --- | --- |
| 1 | `null` round-trips as `null` in both directions, per direction | **unit-level only → `T-07`.** Asserted on the pure functions, not through a real driver |
| 2 | A read value resent verbatim does not `400`, from a **real read** (`:257`, `DD-19`, `K-012`) | **not reached → `T-07`.** No real read exists at this tier |
| 3 | `String(value)` composite key identical before/after for an unchanged row | **unit-level only → `T-07`.** The transformer's output stability was proven; `base-service.ts`'s actual key construction was not exercised |
| 4 | The `:287-288` doc comment no longer contradicts §5.4 | ✅ **discharged.** Independently verified: `ClarisaInnovationUseLevel.level` is `type: 'bigint'`; the threshold check it describes exists (`result-innovation-use.service.ts:193`); the corrected mechanism matches §5.4 word for word, confirmed at `mysql2/lib/parsers/text_parser.js:31-46` |

> **⚠️ `T-07` FORWARD POINTER — must be copied into `T-07`'s Implementer brief.** Acceptance items 1, 2 and 3 above are **owed scope inherited from `T-02`**, and item 2 carries the `DD-19` read-provenance clause: the value must come from a real read, never a literal. `T-02`'s spec file states in its own comments that it does **not** satisfy this. A pointer filed here is not carried by having been filed — the brief carries it or nobody does.

#### Attempt 1 — Reviewer verdicts (parallel lens mode)

Effort `xhigh` on a data-loss surface selected **parallel lens reviewers** per `/akili-execute` §2.3's 4R table: two `akili-reviewer` instances (T3 `opus`, read-only), same diff, different lenses. **They split, which is what the mode is for.**

**Lens A — spec conformance + correctness/reliability: `STATUS: FAIL`** (2 issues, both evidence-honesty, no code defect)

1. **Discovered Issue:** the new spec file asserted **twice** that its inputs came from a real read when they are hand-written literals — a comment reading *"this is the shape a real read produces, not a hand-written literal"* directly above `from('-12.7500')`, and a test **named** *"a value hydrated from a real read resends as the same number"* above `from('10.0000')`. Self-contradictory against the file's own header, and readable by a later task as `DD-19` already satisfied.
   **Violated Rule:** `requirements.md` `R-MSD-003` `:257` (*"IT MUST be exercised with a value that came from a real read, never with a hand-written literal … K-012"*); `design.md:519` (`DD-19`); root `CLAUDE.md` §4.3 `K-004`/`KZ-014` (*"may not be asserted — not in a code comment … two reached committed test descriptions before review caught them"*).
   **Remediation:** reword both, keep every assertion; no test logic changes.
2. **Discovered Issue:** the falsifier evidence was reported without the scope caveat that makes it interpretable — two of the three mutations redden as `TypeError`s, not for the named symptom.
   **Violated Rule:** root `CLAUDE.md` §4.3 `KZ-017`; the task's own *What disqualifies this evidence*.
   **Remediation:** label the mutation evidence unit-tier in `execution.md`, per falsifier. **Leader's write, not the Implementer's** — discharged in the table above.

Lens A also **confirmed the code**: `DD-1` correct; all four `DD-2` clauses honored in code and not only in prose (null→null both directions, `to` specified, no `decimalNumbers: true` anywhere in `src`, column transformer rather than a service-layer coercion, shape-identical to the mandated precedent at `bilateral.service.ts:682-686`); `to`'s pass-through correct against `base-service.ts:394-399` + `:446`; item 4 genuinely discharged.

**Lens B — resilience + risk (data loss, blast radius): `STATUS: PASS`**

The finding that mattered, and the reason this lens was run: **no reader bypasses the transformer.** 131 matches of `quantification_number` across `server/` inspected without truncation, plus `ResultQuantification|result_quantifications` over `src/**/*.ts`:

| Reader | Mechanism | Normalised |
| --- | --- | --- |
| `result-innovation-use.service.ts:471` | `findByResultIdAndRoles` → `mainRepo.find` | yes |
| `result-oicr.service.ts:306` | same | yes |
| `base-service.ts:358` `upsertByCompositeKeys` — **the data-loss surface** | `entityManager.find` | yes |
| `result-quantifications.service.ts:49` `upsertQuantificationsByRole` — **`RK-15`'s bypass** | `mainRepo.find` at `:49`, own key at `:61` | **yes** — it bypasses the base class's *validation*, not the column transformer |

**Zero** raw queries, query builders or `getRawMany()` touch this table in `src/**/*.ts`; a column transformer would not have covered them. `@OpenSearchProperty` is absent and `quantification` has zero occurrences under `domain/tools/open-search/`, so §3/`D-8`'s "not indexed" claim holds. Both `compositeKeys` arrays are literal, excluding a dynamically-assembled column name.

Two further results worth keeping:

- **Composite-key stability is structural, not range-dependent** — stronger than `design.md` argues. Both sides of `generateCompositeKey` derive from the **same IEEE-754 double**, and `Number::toString` emits the shortest round-tripping representation, so the keys are identical for *every* double the column can hold: `'2.5000'` → `'2.5'`, `'10.0000'` → `'10'`, negatives included. The repo's own `isEmpty` (`object.utils.ts:77`) is not lodash's, so `0` is **not** empty and still keys as `'0'`. Verified against `mysql2/lib/packets/packet.js:439`: with `supportBigNumbers` falsy a ≥14-digit `bigint` is decoded as `Number(s)` — *the same lossy operation* `from` performs, which is why `O-4`'s pre/post key symmetry actually holds and is now checkable from source.
- **The deploy ordering is safe in both directions.** `orm.config.ts:51` `synchronize: false`, so shipping the entity ahead of `T-05`'s migration cannot mutate the schema; and in that interim window the column is still `bigint`, so `from` receives a number and `Number(number)` is identity.

#### Attempt 2 — the reword

One file touched (`result-quantification.entity.spec.ts`), both flagged sites corrected, all assertions unchanged. A `KZ-005` sweep for other provenance claims reported `none` with the file re-read end to end, three sites considered and deliberately retained with stated reasons (the self-caveating header; a test name argued to describe input *shape*; a `read -> resave` phrase argued to name the round trip generically). **That sweep was sent back to the same Lens A Reviewer to judge** — an exemption claimed by argument rather than by clause is precisely `KZ-005` recurrence 6's failure of a correction *relocated* rather than *applied*, and the Leader is not the right party to accept its own worker's reasoning on it. Full suite green after the reword; `npx eslint` clean.

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| Skills | `nestjs-expert`, `tdd` | As `tasks.md` specifies. No deviation — TypeORM integration plus a logic contract is exactly where `tdd` earns its cost |
| Effort | `xhigh` both attempts | Small in LOC, subtle in failure modes. **Not bumped to `max` on the retry** despite the rework rule: the *Tier ↔ effort rule* forbids `max` on a cheaper tier, and escalating the Implementer to `opus` would have collapsed `author ≠ auditor` against the `opus` Reviewers. The remaining work was a fully specified two-site reword, where brief precision beats depth |
| Review mode | **Parallel lens** (2 reviewers) | Effort `xhigh` **and** a data-loss surface — both triggers in the 4R table |
| Full-suite re-measurement | Leader, after each worker reported | `CLAUDE.md` §4.3 concurrency rule: never measure beside a live worker. Both runs taken in the quiet window |

#### Reviewer gate — `T-02` — Reviewer: **PASS** (attempt 2)

Re-gated by **the same Lens A Reviewer that issued the FAIL** — resumed with its round-1 context intact, scope restricted to its own two findings. The code it had already passed was explicitly not re-audited.

- **Issue 1 — closed.** *"Fixed at the clause rather than around it."* Site 1 now states the opposite of what it did: the value is declared a hand-written literal, the tier is declared unable to obtain a real read, and the clause plus its owner are named. Site 2 drops the provenance claim; *"hydrated"* is accurate because the value did pass through `from`.
- **The `none` sweep answer holds, and was judged rather than accepted.** All three retained sites are exempt **on the clause's own terms**, not by argument: the header is self-caveating and bounded; `:23` names the input *class* that §5.4 establishes and now sits directly above the comment declaring the value a literal (**shape ≠ origin**, the distinction `:257` draws); `:57`'s *"read → resave"* names the `from`/`to` round trip in §5.2's own vocabulary, and the null-carries-no-shape-ambiguity reasoning is the **correct** reading of `K-012` — the hazard the clause exists for is *type* substitution, and a DB NULL reaches `transformFrom` as `null` before any type branch (`MysqlDriver.js:511-514`), so no fixture could supply a shape this literal misrepresents.
- **Why this is not `KZ-005` relocation** — *"the decisive evidence is directional: the new text adds the disclaimer the old text denied and hands the clause to its owner, rather than restating the claim in softer words."*
- **Issue 2 — discharged.** The unit-tier labelling recorded above is the wording the Reviewer specified, with nothing missing.
- **Bonus verification the Reviewer volunteered:** it resolved the `quantificationRowAbsent` anchor rather than trusting it, and confirmed the rationale is correct **in direction, not inverted** — `innovation-use-details.component.ts:490-494` computes `numberAbsent` from `undefined || null` under its own comment *"`0` is a present number"*, and `buildPayload():433` filters on it. So a transformer returning `0` for a DB null really would make an absent row stop being absent.

**Verdict summary (verbatim):** *"Both round-1 findings are closed — the two provenance claims now state their own limits and name `T-07` as owner of the `:257`/`DD-19` clause, the retained three sites are genuinely exempt under the clause (shape-vs-origin, and `null`'s single type), and the `quantificationRowAbsent` anchor resolves to code whose logic matches the claim."*

#### `ADVISORY` ledger — recorded, never gating, and none of them widens a task

Per `/akili-execute` §2.4 these die here. Anything that genuinely cannot wait is a **spec gap** for the user to rule on, not scope to absorb.

**Reachable today — flagged for the user, remedy owned elsewhere:**

| Finding | Detail |
| --- | --- |
| **`T-03`'s default rule has no magnitude bound → a reachable `500`** | Lens B **constructed the payload**: `PATCH /api/v1/result-oicr/:code` with `quantification_number: 100000000000000000000` passes `Number.isInteger`, so `tasks.md:123`'s *"non-negative integer"* default rule accepts it; MySQL then raises `ER_WARN_DATA_OUT_OF_RANGE`, and `GlobalExceptions` has no `QueryFailedError` branch → **`500`**. **Pre-existing class, not a regression from `T-02`** (today's `bigint` `500`s above ~9.2e18; the new threshold is *higher*). The remedy — bounding the *default* entry as well as role 3 — belongs to `T-03`, but is **not in `T-03`'s approved scope**. Escalated to the user as a candidate spec gap; **not** absorbed |

**Not reachable today, each with its load-bearing guard named:**

| Lens | Finding |
| --- | --- |
| Risk | **`@ApiProperty()` emits `Number` only by accident of two settings** — `tsconfig.json:15` `strictNullChecks: false` (which makes the metadata serializer elide `null` from the union) and **no** `@nestjs/swagger` CLI plugin in `nest-cli.json`. A one-line change to either file turns `design:type` into `Object` and silently degrades the documented response to `type: object`. `@ApiProperty({ type: Number, nullable: true })` would decouple the contract from the flag. Corollary: the `number \| null` annotation buys no compile-time null discipline here — it is documentation |
| Risk | **`DECIMAL(24,4)` accepts ~8 orders of magnitude more than the double-safe region; the column's own limits are not the safety property.** Two loss regions: `\|v\| > 2^39` (ulp > 1e-4, so an untouched resave can write back a different 4-decimal grid point) is held shut by **`DD-14`'s bound, enforced in `T-04`** — the bound *is* exactly `2^39 − 1`; `\|v\| > 2^53` (one-unit integer drift, `O-4`) is held by **`T-03`'s integrality rule** plus T-01's measured live max of 87,654. **Unreachable given other guards, not safe** — a later task widening a bound, allowing decimals on roles 1/2, or raising the scale past 6 reopens them, and the column would accept the value silently |
| Reliability | `O-4`'s `> 2^53` case is *"load-bearing and **undocumented**"* per `design.md` §17, and the new entity TSDoc is the only place a maintainer would ever meet it. Two sentences naming `2^39` and `2^53` as the fidelity ceilings would close a gap the design itself flags |
| Resilience | **`maxFractionDigits: 0` on the OICR card (`DD-12`) is a row-churn mechanism, not only a display change.** If a role-1/2 row ever held a fraction, PrimeNG's write-back would resend the rounded integer, the key would miss, and the row would be deactivated with a duplicate inserted — silently, on the path with no validation. No reaching payload could be constructed (the historical `bigint` enforced integrality). Worth naming in `T-07`'s OICR fixture beside the `L-08` NULL churn it already expects |
| Risk | **The most load-bearing code in this spec sits in a file class excluded from coverage** — the child guide excludes `*.entity.ts`, so deleting this spec file later would show no coverage delta. `T-07`'s fixture is the real gate; do not read a green coverage report as protecting this function |
| Readability | `from`'s parameter is annotated `string \| null`, but during the mandated code-before-migration window the column is still `bigint` and the driver delivers a **number**. Behaviour is correct in both windows; `string \| number \| null` would say so |
| Readability | The round-trip test calls `String(value)` *"the composite key basis"*, which is loose — `base-service.ts:363-375` routes each part through the repo's own `isEmpty` **before** `String(value)`, so a `null` part becomes `''`, not `"null"`. The invariant that matters survives (`isEmpty(0)` is `false`, so `0` still keys as `'0'`) |
| Readability | Declaration form differs from the repo's other seven `decimal` columns, which all use the positional `@Column('decimal', {...})` form. No spec mandates a form; the object form matches this file's own style **and** is findable by the `type: 'decimal'` grep whose blind spot §13 recorded as a `KZ-017` failure in this spec's own authoring |
| Readability | The `describe` at `:14` cites `R-MSD-003 AC.7` / `R-MSD-013`, neither closed at this tier. Reads as traceability, and the header two lines above scopes the file — noted only as the line a future reader is most likely to over-read |
| DX | The new spec file appears in neither `tasks.md` T-02's *Files touched (intended)* nor `design.md` §2.1, which claims to list *"every new file"* and was corrected in round 1 for exactly that omission (`K-17`). Additive, no behavioural risk |
| Readability | `QuantificationData.quantification_number` (`result-quantifications.service.ts:9`) still types `number`. Inert under `strictNullChecks: false`, and the method has no production caller |
| Resilience | `NaN` is unreachable and recorded only because the guard is elsewhere: the column is `DECIMAL` so a real read cannot return a non-numeric string, and JSON has no `NaN` literal. The rejection that would matter if a non-HTTP writer ever appeared is `DD-17`'s, in `T-04` |

---

### T-03 — `base-service.ts` optional `dataRole` + `createCustomValidation` override with the per-role rule map

- **Status:** ✅ **PASS on attempt 3** (`T-03` — Reviewer: **PASS**). Reached the rework ceiling; all three attempts recorded below.
- **Date:** 2026-08-27
- **Implementer attempts:** 3 (`akili-implementer`, T2 `sonnet`, effort `xhigh` on all three)
- **Reviewer:** one `akili-reviewer` (T3 `opus`, read-only), resumed across all three attempts so its findings were judged by the party that raised them
- **Requirements covered:** `R-MSD-011` (all ACs, scenario *The API stops silently rounding*, `:495`), `R-MSD-007`
- **Design references:** `DD-13` (v4), `DD-14`, `DD-8`, `RK-13`, `RK-14`, `RK-15`, `U-12`

#### Files changed

| File | Change |
| --- | --- |
| `server/.../shared/global-dto/base-service.ts` | **the spec's only shared-file edit.** `createCustomValidation` gains optional `dataRole?: string \| number`, forwarded at the two existing call sites — `:134` in `create()`, `:347` in `upsertByCompositeKeys()` (was `:345` pre-edit; the signature insert shifted the file by 2) |
| `server/.../result-quantifications/result-quantifications.service.ts` | the override + per-role rule map |
| `server/.../result-quantifications/result-quantifications.service.spec.ts` | the rule map's coverage — `base-service.ts` has no spec file, so it cannot come from one |

#### Safety premise — re-verified inline by the Leader before spawning

`tasks.md` T-03 requires re-confirming the additivity argument before editing. Run at dispatch time:

```
src/domain/shared/global-dto/base-service.ts:134:    await this.createCustomValidation(dataToSaveArray);
src/domain/shared/global-dto/base-service.ts:278:  protected async createCustomValidation(
src/domain/shared/global-dto/base-service.ts:345:    await this.createCustomValidation(dataToSaveArray);
=== TOTAL: 3 matches ===
```

Exactly three matches, **no override anywhere in the tree** — so no existing caller's behaviour could change. Had an override appeared since the spec was written, the task's safety argument would have been void and the spawn would have been wasted.

#### Attempt 1 — `STATUS: FAIL`, and how the defect was found

The structure was correct and remains shipped: the optional parameter, the forwarding, the override's placement, the null-skip **before** the role branch, keying on the parameter, the `typeof`/`Number.isFinite` guards, the magnitude gate, and the `BadRequestException` messages.

**One predicate was wrong.** The scale check shipped as `!Number.isInteger(value * 10000)`.

**The Leader found it by execution, not by reading.** The code reads as correct and reviews as correct; `2.55`, `-12.75` and `0.0001` all pass. A one-command `node` probe over the value space:

```
1.005 * 10000 = 10049.999999999998     -> REJECTED (3 decimals)
0.07  * 10000 = 700.0000000000001      -> REJECTED (2 decimals)
2.55  * 10000 = 25500                  -> accepted (why the Implementer's canary passed)
```

Exhaustive over every 4-decimal value in `[0, 20]`: **25,477 of 200,001 falsely rejected — 12.74%.** `0.0003` received `400 quantification_number must have at most 4 decimal places`. One in eight legal values rejected, and they are precisely the values this spec exists to enable.

The Implementer had chosen multiplication **specifically** to dodge the two traps `DD-17` names (`toFixed`, exponential `toString`) and landed in a third the spec never names.

**The Reviewer confirmed it independently rather than accepting the probe** — hand-deriving that the double nearest `0.07` is `0.070000000000000006661…`, whose exact product with `10⁴` sits `6.66e-14` from `700`, beyond the half-ulp `5.68e-14`, so `fl` lands on `700.0000000000001`. It also showed `2.55` goes the other way by the same arithmetic, which is why the canary passed.

**It corrected the Leader's framing of the violation.** The Leader had assumed `DD-17` prescribed a mechanism that was disregarded. `DD-17` is **not** among T-03's design references (`tasks.md:116`) — it is T-04's. `DD-13` states only the *rule*. So this is an **outcome** violation of DD-13, not a deviation from a prescribed mechanism. Recorded because the distinction changes what the remediation owes.

**Reviewer's second issue: the tests could not have caught it.** The only role-3 acceptance value was `-12.75` = `-51/4` — dyadic, exactly representable, one of the ~87% that survive by luck. *"The suite is green over a validator that refuses 12.74% of the legal grid."* The mandated falsifier (revert the `:347` forwarding) reddened correctly, so the seam was proven — but **no test measured the rule's domain**.

Both issues also cleared, in the same pass: the null-skip is correct for every entry and correctly placed before the role branch; the parameter-vs-payload keying is clean on **both** write paths and fail-closed (`result-oicr.service.ts:234-246` hardcodes roles 1/2, `result-innovation-use.service.ts:251` hardcodes 3, and `base-service.ts:396-418` cannot persist a payload `quantification_role_id` at all); `typeof value !== 'number'` is **reachable and correct**, since the OICR DTO is entity-typed with no `ValidationPipe`; the messages map to `400` with the text verbatim in `errors` (`global.exception.ts:22,29`).

#### Attempt 2 — predicate and tests **DISCHARGED**; `STATUS: FAIL` on two false comments

The Reviewer's own remediation was adopted, and **the Leader verified it exhaustively before spending the attempt** rather than forwarding an unverified suggestion:

```
Math.round(v*10000)/10000 === v
EXHAUSTIVE 4-dec grid [0,20]: 200001 tested, falsely rejected: 0
same, negative:              0
ACCEPTS: 0.07, 1.005, 0.0003, 2.55, 0.0001, -12.75, ±549755813887, 0, 10
REJECTS: 1.23456, 0.00005, 1e-7, -1e-7, 0.123456789
```

Table-driven cases were added over the real inherited `upsertByCompositeKeys`. **Falsifier A** — restore the old predicate — reddened on exactly the three non-dyadic canaries:

```
✕ accepts role-3 value 0.07 on the 4-decimal grid despite binary floating-point error
✕ accepts role-3 value 1.005 …
✕ accepts role-3 value 0.0003 …
Tests: 3 failed, 23 passed, 26 total
```

The Reviewer's assessment of that evidence is the reason the round counts: *"`3 failed / 26` matches exactly the three non-dyadic canaries, and Falsifier B's `8 failed / 26` is exactly `1 + 7` role-3 acceptance cases … the two falsifiers cover the two independent failure modes — wrong predicate and missing forwarding — and neither can pass for the other's reason."*

The Implementer also ran **`npx tsc --noEmit`** unprompted, covering the spec file that `tsconfig.build.json` excludes — the `K-004` gate gap named in the brief. The Reviewer noted that command *has been observed failing in this very spec*: it produced attempt 1's TS2416.

**But attempt 2 added two comments and both asserted false arithmetic** — the same failure as attempt 1 wearing different clothes: a claim stated without being computed.

#### Attempt 3 — the comment repairs, at the ceiling

Three edits, no code and no test touched:

1. Deleted the backwards vacuity clause. It had claimed DD-14's bound *"already rejects everything past 2^39, well below where this would matter"*; in fact `2⁵²/10⁴ = 450,359,962,737.05` sits **below** the bound `549,755,813,887`, so the vacuous region begins **inside** the accepted range — a ~99.4 billion window. Verified by the Leader before dispatch.
2. Corrected *"4 of these 7 … 0.07, 1.005, 0.0003, 0.0001"* to **3 of 7**, with `2.55`, `0.0001` and `±549,755,813,887` named as **controls**. `0.0001 * 10000` is exactly `1` — and the claim was already contradicted by the Implementer's own Falsifier A output (`Tests: 3 failed`) sitting in the same report.
3. Scoped `~12.74% of the legal 4-decimal grid` to `12.74% of the 4-decimal grid in [0,20], the region measured` (`KZ-005`: one home per measured figure).

**The mandated `KZ-005` sweep found a defect neither the Leader nor the Reviewer had flagged**, and the Implementer **stopped to ask** rather than exceed its three authorized edits: the test comment cited `base-service.ts:134/:345`, but the second forwarding line is `:347`. The Leader verified and authorized the single fix **within the same attempt** — the worker was answering a bound the Leader had set, not opening a fourth cycle.

The sweep also **verified rather than assumed** `service.ts:17-20`'s *"3,616 collisions per 20,000 samples"* against `design.md` DD-14 `:514` / `U-10` `:621` (exact match), and hand-checked that `549,755,813,887 × 10⁴ = 5,497,558,138,870,000 < 2⁵³` — **without writing that number into the file.**

#### Two Leader errors, recorded because the log is worthless if it only records the workers'

**1. The Leader "corrected" the Reviewer on the `ulp` binade, and was wrong.** The Implementer omitted the Reviewer's suggested `ulp = 2⁻¹⁴ ≈ 6.1e-5` figure on the grounds that it was not in the Leader's confirmed set. The Leader then told both worker and user that the figure did not verify, citing `2^(39−52) = 2⁻¹³` for the binade `[2³⁹, 2⁴⁰)`. **That binade is unreachable at this check** — `Math.abs(value) > 549_755_813_887` rejects everything in it first. The bound is `2³⁹ − 1`, which lies in `[2³⁸, 2³⁹)` where spacing is `2^(38−52) = 2⁻¹⁴`. The Reviewer's original figure was right; the Leader's correction was off by one binade. Cross-checked from the design: §6.2 `:330` states the condition as `ulp(v) ≤ 10^-scale`, and DD-14's `⌈log₂(10⁴)⌉ = 14` subtraction exists precisely to land the bound in the `2⁻¹⁴` binade.
**Outcome unaffected** — no figure was inserted either way, so no false claim reached the file. The Implementer's *process* (never assert an unconfirmed number) produced the right result from a wrong premise.

**2. The Leader's 3-million-sample probe was structurally incapable of failing, and was reported to the user as closing an advisory.** The Reviewer had flagged the band `[2³⁸, 2⁵²/10⁴)` as analytically unexcluded. The Leader sampled it, got **0 false rejections**, and reported the advisory closed by measurement. The Reviewer refused that: *"3,000,000 uniform samples should have hit it ~170,000 times and reported zero, so the harness did not measure what it was believed to measure … an unmeasured region logged as measured is worse than the open advisory it replaced."*

It was right. The probe computed `canon = Math.round(v*10000)/10000` and then tested `ok(canon)` — the **idempotence of the rounding map**, not whether grid values survive it:

```
ok(v)     = false   <- the real question
ok(canon) = true    <- what was actually tested (idempotent, so ~always true)
```

A correct probe, built from the intended scaled integer (`v = n/10000`) instead:

```
band [2^38, 2^52/1e4), 4-dec values built from scaled integers
sampled: 2000000   FALSELY REJECTED: 179520 ( 8.98 % )
examples: 378316057649.8024, 280331090806.8436, 295254301987.1019, 426975499164.0145
```

**This is `KZ-001` and `K-004` committed by the Leader** — the lesson it had cited at workers three times in this same run. The invalid result is **retired, not recorded as evidence**; the 8.98% figure above replaces it, and the band advisory is **open and ticketed**, not closed.

#### `ADVISORY` — one item is reachable and must be TICKETED, not filed

| Lens | Finding |
| --- | --- |
| **RISK — reachable false rejection** | **Input, verified: `quantification_number: 274877906944.0405`** — four decimals, inside DD-14's bound — returns `400 … must have at most 4 decimal places`. Confirmed by execution: `v*10000 = 2748779069440405.5` → `Math.round` → `…406` → round-trip `274877906944.0406 ≠ v`. The Reviewer derived the region exactly — `[274,877,906,944, 450,359,962,737)`, a residue class mod 1024 — and the Leader's corrected probe measures **8.98%** of that band's grid. Below `2³⁸` the scaled error caps at `0.153` and cannot reach the `0.25` threshold; above `450,359,962,737` the product's spacing becomes `1` and `Math.round` always recovers. **Reachability: reachable, input given.** This *upgrades* the attempt-2 advisory that said no input could be constructed |
| **Why this is not a FAIL** | The Reviewer's reasoning, adopted: a FAIL at the ceiling restores `Number.isInteger(value * 10000)`, which falsely rejects `0.07`, `1.005` and **12.74% of the grid at every magnitude**. The shipped predicate is strictly better than what a rollback would reinstate, so failing would make the requirement *less* satisfied. The exposure traded away is a 4-decimal quantity between 275 and 450 billion |
| **PROCESS** | If the band is re-measured, sweep by residue class mod 1024 rather than uniformly, and **observe the check going red on `274877906944.0405` first** (`K-004`) |
| **READABILITY / FP-50** | `result-quantifications.service.spec.ts:130` cites `base-service.ts:134/:347` by line, and that file is inside this spec's change surface — which is exactly how the citation rotted from `:345` in the first place. The child guide §9 calls for an anchor here: *"the two `createCustomValidation(dataToSaveArray, dataRole)` call sites, in `create()` and `upsertByCompositeKeys()`"* cannot rot |
| **RISK — undeclared tightening axis** | `PATCH /api/v1/result-oicr/:code` with `quantification_number: "5"` (a **string**) now `400`s where MySQL previously stored `5`, because the OICR DTO is entity-typed with no `ValidationPipe`. Consistent with DD-13's rule, so not a violation — but `RK-12` / `NFR-MSD-005`'s comms scope names only *"a negative or fractional quantification number"*. **The rollout note owes a type axis** (for `T-12`'s comms record) |
| **RELIABILITY** | No row locator in the `400`. OICR resends every row per save, so a reporter with five measures gets one message and no indication which row failed |
| **Settled, no longer open** | The default entry's missing magnitude bound (the `100000000000000000000` → `500` path raised against T-02) is **outside T-03's scope as specified** *and not a regression* — that value exceeded signed `bigint` too, producing the same `ER_WARN_DATA_OUT_OF_RANGE` → `500` before this spec. No user ruling needed |

> **⚠️ `T-04` FORWARD POINTER — must be copied into `T-04`'s Implementer brief.** T-04 implements the **same** `≤ 4 decimals` rule on the Innovation Use DTO. The predicate shipped in T-03 falsely rejects `274877906944.0405` and ~8.98% of the band `[274,877,906,944, 450,359,962,737)`. **T-04 must not reproduce this predicate.** Derive the scale from the value's decimal string after the finite and magnitude gates (DD-17 step ④'s intent), or compare `Math.abs(value * 10000 - Math.round(value * 10000)) < 1e-3`. Add `274877906944.0405` to T-04's accept table — it is the input that reddens today. **Whether to then unify both tiers on one predicate is a user decision, not T-04's to take:** doing so edits T-03's shipped file, which is scope beyond T-04's approved task.

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| Skills | `nestjs-expert`, `tdd`, `error-handling-patterns`; **`systematic-debugging` added** on attempts 2–3 | The task's list for attempt 1; debugging added once the failure was a measured defect rather than a build |
| Effort | `xhigh` on all three attempts | The rework rule says bump, but the *Tier ↔ effort rule* forbids `max` on a cheaper tier, and escalating the Implementer to `opus` would collapse `author ≠ auditor` against the `opus` Reviewer. Attempts 2–3 had fully specified remediations, where brief precision beats depth |
| Review mode | **Single merged-lens Reviewer, not the parallel lenses the 4R table prescribes at `xhigh`** | **Deviation, recorded.** The Leader had already measured the headline defect before review, so parallel breadth would have spent a lens auditing code certain to change. The security/bypass questions were merged into the single brief and cleared; the Reviewer was asked at the re-gate whether that left anything unaudited and answered: *"Security lens: nothing left unaudited … the attempt-2 delta only widens acceptance on role 3 inside DD-14's bound"* |
| Reviewer continuity | Same Reviewer resumed across all three attempts | Its findings were judged by the party that raised them — and at attempt 3 it ruled on **its own** suggested figure rather than the Leader overriding it |
| Suite re-measured by Leader | After every attempt | `354/2681` → `354/2692` → `354/2702`, each in a quiet tree after the worker reported. **One run reported exit 1 and was not a test failure** — the Leader's shell cwd had drifted, so `cd` failed and Jest never ran. Caught by reading the raw output before counting it (`K-014`); an exit code alone would have read as "T-03 broke the suite" |

---

### T-04 — Innovation Use DTO: custom scale + range constraint, with the mandated evaluation order

- **Status:** ✅ **PASS on attempt 3** (`T-04` — Reviewer: **PASS**, both lenses). Reached the rework ceiling; the production constraint was correct on **attempt 1** and never changed.
- **Date:** 2026-08-27
- **Implementer attempts:** 3 (`akili-implementer`, T2 `sonnet`, effort `xhigh` throughout)
- **Reviewers:** **two** `akili-reviewer` lenses (T3 `opus`, read-only), both resumed across all three attempts — Lens A conformance/correctness, Lens B regression-risk/resilience
- **Requirements covered:** `R-MSD-003` (scenario *The relaxation does not leak to the siblings*, `:265`, `:266`), `R-MSD-007`
- **Design references:** `DD-8`, `DD-17`, `DD-14`, §6.2, `DC-15`

#### Files changed

| File | Change |
| --- | --- |
| `server/.../result-innovation-use/dto/create-result-innovation-use.dto.ts` | `@IsInt()`/`@Min(0)` removed from `quantification_number` **only**; new `IsScaleBoundedSignedDecimalConstraint` + `IsScaleBoundedSignedDecimal()` decorator, following `IsActorCountModeExclusiveConstraint` in the same file |
| `server/.../result-innovation-use/dto/create-result-innovation-use.dto.spec.ts` | **new** — 24 tests (7 accepts, 8 reject rows, `NaN`, non-number, leak, 6 siblings) |
| `server/.../result-innovation-use/result-innovation-use.controller.spec.ts` | **not in the task's intended file list.** Two pre-existing tests encoded the pre-`DD-8` rule and broke; rewritten + one rejection case added. **Justified and upheld** — see below |

#### The constraint — the four mandated steps, in order

```ts
validate(value: unknown): boolean {
  if (typeof value !== 'number') return false;                        // ①
  if (!Number.isFinite(value)) return false;                          // ②
  if (value < QUANTIFICATION_NUMBER_MIN ||
      value > QUANTIFICATION_NUMBER_MAX) return false;                // ③ before any string conversion
  const stringValue = String(value);                                  // ④
  if (stringValue.includes('e') || stringValue.includes('E')) return false;
  const dotIndex = stringValue.indexOf('.');
  return dotIndex === -1 ||
    stringValue.length - dotIndex - 1 <= QUANTIFICATION_NUMBER_MAX_DECIMALS;
}
```

**Step ④'s mechanism was verified by the Leader before the task was dispatched**, precisely because T-03 had just lost three attempts to an unverified predicate. `[0,20]` grid: 200,001 tested, **0** falsely rejected; T-03's failing band: 500,000 tested, **0** falsely rejected. The exponential branch is sound rather than convenient — JS stringifies exponentially only for `|v| ≥ 1e21` or `|v| < 1e-6`, and step ③ has already excluded `≥ 1e21` (the bound is `5.49e11`), so a surviving `'e'` means the value is tiny, which always means more than 4 decimals. Thresholds checked, not recalled: `String(1e20)` is plain digits, `String(1e21)` is `"1e+21"`, `String(1e-6)` is `"0.000001"`, `String(9.9e-7)` is `"9.9e-7"`.

**T-04 did not reproduce T-03's defect.** `274877906944.0405` — the input that reddens T-03's shipped predicate — is in this tier's accept table, which is the single value proving the two predicates are not the same code.

#### Verification

| Check | Result |
| --- | --- |
| `npm test -- --silent` (full) | `355 suites / 2727 tests` — **Leader re-measured independently after every attempt** |
| `npx eslint <changed files>` (bare gate, `K-001`) | exit 0 |
| `npm run build` | exit 0 |
| **`npx tsc --noEmit`** | exit 0 — the **load-bearing** gate for this diff, since `tsconfig.build.json` excludes `**/*spec.ts` so `npm run build` type-checks no spec file (`K-004`). Run unprompted by the Implementer |

#### ⚠️ STANDING LIMIT on every "full suite green" claim in this spec (`KZ-017`, Lens B)

**`npm test` has `rootDir: "src"`. It never runs `test/jest-fixtures.json` or `test/jest-e2e.json`.** The four `innovation-use/*.fixture-spec.ts` files that touch `quantification_number` were therefore **not executed by any of T-04's three attempts** — nor by T-02's or T-03's. Lens B read them and found they call `harness.service.update(...)` directly, bypassing the `ValidationPipe`, so T-04's relaxation cannot affect them — **but that is a read, not a run.** `T-07` owns the executed proof. This limit applies to every green-suite claim already recorded in this log.

#### Acceptance criteria

| # | Item | State |
| --- | --- | --- |
| 1 | `1e-7`, `-1e-7`, `1e21` each a clean `400`, never a `500` | ✅ asserted via `rejects.toBeInstanceOf(BadRequestException)` **plus** `getStatus() === 400` — the disqualifier demands the status, not `toThrow()` |
| 2 | `2.55` accepted, `toFixed` trap does not fire | ✅ **discharged by dominating values, not by the named literal.** `2.55` appears nowhere; the property is pinned by `3.3` (controller spec) and `274877906944.0405` (DTO spec), both non-dyadic and both rejected by a `toFixed(20)` mechanism. Lens A declined to gate and asked that the discharging values be named here so the checkbox has a traceable basis |
| 3 | Sibling `400` names `actors_count`, not `quantification_number` | ✅ explicit test; `defaultMessage` interpolates `args.property`, and only *failing* constraints reach the response |
| 4 | All **six** siblings still reject `2.5`, **per field** | ✅ `it.each` over all six in the DTO spec. Lens B tabulated each one intact |
| 5 | The four steps asserted **in order** | ✅ — but only after the spec text was **measured to be wrong**; see below |

#### Criterion 5 — the spec text is wrong on three counts, all now measured

`tasks.md:156-158` mandates: *"swap steps ③ and ④ and send `1e21` — the response must become a `500` and the test must redden."* The Implementer ran it and reported honestly that **it does not redden.** Its conclusion — that the mechanism is *"robust to a pure reorder"* — was wrong, and Lens A found why:

1. **`1e21` is double-guarded**, so it cannot discriminate ③ from ④: step ④'s `'e'` check rejects it just as ③ does. Every value in `(MAX, 1e21)` stringifies as **plain digits with no `.`**, so a swapped ④ returns `true` and short-circuits ③.
2. **The failure mode is a silent false accept (`2xx`), not a `500`.** Leader-verified with a faithful swap (block ④ moved verbatim, retaining its `return`, which makes ③ dead code):

```
value                shipped  swapped
1e+21                false    false     <- the mandated input cannot detect it
990000000000000000000 false    true     <- silent false ACCEPT
549755813888         false    true      <- silent false ACCEPT (MAX+1)
-549755813888        false    true      <- silent false ACCEPT
```

3. **The mandated mutation has no executable form.** Moving ④ above ③ makes ③ unreachable, and TypeScript drops step ①'s `typeof` narrowing in dead code, so `value` reverts to `unknown` → **`TS2365` twice**, `Tests: 0 total`. *"③ is unreachable" and "③ is deleted" are the same runtime predicate, and only the latter compiles.*

**And the consequence was worse than a defective criterion: two of the four steps were pinned by nothing.** Deleting the whole step ③ block left all 21 tests green; deleting step ② left them green while `NaN` became an accepted quantification (`NaN < MIN` and `NaN > MAX` are both `false`; `String(NaN)` has no `e` and no `.`).

**Closed by three new reject rows and two observed reds:**

```
step ③ DELETED (the mutation tsc accepts):
  ● rejects 9.9e20 …  Resolved to value: {"quantification_number": 990000000000000000000}
  ● rejects 549755813888 (DD-14s max + 1) …
  Tests: 2 failed, 22 passed, 24 total        <- 1e21 among the 22, proving the mandated input is blind

step ② DELETED:
  ● rejects NaN as a 400 (pins step ② against its own deletion)
  Tests: 1 failed, 23 passed, 24 total
```

**The Leader refused the compile-time `TS2365` as sufficient evidence** — `Tests: 0 total` measured nothing, and a suite that never executed cannot certify that any row discriminates. Lens A confirmed that refusal was correct and ruled the `TS2365` worth recording as a **second, incidental guard**: it exists only because the implementation declares `validate(value: unknown)` while `ValidatorConstraintInterface` declares that parameter `any` — annotating it `any` or `number`, a change no reviewer would question, silently removes the compiler guard. It also catches only *this* mutation, not deletion, a changed constant, or `>` vs `>=`. **It cannot substitute for the three rows.**

> **📌 `tasks.md:156-158` is factually wrong and should be corrected when the spec text is next touched** (not done here — amending the approved task at the ceiling is out of scope): the swap's failure mode is a silent false accept, `1e21` cannot detect it, and the literal falsifier is unrunnable in TypeScript. Its only executable equivalent is deleting step ③.

#### The file-scope excursion — upheld, with a precedent the Implementer did not claim

Two pre-existing controller-spec tests asserted that `-1` and `3.3` are rejected. `DD-8` (*"this field only"*), `R-MSD-003` AC.1 (`-1500` accepted), AC.2 (`2.5` accepted) and `:265` (*"it must NOT name `quantification_number` — that value is now valid"*) make both legal, so the tests encoded a rule the spec explicitly removes. **Not tests bent to fit code.**

Lens B's corroboration is the part worth keeping: **the test counts reconcile to the unit.** T-03 closed at `354/2702`; the new DTO spec holds exactly 21 tests (later 24) and the controller spec went 2 → 3, so `354 + 1 = 355` and `2702 + 21 + 1 = 2724` (→ `2727` with the three new rows). A silent deletion anywhere in `src` would have broken that arithmetic. It also stated the limit: this cannot detect an equal-count swap.

It further found the in-spec precedent nobody had cited — **`T-10`'s own text blesses the analogue**: *"it deliberately turns two currently-green specs red … Updating them is in scope and is the visible proof the default moved."* *Files touched (intended)* is a planning estimate, not a prohibition.

Blast radius: **no other consumer or test in the tree** asserts rejection of a negative/fractional `quantification_number` at this DTO; `UpdateResultInnovationUseDto` inherits the constraint and has zero references; no Swagger snapshot test exists.

#### Three attempts, and all three FAILs were prose

**This task's production `validate()` was correct on attempt 1 and never changed.** Both lenses confirmed the constraint, the step order, the exponential branch, the bound symmetry (`min = −max`, mandated by `DD-14`/§6.2), `@IsOptional()`'s null handling (verified from `class-validator` source: `CONDITIONAL_VALIDATION` short-circuits **all** validators, matching T-02's `null → null` and T-03's explicit `continue`), and `defaultMessage`.

| Attempt | FAIL cause |
| --- | --- |
| 1 | Lens A: steps ② and ③ pinned by nothing; the "no `KZ-017` gap" declaration false (the field passes **two** validators on this endpoint). Lens B: a comment claim false *twice over* |
| 2 | Lens B, then Lens A: the repair for attempt 1's false comment **introduced a new inverted order claim** in the same file about the same two steps |
| 3 | — PASS |

**The classification was contested and resolved deliberately, not by whoever reviewed what.** Lens B first filed its comment finding as `ADVISORY`; asked whether that was consistent with T-03 having been FAILed twice for the identical class, it **upgraded to FAIL**: *"grading mine down would make the standard reviewer-dependent, which is exactly the failure you named."* Lens A then filed the attempt-2 inversion as `ADVISORY` and, put the same question, also upgraded — withdrawing its own classification with *"my declination was a cost argument … not a standards argument, and a §4.3 violation was never eligible for the ADVISORY block under my own contract. I misfiled it."*

**Lens A also corrected the Leader's own brief mid-flight.** The Leader wrote that under a swap *"step ④ would still reject it"* — a **counterfactual**, which is exactly the defect being repaired. Left uncorrected it would have produced a third inverted claim about the same input. The correction was relayed to the in-flight worker rather than allowed to land.

**Lens A's second correction changed the fix:** the offending text is not a comment but the `it.each` **label**, which Jest prints as the test's description — the artifact root `CLAUDE.md` §4.3 names explicitly (*"two reached committed test descriptions before review caught them"*). So the label was shortened, the reasoning moved into a comment, the counterfactual marked as one (`WOULD ... if ③ were absent`), and the measured evidence cited.

**Running total for this spec's execution: six false prose claims, five gated as FAILs, one of them the Leader's own.** In every case the code was right and the sentence about the code was wrong.

#### The mandated claim sweep — and what it caught that two reviewers missed

Attempt 3 was required to verify every claim about **order, count, location or magnitude** in both files. It reported **17 sites with dispositions** — the most thorough in this spec. It recomputed the T-03 predicate claim in node, resolved `:265`/`:266` to the actual requirement clauses, reconciled *"all SIX"* as five `it.each` rows + `organization_count`, and verified `:108`'s step-② rationale.

It also found a defect **neither reviewer had seen**: the controller spec runs `Case 1..7, 9` with **no `Case 8`**, while a header claims *"AC.1–AC.8 … plus T-07's own ninth case."* It left it alone as out of scope and flagged it.

**Both lenses ruled, and the ruling is the line this spec has been drawing all run:**

> **§4.3 governs assertions — a claim that can be checked and found false. A numbering hole asserts nothing; it withholds.**

Every item gated this run was a sentence contradicted by evidence. Here the substantive coverage claim **holds**: Lens B located `AC.8` at `Case 6` (`:560-561`, annotated *"(AC.8, draft-save)"*), and `Case 1` carries two ACs, so seven cases genuinely carry eight. **No coverage gap, no false claim — a naming discontinuity.** Lens A traced its origin to `T-07`; Lens B judged no new owner needed. **Recorded as a forward pointer for `T-12`'s sweep**, not widened into T-04.

Lens A on why it surfaced at all: *"it is invisible unless you enumerate the `describe` labels, which is what this attempt's claim sweep did … the strongest argument for keeping the sweep in the loop."*

#### `ADVISORY` — recorded, non-gating, none widens a task

| Lens | Finding |
| --- | --- |
| **RISK — reachable tier divergence** | `274877906944.0405` passes the DTO and is rejected by the service (`result-quantifications.service.ts:131`) with a `400` whose text contradicts a value that visibly *does* have four decimals. Path traced and the value **computed**: `result-innovation-use.service.ts:247-251` → `base-service.ts:319` → `:347` → `result-quantifications.service.ts:81-87` → `:131`. **No `500`, no corruption** — the IU upsert is step 9 inside `dataSource.transaction`, so the throw rolls back atomically; `RK-13`'s partial-update mode belongs to `updateOicr`, which uses roles 1/2. Effective API behaviour is the stricter tier. **If the predicates are ever unified, T-04's mechanism is the one to adopt** |
| Readability | *"pins the DC-15 crash guard, not the DD-14 bound"* is loose under a strict single-mutation reading — with ③ deleted the case survives via ④, with ④'s guard deleted it survives via ③, so it pins **neither alone**; it reddens only if both are removed. Not a false ordering claim (the comment above fixes the mechanism), and it does discharge criterion 1. Lens B's exact phrasing if that block is ever edited again: *"discharges T-04 acceptance item 1 (`1e21` returns a clean `400`); it pins neither ③ nor ④ alone — `9.9e20` pins ③."* **Do not touch it solely for this** |
| Resilience | The null contract rests **entirely** on `@IsOptional()`: step ① would reject `null` on its own, and unlike `IsActorCountModeExclusiveConstraint` (`:40`) this constraint has no defensive null branch. No reaching payload could be constructed. Either mirror the sibling's early `return true` or state in the doc block that `@IsOptional()` is load-bearing for `R-MSD-011` AC.6 |
| Risk | Above ~`2^38` one double covers more than `1e-5`, so a 5-decimal literal such as `549755813886.99991` arrives as its 4-decimal neighbour and is accepted — **the fifth digit is destroyed by `JSON.parse` before any validator runs.** Not fixable in a predicate over a `number`; same for T-03 |
| Risk | `expectBadRequestNaming` matches a bare field name, and `"women_youth_count"` contains `"men_youth_count"`. No false green today (each payload supplies one field); the indexed form removes the hazard permanently |
| Reliability | The six sibling cases assert only that the message contains the field name; they would pass if the exclusivity rule fired instead of `@IsInt()`. Verified it does not today. Asserting the constraint key `isInt` would make the reason load-bearing |
| Conformance | Criterion 2 names `2.55`, which appears nowhere. Non-gating (dominated), but one table row would pin the canary `DD-17`/`K-06` actually name — it fails *downward* (`"2.54999999999999982236"`) where `3.3` fails upward |
| DX | `@ApiProperty({ required: false })` still advertises a bare `number` while the accepted domain became ±549,755,813,887 at 4 decimals. Not obliged by §4.1 (no new endpoint) |
| Process | Add `result-innovation-use.controller.spec.ts` to T-04's *Files touched* so PR 1's review order reflects the real surface |
| Readability | The repaired controller-spec comment names the DTO spec twice — redundancy between two **true** statements, so §4.3 does not reach it |

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| Skills | `nestjs-expert`, `tdd`, `error-handling-patterns` (attempt 1); dropped to `nestjs-expert` + `tdd` for the prose-only attempts | The task's list. `error-handling-patterns` earned its place on the `400`-vs-`500` design and nothing after |
| Effort | `xhigh` throughout | Same reasoning as T-03: the *Tier ↔ effort rule* forbids `max` on a T2 model, and escalating to `opus` would collapse `author ≠ auditor` against the `opus` lenses |
| Review mode | **Parallel lens (2 reviewers)**, per the 4R table at `xhigh` | Unlike T-03, where the Leader had pre-measured the defect and ran a single merged lens, here nothing was known in advance. **The split earned its cost**: Lens B owned the rewritten pre-existing tests and produced the count reconciliation and the `T-10` precedent; Lens A owned the ordering question and found that two of four steps were unpinned. Neither found the other's issue |
| Mechanism verified before dispatch | Step ④'s predicate | Direct consequence of T-03 losing three attempts to an unverified one. It worked — T-04's predicate was never a FAIL cause |
| Parallelism | **T-04 and T-05 NOT run concurrently** despite both being eligible | Both are server-package tasks. `CLAUDE.md` §4.3: cross-package parallelism is safe for editing, two tasks in the same package are not — the rule behind the `excel-workbook.builder.spec.ts` phantom failures, twice |

---

### T-05 — Migration 1: backup table → `ALTER` → whole-table diff

- **Status:** ✅ **PASS on attempt 3** (`T-05` — Reviewer: **PASS**, both lenses). Reached the rework ceiling.
- **Date:** 2026-08-27
- **Implementer attempts:** 3 (`akili-implementer`, T2 `sonnet`, effort `xhigh`), one interrupted by a **session-limit runtime failure** and resumed
- **Reviewers:** two `akili-reviewer` lenses (T3 `opus`, read-only) — Lens A conformance/correctness, Lens B risk/resilience-operational
- **Requirements covered:** `NFR-MSD-001`, `R-MSD-004`
- **Design references:** `DD-1`, `DD-18`, `AR-2`, `U-2`

#### File

`server/researchindicators/src/db/migrations/1787260000000-alterQuantificationNumberToDecimal.ts` — new. Timestamp > `1787253483599` (previous newest), nothing above it, so `T-06` must claim `> 1787260000000`.

```ts
public async up(queryRunner: QueryRunner): Promise<void> {
  const existing: Array<{ c: number }> = await queryRunner.query(
    "SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'result_quantifications_backup_1787260000000'",
  );
  if (Number(existing[0].c) === 0) {
    await queryRunner.query(
      'CREATE TABLE `result_quantifications_backup_1787260000000` AS SELECT * FROM `result_quantifications`',
    );
  }
  await queryRunner.query(
    'ALTER TABLE `result_quantifications` CHANGE `quantification_number` `quantification_number` decimal(24,4) NULL, ALGORITHM=COPY',
  );
}
```

`down()` is the reverse `CHANGE … bigint NULL, ALGORITHM=COPY`. **Neither direction drops the backup** (`DD-18`, retained until sign-off).

#### Executed evidence — the only gate this file has

`db/migrations/**` is coverage-excluded and no unit spec exists (correctly — a spec over these SQL literals would be a presence assertion, not a behavioural proof). So the harness run *is* the gate, per §7's rule that *"the only sound gate for [the placeholder rule] is running the migrations."*

| Step | Result |
| --- | --- |
| Container discipline | `compose:test:down` → `up` → `migration:test:bootstrap` (once — `FP-49`, not idempotent), full cycle **run repeatedly** to isolate each falsifier. 320 migrations applied each time, no `ER_TABLE_EXISTS_ERROR` |
| Seed before `up()` | five rows — `NULL`, `-1500`, `1234567890123456789` (19 digits), `0`, `42`. All `quantification_role_id = 3` (see the scratch-catalog finding below) |
| `up()` | executed; column afterwards `decimal(24,4) YES NULL` |
| **Whole-table diff (AC.3)** | pre-snapshot joined against the live table on `CAST(pre AS DECIMAL(24,4)) <> post OR NULL-mismatch` → **zero rows**, `pre_count = post_count = 5`. Backup independently confirmed holding the same five values still typed `bigint` |
| Full suite | `355 suites / 2727 tests` green, **Leader re-measured independently after every attempt** |
| `npx eslint` / `npm run build` | exit 0 (bare eslint gate, `K-001`) |
| `npm run migration:scan` | **fails `MODULE_NOT_FOUND`** — `scripts/scan-migration-placeholders.js` does not exist though `package.json:41` references it. Reported as a tooling gap, **not fabricated as a pass**. Lens A confirmed: already filed four times, consistent with `K-006`'s record that the scanner was withdrawn and the npm entry was not |

#### Two spec-text errors found by execution, not by reading

**1. The falsifier's literal could not falsify anything.** `tasks.md` mandated seeding `9223372036854775807` and expecting `down()` to fail. Run: **`down()` succeeded, value unchanged.** That literal is **exactly** `2^63 − 1`, signed `bigint`'s max — *in* range, not *"wider than"* the range `AR-2` and AC.4 speak about. Substituted `9223372036854775808` (`2^63`, max + 1, 19 digits — fits `DECIMAL(24,4)`'s 20 integer digits, overflows `bigint`). Leader-verified independently.

**2. The error codes in the spec were guesses, and wrong.** `R-MSD-004` AC.4 named `1264`/`1406`. Measured:

```
driverError: Error: Truncated incorrect DECIMAL value: '9223372036854775808.0000'
code: 'ER_TRUNCATED_WRONG_VALUE', errno: 1292, sqlState: '22007'
sql: 'ALTER TABLE `result_quantifications` CHANGE `quantification_number` `quantification_number` bigint NULL, ALGORITHM=COPY'
```

Post-failure: column still `decimal(24,4)`, all rows unchanged, migration still listed as executed — **whole-statement failure, not partial.** Lens A traced the origin: AC.4's codes were added at the round-2 re-judgment, *"a reasoning round with no MySQL reachable to any judge."*

**And AC.4 carried the inverse of the hazard it names.** Its own sentence warns *"a test asserting only rounding will read a range error as a test bug"* — but a `T-07`/`T-08` author following AC.4 and asserting `errno === 1264` would get a **red test against correct behaviour.** Amended (below).

**Falsifiers were run in separate `down()` executions**, deliberately: `ALGORITHM=COPY` succeeds or fails as one atomic statement, so an overflow row co-resident with the fraction row would abort the whole statement and the rounding would never be observable. Both lenses upheld the reasoning; Lens A added that `FP-49` makes the isolation *mandatory*, not merely convenient.

#### Attempt 1 — Lens A `PASS`, Lens B `FAIL` (3 issues)

Lens A verified all fourteen TSDoc claims individually and passed. **Lens B found three things it had passed over** — the clearest case this run for the parallel-lens cost.

**Issue 1 — `up()` was single-shot, and one failure path is CERTAIN.** MySQL implicit-commits DDL, so statement 1 survived any failure of statement 2 while TypeORM wrote **no** `migrations` row. The deterministic path is the spec's *own prescribed backout*: `up()` succeeds → `migration:revert` → re-roll forward **dies at `ER_TABLE_EXISTS_ERROR`**, because neither direction drops the backup by design. `FP-49` already records that error stranding a schema as a known, expensive trap in this repo — logged to be avoided, and reproduced.

**Issue 2 — the TSDoc asserted something FALSE that licensed a destructive restore.** It claimed the backup snapshots the table *"exactly as it stands."* Verified against `baseline.sql:3781-3799`: the source table has `id bigint NOT NULL AUTO_INCREMENT`, `PRIMARY KEY (id)`, two secondary `KEY`s and two outgoing FKs — **CTAS reproduces none of them.** So an operator could `RENAME` the backup into place and get `id bigint NOT NULL` with no default: first insert fails `1364 ER_NO_DEFAULT_FOR_FIELD`, duplicate ids become possible. **No restore procedure existed anywhere in the spec.**

**It also caught the spec prescribing the restore in the wrong ORDER.** `design.md` §11's Backout row read *"`migration:revert` plus restore"* — but `AR-2` is precisely the finding that the revert is the step that rounds or aborts. Restore first and `down()` is **guaranteed** to succeed, because the restored rows are the pre-`up()` `bigint` values: integral and in range by construction.

**Issue 3 — the failure claim generalised past strict `sql_mode`.** Under a non-strict mode the same `ALTER` **clamps with a warning** instead of aborting — the third case, and the only one that loses data silently. The TSDoc told an operator `down()` would fail loudly rather than mangle.

#### Attempt 2 — all three fixed, with the reds observed

**Issue 1's fix:** probe `information_schema.TABLES`, run the CTAS only when absent. **Two wrong fixes are documented in the file as prohibited**, because both are what a later maintainer would reach for:

- `CREATE TABLE IF NOT EXISTS … AS SELECT` — does not skip; inserts the `SELECT`'s rows into the existing table.
- `DROP TABLE IF EXISTS` before the CTAS — on a re-apply after `down()` rounded someone's fractions, **overwrites the true pre-migration snapshot with rounded values**, destroying the one thing `DD-18` exists to preserve.

**The `1050` observed BEFORE the fix** (full capture retained at `scratchpad/before-fix-1050.log`, 4,696 bytes):

```
query: CREATE TABLE `result_quantifications_backup_1787260000000` AS SELECT * FROM `result_quantifications`
query failed: CREATE TABLE `result_quantifications_backup_1787260000000` AS SELECT * FROM `result_quantifications`
error: Error: Table 'result_quantifications_backup_1787260000000' already exists
Migration "AlterQuantificationNumberToDecimal1787260000000" failed, error: Table ... already exists
query: ROLLBACK
    code: 'ER_TABLE_EXISTS_ERROR',
    errno: 1050,
    sqlState: '42S01',
```

Post-failure: column type `bigint` (the revert held), **`migrations` table holds 0 rows for `1787260000000`** — the schema stranded exactly as predicted. Lens B credited those post-conditions specifically: *"nobody would invent [them] because they require extra queries."*

**The same sequence AFTER the fix** — no `CREATE TABLE` line at all; the probe returned `c=1` and the CTAS was skipped:

```
query: SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '...'
query: ALTER TABLE `result_quantifications` CHANGE ... decimal(24,4) NULL, ALGORITHM=COPY
Migration ... has been executed successfully.
```

**Snapshot preservation — proven behaviourally, not asserted.** `CHECKSUM TABLE` = `1622928111` after the first apply and `1622928111` after the recovery re-apply, plus an independent content read showing the backup still holds only `id=83, value=42` and **not** the rounded `-13` or the second row. Lens B: *"a retake would necessarily have produced a 2-row table and a different checksum, so the two observations cannot both hold under a retake."*

**Issue 2's fix:** the false sentence replaced with data-snapshot-not-table-snapshot, the four things CTAS drops enumerated with the `baseline.sql` citation, the `RENAME`/`1364` hazard named, and the restore procedure written out — **into the surviving table, never by `RENAME`, and before `down()`.** Executed: live table `[83: 42.0000, 84: -13.0000]` → `DELETE` + `INSERT … SELECT *` → back to the backup's single row, row 84 gone (it never existed pre-migration), column alignment held.

**Issue 3's fix:** scoped to strict `sql_mode`, non-strict clamp named as the silent-loss case, and the container **directly measured** (verbatim, replacing an earlier paraphrase):

```
@@GLOBAL.sql_mode  = ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
@@SESSION.sql_mode = ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
VERSION()          = 8.0.46
```

Lens A verified no other mode in that list affects rounding or truncation. **Dev and Prod remain unverified** — a `SELECT @@GLOBAL.sql_mode;` is now required in AC.4's pre-flight.

#### The runtime failure, and how it was handled

Attempt 2 was **killed mid-task by a session limit** — an environment blocker, not a work FAIL. Handling: the Leader inspected the working tree before resuming (all three fixes had landed; the file was complete), then resumed the **same** agent with a continuation brief naming only what remained, and instructed it — where a red had not actually been captured — to **say so rather than reconstruct it.** It had preserved the full capture in a scratchpad log, which the Leader read directly rather than accepting the summary.

#### Attempt 3 — Lens A `FAIL` on two prose issues, then `PASS`

**Issue 1: one unlabelled empirical claim among labelled ones.** The `IF NOT EXISTS … AS SELECT` mechanism was asserted as flat fact, executed by nobody. Lens A's reasoning is the important part: *"every other empirical claim in this file is labelled with its provenance and scope … this single assertion sits unlabelled among them, so a reader cannot tell measured from assumed at the exact moment before they run DDL on a shared production table."* Fixed by attribution + *"not executed here"* + an **"either way"** construction. Lens A on the result: *"the 'either way' construction does more than the label does … it makes the action independent of the claim's truth value, so no reader can be misled into a wrong decision by an unverified premise."*

**Issue 2: two `design.md:492` line citations into a file being amended in the same loop** — `FP-50`, whose own precedent is six of seven citations killed by the edit that introduced them. Both anchored to `design.md` §11 → Backout row, and the over-attribution fixed: the observed sequence is the prescribed backout *followed by an unprescribed fix-forward re-apply*, and the citation covered only the middle step.

Also done: restore wrapped in `START TRANSACTION … COMMIT` (a failed `INSERT` would otherwise leave the table **empty**), *"the only path that does"* → *"the only path this migration provides"*.

**The Implementer verified the Leader's own claim rather than trusting it.** The brief asserted zero inbound FKs to `result_quantifications` as reassurance for the unqualified `DELETE`; it ran the grep itself and recorded the result as measured. Lens A then **extended the region that grep could not see** — `baseline.sql` cannot show FKs added by post-baseline migrations — and grepped the migrations directory: still zero. So the file's stated scope under-claims the truth.

**It also declined one reviewer suggestion with a reason, and was right.** Lens A had suggested softening *"lists"* to *"reads as"*; the Implementer dropped the word entirely, arguing that once the citation points at the corrected row there is no ambiguous old text to hedge against. Lens A's ruling: *"it was right and I was wrong, and the reason is stronger than the one it gave"* — hedging would have described **superseded** text, introducing a fresh inaccuracy of exactly the class this spec keeps paying for.

#### 📌 A convention worth keeping — ratified by Lens A, candidate for the Kaizen log

Attempt 3 produced a **provenance sweep** classifying all 16 claim sites as `measured (where)` / `derivable (from what)` / `assumed (labelled)`. Asked whether *every* claim should carry a marker, Lens A ruled **no**, and the reasoning generalises well beyond this file:

> **Do not add a uniform marker.** *"I found the `IF NOT EXISTS` claim **because** its neighbours were selectively labelled and it was not. A blanket marker raises the noise floor and dilutes the markers that carry weight."*
>
> The test is not *"is it labelled"* but **"could a reader mistake it for measured, and would that mistake change an action?"**
>
> | Case | Label |
> | --- | --- |
> | (i) empirical claim about system state nobody observed | **REQUIRED** |
> | (ii) any claim about **another environment** (Dev, Prod) — a reader may act on it there | **REQUIRED** |
> | (iii) deductive consequence whose premises are stated in the same sentence | not required |
> | (iv) counterfactual branch inside an already-scoped conditional | not required |

This is the first rule this run that would have *prevented* rather than merely caught the prose failures — seven review rounds across T-03, T-04 and T-05 went to unverified assertions, and a uniform-labelling response would have made them harder to spot, not easier.

#### Three Leader-owned spec amendments — APPLIED, and they need user ratification

Both lenses independently required these. All three correct **measured falsehoods**; two of them would otherwise make a compliant `T-07`/`T-08` test fail against correct behaviour.

| # | Document | Amendment |
| --- | --- | --- |
| 1 | `tasks.md` → `### T-05` falsifier | Literal `9223372036854775807` → **`9223372036854775808`**, with the executed evidence that the old value succeeded. Also recorded that the backup **cannot recover `2.5` itself** — the old text implied it could |
| 2 | `requirements.md` → `R-MSD-004` **AC.4** | `1264`/`1406` → **the three-part property** (statement fails, column type unchanged, no partial write), with `1292` as the observed instance rather than the contract, plus the **strict-`sql_mode` precondition** and the measured mode list. An errno is version- and `sql_mode`-dependent; the property is not |
| 3 | `design.md` → §11 **Backout** row | Order corrected to **restore-first, then `migration:revert`**, with `AR-2` as the reason, the transaction wrap, and the `RENAME`/`1364` prohibition |
| 4 | `design.md` → §11 **step 1** | *"Behaviour does not change yet"* was **false**. Corrected: in the interim window, with `T-03`/`T-04` merged and the column still `bigint`, a `PATCH` of `quantification_number: -12.75` returns **`2xx` with `-13` stored** where it previously returned a clean `400`. **`K-015` means this window can last indefinitely** |

#### `ADVISORY` — recorded, non-gating, none widens a task

| Lens | Finding |
| --- | --- |
| **RISK — ESCALATED TO THE USER as a spec gap** | **Nobody owns dropping `result_quantifications_backup_1787260000000`.** *"Retained until sign-off"* appears in `tasks.md` and `DD-18`, but **neither sign-off list** (`tasks.md` §9, `requirements.md` §12) contains a backup-table item, `T-12` does not mention it, and it is absent from the *"reported, not owned"* list. **Reachability: certain.** A permanent orphan table on a shared, non-disposable database, created by design, with no owner and no follow-up migration. Lens B: *"the only item that is certain rather than conditional, and the one with no owner anywhere in the spec."* |
| **RISK — certain if the backup outlives a baseline regeneration** | `src/db/baseline/README.md:36`,`:96` — the snapshot is `mysqldump --no-data` over the **whole** database, *"no table list — everything."* A regeneration while the backup exists ships `result_quantifications_backup_1787260000000` into `baseline.sql` and thus into **every future scratch schema, permanently**, and invalidates the 196/17/213 counts. Non-breaking; irreversible in practice once merged |
| **RISK — reachable, no guard** | `ALGORITHM=COPY`'s metadata-lock **acquisition** is independent of the 80 rows: any open transaction holding a shared MDL blocks the `ALTER`, and while it waits **every subsequent query on the table queues behind it, reads included.** `lock_wait_timeout` defaults to **31,536,000 s**. Mitigation for the rollout note: check `information_schema.INNODB_TRX`, and `SET SESSION lock_wait_timeout = 30;` so a contended run fails fast (`1205`) instead of stalling the table |
| **RISK — narrow, inherent to `DD-18`** | Once the backup is dropped at sign-off, **this migration must not be re-applied**: a re-apply would fire the CTAS against a column `down()` had already rounded, and the new backup would silently not be the pre-migration state. Worth one sentence in whatever ticket the backup-drop escalation produces |
| Forward — `T-06`/`T-08` | **The scratch `quantification_roles` catalog holds only role 3.** `baseline.sql:8269`'s ledger seed contains `1760653582914`, so the migration inserting roles 1 and 2 never runs; role 3 comes from `1787071463485`, which is not in the ledger. `report_oicr` filters on roles 1/2 and `oicr_validation` reads them, so **`T-06` and `T-08` must seed `quantification_roles`** — the FK will reject inventing them. Plan for it rather than discovering it mid-task |
| Reliability | AC.3's diff structurally cannot catch a simultaneous delete+insert keeping cardinality equal, nor any column other than `quantification_number`. Both unreachable in this harness. `up()` already snapshots `SELECT *`, so joining against **the backup itself** across all columns would have covered every column and validated the backup in one query |
| Readability | `NFR-MSD-001` is satisfiable — `requirements.md:553` scopes it to a bootstrapped scratch schema, where the table is empty so `down()` cannot fail. Not a third unsatisfiable requirement; the residual weakness is the opposite, the literal target is **vacuous** on an empty table, which T-05's own disqualifier anticipated and the seeded run exceeded. But `requirements.md:700` summarises it as *"reversible"* unqualified |
| Readability | The stranding mechanism was **measured** (verbatim `1050` + 0-row ledger) but is dispositioned as *derivable* — under-claiming is safe, never unsafe, but the file is discarding evidence it owns |

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| Skills | `nestjs-expert` + **`systematic-debugging`** (added) | The task named only `nestjs-expert`; DB work against a container reliably needs the debugging discipline. Deviation recorded |
| Effort | `xhigh` throughout | Correctness-critical wants `max`, but the *Tier ↔ effort rule* forbids `max` on a T2 model and escalating to `opus` would collapse `author ≠ auditor` against the `opus` lenses |
| Review mode | **Parallel lens (2)** | `xhigh` + a data-loss surface. **The split paid for itself here more than anywhere else in the run:** Lens A passed attempt 1 outright while Lens B found three issues including a *certain* stranding bug on the spec's own prescribed backout |
| Lens A's PASS **invalidated** after attempt 2 | Re-gated | Attempt 2 added a code path and rewrote the TSDoc, so the fourteen-claim audit no longer covered the artifact. A verdict on superseded content is not a verdict on this content — its claim inventory then grew from 14 to 24 |
| Lens B **not** re-gated for attempt 3 | Deliberate economy, disclosed | Prose-only changes, moving in directions Lens B itself recommended; nothing it audited behaviourally changed. Lens A ratified the call **and closed the one gap it left** — the transaction wrap was a new destructive operating instruction Lens B had recommended but never reviewed as written, so Lens A reviewed it |
| Ambiguity ruled, not escalated | The backup restores the **pre-migration state**; a post-migration fraction is recoverable by nothing | `tasks.md` implied the backup could recover a seeded `2.5`, which is impossible — it predates the `ALTER`. Ruling stated in the brief and given to the Reviewer to check; Lens A confirmed and noted the TSDoc states it *more precisely than the spec does* |
