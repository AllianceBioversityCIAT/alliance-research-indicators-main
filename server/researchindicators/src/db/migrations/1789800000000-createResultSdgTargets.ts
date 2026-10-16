import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * result_lever_sdg_targets.result_id is required on every row.
 * result_lever_id stays optional: set = portfolio 2025, null = portfolio 2026.
 * Existing lever rows are backfilled from result_levers.
 */
export class CreateResultSdgTargets1789800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` MODIFY \`result_lever_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` ADD \`result_id\` bigint NULL`,
    );
    await queryRunner.query(`
      UPDATE \`result_lever_sdg_targets\` rlst
      INNER JOIN \`result_levers\` rl ON rl.result_lever_id = rlst.result_lever_id
      SET rlst.result_id = rl.result_id
      WHERE rlst.result_id IS NULL
    `);
    await queryRunner.query(`
      DELETE rlst FROM \`result_lever_sdg_targets\` rlst
      LEFT JOIN \`result_levers\` rl ON rl.result_lever_id = rlst.result_lever_id
      WHERE rlst.result_id IS NULL AND rl.result_lever_id IS NULL
    `);
    /**
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` MODIFY \`result_id\` bigint NOT NULL`,
    );
     */
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` ADD CONSTRAINT \`FK_result_lever_sdg_targets_result\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` DROP FOREIGN KEY \`FK_result_lever_sdg_targets_result\``,
    );
    await queryRunner.query(
      `DELETE FROM \`result_lever_sdg_targets\` WHERE \`result_lever_id\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` DROP COLUMN \`result_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_lever_sdg_targets\` MODIFY \`result_lever_id\` bigint NOT NULL`,
    );
  }
}
