import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateImpersonationTables1787699586530
  implements MigrationInterface
{
  name = 'CreateImpersonationTables1787699586530';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`impersonation_sessions\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`session_id\` char(36) NOT NULL, \`actor_user_id\` bigint NOT NULL, \`target_user_id\` bigint NOT NULL, \`reason\` text NULL, \`started_at\` timestamp(6) NOT NULL, \`expires_at\` timestamp(6) NOT NULL, \`ended_at\` timestamp(6) NULL, \`end_reason\` enum('manual','expired','superseded','logout') NULL, PRIMARY KEY (\`session_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`impersonation_actions\` (\`action_id\` bigint NOT NULL AUTO_INCREMENT, \`session_id\` char(36) NOT NULL, \`method\` varchar(10) NOT NULL, \`route_pattern\` varchar(255) NOT NULL, \`path\` varchar(512) NOT NULL, \`status_code\` smallint NOT NULL, \`result_official_code\` bigint NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`action_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_impersonation_sessions_actor_open\` ON \`impersonation_sessions\` (\`actor_user_id\`, \`ended_at\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_impersonation_sessions_target\` ON \`impersonation_sessions\` (\`target_user_id\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_impersonation_actions_session\` ON \`impersonation_actions\` (\`session_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`impersonation_actions\` ADD CONSTRAINT \`fk_impersonation_actions_session\` FOREIGN KEY (\`session_id\`) REFERENCES \`impersonation_sessions\`(\`session_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`impersonation_actions\` DROP FOREIGN KEY \`fk_impersonation_actions_session\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_impersonation_actions_session\` ON \`impersonation_actions\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_impersonation_sessions_target\` ON \`impersonation_sessions\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_impersonation_sessions_actor_open\` ON \`impersonation_sessions\``,
    );
    await queryRunner.query(`DROP TABLE \`impersonation_actions\``);
    await queryRunner.query(`DROP TABLE \`impersonation_sessions\``);
  }
}
