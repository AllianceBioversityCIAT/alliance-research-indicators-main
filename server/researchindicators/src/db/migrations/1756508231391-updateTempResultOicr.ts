import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTempResultOicr1756508231391 implements MigrationInterface {
  name = 'UpdateTempResultOicr1756508231391';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`contract_status\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`created_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`updated_by\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`deleted_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`result_status\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`result_status\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`deleted_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`is_active\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`updated_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`created_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`contract_status\` text NULL`,
    );
  }
}
