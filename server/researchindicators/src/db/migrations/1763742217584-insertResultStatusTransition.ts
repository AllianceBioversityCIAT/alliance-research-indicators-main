import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertResultStatusTransition1763742217584
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO result_status_transitions (from_status_id, to_status_id) VALUES
      (2, 4),
      (2, 5),
      (2, 6),
      (2, 7),
      (4, 2),
      (4, 8),
      (4, 12),
      (5, 4),
      (6, 4),
      (7, 8),
      (9, 4),
      (9, 11),
      (9, 7),
      (12, 4),
      (12, 13),
      (13, 14);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM result_status_transitions WHERE 
      (from_status_id = 2 AND to_status_id = 4) OR
      (from_status_id = 2 AND to_status_id = 5) OR
      (from_status_id = 2 AND to_status_id = 6) OR
      (from_status_id = 2 AND to_status_id = 7) OR
      (from_status_id = 4 AND to_status_id = 2) OR
      (from_status_id = 4 AND to_status_id = 8) OR
      (from_status_id = 4 AND to_status_id = 12) OR
      (from_status_id = 5 AND to_status_id = 4) OR
      (from_status_id = 6 AND to_status_id = 4) OR
      (from_status_id = 7 AND to_status_id = 8) OR
      (from_status_id = 9 AND to_status_id = 4) OR
      (from_status_id = 9 AND to_status_id = 11) OR
      (from_status_id = 9 AND to_status_id = 7) OR
      (from_status_id = 12 AND to_status_id = 4) OR
      (from_status_id = 12 AND to_status_id = 13) OR
      (from_status_id = 13 AND to_status_id = 14);
    `);
  }
}
