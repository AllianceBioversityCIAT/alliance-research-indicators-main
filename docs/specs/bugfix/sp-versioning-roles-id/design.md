# Design — Bugfix / `SP_versioning` references the dropped column `roles_id`

- **Module:** results (lifecycle routines)
- **Spec id:** 2026-08-sp-versioning-roles-id
- **Status:** implemented
- **Linked requirements:** [`./requirements.md`](./requirements.md)
- **Routine authority:** [`../../innovation-use/data-model-and-catalog/routine-transcript.md`](../../innovation-use/data-model-and-catalog/routine-transcript.md)
- **Last updated:** 2026-08-14

---

## Document Control

| Field | Value |
| --- | --- |
| Depth | **Lite** (Bug Mode) |
| Reversion challenge (Step 2.3) | **Not triggered.** Nothing delivered is removed — a non-executable statement is repaired |
| Budget (Step 2.4) | **5 tasks · ~2,750 LOC + baseline dump · 3–4 review rounds** (revised 2026-08-14 by the T-02 Pivot: +1 task, +~700 LOC for the delete routine's two bodies, +1 round). Prior: **4 tasks · ~2,050 LOC + baseline dump · 2–3 review rounds.** ~1,960 of the LOC is procedure body text: `up()` and `down()` each reproduce the full 981-line body. **Revised 2026-08-14** from 3 tasks / 1–2 rounds by the T-01 pivot, which added the baseline-schema task (§4.1 / DD-5). The dump itself is a generated artifact, not authored LOC |
| Pivot | **T-01, 2026-08-14** — the harness needs a fourth piece (baseline schema) the original design did not identify. Ruled by the user in favour of the dump option. See [`./execution.md`](./execution.md) → *Pivot Record: T-01* · **T-02, 2026-08-14** — the repair activates a latent 1451 in the delete routine; companion migration added as §3.1 / DD-6 / R-SPV-002. See *Pivot Record: T-02* |
| Extracted from | `innovation-use/data-model-and-catalog` (migration M0 / R-IU-012 / DD-13), on the user's ruling of 2026-08-14, so the cross-indicator fix ships without waiting on a feature spec |

---

## 1. Executive Summary

Two append-only migrations. `DROP` + `CREATE` of `SP_versioning`, changing **two of its 29 copy blocks** and nothing else, plus its mandatory `DROP` + `CREATE` of `SP_delete_result_version`, adding two `DELETE` statements (§3.1). One regression fixture, red before green, extended to cover both defects. *(Corrected 2026-08-18 — this paragraph originally said "One append-only migration"; the T-02 Pivot added the second, and RB-5 forbids shipping the first alone.)*

The whole 981-line body must be reproduced because the repo's established pattern for routine changes is drop-and-recreate — there is no `ALTER PROCEDURE` for a body edit in MySQL. That is why a two-block repair costs the LOC recorded in Document Control above.

---

## 2. The fix

### 2.1 Current (broken) shape — `1783029013035:116`

Column list (11): `created_at, created_by, updated_at, updated_by, is_active, deleted_at, id, result_id, impact_outcome_id, roles_id, role_id`

`SELECT` list (10): `rio.created_at, rio.created_by, rio.updated_at, rio.updated_by, rio.is_active, rio.deleted_at, rio.id, new_result_id AS result_id, rio.impact_outcome_id, rio.role_id`

`result_strategic_objectives` (`:143`) is identical in shape, with `strategic_objective_id` in place of `impact_outcome_id`.

### 2.2 Repaired shape

Drop **`roles_id`** (the column no longer exists) and **`id`** (so MySQL assigns a fresh AUTO_INCREMENT key) from **both** lists. Result: **9 columns, 9 values**, matching the shape every other block in the procedure already uses.

| Column list (9) | `SELECT` (9) |
| --- | --- |
| `created_at, created_by, updated_at, updated_by, is_active, deleted_at, result_id, impact_outcome_id, role_id` | `rio.created_at, rio.created_by, rio.updated_at, rio.updated_by, rio.is_active, rio.deleted_at, new_result_id AS result_id, rio.impact_outcome_id, rio.role_id` |

The `FROM` / `WHERE` clauses are unchanged: `FROM result_impact_outcomes rio WHERE rio.is_active = TRUE AND rio.result_id = temp_result_id`.

> **Dropping `id` is the correct repair, not a shortcut.** Every other copy block in the procedure omits the child PK and lets AUTO_INCREMENT assign one — copying it is what produces the 1062 collision. The repaired blocks now match their 27 siblings.

### 2.3 What does not change

The other **27** copy blocks, the guard clauses, the `SIGNAL` handlers, the `new_result_id` assignment, and the trailing `SELECT`. Byte-identical.

---

## 3. Migration

| Item | Value |
| --- | --- |
| Name | `repairSpVersioningObjectiveBlocks` |
| `up()` | `DROP PROCEDURE IF EXISTS SP_versioning` → `CREATE PROCEDURE` with the repaired body |
| `down()` | `DROP` → `CREATE` restoring the **prior, broken** body verbatim |

**`down()` deliberately restores a non-executable procedure.** `down()` must return the schema to its prior state, defects included; a `down()` that silently keeps the fix is not a reversal and would make the migration history lie. Recorded so it is not "corrected" in review.

---

## 3.1 The companion migration — `SP_delete_result_version`

> **Added 2026-08-14 by the T-02 Pivot** (user ruling on advisory B-1, `execution.md`). Required by R-SPV-002 / RB-5.

### Why it is not optional

`SP_versioning`'s repair is what makes this defect reachable. The chain, verified live against the scratch schema rather than read from source:

| Link | Evidence |
| --- | --- |
| Both objective tables hold **RESTRICT** FKs to `results` | `information_schema.REFERENTIAL_CONSTRAINTS` → `DELETE_RULE = NO ACTION` for `FK_f1a19f2f5d9556dee00b4c54d31` and `FK_f533df2b0cbca7d2d9cdc8d4308` |
| `SP_delete_result_version` deletes **32** child tables, and neither of these is among them | `ROUTINE_DEFINITION LIKE '%result_impact_outcomes%'` → 0; same for `result_strategic_objectives` |
| `full_delete_result_version` deletes both | → 1 for both. The transcript §4.1 divergence, confirmed |
| It ends by removing the parent | Routine tail: `DELETE FROM results WHERE result_id = temp_result_id` |
| The app deletes the old snapshot **before** re-versioning | `green-checks.repository.ts:294 → :307`; `result-status-workflow.repository.ts:152 → :172` |

Inert today (the procedure aborts at block 3 with 1054, so the rows never exist); live the moment the repair lands.

**The `green-checks` path is the damaging one.** It calls `this.dataSource.query(...)` with no transaction, and the routine itself has no `START TRANSACTION` and no handler — so under autocommit the 32 preceding child deletes **commit** and the parent delete then fails with 1451. Result: the snapshot's children destroyed, the snapshot row surviving, unrecoverable through the application. The workflow path is transactional and rolls back, but its `.catch()` at `:167-169` rewrites the error to a bare `'Error deleting snapshot'`.

### The change

Two statements, mirroring `full_delete_result_version` exactly, inserted **before** the final `DELETE FROM results`:

```sql
DELETE 
	FROM result_impact_outcomes
	WHERE result_id = temp_result_id;

DELETE 
	FROM result_strategic_objectives
	WHERE result_id = temp_result_id;
```

| Item | Value |
| --- | --- |
| Name | `repairSpDeleteResultVersionObjectiveTables` |
| `up()` | `DROP PROCEDURE IF EXISTS SP_delete_result_version` → `CREATE PROCEDURE` with the two statements added |
| `down()` | `DROP` → `CREATE` restoring the **prior body verbatim**, the omission included (same reasoning as DD-3) |
| Order | **Must sort before, or ship with, the `SP_versioning` repair.** Never merge the versioning fix alone (RB-5) |
| Signature | `SP_delete_result_version(resultCode BIGINT, reportYear INT)` — unchanged |

### What does not change

The 32 existing child deletes, the `temp_result_id` selection, the `SIGNAL` guard, and the parameter list. The routine still has no transaction and no handler — **adding one is out of scope** and would change failure semantics for every indicator, which is precisely what DD-4 exists to prevent.

---

## 4. Test harness dependency

The regression fixture needs a **disposable** MySQL, and the repo has no working route to one (requirements RB-1). **Four** pieces are required first — the fourth was discovered during execution and is recorded in the Pivot Record of [`./execution.md`](./execution.md):

1. `src/db/config/mysql/orm.test.config.ts` — a sibling module exporting a `TEST`-bound `DataSource`. `orm.config.ts:71-73` exports a single `CORE`-bound instance at module load, which TypeORM's `-d` cannot retarget. ⚠️ `orm-connection-test.module.ts` is **not** this piece — it binds to `CORE` (`:10`) despite its name.
2. `ARI_TEST_MYSQL_PORT` — `orm.config.ts:46` currently reads `DB_PORT` for both targets, so a Docker MySQL on a non-default port is unaddressable.
3. A dedicated Jest config, since fixtures live outside `rootDir: "src"` (`package.json:122-123`).
4. **A baseline schema artifact.** *(Added 2026-08-14 by the T-01 pivot.)* The repo's migration history is **not self-sufficient**: 10 migrations write into `sec_template` and **none of the 303 creates it**. `1751474908040-InsertTemplates.ts` fails on an empty database with `Table '<db>.sec_template' doesn't exist` (MySQL 1146). The `sec_*` tables predate the repo's adoption of TypeORM migrations and were created directly on the shared database, outside migration control. A scratch schema therefore cannot be produced by running migrations alone — a schema-only baseline must be loaded first.

### 4.1 The scratch-schema artifact — snapshot, not replay (DD-5, revised by the T-01b pivot)

> **Superseded design, kept for the record.** This section first specified a *replay* harness: a schema-only dump of the tables migrations never create, then the full 303-migration suite applied on top. Execution disproved the premise — see `execution.md` → *Pivot Record: T-01b*. The history is **not replayable from empty**: it assumes a pre-existing environment, both schema *and* data. Two independent blockers surfaced in the first 139 migrations (`sec_template`, MySQL 1146; then `CreateStaffGroups1759786024597`'s hardcoded `carnet` FK, MySQL 1452), with 164 migrations still unexercised.

| Item | Value |
| --- | --- |
| What | A **schema-only snapshot** of the shared dev database: all base tables and views, **plus `--routines`**, **plus the `migrations` bookkeeping table with its rows** so TypeORM records all 303 as already applied |
| Where | `server/researchindicators/src/db/baseline/` — committed, documented, stamped with source environment and date |
| Load order | snapshot → **only genuinely new migrations run** → fixture. Encoded in an npm script so the order cannot be skipped |
| Constraint | **No business data.** The one deliberate exception is the `migrations` table's own rows, which are bookkeeping, not domain data — the exception must be explicit in the artifact README |
| Not | Replaying history from empty. Not hand-written table definitions. Not `FOREIGN_KEY_CHECKS=0`, which would disable referential integrity in a harness whose entire purpose is fidelity |

**Why the snapshot is better evidence, not a concession.** It reproduces dev's actual structure rather than a state dev never passed through. For this spec specifically it is exactly what the gate needs: `SP_versioning` arrives **present and broken**, so `CALL SP_versioning(<code>)` → MySQL 1054 is a genuine red on the real procedure, and the repair migration is the only pending one — the greenest possible signal that the repair, and nothing else, is what fixed it.

**Why this is not scope creep.** Without a working scratch schema, R-SPV-001's gate (DC-A) cannot execute at all. It is also shared infrastructure: `innovation-use/data-model-and-catalog` T-01/T-02 hit the identical wall, and so will every future spec needing a disposable schema.

**Out of scope, and recorded as a repo-level finding:** the migration history's non-replayability is a real defect worth its own ticket and a TRD note. Fixing it is not this bugfix's job — see OQ-3.

**Whichever spec lands first builds all four.** They are shared with `innovation-use/data-model-and-catalog` T-01/T-02; if that chunk has already built them, the corresponding task here is a no-op — verify and move on.

**Never point any of this at `ARI_MYSQL_*`.** That is the shared, non-disposable database (root guide §4.3). ⚠️ **Verify the values, not just the variable name:** on at least one developer machine `ARI_TEST_MYSQL_*` was found pointing at the same remote RDS instance as an alternate `ARI_MYSQL_*` target (execution.md → finding F-01). A "TEST" variable name is not evidence of a disposable target.

---

## 5. Design Decisions

| # | Decision | Rationale | Rejected |
| --- | --- | --- | --- |
| DD-1 | Repair in a **dedicated migration**, not inside the Innovation Use M6 | The defect is cross-indicator and pre-existing. A standalone migration is reviewable on its own, ships without waiting on a feature spec, and keeps M6's diff limited to Innovation Use | **Folding into M6** — hides a production fix inside a feature migration and makes both diffs unreviewable. **Deferring** — leaves versioning broken and M6's gate unrunnable |
| DD-2 | Drop **`id`** from the copy lists rather than remapping it | Matches all 27 sibling blocks; AUTO_INCREMENT assigns a fresh key. Preserving source ids across a snapshot has no caller and would collide | **Keeping `id` with an offset** — invents cross-version id semantics no consumer expects |
| DD-3 | `down()` restores the broken body verbatim | A reversal must be faithful; otherwise the migration history misrepresents what the schema was | **A `down()` that keeps the fix** — makes the migration non-reversible in fact while claiming to be |
| ~~DD-4~~ | ~~Do **not** touch the `SP_delete_result_version` / `full_delete_result_version` divergence over these same two tables (transcript §4.1)~~ → **AMENDED 2026-08-14 by DD-6.** Correct as written for T-02, which complied; the premise "unrelated pre-existing inconsistency" was wrong | Fixing it *speculatively* would have been a scope leak. Fixing it because this spec's own repair activates it is not | — |
| **DD-6** | **Add the two missing `DELETE` statements to `SP_delete_result_version`, in its own migration** (§3.1) | The divergence is not unrelated: repairing `SP_versioning` is what makes it reachable (RB-5), so shipping the repair alone converts a total failure into a partial-data-loss failure. A separate migration keeps DD-4's real intent — no harmonization hidden inside another change's diff — while closing the activated defect. User ruling on advisory B-1, 2026-08-14 | **Folding it into the `SP_versioning` migration** — exactly the unreviewable-diff problem DD-1 rejects. **Deferring to its own ticket** — leaves a live data-loss path between merges. **Adding a transaction/handler to the routine** — changes failure semantics for all six indicators, still out of scope |
| DD-5 | ~~Load a schema-only baseline dump, then replay the full migration suite~~ → **revised 2026-08-14:** load a committed **schema-only snapshot** (with routines and the `migrations` rows) and run only genuinely new migrations (§4.1) | The migration history is not replayable from empty — it assumes a pre-existing environment in both schema and data, proven by two independent blockers in the first 139 migrations. A snapshot reproduces dev's real structure, delivers `SP_versioning` present-and-broken for a true red, and needs less machinery than replay | **Replay with a seed fixture** per data dependency — unblocks one migration at a time with 164 unexercised, unbudgeted. **`FOREIGN_KEY_CHECKS=0`** — disables referential integrity in a fidelity harness. **Hand-writing tables** — fabricated schema under every downstream fixture. **Waiving red-before-green** — refused by requirements §4.2 on its own reasoning |

---

## 6. Rollout

| Concern | Plan |
| --- | --- |
| Order | **Two migrations, and the delete repair (§3.1) must sort first or ship in the same PR** — merging the versioning fix alone is RB-5. Both **must precede** `innovation-use/data-model-and-catalog` M6, which reproduces the `SP_versioning` body |
| Backout | `down()` restores each prior body exactly. No DDL, no data change — backout is a procedure swap. **Under-stated in the original wording:** reverting re-breaks versioning for all six indicators *and* leaves behind the objective rows created while the fix was live, which then block `SP_delete_result_version` unless its repair is left in place. Revert the delete repair **last**, or not at all (advisory B-9) |
| Timing | `DROP`/`CREATE` briefly raises 1305 on a concurrent `CALL`, and the `DROP` takes an exclusive metadata lock that waits on in-flight invocations. Run in a low-traffic window (advisory B-8) |
| `DEFINER` | Dev's routines carry ``DEFINER=`AllianceRepUser`@`%` ``; these migrations declare none, so the routine is recreated as `CURRENT_USER`. Confirm the shared-DB run executes as `AllianceRepUser`. Pre-existing — `1783029013035` has the identical property (advisory B-7) |
| Shared-DB gate | Human approval required before running against the shared dev database |
| Comms | DevOps (a routine serving every indicator is redefined); product owner only if OQ-1 shows users hit the error in production |
| Coupling | Once merged, chunk 1 drops its T-03 and declares `Depends on: bugfix/sp-versioning-roles-id` |

---

## 7. References

- Routine transcript §2.4 (the defect), §2 (the 29-block enumeration) — [`../../innovation-use/data-model-and-catalog/routine-transcript.md`](../../innovation-use/data-model-and-catalog/routine-transcript.md)
- `1782486943935` (tables created with `roles_id`) · `1783022620616` (drops it) · `1783029013035` (recreates `SP_versioning` still naming it)
- Root `CLAUDE.md` §4.1 (append-only migrations), §4.3 (shared DB is not disposable)
- ADR-11 (proposed, in the Innovation Use chunk) — green checks and lifecycle as stored routines; **this bug is a live instance of its revisit trigger**
