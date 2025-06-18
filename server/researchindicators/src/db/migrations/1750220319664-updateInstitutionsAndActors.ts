import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateInstitutionsAndActors1750220319664
  implements MigrationInterface
{
  name = 'UpdateInstitutionsAndActors1750220319664';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` ADD \`sub_institution_type_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` ADD \`institution_type_custom_name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD \`actor_type_custom_name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` ADD CONSTRAINT \`FK_9581e238cb40ecc77118f2406f0\` FOREIGN KEY (\`sub_institution_type_id\`) REFERENCES \`clarisa_institution_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` DROP FOREIGN KEY \`FK_9581e238cb40ecc77118f2406f0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP COLUMN \`actor_type_custom_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` DROP COLUMN \`institution_type_custom_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_types\` DROP COLUMN \`sub_institution_type_id\``,
    );
  }
}
