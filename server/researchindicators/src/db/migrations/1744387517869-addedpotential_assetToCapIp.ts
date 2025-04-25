import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedpotentialAssetToCapIp1744387517869
  implements MigrationInterface
{
  name = 'AddedpotentialAssetToCapIp1744387517869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` ADD \`potential_asset\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` DROP COLUMN \`potential_asset\``,
    );
  }
}
