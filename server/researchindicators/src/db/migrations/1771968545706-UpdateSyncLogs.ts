import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSyncLogs1771968545706 implements MigrationInterface {
    name = 'UpdateSyncLogs1771968545706'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`sync_process_logs\` ADD \`process_status\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`sync_process_logs\` DROP COLUMN \`process_status\``);
    }

}
