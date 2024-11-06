import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedPolicyChangeDataModel1730900555793
  implements MigrationInterface
{
  name = 'AddedPolicyChangeDataModel1730900555793';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`policy_types\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`policy_type_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`policy_type_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`policy_stage\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`policy_stage_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`description\` text NULL, PRIMARY KEY (\`policy_stage_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_policy_change\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`result_id\` bigint NOT NULL, \`policy_type_id\` bigint NOT NULL, \`policy_stage_id\` bigint NOT NULL, \`evidence_stage\` text NOT NULL, PRIMARY KEY (\`result_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`link_result_roles\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`link_result_role_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`link_result_role_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`link_results\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`link_result_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`other_result_id\` bigint NOT NULL, \`link_result_role_id\` bigint NOT NULL, PRIMARY KEY (\`link_result_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` ADD CONSTRAINT \`FK_8918f8668f7b3d862de878b1795\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` ADD CONSTRAINT \`FK_be917b2af3281b0ebb6593926fd\` FOREIGN KEY (\`policy_type_id\`) REFERENCES \`policy_types\`(\`policy_type_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` ADD CONSTRAINT \`FK_ff3673c8a9eaee0730b1f995476\` FOREIGN KEY (\`policy_stage_id\`) REFERENCES \`policy_stage\`(\`policy_stage_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`link_results\` ADD CONSTRAINT \`FK_037db4669bd7696668263da6b15\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`link_results\` ADD CONSTRAINT \`FK_a3ebe38391666df2c14028490e2\` FOREIGN KEY (\`other_result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`link_results\` ADD CONSTRAINT \`FK_290df3566c4fde66ce6ceecc10d\` FOREIGN KEY (\`link_result_role_id\`) REFERENCES \`link_result_roles\`(\`link_result_role_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`link_results\` DROP FOREIGN KEY \`FK_290df3566c4fde66ce6ceecc10d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`link_results\` DROP FOREIGN KEY \`FK_a3ebe38391666df2c14028490e2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`link_results\` DROP FOREIGN KEY \`FK_037db4669bd7696668263da6b15\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` DROP FOREIGN KEY \`FK_ff3673c8a9eaee0730b1f995476\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` DROP FOREIGN KEY \`FK_be917b2af3281b0ebb6593926fd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_policy_change\` DROP FOREIGN KEY \`FK_8918f8668f7b3d862de878b1795\``,
    );
    await queryRunner.query(`DROP TABLE \`link_results\``);
    await queryRunner.query(`DROP TABLE \`link_result_roles\``);
    await queryRunner.query(`DROP TABLE \`result_policy_change\``);
    await queryRunner.query(`DROP TABLE \`policy_stage\``);
    await queryRunner.query(`DROP TABLE \`policy_types\``);
  }
}
