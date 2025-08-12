import { MigrationInterface, QueryRunner } from "typeorm";

export class STARmvpProjectIndicators1754618477017 implements MigrationInterface {
    name = 'STARmvpProjectIndicators1754618477017'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`groups_items\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`official_code\` varchar(100) NOT NULL, \`project_id\` int NULL, \`group_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`project_groups\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`parent_group_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`groups_items\` ADD CONSTRAINT \`FK_9b2e25133612087c8a54939b285\` FOREIGN KEY (\`group_id\`) REFERENCES \`project_groups\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`project_groups\` ADD CONSTRAINT \`FK_a24395de4ce13155d65f3a439b7\` FOREIGN KEY (\`parent_group_id\`) REFERENCES \`project_groups\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`project_groups\` DROP FOREIGN KEY \`FK_a24395de4ce13155d65f3a439b7\``);
        await queryRunner.query(`ALTER TABLE \`groups_items\` DROP FOREIGN KEY \`FK_9b2e25133612087c8a54939b285\``);
        await queryRunner.query(`DROP TABLE \`project_groups\``);
        await queryRunner.query(`DROP TABLE \`groups_items\``);
    }

}
