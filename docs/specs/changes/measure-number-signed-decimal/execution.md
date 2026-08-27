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
