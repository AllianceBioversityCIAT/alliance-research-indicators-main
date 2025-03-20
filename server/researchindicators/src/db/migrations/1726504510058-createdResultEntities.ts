import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatedResultEntities1726504510058 implements MigrationInterface {
  name = 'CreatedResultEntities1726504510058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`indicators\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`indicator_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`indicator_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_geo_scope\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`code\` bigint NOT NULL, \`name\` text NOT NULL, \`definition\` text NULL, PRIMARY KEY (\`code\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`contract_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`contract_role_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`contract_role_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_contracts\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`result_contract_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`contract_id\` varchar(255) NOT NULL, \`contract_role_id\` bigint NOT NULL, PRIMARY KEY (\`result_contract_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`lever_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`lever_role_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`lever_role_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_levers\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`code\` varchar(20) NOT NULL, \`name\` text NOT NULL, \`definition\` text NULL, PRIMARY KEY (\`code\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_levers\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`result_lever_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`lever_id\` varchar(255) NOT NULL, \`lever_role_id\` bigint NOT NULL, PRIMARY KEY (\`result_lever_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`results\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`result_id\` bigint NOT NULL AUTO_INCREMENT, \`result_official_code\` bigint NOT NULL, \`version_id\` bigint NULL, \`title\` text NULL, \`description\` text NULL, \`indicator_id\` bigint NULL, \`geo_scope_id\` bigint NULL, PRIMARY KEY (\`result_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` ADD CONSTRAINT \`FK_3784aaef37a4d341fbe6517fdee\` FOREIGN KEY (\`contract_role_id\`) REFERENCES \`contract_roles\`(\`contract_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` ADD CONSTRAINT \`FK_8bff1bb2850fece77f12247f303\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` ADD CONSTRAINT \`FK_4b8eb4ce310754d6fd971f47157\` FOREIGN KEY (\`contract_id\`) REFERENCES \`agresso_contracts\`(\`agreement_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` ADD CONSTRAINT \`FK_90e5a6d5b053612e54042ac56ac\` FOREIGN KEY (\`lever_role_id\`) REFERENCES \`lever_roles\`(\`lever_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` ADD CONSTRAINT \`FK_f5e1200952e369aa022a5014f94\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` ADD CONSTRAINT \`FK_e1fc97f82440f07c53e8b4876e8\` FOREIGN KEY (\`lever_id\`) REFERENCES \`clarisa_levers\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD CONSTRAINT \`FK_d2e8a705ce8be71c6a65c925b03\` FOREIGN KEY (\`indicator_id\`) REFERENCES \`indicators\`(\`indicator_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD CONSTRAINT \`FK_102fdfa0f37221bc7dfe8ab6ab8\` FOREIGN KEY (\`geo_scope_id\`) REFERENCES \`clarisa_geo_scope\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP FOREIGN KEY \`FK_102fdfa0f37221bc7dfe8ab6ab8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP FOREIGN KEY \`FK_d2e8a705ce8be71c6a65c925b03\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` DROP FOREIGN KEY \`FK_e1fc97f82440f07c53e8b4876e8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` DROP FOREIGN KEY \`FK_f5e1200952e369aa022a5014f94\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` DROP FOREIGN KEY \`FK_90e5a6d5b053612e54042ac56ac\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` DROP FOREIGN KEY \`FK_4b8eb4ce310754d6fd971f47157\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` DROP FOREIGN KEY \`FK_8bff1bb2850fece77f12247f303\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` DROP FOREIGN KEY \`FK_3784aaef37a4d341fbe6517fdee\``,
    );
    await queryRunner.query(`DROP TABLE \`results\``);
    await queryRunner.query(`DROP TABLE \`result_levers\``);
    await queryRunner.query(`DROP TABLE \`clarisa_levers\``);
    await queryRunner.query(`DROP TABLE \`lever_roles\``);
    await queryRunner.query(`DROP TABLE \`result_contracts\``);
    await queryRunner.query(`DROP TABLE \`contract_roles\``);
    await queryRunner.query(`DROP TABLE \`clarisa_geo_scope\``);
    await queryRunner.query(`DROP TABLE \`indicators\``);
  }
}
