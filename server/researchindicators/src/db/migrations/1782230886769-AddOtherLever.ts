import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtherLever1782230886769 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO clarisa_levers (id, short_name, full_name, other_names) VALUES (9,'Other', 'Other', 'Other')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM clarisa_levers WHERE id = 9`);
  }
}
