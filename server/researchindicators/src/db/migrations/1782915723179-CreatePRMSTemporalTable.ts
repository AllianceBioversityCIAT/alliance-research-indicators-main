import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePRMSTemporalTable1782915723179 implements MigrationInterface {
    name = 'CreatePRMSTemporalTable1782915723179'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`prms_temporal_results\` (\`code\` bigint NOT NULL, \`year\` bigint NOT NULL, \`data\` json NOT NULL, PRIMARY KEY (\`code\`, \`year\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`prms_temporal_results\``);
    }

}
