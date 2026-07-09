import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateResultKp1783520054723 implements MigrationInterface {
    name = 'UpdateResultKp1783520054723';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`result_knowledge_products\` ADD \`access_status\` text NULL`,
        );
        await queryRunner.query(
            `ALTER TABLE \`result_knowledge_products\` ADD \`collection\` text NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`result_knowledge_products\` DROP COLUMN \`collection\``,
        );
        await queryRunner.query(
            `ALTER TABLE \`result_knowledge_products\` DROP COLUMN \`access_status\``,
        );
    }
}
