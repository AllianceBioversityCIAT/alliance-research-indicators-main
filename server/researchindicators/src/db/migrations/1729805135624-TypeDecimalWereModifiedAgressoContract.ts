import { MigrationInterface, QueryRunner } from 'typeorm';

export class TypeDecimalWereModifiedAgressoContract1729805135624
  implements MigrationInterface
{
  name = 'TypeDecimalWereModifiedAgressoContract1729805135624';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` CHANGE \`center_amount\` \`center_amount\` decimal(20,3) NOT NULL DEFAULT '0.000'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` CHANGE \`center_amount_usd\` \`center_amount_usd\` decimal(20,3) NOT NULL DEFAULT '0.000'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` CHANGE \`grant_amount\` \`grant_amount\` decimal(20,3) NOT NULL DEFAULT '0.000'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` CHANGE \`grant_amount_usd\` \`grant_amount_usd\` decimal(20,3) NOT NULL DEFAULT '0.000'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` CHANGE \`grant_amount_usd\` \`grant_amount_usd\` decimal(11,2) NOT NULL DEFAULT '0.00'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` CHANGE \`grant_amount\` \`grant_amount\` decimal(11,2) NOT NULL DEFAULT '0.00'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` CHANGE \`center_amount_usd\` \`center_amount_usd\` decimal(11,2) NOT NULL DEFAULT '0.00'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` CHANGE \`center_amount\` \`center_amount\` decimal(11,2) NOT NULL DEFAULT '0.00'`,
    );
  }
}
