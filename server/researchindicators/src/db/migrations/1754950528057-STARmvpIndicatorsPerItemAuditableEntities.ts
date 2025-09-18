import { MigrationInterface, QueryRunner } from 'typeorm';

export class STARmvpIndicatorsPerItemAuditableEntities1754950528057
  implements MigrationInterface
{
  name = 'STARmvpIndicatorsPerItemAuditableEntities1754950528057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` ADD \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` ADD \`created_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` ADD \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` ADD \`updated_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` ADD \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` ADD \`created_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` ADD \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` ADD \`updated_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` ADD \`deleted_at\` timestamp NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` DROP COLUMN \`is_active\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` DROP COLUMN \`updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` DROP COLUMN \`updated_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`project_indicators\` DROP COLUMN \`created_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` DROP COLUMN \`is_active\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` DROP COLUMN \`updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` DROP COLUMN \`updated_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicator_per_item\` DROP COLUMN \`created_at\``,
    );
  }
}
