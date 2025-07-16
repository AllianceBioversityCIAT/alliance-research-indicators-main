import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClarisaInnovationReadinessLevel1749604157074
  implements MigrationInterface
{
  name = 'CreateClarisaInnovationReadinessLevel1749604157074';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_innovation_readiness_levels\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL, \`level\` bigint NULL, \`name\` text NULL, \`definition\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE \`clarisa_innovation_readiness_levels\``,
    );
  }
}
