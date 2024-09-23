import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertDataControl1727119632564 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO session_formats (session_format_id, name) VALUES (1, 'Individual'), (2, 'Group')`,
    );
    await queryRunner.query(
      `INSERT INTO session_types (session_type_id, name) VALUES (1, 'Training'), (2, 'Engagement')`,
    );
    await queryRunner.query(
      `INSERT INTO degrees (degree_id, name) VALUES (1, 'PhD'), (2, 'MSc'), (3, 'BSc'), (4, 'Other')`,
    );
    await queryRunner.query(
      `INSERT INTO gender (gender_id, name) VALUES (1, 'Male'), (2, 'Female'), (3, 'Non-binary')`,
    );
    await queryRunner.query(
      `INSERT INTO session_lengths (session_length_id, name) VALUES (1, 'Short-term'), (2, 'Long-term')`,
    );
    await queryRunner.query(
      `INSERT INTO session_purposes (session_purpose_id, name) VALUES (1, 'Research'), (2, 'Teaching'), (3, 'Other')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM session_formats WHERE session_format_id IN (1, 2)`,
    );
    await queryRunner.query(
      `DELETE FROM session_types WHERE session_type_id IN (1, 2)`,
    );
    await queryRunner.query(
      `DELETE FROM degrees WHERE degree_id IN (1, 2, 3, 4)`,
    );
    await queryRunner.query(`DELETE FROM gender WHERE gender_id IN (1, 2, 3)`);
    await queryRunner.query(
      `DELETE FROM session_lengths WHERE session_length_id IN (1, 2)`,
    );
    await queryRunner.query(
      `DELETE FROM session_purposes WHERE session_purpose_id IN (1, 2, 3)`,
    );
  }
}
