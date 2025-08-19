import { MigrationInterface, QueryRunner } from "typeorm";

export class STARmvpContributionValue1755617711035 implements MigrationInterface {
    name = 'STARmvpContributionValue1755617711035'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`project_indicators\` ADD \`type\` enum ('output', 'outcome', 'impact', 'other') NULL`);
        await queryRunner.query(`ALTER TABLE \`project_indicators_results\` ADD \`contribution_value\` decimal(10,2) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`project_indicators_results\` DROP COLUMN \`contribution_value\``);
        await queryRunner.query(`ALTER TABLE \`project_indicators\` DROP COLUMN \`type\``);
    }

}
