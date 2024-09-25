import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertIndicators1727208057174 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO indicator_types (indicator_type_id, name) VALUES (1, 'Output'), (2, 'Outcome')`,
    );
    await queryRunner.query(
      `INSERT INTO indicators (indicator_id, name, indicator_type_id) VALUES (1, 'Capacity Sharing for Development', 2), (2, 'Innovation', 2), (3, 'Knowledge Product', 2), (4, 'Policy Change', 2), (5, 'OICR', 2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM indicators WHERE indicator_id IN (1, 2, 3, 4, 5)`,
    );
    await queryRunner.query(
      `DELETE FROM indicator_types WHERE indicator_type_id IN (1, 2)`,
    );
  }
}
