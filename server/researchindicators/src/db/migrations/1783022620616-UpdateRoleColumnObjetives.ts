import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRoleColumnObjetives1783022620616
  implements MigrationInterface
{
  name = 'UpdateRoleColumnObjetives1783022620616';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`result_strategic_objectives\` SET \`role_id\` = \`roles_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_strategic_objectives\` DROP COLUMN \`roles_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_strategic_objectives\` DROP FOREIGN KEY \`FK_cb8579b47b3f7bc605663ca53b0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_strategic_objectives\` CHANGE \`role_id\` \`role_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_strategic_objectives\` ADD CONSTRAINT \`FK_cb8579b47b3f7bc605663ca53b0\` FOREIGN KEY (\`role_id\`) REFERENCES \`result_strategic_objective_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `UPDATE \`result_impact_outcomes\` SET \`role_id\` = \`roles_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_outcomes\` DROP COLUMN \`roles_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_outcomes\` DROP FOREIGN KEY \`FK_369474fc117023890a2d72840b3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_outcomes\` CHANGE \`role_id\` \`role_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_outcomes\` ADD CONSTRAINT \`FK_369474fc117023890a2d72840b3\` FOREIGN KEY (\`role_id\`) REFERENCES \`result_impact_outcome_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`result_strategic_objectives\` SET \`roles_id\` = \`role_id\``,
    );
    await queryRunner.query(
      `UPDATE \`result_strategic_objectives\` SET \`role_id\` = NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_strategic_objectives\` DROP FOREIGN KEY \`FK_cb8579b47b3f7bc605663ca53b0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_strategic_objectives\` CHANGE \`role_id\` \`role_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_strategic_objectives\` ADD CONSTRAINT \`FK_cb8579b47b3f7bc605663ca53b0\` FOREIGN KEY (\`role_id\`) REFERENCES \`result_strategic_objective_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_strategic_objectives\` ADD \`roles_id\` bigint NOT NULL`,
    );

    await queryRunner.query(
      `UPDATE \`result_impact_outcomes\` SET \`role_id\` = \`roles_id\``,
    );
    await queryRunner.query(
      `UPDATE \`result_impact_outcomes\` SET \`role_id\` = NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_outcomes\` DROP FOREIGN KEY \`FK_369474fc117023890a2d72840b3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_outcomes\` CHANGE \`role_id\` \`role_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_outcomes\` ADD CONSTRAINT \`FK_369474fc117023890a2d72840b3\` FOREIGN KEY (\`role_id\`) REFERENCES \`result_impact_outcome_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_impact_outcomes\` ADD \`roles_id\` bigint NOT NULL`,
    );
  }
}
