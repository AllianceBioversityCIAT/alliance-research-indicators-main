import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SDD spec docs/specs/changes/measure-number-signed-decimal, T-05, DD-1, DD-18, AR-2.
 *
 * Widens `result_quantifications.quantification_number` from `bigint NULL`
 * to `decimal(24,4) NULL` so the Innovation Use measure can store a signed
 * decimal instead of only a non-negative integer.
 *
 * Three steps, run in this order.
 *
 * 1. Probe `information_schema.TABLES` for the backup table, and only when
 *    it is absent, run `CREATE TABLE ... AS SELECT` to snapshot the table's
 *    DATA as it stands before the `ALTER` runs. **This is a data snapshot,
 *    not a table snapshot**: a CTAS copies columns and values only — it
 *    reproduces no `PRIMARY KEY`, no `AUTO_INCREMENT`, no secondary index
 *    and no foreign key. Verified against `baseline.sql:3781-3799`:
 *    `result_quantifications` has `id bigint NOT NULL AUTO_INCREMENT`,
 *    `PRIMARY KEY (id)`, two secondary `KEY`s and two outgoing FKs (to
 *    `results` and `quantification_roles`), none of which the backup table
 *    carries. Column order is preserved by CTAS, so a later `SELECT *`
 *    against the backup aligns positionally with the live table.
 *
 *    The probe exists to make `up()` safe to re-run to completion — MySQL
 *    DDL implicit-commits, so an unconditional `CREATE TABLE` here survives
 *    any later failure of step 2 while TypeORM records no `migrations` row,
 *    and the same statement then fails `ER_TABLE_EXISTS_ERROR` (1050) on
 *    the next attempt, stranding the schema mid-migration. That is not a
 *    hypothetical: `up()` succeeds, `migration:revert` runs, and then
 *    re-rolling forward — the prescribed backout (`design.md` §11,
 *    Backout) followed by an unprescribed fix-forward re-apply — dies at
 *    this exact statement, because neither direction drops the backup by
 *    design. **Do not "fix" the probe with `CREATE TABLE IF NOT EXISTS
 *    ... AS SELECT`** — MySQL documents `IF NOT EXISTS` combined with
 *    `AS SELECT` on an existing table as inserting the `SELECT`'s rows
 *    into it rather than skipping; not executed here. Either way the
 *    prohibition holds: if it inserts, that duplicates the snapshot; if
 *    it silently skipped instead, that would defeat the probe invisibly
 *    rather than legibly. **Do not precede the CTAS with `DROP TABLE
 *    IF EXISTS`** — on a re-apply after users saved fractions and `down()`
 *    rounded them, that would overwrite the true pre-migration snapshot
 *    with rounded values, destroying the one thing this backup exists to
 *    preserve. The point of the probe is to preserve the EARLIEST snapshot,
 *    never to retake it.
 * 2. `ALTER ... ALGORITHM=COPY` widens the column. A type change is not an
 *    in-place operation in InnoDB, so `ALGORITHM=COPY` is explicit rather
 *    than left to MySQL's default choice; it rebuilds the whole table and
 *    locks writes for the duration. The lock is not only about the 80 rows
 *    measured in `T-01`'s pre-flight: acquiring the metadata lock the
 *    `ALTER` needs waits behind any open transaction already holding a
 *    shared MDL on this table, and while it waits, every subsequent query
 *    against the table queues behind it too — reads included.
 *    `lock_wait_timeout` defaults to 31,536,000 seconds, so there is
 *    effectively no guard against a long wait.
 * 3. The whole-table before/after diff that proves step 2 changed no value
 *    is verification, run separately against the scratch schema — it is
 *    not part of this file.
 *
 * Why the backup exists. `precision - scale = 24 - 4 = 20`, and the longest
 * signed `bigint` value, `-9223372036854775808`, is 19 digits. `20 > 19`, so
 * every `bigint` this column could have held fits in the new column without
 * truncation — the widening in `up()` is lossless by construction and the
 * backup is not a restore path for it.
 *
 * `down()` is the opposite direction: `decimal(24,4)` to `bigint` narrows,
 * so it is lossy by construction. A fractional value rounds — observed
 * against the scratch schema, `2.5` reverts to `3`. A value one past signed
 * `bigint`'s max, `9223372036854775808`, makes the whole statement fail
 * instead of truncating silently — observed against the scratch schema as
 * MySQL error 1292, `ER_TRUNCATED_WRONG_VALUE`, sqlState 22007, and the
 * column stayed `decimal(24,4)` with every row unchanged, so the failure is
 * whole-statement, not a partial write. **This whole-statement-failure
 * behaviour requires strict `sql_mode`** (`STRICT_TRANS_TABLES` or
 * `STRICT_ALL_TABLES`); under a non-strict mode the same `ALTER` clamps to
 * `bigint`'s max with a warning instead, which is the one case here that
 * loses data silently rather than aborting. Measured on the `mysql:8.0`
 * scratch container:
 *
 *   @@GLOBAL.sql_mode  = ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
 *   @@SESSION.sql_mode = ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
 *   VERSION()          = 8.0.46
 *
 * No other mode in that list affects rounding or truncation. Unverified
 * on Dev and Prod. As circumstantial corroboration only — this is
 * creation-time-per-routine `sql_mode`, not `@@GLOBAL.sql_mode`, and says
 * nothing about Prod — all 23 stored routines in
 * `src/db/baseline/baseline.sql` were dumped from Dev carrying
 * `STRICT_TRANS_TABLES` in their creation-time `sql_mode`, zero without.
 *
 * That failure is exactly why a bare `down()` cannot be the revert path on
 * its own: on a table holding a fraction saved after `up()`, `down()`
 * either rounds a value away or aborts (under strict `sql_mode`; see
 * above), and neither recovers the pre-migration state. The backup table
 * created in step 1 is the only path this migration provides, precisely
 * because it was written before `up()` ran and holds nothing `up()` or
 * any later save introduced.
 *
 * Restoring from the backup — into the surviving table, NEVER by `RENAME`.
 * A `RENAME TABLE` promoting the backup would yield `id bigint NOT NULL`
 * with no `AUTO_INCREMENT` and no default, no `PRIMARY KEY`, and no FKs —
 * the first TypeORM insert would fail `1364 ER_NO_DEFAULT_FOR_FIELD` and
 * duplicate ids would become possible. Restore by copying rows back in,
 * wrapped in a transaction so a failed `INSERT` cannot leave the table
 * empty — a dropped connection mid-restore, or the `INSERT` hitting the
 * outgoing FK to `results` for a row deleted since the snapshot, are both
 * reachable, and both statements are InnoDB DML:
 *
 *   START TRANSACTION;
 *   DELETE FROM result_quantifications;
 *   INSERT INTO result_quantifications
 *     SELECT * FROM result_quantifications_backup_1787260000000;
 *   COMMIT;
 *
 * Measured against `src/db/baseline/baseline.sql`: zero tables carry an
 * inbound foreign key to `result_quantifications`, so the unqualified
 * `DELETE` cannot fail on a child row.
 *
 * Order matters and is the opposite of a first instinct: restore the rows
 * BEFORE running `down()`, not after. The spec's Backout row (`design.md`
 * §11, Backout — corrected 2026-08-27) prescribes restore-first, for this
 * reason: `AR-2` is the finding that the revert is the step that rounds
 * or aborts, so restoring first makes the subsequent `down()` guaranteed
 * to succeed, because the restored rows are all integral `bigint` values
 * by construction (they are what `bigint` held before `up()` ever ran).
 *
 * The backup is retained until sign-off. Neither `up()` nor `down()` here
 * drops it. Removing it is a separate, later, human-decided step.
 */
export class AlterQuantificationNumberToDecimal1787260000000
  implements MigrationInterface
{
  name = 'AlterQuantificationNumberToDecimal1787260000000';

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `result_quantifications` CHANGE `quantification_number` `quantification_number` bigint NULL, ALGORITHM=COPY',
    );
  }
}
