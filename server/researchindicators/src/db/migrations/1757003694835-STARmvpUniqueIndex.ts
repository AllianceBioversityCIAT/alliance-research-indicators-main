import { MigrationInterface, QueryRunner } from "typeorm";

export class STARmvpUniqueIndex1757003694835 implements MigrationInterface {
    name = 'STARmvpUniqueIndex1757003694835'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`project_groups\` DROP COLUMN \`agreement_id\``);
        await queryRunner.query(`ALTER TABLE \`project_groups\` ADD \`agreement_id\` text NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_group_project\` ON \`indicator_per_item\` (\`group_item_id\`, \`project_indicator_id\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`uq_group_project\` ON \`indicator_per_item\``);
        await queryRunner.query(`ALTER TABLE \`project_groups\` DROP COLUMN \`agreement_id\``);
        await queryRunner.query(`ALTER TABLE \`project_groups\` ADD \`agreement_id\` varchar(255) NOT NULL`);
    }

}
