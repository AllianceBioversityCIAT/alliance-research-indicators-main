import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dev keeps these two tables on utf8mb4_unicode_520_ci while `results`
 * is utf8mb4_0900_ai_ci. The status reader compares the two collations
 * and MySQL rejects the mix (error 1267). Same charset, so CONVERT
 * changes the collation only.
 */
export class ConvertPrmsSyncTablesCollation1792681023849
  implements MigrationInterface
{
  name = 'ConvertPrmsSyncTablesCollation1792681023849';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_history\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_history\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci`,
    );
  }
}
