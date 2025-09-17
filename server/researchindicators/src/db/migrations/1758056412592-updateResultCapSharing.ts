import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateResultCapSharing1758056412592 implements MigrationInterface {
  name = 'UpdateResultCapSharing1758056412592';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`start_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`start_date\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`end_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`end_date\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`end_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`end_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`start_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`start_date\` timestamp NULL`,
    );
  }
}
