import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIpTables1744381163883 implements MigrationInterface {
  name = 'CreateIpTables1744381163883';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`intellectual_property_owner\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`intellectual_property_owner_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`intellectual_property_owner_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_cap_sharing_ip\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`result_cap_sharing_ip_id\` bigint NOT NULL, \`publicity_restriction\` tinyint NULL, \`requires_futher_development\` tinyint NULL, \`asset_ip_owner_id\` bigint NULL, \`asset_ip_owner_description\` text NULL, PRIMARY KEY (\`result_cap_sharing_ip_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` ADD CONSTRAINT \`FK_d6e8ad34be1ffeda9eefbc778e3\` FOREIGN KEY (\`asset_ip_owner_id\`) REFERENCES \`intellectual_property_owner\`(\`intellectual_property_owner_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` DROP FOREIGN KEY \`FK_d6e8ad34be1ffeda9eefbc778e3\``,
    );
    await queryRunner.query(`DROP TABLE \`result_cap_sharing_ip\``);
    await queryRunner.query(`DROP TABLE \`intellectual_property_owner\``);
  }
}
