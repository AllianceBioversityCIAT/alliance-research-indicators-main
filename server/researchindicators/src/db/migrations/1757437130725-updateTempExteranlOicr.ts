import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTempExteranlOicr1757437130725 implements MigrationInterface {
  name = 'UpdateTempExteranlOicr1757437130725';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`pdf_url\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` ADD \`external_id\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`external_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`TEMP_external_oicrs\` DROP COLUMN \`pdf_url\``,
    );
  }
}
