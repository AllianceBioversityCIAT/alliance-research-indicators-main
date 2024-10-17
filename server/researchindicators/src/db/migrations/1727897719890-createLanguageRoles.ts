import { MigrationInterface, QueryRunner } from 'typeorm';
import { LanguageRolesEnum } from '../../domain/entities/language-roles/enums/language-roles.enum';

export class CreateLanguageRoles1727897719890 implements MigrationInterface {
  name = 'CreateLanguageRoles1727897719890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`language_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`language_role_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`language_role_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_languages\` ADD \`language_role_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_languages\` ADD CONSTRAINT \`FK_32b54272e60fe04f2d36b642f80\` FOREIGN KEY (\`language_role_id\`) REFERENCES \`language_roles\`(\`language_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO language_roles (language_role_id, name) VALUES (${LanguageRolesEnum.TRAINING_SUPERVISOR}, 'Training supervisor')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_languages\` DROP FOREIGN KEY \`FK_32b54272e60fe04f2d36b642f80\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_languages\` DROP COLUMN \`language_role_id\``,
    );
    await queryRunner.query(`DROP TABLE \`language_roles\``);
  }
}
