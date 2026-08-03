import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSyncedToPrmsAndPrmsResultCodeToResults1779190000002
  implements MigrationInterface
{
  name = 'AddIsSyncedToPrmsAndPrmsResultCodeToResults1779190000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`is_synced_to_prms\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`prms_result_code\` bigint NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_results_synced_to_prms\` ON \`results\` (\`is_synced_to_prms\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`idx_results_synced_to_prms\` ON \`results\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`prms_result_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`is_synced_to_prms\``,
    );
  }
}
