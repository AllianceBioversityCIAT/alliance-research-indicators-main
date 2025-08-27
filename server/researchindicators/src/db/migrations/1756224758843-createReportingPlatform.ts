import { MigrationInterface, QueryRunner } from 'typeorm';
import { ReportingPlatformEnum } from '../../domain/entities/results/enum/reporting-platform.enum';

export class CreateReportingPlatform1756224758843
  implements MigrationInterface
{
  name = 'CreateReportingPlatform1756224758843';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`reporting_platforms\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`platform_code\` varchar(50) NOT NULL, PRIMARY KEY (\`platform_code\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`platform_code\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD CONSTRAINT \`FK_910c86d61c81c1ae876b40e8e33\` FOREIGN KEY (\`platform_code\`) REFERENCES \`reporting_platforms\`(\`platform_code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`reporting_platforms\` (\`platform_code\`) VALUES ('${ReportingPlatformEnum.STAR}'),('${ReportingPlatformEnum.PRMS}'),('${ReportingPlatformEnum.TIP}')`,
    );
    await queryRunner.query(
      `UPDATE \`results\` SET \`platform_code\`='${ReportingPlatformEnum.STAR}' WHERE \`platform_code\` IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP FOREIGN KEY \`FK_910c86d61c81c1ae876b40e8e33\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`platform_code\``,
    );
    await queryRunner.query(`DROP TABLE \`reporting_platforms\``);
  }
}
