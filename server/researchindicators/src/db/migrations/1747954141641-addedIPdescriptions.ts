import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedIPdescriptions1747954141641 implements MigrationInterface {
  name = 'AddedIPdescriptions1747954141641';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` ADD \`publicity_restriction_description\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` ADD \`requires_futher_development_description\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` ADD \`potential_asset_description\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` DROP COLUMN \`potential_asset_description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` DROP COLUMN \`requires_futher_development_description\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` DROP COLUMN \`publicity_restriction_description\``,
    );
  }
}
