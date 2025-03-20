import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncementTable1738616564305
  implements MigrationInterface
{
  name = 'CreateAnnouncementTable1738616564305';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`announcement_settings\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`announcement_id\` bigint NOT NULL AUTO_INCREMENT, \`title\` text NULL, \`description\` text NULL, \`src\` text NULL, \`link\` text NULL, \`start_date\` timestamp NULL, \`end_date\` timestamp NULL, PRIMARY KEY (\`announcement_id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`announcement_settings\``);
  }
}
