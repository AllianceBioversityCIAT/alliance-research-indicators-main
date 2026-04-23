import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedSdgIdSdgTarget1775827676473 implements MigrationInterface {
  name = 'AddedSdgIdSdgTarget1775827676473';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sdg_targets\` ADD \`clarisa_sdg_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sdg_targets\` ADD CONSTRAINT \`FK_88f3f702de4bb4cc1e5df38181e\` FOREIGN KEY (\`clarisa_sdg_id\`) REFERENCES \`clarisa_sdgs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sdg_targets\` DROP FOREIGN KEY \`FK_88f3f702de4bb4cc1e5df38181e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sdg_targets\` DROP COLUMN \`clarisa_sdg_id\``,
    );
  }
}
