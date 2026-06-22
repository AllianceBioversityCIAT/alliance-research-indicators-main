import { MigrationInterface, QueryRunner } from 'typeorm';

const BILATERAL_PLATFORM_CODE = 'BILATERAL';

export class AddReportingPlatformBilateral1779190000005
  implements MigrationInterface
{
  name = 'AddReportingPlatformBilateral1779190000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`reporting_platforms\` (\`platform_code\`, \`platform_name\`) VALUES (?, ?)`,
      [BILATERAL_PLATFORM_CODE, 'Bilateral'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`reporting_platforms\` WHERE \`platform_code\` = ?`,
      [BILATERAL_PLATFORM_CODE],
    );
  }
}
