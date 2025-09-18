import { MigrationInterface, QueryRunner } from 'typeorm';

export class STARmvpCustomFields1756389433866 implements MigrationInterface {
  name = 'STARmvpCustomFields1756389433866';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`custom_field_1\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`custom_field_2\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`custom_field_3\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`custom_field_4\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`custom_field_5\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`custom_field_6\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`custom_field_7\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`custom_field_8\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`custom_field_9\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD \`custom_field_10\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` ADD \`custom_field_1\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` ADD \`custom_field_2\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` ADD \`custom_field_3\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` ADD \`custom_field_4\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` ADD \`custom_field_5\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` ADD \`custom_field_6\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` ADD \`custom_field_7\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` ADD \`custom_field_8\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` ADD \`custom_field_9\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` ADD \`custom_field_10\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` DROP COLUMN \`custom_field_10\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` DROP COLUMN \`custom_field_9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` DROP COLUMN \`custom_field_8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` DROP COLUMN \`custom_field_7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` DROP COLUMN \`custom_field_6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` DROP COLUMN \`custom_field_5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` DROP COLUMN \`custom_field_4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` DROP COLUMN \`custom_field_3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` DROP COLUMN \`custom_field_2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_groups\` DROP COLUMN \`custom_field_1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`custom_field_10\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`custom_field_9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`custom_field_8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`custom_field_7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`custom_field_6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`custom_field_5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`custom_field_4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`custom_field_3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`custom_field_2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`custom_field_1\``,
    );
  }
}
