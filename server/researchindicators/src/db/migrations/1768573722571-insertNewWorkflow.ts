import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertNewWorkflow1768573722571 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [45, 1, 4, 6, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [46, 2, 4, 6, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [47, 3, 4, 6, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [48, 4, 4, 6, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [49, 6, 4, 6, null],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM result_status_workflow WHERE id IN (45,46,47,48,49)`,
    );
  }
}
