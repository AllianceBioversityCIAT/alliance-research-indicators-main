import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportYearTable1732810381156 implements MigrationInterface {
  name = 'CreateReportYearTable1732810381156';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`report_years\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`report_year\` year NOT NULL, PRIMARY KEY (\`report_year\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`report_year_id\` year NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD CONSTRAINT \`FK_eab8f24e6a43d1723dc22df1eaa\` FOREIGN KEY (\`report_year_id\`) REFERENCES \`report_years\`(\`report_year\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO report_years (report_year) VALUES (2024)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP FOREIGN KEY \`FK_eab8f24e6a43d1723dc22df1eaa\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`report_year_id\``,
    );
    await queryRunner.query(`DROP TABLE \`report_years\``);
  }
}
