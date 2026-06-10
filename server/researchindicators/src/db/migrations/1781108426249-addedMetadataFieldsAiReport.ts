import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedMetadataFieldsAiReport1781108426249 implements MigrationInterface {
    name = 'AddedMetadataFieldsAiReport1781108426249'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`bulk_upload_results\` ADD \`title\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`bulk_upload_results\` ADD \`indicator_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`bulk_upload_results\` ADD CONSTRAINT \`FK_437404b1e2639c84a47e6117f71\` FOREIGN KEY (\`indicator_id\`) REFERENCES \`indicators\`(\`indicator_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`bulk_upload_results\` DROP FOREIGN KEY \`FK_437404b1e2639c84a47e6117f71\``);
        await queryRunner.query(`ALTER TABLE \`bulk_upload_results\` DROP COLUMN \`indicator_id\``);
        await queryRunner.query(`ALTER TABLE \`bulk_upload_results\` DROP COLUMN \`title\``);
    }

}
