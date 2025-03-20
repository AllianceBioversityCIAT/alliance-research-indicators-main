import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedHqInstitutions1730383191365 implements MigrationInterface {
  name = 'AddedHqInstitutions1730383191365';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` ADD \`country_office_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_1712b5df6ba4801285ee11374f7\` FOREIGN KEY (\`country_office_id\`) REFERENCES \`clarisa_countries\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_1712b5df6ba4801285ee11374f7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`country_office_id\``,
    );
  }
}
