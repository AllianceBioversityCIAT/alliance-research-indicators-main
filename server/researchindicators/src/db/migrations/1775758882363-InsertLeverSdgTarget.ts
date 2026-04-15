import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertLeverSdgTarget1775758882363 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO lever_sdg_targets (lever_id, sdg_target_id) VALUES (1, 1),(1, 9),(1, 101), (2, 5), (2, 11), (2, 129), (3, 112), (3, 113), (3, 114), (4, 4), (4, 9), (4, 12), (5,  10), (5, 32), (5, 106), (6, 10), (6, 11), (6, 12)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM lever_sdg_targets`);
  }
}
