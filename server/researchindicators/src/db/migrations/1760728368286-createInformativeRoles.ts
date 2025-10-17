import { MigrationInterface, QueryRunner } from 'typeorm';
import { UserRolesEnum } from '../../domain/entities/user-roles/enum/user-roles.enum';
import { InformativeRolesEnum } from '../../domain/entities/informative-roles/enum/informative-roles.enum';

export class CreateInformativeRoles1760728368286 implements MigrationInterface {
  name = 'CreateInformativeRoles1760728368286';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`informative_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`resultUsersResultUserId\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` ADD \`informative_role_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`informative_roles\` ADD CONSTRAINT \`FK_594898df849c11ad715a6253750\` FOREIGN KEY (\`resultUsersResultUserId\`) REFERENCES \`result_users\`(\`result_user_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` ADD CONSTRAINT \`FK_c3ae4d70fca8fb9167466d92f98\` FOREIGN KEY (\`informative_role_id\`) REFERENCES \`informative_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`informative_roles\` (id, name) VALUES (${InformativeRolesEnum.AUTHOR}, 'Author'), (${InformativeRolesEnum.CONTACT_PERSON}, 'Contact Person'), (${InformativeRolesEnum.BOTH}, 'Both');`,
    );
    await queryRunner.query(
      `INSERT INTO \`user_roles\` (user_role_id, name) VALUES (${UserRolesEnum.AUTORS_CONTACT}, 'Informative Role Author');`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_users\` DROP FOREIGN KEY \`FK_c3ae4d70fca8fb9167466d92f98\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`informative_roles\` DROP FOREIGN KEY \`FK_594898df849c11ad715a6253750\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_users\` DROP COLUMN \`informative_role_id\``,
    );
    await queryRunner.query(`DROP TABLE \`informative_roles\``);
  }
}
