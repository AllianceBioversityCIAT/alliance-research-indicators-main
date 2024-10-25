import { MigrationInterface, QueryRunner } from 'typeorm';

export class TypeTimestampWereModifiedAgressoContract1729805961620
  implements MigrationInterface
{
  name = 'TypeTimestampWereModifiedAgressoContract1729805961620';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`endDateGlobal\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`endDateGlobal\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`endDatefinance\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`endDatefinance\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`end_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`end_date\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`extension_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`extension_date\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`start_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`start_date\` datetime NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`start_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`start_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`extension_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`extension_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`end_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`end_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`endDatefinance\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`endDatefinance\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`endDateGlobal\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`endDateGlobal\` timestamp NULL`,
    );
  }
}
