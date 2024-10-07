import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInstitutionsRoles1727884895618
  implements MigrationInterface
{
  name = 'CreateInstitutionsRoles1727884895618';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`institution_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`institution_role_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`institution_role_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institutions\` ADD \`institution_role_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institutions\` ADD CONSTRAINT \`FK_bece52a5984c89092fe22337dcf\` FOREIGN KEY (\`institution_role_id\`) REFERENCES \`institution_roles\`(\`institution_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_institutions\` DROP FOREIGN KEY \`FK_bece52a5984c89092fe22337dcf\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institutions\` DROP COLUMN \`institution_role_id\``,
    );
    await queryRunner.query(`DROP TABLE \`institution_roles\``);
  }
}
