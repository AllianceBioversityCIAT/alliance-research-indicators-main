import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSyncLogs1771967548961 implements MigrationInterface {
    name = 'CreateSyncLogs1771967548961'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`sync_process_logs\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`process_name\` text NOT NULL, \`created_records\` bigint NOT NULL, \`updated_records\` bigint NOT NULL, \`total_records\` bigint NOT NULL, \`success_records\` bigint NOT NULL, \`error_records\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`sync_process_logs\``);
    }

}
