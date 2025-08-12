import { MigrationInterface, QueryRunner } from "typeorm";

export class STARmvpIndicatorsPerItem1754928749037 implements MigrationInterface {
    name = 'STARmvpIndicatorsPerItem1754928749037'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`indicator_per_item\` (\`id\` int NOT NULL AUTO_INCREMENT, \`group_item_id\` int NULL, \`project_indicator_id\` int NULL, PRIMARY KEY (\`\id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`project_indicators\` (\`id\` int NOT NULL AUTO_INCREMENT, \`code\` varchar(100) NOT NULL, \`statement\` text NULL, \`number_type\` enum ('sum', 'average', 'count', 'yes/no') NOT NULL, \`number_format\` enum ('number', 'decimal') NULL, \`target_unit\` varchar(50) NULL, \`target_value\` decimal(15,4) NULL, \`base_line\` decimal(15,4) NULL, \`year\` year NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`indicator_per_item\` ADD CONSTRAINT \`FK_4ab55bc2af7907b55fe3a85490e\` FOREIGN KEY (\`group_item_id\`) REFERENCES \`groups_items\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`indicator_per_item\` ADD CONSTRAINT \`FK_8020bbf7eb6a1fa4bf7529407c6\` FOREIGN KEY (\`project_indicator_id\`) REFERENCES \`project_indicators\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`indicator_per_item\` DROP FOREIGN KEY \`FK_8020bbf7eb6a1fa4bf7529407c6\``);
        await queryRunner.query(`ALTER TABLE \`indicator_per_item\` DROP FOREIGN KEY \`FK_4ab55bc2af7907b55fe3a85490e\``);
        await queryRunner.query(`DROP TABLE \`project_indicators\``);
        await queryRunner.query(`DROP TABLE \`indicator_per_item\``);
    }

}
