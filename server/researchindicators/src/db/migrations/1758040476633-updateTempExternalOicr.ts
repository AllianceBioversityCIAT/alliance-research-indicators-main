import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTempExternalOicr1758040476633 implements MigrationInterface {
  name = 'UpdateTempExternalOicr1758040476633';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`pdf_url\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`handle_link\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`main_contact_person_list\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`elaboration_narrative\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`lever_list\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`geo_scope_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`country_list\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`region_list\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`geo_scope_comment\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`geo_scope_comment\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`region_list\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`country_list\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`geo_scope_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`lever_list\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`elaboration_narrative\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`main_contact_person_list\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`handle_link\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`pdf_url\` text NULL`,
    );
  }
}
