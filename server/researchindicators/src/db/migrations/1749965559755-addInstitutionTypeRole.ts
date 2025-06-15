import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstitutionTypeRole1749965559755 implements MigrationInterface {
  name = 'AddInstitutionTypeRole1749965559755';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` ADD CONSTRAINT \`FK_12b4fffc9dafb9eabfcf02fd526\` FOREIGN KEY (\`institution_type_role_id\`) REFERENCES \`institution_type_roles\`(\`institution_type_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` DROP FOREIGN KEY \`FK_12b4fffc9dafb9eabfcf02fd526\``,
    );
  }
}
