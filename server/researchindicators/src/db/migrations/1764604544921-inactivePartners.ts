import { MigrationInterface, QueryRunner } from 'typeorm';

export class InactivePartners1764604544921 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE clarisa_institutions SET is_active = false WHERE code IN (46)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE clarisa_institutions SET is_active = true WHERE code IN (46)`,
    );
  }
}
