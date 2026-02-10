import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertStatusWorkflow1767901590080 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [1, 1, 4, 2, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [2, 1, 2, 4, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [3, 1, 2, 5, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [4, 1, 2, 6, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [5, 1, 2, 7, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [6, 1, 5, 2, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [7, 2, 4, 2, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [8, 2, 2, 4, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [9, 2, 2, 5, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [10, 2, 2, 6, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [11, 2, 2, 7, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [12, 2, 5, 2, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [13, 3, 4, 2, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [14, 3, 2, 4, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [15, 3, 2, 5, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [16, 3, 2, 6, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [17, 3, 2, 7, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [18, 3, 5, 2, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [19, 4, 4, 2, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [20, 4, 2, 4, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [21, 4, 2, 5, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [22, 4, 2, 6, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [23, 4, 2, 7, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [24, 4, 5, 2, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [25, 6, 4, 2, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [26, 6, 2, 4, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [27, 6, 2, 5, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [28, 6, 2, 6, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [29, 6, 2, 7, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [30, 6, 5, 2, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [31, 5, 9, 10, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [32, 5, 9, 11, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [33, 5, 9, 15, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [34, 5, 10, 12, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [35, 5, 12, 10, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [36, 5, 12, 13, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [37, 5, 13, 14, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [38, 5, 13, 12, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [39, 5, 11, 15, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [40, 5, 11, 10, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [41, 5, 15, 11, null],
    );
    await queryRunner.query(
      `INSERT INTO result_status_workflow (id, indicator_id, from_status_id, to_status_id, config ) VALUES (?,?,?,?,?)`,
      [42, 5, 15, 10, null],
    );

    await queryRunner.query(
      `UPDATE result_status SET name = ?, description = ?, editable_roles = ?, config = ? WHERE result_status_id = ?`,
      [
        `Pending Revision`,
        `The result has been reviewed and requires corrections. Feedback should have been provided.
The user must update the information and re-submit it.`,
        '[1, 3, 9]',
        `{"color":{"border":"#E69F00","text":"#F58220","background":null},"icon":{"color":"#F58220","name":"pi pi-exclamation-circle"},"image":null}`,
        5,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM result_status_workflow WHERE indicator_id IN (1,2,3,4,5,6)`,
    );
  }
}
