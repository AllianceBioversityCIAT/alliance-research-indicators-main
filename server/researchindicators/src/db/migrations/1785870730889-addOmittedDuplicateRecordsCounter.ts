import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T-08 — durable sink for the `OMITTED_DUPLICATE` sync counter.
 *
 * This is the **third** migration in a spec that budgeted two, and it is declared
 * as an overrun rather than absorbed (see `tasks.md` §4, RB-4). It exists because
 * `CounterResults` gains `omittedDuplicateRecords` but `sync_process_logs` has no
 * column for it, and every existing counter column is `NOT NULL` with no default —
 * so the counter would increment in memory and be discarded at the end of the run,
 * which is exactly the defect R-RES-009 AC.2 exists to prevent.
 *
 * A `DEFAULT 0` is supplied so the column can be added to a populated table
 * without a backfill step.
 */
export class AddOmittedDuplicateRecordsCounter1785870730889
  implements MigrationInterface
{
  name = 'AddOmittedDuplicateRecordsCounter1785870730889';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`sync_process_logs\`
         ADD COLUMN \`omitted_duplicate_records\` bigint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`sync_process_logs\` DROP COLUMN \`omitted_duplicate_records\``,
    );
  }
}
