import { MigrationInterface, QueryRunner } from 'typeorm';
import { IpRightsApplicationOptionEnum } from '../../domain/entities/ip-rights-application-options/enum/ip-rights-application-option.enum';

export class AddNewFieldsipRights1753114865119 implements MigrationInterface {
  name = 'AddNewFieldsipRights1753114865119';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`ip_rights_application_options\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_ip_rights\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`result_ip_rights_id\` bigint NOT NULL, \`publicity_restriction\` tinyint NULL, \`publicity_restriction_description\` text NULL, \`requires_futher_development\` tinyint NULL, \`requires_futher_development_description\` text NULL, \`asset_ip_owner_id\` bigint NULL, \`asset_ip_owner_description\` text NULL, \`potential_asset\` tinyint NULL, \`potential_asset_description\` text NULL, \`private_sector_engagement_id\` bigint NULL, \`formal_ip_rights_application_id\` bigint NULL, PRIMARY KEY (\`result_ip_rights_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_rights\` ADD CONSTRAINT \`FK_7a4b5c76153cd2b0c9ccbef3636\` FOREIGN KEY (\`asset_ip_owner_id\`) REFERENCES \`intellectual_property_owner\`(\`intellectual_property_owner_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_rights\` ADD CONSTRAINT \`FK_22066ab65e1978dc1112f460af6\` FOREIGN KEY (\`result_ip_rights_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_rights\` ADD CONSTRAINT \`FK_0064eb63f492cb8cb8991aa124d\` FOREIGN KEY (\`private_sector_engagement_id\`) REFERENCES \`ip_rights_application_options\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_rights\` ADD CONSTRAINT \`FK_467c0131e8ec4c02739543a927a\` FOREIGN KEY (\`formal_ip_rights_application_id\`) REFERENCES \`ip_rights_application_options\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`ip_rights_application_options\` (\`id\`,\`name\`) VALUES (${IpRightsApplicationOptionEnum.NO}, 'No'), (${IpRightsApplicationOptionEnum.YES}, 'Yes'), (${IpRightsApplicationOptionEnum.NOT_SURE}, 'Not sure')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_ip_rights\` DROP FOREIGN KEY \`FK_467c0131e8ec4c02739543a927a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_rights\` DROP FOREIGN KEY \`FK_0064eb63f492cb8cb8991aa124d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_rights\` DROP FOREIGN KEY \`FK_22066ab65e1978dc1112f460af6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_rights\` DROP FOREIGN KEY \`FK_7a4b5c76153cd2b0c9ccbef3636\``,
    );
    await queryRunner.query(`DROP TABLE \`result_ip_rights\``);
    await queryRunner.query(`DROP TABLE \`ip_rights_application_options\``);
  }
}
