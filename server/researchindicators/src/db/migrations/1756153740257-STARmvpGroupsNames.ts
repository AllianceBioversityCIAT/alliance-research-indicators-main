import { MigrationInterface, QueryRunner } from "typeorm";

export class STARmvpGroupsNames1756153740257 implements MigrationInterface {
    name = 'STARmvpGroupsNames1756153740257'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`project_groups\` DROP FOREIGN KEY \`FK_a24395de4ce13155d65f3a439b7\``);
        await queryRunner.query(`ALTER TABLE \`project_groups\` DROP COLUMN \`parent_group_id\``);
        await queryRunner.query(`ALTER TABLE \`project_groups\` ADD \`level\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`project_groups\` ADD \`agreement_id\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`project_groups\` DROP COLUMN \`agreement_id\``);
        await queryRunner.query(`ALTER TABLE \`project_groups\` DROP COLUMN \`level\``);
        await queryRunner.query(`ALTER TABLE \`project_groups\` ADD \`parent_group_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`project_groups\` ADD CONSTRAINT \`FK_a24395de4ce13155d65f3a439b7\` FOREIGN KEY (\`parent_group_id\`) REFERENCES \`project_groups\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
