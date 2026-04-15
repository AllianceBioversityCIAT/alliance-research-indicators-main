import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndexResults1774034272174 implements MigrationInterface {
  name = 'CreateIndexResults1774034272174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX \`idx_results_official_code_snapshot_report_year\` ON \`results\` (\`result_official_code\`, \`is_snapshot\`, \`report_year_id\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_results_snapshot_active_report_year\` ON \`results\` (\`is_snapshot\`, \`is_active\`, \`report_year_id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`idx_results_snapshot_active_report_year\` ON \`results\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_results_official_code_snapshot_report_year\` ON \`results\``,
    );
  }
}
