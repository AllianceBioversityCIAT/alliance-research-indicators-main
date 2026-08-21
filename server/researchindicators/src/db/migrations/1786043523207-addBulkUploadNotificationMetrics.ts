import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBulkUploadNotificationMetrics1786043523207
  implements MigrationInterface
{
  name = 'AddBulkUploadNotificationMetrics1786043523207';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` ADD \`total_results\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` ADD \`total_capdev_results\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` ADD \`total_participants\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` ADD \`total_female_participants\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` ADD \`activity_start_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` ADD \`activity_end_date\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` ADD \`countries\` json NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` ADD \`notification_sent_at\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` ADD \`notification_status\` varchar(20) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` DROP COLUMN \`notification_status\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` DROP COLUMN \`notification_sent_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` DROP COLUMN \`countries\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` DROP COLUMN \`activity_end_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` DROP COLUMN \`activity_start_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` DROP COLUMN \`total_female_participants\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` DROP COLUMN \`total_participants\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` DROP COLUMN \`total_capdev_results\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bulk_upload_processes\` DROP COLUMN \`total_results\``,
    );
  }
}
