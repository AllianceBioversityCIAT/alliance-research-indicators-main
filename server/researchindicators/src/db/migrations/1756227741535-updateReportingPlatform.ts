import { MigrationInterface, QueryRunner } from 'typeorm';
import { ReportingPlatformEnum } from '../../domain/entities/results/enum/reporting-platform.enum';

export class UpdateReportingPlatform1756227741535
  implements MigrationInterface
{
  name = 'UpdateReportingPlatform1756227741535';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`reporting_platforms\` ADD \`platform_name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporting_platforms\` ADD \`platform_url\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporting_platforms\` ADD \`responsible_name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporting_platforms\` ADD \`responsible_email\` text NULL`,
    );
    await queryRunner.query(`UPDATE \`reporting_platforms\` 
                                SET \`platform_name\`='Strategic Tracking, Analysis and Reporting', 
                                    \`platform_url\`='https://star.alliance.cgiar.org/', 
                                    \`responsible_name\`='David Felipe Casañas Hernandez', 
                                    \`responsible_email\`='d.casanas@cgiar.org'
                                WHERE \`platform_code\`='${ReportingPlatformEnum.STAR}'`);
    await queryRunner.query(`UPDATE \`reporting_platforms\` 
                                SET \`platform_name\`='PRMS reporting', 
                                    \`platform_url\`='https://reporting.cgiar.org/', 
                                    \`responsible_name\`='Juan David Delgado', 
                                    \`responsible_email\`='j.delgado@cgiar.org'
                                WHERE \`platform_code\`='${ReportingPlatformEnum.PRMS}'`);
    await queryRunner.query(`UPDATE \`reporting_platforms\` 
                                SET \`platform_name\`='Tracking of Information Products', 
                                    \`platform_url\`='https://tip.alliance.cgiar.org/', 
                                    \`responsible_name\`='Daniel Gaviria', 
                                    \`responsible_email\`='d.gaviria@cgiar.org'
                                WHERE \`platform_code\`='${ReportingPlatformEnum.TIP}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`reporting_platforms\` DROP COLUMN \`responsible_email\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporting_platforms\` DROP COLUMN \`responsible_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporting_platforms\` DROP COLUMN \`platform_url\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporting_platforms\` DROP COLUMN \`platform_name\``,
    );
  }
}
