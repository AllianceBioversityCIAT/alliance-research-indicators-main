import { MigrationInterface, QueryRunner } from "typeorm";

export class ToolFunctionIntermediateTable1758071727988 implements MigrationInterface {
    name = 'ToolFunctionIntermediateTable1758071727988'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_innovation_tool_function\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`innovation_tool_function_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`tool_function_id\` bigint NOT NULL, PRIMARY KEY (\`innovation_tool_function_id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`result_innovation_tool_function\``);
    }

}
