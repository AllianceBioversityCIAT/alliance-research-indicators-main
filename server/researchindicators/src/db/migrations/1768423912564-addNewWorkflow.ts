import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewWorkflow1768423912564 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [43, 5, 10, 11, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [44, 5, 10, 15, null],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM result_status_workflow WHERE id IN (43,44)`,
    );
  }
}
