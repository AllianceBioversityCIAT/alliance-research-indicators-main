import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGlobalTargets1761054852156 implements MigrationInterface {
  name = 'CreateGlobalTargets1761054852156';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_global_targets\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`targetId\` bigint NOT NULL, \`smo_code\` varchar(10) NOT NULL, \`target\` text NOT NULL, \`impactAreaId\` bigint NOT NULL, \`impactAreaName\` varchar(255) NOT NULL, PRIMARY KEY (\`targetId\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`clarisa_global_targets\``);
  }
}
