import { MigrationInterface, QueryRunner } from 'typeorm';

export class TypeTextWereModifiedAgressoContract1729804773129
  implements MigrationInterface
{
  name = 'TypeTextWereModifiedAgressoContract1729804773129';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`office\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`officeId\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`client\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`client\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`contract_status\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`contract_status\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`department\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`department\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`departmentId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`departmentId\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`description\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`division\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`division\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`divisionId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`divisionId\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`donor\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`donor\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`donor_reference\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`donor_reference\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`entity\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`entity\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`funding_type\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`funding_type\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`project\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`project\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`projectDescription\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`projectDescription\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`project_lead_description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`project_lead_description\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`short_title\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`short_title\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`ubwClientDescription\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`ubwClientDescription\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`unit\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`unit\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`unitId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`unitId\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`unitId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`unitId\` varchar(10) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`unit\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`unit\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`ubwClientDescription\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`ubwClientDescription\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`short_title\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`short_title\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`project_lead_description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`project_lead_description\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`projectDescription\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`projectDescription\` varchar(20) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`project\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`project\` varchar(10) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`funding_type\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`funding_type\` varchar(10) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`entity\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`entity\` varchar(10) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`donor_reference\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`donor_reference\` varchar(20) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`donor\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`donor\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`divisionId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`divisionId\` varchar(10) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`division\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`division\` varchar(30) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`description\` varchar(200) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`departmentId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`departmentId\` varchar(10) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`department\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`department\` varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`contract_status\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`contract_status\` varchar(20) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`client\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`client\` varchar(15) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`officeId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`office\``,
    );
  }
}
