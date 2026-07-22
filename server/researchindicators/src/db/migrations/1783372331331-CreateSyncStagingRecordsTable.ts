import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSyncStagingRecordsTable1783372331331
  implements MigrationInterface
{
  name = 'CreateSyncStagingRecordsTable1783372331331';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`prms_temporal_results\``);
    await queryRunner.query(
      `CREATE TABLE \`sync_staging_records\` (\`execution_code\` varchar(36) NOT NULL, \`code\` bigint NOT NULL, \`year\` bigint NOT NULL, \`data\` json NOT NULL, PRIMARY KEY (\`execution_code\`, \`code\`, \`year\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`sync_staging_records\``);
    await queryRunner.query(
      `CREATE TABLE \`prms_temporal_results\` (\`code\` bigint NOT NULL, \`year\` bigint NOT NULL, \`data\` json NOT NULL, PRIMARY KEY (\`code\`, \`year\`)) ENGINE=InnoDB`,
    );
  }
}
