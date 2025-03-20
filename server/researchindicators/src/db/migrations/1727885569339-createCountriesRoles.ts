import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCountriesRoles1727885569339 implements MigrationInterface {
  name = 'CreateCountriesRoles1727885569339';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`country_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`country_role_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`country_role_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` ADD \`country_role_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` ADD CONSTRAINT \`FK_782e84f344b86a160580f65ff97\` FOREIGN KEY (\`country_role_id\`) REFERENCES \`country_roles\`(\`country_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` DROP FOREIGN KEY \`FK_782e84f344b86a160580f65ff97\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` DROP COLUMN \`country_role_id\``,
    );
    await queryRunner.query(`DROP TABLE \`country_roles\``);
  }
}
