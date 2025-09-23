import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatAiTransactionalTables1757696481084
  implements MigrationInterface
{
  name = 'CreatAiTransactionalTables1757696481084';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`result_institution_ai\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`institution_id\` bigint NOT NULL, \`institution_role_id\` bigint NOT NULL, \`institution_name\` text NOT NULL, \`score\` float NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_user_ai\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`institution_id\` varchar(10) NOT NULL, \`user_role_id\` bigint NOT NULL, \`institution_name\` text NOT NULL, \`score\` float NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_ai\` ADD CONSTRAINT \`FK_e94c400a74f35fe1b942b6b2e26\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_ai\` ADD CONSTRAINT \`FK_783671a33b81f398332cc951b60\` FOREIGN KEY (\`institution_role_id\`) REFERENCES \`institution_roles\`(\`institution_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_user_ai\` ADD CONSTRAINT \`FK_2f547cf55695a82c4eaa5facfc2\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_user_ai\` ADD CONSTRAINT \`FK_2593bdbeefdaeec9150ec6c84af\` FOREIGN KEY (\`user_role_id\`) REFERENCES \`user_roles\`(\`user_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_user_ai\` DROP FOREIGN KEY \`FK_2593bdbeefdaeec9150ec6c84af\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_user_ai\` DROP FOREIGN KEY \`FK_2f547cf55695a82c4eaa5facfc2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_ai\` DROP FOREIGN KEY \`FK_783671a33b81f398332cc951b60\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institution_ai\` DROP FOREIGN KEY \`FK_e94c400a74f35fe1b942b6b2e26\``,
    );
    await queryRunner.query(`DROP TABLE \`result_user_ai\``);
    await queryRunner.query(`DROP TABLE \`result_institution_ai\``);
  }
}
