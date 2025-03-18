import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDataModel1742332448883 implements MigrationInterface {
  name = 'UpdateDataModel1742332448883';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`supervisor_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`supervisor_email\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`language_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` ADD \`code\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` ADD CONSTRAINT \`FK_45b07440b457bf937eccacf9db3\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_evidences\` DROP FOREIGN KEY \`FK_45b07440b457bf937eccacf9db3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` DROP COLUMN \`code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`language_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`supervisor_email\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`supervisor_name\` text NULL`,
    );
  }
}
