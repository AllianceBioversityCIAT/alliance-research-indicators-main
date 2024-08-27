import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgressoContractTables1722609316360
  implements MigrationInterface
{
  name = 'CreateAgressoContractTables1722609316360';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`agresso_contract_countries\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`agreement_id\` varchar(36) NOT NULL, \`iso_alpha_2\` varchar(3) NOT NULL, PRIMARY KEY (\`agreement_id\`, \`iso_alpha_2\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`agresso_contracts\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`agreement_id\` varchar(36) NOT NULL, \`center_amount\` decimal(11,2) NOT NULL DEFAULT '0.00', \`center_amount_usd\` decimal(11,2) NOT NULL DEFAULT '0.00', \`client\` varchar(15) NULL, \`contract_status\` varchar(20) NULL, \`department\` varchar(100) NULL, \`departmentId\` varchar(10) NULL, \`description\` varchar(200) NULL, \`division\` varchar(30) NULL, \`divisionId\` varchar(10) NULL, \`donor\` varchar(100) NULL, \`donor_reference\` varchar(20) NULL, \`endDateGlobal\` timestamp NULL, \`endDatefinance\` timestamp NULL, \`end_date\` timestamp NULL, \`entity\` varchar(10) NULL, \`extension_date\` timestamp NULL, \`funding_type\` varchar(10) NULL, \`grant_amount\` decimal(11,2) NOT NULL DEFAULT '0.00', \`grant_amount_usd\` decimal(11,2) NOT NULL DEFAULT '0.00', \`project\` varchar(10) NULL, \`projectDescription\` varchar(20) NULL, \`project_lead_description\` varchar(50) NULL, \`short_title\` varchar(50) NULL, \`start_date\` timestamp NULL, \`ubwClientDescription\` varchar(50) NULL, \`unit\` varchar(100) NULL, \`unitId\` varchar(10) NULL, PRIMARY KEY (\`agreement_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contract_countries\` ADD CONSTRAINT \`FK_13feff5cf0e0a5284efdbe4986c\` FOREIGN KEY (\`agreement_id\`) REFERENCES \`agresso_contracts\`(\`agreement_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contract_countries\` DROP FOREIGN KEY \`FK_13feff5cf0e0a5284efdbe4986c\``,
    );
    await queryRunner.query(`DROP TABLE \`agresso_contracts\``);
    await queryRunner.query(`DROP TABLE \`agresso_contract_countries\``);
  }
}
