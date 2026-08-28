# Tasks — Results / Measure `Number` accepts signed decimals

- **Module:** results
- **Spec id:** `changes/measure-number-signed-decimal`
- **Status:** ⚠️ **NOT closed — two items open with the user.** `T-01`–`T-10` done; `T-11` done except acceptance item 8 (HITL visual gate); `T-12` done except acceptance item 3 (comms record — a human must send it). *(Corrected by `T-12`, 2026-08-27 — this line previously read "not-started".)*
- **Owner:** <name / squad>
- **Linked requirements:** [./requirements.md](./requirements.md)
- **Linked design:** [./design.md](./design.md)
- **Judgment ledger:** [./judgment.md](./judgment.md) — **frozen at round 4; no further rounds authorized**
- **Depth:** Full
- **Last updated:** 2026-08-27

---

## 0. Read this before starting a task

**`design.md` is authoritative wherever it and `requirements.md` disagree.** That is the binding condition of the 2026-08-26 acceptance and it has not been lifted.

Four things bite, and they are the reason this spec is `Full` depth:

| # | |
| --- | --- |
| **A** | **`T-01`'s pre-flight is BLOCKING.** Two queries, not one. If either returns a disqualifying row, the change **stops** for a human ruling. It is not a formality and it is not confirmatory |
| **B** | **Code first, migrations second, never the reverse.** Applying the `ALTER` before `T-02`'s transformer ships puts a `DECIMAL` string on the wire with no normaliser → `400` on the Innovation Use path and **silent row replacement** on the OICR path (`DC-16`) |
| **C** | **The migration is applied by a human.** The pipeline deploys code but **not** migrations (`K-015`). Merging does not ship this schema |
| **D** | **Run every `/akili-*` command with cwd = `alliance-research-indicators-main`.** From `-management` the `akili-*` model wrappers and the `akili-tasks-gate` hook silently do not load — this actually happened during round 4 and is recorded in the ledger |

**`id ≠ level`** and the other family traps in `docs/specs/innovation-use/family.md` still bind.

---

## 1. Task numbering

`T-01` … `T-12`. Higher numbers do not imply higher priority — see §2.

---

## 2. Dependency graph

```mermaid
graph TD
  T01[T-01 Pre-flight measurement<br/>BLOCKING GATE] --> T02[T-02 Entity: DECIMAL + transformer]
  T01 --> T05[T-05 Migration 1: ALTER + backup]
  T02 --> T03[T-03 base-service param + rule map]
  T02 --> T05
  T02 --> T11[T-11 Innovation Use call site]
  T03 --> T07[T-07 Fixtures: storage, versioning, identity]
  T04[T-04 IU DTO scale constraint] --> T07
  T02 --> T04
  T05 --> T06[T-06 Migration 2: report_oicr]
  T05 --> T07
  T06 --> T08[T-08 Fixture: report rendering]
  T09[T-09 app-input: max as Input] --> T10[T-10 Card: inputs + default 0]
  T10 --> T11
  T07 --> T12[T-12 Spec amendments + comms]
  T08 --> T12
  T11 --> T12
```

**PR boundary.** `T-01`…`T-08` are **PR 1 (server)**; `T-09`…`T-12` are **PR 2 (client + closure)**. `T-11` depends on `T-02`'s transformer existing, so PR 2 lands after PR 1.

---

## 3. Task list

### T-01 — Execute the blocking pre-flight and record its verbatim output

- **Requirements covered:** `NFR-MSD-002`; gates `R-MSD-011` AC.7
- **Design references:** `design.md` §11, `RK-4`, `RK-14`, `U-2`, `U-9`
- **Files touched (intended):** `execution.md` only — **no source file**
- **Description:** Run both pre-flight queries against the target database and paste the output verbatim into `execution.md`. This task can **stop the spec**. It exists because two of `design.md`'s numeric premises are unknowable from the repo.
- **Implementation notes:**
  - Query 1 — magnitude: `SELECT COUNT(*), MIN(quantification_number), MAX(quantification_number), MAX(LENGTH(TRIM(LEADING '-' FROM quantification_number))) FROM result_quantifications;`
  - Query 2 — **sign, by role** (added at round 4): `SELECT quantification_role_id, COUNT(*) FROM result_quantifications WHERE quantification_number < 0 GROUP BY quantification_role_id;`
  - Query 1 has **no role filter**, which is precisely why query 2 is not redundant: a global `MIN` cannot say *which* role holds it.
- **Acceptance / done check:**
  - [x] Both queries executed against the target DB; **output pasted verbatim**, not summarised, not derived.
  - [x] **STOP CONDITION 1** — any role-3 row with `|value| > 549,755,813,887` halts the change for a human ruling (`RK-4`). **Not triggered:** global `max_v` = 87,654 with `min_v` = 0, so role 3 is bounded by containment.
  - [x] **STOP CONDITION 2** — any role-1 or role-2 row with a negative value halts the change for a human ruling (`RK-14`). Such a row would `400` on a save its reporter never made. **Not triggered:** query 2 returned zero rows.
  - [x] The row count and `ALGORITHM=COPY` implication are recorded for `T-05`'s lock-window estimate (`U-2`). **80 rows** — copy phase negligible; the MDL wait is independent of size.
- **What disqualifies this evidence:** a query run against a **local scratch schema** instead of the target database measures nothing — the whole point is live data. If the target DB is unreachable, this task is **BLOCKED**, not passed; record "unreachable" and stop. A summarised result ("no negatives found") without the pasted output is a `KZ-008` claim, not a measurement.
- **Input that would make this check FAIL:** seed a negative role-1 row and a role-3 row at `549,755,813,888` in a scratch copy and re-run — both stop conditions must fire. **If neither fires, the queries are not evidence.**
- **Dependencies:** none
- **Estimated effort:** S · **Skills:** none (DBA/DevOps coordination)
- **Status:** **done** — Reviewer `PASS` 2026-08-27, evidence in [`execution.md`](./execution.md) → `### T-01`. Neither stop condition fired on Dev; both shown able to fire on seeded scratch input (K-004).

---

### T-02 — Entity: `DECIMAL(24,4)` column + two-way null-safe transformer

- **Requirements covered:** `R-MSD-003` (scenario *An untouched measure row does not break the save*, `:256`, `:257`), `R-MSD-009`, `R-MSD-013`
- **Design references:** `DD-1`, `DD-2`, §5.3, §5.4
- **Files touched (intended):** `server/.../result-quantifications/entities/result-quantification.entity.ts`; `server/.../result-innovation-use/result-innovation-use.service.ts` (the `:287-288` doc comment only, `K-24`)
- **Description:** Change the column to `DECIMAL(24,4) NULL` and add a two-way, null-safe `transformer`. This is the single most load-bearing task in the spec: without it an untouched row `400`s **and** the upsert's composite key stops matching, replacing rows silently.
- **Implementation notes:**
  - **`null` must map to `null`, never `0`.** TypeORM applies the transformer to null *before* any type branch (`MysqlDriver.js:510-514`); a naive `Number(v)` breaks the `null ≠ 0` invariant, `quantificationRowAbsent`, and three ACs (`J-23`).
  - **Specify the `to` direction as well** — `upsertByCompositeKeys` re-saves hydrated entities, so it runs on every save of an unchanged row (`J-24`).
  - Do **not** use `decimalNumbers: true` on the datasource: seven existing `DECIMAL` columns plus every raw query are in that blast radius (`J-16`).
  - `bilateral.service.ts:669-686` is the in-repo precedent for the null-safe coercion shape.
- **Acceptance / done check:**
  - [x] `null` round-trips as `null` in **both** directions, asserted separately per direction. → **DISCHARGED AT `T-07`** 2026-08-27 (raw SQL for `to`, a real service read for `from`, in both the IU and OICR tests). Transfer closed.
  - [x] A read value resent verbatim does not `400` — exercised with a value **from a real read**, never a literal (`:257`, `DD-19`, **K-012**). → **DISCHARGED AT `T-07`** 2026-08-27: `harness.service.findOne` output resent unmodified through `harness.service.update`. Transfer closed.
  - [x] `String(value)` composite-key construction produces the **same key** before and after, for an unchanged row. → **DISCHARGED AT `T-07`** 2026-08-27 via PK-identity assertions through the real `upsertByCompositeKeys`. Transfer closed.
  - [x] The `:287-288` doc comment no longer contradicts §5.4.
- **What disqualifies this evidence:** a unit test using a **mocked repository** proves nothing here — the defect lives in the driver's hydration type, which a mock supplies by fiat. Mocked-repo tests are allowed as fast feedback but **may not close** this task; `T-07`'s fixture is the gate.
- **Input that would make this check FAIL:** delete the `from` direction and the untouched-row test must `400`; delete the `to` direction and the composite key must change on resave; return `0` for null and `quantificationRowAbsent` must redden. **If any of those three still passes, the test is asserting the mock.**
- **Dependencies:** T-01
- **Estimated effort:** M · **Skills:** `nestjs-expert`, `tdd`
- **Status:** **done (code)** — Reviewer `PASS` on attempt 2, 2026-08-27; evidence in [`execution.md`](./execution.md) → `### T-02`. ✅ **Acceptance items 1–3 were transferred to `T-07` and are now DISCHARGED there (2026-08-27).** Originally: **transferred because `T-07` is the gate** — this task's disqualifier names T-07's fixture as their gate, and T-07 depends on T-02, so they could not be discharged here.

---

### T-03 — `base-service.ts` optional `dataRole` + `createCustomValidation` override with the per-role rule map

- **Requirements covered:** `R-MSD-011` (all ACs, and scenario *The API stops silently rounding*, `:495`), `R-MSD-007`
- **Design references:** `DD-13` (**v4**), `RK-13`, `RK-14`, `RK-15`, `U-12`
- **Files touched (intended):** `server/.../shared/global-dto/base-service.ts`; `server/.../result-quantifications/result-quantifications.service.ts`; `server/.../result-quantifications/result-quantifications.service.spec.ts`
- **Description:** Add an **optional** `dataRole` second parameter to `createCustomValidation`, forward it from both existing call sites, and override the hook in `ResultQuantificationsService` with a per-role rule map. **This is the round-4 repair of `M-01`** — v3 named a seam that receives no role, so a payload-keyed map would have rejected every role-3 value this spec exists to enable.
- **Implementation notes:**
  - `base-service.ts:279-281` declares one parameter today. The role reaches the base only as `upsertByCompositeKeys`'s `dataRole`, attached to rows at `:354-355` — **after** the hook. Forward it at **`:134` and `:345`**.
  - **Additive by construction:** `grep -rn "createCustomValidation" src` → exactly `:134`, `:278`, `:345`, **no override anywhere**. Confirm this again before editing; if an override has appeared, this task's safety argument is void.
  - **The rule must key on the PARAMETER, never on a `quantification_role_id` in the payload.** `update-oicr.dto.ts` types its arrays as the full entity and its controller applies **no pipe**, so a payload-keyed map lets a client send `quantification_role_id: 3` and buy the permissive rule.
  - **Rule map:** default (roles 1, 2, any future role) = non-negative integer. Role 3 = signed, ≤ 4 decimals, within `DD-14`'s bound.
  - **Null contract:** `null`/`undefined` are accepted and skipped by **every** entry including the default (`R-MSD-011` AC.6).
- **Acceptance / done check:**
  - [x] Role 3 accepts `-12.75`; roles 1 and 2 reject it `400`. Both asserted through `upsertByCompositeKeys`, **not** by calling the override directly. **Extended in attempt 2** to a table over `0.07, 1.005, 0.0003, 2.55, 0.0001, ±549,755,813,887` — the single `-12.75` case could not discriminate, being dyadic.
  - [x] `null` is accepted on **every** role, asserted per role.
  - [x] The rule is selected from `dataRole`; a payload carrying `quantification_role_id: 3` on an OICR call is **still** validated as role 1 (`R-MSD-011` AC.2). Falsified: a payload-keyed variant was shown buying the permissive rule, then reverted.
  - [x] `git diff --exit-code` is clean for every file under `result-oicr/` (`R-MSD-011` AC.3).
  - [x] Existing `base-service` consumers are unaffected — full server suite green (`354 suites / 2702 tests`, re-measured by the Leader).
- **What disqualifies this evidence:** asserting on a **call sequence** — "`createCustomValidation` was called with X" — proves the mock's wiring, not the rejection (**KZ-001**). The assertion must be on the thrown `400` / the persisted row. A test that calls the override directly bypasses the very forwarding this task adds and would stay green if `:134`/`:345` were never touched.
- **Input that would make this check FAIL:** revert the `dataRole` forwarding at `:345` — the role-3 acceptance test must redden (the map falls to the default and rejects `-12.75`). **If it still passes, the test is not exercising the seam.** Separately: send `quantification_role_id: 3` in an OICR payload; if that buys the permissive rule, the map is payload-keyed and the task is not done.
- **Declared and NOT fixed here:** `RK-13` (`updateOicr` is not transactional, so this `400` lands on a partially-committed update) and `RK-15` (`upsertQuantificationsByRole` bypasses the base class). Both are out of scope; do not silently fix either, and do not claim the guarantee is absolute.
- **Dependencies:** T-02
- **Estimated effort:** M · **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`
- **Status:** **done** — Reviewer `PASS` on attempt **3 of 3** (the ceiling), 2026-08-27; evidence in [`execution.md`](./execution.md) → `### T-03`. ⚠️ **Carries a ticketed, reachable advisory into `T-04`:** the shipped scale predicate falsely rejects `274877906944.0405` and ~8.98% of the band `[274,877,906,944, 450,359,962,737)`. `T-04` implements the same `≤ 4 decimals` rule and **must not reproduce this predicate** — see the forward pointer in `execution.md`.

---

### T-04 — Innovation Use DTO: custom scale + range constraint, with the mandated evaluation order

- **Requirements covered:** `R-MSD-003` (scenario *The relaxation does not leak to the siblings*, `:265`, `:266`), `R-MSD-007`
- **Design references:** `DD-8`, `DD-17`, `DC-15`
- **Files touched (intended):** `server/.../result-innovation-use/dto/create-result-innovation-use.dto.ts` + its spec
- **Description:** Remove `@Min(0)` / `@IsInt()` from `quantification_number` **only**, and add a custom constraint whose four steps run in a mandated order. The six sibling count fields keep their decorators untouched.
- **Implementation notes:**
  - **Do not use `@IsNumber({ maxDecimalPlaces })`.** `class-validator` does `value.toString().split('.')[1].length`, which throws `TypeError` on exponential notation — a **`500`** where `@IsInt()` returned a clean `400` (`J-15`).
  - **Mandated order, each step gating the next:** ① reject non-`number`; ② reject non-finite; ③ reject outside `DD-14`'s bound — **this must precede any string conversion**, or `1e21` reproduces the very `TypeError` the constraint exists to remove; ④ only then derive the scale, and **not** via `toFixed` at high precision (`(2.55).toFixed(20)` → `"2.54999999999999982236"` rejects a legal value; `(1e-7).toFixed(4)` → `"0.0000"` silently rounds to zero).
  - The crash condition is **not** "any `|value| < 1e-6`": `1.5e-7` returns `true` today and is accepted (`K-05`).
  - Follow `IsActorCountModeExclusiveConstraint` in the same file.
- **Acceptance / done check:**
  - [x] `1e-7`, `-1e-7` and `1e21` each return a clean **`400`**, never a `500` (`DC-15`). Asserted on the **status** (`getStatus() === 400`), not on `toThrow()`.
  - [x] `2.55` is **accepted** — the `toFixed` trap does not fire. ⚠️ **Discharged by dominating values, not by the named literal:** `2.55` appears in no test. The property is pinned by `3.3` (controller spec) and `274877906944.0405` (DTO spec) — both non-dyadic, both rejected by a `toFixed(20)` mechanism. Recorded so the basis is traceable.
  - [x] The `400` for a sibling field names `actors_count` and **does not** name `quantification_number` (`:265`, `:266`).
  - [x] All **six** sibling count fields still reject `2.5`, asserted per field, not as a group.
  - [x] The four steps are asserted **in order** — ~~a test that only checks the end result would pass with steps ③ and ④ swapped, which is the `500` bug~~. ⚠️ **This parenthetical is FALSE and was measured so** — see `execution.md` → `### T-04`. The swap's failure mode is a **silent false accept (`2xx`)**, not a `500`; `1e21` cannot detect it; and the swap **does not compile** (block ④ ends in `return`, so ③ becomes dead code and `tsc` loses step ①'s narrowing → `TS2365`). Pinned instead by `9.9e20` and `MAX+1`, with the step-③-deletion red observed. Step ② is pinned by `NaN`.
- **What disqualifies this evidence:** a single "rejects bad input" test that does not distinguish `400` from `500` cannot see `DC-15` at all — the status code **is** the defect. Assert the status, not merely that it threw.
- **Input that would make this check FAIL:** ~~swap steps ③ and ④ and send `1e21` — the response must become a `500` and the test must redden.~~ ⚠️ **MEASURED WRONG on three counts** (2026-08-27, both Reviewer lenses concurring): the failure mode is a **silent false accept**, not a `500`; `1e21` is double-guarded and structurally cannot detect the swap; and the literal swap **is not executable in TypeScript** — moving block ④ above ③ makes ③ unreachable, so `value` reverts to `unknown` and `tsc` fails with `TS2365` before any test runs. **Its only executable equivalent is deleting step ③**, which was run: `9.9e20` and `MAX+1` redden while `1e21` stays green. Correct this task text when the spec is next amended.
- **Files touched (actual):** the two intended files **plus `result-innovation-use.controller.spec.ts`** — two pre-existing tests encoded the pre-`DD-8` rule and had to be updated. Upheld by review, with `T-10`'s own text as precedent.
- **Dependencies:** T-02
- **Estimated effort:** M · **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`
- **Status:** **done** — Reviewer `PASS` on attempt **3 of 3** (both lenses), 2026-08-27; evidence in [`execution.md`](./execution.md) → `### T-04`. The production constraint was correct on attempt 1 and never changed; all three FAILs were false claims in prose. ⚠️ **Standing limit:** `npm test` has `rootDir: "src"` and never runs the fixture or e2e configs, so the four `innovation-use/*.fixture-spec.ts` files touching this column were **not executed** — `T-07` owns that proof.

---

### T-05 — Migration 1: backup table → `ALTER` → whole-table diff

- **Requirements covered:** `NFR-MSD-001`, `R-MSD-004`
- **Design references:** `DD-1`, `DD-18`, `AR-2`, `U-2`
- **Files touched (intended):** `server/.../db/migrations/<ts>-alterQuantificationNumberToDecimal.ts`
- **Description:** Create a backup table, `ALTER` the column to `DECIMAL(24,4) NULL`, then diff the whole table. `p − s = 20 > 19` makes the `ALTER` lossless **by construction** for any `bigint`, so the backup is not a restore path for `up()` — it is the **only honest restore path for `down()`**, which rounds fractions and can **fail** on a wide value.
- **Implementation notes:**
  - ⚠️ A type change requires **`ALGORITHM=COPY`** — a full table rebuild that **locks writes** and needs disk headroom. On the shared Dev database that is an operational event; use `T-01`'s row count to size the window and tell DevOps before running.
  - Chosen over an in-table temporary column, which lives inside the table the `ALTER` rebuilds and forces three rebuilds instead of one.
  - The backup table is **retained until sign-off**, not dropped in the same migration.
- **Acceptance / done check:**
  - [x] `up()` executed on a scratch schema; whole-table diff shows **zero** value changes. Seeded `NULL`, `-1500`, a 19-digit value, `0`, `42` **before** the diff, so it is not vacuous.
  - [x] `down()` executed and **its lossiness demonstrated, not asserted**: `2.5` → `3`, and `9223372036854775808` fails whole-statement with **`1292` / `ER_TRUNCATED_WRONG_VALUE`** (`AR-2`, `R-MSD-004` AC.4 — both the literal and the error codes were spec-text errors, corrected above and in AC.4).
  - [x] Restoration from the backup table executed **at least once** (`R-MSD-004` AC.5). Confirms the honest limit: it restores the **pre-migration state**, and `2.5` is recoverable by nothing.
  - [x] Migration ordering places this **before** migration 2. `1787260000000` > `1787253483599`, nothing above it — **`T-06` must claim `> 1787260000000`.**
- **What disqualifies this evidence:** running `up()` on an **empty** scratch schema proves the DDL parses, not that it is lossless — a diff over zero rows is vacuously clean. Seed representative rows (including `NULL`, a negative, and a 19-digit value) **before** the diff, or the check has evaluated nothing.
- **Input that would make this check FAIL:** seed **`9223372036854775808`**, run `down()` — it must fail rather than silently truncate. ⚠️ **CORRECTED 2026-08-27 (measured):** this previously read `9223372036854775807`, which is **exactly** `2^63 − 1`, signed `bigint`'s max — *in* range, so it round-trips losslessly and cannot instantiate `AR-2`'s *"wider than a signed `bigint`"*. Executed: `down()` **succeeded** on the old literal. `9223372036854775808` (`2^63`, max + 1) is the smallest value that actually falsifies. Seed `2.5`, run `down()` — the value must round; the backup-table restore then returns the table to its **pre-migration** state. ⚠️ The backup **cannot recover `2.5` itself** — it is taken before the `ALTER` and holds only `bigint` integers. That irrecoverability is the accepted lossiness and the reason `down()` alone is not a revert path.
- **Dependencies:** T-01, T-02
- **Estimated effort:** L · **Skills:** `nestjs-expert`
- **Status:** **done** — Reviewer `PASS` on attempt **3 of 3** (both lenses), 2026-08-27; evidence in [`execution.md`](./execution.md) → `### T-05`. ⚠️ **Three carries for later tasks:** (1) **`T-06` must claim a timestamp `> 1787260000000`**; (2) the scratch `quantification_roles` catalog holds **only role 3** — `T-06`/`T-08` must seed roles 1/2 or the FK will reject them; (3) **the retained backup table has no owner** — escalated to the user as a spec gap, since neither sign-off list nor `T-12` mentions dropping it.

---

### T-06 — Migration 2: recreate `report_oicr` with `DD-10`'s expression

- **Requirements covered:** `R-MSD-010`
- **Design references:** `DD-10`, §9.1, §9.2, `U-1`, `U-3`, `U-5`, `U-8`, `OQ-1`
- **Files touched (intended):** `server/.../db/migrations/<ts>-normaliseQuantificationNumberInReportOicr.ts`
- **Description:** Recreate the `report_oicr` view using the expression written out in §9.2, so an OICR export does not start rendering `10.0000` where it rendered `10`. **~200 lines of view SQL — the higher-risk of the two migrations**, because it embeds an expression that cannot be edited after deploy (**ADR-5**).
- **Implementation notes:**
  - ⚠️ **`OQ-1` is open and gates `R-MSD-010` AC.3.** Recommendation on file is *ship it*; get the ruling before merging, not after.
  - **Transcribe the live view before writing about it** (`DD-10`, `D-10`). `U-3`: only the migration ordering is verified — a `SHOW CREATE VIEW` at rollout settles whether the live body matches `1780694172676`'s text.
  - `U-8` is **unsettled**: the charset/collation of the two `IF()` branches inside `CONCAT_WS`. The live view already needs `convert(report_field(...) using utf8mb3)` on another column (`baseline.sql:8080`) — direct evidence that collation aggregation here is not safely assumable. Resolve it against real MySQL in `T-08`, not by reasoning.
  - Needs nothing above MySQL 8.0.4; `OQ-D5` no longer gates this.
- **Acceptance / done check:**
  - [x] `SHOW CREATE VIEW report_oicr` captured **before** the migration and pasted into `execution.md` (`U-3`). All three captures (before / after `up()` / after `down()`) preserved with hashes — they existed only in a session-scoped temp dir.
  - [x] `down()` restores the previous body byte-for-byte, verified by comparing the captured text. **Leader-measured:** identical once `DEFINER` is normalised; the `DEFINER` delta is a connection-derived control, not a defect, since the migration text emits no `DEFINER` clause at all.
  - [x] Collation of the `CONCAT_WS` result asserted from an executed query, not assumed (`U-8`). ⚠️ **Attributed to the evidence that could have FAILED** — both branches executed with no `1267` and no new warnings — **not** to either collation readout, since one is the measuring session's and the other is fixed by `report_field`'s declaration and structurally cannot detect a mismatch.
  - [ ] `OQ-1` ruling recorded before merge. ⚠️ **OUTSTANDING — deliberately not discharged.** Gates `R-MSD-010` AC.3 and this task's **merge**, not its implementation. Recommendation on file is *ship it*; the ruling is the product owner's + eng lead's.
- **What disqualifies this evidence:** §9.2's expected renders are **predicted, not executed** (`U-1`, `U-5`) — no MySQL was reachable to any of the eight judges. **Reasoning about `DECIMAL` formatting is explicitly disqualified** as evidence by `:483` (⚠️ anchor corrected by `T-12`, was `:461` — `requirements.md` line numbers rot on every edit, see §4). Until `T-08` runs the query, this task's rendering claims are unverified and must be labelled so.
- **Input that would make this check FAIL:** run the trim expression against a `bigint` column — `'10'` must render `'1'`, demonstrating `DC-14`. **If it does not, the expression is not the one under test.** ✅ **Executed:** bare trim gave `1 / -1 / (empty)` where `DD-10`'s guarded expression gave `10 / -10 / 0` on the same rows. ⚠️ **The framing was wrong, though:** `migration:test:revert` is LIFO, so once T-06 exists one revert removes the expression under test and two remove the column change too. Reached instead by a direct `ALTER` on the scratch schema. **`T-08`'s item 3 has the same flaw.**
- **Dependencies:** T-05
- **Estimated effort:** L · **Skills:** `nestjs-expert`
- **Status:** **done (implementation)** — Reviewer `PASS` on attempt 2, 2026-08-27; evidence in [`execution.md`](./execution.md) → `### T-06`. ⚠️ **MERGE GATED: `OQ-1` unresolved** (acceptance item 4 open by design). **Three carries:** (1) **`T-08` item 3 is not executable** — `migration:test:revert` cannot reach the `bigint` branch once both migrations exist; use a direct `ALTER`. (2) **The scratch container does not represent Dev's `sql_mode`** — container 8.0.46 *with* `ONLY_FULL_GROUP_BY`, Dev 8.0.45 *without*; favourable for T-06, **not** for T-07/T-08. (3) **A single `migration:revert` on Dev is a silent regression** — it reverts T-06 alone, leaving a `DECIMAL` column under the bare view, so OICR exports render `10.0000` again with no error.

---

### T-07 — Fixtures: storage, the `SP_versioning` copy path, and row identity on both paths

- **Requirements covered:** `R-MSD-004` (`:297`, `:298`), `R-MSD-005` (`:327`, `:328`), `R-MSD-013` (`:545`, `:546`), `R-MSD-003` (`:256`, `:257`)
- **Design references:** `DD-9`, `DD-19`, `DD-20`, `RK-9`, `DC-16`, `DC-13`
- **Files touched (intended):** `test/fixtures/.../innovation-use-section-round-trip.fixture-spec.ts`; `test/fixtures/.../innovation-use-lifecycle-routines.fixture-spec.ts`; **new** `test/fixtures/innovation-use/oicr-quantification-save.fixture-spec.ts`
- **Description:** The fixture tier is where this spec's real risk lives — `DC-16` (silent row replacement) is observable at no tier below it. Three concerns: the value survives MySQL, it survives `SP_versioning`'s copy path, and an unmodified save does not churn rows on **either** write path.
- **Implementation notes:**
  - **Untouched-row fixture must save → read → resave unmodified, seeded from the read.** A hand-written literal is always the right type and could never go red (**K-012**, `DD-19`).
  - **The copy-path comparison must be multi-row-aware and state its matching key.** `result_quantifications` holds several rows per result, including deactivated ones — match on `(result_id, quantification_role_id, unit, description)`, **never** on the value, which is what is under test (`DD-20`, `K-20`).
  - Only **`SP_versioning`'s copy path** names this column (`:367`, `:380`). The other three routines reference the table only, so they can orphan rows but cannot lose a value (`J-11`).
  - ⚠️ **The OICR fixture must EXPECT `L-08`**, not be surprised by it: `oicr-details.component.ts` sends `q.number ?? 0` while its read preserves `null`, so a `NULL`-valued OICR row churns on save even with `DD-2`. **Pre-existing client defect; this spec reports it and does not fix it.**
  - ⚠️ **INHERITED FROM `T-02` (recorded by the Leader 2026-08-27, on `T-02`'s Reviewer `PASS`).** `T-02`'s acceptance items 1–3 were **transferred here**, because `T-02`'s own disqualifier names this fixture as their gate while `T-07` depends on `T-02`. They are not new scope — they are `T-02`'s scope arriving at the tier that can discharge it, and the `T-07` brief MUST carry them: **(1)** `null` round-trips as `null` in **both** directions, asserted separately per direction; **(2)** a read value resent verbatim does not `400`, exercised with a value **from a real read**, never a literal (`:257`, `DD-19`, `K-012`) — `T-02`'s spec file states in its own comments that it does **not** satisfy this; **(3)** `String(value)` composite-key construction yields the **same key** before and after for an unchanged row, exercised through the real `upsertByCompositeKeys`, not the transformer alone. See `execution.md` → `### T-02` → *forward pointer*.
- **Acceptance / done check:**
  - [x] `-12.75` stored and re-read as `-12.75` — not `3`, `2`, or `2.5000` re-read differently (`:297`).
  - [x] The versioned row holds `-12.75`, read **out of MySQL** on both sides (`:328`), matched on the four-column key. **Attempt 2 fix:** `SELECT *` on both sides trimmed of only `id`/`result_id`, so **all ten** remaining columns are compared per `ADR-11` — attempt 1's hand-written three-column list violated `R-MSD-005` AC.2 and stayed green when a copied column was dropped.
  - [x] An unmodified save changes **no** primary key and deactivates **no** row, on **both** the IU and OICR paths (`:545`).
  - [x] Every value under test is **seeded from a real read** (`:546`, `:257`).
  - [x] The `NULL`-valued OICR churn is asserted as **expected** behaviour with a comment naming `L-08`. ⚠️ The comment also records that fixing `L-08` will **not** redden this test (the `?? 0` is hard-coded here, not read from the client) — it becomes a pin on `upsertByCompositeKeys`'s null-vs-`0` key semantics instead.
- **What disqualifies this evidence:** a fixture that asserts `toHaveLength(1)` against `result_quantifications` is asserting a false premise — the table holds several rows per result (`J-20`). A green run against a schema that was **not** rebuilt from `baseline.sql` may be testing a stale view or a pre-migration column; rebuild first or the run is not evidence. **Routine bodies are not to be diffed** — `:327` explicitly disqualifies a body diff, because the body does not change.
- **Input that would make this check FAIL:** remove the entity transformer and re-run — the untouched-row save must `400` **and** the composite keys must change. **If either stays green, the fixture is not reaching the defect.** For the copy path: match on the value instead of the four-column key and the test must become vacuous.
- **Dependencies:** T-03, T-04, T-05
- **Estimated effort:** L · **Skills:** `tdd`, `nestjs-expert`
- **Status:** **done** — Reviewer `PASS` on attempt 2, 2026-08-27, **both lenses**; evidence in [`execution.md`](./execution.md) → `### T-07`. ✅ **Discharges `T-02`'s three transferred acceptance items.** ⚠️ **Two carries for `T-08`:** (1) repeat the `information_schema` guard over **`report_oicr`** and prove it red — T-08's sentinels (`10`, `-10.0000`, `NULL`) have the same **integer-blindness** that let this task's OICR fixture pass on a baseline-only schema; (2) **T-08 item 3 is not executable** — `migration:test:revert` cannot reach the `bigint` branch once both migrations exist; use a direct `ALTER`. ⚠️ **One carry for `T-12`:** F13d's stale-schema tripwire is now **solely** its sentinel assertions (the `SELECT *` `toEqual` cannot detect a `bigint` column — both sides hold `-13`); add a comment clause so they are not deleted as redundant.

---

### T-08 — Fixture: `report_oicr` / `report_field` rendering, executed against real MySQL

- **Requirements covered:** `R-MSD-010` (`:483`, `:484`, `:485` — ⚠️ anchors corrected by `T-12`, were `:461`/`:462`/`:463`)
- **Design references:** `DD-10`, `DD-11`, `DC-7`, `DC-14`, `U-1`, `U-5`, `U-8`
- **Files touched (intended):** **new** `test/fixtures/innovation-use/report-oicr-number-rendering.fixture-spec.ts`
- **Description:** The gate `DC-7` and `DC-14` were wrongly told they could not have. `baseline.sql` ships `report_field` (`:6559`) and the `report_oicr` view into the bootstrapped scratch schema, and fixtures already run raw SQL — so this is automatable, and the human substitute the superseded draft named is withdrawn.
- **Implementation notes:**
  - Cover the **seven** cases from `DD-10`, **including `NULL`** and the `bigint` branch via `migration:test:revert`.
  - `:485` (was `:463`) mandates the **`-10.0000`** case specifically — it is the one that distinguishes a `down()`-safe expression from one that is not.
  - This task is what converts `U-1` and `U-5` from *reasoned* to *executed*. Update `design.md` §17 when it does.
- **Acceptance / done check:**
  - [x] All seven cases executed; **output pasted verbatim** into `execution.md` (`:484`, was `:462`). Case **count** asserted too (`toEqual` over 7 labels + `toHaveLength(7)`), per the disqualifier that a `NULL` case rendering empty and one never run look identical in a pass count.
  - [x] The `-10.0000` case present and passing (`:485`, was `:463`).
  - [x] The `bigint` branch exercised — `'10'` renders `'1'` under the **bare** trim while `DD-10`'s **guarded** expression renders `'10'` on the same rows, demonstrating `DC-14`. ⚠️ **NOT via `migration:test:revert`, which is not executable** (revert is LIFO — one revert removes the expression under test, two remove the column change too). Reached via a session-scoped `CREATE TEMPORARY TABLE` after a direct `ALTER` was **measured** to break sibling fixtures (`FP-51`).
  - [x] `U-8`'s collation question answered from executed output. ⚠️ Attributed to **both branches executing with no `1267` and no new warnings** — *not* to either collation readout, since one is the measuring session's and the other is fixed by `report_field`'s declaration and structurally cannot detect a mismatch.
  - [x] `design.md` §17 updated: `U-1` **verified**; `U-5` three of four properties verified with *Version-portable* **named as residue** (a syntax-availability fact no execution can settle). `U-8`'s row also corrected by the Leader — it read *"Unsettled"* while `U-5`'s row called it answered, so §17 contradicted itself.
- **What disqualifies this evidence:** **SQL formatting reasoned about rather than observed is explicitly disqualified** (`:483`, was `:461`). A green run that skipped the `bigint` branch has not tested `DC-14` at all — it tested the happy path and reported success. **A `NULL` case that renders empty and a `NULL` case that was never run look identical in a pass count**; assert the count of cases executed.
- **Input that would make this check FAIL:** run the trim against the `bigint` column — `'10'` → `'1'` must redden the migrated-column expectation. **If nothing reddens, the fixture is not discriminating between the two column types.**
- **Dependencies:** T-06
- **Estimated effort:** M · **Skills:** `tdd`
- **Status:** **done** — Reviewer `PASS` on attempt 1, 2026-08-27; evidence in [`execution.md`](./execution.md) → `### T-08`. **`U-1` and `U-5` are now EXECUTED, not reasoned** — the gate `DC-7`/`DC-14` were wrongly told they could not have. ⚠️ **Two reachable gaps left open by decision, escalated to the user rather than absorbed:** (1) **role 2 (`extrapolated_estimates`) is executed nowhere** — the view carries `DD-10` at two sites and every seed is role 1, so a half-patched body passes the guard, all six renders and the count; (2) **the fixture's inlined SQL is pinned to the migration's by nothing** — a hand-retyped copy, correct today, verified by nobody tomorrow. ⚠️ **`FP-51` added to the child guide** from this task's measured finding: no DDL against the shared scratch schema while `test:fixtures` runs.

---

### T-09 — `app-input`: `max` becomes an `@Input`; the character guard is asserted UNCHANGED

- **Requirements covered:** `R-MSD-012` (AC.1, AC.2, AC.4), `R-MSD-006` (`:362`, `:363`, AC.3, AC.5, AC.6)
- **Design references:** `DD-14`, `DD-7` (**withdrawn**), `DD-16`, `RK-16`, `U-10`
- **Files touched (intended):** `client/.../shared/components/custom-fields/input/input.component.ts` + `.spec.ts`
- **Description:** Promote `max` from a plain field to an `@Input()` whose default is today's `Number.MAX_SAFE_INTEGER`. **Nothing else changes in this file** — `DD-7` is withdrawn, so the character guard is not touched, not re-united, and not removed.
- **Implementation notes:**
  - `max` is **already bound** at `input.component.html:47`, and `grep -rn "\[max\]" src --include=*.html` returns **only** that line — no call site binds it, so promotion is inert by construction.
  - **The guard's signal is shared with the `type === 'text'` branch.** Removing it deletes the only user feedback for 40,000-character paste truncation on **every** `app-input` in the app (`L-02`). This is why `DD-7` was withdrawn after three failed versions.
  - `DD-14`'s bound: `max = 2^(53 − ⌈log₂(10^scale)⌉) − 1`. Scale 4 → **549,755,813,887**. Scale 0 lands **exactly** on `Number.MAX_SAFE_INTEGER` as a consequence of the formula, not as a special case.
  - **The three enforcement shapes are asymmetric and must be asserted as such:** `maxFractionDigits` **prevents** (per keystroke); `min` **prevents** (`allowMinusSign()` is `this.min == null || this.min < 0`, `primeng-inputnumber.mjs:1270`); `max` **clamps** (checked on blur/Tab/Enter/spinner only).
- **Acceptance / done check:**
  - [x] With no binding, `max` is `Number.MAX_SAFE_INTEGER` — asserted on the **real** instance, not a stub (`R-MSD-012` AC.4, **KZ-001**). Read off the real PrimeNG `InputNumber` via `By.directive`, never `component.max`. Reviewer confirmed `max: number | undefined` in the installed typings, so removing the binding leaves `undefined` and the assertion cannot pass by coincidence.
  - [x] The scale→bound table is asserted for all of scales 0–4, with scale 0 falling out of the formula rather than being special-cased (`R-MSD-012` AC.2). ⚠️ **Half of this is test-side only:** the five bounds *reaching the rendered instance* is behaviourally proven, but *"scale 0 falls out of the formula"* is proven about a **test-side reimplementation** — `app-input` performs no derivation. **→ `T-11` must pin the two implementations together or drop the test-side copy.**
  - [ ] A scale outside `0…4` is rejected as a configuration error, not silently clamped (AC.1). ⚠️ **NOT DISCHARGED — deliberately.** T-09 asserted a **test-side helper** throws; `input.component.ts` contains no scale rejection and adding one would be drift (`design.md` §6.1 assigns the guard to `QuantificationItemComponent`). **→ `T-10` must re-prove this against the card's real guard, and must NOT cite T-09's green.**
  - [x] **The guard is asserted unchanged**: same threshold (18), same unit (**characters**), same `type === 'number'` branch, and the shared `type === 'text'` paste path untouched (`R-MSD-006` AC.5). Asserted on the rendered `Maximum reached` text, not a class-field read. The 40,000 threshold stays pinned **behaviourally** by `'a'.repeat(40000)` in the pre-existing suite — so dropping a redundant class read **improved** this coverage.
  - [ ] **The false positive is PINNED, not denied** (`R-MSD-006` AC.3). ⚠️ **PARTIALLY DISCHARGED, and this AC was AMENDED mid-task on measured evidence.** The Round-4 text confined the defect to scales 3–4; **measured, it fires at scales 1–4** — only scale 0 is clean, by arithmetic (16-digit bound + sign ≤ 17 chars). T-09 proves **scale-0 absence + scale-3/4 presence**; **scales 1–2 presence is missing → `T-12`.** `T-12` must also rewrite the `describe` title at `input.component.spec.ts:933`, which still says *"scale-3/4"* — the extent the amendment falsified. ⚠️ **`T-12` has since added the scale-1/2 warning-present cases and rewritten the `describe` title** (`input.component.spec.ts`, 2 new rows in `warningPresentCases`, verified via `node -e` and re-run green). **Checkbox left unticked here** — closing this AC is a judgment for the Reviewer that authorized it open, not a self-certification by the task that added the missing evidence.
  - [x] `max` clamps and `min`/`maxFractionDigits` prevent — each asserted on the **rendered** value, never on the absence of a message (`:363`). `max=5`: typing `9` renders `'9'` **unclamped**, and only `onInputBlur()` clamps it to `'5'` — the asymmetry asserted rather than assumed.
- **What disqualifies this evidence:** a test asserting `component.max === …` on the class instance is a **presence-assertion** — it proves the field's value, not that the template forwards it to PrimeNG. Assert on the rendered input. jsdom **cannot** measure layout or contrast, so nothing here covers `DC-11`; that goes to `T-11`'s HITL gate.
- **Input that would make this check FAIL:** change the guard's threshold from 18 to 19 — the pinned warning-present assertions (scales 3–4 at T-09's own attempt; extended to scales 1–4 by `T-12`, per the AC.3 amendment) must redden. Remove the `[max]` template binding — the rendered-max assertion must redden. **If either stays green, the test is reading the class, not the DOM.**
- **Dependencies:** none
- **Estimated effort:** M · **Skills:** `angular-developer`, `tdd`
- **Status:** **done (with two ACs carried)** — Reviewer `PASS` on attempt 2, 2026-08-27; evidence in [`execution.md`](./execution.md) → `### T-09`. The production change is **one line**. ⚠️ **`R-MSD-012` AC.1 and `R-MSD-006` AC.3 are deliberately left unticked** — see their rows. ⚠️ **`npx tsc -p tsconfig.spec.json --noEmit` is MANDATORY for `T-10`/`T-11`**: it was missing from T-09's brief and caught **four** `TS7031` errors that `npm test`, `lint` and `build` all passed over. Gate on **your file's path being absent from the output**, not on a total — the child guide's stale `945` figure has been replaced with that drift-proof form.

---

### T-10 — `QuantificationItemComponent`: `min` / `max` / `placeholder` inputs, and `maxFractionDigits` defaulting to `0`

- **Requirements covered:** `R-MSD-002` (all ACs, and scenario *OICR keeps its floor because the card's defaults say so*, `:222`, `:223`), `R-MSD-012` (**AC.1** — reassigned here 2026-08-27; ~~AC.3~~ **moved to `T-11`**, whose file its text names)
- **Design references:** `DD-4`, `DD-12`, `DD-14`, §6.1, §6.3, `U-4` (**resolved**), `U-11`
- **Files touched (intended):** `client/.../shared/components/quantification-item/*` (`.ts`, `.html`, `.spec.ts`)
- **Description:** Add `min`, `max` and `placeholder` as inputs defaulting to today's literals, add the scale-domain guard, and **change `maxFractionDigits`'s default from `undefined` to `0`**. That default change is why **no OICR file is edited**: OICR passes nothing and receives `0`.
- **Implementation notes:**
  - **This is the one default in the spec whose *value* changes**, and it deliberately turns two currently-green specs red: `quantification-item.component.spec.ts:158` and `:163` assert `toBeUndefined()`. Updating them is in scope and is the visible proof the default moved.
  - **`U-4` was resolved at round 4 and both prior readings were right about different branches:** the keystroke path (`primeng-inputnumber.mjs:1333-1343`) treats `undefined` as falsy and never inserts the separator — decimals are *already* refused when typing; the Intl path (`:834-838`) resolves to 3 and governs formatting and paste. Direction is safe either way: stricter or identical, never looser.
  - `U-11` is **narrowed, not closed** — the rendered end-to-end claim is unverified. ⚠️ **Citation corrected 2026-08-27:** the gate is **`DC-1`** (effective value on the real `app-input`/`p-inputNumber` instance — **satisfied by `T-10`**) **+ `DC-2`**. This previously read *"`DC-3`'s rendered assertion"*, but `DC-3` is a **server** DTO accept/reject table, so the named gate did not exist. `design.md`'s `U-11` row was corrected first and **this copy was missed** — a `KZ-013` forward-only sweep failure, caught at review.
  - Update the `:29` comment that claims the `undefined` default *"reproduces today's Intl resolution exactly"* — `DD-12` supersedes that intent (`R-MSD-011` AC.5).
- **Acceptance / done check:**
  - [x] With nothing passed: `min` → `0`, `placeholder` → today's copy, `max` → `Number.MAX_SAFE_INTEGER`, **`maxFractionDigits` → `0`** (`R-MSD-002` AC.1, AC.2, AC.5, AC.6).
  - [x] Each default reaches the **real `app-input` instance**, asserted on that instance — not on a call sequence, not on a stub that cannot forward it (AC.3, **KZ-001**).
  - [x] The Unit field's `min` / `maxFractionDigits` / `placeholder` are unaffected by the Number field's values (AC.4). Asserted **positively** against `app-input`'s own defaults, so it proves the Unit binding carries none of these inputs — not merely that the values differ.
  - [x] The **rendered** integer behaviour is asserted **once on the shared OICR configuration** — and **not** by enumerating which call site passes what (`:222`, `:223`). ⚠️ **Text amended 2026-08-27:** this read *"once per OICR block"*, which would certify something the suite does not do. It asserts **once**, on the unconfigured default that both blocks use, which is what `DC-2`'s own redness criterion demands (*drop the OICR default and the test reddens* — demonstrated). **KNOWN GAP, recorded not covered:** the two-blocks equivalence is carried by a template read, not an assertion, so nothing reddens if an OICR block later binds a non-default. Closure is blocked by `oicr-details.component.spec.ts:873`'s `FakeQuantificationItemComponent` stub → `STUB-1` in §8.
  - [x] `quantification-item.component.spec.ts:158,163` updated from `toBeUndefined()` to `0`. `:163` still reads the real `InputComponent` via `By.directive` — only the expected value moved.
  - [x] ⚠️ **ADDED 2026-08-27 — `R-MSD-012` AC.1, reassigned here from `T-09`. DISCHARGED as production behaviour** via a guarded `@Input` setter that throws synchronously; `Number.isInteger(value) && value >= 0 && value <= 4` also rejects `null`, `undefined`, booleans, strings and non-integers — `null` would otherwise coerce through a bare range check and silently restore PrimeNG's 3 fraction digits, undoing `DD-12`. A `maxFractionDigits` outside `0…4` is **rejected as a configuration error**, not silently clamped, by a **real guard in this component** (`design.md` §6.1). `T-09` discharged this only with a **test-side helper** and its Reviewer ruled that hosting it in `app-input` would be drift, so **it must be production behaviour here** — and `T-09`'s green may not be cited for it.
- **What disqualifies this evidence:** **enumerating call sites is explicitly disqualified** by `:222` — that enumeration produced **four different wrong figures across three rounds**, which is the entire argument for relying on the default. An assertion on a **stub** card cannot forward an input and will pass whatever the default is (**KZ-001**).
- **Input that would make this check FAIL:** set the `maxFractionDigits` default back to `undefined` — the rendered OICR integer assertion must redden. **If it stays green, the assertion is on the class field and not on what PrimeNG received.**
- **Dependencies:** T-09
- **Estimated effort:** M · **Skills:** `angular-developer`, `ui-ux-pro-max`, `tdd`
- **Status:** **done** — Reviewer `PASS` on attempt 2, 2026-08-27; evidence in [`execution.md`](./execution.md) → `### T-10`. **The one changed default in the spec lands here** (`maxFractionDigits` `undefined` → `0`), which is why **no OICR file is edited anywhere**. `R-MSD-012` **AC.1 reassigned in** from `T-09` and discharged as production behaviour; **AC.3 reassigned out** to `T-11`. ⚠️ **Two items routed to `T-12`:** a `design.md` §6.1 clause recording that the guard throws **in production too**, not only at development time; and `STUB-1` in §8.

---

### T-11 — Innovation Use call site: bindings, read coercion, and **both** payload type declarations

- **Requirements covered:** `R-MSD-001` (`:181`, `:182`, `:189`, `:190`), `R-MSD-008`, `R-MSD-009` (`:430`, `:431`), `NFR-MSD-004`, **`R-MSD-012` AC.3** (⚠️ **reassigned here 2026-08-27** from `T-10`, which structurally cannot discharge it — AC.3's own text names *"the Innovation Use call site computes `max` from its scale"*, and states that a card-internal derivation would be *"a different decision, **not** what DD-14 specifies"*)
- **Design references:** `DD-3`, `DD-5`, `DD-6`, `DD-15`, `DC-6`, `DC-11`
- **Files touched (intended):** `client/.../innovation-use-details/innovation-use-details.component.{html,ts}` + `.spec.ts`; `client/.../shared/interfaces/get-innovation-use-details.interface.ts`; **new** `client/.../shared/utils/quantification-number-bound.util.{ts,spec.ts}`; `client/.../shared/components/custom-fields/input/input.component.spec.ts` (`T-09`'s duplicate-formula carry, closed by importing the new util and dropping the test-side copy) — ⚠️ **corrected by `T-12`: the original list omitted all three, though acceptance item 1's own amended text already mandated them**
- **Description:** Pass scale 4, the derived symmetric bound and the new placeholder copy; coerce on read inside the existing `quantificationsView` adapter; and reconcile **both** places the payload type is declared.
- **Implementation notes:**
  - ⚠️ **`DD-15`: there are TWO type declarations.** `innovation-use-details.component.ts:80-85` also types this field and `buildPayload():435` assigns into it — widening only the shared interface **does not compile** (`J-17`).
  - **Do not bind `step`** — PrimeNG's default of `1` already gives whole-unit stepping across zero (`DD-6`).
  - `min` must be **negative** for the minus key to work at all (`allowMinusSign()`); `DD-5` supplies it.
  - The read coercion is a **defensive assertion of `DD-2`'s invariant, not a second normaliser** — `result-actors.service.ts:377-384` is the precedent.
  - The placeholder no longer says "positive" (`R-MSD-008`, `SC-4`).
- **Acceptance / done check:**
  - [x] ⚠️ **ADDED 2026-08-27 — `R-MSD-012` AC.3, reassigned here from `T-10`. DISCHARGED** via a new shared util `deriveMaxForScale()`; `T-09`'s duplicate-formula carry closed by importing it and deleting the test-side copy.** `max` is **DERIVED at this call site from the scale it passes**, not hard-coded, so the two cannot drift: scale `4` → `549,755,813,887` via `2**(53 - Math.ceil(Math.log2(10**scale))) - 1`. Asserted on the **real `app-input` instance**. **Falsifier:** change the scale to `3` and the bound must move to `8,796,093,022,207`. ⚠️ **Also close `T-09`'s carry here:** `input.component.spec.ts` holds a test-side copy of this same formula — either import the production derivation or drop the copy, so two implementations cannot be green while disagreeing.
  - [x] `-12.75` survives entry: not rounded, not clamped to `0`, sign not dropped (`:181`). ⚠️ Proven at the tier `DC-6`/`DC-1` name — the effective value on the real `p-inputNumber` — **not** by keystroke simulation. The admit path (`onInputKeyDown → insert`) is established structurally, and that limit is disclosed in the tests.
  - [x] `0` is treated as a value, never as empty (`:182`) — and `null` stays `null` (`DD-2`). `quantificationRowAbsent` still treats only null/undefined as absent.
  - [x] The spinner does not stop at `0` and steps by a **whole unit** (`:189`, `:190`). `step = 1` is PrimeNG's default and is **not** bound (`DD-6`); `spin(event, -1)` from `0` yields `-1`. This also **measures that `min` arrived** at the real instance — `validateValue` would return `0` under the default `min`, so the test reddens if forwarding breaks.
  - [x] A wire value of the **string** `"-0.7500"` renders `-0.75` (`:430`). ⚠️ Asserted at **two** seams after the Implementer found the DOM seam alone **cannot fail** — PrimeNG's `writeValue()` already runs `Number(value)`. The **adapter** test is what proves `DD-3` load-bearing; the DOM test is kept because only it carries `R-MSD-009` AC.3.
  - [x] Behaviour is **identical** whether the wire type is `string` or `number`, asserted for both (`:431`) — four tests, two wire types × two seams.
  - [x] `npm run build` exits 0 — this is what catches the second type declaration (`J-17`). ⚠️ **The falsifier as written at `:337` is BACKWARDS and cannot redden** — a `typeof` guard never trips `TS2367`, and `=== null` is exempted by the Nullable flag, so *both* edits survive the revert. `J-17`'s own text is the **forward** direction, which was reproduced: `TS2322`, *Type 'string' is not assignable to type 'number'*. → `T-12` to correct `:337`.
  - [ ] **HITL visual gate** (`DC-11`, `NFR-MSD-004`): the field in both themes and in error state. **No automated substitute exists.**
- **What disqualifies this evidence:** **jsdom cannot evaluate contrast or rendered layout**, and an a11y checker that returns "incomplete" without failing has evaluated nothing. `DC-11` is **not** covered by any green test in this task — it is covered by the human check, or by a **T6 Multimodal** review of a screenshot, or not at all. A component fixture that sets the input *before* the first `detectChanges()` tests a state the product may never reach (**KZ-015**) — arrange the **transition**.
- **Input that would make this check FAIL:** ~~revert the interface widening but keep the component change — `npm run build` must fail.~~ ⚠️ **CORRECTED BY `T-12` (measured at `T-11`, both directions tried):** that reverse direction **cannot redden** — a `typeof x === 'string'` guard is typed as the union of the eight `typeof` result strings and never narrows to the operand's declared type, so `TS2367` structurally cannot fire on it; separately, TypeScript's `=== null` comparison is exempted from `TS2367` by the target's own Nullable flag. Both of this task's edits therefore survive that revert. **The forward direction is what `J-17` actually specifies, and it is what reddens:** widen `get-innovation-use-details.interface.ts`'s `quantification_number` **without** reconciling the local, narrower `InnovationUseQuantificationPayload` type at the assignment in `buildPayload()` (i.e. drop the `typeof`-narrowing coercion this task adds) — `npm run build` must fail with `TS2322`, observed verbatim: *"Type '{ ... quantification_number: string \| number \| undefined; ... }[]' is not assignable to type 'InnovationUseQuantificationPayload[]'. Type 'string' is not assignable to type 'number'."* Feed the numeric `-0.75` where the string is expected — the identical-behaviour assertion must exercise both, so removing either branch reddens. **If the suite is green with only one wire type tested, `:431` is not covered.**
- **Dependencies:** T-02, T-10
- **Estimated effort:** M · **Skills:** `angular-developer`, `ui-ux-pro-max`, `tdd`
- **Status:** ⚠️ **items 1–7 done (Reviewer `PASS`, attempt 1, 2026-08-27); item 8 OPEN — with the user.** Evidence in [`execution.md`](./execution.md) → `### T-11`. **The HITL visual gate has no automated substitute** and its prepared instructions had to be **corrected first**: this call site passes `[fieldsRequired]="false"`, so the *"error state"* it asked a human to inspect **can never render**. The only reachable amber state is `showMaxReachedMessage()` via `-549755813886.9999` — which is `RK-16`'s **pinned, deliberately-unfixed** false positive. **Files touched (intended) is stale:** it omits `input.component.spec.ts` and the two new `quantification-number-bound.util` files, both mandated by acceptance item 1's own amended text → `T-12`.

---

### T-12 — Close the spec debts: `S-10` amendments, the comms record, and full-suite verification

- **Requirements covered:** `NFR-MSD-005` (`:600` — ⚠️ **corrected by `T-12` rework attempt 2; was `:496`, which is a blank line.** `:600` is `NFR-MSD-005`'s own heading, chosen because this citation names the requirement itself, not one of its clauses), `NFR-MSD-003`, `R-MSD-007` (the `R-IUP-008` correction), `R-MSD-011` scenario closure
- **Design references:** `S-10`, §11, `DC-12`, `RK-12`
- **Files touched (intended):** `docs/specs/archive/2026-08-26-innovation-use--details-page/requirements.md`; `docs/specs/innovation-use/family.md`; `execution.md`
- **Description:** Two documentation debts this spec owes and **neither is done**, plus the comms step and the closing verification. `S-10` has been open since chunk 3.
- **Implementation notes:**
  - Amend `R-IUP-008` in the archived spec — it still claims to govern `quantification_number` (`DC-12`).
  - Add the **`FR-12`** cross-reference row to `docs/specs/innovation-use/family.md`.
  - ⚠️ **Archiving breaks citations both ways** (**KZ-013**). Sweep **forward** (the superseded claim) *and* **backward** (who cites the section being changed) — `/akili-archive` only sweeps forward, which is exactly how a stale claim survives.
  - **The comms step has no automated gate and must not be assumed.** Record who was notified and when, by name.
- **Acceptance / done check:**
  - [x] `R-IUP-008` amended; forward **and** backward grep sweeps run, and the sweep re-run until it reports **zero** twice (`DC-12`, **KZ-005**). ⚠️ **"Zero" here means zero *disqualifying* (unqualified, present-tense) claims — not zero string matches.** A raw `grep` for `R-IUP-008`+`quantification_number` never reaches literal zero: it also matches historical archive execution/judgment records (accurate at the time they were written), and this very spec's own present-tense descriptions of the correction task. Each surviving match was individually classified; none asserts current governance. ⚠️ **Superseded 2026-08-27 by rework attempt 2, on Reviewer `FAIL`:** attempt 1's same-line `R-IUP-008`+`quantification_number` pattern was structurally blind to any survivor naming the field without naming the requirement — exactly where the archived `design.md`'s five live claims lived — and its cited "7 = 7" two-pass count came from a `grep -v` filter that is a BRE no-op, excluding nothing. The sweep was rebuilt field-keyed and repo-wide (no `R-IUP-008` token required) and re-run to a reconciled, file-by-file fixed point. See `execution.md` → `### T-12` → "Sweep — rebuilt (rework attempt 2)" for the seed contrast, the `HEAD`→working-tree reconciliation, and the two additional survivors (`design.md` §5.6, `archive/tasks.md` ×2) that pattern found and this attempt fixed.
  - [x] `FR-12` row present in `family.md`.
  - [ ] Comms record in `execution.md` naming the MEL/product owner, the OICR reporting owner, and any partner-platform contact (`NFR-MSD-005`, `:600`, `RK-12`). ⚠️ **Anchor corrected by `T-12` rework attempt 2; was `:496`, a blank line — see the correction at this task's `Requirements covered` line for why `:600` (the requirement's own heading) is the intended target.** **DELIBERATELY LEFT UNTICKED — see `execution.md` → `### T-12` → Comms draft.** No individual can be notified by an agent; a draft is prepared and the roles are identified from the spec's own sign-off list, but nobody has been notified. This checkbox is the Leader's to flip, after a human sends it.
  - [x] Full server suite, **full** client suite (never targeted, **KZ-003**), and `npm run build` all green; coverage floors held (`NFR-MSD-003`). Server: `355/2727` + fixtures `17/90`. Client: `317/6786` (was `317/6784`; `+2` reconciles exactly with the two new scale-1/2 rows added this task). Both builds exit `0`. See `execution.md` for full figures.
  - [x] Both lints clean via the **gate** invocations — `npx eslint <path>` on the server, `npm run lint -- --quiet` on the client. Re-check `git status` after: the client lint carries `--fix` and mutates files. Both clean; `git status` after the client lint shows only this task's own intended edit, no `--fix` mutation.
- **What disqualifies this evidence:** **a single clean sweep pass is not evidence — the fixed point is.** This spec's own history: passes 2 and 3 found survivors *after* pass 1 reported clean, and round 4's anchor repair broke 21 of 25 anchors in the pass that was fixing them. Run until two consecutive passes are clean. `npm run lint` on the **server** carries `--fix` and **cannot gate** (**K-001**). A coverage figure measured while a delegated worker is active is a *wrong* number, not a slow one.
- **Input that would make this check FAIL:** leave one superseded citation in place — the sweep must report it. **If a sweep reports zero on the first pass and you have not seeded a known survivor to prove it can report one, the sweep is not evidence.**
- **Dependencies:** T-07, T-08, T-11
- **Estimated effort:** M · **Skills:** `cognitive-doc-design`
- **Status:** ⚠️ **items 1, 2, 4, 5 done; item 3 (comms) intentionally OPEN — with the user, same as `T-11`'s HITL gate.** Evidence in [`execution.md`](./execution.md) → `### T-12`. **This spec is NOT complete**: `T-11` acceptance item 8 (the HITL visual gate) remains open with the user, independently of this task, and is not touched here. ⚠️ **Reworked 2026-08-27 (rework attempt 2 of 3) after Reviewer `STATUS: FAIL`** — the sweep behind item 1 did not reach a fixed point (missed the archived `design.md`'s five live claims) and the `NFR-MSD-005` anchor cited in `Requirements covered` above was asserted "corrected" without the correction landing here. Both fixed this attempt; item disposition (done/open) is unchanged.

---

## 4. Clause-level coverage — all 12 scenarios, all 25 clauses

**Requirement-ID presence is not closure.** This table closes at scenario and clause granularity, because a prior spec in this family shipped three scenario-level orphans that an ID-keyed table read as covered.

| Requirement | Scenario | `BUT it must NOT` | `AND IT MUST` | Owning task |
| --- | --- | --- | --- | --- |
| `R-MSD-001` | A negative fraction survives entry | `:181` | `:182` | **T-11** |
| `R-MSD-001` | The spinner does not reintroduce the floor | `:189` | `:190` | **T-11** |
| `R-MSD-002` | OICR keeps its floor because the card's defaults say so | `:222` | `:223` | **T-10** |
| `R-MSD-003` | An untouched measure row does not break the save | `:256` | `:257` | **T-02** (unit) + **T-07** (fixture gate) |
| `R-MSD-003` | The relaxation does not leak to the siblings | `:265` | `:266` | **T-04** |
| `R-MSD-004` | A fraction survives the database | `:299` | `:300` | **T-07** |
| `R-MSD-005` | Versioning does not round the fraction | `:329` | `:330` | **T-07** |
| `R-MSD-006` | No value inside the bound is warned about | `:384` | `:385` | **T-09** |
| `R-MSD-009` | A string on the wire is not a broken field | `:452` | `:453` | **T-11** |
| `R-MSD-010` | The OICR export does not change shape by accident | `:483` | `:484`, `:485` | **T-08** |
| `R-MSD-011` | The API stops silently rounding | `:517` | `:518` | **T-03** (rejection) + **T-12** (comms) |
| `R-MSD-013` | An unmodified save does not churn rows | `:571` | `:572` | **T-07** |

**Totals: 12 `BUT` + 13 `AND IT MUST` = 25.** Matches `design.md` §2.3.

> ⚠️ **These anchors are line numbers and they rot.** Round 4 found all 25 of §2.3's stale, then broke 21 of them again while fixing them. **If you edit `requirements.md`, regenerate this table LAST and verify each anchor resolves to a line containing its clause** — the count reconciling (12 + 13 = 25) proves the clauses exist, **not** that the citations point at them.
>
> ⚠️ **Regenerated by `T-12` (2026-08-27), LAST, after every other edit in this round landed — and verified by opening every line in `requirements.md`, not carried forward from a prior table.** `R-MSD-001`, `R-MSD-002`, and both `R-MSD-003` scenarios were unchanged from the prior table (their host sections were never edited after the table was last written). `R-MSD-004`/`R-MSD-005` had drifted **+2 lines** each (a minor prior edit). Everything from `R-MSD-006` onward had drifted **+22 lines** — the AC.3 amendment inserted at `T-09` added that many lines to `R-MSD-006`'s section, and every clause after it inherited the shift. `R-MSD-013` (`:545`/`:546` → `:571`/`:572`) is the clearest instance of the ordering rule this table's own warning states: `T-07`'s execution log records displacing it to `:551`/`:552` at the time, and even that figure is now stale — the AC.3 amendment landed **after** `T-07`, shifting it a further 20 lines. **A citation correct at the moment it was written can still rot before the next reader opens it**; that is why this table is regenerated last and re-verified against the live file, not against another document's record of a prior verification. `design.md` §2.3 carries the identical table and the identical drift; it was regenerated in the same pass, from the same freshly-opened line numbers, so the two tables agree.

### Requirements with no scenario — covered at AC level

| Requirement | Owning task(s) |
| --- | --- |
| `R-MSD-007` — every other numeric field keeps its floor | **T-04** (six sibling fields), **T-12** (`R-IUP-008`) |
| `R-MSD-008` — the field's copy states the real rule | **T-11** |
| `R-MSD-012` — scale and magnitude are declared parameters | ⚠️ **AC.1 AND AC.3 REASSIGNED 2026-08-27 — two routing defects of the same class:** **T-09** (AC.2, AC.4), **T-10** (**AC.1**), **T-11** (**AC.3**). **AC.3 was filed against `T-10`, but its own text names the *Innovation Use call site*** (*"the Innovation Use call site computes `max` from its scale rather than hard-coding a literal"*) — that is `T-11`'s file, outside `T-10`'s *Files touched*. AC.3 also states outright that a card-internal derivation would be *"a different decision, **not** what DD-14 specifies"*, so `T-10` **cannot** discharge it. `T-10`'s checklist had omitted it, exactly as with AC.1. **Corrected: AC.3 is `T-11`'s.** Found by `T-10`'s Implementer, which flagged the mismatch rather than claiming or skipping coverage. AC.1 was filed against `T-09`, but its mechanism lives in the **card** per `design.md` §6.1 (*"Scale domain 0–4, guarded"*), and `app-input` cannot host it — putting a scale rejection there would have been drift, which `T-09`'s Reviewer correctly refused. `T-10`'s acceptance list omitted it, so AC.1 was assigned to a task that could not discharge it and absent from the one that could. **Corrected: AC.1 is `T-10`'s.** |
| `NFR-MSD-001` — migration non-destructive and reversible | **T-05** |
| `NFR-MSD-002` — the precision choice carries its evidence | **T-01** |
| `NFR-MSD-003` — existing quality floors hold | **T-12** |
| `NFR-MSD-004` — no new accessibility regression | **T-11** (HITL / T6 — **no automated gate**) |
| `NFR-MSD-005` — the tightening is communicated | **T-12** |

---

## 5. Defect classes → the gate that catches each

| Class | Gate | Owning task |
| --- | --- | --- |
| `DC-1` sign/scale lost at entry | client unit, rendered | T-09, T-11 |
| `DC-2` shared-card regression | **full** client suite | T-10, T-12 |
| `DC-3` server accepts/rejects wrongly | server unit | T-03, T-04 |
| `DC-4`, `DC-8` storage/migration loss | fixture, real MySQL | T-05, T-07 |
| `DC-5` lifecycle-routine loss | fixture, real MySQL | T-07 |
| `DC-6` string-on-wire render | client unit | T-11 |
| `DC-7`, `DC-14` report rendering | fixture, real MySQL | T-08 |
| `DC-9` copy | client unit | T-11 |
| `DC-10` false `Maximum reached` | client unit, **pinned boundary** | T-09 |
| `DC-12` correction not closed | forward + backward sweep, to a fixed point | T-12 |
| `DC-13` untouched-row `400` | server unit + fixture | T-02, T-07 |
| `DC-15` validation crash | server unit, **asserting `400` not `500`** | T-04 |
| `DC-16` silent row replacement | fixture, **both** paths | T-07 |
| **`DC-11` visual / a11y** | ⚠️ **NO automated gate.** jsdom cannot measure contrast or layout | **T-11 — human check at the HITL pause, or a T6 Multimodal screenshot review** |

---

## 6. Budget — the tripwire `/akili-execute` trips against

| Signal | Budget |
| --- | --- |
| Tasks | **12** |
| LOC | **≈ 1,560** — ≈ 350 production, ≈ 1,210 test/fixture |
| Review rounds | **≈ 24** (12 × 2.0) |
| PRs | **2** |

**Exceeding a budget is information, not failure — but the Leader must STOP and escalate rather than continue.** This spec's history is the argument: three of its four accepted defects were removed by *deleting edits*, and the budget went **down** for the first time as a result.

---

## 7. PR strategy

**PR 1 — server** (`T-01`…`T-08`, ≈ 1,050 LOC). Review order: `T-02`'s transformer first (everything else assumes it), then `T-03`'s rule map, then the two migrations. Out of scope for this PR: any client file.

**PR 2 — client + closure** (`T-09`…`T-12`, ≈ 510 LOC). Review order: `T-09` → `T-10` → `T-11`, which is also the dependency order. **Depends on PR 1's transformer being merged.** Out of scope: any server file except the archived-spec amendment.

Both descriptions follow `cognitive-doc-design` review-empathy rules: what to review first, what is deliberately out of scope, and a link to the sibling PR.

---

## 8. Open questions carried into execution

| ID | Question | Owner | Blocks |
| --- | --- | --- | --- |
| **OQ-1** | `report_oicr`: accept `10.0000` in exports, or ship `DD-10`'s normalising expression? **Recommendation: ship it** | Product owner + eng lead | `T-06` merge |
| **OQ-3** | Target branch — stay on `AC-1679-…` or branch from `main`? | You | execution setup |
| **OQ-D5** | Dev and Prod MySQL versions (narrowed to 8.0.4 … 8.0.16) | DevOps | nothing now |

**Reported, not owned — worth tickets, none opened:** `O-1` (Innovation Use measures reach no report view at all), `O-3` (`orm.config.ts:53` is dead config), `RK-13` (`updateOicr` is not transactional), `RK-15` (the uncalled quantification upsert), **`AUDIT-1` (NEW, 2026-08-27 — `created_by` is overwritten on every resave)**, **`BACKUP-1` (NEW — nobody owns dropping `result_quantifications_backup_1787260000000`)**, **`STUB-1` (NEW, 2026-08-27 — `oicr-details.component.spec.ts:873` renders a `FakeQuantificationItemComponent` stub, so NO OICR-page coverage exercises the real card.** Two consequences measured at `T-10`: the card's scale-domain guard throws synchronously, but an out-of-domain literal added to an OICR block **reddens no suite** — it would first throw in a browser, and a throw inside change detection **aborts the tick**, which on an in-progress OICR form is data loss rather than a log line; and `R-MSD-002` `:223`'s two-blocks equivalence can only ever be carried by a template read. **De-stubbing that spec closes both.** Not reachable from the current tree — every binding is a static in-domain literal — so reachable only by a source edit)**, **`OFGB-1` (`report_oicr` cannot be `SELECT`ed under `ONLY_FULL_GROUP_BY`; harmless on Dev, which does not set it, but it breaks the view on any strict-mode server)**, **`TESTFIX-1` (NEW, 2026-08-27, `T-08` — a shared-table `ALTER` inside a committed, automatically-collected `*.fixture-spec.ts` is unsafe under `test:fixtures`' default worker parallelism: measured 4 of 5 runs with an early draft corrupting a concurrent sibling with MySQL `1412 ER_TABLE_DEF_CHANGED`. `T-08` avoided the shared table entirely (a session-scoped `CREATE TEMPORARY TABLE` instead), so no fix is owed for that file — but this is a standing hazard for any future fixture tempted to repeat `T-06`'s one-off, solo-run `ALTER` precedent as committed, parallel-collected test code. `test/jest-fixtures.json` carries no `maxWorkers`/`runInBand`; serialising it is the structural fix, and is an infra decision wider than one task)**, and the still-open `FR-7` / [AC-1718](https://cgiarmel.atlassian.net/browse/AC-1718).

> **`AUDIT-1` detail** — `base-service.ts:440-446` applies `audit(SetAuditEnum.BOTH)` to every row including the reused/untouched branch (`:394-402`), so an untouched resave by a different user rewrites `created_by` to them. Reachable as ordinary collaborative editing; destroys row authorship silently. It is why `R-MSD-013` AC.2's `created_by` half is marked UNSATISFIABLE rather than merely unasserted. **Shared base class — out of this spec's scope to change.**

---

## 9. Sign-off

- [ ] Engineering lead
- [ ] MEL / product owner — owns `OQ-1`
- [ ] **Security review — REQUIRED.** No role, guard or secret changes, but this adds **validation to a previously unvalidated mutation endpoint** over live production data, in the service layer rather than a pipe, for a reason a reviewer should see (`design.md` DD-13). `RK-13`'s partial-write mode is part of what needs reviewing.
- [ ] **DevOps — REQUIRED.** The migration is applied to a shared database by human decision; the pipeline does not apply migrations. `T-05`'s `ALGORITHM=COPY` locks writes for the duration of a full table rebuild.
