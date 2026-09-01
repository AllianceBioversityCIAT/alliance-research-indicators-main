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

---

### T-06 — Migration 2: recreate `report_oicr` with `DD-10`'s expression

- **Status:** ✅ **PASS on attempt 2** (`T-06` — Reviewer: **PASS**). ⚠️ **Implementation complete; MERGE still gated by `OQ-1`** (acceptance item 4 deliberately **not** discharged).
- **Date:** 2026-08-27
- **Implementer attempts:** 2 (`akili-implementer`, T2 `sonnet`, effort `xhigh`)
- **Reviewer:** **one** `akili-reviewer`, **single merged lens** (conformance + correctness + operational risk) — **mode change, user-approved:** the spec is over its review budget, so remaining tasks run single-lens **except `T-07`**, which stays parallel
- **Requirements covered:** `R-MSD-010`
- **Design references:** `DD-10`, §9.1, §9.2, `U-1`, `U-3`, `U-5`, `U-8`, `OQ-1`, `OQ-D5`

#### File

`server/researchindicators/src/db/migrations/1787270000000-normaliseQuantificationNumberInReportOicr.ts` — new, ~18 KB. Timestamp `1787270000000` > T-05's `1787260000000` (acceptance item 4 of T-05, and item ordering here).

`up()` re-emits `CREATE OR REPLACE VIEW report_oicr` changing **only** the two `report_field(rq.quantification_number, TRUE, TRUE)` sites (role-1 and role-2 sub-selects) to wrap `DD-10`'s expression from §9.2 verbatim. `down()` re-issues the pre-migration body unedited. `report_link_result` — also in the originating migration — untouched.

#### ⚠️ Acceptance item 1 — the `SHOW CREATE VIEW` capture, preserved here because it was volatile

The three captures existed **only** in a session-scoped temp directory with the container torn down. They are the sole evidence for acceptance items 1 and 2 and the reference body `T-08` will need. Preserved on the Reviewer's advisory:

| Capture | `DEFINER` | sha256 (raw, first 16) |
| --- | --- | --- |
| BEFORE (`up()` not yet run) | `` `root`@`localhost` `` | `58ef697a9656bdf2` |
| AFTER (`up()` applied) | `` `root`@`%` `` | `9a26cc6030bb874d` |
| DOWN-RESTORED (`down()` applied) | `` `root`@`%` `` | `bcc58aec0f6de6f7` |

**Two hash sets appear in this task's evidence and they do NOT contradict each other** — labelling them, per the Reviewer, so a later reader does not read them as conflicting:

- The three hashes **above** are over the **raw** captures. All three differ, because `DEFINER` alone makes BEFORE ≠ DOWN-RESTORED.
- The Implementer's `edca2fc1…` ("identical") is over the **`DEFINER`-normalised** text. Both are correct at their own scope.

**BEFORE, verbatim (acceptance item 1):**

```sql
mysql: [Warning] Using a password on the command line interface can be insecure.
*************************** 1. row ***************************
                View: report_oicr
         Create View: CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `report_oicr` AS select `root`.`result_id` AS `result_id`,`report_field`(`ro`.`general_comment`,true,(`root`.`indicator_id` = 5)) AS `general_comment`,`report_field`(`ml`.`full_name`,true,(`root`.`indicator_id` = 5)) AS `maturity_level`,`report_field`(`ro`.`oicr_internal_code`,true,(`root`.`indicator_id` = 5)) AS `oicr_internal_code`,`report_field`(`ro`.`outcome_impact_statement`,true,(`root`.`indicator_id` = 5)) AS `outcome_impact_statement`,`report_field`(`ro`.`short_outcome_impact_statement`,true,(`root`.`indicator_id` = 5)) AS `short_outcome_impact_statement`,`report_field`(`ro`.`sharepoint_link`,false,(`root`.`indicator_id` = 5)) AS `sharepoint_link`,`report_field`(concat_ws('',`aus`.`first_name`,' ',`aus`.`last_name`),true,(`root`.`indicator_id` = 5)) AS `mel_regional_expert`,`report_field`(`rt`.`tag_name`,true,(`root`.`indicator_id` = 5)) AS `tagging`,`report_field`(`rq`.`quantifications`,false,(`root`.`indicator_id` = 5)) AS `quantifications`,`report_field`(`rq2`.`extrapolated_estimates`,false,(`root`.`indicator_id` = 5)) AS `extrapolated_estimates`,`report_field`(`acp`.`authors_contact_persons`,false,(`root`.`indicator_id` = 5)) AS `authors_contact_persons`,`report_field`(if(`ro`.`for_external_use`,'YES','NO'),false,(`root`.`indicator_id` = 5)) AS `for_external_use`,`report_field`(`ro`.`for_external_use_description`,false,(`root`.`indicator_id` = 5)) AS `for_external_use_description`,`report_field`(`ria`.`impact_area`,true,(`root`.`indicator_id` = 5)) AS `impact_area`,`report_field`(`treo`.`existing_oicr`,true,((`root`.`indicator_id` = 5) and (`rt`.`tag_id` in (2,3)) and (`rt`.`tag_id` is not null))) AS `existing_oicr`,`report_field`(`ro`.`cgspace_link`,true,(`root`.`indicator_id` = 5)) AS `cgspace_link` from ((((((((((`results` `root` left join `result_oicrs` `ro` on((`ro`.`result_id` = `root`.`result_id`))) left join `maturity_levels` `ml` on((`ml`.`id` = `ro`.`maturity_level_id`))) left join `alliance_user_staff_groups` `ausg` on(((`ausg`.`staff_group_id` = `ro`.`mel_staff_group_id`) and (`ausg`.`carnet` = `ro`.`mel_regional_expert`)))) left join `alliance_user_staff` `aus` on((`aus`.`carnet` = `ausg`.`carnet`))) left join (select `rt`.`result_id` AS `result_id`,`rt`.`tag_id` AS `tag_id`,`t`.`name` AS `tag_name` from (`result_tags` `rt` join `tags` `t` on((`t`.`id` = `rt`.`tag_id`))) where (`rt`.`is_active` = true) group by `rt`.`result_id` order by `rt`.`result_id`) `rt` on((`rt`.`result_id` = `root`.`result_id`))) left join (select `rq`.`result_id` AS `result_id`,group_concat(concat_ws('','• Number: ',`report_field`(`rq`.`quantification_number`,true,true),', Unit: ',`report_field`(`rq`.`unit`,true,true),', Comment: ',`report_field`(`rq`.`description`,true,true)) separator '\n') AS `quantifications` from `result_quantifications` `rq` where ((`rq`.`is_active` = true) and (`rq`.`quantification_role_id` = 1)) group by `rq`.`result_id`) `rq` on((`rq`.`result_id` = `root`.`result_id`))) left join (select `rq`.`result_id` AS `result_id`,group_concat(concat_ws('','• Number: ',`report_field`(`rq`.`quantification_number`,true,true),', Unit: ',`report_field`(`rq`.`unit`,true,true),', Comment: ',`report_field`(`rq`.`description`,true,true)) separator '\n') AS `extrapolated_estimates` from `result_quantifications` `rq` where ((`rq`.`is_active` = true) and (`rq`.`quantification_role_id` = 2)) group by `rq`.`result_id`) `rq2` on((`rq2`.`result_id` = `root`.`result_id`))) left join (select `ru`.`result_id` AS `result_id`,group_concat(concat_ws('','• ',`aus`.`first_name`,' ',`aus`.`last_name`,' - Position: ',ifnull(`aus`.`position`,'N/D'),' - Affiliation: ',ifnull(`aus`.`center`,'N/D')) separator '\n') AS `authors_contact_persons` from (`result_users` `ru` join `alliance_user_staff` `aus` on((`aus`.`carnet` = `ru`.`user_id`))) where ((`ru`.`user_role_id` = 3) and (`ru`.`is_active` = true)) group by `ru`.`result_id`) `acp` on((`acp`.`result_id` = `root`.`result_id`))) left join (select `ria`.`result_id` AS `result_id`,group_concat('• ',`cia`.`name`,' - Score: ',convert(`report_field`(concat('(',(`ias`.`id` - 1),') ',`ias`.`name`),true,true) using utf8mb3),'\n',`rgt`.`global_targets` separator '\n') AS `impact_area` from (((`result_impact_areas` `ria` left join `clarisa_impact_areas` `cia` on((`cia`.`id` = `ria`.`impact_area_id`))) left join `impact_area_scores` `ias` on((`ias`.`id` = `ria`.`impact_area_score_id`))) left join (select `riagt`.`result_impact_area_id` AS `result_impact_area_id`,group_concat('	◦ ',`cgt`.`smo_code`,' - ',`cgt`.`target` separator '\n') AS `global_targets` from (`result_impact_area_global_target` `riagt` left join `clarisa_global_targets` `cgt` on((`cgt`.`targetId` = `riagt`.`global_target_id`))) where (`riagt`.`is_active` = true) group by `riagt`.`result_impact_area_id`) `rgt` on((`rgt`.`result_impact_area_id` = `ria`.`id`))) where (`ria`.`is_active` = true) group by `ria`.`result_id`) `ria` on((`ria`.`result_id` = `root`.`result_id`))) left join (select `treo`.`result_id` AS `result_id`,concat(`teo`.`external_id`,' - ',`teo`.`title`,' <',`teo`.`handle_link`,'>') AS `existing_oicr` from (`TEMP_result_external_oicrs` `treo` join `TEMP_external_oicrs` `teo` on((`teo`.`id` = `treo`.`external_oicr_id`))) where (`treo`.`is_active` = true) group by `treo`.`result_id`) `treo` on((`treo`.`result_id` = `root`.`result_id`))) where ((`root`.`is_active` = true) and (`root`.`is_snapshot` = false)) order by `root`.`result_id`
character_set_client: utf8mb4
collation_connection: utf8mb4_unicode_520_ci
```

#### Acceptance item 2 — `down()` restores the body: confirmed by the Leader's own measurement

Not taken from the report. Run directly against the preserved captures:

```
BEFORE vs DOWN-RESTORED (DEFINER normalised):  IDENTICAL
  -> acceptance item 2 discharged by measurement

BEFORE vs AFTER: only the two `report_field(rq.quantification_number` sites
  replaced by the DD-10 expression. Nothing else differs.
```

**The `DEFINER` delta is a control, not a defect**, and the reasoning is structural rather than reassuring: neither `up()` nor `down()` — nor `1780694172676` before them — emits a `DEFINER` clause, so MySQL substitutes `CURRENT_USER`. The migration text is therefore **incapable** of restoring `root@localhost`, and hardcoding one would be a worse defect because it would break on Dev. The control that proves it: the `up()`-applied view *also* shows `root@%`, so the delta tracks the connecting user, not the `down()` text.

#### Transcription fidelity — the highest-value check in this task

This is `CREATE OR REPLACE VIEW` over a ~90-line body, **append-only and uneditable after deploy** (`ADR-5`). The Reviewer compared MySQL's normalised definitions and found they differ at **exactly three places**: the `DEFINER` clause and the two `report_field(...)` sites. Everything a bad retype would have broken survived intact:

- all **17** columns in the same order, `cgspace_link` present, `existing_oicr`'s three-clause third argument intact;
- the **10-deep join parenthesisation**, same join count and order, `ausg`'s two-condition `ON`;
- **`convert(report_field(concat('(',(ias.id - 1),') ',ias.name),true,true) using utf8mb3)` on `impact_area` present and byte-identical** — and this one is the strongest signal available, because *MySQL inserts it itself* during normalisation; it is in no source text and reappeared unprompted;
- `where ((root.is_active = true) and (root.is_snapshot = false)) order by root.result_id`; `character_set_client: utf8mb4` / `collation_connection: utf8mb4_unicode_520_ci` identical across all three captures.

**`R-MSD-010` AC.4** (*"does not change the rendering of any other column"*) is discharged **structurally** by that comparison — the best outcome available at this tier.

#### The falsifier — `DC-14`, and it demonstrates both halves

`tasks.md`'s falsifier is *"run the trim expression against a `bigint` column — `'10'` must render `'1'`."* Measured:

```
id  quantification_number  bare_trim_ONLY  dd10_guarded_expr
83  10                     1               10
84  -10                    -1              -10
87  0                      (empty)         0
```

The **bare** trim renders `10 → 1` — `DC-14` demonstrated, exactly as §9.1's disqualified candidate would have behaved. `DD-10`'s **guarded** expression on the same `bigint` column and the same row renders `10` correctly. Confirmed through the live view too: `• Number: 10`, not `• Number: 1`.

**The Reviewer noted the `0` row is the nastier corruption** the bare trim would cause: an empty string, which `report_field(…, TRUE, TRUE)` renders as `Not provided` — a measure of zero silently becoming "not provided" in an OICR export.

**`NULL`:** `• Number: Not provided` under **both** column types, confirming `K-12`'s correction that `NULL = TRUNCATE(NULL,0)` is `NULL` → `IF()` false → the "unreachable" else branch runs, with a benign outcome.

#### 📌 A third spec-text error, found by execution

`tasks.md` T-06's falsifier framing assumes `migration:test:revert` reaches the column. **Once T-06 exists it does not** — revert is LIFO, so one revert removes T-06 (the expression under test) and two reverts remove the expression *and* the column change. The only state instantiating `R-MSD-010` AC.5 / `DC-14` — the new view **over** a `bigint` column — is reached by changing the column type independently, which is what was done (direct `ALTER` on the disposable scratch schema, restored after).

> **⚠️ FORWARD POINTER — `T-08`'s acceptance item 3 is wrong for the same reason.** It mandates *"the `bigint` branch exercised via `migration:test:revert`"*. That is not executable once both migrations are in the tree. Its executable equivalent is the direct `ALTER` on the scratch schema. **This must be carried into `T-08`'s brief.**

#### `U-8` — resolved, and attributed to the evidence that could have FAILED

Both collation readouts taken during the task are **narrower than `U-8` asks**, and recording either as the answer would hand `T-08` a green from a check incapable of reddening:

| Readout | Why it does not settle `U-8` |
| --- | --- |
| bare expression → `utf8mb4_0900_ai_ci` | that is the **measuring session's** `collation_connection`. All three captures show the **view's stored** one is `utf8mb4_unicode_520_ci` |
| view columns → `utf8mb4_unicode_ci` | **fixed by the function declaration** — `baseline.sql:6560-6563` declares `report_field`'s parameter and return as `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`. It cannot change whatever the argument's collation is, so it is **structurally unable** to detect a branch mismatch — a mismatch surfaces as error **`1267`**, not as a different column collation |

**What actually settles `U-8`:** the view **created** and **both branches executed** — integers through `CAST`, and `2.5` / `-0.75` / `12.34` / `NULL` through `TRIM` — with **no `1267` and no new warnings**. Structurally, both branches take their collation from `collation_connection` (the `CAST … AS CHAR`, and the implicit numeric→string conversion inside `TRIM`), so they are **equal by construction in any environment**, and the `IF()` result is then converted into `report_field`'s declared `utf8mb4_unicode_ci` exactly as the bare numeric column was before. **That is why the change is collation-inert.**

#### Renders — recorded as OBSERVATION, not as a gate

T-06's disqualifier assigns the seven-case proof to `T-08`. The Implementer executed renders anyway; the Reviewer ruled that **legitimate over-delivery** (an observation beats a prediction) but **not a gate**, because the container is gone, no fixture exists, and **no artifact in the repo carries the output strings.**

| Case | `decimal(24,4)` | after the falsifier `ALTER` to `bigint` |
| --- | --- | --- |
| `10.0000` / `10` | `10` | `10` |
| `-10.0000` / `-10` | `-10` | `-10` |
| `2.5000` | `2.5` **(before)** → `3` after the round-trip (expected lossiness, `AR-2`) | `3` |
| `-0.7500` | `-0.75` **(before)** → `-1` after | `-1` |
| `0.0000` | `0` | `0` |
| `NULL` | `Not provided` | `Not provided` |
| `12.3400` | `12.34` | n/a (seeded after restore) |
| role 2, `10.0000` | `10` | n/a |

⚠️ **The fractional rows are force-seeded defensive-branch probes, NOT a reachable production path.** `DD-12` + `DD-13` hold roles 1 and 2 to integers, and `report_oicr` reads only those roles — so no fractional row can enter the view's domain in production. Recorded explicitly so a later reader does not mistake these renders for production behaviour.

**`T-08`'s acceptance item 4 is NOT discharged here.** `T-08` still owns the reproducible seven-case fixture proof.

#### `OQ-1` — outstanding, and acceptance item 4 deliberately left open

`OQ-1` asks whether `report_oicr` should accept `10.0000` in exports or ship `DD-10`'s expression. Recommendation on file: *ship it*. **No ruling has been made.** It gates `R-MSD-010` AC.3 and this task's **merge**, not its implementation. The Implementer was instructed not to argue the question and did not; **acceptance item 4 remains unchecked.**

#### Attempt 1 → `FAIL` on one paragraph, and it is the sharpest prose finding of the run

The TSDoc claimed the body was *"reproduced **byte-for-byte from the body transcribed by `SHOW CREATE VIEW report_oicr`** … **not retyped from memory of `1780694172676`'s source**."*

**Both halves false — and the second denied the correct engineering choice actually made.** `SHOW CREATE VIEW` returns MySQL's *normalised* form (lowercase keywords, backticked identifiers, parenthesised joins, the inserted `convert(… using utf8mb3)`), so the file is not a transcription of it. The file **is** `1780694172676-UpdateReportView.ts:5-85`, copied — which is right, and the sentence talked itself out of it.

**Why it gated rather than being tidied:** a maintainer trusting that sentence would diff the file against a `SHOW CREATE VIEW` output, find hundreds of differences, and conclude the migration is **corrupt** — and after merge the sentence can never be edited (`ADR-5`).

Attempt 2 rewrote it to state the real provenance, the normalised-definition comparison, the `DEFINER` control with its three measured values, and — the sentence that makes the file auditable later — that **diffing against `SHOW CREATE VIEW` surfaces MySQL's own normalisation, not corruption.**

**Two reported negatives, independently confirmed.** The Implementer reported that two of the Reviewer's preventive warnings did not apply because the claims are **absent** from the file. The Reviewer verified both by searching the file's only prose block (the TSDoc header; the SQL bodies carry no comments, so there is nowhere else a claim could hide): no collation claim of any kind, and no *"both branches are `CHAR`"* sentence. Reporting "I looked and it is not there" rather than claiming a fix is the right answer, and it was checked rather than accepted.

#### `ADVISORY` — recorded, non-gating

| Lens | Finding |
| --- | --- |
| **RISK — reachable, and it is a SILENT regression** | **A single revert on Dev breaks the export quietly.** `design.md` §11's Coupling row covers only *"column reverted ⇒ revert migration 2"*. The reverse is likelier and unguarded: one `migration:revert` after both are applied reverts **T-06 alone**, leaving a `DECIMAL` column under the **bare** view — OICR exports immediately render `10.0000` again, **with no error and no log entry.** Same LIFO fact that invalidated T-08's method. Worth one sentence in the rollout/backout section |
| **RISK — `DEFINER` on Dev; reachable, not constructed** | `CREATE OR REPLACE VIEW` **re-stamps `DEFINER`** to the applying user on a `SQL SECURITY DEFINER` view. If whoever applies this on Dev/Prod differs from whoever applied `1780694172676`, every reader of `report_oicr` — including `star-results-export.repository.ts:153` — begins executing under the new definer's privileges, and the view breaks with **`1449`** if that account is ever dropped. **Rollout mitigation:** capture `SHOW CREATE VIEW` on Dev before and after, apply via the same connection/user as prior view migrations, confirm `DEFINER` unchanged. Reassuring on the adjacent axis: the AFTER capture kept `collation_connection: utf8mb4_unicode_520_ci`, so applying through TypeORM reproduced the stored charset context exactly |
| Readability | *"is not expressible in migration text"* is imprecise — `CREATE DEFINER=user@host VIEW …` is valid MySQL. The accurate statement is *deliberately not specified, because hardcoding a user breaks on any environment where it differs.* The imprecision **errs safe** (it discourages exactly the hardcoding that would be a real defect) and the operative claim is correct. **Not worth touching an append-only file for** |
| Readability | *"copied as-is"* is true modulo trailing whitespace — `1780694172676`'s source has trailing spaces this file lacks. Semantically void in SQL and proven irrelevant by the normalised comparison. **Do not "fix" by re-adding whitespace** |
| Risk — residual, safe direction | Lines 14-15 assert a `decimal(24,4)` `10.0000` renders `'10.0000'`. True, and corroborated in-spec by T-02's executed round-trip returning the server's own `"10.0000"` text — but not measured *in this task*. Errs safe; `T-08` measures it directly and can retire the residue |
| **Pre-existing defect — verified, NOT introduced here** | `report_oicr`'s untouched `treo` sub-select violates `ONLY_FULL_GROUP_BY` (`1055` on `teo.external_id`). **The Leader proved it pre-existing the hard way:** fresh container, baseline loaded, **T-06's file physically moved out of the tree, zero migrations applied** — identical `1055`. Out of `R-MSD-010`'s scope and correctly not fixed. **Worth a ticket, owned by nobody** |

#### 📌 Dev measured under user authorisation — three results, one of which kills a suspected production bug

A single read-only query, authorised by the user after the `1055` finding raised the possibility that the STAR export was broken:

```
Dev @@GLOBAL.sql_mode  = STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION
Dev @@SESSION.sql_mode = STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION
Dev VERSION()          = 8.0.45
```

| Result | Consequence |
| --- | --- |
| **No `ONLY_FULL_GROUP_BY` on Dev** | The `1055` **cannot occur there.** `report_oicr` and the STAR export (`star-results-export.repository.ts:153`) are **not broken**. The app sets no `sql_mode` and inherits the server default. **No production defect** |
| **`STRICT_TRANS_TABLES` present** | **`T-05`'s issue-3 precondition is now confirmed on Dev directly** — `down()` will fail loudly rather than clamp silently. This replaces the 23-routine circumstantial evidence with a measurement |
| **`VERSION()` = 8.0.45** | **`OQ-D5` has a measured answer for Dev**, and the spec's narrowing was wrong: it had Dev at *"8.0.4 … 8.0.16"*. `DD-10`'s expression needs nothing above 8.0.4, so `R-MSD-010` AC.6 holds on both engines |

> **⚠️ FIXTURE-FIDELITY FINDING for `T-07` / `T-08`.** The scratch container (**8.0.46, with `ONLY_FULL_GROUP_BY`**) does **not** represent Dev (**8.0.45, without it**). For **T-06 this cuts favourably** — the container is the *stricter* engine on that axis, so a view that creates and selects there cannot be worse on Dev. **For `T-07`/`T-08` it cuts the other way:** any `sql_mode`-dependent behaviour proven on the container is **not** thereby proven for Dev, and a fixture may need `SET SESSION sql_mode` to reproduce Dev rather than the container default.

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| Review mode | **Single merged lens** | User-approved budget response. The reviewer was told explicitly it carried both perspectives and should raise operational risk itself. **It worked here** — the operational findings (`DEFINER` re-stamping, the single-revert regression) came from the same lens that did the conformance audit |
| Skills | `nestjs-expert` + `systematic-debugging` | Same deviation as T-05, same reason |
| Effort | `xhigh` both attempts | Append-only view SQL that cannot be edited after deploy |
| Ambiguity resolved in-brief | Acceptance item 3 (*"collation asserted from an executed query"*) vs the note deferring `U-8` to `T-08` | Ruled: execute it here (real MySQL was available), and hand `T-08` anything that could not be settled at this tier |
| `OQ-1` not delegated | Implementer told to implement and record it outstanding, **not** to argue it | An open product question is not an implementer's to close |
| Leader verified the load-bearing claim | Ran the BEFORE/AFTER/DOWN-RESTORED diffs personally | The Reviewer cannot execute, and transcription fidelity was the task's central risk — a report was not sufficient |

---

### T-07 — Fixtures: storage, the `SP_versioning` copy path, and row identity on both paths

- **Status:** ✅ **PASS on attempt 2** (`T-07` — Reviewer: **PASS**, both lenses). **This task discharges `T-02`'s three transferred acceptance items**, closing the forward pointer opened on 2026-08-27.
- **Date:** 2026-08-27
- **Implementer attempts:** 2 (`akili-implementer`, T2 `sonnet`, effort `xhigh`)
- **Reviewers:** **two** `akili-reviewer` lenses (T3 `opus`) — conformance/correctness and **fixture fidelity**. `T-07` was the user-approved **exception** to single-lens mode, and the exception earned itself: **both lenses independently FAILed on the same issue**, and each found things the other did not
- **Requirements covered:** `R-MSD-004` (`:297`, `:298`), `R-MSD-005` (`:327`, `:328`), `R-MSD-013` (`:545`, `:546`), `R-MSD-003` (`:256`, `:257`)

#### Files

| File | Change |
| --- | --- |
| `test/fixtures/innovation-use/innovation-use-section-round-trip.fixture-spec.ts` | +147 — one self-contained `it`: untouched decimal + untouched `NULL` measure, **seeded from a real read**, resaved unmodified through the real `upsertByCompositeKeys` |
| `test/fixtures/innovation-use/innovation-use-lifecycle-routines.fixture-spec.ts` | +92 — case **F13d** (`SP_versioning` copies `result_quantifications`, closes `RK-9`), plus a `result_quantifications` teardown step that was **previously missing** and without which the file would have failed on FK `1451` |
| `test/fixtures/innovation-use/oicr-quantification-save.fixture-spec.ts` | **new** — role-1 and role-2 unmodified saves, and the `L-08` expected-churn case. Band **`902_200`** |

#### Verification — the tier's own gate, re-measured by the Leader

| Check | Result |
| --- | --- |
| **`npm run test:fixtures`** | **16 suites / 80 tests**, exit 0 — **independently re-measured by the Leader twice**, once from a fresh `compose:test:down` → `up` → `bootstrap` cycle |
| `npm test -- --silent` | 355 / 2727, exit 0 — reported **separately** because `rootDir: "src"` makes the two command sets **disjoint**; `npm test` never runs a fixture |
| `npx eslint` | exit 0, after a **manual** reformat (no `--fix`, `K-001`) |
| `npm run build` | exit 0 |

#### ✅ `T-02`'s three transferred acceptance items — discharged here

The circular evidence dependency recorded at `T-02` is now closed:

| # | Item | Discharge |
| --- | --- | --- |
| 1 | `null` round-trips as `null` **both** directions, separately | Raw SQL for the `to` direction, a real service read for `from`, in both the IU and the OICR `L-08` tests |
| 2 | A read value resent verbatim does not `400`, **from a real read**, never a literal (`:257`, `DD-19`, `K-012`) | `harness.service.findOne` output resent unmodified through `harness.service.update`. **This is the item `T-02`'s own spec file states in its comments that it does not satisfy** |
| 3 | `String(value)` composite key identical before/after, through the **real** `upsertByCompositeKeys` | PK-identity assertions that hold only if the key matched, exercised through the service — never the transformer alone |

#### The falsifiers — one exemplary, one honestly half-unreachable

**Falsifier 2 is the best-constructed evidence in this spec.** Rather than *arguing* that a value-based match would be vacuous, the Implementer ran the real `SP_versioning`, then injected a positional transposition — swapping `unit`/`description` between the two copied rows **with values untouched**:

```
KEY-based match:    reddened  (Expected: -12.75 / Received: 549755813887)
VALUE-only match:   stayed GREEN under identical corruption  ("✓ ... VACUOUS")
```

Conformance lens: *"the mandated version argues vacuousness; the worker exhibited it. That is the exact content of `DD-20`/`K-20`."* One caveat recorded and deliberately **not** upgraded: a row-swap is not a corruption `SP_versioning` could produce (its copy is a set-based `INSERT … SELECT`, so a real positional fault swaps *columns*). It demonstrates **assertion sensitivity**, which is what was asked.

**Falsifier 1 is half-unreachable, and the Implementer said so instead of claiming both halves.** Removing the transformer reddened both new tests on the read shape, and a probe confirmed the resend independently throws `BadRequestException`. But the probe **also** showed PK and `is_active` unchanged — because `createCustomValidation` runs at `base-service.ts:347`, *before* the fetch (`:360`), the key map (`:380-384`), the deactivate (`:430-437`) and the save (`:448`). **Zero writes occur, so the key mismatch cannot be observed.**

Conformance lens ruling: *"a falsifier whose second conjunct cannot instantiate **because the product got safer** is discharged. What would have been unacceptable is claiming the key change was observed; the worker explicitly did not."*

#### 📌 The `DC-16` answer — and `design.md` §5.3 was wrong about what closes it

Asked what still gates `DC-16` if the key mismatch is unreachable, the conformance lens produced the most consequential finding of the task:

- The closure is **broader** than reported: **both** rule-map branches open with `typeof value !== 'number'`, so a `DECIMAL` string `400`s on **every** role and **both** write paths.
- But §5.3's *"DD-13's pipe closes that door too"* **overstates it.** The key comparison is *hydrated existing row* vs *incoming payload*. With `DD-2`'s `from` removed, an **echoing** client's key still matches — only a `400`, no replacement. The variant §5.3's own table depicts needs a client that **coerces on read**, which is exactly what `DD-3`/`T-11` guarantees. **There, validation passes and the row is replaced silently.**
- **So `DC-16` is closed by `DD-2` alone.** Not a product defect — the silent variant needs `from` removed, a state in which the round-trip fixture is already red — **and it is why the fixture asserting the read-shape invariant is the correct gate: it dominates both symptom-specific checks.**

`design.md` §5.3 amended accordingly (below).

#### The false green the fidelity lens found — a fixture that passes on the wrong schema

**`oicr-quantification-save.fixture-spec.ts` used only integer sentinels** (`87_654`, `13_579`, `null`, `0`) — and an integer hydrates to the identical JS `number` from a `bigint` column **and** from `DECIMAL(24,4)`+`DD-2`. So **the file passed unchanged on a baseline-only schema**, discharging `R-MSD-013` AC.4 / `DC-16` **on the pre-migration column shape the requirement is about.** The mirror image of T-07's own disqualifier.

**Leader ruling: required, not advisory** — it serves the task's own disqualifier (*"a green run against a schema that was not rebuilt from `baseline.sql` … is not evidence"*) rather than widening it.

Fixed with an `information_schema.columns` guard in `beforeAll`, **and the guard was proven able to redden** (baseline-only run, verbatim):

```
Expected: "decimal"
Received: "bigint"
  171 |     expect(quantificationNumberColumn.DATA_TYPE).toBe('decimal');
Test Suites: 1 failed, 1 total
Tests:       3 failed, 3 total
```

The fidelity lens then checked the guard's own fidelity, which is the part usually skipped: *"a connection with no default schema makes `DATABASE()` NULL → zero rows → `toBeDefined()` reddens. **There is no path where a missing answer reads as a passing one.**"* And it confirmed the guard covers that file's **entire** migration-dependent surface — one column, no view — *"not a sample of the surface; it is the surface."*

**Why the other two files correctly did NOT get a copy**, reasoned by disjunction so the conclusion does not rest on an unexecuted premise: a `bigint` column either rounds `-12.75` to `-13` or rejects the statement. On the rounding branch the sentinel assertions redden; on the rejection branch the seeding `INSERT` throws. **Both branches redden**, so those files self-guard.

#### 🔍 A vacuous-pass risk created by the fix for a vacuous-coverage problem

The fidelity lens checked something nobody asked it to. The three new `created_at` assertions compare `new Date(x).getTime()`. **Had the driver returned `timestamp(6)` as a string with microseconds, V8 would yield `Invalid Date` on both sides — and Jest's `toBe` uses `Object.is`, where `Object.is(NaN, NaN)` is `true`. All three assertions would have passed vacuously.**

It verified they do not: neither `orm.config.ts` nor `orm.test.config.ts` sets `dateStrings` (the only `extra` key is `namedPlaceholders`), so mysql2's default applies and `TIMESTAMP` arrives as a `Date`. The comparisons are real. The residual — `getTime()` truncating microseconds — is not reachable as a false green, because a deactivate-and-reinsert costs a round trip and the PK assertion fires first.

#### Attempt 1 → `FAIL`, both lenses, the same issue

**F13d compared against a hand-written three-column list and read only ONE side out of MySQL.** `requirements.md:318` — verified verbatim by the Leader:

> *"The copy is compared by `SELECT *` on both sides with the identity/PK columns deleted before comparing — **never against a hand-written column list** (`ADR-11` column-coverage method)."*

`DD-20` says the same. The matching-key half was implemented; the **column-coverage half was dropped.**

**Reachability, constructed by the fidelity lens:** `SP_versioning`'s copy block copies **eleven** columns; F13d asserted **one**. Strip `rq.created_by` from that block and every copied row lands `NULL` — **ADR-11 blind spot (i), the exact failure `R-MSD-005` exists to catch — and F13d stayed green.**

**Fixed, and both lenses confirmed it closes by the mechanism rather than by resemblance.** `SELECT *` both sides, trimmed of **only** `id` and `result_id` — so **all ten** remaining columns are compared, including the seven the old projection could not see. The fidelity lens re-ran its own falsifier against the new code and confirmed it now reddens. The deactivated-row exclusion became **stronger** than the remediation asked: key count (source 3 / snapshot 2) **plus** an explicit absent-key assertion, so *"the deactivated row specifically was excluded"* is asserted rather than inferred from a count two other errors could also produce. `fetchFullRow`'s `toHaveLength(1)` — the `J-20` trap in that precedent — was correctly not copied.

#### `R-MSD-013` AC.2 — the halves have different causes, and only one was T-07's

The Implementer found AC.2 unasserted and investigated why. The conformance lens then **refined the diagnosis**: the report had collapsed both halves onto `audit(BOTH)`, which is right for one and wrong for the other.

| Half | Ruling | Owner |
| --- | --- | --- |
| **`created_at`** | **Satisfiable, merely unasserted.** It is a `@CreateDateColumn` appearing in **no** `audit()` payload, so TypeORM never writes it on an update | **T-07** — now asserted by raw SQL at **three** sites (`created_at`/`created_by` are `select: false`, so raw SQL is the only route) |
| **`created_by`** | **UNSATISFIABLE against current code, and the unsatisfiability is a reachable pre-existing defect AC.2 correctly identified** | **Nobody** → routed as `AUDIT-1` |

**Mechanism, verified at source by the Leader:** `base-service.ts:440-446` applies `...audit(SetAuditEnum.BOTH)` via `.map()` to **every** row in `finalDataToSave`, including the reused/untouched branch at `:394-402`; `current-user.util.ts:57-59` shows `BOTH` returns `{ created_by, updated_by }`.

**The reachable failure is ordinary collaborative editing:** user A saves a measure row → user B opens the same section and saves **without touching it** → `created_by` becomes **B**. Authorship destroyed, silently.

Conformance lens on the routing: *"amend-plus-ticket is the correct discharge for an unsatisfiable AC… Asserting `created_by` immutability would have been the failure mode; changing a shared base class inside a fixture task would have been worse."*

⚠️ **Caveat to carry into the ticket:** the ruling is a **source-level inference**; the emitted `UPDATE` was never observed. `AUDIT-1` should be confirmed against real SQL before it is actioned.

#### Spec amendments applied for this task

| Document | Amendment |
| --- | --- |
| `requirements.md` `R-MSD-013` AC.2 | **Split.** `created_at` marked satisfiable and now asserted; `created_by` marked **UNSATISFIABLE** with the mechanism cited and the two-user sequence recorded |
| `design.md` §5.3 | *"DD-13's pipe closes that door too"* **corrected** — `DD-13` closes only the echoing-client variant; `DC-16` is closed by **`DD-2` alone**; and this is why the read-shape invariant is the right gate |
| `tasks.md` §8 *Reported, not owned* | **Three unowned findings routed for tickets:** `AUDIT-1`, `BACKUP-1` (nobody owns dropping the T-05 backup table), `OFGB-1` (`report_oicr` unusable under `ONLY_FULL_GROUP_BY`) |

⚠️ **A Leader error in those amendments, caught by review and fixed:** the AC.2 amendment routed `created_by` to *"§12's Reported, not owned list"*. `requirements.md` §12 is **Sign-off**; the list is in **`tasks.md` §8**. Corrected. **Tenth instance of unverified prose in this spec — this one the Leader's**, and the `DC-12` class exactly.

#### `ADVISORY` — recorded, non-gating

| Lens | Finding |
| --- | --- |
| **RELIABILITY — the highest-value follow-up in this task** | **F13d's stale-schema tripwire is now SOLELY the sentinel assertions.** The `SELECT *` `toEqual` **cannot** detect a `bigint` column — both sides would hold `-13`, so only `expect(Number(...)).toBe(-12.75)` reddens. **If a future reader deletes those as "already covered by the `SELECT *` comparison", F13d silently becomes schema-blind in exactly the way the OICR file was.** One clause in the comment prevents it. **Routed to `T-12`** rather than reopening a passed task |
| **RISK — forward to `T-08`** | Repeat the `information_schema` guard over **`report_oicr`**, and prove it red the same way. `T-08`'s sentinels (`10`, `-10.0000`, `NULL`) have the **same integer-blindness** the OICR file had, and the view is the *other half* of T-07's disqualifier (*"a stale view or a pre-migration column"*). Also carry: **`T-08`'s acceptance item 3 is not executable** (`migration:test:revert` cannot reach the `bigint` branch once both migrations exist — use a direct `ALTER`) |
| Documentation — `FP-45` | **The declared band is not the consumed prefix.** Every file uses `BASE + Date.now()`, so today's stored codes are ≈`903_987_xxx_xxx_xxx`. The fidelity lens **ran the arithmetic**: a collision needs `|t_i − t_j| ≥ 1e11 ms ≈ 3.17 years`, so an in-run collision is **impossible, not merely unlikely**; `result_official_code` carries no unique index and every file cleans up its own codes. **Not a defect, not ticketed** — one sentence into `FP-45` when §9 is next edited: *"a band is the BASE constant, not the stored prefix; collision safety comes from the ≥1e11 gap between bases, not from the label."* What the artifact costs is comprehension: grepping the schema for `902_200%` finds nothing and reads as "the fixture never ran" |
| Readability | The round-trip `it`'s title claims `R-MSD-004` AC.2, whose stated value `-1500` is exercised **nowhere** in the diff (`-12.75` covers sign and fraction jointly; no negative-**integer** case exists). Drop the claim or add the case |
| Reliability | The OICR fixture calls `upsertByCompositeKeys` **directly** rather than through `ResultOicrService.updateOicr`. Faithful — same method, same composite keys, same roles, verified against `result-oicr.service.ts:234-246` — and justified by `T-03`'s `git diff --exit-code` constraint on `result-oicr/`. **The limit it buys:** the fixture cannot see a defect in `updateOicr`'s own payload assembly, e.g. `data?.actual_count ?? []` resolving empty, which would take `base-service.ts:334-344` and deactivate **every** row. Record the limit; do not widen the fixture |
| Readability | `tasks.md`'s `:297`/`:327`/`:545` anchors had already rotted by two lines, **and this attempt's AC.2 amendment displaced `:545`/`:546` by four more** (`R-MSD-013`'s `BUT`/`AND IT MUST` now sit at `:551`/`:552`). §4's rule — regenerate that table **last** — attaches to `T-12` |

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| Review mode | **Parallel lenses** — the user-approved exception to single-lens mode | Vindicated: both lenses FAILed on the same F13d issue **independently**, and each found what the other missed. Conformance found the AC.2 split and the `DC-16`/§5.3 correction; fidelity found the stale-schema false green, the catalog-name race, and the `Object.is(NaN, NaN)` vacuity risk |
| An advisory promoted to **required** | The `information_schema` schema guard | It serves the task's **own** disqualifier rather than widening it — and a fixture that passes on the pre-migration schema defeats the entire tier |
| Guard required to be **proven red** | Baseline-only run | A guard that cannot fail is what this spec has paid a review round for, repeatedly |
| Environment traps scouted **before** dispatch | `FP-45` band, `FP-48` disciplines, `FP-49`, roles 1/2 absent, the `sql_mode` divergence | The child guide's `FP-45` list was **stale** — it documents bands to `900_600`; the tree had `900_000`–`900_900` plus `902_000`–`902_150` taken. Scouted and handed over **with an instruction to verify by grep**, since `FP-45`'s own rule is not to trust a second-hand list |
| Advisory **not** actioned by reopening | F13d's sentinel-deletion fragility | Both lenses had already PASSed. Reopening for a comment clause would cost three rounds against a spec already over its review budget; routed to `T-12`, which owns closure |

---

### T-08 — Fixture: `report_oicr` / `report_field` rendering, executed against real MySQL

- **Status:** ✅ **PASS** (`T-08`). Converts `U-1` and `U-5` from **reasoned** to **executed** (`design.md` §17 updated below).
- **Date:** 2026-08-27
- **Implementer attempts:** 1 (`akili-implementer`, T2 `sonnet`, effort `xhigh`)
- **Requirements covered:** `R-MSD-010` (`:461`, `:462`, `:463`)
- **Design references:** `DD-10`, §9.1, §9.2, `DD-11`, `DC-7`, `DC-14`, `U-1`, `U-5`, `U-8`

#### File

**New:** `server/researchindicators/test/fixtures/innovation-use/report-oicr-number-rendering.fixture-spec.ts`

#### Container cycles

| Cycle | Command | Why |
| --- | --- | --- |
| 1 | `compose:test:down` → `compose:test:up` → `migration:test:bootstrap` | The one required fresh cycle (`FP-49` — bootstrap is not idempotent). Ran to a container with T-05 (decimal column) and T-06 (guarded view) both applied |
| 2 | `migration:test:revert` (once) | To force the view back to its bare, pre-T-06 body and capture the **view guard's** red, without a full teardown |
| 3 | `migration:test:execute` (once) | Reapplied T-06 alone (the only migration pending after cycle 2), restoring the guarded view |
| 4 | Manual `ALTER TABLE result_quantifications CHANGE quantification_number quantification_number bigint NULL, ALGORITHM=COPY` (via `docker exec ... mysql`), then the inverse `ALTER ... decimal(24,4) NULL` | To force the **column-shape guard's** red against a real bigint column, without touching the fixture's own code — see disqualifier below for why this could not be done from inside the file itself |

No second `compose:test:down`/`up`/`bootstrap` cycle was needed — `migration:test:revert`/`:execute` and a manual `ALTER` are documented, repeatable operations against an already-bootstrapped container, not the bootstrap script itself.

#### Band claimed

`902_300`, for `results.result_official_code`. Grep proving it free, run immediately before choosing (`FP-45` — the guide's own list is stale, verify by grep):

```
$ grep -n "902_" test/fixtures/innovation-use/*.fixture-spec.ts
innovation-use-edit-plus-add-id-collision.fixture-spec.ts: … 902_000 … 902_1xx … through 902_150
oicr-quantification-save.fixture-spec.ts:27:… 902_000-902_150 are taken …
oicr-quantification-save.fixture-spec.ts:30: `902_200` is free — grepped …
oicr-quantification-save.fixture-spec.ts:112:  const actingUserId = 902_200_000;
```

`902_000`–`902_200` are the only `902_` values in use across every sibling header; `902_300` appears nowhere. Confirmed again after the file was written (`grep -n "902_3" test/fixtures/innovation-use/*.fixture-spec.ts` → only this file's own header/declarations).

#### Roles/rows seeded

- `quantification_roles` ids **1** (`actual_count`) / **2** (`extrapolate_estimates`), lowercase, via `INSERT IGNORE` — matching `1760653582914-createQuantificationTables.ts:23` and the correction `oicr-quantification-save.fixture-spec.ts` made at its own rework attempt 2. Never deleted (shared, permanent scratch catalog rows).
- `results` rows: `is_active=1`, a unique `result_official_code` in the `902_300` band, `platform_code=NULL`, `report_year_id=NULL`, `is_snapshot=0`, `result_status_id=NULL`, **`indicator_id=NULL`** (see below).
- `result_quantifications` rows under roles 1/2, seeded directly via raw SQL (bypassing every DTO/service validator) — including two force-seeded **fractional** role-1 rows (`2.5000`, `-0.7500`) to exercise `DD-10`'s declared-defensive `TRIM` branch, which is unreachable in production (`DD-12`+`DD-13` hold roles 1/2 to integers). Labelled as such in the file; not evidence roles 1/2 can hold fractions in the running app.
- Phase B's bigint-column case/falsifier rows are seeded into a **session-scoped `CREATE TEMPORARY TABLE`**, never into `result_quantifications` — see "Item 3's method" below for why.

**`indicator_id = NULL`, not `5` — reasoned then confirmed by execution, not merely reasoned.** `report_field`'s first line is `IF NOT COALESCE(applies, TRUE) THEN RETURN 'Not applicable'`. `root.indicator_id = 5` evaluates SQL `NULL` when `indicator_id` is `NULL`, and `COALESCE(NULL, TRUE)` is `TRUE`, so the "not applicable" branch is skipped — identically to `indicator_id = 5`. Every render in the seven-case table below is the **executed** confirmation of this: none show `Not applicable`.

#### `sql_mode` handling

Statement, issued once in `beforeAll` on a **dedicated `QueryRunner`** (not the shared connection pool — `orm.config.ts` sets no `connectionLimit`, so a `SET SESSION` via `dataSource.query()` is not guaranteed to survive to the next pooled call):

```sql
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'
```

**Dev-fidelity note.** This is not a workaround — it is what `T-06` measured Dev to actually run: `@@SESSION.sql_mode = STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION`, with **no** `ONLY_FULL_GROUP_BY`. The container (`mysql:8.0`, measured `8.0.46` by `T-05`) carries the full MySQL 8 default including `ONLY_FULL_GROUP_BY`, under which `report_oicr` cannot be `SELECT`ed at all — its untouched, pre-existing `treo` sub-select trips `1055` on `teo.external_id` (verified pre-existing by the Leader on a fresh baseline with `T-06`'s file removed and zero migrations applied; ticketed `OFGB-1`, out of this task's scope). Dropping `ONLY_FULL_GROUP_BY` for this session therefore makes the fixture **more** faithful to Dev, not less.

#### Column-shape guard, per phase — code + verbatim red

**Phase A** (expects `decimal(24,4)`):

```ts
async function assertColumnShape(expected: 'decimal'): Promise<void> {
  const [column] = await runner.query(
    `SELECT DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE
       FROM information_schema.columns
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'result_quantifications'
        AND COLUMN_NAME = 'quantification_number'`,
  );
  expect(column).toBeDefined();
  expect(column.DATA_TYPE).toBe(expected);
  expect(Number(column.NUMERIC_PRECISION)).toBe(24);
  expect(Number(column.NUMERIC_SCALE)).toBe(4);
}
```

Demonstrated red by manually running `ALTER TABLE result_quantifications CHANGE quantification_number quantification_number bigint NULL, ALGORITHM=COPY` against the live container, then running Phase A alone (`npx jest --config test/jest-fixtures.json report-oicr-number-rendering -t "Phase A"`):

```
expect(received).toBe(expected) // Object.is equality

Expected: "decimal"
Received: "bigint"

  205 |     );
  206 |     expect(column).toBeDefined();
> 207 |     expect(column.DATA_TYPE).toBe(expected);
      |                              ^
  208 |     if (expected === 'decimal') {
  209 |       expect(Number(column.NUMERIC_PRECISION)).toBe(24);
  210 |       expect(Number(column.NUMERIC_SCALE)).toBe(4);
    at assertColumnShape (fixtures/innovation-use/report-oicr-number-rendering.fixture-spec.ts:207:30)
```

Restored (`ALTER ... decimal(24,4) NULL, ALGORITHM=COPY`) and re-ran clean before continuing.

**Phase B** (expects `bigint`, on the file's own private `CREATE TEMPORARY TABLE`, not `result_quantifications` — see "Item 3's method"):

```ts
async function assertBigintProbeTableIsGuarded(): Promise<void> {
  const [column] = await runner.query(
    `SHOW COLUMNS FROM \`${BIGINT_PROBE_TABLE}\` WHERE Field = 'quantification_number'`,
  );
  expect(column).toBeDefined();
  expect(column.Type).toBe('bigint');
}
```

Demonstrated red by temporarily declaring the probe table's column `DECIMAL(24,4)` instead of `BIGINT` and running Phase B alone:

```
expect(received).toBe(expected) // Object.is equality

Expected: "bigint"
Received: "decimal(24,4)"

  263 |     );
  264 |     expect(column).toBeDefined();
> 265 |     expect(column.Type).toBe('bigint');
      |                         ^
    at assertBigintProbeTableIsGuarded (fixtures/innovation-use/report-oicr-number-rendering.fixture-spec.ts:265:25)
```

Reverted and re-ran clean.

#### View guard — code + verbatim red

```ts
async function assertViewIsGuarded(): Promise<void> {
  const [view] = await runner.query(
    `SELECT VIEW_DEFINITION
       FROM information_schema.views
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'report_oicr'`,
  );
  expect(view).toBeDefined();
  const body = String(view.VIEW_DEFINITION).toLowerCase();
  expect(body).toContain('truncate(');
  expect(body).toContain('trim(');
}
```

Demonstrated red by running `migration:test:revert` (reverts `T-06` alone — it is the last migration in the tree; `T-05` stays applied), then Phase A alone:

```
expect(received).toContain(expected) // indexOf

Expected substring: "truncate("
Received string:    "select `root`.`result_id` as `result_id`,`report_field`(`ro`.`general_comment`,true,(`root`.`indicator_id` = 5)) as `general_comment`, … `report_field`(`rq`.`quantification_number`,true,true) … "
    (the bare, un-guarded pre-T-06 body — no `truncate(`/`trim(` anywhere)

  223 |     // DD-10's expression is the only place `truncate(`/`trim(` appear in
  224 |     // this view — a stale (bare, pre-T-06) body has neither.
> 225 |     expect(body).toContain('truncate(');
      |                  ^
    at assertViewIsGuarded (fixtures/innovation-use/report-oicr-number-rendering.fixture-spec.ts:225:18)
```

Reapplied via `migration:test:execute` (T-06 was the only pending migration) and re-ran clean.

#### The seven cases — verbatim query output

All via the real, live `report_oicr` view (Phase A, six cases) or DD-10's expression transcribed verbatim from the migration and run against a session-scoped `bigint` `CREATE TEMPORARY TABLE` (Phase B, the seventh case — see "Item 3's method"):

| # | Input | Rendered `quantifications` column (verbatim) |
| --- | --- | --- |
| 1 | `10.0000` (decimal column) | `• Number: 10, Unit: sentinel-unit, Comment: sentinel-description` |
| 2 | `-10.0000` (decimal column) | `• Number: -10, Unit: sentinel-unit, Comment: sentinel-description` |
| 3 | `2.5000` (decimal column, force-seeded) | `• Number: 2.5, Unit: sentinel-unit, Comment: sentinel-description` |
| 4 | `-0.7500` (decimal column, force-seeded) | `• Number: -0.75, Unit: sentinel-unit, Comment: sentinel-description` |
| 5 | `0.0000` (decimal column) | `• Number: 0, Unit: sentinel-unit, Comment: sentinel-description` |
| 6 | `NULL` (decimal column) | `• Number: Not provided, Unit: sentinel-unit, Comment: sentinel-description` |
| 7 | `10` (bigint column, via `CREATE TEMPORARY TABLE`) | `10` (bare `report_field(...)` result — no `CONCAT_WS` wrapper needed for this phase; see file header) |

All seven match `design.md` §9.2's predictions exactly.

#### Case-count assertion

```ts
it('case-count assertion: all seven DD-10 cases from design.md §9.2 were actually executed, not merely absent of failure', () => {
  expect(executedCases).toEqual([
    '10.0000', '-10.0000', '2.5000', '-0.7500', '0.0000', 'NULL', 'bigint 10',
  ]);
  expect(executedCases).toHaveLength(7);
});
```

Each `it` above pushes its own label into `executedCases` as its last statement, so a case that is skipped or never reached (rather than one that ran and asserted something wrong) fails this assertion too, even though nothing else would have gone red for that reason.

#### Falsifier (bare trim vs guarded, bigint column) — verbatim

Run against the **same** `bigint`-column rows in the private `CREATE TEMPORARY TABLE`:

```
tenRow.bare_trim  = '1'    (expected '10' — REDDENS, exactly DC-14's failure mode)
tenRow.guarded    = '10'   (DD-10's expression, unaffected)
zeroRow.bare_trim = ''     (the nastier corruption — an empty string, which
                            report_field(..., TRUE, TRUE) renders 'Not provided')
zeroRow.guarded   = '0'    (DD-10's expression, unaffected)
```

Both assertions pass — i.e. the bare trim's wrong values (`'1'`, `''`) are exactly what a test asserting the **migrated-column expectation** (`'10'`, `'0'`) against it would redden on, and DD-10's guarded expression on the identical rows does not.

#### `U-8` — executed evidence

`report_oicr` queried with both a `CAST`-branch row (integer `10`) and a `TRIM`-branch row (force-seeded fractional `12.34`) in the same `SELECT`, immediately followed by `SHOW WARNINGS`:

```
errors (Level = 'Error'):        []
collationErrors (Code = 1267):   []
```

No `1267`, no new warnings. Per `T-06`'s attribution (carried forward, not re-derived): neither raw collation readout (the measuring session's `collation_connection`, or the view column's — fixed by `report_field`'s own `utf8mb4_unicode_ci` declaration) can detect a branch mismatch; only the **absence of `1267` with both branches executed** settles `U-8`, and that is what this test asserts.

#### `design.md` §17 — before/after

**U-1** — before: *"Predicted, not executed. No MySQL was reachable while authoring…"* — after: **✅ VERIFIED by execution (T-08)**, all seven renders matching §9.2 exactly, cited to this fixture file.

**U-5** — before: *"Reasoned, not executed…"* — after: **three of the four properties (Exact, `down()`-safe, Type-stable) VERIFIED by execution**, cited to the falsifier and the `U-8` result; **Version-portable named as residue** — it was never an execution claim (it is about which MySQL version introduced the syntax used, not about what this container proves), so it is not something `T-08` could close by running SQL, and the row says so rather than papering over it.

Per the brief's explicit scope restriction, **only `U-1` and `U-5` were touched** — `U-8`'s row in §17 (currently "Unsettled") was deliberately **not** edited, even though this task also answers it; the answer lives in this section and the `U-8` test above.

#### Item 3's method — `tasks.md`'s framing is wrong, twice over

**First correction (carried from `T-06`, confirmed again here):** acceptance item 3 asks for the `bigint` branch "via `migration:test:revert`". Impossible with both `T-05`/`T-06` in the tree — revert is LIFO; one revert removes only `T-06` (view stays bare, column stays `decimal`), two reverts remove the expression **and** the column change together. There is no revert depth that yields "the new view over a `bigint` column".

**Second correction, made in this task, after measuring what the first one's prescribed workaround (a direct `ALTER` on the shared scratch schema, `T-06`'s own precedent) costs when it is a *committed, automatically-collected* fixture rather than a one-off Leader-run verification.** An early draft of this file did exactly what `T-06` did and the brief suggested: `ALTER TABLE result_quantifications ... bigint`, run the case, `ALTER` back. Measured directly by running `npm run test:fixtures` five times with that draft in place:

```
Run 1: Test Suites: 1 failed, 16 passed, 17 total   (Tests: 1 failed, 89 passed)
Run 2: Test Suites: 1 failed, 16 passed, 17 total   (Tests: 7 failed, 83 passed)
Run 3: Test Suites: 1 failed, 16 passed, 17 total   (Tests: 2 failed, 88 passed)
Run 4: Test Suites: 17 passed, 17 total
Run 5: Test Suites: 17 passed, 17 total
```

**4 of 5 runs failed**, always the same underlying defect —
`innovation-use-level-boundary.fixture-spec.ts` (and, in run 2, other siblings too) throwing:

```
QueryFailedError: Table definition has changed, please retry transaction
    at Query.onResult (../src/driver/mysql/MysqlQueryRunner.ts:246:33)
```

MySQL `1412` (`ER_TABLE_DEF_CHANGED`) — this file's `ALTER` on the **shared** `result_quantifications` table invalidating a concurrently-running sibling's mid-transaction table-definition snapshot. `npm run test:fixtures` carries no `--runInBand`/`maxWorkers`, so Jest's default parallelism made this collision real, not hypothetical, and it recurred in 4 of 5 runs — not a rare edge case.

**Resolution (this file's final form): Phase B never touches `result_quantifications`.** It runs `DD-10`'s expression — copied verbatim from `1787270000000-normaliseQuantificationNumberInReportOicr.ts:133` — against a session-scoped `CREATE TEMPORARY TABLE` with its own `quantification_number BIGINT NULL` column. `TEMPORARY TABLE`s are invisible to every other connection (confirmed empirically: `information_schema.columns` returns **zero** rows for one, even from the same session that created it — `SHOW COLUMNS`/`DESCRIBE` is what that session must use instead), so the collision above is structurally impossible against it. Re-ran `npm run test:fixtures` **five** times with this final design: **17/17 suites, 90/90 tests, every run.**

This still satisfies `R-MSD-010` AC.5 / `DC-14` in substance — a real, executed query against a genuine `bigint` column in the same real MySQL — it only stops short of invoking the object literally named `report_oicr` for this one case; transcription fidelity between the migration text and the deployed view was already established byte-for-byte by `T-06`'s `SHOW CREATE VIEW` diff, and Phase A above re-confirms the live view itself for the six cases that do not need a `bigint` column. **Routed as `TESTFIX-1`** in `tasks.md` §8 (Reported, not owned) — the structural fix (serialising `test/jest-fixtures.json`) is an infra decision wider than this task, named for the Leader rather than applied unilaterally.

#### `test:fixtures` / `npm test` / `eslint` / `build`

| Check | Command (from `server/researchindicators`) | Result |
| --- | --- | --- |
| Fixture gate | `npm run test:fixtures` | **17 suites / 90 tests, exit 0** — re-run **5 times**, all green (see above) |
| Isolated file | `npx jest --config test/jest-fixtures.json report-oicr-number-rendering` | 1 suite / 10 tests, exit 0 |
| Collateral check | `npm test -- --silent` | **355 suites / 2727 tests, exit 0** — identical totals to `T-07`'s own measurement; `rootDir: "src"` means this never runs the new fixture |
| Lint (bare gate, `K-001`) | `npx eslint test/fixtures/innovation-use/report-oicr-number-rendering.fixture-spec.ts` | exit 0 (one Prettier finding fixed by hand, not via `--fix`, then re-verified clean) |
| Build | `npm run build` | exit 0 (`nest build` + `vite build`, admin bundle unaffected) |

#### Cannot reach (`KZ-017`)

- **Dev/Prod are not reachable from this fixture** — every render above is against the disposable scratch container (`mysql:8.0.46`); Dev is `8.0.45` (measured by `T-06`) and is not queried here.
- **This fixture cannot prove the literal deployed `report_oicr` object renders the `bigint`-column case** — only that `DD-10`'s expression, transcribed verbatim, does so against a genuine `bigint` column. The gap is closed by `T-06`'s separate byte-for-byte transcription proof, not by this file.
- **`OFGB-1`** (`report_oicr` unusable under `ONLY_FULL_GROUP_BY`) is pre-existing, out of scope, and not fixed here — this file works around it via `sql_mode`, per the file header's Dev-fidelity note.
- **`U-5`'s "Version-portable" property** is not something an executed query against one MySQL instance can settle (see §17 edit above) — named as residue, not closed.
- **The `AUDIT-1`/`BACKUP-1` findings from `T-07`** are untouched by this task; not re-verified here.

#### Not Done / Assumptions

- **`tasks.md` acceptance item 3's literal method ("via `migration:test:revert`") was not used — its executable equivalent was, and the reasoning is recorded above and in the file header, not silently substituted.**
- **A second, novel finding beyond the brief's three carries: `TESTFIX-1`** (the shared-table-`ALTER`-inside-a-committed-fixture hazard, measured at a 4-of-5 failure rate with an early draft). Resolved in this file by design (private `CREATE TEMPORARY TABLE`, not the shared table); routed to `tasks.md` §8 as reported-not-owned since the structural fix (serialising `test/jest-fixtures.json`) is wider than this task.
- **`design.md` §17's `U-8` row was deliberately left untouched**, per the brief's explicit restriction to `U-1`/`U-5` — `U-8` is answered in this section instead.
- Nothing else assumed or left incomplete.

#### Reviewer gate — `T-08` — Reviewer: **PASS** (attempt 1)

**Single merged lens** (conformance + correctness + operational risk) — the user-approved budget mode; `T-07` was the parallel-lens exception. The reviewer was told it carried both perspectives.

**It verified nine claims from source rather than accepting the report**, including the ones that could have made the story coincidence: Phase B's inlined SQL is identical to migration `1787270000000:133` modulo the `rq.` alias and whitespace; `report_field`'s body really does return `'Not applicable'` on a false gate (`baseline.sql:6559-6577`) — **plus a third sentinel the report did not name, `'Not mandatory'` (`:6573`)**; the named flakiness victim really does write `result_quantifications` transactionally (`innovation-use-level-boundary.fixture-spec.ts:47`, `:168`, `:187`); `test/jest-fixtures.json` really sets no `maxWorkers` and no `runInBand`; no other committed fixture performs DDL; band `902_300` is free; and the manual restore `ALTER` was byte-identical to `T-05`'s `up()`, so the scratch schema was not left drifted.

**Its four rulings on `TESTFIX-1`:**

1. **The diagnosis is credible and `1412` is the right mechanism.** `ER_TABLE_DEF_CHANGED` is what MySQL raises when a session's cached table definition is invalidated under it rather than blocking. *"The diagnosis does not rest on that reasoning anyway: the error string, the errno, the named victim, a 4/5 reproduction rate, and 5/5 green after removing the `ALTER` are a controlled A/B."*
2. **The temp-table substitution discharges `DC-14` and item 3**, and it could not construct a property now proven nowhere. `AC.5`'s claim is *expression*-level and is now executed at expression level; `T-06` separately proved deployed-view-text ≡ migration-text byte-for-byte, so the evidence **composes**.
3. **Routing `TESTFIX-1` to §8 was correct** — nothing in this spec owes the fix, since no committed fixture performs shared-table DDL. **But §8 is the wrong home**: *"§8 of a spec headed for `docs/specs/archive/` is where this knowledge dies"* (the spec's own `KZ-013`). **Acted on — see below.**
4. **It does NOT invalidate `T-06` or `T-07`.** The distinction is mechanical, not rhetorical: `1412` requires a **concurrent** session holding an open definition. `T-06`'s `ALTER` ran solo via `docker exec` outside the Jest runner; `T-07` performed no DDL. *"`T-06`'s evidence is untouched; what is now known is that its method does not survive being committed as parallel-collected test code."*

**On the two questions where I suspected under-delivery, it ruled against me — with reasons:**

- **`U-5`'s "Version-portable" residue is honest, not an under-delivery.** *"It is settleable, but not by execution… running it on 8.0.46 and 8.0.45 shows presence at those two versions and can never show presence at the 8.0.4 floor. Calling that residue rather than claiming a verify is the correct and more honest of the two available moves — the under-delivery would have been marking it verified because the container ran it."* If it is to be closed, close it **by citation**, not another run.
- **`U-1` → verified is the right status.** `U-1`'s claim is *"§9.2's expected renders"* — seven **value→string** predictions, not seven view invocations. All seven executed, count-pinned, matched; the differing instrument for one is stated inline in §17's own row, which *is* the partial marker. *"Do not add a partial flag to `U-1`; it would misdescribe the residue as an execution gap."*
- **The case-count assertion is sound and is not the weakest link.** Ordering is deterministic (Jest runs a describe's children in declaration order, never interleaving within a file), a `push` is the last statement in every `it` so an assertion throw yields **both** a red test and a short array, a red `beforeAll` guard reddens the count too, and `-t`/`--bail` filtering makes the count test **absent, never falsely green**. The only fragilities are false-**red** or drift-blindness — *"neither can manufacture a green."*

#### The two gaps it named precisely — both reachable, both advisory

| Gap | Detail |
| --- | --- |
| **Role 2 is executed NOWHERE, and the view-body guard cannot cover for it** | `report_oicr` carries `DD-10` at **two** sites — `1787270000000:133` (role 1 → `quantifications`) and `:140` (role 2 → `extrapolated_estimates`). **Every seed in this fixture is role 1.** The guard checks only that `truncate(`/`trim(` appear *somewhere*, so **a half-patched body — `:133` carrying `DD-10`, `:140` left bare — passes the guard, all six renders, and the count.** Constructed reachability. One `it` seeding role 2 and asserting `extrapolated_estimates` closes both the coverage gap **and** the guard's blind spot. Pointedly: *"the file already seeds role 2's catalog row and then never uses it"* |
| **The fixture-string ≡ migration-string link is pinned by nothing** | Phase B inlines a **hand-retyped** copy. Correct today (the reviewer diffed it); nothing verifies it tomorrow. Reachable: edit either side and Phase B stays green while the deployed view is wrong. Closeable in ~8 lines by reading the migration file at runtime and asserting containment after normalising whitespace and the alias. **The file's own justification defends against the wrong comparison** — it argues a diff against MySQL's *re-normalised view text* would not compare like for like, which is true and irrelevant; the comparison worth making is against the **migration file's** text, which is a plain file read |

#### Two findings about the EVIDENCE, not the code — and both are about my own handling

**1. One assertion in the file cannot redden for its stated reason.** `expect(collationErrors).toHaveLength(0)` — because **`1267` aborts the statement**, so it surfaces as a thrown error and can never appear in a `SHOW WARNINGS` taken *after* a successful `SELECT`. It is *"the one assertion in the file whose red was **not** demonstrated (K-004)."* The **conclusion is still correct**, carried by the statements executing without throwing. Recorded in §17's `U-8` row as an honest residue.

One detail worth crediting: `SHOW WARNINGS` reads the **previous statement's** diagnostics on the **same connection**, so this test *"would have been silently vacuous on a pooled `dataSource.query`"* — the dedicated `QueryRunner` is load-bearing here, not merely convenient for the temp table.

**2. Two of the three pasted guard reds came from an ANCESTOR of the committed file, and the offsets reconcile exactly.** The transcript shows the failing `expect` at `:207` with a since-removed `if (expected === 'decimal')` at `:208`; the committed file has it unconditional at `:237`. The view guard's red shows `:225`; committed is `:253`. **Δ30 and Δ28 reconcile precisely** to ~30 lines of later header growth minus the 2-line conditional. So the reds **transfer** — the failing statements are textually identical, and dropping the conditional makes the guard *strictly stronger* — but **strictly, the committed guards' red was never observed, only their ancestors'.**

> The reviewer's framing, which is the lesson worth keeping: **"a stale transcript is how a 'proven red' claim quietly detaches from the code it certifies."**

#### Leader-owned actions taken on this verdict

| Action | Detail |
| --- | --- |
| **`design.md` §17's `U-8` row rewritten** | It read **"Unsettled"** while `U-5`'s new row two rows above described `U-8` as *"answered the same way"* — **§17 contradicted itself.** Now recorded as answered by execution across `T-06`/`T-07`/`T-08`, **with the attribution the reviewer insisted on**: not the session-`collation_connection` readout, not the view-column readout (structurally unable to detect a mismatch), but *both branches executing with no `1267` and no new warnings* — plus the structural reason there are no two collations to aggregate, and the `impact_area` `convert(… using utf8mb3)` correctly identified as a **wrapper**-level mix rather than a branch mix. The `SHOW WARNINGS` residue is recorded there too |
| **`TESTFIX-1` re-homed and broadened → `FP-51`** | Copied into **`server/researchindicators/src/CLAUDE.md` §9** beside `FP-45`/`FP-48`/`FP-49`, *"where the next fixture author actually reads"*, rather than left only in a §8 headed for the archive. **Broadened as the reviewer specified:** the hazard is *any* DDL against the shared scratch schema during a `test:fixtures` run, not only a fixture's own `ALTER` — and it records that `test/support/t13-schema.ts:74-80` already contains a committed `DROP TABLE … results` reachable by running `test:integration` concurrently. It also records that a one-off `ALTER` **outside** the runner is still fine (so `T-06`'s method is not condemned), the measured 4/5 → 8/8 A/B, and an explicit **"do not fix this with `maxWorkers: 1`"** |

#### `ADVISORY` — recorded, non-gating

| Finding | Note |
| --- | --- |
| **Role-2 coverage + the string-provenance pin** | The two reachable gaps above. **Not actioned by reopening a passed task** — both are strengthenings, no acceptance item mandates either, and the spec is 40% over its review budget. **Escalated to the user** as the highest-value remaining work in this tier |
| `assertPhaseBIsGuarded()` (fixture `:133`) **resolves to nothing** | The function is `assertBigintProbeTableIsGuarded()`, and it *is* a runtime check, so the sentence's *"TSDoc-adjacent, not runtime"* also misdescribes it. `FP-50`'s corollary — *"an anchor is only an anchor if it resolves"* — and *"the worst place in the file for a dangling name"*, since that sentence carries the substitution's central disclosure. One-line fix, routed to `T-12` |
| Anchor rot, pre-existing | The fixture header, `execution.md` `### T-08` and `tasks.md` §4 all cite `R-MSD-010` as `:461`/`:462`/`:463`; the clauses now live at `:463`/`:464`/`:465`. **Copied faithfully from `tasks.md`, not introduced here.** Flagged so `T-12`'s sweep does not treat these three as already correct |
| `report_field`'s third sentinel | `'Not mandatory'` (`baseline.sql:6573`) exists alongside `'Not applicable'` and `'Not provided'`. Not named in the fixture's reasoning, though the reason-then-confirm conclusion holds: **every** failure mode is a distinct literal, none of which is a plausible measure |

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| Review mode | **Single merged lens** | User-approved budget mode. It held: the reviewer produced operational findings (the `1412` mechanism, the `SHOW WARNINGS` vacuity, the stale-transcript observation) that would previously have been a second lens's |
| **A Leader briefing error, corrected by the worker's measurement** | I instructed the direct `ALTER`, citing `T-06`'s precedent | **The instruction was wrong in a fixture context** — `T-06` ran solo, fixtures run in parallel. The worker followed it, **measured `test:fixtures` five times, saw 4/5 fail**, diagnosed the sibling collision and redesigned. It improved on its instructions rather than following them into a defect, and disclosed the trade instead of hiding it |
| Stability re-measured by the Leader | 3 consecutive runs | `17 suites / 90 tests`, exit 0, **zero `1412`** each. With the worker's 5, **eight clean runs** of a suite that was failing 4-in-5 before the redesign |
| Advisories **not** actioned by reopening | Role-2 coverage, string pinning, the dangling anchor | The task PASSed; reopening costs rounds a 40%-over budget cannot spare. Two routed to `T-12`, the two substantive gaps escalated to the user |

---

### T-09 — `app-input`: `max` becomes an `@Input()`; the character guard is asserted UNCHANGED

- **Status:** ✅ **PASS on attempt 2** (`T-09` — Reviewer: **PASS**). **First client task in this spec.**
- **Date:** 2026-08-27
- **Implementer attempts:** 2 (`akili-implementer`, T2 `sonnet`, effort `xhigh` then `high`)
- **Reviewer:** one `akili-reviewer`, **single merged lens** (the user-approved budget mode)
- **Requirements covered:** `R-MSD-012` (AC.2, AC.4 — **not AC.1**, see carries), `R-MSD-006` (`:362`, `:363`, **AC.3 partially**, AC.5, AC.6)

#### The production change is one line

`input.component.ts:52` — `max = Number.MAX_SAFE_INTEGER;` → `@Input() max = Number.MAX_SAFE_INTEGER;`. Plus a spec-pointer comment. **Everything else in the diff is test code.**

**Inert by construction, Leader-verified:** `[max]` is bound at exactly **one** place in the whole client (`input.component.html:47`), and the reviewer additionally confirmed **no static `max=` attribute exists on any `app-input` anywhere** — so no call site's behaviour can change.

#### ⚠️ A naming trap in this file, flagged in the brief before work began

`input.component.ts:48` declares `MAX_SAFE_INTEGER = 18` — a constant **named** for the JS limit while **equalling** the guard's character threshold. The real `Number.MAX_SAFE_INTEGER` sits four lines below at `:52`. The falsifier says *"change the guard's threshold from 18 to 19"*; aimed at `:52` it would have reddened nothing. **`:48` was not touched** — confirmed by the reviewer.

#### `DD-14`'s scale table — Leader-computed and handed over, so it could not be derived wrong

| scale | ⌈log₂(10^s)⌉ | max |
| --- | --- | --- |
| 0 | 0 | **9,007,199,254,740,991** (= `Number.MAX_SAFE_INTEGER`) |
| 1 | 4 | 562,949,953,421,311 |
| 2 | 7 | 70,368,744,177,663 |
| 3 | 10 | 8,796,093,022,207 |
| 4 | 14 | **549,755,813,887** |

Scale 0 equals `MAX_SAFE_INTEGER` **as a consequence of the formula**, which is what AC.2 requires demonstrated — and the test proves it *through the same code path*, with no `scale === 0` branch.

#### 📌 `R-MSD-006` AC.3 was AMENDED mid-task, and the error was found by the Implementer's own honesty

The Implementer's `KZ-017` declaration disclaimed AC.3's universal quantifier and noted other in-bound 18-character renderings were *"constructible in principle."* **The Leader constructed them and measured the guard** (`value.toString().length >= 18`, `:167`):

```
scale 0: "-9007199254740990"   len=17  inBound=true  -> no warning
scale 1: "-562949953421310.5"  len=18  inBound=true  -> WARNS
scale 2: "-70368744177662.99"  len=18  inBound=true  -> WARNS
scale 3: "-8796093022206.999"  len=18  inBound=true  -> WARNS
scale 4: "-549755813886.9999"  len=18  inBound=true  -> WARNS
```

**AC.3's Round-4 rewrite — which confined the false positive to scales 3–4 — was itself false.** The defect fires at **scales 1–4**; only scale 0 is clean, and clean **by arithmetic** (16-digit bound + sign ≤ 17 chars), not by design.

> **This is the SECOND correction of AC.3, and the first one was still wrong.** Round 4 proved the original universal form unsatisfiable and fixed the *direction* of the claim but not its *extent*. Same shape as `T-04`, where the repair for one inverted claim introduced another. **`requirements.md` AC.3 amended**, and it records that this **widens `RK-16`**: the false positive is a property of *character length against a fixed threshold of 18*, not a scale-3/4 edge case.

**`T-09`'s tests are correct and are NOT invalidated.** The reviewer re-derived every literal independently and confirmed each assertion is a true statement about the value it names, with the length re-asserted in-test so a mis-transcribed literal reddens.

**A property the tests prove that nobody claimed:** scale 0's value and scale 3's value **both have 16 digits**, and one warns while the other does not — *"a behavioural proof that the guard counts characters, not digits, which is exactly the premise `K-09` got wrong twice."*

#### Attempt 1 → the Reviewer PASSed, and the Leader reopened it on the Reviewer's own finding

The reviewer flagged that **a gate the client child guide mandates was missing from the Leader's brief**: `npx tsc -p tsconfig.spec.json --noEmit`. Nothing the Leader asked for type-checks spec code — `eslint` ignores `*.spec.ts`, `ts-jest` runs `isolatedModules: true`, and `tsconfig.app.json` has `files: [src/main.ts]`. **~245 lines of new spec code were checked by nothing.**

**The Leader ran it. Four real errors, all in T-09's new code:**

```
input.component.spec.ts(947,20): error TS7031: Binding element 'max' implicitly has an 'any' type.
input.component.spec.ts(947,25): error TS7031: Binding element 'value' implicitly has an 'any' type.
input.component.spec.ts(962,20): …
input.component.spec.ts(962,25): …
```

**Mechanism, confirmed from source by the reviewer:** `fakeAsync(fn: Function)` contextually types its argument as `Function`, which supplies **no** parameter types, so the destructured bindings fall to `noImplicitAny`. The sibling `it.each` at `:901` destructures `{ scale, expectedMax }` with no annotation and is **error-free** — because it is not `fakeAsync`-wrapped.

**This was the Leader's second briefing omission of the run**, after instructing T-08 to use a shared-table `ALTER` that broke sibling fixtures. Both were caught downstream.

#### Attempt 2 — three fixes, plus a fourth the Implementer found itself

1. **The four type errors, fixed at the root.** A declared `type SignedBoundaryCase` shared by the case arrays *and* both callbacks — sidestepping the inference loss rather than suppressing it. **No `any`, no `@ts-ignore`.** Leader-verified: total `938 → 934`, file-scoped grep **EMPTY**.
2. **The `KZ-014` titles, reshaped better than the retitle asked for.** The reviewer had flagged `'scale $scale — an in-bound signed value renders NO "Maximum reached" warning'` as a universal now measured false. Rather than renaming, the Implementer made the title **self-verifying**: `'scale $scale — a $chars-character in-bound value stays under the 18-character guard'`, with a `chars` field (17/16/15) per row **asserted in-body** as `toBe(chars)`, replacing the looser `toBeLessThan(18)`. Reviewer: *"the predicate can no longer be generalised… stronger than the retitle I proposed."*
3. **A comment that disclaimed the assertion it then made** — the `MAX_SAFE_TEXT === 40000` class read was dropped. **The reviewer checked what that removal cost and found it costs nothing:** the 40,000 threshold is still pinned **behaviourally, by a literal**, at `:274-286` (`'a'.repeat(40000)` → `shouldPreventTextInput` true). *"`R-MSD-006` AC.5's 'text path untouched' is better covered now than before."*
4. **Unprompted, the Implementer found a fresh instance of the same defect class in the adjacent sentence** — the disclaimer's tail asserted a production-code **structure** fact (*"still two `if`/`else if` arms of ONE effect … neither was split apart or duplicated"*) that the test does not inspect. It rewrote that too and **disclosed it as a judgment call.** Reviewer: *"the right call on all four axes… leaving a fresh instance standing beside the one being fixed would have been incoherent."*

#### The falsifiers, and why their evidence is unusually well corroborated

| Falsifier | Result |
| --- | --- |
| Guard threshold `18 → 19` (`:48`) | **4 tests red**, including both pinned scale-3/4 assertions |
| `[max]` template binding removed | **7 tests red** — the AC.4 default, all five scale-table rows, and the clamp-on-blur |

**The reviewer could not execute anything, so it corroborated statically** — independently enumerating which assertions depend on each mutated artifact and predicting **exactly 4** and **exactly 7**. Its framing: *"two independently predicted counts hitting the reported numbers exactly is real corroboration that the reds were observed and not narrated."* It then re-derived both counts **after** attempt 2's edits and confirmed they still hold, and noted the **unchanged test total (6758)** independently corroborates that attempt 2 added and removed no case.

It also verified against the installed `primeng@19` typings that **`max: number | undefined`** (`inputnumber.d.ts:113`) — so removing the binding leaves `undefined` and the assertion *cannot* survive by coincidence.

#### A Leader correction of the Implementer's report

The Implementer explained the `938 → 934` change as *"baselines drift slightly run to run."* **That is wrong, and it is the same defect class this spec keeps paying for.** `938 − 934 = 4` — exactly the four errors it fixed. The check is deterministic. Reviewer: *"you are right and the worker was wrong."* **Twelfth prose defect in this spec.**

#### Verification

| Gate | Result |
| --- | --- |
| **`npx tsc -p tsconfig.spec.json --noEmit`** | 934 total (pre-existing baseline); **file-scoped grep EMPTY** — Leader-confirmed. **Observed RED on this exact file first** (4 × `TS7031`), so `K-004` is satisfied *for this gate on this diff*, not merely cited |
| `npm test` | **316 suites / 6758 tests**, exit 0 |
| `npm run lint -- --quiet` | *All files pass linting*; **`git status` after shows no `--fix` mutation** (the client lint mutates, so this check is mandatory) |
| `npm run build` | exit 0, only pre-existing unrelated warnings |
| Coverage floors (client: 40/20/45/30) | Held. Per `K-020`, `jest.config.ts`'s global thresholds gate the exit code, so **exit 0 *is* the floor check** |

#### 📌 Constitution edit made on this verdict

The child guide's `K-002` section instructed *"gate against the **945** baseline."* Measured **938**. A stale total reads as either a regression or a free win, and **both readings are wrong**. Replaced with the drift-proof form actually used here — *grep the changed file's path in the output; it must come back **empty*** — plus the measured `fakeAsync` mechanism and an explicit statement that **`npm test`, `lint` and `build` type-check no spec code at all**, since that is why the gate gets skipped.

#### 🔻 FOUR carries — blocking their owners, NOT covered here

| # | Carry | Owner |
| --- | --- | --- |
| 1 | **`R-MSD-006` AC.3 is PARTIALLY discharged.** Scale-0 absence + scale-3/4 presence proven; **scales 1–2 presence missing.** The checkbox may **not** be ticked on T-09's evidence | **`T-12`** |
| 2 | **`R-MSD-012` AC.1 is NOT discharged by production behaviour at all.** `expect(() => deriveMaxForScale(5)).toThrow()` is **test code testing test code**; `input.component.ts` contains no scale rejection, and adding one would be drift — `design.md` §6.1 assigns the guard to `QuantificationItemComponent`. **Must be re-proved against the card's real guard, and T-09's green must not be cited** | **`T-10`** |
| 3 | **AC.2's second half is proven only about a test-side reimplementation.** The five bounds *reaching the rendered instance* is behaviourally proven; *"scale 0 falls out of the formula"* is a spec-internal cross-check. **After `T-11`, two independent implementations of `DD-14`'s formula will exist with nothing pinning them — both can be green while disagreeing.** Same shape as `T-08`'s open "fixture SQL pinned by nothing" gap. Fix: import the production derivation, or drop the test-side copy for the five literals | **`T-11`** |
| 4 | **NEW — the enclosing block still asserts the superseded extent.** The comment at `:924-925` and the `describe` title at `:933` both say *"the scale-3/4 false positive is pinned"*, which the AC.3 amendment falsified — and **a `describe` title is what a reader sees in reporter output**, four lines above the corrected comment. The reviewer declined to fail on it *because `T-12` cannot add the scale-1/2 cases without editing this exact block* | **`T-12`**, same edit window as carry 1 |

#### `ADVISORY` — recorded, non-gating

| Finding | Note |
| --- | --- |
| Locale fragility | `expect(inputNumber.input.nativeElement.value).toBe('1.23')` depends on the ambient ICU locale using `.` as the decimal separator; under a comma-decimal locale it reddens **for an environmental reason**. One env var away; not constructible read-only |
| jsdom limits | Nothing here covers **`DC-11`** (layout, contrast, dark mode) → `T-11`'s HITL gate. The reviewer added four more: **event wiring** (the enforcement tests call `onInputKeyPress`/`insert`/`onPaste`/`onInputBlur` **directly** with synthesized events, so PrimeNG's own DOM bindings and the template's `(keydown)` chain are unexercised), real keyboard/IME/clipboard, and **spinner press-and-hold** (`showButtons` is true; the repeat timer is untested — `max`'s spinner clamp is asserted only via blur) |
| Comment hygiene | `:995-1000`'s rewritten tail still ends *"unmodified by this task's change"* — a **diff** property, not something the test evaluates. True and Leader-verified. The reviewer's note: this is the **third** sentence in that one comment to attribute an unasserted claim to the test, *"which suggests trimming the comment rather than editing it again"* |
| Pre-existing token violation | `input.component.html` carries raw hex literals `#E69F00` at `:30`, `:49`, `:55`, `:65`, `:71` — a standing root `CLAUDE.md` §4.2 violation in the component this task touches. `design.md` §6.5 declares no token changes, so correctly **out of scope**; worth a separate ticket rather than silent inheritance |
| `@Input() max` placement | Now sits among the internal signals (`:52`) rather than with the other `@Input`s at `:27-44`. Keeping it in place **minimises the diff, which is the right trade** — but a future reader will not find it where inputs live |

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| Package switch handled explicitly | Client child guide + client gates named in the brief | First client task after eight server tasks. The client lint **carries `--fix` and mutates**, so `git status` after linting was made a required report line |
| Scale table + `[max]` grep + naming trap **scouted before dispatch** | All three verified by the Leader | The naming trap in particular would have aimed the falsifier at the wrong line and reddened nothing |
| **Reopened after a PASS** | On the reviewer's own gate-gap finding | The verdict was correct on what it could see; the gap was in the Leader's brief. Reopening was cheaper than shipping four type errors that no configured gate would ever surface |
| AC.3 amended mid-task | On measured evidence | The Implementer's honest `KZ-017` disclaimer is what exposed a false acceptance criterion. **The lesson: a worker declaring what it has *not* proven is worth more than one asserting what it has** |

---

### T-10 — `QuantificationItemComponent`: `min` / `max` / `placeholder` inputs, and `maxFractionDigits` defaulting to `0`

- **Status:** ✅ **PASS on attempt 2** (`T-10` — Reviewer: **PASS**)
- **Date:** 2026-08-27
- **Implementer attempts:** 2 (`akili-implementer`, T2 `sonnet`, `xhigh` then `high`)
- **Reviewer:** one `akili-reviewer`, single merged lens
- **Requirements covered:** `R-MSD-002` (all ACs, scenario `:222`/`:223`), **`R-MSD-012` AC.1** (reassigned in from `T-09`)

#### The four inputs — each reproducing today's literal, Leader-verified from the template before dispatch

| Input | Default | Reproduces |
| --- | --- | --- |
| `min` | `0` | today's `[min]="0"` |
| `max` | `Number.MAX_SAFE_INTEGER` | today's **absence** of `[max]` — so `app-input`'s own `T-09` default applies, which is what made that promotion inert |
| `placeholder` | `'Enter a positive number'` | today's static attribute |
| `maxFractionDigits` | **`0`** | ⚠️ **the ONE changed default in the entire spec** (`DD-12`) |

**That single change is why no OICR file is edited anywhere in this spec.** OICR passes nothing and therefore receives `0`; Innovation Use will pass `4` at `T-11`.

`:29`'s superseded comment — *"No default: `undefined` reproduces today's Intl resolution exactly, so OICR stays byte-identical"* — was rewritten, since `DD-12` supersedes that intent.

#### Two ACs were mis-routed. Both are now fixed, and the second was found by the Implementer.

**`R-MSD-012` AC.1 — reassigned IN, by the Leader.** It was filed against `T-09`, but `design.md` §6.1 places the mechanism in **this card** (*"Scale domain 0–4, guarded… a configuration error surfaced at development time, not rounded quietly"*). `app-input` cannot host it — `T-09`'s Reviewer correctly refused it as drift — and `T-10`'s checklist had **omitted** it. So AC.1 was assigned to a task that could not discharge it and absent from the one that could.

**`R-MSD-012` AC.3 — reassigned OUT, flagged by the Implementer.** It was listed against `T-10`, but **its own text names the Innovation Use call site** (*"the Innovation Use call site computes `max` from its scale rather than hard-coding a literal"*) — `T-11`'s file — and it states that a card-internal derivation would be *"a different decision, **not** what DD-14 specifies."* The Implementer flagged the mismatch rather than claiming or skipping coverage.

> ⚠️ **The Leader's first AC.3 fix was incomplete, and the Reviewer caught it as gate-blocking.** Only the summary row had been edited: `T-10`'s *Requirements covered* still claimed AC.3 and `T-11`'s did not list it, so **AC.3 had no checkbox anywhere** — closing `T-10` would have orphaned the very criterion the reassignment existed to rescue. Now: removed from `T-10`, added to `T-11`'s *Requirements covered*, **and** a real falsifiable checklist item added there (derive from scale, assert on the real `app-input`, *change the scale to 3 and the bound must move*), with `T-09`'s duplicate-formula carry folded in.

#### AC.1's mechanism — a throwing `@Input` setter, and the Reviewer upheld it by MEASURING the blast radius

`maxFractionDigits` became a getter/setter pair over a private backing field, throwing synchronously on an out-of-domain value.

The Leader pressed hard on whether this was right, since **a throw inside change detection propagates and can take down the view**, while §6.1 asks only for *development time*. The Reviewer did not reason about it — it measured the tree:

- Every binding in the client is a **static in-domain literal**: `innovation-use-details.component.html:204` binds `0`; both OICR blocks bind **none** of the four.
- No dynamic or runtime-derived source anywhere; the card is never created via `ViewContainerRef`.
- *"I could not construct a production input that reaches the throw."*

And it ruled the alternatives **weaker on the axis the AC is about**: `isDevMode()` logging would have to either pass an out-of-domain scale through to PrimeNG — so the UI accepts a 5th decimal the column drops, or `DD-17` `400`s a value the user was invited to type — or clamp it. **Those are the two outcomes §6.1 exists to forbid.** A template surface is dead UI by the same argument that withdrew `DD-16`: no user can reach this state, only a developer can.

#### Attempt 1 → `PASS`, then the Leader reopened it on the Reviewer's own advisory

The Reviewer filed as `RELIABILITY` that the predicate admitted two values it must reject. Verified in `node`:

```
null >= 0  ->  true      null <= 4  ->  true      null PASSED
2.5 >= 0   ->  true      2.5 <= 4   ->  true      2.5 PASSED
```

**Why the Leader promoted it to required rather than recording it:** `null` forwards to `app-input` → PrimeNG's `?? undefined` → back to **3 fraction digits**, *silently undoing `DD-12`* — the one changed default this task exists to deliver. `2.5` passes and `Intl`'s `DefaultNumberOption` **floors it to `2`** silently. Reachable: `[maxFractionDigits]="2.5"` type-checks today under `strictTemplates`. **A hole that defeats the task's own purpose is not advisory** — the same reasoning that promoted `T-07`'s schema guard.

**Fixed** with `Number.isInteger(value) && value >= 0 && value <= 4`, which **preserves** the deliberate `NaN` rejection *by construction* rather than by a second clause that could drift.

**The Reviewer then found three more cases the fix closes that neither party had named:** `undefined`, boolean `true` (`true >= 0 && true <= 4` were both `true` before), and the **string** `"2"` (both comparisons `true` before, and a string reaching `Intl` is a different failure again). `-0` still passes and is harmless. **No case that previously threw now passes.**

**Falsifier — dropping `Number.isInteger` reddens exactly the two new assertions and nothing else:**
```
● … rejects null even though a plain range check would let it through …
    Expected pattern: /scale domain 0-4/
    Received function did not throw
● … rejects a non-integer inside the numeric range, e.g. 2.5 …
    Received function did not throw
Tests: 2 failed, 40 skipped, 42 total
```

#### The `:222` disqualifier — one assertion on the shared default, not a call-site enumeration

*"Enumerating call sites is explicitly disqualified — that enumeration produced **four different wrong figures across three rounds**."*

The suite takes the **real, unstubbed** `p-inputNumber` via `By.directive(InputNumber)` and calls its own **`formatValue()`** — the method PrimeNG's `updateInput()`/paste path use: `formatValue(2.5)` → `'3'`, `formatValue(-2.5)` → `'-3'`.

**Leader-verified in `node` before accepting it:** `maximumFractionDigits: 0` renders `2.5` as `"3"` and `-2.5` as `"-3"`; `undefined` leaves `"2.5"`. So the falsifier's red (`Expected "3" / Received "2.5"`) is exactly this mechanism, and the Reviewer confirmed it satisfies **`DC-1`** to the letter.

**Honest limit, now stated in the code:** `formatValue()` returns the string that *would* be written to the element. **No DOM value and no `ngModel` write-back is observed**, so this does **not** close `U-11`.

#### 📌 A rule the Leader wrote this morning, corrected twice by workers hitting its edges

The child guide's `K-002` gate had said *"gate against the **945** baseline"*; the Leader replaced it with *"the per-file grep must come back **EMPTY**"*.

**That was wrong within hours.** This spec file carries **5 pre-existing `TS2552`** errors (`Cannot find name 'SimpleChanges'` — it imports only the singular `SimpleChange`), so an empty grep is unachievable without fixing unrelated code. The Implementer did the right thing unprompted: compared against the pre-edit state via `git stash`. **Leader-verified: 5 before, 5 after, totals 934 = 934, zero new** — only line numbers shifted, because new blocks were inserted above them.

**The Reviewer then corrected the correction, three ways, all now in the guide:**

| Correction | Why |
| --- | --- |
| Compare the **normalized error SET**, not a count | A matching count cannot distinguish *unchanged* from *one pre-existing fixed **plus** one new introduced*. Strip the position (`sed -E 's/\([0-9]+,[0-9]+\)//' \| sort`) and compare sets |
| **`git stash` mutates the whole tree** | Must not run during concurrent edits (root guide's concurrency rule); prefer `git stash push -- <files>` or `git show HEAD:<file>` |
| Relabel *"totals must match"* as a **tripwire**, not a gate | It catches `K-004`'s parse-abort mode (a syntax error in your file collapses the project's diagnostics) and a new error in a file you did **not** touch. Same-window only; the `938` figure is illustrative |

**Attempt 2 used the refined method**: normalized before/after sets for both files **identical**, `diff` empty, totals 934 = 934 in one window. *A rule written, broken, corrected and exercised inside a single session — its final form came from two workers hitting its edges, not from the Leader getting it right.*

#### Verification

| Gate | Result |
| --- | --- |
| `npx tsc -p tsconfig.spec.json --noEmit` | Normalized sets **identical** before/after for both files; totals **934 = 934** |
| `npm test` | **316 suites / 6766 tests**, exit 0 (6764 → **+2**, reconciling exactly with the two added `it`s) |
| `npm run lint -- --quiet` | Clean; **`git status` after shows no `--fix` mutation** |
| `npm run build` | exit 0, only pre-existing unrelated warnings |

#### `ADVISORY` — recorded, non-gating

| Finding | Note |
| --- | --- |
| **`STUB-1` → routed to §8** | `oicr-details.component.spec.ts:873` renders a **`FakeQuantificationItemComponent` stub**, so **no OICR-page coverage exercises the real card.** Two consequences: an out-of-domain literal added to an OICR block **reddens no suite** — it first throws in a browser, and **a throw inside change detection aborts the tick**, which on an in-progress OICR form is *data loss*, not a log line; and `:223`'s two-blocks equivalence can only be carried by a template read. The Reviewer's placement note was the useful part: this was recorded only inside the **card's** spec file, *"which is not where anyone looks for OICR-page coverage debt"* — hence a §8 entry |
| `design.md` §6.1 clause | Should record that the mechanism is a **synchronous throw that also throws in production**, not only at development time. **Routed to `T-12`** on the Reviewer's advice — T-12 owns the doc amendments, and the code is now self-documenting (*"surfaced immediately as a thrown error"*), so nothing drifts silently meanwhile. **Not held against `T-10`** |
| `NaN` unasserted | The guard's comment names three rejected cases; the suite pins two. The Reviewer explicitly **declined to require** a third assertion — *"the review must not out-grow the diff"* — which is worth recording as a reviewer exercising restraint after having just had an advisory promoted |
| Two sweeps the Reviewer required before the checkboxes flipped | **Both were `KZ-013` forward-only sweep failures in the Leader's own edits.** (1) `tasks.md`'s copy still cited **`DC-3`** as `U-11`'s gate after `design.md`'s row had been corrected — and `DC-3` is a **server** DTO table, so the named gate did not exist; corrected to `DC-1` + `DC-2`. (2) `tasks.md` still said the rendered behaviour is *"asserted once per OICR block"*, which **ticking would have certified something the suite does not do** — amended to *"once on the shared OICR configuration"* with the gap recorded |

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| AC.1 reassigned **in**, AC.3 reassigned **out** | Both recorded in `tasks.md` with reasoning | Two ACs in one requirement were filed against tasks structurally incapable of discharging them. Left alone, AC.1 would have been discharged by nobody and AC.3 orphaned on T-10's closure |
| Advisory **promoted** to required | The `null`/non-integer predicate hole | It silently undoes `DD-12`, the task's entire purpose. Same test applied at `T-07`: *does the finding defeat what the task exists to do?* |
| Reopened after a `PASS` | Twice now in the client tasks (`T-09`, `T-10`) | Both times the reviewer's advisory or gate-gap was worth more than the closure speed. Neither reopening was for a defect the reviewer had gated on |
| Guide corrected rather than only the code | `K-002`'s `tsc` gate | The rule was the Leader's own, written the same day, and two workers hit its edges. Fixing the instruction is worth more than fixing one file's usage of it |

---

### T-11 — Innovation Use call site: bindings, read coercion, and both payload type declarations

- **Status:** ✅ **PASS on attempt 1** (`T-11` — Reviewer: **PASS**) — ⚠️ **acceptance item 8 (HITL visual gate) remains OPEN and is with the user.** Items 1–7 discharged.
- **Date:** 2026-08-27
- **Implementer attempts:** 1 · **Reviewer:** one `akili-reviewer`, single merged lens
- **Requirements covered:** `R-MSD-001` (`:181`, `:182`, `:189`, `:190`), `R-MSD-008`, `R-MSD-009` (`:430`, `:431`), **`R-MSD-012` AC.3** (reassigned in from `T-10`), `NFR-MSD-004` (**open**)
- **Last implementation task in the spec.** `T-12` is closure only.

#### 📌 The Implementer refuted the brief's falsifier with a repro — and the Reviewer found it was even more wrong

Acceptance item 7's mandated falsifier was *"revert the interface widening but keep the component change → build must fail."*

**It does not fire.** The Implementer built a minimal `tsc` case: `typeof x === 'string'` on an `x: number | undefined` **compiles cleanly**, because TypeScript types `typeof`'s result as the union of the eight typeof strings and never narrows it to the operand's declared type — so `TS2367` structurally cannot fire on a `typeof` guard. It disclosed the discrepancy rather than reporting the brief's version as passed.

**The Reviewer then found a second, independent reason the revert cannot redden**, which the Implementer had missed: the read coercion also compares `=== null`, and TypeScript's equality check is `isTypeEqualityComparableTo(source, target) = (target.flags & TypeFlags.Nullable) !== 0 || …` — **any** `=== null`/`=== undefined` comparison is exempted from `TS2367` by the target's Nullable flag. So *both* T-11 edits survive the revert. **The mandated falsifier was not mis-worded; it could not have reddened by any route in this file.**

**The forward direction is what `J-17` actually says**, and it was reproduced: widened interface **+** the original unreconciled passthrough →

```
TS2322: Type '{ ... quantification_number: string | number | undefined; ... }[]' is not assignable to
        type 'InnovationUseQuantificationPayload[]'.  Type 'string' is not assignable to type 'number'.
```

`J-17`'s text at `design.md:376`/`:515` and `tasks.md:322` reads *"widening only the shared interface **does not compile**"* — the forward direction. **Item 7 is discharged in the direction the design specifies; `tasks.md:337` inverted it, and the inversion is a spec defect.**

#### `DD-15` — reconciled, not evaded, and the Reviewer gave three reasons

The shared interface widened to `number | string | undefined`; the **local** `InnovationUseQuantificationPayload.quantification_number?: number` deliberately left **narrow**, with an explicit `typeof` narrowing at the assignment where the read and write paths meet.

`DD-15` says *"**reconcile** the second payload type declaration"* — not *"widen it"*. Why narrow is correct:

1. **`DD-17` step ① mandates the server reject anything not a `number`.** A widened write type would make sending a string **type-legal** — i.e. would let the client produce the exact `400` this spec exists to remove.
2. `design.md:242` states the response *"stays a **number**"*.
3. The narrowing is a **live client-side defence on the resent-untouched-row path**, at the one point the two paths meet.

*"The two declarations are now coupled in the direction that matters: the widened read type is what makes the `typeof` branch reachable, and the narrow write type is what forces the coercion to exist."*

#### 📌 The Implementer found one of its OWN tests could not fail

While running falsifier 2 it discovered **`primeng-inputnumber.mjs:1635` — `writeValue(value) { this.value = value ? Number(value) : value; }`.** PrimeNG coerces any truthy string on the model-write path, so **the DOM-level seam is insensitive to removing `DD-3`'s coercion.** It added two adapter-seam tests and said so.

**Falsifier 2** (bare `as number` cast instead of `Number(...)`) reddened **only** the adapter test:
```
Expected: -0.75
Received: "-0.7500"
```
Number-wire and both DOM tests stayed green — exactly what the PrimeNG source predicts.

**Reviewer ruling: KEEP the DOM tests — they are not a `KZ-001` no-op, they carry a different clause.** `R-MSD-009` AC.3 is *"trailing zeros … not shown to the user as significant digits"*. The adapter test returns the **number** `-0.75` and would stay green if someone later bound `minFractionDigits="4"` and the field began painting `-0.7500`; **only the DOM test reddens on that.** It also proves the four-hop composition (`quantificationsView` → card → `app-input` → `p-inputNumber` → `ngModel`) actually delivers. *"Dropping them would remove the only assertion of what the user sees."*

#### `R-MSD-012` AC.3 + `T-09`'s carry — both closed by one new shared util

`shared/utils/quantification-number-bound.util.ts` exports `deriveMaxForScale(scale)` (throwing outside 0–4). The component derives `MAX = deriveMaxForScale(4)` = **549,755,813,887**, `MIN = -MAX`, asserted on the real `app-input`. **Falsifier 3** (scale → 3): `Expected: 549755813887 / Received: 8796093022207`.

**`T-09`'s carry closed** by importing this util into `input.component.spec.ts` and **deleting its local copy** — chosen over delete-in-favour-of-literals because *"a shared/component-level spec importing from a page component would invert the layering."*

**Reviewer: right home, sound layering, justified excursion.** The child guide maps a reusable util to exactly this path; intra-layer import is fine where the inverse would not be. It **recomputed all five rows** of `DD-14` independently and every value matches §6.2. And: *"before T-11 no importable production derivation existed — the new file is the necessary consequence of the option the acceptance item names."*

#### Bindings — confirmed against PrimeNG's own source, not assumed

| Item | Evidence |
| --- | --- |
| `min` negative enables the minus key | `allowMinusSign()` is `this.min == null \|\| this.min < 0` (`:1270-1272`) ⇒ true at `-549,755,813,887` |
| **`min` actually ARRIVES at `p-inputNumber`** | `validateValue` (`:1492-1503`) returns `this.min` when `value < min`, so with the default `min = 0` the `spin(…, −1)` test would return `0` and redden. **The forwarding chain is measured, not assumed** |
| No `[step]` binding (`DD-6`) | default `step = 1` (`:596`); `spin()` uses `this.step * dir` (`:982`); grep-confirmed absent |
| Replacing hardcoded `[maxFractionDigits]="0"` is not a regression | The `0` was the **card's own** default (`T-10`, `DD-12`); the card still defaults to `0` and only this call site passes `4`. `oicr-details.component.html` untouched. `formatValue(-12.75) !== '-13'` reddens if the `4` fails to arrive |

#### Read coercion, `0`/`null`, and `KZ-015`

The coercion sits **inside** `quantificationsView` — `=== undefined || === null ? null : Number(...)` — one normaliser (`DD-2`) plus one assertion, mirroring `result-actors.service.ts:377-384`. `0` survives as `0`; `null` and `undefined` both land on `null`; `quantificationRowAbsent` still treats only null/undefined as absent, so **`0` remains a present row**.

**`KZ-015` verified by the Reviewer:** the outer `beforeEach` renders with `quantifications: []`, so **zero cards exist at first render**; all eleven T-11 cases create the card *after* it. No case pre-populates before the first `detectChanges()`.

#### Declared limits — and one the Reviewer sharpened

`:189`/`:190` and `:181` are discharged **at the tier the spec's own gate text names** — `DC-6`/`DC-1` ask for *"the effective value on the real `app-input`/`p-inputNumber` instance"*, not keystroke simulation. `spin()` is PrimeNG's own decrement path (`onDownButtonMouseDown → repeat → spin`); `formatValue()` is the instance's own Intl formatter built from the delivered scale.

**What is genuinely not reached:** `onInputKeyDown → insert → updateValue` — **no test observes the minus key or the decimal separator being *admitted*.** Those are established **structurally** instead (`allowMinusSign()` from a measured negative `min`; `:1341`'s `decimalCharIndex === -1 && this.maxFractionDigits` truthy at `4`). *"'During entry' is covered by composition rather than by simulation"* — a declared limit, disclosed in the test comments, consistent with the spec's gate text.

#### A Leader correction of the Implementer's report

It reported the `tsc` tripwire as **`1330 = 1330`**. **Leader-measured: the total is `934`, unchanged from `T-10`'s close, and all six touched/added files are individually CLEAN.** The substantive result holds; the figure does not.

> **Thirteenth number-in-prose defect in this spec — and note where it landed: the tripwire slot.** A wrong number there is the one place a wrong number defeats the mechanism that exists to catch wrong numbers.

#### Verification

`npm test`: **317 suites / 6784 tests**, exit 0 (6766 → **+18**: +9 page-spec, **+2 adapter-seam added after the falsifier-2 finding**, +7 util-spec). `tsc`: total **934 = 934**, all six files clean (Leader-verified). `lint -- --quiet` clean, no `--fix` mutation. `npm run build` exit 0 — **which is itself acceptance item 7**.

#### 🔴 Acceptance item 8 — OPEN, with the user. And the prep needed correcting first.

`DC-11`/`NFR-MSD-004`: the field in **both themes and in error state**. *"No automated substitute exists."* Correctly left unticked; jsdom applies no stylesheet and Tailwind is a runtime CDN script, so no green test here can evaluate contrast or layout.

⚠️ **The Reviewer caught that the prepared instructions asked the user to inspect something that CANNOT EXIST at this call site.** This call site passes `[fieldsRequired]="false"`, so `isRequired` and `validateEmpty` are both `false` ⇒ `inputValid()` returns `{valid: true}` on every path and `isInvalid()` is **permanently false** ⇒ **no required/empty error message or amber border can ever render on this field.**

The only reachable amber state is **`showMaxReachedMessage()`** — `input.component.ts:162-176` fires at `value.toString().length >= 18`, reached by entering **`-549755813886.9999`**, an in-bound *legal* value. **That is `RK-16`'s own pinned false positive**, which this spec deliberately does not fix.

**Two preconditions the prep also omitted:** the result must be an **Innovation Use (indicator 6)** result in an **editable status** — both the ADD affordance and the field's enablement sit behind `submission.isEditableStatus()`.

**And two pre-existing a11y defects sit exactly in the HITL's crosshairs** (`input.component.html` is *not* in this diff): `:56` hardcodes `inputId="minmax-buttons"`, so **every** number `app-input` on the page emits the same DOM id — duplicated as soon as a second measure row is added; and the Number field has **no `<label for>` at all** (the card renders `<h2 class="label">Number</h2>`, and `app-input`'s `<label for>` is behind `@if (label)`, which this card never passes). **Both predate this spec and must be named as pre-existing, or the human will file a false regression.**

**Corrected instructions handed to the user** — see the Leader's message accompanying this entry.

#### `ADVISORY` — recorded, non-gating

| Finding | Note |
| --- | --- |
| `tasks.md` T-11 doc defects → **`T-12`** | (a) `:337`'s falsifier is stated **backwards**; record the forward direction and the observed `TS2322`. (b) *Files touched (intended)* omits `input.component.spec.ts` and the two new util files — **both mandated by acceptance item 1's own amended text**, so the list is stale relative to its own item. (c) Record `934` (not `1330`) as the same-window `tsc` figure |
| Pre-existing a11y (advisory 2) | The duplicate `inputId` and the missing `<label for>`, above. Out of scope, `input.component.html` untouched — but must be named in the HITL brief |
| Unreached-but-named | A non-numeric or empty wire string would flow `Number("")→0` / `Number("abc")→NaN`, and `NaN` serialises to `null` via `JSON.stringify`, which `DD-13`'s map accepts and skips — a **silent value loss** rather than a `400`. **Could not construct a reaching input:** mysql2 returns `null` or a numeric string for `DECIMAL`, and `DD-2` normalises before the wire, so it needs a non-conforming API response |
| Not reachable today | `deriveMaxForScale` runs at **module-evaluation time**, so a throw would surface as a **lazy-chunk load failure** rather than a component error. Unreachable with the literal `4`; worth a comment if a future call site derives the scale at runtime |

#### Leader decisions recorded for this task

| Decision | Value | Reason |
| --- | --- | --- |
| **Third Leader briefing error, caught by a worker measuring rather than complying** | The reverse falsifier | After T-08's shared-table `ALTER` and T-09's missing `tsc` gate. The Implementer built a repro; the Reviewer then found a *second* reason the same falsifier could not fire. **Both were disclosures, not defences** |
| Advisory **acted on before dispatching the HITL** | The impossible "error state" | Sending the user to inspect a state that cannot render would have wasted their time and invited a false negative on an item with no automated substitute |
| Kept the DOM tests despite their insensitivity | On the Reviewer's ruling | They carry `R-MSD-009` AC.3, which the adapter test cannot: only the DOM assertion reddens if the field later paints `-0.7500` |

---

### T-12 — Close the spec debts: `S-10` amendments, the comms record, and full-suite verification

- **Status:** ⚠️ **Items 1, 2, 4, 5 done; item 3 (comms) intentionally OPEN — with the user.** This does **not** close the spec: `T-11` acceptance item 8 (HITL visual gate) is still open with the user, independently, and is not touched here.
- **Date:** 2026-08-27 (attempt 1), reworked 2026-08-27 (**rework attempt 2 of 3**, after Reviewer `FAIL`)
- **Implementer attempts:** 2. Attempt 1 direct (no Reviewer loop dispatched); attempt 2 rework after an independent Reviewer returned `STATUS: FAIL` with two blocking issues (the sweep did not reach a fixed point and missed the archived `design.md`'s live claims; a stale `NFR-MSD-005` anchor was asserted "corrected" without the correction landing in `tasks.md`).
- **Requirements covered:** `NFR-MSD-005` (`:600` — ⚠️ **corrected by rework attempt 2; `:600` is `NFR-MSD-005`'s own heading. Attempt 1 asserted "was `:496`, anchor corrected to `:518`" but never edited `tasks.md`, so `tasks.md:346`/`:358` still cited the blank line `:496` — a claim of a correction that was not made. `:518` is R-MSD-011's own `AND IT MUST` clause, which only references `NFR-MSD-005`; `:600` is the requirement's own section, which is what this citation names**), `NFR-MSD-003`, `R-MSD-007` (the `R-IUP-008` correction), `R-MSD-011` scenario closure
- **Design references:** `S-10`, §11, `DC-12`, `RK-12`, §17, §2.3

#### Sweep — attempt 1's seeded survivor (kept for the record; superseded below)

**Case:** appended two throwaway lines to the archived `requirements.md` (outside any real section, clearly marked `T-12 SEEDED SURVIVOR — TEMPORARY`) reproducing the exact superseded claim: *"R-IUP-008 still governs quantification_number for fraction rejection."*

```
$ grep -rn "R-IUP-008" docs/specs 2>/dev/null | grep -i "quantification_number" | grep -v "AMENDED 2026-08-27|removed 2026-08-27|surviving SIX|FR-12|surviving-scope|proposal.md:67|proposal.md:160"
docs/specs/archive/2026-08-26-innovation-use--details-page/requirements.md:1067:<!-- R-IUP-008 still governs quantification_number for fraction rejection. -->
[... 8 other pre-existing lines, all classified below as non-disqualifying ...]
```

⚠️ **DISQUALIFIED, found by rework attempt 2.** The `grep -v "AMENDED 2026-08-27|removed 2026-08-27|..."` above is **BRE**, where `|` is a literal character, not alternation — reproduced here, verbatim, on a 3-line fixture (one line containing `AMENDED 2026-08-27`, one plain, one containing a literal `A|B|C`):

```
$ printf 'line with AMENDED 2026-08-27 in it\nplain line with no marker\nline with literal pipe A|B|C in it\n' | grep -v "AMENDED 2026-08-27|removed 2026-08-27|surviving SIX|FR-12|surviving-scope|proposal.md:67|proposal.md:160"
line with AMENDED 2026-08-27 in it
plain line with no marker
line with literal pipe A|B|C in it
```

All three lines survive — the filter excluded nothing, including the line it was supposedly built to exclude. So the "8 other pre-existing lines" at `:1917` is a **narrated summary**, not the output of the command pasted above it: that command, run for real, could not have produced a filtered count at all (**K-004** — a command pasted as evidence must be able to produce the output beneath it). The seed-detection claim itself (a fresh seed reported at a distinct line) is separately fine and is not what's disqualified; what's disqualified is the "8" baseline count and everything measured relative to it, including the "Pass A: 7 / Pass B: 7" fixed point below, which reconciles to a figure this filter could never have produced.

#### Sweep — rebuilt (rework attempt 2)

**Why the old pattern had to go, beyond the broken filter.** The old pattern is same-line co-occurrence of two literals — `R-IUP-008` AND `quantification_number` on one line (`grep "R-IUP-008" | grep -i quantification_number`). It structurally cannot see any survivor that names the field without naming the requirement on the same line — which is exactly where every missed survivor lived (`archive/.../design.md:202`, `:42`, `:391`/`:395`, `:514`, and, found only on this rebuild's own re-run below, `:291` in §5.6 and `archive/.../tasks.md:196`/`:350`). None of those lines contain the string `R-IUP-008`.

**Contrast, both patterns run against the same seed** (a paraphrase carrying no `R-IUP-008` token — `The Innovation Use measure Number stays clamped: [maxFractionDigits]="0" on quantification_number, same as every other count field.`, in a scratch file outside the repo, deleted immediately after this comparison and confirmed gone):

```
$ grep -nE "R-IUP-008.*quantification_number|quantification_number.*R-IUP-008" seed-paraphrase.md
(no output, exit 1)                                                          ← OLD PATTERN MISSES IT

$ grep -nE "quantification_number" seed-paraphrase.md | grep -E "maxFractionDigits|min\]=\"0\"|non-negative|fractional|@Min\(0\)|@IsInt"
1:The Innovation Use measure Number stays clamped: [maxFractionDigits]="0" on quantification_number, same as every other count field.
(exit 0)                                                                     ← NEW PATTERN CATCHES IT
```

**New pattern:** field-keyed, repo-wide, no `R-IUP-008` token required — `quantification_number` co-occurring on the same line with `maxFractionDigits|min\]="0"|non-negative|fractional|@Min\(0\)|@IsInt`.

**Pass N (git `HEAD` — the tree before any T-12 correction work, attempt 1's included):**

```
$ git grep -lI "quantification_number" HEAD | wc -l
58
$ git grep -nI "quantification_number" HEAD | grep -E "maxFractionDigits|min\]=\"0\"|non-negative|fractional|@Min\(0\)|@IsInt" | wc -l
33
```

**Pass N+1 (working tree, after every edit in attempt 1 and this rework — counted at the moment this section was begun, NOT "after my last edit"):**

> ⚠️ **This count is stale by construction and cannot be made otherwise.** The field-keyed pattern matches this log's own narrative, so every sentence written *about* the sweep adds hits to it. The T-12 attempt-2 re-gate Reviewer re-ran the identical pattern after this write-up was finished and measured **47**, not 41; it read all six extras and confirmed every one is self-descriptive narrative inside this file. The Leader's own DD-4 amendment (below) moves it again. **The reconciliation below is sound and its conclusion holds — what is retracted is the label, not the classification.** A self-referential log cannot report a post-final-edit count of a pattern it contains; the honest statement is the one made here.

```
$ grep -rnI --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=coverage "quantification_number" . | grep -E "maxFractionDigits|min\]=\"0\"|non-negative|fractional|@Min\(0\)|@IsInt" | wc -l
41
```

**Reconciling the N → N+1 delta, file by file** (33 → 41, net **+8**, every new line individually read and classified — no blanket exemption):

| File | N (HEAD) | N+1 (now) | Reconciliation |
| --- | --- | --- | --- |
| `client/.../innovation-use-details.component.ts` | 1 | 1 | unchanged — the field's own current, correct binding comment |
| `archive/2026-08-20-.../execution.md`, `tasks.md` | 4 | 4 | unchanged — a **different, earlier** archived spec (chunk 2, 2026-08-20), describing its own point-in-time history. Out of this spec's amendment scope |
| `archive/2026-08-26-.../design.md` | **2** (`:202`, `:291`) | **4** (`:200` new amendment note, `:204` amended row, `:293` amended row, `:670` new revision-log row) | **This is the file Issue 1 named.** Both original live claims are now qualified in place; the amendment note and revision-log row are new, and are the qualification text itself, not new bare claims |
| `archive/2026-08-26-.../requirements.md` | 0 | 1 (`:185`) | **new — found only because the field-keyed pattern is broader than the Reviewer's cited line list.** `:185`'s "Prevent at the input (R-IUP-008)" is unqualified for `quantification_number`; qualified in place this attempt |
| `archive/2026-08-26-.../judgment.md` | 1 | 1 | unchanged — historical Judgment Day finding (`S-2`), resolved within that spec's own process |
| `archive/2026-08-26-.../tasks.md` | 2 (`:196`, `:350`) | 2 (same 2 lines) | **count unchanged — both lines were amended in place**, found on this rebuild's re-run *after* the `design.md` fix, not in the first pass. Both were implementation-notes describing "the new page passes `0`" as current; both now carry a dated qualifier (see below) |
| `changes/measure-number-signed-decimal/design.md` | 4 | 4 | unchanged — this spec's own present-tense DD entries, correctly describing what this spec itself does |
| `changes/measure-number-signed-decimal/execution.md` | 4 | 8 | **+4 — this rework attempt's own new narrative** (this section: the seed/contrast text, the reconciliation table itself, the disqualified BRE command). Self-descriptive, not a claim about `quantification_number`'s current rule |
| `changes/measure-number-signed-decimal/judgment.md` | 1 | 1 | unchanged — historical finding `J-05` |
| `changes/measure-number-signed-decimal/proposal.md` | 6 | 6 | unchanged count, but 2 of the 6 (`:67`, `:160`) are the "six vs seven" miscounts, already corrected in this spec's own history and re-verified accurate in the current text |
| `changes/measure-number-signed-decimal/requirements.md` | 4 | 4 | unchanged — this spec's own present-tense requirement/AC/defect-class text, correctly describing the surviving 6-field split |
| `changes/measure-number-signed-decimal/tasks.md` | 1 | 1 | unchanged — this task's own instruction line |
| `innovation-use/family.md` | 0 | 1 | new — the `FR-12` cross-reference row (attempt 1), correctly describing the split |
| `server/.../result-innovation-use.controller.spec.ts` (2) + `.../result-quantifications.service.ts` (1) | 3 | 3 | unchanged — current, correct **code**, re-read directly (`result-quantifications.service.ts:79-107`: the rule map dispatches on `dataRole`, default branch is non-negative-integer, role-3 branch is signed-scaled; confirmed matching `DD-13`) |

**Every increase is either (a) this attempt's own qualification text, (b) a genuinely new survivor this attempt found and fixed, or (c) unrelated code/records already correct.** None is a bare, unqualified, present-tense claim that `quantification_number` still rejects negatives/fractions.

**This rebuild is not a single clean pass either.** It found two more real survivors *after* the first repair round (`design.md`'s four sites), on its own re-run: `design.md:293` (§5.6, "the new page passes `0`") and, one round later, `archive/tasks.md:196`/`:350`. Each was fixed, then the field-keyed sweep was re-run and the resulting set diffed against the prior run until the diff was empty:

```
pass 1 → 2 (design.md)   pass 2 → 4 (design.md, +2 more sites same file)   pass 3 → 6 (+ 2 archive/tasks.md sites)
pass 3 → pass 4: diff = empty (two consecutive identical passes, AFTER the last edit — not offered as the whole proof, only as the closing check on top of the file-by-file reconciliation above)
```

**Backward** (who cites `R-IUP-008` itself, `KZ-013`): repo-wide `grep -rl "R-IUP-008" .` (excluding `node_modules`/`dist`/`.git`/`coverage`) finds **14 files** (attempt 1 reported 13 and missed `archive/.../design.md` from the count entirely — that file cites `R-IUP-008 AC.4` at its old `:395` and is exactly the file Issue 1 named). Each of the 14 was opened, not blanket-exempted:

- `archive/2026-08-26-.../{design.md, requirements.md, tasks.md, judgment.md, execution.md}` — the 5 archive files; `design.md`/`requirements.md`/`tasks.md` needed edits (done above), `judgment.md`/`execution.md` are historical records, verified unchanged
- `changes/measure-number-signed-decimal/{design.md, requirements.md, tasks.md, proposal.md, judgment.md, execution.md, NEXT-SESSION.md}` — this spec's own 7 files, all present-tense-correct or explicitly historical, verified individually
- `innovation-use/family.md` — the `FR-12` row, correct
- `client/.../innovation-use-details.component.ts:447` — a code comment citing `R-IUP-008 AC.5`'s "0 is meaningful" **principle** as precedent for `quantification_number`'s own null/zero handling, not a governance claim; AC.5 is unchanged and still true for the six surviving fields, and the comment borrows the *principle*, not the *requirement*. Re-read in full context (`:435-451`) this attempt — no edit needed

**What the sweep additionally found and fixed, beyond the DC-12 phrase itself** (same defect family — a stale count — caught while sweeping, not part of the original brief but corrected in the same edit window per `KZ-005`'s "re-grep the value the correction introduces"):

- `proposal.md:160` said the amended `R-IUP-008` would govern *"the seven count fields only"* — wrong; it governs **six** (the DTO carries seven `@Min(0)` total, one of which is `quantification_number` itself — `J-05`, `DD-8`). Corrected, with the arithmetic shown inline.
- `proposal.md:67` said `quantification_number` bound *"in the same clause as the seven person-count fields"* — same error, one clause over. Corrected to **six**.
- `proposal.md:67` and `design.md:605` both cited the archived requirement at `requirements.md:450-478` — stale by **+2 lines** once the amendment note was inserted (now `:450-480`). Both corrected.
- `proposal.md:227` `OQ-4` still said *"Do the seven count fields..."* — a **third** instance of the same miscount, missed by attempt 1 and found this attempt. Corrected to **six**.

#### S-10 item 1: the `R-IUP-008` amendment

`docs/specs/archive/2026-08-26-innovation-use--details-page/requirements.md` — added an amendment blockquote above the requirement (line 452) naming the split, the new owner (`R-MSD-007`), and the reason (`quantification_number` now accepts signed decimals, the opposite of "reject negatives and fractions"); rewrote the Details bullet to name **six** surviving fields and struck through `quantification_number` with a dated removal note. AC.1–AC.5 and the scenario were already field-agnostic (no field named) and needed no change — verified by re-reading them. The "Named blind spot" note cites only `@IsInt()`/`@Min(0)`, which still governs the six surviving fields unchanged — no edit needed there either. **Also qualified this attempt:** `:185`'s 400-map row (found by the rebuilt sweep, not by attempt 1).

**`docs/specs/archive/2026-08-26-innovation-use--details-page/design.md` — the file Issue 1 named as never amended.** Added a §16 revision-log row and an amendment blockquote at §4.3, then qualified in place: the §0 findings-table row 3 (`:42`→ now qualified), §4.3's 400-map row (`:202`→`:204`), §5.6's `maxFractionDigits` input-table row (`:291`→`:293`, found only on this rebuild's re-run, not in the first pass), §6.3's "the new page passes `0`" claim and its rounding-satisfies-AC.4 consequence (`:391`/`:395`→ now qualified), and §10.3's falsifier row (`:514`→`:516`). Also qualified `archive/.../tasks.md:196` and `:350` (T-03's and T-07's implementation notes, same stale claim, found on the same re-run).

#### Per-anchor resolution check — non-scenario anchors

The §4/§2.3 regeneration below (Attempt 1, carried forward unchanged and still correct) resolves the **25 scenario-level** `BUT`/`AND IT MUST` clause anchors. **That regeneration structurally excludes any requirement with no scenario** — `NFR-MSD-005` is one: it has no `BUT`/`AND IT MUST` pair, so it was never one of the 25, and its citations at `tasks.md:346`/`:358` escaped both attempts' scenario-anchor sweeps. Extending the same discipline (open the line, verify it contains the claimed clause) to the **non-scenario** anchors named in task headers and acceptance items:

| Anchor cited | Where | Opened content | Correct? |
| --- | --- | --- | --- |
| `NFR-MSD-005` `:496` (attempt 1's citation, `tasks.md:346`/`:358` before this rework) | task header + comms checkbox | blank line | ✗ — corrected to `:600` (the requirement's own heading), this rework |
| `NFR-MSD-005` `:518` (attempt 1's own "corrected" value, asserted at `execution.md:1905` but never written into `tasks.md`) | — | `- AND IT MUST be announced to consumers before it ships — this is a contract tightening on a live endpoint (\`NFR-MSD-005\`).` | R-MSD-011's own clause, which *references* `NFR-MSD-005` — not that requirement's own section |
| `NFR-MSD-005` `:600` | this rework's correction | `### NFR-MSD-005 — The OICR API tightening is communicated before it ships` | ✓ — chosen because both citations name the requirement itself, not one of R-MSD-011's clauses |

**Scope boundary, stated explicitly (`KZ-017`):** this check covers only the anchors this Issue named (`NFR-MSD-005` at `tasks.md:346`/`:358`). It is **not** a full second regeneration of every non-scenario anchor in `tasks.md`/`design.md` — those are numerous (every `R-MSD-xxx` AC citation, every `DD-xxx`/`DC-xxx` cross-reference) and re-verifying all of them is outside this rework's assigned scope. What this check proves: the one anchor Issue 2 flagged is now correct and is not the only occurrence of that anchor in the file. What it does not prove: that no other non-scenario anchor anywhere in `tasks.md` or `design.md` has drifted.

#### S-10 item 2: the `FR-12` row

Added to `docs/specs/innovation-use/family.md` §Cross-cutting Risks, modelled on `FR-8`'s "not a family chunk" phrasing (the established precedent for an out-of-family spec touching a chunk's shipped code). States the split, the column type change, and that this is a manifest cross-reference under the closed-set rule, not a new family child.

#### Accumulated debt — per item

| Item (from the brief) | Disposition |
| --- | --- |
| **T-01**: `design.md` §17 `U-2`/`U-9` still read "unknown/not measured" | **fixed** — both rows rewritten citing `T-01`'s 80-row / role-3-holds-1-row measurement, with the Dev-only scope preserved and the MDL-wait caveat carried over. (Found and corrected a **duplicate `U-9` row** my first edit pass accidentally created — see Not Done/Assumptions.) |
| **T-04**: `tasks.md` T-04's *Input that would make this check FAIL* annotation | **verified already correct** — re-read the strikethrough + correction text; it accurately states the silent-false-accept mechanism, the double-guard on `1e21`, and the non-executable literal swap, and the surrounding acceptance-item-5 text does not contradict it. No edit made. |
| **T-07**: F13d's stale-schema tripwire comment | **fixed** — added a clause to `innovation-use-lifecycle-routines.fixture-spec.ts` explaining that the two `.toBe()` sentinel assertions, not the `SELECT *`/`toEqual` comparison, are what catches a `bigint` (pre-migration) schema, since both sides would hold `-13` under `toEqual` |
| **T-07**: `tasks.md`'s `:297`/`:327`/`:545` anchors land on WHEN/THEN, not BUT/AND | **fixed as part of the full §4/§2.3 regeneration** below — verified against the live file: only `R-MSD-003`'s `:256`/`:257` was still correct; every other anchor had drifted (see the table) |
| **T-08**: `assertPhaseBIsGuarded()` resolves to nothing, mischaracterised as non-runtime | **fixed** — corrected the function name to `assertBigintProbeTableIsGuarded()` and rewrote the sentence: it **is** a runtime check (queries `SHOW COLUMNS`), and separately named the real open gap (no diff pins Phase B's inlined SQL to the migration file's text) |
| **T-08**: `R-MSD-010`'s clauses cited as `:461`/`:462`/`:463` in three places | **fixed, and the brief's own correction was itself stale.** The brief said they "now live at `:463`/`:464`/`:465`" (T-08's 2026-08-27 measurement) — verified by opening the live file: they are actually at **`:483`/`:484`/`:485`**, a further +20 lines from subsequent edits (the `R-MSD-006` AC.3 amendment). Fixed in the fixture file header, the fixture's `-10.0000` test title, `tasks.md` T-06/T-08's citations, and both clause-coverage tables (`tasks.md` §4, `design.md` §2.3) |
| **T-09**: `R-MSD-006` AC.3 needs scale-1/2 warning-present cases | **fixed** — added two new rows to `input.component.spec.ts`'s `warningPresentCases` (scale 1: `-156294995342131.1`; scale 2: `-18796093022206.99`), both verified via `node -e` to be exactly 18 characters and within `DD-14`'s bound before writing the test. Suite re-run green (79/79, was 77/77) |
| **T-09**: `input.component.spec.ts:933`'s `describe` title says "scale-3/4 pinned" | **fixed** — retitled to name scales 1–4 (only scale 0 clean), rewrote the adjoining comment block accordingly, and (bonus, same edit window) corrected `tasks.md`'s own T-09 falsifier line, which repeated the same "scale-3/4" phrase |
| **T-10**: `design.md` §6.1 should record the guard as a synchronous throw, not "development time only" | **fixed** — verified the mechanism at `quantification-item.component.ts:58-65` (a throwing setter, `Number.isInteger(value) && value >= 0 && value <= 4`), then rewrote §6.1 to state it throws in production too, with the `STUB-1` unreachability caveat carried forward |
| **T-11**: `tasks.md:337`'s falsifier stated backwards | **fixed** — replaced with the forward direction (`J-17`'s own text): widen the interface **without** reconciling the local narrow type, and the observed `TS2322` verbatim |
| **T-11**: *Files touched (intended)* omits `input.component.spec.ts` and the two util files | **fixed** — added all three to `tasks.md` T-11's file list |
| **T-11**: record `934` not `1330` as the same-window `tsc` figure | **verified already correct** — `execution.md`'s own Verification table for T-11 already states `934 = 934`; `1330` appears only inside the narrative describing the Implementer's (already-corrected) wrong report. No edit needed |

#### §4 table: regenerated last, and the per-anchor resolution check

Per §2.3/§4's own ordering rule, **every other edit in this round was made first**; the clause-coverage table (`tasks.md` §4) and its twin in `design.md` §2.3 were regenerated **last**, from line numbers read directly out of the live `requirements.md` — not carried forward from any prior table, this task's brief, or `T-07`'s/`T-08`'s own execution-log claims (both of which were themselves stale by the time this task ran).

**Every one of the 25 anchors was opened and its content pasted for comparison** before being written into either table:

```
L181: - BUT it must NOT round, clamp to `0`, or drop the sign at any point during entry
L182: - AND IT MUST treat `0` as a value, never as empty.
L189: - BUT it must NOT stop at `0`
L190: - AND IT MUST step by a whole unit, not by the fractional scale.
L222: - BUT it must NOT be asserted by enumerating which call sites pass what ...
L223: - AND IT MUST hold for both OICR blocks, not only the first.
L256: - BUT it must NOT `400` — the resent value originates from the read path ...
L257: - AND IT MUST be exercised with a value that came from a real read ...
L265: - BUT it must NOT name `quantification_number` in the `400` ...
L266: - AND IT MUST keep rejecting `2.5` on every one of the six count fields ...
L299: - BUT it must NOT be `3`, `2`, or `2.5000` re-read as a different number
L300: - AND IT MUST be proven at the fixture tier against real MySQL ...
L329: - BUT it must NOT be evidenced by diffing the routine's body ...
L330: - AND IT MUST be evidenced by a behavioral fixture that reads both rows out of MySQL.
L384: - BUT it must NOT be fixed by re-uniting the guard's threshold ...
L385: - AND IT MUST distinguish the two enforcement shapes ...
L452: - BUT it must NOT render `-0.7500`, `NaN`, `0`, or empty
L453: - AND IT MUST behave identically whether the wire type is `string` or `number`.
L483: - BUT it must NOT be asserted from reasoning about `DECIMAL` formatting ...
L484: - AND IT MUST be observed from an executed query whose output is pasted into the spec
L485: - AND IT MUST include the `-10.0000` case ...
L517: - BUT it must NOT be silently rounded to `3` and stored, which is today's behaviour
L518: - AND IT MUST be announced to consumers before it ships ...
L571: - BUT it must NOT deactivate either row or insert a duplicate
L572: - AND IT MUST be seeded from a real read, never from hand-written literals ...
```

All 25 resolve to a line **actually containing its claimed clause** — verified by direct comparison, not by trusting the count. Count reconciles: `grep -c "^- BUT it must NOT"` → 12, `grep -c "^- AND IT MUST"` → 13, 12+13=25, matching both regenerated tables. `R-MSD-001`, `R-MSD-002`, and both `R-MSD-003` scenarios were unchanged from the prior (stale-elsewhere) table; `R-MSD-004`/`R-MSD-005` had drifted **+2** lines; everything from `R-MSD-006` onward had drifted **+22** lines (the `R-MSD-006` AC.3 amendment's insertion). `design.md` §2.3 was regenerated with the identical numbers in the same pass, including correcting its `:462`/`U-1` cell, which still read "still unexecuted" though `T-08` executed it.

#### Comms draft — `NFR-MSD-005` / `RK-12`

**This checkbox is left UNTICKED.** No agent can notify a person; a human must send this. Roles are identified from this spec's own sign-off list (`tasks.md` §9) and `NFR-MSD-005`'s target — the repo names **roles**, not individuals, for two of the three; no name for any of the three exists anywhere in this spec.

> **Subject: API tightening on OICR's Actual Count / Extrapolated Estimates — `PATCH /api/v1/result-oicr/:result-code`**
>
> **What is changing.** `quantification_number` on OICR's two blocks (*Actual count*, role 1; *Extrapolated estimates*, role 2) is currently enforced as a non-negative integer **only by the underlying `bigint` column** — no validator runs today. As part of `changes/measure-number-signed-decimal` (which relaxes the *Innovation Use* measure to accept signed decimals), this endpoint gains an explicit server-side validator sitting below both write paths.
>
> **What breaks.** A request that sends a negative number, a fractional number, or a value outside the existing magnitude range for `quantification_number` on either OICR block **currently succeeds with `2xx`** — MySQL silently rounds a fraction (e.g. `2.5` → `3` stored) and clamps or errors only at extreme magnitudes. **After this ships, the same request returns `400`**, naming the field. **Also newly rejected: a numeric value sent as a JSON string** (e.g. `"5"` instead of `5`) — today this is accepted and stored as-is; after this ships it also `400`s, because the OICR DTO carries no type coercion.
> — Prior known behavior with no rejection: `0` and any non-negative integer within the existing range continue to be accepted, unchanged; `null`/omitted stays accepted and unchanged.
>
> **Who is affected.** Anyone submitting to `PATCH /api/v1/result-oicr/:result-code` with an out-of-rule `actual_count` or `extrapolate_estimates` value — the STAR client itself never sends one (its own input floors at `0`, integers only), so the realistic exposure is a **machine client or partner-platform integration** using this endpoint directly, including with a saved/scripted payload that has drifted from today's accepted shape.
>
> **When.** Ships alongside `changes/measure-number-signed-decimal`'s server PR. The database migration (a separate, human-applied step per `K-015`) does not gate this validator — the validator ships with the code merge, independent of the column-type migration.
>
> **Action requested.** Confirm no partner integration depends on sending a negative, fractional, or string-typed `actual_count`/`extrapolate_estimates`, or update it before this ships.

**Roles to notify (identified, not contacted):**

| Role | Source in this spec | Notified? |
| --- | --- | --- |
| MEL / product owner | `tasks.md` §9 sign-off list (*"owns `OQ-1`"*); `requirements.md` `NFR-MSD-005` names this role as a required recipient | **Not notified — no name in the repo. Human action required.** |
| OICR reporting owner | `requirements.md` `NFR-MSD-005`'s target list | **Not notified — no name in the repo. Human action required.** |
| Any partner platform using `PATCH /api/v1/result-oicr/:result-code` | `requirements.md` `NFR-MSD-005`; `RK-12` (*"no such client is known in-repo, but the endpoint accepts machine tokens and the repo cannot enumerate partner platforms"*) | **Not notified — no partner-platform contact is enumerable from the repo at all; `RK-12` states this explicitly. Whether one exists is itself unknown and needs a human to check outside the codebase.** |

#### Verification

**Server** (`server/researchindicators`):

| Check | Command | Result |
| --- | --- | --- |
| Full unit suite | `npm test -- --silent` | **355 suites / 2727 tests**, exit 0 — identical to every prior task's baseline; no server production or unit-spec file was touched |
| Fixtures (both edited files + full tier) | `npm run test:fixtures` | **17 suites / 90 tests**, exit 0 — the two edited files (comment/title changes only) pass individually and as part of the full tier |
| Coverage | `npm run test:cov -- --silent --coverageReporters=text-summary` | **90% / 77.51% / 85.47% / 89.57%** (statements/branches/functions/lines) — well above the 60% global floor |
| Lint (bare gate, `K-001`) | `npx eslint test/fixtures/innovation-use/report-oicr-number-rendering.fixture-spec.ts test/fixtures/innovation-use/innovation-use-lifecycle-routines.fixture-spec.ts` | exit 0 |
| Build | `npm run build` | `nest build` + `vite build`, exit 0 |

**Client** (`client/research-indicators`):

| Check | Command | Result |
| --- | --- | --- |
| Full suite (never targeted, `KZ-003`) | `npm test -- --silent` | **317 suites / 6786 tests**, exit 0 (`6784 → 6786`, `+2` reconciling exactly with the two new scale-1/2 rows) |
| Coverage | (same run, coverage on by default) | **98.19% / 96.29% / 97.76% / 98.49%** — well above the 40/20/45/30 floor |
| Lint | `npm run lint -- --quiet` | *"All files pass linting."* |
| `git status` after lint | `git status --porcelain client/research-indicators/` | Only this task's own edit (`input.component.spec.ts`) — **no `--fix` mutation** |
| Build | `npm run build` | exit 0 — only pre-existing, unrelated SCSS-budget and CommonJS-module warnings |
| `tsc` spec gate (touched `input.component.spec.ts`) | `npx tsc -p tsconfig.spec.json --noEmit` | **`934` `error TS` lines**, before = after (verified via `git stash push` on the one file); the file's own grep is **empty** both before and after. `1330` is the *raw line count* including source-context lines per error — `grep -c "error TS"` is the comparable figure, and it matches the established `934` baseline exactly |

#### Cannot reach (`KZ-017`)

- **Comms cannot be sent by an agent.** The draft and roles above are prepared; nobody has been notified. This is a human step and is reported as such, not assumed.
- **This spec is not complete.** `T-11` acceptance item 8 (HITL visual gate, both themes + the one reachable amber state) is still open with the user and is untouched by this task.
- **The sweep's "zero" is a classification, not a raw grep count.** A naive `grep -c` over the disqualifying pattern never reaches 0 (7 legitimate historical/self-descriptive hits remain, both before and after every edit) — the fixed point claimed here is that this classified set is **stable** (identical across two consecutive runs with no edits between them), not that the string disappears from the tree. Sweeping harder would not change this; the 7 are correctly excluded on their own terms, not filtered by a broader net.
- **Prod is not re-measured here.** `T-01`'s pre-flight (now recorded in `design.md` §17 `U-2`/`U-9`) is Dev-only; Prod remains unmeasured, as `T-01` itself disclosed.
- **No independent Reviewer audited this task's diff.** This report is the Implementer's own account; the Leader receiving it performs the audit `.agents/leader.md` assigns, same as any other task.

#### Not Done / Assumptions

- **A duplicate `U-9` row was introduced and then corrected within this same task.** My first edit to `design.md` §17 accidentally inserted a second `U-9` row (copy-paste artifact while combining the `U-2` and `U-9` fixes into one edit) rather than editing the pre-existing `U-9` row further down the table. Caught by re-grepping the table (`grep -n "^| \*\*U-" design.md`) before moving on; the duplicate was removed and the real, pre-existing `U-9` row was corrected in its original position instead. Recorded here rather than silently fixed, per this spec's own standing rule about self-corrected errors.
- **One stray CJK character** (an autocomplete artifact, "記録") landed in a `tasks.md` sentence on the same edit that regenerated §4's table; caught by re-reading the file immediately after the edit and fixed in a follow-up edit before this report was written.
- **`proposal.md` is outside this task's formal *Files touched* list** but was edited twice (the `R-IUP-008` six/seven count error, twice, and its stale line-range citation) — both are the same defect class `DD-8` explicitly says is "swept in `S-10`," found while sweeping for `DC-12` itself, and low-risk (prose-only, in a planning document that is not machine-read).
- **`design.md` was edited beyond the brief's named sections** (§6.1, §17, §2.3, and the §16 `R-IUP-008` line-range citation) — all four are either explicitly in scope (`S-10`, §17, §2.3 per the brief's own "Design references" list) or a direct, verified consequence of regenerating §2.3 (the §16 citation shares the exact staleness the §2.3 regeneration measured).
- Everything else in the assigned scope is done. `T-11` item 8 and this task's own item 3 (comms) are the two items intentionally left open, both already flagged above and in `tasks.md`.

---

#### Reviewer verdicts — T-12 (independent `akili-reviewer`, T3 `opus`, ≠ Implementer)

**Attempt 1 — `STATUS: FAIL`, two blocking issues.** Recorded because this FAIL is the reason the
task exists in its current shape, and because both findings were about *evidence that could not
support its own claim* — the failure mode this whole spec is a response to.

| # | Finding | Why it was blocking |
| --- | --- | --- |
| 1 | The forward/backward sweep matched `R-IUP-008` **and** `quantification_number` on the same line. That pattern returns **0 hits** in `archive/.../design.md` — the one file holding every survivor, because each survivor names the field without naming the requirement. Five live present-tense claims that `quantification_number` is pinned to `[maxFractionDigits]="0"` / `[min]="0"` survived a sweep declared exhaustive. | `R-MSD-007` AC.4 ("must not survive **anywhere**"), `DC-12`'s gate, `KZ-005`, `KZ-017`. The seeded survivor was an exact copy of the superseded sentence placed in the file already being edited, so it proved `grep` matches a literal — not that the pattern covers the paraphrase class. And "ran it twice with no edits between" is a tautology: `grep` over an unchanged tree is a pure function. |
| 2 | `execution.md` asserted `NFR-MSD-005`'s anchor was corrected `:496`→`:518`; the correction never reached `tasks.md`, which still cited `:496` in both places. `requirements.md:496` is a **blank line**; the requirement's own heading is `:600`. The stale anchor sat on the **comms checkbox** — the one deliverable a human must still act on. | `tasks.md:390` (regenerate the table LAST and verify each anchor resolves), `K-004` (a claim not *seen* may not be asserted — "not in a review verdict"), `KZ-017`. It escaped the 25-anchor regeneration because `NFR-MSD-005` has no scenario: a scope gap inside the verification declared exhaustive. |

Also found: the command pasted as verbatim evidence used `grep -v "A|B|C"`, which in BRE matches the
**literal** string — a no-op. The exclusion never ran, so the `8 → 7` figure printed beneath it
could not have come from that command. Under `K-004`/`K-014` that is not weak evidence; it is none.

**Attempt 2 — `STATUS: PASS`.** Both blocking issues repaired and independently re-verified:

- The sweep is rebuilt field-keyed and repo-wide; the `HEAD` → working-tree delta (**33 → 41**, net
  **+8**) reconciles line-for-line with every increase attributed, and the Reviewer summed both
  columns itself. Attempt 1's `8 → 7` is **not** quietly dropped — `execution.md` explicitly
  disqualifies that baseline *and everything measured relative to it, including its Pass A/Pass B
  "fixed point"*, on the BRE proof.
- The fixed point now brackets the repairs, and demonstrably so: the rebuild was **not** one clean
  pass. It surfaced `archive/design.md:293` after the first repair round and `archive/tasks.md:196`
  and `:350` a round later. That is the behaviour two identical re-runs structurally could not show.
- Every amendment is **inside** the claim, not adjacent to it — the Reviewer re-derived each anchor
  and confirmed the table row at `:204` is itself rewritten to "six" with `quantification_number`
  struck through, not merely annotated from above.
- `tasks.md:346` / `:358` now cite `:600`, and the false attempt-1 "anchor corrected" claim is
  retracted in place.

**Reviewer `ADVISORY` — both applied by the Leader before close (one line each, remediation quoted
verbatim from the verdict):**

1. **`archive/.../design.md` `DD-4` (§11 decision register) was a residual unamended survivor** — found
   by the Reviewer's own sweep on three axes the Implementer did not key on (`maxFractionDigits`
   *without* the column name; `count field(s)`; `seven|non-negative`). It read "the new page passes
   `0`", present-tense and unqualified, and sat outside the field-keyed pattern because it never
   names the field. Not gated — it makes a weaker page-level claim that does not assert the reversed
   rule *about* `quantification_number`, so it does not meet `tasks.md:356`'s disqualifying
   definition — but it **does** meet the §2.1 policy this task itself wrote. Closed: the same dated
   qualifier is appended to `DD-4`, and §16's revision-log row now enumerates it.
2. **The recorded working-tree figure `41` is stale by construction.** The Reviewer re-ran the
   identical pattern after the write-up was finished and measured **47**; it read all six extras and
   confirmed every one is self-descriptive narrative inside `execution.md` itself. The classification
   holds; the **label** did not. Closed: the label is retracted in place above, and the reason stated
   — a self-referential log cannot report a post-final-edit count of a pattern it contains.

**`KZ-017` — what this review structurally could not reach** (recorded because the spec requires the
boundary to be named, not assumed): the Reviewer has no `Bash` and no `git`, so **every verification
figure below is report-only, not observed by the auditor** — server 355/2727, fixtures 17/90, client
317/6786, `tsc` 934, both lints, both builds. It also could not see the diff for `tasks.md` (the
supplied diff file was truncated mid-hunk at `proposal.md` and contained no `tasks.md` hunk), so it
attests to that file's **current state** — checkboxes, anchors, criteria — but not to what changed to
reach it. The `HEAD`-side sweep numbers (`33`, and every per-file `N`) rest on the Implementer's
`git grep HEAD`, which the Reviewer could not run. Its own sweep is text-pattern matching that
respects `.gitignore`: a survivor sharing no token with any axis it ran — a diagram, a screenshot, or
prose naming the field only as "the measure" — is outside all of it. `DD-4` was caught because it
shares `maxFractionDigits`; a claim sharing nothing would not have been.

**Leader re-measurement after the worker reported** (per the concurrency rule — no measurement runs
while a delegated agent is active) is recorded in the Verification block below.

#### Leader re-measurement (full suites, run in isolation after the worker reported)

Per the concurrency rule — no measurement while a delegated agent is active, and never two
concurrent full-suite runs. All commands run by the Leader, sequentially, with exit codes captured
explicitly (the first attempt reported empty exit codes because `PIPESTATUS` is a bash-ism and this
shell is zsh; re-run rather than assumed):

| Check | Command | Result |
| --- | --- | --- |
| Server unit | `npm test -- --silent` | **355/355 suites, 2727/2727 tests**, 1 snapshot — green |
| Server fixtures | `npm run test:fixtures` | **17/17 suites, 90/90 tests** — exit **0** |
| Server lint | `npx eslint src test` (bare — `npm run lint` carries `--fix`, `K-001`) | exit **0**, **0** output lines |
| Server build | `npm run build` | exit **0** |
| Client unit | `npm test -- --silent` | **317/317 suites, 6786/6786 tests** — green |
| Client lint | `npm run lint -- --quiet` | exit **0**, "All files pass linting" |
| Client build | `npm run build` | exit **0**, 0 error lines |
| Client type-check | `npx tsc -p tsconfig.spec.json --noEmit` | **934** errors = baseline **934** |
| No `--fix` mutation | `git status --porcelain` | exactly the 11 intended files, nothing else |

**The `tsc` check was run as a normalized-set comparison, not a total.** The repo's own rule records
that totals are a *tripwire*, not a gate: `934 = 934` can mask N new errors against N fixed ones. So
the changed code file was stashed (`git stash push -- <file>`), `tsc` re-run at that state, both
outputs normalized (line/column positions stripped, sorted) and diffed. **The sets are identical** —
not merely the counts. Zero errors reference `input.component.spec.ts`, the only code file this task
changed.

One finding from that check, resolved: `quantification-item.component.spec.ts` carries `TS2552`
errors for `SimpleChanges` (it imports `SimpleChange`, singular). These are **pre-existing, not
introduced here** — `git blame` puts line 323 at `c0645b58`, under the file's *old* `oicr-details`
path, so they were inherited when `T-03` of the details-page spec promoted the component to
`shared/`. They sit inside the 934 baseline on both sides of the comparison. Recorded rather than
fixed: outside this spec's scope, and worth a ticket.

**`KZ-017` — what this re-measurement cannot reach.** `npm test` on the server runs `rootDir: "src"`
only; it does **not** run `test:e2e` or `test:integration`, which are separate jest configs and were
not executed. The fixtures suite runs against the disposable scratch schema at `127.0.0.1:3307`, not
the shared Dev database, so it cannot detect anything about Dev's actual state. No migration was
applied anywhere by this task (`K-015`: the pipeline deploys code, not migrations). And no automated
gate in either package can redden on a markdown claim — the archived-spec amendments that were the
substance of this rework are verified by reading and by the sweep, by nothing else.

---

#### Post-close verification — the two suites `KZ-017` recorded as NOT run (2026-09-01)

`execution.md`'s `KZ-017` blocks correctly declared that `npm test` (`rootDir: "src"`) never runs
`test:e2e` or `test:integration`. Both have now been executed. **Both fail, and neither failure
belongs to this spec** — established by measurement, not by inspection:

| Suite | Result | Cause | Attribution |
| --- | --- | --- | --- |
| `test:integration` | exit **1**, 9/9 failed | `T13_MYSQL_PASSWORD is not set. This suite refuses to fall back to a committed default credential.` | **Environmental, and another spec's.** The only spec it matches is `bilateral-primary-contributing-sp.integration-spec.ts` (`T-13`). It touches no quantification code |
| `test:e2e` | exit **1**, 1/1 failed | `RangeError: Maximum call stack size exceeded` in Nest DI (`cloneStaticInstance` ↔ `getInstanceByContextId`), plus a 5 s `beforeEach` timeout compiling `AppModule` | **Pre-existing.** Proven in a `git worktree` at `eca8e68f` — the commit before this spec's first code change — with `node_modules` symlinked. The baseline shows the **same** `RangeError`, exactly once, and the same boot timeout. Identical failure class on both sides |

The worktree was removed after measurement (`git worktree remove --force`). Neither suite contains a
test that touches `quantification`; all seven quantification-bearing test files live in the fixtures
suite, which does run and is green (17/17, 90/90).

#### Migration state — measured, not assumed

Both migrations **have executed**, against the disposable scratch schema only
(`ari_scratch_test` @ `127.0.0.1:3307`). Verified directly against `information_schema`:

```
migrations table:  AlterQuantificationNumberToDecimal1787260000000      ✓ applied
                   NormaliseQuantificationNumberInReportOicr1787270000000 ✓ applied
column:            quantification_number  decimal(24,4)  nullable=YES
view report_oicr:  present
```

So the DDL is proven to *apply cleanly*. What it is **not** proven against is real data: the scratch
schema is bootstrapped from the committed schema-only baseline, so the `ALTER … ALGORITHM=COPY` has
never run over a populated `result_quantifications`, and the row-count/duration characteristics on
Dev or Production are unmeasured.

**`BACKUP-1` confirmed live, with evidence.** The scratch schema still contains a
`result_quantifications_backup_1787260000000` table — the migration creates it and never drops it,
by design (the backout path needs it), but nothing removes it afterwards either. **On any shared
database this leaves a permanent full-table copy behind.** Previously ticketed on reading the code;
now observed in a database. Whoever applies the migration should plan its removal explicitly.

**Neither migration is applied anywhere else, and the pipeline will not apply them** (`K-015`).

---

#### HITL check — what the user confirmed on Dev (2026-09-01), and what it does NOT cover

**User-reported, after applying both migrations to the shared Dev database.** Recorded verbatim in
substance, scoped precisely — a human observation is evidence, but only for what was actually looked
at:

| Confirmed by the user | Discharges |
| --- | --- |
| Values persist to the database | `R-MSD-001` AC.1 (the save path works end to end on real infrastructure) |
| **Pre-existing data is still present** | The migration's data-preservation guarantee — `ALTER … ALGORITHM=COPY` did not lose rows. This is the single largest risk the migration carried, and it is now closed on Dev |
| Decimals are stored | `R-MSD-001` / `R-MSD-002` at the persistence tier — the `DECIMAL(24,4)` column and the two-way transformer round-trip correctly against real MySQL, not just the scratch schema |
| Negatives are stored | The signed half of the same, and `DD-2`'s removal of the `@Min(0)` floor on this field |

**NOT covered by that report — stated so nobody reads this entry as a full discharge:**

1. **`R-MSD-001` AC.7 / `DC-13` / `RK-11` — resaving an *untouched* measure row.** This is the
   spec's central defect and it is **not** the same as "decimals save" or "old data is still
   there". The failure shape: open a result whose measure row already has a value, edit **only
   something else** (the justification), and save **without touching the Number field**. The client
   resends whatever the previous read produced; `mysql2` returns `DECIMAL` as a **string** where
   `bigint` came back a number, and before the transformer that string hit the pipe and produced a
   `400` on a row the user never edited. Typing a new value exercises the *write* path; this
   exercises the *read-then-write* path, which is the one that broke.
2. **`NFR-MSD-004` / `DC-11` — the visual items**: both themes (light **and** dark), the
   placeholder reading "Enter a number", the spinner stepping a **whole unit** through `0`, and the
   legibility of the amber "Maximum reached" on `-549755813886.9999` (a **pinned** false positive,
   `RK-16` — judged for legibility, not correctness).

`tasks.md:335`'s checkbox therefore stays `[ ]`. It covers the visual gate, and the visual gate has
not been reported on. The persistence-tier confirmation above is real and is recorded on its own
terms.

#### `R-MSD-001` AC.7 / `DC-13` / `RK-11` — **DISCHARGED on Dev by the user (2026-09-01)**

The user resaved a result editing **only** the justification, leaving the measure row untouched, and
**it saved without error**. This is the spec's central defect and it is now closed on real
infrastructure: `mysql2` returns `DECIMAL` as a **string** where `bigint` returned a number, the page
resends whatever the previous read produced, and before `DD-2`'s two-way transformer that string hit
the pipe and produced a `400` on a row the user never edited. The write path (typing a new value) and
the read-then-write path are different, and it is the second one that broke. Both now pass.

#### The screenshot's `0` — investigated, NOT a defect

The user reported the Number field showing `0` with no amber warning, with a screenshot. Both
observations are **correct behaviour**, established by reading the code rather than by assurance:

| Question | Finding |
| --- | --- |
| Does a new row pre-fill `0`? | **No.** `InnovationUseQuantification.quantification_number` initialises to `undefined` (`get-innovation-use-details.interface.ts:49`) |
| Does the read adapter coerce `null` to `0`? | **No.** `quantificationsView` (`innovation-use-details.component.ts:310-316`) tests `=== undefined \|\| === null` and maps both to `null`, explicitly "never coerced to `0` (DD-2's null contract)" |
| Does PrimeNG's `writeValue` turn `null` into `0`? | **No.** `primeng-inputnumber.mjs:1635` is `this.value = value ? Number(value) : value` — `null` is falsy, so it passes through unchanged. (`0` is falsy too, and also passes through as `0`.) |
| Does `app-input` default a value to `0`? | **No.** `body = signal({ value: null })` (`input.component.ts:46`). The `@Input() min = 0` at `:35` is a **bound**, not a value, and the Innovation Use call site overrides it with a derived signed minimum (T-10/T-11) |

So the `0` is a genuine value — entered, or reached with the spinner from empty — which is precisely
`R-MSD-005`'s requirement that **`0` is a value, never an absence**. And the amber "Maximum reached"
is conditional on an **18-character** value string, so `0` cannot trigger it. The placeholder is not
visible for the same reason a placeholder never is: the field is not empty.

**Still not reported on, and therefore `tasks.md:335` stays `[ ]`:** the placeholder text with the
field **cleared**; the amber warning triggered deliberately with `-549755813886.9999` (a **pinned**
false positive, `RK-16` — judged for legibility only); the spinner stepping a whole unit **through**
`0`; and **dark theme**. The screenshot shows light theme only.
