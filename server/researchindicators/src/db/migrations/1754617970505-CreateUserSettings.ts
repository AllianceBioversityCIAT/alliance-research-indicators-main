import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSettings1754617970505 implements MigrationInterface {
  name = 'CreateUserSettings1754617970505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`setting_keys\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`key\` varchar(50) NOT NULL, PRIMARY KEY (\`key\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`user_settings\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` bigint NOT NULL, \`parent_component\` varchar(50) NOT NULL, \`component\` varchar(50) NOT NULL, \`especific_component\` varchar(50) NOT NULL, \`value\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_settings\` ADD CONSTRAINT \`FK_4e4402a1f6153154bef178b3ae1\` FOREIGN KEY (\`parent_component\`) REFERENCES \`setting_keys\`(\`key\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_settings\` ADD CONSTRAINT \`FK_a72092ddb246042f595ccbf3657\` FOREIGN KEY (\`component\`) REFERENCES \`setting_keys\`(\`key\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_settings\` ADD CONSTRAINT \`FK_b8f1673b5c26ebfbe35ad96645e\` FOREIGN KEY (\`especific_component\`) REFERENCES \`setting_keys\`(\`key\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`setting_keys\` (\`key\`) VALUES ('contract-table'), ('result-table'), ('tab'), ('all'), ('self')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user_settings\` DROP FOREIGN KEY \`FK_b8f1673b5c26ebfbe35ad96645e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_settings\` DROP FOREIGN KEY \`FK_a72092ddb246042f595ccbf3657\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_settings\` DROP FOREIGN KEY \`FK_4e4402a1f6153154bef178b3ae1\``,
    );
    await queryRunner.query(`DROP TABLE \`user_settings\``);
    await queryRunner.query(`DROP TABLE \`setting_keys\``);
  }
}
